/**
 * @packageDocumentation
 * The cache layer: one hook per accessor in `./api.ts` — a read hook
 * per read, a mutation hook per write — and the query keys both
 * halves file under.
 *
 * The two namings are deliberately different. A read's `fetchX`
 * becomes `useX`; a write keeps its own verb, so `saveSource` becomes
 * {@link useSaveSource} and `approveSourceConfig` becomes
 * {@link useApproveSourceConfig}. `./api.ts` says why those verbs are
 * not all `save` — ruling on a proposal is not editing one — and
 * flattening them here would leave one undifferentiated list in which
 * the only thing a caller needs to know, which of these records
 * something, is the one thing the name no longer says.
 * `./hooks.test.ts` derives BOTH namings from the barrel's own export
 * list, so an accessor added there and left unwrapped here fails
 * rather than sending a page off to import it directly.
 *
 * Pages call the hooks below and nothing else. `./api.ts` is what they
 * read THROUGH — it is imported here and by no page — so the q15 swap
 * from fixtures to endpoints still touches one module, and this one
 * inherits the change without an edit. A page importing an accessor
 * directly would render the same today and lose its loading and error
 * states on the day the read stops resolving on a microtask.
 *
 * ## The keys
 *
 * A domain-scoped read is filed under `[slug, resource]` — the active
 * domain's slug FIRST, which is what makes a domain switch a different
 * key and therefore a different cache entry, rather than the same
 * entry answering with the previous domain's rows until something
 * invalidates it.
 *
 * The eight reads that take no domain are filed under
 * {@link DEPLOYMENT_SCOPE} instead, and that asymmetry is the point
 * rather than an oversight. `./api.ts` names all eight and says why
 * each one is deployment-level; the cache consequence is that
 * prefixing them with the active slug would evict and re-read the
 * whole topbar, the sidebar's spend figure, the tools surface's
 * connector cards and the entire settings surface on every switch —
 * work whose answer cannot have changed, and a visible flash of
 * loading state in chrome that the spec says stays put.
 *
 * A SINGLE-ROW read files under its list's own two segments with the
 * row's id appended — what {@link domainRowQueryKey} and
 * {@link deploymentRowQueryKey} build. Sharing the list's prefix is
 * the design and not a coincidence, and the invalidation section
 * below is where it pays: a write that invalidates a list re-reads
 * every row loaded out of that list too, so no mutation here had to
 * grow a key when these five landed. The id is stringified so a key
 * stays `string[]` end to end; a number would hash the same and read
 * as a second key shape nobody declared.
 *
 * {@link useTerms} and {@link useSourceFailures} borrow that same
 * three-segment shape without being row reads: each one's last
 * segment is the PARENT its rows hang off rather than an answered
 * row's own id, so `[slug, 'terms']` is every category's vocabulary
 * and the segment below it is one category's. What the builder owns
 * is the one-segment extension, not the meaning of the segment — and
 * the prefix pays here too, {@link useSaveCategoryTerms} and
 * {@link useResolveSourceFailure} each naming no parent and so
 * invalidating every list at once.
 *
 * {@link useSourceFailures} files under a resource of its OWN
 * (`source-failures`) rather than under `documents`, and that is the
 * one place the two borrowers differ. Nothing else files anything
 * under `terms`, so the segment beneath it can only mean one thing;
 * `documents` already carries {@link useDocuments}' whole-domain
 * list, and a third segment there would be a SOURCE's id sitting in
 * the position every other three-segment key in this module reads as
 * the answered row's. One position, two meanings, under one resource
 * — which is exactly the collision the key space is shaped to make
 * impossible. The cost is that {@link useResolveSourceFailure} names
 * two keys instead of relying on one prefix, and that cost is worth
 * naming rather than paying silently.
 *
 * {@link DEPLOYMENT_SCOPE} carries an `@`, which no domain slug does
 * (slugs are lowercase-kebab natural keys), so the two key spaces
 * cannot collide however either grows. A bare `['connectors']` would
 * rely on the two shapes staying different LENGTHS, which is true
 * today and true only by accident.
 *
 * ## Where the slug is resolved
 *
 * Here, and only here. Every hook takes the raw `:domainSlug` route
 * param — `undefined` off the domain-scoped routes — and puts it
 * through `resolveDomainSlug` before it reaches either the key or the
 * accessor. That keeps `./api.ts`'s rule (callers hand over a RESOLVED
 * slug) satisfied without a page having to remember it, and it is what
 * stops `/` and `/d/example-tech-radar` from keeping two cache entries
 * holding the same rows: two spellings of one domain, one key.
 *
 * ## What is deliberately left off
 *
 * POLLING. `useCache` exposes no interval at all — its options are
 * `staleTime`, `gcTime`, `enabled`, `refetchOnWindowFocus` and
 * `select` — so there is nothing here to turn on and nothing for a
 * later author to find. A surface that genuinely needs to watch
 * something changing (a source being re-crawled) wants an explicit
 * refetch or a subscription, not a timer under every read in the app.
 *
 * REFETCH ON FOCUS. `useCache` already defaults it to `false`;
 * {@link READ_OPTIONS} passes it anyway, so the app's behaviour is
 * pinned in the app rather than borrowed from a default in another
 * package that could move without this one noticing.
 *
 * Both matter more against fixtures than they look: every fetcher here
 * resolves from memory, so a poll or a focus refetch would cost
 * nothing measurable and hide exactly the staleness a real endpoint
 * would expose.
 *
 * ## One omission, so it reads as a decision
 *
 * Nothing here is `enabled`-gated: every read is unconditional, since
 * a hook whose accessor cannot fail to have an argument has nothing
 * to wait for. That covers the five SINGLE-ROW hooks too, which is
 * the case it looks least true of: a modal sub-route renders only
 * once its `:entityId` has matched a segment, so there is no interval
 * in which the id is absent and the read has to be held back. A hook
 * gated on an argument it always has would be a loading state that
 * never resolves for the one reason nothing reports.
 *
 * ## A write invalidates keys; it does not write to the cache
 *
 * Each mutation below names the keys its accessor can change and
 * invalidates exactly those. It never puts the saved row into the
 * cache itself. Both approaches put the new value on screen, and only
 * one of them survives the day this seam stops being a fixture.
 *
 * A hand-written cache update is a SECOND implementation of the read.
 * It has to know that editing a source also moves the status counts
 * above the table, that an export summary carries a connector the
 * edit may have re-pointed, that a domain list comes back seeded-first
 * — every derivation `./api.ts` and the fixture modules already own,
 * restated somewhere nothing compares the two. They agree on the day
 * they are written and drift on the day either side moves, and the
 * drift is invisible: a cache holding a plausible wrong row renders
 * exactly like one holding the right row, until a reload replaces it
 * with what the server actually thinks.
 *
 * Invalidating by key claims less and therefore cannot be wrong. It
 * asks the read to run again and answer with whatever it answers,
 * which is the read's job and is tested as such next door. Today that
 * costs a microtask against a fixture; after the swap it costs a
 * request, and the endpoint's answer — including whatever the server
 * decided the row became — arrives without anything here having
 * predicted it.
 *
 * ## Which keys, and why the list is sometimes not one
 *
 * "Exactly the keys this write can change" binds in both directions.
 * Too few leaves a surface stale for the whole of `useCache`'s default
 * `staleTime`, which is a save that looks like it did nothing. Too
 * many re-read work whose answer cannot have changed, which is the
 * cost {@link DEPLOYMENT_SCOPE} exists to avoid on a domain switch.
 *
 * Three are worth reading rather than assuming:
 *
 * - {@link useSaveSource} invalidates TWO keys. The stat cards above
 *   the sources table are a separate read counting the same rows, and
 *   `./api.ts` composes this tab's edits into both — so a save that
 *   disabled a source and left `source-status-counts` alone would put
 *   the cards and the table into exactly the disagreement
 *   `summarizeSources` exists to prevent.
 * - {@link useSaveCategoryTerms} invalidates the category SUMMARIES,
 *   which a term save changes at the seam and does NOT change today.
 *   `summarizeCategories` builds its per-category literal in its own
 *   body, so `./api.ts` composes no draft into that read and names it
 *   as the overlay's one real narrowing; the re-read is therefore
 *   correct and currently answers the same card. The key belongs to
 *   the WRITE, not to the overlay, which is what stops this list
 *   needing a revisit on swap day. Its SECOND key is the term list,
 *   which arrived with {@link useTerms} exactly as this bullet used
 *   to say it would — and as the two-segment PREFIX, the save naming
 *   no category to key one on.
 * - {@link useApproveSourceConfig} invalidates ONE key, and that is
 *   the last empty list in this module going away: it named nothing
 *   while `fetchSourceProposals` did not exist, and gained
 *   `[slug, 'source-proposals']` in the commit that wrote the read.
 *   The shape it was the reason for stays — these are a LIST of whole
 *   keys rather than one key that might arrive empty, because
 *   `invalidateQueries` with an EMPTY key matches every query in the
 *   cache and the weakest write here would silently become the most
 *   expensive one. Nothing declares an empty list today, and the test
 *   next door asserts that as a set rather than assuming it.
 * - {@link useResolveSourceFailure} invalidates TWO keys for the
 *   reason given above: the whole-domain document list it can change,
 *   and the `[slug, 'source-failures']` PREFIX, since a ruling names
 *   no source and so has to reach every source's queue.
 *
 * Keys match by PREFIX, which is load-bearing rather than incidental.
 * The single-row reads file under a list's own two segments with an
 * id appended, so every list named in these key lists already covers
 * whichever rows an editor has loaded out of it, and none of them had
 * to grow when those reads landed. {@link useSaveSource} invalidating
 * `[slug, 'sources']` re-reads the table AND the source a modal is
 * holding open above it.
 *
 * The invalidation is AWAITED — `onSuccess` hands its promise back —
 * so a mutation stays pending until the reads it invalidated have
 * settled. That is what lets a modal close on `mutateAsync` with the
 * list behind it already right, rather than racing its own refetch.
 *
 * ## No `react-hooks` rule reads this file
 *
 * It is `.ts`, and `@ar/web`'s ESLint config extends the
 * `react-hooks` plugin under the JSX extensions alone. Nothing here is
 * checked for a conditional call, a call out of order, or a stale
 * dependency list, so all three are hand-checked — and the shapes are
 * kept few enough that hand-checking is a reading rather than an
 * audit.
 *
 * There are exactly two. A read is resolve, key, read: one `useCache`,
 * unconditional, at the top of the function. A write is resolve, keys,
 * record: one {@link useInvalidatingMutation}, which is itself one
 * `useQueryClient` followed by one `useMutation`, unconditional and in
 * that order for every one of the nine. No branch, loop or early
 * return sits above any of them, and no hook here calls another
 * conditionally.
 *
 * There is also no dependency list in this module to get stale,
 * because nothing here calls `useMemo`, `useCallback` or `useEffect`.
 * That is deliberate rather than lucky: a memo is the obvious place to
 * park a key array or a mutation function, and the rule that catches a
 * stale one is precisely the rule this file does not get. So the
 * arrays and closures are rebuilt every render instead — react-query
 * hashes a query key by VALUE, and reads a mutation's options fresh
 * per call, so rebuilding costs nothing either of them notices.
 */

