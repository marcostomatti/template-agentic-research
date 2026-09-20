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
| `src/features/feedback/` | Feature layer, browser-side: the `./feedback` export's source, phase 2's error reporting surface. The element picker is three files: `picker.ts` decides what an element is called and what a selector matches, `pickerOverlay.ts` owns the top-layer sheet and the pointer-following pick session, `pickerField.ts` the decoration hung on the marked selector input, and `ElementPicker.tsx` draws the two controls — see the file-name note below for why it is not `Picker.tsx`. The drawer is `FeedbackDrawer.tsx` over four `.ts` modules and one sibling component: `drawerDraft.ts` holds the report draft OUTSIDE React (a pick COLLAPSES the drawer, and a collapsed drawer's children are `null`, so a `useState` there would lose the whole draft — it also holds the served templates, because no effect runs under `react-dom/server`), `drawerModel.ts` composes the served template with the widget's own three fields and assembles the report, `drawerOutcome.ts` says what the `role="status"` line reads and builds the prefilled GitHub new-issue link, `drawerData.ts` makes the two GETs and encodes the attachment, and `FeedbackOutcome.tsx` draws the outcome region. Bundled as `dist/feedback.js` — named by the `feedback` lib entry KEY, which the move did not touch — and typed at `dist/features/feedback/index.d.ts`, because `vite-plugin-dts` mirrors the SOURCE path. It sits under the feature layer so the jsdom vitest project collects its tests and the feature-layer eslint rule matches it: both patterns name `src/features/**`, so a module one directory higher is collected by neither and its layering violations go unreported. |
| `src/vite/` | Node layer (node-tested). Plugin, endpoint, git, probes. Imports Node builtins. |
| `src/vite/plugin.ts` | Vite plugin: injects `define` (three version constants), endpoint. Options `round`, `allowLan`, `outDir`, `templates` (issue-form paths; `[]` serves none), `gateway`. Resolves the `repo` slug for the status route, and names ONE filesystem — `mkdir`, `writeFile`, `readdir`, `readFile` — for `store.ts` and `templates.ts` both. |
| `src/vite/endpoint.ts` | Routing and the route handlers ALONE: `GET /__devtools/status` (git, persistence, the `repo` slug), `GET /templates` (the parsed issue forms, read per request, `[]` where there is no directory), `POST /report` (body, store, gateway), `POST /comment` (the "also affected" comment, answered as `{status:'commented', gateway}`; `gateway-absent` where none is configured). One `ROUTE_METHODS` map is both the path match and the method each path answers. Its request plumbing lives in `http.ts` and its body schemas in `report.ts`/`comment.ts`. Its cases are split three ways on what an assembly a case needs: one route pinned at a time and needing a resolved build value lives in `plugin.test.ts`, one route pinned at a time and needing none in `endpoint.test.ts`, and a case driving more than one route against the SAME assembled middleware in `endpoint.integration.test.ts`. |
| `src/vite/http.ts` | The request plumbing every route sits on, with its own colocated node tests: the pathname reader, the body reader and its 24 MiB cap, the server-origin reader (port off the accepted socket), the `respond` and `refuse` writers, the refusal body and the status codes. |
| `src/vite/harness.ts` | Not a test file — no `.test.ts` suffix, so the node vitest project never collects it — but the fakes `plugin.test.ts` and `endpoint.integration.test.ts` both build an assembled middleware from: `createFs` (in-memory, recording), `CLOCK`/`STAMP`, `assemble` (wraps `plugin.ts`'s `assembleDevTools`), `fakeRequest`, `createResponse`, `runMiddleware`. Extracted once `plugin.test.ts` hit this package's 800-line cap. |
| `src/vite/comment.ts` | The `POST /comment` body: an `issueId` (identifier charset, never leading-dash — a gateway passes it as an argv element) and a `body` of ≤ 5,000 characters, with `parseComment` answering the comment or the first refusal and its field path. Pure, like `report.ts`: no filesystem, no clock, no response. |
| `src/vite/git.ts` | Sync reads `HEAD`, branch, round from `.git` or `unknown`, plus the `owner/name` slug of the `origin` remote (`git remote get-url origin`, https and `git@` forms, `.git` suffix dropped) as a separate export — the three build values reach a `define`, the slug reaches the status route only. |
| `src/vite/origin.ts` | LAN access: `DEVTOOLS_ALLOW_LAN` enables `0.0.0.0`, default `localhost`. |
| `src/vite/store.ts` | Round tag, persistence flag, report rounds persist. |
| `src/vite/gateway.ts` | `ReportGateway` and its outcome types. Exports no VALUE: every declaration is erased at compile time, which is why it has no colocated test. `plugin.ts` still never constructs a gateway — one arrives through `devtoolsPlugin({gateway})` or the plugin has none. |
| `src/vite/gateway/rafa.ts` | `rafaGateway({bin?, run?, module?, priority?})`, the one implementation of that interface. Decides what goes in an argv and what an answer means: `search` runs `issue list --type=bug --search=<words>`, `file` searches FIRST and answers the duplicate or runs `issue create` with the `[fb/<round>]` title prefix and the stored attachment paths appended to the body, `comment` runs `issue comment <id>`. Spec decision 6 is law here — an argv ARRAY, never a shell string, and `gh` never called directly. |
| `src/vite/gateway/call.ts` | One rafa call: the `RafaRun` contract `rafa.ts` is configured with, and the reading of rafa's two-event NDJSON. Five refusals — no runner, a runner that threw, a binary that would not start, a non-zero exit carrying its stderr line, output that is not NDJSON (a malformed line and an `ok: false` result alike). Split out of `rafa.ts` at 956 lines, the way `http.ts` was split out of `endpoint.ts`. A reason never carries a request-chosen value: the command is a FIXED label per subcommand, and rafa's own text is stripped of control characters, collapsed to one line and capped. |
| `src/vite/gateway/run.ts` | The default `RafaRun`: `rafaRun` over `node:child_process`'s `execFile`, argv[0] as the file and every later element an argument, `shell: false` passed explicitly, a 60s timeout and an 8 MiB output cap. Maps what node answers onto `RafaRunResult` and interprets none of it: a numeric `code` is an exit status, a STRING `code` (`ENOENT`, `ERR_CHILD_PROCESS_STDIO_MAXBUFFER`) is the `errno`, a kill is `code: null`. Its cases PROVOKE each shape with `node -e` as the stand-in binary, never `rafa`. `rafa.ts` binds it as the default on the KEY (`'run' in options`), so `rafaGateway()` files for real and `rafaGateway({run: undefined})` runs nothing — the seam that keeps the no-runner cases off the real tracker. |
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
the leak grep and exits with the grep's code. It first asserts the two
entry files exist — `dist/index.js` and `dist/feedback.js` — then
greps EVERY `./dist/*.js` file except `dist/vite.js` (the node half,
which legitimately imports `yaml` and `node:` builtins), so a
rollup-hoisted shared chunk (`dist/mount-<hash>.js`,
`dist/reportTemplate-<hash>.js`) is covered by construction rather
than by name. It refuses three specifiers in any covered file: `node:`,
`child_process` and `yaml`. `yaml` is a real dependency of this
package but of the NODE half only (`src/vite/`), so a browser chunk
importing it is a layering leak the bundler reports as success. A
missing entry is a refusal too: absent `dist/feedback.js` exits `1`
rather than passing an unread file. A `build` that exits `1` under a
successful `vite build` line is the grep refusing one of those three —
not a bundler failure. Running `bun run postbuild` again afterwards is
redundant, and useful only to read that step's exit code on its own.

The runtime dependencies split by half: `@medv/finder` is browser-only
(the element-selector capture), `yaml` is node-only (issue-form
parsing). Both are in `rollupOptions.external` in `vite.config.ts`, so
neither is bundled; the grep is what proves `yaml` never crosses.

## File names are case-folded here

The picker's drawing was `Picker.tsx` for one commit, beside
`picker.ts` (its decisions). The two differ by one letter's case, and
on the macOS checkout this repo is worked in that is ONE name rather
than two. Measured three ways: `import … from './Picker'` answered
`picker.ts` under vitest with no error at all; `check-types` refused
the same import with `TS1149` (file names differing only in casing);
and a `Picker.d.ts` emitted into `dist/features/feedback/` would have
REPLACED `picker.d.ts` there (16,983 bytes to 37, one file listed
where there were two).

The component is `ElementPicker.tsx` now — twelve modules imported
`./picker` and none the component, so the component took the new
name. The law that outlives it: a new file must not take the name of
a sibling in another case, whatever its extension. A case-sensitive
CI passes such a pair, so nothing but this rule catches it.

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

## Feature layer: `src/features/feedback/`

**Module map.** The feedback drawer and element picker:

- `index.ts` — exports `FeedbackFeature` (the `DevToolsFeature`
  implementing error reporting surface)
- `FeedbackDrawer.tsx` — the drawer UI, composed from draft and
  outcome. A pick collapses it; collapsed drawer children are
  `null`, so state lives in `drawerDraft.ts` outside React
- `drawerDraft.ts` — report draft store and template cache
  (outside React because no effect runs under `react-dom/server`)
- `drawerModel.ts` — merges served template with widget's three
  fields (`selector`, `context` above-fold, screenshot) and
  assembles the final report object
- `drawerOutcome.ts` — composes status line (`role="status"`)
  and prefilled GitHub new-issue link (with attachment paths)
- `drawerData.ts` — makes the two GETs (templates and context)
  and encodes the attachment (screenshot PNG to base64)
- `FeedbackOutcome.tsx` — renders outcome region (success,
  failure, "also affected" comment)
- `picker.ts` — decides element identity (name and callable
  selector) and what a pick match means (tag, class, id, data)
- `pickerOverlay.ts` — top-layer sheet and pick session
  (pointer following, escape-key refusal)
- `pickerField.ts` — decorates marked selector input after a
  pick (label text, close button, selector validation)
- `ElementPicker.tsx` — renders picker controls (activate
  button, marked input with decoration, overlay)

**Why the path matters.** The vitest `jsdom` project collects
`src/{core,features}/**/*.test.ts` and eslint rule forbids
`src/features/**` importing `src/vite/**` or `src/core/**`'s
Node builtins. The feature sits one level DOWN from the root
so both patterns match it: tests are collected, layering
violations are caught. A module at `src/features.ts` (one level
UP) would be collected by neither, leaving violations silent.
`src/vite/` sits parallel to both and is imported by neither.

## Leak grep over browser bundles

`postbuild` is npm-lifecycle-named, so `bun run build` ALREADY
runs the leak check after vite compiles. It first asserts the two
entry files exist, then greps EVERY `./dist/*.js` file except
`dist/vite.js` (the node half) — covering `dist/index.js`,
`dist/feedback.js` and any rollup-hoisted shared chunk
(`dist/mount-<hash>.js`, `dist/reportTemplate-<hash>.js`) by
construction. It refuses three specifiers found in any covered
file: `node:`, `child_process` and `yaml`. The `yaml` package is a
real dependency but of the NODE half only (`src/vite/`); a
browser chunk importing it signals a layering leak the bundler
reports as success. Missing bundle (no `dist/feedback.js`) also
exits `1`. A `build` that exits `1` under successful `vite build`
means the grep refused one of those three — not a bundler
failure. Running `bun run postbuild` alone afterward is redundant
but useful to read that step's exit code in isolation.

Both are in `rollupOptions.external` in `vite.config.ts`, so
neither is bundled; the grep is what proves `yaml` never crosses.

## Screenshot control under either renderer

A feature draws its own screenshot in EITHER jsdom (unit/
browser test) OR real browser (e2e/Playwright spec). Under
jsdom, `@medv/finder` and canvas APIs fail silently (no
`HTMLCanvasElement`, no pixel rendering), so `ElementPicker`
and `drawerModel` both gracefully handle missing screenshot
and mark the field as unchecked or absent. Under Playwright,
the forced spec activates the drawer and captures the canvas
before submit; the spec-level control means automation never
drives screenshot capture (decision 7 from `.rafa/specs/
q20b-2-feedback-feature.md`). A feature never reads the app's
`sessionStorage`, other `localStorage` keys or its API client;
only the report draft, endpoint response and user form state
reach the tracker.

## Context pages

- `packages/web/context/testing.md` — two-runner split, jsdom
  quirks, why the widget is invisible to the default e2e suite,
  the forced project and its server port, the absence control
  in the default suite.
