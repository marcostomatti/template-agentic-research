import type {
  Domain,
  NotificationChannel,
  Settings,
} from '../../src/data/types';
import type { ProfileMenuUser } from '@ar/ui';
import type { Locator, Page } from '@playwright/test';

import { expect, test } from '@playwright/test';

import {
  fetchDomains,
  fetchOperator,
  fetchSettings,
} from '../../src/data/api';
import {
  DEFAULT_DOMAIN_SLUG,
  SPARSE_DOMAIN_SLUG,
  getDomain,
} from '../../src/data/domains';
import { NOTIFICATION_CHANNELS } from '../../src/data/settings';
import {
  CADENCE_CHOICES,
  channelFacet,
  enabledChannelsLabel,
} from '../../src/pages/settings/fields';
import {
  EXPORT_FORMATS,
  cadenceLabel,
  formatFacet,
} from '../../src/pages/tools/cards';
import {
  SINGLE_DOMAIN_BASE,
  SURFACES,
  domainBase,
  getSurface,
  withBase,
} from '../../src/routes/paths';

// Every stored value, option label, cadence phrase and channel name
// below is read out of the app's own accessors and facet tables, so
// this file spells no preference of its own. What it does spell is
// ACCESSIBLE NAMES and section titles: `SettingsPage.tsx` builds them
// from literals and is a `.tsx` nothing here may import — a spec that
// touches `document` at import time never loads. Each one is a named
// constant beside the control it addresses.
//
// What this adds over `pages/settings/fields.test.ts` — which drives
// the draft, the drop-on-equal rule, every option builder and the
// channel facets — is the ASSEMBLY. Five things only a browser can
// answer: that the two operator fields really refuse a keystroke
// rather than merely looking inert, that the drop-on-equal rule
// reaches the chip an operator is actually reading, that each section
// draws its own controls rather than its stand-in, that a save is
// visible to the read the controls are drawn from, and that a surface
// whose every read takes no slug is untouched by a domain switch.
//
// ## Why the refusal case carries a positive control
//
// "Typing changed nothing" passes just as well against a page where
// typing reaches nothing at all — a lost focus, a swallowed keydown,
// a keyboard that never opened. So the same gesture is aimed at the
// topbar's own search box in the same case, and that box must take the
// text. The refusal is then the FIELD's rather than the keyboard's.
//
// ## Three readings of "refuses input", not one
//
// `SettingsPage.tsx` draws those fields `disabled` AND `readOnly`, and
// says why: the variant is the only way to disable a `Field`, and on
// its own it states how the control LOOKS rather than that the value
// is not being collected. So the case reads both — Playwright's own
// enabled-state reading, and the DOM `readOnly` PROPERTY, which is the
// half a rendered attribute cannot stand in for — before it drives
// the browser at all.
//
// ## The chip is the delta, and the button is the only save
//
// This surface has exactly one path to a save: the head's own control.
// So the revert case can claim "without a save" by never clicking it,
// and the reading that says there is nothing left to send is that
// control going dead again.
//
// ## A section is not a region
//
// `SectionCard` renders a `<section>` whose visible title is a `div`,
// and this page passes it no `aria-label` — so the sections carry no
// accessible name and are exposed as no landmark at all. They are
// located by their title text, and what proves a section RENDERED is
// its own controls: the header row is drawn either way, so a title
// assertion alone passes against a page whose every section is showing
// its loading stand-in.
//
// ## Which base
//
// The single-domain base carries every case except the domain switch,
// which needs a slug in the address to switch away from — and which
// is therefore also this file's coverage of the domain base. There is
// no sub-route under this surface for a base to change the shape of.
//
// ## What this file deliberately does not claim
//
// That a save survives a reload. It does not: `data/drafts.ts` is
// module-scoped state in the TAB, which is a property of the fixture
// seam rather than of this surface, and `lexicon.spec.ts` owns the
// case that pins it.

/** Which surface this is — the path and the title come off one table. */
const SETTINGS_SURFACE_ID = 'settings';

/** What the rail and the head both call it. */
const SETTINGS_TITLE = getSurface(SETTINGS_SURFACE_ID).title;

/** The accessible name `Sidebar` gives the rail's nav landmark. */
const MAIN_NAV_NAME = 'Main navigation';

/** What the head's one control is called. */
const SAVE_CONTROL_NAME = 'Save preferences';

