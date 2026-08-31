/**
 * Kernel parity for `src/sources/listing-api.ts`: one record, read
 * by the original mapping written against a particular listing and
 * by this port's config-driven engine, diffed over the two members
 * both sides produce.
 *
 * The port rests on a claim its own header states as a design rule —
 * that a `parser_config` is DATA, and that an engine executing a
 * stored field map answers what a module with the member names
 * compiled into it answered by hand. This file is where that stops
 * being an argument. The original reads a record through names
 * written in its source; the port reads the SAME record through
 * names written in a row. Both answers are reduced to the pair they
 * have in common and diffed by path.
 *
 * ## The kernel, and what sits outside it
 *
 * Two members: the URL and the body. Everything else on either side
 * has no counterpart to diff, and saying which is the honest half of
 * drawing a boundary at all.
 *
 * The original answers a canonical shape carrying nine further
 * members, every one of them named for the particular subject it was
 * written against. This port replaced that shape with a field map
 * and a JSONB column, so there is nothing here to compare them
 * against — the absence is the port working rather than a hole in
 * the leg.
 *
 * `documents.hash` is this port's own. The original computes no
 * digest anywhere in its adapter path; the one this port's header
 * cites lives in a different module of the checkout, over a
 * different pair of halves, and diffing them would be comparing two
 * answers to two questions.
 *
 * The two source-id members are a name collision rather than a
 * shared member. The original records the item id the source itself
 * published; this port records the `sources` row the document
 * arrived through. A differ handed both would report a divergence,
 * and it would be right about the values and wrong about the
 * subject.
 *
 * The refusal POLICY is outside too, and it is the interesting one.
 * The original refuses a record whose body is short, whose members
 * are missing, or whose URL it will not use. This port keeps every
 * record and stores what it read — fail, flag, KEEP, with those
 * checks living in a source contract that judges the reading rather
 * than in the adapter that made it. So the two postures are compared
 * as a stated divergence in the last group below, never diffed as
 * though one of them were wrong.
 *
 * ## The member names are read off the original, never written down
 *
 * The two names the port's field map has to spell are the
 * original's, and they are the vocabulary of the subject this port
 * renames away from. They are DISCOVERED at run time rather than
 * typed: a recording proxy stands in for the record, answers every
 * property with a sentinel naming that property, and the answer says
 * which name the URL came from and which the body came from. The
 * discovered names exist for the length of a case and reach no
 * tracked file, which is what lets the comparison be honest about
 * where the port gets its names from — a row, and the same names.
 *
 * The discovery carries its own guards, because one that had gone
 * blind would leave every comparison below diffing two empty
 * readings and agreeing. Three cases hold it: the two names must be
 * found and must differ, the ORIGINAL must stop answering when a
 * record spells them differently, and the PORT must stop answering
 * when its row spells them differently.
 *
 * ## The one thing this file knows about the checkout
 *
 * The origin module's own path, which is a name written in the
 * subject matter the port renames away from. There is no way around
 * it: a parity file cannot address a module by a name that module
 * does not have. It appears here, in the one directory whose whole
 * purpose is to talk to the original, and nowhere else in this
 * repository.
 *
 * ## Both sides are handed one value
 *
 * Each side is given the record itself, not an envelope of its own.
 * Both implementations do accept the enveloped form their listing
 * loop produces, and the two spell that envelope differently — but
 * that rename is measured next door in `paged-list.parity.test.ts`,
 * and re-driving it here would buy a second reading of one fact
 * while costing this file the property that makes it a comparison:
 * one input, two implementations.
 *
 * ## The controls
 *
 * A parity leg over two reductions agrees perfectly when both of
 * them stopped reducing, so four readings say the comparison
 * measured something. The original must ACCEPT every record the
 * corpus produces and REFUSE every adversarial value, which is the
 * both-endings control read off the side under measurement. The
 * port's body must differ from the member it was read out of, or the
 * markup step never ran and both sides are echoing their input. The
 * port must PART from the original when its field map states no
 * selector, which is what says the agreement is the step rather than
 * the corpus. And the shared reading carries an `accepted` member
 * that is `true` by construction on the port side, so every
 * comparison in the main leg asserts in band that the original
 * answered at all.
 *
 * ## Where the origin is loaded
 *
 * Inside every case, never at module scope. The gate binds a
 * `describe` and nothing above one, so module scope runs on a
 * skipped run too, and a load up there would throw on every run that
 * armed nothing — CI included.
 */
