import type { Persona } from '../../src/data/types';
import type { Locator, Page } from '@playwright/test';

import { expect, test } from '@playwright/test';

import {
  EMPTY_EDITOR_DRAFT,
  describeUnsaved,
  withDraftValues,
  withLoadedRow,
} from '../../src/components/editorDraft';
import { fetchPersonas } from '../../src/data/api';
import {
  DEFAULT_DOMAIN_SLUG,
  SPARSE_DOMAIN_SLUG,
} from '../../src/data/domains';
import {
  SYSTEM_TEXT_EXCERPT_LIMIT,
  excerpt,
  personaCountLabel,
} from '../../src/pages/agents/cards';
import {
  ROLE_TAKEN_SENTENCE,
  personaRoleChoices,
  validatePersonaDraft,
  withPersonaRole,
  withPersonaSystemText,
} from '../../src/pages/agents/editor';
import {
  domainBase,
  SINGLE_DOMAIN_BASE,
  withBase,
} from '../../src/routes/paths';

// Every expected role, excerpt, count and refusal below is read out of
// the app's own pure modules, so this file spells no fixture persona,
// no sentence and no chip text of its own. What it does spell is
// ACCESSIBLE NAMES: `AgentsPage.tsx` and `AgentEditorModal.tsx` build
// them from literals and are `.tsx` files nothing here may import — a
// spec that touches `document` at import time never loads. Each one is
// a named constant beside the control it addresses.
//
// What this adds over the unit suites — `pages/agents/cards.test.ts`
// drives the excerpt and the chip, `editor.test.ts` the role ladder,
// the movers and every refusal — is the ASSEMBLY. Five things only a
// browser can answer: that a card is wired to the sub-route at all,
// that the ladder the module builds is the one the control offers,
// that a refusal reaches the screen and DECLINES the save instead of
// being swallowed, that a save is visible to the read the card draws
// itself from, and that a domain configuring nothing says so rather
// than drawing an empty grid.
//
// ## The two refusals are one claim
//
// `data/api.ts` refuses a persona id no row carries and a persona
// belonging to another domain with the SAME message, deliberately —
// that is what a scoped endpoint answers too. Both addresses are
// driven here through one table, so the day they stop agreeing this
// file says which one moved.
//
// ## A refused save is declined, not prevented
//
// `AgentEditorModal.tsx` gates its save in the handler rather than by
// disabling the button, because `EditorModal`'s disabled reading means
// a draft with nothing to save or a save already in flight. So the
// duplicate-role case asserts the control is ENABLED before it clicks:
// a disabled Save would pass a stays-open assertion without the click
// ever being refused.
//
// ## The modal hides the surface from every role locator
//
// `Modal` is a Radix dialog, and an open one sets `aria-hidden` on the
// app root: with the editor up, `page.getByRole('main')` resolves to
// ZERO elements and so does everything scoped under it. Every grid
// assertion here is taken before an editor opens or after it has
// closed, never beside one.
//
// ## Which base
//
// The single-domain base carries every case except the open gesture,
// which runs under both — the sub-route address is the one claim here
// that is base-dependent, the editor's close being relative. The
// sparse-domain and foreign-row cases are the exception in the other
// direction: a domain slug only exists under the domain base.
//
// ## What this file deliberately does not claim
//
// That a save survives a reload. It does not: `data/drafts.ts` is
// module-scoped state in the TAB, which is a property of the fixture
// seam rather than of this surface, and `lexicon.spec.ts` owns the
// case that pins it.

/** Which surface this is — the list path comes off the same table. */
const AGENTS_SURFACE_ID = 'agents';

/**
 * The segment the editor sub-route occupies under a persona id.
 *
 * Spelled rather than imported: `routes/router.tsx` builds the pattern
 * and is a `.tsx` this file may not load, and `AgentsPage.tsx` keeps
 * its own copy private. The router's own unit suite is what holds the
 * two in step; here it is one literal, named once.
 */
const EDIT_SEGMENT = 'edit';

/**
 * What the role control is called.
 *
 * `Select` spreads nothing and names its trigger from `ariaLabel`
 * alone, which the editor sets to the very words on the label beside
 * it — so this one constant addresses both.
 */
const ROLE_CONTROL_NAME = 'Role';

/** What the box holding the standing instruction is called. */
const SYSTEM_TEXT_FIELD_NAME = 'System text';

