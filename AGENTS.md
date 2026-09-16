# agentic-research

Umbrella monorepo (bun workspaces) for the agentic research platform: research
one or more domains under a shallow taxonomy, produce periodic digests, and
expose/export results over multiple formats/protocols (MCP, Markdown, RSS, …).

## Workspace map

| Path               | Package       | What it is                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------ | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/ui`      | `@ar/ui`      | Component library (CVA + Tailwind 4 + Radix), Storybook workbench, visual regression harness. Vendored fork of the `components-library` template.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `packages/web`     | `@ar/web`     | The web app (Vite + React 19 + react-router v8), consumes `@ar/ui`. Data source selection at build time via `VITE_AR_API_URL`: fixture-backed for development (no backend), HTTP endpoints for live service. Session token lives in `sessionStorage` only. The shell, all six surfaces, and the seven modal sub-routes run end to end — writes land in a session draft store. `packages/web/src/dynamic-form/` draws an editable value from a `FieldDef` list and a zod schema — a tree beside ONE flat form for the selected node, over `@ar/ui`'s `TreeNav`; the lexicon editor is its only caller. The package's `packages/web/context/` pages cover data, routes, editors, components, accessibility, security, testing, and verification. |
| `packages/service` | `@ar/service` | Express + MCP service (drizzle/Postgres), vendored fork of the `template-service-express` template. Future home of the research pipeline stack (workflows, sources, exports).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

Each package keeps its own `AGENTS.md` with package-specific conventions —
read it before working inside that package. Both vendored packages are
**fork-style copies** of their template repos: no automated sync; a change
wanted in both places must be made in both repos.

## Context pages

One page per tag, each the authority for its own subject; read the page your
task touches. The pointers below are plain paths on purpose — written in
the import form `CLAUDE.md` uses for this file, they would pull all six
pages back into every turn and the split would save nothing.

- `context/tooling.md` — shared config (the root eslint/tsconfig layering,
  the fan-out scripts), bun's isolated linker and its per-directory `bun x`,
  the `sharedRules.mjs` behaviours that shape code, the control-byte law, and
  the shell and git traps that make a reading report nothing.
- `context/security.md` — the `.plans/` and `.specs/` law (gitignored on
  purpose, never moved into a tracked path) and the de-origination posture:
  the seven needles, their two buckets, and how a zero is proven live.
- `context/verification.md` — the three fan-out gates in order, and how to
  read their captures: which lines carry the verdict, which figures are
  snapshots that move, and the flakes that read as regressions.
- `context/gates.md` — which gate actually opens which file, the four
  shapes an explicit-path run answers, and how to prove a gate covered your
  change rather than that it merely exited 0.
- `context/workflow.md` — branch, PR and merge, the task-shape routing
  table, the loop's CI wait, the mergeability readings to take before a
  push, and the close-out discipline.
- `context/loop.md` — the task loop's own architecture: the module map,
  the per-task tail and its two control-flow laws, the five injected
  prompts and the first-line rule that classifies them, the task
  declaration grammar, the effort store, and how the loop is tested.

## This file is capped

**80 lines.** `CLAUDE.md` imports it into every turn of every session, so
it carries the workspace map and the pointers above and nothing else. It
reached 2,473 lines and 48,326 tokens per turn — about 22% of every token
the loop had spent — before it was split. A finding promoted out of
`progress.txt` therefore goes to the `context/` page that owns its subject,
or to a new page listed above; never inline here.
