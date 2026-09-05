import type { Term } from '../../src/data/types';
import type { FieldDef, ListFieldDef } from '../../src/dynamic-form/fieldDef';
import type {
  TermPayload,
  TermPayloadEntry,
} from '../../src/pages/lexicon/schema';
import type { Locator, Page } from '@playwright/test';

import { expect, test } from '@playwright/test';

import {
  fetchCategorySummaries,
  fetchConnectors,
  fetchFindings,
  fetchPersonas,
  fetchSourceFailures,
  fetchSourceProposals,
  fetchSources,
  fetchTerms,
} from '../../src/data/api';
import { DEFAULT_DOMAIN_SLUG } from '../../src/data/domains';
import { buildFormTree, treeNavNodes } from '../../src/dynamic-form/tree';
import { POLARITY_FACETS } from '../../src/pages/lexicon/cards';
import { fieldDefsForTermPayload } from '../../src/pages/lexicon/fieldDefs';
import {
  splitTermBuckets,
  toTermPayload,
  withTermPolarity,
} from '../../src/pages/lexicon/terms';
import { SINGLE_DOMAIN_BASE, withBase } from '../../src/routes/paths';

// The keyboard half of this package's accessibility coverage. Its
// neighbour `a11y.spec.ts` runs axe over every address, which reaches
// roughly the machine-checkable half of the problem and says nothing
// about ORDER, containment, dismissal or focus — none of which is a
// property of the markup alone. This file drives those with keys.
//
// Every address and every row id below is read out of the app's own
// accessors, and the expected bucket membership after the drag
// alternative comes from `pages/lexicon/terms.ts`'s own mover. What
// this file does spell is ACCESSIBLE NAMES: the pages and `@ar/ui`
// build them from literals in `.tsx` files nothing here may import —
// a spec that touches `document` at import time never loads. Each one
// is a named constant beside the control it addresses.
//
// ## What was measured, and what each case therefore claims
//
// Four readings, taken over all seven modal addresses before a line
// of this file was written, and each is a case below.
//
// A modal OPENS with the keyboard already inside it: `Modal` draws a
// header close button, and Radix's focus scope autofocuses it. So an
// operator who deep-linked into an editor is on a control rather than
// on the document, and does not have to hunt for the dialog.
//
// Tab CYCLES within the dialog and never leaves it. That is the
// containment claim, and it is asserted as a period rather than as a
// list of names: every stop is inside the dialog, and the sequence
// repeats with some period of at least two. See {@link tabPeriod} for
// why a period is the honest shape and what a period of one would
// mean.
//
// Escape CLOSES back to the list route. `EditorModal` narrows the
// library's dismissal to `escape` on purpose — a stray backdrop click
// must not discard typed work — so this is the one dismissal every
// modal here shares with the header's close button and the footer's
// Cancel, all three being the same relative navigation.
//
// Focus does NOT come back to the control that opened it. That is a
// defect rather than a design, it is carried in from `@ar/ui`, and it
// is recorded as a ledger for the same reason `a11y.spec.ts` records
// its three axe rules: see {@link FOCUS_RETURN_DEBT}.
//
// ## The card claim, and why it is three stops rather than one
//
// `EntityCard` makes the TITLE the open button and stretches an
// `absolute inset-0` overlay from it across the whole card, with the
// switch and the menu trigger in a `relative` layer above. A pointer
// therefore sees one big hit target; a keyboard has to see three
// separate stops, in a sensible order, or the layering has bought the
// mouse a gesture at the keyboard's expense. The cases below walk Tab
// from the top of the document to a named card and read the stops
// that follow it.
//
// ## The drag alternative
//
// WCAG 2.2 SC 2.5.7 (Dragging Movements) asks that anything achievable
// by dragging also be achievable with a single pointer — and the
// keyboard path is what makes that real for an operator who has no
// pointer at all. `pages/lexicon/terms.ts` states that a bucket IS a
// polarity, so the cross-bucket drag and the per-row polarity control
// are one operation expressed twice. `lexicon.spec.ts` drives that
// control with clicks. The case here drives it with keys only: Tab to
// the control, Enter to open it, ArrowDown to reach the target,
// Enter to commit. Nothing in that case touches the pointer.
//
// ## The fields presentation, and the walk a two-column form owes
//
// `src/dynamic-form/` draws a navigation tree beside ONE mounted
// form, and every part of that is a composite an operator can see and
// click before anybody asks whether it can be reached. Five claims,
// each measured over the term editor swapped to its fields segment
// before a case below was written.
//
// The structure column is ONE tab stop, however many rows it holds.
// That is the WAI-ARIA tree pattern's own bargain — a roving tabindex
// buys the arrows in exchange for not spending a stop per row — and
// it is a property of the walk rather than of any row, so it is read
// as the number of in-tree stops in one cycle rather than off a
// locator. See {@link TabStop.inTree}.
//
// Inside it, ArrowDown and ArrowUp cross every visible row and Home
// and End reach the two ends. Those keys are the whole of what the
// one stop bought, so a tree that took the stop and moved nothing
// would have cost an operator every row below the first.
//
// The trail above the form is reachable and every step of it
// navigates, the current one included: `@ar/ui`'s `Breadcrumb` draws
// each step as a real button, and the last is where an operator
// already is — pressing it has to leave them there rather than
// dropping them somewhere else.
//
// Every box of the mounted form is a stop, in the order the defs draw
// them. That is the claim a pointer would never think to make, and it
// is what says the two columns did not buy their navigation at the
// form's expense.
//
// The reorder controls are reachable and they MOVE. `@ar/ui`'s
// `Sortable` is HTML5 drag-and-drop with no keyboard path at all, so
// these controls are not an enhancement over the drag: they are the
// only way an operator without a pointer reorders anything, which is
// the same SC 2.5.7 argument the polarity control above answers.
// `dynamic-form.spec.ts` drives them with clicks and holds them
// against the drag; the case here presses them with Enter.
//
// And Escape still closes, pressed from inside the tree — which is
// where a walk leaves an operator, and the reason the press is made
// there rather than from the footer. It is NOT a claim that a
// composite could have swallowed it: Radix registers its escape
// listener on the DOCUMENT with `capture: true`, so a handler inside
// the dialog never sees the press first, and a leg giving the tree
// its own Escape case reddened nothing at all. What the case does
// report is that the dismissal is still wired (narrowing `Overlay`'s
// own `dismiss` reddens it) and that focus still lands where {@link
// FOCUS_RETURN_DEBT} says it does (a close-time focus reddens it).

/** Which domain every subject below is read out of. */
const SLUG = DEFAULT_DOMAIN_SLUG;

/**
 * The class `@ar/ui`'s `Skeleton` renders its shimmer with.
 *
 * The settled-state handle for the whole app, and unique to that
 * component. Every page and every modal renders one while its read is
 * in flight, and a `Skeleton` is `aria-hidden` — so a tab walk taken
 * mid-load would be walking a page whose controls have not arrived,
 * and would report a shorter cycle than the surface really has.
 */
const SKELETON = '.animate-shimmer';

/**
 * What `Modal`'s header close button is called.
 *
 * `OverlayHeader` sets it as a literal `aria-label`, so it is the one
 * control every modal here carries under one name — which is what
 * makes it usable as the autofocus expectation for all seven.
 */
const CLOSE_NAME = 'Close';

