/**
 * Fail, flag and keep as ONE reading, over both registered adapters.
 *
 * The three words name three columns with three writers, and no
 * module in this package holds more than one of them. An adapter
 * produces a `CanonicalDocument`, which carries `documents.raw` and
 * deliberately carries neither `parse_status` nor `parse_error`.
 * `contractErrors` in `src/lib/parser-config.ts` judges a reading and
 * says nothing about a row. `sourceHealth` in
 * `src/lib/source-health.ts` moves four `sources` columns and never
 * sees a document. Each of those has its own case file, and none of
 * them can say what happens to a source whose payload stopped
 * matching its contract.
 *
 * That is what this file is for. It composes the three the way the
 * `ar-ingest` and `ar-capture` node groups will, and asserts the
 * composed answer:
 *
 * - KEEP — a divergence still produces a document, and that document
 *   still carries the record it was read from. The evidence is what
 *   a shape change is discovered from, so dropping it is how a source
 *   rotting stops being discoverable.
 * - FAIL — the same divergence makes `parse_status` `failed` and
 *   fills `parse_error` with sentences naming the member and the
 *   rule. Never the value: those sentences are stored in a column
 *   exports render, so a value quoted into one is untrusted content
 *   nobody sanitizes on the way out.
 * - FLAG — a run of those failures bumps `consecutive_failures` and
 *   trips `sources.flagged` on the pass that crosses the threshold,
 *   and not one pass earlier.
 *
 * ## Both adapters, over one corpus
 *
 * The two registered adapters reach a payload by opposite routes —
 * one opens a listing, one is posted to — and neither difference
 * survives into the reading a contract judges. So the corpus is
 * written once and each driver wraps it in the envelope its own
 * adapter takes. What that buys is the claim worth having: fail,
 * flag and keep are properties of the pipeline rather than of an
 * adapter, and an adapter registered later that quietly drops a
 * record fails here as well as beside itself.
 *
 * The roster is held against `listSourceIds()`, so a third adapter
 * cannot be registered and left undriven.
 *
 * ## House order, and what each guard stops
 *
 * The divergence entries come first, in the corpus and in the run.
 * Each of them breaks exactly one contract member, so a reading
 * answers exactly one sentence and that sentence is written out
 * here rather than read off the module — a suite reading the wording
 * off `parser-config.ts` would agree with any edit to it, which is
 * the one thing an operator scanning `parse_error` cannot afford.
 *
 * Every contract member is broken by some entry, asserted as a set:
 * a rule nothing breaks is a dead needle passing for coverage. And
 * the flag cases are driven off `CONSECUTIVE_FAILURE_THRESHOLD`
 * rather than off the number it currently holds, so re-tuning the
 * bound moves the cases with it.
 *
 * No case here calls `fetch`. The listing adapter is constructed
 * with the transport its own module exports for the purpose, which
 * rejects; the push adapter has no transport to give it and no
 * member that could reach anything.
 *
 * No word in this file is a term, a field or a source any domain
 * would use. The documents are bulletins about rainfall, which is
 * the shared corpus subject and no domain of ours.
 */
import type { DocumentParseStatus } from '../../src/db/schema/values.js';
import type { ParsedRecord } from '../../src/lib/parser-config.js';
import type {
  FetchOutcome,
  SourceHealthState,
  SourceMoment,
} from '../../src/lib/source-health.js';
import type {
  CanonicalDocument,
  SourceKind,
} from '../../src/sources/index.js';
import type { ListingApiPayload } from '../../src/sources/listing-api.js';
import type { PushCaptureRaw } from '../../src/sources/push-capture.js';

import { describe, expect, it } from 'vitest';

import { DOCUMENT_PARSE_STATUSES } from '../../src/db/schema/values.js';
import {
  contractErrors,
  parserConfigErrors,
} from '../../src/lib/parser-config.js';
import {
  CONSECUTIVE_FAILURE_THRESHOLD,
  sourceHealth,
} from '../../src/lib/source-health.js';
import { listSourceIds } from '../../src/sources/index.js';
import {
  BODY_FIELD as LISTING_BODY_FIELD,
  URL_FIELD as LISTING_URL_FIELD,
  createListingApi,
  refusingTransport,
} from '../../src/sources/listing-api.js';
import {
  BODY_FIELD as PUSH_BODY_FIELD,
  URL_FIELD as PUSH_URL_FIELD,
  createPushCapture,
} from '../../src/sources/push-capture.js';

// ---------------------------------------------------------------------------
// The row both adapters are constructed for
// ---------------------------------------------------------------------------

/** Where the invented catalogue these cases read is rooted. */
const CATALOGUE_BASE = 'https://catalogue.example.invalid';

/** The `sources` row both drivers are constructed for. */
const SOURCE_ROW_ID = 7;

/**
 * What a posted envelope claims its row is.
 *
 * Deliberately not {@link SOURCE_ROW_ID}. The column is taken from
 * the construction and the claim is kept as evidence, and a case
 * cannot tell those apart while the two agree.
 */
const CLAIMED_SOURCE_ID = 41;

/** When the posted capture says it was taken. */
const CAPTURED_AT = '2026-08-30T08:59:00Z';

