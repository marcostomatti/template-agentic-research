import type { CategorySummary } from '../../src/data/lexicon';
import type { ListFieldDef } from '../../src/dynamic-form/fieldDef';
import type {
  TermPayload,
  TermPayloadEntry,
} from '../../src/pages/lexicon/schema';
import type { Locator, Page } from '@playwright/test';

import { expect, test } from '@playwright/test';

import { describeSchemaIssues } from '../../src/components/jsonDraft';
import { fetchCategorySummaries, fetchTerms } from '../../src/data/api';
import { DEFAULT_DOMAIN_SLUG } from '../../src/data/domains';
import { readStringField } from '../../src/dynamic-form/readers';
import { buildFormTree, treeNavNodes } from '../../src/dynamic-form/tree';
import { POLARITY_FACETS } from '../../src/pages/lexicon/cards';
import { fieldDefsForTermPayload } from '../../src/pages/lexicon/fieldDefs';
import { termPayloadSchema } from '../../src/pages/lexicon/schema';
import { toTermPayload } from '../../src/pages/lexicon/terms';
import { SINGLE_DOMAIN_BASE, withBase } from '../../src/routes/paths';

// What the fields presentation REFUSES, and what it does about it.
//
// `dynamic-form/readers.test.ts` already drives every reader's own
// refusal and `components/jsonDraft.test.ts` the sentences a schema
// refusal produces, so neither is restated here. What only a browser
// can answer is the ASSEMBLY: that an edit the schema will not take
// reaches the screen as a sentence naming the member, that it leaves
// the footer shut while it stands, that the sentence retires once the
// member reads again, and that an address the presentation cannot be
// reached at leaves the surface behind it standing.
//
// ## Both refusals here are the SCHEMA's, and that is the point
//
// The two members driven below are `string` typed, and
// `dynamic-form/readers.ts` accepts every text a `string` box can
// hold — an empty one included, which it answers `null` for. So
// neither edit is refused by the control it was typed into: both are
// applied to the payload, refused over the WHOLE candidate, and
// reported through the one banner `DynamicForm` builds from
// `describeSchemaIssues`. Each case reads the box's own invalid state
// while that banner is up, which is what keeps the two channels
// distinguishable instead of letting one stand for the other.
//
// A cleared `pattern` is the provider's stated decision made visible:
// an empty box writes `null` rather than `''`, so clearing a member
// the schema requires is a refusal naming it. An out-of-union
// `polarity` is the degradation `pages/lexicon/fieldDefs.ts` records:
// v1 carries no enumerated type, so the box takes any word and the
// save path is what says which words are real.
//
// ## What is derived, and what is spelled
//
// Every sentence comes from the app's own `describeSchemaIssues`, and
// every label an operator reads is derived — the boxes from the def
// list `fieldDefsForTermPayload` answers, the rows from the tree
// `buildFormTree` projects. A member renamed in one place therefore
// moves this file with it rather than leaving a locator matching
// nothing. What is SPELLED is the handful of names the surface owns
// outright: the segment, the footer's two controls and the two
// titles, each a constant beside the control it addresses.
//
// ## The modal hides the surface from every role locator
//
// `Modal` is a Radix dialog and an open one sets `aria-hidden` on the
// app root, so `page.getByRole('main')` resolves to ZERO elements
// while an editor is up and every locator scoped under it goes the
// same way. No assertion about the grid is made while a dialog
// stands, and the dialog itself is asserted visible before anything
// inside it is addressed.

/** Which surface this is — the list path comes off the same table. */
const LEXICON_SURFACE_ID = 'lexicon';

/**
 * The segment the editor sub-route occupies under a category id.
 *
 * Spelled rather than imported: `routes/router.tsx` builds the pattern
 * and is a `.tsx` this file may not load. The router's own unit suite
 * is what holds the two in step; here it is one literal, named once.
 */
const EDIT_SEGMENT = 'edit';

/** What the segment that swaps to the fields presentation is called. */
const FIELDS_TAB_NAME = 'Fields';

/** The footer control that writes, addressed by name in every case. */
const SAVE_NAME = 'Save';

/** The footer control that closes without writing. */
const CANCEL_NAME = 'Cancel';

/** How the editor titles a category read that came back rejected. */
const REJECTED_TITLE = 'This category could not be read';

