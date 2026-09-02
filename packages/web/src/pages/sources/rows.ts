/**
 * @packageDocumentation
 * The sources surface's readings: how a feed is named in a cell, how
 * its health is put into words, and which of the four statuses the
 * stat band above the table counts.
 *
 * Pure, and beside the page rather than inside it, for the reason
 * `../digest/rows.ts` gives: the unit suite is node-only and collects
 * `.ts` alone, so every rule worth stating lives here and the
 * component is left with one cell per column.
 *
 * ## No row model
 *
 * The digest builds one, because a digest row is a join of four
 * reads. This surface reads `useSources` and nothing else, so the
 * table renders `Source` rows as they arrive and every derivation
 * below is a function OF one. Inventing a flattened row here would
 * restate the fixture type with nothing added to it.
 *
 * `SourceStatus` is the one thing a row does not carry, and it lives
 * in `../../data/sources.ts` rather than here — the counts behind the
 * stat cards are derived from the same classifier, and a page-local
 * second reading of the four stored columns is exactly what that
 * module exists to prevent.
 *
 * ## One facet table for the four statuses
 *
 * {@link SOURCE_STATUS_FACETS} is the whole of what this surface
 * knows about a status — what to call it, and what tone to draw it in
 * — and it is derived from a record keyed by `SourceStatus`. A status
 * added to the union is then a key the compiler demands rather than a
 * row that quietly renders an undefined label. The entries carry no
 * status of their own: the key is attached while the ordered list is
 * built, so an entry cannot end up contradicting the key it is filed
 * under.
 *
 * The tone type is `CellStatusTone`, which is also
 * `StatusIndicator`'s, so the dot in the table cell and the dot on
 * the stat card above it cannot drift apart.
 *
 * ## The band counts three of the four
 *
 * {@link SOURCE_STAT_CARDS} names `active`, `failing` and `pending`
 * — the three the UI spec asks for. `disabled` is deliberately not a
 * card: a source an operator switched off is not a health reading,
 * and a fourth tile counting it would put a number an operator chose
 * beside three the pipeline produced. It is still visible, in the
 * table's own status column, which is where a decision belongs.
 *
 * The captions are not decoration. Two of the three cards are labelled
 * with a word the figure under them does not quite mean — see
 * `summarizeSources` in `../../data/sources.ts` — and the caption is
 * where that gap is stated rather than left for somebody to discover.
 *
 * ## A pulsing dot is a stand-in for a run
 *
 * {@link isRunLive} decides which rows draw their status dot with
 * `pulse`, and it is not a reading of a run. A `Source` mirrors the
 * `sources` table, which records the OUTCOME of the last fetch and
 * nothing about one in progress, and no fixture module beside it
 * carries a run either — so nothing under `../../data/` can say a
 * pass is in flight. What this reads instead is RECENCY: an enabled
 * feed whose last touch, either way, falls inside
 * {@link LIVE_RUN_WINDOW_MS}. {@link LIVE_RUN_LABEL} is worded to say
 * that much rather than to claim more than the row can support.
 *
 * The window is this surface's own policy and it is deliberately
 * generous. A cutoff tight enough to mean `right now` would need a
 * run row to be true of anything at all, and would draw every row
 * still while claiming to report something the data cannot answer
 * either way. Half a day is wide enough that the shipped fixtures
 * fall on BOTH sides of it, which is a property `./rows.test.ts`
 * pins rather than a coincidence: a reading with no subject is not a
 * reading, and neither is one every row satisfies.
 *
 * A real runs read replaces the whole function rather than the
 * number inside it.
 *
 * ## The cursor's age is dated by the last SUCCESS
 *
 * {@link cursorAgeStamp} answers which stamp the cursor cell dates a
 * position by, and it is the success rather than the last touch: a
 * failed fetch moves no cursor, so dating the position by a failure
 * would age a position that has not moved.
 *
 * The narrowing that costs something: a feed that has been fetched
 * and has never succeeded reads the same as one nothing has ever
 * reached, both of them {@link NEVER_FETCHED_LABEL}. The two ARE
 * different states — `../../data/sources.ts` carries one of each and
 * says so — and the health cell beside this one is where they
 * separate, which is why the cursor column does not try to.
 *
 * ## What the search box reads
 *
 * {@link SOURCE_QUERY_FIELDS} lists the columns an operator can see,
 * and the cursor is the one visible value deliberately left out: the
 * token is the adapter's own bookkeeping, so a query matching
 * `page=4` would return a row for a reason about the adapter rather
 * than about the feed.
 */

