import type { SourceConfigProposal } from '../../src/data/proposals';
import type {
  SourceStatus,
  SourceStatusCounts,
} from '../../src/data/sources';
import type { Document, Source } from '../../src/data/types';
import type { Locator, Page } from '@playwright/test';

import { expect, test } from '@playwright/test';

import {
  fetchSourceFailures,
  fetchSourceProposals,
  fetchSourceStatusCounts,
  fetchSources,
} from '../../src/data/api';
import { DEFAULT_DOMAIN_SLUG, findDomain } from '../../src/data/domains';
import {
  classifySource,
  countSourceStatuses,
} from '../../src/data/sources';
import { FIXTURE_NOW } from '../../src/data/types';
import { filterBySelect } from '../../src/pages/filters';
import {
  approveProposal,
  describeRuling,
  readSourceConfigReview,
} from '../../src/pages/sources/approval';
import { statusBadges } from '../../src/pages/sources/badges';
import { failureCountLabel } from '../../src/pages/sources/failures';
import {
  NEVER_FETCHED_LABEL,
  SOURCE_STAT_CARDS,
  cursorAgeStamp,
  cursorLabel,
  failureStreakLabel,
  isRunLive,
  sourceCountLabel,
  splitEndpoint,
  statusFacet,
} from '../../src/pages/sources/rows';
import {
  domainBase,
  SINGLE_DOMAIN_BASE,
  withBase,
} from '../../src/routes/paths';

// Every expected row, count, badge and notice below is read out of the
// app's own modules, so this file spells no fixture endpoint, no status
// and no sentence of its own. What it does spell is ACCESSIBLE NAMES:
// `SourcesPage.tsx` and the three modals build them from literals, and
// all four are `.tsx` files nothing here may import — a spec touching
// `document` at import time never loads. Each one is a named constant
// beside the control it addresses.
//
// What this adds over the unit suites — `pages/sources/rows.test.ts`
// drives the cells, `badges.test.ts` the press model, `approval.ts`'s
// and `failures.ts`' own suites the two rulings — is the ASSEMBLY. Six
// things only a browser can answer: that the band and the table are
// two reads and count two different things, that a badge press reaches
// both the table and the address bar, that each of the three
// sub-routes is wired to a menu item at all, that closing one lands
// back on the list, that a ruling made in a modal is visible to the
// read that draws it, and that a slug nothing answers to refuses in
// both halves of the surface instead of drawing zeros.
//
// ## No stamp is ever asserted as text
//
// `FormattedRelativeTime` renders a CLOCK TIME rather than a relative
// phrase for a stamp on the same calendar day as its `now`, and the
// seeded feeds are dated within hours of `FIXTURE_NOW`. So the health
// cell's failure date, the cursor cell's age and each failed capture's
// `Captured` reading are never compared to a string here. Row
// membership is read off the LEADING CELL, whose text is the endpoint
// split in two and nothing else.
//
// ## Rows are addressed by that leading cell, not by the row menu
//
// The digest reads its rows off the menu triggers, whose names carry
// the finding's title. That does not work here: `SourcesPage.tsx`
// names a trigger after the endpoint's HOST, and three seeded feeds
// share `example.org` — `getByRole('button', { name: 'Actions for
// example.org' })` is a strict-mode violation with three matches. So
// every row here is located by the text of its first cell, which is
// the host and the path run together and is unique per feed.
//
// ## The modal hides the surface from every role locator
//
// `Modal` is a Radix dialog, and an open one sets `aria-hidden` on the
// app root: with a modal up, `page.getByRole('main')` resolves to ZERO
// elements and so does everything scoped under it. Every band, table
// and badge assertion here is taken before a modal opens or after it
// has closed, never beside one.
//
// ## Which base
//
// The single-domain base carries every case except the sub-route open
// gesture, which runs under both: the sub-route address is the one
// claim here that is base-dependent, each modal's close being
// relative. The unknown-slug case is the exception in the other
// direction — a domain slug only exists under the domain base.

/** Which surface this is — the list path comes off the same table. */
const SOURCES_SURFACE_ID = 'sources';

/**
 * The segment each sub-route occupies under a source id.
 *
 * Spelled rather than imported: `routes/router.tsx` builds the three
 * patterns and is a `.tsx` this file may not load, and `SourcesPage`
 * keeps its own copies private. The router's own unit suite is what
 * holds them in step; here they are three literals, named once.
 */
const EDIT_SEGMENT = 'edit';
const CONFIG_SEGMENT = 'config';
const FAILURES_SEGMENT = 'failures';

/** The search parameter each filter control owns. */
const KIND_PARAM = 'kind';
const STATUS_PARAM = 'status';

/** What the row of pressable status badges is called. */
const STATUS_GROUP_NAME = 'Filter by status';

/**
 * What a row's menu trigger is called, before the endpoint's host.
 *
 * Only the prefix, because the host does not identify a row here —
 * see the note above on why every row is reached by its leading cell
 * and its menu trigger by this pattern within that row.
 */
const ROW_MENU_PREFIX = 'Actions for ';

