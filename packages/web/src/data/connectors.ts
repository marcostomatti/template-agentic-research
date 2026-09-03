/**
 * @packageDocumentation
 * The connector and export-subscription fixtures — the services this
 * deployment is configured to call, and the standing deliveries the
 * domains have asked for. Both halves of what the tools surface
 * renders.
 *
 * Two tables in one module because neither is legible without the
 * other. A `connectors` row says where a service actually is; an
 * `export_subscriptions` row pairs a domain and a format with the
 * connector the rendered artifact is handed to. Splitting them would
 * leave a subscriptions module whose every row cites an id it cannot
 * resolve, and the join the tools page performs would have to be
 * written across two files that nothing holds in step.
 *
 * The two are scoped DIFFERENTLY, which is the fact most likely to be
 * got wrong by a page or by the q15 swap:
 *
 * - Connectors are DEPLOYMENT-level. There is no `domain_id` on the
 *   table, so {@link listConnectors} takes no domain and `./api.ts`
 *   must not scope it by slug. Which model endpoint answers is a fact
 *   about the installation, not about any one subject being
 *   researched, and a copy per domain would record one address in as
 *   many places as there are domains.
 * - Subscriptions are DOMAIN-level, like every other fixture table
 *   here, and {@link listExportSubscriptions} takes a `domains.id`.
 *
 * Nothing here is transcribed from a seed. `packages/service/data/`
 * seeds a deployment's VOCABULARY — domains, categories, terms,
 * personas, topics — and ships neither a `connectors.json` nor an
 * `export_subscriptions.json`: which services an instance calls and
 * what it delivers are facts about that instance rather than about
 * the example, so there is no file to pin these rows against and no
 * drift to catch. What constrains them instead is internal and lands
 * in `./connectors.test.ts`: every subscription's `connectorId` has
 * to resolve to a connector of kind `export_target`, or the tools
 * page's destination cell resolves to nothing.
 *
 * SECRETS. `connectors.config` is where the service keeps whatever
 * authenticates a call, and these files are tracked and rendered.
 * Every value under a credential-shaped key below is the single
 * {@link REDACTED} placeholder and nothing that could be mistaken for
 * a real credential — not a plausible-looking key, not a shortened
 * one, not a key for a service that no longer exists. The test asserts
 * it over the whole table rather than trusting the convention to be
 * remembered, because the cost of getting it wrong once is a secret in
 * a public git history rather than a broken page.
 *
 * The rows are not a uniform set. Each state below is here to be met
 * by a page that would otherwise be written as though it never
 * happens, and each is named again on the row carrying it:
 *
 * - EVERY {@link ConnectorKind}. The tools grid renders a kind badge
 *   per card and the editor modal branches per kind, so a kind no
 *   fixture carries is a branch nothing rehearses.
 * - TWO rows of one kind told apart by name, which is what
 *   `connectors_kind_name_unique` exists for and what
 *   {@link findConnectorByName} is keyed on.
 * - Both {@link ConnectorStatus} values, so the card's
 *   `StatusIndicator` has each tone to render — including a
 *   subscription pointing AT the unconfigured one, which is the state
 *   an export reaches when it renders and has nowhere to go.
 * - A config carrying no credential at all beside ones that do. A
 *   filesystem destination needs none, and a redaction check written
 *   against a table where every row has a secret would never meet the
 *   row that has none.
 * - A subscription with a NULL `nextRunAt` beside one whose
 *   `nextRunAt` has already passed. Both are rows the dispatcher is
 *   not running right now and they are not the same state — one was
 *   never scheduled, the other is due and waiting for the next tick —
 *   which a cadence cell keyed off the stamp alone would render
 *   identically.
 * - A DISABLED subscription that keeps its cadence and its due time.
 *   Disabling is not cancelling: cancelling is a DELETE, and a row
 *   switched off keeps every part of its configuration so it can be
 *   switched back on.
 *
 * What this module deliberately does NOT carry is a last-used stamp,
 * although the UI spec names one on the connector card. Schema v2
 * stores nothing of the sort: `connectors` has four columns and none
 * of them is a timestamp, and `llm_calls` — the one table that records
 * calls going out — carries no connector reference to aggregate over.
 * So a last-used reading is a schema decision q15 has to make before
 * an endpoint can answer it, and the honest stand-in the stored
 * columns support is the subscription join
 * {@link summarizeExportSubscriptions} returns: what a destination
 * receives, and when it is next due.
 *
 * Every subscription belongs to the seeded domain. The sparse domain
 * that `./domains.ts` exports as `SPARSE_DOMAIN_SLUG` deliberately
 * gets none, which is how the empty half of the tools surface is
 * reached in a running demo: switch domain rather than empty a table.
 * The connectors themselves stay visible across that switch, because
 * they belong to the deployment and not to either domain — which is
 * the clearest demonstration of the scoping split above that the shell
 * can give.
 *
 * Addresses are `example.com`, `example.net` and `example.org` for the
 * reason the rest of the fixtures are illustrative: the services an
 * instance calls belong to whoever operates it, and a reserved domain
 * cannot resolve to somebody's real endpoint if a row is ever pointed
 * at a network.
 */

