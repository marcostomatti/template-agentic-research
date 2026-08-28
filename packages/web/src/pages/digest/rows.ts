/**
 * @packageDocumentation
 * The digest's row model: what one table row says, assembled from the
 * four reads the surface makes.
 *
 * ## Why the join is here
 *
 * `../../data/digest.ts` keeps findings, documents and entities as
 * three tables on purpose — a flattened fixture row would be a shape
 * invented for one table and unpicked the day the API lands — and
 * `../../data/hooks.ts` says in as many words that the page performs
 * the join. This module is that join, lifted out of the component so
 * that the node-environment unit suite can reach it: nothing here
 * renders, imports React or reads a browser API.
 *
 * What the page is left with is one `.map` per column.
 *
 * ## Total, never throwing
 *
 * Every lookup below tolerates a miss. The fixture reads all come from
 * one domain and agree with each other today, but this code is what
 * will be standing when the same four reads arrive over HTTP, at
 * different times and possibly from different commits of the service.
 * A row whose document has not arrived says it has an unknown source;
 * it does not disappear, and it does not take the render down. That is
 * also why the alias hop here is tolerant where `resolveEntity` throws
 * — the fixture accessor is checking a fixture, this is rendering a
 * page.
 *
 * ## What is deliberately not modelled
 *
 * A row carries the DATA the surface filters and renders, not the
 * strings it draws: `summary` stays nullable rather than falling back
 * to prose, because the fallback is a presentation choice and the page
 * is where the rest of them live. The two source labels below are the
 * exception, and they earn it by being the answer to "which of the
 * three source states is this" rather than a caption — the digest
 * filters and searches on that text.
 *
 * The two derivations at the bottom — {@link tagLine} and
 * {@link rowCountLabel} — are here for a different reason: both are
 * pure functions of a row set, and the component that would otherwise
 * hold them is a `.tsx` no unit test in this package can reach.
 */

import type {
  Document,
  Entity,
  Finding,
  IsoTimestamp,
  Source,
} from '../../data/types';
import type { QueryField } from '../filters';
import type { BadgeProps } from '@ar/ui';

/** The `fields` key the domain's contract requires of every finding. */
const SUMMARY_FIELD = 'summary';

/** The `fields` key carrying a finding's own labels. */
const TAGS_FIELD = 'tags';

/**
 * The `attributes` key an entity's taxonomy bucket is recorded under.
 *
 * `entities.attributes` is free-form — its shape is the domain's
 * business, not the schema's — so this is a convention read
 * defensively rather than a column. A subject that carries no string
 * here simply has no category, which is the state most of them are in.
 */
const CATEGORY_ATTRIBUTE = 'category';

/** What separates a row's tags, in the cell and in the search alike. */
export const TAG_SEPARATOR = ' · ';

/** What the source cell says for a document nobody fetched. */
export const NO_SOURCE_LABEL = 'Added by hand';

/** What it says for a document whose source did not come back. */
export const UNKNOWN_SOURCE_LABEL = 'Unknown source';

/** What the verdict badge reads for a finding nobody has ruled on. */
export const UNRATED_VERDICT_LABEL = 'unrated';

/**
 * The badge tone each seeded verdict is drawn in.
 *
 * Keyed by `string` rather than by a union, because a verdict
 * vocabulary belongs to its domain: `../../data/types.ts` keeps
 * `Finding.verdict` a string for the same reason the service puts no
 * CHECK on the column. This is a set of tones for the verdicts this
 * example deployment configures, not a claim about what a verdict may
 * be — {@link verdictTone} says what happens to the rest.
 */
const VERDICT_TONES: Readonly<Record<string, BadgeProps['tone']>> = {
  avoid: 'danger',
  caution: 'warning',
  neutral: 'neutral',
  interested: 'success',
};

/** The tone for a verdict this shell has no colour for. */
const UNKNOWN_VERDICT_TONE: BadgeProps['tone'] = 'info';

/** The tone for a finding carrying no verdict at all. */
const NO_VERDICT_TONE: BadgeProps['tone'] = 'neutral';

