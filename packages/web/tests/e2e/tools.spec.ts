import type { ExportSubscriptionSummary } from '../../src/data/connectors';
import type { Connector, ConnectorKind } from '../../src/data/types';
import type { Locator, Page } from '@playwright/test';

import { expect, test } from '@playwright/test';

import {
  fetchConnectors,
  fetchExportSubscriptions,
} from '../../src/data/api';
import { classifyConnector } from '../../src/data/connectors';
import {
  DEFAULT_DOMAIN_SLUG,
  SPARSE_DOMAIN_SLUG,
  getDomain,
} from '../../src/data/domains';
import {
  CONNECTOR_KIND_FACETS,
  NOTHING_CONFIGURED_LABEL,
  cadenceLabel,
  configEntries,
  connectorCountLabel,
  connectorStatusFacet,
  formatFacet,
  kindFacet,
  unsubscribedFormats,
  unsubscribedLabel,
} from '../../src/pages/tools/cards';
import {
  REACHED_SENTENCE,
  testConnection,
} from '../../src/pages/tools/connectionTest';
import {
  connectorFields,
  connectorSavePayload,
  openConnectorDraft,
  withConnectorField,
} from '../../src/pages/tools/editor';
import {
  SINGLE_DOMAIN_BASE,
  SURFACES,
  domainBase,
  getSurface,
  withBase,
} from '../../src/routes/paths';

// Every expected name, config entry, sentence, cadence and refusal
// below is read out of the app's own pure modules, so this file spells
// no fixture connector, no subscription and no operator-facing string
// of its own. What it does spell is ACCESSIBLE NAMES: `ToolsPage.tsx`
// and `ConnectorEditorModal.tsx` build them from literals and are
// `.tsx` files nothing here may import — a spec that touches
// `document` at import time never loads. Each one is a named constant
// beside the control it addresses.
//
// What this adds over the unit suites — `pages/tools/cards.test.ts`
// drives the facets, the config lines and the toggle arithmetic,
// `editor.test.ts` the field table, the movers and every refusal, and
// `connectionTest.test.ts` every outcome — is the ASSEMBLY. Six things
// only a browser can answer: that a card is wired to the sub-route at
// all, that the two differently-SCOPED reads really are independent
// under a domain switch, that the kind control rebuilds the branch it
// is above, that a refused reading reaches a channel that survives
// being looked away from, that a blank secret leaves the payload
// rather than being echoed back, and that a delivery flip is recorded
// where a later read of the surface finds it.
//
// ## The two reads are the point of this surface
//
// A connector is DEPLOYMENT-level and a subscription is DOMAIN-level,
// so the domain-switch case reads both halves either side of one
// gesture. Its Arrange asserts the two domains' delivery lists differ
// before the switch: without that the case would pass against a page
// that read nothing at all.
//
// ## The modal hides the surface from every role locator
//
// `Modal` is a Radix dialog, and an open one sets `aria-hidden` on the
// app root: with the editor up, `page.getByRole('main')` resolves to
// ZERO elements and so does everything scoped under it. Every grid and
// toggle assertion here is taken before an editor opens or after it
// has closed, never beside one.
//
// ## A delivery is addressed by POSITION
//
// `DecoratedToggle` renders one `button` per option whose accessible
// name is the run-together text of every slot it was given, and the
// seeded domain subscribes to one format TWICE (two destinations), so
// no name is unique. The options are drawn in the order the accessor
// answered, so `nth(index)` against that list is the reading that
// stays honest — and it is also what makes membership and order one
// assertion rather than two.
//
// ## What a blank secret really does to the fixture seam
//
// `connectorSavePayload` OMITS a blank secret rather than sending an
// empty string, which is the write-only rule. What an omission MEANS
// is the seam's answer and not the rule's, and the two differ:
// `data/drafts.ts` replaces the WHOLE row, so an omitted key is a key
// the overlaid row no longer carries, where an endpoint would keep the
// stored value. `pages/tools/editor.ts` states both. So the case below
// pins what the app DOES — the key leaves, carrying neither an empty
// value nor the mask — and says so rather than asserting a wire
// behaviour nothing here implements. Asserting the mask were still on
// the card would have been the wrong test in the other direction: it
// passes just as well against an editor that echoed one back.
//
// ## Which base
//
// The single-domain base carries every case except the open gesture,
// which runs under both — the sub-route address is the one claim here
// that is base-dependent, the editor's close being relative — and the
// domain-switch case, which needs a slug in the URL to switch away
// from.
//
// ## What this file deliberately does not claim
//
// That a connector read can be refused for belonging to another
// domain. It cannot: `connectors` has no `domain_id`, so the only
// address this editor refuses is one no row answers to, and both rows
// of the rejection table below are that same refusal reached two ways.
//
// And that any save survives a reload. It does not: `data/drafts.ts`
// is module-scoped state in the TAB, which is a property of the
// fixture seam rather than of this surface, and `lexicon.spec.ts` owns
// the case that pins it.

/** Which surface this is — the list path comes off the same table. */
const TOOLS_SURFACE_ID = 'tools';

/**
 * The segment the editor sub-route occupies under a connector id.
 *
 * Spelled rather than imported: `routes/router.tsx` builds the pattern
 * and is a `.tsx` this file may not load, and `ToolsPage.tsx` keeps
 * its own copy private. The router's own unit suite is what holds the
 * two in step; here it is one literal, named once.
 */