import type { ExportSubscriptionSummary } from './connectors';
import type { CategorySummary } from './lexicon';
import type { SourceConfigProposal } from './proposals';
import type { SourceStatusCounts } from './sources';
import type {
  Category,
  Connector,
  Document,
  Domain,
  Entity,
  ExportSubscription,
  Finding,
  Persona,
  Settings,
  Source,
  SpendSummary,
  Term,
} from './types';
import type {
  NotificationItem,
  ProfileMenuUser,
  SearchSuggestion,
} from '@ar/ui';

import { useCache, useMutation, useQueryClient } from '@ar/ui/cache';

import {
  approveSourceConfig,
  fetchCategory,
  fetchCategorySummaries,
  fetchConnector,
  fetchConnectors,
  fetchDocuments,
  fetchDomain,
  fetchDomains,
  fetchEntities,
  fetchExportSubscriptions,
  fetchFinding,
  fetchFindings,
  fetchNotifications,
  fetchOperator,
  fetchPersona,
  fetchPersonas,
  fetchSearchSuggestions,
  fetchSettings,
  fetchSource,
  fetchSourceFailures,
  fetchSourceProposals,
  fetchSourceStatusCounts,
  fetchSources,
  fetchSpendSummary,
  fetchTerms,
  fetchVerdicts,
  resolveSourceFailure,
  saveCategoryTerms,
  saveConnector,
  saveExportSubscriptions,
  saveFinding,
  savePersona,
  saveSettings,
  saveSource,
} from './api';
import { resolveDomainSlug } from './domains';

