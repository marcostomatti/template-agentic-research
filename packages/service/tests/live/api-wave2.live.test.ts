/**
 * The wave-2 topics store driven against a real Postgres, through
 * the real migrations: a domain written, topics hung off it, the one
 * key that table can refuse a write with, a window taken out of the
 * collection, a patch, the schedule column written through its
 * single door, and the cascade that takes the whole lot away with
 * the domain. Self-skips when AR_LIVE_DATABASE_URL is unset — run
 * via:
 *
 *   bun run stress:start && bun run test:live && bun run stress:stop
 *
 * WHAT ONLY A SERVER CAN ANSWER is why this file is worth its
 * container, and it is not the rules. Every decision the topics
 * surface takes — the 404 for an unknown slug, the 409 for a name
 * the domain already carries, the 409 for a run-now against a
 * disabled row, the instant a pause of N cycles lands on — is a
 * decision about rows, and `tests/helpers/memory-research-store.ts`
 * supplies rows with no database, so all of it is already pinned by
 * `src/topics/service.test.ts` and `src/topics/routes.test.ts`. What
 * is left is the half those suites structurally cannot reach: every
 * operation below is SQL, and a statement that is valid drizzle and
 * invalid SQL passes `lint`, `check-types` and the entire isolated
 * suite. A projection naming a column the migration never created,
 * an `ORDER BY` on the wrong column, a `WHERE` that stopped
 * narrowing, a `RETURNING` list drifted from the `SELECT` beside it
 * — each is reported here and nowhere else.
 *
 * SIX READINGS BELOW ARE THINGS AN IN-MEMORY MAP CANNOT DO, which is
 * the same argument put sharply enough to be checkable. The seven
 * capitalised paragraphs that follow are those six — the window and
 * the scope are one reading written from two sides — and the two
 * after them are the other kind: one names a reading this table
 * cannot give, and the last is a `check-types` leg rather than a
 * live one.
 *
 * THE IDENTITY IS THE DATABASE'S, AND A REFUSED INSERT SPENDS ONE.
 * `topics.id` is a `bigserial` mapped in `number` mode, so it
 * arrives as a number rather than as the string a raw driver hands
 * back; and a sequence does not roll back, so the write the unique
 * key refuses still consumed an id and the next topic to land is two
 * higher rather than one. That second half is fidelity
 * `tests/helpers/memory-research-store.ts` had to be written to
 * imitate rather than one it would have had.
 *
 * THE SQLSTATE IS POSTGRES'S AND THE REASON IS THIS REPOSITORY'S, so
 * the refusal case reads them separately. `StoreRefusal.reason` is
 * what `classifyPgError` in `src/db/store-errors.ts` DECIDED; the
 * five-character code on the driver error underneath it is what the
 * server actually raised. A classifier mapping the wrong SQLSTATE
 * onto the right reason answers the first and fails the second, and
 * no in-memory refusal has a second reading at all — it is built
 * from a reason and a constraint name this repository chose.
 *
 * THE PAGE IS A REAL `ORDER BY`, `LIMIT` AND `OFFSET`. The three
 * topics one domain carries are written in an order that is neither
 * their name order nor its reverse, and `topics.id` is a
 * `bigserial`, so insertion order and id order are one list and the
 * answered order is a third. The window is narrower than the
 * collection, because a page as wide as what it pages over cannot
 * report a `LIMIT` that stopped limiting and an offset of zero
 * cannot report an `OFFSET` that stopped offsetting.
 *
 * THE SECOND DOMAIN MAKES THE WINDOW READING A SCOPE READING TOO.
 * Its one topic is named so that it sorts BETWEEN two of the first
 * domain's, so a `WHERE` that had stopped narrowing answers it at
 * exactly the offset the windowed read asks for: one row, the right
 * shape, the wrong domain's topic. The same domain is what says
 * `topics_domain_id_name_unique` is over two columns — an index
 * declared over `name` alone refuses a name a SECOND domain wants,
 * and every count in every other case here still adds up.
 *
 * THE DUE TIME CROSSES THE DRIVER AS TEXT. `next_run_at` is a
 * `timestamptz`, so an instant is serialised on the way in and
 * parsed fresh on the way out and the record answered shares nothing
 * with the argument — where a map answering the `Date` it was handed
 * and a map answering its stored copy are two readings of one object
 * graph. The instant this file writes carries a non-zero millisecond
 * component on purpose: a column at second resolution, or a store
 * rounding on the way through, answers it with that component gone
 * and nothing else in the case notices.
 *
 * THE CASCADE IS ONE STATEMENT AND POSTGRES RUNS IT.
 * `topics.domain_id` is declared `ON DELETE cascade`, so
 * `DomainStore.deleteDomain` issues a single `DELETE` and every
 * topic goes with it: no method on `TopicStore` takes part and
 * `TopicStore.deleteTopic` is never called. An in-memory store
 * imitates that by looping its own maps, so the isolated suite
 * proves only that somebody wrote the loop. The rows are read back
 * BY ID rather than only by domain, which is the stronger half — a
 * `WHERE domain_id = $1` answering zero is equally satisfied by rows
 * that survived under a domain that is gone.
 *
 * THE EMPTY PATCH IS A BRANCH THAT EXISTS BECAUSE THIS
 * IMPLEMENTATION THROWS. `topics` carries no `created_at` and no
 * `updated_at`, so a patch naming no member leaves drizzle with an
 * empty `set` list and it answers `No values to set` rather than
 * issuing a harmless statement — where an in-memory map hands the
 * row back without noticing it was asked for nothing.
 * `TopicStore.updateTopic` declares the call legal and owes the
 * stored row, so the drizzle half reads instead of writing, and the
 * leg deleting that early return reddens nothing at all over there.
 *
 * THE JSONB ARRAY IS NOT THE KEY-ORDER READING, AND SAYING SO IS
 * PART OF THE READING. `tests/live/api.live.test.ts` proves its
 * stores read the STORED row rather than echoing their argument by
 * writing a jsonb OBJECT whose keys Postgres reorders. `topics` has
 * no jsonb object column — `search_terms` is an ARRAY, and an array
 * preserves element order — so that proof is unavailable here and is
 * not claimed. What the array round trip does say is what the
 * replace-whole rule rests on: the list comes back in the order it
 * went in, so a patch answering two members where three were stored
 * is a replacement rather than a reordering.
 *
 * THE KEY-SET PIN IS A `check-types` LEG rather than a red case, and
 * it is load-bearing on this table rather than tidy: `topics` does
 * not declare its schedulable columns, it spreads
 * `schedulableColumns()` from `src/db/schema/scheduling.ts`, which
 * `export_subscriptions` spreads as well. A column added to that ONE
 * helper for a scheduling mode nobody in `src/topics/` is thinking
 * about lands on this table with no file in that directory edited at
 * all, and no assertion naming a member notices a member arriving.
 *
 * FOURTEEN MUTATIONS WERE RUN AGAINST THESE EIGHT CASES, each leg
 * twice, with every red set identical across the two passes and
 * every leg collecting all eight cases. A fifteenth is a
 * `check-types` leg rather than a red one. Exactly one vitest leg
 * reddened nothing and it is recorded below as a scope boundary
 * rather than repaired. The figures are a measurement over this case
 * list and nothing else, so a task adding a case here re-derives the
 * whole grid rather than inheriting any of it.
 *
 * THE THREE REFUSAL-TRANSLATION LEGS REDDEN ONE CASE BETWEEN THEM,
 * and what separates them is which assertion fails rather than which
 * case does. Rethrowing the driver error raw instead of classifying
 * it, and leaving 23505 out of the map in `src/db/store-errors.ts`,
 * both reach the case as an untranslated `DrizzleQueryError` — so
 * the failure is the helper's rethrow, and the message it arrives
 * with is `Failed query: insert into "topics" ...` plus the bound
 * parameters, which is the request-content leak
 * `src/topics/db-store.ts` gives as its reason for wrapping every
 * write. Dropping the constraint name from every refusal instead
 * reaches the `constraint` assertion with the reason still right.
 * All three leave the raw SQLSTATE on the `cause` untouched, which
 * is what says that reading is a claim of its own.
 *
 * THE PAGE'S ROWS AND THE COLLECTION'S TOTAL ARE TWO CLAIMS, and two
 * legs are what say so. Dropping the `WHERE` from `listTopics`
 * reddens the window case and the cascade case; dropping it from
 * `countTopics` reddens those two AND the duplicate-name case, the
 * last two through their controls rather than through their
 * subjects, neither being about a count. Ordering by id, ignoring
 * the window and dropping the list's `WHERE` are three legs landing
 * on the one window case, told apart by which of its assertions
 * fails — which is what the id control, the two-list comparison and
 * the second domain are each there for.
 *
 * THE TWO SCHEDULE LEGS SHARE THEIR TWO CASES AND ARE OPPOSITES.
 * Writing nothing where the due time should go fails the assertions
 * that the instant moved, and writing a second column beside it
 * fails the member-for-member comparison; neither is reachable from
 * the other, and a containment case with no control that the
 * permitted column DID move would be satisfied by the first.
 * Dropping `next_run_at` from the projection reddens three, the
 * insert case through the key set rather than through any field
 * read.
 *
 * THE CASCADE ITSELF HAS NO LEG, AND THE ONE AIMED AT THE RESET HAS
 * NO EFFECT. `ON DELETE cascade` is DDL, so the only edit that could
 * break it is one to a migration, which would fail `applyMigrations`
 * and take the whole file down rather than reddening a case; what
 * the two `WHERE` legs reach in the cascade case is its
 * second-domain control. The same absorption caught a leg aimed at
 * the roster: `resetTables` truncates with `CASCADE`, so removing
 * `topics` from the `TABLES` list in `./live-postgres.ts` reddens
 * ZERO — every table referencing `domains` is truncated whether the
 * roster names it or not. Removing the reset itself reddens seven of
 * the eight, the survivor being the key-list case, which reads no
 * database at all.
 *
 * THE SCHEMA COMES FROM THE MIGRATIONS. `applyMigrations` in the
 * `beforeAll` below runs the real `drizzle/*.sql` rather than
 * pushing the schema, which is what `bun run db:migrate` does to a
 * deployment — so the table these cases meet is the one the
 * generated migrations create, and a migration that does not apply
 * reddens this file before a case is reached.
 * `tests/live/live-postgres.ts` argues the difference: a push
 * produces the right tables while never executing the migration,
 * which is precisely the gap that lets a broken one ship.
 *
 * THE RESET IS THE PRECONDITION, WRITTEN OUT. Every case below
 * plants everything it reads, so `resetTables` in the `beforeEach`
 * is what makes "nothing it read back was planted by anything but
 * itself" a fact rather than an ordering to keep. It also restarts
 * the identity sequences, which is why a case may assert the first
 * id a table issues and why it may name an id no row carries and be
 * sure of it. The first case takes that precondition as a reading of
 * its own rather than leaving it to a comment.
 *
 * WHAT IS NOT HERE YET IS NAMED RATHER THAN LEFT TO BE NOTICED. This
 * file is the topics half of the wave-2 live seam and nothing else.
 * The sources legs — the parse-status aggregate, the two foreign
 * keys that refuse a source delete, and the failures page — and the
 * connectors and subscriptions legs after them land in the two tasks
 * that follow this one, into this same container. Until they do, the
 * `describe` name reads wider than the cases under it, which is the
 * shape a file assembled over three commits has and is stated here
 * so it is not read as coverage that went missing.
 *
 * EVERY ERROR THIS FILE CONSTRUCTS CARRIES `[wave2-live]`, so a
 * failure raised by a helper names the suite that raised it rather
 * than arriving as an anonymous throw from inside a fixture. That
 * does not extend to a case's own assertion failures and nothing
 * here re-wraps one: vitest renders an assertion error's expected
 * and actual as the diff that says what differed, and the rule the
 * case stands for is in its name.
 */
