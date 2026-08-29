/**
 * @packageDocumentation
 * The digest fixtures — what a pipeline captured, what one domain made
 * of it, and which subjects those readings are about.
 *
 * Three tables rather than one, because the digest surface is a join: a
 * row shows a {@link Finding}'s verdict and score, the {@link Document}
 * it was read from, and the {@link Entity} it is about. Keeping them
 * apart here means the page performs the same join the q15 endpoint
 * will have to answer with, instead of a flattened row shape invented
 * for one table and then unpicked when the API lands.
 *
 * Entities live in this module rather than one of their own: no surface
 * in this shell lists them, they are reachable only through the
 * findings that name them, and a module holding four rows nothing
 * imports on its own would be a file to keep in step for no reader.
 *
 * Nothing here is transcribed from a seed. `packages/service/data/`
 * seeds CONFIGURATION — domains, categories, terms, personas, topics —
 * while documents and findings are pipeline OUTPUT, so no seed carries
 * one and there is no file to pin these against. What holds them
 * instead is the seeded domain's own `fieldContract`: every
 * {@link Finding.fields} payload below satisfies the contract
 * `./domains.ts` transcribes, and `./digest.test.ts` checks each one
 * against that contract rather than against a copy restated in the
 * test. Content stays neutral and illustrative for the reason the seeds
 * do — real subject matter belongs to whoever operates an instance.
 *
 * Every row belongs to the seeded domain. The sparse domain that
 * `./domains.ts` exports as `SPARSE_DOMAIN_SLUG` deliberately gets
 * none, which is how the digest's empty state is reached in a running
 * demo: switch domain rather than empty a table.
 *
 * The rows are not a uniform set. Each of the following is here to be
 * met by a page that would otherwise be written as though it never
 * happens, and each is named again on the row carrying it:
 *
 * - BOTH parse statuses, on both sides of the finding relation. One
 *   failed document carries a finding (the contract fields were
 *   missing, the text was still readable) and one carries none (nothing
 *   usable came back). So a status badge keyed off the document has
 *   both tones to render, and an accessor inventing a finding per
 *   document would be caught.
 * - A score of 0 beside a score of NULL. `./types.ts` keeps the pair
 *   distinguishable on purpose — read and matched nothing, versus never
 *   scored — and a set carrying only one of them lets a falsy check
 *   pass for the wrong reason.
 * - EVERY verdict of the domain's ladder, plus NULL for a finding
 *   nobody has ruled on. The digest's verdict filter renders the
 *   ladder, so a verdict no fixture carries is a filter option that
 *   selects nothing.
 * - A `fields` payload carrying the required field ALONE, beside one
 *   carrying every field the contract names. Both satisfy it, and the
 *   sparse one is what a cell reading an optional field must survive.
 * - A document with no source and no URL — added by hand rather than
 *   fetched — so a source cell and a link cell each meet the NULL the
 *   schema allows.
 *
 * Documents reference sources by id (1, 2 and 3). `sources.ts` lands
 * after this module and has to carry those ids for the seeded domain,
 * or the digest's source cell resolves to nothing. Nothing here can
 * check it — this module cannot import a module that does not exist yet
 * — so that cross-check belongs to the tests of whichever module first
 * holds both, `sources.ts` or `api.ts`.
 */

import type { Document, Entity, Finding, IsoTimestamp } from './types';

import { DEFAULT_DOMAIN_SLUG, getDomain } from './domains';

/**
 * The `domains.id` every row below references.
 *
 * Read off the domain fixture rather than written as `1`, so a change
 * to the domain table moves these rows with it instead of silently
 * orphaning them. Resolving at module scope means an import of this
 * module fails loudly if the seeded domain ever goes, which is the
 * right time to hear about it: there is no half of this fixture set
 * that still means something without its domain.
 */
const SEEDED_DOMAIN_ID = getDomain(DEFAULT_DOMAIN_SLUG).id;

/**
 * The subjects the findings below are about — `entities` rows.
 *
 * Declared before the documents and findings that reference them so the
 * file reads in dependency order. Ids are stable: a finding names one,
 * and `./digest.test.ts` fails on a reference no row answers.
 */
