import type { CategorySummary } from '../../src/data/lexicon';
import type { Term } from '../../src/data/types';
import type { TermPayload } from '../../src/pages/lexicon/schema';
import type { Locator, Page } from '@playwright/test';

import { expect, test } from '@playwright/test';

import {
  describeSchemaIssues,
  formatJsonDraft,
  parseJsonDraft,
} from '../../src/components/jsonDraft';
import { fetchCategorySummaries, fetchTerms } from '../../src/data/api';
import { DEFAULT_DOMAIN_SLUG } from '../../src/data/domains';
import { POLARITY_FACETS, termNoun } from '../../src/pages/lexicon/cards';
import { termPayloadSchema } from '../../src/pages/lexicon/schema';
import {
  describeTermBlockReading,
  parseTermBlock,
  splitTermBuckets,
  toTermPayload,
  withTermPolarity,
} from '../../src/pages/lexicon/terms';
import {
  domainBase,
  SINGLE_DOMAIN_BASE,
  withBase,
} from '../../src/routes/paths';

// Every expected bucket, sentence and count below is read out of the
// app's own pure modules, so this file spells no fixture pattern, no
// refusal sentence and no polarity of its own. What it does spell is
// ACCESSIBLE NAMES: `LexiconEditorModal.tsx` builds them from a
// template and is a `.tsx`, which nothing here may import — a spec
// that touches `document` at import time never loads. Each one is
// named as a constant with the control it addresses.
//
// What this adds over the unit suites — `pages/lexicon/terms.test.ts`
// already drives the split, the movers and the paste parse, and
// `components/jsonDraft.test.ts` the refusal sentences — is the
// ASSEMBLY. Four things only a browser can answer: that a card is
// wired to the sub-route at all, that the polarity control really
// performs the move its module describes, that a refusal reaches the
// screen instead of being swallowed on the way, and that a save is
// visible to the read that shows it.
//
// ## The modal hides the surface from every role locator
//
// `Modal` is a Radix dialog, and an open one sets `aria-hidden` on
// the app root. Measured: with the editor open `page.getByRole(
// 'main')` resolves to ZERO elements, and so does every locator
// scoped under it — a CSS locator included, since the landmark it
// hangs off is the thing that vanished. So no assertion about the
// grid, the rail or the topbar may be made while an editor is up;
// each case reads the surface before it opens one or after it has
// closed it.
//
// ## Which base
//
// The single-domain base carries every case except the pair that
// drives the open gesture, which runs under both: the sub-route
// address is the one claim here that is base-dependent, the editor's
// close being relative. `navigation.spec.ts` and
// `domain-switch.spec.ts` own the rest of the two-base surface.

/** Which surface this is — the list path comes off the same table. */
const LEXICON_SURFACE_ID = 'lexicon';

/**
 * The segment the editor sub-route occupies under a category id.
 *
 * Spelled rather than imported: `routes/router.tsx` builds the pattern
 * and is a `.tsx` this file may not load, and `LexiconPage.tsx` keeps
 * its own copy private. The router's own unit suite is what holds the
 * two in step; here it is one literal, named once.
 */
const EDIT_SEGMENT = 'edit';

/**
 * What each row's polarity control is called, before its pattern.
 *
 * The control that answers WCAG 2.2 SC 2.5.7 for the cross-bucket
 * drag, and the one handle every case here reaches a term by: its
 * name carries the pattern, so it doubles as the row's identity.
 */
const POLARITY_CONTROL_PREFIX = 'Polarity of ';

/** What the disclosure holding the bulk-paste box is called. */
const PASTE_PANEL_NAME = 'Paste terms';

/** What the box inside that disclosure is called. */
const PASTE_FIELD_NAME = 'Seed lines';

/** What the button that reads the pasted block is called. */
const PASTE_ACTION_NAME = 'Add these terms';

/** What the fallback's box is called. */
const JSON_FIELD_NAME = 'Term payload';