/**
 * What every hook here answers with.
 *
 * Written as the return type of `useCache` rather than restated,
 * because `@ar/ui/cache` re-exports the hook but NOT the
 * `UseCacheResult` interface behind it — a redeclared `{ data,
 * isLoading, isError, error, refetch }` would be a second copy of a
 * shape this package does not own, free to drift from the one the
 * pages actually receive.
 *
 * @typeParam T - What the underlying accessor resolves to.
 */
export type CachedRead<T> = ReturnType<typeof useCache<T>>;

/**
 * What every mutation hook here answers with.
 *
 * Written as the return type of `useMutation` for the reason
 * {@link CachedRead} is written as `useCache`'s: `@ar/ui/cache`
 * re-exports the hook but NOT the `UseMutationResult` interface behind
 * it, so a redeclared `{ mutate, mutateAsync, isPending, isError,
 * error, reset }` would be a second copy of a shape this package does
 * not own, free to drift from the one the editors actually receive.
 *
 * `void` and `Error` are pinned rather than left to the defaults.
 * Every write in `./api.ts` answers `Promise<void>` — that module says
 * why a save hands nothing back — and the only rejection any of them
 * can produce is the `Error` `getDomain` throws for a slug no domain
 * carries.
 *
 * @typeParam TVariables - What `mutate` takes: the row, the list of
 * rows, or the value the accessor records.
 */
export type RecordedWrite<TVariables> = ReturnType<
  typeof useMutation<void, Error, TVariables>
>;

/**
 * The resources a domain-scoped key may name.
 *
 * Closed so a key cannot be built from a typo: `'finding'` for
 * `'findings'` would be a cache entry nothing else ever reads, which
 * is a refetch on every render and no error anywhere. `categories`
 * and `category-summaries` are the one pair here that reads as such a
 * typo and is not: the lexicon grid renders COUNTED summaries and the
 * term editor loads the category row itself, so they are two shapes
 * that would answer each other's readers if they shared a key.
 */
export type DomainResource =
  | 'categories'
  | 'category-summaries'
  | 'documents'
  | 'domain'
  | 'entities'
  | 'export-subscriptions'
  | 'findings'
  | 'personas'
  | 'source-failures'
  | 'source-proposals'
  | 'source-status-counts'
  | 'sources'
  | 'terms'
  | 'verdicts';

/**
 * The resources a deployment-level key may name.
 *
 * Separate from {@link DomainResource} rather than one union with a
 * comment, so that filing a domain-scoped read under
 * {@link deploymentQueryKey} — the mistake that would freeze a
 * surface across a domain switch — does not type-check.
 */
export type DeploymentResource =
  | 'connectors'
  | 'domains'
  | 'notifications'
  | 'operator'
  | 'search-suggestions'
  | 'settings'
  | 'spend-summary';

/**
 * The first segment of every key that is NOT about one domain.
 *
 * The `@` is load-bearing: domain slugs are lowercase-kebab natural
 * keys, so no slug can ever equal this and the two key spaces stay
 * disjoint by construction rather than by both happening to be short.
 */
export const DEPLOYMENT_SCOPE = '@deployment';

/**
 * The options every READ hook in this module passes to `useCache`.
 *
 * The write half passes none: a mutation has no `staleTime` to set and
 * no focus behaviour to pin, and what it does declare — which keys it
 * invalidates — is per hook rather than shared.
 *
 * One shared frozen object rather than a literal repeated twenty-five
 * times, so "what this app's reads do" is one line to read and one
 * line to change. Frozen because it is handed to every call: an
 * options object a caller could write through would change the
 * behaviour of every read after it.
 *
 * `refetchOnWindowFocus` is `false` upstream too. It is repeated here
 * so the app states its own behaviour instead of inheriting a default
 * from `@ar/ui` that could move; see this module's header for why
 * polling has nothing to state.
 */
export const READ_OPTIONS = Object.freeze({ refetchOnWindowFocus: false });

/**
 * The cache key for one domain's copy of a resource.
 *
 * Resolves the slug on the way through, so the single-domain base's
 * absent route param and an explicit `/d/example-tech-radar` produce
 * the SAME key and share one cache entry.
 *
 * @param domainSlug - The `:domainSlug` route param; `undefined`,
 * `null` or empty off the domain-scoped routes.
 * @param resource - Which read this key is for.
 * @returns A fresh two-segment key, the resolved slug first.
 */
export function domainQueryKey(
  domainSlug: string | null | undefined,
  resource: DomainResource,
): string[] {
  return [resolveDomainSlug(domainSlug), resource];
}

