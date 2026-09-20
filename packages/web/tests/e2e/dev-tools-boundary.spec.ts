import type { AppRouteSignal } from '../../src/app-shell/appSignals';
import type { DevToolsBus } from '@ar/dev-tools';
import type { Page } from '@playwright/test';

import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';

import { DEV_CRASH_MESSAGE, DEV_CRASH_PATH } from '../../src/dev/crashRoute';
import { getSurface, SINGLE_DOMAIN_BASE, withBase } from '../../src/routes/paths';

// The other spec `chromium-devtools` runs alongside `dev-tools-shell.spec.ts`
// and `dev-tools-feedback.spec.ts` — see the `testMatch` / `testIgnore` pair
// in `../../playwright.config.ts`. Like `dev-tools-feedback.spec.ts` and
// unlike `dev-tools-shell.spec.ts`, this file drives the REAL app rather
// than the fixture harness: the crash route lives in the app's own router
// (`src/dev/crashRoute.tsx`, spread into `src/routes/router.tsx` behind
// `import.meta.env.DEV`), and "report this" needs the app's own feedback
// feature — `src/dev/devtools.ts` — mounted behind it.
//
// `DEV_CRASH_PATH` and `DEV_CRASH_MESSAGE` are imported rather than
// respelt: `src/dev/crashRoute.tsx`'s own header names this file as the
// reader of both, and a literal transcribed here could drift from the
// route it drives without either copy failing on its own.
//
// ## Reading the bus from OUTSIDE the bundle
//
// `devtoolsBus` is a module-scoped singleton inside `@ar/dev-tools` and
// nothing in this plan puts it on `window` — a Playwright page has no
// binding to reach into a closed-over ES module from outside it. What it
// DOES have is the dev server the app itself is loaded from: Vite serves
// every module it transforms at a real, fetchable URL, and a browser's
// own `import()` does not care who is asking. `@ar/web` consumes
// `@ar/dev-tools` as a linked workspace package rather than a
// pre-bundled dependency, so Vite resolves the bare specifier
// `@ar/dev-tools` to that package's real, on-disk `dist/index.js` and
// serves it under the `/@fs/<absolute path>` scheme it uses for anything
// outside its own project root — measured directly against the forced
// server: `curl`ing `/src/dev/devtools.ts` shows its `@ar/dev-tools`
// import rewritten to exactly that form, and `curl`ing the rewritten URL
// back answers the package's own transformed source.
//
// {@link DEV_TOOLS_ENTRY_FS_URL} is that same URL, built from
// `import.meta.url` rather than typed out, so it resolves to the right
// absolute path on whatever machine or checkout runs this suite — the
// same reasoning `dev-tools-feedback.spec.ts` gives for reading its PNG
// fixture off `import.meta.url` instead of a written-out path. Because
// the path is IDENTICAL to the one the app's own static import resolved
// to, the browser's module registry answers the SAME cached module
// instance for both — measured: publishing a payload from the app side
// and reading it back through a `page.evaluate` import of this URL
// answers the very payload the app published, not a second bus nobody
// wrote to.
//
// `route` rather than `error` or `artefact` is what this file reads
// back, because it is the one topic `src/dev/devtools.ts`'s own header
// names as reachable NO OTHER way: `context.ts`'s `collectFeedbackContext`
// deliberately excludes the bus's `route` topic from a filed report (the
// route is already in `location.href`), so nothing on screen or in a
// report body would otherwise say the republish happened at all.
//
// ## Why the route read is a SECOND navigation
//
// `src/dev/bridge.ts`'s own header: the layout effect's FIRST `route`
// publish lands a microtask before the bridge exists, because
// `src/main.tsx` reaches `src/dev/devtools.ts` through a dynamic import
// that resolves after the first paint. So the case below waits for the
// widget's trigger — proof the bridge has already installed — before
// navigating, and reads the bus only after a navigation that happened
// once the bridge was already listening.
//
// ## The crash-path cases are RED against the wiring as it stands today
//
// Driving `DEV_CRASH_PATH` in a real browser — the one thing no case in
// this plan could do before this file, since `AppErrorBoundary.test.ts`
// does not exist and `CrashFallback.test.ts` only ever renders the
// fallback directly, never through a boundary that actually caught
// something — shows the fallback this file asserts on does NOT draw.
// What draws instead is react-router's OWN default error boundary:
// `RenderErrorBoundary` from `react-router`'s `lib/hooks.js`, which every
// data router installs around the matched route tree whether or not any
// route declares an `errorElement`/`ErrorBoundary`, and which therefore
// sits INSIDE `<RouterProvider>` — strictly nearer the throw, in React's
// own fiber tree, than `AppErrorBoundary` wrapping `<RouterProvider>`
// from `src/main.tsx`. React resolves a thrown render error at the
// NEAREST enclosing boundary, so the outer one can never see it while no
// route in `src/routes/router.tsx` names an `errorElement`.
//
// Measured against the forced server: the page's console logs
// `Error handled by React Router default ErrorBoundary: Error: Deliberate
// crash from the dev-only crash route.` and `#root` renders react-router's
// own `<h2>Unexpected Application Error!</h2>` markup, never
// `CrashFallback`'s heading. This is a wiring gap in the earlier "boundary
// and the fallback" / "app producers" stages of this same plan — fixing
// it means giving a route in `src/routes/router.tsx` an `ErrorBoundary`
// (or an equivalent adapter) so `AppErrorBoundary` can be reached at all,
// which those stages' own files own and this task's scope does not
// reopen. Recorded in the plan's close-out notes rather than fixed here,
// the same shape `dev-tools-shell.spec.ts` records its own trigger/drawer
// z-index finding in. The cases below are written to the INTENDED
// behaviour, per this stage's own spec item, so they read GREEN the day
// that gap closes with no change to this file.
//
// Refusal-before-acceptance is this package's law for a file whose
// subject is validating input; there is no refusal case here to order,
// since every case below drives one accepting path start to finish.

