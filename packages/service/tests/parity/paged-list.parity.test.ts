/**
 * Kernel parity for `src/sources/paged-list.ts`: the cursor codec,
 * the stamp coercion, the endpoint list and the payload unwrap,
 * driven against their originals over one set of inputs and diffed
 * by path.
 *
 * KERNEL rather than full, and the boundary is the port's own
 * divergence rather than a choice about coverage. The listing run is
 * outside it for two reasons that cannot be arranged around: its
 * transport is an INJECTED dependency here and a global fallback
 * there, so the two do not answer the same call; and every note it
 * produces was re-authored in this repository's vocabulary, so a
 * comparison of two runs would report a divergence per note over a
 * port that is behaving exactly as intended. That half is
 * characterized in `src/sources/paged-list.test.ts` instead, and
 * this file covers everything the rename and the injection did not
 * touch.
 *
 * ## The renamed keys are read out of the original, never written
 * down
 *
 * Two of the functions here are inside the leg despite reading a key
 * whose name the port changed — the endpoint list reads one config
 * key, and the unwrap reads a two-key envelope. The way that is made
 * honest is the interesting half of this file: the original's key
 * names are DISCOVERED at run time by driving it, never typed.
 *
 * A recording proxy stands in for the argument. It answers every
 * property read with a sentinel naming the property, and records
 * which properties were asked for, so one call to each function
 * reports both the keys it looks at and — by matching sentinels
 * against the answer — which key means which. The discovered names
 * exist for the length of a case; no config key or envelope key from
 * the original reaches a tracked file, which is the whole point of
 * the port carrying a rename at all.
 *
 * The discovery needs its own guards, because a probe that failed to
 * discriminate would classify nothing and the comparisons would
 * still pass over the bare-payload branch. So three cases hold it
 * down. Exactly one config key is read, and a config built under any
 * other name yields no endpoints. The envelope discovery finds two
 * distinct keys and the result key that carries provenance. And each
 * side is shown to REFUSE the other's envelope: an envelope built
 * with this port's key names reads as a bare payload to the
 * original, and one built with the discovered names reads as a bare
 * payload to the port. A discovery that had gone blind fails there
 * rather than passing quietly downstream.
 *
 * ## The one thing this file knows about the checkout
 *
 * The origin module's own path, which is a name written in the
 * subject matter the port renames away from. There is no way around
 * it: a parity file cannot address a module by a name that module
 * does not have, and the same goes for the six exports it calls.
 * They appear here, in the one directory whose whole purpose is to
 * talk to the original, and nowhere else in this repository.
 *
 * ## A throw is an answer
 *
 * Every comparison runs both sides through {@link outcomeOf}, which
 * turns either ending into a value. Two of the entry points refuse
 * for at least one input in the corpus — a value whose text
 * conversion throws reaches the stamp coercion unguarded, and a
 * finite number outside the range a date can hold throws from the
 * same place — and a run comparing only returned values would pass
 * for a port that threw a different sentence, threw where the
 * original answered, or answered where it threw.
 *
 * That arrangement needs the control that comes with it: two
 * implementations refusing everything agree perfectly. So a case
 * asserts the driven inputs produce BOTH endings, read off the PORT
 * rather than off the original, since the original is the thing
 * under measurement. Three more cases say the same thing one level
 * down, for each function whose answer has two readings: the cursor
 * reader must produce both empty and populated cursors, the cursor
 * writer both the empty string and a stored one, the stamp coercion
 * both an instant and nothing, and the endpoint list both accepted
 * and rejected entries. A corpus that had drifted to one side of any
 * of those would agree perfectly having measured half the function.
 *
 * ## What the differ cannot see, and the case that covers it
 *
 * A cursor whose stored JSON carries a `__proto__` key produces an
 * object with no own key on either side — the assignment goes
 * through the inherited setter and replaces the answer's prototype.
 * The differ compares own keys and deliberately says nothing about
 * prototypes, so it reports those two answers as agreeing whatever
 * either side did. One case therefore compares the prototypes
 * directly, which is the reading the structural diff is documented
 * as leaving to its caller.
 *
 * ## Where the origin is loaded
 *
 * Inside every case, never at module scope. The gate binds a
 * `describe` and nothing above one, so module scope runs on a
 * skipped run too, and a load up there would throw on every run that
 * armed nothing — CI's included.
 */