/** What the chip beside the title says while a change is unsent. */
const UNSAVED_CHIP = 'Unsaved';

/**
 * The three selects, by the `ariaLabel` each is given.
 *
 * `Select` names its trigger from `ariaLabel` ALONE and carries the
 * held option's label as its TEXT, so these address a control whatever
 * it is showing and `toHaveText` is what says which option that is.
 */
const DEFAULT_DOMAIN_CONTROL = 'Default domain';
const DIGEST_FORMAT_CONTROL = 'Digest format';
const DIGEST_CADENCE_CONTROL = 'Digest cadence';

/**
 * The two operator boxes, by the label each is bound to.
 *
 * `Email` is also what `fields.ts` calls the email notification
 * channel, so the two coincide on screen — they are told apart by
 * ROLE, one being a `textbox` and the other a `switch`.
 */
const OPERATOR_NAME_CONTROL = 'Name';
const OPERATOR_EMAIL_CONTROL = 'Email';

/**
 * What each `SectionCard` on this page is titled.
 *
 * `SectionCard` draws its header whether or not the body settled, so
 * these are a membership reading and never evidence a section
 * rendered — see the file header.
 */
const SECTION_TITLES: readonly string[] = [
  'Default domain',
  'Digest defaults',
  'Notifications',
  'Operator',
];

/**
 * What this file types at a control that must not take it.
 *
 * Authored here rather than derived: it is the operator's own typing,
 * the one thing on this surface that cannot come out of a fixture. It
 * carries a marker of its own so it can never be mistaken for a
 * seeded value, and it doubles as the text the positive control must
 * end up holding.
 */
const TYPED_TEXT = 'spec-typed-text';

/** A surface to navigate away to, so the return is a real navigation. */
const AWAY_SURFACE = firstOf(
  SURFACES.filter((surface) => surface.id !== SETTINGS_SURFACE_ID),
  'surface other than the settings surface',
);

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
function firstOf<T>(values: readonly T[], what: string): T {
  const [value] = values;

  if (value === undefined) {
    throw new Error(`No ${what} in the fixtures.`);
  }

  return value;
}

/** The settings path under a base. */
function settingsPath(base: string): string {
  return withBase(base, SETTINGS_SURFACE_ID);
}

/**
 * One select's trigger, by the label it is named with.
 *
 * @param main - The content landmark.
 * @param name - The control's `ariaLabel`.
 * @returns The trigger.
 */
function selectTrigger(main: Locator, name: string): Locator {
  return main.getByRole('button', { name, exact: true });
}

/**
 * What one select is showing.
 *
 * `textContent` answers null for an element carrying none, and no
 * option label on this page is the empty string — so a trigger drawn
 * blank reads as a difference here rather than as a null nobody
 * compared.
 *
 * @param main - The content landmark.
 * @param name - The control's `ariaLabel`.
 * @returns The held option's label.
 */
async function selectValue(main: Locator, name: string): Promise<string> {
  return (await selectTrigger(main, name).textContent()) ?? '';
}

/**
 * Play one select, through its own menu.
 *
 * The panel is addressed on the PAGE rather than under `main`:
 * `Select` is a Radix dropdown and renders its menu through a portal.
 *
 * @param page - The page the surface is open on.
 * @param control - The trigger to open.
 * @param label - The option to choose, as the facets name it.
 */
async function chooseOption(
  page: Page,
  control: Locator,
  label: string,
): Promise<void> {
  await control.click();
  await page
    .getByRole('menu')
    .getByRole('menuitemradio', { name: label, exact: true })
    .click();
}

/**
 * One notification channel's switch, by the label it is bound to.
 *
 * @param main - The content landmark.
 * @param channel - Whose switch is wanted.
 * @returns The switch.
 */
function channelSwitch(main: Locator, channel: NotificationChannel): Locator {
  return main.getByRole('switch', {
    name: channelFacet(channel).label,
    exact: true,
  });
}

/**
 * Which channels the section is drawing as on, in draw order.
 *
 * A whole list rather than one row: the state of every switch is one
 * reading of the record the accessor answered, and a flip that moved
 * somebody else's channel shows up here as a difference rather than as
 * an assertion nobody made.
 *
 * @param main - The content landmark.
 * @returns One flag per switch, in the order they are drawn.
 */
function readChannelStates(main: Locator): Promise<readonly boolean[]> {
  return main.getByRole('switch').evaluateAll((nodes) => nodes.map(
    (node) => node.getAttribute('aria-checked') === 'true',
  ));
}