export const ENTITIES: readonly Entity[] = [
  {
    id: 1,
    domainId: SEEDED_DOMAIN_ID,
    name: 'Example Stream Broker',
    nameNorm: 'example stream broker',
    aliasOf: null,
    // Whatever the domain records about a subject beyond its name —
    // shape is the domain's business, so this one keeps the taxonomy
    // bucket it was matched under and whether an operator is following
    // it.
    attributes: { category: 'technologies', watched: true },
  },
  {
    id: 2,
    domainId: SEEDED_DOMAIN_ID,
    name: 'Example Graph Store',
    nameNorm: 'example graph store',
    aliasOf: null,
    attributes: { category: 'technologies', watched: true },
  },
  {
    id: 3,
    domainId: SEEDED_DOMAIN_ID,
    name: 'Example Object Cache',
    nameNorm: 'example object cache',
    aliasOf: null,
    // `{}` is a complete value: a subject nobody has recorded anything
    // about beyond its name is the ordinary state of a new entity.
    attributes: {},
  },
  {
    id: 4,
    domainId: SEEDED_DOMAIN_ID,
    name: 'Example Graph DB',
    nameNorm: 'example graph db',
    // The one alias in the set, and the reason {@link resolveEntity}
    // exists: a finding attached to this row is about entity 2 under an
    // earlier name, and a page rendering the row as written would show
    // one subject under two names.
    aliasOf: 2,
    attributes: {},
  },
];

/**
 * The raw material a pipeline captured — `documents` rows.
 *
 * Declared oldest first, which is id order; the accessors below are
 * what put a list in the order a page renders. `hash` is the unique key
 * one row per distinct item stands on, so two rows sharing one would be
 * a contradiction rather than a duplicate — the test pins that.
 */
export const DOCUMENTS: readonly Document[] = [
  {
    id: 1,
    domainId: SEEDED_DOMAIN_ID,
    sourceId: 3,
    hash: '3045960151a7fd9d09ab73a67cddd30127bd7e2378d07a4a3207703b5ca4ce4b',
    url: 'https://example.org/feeds/infrastructure/2026-06-07-digest',
    body: 'Weekly roundup. The payload came back truncated mid-record '
      + 'and no usable item could be read from it.',
    capturedAt: '2026-06-07T21:10:00.000Z',
    // A failed parse with NO finding: fail-flag-keep means the document
    // is stored with its error rather than dropped, so a source whose
    // shape has drifted leaves evidence instead of a quiet day. Nothing
    // was made of it, which is what an accessor inventing a finding per
    // document would get wrong.
    parseStatus: 'failed',
    parseError: 'Response body ended mid-record after 12 of 30 items.',
  },
  {
    id: 2,
    domainId: SEEDED_DOMAIN_ID,
    // No source and no URL: added by hand rather than fetched. Both
    // NULLs are the schema's, and both reach a cell on the digest.
    sourceId: null,
    hash: 'af342635c5837d51aa9453b4036cf857e35f17e9ece07a66d225c60437ad07ea',
    url: null,
    body: 'Conference notes pasted by an operator. A public sector '
      + 'programme described its move onto an event streaming platform.',
    capturedAt: '2026-06-08T15:22:00.000Z',
    parseStatus: 'ok',
    parseError: null,
  },
  {
    id: 3,
    domainId: SEEDED_DOMAIN_ID,
    sourceId: 1,
    hash: '5f68ec6c35a57eb9882d4d1bea825f914641f4c12dc1170d7578d133e5ac3600',
    url: 'https://example.com/object-cache/announcements/end-of-life',
    body: 'The maintainers announce end of life for the proprietary '
      + 'runtime edition and name no successor.',
    capturedAt: '2026-06-09T09:05:00.000Z',
    parseStatus: 'ok',
    parseError: null,
  },
  {
    id: 4,
    domainId: SEEDED_DOMAIN_ID,
    sourceId: 2,
    hash: '4994af0916b06c270fe9a5160df627b30e90bfcdea891089d26ebbd7bb04a4a1',
    url: 'https://example.net/graph-store/blog/2026/beta-notes',
    body: 'Beta notes for a graph database, including benchmark results '
      + 'and a migration path from the earlier name.',
    capturedAt: '2026-06-10T18:40:00.000Z',
    parseStatus: 'ok',
    parseError: null,
  },
  {
    id: 5,
    domainId: SEEDED_DOMAIN_ID,
    sourceId: 3,
    hash: '832e2179b66f063f21e7091f26f0e69ca8e48bba712df16cce01cb94b0b08ee9',
    url: 'https://example.org/feeds/infrastructure/2026-06-11-items',
    body: 'A logistics operator reports running a message queue in '
      + 'production for a year.',
    capturedAt: '2026-06-11T05:58:00.000Z',
    // A failed parse that still yielded a finding. The contract fields
    // the source promises were absent, so the document is flagged; the
    // extracted text was readable, so a degraded finding was made from
    // it — see finding 5, whose payload carries the required field and
    // nothing else.
    parseStatus: 'failed',
    parseError: 'Contract field published_at missing from 1 of 4 items.',
  },
  {
    id: 6,
    domainId: SEEDED_DOMAIN_ID,
    sourceId: 1,
    hash: '19d3a235099a53b02c659b7fbbe55de48c5350c240fddf00a6772719d3253d39',
    url: 'https://example.com/stream-broker/releases/4-0',
    body: 'Release notes: the message queue is generally available, and '
      + 'a reference implementation ships beside it.',
    capturedAt: '2026-06-11T06:12:00.000Z',
    parseStatus: 'ok',
    parseError: null,
  },
];

