/**
 * The wave-1 stores driven against a real Postgres, through the real
 * migrations: a domain written, a taxonomy hung off it, a lexicon
 * written into a bucket of that taxonomy, personas hung off the
 * domain, the operator settings singleton written twice into one
 * row, and every mechanism those tables refuse a write with.
 * Self-skips when AR_LIVE_DATABASE_URL is unset — run via:
 *
 *   bun run stress:start && bun run test:live && bun run stress:stop
 *
 * WHAT ONLY A SERVER CAN ANSWER is why this file is worth its
 * container, and it is not the rules. Every decision the wave-1
 * surface takes — the 404 for an unknown slug, the 409 for a taken
 * one, the 422 for a parent the taxonomy may not have — is a
 * decision about rows, and `tests/helpers/memory-research-store.ts`
 * supplies rows with no database, so all of it is already pinned by
 * the colocated service and route suites. What is left is the half
 * those suites structurally cannot reach: every operation below is
 * SQL, and a statement that is valid drizzle and invalid SQL passes
 * `lint`, `check-types` and the entire isolated suite. A projection
 * naming a column the migration never created, an `ON CONFLICT`
 * target naming the wrong key, a `RETURNING` list drifted from the
 * `SELECT` beside it — each is reported here and nowhere else.
 *
 * NINE READINGS BELOW ARE THINGS AN IN-MEMORY MAP CANNOT DO, which
 * is the same argument put sharply enough to be checkable.
 *
 * THE IDENTITY AND THE STAMPS ARE THE DATABASE'S. `id` is a
 * `bigserial` mapped in `number` mode, so it arrives as a number
 * rather than as the string a raw driver hands back; `created_at`
 * and `updated_at` come from column defaults on the insert and are
 * therefore EQUAL, one statement carrying one timestamp, while a
 * patch stamps `updated_at` from `now()` and leaves `created_at`
 * exactly where it was.
 *
 * JSONB REORDERS WHAT IT STORES. A settings payload written with its
 * members in one order is answered with them in another, because
 * jsonb holds keys by length and then by bytes rather than by
 * insertion — measured here on `domains.settings` at the top level
 * and inside `scoringWeights`, and again on the whole of
 * `operator_settings.settings`, which is all that port deals in.
 * That is the reading which says the `RETURNING` list READ the
 * stored row rather than echoing the argument it was handed, and it
 * is exactly the measured zero the in-memory store and the service
 * suites hand over by name: where a store copies its argument in and
 * copies it out again, answering the argument and answering the
 * stored value are the same object graph, so no leg over there can
 * tell the two apart.
 *
 * THE TERM COUNT IS A GROUPED LEFT JOIN, and the member it exists
 * for is the EMPTY bucket. `count(terms.id)` answers 0 for a
 * category holding nothing, where the `count(*)` spelling of the
 * same statement answers 1 — a left join gives a parent with no
 * children exactly one null-extended row — so the one number an
 * operator scans the list for is the one an unwatched change
 * inverts, and it is green in every isolated suite either way.
 *
 * THE UPSERT ANSWERS THE STORED ROW. A second pass over a pattern
 * the category already carries rewrites that row and hands back the
 * id it already had, which is what lets import, export and
 * re-import settle instead of accumulating a second row that would
 * then count the same match twice.
 *
 * THE EMPTY PATCH IS A BRANCH THAT EXISTS BECAUSE THIS
 * IMPLEMENTATION THROWS. `personas` carries no timestamp column, so
 * a patch naming no member leaves an empty update list, and drizzle
 * answers that with `No values to set` rather than with a harmless
 * statement — where an in-memory map would hand the row back
 * without noticing it had been asked for nothing. The port declares
 * the call legal and owes the stored row, so the drizzle half reads
 * instead of writing, and the leg deleting that early return
 * reddens nothing at all over there: writing every member back to
 * itself is indistinguishable from not writing.
 *
 * THE SINGLETON IS THE DATABASE'S, AND THE ROW COUNT IS PAST THE
 * PORT. `SettingsStore` has no count, no list and no method taking
 * an id, so a second configuration is not something an
 * implementation must remember not to write — it is something that
 * interface cannot express, and equally something no reading
 * through it could report. The settings case writes twice and then
 * counts the table directly, which is the only place the id the
 * module chose, the primary key its second write conflicts on and
 * the CHECK standing behind both can be seen holding.
 *
 * THE MECHANISMS ARE THE DATABASE'S, AND THE FAKE ONLY IMITATES
 * THEM. `tests/helpers/memory-research-store.ts` refuses a
 * duplicate key, a two-level category and a delete of a category
 * holding children because it was written to — which is the whole
 * point of it, and also why nothing over there can say whether what
 * it was told is true. Every refusal below is read for its SQLSTATE
 * and for the name that SQLSTATE arrived with: the four natural
 * keys each name themselves, the `parent_id` foreign key names
 * itself for BOTH the refusals it raises, and the depth trigger
 * names nothing at all, because a `RAISE ... USING ERRCODE` sets no
 * constraint. A schema whose index was declared over one column
 * instead of two, or whose trigger stopped firing, is green in
 * every isolated suite and red here.
 *
 * THE CASCADE OUTRUNS THE `NO ACTION` BESIDE IT. The foreign key on
 * `categories.parent_id` refuses a delete of a category that still
 * holds children — one case below raises exactly that — and
 * dropping the DOMAIN takes parent and child together anyway,
 * because `NO ACTION` is checked at the END of the statement and the
 * cascade has removed both by then. The two readings sit beside
 * each other on purpose: an implementation looping the port's own
 * guarded single delete satisfies the first and fails the second,
 * and it looks right on every taxonomy that is only one level deep.
 *
 * THE DRIVER ERROR IS THE ONLY LIVE CONTROL A CONTAINMENT ZERO HAS
 * HERE. `src/db/store-errors.ts` takes no message parameter, so a
 * `StoreRefusal` cannot carry a submitted value — but asserting
 * that against an in-memory store is a zero with nothing behind it,
 * since its refusals are built from a reason and a constraint name
 * this repository chose and there was never anything to leak. A
 * live refusal keeps the pg error on `cause`, whose `detail` spells
 * the submitted slug verbatim, so the duplicate-slug case counts a
 * known positive and a zero with the same function over the same
 * string.
 *
 * THE SCHEMA COMES FROM THE MIGRATIONS. `applyMigrations` in the
 * `beforeAll` below runs the real `drizzle/*.sql` rather than
 * pushing the schema, which is what `bun run db:migrate` does to a
 * deployment — so the tables these cases meet are the ones the
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
 * the identity sequences, which is why a case may name an id no row
 * carries and be sure of it. The first case takes that precondition
 * as a reading of its own rather than leaving it to a comment.
 *
 * WHAT IS STILL MISSING IS NAMED RATHER THAN LEFT TO BE NOTICED.
 * The two halves the refusal pass handed forward are discharged: a
 * persona is written, read back whole against its own key set,
 * listed, paged, patched and deleted, and the `operator_settings`
 * singleton is written twice into one row and counted. What is left
 * has no live case anywhere in the plan and is named here so it can
 * be picked up rather than silently missed:
 * `DomainStore.countDomainDependents` is one `UNION ALL` over three
 * LABELLED aggregates, and a branch coming back out of order would
 * attribute one table's count to another with nothing reporting it.
 * Reaching that needs a `topics`, a `sources` and a `findings` row
 * planted with raw SQL, which no port method here writes. This
 * paragraph is that half named rather than left to be noticed, and
 * it goes when it lands.
 *
 * TWENTY-TWO MUTATIONS WERE RUN AGAINST THESE NINETEEN CASES, each
 * leg twice, with every red SET identical across the two passes and
 * no leg reddening nothing. The figures are a measurement over this
 * case list and nothing else, so a task adding a case here
 * re-derives the whole grid rather than inheriting any of it.
 *
 * THE FOURTEEN STANDING LEGS DID NOT MOVE, AND THAT IS A READING
 * RATHER THAN THE ABSENCE OF ONE. Three cases landed on top of the
 * sixteen a predecessor measured, and every standing leg's red set
 * came back identical member for member — because what the persona
 * and settings cases write outside their own tables is a domain
 * apiece, and nothing they do reaches a domain's settings payload,
 * its dependents or its taxonomy. A half writing through more
 * tables would have moved them, which is why the SET and not the
 * count is what says nothing shifted underneath.
 *
 * THE TWO LEGS A PREDECESSOR RECORDED AS ONE READING ARE TWO NOW,
 * and the refusal cases are what separated them. Counting
 * `count(*)` instead of `count(terms.id)` and ordering the category
 * list by id instead of by `key` each redden THREE and share only
 * two: the count leg reaches the cascade case, which compares the
 * surviving domain's listed row whole, while the ordering leg
 * reaches the depth case, which compares the ordered key list the
 * refused write is absent from. Dropping the category list's
 * `WHERE` reddens three as well and is a third set again: it alone
 * reaches the duplicate-key case, and it reaches neither the
 * term-count case nor the depth one. All three share the taxonomy
 * case and nothing else, so what looked like one reading is now
 * three overlapping ones and the overlap is a single assertion.
 * Ordering the term list by id still reddens two, the term read and
 * the rewrite, the second through a standing-rows control rather
 * than through its own subject.
 *
 * THREE OF THE ROUND-TRIP LEGS STILL REDDEN EXACTLY ONE APIECE, and
 * that narrowness is what says each claim is isolated. Answering
 * the insert's own `settings` argument instead of the stored
 * payload reddens the jsonb case alone, because every other case
 * stores `{}` — where an echo and a read are the same value.
 * Stamping `updated_at` from `created_at` instead of `now()`
 * reddens the patch case alone. Naming the wrong `ON CONFLICT`
 * target reddens the rewrite case alone: against a target no row
 * collides on, the first pass still lands and only a second pass
 * has anything to conflict with.
 *
 * THE CLASSIFIER LEGS SPLIT BY MECHANISM, WHICH IS WHAT SAYS THE
 * FOUR KEY CASES ARE FOUR CLAIMS RATHER THAN ONE WRITTEN OUT FOUR
 * TIMES. Leaving 23505 unclassified reddens exactly the four
 * natural-key cases, 23503 exactly the `NO ACTION` case and 23514
 * exactly the depth case. Dropping the constraint name from every
 * refusal reddens FIVE — those four plus the `NO ACTION` case —
 * and pointedly not the depth case, which asserts the name is
 * undefined precisely because a trigger names nothing. Its staying
 * green under a leg that makes EVERY name undefined is invisibility
 * BY CONSTRUCTION rather than a coverage hole, and naming it as
 * that is what stops the five being read as a missing sixth.
 *
 * THREE LEGS REACH ONE STATEMENT EACH, AND ONE OF THEM IS A SECOND
 * FAULT AT A CASE ANOTHER LEG ALREADY REDDENED. Clearing a
 * category's children before deleting it reddens the `NO ACTION`
 * case, the same single case the unclassified 23503 reddens: one is
 * a rule that stopped being translated and the other a rule that
 * stopped firing, and only the assertion inside the case says
 * which. Dropping the `WHERE` from `deleteDomain` reddens the
 * cascade case, through the control that the second domain kept
 * what it had. Unwrapping `insertPersona` from its `refusing`
 * translation reddens the persona key case alone, and that width is
 * the reading worth holding against the 23505 leg's four: the
 * shared classifier stands behind every store and the wrapper
 * behind one, so the two legs measure different halves of the same
 * containment boundary.
 *
 * THE EIGHT NEW LEGS COLLAPSE TO THREE READINGS, ONE PER CASE, and
 * what separates the legs sharing a case is which ASSERTION failed
 * rather than which case did. All four settings legs redden the
 * settings case alone: dropping the `ON CONFLICT` clause raises
 * `operator_settings_pkey` at the second write and reaches no
 * assertion at all, answering the write's own argument instead of
 * the `RETURNING` row fails the key ORDER, dropping the `now()`
 * stamp fails the rewritten `updated_at`, and collapsing an absent
 * row's null to `{}` fails the very first line of the case. Four
 * faults, four lines, one case — a report quoting the count alone
 * would read as one leg written out four times.
 *
 * THE TWO PERSONA LIST LEGS SHARED AN ASSERTION UNTIL THE CASE WAS
 * REORDERED, which is that finding from the other side. A dropped
 * `WHERE` and an `ORDER BY` on the wrong column both fail a
 * comparison of one domain's list, so with that read first the two
 * legs were one line apart and told apart only by their diffs;
 * asserting the OTHER domain's list ahead of it gives the scope leg
 * a line of its own, since a single-row list has no order to get
 * wrong. The remaining pair is the persona patch, and they are as
 * far apart as two legs in one case can be: deleting the
 * empty-patch early return throws drizzle's own `No values to set`
 * — the only leg here whose subject is a call that cannot be made
 * at all — while dropping `systemText` from the `set` list fails
 * the retuned text.
 *
 * THE KEY-SET PIN IS A `check-types` LEG rather than a red case, and
 * was measured the same way: a fabricated member on `DomainRecord`
 * answers TS2322 at {@link EVERY_KEY_LISTED} with all sixteen cases
 * still green, which is what says the `satisfies` lists close only
 * the direction that does not matter.
 *
 * EVERY ERROR THIS FILE CONSTRUCTS CARRIES `[api-live]`, so a
 * failure raised by a helper names the suite that raised it. That
 * does not extend to a case's own assertion failures, and nothing
 * here catches one: vitest renders an assertion error's expected and
 * actual as the diff that says what differed, a re-wrap would
 * replace it with a prefix the case name already carries, and the
 * rule the case stands for is in that name too.
 */
