/**
 * @packageDocumentation
 * The digest detail's model: what one finding says on its own, once a
 * row has been opened over the list it sits in.
 *
 * `./rows.ts` answers what a finding says as a TABLE ROW — six cells,
 * every one of them narrowed to fit a column. This module answers the
 * other question the same finding raises: what the pipeline actually
 * recorded, and where it came from. The two overlap in exactly one
 * place, the source reading, and that overlap is a shared function
 * rather than a second derivation — see {@link readSourceLabel}, which
 * this imports for the reason its own docblock now gives.
 *
 * It lives beside `./DigestDetailModal.tsx` rather than in it because
 * the node unit suite collects `src/**` `.ts` and reaches no `.tsx` at
 * all: a decision written into the modal is reachable by no test in
 * this package. Nothing here renders, imports React or reads a clock,
 * which is the arrangement `./rows.ts`, `./actions.ts` and
 * `./timeWindow.ts` are all in.
 *
 * ## Total, never throwing
 *
 * Every lookup below tolerates a miss, for the reason `./rows.ts`
 * gives at length: the reads behind a detail arrive separately and
 * will one day arrive over HTTP from possibly different commits of the
 * service. A finding whose document has not arrived says it has an
 * unknown source and shows no excerpt; it does not take the modal
 * down. {@link readFieldValue} extends that to the payload itself —
 * `JSON.stringify` throws on a circular value and answers `undefined`
 * for a function, and a detail view is the last place that should be a
 * blank screen.
 *
 * ## The payload is shown whole, minus what this shell wrote
 *
 * {@link detailFields} lists the domain's own keys in payload order
 * and drops nothing else. The summary is left IN even though the
 * modal's header also names the finding by it: the header names the
 * row and the block is the record, and a payload viewer that quietly
 * omitted a key would be worse than a redundant line — an operator
 * comparing this against what the pipeline stored has no way to know
 * which keys were hidden.
 *
 * The one exception is the keys this shell reserves, recognised
 * through `./actions.ts`'s {@link isShellField} rather than by a list
 * kept here. `./actions.ts` reserves them and owns the convention, and
 * a stand-in this shell keeps on a row would read in this block as a
 * field the domain has never heard of — which is exactly the confusion
 * the colon namespace exists to prevent.
 *
 * ## Which array stance this module is in
 *
 * Everything below answers READONLY arrays, the stance `./rows.ts`
 * takes and the opposite of `./actions.ts`'s option builder. Nothing
 * here feeds a `@ar/ui` prop declared mutable: the field list is
 * mapped straight into markup, so a mutable return would be an
 * invitation with no caller.
 */

import type {
  Document,
  Finding,
  IsoTimestamp,
  Source,
} from '../../data/types';

import { isShellField } from './actions';
import { SUMMARY_FIELD, readSourceLabel } from './rows';

/**
 * How much of a document's text the excerpt shows.
 *
 * A modal panel is 620px at its widest and the excerpt shares it with
 * a stat rail, so this is about four short paragraphs' worth — enough
 * to recognise the item a finding was read from, and well short of
 * turning a detail view into a reader.
 *
 * No seeded document comes close: the longest fixture body is about a
 * sixth of this, so the truncating branch is unreachable from the app
 * as it stands and is driven directly by the colocated tests. That is
 * a property of the seed rather than of the limit, and it stops being
 * true the first time a real capture lands behind this seam.
 */
export const EXCERPT_LIMIT = 640;

/**
 * What marks an excerpt as shorter than the text it came from.
 *
 * The single character rather than three dots: it is one glyph to a
 * screen reader and to a line-length measurement alike, and the rest
 * of this shell already spells it this way.
 */
export const EXCERPT_ELLIPSIS = '…';

/**
 * What a value that cannot be written out reads as.
 *
 * Not an empty string, which would draw a field that looks absent
 * beside one that is genuinely empty. See the header on why
 * `JSON.stringify` has answers this has to cover at all.
 */
export const UNREADABLE_FIELD_VALUE = 'unreadable';

/** One line of the payload block. */
export interface DetailField {
  /** The key, exactly as the domain's contract spells it. */
  readonly name: string;
  /** Its value, written out as one string. */
  readonly value: string;
}

/** The reads one finding's detail is assembled from. */
export interface DetailSources {
  /** The finding the route named. */
  readonly finding: Finding;
  /** Every document of the domain — the finding names one by id. */
  readonly documents: readonly Document[];
  /** Every source of the domain — the document names one by id. */
  readonly sources: readonly Source[];
}

/** What the detail modal renders, below its own header. */
export interface FindingDetail {
  /** The domain's own payload keys, in the order it recorded them. */
  readonly fields: readonly DetailField[];
  /**
   * The start of the document's text, or null where there is none to
   * show.
   *
   * One null for two absences — no document arrived, and a document
   * whose body is blank — because the surface does the same thing in
   * both cases. Which of the two it is can be read off
   * {@link FindingDetail.sourceLabel}, whose unknown reading is the
   * one that means the document itself is missing.
   */
  readonly excerpt: string | null;
  /** Where the document came from, exactly as the table's cell reads it. */
  readonly sourceLabel: string;
  /** Whether that document failed its parse — the cell's dot, again. */
  readonly parseFailed: boolean;
  /** When the pipeline fetched it, or null where it did not arrive. */
  readonly capturedAt: IsoTimestamp | null;
}