import type { TextFixture } from './fixtures.js';
import type { FieldRule } from '../../src/lib/parser-config.js';
import type { CanonicalDocument } from '../../src/sources/index.js';
import type {
  ListingApiAdapter,
  ListingApiPayload,
  ListingApiRecord,
} from '../../src/sources/listing-api.js';

import { expect, it } from 'vitest';

import {
  BODY_FIELD,
  URL_FIELD,
  createListingApi,
  refusingTransport,
} from '../../src/sources/listing-api.js';
import {
  describePortParity,
  firstDivergence,
  loadOriginModule,
} from '../helpers/port-parity.js';

import {
  ADVERSARIAL_VALUES,
  DELIMITED_RECORD_FIXTURES,
  MARKUP_FIXTURES,
  MULTIPART_MESSAGE_FIXTURES,
  STRUCTURED_TEXT_FIXTURES,
} from './fixtures.js';

// ---------------------------------------------------------------------------
// The origin module, addressed generically and narrowed on arrival
// ---------------------------------------------------------------------------

/**
 * The origin module, by a path carrying an area and a name and
 * nothing about where the checkout sits.
 */
const ORIGIN_MODULE_PATH = 'lib/sources/greenhouse.js';

/** The three members the origin adapter contract declares. */
const ENTRY_POINTS: readonly string[] = ['fetch', 'list', 'parse'];

/**
 * What the origin module has to be for this file to drive it.
 *
 * One member, where {@link ENTRY_POINTS} names three. The other two
 * are asserted present and never called: both reach a network, and
 * the whole reason this comparison is possible offline is that the
 * mapping half of either implementation is pure.
 */
interface ListingOrigin {
  /** Maps one record onto the original canonical shape. */
  readonly parse: (record: unknown) => unknown;
}

/** Whether every entry point is there and is callable. */
function isListingOrigin(value: unknown): value is ListingOrigin {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const exports = value as Record<string, unknown>;

  return ENTRY_POINTS.every((name) => typeof exports[name] === 'function');
}

/**
 * The origin module, refusing anything that is not it.
 *
 * It refuses rather than casting: a module missing an export would
 * otherwise be called as `undefined` and every comparison below
 * would diff one thrown TypeError against another, which is
 * agreement nobody established.
 *
 * @returns The origin module, with every entry point callable.
 */
function originListing(): ListingOrigin {
  const loaded = loadOriginModule(ORIGIN_MODULE_PATH);

  if (!isListingOrigin(loaded)) {
    throw new TypeError(
      `the origin module does not export all of ${ENTRY_POINTS.join(', ')} `
      + 'as functions.',
    );
  }

  return loaded;
}

/**
 * The canonical answer inside an origin outcome, or null when the
 * original refused the record.
 *
 * The refusal SENTENCE is deliberately dropped here rather than
 * carried into a comparison. It is the original speaking in its own
 * vocabulary about its own policy, this file does not diff either,
 * and a failure message is the one place a string cannot be taken
 * back out of.
 *
 * @param answer - Whatever the original returned.
 * @returns Its canonical answer, or null.
 */
function originPosting(answer: unknown): Record<string, unknown> | null {
  if (typeof answer !== 'object' || answer === null) {
    return null;
  }

  const outcome = answer as { ok?: unknown; posting?: unknown };

  if (outcome.ok !== true) {
    return null;
  }

  return typeof outcome.posting === 'object' && outcome.posting !== null
    ? outcome.posting as Record<string, unknown>
    : null;
}

