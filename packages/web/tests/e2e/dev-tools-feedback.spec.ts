import type { Locator, Page } from '@playwright/test';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';

// The other spec `chromium-devtools` runs — see the `testMatch` /
// `testIgnore` pair in `../../playwright.config.ts`. Unlike
// `dev-tools-shell.spec.ts`, which drives a fixture harness with
// features of its own, this file drives the REAL app at `/`:
// `packages/web/src/dev/devtools.ts` plugs in exactly one feature,
// `@ar/dev-tools/feedback`'s `feedbackFeature()`, which is what puts a
// single `Report feedback` row on the root menu and a matching
// `end`-placed, handle-bearing drawer behind it — see that module's
// own header, which names this file as the reading of its untestable
// member.
//
// Two things follow from driving the real app rather than a harness:
//
// - The report-type select is read off the REPO'S OWN
//   `.github/ISSUE_TEMPLATE/bug-report.yml` and `ui-feedback.yml`,
//   through `packages/web/vite.config.ts`'s `devtoolsPlugin({…,
//   templates: […]})`. Nothing here stubs `GET /__devtools/templates`
//   — that route is the very thing spec decision 1 asks this spec to
//   prove, and a stub would prove nothing about the repository's own
//   forms.
// - `POST /__devtools/report` and `POST /__devtools/comment` ARE
//   stubbed, with `page.route`: this spec asserts what the browser
//   SENDS and how the drawer reads a chosen ANSWER, neither of which
//   needs a real `rafa` binary or a real tracker. The gateway's own
//   argv contract is `packages/dev-tools/src/vite/gateway/rafa.test.ts`'s.
//
// Screenshot CAPTURE is not driven — a display-media prompt cannot be
// accepted under automation — so the drop zone is, with the fixture
// PNG `./fixtures/devtools-feedback-screenshot.png` (see
// `./fixtures/README.md` for what it is and how it was made).
//
// `ReportForm.tsx`'s own header records that the drawer holds TWO
// controls named `Pick element`: this form's own action button, an
// `IconButton` beside the `Element selector` field, and the
// package's `ElementPicker.tsx`, drawn as a sibling of the whole
// form. This spec drives the FORM's — scoped to the
// `role="group"` named `Report` `src/dynamic-form/NodeForm.tsx`
// draws — which is also the only reading anywhere of `ReportForm.tsx`'s
// own tagging and forwarding, per that file's header: "the permanent
// reading is the forced e2e spec this plan's E2E stage adds."
//
// Refusals before accepting cases, per this plan's law: "an empty
// title is refused" is driven before any of the four cases that submit
// a report successfully.
//
// Spec item 7's name for the duplicate confirmation is "also
// affected", and it is the only name used anywhere below.

/** The trigger's accessible name — `@ar/dev-tools`'s own default. */
const TRIGGER_NAME = 'Dev tools';

/** The root menu panel's accessible name. */
const MENU_NAME = 'Dev tools menu';

/**
 * What the row an operator clicks reads, and the drawer's own
 * accessible name — `src/core/Shell.tsx` passes the chosen
 * `MenuItem.label` straight to `DevToolsDrawer`'s `label` prop.
 */
const FEEDBACK_ITEM_LABEL = 'Report feedback';

/** The widget's own report-type field. */
const TYPE_LABEL = 'Report type';

/** ...and its title field. */
const TITLE_LABEL = 'Title';

/** What the two shipped issue forms are called, in listed order. */
const BUG_REPORT_TEMPLATE_NAME = 'Bug report';
const UI_FEEDBACK_TEMPLATE_NAME = 'UI feedback';

/** `ui-feedback.yml`'s one required textarea body item. */
const WHAT_LOOKS_WRONG_LABEL = 'What looks wrong';

/** The widget's own element-selector field — `drawerModel.ts`'s label. */
const ELEMENT_SELECTOR_LABEL = 'Element selector';

/**
 * The selector field's action button, under the app's `DynamicForm`
 * adapter — `reportFormAdapter.ts`'s `PICK_ELEMENT_ACTION_LABEL`.
 * `ElementPicker.tsx`'s OWN button carries the identical text, which
 * is why every locator below scopes this one to the form's `group`.
 */
const PICK_ELEMENT_LABEL = 'Pick element';

/**
 * What `reportFormAdapter.ts` calls the root of the mapped form —
 * `src/dynamic-form/NodeForm.tsx` draws it as `role="group"`.
 */
const REPORT_FORM_GROUP_LABEL = 'Report';

/** The rail's own landmark name — `Sidebar.tsx`'s `SidebarNav`. */
const MAIN_NAVIGATION_LABEL = 'Main navigation';

/** A rail entry every load lands on, per `NAV_ITEMS`' first row. */
const DIGEST_NAV_LABEL = 'Digest';