/** Where the record keeps the place a document can be read at. */
const PERMALINK_PATH = 'permalink';

/** Where the record keeps the markup a document body is read from. */
const SUMMARY_PATH = 'summary';

/** The record member, and contract member, carrying a title. */
const HEADLINE_MEMBER = 'headline';

/** The record member, and contract member, carrying a date. */
const ISSUED_MEMBER = 'issued';

/** The record member, and contract member, carrying a quantity. */
const READINGS_MEMBER = 'readings';

/**
 * What both adapters call the `documents.url` member of a field map.
 *
 * Taken from one module and held equal to the other by the roster
 * guard below. The corpus can only be shared while the two agree:
 * a `sources.contract` names its members by field-map name, so one
 * contract over two spellings would report the whole of one
 * adapter reading as absent.
 */
const URL_FIELD = LISTING_URL_FIELD;

/** The same, for the member `documents.body` is taken from. */
const BODY_FIELD = LISTING_BODY_FIELD;

/**
 * The field map a record is read under, fresh per call so a case
 * reshaping one cannot reach the next.
 *
 * `readings` states `raw`, which is the one rule here that is not
 * ordinary. Every other type coerces, so a source sending text where
 * a number belongs would arrive as a well-formed reading of the
 * wrong thing and the contract would have nothing left to object
 * to. Read raw, the shape the source actually sent survives as far
 * as the check written to judge it.
 *
 * @returns The map, as a `parser_config` states one.
 */
function fieldMap(): Record<string, unknown> {
  return {
    [URL_FIELD]: { path: PERMALINK_PATH },
    [BODY_FIELD]: { path: SUMMARY_PATH, selector: 'article' },
    [HEADLINE_MEMBER]: { path: HEADLINE_MEMBER },
    [ISSUED_MEMBER]: { path: ISSUED_MEMBER },
    [READINGS_MEMBER]: { path: READINGS_MEMBER, type: 'raw' },
  };
}

/**
 * The `sources.contract` row both drivers are judged against.
 *
 * Four members, and the four are chosen so every fault the engine
 * can report about a record is reachable: a member that has to be
 * there, a member that has to be a shape, and two that have to match
 * an expression. Each corpus entry below breaks exactly one of them,
 * which is what makes a per-entry sentence COUNT assertable rather
 * than only its content.
 */
const CONTRACT = {
  fields: {
    [URL_FIELD]: {
      required: true,
      type: 'text',
      pattern: 'https://',
    },
    [HEADLINE_MEMBER]: { required: true, type: 'text' },
    [ISSUED_MEMBER]: {
      type: 'text',
      pattern: '^\\d{4}-\\d{2}-\\d{2}$',
    },
    [READINGS_MEMBER]: { type: 'number' },
  },
};

// ---------------------------------------------------------------------------
// The sentences a divergence answers, written out rather than read off
// ---------------------------------------------------------------------------

/**
 * What a contract answers for a member it required and the reading
 * did not take.
 *
 * Spelled here rather than imported, and that is the point rather
 * than a duplication. These sentences are what an operator reads in
 * `documents.parse_error`, so a case taking them off the module they
 * come from would agree with any edit to that module and report a
 * silent rewording as a pass.
 *
 * @param member - The contract member.
 * @returns The whole sentence.
 */
function requiredFault(member: string): string {
  return `member ${member} is required and no value was read`;
}

/**
 * What it answers for a member whose text does not match the
 * expression the contract declared.
 *
 * @param member - The contract member.
 * @returns The whole sentence.
 */
function patternFault(member: string): string {
  return `member ${member} does not match the declared pattern`;
}

/**
 * What it answers for a member read as something other than the
 * shape the contract declared.
 *
 * @param member - The contract member.
 * @param type - The shape the contract asked for.
 * @returns The whole sentence.
 */
function typeFault(member: string, type: string): string {
  return `member ${member} was not read as the declared type: ${type}`;
}

// ---------------------------------------------------------------------------
// The corpus, divergences first
// ---------------------------------------------------------------------------

/** One record, as a listing offers one and a client posts one. */
type CorpusRecord = Readonly<Record<string, unknown>>;

/** What one entry breaks, and what the contract says about it. */
interface Divergence {
  /** The contract member the record fails. */
  readonly member: string;

  /** The whole sentence the contract answers. */
  readonly fault: string;
}

/** One record, and what a contract makes of the reading it yields. */
interface CorpusEntry {
  /** How a case names it. */
  readonly id: string;

  /** What the record is, in one line. */
  readonly describes: string;

  /**
   * What the contract objects to, empty for the entry it accepts.
   *
   * At most one member per entry, which is what lets a case assert
   * the sentence LIST rather than only that it is non-empty: a
   * record breaking two rules would report two sentences and neither
   * of them would be pinned to the fault that was planted.
   */
  readonly diverges: readonly Divergence[];

  /** The record itself, exactly as it reaches an adapter. */
  readonly record: CorpusRecord;
}

/**
 * The record every entry below is a variation of: a bulletin whose
 * every member is what the contract asks for.
 *
 * Held as one object and spread into the variations, so an entry
 * differs from the accepted record in exactly the member its own id
 * names and a reader can see the whole difference on one line.
 */
