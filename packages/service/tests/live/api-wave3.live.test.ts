/**
 * The findings and documents stores driven against a real Postgres,
 * through the real migrations. The findings half: a domain with five
 * findings written in an order that is neither the digest order nor
 * its reverse, that order answered by a real `ORDER BY` with an
 * unscored finding last, the same order with the score key gone, the
 * verdict in force over a finding re-judged twice, a ruling appended
 * beside the one it followed, and the jsonb read that files a
 * finding under a category. The documents half: a stored control
 * byte answered as an escape, a body cut at the shared cap, and the
 * one member of the masked class a `text` column cannot hold.
 * Self-skips when AR_LIVE_DATABASE_URL is unset — run via:
 *
 *   bun run stress:start && bun run test:live && bun run stress:stop
 *
 * WHAT ONLY A SERVER CAN ANSWER is why this file is worth its
 * container, and it is not the rules. Every decision either surface
 * takes — the 404 for an unknown slug, the empty page for a category
 * key nobody declared, the 422 for an inverted window — is a
 * decision about rows, and `tests/helpers/memory-research-store.ts`
 * supplies rows with no database, so all of it is already pinned by
 * the service and routes suites under `src/findings/` and
 * `src/documents/`. What is left is the half those suites
 * structurally cannot reach: every operation below is SQL, and a
 * statement that is valid drizzle and invalid SQL passes `lint`,
 * `check-types` and the entire isolated suite. A projection naming a
 * column the migration never created, an `ORDER BY` that lost its
 * nulls qualifier, a `DISTINCT ON` reading the wrong row, a `->>`
 * against a member that is not text, a `WHERE` that stopped
 * narrowing — each is reported here and nowhere else.
 *
 * NINE READINGS BELOW ARE THINGS AN IN-MEMORY MAP CANNOT DO, which
 * is the same argument put sharply enough to be checkable.
 *
 * THE ORDER IS A REAL `ORDER BY` AND THE COMPARATOR IS A SECOND
 * DERIVATION OF IT. `findingOrder` in `src/findings/db-store.ts` is
 * `compareFindings` from `src/lib/digest-assemble.ts` expressed in
 * SQL, and the two are held against each other here by sorting the
 * rows the server answered with `orderFindings` and comparing the
 * lists. That is one rule checked from two sides rather than an
 * assertion against a page written out by hand — and only a server
 * can supply the first side, a library sorting objects being unable
 * to order a `LIMIT`ed read at all.
 *
 * AN ABSENT SCORE SORTS LAST AND NOT LOWEST, which is a `NULLS LAST`
 * on a descending key rather than a comparator branch. Postgres puts
 * nulls FIRST for `DESC` unless told otherwise, so the finding
 * nobody scored is the first row of a page whose store dropped that
 * qualifier — an inversion no type reports, that every isolated
 * suite is green through, and that puts an unranked finding at the
 * head of a ranking.
 *
 * THE TIEBREAKS ARE PLANTED SO THAT EACH KEY DISAGREES WITH THE ONE
 * BENEATH IT, without which a dropped key answers the right page for
 * the fixture's reasons rather than the store's. The two findings
 * scored alike and made at one instant are planted lower-id-first,
 * so the `id` key REVERSES the plant order; and the two scored alike
 * at different instants are planted newest-first, so the newer of
 * them carries the LOWER id and the `created_at` key answers one row
 * where the `id` key beneath it answers the other.
 *
 * THE SECOND DOMAIN MAKES EVERY READING A SCOPE READING TOO. Its one
 * finding is scored, stamped, filed and judged so that it sorts into
 * the MIDDLE of the subject domain's page under both orderings, sits
 * inside the window the boundary case takes, carries the category
 * key that case asks for, and holds the verdict the filter case
 * asks for. A `WHERE domain_id = $1` that stopped narrowing
 * therefore answers a row of the right shape in every one of them,
 * where a fixture with one domain is green either way.
 *
 * THE LATEST VERDICT IS A `DISTINCT ON` AND THE COMPARISON SITS
 * OUTSIDE IT. A finding ruled three ways in turn is matched by the
 * third and by neither of the first two, and the MIDDLE ruling is
 * what separates the two shapes a reader confuses: a subquery
 * pushing the verdict comparison inside answers the finding under
 * every verdict it ever carried, and one that lost its ordering
 * answers whichever row the scan reached. The finding ruled once is
 * the in-band positive control — the zero for the re-judged one
 * under its old verdict is read beside a non-empty page the same
 * call produced.
 *
 * THE RULING STAMP IS THE TRANSACTION'S AND THAT IS WHY `id` IS
 * BESIDE IT. `labelled_at` defaults to `now()`, which is the
 * transaction's start rather than the row's, so two rulings written
 * inside ONE transaction carry a single value between them and `id`
 * is the only thing separating them. This file plants that tie the
 * way a deployment makes it, and for a read whose whole answer is
 * the FIRST row it is the difference between a verdict and a coin
 * flip. No map can be made to produce it: two objects appended to a
 * list carry whatever clock the fake read, twice.
 *
 * `fields->>'category'` YIELDS TEXT, AND THE MEMBER THIS FILE PLANTS
 * AS A NUMBER IS WHAT SAYS SO. A store comparing only string members
 * answers an empty page where the server answers the row, because
 * `->>` renders a numeric member as its digits — so the finding
 * filed under the number is matched by the STRING of it. Two more
 * rows carry the two absences that read alike in JavaScript and both
 * come back SQL NULL here: one whose payload has no such member at
 * all, and one whose member holds the JSON null. Neither matches any
 * key a caller can name, which is a three-valued reading a map
 * comparing values has no third value to be wrong about.
 *
 * THE WINDOW IS HALF-OPEN AND BOTH ENDS ARE PLANTED ON. A finding
 * made at exactly the lower bound is IN and one made at exactly the
 * upper bound is OUT, so a store writing `<=` on the upper is
 * reported by the row it takes and a store writing `>` on the lower
 * by the row it drops. Both bounds are instants the fixture chose
 * rather than a clock's, and both carry a non-zero millisecond
 * component: a column at second resolution, or a store rounding on
 * the way through, moves a boundary row across the seam that two
 * adjacent windows share.
 *
 * A `text` COLUMN CANNOT HOLD U+0000 AND THE DRIVER CANNOT CARRY A
 * LONE SURROGATE, so two of the four classes `maskControlBytes` in
 * `src/http/control-bytes.ts` covers are UNREACHABLE through
 * `documents.body` and the other two are not. That is the reading
 * this half exists for and it is available nowhere else: the masker
 * is a pure function and its colocated suite hands it every class
 * directly, where what a stored body can actually carry is a fact
 * about the server and the wire between them. Measured rather than
 * assumed — a C0 control, DEL and a C1 control each round-trip
 * byte-identically and come back as escapes, a NUL is refused with
 * SQLSTATE 22021 before any row lands, and a lone surrogate is
 * stored as U+FFFD, replaced on the way out of this process rather
 * than refused. The scoped task this file was written for asked for
 * a body holding a raw NUL read back masked and cut; the nearest
 * true thing is the pair of cases below, and saying which of the two
 * was delivered is part of delivering it.
 *
 * THE CUT AND THE MASK ARE READ FROM BOTH SIDES OF ONE STORE. The
 * row as `DocumentStore.listDocuments` answers it is UNMASKED and
 * UNCUT, per that port, and the row `listDocuments` in
 * `src/documents/service.ts` answers is neither — so the same
 * planted body is read twice through one connection, and the zero
 * the second reading counts is about the value the first counted as
 * a one. An in-memory store can host neither end: it has no column
 * under its answer, and a fake that masked would agree with itself.
 *
 * THE THREE NUMBERS A CUT BODY CARRIES ARE DISTINCT HERE ON PURPOSE.
 * A body that is entirely ASCII makes the stored BYTES, the stored
 * CODE POINTS and the bytes of the KEPT text one number, and two of
 * the three wrong answers pass. The over-cap body is the at-cap body
 * plus a single two-byte character, so the three read one above the
 * other against a cap the fixture never transcribes — and the kept
 * text is the at-cap body ITSELF, which one comparison reads the
 * flag, the byte count and the retained text through. The at-cap
 * body carries a mark at each END, because a run of one repeated
 * character equals every slice of itself and a cap comparison that
 * slipped by one takes a character nothing can see going.
 *
 * THE CAP IS DERIVED AND NEVER TRANSCRIBED. Both bodies are built
 * from `BODY_CODE_POINT_CAP`, which is what exporting it is for: a
 * literal plant goes on reading as `past the cap` after the cap
 * moves above it, and the case then answers nothing while staying
 * green.
 *
 * NO METHOD ON EITHER PORT WRITES A FINDING OR A DOCUMENT, which is
 * the read-first law stated structurally, so every fixture row below
 * a ruling is planted through drizzle directly. That is the plainest
 * demonstration of the containment there is, and it is the same
 * reason `tests/live/api-wave2.live.test.ts` reaches `documents`
 * itself. The one exception is `insertFindingLabel`, the single
 * write either port declares.
 *
 * EVERY CASE PLANTS EVERYTHING IT READS and `resetTables` in the
 * `beforeEach` empties the tables between them, so a row surviving
 * a case would make some later assertion true for a reason nobody
 * wrote. The first case reads that emptiness through the stores
 * rather than through SQL, so a table missing from the `TABLES`
 * roster in `./live-postgres.ts` — a fault that leaves `lint`,
 * `check-types` and the whole live run green while leaking rows —
 * is reported here too.
 *
 *
 * NINETEEN MUTATIONS WERE RUN AGAINST THESE NINE CASES, each leg
 * twice, every leg collecting all nine and every red set identical
 * across the two passes. Twelve patch `src/findings/db-store.ts`,
 * two `src/documents/db-store.ts` and three
 * `src/documents/service.ts`; none reddened nothing. The figures are
 * a measurement over this case list and nothing else, so a task
 * adding a case here owes the legs its own cases can REACH rather
 * than inheriting any of them.
 *
 * EVERY ORDERING LEG IS TOLD APART BY THE ASSERTION IT FAILS rather
 * than by its count, which is the shape a page read whole produces.
 * Dropping `NULLS LAST` from the score key and reversing that key
 * each redden the digest case alone; dropping the `id` tiebreak and
 * ignoring the sort parameter each redden the digest case and the
 * recency one; and dropping the `created_at` key reddens those two
 * AND the window case, whose page is read in the recency order. Read
 * the SET and attribute each member to the claim it is about — the
 * third of those is not drift.
 *
 * THE TWO VERDICT LEGS ARE TWO DIFFERENT WRONG ANSWERS AND ONE CASE.
 * Pushing the comparison inside the `DISTINCT ON` answers the
 * re-judged finding under every verdict it ever carried, and
 * ordering that subquery ascending answers it under its first — both
 * one of nine, and the middle ruling is what separates them from a
 * store that is merely right.
 *
 * THE SCOPE LEG IS THE BLUNTEST IN THE GRID AND ITS SET IS THE
 * COVERAGE READING. Dropping the domain equality from the findings
 * predicate reddens five of nine: every case that reads a page,
 * leaving the empty-database case and the two documents cases, which
 * is exactly the partition the second domain was planted to produce.
 * The corpus scope leg reddens one, there being one documents case
 * that plants a second domain at all.
 *
 * THE APPEND CASE IS PINNED BY THREE LEGS AND NO TWO OF THEM ARE THE
 * SAME CLAIM: deleting the row a repeat ruling would replace, having
 * the write answer an object rebuilt from its argument, and dropping
 * the `id` tiebreak from the ruling read. Each reddens that case
 * alone, and the third is what the transaction-made tie is for.
 *
 * THE DOCUMENTS HALF IS PINNED BY FIVE, all landing on the mask-and-
 * cut case: the corpus order, the corpus scope, masking BEFORE
 * cutting, counting the KEPT text as `bodyBytes`, and answering the
 * parse error unmasked. The pass-order leg is live only because that
 * case asserts `bodyTruncated` FALSE over a body with something to
 * mask — `maskControlBytes` is idempotent, so what a wrong order
 * moves is the flag and not the text.
 *
 * WHAT NO LEG HERE REACHES, said rather than left to be inferred.
 * The refusal the NUL case reads is the SERVER's, so nothing in this
 * package can be edited to stop it being raised; the same is true of
 * the driver's surrogate replacement, of `documents_hash_unique` and
 * of every `ON DELETE` in the schema, each of which is declared in a
 * migration whose breakage fails `applyMigrations` and takes the
 * whole file down rather than reddening a case.
 *
 * THE HELPERS THROW RATHER THAN ASSERT, on the terms the sibling
 * live files state: a fixture that answered nothing leaves every
 * assertion below it about nothing, and a failure raised by a helper
 * names the read that raised it. That does not extend to a case's
 * own assertion failures and nothing here re-wraps one.
 */
