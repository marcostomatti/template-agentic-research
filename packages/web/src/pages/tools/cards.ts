/**
 * @packageDocumentation
 * The tools surface's readings: how a connector's kind and state are
 * named and drawn, how its stored configuration is put on a card, and
 * how a domain's standing deliveries are described.
 *
 * Pure, and beside the page rather than inside it, for the reason
 * `../digest/rows.ts` gives: the unit suite is node-only and collects
 * `.ts` alone, so every rule worth stating lives here and the
 * component is left with one call per figure.
 *
 * ## Two halves, differently scoped
 *
 * This module carries both, because the page renders both and neither
 * derivation belongs anywhere else. What it must not do is JOIN them:
 * `../../data/connectors.ts` records that connectors are
 * deployment-level and subscriptions are domain-level, and the tools
 * surface is the one place those two scopes are legible side by side —
 * the cards stay put across a domain switch while the list beneath
 * them changes. A reading that mixed the two would quietly destroy
 * that. So nothing below takes a connector AND a domain's
 * subscriptions in the same argument list.
 *
 * ## Colour means state, so a kind is nearly always neutral
 *
 * `../sources/rows.ts` sets the rule this surface inherits: a page
 * that draws health in colour cannot also draw a category in colour,
 * or the two hues argue. {@link CONNECTOR_KIND_TONES} therefore gives
 * three of the four kinds the neutral tone and tints only
 * `export_target` — the one kind that is a DESTINATION rather than a
 * service the pipeline calls for information, and the one the export
 * list underneath actually references. The tint is what ties the two
 * halves of the page together without a line being drawn between
 * them.
 *
 * ## The card shows the config as it is stored
 *
 * {@link configEntries} renders `connectors.config` key by key rather
 * than picking out an address per kind. Three reasons, in order of
 * weight:
 *
 * - The payload is open. `Connector.config` is a record of unknowns
 *   because a client takes whatever that kind of client takes, so a
 *   per-kind address key would be a fifth place to keep in step with
 *   the service's clients and would render nothing at all for a key
 *   nobody predicted.
 * - The redaction is worth SEEING. `../../data/connectors.ts` puts a
 *   single placeholder wherever the service would hold a credential,
 *   and a card that showed only an address would never display it —
 *   which is exactly the check an operator makes when a call starts
 *   returning 401.
 * - There is nothing to summarise. The seeded configs run to three
 *   entries; a summary of three lines is three lines.
 *
 * Values are stringified rather than typed, and long ones are clipped
 * by the card with the whole value kept in a `title`. That is the
 * treatment `../sources/rows.ts` gives an endpoint and for the same
 * reason: a stored token has to stay reachable exactly, and no
 * paraphrase of one is useful.
 *
 * ## What a connector card deliberately does not say
 *
 * LAST USED. The UI spec names it on this card, and schema v2 stores
 * nothing that could answer it: `connectors` is four columns and none
 * is a timestamp, and `llm_calls` — the one table recording calls
 * going out — carries no connector reference to aggregate over.
 * `../../data/connectors.ts` says the same on the fixture side.
 *
 * The tempting stand-in is the subscription join: what a destination
 * receives, and when it is next due. It is the wrong one HERE, for
 * the scoping reason above — a figure read off one domain's
 * subscriptions would move on a domain switch, and the card would
 * stop being deployment-level in the one place that fact is visible.
 * So the reading lives on the export rows below and nowhere on a
 * card, and last-used arrives when a table stores it.
 *
 * ## The deliveries are rows, not a toggle per format
 *
 * The UI spec describes the export list as a toggle list of FORMATS.
 * The stored shape refuses that: `export_subscriptions` is keyed on
 * the triple (domain, format, connector), and the fixtures carry two
 * `rss` rows to two different destinations precisely because neither
 * pair inside that triple is the key on its own. One toggle per
 * format would render those two as one row and lose a destination.
 *
 * So a row is a SUBSCRIPTION, and the formats a domain has subscribed
 * to nothing under are named once underneath by
 * {@link unsubscribedFormats} — which is the reading the spec's OFF
 * state was after, without pretending a row exists to carry it.
 */