/**
 * The same reading, taken off a record instead of off the page.
 *
 * In `NOTIFICATION_CHANNELS` order, which is the order the section
 * renders them in and the reason that list exists at all.
 *
 * @param channels - A per-channel record.
 * @returns One flag per channel, in render order.
 */
function channelStates(
  channels: Readonly<Record<NotificationChannel, boolean>>,
): readonly boolean[] {
  return NOTIFICATION_CHANNELS.map((channel) => channels[channel]);
}

/**
 * The stored channel readings with exactly one of them flipped.
 *
 * A fresh object; the stored record is frozen through by
 * `data/settings.ts` and writing to it would throw where it stands.
 *
 * @param channels - What the deployment holds.
 * @param channel - Which one moved.
 * @returns The record the surface should read afterwards.
 */
function flipChannel(
  channels: Readonly<Record<NotificationChannel, boolean>>,
  channel: NotificationChannel,
): Readonly<Record<NotificationChannel, boolean>> {
  const next = { ...channels };

  next[channel] = !channels[channel];

  return next;
}

/** The head's save control. */
function saveControl(main: Locator): Locator {
  return main.getByRole('button', { name: SAVE_CONTROL_NAME, exact: true });
}

/** The chip beside the title, which may match nothing. */
function unsavedChip(main: Locator): Locator {
  return main.getByText(UNSAVED_CHIP, { exact: true });
}

/**
 * Assert every control this surface offers is on screen.
 *
 * Run before any composite reading below: a locator that resolves to
 * nothing AUTO-WAITS, so a read taken against a section still drawing
 * its stand-in would burn the whole case budget and be reported
 * against whatever assertion came next.
 *
 * @param main - The content landmark.
 */
async function expectControlsPresent(main: Locator): Promise<void> {
  await expect(selectTrigger(main, DEFAULT_DOMAIN_CONTROL)).toBeVisible();
  await expect(selectTrigger(main, DIGEST_FORMAT_CONTROL)).toBeVisible();
  await expect(selectTrigger(main, DIGEST_CADENCE_CONTROL)).toBeVisible();
  await expect(main.getByRole('switch'))
    .toHaveCount(NOTIFICATION_CHANNELS.length);
  await expect(
    main.getByRole('textbox', { name: OPERATOR_NAME_CONTROL }),
  ).toBeVisible();
  await expect(
    main.getByRole('textbox', { name: OPERATOR_EMAIL_CONTROL }),
  ).toBeVisible();
}

/** Everything this surface is showing, in one object. */
interface SurfaceReading {
  /** Which domain the default-domain select is holding. */
  readonly defaultDomain: string;
  /** Which renderer the digest format select is holding. */
  readonly digestFormat: string;
  /** Which cadence the digest cadence select is holding. */
  readonly digestCadence: string;
  /** Where each notification switch is, in draw order. */
  readonly channels: readonly boolean[];
  /** What the operator name box is showing. */
  readonly operatorName: string;
  /** What the operator email box is showing. */
  readonly operatorEmail: string;
}

/**
 * Read the whole surface at once.
 *
 * One object rather than six assertions, so "nothing moved" is a
 * single comparison and a control that moved on its own is reported as
 * a difference rather than going unasked. Call it only after
 * {@link expectControlsPresent}.
 *
 * @param main - The content landmark.
 * @returns What every control is holding.
 */
async function readSurface(main: Locator): Promise<SurfaceReading> {
  return {
    defaultDomain: await selectValue(main, DEFAULT_DOMAIN_CONTROL),
    digestFormat: await selectValue(main, DIGEST_FORMAT_CONTROL),
    digestCadence: await selectValue(main, DIGEST_CADENCE_CONTROL),
    channels: await readChannelStates(main),
    operatorName: await main
      .getByRole('textbox', { name: OPERATOR_NAME_CONTROL })
      .inputValue(),
    operatorEmail: await main
      .getByRole('textbox', { name: OPERATOR_EMAIL_CONTROL })
      .inputValue(),
  };
}

/** One control, with a gesture that moves it and one that puts it back. */
interface Mover {
  /**
   * Move the control off what is stored.
   *
   * `main` leads so a gesture needing no menu can declare one
   * parameter and stay assignable, which is also what keeps
   * `noUnusedParameters` quiet.
   *
   * @param main - The content landmark.
   * @param page - The page the surface is open on.
   */
  readonly move: (main: Locator, page: Page) => Promise<void>;
  /**
   * Put it back where it was found.
   *
   * @param main - The content landmark.
   * @param page - The page the surface is open on.
   */
  readonly restore: (main: Locator, page: Page) => Promise<void>;
}