const AGREEING_RECORD: CorpusRecord = {
  [PERMALINK_PATH]: `${CATALOGUE_BASE}/bulletins/4`,
  [SUMMARY_PATH]: '<article><p>Rainfall held   steady &amp; rose'
    + ' across the northern basin.</p></article>',
  [HEADLINE_MEMBER]: 'Rainfall bulletin four',
  [ISSUED_MEMBER]: '2026-08-30',
  [READINGS_MEMBER]: 12,
};

/**
 * The text the accepted record markup reduces to.
 *
 * Written out rather than derived from the record above, so a
 * markup step that answered nothing, or a reduction that stopped
 * decoding, has something to disagree with. Without it the selector
 * in the field map would be decorative: every entry would read an
 * empty body and every comparison between them would still agree.
 *
 * The record markup is written to make the reduction do all three
 * of its jobs, because a fragment it happens to pass through
 * unchanged is a step nothing here could tell from a missing one:
 * the inner tag has to be dropped, the entity decoded, and the run
 * of spaces collapsed.
 */
const AGREEING_BODY_TEXT =
  'Rainfall held steady & rose across the northern basin.';

/**
 * The record with its headline taken out.
 *
 * @returns The record, missing exactly that member.
 */
function withoutHeadline(): CorpusRecord {
  return {
    [PERMALINK_PATH]: AGREEING_RECORD[PERMALINK_PATH],
    [SUMMARY_PATH]: AGREEING_RECORD[SUMMARY_PATH],
    [ISSUED_MEMBER]: AGREEING_RECORD[ISSUED_MEMBER],
    [READINGS_MEMBER]: AGREEING_RECORD[READINGS_MEMBER],
  };
}

/**
 * Every record these cases are driven over, the diverging ones
 * first.
 *
 * That order is the plan house order and it is asserted below rather
 * than left to how the list happens to read: a divergence is what
 * this file is about, and a suite that reaches its refusals last is
 * one where an accepted reading has already decided the shared
 * fixtures.
 */
const CORPUS: readonly CorpusEntry[] = [
  {
    id: 'headline-absent',
    describes: 'a bulletin the source stopped titling',
    diverges: [
      { member: HEADLINE_MEMBER, fault: requiredFault(HEADLINE_MEMBER) },
    ],
    record: withoutHeadline(),
  },
  {
    id: 'issued-reworded',
    describes: 'a bulletin whose date arrived in another spelling',
    diverges: [
      { member: ISSUED_MEMBER, fault: patternFault(ISSUED_MEMBER) },
    ],
    record: { ...AGREEING_RECORD, [ISSUED_MEMBER]: '30 August 2026' },
  },
  {
    id: 'readings-as-text',
    describes: 'a bulletin whose count arrived as a word',
    diverges: [
      {
        member: READINGS_MEMBER,
        fault: typeFault(READINGS_MEMBER, 'number'),
      },
    ],
    record: { ...AGREEING_RECORD, [READINGS_MEMBER]: 'twelve' },
  },
  {
    id: 'permalink-without-scheme',
    describes: 'a bulletin linked by a bare path',
    diverges: [
      { member: URL_FIELD, fault: patternFault(URL_FIELD) },
    ],
    record: { ...AGREEING_RECORD, [PERMALINK_PATH]: '/bulletins/4' },
  },
  {
    id: 'agreeing',
    describes: 'a bulletin shaped the way the contract asks for',
    diverges: [],
    record: AGREEING_RECORD,
  },
];

/** The entries the contract objects to. */
const DIVERGING = CORPUS.filter((entry) => entry.diverges.length > 0);

/** The entries it accepts. */
const AGREEING = CORPUS.filter((entry) => entry.diverges.length === 0);

// ---------------------------------------------------------------------------
// What one document carries after the contract has read it
// ---------------------------------------------------------------------------

/**
 * What separates two sentences inside one `parse_error`.
 *
 * The column is text and a divergence can be several sentences, so
 * something has to join them. A semicolon and a space rather than a
 * newline, because the value is rendered inline by exports and a
 * newline there is a column that reads as several rows.
 */
const PARSE_ERROR_JOIN = '; ';

/** The status a document whose reading the contract accepted carries. */
const STATUS_OK: DocumentParseStatus = 'ok';

/** The status a divergence writes instead. */
const STATUS_FAILED: DocumentParseStatus = 'failed';

/**
 * One `documents` row, as a pass over one record would write it.
 *
 * The document is the adapter answer, unchanged. The other three
 * members are the contract answer turned into the columns the
 * adapter deliberately does not produce — which is where fail meets
 * keep, since the same divergence that sets the status is the reason
 * the row is worth storing at all.
 */
interface DocumentDecision {
  /** The canonical document, exactly as `toCanonical` answered it. */
  readonly document: CanonicalDocument;

  /** One sentence per contract divergence, in contract order. */
  readonly divergences: readonly string[];

  /** What `documents.parse_status` takes. */
  readonly parseStatus: DocumentParseStatus;

  /** What `documents.parse_error` takes, null when nothing failed. */
  readonly parseError: string | null;