const EDIT_SEGMENT = 'edit';

/** The accessible name `Sidebar` gives the rail's nav landmark. */
const MAIN_NAV_NAME = 'Main navigation';

/** What the two common controls are called, on screen and here. */
const NAME_FIELD_NAME = 'Name';
const KIND_CONTROL_NAME = 'Kind';

/** What the connection test's own control is called. */
const TEST_CONTROL_NAME = 'Test connection';

/**
 * What names the region a refused reading is announced in.
 *
 * The toast overrides `Toast`'s own `role="status"` with `alert`, and
 * carries a name because the frame's save-failure banner is an alert
 * too — so this constant is what tells the two apart.
 */
const TEST_TOAST_NAME = 'Connection test result';

/** What `Toast` calls the control that takes a reading away. */
const TOAST_DISMISS_NAME = 'Dismiss';

/** The footer's two controls, addressed by name in every case. */
const SAVE_NAME = 'Save';
const CANCEL_NAME = 'Cancel';

/** How the editor titles a connector read that came back rejected. */
const REJECTED_TITLE = 'This connector could not be read';

/**
 * What the header falls back to while no connector is loaded.
 *
 * Asserted over a rejected read rather than assumed: `Modal` draws its
 * close button and the dialog's accessible name only when it is given
 * a title, so a refusal that dropped the header would leave an unnamed
 * dialog dismissable by Escape alone.
 */
const PLACEHOLDER_TITLE = 'Connector';

/**
 * What names the region the save refusals are read out of.
 *
 * Asserted ABSENT over a rejected read: there is no draft for anything
 * to be wrong with, so the region goes with the controls.
 */
const REFUSED_REGION_NAME = 'Why this connector cannot be saved';

/** How the deliveries section titles a domain that subscribes to none. */
const EMPTY_DELIVERIES_TITLE = 'No deliveries yet';

/**
 * What this file types into a connector's non-secret setting field.
 *
 * Authored here rather than derived, because it is the operator's own
 * typing — the one thing on this surface that cannot come out of a
 * fixture. It carries a marker of its own so it can never be mistaken
 * for a seeded value, and the case asserts it differs from what was
 * stored before it types it.
 */
const REWRITTEN_SETTING = 'spec-rewritten-setting';

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

/** The tools list path under a base. */
function listPath(base: string): string {
  return withBase(base, TOOLS_SURFACE_ID);
}

/** One connector's editor path under a base. */
function editPath(base: string, entityId: number | string): string {
  return `${listPath(base)}/${entityId}/${EDIT_SEGMENT}`;
}

/**
 * The deployment's connectors, through the page's own accessor.
 *
 * @returns Them, in the order the fixture keeps.
 * @throws If the deployment configures none.
 */
async function deploymentConnectors(): Promise<readonly Connector[]> {
  const connectors = await fetchConnectors();

  // A fixture set that lost its rows would leave every loop below
  // asserting nothing, and passing.
  expect(connectors.length).toBeGreaterThan(0);

  return connectors;
}

/**
 * One domain's standing deliveries, through the page's own accessor.
 *
 * @param slug - Whose deliveries are wanted.
 * @returns Them, in the order the accessor answered.
 */
function deliveriesOf(
  slug: string,
): Promise<readonly ExportSubscriptionSummary[]> {
  return fetchExportSubscriptions(slug);
}

/**
 * The seeded domain's deliveries, which every toggle case drives.
 *
 * @returns Them, in read order.
 * @throws If the seeded domain subscribes to nothing.
 */
async function seededDeliveries(): Promise<
  readonly ExportSubscriptionSummary[]
> {
  const deliveries = await deliveriesOf(DEFAULT_DOMAIN_SLUG);

  expect(deliveries.length).toBeGreaterThan(0);

  return deliveries;
}

/**
 * One connector's card, located from the heading that names it.
 *
 * `EntityCard` renders a `div` with no role and no landmark, so the
 * only stable way in is its heading — which IS a role, and IS the
 * card's name. Two steps up from there is the card root: the heading
 * sits in the header row, and the header row in the card. Stated once
 * here rather than at each call site, so that shape is one edit.
 *
 * @param main - The content landmark.
 * @param name - The connector's name, which is its identity.
 * @returns The card root.
 */
function connectorCard(main: Locator, name: string): Locator {
  return main
    .getByRole('heading', { level: 2, name, exact: true })
    .locator('xpath=../..');
}

/**
 * Which connectors the grid is drawing, in the order it draws them.
 *
 * Read off the card headings, which carry the name and nothing else —
 * so one locator answers both membership and order without this file
 * knowing how a card is marked up. The deliveries section contributes
 * no heading at this level, so the reading is the grid's alone.
 *
 * @param main - The content landmark.
 * @returns The names, in draw order.
 */
function readConnectorNames(main: Locator): Promise<readonly string[]> {
  return main.getByRole('heading', { level: 2 }).allTextContents();
}

/**
 * The card's open gesture, which `EntityCard` renders as the title
 * button with its hit area stretched over the whole card.
 *
 * @param main - The content landmark.
 * @param name - Which card to open.
 * @returns The button.
 */
function openCardControl(main: Locator, name: string): Locator {
  return main.getByRole('button', { name, exact: true });
}