import type { Connector, ConnectorKind, ExportSubscription } from './types';

import { DEFAULT_DOMAIN_SLUG, getDomain } from './domains';

/**
 * The `domains.id` every subscription below references.
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
 * What stands in a fixture config wherever the service would hold a
 * credential.
 *
 * One placeholder rather than a per-row invention, and exported so the
 * test asserts against the same string the fixtures are written with
 * instead of restating it. Deliberately not credential-SHAPED: it
 * carries no prefix, no length and no character set that any real
 * scheme uses, so it cannot be mistaken for a rotated key or fed to a
 * client that would then fail somewhere far from here.
 *
 * The brackets are load-bearing. A bare word would be a legitimate
 * value for some config keys, and the point of this string is that it
 * is a value nothing could legitimately be.
 */
export const REDACTED = '[redacted]';

/**
 * What the tools surface says about a connector at a glance.
 *
 * DERIVED, and so declared here rather than in `./types.ts`: it mirrors
 * no column. The schema's own docblock supplies the reading — a
 * `connectors.config` of `{}` means nothing is configured, so the row
 * names a service the pipeline cannot call rather than one it calls
 * with defaults — and the card needs one answer per row for its
 * `StatusIndicator`.
 *
 * Two members and not four, unlike the sources surface's status. The
 * difference is that nothing here has been ATTEMPTED: a source carries
 * the record of its own fetches, while a connector carries only its
 * configuration, so there is no failure streak to read and no
 * never-fetched state to tell apart from a healthy one. A connector
 * that is configured and broken looks exactly like one that is
 * configured and working, and will go on doing so until something
 * stores the outcome of a call against the row.
 *
 * - `unconfigured` — an empty config. The row exists, and there is
 *   nowhere to reach.
 * - `ready` — an address is configured. NOT a claim that the service
 *   answers, for the reason above.
 */
export type ConnectorStatus = 'ready' | 'unconfigured';

/**
 * One row of the tools surface's export list.
 *
 * The subscription plus the connector it delivers through, resolved.
 * Assembled here rather than in the page because it is the shape the
 * q15 endpoint has to answer with: a page resolving destinations
 * itself would need every connector shipped to it in order to render
 * a domain's deliveries, and would have to invent its own answer for a
 * reference nothing resolves.
 */
export interface ExportSubscriptionSummary {
  /** The standing delivery being described. */
  readonly subscription: ExportSubscription;
  /**
   * Where its rendered artifact is handed over. Always an
   * `export_target`; see {@link summarizeExportSubscriptions} for what
   * happens when a reference does not resolve.
   */
  readonly connector: Connector;
}

/**
 * The services this deployment calls — `connectors` rows, grouped by
 * kind and in configuration order within each kind.
 *
 * Nothing re-sorts them: id order is the order an operator added them
 * in, and a page wanting another one sorts the copy it is handed.
 *
 * Ids 5, 6 and 7 are the export targets the subscriptions below
 * resolve by NAME rather than cite by number — see
 * {@link exportTargetId} for why that resolution is worth the few
 * lines it costs.
 */
