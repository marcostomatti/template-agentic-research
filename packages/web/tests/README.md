# `@ar/web` tests

Two runners split by what they can reach:

- **Unit** (`vitest`) — colocated beside the code as `src/**/*.test.ts`,
  node environment, no DOM. Route helpers, fixture accessors and filter
  derivations are tested here, next to the module they cover.
- **End-to-end** (`playwright` via `playwright.config.ts`) — `tests/e2e/
  *.spec.ts`, driving the app through a real browser against the fixture
  data layer, on port 5174.
- **Visual** (`playwright` via `playwright.visual.config.ts`) —
  `tests/visual/*.spec.ts`, screenshotting the same app at four widths in
  both themes, on port 5175. It sits OUTSIDE `bun run test` on purpose:
  its baselines are per-machine and untracked, and CI has none, so a
  screenshot spec under `tests/e2e/` would red the hosted job on the
  first push. Run it with `bun run test:visual`.
- **Integration** (`playwright` via `playwright.integration.config.ts`) —
  `tests/integration/*.spec.ts`, driving the same app with
  `VITE_AR_API_URL` SET against a LIVE `@ar/service` over a seeded
  Postgres, on port 5176. It is the only suite in this tree that needs a
  backend, and nothing in the config starts one — so
  `tests/integration/global-setup.ts` refuses the run, before the first
  browser, when `GET /health` on the service does not answer
  `{ status: 'ok' }` or when either `AR_INTEGRATION_USER` or
  `AR_INTEGRATION_PASSWORD` carries nothing. Put the service and its data
  in place first, then run it with `bun run test:integration`.

The unit suite lives in `src/` rather than here on purpose: colocation is
the repo's testing convention, and it keeps a pure module and its test in
one directory. This tree is for specs that need the assembled app.

No tree here carries a shared helper module, and that is the convention
rather than an oversight: every spec imports from `src/`, from
`@playwright/test` and from nothing else. Hoisting a helper into a sibling
module changes that convention and drags every existing spec's imports
with it. `tests/integration/global-setup.ts` is the one non-spec module
in any of the three trees, and it is not an exception: it is named by its
config rather than imported by a spec, it imports nothing at all, and
Playwright's default `testMatch` does not match its name, so it never
joins the suite it guards.

## Why this file exists

`lint` uses the explicit-path form (`eslint src tests *.ts *.mjs`), which
resolves each path itself. ESLint exits `2` — a hard failure, not a
warning — on any path that matches no lint target, and an empty directory
counts as no target. This README is a lint target (the base config lints
`**/*.md`), so it keeps the widened script green until the first spec
lands here. Removing it without a `tests/e2e/*.spec.ts` in place breaks
`bun run lint:all` repo-wide.
