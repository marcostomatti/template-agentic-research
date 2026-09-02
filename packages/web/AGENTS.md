# AGENTS — @ar/web

The web app: Vite + React 19 + react-router v7 over `@ar/ui`. It runs
with `bun run dev` against NO backend — every surface is fixture-backed
end to end (no database, no `@ar/service`, no network), which is what
makes the shell demonstrable before the API exists, and what the data
layer below is shaped around.

Read the root `AGENTS.md` first: the umbrella map, the shared tooling,
the plans/specs law, the de-origination sweep and the fan-out reading
rules all live there. This file carries what is specific to this
package.

## Layout

| Path | What it is |
| --- | --- |
| `src/main.tsx` | The browser entry, and the only module here that touches the DOM directly: `StrictMode` > `QueryProvider` (`@ar/ui/cache`) > `RouterProvider`. The cache sits ABOVE the router deliberately — it holds one query client for the life of the tab, so navigating between surfaces, or across the two bases, leaves the cache standing rather than starting every read cold. |
| `src/app-shell/` | The persistent chrome. `nav.ts` is nav-as-data and the single table the route surfaces derive from; `AppLayout.tsx` is the layout route and the sole owner of the sidebar collapse flag; `Sidebar.tsx` and `Topbar.tsx` fill its slots; `theme.ts` splits a pure resolver from the hook that writes `data-theme`. |
| `src/routes/` | `paths.ts` (the surface table and the two-base path arithmetic), `router.tsx` (the route tree as DATA plus a `createAppRouter` factory), `DomainGuard.tsx`, `useSearchParamState.ts`. |
| `src/data/` | The fixture data layer and the q15 swap seam. See below. |
| `src/pages/` | One directory per surface, plus `index.ts` — the surface-id to component registry the router reads. Each page keeps its pure helpers beside it as `.ts` (`rows.ts`, `cards.ts`, `fields.ts`), which is where colocated tests can reach them. |
| `src/components/` | App-local stand-ins for `@ar/ui` components that do not exist yet, the shared list-page skeleton, the frame the editor modals are built in (`EditorModal.tsx`), the JSON fallback an editor offers for a shape no fixed template covers (`JsonEditor.tsx`), the pressable-badge filter row the sources toolbar uses in place of a count-carrying `Select` (`FilterBadgeRow.tsx`), and the pure `.ts` modules they share (`editorDraft.ts` for the draft a modal holds, `jsonDraft.ts` for the JSON fallback's parse, format and refusal sentences). See below. |
| `src/test-support/` | Helpers shared by colocated tests only. No app module imports it and the vitest include collects no non-`*.test.ts` file, so it ships in no bundle. |
| `src/styles.css` | Two imports: `tailwindcss` and `@ar/ui/styles.css`. The design tokens, the element defaults and the theme contract all belong to `@ar/ui`. |
| `tests/e2e/` | The Playwright suite. `tests/README.md` states the two-runner split, and why that README is itself load-bearing. |

## The two route bases

The same route tree is mounted TWICE, and nothing below the mount
point branches on which of the two is live:

```
/                     layout (AppLayout: rail + band + content)
  index               -> <Navigate to="digest" replace>
  <surface>           -> one route per SURFACES row
    :entityId[/<x>]   -> modal sub-route, a CHILD of its surface;
                         a surface may declare more than one
  *                   -> not found, still inside the shell
/d/:domainSlug        DomainGuard around the same layout, with the
                      same children built from one function
```

- `src/routes/paths.ts` owns the arithmetic. `domainBase(path)` reads
  the active base off the URL, `withBase` builds a link against it,
  `swapBase` moves a path between the two (so a domain switch keeps
  the operator on the surface they were already looking at), and
  `activeSurfaceId(path)` answers which surface is showing. A
  component ASKS; it never assembles a prefix of its own.
- `SURFACES` is DERIVED from `NAV_ITEMS` — the nav id doubles as the
  route segment and as the `SidebarNav` selection key, so a sidebar
  entry with no route is not something the app can express.
- Five of the six surfaces carry at least one modal sub-route
  (`:entityId` on the digest, `:entityId/edit` on the other four, plus
  `:entityId/config` and `:entityId/failures` on the sources; settings
  has none), each declared
  as a CHILD of its list route so the list stays matched behind an
  open row. The router's table holds a LIST per surface for exactly
  that: a row openable in more than one way is a table row, not a
  branch. The catch-all is likewise a child of the LAYOUT route, which
  is what keeps the shell mounted on a not-found page.
- One element serves both bases wherever the target is RELATIVE: the
  index redirect resolves against whichever parent matched, and a
  modal closes by navigating to the parent route. Write the relative
  MODE out rather than inheriting it — route-relative pops the whole
  matched route, where path-relative would climb one segment and land
  on a path no route declares.
- `domainBase` THROWS on a slug that is not one lowercase path
  segment, and the chrome calls it on every render. react-router v7
  cannot constrain a path parameter with a regex, so `/d/Bad/digest`
  MATCHES the pattern and would take the whole shell down instead of
  rendering not-found. `DomainGuard` is the route element that catches
  it. An UNKNOWN but well-formed slug is deliberately NOT refused
  there: the shell's own reads are all deployment-level and render
  fine under any slug, and it is the domain-scoped PAGE reads that
  have no answer — so saying so is theirs.
- `router.tsx` exports route DATA plus a factory, never a constructed
  router. `createBrowserRouter` reaches for `document` when it is
  CALLED, and `matchRoutes` over the exported `ROUTES` is the only
  verification seam a route tree has from the node unit suite.

## The fixture data layer

`src/data/` is the whole of the app's data access, and it is built to
be replaced: the q15 wave deletes the fixture modules and re-points
one file at HTTP endpoints, and nothing else under `src/` moves.

### The seam is `api.ts`

Three properties make that a re-point rather than a rewrite, and each
one costs something today to buy it.

- **Async, over fixtures already in memory.** Every accessor returns a
  promise, so every call site is written against one from the first
  commit. Resolution is on a MICROTASK and nothing sleeps: a fake
  delay would buy no fidelity — the shape of the call is what the
  pages are rehearsed against, not its latency — and would make every
  Playwright assertion race a timer.
- **Rejection, not a throw.** An unknown slug or a dangling reference
  becomes a rejected promise, because the deferred read is invoked
  inside an `async` function. A cache hook can render a rejected
  promise as an error state; a synchronous throw out of a query
  function reaches the render as an exception and takes the shell down
  with the page. A 404 from a q15 endpoint arrives the same way, so
  the pages meet one shape before and after.
- **Slug-scoped.** The URL carries `:domainSlug` while every fixture
  accessor takes a numeric domain id, and this barrel is the single
  place the two meet — therefore the single place an unknown domain is
  refused.

Eight of the twenty-two reads take NO slug at all, and any rule
written over "every accessor" has to name them or it asserts something
false about a third of the read half: `fetchDomains` (a domain list
cannot be scoped to a domain), `fetchConnectors` and `fetchConnector`
(`connectors` carries no `domain_id` — a connector is a fact about
the installation, so neither the list nor one row of it is scoped),
and `fetchSettings`, `fetchSpendSummary`, `fetchSearchSuggestions`,
`fetchNotifications`, `fetchOperator` (deployment-level, mirroring no
table). Shell-visible: a domain switch leaves the whole topbar, the
sidebar's spend figure, the tools surface's connector cards and the
entire settings surface exactly where they were, and changes the
export list beneath those cards.

### Reads go through `hooks.ts`, and only through it

`hooks.ts` wraps each accessor in `useCache` from `@ar/ui/cache`. Pages
call the hooks; no page and no chrome component imports `api.ts` or a
fixture accessor directly. One that did would render identically today
and lose its loading and error states on the day the read stops
resolving on a microtask.

What a page MAY take from `src/data/` is everything that is not a read:
types, closed-value constants (`NOTIFICATION_CHANNELS`, `FIXTURE_NOW`)
and pure classifiers (`classifySource`, `classifyConnector`,
`resolveDomainSlug`).

Query keys are `[slug, resource]` for a domain read — the slug FIRST,
which is what makes a switch a different cache entry rather than the
same entry answering with the previous domain's rows — and
`DEPLOYMENT_SCOPE` for the seven that take none. That constant carries
an `@`, which no slug does, so the two key spaces cannot collide
however either grows. The raw route param is resolved to a slug in
exactly one place, inside the hooks, so `/` and
`/d/example-tech-radar` never keep two entries holding the same rows.

### Fixtures mirror the service by REDECLARATION

`@ar/web` has no dependency on `@ar/service` and must not take one —
the two are joined by HTTP. Nothing therefore holds the copies in step
mechanically, so the conventions below ARE the drift-detection:

- `types.ts` redeclares the schema vocabulary, and each type's TSDoc
  names the `packages/service/src/db/schema` table it mirrors. Three
  rules keep the redeclaration honest: a nullable column is `T | null`
  and NEVER an optional member (an optional one collapses "unscored"
  into "the author forgot"); a `timestamp with time zone` is an ISO
  string rather than a `Date`, because a string is what the API will
  hand back and what `@ar/ui`'s inputs accept; ids are numbers while
  slugs are the natural keys URLs and accessors use.
- A type that mirrors nothing says so in capitals — `Settings` and
  `SpendSummary` both carry `MIRRORS NO TABLE` — and names what each
  member WOULD be stored against. That is what tells q15 which types
  need a schema decision before an endpoint can exist. A control the
  schema has no column for is marked `MIRRORS NO COLUMN` the same way,
  with the open decision named.
- Fixture CONTENT is transcribed from the service seeds under
  `packages/service/data/` (`domains.json`, `categories.json`,
  `terms.json`, `personas.json`). Transcribed, not imported, so the
  colocated test is the join: pin the payload and name the seed path
  beside it, and a drift then reads as a diff against a file rather
  than as a discovery.
- Narrowings are stated, never silent. `documents` drops the pipeline
  internals no surface renders and `sources` drops its parser config;
  dead weight and an unexplained omission are both worse than a
  documented one.

### Determinism is pinned in the app, not inherited

`FIXTURE_NOW` (`src/data/types.ts`) is the one reference clock every
relative-time render is passed, and each page pins a `DISPLAY_LOCALE`
beside it. Without both, `@ar/ui` falls back to the wall clock and to
`navigator.language`, and a rendered score or timestamp becomes a
property of the machine running the suite rather than of the data.

## App-local stand-ins for absent `@ar/ui` components

`@ar/ui` ships no `PageHead`; it does now ship `EntityCard`, promoted
into `molecules` on this branch. So the rule here is about what keeps
the one REMAINING promotion cheap, and about what the card surfaces
compose now that theirs has landed.

- `src/components/PageHead.tsx` is the stand-in, and it exists in
  order to be DELETED. It imports NOTHING from this app (no route
  helpers, no `../data` types — every value arrives as a prop), so the
  library could take the file as it stands; and it takes composition
  as plain `ReactNode` SLOTS rather than modelling it as data, which
  would restate the tone and variant vocabulary of `Tag`, `Badge` and
  `Chip` in a shape that then grows a case per surface.
- It deliberately does NOT pre-build the library's own component
  contract (`forwardRef`, an `HTMLAttributes` spread, a
  `cn(className)` merge). Every `@ar/ui` export carries it, nothing in
  this app needs it, and an API with no caller is kept alive by the
  next reader assuming one exists.
- `EntityCard` had NO stand-in on purpose, and now needs none. An
  app-local card abstraction would have had to be unwound to land the
  promoted component, which is the opposite of what a stand-in is for
  — so the card surfaces are refitted onto it one at a time, and the
  ones that have not been reached yet still compose `Card` directly.
  The lexicon grid is the first.
- `src/components/FilterBadgeRow.tsx` is app-local for the opposite
  reason to `PageHead`: it is NOT waiting to be promoted. `@ar/ui`
  ships no `FilterBadge` (measured — zero occurrences under
  `packages/ui/src`; `FilterDropdown` hides its options behind a
  trigger and `OptionCard` is panel-sized), and the spec names ONE
  library deliverable for this wave. So it composes `Touchable`
  around `Chip`, and its own docblock enumerates what a promotion
  would have to take over — chiefly the unpressed treatment, which
  is three of `Chip`'s base utilities overridden through `cn` at a
  call site.
- `src/components/ListPage.tsx` is NOT a stand-in and stays for good —
  it composes the router's `Outlet`, which no component library can
  take without taking a router with it. It sits beside `PageHead` and
  EXTENDS `PageHeadProps`, forwarding the rest object whole rather
  than restating the props it passes through: a restated list accepts
  a newly added prop and silently drops it on the way down, which
  type-checks on both sides.
- `src/components/PlaceholderModal.tsx` is the element behind FOUR of
  the fourteen modal registrations (seven addresses across two bases),
  so it may only claim what is true of the agents and tools editors at
  once. The lexicon's two open
  `src/pages/lexicon/LexiconEditorModal.tsx`, the sources' `/edit`
  pair opens `src/pages/sources/SourceEditorModal.tsx`, its `/config`
  pair opens `src/pages/sources/SourceConfigApprovalModal.tsx` and its
  `/failures` pair opens
  `src/pages/sources/SourceFailuresModal.tsx`, and the digest's two
  open `src/pages/digest/DigestDetailModal.tsx`. Both halves of the
  fraction move and they move separately: the numerator shrinks by two
  with each surface after them, the denominator grows by two with each
  address a surface declares BEYOND its first. The digest's landing is
  what narrowed the remaining set to ONE KIND — the placeholder no
  longer has to be true of a read-only detail view as well as of an
  editor — and the sources editor is what narrowed it to two surfaces
  of that kind.

## `@ar/ui` constraints this app is built around

Each of these was measured against the library as shipped, and none of
them may be "fixed" by editing `@ar/ui` — component gaps belong to q15.
They are here because every one of them is invisible to `lint`,
`check-types` and the unit suite.

- **`Button` cannot be used with `asChild` AT ALL.** It always renders
  `{iconLeading}{children}{iconTrailing}`, so Radix's `Slot` counts
  three children and throws — which react-router catches into its error
  boundary, i.e. the shell-down outcome. Every gate here is green over
  it. The app-local answer is a bare `Link`: `tokens.css` already styles
  `a` with the accent colour, an underline and a hover.
- **The format ladder is unreachable.** The root barrel re-exports
  `./lib` as `cn` ALONE, so `formatRelativeTime`, `formatDate` and the
  rest are not importable — only the `Formatted*` COMPONENTS are. A
  `@ar/ui` prop typed `string` that wants a relative time therefore takes
  written prose, anchored in a comment to the stamp it stands for.
- **Every list-shaped prop is declared MUTABLE** (`SearchSuggestion[]`,
  `WorkspaceOption[]`, the table and grid props) while every accessor and
  every `useCache` read hands back `readonly T[]`. Copy at the binding
  (`[...data]`, or the `.map` a shape change needs anyway) rather than
  casting: the fixture arrays are frozen ON PURPOSE, and a cast hands the
  component the frozen array with the compile-time claim removed. The
  mirror rule is for a helper BUILDING such a prop — it returns the
  mutable type, because its array is constructed per call and owned by
  nobody. Say which of the two a new module is in its docblock.
- **`Select` cannot be drawn inert** — `SelectProps` has no `disabled`
  and requires `onChange` — so on a surface with no write seam the choice
  is a LIVE control or NO control, never a disabled one. Its trigger also
  resolves as `options.find(o => o.value === value) ?? options[0]`, so a
  value no option carries renders SOMEBODY ELSE'S option while the stored
  value goes unmentioned. `WorkspaceSwitcher` resolves the same way. Any
  option list built from a read independent of the read holding the value
  must take that value as an argument and guarantee membership.
- **`Field` computes `disabled` from its `state` VARIANT**, which
  suppresses React's controlled-input warning by a presentation choice
  rather than an intent. Pass `readOnly` alongside `state="disabled"`
  whenever a fixture value is displayed in a field.
- **`Grid`'s `cols` is a FIXED track count with no responsive form**, and
  `cn` is tailwind-merge — so `<Grid cols="3" className="md:grid-cols-3">`
  silently drops the variant's own class. Pick the BASE from the variant
  and put only the breakpoint in `className`.
- **`SmallStatCard` formats a numeric `value` with `short` defaulting to
  TRUE**, so a count paints `1.2K` at 1200. Pass `short={false}` beside
  the locale pin; neither is visible as wrong against fixtures small
  enough to render identically either way.
- **`Table` owns its sort state internally** (`initialSort` in, nothing
  out), so marking a column `sortable` creates a reading of the page that
  a shared link cannot carry — which contradicts this app's URL-as-state
  rule. The accessor's own ordering is part of what a surface MEANS and
  belongs in `data/`, not in a column.
- **`renderCellContent('status')` names the dot** `text == null ? label
  ?? tone : label`, so passing BOTH gives the indicator a `role="status"`
  name a screen reader reads on top of the visible text. Pass `label`
  only where it carries something the text does not.
- **`Segmented` renders a HALF tab pattern.** It is `role="tablist"`
  over `role="tab"` buttons carrying `aria-selected`, and it wires no
  `aria-controls` — nor offers a prop that could, its `items` being
  `{ key, label }` alone. So the region a segment switches is a plain
  `div` and NOT a `tabpanel`: half a relationship reads worse than
  none, and a spec reaching for `getByRole('tabpanel')` finds nothing.
  Address the switch as `getByRole('tab', { name })` and give the
  tablist an `aria-label` at the call site — the two words on the
  segments say WHICH view, and nothing else says what they are views
  of. It also spreads `HTMLAttributes`, so that label passes straight
  through (measured). Its track is `inline-flex`, which stretches like
  any flex child, so a call site inside a column wants `self-start`.
- **A `Readonly<Record<Union, T>>` over a cva PROP union is not
  exhaustive** the way one over an app-owned union is: every
  `VariantProps` member resolves to `T | null | undefined`, so a key set
  to `undefined` type-checks and the component falls back to its own
  default variant. The record still refuses a missing key and an excess
  one; only a colocated "gives every member a value" test catches the
  third case.

## The brand slot (CRITICAL)

The rail's brand block is `WorkspaceMark` plus app-local lockup text,
and the alternatives are ruled OUT rather than merely not chosen:

- `Wordmark` renders the origin project's two brand words straight
  into the DOM. Using it would put another project's name in the
  shipped UI and trip the de-origination sweep the root `AGENTS.md`
  describes.
- `TomatoMark`'s own docblock restricts the mascot to `EmptyState` and
  the auth screens.
- The `.wordmark` classes in `@ar/ui`'s `tokens.css` are out for the
  same reason as `Wordmark`: they exist to recreate that lockup in
  HTML, and their child class names are origin-branded.

`WorkspaceMark` derives its initials from the `name` it is handed,
which makes it the one brand atom in `@ar/ui` carrying no origin
identity of its own. Compose the app name FROM its two words and let
the mark split it, rather than splitting one string back apart — the
reverse direction needs a fallback for a name that is not two words,
and that fallback renders half a lockup silently. The visible type
beside the mark is `aria-hidden`, because `WorkspaceMark` is a
labelled `img` already carrying the same name.

The package's own `eslint.config.mjs` carries the reference-free
`no-restricted-imports` gate as well, assembled from string parts so
the banned names never appear as literals. That gate reads IMPORTS
only — the brand slot above is prose and markup, and nothing
automated defends it.

## Testing — two runners

`test` is `vitest run && playwright test` behind one script line, with
a `pretest` that builds `@ar/ui` so the suite is self-contained
whatever order the root fan-out reaches the packages in.

| Runner | What it reaches | Where the tests live |
| --- | --- | --- |
| `vitest` | Pure modules only — node environment, no DOM, include `src/**/*.test.ts` (`.ts`, never `.tsx`) | Colocated beside the module |
| `playwright` | The assembled app in a real browser, chromium alone | `tests/e2e/*.spec.ts` |

That split is what makes the pure-function/component division in this
package load-bearing rather than stylistic: a `.tsx` file is read by
`lint` and `check-types` and by NO test, so shape each module so the
decision is a pure function over already-read browser values and the
component or hook is the thin part around it. `pages/*/rows.ts`,
`cards.ts`, `fields.ts`, `pages/filters.ts` and `app-shell/theme.ts`
are all that shape. Anything touching `document` at import time
crashes the unit runner outright and takes its whole file with it.

Reading a run:

- The `&&` short-circuits. A red vitest means Playwright never ran, so
  the ABSENCE of a Playwright section from a capture is not evidence
  that it passed. Read BOTH summaries.
- Both runners fail CLOSED on an empty suite — `vitest run` exits 1 on
  no matching files, and `playwright test` exits 1 with `No tests
  found` before the webServer even starts. Do not reach for
  `passWithNoTests` or `--pass-with-no-tests`: they restore exactly
  the vacuous-green property the package's old placeholder `echo` had.
- Every Playwright run prints an `@import must precede all other
  statements` warning from `@ar/ui`'s built stylesheet. It is
  pre-existing, non-fatal and belongs to that package — not an e2e
  regression to chase from here.

Spec conventions:

- A spec MAY import the app's pure `src/` modules for a constant the
  app owns outright (`SINGLE_DOMAIN_BASE`, `DOMAIN_BASE_PREFIX`,
  `DEFAULT_DOMAIN_SLUG`, a surface id), so a rename moves the app and
  the spec together. It may also await the app's own fixture
  accessors, which resolve on a microtask inside the Playwright
  process — but a derived list then needs its length pinned against
  the source, or a fixture that lost a field leaves an empty list and
  every assertion in the loop over it passes.
- A spec must SPELL a value that is a contract with something OUTSIDE
  the package. `data-theme` and its `light`/`dark` values are `@ar/ui`
  token selectors: importing the app's own constant for them would
  keep both sides green while the deployment quietly stopped changing
  colour.
- `playwright.config.ts` pins `locale`, `timezoneId` and `colorScheme`
  in `use`, and serves the app on port 5174 with `--strictPort` so a
  developer's own `bun run dev` is never silently the server under
  test. `retries` is 0, stated rather than inherited: the data
  resolves from memory and the server is started by the config, so a
  second attempt that passed would be hiding a real bug.
- Output (`test-results/`, `playwright-report/`) is gitignored at the
  repo root, and a failing run writes the first of those even with
  every artifact setting at its default.

The locator vocabulary this shell forces, so it is not re-derived one
strict-mode failure at a time. Deriving it up front is one throwaway
spec printing `ariaSnapshot()` of the landmark plus `outerHTML` of the
trigger — but delete it in the same step, because `tests/e2e/` IS the
`testDir` and a leftover probe silently JOINS the suite and its count.

- `AppShellTopbar` renders its `header` INSIDE `main`, so the band is
  NOT a `banner` landmark and the only role-addressable handle on it is
  the collapse `IconButton`'s accessible name.
- The two rail navs carry distinct landmark names (`Main navigation`,
  `Quick access`), and `settings` is deliberately in BOTH — so a bare
  `getByRole('button', { name: 'Settings' })` matches two elements.
  Scope every nav-item locator to its landmark. `NavItem` sets
  `aria-current="page"`, which is how "no surface is active" becomes an
  assertion rather than a screenshot.
- A COLLAPSED `NavItem` keeps exactly the accessible name it had
  expanded (the label element is dropped and `title` takes over), so
  the rail's two states are byte-identical to a name locator. Collapse
  evidence has to be TEXT (`toHaveText('')` covers every entry at
  once); the accessible-name loop then becomes a separate and genuinely
  valuable claim — the rail lost its labels, not its navigation.
- Three separate causes make a correct-looking name locator match TWO
  nodes. A slot wrapper holding one element carries the same exact text
  as the element inside it (`PageHead`'s tag slot, `CellDoubleLine`
  with no subtitle). `RowContextAction`'s trigger is labelled `Actions
  for <entityName>`, so a row's summary sits in a SECOND cell's name —
  address a row as `getByRole('row', { name })`, and assert the leading
  cell as well wherever the row needle is also the menu's entity name,
  or a row that stopped rendering its summary still matches. And
  `WorkspaceMark` is a labelled `img` sitting beside a span repeating
  the same name, so `WorkspaceSwitcher`'s trigger and every menu row
  carry the domain name TWICE — `{ exact: true }` matches nothing there
  and a substring match is the honest form, since the doubling is
  `@ar/ui`'s composition rather than the app's promise.
- Any Radix `Menu` (`WorkspaceSwitcher`, `ProfileMenu`,
  `RowContextAction`) portals its panel, so it is reached as
  `getByRole('menu')` rather than through the trigger's DOM ancestry;
  rows are `menuitem` and must be scoped to the menu, since the menu
  inherits the trigger's name. Which row is ACTIVE is not addressable
  at all — `MenuItem` is a plain Radix `Item`, marked only by a CSS
  class and a lazily-loaded glyph — so the trigger's own text is the
  only assertion available for the current selection.
- `EmptyState` draws its title in a `span`, so there is no heading role
  and a text locator wants `{ exact: true }`.
- `ThemeSwitcher` and the collapse control both name the state ON OFFER
  (`Switch to dark theme` while light), so exactly one of each pair is
  on the page at a time and `toHaveCount(0)` on the other half is a
  real assertion.
- Shell GEOMETRY is a CSS transition (`transition-[width]`), so a
  `boundingBox()` read straight after a collapse click reports a
  mid-animation number. Use `expect.poll` — a deterministic wait rather
  than a sleep — and compare against a width measured in the test's own
  Arrange, not against a token living in another package.
- Keep a SAME-DAY stamp out of any text assertion: `formatRelativeTime`
  opens with a same-calendar-day rung returning a local clock time, so
  `FIXTURE_NOW` alone does not make that output deterministic.

CI runs both runners from `.github/workflows/front.yml`'s `checks`
job, with `working-directory: packages/web` on the browser install and
on the test step. That directory is load-bearing rather than tidy:
bun's isolated linker leaves the repo root with no playwright binary
to resolve, so `bun x playwright` there silently fetches a version the
lockfile never chose.

## Verification order

The fast inner loop, from inside `packages/web`:

```bash
bun run lint && bun run check-types && bun run test
```

The root fan-out (`lint:all`, `check-types:all`, `test:all`) is the
gate before a PR — read the per-package lines rather than the exit
code, per the root `AGENTS.md`. Four properties of this package's
gates are worth knowing before calling a change verified:

- `lint` uses the explicit-path form (`eslint src tests *.ts *.mjs`),
  which fails CLOSED with exit 2 on any path matching no lint target.
  An EMPTY directory counts as no target — which is what
  `tests/README.md` exists to prevent.
- The React rule sets (`react-hooks`, `jsx-a11y`, `react-refresh`) are
  scoped to `.jsx` and `.tsx` alone, so a hook living in a `.ts` file
  gets NO rules-of-hooks and no `exhaustive-deps` checking. Read those
  dependency arrays by hand.
- `check-types` covers `src`, `tests` and the package-root config
  files. The `*.mjs` entry in the tsconfig `include` is inert without
  `allowJs`, and the package `test` script does not type-check at all
  (vitest transpiles per file), so a module can be green under `test`
  and red under `check-types`.
- `check-types` CANNOT see a missing `@ar/ui` runtime artifact: that
  package's exports map resolves types and values from DIFFERENT
  files, so a subpath import whose JS is absent still type-checks
  clean. `bun run build` is the cheapest thing that proves an import
  actually resolves.