/**
 * What a card's config block is showing, key by key.
 *
 * The block is a `dl`, so its two halves are addressable as roles and
 * neither reading needs a class or a structural walk. They are
 * answered separately rather than zipped: a length that disagreed
 * would be swallowed by a pairing built here, and comparing each list
 * against the page's own `configEntries` catches it as an ordering
 * difference instead.
 *
 * @param card - The card root.
 * @returns Its stored keys, in payload order.
 */
function readConfigKeys(card: Locator): Promise<readonly string[]> {
  return card.getByRole('term').allTextContents();
}

/**
 * What a card's config block is showing under each key.
 *
 * @param card - The card root.
 * @returns Its stored values as the card draws them, in payload order.
 */
function readConfigValues(card: Locator): Promise<readonly string[]> {
  return card.getByRole('definition').allTextContents();
}

/**
 * Which deliveries the toggle list is drawing as ON, in draw order.
 *
 * A whole list rather than one row: the state of every option is one
 * reading of the collection the accessor answered, and a flip that
 * moved somebody else's row shows up here as a difference rather than
 * as an assertion nobody made.
 *
 * @param main - The content landmark.
 * @returns One flag per option, in the order the list draws them.
 */
function readDeliveryStates(main: Locator): Promise<readonly boolean[]> {
  return main.getByRole('switch').evaluateAll((nodes) => nodes.map(
    (node) => node.getAttribute('aria-checked') === 'true',
  ));
}

/**
 * The config keys the editor draws a control for, for one kind.
 *
 * @param kind - The connector's kind.
 * @returns Its keys, in the order the form draws them.
 */
function fieldKeys(kind: ConnectorKind): readonly string[] {
  return connectorFields(kind).map((field) => field.key);
}

/**
 * Assert the editor is drawing exactly the controls one kind declares.
 *
 * The whole textbox roster rather than a per-key visibility check: the
 * name box is the first of them on every kind, the branch follows in
 * form order, and a field the table no longer declares is a count
 * difference rather than an assertion nobody wrote.
 *
 * @param dialog - The open editor.
 * @param kind - The kind whose branch is expected.
 */
async function expectFieldsFor(
  dialog: Locator,
  kind: ConnectorKind,
): Promise<void> {
  const expected = [NAME_FIELD_NAME, ...fieldKeys(kind)];
  const boxes = dialog.getByRole('textbox');

  await expect(boxes).toHaveCount(expected.length);

  for (const [index, name] of expected.entries()) {
    await expect(boxes.nth(index)).toHaveAccessibleName(name);
  }
}

/**
 * What the kind control is offering right now.
 *
 * The panel is addressed on the PAGE rather than inside the dialog:
 * `Select` is a Radix dropdown and renders its menu through a portal,
 * so it is a sibling of the modal and not a descendant.
 *
 * @param page - The page the editor is open on.
 * @returns The offered kinds, in offer order.
 */
async function openKindLadder(page: Page): Promise<readonly string[]> {
  await page
    .getByRole('dialog')
    .getByRole('button', { name: KIND_CONTROL_NAME })
    .click();

  return page
    .getByRole('menu')
    .getByRole('menuitemradio')
    .allTextContents();
}

/**
 * Play the connector as another kind, through its own control.
 *
 * @param page - The page the editor is open on, with the ladder open.
 * @param label - The kind's label, as the facets name it.
 */
async function chooseKind(page: Page, label: string): Promise<void> {
  await page
    .getByRole('menu')
    .getByRole('menuitemradio', { name: label, exact: true })
    .click();
}

/** What the rail calls this surface, which is how a case clicks it. */
const TOOLS_TITLE = getSurface(TOOLS_SURFACE_ID).title;

/** A surface to navigate away to, so the return is a real navigation. */
const AWAY_SURFACE = first(
  SURFACES.filter((surface) => surface.id !== TOOLS_SURFACE_ID),
  'surface other than the tools surface',
);

/** The two bases the open gesture is driven under. */
const BASES = [
  { label: 'single-domain base', base: SINGLE_DOMAIN_BASE },
  { label: 'domain base', base: domainBase(DEFAULT_DOMAIN_SLUG) },
] as const;

/** One address a connector read is expected to refuse. */
interface Rejection {
  /** Names the claim, so a failing title says which leg it is. */
  readonly what: string;
  /**
   * The address to open, built from the deployment's own connectors.
   *
   * @param connectors - Every configured connector.
   * @returns The editor address.
   */
  readonly path: (connectors: readonly Connector[]) => string;
}

/**
 * The two ways this editor is asked for a connector it cannot have.
 *
 * `data/api.ts` answers both with one message, which is what a scoped
 * endpoint answers too — so they are driven as one table rather than
 * as two cases that happen to assert the same string. There is no
 * third leg: a connector belongs to the deployment rather than to a
 * domain, so no address can ask this editor for somebody else's row.
 */
const REJECTIONS: readonly Rejection[] = [
  {
    what: 'an id no connector carries',
    path: (connectors) => editPath(
      SINGLE_DOMAIN_BASE,
      // Past every configured id, so a deployment that grows cannot
      // quietly make this address a real connector.
      Math.max(...connectors.map((connector) => connector.id)) + 1,
    ),
  },
  {
    what: 'a segment that is not a number at all',
    // `:entityId` is required but unconstrained, so this is a live
    // address rather than a 404: `Number` answers `NaN`, no connector
    // carries it, and the read refuses through the same branch.
    path: () => editPath(SINGLE_DOMAIN_BASE, 'not-a-connector'),
  },
];