import type { DomainStore } from '../../src/domains/index.js';
import type { DomainRecord } from '../../src/domains/store.js';
import type { StoreWindow } from '../../src/http/schemas.js';
import type { TopicRecord, TopicStore } from '../../src/topics/store.js';
import type { Pool } from 'pg';

import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';

import { StoreRefusal } from '../../src/db/store-errors.js';
import { createDbDomainStore } from '../../src/domains/index.js';
import { createDbTopicStore } from '../../src/topics/db-store.js';

import {
  applyMigrations,
  createLiveDb,
  createLivePool,
  describeLivePg,
  resetTables,
} from './live-postgres.js';

/**
 * The slug the domain every case plants sits under.
 *
 * `example-tech-radar` is the seeded worked example, so this fixture
 * stays in the register `data/domains.json` set: neutral about the
 * subject, and recognisable as an example rather than as anybody's
 * deployment. `tests/live/api.live.test.ts` plants under the same
 * slug and the two files never meet — every case in both truncates
 * first.
 */
const RADAR = 'example-tech-radar';

/** Its operator-facing label. */
const RADAR_NAME = 'Radar';

/**
 * A second domain, and the two readings it is here for.
 *
 * `listTopics` and `countTopics` both take a `domain_id`, so a
 * `WHERE` that had stopped narrowing needs a second domain to be
 * visible at all; and `topics_domain_id_name_unique` is over two
 * columns, so an index declared over `name` alone needs a second
 * domain to refuse. A database holding one domain is green under
 * both faults.
 */