/**
 * What the provider titles the banner over an edit it would not take.
 *
 * Retyped rather than imported, which is the rule this repo splits
 * user-visible text from structural spellings by: a case importing
 * the constant agrees with whatever it says, and a reworded title
 * would then travel to an operator with nothing reporting it.
 */
const REFUSED_TITLE = 'This cannot be saved';

/**
 * The app-wide settled-state handle.
 *
 * `@ar/ui`'s `Skeleton` is its only user and the editor draws one
 * while its term read is in flight. A stand-in is `aria-hidden`, so a
 * locator taken mid-load addresses a body that has not arrived and
 * reports the absence as a fault in the app.
 */
const SKELETON = '.animate-shimmer';

/** Which entry of the payload every refusal below is made in. */
const REFUSED_ENTRY_INDEX = 0;

/**
 * A polarity spelling the schema's enum does not carry.
 *
 * Asserted absent from `POLARITY_FACETS` in the Arrange rather than
 * assumed: a spelling that had quietly become real would make the
 * refusal case measure an acceptance and still pass its locators.
 */
const OUT_OF_UNION_POLARITY = 'sideways';

/**
 * A pattern that repairs a cleared one.
 *
 * This file's own, and asserted to collide with no stored term, so
 * the write it produces is a change the draft can only have taken
 * from this case.
 */
const REPAIRED_PATTERN = 'spec repaired pattern';

/** What the tree calls the payload and each entry under it. */
interface TreeLabels {
  /** The root node's label — the payload itself. */
  readonly root: string;
  /** One label per entry, in the order the tree draws them. */
  readonly entries: readonly string[];
}

/** What one refusal the fields presentation makes is driven with. */
interface FieldRefusal {
  /** Names the claim, so a failing title says which leg it is. */
  readonly what: string;
  /**
   * Which member's box is typed into.
   *
   * Also what the schema's sentence has to name, which is the whole
   * of "an operator is told where to go" — keyed by the payload's own
   * member type, so a member that drifts is a `check-types` failure
   * here rather than a locator that stops matching.
   */
  readonly member: keyof TermPayloadEntry;
  /** What goes in that box to be refused. */
  readonly typed: string;
  /**
   * The entry that edit produces, as THIS file states it.
   *
   * Written out rather than derived through `values.ts`, so the
   * candidate is an independent statement of what the app should do
   * with the text rather than a second run of the app's own
   * arithmetic. {@link readRefusal} crosses it against the box's
   * reader, which is what keeps the statement from being a guess.
   */
  readonly refused: (entry: TermPayloadEntry) => Record<string, unknown>;
  /** What goes in the box to make the member read again. */
  readonly repaired: (entry: TermPayloadEntry) => string;
}

/** What one refusal reads as, and what it produces. */
interface RefusalReading {
  /** What the box's own reader answers for the typed text. */
  readonly read: string | null;
  /** What this file says the entry carries at that member. */
  readonly written: unknown;
  /** Every sentence the schema's refusal produces, in order. */
  readonly sentences: readonly string[];
}

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
 * card's name. Two steps up from there is the card root.
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
 * The seeded domain's taxonomy, through the page's own accessor.
 *
 * @returns Its summaries, in seed order.
 * @throws If the fixture domain carries none.
 */
async function seededSummaries(): Promise<readonly CategorySummary[]> {
  const summaries = await fetchCategorySummaries(DEFAULT_DOMAIN_SLUG);

  // A taxonomy that lost its rows would leave every case below with
  // no address to open and no card to look for afterwards.
  expect(summaries.length).toBeGreaterThan(0);

  return summaries;
}

/**
 * The defs the fields presentation draws a term payload from.
 *
 * The reading the modal itself takes, so a shape v1 stopped being
 * able to express is a failure NAMING that rather than a case whose
 * every locator has silently moved to the JSON box.
 *
 * @returns The list def.
 * @throws If v1 cannot express the payload at all.
 */
function entryDefs(): ListFieldDef {
  const defs = fieldDefsForTermPayload();

  if (defs === null) {
    throw new Error('v1 cannot express the term payload.');
  }

  return defs;
}