import type {
  ConnectorStatus,
  ExportSubscriptionSummary,
} from '../../data/connectors';
import type { ConnectorKind, ExportFormat } from '../../data/types';
import type { BadgeProps, IconName, StatusIndicatorProps } from '@ar/ui';

/** What a card says where a connector's config is empty. */
export const NOTHING_CONFIGURED_LABEL = 'Nothing configured';

/** What a delivery row says where nothing has scheduled it. */
export const NEVER_SCHEDULED_LABEL = 'Not scheduled';

/** What {@link cadenceLabel} answers for an interval that says nothing. */
export const NO_CADENCE_LABEL = 'No cadence';

/** How a config value reads where the payload stores an explicit null. */
const NULL_VALUE_LABEL = 'null';

/** How one family of service is named and drawn on a card. */
export interface ConnectorKindFacet {
  /** Which kind this reads. */
  readonly kind: ConnectorKind;
  /** What the card's badge calls it. */
  readonly label: string;
  /**
   * The tone that badge is drawn in.
   *
   * `BadgeProps['tone']` rather than a local union, so the value
   * resolves to what `@ar/ui` actually accepts instead of to a copy
   * of it that is free to drift.
   */
  readonly tone: BadgeProps['tone'];
}

/**
 * What each kind reads as, keyed by the kind itself.
 *
 * Total over `ConnectorKind` — that is the whole reason it is a
 * record rather than a list — and the entries omit the key, so the
 * derived list below is the only place a kind and its facet are
 * joined. An entry written out in full could be filed under one key
 * and claim another, and the card would draw the wrong badge with
 * everything type-checking.
 *
 * The labels are prose rather than the stored tokens, unlike the
 * source kinds next door. A source's kind is a word an operator types
 * into a config (`rss`, `push`); a connector's is a discriminator the
 * service uses to pick a client, and `export_target` is not a phrase
 * anybody says out loud.
 */
const CONNECTOR_KIND_BODIES: Readonly<
  Record<ConnectorKind, Omit<ConnectorKindFacet, 'kind'>>
> = {
  // 'Model' rather than 'LLM': the card names what the service is,
  // and the acronym is already in the badge next to a model id.
  llm: { label: 'Model', tone: 'neutral' },
  search: { label: 'Search', tone: 'neutral' },
  notebook: { label: 'Notebook', tone: 'neutral' },
  // The one tinted kind — see the header on why exactly one is.
  export_target: { label: 'Export target', tone: 'info' },
};

/**
 * The order the grid's kinds are described in.
 *
 * Private, and the only reason it exists is that a record has no
 * order. It is not the order the CARDS run in — those keep the
 * fixture's configuration order — but the order this surface would
 * introduce the four kinds in: what the pipeline thinks with, what it
 * looks with, what it reads and writes, and where its output goes.
 */
const KIND_ORDER: readonly ConnectorKind[] = [
  'llm',
  'search',
  'notebook',
  'export_target',
];

/**
 * The four kinds, as this surface names and draws them.
 *
 * Exported for the colocated test and for any later control that
 * offers the kinds as a list; a card looks a single kind up through
 * {@link kindFacet}.
 */
export const CONNECTOR_KIND_FACETS: readonly ConnectorKindFacet[] = KIND_ORDER
  .map((kind) => ({ kind, ...CONNECTOR_KIND_BODIES[kind] }));

const FACETS_BY_KIND = new Map<ConnectorKind, ConnectorKindFacet>(
  CONNECTOR_KIND_FACETS.map((facet) => [facet.kind, facet]),
);

/**
 * How one kind is named and drawn.
 *
 * Throws rather than tolerating a miss, unlike the `find*` accessors
 * in `../../data/`: the argument is a column value from a closed
 * union, so the only way to reach a miss is a kind left out of the
 * private order list above — a wiring bug in this file rather than an
 * outcome a card should render around.
 *
 * @param kind - The connector's kind.
 * @returns Its facet — the same object every caller gets.
 * @throws If this surface lists no facet for that kind.
 */
export function kindFacet(kind: ConnectorKind): ConnectorKindFacet {
  const facet = FACETS_BY_KIND.get(kind);

  if (facet === undefined) {
    throw new Error(`Unknown connector kind: ${kind}`);
  }

  return facet;
}

