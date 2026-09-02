/**
 * @packageDocumentation
 * The accessor barrel — the one module in this app that answers "where
 * does the data come from", and the one module q15 replaces when the
 * answer stops being a fixture.
 *
 * Everything above this line reaches its data through it.
 * `./hooks.ts` wraps each READ below in `useCache` and each WRITE in a
 * mutation, the pages call the hooks, and no page or hook imports a
 * fixture module directly. Both halves now have their hooks, so a
 * surface CAN call a save; none does yet, and each page's own docblock
 * says so where it matters. That is the whole point: when the API
 * waves land, the fixture modules beside this one are deleted and the
 * functions below are re-pointed at endpoints, and nothing else in
 * `src/` has to move.
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
 * Eight READS take no slug at all, and the rule has to name them or
 * it claims something false about a third of the read half:
 * {@link fetchDomains} (the switcher's own list — a domain list cannot
 * be scoped to a domain), {@link fetchConnectors} and
 * {@link fetchConnector} (`connectors` has no `domain_id`, so neither
 * the installation's list of them nor one row out of it is a fact
 * about any domain), {@link fetchSettings}, {@link fetchSpendSummary},
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
 * Two WRITES take no slug either, and for the same reasons their
 * reads do not: {@link saveConnector} edits an installation-level row,
 * and {@link saveSettings} edits a preference set that mirrors no
 * table. Counting the two halves together gives ten, which is not a
 * fact about anything — the split is per resource, so each write
 * inherits its read's answer rather than reaching one of its own.
 *
 * Nothing here copies, filters or reshapes what a fixture accessor
 * answered, and there are TWO exceptions: the SESSION DRAFT STORE,
 * and the one predicate {@link fetchSourceFailures} applies. Each of
 * those functions documents its own aliasing stance (`listConnectors`
 * copies because there is nothing to filter on,
 * `listSearchSuggestions` hands back the shared frozen array on
 * purpose), and a second policy layered here would silently override a
 * decision made where it is explained. {@link fetchDomains} bends the
 * same rule in the small, for a reason its own docblock gives: there
 * is no accessor over there to inherit a stance from.
 *
 * The PREDICATE is the smaller exception and is a COLUMN COMPARISON
 * rather than a policy. A failed capture is not a table of its own —
 * the schema keeps the document with its parse error beside it
 * instead of moving it to a queue — so there is no fixture accessor
 * answering that list to inherit a stance FROM, and what the
 * narrowing is made of is two members `./types.ts` already
 * redeclares, `parseStatus` and `sourceId`, compared to values the
 * caller supplied. Nothing there decides what a document MEANS, which
 * is the thing this rule exists to keep out of a seam.
 * {@link fetchSourceProposals} beside it is the counter-example that
 * says where the line falls: the modal it feeds wants the PENDING
 * proposals, and that filter stays OUT of here because
 * `./proposals.ts` decided an already-approved proposal and a source
 * nobody has ever proposed for are different sentences to put in
 * front of an operator. Which rows exist is a clause; which of them
 * mean what is a decision, and only the first belongs at a seam.
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
 * FIVE shapes reach it, and the list is worth reading before adding a
 * write: a save no read shows is worse than no save at all.
 * {@link fetchDocuments}, {@link fetchFindings}, {@link fetchSources},
 * {@link fetchPersonas}, {@link fetchSourceProposals} and
 * {@link fetchConnectors} answer the drafted rows themselves, through
 * {@link deliverDomainRows} or — for the one deployment-scoped
 * resource — {@link CONNECTOR_DRAFTS}.
 * {@link fetchTerms} and {@link fetchSourceFailures} answer them too
 * and are the two members of that shape which build their scope
 * themselves: their rows hang off a CATEGORY and off a SOURCE, so the
 * ownership refusal has to run before there is a list to overlay at
 * all. The second narrows what it overlaid rather than what it read,
 * and that order is the claim — a queue of failed captures and the
 * documents it is a queue OF must not come to disagree about what
 * this tab has ruled.
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
 * {@link fetchSettings} is the fourth and the odd one: it answers no
 * rows at all, so it composes `./drafts.ts`'s SINGLETON slot instead
 * — one saved value replacing one stored one, by the same
 * pass-through-when-nothing-is-saved rule the row overlay keeps.
 * The SINGLE-ROW reads are the fifth, and they compose the very same
 * row overlay through a one-element list: {@link fetchFinding},
 * {@link fetchSource} and {@link fetchPersona} through
 * {@link deliverDomainRow}, {@link fetchConnector} through
 * {@link CONNECTOR_DRAFTS}. That is the first shape's argument seen
 * from the surface that RECORDS the edit rather than the one that
 * lists it — a modal whose read skipped the overlay would reopen
 * showing the value its own save had just replaced.
 *
 * Every other read is untouched for a stated reason rather than by
 * oversight. `domains`, `entities` and `categories` name no draft
 * resource at all — nothing edits a domain or a subject, and the
 * lexicon editor saves a category's TERMS rather than the category —
 * so {@link fetchDomains}, {@link fetchDomain}, {@link fetchVerdicts},
 * {@link fetchEntities} and {@link fetchCategory} pass fixture answers
 * straight through, as do the four shell and spend reads that mirror
 * no table.
 * {@link fetchCategorySummaries} is the one real NARROWING:
 * `summarizeCategories` builds its per-category literal inside its own
 * body instead of out of two exported functions, so an overlay there
 * would have to rebuild that literal at the seam, which is precisely
 * the second policy the rule forbids. Its `termCount` cannot drift
 * whatever the store holds, the overlay being unable to insert or
 * delete a term; its polarity split can, once a term editor records
 * one, and that is what the narrowing costs.
 *
 * EVERY resource `./drafts.ts` declares now has BOTH halves here, and
 * `source-proposals` was the last one without.
 * {@link fetchSourceProposals} is the read {@link approveSourceConfig}
 * had been recording ahead of since it landed, exactly as
 * {@link fetchTerms} was for {@link saveCategoryTerms}. So the rule
 * this module states — a save no read shows is worse than no save at
 * all — is one it now KEEPS rather than one it documents a standing
 * exception to, and a write added here next inherits that as a
 * requirement instead of as a precedent.
 *
 * What each closing bought is narrower than the rule sounds, and
 * saying so is what keeps a quiet card from being read as a broken
 * invalidation. An edited term is visible to the editor that saved
 * it and to a reopen of that editor, and to nothing else —
 * `./lexicon.ts`'s summaries are the one narrowing this module states
 * below. A ruled proposal is visible to the queue it was ruled out
 * of, which is what makes a pending list shrink after an approval
 * without anything here filtering on a status.
 *
 * Four such days have arrived. {@link fetchEntities} was the first:
 * the digest page joins its findings to their subjects, so the read
 * it needs is here rather than in the page. The five SINGLE-ROW reads
 * are the second, and they land AHEAD of their callers rather than
 * behind them: every modal sub-route still renders a placeholder over
 * its route parameter, which needs no read at all, while the editors
 * replacing those placeholders need exactly this. {@link fetchTerms}
 * is the third and is both at once — a read landing ahead of its
 * editor, and the one a write here had been waiting for. The fourth
 * is a pair and is both at once again: {@link fetchSourceProposals}
 * and {@link fetchSourceFailures} landed ahead of the two sources
 * sub-routes that now read them, and stand behind the two writes that
 * RULE on something rather than edit it.
 *
 * The `fetch` prefix is not decoration either. The fixture layer's
 * verbs are `list`/`get`/`find`/`summarize`; changing the verb at the
 * seam means an import of `listFindings` in a page reads differently
 * from `fetchFindings` at a glance, and the wrong one is the one that
 * bypasses the swap. The writes carry the same idea one step further:
 * `save` for the ones that store an edited row, and the verb of the
 * ACT for the two that rule on something rather than edit it
 * ({@link approveSourceConfig}, {@link resolveSourceFailure}) — see
 * the section below for why that distinction is not cosmetic.
 *
 * ## The single-row reads
 *
 * Five of the reads below answer ONE row rather than a list, and they
 * are the shape the editor modals load through: a route carries
 * `:domainSlug` and `:entityId`, and this is where that pair becomes
 * a record. Four take the slug FIRST and the id second, in the order
 * the URL spells them; {@link fetchConnector} takes the id alone, for
 * the reason {@link fetchConnectors} takes nothing.
 *
 * Each wraps the fixture layer's `find` rather than its `get`, which
 * is the accessor those modules' own docblocks point at this exact
 * case: an id off a URL is a number a stale bookmark can carry, so a
 * miss is an ordinary outcome a modal renders and not the broken
 * fixture a `get` shouts about.
 *
 * A row belonging to ANOTHER domain is refused in the same breath and
 * with the SAME message, and that is the one behaviour here which is
 * not simply the fixture accessor's. The fixture tables are keyed by
 * id alone, so `findSource(1)` answers a row whatever slug stood in
 * the URL — and the overlay is what makes that unacceptable rather
 * than merely lax, the draft scope being built from the SLUG and so
 * laying one domain's edits over another domain's row. Refusing both
 * causes identically is what a scoped endpoint does too: 404 for a
 * row that is not there and 404 for a row that is not yours, since a
 * message telling them apart would report which ids exist under a
 * domain the caller was just refused.
 *
 * ## The reads that are scoped twice
 *
 * {@link fetchTerms} and {@link fetchSourceFailures} are neither of
 * the two shapes above, and they are named here rather than left to
 * be met further down: each takes a slug AND a row id, and each
 * answers a LIST. That id is a PARENT's rather than the answered
 * rows' own, which is the one place a reader counting `(slug, id)`
 * accessors would file them in the wrong half — they refuse like a
 * single-row read and answer like a list one.
 *
 * Their own docblocks carry why the parent is resolved before its
 * children are listed, and it is the same reason twice: `terms` is
 * keyed by `category_id` alone and `documents` by `source_id` alone,
 * so an id off a URL answers the seeded domain's rows whatever slug
 * stood beside it in that URL.
 *
 * ## The write half
 *
 * Nine of the functions below record rather than read, and all nine
 * go through the SAME {@link deliver} and {@link deliverForDomain}
 * the reads do. That is the whole of what makes them a seam and not a
 * side door: a write to a slug no domain carries rejects with the same
 * message a read of it rejects with, on the same microtask, before a
 * single draft has been recorded — because `getDomain` runs inside
 * {@link deliver}'s callback and the recording runs after it. A save
 * that refused a domain AFTER filing an edit under it would leave the
 * store holding an edit for a page that can never render.
 *
 * They answer `Promise<void>`, which is a decision rather than an
 * omission. The store has nothing to hand back that the caller did not
 * hand in, and the pages do not read a save's answer: `./hooks.ts`
 * wraps each of these in a mutation that INVALIDATES the keys its
 * write can change, so what a surface renders next is the read
 * re-running rather than a response body threaded through a component.
 * On the day this becomes HTTP the endpoint's `200` body is that same
 * row, and the invalidated read fetches it — so nothing above here has
 * to change to start ignoring a payload it was never given.
 *
 * Each one takes the WHOLE row (or the whole list of them), never a
 * patch. `recordDraft` stores a row and `applyDrafts` replaces one, so
 * a partial edit would have to be merged with the stored row
 * somewhere, and that merge is exactly the second policy this module's
 * rule forbids — plus a rule about which absent member means "leave it
 * alone" and which means "clear it", which no endpoint here has
 * chosen. An editor is expected to build a full row out of the one it
 * loaded, and the shared draft holder that will do it for all five is
 * not written yet — until it is, a caller handing over a partial row
 * is refused by the type and by nothing else.
 *
 * The TSDoc on each one names the HTTP VERB it eventually becomes, in
 * prose and never as a route. The verb is a property of the write —
 * whether it replaces a row, replaces a collection, or records an act
 * — and it is stable enough to be worth writing down now. A route is
 * not: the service's own API is being rewritten in parallel with this
 * plan, and a path spelled here would be a claim about somebody else's
 * module that nothing in this package could ever check.
 *
 * What the writes deliberately cannot do, because `./drafts.ts`
 * cannot: INSERT and DELETE. A save edits rows that already exist, so
 * a term added in an editor, a subscription cancelled, or a source
 * created has nowhere to go until a real endpoint issues the id.
 * `./drafts.ts` carries that argument in full; the consequence here is
 * that {@link saveCategoryTerms} and {@link saveExportSubscriptions}
 * take a LIST and record an edit per row, rather than replacing the
 * collection the way the `PUT` they become would.
 */