export const CONNECTORS: readonly Connector[] = [
  {
    id: 1,
    kind: 'llm',
    // The first half of the pair `connectors_kind_name_unique` exists
    // for: this row and the next are one kind told apart by name, and
    // they are what `findConnectorByName` is keyed on. A lookup keyed
    // on the kind alone answers a request for either with whichever
    // the map kept, which is a wrong answer rather than a missing one.
    name: 'primary',
    config: {
      endpoint: 'https://api.example.com/v1/messages',
      model: 'example-model-standard',
      // See the module docblock: every credential-shaped key in this
      // table carries the placeholder and nothing else.
      apiKey: REDACTED,
    },
  },
  {
    id: 2,
    kind: 'llm',
    // Second instance of the same kind, at the same endpoint, with a
    // different model — which is the ordinary reason a deployment has
    // two: one model for the researcher and a longer-context one for
    // the drafter, chosen per persona rather than per domain.
    name: 'long-context',
    config: {
      endpoint: 'https://api.example.com/v1/messages',
      model: 'example-model-long-context',
      apiKey: REDACTED,
    },
  },
  {
    id: 3,
    kind: 'search',
    name: 'web',
    config: {
      endpoint: 'https://search.example.net/v1/query',
      // Not every config member is an address or a secret: a client
      // takes whatever that kind of client takes, which is why
      // `Connector.config` is an open record and carries no interface
      // across the four kinds.
      resultLimit: 20,
      apiKey: REDACTED,
    },
  },
  {
    id: 4,
    kind: 'notebook',
    name: 'research',
    config: {
      baseUrl: 'https://notebook.example.org',
      notebookId: 'example-tech-radar',
      // A second credential-shaped key, spelled differently from the
      // three `apiKey`s above. The redaction check matches on the
      // SHAPE of a key rather than on a list of exact names, and this
      // row is what stops that check passing because every secret in
      // the table happened to be spelled one way.
      password: REDACTED,
    },
  },
  {
    id: 5,
    kind: 'export_target',
    name: 'notes-directory',
    config: {
      // A filesystem destination, and the row carrying NO credential
      // at all. A redaction check written against a table where every
      // row has a secret would never meet this shape, and a page
      // rendering "credentials configured" off the presence of a key
      // would report this row as unfinished.
      path: '/srv/exports/example-tech-radar/notes',
    },
  },
  {
    id: 6,
    kind: 'export_target',
    name: 'static-feed',
    config: {
      path: '/srv/exports/example-tech-radar/feed.xml',
      // Where the written file is served from, which is a different
      // fact from where it is written: an RSS export is static file
      // generation and opens no channel of its own.
      publicUrl: 'https://example.org/example-tech-radar/feed.xml',
    },
  },
  {
    id: 7,
    kind: 'export_target',
    // Configured as a row and not yet as a service: somebody added the
    // destination, a subscription was pointed at it, and nobody has
    // filled in where it goes. An empty config is the schema's own
    // reading of "there is nowhere to reach" — see
    // `classifySource`'s counterpart, `classifyConnector` below.
    name: 'mail-drafts',
    config: {},
  },
];

const CONNECTORS_BY_ID = new Map<number, Connector>(
  CONNECTORS.map((connector) => [connector.id, connector]),
);

/**
 * The key {@link findConnectorByName} looks a row up under — the pair
 * `connectors_kind_name_unique` holds, not the name alone.
 *
 * A name identifies one instance WITHIN its kind and nowhere else.
 * Instances are named after where they run far more often than after
 * what they do, so the same name under two kinds is ordinary, and a
 * map keyed on the name by itself would answer one kind's lookup with
 * another kind's address — a wrong answer rather than a missing one.
 *
 * @param kind - The family of service the row fronts.
 * @param name - Which instance of that kind is wanted.
 * @returns The composite key for the lookup map.
 */
function kindNameKey(kind: ConnectorKind, name: string): string {
  return `${kind}/${name}`;
}

const CONNECTORS_BY_KIND_NAME = new Map<string, Connector>(
  CONNECTORS.map((connector) => [
    kindNameKey(connector.kind, connector.name),
    connector,
  ]),
);

/**
 * The `connectors.id` of one export target, read off the table above.
 *
 * The subscriptions below resolve their destinations through this
 * rather than citing `5`, `6` and `7`, for the reason
 * {@link SEEDED_DOMAIN_ID} is read off the domain fixture: renumbering
 * the connectors then moves the subscriptions with them instead of
 * silently re-pointing each one at whatever now holds its old id — and
 * re-pointing a delivery is exactly the edit a fixture author would
 * not notice having made.
 *
 * Throwing at module scope is deliberate and is the loud half of the
 * same bargain: a subscription whose destination has gone is not a row
 * with a degraded cell, it is a delivery to nowhere, and an import
 * that fails says so at the only moment anyone is looking.
 *
 * Restricted to `export_target` because that is the only kind a
 * subscription may name. It is also what makes the whole-table check
 * in `./connectors.test.ts` a guard against a future literal rather
 * than a claim about today's rows.
 *
 * @param name - The export target's name, within its kind.
 * @returns Its `connectors.id`.
 * @throws If no fixture connector is an export target of that name.
 */