/**
 * The cache key for a resource that belongs to the deployment rather
 * than to any one domain.
 *
 * Takes no slug, which is the whole claim: there is no argument here
 * a domain switch could change, so the entry survives the switch and
 * the chrome above it never re-reads.
 *
 * @param resource - Which read this key is for.
 * @returns A fresh two-segment key under {@link DEPLOYMENT_SCOPE}.
 */
export function deploymentQueryKey(resource: DeploymentResource): string[] {
  return [DEPLOYMENT_SCOPE, resource];
}

/**
 * The cache key for ONE row of a domain's copy of a resource.
 *
 * Built ON TOP of {@link domainQueryKey} rather than beside it, which
 * is what makes the prefix relationship this module's header rests on
 * a property of the code instead of two literals agreeing: a row's key
 * IS its list's key with one segment appended, so a change to the list
 * key shape carries here without an edit.
 *
 * @param domainSlug - The `:domainSlug` route param; `undefined`,
 * `null` or empty off the domain-scoped routes.
 * @param resource - Which read this key is for.
 * @param id - The row's own id, off `:entityId`.
 * @returns A fresh three-segment key, the resolved slug first and the
 * id stringified last.
 */
export function domainRowQueryKey(
  domainSlug: string | null | undefined,
  resource: DomainResource,
  id: number,
): string[] {
  return [...domainQueryKey(domainSlug, resource), String(id)];
}

/**
 * The cache key for ONE row of a resource the deployment owns.
 *
 * The same one-segment extension {@link domainRowQueryKey} performs,
 * over the other half of the key space. One member today — a
 * connector — and written as a builder anyway, because the alternative
 * is a literal at the one call site, which is exactly how the two key
 * spaces would start to drift apart.
 *
 * @param resource - Which read this key is for.
 * @param id - The row's own id, off `:entityId`.
 * @returns A fresh three-segment key under {@link DEPLOYMENT_SCOPE}.
 */
export function deploymentRowQueryKey(
  resource: DeploymentResource,
  id: number,
): string[] {
  return [...deploymentQueryKey(resource), String(id)];
}

/**
 * The active domain itself — its name for the chrome, its settings for
 * the pages that read them.
 *
 * Also how a surface learns that a bookmarked `/d/:domainSlug` names a
 * domain that has gone: `fetchDomain` rejects, and this reports it as
 * an error state rather than an exception through the render.
 *
 * @param domainSlug - The `:domainSlug` route param.
 * @returns The domain, or the error state for a slug nothing carries.
 */
export function useDomain(domainSlug?: string | null): CachedRead<Domain> {
  const slug = resolveDomainSlug(domainSlug);

  return useCache(
    domainQueryKey(slug, 'domain'),
    () => fetchDomain(slug),
    READ_OPTIONS,
  );
}

/**
 * The verdicts this domain's findings may carry — the digest's verdict
 * filter, in ladder order.
 *
 * @param domainSlug - The `:domainSlug` route param.
 * @returns Its ladder, most negative first.
 */
export function useVerdicts(
  domainSlug?: string | null,
): CachedRead<readonly string[]> {
  const slug = resolveDomainSlug(domainSlug);

  return useCache(
    domainQueryKey(slug, 'verdicts'),
    () => fetchVerdicts(slug),
    READ_OPTIONS,
  );
}

/**
 * This domain's captured documents — what the digest's rows were made
 * FROM, joined to the findings by id in the page.
 *
 * @param domainSlug - The `:domainSlug` route param.
 * @returns Its documents, newest capture first.
 */
export function useDocuments(
  domainSlug?: string | null,
): CachedRead<readonly Document[]> {
  const slug = resolveDomainSlug(domainSlug);

  return useCache(
    domainQueryKey(slug, 'documents'),
    () => fetchDocuments(slug),
    READ_OPTIONS,
  );
}

/**
 * This domain's findings — what the digest surface is a list of.
 *
 * @param domainSlug - The `:domainSlug` route param.
 * @returns Its findings, highest score first with the unscored last.
 */
export function useFindings(
  domainSlug?: string | null,
): CachedRead<readonly Finding[]> {
  const slug = resolveDomainSlug(domainSlug);

  return useCache(
    domainQueryKey(slug, 'findings'),
    () => fetchFindings(slug),
    READ_OPTIONS,
  );
}

/**
 * This domain's subjects — what its findings are about, joined to them
 * by id in the page.
 *
 * A separate read from {@link useFindings} rather than a field on it,
 * for the reason `./digest.ts` keeps the tables apart: the page
 * performs the join a q15 endpoint would otherwise have to invent a
 * flattened row shape for.
 *
 * @param domainSlug - The `:domainSlug` route param.
 * @returns Its entities, in id order.
 */
export function useEntities(
  domainSlug?: string | null,
): CachedRead<readonly Entity[]> {
  const slug = resolveDomainSlug(domainSlug);

  return useCache(
    domainQueryKey(slug, 'entities'),
    () => fetchEntities(slug),
    READ_OPTIONS,
  );
}

/**
 * One counted card per lexicon category — what the lexicon surface
 * renders.
 *
 * @param domainSlug - The `:domainSlug` route param.
 * @returns A summary per category, in seed order.
 */
export function useCategorySummaries(
  domainSlug?: string | null,
): CachedRead<readonly CategorySummary[]> {
  const slug = resolveDomainSlug(domainSlug);

  return useCache(
    domainQueryKey(slug, 'category-summaries'),
    () => fetchCategorySummaries(slug),
    READ_OPTIONS,
  );
}

/**
 * This domain's configured sources — the sources surface's table.
 *
 * @param domainSlug - The `:domainSlug` route param.
 * @returns Its sources, in configuration order.
 */
export function useSources(
  domainSlug?: string | null,
): CachedRead<readonly Source[]> {
  const slug = resolveDomainSlug(domainSlug);

  return useCache(
    domainQueryKey(slug, 'sources'),
    () => fetchSources(slug),
    READ_OPTIONS,
  );
}