import type { SourceStatus } from '../../data/sources';
import type { IsoTimestamp, Source, SourceKind } from '../../data/types';
import type { QueryField } from '../filters';
import type { CellStatusTone, SelectOption, TagProps } from '@ar/ui';

import { classifySource } from '../../data/sources';
import { withAllOption } from '../filters';

/** What the health cell reads for a source with a clean counter. */
const NO_FAILURES_LABEL = 'No failures';

/** What the cursor cell reads where no position has been kept. */
export const NO_CURSOR_LABEL = 'No cursor';

/** What the cursor cell leads with for a feed with no position yet. */
export const NEVER_FETCHED_LABEL = 'Never fetched';

/**
 * What a pulsing dot is called, for a reader who cannot see it move.
 *
 * Deliberately not a claim about a run in flight — see the header on
 * what {@link isRunLive} can and cannot know — and deliberately not a
 * second spelling of the status, which the visible text beside the
 * dot already carries.
 */
export const LIVE_RUN_LABEL = 'Recently read';

/** How one status is named and drawn on this surface. */
export interface SourceStatusFacet {
  /** Which status this reads. */
  readonly status: SourceStatus;
  /** What the status cell and the filter badge call it. */
  readonly label: string;
  /**
   * The tone its dot is drawn in.
   *
   * `CellStatusTone` rather than a local union, so the cell in the
   * table and the decoration on the stat card resolve to the same
   * five values `@ar/ui` actually accepts.
   */
  readonly tone: CellStatusTone;
}

/**
 * What each status reads as, keyed by the status itself.
 *
 * Total over `SourceStatus` — that is the whole reason it is a record
 * rather than a list — and the entries omit the key, so the derived
 * list below is the only place a status and its facet are joined.
 */
const STATUS_FACET_BODIES: Readonly<
  Record<SourceStatus, Omit<SourceStatusFacet, 'status'>>
> = {
  active: { label: 'Active', tone: 'ok' },
  // The strongest tone this surface has: a feed the pipeline is
  // reading and cannot use is the one state an operator has to act on.
  failing: { label: 'Failing', tone: 'err' },
  // Informational rather than a warning. A source nothing has fetched
  // yet is not broken, and drawing it as a fault would make every
  // freshly configured feed look like an incident.
  pending: { label: 'Pending', tone: 'info' },
  // The library's own muted tone: the row reports a decision rather
  // than a reading, and it should recede beside the three that do not.
  disabled: { label: 'Disabled', tone: 'disabled' },
};

/**
 * The order this surface lists the four statuses in.
 *
 * Private, and the only reason it exists is that a record has no
 * order. It runs the way the stat band reads — what is working, what
 * is broken, what has not started — with the operator decision last,
 * because it is the one member the band does not show.
 */
const STATUS_ORDER: readonly SourceStatus[] = [
  'active',
  'failing',
  'pending',
  'disabled',
];

/**
 * The four readings, in surface order.
 *
 * What the status filter maps over — `./badges.ts` builds one
 * pressable badge per entry, which is why this module offers no
 * option builder for that control the way {@link kindOptions} does
 * for the kind one — and what the status cell and the stat cards
 * look a single status up in through {@link statusFacet}.
 */
export const SOURCE_STATUS_FACETS: readonly SourceStatusFacet[] = STATUS_ORDER
  .map((status) => ({ status, ...STATUS_FACET_BODIES[status] }));

const FACETS_BY_STATUS = new Map<SourceStatus, SourceStatusFacet>(
  SOURCE_STATUS_FACETS.map((facet) => [facet.status, facet]),
);