const TRANSIT = 'example-urban-transit';

/** Its label. */
const TRANSIT_NAME = 'Transit';

/**
 * The topic written FIRST and answered LAST.
 *
 * The three names below are planted in an order that is neither
 * their name order nor its reverse, and `topics.id` is a
 * `bigserial`, so insertion order and id order are one list and the
 * answered order is a third. A read answering either of the first
 * two is a different page, which is what makes the window assertion
 * a reading rather than a restatement.
 */
const TRANSFORMERS = 'transformers';

/** The topic answered FIRST, and written second. */
const EDGE = 'edge inference';

/** The topic in the middle of the answered page, written last. */
const RETRIEVAL = 'retrieval augmentation';

/**
 * The one topic the second domain carries.
 *
 * Its name sorts BETWEEN {@link EDGE} and {@link RETRIEVAL}, so a
 * list whose `WHERE` had stopped narrowing answers it at exactly the
 * offset the windowed read below asks for: one row, the right shape,
 * the wrong domain's topic. The window reading and the scope reading
 * are then one assertion rather than two that happen to agree.
 */
const LIGHT_RAIL = 'light rail';

/** The name a patch renames a topic to. */
const RENAMED = 'long context';

/**
 * The terms every planted topic carries.
 *
 * Written in an order that is neither sorted nor its reverse.
 * `search_terms` is a jsonb ARRAY and an array preserves element
 * order, so this list coming back as it went in is what the
 * replace-whole rule rests on rather than a formality — and it is
 * expressly NOT the key-reordering reading, which needs a jsonb
 * OBJECT and which this table cannot give.
 */
const PLANTED_TERMS: readonly string[] = [
  'sparse attention',
  'model distillation',
  'quantisation',
];

/**
 * What a patch replaces that list with.
 *
 * Two members where the planted list has three, and sharing none of
 * its names, so a store merging the two answers five and a store
 * replacing whole answers these two. A shorter list is the direction
 * that matters: a longer one is equally consistent with an append.
 */
const REPLACED_TERMS: readonly string[] = [
  'retrieval augmentation',
  'vector recall',
];

/** The cadence every planted topic runs at, in seconds. */
const HOURLY = 3600;

/** The floor a planted topic is bounded below by, in seconds. */
const FLOOR = 600;

/** The ceiling a planted topic is bounded above by, in seconds. */
const CEILING = 86400;

/**
 * A window wider than anything this file plants.
 *
 * What a window SELECTS is `src/topics/routes.test.ts`'s claim and
 * not this file's; here it is wide on purpose, so no reading taken
 * through it can depend on where a row happened to fall.
 */
const WHOLE: StoreWindow = { limit: 50, offset: 0 };

/**
 * One row, taken out of the middle of a three-row collection.
 *
 * Narrower than the collection on purpose, and offset from its start
 * for the same reason: a page as wide as what it pages over cannot
 * report a `LIMIT` that stopped limiting, and an offset of zero
 * cannot report an `OFFSET` that stopped offsetting.
 */
const MIDDLE: StoreWindow = { limit: 1, offset: 1 };

/**
 * A window that starts past the end of every collection here.
 *
 * The port says an empty page is not a failure to read, so this is
 * the shape that says so: a window past the end, a domain with no
 * topics and an id no domain carries are all the empty list rather
 * than an error.
 */
const PAST_END: StoreWindow = { limit: 50, offset: 50 };