/**
 * What names the region the refusals are read out of.
 *
 * A live region that exists from mount and is EMPTY until a fault
 * lands, which is the pair a refusal wants: the name dodges the
 * `role="status"` that `StatusIndicator` puts on list surfaces, and
 * emptiness is the only reading that tells a fault which went away
 * from a region that was never rendered.
 */
const REFUSED_REGION_NAME = 'Why this persona cannot be saved';

/** The footer's two controls, addressed by name in every case. */
const SAVE_NAME = 'Save';
const CANCEL_NAME = 'Cancel';

/** How the editor titles a persona read that came back rejected. */
const REJECTED_TITLE = 'This persona could not be read';

/**
 * What the header falls back to while no persona is loaded.
 *
 * Asserted over a rejected read rather than assumed: `Modal` draws its
 * close button and the dialog's accessible name only when it is given
 * a title, so a refusal that dropped the header would leave an unnamed
 * dialog dismissable by Escape alone.
 */
const PLACEHOLDER_TITLE = 'Persona';

/** How the grid titles a domain that configures no personas. */
const EMPTY_TITLE = 'No personas yet';

/**
 * A standing instruction this file writes, long enough to be cut.
 *
 * Authored here rather than derived, because it is the operator's own
 * typing — the one thing on this surface that cannot come out of a
 * fixture. It opens with a marker of its own so it can never be
 * mistaken for seeded prose, and it runs well past
 * `SYSTEM_TEXT_EXCERPT_LIMIT` so the card is made to draw an EXCERPT
 * rather than whatever it was handed. Both properties are asserted
 * before the case types it.
 */
const REWRITTEN_SYSTEM_TEXT = 'Spec rewrite. You read every document '
  + 'this domain collects and answer in a single paragraph, naming the '
  + 'document behind each claim and refusing anything the collection '
  + 'does not carry.';

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

/** The agents list path under a base. */
function listPath(base: string): string {
  return withBase(base, AGENTS_SURFACE_ID);
}

/** One persona's editor path under a base. */
function editPath(base: string, personaId: number): string {
  return `${listPath(base)}/${personaId}/${EDIT_SEGMENT}`;
}

/**
 * The seeded domain's personas, through the page's own accessor.
 *
 * @returns Its personas, in the pass order the seed keeps.
 * @throws If the fixture domain configures none.
 */
async function seededPersonas(): Promise<readonly Persona[]> {
  const personas = await fetchPersonas(DEFAULT_DOMAIN_SLUG);

  // A cast that lost its rows would leave every loop below asserting
  // nothing, and passing.
  expect(personas.length).toBeGreaterThan(0);

  return personas;
}

/**
 * Two personas of one domain, derived rather than chosen.
 *
 * The first is edited and the second is what its role is made to
 * collide with, so the duplicate-role case is real whichever way the
 * seed is edited. Their roles are asserted distinct here rather than
 * assumed: `personas_domain_id_role_unique` says they must be, and a
 * fixture that broke it would leave the collision case measuring
 * nothing.
 *
 * @returns The whole cast, plus the two rows the case drives.
 */
async function seededPair(): Promise<{
  personas: readonly Persona[];
  subject: Persona;
  other: Persona;
}> {
  const personas = await seededPersonas();
  const subject = first(personas, 'persona');
  const other = first(
    personas.filter((persona) => persona.id !== subject.id),
    'second persona to collide with',
  );

  expect(other.role).not.toEqual(subject.role);

  return { personas, subject, other };
}

/**
 * One persona's card, located from the heading that names it.
 *
 * `EntityCard` renders a `div` with no role and no landmark, so the
 * only stable way in is its heading — which IS a role, and IS the
 * card's name. Two steps up from there is the card root: the heading
 * sits in the header row, and the header row in the card. Stated once
 * here rather than at each call site, so that shape is one edit.
 *
 * @param main - The content landmark.
 * @param role - The persona's role, which is its identity.
 * @returns The card root.
 */
function personaCard(main: Locator, role: string): Locator {
  return main
    .getByRole('heading', { level: 2, name: role, exact: true })
    .locator('xpath=../..');
}

