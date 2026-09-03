/**
 * @packageDocumentation
 * The shapes the fixture data layer speaks, mirroring schema v2.
 *
 * Every interface below names the `packages/service/src/db/schema`
 * table it stands for. The app has no backend yet — a later wave
 * swaps the accessors in `./api.ts` for real requests — so the value
 * of writing these against the stored schema rather than against
 * whatever each page happens to render is that the swap changes one
 * module. A page built on an invented shape would have to be
 * rewritten instead.
 *
 * These are REDECLARATIONS, not imports. `@ar/web` does not depend on
 * `@ar/service` and should not: the two are joined by HTTP, not by a
 * type import, and taking a build dependency on the service to borrow
 * a union would make the app unbuildable without it. The cost is that
 * nothing mechanically holds the two in step — a column renamed in the
 * schema leaves this file type-checking against a name that no longer
 * exists. The TSDoc naming each table is what makes that drift
 * findable, so keep it accurate when editing.
 *
 * Three conventions run through the whole file:
 *
 * - A nullable column is `T | null`, never an optional member. NULL is
 *   a value the schema stores and reasons about — `findings.score` is
 *   nullable precisely so an unscored finding is distinguishable from
 *   one scored to zero — and an optional member would collapse that
 *   into "the fixture author forgot".
 * - A `timestamp with time zone` is an {@link IsoTimestamp}, because a
 *   string is what a JSON API hands back and what the fixtures are
 *   standing in for. A `Date` here would be a shape the API swap could
 *   never produce.
 * - Ids are `number`, mirroring the schema's `bigserial` columns read
 *   in drizzle's `number` mode, and rows reference each other by id
 *   the way the tables do. Slugs are the natural keys an operator and
 *   a URL use; the accessors in `./api.ts` are scoped by slug and
 *   resolve to ids the way the seed loader does.
 *
 * Some tables are mirrored NARROWLY: where a table carries columns no
 * surface in this shell renders — feature vectors, embeddings, parser
 * contracts — the interface leaves them out and says so, rather than
 * carrying dead weight a fixture author would have to invent values
 * for. Each omission is named on the type that makes it.
 *
 * There is no colocated test file, deliberately: this module declares
 * types and one constant and holds no logic to exercise. Every other
 * module in `./` is a pure module and ships with one.
 */

import type { SidebarWeekSummaryProps } from '@ar/ui';

/**
 * An instant, ISO-8601 with an explicit UTC offset — the wire form of
 * a `timestamp with time zone` column.
 *
 * Full timestamps rather than date-only strings: `@ar/ui`'s `DateInput`
 * accepts both, but it reads a date-only string as LOCAL midnight, so
 * the same fixture would render a different relative time depending on
 * the machine showing it.
 */
export type IsoTimestamp = string;

/**
 * The reference clock every fixture is dated against, and the `now`
 * every relative-time render is passed.
 *
 * `FormattedRelativeTime` defaults to the wall clock and its own TSDoc
 * requires tests to pass a fixed `now`. Fixtures dated against the
 * real clock would age: a document written as "2 hours ago" reads as
 * "3 months ago" a quarter later, and any e2e assertion on that text
 * passes until it silently stops. So the fixtures are dated against
 * this constant and the shell passes it wherever a relative time is
 * rendered, which makes the rendered strings a property of the data
 * rather than of the day the suite ran.
 *
 * The instant itself is arbitrary but not accidental: a mid-week
 * afternoon, so a week summary has days on both sides of it and the
 * relative ladder has today, yesterday and last week all reachable
 * from fixtures dated a plausible distance back.
 */
export const FIXTURE_NOW: IsoTimestamp = '2026-06-11T14:30:00.000Z';

/**
 * How a `terms` row's match moves a score: toward relevant, away from
 * it, or not at all.
 *
 * Mirrors `TERM_POLARITIES` in `packages/service/src/db/schema/values.ts`,
 * the tuple the `terms.polarity` CHECK is generated from. `ignore` is
 * the member that makes the set three rather than two — a pattern
 * deliberately given no weight, kept visible as a decision rather than
 * as an absence.
 */