/** How one connector state is named and drawn on a card. */
export interface ConnectorStatusFacet {
  /** Which state this reads. */
  readonly status: ConnectorStatus;
  /** What the card says beside the dot. */
  readonly label: string;
  /**
   * The tone the dot is drawn in.
   *
   * `StatusIndicatorProps['tone']` rather than a local union, for the
   * reason {@link ConnectorKindFacet.tone} gives.
   */
  readonly tone: StatusIndicatorProps['tone'];
}

/**
 * What each state reads as, keyed by the state itself.
 *
 * Total over `ConnectorStatus`, and the entries omit the key for the
 * reason {@link CONNECTOR_KIND_BODIES} does.
 */
const CONNECTOR_STATUS_BODIES: Readonly<
  Record<ConnectorStatus, Omit<ConnectorStatusFacet, 'status'>>
> = {
  ready: { label: 'Ready', tone: 'ok' },
  // A warning rather than an error, and the distinction is the whole
  // of what `classifyConnector` can honestly say: nothing has been
  // ATTEMPTED against a connector, so no row here has failed. What a
  // row with an empty config has is somewhere for an operator to
  // finish, which is a warning.
  unconfigured: { label: 'Not configured', tone: 'warn' },
};

/**
 * The order this surface introduces the two states in.
 *
 * Private, for the reason {@link KIND_ORDER} is. The working state
 * first, so a list of the two reads as a scale rather than as an
 * alphabet.
 */
const STATUS_ORDER: readonly ConnectorStatus[] = ['ready', 'unconfigured'];

/** The two states, as this surface names and draws them. */
export const CONNECTOR_STATUS_FACETS: readonly ConnectorStatusFacet[]
  = STATUS_ORDER.map((status) => ({
    status,
    ...CONNECTOR_STATUS_BODIES[status],
  }));

const FACETS_BY_STATUS = new Map<ConnectorStatus, ConnectorStatusFacet>(
  CONNECTOR_STATUS_FACETS.map((facet) => [facet.status, facet]),
);

/**
 * How one connector state is named and drawn.
 *
 * Throws on a miss, for the reason {@link kindFacet} does: the
 * argument comes from `classifyConnector`, which is total over the
 * union.
 *
 * @param status - As `classifyConnector` reports it.
 * @returns Its facet — the same object every caller gets.
 * @throws If this surface lists no facet for that state.
 */
export function connectorStatusFacet(
  status: ConnectorStatus,
): ConnectorStatusFacet {
  const facet = FACETS_BY_STATUS.get(status);

  if (facet === undefined) {
    throw new Error(`Unknown connector status: ${status}`);
  }

  return facet;
}

/** One line of a card's rendering of `connectors.config`. */
export interface ConfigEntry {
  /** The key, exactly as the payload stores it. */
  readonly key: string;
  /** What is stored under it, as a card can draw it. */
  readonly value: string;
}

/**
 * One config value, as a string a card can draw.
 *
 * Total over what a `jsonb` payload can hold, and deliberately never
 * a paraphrase: a stored token is checked character by character or
 * it is not checked at all, so nothing here shortens, rounds or
 * pretty-prints. What it does do is give the absences a word — an
 * explicit `null` is a value somebody wrote, and an empty cell would
 * read as a rendering fault rather than as the payload's own answer.
 *
 * Objects and arrays fall through to JSON, which is what the column
 * holds anyway. `JSON.stringify` answers `undefined` for a function
 * or an undefined, neither of which survives a round trip through
 * `jsonb`; the fallback is there so this function stays total rather
 * than because a row could reach it.
 *
 * @param value - One `connectors.config` value.
 * @returns Its rendering.
 */
export function configValueLabel(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (value === null) {
    return NULL_VALUE_LABEL;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value) ?? String(value);
}

/**
 * A connector's stored configuration, as the lines a card draws.
 *
 * Declaration order is kept: the payload's key order is the order an
 * operator wrote it in, and re-sorting it would move an address away
 * from the credential that belongs with it.
 *
 * An empty config answers `[]` rather than a placeholder row — the
 * card has its own sentence for that state, and `[]` is what lets the
 * card choose it.
 *
 * @param config - The connector's `config` payload.
 * @returns One entry per stored key, in the payload's own order.
 */