import type { DocumentStore } from '../../src/documents/store.js';
import type { DomainRecord, DomainStore } from '../../src/domains/store.js';
import type {
  FindingFilter,
  FindingRecord,
  FindingStore,
} from '../../src/findings/store.js';
import type { StoreWindow, TimeWindow } from '../../src/http/schemas.js';
import type { Pool } from 'pg';

import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';

import { documents, findingLabels, findings } from '../../src/db/schema.js';
import { createDbDocumentStore } from '../../src/documents/db-store.js';
import { listDocuments } from '../../src/documents/service.js';
import { createDbDomainStore } from '../../src/domains/index.js';
import { createDbFindingStore } from '../../src/findings/db-store.js';
import {
  BODY_CODE_POINT_CAP,
  maskControlBytes,
} from '../../src/http/control-bytes.js';
import { orderFindings } from '../../src/lib/digest-assemble.js';

import {
  applyMigrations,
  createLiveDb,
  createLivePool,
  describeLivePg,
  resetTables,
} from './live-postgres.js';

/**
 * The slug the subject domain sits under.
 *
 * `example-tech-radar` is the seeded worked example, so this fixture
 * stays in the register `data/domains.json` set: neutral about the
 * subject, and recognisable as an example rather than as anybody's
 * deployment. The two sibling live API files plant under the same
 * slug and the three never meet — every case in all of them
 * truncates first.
 */
const RADAR = 'example-tech-radar';

/** Its operator-facing label. */
const RADAR_NAME = 'Radar';

/**
 * The slug the SCOPE control sits under.
 *
 * Every reading below is taken over {@link RADAR} while this domain
 * holds one finding and one document arranged to be answered by any
 * statement that stopped narrowing.
 */
const TRANSIT = 'example-urban-transit';

/** Its operator-facing label. */
const TRANSIT_NAME = 'Transit';