export type TermPolarity = 'positive' | 'negative' | 'ignore';

/**
 * How a `sources` row's payload reaches the pipeline.
 *
 * Mirrors `SOURCE_KINDS` in `packages/service/src/db/schema/values.ts`.
 * `push` is the one kind nothing polls: its row's endpoint names where
 * a payload lands rather than what to request.
 */
export type SourceKind = 'url' | 'api' | 'rss' | 'push';

/**
 * The family of external service a `connectors` row fronts.
 *
 * Mirrors `CONNECTOR_KINDS` in
 * `packages/service/src/db/schema/values.ts`. `export_target` is the
 * destination half of an export — an {@link ExportSubscription} names
 * a format and the connector the rendered artifact is handed to.
 */
export type ConnectorKind = 'llm' | 'search' | 'notebook' | 'export_target';

/**
 * What an `export_subscriptions` row renders.
 *
 * Mirrors `EXPORT_FORMATS` in
 * `packages/service/src/db/schema/values.ts`. No member sends
 * anything: `email_draft` writes a draft and stops, and delivery is
 * the service layer's job behind its own approval gate.
 */
export type ExportFormat =
  | 'obsidian_md'
  | 'notion_md'
  | 'rss'
  | 'pdf'
  | 'email_draft';

/**
 * Whether a `documents` row's payload parsed under its source's
 * contract.
 *
 * Mirrors `DOCUMENT_PARSE_STATUSES` in
 * `packages/service/src/db/schema/values.ts`. The pair is what makes
 * fail-flag-keep visible: a document that failed to parse is stored
 * with its error rather than dropped, so a source whose shape has
 * drifted leaves evidence instead of a silence that reads like a quiet
 * day.
 */
export type DocumentParseStatus = 'ok' | 'failed';

/**
 * The declared type of one field in a domain's field contract.
 *
 * Mirrors `DomainFieldType` in
 * `packages/service/src/db/schema/domains.ts`. `datetime` is separate
 * from `string` because JSON has no date type of its own, and without
 * the distinction an editor cannot treat a stored timestamp as a date.
 */
export type DomainFieldType =
  | 'string'
  | 'boolean'
  | 'number'
  | 'datetime'
  | 'list'
  | 'object';

/**
 * One entry of a domain's field contract: what a {@link Finding}'s
 * `fields` key holds, and whether a finding has to carry it.
 *
 * Mirrors `DomainFieldSpec` in
 * `packages/service/src/db/schema/domains.ts`. `required` is optional
 * and absent means the field may be missing, so the cheapest contract
 * to write is the permissive one.
 */
export interface DomainFieldSpec {
  /** What the field holds. */
  readonly type: DomainFieldType;
  /** Whether a finding must carry the field; absent means no. */
  readonly required?: boolean;
}

/**
 * What a domain configures about itself — the payload of the
 * `domains.settings` JSONB column.
 *
 * Mirrors `DomainSettings` in
 * `packages/service/src/db/schema/domains.ts`. Every member is
 * optional and an empty object is a complete value: an absent member
 * means the pipeline's own default applies, which is what makes a
 * second domain a row rather than a migration.
 */
export interface DomainSettings {
  /**
   * Per-signal weights a finding's score is combined from, keyed by
   * signal name. Open on purpose — the signals one domain scores on
   * are not the signals another does.
   */
  readonly scoringWeights?: Readonly<Record<string, number>>;

  /**
   * The verdicts an operator may label this domain's findings with, in
   * order. A domain naming none is judged against the service's
   * `DEFAULT_VERDICT_VOCABULARY`.
   */
  readonly verdictVocabulary?: readonly string[];