// ---------------------------------------------------------------------------
// The member names, discovered by driving rather than declared
// ---------------------------------------------------------------------------

/**
 * A property read, and what the reader was handed for it.
 */
interface RecordingProxy {
  /** The stand-in to pass in place of a record. */
  readonly value: unknown;

  /** Every property name that was asked for, deduplicated. */
  readonly asked: () => readonly string[];
}

/**
 * An object that answers any property and remembers which were read.
 *
 * The whole discovery mechanism. Handing one of these to a mapping
 * that reads members by name reports those names without anybody
 * having written them down, and handing back a value the mapping
 * will keep lets the answer say which name meant what.
 *
 * @param answer - What to hand back for a given property name.
 * @returns The stand-in and its record.
 */
function recordingProxy(answer: (name: string) => unknown): RecordingProxy {
  const asked: string[] = [];
  const value = new Proxy({}, {
    get(_target, property): unknown {
      if (typeof property !== 'string') {
        return undefined;
      }

      asked.push(property);

      return answer(property);
    },
  });

  return { value, asked: () => [...new Set(asked)] };
}

/**
 * Where a sentinel claims to be.
 *
 * A reserved host, so a sentinel that ever escaped a case resolves
 * nowhere. The value has to survive TWO readings on the origin side
 * — one that keeps only something shaped like a web address, and one
 * that refuses a body under a couple of hundred characters — so it
 * is a URL first and long second, with the padding inside the path
 * where no whitespace can break either reading.
 */
const SENTINEL_HOST = 'https://listing.invalid/';

/** The padding, long enough to clear a minimum-length policy. */
const SENTINEL_TAIL = 'q'.repeat(240);

/**
 * The sentinel handed back for one property name.
 *
 * @param name - The property the reader asked for.
 * @returns A value carrying that name, readable back out of it.
 */
function sentinelFor(name: string): string {
  return `${SENTINEL_HOST}${name}/${SENTINEL_TAIL}`;
}

/**
 * Which property name a sentinel came from, or nothing.
 *
 * Read back by taking the constants off either end rather than by a
 * pattern: the same two constants build it and unbuild it, so a
 * value that arrived through a reading which altered it — trimmed,
 * truncated, re-cased — reports nothing rather than a name that was
 * never asked for.
 *
 * @param value - A member of the answer.
 * @returns The property name, or undefined.
 */
function sentinelName(value: unknown): string | undefined {
  const suffix = `/${SENTINEL_TAIL}`;

  if (typeof value !== 'string') {
    return undefined;
  }

  if (!value.startsWith(SENTINEL_HOST) || !value.endsWith(suffix)) {
    return undefined;
  }

  return value.slice(SENTINEL_HOST.length, value.length - suffix.length);
}

/** The names the original spells in a vocabulary this port renames. */
interface OriginMembers {
  /** The member its URL is read out of. */
  readonly url: string;

  /** The member its body is read out of. */
  readonly body: string;

  /** Every member it asked the record for. */
  readonly read: readonly string[];
}

/**
 * Every member name, read off the original by driving it.
 *
 * One call. Each property answers a sentinel naming itself, so the
 * canonical answer says which name the URL came from and which the
 * body came from; the proxy says which names were asked for at all,
 * which is what lets a record be built that satisfies the original
 * without this file knowing what any of them mean.
 *
 * Refuses rather than guessing, so a discovery that found nothing
 * fails naming the step that failed instead of leaving a case to
 * diff two empty readings and agree.
 *
 * @param origin - The origin module.
 * @returns The two names and the full read list.
 */
function discoverOriginMembers(origin: ListingOrigin): OriginMembers {
  const probe = recordingProxy(sentinelFor);
  const posting = originPosting(origin.parse(probe.value));

  if (posting === null) {
    throw new TypeError(
      'the original refused the probe record, so no member could be read '
      + 'off its answer.',
    );
  }

  const url = sentinelName(posting.url);
  const body = sentinelName(posting.body);

  if (url === undefined || body === undefined || url === body) {
    throw new TypeError(
      'the probe did not report two distinct members: the answer carried '
      + 'no sentinel where a url or a body was expected.',
    );
  }

  return { url, body, read: probe.asked() };
}