/**
 * What one member's box is called, from the member it writes.
 *
 * The crossing `pages/lexicon/fieldDefs.ts` says only a runtime
 * reading can make: a def's `key` is a plain string, so the member a
 * box writes and the word above it are two facts and this is where
 * they are held together. It is also what keeps every locator below
 * addressing a member rather than a label somebody may reword.
 *
 * @param defs - The list def the presentation draws from.
 * @param member - The payload member whose box is wanted.
 * @returns The label that box carries.
 * @throws If the item is not an object, or draws no such member.
 */
function memberLabel(
  defs: ListFieldDef,
  member: keyof TermPayloadEntry,
): string {
  const { item } = defs;

  if (item.type !== 'object') {
    throw new Error('The entry def does not draw members.');
  }

  const field = item.fields.find((each) => each.key === member);

  if (field === undefined) {
    throw new Error(`No def draws the ${member} member.`);
  }

  return field.label;
}

/**
 * What the tree calls the payload and each entry under it.
 *
 * Through the projection the shell hands its tree, so a list item's
 * positional label is the app's own answer rather than a rule this
 * file re-implements — `dynamic-form/tree.ts` is where the numbering
 * lives and its own cases are what pin it.
 *
 * @param defs - The list def the presentation draws from.
 * @param payload - The payload the form opens on.
 * @returns The root's label and one label per entry.
 * @throws If the projection carries no root.
 */
function treeLabels(
  defs: ListFieldDef,
  payload: TermPayload,
): TreeLabels {
  const [root] = treeNavNodes(buildFormTree(defs, payload));

  if (root === undefined) {
    throw new Error('The projected tree carries no root node.');
  }

  return {
    root: root.label,
    entries: root.children.map((child) => child.label),
  };
}

/**
 * What typing a refusal's text into its box means.
 *
 * Two readings and a guard. The box's own reader answers what the
 * text becomes; this file's own statement answers what the entry then
 * carries; and the schema is asked what it makes of the whole
 * candidate. The caller holds the first two against each other, which
 * is what makes the sentences below a consequence of the typed text
 * rather than a guess beside it.
 *
 * @param payload - The payload the form opens on.
 * @param refusal - The leg being driven.
 * @returns The reader's answer, this file's answer, and the sentences.
 * @throws If the reader refused the text, or the schema accepted the
 * candidate — either leaves the case measuring something else.
 */
function readRefusal(
  payload: TermPayload,
  refusal: FieldRefusal,
): RefusalReading {
  const reading = readStringField(refusal.typed);

  if (!reading.ok) {
    throw new Error(`The box refused the sample: ${refusal.what}.`);
  }

  const entry = first(payload, 'entry in the stored payload');
  const written = refusal.refused(entry);
  const candidate = payload.map((held, index) => (
    index === REFUSED_ENTRY_INDEX
      ? written
      : held
  ));
  const checked = termPayloadSchema.safeParse(candidate);

  if (checked.success) {
    throw new Error(`The schema took the sample: ${refusal.what}.`);
  }

  return {
    read: reading.value,
    written: written[refusal.member],
    sentences: describeSchemaIssues(checked.error),
  };
}

/**
 * Wait for every loading stand-in on the page to have resolved.
 *
 * See {@link SKELETON}. A precondition rather than an assertion about
 * loading: the editor's own body is a shimmer until its term read
 * settles, and nothing inside it is addressable before then.
 *
 * @param page - The page an address has been opened on.
 */
async function expectSettled(page: Page): Promise<void> {
  await expect(page.locator(SKELETON)).toHaveCount(0);
}

/**
 * Open one category's editor and swap it to the fields presentation.
 *
 * @param page - The page to drive.
 * @param categoryId - Which category's editor to open.
 * @returns The open dialog.
 */
async function openFields(
  page: Page,
  categoryId: number,
): Promise<Locator> {
  await page.goto(editPath(SINGLE_DOMAIN_BASE, categoryId));

  const dialog = page.getByRole('dialog');

  // The dialog first, then the settled state, and only then anything
  // inside: a locator taken against a body that has not arrived burns
  // the whole test budget and reports the exhaustion against whatever
  // assertion comes next.
  await expect(dialog).toBeVisible();
  await expectSettled(page);
  await dialog.getByRole('tab', { name: FIELDS_TAB_NAME }).click();

  return dialog;
}