/**
 * Which roles the grid is drawing, in the order it draws them.
 *
 * Read off the card headings, which carry the role and nothing else —
 * so one role locator answers both membership and order without this
 * file knowing how a card is marked up. A role drawn twice is then two
 * entries rather than one, which a per-name visibility check could not
 * see.
 *
 * @param main - The content landmark.
 * @returns The roles, in draw order.
 */
function readRoles(main: Locator): Promise<readonly string[]> {
  return main.getByRole('heading', { level: 2 }).allTextContents();
}

/**
 * The card's open gesture, which `EntityCard` renders as the title
 * button with its hit area stretched over the whole card.
 *
 * @param main - The content landmark.
 * @param role - Which card to open.
 * @returns The button.
 */
function openCardControl(main: Locator, role: string): Locator {
  return main.getByRole('button', { name: role, exact: true });
}

/**
 * What the role ladder is offering right now.
 *
 * The panel is addressed on the PAGE rather than inside the dialog:
 * `Select` is a Radix dropdown and renders its menu through a portal,
 * so it is a sibling of the modal and not a descendant.
 *
 * @param page - The page the editor is open on.
 * @returns The offered roles, in offer order.
 */
async function openRoleLadder(page: Page): Promise<readonly string[]> {
  await page
    .getByRole('dialog')
    .getByRole('button', { name: ROLE_CONTROL_NAME })
    .click();

  return page
    .getByRole('menu')
    .getByRole('menuitemradio')
    .allTextContents();
}

/**
 * Play the persona as another role, through its own control.
 *
 * @param page - The page the editor is open on.
 * @param role - The role to choose.
 */
async function chooseRole(page: Page, role: string): Promise<void> {
  await page
    .getByRole('menu')
    .getByRole('menuitemradio', { name: role, exact: true })
    .click();
}

/**
 * What the footer should say about a draft moved this way.
 *
 * Built through the very modules the modal holds its draft in, so the
 * sentence is the app's own answer rather than a second spelling of
 * it — and a count the frame changed its mind about reaches both
 * sides of the assertion at once.
 *
 * @param loaded - The persona as the read answered it.
 * @param edited - The persona as the operator left it.
 * @returns The footer's sentence.
 * @throws If the two rows compare equal, which would leave the case
 * asserting that an unmoved draft reports nothing.
 */
function unsavedSentence(loaded: Persona, edited: Persona): string {
  const sentence = describeUnsaved(
    withDraftValues(withLoadedRow<Persona>(EMPTY_EDITOR_DRAFT, loaded), edited),
  );

  if (sentence === undefined) {
    throw new Error('The edited draft reported nothing unsaved.');
  }

  return sentence;
}

/** One address a persona read is expected to refuse. */
interface Rejection {
  /** Names the claim, so a failing title says which leg it is. */
  readonly what: string;
  /**
   * The address to open, built from the seeded cast.
   *
   * @param personas - The seeded domain's personas.
   * @returns The editor address.
   */
  readonly path: (personas: readonly Persona[]) => string;
}

/**
 * The two ways this editor is asked for a persona it cannot have.
 *
 * `data/api.ts` answers both with one message on purpose — see the
 * note at the top of this file — so they are driven as one table
 * rather than as two cases that happen to assert the same string.
 */
const REJECTIONS: readonly Rejection[] = [
  {
    what: 'an id no persona carries',
    path: (personas) => editPath(
      SINGLE_DOMAIN_BASE,
      // Past every seeded id, so a cast that grows cannot quietly
      // make this address a real persona.
      Math.max(...personas.map((persona) => persona.id)) + 1,
    ),
  },
  {
    what: 'an id another domain carries',
    path: (personas) => editPath(
      domainBase(SPARSE_DOMAIN_SLUG),
      first(personas, 'persona').id,
    ),
  },
];