/**
 * How those sources are doing, one count per status — the stat cards
 * above the table.
 *
 * A read of its own rather than something the page counts off
 * {@link useSources}, for the reason `summarizeSources` gives: the
 * cards and the table have to agree.
 *
 * @param domainSlug - The `:domainSlug` route param.
 * @returns A count per status, zeros included.
 */
export function useSourceStatusCounts(
  domainSlug?: string | null,
): CachedRead<SourceStatusCounts> {
  const slug = resolveDomainSlug(domainSlug);

  return useCache(
    domainQueryKey(slug, 'source-status-counts'),
    () => fetchSourceStatusCounts(slug),
    READ_OPTIONS,
  );
}

/**
 * This domain's source-config proposals — the review queue behind the
 * sources surface's approval sub-route.
 *
 * Every status, not the pending ones alone, which is `./api.ts`'s
 * decision and not a hole in this key: the modal filters. That is why
 * one entry serves a queue that shrinks after an approval — the
 * ruling is recorded, {@link useApproveSourceConfig} invalidates this
 * key, and the row comes back carrying the status the modal then
 * filters it out on.
 *
 * @param domainSlug - The `:domainSlug` route param.
 * @returns Its proposals in review-queue order.
 */
export function useSourceProposals(
  domainSlug?: string | null,
): CachedRead<readonly SourceConfigProposal[]> {
  const slug = resolveDomainSlug(domainSlug);

  return useCache(
    domainQueryKey(slug, 'source-proposals'),
    () => fetchSourceProposals(slug),
    READ_OPTIONS,
  );
}

/**
 * This domain's personas — the agents surface's cards.
 *
 * @param domainSlug - The `:domainSlug` route param.
 * @returns Its personas, in role order.
 */
export function usePersonas(
  domainSlug?: string | null,
): CachedRead<readonly Persona[]> {
  const slug = resolveDomainSlug(domainSlug);

  return useCache(
    domainQueryKey(slug, 'personas'),
    () => fetchPersonas(slug),
    READ_OPTIONS,
  );
}

/**
 * This domain's deliveries with their destinations resolved — the
 * export list on the tools surface.
 *
 * The half of that surface which moves with the domain; the connector
 * cards above it come from {@link useConnectors} and do not.
 *
 * @param domainSlug - The `:domainSlug` route param.
 * @returns A summary per subscription, in subscription order.
 */
export function useExportSubscriptions(
  domainSlug?: string | null,
): CachedRead<readonly ExportSubscriptionSummary[]> {
  const slug = resolveDomainSlug(domainSlug);

  return useCache(
    domainQueryKey(slug, 'export-subscriptions'),
    () => fetchExportSubscriptions(slug),
    READ_OPTIONS,
  );
}

/**
 * Every domain this deployment knows — what the topbar switcher lists.
 *
 * Deployment-scoped, and the clearest case for it: a list of domains
 * filed under the active domain would be re-read on every switch to
 * answer with itself.
 *
 * @returns The domains, in switcher order.
 */
export function useDomains(): CachedRead<readonly Domain[]> {
  return useCache(
    deploymentQueryKey('domains'),
    fetchDomains,
    READ_OPTIONS,
  );
}

/**
 * Every connector this deployment has configured — the tools surface's
 * cards.
 *
 * @returns The connectors, in configuration order.
 */
export function useConnectors(): CachedRead<readonly Connector[]> {
  return useCache(
    deploymentQueryKey('connectors'),
    fetchConnectors,
    READ_OPTIONS,
  );
}

/**
 * The operator's own preferences — the settings surface.
 *
 * @returns The settings, unchanged by any domain switch.
 */
export function useSettings(): CachedRead<Settings> {
  return useCache(
    deploymentQueryKey('settings'),
    fetchSettings,
    READ_OPTIONS,
  );
}

/**
 * This week's model spend — the sidebar's figure under the nav.
 *
 * @returns The week's summary.
 */
export function useSpendSummary(): CachedRead<SpendSummary> {
  return useCache(
    deploymentQueryKey('spend-summary'),
    fetchSpendSummary,
    READ_OPTIONS,
  );
}

/**
 * The search palette behind the topbar's input.
 *
 * Deployment-scoped like the rest of the chrome, which `./api.ts`
 * records as the one KNOWN NARROWING in that set — a live search
 * endpoint would be domain-scoped, and this key moves with it.
 *
 * @returns The suggestions, in panel order.
 */
export function useSearchSuggestions(): CachedRead<readonly SearchSuggestion[]> {
  return useCache(
    deploymentQueryKey('search-suggestions'),
    fetchSearchSuggestions,
    READ_OPTIONS,
  );
}

/**
 * What the topbar's bell reports.
 *
 * @returns The notifications, newest first.
 */
export function useNotifications(): CachedRead<readonly NotificationItem[]> {
  return useCache(
    deploymentQueryKey('notifications'),
    fetchNotifications,
    READ_OPTIONS,
  );
}

/**
 * The operator this shell is running as — the topbar's avatar.
 *
 * @returns The operator stub.
 */
export function useOperator(): CachedRead<ProfileMenuUser> {
  return useCache(
    deploymentQueryKey('operator'),
    fetchOperator,
    READ_OPTIONS,
  );
}

/**
 * One finding — what the digest's detail modal renders.
 *
 * The slug stays FIRST and the id is required, which is why these five
 * spell their first parameter out rather than defaulting it: an
 * optional parameter cannot precede a required one, and the id is not
 * optional — a modal sub-route matched a segment to get here.
 *
 * @param domainSlug - The `:domainSlug` route param.
 * @param id - The `:entityId` route param, as a number.
 * @returns The finding, or the error state for an id this domain has
 * no finding for.
 */
