import { defineConfig, devices } from '@playwright/test';

// 5174, not vite's default 5173, and `--strictPort` on top of it. Two
// separate properties: a developer's own `bun run dev` must never be
// reused as the suite's server (it may be serving a dirty tree), and a
// busy port has to fail LOUDLY — without `--strictPort` vite slides to
// the next free port and Playwright then waits out its timeout against a
// URL nothing serves, which reads as a slow app rather than as a taken
// port. `AR_WEB_E2E_PORT` is the escape hatch when 5174 is occupied.
//
// Kept as a string on purpose: it is spliced into a URL and a CLI flag,
// and parsing it here would add a helper this package has no runner for
// (the vitest include reads `src/`, never a package-root config).
const PORT = process.env['AR_WEB_E2E_PORT'] ?? '5174';

// 127.0.0.1 rather than `localhost` on both sides — the bind address and
// the readiness probe are then the same literal, so a host resolving the
// name to ::1 first cannot leave the two looking at different sockets.
const HOST = '127.0.0.1';
const BASE_URL = `http://${HOST}:${PORT}`;

// 5177, one above the integration suite's 5176, and `--strictPort` on
// top of it for the two reasons all three existing configs give: a
// developer's own `bun run dev` must never be reused as the suite's
// server, and a busy port has to fail LOUDLY rather than slide to the
// next free one. A fourth distinct number is what lets a fourth server
// coexist with the other three over the one app.
// `AR_WEB_DEVTOOLS_PORT` is the escape hatch when 5177 is occupied —
// `AR_WEB_` rather than `DEVTOOLS_` because it is this package's own
// config knob, a sibling of the three above, and nothing
// `@ar/dev-tools` ever reads.
//
// Kept as a string on purpose, for the reason the other three keep
// theirs: it is spliced into a URL and a CLI flag.
const DEVTOOLS_PORT = process.env['AR_WEB_DEVTOOLS_PORT'] ?? '5177';
const DEVTOOLS_BASE_URL = `http://${HOST}:${DEVTOOLS_PORT}`;

// WHY THE FORCED SPEC NEEDS A SERVER OF ITS OWN, and not a `test.use`.
//
// `@ar/dev-tools` refuses to mount when `navigator.webdriver` is true
// unless `VITE_DEVTOOLS_FORCE` is set, which is what keeps the widget
// out of every other suite in this package. Turning it ON for one spec
// is therefore a DEV-SERVER decision rather than a browser one:
//
// - Vite exposes only `VITE_`-prefixed variables of the process it was
//   STARTED in, as `import.meta.env`, and the guard reads
//   `import.meta.env?.VITE_DEVTOOLS_FORCE` in the browser. The value
//   is fixed by the time the first module is served.
// - `test.use` configures the browser CONTEXT Playwright creates long
//   after that, and there is no fixture that restarts a `webServer`
//   per spec or per project. Nothing a spec can say about itself
//   reaches the server's environment.
//
// So the override is config-level, on a SECOND server, and the spec is
// routed to it by project. Two servers rather than one override on the
// only server is also what keeps the absence control honest: the
// default project drives a build with no override at all, so its
// assertion that the trigger is absent is a real reading.
//
// Both servers start on every run of this config, a single-file run
// included — Playwright starts every `webServer` entry before it looks
// at which tests were selected.
//
// ONE array, read twice: as the forced project's `testMatch` and as the
// default project's `testIgnore`. The two lists have to be exact
// complements, and a shared constant is the only form that cannot let
// them drift — because the failure of a spec missing from them is
// SILENT rather than loud. Playwright's `testIgnore` subtracts from a
// project and its `testMatch` selects into one, so neither rejects an
// unnamed file: a dev-tools spec left out of this array is not skipped,
// it is picked up by the DEFAULT project and driven against the plain
// 5174 server, which is started with no `VITE_DEVTOOLS_FORCE` and so
// serves an app where the widget is absent BY DESIGN. Every locator in
// it then times out, and the run reads as a broken widget rather than
// as a misrouted spec. Add a dev-tools spec here in the same commit
// that adds the file.
const DEVTOOLS_SPECS = [
  'dev-tools-shell.spec.ts',
  'dev-tools-feedback.spec.ts',
  'dev-tools-boundary.spec.ts',
];

const IS_CI = Boolean(process.env['CI']);

/**
 * Playwright configuration for `@ar/web`'s end-to-end suite.
 *
 * This is the second of the package's two runners: `vitest` covers the
 * pure modules colocated under `src/`, and everything that needs the
 * assembled app in a real browser lives in `tests/e2e/`. The split, and
 * why the unit suite deliberately has no DOM, is in `tests/README.md`.
 *
 * The app under test is fixture-backed end to end — no database, no
 * `@ar/service`, no network — so a spec's only remaining source of
 * non-determinism is the browser itself. That is what the `use` block
 * pins, and it is the same argument the pages make when they pass an
 * explicit locale and a fixed `FIXTURE_NOW` rather than reading the
 * wall clock.
 *
 * Two servers and two projects, one engine. The default `chromium`
 * project drives the plain server on 5174 and runs every spec but the
 * two named in `DEVTOOLS_SPECS`; `chromium-devtools` drives a second
 * server on 5177 started with `VITE_DEVTOOLS_FORCE=1`, and runs those
 * two alone. The comment block above `DEVTOOLS_SPECS` is why that
 * variable cannot come from the specs that need it, and why a spec
 * left out of the array runs against the wrong server.
 */
