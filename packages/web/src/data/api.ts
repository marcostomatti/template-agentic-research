/**
 * @packageDocumentation
 * The accessor barrel — the one module in this app that answers "where
 * does the data come from", and the one module q15 replaces when the
 * answer stops being a fixture.
 *
 * Everything above this line reads through it. `./hooks.ts` wraps each
 * accessor below in `useCache`, the pages call the hooks, and no page
 * or hook imports a fixture module directly. That is the whole point:
 * when the API waves land, the fixture modules beside this one are
 * deleted and the functions below are re-pointed at endpoints, and
 * nothing else in `src/` has to move.
 *
 * Three properties are what make that swap a re-point rather than a
 * rewrite, and each one costs something today to buy it.
 *
 * ASYNC, over fixtures that are already in memory. Every accessor here
 * returns a `Promise`, so every call site is written against one from
 * the first commit. A synchronous barrel would read better for exactly
 * as long as it takes to swap it, at which point every page that
 * rendered `listFindings(slug).map(...)` in its body becomes a page
 * that has to grow a loading state. Resolution is on a MICROTASK and
 * nothing here sleeps: a fake delay would buy no fidelity — the shape
 * of the call is what the pages are being rehearsed against, not its
 * latency — and would make every Playwright assertion race a timer.
 *
 * REJECTION, not a throw. {@link getDomain} throws on a slug no domain
 * carries, and {@link deliver} is what turns that into a rejected
 * promise: it is an `async` function, so a throw inside the callback
 * it invokes never escapes synchronously. That matters because the
 * consumer is a cache hook — a rejected promise is an error state a
 * page can render, while a synchronous throw out of a query function
 * reaches the render as an exception and takes the shell down with the
 * page. Any q15 endpoint answering 404 arrives the same way, so the
 * pages meet the same shape before and after.
 *
 * SLUG-SCOPED, over a fixture layer keyed on `domains.id`. The URL
 * carries `:domainSlug` and every list accessor beside this one takes
 * a numeric domain id; this module is the single place those two meet,
 * which is also the single place an unknown domain is refused. Callers
 * hand over a RESOLVED slug — `resolveDomainSlug(params.domainSlug)`
 * from `./domains.ts`, which turns the absent param of the
 * single-domain base into `DEFAULT_DOMAIN_SLUG` — never the raw route
 * param.
 *
 * Seven accessors take no slug at all, and the rule has to name them
 * or it claims something false about nearly half the barrel:
 * {@link fetchDomains} (the switcher's own list — a domain list cannot
 * be scoped to a domain), {@link fetchConnectors} (`connectors` has no
 * `domain_id`; a connector is a fact about the installation),
 * {@link fetchSettings}, {@link fetchSpendSummary},
 * {@link fetchSearchSuggestions}, {@link fetchNotifications} and
 * {@link fetchOperator} (all four mirror no table at all — see their
 * fixture modules). Shell-visible: a domain switch leaves the whole
 * topbar, the sidebar's spend figure, the tools surface's connector
 * cards and the entire settings surface exactly where they were, and
 * changes the export list beneath those cards. The palette is the one
 * KNOWN NARROWING in that set — a live search endpoint would be
 * scoped (`/d/:slug/search`) — and `./shell.ts` says why the fixture
 * is not.
 *
 * Nothing here copies, filters or reshapes what a fixture accessor
 * answered. Each of those functions documents its own aliasing stance
 * (`listConnectors` copies because there is nothing to filter on,
 * `listSearchSuggestions` hands back the shared frozen array on
 * purpose), and a second policy layered here would silently override a
 * decision made where it is explained. {@link fetchDomains} is the one
 * exception, for a reason its own docblock gives.
 *
 * What this barrel deliberately does NOT answer, so the next author
 * reads an omission rather than a gap: nothing loads a single row by
 * id (`getFinding`, `getSource`, `getConnector` and friends stay
 * unwrapped), because every modal sub-route in this plan renders a
 * placeholder carrying its route parameter and no editor loads a
 * record yet; nothing lists entities or a category's terms, for the
 * same reason. Each is one function and one test on the day a surface
 * needs it — and the fixture accessor it would wrap already exists.
 *
 * The `fetch` prefix is not decoration either. The fixture layer's
 * verbs are `list`/`get`/`find`/`summarize`; changing the verb at the
 * seam means an import of `listFindings` in a page reads differently
 * from `fetchFindings` at a glance, and the wrong one is the one that
 * bypasses the swap.
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

import { listConnectors, summarizeExportSubscriptions } from './connectors';
import { listDocuments, listFindings } from './digest';
import { DOMAINS, getDomain, resolveVerdictVocabulary } from './domains';
import { summarizeCategories } from './lexicon';
import { listPersonas } from './personas';
import { getSettings } from './settings';
import { getOperator, listNotifications, listSearchSuggestions } from './shell';
import { listSources, summarizeSources } from './sources';
import { getSpendSummary } from './spend';

/**
 * The seam itself: read a fixture, answer with a promise.
 *
 * Every accessor in this module resolves through here, including the
 * domain-scoped ones (via {@link deliverForDomain}), so there is
 * exactly one place the app's synchronous fixtures become the
 * asynchronous reads a page is written against — and exactly one
 * function q15 rewrites into an HTTP call.
 *
 * `async` is load-bearing rather than stylistic. A `read` that throws
 * — which is how an unknown domain, a dangling connector reference or
 * a missing fixture row all surface — becomes a REJECTED promise here
 * instead of an exception thrown at the caller before it ever held a
 * promise to catch on. Written as a plain function returning
 * `Promise.resolve(read())`, the throw would escape synchronously and
 * a cache hook would never see it.
 *
 * @typeParam T - What the fixture accessor answers.
 * @param read - The fixture accessor call, deferred so its throw lands
 * inside this function rather than at the call site.
 * @returns Its answer, on the microtask queue.
 */
