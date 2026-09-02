/**
 * The wave-2 topics and sources stores driven against a real
 * Postgres, through the real migrations. The topics half: a domain
 * written, topics hung off it, the one key that table can refuse a
 * write with, a window taken out of the collection, a patch, the
 * schedule column written through its single door, and the cascade
 * that takes the whole lot away with the domain. The sources half: a
 * corpus hung off a page of feeds, the parse-status aggregate folded
 * over it, the two foreign keys that refuse a source delete, and the
 * failures queue paged newest first over a tie the server itself
 * made. Self-skips when AR_LIVE_DATABASE_URL is unset — run via:
 *
 *   bun run stress:start && bun run test:live && bun run stress:stop
 *
 * WHAT ONLY A SERVER CAN ANSWER is why this file is worth its
 * container, and it is not the rules. Every decision either surface
 * takes — the 404 for an unknown slug, the 409 for a name the domain
 * already carries, the 409 for a run-now against a disabled row, the
 * 409 carrying the counts a source delete would have taken — is a
 * decision about rows, and `tests/helpers/memory-research-store.ts`
 * supplies rows with no database, so all of it is already pinned by
 * the service and routes suites under `src/topics/` and
 * `src/sources/`. What is left is the half those suites structurally
 * cannot reach: every operation below is SQL, and a statement that
 * is valid drizzle and invalid SQL passes `lint`, `check-types` and
 * the entire isolated suite. A projection naming a column the
 * migration never created, an `ORDER BY` on the wrong column, a
 * `WHERE` that stopped narrowing, a `GROUP BY` folded onto the wrong
 * row, a `RETURNING` list drifted from the `SELECT` beside it — each
 * is reported here and nowhere else.
 *
 * ELEVEN READINGS BELOW ARE THINGS AN IN-MEMORY MAP CANNOT DO, which
 * is the same argument put sharply enough to be checkable. Twelve
 * capitalised paragraphs carry those eleven: six are the topics
 * half's, written across seven paragraphs because the window and the
 * scope are one reading taken from two sides, and five are the
 * sources half's. The two paragraphs after them are the other kind —
 * one names a reading these tables cannot give, and the last is a
 * `check-types` leg rather than a live one.
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
 * THE AGGREGATE IS ONE `GROUP BY` AND ITS FILTER IS A THREE-VALUED
 * ONE. The parse-status counts for a whole page come out of a single
 * `GROUP BY (source_id, parse_status)` narrowed by an `IN` list of
 * that page's own ids, and `NULL IN (...)` is UNKNOWN in SQL rather
 * than false — so a capture that came through no feed at all cannot
 * form a group, however many of them the corpus holds. A map
 * filtering by membership answers true or false and has no third
 * value to be wrong about, so the row this file plants with a null
 * `source_id` is a control only a server can be held to.
 *
 * THE TWO ABSENCE SHAPES OF A ZERO-FILLED FOLD EXERCISE DIFFERENT
 * LINES, and a fixture carrying one of them leaves half the fold
 * unproven while every assertion still reads like a complete claim.
 * A source whose captures ALL parsed contributes a group under one
 * status and none under the other, so the missing member comes from
 * the record the fold was initialised with; a source that has
 * captured nothing contributes no group at all, so the lookup misses
 * and every member is the fallback. Both are planted, and the two
 * legs aimed at them redden one case each and different assertions
 * inside it.
 *
 * POSTGRES REFUSES ON WHICHEVER KEY IT CHECKED FIRST, which is why
 * each delete case gets a subject holding ONE kind of dependent. A
 * source carrying a document AND a sighting answers
 * `documents_source_id_sources_id_fk` for both, so the second case
 * would pin the first key while reading as two. The sighting-only
 * subject is arranged the way the schema permits: it holds no
 * document of its own, and the sighting citing it hangs off a
 * finding over the OTHER source's capture. No in-memory
 * implementation has that ordering to be wrong about — a fake
 * refuses whichever guard its own code reaches first, and that order
 * is a line somebody wrote rather than a property of the row.
 *
 * THE QUEUE'S TIE IS ONE THE DATABASE PRODUCES. `captured_at`
 * defaults to `now()`, and `now()` is the TRANSACTION's instant
 * rather than the row's, so two documents written inside ONE
 * statement take a single value between them — the batch capture the
 * port names as its reason for putting `id` descending beside the
 * sort. This file plants that tie twice: once as a literal, so the
 * answered page is deterministic, and once through the column's own
 * default, which is the shape a deployment meets and which no map
 * can be made to produce. Every capture instant here is in the PAST
 * for that second half to work, and the case asserts the batched
 * stamp is the newer rather than assuming it.
 *
 * THE READ WROTE NOTHING IS A CLAIM ABOUT THE TABLE. `SourceStore`
 * declares two reads over `documents` and no write whatever, so the
 * review queue is read-only structurally rather than by convention —
 * but that is a statement about an interface, and an interface has
 * no runtime form. The census bracketing the queue's reads is taken
 * straight off `documents` rather than through the port, so a
 * statement that marked a row as seen, or moved one off `failed` as
 * it was worked, is a member that no longer matches. An in-memory
 * store cannot host that reading at all: its table IS the object
 * graph its reads answer from.
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
 * THE KEY-SET PINS ARE `check-types` LEGS rather than red cases, and
 * they are load-bearing on these tables rather than tidy. `topics`
 * does not declare its schedulable columns, it spreads
 * `schedulableColumns()` from `src/db/schema/scheduling.ts`, which
 * `export_subscriptions` spreads as well — so a column added to that
 * ONE helper for a scheduling mode nobody in `src/topics/` is
 * thinking about lands on this table with no file in that directory
 * edited at all. The sources side needs three of them because that
 * surface answers three shapes: the row, the row plus its
 * parse-status aggregate, and the queue's own column-scoped record.
 * No assertion naming a member notices a member ARRIVING, which is
 * what the four are for.
 *
 * THIRTY-TWO MUTATIONS WERE RUN AGAINST THESE THIRTEEN CASES, each
 * leg twice, with every red set identical across the two passes and
 * every leg collecting all thirteen. Four more are `check-types`
 * legs rather than red ones. Exactly one vitest leg reddened nothing
 * and it is recorded below as a scope boundary rather than repaired.
 * The figures are a measurement over this case list and nothing
 * else, so a task adding a case here re-derives the whole grid
 * rather than inheriting any of it — which is what the sources half
 * did, re-running the topics half's fourteen whole instead of
 * quoting them.
 *
 * ELEVEN OF THE TWELVE TOPICS LEGS CARRYING A RECORDED FIGURE CAME
 * BACK AT EXACTLY THAT FIGURE OUTSIDE THE FIVE CASES THE SOURCES
 * HALF ADDED, with their red SETS matching member for member and not
 * only their sizes, which is the reading that says they were rebuilt
 * rather than re-derived into neighbours. The twelfth is the
 * file-wide one: removing the reset from the `beforeEach` went from
 * seven of eight to twelve of thirteen, by exactly those five cases
 * and with the same survivor — the key-list case, which reads no
 * database at all. Exactly ONE recorded leg gained reds INSIDE the
 * new cases, and it is the one whose subject the two halves share:
 * dropping the constraint name from every refusal reaches both
 * delete cases as well as the duplicate-name one, at three rather
 * than one. The remaining two of the fourteen carry no recorded
 * figure and are measured here for the first time — deleting the
 * empty-patch early return reddens one, and storing a literal in
 * place of the insert's own `name` argument reddens four.
 *
 * EVERY ONE OF THE EIGHTEEN SOURCES LEGS LANDS WHOLLY INSIDE THE
 * FIVE NEW CASES, which is the shape a half added to an existing
 * grid predicts and is worth recording because it is what says the
 * two halves do not overlap. Eight reach the aggregate case and
 * eight reach the queue, at one red each where the fault is visible
 * in one place and two where a second case reads the same statement.
 * Most are told apart by the ASSERTION each fails, exactly as the
 * three refusal-translation legs above are; three groups of them
 * share one assertion and are separated by what it ANSWERED instead.
 * The two fold legs are that shape and they are the two absence
 * shapes: both land on the same whole-page comparison and differ by
 * which ROW of it is wrong — a source whose captures all parsed
 * missing a member, against a source that captured nothing carrying
 * no record at all — and neither is reachable from the other.
 *
 * THE QUEUE'S ORDER IS THE ASSERTION FOUR LEGS SHARE, AND THE
 * TIEBREAK IS THE ONE WORTH QUOTING. Dropping `id` descending from
 * the `ORDER BY` answered the tied pair the other way round —
 * measured, twice, rather than inferred — while reversing the sort
 * answered the whole page backwards, dropping the status filter
 * answered six rows where four were asked for, and having the read
 * UPDATE its own rows off `failed` answered none at all. What a lost
 * tiebreak costs a deployment is still not what that leg shows: the
 * order Postgres gives a tie it was not asked to break is one it
 * never promised, so this case pins the order the PAIR sort produces
 * and the port carries the argument about two pages disagreeing.
 *
 * THE CENSUS HAS EXACTLY ONE INSTRUMENT AND SAYING SO IS THE POINT.
 * `SourceStore` declares no method that writes a document, so no leg
 * over this port can move a `parse_status`, and the only edit
 * reaching the census equality is a synthetic write planted inside
 * the read itself. Two were run and they are not equivalent. Having
 * the queue UPDATE its own rows off `failed` is ABSORBED: it reddens
 * the in-band control that the reads answered at all, several
 * assertions before the census is compared, so the census pins
 * nothing under it. Having the queue INSERT one `ok` document
 * reaches the equality itself, which is the leg that says that
 * assertion is live — its two other reds are that insert failing its
 * own foreign key rather than a claim about the read.
 *
 * THE FOUR `check-types` PINS ARE FOUR DIRECTIONS AND NOT ONE. A
 * column added to `topics`, or to the `schedulableColumns()` spread
 * it shares with `export_subscriptions`, reddens the topics pin; a
 * column added to `SourceRecord` reddens BOTH source pins, the
 * record's and the list row's, the second being derived from the
 * first; and a column added to the queue's own projection reddens
 * the third alone. Measured by planting an optional member on each
 * record in turn: two diagnostics in this file for the source
 * record, one for the failure record, each a TS2322 at its own pin.
 * The runtime read beside them is what stops a member dropped from a
 * list being a diagnostic no case here would ever mention.
 *
 * THE ONE VITEST ZERO IS AN ABSORPTION, AND THE DDL CLAIMS HAVE NO
 * LEG AT ALL. `resetTables` truncates with `CASCADE`, so removing
 * `topics` from the `TABLES` list in `./live-postgres.ts` reddens
 * nothing — every table referencing `domains` goes whether the
 * roster names it or not, which is equally true of `sources` and of
 * `documents`. Separate from that zero, an `ON DELETE cascade`, a
 * `NOT NULL`, a CHECK and the two refusing foreign keys are all
 * declared in a migration, so the only edit that could break one
 * fails `applyMigrations` and takes the whole file down rather than
 * reddening a case. What the delete cases reach instead is the
 * store's own translation of what the server raised: rethrowing the
 * driver error raw, and swapping the two labels the dependent union
 * is read by, redden both of them at two apiece.
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
 * file is the topics and sources halves of the wave-2 live seam and
 * nothing else. The connectors and subscriptions legs — the two
 * unique keys, the format CHECK, a config column holding a secret
 * verbatim while the service answers it masked, and the jsonb
 * key-order reading this pair of tables cannot give — land in the
 * task that follows this one, into this same container. Until they
 * do, the `describe` name reads wider than the cases under it, which
 * is the shape a file assembled over three commits has and is stated
 * here so it is not read as coverage that went missing.
 *
 * ONE REFUSAL THE SOURCES PORT DECLARES IS NOT DRIVEN HERE, and its
 * absence is a scope line rather than an oversight.
 * `SourceStore.deleteSource` names THREE foreign keys and the two
 * counted ones are the two below;
 * `source_config_proposals_source_id_sources_id_fk` is the third,
 * the one the guard cannot count and the one that therefore arrives
 * at a caller unannounced. Reaching it needs a proposal row, which
 * is `src/sources/config-proposer.ts`'s subject rather than this
 * surface's, so what stands behind it here is the port's own
 * contract that both counted zeros are not a promise the delete will
 * land.
 *
 * EVERY ERROR THIS FILE CONSTRUCTS CARRIES `[wave2-live]`, so a
 * failure raised by a helper names the suite that raised it rather
 * than arriving as an anonymous throw from inside a fixture. That
 * does not extend to a case's own assertion failures and nothing
 * here re-wraps one: vitest renders an assertion error's expected
 * and actual as the diff that says what differed, and the rule the
 * case stands for is in its name.
 */