import type { ExportSubscriptionSummary } from './connectors';
import type {
  DomainDraftResource,
  DraftScope,
  DraftableRow,
} from './drafts';
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

import {
  findConnector,
  getConnector,
  listConnectors,
  summarizeExportSubscriptions,
} from './connectors';
import {
  findFinding,
  listDocuments,
  listEntities,
  listFindings,
} from './digest';
import { DOMAINS, getDomain, resolveVerdictVocabulary } from './domains';
import {
  applyDrafts,
  applySingletonDraft,
  deploymentDraftScope,
  domainDraftScope,
  recordDraft,
  recordSingletonDraft,
} from './drafts';
import { findCategory, listTerms, summarizeCategories } from './lexicon';
import { findPersona, listPersonas } from './personas';
import { listSourceProposals } from './proposals';
import { getSettings } from './settings';
import { getOperator, listNotifications, listSearchSuggestions } from './shell';
import { countSourceStatuses, findSource, listSources } from './sources';
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
 * The seam's WRITE half, scoped to one domain: record an edit to each
 * of these rows under that domain's copy of one resource.
 *
 * The mirror of {@link deliverDomainRows}, and deliberately built the
 * same way round. The scope comes off the SLUG THIS CALL WAS HANDED,
 * so an edit made under one domain is invisible under every other
 * without any accessor having to remember that — and the recording
 * happens INSIDE the callback {@link deliverForDomain} runs after
 * `getDomain`, so a write to a slug no domain carries rejects with
 * nothing recorded. A store left holding an edit for a domain that
 * does not exist would be an edit no page could ever render and no
 * gesture could ever discard.
 *
 * Takes a LIST even where the caller has one row, because the two
 * shapes are the same operation: `recordDraft` files one row at a
 * time, and a collection write is that repeated. See this module's
 * header for why replacing a collection wholesale is not something the
 * store can express.
 *
 * @typeParam T - The row shape the surface edits.
 * @param slug - A resolved domain slug.
 * @param resource - Which of that domain's resources these rows are.
 * @param rows - The edited rows, each carrying the id it is keyed by.
 * @returns Nothing, once recorded; a rejection if no domain carries
 * the slug, in which case nothing was recorded at all.
 */