/** What the segment that swaps to the fallback is called. */
const JSON_TAB_NAME = 'JSON';

/** The footer control that writes, addressed by name in every case. */
const SAVE_NAME = 'Save';

/** How the editor titles a category read that came back rejected. */
const REJECTED_TITLE = 'This category could not be read';

/**
 * Text no JSON parser can get past.
 *
 * Deliberately not built from a payload: this leg is about the step
 * BEFORE the schema, so what it holds has to fail `JSON.parse` rather
 * than merely fail a rule.
 */
const UNPARSEABLE_TEXT = '{ not json';

/**
 * A weight the schema refuses.
 *
 * Negative, because `pages/lexicon/schema.ts` declares weight a
 * magnitude whose direction the polarity carries — the one refusal
 * both the box and the per-term field agree on.
 */
const REFUSED_WEIGHT = -1;

/**
 * A block whose three lines are one acceptance and two refusals.
 *
 * The patterns are this file's own so they cannot collide with a
 * fixture term, which would be refused as a duplicate and quietly
 * change what the case is measuring. `parseTermBlock` is asked for
 * the split before anything is typed, so a collision reddens the
 * guard rather than the assertion it would have weakened.
 */
const PASTE_BLOCK = [
  'spec accepted term | 2 | positive',
  'this line carries no separator at all',
  'spec refused term | not a number | positive',
].join('\n');

/**
 * The first member, or a failure naming what was empty.
 *
 * Every case here derives its subject from the fixtures, and an empty
 * fixture list would otherwise leave a loop that asserts nothing and
 * passes. `noUncheckedIndexedAccess` makes the guard obligatory
 * anyway; this is what keeps it from being a non-null assertion.
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

/** The lexicon list path under a base. */
function listPath(base: string): string {
  return withBase(base, LEXICON_SURFACE_ID);
}

/** One category's editor path under a base. */
function editPath(base: string, categoryId: number): string {
  return `${listPath(base)}/${categoryId}/${EDIT_SEGMENT}`;
}

/**
 * One category's card, located from the heading that names it.
 *
 * `EntityCard` renders a `div` with no role and no landmark, so the
 * only stable way in is its heading — which IS a role, and IS the
 * card's name. Two steps up from there is the card root: the heading
 * sits in the header row, and the header row in the card. Stated once
 * here rather than at each call site, so that shape is one edit.
 *
 * @param main - The content landmark.
 * @param name - The category's name.
 * @returns The card root.
 */
function categoryCard(main: Locator, name: string): Locator {
  return main
    .getByRole('heading', { level: 2, name, exact: true })
    .locator('xpath=../..');
}

/**
 * One polarity bucket inside the open editor.
 *
 * A `section` with a heading, so it is a `region` whose accessible
 * name is the heading's text — the label AND the count under it. The
 * count moves with every gesture these cases make, so the name is
 * matched on its opening label alone. The facet labels are plain
 * words, which is what makes building a pattern out of one safe.
 *
 * @param dialog - The open editor.
 * @param label - The facet label, from `POLARITY_FACETS`.
 * @returns The bucket's region.
 */
function bucketRegion(dialog: Locator, label: string): Locator {
  return dialog.getByRole('region', { name: new RegExp(`^${label}\\b`) });
}

/**
 * Which patterns are drawn in which bucket, right now.
 *
 * Read off the polarity controls rather than off the row text: their
 * accessible names carry the pattern, so one role locator answers
 * both membership and order without this file knowing how a row is
 * marked up. A pattern drawn in two buckets is then two entries
 * rather than one, which a per-term visibility check could not see.
 *
 * @param dialog - The open editor.
 * @returns The patterns per polarity, in the order they are drawn.
 */