/** What `RowContextAction` names its trigger, before the row's name. */
const ROW_MENU_PREFIX = 'Actions for ';

/** What `LexiconPage.tsx` names a category's switch, before its name. */
const ENABLE_PREFIX = 'Enable ';

/** What `LexiconEditorModal.tsx` names a row's polarity control. */
const POLARITY_CONTROL_PREFIX = 'Polarity of ';

/** The sources row-menu item that opens the editor sub-route. */
const EDIT_SOURCE_ITEM = 'Edit source';

/**
 * How many Tab presses a containment walk takes.
 *
 * Generous rather than tight: the longest cycle measured over these
 * seven modals is thirteen stops (the lexicon editor over a category
 * with four terms), and {@link tabPeriod} needs at least two full
 * turns before a period is evidence rather than a coincidence. Forty
 * presses run in well under a second.
 */
const TAB_BUDGET = 40;

/**
 * How far a walk looks for one named control before giving up.
 *
 * The shell contributes fourteen stops ahead of the first card — six
 * rail surfaces, the docs link, the rail's own settings, the collapse
 * button, the workspace switcher, the search box, the bell, the theme
 * switch and the profile trigger — and each card contributes two or
 * three. So this is the shell plus a comfortable number of cards, and
 * a walk that exhausts it fails naming what it was looking for rather
 * than falling through to an assertion about the wrong element.
 */
const WALK_BUDGET = 60;

/**
 * Focus is not returned to the control that opened a modal.
 *
 * Measured over every modal address here, on both dismissals and
 * whichever control opened it: when the dialog unmounts, focus lands
 * on `document.body`. An operator who opened the twelfth card's editor
 * and pressed Escape is put back at the top of the application, and
 * has to walk the entire shell again to reach the thirteenth.
 *
 * The mechanism, read out of the installed dependency rather than
 * inferred. Radix's `DialogContentModal` composes `onCloseAutoFocus`
 * so that it calls `event.preventDefault()` — which cancels its own
 * focus scope's restore to the previously focused element — and then
 * focuses `context.triggerRef.current`. That ref is populated by a
 * `Dialog.Trigger`, and `@ar/ui`'s `Overlay` renders none: these
 * modals are opened by a ROUTE, not by a trigger. So the restore is
 * cancelled and nothing is focused in its place.
 *
 * It is carried in and it is not repairable from `packages/web`.
 * `git log -1` names commit `cabcf16` (the umbrella reintegration) for
 * both `Overlay.tsx` and `Modal.tsx`, which predates this branch, and
 * `git diff --name-only $(git merge-base main HEAD)..HEAD --
 * packages/ui` names only the `EntityCard` files. `Overlay` does not
 * forward `onCloseAutoFocus`, so no call site here can supply the
 * behaviour either.
 *
 * The two cases under `focus after a modal closes` assert the
 * behaviour as measured, so that the day `@ar/ui` grows a trigger ref
 * or forwards the handler this file goes red and has to be told —
 * which an assertion phrased as "not the opener" could not do. Each
 * carries the opener still on screen and still enabled beside it, so
 * the red is about focus and never about a control that vanished.
 *
 * The repair, for whoever takes it: `Overlay` forwarding
 * `onCloseAutoFocus` would let `EditorModal` restore focus itself, and
 * the two assertions here become `toBeFocused()` on the opener.
 */
const FOCUS_RETURN_DEBT = [
  '@ar/ui Overlay renders no Dialog.Trigger, so Radix cancels its own',
  'focus restore and focuses a null trigger: focus lands on the body.',
].join(' ');

/**
 * The first member, or a failure naming what was empty.
 *
 * Every subject here is derived from the fixtures, and an empty
 * fixture list would otherwise build an address ending in `undefined`
 * and drive the not-found page — where there is no dialog, so a
 * containment walk would report the shell's own tab order and the
 * case would fail somewhere that does not name the cause.
 * `noUncheckedIndexedAccess` makes the guard obligatory anyway; this
 * is what keeps it from being a non-null assertion.
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

/** One surface's list path under the single-domain base. */
function listPath(surfaceId: string): string {
  return withBase(SINGLE_DOMAIN_BASE, surfaceId);
}

/**
 * Where the keyboard is, in terms a case can compare and print.
 *
 * `inDialog` is the containment reading and the rest is the identity
 * one. The text is trimmed, collapsed and cut because a stop's own
 * `textContent` runs its descendants together — a footer button and a
 * whole failure row would otherwise be equally long strings.
 */
interface TabStop {
  /** The element's tag name, lowercased. */
  readonly tag: string;
  /** Its explicit `role`, or the empty string. */
  readonly role: string;
  /** Its `aria-label`, or the empty string. */
  readonly label: string;
  /** Its collapsed text, cut to a length two stops cannot share. */
  readonly text: string;
  /** Whether it sits inside the open dialog. */
  readonly inDialog: boolean;
  /**
   * Whether it sits inside a `role="tree"`.
   *
   * The reading the fields presentation's first claim is made of, and
   * a containment question exactly as {@link TabStop.inDialog} is: a
   * roving tabindex is a property of the WALK rather than of any one
   * row, so it cannot be read off a named locator. `@ar/ui`'s
   * `TreeNav` is the only thing in either package that draws a tree,
   * so this is false everywhere else and costs the other cases
   * nothing.
   */
  readonly inTree: boolean;
}

/** How wide a stop's text reading is. */
const STOP_TEXT_LIMIT = 60;

/**
 * Read where the keyboard is right now.
 *
 * Through `document.activeElement` rather than through a locator,
 * because the question is which element has focus and not whether a
 * named one does: a walk has to be able to report a stop it did not
 * expect, including the body.
 *
 * @param page - The page a walk is being taken on.
 * @returns The focused element, described.
 */
async function focusedStop(page: Page): Promise<TabStop> {
  return page.evaluate((limit) => {
    const node = document.activeElement;

    if (node === null) {
      return {
        tag: 'none',
        role: '',
        label: '',
        text: '',
        inDialog: false,
        inTree: false,
      };
    }

    const text = (node.textContent ?? '')
      .replace(/\s+/gu, ' ')
      .trim();

    return {
      tag: node.tagName.toLowerCase(),
      role: node.getAttribute('role') ?? '',
      label: node.getAttribute('aria-label') ?? '',
      text: text.slice(0, limit),
      inDialog: node.closest('[role="dialog"]') !== null,
      inTree: node.closest('[role="tree"]') !== null,
    };
  }, STOP_TEXT_LIMIT);
}

/** One stop as a single comparable string. */
function fingerprint(stop: TabStop): string {
  return `<${stop.tag}> role=${stop.role} label=${stop.label} ${stop.text}`;
}

/**
 * Press Tab (or Shift+Tab) a fixed number of times, reading each stop.
 *
 * @param page - The page a walk is being taken on.
 * @param presses - How many times to press.
 * @param key - Which key, so one helper serves both directions.
 * @returns Where the keyboard landed after each press, in order.
 */
async function walk(
  page: Page,
  presses: number,
  key: 'Tab' | 'Shift+Tab' = 'Tab',
): Promise<readonly TabStop[]> {
  const stops: TabStop[] = [];

  // Sequential on purpose: each press moves the focus the next read is
  // about, so there is nothing here to run in parallel.
  for (let press = 0; press < presses; press += 1) {
    await page.keyboard.press(key);
    stops.push(await focusedStop(page));
  }

  return stops;
}