/**
 * The first id `topics` issues, which the reset is what guarantees.
 *
 * `resetTables` truncates with `RESTART IDENTITY`, so every sequence
 * is back at 1 when a case starts. Reading this off the first row
 * planted is therefore a reading of the database's own identity
 * rather than of an id that merely happens to be free.
 */
const FIRST_ID = 1;

/**
 * An id no topic carries in any case below.
 *
 * No case here plants anywhere near this many rows, so a lookup
 * naming it is a row that genuinely is not there rather than one
 * that merely has not been written yet.
 */
const ABSENT_ID = 9999;

/**
 * The instant the schedule case writes first.
 *
 * Its millisecond component is non-zero deliberately. A
 * `timestamptz` holds microseconds and a JavaScript `Date` holds
 * milliseconds, so the whole value survives the round trip — where a
 * column at second resolution, or a store rounding on the way
 * through, answers this instant with its `.457` gone and nothing
 * else in the case notices.
 */
const DUE_AT = new Date('2026-09-14T06:15:22.457Z');

/**
 * The instant a second schedule write moves it to, and it is
 * EARLIER.
 *
 * Earlier rather than later so one write reads as two claims: that
 * the column takes a second write at all, and that a time in the
 * PAST is stored rather than refused. Nothing constrains it — no
 * CHECK, no trigger — and an overdue row is exactly what
 * `POST /topics/:id/run-now` writes whenever the clock has already
 * passed the stored time.
 */
const OVERDUE_AT = new Date('2026-09-13T23:59:59.001Z');

/**
 * The unique key on `(topics.domain_id, topics.name)`.
 *
 * Spelled in `src/db/schema/scheduling.ts`, so asserting it is a
 * reading of the migration rather than of the driver: a name
 * Postgres derived for itself would not be greppable in this
 * repository at all.
 */
const TOPIC_NAME_KEY = 'topics_domain_id_name_unique';

/**
 * The SQLSTATE a `unique_violation` arrives with.
 *
 * Read off the driver error the refusal kept on `cause` rather than
 * off the refusal itself, and that split is the point:
 * `StoreRefusal.reason` is what `classifyPgError` DECIDED, and this
 * is what the server raised. `src/db/store-errors.ts` maps the two,
 * and a mapping gone wrong answers the right reason from the wrong
 * code.
 */
const UNIQUE_VIOLATION = '23505';

/**
 * Every member `TOPIC_COLUMNS` in `src/topics/db-store.ts` projects,
 * which on this table is every column it has.
 *
 * Four of the nine are the table's own and five arrive through the
 * `schedulableColumns()` spread, which is why this list is asserted
 * as a SET beside the field reads rather than instead of them: a
 * column added to that one helper reaches this table with no file
 * under `src/topics/` edited, and no assertion naming a member
 * notices a member arriving.
 */
const TOPIC_KEYS = [
  'domainId',
  'enabled',
  'id',
  'intervalSeconds',
  'maxIntervalSeconds',
  'minIntervalSeconds',
  'name',
  'nextRunAt',
  'searchTerms',
] as const satisfies readonly (keyof TopicRecord)[];

/**
 * `true` only while `L` names every key of `T`.
 *
 * The tuple wrapper is load-bearing rather than decoration: without
 * it the union distributes over the conditional and the answer is
 * `boolean`, which accepts `true` as an initializer and pins nothing
 * at all.
 *
 * @typeParam T - The type whose keys must all be named.
 * @typeParam L - The list naming them, as `typeof <the const>`.
 */
type CoversEveryKey<T, L extends readonly PropertyKey[]> =
  [Exclude<keyof T, L[number]>] extends [never] ? true : false;

/** {@link TOPIC_KEYS}, held against the record it describes. */
type EveryKeyListed = CoversEveryKey<TopicRecord, typeof TOPIC_KEYS>;

/**
 * The half of the drift guard `check-types` owns.
 *
 * The `satisfies` clause above closes the direction where a list
 * names a member its record lacks; this one closes the direction
 * that actually matters, a record growing a member no list knows
 * about. That turns {@link EveryKeyListed} into `false` and this
 * initializer into a TS2322 at this line — before any case can
 * compare an answer against a set that has quietly stopped
 * describing it. Read by a case below, so it is a symbol this file
 * uses rather than one lint reports.
 */
const EVERY_KEY_LISTED: EveryKeyListed = true;

/** {@link TOPIC_KEYS}, sorted at use rather than by hand. */
const TOPIC_KEY_SET: readonly string[] = [...TOPIC_KEYS].sort();

/**
 * The sorted key set of one answered record.
 *
 * @param row - Whatever a store handed back.
 * @returns Its own keys, sorted, ready for a set comparison.
 */
function keysOf(row: object): readonly string[] {
  return Object.keys(row).sort();
}

/**
 * The value a live read was supposed to answer.
 *
 * A read that came back null breaks the case in its SETUP, where a
 * missing row and a wrong value otherwise read alike — so the
 * refusal names what was being read rather than leaving every
 * assertion below it to fail against a null.
 *
 * @param value - Whatever the read answered.
 * @param read - What was being read, quoted back in the refusal.
 * @returns The value, without the `null`.
 * @throws Error When the read answered null.
 */
function present<T>(value: T | null, read: string): T {
  if (value === null) {
    throw new Error(
      `[wave2-live] reading ${read} answered null, so every assertion `
      + 'below it would be about nothing.',
    );
  }

  return value;
}