  /**
   * The validation schema for a finding's `fields` payload, keyed by
   * the field name each entry constrains. This is what lets one
   * `findings` table serve every domain.
   */
  readonly fieldContract?: Readonly<Record<string, DomainFieldSpec>>;

  /**
   * What this domain calls a finding in a heading or an export. The
   * single alias a domain is given, and it reaches rendering and
   * nothing else — no alias reaches storage, a query or an identifier.
   */
  readonly findingsDisplayName?: string;
}

/**
 * One subject being researched — mirrors the `domains` table.
 *
 * The workspace level, and the row every other pipeline table hangs
 * off. In this app it is also the route base: the domain switcher
 * moves between `/` and `/d/<slug>`, so {@link Domain.slug} is the
 * string the URL carries and the key the accessors are scoped by.
 *
 * Narrowed: `feature_version` and `embedding_model` are left out.
 * They pin a domain's stored vectors against the scheme that produced
 * them, nothing in this shell renders them, and the schema records
 * that nothing reads them yet either.
 */
export interface Domain {
  /** `domains.id`. */
  readonly id: number;
  /**
   * `domains.slug` — the domain's natural key, unique, and the only
   * key here that is not safe to rename. It reaches the URL, so it is
   * the one field a fixture edit can break a bookmark with.
   */
  readonly slug: string;
  /** `domains.name` — operator-facing label, safe to rename. */
  readonly name: string;
  /** `domains.settings`; `{}` is a complete value. */
  readonly settings: DomainSettings;
  /** `domains.created_at`. */
  readonly createdAt: IsoTimestamp;
  /** `domains.updated_at`. */
  readonly updatedAt: IsoTimestamp;
}

/**
 * One piece of raw material a source produced — mirrors the
 * `documents` table.
 *
 * A document is what was fetched; a {@link Finding} is what one domain
 * made of it. The digest surface shows the second and cites the first.
 *
 * Narrowed: `raw`, `features`, `feature_version`, `embedding` and
 * `embedding_model` are left out. The first is the untouched payload
 * and the rest are the featurizer's own working state — pipeline
 * internals no surface in this shell renders, and values a fixture
 * author would have to invent a vector for.
 */
export interface Document {
  /** `documents.id`. */
  readonly id: number;
  /** `documents.domain_id` → {@link Domain.id}. */
  readonly domainId: number;
  /**
   * `documents.source_id` → {@link Source.id}. NULL where the document
   * did not come from a configured feed.
   */
  readonly sourceId: number | null;
  /**
   * `documents.hash` — the content hash, unique, and the key the one
   * row per distinct item stands on. Capturing the same item twice
   * lands on this row rather than adding a rival to it, so two fixture
   * documents sharing a hash is a contradiction rather than a
   * duplicate.
   */
  readonly hash: string;
  /**
   * `documents.url` — where the document can be read at its source,
   * when there is such a place. NULL means there is not (an ingested
   * file, a pasted body) and NEVER the empty string: `''` is a value,
   * and a reader handed it renders a link to nowhere.
   */
  readonly url: string | null;
  /** `documents.body` — the extracted text. */
  readonly body: string;
  /**
   * `documents.captured_at` — when the pipeline fetched it, which is
   * neither when its source published it nor when a finding was made
   * from it. {@link Finding.createdAt} records the latter.
   */
  readonly capturedAt: IsoTimestamp;
  /** `documents.parse_status`. */
  readonly parseStatus: DocumentParseStatus;
  /**
   * `documents.parse_error` — why the parse failed, kept beside the
   * document rather than instead of it. NULL when it parsed.
   */
  readonly parseError: string | null;
}

/**
 * What one domain made of one document — mirrors the `findings` table.
 *
 * The row the digest surface is a list of. Its shape is the split that
 * lets one table serve every domain: neutral columns that mean the
 * same thing everywhere, plus a {@link Finding.fields} payload the
 * owning domain's `fieldContract` governs.
 *
 * `verdict` is a DENORMALIZATION and the one member here that is not a
 * `findings` column — see its own note.
 */