test.describe('a persona id no fixture carries', () => {
  for (const { what, path } of REJECTIONS) {
    test(`reports the rejected read given ${what}`, async ({ page }) => {
      // Arrange
      const personas = await seededPersonas();
      const address = path(personas);

      // Act
      await page.goto(address);

      // Assert — the editor opened at the address asked for and
      // stated what it could not read. Auto-retrying, because the
      // cache retries a rejected read once before it settles: a
      // single read taken on arrival sees the aria-hidden loading
      // stand-in and reports an empty modal.
      const dialog = page.getByRole('dialog');

      await expect(
        dialog.getByText(REJECTED_TITLE, { exact: true }),
      ).toBeVisible();
      await expect(page).toHaveURL(address);

      // Named even with nothing loaded, which is what keeps the close
      // button and the dialog's own accessible name on screen.
      await expect(
        dialog.getByRole('heading', { name: PLACEHOLDER_TITLE, exact: true }),
      ).toBeVisible();

      // The refusal STANDS IN for the fields rather than sitting
      // above them: an editor drawing a role ladder and an empty box
      // over a persona nothing answers to would be an invitation to
      // edit a row that is not there. The refusal region goes with
      // them — there is no draft for anything to be wrong with.
      await expect(
        dialog.getByRole('button', { name: ROLE_CONTROL_NAME }),
      ).toHaveCount(0);
      await expect(
        dialog.getByRole('textbox', { name: SYSTEM_TEXT_FIELD_NAME }),
      ).toHaveCount(0);
      await expect(
        dialog.getByRole('status', { name: REFUSED_REGION_NAME }),
      ).toHaveCount(0);

      // And nothing is offered to save, there being no draft at all.
      await expect(
        dialog.getByRole('button', { name: SAVE_NAME }),
      ).toBeDisabled();
    });
  }

  test('leaves the grid standing behind it', async ({ page }) => {
    // Arrange
    const personas = await seededPersonas();
    const missingId = Math.max(
      ...personas.map((persona) => persona.id),
    ) + 1;

    // Act — open the refusal, then close it. The grid cannot be read
    // while the dialog is up: an open Radix dialog sets `aria-hidden`
    // on the app root, and the content landmark goes with it.
    await page.goto(editPath(SINGLE_DOMAIN_BASE, missingId));

    const dialog = page.getByRole('dialog');

    await expect(
      dialog.getByText(REJECTED_TITLE, { exact: true }),
    ).toBeVisible();
    await dialog.getByRole('button', { name: CANCEL_NAME }).click();

    // Assert — the close landed back on the list, with every card
    // where it was. A rejected read that had taken the surface down
    // with it would fail here rather than above.
    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(listPath(SINGLE_DOMAIN_BASE));

    const main = page.getByRole('main');

    await expect
      .poll(() => readRoles(main))
      .toEqual(personas.map((persona) => persona.role));
  });
});

test.describe('a duplicate role', () => {
  test('refuses the save with its sentence on screen', async ({ page }) => {
    // Arrange — what the collision means is read from the same
    // validation the modal runs, over the same cast it runs it
    // against.
    const { personas, subject, other } = await seededPair();
    const collided = withPersonaRole(subject, other.role);
    const faults = validatePersonaDraft(collided, personas);
    const unsaved = unsavedSentence(subject, collided);

    // Two guards about what this case measures rather than about the
    // app: a draft the module accepted would leave the refusal
    // unmeasured, and a refusal for some OTHER reason would pass every
    // assertion below while saying nothing about uniqueness.
    expect(faults.length).toBeGreaterThan(0);
    expect(faults).toContain(ROLE_TAKEN_SENTENCE);

    await page.goto(listPath(SINGLE_DOMAIN_BASE));

    const main = page.getByRole('main');

    await openCardControl(main, subject.role).click();

    const dialog = page.getByRole('dialog');
    const refusals = dialog.getByRole('status', {
      name: REFUSED_REGION_NAME,
    });
    const save = dialog.getByRole('button', { name: SAVE_NAME });

    // The region is on screen from mount and holds nothing, which is
    // what says the sentences below ARRIVED rather than that the
    // region did. A refusal list inserted along with its first
    // sentence is routinely missed by assistive technology.
    await expect(refusals).toBeEmpty();
    await expect(save).toBeDisabled();

    // Act — the ladder first, because what it offers is the other
    // half of this claim: `personaRoleChoices` guarantees the stored
    // role a place and offers the roles the domain plays, and over
    // the fixtures as shipped every one of the alternatives is
    // already held. The refusal is one click into the demo.
    const offered = await openRoleLadder(page);

    expect(offered).toEqual(
      // Label and value are the same stored token here, which is what
      // `pages/agents/editor.ts` states and why the menu's own text
      // can be compared against either.
      personaRoleChoices(personas, subject.role).map((choice) => choice.value),
    );

    await chooseRole(page, other.role);

    // Assert — every sentence the module produces is on the screen,
    // phrased exactly as it phrased it, and the footer counts the
    // change that caused them.
    for (const sentence of faults) {
      await expect(refusals.getByText(sentence, { exact: true })).toBeVisible();
    }

    await expect(dialog.getByText(unsaved, { exact: true })).toBeVisible();

    // Act — the save is OFFERED and then declined, which is this
    // editor's own choice: `EditorModal` disables its control for a
    // draft with nothing to save and for a save in flight, and a
    // refusal is neither. Asserting the control is enabled first is
    // what makes the click below a refusal rather than a no-op.
    await expect(save).toBeEnabled();
    await save.click();

    // Assert — the dialog is where it was, still saying why, with the
    // change still counted as unsaved.
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(editPath(SINGLE_DOMAIN_BASE, subject.id));
    await expect(
      refusals.getByText(ROLE_TAKEN_SENTENCE, { exact: true }),
    ).toBeVisible();
    await expect(dialog.getByText(unsaved, { exact: true })).toBeVisible();

    // Act
    await dialog.getByRole('button', { name: CANCEL_NAME }).click();

    // Assert — nothing was recorded. Said as the whole grid rather
    // than as the one card, so a save that had written the collision
    // through shows up as two cards wearing one role rather than as a
    // card nobody looked for.
    await expect(dialog).toHaveCount(0);
    await expect
      .poll(() => readRoles(main))
      .toEqual(personas.map((persona) => persona.role));
  });
});