/** What each item of a row's menu is called. */
const EDIT_ITEM = 'Edit source';
const CONFIG_ITEM = 'Review proposed config';
const FAILURES_ITEM = 'View failures';

/** What every overlay's dismiss button is called. */
const CLOSE_NAME = 'Close';

/** How the table titles a domain nothing answers to. */
const REJECTED_DOMAIN_TITLE = 'This domain could not be read';

/** How each modal titles a source id nothing answers to. */
const REJECTED_SOURCE_TITLE = 'This source could not be read';

/** How the approval titles a feed nothing has proposed anything for. */
const NO_PROPOSAL_TITLE = 'Nothing has been proposed for this feed';

/** How the failures list titles a feed that has failed nothing. */
const NO_FAILURES_TITLE = 'Every capture from this feed parsed';

/** What the approval's two rulings are called. */
const APPROVE_NAME = 'Approve config';
const REJECT_NAME = 'Reject';

/** What the editor's endpoint field is called. */
const ENDPOINT_FIELD_NAME = 'Endpoint';

/** What the health cell's flag tag says. */
const FLAGGED_TAG = 'Flagged';

/**
 * A slug no domain carries.
 *
 * Named rather than derived, and proved unknown in the case that uses
 * it: `findDomain` answering undefined is what stops a fixture domain
 * added under this name from turning the refusal case into a
 * successful read that asserts nothing.
 */
const UNKNOWN_DOMAIN_SLUG = 'no-domain-answers-to-this';

/**
 * Which cell of a row carries which reading.
 *
 * The column order is `SourcesPage.tsx`'s — source, kind, status,
 * health, cursor, menu. Named because a row's accessible name runs
 * every cell together and therefore says nothing about WHICH cell a
 * value landed in.
 */
const LEAD_CELL_INDEX = 0;
const KIND_CELL_INDEX = 1;
const STATUS_CELL_INDEX = 2;
const HEALTH_CELL_INDEX = 3;
const CURSOR_CELL_INDEX = 4;

/** The two bases the sub-route open gestures are driven under. */
const BASES = [
  { label: 'single-domain base', base: SINGLE_DOMAIN_BASE },
  { label: 'domain base', base: domainBase(DEFAULT_DOMAIN_SLUG) },
] as const;

/**
 * The first member, or a failure naming what was empty.
 *
 * Every case here derives its subject from the fixtures, and an empty
 * list would otherwise leave a loop that asserts nothing and passes.
 *
 * @param values - Whatever a fixture accessor answered.
 * @param what - What was expected, for the failure message.
 * @returns The first member.
 * @throws If there is none.
 */
function first<T>(values: readonly T[], what: string): T {
  const [value] = values;

  if (value === undefined) {
    throw new Error(`No ${what} in the fixtures.`);
  }

  return value;
}

/** The sources list path under a base. */
function listPath(base: string): string {
  return withBase(base, SOURCES_SURFACE_ID);
}

/**
 * One source's sub-route address under a base.
 *
 * @param base - Which route base.
 * @param sourceId - The row's id.
 * @param segment - Which of the three sub-routes.
 * @returns The address.
 */
function subRoutePath(
  base: string,
  sourceId: number,
  segment: string,
): string {
  return `${listPath(base)}/${sourceId}/${segment}`;
}

/**
 * The list path carrying filter parameters.
 *
 * Serialised through `URLSearchParams`, which is what react-router
 * writes with, so an expected address is encoded the way the app
 * encodes it rather than by hand.
 *
 * @param base - Which route base.
 * @param params - The parameters and their values.
 * @returns The address, query string and all.
 */
function filteredPath(
  base: string,
  params: Readonly<Record<string, string>>,
): string {
  return `${listPath(base)}?${new URLSearchParams(params).toString()}`;
}

/**
 * What a row's leading cell reads, exactly as the table draws it.
 *
 * `renderCellContent('double-line', …)` puts the host over the path,
 * and `textContent` runs the two together with no separator — so this
 * is the run-together form and not the endpoint. It is unique per
 * seeded feed, which is what makes it the handle every row is reached
 * by; the endpoint itself carries a scheme the cell never draws.
 *
 * @param source - The feed.
 * @returns Its leading cell's text.
 */
function sourceLead(source: Source): string {
  const { host, path } = splitEndpoint(source.endpoint);

  return `${host}${path ?? ''}`;
}

/**
 * The table's BODY.
 *
 * `Table` renders two `<table>` elements — a sticky header and the
 * body — so a bare `getByRole('table')` is a strict-mode violation on
 * every list surface here.
 *
 * @param main - The content landmark.
 * @returns The body table.
 */
function tableBody(main: Locator): Locator {
  return main.getByRole('table').last();
}

/**
 * Which feeds the table is drawing, right now, in row order.
 *
 * Read off each row's leading cell rather than off its accessible
 * name: the name runs every cell together and carries two stamps, and
 * the menu trigger is named after a host three feeds share. One
 * `evaluateAll` answers both membership and order with neither in the
 * reading.
 *
 * @param main - The content landmark.
 * @returns One leading cell per drawn row, in draw order.
 */
