/**
 * @packageDocumentation
 * Export renderers — the contract every module in this directory satisfies.
 *
 * Type-only still: the renderers land beside this file through phase 6,
 * and until they do it pins the shape they conform to and nothing else.
 * What phase 6 changed here is what the contract is written AGAINST —
 * the four members of {@link ExportRenderInput} are stored rows now,
 * not the open records this file carried while schema v2 was unsettled.
 * A renderer turns one domain's stored digest into artifacts and stops
 * there; delivering an artifact — writing it to a configured path,
 * pushing it to a bucket, sending it — belongs to whoever ran the
 * export subscription, never to the renderer.
 *
 * That is the send-free invariant, and this contract holds it by
 * construction: {@link ExportRenderer} has exactly one member, it returns
 * {@link ExportArtifact} values, and the shape leaves nowhere for a
 * dispatch call to live. The register in
 * `docs/architecture/01-invariants.md` carries the executor-side row; on
 * this side the type is the whole enforcement. A member that delivers —
 * `send`, `deliver`, `publish` — would put a send path back inside the
 * renderer layer, so no renderer grows one, whatever its format implies
 * about where the bytes end up.
 */

import type { DomainSettings } from '../db/schema/domains.js';

/**
 * The export formats a subscription can be rendered into.
 *
 * These five values are the same domain the schema-v2 `export_subscriptions`
 * format column accepts (phase 2), and the two sides have to stay in step. A
 * stored subscription whose format this union cannot name has no renderer
 * that can be selected for it; a member added here with no matching column
 * value can never be reached from stored data.
 *
 * `email_draft` is named for what it produces and nothing more: an email
 * export renders a draft artifact exactly like the other four, and nothing
 * here addresses, queues, or transmits it. Dispatch arrives later as a
 * service-layer capability behind its own approval gate, which is how the
 * pipeline executor stays send-free even once email subscriptions exist.
 */
export type ExportFormat =
  | 'obsidian_md'
  | 'notion_md'
  | 'rss'
  | 'pdf'
  | 'email_draft';

/**
 * One rendered file: bytes plus enough metadata to place them.
 *
 * `path` is relative to whatever destination the caller resolved for the
 * subscription — a renderer never learns an absolute path, so a rendered
 * artifact cannot name a location on the operator's machine.
 *
 * An artifact is a value, not an effect: it describes where bytes should
 * go without putting them there. The caller that resolved the destination
 * is the only thing that acts on one.
 */
export interface ExportArtifact {
  /** The format this artifact was rendered as. */
  readonly format: ExportFormat;
  /** Destination-relative path, including the filename. Never absolute. */
  readonly path: string;
  /** Media type of {@link ExportArtifact.body} (e.g. `'text/markdown'`). */
  readonly mediaType: string;
  /** The rendered content — text for every format but `pdf`. */
  readonly body: string | Uint8Array;
}

/**
 * The `domains` row a renderer is handed: who this export is for, and
 * what they call things.
 *
 * A SLICE of the table rather than the whole row, spelled the way
 * `CanonicalDocument` in `src/sources/index.ts` spells its own — each
 * member named for the drizzle property rather than for the SQL
 * column, so a row read through the ORM is handed straight in with no
 * field renaming in between for a mismatch to hide in.
 * `./index.test.ts` pins that assignability against the table itself
 * rather than leaving the mirror to the eye.
 *
 * The four columns left out are each somebody else's. `feature_version`
 * and `embedding_model` are the vector bookkeeping
 * `src/db/schema/domains.ts` argues at those columns, read by the
 * featurizer and by nothing that renders; `created_at` and `updated_at`
 * say when the domain was configured, which is not what a period came
 * to. A renderer given them could lay a fact about the workspace
 * beside a fact about the week, and nothing would report the mix.
 */
export interface ExportDomainRow {
  /** `domains.id`, the key every other row here hangs off. */
  readonly id: number;