/**
 * A window wide enough to hold every collection this file plants.
 *
 * The ordering cases want the WHOLE page, an order being unreadable
 * through a window narrower than the rows it ranks. What a `LIMIT`
 * and an `OFFSET` that stopped working cost is pinned one file over,
 * on collections planted for it.
 */
const WHOLE: StoreWindow = { limit: 50, offset: 0 };

/**
 * The window that names no bound at all.
 *
 * `{ sinceInclusive: null, untilExclusive: null }` rather than an
 * omitted member, per {@link FindingFilter}: the member is required
 * and `null` is what unbounded is spelled as, so a store branching
 * on `!== null` has two states rather than three.
 */
const UNBOUNDED: TimeWindow = {
  sinceInclusive: null,
  untilExclusive: null,
};

/**
 * An instant `seconds` into the minute every finding is stamped in.
 *
 * Built with `Date.UTC` and NEVER by parsing a stamp, so no
 * expectation here is derived through the same reader the store
 * uses. The month argument is zero-based, so `8` is September.
 *
 * THE MILLISECOND COMPONENT IS NON-ZERO ON PURPOSE. A column at
 * second resolution, or a store rounding on the way through, answers
 * these instants with that component gone — and a boundary row then
 * crosses the seam two adjacent windows share while every other
 * assertion still reads correct.
 *
 * @param seconds - Where in the minute to sit.
 * @returns The instant.
 */
function at(seconds: number): Date {
  return new Date(Date.UTC(2026, 8, 1, 12, 0, seconds, 457));
}

/** The instant the newer of the two findings scored alike has. */
const LATE = at(40);

/** The instant the two findings scored alike at one moment carry. */
const MIDDLE = at(30);

/** The instant the unscored finding has, and the window floor. */
const EARLY = at(20);

/** The instant the oldest finding has, below that floor. */
const EARLIEST = at(10);

/** The scope control instant: inside every window here. */
const OTHER_AT = at(35);

/** The higher of the two scores this domain findings carry. */
const HIGH_SCORE = 0.9;

/** The lower, carried by two findings at different instants. */
const LOW_SCORE = 0.5;

/** The scope control's score, between the two above under either. */
const OTHER_SCORE = 0.7;

/** The category key two findings are filed under, one per domain. */
const MODELS = 'models';

/** The key exactly one finding of that domain is filed under. */
const INFRA = 'infra';

/**
 * A category member stored as a NUMBER rather than as a string.
 *
 * `fields->>'category'` yields TEXT, so this member is matched by
 * the STRING of it and a store comparing only string members answers
 * an empty page where the server answers the row.
 */
const NUMERIC_CATEGORY = 4;

/** That member as `->>` renders it, and as the filter is sent it. */
const NUMERIC_KEY = String(NUMERIC_CATEGORY);

/** A category key no finding here is filed under. */
const UNDECLARED = 'governance';

/** The first ruling the re-judged finding carried. */
const FIRST_VERDICT = 'interested';

/** The second, which no filter must answer that finding under. */
const MIDDLE_VERDICT = 'caution';

/** The third, and the one in force. */
const LATEST_VERDICT = 'avoid';

/** A member of the default vocabulary no ruling here carries. */
const UNUSED_VERDICT = 'neutral';

/** What the first ruling of the append case records. */
const FIRST_NOTE = 'read it as a launch';

/** What the second records, the verdict being unchanged. */
const SECOND_NOTE = 'and the launch slipped';

/** Builds one character from its code point. */
const charFrom = String.fromCharCode;

/**
 * A C0 control other than NUL, planted inside a stored body.
 *
 * BUILT FROM ITS CODE POINT rather than written as a literal,
 * because a control character in a tracked source file makes
 * `git diff` render the file as binary and makes POSIX grep report
 * no match for text that is present — both silently, and both the
 * exact failure `gate:control-bytes` exists to keep out of the tree.
 */
const BELL = charFrom(0x07);

/** DEL, which is masked and is neither C0 nor C1. */
const DEL = charFrom(0x7f);

/** A C1 control: TWO UTF-8 bytes where the others are one. */
const NEL = charFrom(0x85);

/**
 * U+0000, the one member of the masked class a `text` column
 * refuses.
 *
 * Never reaches a row: the insert planting it is refused by the
 * server, which is what the case below reads.
 */
const NUL = charFrom(0x00);

/** A lone high surrogate: the driver replaces it on the way out. */
const LONE_SURROGATE = charFrom(0xd800);

/** What a lone surrogate is stored as, having been replaced. */
const REPLACEMENT = charFrom(0xfffd);

/**
 * A two-byte character, and the whole of the over-cap body's
 * overshoot.
 *
 * ONE UTF-16 UNIT AND TWO UTF-8 BYTES, which is what makes the three
 * numbers a cut body carries distinct without an astral fixture and
 * without any surrogate arithmetic: the stored bytes exceed the
 * stored code points, which exceed the code points kept.
 */
const TWO_BYTE = charFrom(0x00e9);

/** The mark the at-cap body opens with. */
const BODY_HEAD = 'S';

/** The mark it closes with, so a cut of one character is visible. */
const BODY_TAIL = 'E';

/** The filler between them. */
const BODY_FILL = 'x';

/**
 * A body of exactly {@link BODY_CODE_POINT_CAP} code points, marked
 * at both ends.
 *
 * DERIVED FROM THE CAP AND NEVER TRANSCRIBED, which is what
 * exporting that constant is for: a literal plant goes on reading as
 * an at-cap body after the cap moves, and the case then answers
 * nothing while staying green.
 *
 * The marks are what a run of one repeated character cannot supply.
 * Such a run equals every slice of itself, so a comparison that
 * slipped by one takes a character nothing can see going.
 */
const AT_CAP_BODY = BODY_HEAD
  + BODY_FILL.repeat(BODY_CODE_POINT_CAP - 2)
  + BODY_TAIL;

/**
 * The at-cap body plus one code point, which the cut must answer as
 * the at-cap body ITSELF.
 *
 * One comparison then reads the flag, the retained text and the byte
 * count through a single equality, where two separately built
 * fixtures only ever read lengths.
 */
const OVER_CAP_BODY = AT_CAP_BODY + TWO_BYTE;

/** A short body carrying one control byte of each stored class. */
const MARKED_BODY = 'A' + BELL + DEL + NEL + 'Z';

/** What a writer recorded about the capture that would not parse. */
const MARKED_ERROR = 'gave up at' + BELL + 'the head';

/**
 * The SQLSTATE Postgres raises for a byte no encoding can carry.
 *
 * `character_not_in_repertoire`, and NOT one of the three
 * `classifyPgError` in `src/db/store-errors.ts` maps — so this
 * refusal crosses as the driver error drizzle wrapped rather than as
 * a `StoreRefusal`, which is what the case reads it off.
 */
const ENCODING_VIOLATION = '22021';

/** The parse status a capture that read cleanly carries. */
const PARSED = 'ok';

/** The parse status a capture that did not carries. */
const UNPARSED = 'failed';

/**
 * The value a live read was supposed to answer.
 *
 * @param value - Whatever the read answered.
 * @param read - What was being read, quoted back in the refusal.
 * @returns The value, without the `null` the port declares.
 * @throws Error When the read answered null.
 */
function present<T>(value: T | null, read: string): T {
  if (value === null) {
    throw new Error(
      `[wave3-live] reading ${read} answered null, so every assertion `
      + 'below it would be about nothing.',
    );
  }

  return value;
}

