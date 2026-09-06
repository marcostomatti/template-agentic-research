# components-library

This is the umbrella's component library package (`@ar/ui`), vendored fork-style from the standalone `components-library` template — the building blocks for
apps and UI surfaces. It is variant-first React (CVA + Tailwind 4 + Radix
primitives) plus a dual-entry caching module. Everything lives in this one repo:
source, workbench (Storybook), test harnesses, visual CI, and the agent tooling
under `.claude/`.

## Tech stack

React components with TypeScript, using Radix UI primitives for accessibility
and headless behavior, Tailwind CSS (v4) for styling, and Class Variance
Authority (CVA) for mapping classes to component variants. Applying classes
directly to components from call sites is discouraged: styling is covered by
variants and flags on the main component, not fine-grained styling at the
implementation side. Variants are defined in the component definition, not the
consumer.

## Project structure

Atomic design: `src/atoms` → `src/molecules` → `src/organisms` →
`src/templates` (AppShell, AuthShell) → `src/pages`. Each component owns a
folder:

- `index.ts` — barrel exporter
- `<Component>.tsx` — component definition
- `<Component>.variants.ts` — CVA definitions
- `<Component>.stories.tsx` — Storybook stories

A molecule or above may colocate smaller internal atoms in its folder when they
are only meant for that component (e.g. a `Table` with `TableCell`, `TableRow`,
`TableHeader`, `TableFooter`): own files, exported through the parent's barrel;
variants and stories on the main component only. Layers export up through layer
barrels to the root `src/index.tsx`.

A sub-component that is only ever the parent's own implementation detail may
stay PRIVATE in the parent's file instead — no folder entry of its own, no
barrel line, no variants file and no story: `Breadcrumb`'s `Chevron`,
`Pagination`'s `Arrow`, `Stepper`'s `Check`, `Table`'s `ColGroup`, and the
`TreeNavItem` inside `src/molecules/TreeNav/TreeNav.tsx`. `TreeNavItem` is the
only component under `src/` that renders ITSELF (measured over every non-story
`.tsx`; a crude scan that includes `.stories.tsx` answers six more, all of them
demo wrappers used further down their own file rather than recursion). That
recursion is what lets a whole nested tree be one file: the markup nests
because the ARIA pattern does, a `treeitem` wrapping a `role="group"` list,
while the row list the keyboard walks is flattened once per render and does
not nest at all.

Other trees:

- `src/lib` — `cn()` and shared utilities (formatting lives here; never
  reimplement it inline)
- `src/styles` — the theming split (see below)
- `src/stories` — shared story fixtures/helpers
- `src/cache` — the caching module (subpath exports `./cache`,
  `./cache/server`); unit tests in `src/cache/__tests__/`
- `design/` — design reference pages for the rosetta comparator (see
  `design/README.md`)
- `docs/ci/` — grow-box runner setup for visual CI

## Theming

`src/styles/tokens.css` owns the DEFAULT THEME DEFINITION (semantic variables
`--bg`, `--fg1`, `--primary`, …, light + dark keyed off `data-theme`);
`fonts.css` the type faces. `src/styles/theme.css` is the COMPONENT CONTRACT
mapping those variables onto Tailwind utilities — stable across themes, not
meant to be overridden. `lib.css` is the published `styles.css` entry;
`global.css` is the workbench entry (Storybook). The build copies all four into
`dist/styles/`.

Note: tokens.css wraps its element defaults (`h1`–`h6`, `a`, `p`) in
`@layer base`, so Tailwind utilities beat element rules without the `!`
important modifier. Do not reintroduce unlayered element rules.

Brand atoms (`Wordmark`, `TomatoMark`, `WorkspaceMark`) are the logo slots of
the shell — swap or restyle them per product; the demo strings in stories use
the placeholder brand "Acme".

## Tooling