/**
 * What the seeded domain made of those documents — `findings` rows.
 *
 * The list the digest surface renders. Declared oldest first, like the
 * documents above; {@link listFindings} is what puts them in the order
 * a page shows.
 *
 * `verdict` is the flattening `./types.ts` describes — one label per
 * finding, denormalized off `finding_labels` because every surface here
 * wants exactly one. Values come from the seeded domain's
 * `verdictVocabulary`, and the whole ladder is covered plus NULL.
 */
export const FINDINGS: readonly Finding[] = [
  {
    id: 1,
    domainId: SEEDED_DOMAIN_ID,
    documentId: 2,
    // No entity: the finding is about a programme this domain does not
    // track by name, which is what the nullable column is for.
    entityId: null,
    fields: {
      summary: 'A public sector programme describes moving onto an '
        + 'event streaming platform.',
      firstSeenAt: '2026-06-08T00:00:00.000Z',
      mentions: 3,
      tags: ['public sector'],
    },
    // Never scored, and NOT the same as scored to zero — the two nulls
    // move together because they record one absence. This is the state
    // a finding sits in between capture and the scoring pass.
    score: null,
    scoreVersion: null,
    // Nobody has ruled on it either, which is the state every finding
    // starts in and the one an operator works through the digest to
    // clear.
    verdict: null,
    createdAt: '2026-06-08T15:40:00.000Z',
  },
  {
    id: 2,
    domainId: SEEDED_DOMAIN_ID,
    documentId: 3,
    entityId: 3,
    fields: {
      summary: 'End of life announced for the proprietary runtime '
        + 'edition, with no successor named.',
      maturity: 'deprecated',
      firstSeenAt: '2025-11-04T00:00:00.000Z',
      mentions: 2,
      isOpenSource: false,
      tags: ['end of life', 'proprietary runtime'],
      links: { announcement: 'https://example.com/object-cache/eol' },
    },
    score: 1.5,
    scoreVersion: 2,
    verdict: 'avoid',
    // After its document was captured, which is the ordinary order: a
    // finding is a reading OF something.
    createdAt: '2026-06-09T09:20:00.000Z',
  },
  {
    id: 3,
    domainId: SEEDED_DOMAIN_ID,
    documentId: 4,
    entityId: 2,
    fields: {
      summary: 'Beta notes for a graph database, with a migration path '
        + 'from the earlier name.',
      maturity: 'beta',
      firstSeenAt: '2026-03-23T00:00:00.000Z',
      mentions: 4,
      isOpenSource: true,
      tags: ['graph database', 'benchmark results'],
      links: { docs: 'https://example.net/graph-store/docs' },
    },
    score: 5,
    scoreVersion: 2,
    verdict: 'caution',
    createdAt: '2026-06-10T18:55:00.000Z',
  },
  {
    id: 4,
    domainId: SEEDED_DOMAIN_ID,
    // A second finding from the same document as finding 3, about the
    // subject under its earlier name. One document can be read into
    // several findings, and the digest is a list of findings rather
    // than of documents for exactly that reason.
    documentId: 4,
    // Points at the ALIAS row, which is what {@link resolveEntity} is
    // for: rendered as written it would show one subject twice.
    entityId: 4,
    fields: {
      summary: 'The earlier name is retired in favour of the current '
        + 'one; benchmark results are unchanged.',
      maturity: 'beta',
      mentions: 1,
      isOpenSource: true,
      tags: [],
    },
    // Scored to ZERO: read, and matched nothing this domain weights.
    // An ordinary outcome, and the value that has to stay
    // distinguishable from the NULL on finding 1.
    score: 0,
    scoreVersion: 2,
    verdict: 'neutral',
    createdAt: '2026-06-10T18:56:00.000Z',
  },
  {
    id: 5,
    domainId: SEEDED_DOMAIN_ID,
    // The degraded reading of the failed document — see document 5.
    documentId: 5,
    entityId: 1,
    // The required field ALONE. Everything else the contract names is
    // optional, and the parse that would have supplied it is the one
    // that failed, so this is the sparsest payload the contract admits
    // and the one a cell reading an optional field has to survive.
    fields: {
      summary: 'A logistics operator reports a year of running the '
        + 'message queue in production.',
    },
    score: 2.5,
    scoreVersion: 2,
    verdict: 'caution',
    createdAt: '2026-06-11T06:05:00.000Z',
  },
  {
    id: 6,
    domainId: SEEDED_DOMAIN_ID,
    documentId: 6,
    entityId: 1,
    // Every field the contract names, which is the other end of the
    // range finding 5 opens.
    fields: {
      summary: 'The message queue reaches general availability, with a '
        + 'reference implementation beside it.',
      maturity: 'stable',
      firstSeenAt: '2026-02-17T00:00:00.000Z',
      mentions: 12,
      isOpenSource: true,
      tags: ['message queue', 'generally available'],
      links: {
        release: 'https://example.com/stream-broker/releases/4-0',
        docs: 'https://example.com/stream-broker/docs',
      },
    },
    score: 8.5,
    scoreVersion: 2,
    verdict: 'interested',
    createdAt: '2026-06-11T06:20:00.000Z',
  },
];

