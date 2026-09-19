# AGENTS — `@ar/dev-tools`

Development tools shell and Vite plugin (private devDependency of
`@ar/web`), in its own React root. Multi-entry: shell, feedback UI
(phase 2), plugin.

Read the repo-root `AGENTS.md` first for the umbrella map and context
page pointers: shared tooling, plans/specs law, security, verification,
gates, workflow, and loop architecture.

## Layout

| Path | What it is |
| --- | --- |
| `src/core/` | Browser layer (jsdom-tested). `.ts` modules only, container `.tsx`. Trigger, menu, surfaces, shell state, host builder. One `localStorage` key: `devtools.settings`. |
| `src/core/types.ts` | Feature contract: `DevToolsFeature`, `MenuItem` (union on mode), `DevToolsHost` (only thing features reach), `DevToolsConfig`, `DevToolsStatus`. |
| `src/core/host.ts` | Builds host: normalises endpoint to app-origin path, joins feature paths, applies defaults. Frozen; `context()` calls `extra()` per read. |
| `src/core/bus.ts` | Pub/sub: three topics (`error`, `route`, `artefact`), `unknown` payloads. No producer this plan. |
| `src/core/settings.ts` | Reads/writes `devtools.settings`, one key only. Stores `{size, handles}`. Corner not persisted. |
| `src/core/mount.ts` | Entry: `mountDevTools(config)`. Own root on body. Refuses automation (unless forced) and empty features (unless `showEmpty`). |
| `src/core/Shell.tsx` | Top: owns state (`status`, `settings`), renders trigger/menu/surface/about. |
| `src/core/Trigger.tsx` | Clickable tomato, positioned by corner, sized by stored preference. |
| `src/core/Menu.tsx` | Menu rows from `menuModel(features)`. Calls `isEnabled`, `items` on features. |
| `src/core/MenuRow.tsx` | One row, delegates to action/popover/modal/drawer. |
| `src/core/menuModel.ts` | Turns `DevToolsFeature[]` + host into rows. Throws are loud. |
| `src/core/menuFocus.ts` | Roving menu focus state machine. |
| `src/core/shellRules.ts` | CSS: overlay, backdrop, positioning, animation. All `--devtools-` vars. |
| `src/core/reportTemplate.ts` | Report-form shape shared by both halves: the seven-kind `ReportField` union, `ReportTemplate`, their zod schemas, and the `x-devtools` defaults (screenshot on, selector on, context always). A `select` with no option is refused, not mapped. Schemas only — no YAML, no filesystem. |
| `src/feedback/` | Phase 2 stub, error reporting surface. |
| `src/vite/` | Node layer (node-tested). Plugin, endpoint, git, probes. Imports Node builtins. |
| `src/vite/plugin.ts` | Vite plugin: injects `define` (three version constants), endpoint. |
| `src/vite/endpoint.ts` | Routing and the route handlers ALONE: `GET /__devtools/status` (git, persistence), `POST /report` (body, log). Its request plumbing lives in `http.ts`; its cases live in `plugin.test.ts`, since the middleware is reached only through `assembleDevTools`. |
| `src/vite/http.ts` | The request plumbing both routes sit on, with its own colocated node tests: the pathname reader, the body reader and its 24 MiB cap, the server-origin reader (port off the accepted socket), the `respond` and `refuse` writers, the refusal body and the status codes. |
| `src/vite/git.ts` | Sync reads `HEAD`, branch, round from `.git` or `unknown`, plus the `owner/name` slug of the `origin` remote (`git remote get-url origin`, https and `git@` forms, `.git` suffix dropped) as a separate export — the three build values reach a `define`, the slug reaches the status route only. |
| `src/vite/origin.ts` | LAN access: `DEVTOOLS_ALLOW_LAN` enables `0.0.0.0`, default `localhost`. |
| `src/vite/store.ts` | Round tag, persistence flag, report rounds persist. |
| `src/vite/gateway.ts` | Report gateway interface, behaviour deferred. |
| `src/vite/templates.ts` | Reads `.github/ISSUE_TEMPLATE/*.yml`, or configured paths, through an injected filesystem; parses with `yaml` and maps GitHub's five body types (`markdown`, `input`, `textarea`, `dropdown`, `checkboxes`) onto `ReportField`s, validated by `reportTemplate.ts`'s schema. Nothing is fatal: a directory that cannot be listed answers `[]`, an unreadable/oversized/malformed/unusable file is skipped with a warning naming it, and an unknown body type skips that ITEM only. `config.yml` and non-`.yml` entries are skipped silently. |
| `src/index.ts` | Browser entry: exports types, `mountDevTools`, `devtoolsBus`. |

