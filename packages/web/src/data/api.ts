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
 * answered, and the SESSION DRAFT STORE is the one exception. Each of
 * those functions documents its own aliasing stance (`listConnectors`
 * copies because there is nothing to filter on,
 * `listSearchSuggestions` hands back the shared frozen array on
 * purpose), and a second policy layered here would silently override a
 * decision made where it is explained. {@link fetchDomains} bends the
 * same rule in the small, for a reason its own docblock gives: there
 * is no accessor over there to inherit a stance from.
 *
 * The overlay is an EXCEPTION to that rule rather than a repeal of it,
 * because it decides nothing a fixture accessor decided. `applyDrafts`
 * never grows, shrinks or reorders the list it is handed, and never
 * touches a row this tab has not edited — so membership, order and
 * every unedited row are still exactly what the fixture answered, by
 * identity and not merely by value. What it adds is the one thing no
 * fixture module can answer, sitting as they all do below the store
 * and importing nothing from it: what this tab has done since it
 * loaded. An editor that saves nothing is worse than the placeholder
 * it replaced, so a save has to be visible to the read that would show
 * it — and visible HERE, because on the day this seam becomes HTTP the
 * server answers that question and `./drafts.ts` is deleted alongside
 * the fixture modules in one commit.
 *
 * Three shapes reach it, and the list is worth reading before adding a
 * write: a save no read shows is worse than no save at all.
 * {@link fetchDocuments}, {@link fetchFindings}, {@link fetchSources},
 * {@link fetchPersonas} and {@link fetchConnectors} answer the drafted
 * rows themselves, through {@link deliverDomainRows} or — for the one
 * deployment-scoped resource — {@link CONNECTOR_DRAFTS}.
 * {@link fetchSourceStatusCounts} COUNTS them, and composes
 * `countSourceStatuses` over the overlaid list rather than calling
 * `summarizeSources`; that is not a second policy but the very
 * decomposition `summarizeSources` already is, and the whole reason
 * that accessor exists is that the stat cards and the table must never
 * come to disagree. {@link fetchExportSubscriptions} answers a join
 * WRAPPING a drafted row, so {@link overlaySubscription} replaces the
 * drafted subscription and re-resolves its destination through the
 * fixture layer's own `getConnector` — refusing a drafted delivery to
 * nowhere exactly as `summarizeExportSubscriptions` refuses a stored
 * one, instead of rendering a stale connector beside an edited row.
 *
 * Every other read is untouched for a stated reason rather than by
 * oversight. `domains`, `entities` and `settings` name no draft
 * resource at all — nothing edits a domain or a subject, and
 * `Settings` carries no id to key a draft on, which `./drafts.ts`
 * explains — so {@link fetchDomains}, {@link fetchDomain},
 * {@link fetchVerdicts}, {@link fetchEntities} and
 * {@link fetchSettings} pass fixture answers straight through, as do
 * the four shell and spend reads that mirror no table.
 * {@link fetchCategorySummaries} is the one real NARROWING:
 * `summarizeCategories` builds its per-category literal inside its own
 * body instead of out of two exported functions, so an overlay there
 * would have to rebuild that literal at the seam, which is precisely
 * the second policy the rule forbids. Its `termCount` cannot drift
 * whatever the store holds, the overlay being unable to insert or
 * delete a term; its polarity split can, once a term editor records
 * one, and that is what the narrowing costs.
 *
 * Two resources `./drafts.ts` declares have no read here yet: `terms`
 * and `source-proposals`. Their accessors and their overlays arrive
 * together, with the surfaces that need them.
 *
 * What this barrel deliberately does NOT answer, so the next author
 * reads an omission rather than a gap: nothing loads a single row by
 * id (`getFinding`, `getSource`, `getConnector` and friends stay
 * unwrapped), because every modal sub-route in this plan renders a
 * placeholder carrying its route parameter and no editor loads a
 * record yet; nothing lists a category's terms, for the same reason.
 * Each is one function and one test on the day a surface needs it —
 * and the fixture accessor it would wrap already exists.
 * {@link fetchEntities} is that day arriving for one of them: the
 * digest page joins its findings to their subjects, so the read it
 * needs is here rather than in the page.
 *
 * The `fetch` prefix is not decoration either. The fixture layer's
 * verbs are `list`/`get`/`find`/`summarize`; changing the verb at the
 * seam means an import of `listFindings` in a page reads differently
 * from `fetchFindings` at a glance, and the wrong one is the one that
 * bypasses the swap.
 */

