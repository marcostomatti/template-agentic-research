/**
 * @packageDocumentation
 * `runs` — the pipeline's account of itself: one row per pass, saying
 * when it opened, how it ended, what it counted, and what it could
 * not do.
 *
 * A run row is not a log line. A log is read by a person who has
 * already gone looking, which means something has to have made them
 * suspicious first. A run row is read by the next pass: in the design
 * this port draws from, the digest selects the errors of the most
 * recent run and renders them into the output an operator was going
 * to read anyway, so a source that quietly stopped working arrives as
 * a banner on the next digest rather than as a silence nobody thinks
 * to investigate.
 *
 * That is also why the outcome of a pass is three columns rather than
 * one. `status` is what the pass came to, `counts` is what it did,
 * and `errors` is what it could not do; a reader wanting any of the
 * three has it without parsing the other two.
 *
 * `ar-dispatch` was the first workflow to open these rows, in phase 3,
 * one against each claimed row a tick goes on to dispatch, and phase 5
 * made it one opener of three: `ar-capture` and `ar-score` each insert
 * a row of their own, already closed, for a pass no tick scheduled.
 * `ar-research` is the fourth, from phase 6, in that same already
 * closed shape, for a pass its caller invoked rather than a tick.
 * Nothing has run any of them: those phases ship workflow sources, and
 * the stack that would import them arrives in phase 7.
 *
 * `llm_calls` below keeps the module's second account, at the
 * granularity of one model call rather than one pass;
 * `benchmark_cases` after it keeps the judged cases a change to a
 * domain's scoring is replayed against; and `briefings` last keeps
 * the digest named above, stored as a row rather than only rendered
 * and handed on.
 */