test.describe('a connector id no fixture carries', () => {
  for (const { what, path } of REJECTIONS) {
    test(`reports the rejected read given ${what}`, async ({ page }) => {
      // Arrange
      const connectors = await deploymentConnectors();
      const address = path(connectors);

      // Act
      await page.goto(address);

      // Assert — the editor opened at the address asked for and stated
      // what it could not read. Auto-retrying, because the cache
      // retries a rejected read once before it settles: a single read
      // taken on arrival sees the aria-hidden loading stand-in and
      // reports an empty modal.
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

      // The refusal STANDS IN for the controls rather than sitting
      // above them: an editor drawing a kind ladder and empty boxes
      // over a connector nothing answers to would be an invitation to
      // configure a service that is not there. The refusal region and
      // the connection test go with them — there is no draft for
      // either to have anything to say about.
      await expect(dialog.getByRole('textbox')).toHaveCount(0);
      await expect(
        dialog.getByRole('button', { name: KIND_CONTROL_NAME }),
      ).toHaveCount(0);
      await expect(
        dialog.getByRole('button', { name: TEST_CONTROL_NAME }),
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

  test('renders the editor for an id one does carry', async ({ page }) => {
    // The control for the two legs above, varied along the axis under
    // test and nothing else: the same address shape, the same route,
    // one real id. Without it every assertion above passes against an
    // editor that refused every connector in the deployment.
    //
    // Arrange
    const connector = first(await deploymentConnectors(), 'connector');

    // Act
    await page.goto(editPath(SINGLE_DOMAIN_BASE, connector.id));

    // Assert — the row was read, so the header names it and the branch
    // its kind declares is on screen.
    const dialog = page.getByRole('dialog');

    await expect(
      dialog.getByRole('heading', { name: connector.name, exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByText(REJECTED_TITLE, { exact: true }),
    ).toHaveCount(0);
    await expectFieldsFor(dialog, connector.kind);
  });

  test('leaves the grid standing behind it', async ({ page }) => {
    // Arrange
    const connectors = await deploymentConnectors();
    const missingId = Math.max(
      ...connectors.map((connector) => connector.id),
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
      .poll(() => readConnectorNames(main))
      .toEqual(connectors.map((connector) => connector.name));
  });
});

/**
 * The connectors whose stored configuration the test refuses, and the
 * ones it reads an address out of.
 *
 * Split rather than chosen, so neither the refusal case nor its
 * control is pinned to a fixture id — and asserted non-empty on BOTH
 * sides in the case that drives them, which is what says the fixtures
 * still straddle the reading rather than having drifted to one side.
 *
 * The draft is what is read, not the stored row: the editor opens on
 * `openConnectorDraft`, and the control below runs the test over
 * whatever is in front of the operator.
 *
 * @param connectors - Every configured connector.
 * @returns The two partitions.
 */
function partitionByTest(connectors: readonly Connector[]): {
  refusing: readonly Connector[];
  reaching: readonly Connector[];
} {
  const outcome = (connector: Connector) => {
    const opened = openConnectorDraft(connector);

    return testConnection(opened.kind, opened.config);
  };

  return {
    refusing: connectors.filter((connector) => !outcome(connector).reached),
    reaching: connectors.filter((connector) => outcome(connector).reached),
  };
}

test.describe('a failing connection test', () => {
  test('raises the danger toast and keeps it until dismissed', async ({
    page,
  }) => {
    // Arrange — the sentence is the module's own, read over the very
    // draft the editor will open on.
    const connectors = await deploymentConnectors();
    const { refusing, reaching } = partitionByTest(connectors);

    // Both sides non-empty, or this case and its control below are
    // measuring a reading the fixtures have drifted off one end of.
    expect(refusing.length).toBeGreaterThan(0);
    expect(reaching.length).toBeGreaterThan(0);

    const connector = first(refusing, 'connector the test refuses');
    const opened = openConnectorDraft(connector);
    const outcome = testConnection(opened.kind, opened.config);

    // Narrows the union for the sentence below, and says out loud what
    // the partition already arranged.
    expect(outcome.reached).toBe(false);

    const sentence = outcome.sentence;

    await page.goto(editPath(SINGLE_DOMAIN_BASE, connector.id));

    const dialog = page.getByRole('dialog');
    const toast = page.getByRole('alert', { name: TEST_TOAST_NAME });
    const testControl = dialog.getByRole('button', {
      name: TEST_CONTROL_NAME,
    });

    // Nothing before the press, which is what says the reading below
    // arrived rather than having been on screen all along.
    await expect(toast).toHaveCount(0);

    // Act
    await testControl.click();

    // Assert — the refusal is in the toast, phrased exactly as the
    // module phrased it, and NOT in the footer: which channel a
    // reading goes to is the whole of what the outcome's discriminant
    // decides.
    await expect(toast).toBeVisible();
    await expect(toast.getByText(sentence, { exact: true })).toBeVisible();
    await expect(
      dialog.getByText(REACHED_SENTENCE, { exact: true }),
    ).toHaveCount(0);

    // Act — two gestures that are not edits. The toast has no timer,
    // so what "survives" can be measured against is other work: the
    // ladder opening and closing over it, and a control taking focus
    // away from the button that raised it.
    await openKindLadder(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);

    await dialog.getByRole('textbox', { name: NAME_FIELD_NAME }).click();

    // Assert — still there, still the same sentence.
    await expect(toast).toBeVisible();
    await expect(toast.getByText(sentence, { exact: true })).toBeVisible();

    // Act — a second press replaces the reading rather than stacking a
    // second toast behind the first.
    await testControl.click();

    // Assert
    await expect(page.getByRole('alert')).toHaveCount(1);

    // Act
    await toast.getByRole('button', { name: TOAST_DISMISS_NAME }).click();

    // Assert — gone, and the keyboard is back on the control that
    // raised it rather than on the document body, which is where a
    // dismiss that unmounted itself would have left it. Inside a Radix
    // focus trap that is the worst place a keyboard can be.
    await expect(toast).toHaveCount(0);
    await expect(testControl).toBeFocused();
  });

  test('is taken away by an edit', async ({ page }) => {
    // The other half of "until dismissed", and the boundary that keeps
    // it from reading as "forever": a reading of a payload the
    // operator has since changed is a sentence about a draft that is
    // no longer on screen.
    //
    // Arrange
    const connectors = await deploymentConnectors();
    const { refusing } = partitionByTest(connectors);
    const connector = first(refusing, 'connector the test refuses');

    await page.goto(editPath(SINGLE_DOMAIN_BASE, connector.id));

    const dialog = page.getByRole('dialog');
    const toast = page.getByRole('alert', { name: TEST_TOAST_NAME });

    await dialog.getByRole('button', { name: TEST_CONTROL_NAME }).click();
    await expect(toast).toBeVisible();

    // Act — the name is the one field every kind carries, so this leg
    // does not depend on which connector the partition picked.
    await dialog
      .getByRole('textbox', { name: NAME_FIELD_NAME })
      .fill(`${connector.name}-edited`);

    // Assert
    await expect(toast).toHaveCount(0);
  });

  test('reports a readable address through the footer', async ({ page }) => {
    // The positive control for the toast case above, varied along the
    // axis under test: the same control, the same press, a
    // configuration the module reads an address out of. Without it the
    // refusal case passes against an editor that refused everything.
    //
    // Arrange
    const connectors = await deploymentConnectors();
    const { reaching } = partitionByTest(connectors);
    const connector = first(reaching, 'connector the test reads');

    await page.goto(editPath(SINGLE_DOMAIN_BASE, connector.id));

    const dialog = page.getByRole('dialog');

    // Act
    await dialog.getByRole('button', { name: TEST_CONTROL_NAME }).click();

    // Assert — the footer carries it and no toast is raised at all,
    // which is the same discriminant read from the other side.
    await expect(
      dialog.getByText(REACHED_SENTENCE, { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
});

/**
 * A connector the write-only rule has something to say about.
 *
 * Derived rather than chosen: it needs a kind that declares BOTH a
 * secret and an ordinary setting (so the case has something to edit
 * that is not the secret), and a stored payload actually carrying a
 * value under that secret key.
 *
 * @param connectors - Every configured connector.
 * @returns The row, its secret key and the setting key the case types
 * into.
 * @throws If no configured connector is in that shape.
 */
function secretBearingConnector(connectors: readonly Connector[]): {
  connector: Connector;
  secretKey: string;
  settingKey: string;
} {
  for (const connector of connectors) {
    const fields = connectorFields(connector.kind);
    const secret = fields.find((field) => field.role === 'secret');
    const setting = fields.find((field) => field.role === 'setting');

    if (secret === undefined || setting === undefined) {
      continue;
    }

    if (connector.config[secret.key] === undefined) {
      continue;
    }

    return {
      connector,
      secretKey: secret.key,
      settingKey: setting.key,
    };
  }

  throw new Error('No connector stores a secret beside a setting.');
}

test.describe('a blank secret field', () => {
  test('saves, omitting the key rather than echoing a mask', async ({
    page,
  }) => {
    // Arrange — every expectation is the app's own arithmetic over the
    // app's own row, so the card below is compared against what the
    // save actually sends rather than against a payload retyped here.
    const connectors = await deploymentConnectors();
    const { connector, secretKey, settingKey } = secretBearingConnector(
      connectors,
    );

    const opened = openConnectorDraft(connector);
    const edited = withConnectorField(opened, settingKey, REWRITTEN_SETTING);
    const saved = connectorSavePayload(edited);

    const storedEntries = configEntries(connector.config);
    const savedEntries = configEntries(saved.config);

    // Four guards, and each is about what this case measures rather
    // than about the app. The stored row has to carry the secret for
    // its disappearance to mean anything; the opened draft must not,
    // or the box below is not blank because of the rule; the payload
    // must omit it rather than blank it, which is the rule itself; and
    // the setting has to move, or the save writes nothing and every
    // assertion below is about a page that never re-read.
    expect(storedEntries.map((entry) => entry.key)).toContain(secretKey);
    expect(opened.config[secretKey]).toBeUndefined();
    expect(savedEntries.map((entry) => entry.key)).not.toContain(secretKey);
    expect(savedEntries.map((entry) => entry.value))
      .toContain(REWRITTEN_SETTING);
    expect(connector.config[settingKey]).not.toEqual(REWRITTEN_SETTING);

    await page.goto(listPath(SINGLE_DOMAIN_BASE));

    const main = page.getByRole('main');
    const card = connectorCard(main, connector.name);

    await expect
      .poll(() => readConfigKeys(card))
      .toEqual(storedEntries.map((entry) => entry.key));

    // Act
    await openCardControl(main, connector.name).click();

    const dialog = page.getByRole('dialog');
    const secretBox = dialog.getByRole('textbox', { name: secretKey });

    // Empty because the draft holds nothing for it, which is the
    // strongest available reason: there is no value behind the control
    // for any path to echo.
    await expect(secretBox).toHaveValue('');

    await dialog
      .getByRole('textbox', { name: settingKey })
      .fill(REWRITTEN_SETTING);

    // Left exactly as it was found. Filling it would be a different
    // claim — this one is about what a blank field does.
    await expect(secretBox).toHaveValue('');

    const save = dialog.getByRole('button', { name: SAVE_NAME });

    await expect(save).toBeEnabled();
    await save.click();

    // Assert — the save was accepted rather than refused, which is
    // half the claim: a blank secret is not a fault.
    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(listPath(SINGLE_DOMAIN_BASE));

    // And the card is drawn from `fetchConnectors`, which composes the
    // draft overlay — so what it shows IS the payload that was sent.
    // The secret key is gone: neither an empty value under it nor the
    // mask echoed back. Asserting the mask were still there would have
    // been the wrong test, since an editor that echoed one back passes
    // that just as well.
    //
    // Over the wire an omitted key means keep what you have; over
    // `data/drafts.ts` the whole row is replaced, so it means the key
    // leaves. `pages/tools/editor.ts` states both, and this is the one
    // the app runs.
    await expect
      .poll(() => readConfigKeys(card))
      .toEqual(savedEntries.map((entry) => entry.key));
    await expect
      .poll(() => readConfigValues(card))
      .toEqual(savedEntries.map((entry) => entry.value));

    // Act — reopened by CLICKING, never by a second `goto`: the draft
    // store is module state in the tab, and a fresh document resets
    // it. A goto-based reopen would show the seeded payload again and
    // read exactly like a save that recorded nothing.
    await openCardControl(main, connector.name).click();

    // Assert — the setting survived the round trip, the secret box is
    // still blank, and there is nothing unsaved: no path put a mask
    // back into the draft on the way through.
    await expect(
      dialog.getByRole('textbox', { name: settingKey }),
    ).toHaveValue(REWRITTEN_SETTING);
    await expect(
      dialog.getByRole('textbox', { name: secretKey }),
    ).toHaveValue('');
    await expect(
      dialog.getByRole('button', { name: SAVE_NAME }),
    ).toBeDisabled();
  });
});

test.describe('the tools surface', () => {
  test('renders the connector grid', async ({ page }) => {
    // Arrange
    const connectors = await deploymentConnectors();
    const configured = connectors.filter(
      (connector) => configEntries(connector.config).length > 0,
    );

    // Both sides of the config partition, or the empty-config sentence
    // below has no subject and the loop covers one shape twice.
    expect(configured.length).toBeGreaterThan(0);
    expect(configured.length).toBeLessThan(connectors.length);

    // Act
    await page.goto(listPath(SINGLE_DOMAIN_BASE));

    const main = page.getByRole('main');

    // Assert — one card per configured service, in the order the
    // deployment added them. Compared as a whole list rather than per
    // name, so a connector drawn twice or a grid that re-sorted fails
    // here.
    await expect
      .poll(() => readConnectorNames(main))
      .toEqual(connectors.map((connector) => connector.name));

    // And the head counts the toolkit it is drawing.
    await expect(
      main.getByText(connectorCountLabel(connectors.length), { exact: true }),
    ).toBeVisible();

    for (const connector of connectors) {
      const card = connectorCard(main, connector.name);
      const entries = configEntries(connector.config);

      // What kind of client this is, and whether it names anywhere to
      // reach — the two readings the badge row carries.
      await expect(
        card.getByText(kindFacet(connector.kind).label, { exact: true }),
      ).toBeVisible();
      await expect(
        card.getByText(
          connectorStatusFacet(classifyConnector(connector)).label,
          { exact: true },
        ),
      ).toBeVisible();

      if (entries.length === 0) {
        // A sentence rather than an empty block: a card whose bottom
        // edge borders empty space reads as a field that failed to
        // load.
        await expect(
          card.getByText(NOTHING_CONFIGURED_LABEL, { exact: true }),
        ).toBeVisible();
        continue;
      }

      // The stored payload, key by key and in the payload's own order,
      // which is what the card promises and what an operator compares
      // a token against.
      await expect
        .poll(() => readConfigKeys(card))
        .toEqual(entries.map((entry) => entry.key));
      await expect
        .poll(() => readConfigValues(card))
        .toEqual(entries.map((entry) => entry.value));
    }
  });

  test('renders this domain\'s subscription list', async ({ page }) => {
    // Arrange
    const deliveries = await seededDeliveries();
    const unsubscribed = unsubscribedLabel(unsubscribedFormats(deliveries));

    // The sentence has a subject only while some format goes
    // unsubscribed, which is a fixture property this case leans on.
    expect(unsubscribed).not.toBeNull();

    // Act
    await page.goto(listPath(SINGLE_DOMAIN_BASE));

    const main = page.getByRole('main');
    const options = main.getByRole('switch');

    // Assert — one option per standing delivery, drawn as the stored
    // flag left it. The whole list at once, so a row drawn twice or
    // out of order fails here rather than passing per name.
    await expect(options).toHaveCount(deliveries.length);
    await expect
      .poll(() => readDeliveryStates(main))
      .toEqual(deliveries.map((summary) => summary.subscription.enabled));

    for (const [index, summary] of deliveries.entries()) {
      const { subscription, connector } = summary;
      const option = options.nth(index);

      // The stored token, the words for it, the cadence and the
      // destination the accessor resolved — four readings that only
      // agree if the option was built from THIS row. Matched as
      // substrings of the run-together text: an accessible name here
      // is every slot at once, and one of them is a rendered relative
      // time this file has no business restating.
      await expect(option).toContainText(subscription.format);
      await expect(option).toContainText(
        formatFacet(subscription.format).label,
      );
      await expect(option).toContainText(
        cadenceLabel(subscription.intervalSeconds),
      );
      await expect(option).toContainText(`to ${connector.name}`);
    }

    // And what this domain receives nothing under, in one sentence
    // rather than as a row apiece.
    await expect(
      main.getByText(String(unsubscribed), { exact: true }),
    ).toBeVisible();
  });

  for (const { label, base } of BASES) {
    test(
      `opens the editor at the edit sub-route under the ${label}`,
      async ({ page }) => {
        // Arrange
        const connector = first(await deploymentConnectors(), 'connector');

        await page.goto(listPath(base));

        const main = page.getByRole('main');

        // Act — the card's own open gesture.
        await openCardControl(main, connector.name).click();

        // Assert — the address the sub-route declares under THIS base,
        // and the editor really open on that connector. The header
        // reads the STORED name, which is also a field the dialog
        // edits.
        await expect(page).toHaveURL(editPath(base, connector.id));

        const dialog = page.getByRole('dialog');

        await expect(
          dialog.getByRole('heading', { name: connector.name, exact: true }),
        ).toBeVisible();
        await expect(
          dialog.getByRole('textbox', { name: NAME_FIELD_NAME }),
        ).toHaveValue(connector.name);
      },
    );
  }
});

test.describe('a domain switch', () => {
  test('leaves the cards standing and moves the deliveries', async ({
    page,
  }) => {
    // Arrange — the two halves of this surface are scoped
    // differently, and the case is only about that if the two domains
    // really do answer differently. Asserted before the gesture: a
    // page that read nothing at all would satisfy every assertion
    // after it.
    const connectors = await deploymentConnectors();
    const seeded = await seededDeliveries();
    const sparse = await deliveriesOf(SPARSE_DOMAIN_SLUG);

    expect(sparse).toEqual([]);
    expect(sparse.length).not.toEqual(seeded.length);

    const activeName = getDomain(DEFAULT_DOMAIN_SLUG).name;
    const nextName = getDomain(SPARSE_DOMAIN_SLUG).name;
    const lead = first(connectors, 'connector');
    const leadEntries = configEntries(lead.config);

    await page.goto(listPath(domainBase(DEFAULT_DOMAIN_SLUG)));

    const main = page.getByRole('main');
    const card = connectorCard(main, lead.name);

    await expect
      .poll(() => readConnectorNames(main))
      .toEqual(connectors.map((connector) => connector.name));
    await expect(main.getByRole('switch')).toHaveCount(seeded.length);

    // Act — through the topbar switcher rather than by addressing the
    // other base directly: the claim is about a gesture an operator
    // makes with this page open.
    await page.getByRole('button', { name: activeName }).click();
    await page
      .getByRole('menu')
      .getByRole('menuitem', { name: nextName })
      .click();

    // Assert — the surface followed the switch.
    await expect(page).toHaveURL(listPath(domainBase(SPARSE_DOMAIN_SLUG)));

    // The deployment half did not move: the same cards, in the same
    // order, with the same head count and the same stored payload on
    // the one that is checked key by key. `connectors` has no
    // `domain_id`, and this is the one screen where that shows.
    await expect
      .poll(() => readConnectorNames(main))
      .toEqual(connectors.map((connector) => connector.name));
    await expect(
      main.getByText(connectorCountLabel(connectors.length), { exact: true }),
    ).toBeVisible();
    await expect
      .poll(() => readConfigKeys(card))
      .toEqual(leadEntries.map((entry) => entry.key));
    await expect
      .poll(() => readConfigValues(card))
      .toEqual(leadEntries.map((entry) => entry.value));

    // The domain half did: this domain subscribes to nothing, so the
    // section says so in a sentence rather than drawing a list with
    // nothing in it.
    await expect(main.getByRole('switch')).toHaveCount(0);
    await expect(
      main.getByText(EMPTY_DELIVERIES_TITLE, { exact: true }),
    ).toBeVisible();
  });
});

/**
 * A kind whose branch shares no key with the one a connector wears.
 *
 * Disjoint rather than merely different, so the switch below both
 * DROPS every control the stored kind declared and ADDS every control
 * the new one does — one gesture carrying both halves of the claim.
 *
 * @param kind - The kind the connector is stored as.
 * @returns The other kind and the label its control offers it under.
 * @throws If no declared kind is disjoint from this one.
 */
function disjointKind(kind: ConnectorKind): {
  kind: ConnectorKind;
  label: string;
} {
  const held = new Set(fieldKeys(kind));
  const facet = CONNECTOR_KIND_FACETS.find(
    (candidate) => candidate.kind !== kind
      && fieldKeys(candidate.kind).every((key) => !held.has(key)),
  );

  if (facet === undefined) {
    throw new Error(`No kind declares a branch disjoint from: ${kind}`);
  }

  return { kind: facet.kind, label: facet.label };
}

test.describe('a kind switch', () => {
  test('swaps the branch fields', async ({ page }) => {
    // Arrange
    const connector = first(await deploymentConnectors(), 'connector');
    const other = disjointKind(connector.kind);

    // The branch has to have something in it, or "swaps" is a claim
    // about two empty lists.
    expect(fieldKeys(connector.kind).length).toBeGreaterThan(0);
    expect(fieldKeys(other.kind).length).toBeGreaterThan(0);

    await page.goto(editPath(SINGLE_DOMAIN_BASE, connector.id));

    const dialog = page.getByRole('dialog');

    await expectFieldsFor(dialog, connector.kind);

    // Act — the ladder first, because what it offers is the other half
    // of this claim: the option list is built from the same facets the
    // card's badge is, so a kind the control could not offer is one no
    // row could be moved to.
    const offered = await openKindLadder(page);

    expect(offered).toEqual(
      CONNECTOR_KIND_FACETS.map((facet) => facet.label),
    );

    await chooseKind(page, other.label);

    // Assert — the branch is the new kind's, the old kind's controls
    // are gone, and the control above them reports what was chosen.
    await expectFieldsFor(dialog, other.kind);
    await expect(
      dialog.getByRole('button', { name: KIND_CONTROL_NAME }),
    ).toHaveText(other.label);

    for (const key of fieldKeys(connector.kind)) {
      await expect(
        dialog.getByRole('textbox', { name: key }),
      ).toHaveCount(0);
    }

    // Every new control is EMPTY, which is the part an operator has to
    // be able to see: the mover empties the config outright, because
    // no other client could use what the last one was configured with.
    for (const key of fieldKeys(other.kind)) {
      await expect(dialog.getByRole('textbox', { name: key })).toHaveValue('');
    }
  });

  test('declines the kind the row already wears', async ({ page }) => {
    // A `menuitemradio` re-chosen at its current value reports that
    // value, and the mover empties a config whatever kind it is
    // handed. So an ordinary click on the selected item would discard
    // a whole configuration, and the only clue would be the fields
    // going blank. This is the guard that stops it.
    //
    // Arrange
    const connector = first(await deploymentConnectors(), 'connector');
    const opened = openConnectorDraft(connector);
    const held = kindFacet(connector.kind);
    const settled = connectorFields(connector.kind).filter(
      (field) => opened.config[field.key] !== undefined,
    );

    // A kind whose opened draft carries nothing would leave every
    // assertion below comparing an empty box against an empty box.
    expect(settled.length).toBeGreaterThan(0);

    await page.goto(editPath(SINGLE_DOMAIN_BASE, connector.id));

    const dialog = page.getByRole('dialog');
    const save = dialog.getByRole('button', { name: SAVE_NAME });

    await expect(save).toBeDisabled();

    // Act
    await openKindLadder(page);
    await chooseKind(page, held.label);

    // Assert — the menu closed on the click, so the gesture really was
    // made, and nothing behind it moved.
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expectFieldsFor(dialog, connector.kind);

    for (const field of settled) {
      await expect(
        dialog.getByRole('textbox', { name: field.key }),
      ).toHaveValue(String(opened.config[field.key]));
    }

    // And the footer still has nothing to report, which is what says
    // no draft was written at all.
    await expect(save).toBeDisabled();
  });
});

test.describe('a format toggle', () => {
  test('persists across a navigation away and back', async ({ page }) => {
    // Arrange
    const deliveries = await seededDeliveries();
    const stored = deliveries.map((summary) => summary.subscription.enabled);
    const index = stored.indexOf(true);

    // Something has to be on for a flip to be a flip.
    expect(index).toBeGreaterThanOrEqual(0);

    const flipped = stored.map(
      (enabled, position) => (position === index
        ? !enabled
        : enabled),
    );

    // The two readings have to differ, or every assertion below is
    // satisfied by a control that recorded nothing.
    expect(flipped).not.toEqual(stored);

    await page.goto(listPath(SINGLE_DOMAIN_BASE));

    const main = page.getByRole('main');

    await expect.poll(() => readDeliveryStates(main)).toEqual(stored);

    // Act — the flip goes through the write and comes back through the
    // read the list is drawn from, so the polled state moving is the
    // whole round trip rather than the control's own memory of a
    // click.
    await main
      .getByRole('switch')
      .nth(index)
      .click();

    // Assert
    await expect.poll(() => readDeliveryStates(main)).toEqual(flipped);

    // Act — away and back through the rail, which is a client-side
    // navigation. A `goto` would be a fresh document, and the draft
    // store is module state in the TAB: it would reset, and the
    // assertion below would read exactly like a flip that recorded
    // nothing.
    const nav = page.getByRole('navigation', { name: MAIN_NAV_NAME });

    await nav
      .getByRole('button', { name: AWAY_SURFACE.title, exact: true })
      .click();
    await expect(page).toHaveURL(
      withBase(SINGLE_DOMAIN_BASE, AWAY_SURFACE.id),
    );

    await nav
      .getByRole('button', { name: TOOLS_TITLE, exact: true })
      .click();
    await expect(page).toHaveURL(listPath(SINGLE_DOMAIN_BASE));

    // Assert — the list is drawn again, from the seam, and the flip is
    // still in it.
    await expect(main.getByRole('switch')).toHaveCount(deliveries.length);
    await expect.poll(() => readDeliveryStates(main)).toEqual(flipped);
  });
});