export function configEntries(
  config: Readonly<Record<string, unknown>>,
): readonly ConfigEntry[] {
  return Object.entries(config).map(([key, value]) => ({
    key,
    value: configValueLabel(value),
  }));
}

/**
 * How the head's chip reads the size of the deployment's toolkit.
 *
 * One string, like the count labels on the lexicon and agents
 * surfaces, because a chip is one line of type at one size. It states
 * a count rather than a subset: nothing on this surface filters.
 *
 * @param count - How many connectors this deployment has configured.
 * @returns The chip's text.
 */
export function connectorCountLabel(count: number): string {
  const noun = count === 1
    ? 'connector'
    : 'connectors';

  return `${count} ${noun}`;
}

/** How one export format is named and decorated on a delivery row. */
export interface ExportFormatFacet {
  /** Which format this reads. */
  readonly format: ExportFormat;
  /** What the row calls it, in words rather than in the stored token. */
  readonly label: string;
  /** The glyph the row leads with. */
  readonly icon: IconName;
}

/**
 * What each format reads as, keyed by the format itself.
 *
 * Total over `ExportFormat`, and the entries omit the key for the
 * reason {@link CONNECTOR_KIND_BODIES} does.
 *
 * The two Markdown formats take different glyphs on purpose. They
 * render the same artifact into two different tools, and a row that
 * drew them identically would leave the destination as the only thing
 * telling them apart — which is exactly the reading an operator
 * scanning this list is not doing.
 */
const EXPORT_FORMAT_BODIES: Readonly<
  Record<ExportFormat, Omit<ExportFormatFacet, 'format'>>
> = {
  obsidian_md: { label: 'Obsidian Markdown', icon: 'file-text' },
  notion_md: { label: 'Notion Markdown', icon: 'notebook' },
  rss: { label: 'RSS feed', icon: 'rss' },
  pdf: { label: 'PDF', icon: 'file-type-2' },
  // 'Draft' is load-bearing rather than decorative: no format SENDS
  // anything, and this is the one whose name would otherwise suggest
  // it does.
  email_draft: { label: 'Email draft', icon: 'mail' },
};

/**
 * The order this surface lists the formats in.
 *
 * The schema's own order, which runs from the artifacts a person
 * reads in a tool, through the ones a machine subscribes to, to the
 * one that ends up in front of somebody else. Exported because the
 * unsubscribed line below is a list rather than a lookup.
 */
export const EXPORT_FORMATS: readonly ExportFormat[] = [
  'obsidian_md',
  'notion_md',
  'rss',
  'pdf',
  'email_draft',
];

const FACETS_BY_FORMAT = new Map<ExportFormat, ExportFormatFacet>(
  EXPORT_FORMATS.map((format) => [
    format,
    { format, ...EXPORT_FORMAT_BODIES[format] },
  ]),
);

/**
 * How one format is named and decorated.
 *
 * Throws on a miss, for the reason {@link kindFacet} does.
 *
 * @param format - The subscription's format.
 * @returns Its facet — the same object every caller gets.
 * @throws If this surface lists no facet for that format.
 */
export function formatFacet(format: ExportFormat): ExportFormatFacet {
  const facet = FACETS_BY_FORMAT.get(format);

  if (facet === undefined) {
    throw new Error(`Unknown export format: ${format}`);
  }

  return facet;
}

/** Seconds in the units a cadence is spoken in. */
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = 86400;
const SECONDS_PER_WEEK = 604800;

/**
 * A count and its unit, pluralised.
 *
 * @param count - How many of the unit.
 * @param noun - The unit, singular. Pluralised by suffix, which every
 * unit a duration is measured in tolerates.
 * @returns The phrase.
 */
function countedUnit(count: number, noun: string): string {
  return count === 1
    ? `${count} ${noun}`
    : `${count} ${noun}s`;
}

/**
 * The gap a cadence names, in the largest unit that divides it
 * exactly.
 *
 * Exactness rather than approximation is the rule: an interval of
 * 90 minutes reads as `90 minutes` and never as `about 2 hours`,
 * because the number is a stored setting somebody chose and a row
 * that rounded it could not be checked against the field that set it.
 *
 * @param seconds - A positive interval.
 * @returns The gap, without a leading verb.
 */
