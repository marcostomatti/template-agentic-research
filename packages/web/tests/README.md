# `@ar/web` tests

Two runners split by what they can reach:

- **Unit** (`vitest`) — colocated beside the code as `src/**/*.test.ts`,
  node environment, no DOM. Route helpers, fixture accessors and filter
  derivations are tested here, next to the module they cover.
- **End-to-end** (`playwright`) — this tree, as `tests/e2e/*.spec.ts`,
  driving the app through a real browser against the fixture data layer.

The unit suite lives in `src/` rather than here on purpose: colocation is
the repo's testing convention, and it keeps a pure module and its test in
one directory. This tree is for specs that need the assembled app.

## Why this file exists

`lint` uses the explicit-path form (`eslint src tests *.ts *.mjs`), which
resolves each path itself. ESLint exits `2` — a hard failure, not a
warning — on any path that matches no lint target, and an empty directory
counts as no target. This README is a lint target (the base config lints
`**/*.md`), so it keeps the widened script green until the first spec
lands here. Removing it without a `tests/e2e/*.spec.ts` in place breaks
`bun run lint:all` repo-wide.