// ---------------------------------------------------------------------------
// The reading both sides produce
// ---------------------------------------------------------------------------

/**
 * The pair both implementations answer, under names they share.
 *
 * {@link SharedReading.accepted} is `true` by construction on the
 * port side, because keeping every record is what this port does.
 * That is not a claim about the port dressed up as data — it is what
 * makes each comparison in the main leg assert, in band, that the
 * ORIGINAL accepted the record it was handed. A corpus that had
 * drifted into records the original refuses parts at that member
 * rather than agreeing about two nulls.
 */
interface SharedReading {
  /** Whether the side answered a mapping at all. */
  readonly accepted: boolean;

  /** Where the document is, as that side reports it. */
  readonly url: unknown;

  /** The document text, as that side reduced it. */
  readonly body: unknown;
}

/**
 * The original answer, as the shared reading.
 *
 * @param answer - Whatever the original returned.
 * @returns The pair, or a refusal carrying neither member.
 */
function originReading(answer: unknown): SharedReading {
  const posting = originPosting(answer);

  return posting === null
    ? { accepted: false, url: null, body: null }
    : { accepted: true, url: posting.url, body: posting.body };
}

/**
 * The port answer, as the shared reading.
 *
 * @param document - What `toCanonical` produced.
 * @returns The pair.
 */
function portReading(document: CanonicalDocument): SharedReading {
  return { accepted: true, url: document.url, body: document.body };
}

// ---------------------------------------------------------------------------
// Either ending, as a value
// ---------------------------------------------------------------------------

/** What a call did: answered, or refused with a sentence. */
type Outcome =
  | { readonly refused: false; readonly value: unknown }
  | { readonly refused: true; readonly message: string };

/**
 * One call ending, whichever it was.
 *
 * @param run - The call under test.
 * @returns What it did.
 */
function outcomeOf(run: () => unknown): Outcome {
  try {
    return { refused: false, value: run() };
  } catch (error) {
    return error instanceof Error
      ? { refused: true, message: error.message }
      : { refused: true, message: `non-Error: ${String(error)}` };
  }
}

/** One comparison that parted, labelled by the input that produced it. */
interface LabelledDivergence {
  /** Which input the two sides parted over. */
  readonly over: string;

  /** Where they parted, as the differ reports it. */
  readonly at: string;

  /** What kind of difference it was. */
  readonly reason: string;

  /** The origin side, rendered. */
  readonly origin: string;

  /** The port side, rendered the same way. */
  readonly port: string;
}

/**
 * Drive both implementations and report whether they parted.
 *
 * Both rendered halves are kept, which is worth one sentence because
 * the harness header cautions that a red parity run can print an
 * operator checkout path. Neither half can here: every value either
 * side answers is derived from a fixture authored in this repository
 * or from the sentinel host above, and the refusal SENTENCES — the
 * only strings the original writes itself — were dropped upstream in
 * {@link originReading}.
 *
 * @param over - How a failure should name this input.
 * @param origin - The origin call.
 * @param port - The port call.
 * @returns One entry when they parted, none when they agreed.
 */
function compare(
  over: string,
  origin: () => unknown,
  port: () => unknown,
): LabelledDivergence[] {
  const found = firstDivergence(outcomeOf(origin), outcomeOf(port));

  return found === null
    ? []
    : [{
      over,
      at: found.path,
      reason: found.reason,
      origin: found.origin,
      port: found.port,
    }];
}

// ---------------------------------------------------------------------------
// The inputs
// ---------------------------------------------------------------------------

/** Every neutral text roster this file drives, in one list. */
const ROSTERS: readonly (readonly TextFixture[])[] = [
  MARKUP_FIXTURES,
  STRUCTURED_TEXT_FIXTURES,
  DELIMITED_RECORD_FIXTURES,
  MULTIPART_MESSAGE_FIXTURES,
];