async function deliver<T>(read: () => T): Promise<T> {
  return read();
}

/**
 * The seam, scoped to one domain.
 *
 * Resolves the slug to a {@link Domain} through {@link getDomain} and
 * hands the whole row to `read`, rather than just its id, because some
 * reads want the domain itself — a verdict ladder comes off its
 * settings, not off its primary key. Accessors that only need the id
 * take it off the argument.
 *
 * The resolution happens INSIDE {@link deliver}'s callback on purpose:
 * that is what makes an unknown slug a rejection rather than a throw,
 * and it is the only refusal this module performs.
 *
 * @typeParam T - What the fixture accessor answers.
 * @param slug - A resolved domain slug — `resolveDomainSlug` has
 * already turned the single-domain base's absent param into
 * `DEFAULT_DOMAIN_SLUG`.
 * @param read - What to read once the domain is known.
 * @returns Its answer, or a rejection if no domain carries that slug.
 */
function deliverForDomain<T>(
  slug: string,
  read: (domain: Domain) => T,
): Promise<T> {
  return deliver(() => read(getDomain(slug)));
}

/**
 * Every domain this deployment knows — what the topbar switcher lists.
 *
 * Takes no slug: a list of domains is the one read that cannot be
 * scoped to one. The active domain is the switcher's own state, not a
 * filter on this.
 *
 * The single accessor here that does not simply pass a fixture
 * accessor's answer through. `./domains.ts` exports the table and
 * invites a direct read of it rather than wrapping it in a
 * `listDomains()`, so there is no stance to inherit — and handing the
 * stored array to a caller would let a switcher sorting it in place
 * reorder the fixture for every later reader in the tab. The copy is
 * the same one `listConnectors` makes for the same reason.
 *
 * @returns The domains, in switcher order — seeded domain first. Never
 * the stored array.
 */
export function fetchDomains(): Promise<readonly Domain[]> {
  return deliver(() => [...DOMAINS]);
}

/**
 * One domain by slug — its name for the chrome, its settings for the
 * pages that read them.
 *
 * Also the membership check every other domain-scoped accessor here
 * performs on the way past, exposed on its own so a route can ask the
 * question directly: a rejection is how the shell learns that a
 * bookmarked `/d/:domainSlug` names a domain that has gone.
 *
 * @param slug - A resolved domain slug.
 * @returns The domain carrying it; rejects if none does.
 */
export function fetchDomain(slug: string): Promise<Domain> {
  return deliverForDomain(slug, (domain) => domain);
}

/**
 * The verdicts this domain's findings may carry — the digest's verdict
 * filter, in ladder order.
 *
 * Resolved rather than read: `settings.verdictVocabulary` is optional
 * and a domain naming no ladder is judged against the default one, a
 * rule `resolveVerdictVocabulary` owns and no page should re-answer.
 * Wrapping it here rather than leaving the filter to call the resolver
 * on a domain it already holds keeps the absent-settings case on the
 * same path as everything else, which is what makes the sparse fixture
 * domain exercise it.
 *
 * @param slug - A resolved domain slug.
 * @returns Its ladder, most negative first; rejects on an unknown
 * slug.
 */
export function fetchVerdicts(slug: string): Promise<readonly string[]> {
  return deliverForDomain(slug, resolveVerdictVocabulary);
}

/**
 * One domain's captured documents.
 *
 * The digest's rows are findings, not documents, but a row shows what
 * its finding was made FROM — the parse status and the source — so the
 * page reads both lists and joins them by id.
 *
 * @param slug - A resolved domain slug.
 * @returns Its documents, newest capture first; `[]` for a domain that
 * has captured nothing, and a rejection for one that does not exist.
 */
export function fetchDocuments(slug: string): Promise<readonly Document[]> {
  return deliverForDomain(slug, (domain) => listDocuments(domain.id));
}

/**
 * One domain's findings — what the digest surface is a list of.
 *
 * @param slug - A resolved domain slug.
 * @returns Its findings, highest score first with the unscored last;
 * `[]` for a domain that has produced none.
 */
export function fetchFindings(slug: string): Promise<readonly Finding[]> {
  return deliverForDomain(slug, (domain) => listFindings(domain.id));
}

