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

The unit suite lives in `src/` rather than here on purpose: colocation is
the repo's testing convention, and it keeps a pure module and its test in
one directory. This tree is for specs that need the assembled app.

Neither tree carries a shared helper module, and that is the convention
rather than an oversight: every spec imports from `src/`, from
`@playwright/test` and from nothing else. Hoisting a helper into a sibling
module changes that convention and drags every existing spec's imports
with it.

## Why this file exists

`lint` uses the explicit-path form (`eslint src tests *.ts *.mjs`), which
resolves each path itself. ESLint exits `2` — a hard failure, not a
warning — on any path that matches no lint target, and an empty directory
counts as no target. This README is a lint target (the base config lints
`**/*.md`), so it keeps the widened script green until the first spec
lands here. Removing it without a `tests/e2e/*.spec.ts` in place breaks
`bun run lint:all` repo-wide.