import type { DocumentParseStatus } from '../../src/db/schema/values.js';
import type { DomainStore } from '../../src/domains/index.js';
import type { DomainRecord } from '../../src/domains/store.js';
import type { StoreWindow } from '../../src/http/schemas.js';
import type {
  SourceFailureRecord,
  SourceRecord,
  SourceStore,
  SourceWithParseStats,
} from '../../src/sources/store.js';
import type { TopicRecord, TopicStore } from '../../src/topics/store.js';
import type { Pool } from 'pg';

import { asc, count } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';

import { DOCUMENT_PARSE_STATUSES } from '../../src/db/schema/values.js';
import {
  documents,
  findingSightings,
  findings,
} from '../../src/db/schema.js';
import { StoreRefusal } from '../../src/db/store-errors.js';
import { createDbDomainStore } from '../../src/domains/index.js';
import { createDbSourceStore } from '../../src/sources/db-store.js';
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
 * The endpoint of the source every aggregate and every queue
 * reading below is taken over.
 *
 * `example.test` is the register the sibling source suites plant in
 * — a reserved name that resolves nowhere, so a fixture endpoint
 * cannot be mistaken for an address somebody polls. Nothing here
 * fetches it: this port reads and writes rows about feeds and never
 * opens a socket to one.
 */
const FEED_ENDPOINT = 'https://example.test/radar/feed.xml';

/**
 * The endpoint of the source whose captures ALL parsed.
 *
 * One of the two absence shapes the aggregate has to answer, and
 * the one a fixture usually leaves out: this source contributes a
 * group to the `GROUP BY` under `ok` and NONE under `failed`, so
 * the missing member has to come from the record the fold was
 * initialised with rather than from the read.
 */
const QUIET_ENDPOINT = 'https://example.test/radar/releases.atom';

/**
 * The endpoint of the source that has captured NOTHING.
 *
 * The other absence shape, and it exercises a different line: this
 * source contributes no group at all, so the map lookup misses
 * entirely and every member of its record is a counted zero the
 * fallback supplied. A fixture carrying only one of the two shapes
 * leaves half the fold unproven while looking complete.
 */
const FRESH_ENDPOINT = 'https://example.test/radar/digest.json';

/** The endpoint of the second domain's only source. */
const TRANSIT_ENDPOINT = 'https://example.test/transit/feed.xml';

/** The endpoint of the source holding documents and no sightings.
 */