  /**
   * `domains.slug`, the domain's natural key and the only stable name
   * it has. This is what an artifact path is built from — never
   * `name`, which is free text somebody may rename between two
   * renders of one subscription.
   */
  readonly slug: string;

  /** `domains.name`, the operator-facing label. Free text. */
  readonly name: string;

  /**
   * `domains.settings`, carrying the one member a renderer reads:
   * `findingsDisplayName`, what this domain calls a finding when one
   * is shown to a person. Typed as {@link DomainSettings} itself
   * rather than as a slice of it, because that interface is the
   * authority and a second copy here would be a second copy to drift.
   *
   * What it does NOT license is a renderer keyed on a domain. The
   * alias reaches headings and nothing else — the table stays
   * `findings`, and so do its columns and every identifier in the
   * code — so a renderer reads this to head a section and never to
   * decide what to render.
   */
  readonly settings: DomainSettings;
}

/**
 * The `briefings` row this export renders: what the period came to,
 * already written down.
 *
 * THE ONE INPUT CARRIED WHOLE. Every column is here, because the row
 * IS the digest — `src/db/schema/runs.ts` argues at the table that a
 * briefing is the account a PERSON reads, written once and stored
 * rather than assembled again by whichever surface happens to ask.
 * Slicing it would be this file deciding which half of that account
 * each format is allowed.
 *
 * It carries `domainId` as well as the domain beside it in
 * {@link ExportRenderInput}, which is redundancy on purpose: the two
 * are separate selections, so a caller that paired a briefing with the
 * wrong domain has said so in the input, where a case can read it,
 * rather than in a rendered artifact nobody re-reads.
 */
export interface ExportBriefingRow {
  /** `briefings.id`. */
  readonly id: number;

  /**
   * `briefings.domain_id`. NOT NULL there: a briefing cites the
   * taxonomy and the settings it was written under, so a row naming no
   * domain is a document nobody can read in context.
   */
  readonly domainId: number;

  /**
   * `briefings.run_id`, or null when no pass produced this row — one
   * written by hand, or backfilled from whatever a domain kept before
   * it had a pipeline. An ordinary state rather than a gap, which is
   * why the member is required-but-nullable rather than optional: the
   * NULL means something at the column, and an omitted key would leave
   * a renderer to decide which of the two it had been handed.
   */
  readonly runId: number | null;

  /**
   * `briefings.body`: the prose half, or null when the drafting step
   * answered nothing.
   *
   * NULL AND `''` ARE DIFFERENT and a renderer keeps them different.
   * The column is nullable precisely so that no text produced does not
   * read as a briefing that came to nothing, and a renderer writing an
   * empty heading for a NULL undoes that distinction at the last step
   * before a person sees it.
   */
  readonly body: string | null;

  /**
   * `briefings.payload`: the structured half — the ordering, the
   * sections, the per-section counts and the previous run's banner, as
   * `assembleDigest` in `src/lib/digest-assemble.ts` answered them.
   *
   * `unknown` rather than that module's `DigestAssembly`, matching the
   * column's own lack of a `$type` annotation. Nothing validates a
   * stored payload — the row may predate a member, or have been
   * written by hand — so a renderer narrows what it reads rather than
   * trusting a claim the database never made. Same position
   * `CanonicalDocument.raw` takes over `documents.raw`.
   */
  readonly payload: unknown;

  /**
   * `briefings.generated_at`: when the briefing was written.
   *
   * The closest thing the row has to a period, and the honest limit is
   * the column's own: no column holds the span a briefing covers, so
   * this stamp plus the writer's convention that a briefing is
   * generated at the end of what it covers is all a renderer has. A
   * format printing a period prints this and says which moment it is.
   */
  readonly generatedAt: Date;
}

/**
 * One `findings` row the pass selected, whole.
 *
 * Whole for a different reason than the briefing above is whole.
 * `briefings.payload`'s own column comment says a renderer handed
 * prose can only reproduce it, where one handed the counts, the ranges
 * and the ids a period selected can lay them out per format. Laying
 * them out is what these rows are for, so which columns a format needs
 * is that format's to decide and not this contract's.
 */