export interface Finding {
  /** `findings.id`. */
  readonly id: number;
  /** `findings.domain_id` → {@link Domain.id}. */
  readonly domainId: number;
  /**
   * `findings.document_id` → {@link Document.id}. NOT NULL in the
   * schema because a finding is a reading OF something.
   */
  readonly documentId: number;
  /**
   * `findings.entity_id` → {@link Entity.id}. NULL where the finding
   * is not about a subject the domain tracks by name.
   */
  readonly entityId: number | null;
  /**
   * `findings.fields` — everything this domain needs beyond the
   * neutral columns, keyed by field name.
   *
   * Typed only as a record, which is as much as holds across every
   * domain: the keys come from the owning domain's
   * {@link DomainSettings.fieldContract}, which this type does not
   * carry. `{}` is a valid value.
   */
  readonly fields: Readonly<Record<string, unknown>>;
  /**
   * `findings.score` — what a digest orders by and a threshold filters
   * on. NULL means UNSCORED, and is not interchangeable with 0: a
   * finding scored to zero was read and found to match nothing the
   * domain weights, which is an ordinary outcome.
   */
  readonly score: number | null;
  /**
   * `findings.score_version` — which scoring version produced the
   * number above. NULL means never scored, the same absence `score`
   * encodes, which is why the two move together.
   */
  readonly scoreVersion: number | null;
  /**
   * The operator's current ruling on this finding, or NULL where
   * nobody has ruled.
   *
   * NOT a `findings` column: verdicts are rows in `finding_labels`,
   * which records who judged what and when. It is flattened onto the
   * finding here because every surface in this shell wants exactly one
   * — the digest's status badge and its verdict filter — and carrying
   * the label table to serve that would be a join the fixture layer
   * exists to avoid. The API has to answer the same way, so this is a
   * claim about the finding endpoint's payload, not a shortcut the
   * swap can drop.
   *
   * Deliberately `string` and not a union. The vocabulary is
   * per-domain ({@link DomainSettings.verdictVocabulary}), the schema
   * puts no CHECK on the column for that reason, and a union here
   * would re-close what the column leaves open and reject the verdicts
   * of any domain that had exercised its own ladder.
   */
  readonly verdict: string | null;
  /**
   * `findings.created_at` — when the finding was made, which is when a
   * document was read into one. Not when the document was captured.
   */
  readonly createdAt: IsoTimestamp;
}

/**
 * A subject a domain tracks by name — mirrors the `entities` table.
 *
 * What findings about the same thing are gathered under, so the same
 * subject seen in six documents is one row rather than six.
 */
export interface Entity {
  /** `entities.id`. */
  readonly id: number;
  /** `entities.domain_id` → {@link Domain.id}. */
  readonly domainId: number;
  /** `entities.name` — as written, for showing to a person. */
  readonly name: string;
  /**
   * `entities.name_norm` — the normalized name the row is resolved by,
   * unique within its domain. Never empty: a blank key would collapse
   * every unnameable subject onto one row per domain.
   */
  readonly nameNorm: string;
  /**
   * `entities.alias_of` → {@link Entity.id}. NULL says the row IS its
   * own subject, which is the ordinary state — an alias is the
   * exception, not a pointer every other row is missing. Resolution is
   * one hop; chains are not followed.
   */
  readonly aliasOf: number | null;
  /**
   * `entities.attributes` — whatever this domain records about a
   * subject beyond its name. Shape is the domain's business; `{}` is a
   * complete value.
   */
  readonly attributes: Readonly<Record<string, unknown>>;
}

/**
 * One bucket of a domain's taxonomy — mirrors the `categories` table.
 *
 * What {@link Term}s hang off, and what the lexicon surface renders one
 * card per.
 */