export function useFinding(
  domainSlug: string | null | undefined,
  id: number,
): CachedRead<Finding> {
  const slug = resolveDomainSlug(domainSlug);

  return useCache(
    domainRowQueryKey(slug, 'findings', id),
    () => fetchFinding(slug, id),
    READ_OPTIONS,
  );
}

/**
 * One source — what the sources surface's editor loads.
 *
 * Read by three of that surface's sub-routes, since the config
 * approval and the failures list both name a source they do not edit.
 *
 * @param domainSlug - The `:domainSlug` route param.
 * @param id - The `:entityId` route param, as a number.
 * @returns The source, or the error state for an id this domain has
 * no source for.
 */
export function useSource(
  domainSlug: string | null | undefined,
  id: number,
): CachedRead<Source> {
  const slug = resolveDomainSlug(domainSlug);

  return useCache(
    domainRowQueryKey(slug, 'sources', id),
    () => fetchSource(slug, id),
    READ_OPTIONS,
  );
}

/**
 * One persona — what the agents surface's editor loads.
 *
 * @param domainSlug - The `:domainSlug` route param.
 * @param id - The `:entityId` route param, as a number.
 * @returns The persona, or the error state for an id this domain has
 * no persona for.
 */
export function usePersona(
  domainSlug: string | null | undefined,
  id: number,
): CachedRead<Persona> {
  const slug = resolveDomainSlug(domainSlug);

  return useCache(
    domainRowQueryKey(slug, 'personas', id),
    () => fetchPersona(slug, id),
    READ_OPTIONS,
  );
}

/**
 * One lexicon category — what the term editor is opened on.
 *
 * Filed under `categories` rather than under `category-summaries`,
 * which the union's own docblock argues is the one confusable pair
 * here: the grid reads counted summaries and this reads the row, and
 * sharing a key would have each answering the other's reader.
 *
 * @param domainSlug - The `:domainSlug` route param.
 * @param id - The `:entityId` route param, as a number.
 * @returns The category, or the error state for an id this domain has
 * no category for.
 */
export function useCategory(
  domainSlug: string | null | undefined,
  id: number,
): CachedRead<Category> {
  const slug = resolveDomainSlug(domainSlug);

  return useCache(
    domainRowQueryKey(slug, 'categories', id),
    () => fetchCategory(slug, id),
    READ_OPTIONS,
  );
}

/**
 * One connector — what the tools surface's editor loads.
 *
 * The one single-row hook that takes no slug, exactly as
 * {@link useConnectors} takes none: `connectors` carries no
 * `domain_id`, so the entry survives a domain switch and the editor
 * above it does not reload.
 *
 * @param id - The `:entityId` route param, as a number.
 * @returns The connector, or the error state for an id nothing
 * carries.
 */
export function useConnector(id: number): CachedRead<Connector> {
  return useCache(
    deploymentRowQueryKey('connectors', id),
    () => fetchConnector(id),
    READ_OPTIONS,
  );
}

/**
 * One category's vocabulary — what the lexicon's term editor lists.
 *
 * Filed under the SAME three-segment shape the single-row hooks use,
 * and it is the one place that shape's last segment is not the
 * answered row's id: a term list is keyed by the CATEGORY it hangs
 * off, so `[slug, 'terms', '<categoryId>']` is one category's
 * vocabulary and `[slug, 'terms']` is every category's. Built through
 * {@link domainRowQueryKey} anyway rather than as a literal, because
 * what that builder actually owns is the one-segment extension of a
 * list key — and it is exactly the prefix relationship
 * {@link useSaveCategoryTerms} invalidates on, a save naming no
 * category and so having to reach all of them.
 *
 * The slug segment is what stops a term list outliving a domain
 * switch. Category ids are unique across domains in the schema, so
 * the id alone would be a correct-looking key that survives one — and
 * `./api.ts` refuses a category of another domain, so the entry that
 * survived would be one the read behind it now rejects.
 *
 * @param domainSlug - The `:domainSlug` route param.
 * @param categoryId - The `:entityId` route param, as a number.
 * @returns Its terms in seed order, or the error state for an id this
 * domain has no category for.
 */
export function useTerms(
  domainSlug: string | null | undefined,
  categoryId: number,
): CachedRead<readonly Term[]> {
  const slug = resolveDomainSlug(domainSlug);

  return useCache(
    domainRowQueryKey(slug, 'terms', categoryId),
    () => fetchTerms(slug, categoryId),
    READ_OPTIONS,
  );
}

/**
 * One source's failed captures — the list behind the sources
 * surface's failures sub-route.
 *
 * The second of the two three-segment borrowers, and the one whose
 * resource had to be invented: this module's header carries why
 * `source-failures` rather than a third segment under `documents`,
 * which is the spelling a reader reaches for first. The short version
 * is that `documents` already has a whole-domain list hook, so the
 * segment beneath it is read as an answered document's id — and a
 * SOURCE's id in that position is one key shape meaning two things.
 *
 * The cost is real and is paid next door rather than hidden: the two
 * resources are disjoint, so {@link useResolveSourceFailure} names
 * `[slug, 'documents']` AND `[slug, 'source-failures']` instead of
 * reaching both through one prefix.
 *
 * The slug segment is what stops a failures list outliving a domain
 * switch. Source ids are unique across domains in the schema, so the
 * id alone would be a correct-looking key that survives one — and
 * `./api.ts` refuses a source of another domain, so the entry that
 * survived would be one the read behind it now rejects.
 *
 * @param domainSlug - The `:domainSlug` route param.
 * @param sourceId - The `:entityId` route param, as a number.
 * @returns Its failed captures, newest first, or the error state for
 * an id this domain has no source for.
 */