/**
 * The first row of a read, without the `undefined`
 * `noUncheckedIndexedAccess` gives an index access.
 *
 * @param rows - Whatever the read answered.
 * @param read - What was being read, quoted back in the refusal.
 * @returns Its first row.
 * @throws Error When the read answered no row at all.
 */
function oneRow<T>(rows: readonly T[], read: string): T {
  const [row] = rows;

  if (row === undefined) {
    throw new Error(
      `[wave3-live] reading ${read} answered no row, so every `
      + 'assertion below it would be about nothing.',
    );
  }

  return row;
}

/**
 * The ids of a page, in the order it answered them.
 *
 * @param rows - The page.
 * @returns Its ids, order preserved.
 */
function idsOf(
  rows: readonly { readonly id: number }[],
): readonly number[] {
  return rows.map((row) => row.id);
}

/**
 * How many times a needle occurs in some text.
 *
 * A count rather than a boolean, so a zero can be read beside a
 * known positive taken by the same function in the same case.
 *
 * @param haystack - The text to search.
 * @param needle - The string to count.
 * @returns The number of occurrences.
 */
function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

/**
 * The five findings the subject domain carries, and the one the
 * scope control does.
 *
 * Named rather than inlined so the plant helper has a return type
 * the cases can be held against.
 */
interface PlantedFindings {
  /** The subject domain. */
  readonly domain: DomainRecord;

  /** The scope control, whose one finding sorts into the middle. */
  readonly other: DomainRecord;

  /** Scored low, made LAST, and filed under `models`. */
  readonly late: FindingRecord;

  /** Scored high at the shared instant, planted BEFORE its twin. */
  readonly high: FindingRecord;

  /** Scored by nobody, which sorts it last rather than first. */
  readonly unscored: FindingRecord;

  /** Scored high at the same instant, planted AFTER `high`. */
  readonly twin: FindingRecord;

  /** Scored low, made FIRST, and carrying no category member. */
  readonly earliest: FindingRecord;

  /** The scope control's one finding, under the other domain. */
  readonly outside: FindingRecord;
}