/**
 * Every fixture, flattened.
 *
 * Four rosters rather than the markup one alone, because the two
 * reductions under comparison disagree over text that is NOT markup
 * as readily as over text that is: a delimited record carrying an
 * angle bracket, a header block carrying an ampersand, and an
 * indented document carrying a run of spaces each reach a different
 * branch. Derived rather than listed, so a fixture added to any
 * roster joins this run without an edit here.
 */
const CORPUS: readonly TextFixture[] = ROSTERS.flat();

/**
 * The element a fixture body is wrapped in, and the selector the
 * port field map names.
 *
 * The original strips the WHOLE member it is handed, because the
 * source it was written against publishes one member that is the
 * document. This port reduces per selector by design — its markup
 * step runs where a field declared one and nowhere else — so the
 * record wraps its body in a container and the row names it. That is
 * the one arrangement this comparison needs, and it is the shape a
 * config author writes anyway.
 */
const BODY_CONTAINER = 'article';

/** What every member the original reads is filled with. */
const FILLER_MEMBER = 'neutral filler';

/**
 * Prose appended inside every body.
 *
 * The original refuses a body under a couple of hundred characters
 * as a teaser rather than a document, and a corpus it refused would
 * agree with anything. Neutral, carrying no markup of its own, so
 * what the reduction has to do is decided by the fixture and not by
 * this constant.
 */
const BODY_FILLER = 'A neutral sentence carrying no markup. '.repeat(8);

/** The `sources` row every document below is attributed to. */
const SOURCE_ROW_ID = 7;

/**
 * What one body member holds inside its container.
 *
 * Named rather than inlined because a case below holds the port
 * answer against it: a reduction that had stopped reducing answers
 * exactly this, since the matcher hands its caller the INNER content
 * of the element a selector named. Written once so the two readings
 * cannot drift into agreeing about a string neither of them builds.
 *
 * @param text - The fixture text.
 * @returns The container content, fixture text and filler.
 */
function bodyInner(text: string): string {
  return `${text}\n<p>${BODY_FILLER}</p>`;
}

/**
 * One body member, container and all.
 *
 * @param text - The fixture text.
 * @returns What the record carries.
 */
function bodyMember(text: string): string {
  return `<${BODY_CONTAINER}>${bodyInner(text)}</${BODY_CONTAINER}>`;
}

/**
 * One record, in the shape the original reads.
 *
 * Every member it asked the probe for is filled, then the two the
 * comparison is about are overwritten. Filling the rest is what gets
 * the record past a content policy this file deliberately knows
 * nothing about: the members have neutral values and no meaning here
 * is claimed for any of them.
 *
 * @param members - The discovered names.
 * @param id - The fixture id, which becomes part of the URL.
 * @param text - The fixture text, which becomes the body.
 * @returns The record both sides are handed.
 */
function recordFor(
  members: OriginMembers,
  id: string,
  text: string,
): Record<string, unknown> {
  const record: Record<string, unknown> = {};

  for (const name of members.read) {
    record[name] = FILLER_MEMBER;
  }

  record[members.url] = `${SENTINEL_HOST}entry/${id}`;
  record[members.body] = bodyMember(text);

  return record;
}

/**
 * One adapter for one `sources` row, with its field map spelling the
 * discovered names.
 *
 * The transport is the module inert one. It is required and it is
 * never reached: this file drives the two members the contract calls
 * pure, and `fetch` is the member that opens a socket on either
 * side.
 *
 * @param members - The discovered names.
 * @param body - The rule the body member is read by.
 * @returns The adapter.
 */
function listingAdapter(
  members: OriginMembers,
  body: FieldRule,
): ListingApiAdapter {
  return createListingApi({
    endpoint: SENTINEL_HOST,
    parserConfig: {
      fields: { [URL_FIELD]: { path: members.url }, [BODY_FIELD]: body },
    },
    sourceId: SOURCE_ROW_ID,
    transport: refusingTransport,
  });
}