  /** One sentence per step the engine could not take on this record. */
  readonly warnings: readonly string[];
}

/**
 * The decision one reading produces, given the document made from
 * it.
 *
 * Written here rather than in either adapter because it belongs to
 * neither: the two columns it fills are the contract answer, and an
 * adapter that produced them would be judging its own reading.
 *
 * `parse_error` is NULL and never the empty string for an accepted
 * reading, which is the column own rule: `''` is a value, and a
 * reader handed one renders a failure with no account of itself as
 * though the account had been read and was blank.
 *
 * @param fields - The reading, as the field map left it.
 * @param warnings - What the engine could not do while reading it.
 * @param document - What the adapter made of that reading.
 * @returns The row a writer would insert.
 */
function decisionFor(
  fields: ParsedRecord,
  warnings: readonly string[],
  document: CanonicalDocument,
): DocumentDecision {
  const divergences = contractErrors(fields, CONTRACT);

  return {
    document,
    divergences,
    parseStatus: divergences.length === 0
      ? STATUS_OK
      : STATUS_FAILED,
    parseError: divergences.length === 0
      ? null
      : divergences.join(PARSE_ERROR_JOIN),
    warnings,
  };
}

// ---------------------------------------------------------------------------
// The two adapters, as one thing to drive
// ---------------------------------------------------------------------------

/** One registered adapter, and how a pass reaches it. */
interface AdapterDriver {
  /** The registry key this adapter is registered under. */
  readonly id: string;

  /** The `sources.kind` every row it serves carries. */
  readonly kind: SourceKind;

  /** How a payload reaches it, in one line. */
  readonly describes: string;

  /** The `parser_config` its construction binds. */
  readonly parserConfig: Record<string, unknown>;

  /**
   * One pass: wrap these records the way this adapter takes them,
   * construct it, read them, and judge every reading.
   *
   * @param records - The records the source offered this pass.
   * @returns One decision per record, in payload order.
   */
  pass(records: readonly CorpusRecord[]): readonly DocumentDecision[];

  /**
   * The record a stored `documents.raw` was read from.
   *
   * Per adapter because the two store different evidence around the
   * same record: a listing keeps the entry as it arrived, and a push
   * capture keeps it beside the note describing how it was taken.
   * What both keep is the record, and that is what a case asserts.
   *
   * @param raw - Whatever the canonical document carried.
   * @returns The record inside it.
   */
  recordIn(raw: unknown): unknown;
}

/** Where the records sit inside a posted capture body. */
const CAPTURE_RECORDS_PATH = 'items';

/** The `parser_config` the listing driver binds. */
const LISTING_CONFIG: Record<string, unknown> = { fields: fieldMap() };

/** The `parser_config` the push driver binds. */
const PUSH_CONFIG: Record<string, unknown> = {
  recordsPath: CAPTURE_RECORDS_PATH,
  fields: fieldMap(),
};

/**
 * The listing driver: a cursor-paged listing that answered with
 * these records.
 *
 * Constructed with {@link refusingTransport}, which its own module
 * exports for exactly this. No case here calls `fetch`, and an
 * adapter that grew a request inside `parse` would be rejected
 * rather than reaching a network the default suite may not touch.
 */
const LISTING_DRIVER: AdapterDriver = {
  id: 'listing-api',
  kind: 'api',
  describes: 'a listing this service opened',
  parserConfig: LISTING_CONFIG,

  pass(records) {
    const adapter = createListingApi({
      endpoint: CATALOGUE_BASE,
      parserConfig: LISTING_CONFIG,
      sourceId: SOURCE_ROW_ID,
      transport: refusingTransport,
    });
    const payload: ListingApiPayload = {
      records,
      cursor: '',
      notes: [],
      pages: 1,
      requests: 1,
    };

    return adapter.parse(payload)
      .map((reading) => decisionFor(
        reading.fields,
        reading.warnings,
        adapter.toCanonical(reading),
      ));
  },

  recordIn(raw) {
    return raw;
  },
};

/**
 * The push driver: a client that posted these records inside one
 * versioned envelope.
 *
 * Constructed per capture rather than per row, which is this adapter
 * own lifetime rather than something these cases arrange: the
 * envelope binds at construction, so a second capture is a second
 * construction.
 */
const PUSH_DRIVER: AdapterDriver = {
  id: 'push-capture',
  kind: 'push',
  describes: 'a capture a client posted to this service',
  parserConfig: PUSH_CONFIG,

  pass(records) {
    const envelope = {
      version: 1,
      sourceId: CLAIMED_SOURCE_ID,
      capturedAt: CAPTURED_AT,
      provenance: { client: 'fail-flag-keep-case' },
      body: { [CAPTURE_RECORDS_PATH]: records },
    };
    const adapter = createPushCapture({
      envelope,
      parserConfig: PUSH_CONFIG,
      sourceId: SOURCE_ROW_ID,
    });

    return adapter.parse(envelope)
      .map((reading) => decisionFor(
        reading.fields,
        reading.warnings,
        adapter.toCanonical(reading),
      ));
  },

  recordIn(raw) {
    return (raw as PushCaptureRaw).record;
  },
};