describeLivePg('wave-3 stores (live Postgres)', () => {
  let pool: Pool;
  let db: ReturnType<typeof createLiveDb>;

  // All three stores are built before the pool exists, which is the
  // ordering the thunk in each of them is there for: `src/index.ts`
  // builds these same stores while `createService` is still
  // registering, and that is before the Postgres dependency has
  // started. Constructing them here touches nothing — a store that
  // resolved `db` eagerly would capture an undefined and fail every
  // case in this file, which is this run's reading of that claim.
  //
  // `createDbDomainStore` comes through `src/domains/index.js` and
  // not through the module declaring it, which is the containment
  // that barrel states about itself. Neither wave-3 group carries a
  // barrel, so those two constructors are deep imports.
  const domainStore: DomainStore = createDbDomainStore(() => db);
  const findingStore: FindingStore = createDbFindingStore(() => db);
  const documentStore: DocumentStore = createDbDocumentStore(() => db);

  // What `src/documents/service.ts` takes: one `DomainStore` method
  // and the two `DocumentStore` reads. Spread rather than wrapped,
  // no two ports in this package declaring a method under the same
  // name, and built over the SAME two stores the raw reads go
  // through — which is what makes the masked answer and the stored
  // row two readings of one connection rather than of two fixtures.
  const corpusStore = { ...domainStore, ...documentStore };

  beforeAll(async () => {
    pool = createLivePool();
    await applyMigrations(pool);
    db = createLiveDb(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await resetTables(pool);
  });

  /**
   * Writes one domain.
   *
   * @param slug - Its natural key.
   * @param name - Its operator-facing label.
   * @returns The stored row, as the database answered it.
   */
  async function plantDomain(
    slug: string,
    name: string,
  ): Promise<DomainRecord> {
    return await domainStore.insertDomain({ slug, name, settings: {} });
  }

  /**
   * Writes one document, straight through drizzle.
   *
   * NOT THROUGH A PORT, BECAUSE NEITHER PORT CAN. `DocumentStore`
   * declares two reads and no write whatever, and `FindingStore`
   * declares one write and it is a ruling — so a fixture standing a
   * corpus up has to reach the table itself, and that is the
   * plainest demonstration of the read-first law there is.
   *
   * @param domainId - The corpus this capture belongs to.
   * @param hash - Its content key. Unique across the table, so every
   *   caller supplies its own.
   * @param body - The captured text, stored verbatim.
   * @param status - Which side of `documents_parse_status_check` it
   *   sits on.
   * @param parseError - What the writer that saw it recorded, or
   *   null.
   * @param capturedAt - When, written explicitly so an ordering is
   *   the fixture's rather than the clock's.
   * @returns Its `documents.id`.
   * @throws Error When the insert returned no row.
   */
  async function plantDocument(
    domainId: number,
    hash: string,
    body: string,
    status: string = PARSED,
    parseError: string | null = null,
    capturedAt: Date = EARLIEST,
  ): Promise<number> {
    const written = await db.insert(documents)
      .values({
        domainId,
        sourceId: null,
        hash,
        url: null,
        body,
        capturedAt,
        parseStatus: status,
        parseError,
      })
      .returning({ id: documents.id });

    return oneRow(written, `the insert of document ${hash}`).id;
  }

  /**
   * Writes one finding, straight through drizzle, and reads it back
   * through the port.
   *
   * Read back rather than projected from the `RETURNING` list, so
   * every row a case holds is one `findFindingById` answered — which
   * makes the fixture itself a reading of that projection.
   *
   * @param domainId - The domain whose criteria produced it.
   * @param documentId - The capture it was read out of.
   * @param score - What it was scored, or null for one nobody has.
   * @param createdAt - When it was made, written explicitly.
   * @param fields - Its payload, which is where a category lives.
   * @returns The stored row, as the port answers it.
   * @throws Error When the insert returned no row.
   */
  async function plantFinding(
    domainId: number,
    documentId: number,
    score: number | null,
    createdAt: Date,
    fields: Record<string, unknown>,
  ): Promise<FindingRecord> {
    const written = await db.insert(findings)
      .values({
        domainId,
        documentId,
        entityId: null,
        fields,
        score,
        scoreVersion: null,
        createdAt,
      })
      .returning({ id: findings.id });
    const id = oneRow(written, 'the insert of a finding').id;

    return present(
      await findingStore.findFindingById(id),
      `findFindingById after planting finding ${id}`,
    );
  }

  /**
   * Writes both domains, a capture under each, and six findings.
   *
   * THE PLANT ORDER IS NEITHER THE ANSWER NOR ITS REVERSE, and it is
   * also neither direction of the id key beneath the answer, so no
   * ordering assertion below is satisfied by a store that read the
   * table in insertion order or backwards.
   *
   * THE TIE PAIRS ARE PLANTED SO EACH KEY DISAGREES WITH THE ONE
   * UNDER IT. `high` and `twin` share a score and an instant and are
   * planted low-id-first, so `id` descending reverses them; `late`
   * and `earliest` share a score and are planted newest-first, so
   * the newer of the two carries the LOWER id and the `created_at`
   * key answers one where the `id` key answers the other. Without
   * both, a key dropped from the `ORDER BY` answers the right page
   * for the fixture's reasons rather than the store's.
   *
   * @returns Both domains and all six findings.
   */
  async function plantFindings(): Promise<PlantedFindings> {
    const domain = await plantDomain(RADAR, RADAR_NAME);
    const other = await plantDomain(TRANSIT, TRANSIT_NAME);
    const capture = await plantDocument(domain.id, 'radar-capture', 'read');
    const outsideCapture = await plantDocument(
      other.id,
      'transit-capture',
      'read',
    );
    const late = await plantFinding(
      domain.id,
      capture,
      LOW_SCORE,
      LATE,
      { category: MODELS },
    );
    const high = await plantFinding(
      domain.id,
      capture,
      HIGH_SCORE,
      MIDDLE,
      { category: NUMERIC_CATEGORY },
    );
    const unscored = await plantFinding(
      domain.id,
      capture,
      null,
      EARLY,
      { category: INFRA },
    );
    const twin = await plantFinding(
      domain.id,
      capture,
      HIGH_SCORE,
      MIDDLE,
      { category: null },
    );
    const earliest = await plantFinding(
      domain.id,
      capture,
      LOW_SCORE,
      EARLIEST,
      {},
    );
    const outside = await plantFinding(
      other.id,
      outsideCapture,
      OTHER_SCORE,
      OTHER_AT,
      { category: MODELS },
    );

    return {
      domain,
      other,
      late,
      high,
      unscored,
      twin,
      earliest,
      outside,
    };
  }

  /**
   * One page of the subject domain, read through the store.
   *
   * @param domainId - The domain to read within.
   * @param filter - What to narrow to.
   * @param sort - Which ordering to answer in.
   * @returns The page and the count the same filter selects, so
   *   every case reads the two through one call and a predicate that
   *   narrowed one and not the other is visible.
   */
  async function pageOf(
    domainId: number,
    filter: FindingFilter,
    sort: 'recency' | 'score' = 'score',
  ): Promise<{ rows: readonly FindingRecord[]; total: number }> {
    const [rows, total] = await Promise.all([
      findingStore.listFindings(domainId, filter, sort, WHOLE),
      findingStore.countFindings(domainId, filter),
    ]);

    return { rows, total };
  }

  it('meets an empty database in every case', async () => {
    // The precondition every case below rests on, taken as a reading
    // rather than left to a comment: each of them plants everything
    // it reads, so a row surviving between cases would make some
    // later assertion true for a reason nobody wrote.
    //
    // Read through the stores rather than through SQL, so a table
    // missing from the `TABLES` roster in `./live-postgres.ts` — a
    // fault that leaves `lint`, `check-types` and the whole live run
    // green while leaking rows — is reported here too.
    const filter: FindingFilter = { window: UNBOUNDED };

    expect(await findingStore.countFindings(1, filter)).toBe(0);
    expect(await findingStore.listFindings(1, filter, 'score', WHOLE))
      .toStrictEqual([]);
    expect(await findingStore.findFindingById(1)).toBeNull();
    expect(await findingStore.listFindingLabels(1)).toStrictEqual([]);
    expect(await findingStore.listFindingSightings(1)).toStrictEqual([]);
    expect(await findingStore.listFindingResearch(1)).toStrictEqual([]);
    expect(await documentStore.countDocuments(1, {})).toBe(0);
    expect(await documentStore.listDocuments(1, {}, WHOLE))
      .toStrictEqual([]);
  });

  it('orders a page the way a digest orders one', async () => {
    const planted = await plantFindings();
    const { rows, total } = await pageOf(planted.domain.id, {
      window: UNBOUNDED,
    });
    const answered = idsOf(rows);

    // The scope first, and it is what makes every line below a
    // statement about this domain rather than about the table. The
    // other domain's finding is scored BETWEEN the two scores here
    // and stamped BETWEEN two of these instants, so a `WHERE` that
    // stopped narrowing puts a row of exactly the right shape into
    // the middle of this page and no assertion about the head or the
    // tail of it would notice.
    expect(total).toBe(5);
    expect(answered).toHaveLength(5);
    expect(answered).not.toContain(planted.outside.id);

    // The digest order, written out. Score descending with an absent
    // score LAST, then `created_at` descending, then `id`
    // descending.
    expect(answered).toStrictEqual([
      planted.twin.id,
      planted.high.id,
      planted.late.id,
      planted.earliest.id,
      planted.unscored.id,
    ]);

    // THE UNSCORED FINDING IS LAST AND NOT FIRST, which is the
    // `NULLS LAST` on a descending key rather than a comparator
    // branch. Postgres puts nulls FIRST for `DESC` unless told
    // otherwise, so a store that dropped the qualifier answers this
    // row at the head of a ranking.
    expect(oneRow(rows.slice(-1), 'the last row of the page').score)
      .toBeNull();
    expect(oneRow(rows, 'the first row of the page').score)
      .toBe(HIGH_SCORE);

    // The vacuity guards. The answer is none of the four orders a
    // store that read the table without ordering it, or ordered it
    // by its identity alone, would have produced — so the assertion
    // above is about the `ORDER BY` and not about how the rows were
    // written.
    const plantOrder = [
      planted.late.id,
      planted.high.id,
      planted.unscored.id,
      planted.twin.id,
      planted.earliest.id,
    ];

    expect(answered).not.toStrictEqual(plantOrder);
    expect(answered).not.toStrictEqual([...plantOrder].reverse());
    expect(plantOrder).toStrictEqual([...plantOrder].sort((l, r) => l - r));

    // THE COMPARATOR IS THE SECOND DERIVATION OF ONE RULE. The rows
    // the server ranked, re-ranked by `compareFindings` from
    // `src/lib/digest-assemble.ts`, come out in the order they
    // arrived in — so the SQL and the library are one authority
    // checked from two sides rather than two orders free to
    // disagree. `orderFindings` copies before sorting, so the page
    // this compares against is not the page it sorted.
    expect(idsOf(orderFindings([...rows]))).toStrictEqual(answered);

    // And the shuffled control: the same rows handed to the library
    // in a DIFFERENT order come back in the same one. Without it the
    // line above is equally green over a library that answers its
    // argument unchanged.
    const shuffled = [...rows].reverse();

    expect(idsOf(shuffled)).not.toStrictEqual(answered);
    expect(idsOf(orderFindings(shuffled))).toStrictEqual(answered);
  });

  it('answers recency as that order with the score gone', async () => {
    const planted = await plantFindings();
    const { rows, total } = await pageOf(
      planted.domain.id,
      { window: UNBOUNDED },
      'recency',
    );
    const answered = idsOf(rows);

    expect(total).toBe(5);
    expect(answered).not.toContain(planted.outside.id);

    // `created_at` descending with `id` descending under it, and no
    // score key at all — so the unscored finding sits by its instant
    // rather than at the end, and the two findings scored alike at
    // one moment keep the order their ids give them.
    expect(answered).toStrictEqual([
      planted.late.id,
      planted.twin.id,
      planted.high.id,
      planted.unscored.id,
      planted.earliest.id,
    ]);

    // The sort parameter is READ, which is what this case is for: a
    // store answering one ordering whatever it was asked would pass
    // the case above and fail this line.
    const ranked = await findingStore.listFindings(
      planted.domain.id,
      { window: UNBOUNDED },
      'score',
      WHOLE,
    );

    expect(idsOf(ranked)).not.toStrictEqual(answered);

    // AND IT IS THE SAME ORDER WITH ONE KEY NEUTRALISED rather than
    // a second rule. Two absent scores tie on the first key and fall
    // through to the stamp and then to the id, so the library
    // answers the recency order for rows whose scores are all gone —
    // derived through the same authority the case above compares
    // against rather than through a comparator written out here.
    // Taken over the RANKED page, whose order is not this one, so
    // the library is asked to move the rows rather than to leave
    // them where a no-op sort already had them.
    const unranked = ranked.map((row) => ({ ...row, score: null }));

    expect(idsOf(orderFindings(unranked))).toStrictEqual(answered);

    // The plant order and its reverse are neither, on the terms the
    // case above states.
    const plantOrder = [
      planted.late.id,
      planted.high.id,
      planted.unscored.id,
      planted.twin.id,
      planted.earliest.id,
    ];

    expect(answered).not.toStrictEqual(plantOrder);
    expect(answered).not.toStrictEqual([...plantOrder].reverse());
  });

  it('answers the verdict in force over a re-judged finding', async () => {
    const planted = await plantFindings();

    // Three rulings in turn on one finding, and one ruling on
    // another. The MIDDLE verdict is what separates the two shapes a
    // reader confuses: a subquery pushing the comparison inside
    // answers this finding under every verdict it ever carried,
    // where the store compares against the row `DISTINCT ON` left
    // standing and answers it under the third alone.
    await findingStore.insertFindingLabel({
      findingId: planted.late.id,
      verdict: FIRST_VERDICT,
      note: null,
    });
    await findingStore.insertFindingLabel({
      findingId: planted.late.id,
      verdict: MIDDLE_VERDICT,
      note: null,
    });
    await findingStore.insertFindingLabel({
      findingId: planted.late.id,
      verdict: LATEST_VERDICT,
      note: null,
    });
    await findingStore.insertFindingLabel({
      findingId: planted.high.id,
      verdict: FIRST_VERDICT,
      note: null,
    });

    // The scope control carries the verdict in force on the subject
    // domain's re-judged finding, so a `WHERE` that stopped
    // narrowing answers two rows below rather than one.
    await findingStore.insertFindingLabel({
      findingId: planted.outside.id,
      verdict: LATEST_VERDICT,
      note: null,
    });

    const inForce = await pageOf(planted.domain.id, {
      verdict: LATEST_VERDICT,
      window: UNBOUNDED,
    });

    expect(idsOf(inForce.rows)).toStrictEqual([planted.late.id]);
    expect(inForce.total).toBe(1);

    // THE FIRST TWO RULINGS ARE NO LONGER IN FORCE, and the zeros
    // are read beside a non-empty page the same call produced — the
    // finding ruled ONCE is the in-band positive control, so a store
    // that had stopped answering any verdict at all fails the line
    // below rather than passing the two above it.
    const superseded = await pageOf(planted.domain.id, {
      verdict: FIRST_VERDICT,
      window: UNBOUNDED,
    });

    expect(idsOf(superseded.rows)).toStrictEqual([planted.high.id]);
    expect(superseded.total).toBe(1);

    const middle = await pageOf(planted.domain.id, {
      verdict: MIDDLE_VERDICT,
      window: UNBOUNDED,
    });

    expect(idsOf(middle.rows)).toStrictEqual([]);
    expect(middle.total).toBe(0);

    // A FINDING NOBODY HAS JUDGED MATCHES NO VERDICT, which follows
    // from the subquery rather than being decided: it contributes no
    // row, so it is in no membership list any verdict could produce.
    const unjudged = [
      planted.unscored.id,
      planted.twin.id,
      planted.earliest.id,
    ];
    const judged = [
      ...idsOf(inForce.rows),
      ...idsOf(superseded.rows),
      ...idsOf(middle.rows),
    ];

    expect(unjudged.some((id) => judged.includes(id))).toBe(false);

    // A verdict no label carries is an empty page rather than an
    // error, and the whole collection is what the three narrowings
    // fall short of.
    const unused = await pageOf(planted.domain.id, {
      verdict: UNUSED_VERDICT,
      window: UNBOUNDED,
    });
    const everything = await pageOf(planted.domain.id, {
      window: UNBOUNDED,
    });

    expect(unused.total).toBe(0);
    expect(judged).toHaveLength(2);
    expect(everything.total).toBe(5);
  });

  it('appends a ruling and leaves the one it followed', async () => {
    const planted = await plantFindings();

    // THE SAME VERDICT TWICE, which is the pair that reports. Two
    // rulings that DIFFER are survived by an upsert keyed on the
    // finding and the verdict; only a second call carrying the same
    // value collapses under one. The notes differ, so the row the
    // first call wrote is identifiable afterwards.
    const first = await findingStore.insertFindingLabel({
      findingId: planted.late.id,
      verdict: LATEST_VERDICT,
      note: FIRST_NOTE,
    });
    const second = await findingStore.insertFindingLabel({
      findingId: planted.late.id,
      verdict: LATEST_VERDICT,
      note: SECOND_NOTE,
    });

    // The id and the stamp are the two members no request carried,
    // and they are what says the write ANSWERED THE STORED ROW
    // rather than an object rebuilt from its argument.
    expect(typeof first.id).toBe('number');
    expect(second.id).not.toBe(first.id);
    expect(first.labelledAt).toBeInstanceOf(Date);
    expect(second.labelledAt.getTime())
      .toBeGreaterThanOrEqual(first.labelledAt.getTime());

    // BOTH ROWS STAND, newest first, and the note the first ruling
    // recorded survived the second — which an update would have
    // taken with the value it replaced.
    const held = await findingStore.listFindingLabels(planted.late.id);

    expect(held).toStrictEqual([second, first]);
    expect(held.map((row) => row.note))
      .toStrictEqual([SECOND_NOTE, FIRST_NOTE]);
    expect(held.map((row) => row.verdict))
      .toStrictEqual([LATEST_VERDICT, LATEST_VERDICT]);

    // The append reached one finding and no other, so the rulings
    // are keyed by the finding rather than by the domain.
    expect(await findingStore.listFindingLabels(planted.high.id))
      .toStrictEqual([]);

    // THE STAMP IS THE TRANSACTION'S AND THAT IS WHY `id` IS BESIDE
    // IT. `labelled_at` defaults to `now()`, which is the
    // transaction's start rather than the row's, so two rulings
    // written inside ONE transaction carry a single value between
    // them. Planted here the way a deployment makes such a tie — two
    // statements in one transaction — rather than by writing one
    // instant twice, and no in-memory store can be made to produce
    // it: two objects appended to a list carry whatever clock the
    // fake read, twice.
    await db.transaction(async (tx) => {
      await tx.insert(findingLabels).values({
        findingId: planted.twin.id,
        verdict: FIRST_VERDICT,
        note: FIRST_NOTE,
      });
      await tx.insert(findingLabels).values({
        findingId: planted.twin.id,
        verdict: FIRST_VERDICT,
        note: SECOND_NOTE,
      });
    });

    const tied = await findingStore.listFindingLabels(planted.twin.id);
    const older = oneRow(tied.slice(-1), 'the older of the tied rulings');
    const newer = oneRow(tied, 'the newer of the tied rulings');

    // The tie is real — without this the ordering below is equally
    // green over a store that read the stamps and found them apart.
    expect(newer.labelledAt.toISOString())
      .toBe(older.labelledAt.toISOString());

    // And `id` is what separated them. For a lookup whose whole
    // answer is the FIRST row, that is the difference between a
    // verdict and a coin flip.
    expect(newer.id).toBeGreaterThan(older.id);
    expect(newer.note).toBe(SECOND_NOTE);
    expect(older.note).toBe(FIRST_NOTE);
  });

  it('filters findings on the category member of fields', async () => {
    const planted = await plantFindings();

    // A key exactly one finding of this domain is filed under, while
    // the OTHER domain's finding carries the same key — so a `WHERE`
    // that stopped narrowing answers two rows here.
    const models = await pageOf(planted.domain.id, {
      category: MODELS,
      window: UNBOUNDED,
    });

    expect(idsOf(models.rows)).toStrictEqual([planted.late.id]);
    expect(models.total).toBe(1);

    const infra = await pageOf(planted.domain.id, {
      category: INFRA,
      window: UNBOUNDED,
    });

    expect(idsOf(infra.rows)).toStrictEqual([planted.unscored.id]);
    expect(infra.total).toBe(1);

    // `fields->>'category'` YIELDS TEXT, and this is the row that
    // says so. The member was stored as a NUMBER, so a store
    // comparing only string members answers an empty page where the
    // server answers the row — a reading with no expression in any
    // implementation that holds its payloads as JavaScript values.
    expect(planted.high.fields['category']).toBe(NUMERIC_CATEGORY);

    const numeric = await pageOf(planted.domain.id, {
      category: NUMERIC_KEY,
      window: UNBOUNDED,
    });

    expect(idsOf(numeric.rows)).toStrictEqual([planted.high.id]);
    expect(numeric.total).toBe(1);

    // THE TWO ABSENCES BOTH COME BACK SQL NULL, which is a
    // three-valued reading a comparison over JavaScript values has
    // no third value to be wrong about. One payload holds the JSON
    // null under the member and the other has no such member at all,
    // and neither matches any key a caller can name — so the three
    // narrowings above fall SHORT of the collection by exactly those
    // two, which is a partition no single narrowed page can report.
    expect(planted.twin.fields['category']).toBeNull();
    expect(Object.hasOwn(planted.earliest.fields, 'category')).toBe(false);

    const filed = [
      ...idsOf(models.rows),
      ...idsOf(infra.rows),
      ...idsOf(numeric.rows),
    ];
    const whole = await pageOf(planted.domain.id, { window: UNBOUNDED });

    expect(filed).toHaveLength(3);
    expect(whole.total).toBe(5);
    expect(filed).not.toContain(planted.twin.id);
    expect(filed).not.toContain(planted.earliest.id);

    // A key the domain never declared is an empty page rather than a
    // `404`. Nothing failed to read: the domain has no findings
    // filed under a category it never named.
    const undeclared = await pageOf(planted.domain.id, {
      category: UNDECLARED,
      window: UNBOUNDED,
    });

    expect(idsOf(undeclared.rows)).toStrictEqual([]);
    expect(undeclared.total).toBe(0);
  });

  it('takes a window lower bound and drops its upper', async () => {
    const planted = await plantFindings();

    // `[EARLY, LATE)` — half-open, so the finding made at exactly
    // the lower bound is IN and the one made at exactly the upper
    // bound is OUT. Both ends are planted on, which is what makes
    // this two readings rather than one: a store writing `>` on the
    // lower is reported by the row it drops and one writing `<=` on
    // the upper by the row it takes.
    const window: TimeWindow = {
      sinceInclusive: EARLY,
      untilExclusive: LATE,
    };
    const { rows, total } = await pageOf(
      planted.domain.id,
      { window },
      'recency',
    );
    const answered = idsOf(rows);

    // The instants the two bounds name are the instants two findings
    // carry, taken as a reading rather than left to the fixture's
    // constants: without it the boundary claim is about a seam no
    // row sits on.
    expect(planted.unscored.createdAt.toISOString())
      .toBe(EARLY.toISOString());
    expect(planted.late.createdAt.toISOString())
      .toBe(LATE.toISOString());

    expect(answered).toStrictEqual([
      planted.twin.id,
      planted.high.id,
      planted.unscored.id,
    ]);
    expect(total).toBe(3);

    // The lower bound is INCLUSIVE, so the row stamped at it is in
    // the page.
    expect(answered).toContain(planted.unscored.id);

    // The upper bound is EXCLUSIVE, so the row stamped at it is not
    // — and neither is the row below the span, which is what says
    // the lower bound narrows at all rather than being ignored.
    expect(answered).not.toContain(planted.late.id);
    expect(answered).not.toContain(planted.earliest.id);

    // And the scope: the other domain's finding is stamped INSIDE
    // this span, so a `WHERE` that stopped narrowing answers it here
    // at exactly the position an unnoticed row would take.
    expect(planted.outside.createdAt.getTime())
      .toBeGreaterThan(EARLY.getTime());
    expect(planted.outside.createdAt.getTime())
      .toBeLessThan(LATE.getTime());
    expect(answered).not.toContain(planted.outside.id);

    // Each bound alone, so neither is read as the other. An open
    // upper takes the row the closed one dropped; an open lower
    // takes the row below the span.
    const fromEarly = await pageOf(planted.domain.id, {
      window: { sinceInclusive: EARLY, untilExclusive: null },
    });
    const untilLate = await pageOf(planted.domain.id, {
      window: { sinceInclusive: null, untilExclusive: LATE },
    });

    expect(fromEarly.total).toBe(4);
    expect(idsOf(fromEarly.rows)).toContain(planted.late.id);
    expect(untilLate.total).toBe(4);
    expect(idsOf(untilLate.rows)).toContain(planted.earliest.id);
    expect(idsOf(untilLate.rows)).not.toContain(planted.late.id);

    // A span in which the domain made nothing is a legitimate
    // request answering an empty page rather than an error.
    const quiet = await pageOf(planted.domain.id, {
      window: { sinceInclusive: at(50), untilExclusive: at(55) },
    });

    expect(idsOf(quiet.rows)).toStrictEqual([]);
    expect(quiet.total).toBe(0);
  });

  it('answers a stored control byte masked and a body cut', async () => {
    const domain = await plantDomain(RADAR, RADAR_NAME);
    const other = await plantDomain(TRANSIT, TRANSIT_NAME);
    const markedId = await plantDocument(
      domain.id,
      'radar-marked',
      MARKED_BODY,
      UNPARSED,
      MARKED_ERROR,
      LATE,
    );
    const atCapId = await plantDocument(
      domain.id,
      'radar-at-cap',
      AT_CAP_BODY,
      PARSED,
      null,
      MIDDLE,
    );
    const overCapId = await plantDocument(
      domain.id,
      'radar-over-cap',
      OVER_CAP_BODY,
      PARSED,
      null,
      EARLY,
    );

    // The scope control, planted with the body the cut case reads so
    // a corpus read that stopped narrowing answers a row of exactly
    // the right shape.
    await plantDocument(
      other.id,
      'transit-marked',
      MARKED_BODY,
      UNPARSED,
      MARKED_ERROR,
      OTHER_AT,
    );

    // THE STORE ANSWERS THE BODY AS STORED, unmasked and uncut, per
    // its port — and this is the reading that says the control
    // characters survived a `text` column byte-identically rather
    // than having been dropped or transcoded on the way in. Only a
    // server can supply it: the masker's own suite hands it these
    // characters directly.
    const stored = await documentStore.listDocuments(domain.id, {}, WHOLE);

    expect(idsOf(stored)).toStrictEqual([markedId, atCapId, overCapId]);

    const storedMarked = oneRow(stored, 'the corpus page, newest first');

    expect(storedMarked.body).toBe(MARKED_BODY);
    expect(storedMarked.body.length).toBe(MARKED_BODY.length);
    expect(countOccurrences(storedMarked.body, BELL)).toBe(1);
    expect(countOccurrences(storedMarked.body, DEL)).toBe(1);
    expect(countOccurrences(storedMarked.body, NEL)).toBe(1);
    expect(present(storedMarked.parseError, 'the stored parse error'))
      .toBe(MARKED_ERROR);

    // AND THE SERVICE ANSWERS NEITHER, over the same two stores and
    // the same connection — so the zeros below are about the value
    // the lines above counted as ones rather than about text nothing
    // ever stored.
    const page = await listDocuments(corpusStore, RADAR, {}, WHOLE);

    expect(page.total).toBe(3);
    expect(idsOf(page.rows)).toStrictEqual([markedId, atCapId, overCapId]);

    const answered = oneRow(page.rows, 'the answered corpus page');

    expect(countOccurrences(answered.body, BELL)).toBe(0);
    expect(countOccurrences(answered.body, DEL)).toBe(0);
    expect(countOccurrences(answered.body, NEL)).toBe(0);
    expect(answered.body).toBe(maskControlBytes(MARKED_BODY));
    expect(present(answered.parseError, 'the answered parse error'))
      .toBe(maskControlBytes(MARKED_ERROR));

    // The masked body is SHORT, so nothing was cut — which is what
    // makes this a reading about the mask. A service masking before
    // cutting answers the same text and moves this flag instead,
    // there being something in this body to mask.
    expect(answered.bodyTruncated).toBe(false);

    // Bytes and not characters, and the C1 control is what separates
    // the two: it is one UTF-16 unit and two UTF-8 bytes.
    expect(answered.bodyBytes)
      .toBe(Buffer.byteLength(MARKED_BODY, 'utf8'));
    expect(answered.bodyBytes).toBeGreaterThan(MARKED_BODY.length);

    // THE CUT ANSWERS THE AT-CAP BODY ITSELF, which one equality
    // reads the flag, the retained text and the length through. The
    // over-cap body is the at-cap body plus a single two-byte
    // character, so the three numbers a cut body carries are
    // distinct here: stored bytes, stored code points, and the code
    // points kept.
    const atCap = page.rows.find((row) => row.id === atCapId);
    const overCap = page.rows.find((row) => row.id === overCapId);

    expect(present(atCap ?? null, 'the at-cap row of the page').body)
      .toBe(AT_CAP_BODY);
    expect(present(atCap ?? null, 'the at-cap row of the page')
      .bodyTruncated).toBe(false);
    expect(present(atCap ?? null, 'the at-cap row of the page').bodyBytes)
      .toBe(BODY_CODE_POINT_CAP);

    const cut = present(overCap ?? null, 'the over-cap row of the page');

    expect(cut.body).toBe(AT_CAP_BODY);
    expect(cut.bodyTruncated).toBe(true);
    expect(cut.bodyBytes).toBe(BODY_CODE_POINT_CAP + 2);
    expect(Array.from(cut.body)).toHaveLength(BODY_CODE_POINT_CAP);
    expect(Array.from(OVER_CAP_BODY))
      .toHaveLength(BODY_CODE_POINT_CAP + 1);

    // The mark at each END, which a run of one repeated character
    // cannot supply: such a run equals every slice of itself, so a
    // comparison that slipped by one takes a character nothing can
    // see going.
    expect(cut.body.startsWith(BODY_HEAD)).toBe(true);
    expect(cut.body.endsWith(BODY_TAIL)).toBe(true);

    // And the scope, read through both faces: the other domain's
    // capture is in neither answer.
    const outside = await listDocuments(corpusStore, TRANSIT, {}, WHOLE);

    expect(outside.total).toBe(1);
    expect(idsOf(outside.rows)).not.toContain(markedId);

    // The narrowing, so a page that stopped filtering is reported:
    // the two halves SUM to the unnarrowed total and neither equals
    // it, which no single narrowed page can say.
    const failed = await listDocuments(
      corpusStore,
      RADAR,
      { parseStatus: UNPARSED },
      WHOLE,
    );
    const parsed = await listDocuments(
      corpusStore,
      RADAR,
      { parseStatus: PARSED },
      WHOLE,
    );

    expect(idsOf(failed.rows)).toStrictEqual([markedId]);
    expect(failed.total).toBe(1);
    expect(parsed.total).toBe(2);
    expect(failed.total + parsed.total).toBe(page.total);
  });

  it('refuses the one control byte a text column cannot hold', async () => {
    const domain = await plantDomain(RADAR, RADAR_NAME);
    const kept = await plantDocument(
      domain.id,
      'radar-kept',
      MARKED_BODY,
      PARSED,
      null,
      LATE,
    );

    // THE MASKED CLASS IS FOUR RANGES AND THIS COLUMN CAN CARRY TWO
    // OF THEM. The case above is the two it can; this is the two it
    // cannot, and neither is readable anywhere but here —
    // `maskControlBytes` is a pure function and its colocated suite
    // hands it every range directly, where what a stored body can
    // actually hold is a fact about the server and the wire between
    // them.
    //
    // U+0000 is refused OUTRIGHT. Postgres has no representation for
    // it in any encoding, so the insert never lands and the SQLSTATE
    // is `character_not_in_repertoire` — which is NOT one of the
    // three `classifyPgError` in `src/db/store-errors.ts` maps, so
    // it crosses as the driver error drizzle wrapped rather than as
    // a `StoreRefusal`.
    let raised: unknown = null;

    try {
      await plantDocument(domain.id, 'radar-nul', 'A' + NUL + 'Z');
    } catch (err) {
      raised = err;
    }

    if (raised === null) {
      throw new Error(
        '[wave3-live] the NUL insert was accepted, so the assertions '
        + 'below would be about a refusal nobody raised.',
      );
    }

    const cause = (raised as { cause?: unknown }).cause as {
      code?: unknown;
    };

    expect(cause.code).toBe(ENCODING_VIOLATION);

    // THE REFUSAL WROTE NOTHING and the connection is still usable,
    // which is what says the statement failed rather than the
    // session. Read after the refusal rather than before it, so the
    // count is a statement about the state the refusal left.
    expect(await documentStore.countDocuments(domain.id, {})).toBe(1);
    expect(idsOf(await documentStore.listDocuments(domain.id, {}, WHOLE)))
      .toStrictEqual([kept]);

    // A LONE SURROGATE IS NOT REFUSED, AND IT IS NOT STORED EITHER.
    // It is replaced with U+FFFD on the way out of this process,
    // before the server sees it, so the row lands carrying a
    // character nobody wrote and the mask has nothing left to
    // escape. That is the quieter of the two and the one worth
    // measuring: a refusal is loud, and this is a body that reads
    // back plausibly and is not what was sent.
    const swappedId = await plantDocument(
      domain.id,
      'radar-surrogate',
      'A' + LONE_SURROGATE + 'Z',
      PARSED,
      null,
      MIDDLE,
    );
    const page = await listDocuments(corpusStore, RADAR, {}, WHOLE);
    const swapped = page.rows.find((row) => row.id === swappedId);
    const back = present(swapped ?? null, 'the surrogate row of the page');

    expect(back.body).toBe('A' + REPLACEMENT + 'Z');
    expect(countOccurrences(back.body, LONE_SURROGATE)).toBe(0);
    expect(countOccurrences(back.body, REPLACEMENT)).toBe(1);

    // The masker WOULD have escaped it, which is the control that
    // says the zero above is the column's doing and not the mask
    // having stopped matching.
    expect(maskControlBytes('A' + LONE_SURROGATE + 'Z'))
      .not.toBe('A' + LONE_SURROGATE + 'Z');
    expect(maskControlBytes(back.body)).toBe(back.body);
  });
});