/** A stored payload carrying `records` and nothing a run measured. */
function payloadOf(records: readonly unknown[]): ListingApiPayload {
  return { records, cursor: '', notes: [], pages: 0, requests: 0 };
}

/**
 * The one reading a single record produced.
 *
 * Refuses any other count rather than indexing into whatever came
 * back: a payload of one that answered none would otherwise reach a
 * comparison as `undefined` on the port side.
 *
 * @param adapter - The adapter under test.
 * @param record - The record to read.
 * @returns Its reading.
 */
function readOne(
  adapter: ListingApiAdapter,
  record: unknown,
): ListingApiRecord {
  const readings = adapter.parse(payloadOf([record]));
  const reading = readings[0];

  if (readings.length !== 1 || reading === undefined) {
    throw new TypeError(
      `one record produced ${readings.length} readings, not one.`,
    );
  }

  return reading;
}

/** One fixture, the record built from it, and what the port read. */
interface Driven {
  /** The fixture the record was built from. */
  readonly fixture: TextFixture;

  /** The record both sides were handed. */
  readonly record: Record<string, unknown>;

  /** What the port made of it. */
  readonly reading: ListingApiRecord;
}

/** The origin, the discovered names, and an adapter built from them. */
interface Harnessed {
  /** The origin module. */
  readonly origin: ListingOrigin;

  /** The names read off it. */
  readonly members: OriginMembers;

  /** The port adapter, reading through those names. */
  readonly adapter: ListingApiAdapter;
}

/**
 * Everything a case needs, loaded and discovered.
 *
 * Called inside a case, never above one.
 *
 * @returns The origin, its member names, and the port adapter.
 */
function harnessed(): Harnessed {
  const origin = originListing();
  const members = discoverOriginMembers(origin);

  return {
    origin,
    members,
    adapter: listingAdapter(members, {
      path: members.body,
      selector: BODY_CONTAINER,
    }),
  };
}

/**
 * The whole corpus, driven through one adapter in one call.
 *
 * One `parse` over every record rather than one per fixture, because
 * the count coming back is a property this port states: one reading
 * per entry, whatever the extraction managed.
 *
 * @param harness - What {@link harnessed} answered.
 * @returns One entry per fixture, in corpus order.
 */
function driveCorpus(harness: Harnessed): Driven[] {
  const built = CORPUS.map((fixture) => ({
    fixture,
    record: recordFor(harness.members, fixture.id, fixture.text),
  }));
  const readings = harness.adapter.parse(
    payloadOf(built.map((entry) => entry.record)),
  );

  if (readings.length !== built.length) {
    throw new TypeError(
      `${built.length} records produced ${readings.length} readings.`,
    );
  }

  return built.map((entry, index) => {
    const reading = readings[index];

    if (reading === undefined) {
      throw new TypeError(`no reading at ${String(index)}.`);
    }

    return { ...entry, reading };
  });
}

// ---------------------------------------------------------------------------
// The origin the comparisons read
// ---------------------------------------------------------------------------