export interface ExportFindingRow {
  /** `findings.id`, and the last tiebreak in the digest's ordering. */
  readonly id: number;

  /** `findings.domain_id`; see {@link ExportBriefingRow.domainId}. */
  readonly domainId: number;

  /** `findings.document_id`: the document this was read out of. */
  readonly documentId: number;

  /** `findings.entity_id`, or null when the finding names none. */
  readonly entityId: number | null;

  /**
   * `findings.fields`: the per-domain payload, validated on the way in
   * against `DomainSettings.fieldContract` and against nothing on the
   * way out. An open record matching the column's own annotation —
   * the keys are the domain's, so no closed set describes them, and
   * this is the one place in the input where that is the right type
   * rather than the unnarrowed one this file used to have everywhere.
   */
  readonly fields: Readonly<Record<string, unknown>>;

  /**
   * `findings.score`, or null when the finding has not been scored.
   *
   * NULL IS NOT ZERO, and this is the member a renderer most easily
   * gets wrong. An unscored finding printed as a zero claims it was
   * read and found worthless. The digest's ordering already puts
   * absence LAST rather than lowest — `src/lib/digest-assemble.ts`
   * argues it at length — and a renderer that prints the number owes
   * the same distinction in what it prints.
   */
  readonly score: number | null;

  /**
   * `findings.score_version`, or null when nothing has scored this
   * row: which scheme produced the number beside it.
   */
  readonly scoreVersion: number | null;

  /** `findings.created_at`: the digest ordering's second tiebreak. */
  readonly createdAt: Date;
}

/**
 * The `export_subscriptions` row this render was dispatched for: which
 * standing request is being served.
 *
 * A SLICE, and the five columns left out are the schedulable set —
 * `interval_seconds`, `next_run_at`, `enabled`, `min_interval_seconds`
 * and `max_interval_seconds`. A renderer handed `next_run_at` is a
 * renderer able to lay a period out differently depending on when the
 * next one falls due, which is a schedule leaking into a document.
 * What the row is FOR here is identity: which subscription this
 * artifact answers, and where the caller is to hand it.
 *
 * Declared here rather than imported from `SubscriptionRecord` in
 * `src/subscriptions/store.ts`, which describes the same table for the
 * HTTP surface. The two halves do not import each other, on the rule
 * `src/sources/index.ts` states for its own pair: that record answers
 * what a caller may read and write under `/exports`, this one says
 * what a renderer is given, and one type serving both would hand each
 * surface the other's columns to explain.
 */
export interface ExportSubscriptionRow {
  /**
   * `export_subscriptions.id`: which standing request this render
   * answers. The surrogate key, not part of the natural one.
   */
  readonly id: number;

  /**
   * `export_subscriptions.domain_id`, one third of the row's natural
   * key. The same domain {@link ExportRenderInput.domain} carries, for
   * the reason the briefing's own `domainId` is here.
   */
  readonly domainId: number;

  /**
   * `export_subscriptions.format`: what this subscription renders, and
   * what selected the renderer holding this input.
   *
   * `string` rather than {@link ExportFormat}, which is what a SELECT
   * actually answers — the tuple is a CHECK in the database rather
   * than a union in the type system, so a row written before a member
   * was removed still reads back. `SubscriptionRecord.format` takes
   * the same view of the same column. The narrowing lives at the
   * selector and on {@link ExportRenderer.format}: a row whose format
   * no renderer is registered for never reaches a renderer at all, so
   * by the time this member is readable the narrowed form is already
   * the renderer's own.
   */
  readonly format: string;

  /**
   * `export_subscriptions.connector_id`: the `connectors` row that
   * receives the artifact.
   *
   * An id and never an address, which is what keeps a renderer from
   * learning one. Resolving it is the caller's step, after this call
   * has returned — see {@link ExportArtifact}, whose `path` is
   * relative for the same reason.
   */
  readonly connectorId: number;
}