/**
 * What the finding says it is about, in the domain's own words.
 *
 * The same reading `./rows.ts` makes for the table's title cell, off
 * the same key — imported rather than respelled, so the header of a
 * modal and the cell of the row it opened over cannot name one finding
 * two different ways.
 *
 * Nullable even though the contract requires the field, and strictly
 * so: `fields` is a JSON payload, so a summary that arrived as a
 * number is a pipeline fault, and rendering `42` as the dialog's title
 * would hide it. The caller supplies the words for the absence.
 *
 * @param finding - Any finding.
 * @returns Its summary, or null where the payload carries none as text.
 */
export function findingSummary(finding: Finding): string | null {
  const value = finding.fields[SUMMARY_FIELD];

  return typeof value === 'string'
    ? value
    : null;
}

/**
 * One payload value, written out as a line of text.
 *
 * Strings pass through unquoted — they are the common case and the
 * only one an operator reads as prose. Everything else is written as
 * JSON, which is both what the column holds and the one spelling that
 * distinguishes `0` from `'0'`, `null` from a missing key, and an
 * empty list from an empty object.
 *
 * Total by construction: `JSON.stringify` answers `undefined` for a
 * function or a symbol and THROWS on a circular value or a bigint, and
 * a detail view that took the modal down over one odd payload key
 * would be a worse answer than a line reading
 * {@link UNREADABLE_FIELD_VALUE}. The same reasoning `./rows.ts` uses
 * for its own `URL` parse.
 *
 * @param value - Whatever the payload holds under one key.
 * @returns Its rendering, always a non-empty string.
 */
export function readFieldValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value) ?? UNREADABLE_FIELD_VALUE;
  } catch {
    return UNREADABLE_FIELD_VALUE;
  }
}

/**
 * The payload block: the domain's own keys, in the order it recorded
 * them.
 *
 * Insertion order rather than sorted, because the order a contract
 * lists its fields in is a statement about which matter — the seeded
 * contract leads with the summary — and sorting would replace it with
 * the alphabet.
 *
 * The shell's reserved keys are the only omission; the header says why
 * the summary is not a second one.
 *
 * @param fields - The finding's payload.
 * @returns One line per domain key, values written out.
 */
export function detailFields(
  fields: Readonly<Record<string, unknown>>,
): readonly DetailField[] {
  return Object.entries(fields)
    .filter(([name]) => !isShellField(name))
    .map(([name, value]) => ({ name, value: readFieldValue(value) }));
}

/**
 * The start of a document's text, cut at a word boundary.
 *
 * Whitespace is trimmed first, so a body that is nothing but spacing
 * answers the empty string and a caller can treat it as no text at
 * all. A body already within the limit is answered WHOLE and carries
 * no ellipsis — the mark means there is more, and a mark on a complete
 * excerpt would be a lie about the document.
 *
 * The cut backs up to the last space so a word is not halved, unless
 * there is no space to back up to: a single token longer than the
 * limit is cut where the limit falls, since the alternative is showing
 * nothing.
 *
 * @param body - The document's extracted text.
 * @param limit - How many characters to show before cutting.
 * @returns The excerpt, marked where it is short of the whole.
 */
export function bodyExcerpt(body: string, limit: number): string {
  const text = body.trim();

  if (text.length <= limit) {
    return text;
  }

  const cut = text.slice(0, limit);
  const lastSpace = cut.lastIndexOf(' ');
  const kept = lastSpace === -1
    ? cut
    : cut.slice(0, lastSpace);

  return `${kept.trimEnd()}${EXCERPT_ELLIPSIS}`;
}

/**
 * Assemble one finding's detail from the reads behind it.
 *
 * The modal's counterpart to `./rows.ts`'s `buildDigestRows`, and
 * tolerant in the same way: a document the read did not carry leaves
 * an unknown source, no stamp and no excerpt, rather than an absent
 * detail or a throw.
 *
 * @param reads - The finding, and the two lists it is joined against.
 * @returns What the modal renders.
 */
export function buildFindingDetail(reads: DetailSources): FindingDetail {
  const document = reads.documents.find(
    (candidate) => candidate.id === reads.finding.documentId,
  );
  const sourcesById = new Map(
    reads.sources.map((source) => [source.id, source]),
  );
  const excerpt = document === undefined
    ? ''
    : bodyExcerpt(document.body, EXCERPT_LIMIT);

  return {
    fields: detailFields(reads.finding.fields),
    excerpt: excerpt === ''
      ? null
      : excerpt,
    sourceLabel: readSourceLabel(document, sourcesById),
    parseFailed: document?.parseStatus === 'failed',
    capturedAt: document?.capturedAt ?? null,
  };
}
