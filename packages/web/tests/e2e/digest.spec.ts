import type { CategorySummary } from '../../src/data/lexicon';
import type { DigestRow } from '../../src/pages/digest/rows';
import type { Locator, Page } from '@playwright/test';

import { expect, test } from '@playwright/test';

import {
  fetchCategorySummaries,
  fetchDocuments,
  fetchEntities,
  fetchFindings,
  fetchSources,
  fetchVerdicts,
} from '../../src/data/api';
import { DEFAULT_DOMAIN_SLUG } from '../../src/data/domains';
import { FIXTURE_NOW } from '../../src/data/types';
import {
  NO_VERDICT_VALUE,
  verdictChoices,
  verdictSelectValue,
} from '../../src/pages/digest/actions';
import {
  DIGEST_QUERY_FIELDS,
  UNRATED_VERDICT_LABEL,
  buildDigestRows,
  rowCountLabel,
  tagLine,
} from '../../src/pages/digest/rows';
import {
  TIME_WINDOWS,
  withinTimeWindow,
} from '../../src/pages/digest/timeWindow';
import { filterByQuery, filterBySelect } from '../../src/pages/filters';
import {
  domainBase,
  SINGLE_DOMAIN_BASE,
  withBase,
} from '../../src/routes/paths';

// Every expected row, count and filter value below is derived from the
// app's own pure modules, so this file spells no fixture summary, no
// verdict and no category of its own. What it does spell is ACCESSIBLE
// NAMES: `DigestPage.tsx` and `DigestDetailModal.tsx` build them from
// literals and templates, and both are `.tsx` files nothing here may
// import — a spec touching `document` at import time never loads. Each
// one is a named constant beside the control it addresses.
//
// What this adds over the unit suites — `pages/digest/rows.test.ts`
// drives the join, `timeWindow.test.ts` the cutoff, `actions.test.ts`
// the verdict ladder — is the ASSEMBLY. Five things only a browser can
// answer: that the join reaches the table at all, that each control is
// wired to the URL in both directions, that the row menu really is a
// menu, that a ruling chosen there is visible to the read that draws
// the cell, and that a finding nothing answers to reports inside the
// dialog instead of taking the shell down.
//
// ## No stamp is ever asserted as text
//
// `FormattedRelativeTime` renders a CLOCK TIME rather than a relative
// phrase for a stamp on the same calendar day as its `now`, and the
// seeded findings are dated within hours of `FIXTURE_NOW`. So the
// `Found` column and the detail rail's `Captured` reading are never
// compared to a string here: row membership is read off the row menu
// triggers' accessible names, which carry the finding's own title and
// nothing else, and those two cells are addressed only as elements.
//
// ## The modal hides the surface from every role locator
//
// `Modal` is a Radix dialog, and an open one sets `aria-hidden` on the
// app root: with the detail up, `page.getByRole('main')` resolves to
// ZERO elements and so does everything scoped under it. Every table
// assertion here is taken before a modal opens or after it has closed,
// never beside one.
//
// The single-domain base carries every case except the pair driving
// the open gesture, which runs under both: the sub-route address is
// the one claim here that is base-dependent.

/** Which surface this is — the list path comes off the same table. */
const DIGEST_SURFACE_ID = 'digest';

/**
 * The search parameter each filter control owns.
 *
 * Spelled rather than imported: `DigestPage.tsx` keeps its four names
 * private and is a `.tsx` this file may not load. They are also the
 * contract an operator sees in the address bar, so a rename that did
 * not reach here reddens the case owning that control.
 */
const QUERY_PARAM = 'q';
const VERDICT_PARAM = 'verdict';
const CATEGORY_PARAM = 'category';
const WINDOW_PARAM = 'window';

/** What each filter select is addressed by. */
const VERDICT_FILTER_LABEL = 'Filter by verdict';
const CATEGORY_FILTER_LABEL = 'Filter by category';
const WINDOW_FILTER_LABEL = 'Filter by time window';

