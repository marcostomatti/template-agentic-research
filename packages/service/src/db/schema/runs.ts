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
 * Nothing writes these rows yet. `ar-dispatch` is the first workflow
 * to open one, phase 3.
 */
import { bigint, bigserial, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { domains } from './domains.js';
import { RUN_STATUSES, checkOneOf } from './values.js';

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
}, (table) => [
  /**
   * The run-status domain, enumerated in the generated SQL from the
   * same tuple `RunStatus` is derived from. Named rather than left to
   * drizzle's derivation so the static-SQL invariant suite can assert
   * the constraint is present by grepping for it.
   */
  checkOneOf('runs_status_check', table.status, RUN_STATUSES),
]);