/** The widget's own trigger — "the tomato". */
const TRIGGER_NAME = 'Dev tools';

/**
 * `CrashFallback.tsx`'s own `HEADING`, unexported: the one sentence that
 * tells this screen apart from react-router's own default error page,
 * which titles itself "Unexpected Application Error!" instead.
 */
const FALLBACK_HEADING = 'This page stopped working while it was rendering.';

/** `CrashFallback.tsx`'s own `REPORT_LABEL`, drawn only once a reporter
 * has announced itself installed. */
const REPORT_THIS_LABEL = 'Report this';

/**
 * The feedback drawer's accessible name — `dev-tools-feedback.spec.ts`'s
 * own `FEEDBACK_ITEM_LABEL`. `src/core/Shell.tsx` passes the chosen
 * `MenuItem.label` straight to `DevToolsDrawer`'s `label` prop through
 * `chooseItem`, and a bus-published `open-item` is routed through that
 * SAME function a menu click is — so the drawer this file's "report
 * this" opens carries the identical name.
 */
const FEEDBACK_DRAWER_LABEL = 'Report feedback';

/** The widget's own report-type field — `dev-tools-feedback.spec.ts`'s
 * own `TYPE_LABEL`. Disabled until `GET /__devtools/templates` answers. */
const REPORT_TYPE_LABEL = 'Report type';

/**
 * `drawerModel.ts`'s own `CONTEXT_LABEL`: the always-present, read-only
 * block every report carries. Mapped through this app's own
 * `reportFormAdapter.ts` onto a single-option `enum` leaf, which
 * `@ar/ui`'s `Select` draws as a Radix menu trigger `<button>` whose
 * accessible name is the field's label and whose VISIBLE text is the
 * one option's own label — here, the whole collected record, one
 * `key: value` line per fact. `truncate` clips it visually; it does not
 * touch the underlying text node `toContainText` reads.
 */
const CONTEXT_BLOCK_LABEL = 'Context';

/** The rail's own landmark name — `Sidebar.tsx`'s `SidebarNav`. */
const MAIN_NAVIGATION_LABEL = 'Main navigation';

/**
 * A surface other than the one `/` redirects to, so navigating to it is
 * unambiguously a SECOND location rather than a reload of the first.
 */
const SOURCES_SURFACE_ID = 'sources';
const SOURCES_TITLE = getSurface(SOURCES_SURFACE_ID).title;
const SOURCES_PATH = withBase(SINGLE_DOMAIN_BASE, SOURCES_SURFACE_ID);

