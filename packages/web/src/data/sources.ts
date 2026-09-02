/**
 * @packageDocumentation
 * The source fixtures — the feeds one domain's pipeline is allowed to
 * read, and the health reading the sources surface renders over them.
 *
 * Nothing here is transcribed from a seed, unlike `./domains.ts` and
 * `./lexicon.ts`. `packages/service/data/` seeds a deployment's
 * VOCABULARY — domains, categories, terms, personas, topics — and
 * ships no `sources.json`: which feeds an instance reads is a fact
 * about that instance rather than about the example, so there is no
 * file to pin these rows against and no drift to catch.
 *
 * What constrains them instead is `./digest.ts`, which was written
 * first and whose documents cite `sourceId` 1, 2 and 3. This module is
 * the first to hold both halves, so `./sources.test.ts` is where that
 * cross-check lands: every source a document names has to be a fixture
 * row of the same domain, or the digest's source cell resolves to
 * nothing.
 *
 * The rows are not a uniform set. Each state below is here to be met
 * by a page that would otherwise be written as though it never
 * happens, and each is named again on the row carrying it:
 *
 * - EVERY {@link SourceKind}. The sources toolbar renders a kind
 *   `Select` over the union, so a kind no fixture carries is a filter
 *   option that selects nothing.
 * - Every {@link SourceStatus}, so the stat row above the table has a
 *   figure to show in each card and the `StatusIndicator` column has
 *   every tone to render.
 * - A source flagged with NO current failure streak, beside one
 *   failing with no flag. Either alone reads as failing, and a set
 *   carrying only one of them would let the two columns be collapsed
 *   into whichever was checked.
 * - A source that has never SUCCEEDED but has failed, beside one that
 *   has never been fetched at all. Both have a null `lastSuccessAt`
 *   and they are not the same state — one is being read and coming
 *   back unusable, the other has never been reached — which is what
 *   makes "pending" a reading of both stamps rather than of one.
 * - A source that recovered: it has failed in the past, succeeded
 *   since, and reports no current streak. What a health cell keyed off
 *   `lastFailureAt` alone would show as broken.
 *
 * Every row belongs to the seeded domain. The sparse domain that
 * `./domains.ts` exports as `SPARSE_DOMAIN_SLUG` deliberately gets
 * none, which is how the sources empty state is reached in a running
 * demo: switch domain rather than empty a table.
 *
 * Endpoints are `example.com`, `example.net` and `example.org` for the
 * reason the rest of the fixtures are illustrative: the feeds an
 * instance reads belong to whoever operates it, and a reserved domain
 * cannot resolve to somebody's real service if a row is ever pointed
 * at a network.
 */

import type { Source } from './types';

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
 * What the sources surface says about a feed at a glance.
 *
 * DERIVED, and so declared here rather than in `./types.ts`: it
 * mirrors no column. The four stored columns a status is read from —
 * `enabled`, `last_success_at`, `last_failure_at` and
 * `consecutive_failures` — each answer a different question, and the
 * page needs one answer per row for its `StatusIndicator` and one
 * count per member for the stat cards above it. Deriving it once here
 * is what keeps four pages from each inventing their own reading of
 * the same four columns.
 *
 * The members, and what each of them is NOT:
 *
 * - `disabled` — an operator switched the source off. Not a health
 *   reading at all: nothing is being read, so nothing can be failing.
 * - `pending` — configured, never fetched. See
 *   {@link summarizeSources} for what this stands in for and what it
 *   cannot yet say.
 * - `failing` — the pipeline is reading it and something is wrong:
 *   a current failure streak, a flag from the rot detector, or both.
 * - `active` — being read, with nothing outstanding.
 */
export type SourceStatus = 'active' | 'failing' | 'pending' | 'disabled';