## Two vitest projects

**jsdom (`src/{core,features}/**/*.test.ts`)**: Browser layer; `.ts`
only. Decision lives in `.ts`, `.tsx` stays thin. Playwright (forced
spec) tests interaction. localStorage quirk: install Map-backed store
per case (Node 25 ships Web Storage global).

**node (`src/vite/**/*.test.ts`)**: Dev-server layer; Node builtins
free. eslint forbids `node:*` / `child_process` outside `src/vite/`.

`postbuild` is npm-lifecycle-named, so `bun run build` ALREADY runs
the leak grep over BOTH browser bundles — `dist/index.js` and
`dist/feedback.js` — and exits with the grep's code. It refuses three
specifiers in either file: `node:`, `child_process` and `yaml`. `yaml`
is a real dependency of this package but of the NODE half only
(`src/vite/`), so a browser bundle importing it is a layering leak the
bundler reports as success. A missing bundle is a refusal too: absent
`dist/feedback.js` exits `1` rather than passing an unread file.
A `build` that exits `1` under a successful `vite build` line is the
grep refusing one of those three — not a bundler failure. Running
`bun run postbuild` again afterwards is redundant, and useful only to
read that step's exit code on its own.

The runtime dependencies split by half: `@medv/finder` is browser-only
(the element-selector capture), `yaml` is node-only (issue-form
parsing). Both are in `rollupOptions.external` in `vite.config.ts`, so
neither is bundled; the grep is what proves `yaml` never crosses.

## The storage key

**One only:** `devtools.settings` = `{size, handles}`. Never reads
app's `sessionStorage`, other `localStorage`, or API client. Prefix
`devtools` guards porting.

## Prefix discipline

Every string, property, key, CSS var, env is prefixed (portability):
- `devtools` / `DEVTOOLS` — TypeScript, names, constants
- `--devtools-` — CSS custom properties
- `VITE_DEVTOOLS_*` — Environment variables
- `DEVTOOLS_*` — `import.meta.env` (injected by plugin)

Directory copy to open-tomato: plugin unplugs, routes rewire. Nothing
here knows it moves.

## Layering law

- `src/core/**` imports no Node builtins, no `src/features/**`
- `src/features/**` imports `src/core/**` only
- `src/vite/**` is imported by NEITHER of the two above. It is not
  forbidden the reverse direction: `eslint.config.mjs` lets
  `src/vite/**` import `src/core/**`, which is the spec's rule read
  literally rather than an oversight — no file uses it, and a
  reviewer meeting the asymmetry should leave it alone. (Replaces the
  earlier "imports nothing above", which read as a ban in both
  directions and the config never enforced one.)
- Shell imports no feature module. Features reach shell only through
  host (prop). Features array in `DevToolsConfig.features`. Host
  frozen, unchanged while mounted.

## DevToolsHost: the single entry

ONE thing features reach:
- `version`: build facts (commit, branch, round, api)
- `endpoint`: app-origin path, normalised
- `context()`: app state, primitives only
- `settings`: size, corner
- `bus`: pub/sub (error, route, artefact)
- `fetch(path)`: pre-bound to endpoint

New need = new host member, never Shell import or feature import.

## Context pages

- `packages/web/context/testing.md` — two-runner split, jsdom quirks,
  why the widget is invisible to the default e2e suite, the forced
  project and its server port, the absence control in the default
  suite.
