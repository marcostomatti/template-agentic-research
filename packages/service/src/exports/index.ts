/**
 * @packageDocumentation
 * Export renderers — the contract every module in this directory satisfies.
 *
 * Type-only in phase 1: no renderer ships yet (they arrive in phase 6), so
 * this file pins the shape they conform to and nothing else. A renderer
 * turns one domain's findings into artifacts and stops there; delivering an
 * artifact — writing it to a configured path, pushing it to a bucket,
 * sending it — belongs to whoever ran the export subscription, never to the
 * renderer.
 */

/**
 * The export formats a subscription can be rendered into.
 *
 * These five values are the same domain the schema-v2 `export_subscriptions`
 * format column accepts (phase 2), and the two sides have to stay in step. A
 * stored subscription whose format this union cannot name has no renderer
 * that can be selected for it; a member added here with no matching column
 * value can never be reached from stored data.
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
 * Everything a renderer is given: which domain, and what to render.
 *
 * Both shapes are open records in phase 1 on purpose, for the same reason
 * `CanonicalDocument` is: the `domains` and findings columns are not settled
 * until schema v2 lands. **Phase 2 narrows them** to the stored row shapes,
 * ahead of the first real renderer in phase 6, so no renderer is ever
 * written against the open records.
 *
 * @typeParam Domain - The domain the findings belong to.
 * @typeParam Finding - One scored finding, as stored.
 */
export interface ExportRenderInput<
  Domain = Record<string, unknown>,
  Finding = Record<string, unknown>,
> {
  /** The domain this export belongs to, carrying its display vocabulary. */
  readonly domain: Domain;
  /** The findings to render, in the order the caller selected them. */
  readonly findings: readonly Finding[];
}

/**
 * One export renderer: findings in, artifacts out.
 *
 * @typeParam Domain - The domain shape {@link ExportRenderInput} carries.
 * @typeParam Finding - The finding shape {@link ExportRenderInput} carries.
 */
export interface ExportRenderer<
  Domain = Record<string, unknown>,
  Finding = Record<string, unknown>,
> {
  /** The format this renderer produces. One renderer per format. */
  readonly format: ExportFormat;
  /**
   * Renders the input into zero or more artifacts. Pure — no I/O, no
   * network, and nothing written anywhere.
   */
  render(input: ExportRenderInput<Domain, Finding>): ExportArtifact[];
}