async function readBuckets(
  dialog: Locator,
): Promise<Record<string, readonly string[]>> {
  const rows = await Promise.all(
    POLARITY_FACETS.map(async (facet) => {
      const names = await bucketRegion(dialog, facet.label)
        .getByRole('button')
        .evaluateAll((nodes) => nodes.map(
          (node) => node.getAttribute('aria-label') ?? '',
        ));

      const patterns = names
        .filter((name) => name.startsWith(POLARITY_CONTROL_PREFIX))
        .map((name) => name.slice(POLARITY_CONTROL_PREFIX.length));

      return [facet.polarity, patterns] as const;
    }),
  );

  return Object.fromEntries(rows);
}

/**
 * The same reading, derived from a term list instead of from the DOM.
 *
 * Through `splitTermBuckets`, which is what the editor itself splits
 * with — so the expectation is the app's own answer to the same
 * question rather than a second implementation of it, and a bucket
 * that no term reaches is present and empty on both sides.
 *
 * @param terms - The vocabulary as it should stand.
 * @returns The patterns per polarity, in bucket order.
 */
function expectedBuckets(
  terms: readonly Term[],
): Record<string, readonly string[]> {
  return Object.fromEntries(
    splitTermBuckets(terms).map((bucket) => [
      bucket.polarity,
      bucket.terms.map((term) => term.pattern),
    ]),
  );
}

/**
 * The seeded domain's taxonomy, through the page's own accessor.
 *
 * @returns Its summaries, in seed order.
 * @throws If the fixture domain carries none.
 */
async function seededSummaries(): Promise<readonly CategorySummary[]> {
  const summaries = await fetchCategorySummaries(DEFAULT_DOMAIN_SLUG);

  // A taxonomy that lost its rows would leave every loop below
  // asserting nothing, and passing.
  expect(summaries.length).toBeGreaterThan(0);

  return summaries;
}

/** What one cross-bucket move case is driven with. */
interface Move {
  /** The category whose editor is opened. */
  readonly summary: CategorySummary;
  /** Its vocabulary as stored. */
  readonly terms: readonly Term[];
  /** The term the polarity control is asked to move. */
  readonly term: Term;
  /** What the control is asked to file it under. */
  readonly label: string;
  /** The vocabulary the move should leave behind. */
  readonly moved: readonly Term[];
}

/**
 * A cross-bucket move the fixtures can carry, derived not chosen.
 *
 * The first seeded category, its first term, and the first polarity
 * that is not the one the term already has — so the move is real
 * whichever way the fixtures are edited, and the expected result
 * comes from `withTermPolarity`, the very mover the control calls.
 *
 * @returns Everything a move case needs.
 */
async function pickMove(): Promise<Move> {
  const summary = first(await seededSummaries(), 'category summary');
  const terms = await fetchTerms(
    DEFAULT_DOMAIN_SLUG,
    summary.category.id,
  );
  const term = first(terms, 'term in the first category');
  const target = first(
    POLARITY_FACETS.filter((facet) => facet.polarity !== term.polarity),
    'polarity other than the first term\'s',
  );

  return {
    summary,
    terms,
    term,
    label: target.label,
    moved: withTermPolarity(terms, term.id, target.polarity),
  };
}

/**
 * File a term under another polarity, through the row's own control.
 *
 * The panel is addressed on the PAGE rather than inside the dialog:
 * `Select` is a Radix dropdown and renders its menu through a portal,
 * so it is a sibling of the modal and not a descendant.
 *
 * @param page - The page the editor is open on.
 * @param pattern - Which row's control to open.
 * @param label - The polarity label to choose.
 */
async function moveTerm(
  page: Page,
  pattern: string,
  label: string,
): Promise<void> {
  await page
    .getByRole('dialog')
    .getByRole('button', { name: `${POLARITY_CONTROL_PREFIX}${pattern}` })
    .click();

  await page
    .getByRole('menu')
    .getByRole('menuitemradio', { name: label })
    .click();
}