const HELD_ENDPOINT = 'https://example.test/radar/archive.json';

/** The endpoint of the source a sighting cites and nothing else.
 */
const CITED_ENDPOINT = 'https://example.test/radar/items';

/** The endpoint of the source nothing whatever points at. */
const FREE_ENDPOINT = 'https://example.test/radar/spare.xml';

/**
 * The transports the planted sources are configured under.
 *
 * Three different members of `SOURCE_KINDS` across one page, so
 * `kind` is not a constant down the answered column and a
 * projection reading the wrong one has somewhere to show it.
 */
const FEED_KIND = 'rss';

/** {@link QUIET_ENDPOINT}'s transport. */
const QUIET_KIND = 'api';

/** {@link FRESH_ENDPOINT}'s transport. */
const FRESH_KIND = 'url';

/**
 * How many of {@link FEED_ENDPOINT}'s captures parsed.
 *
 * Different from {@link FEED_FAILED} on purpose: a record built
 * with the two statuses swapped counts correctly whenever the two
 * members carry one number, so the aggregate assertion would be
 * green against a fold that had them the wrong way round.
 */
const FEED_OK = 2;

/** How many of them did not, and what the queue below pages. */
const FEED_FAILED = 4;

/** How many captures {@link QUIET_ENDPOINT} holds, all of them ok.
 */
const QUIET_OK = 1;

/** How many the second domain's source holds, every one failed. */
const TRANSIT_FAILED = 1;

/**
 * How many source-less captures the first domain holds.
 *
 * `documents.source_id` is NULLABLE — a file handed to the ingest
 * tray and a body an operator pasted in came through no feed — and
 * this row is the control on the grouped read's `IN` filter.
 * `NULL IN (...)` is UNKNOWN in SQL rather than true, so Postgres
 * cannot answer a group whose source is absent, and a filter that
 * had stopped narrowing would fold this row onto a page row instead
 * of failing loudly.
 */
const ORPHAN_FAILED = 1;

/** Every capture the corpus holds at `ok` once the plant is done.
 */
const CORPUS_OK = FEED_OK + QUIET_OK;

/** Every capture it holds at `failed`. */
const CORPUS_FAILED = FEED_FAILED + TRANSIT_FAILED + ORPHAN_FAILED;

/**
 * The instant the newest planted failed capture was taken at.
 *
 * EVERY CAPTURE INSTANT BELOW IS IN THE PAST, and that is load
 * bearing rather than flavour: the batched pair at the end of the
 * queue case takes the column's own `defaultNow()`, so `now()` has
 * to be newer than everything planted for those two rows to land
 * where that reading reads them. A literal in the FUTURE makes the
 * case pass until the day it is reached and then reverse itself,
 * with the clock as the only thing that changed. A past literal
 * stays past, so the ordering is the fixture's for good. The
 * scheduling constants above are the opposite for the opposite
 * reason: a due time is something a row is waiting for.
 *
 * Every instant below carries a non-zero millisecond component, for
 * the reason {@link DUE_AT} gives one column over: `captured_at` is
 * a `timestamptz`, and a column at second resolution answers these
 * with that component gone while the ORDER they come back in stays
 * exactly right.
 */
const NEWEST_AT = new Date('2025-11-19T09:30:11.735Z');

/**
 * The instant TWO failed captures share.
 *
 * A tie in the sort column is what the queue's second `ORDER BY`
 * term exists for, and this file plants one twice over: once as
 * this literal, so the answered page is deterministic, and once
 * through the column's own `defaultNow()` in a single statement
 * writing two rows — which is the shape the port names, and a
 * reading only a server can give.
 */
const TIED_AT = new Date('2025-11-19T08:00:00.500Z');

/** The instant the oldest failed capture was taken at. */
const OLDEST_AT = new Date('2025-11-18T22:41:03.219Z');

/** The instant the captures that PARSED were taken at. */
const PARSED_AT = new Date('2025-11-19T07:05:44.126Z');

/**
 * The foreign key that refuses a delete while the corpus holds the
 * source's documents.
 *
 * Spelled in `src/db/schema/documents.ts` as a reference with no
 * `onDelete`, so it emits `ON DELETE no action` and Postgres
 * refuses rather than cascading.
 */
const DOCUMENT_SOURCE_KEY = 'documents_source_id_sources_id_fk';

/**
 * The foreign key that refuses one while sightings cite it.
 *
 * Spelled in `src/db/schema/findings.ts`, which argues the refusal
 * more sharply than its neighbour: that table IS the provenance
 * record, so a cascade would drop syndication evidence a feed at a
 * time and every count taken afterwards would be lower with nothing
 * saying why.
 */
const SIGHTING_SOURCE_KEY = 'finding_sightings_source_id_sources_id_fk';

/**
 * The SQLSTATE a `foreign_key_violation` arrives with.
 *
 * Read off the driver error the refusal kept on `cause`, on the
 * same terms {@link UNIQUE_VIOLATION} is: the reason is what
 * `classifyPgError` DECIDED and this is what the server raised.
 */
const FOREIGN_KEY_VIOLATION = '23503';

/**
 * Every member `SOURCE_COLUMNS` in `src/sources/db-store.ts`
 * projects, which on this table is every column it has.
 *
 * Five of the twelve are the pipeline-owned columns no input type
 * carries, so this list is also where the read half of that
 * asymmetry is asserted: a projection that stopped answering
 * `cursor` or `flagged` is a source the surface can no longer
 * report the health of, and no assertion naming a member notices a
 * member going missing.
 */
const SOURCE_KEYS = [
  'consecutiveFailures',
  'contract',
  'cursor',
  'domainId',
  'enabled',
  'endpoint',
  'flagged',
  'id',
  'kind',
  'lastFailureAt',
  'lastSuccessAt',
  'parserConfig',
] as const satisfies readonly (keyof SourceRecord)[];

/**
 * What a LIST row carries on top of those twelve.
 *
 * Derived from the record's own list rather than written out again,
 * so the aggregate is the only difference the two shapes are
 * allowed to have.
 */
const LISTED_KEYS = [...SOURCE_KEYS, 'parseStats'] as const;

/**
 * Every member `FAILURE_COLUMNS` in `src/sources/db-store.ts`
 * projects: five of the fifteen `documents` carries.
 *
 * The narrowing is the record's subject rather than a trim for
 * size, so this list is the one place a column ARRIVING on the
 * queue would be reported — `raw`, `features` and `embedding` are
 * a stored payload and two derived vectors a review surface has no
 * use for, and `parse_status` is absent because it is the filter.
 */
const FAILURE_KEYS = [
  'body',
  'capturedAt',
  'id',
  'parseError',
  'url',
] as const satisfies readonly (keyof SourceFailureRecord)[];

/** {@link SOURCE_KEYS}, held against the record it describes. */
type EverySourceKeyListed =
  CoversEveryKey<SourceRecord, typeof SOURCE_KEYS>;

/** {@link LISTED_KEYS}, held against the row a list answers. */
type EveryListedKeyListed =
  CoversEveryKey<SourceWithParseStats, typeof LISTED_KEYS>;

/** {@link FAILURE_KEYS}, held against the queue's own record. */
type EveryFailureKeyListed =
  CoversEveryKey<SourceFailureRecord, typeof FAILURE_KEYS>;

/**
 * The half of the sources drift guard `check-types` owns.
 *
 * The same pair {@link EVERY_KEY_LISTED} is one table over, and
 * three of them rather than one because the sources surface answers
 * three shapes: the row, the row plus its aggregate, and the
 * queue's own column-scoped record. A column added to `sources`
 * turns the first two `false` and a column added to the queue's
 * projection turns the third, each as a TS2322 at its own line
 * before a case can compare an answer against a set that has
 * quietly stopped describing it.
 */