function exportTargetId(name: string): number {
  const connector = CONNECTORS_BY_KIND_NAME.get(
    kindNameKey('export_target', name),
  );

  if (connector === undefined) {
    throw new Error(`Unknown export target connector: ${name}`);
  }

  return connector.id;
}

const NOTES_TARGET_ID = exportTargetId('notes-directory');
const FEED_TARGET_ID = exportTargetId('static-feed');
const MAIL_TARGET_ID = exportTargetId('mail-drafts');

/**
 * The standing deliveries — `export_subscriptions` rows, in the order
 * they were subscribed.
 *
 * Every row carries the whole schedulable column set, `null`s written
 * out, because a table takes all of it or none of it: a row with an
 * interval and no due time repeats on a schedule nothing ever claims,
 * and leaving a member off would make that state indistinguishable
 * from a member somebody forgot.
 *
 * The set covers four of the five `ExportFormat` members. The
 * fifth, `notion_md`, is left UNSUBSCRIBED on purpose: the tools
 * surface names the formats a domain receives nothing under in one
 * sentence under its toggle list, and a fixture set covering every
 * member would leave that sentence unrehearsed. A sentence rather
 * than an OFF toggle because subscribing to a new format is an
 * insert, which the write seam cannot perform.
 *
 * Two pairs make the natural key
 * `export_subscriptions_domain_id_format_connector_id_unique` the
 * TRIPLE it is rather than either pair inside it: ids 1 and 2 share a
 * domain and a destination with different formats, ids 3 and 4 share a
 * domain and a format with different destinations. Both are ordinary —
 * one domain may want two artifacts in one place, and one artifact in
 * two places — and a distinctness guard keyed on either pair reddens
 * against these rows rather than passing over a fixture set that never
 * exercised it.
 */
export const EXPORT_SUBSCRIPTIONS: readonly ExportSubscription[] = [
  {
    id: 1,
    domainId: SEEDED_DOMAIN_ID,
    format: 'obsidian_md',
    connectorId: NOTES_TARGET_ID,
    // Daily, and due tomorrow morning: the ordinary state, and the one
    // a cadence cell is written against before it meets the three
    // below.
    intervalSeconds: 86400,
    nextRunAt: '2026-06-12T06:00:00.000Z',
    enabled: true,
    // No clamp of its own. The bounds exist for the agent-driven mode,
    // where a proposed gap is clamped before it is written, and a row
    // on a fixed cadence has nothing to clamp — so NULL here is the
    // common case rather than a member left unset.
    minIntervalSeconds: null,
    maxIntervalSeconds: null,
  },
  {
    id: 2,
    domainId: SEEDED_DOMAIN_ID,
    // Same domain and same destination as id 1, different format: two
    // artifacts written to one place, which is why the natural key
    // cannot be the domain and the connector.
    format: 'pdf',
    connectorId: NOTES_TARGET_ID,
    intervalSeconds: 2592000,
    // Never scheduled. NULL means nothing claims it whatever its
    // interval says — subscribed and not yet given a due time — and it
    // is NOT the state id 3 is in below, which is due and waiting. A
    // cadence cell reading the interval alone renders these two the
    // same way and would be wrong about both.
    nextRunAt: null,
    enabled: true,
    minIntervalSeconds: null,
    maxIntervalSeconds: null,
  },
  {
    id: 3,
    domainId: SEEDED_DOMAIN_ID,
    format: 'rss',
    connectorId: FEED_TARGET_ID,
    intervalSeconds: 21600,
    // Already due: `FIXTURE_NOW` is 14:30 on this day, so this row has
    // come due and no tick has claimed it yet. An overdue row is an
    // ordinary reading rather than a fault — the dispatcher wakes on
    // its own cron and takes what has come due — and it is the state
    // that makes a relative-time cell render the past rather than the
    // future.
    nextRunAt: '2026-06-11T12:00:00.000Z',
    enabled: true,
    // The one row carrying the clamp, which is what the pair of bounds
    // is for: an agent proposing when this feed should next be
    // rebuilt has its proposal held between an hour and two days, so a
    // judgement call still lands inside limits a person set.
    minIntervalSeconds: 3600,
    maxIntervalSeconds: 172800,
  },
  {
    id: 4,
    domainId: SEEDED_DOMAIN_ID,
    // Same domain and same format as id 3, different destination: the
    // feed is written into the notes directory as well as served, which
    // is why the natural key cannot be the domain and the format.
    format: 'rss',
    connectorId: NOTES_TARGET_ID,
    intervalSeconds: 604800,
    nextRunAt: '2026-06-14T07:00:00.000Z',
    enabled: true,
    minIntervalSeconds: null,
    maxIntervalSeconds: null,
  },
  {
    id: 5,
    domainId: SEEDED_DOMAIN_ID,
    format: 'email_draft',
    // Points at the unconfigured target, which is the state an export
    // reaches when it renders and has nowhere to go — and the reason
    // an operator switched it off rather than deleting it.
    connectorId: MAIL_TARGET_ID,
    // Switched off, with the cadence and the due time KEPT. Disabling
    // is not cancelling — cancelling is a DELETE — so every part of
    // this row's configuration survives being switched off, and a page
    // clearing the schedule when the toggle flips would destroy what
    // the operator meant to keep.
    intervalSeconds: 604800,
    nextRunAt: '2026-06-13T05:00:00.000Z',
    enabled: false,
    minIntervalSeconds: null,
    maxIntervalSeconds: null,
  },
];