import { expect, it } from 'vitest';

import {
  formatListCursor,
  listStamp,
  parseEndpointList,
  parseListCursor,
  slugToEndpointName,
  unwrapListPayload,
} from '../../src/sources/paged-list.js';
import {
  describePortParity,
  firstDivergence,
  loadOriginModule,
} from '../helpers/port-parity.js';

import { ADVERSARIAL_VALUES } from './fixtures.js';

// ---------------------------------------------------------------------------
// The origin module, addressed generically and narrowed on arrival
// ---------------------------------------------------------------------------

/**
 * The origin module, by a path carrying an area and a name and
 * nothing about where the checkout sits.
 *
 * Two segments rather than one, because the original keeps its
 * source modules in a directory of their own and this one sits with
 * them — the same reason the port sits in `src/sources/`.
 */
const ORIGIN_MODULE_PATH = 'lib/sources/board-list.js';

/** The six entry points this file drives, in sorted order. */
const ENTRY_POINTS: readonly string[] = [
  'boardStamp', 'formatBoardCursor', 'parseBoardCursor', 'parseBoardList',
  'slugToBoardName', 'unwrapBoardPayload',
];

/** What the origin module has to be for this file to drive it. */
interface PagedListOrigin {
  /** Reads a stored cursor. */
  readonly parseBoardCursor: (text: unknown) => unknown;

  /** Writes one back. */
  readonly formatBoardCursor: (map: unknown) => unknown;

  /** Coerces one timestamp to a comparable instant. */
  readonly boardStamp: (value: unknown) => unknown;

  /** Reads the endpoint list out of a config. */
  readonly parseBoardList: (config: unknown) => unknown;

  /** Derives a display name from a handle. */
  readonly slugToBoardName: (slug: unknown) => unknown;

  /** Separates a stored payload from its provenance. */
  readonly unwrapBoardPayload: (raw: unknown) => unknown;
}

/** Whether every entry point is there and is callable. */
function isPagedListOrigin(value: unknown): value is PagedListOrigin {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const exports = value as Record<string, unknown>;

  return ENTRY_POINTS.every((name) => typeof exports[name] === 'function');
}

/**
 * The origin module, refusing anything that is not it.
 *
 * The loader answers `unknown` so each suite narrows what it asked
 * for, and this is that step. It refuses rather than casting: a
 * module missing an export would otherwise be called as `undefined`
 * and every comparison below would diff one thrown TypeError against
 * another, which is agreement nobody established.
 *
 * @returns The origin module, with all six entry points callable.
 */
function originPagedList(): PagedListOrigin {
  const loaded = loadOriginModule(ORIGIN_MODULE_PATH);

  if (!isPagedListOrigin(loaded)) {
    throw new TypeError(
      `the origin module does not export all of ${ENTRY_POINTS.join(', ')} `
      + 'as functions.',
    );
  }

  return loaded;
}

// ---------------------------------------------------------------------------
// The key names, discovered by driving rather than declared
// ---------------------------------------------------------------------------

/** A property read, and what the reader was handed for it. */
interface RecordingProxy {
  /** The stand-in to pass in place of an argument. */
  readonly value: unknown;

  /** Every property name that was asked for, in order, deduplicated. */
  readonly asked: () => readonly string[];
}

/**
 * An object that answers any property and remembers which were read.
 *
 * The whole discovery mechanism. Handing one of these to a function
 * that reads a key by name reports that name without anybody having
 * written it down, and handing back a value the function will keep
 * lets the answer say which key meant what.
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

/** The names the original spells in a vocabulary this port renames. */
interface OriginKeys {
  /** The config key its endpoint list is read out of. */
  readonly config: string;

