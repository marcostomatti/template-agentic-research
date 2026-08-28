/**
 * @packageDocumentation
 * The cache layer: one hook per accessor in `./api.ts`, and the query
 * keys those hooks file their answers under.
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
 * The seven reads that take no domain are filed under
 * {@link DEPLOYMENT_SCOPE} instead, and that asymmetry is the point
 * rather than an oversight. `./api.ts` names all seven and says why
 * each one is deployment-level; the cache consequence is that
 * prefixing them with the active slug would evict and re-read the
 * whole topbar, the sidebar's spend figure, the tools surface's
 * connector cards and the entire settings surface on every switch —
 * work whose answer cannot have changed, and a visible flash of
 * loading state in chrome that the spec says stays put.
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
 * ## Two omissions, so they read as decisions
 *
 * No hook loads a single row by id, because `./api.ts` exposes no
 * accessor that does — every modal sub-route in this plan renders a
 * placeholder carrying its route parameter. And nothing here is
 * `enabled`-gated: every read is unconditional, since a hook whose
 * accessor cannot fail to have an argument has nothing to wait for.
 *
 * Note this file is `.ts`, so `@ar/web`'s ESLint config applies
 * `react-hooks` to it not at all — the plugin is scoped to the JSX
 * extensions alone.
 * Nothing here is checked for conditional calls or dependency arrays.
 * The hooks are kept to one shape (resolve, key, read) so that the
 * missing check has nothing to catch.
 */

import type { ExportSubscriptionSummary } from './connectors';
import type { CategorySummary } from './lexicon';
import type { SourceStatusCounts } from './sources';
import type {
  Connector,
  Document,
  Domain,
  Finding,
  Persona,
  Settings,
  Source,
  SpendSummary,
} from './types';
import type {
  NotificationItem,
  ProfileMenuUser,
  SearchSuggestion,
} from '@ar/ui';

import { useCache } from '@ar/ui/cache';

import {
  fetchCategorySummaries,
  fetchConnectors,
  fetchDocuments,
  fetchDomain,
  fetchDomains,
  fetchExportSubscriptions,
  fetchFindings,
  fetchNotifications,
  fetchOperator,
  fetchPersonas,
  fetchSearchSuggestions,
  fetchSettings,
  fetchSourceStatusCounts,
  fetchSources,
  fetchSpendSummary,
  fetchVerdicts,
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
 * The resources a domain-scoped key may name.
 *
 * Closed so a key cannot be built from a typo: `'finding'` for
 * `'findings'` would be a cache entry nothing else ever reads, which
 * is a refetch on every render and no error anywhere.
 */
export type DomainResource =
  | 'category-summaries'
  | 'documents'
  | 'domain'
  | 'export-subscriptions'
  | 'findings'
  | 'personas'
  | 'source-status-counts'
  | 'sources'
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
 * The options every hook in this module passes to `useCache`.
 *
 * One shared frozen object rather than a literal repeated sixteen
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