/**
 * How one status is named and drawn.
 *
 * Throws rather than tolerating a miss, unlike the `find*` accessors
 * in `../../data/`: the argument comes from `classifySource`, which is
 * total over the union, so the only way to reach a miss is a status
 * left out of the private order list above — a wiring bug in this
 * file, not an outcome a page should render around.
 *
 * @param status - As `classifySource` reports it.
 * @returns Its facet — the same object every caller gets.
 * @throws If this surface lists no facet for that status.
 */
export function statusFacet(status: SourceStatus): SourceStatusFacet {
  const facet = FACETS_BY_STATUS.get(status);

  if (facet === undefined) {
    throw new Error(`Unknown source status: ${status}`);
  }

  return facet;
}

/** Milliseconds in an hour — the unit the window below is written in. */
const HOUR_MS = 60 * 60 * 1000;

/**
 * How long after a touch a feed is still drawn as being read.
 *
 * Half a day, which is far wider than the word `live` suggests and is
 * the header's point: this measures recency because recency is what a
 * `sources` row can answer, and a tighter number would draw every row
 * still while saying something the data cannot support either way.
 */
const LIVE_RUN_WINDOW_MS = 12 * HOUR_MS;

/**
 * When the pipeline last touched this feed, whichever way it went.
 *
 * Private: what a caller wants is the reading below, and the pair of
 * stamps is already on the row for anything else.
 *
 * The comparison is on the parsed instants rather than on the
 * strings. `IsoTimestamp` is a `string` carrying an explicit offset —
 * `../../data/types.ts` says so — and a `+02:00` spelling sorts
 * lexically by its digits rather than by the moment it names. That is
 * a distinction every fixture here happens to hide, and the first row
 * arriving from a service is where it would stop hiding.
 *
 * @param source - The row to read.
 * @returns The later of its two stamps, or null if it carries
 * neither.
 */
function lastTouchedAt(source: Source): IsoTimestamp | null {
  const { lastSuccessAt, lastFailureAt } = source;

  if (lastSuccessAt === null) {
    return lastFailureAt;
  }

  if (lastFailureAt === null) {
    return lastSuccessAt;
  }

  return Date.parse(lastFailureAt) > Date.parse(lastSuccessAt)
    ? lastFailureAt
    : lastSuccessAt;
}

/**
 * Whether this surface draws the row's status dot as running.
 *
 * Three refusals before the measurement, and each is a state rather
 * than an edge case. A disabled feed is never running, whatever its
 * counters remember — nothing is reading it. A feed with neither
 * stamp has never been touched, so there is no age to take. And a
 * touch older than {@link LIVE_RUN_WINDOW_MS} is a pass that has
 * finished, which is the ordinary answer for most rows most of the
 * time.
 *
 * A stamp AHEAD of the reference clock reads as running, for the
 * reason `../digest/timeWindow.ts` gives about the same signed
 * comparison: a negative age is the freshest there is, and a row that
 * stopped pulsing because a service clock ran a second fast would be
 * a rendering fault rather than a reading. A stamp that will not
 * parse compares false and draws the row still, which is the
 * conservative half of the same expression.
 *
 * Takes `now` rather than reading the wall clock, so the rendered
 * page is a property of the data and not of the day it is looked at
 * — and so this module stays reachable from the node-environment
 * unit suite.
 *
 * @param source - The row to read.
 * @param now - The reference clock, ISO. The page passes
 * `FIXTURE_NOW`, the same instant every relative time on it renders
 * against.
 * @returns Whether the dot pulses.
 */
export function isRunLive(source: Source, now: IsoTimestamp): boolean {
  if (!source.enabled) {
    return false;
  }

  const touched = lastTouchedAt(source);

  if (touched === null) {
    return false;
  }

  return Date.parse(now) - Date.parse(touched) < LIVE_RUN_WINDOW_MS;
}