/**
 * One card per lexicon category, counted — what the lexicon surface
 * renders.
 *
 * Summaries rather than the raw categories, because the term count and
 * the polarity split ARE the card, and counting them in the page would
 * be the join this barrel exists to keep out of one.
 *
 * @param slug - A resolved domain slug.
 * @returns A summary per category, in seed order; `[]` for a domain
 * with no taxonomy.
 */
export function fetchCategorySummaries(
  slug: string,
): Promise<readonly CategorySummary[]> {
  return deliverForDomain(slug, (domain) => summarizeCategories(domain.id));
}

/**
 * One domain's configured sources — the sources surface's table.
 *
 * @param slug - A resolved domain slug.
 * @returns Its sources, in configuration order; `[]` for a domain that
 * has configured none.
 */
export function fetchSources(slug: string): Promise<readonly Source[]> {
  return deliverForDomain(slug, (domain) => listSources(domain.id));
}

/**
 * How that domain's sources are doing, one count per status — the
 * stat cards above the table.
 *
 * A separate read from {@link fetchSources} rather than something the
 * page derives, for the reason `summarizeSources` gives: the cards and
 * the table have to agree, and a page counting its own rows is a page
 * that can come to disagree with the classifier.
 *
 * @param slug - A resolved domain slug.
 * @returns A count per status, zeros included; all zeros for a domain
 * with no sources.
 */
export function fetchSourceStatusCounts(
  slug: string,
): Promise<SourceStatusCounts> {
  return deliverForDomain(slug, (domain) => summarizeSources(domain.id));
}

/**
 * One domain's personas — the agents surface's cards.
 *
 * @param slug - A resolved domain slug.
 * @returns Its personas, in role order; `[]` for a domain with none.
 */
export function fetchPersonas(slug: string): Promise<readonly Persona[]> {
  return deliverForDomain(slug, (domain) => listPersonas(domain.id));
}

/**
 * One domain's deliveries with their destinations resolved — the
 * export list on the tools surface.
 *
 * The half of that surface which DOES move with the domain: the
 * connector cards above it come from {@link fetchConnectors} and do
 * not. Rejects rather than dropping a row if a subscription names a
 * connector nothing carries, which is `summarizeExportSubscriptions`
 * refusing to render a delivery to nowhere as a domain that cancelled
 * it.
 *
 * @param slug - A resolved domain slug.
 * @returns A summary per subscription, in subscription order; `[]` for
 * a domain that has subscribed to nothing.
 */
export function fetchExportSubscriptions(
  slug: string,
): Promise<readonly ExportSubscriptionSummary[]> {
  return deliverForDomain(
    slug,
    (domain) => summarizeExportSubscriptions(domain.id),
  );
}

/**
 * Every connector this deployment has configured — the tools surface's
 * cards.
 *
 * Takes no slug: `connectors` carries no `domain_id`, so the cards are
 * the same whichever domain is active. Secrets are redacted in the
 * fixture rather than here.
 *
 * @returns The connectors, in configuration order.
 */
export function fetchConnectors(): Promise<readonly Connector[]> {
  return deliver(listConnectors);
}

/**
 * The operator's own preferences — the settings surface.
 *
 * Takes no slug, and mirrors no table: `domains.settings` is
 * per-domain and holds nothing an operator chose. A domain switch
 * leaves this surface completely unchanged, including the default
 * domain it names.
 *
 * @returns The settings fixture. Always the same frozen object.
 */
export function fetchSettings(): Promise<Settings> {
  return deliver(getSettings);
}

/**
 * This week's model spend — the sidebar's figure under the nav.
 *
 * Takes no slug: the ceiling is a deployment budget and the UI spec
 * points the widget at a path with no domain segment. `./spend.ts`
 * carries the full reasoning, including why a per-domain sum would
 * drop work the deployment paid for.
 *
 * @returns The week's summary. Always the same frozen object.
 */
export function fetchSpendSummary(): Promise<SpendSummary> {
  return deliver(getSpendSummary);
}

/**
 * The search palette behind the topbar's input.
 *
 * Takes no slug, which is the one narrowing in the unscoped set rather
 * than the shape of the thing — a live search endpoint would be
 * domain-scoped. See `./shell.ts`.
 *
 * @returns The suggestions, in panel order. Always the same frozen
 * array.
 */
export function fetchSearchSuggestions(): Promise<readonly SearchSuggestion[]> {
  return deliver(listSearchSuggestions);
}

/**
 * What the topbar's bell reports.
 *
 * Takes no slug and mirrors no table — schema v2 has nothing to derive
 * an alert from yet.
 *
 * @returns The notifications, newest first. Always the same frozen
 * array.
 */
export function fetchNotifications(): Promise<readonly NotificationItem[]> {
  return deliver(listNotifications);
}

/**
 * The operator this shell is running as — the topbar's avatar.
 *
 * Takes no slug and mirrors no table: this deployment is one operator
 * on one machine, with nothing to authenticate against.
 *
 * @returns The operator stub. Always the same frozen object.
 */
export function fetchOperator(): Promise<ProfileMenuUser> {
  return deliver(getOperator);
}