export interface Category {
  /** `categories.id`. */
  readonly id: number;
  /** `categories.domain_id` → {@link Domain.id}. */
  readonly domainId: number;
  /**
   * `categories.key` — the stable identifier the category is named by
   * from outside the table, unique within its domain. The seed upserts
   * on it.
   */
  readonly key: string;
  /** `categories.name` — operator-facing label, safe to rename. */
  readonly name: string;
  /**
   * `categories.parent_id` → {@link Category.id}, or NULL for a root.
   * NULL is the common case and the honest one: most taxonomies are
   * flat, and a root is not a category missing a parent. The service
   * caps nesting at one level with a trigger.
   */
  readonly parentId: number | null;
}

/**
 * One pattern a domain scores documents against — mirrors the `terms`
 * table.
 */
export interface Term {
  /** `terms.id`. */
  readonly id: number;
  /** `terms.category_id` → {@link Category.id}. */
  readonly categoryId: number;
  /**
   * `terms.pattern` — what the row looks for, as an operator wrote it.
   * How it is applied is the matcher's decision: patterns are matched
   * anchored, never bare.
   */
  readonly pattern: string;
  /**
   * `terms.weight` — how much a match is worth. MAGNITUDE only; the
   * direction is {@link Term.polarity}'s job and the sign written here
   * is not consulted, so no typo can invert a term. Authored rather
   * than measured, which is why it is not nullable: a term meant to
   * carry no signal says so with `ignore` polarity.
   */
  readonly weight: number;
  /** `terms.polarity`. */
  readonly polarity: TermPolarity;
  /**
   * `terms.notes` — why the term is here, for whoever meets the row
   * next. NULL means nobody wrote one, and nothing derives anything
   * from its absence.
   */
  readonly notes: string | null;
}

/**
 * A feed the pipeline is allowed to read — mirrors the `sources`
 * table.
 *
 * Configuration and not code: adding a feed is a row, and only a new
 * KIND of feed needs a module.
 *
 * Narrowed: `parser_config` and `contract` are left out. Both are the
 * parse engine's own configuration — how records are pulled out of a
 * payload and what that payload has to contain — and the sources
 * surface renders neither.
 *
 * Note there is no name column. A source is identified by its
 * {@link Source.endpoint}, which is what the sources table shows in
 * its first cell.
 */
export interface Source {
  /** `sources.id`. */
  readonly id: number;
  /** `sources.domain_id` → {@link Domain.id}. */
  readonly domainId: number;
  /** `sources.kind` — selects the adapter that reads the feed. */
  readonly kind: SourceKind;
  /**
   * `sources.endpoint` — what to request, or for a `push` source,
   * where a payload lands.
   */
  readonly endpoint: string;
  /**
   * `sources.cursor` — where the last fetch stopped. NULL means this
   * source has never been read, so the next pass starts from the
   * beginning rather than from nothing.
   */
  readonly cursor: string | null;
  /**
   * `sources.consecutive_failures` — a COUNTER, so zero is a reading
   * and not an absence: no failures is what a healthy source reports.
   * That is why it is not nullable, unlike {@link Finding.score}.
   */
  readonly consecutiveFailures: number;
  /**
   * `sources.last_success_at`. NULL means it has never succeeded.
   */
  readonly lastSuccessAt: IsoTimestamp | null;
  /**
   * `sources.last_failure_at`. NULL means it has never failed.
   */
  readonly lastFailureAt: IsoTimestamp | null;
  /** `sources.enabled` — whether the pipeline reads it at all. */
  readonly enabled: boolean;
  /**
   * `sources.flagged` — marked for an operator's attention. Distinct
   * from `enabled`: a flagged source is still read.
   */
  readonly flagged: boolean;
}

/**
 * The system text a domain gives one role — mirrors the `personas`
 * table.
 *
 * A persona is configuration of a DOMAIN, not of the pipeline: what a
 * researcher is asked to be is a property of the subject being
 * researched. A run reads these rows at the top of each execution, so
 * no prompt string lives in a workflow file — editing one is an
 * UPDATE rather than a rebuild and a redeploy.
 */