import { bigint, bigserial, integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { domains } from './domains.js';
import { RUN_SCHEDULERS, RUN_STATUSES, checkOneOf } from './values.js';

export const runs = pgTable('runs', {
  /** Surrogate key; see `domains.id` for why `number` mode. */
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  /**
   * The domain this pass ran for, when it ran for one.
   *
   * NULL is an ordinary state rather than a gap. The dispatcher's
   * tick claims whatever is due across every domain at once, and a
   * maintenance or backfill pass belongs to none of them; naming a
   * domain anyway would file work under a domain that did not ask for
   * it and put its tallies among that domain's own.
   *
   * Cascading on delete, like every other domain-scoped row in this
   * schema: a run of one domain is an account of work done under that
   * domain's taxonomy, sources and schedule, and there is nothing
   * left to read in it once they are gone.
   *
   * `ON DELETE SET NULL` is the option worth refusing explicitly,
   * because the NULL above already means the pass was not scoped to a
   * domain. A domain deleted out from under its own runs would leave
   * them looking exactly like the cross-domain ticks that legitimately
   * carry none — the same overloading of a NULL that already means
   * something which `entities.alias_of` in `./entities.ts` refuses.
   *
   * The cascade has a reach worth tracing rather than meeting: every
   * table citing a run has to be emptied by the same statement, or
   * its own FK refuses the whole delete. `entity_research.run_id` in
   * `./entities.ts` is reached, because its entity cascades from the
   * same domain — verified against a real Postgres, which finds
   * nothing orphaned at the end of the statement. A table citing a
   * run with no domain-scoped path of its own would put that refusal
   * on the domain lifecycle instead, which is the trap
   * `ingested_files.document_id` in `./documents.ts` records from the
   * other side; that is the question to settle at each such FK rather
   * than here.
   */
  domainId: bigint('domain_id', { mode: 'number' }).references(() => domains.id, { onDelete: 'cascade' }),

  /**
   * When the row was opened, and by convention when the pass began.
   *
   * NOT NULL because a pass with no start is not a run. It is also
   * the ordering this table is read by — the most recent run is what
   * a reader asking about the pipeline's state wants — and a NULL
   * would sort outside that ordering rather than inside it.
   *
   * The convention is the writer's, not the schema's. `now()` is the
   * transaction's start time rather than the statement's, so a writer
   * opening the row before its work dates the start, while one
   * inserting a single row at the end — which is what the design this
   * port draws from does — dates the whole pass at its finish.
   * Nothing stored here tells the two apart.
   *
   * The ordering it carries is total in practice rather than by
   * construction, for the same reason: rows written in one
   * transaction share this value down to the microsecond, and `id` is
   * the tiebreak. `finding_labels.labelled_at` in `./findings.ts`
   * records the same about its own.
   */
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow()
    .notNull(),

  /**
   * When the pass reported an end.
   *
   * Nullable, and the NULL means no end has been reported — the pass
   * is still working, or its writer never came back. Nothing stands
   * in for it, because a placeholder would date an event that never
   * happened and would sort among the real finishes.
   *
   * `status` below records that same absence a second way, and
   * nothing in the schema holds the two together: a row saying
   * `running` with a finish time, or the reverse, is storable. Only
   * the writer pairs them.
   */
  finishedAt: timestamp('finished_at', { withTimezone: true }),

  /**
   * What the pass came to — see `RUN_STATUSES` in `./values.js` for
   * what each member means and why `partial` is one of them.
   *
   * NOT NULL because a CHECK does not refuse a NULL: the constraint
   * evaluates to UNKNOWN and passes, and the row it admits is then
   * absent from every equality filter over the set at once — missing
   * from the failures a review looks at and from the successes
   * everything else treats as sound.
   *
   * Defaulting to `running`, the member no writer reports. It is what
   * a row holds because nothing has overwritten it, which is the
   * honest reading of a pass that has not said how it went. What the
   * default cannot do is age: a pass whose process died leaves a row
   * indistinguishable from one still working, and no column here
   * holds the window after which one should be read as the other —
   * the reader supplies it, as it does for any freshness rule in this
   * schema.
   *
   * Constrained by a CHECK where `finding_labels.verdict` in
   * `./findings.ts` deliberately carries none, and the difference is
   * whose set it is. A verdict is a domain's reading of its own
   * subject matter and moves with it; how a pass went is a fact about
   * the pipeline, the same four answers for every domain, so there is
   * no fifth a domain could be entitled to. What the constraint then
   * buys over the union derived from the same tuple is reach: rows
   * here are written by hand-written SQL inside workflow nodes as
   * much as from this package, and a union binds only the writer that
   * compiles against it.
   */
  status: text('status').default('running')
    .notNull(),

  /**
   * What the pass did, as the tallies it kept while doing it.
   *
   * NOT NULL defaulting to `{}` on the rule `domains.settings` in
   * `./domains.ts` sets: a pass that counted nothing and a writer
   * that recorded no tallies read the same to everything downstream,
   * so a NULL would buy a distinction no reader acts on and cost
   * every reader a guard.
   *
   * Kept while the work happens rather than recomputed afterwards,
   * because the two answer different questions. A tally taken at the
   * time says what this pass did; counting the rows later says what
   * survives now, over a corpus that has since been re-scored,
   * superseded and deleted.
   *
   * Annotated, where `sources.parser_config` in `./sources.ts`
   * deliberately is not: which keys a row carries varies by writer —
   * a fetch pass tallies documents, a scoring pass findings — and
   * fixing that here is exactly what this column exists to avoid,
   * while the one thing that does not vary is that every value is a
   * count. That makes it the same case as the homogeneous list at
   * `topics.search_terms` in `./scheduling.ts`.
   *
   * The annotation emits no DDL and enforces nothing, as no `$type`
   * on a JSONB column in this schema does. It is a claim a reader
   * programs against, and a workflow node writing its own SQL can
   * store something else.
   */
  counts: jsonb('counts').$type<Record<string, number>>()
    .default({})
    .notNull(),

  /**
   * What the pass could not do, as one entry per failure.
   *
   * NOT NULL defaulting to `[]` for the reason `counts` above gives,
   * and empty is the ordinary state: nothing reads "no failures
   * recorded" differently from "no failures".
   *
   * Unannotated, where `counts` above carries a type, because the
   * entries share no shape. One names a file that would not parse,
   * another an endpoint that refused, another a contract that no
   * longer matches, and one interface across them would describe none
   * of them accurately — the case `sources.parser_config` in
   * `./sources.ts` records, arrived at from the opposite direction.
   *
   * Failures are kept here rather than only in a log because this is
   * what the next pass reads: an export rendering the previous run's
   * errors puts them in front of the operator without anyone having
   * gone looking. That is the fail-flag-keep rule at the level of a
   * whole pass, where `documents.parse_status` in `./documents.ts`
   * applies it to one payload.
   *
   * `status` above is what a writer sets when this array is not
   * empty, and nothing here ties them: a row carrying entries and
   * saying `ok` is storable. Only the writer holds the pair together,
   * the way `documents.parse_error` and its status column are held by
   * theirs.
   */
  errors: jsonb('errors').default([])
    .notNull(),

  /**
   * Which of the three ways of setting a due time chose the one this
   * pass fired against — see `RUN_SCHEDULERS` in `./values.js` for
   * what each of them means.
   *
   * This is the column that makes an unexpected schedule
   * attributable afterwards, and afterwards is when the question
   * gets asked. Every mode writes the same place — `next_run_at`, in
   * `./scheduling.ts` — and every mode writes a plain timestamp: an
   * increment the dispatcher added, a time an agent proposed and the
   * bounds clamped, and a time a person typed are indistinguishable
   * once stored. That column is then overwritten on the next pass,
   * so by the time a row running far more often than anyone intended
   * is noticed, the only surviving copy of the decision is the
   * newest one — which is the schedule being asked about rather than
   * the choice that produced it. Recording the chooser here leaves
   * one line per pass that outlives the timestamp it explains.
   *
   * What makes that worth a column is that the cost is per tick: a
   * schedule nobody meant to change is not one mistake but one
   * mistake charged again every time the clock comes round, for as
   * long as it goes unnoticed. That is the framing
   * `docs/architecture/01-invariants.md` writes its cost guards in,
   * and the same reason it gives there for keeping the `llm_calls`
   * ledger below at all — work nobody can attribute is work nobody
   * can act on.
   *
   * NOT NULL with no default, where `status` above defaults. A
   * value-set default names the member meaning nothing has been
   * reported yet, and this set has none: all three are real answers,
   * so any default would file the runs of two of them under the
   * third, and would do it by absence — filling in the one fact the
   * column exists to record with a guess. The writer says, or the
   * insert fails. NOT NULL also for the reason `status` sets out:
   * the CHECK below passes on a NULL, so without it the column's
   * real domain is these three plus a fourth nothing reports.
   *
   * Two honest limits. What is stored is a writer's account of
   * itself and nothing checks it against what happened, so this
   * attributes a schedule the way a signature does rather than the
   * way a lock does — a row saying `interval` written by hand at a
   * psql prompt is storable. And the attribution is only as fine as
   * a run: a pass claiming several due rows at once records one
   * answer for all of them, so a tick mixing an agent-proposed row
   * with periodic ones cannot say which was which.
   *
   * How fine a run gets was the dispatcher's to choose, and
   * `ar-dispatch` chose the fine one: it opens a row per claimed
   * unit rather than one per tick, so each of its runs is one claim
   * and a tick mixing modes leaves a row apiece. What that buys is
   * the granularity and not the reading. Nothing in a claimed row
   * records which mode wrote its `next_run_at`, all of them writing
   * that one column, so the dispatcher supplies the literal
   * `interval` for every unit it dispatches — and a reader holding
   * one of those rows has the mode that workflow reschedules in
   * rather than the mode that set the time the pass fired against.
   *
   * `ar-research` answers what the dispatcher's rows cannot. It
   * inserts a row of its own, already closed, and reads the
   * literal off the write rather than off the intent: `agent`
   * where its clamped proposal actually moved a `topics` row, and
   * `interval` where it moved none and the increment the claim
   * already made stands. So the dispatcher's row and the research
   * pass's are a pair, and reading the two together is what says
   * which mode set that topic's next due time: `interval` on both
   * is the increment standing, and `agent` on the second is the
   * proposal having landed.
   *
   * The other cost of the finer row is an absence. A tick claiming
   * nothing opens none at all, so this table records what a
   * dispatcher dispatched and never that one ran, and a stopped
   * clock and an empty backlog leave the same gap in it. What
   * answers that is the executor's own execution list, which sits
   * outside this database entirely.
   * `docs/architecture/06-scheduling.md` follows both.
   */
  scheduledBy: text('scheduled_by').notNull(),
}, (table) => [
  /**
   * The run-status domain, enumerated in the generated SQL from the
   * same tuple `RunStatus` is derived from. Named rather than left to
   * drizzle's derivation so the static-SQL invariant suite can assert
   * the constraint is present by grepping for it.
   */
  checkOneOf('runs_status_check', table.status, RUN_STATUSES),

  /**
   * The run-scheduler domain, enumerated in the generated SQL from
   * the same tuple `RunScheduler` is derived from, and named for the
   * reason the status check above is.
   */
  checkOneOf('runs_scheduled_by_check', table.scheduledBy, RUN_SCHEDULERS),
]);

/**
 * `llm_calls` — one row per model call, written by the step that made
 * it.
 *
 * `runs` above accounts for a pass as a whole: what it came to, what
 * it counted, what it could not do. This table accounts for the same
 * work one call at a time, which is the granularity the question
 * "what did that cost" is asked at. A pass that made one call and a
 * pass that made eighty are one row each upstairs, and the tally in
 * `counts` is whatever its writer chose to keep rather than an
 * itemization anything can re-read.
 *
 * The second of those two is what an unbounded pass produces: one
 * call for every row that happened to arrive, stopping at no number
 * anybody chose. A ceiling is what stops it, and this table is what
 * a ceiling can be counted against. The bound itself lives in the
 * workflow making the calls — declared there, applied there, and
 * invisible to this schema — and what it states is what a pass will
 * do. These rows are what it did. Without them, a ceiling that
 * quietly stopped being applied reads exactly like a pass whose
 * input happened to be small.
 *
 * Attribution is the other half, and it is what separates a total
 * that can be acted on from one that can only be noticed. `run_id`
 * below is what charges a call to a pass, and it is the column the
 * design this port draws from declared and never filled: its ledger
 * inserts named the item a call was about, or named nothing at all,
 * so the spend could be summed and no pass could be held to any of
 * it. Spend nobody can attribute is spend nobody can act on — a sum
 * without it says that something is burning, not which step, which
 * schedule, or which batch.
 *
 * Both halves sit in one row of the register: every model call
 * carrying a per-run ceiling, writing a ledger row, and never
 * retrying is a single invariant there, owned by phase 6 and
 * enforced by a test over the workflows built from `workflows/src/`.
 * `docs/architecture/01-invariants.md` holds it, along with the
 * per-tick framing of what a cost guard is worth that
 * `runs.scheduled_by` above cites for its own half of the argument.
 *
 * Nothing here enforces any of that. This table records and refuses
 * nothing: a call whose row is never written is missing from every
 * total at once, and no constraint in this schema can notice — which
 * is why the invariant is asserted against the workflow that should
 * have written the row rather than against the rows. A ledger kept
 * only in a database has a second limit, that it is unreadable in
 * exactly the outage it would explain; the design this port draws
 * from answered that with a second copy on disk, and phase 6 settled
 * that the pairing is not carried: the three workflows that call a
 * model write this row and nothing else, so that limit stands.
 *
 * `ar-ingest` writes these rows, from phase 5, one per call its model
 * node made, and `ar-research` and `ar-digest` joined it on the same
 * terms from phase 6, one row per call apiece. Nothing has run any of
 * them, for the reason the `runs` header above gives.
 */
export const llmCalls = pgTable('llm_calls', {
  /** Surrogate key; see `domains.id` for why `number` mode. */
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  /**
   * The pass this call was made inside, when it was made inside one.
   *
   * NULL is an ordinary state rather than a gap, as it is at
   * `entity_research.run_id` in `./entities.ts`: a call made by hand
   * against a running service, or by a step that opens no run of its
   * own, was made inside no pass, and naming one anyway would charge
   * it to work that never incurred it.
   *
   * Cascading on delete, where that column refuses, and the
   * difference is what the two rows ARE. Research is a result about a
   * subject, and it outlives the pass that found it; a ledger row is
   * part of the pass's own account of itself, in the same sense
   * `counts` above is. So the run owns it, which is the ownership
   * test every FK in this schema is decided by.
   *
   * `ON DELETE SET NULL` is refused for the reason the NULL above
   * gives: it already means no pass made this call, so a run deleted
   * out from under its own ledger would silently reclassify its calls
   * as ones nobody ran.
   *
   * NO ACTION is refused on the reach `runs.domain_id` above traces.
   * This table has no domain-scoped path of its own, so a refusal
   * here would land on the domain lifecycle every time: dropping a
   * domain cascades to its runs, rows still citing them would refuse
   * the whole statement, and the error would name a constraint the
   * operator never mentioned. `ingested_files.document_id` in
   * `./documents.ts` records that trap from the inside.
   *
   * The cascade's own cost is worth stating rather than meeting: the
   * ledger of a deleted domain's passes goes with them, so a total
   * spanning a domain that no longer exists has to have been taken
   * while it still did.
   */
  runId: bigint('run_id', { mode: 'number' }).references(() => runs.id, { onDelete: 'cascade' }),

  /**
   * Which step made the call, as that step names itself.
   *
   * NOT NULL, and known by construction rather than looked up: the
   * writer IS the step, so its own name is the one fact it cannot
   * fail to have. `model` below is nullable for the mirror of that
   * reason.
   *
   * NOT NULL is not non-empty, and `''` is the state worth saying
   * something about: it names no step, which is the thing this column
   * exists to record, and a total grouped by it collects every
   * anonymous call under one blank heading. Nothing here refuses it —
   * only the writer does.
   *
   * The value is a name, and names move. A step renamed keeps its old
   * name on every row already written, so a total by node reports two
   * steps where there was one and neither half is wrong. Nothing in
   * the schema can hold that together; a reader totalling over a long
   * window has to know it.
   */
  node: text('node').notNull(),

  /**
   * Which model answered, as the writer named it.
   *
   * Free text rather than one of `./values.ts`'s tuples, for the
   * reason `domains.embedding_model` in `./domains.ts` sets out at
   * length: which models exist is a fact about a deployment, so a
   * closed set here would make trying one a migration.
   *
   * The contrast with that column is worth a sentence, since the two
   * look alike and are not. An embedder is recorded as it REPORTED
   * itself; this is recorded as the caller believed it to be — in the
   * design this port draws from, a literal in the SQL of the node
   * making the call — so a deployment pointed at a different model
   * goes on writing the old name until somebody edits the caller.
   * What is stored is what was asked for, not what served it.
   *
   * Nullable, where `node` above is not: a caller always knows its
   * own name and may genuinely not know the model's, behind a gateway
   * that routes or a runtime that reports none. NULL means it was not
   * recorded, and such a row still counts as a call while saying
   * nothing about which model made it.
   */
  model: text('model'),

  /**
   * How large the prompt was, in characters.
   *
   * Nullable with no default, in the signal class `findings.score` in
   * `./findings.ts` sets out: NULL means nothing measured this call.
   * Zero is a real reading here rather than a stand-in for one — a
   * call declined before it was sent sends no characters, and the
   * design this port draws from ledgers exactly that — so a 0 written
   * for an absent measurement would be indistinguishable from it and
   * would sit inside every sum and threshold as though it had been
   * measured.
   *
   * Characters rather than tokens because characters are what the
   * caller has. Tokenization belongs to the model, and this is a
   * count taken on the way out.
   */
  promptChars: integer('prompt_chars'),

  /**
   * How many tokens that prompt is estimated to have been, in the
   * same signal class as `prompt_chars` above and NULL for the same
   * reason.
   *
   * The `est_` is load-bearing. This is not a count a provider
   * reported; in the design this port draws from it is arithmetic
   * over the column above — characters divided by a constant — so the
   * two are one reading expressed twice rather than two independent
   * ones, and a total over this column does not reconcile with a
   * bill. It is a magnitude for comparing calls against each other,
   * and nothing stored here says which estimator produced it.
   */
  estTokens: integer('est_tokens'),

  /**
   * When the row was written, and by convention when the call was
   * made.
   *
   * NOT NULL because a ledger entry outside time cannot be totalled
   * over a window, which is how this table is read.
   *
   * The convention is the writer's, as it is for `started_at` above.
   * `now()` is the transaction's start time rather than the
   * statement's, so calls ledgered together share this value down to
   * the microsecond, and a writer recording the row after its call
   * returns dates the return rather than the request. Nothing stored
   * here tells any of that apart.
   *
   * It is also the ordering, and this table has no unique key above
   * it to break a tie — `id` is the tiebreak, the same shape
   * `finding_labels.labelled_at` in `./findings.ts` records.
   */
  calledAt: timestamp('called_at', { withTimezone: true }).defaultNow()
    .notNull(),
});

/**
 * `benchmark_cases` — inputs somebody has judged, kept so a change to
 * a domain's judgement can be measured rather than assumed.
 *
 * Judgement changes quietly. A weight edited in `terms` in
 * `./taxonomy.ts`, a figure moved in `DomainSettings.scoringWeights`
 * in `./domains.ts`, a persona reworded in `personas` beside it —
 * each one changes every reading the pipeline produces from then on,
 * and none of them changes anything already stored.
 * `findings.score_version` in `./findings.ts` records which scheme a
 * row was scored under, which is what finds the stale ones; it says
 * nothing about whether the new scheme reads better than the old.
 * These rows are what that question can be put to. They are to a
 * domain's judgement what this package's unit tests are to its
 * parsing, and they are rows rather than fixtures because what they
 * pin belongs to a domain rather than to the code.
 *
 * A case is an input plus an expected reading of it, and both are
 * stored here rather than pointed at. A row citing `documents` in
 * `./documents.ts` would replay whatever that document says now, and
 * a document can be re-parsed, superseded, or deleted with its
 * domain's corpus; two replays are only comparable if what they read
 * did not move in between, which is the whole of what a case is for.
 *
 * The judgement stored here is a different act from the one
 * `finding_labels` in `./findings.ts` keeps, and the two are worth
 * telling apart before either is read as the other. A label is a
 * person's reading of a result the pipeline actually produced,
 * written after the fact. An expected reading is written about an
 * input and says what a correct pipeline WOULD produce, so it stands
 * whether or not anything has ever run against it.
 *
 * What a replay then produced is not kept here — the roster this
 * port carries gives the table no column for it, where the design it
 * draws from stored the last observed reading beside the expected
 * one. A pass's own account of itself is `runs` above.
 *
 * Nothing writes or replays these rows yet, and no phase of the
 * sequencing names the harness that would: the table is carried
 * forward ahead of the loop that fills it.
 */
export const benchmarkCases = pgTable('benchmark_cases', {
  /** Surrogate key; see `domains.id` for why `number` mode. */
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  /**
   * The domain whose judgement this case tests. Cascading on delete
   * like every other domain-owned row: an expected reading is an
   * expectation under one domain's taxonomy, weights and personas,
   * and there is nothing left to hold it to once they are gone.
   *
   * The cascade costs more here than at the rows it sits among, and
   * the difference is worth naming rather than meeting. A case is
   * authored, the way the taxonomy and `personas` in `./domains.ts`
   * are, so what goes with the domain is attention somebody spent
   * rather than a result another pass could produce again. That is an
   * argument for care around the delete, not for refusing it.
   */
  domainId: bigint('domain_id', { mode: 'number' }).notNull()
    .references(() => domains.id, { onDelete: 'cascade' }),

  /**
   * What this case is called, for a person reading a report of what
   * disagreed.
   *
   * NOT NULL, and authored rather than computed, so there is no
   * never-written state for a NULL to encode. NOT NULL is not
   * non-empty, though, and `''` is the state worth saying something
   * about: it names no case, and a report listing disagreements by
   * label gathers every unnamed one under a single blank heading.
   * Nothing here refuses it — only the writer does.
   *
   * No unique key over it, alone or with the domain, because the
   * roster this port carries names none. So two rows may share a
   * label, and re-seeding a case inserts a rival rather than
   * replacing the first — the same shape `finding_labels` in
   * `./findings.ts` records for its own missing key, minus that
   * table's reason for wanting the history.
   *
   * A caution for whoever gives this table its first writer, from
   * what the design this port draws from did with the same column: it
   * keyed on the name AND read a second fact out of its shape, so
   * which of two populations a row belonged to was decided by a
   * pattern match over the name, and the guard keeping the frozen
   * cases out of what it trained on was that regex. A name that
   * decides what a row IS moves the row when somebody renames it.
   * Nothing here carries meaning in the label, and nothing here
   * distinguishes populations either.
   */
  label: text('label').notNull(),

  /**
   * The input this case replays: whatever the pipeline reads to reach
   * a reading, stored verbatim.
   *
   * NOT NULL with no default, which no other JSONB column in this
   * schema is — every one of them either defaults to `{}` or is
   * nullable. Both of those shapes describe a payload incidental to
   * its row, and this one IS the row. A case with nothing to replay
   * does not test leniently, it passes silently, so a default here
   * would let the one thing the row exists to hold be skipped without
   * a word. Same reasoning as the authored magnitude at `terms.weight`
   * in `./taxonomy.ts`: nothing computes it, so there is no
   * never-computed state a default could stand for.
   *
   * Unannotated, on the rule `entity_research.payload` in
   * `./entities.ts` records — what a domain's pipeline reads varies
   * by domain, and one interface across all of them would describe
   * none of them accurately. A reader has the writing domain's own
   * convention and nothing else.
   */
  payload: jsonb('payload').notNull(),

  /**
   * The reading a correct pipeline should reach for that input.
   *
   * Nullable, and the NULL means nobody has judged this case yet —
   * an input frozen at capture, ahead of the attention that says what
   * it should come to, which is worth doing separately because the
   * input is the half that perishes. `{}` would claim the opposite:
   * that somebody judged it and expected nothing, which a replay
   * would then hold the pipeline to. Same split `documents.raw` in
   * `./documents.ts` makes between a payload never stored and one
   * stored empty, and the payload analogue of what `findings.score`
   * in `./findings.ts` states for numbers.
   *
   * A payload rather than a verdict, because the answer is not the
   * only thing worth expecting. A case whose verdict still comes out
   * right can have come out right for a worse reason — a margin that
   * has narrowed, a term that stopped firing — and what makes a
   * disagreement diagnosable rather than merely red is recording what
   * the reading should CONTAIN. The design this port draws from spent
   * a column each on the parts its own subject matter had, which is
   * the half that cannot port; the bounds and labels a domain wants
   * to hold to go in here instead, under keys this schema does not
   * declare.
   *
   * Unannotated for the reason `payload` above gives, with the
   * consequence that follows from it: nothing validates a stored
   * expectation, so a replay looking for a key no writer ever wrote
   * finds an absence rather than an error.
   */
  expected: jsonb('expected'),
});
/**
 * `briefings` — a domain's periodic account of itself, kept as a row.
 *
 * `runs` above is the pipeline's account of a pass, and its reader is
 * the next pass. This is the account a PERSON reads: what a period
 * came to under one domain's taxonomy, written once and stored,
 * rather than assembled again by whichever surface happens to ask.
 *
 * Storing it is what the executor's send-free rule leaves it able to
 * do. `docs/architecture/00-overview.md` states the rule — the
 * workflows write to the database, renderers return artifacts, and an
 * email export produces a draft and stops there — so what a digest
 * pass produces has to land somewhere that is not a delivery, and a
 * row is that somewhere. The second thing it buys is that every
 * format afterwards renders the SAME text: an export and the API
 * serve one artifact rather than two renderings that can disagree
 * about what a week came to.
 *
 * No FK runs between this table and `export_subscriptions` in
 * `./scheduling.ts`, and the two answer different questions — a
 * subscription is what a domain wants delivered and how often, this
 * is what was produced. Which of the two a renderer reads from, this
 * row or the findings underneath it, was settled in phase 6 as BOTH:
 * `ExportRenderInput` in `src/exports/index.ts` is handed this row and
 * the findings the pass selected, the briefing saying what the period
 * came to and the findings being what a format lays out.
 *
 * The divergence from the design this port draws from is the whole
 * shape rather than a column, so reading that design's table first
 * misleads: there a briefings row was the state machine for an
 * asynchronous audio job, keyed one row per digest DATE, and the
 * digest text was never stored at all — only written out as a file.
 * Here the text is the point, the audio is not carried, and what
 * goes with that key is idempotence; see `generated_at` below.
 *
 * `ar-digest` writes these rows, from phase 6, one per pass over a
 * domain's period, storing the drafted prose as `body` and the
 * assembly as `payload` in one statement. Nothing has run it, for the
 * reason the `runs` header above gives.
 */
export const briefings = pgTable('briefings', {
  /** Surrogate key; see `domains.id` for why `number` mode. */
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  /**
   * The domain this briefing is about.
   *
   * NOT NULL because there is no briefing without one: what it
   * selected, how those results were scored and what they are called
   * all come from a domain's taxonomy and settings, so a row citing
   * none of them is a document nobody can read in context.
   *
   * Cascading on delete like every other domain-owned row, and the
   * cost is `benchmark_cases` above turned around. A case is authored,
   * so what the cascade takes is attention somebody spent; a briefing
   * is generated, so what it takes is a record of what a domain said
   * about a period at the time it said it. Producing it again is not
   * on offer either: the findings it selected from cascade out of the
   * same statement, and the drafting step that made prose of them is a
   * model call, not a function of them.
   */
  domainId: bigint('domain_id', { mode: 'number' }).notNull()
    .references(() => domains.id, { onDelete: 'cascade' }),

  /**
   * The pass that produced this briefing, when a pass produced it.
   *
   * NULL is an ordinary state rather than a gap, as it is at
   * `entity_research.run_id` in `./entities.ts`: a briefing written
   * by hand, backfilled from whatever a domain kept before it had a
   * pipeline, or rendered by the service layer later, was produced
   * inside no pass.
   *
   * No `onDelete`, so it emits `ON DELETE no action` — the opposite
   * answer to `llm_calls.run_id` above, on the one test that decides
   * every FK into this table. A ledger row is part of a pass's own
   * account of itself, in the same sense `runs.counts` is, so the run
   * owns it. A briefing is a document the pass produced and does not
   * own — read long after by people with no interest in which tick
   * assembled it. `ON DELETE SET NULL` is refused for the reason that
   * column gives: the NULL above already means no pass produced this
   * row, so a run deleted out from under its own output would silently
   * reclassify it as hand-written.
   *
   * The refusal's reach is the two-hop question `entity_research`'s
   * own `run_id` traces, and it lands the same way here. A briefing
   * of the domain its run ran for is already gone by the end of the
   * statement that drops that domain — this table cascades from
   * `domain_id` above, the run cascades from the same row — so the
   * check finds nothing orphaned. Nothing ties the two, though, so a
   * briefing of one domain citing another domain's run holds that
   * second domain open until somebody deals with it.
   */
  runId: bigint('run_id', { mode: 'number' }).references(() => runs.id),

  /**
   * The briefing itself, as prose for a person to read.
   *
   * Nullable, and the NULL means no text was produced — a pass whose
   * selection came back but whose drafting step did not, or a writer
   * that stores the structured half now and renders prose later. `''`
   * would claim a briefing was written and that it came to nothing,
   * which a surface then renders as a blank document rather than as
   * nothing to show. Same split `entity_research.summary` in
   * `./entities.ts` makes, and the text analogue of what
   * `findings.score` in `./findings.ts` states for numbers. It is
   * unbounded for `summary`'s reason too: what a briefing is worth
   * varies by domain, and the writer calling the model is the only
   * place that knows what was asked for.
   *
   * Not the `benchmark_cases.payload` case above, though the two look
   * close. That column is NOT NULL with no default because a case
   * with nothing to replay does not test leniently, it passes
   * silently. Nothing replays a briefing — it is read — so an empty
   * one costs a reader a wasted click rather than a green result
   * nothing checked.
   *
   * The honest limit: nothing here refuses a row with no content at
   * all — a NULL body beside the empty `payload` default below is
   * storable, and only the writer keeps one from being written when
   * there was nothing to say.
   */
  body: text('body'),

  /**
   * The structured half of the same briefing: what the period came
   * to, in whatever shape a domain's renderers want beyond prose.
   *
   * NOT NULL defaulting to `{}` on the rule `domains.settings` in
   * `./domains.ts` sets, applied to this pairing exactly as
   * `entity_research.payload` in `./entities.ts` applies it to its
   * own: a briefing that recorded nothing structured and one whose
   * writer keeps no structure read the same to every renderer, so a
   * NULL would buy a distinction nothing acts on and cost every
   * reader a guard.
   *
   * Unannotated, for the reason `entity_research.payload` records —
   * what belongs inside varies by domain and by what a format needs,
   * and one interface across all of them would describe none of
   * them. It has nothing to be validated against either, where a
   * finding's payload has `DomainSettings.fieldContract` in
   * `./domains.ts`, so a reader has the writing domain's own
   * convention and nothing else.
   *
   * It is also what keeps one stored briefing from fixing what every
   * export looks like. A renderer handed prose can only reproduce it;
   * one handed the counts, the ranges and the ids a period selected
   * can lay them out per format, which is the whole reason the row
   * carries two halves rather than a rendered document.
   */
  payload: jsonb('payload').default({})
    .notNull(),

  /**
   * When this briefing was generated.
   *
   * NOT NULL defaulting to now, because there is no window in which
   * one of these rows exists and the briefing behind it has not been
   * made. The honest limit is which moment it names: the default
   * dates the WRITE, so a pass that selected at one time and
   * persisted later is dated by the second.
   *
   * What it is not is what the briefing is ABOUT. No column here
   * holds the period covered, so a reader wanting the digest for a
   * given week has this timestamp plus the writer's convention that a
   * briefing is generated at the end of what it covers. The design
   * this port draws from stored the period instead, one row per
   * digest date and UNIQUE over it; the roster this port carries
   * names no such column.
   *
   * That missing key is the accumulate-versus-replace trade
   * `finding_labels` in `./findings.ts` argues and
   * `entity_research.researched_at` in `./entities.ts` repeats, and
   * this table takes the same side: every render keeps its own row, so
   * what changed between two is readable. What differs is the cost,
   * because the origin's key did a second job — a re-render met the
   * row already written, so running the digest twice left one
   * briefing. A second render here inserts a rival, and a reader
   * wanting the current one says `ORDER BY generated_at DESC LIMIT 1`
   * rather than assuming one row per period.
   *
   * That ordering is total in practice rather than by construction,
   * with no unique key above it: `now()` is the TRANSACTION's start
   * time, so two briefings written together tie to the microsecond
   * and `id` is the tiebreak, as `finding_labels.labelled_at`
   * records.
   */
  generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow()
    .notNull(),
});
