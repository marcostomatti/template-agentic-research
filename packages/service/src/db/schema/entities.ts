/**
 * @packageDocumentation
 * `entities` — the registry of subjects a domain tracks: one row per
 * thing its findings can be about.
 *
 * A finding is a reading of a document; an entity is the subject that
 * reading is attributed to, and the registry is what makes a second
 * finding about the same subject join the first rather than start
 * again. Everything a domain accumulates about a subject over time —
 * what research turned up, how a person judged it, how often it has
 * been seen — hangs off one row here instead of being re-derived from
 * a name at every place that reads it.
 *
 * The registry is per domain. Two domains tracking a subject of the
 * same name hold two rows, and neither sees the other's: the unique
 * key below is (domain, normalized name), not the name alone. The
 * design this port draws from kept one registry because it had one
 * subject matter; here the same table serves every domain at once,
 * and a shared row would carry one domain's reading of a subject into
 * a domain that never asked about it.
 *
 * A name is stored twice, as written and as matched. `name` is what a
 * person reads and `name_norm` is what the registry dedupes on, and
 * that split is what lets one subject arrive spelled three ways and
 * land on one row.
 *
 * Nothing writes these rows yet. Attribution is `ar-ingest`'s (phase
 * 5) and what accumulates against a subject is `ar-research`'s (phase
 * 6). `entity_research` below is what one run found out about a
 * subject, and `research_pool` after it is the gate deciding which
 * subjects are researched at all — the queue that run drains rather
 * than a decision it makes for itself.
 */
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