/**
 * Every adapter these cases drive.
 *
 * Held against `listSourceIds()` below, so registering a third
 * adapter and leaving it undriven fails naming it rather than
 * quietly narrowing what this file covers.
 */
const DRIVERS: readonly AdapterDriver[] = [LISTING_DRIVER, PUSH_DRIVER];

// ---------------------------------------------------------------------------
// What one pass makes of the source health columns
// ---------------------------------------------------------------------------

/** When every pass in these cases happened. */
const PASS_AT = new Date('2026-08-30T09:00:00.000Z');

/** A source row nobody has fetched yet, as the defaults leave it. */
const NEVER_FETCHED: SourceHealthState = {
  consecutiveFailures: 0,
  lastSuccessAt: null,
  lastFailureAt: null,
  flagged: false,
};

/**
 * Whether one pass counts as a success for the source it read.
 *
 * A source that answered and answered with something its contract
 * refuses is a FAILURE here, which is the whole of the fail half:
 * the payload was retrieved, so nothing threw and nothing timed out,
 * and a health rule keyed on retrieval would report a rotted adapter
 * as working for as long as it kept rotting.
 *
 * A pass that produced no document at all is a failure too. An empty
 * answer is what a payload whose records moved somewhere the config
 * no longer names looks like, and it is exactly the reading a source
 * shape change produces before anybody notices.
 *
 * @param decisions - Every document the pass produced.
 * @param at - When the pass ran.
 * @returns The outcome, as `sourceHealth` takes one.
 */
function outcomeOf(
  decisions: readonly DocumentDecision[],
  at: SourceMoment,
): FetchOutcome {
  const parsed = decisions
    .every((decision) => decision.parseStatus === STATUS_OK);

  return { succeeded: decisions.length > 0 && parsed, at };
}

/**
 * The row after a run of identical passes over the same records.
 *
 * Each pass is driven for real rather than simulated: the outcome
 * comes out of the adapter and the contract, so a repair that
 * stopped a divergence being reported moves the flag as well as the
 * status.
 *
 * @param driver - Which adapter reads them.
 * @param records - What the source offered, every pass.
 * @param passes - How many passes to run.
 * @param from - The row the first pass starts from.
 * @returns The row the last pass would leave.
 */
function afterPasses(
  driver: AdapterDriver,
  records: readonly CorpusRecord[],
  passes: number,
  from: SourceHealthState,
): SourceHealthState {
  let state = from;

  for (let pass = 0; pass < passes; pass += 1) {
    state = sourceHealth(state, outcomeOf(driver.pass(records), PASS_AT));
  }

  return state;
}

// ---------------------------------------------------------------------------
// The roster, before anything is driven through it
// ---------------------------------------------------------------------------