const EVERY_SOURCE_KEY_LISTED: EverySourceKeyListed = true;

/** {@link LISTED_KEYS}'s half of the same guard. */
const EVERY_LISTED_KEY_LISTED: EveryListedKeyListed = true;

/** {@link FAILURE_KEYS}'s half of the same guard. */
const EVERY_FAILURE_KEY_LISTED: EveryFailureKeyListed = true;

/** {@link SOURCE_KEYS}, sorted at use rather than by hand. */
const SOURCE_KEY_SET: readonly string[] = [...SOURCE_KEYS].sort();

/** {@link LISTED_KEYS}, sorted at use. */
const LISTED_KEY_SET: readonly string[] = [...LISTED_KEYS].sort();

/** {@link FAILURE_KEYS}, sorted at use. */
const FAILURE_KEY_SET: readonly string[] = [...FAILURE_KEYS].sort();

/**
 * The status the review queue reads, annotated rather than left
 * bare so the literal is checked against
 * `DOCUMENT_PARSE_STATUSES` at compile time.
 */
const PARSE_FAILED: DocumentParseStatus = 'failed';

/** The status a capture that parsed stands at. */
const PARSE_OK: DocumentParseStatus = 'ok';

/**
 * What every planted capture's `hash` is built from.
 *
 * `documents_hash_unique` is over the whole corpus rather than per
 * source, so a planting helper reusing one hash would have its
 * second write refused — and every case below would then read a
 * corpus one row short of the one it planted.
 */
const HASH_PREFIX = 'wave2-live-capture-';

/** What every planted capture's `url` is built from. */
const CAPTURE_URL_PREFIX = 'https://example.test/radar/item/';

/** What every planted capture's `body` is built from. */
const BODY_PREFIX = 'captured body of ';

/** What a planted FAILED capture records as its `parse_error`. */
const PARSE_ERROR_PREFIX = 'contract rejected ';

/**
 * The values one planted capture is written from.
 *
 * Mutable rather than `readonly` because drizzle's `values()` takes
 * the insert shape it derived from the table, and a readonly member
 * is not assignable to it.
 */
interface CaptureValues {
  /** `documents.domain_id`, whose corpus this belongs to. */
  domainId: number;

  /** `documents.source_id`, the feed it came through. */
  sourceId: number;

  /** `documents.hash`, unique across the whole corpus. */
  hash: string;

  /** `documents.url`, where it can be read at its source. */
  url: string;

  /** `documents.body`, the text as captured. */
  body: string;

  /** `documents.parse_status`, the queue's filter. */
  parseStatus: DocumentParseStatus;

  /** `documents.parse_error`, what the writer recorded. */
  parseError: string;
}

/**
 * One failed capture's values, WITHOUT a `captured_at`.
 *
 * The omission is the point: the column's own `defaultNow()` is
 * what fills it, and two rows written inside ONE statement take one
 * value between them. That is the tie {@link TIED_AT} imitates with
 * a literal, produced by the server instead of typed.
 *
 * @param domainId - The corpus this capture belongs to.
 * @param sourceId - The feed it came through.
 * @param label - What distinguishes it from its neighbour, and what
 *   its hash, url, body and error are each built from.
 * @returns The insert values, ready for a batched `values()`.
 */
function batchedCapture(
  domainId: number,
  sourceId: number,
  label: string,
): CaptureValues {
  return {
    domainId,
    sourceId,
    hash: `${HASH_PREFIX}${label}`,
    url: `${CAPTURE_URL_PREFIX}${label}`,
    body: `${BODY_PREFIX}${label}`,
    parseStatus: PARSE_FAILED,
    parseError: `${PARSE_ERROR_PREFIX}${label}`,
  };
}

/**
 * The row of an answered page carrying one endpoint.
 *
 * Looked up by endpoint rather than by index, so a case naming a
 * source names the source rather than a position in a list whose
 * order another assertion is separately about.
 *
 * @param page - Whatever the list read answered.
 * @param endpoint - The {@link SourceRecord.endpoint} to find.
 * @returns That row.
 * @throws Error When the page carries no such row, which breaks the
 *   case in its setup rather than a few assertions later.
 */