const DOCUMENTS_BY_ID = new Map<number, Document>(
  DOCUMENTS.map((document) => [document.id, document]),
);

const FINDINGS_BY_ID = new Map<number, Finding>(
  FINDINGS.map((finding) => [finding.id, finding]),
);

const ENTITIES_BY_ID = new Map<number, Entity>(
  ENTITIES.map((entity) => [entity.id, entity]),
);

/**
 * Newest first — the order the digest renders, and the order the q15
 * endpoint has to answer in for the page to keep working unchanged.
 *
 * Compared as parsed instants rather than as text. Every fixture stamp
 * is UTC and fixed-width, so the two agree today; a stamp written with
 * another offset would sort by its digits instead of by its time, and
 * that is a difference no fixture edit should have to remember.
 *
 * @param a - The left stamp.
 * @param b - The right stamp.
 * @returns Negative when `a` is the more recent of the two.
 */
function newestFirst(a: IsoTimestamp, b: IsoTimestamp): number {
  return Date.parse(b) - Date.parse(a);
}

/**
 * The documents captured for one domain, most recently captured first.
 *
 * Scoped by numeric id rather than by slug: `./api.ts` is the module
 * that speaks slugs, and it resolves one through `getDomain`, whose
 * throw is where an unknown domain is refused. A domain with no
 * documents answers `[]`, which is a state the fixtures reach on
 * purpose rather than an error.
 *
 * @param domainId - The `domains.id` whose documents are wanted.
 * @returns Its documents, newest capture first. Never the stored array.
 */
export function listDocuments(domainId: number): readonly Document[] {
  // `filter` already returns a fresh array, so sorting it in place
  // leaves DOCUMENTS untouched.
  return DOCUMENTS
    .filter((document) => document.domainId === domainId)
    .sort((a, b) => newestFirst(a.capturedAt, b.capturedAt));
}