/**
 * The one mounted form, addressed by the node it is drawing.
 *
 * `NodeForm` names its group after that node, so the form, the tree's
 * selected row and the breadcrumb's last step all carry one word —
 * which is what lets a locator say WHICH node's members it is
 * reaching rather than trusting that only one form is up.
 *
 * @param dialog - The open editor.
 * @param label - The node's label.
 * @returns The form's group.
 */
function nodeForm(dialog: Locator, label: string): Locator {
  return dialog.getByRole('group', { name: label, exact: true });
}

/**
 * The two ways an edit reaches the schema and is turned back.
 *
 * Neither is refused by the box it was typed into — see the header on
 * why that is the design rather than a gap, and why both therefore
 * arrive in one banner.
 */
const FIELD_REFUSALS: readonly FieldRefusal[] = [
  {
    what: 'a cleared required member',
    member: 'pattern',
    typed: '',
    // The provider's stated decision: an empty box is `null` and
    // never `''`, so a required member becomes a refusal naming it
    // instead of two spellings of one empty state.
    refused: (entry) => ({ ...entry, pattern: null }),
    repaired: () => REPAIRED_PATTERN,
  },
  {
    what: 'an out-of-union polarity',
    member: 'polarity',
    typed: OUT_OF_UNION_POLARITY,
    refused: (entry) => ({
      ...entry,
      polarity: OUT_OF_UNION_POLARITY,
    }),
    // A polarity the entry does not already carry, so the repair is a
    // real change to the payload whichever way the fixtures are
    // edited — a write back to the stored value would leave the
    // footer's own reading ambiguous.
    repaired: (entry) => first(
      POLARITY_FACETS.filter((facet) => facet.polarity !== entry.polarity),
      'polarity other than the stored one',
    ).polarity,
  },
];

test.describe('the fields presentation', () => {
  for (const refusal of FIELD_REFUSALS) {
    test(
      `refuses ${refusal.what} and offers no save while it stands`,
      async ({ page }) => {
        // Arrange — the payload the form itself opens on, so what is
        // refused below is this category's own entry out of bounds
        // rather than an invented shape.
        const summary = first(await seededSummaries(), 'category summary');
        const terms = await fetchTerms(
          DEFAULT_DOMAIN_SLUG,
          summary.category.id,
        );

        // A category carrying no vocabulary draws no entry to drill
        // into, which would leave every locator below addressing
        // nothing.
        expect(terms.length).toBeGreaterThan(0);

        const payload = toTermPayload(terms);
        const entry = first(payload, 'entry in the stored payload');
        const defs = entryDefs();
        const labels = treeLabels(defs, payload);
        const entryLabel = first(labels.entries, 'entry in the tree');
        const boxLabel = memberLabel(defs, refusal.member);
        const reading = readRefusal(payload, refusal);
        const naming = reading.sentences.filter(
          (sentence) => sentence.includes(refusal.member),
        );

        // Four guards, every one of them about vacuity rather than
        // about the app. A refusal producing no sentence would leave
        // the loops below asserting nothing. A sentence naming no
        // member would leave an operator with nowhere to go, which is
        // the claim this file exists to make. The box's reader
        // answering something other than what this file put in the
        // candidate would make the sentences a coincidence. And a
        // repair the schema also refuses would make the retirement
        // below unmeasurable.
        expect(reading.sentences.length).toBeGreaterThan(0);
        expect(naming.length).toBeGreaterThan(0);
        expect(reading.written).toBe(reading.read);
        expect(
          POLARITY_FACETS.map((facet) => facet.polarity),
        ).not.toContain(OUT_OF_UNION_POLARITY);

        // Act — open the fields presentation. A member has a box only
        // inside an entry: the root node is the LIST, and its form
        // draws one drill-in row per entry rather than any value.
        const dialog = await openFields(page, summary.category.id);
        const save = dialog.getByRole('button', { name: SAVE_NAME });

        // Nothing has been edited, so the footer offers no write. On
        // its own that is also what a form wired to nothing would
        // leave behind; the repair at the end of this case is what
        // separates the two.
        await expect(save).toBeDisabled();

        await nodeForm(dialog, labels.root)
          .getByRole('button', { name: entryLabel, exact: true })
          .click();

        const box = nodeForm(dialog, entryLabel)
          .getByRole('textbox', { name: boxLabel, exact: true });

        await expect(box).toBeVisible();
        await box.fill(refusal.typed);

        // Assert — every sentence the schema produced is on the
        // screen, phrased exactly as the app's own describer phrased
        // it, under the title that says what they add up to.
        await expect(
          dialog.getByText(REFUSED_TITLE, { exact: true }),
        ).toBeVisible();

        for (const sentence of reading.sentences) {
          await expect(
            dialog.getByText(sentence, { exact: true }),
          ).toBeVisible();
        }

        // The refusal is the SCHEMA's and not the box's: the reader
        // took this text, so the control carries no invalid state and
        // the banner is the whole of the channel. Without this the
        // case cannot tell a member only the whole payload can refuse
        // from one the box refuses on its own.
        await expect(box).toHaveAttribute('aria-invalid', 'false');

        // And nothing reached the draft, so there is still nothing to
        // save. The editor opened clean, which is the state where a
        // refusal is the whole of the answer — `JsonEditor` states
        // that a draft already dirtied by an accepted payload stays
        // saveable while a later edit is refused, and the same holds
        // here.
        await expect(save).toBeDisabled();

        // Act — make the member read again.
        await box.fill(refusal.repaired(entry));

        // Assert — the sentences retire rather than accumulating, and
        // the write the schema now takes reaches the draft. This is
        // the control for the two shut footers above, varying exactly
        // the axis under test: the same box, the same form, a value
        // the schema accepts.
        await expect(
          dialog.getByText(REFUSED_TITLE, { exact: true }),
        ).toHaveCount(0);

        for (const sentence of reading.sentences) {
          await expect(
            dialog.getByText(sentence, { exact: true }),
          ).toHaveCount(0);
        }

        await expect(save).toBeEnabled();
      },
    );
  }
});