export interface Persona {
  /** `personas.id`. */
  readonly id: number;
  /** `personas.domain_id` → {@link Domain.id}. */
  readonly domainId: number;
  /**
   * `personas.role` — `researcher`, `scorer`, `drafter`. Unique per
   * domain, and deliberately free text rather than a union: the roles
   * a pipeline plays grow with the pipeline, and the service puts no
   * CHECK here for the same reason.
   */
  readonly role: string;
  /** `personas.system_text` — the text the role is given. */
  readonly systemText: string;
}

/**
 * An external service the pipeline calls — mirrors the `connectors`
 * table.
 *
 * The other half of the pipeline's edges: a {@link Source} is a feed it
 * READS, a connector is a service it CALLS.
 *
 * Note there is no domain id. Connectors are deployment-level and
 * shared across domains, which is why the accessors that return them
 * are the ones not scoped by a domain slug, and why deleting one that
 * still receives exports is refused rather than cascading.
 */
export interface Connector {
  /** `connectors.id`. */
  readonly id: number;
  /** `connectors.kind` — selects the client that talks to the row. */
  readonly kind: ConnectorKind;
  /**
   * `connectors.name` — which instance of that kind this is, unique
   * within the kind. Two model endpoints are rows of one kind told
   * apart by this.
   */
  readonly name: string;
  /**
   * `connectors.config` — the address and whatever else that kind of
   * client takes.
   *
   * In the service this column also holds whatever authenticates the
   * call. Fixtures carry REDACTED placeholders for any such value and
   * never a credential shape that could be mistaken for a real one:
   * these files are tracked, and the tools surface renders this
   * payload.
   */
  readonly config: Readonly<Record<string, unknown>>;
}

/**
 * The scheduling column set, mirroring `schedulableColumns()` in
 * `packages/service/src/db/schema/scheduling.ts`.
 *
 * Declared once and spread into every schedulable row for the reason
 * the service declares it once: a table carries the whole set or none
 * of it, because half of it is worse than neither — a row with an
 * interval and no due time repeats on a schedule nothing ever claims.
 */
export interface Schedulable {
  /**
   * `interval_seconds` — how long to wait between runs. Seconds in the
   * name because `interval` is a type name in Postgres.
   */
  readonly intervalSeconds: number;
  /**
   * `next_run_at` — when the row is next due, and the SINGLE
   * scheduling truth: every way a row can be scheduled is a write to
   * this one column. NULL means it is not scheduled, whatever its
   * interval says.
   */
  readonly nextRunAt: IsoTimestamp | null;
  /**
   * `enabled` — whether the row takes part in scheduling at all.
   * Disabling is not cancelling: the row keeps its configuration.
   */
  readonly enabled: boolean;
  /**
   * `min_interval_seconds` — the floor an agent-proposed interval is
   * clamped to. NULL means no floor of its own. The clamp is the
   * writer's, not the database's.
   */
  readonly minIntervalSeconds: number | null;
  /**
   * `max_interval_seconds` — the ceiling half of that clamp, so an
   * agent that keeps deferring a row cannot defer it out of sight.
   * NULL means nothing limits how far out a proposal may push it.
   */
  readonly maxIntervalSeconds: number | null;
}

/**
 * A standing delivery of a domain's material — mirrors the
 * `export_subscriptions` table.
 *
 * Format, destination and cadence in one row, so subscribing a domain
 * to a digest is an INSERT and asking what it currently receives is a
 * SELECT. No row sends anything on its own account: a format names an
 * artifact the pipeline writes and hands to its connector.
 */
export interface ExportSubscription extends Schedulable {
  /** `export_subscriptions.id`. */
  readonly id: number;
  /** `export_subscriptions.domain_id` → {@link Domain.id}. */
  readonly domainId: number;
  /** `export_subscriptions.format` — selects the renderer. */
  readonly format: ExportFormat;
  /**
   * `export_subscriptions.connector_id` → {@link Connector.id}, which
   * is where the rendered artifact is handed over. The connector is an
   * `export_target`.
   */
  readonly connectorId: number;
}