/**
 * Every control on this surface an operator can move, paired with the
 * gesture that undoes it.
 *
 * The two operator boxes are deliberately absent: they collect
 * nothing, which is the claim the first case below makes about them.
 *
 * Each alternative is derived rather than spelled — the other domain
 * the deployment carries, a format the digest default is not already
 * on, a cadence this page offers that is not the stored one — so a
 * fixture that moved cannot leave a mover choosing the value it was
 * supposed to move away from.
 *
 * @param stored - What the deployment holds.
 * @param domains - The deployment's domains, in switcher order.
 * @returns One entry per movable control.
 * @throws If a fixture leaves any of them without an alternative.
 */
function movers(
  stored: Settings,
  domains: readonly Domain[],
): readonly Mover[] {
  const storedDomain = getDomain(stored.defaultDomainSlug);
  const otherDomain = firstOf(
    domains.filter((domain) => domain.slug !== stored.defaultDomainSlug),
    'domain other than the stored default',
  );
  const otherFormat = firstOf(
    EXPORT_FORMATS.filter((format) => format !== stored.digest.format),
    'export format other than the stored digest default',
  );
  const otherCadence = firstOf(
    CADENCE_CHOICES.filter(
      (seconds) => seconds !== stored.digest.intervalSeconds,
    ),
    'offered cadence other than the stored digest default',
  );
  const leadChannel = firstOf(NOTIFICATION_CHANNELS, 'notification channel');

  return [
    // The default-domain select.
    {
      move: (main, page) => chooseOption(
        page,
        selectTrigger(main, DEFAULT_DOMAIN_CONTROL),
        otherDomain.name,
      ),
      restore: (main, page) => chooseOption(
        page,
        selectTrigger(main, DEFAULT_DOMAIN_CONTROL),
        storedDomain.name,
      ),
    },
    // The digest format select.
    {
      move: (main, page) => chooseOption(
        page,
        selectTrigger(main, DIGEST_FORMAT_CONTROL),
        formatFacet(otherFormat).label,
      ),
      restore: (main, page) => chooseOption(
        page,
        selectTrigger(main, DIGEST_FORMAT_CONTROL),
        formatFacet(stored.digest.format).label,
      ),
    },
    // The digest cadence select.
    {
      move: (main, page) => chooseOption(
        page,
        selectTrigger(main, DIGEST_CADENCE_CONTROL),
        cadenceLabel(otherCadence),
      ),
      restore: (main, page) => chooseOption(
        page,
        selectTrigger(main, DIGEST_CADENCE_CONTROL),
        cadenceLabel(stored.digest.intervalSeconds),
      ),
    },
    // One notification switch, whose two gestures are the same click:
    // a toggle moved twice is a toggle back where it started.
    {
      move: (main) => channelSwitch(main, leadChannel).click(),
      restore: (main) => channelSwitch(main, leadChannel).click(),
    },
  ];
}

/** The one change the save cases send, and what it should leave behind. */
interface PendingChange {
  /** The format the digest select is moved to. */
  readonly formatLabel: string;
  /** The channel whose switch is flipped. */
  readonly channel: NotificationChannel;
  /** Where every channel stands once it has been. */
  readonly channels: Readonly<Record<NotificationChannel, boolean>>;
}

/**
 * A select and a toggle, both moved off what is stored.
 *
 * One of each on purpose: the two controls write through different
 * members of the draft — a whole key for the format, a partial record
 * for the channels — so a save that reached only one of them is a
 * difference rather than an assertion nobody made.
 *
 * @param stored - What the deployment holds.
 * @returns The change, and the channel record it produces.
 * @throws If the formats leave nothing to move to.
 */
function pendingChange(stored: Settings): PendingChange {
  const format = firstOf(
    EXPORT_FORMATS.filter((candidate) => candidate !== stored.digest.format),
    'export format other than the stored digest default',
  );
  const channel = firstOf(NOTIFICATION_CHANNELS, 'notification channel');

  return {
    formatLabel: formatFacet(format).label,
    channel,
    channels: flipChannel(stored.notificationChannels, channel),
  };
}