/**
 * `@ar/dev-tools`'s built browser entry, addressed the way Vite's dev
 * server itself resolves it for this app — see this file's own header
 * for why that URL, and not a bare specifier, is what a `page.evaluate`
 * can `import()`.
 */
const DEV_TOOLS_ENTRY_FS_URL = `/@fs${fileURLToPath(
  new URL('../../../dev-tools/dist/index.js', import.meta.url),
)}`;

/**
 * Navigate to the dev-only crash route and wait for the boundary's own
 * fallback — never react-router's default one, see this file's header —
 * to have replaced it.
 *
 * @param page - The page under test.
 */
async function crashAndWaitForFallback(page: Page): Promise<void> {
  await page.goto(DEV_CRASH_PATH);
  await expect(
    page.getByRole('heading', { level: 1, name: FALLBACK_HEADING }),
  ).toBeVisible();
}

/**
 * Read `devtoolsBus.last('route')` from inside the page, over the SAME
 * module instance the app's own bridge republishes onto.
 *
 * @param page - The page under test.
 * @returns The most recent `route` payload, or `undefined` before one
 * has been republished onto the bus.
 */
async function lastPublishedRoute(
  page: Page,
): Promise<AppRouteSignal | undefined> {
  return page.evaluate(async (url: string) => {
    const mod = await import(url) as { devtoolsBus: DevToolsBus };

    return mod.devtoolsBus.last('route');
  }, DEV_TOOLS_ENTRY_FS_URL) as Promise<AppRouteSignal | undefined>;
}

test.describe('the dev-tools boundary', () => {
  test(
    'the crash route renders the fallback with the tomato still visible',
    async ({ page }) => {
      // Arrange / Act
      await crashAndWaitForFallback(page);

      // Assert — the widget is a sibling root decision 3 of
      // `.rafa/specs/q20b-1-dev-tools-shell.md` keeps outside the app's
      // own tree, so a crash inside the app's root leaves it standing.
      await expect(page.getByRole('button', { name: TRIGGER_NAME }))
        .toBeVisible();
    },
  );

  test(
    'report this opens the feedback drawer with the crash message in '
    + 'the context block',
    async ({ page }) => {
      // Arrange
      await crashAndWaitForFallback(page);

      // Act
      await page.getByRole('button', { name: REPORT_THIS_LABEL }).click();

      // Assert — the drawer opened through the bus's `open-item` rather
      // than through a menu click, and reads exactly the same either way.
      const drawer = page.getByRole('dialog', { name: FEEDBACK_DRAWER_LABEL });

      await expect(drawer).toBeVisible();

      // The context block is appended only once a template is chosen,
      // which needs `GET /__devtools/templates` to have answered — the
      // same deterministic wait `dev-tools-feedback.spec.ts` takes
      // before looking for any of the widget's own fields.
      await expect(drawer.getByLabel(REPORT_TYPE_LABEL)).toBeEnabled();

      const contextBlock = drawer.getByRole(
        'button',
        { name: CONTEXT_BLOCK_LABEL, exact: true },
      );

      await expect(contextBlock).toBeVisible();
      await expect(contextBlock).toContainText(DEV_CRASH_MESSAGE);
    },
  );

  test(
    'a navigation publishes route, read back through page.evaluate over '
    + 'the bus',
    async ({ page }) => {
      // Arrange — the digest boot, and proof the bridge is already
      // listening before anything is navigated.
      await page.goto(SINGLE_DOMAIN_BASE);
      await expect(page.getByRole('button', { name: TRIGGER_NAME }))
        .toBeVisible();

      // Act — a client-side navigation, so this reads a `route` publish
      // made AFTER the bridge installed rather than the first one, which
      // this file's header explains is lost to a race with no bridge
      // there to hear it.
      await page
        .getByRole('navigation', { name: MAIN_NAVIGATION_LABEL })
        .getByRole('button', { name: SOURCES_TITLE, exact: true })
        .click();

      await expect(
        page.getByRole('heading', { level: 1, name: SOURCES_TITLE }),
      ).toBeVisible();

      // Assert — read over the bus, not off `page.url()`: the claim is
      // that `AppLayout`'s effect reached `devtoolsBus` through the
      // bridge's republish, and a location read would say nothing about
      // whether that translation happened at all.
      const published = await lastPublishedRoute(page);

      expect(published).toMatchObject({ path: SOURCES_PATH, search: '' });
    },
  );
});