/**
 * The period of a tab walk, or `undefined` if it did not repeat.
 *
 * A period rather than a list of expected control names, for two
 * reasons. It is what the containment claim actually is — the
 * keyboard comes back round to where it started instead of escaping
 * into the surface behind — and it needs no per-modal table of
 * literals, so seven modals share one assertion.
 *
 * Searching only the first half of the window is what makes a hit
 * evidence: a period of `p` is checked against `n - p` pairs, so a
 * `p` close to `n` would be asserted on almost nothing. With the
 * budget at forty and every cycle measured at thirteen or fewer,
 * every real answer is found inside the half.
 *
 * A period of ONE is the vacuity a caller has to reject: it is what a
 * page answers when Tab moves nothing at all, which is exactly how a
 * broken walk and a one-control dialog would both read.
 *
 * @param stops - A walk, in order.
 * @returns The smallest period the window supports, if any.
 */
function tabPeriod(stops: readonly TabStop[]): number | undefined {
  const marks = stops.map(fingerprint);
  const limit = Math.floor(marks.length / 2);

  for (let period = 1; period <= limit; period += 1) {
    const repeats = marks.every(
      (mark, index) => index + period >= marks.length
        || mark === marks[index + period],
    );

    if (repeats) {
      return period;
    }
  }

  return undefined;
}

/**
 * Wait for every loading stand-in on the page to have resolved.
 *
 * @param page - The page an address has been opened on.
 */
async function expectSettled(page: Page): Promise<void> {
  await expect(page.locator(SKELETON)).toHaveCount(0);
}

/**
 * Press Tab until a named stop is reached, or fail naming it.
 *
 * The reachability half of every card case: a control an operator can
 * see and click but cannot Tab to is not reachable, and the only way
 * to say so is to walk there. The failure message carries the last
 * stop, which is what distinguishes "the walk ran out of budget in
 * the shell" from "the walk reached the card and the control is not a
 * stop".
 *
 * @param page - The page, settled, with nothing yet focused.
 * @param matches - Which stop is being looked for.
 * @param what - What it is, for the failure message.
 * @returns How many presses it took.
 */
async function walkTo(
  page: Page,
  matches: (stop: TabStop) => boolean,
  what: string,
): Promise<number> {
  let last: TabStop | undefined;

  for (let press = 1; press <= WALK_BUDGET; press += 1) {
    await page.keyboard.press('Tab');

    const stop = await focusedStop(page);

    if (matches(stop)) {
      return press;
    }

    last = stop;
  }

  throw new Error(
    `Tab never reached ${what} in ${String(WALK_BUDGET)} presses. Last stop: ${
      last === undefined
        ? 'none'
        : fingerprint(last)}`,
  );
}

/** What one modal case is driven with. */
interface ModalSubject {
  /** What the case is called. */
  readonly label: string;
  /** The list surface it hangs under, and closes back to. */
  readonly surfaceId: string;
  /** Its address below that surface, derived from the fixtures. */
  readonly suffix: () => Promise<string>;
}

/**
 * Every modal sub-route this wave added, with the fixture row each
 * one is opened over.
 *
 * The same seven addresses `a11y.spec.ts` scans, derived the same
 * way. Two of them deliberately take their most POPULATED subject —
 * a source with a pending proposal, and one with a failed capture —
 * because an empty state has fewer controls and would understate
 * every containment cycle. Their empty states belong to
 * `sources.spec.ts`.
 */
const MODAL_SUBJECTS: readonly ModalSubject[] = [
  {
    label: 'the digest detail',
    surfaceId: 'digest',
    suffix: async () => String(first(await fetchFindings(SLUG), 'finding').id),
  },
  {
    label: 'the lexicon editor',
    surfaceId: 'lexicon',
    suffix: async () => {
      const summary = first(
        await fetchCategorySummaries(SLUG),
        'lexicon category',
      );

      return `${String(summary.category.id)}/edit`;
    },
  },
  {
    label: 'the source editor',
    surfaceId: 'sources',
    suffix: async () => `${String(first(await fetchSources(SLUG), 'source').id)}/edit`,
  },
  {
    label: 'the config approval',
    surfaceId: 'sources',
    suffix: async () => {
      const proposals = await fetchSourceProposals(SLUG);
      const pending = first(
        proposals.filter((proposal) => proposal.status === 'pending'),
        'pending config proposal',
      );

      return `${String(pending.sourceId)}/config`;
    },
  },
  {
    label: 'the failures list',
    surfaceId: 'sources',
    suffix: async () => {
      const sources = await fetchSources(SLUG);
      const readings = await Promise.all(sources.map(async (source) => ({
        source,
        failures: await fetchSourceFailures(SLUG, source.id),
      })));
      const subject = first(
        readings.filter((reading) => reading.failures.length > 0),
        'source with a failed capture',
      );

      return `${String(subject.source.id)}/failures`;
    },
  },
  {
    label: 'the agent editor',
    surfaceId: 'agents',
    suffix: async () => `${String(first(await fetchPersonas(SLUG), 'persona').id)}/edit`,
  },
  {
    label: 'the connector editor',
    surfaceId: 'tools',
    suffix: async () => `${String(first(await fetchConnectors(), 'connector').id)}/edit`,
  },
];

/**
 * Open one modal at its own address and wait for it to settle.
 *
 * By `goto` rather than by driving the list behind it: the ADDRESS is
 * the subject of every case in this describe, each modal being a
 * routed child that mounts on a direct navigation, and the surfaces'
 * own specs already drive the cards and menus that reach them. A goto
 * also resets `src/data/drafts.ts`, so no case inherits an edit
 * another one recorded.
 *
 * @param page - A fresh page.
 * @param subject - Which modal.
 * @returns Its address, for the close assertion.
 */
async function openModal(
  page: Page,
  subject: ModalSubject,
): Promise<string> {
  const path = `${listPath(subject.surfaceId)}/${await subject.suffix()}`;

  await page.goto(path);
  await expect(page.getByRole('dialog')).toBeVisible();
  await expectSettled(page);

  return path;
}

test.describe('every modal sub-route', () => {
  for (const subject of MODAL_SUBJECTS) {
    test(`${subject.label} holds the keyboard inside it`, async ({ page }) => {
      // Arrange
      await openModal(page, subject);

      const dialog = page.getByRole('dialog');

      // Assert — the keyboard is already inside the dialog, on the
      // header's close button. Nothing has been pressed yet: this is
      // where Radix's focus scope put it when the modal mounted, and
      // it is what stops a deep link leaving an operator on the
      // document with a dialog they cannot find.
      await expect(
        dialog.getByRole('button', { name: CLOSE_NAME }),
      ).toBeFocused();

      // Act — forward, far enough for the cycle to come round twice.
      const forward = await walk(page, TAB_BUDGET);

      // Assert — containment. Every stop is inside the dialog: the
      // surface behind it is `aria-hidden` and must be unreachable by
      // Tab as well.
      expect(
        forward.filter((stop) => !stop.inDialog).map(fingerprint),
        'Tab left the dialog.',
      ).toEqual([]);

      // And the walk came back round rather than running out of
      // controls. A period of one would mean Tab moved nothing at
      // all, which is how a dead walk reads.
      const period = tabPeriod(forward);

      expect(
        period,
        `Tab did not repeat inside ${TAB_BUDGET} presses: ${
          forward.map(fingerprint).join(' | ')}`,
      ).toBeDefined();
      expect(period).toBeGreaterThan(1);

      // Act — and back, which Radix traps separately.
      const backward = await walk(page, TAB_BUDGET, 'Shift+Tab');

      // Assert
      expect(
        backward.filter((stop) => !stop.inDialog).map(fingerprint),
        'Shift+Tab left the dialog.',
      ).toEqual([]);
    });

    test(`${subject.label} closes to its list on Escape`, async ({ page }) => {
      // Arrange — the dialog really open, so the assertion below is
      // about a dismissal and not about a modal that never mounted.
      const path = await openModal(page, subject);
      const dialog = page.getByRole('dialog');

      await expect(page).toHaveURL(path);

      // Act
      await page.keyboard.press('Escape');

      // Assert — gone, and back on the list the sub-route hangs
      // under. `EditorModal` narrows the library's dismissal to this
      // one gesture, so a modal that stopped honouring it would be
      // dismissable by the header button alone.
      await expect(dialog).toHaveCount(0);
      await expect(page).toHaveURL(listPath(subject.surfaceId));
    });
  }
});

