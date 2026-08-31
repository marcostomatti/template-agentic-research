/**
 * @packageDocumentation
 * `operator_settings` — what the operator configures about the
 * deployment as a whole, held in the one row this table is allowed to
 * have.
 *
 * The line against `domains.settings` in `./domains.ts` is what each
 * of the two answers for. A domain's settings configure a SUBJECT:
 * the weights its findings are scored on, the vocabulary they are
 * judged against, the contract their payload is validated under.
 * These configure the OPERATOR: which domain a surface opens on when
 * a request names none, what a digest is rendered as, which channels
 * a notification may reach. Nothing here varies by domain, which is
 * why none of it is a column on one.
 *
 * One row, and the database is what says so rather than every writer
 * remembering to. `id` is pinned to 1 by a CHECK, so a second
 * configuration cannot sit alongside the first waiting to be read by
 * whichever query happens to sort it first. Without the constraint
 * that failure arrives silently and only under a race: both rows are
 * valid, both are readable, and which one a deployment is running on
 * depends on an ORDER BY nobody wrote.
 *
 * An absent row and an empty payload are the same state — the
 * defaults apply — which is the argument `domains.settings`
 * already makes for its own `{}` default. It is also why a read
 * before any write is answered `{}` rather than 404: there is nothing
 * an operator has to create before they can configure something.
 */
import type { ExportFormat } from './values.js';

import { sql } from 'drizzle-orm';
import { check, integer, jsonb, pgTable, timestamp } from 'drizzle-orm/pg-core';

/**
 * The primary key of the one `operator_settings` row, and the value
 * the table's CHECK pins `id` to.
 *
 * Exported because every writer has to name it: the column carries no
 * default and no sequence, so an insert states the id, and the
 * upsert that makes a first write and a rewrite one code path targets
 * it as its conflict key. A writer spelling its own `1` would be the
 * second declaration of the singleton, and the one that drifts.
 */
export const OPERATOR_SETTINGS_ID = 1;

/**
 * The `operator_settings.settings` payload: what an operator
 * configures about this deployment.
 *
 * Every member is optional and an empty object is a complete value,
 * for the reason `DomainSettings` in `./domains.ts` gives for its own
 * shape — an absent member means the default applies, so an
 * operator configures only what they want to differ and the column's
 * `{}` default is a real default rather than a placeholder waiting to
 * be filled in.
 *
 * The type is a compile-time claim and nothing more. `.$type<>()`
 * generates no constraint and drizzle validates no payload on the way
 * in, so a row written through hand-written SQL can hold a shape this
 * interface would reject. It is what readers program against and what
 * the app layer validates a write into, not a statement about what is
 * already stored.
 */
export interface OperatorSettings {
  /**
   * The domain a surface opens on when a request names none, by
   * `domains.slug`.
   *
   * The slug rather than the id because the slug is the domain's
   * natural key: it is what the seed upserts on and what every route
   * in the API addresses a domain by, while the id is a surrogate a
   * restore or a re-seed is free to move. Storing the id would leave
   * a preference that survives a reload of the same domain by name
   * and stops meaning anything after one by number.
   *
   * No foreign key reaches it — the value is inside a JSONB
   * payload, where no constraint does — so the app layer is the
   * whole of the enforcement, and it checks the slug names a domain
   * on the way IN. A slug left dangling by a later domain delete is
   * not corruption and is not repaired here: it reads as no default
   * being set, which is the state the operator is one write away from
   * either way.
   */
  readonly defaultDomainSlug?: string;

  /**
   * What a digest is rendered as when nothing nearer the request says
   * otherwise.
   *
   * Typed by the same tuple `export_subscriptions.format` is CHECKed
   * against, so the formats an operator may prefer and the formats a
   * subscription may be written with are one declaration read twice.
   * A format added to `EXPORT_FORMATS` in `./values.ts` reaches this
   * member in the same edit, and one removed reddens every reader
   * that named it.
   */
  readonly digestFormat?: ExportFormat;