  /** The envelope key carrying the payload. */
  readonly inner: string;

  /** The envelope key carrying the provenance. */
  readonly outer: string;

  /** The result key the provenance comes back under. */
  readonly provenance: string;
}

/**
 * Every renamed key, read off the original by driving it.
 *
 * One call each. The config probe hands back a list the parser will
 * accept, so a key that was read is a key that produced endpoints;
 * the envelope probe hands back a distinct object per property name,
 * so matching those objects against the answer says which key is the
 * payload and which the provenance — and which result key the
 * provenance came back under.
 *
 * Refuses rather than guessing, so a discovery that found nothing
 * fails naming the step that failed instead of leaving a case to
 * compare two bare payloads and agree.
 *
 * @param origin - The origin module.
 * @returns The four names, for the length of a case.
 */
function discoverOriginKeys(origin: PagedListOrigin): OriginKeys {
  const configProbe = recordingProxy(() => 'alpha,bravo');

  origin.parseBoardList(configProbe.value);

  const configKeys = configProbe.asked();

  if (configKeys.length !== 1 || configKeys[0] === undefined) {
    throw new TypeError(
      `the endpoint list read ${configKeys.length} config keys, not one.`,
    );
  }

  const envelopeProbe = recordingProxy((name) => ({ probe: name }));
  const unwrapped = origin.unwrapBoardPayload(envelopeProbe.value) as
    Record<string, { probe?: string } | undefined>;
  const resultKeys = Object.keys(unwrapped);
  const inner = probeNameAt(unwrapped, 'item');
  const provenance = resultKeys.find(
    (key) => key !== 'item' && unwrapped[key]?.probe !== undefined,
  );

  if (inner === undefined || provenance === undefined) {
    throw new TypeError(
      `the unwrap answered ${resultKeys.join(', ')}: no envelope there.`,
    );
  }

  const outer = probeNameAt(unwrapped, provenance);

  if (outer === undefined || outer === inner) {
    throw new TypeError('the unwrap read one envelope key, not two.');
  }

  return { config: configKeys[0], inner, outer, provenance };
}

/**
 * Which property name the sentinel sitting at `key` came from.
 *
 * @param answer - What the unwrap returned for a recording proxy.
 * @param key - A key of that answer.
 * @returns The property name, or `undefined` when there is no
 *   sentinel there.
 */
function probeNameAt(
  answer: Record<string, { probe?: string } | undefined>,
  key: string,
): string | undefined {
  return answer[key]?.probe;
}

// ---------------------------------------------------------------------------
// Either ending, as a value
// ---------------------------------------------------------------------------

/** What a call did: answered, or refused with a sentence. */
type Outcome =
  | { readonly refused: false; readonly value: unknown }
  | { readonly refused: true; readonly message: string };

/**
 * One call's ending, whichever it was.
 *
 * A throw that is not an `Error` is reported as its own shape rather
 * than coerced into a message, so a port raising a string where the
 * original raised an `Error` diverges instead of agreeing.
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

  /** The port side, rendered. */
  readonly port: string;
}

/**
 * Drive both implementations and report whether they parted.
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

/** How a failure should name an input that is not a plain string. */
function label(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return Object.prototype.toString.call(value);
  }
}

/**
 * The endpoint list's answer, under names both sides share.
 *
 * The original calls its list one thing and the port another, so a
 * raw comparison would report a divergence over a rename. The list
 * is taken as the key that is not the refusals rather than by its
 * name, which keeps one more word out of this file and gives the
 * case below something to hold: an answer with any shape other than
 * two keys, one of them the refusals, refuses here.
 *
 * @param answer - What either implementation returned.
 * @returns The two halves under shared names.
 */