/**
 * A channel a notification can go out on.
 *
 * Mirrors the channel modules registered under
 * `packages/service/src/notifications/channels/`, which is a registry
 * rather than a column: nothing in schema v2 stores this set, so there
 * is no CHECK behind it and a fourth channel is a module.
 */
export type NotificationChannel = 'email' | 'push' | 'webhook';

/**
 * What a new digest subscription starts from, before an operator
 * changes it.
 *
 * Defaults for an {@link ExportSubscription}, not a stored row of their
 * own: the format is one of {@link ExportFormat} and the cadence is the
 * `interval_seconds` half of {@link Schedulable}.
 */
export interface DigestDefaults {
  /** The format a new subscription is created with. */
  readonly format: ExportFormat;
  /** The cadence a new subscription is created with, in seconds. */
  readonly intervalSeconds: number;
}

/**
 * The operator's own preferences — what the settings surface edits.
 *
 * MIRRORS NO TABLE, and that is worth stating plainly rather than
 * leaving to be discovered: schema v2 stores per-DOMAIN configuration
 * in `domains.settings` ({@link DomainSettings}) and stores nothing
 * per operator. Every member below is a preference this shell needs a
 * home for, named against what it would be stored against:
 *
 * - `defaultDomainSlug` is a `domains.slug`.
 * - `digest` is defaults for an `export_subscriptions` row.
 * - `notificationChannels` toggles the channel registry above.
 *
 * So this is the one type here the API swap cannot satisfy by pointing
 * at an existing endpoint — it needs somewhere to persist first, and
 * where that lands is a schema decision rather than a UI one. The
 * settings surface saves through `./api.ts`'s `saveSettings` into the
 * tab-local store in `./drafts.ts` for that reason, and says on the
 * page that what it keeps, it keeps for the life of the tab.
 */
export interface Settings {
  /**
   * Which domain the single-domain base (`/`) resolves to — the domain
   * an operator running one of them ever sees.
   */
  readonly defaultDomainSlug: string;
  /** What a new digest subscription starts from. */
  readonly digest: DigestDefaults;
  /**
   * Which channels notifications go out on. A record over the whole
   * channel union rather than a list of enabled ones, so a channel
   * that exists and is switched OFF is distinguishable from one this
   * deployment has never heard of.
   */
  readonly notificationChannels: Readonly<Record<NotificationChannel, boolean>>;
}

/**
 * This week's model spend, as the sidebar reports it.
 *
 * MIRRORS NO TABLE. It is an AGGREGATE over `llm_calls` in
 * `packages/service/src/db/schema/runs.ts` — that table records one
 * row per model call with its `est_tokens` and `called_at`, and this
 * is those summed over the current week. The limit is not stored
 * anywhere in schema v2 at all: nothing enforces a spend ceiling yet,
 * so the fixture supplies one and {@link SpendSummary.status} is a
 * reading of `used` against it rather than a flag some pipeline sets.
 *
 * Shaped to feed `SidebarWeekSummary` directly. `status` is pinned to
 * that component's own prop type rather than restated as a local
 * union, so a change to the component's tone vocabulary reddens
 * `check-types` here instead of drifting.
 *
 * `unit` is required here although the component defaults it. A
 * summary of an unnamed quantity is not a thing the fixture layer
 * should be able to express, and the default only exists so a caller
 * with tokens need not say so twice.
 */
export interface SpendSummary {
  /** Drives the pill's copy and tone. */
  readonly status: SidebarWeekSummaryProps['status'];
  /** Used this week, in {@link SpendSummary.unit}. */
  readonly used: number;
  /** The week's ceiling, in the same unit. */
  readonly limit: number;
  /** What is being counted — `tokens` for a model-spend summary. */
  readonly unit: string;
}
