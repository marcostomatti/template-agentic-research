import { defineConfig, devices } from '@playwright/test';

// 5175, one above the e2e suite's 5174, and `--strictPort` on top of
// it for the two reasons that config already gives: a developer's own
// `bun run dev` must never be reused as the suite's server, and a busy
// port has to fail LOUDLY rather than slide to the next free one. The
// separate number is what lets the two suites coexist — they are two
// configs over one app, and a shared port would leave whichever
// started second either waiting out its timeout or screenshotting a
// tree it did not build. `AR_WEB_VISUAL_PORT` is the escape hatch when
// 5175 is occupied.
//
// Kept as a string on purpose, for the same reason the e2e config
// keeps its own: it is spliced into a URL and a CLI flag, and parsing
// it here would add a helper no runner in this package can reach (the
// vitest include reads `src/`, never a package-root config).
const PORT = process.env['AR_WEB_VISUAL_PORT'] ?? '5175';

// 127.0.0.1 rather than `localhost` on both sides, exactly as the e2e
// config argues it: the bind address and the readiness probe are then
// the same literal, so a host resolving the name to ::1 first cannot
// leave the two looking at different sockets.
const HOST = '127.0.0.1';
const BASE_URL = `http://${HOST}:${PORT}`;

const IS_CI = Boolean(process.env['CI']);

// A relative template resolves against THIS file's own directory, so
// the baselines land in `packages/web/visual/__screenshots__/` — under
// the repo-root `.gitignore`'s unanchored `visual/` entry, which is
// the whole reason the path is spelled at all. Playwright's default
// would write a `<spec>-snapshots/` sibling inside `tests/`, which
// nothing ignores and which would put per-machine PNGs in front of
// every `git add -A`.
//
// Two further departures from that default. No `{platform}` segment:
// the set never leaves the machine that wrote it, so the segment could
// only ever hold one value. And `{-projectName}` stays, so a second
// browser added to `projects` below cannot silently overwrite
// chromium's baselines and report a diff forever.
const SNAPSHOT_PATH_TEMPLATE =
  'visual/__screenshots__/{testFileName}/{arg}{-projectName}{ext}';

/**
 * Playwright configuration for `@ar/web`'s SCREENSHOT suite.
 *
 * Deliberately OUTSIDE the default `playwright test` run, and the
 * reason is the runner's own missing-baseline behaviour rather than a
 * preference. `bun run test` is `vitest run && playwright test`, which
 * reads `playwright.config.ts` and its `tests/e2e` testDir, so nothing
 * under `tests/visual/` is reached by it. At the pinned 1.62.1
 * `updateSnapshots` defaults to `missing`, and a baseline that does
 * not exist is then WRITTEN and reported as a soft error — so the
 * first run on any machine that has none is red whichever way it goes.
 * `.github/workflows/front.yml`'s `checks` job runs `bun run test` in
 * this package on a hosted runner that has no baselines at all, so a
 * screenshot spec living in `tests/e2e/` would red that job on the
 * first push and stay red for every run after it.
 *
 * `packages/ui` answers the same problem the other way, with a
 * per-runner baseline cache keyed on its pinned browser, and this
 * package deliberately does not: wiring one is a `.github/` edit, and
 * that tree is out of scope for the wave this file landed in. Until
 * then the suite is a LOCAL reading, run by hand:
 *
 *     bun run test:visual          assert against this machine's set
 *     bun run test:visual:update   seed or refresh this machine's set
 *
 * The baselines are per-environment for the reason `@ar/ui`'s are: a
 * screenshot is a property of the host's fonts and compositor as much
 * as of the app under test. Regenerate a set; never copy one between
 * machines.
 *
 * Neither script runs a `pretest`. bun's lifecycle hook is `pre` plus
 * the WHOLE script name, so only `test` declares one here and these
 * two build nothing. Build the library first
 * (`bun run --filter '@ar/ui' build`) or the screenshots are of
 * whatever that package's gitignored `dist/` happened to hold.
 */
export default defineConfig({
  testDir: './tests/visual',

  snapshotPathTemplate: SNAPSHOT_PATH_TEMPLATE,

  // Zero, stated rather than inherited, and the e2e config's argument
  // holds here twice over: the data layer resolves from memory and the
  // server is started by this config, so a screenshot that differs
  // differs deterministically. A second attempt that matched would be
  // hiding a real difference rather than absorbing a flaky dependency.
  retries: 0,

  // No workflow runs this suite today, so `IS_CI` is false in every
  // run it currently has. The guard is stated anyway: it costs nothing
  // and it is what stops a leftover `.only` from silently shrinking
  // the set to one screenshot the day a workflow does.
  forbidOnly: IS_CI,

  use: {
    baseURL: BASE_URL,

    // Two of the three pins the e2e config carries, and they matter
    // more here because each one is rendered INTO the image rather
    // than only into an assertion. `@ar/ui`'s locale falls back
    // to `navigator.language`, and its same-day relative-time rung
    // renders a LOCAL clock time, so an unpinned host would seed
    // baselines no other machine could ever match.
    locale: 'en-US',
    timezoneId: 'UTC',

    // A known starting theme rather than a claim about what gets
    // screenshotted: the app falls back to `prefers-color-scheme` when
    // nothing is stored, and the specs drive light and dark through
    // the app's own switcher from here.
    colorScheme: 'light',
  },

  // `toHaveScreenshot`'s own defaults already disable animations, hide
  // the caret and scale to CSS pixels. None of them is restated below:
  // an `expect.toHaveScreenshot` block here would read as this suite
  // having made those decisions rather than inheriting the runner's,
  // and the next reader would have to diff them against the docs to
  // find out which.

  // Chromium alone, and `Desktop Chrome` rather than a bare
  // `browserName` so the descriptor's own settings are frozen
  // explicitly instead of inherited from a Playwright default that can
  // move between versions. A breakpoint spec overrides the viewport
  // per case; what this pins is everything else that comes with it.
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    // `bun x vite`, not `bun run dev`: the `dev` script adds `--host`,
    // which binds every interface, and carries no port of its own.
    // `bun x` rather than `bunx` is the repo-wide form — the CI runner
    // host has the bun binary but not the bunx alias symlink.
    command: `bun x vite --host ${HOST} --port ${PORT} --strictPort`,
    url: BASE_URL,

    // Reused when one is already listening, which makes a repeated run
    // cheap. `--strictPort` on a port nothing else in this repo claims
    // means the only thing that can be answering is an earlier run of
    // this same suite.
    reuseExistingServer: !IS_CI,
  },
});
