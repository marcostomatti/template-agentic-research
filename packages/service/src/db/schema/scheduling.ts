/**
 * @packageDocumentation
 * Scheduling — the column set that makes a row due, and the tables
 * that carry it.
 *
 * The pipeline schedules by one mechanism rather than one per table:
 * a row records how often it should run and when it is next due, and
 * a single dispatcher claims whatever has come due. What that
 * dispatcher reads is {@link schedulableColumns}, declared once here
 * and spread into every table taking part, so a schedulable table
 * carries the whole set or none of it. Half of it is worse than
 * neither — a row with an interval and no due time repeats on a
 * schedule nothing ever claims.
 */
import { sql } from 'drizzle-orm';
import { bigint, bigserial, boolean, index, integer, jsonb, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';

import { domains } from './domains.js';
import { connectors } from './sources.js';
import { EXPORT_FORMATS, checkOneOf } from './values.js';

/**
 * The columns a schedulable row carries, for spreading into a
 * `pgTable` definition beside that table's own columns.
 *
 * A function rather than a shared object because drizzle's column
 * builders are per-table: each table a column set is spread into
 * needs builders of its own, and handing two tables the same
 * instances shares state between them.
 *
 * One dispatcher reads these columns. `ar-dispatch`, arriving in
 * phase 3, holds the only schedule trigger in the system: it wakes on
 * its own cron, takes the rows that are enabled and whose
 * `next_run_at` has passed with `FOR UPDATE SKIP LOCKED`, caps how
 * many it takes in one pass, and runs what it claimed. No table keeps
 * a timetable of its own and no other workflow is woken by a clock,
 * so making a new thing schedulable is an INSERT rather than another
 * trigger — and a trigger acquired by accident is what turns a single
 * mistake into a recurring one.
 *
 * `SKIP LOCKED` is the part that makes overlapping passes safe. A
 * tick starting while the previous one is still working steps over
 * the rows already locked and claims different ones, rather than
 * blocking until the lock clears and then running work that has just
 * been done. Two honest limits come with it. The guarantee lasts
 * exactly as long as the transaction holding the lock, so the claim
 * and the write that moves `next_run_at` forward belong in the same
 * transaction — commit the claim early and the row is unlocked and
 * still due, which is an invitation for the next tick to run it
 * again. And a row held by a transaction that never finishes is
 * passed over with no error: skipped and not-yet-due look identical
 * from outside.
 *
 * @returns Fresh builders for the schedulable column set.
 */
export function schedulableColumns() {
  return {
    /**
     * How long to wait between runs of this row, in seconds.
     *
     * Seconds in the name rather than a bare `interval` because
     * `interval` is a type name in Postgres, and the queries reading
     * this column are hand-written SQL where quoting an identifier is
     * easy to forget.
     *
     * NOT NULL: a row that takes part in scheduling and says nothing
     * about how often is a row the dispatcher cannot reschedule after
     * running it.
     */
    intervalSeconds: integer('interval_seconds').notNull(),

    /**
     * When this row is next due to run.
     *
     * NULL means it is not scheduled: nothing claims it, whatever its
     * interval says, until something writes a time here.
     *
     * The single scheduling truth. Every way a row can be scheduled
     * is a write to this one column and nothing else: strict periodic
     * is the dispatcher adding the interval after a run, an
     * extraordinary run is `now()`, a pause for N cycles is N
     * intervals pushed out, and an agent-chosen time is whatever it
     * proposed once the bounds below have clamped it. Nothing holds a
     * second copy — no cron per table, no queue carrying its own due
     * time — so asking when a row runs next never means reconciling
     * two answers that can disagree, and changing it never means
     * remembering to write both.
     *
     * The dispatcher writes `now() + interval_seconds` after a run
     * unless the run already set a time here, which is what lets any
     * of those modes override the default without a flag declaring
     * which mode is in force. Which writer chose a time is recorded
     * on the run rather than read back out of this column: all of
     * them can produce the same timestamp, so a schedule that changed
     * unexpectedly is only attributable if the choosing was logged
     * when it happened.
     */
    nextRunAt: timestamp('next_run_at', { withTimezone: true }),

    /**
     * Whether this row takes part in scheduling at all.
     *
     * Defaults to true because a schedulable row exists in order to
     * be run. A row that has to be switched on after it is inserted
     * is a schedule somebody configured and the pipeline then quietly
     * ignored.
     */
    enabled: boolean('enabled').default(true)
      .notNull(),

    /**
     * The shortest interval this row may be run at, in seconds. NULL
     * means it has no floor of its own.
     *
     * This column and the one below exist for the agent-driven mode.
     * Where an agent proposes when a row should next be looked at,
     * the gap it proposes is clamped into the range these two give
     * before the resulting time is written to `next_run_at`, so a
     * judgement call still lands inside limits a person set. The
     * floor is what keeps a proposal meaning "look again shortly"
     * from becoming a row that runs every few seconds — the cost of
     * getting that wrong is paid once per tick, for as long as
     * nobody notices.
     *
     * The clamp is applied by the writer, not by the database. No
     * CHECK relates these two columns to each other or to
     * `next_run_at`, so a direct UPDATE can still write a time
     * outside them and nothing refuses it. They bound what the agent
     * path proposes; they are not an enforcement boundary.
     */
    minIntervalSeconds: integer('min_interval_seconds'),

    /**
     * The longest interval this row may go between runs, in seconds.
     * NULL means it has no ceiling of its own.
     *
     * The ceiling half of the clamp described on
     * `min_interval_seconds` above, bounding a proposal in the other
     * direction so an agent that keeps deferring a row cannot defer
     * it out of sight. NULL means precisely that: nothing limits how
     * far out a proposal may push this row.
     */
    maxIntervalSeconds: integer('max_interval_seconds'),
  };
}

/**
 * `topics` — one standing subject a domain wants looked into, and how
 * often.
 *
 * The schedulable research unit: a topic names what to go and find
 * out, carries the terms a run issues on its behalf, and holds the
 * column set above that says when it is next due. Adding a subject to
 * a domain is an INSERT, and it starts being researched as soon as
 * `next_run_at` is set — no workflow gains a branch and no schedule is
 * configured anywhere else.
 *
 * Nothing runs a topic yet. The dispatcher that claims due rows
 * arrives in phase 3 and the research workflow it invokes in phase 6.
 * What the table fixes now is that the subject, its terms and its
 * cadence are one row, so what the pipeline is currently looking into
 * — and when it will next look — is a SELECT rather than a reading of
 * whatever the workflows happen to be built from.
 */
export const topics = pgTable('topics', {
  /** Surrogate key; see `domains.id` for why `number` mode. */
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  /**
   * The domain whose research this topic is part of. Cascading on
   * delete like every other domain-owned row: a topic outliving its
   * domain is a subject nothing is interested in any more, and one
   * that goes on coming due — the dispatcher claims by `next_run_at`
   * and is in no position to notice the domain has gone.
   */
  domainId: bigint('domain_id', { mode: 'number' }).notNull()
    .references(() => domains.id, { onDelete: 'cascade' }),

  /**
   * What this topic is about, in the operator's words. Also half the
   * natural key below, so it is what a seed pass upserts on and what a
   * person names the topic by when asking why a run happened.
   *
   * NOT NULL, which is not the same as non-empty. A topic exists
   * because somebody wanted a particular thing looked into, so an
   * empty name is a row somebody has not finished rather than the
   * unnamed topic of its domain — and because the name is half the
   * key, an empty one takes that place and refuses the next row
   * meaning to occupy it.
   */
  name: text('name').notNull(),

  /**
   * The terms a run issues on this topic's behalf — what actually goes
   * to a search connector, stored rather than assembled at run time.
   *
   * Stored so that what will be issued can be read before it is
   * issued: a term list built inside a workflow node is only visible
   * once a run has already gone out with it, and correcting it means
   * editing the thing that ran rather than the row that described it.
   * The design this one is ported from stored terms on the same
   * reasoning, on the rows an operator ruled on before anything was
   * sent.
   *
   * Carries a `$type` annotation, unlike `sources.parser_config`: a
   * list of terms is one shape whatever the domain, so an interface
   * over it describes every row rather than none of them. The
   * annotation is a claim readers program against and not a
   * constraint — it emits no DDL and validates nothing, so a writer
   * reaching this column with hand-written SQL can still store a shape
   * it rejects.
   *
   * Defaults to an empty list so every reader faces one shape. Empty
   * means this topic has no terms of its own, which for a schedulable
   * row is worth naming rather than assuming: it comes due on time and
   * gives its run nothing to issue.
   */
  searchTerms: jsonb('search_terms').$type<string[]>()
    .default([])
    .notNull(),

  ...schedulableColumns(),
}, (table) => [
  /**
   * A name identifies one topic within its domain, and that pair is
   * the row's natural key: the seed upserts on it, so re-seeding a
   * topic adjusts its terms and its cadence rather than leaving two
   * rows on the same subject coming due independently. Two domains are
   * free to research subjects of the same name.
   */
  unique('topics_domain_id_name_unique').on(table.domainId, table.name),

  /**
   * What the phase-3 claim query stands on. `ar-dispatch` reads the
   * rows that are enabled and whose `next_run_at` has passed, orders
   * them oldest-due first and takes a capped batch with `FOR UPDATE
   * SKIP LOCKED` — this index is those two columns in that order, so
   * the claim is a range scan over the due rows rather than a scan of
   * every topic in the table on every tick.
   *
   * The `WHERE` predicate is the half that keeps it small. A disabled
   * topic never enters the index at all, so the structure the
   * dispatcher walks stays proportional to the rows it can actually
   * claim rather than to everything that was ever configured — which
   * matters here more than the row count suggests, because the cost is
   * paid once per tick forever rather than once per query somebody
   * runs.
   *
   * Two honest limits, since a partial index is easy to overclaim.
   * Postgres uses one only where it can prove the query's own
   * predicate implies the index's, so a claim query that filters on
   * `enabled` in a form the planner cannot match — or omits it because
   * the caller assumes the index covers it — falls back to a
   * sequential scan and reports nothing. And within this index every
   * entry has `enabled` true, so the leading column adds no
   * selectivity: it is in the key because the pair is what the claim
   * filters on, not because it narrows anything the predicate has not
   * narrowed already.
   *
   * Named for the reader rather than derived from its columns: an
   * index found in the generated SQL, or in a plan, says which query
   * it was added for, and the static-SQL invariant suite greps for
   * that name.
   */
  index('topics_dispatch_claim_idx').on(table.enabled, table.nextRunAt)
    .where(sql`${table.enabled}`),
]);

/**
 * `export_subscriptions` — one standing delivery a domain wants: what
 * gets rendered, where it is handed over, and how often.
 *
 * The second schedulable table, and the point where this phase's two
 * levels of configuration meet. A domain says what it wants exported
 * and in which format; `connectors` says where an export target
 * actually is, one row per deployment rather than one per domain.
 * Pairing them here is what keeps an address out of every domain that
 * delivers through it — moving a destination is an UPDATE on the one
 * connector row, and every subscription naming it follows.
 *
 * Nothing renders one yet. The dispatcher that claims due rows arrives
 * in phase 3, and the digest workflow that renders an artifact and
 * hands it over in phase 6. What the table fixes now is that the
 * format, the destination and the cadence are one row, so subscribing
 * a domain to a feed is an INSERT and asking what it currently
 * receives is a SELECT.
 *
 * No row here sends anything on its own account. A format names an
 * artifact the pipeline writes and hands to its connector — see
 * `EXPORT_FORMATS` in `./values.js` — and delivery that reaches a
 * person is the service layer's, behind its own approval gate.
 */
export const exportSubscriptions = pgTable('export_subscriptions', {
  /** Surrogate key; see `domains.id` for why `number` mode. */
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  /**
   * The domain whose material this subscription exports. Cascading on
   * delete like every other domain-owned row: a subscription
   * outliving its domain renders a digest of nothing, and goes on
   * coming due while it does — the dispatcher claims by `next_run_at`
   * and is in no position to notice the domain has gone.
   */
  domainId: bigint('domain_id', { mode: 'number' }).notNull()
    .references(() => domains.id, { onDelete: 'cascade' }),

  /**
   * What this subscription renders — see `EXPORT_FORMATS` in
   * `./values.js` for what each member produces.
   *
   * Selects the renderer, the way `sources.kind` selects an adapter,
   * and it is one declaration read twice for the same reason: the
   * CHECK below is generated from the tuple the `ExportFormat` union
   * is derived from, so a format no renderer exists for cannot be
   * stored and a format the column refuses cannot be reached from
   * stored data.
   *
   * NOT NULL on both counts a nullable column would cost here. A
   * CHECK is UNKNOWN against NULL and so admits it, and this column
   * is one third of the natural key below — where a NULL is not equal
   * to another NULL as far as a unique index is concerned, so the key
   * that is supposed to make a second write update the first would
   * let it insert a rival instead.
   */
  format: text('format').notNull(),

  /**
   * Where the rendered artifact is handed over: the `export_target`
   * connector that receives it.
   *
   * NOT NULL because an export with no destination is a render nobody
   * receives, and because it is the third part of the natural key, on
   * the same reasoning as `format` above.
   *
   * No `onDelete`, which is a decision rather than the omission it
   * resembles. The FK emits `ON DELETE no action`, so deleting a
   * connector that still receives exports is REFUSED — the opposite
   * of the cascade on `domain_id`, and deliberately so. A domain
   * going away takes its own configuration with it, but a connector
   * is deployment-level and shared: the subscriptions pointing at it
   * belong to the domains that made them, and retiring one service
   * should not quietly cancel deliveries in every domain that named
   * it. The refusal makes re-pointing or cancelling them the explicit
   * step it is.
   */
  connectorId: bigint('connector_id', { mode: 'number' }).notNull()
    .references(() => connectors.id),

  ...schedulableColumns(),
}, (table) => [
  /**
   * Domain, format and destination together are the row's natural
   * key: a seed pass upserts on the triple, so re-subscribing adjusts
   * the cadence rather than leaving two rows rendering the same
   * artifact on independent schedules — which costs twice over, once
   * in the rendering and again in what arrives at the far end.
   *
   * All three, because no pair of them identifies a subscription. One
   * domain may want the same digest in two formats, and may want one
   * format delivered to two destinations; both are ordinary, and a
   * key over either pair would refuse the second row.
   */
  unique('export_subscriptions_domain_id_format_connector_id_unique').on(table.domainId, table.format, table.connectorId),

  /**
   * The format domain, enumerated in the generated SQL from the same
   * tuple `ExportFormat` is derived from. Named rather than left to
   * drizzle's derivation so the static-SQL invariant suite can assert
   * the constraint is present by grepping for it.
   */
  checkOneOf('export_subscriptions_format_check', table.format, EXPORT_FORMATS),
]);