/** What the submit control reads at rest. */
const SUBMIT_LABEL = 'Send report';

/** `submitRules.ts`'s sentence for a title of nothing but space. */
const TITLE_EMPTY_MESSAGE = 'A report needs a title.';

/**
 * The outcome region — a class selector because two `role="status"`
 * regions sit in one drawer once a template is chosen: this one, and
 * `DynamicForm`'s own refusal banner over the mapped fields.
 */
const OUTCOME_SELECTOR = '.devtools-feedback-outcome';

/** What this spec types into the title field for every accepted send. */
const REPORT_TITLE = 'The rail spacing looks off at this width';

/** Where the stubbed `/report` answer claims the report was written. */
const STORED_REPORT_PATH = '.rafa/feedback/round-1/fb-report.md';

/** The issue the stubbed `duplicate` answer matches. */
const DUPLICATE_ISSUE_ID = '42';
const DUPLICATE_ISSUE_TITLE = 'The rail spacing already looks off';
const DUPLICATE_ISSUE_URL = 'https://github.com/example/example/issues/42';

/**
 * The context keys `collectFeedbackContext` always writes for this
 * app: the five environment facts `context.ts` reads itself, the four
 * build values every widget host carries (`api` falls back to the
 * `unknown` sentinel rather than being omitted), the endpoint and the
 * three keys `devtools.ts`'s own `extra()` supplies, and the filing
 * module `feedbackFeature`'s derived host merges in last. `theme` (set
 * only once the app's theme effect has run) and the bus's `error` /
 * `artefact` (published by nothing in this plan) are deliberately not
 * asserted here — see `context.ts`'s own header for why a record may
 * omit either.
 */
const EXPECTED_CONTEXT_KEYS: readonly string[] = [
  'viewportWidth',
  'viewportHeight',
  'devicePixelRatio',
  'colorScheme',
  'userAgent',
  'url',
  'commit',
  'branch',
  'round',
  'api',
  'endpoint',
  'route',
  'surface',
  'dataSource',
  'module',
];

/** The fixture PNG's own bytes, read once and reused by every drop. */
const FIXTURE_PNG_BASE64 = readFileSync(
  fileURLToPath(
    new URL('./fixtures/devtools-feedback-screenshot.png', import.meta.url),
  ),
).toString('base64');

/** What the dropped fixture is named, on the wire and in the preview. */
const FIXTURE_PNG_NAME = 'devtools-feedback-screenshot.png';

/**
 * Navigate to the app, open the widget's menu and choose the one
 * feedback row.
 *
 * @param page - The page under test.
 * @returns The drawer's own `dialog` locator, already visible.
 */
async function openFeedbackDrawer(page: Page): Promise<Locator> {
  await page.goto('/');
  await page.getByRole('button', { name: TRIGGER_NAME }).click();
  await expect(page.getByRole('menu', { name: MENU_NAME })).toBeVisible();
  await page.getByRole('menuitem', { name: FEEDBACK_ITEM_LABEL }).click();

  const drawer = page.getByRole('dialog', { name: FEEDBACK_ITEM_LABEL });

  await expect(drawer).toBeVisible();

  return drawer;
}

/**
 * Wait for `GET /__devtools/templates` to have answered, which is what
 * takes the report-type select off its loading `disabled` state.
 *
 * @param drawer - The open drawer.
 * @returns The report-type `<select>` locator, enabled.
 */
async function waitForTemplates(drawer: Locator): Promise<Locator> {
  const typeSelect = drawer.getByLabel(TYPE_LABEL);

  await expect(typeSelect).toBeEnabled();

  return typeSelect;
}

/**
 * The `Pick element` control that belongs to the app's OWN form —
 * scoped to the `role="group"` `NodeForm.tsx` names after the mapped
 * root, so it never matches `ElementPicker.tsx`'s identically named
 * button beside it.
 *
 * @param drawer - The open drawer.
 * @returns The form's action button.
 */
function pickElementButton(drawer: Locator): Locator {
  return drawer
    .getByRole('group', { name: REPORT_FORM_GROUP_LABEL, exact: true })
    .getByRole('button', { name: PICK_ELEMENT_LABEL, exact: true });
}

/**
 * Stub one `/__devtools/*` route with a fixed JSON answer.
 *
 * @param page - The page under test.
 * @param path - The route, joined onto `/__devtools` (`/report` or
 * `/comment`).
 * @param body - What every request matching the route is answered
 * with.
 * @returns A reader for the JSON body the first matching request
 * carried; `undefined` until one has arrived.
 */
