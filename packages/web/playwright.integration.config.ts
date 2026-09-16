import { defineConfig, devices } from '@playwright/test';

// 5176, one above the visual suite's 5175, and `--strictPort` on top of
// it for the two reasons both other configs already give: a developer's
// own `bun run dev` must never be reused as the suite's server, and a
// busy port has to fail LOUDLY rather than slide to the next free one.
// The third distinct number is what lets three configs coexist over one
// app — a shared port would leave whichever started second either
// waiting out its timeout or driving a tree it did not build.
// `AR_WEB_INTEGRATION_PORT` is the escape hatch when 5176 is occupied.
//
// Kept as a string on purpose, for the reason the other two configs keep
// theirs: it is spliced into a URL and a CLI flag, and parsing it here
// would add a helper no runner in this package can reach (the vitest
// include reads `src/`, never a package-root config).
const PORT = process.env['AR_WEB_INTEGRATION_PORT'] ?? '5176';

// 127.0.0.1 rather than `localhost` on both sides, exactly as the other
// two configs argue it: the bind address and the readiness probe are
// then the same literal, so a host resolving the name to ::1 first
// cannot leave the two looking at different sockets. It is also the
// origin `AR_CORS_ORIGINS` has to name on the service, so the literal
// here and the one in the run-book are the same string.
const HOST = '127.0.0.1';
const BASE_URL = `http://${HOST}:${PORT}`;

// The service's own port, defaulting to 3100 rather than the service's
// own 3000 so an integration run cannot land on a locally running dev
// service and report against a database nobody seeded. The same default
// is re-derived in `tests/integration/global-setup.ts`, which probes
// `GET /health` on it; that module deliberately does not import this
// one, since Playwright loads this config in order to FIND it and the
// import would be a cycle.
const API_PORT = process.env['AR_API_PORT'] ?? '3100';
const API_URL = `http://${HOST}:${API_PORT}`;

const IS_CI = Boolean(process.env['CI']);

/**
 * Playwright configuration for `@ar/web`'s INTEGRATION suite — the only
 * one of the package's three that needs a backend.
 *
 * The other two configs drive a fixture-backed app: no database, no
 * `@ar/service`, no network. This one serves the same app with
 * `VITE_AR_API_URL` SET, which is the whole switch (`src/data/api.ts`:
 * the variable unset selects the fixture layer, any string at all
 * selects the HTTP layer), so every read and write under test crosses a
 * real socket to a real service over a real Postgres.
 *
 * Two consequences, and both are the reason this suite sits outside
 * `bun run test` rather than a preference:
 *
 * - The value is an absolute `http://127.0.0.1:<port>` rather than the
 *   dev proxy's `/api`, so the browser calls the service CROSS-ORIGIN
 *   and the suite exercises CORS — the preflight, the allow-list and
 *   the `Authorization` header's acceptance — instead of hiding it
 *   behind vite's same-origin proxy. The service must therefore be
 *   started with `AR_CORS_ORIGINS=http://127.0.0.1:5176`.
 * - Nothing here starts the service, migrates or seeds. Those are
 *   operator steps, and running the suite without them would fail as a
 *   wall of timed-out assertions against an app whose every read
 *   rejected. `globalSetup` below turns that into ONE refusal naming
 *   the run-book; the run-book is in `tests/README.md`.
 *
 * `test:integration` is the only script that reads this file, and like
 * the two visual scripts it declares NO lifecycle hook. bun's hook is
 * `pre` plus the WHOLE script name, so only `test` has one and this
 * script builds nothing at all. Build the library first
 * (`bun run --filter '@ar/ui' build`) or the app under test is assembled
 * from whatever that package's gitignored `dist/` happened to hold.
 */
export default defineConfig({
  testDir: './tests/integration',

  // Resolved against THIS file's directory, and it lives INSIDE the
  // testDir above without joining the suite: `testMatch` defaults to
  // `**/*.@(spec|test).?(c|m)[jt]s?(x)`, which a `global-setup.ts` does
  // not match. Colocated on purpose — it is the precondition check for
  // these specs and nothing else, and a package-root module would read
  // as a shared helper the tests tree deliberately has none of.
  globalSetup: './tests/integration/global-setup.ts',

  // Zero, stated rather than inherited, and it is a SHARPER claim here
  // than in the other two configs rather than a weaker one. This suite
  // does have a flaky dependency available to blame — a network hop and
  // a database — which is exactly why a retry is refused: a second
  // attempt that passed would turn a real transport or seed defect into
  // a green run, and the transport is the thing under test.
  retries: 0,

  // A `.only` left behind passes locally and silently shrinks the suite
  // to a single test. No workflow runs this suite today, so `IS_CI` is
  // false in every run it currently has; the guard is stated anyway
  // because it costs nothing and is what stops that the day one does.
  forbidOnly: IS_CI,

  use: {
    baseURL: BASE_URL,

    // The same three pins the other two configs carry, for the same
    // measured reason: `@ar/ui`'s locale resolution falls back to
    // `navigator.language` and its same-day relative-time rung renders a
    // LOCAL clock time, so an unpinned host is enough to make a text
    // assertion pass on one machine and fail on another. Live rows make
    // that worse, not better — a seeded timestamp is rendered through
    // whatever locale and zone the browser was given.
    locale: 'en-US',
    timezoneId: 'UTC',

    // A known starting theme: the app falls back to
    // `prefers-color-scheme` when nothing is stored.
    colorScheme: 'light',
  },

  // Chromium alone, and `Desktop Chrome` rather than a bare
  // `browserName` so the descriptor's own settings are frozen
  // explicitly instead of inherited from a Playwright default that can
  // move between versions. The cross-browser matrix belongs to
  // `@ar/ui`'s visual suite, which owns the pinned browser download
  // this package shares.
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

    // Playwright merges this over `process.env`, so naming one variable
    // here leaves `PATH` and the rest of the environment intact. Set on
    // the SERVER rather than exported by the run-book because it is a
    // property of this config's app-under-test, not of the shell: a
    // `VITE_AR_API_URL` exported by hand would also re-point a
    // developer's own `bun run dev` and every fixture suite started from
    // the same terminal.
    env: {
      VITE_AR_API_URL: API_URL,
    },

    // Reused when one is already listening, which makes a repeated run
    // cheap. `--strictPort` on a port nothing else in this repo claims
    // means the only thing that can be answering is an earlier run of
    // this same suite. On CI it must not be: a leftover process from an
    // earlier job would serve a different revision than the one under
    // test — and here it would also carry that run's `VITE_AR_API_URL`
    // rather than this one's.
    reuseExistingServer: !IS_CI,
  },
});
