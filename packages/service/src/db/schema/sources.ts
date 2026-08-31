/**
 * @packageDocumentation
 * `sources` — where a domain's raw material comes from, one row per
 * feed the pipeline is allowed to read.
 *
 * A source is configuration and not code. Which transport family
 * fronts it, what address to reach, how records are pulled out of the
 * payload that comes back, what that payload has to contain, and where
 * the last fetch stopped are all columns, so adding a feed is an
 * INSERT. Only a new KIND of feed needs a module: the adapter serving
 * a row is selected by its `kind`, and one adapter serves every row of
 * its kind with nothing differing but the row it was constructed from.
 *
 * `ar-ingest` fetches these rows, from phase 5, selecting the enabled
 * and unflagged ones for the domain its pass ran for, and `ar-capture`
 * resolves one out of the envelope a client posted; the adapters and
 * the parse engine they run under landed with them. What the table
 * fixed ahead of all of it is that everything varying per feed is
 * stored, which is what keeps a per-source branch out of the adapter
 * that would otherwise carry it.
 *
 * `source_config_proposals` is the pending half of two of those
 * columns. A source with no `parser_config`, or one whose contract has
 * started failing, gets a proposed arrangement written there for a
 * person to rule on, and only the approval copies it onto the source
 * row — so a model may propose what the pipeline extracts and never
 * decide it.
 *
 * `connectors` is here for the other half of the same question. A
 * source is a feed the pipeline reads; a connector is a service it
 * calls — a model, a search endpoint, a notebook, somewhere an export
 * is delivered. Both tables are the pipeline's edges, both hold one
 * row per place it may reach, and both are configuration rather than
 * code, so pointing either somewhere new is an INSERT and moving one
 * is an UPDATE.
 */