/**
 * What the search box says when it is empty.
 *
 * `SearchInput` carries no label of its own, so the placeholder IS the
 * control's accessible name — which is what makes it addressable at
 * all, and why it is named here rather than reached for by CSS.
 */
const SEARCH_PLACEHOLDER = 'Search findings…';

/**
 * What a row's menu trigger is called, before the finding's title.
 *
 * `RowContextAction` names its trigger `Actions for <entityName>` and
 * the page passes the row's own title, so this prefix is the handle
 * every membership reading below goes through: one role locator
 * answers which findings are drawn and in what order, without this
 * file knowing how a cell is marked up and without reading a stamp.
 */
const ROW_MENU_PREFIX = 'Actions for ';

/**
 * What each item of a row's menu is called.
 *
 * A ruling's title carries its VALUE, which is the domain's own word,
 * so only the prefix is spelled here; the unruled option gets words of
 * its own because taking a ruling back is not the same gesture as
 * making one.
 */
const RULING_ITEM_PREFIX = 'Set verdict: ';
const CLEAR_RULING_ITEM = 'Clear verdict';
const OPEN_ITEM = 'Open';
const SEND_ITEM = 'Send to research';

/** What the title cell says for a payload carrying no summary text. */
const NO_SUMMARY = 'No summary';

/**
 * How the digest titles each of the three bodies it draws in place of
 * its table — a domain nothing answers to, a domain that has read
 * nothing, and a list the filters have narrowed away.
 */
const REJECTED_DOMAIN_TITLE = 'This domain could not be read';
const EMPTY_DOMAIN_TITLE = 'No findings yet';
const FILTERED_EMPTY_TITLE = 'Nothing matches these filters';

/**
 * What the detail modal is addressed by: its own rejected body, the
 * named region its stat rail renders as, and its one control.
 */
const REJECTED_FINDING_TITLE = 'This finding could not be read';
const DETAIL_RAIL_NAME = 'Reading';
const DETAIL_VERDICT_LABEL = 'Set verdict';

/** What every overlay's dismiss button is called. */
const CLOSE_NAME = 'Close';

/**
 * Which cell of a row carries the verdict badge.
 *
 * The column order is `DigestPage.tsx`'s — finding, verdict, score,
 * source, found, menu — and the table draws no leading modifier
 * column here, so the index is the column's own position. Named
 * because a row's accessible name runs every cell together and
 * therefore says nothing about WHICH cell a value landed in.
 */
const VERDICT_CELL_INDEX = 1;

/**
 * The shortest word a derived search needle may be.
 *
 * Long enough that a word is a word rather than a fragment every title
 * shares; short enough that the seeded prose has several.
 */
const SHORTEST_NEEDLE = 5;

/** The two bases the open gesture is driven under. */
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

/** The digest list path under a base. */
function listPath(base: string): string {
  return withBase(base, DIGEST_SURFACE_ID);
}

/**
 * One finding's detail path under a base — the BARE `:entityId`.
 *
 * No trailing segment, unlike the four editors: `router.tsx` registers
 * the digest at the address its routed detail page will answer at, so
 * growing this modal into a page is a change of element and not of
 * URL. That is the claim the open cases below make.
 *
 * @param base - Which route base.
 * @param findingId - The row's id.
 * @returns The sub-route address.
 */