test.describe('a category id no fixture carries', () => {
  test('reports the rejected read inside the editor', async ({ page }) => {
    // Arrange — an id past every seeded one, so a fixture that grows
    // cannot quietly make this address a real category.
    const summaries = await seededSummaries();
    const missingId = Math.max(
      ...summaries.map((summary) => summary.category.id),
    ) + 1;
    const path = editPath(SINGLE_DOMAIN_BASE, missingId);

    // Act
    await page.goto(path);

    // Assert — the editor opened at the address asked for and stated
    // what it could not read. The read is refused rather than absent,
    // so this is the rejected body and not the loading one.
    const dialog = page.getByRole('dialog');

    await expect(
      dialog.getByText(REJECTED_TITLE, { exact: true }),
    ).toBeVisible();
    await expect(page).toHaveURL(path);

    // The refusal STANDS IN for the buckets rather than sitting
    // beside them: an editor drawing three empty lists over a
    // category nothing answers to would be an invitation to edit a
    // row that is not there.
    for (const facet of POLARITY_FACETS) {
      await expect(bucketRegion(dialog, facet.label)).toHaveCount(0);
    }

    // And nothing is offered to save, there being no draft at all.
    await expect(
      dialog.getByRole('button', { name: SAVE_NAME }),
    ).toBeDisabled();
  });

  test('leaves the surface standing behind it', async ({ page }) => {
    // Arrange
    const summaries = await seededSummaries();
    const missingId = Math.max(
      ...summaries.map((summary) => summary.category.id),
    ) + 1;

    // Act — open the refusal, then close it. The grid cannot be read
    // while the dialog is up: an open Radix dialog sets `aria-hidden`
    // on the app root, and the content landmark goes with it.
    await page.goto(editPath(SINGLE_DOMAIN_BASE, missingId));

    const dialog = page.getByRole('dialog');

    await expect(
      dialog.getByText(REJECTED_TITLE, { exact: true }),
    ).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();

    // Assert — the close landed back on the list, with every card
    // where it was. A rejected read that had taken the surface down
    // with it would fail here rather than above.
    await expect(page).toHaveURL(listPath(SINGLE_DOMAIN_BASE));

    const main = page.getByRole('main');

    for (const { category } of summaries) {
      await expect(categoryCard(main, category.name)).toBeVisible();
    }
  });
});

/** What one refusal the JSON fallback makes is driven with. */
interface JsonRefusal {
  /** Names the claim, so a failing title says which leg it is. */
  readonly what: string;
  /**
   * The text to type, and what the app's own modules say about it.
   *
   * Taken as a function of the stored payload so the schema leg can
   * refuse a real entry rather than an invented shape — the same
   * payload the box was seeded with, one member out of bounds.
   */
  readonly read: (payload: TermPayload) => JsonRefusalReading;
}

/** A refusal, as the box will draw it. */
interface JsonRefusalReading {
  /** What goes in the box. */
  readonly text: string;
  /** Every sentence the refusal produces, in order. */
  readonly sentences: readonly string[];
}

/**
 * The two ways the fallback refuses, and they are not one.
 *
 * `JsonEditor` parses and only then checks, so text that is not JSON
 * never meets the schema at all. Driving both is what says the
 * sentences an operator sees come from whichever step refused rather
 * than from a single catch-all.
 */
const JSON_REFUSALS: readonly JsonRefusal[] = [
  {
    what: 'text that is not JSON',
    read: () => {
      const parsed = parseJsonDraft(UNPARSEABLE_TEXT);

      if (parsed.ok) {
        throw new Error('The unparseable sample parsed.');
      }

      return { text: UNPARSEABLE_TEXT, sentences: parsed.sentences };
    },
  },
  {
    what: 'a payload the schema refuses',
    read: (payload) => {
      const entry = first(payload, 'entry in the stored payload');
      const value = [{ ...entry, weight: REFUSED_WEIGHT }];
      const checked = termPayloadSchema.safeParse(value);

      if (checked.success) {
        throw new Error('The refused sample satisfied the schema.');
      }

      return {
        text: formatJsonDraft(value),
        sentences: describeSchemaIssues(checked.error),
      };
    },
  },
];

