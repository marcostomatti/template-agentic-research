/**
 * @packageDocumentation
 * The closed value sets schema v2 constrains columns to, declared once.
 *
 * Each set is an `as const` tuple paired with the union type derived
 * from it, so the union a caller programs against and the CHECK the
 * database enforces are two readings of one declaration. Written out
 * separately they are two declarations of one fact, and they drift in
 * the direction that fails quietly: the code still type-checks against
 * a value the column refuses, and nothing notices until the insert.
 *
 * Nothing here is a table, which is why this module stays out of the
 * `./schema.js` barrel: the barrel is the table set drizzle-kit reads,
 * and it would find no table in this file. The schema modules whose
 * CHECK constraints are built from these tuples import it directly, as
 * does any app-layer consumer that needs the same union.
 */

/**
 * How a `terms` row's match moves the score of the document it matched:
 * `positive` toward relevant, `negative` away from it, each by the
 * row's own weight.
 *
 * `ignore` is the state a two-value set cannot express — a pattern
 * deliberately given no weight. Storing it keeps a match known to carry
 * no signal visible as a decision that was taken, rather than as an
 * absence indistinguishable from an oversight.
 */
export const TERM_POLARITIES = ['positive', 'negative', 'ignore'] as const;

/** One member of {@link TERM_POLARITIES}; the `terms.polarity` domain. */
export type TermPolarity = (typeof TERM_POLARITIES)[number];

/**
 * The families of external service a `connectors` row can front, each
 * row carrying its own endpoint and credentials in its `config`.
 *
 * `export_target` is the destination half of an export: an
 * `export_subscriptions` row names a format and the connector the
 * rendered artifact is handed to.
 */
export const CONNECTOR_KINDS = ['llm', 'search', 'notebook', 'export_target'] as const;

/** One member of {@link CONNECTOR_KINDS}; the `connectors.kind` domain. */
export type ConnectorKind = (typeof CONNECTOR_KINDS)[number];

/**
 * What an `export_subscriptions` row renders; the format string selects
 * one renderer.
 *
 * `email_draft` is named for what it produces. The pipeline writes a
 * draft artifact and stops — dispatch is the service layer's job, behind
 * its own approval gate — so no member of this set sends anything.
 * Obsidian export is one-way to a configured path and RSS is static file
 * generation rather than a served feed, for the same reason: an export
 * writes an artifact, it does not open a channel of its own.
 */
export const EXPORT_FORMATS = ['obsidian_md', 'notion_md', 'rss', 'pdf', 'email_draft'] as const;

/**
 * One member of {@link EXPORT_FORMATS}; the `export_subscriptions.format`
 * domain.
 */
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

/**
 * Whether a `documents` row's payload parsed under its source's
 * contract.
 *
 * The pair is what makes fail-flag-keep expressible: a document whose
 * parse fails is stored as `failed` with its error rather than dropped,
 * so a source whose shape has drifted leaves evidence of the drift
 * instead of a silence that reads the same as a quiet day.
 */
export const DOCUMENT_PARSE_STATUSES = ['ok', 'failed'] as const;

/**
 * One member of {@link DOCUMENT_PARSE_STATUSES}; the
 * `documents.parse_status` domain.
 */
export type DocumentParseStatus = (typeof DOCUMENT_PARSE_STATUSES)[number];

/**
 * Where a `research_pool` row stands in the approval gate: `pending`
 * until it is ruled on, then `approved` and `done` along the accepted
 * path, or `skipped` when it is refused.
 *
 * The status is the operator-facing account of the row, not the gate
 * itself — a status column can be set to whatever a writer likes. What
 * enforces the gate is the CHECK over `approved_at`/`researched_at`.
 */
export const RESEARCH_POOL_STATUSES = ['pending', 'approved', 'done', 'skipped'] as const;

/**
 * One member of {@link RESEARCH_POOL_STATUSES}; the
 * `research_pool.status` domain.
 */
export type ResearchPoolStatus = (typeof RESEARCH_POOL_STATUSES)[number];

/**
 * Who set the `next_run_at` a `runs` row fired against: the dispatcher's
 * default increment (`interval`), the research agent proposing a time
 * within the schedulable row's min/max bounds (`agent`), or a person
 * setting it by hand (`operator`).
 *
 * Recorded per run because `next_run_at` is the single scheduling truth
 * and it is overwritten every pass: without the attribution, a run that
 * fired early looks exactly like one whose interval was rewritten.
 */
export const RUN_SCHEDULERS = ['interval', 'agent', 'operator'] as const;

/** One member of {@link RUN_SCHEDULERS}; the `runs.scheduled_by` domain. */
export type RunScheduler = (typeof RUN_SCHEDULERS)[number];