export function useSourceFailures(
  domainSlug: string | null | undefined,
  sourceId: number,
): CachedRead<readonly Document[]> {
  const slug = resolveDomainSlug(domainSlug);

  return useCache(
    domainRowQueryKey(slug, 'source-failures', sourceId),
    () => fetchSourceFailures(slug, sourceId),
    READ_OPTIONS,
  );
}

/**
 * One cache key, as this module's two builders hand one over.
 *
 * Named so {@link useInvalidatingMutation} can take a LIST of keys
 * without a reader having to work out whether the inner array is one
 * key or a set of segments to match on. Spelled `CacheKey` rather than
 * `QueryKey` because `@ar/ui/cache` re-exports a `QueryKey` of its own
 * from react-query, and two spellings of one word in one file is worse
 * than a second word. See this module's header for why an empty MEMBER
 * of this list would be a hazard and an empty list is not.
 */
type CacheKey = readonly string[];

/**
 * What {@link useApproveSourceConfig} rules on.
 *
 * The one variables type here that is DERIVED from its accessor rather
 * than named outright, because it is the one whose accessor cannot
 * name it either: `./api.ts` types that parameter on the draft store's
 * structural constraint on purpose, `./proposals.ts` being the module
 * that redeclares the proposal columns and arriving with the modal
 * that needs them. Derived, this narrows the day that module lands and
 * the accessor's signature follows it. Restated, it would be a second
 * declaration nobody would remember to move.
 */
type SourceConfigRuling = Parameters<typeof approveSourceConfig>[1];

/**
 * The one shape every write hook below has: record, then invalidate.
 *
 * Two hooks in a fixed order and nothing else — `useQueryClient`, then
 * `useMutation` — which is what makes the hand-check this file's
 * header owes a reading rather than an audit. Each write hook calls
 * this once, unconditionally, after resolving its slug.
 *
 * The invalidation runs in `onSuccess` rather than after the write
 * inside `mutationFn`, and that ordering is the point: a write that
 * REJECTED must invalidate nothing. Every scoped accessor here refuses
 * an unknown domain before recording a thing, so a failed save leaves
 * both the store and the cache exactly as they were, and the surface
 * renders the mutation's error instead of a set of reads that all
 * answered again with the same rows.
 *
 * `Promise.all` is handed BACK rather than fired and forgotten, so the
 * mutation stays pending until every invalidated read has settled.
 * Nothing here caps that: with no key it resolves immediately, and
 * with one it is a microtask against a fixture today and one request
 * after the swap.
 *
 * @typeParam TVariables - What `mutate` takes.
 * @param record - The write accessor, already bound to its domain
 * where it has one.
 * @param invalidates - Every key this write can change. May be empty,
 * and an empty LIST invalidates nothing; an empty KEY would match
 * everything, which is why no member of it is ever built here.
 * @returns The mutation, for a surface to call and to read state off.
 */
function useInvalidatingMutation<TVariables>(
  record: (variables: TVariables) => Promise<void>,
  invalidates: readonly CacheKey[],
): RecordedWrite<TVariables> {
  const client = useQueryClient();

  return useMutation<void, Error, TVariables>({
    mutationFn: record,
    onSuccess: () => Promise.all(
      invalidates.map((key) => client.invalidateQueries({ queryKey: key })),
    ),
  });
}

/**
 * Save one category's terms — what the lexicon editor's save does.
 *
 * TWO keys, which is the number its own docblock promised while the
 * second one had no read behind it. The category SUMMARIES because
 * the lexicon grid renders a counted card per category and its
 * polarity split is a reading of the very terms this saved; and the
 * TERM LIST itself, since {@link useTerms} is what the editor loaded
 * through and reopening it must not show the value this save
 * replaced.
 *
 * That second key is the LIST prefix `[slug, 'terms']` rather than
 * one category's `[slug, 'terms', '<id>']`, and the write is why:
 * `saveCategoryTerms` takes no category argument — every term names
 * its own — so there is no single category this could name. Prefix
 * matching turns that into the right behaviour rather than a
 * compromise: every category's list is re-read, and only the one open
 * has a reader to notice.
 *
 * One qualification stays, stated so a silent card is read as the
 * narrowing it is rather than as a broken invalidation. The summaries
 * re-read answers the SAME card today, because `./api.ts` composes no
 * draft into `fetchCategorySummaries` and says why — the key names
 * what this write changes, which is a property of the write and not
 * of the fixture overlay.
 *
 * @param domainSlug - The `:domainSlug` route param.
 * @returns The mutation; `mutate` takes the category's whole term
 * list, as the editor left it.
 */
export function useSaveCategoryTerms(
  domainSlug?: string | null,
): RecordedWrite<readonly Term[]> {
  const slug = resolveDomainSlug(domainSlug);

  return useInvalidatingMutation<readonly Term[]>(
    (terms) => saveCategoryTerms(slug, terms),
    [
      domainQueryKey(slug, 'category-summaries'),
      domainQueryKey(slug, 'terms'),
    ],
  );
}

/**
 * Save one finding — the digest row action's verdict, and whatever
 * else its detail modal edits.
 *
 * One key. The digest joins its findings to documents and entities in
 * the page, and neither of those tables is what a verdict changed, so
 * re-reading them would be work whose answer cannot have moved.
 *
 * @param domainSlug - The `:domainSlug` route param.
 * @returns The mutation; `mutate` takes the whole finding.
 */
export function useSaveFinding(
  domainSlug?: string | null,
): RecordedWrite<Finding> {
  const slug = resolveDomainSlug(domainSlug);

  return useInvalidatingMutation<Finding>(
    (finding) => saveFinding(slug, finding),
    [domainQueryKey(slug, 'findings')],
  );
}

/**
 * Save one source — the sources surface's editor.
 *
 * The one write with TWO keys, and this module's header says why: the
 * stat cards above the table are a separate read over the same rows,
 * so a save that moved a source between statuses and invalidated only
 * the table would leave the cards counting the old answer for the
 * whole of the read's stale window.
 *
 * @param domainSlug - The `:domainSlug` route param.
 * @returns The mutation; `mutate` takes the whole source.
 */