test.describe('the JSON fallback', () => {
  for (const { what, read } of JSON_REFUSALS) {
    test(`states its sentences and refuses to save ${what}`, async ({
      page,
    }) => {
      // Arrange — the same payload the box seeds itself from, so the
      // refused sample below is this category's own row out of
      // bounds rather than an invented shape.
      const summary = first(await seededSummaries(), 'category summary');
      const terms = await fetchTerms(
        DEFAULT_DOMAIN_SLUG,
        summary.category.id,
      );
      const payload = toTermPayload(terms);
      const refusal = read(payload);

      // A refusal that produced no sentence would leave the loop
      // below asserting nothing.
      expect(refusal.sentences.length).toBeGreaterThan(0);

      await page.goto(editPath(SINGLE_DOMAIN_BASE, summary.category.id));

      const dialog = page.getByRole('dialog');
      const save = dialog.getByRole('button', { name: SAVE_NAME });

      await dialog.getByRole('tab', { name: JSON_TAB_NAME }).click();

      const box = dialog.getByRole('textbox', { name: JSON_FIELD_NAME });

      await expect(box).toBeVisible();

      // Act
      await box.fill(refusal.text);

      // Assert — every sentence the module produces is on the
      // screen, phrased exactly as it phrased it.
      for (const sentence of refusal.sentences) {
        await expect(
          dialog.getByText(sentence, { exact: true }),
        ).toBeVisible();
      }

      // And nothing reached the draft, so there is nothing to save.
      // Note what this does NOT claim: `JsonEditor` states that a
      // draft already dirtied by an ACCEPTED payload stays saveable
      // while the box holds text that no longer parses, the banner
      // being what stands between the two. This case opens on a
      // clean draft, which is the state where the refusal is the
      // whole of the answer.
      await expect(save).toBeDisabled();
      await expect(box).toHaveAttribute('aria-invalid', 'true');

      // The control, in the same case and varying exactly the axis
      // under test: a disabled Save is also what a box wired to
      // nothing would leave behind. A payload that parses AND
      // satisfies the schema has to reach the draft.
      const changed = payload.map((entry, index) => {
        if (index !== 0) {
          return entry;
        }

        return { ...entry, weight: entry.weight + 1 };
      });

      await box.fill(formatJsonDraft(changed));

      await expect(save).toBeEnabled();
    });
  }
});

test.describe('the bulk-paste panel', () => {
  test('reports every line it refused', async ({ page }) => {
    // Arrange — what the block means is read from the same parse the
    // panel runs, against the same stored terms it runs it against.
    const summary = first(await seededSummaries(), 'category summary');
    const terms = await fetchTerms(
      DEFAULT_DOMAIN_SLUG,
      summary.category.id,
    );
    const reading = parseTermBlock(PASTE_BLOCK, terms);

    // Both guards are about vacuity rather than about the app: a
    // block that was refused whole would leave the acceptance
    // unmeasured, and one accepted whole would leave the refusals
    // unmeasured. A pattern colliding with a fixture term reddens
    // the first of them.
    expect(reading.candidates.length).toBeGreaterThan(0);
    expect(reading.sentences.length).toBeGreaterThan(0);

    await page.goto(editPath(SINGLE_DOMAIN_BASE, summary.category.id));

    const dialog = page.getByRole('dialog');

    await dialog.getByRole('button', { name: PASTE_PANEL_NAME }).click();

    const box = dialog.getByRole('textbox', { name: PASTE_FIELD_NAME });

    await expect(box).toBeVisible();

    // Act
    await box.fill(PASTE_BLOCK);
    await dialog.getByRole('button', { name: PASTE_ACTION_NAME }).click();

    // Assert — what the parse did, in the panel's own sentence.
    await expect(
      dialog.getByText(describeTermBlockReading(reading), { exact: true }),
    ).toBeVisible();

    // Then a sentence per refused line. This is the whole of "rather
    // than silently dropped": a line the parse would not take is
    // named on the screen, with the rule it broke.
    for (const sentence of reading.sentences) {
      await expect(
        dialog.getByText(sentence, { exact: true }),
      ).toBeVisible();
    }

    // And the accepted lines arrived as rows, while the refused ones
    // did not. Asserted as the WHOLE bucket membership rather than
    // per candidate, so a refused line that had slipped through
    // under some other polarity is an extra entry here rather than a
    // row nobody looked for.
    const withCandidates = [
      ...terms,
      ...reading.candidates.map((candidate, index) => ({
        // The id the merge mints is this file's business only in
        // that a row needs one; the pattern is what is asserted.
        id: -1 - index,
        categoryId: summary.category.id,
        pattern: candidate.pattern,
        weight: candidate.weight,
        polarity: candidate.polarity,
        notes: candidate.notes,
      })),
    ];

    await expect
      .poll(() => readBuckets(dialog))
      .toEqual(expectedBuckets(withCandidates));
  });
});