/**
 * Make the change, without sending it.
 *
 * @param page - The page the surface is open on.
 * @param main - The content landmark.
 * @param change - What to move.
 */
async function applyChange(
  page: Page,
  main: Locator,
  change: PendingChange,
): Promise<void> {
  await chooseOption(
    page,
    selectTrigger(main, DIGEST_FORMAT_CONTROL),
    change.formatLabel,
  );
  await channelSwitch(main, change.channel).click();
}

/** One field that shows a reading and collects nothing. */
interface InertField {
  /** Names the leg, so a failing title says which field it is. */
  readonly what: string;
  /** The label the box is bound to. */
  readonly control: string;
  /**
   * What it should be showing.
   *
   * @param operator - Who this deployment runs as.
   * @returns The value the box holds, and must go on holding.
   */
  readonly shown: (operator: ProfileMenuUser) => string;
}

/**
 * The two boxes the save above does not reach.
 *
 * `Settings` names no member either of them could be sent in, and
 * `fields.ts` gives the reason the line falls there: a select and a
 * switch can only take values this deployment already knows, and a
 * text box accepts anything.
 */
const INERT_FIELDS: readonly InertField[] = [
  {
    what: 'the name field',
    control: OPERATOR_NAME_CONTROL,
    shown: (operator) => operator.name,
  },
  {
    what: 'the email field',
    control: OPERATOR_EMAIL_CONTROL,
    shown: (operator) => operator.email,
  },
];

test.describe('the two operator fields', () => {
  for (const { what, control, shown } of INERT_FIELDS) {
    test(`refuse input at ${what}`, async ({ page }) => {
      // Arrange
      const operator = await fetchOperator();
      const held = shown(operator);

      await page.goto(settingsPath(SINGLE_DOMAIN_BASE));

      const main = page.getByRole('main');
      const box = main.getByRole('textbox', { name: control });

      await expect(box).toHaveValue(held);

      // Assert — two readings of the markup before the browser is
      // driven at all. `disabled` says how the control behaves;
      // `readOnly` says the value is not being collected, and only the
      // DOM PROPERTY says that (React reflects it to an attribute
      // whose spelling is not the one a reflexive matcher looks for).
      await expect(box).toBeDisabled();
      await expect(
        box.evaluate((node) => (node as HTMLInputElement).readOnly),
      ).resolves.toEqual(true);

      // Act — ask the browser for the focus directly, which is the
      // strongest form of the gesture: no pointer to be intercepted
      // and no ancestor to swallow a click.
      await box.evaluate((node) => {
        (node as HTMLInputElement).focus();
      });
      await page.keyboard.type(TYPED_TEXT);

      // Assert — the focus never landed and the value never moved.
      await expect(box).not.toBeFocused();
      await expect(box).toHaveValue(held);

      // The positive control, varied along the one axis under test:
      // the SAME gesture at a box that does collect. Without it every
      // assertion above is satisfied by a page where typing reaches
      // nothing at all.
      const search = page.getByRole('combobox');

      await search.evaluate((node) => {
        (node as HTMLInputElement).focus();
      });
      await page.keyboard.type(TYPED_TEXT);

      await expect(search).toBeFocused();
      await expect(search).toHaveValue(TYPED_TEXT);
    });
  }
});

test.describe('putting every control back where it was', () => {
  test('clears the unsaved chip without a save', async ({ page }) => {
    // Arrange
    const stored = await fetchSettings();
    const domains = await fetchDomains();
    const moves = movers(stored, domains);

    // A mover list that lost its entries would leave both loops below
    // doing nothing, and passing.
    expect(moves.length).toBeGreaterThan(1);

    await page.goto(settingsPath(SINGLE_DOMAIN_BASE));

    const main = page.getByRole('main');
    const save = saveControl(main);
    const chip = unsavedChip(main);

    await expectControlsPresent(main);
    await expect(chip).toHaveCount(0);
    await expect(save).toBeDisabled();

    const before = await readSurface(main);

    // Act — move every control the surface offers.
    for (const mover of moves) {
      await mover.move(main, page);
    }

    // Each one landed, or the second loop would be putting back
    // something that never moved and the chip would clear for the
    // wrong reason.
    const moved = await readSurface(main);

    expect(moved.defaultDomain).not.toEqual(before.defaultDomain);
    expect(moved.digestFormat).not.toEqual(before.digestFormat);
    expect(moved.digestCadence).not.toEqual(before.digestCadence);
    expect(moved.channels).not.toEqual(before.channels);

    await expect(chip).toBeVisible();
    await expect(save).toBeEnabled();

    // Act — put every one of them back. The save control is not
    // touched anywhere in this case: that button is the only path this
    // surface has to a save, so never clicking it is the whole of
    // "without a save".
    for (const mover of moves) {
      await mover.restore(main, page);
    }

    // Assert — the draft emptied through the drop-on-equal rule, so
    // the chip is gone and the control it feeds has nothing left to
    // send.
    await expect(chip).toHaveCount(0);
    await expect(save).toBeDisabled();
    await expect.poll(() => readSurface(main)).toEqual(before);
  });
});