/**
 * How many sources sit in each state.
 *
 * A total record rather than a partial one: every member is present
 * and a status nothing carries reads as `0`. The stat row renders a
 * figure per card and the toolbar a count per filter badge, so an
 * absent member would be a branch in every caller for a state that
 * means the same as a zero.
 *
 * Typing it as a `Record` over {@link SourceStatus} rather than as
 * four named members is what makes {@link countSourceStatuses}
 * exhaustive: a status added to the union becomes a missing key the
 * compiler refuses, not a case that quietly counts nothing and leaves
 * a stat row that no longer adds up to the table beneath it.
 */
export type SourceStatusCounts = Readonly<Record<SourceStatus, number>>;

/**
 * The feeds the pipeline is allowed to read — `sources` rows, in the
 * order they were configured.
 *
 * Nothing re-sorts them: id order is the order an operator added them
 * in, and a page wanting another one sorts the copy it is handed.
 *
 * Ids 1, 2 and 3 are the ones `./digest.ts` documents cite, and they
 * carry the stamps those captures imply — a source cannot have last
 * succeeded before the newest document it yielded. `./sources.test.ts`
 * checks both halves of that.
 *
 * A `cursor` is opaque: what it means is the adapter's business, which
 * is why no two rows below express one the same way. NULL means this
 * source has never been fetched, or that its adapter keeps no cursor
 * at all — the second reading is why a null cursor on a source that
 * HAS succeeded is not a contradiction, and the test only asserts the
 * direction that is one.
 */
export const SOURCES: readonly Source[] = [
  {
    id: 1,
    domainId: SEEDED_DOMAIN_ID,
    kind: 'api',
    endpoint: 'https://api.example.com/v1/releases',
    // A window cursor: this adapter asks for what changed since the
    // last thing it read.
    cursor: 'since=2026-06-11T06:12:00Z',
    consecutiveFailures: 0,
    // Stamped at the capture of document 6 in `./digest.ts` — the
    // fetch that read it is the success being recorded.
    lastSuccessAt: '2026-06-11T06:12:00.000Z',
    // Has never failed, which is not the same as source 2 below, whose
    // failure is behind it. A health cell that renders both the same
    // way is reading the counter and calling it history.
    lastFailureAt: null,
    enabled: true,
    flagged: false,
  },
  {
    id: 2,
    domainId: SEEDED_DOMAIN_ID,
    kind: 'url',
    endpoint: 'https://example.net/graph-store/blog/',
    // A page cursor, because this one walks a paginated index.
    cursor: 'page=4',
    // Recovered: it failed a fortnight ago, has succeeded since, and
    // reports no current streak. The next success set this back to 0,
    // so the counter measures the streak and not the history — and a
    // page keying off `lastFailureAt` would show this row as broken.
    consecutiveFailures: 0,
    lastSuccessAt: '2026-06-10T18:40:00.000Z',
    lastFailureAt: '2026-05-28T02:10:00.000Z',
    enabled: true,
    flagged: false,
  },
  {
    id: 3,
    domainId: SEEDED_DOMAIN_ID,
    kind: 'rss',
    endpoint: 'https://example.org/feeds/infrastructure.xml',
    // An item cursor: the last entry this adapter read.
    cursor: 'guid:example.org/feeds/infrastructure/2026-06-11-004',
    // The drifting source, and the one both failed documents in
    // `./digest.ts` came from: fail-flag-keep stored each rejected
    // payload and bumped this counter, which crossed the threshold and
    // set the flag below. Three rather than two — the streak started
    // before the fixture window.
    consecutiveFailures: 3,
    lastSuccessAt: '2026-06-05T21:10:00.000Z',
    // Stamped at the capture of document 5, the most recent payload
    // this source's contract rejected.
    lastFailureAt: '2026-06-11T05:58:00.000Z',
    // Still enabled: the detector flags, it does not switch off. A
    // suspect source is still worth reading, and only an operator
    // decides otherwise.
    enabled: true,
    flagged: true,
  },
  {
    id: 4,
    domainId: SEEDED_DOMAIN_ID,
    kind: 'push',
    // The one kind nothing polls: the endpoint says where a payload
    // lands rather than what to request.
    endpoint: 'https://ingest.example.org/hooks/example-tech-radar',
    // Nothing has been posted to it yet, so there is no position to
    // keep and neither stamp has ever been written. The three NULLs
    // together are what `pending` reads.
    cursor: null,
    consecutiveFailures: 0,
    lastSuccessAt: null,
    lastFailureAt: null,
    enabled: true,
    flagged: false,
  },
  {
    id: 5,
    domainId: SEEDED_DOMAIN_ID,
    kind: 'url',
    endpoint: 'https://example.org/archive/weekly-roundup',
    cursor: 'week=2026-W18',
    // Switched off by an operator while it was working, which is why
    // it carries a clean counter and a real success behind it. Nothing
    // automatic clears `enabled`, so it stays off until somebody
    // switches it back on.
    consecutiveFailures: 0,
    lastSuccessAt: '2026-05-04T07:30:00.000Z',
    lastFailureAt: null,
    enabled: false,
    flagged: false,
  },
  {
    id: 6,
    domainId: SEEDED_DOMAIN_ID,
    kind: 'api',
    endpoint: 'https://api.example.net/v2/index',
    // Never succeeded, so there is no position to have kept.
    cursor: null,
    // Failing below the flag threshold: the detector has not tripped,
    // and the row is failing on the counter alone. Its pair is source
    // 7, which is flagged with no streak — between them they are what
    // stops the two columns being collapsed into whichever one a
    // reading happened to check.
    consecutiveFailures: 2,
    // Null success beside a real failure: configured recently and
    // reached, but nothing usable has come back yet. NOT the same
    // state as source 4, which has never been reached at all — and the
    // reason `pending` reads both stamps rather than this one.
    lastSuccessAt: null,
    lastFailureAt: '2026-06-10T22:15:00.000Z',
    enabled: true,
    flagged: false,
  },
  {
    id: 7,
    domainId: SEEDED_DOMAIN_ID,
    kind: 'rss',
    endpoint: 'https://example.org/feeds/public-sector.xml',
    cursor: 'guid:example.org/feeds/public-sector/2026-06-09-002',
    // Flagged, then recovered: the success that followed reset the
    // counter, and nothing resets the flag — an operator rules on it.
    // So this row is failing on the FLAG alone, and a reading that
    // only counted streaks would show it as healthy while the flag is
    // still asking somebody to look.
    consecutiveFailures: 0,
    lastSuccessAt: '2026-06-09T12:05:00.000Z',
    lastFailureAt: '2026-06-02T12:00:00.000Z',
    enabled: true,
    flagged: true,
  },
];