describePortParity('listing-api — the origin the comparisons read', () => {
  it('exports the entry points this file drives', () => {
    const loaded = loadOriginModule(ORIGIN_MODULE_PATH);

    expect(isListingOrigin(loaded)).toBe(true);
  });

  it('reports two distinct members, and the list it read them from', () => {
    const members = discoverOriginMembers(originListing());

    expect(members.url).not.toBe(members.body);
    expect(members.read).toContain(members.url);
    expect(members.read).toContain(members.body);
    expect(members.read.length).toBeGreaterThan(2);
  });

  // Half of the discovery guard: the ORIGINAL has to stop answering
  // when a record spells its members differently. A probe that had
  // gone blind would leave the comparisons diffing two readings of
  // nothing, which agree.
  it('stops answering when a record spells those members otherwise', () => {
    const { origin, members } = harnessed();
    const record = recordFor(members, 'renamed', 'Plain prose.');
    const renamed: Record<string, unknown> = {};

    for (const [name, value] of Object.entries(record)) {
      renamed[`zz_${name}`] = value;
    }

    expect(originReading(origin.parse(record)).accepted).toBe(true);
    expect(originReading(origin.parse(renamed)).accepted).toBe(false);
  });

  // The other half, on the port side: a row naming a member the
  // record does not carry reads nothing rather than reading the
  // record itself.
  it('stops answering when the row spells those members otherwise', () => {
    const { members, adapter } = harnessed();
    const record = recordFor(members, 'unnamed', 'Plain prose.');
    const elsewhere = listingAdapter(
      { ...members, url: 'a_member_no_record_carries' },
      { path: 'another_member_no_record_carries', selector: BODY_CONTAINER },
    );
    const found = portReading(adapter.toCanonical(readOne(adapter, record)));
    const missed = portReading(
      elsewhere.toCanonical(readOne(elsewhere, record)),
    );

    expect(found.url).toBe(record[members.url]);
    expect(missed).toEqual({ accepted: true, url: null, body: '' });
  });

  // The both-endings control, read off the side under measurement.
  // Two implementations that answer nothing agree perfectly, so the
  // corpus has to be records the original ACCEPTS and the
  // adversarial roster has to be values it REFUSES.
  it('is driven over records it accepts and values it refuses', () => {
    const { origin, members } = harnessed();
    const accepted = CORPUS.map((fixture) => {
      const record = recordFor(members, fixture.id, fixture.text);

      return `${fixture.id}: ${String(
        originReading(origin.parse(record)).accepted,
      )}`;
    });
    const refused = ADVERSARIAL_VALUES.map(
      (entry) => `${entry.id}: ${String(
        originReading(origin.parse(entry.build())).accepted,
      )}`,
    );

    expect(accepted).toEqual(CORPUS.map((fixture) => `${fixture.id}: true`));
    expect(refused).toEqual(
      ADVERSARIAL_VALUES.map((entry) => `${entry.id}: false`),
    );
  });
});

// ---------------------------------------------------------------------------
// One record, two readings
// ---------------------------------------------------------------------------

describePortParity('listing-api — one record, two readings', () => {
  it('drives every roster the corpus is built from', () => {
    const ids = CORPUS.map((fixture) => fixture.id);
    const sizes = ROSTERS.map((roster) => roster.length > 0);

    expect(new Set(ids).size).toBe(ids.length);
    expect(sizes).toEqual(ROSTERS.map(() => true));
    expect(CORPUS.length).toBeGreaterThan(ROSTERS.length);
  });

  // The main leg. One entry per fixture, so a divergence names the
  // document it happened over rather than the first one in the list.
  it('agrees about the url and the body over every fixture', () => {
    const harness = harnessed();
    const apart = driveCorpus(harness).flatMap((entry) => compare(
      entry.fixture.id,
      () => originReading(harness.origin.parse(entry.record)),
      () => portReading(harness.adapter.toCanonical(entry.reading)),
    ));

    expect(apart).toEqual([]);
  });

  it('answers one reading per record, whatever the extraction managed', () => {
    const { members, adapter } = harnessed();
    const records: unknown[] = [
      ...CORPUS.map(
        (fixture) => recordFor(members, fixture.id, fixture.text),
      ),
      ...ADVERSARIAL_VALUES.map((entry) => entry.build()),
    ];

    expect(adapter.parse(payloadOf(records))).toHaveLength(records.length);
  });

  // Both sides keep the value they were handed rather than a copy of
  // it, which is what makes a stored document a re-parse rather than
  // a re-fetch. Identity rather than equality: a structural check
  // passes over a copy, and a copy is exactly the regression.
  it('keeps the record it read, verbatim, on both sides', () => {
    const { origin, members, adapter } = harnessed();
    const record = recordFor(members, 'verbatim', 'Plain prose.');
    const posting = originPosting(origin.parse(record));

    expect(adapter.toCanonical(readOne(adapter, record)).raw).toBe(record);
    expect(posting?.raw).toBe(record);
  });
});