test.describe('focus after a modal closes', () => {
  test('is dropped by a card-opened editor', async ({ page }) => {
    // Arrange — the lexicon grid, and what its first Tab reaches when
    // nothing has been opened. That reading is derived here rather
    // than spelled as a rail item's name, so the assertion below is
    // against this shell's own first stop whatever it grows.
    const summary = first(
      await fetchCategorySummaries(SLUG),
      'lexicon category',
    );
    const { name } = summary.category;
    const path = listPath('lexicon');

    await page.goto(path);
    await expectSettled(page);
    await page.keyboard.press('Tab');

    const documentStart = await focusedStop(page);

    // Act — open the editor from the card's own open control, then
    // dismiss it.
    const opener = page.getByRole('button', { name, exact: true });

    await opener.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expectSettled(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page).toHaveURL(path);

    // Assert — the ledger. See FOCUS_RETURN_DEBT: focus is on the
    // body, which is neither the opener nor anything else.
    await expect
      .poll(async () => (await focusedStop(page)).tag, {
        message: FOCUS_RETURN_DEBT,
      })
      .toBe('body');

    // The opener is still on screen and still takes focus, so the
    // reading above is about where focus WENT and never about a
    // control that stopped existing. This is also what a repair
    // would flip: `toBeFocused()` in place of the body reading.
    await expect(opener).toBeVisible();
    await expect(opener).toBeEnabled();
    await expect(opener).not.toBeFocused();

    // And the cost, stated as the operator meets it: the next Tab
    // starts the whole shell again rather than resuming beside the
    // card that was open.
    await page.keyboard.press('Tab');
    expect(await focusedStop(page)).toEqual(documentStart);
  });

  test('is dropped by a menu-opened editor', async ({ page }) => {
    // The other opener shape, and the one where the control that was
    // clicked is itself gone by the time the dialog mounts: a
    // `RowContextAction` item lives in a menu that closes on select.
    // What an operator would expect back is the row's own trigger.
    //
    // Arrange
    const path = listPath('sources');

    await page.goto(path);
    await expectSettled(page);

    const trigger = page
      .getByRole('button', { name: new RegExp(`^${ROW_MENU_PREFIX}`) })
      .first();
    const triggerName = await trigger.getAttribute('aria-label');

    expect(triggerName, 'the row menu trigger has no name').not.toBeNull();

    // Act
    await trigger.click();
    await page
      .getByRole('menu')
      .getByRole('menuitem', { name: EDIT_SOURCE_ITEM })
      .click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expectSettled(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page).toHaveURL(path);

    // Assert — the same ledger reading. The trigger is back on the
    // page and focusable, and does not have the focus.
    await expect
      .poll(async () => (await focusedStop(page)).tag, {
        message: FOCUS_RETURN_DEBT,
      })
      .toBe('body');

    const reopened = page.getByRole('button', {
      name: triggerName ?? ROW_MENU_PREFIX,
      exact: true,
    });

    await expect(reopened.first()).toBeVisible();
    await expect(reopened.first()).not.toBeFocused();
  });
});

/** What one entity-card case is driven with. */
interface CardSubject {
  /** What the case is called, and which grid it walks. */
  readonly label: string;
  /** The grid surface. */
  readonly surfaceId: string;
  /** The card's title, its slots' names, and its editor address. */
  readonly card: () => Promise<CardReading>;
}

/** One card, as the cases below address it. */
interface CardReading {
  /** The open control's accessible name, which IS the card's title. */
  readonly title: string;
  /**
   * The `aria-label` of each slot control, in the order `EntityCard`
   * lays them out after the title: the control slot, then the action
   * slot. A card with no switch names one.
   */
  readonly slots: readonly string[];
  /** Where the open gesture is expected to land. */
  readonly editSuffix: string;
}

/**
 * The three grids `EntityCard` draws, and the first card of each.
 *
 * Only the lexicon fills the CONTROL slot — its per-category enable
 * switch — so the expected stop list is two long there and one
 * everywhere else. That difference is the point of reading it from a
 * table rather than asserting a fixed three.
 */
const CARD_SUBJECTS: readonly CardSubject[] = [
  {
    label: 'a lexicon card',
    surfaceId: 'lexicon',
    card: async () => {
      const summary = first(
        await fetchCategorySummaries(SLUG),
        'lexicon category',
      );
      const { name, id } = summary.category;

      return {
        title: name,
        slots: [`${ENABLE_PREFIX}${name}`, `${ROW_MENU_PREFIX}${name}`],
        editSuffix: `${String(id)}/edit`,
      };
    },
  },
  {
    label: 'an agents card',
    surfaceId: 'agents',
    card: async () => {
      const persona = first(await fetchPersonas(SLUG), 'persona');

      return {
        title: persona.role,
        slots: [`${ROW_MENU_PREFIX}${persona.role}`],
        editSuffix: `${String(persona.id)}/edit`,
      };
    },
  },
  {
    label: 'a tools card',
    surfaceId: 'tools',
    card: async () => {
      const connector = first(await fetchConnectors(), 'connector');

      return {
        title: connector.name,
        slots: [`${ROW_MENU_PREFIX}${connector.name}`],
        editSuffix: `${String(connector.id)}/edit`,
      };
    },
  },
];

/**
 * Whether a stop is one card's open control.
 *
 * `EntityCard` renders the title inside a `button` and gives it no
 * `aria-label`, so its accessible name is the title text and the
 * empty label is what tells it apart from the slot controls beside
 * it, which are named that way and carry no text.
 *
 * @param stop - Where the keyboard is.
 * @param title - The card's title.
 * @returns Whether this is that card's open control.
 */
function isOpenControl(stop: TabStop, title: string): boolean {
  return stop.tag === 'button' && stop.label === '' && stop.text === title;
}

