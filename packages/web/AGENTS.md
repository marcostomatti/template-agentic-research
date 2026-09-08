# AGENTS — @ar/web

The web app: Vite + React 19 + react-router v8 over `@ar/ui`. It runs
with `bun run dev` against NO backend — every surface is fixture-backed
end to end (no database, no `@ar/service`, no network), which is what
makes the shell demonstrable before the API exists, and what the data
layer on `context/data.md` is shaped around.

Read the repo-root `AGENTS.md` first for the umbrella map and the
pointer to each of ITS `context/` pages: the shared tooling, the
plans/specs law, the de-origination sweep and the fan-out reading rules
each live on a page there. This file carries what is specific to this
package, spread across the pages below.

## Layout

| Path | What it is |
| --- | --- |
| `src/main.tsx` | The browser entry, and the only module here that touches the DOM directly: `StrictMode` > `QueryProvider` (`@ar/ui/cache`) > `RouterProvider`. The cache sits ABOVE the router deliberately — it holds one query client for the life of the tab, so navigating between surfaces, or across the two bases, leaves the cache standing rather than starting every read cold. |
| `src/app-shell/` | The persistent chrome. `nav.ts` is nav-as-data and the single table the route surfaces derive from; `AppLayout.tsx` is the layout route and the sole owner of the sidebar collapse flag; `Sidebar.tsx` and `Topbar.tsx` fill its slots; `theme.ts` splits a pure resolver from the hook that writes `data-theme`. |
| `src/routes/` | `paths.ts` (the surface table and the two-base path arithmetic), `router.tsx` (the route tree as DATA plus a `createAppRouter` factory), `DomainGuard.tsx`, `useSearchParamState.ts`. |
| `src/data/` | The fixture data layer and the API swap seam: `api.ts` (the accessors — reads, and, since the editors landed, writes), `hooks.ts` (one cache hook per accessor), `types.ts` (the redeclared schema vocabulary and `FIXTURE_NOW`), one fixture module per table — `proposals.ts` is the newest of them, redeclaring `source_config_proposals` — and `drafts.ts`, the session draft store every write is recorded in. See `context/data.md`. |
| `src/pages/` | One directory per surface, plus `index.ts` — the surface-id to component registry the router reads. Each page keeps its pure helpers beside it as `.ts` (`rows.ts`, `cards.ts`, `fields.ts`, `editor.ts`, `schema.ts`), which is where colocated tests can reach them, and its own modal `.tsx` beside the list page — all seven the router registers live in the surface directory that owns them, never in `src/components/`. |
| `src/components/` | App-local stand-ins for `@ar/ui` components that do not exist yet, the shared list-page skeleton, the frame the editor modals are built in (`EditorModal.tsx`), the JSON fallback an editor offers for a shape neither a fixed template nor `src/dynamic-form/`'s fields can express (`JsonEditor.tsx`), the pressable-badge filter row the sources toolbar uses in place of a count-carrying `Select` (`FilterBadgeRow.tsx`), and the pure `.ts` modules they share (`editorDraft.ts` for the draft a modal holds, `jsonDraft.ts` for the JSON fallback's parse, format and refusal sentences). See `context/components.md`. |
| `src/dynamic-form/` | The dynamic form provider: an editable value drawn from a `FieldDef` list, in the two-column shape the recursion question was closed at — a tree of the structure on the left, ONE flat form for the selected node on the right, and no recursive form anywhere. Six pure `.ts` hold every decision (`fieldDef.ts` the contract union over the six types, `nodePath.ts` where a node sits, `tree.ts` the node tree plus the projections `TreeNav` and `Breadcrumb` take, `values.ts` the only module that answers a NEW value, `readers.ts` the four leaf readers, `registry.ts` the type-to-control-kind map) and three `.tsx` draw them (`FieldControl`, `NodeForm`, `DynamicForm`). A top-level directory rather than an entry under `src/components/` because it is a subsystem rather than a component. Its only caller so far is the lexicon editor's fields presentation; the def list for that payload, and the ruling on what v1 can express, are the page's — `src/pages/lexicon/fieldDefs.ts`. |
| `src/test-support/` | Helpers shared by colocated tests only. No app module imports it and the vitest include collects no non-`*.test.ts` file, so it ships in no bundle. |
| `src/styles.css` | Two imports: `tailwindcss` and `@ar/ui/styles.css`. The design tokens, the element defaults and the theme contract all belong to `@ar/ui`. |
| `tests/e2e/` | The default Playwright suite, behind `playwright.config.ts`. `tests/README.md` states the two-runner split, and why that README is itself load-bearing. |
| `tests/visual/` | The screenshot suite, behind `playwright.visual.config.ts` and deliberately outside the default run. Its baselines are per-machine and untracked; these specs are not, which is what `packages/web/.gitignore` exists to say. |

## Context pages

One page per tag, each the authority for its own subject; read the page
your task touches. The pointers below are plain paths on purpose — in
the `@` import form a `CLAUDE.md` uses, an agent that read this map
would pull all nine pages in with it and the split would save nothing.
A bare `context/<page>.md` here is THIS package's; the root's own are
always named as the root's.

- `context/routes.md` — the two route bases, the path arithmetic every
  component asks rather than assembles, the seven modal sub-routes, and
  what `DomainGuard` refuses on behalf of a shell that would go down.
- `context/data.md` — `src/data/` as the API swap seam: the three
  properties that make a later re-point a re-point rather than a
  rewrite, the read path through `hooks.ts`, what one new accessor
  costs, and the redeclaration rules that ARE the drift detection.
- `context/components.md` — the app-local stand-ins for `@ar/ui`
  components that do not exist yet, which of them exist in order to be
  DELETED, and which are here for good.
- `context/ui-constraints.md` — the `@ar/ui` contracts this app is
  built around and may not "fix" from here, every one of them invisible
  to `lint`, `check-types` and the unit suite.
- `context/editors.md` — the session draft store, the write seam over
  it, and the rules the editors and their modals are held to while the
  store lives in the tab rather than behind HTTP.
- `context/accessibility.md` — the measured a11y and motion readings,
  the standing violation ledger compared by set equality, and the shell
  facts (no responsive behaviour, the document scrolls) a spec needs.
- `context/security.md` — the brand slot: which `@ar/ui` brand atoms
  are ruled OUT and why, and the reference-free import gate that
  defends the imports while nothing automated defends the markup.
- `context/testing.md` — the two runners and two Playwright configs,
  how to read a run, the spec conventions, and the locator vocabulary
  this shell forces so it is not re-derived one failure at a time.
- `context/verification.md` — the package's gates in the order they
  run, and the four properties worth knowing before calling a change
  verified.

## This file is capped

**80 lines.** Anyone working in this package reads this file first and
whole, so it carries the layout table and the pointers above and
nothing else. It reached 1,135 lines before it was split. A finding
promoted out of `progress.txt` therefore goes to the `context/` page
that owns its subject, or to a new page listed above; never inline
here.