const SOURCES_BY_ID = new Map<number, Source>(
  SOURCES.map((source) => [source.id, source]),
);

/**
 * How the sources surface reads one row.
 *
 * The precedence is the point, and it runs from the least to the most
 * inferred: what an operator decided, then what has been attempted,
 * then what the pipeline believes. A disabled source is reported as
 * disabled whatever else is true of it — its counters are the record
 * of when it was last read, not a claim about now — and a source
 * nothing has fetched is pending rather than healthy, because a source
 * that has never been read has nothing to be healthy about.
 *
 * `failing` reads the flag OR the streak rather than either alone.
 * They answer different questions and have different writers — the
 * streak is what is happening, the flag is what the rot detector
 * concluded and only an operator clears — so a row carrying one and
 * not the other still wants attention. Collapsing them would leave a
 * flagged source that has since succeeded once reading as healthy with
 * the flag still up.
 *
 * @param source - The row to read.
 * @returns Its status. Total: every source has exactly one.
 */
export function classifySource(source: Source): SourceStatus {
  if (!source.enabled) {
    return 'disabled';
  }

  if (source.lastSuccessAt === null && source.lastFailureAt === null) {
    return 'pending';
  }

  if (source.flagged || source.consecutiveFailures > 0) {
    return 'failing';
  }

  return 'active';
}