/**
 * The tone each kind of feed is tagged in.
 *
 * Total over `SourceKind`, so a kind added upstream is a key the
 * compiler demands rather than a tag drawn in whatever `Tag` defaults
 * to.
 *
 * Only one kind carries a tone of its own, and the restraint is the
 * point: colour on this surface means health, and four coloured kind
 * tags beside a status column would be four hues saying nothing. What
 * `push` says is a real distinction — it is the one kind nothing
 * polls, so its counters move when somebody else acts rather than
 * when this deployment does.
 */
const KIND_TONES: Readonly<Record<SourceKind, TagProps['tone']>> = {
  api: 'neutral',
  rss: 'neutral',
  url: 'neutral',
  push: 'info',
};

/**
 * The order the kind filter lists the kinds in.
 *
 * The three polled kinds first, alphabetically because nothing
 * distinguishes them, and the pushed one last for the reason
 * {@link KIND_TONES} gives.
 */
export const SOURCE_KINDS: readonly SourceKind[] = [
  'api',
  'rss',
  'url',
  'push',
];

/**
 * The tone a kind tag is drawn in.
 *
 * @param kind - The source's kind.
 * @returns The tone for `Tag`.
 */
export function kindTone(kind: SourceKind): TagProps['tone'] {
  return KIND_TONES[kind];
}

/** The two lines the source cell draws an endpoint as. */
export interface EndpointParts {
  /** What to lead with — the host, or the endpoint itself. */
  readonly host: string;
  /** What follows it, or null where the endpoint says nothing more. */
  readonly path: string | null;
}

/**
 * An endpoint split into the two lines a cell draws it as.
 *
 * A source has no name column — `../../data/types.ts` says so on the
 * type — so the endpoint IS the identity of a feed and the whole of
 * it has to stay reachable. Splitting it puts the part that
 * distinguishes two feeds of the same host on its own line rather
 * than off the end of a truncated one.
 *
 * An endpoint that will not parse is handed back whole as the host,
 * because `URL` throws on anything that is not absolute and an
 * endpoint is operator-entered. That row then reads as one line,
 * which is the honest picture of a value nothing can take apart.
 *
 * A root path is dropped rather than drawn as `/`: it says nothing
 * the host has not already said, and a lone slash under a hostname
 * reads as a rendering fault.
 *
 * @param endpoint - As the source records it.
 * @returns Its host and whatever follows.
 */
export function splitEndpoint(endpoint: string): EndpointParts {
  let url: URL;

  try {
    url = new URL(endpoint);
  } catch {
    return { host: endpoint, path: null };
  }

  const path = `${url.pathname}${url.search}`;

  return {
    host: url.host,
    path: path === '/'
      ? null
      : path,
  };
}

/**
 * How the health cell reads a failure counter.
 *
 * The counter is a STREAK — `../../data/types.ts` records that a
 * success resets it — so this line alone cannot say whether a feed
 * has ever failed. The cell pairs it with the last-failure stamp for
 * exactly that reason: `No failures` over `Never failed` is a source
 * that has always worked, and `No failures` over a real date is one
 * that recovered.
 *
 * A negative count is rendered as it is rather than folded into the
 * clean reading. No counter can produce one, which is why a row
 * carrying it should look wrong instead of looking healthy.
 *
 * @param streak - `sources.consecutive_failures`.
 * @returns The line the cell leads with.
 */
export function failureStreakLabel(streak: number): string {
  if (streak === 0) {
    return NO_FAILURES_LABEL;
  }

  return streak === 1
    ? '1 failure'
    : `${streak} failures`;
}

/**
 * When the position the cursor cell shows was written.
 *
 * The cursor column leads with an AGE and follows it with the token,
 * because the age is what an operator scans a list for and the token
 * is what they read once they have stopped on a row. Which stamp that
 * age is taken from is the decision, and the header says why it is
 * the success.
 *
 * Answers the stamp rather than the words, so the rule lives here and
 * the cell is left choosing between a string and a rendered element —
 * the only half of this a `.tsx` can hold.
 *
 * @param source - The row to read.
 * @returns The stamp its position was last written at, or null where
 * nothing has ever been written.
 */
export function cursorAgeStamp(source: Source): IsoTimestamp | null {
  return source.lastSuccessAt;
}

