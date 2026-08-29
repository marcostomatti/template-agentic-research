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
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    // `bun x vite`, not `bun run dev`: the `dev` script adds `--host`,
    // which binds every interface, and carries no port of its own. `bun
    // x` rather than `bunx` is the repo-wide form — the CI runner host
    // has the bun binary but not the bunx alias symlink.
    command: `bun x vite --host ${HOST} --port ${PORT} --strictPort`,
    url: BASE_URL,

    // Locally a server already on the port is reused, which makes a
    // repeated run cheap. On CI it must not be: a leftover process from
    // an earlier job would serve a different revision than the one under
    // test, and the suite would be green about the wrong build.
    reuseExistingServer: !IS_CI,
  },
});