// ---------------------------------------------------------------------------
// The reduction the two share
// ---------------------------------------------------------------------------

describePortParity('listing-api — the reduction the two share', () => {
  // The liveness control the main leg is worthless without. Two
  // implementations that both echo their input agree over every
  // document ever written, so the port answer has to carry text and
  // has to differ from what it was read out of — at BOTH steps. The
  // second comparison is the one that earns its place: the matcher
  // answers the inner content of the element a selector named, so a
  // port that selected and then reduced nothing differs from the
  // stored member while having reduced nothing at all, and only
  // holding it against {@link bodyInner} reports that.
  it('reduces the member it read rather than copying it', () => {
    const harness = harnessed();
    const copied = driveCorpus(harness)
      .filter((entry) => {
        const { body } = harness.adapter.toCanonical(entry.reading);

        return body === ''
          || body === entry.record[harness.members.body]
          || body === bodyInner(entry.fixture.text);
      })
      .map((entry) => entry.fixture.id);

    expect(copied).toEqual([]);
  });

  // The discrimination control beside it. With the selector dropped
  // the port reads the member as text and never reaches the markup
  // step, so it must PART from the original everywhere — an
  // agreement that survived this would be an agreement about the
  // corpus rather than about the step.
  it('parts from the original when the markup step is not reached', () => {
    const harness = harnessed();
    const bare = listingAdapter(harness.members, {
      path: harness.members.body,
    });
    const agreeing = driveCorpus(harness)
      .filter((entry) => {
        const found = firstDivergence(
          originReading(harness.origin.parse(entry.record)),
          portReading(bare.toCanonical(readOne(bare, entry.record))),
        );

        return found === null;
      })
      .map((entry) => entry.fixture.id);

    expect(agreeing).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Where the two part by design
// ---------------------------------------------------------------------------

describePortParity('listing-api — where the two part by design', () => {
  // Fail, flag, KEEP, stated as a measurement rather than as a
  // comment. Every adversarial value is a record the original
  // refuses; every one of them comes back from the port as a
  // document carrying the value it refused. Neither side raises over
  // any of them, which is the half a refusal-shaped comparison
  // cannot see.
  it('keeps every value the original refuses, and neither raises', () => {
    const { origin, adapter } = harnessed();
    const seen = ADVERSARIAL_VALUES.map((entry) => {
      const value = entry.build();
      const fromOrigin = outcomeOf(() => originReading(origin.parse(value)));
      const fromPort = outcomeOf(
        () => adapter.toCanonical(readOne(adapter, value)).raw,
      );
      const accepted = !fromOrigin.refused
        && (fromOrigin.value as SharedReading).accepted;

      return [
        entry.id,
        fromOrigin.refused || fromPort.refused,
        accepted,
        !fromPort.refused && Object.is(fromPort.value, value),
      ].join(' ');
    });

    expect(seen).toEqual(
      ADVERSARIAL_VALUES.map((entry) => `${entry.id} false false true`),
    );
  });

  // The one divergence inside the kernel, and it is one-directional.
  // The original cleans a URL before storing it — a query and a
  // fragment go, and what is left is a prefix of what the source
  // said. This port stores what the source said, because a document
  // URL here is evidence about where a capture came from and the
  // cleaning is a reading somebody else may want to make later.
  it('carries the url the source stated, where the original cleans it', () => {
    const { origin, members, adapter } = harnessed();
    const record = recordFor(members, 'tracked', 'Plain prose.');
    const stated = `${String(record[members.url])}?tracking=1#section`;
    const tracked = { ...record, [members.url]: stated };
    const fromOrigin = originReading(origin.parse(tracked));
    const fromPort = portReading(adapter.toCanonical(readOne(adapter, tracked)));

    expect(fromPort.url).toBe(stated);
    expect(fromOrigin.accepted).toBe(true);
    expect(fromOrigin.url).not.toBe(fromPort.url);
    expect(stated.startsWith(String(fromOrigin.url))).toBe(true);
  });
});