/**
 * How a list of sources divides by status.
 *
 * Pure and over a list rather than over a domain id, so the toolbar
 * can count the filtered view — the sources an operator searched for,
 * say — without this module growing a variant per filter.
 *
 * The literal names every member of {@link SourceStatus} explicitly
 * rather than reducing into an accumulator, which is what makes the
 * count exhaustive: a status added to the union is a key missing from
 * the return type, and the compiler refuses it here instead of a stat
 * row silently under-counting the table below it.
 *
 * @param sources - The sources to divide; `[]` is a complete answer.
 * @returns A count per status, zeros included. Adds up to
 * `sources.length` — {@link classifySource} is total.
 */
export function countSourceStatuses(
  sources: readonly Source[],
): SourceStatusCounts {
  const statuses = sources.map(classifySource);

  return {
    active: statuses.filter((status) => status === 'active').length,
    failing: statuses.filter((status) => status === 'failing').length,
    pending: statuses.filter((status) => status === 'pending').length,
    disabled: statuses.filter((status) => status === 'disabled').length,
  };
}

/**
 * The feeds of one domain, in configuration order.
 *
 * Scoped by numeric id rather than by slug: `./api.ts` is the module
 * that speaks slugs, and it resolves one through `getDomain`, whose
 * throw is where an unknown domain is refused. A domain with no
 * sources answers `[]`, which is a state the fixtures reach on purpose
 * rather than an error.
 *
 * @param domainId - The `domains.id` whose sources are wanted.
 * @returns Its sources, in configuration order. Never the stored
 * array.
 */
export function listSources(domainId: number): readonly Source[] {
  return SOURCES.filter((source) => source.domainId === domainId);
}

/**
 * Look a source up by id, tolerating a miss.
 *
 * Use this where an unknown id is an ordinary outcome — the sources
 * edit route carries one in the URL, so a stale bookmark reaches here
 * as a number nothing answers, and a document's `sourceId` is resolved
 * through it for the same reason. Where a miss would mean a broken
 * fixture instead, {@link getSource} says so louder.
 *
 * @param id - The `sources.id` wanted.
 * @returns The source, or `undefined` if no fixture carries that id.
 */
export function findSource(id: number): Source | undefined {
  return SOURCES_BY_ID.get(id);
}

/**
 * Look a source up by id, or throw.
 *
 * @param id - The `sources.id` wanted.
 * @returns The source carrying that id.
 * @throws If no fixture source carries it.
 */
export function getSource(id: number): Source {
  const source = findSource(id);

  if (source === undefined) {
    throw new Error(`Unknown source id: ${id}`);
  }

  return source;
}

/**
 * The health of one domain's feeds — what the stat row above the
 * sources table renders.
 *
 * Three of the four members are the cards the UI spec names: `active`
 * is "active sources", `failing` is "parse failures" and `pending` is
 * "pending configs". `disabled` is the fourth, which the stat row does
 * not show and the table's `StatusIndicator` does — it is here because
 * {@link classifySource} is total, and a status left out of the record
 * would be a source counted nowhere.
 *
 * Two readings are worth naming, because both are places where the
 * card's label and the figure under it are not quite the same claim:
 *
 * - `failing` counts SOURCES in a failing state, not failed documents.
 *   A count of `documents.parse_status = 'failed'` is a different
 *   number over a different table, and a figure counting one table
 *   above a table showing the other is the kind of thing that reads as
 *   a bug for as long as it takes somebody to check.
 * - `pending` counts sources nothing has fetched, which is a STAND-IN.
 *   A pending config is a proposed `parser_config` and `contract`
 *   waiting on an operator's approval, and `./types.ts` narrows both
 *   columns out of {@link Source}. The proposals themselves are a
 *   table of their own — `source_config_proposals`, which
 *   `./proposals.ts` now redeclares and carries rows for — so the
 *   stand-in is this FIGURE rather than the data behind it: nothing
 *   here counts those rows, and a card reading the queue as labelled
 *   is a different count over a different table.
 *
 * @param domainId - The `domains.id` whose sources are wanted.
 * @returns A count per status, zeros included; all zeros for a domain
 * with no sources.
 */
export function summarizeSources(domainId: number): SourceStatusCounts {
  return countSourceStatuses(listSources(domainId));
}