import { sql } from 'drizzle-orm';
import { bigint, bigserial, check, jsonb, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';

import { domains } from './domains.js';
import { findings } from './findings.js';
import { RESEARCH_POOL_STATUSES, checkOneOf } from './values.js';

/**
 * `entities` — one subject a domain tracks.
 *
 * The row is deliberately thin. What a subject IS varies between
 * domains more than anything else in this schema, so the columns hold
 * only what is needed to find the row again and attribute to it;
 * everything else is `attributes`, which the domain fills.
 */
export const entities = pgTable('entities', {
  /** Surrogate key; see `domains.id` for why `number` mode. */
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  /**
   * The domain whose registry this subject belongs to. Cascading on
   * delete like every other domain-owned row: which subjects are
   * worth tracking is a decision made under one domain's criteria,
   * and a registry outliving the domain that built it is a list
   * nothing can say the purpose of.
   */
  domainId: bigint('domain_id', { mode: 'number' }).notNull()
    .references(() => domains.id, { onDelete: 'cascade' }),

  /**
   * The subject's name as it arrived, for a person to read.
   *
   * The display half of the pair. Nothing matches on it, so it is
   * free to keep the capitalization, punctuation and spacing the
   * source used rather than whatever survived normalization — and
   * renaming it moves no key and breaks no join.
   *
   * NOT NULL is not the same as non-empty, and the empty string means
   * something here: that the writer had no name to show. It costs
   * legibility rather than correctness, the same asymmetry
   * `ingested_files.path_hash` and `path` carry in `./documents.ts`;
   * the cost of a blank is paid at `name_norm` below, which is the
   * half the registry actually rests on.
   */
  name: text('name').notNull(),

  /**
   * The same name reduced to the form the registry matches on: the
   * row's key half, what an upsert resolves an entity through, and
   * what makes one subject spelled three ways land on one row.
   *
   * What "normalized" means is the writer's definition and not this
   * schema's. Nothing here computes the value, so every writer that
   * stores or looks up an entity has to reduce a name the same way —
   * and a writer that does not agree never fails, it silently misses:
   * the lookup finds nothing, the write inserts a rival row beside
   * the one it meant to find, and the registry goes on looking
   * correct from the inside. The design this port draws from met
   * exactly that with three places deriving the key separately, and
   * answered it with one stored function all of them called; whatever
   * answers it here has to be a single definition for the same
   * reason.
   *
   * The empty string is the one value that must never be stored. A
   * blank key collapses every subject a writer could not name onto a
   * single row per domain — one entity accumulating the research,
   * findings and judgements of all of them. A writer with no name to
   * hand synthesizes something that distinguishes the subject
   * instead, and `alias_of` below is how that placeholder is settled
   * when the real subject is finally named.
   */
  nameNorm: text('name_norm').notNull(),

  /**
   * The entity this row turned out to be, when it turned out to be
   * another one. NULL says the row IS its own subject, which is the
   * ordinary state — an alias is the exception, not a pointer every
   * other row is missing.
   *
   * A merge is a pointer rather than a rewrite. A placeholder that
   * stood in for a subject nobody had named yet keeps its own row and
   * its own history, and readers resolve through this column
   * (`COALESCE(alias_of, id)`) instead. Re-pointing the rows that
   * cite the placeholder would destroy the one thing it was worth
   * keeping for: when the subject was first seen, and under what it
   * was first called.
   *
   * No `onDelete`, so it emits `ON DELETE no action` and deleting an
   * entity that aliases still point at is refused. `ON DELETE SET
   * NULL` is expressible here — the column is nullable — and is the
   * one option worth arguing against explicitly, because the design
   * this port draws from took it: the NULL it writes already means
   * "this row is its own subject", so a deleted target quietly
   * promotes every placeholder back into a subject of its own. That
   * is the duplicate the alias existed to collapse, restored in a
   * state indistinguishable from a row that was never an alias. A
   * cascade inverts the fault instead, discarding a placeholder's
   * history because the subject it points at was tidied away.
   * Refusing leaves the choice with whoever is deleting, and it does
   * not obstruct dropping the whole domain, for the reason
   * `categories.parent_id` in `./taxonomy.ts` records at the same
   * shape of self-reference.
   *
   * Two things this column does not enforce, worth naming rather than
   * assuming: a row may point at itself, and two rows may point at
   * each other. Neither loops a reader, because resolution is one hop
   * — a self-alias resolves to the row itself, and a chain resolves
   * to whatever its first hop names rather than being followed to the
   * end. Neither is refused either, so a writer that builds one gets
   * no error and the second hop is simply never read.
   */
  aliasOf: bigint('alias_of', { mode: 'number' }).references((): AnyPgColumn => entities.id),

  /**
   * Whatever this domain records about a subject beyond its name.
   *
   * Defaults to `{}` and is NOT NULL, the settled choice for a JSONB
   * payload whose two absences come to the same thing: nothing
   * recorded yet and recorded as nothing read identically to
   * everything that opens this column, so a NULL would buy a
   * distinction no reader acts on and cost every reader a guard. Set
   * against `documents.raw` in `./documents.ts`, which is nullable
   * because there the two genuinely differ.
   *
   * No `$type` annotation, for the reason `sources.parser_config`
   * carries none: what belongs here varies by domain, and one
   * interface across every domain would describe none of them. No
   * CHECK reaches inside a JSONB payload either, so the shape is the
   * writing domain's to keep — this schema stores the payload and
   * says nothing about it.
   */
  attributes: jsonb('attributes').default({})
    .notNull(),
}, (table) => [
  /**
   * A normalized name identifies one subject within its domain, and
   * that pair is the row's natural key: an upsert resolves an entity
   * through it, which is what makes a second sighting of a subject
   * find the row the first one left. Two domains are free to track
   * unrelated subjects under the same name.
   */
  unique('entities_domain_id_name_norm_unique').on(table.domainId, table.nameNorm),
]);

/**
 * `entity_research` — what one run found out about a subject: the
 * prose a person reads and the structured payload behind it, one row
 * per research pass rather than one per subject.
 *
 * Research reaches outside the corpus and spends model calls to get
 * there, and nothing else stored here can reproduce what it comes
 * back with. So the result is written where every later reader finds
 * it — a digest, an export, and the next run's decision about whether
 * to research the subject again — and a subject researched recently
 * is not researched a second time. How recently counts as recent is
 * the reader's question rather than this table's: no column holds a
 * freshness window, and a reader that wants one compares
 * `researched_at` below against an interval of its own.
 *
 * Rows ACCUMULATE, which is this port's divergence from the design it
 * draws from. There the table held one row per subject, keyed on the
 * normalized name and upserted on every pass, so each result
 * overwrote the last and what a subject looked like before the newest
 * pass had no answer. Here the key is a surrogate and the entity FK
 * repeats: every pass keeps its own row, the current picture is the
 * newest of them, and what changed between two passes is readable.
 * `finding_labels` in `./findings.ts` makes the same trade against
 * the same design for the same reason, and states what it costs every
 * reader. Here the cost is that the current result is `ORDER BY
 * researched_at DESC LIMIT 1` rather than a select, and a reader that
 * forgets gets every pass at once rather than an error.
 *
 * Nothing writes these rows yet; `ar-research` is phase 6.
 */
export const entityResearch = pgTable('entity_research', {
  /** Surrogate key; see `domains.id` for why `number` mode. */
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  /**
   * The subject this research is about.
   *
   * NOT NULL because the row has no content without it — a result is
   * a result ABOUT something — and because nothing reads these rows
   * except through the subject they hang off.
   *
   * Cascading on delete, where `run_id` beside it takes the opposite
   * answer, because the entity does own these rows: they are what a
   * domain accumulated about that subject, which is the ownership
   * test `findings.document_id` in `./findings.ts` applies. Research
   * outliving its subject would be a summary of a row nobody can
   * reach, and the way to retire a subject whose research is still
   * wanted is `alias_of` above rather than a DELETE.
   */
  entityId: bigint('entity_id', { mode: 'number' }).notNull()
    .references(() => entities.id, { onDelete: 'cascade' }),

  /**
   * The run that produced this result, when a run produced it.
   *
   * NULL is an ordinary state rather than a gap. Research can also be
   * written by hand, carried in from whatever a domain kept before it
   * had a pipeline, or backfilled — none of that happened inside a
   * run, and naming one anyway would make the ledger claim work it
   * never did.
   *
   * The reference is not here yet: `runs` arrives later in this
   * stage, and `.references()` cannot name a module that does not
   * exist. What it will take is already settled, so the later edit is
   * one line rather than a decision made in passing. No `onDelete`,
   * emitting `ON DELETE no action`, on the rule the rest of this
   * schema follows: cascade only where the referenced row owns the
   * referencing one, and a run does not own what it found — the
   * entity one column above does. `ON DELETE SET NULL` is the option
   * worth refusing explicitly, because the NULL it writes already
   * means no run produced this row, so a run deleted out from under
   * its own results would silently reclassify them as hand-written.
   *
   * Refusing has a reach to check when the reference is wired rather
   * than to assume now: a run scoped to a domain goes when that
   * domain does, and whether the results citing it are already gone
   * by the end of that statement is what decides whether dropping a
   * domain is refused. `ingested_files.document_id` in
   * `./documents.ts` records the same two-hop trap met from the other
   * side.
   */
  runId: bigint('run_id', { mode: 'number' }),

  /**
   * What the research found, in prose, for a person to read.
   *
   * Nullable, and the NULL means no prose was produced — a pass that
   * came back with structured fields and no narrative, or a writer
   * that stores the payload now and renders a summary later. It is
   * not the same as `''`, which claims a summary was written and that
   * it was empty: a surface showing "not summarized" and one showing
   * a blank paragraph are different answers, and only the first is
   * honest about a pass that produced none. That is the text
   * analogue of the rule `findings.score` in `./findings.ts` states
   * for numbers.
   *
   * Unbounded on purpose. What a summary is worth varies by domain,
   * and a length cap here would truncate at a number no domain agreed
   * to; the writer that calls the model is where a limit belongs,
   * because it is the only place that knows what was asked for.
   */
  summary: text('summary'),

  /**
   * The structured half of the same result: whatever a domain's
   * research is meant to come back with beyond prose.
   *
   * The design this port draws from spent a column each on the fields
   * its own subject matter wanted, which is the part that cannot port
   * — a second domain researching something else would need its own
   * columns and a migration to add them. Neutral core columns plus a
   * domain-shaped payload is the same split `findings.fields` in
   * `./findings.ts` makes, for the same reason.
   *
   * One difference from that column is worth knowing before reading
   * this one: a finding's payload has `DomainSettings.fieldContract`
   * in `./domains.ts` to be validated against, and this payload has
   * nothing — no contract declares its keys and no CHECK reaches
   * inside a JSONB value, so a reader has only the writing domain's
   * own convention to go on.
   *
   * Defaults to `{}` and is NOT NULL, following `entities.attributes`
   * above: a row is written only when research actually ran, so
   * nothing structured found and nothing stored are the same state
   * here, and a NULL would buy a distinction no reader acts on. No
   * `$type` either, for the reason recorded there — what belongs
   * inside varies by domain, and one interface across all of them
   * would describe none of them.
   */
  payload: jsonb('payload').default({})
    .notNull(),

  /**
   * When this research was recorded.
   *
   * Defaults to now and is NOT NULL because there is no window in
   * which one of these rows exists and the research behind it has not
   * happened. The honest limit is which moment it names: the default
   * dates the WRITE, so a pass that searched at one time and
   * persisted five minutes later is dated by the second, and only a
   * writer holding the search time can record that instead by passing
   * it.
   *
   * This is the column the table is ordered and filtered by, and it
   * carries that weight without a unique key above it — so the two
   * things it cannot do alone are worth naming. `now()` is the
   * TRANSACTION's start time, so two rows written in one transaction
   * tie to the microsecond and the tiebreak is `id`, exactly as
   * `finding_labels.labelled_at` in `./findings.ts` records. And
   * nothing here stops two passes over one subject landing seconds
   * apart; accumulating is the point, but a reader wanting the
   * current picture has to say so rather than assume the table holds
   * one row per subject.
   */
  researchedAt: timestamp('researched_at', { withTimezone: true }).defaultNow()
    .notNull(),
});

/**
 * `research_pool` — the approval gate: one row per intention to
 * research something, held until a person rules on it.
 *
 * Noticing that a subject is worth looking into and actually looking
 * are deliberately separate events, written by different things at
 * different times. Whatever reads a document records the intention
 * here and stops; a later paced pass drains the approved rows a few
 * at a time. Nothing researches what it noticed in the same breath,
 * which is what keeps one busy ingest from becoming an afternoon of
 * searches nobody asked for — and searches are the part of this
 * pipeline that reaches outside the corpus and costs money.
 *
 * The terms to be issued are stored on the row rather than assembled
 * when it is drained, and that is what makes the gate an approval OF
 * something: an operator reads the exact strings before they are
 * sent, not a description of what will be composed later.
 *
 * What the queue costs is capped at the drain rather than here. The
 * pass that empties it takes a bounded batch, and that bound is a
 * spending ceiling rather than paging — a hundred approved rows are
 * researched over many passes, and a queue nobody is watching cannot
 * turn into a single expensive run.
 *
 * The row names its subject through `entity_id` and its occasion
 * through `finding_id`, where the design this port draws from keyed
 * the queue on the columns its own subject matter happened to have.
 * Both are nullable, which has a consequence worth stating up front:
 * there is no unique key here, so nothing stops two intentions
 * standing for the same thing. Nor could a key be added that did —
 * over nullable members it would not fire for exactly the rows most
 * likely to repeat, which is the property `documents.hash` in
 * `./documents.ts` sets out. Deduplicating an intention is the
 * writer's, and the other half of it is `entity_research` above: a
 * subject researched recently enough is one a writer should not
 * queue again, and how recently counts as recent is that reader's
 * question rather than this table's.
 *
 * Nothing writes these rows yet. `ar-ingest` and `ar-score` raise
 * them (phase 5) and `ar-research` drains them (phase 6). The
 * operator surface between the two is `scripts/approve.ts`, the
 * interim CLI later in this phase, which stands in until the API and
 * the UI take approvals over — a client of the gate rather than the
 * gate itself.
 */
export const researchPool = pgTable('research_pool', {
  /** Surrogate key; see `domains.id` for why `number` mode. */
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  /**
   * The domain whose gate this row is queued at. Cascading on delete
   * like every other domain-owned row: an intention is raised under
   * one domain's criteria and approved against its priorities, and
   * neither outlives the domain that held them.
   *
   * It is also what keeps the two refusals below off the ordinary
   * lifecycle of a domain. Dropping one removes the entities and the
   * findings these rows cite AND the rows themselves, all inside a
   * single statement, so the end-of-statement check the FKs below
   * rest on finds nothing left orphaned — the same reasoning
   * `categories.parent_id` in `./taxonomy.ts` records, reaching
   * across two tables rather than within one.
   */
  domainId: bigint('domain_id', { mode: 'number' }).notNull()
    .references(() => domains.id, { onDelete: 'cascade' }),

  /**
   * The subject this intention is about, when it names one.
   *
   * NULL is an ordinary state. An intention can be raised from a
   * finding whose subject nothing has attributed yet, and the terms
   * on the row are what makes it researchable anyway. Absent rather
   * than an entity standing for "unknown", which would be one
   * registry row accumulating the research of every unnamed subject
   * there is — the argument `findings.entity_id` in `./findings.ts`
   * sets out at length.
   *
   * Takes that column's answer on delete too, and for its reasons.
   * No `onDelete`, so `ON DELETE no action` REFUSES deleting an
   * entity an intention still names, and `ON DELETE SET NULL` is
   * ruled out because the NULL it would write already means "names
   * no subject": an intention raised about a registered subject
   * would silently become one that never had one. The way to retire
   * a subject with intentions outstanding is `alias_of` above.
   */
  entityId: bigint('entity_id', { mode: 'number' })
    .references(() => entities.id),

  /**
   * The finding that raised this intention, when one did.
   *
   * NULL where nothing did: a subject queued by hand, or by a sweep
   * over the registry rather than over a document. So this column is
   * provenance where `entity_id` above is subject matter, and the
   * two take their delete behaviour from different questions even
   * though they end at the same answer.
   *
   * No `onDelete`, so deleting a finding an intention cites is
   * refused. `finding_labels.finding_id` in `./findings.ts` cascades
   * from the same table, and what separates them is what each row is
   * worth once the finding is gone: a label is the word `avoid` with
   * nothing left to attach it to, while one of these rows carries
   * its own terms, its own subject and its own approval, and goes on
   * being a complete account of a search somebody consented to. That
   * is the ownership test the module applies throughout — a finding
   * does not own an intention it merely occasioned.
   *
   * The knock-on is narrower than the same clause would be on a
   * table with no domain FK, and worth knowing exactly: a domain
   * still drops cleanly, for the reason `domain_id` above records,
   * but deleting a single document is refused while an intention
   * cites one of the findings read out of it, and so is any re-score
   * that deletes findings rather than rewriting them. The refusal
   * names this table's constraint to an operator who named a
   * document, which is the shape `ingested_files.document_id` in
   * `./documents.ts` meets from the other side. Clearing the path is
   * one statement over the pool rows ahead of the delete, and that
   * it has to be written is the point: closing an approved intention
   * is a decision, not a side effect of tidying a document away.
   */
  findingId: bigint('finding_id', { mode: 'number' })
    .references(() => findings.id),

  /**
   * Where the row stands in the gate: `pending` until it is ruled
   * on, then `approved` and `done` along the accepted path, or
   * `skipped` where it is refused or closed without a search. The
   * members are `RESEARCH_POOL_STATUSES` in `./values.ts`,
   * enumerated in the generated SQL by the CHECK below from that
   * same tuple.
   *
   * Defaults to `pending`, which is the only honest state for a row
   * nobody has looked at, and the default is also what makes it the
   * state an intention necessarily starts in: leaving the column out
   * cannot pre-approve one. What a default cannot do is tell a row
   * deliberately left pending from one whose writer never considered
   * the column — both are stored as `pending`, and only the writer
   * that saw the event could have recorded anything else. Read it as
   * the absence of a ruling rather than as a fact about the row.
   *
   * NOT NULL, and that is what makes the CHECK cover the column at
   * all: a CHECK evaluating to UNKNOWN passes, so without it the
   * column's real domain would be the four members plus NULL. What a
   * NULL row would cost is more than a member nobody expects — it is
   * invisible to every equality filter over the set at once, since
   * `status = 'pending'` and `status = 'approved'` are both UNKNOWN
   * against it. The row would sit outside the queue an operator
   * reviews AND outside the set the drain reads: queued forever,
   * reported nowhere.
   *
   * The column is the account of the row rather than the gate
   * itself. Nothing here refuses a transition, and a writer may set
   * any member at any time — including `done` on a row nobody
   * approved. What the database refuses is the other account of the
   * same row: `research_pool_approval_check` at the foot of this
   * table reads only `approved_at` and `researched_at`, so the two
   * can disagree and only the timestamps are held to the rule.
   */
  status: text('status').default('pending')
    .notNull(),

  /**
   * The exact terms this row's search will be issued with, stored
   * when the intention is raised rather than composed when it is
   * acted on.
   *
   * That ordering is the gate's substance and not a convenience.
   * Approval is given to these strings, so an operator reads what
   * will be sent instead of trusting an account of what will be
   * assembled later. `topics.search_terms` in `./scheduling.ts`
   * holds the same list for a standing configuration and carries the
   * shared reasoning; what differs here is that a topic's terms are
   * issued every cadence while these are issued once, and that these
   * were consented to — a writer editing them after `approved_at` is
   * set changes what was approved without the approval moving, and
   * nothing in the schema notices.
   *
   * `[]` default, NOT NULL, and annotated `string[]` following that
   * column: a list of strings is one shape across every domain,
   * unlike `entities.attributes` above, whose contents vary by the
   * domain that wrote them.
   *
   * An empty list is storable and means something: an intention
   * nobody could turn into a query. It approves like any other and
   * the drain finds nothing to issue, so a writer meeting one closes
   * the row rather than searching for nothing — and closes it with
   * its reason kept, because an intention that vanished and one that
   * was satisfied must not look alike.
   */
  searchTerms: jsonb('search_terms').$type<string[]>()
    .default([])
    .notNull(),

  /**
   * When the intention was raised — not when the document behind it
   * was captured, and not when it was ruled on.
   *
   * Defaults to now and is NOT NULL because the raising IS the
   * insert: there is no window in which one of these rows exists and
   * nothing has been noticed.
   *
   * It is also what a review queue is ordered by, newest first, so
   * an operator reading top-down meets what just arrived rather than
   * what has been ignored longest. It carries that ordering with no
   * unique key above it, which is when the tie and the tiebreak
   * `entity_research.researched_at` above records apply here
   * unchanged.
   */
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
    .notNull(),

  /**
   * When a person ruled in favour of this intention. NULL means
   * nobody has, which is the state every row starts in and the one
   * the drain passes over.
   *
   * Nullable with no default, for the reason no timestamp in this
   * schema is given a placeholder: any default would date an event
   * that never happened, and here that event is the one thing the
   * table exists to require.
   *
   * Set once and never moved is the writer's discipline rather than
   * the schema's. An approval is written over whatever is already
   * there with a COALESCE, so re-approving an approved row is a
   * no-op instead of a way to re-run a search already paid for.
   * Nothing here refuses an UPDATE that moves it to another time,
   * and nothing records that it was moved.
   *
   * The one write that is refused is clearing it back to NULL on a
   * row `researched_at` below already closed, under
   * `research_pool_approval_check` at the foot of this table: an
   * approval cannot be withdrawn from a search that has already
   * been made on it.
   */
  approvedAt: timestamp('approved_at', { withTimezone: true }),

  /**
   * When the intention was closed, whether by a search or without
   * one. NULL means it is still open, and it is the second half of
   * what the drain selects on: approved, and not yet closed.
   *
   * Closed rather than researched, despite the name carried over
   * from the design this port draws from. A row the drain refuses to
   * search — nothing issuable in `search_terms`, or a subject
   * `entity_research` above shows was researched recently enough —
   * is stamped here too, with its status set to `skipped` and its
   * reason kept. The alternative is what that design met and fixed:
   * a row that could not be researched stayed approved and open, so
   * every later pass fetched it first, searched the same subject and
   * spent the same money, indefinitely.
   *
   * Nullable with no default, like `approved_at` above — and the
   * pair is what `research_pool_approval_check` at the foot of this
   * table constrains: a non-NULL here requires a non-NULL there, so
   * a row cannot record that it was closed without recording that
   * it was approved first.
   *
   * Nothing ties the column to `entity_research` either: a row
   * stamped `done` with no research stored against its subject is
   * storable, and it reads as satisfied to everything that looks.
   * Only the writer holds the two together, in the statement that
   * persists a result and closes the row it came from.
   */
  researchedAt: timestamp('researched_at', { withTimezone: true }),
}, (table) => [
  /**
   * The gate's status domain, enumerated in the generated SQL from
   * the same tuple `ResearchPoolStatus` is derived from. Named
   * rather than left to drizzle's derivation so the static-SQL
   * invariant suite can assert the constraint is present by grepping
   * for it, and so a column rename cannot quietly move the name it
   * greps for.
   */
  checkOneOf('research_pool_status_check', table.status, RESEARCH_POOL_STATUSES),

  /**
   * The gate itself, as a rule the database holds: a row may record
   * that it was closed only if it already records that it was
   * approved. What is refused is the STATE rather than a
   * transition, so it bites from both directions — stamping
   * `researched_at` on a row nobody approved is rejected, and so is
   * clearing `approved_at` on a row already closed.
   *
   * A rule the database holds rather than a branch a workflow takes,
   * because there is no single writer to put a branch in. Intentions
   * are raised by one workflow and drained by another, approved
   * through `scripts/approve.ts` later in this phase and through the
   * API and the UI after that, and corrected by an operator at a
   * psql prompt when something has gone wrong. A branch is a
   * statement inside one of those, so it governs the writes that one
   * issues and leaves every other writer to its own habits — and the
   * writes it does not cover are exactly the ones nothing was
   * watching. A CHECK is evaluated by the server on every write,
   * whoever makes it. The depth cap `categories` in `./taxonomy.ts`
   * records needed a trigger for that same reason and one more; here
   * the rule reads only the row being written, both of its columns,
   * so a plain CHECK carries it — generated from this file and
   * visible in it.
   *
   * The other half is that a branch can be edited where nothing
   * reviews it. The workflow instance is a deploy target rather than
   * a source, so a guard changed on the canvas is lost at the next
   * import and reaches no diff on the way — `personas` in
   * `./domains.ts` records that round trip for prompts, and
   * `workflows/src/README.md` carries it in full. This constraint is
   * not beyond changing either, but changing it in the repository is
   * DDL: a migration under `drizzle/`, tracked, and read like any
   * other diff. A `DROP CONSTRAINT` issued by hand at a psql prompt
   * is as unreviewed as the branch edit and nothing here would
   * report it — what the database buys is not that the rule cannot
   * be removed, only that the ordinary way of removing it passes
   * through a diff on the way.
   *
   * Named rather than left to drizzle's derivation, for the reason
   * the status CHECK above gives: the static-SQL invariant suite
   * asserts the constraint reached the migration by grepping for
   * this name, and a column rename must not quietly move it.
   *
   * What it does not reach is worth reading beside it. Both
   * timestamps NULL is the open state and passes. An approval
   * nothing ever acts on passes, indefinitely. `status` a few
   * columns up is not consulted at all, so a row stamped `done`
   * with neither timestamp set is storable — the two are separate
   * accounts of the same row, and only this pair is enforced.
   */
  check(
    'research_pool_approval_check',
    sql`${table.researchedAt} IS NULL OR ${table.approvedAt} IS NOT NULL`,
  ),
]);