function endpointListAnswer(answer: unknown): {
  list: unknown;
  rejected: unknown;
} {
  const record = answer as Record<string, unknown>;
  const keys = Object.keys(record);
  const listKey = keys.find((key) => key !== 'rejected');

  if (keys.length !== 2 || listKey === undefined
    || !keys.includes('rejected')) {
    throw new TypeError(
      `an endpoint list answered ${keys.join(', ')}: not two halves.`,
    );
  }

  return { list: record[listKey], rejected: record.rejected };
}

/**
 * The unwrap's answer, under names both sides share.
 *
 * Same reason and the same one-cell rename, except that the
 * provenance key is the DISCOVERED one on the origin side and this
 * port's own on the other — which is exactly the rename the leg
 * exists to prove is only a rename.
 *
 * @param answer - What either implementation returned.
 * @param provenanceKey - Which key carries the provenance.
 * @returns The two halves under shared names.
 */
function unwrapAnswer(answer: unknown, provenanceKey: string): {
  item: unknown;
  provenance: unknown;
} {
  const record = answer as Record<string, unknown>;

  return { item: record.item, provenance: record[provenanceKey] };
}

// ---------------------------------------------------------------------------
// The inputs
// ---------------------------------------------------------------------------

/** The characters a stored cursor is read one at a time by. */
const CURSOR_ALPHABET: readonly string[] = [
  '{', '}', '"', ':', ',', 's', 'e', 'n', '0', ' ', '[',
];

/** How long an enumerated cursor string gets. */
const ENUMERATION_LENGTH = 3;

/**
 * Every string up to {@link ENUMERATION_LENGTH} characters over
 * {@link CURSOR_ALPHABET}, the empty one included.
 *
 * The reader's first three decisions — is there text, does it open
 * with a brace, does it parse — are all reachable inside three
 * characters, so walking them exercises the whole of the guard chain
 * in front of the JSON parse.
 *
 * @returns Every such string, shortest first.
 */
function enumerateCursorStrings(): string[] {
  const all: string[] = [''];
  let level: string[] = [''];

  for (let length = 1; length <= ENUMERATION_LENGTH; length += 1) {
    const next: string[] = [];

    for (const prefix of level) {
      for (const character of CURSOR_ALPHABET) {
        next.push(prefix + character);
      }
    }

    all.push(...next);
    level = next;
  }

  return all;
}

/**
 * Stored cursors written to reach the places the enumeration cannot.
 *
 * Well-formed entries, entries whose halves are the wrong kind, the
 * two keys that are inherited property names, and a handful of
 * documents that parse to something that is not a cursor at all.
 */
const CURSOR_TEXTS: readonly string[] = [
  '{"alpha":{"seen":"2026-01-02T03:04:05.000Z","etag":"W/\\"tag\\""}}',
  '{"alpha":{"seen":" 2026-01-02 ","etag":"  "}}',
  '{"alpha":{"seen":null,"etag":null}}',
  '{"alpha":{"seen":12,"etag":false}}',
  '{"alpha":{"seen":{"nested":1}}}',
  '{"alpha":{}}', '{"alpha":[]}', '{"alpha":null}', '{"alpha":1}',
  '{"alpha":"bravo"}', '{"alpha":true}',
  '{"alpha":{"seen":"x"},"bravo":{"etag":"y"}}',
  '{"__proto__":{"seen":"x","etag":"y"}}',
  '{"constructor":{"seen":"x"}}',
  '{"toString":{"seen":"x"}}',
  '{"":{"seen":"x"}}',
  '  {"alpha":{"seen":"x"}}  ',
  '[]', '[1]', 'null', 'true', '"alpha"', '12', '{', '}', '{}',
  '', '   ', 'not a cursor at all', '{unquoted: 1}',
];