/** The two bases the open gesture is driven under. */
const BASES = [
  { label: 'single-domain base', base: SINGLE_DOMAIN_BASE },
  { label: 'domain base', base: domainBase(DEFAULT_DOMAIN_SLUG) },
] as const;

test.describe('the lexicon grid', () => {
  test('renders one card per category, counted', async ({ page }) => {
    // Arrange
    const summaries = await seededSummaries();

    // Act
    await page.goto(listPath(SINGLE_DOMAIN_BASE));

    // Assert — one card per summary and no more, so a category
    // drawn twice fails here rather than passing a per-name check.
    const main = page.getByRole('main');

    await expect(main.getByRole('heading', { level: 2 })).toHaveCount(
      summaries.length,
    );

    // Each card carries both readings of its vocabulary: how much of
    // it there is, and which way it points. Read through
    // `useInnerText`, because `textContent` runs the label and the
    // figure together with no separator between them.
    for (const summary of summaries) {
      const card = categoryCard(main, summary.category.name);
      const split = POLARITY_FACETS
        .map((facet) => `${facet.label} ${summary.polarity[facet.polarity]}`)
        .join(' ');

      await expect(card).toContainText(
        `${summary.termCount} ${termNoun(summary.termCount)}`,
        { useInnerText: true },
      );
      await expect(card).toContainText(split, { useInnerText: true });
    }
  });

  for (const { label, base } of BASES) {
    test(
      `opens the editor at the edit sub-route under the ${label}`,
      async ({ page }) => {
        // Arrange
        const summary = first(await seededSummaries(), 'category summary');
        const { category } = summary;

        await page.goto(listPath(base));

        const main = page.getByRole('main');

        // Act — the card's own open gesture, which `EntityCard`
        // renders as the title button with its hit area stretched
        // over the card.
        await main
          .getByRole('button', { name: category.name, exact: true })
          .click();

        // Assert — the address the sub-route declares under THIS
        // base, and the editor really open on that category.
        await expect(page).toHaveURL(editPath(base, category.id));

        const dialog = page.getByRole('dialog');

        await expect(
          dialog.getByRole('heading', { name: category.name, exact: true }),
        ).toBeVisible();
      },
    );
  }
});