/** One row of the digest table. */
export interface DigestRow {
  /** The `findings.id` — the table's row key and the modal's target. */
  readonly id: number;
  /**
   * What the finding says, off the contract's required field.
   *
   * Nullable even though the contract requires it: `fields` is a JSON
   * payload, so "required" is a rule the pipeline applies rather than
   * one this type can enforce, and a page reading it as a string
   * would render `undefined` the day a payload arrives without one.
   */
  readonly summary: string | null;
  /** The finding's own labels, in payload order; `[]` where it has none. */
  readonly tags: readonly string[];
  /** The domain's ruling, or null where nobody has made one. */
  readonly verdict: string | null;
  /**
   * What the scoring pass made of it.
   *
   * Null is NOT zero — never scored against read and matched nothing —
   * and the two reach different cells.
   */
  readonly score: number | null;
  /**
   * The taxonomy bucket its subject was matched under, or null.
   *
   * Null covers three different absences the digest treats alike: a
   * finding about no subject, a subject recording no bucket, and a
   * subject that did not arrive with the read.
   */
  readonly categoryKey: string | null;
  /** Where the document came from, as the source cell reads it. */
  readonly sourceLabel: string;
  /**
   * Whether the document it was read from failed its parse.
   *
   * A finding can exist on a failed document — the contract fields
   * were missing, the text was still readable — so this qualifies the
   * row rather than excluding it.
   */
  readonly parseFailed: boolean;
  /** When the finding was made — what the relative-time cell shows. */
  readonly createdAt: IsoTimestamp;
}

/** The four reads a digest row is assembled from. */
export interface DigestSources {
  readonly findings: readonly Finding[];
  readonly documents: readonly Document[];
  readonly entities: readonly Entity[];
  readonly sources: readonly Source[];
}

/**
 * Read one key of a `fields` payload as text.
 *
 * @param fields - The finding's payload.
 * @param key - The field wanted.
 * @returns Its value where it holds a string, else null.
 */
function readText(
  fields: Readonly<Record<string, unknown>>,
  key: string,
): string | null {
  const value = fields[key];

  return typeof value === 'string'
    ? value
    : null;
}

/**
 * Read one key of a `fields` payload as a list of labels.
 *
 * Non-string members are dropped rather than stringified: a payload
 * carrying a number among its tags is a pipeline bug, and rendering
 * `42` beside the words would hide it.
 *
 * @param fields - The finding's payload.
 * @param key - The field wanted.
 * @returns Its string members, in order; `[]` where it holds no list.
 */
function readTextList(
  fields: Readonly<Record<string, unknown>>,
  key: string,
): readonly string[] {
  const value = fields[key];

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((member): member is string => typeof member === 'string');
}

/**
 * The subject a finding is about, following an alias once.
 *
 * One hop, the rule `../../data/types.ts` records for
 * `entities.alias_of` — but tolerant where the fixture accessor
 * throws: an alias whose target is not in the read answers with the
 * alias row itself, so the row keeps whatever that row does say.
 *
 * @param entityId - What the finding names, or null.
 * @param byId - Every entity of the domain, keyed by id.
 * @returns The subject, or undefined where the finding names none.
 */
function resolveSubject(
  entityId: number | null,
  byId: ReadonlyMap<number, Entity>,
): Entity | undefined {
  if (entityId === null) {
    return undefined;
  }

  const named = byId.get(entityId);

  if (named === undefined || named.aliasOf === null) {
    return named;
  }

  return byId.get(named.aliasOf) ?? named;
}

/**
 * How the source cell reads for one document.
 *
 * Three states, and the page filters on all three: fetched from a
 * configured source, added by hand, or fetched from a source that did
 * not come back with this read. The kind rides along with the host
 * because a domain reads the same host over more than one protocol.
 *
 * @param document - The document a finding was read from, or undefined
 * where it did not arrive.
 * @param byId - Every source of the domain, keyed by id.
 * @returns The label, always a non-empty string.
 */
function sourceLabel(
  document: Document | undefined,
  byId: ReadonlyMap<number, Source>,
): string {
  if (document === undefined) {
    return UNKNOWN_SOURCE_LABEL;
  }

  if (document.sourceId === null) {
    return NO_SOURCE_LABEL;
  }

  const source = byId.get(document.sourceId);

  if (source === undefined) {
    return UNKNOWN_SOURCE_LABEL;
  }

  return `${source.kind}${TAG_SEPARATOR}${endpointHost(source.endpoint)}`;
}

/**
 * The host an endpoint points at, for a label short enough to read.
 *
 * A full endpoint is a URL with a path on it and would take the column
 * on its own. An endpoint that will not parse is handed back whole —
 * `URL` throws on anything that is not absolute, and a source's
 * endpoint is operator-entered.
 *
 * @param endpoint - As the source records it.
 * @returns Its host, or the endpoint itself.
 */
