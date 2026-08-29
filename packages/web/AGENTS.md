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
| `src/components/` | App-local stand-ins for `@ar/ui` components that do not exist yet, plus the shared list-page skeleton. See below. |
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
    :entityId[/edit]  -> modal sub-route, a CHILD of its surface
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
- Five of the six surfaces carry a modal sub-route (`:entityId` on the
  digest, `:entityId/edit` on the other four; settings has none),
  declared as a CHILD of its list route so the list stays matched
  behind an open row. The catch-all is likewise a child of the LAYOUT
  route, which is what keeps the shell mounted on a not-found page.
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

Seven of the seventeen accessors take NO slug at all, and any rule
written over "every accessor" has to name them or it asserts something
false about 40% of the barrel: `fetchDomains` (a domain list cannot be
scoped to a domain), `fetchConnectors` (`connectors` carries no
`domain_id` — a connector is a fact about the installation), and
`fetchSettings`, `fetchSpendSummary`, `fetchSearchSuggestions`,
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

`@ar/ui` ships no `PageHead` and no `EntityCard`. The UI spec names
both, and q15 promotes them into the library — so the rule here is
about what keeps that promotion cheap.

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
- `EntityCard` has NO stand-in on purpose: the card surfaces compose
  `Card` directly. An app-local card abstraction would have to be
  unwound to land the promoted component, which is the opposite of
  what a stand-in is for.
- `src/components/ListPage.tsx` is NOT a stand-in and stays for good —
  it composes the router's `Outlet`, which no component library can
  take without taking a router with it. It sits beside `PageHead` and
  EXTENDS `PageHeadProps`, forwarding the rest object whole rather
  than restating the props it passes through: a restated list accepts
  a newly added prop and silently drops it on the way down, which
  type-checks on both sides.
- `src/components/PlaceholderModal.tsx` is the element behind all ten
  modal registrations (five surfaces across two bases), so it may only
  claim what is true of a read-only detail view AND four editors at
  once.

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