  /**
   * Per-channel opt-in for the notifications this deployment sends,
   * keyed by channel kind. A missing key means off: a channel is
   * reached on an explicit `true` and on nothing else, so a channel
   * added to the process cannot start delivering on the strength of a
   * settings row written before it existed.
   *
   * Open on purpose, and structurally the `ChannelPreferences` of
   * `src/notifications/types.ts`. Deliberately declared here rather
   * than imported from there: the schema is the layer everything else
   * is built on, and a type import pointing up into a consumer would
   * invert that for a two-word alias. The two are held together by
   * this note and by the validator the settings route parses a write
   * through, not by the compiler.
   */
  readonly notificationChannels?: Readonly<Record<string, boolean>>;
}

export const operatorSettings = pgTable('operator_settings', {
  /**
   * The singleton key, always {@link OPERATOR_SETTINGS_ID}.
   *
   * `integer` and not `bigserial`: this id is not an identifier in
   * the sense the pipeline's other keys are — nothing
   * references it, nothing serializes it to an API surface, and it
   * numbers a set that can never hold more than one member. A
   * sequence here would hand out values the CHECK below refuses,
   * which is a generator whose every answer but the first is an
   * error.
   *
   * No default, deliberately. A write that omits the id is a write
   * that has not decided which row it is — and since there is
   * only one, deciding is free. Naming it is also what the upsert
   * needs: `ON CONFLICT (id)` has nothing to conflict on unless the
   * insert supplied it.
   */
  id: integer('id').primaryKey(),

  /**
   * The operator's configuration, shaped by {@link OperatorSettings}.
   *
   * `$type` is applied before the default so the default is checked
   * against the payload shape rather than merely narrowed to it
   * afterwards. It changes no DDL — the column is still `jsonb`
   * — and enforces nothing at runtime; see
   * {@link OperatorSettings} for what the annotation does and does
   * not claim.
   *
   * Defaults to an empty object rather than to null for the reason
   * `domains.settings` does: a configured-to-nothing deployment and a
   * not-yet-configured one are the same thing, so a null would buy no
   * distinction and would cost every reader a guard. It is also what
   * makes the row insertable before an operator has decided anything.
   */
  settings: jsonb('settings').$type<OperatorSettings>()
    .default({})
    .notNull(),

  /**
   * When the singleton was first written — which is to say when
   * this deployment was first configured, since the row is created by
   * the first write and by nothing else. No migration seeds it and no
   * bootstrap inserts it.
   */
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
    .notNull(),

  /**
   * Maintained by whoever writes the row, on the rule the rest of
   * this schema follows and for the same reason: there is no trigger
   * and no drizzle `$onUpdate` behind it, because a hook that fires
   * on the schema path and not on hand-written SQL leaves a column
   * that is stale exactly when it is consulted. The upsert behind
   * `PUT /settings` sets it in its `DO UPDATE`.
   */
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
    .notNull(),
}, (table) => [
  /**
   * What makes the table a singleton rather than a convention.
   *
   * A second row would not raise anything by itself: two valid
   * configurations, both readable, and which one the deployment
   * behaves as depends on the order the reader's query happened to
   * return them in. The constraint turns that into a refused INSERT
   * at the moment the second write is attempted, where it is
   * attributable to the writer that made it.
   *
   * Named rather than left to drizzle's derivation, for the reason
   * the CHECKs in `./entities.ts` give: the static-SQL invariant
   * suite asserts the constraint reached the migration by grepping
   * for this name, and a column rename must not quietly move it.
   *
   * The bound is inlined rather than interpolated. A value
   * interpolated into a `sql` template reaches the migration file as
   * `$1`, a placeholder no statement ever binds, so
   * {@link OPERATOR_SETTINGS_ID} is spelled into the SQL through
   * `inlineParams()` and stays the one declaration of the id.
   */
  check(
    'operator_settings_singleton_check',
    sql`${table.id} = ${OPERATOR_SETTINGS_ID}`.inlineParams(),
  ),
]);