test.describe('the settings surface', () => {
  test('renders every section', async ({ page }) => {
    // Arrange
    const stored = await fetchSettings();
    const operator = await fetchOperator();
    const storedDomain = getDomain(stored.defaultDomainSlug);

    // Act
    await page.goto(settingsPath(SINGLE_DOMAIN_BASE));

    // Assert — the head, which is where the save and the chip live.
    const main = page.getByRole('main');

    await expect(
      main.getByRole('heading', { level: 1, name: SETTINGS_TITLE }),
    ).toBeVisible();
    await expect(saveControl(main)).toBeDisabled();
    await expect(unsavedChip(main)).toHaveCount(0);

    // Every section is drawn once. A membership reading only: the
    // header row renders whatever state the body is in.
    for (const title of SECTION_TITLES) {
      await expect(main.getByText(title, { exact: true })).toBeVisible();
    }

    // What says each section rendered its ROWS is its own controls,
    // each holding what the deployment holds.
    await expectControlsPresent(main);

    await expect(selectTrigger(main, DEFAULT_DOMAIN_CONTROL))
      .toHaveText(storedDomain.name);
    await expect(selectTrigger(main, DIGEST_FORMAT_CONTROL))
      .toHaveText(formatFacet(stored.digest.format).label);
    await expect(selectTrigger(main, DIGEST_CADENCE_CONTROL))
      .toHaveText(cadenceLabel(stored.digest.intervalSeconds));

    // One switch per channel, named and set as the record says, in the
    // order `data/settings.ts` lists them.
    const switches = main.getByRole('switch');

    for (const [index, channel] of NOTIFICATION_CHANNELS.entries()) {
      await expect(switches.nth(index))
        .toHaveAccessibleName(channelFacet(channel).label);
      await expect(switches.nth(index))
        .toBeChecked({ checked: stored.notificationChannels[channel] });
    }

    // And the section's own chip, which is a second reading of the
    // same record: a header that disagreed with the switches under it
    // is a difference this catches and a per-switch check cannot.
    await expect(
      main.getByText(enabledChannelsLabel(stored.notificationChannels), {
        exact: true,
      }),
    ).toBeVisible();

    await expect(main.getByRole('textbox', { name: OPERATOR_NAME_CONTROL }))
      .toHaveValue(operator.name);
    await expect(main.getByRole('textbox', { name: OPERATOR_EMAIL_CONTROL }))
      .toHaveValue(operator.email);
  });
});