/**
 * The refusal a live write was supposed to raise.
 *
 * Throws on both of the shapes that are not one. A call that
 * ANSWERED leaves every assertion below it about a refusal nobody
 * built, and a thrown value that is not a `StoreRefusal` is the one
 * thing every implementation of this port promises never to raise —
 * so rethrowing it here is what says a driver error crossed the port
 * translated rather than raw, which is the containment boundary
 * `src/topics/db-store.ts` wraps its writes in.
 *
 * @param run - The call expected to be refused.
 * @returns The refusal it raised.
 * @throws Error When the call answered instead.
 */
async function refusalFrom(
  run: () => Promise<unknown>,
): Promise<StoreRefusal> {
  try {
    await run();
  } catch (err) {
    if (err instanceof StoreRefusal) {
      return err;
    }

    throw err;
  }

  throw new Error(
    '[wave2-live] expected a StoreRefusal and the call answered, so '
    + 'the refusal asserted below was never raised at all.',
  );
}

/**
 * How many times a needle occurs in some text.
 *
 * A count rather than a boolean, so a zero can be read beside a
 * known positive taken by the same function over the same string in
 * the same case.
 *
 * @param haystack - The text to search.
 * @param needle - The string to count.
 * @returns The number of occurrences.
 */
function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

/**
 * The two domains and the four topics the page cases plant.
 *
 * Named members rather than an array, so a case reads a planted row
 * by what it is rather than by an index `noUncheckedIndexedAccess`
 * would make optional anyway.
 */
interface PlantedPage {
  /** The domain the window and the cascade are read over. */
  readonly domain: DomainRecord;

  /** The domain that proves the scope and the two-column key. */
  readonly other: DomainRecord;

  /** Written first, answered last. */
  readonly transformers: TopicRecord;

  /** Written second, answered first. */
  readonly edge: TopicRecord;

  /** Written last, answered in the middle. */
  readonly retrieval: TopicRecord;

  /** The second domain's only topic. */
  readonly lightRail: TopicRecord;
}