test.describe('an address the fields presentation is unreachable at', () => {
  test('leaves the surface standing behind it', async ({ page }) => {
    // Arrange — an id past every seeded one, so a fixture that grows
    // cannot quietly make this address a real category. The first
    // seeded category is the control this case ends on.
    const summaries = await seededSummaries();
    const summary = first(summaries, 'category summary');
    const missingId = Math.max(
      ...summaries.map((each) => each.category.id),
    ) + 1;

    // Act
    await page.goto(editPath(SINGLE_DOMAIN_BASE, missingId));

    const dialog = page.getByRole('dialog');

    await expect(dialog).toBeVisible();
    await expectSettled(page);

    // Assert — the read was refused, so the body stands IN FOR every
    // drawing rather than being one of them: there is no presentation
    // control at all, which is what makes the fields presentation
    // unreachable here rather than merely unchosen. A control offered
    // over a category nothing answers to would be an invitation to
    // edit a payload that is not there.
    await expect(
      dialog.getByText(REJECTED_TITLE, { exact: true }),
    ).toBeVisible();
    await expect(dialog.getByRole('tablist')).toHaveCount(0);
    await expect(
      dialog.getByRole('tab', { name: FIELDS_TAB_NAME }),
    ).toHaveCount(0);
    await expect(
      dialog.getByRole('button', { name: SAVE_NAME }),
    ).toBeDisabled();

    // Act — close it. The grid cannot be read while the dialog is up:
    // an open Radix dialog sets `aria-hidden` on the app root and the
    // content landmark goes with it.
    await dialog.getByRole('button', { name: CANCEL_NAME }).click();

    // Assert — the close landed back on the list with every card
    // where it was. An address that had taken the surface down with
    // it would fail here rather than above.
    await expect(page).toHaveURL(listPath(SINGLE_DOMAIN_BASE));

    const main = page.getByRole('main');

    for (const { category } of summaries) {
      await expect(categoryCard(main, category.name)).toBeVisible();
    }

    // The control for the two zero counts above, in the same case and
    // varying exactly the axis under test: at a REACHABLE address the
    // very same locators find the control and the segment. Reached by
    // CLICKING rather than by a second `goto`, so the surface is
    // shown live rather than merely painted.
    await main
      .getByRole('button', { name: summary.category.name, exact: true })
      .click();

    const reopened = page.getByRole('dialog');

    await expect(reopened).toBeVisible();
    await expectSettled(page);
    await expect(reopened.getByRole('tablist')).toHaveCount(1);
    await expect(
      reopened.getByRole('tab', { name: FIELDS_TAB_NAME }),
    ).toHaveCount(1);
  });
});