/** The two bases the open gesture is driven under. */
const BASES = [
  { label: 'single-domain base', base: SINGLE_DOMAIN_BASE },
  { label: 'domain base', base: domainBase(DEFAULT_DOMAIN_SLUG) },
] as const;

test.describe('the agents grid', () => {
  test('renders one card per persona, in pass order', async ({ page }) => {
    // Arrange
    const personas = await seededPersonas();

    // Act
    await page.goto(listPath(SINGLE_DOMAIN_BASE));

    const main = page.getByRole('main');

    // Assert — the roles the seed keeps, in the sequence they run.
    // Compared as a whole list rather than per name, so a persona
    // drawn twice or a grid that re-sorted fails here.
    await expect
      .poll(() => readRoles(main))
      .toEqual(personas.map((persona) => persona.role));

    // And the head counts the cast it is drawing.
    await expect(
      main.getByText(personaCountLabel(personas.length), { exact: true }),
    ).toBeVisible();

    // Each card carries the opening of what its role is asked to do,
    // cut by the page's own rule rather than by a CSS clamp — which
    // is why there is a string here to assert at all.
    for (const persona of personas) {
      const card = personaCard(main, persona.role);

      await expect(
        card.getByText(
          excerpt(persona.systemText, SYSTEM_TEXT_EXCERPT_LIMIT),
          { exact: true },
        ),
      ).toBeVisible();
    }
  });

  for (const { label, base } of BASES) {
    test(
      `opens the editor at the edit sub-route under the ${label}`,
      async ({ page }) => {
        // Arrange
        const persona = first(await seededPersonas(), 'persona');

        await page.goto(listPath(base));

        const main = page.getByRole('main');

        // Act — the card's own open gesture.
        await openCardControl(main, persona.role).click();

        // Assert — the address the sub-route declares under THIS
        // base, and the editor really open on that persona. The
        // header reads the STORED role, which is also the field the
        // dialog edits.
        await expect(page).toHaveURL(editPath(base, persona.id));

        const dialog = page.getByRole('dialog');

        await expect(
          dialog.getByRole('heading', { name: persona.role, exact: true }),
        ).toBeVisible();
        await expect(
          dialog.getByRole('textbox', { name: SYSTEM_TEXT_FIELD_NAME }),
        ).toHaveValue(persona.systemText);
      },
    );
  }
});