async function visibleSources(main: Locator): Promise<readonly string[]> {
  return tableBody(main)
    .getByRole('row')
    .evaluateAll((nodes) => nodes.map(
      (node) => node.querySelector('td')?.textContent ?? '',
    ));
}

/**
 * One drawn row, located from its leading cell.
 *
 * `hasText` matches the row's own `textContent`, which begins with
 * that cell — see {@link sourceLead} on why the run-together form is
 * the identity here.
 *
 * @param main - The content landmark.
 * @param source - The feed.
 * @returns The row.
 */
function sourceRow(main: Locator, source: Source): Locator {
  return tableBody(main)
    .getByRole('row')
    .filter({ hasText: sourceLead(source) });
}

/**
 * One cell of one row — see the cell index constants.
 *
 * @param main - The content landmark.
 * @param source - The feed.
 * @param index - Which column.
 * @returns The cell.
 */
function sourceCell(
  main: Locator,
  source: Source,
  index: number,
): Locator {
  return sourceRow(main, source)
    .getByRole('cell')
    .nth(index);
}

/**
 * Open one row's menu and choose an item from it.
 *
 * The trigger is scoped to the ROW: `RowContextAction` names it after
 * the endpoint's host, and three seeded feeds share one. The panel is
 * addressed at PAGE scope for the opposite reason — it is a portal,
 * so it is a sibling of the table rather than a descendant.
 *
 * @param page - The page the surface is open on.
 * @param source - Whose row's menu to open.
 * @param item - The item to choose.
 */
async function chooseRowAction(
  page: Page,
  source: Source,
  item: string,
): Promise<void> {
  await sourceRow(page.getByRole('main'), source)
    .getByRole('button', { name: new RegExp(`^${ROW_MENU_PREFIX}`) })
    .click();

  await page
    .getByRole('menu')
    .getByRole('menuitem', { name: item, exact: true })
    .click();
}

/**
 * One tile of the stat band, located from the title on it.
 *
 * A `SmallStatCard` renders no role of its own, so the title is the
 * only handle into a tile: it sits in a `span` inside the tile's own
 * header row, which is why the walk is two steps and not one. The
 * same shape the lexicon spec reaches an `EntityCard` by.
 *
 * @param main - The content landmark.
 * @param title - The tile's title, from `SOURCE_STAT_CARDS`.
 * @returns The tile.
 */
function statTile(main: Locator, title: string): Locator {
  return main.getByText(title, { exact: true }).locator('xpath=../..');
}

/**
 * One status badge, located by the name its contents compute.
 *
 * A badge carries no `aria-label`, so its accessible name is its
 * label and its count joined by a space — a separator the markup does
 * not contain, `textContent` answering `Failing3`. Built here through
 * the same `statusBadges` the row is drawn from, so a relabelled
 * status reaches both sides at once.
 *
 * @param main - The content landmark.
 * @param label - The badge's label.
 * @param count - The figure on it.
 * @returns The badge button.
 */
function statusBadge(
  main: Locator,
  label: string,
  count: number,
): Locator {
  return main
    .getByRole('group', { name: STATUS_GROUP_NAME })
    .getByRole('button', { name: `${label} ${count}` });
}

/** The seeded domain's sources, as the surface reads them. */
interface SeededSources {
  /** Every feed of the domain, in configuration order. */
  readonly sources: readonly Source[];
  /** A count per status, as the band reads them. */
  readonly counts: SourceStatusCounts;
  /** The domain's config proposals, every status. */
  readonly proposals: readonly SourceConfigProposal[];
  /** Each feed's failed captures, keyed by source id. */
  readonly failures: ReadonlyMap<number, readonly Document[]>;
}

/**
 * The seeded domain's sources, through the surface's own accessors.
 *
 * The four reads `SourcesPage.tsx` and its three modals make between
 * them, so every expectation below is the app's own answer to the
 * same question rather than a second implementation of it.
 *
 * @returns The feeds, the counts, the review queue and the failures.
 */
async function seededSources(): Promise<SeededSources> {
  const [sources, counts, proposals] = await Promise.all([
    fetchSources(DEFAULT_DOMAIN_SLUG),
    fetchSourceStatusCounts(DEFAULT_DOMAIN_SLUG),
    fetchSourceProposals(DEFAULT_DOMAIN_SLUG),
  ]);

  // A domain that lost its feeds would leave every loop below
  // asserting nothing, and passing.
  expect(sources.length).toBeGreaterThan(0);

  const failed = await Promise.all(sources.map(
    async (source) => [
      source.id,
      await fetchSourceFailures(DEFAULT_DOMAIN_SLUG, source.id),
    ] as const,
  ));

  return { sources, counts, proposals, failures: new Map(failed) };
}

/**
 * The feed a config approval case is about — one with a proposal
 * still waiting on somebody.
 *
 * @param seeded - The seeded domain.
 * @returns That feed and the proposal to rule on.
 * @throws If the fixtures carry no pending proposal.
 */