function everyLabel(seconds: number): string {
  if (seconds % SECONDS_PER_DAY === 0) {
    return countedUnit(seconds / SECONDS_PER_DAY, 'day');
  }

  if (seconds % SECONDS_PER_HOUR === 0) {
    return countedUnit(seconds / SECONDS_PER_HOUR, 'hour');
  }

  if (seconds % SECONDS_PER_MINUTE === 0) {
    return countedUnit(seconds / SECONDS_PER_MINUTE, 'minute');
  }

  return countedUnit(seconds, 'second');
}

/**
 * How a delivery row reads its cadence.
 *
 * The three gaps a person has a word for get that word — hourly,
 * daily, weekly — and everything else is spelled out. The words are
 * worth the three lines they cost: a list where most rows read
 * `Every 1 day` is a list nobody scans.
 *
 * A non-positive or non-finite interval answers {@link NO_CADENCE_LABEL}
 * rather than a phrase. No schedulable column can produce one, which
 * is precisely why a row carrying it should look wrong instead of
 * reading as a very frequent delivery.
 *
 * @param intervalSeconds - `export_subscriptions.interval_seconds`.
 * @returns The cadence, as the row says it.
 */
export function cadenceLabel(intervalSeconds: number): string {
  if (!Number.isFinite(intervalSeconds) || intervalSeconds <= 0) {
    return NO_CADENCE_LABEL;
  }

  if (intervalSeconds === SECONDS_PER_HOUR) {
    return 'Hourly';
  }

  if (intervalSeconds === SECONDS_PER_DAY) {
    return 'Daily';
  }

  if (intervalSeconds === SECONDS_PER_WEEK) {
    return 'Weekly';
  }

  return `Every ${everyLabel(intervalSeconds)}`;
}

/**
 * The formats this domain has subscribed to nothing under, in surface
 * order.
 *
 * Counts a DISABLED subscription as subscribed, which is the whole
 * distinction the schema keeps: disabling is not cancelling — the row
 * survives with its cadence and its destination — so a format switched
 * off is one this domain has configured and paused, not one it has
 * never asked for. Folding the two together would make the sentence
 * under the list report a deletion that never happened.
 *
 * A domain that has subscribed to nothing answers every format, which
 * is arithmetically right and is a sentence the page chooses not to
 * print: it has an empty state that says the same thing better.
 *
 * @param summaries - This domain's deliveries, as
 * `summarizeExportSubscriptions` reports them.
 * @returns The formats no row names, in {@link EXPORT_FORMATS} order.
 */
export function unsubscribedFormats(
  summaries: readonly ExportSubscriptionSummary[],
): readonly ExportFormat[] {
  const subscribed = new Set<ExportFormat>(
    summaries.map((summary) => summary.subscription.format),
  );

  return EXPORT_FORMATS.filter((format) => !subscribed.has(format));
}

/**
 * The sentence under the delivery list naming what this domain does
 * not receive.
 *
 * A sentence rather than a row apiece, because these are absences:
 * five greyed rows would take the same space as the deliveries that
 * exist and would read as five things that had been switched off.
 *
 * @param formats - As {@link unsubscribedFormats} reports them.
 * @returns The sentence, or `null` where every format is subscribed
 * and there is nothing to say.
 */
export function unsubscribedLabel(
  formats: readonly ExportFormat[],
): string | null {
  if (formats.length === 0) {
    return null;
  }

  const names = formats.map((format) => formatFacet(format).label);

  return `Not subscribed: ${names.join(', ')}.`;
}

/**
 * How many deliveries are running, out of how many are configured.
 *
 * The reading `DecoratedToggleList` draws in its own header — this
 * surface renders the rows without that wrapper, since the section
 * around them already carries a heading, so the figure moves to the
 * section's action slot and is derived here instead.
 *
 * @param summaries - This domain's deliveries.
 * @returns The chip's text.
 */
export function exportCountLabel(
  summaries: readonly ExportSubscriptionSummary[],
): string {
  const active = summaries
    .filter((summary) => summary.subscription.enabled)
    .length;

  return `${active} of ${summaries.length} active`;
}