async function stubDevToolsRoute(
  page: Page,
  path: string,
  body: Record<string, unknown>,
): Promise<() => Record<string, unknown> | undefined> {
  let received: Record<string, unknown> | undefined;

  await page.route(`**/__devtools${path}`, async (route) => {
    const raw = route.request().postData();

    received = raw === null
      ? undefined
      : JSON.parse(raw) as Record<string, unknown>;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });

  return () => received;
}

/**
 * Drop the fixture PNG onto a drop zone as a genuine `DragEvent`
 * carrying a `File` — the one path into `DropZone.tsx`'s `offer()`
 * that file's own header names as unreachable from any unit case,
 * since a static render fires no drag handler at all.
 *
 * @param zone - The `.devtools-screenshot-zone` locator.
 */
async function dropFixturePng(zone: Locator): Promise<void> {
  await zone.evaluate((node, args: { base64: string; name: string }) => {
    const { base64, name } = args;
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const file = new File([bytes], name, { type: 'image/png' });
    const transfer = new DataTransfer();

    transfer.items.add(file);

    // Not held in a named `DragEventInit`-typed variable: that type is
    // a `lib.dom.d.ts` AMBIENT type rather than a global value, and
    // `no-undef` cannot tell the two apart — `dynamic-form.spec.ts`
    // takes the same way out, inlining the literal at each call.
    node.dispatchEvent(new DragEvent('dragenter', {
      bubbles: true,
      cancelable: true,
      dataTransfer: transfer,
    }));
    node.dispatchEvent(new DragEvent('dragover', {
      bubbles: true,
      cancelable: true,
      dataTransfer: transfer,
    }));
    node.dispatchEvent(new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer: transfer,
    }));
  }, { base64: FIXTURE_PNG_BASE64, name: FIXTURE_PNG_NAME });
}