test.describe('an edited system text', () => {
  test('saves, and the card excerpt reflects it', async ({ page }) => {
    // Arrange
    const personas = await seededPersonas();
    const persona = first(personas, 'persona');
    const rewritten = withPersonaSystemText(persona, REWRITTEN_SYSTEM_TEXT);
    const storedExcerpt = excerpt(
      persona.systemText,
      SYSTEM_TEXT_EXCERPT_LIMIT,
    );
    const editedExcerpt = excerpt(
      REWRITTEN_SYSTEM_TEXT,
      SYSTEM_TEXT_EXCERPT_LIMIT,
    );
    const unsaved = unsavedSentence(persona, rewritten);

    // Two guards about what this case measures. A rewrite whose
    // opening matched the seeded one would pass every assertion below
    // against a card that never re-read anything; and a rewrite short
    // enough to fit would leave the card printing what it was handed,
    // which is not what a card on this grid does.
    expect(editedExcerpt).not.toEqual(storedExcerpt);
    expect(editedExcerpt).not.toEqual(REWRITTEN_SYSTEM_TEXT);

    await page.goto(listPath(SINGLE_DOMAIN_BASE));

    const main = page.getByRole('main');
    const card = personaCard(main, persona.role);

    await expect(
      card.getByText(storedExcerpt, { exact: true }),
    ).toBeVisible();

    // Act
    await openCardControl(main, persona.role).click();

    const dialog = page.getByRole('dialog');

    await dialog
      .getByRole('textbox', { name: SYSTEM_TEXT_FIELD_NAME })
      .fill(REWRITTEN_SYSTEM_TEXT);

    // The footer counts it before anything is written, which is what
    // says the typing reached the DRAFT rather than only the box.
    await expect(dialog.getByText(unsaved, { exact: true })).toBeVisible();

    await dialog.getByRole('button', { name: SAVE_NAME }).click();

    // Assert — a save closes this editor, which is this surface's own
    // choice and not the shared frame's: `EditorModal` hands its
    // close to the handler, and the agents editor takes it because
    // the grid behind draws the very persona that was saved.
    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(listPath(SINGLE_DOMAIN_BASE));

    // The card is drawn from `fetchPersonas`, which composes the
    // draft overlay — so the excerpt moving is the whole round trip:
    // the mutation records, the invalidation re-reads, and the page's
    // own cut runs over what came back. The stored opening being GONE
    // is the half that a containment check could not see.
    await expect(
      card.getByText(editedExcerpt, { exact: true }),
    ).toBeVisible();
    await expect(
      card.getByText(storedExcerpt, { exact: true }),
    ).toHaveCount(0);

    // The role is untouched, so the rest of the grid is where it was.
    await expect
      .poll(() => readRoles(main))
      .toEqual(personas.map((row) => row.role));

    // Act — reopened by CLICKING, never by a second `goto`: the draft
    // store is module state in the tab, and a fresh document resets
    // it. A goto-based reopen would show the seeded instruction again
    // and read exactly like a save that recorded nothing.
    await openCardControl(main, persona.role).click();

    // Assert — the editor opens on what was saved, with nothing left
    // unsaved. Without this the excerpt assertion above would pass
    // just as well against a page that re-rendered from its own
    // memory rather than from the seam.
    await expect(
      dialog.getByRole('textbox', { name: SYSTEM_TEXT_FIELD_NAME }),
    ).toHaveValue(REWRITTEN_SYSTEM_TEXT);
    await expect(
      dialog.getByRole('button', { name: SAVE_NAME }),
    ).toBeDisabled();
  });
});

test.describe('the sparse domain', () => {
  test('renders the empty state', async ({ page }) => {
    // Arrange — the emptiness is a property of the fixture domain,
    // asserted here so a seed that gave it personas reddens this case
    // rather than leaving it passing against a grid that failed to
    // draw them.
    const personas = await fetchPersonas(SPARSE_DOMAIN_SLUG);

    expect(personas).toEqual([]);

    // Act — only reachable under the domain base: a slug is what the
    // single-domain base does not have.
    await page.goto(listPath(domainBase(SPARSE_DOMAIN_SLUG)));

    // Assert — the surface says a run of this domain could not start,
    // rather than drawing a grid with nothing in it. Matched as text
    // rather than through a role: `EmptyState` draws its title in a
    // `span`, so there is no heading to ask for.
    const main = page.getByRole('main');

    await expect(main.getByText(EMPTY_TITLE, { exact: true })).toBeVisible();

    // And the head still counts, at zero. The chip is what separates
    // a read that settled empty from one that never settled: the page
    // draws no tag at all while the read is in flight.
    await expect(
      main.getByText(personaCountLabel(0), { exact: true }),
    ).toBeVisible();

    // No card, rather than a card with nothing on it.
    await expect(main.getByRole('heading', { level: 2 })).toHaveCount(0);
  });
});