/**
 * Everything a renderer is given: one domain's stored digest, the rows
 * it was made of, and the standing request being served.
 *
 * FOUR MEMBERS, EACH A STORED ROW, and nothing here generic. The two
 * members this interface used to have were open records
 * (`Record<string, unknown>`) while schema v2 was unsettled, on the
 * reasoning `CanonicalDocument` in `src/sources/index.ts` was one until
 * phase 2 narrowed it — and the comment here promised that same phase
 * would narrow these. No phase-2 task did. Phase 6 does, and it still
 * lands ahead of the first renderer rather than behind it, so nothing
 * under `src/exports/` is ever written against the open records.
 *
 * THE BRIEFING IS AN INPUT AND NOT A DERIVATION. It is the member a
 * reader is likeliest to take for redundant beside the findings, and
 * three things say otherwise.
 *
 * The prose half is not a function of the rows at all. `briefings.body`
 * holds what a model wrote, and `src/db/schema/runs.ts` says at the
 * table that producing it again is not on offer — a renderer
 * recomposing it would not be reproducing the briefing, it would be
 * writing a second one. It would also be a model call inside a render,
 * where {@link ExportRenderer.render} is pure.
 *
 * The structured half IS a function of the rows, and that is exactly
 * why it is computed once. `assembleDigest` in
 * `src/lib/digest-assemble.ts` fixes the ordering, the sections and the
 * per-section counts; `ar-digest` stores what it answered; every format
 * then renders that same structure. Four renderers each deriving it
 * are four chances to disagree about what a period came to, which is
 * the disagreement storing the row exists to prevent.
 *
 * And the findings are here anyway, which is what makes the pairing
 * worth having rather than merely safe: `briefings.payload` argues at
 * its own column that a renderer handed prose can only reproduce it,
 * where one handed the ids a period selected can lay them out per
 * format. So the briefing says what the period came to and the
 * findings are what a format lays out — two questions, two members.
 */
export interface ExportRenderInput {
  /** The domain this export belongs to, carrying its vocabulary. */
  readonly domain: ExportDomainRow;

  /** The stored digest this render is of. */
  readonly briefing: ExportBriefingRow;

  /**
   * The findings the digest pass selected, in the order the caller
   * selected them — which is the order `orderFindings` in
   * `src/lib/digest-assemble.ts` fixed, not one a renderer re-derives.
   * Every member of this row satisfies that module's `DigestFinding`,
   * so the two are one shape rather than two that happen to agree;
   * `./index.test.ts` pins it.
   */
  readonly findings: readonly ExportFindingRow[];

  /** The standing request this render answers. */
  readonly subscription: ExportSubscriptionRow;
}

/**
 * One export renderer: a stored digest in, artifacts out. The interface
 * is one method wide on purpose — artifacts are the renderer's whole
 * output channel, and a format that implies delivery (`email_draft`,
 * `rss`) is no exception to that.
 *
 * Not generic either, and it is the {@link ExportRenderInput} narrowing
 * that made the type parameters pointless rather than merely unused. A
 * renderer is reached by the format a stored row named, so nothing at
 * the call site knows which renderer answered; parameters every caller
 * had to leave at their defaults were describing a variation no
 * registry can express. `SourceAdapterRegistry` in
 * `src/sources/index.ts` reaches the same place from the other side,
 * about parameters that genuinely do vary.
 */
export interface ExportRenderer {
  /** The format this renderer produces. One renderer per format. */
  readonly format: ExportFormat;
  /**
   * Renders the input into zero or more artifacts. Pure — no I/O, no
   * network, and nothing written anywhere. The return value is the only
   * way anything leaves a renderer; nothing is written, uploaded, or sent
   * from inside this call.
   */
  render(input: ExportRenderInput): ExportArtifact[];
}