/**
 * The findings one domain made, most recently made first.
 *
 * Ordering is part of what the digest means — the surface shows the
 * latest readings — so it belongs here rather than in the page, where
 * the q15 swap would drop it.
 *
 * @param domainId - The `domains.id` whose findings are wanted.
 * @returns Its findings, newest first. Never the stored array.
 */
export function listFindings(domainId: number): readonly Finding[] {
  return FINDINGS
    .filter((finding) => finding.domainId === domainId)
    .sort((a, b) => newestFirst(a.createdAt, b.createdAt));
}

/**
 * The subjects one domain records, in id order.
 *
 * Id order rather than alphabetical: nothing lists entities on their
 * own, so there is no display order to answer with — a caller wants
 * the whole set to resolve the {@link Finding.entityId} references it
 * is holding, and the alias rows have to be in it for
 * {@link resolveEntity} to have anything to follow.
 *
 * The digest page is what needs this: its category filter reads the
 * taxonomy bucket a subject was matched under, which lives on
 * {@link Entity.attributes} and reaches a finding only through here.
 *
 * @param domainId - The `domains.id` whose subjects are wanted.
 * @returns Its entities, in id order. Never the stored array.
 */
export function listEntities(domainId: number): readonly Entity[] {
  return ENTITIES.filter((entity) => entity.domainId === domainId);
}

/**
 * Look a document up by id, or throw.
 *
 * No tolerant twin, unlike {@link findFinding}: a document id reaches
 * this module from a finding that names it, never from a URL, so a miss
 * is a broken fixture rather than an ordinary outcome to render a
 * not-found state for.
 *
 * @param id - The `documents.id` wanted.
 * @returns The document carrying that id.
 * @throws If no fixture document carries it.
 */
export function getDocument(id: number): Document {
  const document = DOCUMENTS_BY_ID.get(id);

  if (document === undefined) {
    throw new Error(`Unknown document id: ${id}`);
  }

  return document;
}

/**
 * Look a finding up by id, tolerating a miss.
 *
 * The tolerant half exists because a finding id DOES arrive from the
 * URL — the digest's modal sub-route carries one — so a stale link is
 * an ordinary outcome the page answers with a not-found state.
 *
 * @param id - The `findings.id` wanted.
 * @returns The finding, or `undefined` if no fixture carries that id.
 */
export function findFinding(id: number): Finding | undefined {
  return FINDINGS_BY_ID.get(id);
}

/**
 * Look a finding up by id, or throw.
 *
 * @param id - The `findings.id` wanted.
 * @returns The finding carrying that id.
 * @throws If no fixture finding carries it.
 */
export function getFinding(id: number): Finding {
  const finding = findFinding(id);

  if (finding === undefined) {
    throw new Error(`Unknown finding id: ${id}`);
  }

  return finding;
}

/**
 * Look an entity up by id, or throw.
 *
 * Throws for the reason {@link getDocument} does: an entity id reaches
 * this module from a finding, so a miss is a contradiction in the
 * fixtures and not a state to render.
 *
 * @param id - The `entities.id` wanted.
 * @returns The entity carrying that id.
 * @throws If no fixture entity carries it.
 */
export function getEntity(id: number): Entity {
  const entity = ENTITIES_BY_ID.get(id);

  if (entity === undefined) {
    throw new Error(`Unknown entity id: ${id}`);
  }

  return entity;
}

/**
 * The subject an entity stands for, following an alias once.
 *
 * ONE hop, matching the rule `./types.ts` records for
 * `entities.alias_of`: chains are not followed, so an alias of an alias
 * resolves to the middle row rather than walking to the end. That is a
 * deliberate limit — a cycle would otherwise hang a render — and the
 * schema retires a subject by aliasing it onto its replacement, not
 * onto another alias.
 *
 * @param entity - The entity as a finding names it.
 * @returns The row it stands for, or the same entity where it is its
 * own subject.
 * @throws If the alias names an entity no fixture carries.
 */
export function resolveEntity(entity: Entity): Entity {
  if (entity.aliasOf === null) {
    return entity;
  }

  return getEntity(entity.aliasOf);
}