- **CVA + clsx + tailwind-merge** for variant-driven styling; `cn` lives in `src/lib`.
- **Tailwind 4** — semantic variables map into `@theme` via `src/styles/theme.css`.
- **Radix** primitives only when behavior needs it (Slot, Dialog, DropdownMenu, …) — add the package per-component, not the whole umbrella.
- **Storybook 10 + addon-vitest + Playwright** — `bun run storybook`, `bun run test`, `bun run build:storybook`. One smoke test is auto-generated per story. **No DOM snapshots, and story files never import from `vitest`** (it crashes the preview). Stories must be **deterministic** — fixed dates/ids/locales, never `Date.now()`.
- **Visual regression** is a separate native suite (`bun run test:visual`): `@storybook/test-runner` screenshots every story in light + dark and diffs against **untracked per-environment baselines** in `visual/__image_snapshots__/` (update with `bun run test:visual:update`; CI keeps its own set — baselines are regenerated per environment, never copied in). Preview health: `bun run check:stories`.
- **Pixel-fidelity comparator** — `scripts/compare-design.mjs <story-id> <SpecName> [--source …]` captures a story and its design page side by side into `visual/__compare__/`. Design pages live under `design/`.
- **Cache module** — `components-library/cache` (TanStack Query browser cache: `useCache`, `QueryProvider`, `defaultQueryClient`) and `components-library/cache/server` (Redis cache-aside via optional `ioredis` peer). The build gate fails if `ioredis` leaks into the browser bundle.

## Verification order (baseline-safe)

1. `bun run test:visual` against EXISTING baselines first — pre-existing
   snapshots must pass unchanged; reseed only stories whose markup you
   intentionally changed (`bun run test:visual:update`), then re-assert.
2. `bun run lint` — zero problems.
3. `bun run check-types` — clean.
4. `bun run test` — the unit (cache) suite alone (`vitest run
   --project unit`); the storybook smoke project runs under
   `bun run test:full`.
5. `bun run check:stories` — every story renders error-free. It
   serves the gitignored `storybook-static/`, so
   `bun run build:storybook` has to run first. It walks every story
   in the built index through headless chromium, so it costs
   minutes rather than seconds.

Interrupted runs can leave static servers on ports 6006/6007/6016
(`EADDRINUSE` false failures) — kill them before re-running.

**Step 1's pass count is not a gate reading.** `bun run test:visual` is
GREEN over an EMPTY baseline directory and its summary lines are
identical either way: `scripts/test-visual.sh` clears CI/GITHUB_ACTIONS
for the jest child on purpose, so a MISSING baseline is WRITTEN and
PASSES. Measured — the seed run and the assert run both printed
`Test Suites: 85 passed` / `Tests: 366 passed`, and only
`visual-report.json` separated them (`matched: 0, added: 732,
didUpdate: true` against `matched: 732, added: 0`). So parse that
report and say which KIND of run produced it. Two traps in doing so:
its counters nest under a `snapshot` KEY rather than at the top level
(the reflexive top-level read answers `None` for every one of them and
an if/elif classifier falls through to its GREEN arm, reporting the
verdict it would give a real assert run — print the keys you
actually resolved beside the verdict), and the file is REWRITTEN by
every run including `--update`, so copy it aside before re-running or
the previous state is unrecoverable.

The free second readings, neither costing a run: an mtime HISTOGRAM
over the baseline directory bucketed by minute names WHICH files a
reseed touched (two clusters over 744 files here) and is more
informative than a sha256 manifest diff, which is the fallback when
two runs land in the same minute. And `test:visual`'s `Tests: N`
against `check:stories`'s `N/N stories render clean` — equal is what
separates "every story rendered" from "one runner collected fewer
files than exist", the two reaching the stories through completely
different pipelines. Hold them against each other rather than quoting
one.