function detailPath(base: string, findingId: number): string {
  return `${listPath(base)}/${findingId}`;
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

/** What a row is titled, exactly as the page titles it. */
function findingTitle(row: DigestRow): string {
  return row.summary ?? NO_SUMMARY;
}

/**
 * Which findings the table is drawing, right now, in row order.
 *
 * Read off the row menu triggers rather than off the cells: their
 * accessible names carry the finding's title and nothing else, so one
 * role locator answers both membership and order without this file
 * touching the `Found` column, whose text is a clock time.
 *
 * @param main - The content landmark.
 * @returns One title per drawn row, in the order they are drawn.
 */
async function visibleFindings(main: Locator): Promise<readonly string[]> {
  const names = await main
    .getByRole('button')
    .evaluateAll((nodes) => nodes.map(
      (node) => node.getAttribute('aria-label') ?? '',
    ));

  return names
    .filter((name) => name.startsWith(ROW_MENU_PREFIX))
    .map((name) => name.slice(ROW_MENU_PREFIX.length));
}

/**
 * One drawn row, located from the title it carries.
 *
 * A row's accessible name is the run-together text of every cell plus
 * its menu trigger's own label, so this resolves off the title only
 * because the page names that trigger after the finding. Substring on
 * purpose: that name also carries the stamp this file will not read.
 *
 * @param main - The content landmark.
 * @param title - The finding's title.
 * @returns The row.
 */
function findingRow(main: Locator, title: string): Locator {
  return main.getByRole('row', { name: title });
}

/**
 * One row's verdict cell — see {@link VERDICT_CELL_INDEX}.
 *
 * @param main - The content landmark.
 * @param title - The finding's title.
 * @returns The verdict cell.
 */
function verdictCell(main: Locator, title: string): Locator {
  return findingRow(main, title)
    .getByRole('cell')
    .nth(VERDICT_CELL_INDEX);
}

/** One row's menu trigger. */
function rowMenuTrigger(main: Locator, title: string): Locator {
  return main.getByRole('button', { name: `${ROW_MENU_PREFIX}${title}` });
}

/** The search box, addressed by the placeholder that names it. */
function searchBox(page: Page): Locator {
  return page.getByRole('textbox', { name: SEARCH_PLACEHOLDER });
}

/** One filter select's trigger. */
function filterTrigger(page: Page, label: string): Locator {
  return page.getByRole('button', { name: label });
}

/**
 * Choose one option from a filter select.
 *
 * The panel is addressed at PAGE scope: `Select` is a Radix dropdown
 * rendering its items through a portal, so they are a sibling of the
 * toolbar rather than a descendant of it.
 *
 * @param page - The page the surface is open on.
 * @param label - Which control to open.
 * @param option - The option label to choose.
 */
async function chooseFilterOption(
  page: Page,
  label: string,
  option: string,
): Promise<void> {
  await filterTrigger(page, label).click();
  await page
    .getByRole('menu')
    .getByRole('menuitemradio', { name: option, exact: true })
    .click();
}

/** The seeded domain's digest, as the page assembles it. */
interface SeededDigest {
  /** Every row of the domain, in the order the table draws them. */
  readonly rows: readonly DigestRow[];
  /** The domain's verdict ladder, in its own order. */
  readonly vocabulary: readonly string[];
  /** Its taxonomy, as the category filter offers it. */
  readonly categories: readonly CategorySummary[];
}

/**
 * The seeded domain's digest, through the page's own modules.
 *
 * The four reads and the very join `DigestPage.tsx` performs, so every
 * expectation below is the app's own answer to the same question
 * rather than a second implementation of it.
 *
 * @returns The rows and the vocabularies the filters offer.
 */
async function seededDigest(): Promise<SeededDigest> {
  const [findings, documents, entities, sources, vocabulary, summaries]
    = await Promise.all([
      fetchFindings(DEFAULT_DOMAIN_SLUG),
      fetchDocuments(DEFAULT_DOMAIN_SLUG),
      fetchEntities(DEFAULT_DOMAIN_SLUG),
      fetchSources(DEFAULT_DOMAIN_SLUG),
      fetchVerdicts(DEFAULT_DOMAIN_SLUG),
      fetchCategorySummaries(DEFAULT_DOMAIN_SLUG),
    ]);

  const rows = buildDigestRows({ findings, documents, entities, sources });

  // A digest that lost its rows would leave every loop below
  // asserting nothing, and passing.
  expect(rows.length).toBeGreaterThan(0);

  return { rows, vocabulary, categories: summaries };
}

/** An id past every seeded finding, so the address answers to none. */
function missingFindingId(digest: SeededDigest): number {
  return Math.max(...digest.rows.map((row) => row.id)) + 1;
}

test.describe('a finding id no fixture carries', () => {
  test('reports the rejected read inside the modal', async ({ page }) => {
    // Arrange — an id past every seeded one, so a fixture that grows
    // cannot quietly make this address a real finding.
    const digest = await seededDigest();
    const path = detailPath(SINGLE_DOMAIN_BASE, missingFindingId(digest));

    // Act
    await page.goto(path);

    // Assert — the modal opened at the address asked for and stated
    // what it could not read. Asserted with an auto-retrying matcher
    // because a rejected read does not settle on a microtask: the
    // cache retries once, and until it gives up the body is an
    // `aria-hidden` skeleton that is neither state.
    const dialog = page.getByRole('dialog');

    await expect(
      dialog.getByText(REJECTED_FINDING_TITLE, { exact: true }),
    ).toBeVisible();
    await expect(page).toHaveURL(path);

    // The refusal STANDS IN for the two columns rather than sitting
    // beside them: a rail reading `Unscored` over an empty payload,
    // for a finding nothing answers to, would read as a record.
    await expect(
      dialog.getByRole('region', { name: DETAIL_RAIL_NAME }),
    ).toHaveCount(0);
    await expect(
      dialog.getByRole('button', { name: DETAIL_VERDICT_LABEL }),
    ).toHaveCount(0);
  });

  test('leaves the surface standing behind it', async ({ page }) => {
    // Arrange
    const digest = await seededDigest();

    // Act — open the refusal, then close it. The table cannot be read
    // while the dialog is up: an open Radix dialog sets `aria-hidden`
    // on the app root, and the content landmark goes with it.
    await page.goto(
      detailPath(SINGLE_DOMAIN_BASE, missingFindingId(digest)),
    );

    const dialog = page.getByRole('dialog');

    await expect(
      dialog.getByText(REJECTED_FINDING_TITLE, { exact: true }),
    ).toBeVisible();
    await dialog.getByRole('button', { name: CLOSE_NAME }).click();

    // Assert — the close landed back on the list, with every row
    // where it was. A rejected read that had taken the shell down
    // with it fails here rather than above.
    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(listPath(SINGLE_DOMAIN_BASE));

    const main = page.getByRole('main');

    await expect
      .poll(() => visibleFindings(main))
      .toEqual(digest.rows.map(findingTitle));

    // And it is the table standing, not one of the empty states that
    // would also have left the shell up.
    await expect(
      main.getByText(REJECTED_DOMAIN_TITLE, { exact: true }),
    ).toHaveCount(0);
    await expect(
      main.getByText(EMPTY_DOMAIN_TITLE, { exact: true }),
    ).toHaveCount(0);
  });
});

/** A pair of filters that each keep rows and together keep none. */
interface EmptyPair {
  /** A verdict the ladder offers, and some row carries. */
  readonly verdict: string;
  /** A category key the taxonomy offers, and some row carries. */
  readonly categoryKey: string;
}

/**
 * A combination the seeded rows cannot satisfy, derived not chosen.
 *
 * Both halves have to be non-empty ALONE, or the empty state is the
 * answer to one filter rather than to the combination — a weaker
 * claim wearing the same green.
 *
 * @param digest - The seeded domain's digest.
 * @returns The first such pair.
 * @throws If the fixtures carry none.
 */
function pickEmptyPair(digest: SeededDigest): EmptyPair {
  for (const verdict of digest.vocabulary) {
    const byVerdict = filterBySelect(
      digest.rows,
      verdict,
      (row) => row.verdict,
    );

    for (const { category } of digest.categories) {
      const categoryKey = category.key;
      const byCategory = filterBySelect(
        digest.rows,
        categoryKey,
        (row) => row.categoryKey,
      );
      const both = filterBySelect(
        byVerdict,
        categoryKey,
        (row) => row.categoryKey,
      );

      if (byVerdict.length > 0 && byCategory.length > 0
        && both.length === 0) {
        return { verdict, categoryKey };
      }
    }
  }

  throw new Error('No verdict and category pair the seeded rows miss.');
}

test.describe('a filter combination matching nothing', () => {
  test('renders the narrowed empty state', async ({ page }) => {
    // Arrange
    const digest = await seededDigest();
    const pair = pickEmptyPair(digest);
    const address = filteredPath(SINGLE_DOMAIN_BASE, {
      [VERDICT_PARAM]: pair.verdict,
      [CATEGORY_PARAM]: pair.categoryKey,
    });

    // Act
    await page.goto(address);

    const main = page.getByRole('main');

    // Assert — the sentence for a narrowed list, which is a different
    // one from the sentence for a domain that has read nothing. The
    // absence matters as much as the presence: an operator told the
    // domain is empty would stop filtering rather than widen.
    await expect(
      main.getByText(FILTERED_EMPTY_TITLE, { exact: true }),
    ).toBeVisible();
    await expect(
      main.getByText(EMPTY_DOMAIN_TITLE, { exact: true }),
    ).toHaveCount(0);
    await expect.poll(() => visibleFindings(main)).toEqual([]);

    // The head still says what the rows are a subset OF, which is the
    // reading that tells an operator the rows they cannot see exist.
    await expect(
      main.getByText(rowCountLabel(0, digest.rows.length), { exact: true }),
    ).toBeVisible();

    // The control, in the same case and varying exactly the axis
    // under test: an empty table is also what a surface that had
    // stopped reading would draw. Each half of the pair ALONE has to
    // leave rows on the screen.
    await page.goto(
      filteredPath(SINGLE_DOMAIN_BASE, { [VERDICT_PARAM]: pair.verdict }),
    );
    await expect.poll(() => visibleFindings(main)).not.toEqual([]);

    await page.goto(
      filteredPath(SINGLE_DOMAIN_BASE, {
        [CATEGORY_PARAM]: pair.categoryKey,
      }),
    );
    await expect.poll(() => visibleFindings(main)).not.toEqual([]);
  });
});

test.describe('the digest table', () => {
  test('renders one row per finding, counted', async ({ page }) => {
    // Arrange
    const digest = await seededDigest();

    // Act
    await page.goto(listPath(SINGLE_DOMAIN_BASE));

    const main = page.getByRole('main');

    // Assert — every finding, once, in the order `listFindings`
    // answered them. Ordering is part of what a digest means, so this
    // is a sequence rather than a membership check.
    await expect
      .poll(() => visibleFindings(main))
      .toEqual(digest.rows.map(findingTitle));

    await expect(
      main.getByText(
        rowCountLabel(digest.rows.length, digest.rows.length),
        { exact: true },
      ),
    ).toBeVisible();

    // Then the cells, per row. A row's accessible name runs all of
    // them together, so it says nothing about WHICH cell a value
    // landed in — the leading cell and the verdict cell each get an
    // assertion of their own. The `Found` cell gets none: its text is
    // a clock time for every same-day stamp.
    for (const row of digest.rows) {
      const title = findingTitle(row);
      const lead = findingRow(main, title)
        .getByRole('cell')
        .first();
      const tags = tagLine(row.tags);

      await expect(lead).toContainText(title);

      if (tags !== undefined) {
        await expect(lead).toContainText(tags);
      }

      await expect(verdictCell(main, title)).toHaveText(
        row.verdict ?? UNRATED_VERDICT_LABEL,
      );
    }
  });
});

/** What one filter is driven with, and what it should leave behind. */
interface FilterChoice {
  /** What the URL should carry once the control has been driven. */
  readonly value: string;
  /** What the control reads once it holds that value. */
  readonly label: string;
  /** The rows the surface should be left with, in order. */
  readonly rows: readonly DigestRow[];
}

/** One filter control, and what a case drives it with. */
interface FilterControl {
  /** Names the claim, so a failing title says which control it is. */
  readonly what: string;
  /** The search parameter it owns. */
  readonly param: string;
  /**
   * Which select this is, or undefined for the search box.
   *
   * The two shapes are genuinely different controls rather than one
   * with a flag: a select is opened and an option chosen, a text box
   * is filled, and what each holds is read back differently.
   */
  readonly select?: string;
  /** What to drive it with, derived from the seeded rows. */
  readonly pick: (digest: SeededDigest) => FilterChoice;
}

/**
 * A needle matching exactly one row, derived from what it says.
 *
 * Taken word by word out of the rows' own titles and checked through
 * `filterByQuery`, the very pass the page runs, rather than guessed at
 * from which fixture word looks distinctive.
 *
 * @param digest - The seeded domain's digest.
 * @returns The needle and the single row it leaves.
 * @throws If no word in any title matches exactly one row.
 */
function pickQuery(digest: SeededDigest): FilterChoice {
  for (const row of digest.rows) {
    for (const word of findingTitle(row).split(/[^A-Za-z]+/u)) {
      if (word.length < SHORTEST_NEEDLE) {
        continue;
      }

      const left = filterByQuery(digest.rows, word, DIGEST_QUERY_FIELDS);

      if (left.length === 1) {
        return { value: word, label: word, rows: left };
      }
    }
  }

  throw new Error('No word in the seeded titles matches one row.');
}

/**
 * A verdict some rows carry, but not all of them.
 *
 * Both bounds are vacuity guards, and every picker below repeats
 * them. A choice leaving EVERY row is indistinguishable from a
 * control wired to nothing, and one leaving NO row is
 * indistinguishable from the empty state the case above owns.
 *
 * @param digest - The seeded domain's digest.
 * @returns The verdict and the rows it leaves.
 * @throws If no verdict narrows the seeded rows to a subset.
 */
function pickVerdict(digest: SeededDigest): FilterChoice {
  for (const verdict of digest.vocabulary) {
    const left = filterBySelect(digest.rows, verdict, (row) => row.verdict);

    if (left.length > 0 && left.length < digest.rows.length) {
      return { value: verdict, label: verdict, rows: left };
    }
  }

  throw new Error('No verdict narrows the seeded rows to a subset.');
}

/**
 * A category some rows carry, but not all of them.
 *
 * @param digest - The seeded domain's digest.
 * @returns The category and the rows it leaves.
 * @throws If no category narrows the seeded rows to a subset.
 */
function pickCategory(digest: SeededDigest): FilterChoice {
  for (const { category } of digest.categories) {
    const left = filterBySelect(
      digest.rows,
      category.key,
      (row) => row.categoryKey,
    );

    if (left.length > 0 && left.length < digest.rows.length) {
      return { value: category.key, label: category.name, rows: left };
    }
  }

  throw new Error('No category narrows the seeded rows to a subset.');
}

/**
 * A window some rows fall inside, but not all of them.
 *
 * Measured against `FIXTURE_NOW`, the clock the page itself filters
 * against — the two disagreeing is exactly what `timeWindow.ts` pins
 * that constant to avoid.
 *
 * @param digest - The seeded domain's digest.
 * @returns The window and the rows it leaves.
 * @throws If no window narrows the seeded rows to a subset.
 */
function pickWindow(digest: SeededDigest): FilterChoice {
  for (const window of TIME_WINDOWS) {
    const left = digest.rows.filter(
      (row) => withinTimeWindow(row.createdAt, window.value, FIXTURE_NOW),
    );

    if (left.length > 0 && left.length < digest.rows.length) {
      return { value: window.value, label: window.label, rows: left };
    }
  }

  throw new Error('No time window narrows the seeded rows to a subset.');
}

/** The four controls, each owning one search parameter. */
const FILTER_CONTROLS: readonly FilterControl[] = [
  { what: 'the search box', param: QUERY_PARAM, pick: pickQuery },
  {
    what: 'the verdict select',
    param: VERDICT_PARAM,
    select: VERDICT_FILTER_LABEL,
    pick: pickVerdict,
  },
  {
    what: 'the category select',
    param: CATEGORY_PARAM,
    select: CATEGORY_FILTER_LABEL,
    pick: pickCategory,
  },
  {
    what: 'the time window select',
    param: WINDOW_PARAM,
    select: WINDOW_FILTER_LABEL,
    pick: pickWindow,
  },
];

/**
 * Operate one filter control.
 *
 * @param page - The page the surface is open on.
 * @param control - Which control.
 * @param choice - What to leave it holding.
 */
async function driveFilter(
  page: Page,
  control: FilterControl,
  choice: FilterChoice,
): Promise<void> {
  if (control.select === undefined) {
    await searchBox(page).fill(choice.value);

    return;
  }

  await chooseFilterOption(page, control.select, choice.label);
}

/**
 * Read back what one filter control is holding.
 *
 * A separate claim from the rows: a surface filtering off the URL
 * while drawing an unset control satisfies the row reading and leaves
 * an operator unable to see what is narrowing their list.
 *
 * @param page - The page the surface is open on.
 * @param control - Which control.
 * @param choice - What it should be holding.
 */
async function confirmFilter(
  page: Page,
  control: FilterControl,
  choice: FilterChoice,
): Promise<void> {
  if (control.select === undefined) {
    await expect(searchBox(page)).toHaveValue(choice.value);

    return;
  }

  await expect(filterTrigger(page, control.select))
    .toContainText(choice.label);
}

test.describe('each filter', () => {
  for (const control of FILTER_CONTROLS) {
    test(
      `writes ${control.what} to the URL, and a reload keeps it`,
      async ({ page }) => {
        // Arrange
        const digest = await seededDigest();
        const choice = control.pick(digest);
        const expected = choice.rows.map(findingTitle);
        const address = filteredPath(SINGLE_DOMAIN_BASE, {
          [control.param]: choice.value,
        });

        await page.goto(listPath(SINGLE_DOMAIN_BASE));

        const main = page.getByRole('main');

        await expect
          .poll(() => visibleFindings(main))
          .toEqual(digest.rows.map(findingTitle));

        // Act
        await driveFilter(page, control, choice);

        // Assert — the URL IS the state, so the address carries the
        // choice and the table carries what the choice leaves.
        await expect(page).toHaveURL(address);
        await expect.poll(() => visibleFindings(main)).toEqual(expected);

        // Act again. A reload is a fresh document: nothing the page
        // held survives it, so what comes back has to have been read
        // out of the address.
        await page.reload();

        // Assert
        await expect(page).toHaveURL(address);
        await expect.poll(() => visibleFindings(main)).toEqual(expected);
        await confirmFilter(page, control, choice);
      },
    );
  }
});

/** What the row-menu case is driven with. */
interface Ruling {
  /** The row whose menu is opened. */
  readonly row: DigestRow;
  /** Every item the menu should offer, in order. */
  readonly items: readonly string[];
  /** The item chosen. */
  readonly chosen: string;
  /** The verdict that item records. */
  readonly verdict: string;
}

/**
 * A ruling the seeded rows can carry, derived not chosen.
 *
 * The first row, and the first offered value that is not the unruled
 * one, so the case is real whichever way the fixtures are edited. The
 * offered set is `verdictChoices` minus the value the row already
 * holds — exactly what `DigestPage.tsx` builds its menu from, an item
 * writing back what is already there being a save with nothing to
 * save.
 *
 * @param digest - The seeded domain's digest.
 * @returns Everything a ruling case needs.
 * @throws If the ladder offers the first row nothing to change to.
 */
function pickRuling(digest: SeededDigest): Ruling {
  const row = first(digest.rows, 'digest row');
  const held = verdictSelectValue(row.verdict);
  const offered = verdictChoices(digest.vocabulary, row.verdict)
    .filter((choice) => choice.value !== held)
    .map((choice) => choice.value);
  const verdict = first(
    offered.filter((value) => value !== NO_VERDICT_VALUE),
    'offered ruling other than the unruled one',
  );

  return {
    row,
    items: [
      ...offered.map((value) => (value === NO_VERDICT_VALUE
        ? CLEAR_RULING_ITEM
        : `${RULING_ITEM_PREFIX}${value}`)),
      OPEN_ITEM,
      SEND_ITEM,
    ],
    chosen: `${RULING_ITEM_PREFIX}${verdict}`,
    verdict,
  };
}

test.describe('a row action menu', () => {
  test('opens as a menu and records a ruling', async ({ page }) => {
    // Arrange
    const digest = await seededDigest();
    const ruling = pickRuling(digest);
    const title = findingTitle(ruling.row);

    await page.goto(listPath(SINGLE_DOMAIN_BASE));

    const main = page.getByRole('main');

    await expect
      .poll(() => visibleFindings(main))
      .toEqual(digest.rows.map(findingTitle));

    // Act — the trailing column's own control. The panel is a portal,
    // so it is addressed at page scope rather than under the row.
    await rowMenuTrigger(main, title).click();

    const menu = page.getByRole('menu');

    // Assert — it really is a menu, and it offers what the surface
    // says it offers: the rulings this row does not already carry,
    // then the two items that are not rulings at all.
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('menuitem')).toHaveText([...ruling.items]);

    // Act
    await menu.getByRole('menuitem', { name: ruling.chosen }).click();

    // Assert — the ruling reached the cell that draws it, which is
    // the whole of the round trip: the mutation records into the
    // draft store, the invalidation re-reads, and `fetchFindings`
    // composes the overlay on its way back.
    await expect(verdictCell(main, title)).toHaveText(ruling.verdict);

    // And nothing else moved. A write that had replaced the list
    // rather than one row fails here rather than above.
    await expect
      .poll(() => visibleFindings(main))
      .toEqual(digest.rows.map(findingTitle));
  });
});