test.describe('a polarity change', () => {
  test('moves the term between buckets', async ({ page }) => {
    // Arrange
    const move = await pickMove();

    await page.goto(
      editPath(SINGLE_DOMAIN_BASE, move.summary.category.id),
    );

    const dialog = page.getByRole('dialog');

    await expect
      .poll(() => readBuckets(dialog))
      .toEqual(expectedBuckets(move.terms));

    // Act — the pointer-free equivalent of dragging the row into the
    // other list, which `pages/lexicon/terms.ts` states is the same
    // call. Nothing here drags: a drop and this are one operation,
    // and this is the one a keyboard can reach.
    await moveTerm(page, move.term.pattern, move.label);

    // Assert — the whole membership, against what the app's own
    // mover says it should be.
    await expect
      .poll(() => readBuckets(dialog))
      .toEqual(expectedBuckets(move.moved));

    // And the footer now has something to report, which is what
    // says the move reached the DRAFT rather than only the drawing.
    await expect(
      dialog.getByRole('button', { name: SAVE_NAME }),
    ).toBeEnabled();
  });

  test('survives a save, which the editor reopens on', async ({ page }) => {
    // Arrange
    const move = await pickMove();
    const listAddress = listPath(SINGLE_DOMAIN_BASE);

    await page.goto(listAddress);

    const main = page.getByRole('main');
    const card = categoryCard(main, move.summary.category.name);

    // What the grid says before anything is edited, read off the
    // rendered card rather than off an accessor — it is the same
    // reading the assertion after the save is made against.
    const gridBefore = await card.innerText();

    // Act
    await main
      .getByRole('button', { name: move.summary.category.name, exact: true })
      .click();
    await moveTerm(page, move.term.pattern, move.label);

    const dialog = page.getByRole('dialog');

    await dialog.getByRole('button', { name: SAVE_NAME }).click();

    // Assert — a save closes this editor, which is this surface's
    // own choice and not the shared frame's: `EditorModal` hands its
    // close to the handler, and the lexicon takes it.
    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(listAddress);

    // The save was RECORDED, not merely dismissed. Reopening reads
    // through `useTerms`, which composes the draft overlay, so the
    // moved term comes back in its new bucket with nothing left
    // unsaved. This is the control for the narrowing asserted below
    // — without it, "the grid did not move" would pass just as well
    // against a save that wrote nothing at all.
    await main
      .getByRole('button', { name: move.summary.category.name, exact: true })
      .click();

    await expect
      .poll(() => readBuckets(dialog))
      .toEqual(expectedBuckets(move.moved));
    await expect(
      dialog.getByRole('button', { name: SAVE_NAME }),
    ).toBeDisabled();

    // And the card behind it still counts the STORED split, which is
    // the narrowing `data/api.ts` states in full and `data/hooks.ts`
    // repeats: `fetchCategorySummaries` composes no draft overlay,
    // because `summarizeCategories` builds its per-category literal
    // inside its own body and an overlay at the seam would have to
    // rebuild it. The invalidation fires and the read re-answers the
    // same card. Pinned rather than left implied, so the day that
    // overlay lands this case says so.
    await dialog.getByRole('button', { name: 'Cancel' }).click();

    await expect(dialog).toHaveCount(0);
    await expect.poll(() => card.innerText()).toBe(gridBefore);
  });

  test('is gone after a reload', async ({ page }) => {
    // Arrange — the same save, since a store that never held the
    // edit would pass a reset check for the wrong reason.
    const move = await pickMove();
    const openCard = page
      .getByRole('main')
      .getByRole('button', { name: move.summary.category.name, exact: true });

    await page.goto(listPath(SINGLE_DOMAIN_BASE));
    await openCard.click();

    const dialog = page.getByRole('dialog');

    await moveTerm(page, move.term.pattern, move.label);
    await dialog.getByRole('button', { name: SAVE_NAME }).click();
    await expect(dialog).toHaveCount(0);

    // Reopened by CLICK and never by `page.goto`: a goto is a fresh
    // document, which is the very reset this case is about to make.
    // Reaching the editor that way would leave the assertion below
    // passing over a store that was cleared a step early.
    await openCard.click();

    await expect
      .poll(() => readBuckets(dialog))
      .toEqual(expectedBuckets(move.moved));

    // Act — a reload, which is the whole of the gesture: the draft
    // store is module-scoped state in the TAB, so nothing outlives
    // the document that held it.
    await page.reload();

    // Assert — the vocabulary is the fixture's again. That is the
    // honest scope of every save on this surface today, and it is
    // what the fixture seam is: `data/drafts.ts` is the stand-in for
    // server state, and it is deleted with the fixture modules on
    // the day the seam points at HTTP.
    await expect
      .poll(() => readBuckets(dialog))
      .toEqual(expectedBuckets(move.terms));
  });
});