/** Cursors on the way out, including the two the writer cannot store. */
const CURSOR_MAPS: readonly unknown[] = [
  {}, { alpha: { seen: 'x', etag: 'y' } },
  { bravo: { seen: 'x' }, alpha: { etag: 'y' } },
  { alpha: { seen: '', etag: '' } },
  { alpha: {} }, { alpha: null }, { alpha: 0 }, { alpha: 'x' },
  { alpha: [] }, { alpha: true },
  { alpha: { seen: '  x  ', etag: '  y  ' } },
  { alpha: { seen: 12, etag: false } },
  { zulu: { seen: 'z' }, alpha: { seen: 'a' }, mike: { seen: 'm' } },
  { '': { seen: 'x' } },
  Object.fromEntries([['__proto__', { seen: 'x', etag: 'y' }]]),
  [], [{ seen: 'x' }], 'alpha', 12, true, null, undefined,
];

/** Timestamps in every shape a listing source states one in. */
const STAMPS: readonly unknown[] = [
  null, undefined, '', ' ', 0, -0, 1, -1, 1.5, 1e12,
  8.64e15, 8.64e15 + 1, -8.64e15 - 1,
  Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY,
  new Date(0), new Date(Number.NaN), new Date('2026-01-02T03:04:05Z'),
  '2026-01-02', '2026-01-02T03:04:05Z', '2026-01-02T03:04:05-04:00',
  '2026-01-02T03:04:05+02:00', ' 2026-01-02 ', '1970-01-01',
  'not a date', '0', 'Jan 2 2026', [], [0], [[]], {}, true, false,
];

/** Endpoint lists in both spellings a `parser_config` arrives in. */
const ENDPOINT_LISTS: readonly unknown[] = [
  '', 'alpha', 'alpha,bravo', 'alpha=Alpha Name', ' alpha = Alpha Name ',
  'alpha,alpha', 'alpha,ALPHA', 'alpha,,bravo', ',', '=', 'alpha=', '=bravo',
  'alpha=one=two', 'not a handle,alpha', '-alpha,bravo',
  'alpha-bravo_charlie.delta', 'alpha  ,  bravo',
  ['alpha', 'bravo=Bravo Name'], ['alpha', 'alpha'], [],
  [null, undefined, 0, 1, 'alpha'], [['alpha']],
  null, undefined, 0, 12, true, {}, [{}],
];

/** Configs that are not objects at all, which the parser still reads. */
const BARE_CONFIGS: readonly unknown[] = [
  null, undefined, 0, '', 'alpha', [], 12, true, false,
];

/** Handles the display-name fallback is derived from. */
const SLUGS: readonly unknown[] = [
  '', ' ', 'a', 'A', 'alpha', 'alpha-bravo', 'alpha_bravo', 'alpha.bravo',
  'alpha--bravo', '-alpha', 'alpha-', '__proto__', 'a.b_c-d',
  'ALPHA-bravo', '1two-3', 'alpha bravo', 'alpha=bravo', '...',
  null, undefined, 0, 12, true, [], ['alpha'], {},
];

/** Payloads carrying no envelope, which come back as themselves. */
const BARE_PAYLOADS: readonly unknown[] = [
  null, undefined, 0, '', 'alpha', true, [], [1], {}, { alpha: 1 },
  { record: null }, { record: 'alpha' }, { record: [] }, { record: 1 },
  { endpoint: { slug: 'alpha' } },
];

/** The payload half of an envelope, which decides the branch. */
const ENVELOPE_INNERS: readonly unknown[] = [
  { id: 1 }, {}, { nested: { alpha: 1 } }, { id: null },
];

/** The provenance half, which is taken as-is whenever it is an object. */
const ENVELOPE_OUTERS: readonly unknown[] = [
  { slug: 'alpha', name: 'Alpha Name' }, {}, null, undefined,
  'alpha', 0, [], [1], true,
];

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

