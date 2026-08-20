/**
 * @packageDocumentation
 * `domains` — the workspace level of schema v2, and the row every other
 * pipeline table hangs off. A domain is one subject being researched:
 * it owns its taxonomy, its personas, its topics, its sources and the
 * findings they produce, so the same tables serve any subject without
 * a column that names one.
 *
 * What would otherwise be per-subject code lives in a domain's
 * `settings` rather than in DDL or in a branch: a second domain is a
 * row, not a migration.
 */
import { bigserial, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const domains = pgTable('domains', {
  /**
   * Surrogate key. `bigserial` in `number` mode rather than `bigint`
   * mode: an id crossing the API and MCP surfaces is serialized to
   * JSON, and a JS `bigint` throws there rather than rendering.
   */
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  /**
   * The domain's natural key, and the only stable one it has: the seed
   * upserts a domain by slug, so this is what makes a second seed pass
   * an update of the same row instead of a duplicate of it. UNIQUE is
   * what that upsert stands on, not decoration on top of it.
   */
  slug: text('slug').notNull()
    .unique(),

  /** Operator-facing label. Free text, and safe to rename. */
  name: text('name').notNull(),

  /**
   * Per-domain configuration: scoring weights, the verdict vocabulary
   * findings are labelled against, and the field contract a domain's
   * `findings.fields` payload is validated under.
   *
   * Defaults to an empty object rather than to null so that every
   * reader faces one shape. A configured-to-nothing domain and a
   * not-yet-configured one are the same thing here — absent settings
   * mean the defaults apply — so a null would buy no distinction and
   * would cost every caller a guard.
   */
  settings: jsonb('settings').default({})
    .notNull(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
    .notNull(),

  /**
   * Maintained by whoever writes the row. There is deliberately no
   * trigger and no drizzle `$onUpdate` behind it: the pipeline writes
   * through hand-written SQL as well as through this schema, and a
   * hook that fires on only one of those two paths leaves a column
   * that is stale exactly when it is consulted.
   */
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
    .notNull(),
});