**Reading a `test:visual` capture.** The storybook test-runner is JEST,
which spells a per-file verdict as the WORDS `PASS` and `FAIL`, so a
glyph matcher has NO positive control there and its zero is the shape a
broken run also produces (a green 86-file run counted 2 U+2713, both
from `build:storybook`'s vite ticks, and 0 from the failure family).
Read the `PASS` LINE COUNT and hold it against `Test Suites: N` — 86 ==
86 with 0 `FAIL` lines is a positive count from the same reporter whose
zero is being read. Three more reconciliations are free in the run you
already did. `Test Suites: N` against
`git ls-files —— 'src/**/*.stories.tsx'` (BARE pathspec, from inside the
package — the repo-root-relative form answers a false 0 that reads as
"this package ships no stories") is the FILE-level half of
`check:stories`. `Snapshots: N` == the file count in
`visual/__image_snapshots__/` == `Tests: M` doubled, the factor being
the THEME count the harness shoots (744 == 2 x 372, splitting exactly
into `——light.png` and `——dark.png`). And the story TOTAL reconciles
THREE ways once a build has run — `test:visual`'s `Tests: N`,
`check:stories`'s `N/N`, and the `type === 'story'` entry count in
`storybook-static/index.json`, three different pipelines, so a runner
that collected fewer stories than exist shows up as a DISAGREEMENT
rather than as a smaller green number. `check:stories` also carries the
in-band control `test:visual` lacks: one U+2713 line per story, so that
count against its own denominator (377 == 377, 0 U+2717) is a positive
reading from the same emitter as the zero.

**A NEW component's baselines need NO `test:visual:update` run**, and
reaching for one is DESTRUCTIVE rather than redundant. The plain ASSERT
run WRITES every missing baseline and passes — measured on a five-story
landing as `matched: 744, added: 10, updated: 0, didUpdate: false`, the
10 being that file's stories times the two themes — where `——update`
adds `-u`, rewrites ALL of them and reports `didUpdate: true`, deleting
the very evidence the baseline-safe order exists to produce. So the
shape for a component landing is assert-then-REASSERT, the second run
answering `matched: 754, added: 0`. The counter saying the seed was
CONFINED is `snapshot.filesAdded` (1, the one new story file); `added`
alone cannot say which files it came from, and `unchecked: 0` is what
says no baseline went unexercised.

**A cheap THIRD gate for a component landing**, between the unit suite
and the minutes-long visual one: `bun x vitest run ——project storybook`
from inside the package renders EVERY story through chromium in —12s,
where `bun run test` is the cache/unit project ALONE and reads no
component at all. It runs NO `pretest`, so it builds nothing and is safe
beside another checkout. It reconciles two ways in the run you already
did — `Test Files` against `git ls-files —— 'src/**/*.stories.tsx'` plus
whatever is still untracked (measured 87 == 86 + 1), and a single-file
re-run naming each story it collected. That pair separates "my stories
were collected and rendered" from "the suite is green".

**Play-function story conventions**, none of them enforced. Assertions
come from `storybook/test` (`expect`, `userEvent`, `waitFor`, `within`)
and NEVER from `vitest`, which crashes the preview — five story files
already spell it, so copy one. A story asserting a STATE TRANSITION
needs a stateful `const XDemo = () => {...}` plus `render: () => <XDemo
/>`, because a fully controlled component only changes when its owner
says so and `args` cannot say it (`ChipList`, `SearchSuggest`,
`CodeInput` are the precedents). And any claim about TAB needs focusable
SENTINELS the story itself renders on BOTH sides of the widget:
`userEvent.tab()` is document-wide, a bare canvas has nothing on either
side, and "one Tab reaches it and no more" then has nowhere to be
measured from. The gate for all of it is
`bun x vitest run ——project storybook <the story file>`, —3s.

**A play function's PASS is not evidence the walk is measuring**, and
the two ways it goes vacuous are both invisible. An assertion taken from
a widget's FALLBACK position asserts nothing: deleting a roving
tabindex's whole "return to where focus last was" fallback left a
tab-out/tab-back-in case GREEN, because focus had been sitting on the
FIRST row, which is also what the widget falls back to. Take that
reading only after focus has MOVED off the fallback, and pick the leg by
deleting the fallback rather than by breaking the movement. And a guard
can be co-defended by the RENDERING rather than by another guard:
dropping the `return` that stops an opening ArrowRight from also
descending is GREEN in every spelling, a collapsed branch's children not
being in the DOM at all. Attribute such a green with a `throw` on the
branch the leg claims to reach — 12 of 13 legs red over one keyboard
story, and the 13th was dead rather than uncovered.

**`dist/index.d.ts` is a SIX-LINE re-export barrel**, so grepping it for
a component's name answers 0 even on a green build that shipped it — the
declaration is at `dist/<layer>/<Name>.d.ts`. That matters because
`@ar/web` resolves this package's TYPES through `dist/` and not through
`src/`: a component landed in `packages/ui/src` is INVISIBLE to that
package's `check-types` until this one is BUILT, and the failure is a
plain TS2305 naming the export as if it did not exist. `bun run build`
(—1 min) is the fix. The entry file is `src/index.tsx` and not
`src/index.ts`, so a reflexive `head src/index.ts` reports the package
as having no barrel at all.

**The `offline-react-render-probe` skill works UNCHANGED here** — `bun
<probe>.tsx` from inside the package resolves react/react-dom and
renders a component to markup with no jsdom, no runner and no storybook,
which is the only way to MEASURE what a `.tsx` renders in a package
shipping no component unit tests by design. Its lazy-suspend trap has a
specific tripwire: `src/lib/icons.tsx`'s `StrokeIcon` is a plain inline
SVG and is safe, while the `Icon` ATOM is `React.lazy` per glyph and
makes `renderToStaticMarkup` throw. Prefer `StrokeIcon` in any component
whose markup you intend to probe, and delete the probe in the same
braced command that runs it.

## Visual CI

`.github/workflows/front.yml` runs the visual suite on a self-hosted runner
(default label `grow-box`): PRs gate against the runner's cached baselines,
merges to `main` refresh them, diffs upload as artifacts, and a PR comment
summarizes. **It is OFF by default** — the job no-ops until the untracked
repository Actions variable `VISUAL_CI` is `enabled` (runner override via
`VISUAL_CI_RUNNER`); the live wiring is intentionally not tracked in the repo.
The local visual suite is independent and always available. Operator setup and
enablement live in `docs/ci/grow-box-runner-setup.md`; wiring is checked by
`scripts/verify-visual-ci.sh`.

## Open debt measured from `@ar/web`

The app package runs an axe scan, a keyboard walk and a reduced-motion
suite over this library as consumed. Five findings are OWNED HERE and
none of them is repairable from `packages/web`; each was measured
twice and is deterministic. They are recorded so the next wave that
owns this package does not re-derive them.

- **`aria-dialog-name`** (1 node, every modal address). `Modal` puts
  `aria-labelledby` on its role-less panel `div` while `role="dialog"`
  sits on the `Dialog.Content` that `Overlay` renders one level up.
  `Overlay` takes a `label` prop for exactly this and `Modal` never
  passes it, so NO call site can name a dialog. Attribute-only; moves
  no pixel, so it costs no visual reseed.
- **`aria-progressbar-name`** (1 node, every surface).
  `SidebarWeekSummary` renders `Progress` with no accessible name.
  Also attribute-only.
- **`color-contrast`.** `Badge.variants.ts` pairs each tone with a
  wash of itself (success 2.98:1, warning 2.22:1, danger 3.9:1) and
  the `--fg3` token reads 2.53:1 at 11.5px. This one is a theme
  decision with a real baseline blast radius.
- **Focus is never returned to the control that opened a modal.**
  Radix's `DialogContentModal` composes `onCloseAutoFocus` to
  `preventDefault()` its own restore and focus
  `context.triggerRef.current` instead — a ref only a
  `Dialog.Trigger` fills, and `Overlay` renders none, its consumers
  opening modals by ROUTE. So the restore is cancelled and nothing is
  focused in its place: `document.activeElement` is the BODY after
  every close, and the next Tab restarts the whole shell. App-side
  repairs were measured GREEN and prove nothing (a focus call inside
  the close handler is clobbered by Radix's unmount restore; behind a
  `setTimeout` it lands too late). The leg that WORKS is in `Overlay`:
  capture `document.activeElement` in a `useState` INITIALISER (a
  `useRef` plus `useEffect` is too late, Radix having already
  autofocused) and restore it from `onCloseAutoFocus` with a
  `preventDefault`. `@ar/web` carries the current behaviour as a
  documented ledger assertion, so the repair will red the THREE cases
  there that poll for `body` — count the `message: FOCUS_RETURN_DEBT`
  sites in `keyboard.spec.ts` rather than quoting the number, which
  has already moved once. The third arrived with the tree: a
  composite widget inside the dialog has to be shown not to swallow
  Escape, and the case that shows it reads this same ledger on its
  way out.
- **The app shell has no responsive behaviour.** `appShellSidebar` is
  a flat `w-[var(--sidebar-w)]` with no media query (measured 264px
  identically at 320, 768, 1024 and 1440) and nothing watches the
  viewport, so a 320px viewport is a 264px rail beside a 56px content
  column.

Three related non-defects worth not re-measuring. `Overlay`'s
`trapFocus={false}` does NOT stop Tab looping (Radix hardcodes
`loop: true` in `DialogContentImpl`, so the flag only reaches
`Dialog.Root`'s `modal`). `Overlay` ships no enter/exit transition at
all, so there is no modal transition to reduce. And NOTHING a
consumer mounts inside it can swallow Escape, so a composite widget
of its own is never why a dialog failed to close:
`@radix-ui/react-dismissable-layer` (1.1.19, reached through
`react-dialog` 1.1.23) adds its keydown to `ownerDocument` with
`{ capture: true }`, so a descendant's bubble-phase handler never
sees the press first. Measured against the tree — `TreeNav`'s own key
switch, given an `Escape` case calling `stopPropagation` AND
`stopImmediatePropagation`, reds 0 of the 6 fields-presentation cases
in `@ar/web`, the one pressing Escape from inside the tree included.

A `packages/ui` mutation leg IS reachable from a `packages/web`
Playwright grid, and the pipeline is proven rather than assumed: edit
the source, `bun run build` here, then run the spec — Playwright
starts its own vite per run, so the rebuilt `dist` is what the browser
gets. Confirm the leg took by grepping `dist/index.js` for the
MINIFIED form of the change (a boolean default reads
`trapFocus: a = !1`), because a leg that never reached the browser is
indistinguishable from one the tests do not discriminate. Budget two
builds per leg, one to apply and one to restore.

The tree's own grid took the cheaper shape, which needs no build at
all: `packages/web/node_modules/@ar/ui` symlinks straight here and
this package's `.` export names `./dist/index.js` under its `import`
condition, so editing that file IS the leg and the next vite boot
reads it. Identifiers are mangled, but one `//#region <source path>`
marker per module and the `displayName` strings both survive, so the
region to edit is greppable by source path rather than by reading the
original code. Two disciplines follow from `dist/` being gitignored,
which leaves `git status` clean with a mutation IN PLACE: keep the
pristine bytes in `/tmp` and restore from them after each leg, and
prove the tree carries no leftover with a sha256 held across a hand
`bun run --filter '@ar/ui' build` — equal before and after means the
tree's bytes are the build's bytes. An mtime says nothing in either
direction, a restore having rewritten the file too.

That no-build path needs a POSITIVE control in the same sitting,
because the warning above applies to it twice over: a leg that never
reached the browser and a leg the tests do not discriminate both read
as a clean zero. Pick something the spec addresses directly — the
tree's `role: "tree"` retyped to `role: "treegrid"` reds
`dialog.getByRole('tree')` at exit 1 in about six seconds, which is
what makes a 0-of-N leg beside it a reading rather than a dead edit.

## Reference-free rule (CRITICAL)

This library is standalone. It must never **depend on** the repositories it
was extracted from — no imports or cross-repo paths; ESLint enforces this
(`no-restricted-imports` in `eslint.config.mjs`). Prose references to the
origins are allowed only where deliberate: the README's "Origins" section
names Open Tomato (the private source project) and component-breakdown (where
the design-system extraction pipeline still lives). Everywhere else — code
comments, stories, docblocks — stay neutral ("the design source", "the
workbench repo"); origin projects are not public.

## Plans and specs

Working plans and specs go in `.plans/` and `.specs/` at the repo root —
both **gitignored on purpose**: these files routinely describe critical
bugs (privacy/security) before they are patched, and must never reach the
remote ahead of the fix. Never "tidy" them into a tracked path, and never
weaken the `.gitignore` entries.

## Workflow

Feature-branch → PR → merge. Run the verification order above before any PR.
Agent personas for component work live in `.claude/agents/` (scout → builder /
prime → fidelity-verifier → reviewer, plus component-porter for bringing
finished components in from a workbench repo); method and hazards live in
`.claude/skills/component-from-design/SKILL.md`.

## JSX to TSX

Incoming component work sometimes starts from static JSX files that need
refactoring to TSX with types. Move gradually:

1. Read the whole file: identify the components and the main domain/entity.
2. Solve main domain/entity types and interfaces first (may be revised when
   inline errors reveal union types).
3. Solve function/component interfaces for params/props.
4. Solve inline error types. Common scenarios:
   1. Untyped state initialization (`useState(null)` / `useState([])` / `useState({})`).
   2. Missing prop on the domain type — consider whether it should be optional.
   3. Union-type mismatches — use type guards to narrow based on a
      discriminant prop value.
   4. Icon `name="..."` complaints — placeholder component, solve with `as any`
      for now.

Constraints: do **not** creep into other files; do **not** change HTML,
styling, or classes (layout is correct); do **not** rename object properties
used to hydrate components; do **not** rename functions.