import type { DomainSettings } from '../../src/db/schema/domains.js';
import type { OperatorSettings } from '../../src/db/schema/settings.js';
import type { DomainStore } from '../../src/domains/index.js';
import type { DomainRecord } from '../../src/domains/store.js';
import type { StoreWindow } from '../../src/http/schemas.js';
import type { PersonaRecord, PersonaStore } from '../../src/personas/store.js';
import type { SettingsStore } from '../../src/settings/store.js';
import type {
  CategoryRecord,
  CategoryWithTermCount,
  TaxonomyStore,
  TermRecord,
  TermValues,
} from '../../src/taxonomy/store.js';
import type { Pool } from 'pg';

import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';

import {
  OPERATOR_SETTINGS_ID,
  operatorSettings,
} from '../../src/db/schema.js';
import { StoreRefusal } from '../../src/db/store-errors.js';
import { createDbDomainStore } from '../../src/domains/index.js';
import { createDbPersonaStore } from '../../src/personas/db-store.js';
import { createDbSettingsStore } from '../../src/settings/db-store.js';
import { createDbTaxonomyStore } from '../../src/taxonomy/db-store.js';

import {
  applyMigrations,
  createLiveDb,
  createLivePool,
  describeLivePg,
  resetTables,
} from './live-postgres.js';

/**
 * The slug every case plants its domain under.
 *
 * `example-tech-radar` is the seeded worked example, so a fixture
 * here stays in the register `data/domains.json` set: neutral about
 * the subject, and recognisable as an example rather than as
 * anybody's deployment.
 */
const RADAR = 'example-tech-radar';

/** Its operator-facing label. */
const RADAR_NAME = 'Example Tech Radar';

/**
 * A second domain, invented in the same register.
 *
 * It exists for the scope reading alone: the category list takes a
 * `domain_id`, and a `WHERE` clause that had stopped narrowing would
 * answer both taxonomies while every count still added up.
 */
const TRANSIT = 'example-urban-transit';

/** Its label. */
const TRANSIT_NAME = 'Example Urban Transit';

/** The root of the planted taxonomy. */
const ROOT_KEY = 'technologies';

/** Its label. */
const ROOT_NAME = 'Technologies';

/**
 * The child that sits under the root, and the bucket every term
 * below lands in.
 *
 * Its key sorts BEFORE the root's, and the fixture writes the root
 * first — so a list read answering insertion order rather than key
 * order answers these two the other way round, which is what makes
 * the ordering assertion a reading instead of a restatement.
 */
const CHILD_KEY = 'frameworks';

/** Its label. */
const CHILD_NAME = 'Frameworks';

/** The label a patch renames the domain to. */
const RENAMED = 'Example Tech Radar (renamed)';

/**
 * A window wider than anything this file plants.
 *
 * What a window SELECTS is `src/domains/routes.test.ts`'s claim and
 * not this file's; here it is wide on purpose, so no reading below
 * can depend on where a row happened to fall.
 */
const WHOLE: StoreWindow = { limit: 50, offset: 0 };

/**
 * An id no row carries, which the reset is what guarantees.
 *
 * `resetTables` truncates with `RESTART IDENTITY`, so every sequence
 * is back at 1 when a case starts and the first id any table issues
 * is this one. Reading it before anything is planted is therefore a
 * read of a table that is genuinely empty rather than of an id that
 * merely happens to be free.
 */
const FIRST_ID = 1;

/**
 * The settings payload the jsonb reading is taken over.
 *
 * The member order here is chosen to be one jsonb will NOT keep:
 * keys are held by length and then by bytes, so `scoringWeights`
 * (15) comes back ahead of `verdictVocabulary` (17) and
 * `findingsDisplayName` (19), and `recency` (7) ahead of `termMatch`
 * (9) inside the nested record. Written in the answered order this
 * whole case would be green against a store that echoed its
 * argument.
 */
const SENT_SETTINGS: DomainSettings = {
  verdictVocabulary: ['adopt', 'trial', 'hold'],
  findingsDisplayName: 'Signals',
  scoringWeights: { termMatch: 3, recency: 1 },
};

/** The order {@link SENT_SETTINGS} was written in. */
const SENT_TOP_ORDER: readonly string[] = [
  'verdictVocabulary',
  'findingsDisplayName',
  'scoringWeights',
];

/** The order jsonb answers it in. Measured, not derived. */
const STORED_TOP_ORDER: readonly string[] = [
  'scoringWeights',
  'verdictVocabulary',
  'findingsDisplayName',
];

/** The same reordering one level down, inside `scoringWeights`. */
const STORED_NESTED_ORDER: readonly string[] = ['recency', 'termMatch'];

/**
 * The lexicon a bulk import writes into {@link CHILD_KEY}.
 *
 * Written in an order that is neither the pattern order the store
 * reads back in nor its reverse, so an answer echoing the submitted
 * order and an answer sorted by the database are three different
 * lists rather than two.
 */