test.describe('the entity card', () => {
  for (const subject of CARD_SUBJECTS) {
    test(`${subject.label} offers its open control and slots as separate stops`, async ({
      page,
    }) => {
      // Arrange
      const card = await subject.card();

      await page.goto(listPath(subject.surfaceId));
      await expectSettled(page);

      // Act — walk from the top of the document to this card's own
      // open control. Reaching it at all is half the claim: the
      // overlay that makes the whole card clickable is `aria-hidden`
      // and takes no focus, so the button under it has to.
      await walkTo(
        page,
        (stop) => isOpenControl(stop, card.title),
        `the open control for "${card.title}"`,
      );

      // Assert — and the slots follow it, each its own stop, in the
      // order the card lays them out. A layering that had swallowed
      // the switch or the menu under the stretched overlay would
      // leave one of these unreachable while the pointer still found
      // it.
      const following = await walk(page, card.slots.length);

      expect(following.map((stop) => stop.label)).toEqual(card.slots);
      expect(
        following.every((stop) => stop.tag === 'button'),
        'a slot stop is not a button',
      ).toBe(true);
    });

    test(`${subject.label} opens its editor with Enter alone`, async ({
      page,
    }) => {
      // Arrange
      const card = await subject.card();
      const list = listPath(subject.surfaceId);

      await page.goto(list);
      await expectSettled(page);
      await walkTo(
        page,
        (stop) => isOpenControl(stop, card.title),
        `the open control for "${card.title}"`,
      );

      // Act — no pointer anywhere in this case.
      await page.keyboard.press('Enter');

      // Assert — the sub-route the card's own gesture declares, with
      // the editor really on it.
      await expect(page).toHaveURL(`${list}/${card.editSuffix}`);
      await expect(page.getByRole('dialog')).toBeVisible();
    });
  }
});

/** What the cross-bucket move case is driven with. */
interface Move {
  /** The editor address the term is edited at. */
  readonly path: string;
  /** The term the polarity control is asked to move. */
  readonly term: Term;
  /** What the control is asked to file it under. */
  readonly label: string;
  /** The vocabulary as stored. */
  readonly terms: readonly Term[];
  /** The vocabulary the move should leave behind. */
  readonly moved: readonly Term[];
}

/**
 * A cross-bucket move the fixtures can carry, derived not chosen.
 *
 * The first seeded category, its first term, and the first polarity
 * that is not the one the term already has — so the move is real
 * whichever way the fixtures are edited. The expected result comes
 * from `withTermPolarity`, which is the mover the control itself
 * calls and the same one a drop would call.
 *
 * @returns Everything the move case needs.
 */
async function pickMove(): Promise<Move> {
  const summary = first(
    await fetchCategorySummaries(SLUG),
    'lexicon category',
  );
  const terms = await fetchTerms(SLUG, summary.category.id);
  const term = first(terms, 'term in the first category');
  const target = first(
    POLARITY_FACETS.filter((facet) => facet.polarity !== term.polarity),
    'polarity other than the first term\'s',
  );

  return {
    path: `${listPath('lexicon')}/${String(summary.category.id)}/edit`,
    term,
    label: target.label,
    terms,
    moved: withTermPolarity(terms, term.id, target.polarity),
  };
}

/**
 * Which patterns are drawn in which bucket, right now.
 *
 * Read off the polarity controls rather than off the row text: their
 * accessible names carry the pattern, so one role locator answers
 * both membership and order without this file knowing how a row is
 * marked up. The same reading `lexicon.spec.ts` takes, for the same
 * reason.
 *
 * @param page - The page the editor is open on.
 * @returns The patterns per polarity, in the order they are drawn.
 */