test.describe('opening a row', () => {
  for (const { label, base } of BASES) {
    test(
      `opens the detail at the bare id sub-route under the ${label}`,
      async ({ page }) => {
        // Arrange
        const digest = await seededDigest();
        const row = first(digest.rows, 'digest row');
        const title = findingTitle(row);

        await page.goto(listPath(base));

        const main = page.getByRole('main');

        await expect
          .poll(() => visibleFindings(main))
          .toEqual(digest.rows.map(findingTitle));

        // Act — the row's own open gesture. `Table` declares no row
        // click of its own and the page passes none, so what a row
        // offers is the `Open` item in the trailing column's menu.
        await rowMenuTrigger(main, title).click();
        await page
          .getByRole('menu')
          .getByRole('menuitem', { name: OPEN_ITEM })
          .click();

        // Assert — the BARE `:entityId` address under THIS base, with
        // no trailing segment: the digest is registered at the
        // address its routed detail page will answer at, so growing
        // this modal into a page moves no link an operator has.
        await expect(page).toHaveURL(detailPath(base, row.id));

        const dialog = page.getByRole('dialog');

        await expect(
          dialog.getByRole('heading', { name: title, exact: true }),
        ).toBeVisible();

        // And it opened on the record rather than on a read state:
        // the rail is a named region, and the one control is there.
        await expect(
          dialog.getByRole('region', { name: DETAIL_RAIL_NAME }),
        ).toBeVisible();
        await expect(
          dialog.getByRole('button', { name: DETAIL_VERDICT_LABEL }),
        ).toBeVisible();

        // Closing pops the whole matched route, which is what puts
        // both bases back on their own list.
        await dialog.getByRole('button', { name: CLOSE_NAME }).click();

        await expect(dialog).toHaveCount(0);
        await expect(page).toHaveURL(listPath(base));
      },
    );
  }
});