describePortParity('paged-list — the origin the comparisons read', () => {
  it('exports the six entry points this file drives', () => {
    const loaded = loadOriginModule(ORIGIN_MODULE_PATH);

    expect(isPagedListOrigin(loaded)).toBe(true);
  });

  // The control the outcome wrapper is worthless without: two
  // implementations that refuse everything agree perfectly, so the
  // driven inputs have to produce BOTH endings. Read off the PORT,
  // since the original is the thing under measurement.
  it('is driven over values producing both endings', () => {
    const endings = [
      ...STAMPS,
      ...ADVERSARIAL_VALUES.map((entry) => entry.build()),
    ].map((value) => outcomeOf(() => listStamp(value)).refused);

    expect(endings).toContain(true);
    expect(endings).toContain(false);
  });

  // One control per function whose answer has two readings. A corpus
  // that had drifted to one side of any of these would agree
  // perfectly having measured half the function.
  it('is driven over cursors that read as empty and as populated', () => {
    const sizes = CURSOR_TEXTS.map(
      (text) => Object.keys(parseListCursor(text)).length,
    );

    expect(sizes).toContain(0);
    expect(sizes.some((size) => size > 0)).toBe(true);
    expect(sizes.some((size) => size > 1)).toBe(true);
  });

  it('is driven over cursors that store and cursors that do not', () => {
    const written = CURSOR_MAPS.map((map) => formatListCursor(map));

    expect(written).toContain('');
    expect(written.some((text) => text !== '')).toBe(true);
  });

  it('is driven over stamps that resolve and stamps that cannot', () => {
    const resolved = STAMPS
      .filter((value) => !outcomeOf(() => listStamp(value)).refused)
      .map((value) => listStamp(value));

    expect(resolved).toContain('');
    expect(resolved.some((stamp) => stamp !== '')).toBe(true);
  });

  it('is driven over lists both accepted and refused', () => {
    const answers = ENDPOINT_LISTS.map(
      (value) => parseEndpointList({ endpoints: value }),
    );

    expect(answers.some((answer) => answer.endpoints.length > 0)).toBe(true);
    expect(answers.some((answer) => answer.rejected.length > 0)).toBe(true);
  });

  it('is driven over payloads read as envelopes and as bare', () => {
    const bare = BARE_PAYLOADS.map(
      (raw) => Object.keys(unwrapListPayload(raw).endpoint).length,
    );

    expect(bare.every((size) => size === 0)).toBe(true);
    expect(
      Object.keys(unwrapListPayload({
        record: { id: 1 },
        endpoint: { slug: 'alpha' },
      }).endpoint),
    ).toEqual(['slug']);
  });
});

describePortParity('paged-list — the keys the original renames', () => {
  it('reads exactly one config key, and reads it by that name', () => {
    const origin = originPagedList();
    const keys = discoverOriginKeys(origin);
    const underDiscovered = endpointListAnswer(
      origin.parseBoardList({ [keys.config]: 'alpha,bravo' }),
    );
    const underAnythingElse = endpointListAnswer(
      origin.parseBoardList({ 'a-key-nothing-reads': 'alpha,bravo' }),
    );

    expect(underDiscovered.list).toHaveLength(2);
    expect(underAnythingElse.list).toHaveLength(0);
  });

  it('reads two distinct envelope keys and one provenance key', () => {
    const keys = discoverOriginKeys(originPagedList());

    expect(keys.inner).not.toBe(keys.outer);
    expect(keys.provenance).not.toBe('item');
    expect([keys.config, keys.inner, keys.outer]
      .every((key) => key.length > 0)).toBe(true);
  });

  // Each side must REFUSE the other's envelope, or the rename is not
  // a rename and every envelope comparison below is comparing two
  // bare payloads and agreeing about nothing.
  it('reads an envelope in this port\'s key names as bare', () => {
    const origin = originPagedList();
    const keys = discoverOriginKeys(origin);
    const answer = unwrapAnswer(
      origin.unwrapBoardPayload({
        record: { id: 1 },
        endpoint: { slug: 'alpha' },
      }),
      keys.provenance,
    );

    expect(answer.provenance).toEqual({});
    expect(answer.item).toEqual({
      record: { id: 1 },
      endpoint: { slug: 'alpha' },
    });
  });

  it('reads an envelope in the original\'s key names as bare', () => {
    const keys = discoverOriginKeys(originPagedList());
    const envelope = { [keys.inner]: { id: 1 }, [keys.outer]: { slug: 'a' } };
    const answer = unwrapListPayload(envelope);

    expect(answer.endpoint).toEqual({});
    expect(answer.item).toEqual(envelope);
  });
});

