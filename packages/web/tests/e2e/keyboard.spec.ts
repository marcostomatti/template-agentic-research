import type { Term } from '../../src/data/types';
import type { Page } from '@playwright/test';

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
import { POLARITY_FACETS } from '../../src/pages/lexicon/cards';
import {
  splitTermBuckets,
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
        tag: 'none', role: '', label: '', text: '', inDialog: false,
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