function pendingProposalSubject(seeded: SeededSources): {
  readonly source: Source;
  readonly proposal: SourceConfigProposal;
} {
  for (const source of seeded.sources) {
    const review = readSourceConfigReview(seeded.proposals, source.id);

    if (review.kind === 'pending') {
      return { source, proposal: review.proposal };
    }
  }

  throw new Error('No source in the fixtures has a pending proposal.');
}

/**
 * The feed the approval's empty state is about — one nothing has ever
 * proposed a config for.
 *
 * A feed whose proposal was already RULED is deliberately not this:
 * `readSourceConfigReview` tells the two apart, and they are two
 * different screens.
 *
 * @param seeded - The seeded domain.
 * @returns That feed.
 * @throws If every seeded feed has been proposed for.
 */
function noProposalSubject(seeded: SeededSources): Source {
  return first(
    seeded.sources.filter(
      (source) => readSourceConfigReview(
        seeded.proposals,
        source.id,
      ).kind === 'none',
    ),
    'source with no config proposal',
  );
}

/**
 * The feed the failures list is about — one with captures that would
 * not parse.
 *
 * @param seeded - The seeded domain.
 * @returns That feed.
 * @throws If no seeded feed has failed a capture.
 */
function withFailuresSubject(seeded: SeededSources): Source {
  return first(
    seeded.sources.filter(
      (source) => (seeded.failures.get(source.id) ?? []).length > 0,
    ),
    'source with a failed capture',
  );
}

/**
 * The feed the failures list's empty state is about.
 *
 * @param seeded - The seeded domain.
 * @returns That feed.
 * @throws If every seeded feed has failed something.
 */
function noFailuresSubject(seeded: SeededSources): Source {
  return first(
    seeded.sources.filter(
      (source) => (seeded.failures.get(source.id) ?? []).length === 0,
    ),
    'source with no failed capture',
  );
}

/** How many captures one feed has failed, as the read answers it. */
function failureCount(seeded: SeededSources, source: Source): number {
  return (seeded.failures.get(source.id) ?? []).length;
}

test.describe('an unknown domain slug', () => {
  test('refuses in the table and drops the band', async ({ page }) => {
    // Arrange — the slug really is unknown. Without this the case
    // would pass just as well against a fixture domain added under
    // that name, having read a real one and asserted nothing.
    expect(findDomain(UNKNOWN_DOMAIN_SLUG)).toBeUndefined();

    const seeded = await seededSources();

    // Act
    await page.goto(listPath(domainBase(UNKNOWN_DOMAIN_SLUG)));

    const main = page.getByRole('main');

    // Assert — the table states what it could not read. Auto-retrying
    // because a rejected read does not settle on a microtask: the
    // cache retries once, and until it gives up the body is an
    // `aria-hidden` skeleton that is neither state.
    await expect(
      main.getByText(REJECTED_DOMAIN_TITLE, { exact: true }),
    ).toBeVisible();
    await expect.poll(() => visibleSources(main)).toEqual([]);

    // And the band is GONE rather than reading zeros, which is the
    // page's own decision: three tiles confidently answering a
    // question nobody could answer is worse than no tiles. The head
    // chip goes with it — a count of a list that was never read.
    for (const card of SOURCE_STAT_CARDS) {
      await expect(statTile(main, card.title)).toHaveCount(0);
    }

    await expect(
      main.getByText(sourceCountLabel(0, 0), { exact: true }),
    ).toHaveCount(0);

    // The control, in the same case and varying exactly the axis
    // under test: an absent band is also what a band that had stopped
    // rendering would look like. A slug that IS answered draws all
    // three tiles and the rows under them.
    await page.goto(listPath(domainBase(DEFAULT_DOMAIN_SLUG)));

    await expect
      .poll(() => visibleSources(main))
      .toEqual(seeded.sources.map(sourceLead));

    for (const card of SOURCE_STAT_CARDS) {
      await expect(statTile(main, card.title)).toBeVisible();
    }
  });
});