const LEXICON = [
  {
    pattern: 'graph database',
    weight: 3,
    polarity: 'positive',
    notes: 'A worked example, not a recommendation.',
  },
  { pattern: 'vector search', weight: 2, polarity: 'positive', notes: null },
  { pattern: 'legacy stack', weight: 1, polarity: 'negative', notes: null },
] as const satisfies readonly TermValues[];

/** {@link LEXICON} read back in the order the store answers. */
const LEXICON_PATTERNS: readonly string[] = [
  'graph database',
  'legacy stack',
  'vector search',
];

/**
 * What a second import pass writes over one row of {@link LEXICON}.
 *
 * Every member the upsert rewrites differs from what the first pass
 * stored — the weight, the polarity and the note — because a
 * rewrite agreeing with the stored value in any of them is a member
 * the case cannot report on.
 */
const REWRITTEN = {
  pattern: 'vector search',
  weight: 9,
  polarity: 'negative',
  notes: 'Rewritten by the second pass.',
} as const satisfies TermValues;

/**
 * The key a category that never lands would have carried.
 *
 * Every write naming it below is one the database refuses, so the
 * taxonomy read that follows is a reading of what was NOT stored
 * rather than a formality.
 */
const GRANDCHILD_KEY = 'runtimes';

/** Its label. */
const GRANDCHILD_NAME = 'Runtimes';

/**
 * A second child of the root, and the depth case's control.
 *
 * The refused write and this one differ in their parent and in
 * nothing else, which is what says the trigger refused the DEPTH
 * rather than the write, the key or the domain.
 */
const SIBLING_KEY = 'languages';

/** Its label. */
const SIBLING_NAME = 'Languages';

/**
 * The role every persona case plants first.
 *
 * `personas.role` carries no CHECK — the roles a pipeline plays
 * grow with the pipeline — so this is a fixture rather than a
 * member of any closed set.
 */
const RESEARCHER = 'researcher';

/** A second role, for the rename that collides with the first. */
const SCORER = 'scorer';

/**
 * A third role, and the one a list read answers FIRST.
 *
 * It sorts ahead of both the others while being written after them,
 * so an answer in insertion order and an answer in role order are
 * two different lists rather than one.
 */
const DRAFTER = 'drafter';

/** The system text a planted persona carries. */
const SYSTEM_TEXT = 'Survey the field and report what changed.';

/** What a patch rewrites that text to. */
const RETUNED_TEXT = 'Survey the field and say what an operator should read.';

/**
 * The system text of a role that has none yet.
 *
 * AN EMPTY STRING IS A LEGAL VALUE HERE, and `personas.system_text`
 * is `NOT NULL`, so this is a value being written rather than a
 * member left off: the role exists and has no instructions. Nothing
 * on the port treats it as an absence, and a round trip is where a
 * store quietly defaulting it would show.
 */
const NO_TEXT = '';

/**
 * The text a refused persona write carries.
 *
 * Different from {@link SYSTEM_TEXT} on purpose: a refusal that
 * wrote anyway is only visible where the two disagree.
 */
const REFUSED_TEXT = 'Written by a request the database refused.';

/**
 * The operator configuration the settings case writes first.
 *
 * Its member order is chosen to be one jsonb will NOT keep, exactly
 * as {@link SENT_SETTINGS} is for `domains.settings`: keys are held
 * by length and then by bytes, so `digestFormat` (13) comes back
 * ahead of `defaultDomainSlug` (17) and `notificationChannels` (20),
 * and `email` (5) ahead of `webhook` (7) inside the nested record.
 *
 * `defaultDomainSlug` names a domain the case deliberately never
 * plants. No foreign key reaches inside a jsonb payload, and this
 * port resolves no domain — `src/settings/service.ts` checks the
 * slug on the way IN — so what is stored here is whatever the app
 * layer allowed through, which is a fact only a database can report.
 */
const SENT_OPERATOR_SETTINGS: OperatorSettings = {
  notificationChannels: { webhook: true, email: false },
  defaultDomainSlug: RADAR,
  digestFormat: 'rss',
};

/** The order {@link SENT_OPERATOR_SETTINGS} was written in. */
const SENT_OPERATOR_ORDER: readonly string[] = [
  'notificationChannels',
  'defaultDomainSlug',
  'digestFormat',
];

/** The order jsonb answers it in. Measured, not derived. */
const STORED_OPERATOR_ORDER: readonly string[] = [
  'digestFormat',
  'defaultDomainSlug',
  'notificationChannels',
];

/** The same reordering inside `notificationChannels`. */
const STORED_CHANNEL_ORDER: readonly string[] = ['email', 'webhook'];

/**
 * What the second write replaces the whole payload with.
 *
 * It names ONE member, and a different value for it than the first
 * write stored — so the same answer reports both halves of the
 * whole-unit rule: the member that is rewritten, and the two that
 * are cleared by being left out. A merge would answer all three.
 */
const REWRITTEN_SETTINGS: OperatorSettings = { digestFormat: 'pdf' };

/**
 * An id no category carries in any case below.
 *
 * `resetTables` restarts every sequence and no case here plants
 * anywhere near this many rows, so a `parentId` naming it is a
 * parent that genuinely is not there rather than one that merely
 * has not been written yet.
 */
const ABSENT_ID = 9999;

/**
 * Every member `DOMAIN_COLUMNS` in `src/domains/db-store.ts`
 * projects.
 *
 * Asserted as a SET beside the field reads rather than instead of
 * them, and it is the half that catches what a field read cannot: a
 * column added to `domains` and put on the projection reaches every
 * route the same day, and no assertion naming a member notices a
 * member arriving.
 */
const DOMAIN_KEYS = [
  'createdAt',
  'embeddingModel',
  'featureVersion',
  'id',
  'name',
  'settings',
  'slug',
  'updatedAt',
] as const satisfies readonly (keyof DomainRecord)[];

/** Every member the taxonomy store projects for a category. */
const CATEGORY_KEYS = [
  'domainId',
  'id',
  'key',
  'name',
  'parentId',
] as const satisfies readonly (keyof CategoryRecord)[];

/** The same members, plus the one a list read adds to them. */
const LISTED_KEYS = [
  ...CATEGORY_KEYS,
  'termCount',
] as const satisfies readonly (keyof CategoryWithTermCount)[];

/** Every member the taxonomy store projects for a term. */
const TERM_KEYS = [
  'categoryId',
  'id',
  'notes',
  'pattern',
  'polarity',
  'weight',
] as const satisfies readonly (keyof TermRecord)[];

/**
 * Every member `PERSONA_COLUMNS` in `src/personas/db-store.ts`
 * projects, which on this table is every column it has.
 *
 * `personas` carries no `created_at` and no `updated_at`, so the
 * record and the row are the same four members and a timestamp
 * arriving would be a schema change this set reports.
 */
const PERSONA_KEYS = [
  'domainId',
  'id',
  'role',
  'systemText',
] as const satisfies readonly (keyof PersonaRecord)[];

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

/** All five lists above, held against the types they describe. */
type EveryKeyListed =
  CoversEveryKey<DomainRecord, typeof DOMAIN_KEYS>
  & CoversEveryKey<CategoryRecord, typeof CATEGORY_KEYS>
  & CoversEveryKey<CategoryWithTermCount, typeof LISTED_KEYS>
  & CoversEveryKey<TermRecord, typeof TERM_KEYS>
  & CoversEveryKey<PersonaRecord, typeof PERSONA_KEYS>;

/**
 * The half of the drift guard `check-types` owns.
 *
 * The `satisfies` clauses above close the direction where a list
 * names a member its record lacks; this one closes the direction
 * that actually matters, a record growing a member no list knows
 * about. That turns {@link EveryKeyListed} into `never` and this
 * initializer into a TS2322 at this line — before any case can
 * compare an answer against a set that has quietly stopped
 * describing it. Read by a case below so it is a symbol this file
 * uses rather than one lint reports.
 */
const EVERY_KEY_LISTED: EveryKeyListed = true;

/** {@link DOMAIN_KEYS}, sorted at use rather than by hand. */
const DOMAIN_KEY_SET: readonly string[] = [...DOMAIN_KEYS].sort();

/** {@link CATEGORY_KEYS}, sorted. */
const CATEGORY_KEY_SET: readonly string[] = [...CATEGORY_KEYS].sort();

/** {@link LISTED_KEYS}, sorted. */
const LISTED_KEY_SET: readonly string[] = [...LISTED_KEYS].sort();

/** {@link TERM_KEYS}, sorted. */
const TERM_KEY_SET: readonly string[] = [...TERM_KEYS].sort();

/** {@link PERSONA_KEYS}, sorted. */
const PERSONA_KEY_SET: readonly string[] = [...PERSONA_KEYS].sort();

/**
 * The unique key on `domains.slug`.
 *
 * The four key names here are spelled in `src/db/schema/`, so each
 * is a name this repository chose rather than one Postgres derived
 * — which is what makes asserting them a reading of the migration
 * and not of the driver. A derived name would not be greppable in
 * this repository at all.
 */
const DOMAIN_SLUG_KEY = 'domains_slug_unique';