function endpointHost(endpoint: string): string {
  try {
    return new URL(endpoint).host;
  } catch {
    return endpoint;
  }
}

/**
 * The badge tone a verdict is drawn in.
 *
 * Three answers, and the middle one is the reason this is a function
 * rather than a record lookup at the call site: a verdict the domain
 * configured but this shell has no colour for is drawn as
 * informational, which says a ruling exists. Drawing it neutral would
 * make it indistinguishable from no ruling at all.
 *
 * @param verdict - The finding's verdict, or null.
 * @returns The tone for `Badge`.
 */
export function verdictTone(verdict: string | null): BadgeProps['tone'] {
  if (verdict === null) {
    return NO_VERDICT_TONE;
  }

  return VERDICT_TONES[verdict] ?? UNKNOWN_VERDICT_TONE;
}

/**
 * A row's tags as one line, or nothing where it carries none.
 *
 * Returns undefined rather than an empty string so a caller can hand
 * it straight to an optional slot — `CellDoubleLine` renders no second
 * line at all for undefined, where `''` would reserve its height.
 *
 * @param tags - The row's tags.
 * @returns The joined line, or undefined.
 */
export function tagLine(tags: readonly string[]): string | undefined {
  return tags.length === 0
    ? undefined
    : tags.join(TAG_SEPARATOR);
}

/**
 * How the head's chip reads the size of what is on screen.
 *
 * Says `of` only while something is narrowing the list, so an
 * untouched page states a count rather than the tautology `6 of 6` —
 * and a filtered one always says what it is a subset OF, which is the
 * reading that tells an operator the rows they cannot see exist.
 *
 * @param visible - How many rows the filters left.
 * @param total - How many the domain has.
 * @returns The chip's text.
 */
export function rowCountLabel(visible: number, total: number): string {
  const noun = total === 1
    ? 'finding'
    : 'findings';

  return visible === total
    ? `${total} ${noun}`
    : `${visible} of ${total} ${noun}`;
}

/**
 * Assemble the digest's rows from the reads behind them.
 *
 * Findings drive the list and keep their order — `listFindings`
 * answers newest first, and that ordering is part of what the digest
 * means — so this neither sorts nor filters. Every finding produces
 * exactly one row.
 *
 * @param reads - The four lists, all for the same domain.
 * @returns One row per finding, in the order the findings arrived.
 */
export function buildDigestRows(reads: DigestSources): readonly DigestRow[] {
  const documentsById = new Map(
    reads.documents.map((document) => [document.id, document]),
  );
  const entitiesById = new Map(
    reads.entities.map((entity) => [entity.id, entity]),
  );
  const sourcesById = new Map(
    reads.sources.map((source) => [source.id, source]),
  );

  return reads.findings.map((finding) => {
    const document = documentsById.get(finding.documentId);
    const subject = resolveSubject(finding.entityId, entitiesById);

    return {
      id: finding.id,
      summary: readText(finding.fields, SUMMARY_FIELD),
      tags: readTextList(finding.fields, TAGS_FIELD),
      verdict: finding.verdict,
      score: finding.score,
      categoryKey: subject === undefined
        ? null
        : readText(subject.attributes, CATEGORY_ATTRIBUTE),
      sourceLabel: sourceLabel(document, sourcesById),
      parseFailed: document?.parseStatus === 'failed',
      createdAt: finding.createdAt,
    };
  });
}

/**
 * The fields the digest's search box compares a query against.
 *
 * Four readers rather than one joined string, which is what
 * `filterByQuery` wants: a two-word query matching a row whose summary
 * supplied one word and whose source supplied the other is a hit an
 * operator cannot see the reason for.
 *
 * The tags are the one place that reasoning is bent, since a row's
 * tags are a list of unknown length and cannot be one reader each.
 * They are joined with the same separator the cell draws them with, so
 * a query spanning two of them has to carry the separator too.
 *
 * The score and the timestamp are absent deliberately: both have a
 * control of their own, and a search box matching `2026` against a
 * date nobody can see in that form is a hit that looks like a bug.
 */
export const DIGEST_QUERY_FIELDS: readonly QueryField<DigestRow>[] = [
  (row) => row.summary,
  (row) => tagLine(row.tags),
  (row) => row.verdict,
  (row) => row.sourceLabel,
];