describePortParity('paged-list — the cursor codec', () => {
  it('agrees over every stored cursor written for it', () => {
    const origin = originPagedList();
    const apart = CURSOR_TEXTS.flatMap((text) => compare(
      label(text),
      () => origin.parseBoardCursor(text),
      () => parseListCursor(text),
    ));

    expect(apart).toEqual([]);
  });

  // The exhaustive leg. One case, because the answer wanted is the
  // SET of strings that moved rather than the first one: a guard read
  // one character differently parts over a family.
  it('agrees over every short string the reader branches on', () => {
    const origin = originPagedList();
    const apart = enumerateCursorStrings().flatMap((text) => compare(
      label(text),
      () => origin.parseBoardCursor(text),
      () => parseListCursor(text),
    ));

    expect(apart).toEqual([]);
  });

  it('enumerates every string over its alphabet', () => {
    const strings = enumerateCursorStrings();
    const expected = [0, 1, 2, 3]
      .map((length) => CURSOR_ALPHABET.length ** length)
      .reduce((total, count) => total + count, 0);

    expect(strings.length).toBe(expected);
    expect(new Set(strings).size).toBe(expected);
    expect(strings).toContain('');
    expect(strings).toContain('{}');
  });

  it('agrees over every cursor on the way out', () => {
    const origin = originPagedList();
    const apart = CURSOR_MAPS.flatMap((map) => compare(
      label(map),
      () => origin.formatBoardCursor(map),
      () => formatListCursor(map),
    ));

    expect(apart).toEqual([]);
  });

  it('agrees over every adversarial value, either way through', () => {
    const origin = originPagedList();
    const apart = ADVERSARIAL_VALUES.flatMap((entry) => {
      const value = entry.build();

      return [
        ...compare(
          `${entry.id} read`,
          () => origin.parseBoardCursor(value),
          () => parseListCursor(value),
        ),
        ...compare(
          `${entry.id} written`,
          () => origin.formatBoardCursor(value),
          () => formatListCursor(value),
        ),
      ];
    });

    expect(apart).toEqual([]);
  });

  it('agrees over the round trip', () => {
    const origin = originPagedList();
    const apart = [...CURSOR_TEXTS, ...enumerateCursorStrings()]
      .flatMap((text) => compare(
        label(text),
        () => origin.formatBoardCursor(origin.parseBoardCursor(text)),
        () => formatListCursor(parseListCursor(text)),
      ));

    expect(apart).toEqual([]);
  });

  // The differ compares own keys and says nothing about prototypes,
  // so it reports these two answers as agreeing whatever either side
  // did. Compared directly, with an ordinary key as the control that
  // says the reading discriminates at all.
  it('agrees about the prototype an inherited key leaves behind', () => {
    const origin = originPagedList();
    const polluted = '{"__proto__":{"seen":"x","etag":"y"}}';
    const fromOrigin = origin.parseBoardCursor(polluted) as object;
    const fromPort = parseListCursor(polluted);

    expect(Object.keys(fromPort)).toEqual(Object.keys(fromOrigin));
    expect(Object.getPrototypeOf(fromPort)).not.toBe(Object.prototype);
    expect(Object.getPrototypeOf(fromOrigin)).not.toBe(Object.prototype);
    expect(Object.getPrototypeOf(parseListCursor('{"alpha":{"seen":"x"}}')))
      .toBe(Object.prototype);
  });

  it('agrees an inherited key is counted then serializes away', () => {
    const origin = originPagedList();
    const map = Object.fromEntries([['__proto__', { seen: 'x', etag: 'y' }]]);

    expect(formatListCursor(map)).toBe('{}');
    expect(origin.formatBoardCursor(map)).toBe('{}');
    expect(formatListCursor({ alpha: { seen: 'x' } }))
      .toBe('{"alpha":{"seen":"x"}}');
  });
});