describe('fail-flag-keep — the roster', () => {
  // The vacuity guard this whole file rests on. Registering a third
  // adapter and leaving it out of DRIVERS would narrow every claim
  // below without failing anything.
  it('drives every adapter the registry holds', () => {
    const driven = DRIVERS.map((driver) => driver.id)
      .sort();

    expect(driven).toEqual(listSourceIds());
  });

  // The corpus is shared between the drivers and a contract names
  // its members by field-map name, so one spelling has to serve
  // both. The adapters declare the pair separately on purpose; this
  // is where that separation is checked rather than assumed.
  it('finds both adapters spelling the two document members alike', () => {
    expect([PUSH_URL_FIELD, PUSH_BODY_FIELD])
      .toEqual([URL_FIELD, BODY_FIELD]);
  });

  // A config the engine refuses reads NO field, so every divergence
  // below would be a reading of nothing rather than of a record.
  it('builds a config the engine will run for every driver', () => {
    const refused = DRIVERS
      .filter((driver) => parserConfigErrors(driver.parserConfig).length > 0)
      .map((driver) => driver.id);

    expect(refused).toEqual([]);
  });

  // A contract member nothing breaks is a dead needle passing for
  // coverage. Asserted as a SET, so a rule added to the contract and
  // to no entry fails naming itself.
  it('breaks every member the contract declares', () => {
    const broken = Array
      .from(new Set(DIVERGING.flatMap(
        (entry) => entry.diverges.map((divergence) => divergence.member),
      )))
      .sort();

    expect(broken).toEqual(Object.keys(CONTRACT.fields).sort());
  });

  // The plan house order, as a property rather than as a fact about
  // how the list happens to read.
  it('orders every diverging entry before the one it accepts', () => {
    const first = CORPUS.findIndex((entry) => entry.diverges.length === 0);

    expect(first).toBe(DIVERGING.length);
    expect(AGREEING).toHaveLength(CORPUS.length - DIVERGING.length);
  });

  // Both statuses this file writes are members of the column own
  // domain, so a case cannot pin a string the CHECK would refuse.
  it('writes only statuses the documents column admits', () => {
    expect([...DOCUMENT_PARSE_STATUSES].sort())
      .toEqual([STATUS_FAILED, STATUS_OK].sort());
  });

  // The flag cases need room for a pass that does not flag. A
  // threshold of one would make "one short of the threshold" the
  // state before any pass ran, and the case would pass over a
  // detector that fires on the first failure.
  it('leaves room below the threshold for a pass that does not flag', () => {
    expect(CONSECUTIVE_FAILURE_THRESHOLD).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------
// Keep and fail, one record at a time, divergences first
// ---------------------------------------------------------------------------

/**
 * What `documents.parse_status` takes for one corpus entry.
 *
 * @param entry - The entry.
 * @returns The status a writer would set.
 */
function statusFor(entry: CorpusEntry): DocumentParseStatus {
  return entry.diverges.length === 0
    ? STATUS_OK
    : STATUS_FAILED;
}

/**
 * What `documents.parse_error` takes for one corpus entry.
 *
 * @param entry - The entry.
 * @returns The joined sentences, or null when nothing diverged.
 */
function errorFor(entry: CorpusEntry): string | null {
  return entry.diverges.length === 0
    ? null
    : entry.diverges.map((divergence) => divergence.fault)
      .join(PARSE_ERROR_JOIN);
}

/**
 * Whether a record leaves the two members a document is built from
 * exactly as the accepted record has them.
 *
 * Derived rather than declared per entry, so an entry added later
 * joins or stays out of the unchanged-document claim on its own.
 *
 * @param record - The entry record.
 * @returns Whether the document it produces should be the accepted
 *   one.
 */
function leavesDocumentAlone(record: CorpusRecord): boolean {
  return record[PERMALINK_PATH] === AGREEING_RECORD[PERMALINK_PATH]
    && record[SUMMARY_PATH] === AGREEING_RECORD[SUMMARY_PATH];
}

/**
 * The three members of a document that say what was captured, with
 * the evidence left out.
 *
 * `raw` is deliberately not here: it is the one member two records
 * differing in a member the contract judges legitimately differ in,
 * and comparing it would make the claim below about the corpus
 * instead of about the check.
 *
 * @param decision - Whatever a pass produced for one record.
 * @returns The three members, or null when no document was produced.
 */
function documentCore(decision?: DocumentDecision): unknown {
  if (decision === undefined) {
    return null;
  }

  return {
    hash: decision.document.hash,
    url: decision.document.url,
    body: decision.document.body,
  };
}

for (const driver of DRIVERS) {
  describe(`fail-flag-keep — ${driver.id} fails what diverges`, () => {
    for (const entry of CORPUS) {
      const verdict = entry.diverges.length === 0
        ? 'holds'
        : `diverges: ${entry.describes}`;

      // The whole decision per entry, so a claim about the status
      // cannot pass while the sentences beside it went missing. The
      // divergences are compared as a LIST rather than counted: an
      // entry breaking a second rule would answer a second sentence
      // and a count would not say which.
      it(`${verdict} (${entry.id})`, () => {
        const decisions = driver.pass([entry.record]);
        const decision = decisions[0];

        expect(decisions).toHaveLength(1);
        expect(decision?.divergences)
          .toEqual(entry.diverges.map((divergence) => divergence.fault));
        expect(decision?.parseStatus).toBe(statusFor(entry));
        expect(decision?.parseError).toBe(errorFor(entry));
      });
    }
  });

  describe(`fail-flag-keep — ${driver.id} keeps the evidence`, () => {
    for (const entry of DIVERGING) {
      // KEEP, asserted on IDENTITY rather than on shape. A document
      // whose raw came back as the same object is one nothing
      // rebuilt, reserialized or read a second time out of a
      // payload, which is what makes `documents.raw` a re-parse
      // rather than a re-fetch. The three members beside it are what
      // makes the row insertable: a failure this pipeline keeps is a
      // whole row and not a stub.
      it(`carries the record it could not read: ${entry.id}`, () => {
        const decision = driver.pass([entry.record])[0];

        expect(decision?.parseStatus).toBe(STATUS_FAILED);
        expect(driver.recordIn(decision?.document.raw)).toBe(entry.record);
        expect(decision?.document.sourceId).toBe(SOURCE_ROW_ID);
        expect(typeof decision?.document.hash).toBe('string');
        expect(typeof decision?.document.body).toBe('string');
      });
    }

    // The keep half in one sentence: the contract check does not
    // touch the document. Every entry whose record leaves the two
    // members a document is built from alone produces the same hash,
    // url and body as the reading the contract accepted, so a
    // divergence is a column beside the row and never a narrower
    // row.
    it('produces the document a divergence did not change', () => {
      const accepted = documentCore(driver.pass([AGREEING_RECORD])[0]);
      const unchanged = DIVERGING
        .filter((entry) => leavesDocumentAlone(entry.record))
        .map((entry) => documentCore(driver.pass([entry.record])[0]));

      expect(unchanged.length).toBeGreaterThan(0);
      expect(unchanged).toEqual(unchanged.map(() => accepted));
    });

    // The document is a READING and not a copy: its body is the text
    // inside the markup the record carried, which is where the
    // matcher and the reduction beside it are paired. The accepted
    // entry is what can say so, because a divergence leaves the two
    // document members alone by construction here.
    it('reads the document body through the paired markup step', () => {
      const decision = driver.pass([AGREEING_RECORD])[0];

      expect(decision?.parseStatus).toBe(STATUS_OK);
      expect(decision?.document.body).toBe(AGREEING_BODY_TEXT);
      expect(decision?.document.url)
        .toBe(AGREEING_RECORD[PERMALINK_PATH]);
    });

    // A pass reads every record it was offered, whatever the
    // contract makes of them. A reader that stopped at the first
    // divergence would drop the rest of the page, which is the one
    // failure mode a per-record case cannot see.
    it('reads every record a mixed payload offered', () => {
      const decisions = driver.pass(CORPUS.map((entry) => entry.record));
      const statuses = decisions.map((decision) => decision.parseStatus);

      expect(decisions).toHaveLength(CORPUS.length);
      expect(statuses).toEqual(CORPUS.map(statusFor));
    });
  });
}

// ---------------------------------------------------------------------------
// The member and the rule, never the value
// ---------------------------------------------------------------------------

/**
 * The stem every planted value is built around, assembled at run
 * time from fragments.
 *
 * Assembled rather than written whole so the string appears nowhere
 * in this file and nowhere in any module: a sentinel a module could
 * have been written against proves nothing about a template that
 * pastes a value into a sentence.
 */
const SENTINEL_STEM = ['zq', 'wv', 'xk'].join('');

/**
 * A planted value for one record member.
 *
 * @param member - Which record member it goes in.
 * @returns A value distinctive enough to find in a sentence.
 */
function sentinelFor(member: string): string {
  return `${SENTINEL_STEM}-${member}`;
}

/**
 * A record whose every member the contract judges is a planted
 * value, and whose headline is missing so the fourth rule fires too.
 *
 * @returns The record, breaking all four contract members at once.
 */
function sentinelRecord(): CorpusRecord {
  return {
    [PERMALINK_PATH]: sentinelFor(PERMALINK_PATH),
    [SUMMARY_PATH]: sentinelFor(SUMMARY_PATH),
    [ISSUED_MEMBER]: sentinelFor(ISSUED_MEMBER),
    [READINGS_MEMBER]: sentinelFor(READINGS_MEMBER),
  };
}

/**
 * Every sentence one decision would put in front of an operator.
 *
 * The joined `parse_error` is included beside the sentences it was
 * built from, because the column is what a leak would actually be
 * stored in and a join is one more place a template could reach.
 *
 * @param decision - Whatever a pass produced.
 * @returns Every sentence, in one list.
 */
function sentencesOf(decision?: DocumentDecision): readonly string[] {
  if (decision === undefined) {
    return [];
  }

  const stored = decision.parseError === null
    ? []
    : [decision.parseError];

  return [...decision.divergences, ...decision.warnings, ...stored];
}

/**
 * Which of a set of needles appear anywhere in a list of sentences.
 *
 * The second reader the no-echo claim needs: the boundary asserts
 * the sentence it MEANT to write, and a template pasting a value
 * into one satisfies every such assertion. This reads the output
 * instead, and shares nothing with the module that produced it.
 *
 * @param sentences - What the check answered.
 * @param needles - What may not appear in any of them.
 * @returns The needles that did appear, in the order given.
 */
function needlesIn(
  sentences: readonly string[],
  needles: readonly string[],
): readonly string[] {
  return needles.filter(
    (needle) => sentences.some((sentence) => sentence.includes(needle)),
  );
}

/** Every planted value the sentinel record carries, whole. */
const SENTINEL_VALUES = [
  PERMALINK_PATH,
  SUMMARY_PATH,
  ISSUED_MEMBER,
  READINGS_MEMBER,
].map((member) => sentinelFor(member));

for (const driver of DRIVERS) {
  describe(`fail-flag-keep — ${driver.id} names no value`, () => {
    // The control, run before the probe. A scanner that found
    // nothing in a planted sentence is a dead matcher, and its empty
    // answer over the real sentences would read exactly like a
    // boundary that quotes nothing.
    it('finds a planted value, and a truncated one, when present', () => {
      const whole = SENTINEL_VALUES.map(
        (value) => `member x carried ${value} and was refused`,
      );
      const truncated = [`member x carried ${SENTINEL_STEM} and was refused`];

      expect(needlesIn(whole, SENTINEL_VALUES)).toEqual(SENTINEL_VALUES);
      expect(needlesIn(truncated, [SENTINEL_STEM])).toEqual([SENTINEL_STEM]);
    });

    // What says the values were READ and judged rather than merely
    // posted: the payload answers a fault on each of the four
    // members, so every planted value reached the check written to
    // refuse it.
    it('answers a fault on every member the planted record breaks', () => {
      const decision = driver.pass([sentinelRecord()])[0];

      expect(decision?.parseStatus).toBe(STATUS_FAILED);
      expect(decision?.divergences).toEqual([
        patternFault(URL_FIELD),
        requiredFault(HEADLINE_MEMBER),
        patternFault(ISSUED_MEMBER),
        typeFault(READINGS_MEMBER, 'number'),
      ]);
    });

    // The whole values, which say WHICH member leaked, and the stem,
    // which catches a truncated echo the whole values would miss.
    it('quotes no planted value and no part of one', () => {
      const sentences = sentencesOf(driver.pass([sentinelRecord()])[0]);

      expect(sentences.length).toBeGreaterThan(0);
      expect(needlesIn(sentences, SENTINEL_VALUES)).toEqual([]);
      expect(needlesIn(sentences, [SENTINEL_STEM])).toEqual([]);
    });

    // The document is the other half of the same rule and runs the
    // other way: `documents.url` carries what the source sent,
    // because it is the source own content in a column meant for it.
    // Only the sentences are bound by the no-echo rule.
    it('keeps the planted value in the document it stored', () => {
      const decision = driver.pass([sentinelRecord()])[0];

      expect(decision?.document.url).toBe(sentinelFor(PERMALINK_PATH));
    });
  });
}

// ---------------------------------------------------------------------------
// The flag, and the pass that does not set it
// ---------------------------------------------------------------------------

/**
 * The records a failing pass reads, and the records a passing one
 * does.
 *
 * One diverging entry rather than the whole corpus, because what a
 * flag case is about is a run of passes rather than a page: a mixed
 * payload would make the outcome depend on how the pass counts a
 * page that was partly readable, which is a separate decision with
 * its own case above.
 */
const FAILING_RECORDS: readonly CorpusRecord[] = DIVERGING
  .slice(0, 1)
  .map((entry) => entry.record);

/** The records the contract accepts. */
const PASSING_RECORDS: readonly CorpusRecord[] = [AGREEING_RECORD];

for (const driver of DRIVERS) {
  describe(`fail-flag-keep — ${driver.id} flags a run of failures`, () => {
    // Everything the flag cases rest on. A corpus whose divergences
    // stopped being reported would make every state below the state
    // a healthy source reaches, and each of those cases would still
    // pass on the counter alone.
    it('reads divergence as a failure and agreement as a success', () => {
      const failing = outcomeOf(driver.pass(FAILING_RECORDS), PASS_AT);
      const passing = outcomeOf(driver.pass(PASSING_RECORDS), PASS_AT);

      expect(FAILING_RECORDS).toHaveLength(1);
      expect(failing.succeeded).toBe(false);
      expect(passing.succeeded).toBe(true);
    });

    // One pass short of the bound. Driven off the constant rather
    // than off the number it currently holds, so re-tuning the
    // threshold moves this case with it.
    it('leaves the flag down one pass short of the threshold', () => {
      const state = afterPasses(
        driver,
        FAILING_RECORDS,
        CONSECUTIVE_FAILURE_THRESHOLD - 1,
        NEVER_FETCHED,
      );

      expect(state).toStrictEqual({
        consecutiveFailures: CONSECUTIVE_FAILURE_THRESHOLD - 1,
        lastSuccessAt: null,
        lastFailureAt: PASS_AT,
        flagged: false,
      });
    });

    // The pass that crosses it. `last_success_at` stays null through
    // the whole run, which is what tells a source that has never
    // worked from one that worked last week.
    it('raises the flag on the pass that crosses the threshold', () => {
      const state = afterPasses(
        driver,
        FAILING_RECORDS,
        CONSECUTIVE_FAILURE_THRESHOLD,
        NEVER_FETCHED,
      );

      expect(state).toStrictEqual({
        consecutiveFailures: CONSECUTIVE_FAILURE_THRESHOLD,
        lastSuccessAt: null,
        lastFailureAt: PASS_AT,
        flagged: true,
      });
    });

    // A source that starts working again resets the counter to a
    // real zero and leaves the flag standing. Clearing it is an
    // operator act, because a run of failures stopping is also what
    // a cached page and an empty result set look like.
    it('resets the counter on a pass the contract accepts', () => {
      const flagged = afterPasses(
        driver,
        FAILING_RECORDS,
        CONSECUTIVE_FAILURE_THRESHOLD,
        NEVER_FETCHED,
      );
      const state = afterPasses(driver, PASSING_RECORDS, 1, flagged);

      expect(flagged.flagged).toBe(true);
      expect(state).toStrictEqual({
        consecutiveFailures: 0,
        lastSuccessAt: PASS_AT,
        lastFailureAt: PASS_AT,
        flagged: true,
      });
    });

    // A source that answers a payload it reads perfectly well never
    // reaches the bound, whatever the threshold is tuned to. The
    // control for the three cases above, which would all pass over a
    // detector that flagged on every outcome there is.
    it('never flags a source whose passes the contract accepts', () => {
      const state = afterPasses(
        driver,
        PASSING_RECORDS,
        CONSECUTIVE_FAILURE_THRESHOLD + 1,
        NEVER_FETCHED,
      );

      expect(state).toStrictEqual({
        consecutiveFailures: 0,
        lastSuccessAt: PASS_AT,
        lastFailureAt: null,
        flagged: false,
      });
    });

    // The answer names four `sources` columns and no fifth. There is
    // no `enabled` here and there never may be: a caller UPDATE is
    // built from exactly the members the answer holds, so a column
    // mentioned is a column somebody eventually writes, and
    // `enabled` is an operator own.
    it('answers the four health columns and no other', () => {
      const state = afterPasses(driver, FAILING_RECORDS, 1, NEVER_FETCHED);

      expect(Object.keys(state).sort()).toEqual([
        'consecutiveFailures',
        'flagged',
        'lastFailureAt',
        'lastSuccessAt',
      ]);
    });
  });
}