async function readBuckets(
  page: Page,
): Promise<Record<string, readonly string[]>> {
  const dialog = page.getByRole('dialog');
  const rows = await Promise.all(
    POLARITY_FACETS.map(async (facet) => {
      // The bucket is a `section` with a heading, so it is a region
      // whose accessible name is that heading's WHOLE text — the
      // label and the count under it. The count moves with the very
      // gesture this file makes, so the name is matched on its
      // opening label alone.
      const names = await dialog
        .getByRole('region', { name: new RegExp(`^${facet.label}\\b`) })
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
 * question rather than a second implementation of it.
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
 * Walk the open option menu to a labelled item with the arrow keys.
 *
 * Bounded and checked rather than counted: Radix's roving focus
 * CLAMPS at the last item instead of wrapping, so a fixed number of
 * presses would silently stop short or sit on the end of the list.
 * Each press is followed by a read, and a walk that stops moving
 * before it finds the item fails naming where it stopped.
 *
 * @param page - The page the menu is open on.
 * @param label - The item to land on.
 */
async function arrowTo(page: Page, label: string): Promise<void> {
  const focused = page.locator('[role="menuitemradio"]:focus');

  for (let press = 0; press <= POLARITY_FACETS.length; press += 1) {
    const held = (await focused.textContent())?.trim();

    if (held === label) {
      return;
    }

    await page.keyboard.press('ArrowDown');
    await expect(focused).toHaveCount(1);
  }

  throw new Error(`The arrow keys never reached the "${label}" option.`);
}

test.describe('the drag alternative', () => {
  test('moves a term across buckets with no pointer at all', async ({
    page,
  }) => {
    // Arrange — the editor, and the split as stored. The precondition
    // is what makes the assertion afterwards a MOVE rather than a
    // description of a page that was always like that.
    const move = await pickMove();

    await page.goto(move.path);
    await expect(page.getByRole('dialog')).toBeVisible();
    await expectSettled(page);
    await expect.poll(async () => readBuckets(page))
      .toEqual(expectedBuckets(move.terms));

    // Act — keys only, start to finish. Tab to the row's own polarity
    // control, Enter to open it, the arrows to reach the bucket the
    // term is being filed under, Enter to commit. `terms.ts` states
    // that a bucket IS a polarity, so this is the same operation a
    // drop across the lists performs — which is what WCAG 2.2 SC
    // 2.5.7 asks for, and `lexicon.spec.ts` drives it with clicks.
    const control = `${POLARITY_CONTROL_PREFIX}${move.term.pattern}`;

    await walkTo(
      page,
      (stop) => stop.label === control,
      `the polarity control for "${move.term.pattern}"`,
    );
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menu')).toBeVisible();
    await arrowTo(page, move.label);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menu')).toHaveCount(0);

    // Assert — the whole membership of all three buckets, against
    // what the app's own mover says it should be.
    await expect.poll(async () => readBuckets(page))
      .toEqual(expectedBuckets(move.moved));

    // And the editor is still standing, with something to save: a
    // move that had only redrawn the lists would leave the draft
    // clean and the save refused.
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(
      page.getByRole('dialog').getByRole('button', { name: 'Save' }),
    ).toBeEnabled();
  });

  test('gives Escape to the option menu before the editor', async ({
    page,
  }) => {
    // The layered dismissal, and the reason the case above can use
    // the same key for two things: an operator who opens the wrong
    // row's control has to be able to back out of it without losing
    // everything they have typed into the editor behind it.
    //
    // Arrange
    const move = await pickMove();

    await page.goto(move.path);
    await expect(page.getByRole('dialog')).toBeVisible();
    await expectSettled(page);

    await walkTo(
      page,
      (stop) => stop.label === `${POLARITY_CONTROL_PREFIX}${move.term.pattern}`,
      `the polarity control for "${move.term.pattern}"`,
    );
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menu')).toBeVisible();

    // Act
    await page.keyboard.press('Escape');

    // Assert — the menu is gone, the editor is not, and the term is
    // where it was. The address is the reading that settles it: a
    // press that had reached the dialog would have navigated.
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page).toHaveURL(move.path);
    await expect.poll(async () => readBuckets(page))
      .toEqual(expectedBuckets(move.terms));

    // Act — and a second press, now that nothing is layered over the
    // editor, closes it.
    await page.keyboard.press('Escape');

    // Assert
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page).toHaveURL(listPath('lexicon'));
  });
});

/** The segment that swaps the term editor to the fields drawing. */
const FIELDS_TAB_NAME = 'Fields';

/**
 * What the trail above the mounted form is called.
 *
 * `@ar/ui`'s `Breadcrumb` names its own landmark, and the word is
 * retyped here for the reason every other name in this file is: a
 * case importing the library's constant agrees with whatever that
 * constant becomes, and a renamed landmark would travel to an
 * operator with nothing reporting it.
 */
const BREADCRUMB_NAME = 'Breadcrumb';

/** The footer control that writes, addressed by name. */
const SAVE_NAME = 'Save';

/** The verb both move controls open their accessible name with. */
const MOVE_VERB = 'Move';

/** The word the control moving a row towards the top ends with. */
const MOVE_UP_WORD = 'up';

/** The word the control moving a row towards the end ends with. */
const MOVE_DOWN_WORD = 'down';

/**
 * The two direction words, in the order a row draws its controls.
 *
 * The ORDER is part of the claim: the roster read off the rendered
 * controls is held against a roster built from this, so a pair drawn
 * the other way round is a mismatch naming both positions.
 */
const MOVE_WORDS: readonly string[] = [MOVE_UP_WORD, MOVE_DOWN_WORD];

/** Which row the reorder case moves. Not an end, deliberately. */
const MOVED_ROW_INDEX = 1;

/** Where the move lands it: the position above. */
const LANDED_ROW_INDEX = 0;

/**
 * The member the reorder case reads a position's content off.
 *
 * Keyed by the payload's own entry type, so a member that drifts is a
 * `check-types` failure naming it rather than a locator that quietly
 * stops matching anything.
 */
const PATTERN_MEMBER: keyof TermPayloadEntry = 'pattern';

/** What the tree calls the payload and each entry under it. */
interface TreeLabels {
  /** The root node's label — the payload itself. */
  readonly root: string;
  /** One label per entry, in the order the tree draws them. */
  readonly entries: readonly string[];
}

/** What the fields cases below are driven with. */
interface FieldsSubject {
  /** The editor address the presentation is reached at. */
  readonly path: string;
  /** The list def the presentation draws the payload from. */
  readonly defs: ListFieldDef;
  /** What the tree calls the payload and its entries. */
  readonly labels: TreeLabels;
  /** The payload the form opens on, as the fixtures hold it. */
  readonly payload: TermPayload;
}

/**
 * The first category's editor, and everything its form is drawn from.
 *
 * Derived rather than spelled, which is what keeps every locator
 * below addressing a MEMBER or a POSITION rather than a word somebody
 * may reword: the defs come from the reading the modal itself takes,
 * and the labels from the projection the shell hands its tree — so
 * `dynamic-form/tree.ts` remains the one place a list item's
 * positional name is decided.
 *
 * @returns The address, the defs, the labels and the payload.
 * @throws If v1 cannot express the payload, or the tree carries no
 * root.
 */
async function fieldsSubject(): Promise<FieldsSubject> {
  const summary = first(
    await fetchCategorySummaries(SLUG),
    'lexicon category',
  );
  const defs = fieldDefsForTermPayload();

  if (defs === null) {
    throw new Error('v1 cannot express the term payload.');
  }

  const payload = toTermPayload(await fetchTerms(SLUG, summary.category.id));
  const [root] = treeNavNodes(buildFormTree(defs, payload));

  if (root === undefined) {
    throw new Error('The projected tree carries no root node.');
  }

  // More than one row under the root, or the arrow walk below is
  // satisfied by a tree with nowhere to go and the one-stop reading
  // is a claim about a tree that could not have cost more.
  expect(root.children.length).toBeGreaterThan(1);

  return {
    path: `${listPath('lexicon')}/${String(summary.category.id)}/edit`,
    defs,
    labels: {
      root: root.label,
      entries: root.children.map((child) => child.label),
    },
    payload,
  };
}

/**
 * Open the term editor and swap it to the fields presentation.
 *
 * The swap is a CLICK and the claim never is: which segment draws
 * what belongs to `lexicon.spec.ts` and `dynamic-form.spec.ts`, and
 * every case here is about what happens after the drawing is up. The
 * dismissal case below reaches the same segment with keys instead,
 * which is where that gesture is the subject.
 *
 * @param page - A fresh page.
 * @param subject - Which editor, and what it draws.
 * @returns The open dialog.
 */
async function showFields(
  page: Page,
  subject: FieldsSubject,
): Promise<Locator> {
  await page.goto(subject.path);

  const dialog = page.getByRole('dialog');

  // The dialog first, then the settled state, and only then anything
  // inside it: a walk taken while the body is still a stand-in reads
  // a shorter cycle than the surface really has.
  await expect(dialog).toBeVisible();
  await expectSettled(page);
  await dialog
    .getByRole('tab', { name: FIELDS_TAB_NAME, exact: true })
    .click();
  await expect(dialog.getByRole('tree')).toBeVisible();

  return dialog;
}

/**
 * The one mounted form, addressed by the node it is drawing.
 *
 * `NodeForm` names its group after that node, so the form, the tree's
 * selected row and the breadcrumb's last step all carry one word —
 * which is what lets an assertion say WHICH node's members it reached
 * rather than trust that only one form is up.
 *
 * @param dialog - The open editor.
 * @param label - The node's label.
 * @returns That node's form.
 */
function nodeForm(dialog: Locator, label: string): Locator {
  return dialog.getByRole('group', { name: label, exact: true });
}

/**
 * The trail above the mounted form, through its own landmark.
 *
 * Named as well as scoped. The shell draws two more `nav` landmarks
 * of its own and a dialog hides both along with `main`, so an unnamed
 * locator would pass today and start matching the shell the moment
 * anything here is read outside a modal.
 *
 * @param dialog - The open editor.
 * @returns The breadcrumb's landmark.
 */
function breadcrumb(dialog: Locator): Locator {
  return dialog.getByRole('navigation', {
    name: BREADCRUMB_NAME,
    exact: true,
  });
}

/**
 * The members one entry is drawn from, in draw order.
 *
 * @param defs - The list def the presentation draws from.
 * @returns The item's own fields.
 * @throws If the item draws no members.
 */
function entryFields(defs: ListFieldDef): readonly FieldDef[] {
  const { item } = defs;

  if (item.type !== 'object') {
    throw new Error('The entry def does not draw members.');
  }

  return item.fields;
}

/**
 * What one member's box is called, from the member it writes.
 *
 * The crossing `pages/lexicon/fieldDefs.ts` says only a runtime
 * reading can make: a def's `key` is a plain string, so the member a
 * box writes and the word above it are two facts and this is where
 * they are held together.
 *
 * @param defs - The list def the presentation draws from.
 * @param member - The payload member whose box is wanted.
 * @returns The label that box carries.
 * @throws If no def draws that member.
 */
function memberLabel(
  defs: ListFieldDef,
  member: keyof TermPayloadEntry,
): string {
  const field = entryFields(defs).find((each) => each.key === member);

  if (field === undefined) {
    throw new Error(`No def draws the ${member} member.`);
  }

  return field.label;
}

/**
 * What the tree calls the entry at one position.
 *
 * @param labels - What the tree calls the payload and its entries.
 * @param index - The position wanted.
 * @returns Its label.
 * @throws If the tree draws no entry there.
 */
function entryLabelAt(labels: TreeLabels, index: number): string {
  const label = labels.entries[index];

  if (label === undefined) {
    throw new Error(`The tree draws no entry at position ${index}.`);
  }

  return label;
}

/**
 * One entry of the stored payload, or a failure naming the position.
 *
 * @param payload - The payload the form opens on.
 * @param index - The position wanted.
 * @returns That entry.
 * @throws If the payload holds none there.
 */
function entryAt(payload: TermPayload, index: number): TermPayloadEntry {
  const entry = payload[index];

  if (entry === undefined) {
    throw new Error(`The payload holds no entry at position ${index}.`);
  }

  return entry;
}

/** What one row's move control in one direction is called. */
function moveControlName(label: string, word: string): string {
  return `${MOVE_VERB} ${label} ${word}`;
}

/**
 * Every move control's name, in the order the rows draw them.
 *
 * POSITIONAL by construction, which is the whole point: a move
 * renames nothing, so this is what reports a row lost, duplicated or
 * misnumbered and never what moved.
 *
 * @param labels - What the tree calls the payload and its entries.
 * @returns One name per row per direction.
 */
function moveRoster(labels: TreeLabels): readonly string[] {
  return labels.entries.flatMap(
    (label) => MOVE_WORDS.map((word) => moveControlName(label, word)),
  );
}

/**
 * Every move control of one mounted list form, in DOM order.
 *
 * Matched on the verb rather than listed by name, so a control the
 * form drew and this file did not predict is a roster mismatch rather
 * than an absence nothing looks for. Disabled controls are members
 * too: a row at an end still draws both, and one of them is what a
 * Tab walk is expected to step over.
 *
 * @param form - The list level's own mounted form.
 * @returns Its move controls.
 */
function moveControls(form: Locator): Locator {
  return form.getByRole('button', {
    name: new RegExp(`^${MOVE_VERB} `, 'u'),
  });
}

/**
 * What a set of controls is CALLED, in DOM order.
 *
 * The attribute rather than the computed name, and for these two
 * callers they are the same string: a move control's only content is
 * an `aria-hidden` glyph, and a `TreeNav` row pins its own name with
 * the attribute because an item wrapping its children is otherwise
 * named after its whole open subtree.
 *
 * @param controls - The controls to read.
 * @returns One name per control, in the order the DOM holds them.
 */
async function ariaLabels(
  controls: Locator,
): Promise<readonly (string | null)[]> {
  return controls.evaluateAll(
    (nodes) => nodes.map((node) => node.getAttribute('aria-label')),
  );
}

/**
 * Tab until the keyboard is inside the structure tree.
 *
 * The whole tree is one stop, so this lands on whichever row holds
 * the roving tabindex — the selected one until an arrow moves it.
 *
 * @param page - The page the editor is open on.
 */
async function enterTree(page: Page): Promise<void> {
  await walkTo(page, (stop) => stop.inTree, 'the structure tree');
}

/**
 * Select one entry through the tree, with no pointer.
 *
 * Home first, so the walk starts from the top of the tree wherever
 * the roving tabindex was left, and then one ArrowDown per row: the
 * root is a row of its own, which is why reaching position zero takes
 * a press.
 *
 * @param page - The page the editor is open on.
 * @param dialog - The open editor.
 * @param labels - What the tree calls the payload and its entries.
 * @param index - Which entry to select.
 * @returns That entry's own mounted form.
 */
async function selectEntry(
  page: Page,
  dialog: Locator,
  labels: TreeLabels,
  index: number,
): Promise<Locator> {
  await enterTree(page);
  await page.keyboard.press('Home');

  // Sequential on purpose: each press moves the row the next one is
  // taken from.
  for (let step = 0; step <= index; step += 1) {
    await page.keyboard.press('ArrowDown');
  }

  const label = entryLabelAt(labels, index);

  expect((await focusedStop(page)).label).toBe(label);
  await page.keyboard.press('Enter');

  const form = nodeForm(dialog, label);

  await expect(form).toBeVisible();

  return form;
}

test.describe('the fields presentation', () => {
  test('spends one tab stop on its whole structure tree', async ({
    page,
  }) => {
    // Arrange
    const subject = await fieldsSubject();
    const dialog = await showFields(page, subject);

    // The rows the tree really draws, which is what stops the count
    // below being a claim about a tree that could not have cost more
    // than one stop anyway.
    expect(await ariaLabels(dialog.getByRole('treeitem'))).toEqual([
      subject.labels.root,
      ...subject.labels.entries,
    ]);

    // Act — the same containment walk every modal case above takes.
    const forward = await walk(page, TAB_BUDGET);
    const period = tabPeriod(forward);

    // Assert — a cycle to read the tree's share of, and one that
    // moved: a period of one is what a dead walk answers.
    expect(
      period,
      `Tab did not repeat inside ${TAB_BUDGET} presses: ${
        forward.map(fingerprint).join(' | ')}`,
    ).toBeDefined();
    expect(period).toBeGreaterThan(1);

    const cycle = forward.slice(0, period);
    const inTree = cycle.filter((stop) => stop.inTree);

    expect(
      inTree.map(fingerprint),
      'the structure tree is not one tab stop',
    ).toHaveLength(1);

    // And the stop it spends is a row rather than the tree itself:
    // `TreeNav` puts the tabindex on the treeitem, which is what the
    // arrow keys are then delivered to.
    expect(inTree.map((stop) => stop.role)).toEqual(['treeitem']);
  });

  test('walks the tree with the arrows, both ends included', async ({
    page,
  }) => {
    // Arrange
    const subject = await fieldsSubject();
    const dialog = await showFields(page, subject);
    const { root, entries } = subject.labels;
    const last = entries.length - 1;

    // Act — one Tab in, which lands on the row holding the roving
    // tabindex: the selected one, and nothing has selected anything
    // else yet.
    await enterTree(page);

    // Assert
    expect((await focusedStop(page)).label).toBe(root);

    // Act — ArrowDown, once per row under the root.
    const walked: string[] = [];

    for (let step = 0; step < entries.length; step += 1) {
      await page.keyboard.press('ArrowDown');
      walked.push((await focusedStop(page)).label);
    }

    // Assert — every row, in the order the tree draws them. A walk
    // that skipped one would leave a row an operator can see and
    // never reach.
    expect(walked).toEqual(entries);

    // Act/Assert — ArrowUp comes back, and the two ends are one press
    // each from wherever the walk stopped.
    await page.keyboard.press('ArrowUp');
    expect((await focusedStop(page)).label).toBe(
      entryLabelAt(subject.labels, last - 1),
    );

    await page.keyboard.press('End');
    expect((await focusedStop(page)).label).toBe(
      entryLabelAt(subject.labels, last),
    );

    await page.keyboard.press('Home');
    expect((await focusedStop(page)).label).toBe(root);

    // Act — and Enter selects the row the walk is standing on, which
    // is what the arrows were for: a tree that moved focus and
    // selected nothing would be a walk with no arrival.
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // Assert — the mounted form and the trail are two drawings of the
    // one selection, so both are read.
    const arrived = entryLabelAt(subject.labels, 0);

    await expect(nodeForm(dialog, arrived)).toBeVisible();
    await expect(breadcrumb(dialog).getByRole('button')).toHaveText([
      root,
      arrived,
    ]);
  });

  test('offers every breadcrumb step, and each one navigates', async ({
    page,
  }) => {
    // Arrange — a drilled-in node, reached through the tree with no
    // pointer, so the trail below has a step to walk back to.
    const subject = await fieldsSubject();
    const dialog = await showFields(page, subject);
    const { root } = subject.labels;
    const entry = entryLabelAt(subject.labels, 0);
    const trail = [root, entry];
    const steps = breadcrumb(dialog).getByRole('button');

    await selectEntry(page, dialog, subject.labels, 0);
    await expect(steps).toHaveText(trail);

    // Act — Tab out of the tree: the trail's steps are the stops that
    // follow it, in trail order. One press per step, counted off the
    // trail rather than off a number written here.
    const stops = await walk(page, trail.length);

    // Assert
    expect(stops.map((stop) => stop.text)).toEqual(trail);
    expect(
      stops.every((stop) => stop.tag === 'button'),
      'a breadcrumb step is not a button',
    ).toBe(true);

    // Act — the last step is where we already are. Pressing it has to
    // leave an operator there: a step that navigated to its own node
    // by unmounting and remounting would lose every box's typed text.
    await page.keyboard.press('Enter');

    // Assert
    await expect(nodeForm(dialog, entry)).toBeVisible();
    await expect(steps).toHaveText(trail);

    // Act — and the step before it walks back to the level above.
    await page.keyboard.press('Shift+Tab');
    expect((await focusedStop(page)).text).toBe(root);
    await page.keyboard.press('Enter');

    // Assert — the list level is mounted and the trail has shortened
    // to it, which is what says the step navigated rather than
    // redrawing what was already there.
    await expect(nodeForm(dialog, root)).toBeVisible();
    await expect(steps).toHaveText([root]);
  });

  test('offers every box of the mounted form in draw order', async ({
    page,
  }) => {
    // Arrange
    const subject = await fieldsSubject();
    const dialog = await showFields(page, subject);
    const form = await selectEntry(page, dialog, subject.labels, 0);
    const members = entryFields(subject.defs);

    // One box per member and no more, so the walk below is over the
    // whole form rather than over a prefix of it.
    await expect(form.getByRole('textbox')).toHaveCount(members.length);

    // Act — Tab out of the tree and past the trail, whose length is
    // read off the trail itself rather than counted here.
    const trail = await breadcrumb(dialog)
      .getByRole('button')
      .count();

    await walk(page, trail);

    // Assert — one press per member, each landing on the box that
    // writes it, in the order the defs list them. Derived from the
    // defs, so a member reordered there moves this with it.
    for (const def of members) {
      await page.keyboard.press('Tab');
      await expect(
        form.getByRole('textbox', { name: def.label, exact: true }),
      ).toBeFocused();
    }
  });

  test('moves a row with the reorder controls and no pointer', async ({
    page,
  }) => {
    // Arrange
    const subject = await fieldsSubject();
    const dialog = await showFields(page, subject);
    const { labels, payload } = subject;
    const listForm = nodeForm(dialog, labels.root);
    const roster = moveRoster(labels);
    const moved = entryAt(payload, MOVED_ROW_INDEX);
    const landedOn = entryAt(payload, LANDED_ROW_INDEX);
    const patternLabel = memberLabel(subject.defs, PATTERN_MEMBER);

    // The two entries have to differ where the reading is taken, or a
    // move that did nothing at all reads exactly like one that
    // worked. And the roster is the precondition for the invariance
    // asserted after the move.
    expect(moved[PATTERN_MEMBER]).not.toBe(landedOn[PATTERN_MEMBER]);
    expect(await ariaLabels(moveControls(listForm))).toEqual(roster);

    // Act — Tab to the control that moves the second row up, and
    // press it. `@ar/ui`'s `Sortable` has no keyboard path of its
    // own, so this pair of controls is the whole of SC 2.5.7 here.
    const control = moveControlName(
      entryLabelAt(labels, MOVED_ROW_INDEX),
      MOVE_UP_WORD,
    );

    await walkTo(
      page,
      (stop) => stop.label === control,
      `the control called "${control}"`,
    );
    await page.keyboard.press('Enter');

    // Assert — the roster first: every label here is positional, so
    // it is unchanged by construction and a difference is a row lost,
    // duplicated or misnumbered rather than a row that moved.
    expect(await ariaLabels(moveControls(listForm))).toEqual(roster);

    // What MOVED is read off the landing position's own box, through
    // the tree, which is also the remount that makes the reading
    // about the value rather than about text a control is holding.
    const landedForm = await selectEntry(
      page,
      dialog,
      labels,
      LANDED_ROW_INDEX,
    );

    await expect(
      landedForm.getByRole('textbox', { name: patternLabel, exact: true }),
    ).toHaveValue(moved[PATTERN_MEMBER]);

    // And the draft took it. A move that had only redrawn the rows
    // would leave the footer with nothing to write.
    await expect(
      dialog.getByRole('button', { name: SAVE_NAME, exact: true }),
    ).toBeEnabled();
  });

  test('closes on Escape from inside the tree, and drops focus', async ({
    page,
  }) => {
    // Arrange — the grid, and the card control this editor is opened
    // from, so the ledger below is read beside an opener that is
    // still there.
    const summary = first(
      await fetchCategorySummaries(SLUG),
      'lexicon category',
    );
    const { name } = summary.category;
    const path = listPath('lexicon');

    await page.goto(path);
    await expectSettled(page);

    const opener = page.getByRole('button', { name, exact: true });
    const dialog = page.getByRole('dialog');

    // Act — keys the whole way in, this being the one case where the
    // swap to the fields drawing is itself part of the claim.
    await walkTo(
      page,
      (stop) => isOpenControl(stop, name),
      `the open control for "${name}"`,
    );
    await page.keyboard.press('Enter');
    await expect(dialog).toBeVisible();
    await expectSettled(page);
    await walkTo(
      page,
      (stop) => stop.role === 'tab' && stop.text === FIELDS_TAB_NAME,
      `the "${FIELDS_TAB_NAME}" segment`,
    );
    await page.keyboard.press('Enter');
    await expect(dialog.getByRole('tree')).toBeVisible();
    await enterTree(page);

    // Act — from inside the tree, where the walk above leaves an
    // operator. The dialog answers it wherever the press is made,
    // Radix listening on the document in the capture phase, so this
    // is the position the gesture is used from rather than a claim
    // about what the tree might have swallowed.
    await page.keyboard.press('Escape');

    // Assert — gone, and back on the list the sub-route hangs under.
    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(path);

    // And the ledger, unchanged by the drawing that was up: see
    // FOCUS_RETURN_DEBT. Focus lands on the body.
    await expect
      .poll(async () => (await focusedStop(page)).tag, {
        message: FOCUS_RETURN_DEBT,
      })
      .toBe('body');

    // The opener is still on screen and still takes focus, so the
    // reading above is about where focus WENT and never about a
    // control that stopped existing.
    await expect(opener).toBeVisible();
    await expect(opener).toBeEnabled();
    await expect(opener).not.toBeFocused();
  });
});
