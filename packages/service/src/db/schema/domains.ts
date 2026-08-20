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
import { bigserial, integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * The declared type of one field in a domain's field contract.
 *
 * A closed set of six, kept small because every member has to be
 * checkable by the validator and renderable by whatever surface edits
 * a contract. `datetime` is separate from `string` because JSON has no
 * date type of its own: without the distinction a stored timestamp is
 * indistinguishable from free text, and neither a validator nor an
 * editor can treat it as a date.
 *
 * Deliberately not one of `./values.ts`'s tuples. Those are the
 * domains of COLUMNS, and each is generated into the CHECK that
 * enforces it; this set constrains a field inside a JSONB payload,
 * where no CHECK reaches and the app layer is the whole of the
 * enforcement.
 */
export type DomainFieldType =
  | 'string'
  | 'boolean'
  | 'number'
  | 'datetime'
  | 'list'
  | 'object';

/**
 * One entry of a domain's field contract: what a `findings.fields` key
 * holds, and whether a finding has to carry it at all.
 */
export interface DomainFieldSpec {
  /** What the field holds. */
  readonly type: DomainFieldType;
  /**
   * Whether a finding must carry the field. Absent means it may be
   * missing, so the cheapest contract to write is the permissive one
   * and a field the domain cannot do without has to say so.
   */
  readonly required?: boolean;
}

/**
 * The `domains.settings` payload: what a domain configures about
 * itself. Every member here would otherwise be a column, a constant
 * inside a scorer, or a branch keyed on which subject is being
 * researched — which is what makes a second domain a row rather than a
 * migration.
 *
 * Every member is optional and an empty object is a complete value.
 * That is what makes the column's `{}` default a real default rather
 * than a placeholder waiting to be filled in: an absent member means
 * the pipeline's own default applies, so a domain configures only what
 * it wants to differ.
 *
 * The type is a compile-time claim and nothing more. `.$type<>()`
 * generates no constraint and drizzle validates no payload on the way
 * in, so a row written through hand-written SQL — which the pipeline
 * does — can hold a shape this interface would reject. It is what
 * readers program against and what the app layer validates a write
 * into, not a statement about what is already stored.
 */
export interface DomainSettings {
  /**
   * Per-signal weights a finding's score is combined from, keyed by
   * signal name. Open on purpose: the signals one domain scores on are
   * not the signals another does, so a closed set here would be the
   * per-subject code this column exists to hold instead.
   *
   * Stored rather than compiled in because a weight is the part of
   * scoring most likely to be tuned, and tuning it should not be a
   * deploy. The arithmetic that consumes them arrives with the scoring
   * port in phase 5.
   */
  readonly scoringWeights?: Readonly<Record<string, number>>;

  /**
   * The verdicts an operator may label this domain's findings with,
   * ordered. A domain naming none is judged against the default
   * ladder, `DEFAULT_VERDICT_VOCABULARY` in `./values.ts`, which the
   * seed writes here for the example domain.
   *
   * This is the setting `finding_labels.verdict` carries no CHECK for.
   * A domain that judges its findings on some other axis renames the
   * whole ladder in a row it already owns, where a CHECK would make
   * that a migration.
   */
  readonly verdictVocabulary?: readonly string[];

  /**
   * The validation schema for a finding's `fields` JSONB payload,
   * keyed by the field name each entry constrains. A record rather
   * than a list because the key is the entry's identity: one spec per
   * field falls out of the shape instead of needing a duplicate check,
   * and a validator looks a field up rather than scanning for it.
   *
   * This is what lets one `findings` table serve every domain. The
   * core columns are neutral and mean the same thing everywhere;
   * everything a domain needs beyond them goes in the payload this
   * contract governs.
   */
  readonly fieldContract?: Readonly<Record<string, DomainFieldSpec>>;

  /**
   * What this domain calls a finding when one is shown to a person: a
   * heading in the UI, a title in an export. The single alias a domain
   * is given, and it reaches rendering and nothing else — the table
   * stays `findings`, and so do its columns, the queries, the API
   * fields and every identifier in the code.
   *
   * Nothing joins on a label, which is why this alias costs nothing;
   * one that reached a table or column name would fork the schema per
   * domain. `documents` and `entities` have no alias at all. See
   * `docs/architecture/00-overview.md` for the rule in full.
   */
  readonly findingsDisplayName?: string;
}

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
   * Per-domain configuration, shaped by {@link DomainSettings}:
   * scoring weights, the verdict vocabulary findings are labelled
   * against, the field contract a domain's `findings.fields` payload
   * is validated under, and the one display alias a domain is given.
   *
   * `$type` is applied before the default so the default is checked
   * against the payload shape rather than merely narrowed to it
   * afterwards. It changes no DDL — the column is still `jsonb` — and
   * enforces nothing at runtime; see {@link DomainSettings} for what
   * the annotation does and does not claim.
   *
   * Defaults to an empty object rather than to null so that every
   * reader faces one shape. A configured-to-nothing domain and a
   * not-yet-configured one are the same thing here — absent settings
   * mean the defaults apply — so a null would buy no distinction and
   * would cost every caller a guard.
   */
  settings: jsonb('settings').$type<DomainSettings>()
    .default({})
    .notNull(),

  /**
   * The feature-vector version this domain's stored vectors are
   * expected to be at: the pin a document's own `feature_version` is
   * read against to tell a current vector from a stale one.
   *
   * Versioned per domain rather than once in the featurizer, because
   * a domain's own taxonomy supplies most of what the vector
   * measures — a term's weight, whether a category exists at all, the
   * column position a one-hot occupies. Edit one domain's terms and
   * every vector already stored for it means something slightly
   * different while nothing has moved for any other domain. A single
   * global version would have to bump for all of them, which either
   * discards vectors that were still comparable or teaches everyone
   * to ignore the bump.
   *
   * NULL means this domain has never been featurized. Absent, not
   * zero: 0 is a version like any other, and writing it here would
   * claim a vector computed under a scheme that never existed.
   *
   * Nothing writes or reads the column yet. Version pinning against
   * it — reading a stored vector's version against the domain's,
   * recomputing what differs, bumping when a taxonomy edit moves the
   * numbers under a vector already stored — arrives with the feature
   * port in phase 4.
   */
  featureVersion: integer('feature_version'),

  /**
   * The embedding model this domain's stored vectors were produced
   * by, recorded as the embedder REPORTED it rather than as whatever
   * configuration said it would be. A vector is only comparable to
   * another from the same model, and a similarity computed across two
   * of them is wrong in a way nothing raises: the arithmetic succeeds
   * and the number means nothing.
   *
   * Free text rather than one of `./values.ts`'s tuples. Those are
   * closed sets the schema is entitled to fix; which models exist is
   * a fact about a deployment, so a CHECK here would make trying one
   * a migration, and the value has to be able to record a model the
   * schema has never heard of.
   *
   * NULL means this domain has never been embedded — the same
   * absence `feature_version` encodes, for the other half of the
   * pin. Version pinning against it, re-embedding what a model
   * change left behind, arrives with the feature port in phase 4
   * alongside it.
   */
  embeddingModel: text('embedding_model'),

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
