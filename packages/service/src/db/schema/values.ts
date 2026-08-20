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
 * {@link DEFAULT_VERDICT_VOCABULARY} is the one export that is not
 * such a set. It is the starting value of a per-domain setting rather
 * than a domain any column is constrained to, and it lives here because
 * it is the same kind of thing to reach for — the vocabulary of a
 * stored column. Splitting it out would only hide that one of them is
 * open.
 *
 * {@link checkOneOf} is the mechanism the first paragraph relies on. It
 * renders a tuple into the CHECK its column carries, which is what makes
 * "one declaration read two ways" something the code does rather than
 * something a convention asks for: every value-set CHECK in the schema
 * is generated from the tuple beside it, and none is restated in SQL.
 *
 * Nothing here is a table, which is why this module stays out of the
 * `./schema.js` barrel: the barrel is the table set drizzle-kit reads,
 * and it would find no table in this file. The schema modules whose
 * CHECK constraints are built from these tuples import it directly, as
 * does any app-layer consumer that needs the same union.
 */
import type { AnyPgColumn, CheckBuilder } from 'drizzle-orm/pg-core';

import { sql } from 'drizzle-orm';
import { check } from 'drizzle-orm/pg-core';

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
 * How a `sources` row's payload reaches the pipeline: fetched from an
 * address (`url`), from a structured endpoint (`api`), from a feed
 * (`rss`), or not fetched at all (`push`).
 *
 * `push` is what makes the set four rather than three: it is the one
 * kind the pipeline never polls, so its row's endpoint names where a
 * payload lands rather than what to request. An adapter selected for a
 * row has to know which of the two it is holding.
 *
 * The same four values are the domain of the `sources.kind` column and
 * of the `SourceKind` union `src/sources/index.ts` exports for adapter
 * selection. Declaring them here once is what keeps those two readings
 * the same set: written out twice they drift in a direction neither
 * side reports — a stored row whose `kind` the union cannot name has
 * no adapter that can be selected for it, and a member the column
 * refuses can never be reached from stored data at all.
 *
 * It is also the one set whose union is not declared beside it: that
 * union already has a home in the adapter contract, next to the
 * interface whose `kind` property it types.
 */
export const SOURCE_KINDS = ['url', 'api', 'rss', 'push'] as const;

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

/**
 * The verdict vocabulary a domain starts with when it does not name its
 * own: an operator's ruling on a finding, ordered `avoid` through
 * `interested`.
 *
 * The one value set here that is not closed, and that is the point of
 * it. Verdict strings are validated at the app layer against the owning
 * domain's `settings`, so no CHECK constrains `finding_labels.verdict`
 * — the column is plain NOT NULL text. A domain judging its findings on
 * some other axis renames the whole ladder in a row it already owns,
 * where a CHECK would make that a migration and would fix in DDL what
 * is meant to be a setting.
 *
 * No union type is derived from it, for the same reason: a `Verdict`
 * union would re-close on the code side what the column deliberately
 * leaves open, and every consumer written against it would then reject
 * the verdicts of any domain that had exercised its own vocabulary. The
 * `readonly string[]` annotation follows from what this is checked
 * against — a stored string chosen elsewhere — because a literal tuple
 * narrows `.includes` to its own members and refuses the one call the
 * constant exists for.
 *
 * The seed writes these four into the example domain's settings; the
 * stored vocabulary is the authority from then on. This is the value a
 * domain starts from, not a floor under it.
 */
export const DEFAULT_VERDICT_VOCABULARY: readonly string[] = ['avoid', 'caution', 'neutral', 'interested'];

/**
 * Builds the CHECK constraint that pins a column to one value set,
 * enumerating the set in the generated SQL — a `terms.polarity` built
 * from {@link TERM_POLARITIES} renders as
 * `CHECK ("terms"."polarity" in ('positive', 'negative', 'ignore'))`.
 *
 * Every value-set CHECK in the schema goes through here so that the
 * constraint and the union are the same declaration read twice. Written
 * out by hand beside its tuple a CHECK is the second declaration this
 * module exists to prevent, and it is the half that drifts silently: a
 * member added to the tuple type-checks at every call site while the
 * column goes on refusing it, and nothing reports the disagreement
 * until a row is inserted.
 *
 * The values are inlined as escaped literals rather than left as bound
 * parameters, because this SQL is read at generate time by drizzle-kit
 * and written into a migration file, not executed against a session: a
 * parameter would serialize as `$1` and the migration would carry a
 * placeholder no statement ever binds. The escaping is drizzle's own
 * dialect routine, so a quote inside a value cannot close the literal.
 *
 * @param name - Constraint name. This is what the constraint is
 *   greppable by in the generated SQL, so the static-SQL invariant
 *   suite can assert the constraint is present by naming it.
 * @param column - The column to constrain, as handed to the table's
 *   extra-config callback.
 * @param values - The value set, normally one of this module's tuples.
 *   Typed non-empty because `in ()` is not valid SQL and an empty set
 *   would otherwise surface as a syntax error at `db:migrate`, a
 *   migration away from the call that passed it.
 */
export function checkOneOf(
  name: string,
  column: AnyPgColumn,
  values: readonly [string, ...string[]],
): CheckBuilder {
  const literals = values.map((value) => sql`${value}`);

  return check(name, sql`${column} in (${sql.join(literals, sql`, `)})`.inlineParams());
}