function recordForDomain<T extends DraftableRow>(
  slug: string,
  resource: DomainDraftResource,
  rows: readonly T[],
): Promise<void> {
  const scope = domainDraftScope(slug, resource);

  return deliverForDomain(slug, () => {
    rows.forEach((row) => recordDraft(scope, row));
  });
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
 * A row that names the domain it belongs to.
 *
 * Structural rather than a union of the four fixture types, for the
 * reason `./drafts.ts` gives about {@link DraftableRow}: {@link
 * ownedRow} reads one field, and a union would have to be widened by
 * hand every time another single-row read landed.
 */
interface DomainOwnedRow extends DraftableRow {
  /** Its `domain_id`, as every domain-scoped fixture row carries it. */
  readonly domainId: number;
}

/**
 * One row of a domain, or a throw — the single-row reads' whole
 * refusal, both causes at once.
 *
 * A row the fixture layer does not carry and a row it carries for
 * SOMEBODY ELSE'S domain leave here identically, which this module's
 * header argues for at length. The short version: the fixture tables
 * are keyed by id alone, the URL carries a domain, and the two can be
 * paired wrongly by a stale bookmark as easily as by a typo.
 *
 * `id` is taken as an argument rather than read off `row`, because
 * the missing case has no row to read it off.
 *
 * @typeParam T - The fixture row shape.
 * @param domain - The domain the caller's slug resolved to.
 * @param id - What was asked for, for the message.
 * @param label - The singular noun the message names — `finding`,
 * `source`, `persona`, `category`.
 * @param row - What the fixture layer's `find` answered.
 * @returns That row, once it is this domain's.
 * @throws If no row carries the id, or the one that does belongs to
 * another domain.
 */
function ownedRow<T extends DomainOwnedRow>(
  domain: Domain,
  id: number,
  label: string,
  row: T | undefined,
): T {
  if (row === undefined || row.domainId !== domain.id) {
    throw new Error(`Unknown ${label} id: ${id}`);
  }

  return row;
}

/**
 * The seam, scoped to one domain, answering ONE of its rows with this
 * tab's edit to that row applied.
 *
 * {@link deliverDomainRows} for a single row, and deliberately the
 * same composition rather than a second one: the row goes through
 * `applyDrafts` as a one-element list, so an editor loading a record
 * and the list behind it showing that record cannot come to disagree
 * about what this tab has saved.
 *
 * The ownership check runs BEFORE the overlay, which is the ordering
 * that matters. The scope is built from the slug, so overlaying first
 * would let a mismatched pair lay one domain's edits over another
 * domain's row and answer a record that exists nowhere.
 *
 * @typeParam T - The fixture row shape.
 * @param slug - A resolved domain slug.
 * @param resource - Which of that domain's resources the row is one of.
 * @param label - The singular noun a refusal names.
 * @param id - The row wanted, off the route.
 * @param find - The fixture layer's own lookup, which answers
 * `undefined` rather than throwing.
 * @returns The row with this tab's edit applied; a rejection if no
 * domain carries the slug, or if this domain carries no such row.
 */
function deliverDomainRow<T extends DomainOwnedRow>(
  slug: string,
  resource: DomainDraftResource,
  label: string,
  id: number,
  find: (rowId: number) => T | undefined,
): Promise<T> {
  const scope = domainDraftScope(slug, resource);

  return deliverForDomain(slug, (domain) => {
    const stored = ownedRow(domain, id, label, find(id));
    const [drafted = stored] = applyDrafts(scope, [stored]);

    return drafted;
  });
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
 * The config arrangements a person may rule on — the review queue
 * behind the sources surface's approval sub-route.
 *
 * Answers EVERY status rather than the pending ones alone, and that
 * is `./proposals.ts`'s decision read through the seam rather than a
 * narrowing this module declined to make. A queue filtered to
 * `pending` HERE could not tell a source whose config was already
 * approved from one nothing has ever proposed for, and those are
 * different sentences to put in front of an operator. So the status
 * filter belongs where the modal knows which source it is about, and
 * so does the filter that picks that source's own proposals out of
 * the domain's — `listSourceProposals` says both in one paragraph.
 *
 * That is also what lets the overlay do a pending queue's work with
 * no second rule. {@link approveSourceConfig} records the row as it
 * was ruled, `applyDrafts` puts it back in this list carrying its new
 * status, and a modal filtering on `pending` stops showing it. A
 * status filter applied here would take the row OUT of the list
 * instead — the same screen for a different reason, and one that
 * cannot tell a rejection from a proposal that never existed.
 *
 * @param slug - A resolved domain slug.
 * @returns Its proposals in review-queue order, this tab's rulings
 * applied; `[]` for a domain nothing has been proposed for.
 */
export function fetchSourceProposals(
  slug: string,
): Promise<readonly SourceConfigProposal[]> {
  return deliverDomainRows(
    slug,
    'source-proposals',
    (domain) => listSourceProposals(domain.id),
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
 * The one overlay here that composes a SINGLETON rather than a list,
 * for the reason `./drafts.ts` gives: there is no id to key a row
 * draft on and no list to replace a row inside. The bargain is the
 * same as the row overlay's, though — a tab that has saved nothing
 * gets the frozen fixture back by IDENTITY, not a copy of it, so the
 * settings surface reading twice on one render reads one object.
 *
 * @returns This tab's saved preferences, or the settings fixture
 * itself where nothing has been saved.
 */
export function fetchSettings(): Promise<Settings> {
  return deliver(() => applySingletonDraft('settings', getSettings()));
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

/**
 * One finding by id — what the digest's detail modal renders.
 *
 * Overlaid, so the modal shows the verdict the row action just set
 * rather than the stored one. `useSaveFinding` invalidates the
 * FINDINGS key and this row is filed beneath it, so the re-read
 * arrives without that mutation naming a key of its own.
 *
 * @param slug - A resolved domain slug, off `:domainSlug`.
 * @param id - The `findings.id` off `:entityId`.
 * @returns The finding, this tab's edit applied; rejects on a slug no
 * domain carries, and on an id this domain has no finding for.
 */
export function fetchFinding(slug: string, id: number): Promise<Finding> {
  return deliverDomainRow(slug, 'findings', 'finding', id, findFinding);
}

/**
 * One source by id — what the sources surface's editor loads.
 *
 * The single row behind three of that surface's sub-routes: the
 * editor, the config approval and the failures list all name a source
 * in the URL, and only the first of them edits it.
 *
 * @param slug - A resolved domain slug, off `:domainSlug`.
 * @param id - The `sources.id` off `:entityId`.
 * @returns The source, this tab's edit applied; rejects on a slug no
 * domain carries, and on an id this domain has no source for.
 */
export function fetchSource(slug: string, id: number): Promise<Source> {
  return deliverDomainRow(slug, 'sources', 'source', id, findSource);
}

/**
 * One persona by id — what the agents surface's editor loads.
 *
 * @param slug - A resolved domain slug, off `:domainSlug`.
 * @param id - The `personas.id` off `:entityId`.
 * @returns The persona, this tab's edit applied; rejects on a slug no
 * domain carries, and on an id this domain has no persona for.
 */
export function fetchPersona(slug: string, id: number): Promise<Persona> {
  return deliverDomainRow(slug, 'personas', 'persona', id, findPersona);
}

/**
 * One connector by id — what the tools surface's editor loads.
 *
 * Takes no slug and there is nothing for {@link ownedRow} to check,
 * exactly as {@link fetchConnectors} takes none: `connectors` carries
 * no `domain_id`, so a connector is a fact about the installation and
 * an id is the whole of what identifies one. Its draft is filed under
 * {@link CONNECTOR_DRAFTS} for the same reason, which is why an
 * operator who edits one and switches domain still sees the edit.
 *
 * Written out rather than routed through {@link deliverDomainRow},
 * because every line of that helper is about a domain: the scope, the
 * refusal and the resolution all come off a slug this accessor does
 * not have.
 *
 * @param id - The `connectors.id` off `:entityId`.
 * @returns The connector, this tab's edit applied; rejects on an id
 * nothing carries. Cannot reject for a domain — there is no slug.
 */
export function fetchConnector(id: number): Promise<Connector> {
  return deliver(() => {
    const stored = findConnector(id);

    if (stored === undefined) {
      throw new Error(`Unknown connector id: ${id}`);
    }

    const [drafted = stored] = applyDrafts(CONNECTOR_DRAFTS, [stored]);

    return drafted;
  });
}

/**
 * One lexicon category by id — what the term editor is opened on.
 *
 * The one single-row read that is NOT overlaid, and the reason is the
 * same one this module's header gives for `categories` naming no
 * draft resource: the lexicon editor saves a category's TERMS, so
 * there is no edit to a category row for an overlay to apply. The day
 * a surface renames one, `categories` becomes a draft resource in
 * `./drafts.ts` and this accessor grows the same one-element overlay
 * its four siblings already have.
 *
 * The ownership refusal is not narrowed with it. A category id off a
 * URL is paired with a domain slug off the same URL whatever the
 * store holds, so the mismatched pair is refused here exactly as it
 * is for the other three.
 *
 * @param slug - A resolved domain slug, off `:domainSlug`.
 * @param id - The `categories.id` off `:entityId`.
 * @returns The category as the fixture carries it; rejects on a slug
 * no domain carries, and on an id this domain has no category for.
 */
export function fetchCategory(slug: string, id: number): Promise<Category> {
  return deliverForDomain(
    slug,
    (domain) => ownedRow(domain, id, 'category', findCategory(id)),
  );
}

/**
 * One category's vocabulary — what the lexicon's term editor lists.
 *
 * The one read here scoped by a domain AND by a row of it: terms hang
 * off a category, so the pair the URL carries is the pair this takes.
 * That makes it neither a domain list nor a single row, which is a
 * shape worth naming rather than leaving to be inferred — the tests
 * next door partition the barrel by exactly those two.
 *
 * The category is RESOLVED before its terms are listed, through the
 * same {@link ownedRow} the single-row reads refuse with, and for the
 * same reason one step removed. `terms` is keyed by `category_id`
 * alone, so `listTerms(1)` answers the seeded domain's vocabulary
 * whatever slug stood in the URL; a read that skipped the check would
 * hand another domain's lexicon over and then lay THIS domain's
 * drafts on top of it. Refusing with the category's own message
 * rather than one about terms is what keeps this indistinguishable
 * from {@link fetchCategory}'s refusal on the same id — the editor
 * holds both reads on one route, and two different answers to one
 * question is a modal rendering an error beside an empty list.
 *
 * A category that exists and carries no vocabulary is NOT that
 * refusal: it answers `[]`, the ordinary empty state a term editor
 * opens on. No fixture category is one, and `./lexicon.ts` says why
 * the seed ships none — so that branch is reached from the tests
 * beside this module and never from the running demo.
 *
 * Overlaid under `terms`, the resource {@link saveCategoryTerms} has
 * been recording into since it landed. The two together close the gap
 * this module's header recorded from the write's side: a save whose
 * read did not exist yet.
 *
 * @param slug - A resolved domain slug, off `:domainSlug`.
 * @param categoryId - The `categories.id` off `:entityId` — the
 * category whose terms are wanted, never a term's own id.
 * @returns Its terms in seed order, this tab's edits applied; rejects
 * on a slug no domain carries, and on an id this domain has no
 * category for.
 */
export function fetchTerms(
  slug: string,
  categoryId: number,
): Promise<readonly Term[]> {
  const scope = domainDraftScope(slug, 'terms');

  return deliverForDomain(slug, (domain) => {
    const category = ownedRow(
      domain,
      categoryId,
      'category',
      findCategory(categoryId),
    );

    return applyDrafts(scope, listTerms(category.id));
  });
}

/**
 * One source's failed captures — the list behind the sources
 * surface's failures sub-route.
 *
 * A PREDICATE over `documents` rather than a read of a table of its
 * own, because there is no such table to read. `DocumentParseStatus`
 * is `'ok' | 'failed'`, and a capture that failed to parse is a
 * document the pipeline KEPT with its error beside it — the
 * fail-flag-keep behaviour `./digest.ts` seeds a row for — rather
 * than a row moved to a dead-letter queue. Naming it a queue here
 * would be this module inventing a shape the schema does not have,
 * and the header says why the narrowing is a WHERE clause and not the
 * second policy that rule forbids.
 *
 * The predicate runs OVER the overlay rather than under it, for the
 * reason {@link fetchSourceStatusCounts} counts the overlaid list:
 * this list and {@link fetchDocuments} beside it must not come to
 * disagree about what this tab has ruled.
 * {@link resolveSourceFailure} states that WHICH member a keep or a
 * discard moves is the failures modal's decision and not this
 * module's, so overlaying first is also the only ordering that
 * follows whatever that decision turns out to be — a predicate run
 * beneath the overlay would answer the stored rows and then paint the
 * rulings on, which is a queue that never shortens.
 *
 * The SOURCE is resolved before its documents are read, through the
 * same {@link ownedRow} the single-row reads refuse with, and for the
 * reason {@link fetchTerms} resolves its category: `documents` is
 * keyed by `source_id` alone, so a read that skipped the check would
 * hand another domain's failures over and then lay THIS domain's
 * drafts on top of them. Refusing with the SOURCE's own message keeps
 * it indistinguishable from {@link fetchSource}'s refusal on the same
 * id, which the modal holds beside it on one route.
 *
 * A source that exists and has failed nothing answers `[]`, which is
 * the empty state the modal opens on and not that refusal. Most
 * fixture sources are one, so unlike {@link fetchTerms}' empty branch
 * this one has a subject to be tested against.
 *
 * @param slug - A resolved domain slug, off `:domainSlug`.
 * @param sourceId - The `sources.id` off `:entityId` — the source
 * whose failures are wanted, never a document's own id.
 * @returns Its failed captures, newest capture first, this tab's
 * rulings applied; rejects on a slug no domain carries, and on an id
 * this domain has no source for.
 */
export function fetchSourceFailures(
  slug: string,
  sourceId: number,
): Promise<readonly Document[]> {
  const scope = domainDraftScope(slug, 'documents');

  return deliverForDomain(slug, (domain) => {
    const source = ownedRow(domain, sourceId, 'source', findSource(sourceId));

    return applyDrafts(scope, listDocuments(domain.id)).filter(
      (document) => document.sourceId === source.id
        && document.parseStatus === 'failed',
    );
  });
}

/**
 * Save one category's terms — what the lexicon editor's save button
 * does.
 *
 * Eventually a PUT: the editor holds the category's whole term list
 * and hands back the whole of it, so the request REPLACES a collection
 * rather than patching members of it. That is also the one place the
 * fixture seam cannot follow the endpoint — the store edits rows and
 * cannot insert or delete, so a term added or removed in the editor is
 * recorded here only where it already had a row. `./drafts.ts` carries
 * the reasoning.
 *
 * There is no category argument, and its absence is a decision: every
 * {@link Term} names its own `categoryId`, which is where the path
 * parameter of that PUT comes from at the swap. A third argument would
 * be a second place to get the same answer, and the two could
 * disagree.
 *
 * @param slug - A resolved domain slug. Terms belong to a category and
 * a category to a domain, so the write is scoped like the read that
 * shows it.
 * @param terms - Every term of the category, as the editor left them.
 * @returns Nothing; rejects if no domain carries the slug, having
 * recorded nothing.
 */
export function saveCategoryTerms(
  slug: string,
  terms: readonly Term[],
): Promise<void> {
  return recordForDomain(slug, 'terms', terms);
}

/**
 * Save one finding — every ruling the digest records, from either of
 * the two controls that make one.
 *
 * The row menu and the detail modal both write a VERDICT through this,
 * and the menu additionally writes the queue stamp its own module
 * reserves on the payload. Nothing else on that surface writes at all,
 * which is what keeps this a whole-row save with one caller shape.
 *
 * Eventually a PATCH rather than a PUT, and the difference is real
 * here: {@link Finding.verdict} is not a `findings` column at all but
 * a flattened `finding_labels` row, so the endpoint behind this writes
 * a LABEL and answers the finding with its current one. Nothing above
 * this seam should learn that, which is why the accessor takes the
 * finding as the surface renders it.
 *
 * @param slug - A resolved domain slug.
 * @param finding - The finding as the operator left it.
 * @returns Nothing; rejects if no domain carries the slug, having
 * recorded nothing.
 */
export function saveFinding(slug: string, finding: Finding): Promise<void> {
  return recordForDomain(slug, 'findings', [finding]);
}

/**
 * Save one source — the sources surface's editor.
 *
 * Eventually a PUT, the editor holding the row it loaded and handing
 * back all of it. Worth knowing which members that includes: `cursor`,
 * `consecutiveFailures`, `lastSuccessAt` and `lastFailureAt` are the
 * PIPELINE's to write, not an operator's, so an endpoint accepting
 * this payload has to ignore them rather than trust them. The fixture
 * seam does trust them, having nothing else to compare against, which
 * is a narrowing worth stating rather than discovering.
 *
 * @param slug - A resolved domain slug.
 * @param source - The source as the operator left it.
 * @returns Nothing; rejects if no domain carries the slug, having
 * recorded nothing.
 */
export function saveSource(slug: string, source: Source): Promise<void> {
  return recordForDomain(slug, 'sources', [source]);
}

/**
 * Rule on a pending source-config proposal — approve it, or reject it.
 *
 * Eventually a POST and not a PUT, which is the distinction its name
 * carries: an operator does not EDIT a proposal, they rule on it, and
 * what the ruling changes is a status the proposer wrote and a config
 * the pipeline then reads. Posting the act keeps the two apart; a PUT
 * of an edited row would let an approval also rewrite the very
 * `parser_config` it was approving, unreviewed.
 *
 * The one write here whose parameter is STRUCTURAL rather than a
 * fixture type, and it STAYS that way now that `./proposals.ts` has
 * landed — the module that redeclares the `source_config_proposals`
 * columns this surface renders, and that
 * {@link fetchSourceProposals} above reads through. This signature
 * said it was not a placeholder to narrow later, and that is what
 * happened: `recordDraft` files any row carrying an id, a
 * {@link SourceConfigProposal} satisfies the constraint unchanged,
 * and `./proposals.test.ts` puts that assignability in front of the
 * compiler rather than leaving it asserted in prose.
 *
 * @param slug - A resolved domain slug. A proposal is about one
 * domain's source, so it is scoped like everything else about it.
 * @param ruling - The proposal row as the operator ruled it.
 * @returns Nothing; rejects if no domain carries the slug, having
 * recorded nothing.
 */
export function approveSourceConfig(
  slug: string,
  ruling: DraftableRow,
): Promise<void> {
  return recordForDomain(slug, 'source-proposals', [ruling]);
}

/**
 * Rule on one failed capture — the keep and discard actions on the
 * sources surface's failures list.
 *
 * Eventually a POST, for the same reason {@link approveSourceConfig}
 * is one: keeping or discarding a failed document is an act on a
 * document rather than an edit of one, and the endpoint records the
 * ruling and decides what it does to the row. What it does NOT do is
 * delete the document — a capture that failed to parse is evidence
 * about a source, and the failures list is a queue of unresolved ones
 * rather than the only thing that refers to them.
 *
 * Takes the {@link Document} as the modal ruled it, so this module
 * spells no keep-versus-discard vocabulary of its own. Which member a
 * ruling moves is the failures modal's decision to make and to
 * document, and putting it here would be that decision made twice.
 * {@link fetchSourceFailures} is what shows the result, and it stays
 * out of that decision the same way: its predicate reads the OVERLAID
 * documents, so whichever member the modal settles on is the one the
 * queue follows.
 *
 * @param slug - A resolved domain slug.
 * @param document - The document as the ruling left it.
 * @returns Nothing; rejects if no domain carries the slug, having
 * recorded nothing.
 */
export function resolveSourceFailure(
  slug: string,
  document: Document,
): Promise<void> {
  return recordForDomain(slug, 'documents', [document]);
}

/**
 * Save one persona — the agents surface's editor.
 *
 * Eventually a PUT. A persona is three fields and all three are the
 * operator's, so there is no pipeline-owned member for the endpoint to
 * ignore the way {@link saveSource}'s has.
 *
 * @param slug - A resolved domain slug. A persona is configuration of
 * a DOMAIN — what a researcher is asked to be is a property of the
 * subject being researched — so this is scoped like the cards it
 * feeds.
 * @param persona - The persona as the operator left it.
 * @returns Nothing; rejects if no domain carries the slug, having
 * recorded nothing.
 */
export function savePersona(slug: string, persona: Persona): Promise<void> {
  return recordForDomain(slug, 'personas', [persona]);
}

/**
 * Save one connector — the tools surface's editor.
 *
 * Eventually a PUT with a hole in it. Secrets are WRITE-ONLY: the
 * fixture redacts them and a real endpoint would never answer them
 * either, so a payload that echoed the placeholder back would blank
 * the stored credential on every save that did not retype it. The
 * editor omits a secret field left untouched rather than sending its
 * mask, which is a rule the editor owns and this accessor cannot
 * enforce — it stores whatever row it is handed.
 *
 * Takes no slug, exactly as {@link fetchConnectors} does not: the
 * `connectors` table carries no `domain_id`, so a connector is a fact
 * about the installation and its edit is filed under
 * {@link CONNECTOR_DRAFTS} rather than under whichever domain happened
 * to be active. An operator who edits a connector and switches domain
 * still sees the edit.
 *
 * @param connector - The connector as the operator left it.
 * @returns Nothing. Cannot reject: there is no slug to refuse.
 */
export function saveConnector(connector: Connector): Promise<void> {
  return deliver(() => {
    recordDraft(CONNECTOR_DRAFTS, connector);
  });
}

/**
 * Save one domain's export subscriptions — the format list on the
 * tools surface.
 *
 * Eventually a PUT of the collection, like {@link saveCategoryTerms}
 * and with the same gap: subscribing to a format this domain has never
 * subscribed to is an INSERT, and the store cannot mint the id one
 * would need. So a toggle over a format that already has a row is
 * recorded, and one over a format that does not has nowhere to go
 * until the endpoint exists.
 *
 * A list rather than one row because the control is a list: an
 * operator flips several formats and saves once, and recording them
 * one call at a time would put the surface in charge of a transaction
 * boundary the endpoint owns.
 *
 * @param slug - A resolved domain slug. This is the half of the tools
 * surface that DOES move with the domain — the connector cards above
 * it do not.
 * @param subscriptions - Every subscription of the domain, as the list
 * left them.
 * @returns Nothing; rejects if no domain carries the slug, having
 * recorded nothing.
 */
export function saveExportSubscriptions(
  slug: string,
  subscriptions: readonly ExportSubscription[],
): Promise<void> {
  return recordForDomain(slug, 'export-subscriptions', subscriptions);
}

/**
 * Save the operator's preferences — the settings surface.
 *
 * Eventually a PUT of a singleton, and the one write here whose
 * endpoint does not exist even in principle yet: {@link Settings}
 * mirrors no table, so where an operator's preferences are persisted
 * is a schema decision nobody has made. `./settings.ts` and
 * `./types.ts` both say so on the fixture itself. What this accessor
 * settles is only the SHAPE of the eventual call — the whole
 * preference set replaced at once, since none of its members is
 * independently addressable.
 *
 * Takes no slug: an operator is a person and not a workspace, so there
 * is one preference set and a domain switch leaves it alone. Recorded
 * through `./drafts.ts`'s singleton slot rather than as a row, for the
 * reason that module gives — there is no id to key one on.
 *
 * @param settings - The preferences as the operator left them.
 * @returns Nothing. Cannot reject: there is no slug to refuse.
 */
export function saveSettings(settings: Settings): Promise<void> {
  return deliver(() => {
    recordSingletonDraft('settings', settings);
  });
}