/** The unique key on `(categories.domain_id, categories.key)`. */
const CATEGORY_KEY_UNIQUE = 'categories_domain_id_key_unique';

/** The unique key on `(terms.category_id, terms.pattern)`. */
const TERM_PATTERN_KEY = 'terms_category_id_pattern_unique';

/** The unique key on `(personas.domain_id, personas.role)`. */
const PERSONA_ROLE_KEY = 'personas_domain_id_role_unique';

/**
 * The foreign key `categories.parent_id` opens.
 *
 * ONE NAME COVERS TWO REFUSALS, which is why `src/taxonomy/store.ts`
 * has the service tell them apart by the call it made rather than
 * by anything on the refusal: an insert naming a parent that does
 * not exist and a delete of a category still holding children are
 * both this key and both a `foreign-key-violation`. One case below
 * raises the pair and compares them.
 */
const PARENT_FK = 'categories_parent_id_categories_id_fk';

/**
 * Every enumerable field a `StoreRefusal` carries, sorted.
 *
 * `message`, `stack` and `cause` are NON-enumerable on an `Error`,
 * so these three are what a logger walking a refusal writes. A
 * fourth arriving here would have come off the driver error a live
 * refusal is built from, which is a submitted value one property
 * read from a log line — the reason `src/db/store-errors.ts` takes
 * no message parameter at all.
 */
const REFUSAL_KEY_SET: readonly string[] = ['constraint', 'name', 'reason'];

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
 * @returns The row, without the `null`.
 * @throws Error When the read answered null.
 */
function present<T>(value: T | null, read: string): T {
  if (value === null) {
    throw new Error(
      `[api-live] reading ${read} answered null, so every assertion `
      + 'below it would be about nothing.',
    );
  }

  return value;
}

/**
 * The one row of an unordered answer carrying a pattern.
 *
 * `TaxonomyStore.upsertTerms` promises no order at all — `RETURNING`
 * follows the statement's own processing order — so a case reading a
 * specific row out of a batch has to find it rather than index it.
 * The throw is the vacuity guard: two `undefined`s compare equal, so
 * a `toStrictEqual` over a row that was never answered is green for
 * nobody's reason.
 *
 * Exactly one rather than at least one, because the pattern is half
 * of `terms_category_id_pattern_unique` within a category: two rows
 * carrying it is the very accumulation the upsert exists to prevent,
 * and reporting it here names it rather than letting a later count
 * report a number nobody can attribute.
 *
 * @param rows - Whatever the write or the read answered.
 * @param pattern - The pattern to find, a constant of this file.
 * @returns The single row carrying it.
 * @throws Error When the rows carry it anything but once.
 */
function termNamed(
  rows: readonly TermRecord[],
  pattern: string,
): TermRecord {
  const matching = rows.filter((row) => row.pattern === pattern);
  const [row] = matching;

  if (row === undefined || matching.length !== 1) {
    throw new Error(
      `[api-live] expected exactly one row for pattern "${pattern}", `
      + `read ${String(matching.length)} of ${String(rows.length)}.`,
    );
  }

  return row;
}

/**
 * One `operator_settings` row, as the table itself declares it.
 *
 * Derived from the table rather than written out, so a column added
 * to `src/db/schema/settings.ts` moves this type with it.
 * `src/settings/store.ts` says no timestamp crosses that port and
 * declares no record type at all — the payload IS what a read and a
 * write deal in — so three of these four members are reachable only
 * by reading past the port, which is what the settings case below
 * does and why it says so.
 */
type SettingsRow = typeof operatorSettings.$inferSelect;

/**
 * The single row a read past the port was supposed to answer.
 *
 * A read that came back empty breaks the case in its SETUP, where a
 * missing row and a wrong value otherwise read alike — so the
 * refusal names what was being read rather than leaving every
 * assertion below it to fail against an undefined.
 *
 * It guards the empty result and NOT the length, deliberately: that
 * the table holds one row is the singleton claim the settings case
 * makes for itself, one line above each call, and a helper throwing
 * on it would take the file's own assertion out of the file.
 *
 * @param rows - Whatever the read answered.
 * @param read - What was being read, quoted back in the refusal.
 * @returns Its first row, without the `undefined`
 *   `noUncheckedIndexedAccess` gives the index access.
 * @throws Error When the read answered no row at all.
 */
function oneRow<T>(rows: readonly T[], read: string): T {
  const [row] = rows;

  if (row === undefined) {
    throw new Error(
      `[api-live] reading ${read} answered no row, so every `
      + 'assertion below it would be about nothing.',
    );
  }

  return row;
}

/**
 * The refusal a live write was supposed to raise.
 *
 * Throws on both of the shapes that are not one. A call that
 * ANSWERED leaves every assertion below it about a refusal nobody
 * built, and a thrown value that is not a `StoreRefusal` is the one
 * thing every implementation of these ports promises never to
 * raise — so rethrowing it here is what says a driver error crossed
 * the port translated rather than raw, which is the containment
 * boundary each `db-store.ts` wraps its writes in.
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
    '[api-live] expected a StoreRefusal and the call answered, so '
    + 'the refusal asserted below was never raised at all.',
  );
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
 * The domain, the root and the child one case plants.
 *
 * Named rather than inlined so the plant helper below has a return
 * type a reader can hold the cases against.
 */
interface PlantedTaxonomy {
  /** The domain both categories hang off. */
  readonly domain: DomainRecord;

  /** The root, written FIRST and read back second. */
  readonly root: CategoryRecord;

  /** The child under it, and the bucket every term lands in. */
  readonly child: CategoryRecord;
}