test.describe('a source with no pending proposal', () => {
  test('opens the approval on its empty state', async ({ page }) => {
    // Arrange
    const seeded = await seededSources();
    const source = noProposalSubject(seeded);

    // Act
    await page.goto(
      subRoutePath(SINGLE_DOMAIN_BASE, source.id, CONFIG_SEGMENT),
    );

    const dialog = page.getByRole('dialog');

    // Assert — the sentence for a feed nothing has proposed for, and
    // no ruling to make. The refusal's absence matters as much: a
    // source id nothing answers to draws an empty state too, and an
    // operator told the feed could not be read would go looking for a
    // fault that is not there.
    await expect(
      dialog.getByText(NO_PROPOSAL_TITLE, { exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByText(REJECTED_SOURCE_TITLE, { exact: true }),
    ).toHaveCount(0);
    await expect(
      dialog.getByRole('button', { name: APPROVE_NAME }),
    ).toHaveCount(0);
    await expect(
      dialog.getByRole('button', { name: REJECT_NAME }),
    ).toHaveCount(0);

    // The control, varying exactly the axis under test: the feed that
    // DOES have one waiting offers both rulings at the same address.
    // Without it, an approval that had stopped rendering its footer
    // would pass the assertions above.
    const waiting = pendingProposalSubject(seeded);

    await page.goto(
      subRoutePath(SINGLE_DOMAIN_BASE, waiting.source.id, CONFIG_SEGMENT),
    );

    await expect(
      dialog.getByRole('button', { name: APPROVE_NAME }),
    ).toBeVisible();
    await expect(
      dialog.getByText(NO_PROPOSAL_TITLE, { exact: true }),
    ).toHaveCount(0);
  });
});

test.describe('a source with no failures', () => {
  test('opens the failures list on its empty state', async ({ page }) => {
    // Arrange
    const seeded = await seededSources();
    const source = noFailuresSubject(seeded);
    const busy = withFailuresSubject(seeded);

    // Act
    await page.goto(
      subRoutePath(SINGLE_DOMAIN_BASE, source.id, FAILURES_SEGMENT),
    );

    const dialog = page.getByRole('dialog');

    // Assert — the sentence for a feed that has failed nothing, and
    // no footer: a queue reading over an empty state would open a row
    // on nothing. The refusal's absence again distinguishes this from
    // a source id nothing answers to.
    await expect(
      dialog.getByText(NO_FAILURES_TITLE, { exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByText(REJECTED_SOURCE_TITLE, { exact: true }),
    ).toHaveCount(0);
    await expect(dialog.getByRole('listitem')).toHaveCount(0);
    await expect(
      dialog.getByText(failureCountLabel(0, 0), { exact: true }),
    ).toHaveCount(0);

    // The control, varying exactly the axis under test: the feed that
    // HAS failures draws one row apiece and the count under them.
    await page.goto(
      subRoutePath(SINGLE_DOMAIN_BASE, busy.id, FAILURES_SEGMENT),
    );

    await expect(dialog.getByRole('listitem')).toHaveCount(
      failureCount(seeded, busy),
    );
    await expect(
      dialog.getByText(NO_FAILURES_TITLE, { exact: true }),
    ).toHaveCount(0);
  });
});

test.describe('the stat band', () => {
  test('reads one tile per stat card', async ({ page }) => {
    // Arrange
    const seeded = await seededSources();
    const values = SOURCE_STAT_CARDS.map(
      (card) => seeded.counts[card.status],
    );

    // A band drawing ONE figure in all three tiles would satisfy a
    // per-tile containment check against fixtures that happened to
    // agree, so the case needs the figures to differ before it can
    // read anything.
    expect(new Set(values).size).toBeGreaterThan(1);

    // Act
    await page.goto(listPath(SINGLE_DOMAIN_BASE));

    const main = page.getByRole('main');

    // Assert — each tile carries its own three readings: the title it
    // is located by, the count `fetchSourceStatusCounts` answered, and
    // the line saying what that count is of. The value is matched
    // EXACTLY on its own element rather than as substring of the
    // tile, which is what makes a tile drawing 12 for 2 fail here.
    for (const card of SOURCE_STAT_CARDS) {
      const tile = statTile(main, card.title);

      await expect(tile).toHaveCount(1);
      await expect(
        tile.getByText(String(seeded.counts[card.status]), { exact: true }),
      ).toBeVisible();
      await expect(
        tile.getByText(card.caption, { exact: true }),
      ).toBeVisible();
    }
  });

  test('counts the domain while the table counts the filters', async ({
    page,
  }) => {
    // Arrange — a status that leaves some rows but not all of them.
    // Both bounds are the vacuity guards: a filter leaving every row
    // cannot show the band and the table disagreeing, and one leaving
    // none puts the table in its empty state instead.
    const seeded = await seededSources();
    const narrowing = pickNarrowingStatus(seeded);
    const kept = filterBySelect(
      seeded.sources,
      narrowing,
      classifySource,
    );

    // Act
    await page.goto(filteredPath(SINGLE_DOMAIN_BASE, {
      [STATUS_PARAM]: narrowing,
    }));

    const main = page.getByRole('main');

    await expect
      .poll(() => visibleSources(main))
      .toEqual(kept.map(sourceLead));

    // Assert — the band is a reading of the DOMAIN and the head chip
    // is a reading of what the controls left, which is the one place
    // this surface departs from its neighbours. The two reads are
    // separate for exactly this reason.
    for (const card of SOURCE_STAT_CARDS) {
      await expect(
        statTile(main, card.title)
          .getByText(String(seeded.counts[card.status]), { exact: true }),
      ).toBeVisible();
    }

    await expect(
      main.getByText(
        sourceCountLabel(kept.length, seeded.sources.length),
        { exact: true },
      ),
    ).toBeVisible();
  });
});

/**
 * A status some feeds carry, but not all of them.
 *
 * @param seeded - The seeded domain.
 * @returns That status.
 * @throws If no status narrows the seeded feeds to a subset.
 */
function pickNarrowingStatus(seeded: SeededSources): SourceStatus {
  for (const badge of statusBadges(seeded.counts, '')) {
    if (badge.count > 0 && badge.count < seeded.sources.length) {
      return badge.status;
    }
  }

  throw new Error('No status narrows the seeded feeds to a subset.');
}

test.describe('the sources table', () => {
  test('renders one row per feed, counted, cell by cell', async ({
    page,
  }) => {
    // Arrange
    const seeded = await seededSources();

    // Act
    await page.goto(listPath(SINGLE_DOMAIN_BASE));

    const main = page.getByRole('main');

    // Assert — every feed, once, in the order `listSources` answered
    // them. Configuration order is what a sources list means, so this
    // is a sequence rather than a membership check.
    await expect
      .poll(() => visibleSources(main))
      .toEqual(seeded.sources.map(sourceLead));

    await expect(
      main.getByText(
        sourceCountLabel(seeded.sources.length, seeded.sources.length),
        { exact: true },
      ),
    ).toBeVisible();

    // Then the cells, per row. A row's accessible name runs all of
    // them together, so it says nothing about WHICH cell a value
    // landed in. The two stamp-bearing cells are read for the part
    // that is not a stamp: the failure streak and the flag in one,
    // the stored cursor token in the other.
    for (const source of seeded.sources) {
      const facet = statusFacet(classifySource(source));

      await expect(sourceCell(main, source, LEAD_CELL_INDEX))
        .toHaveText(sourceLead(source));
      await expect(sourceCell(main, source, KIND_CELL_INDEX))
        .toHaveText(source.kind);
      await expect(sourceCell(main, source, STATUS_CELL_INDEX))
        .toHaveText(facet.label);

      const health = sourceCell(main, source, HEALTH_CELL_INDEX);

      await expect(health).toContainText(
        failureStreakLabel(source.consecutiveFailures),
      );

      // The flag is the third state the health cell carries, and it
      // survives a success — so its absence is as much a reading as
      // its presence.
      if (source.flagged) {
        await expect(health).toContainText(FLAGGED_TAG);
      } else {
        await expect(health).not.toContainText(FLAGGED_TAG);
      }

      const cursor = sourceCell(main, source, CURSOR_CELL_INDEX);

      await expect(cursor).toContainText(cursorLabel(source.cursor));

      if (cursorAgeStamp(source) === null) {
        await expect(cursor).toContainText(NEVER_FETCHED_LABEL);
      }
    }
  });

  test('names the status dot on the live rows', async ({ page }) => {
    // Arrange — the fixtures fall on BOTH sides of the live-run
    // window on purpose, which `pages/sources/rows.ts` states is a
    // pinned property rather than a coincidence. Assert it here too:
    // a window nothing crossed would make the reading below vacuous
    // in either direction.
    const seeded = await seededSources();
    const live = seeded.sources.filter(
      (source) => isRunLive(source, FIXTURE_NOW),
    );

    expect(live.length).toBeGreaterThan(0);
    expect(live.length).toBeLessThan(seeded.sources.length);

    // Act
    await page.goto(listPath(SINGLE_DOMAIN_BASE));

    const main = page.getByRole('main');

    await expect
      .poll(() => visibleSources(main))
      .toEqual(seeded.sources.map(sourceLead));

    // Assert — the dot is LABELLED on exactly the live rows and left
    // decorative on the rest, which is what makes the pulse say
    // anything at all to a reader who cannot see it: motion is not in
    // the accessibility tree. `CellStatus` gives an unlabelled dot no
    // role, so a status role in this table IS a live row.
    await expect
      .poll(async () => tableBody(main)
        .getByRole('row')
        .filter({ has: page.getByRole('status') })
        .evaluateAll((nodes) => nodes.map(
          (node) => node.querySelector('td')?.textContent ?? '',
        )))
      .toEqual(live.map(sourceLead));
  });
});

test.describe('a status filter badge', () => {
  test('narrows the table and writes the URL', async ({ page }) => {
    // Arrange
    const seeded = await seededSources();
    const status = pickNarrowingStatus(seeded);
    const facet = statusFacet(status);
    const kept = filterBySelect(seeded.sources, status, classifySource);
    const address = filteredPath(SINGLE_DOMAIN_BASE, {
      [STATUS_PARAM]: status,
    });

    await page.goto(listPath(SINGLE_DOMAIN_BASE));

    const main = page.getByRole('main');

    await expect
      .poll(() => visibleSources(main))
      .toEqual(seeded.sources.map(sourceLead));

    // Nothing is pressed on an untouched surface, and the row is
    // still TOTAL over the union: a badge row that dropped its
    // zero-count members could strand the pressed one.
    const group = main.getByRole('group', { name: STATUS_GROUP_NAME });

    await expect(group.getByRole('button')).toHaveCount(
      statusBadges(seeded.counts, '').length,
    );
    await expect(group.getByRole('button', { pressed: true }))
      .toHaveCount(0);

    // Act — the badge's own name is its label and its count joined,
    // which is the whole of what it promises: press this and get that
    // many rows.
    await statusBadge(main, facet.label, kept.length).click();

    // Assert — the URL IS the state, and the table carries what the
    // press promised, in the order the unfiltered list drew them.
    await expect(page).toHaveURL(address);
    await expect.poll(() => visibleSources(main)).toEqual(
      kept.map(sourceLead),
    );
    await expect(
      statusBadge(main, facet.label, kept.length),
    ).toHaveAttribute('aria-pressed', 'true');

    // Act again. A reload is a fresh document: nothing the page held
    // survives it, so what comes back has to have been read out of
    // the address.
    await page.reload();

    // Assert
    await expect(page).toHaveURL(address);
    await expect.poll(() => visibleSources(main)).toEqual(
      kept.map(sourceLead),
    );
    await expect(
      statusBadge(main, facet.label, kept.length),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  test('clears itself on a second press, keeping its neighbour', async ({
    page,
  }) => {
    // Arrange — a kind and a status that leave rows TOGETHER, so the
    // press being cleared is one an operator could have made. The
    // badge counts are measured over the rows the kind control left,
    // which is what the name below has to be built from.
    const seeded = await seededSources();
    const pair = pickKindAndStatus(seeded);
    const byKind = filterBySelect(
      seeded.sources,
      pair.kind,
      (source) => source.kind,
    );
    const facet = statusFacet(pair.status);
    const counted = countSourceStatuses(byKind)[pair.status];

    await page.goto(filteredPath(SINGLE_DOMAIN_BASE, {
      [KIND_PARAM]: pair.kind,
      [STATUS_PARAM]: pair.status,
    }));

    const main = page.getByRole('main');
    const pressed = statusBadge(main, facet.label, counted);

    await expect(pressed).toHaveAttribute('aria-pressed', 'true');

    // Act — the pressed badge is the clearing gesture. `aria-pressed`
    // is a toggle, and a row that only ever narrowed would need a
    // second control whose whole job was undoing the first.
    await pressed.click();

    // Assert — the status KEY is deleted rather than written empty,
    // and the neighbour parameter survives it. The second parameter
    // is what makes that a reading: an address that had lost its
    // whole query string would satisfy a status-only check.
    await expect(page).toHaveURL(filteredPath(SINGLE_DOMAIN_BASE, {
      [KIND_PARAM]: pair.kind,
    }));
    await expect
      .poll(() => visibleSources(main))
      .toEqual(byKind.map(sourceLead));
    await expect(
      main.getByRole('group', { name: STATUS_GROUP_NAME })
        .getByRole('button', { pressed: true }),
    ).toHaveCount(0);
  });
});

/** A kind and a status the seeded feeds carry together. */
interface KindAndStatus {
  /** A stored `sources.kind`. */
  readonly kind: string;
  /** A status some feed of that kind is in. */
  readonly status: SourceStatus;
}

/**
 * A kind and a status that leave rows together, derived not chosen.
 *
 * @param seeded - The seeded domain.
 * @returns The pair.
 * @throws If no kind and status combination keeps a row.
 */
function pickKindAndStatus(seeded: SeededSources): KindAndStatus {
  for (const source of seeded.sources) {
    const byKind = filterBySelect(
      seeded.sources,
      source.kind,
      (row) => row.kind,
    );

    // Only worth using where the kind itself narrows: otherwise the
    // surviving parameter is one that changes nothing, and its
    // survival says less than it looks like it does.
    if (byKind.length < seeded.sources.length) {
      return { kind: source.kind, status: classifySource(source) };
    }
  }

  throw new Error('No kind narrows the seeded feeds to a subset.');
}

/** One sub-route, and what proves its own modal opened. */
interface SubRoute {
  /** Names the claim, so a failing title says which sub-route. */
  readonly what: string;
  /** The menu item that opens it. */
  readonly item: string;
  /** The segment it occupies under a source id. */
  readonly segment: string;
  /** Whose row's menu the case opens. */
  readonly pick: (seeded: SeededSources) => Source;
  /**
   * An element only THIS modal renders.
   *
   * Three dialogs at three addresses under one surface would all
   * satisfy a bare `getByRole('dialog')`, so each case names
   * something the other two do not have.
   */
  readonly proof: (dialog: Locator, seeded: SeededSources) => Locator;
}

/**
 * The three sub-routes, each opened on a feed that has something to
 * show there.
 *
 * The editor takes the first feed — every source has an endpoint and
 * a kind — while the other two take the feeds the fixtures gave a
 * proposal and a failed capture to, so each proof reads a populated
 * screen rather than an empty state.
 */
const SUB_ROUTES: readonly SubRoute[] = [
  {
    what: 'editor',
    item: EDIT_ITEM,
    segment: EDIT_SEGMENT,
    pick: (seeded) => first(seeded.sources, 'source'),
    proof: (dialog) => dialog.getByRole('textbox', {
      name: ENDPOINT_FIELD_NAME,
    }),
  },
  {
    what: 'config approval',
    item: CONFIG_ITEM,
    segment: CONFIG_SEGMENT,
    pick: (seeded) => pendingProposalSubject(seeded).source,
    proof: (dialog) => dialog.getByRole('button', { name: APPROVE_NAME }),
  },
  {
    what: 'failures list',
    item: FAILURES_ITEM,
    segment: FAILURES_SEGMENT,
    pick: withFailuresSubject,
    proof: (dialog, seeded) => dialog.getByText(
      failureCountLabel(
        failureCount(seeded, withFailuresSubject(seeded)),
        0,
      ),
      { exact: true },
    ),
  },
];

test.describe('a row action', () => {
  for (const subRoute of SUB_ROUTES) {
    for (const { label, base } of BASES) {
      test(
        `opens the ${subRoute.what} under the ${label}, and closes back`,
        async ({ page }) => {
          // Arrange
          const seeded = await seededSources();
          const source = subRoute.pick(seeded);

          await page.goto(listPath(base));

          const main = page.getByRole('main');

          await expect
            .poll(() => visibleSources(main))
            .toEqual(seeded.sources.map(sourceLead));

          // Act — the row's own gesture. Nothing in this menu writes:
          // all three items are navigations, which is why opening one
          // is the whole of what a menu case can claim.
          await chooseRowAction(page, source, subRoute.item);

          // Assert — the address this sub-route declares under THIS
          // base, and its own modal open on that feed. The heading is
          // the WHOLE endpoint rather than the host, since three
          // seeded feeds share one.
          await expect(page).toHaveURL(
            subRoutePath(base, source.id, subRoute.segment),
          );

          const dialog = page.getByRole('dialog');

          await expect(
            dialog.getByRole('heading', {
              name: source.endpoint,
              exact: true,
            }),
          ).toBeVisible();
          await expect(subRoute.proof(dialog, seeded)).toBeVisible();

          // Act — closing resolves `..` against the ROUTE tree, which
          // is what puts both bases back on their own list.
          await dialog.getByRole('button', { name: CLOSE_NAME }).click();

          // Assert — the list is standing where it was. The table
          // cannot be read while the dialog is up: an open Radix
          // dialog sets `aria-hidden` on the app root and the content
          // landmark goes with it.
          await expect(dialog).toHaveCount(0);
          await expect(page).toHaveURL(listPath(base));
          await expect
            .poll(() => visibleSources(main))
            .toEqual(seeded.sources.map(sourceLead));
        },
      );
    }
  }
});

test.describe('an approval', () => {
  test('takes the proposal out of the pending queue', async ({ page }) => {
    // Arrange — the ruled status and its notice come off the very
    // transition the modal calls, so a status renamed upstream
    // reaches both sides of this case at once.
    const seeded = await seededSources();
    const { source, proposal } = pendingProposalSubject(seeded);
    const ruled = approveProposal(proposal, FIXTURE_NOW).status;
    const waitingNotice = describeRuling(proposal.status).title;
    const ruledNotice = describeRuling(ruled).title;

    expect(ruledNotice).not.toEqual(waitingNotice);

    await page.goto(listPath(SINGLE_DOMAIN_BASE));

    const main = page.getByRole('main');

    await expect
      .poll(() => visibleSources(main))
      .toEqual(seeded.sources.map(sourceLead));

    // Act
    await chooseRowAction(page, source, CONFIG_ITEM);

    const dialog = page.getByRole('dialog');

    await expect(
      dialog.getByText(waitingNotice, { exact: true }),
    ).toBeVisible();

    await dialog.getByRole('button', { name: APPROVE_NAME }).click();

    // Assert — the modal does NOT close, and turns into the ruled
    // state around the same two documents: nothing on the table
    // behind it draws a proposal, so closing on success would take an
    // operator away from the only screen that could confirm the act.
    // The proposal leaving the pending queue is what removes both
    // rulings from the footer.
    await expect(
      dialog.getByText(ruledNotice, { exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByText(waitingNotice, { exact: true }),
    ).toHaveCount(0);
    await expect(dialog.getByText(ruled, { exact: true })).toBeVisible();
    await expect(
      dialog.getByRole('button', { name: APPROVE_NAME }),
    ).toHaveCount(0);
    await expect(
      dialog.getByRole('button', { name: REJECT_NAME }),
    ).toHaveCount(0);

    // Act
    await dialog.getByRole('button', { name: CLOSE_NAME }).click();

    // Assert — the LIST behind it is exactly where it was, and that
    // is the surface as built rather than a shortfall: no cell on the
    // sources table draws a proposal, so an approval cannot shorten
    // it. Said on its own this assertion would pass just as well
    // against a ruling that recorded nothing, which is what the
    // reopen below is for.
    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(listPath(SINGLE_DOMAIN_BASE));
    await expect
      .poll(() => visibleSources(main))
      .toEqual(seeded.sources.map(sourceLead));

    // Act — reopened by CLICKING, never by a second `goto`: the draft
    // store is module state in the tab, and a fresh document resets
    // it. A goto-based reopen would show the seeded proposal again
    // and read exactly like a ruling that never recorded.
    await chooseRowAction(page, source, CONFIG_ITEM);

    // Assert — the ruling is visible to the read that draws it, which
    // is the whole of the round trip: the mutation records into the
    // draft store, the invalidation re-reads, and
    // `fetchSourceProposals` composes the overlay on its way back.
    await expect(
      dialog.getByText(ruledNotice, { exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByRole('button', { name: APPROVE_NAME }),
    ).toHaveCount(0);
  });
});