test.describe('a select and a toggle', () => {
  test('change and save', async ({ page }) => {
    // Arrange
    const stored = await fetchSettings();
    const change = pendingChange(stored);
    const storedStates = channelStates(stored.notificationChannels);
    const savedStates = channelStates(change.channels);

    // The two readings have to differ, or every assertion after the
    // save is satisfied by controls that recorded nothing.
    expect(savedStates).not.toEqual(storedStates);

    await page.goto(settingsPath(SINGLE_DOMAIN_BASE));

    const main = page.getByRole('main');
    const save = saveControl(main);
    const chip = unsavedChip(main);

    await expectControlsPresent(main);
    await expect(chip).toHaveCount(0);
    await expect(save).toBeDisabled();

    // Act
    await applyChange(page, main, change);

    // The chip is the page's own reading of the delta, and the control
    // that sends it comes alive with it.
    await expect(chip).toBeVisible();
    await expect(save).toBeEnabled();

    await save.click();

    // Assert — the draft emptied on success, and the controls are
    // drawn from the read the save invalidated rather than from their
    // own memory of a click: the chip clearing and the values staying
    // is the round trip.
    await expect(chip).toHaveCount(0);
    await expect(save).toBeDisabled();
    await expect(selectTrigger(main, DIGEST_FORMAT_CONTROL))
      .toHaveText(change.formatLabel);
    await expect.poll(() => readChannelStates(main)).toEqual(savedStates);
    await expect(
      main.getByText(enabledChannelsLabel(change.channels), { exact: true }),
    ).toBeVisible();
  });

  test('survive a navigation away and back', async ({ page }) => {
    // Arrange
    const stored = await fetchSettings();
    const change = pendingChange(stored);
    const savedStates = channelStates(change.channels);

    expect(savedStates)
      .not.toEqual(channelStates(stored.notificationChannels));

    await page.goto(settingsPath(SINGLE_DOMAIN_BASE));

    const main = page.getByRole('main');

    await expectControlsPresent(main);
    await applyChange(page, main, change);
    await saveControl(main).click();
    await expect(unsavedChip(main)).toHaveCount(0);

    // Act — away and back through the rail, which is a client-side
    // navigation. A `goto` would be a fresh document, and the draft
    // store is module state in the TAB: it would reset, and the
    // assertions below would read exactly like a save that recorded
    // nothing.
    const nav = page.getByRole('navigation', { name: MAIN_NAV_NAME });

    await nav
      .getByRole('button', { name: AWAY_SURFACE.title, exact: true })
      .click();
    await expect(page).toHaveURL(
      withBase(SINGLE_DOMAIN_BASE, AWAY_SURFACE.id),
    );

    await nav
      .getByRole('button', { name: SETTINGS_TITLE, exact: true })
      .click();
    await expect(page).toHaveURL(settingsPath(SINGLE_DOMAIN_BASE));

    // Assert — the surface is built again, from the seam, and what was
    // saved is still in it with nothing left unsaved.
    await expectControlsPresent(main);
    await expect(selectTrigger(main, DIGEST_FORMAT_CONTROL))
      .toHaveText(change.formatLabel);
    await expect.poll(() => readChannelStates(main)).toEqual(savedStates);
    await expect(unsavedChip(main)).toHaveCount(0);
    await expect(saveControl(main)).toBeDisabled();
  });
});

test.describe('a domain switch', () => {
  test('leaves the whole surface where it was', async ({ page }) => {
    // Arrange — at the domain base, since a switch needs a slug to
    // switch away from. The default-domain preference is deliberately
    // left alone by the change below: after the switch it goes on
    // naming the domain the address no longer does, which is what
    // tells a deployment-level preference apart from a reading of the
    // route param.
    const stored = await fetchSettings();
    const change = pendingChange(stored);
    const activeName = getDomain(DEFAULT_DOMAIN_SLUG).name;
    const nextName = getDomain(SPARSE_DOMAIN_SLUG).name;

    await page.goto(settingsPath(domainBase(DEFAULT_DOMAIN_SLUG)));

    const main = page.getByRole('main');

    await expectControlsPresent(main);

    const stock = await readSurface(main);

    await applyChange(page, main, change);
    await saveControl(main).click();
    await expect(unsavedChip(main)).toHaveCount(0);

    const saved = await readSurface(main);

    // The save moved the surface off the fixture, which is what makes
    // the comparison after the switch a reading rather than a
    // coincidence: a page that rebuilt itself from scratch would
    // satisfy an unchanged-since-mount assertion just as well.
    expect(saved).not.toEqual(stock);
    expect(saved.defaultDomain).toEqual(getDomain(
      stored.defaultDomainSlug,
    ).name);

    // Act — through the topbar switcher rather than by addressing the
    // other base directly: the claim is about a gesture an operator
    // makes with this page open.
    await page.getByRole('button', { name: activeName }).click();
    await page
      .getByRole('menu')
      .getByRole('menuitem', { name: nextName })
      .click();

    // Assert — the address moved and the chrome followed it, so the
    // switch really happened.
    await expect(page).toHaveURL(settingsPath(domainBase(SPARSE_DOMAIN_SLUG)));
    await expect(page.getByRole('button', { name: nextName })).toBeVisible();

    // And nothing on the surface did. All three reads behind it take
    // no slug, and the singleton the save recorded into is not scoped
    // to a domain either.
    await expectControlsPresent(main);
    await expect.poll(() => readSurface(main)).toEqual(saved);
    await expect(unsavedChip(main)).toHaveCount(0);
    await expect(saveControl(main)).toBeDisabled();
  });
});