import { sql } from 'drizzle-orm';
import { bigint, bigserial, boolean, check, integer, jsonb, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';

import { domains } from './domains.js';
import { CONNECTOR_KINDS, RESEARCH_POOL_STATUSES, SOURCE_KINDS, checkOneOf } from './values.js';

export const sources = pgTable('sources', {
  /** Surrogate key; see `domains.id` for why `number` mode. */
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  /**
   * The domain this source feeds. Cascading on delete like every other
   * domain-owned row: a source outliving its domain describes a feed
   * nothing reads, and goes on holding a cursor into a corpus that is
   * no longer there.
   */
  domainId: bigint('domain_id', { mode: 'number' }).notNull()
    .references(() => domains.id, { onDelete: 'cascade' }),

  /**
   * Which transport family fronts this source — see `SOURCE_KINDS` in
   * `./values.js` for what each member means.
   *
   * This is what selects the adapter for the row, so the set the
   * column accepts and the set an adapter can be selected by have to
   * be the same set. They are one declaration read twice rather than
   * two kept in step: the CHECK below is generated from that tuple,
   * and the `SourceKind` union in `src/sources/index.ts` is derived
   * from it.
   *
   * NOT NULL is what makes that CHECK cover the column. A CHECK is
   * UNKNOWN against NULL and so admits it, and a row whose kind is
   * absent is a row no adapter can be chosen for at all.
   */
  kind: text('kind').notNull(),

  /**
   * Where the payload is. What that means is `kind`'s to say: for the
   * three kinds the pipeline polls it is the address to request, and
   * for `push` it is where a payload nobody asked for lands. The
   * adapter constructed for the row is what knows which of the two it
   * was handed.
   *
   * NOT NULL, which is not the same as non-empty. Every source has a
   * location, so an empty endpoint is configuration somebody has not
   * finished rather than a source that needs none — nothing to fetch
   * from and nowhere to listen.
   */
  endpoint: text('endpoint').notNull(),

  /**
   * How records are pulled out of the payload — selectors, JSONPath,
   * regex, a field map — bound to the adapter when it is constructed
   * rather than handed to it per call.
   *
   * Data the engine executes, never code. The parse engine phase 5
   * landed, `src/lib/parser-config.ts`, performs the operations it
   * implements against the payload, directed by this column; it
   * evaluates nothing it finds here. That is what keeps an INSERT into
   * this table an INSERT — a column whose contents could execute would
   * turn every writer that reaches it, the seed script and a workflow
   * node and an operator at a psql prompt alike, into a way to run
   * arbitrary code in the pipeline.
   *
   * It is also what makes an extraction replayable: the same payload
   * under the same config yields the same records every time, so an
   * adapter is tested against a stored payload with no network, and a
   * config producing the wrong records is a row to read rather than a
   * program to debug. The design this one is ported from had no such
   * column — every source was a hand-written module in a static
   * registry, so a new feed meant code, review, and a deploy for
   * extraction differing from its neighbour's by a few selectors.
   *
   * Carries no `$type` annotation, unlike `domains.settings`. What a
   * parser config holds is the adapter's business and differs by
   * `kind`, so one interface across all four would describe none of
   * them accurately.
   *
   * Defaults to an empty object so every reader faces one shape; empty
   * means nothing is configured here and the adapter's own defaults
   * apply.
   *
   * No proposed config is written straight into this column. Where a
   * source has none, or its contract starts failing, a local model is
   * asked — on demand over plain HTTP, with nothing kept running
   * between calls — to propose a `parser_config` and a `contract`
   * together; the proposal lands as a pending row for an operator to
   * rule on, not as an update here. Only the approval writes these two
   * columns, and the engine then runs what was approved
   * deterministically: a model proposes, a person decides once, and no
   * guess silently changes what the pipeline extracts. Approval is a
   * database state rather than a branch inside a workflow, and the row
   * it is a state of is `source_config_proposals` below, whose
   * `source_config_proposals_approval_check` refuses the record of an
   * application on a row carrying no approval. The propose step is not
   * built here; the columns it targets are.
   */
  parserConfig: jsonb('parser_config').default({})
    .notNull(),

  /**
   * What a payload from this source has to contain: the validation
   * schema a document captured from it is checked against.
   *
   * A schema, and so data on the same terms as `parser_config` above:
   * the engine checks a captured document against what this column
   * declares and never runs a predicate stored in it. The two describe
   * one arrangement from both ends — how to read this source, and what
   * a correct reading looks like — which is why a proposal covers both
   * and an approval writes both. An extraction rule approved without
   * the test that says it still holds leaves nothing to notice the day
   * the source's shape drifts.
   *
   * Defaults to an empty object rather than to null. A source nobody
   * has written a contract for and one whose contract demands nothing
   * come to the same thing — nothing is checked — so a null would buy
   * a distinction no reader acts on and cost every reader a guard.
   *
   * Which is also the cost of leaving it empty on a source that is
   * actually fetched. `consecutive_failures` below is bumped by the
   * payloads this column rejects; where it declares nothing, nothing
   * is rejected and nothing is counted, so a source whose shape has
   * drifted reads exactly like one that is still working.
   */
  contract: jsonb('contract').default({})
    .notNull(),

  /**
   * Where the last fetch stopped, expressed however the adapter that
   * wrote it chose to express that, and opaque to everything else. One
   * source's cursor is a publication timestamp and the next one's is a
   * page token; only the adapter that wrote it has to understand it.
   *
   * NULL means this source has never been fetched, or that its adapter
   * keeps no cursor at all. An absence, never an empty string: an
   * empty string is a value, and an adapter would hand it back to its
   * source as a real position.
   *
   * The design this one is ported from kept cursors in a table of
   * their own, deliberately away from the per-source configuration,
   * because that configuration was a file a person edited. There, an
   * operator adjusting a query term rewinds or skips a fetch window in
   * the same edit, and a merge conflict on a cursor is a gap in the
   * corpus nobody notices. Neither hazard survives the move into this
   * row: both halves are columns in a database now, so a writer
   * touches the columns it names and no others, and there is no file
   * for two editors to conflict over.
   */
  cursor: text('cursor'),

  /**
   * How many fetches have failed in a row since the last one that
   * succeeded. The next success sets it back to 0, so it measures the
   * current streak and not the source's history.
   *
   * This is the counter the fail-flag-keep path bumps: a payload the
   * contract rejects is stored anyway, and this column is what turns
   * a run of those rejections into `flagged` once it crosses the
   * threshold the pipeline reads.
   *
   * A counter, and so NOT NULL with a default of 0 — the treatment a
   * count gets and the one a measurement never does. Zero here is a
   * reading rather than an absence: a source inserted a moment ago
   * and a source whose last fetch worked both genuinely have no
   * failures behind them, and there is no earlier state in which the
   * count is unknown. The nullable half of the null-vs-zero rule is
   * for the opposite case — a signal computed from data, like the
   * scores and feature versions that arrive with `documents` and
   * `findings` later in this phase — where NULL says never-computed
   * and a 0 would claim a measurement was taken and came back empty.
   * `terms.weight` is the third case: NOT NULL with no default,
   * because it is authored rather than counted or computed.
   *
   * The NOT NULL is also what makes the detector work at all.
   * Flagging is a threshold comparison, and a comparison against NULL
   * is UNKNOWN rather than false — a row whose counter had never been
   * set would neither trip the detector nor turn up among the rows it
   * passed over. That is the same way a NULL slips past a CHECK, and
   * the same reason `kind` above is NOT NULL.
   */
  consecutiveFailures: integer('consecutive_failures').default(0)
    .notNull(),

  /**
   * When this source last yielded a payload that was accepted. NULL
   * means it never has — a source configured but not yet fetched from
   * successfully, which is not the same as one that used to work.
   *
   * The other side of the rule the counter above states. A count has
   * a real zero and so is given one; a time has no equivalent, and
   * any placeholder stood in here would date a success that never
   * happened.
   */
  lastSuccessAt: timestamp('last_success_at', { withTimezone: true }),

  /**
   * When this source last failed. NULL means it never has.
   *
   * Kept beside `last_success_at` rather than folded into it: which of
   * the two is the more recent is what says whether the source is
   * broken right now, and one column holding "last outcome" could not
   * answer that without also losing when the other one happened.
   */
  lastFailureAt: timestamp('last_failure_at', { withTimezone: true }),

  /**
   * Whether the pipeline may read this source at all. Operator-owned:
   * nothing automatic clears it, so a source switched off stays off
   * until somebody switches it back on.
   *
   * Defaults to true because a source row exists in order to be read.
   * A row that has to be enabled after it is inserted is a feed
   * somebody configured and the pipeline then quietly ignored.
   */
  enabled: boolean('enabled').default(true)
    .notNull(),

  /**
   * Whether this source has tripped the adapter-rot detector — set by
   * the pipeline when `consecutive_failures` crosses its threshold,
   * not by an operator.
   *
   * Separate from `enabled` because the two answer different questions
   * and have different writers. `flagged` says the pipeline believes
   * something here has stopped working; `enabled` says whether it
   * reads the source regardless. Collapsing them would let the
   * detector switch off a feed an operator deliberately turned on, and
   * would leave no way to record a suspect source still worth reading.
   */
  flagged: boolean('flagged').default(false)
    .notNull(),
}, (table) => [
  /**
   * The kind domain, enumerated in the generated SQL from the same
   * tuple the adapter union is derived from. Named rather than left to
   * drizzle's derivation so the static-SQL invariant suite can assert
   * the constraint is present by grepping for it.
   */
  checkOneOf('sources_kind_check', table.kind, SOURCE_KINDS),
]);

/**
 * `source_config_proposals` — one proposed arrangement for reading a
 * source, held until a person rules on it.
 *
 * `sources.parser_config` and `sources.contract` above say how a feed
 * is read and what a correct reading of it looks like. Where a source
 * has neither, or where its contract has started failing, a local
 * model is asked to propose both together. That answer is not written
 * onto the source row. It lands here as a pending row, and only an
 * approval moves it across.
 *
 * A ROW rather than a BRANCH, and the argument is
 * `research_pool_approval_check` in `./entities.ts`, which records it
 * at length. The proposal is written by one thing, ruled on by
 * another and applied by a third — the propose step, then
 * `scripts/approve.ts` and the API and UI after it, then an operator
 * at a psql prompt when something has gone wrong. A branch lives
 * inside one of those, so it governs the writes that one issues and
 * leaves every other writer to its own habits, and the writes it does
 * not cover are exactly the ones nothing was watching. A CHECK is
 * evaluated by the server on every write, whoever makes it. The
 * branch that would replace it is also a branch on a workflow canvas,
 * where an edit is lost at the next import and reaches no diff on the
 * way.
 *
 * `research_pool` could not hold it, and not for want of a spare
 * column. That table names its subject through `entity_id` and its
 * occasion through `finding_id`, carries the search terms it would be
 * issued with, and is drained by a pass that issues them. A config
 * proposal names a SOURCE, carries two JSONB documents rather than a
 * list of strings, and is acted on by an UPDATE against the source
 * row and never by a search. Filing it there would put a row in front
 * of a drain that would try to search it, and would leave the two
 * documents it is actually about with nowhere to live.
 *
 * What the two gates share is their shape, deliberately: a status
 * that is the operator-facing account of the row, an approval
 * timestamp, and a CHECK over the timestamps the database holds
 * whatever the status says. The status members are literally the same
 * tuple, `RESEARCH_POOL_STATUSES` in `./values.ts`.
 *
 * No unique key, so nothing stops two pending proposals standing for
 * one source — a feed failing every pass would otherwise be refused a
 * fresh proposal, and an operator's second, better proposal would be
 * refused too. Which of several is the one to rule on is the review
 * queue's question, and `proposed_at` below is what it reads.
 *
 * Nothing INSERTS these rows yet, and phase 5 landed both halves that
 * would. `src/sources/config-proposer.ts` declares the propose seam
 * and builds the pending row from an answer, and the apply step beside
 * it refuses a proposal carrying no `approved_at` — what is missing is
 * a proposer to construct, no module in this package implementing the
 * interface. The operator surface between them landed too:
 * `scripts/approve.ts` lists the pending proposals beside the pending
 * `research_pool` rows and writes `status` and `approved_at` on one of
 * them at a time, the interim CLI standing in until the API and the UI
 * take approvals over.
 */
export const sourceConfigProposals = pgTable('source_config_proposals', {
  /** Surrogate key; see `domains.id` for why `number` mode. */
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  /**
   * The domain whose source this proposal is about. Cascading on
   * delete like every other domain-owned row: a proposal outliving
   * its domain is a ruling nobody can act on, about a feed that went
   * with the domain.
   *
   * Redundant against `source_id` below, which reaches the same
   * domain through `sources.domain_id`, and carried anyway because
   * the redundancy is what lets a domain be dropped at all. Deleting
   * one cascades to its sources AND to these rows inside a single
   * statement, so the end-of-statement check the refusing FK below
   * rests on finds nothing left orphaned. Without this column that
   * FK would refuse the cascade, and dropping a domain would fail
   * naming a constraint on a table the operator never mentioned —
   * the reasoning `research_pool.domain_id` in `./entities.ts`
   * records, met here through one hop rather than two.
   *
   * It is also what the review queue filters on, so listing a
   * domain's pending proposals is a predicate rather than a join.
   */
  domainId: bigint('domain_id', { mode: 'number' }).notNull()
    .references(() => domains.id, { onDelete: 'cascade' }),

  /**
   * The source this proposal is for.
   *
   * NOT NULL: a proposed `parser_config` and `contract` are an
   * arrangement for reading one particular feed, so a row naming no
   * source is a proposal there is nothing to apply it to.
   *
   * Deliberately no `onDelete`, so it emits `ON DELETE no action`
   * and deleting a source a proposal still names is REFUSED — the
   * answer `documents.source_id` in `./documents.ts` and
   * `finding_sightings.source_id` in `./findings.ts` both give, for
   * a reason of its own here. A pending row is an outstanding
   * question put to a person, and deleting the source under it
   * answers that question by making it disappear; an applied row is
   * the record of what was approved and written, and so the only
   * account of why the source's two columns hold what they hold.
   * Retiring a feed without losing either is the column that exists
   * for exactly that, `sources.enabled` set to false.
   */
  sourceId: bigint('source_id', { mode: 'number' }).notNull()
    .references(() => sources.id),

  /**
   * The `parser_config` being proposed: what would be written to
   * `sources.parser_config` above if this row is approved and
   * applied.
   *
   * Stored on the row rather than composed when it is ruled on, and
   * that ordering is the gate's substance rather than a convenience
   * — an operator approves this exact document instead of a
   * description of what a model would answer if it were asked again.
   * `research_pool.search_terms` in `./entities.ts` makes the same
   * argument over a different payload, and carries the same limit: a
   * writer editing this column after `approved_at` is set changes
   * what was approved without the approval moving, and nothing in
   * the schema notices.
   *
   * Data the engine executes and never code, on the terms the column
   * it targets sets out, and the point is sharper here because this
   * is a document a model wrote. `parserConfigErrors` in
   * `src/lib/parser-config.ts` is what says a proposal is
   * well-formed before it is offered for approval, but what makes a
   * bad one merely wrong rather than dangerous is that the engine
   * performs the operations it implements and evaluates nothing it
   * finds in a config.
   *
   * Carries no `$type` annotation, for the reason
   * `sources.parser_config` carries none: what a parser config holds
   * differs by `kind`, so one interface across all four would
   * describe none of them accurately.
   *
   * Defaults to an empty object so every reader faces one shape. An
   * empty proposal is storable and says something — a model asked
   * for a config and answering with nothing usable — and it is a
   * proposal an operator should reject rather than one the table
   * should refuse.
   */
  parserConfig: jsonb('parser_config').default({})
    .notNull(),

  /**
   * The `contract` being proposed, and the other half of the same
   * answer: what would be written to `sources.contract` above.
   *
   * Proposed together with `parser_config` and approved together,
   * because the two describe one arrangement from both ends. An
   * extraction rule approved without the test that says it still
   * holds leaves nothing to notice the day the source's shape
   * drifts, which is the failure the propose path exists to answer
   * in the first place — a contract that has started failing is what
   * asks for a new proposal.
   *
   * Two columns rather than one document holding both, so the apply
   * step is an UPDATE naming the two columns it writes and nothing
   * else, and so what is being proposed for each is readable without
   * unpacking a wrapper.
   *
   * Defaults to an empty object, like the column it targets, and
   * inherits that column's cost when it is left that way: where a
   * contract declares nothing, nothing is rejected and nothing is
   * counted, so a source whose shape has drifted reads exactly like
   * one that is still working.
   */
  contract: jsonb('contract').default({})
    .notNull(),

  /**
   * What proposed this — the `connectors.name` of the model endpoint
   * that was asked, or whatever else a writer names itself as.
   *
   * Text rather than a reference to `connectors` below, and the
   * difference is what the column is for. It records what produced
   * these two documents at the time they were produced, which is
   * provenance and so has to survive the connector being renamed,
   * repointed or deleted: a refusing FK would forbid all three, and
   * a cascading one would discard the account of where an applied
   * config came from. A connector is also identified by (`kind`,
   * `name`) rather than by a name alone, so a reference would have
   * to be by id, and the stored value would then name nothing a
   * reader recognizes.
   *
   * The cost is that nothing checks the name resolves, and a row can
   * name a connector that never existed. That is the ordinary price
   * of provenance, and it is bounded by this column being read by
   * nobody: nothing is dispatched, addressed or authenticated from
   * here.
   *
   * NOT NULL, which is not the same as non-empty. Every proposal was
   * made by something, so an empty string is a writer that did not
   * say rather than a proposal with no author.
   */
  proposedBy: text('proposed_by').notNull(),

  /**
   * Where the row stands in the gate: `pending` until it is ruled
   * on, then `approved` and `done` along the accepted path, or
   * `skipped` where it is refused or closed without being applied.
   * The members are `RESEARCH_POOL_STATUSES` in `./values.ts`,
   * enumerated in the generated SQL by the CHECK below from that one
   * declaration.
   *
   * The same tuple `research_pool.status` is constrained to, shared
   * rather than copied because the two are one gate over different
   * subjects: `scripts/approve.ts` rules on both, and a second tuple
   * spelling the same four members is the drift `./values.ts` exists
   * to prevent. What the sharing costs is a name — the tuple and its
   * union are called after the first table that used them — and that
   * module says so where they are declared.
   *
   * Defaults to `pending`, the only honest state for a row nobody
   * has looked at, and the default is also what makes it the state a
   * proposal necessarily starts in: leaving the column out cannot
   * pre-approve one.
   *
   * NOT NULL, which is what makes the CHECK cover the column at all,
   * a CHECK evaluating to UNKNOWN being one that passes. It also
   * keeps the row out of the hole `research_pool.status` describes,
   * where a NULL is invisible to every equality filter over the set
   * at once — outside the queue an operator reviews AND outside the
   * set an apply step reads.
   *
   * The column is the account of the row rather than the gate
   * itself. Nothing here refuses a transition, and a writer may set
   * any member at any time, `done` on a row nobody approved
   * included. What the database refuses is the other account of the
   * same row: `source_config_proposals_approval_check` at the foot
   * of this table reads only `approved_at` and `applied_at`, so the
   * two accounts can disagree and only the timestamps are held to
   * the rule.
   */
  status: text('status').default('pending')
    .notNull(),

  /**
   * When the proposal was made. Defaults to now and is NOT NULL
   * because the proposing IS the insert: there is no window in which
   * one of these rows exists and nothing has been proposed.
   *
   * It is also what a review queue is ordered by, oldest first:
   * `listPendingProposals` in `scripts/approve.ts` reads on it, the
   * way that file's older half reads `research_pool.created_at` —
   * which is what makes several proposals for one source workable
   * without a key refusing the later ones. `now()` is the
   * TRANSACTION's start time, so two rows written in one transaction
   * tie to the microsecond and the tiebreak is `id`.
   */
  proposedAt: timestamp('proposed_at', { withTimezone: true }).defaultNow()
    .notNull(),

  /**
   * When a person ruled in favour of this proposal. NULL means
   * nobody has, which is the state every row starts in and the one
   * an apply step passes over.
   *
   * Nullable with no default, for the reason no timestamp in this
   * schema is given a placeholder: any default would date an event
   * that never happened, and here that event is the one thing the
   * table exists to require.
   *
   * The write that is refused is clearing it back to NULL on a row
   * `applied_at` below has already stamped, under
   * `source_config_proposals_approval_check` at the foot of this
   * table: an approval cannot be withdrawn from a config already
   * written onto its source.
   */
  approvedAt: timestamp('approved_at', { withTimezone: true }),

  /**
   * When the approved `parser_config` and `contract` were written
   * onto the source row. NULL means they have not been, and it is
   * the second half of what an apply step selects on: approved, and
   * not yet applied.
   *
   * Kept here rather than read back off the source, which cannot
   * answer it. `sources.parser_config` holds whatever it holds now;
   * an operator may have edited it since, a later proposal may have
   * overwritten it, and two proposals may have been identical. Only
   * this column says that THIS row is the one that was written, and
   * when.
   *
   * Nullable with no default, like `approved_at` above — and the
   * pair is what `source_config_proposals_approval_check` at the
   * foot of this table constrains: a non-NULL here requires a
   * non-NULL there, so a row cannot record that it was applied
   * without recording that it was approved first.
   */
  appliedAt: timestamp('applied_at', { withTimezone: true }),
}, (table) => [
  /**
   * The gate's status domain, enumerated in the generated SQL from
   * `RESEARCH_POOL_STATUSES` — the same tuple
   * `research_pool_status_check` in `./entities.ts` is generated
   * from, rendered a second time under this table's own name. Named
   * rather than left to drizzle's derivation so the static-SQL
   * invariant suite can assert the constraint is present by grepping
   * for it, and so a column rename cannot quietly move the name it
   * greps for.
   */
  checkOneOf('source_config_proposals_status_check', table.status, RESEARCH_POOL_STATUSES),

  /**
   * The gate itself, as a rule the database holds: a row may record
   * that its config was applied only if it already records that it
   * was approved. What is refused is the STATE rather than a
   * transition, so it bites from both directions — stamping
   * `applied_at` on a row nobody approved is rejected, and so is
   * clearing `approved_at` on a row already applied.
   *
   * The argument for a CHECK rather than a branch is
   * `research_pool_approval_check` in `./entities.ts`, in full, and
   * it applies here unchanged: there is no single writer to put a
   * branch in, and the branch that would replace it lives on a
   * workflow canvas, where an edit is lost at the next import and
   * reaches no diff on the way. This rule reads only the row being
   * written, both of its columns, so a plain CHECK carries it —
   * generated from this file and visible in it.
   *
   * Named rather than left to drizzle's derivation, for the reason
   * the status CHECK above gives.
   *
   * What it does not reach is worth reading beside it. Both
   * timestamps NULL is the pending state and passes. An approval
   * nothing ever applies passes, indefinitely. `status` above is not
   * consulted, so a row stamped `done` with neither timestamp set is
   * storable. And it says nothing whatever about `sources`: both
   * columns it reads are on THIS row, so what it enforces is that
   * the record of an application carries the record of an approval,
   * and not that the UPDATE onto the source passed through here at
   * all. A writer that skips this table and rewrites
   * `sources.parser_config` directly is refused by nothing.
   */
  check(
    'source_config_proposals_approval_check',
    sql`${table.appliedAt} IS NULL OR ${table.approvedAt} IS NOT NULL`,
  ),
]);

/**
 * `connectors` — one external service the pipeline is configured to
 * call, and what a client needs to reach it.
 *
 * Not domain-scoped, unlike the rest of this phase's configuration
 * half. Which model endpoint answers, or which notebook an export is
 * handed to, is a fact about the deployment rather than about any
 * one domain's subject matter, and the choice of connector is made
 * where it actually varies: an `export_subscriptions` row pairs a
 * domain and a format with the connector that receives the result.
 * A copy of the row per domain would record one instance's address
 * in as many places as there are domains, and a service that moved
 * would be corrected in some of them.
 *
 * The design this one is ported from had no such table. Each
 * service's address was an environment variable read at BUILD time
 * and baked into the workflow JSON that was then deployed, so moving
 * a service — or pointing one workflow at a second instance of it —
 * meant a rebuild and a redeploy of every workflow that named it,
 * and the address the running system was actually using could only
 * be read out of the built artifact. As a row it is read at run time
 * by the run that needs it: pointing the pipeline somewhere else is
 * an UPDATE, and asking where it currently points is a SELECT.
 */
export const connectors = pgTable('connectors', {
  /** Surrogate key; see `domains.id` for why `number` mode. */
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  /**
   * Which family of service this row fronts — see `CONNECTOR_KINDS`
   * in `./values.js` for what each member means.
   *
   * Selects the client that talks to the row, the way `sources.kind`
   * above selects the adapter that reads a feed, and it is one
   * declaration read twice for the same reason: the CHECK below is
   * generated from the tuple the `ConnectorKind` union is derived
   * from, so a kind no client exists for cannot be stored and a kind
   * the column refuses cannot be reached from stored data.
   *
   * NOT NULL on both counts a nullable column would cost here. A
   * CHECK is UNKNOWN against NULL and so admits it, and this column
   * is half the natural key below — two rows carrying a NULL kind and
   * the same name are not duplicates as far as a unique index is
   * concerned, so the key that is supposed to make a second write
   * update the first would let it insert a rival instead.
   */
  kind: text('kind').notNull(),

  /**
   * Which instance of that kind this row is, for whoever picks one:
   * two model endpoints, or one notebook per environment, are rows
   * of a single kind told apart by this.
   *
   * Operator-authored and NOT NULL, which is not the same as
   * non-empty. Every connector is one instance among the ones that
   * could exist, so an empty name is configuration somebody has not
   * finished rather than the unnamed connector of its kind — and
   * because the name is half the natural key, storing it empty takes
   * that place and refuses the next row that means to occupy it.
   */
  name: text('name').notNull(),

  /**
   * What a client needs in order to reach this service: its address,
   * and whatever else that kind of client takes — a model name, an
   * account, the path an export is written under.
   *
   * Carries no `$type` annotation, for the reason `parser_config`
   * above carries none: what a config holds is the client's business
   * and differs by `kind`, so one interface across the four would
   * describe none of them accurately.
   *
   * Defaults to an empty object so every reader faces one shape.
   * Empty means nothing is configured here, which for a connector
   * means there is nowhere to reach — the row names a service the
   * pipeline cannot call rather than one it calls with defaults.
   *
   * Whatever authenticates the call is held here too, and the limit
   * of that is worth stating rather than leaving to be discovered: a
   * value in this column is protected by the database's access
   * control and by nothing else, so it is legible to every
   * connection and present in every dump. A deployment needing more
   * than that stores a reference here and keeps the secret where it
   * can be rotated without an UPDATE.
   */
  config: jsonb('config').default({})
    .notNull(),
}, (table) => [
  /**
   * A name identifies one instance within its kind, and that pair is
   * the row's natural key: an upsert lands on it, so reconfiguring a
   * connector rewrites its config rather than leaving two rows
   * claiming the same service with different addresses.
   *
   * Scoped to the kind rather than global on purpose. Instances are
   * named after where they run far more often than after what they
   * do, so the same name under two kinds is ordinary — a global key
   * would refuse the second one and push the disambiguation into the
   * name string, where nothing enforces it.
   */
  unique('connectors_kind_name_unique').on(table.kind, table.name),

  /**
   * The kind domain, enumerated in the generated SQL from the same
   * tuple `ConnectorKind` is derived from. Named rather than left to
   * drizzle's derivation so the static-SQL invariant suite can assert
   * the constraint is present by grepping for it.
   */
  checkOneOf('connectors_kind_check', table.kind, CONNECTOR_KINDS),
]);