describeLivePg('wave-1 stores (live Postgres)', () => {
  let pool: Pool;
  let db: ReturnType<typeof createLiveDb>;

  // All four stores are built before the pool exists, which is the
  // ordering the thunk in each of them is there for: `src/index.ts`
  // builds these same four while `createService` is still
  // registering, and that is before the Postgres dependency has
  // started. Constructing them here touches nothing — a store that
  // resolved `db` eagerly would capture an undefined and fail every
  // case in this file, which is this run's reading of that claim.
  //
  // `createDbDomainStore` comes through `src/domains/index.js` and
  // not through the module declaring it, which is the containment
  // rule that barrel states about itself. Taxonomy, personas and
  // settings carry no barrel, so those three constructors are deep
  // imports; see `ls src/*/index.ts`.
  const domainStore: DomainStore = createDbDomainStore(() => db);
  const taxonomyStore: TaxonomyStore = createDbTaxonomyStore(() => db);
  const personaStore: PersonaStore = createDbPersonaStore(() => db);
  const settingsStore: SettingsStore = createDbSettingsStore(() => db);

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
   * Writes the domain every case reads under.
   *
   * @param settings - The payload to store. Defaults to the empty
   *   object, which is a complete value rather than an absence.
   * @returns The stored row, as the database answered it.
   */
  async function plantDomain(
    settings: DomainSettings = {},
  ): Promise<DomainRecord> {
    return await domainStore.insertDomain({
      slug: RADAR,
      name: RADAR_NAME,
      settings,
    });
  }

  /**
   * Writes a domain, a root category and a child under that root.
   *
   * The root goes first, so every ordering assertion below is taken
   * against a table whose insertion order and key order disagree.
   *
   * @returns All three stored rows.
   */
  async function plantTaxonomy(): Promise<PlantedTaxonomy> {
    const domain = await plantDomain();
    const root = await taxonomyStore.insertCategory({
      domainId: domain.id,
      key: ROOT_KEY,
      name: ROOT_NAME,
      parentId: null,
    });
    const child = await taxonomyStore.insertCategory({
      domainId: domain.id,
      key: CHILD_KEY,
      name: CHILD_NAME,
      parentId: root.id,
    });

    return { domain, root, child };
  }

  /**
   * Every `operator_settings` row, read past the port.
   *
   * `SettingsStore` has no count, no list and no method taking an
   * id, so how many rows the table holds is a question no reading
   * through it can ask — which is the singleton rule working
   * rather than a gap, since a second configuration is something
   * that interface cannot express. Asking it anyway is the whole
   * point of taking the reading here: the CHECK and the primary key
   * are the database's, and this is where they can be seen holding.
   *
   * @returns Whatever `operator_settings` holds, unfiltered, so an
   *   extra row is a length rather than something a `WHERE` hid.
   */
  async function settingsRows(): Promise<readonly SettingsRow[]> {
    return await db.select().from(operatorSettings);
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
    expect(await domainStore.countDomains()).toBe(0);
    expect(await domainStore.listDomains(WHOLE)).toStrictEqual([]);
    expect(await domainStore.findDomainBySlug(RADAR)).toBeNull();
    expect(await taxonomyStore.listCategoriesWithTermCounts(FIRST_ID))
      .toStrictEqual([]);
    expect(await taxonomyStore.listTerms(FIRST_ID)).toStrictEqual([]);
    expect(await taxonomyStore.countTerms(FIRST_ID)).toBe(0);
  });

  it('holds every key list against the type it describes', () => {
    // The runtime half of the drift guard: the pin above is what
    // `check-types` reads, and a symbol nothing uses is a lint error,
    // so the two obligations are discharged by one line.
    expect(EVERY_KEY_LISTED).toBe(true);
    expect(DOMAIN_KEY_SET).toHaveLength(DOMAIN_KEYS.length);
    expect(LISTED_KEY_SET).toHaveLength(CATEGORY_KEYS.length + 1);
  });

  it('writes a domain the database identifies and stamps', async () => {
    const created = await plantDomain();

    // The whole key set beside the field reads, never instead of
    // them: a column added to `domains` and projected reaches every
    // route the same day, and no field assertion notices an arrival.
    expect(keysOf(created)).toStrictEqual(DOMAIN_KEY_SET);
    expect(created.slug).toBe(RADAR);
    expect(created.name).toBe(RADAR_NAME);
    expect(created.settings).toStrictEqual({});

    // Three members the insert never carried, all three the
    // database's. `bigserial` in `number` mode is what makes the id a
    // number here and a string off a raw driver.
    expect(typeof created.id).toBe('number');
    expect(created.featureVersion).toBeNull();
    expect(created.embeddingModel).toBeNull();

    // Both stamps come from column defaults on ONE statement, so they
    // are equal. A store supplying `updated_at` itself beside a
    // defaulted `created_at` would not answer this.
    expect(created.createdAt).toBeInstanceOf(Date);
    expect(created.updatedAt.toISOString())
      .toBe(created.createdAt.toISOString());

    // Read back through the natural key, which is where every wave-1
    // request naming a `:slug` enters. Compared whole, so the read
    // and the write are pinned to one projection rather than to two
    // that agree today.
    const read = present(
      await domainStore.findDomainBySlug(RADAR),
      'findDomainBySlug after the insert',
    );

    expect(read).toStrictEqual(created);
    expect(await domainStore.countDomains()).toBe(1);
  });

  it('answers the settings jsonb holds, not the ones sent', async () => {
    const created = await plantDomain(SENT_SETTINGS);

    // The VALUES survive whole — `toStrictEqual` compares members and
    // is blind to their order, which is what leaves the order below
    // as a separate claim rather than a restatement of this one.
    expect(created.settings).toStrictEqual(SENT_SETTINGS);

    // The control first: the payload really was written in an order
    // jsonb does not keep. Without this the reordering assertion is
    // equally green against a constant that was already sorted.
    expect(Object.keys(SENT_SETTINGS)).toStrictEqual(SENT_TOP_ORDER);
    expect(STORED_TOP_ORDER).not.toStrictEqual(SENT_TOP_ORDER);

    // And the ORDER did not survive, at both depths. This is the
    // reading that says the `RETURNING` list read the stored row
    // rather than echoing the argument it was handed — the one claim
    // about these stores that no in-memory implementation can be
    // made to fail, because a map cannot change what it was given.
    expect(Object.keys(created.settings)).toStrictEqual(STORED_TOP_ORDER);
    expect(Object.keys(present(
      created.settings.scoringWeights ?? null,
      'the stored scoringWeights record',
    ))).toStrictEqual(STORED_NESTED_ORDER);

    // The plain read agrees with the write's own `RETURNING`, which
    // is what says the reordering is the column's and not one
    // statement's.
    const read = present(
      await domainStore.findDomainBySlug(RADAR),
      'findDomainBySlug after the settings insert',
    );

    expect(Object.keys(read.settings)).toStrictEqual(STORED_TOP_ORDER);
    expect(read.settings).toStrictEqual(created.settings);
  });

  it('stamps updated_at on a patch and holds created_at', async () => {
    // Planted through the taxonomy helper rather than through
    // `plantDomain`, so the two category writes sit between the
    // insert and the patch. That matters because the comparison
    // below is a CLOCK comparison and a pg `timestamptz` reaches
    // JavaScript truncated to milliseconds: the intervening
    // statements are what put the two stamps further apart than the
    // resolution they are read at.
    const { domain } = await plantTaxonomy();
    const patched = present(
      await domainStore.updateDomain(domain.id, { name: RENAMED }),
      'updateDomain naming only the label',
    );

    expect(keysOf(patched)).toStrictEqual(DOMAIN_KEY_SET);
    expect(patched.id).toBe(domain.id);
    expect(patched.name).toBe(RENAMED);

    // Compared as ISO strings rather than through `String(date)`,
    // which truncates to whole SECONDS and would report a stamp that
    // moved correctly as one that never moved at all.
    expect(patched.createdAt.toISOString())
      .toBe(domain.createdAt.toISOString());
    expect(patched.updatedAt.getTime())
      .toBeGreaterThan(domain.updatedAt.getTime());

    // An absent member is not written: drizzle drops every
    // `undefined` from a `set` list before rendering it, so the
    // stored payload stands — and the empty one stored above is the
    // weaker half of that, which is why the slug is read too.
    expect(patched.slug).toBe(RADAR);
    expect(patched.settings).toStrictEqual({});
  });

  it('hangs a root and a child off the domain it was given', async () => {
    const { domain, root, child } = await plantTaxonomy();

    expect(keysOf(root)).toStrictEqual(CATEGORY_KEY_SET);
    expect(typeof root.id).toBe('number');
    expect(root.domainId).toBe(domain.id);
    expect(root.parentId).toBeNull();
    expect(child.domainId).toBe(domain.id);
    expect(child.parentId).toBe(root.id);

    // A second domain carrying the SAME root key, which is the
    // positive control on the natural key being per-domain rather
    // than global — and the fixture the scope reading below needs.
    const other = await domainStore.insertDomain({
      slug: TRANSIT,
      name: TRANSIT_NAME,
      settings: {},
    });
    const otherRoot = await taxonomyStore.insertCategory({
      domainId: other.id,
      key: ROOT_KEY,
      name: ROOT_NAME,
      parentId: null,
    });

    // Ordered by `key` ascending, so the child comes first even
    // though the root was written first — an answer in insertion
    // order is a different list, not the same one.
    expect(await taxonomyStore.listCategoriesWithTermCounts(domain.id))
      .toStrictEqual([
        { ...child, termCount: 0 },
        { ...root, termCount: 0 },
      ]);

    // And the read is scoped to the domain that was asked for. A
    // `WHERE` clause that stopped narrowing would answer three rows
    // here while every count in the case above still added up.
    expect(await taxonomyStore.listCategoriesWithTermCounts(other.id))
      .toStrictEqual([{ ...otherRoot, termCount: 0 }]);

    const read = present(
      await taxonomyStore.findCategoryById(child.id),
      'findCategoryById after the insert',
    );

    expect(read).toStrictEqual(child);
  });

  it('fills one bucket and counts the empty one at zero', async () => {
    const { domain, root, child } = await plantTaxonomy();
    const written = await taxonomyStore.upsertTerms(child.id, LEXICON);

    expect(written).toHaveLength(LEXICON.length);
    expect(await taxonomyStore.countTerms(child.id)).toBe(LEXICON.length);
    expect(await taxonomyStore.countTerms(root.id)).toBe(0);

    const listed = await taxonomyStore
      .listCategoriesWithTermCounts(domain.id);

    // THE reading the grouped left join exists for. `count(terms.id)`
    // answers 0 for the root, where the `count(*)` spelling of the
    // same statement answers 1 — a left join gives a category holding
    // nothing exactly one null-extended row — so the empty bucket is
    // the member an unwatched change inverts, and it is the one an
    // operator scans the list for.
    expect(listed).toStrictEqual([
      { ...child, termCount: LEXICON.length },
      { ...root, termCount: 0 },
    ]);
    expect(keysOf(present(listed[0] ?? null, 'the first listed row')))
      .toStrictEqual(LISTED_KEY_SET);
  });

  it('reads the terms of a category in the database order', async () => {
    const { root, child } = await plantTaxonomy();
    const single = await taxonomyStore.insertTerm({
      categoryId: child.id,
      ...REWRITTEN,
    });

    expect(keysOf(single)).toStrictEqual(TERM_KEY_SET);
    expect(typeof single.id).toBe('number');
    expect(single.categoryId).toBe(child.id);
    // `polarity` is a `text` column the port types by the union
    // `terms_polarity_check` is generated from, so a value crossing
    // back out of that union is a narrowing the store has to make
    // rather than one it may assume.
    expect(single.polarity).toBe(REWRITTEN.polarity);
    expect(single.weight).toBe(REWRITTEN.weight);
    expect(single.notes).toBe(REWRITTEN.notes);

    await taxonomyStore.deleteTerm(single.id);
    const written = await taxonomyStore.upsertTerms(child.id, LEXICON);

    // Ordered by `pattern` under the server's own collation, which is
    // neither the order the document was written in nor its reverse.
    const listed = await taxonomyStore.listTerms(child.id);

    expect(listed.map((row) => row.pattern))
      .toStrictEqual(LEXICON_PATTERNS);
    expect(listed).toStrictEqual(
      LEXICON_PATTERNS.map((pattern) => termNamed(written, pattern)),
    );

    // The window narrows the same order rather than reordering it.
    const page = await taxonomyStore
      .listTerms(child.id, { limit: 1, offset: 1 });

    expect(page.map((row) => row.pattern)).toStrictEqual(['legacy stack']);

    // Scoped to the bucket that was asked for, and an empty bucket
    // reads as an empty list rather than as the whole table.
    expect(await taxonomyStore.listTerms(root.id)).toStrictEqual([]);
  });

  it('rewrites a term in place on a second import pass', async () => {
    const { child } = await plantTaxonomy();
    const first = await taxonomyStore.upsertTerms(child.id, LEXICON);
    const before = termNamed(first, REWRITTEN.pattern);
    const untouched = termNamed(first, 'graph database');

    // The control that the rewrite has something to change: every
    // member the second pass carries differs from what is stored, so
    // an upsert that quietly did nothing is a red case rather than an
    // assertion satisfied by the value already there.
    expect(before.weight).not.toBe(REWRITTEN.weight);
    expect(before.polarity).not.toBe(REWRITTEN.polarity);
    expect(before.notes).not.toBe(REWRITTEN.notes);

    const second = await taxonomyStore.upsertTerms(child.id, [REWRITTEN]);
    const after = termNamed(second, REWRITTEN.pattern);

    // The conflict found the stored row and answered ITS id, which is
    // what lets import, export and re-import settle instead of
    // accumulating a second row that would count the same match
    // twice. A fake handing out a fresh id per write is the thing
    // this reading rules out.
    expect(after.id).toBe(before.id);
    expect(after).toStrictEqual({
      id: before.id,
      categoryId: child.id,
      ...REWRITTEN,
    });

    // The lexicon did not grow, and the rows the document did not
    // name stood exactly as they were.
    expect(await taxonomyStore.countTerms(child.id)).toBe(LEXICON.length);

    const listed = await taxonomyStore.listTerms(child.id);

    expect(listed.map((row) => row.pattern))
      .toStrictEqual(LEXICON_PATTERNS);
    expect(termNamed(listed, REWRITTEN.pattern)).toStrictEqual(after);
    expect(termNamed(listed, untouched.pattern)).toStrictEqual(untouched);
  });

  it('writes a persona and reads it back whole', async () => {
    const domain = await plantDomain();
    const created = await personaStore.insertPersona({
      domainId: domain.id,
      role: RESEARCHER,
      systemText: SYSTEM_TEXT,
    });

    // The whole key set beside the field reads, for the reason the
    // domain write gives: no field assertion notices a member
    // ARRIVING, and every column of `personas` is prose an operator
    // wrote, one envelope away from the wire.
    expect(keysOf(created)).toStrictEqual(PERSONA_KEY_SET);
    expect(typeof created.id).toBe('number');
    expect(created.domainId).toBe(domain.id);
    expect(created.role).toBe(RESEARCHER);
    expect(created.systemText).toBe(SYSTEM_TEXT);

    // Read back through the id every `/personas/:id` request enters
    // by, and compared whole: the read and the write are pinned to
    // one projection rather than to two that agree today.
    expect(present(
      await personaStore.findPersonaById(created.id),
      'findPersonaById after the insert',
    )).toStrictEqual(created);

    // AN EMPTY SYSTEM TEXT IS A VALUE AND SURVIVES AS ONE. The
    // column is `NOT NULL` and the port admits the empty string —
    // the role exists and has no instructions yet — so a store
    // defaulting it, trimming it away or refusing it reddens here
    // and nowhere a member is merely read.
    const drafter = await personaStore.insertPersona({
      domainId: domain.id,
      role: DRAFTER,
      systemText: NO_TEXT,
    });

    expect(drafter.systemText).toBe(NO_TEXT);
    expect(present(
      await personaStore.findPersonaById(drafter.id),
      'findPersonaById after the empty-text insert',
    ).systemText).toBe(NO_TEXT);

    // A second domain carrying a persona of its own, which is what
    // the scope reading needs: a `WHERE` that had stopped narrowing
    // would answer three rows below while every count still added
    // up.
    const other = await domainStore.insertDomain({
      slug: TRANSIT,
      name: TRANSIT_NAME,
      settings: {},
    });
    const elsewhere = await personaStore.insertPersona({
      domainId: other.id,
      role: SCORER,
      systemText: SYSTEM_TEXT,
    });

    // Scoped to the domain that was asked for, and asserted BEFORE
    // the order below rather than after it: a scope fault and an
    // order fault both fail a read of this domain's list, so taking
    // the other domain's first is what leaves each of the two a
    // line of its own to fail at.
    expect(await personaStore.listPersonas(other.id, WHOLE))
      .toStrictEqual([elsewhere]);

    // Ordered by `role` ascending, so the drafter comes first even
    // though the researcher was written first — an answer in
    // insertion order is a different list, not the same one.
    expect(await personaStore.listPersonas(domain.id, WHOLE))
      .toStrictEqual([drafter, created]);

    // The window narrows that order rather than reordering it.
    const page = await personaStore
      .listPersonas(domain.id, { limit: 1, offset: 1 });

    expect(page).toStrictEqual([created]);
    expect(await personaStore.countPersonas(domain.id)).toBe(2);
    expect(await personaStore.countPersonas(other.id)).toBe(1);

    // An id no domain carries is an empty list and a zero rather
    // than a failure to read: nothing points at a row that is not
    // there, and whether the domain existed was answered by
    // `findDomainBySlug` before any of this was called.
    expect(await personaStore.listPersonas(ABSENT_ID, WHOLE))
      .toStrictEqual([]);
    expect(await personaStore.countPersonas(ABSENT_ID)).toBe(0);
  });

  it('answers an empty persona patch without writing', async () => {
    const domain = await plantDomain();
    const created = await personaStore.insertPersona({
      domainId: domain.id,
      role: RESEARCHER,
      systemText: SYSTEM_TEXT,
    });

    // THE BRANCH THAT EXISTS ONLY BECAUSE THIS IMPLEMENTATION
    // THROWS. `personas` has no timestamp to stamp, so a patch
    // naming no member leaves literally nothing to set and drizzle
    // answers an empty update list with `No values to set` — where
    // an in-memory map would happily hand the row back. The port
    // declares the call legal and owes the stored row, so this is
    // what says the drizzle half reads instead of writing, and it
    // is a reading the isolated suite cannot take: over there,
    // deleting the early return reddens nothing at all.
    expect(await personaStore.updatePersona(created.id, {}))
      .toStrictEqual(created);

    const patched = present(
      await personaStore.updatePersona(created.id, {
        role: SCORER,
        systemText: RETUNED_TEXT,
      }),
      'updatePersona naming both members',
    );

    expect(keysOf(patched)).toStrictEqual(PERSONA_KEY_SET);
    expect(patched.id).toBe(created.id);
    expect(patched.domainId).toBe(domain.id);
    expect(patched.role).toBe(SCORER);
    expect(patched.systemText).toBe(RETUNED_TEXT);

    // The answered row and the stored row are two claims: a write
    // lying consistently satisfies the first on its own.
    expect(present(
      await personaStore.findPersonaById(created.id),
      'findPersonaById after the patch',
    )).toStrictEqual(patched);

    // THE RENAME MOVED THE ROW RATHER THAN ADDING ONE, so the role
    // it left behind is free again and takes an insert. That is the
    // index the refusal case reads, from the accepting side, and it
    // is why `PersonaPatch` may carry `role` where the sibling
    // patches may not carry their own natural keys.
    const successor = await personaStore.insertPersona({
      domainId: domain.id,
      role: RESEARCHER,
      systemText: NO_TEXT,
    });

    expect(successor.role).toBe(RESEARCHER);
    expect(successor.id).not.toBe(created.id);
    expect(await personaStore.countPersonas(domain.id)).toBe(2);

    // An id no row carries is null rather than a refusal, on the
    // patch as on the read: a row may go between a read and a
    // write, and what that means is the caller's to decide.
    const absent = await personaStore
      .updatePersona(ABSENT_ID, { role: DRAFTER });

    expect(absent).toBeNull();
    expect(await personaStore.findPersonaById(ABSENT_ID)).toBeNull();

    // Nothing hangs off a persona — no foreign key in schema v2
    // points at this table — so this delete cannot be refused, and
    // a second one answers false rather than throwing.
    expect(await personaStore.deletePersona(created.id)).toBe(true);
    expect(await personaStore.deletePersona(created.id)).toBe(false);
    expect(await personaStore.findPersonaById(created.id)).toBeNull();
    expect(await personaStore.countPersonas(domain.id)).toBe(1);
  });

  it('writes the settings singleton twice into one row', async () => {
    // AN ABSENT ROW IS NULL HERE AND `{}` ONE LAYER UP. The port
    // reports which of the two states the database is in and
    // `src/settings/service.ts` is the single place they become one
    // answer — a store collapsing them here would leave nothing
    // able to tell a never-configured deployment from a
    // configured-to-nothing one.
    expect(await settingsStore.readSettings()).toBeNull();
    expect(await settingsRows()).toStrictEqual([]);

    const first = await settingsStore
      .writeSettings(SENT_OPERATOR_SETTINGS);

    // The VALUES survive whole, which is what leaves the ORDER
    // below a separate claim rather than a restatement of this one.
    expect(first).toStrictEqual(SENT_OPERATOR_SETTINGS);

    // The control first: the payload really was written in an order
    // jsonb does not keep. Without it the reordering assertion is
    // equally green against a constant that was already sorted.
    expect(Object.keys(SENT_OPERATOR_SETTINGS))
      .toStrictEqual(SENT_OPERATOR_ORDER);
    expect(STORED_OPERATOR_ORDER).not.toStrictEqual(SENT_OPERATOR_ORDER);

    // And the order did not survive, at both depths. That is the
    // reading which says the `RETURNING` list read the stored row
    // rather than echoing the argument it was handed, and it is the
    // measured zero the in-memory store and the settings service
    // suite both hand over by name: where a store copies a payload
    // in and copies it out again, answering the argument and
    // answering stored state are the same object graph, so no leg
    // over there can tell the two apart.
    expect(Object.keys(first)).toStrictEqual(STORED_OPERATOR_ORDER);
    expect(Object.keys(present(
      first.notificationChannels ?? null,
      'the stored notificationChannels record',
    ))).toStrictEqual(STORED_CHANNEL_ORDER);

    const inserted = oneRow(await settingsRows(), 'operator_settings');

    // THE ID IS THE MODULE'S OWN CONSTANT, which is what puts both
    // of this table's mechanisms out of a caller's reach: the
    // singleton CHECK cannot refuse a value the store chose, and
    // the primary key's conflict is what the second write below is
    // for.
    expect(inserted.id).toBe(OPERATOR_SETTINGS_ID);
    expect(inserted.settings).toStrictEqual(first);

    // Both stamps come from the column defaults on ONE statement,
    // so they are equal. Compared as ISO strings rather than
    // through `String(date)`, which truncates a `timestamptz` to
    // whole seconds and would report almost anything as equal.
    expect(inserted.updatedAt.toISOString())
      .toBe(inserted.createdAt.toISOString());

    // NO CONSTRAINT REACHES INSIDE THE PAYLOAD. The stored
    // `defaultDomainSlug` names a domain that does not exist and
    // the database is content: a jsonb member is out of every
    // foreign key's reach, so checking the slug is the app layer's
    // on the way IN and nothing here repairs it afterwards.
    expect(await domainStore.countDomains()).toBe(0);

    // The plain read agrees with the write's own `RETURNING`, which
    // says the reordering is the column's and not one statement's.
    expect(present(
      await settingsStore.readSettings(),
      'readSettings after the first write',
    )).toStrictEqual(first);

    // A FIRST WRITE AND A REWRITE ARE ONE STATEMENT. This second
    // write conflicts on the id the first one took, and
    // `ON CONFLICT (id) DO UPDATE` absorbs the conflict rather than
    // raising it — where a store branching on a read would be two
    // statements with a gap, in which two first writes both read an
    // empty table and the primary key refuses the loser.
    const second = await settingsStore.writeSettings(REWRITTEN_SETTINGS);

    expect(second).toStrictEqual(REWRITTEN_SETTINGS);

    // THE PAYLOAD IS WRITTEN AS A WHOLE UNIT AND NEVER MERGED. The
    // rewrite names one member and a different value for it, so one
    // answer reports both halves of that rule: the member rewritten
    // and the two cleared by being left out. A merge would answer
    // all three, and omitting a preference and removing one would
    // be the same request.
    expect(second.digestFormat).not.toBe(first.digestFormat);
    expect(second.defaultDomainSlug).toBeUndefined();
    expect(second.notificationChannels).toBeUndefined();

    const after = await settingsRows();

    // THE ROW COUNT IS THE SINGLETON, AND THE PORT CANNOT ANSWER
    // IT. `SettingsStore` has no count, no list and no method
    // taking an id, so a second configuration is not something an
    // implementation must remember not to write — and it is also
    // not something any reading through that port could report.
    // This one is taken past it, which is the only place the claim
    // can be made at all.
    expect(after).toHaveLength(1);

    const rewritten = oneRow(after, 'operator_settings after the rewrite');

    expect(rewritten.id).toBe(inserted.id);
    expect(rewritten.settings).toStrictEqual(REWRITTEN_SETTINGS);

    // `created_at` still means when this deployment was FIRST
    // configured, and `updated_at` moved with the rewrite. That
    // comparison is a CLOCK comparison read at millisecond
    // resolution, since node-postgres truncates a `timestamptz` to
    // a JavaScript `Date`: the reads between the two writes are
    // what put the two stamps further apart than the resolution
    // they are read at.
    expect(rewritten.createdAt.toISOString())
      .toBe(inserted.createdAt.toISOString());
    expect(rewritten.updatedAt.getTime())
      .toBeGreaterThan(inserted.updatedAt.getTime());

    expect(present(
      await settingsStore.readSettings(),
      'readSettings after the rewrite',
    )).toStrictEqual(REWRITTEN_SETTINGS);
  });

  it('refuses a category whose parent is itself a child', async () => {
    const { domain, root, child } = await plantTaxonomy();

    // The trigger `drizzle/0002_category_depth_guard.sql` installs
    // is what refuses this, and it refuses as a CHECK violation
    // naming NOTHING: a `RAISE ... USING ERRCODE` sets no
    // constraint, so `reason` is the whole discriminator and a
    // service reading a name here would read undefined. That is a
    // fact about what the server raises rather than about what the
    // schema says, and this is the only place it can be taken.
    const refusal = await refusalFrom(() => taxonomyStore.insertCategory({
      domainId: domain.id,
      key: GRANDCHILD_KEY,
      name: GRANDCHILD_NAME,
      parentId: child.id,
    }));

    expect(refusal.reason).toBe('check-violation');
    expect(refusal.constraint).toBeUndefined();

    // Nothing off the driver error came with it. The name is present
    // and undefined rather than absent, which is what the port's
    // optional `constraint` is describing.
    expect(keysOf(refusal)).toStrictEqual(REFUSAL_KEY_SET);

    // The control, and it differs from the refused write in its
    // PARENT alone: what the trigger declined is the third level,
    // not the write, the key or the domain.
    const sibling = await taxonomyStore.insertCategory({
      domainId: domain.id,
      key: SIBLING_KEY,
      name: SIBLING_NAME,
      parentId: root.id,
    });

    expect(sibling.parentId).toBe(root.id);

    // And the refused row is not standing. A trigger that fired
    // after the write rather than before it would leave a third
    // level in the taxonomy while the caller read a refusal.
    const listed = await taxonomyStore
      .listCategoriesWithTermCounts(domain.id);

    expect(listed.map((row) => row.key))
      .toStrictEqual([CHILD_KEY, SIBLING_KEY, ROOT_KEY]);
  });

  it('refuses a delete of a category holding children', async () => {
    const { domain, root, child } = await plantTaxonomy();

    // `categories.parent_id` is `NO ACTION`, so the root cannot go
    // while the child points at it — the asymmetry that makes
    // removing a level an explicit decision rather than a cascade
    // that takes a subtree and its terms with it.
    const refusal = await refusalFrom(
      () => taxonomyStore.deleteCategory(root.id),
    );

    expect(refusal.reason).toBe('foreign-key-violation');
    expect(refusal.constraint).toBe(PARENT_FK);

    // THE SAME KEY, RAISED BY THE OTHER CALL. An insert naming a
    // parent no row carries is refused by this very constraint, so
    // the two refusals are indistinguishable from each other and
    // `src/taxonomy/categories-service.ts` tells a 409 from a 422 by
    // which call it made. Asserting the pair together is what turns
    // that from a claim about the schema into a measurement.
    const missing = await refusalFrom(() => taxonomyStore.insertCategory({
      domainId: domain.id,
      key: GRANDCHILD_KEY,
      name: GRANDCHILD_NAME,
      parentId: ABSENT_ID,
    }));

    expect(missing.reason).toBe(refusal.reason);
    expect(missing.constraint).toBe(refusal.constraint);

    // Both rows stood through it.
    expect(await taxonomyStore.findCategoryById(root.id))
      .toStrictEqual(root);
    expect(await taxonomyStore.findCategoryById(child.id))
      .toStrictEqual(child);

    // The control is the SAME call on the SAME row: refused while
    // the child pointed at it, accepted once the child had gone.
    // Nothing about the row changed in between.
    expect(await taxonomyStore.deleteCategory(child.id)).toBe(true);
    expect(await taxonomyStore.deleteCategory(root.id)).toBe(true);
    expect(await taxonomyStore.listCategoriesWithTermCounts(domain.id))
      .toStrictEqual([]);
  });

  it('refuses a second domain under a slug already taken', async () => {
    const first = await plantDomain();
    const refusal = await refusalFrom(() => domainStore.insertDomain({
      slug: RADAR,
      name: TRANSIT_NAME,
      settings: {},
    }));

    expect(refusal.reason).toBe('unique-violation');
    expect(refusal.constraint).toBe(DOMAIN_SLUG_KEY);

    // NOTHING THE CALLER SUBMITTED IS ON THE REFUSAL, and this is
    // the one place that zero has a live positive control. The pg
    // error a link down spells `Key (slug)=(...) already exists.`
    // with the submitted slug in it, and `errorHandler` logs an
    // unhandled error together with its `cause` — so the count of
    // zero below is read beside a known positive taken by the same
    // function over the same string, rather than against a fixture
    // that happens to agree. No in-memory store can supply that
    // control: its refusals are built from a reason and a name it
    // chose, so there is nothing there to have leaked.
    const carried = String(
      (refusal.cause as { detail?: unknown } | undefined)?.detail,
    );

    expect(countOccurrences(carried, RADAR)).toBe(1);
    expect(countOccurrences(JSON.stringify(refusal), RADAR)).toBe(0);
    expect(countOccurrences(refusal.message, RADAR)).toBe(0);

    // THE REFUSED INSERT BURNED AN ID. A `bigserial` is read while
    // the row is formed and the index refuses it afterwards, and a
    // sequence does not roll back — so the next domain is id 3 and
    // not id 2. The reset is what makes that deterministic here, and
    // it is the fidelity `tests/helpers/memory-research-store.ts`
    // had to be written to imitate rather than one it would have.
    const second = await domainStore.insertDomain({
      slug: TRANSIT,
      name: TRANSIT_NAME,
      settings: {},
    });

    expect(first.id).toBe(FIRST_ID);
    expect(second.id).toBe(first.id + 2);
    expect(await domainStore.countDomains()).toBe(2);

    // And the refusal wrote nothing: the stored row is the first
    // one, under the name the first write gave it.
    expect(present(
      await domainStore.findDomainBySlug(RADAR),
      'findDomainBySlug after the refused duplicate',
    )).toStrictEqual(first);
  });

  it('refuses a key the domain already carries', async () => {
    const { domain, root } = await plantTaxonomy();
    const refusal = await refusalFrom(() => taxonomyStore.insertCategory({
      domainId: domain.id,
      key: ROOT_KEY,
      name: GRANDCHILD_NAME,
      parentId: null,
    }));

    expect(refusal.reason).toBe('unique-violation');
    expect(refusal.constraint).toBe(CATEGORY_KEY_UNIQUE);

    // The control says the key is PER-DOMAIN rather than global:
    // the same key, under a second domain, lands. A unique index
    // over `key` alone would refuse this too, and every count in
    // every other case here would still add up.
    const other = await domainStore.insertDomain({
      slug: TRANSIT,
      name: TRANSIT_NAME,
      settings: {},
    });
    const otherRoot = await taxonomyStore.insertCategory({
      domainId: other.id,
      key: ROOT_KEY,
      name: ROOT_NAME,
      parentId: null,
    });

    expect(otherRoot.key).toBe(root.key);
    expect(otherRoot.domainId).toBe(other.id);
    expect(await taxonomyStore.listCategoriesWithTermCounts(domain.id))
      .toHaveLength(2);
  });

  it('refuses a pattern the bucket already carries', async () => {
    const { root, child } = await plantTaxonomy();
    const planted = await taxonomyStore.insertTerm({
      categoryId: child.id,
      ...REWRITTEN,
    });
    const refusal = await refusalFrom(() => taxonomyStore.insertTerm({
      categoryId: child.id,
      pattern: REWRITTEN.pattern,
      weight: 1,
      polarity: 'positive',
      notes: null,
    }));

    expect(refusal.reason).toBe('unique-violation');
    expect(refusal.constraint).toBe(TERM_PATTERN_KEY);

    // A single create asserts a NEW row and says so by refusing;
    // `upsertTerms` over the same key takes the conflict instead,
    // which is the other case in this file. Two intents, one index.
    expect(termNamed(
      await taxonomyStore.listTerms(child.id),
      REWRITTEN.pattern,
    )).toStrictEqual(planted);

    // The control: per-BUCKET rather than per-table. The same
    // pattern lands in the root, which holds none of its own.
    const elsewhere = await taxonomyStore.insertTerm({
      categoryId: root.id,
      pattern: REWRITTEN.pattern,
      weight: 1,
      polarity: 'positive',
      notes: null,
    });

    expect(elsewhere.pattern).toBe(planted.pattern);
    expect(elsewhere.categoryId).toBe(root.id);
    expect(await taxonomyStore.countTerms(child.id)).toBe(1);
    expect(await taxonomyStore.countTerms(root.id)).toBe(1);
  });

  it('refuses a role the domain already carries', async () => {
    const domain = await plantDomain();
    const other = await domainStore.insertDomain({
      slug: TRANSIT,
      name: TRANSIT_NAME,
      settings: {},
    });
    const planted = await personaStore.insertPersona({
      domainId: domain.id,
      role: RESEARCHER,
      systemText: SYSTEM_TEXT,
    });
    const refusal = await refusalFrom(() => personaStore.insertPersona({
      domainId: domain.id,
      role: RESEARCHER,
      systemText: REFUSED_TEXT,
    }));

    expect(refusal.reason).toBe('unique-violation');
    expect(refusal.constraint).toBe(PERSONA_ROLE_KEY);

    // Per-domain, exactly as the taxonomy key is: the same role
    // under a second domain lands, so what the index refuses is a
    // domain naming one role twice and not a role being reused.
    const elsewhere = await personaStore.insertPersona({
      domainId: other.id,
      role: RESEARCHER,
      systemText: REFUSED_TEXT,
    });

    expect(elsewhere.role).toBe(planted.role);
    expect(elsewhere.domainId).toBe(other.id);

    // THE ONE WAVE-1 PATCH THAT REACHES ITS OWN NATURAL KEY. A
    // rename onto a role the domain already carries raises the same
    // index on an UPDATE as it does on an INSERT, which is why
    // `PersonaPatch` carries `role` where `CategoryPatch` refuses to
    // carry `key` — the rename is legal, and it is the database
    // rather than the port that says which renames are not.
    const second = await personaStore.insertPersona({
      domainId: domain.id,
      role: SCORER,
      systemText: SYSTEM_TEXT,
    });
    const renamed = await refusalFrom(
      () => personaStore.updatePersona(second.id, { role: RESEARCHER }),
    );

    expect(renamed.reason).toBe(refusal.reason);
    expect(renamed.constraint).toBe(refusal.constraint);

    // Neither refused write left anything behind: the first row
    // still carries the text the accepted write gave it, the
    // renamed row still carries its own role, and the domain holds
    // the two personas it was given.
    expect(present(
      await personaStore.findPersonaById(planted.id),
      'findPersonaById after the refused duplicate role',
    ).systemText).toBe(SYSTEM_TEXT);
    expect(present(
      await personaStore.findPersonaById(second.id),
      'findPersonaById after the refused rename',
    ).role).toBe(SCORER);
    expect(await personaStore.countPersonas(domain.id)).toBe(2);
    expect(await personaStore.countPersonas(other.id)).toBe(1);
  });

  it('takes the taxonomy and the personas with the domain', async () => {
    const { domain, root, child } = await plantTaxonomy();

    await taxonomyStore.upsertTerms(child.id, LEXICON);

    const persona = await personaStore.insertPersona({
      domainId: domain.id,
      role: RESEARCHER,
      systemText: SYSTEM_TEXT,
    });

    // A second domain carrying a taxonomy and a persona of its own,
    // so the zeros below are a cascade scoped to one domain rather
    // than a statement that emptied the tables.
    const other = await domainStore.insertDomain({
      slug: TRANSIT,
      name: TRANSIT_NAME,
      settings: {},
    });
    const otherRoot = await taxonomyStore.insertCategory({
      domainId: other.id,
      key: ROOT_KEY,
      name: ROOT_NAME,
      parentId: null,
    });
    const otherPersona = await personaStore.insertPersona({
      domainId: other.id,
      role: RESEARCHER,
      systemText: SYSTEM_TEXT,
    });

    // The control that the zeros are REMOVALS. Without it a cascade
    // that took nothing is indistinguishable from one that took
    // everything, because both leave the same counts behind.
    expect(await taxonomyStore.listCategoriesWithTermCounts(domain.id))
      .toHaveLength(2);
    expect(await taxonomyStore.countTerms(child.id))
      .toBe(LEXICON.length);
    expect(await personaStore.countPersonas(domain.id)).toBe(1);

    // THE ROOT STILL HOLDS ITS CHILD, AND THE DELETE TAKES BOTH.
    // The case above proves `categories.parent_id` refuses a delete
    // of this very row, and the cascade is not refused: `NO ACTION`
    // is checked at the END of the statement, by which point the
    // domain's own `ON DELETE CASCADE` has removed parent and child
    // together. An implementation looping the port's guarded single
    // delete would be refused here, and one that does so looks
    // right on every taxonomy that is only one level deep.
    expect(await domainStore.deleteDomain(domain.id)).toBe(true);

    expect(await domainStore.findDomainBySlug(RADAR)).toBeNull();
    expect(await taxonomyStore.findCategoryById(root.id)).toBeNull();
    expect(await taxonomyStore.findCategoryById(child.id)).toBeNull();
    expect(await taxonomyStore.listCategoriesWithTermCounts(domain.id))
      .toStrictEqual([]);
    expect(await taxonomyStore.listTerms(child.id)).toStrictEqual([]);
    expect(await taxonomyStore.countTerms(child.id)).toBe(0);
    expect(await personaStore.findPersonaById(persona.id)).toBeNull();
    expect(await personaStore.countPersonas(domain.id)).toBe(0);

    // And the second domain kept everything it had. A cascade that
    // had stopped narrowing would answer every zero above while
    // taking the whole database with it.
    expect(await domainStore.countDomains()).toBe(1);
    expect(await taxonomyStore.listCategoriesWithTermCounts(other.id))
      .toStrictEqual([{ ...otherRoot, termCount: 0 }]);
    expect(await personaStore.findPersonaById(otherPersona.id))
      .toStrictEqual(otherPersona);
  });
});