const EXPORT_SUBSCRIPTIONS_BY_ID = new Map<number, ExportSubscription>(
  EXPORT_SUBSCRIPTIONS.map((subscription) => [subscription.id, subscription]),
);

/**
 * How the tools surface reads one connector.
 *
 * The whole reading is the config: a row with nothing in it names a
 * service the pipeline cannot call, and a row with something in it
 * names one it can try. There is no third answer available from the
 * stored columns, and inventing one — reachable, healthy, last seen —
 * would be a claim this deployment records nothing to support. See
 * {@link ConnectorStatus} for what that costs and what would have to
 * be stored to buy it back.
 *
 * That bars a third STATUS and not a second reading of the payload.
 * `../pages/tools/connectionTest.ts` reads this same config for
 * whether the address it names could be dialled at all, which is a
 * fact about the row rather than a claim about the service, and it
 * refuses rows this answers `ready` for — a documentation-reserved
 * endpoint among them. Two readings of one column, and only this one
 * goes on a card.
 *
 * @param connector - The row to read.
 * @returns Its status. Total: every connector has exactly one.
 */
export function classifyConnector(connector: Connector): ConnectorStatus {
  if (Object.keys(connector.config).length === 0) {
    return 'unconfigured';
  }

  return 'ready';
}

/**
 * Every connector this deployment calls, in configuration order.
 *
 * Takes NO domain, unlike every other list accessor in `./`, because
 * `connectors` has no `domain_id`: the row is a fact about the
 * installation. `./api.ts` must not scope this one by slug, and the
 * tools surface shows the same cards whichever domain is active — the
 * clearest place the two scopes are visible side by side, since the
 * export list beneath the cards changes with the domain and the cards
 * do not.
 *
 * Copies rather than filters, because there is nothing to filter on.
 * The copy is not decoration: handing out the array itself would let a
 * caller sorting it in place reorder every later reader in the same
 * process.
 *
 * @returns The connectors, in configuration order. Never the stored
 * array.
 */
export function listConnectors(): readonly Connector[] {
  return [...CONNECTORS];
}

/**
 * Look a connector up by id, tolerating a miss.
 *
 * Use this where an unknown id is an ordinary outcome — the tools edit
 * sub-route carries one in the URL, so a stale bookmark reaches here
 * as a number nothing answers and the page renders a not-found state.
 * Where a miss would mean a broken fixture instead, {@link getConnector}
 * says so louder.
 *
 * @param id - The `connectors.id` wanted.
 * @returns The connector, or `undefined` if no fixture carries that id.
 */
export function findConnector(id: number): Connector | undefined {
  return CONNECTORS_BY_ID.get(id);
}