import type { ExportSubscriptionSummary } from './connectors';
import type {
  DomainDraftResource,
  DraftScope,
  DraftableRow,
} from './drafts';
import type { CategorySummary } from './lexicon';
import type { SourceStatusCounts } from './sources';
import type {
  Connector,
  Document,
  Domain,
  Entity,
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

import {
  getConnector,
  listConnectors,
  summarizeExportSubscriptions,
} from './connectors';
import { listDocuments, listEntities, listFindings } from './digest';
import { DOMAINS, getDomain, resolveVerdictVocabulary } from './domains';
import {
  applyDrafts,
  deploymentDraftScope,
  domainDraftScope,
} from './drafts';
import { summarizeCategories } from './lexicon';
import { listPersonas } from './personas';
import { getSettings } from './settings';
import { getOperator, listNotifications, listSearchSuggestions } from './shell';
import { countSourceStatuses, listSources } from './sources';
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
 * The seam, scoped to one domain, with that domain's drafts of one
 * resource composed onto the rows it answers.
 *
 * The commonest of the three overlay shapes, and the reason most of
 * the accessors below stayed one line: the read is unchanged and the
 * scope is built from the SLUG THIS CALL WAS HANDED, so an edit made
 * under one domain is invisible under every other without any accessor
 * having to remember that.
 *
 * The scope is assembled before {@link deliverForDomain} rather than
 * inside its callback, which changes nothing about the refusal:
 * {@link domainDraftScope} cannot throw, and `getDomain` still runs
 * inside {@link deliver}. A draft recorded under a slug no domain
 * carries is therefore recorded, never reached, and never able to turn
 * that slug's rejection into a resolved empty page.
 *
 * @typeParam T - The row shape the accessor answers.
 * @param slug - A resolved domain slug.
 * @param resource - Which of that domain's resources these rows are.
 * @param read - The fixture accessor, called once the domain is known.
 * @returns Its rows with this tab's edits applied, in the fixture's own
 * order; a rejection if no domain carries the slug.
 */
function deliverDomainRows<T extends DraftableRow>(
  slug: string,
  resource: DomainDraftResource,
  read: (domain: Domain) => readonly T[],
): Promise<readonly T[]> {
  const scope = domainDraftScope(slug, resource);

  return deliverForDomain(slug, (domain) => applyDrafts(scope, read(domain)));
}

/**
 * Where an edit to a connector is filed.
 *
 * A module constant rather than a call inside {@link fetchConnectors},
 * because there is nothing per-call to build it from: `connectors`
 * carries no `domain_id`, so one scope serves every read for the life
 * of the tab. That asymmetry with {@link deliverDomainRows} is the same
 * one this module's docblock draws around the accessor itself.
 */
const CONNECTOR_DRAFTS: DraftScope = deploymentDraftScope('connectors');

/**
 * One export summary with this tab's edit to its subscription applied.
 *
 * The third overlay shape: the drafted row is not the answer but a
 * MEMBER of it, so the draft cannot simply be handed back in the row's
 * place. A summary whose subscription is undrafted comes back as the
 * very object `summarizeExportSubscriptions` built — identity, not a
 * rebuilt twin — and only a drafted one is replaced.
 *
 * The destination is re-resolved rather than carried over, and that is
 * the deliberate half. An edit that moves a delivery to another
 * connector and left the old one rendered beside it would be a wrong
 * answer that looks like a saved one; asking the fixture layer's own
 * `getConnector` makes a drafted subscription exactly as correct as a
 * stored one, THROWING on a destination nothing carries for the reason
 * `summarizeExportSubscriptions` gives — a delivery to nowhere is not
 * the same thing as a cancelled subscription, and the throw becomes a
 * rejection at {@link deliver} like every other refusal here.
 *
 * @param scope - This domain's subscription drafts.
 * @param summary - One summary as the fixture layer assembled it.
 * @returns It unchanged, or a fresh one carrying the drafted
 * subscription and that subscription's own destination.
 * @throws If a drafted subscription names a connector nothing carries.
 */
function overlaySubscription(
  scope: DraftScope,
  summary: ExportSubscriptionSummary,
): ExportSubscriptionSummary {
  const [drafted = summary.subscription] = applyDrafts(
    scope,
    [summary.subscription],
  );

  return drafted === summary.subscription
    ? summary
    : { subscription: drafted, connector: getConnector(drafted.connectorId) };
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
  return deliverDomainRows(
    slug,
    'documents',
    (domain) => listDocuments(domain.id),
  );
}

/**
 * One domain's findings — what the digest surface is a list of.
 *
 * The sort is the fixture's and the overlay does not redo it, which is
 * `applyDrafts`' never-reorders rule seen from the one accessor whose
 * order is derived from a field. A drafted VERDICT — the edit the
 * digest's row action actually makes — changes nothing about position;
 * a drafted score would leave the row where the stored one ranked,
 * until the day the endpoint behind this seam does the sorting.
 *
 * @param slug - A resolved domain slug.
 * @returns Its findings, highest STORED score first with the unscored
 * last, this tab's edits applied in place; `[]` for a domain that has
 * produced none.
 */
export function fetchFindings(slug: string): Promise<readonly Finding[]> {
  return deliverDomainRows(
    slug,
    'findings',
    (domain) => listFindings(domain.id),
  );
}

/**
 * One domain's subjects — what its findings are ABOUT.
 *
 * The whole set rather than the ones a page happens to be showing:
 * a finding names its subject by id and a retired name is an alias
 * row pointing at another, so a caller resolving either needs both
 * halves in hand.
 *
 * The digest joins them for its category filter, which reads the
 * taxonomy bucket a subject was matched under. No surface lists these
 * on their own.
 *
 * @param slug - A resolved domain slug.
 * @returns Its entities, in id order; `[]` for a domain that records
 * none.
 */
export function fetchEntities(slug: string): Promise<readonly Entity[]> {
  return deliverForDomain(slug, (domain) => listEntities(domain.id));
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
  return deliverDomainRows(
    slug,
    'sources',
    (domain) => listSources(domain.id),
  );
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
 * Which is exactly why this one counts the OVERLAID list. It composes
 * `countSourceStatuses` over `listSources` — the two calls
 * `summarizeSources` is, in its order, with the overlay between them —
 * so a source an operator has just disabled is disabled in the cards
 * and in the table on the same render rather than in one of them.
 *
 * @param slug - A resolved domain slug.
 * @returns A count per status, zeros included, over this tab's view of
 * the sources; all zeros for a domain with none.
 */
export function fetchSourceStatusCounts(
  slug: string,
): Promise<SourceStatusCounts> {
  const scope = domainDraftScope(slug, 'sources');

  return deliverForDomain(
    slug,
    (domain) => countSourceStatuses(applyDrafts(scope, listSources(domain.id))),
  );
}

/**
 * One domain's personas — the agents surface's cards.
 *
 * @param slug - A resolved domain slug.
 * @returns Its personas, in role order; `[]` for a domain with none.
 */
export function fetchPersonas(slug: string): Promise<readonly Persona[]> {
  return deliverDomainRows(
    slug,
    'personas',
    (domain) => listPersonas(domain.id),
  );
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
 * it — and {@link overlaySubscription} makes the same refusal on a
 * DRAFTED destination, so an edit cannot buy itself a laxer rule than
 * the stored row had.
 *
 * @param slug - A resolved domain slug.
 * @returns A summary per subscription, in subscription order; `[]` for
 * a domain that has subscribed to nothing.
 */
export function fetchExportSubscriptions(
  slug: string,
): Promise<readonly ExportSubscriptionSummary[]> {
  const scope = domainDraftScope(slug, 'export-subscriptions');

  return deliverForDomain(slug, (domain) => {
    const summaries = summarizeExportSubscriptions(domain.id);

    return summaries.map((summary) => overlaySubscription(scope, summary));
  });
}

/**
 * Every connector this deployment has configured — the tools surface's
 * cards.
 *
 * Takes no slug: `connectors` carries no `domain_id`, so the cards are
 * the same whichever domain is active. Secrets are redacted in the
 * fixture rather than here. Its drafts are filed the same way, under
 * {@link CONNECTOR_DRAFTS}, so an edit made while one domain was
 * active is still there under the next — which is what the cards
 * already do with the stored rows.
 *
 * @returns The connectors, in configuration order, this tab's edits
 * applied. Never the stored table.
 */
export function fetchConnectors(): Promise<readonly Connector[]> {
  return deliver(() => applyDrafts(CONNECTOR_DRAFTS, listConnectors()));
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