test.describe('the feedback drawer', () => {
  test('the drawer opens from the menu', async ({ page }) => {
    // Arrange / Act
    const drawer = await openFeedbackDrawer(page);

    // Assert
    await expect(drawer).toBeVisible();
    await expect(drawer.getByLabel(TITLE_LABEL)).toBeVisible();
  });

  test('the template select lists both issue forms', async ({ page }) => {
    // Arrange
    const drawer = await openFeedbackDrawer(page);

    // Act
    const typeSelect = await waitForTemplates(drawer);

    // Assert — template order is filename order, `templates.ts` sorts
    // (or, here, the order `vite.config.ts` names the two paths in).
    await expect(typeSelect.locator('option')).toHaveText([
      BUG_REPORT_TEMPLATE_NAME,
      UI_FEEDBACK_TEMPLATE_NAME,
    ]);
  });

  test('choosing UI feedback renders its fields', async ({ page }) => {
    // Arrange
    const drawer = await openFeedbackDrawer(page);
    const typeSelect = await waitForTemplates(drawer);

    // Act
    await typeSelect.selectOption({ label: UI_FEEDBACK_TEMPLATE_NAME });

    // Assert — the template's own required field, and the widget's own
    // selector field, which `x-devtools: {selector: true}` opts this
    // form into and `bug-report.yml` does not.
    await expect(drawer.getByLabel(WHAT_LOOKS_WRONG_LABEL)).toBeVisible();
    await expect(drawer.getByLabel(ELEMENT_SELECTOR_LABEL)).toBeVisible();
  });

  test('an empty title is refused', async ({ page }) => {
    // Arrange
    const drawer = await openFeedbackDrawer(page);

    await waitForTemplates(drawer);
    await expect(drawer.getByLabel(TITLE_LABEL)).toHaveValue('');

    // Act
    await drawer.getByRole('button', { name: SUBMIT_LABEL }).click();

    // Assert
    await expect(drawer.locator(OUTCOME_SELECTOR))
      .toHaveText(TITLE_EMPTY_MESSAGE);
  });

  test(
    'the picker writes a selector for a clicked sidebar item and the '
    + 'field shows one match',
    async ({ page }) => {
      // Arrange
      const drawer = await openFeedbackDrawer(page);
      const typeSelect = await waitForTemplates(drawer);

      await typeSelect.selectOption({ label: UI_FEEDBACK_TEMPLATE_NAME });

      // Act — starting a pick collapses the drawer to its handle; see
      // `ElementPicker.tsx`'s header on why that has to be imperative.
      await pickElementButton(drawer).click();
      await expect(drawer).toHaveCount(0);

      await page
        .getByRole('navigation', { name: MAIN_NAVIGATION_LABEL })
        .getByRole('button', { name: DIGEST_NAV_LABEL, exact: true })
        .click();

      await page
        .getByRole('button', { name: `Expand ${FEEDBACK_ITEM_LABEL}` })
        .click();

      const reopened = page.getByRole('dialog', { name: FEEDBACK_ITEM_LABEL });

      // Assert
      await expect(reopened.getByLabel(ELEMENT_SELECTOR_LABEL))
        .not.toHaveValue('');
      await expect(reopened.locator('.devtools-picker-count'))
        .toHaveText('1 match');
    },
  );

  test('the drop zone accepts the fixture PNG', async ({ page }) => {
    // Arrange
    const drawer = await openFeedbackDrawer(page);

    await waitForTemplates(drawer);

    // Act
    await dropFixturePng(drawer.locator('.devtools-screenshot-zone'));

    // Assert
    const preview = drawer.locator('.devtools-screenshot-preview');

    await expect(preview).toBeVisible();
    await expect(preview.locator('figcaption')).toHaveText(FIXTURE_PNG_NAME);
    await expect(
      preview.getByRole('button', { name: 'Remove image' }),
    ).toBeVisible();
  });

  test(
    'a stubbed /__devtools/report route receives the expected context '
    + 'keys',
    async ({ page }) => {
      // Arrange
      const drawer = await openFeedbackDrawer(page);

      await waitForTemplates(drawer);
      await drawer.getByLabel(TITLE_LABEL).fill(REPORT_TITLE);

      const readReportBody = await stubDevToolsRoute(page, '/report', {
        status: 'stored',
        path: STORED_REPORT_PATH,
      });

      // Act
      await drawer.getByRole('button', { name: SUBMIT_LABEL }).click();

      // Assert — the round trip landed on the answer this stub gave,
      // which is what says the request the reader inspects next is the
      // one the submit actually sent.
      await expect(drawer.locator(OUTCOME_SELECTOR)).toHaveText(
        `Saved on this machine at ${STORED_REPORT_PATH}. It did not `
        + 'reach the tracker.',
      );

      const sent = readReportBody();

      expect(sent).toBeDefined();

      const context = sent?.context as Record<string, unknown>;

      for (const key of EXPECTED_CONTEXT_KEYS) {
        expect(context, `context is missing "${key}"`).toHaveProperty(key);
      }

      // The one filing key `devtools.ts` leaves unstated, read back as
      // the package's own default rather than merely "present".
      expect(context.module).toBe('web');
    },
  );

  test(
    'a stubbed duplicate answer shows both buttons with also affected '
    + 'posting the comment',
    async ({ page }) => {
      // Arrange
      const drawer = await openFeedbackDrawer(page);

      await waitForTemplates(drawer);
      await drawer.getByLabel(TITLE_LABEL).fill(REPORT_TITLE);

      await stubDevToolsRoute(page, '/report', {
        status: 'stored',
        path: STORED_REPORT_PATH,
        gateway: {
          status: 'duplicate',
          match: {
            id: DUPLICATE_ISSUE_ID,
            title: DUPLICATE_ISSUE_TITLE,
            url: DUPLICATE_ISSUE_URL,
          },
        },
      });

      const readCommentBody = await stubDevToolsRoute(page, '/comment', {
        status: 'commented',
        gateway: {
          status: 'filed',
          tracker: 'github',
          id: DUPLICATE_ISSUE_ID,
          url: DUPLICATE_ISSUE_URL,
        },
      });

      // Act
      await drawer.getByRole('button', { name: SUBMIT_LABEL }).click();

      // Assert — the duplicate line, the matched issue's link, and
      // spec item 7's two choices.
      await expect(drawer.locator(OUTCOME_SELECTOR)).toHaveText(
        `Already on the tracker as ${DUPLICATE_ISSUE_ID}: `
        + `${DUPLICATE_ISSUE_TITLE}`,
      );
      await expect(
        drawer.getByRole('link', { name: `Open the issue ${DUPLICATE_ISSUE_ID}` }),
      ).toBeVisible();

      const dropButton = drawer.getByRole(
        'button',
        { name: 'Drop this report' },
      );
      const alsoAffectedButton = drawer.getByRole(
        'button',
        { name: 'Also affected' },
      );

      await expect(dropButton).toBeVisible();
      await expect(alsoAffectedButton).toBeVisible();

      // Act — also affected posts the comment.
      await alsoAffectedButton.click();

      // Assert — the duplicate's two controls are gone, replaced by
      // the filed reading the stubbed comment route answered, and the
      // comment the drawer posted named the matched issue.
      await expect(drawer.locator(OUTCOME_SELECTOR))
        .toHaveText(`Filed as ${DUPLICATE_ISSUE_ID} on github.`);
      await expect(dropButton).toHaveCount(0);
      await expect(alsoAffectedButton).toHaveCount(0);

      const posted = readCommentBody();

      expect(posted).toMatchObject({ issueId: DUPLICATE_ISSUE_ID });
      expect(typeof posted?.body).toBe('string');
    },
  );
});