/**
 * How the cursor cell reads a stored position.
 *
 * A cursor is opaque — what it means is the adapter's business — so
 * this neither parses nor shortens it. What it does answer is the
 * absence: a null cursor and a blank one are the same state to a
 * reader, and a cell rendering an empty string would look like a
 * column that failed rather than a source with no position kept.
 *
 * @param cursor - `sources.cursor`.
 * @returns The token, or the words for having none.
 */
export function cursorLabel(cursor: string | null): string {
  if (cursor === null || cursor.trim() === '') {
    return NO_CURSOR_LABEL;
  }

  return cursor;
}

/**
 * How the head chip reads the size of what is on screen.
 *
 * Says `of` only while something is narrowing the list, so an
 * untouched page states a count rather than the tautology `7 of 7` —
 * and a filtered one always says what it is a subset OF, which is the
 * reading that tells an operator the rows they cannot see exist.
 *
 * @param visible - How many rows the filters left.
 * @param total - How many the domain has.
 * @returns The chip text.
 */
export function sourceCountLabel(visible: number, total: number): string {
  const noun = total === 1
    ? 'source'
    : 'sources';

  return visible === total
    ? `${total} ${noun}`
    : `${visible} of ${total} ${noun}`;
}

/**
 * The fields this surface compares a typed query against.
 *
 * One reader per thing an operator can see, which is what
 * `filterByQuery` wants: a two-word query matching a row whose
 * endpoint supplied one word and whose status supplied the other is a
 * hit nobody can see the reason for.
 *
 * The flag is searchable even though it is drawn as a tag rather than
 * as text — `flagged` is the word the surface uses for it, in the tag
 * and in this list, and an operator looking for the flagged feeds
 * should not have to know it is not a status.
 *
 * The cursor is the one visible value left out; the header says why.
 */
export const SOURCE_QUERY_FIELDS: readonly QueryField<Source>[] = [
  (source) => source.endpoint,
  (source) => source.kind,
  (source) => statusFacet(classifySource(source)).label,
  (source) => (source.flagged
    ? 'flagged'
    : null),
];

/**
 * The kind filter's options, led by the one that filters nothing.
 *
 * The labels are the stored tokens rather than prose, because that is
 * what the kind column shows: a control offering `Really Simple
 * Syndication` beside a tag reading `rss` would be two names for one
 * thing.
 *
 * A function rather than a constant so each call owns its array —
 * `SelectProps.options` is declared mutable, and a shared one would
 * be a single component away from being edited in place.
 *
 * @returns Options ready for `Select`.
 */
export function kindOptions(): SelectOption[] {
  return withAllOption(
    'All kinds',
    SOURCE_KINDS.map((kind) => ({ value: kind, label: kind })),
  );
}

/** One tile of the stat band above the table. */
export interface SourceStatCard {
  /** Which count it shows. */
  readonly status: SourceStatus;
  /** What the tile is called. */
  readonly title: string;
  /** The line under the figure, saying what it counts. */
  readonly caption: string;
}

/**
 * The three tiles the band draws, in the order the UI spec names them.
 *
 * Not derived from {@link SOURCE_STATUS_FACETS}: the band shows three
 * of the four statuses on purpose, and each tile is titled for what an
 * operator is looking for rather than for the status behind it — see
 * the header on both decisions.
 */
export const SOURCE_STAT_CARDS: readonly SourceStatCard[] = [
  {
    status: 'active',
    title: 'Active sources',
    caption: 'Read with nothing outstanding',
  },
  {
    status: 'failing',
    title: 'Parse failures',
    // The label says documents and the figure counts feeds. Stated
    // here rather than left to be discovered against the table.
    caption: 'Feeds failing or flagged, not failed documents',
  },
  {
    status: 'pending',
    title: 'Pending configs',
    // A stand-in: this counts sources nothing has fetched rather
    // than the pending `source_config_proposals` rows
    // `../../data/proposals.ts` carries, which this page does not
    // read yet.
    caption: 'Configured, never fetched',
  },
];