export default defineConfig({
  testDir: './tests/e2e',

  // Zero, stated rather than inherited. There is nothing here for a
  // retry to absorb: the data layer resolves from memory and the server
  // is started by this config, so a second attempt that passes would be
  // hiding a real bug in the app rather than smoothing over a flaky
  // dependency.
  retries: 0,

  // A `.only` left behind passes locally and silently shrinks the CI
  // suite to a single test. On CI that is an error instead.
  forbidOnly: IS_CI,

  use: {
    baseURL: BASE_URL,

    // A rendered number, date or clock time is otherwise a property of
    // the machine running the suite: `@ar/ui`'s locale resolution falls
    // back to `navigator.language`, and its same-day relative-time rung
    // renders a LOCAL clock time, so an unpinned timezone alone is
    // enough to make a text assertion pass on one host and fail on
    // another.
    locale: 'en-US',
    timezoneId: 'UTC',

    // The app's initial theme falls back to `prefers-color-scheme` when
    // nothing is stored, so the theme spec needs a known starting point.
    colorScheme: 'light',
  },

  // Chromium alone. The cross-browser matrix belongs to `@ar/ui`'s
  // visual suite, which owns the pinned browser download this package
  // shares; a shell smoke suite needs one engine. `Desktop Chrome`
  // rather than a bare `browserName` because it freezes the viewport
  // explicitly instead of inheriting a Playwright default that can move
  // between versions.
  //
  // Two projects over that one engine, split by which server they
  // drive rather than by what they test with.
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },

      // The forced specs are the files this project must not run: they
      // drive a widget that exists only on the other server, and here
      // every locator in them would time out. Stated as the same
      // constant the other project matches on, so the pair cannot
      // drift into running a file twice or into skipping it.
      testIgnore: DEVTOOLS_SPECS,
    },
    {
      // The dev-tools shell and the feedback drawer, and nothing else.
      // `baseURL` is the 5177 server below, whose
      // `VITE_DEVTOOLS_FORCE=1` is the only reason the widget is on the
      // page at all.
      name: 'chromium-devtools',
      use: { ...devices['Desktop Chrome'], baseURL: DEVTOOLS_BASE_URL },
      testMatch: DEVTOOLS_SPECS,
    },
  ],

  // An ARRAY, which the resolved Playwright — 1.61.1, whose
  // `types/test.d.ts` declares `webServer?: TestConfigWebServer |
  // TestConfigWebServer[]` — accepts. Both entries are started before
  // the first test and both are waited on.
  webServer: [
    {
      // `bun x vite`, not `bun run dev`: the `dev` script adds `--host`,
      // which binds every interface, and carries no port of its own.
      // `bun x` rather than `bunx` is the repo-wide form — the CI runner
      // host has the bun binary but not the bunx alias symlink.
      command: `bun x vite --host ${HOST} --port ${PORT} --strictPort`,
      url: BASE_URL,

      // Locally a server already on the port is reused, which makes a
      // repeated run cheap. On CI it must not be: a leftover process
      // from an earlier job would serve a different revision than the
      // one under test, and the suite would be green about the wrong
      // build.
      reuseExistingServer: !IS_CI,
    },
    {
      // The same app and the same command, served a second time with
      // the automation override on. See the comment block above
      // `DEVTOOLS_SPECS` for why the variable has to live here rather
      // than in the specs that need it.
      command:
        `bun x vite --host ${HOST} --port ${DEVTOOLS_PORT} --strictPort`,
      url: DEVTOOLS_BASE_URL,

      // Playwright merges this over `process.env`, so naming one
      // variable leaves `PATH` and the rest of the environment intact.
      // Set on the SERVER rather than exported by hand for the reason
      // the integration config gives about its own: an exported
      // `VITE_DEVTOOLS_FORCE` would also reach a developer's `bun run
      // dev` and every other suite started from the same terminal,
      // including the default server above — which would put the widget
      // in front of the absence control and quietly make it pass for
      // the wrong reason.
      env: {
        VITE_DEVTOOLS_FORCE: '1',
      },

      // Reused when one is already listening, exactly as above.
      // `--strictPort` on a port nothing else in this repo claims means
      // the only thing that can be answering is an earlier run of this
      // same project — and here a stale one would also carry that run's
      // override rather than this one's, which is the second reason CI
      // refuses the reuse.
      reuseExistingServer: !IS_CI,
    },
  ],
});