describeLivePg('wave-2 stores (live Postgres)', () => {
  let pool: Pool;
  let db: ReturnType<typeof createLiveDb>;

  // Both stores are built before the pool exists, which is the
  // ordering the thunk in each of them is there for: `src/index.ts`
  // builds these same stores while `createService` is still
  // registering, and that is before the Postgres dependency has
  // started. Constructing them here touches nothing — a store
  // that resolved `db` eagerly would capture an undefined and fail
  // every case in this file, which is this run's reading of that
  // claim.
  // `createDbDomainStore` comes through `src/domains/index.js` and
  // not through the module declaring it, which is the containment
  // that barrel states about itself. `src/topics/` carries no
  // barrel, so its constructor is a deep import.
  const domainStore: DomainStore = createDbDomainStore(() => db);
  const topicStore: TopicStore = createDbTopicStore(() => db);

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
 * Writes one topic, with the cadence and the bounds every case below
 * shares.
   *
 * BOTH BOUNDS ARE PLANTED NON-NULL, which is what lets the patch
 * case clear one and leave the other standing. A fixture carrying
 * neither is blind to a clear that stopped clearing, and one
 * carrying both as null is blind to a write that stopped writing;
 * one row carrying both reads in both directions at once.
   *
   * @param domainId - The domain to hang it off.
   * @param name - Its name, the other half of the natural key.
   * @returns The stored row, as the database answered it.
   */
  async function plantTopic(
    domainId: number,
    name: string,
  ): Promise<TopicRecord> {
    return await topicStore.insertTopic({
      domainId,
      name,
      searchTerms: PLANTED_TERMS,
      intervalSeconds: HOURLY,
      enabled: true,
      minIntervalSeconds: FLOOR,
      maxIntervalSeconds: CEILING,
    });
  }

  /**
 * Writes two domains, three topics under the first and one under the
 * second.
   *
 * The three go in an order that is neither their name order nor its
 * reverse, so every ordering assertion below is taken against a
 * table whose insertion order, id order and answered order are three
 * different lists.
   *
   * @returns All six stored rows.
   */
  async function plantPage(): Promise<PlantedPage> {
    const domain = await plantDomain(RADAR, RADAR_NAME);
    const other = await plantDomain(TRANSIT, TRANSIT_NAME);
    const transformers = await plantTopic(domain.id, TRANSFORMERS);
    const edge = await plantTopic(domain.id, EDGE);
    const retrieval = await plantTopic(domain.id, RETRIEVAL);
    const lightRail = await plantTopic(other.id, LIGHT_RAIL);

    return { domain, other, transformers, edge, retrieval, lightRail };
  }

  it('meets an empty database in every case', async () => {
    // The precondition every case below rests on, taken as a
    // reading rather than left to a comment: each of them plants
    // everything it reads, so a row surviving between cases would
    // make some later assertion true for a reason nobody wrote.
    // Read through the stores rather than through SQL, which makes
    // the zeros a reading of the projections as well as of the
    // tables. It is NOT a reading of the `TABLES` roster in
    // `./live-postgres.ts`, and the comment this one was adapted
    // from claimed that it was: `resetTables` truncates with
    // `CASCADE`, so every table referencing `domains` goes with it
    // whether or not the roster names it, and dropping `topics`
    // from that list reddens none of these cases. What this case
    // does report is the precondition itself.
    expect(await domainStore.countDomains()).toBe(0);
    expect(await topicStore.countTopics(FIRST_ID)).toBe(0);
    expect(await topicStore.listTopics(FIRST_ID, WHOLE)).toStrictEqual([]);
    expect(await topicStore.findTopicById(FIRST_ID)).toBeNull();
    expect(await topicStore.deleteTopic(FIRST_ID)).toBe(false);
  });

  it('holds the key list against the record it describes', () => {
    // The runtime half of the drift guard: the pin above is what
    // `check-types` reads, and a symbol nothing uses is a lint
    // error, so the two obligations are discharged by one line.
    expect(EVERY_KEY_LISTED).toBe(true);
    expect(TOPIC_KEY_SET).toHaveLength(TOPIC_KEYS.length);
  });

  it('writes an unscheduled topic the database numbers', async () => {
    const domain = await plantDomain(RADAR, RADAR_NAME);
    const created = await plantTopic(domain.id, TRANSFORMERS);

    // The whole key set beside the field reads, never instead of
    // them, for the reason {@link TOPIC_KEYS} gives: five of these
    // nine arrive through a spread `export_subscriptions` shares,
    // so a column added there lands here with nothing under
    // `src/topics/` edited at all.
    expect(keysOf(created)).toStrictEqual(TOPIC_KEY_SET);
    expect(created.domainId).toBe(domain.id);
    expect(created.name).toBe(TRANSFORMERS);
    expect(created.intervalSeconds).toBe(HOURLY);
    expect(created.minIntervalSeconds).toBe(FLOOR);
    expect(created.maxIntervalSeconds).toBe(CEILING);
    expect(created.enabled).toBe(true);

    // `bigserial` in `number` mode is what makes the id a number
    // here and the string a raw pg driver hands back. The reset
    // restarts every sequence, so this is the first id the table
    // issues rather than one that merely happens to be free.
    expect(typeof created.id).toBe('number');
    expect(created.id).toBe(FIRST_ID);

    // THE ROW LANDS UNSCHEDULED, and that is the column having no
    // default rather than a decision this store took: `next_run_at`
    // is absent from the `values` list because `InsertTopicInput`
    // carries no member that could fill it, so Postgres stores
    // NULL. Scheduling it is the separate act a case below takes.
    expect(created.nextRunAt).toBeNull();

    // The jsonb array crossed the driver as text and came back
    // parsed, in the order it went in. That is what the
    // replace-whole rule rests on and it is NOT the key-reordering
    // reading `tests/live/api.live.test.ts` takes over
    // `domains.settings`, which needs a jsonb OBJECT this table
    // does not have.
    expect(created.searchTerms).toStrictEqual(PLANTED_TERMS);

    // Read back through the id every request naming `/topics/:id`
    // enters by, compared whole so the read and the write are
    // pinned to one projection rather than to two that agree today.
    const read = present(
      await topicStore.findTopicById(created.id),
      'findTopicById after the insert',
    );

    expect(read).toStrictEqual(created);
    expect(await topicStore.countTopics(domain.id)).toBe(1);
  });

  it('refuses a name the domain already carries', async () => {
    const domain = await plantDomain(RADAR, RADAR_NAME);
    const other = await plantDomain(TRANSIT, TRANSIT_NAME);
    const first = await plantTopic(domain.id, TRANSFORMERS);

    // Every member but the name differs from the planted row, so a
    // refusal that wrote anyway is visible: a duplicate spelled
    // identically would leave the stored row unchanged either way.
    const refusal = await refusalFrom(() => topicStore.insertTopic({
      domainId: domain.id,
      name: TRANSFORMERS,
      searchTerms: REPLACED_TERMS,
      intervalSeconds: FLOOR,
      enabled: false,
      minIntervalSeconds: null,
      maxIntervalSeconds: null,
    }));

    expect(refusal.reason).toBe('unique-violation');
    expect(refusal.constraint).toBe(TOPIC_NAME_KEY);

    // THE SQLSTATE IS THE SERVER'S AND THE REASON IS THIS
    // REPOSITORY'S, so the two are read separately. A classifier
    // mapping the wrong code onto the right reason answers the
    // line above and fails the line below. It is read off the
    // `cause` chain drizzle wraps the driver error in, which is the
    // only place it survives the port.
    const cause = refusal.cause as { code?: unknown; detail?: unknown };

    expect(cause.code).toBe(UNIQUE_VIOLATION);

    // NOTHING THE CALLER SUBMITTED IS ON THE REFUSAL, and this is
    // where that zero has a live positive control. The pg error
    // spells `Key (domain_id, name)=(...)` with the submitted name
    // in it, and `errorHandler` logs an unhandled error together
    // with its `cause`, so the two zeros are read beside a known
    // positive taken by the same function over the same string. No
    // in-memory store can supply that control: its refusals are
    // built from a reason and a name this repository chose, so
    // there was never anything there to have leaked.
    const carried = String(cause.detail);
    const serialised = JSON.stringify(refusal);

    expect(countOccurrences(carried, TRANSFORMERS)).toBe(1);
    expect(countOccurrences(serialised, TRANSFORMERS)).toBe(0);
    expect(countOccurrences(refusal.message, TRANSFORMERS)).toBe(0);

    // THE KEY IS PER-DOMAIN. The same name, under the second
    // domain, lands — an index declared over `name` alone would
    // refuse this too, and every count in every other case here
    // would still add up.
    const elsewhere = await plantTopic(other.id, TRANSFORMERS);

    expect(elsewhere.name).toBe(first.name);
    expect(elsewhere.domainId).toBe(other.id);

    // THE REFUSED INSERT SPENT AN ID. A `bigserial` is read while
    // the row is formed and the index refuses it afterwards, and a
    // sequence does not roll back — so the topic that lands next
    // is two higher rather than one. The reset is what makes that
    // deterministic here, and it is fidelity the in-memory store
    // had to be written to imitate rather than one it would have.
    expect(first.id).toBe(FIRST_ID);
    expect(elsewhere.id).toBe(first.id + 2);

    // And the refusal wrote nothing: the domain still holds the one
    // topic the first write gave it, spelled as that write spelled
    // it.
    expect(await topicStore.countTopics(domain.id)).toBe(1);
    expect(present(
      await topicStore.findTopicById(first.id),
      'findTopicById after the refused duplicate',
    )).toStrictEqual(first);
  });

  it('reads one window of a domain topic list in name order', async () => {
    const planted = await plantPage();
    const whole = await topicStore.listTopics(planted.domain.id, WHOLE);

    expect(whole.map((row) => row.name))
      .toStrictEqual([EDGE, RETRIEVAL, TRANSFORMERS]);
    expect(whole.map((row) => row.id)).toStrictEqual([
      planted.edge.id,
      planted.retrieval.id,
      planted.transformers.id,
    ]);

    // The control that says the order is the `ORDER BY`'s: the ids
    // the table issued are the insertion order, and that is a
    // different list. Without it the assertion above is equally
    // green against a read with no `ORDER BY` at all.
    expect([
      planted.transformers.id,
      planted.edge.id,
      planted.retrieval.id,
    ]).toStrictEqual([FIRST_ID, FIRST_ID + 1, FIRST_ID + 2]);

    // ONE ROW OUT OF THE MIDDLE. A `LIMIT` that stopped limiting
    // answers three rows and an `OFFSET` that stopped offsetting
    // answers `edge inference`, and both are green against a window
    // as wide as the collection it pages over.
    const page = await topicStore.listTopics(planted.domain.id, MIDDLE);

    expect(page.map((row) => row.name)).toStrictEqual([RETRIEVAL]);
    expect(page.map((row) => row.id)).toStrictEqual([planted.retrieval.id]);

    // AND THE SECOND DOMAIN IS WHY THIS IS ALSO A SCOPE READING.
    // `light rail` sorts between `edge inference` and `retrieval
    // augmentation`, so a `WHERE` that had stopped narrowing
    // answers it at exactly this offset: one row, the right shape,
    // the wrong domain's topic.
    expect(planted.lightRail.name).toBe(LIGHT_RAIL);
    expect(await topicStore.listTopics(planted.other.id, WHOLE))
      .toStrictEqual([planted.lightRail]);

    // THE TOTAL DESCRIBES THE COLLECTION RATHER THAN THE PAGE,
    // which is why `countTopics` is a second statement rather than
    // a member of the read above. A count that had stopped
    // narrowing answers four, the table holding one row more than
    // this domain does.
    expect(await topicStore.countTopics(planted.domain.id)).toBe(3);
    expect(await topicStore.countTopics(planted.other.id)).toBe(1);

    // A window past the end of the collection is an empty page and
    // not a refusal, per the port, and so is a domain no row points
    // at.
    expect(await topicStore.listTopics(planted.domain.id, PAST_END))
      .toStrictEqual([]);
    expect(await topicStore.listTopics(ABSENT_ID, WHOLE))
      .toStrictEqual([]);
    expect(await topicStore.countTopics(ABSENT_ID)).toBe(0);
  });

  it('rewrites what a patch names and leaves the rest', async () => {
    const domain = await plantDomain(RADAR, RADAR_NAME);
    const planted = await plantTopic(domain.id, TRANSFORMERS);

    // Scheduled BEFORE the patch, so the containment reading below
    // is about a column carrying a value rather than about a null
    // that was already there: a patch reaching `next_run_at` and a
    // patch leaving it alone answer the same thing on an
    // unscheduled row.
    const scheduled = present(
      await topicStore.updateTopicSchedule(planted.id, DUE_AT),
      'updateTopicSchedule before the patch',
    );

    // The fixture guard in the form a dropped projection cannot
    // satisfy: `not.toBeNull()` is green against a member answered
    // as `undefined`, where reading the type is not.
    expect(scheduled.nextRunAt).toBeInstanceOf(Date);

    const patched = present(
      await topicStore.updateTopic(planted.id, {
        name: RENAMED,
        searchTerms: REPLACED_TERMS,
        minIntervalSeconds: null,
      }),
      'updateTopic naming three members',
    );

    expect(keysOf(patched)).toStrictEqual(TOPIC_KEY_SET);
    expect(patched.id).toBe(planted.id);
    expect(patched.name).toBe(RENAMED);

    // REPLACED WHOLE AND NOT MERGED INTO. A `set` list assigns a
    // jsonb column rather than merging into it, so the two members
    // sent are the two members stored — where a merge answers
    // five, the three planted terms sharing none of their names
    // with these.
    expect(patched.searchTerms).toStrictEqual(REPLACED_TERMS);

    // ABSENT AND `null` ARE DIFFERENT REQUESTS, and the statement
    // keeps them apart with no branch of its own: drizzle drops
    // every `undefined` from a `set` list before rendering it, so
    // the omitted ceiling never reaches the SQL and the stored
    // value stands, while the explicit null is written and clears
    // the floor. One fixture row carrying both bounds is what lets
    // the two directions be read at once.
    expect(patched.minIntervalSeconds).toBeNull();
    expect(patched.maxIntervalSeconds).toBe(CEILING);

    // Nothing the patch did not name moved, the due time included:
    // `TopicPatch` declares no member that could carry one, so the
    // containment is a type rather than a check this store could
    // forget.
    expect(patched.domainId).toBe(domain.id);
    expect(patched.intervalSeconds).toBe(HOURLY);
    expect(patched.enabled).toBe(true);
    expect(present(patched.nextRunAt, 'the patched due time').getTime())
      .toBe(DUE_AT.getTime());

    // And the stored row agrees with what the `RETURNING` list
    // answered, which is what says the update wrote rather than
    // reported.
    expect(present(
      await topicStore.findTopicById(planted.id),
      'findTopicById after the patch',
    )).toStrictEqual(patched);

    // THE EMPTY PATCH READS RATHER THAN WRITES, and this
    // implementation is the reason the port declares it at all:
    // `topics` has no timestamp to stamp, so a patch naming no
    // member leaves an empty `set` list and drizzle answers that
    // with `No values to set` rather than with a harmless
    // statement. An in-memory map hands the row back without
    // noticing it was asked for nothing, so the branch avoiding the
    // throw is invisible over there and is exercised here.
    expect(await topicStore.updateTopic(planted.id, {}))
      .toStrictEqual(patched);

    // An id no row carries is null rather than a throw, on a patch
    // that names members and on one that names none.
    expect(await topicStore.updateTopic(ABSENT_ID, { name: RENAMED }))
      .toBeNull();
    expect(await topicStore.updateTopic(ABSENT_ID, {})).toBeNull();
  });

  it('stores a due time and reads the same instant back', async () => {
    const domain = await plantDomain(RADAR, RADAR_NAME);
    const planted = await plantTopic(domain.id, TRANSFORMERS);

    // The control: the row is unscheduled before the write, so what
    // is read afterwards is a value this case put there.
    expect(planted.nextRunAt).toBeNull();

    const scheduled = present(
      await topicStore.updateTopicSchedule(planted.id, DUE_AT),
      'updateTopicSchedule on the planted topic',
    );
    const due = present(scheduled.nextRunAt, 'the stored due time');

    // A `timestamptz` HOLDS MICROSECONDS AND A `Date` HOLDS
    // MILLISECONDS, so the whole value survives — and the
    // millisecond component is what says so. A column at second
    // resolution, or a store rounding on the way through, answers
    // this instant with its `.457` gone and every other assertion
    // in this case still passes.
    expect(due).toBeInstanceOf(Date);
    expect(due.getTime()).toBe(DUE_AT.getTime());
    expect(due.toISOString()).toBe(DUE_AT.toISOString());
    expect(due.getMilliseconds()).toBe(DUE_AT.getMilliseconds());

    // THE INSTANT CROSSED THE DRIVER AND CAME BACK PARSED, which is
    // a reading no in-memory implementation can be made to fail: a
    // map answering the `Date` it was handed and a map answering
    // its stored copy are two readings of one object graph, where
    // this is a serialise on the way in and a parse on the way out.
    expect(due).not.toBe(DUE_AT);

    // NOTHING BUT THE ONE COLUMN MOVED. Compared against the row as
    // it was, member for member, with only the due time permitted
    // to differ — and the assertions above that the due time DID
    // move are what stop a write that stored nothing satisfying
    // this.
    expect({ ...scheduled, nextRunAt: null }).toStrictEqual(planted);

    // The stored row agrees with the `RETURNING` list, so the write
    // landed in the column rather than only in the answer.
    expect(present(
      await topicStore.findTopicById(planted.id),
      'findTopicById after the schedule write',
    )).toStrictEqual(scheduled);

    // A SECOND WRITE MOVES IT, AND BACKWARDS. Nothing constrains
    // this column — no CHECK, no trigger — so a time in the
    // past is an overdue row rather than an invalid one, which is
    // exactly what `POST /topics/:id/run-now` writes whenever the
    // clock has already passed the stored time.
    const moved = present(
      await topicStore.updateTopicSchedule(planted.id, OVERDUE_AT),
      'updateTopicSchedule a second time',
    );

    expect(OVERDUE_AT.getTime()).toBeLessThan(DUE_AT.getTime());
    expect(present(moved.nextRunAt, 'the rewritten due time').getTime())
      .toBe(OVERDUE_AT.getTime());

    // An id no row carries is null rather than a throw.
    expect(await topicStore.updateTopicSchedule(ABSENT_ID, DUE_AT))
      .toBeNull();
  });

  it('takes the topics with the domain', async () => {
    const planted = await plantPage();

    // The control that the zeros below are REMOVALS: without it a
    // cascade that took nothing and one that took everything leave
    // the same counts behind.
    expect(await topicStore.countTopics(planted.domain.id)).toBe(3);
    expect(await topicStore.countTopics(planted.other.id)).toBe(1);

    // THE CASCADE IS ONE STATEMENT AND POSTGRES RUNS IT.
    // `topics.domain_id` is declared `ON DELETE cascade`, so this
    // single `DELETE` takes every topic with it: no method on
    // `TopicStore` takes part and `deleteTopic` is never called. An
    // in-memory store imitates that by looping its own maps, so the
    // isolated suite proves only that somebody wrote the loop.
    expect(await domainStore.deleteDomain(planted.domain.id)).toBe(true);

    // Read BY ID as well as by domain, which is the stronger half:
    // a `WHERE domain_id = $1` answering zero is equally satisfied
    // by rows that survived under a domain that is gone.
    expect(await topicStore.findTopicById(planted.transformers.id))
      .toBeNull();
    expect(await topicStore.findTopicById(planted.edge.id)).toBeNull();
    expect(await topicStore.findTopicById(planted.retrieval.id))
      .toBeNull();
    expect(await topicStore.countTopics(planted.domain.id)).toBe(0);
    expect(await topicStore.listTopics(planted.domain.id, WHOLE))
      .toStrictEqual([]);

    // And the second domain kept everything it had. A cascade that
    // had stopped narrowing answers every zero above while taking
    // the whole table with it.
    expect(await domainStore.countDomains()).toBe(1);
    expect(await topicStore.countTopics(planted.other.id)).toBe(1);
    expect(await topicStore.listTopics(planted.other.id, WHOLE))
      .toStrictEqual([planted.lightRail]);
  });
});