export function useSaveSource(
  domainSlug?: string | null,
): RecordedWrite<Source> {
  const slug = resolveDomainSlug(domainSlug);

  return useInvalidatingMutation<Source>(
    (source) => saveSource(slug, source),
    [
      domainQueryKey(slug, 'sources'),
      domainQueryKey(slug, 'source-status-counts'),
    ],
  );
}

/**
 * Rule on a pending source-config proposal — approve it, or reject it.
 *
 * ONE key, and this hook is where the module's empty-list precedent
 * ends: it named nothing while there was no read of the proposals to
 * key on, and its own docblock said the key would arrive with that
 * read. {@link useSourceProposals} is that read, and this is the key.
 *
 * The re-read is what makes an approval visible without this hook
 * knowing anything about statuses. `./api.ts` answers every status
 * and the modal filters to `pending`, so a ruled row comes back
 * carrying the status it was ruled to and drops out of the queue on
 * the same render — where a hand-written cache update would have had
 * to splice it out and would then be wrong about a rejection.
 *
 * @param domainSlug - The `:domainSlug` route param.
 * @returns The mutation; `mutate` takes the proposal row as ruled.
 */
export function useApproveSourceConfig(
  domainSlug?: string | null,
): RecordedWrite<SourceConfigRuling> {
  const slug = resolveDomainSlug(domainSlug);

  return useInvalidatingMutation<SourceConfigRuling>(
    (ruling) => approveSourceConfig(slug, ruling),
    [domainQueryKey(slug, 'source-proposals')],
  );
}

/**
 * Rule on one failed capture — the keep and discard actions on the
 * sources surface's failures list.
 *
 * TWO keys, and neither is redundant, because the two reads it can
 * change sit under DISJOINT resources: {@link useDocuments}' whole
 * domain list under `documents`, and {@link useSourceFailures}' queue
 * under `source-failures`. That second one is the two-segment PREFIX
 * rather than one source's three, and the write is why — a ruling
 * carries a document and names no source, so there is no single queue
 * this could key on. Prefix matching turns that into the right
 * behaviour rather than a compromise: every source's queue is
 * re-read, and only the one open has a reader to notice.
 *
 * The neighbour it deliberately leaves alone is worth naming: the
 * failing-source COUNT is not a count of failed documents.
 * `classifySource` reads a source's own flag and failure streak and
 * never opens a document, so a ruling here cannot move
 * `source-status-counts` and invalidating it would re-read a figure
 * that is about something else.
 *
 * @param domainSlug - The `:domainSlug` route param.
 * @returns The mutation; `mutate` takes the document as ruled.
 */
export function useResolveSourceFailure(
  domainSlug?: string | null,
): RecordedWrite<Document> {
  const slug = resolveDomainSlug(domainSlug);

  return useInvalidatingMutation<Document>(
    (document) => resolveSourceFailure(slug, document),
    [
      domainQueryKey(slug, 'documents'),
      domainQueryKey(slug, 'source-failures'),
    ],
  );
}

/**
 * Save one persona — the agents surface's editor.
 *
 * @param domainSlug - The `:domainSlug` route param.
 * @returns The mutation; `mutate` takes the whole persona.
 */
export function useSavePersona(
  domainSlug?: string | null,
): RecordedWrite<Persona> {
  const slug = resolveDomainSlug(domainSlug);

  return useInvalidatingMutation<Persona>(
    (persona) => savePersona(slug, persona),
    [domainQueryKey(slug, 'personas')],
  );
}

/**
 * Save one domain's export subscriptions — the format list on the
 * tools surface.
 *
 * Domain-scoped, unlike the connector cards directly above it on the
 * same surface. That asymmetry is `./api.ts`'s and it is visible here
 * as two hooks with different arities feeding one page.
 *
 * @param domainSlug - The `:domainSlug` route param.
 * @returns The mutation; `mutate` takes every subscription of the
 * domain, as the list left them.
 */
export function useSaveExportSubscriptions(
  domainSlug?: string | null,
): RecordedWrite<readonly ExportSubscription[]> {
  const slug = resolveDomainSlug(domainSlug);

  return useInvalidatingMutation<readonly ExportSubscription[]>(
    (subscriptions) => saveExportSubscriptions(slug, subscriptions),
    [domainQueryKey(slug, 'export-subscriptions')],
  );
}

/**
 * Save one connector — the tools surface's editor.
 *
 * Takes no slug and invalidates a deployment-level key, exactly as
 * {@link useConnectors} reads one: a connector is a fact about the
 * installation, so an operator who edits one and switches domain still
 * sees the edit rather than a re-read of somebody else's copy.
 *
 * The export list beside those cards is a KNOWN NARROWING rather than
 * a missing key. It joins each subscription to its connector through
 * the fixture layer, so it does not answer an edited connector at all
 * today and invalidating it would re-read the same summary — and the
 * key it would need carries a domain slug this hook has no other use
 * for. `./api.ts` documents the join.
 *
 * @returns The mutation; `mutate` takes the whole connector.
 */
export function useSaveConnector(): RecordedWrite<Connector> {
  return useInvalidatingMutation<Connector>(
    saveConnector,
    [deploymentQueryKey('connectors')],
  );
}

/**
 * Save the operator's preferences — the settings surface.
 *
 * Takes no slug and invalidates a deployment-level key: an operator is
 * a person and not a workspace, so there is one preference set and a
 * domain switch leaves it where it was.
 *
 * @returns The mutation; `mutate` takes the whole preference set.
 */
export function useSaveSettings(): RecordedWrite<Settings> {
  return useInvalidatingMutation<Settings>(
    saveSettings,
    [deploymentQueryKey('settings')],
  );
}