function rowFor(
  page: readonly SourceWithParseStats[],
  endpoint: string,
): SourceWithParseStats {
  const found = page.find((row) => row.endpoint === endpoint);

  if (found === undefined) {
    throw new Error(
      `[wave2-live] the answered page carries no row at ${endpoint}, `
      + 'so every assertion below it would be about nothing.',
    );
  }

  return found;
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

/**
 * One row of the parse-status census: a status the corpus holds,
 * and how many documents stand at it.
 *
 * Read straight off `documents` rather than through the port,
 * because the claim it serves is about the TABLE. A census taken
 * through {@link SourceStore} would be two readings of the same
 * statements the queue is made of, and a read that had written
 * would move both of them together.
 */
interface ParseCensusRow {
  /** `documents.parse_status`, as stored. */
  readonly parseStatus: string;

  /** How many rows stand at it, across every source. */
  readonly total: number;
}

/**
 * The domains, sources and captures the aggregate and the queue
 * cases plant.
 *
 * Named members rather than an array, on the same terms
 * {@link PlantedPage} states: a case reads a planted row by what it
 * is rather than by an index `noUncheckedIndexedAccess` would make
 * optional anyway.
 */
interface PlantedCorpus {
  /** The domain the three listed sources hang off. */
  readonly domain: DomainRecord;

  /** The domain whose one source proves the list is scoped. */
  readonly other: DomainRecord;

  /** Captures under two statuses, in different numbers. */
  readonly feed: SourceRecord;

  /** Captures under one status only: the partial-group shape. */
  readonly quiet: SourceRecord;

  /** No captures at all: the absent-group shape. */
  readonly fresh: SourceRecord;

  /** The second domain's only source. */
  readonly transitFeed: SourceRecord;

  /** The newest failed capture, and the queue's first row. */
  readonly newest: number;

  /** The tied capture written FIRST, so its id is the lower. */
  readonly tiedEarly: number;

  /** The tied capture written SECOND, and answered before it. */
  readonly tiedLate: number;

  /** The oldest failed capture, and the queue's last row. */
  readonly oldest: number;

  /** The source-less capture the grouped read must not see. */
  readonly orphan: number;
}

/**
 * The three sources the delete guards are read over, each holding
 * ONE kind of dependent.
 *
 * A subject holding two dependents cannot isolate either key:
 * Postgres refuses on whichever it checked first, so both cases
 * would pin one key while reading as two. Each source below holds
 * exactly the dependent its own case is about, and the third holds
 * none at all so the refusals sit beside a delete that lands.
 */
interface PlantedDependents {
  /** The domain all three hang off. */
  readonly domain: DomainRecord;

  /** Holds a document, cited by no sighting. */
  readonly held: SourceRecord;

  /** Cited by a sighting, holding no document. */
  readonly cited: SourceRecord;

  /** Nothing points at it, and its delete is the control. */
  readonly free: SourceRecord;

  /** The one capture {@link PlantedDependents.held} holds. */
  readonly capture: number;
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
  const sourceStore: SourceStore = createDbSourceStore(() => db);

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

  /**
   * Writes one source, with the empty arrangement and the enabled
   * state every case below shares.
   *
   * @param domainId - The domain whose research it supplies.
   * @param kind - Its transport family, a `SOURCE_KINDS` member.
   * @param endpoint - Where its payload is. Never unique: this
   *   table carries no unique key at all, so two rows may name one
   *   address and the port says so.
   * @returns The stored row, as the database answered it.
   */
  async function plantSource(
    domainId: number,
    kind: string,
    endpoint: string,
  ): Promise<SourceRecord> {
    return await sourceStore.insertSource({
      domainId,
      kind,
      endpoint,
      parserConfig: {},
      contract: {},
      enabled: true,
    });
  }

  /**
   * Writes one document, straight through drizzle.
   *
   * NOT THROUGH THE PORT, BECAUSE THE PORT CANNOT. `SourceStore`
   * declares two reads over `documents` and no write whatever, which
   * is the read-only queue expressed structurally — so a fixture
   * standing one up has to reach the table itself, and that is the
   * plainest demonstration of the containment there is.
   *
   * @param domainId - The corpus this capture belongs to.
   * @param sourceId - The feed it came through, or null for one that
   *   came through none: a file handed to the ingest tray, a body an
   *   operator pasted in.
   * @param status - Which side of the queue's filter it falls on.
   * @param label - What its hash, url, body and error are built
   *   from, and what a refusal quotes back.
   * @param capturedAt - When, written explicitly so an ordering is
   *   the fixture's rather than the clock's.
   * @returns Its `documents.id`.
   * @throws Error When the insert returned no row.
   */
  async function plantCapture(
    domainId: number,
    sourceId: number | null,
    status: DocumentParseStatus,
    label: string,
    capturedAt: Date,
  ): Promise<number> {
    const [row] = await db.insert(documents)
      .values({
        domainId,
        sourceId,
        hash: `${HASH_PREFIX}${label}`,
        url: `${CAPTURE_URL_PREFIX}${label}`,
        body: `${BODY_PREFIX}${label}`,
        parseStatus: status,
        parseError: status === PARSE_FAILED
          ? `${PARSE_ERROR_PREFIX}${label}`
          : null,
        capturedAt,
      })
      .returning({ id: documents.id });

    if (row === undefined) {
      throw new Error(
        `[wave2-live] planting the ${label} capture returned no row, `
        + 'so every assertion below it would be about nothing.',
      );
    }

    return row.id;
  }

  /**
   * The corpus census, read straight off `documents`.
   *
   * @returns One row per status the corpus holds, in status order,
   *   across every source and including the captures that came
   *   through none.
   */
  async function census(): Promise<readonly ParseCensusRow[]> {
    return await db.select({
      parseStatus: documents.parseStatus,
      total: count(),
    })
      .from(documents)
      .groupBy(documents.parseStatus)
      .orderBy(asc(documents.parseStatus));
  }

  /**
   * Writes two domains, four sources and nine captures.
   *
   * THE THREE LISTED SOURCES CARRY THE THREE SHAPES THE AGGREGATE
   * HAS TO ANSWER: groups under both statuses in different numbers,
   * a group under one status only, and no group at all. The fourth
   * source is the second domain's, and the ninth capture came
   * through no source, so a `WHERE` and an `IN` that had each
   * stopped narrowing have somewhere to show it.
   *
   * The four FAILED captures under the first source go in an order
   * that is neither their answered order nor its reverse, and two of
   * them share an instant, so the queue's `ORDER BY` is read against
   * a table whose insertion order, id order and answered order are
   * three different lists.
   *
   * @returns Every planted row a case below names.
   */
  async function plantCorpus(): Promise<PlantedCorpus> {
    const domain = await plantDomain(RADAR, RADAR_NAME);
    const other = await plantDomain(TRANSIT, TRANSIT_NAME);
    const feed = await plantSource(domain.id, FEED_KIND, FEED_ENDPOINT);
    const quiet = await plantSource(
      domain.id,
      QUIET_KIND,
      QUIET_ENDPOINT,
    );
    const fresh = await plantSource(
      domain.id,
      FRESH_KIND,
      FRESH_ENDPOINT,
    );
    const transitFeed = await plantSource(
      other.id,
      FEED_KIND,
      TRANSIT_ENDPOINT,
    );

    for (let taken = 0; taken < FEED_OK; taken += 1) {
      await plantCapture(
        domain.id,
        feed.id,
        PARSE_OK,
        `feed-ok-${taken}`,
        PARSED_AT,
      );
    }

    const tiedEarly = await plantCapture(
      domain.id,
      feed.id,
      PARSE_FAILED,
      'feed-tied-early',
      TIED_AT,
    );
    const oldest = await plantCapture(
      domain.id,
      feed.id,
      PARSE_FAILED,
      'feed-oldest',
      OLDEST_AT,
    );
    const newest = await plantCapture(
      domain.id,
      feed.id,
      PARSE_FAILED,
      'feed-newest',
      NEWEST_AT,
    );
    const tiedLate = await plantCapture(
      domain.id,
      feed.id,
      PARSE_FAILED,
      'feed-tied-late',
      TIED_AT,
    );

    await plantCapture(
      domain.id,
      quiet.id,
      PARSE_OK,
      'quiet-ok',
      PARSED_AT,
    );
    await plantCapture(
      other.id,
      transitFeed.id,
      PARSE_FAILED,
      'transit-failed',
      NEWEST_AT,
    );

    const orphan = await plantCapture(
      domain.id,
      null,
      PARSE_FAILED,
      'orphan',
      NEWEST_AT,
    );

    return {
      domain,
      other,
      feed,
      quiet,
      fresh,
      transitFeed,
      newest,
      tiedEarly,
      tiedLate,
      oldest,
      orphan,
    };
  }

  /**
   * Writes three sources, each holding ONE kind of dependent.
   *
   * The sighting cites {@link PlantedDependents.cited} while the
   * finding under it hangs off a capture that came through
   * {@link PlantedDependents.held} — which the schema permits, a
   * sighting being the claim that a finding was SEEN at a feed
   * rather than a statement about where its document came from.
   * That is what leaves the cited source holding no document of its
   * own, and it is the whole reason the two refusals below can be
   * told apart: Postgres refuses on whichever key it checked first,
   * so a source carrying both dependents answers one name for both
   * cases while reading as two.
   *
   * @returns Every planted row the two delete cases name.
   * @throws Error When either write returned no row.
   */
  async function plantDependents(): Promise<PlantedDependents> {
    const domain = await plantDomain(RADAR, RADAR_NAME);
    const held = await plantSource(domain.id, FEED_KIND, HELD_ENDPOINT);
    const cited = await plantSource(
      domain.id,
      QUIET_KIND,
      CITED_ENDPOINT,
    );
    const free = await plantSource(
      domain.id,
      FRESH_KIND,
      FREE_ENDPOINT,
    );
    const capture = await plantCapture(
      domain.id,
      held.id,
      PARSE_FAILED,
      'held',
      OLDEST_AT,
    );
    const [finding] = await db.insert(findings)
      .values({ domainId: domain.id, documentId: capture })
      .returning({ id: findings.id });

    if (finding === undefined) {
      throw new Error(
        '[wave2-live] planting the finding returned no row, so the '
        + 'sighting below it would have nothing to hang off.',
      );
    }

    await db.insert(findingSightings)
      .values({ findingId: finding.id, sourceId: cited.id });

    return { domain, held, cited, free, capture };
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

    // The sources half of the same precondition, read through its
    // own store for the same reason. Both of its reads over
    // `documents` are here too, so the empty corpus is a reading of
    // the queue's projections as well as of the tables.
    expect(await sourceStore.countSources(FIRST_ID)).toBe(0);
    expect(await sourceStore.listSourcesWithParseStats(FIRST_ID, WHOLE))
      .toStrictEqual([]);
    expect(await sourceStore.findSourceById(FIRST_ID)).toBeNull();
    expect(await sourceStore.deleteSource(FIRST_ID)).toBe(false);
    expect(await sourceStore.countSourceDependents(FIRST_ID))
      .toStrictEqual({ documents: 0, findingSightings: 0 });
    expect(await sourceStore.listSourceFailures(FIRST_ID, WHOLE))
      .toStrictEqual([]);
    expect(await sourceStore.countSourceFailures(FIRST_ID)).toBe(0);
  });

  it('holds the key list against the record it describes', () => {
    // The runtime half of the drift guard: the pin above is what
    // `check-types` reads, and a symbol nothing uses is a lint
    // error, so the two obligations are discharged by one line.
    expect(EVERY_KEY_LISTED).toBe(true);
    expect(TOPIC_KEY_SET).toHaveLength(TOPIC_KEYS.length);

    // THREE OF THEM ON THE SOURCES SIDE, BECAUSE THAT SURFACE
    // ANSWERS THREE SHAPES: the row, the row plus its aggregate,
    // and the queue's own column-scoped record. Each is a separate
    // direction — a column added to `sources` turns the first two
    // false and one added to the queue's projection turns the
    // third — and the runtime read here is what stops a member
    // dropped from a list being a `check-types` diagnostic no case
    // in this file would ever mention.
    expect(EVERY_SOURCE_KEY_LISTED).toBe(true);
    expect(EVERY_LISTED_KEY_LISTED).toBe(true);
    expect(EVERY_FAILURE_KEY_LISTED).toBe(true);
    expect(SOURCE_KEY_SET).toHaveLength(SOURCE_KEYS.length);
    expect(LISTED_KEY_SET).toHaveLength(SOURCE_KEYS.length + 1);
    expect(LISTED_KEY_SET).toContain('parseStats');
    expect(FAILURE_KEY_SET).toHaveLength(FAILURE_KEYS.length);
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

  it('counts every parse status over a page of sources', async () => {
    const planted = await plantCorpus();
    const page = await sourceStore.listSourcesWithParseStats(
      planted.domain.id,
      WHOLE,
    );

    // Ordered by id ascending, which the port makes part of the
    // contract because a window over an unordered read is not a
    // page: Postgres promises nothing about row order without an
    // `ORDER BY`, so two requests for consecutive pages can repeat
    // one row and skip another while every count on the wire still
    // adds up. `id` rather than a natural key because this table
    // has none — `sources` carries no unique constraint at all.
    expect(page.map((row) => row.id)).toStrictEqual([
      planted.feed.id,
      planted.quiet.id,
      planted.fresh.id,
    ]);
    expect(page.map((row) => row.endpoint)).toStrictEqual([
      FEED_ENDPOINT,
      QUIET_ENDPOINT,
      FRESH_ENDPOINT,
    ]);
    expect(page.map(keysOf)).toStrictEqual([
      LISTED_KEY_SET,
      LISTED_KEY_SET,
      LISTED_KEY_SET,
    ]);

    // THE COUNTS, SPELLED AS LITERALS. A record built with the two
    // statuses swapped counts correctly whenever both members carry
    // one number, so the first source's two differ — and reading
    // the members by name is what says WHICH status went missing
    // where the whole-record comparisons above only say that one
    // did.
    const stats = page.map((row) => row.parseStats);

    expect(stats).toStrictEqual([
      { ok: FEED_OK, failed: FEED_FAILED },
      { ok: QUIET_OK, failed: 0 },
      { ok: 0, failed: 0 },
    ]);
    expect(FEED_OK).not.toBe(FEED_FAILED);

    // Every member of the tuple, present on every row. Read from
    // `DOCUMENT_PARSE_STATUSES` as well as from the literals above,
    // with the length guard that stops a tuple somebody emptied
    // satisfying a derived expectation.
    expect(DOCUMENT_PARSE_STATUSES.length).toBeGreaterThan(1);
    expect(page.map((row) => keysOf(row.parseStats))).toStrictEqual(
      page.map(() => [...DOCUMENT_PARSE_STATUSES].sort()),
    );

    // THE TWO ABSENCE SHAPES EXERCISE DIFFERENT LINES, and a
    // fixture carrying one of them leaves half the fold unproven.
    // `quiet` contributes a group under `ok` and none under
    // `failed`, so the map lookup HITS and the missing member comes
    // from the record the fold was initialised with; `fresh`
    // contributes no group at all, so the lookup MISSES and every
    // member of its record is that fallback.
    const quiet = rowFor(page, QUIET_ENDPOINT);
    const fresh = rowFor(page, FRESH_ENDPOINT);

    expect(quiet.parseStats.ok).toBe(QUIET_OK);
    expect(quiet.parseStats.failed).toBe(0);
    expect(fresh.parseStats.ok).toBe(0);
    expect(fresh.parseStats.failed).toBe(0);

    // A SOURCE IS INSERTED NEVER FETCHED, which the five
    // pipeline-owned columns are what say: `InsertSourceInput`
    // carries no member that could set one, so there is no way to
    // create a source claiming a history it does not have. Read off
    // the row that has captured nothing, where a stamp would be
    // least explicable.
    expect(fresh.cursor).toBeNull();
    expect(fresh.consecutiveFailures).toBe(0);
    expect(fresh.lastSuccessAt).toBeNull();
    expect(fresh.lastFailureAt).toBeNull();
    expect(fresh.flagged).toBe(false);
    expect(fresh.enabled).toBe(true);
    expect(fresh.kind).toBe(FRESH_KIND);
    expect(fresh.parserConfig).toStrictEqual({});
    expect(fresh.contract).toStrictEqual({});
    expect(fresh.domainId).toBe(planted.domain.id);

    // THE SOURCE-LESS CAPTURE IS ON NO ROW OF THIS PAGE.
    // `documents.source_id` is nullable — a file handed to the
    // ingest tray came through no feed — and the grouped read is
    // filtered by an `IN` list of the page's own ids, where
    // `NULL IN (...)` is UNKNOWN in SQL rather than true. So
    // Postgres cannot answer a group whose source is absent, and
    // that row's `failed` has nowhere on this page to land.
    const failedOnPage = stats.reduce(
      (total, row) => total + row.failed,
      0,
    );

    expect(planted.orphan).toBeGreaterThan(0);
    expect(failedOnPage).toBe(FEED_FAILED);
    expect(failedOnPage).toBeLessThan(CORPUS_FAILED);

    // AND THE SECOND DOMAIN IS WHY THIS IS A SCOPE READING TOO. Its
    // source carries a failed capture of its own, so a `WHERE` that
    // had stopped narrowing answers a fourth row here and moves
    // every total above.
    expect(await sourceStore.countSources(planted.domain.id)).toBe(3);
    expect(await sourceStore.countSources(planted.other.id)).toBe(1);

    const elsewhere = await sourceStore.listSourcesWithParseStats(
      planted.other.id,
      WHOLE,
    );

    expect(elsewhere.map((row) => row.endpoint))
      .toStrictEqual([TRANSIT_ENDPOINT]);
    expect(rowFor(elsewhere, TRANSIT_ENDPOINT).parseStats)
      .toStrictEqual({ ok: 0, failed: TRANSIT_FAILED });

    // ONE ROW OUT OF THE MIDDLE, whose aggregate is counted for the
    // page it is on and not for the collection: a `LIMIT` that
    // stopped limiting answers three rows here and an `OFFSET` that
    // stopped offsetting answers the first source's.
    const middle = await sourceStore.listSourcesWithParseStats(
      planted.domain.id,
      MIDDLE,
    );

    expect(middle.map((row) => row.endpoint))
      .toStrictEqual([QUIET_ENDPOINT]);
    expect(rowFor(middle, QUIET_ENDPOINT).parseStats)
      .toStrictEqual({ ok: QUIET_OK, failed: 0 });

    // A window past the end, and a domain no row points at, are the
    // empty list rather than a refusal — and neither issues the
    // grouped statement at all, an `IN` list of no ids being a read
    // asked to describe nothing.
    const past = await sourceStore.listSourcesWithParseStats(
      planted.domain.id,
      PAST_END,
    );
    const nowhere = await sourceStore.listSourcesWithParseStats(
      ABSENT_ID,
      WHOLE,
    );

    expect(past).toStrictEqual([]);
    expect(nowhere).toStrictEqual([]);
    expect(await sourceStore.countSources(ABSENT_ID)).toBe(0);
  });

  it('refuses a delete the corpus still points at', async () => {
    const planted = await plantDependents();

    // ONE KIND OF DEPENDENT, WHICH IS WHAT MAKES THE CONSTRAINT
    // NAME A CLAIM. Postgres refuses on whichever key it checked
    // first, so a source carrying a document AND a sighting answers
    // this same name for both delete cases and the second silently
    // duplicates the first. The counted zero beside the one is what
    // says this subject holds only the dependent it is named for.
    expect(await sourceStore.countSourceDependents(planted.held.id))
      .toStrictEqual({ documents: 1, findingSightings: 0 });

    const refusal = await refusalFrom(
      () => sourceStore.deleteSource(planted.held.id),
    );

    expect(refusal.reason).toBe('foreign-key-violation');
    expect(refusal.constraint).toBe(DOCUMENT_SOURCE_KEY);

    // The SQLSTATE beside the reason, on the terms the duplicate
    // name case above states: the reason is what `classifyPgError`
    // DECIDED and this is what the server raised.
    const cause = refusal.cause as { code?: unknown };

    expect(cause.code).toBe(FOREIGN_KEY_VIOLATION);

    // NO CASCADE ANYWHERE, which is the opposite of what
    // `DomainStore.deleteDomain` does and is the schema's decision
    // rather than this method's. Every key onto `sources.id` emits
    // `ON DELETE no action`, so the refusal took nothing with it:
    // the source stands and so does its capture.
    expect(present(
      await sourceStore.findSourceById(planted.held.id),
      'findSourceById after the refused delete',
    )).toStrictEqual(planted.held);
    expect(await sourceStore.countSourceDependents(planted.held.id))
      .toStrictEqual({ documents: 1, findingSightings: 0 });
    expect(await sourceStore.countSourceFailures(planted.held.id))
      .toBe(1);

    // THE POSITIVE CONTROL, IN THE SAME RUN. Without a delete that
    // lands, every assertion above is equally green against a store
    // refusing every delete there is — and this source differs from
    // the one refused along exactly the axis under test, holding no
    // dependent rather than one.
    expect(await sourceStore.countSourceDependents(planted.free.id))
      .toStrictEqual({ documents: 0, findingSightings: 0 });
    expect(await sourceStore.deleteSource(planted.free.id)).toBe(true);
    expect(await sourceStore.findSourceById(planted.free.id)).toBeNull();

    // An id no source carries is `false` rather than a throw, and
    // its dependents are two counted zeros rather than a failure:
    // nothing points at a row that is not there.
    expect(await sourceStore.deleteSource(ABSENT_ID)).toBe(false);
    expect(await sourceStore.countSourceDependents(ABSENT_ID))
      .toStrictEqual({ documents: 0, findingSightings: 0 });
  });

  it('refuses a delete a sighting still cites', async () => {
    const planted = await plantDependents();

    // THE ISOLATING FIXTURE, AND THE COUNTED ZERO IS THE ISOLATION.
    // This source holds no document at all; the sighting citing it
    // hangs off a finding over the OTHER source's capture, which
    // the schema permits because a sighting is the claim that a
    // finding was SEEN at a feed rather than a statement about
    // where its document came from. Without that arrangement the
    // documents key fires first and this case pins that one while
    // reading as this one.
    expect(await sourceStore.countSourceDependents(planted.cited.id))
      .toStrictEqual({ documents: 0, findingSightings: 1 });

    const refusal = await refusalFrom(
      () => sourceStore.deleteSource(planted.cited.id),
    );

    expect(refusal.reason).toBe('foreign-key-violation');
    expect(refusal.constraint).toBe(SIGHTING_SOURCE_KEY);
    expect(SIGHTING_SOURCE_KEY).not.toBe(DOCUMENT_SOURCE_KEY);

    const cause = refusal.cause as { code?: unknown };

    expect(cause.code).toBe(FOREIGN_KEY_VIOLATION);

    // `ON DELETE SET NULL` IS NOT THE ESCAPE IT LOOKS LIKE HERE,
    // which is why this key refuses outright where a reader can act
    // on it. `finding_sightings.source_id` is NOT NULL, so Postgres
    // would accept that declaration and defer the failure to the
    // delete, then report a not-null violation on the column
    // instead of the reference it was really about. What the
    // refusal names as the operation that was wanted is this patch:
    // it keeps the endpoint, the arrangement and the provenance and
    // stops the pipeline reading.
    const retired = present(
      await sourceStore.updateSource(planted.cited.id, { enabled: false }),
      'updateSource retiring the cited source',
    );

    expect(retired.enabled).toBe(false);
    expect(retired.id).toBe(planted.cited.id);
    expect(keysOf(retired)).toStrictEqual(SOURCE_KEY_SET);
    expect({ ...retired, enabled: true }).toStrictEqual(planted.cited);

    // The sighting is still there afterwards, which is what says
    // retiring a feed keeps what it once carried rather than
    // trading the corpus for the delete.
    expect(await sourceStore.countSourceDependents(planted.cited.id))
      .toStrictEqual({ documents: 0, findingSightings: 1 });

    // The positive control, in the same run and along the same
    // axis: nothing cites this one, so the same statement lands.
    expect(await sourceStore.deleteSource(planted.free.id)).toBe(true);
    expect(await sourceStore.findSourceById(planted.free.id)).toBeNull();
  });

  it('pages the failed captures newest first', async () => {
    const planted = await plantCorpus();
    const queue = await sourceStore.listSourceFailures(
      planted.feed.id,
      WHOLE,
    );

    // NEWEST FIRST, BECAUSE THE QUEUE IS WORKED FROM THE TOP: what
    // broke most recently is what an operator is deciding about,
    // and an ascending order would put the oldest failure of a
    // long-broken feed on page one forever. These four ids are
    // wrong under every other reading of this fixture — insertion
    // order answers the tied pair the other way round, and id
    // descending answers the whole list in a different order again.
    expect(queue.map((row) => row.id)).toStrictEqual([
      planted.newest,
      planted.tiedLate,
      planted.tiedEarly,
      planted.oldest,
    ]);
    expect(queue.map((row) => row.capturedAt.toISOString()))
      .toStrictEqual([
        NEWEST_AT.toISOString(),
        TIED_AT.toISOString(),
        TIED_AT.toISOString(),
        OLDEST_AT.toISOString(),
      ]);

    // THE TIEBREAK IS NOT OPTIONAL AND IT READS DESCENDING. The two
    // rows above sharing an instant are not ordered by
    // `captured_at` at all, so what puts them in this order is
    // `id` — and the row answered SECOND was written second, so its
    // id is the higher of the pair and insertion order would put it
    // last. What a lost tiebreak costs is not a wrong row but two
    // PAGES that disagree about which row they hold, one shown
    // twice and another never, with nothing in either response
    // saying so; that is invisible to a single read, so this
    // ordering is the claim and the port carries the argument.
    expect(planted.tiedEarly).toBeLessThan(planted.tiedLate);
    expect(planted.newest).toBeLessThan(planted.tiedLate);
    expect(planted.oldest).toBeLessThan(planted.newest);

    // COLUMN-SCOPED, AND THE ONLY RECORD ON THIS PORT THAT IS.
    // `documents` carries fifteen columns and this record is five
    // of them: `raw`, `features` and `embedding` are a stored
    // payload and two derived vectors a review surface has no use
    // for, and `parse_status` is absent because it IS the filter.
    // So the key set is where a column ARRIVING on the queue would
    // be reported, there being no field read that could notice one.
    for (const row of queue) {
      expect(keysOf(row)).toStrictEqual(FAILURE_KEY_SET);
      expect(row.parseError).not.toBeNull();
      expect(row.url).not.toBeNull();
      expect(row.body).toContain(BODY_PREFIX);
    }

    // FAILED ROWS ONLY, and the filter is the store's rather than a
    // caller's: there is no status parameter anywhere on this port,
    // so the queue cannot become a way to page the corpus. The
    // captures this source took that PARSED are what say so — the
    // aggregate counts them and the queue does not.
    expect(queue).toHaveLength(FEED_FAILED);
    expect(FEED_OK).toBeGreaterThan(0);
    expect(await sourceStore.countSourceFailures(planted.feed.id))
      .toBe(FEED_FAILED);

    // Scoped to the one source, which the corpus census is what
    // makes readable: the second domain's capture and the
    // source-less one are both `failed`, and a `WHERE` that had
    // stopped narrowing answers six rows rather than four.
    expect(queue.map((row) => row.id)).not.toContain(planted.orphan);
    expect(await sourceStore.countSourceFailures(planted.transitFeed.id))
      .toBe(TRANSIT_FAILED);
    expect(CORPUS_FAILED).toBeGreaterThan(FEED_FAILED);

    // ONE ROW OUT OF THE MIDDLE: a `LIMIT` that stopped limiting
    // answers four rows here and an `OFFSET` that stopped
    // offsetting answers the newest.
    const page = await sourceStore.listSourceFailures(
      planted.feed.id,
      MIDDLE,
    );

    expect(page.map((row) => row.id)).toStrictEqual([planted.tiedLate]);

    // A window past the end, a source whose captures all parsed,
    // and an id no source carries are each an empty list rather
    // than an error: none of the three is a failure to read.
    const past = await sourceStore.listSourceFailures(
      planted.feed.id,
      PAST_END,
    );
    const clean = await sourceStore.listSourceFailures(
      planted.quiet.id,
      WHOLE,
    );
    const nowhere = await sourceStore.listSourceFailures(
      ABSENT_ID,
      WHOLE,
    );

    expect(past).toStrictEqual([]);
    expect(clean).toStrictEqual([]);
    expect(nowhere).toStrictEqual([]);
    expect(await sourceStore.countSourceFailures(ABSENT_ID)).toBe(0);

    // AND THE TIE THE PORT NAMES IS ONE THE DATABASE PRODUCES,
    // which only a server can show. `captured_at` defaults to
    // `now()`, and `now()` is the TRANSACTION's instant rather than
    // the row's, so two documents written inside ONE statement take
    // one value between them — the batch capture the port describes
    // and the reason the tiebreak exists at all. Neither row names
    // a timestamp here; the column supplies it.
    const batched = await db.insert(documents)
      .values([
        batchedCapture(planted.domain.id, planted.feed.id, 'batch-a'),
        batchedCapture(planted.domain.id, planted.feed.id, 'batch-b'),
      ])
      .returning({ id: documents.id, capturedAt: documents.capturedAt });
    const stamps = batched.map((row) => row.capturedAt.toISOString());
    const written = batched.map((row) => row.id);

    expect(batched).toHaveLength(2);
    expect(new Set(stamps).size).toBe(1);
    expect(written).toStrictEqual([...written].sort((a, b) => a - b));

    // What puts the pair at the HEAD is that `now()` is newer than
    // every planted instant, which is a property of this fixture
    // rather than of the clock: every capture instant here is in the
    // past and a past instant stays past. Asserted rather than
    // assumed, because a future literal would make the reading below
    // reverse itself on a date nobody would think to look at.
    const batchedAt = present(stamps.at(0) ?? null, 'the batched stamp');

    expect(new Date(batchedAt).getTime())
      .toBeGreaterThan(NEWEST_AT.getTime());

    // They are newer than everything planted, so the queue answers
    // them at its head — in id DESCENDING, which reverses the order
    // they were written in and is the tiebreak doing the whole of
    // the work: nothing separates these two rows but their ids.
    const reread = await sourceStore.listSourceFailures(
      planted.feed.id,
      WHOLE,
    );

    expect(reread.slice(0, 2).map((row) => row.id))
      .toStrictEqual([...written].reverse());
    expect(reread).toHaveLength(FEED_FAILED + 2);
  });

  it('reads the failures queue without writing to it', async () => {
    const planted = await plantCorpus();
    const before = await census();

    // THE CENSUS IS NOT A ZERO READ AGAINST ITSELF. Two empty
    // censuses compare equal exactly as this pair does, so what
    // makes the equality below a reading is that this one has
    // content, that its two members carry DIFFERENT numbers, and
    // that both are non-zero. It is taken straight off `documents`
    // rather than through the port, because the claim is about the
    // TABLE: a census read through the same statements the queue is
    // made of would move with them.
    expect(before).toStrictEqual([
      { parseStatus: PARSE_FAILED, total: CORPUS_FAILED },
      { parseStatus: PARSE_OK, total: CORPUS_OK },
    ]);
    expect(CORPUS_FAILED).not.toBe(CORPUS_OK);
    expect(CORPUS_OK).toBeGreaterThan(0);

    // Every read this port has over `documents`, driven in one
    // sitting: the queue, a window of it, its total, and the
    // aggregate the list route folds out of the same table.
    const queue = await sourceStore.listSourceFailures(
      planted.feed.id,
      WHOLE,
    );
    const page = await sourceStore.listSourceFailures(
      planted.feed.id,
      MIDDLE,
    );
    const total = await sourceStore.countSourceFailures(planted.feed.id);
    const listed = await sourceStore.listSourcesWithParseStats(
      planted.domain.id,
      WHOLE,
    );

    // The in-band control that the census pair brackets work rather
    // than nothing: each of the four answered, so the equality
    // below is about statements that ran.
    expect(queue).toHaveLength(FEED_FAILED);
    expect(page).toHaveLength(1);
    expect(total).toBe(FEED_FAILED);
    expect(listed).toHaveLength(3);

    // THE QUEUE IS READ-ONLY STRUCTURALLY RATHER THAN BY
    // CONVENTION: `SourceStore` declares two reads over `documents`
    // and no write whatever, so there is no statement on this port
    // that could move a `parse_status`. This is that claim taken
    // against the table instead of against the interface — a read
    // that marked a row as seen, or moved one off `failed` as it
    // was worked, is a member that no longer matches.
    expect(await census()).toStrictEqual(before);

    // And the same claim from the surface's side, which is the half
    // a caller could observe: the aggregate the list route answered
    // is the one it answers after every read above.
    const reread = await sourceStore.listSourcesWithParseStats(
      planted.domain.id,
      WHOLE,
    );

    expect(reread).toStrictEqual(listed);
  });
});