describePortParity('paged-list — the stamp coercion', () => {
  it('agrees over every timestamp shape', () => {
    const origin = originPagedList();
    const apart = STAMPS.flatMap((value) => compare(
      label(value),
      () => origin.boardStamp(value),
      () => listStamp(value),
    ));

    expect(apart).toEqual([]);
  });

  it('agrees over every adversarial value', () => {
    const origin = originPagedList();
    const apart = ADVERSARIAL_VALUES.flatMap((entry) => {
      const value = entry.build();

      return compare(
        entry.id,
        () => origin.boardStamp(value),
        () => listStamp(value),
      );
    });

    expect(apart).toEqual([]);
  });
});

describePortParity('paged-list — the endpoint list', () => {
  it('agrees over every configured list', () => {
    const origin = originPagedList();
    const keys = discoverOriginKeys(origin);
    const apart = ENDPOINT_LISTS.flatMap((value) => compare(
      label(value),
      () => endpointListAnswer(
        origin.parseBoardList({ [keys.config]: value }),
      ),
      () => endpointListAnswer(parseEndpointList({ endpoints: value })),
    ));

    expect(apart).toEqual([]);
  });

  it('agrees over configs that are not objects', () => {
    const origin = originPagedList();
    const apart = BARE_CONFIGS.flatMap((value) => compare(
      label(value),
      () => endpointListAnswer(origin.parseBoardList(value)),
      () => endpointListAnswer(parseEndpointList(value)),
    ));

    expect(apart).toEqual([]);
  });

  it('agrees over every handle the name fallback reads', () => {
    const origin = originPagedList();
    const apart = SLUGS.flatMap((slug) => compare(
      label(slug),
      () => origin.slugToBoardName(slug),
      () => slugToEndpointName(slug),
    ));

    expect(apart).toEqual([]);
  });
});

describePortParity('paged-list — the stored payload', () => {
  it('agrees over every payload carrying no envelope', () => {
    const origin = originPagedList();
    const keys = discoverOriginKeys(origin);
    const apart = BARE_PAYLOADS.flatMap((raw) => compare(
      label(raw),
      () => unwrapAnswer(origin.unwrapBoardPayload(raw), keys.provenance),
      () => unwrapAnswer(unwrapListPayload(raw), 'endpoint'),
    ));

    expect(apart).toEqual([]);
  });

  it('agrees over every adversarial value', () => {
    const origin = originPagedList();
    const keys = discoverOriginKeys(origin);
    const apart = ADVERSARIAL_VALUES.flatMap((entry) => {
      const value = entry.build();

      return compare(
        entry.id,
        () => unwrapAnswer(origin.unwrapBoardPayload(value), keys.provenance),
        () => unwrapAnswer(unwrapListPayload(value), 'endpoint'),
      );
    });

    expect(apart).toEqual([]);
  });

  it('agrees over every envelope, each side in its own key names', () => {
    const origin = originPagedList();
    const keys = discoverOriginKeys(origin);
    const apart = ENVELOPE_INNERS.flatMap(
      (inner) => ENVELOPE_OUTERS.flatMap((outer) => compare(
        `${label(inner)} with ${label(outer)}`,
        () => unwrapAnswer(
          origin.unwrapBoardPayload({
            [keys.inner]: inner,
            [keys.outer]: outer,
          }),
          keys.provenance,
        ),
        () => unwrapAnswer(
          unwrapListPayload({ record: inner, endpoint: outer }),
          'endpoint',
        ),
      )),
    );

    expect(apart).toEqual([]);
  });

  it('walks every envelope pairing it declares', () => {
    expect(ENVELOPE_INNERS.length * ENVELOPE_OUTERS.length).toBe(36);
    expect(ENVELOPE_OUTERS).toContain(null);
    expect(ENVELOPE_INNERS.some((inner) => Object.keys(inner as object).length
      === 0)).toBe(true);
  });
});