/**
 * Look a connector up by id, or throw.
 *
 * @param id - The `connectors.id` wanted.
 * @returns The connector carrying that id.
 * @throws If no fixture connector carries it.
 */
export function getConnector(id: number): Connector {
  const connector = findConnector(id);

  if (connector === undefined) {
    throw new Error(`Unknown connector id: ${id}`);
  }

  return connector;
}

/**
 * Look a connector up by the natural key the table is upserted on.
 *
 * The lookup a RUN makes — a workflow needs the endpoint of the llm
 * connector it was configured to use, by name — and so the one the
 * q15 endpoint has to answer as well as the id lookup above. Kept here
 * rather than left to each caller's `find` over
 * {@link listConnectors} so that the composite key is written once:
 * see {@link kindNameKey} for what goes wrong when it is not.
 *
 * Tolerant only, with no throwing twin. A name a deployment has not
 * configured is an ordinary answer — an installation calling one model
 * endpoint names no second one — and unlike an id, a kind and a name
 * are not something a URL hands over for a page to fail on.
 *
 * @param kind - The family of service wanted.
 * @param name - The instance name, as configured. Matched exactly.
 * @returns The connector, or `undefined` if no row of that kind
 * carries that name.
 */
export function findConnectorByName(
  kind: ConnectorKind,
  name: string,
): Connector | undefined {
  return CONNECTORS_BY_KIND_NAME.get(kindNameKey(kind, name));
}

/**
 * The standing deliveries of one domain, in subscription order.
 *
 * Scoped by numeric id rather than by slug: `./api.ts` is the module
 * that speaks slugs, and it resolves one through `getDomain`, whose
 * throw is where an unknown domain is refused. A domain with no
 * subscriptions answers `[]`, which is a state the fixtures reach on
 * purpose rather than an error.
 *
 * Disabled rows are INCLUDED. The tools surface is where a
 * subscription is switched back on, so filtering them out here would
 * make the control that turns one off the control that hides it.
 *
 * @param domainId - The `domains.id` whose subscriptions are wanted.
 * @returns Its subscriptions, in subscription order. Never the stored
 * array.
 */
export function listExportSubscriptions(
  domainId: number,
): readonly ExportSubscription[] {
  return EXPORT_SUBSCRIPTIONS.filter(
    (subscription) => subscription.domainId === domainId,
  );
}

/**
 * Look a subscription up by id, tolerating a miss.
 *
 * @param id - The `export_subscriptions.id` wanted.
 * @returns The subscription, or `undefined` if no fixture carries that
 * id.
 */
export function findExportSubscription(
  id: number,
): ExportSubscription | undefined {
  return EXPORT_SUBSCRIPTIONS_BY_ID.get(id);
}

/**
 * Look a subscription up by id, or throw.
 *
 * @param id - The `export_subscriptions.id` wanted.
 * @returns The subscription carrying that id.
 * @throws If no fixture subscription carries it.
 */
export function getExportSubscription(id: number): ExportSubscription {
  const subscription = findExportSubscription(id);

  if (subscription === undefined) {
    throw new Error(`Unknown export subscription id: ${id}`);
  }

  return subscription;
}

/**
 * One domain's deliveries with their destinations resolved — what the
 * tools surface's export list renders.
 *
 * The join this module exists to answer, and the reason both tables
 * live in one file: the page maps over these and renders a row each,
 * so the resolution stays here and the q15 swap replaces one accessor
 * rather than a page.
 *
 * Resolves through {@link getConnector} and so THROWS on a dangling
 * reference rather than dropping the row. A subscription whose
 * destination has gone is a delivery to nowhere, and a list that
 * quietly rendered one fewer row would report the same thing as a
 * domain that had cancelled it. The schema refuses to delete a
 * connector that still receives exports for the same reason.
 *
 * @param domainId - The `domains.id` whose deliveries are wanted.
 * @returns A summary per subscription, in subscription order; `[]` for
 * a domain that has subscribed to nothing.
 * @throws If a subscription names a connector no fixture carries.
 */
export function summarizeExportSubscriptions(
  domainId: number,
): readonly ExportSubscriptionSummary[] {
  return listExportSubscriptions(domainId).map((subscription) => ({
    subscription,
    connector: getConnector(subscription.connectorId),
  }));
}
