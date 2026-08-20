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
 * Nothing fetches these rows yet. The adapters arrive in phase 4 and
 * the parse engine they run under in phase 5. What the table fixes now
 * is that everything varying per feed is stored, which is what keeps a
 * per-source branch out of the adapter that would otherwise carry it.
 */
import { bigint, bigserial, boolean, integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { domains } from './domains.js';
import { SOURCE_KINDS, checkOneOf } from './values.js';

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
   * Carries no `$type` annotation, unlike `domains.settings`. What a
   * parser config holds is the adapter's business and differs by
   * `kind`, so one interface across all four would describe none of
   * them accurately.
   *
   * Defaults to an empty object so every reader faces one shape; empty
   * means nothing is configured here and the adapter's own defaults
   * apply.
   */
  parserConfig: jsonb('parser_config').default({})
    .notNull(),

  /**
   * What a payload from this source has to contain: the validation
   * schema a document captured from it is checked against.
   *
   * Defaults to an empty object rather than to null. A source nobody
   * has written a contract for and one whose contract demands nothing
   * come to the same thing — nothing is checked — so a null would buy
   * a distinction no reader acts on and cost every reader a guard.
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
   */
  consecutiveFailures: integer('consecutive_failures').default(0)
    .notNull(),

  /**
   * When this source last yielded a payload that was accepted. NULL
   * means it never has — a source configured but not yet fetched from
   * successfully, which is not the same as one that used to work.
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
