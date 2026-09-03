# AGENTS — @ar/web

The web app: Vite + React 19 + react-router v8 over `@ar/ui`. It runs
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
| `src/data/` | The fixture data layer and the API swap seam: `api.ts` (the accessors — reads, and, since the editors landed, writes), `hooks.ts` (one cache hook per accessor), `types.ts` (the redeclared schema vocabulary and `FIXTURE_NOW`), one fixture module per table — `proposals.ts` is the newest of them, redeclaring `source_config_proposals` — and `drafts.ts`, the session draft store every write is recorded in. See below. |
| `src/pages/` | One directory per surface, plus `index.ts` — the surface-id to component registry the router reads. Each page keeps its pure helpers beside it as `.ts` (`rows.ts`, `cards.ts`, `fields.ts`, `editor.ts`, `schema.ts`), which is where colocated tests can reach them, and its own modal `.tsx` beside the list page — all seven the router registers live in the surface directory that owns them, never in `src/components/`. |
| `src/components/` | App-local stand-ins for `@ar/ui` components that do not exist yet, the shared list-page skeleton, the frame the editor modals are built in (`EditorModal.tsx`), the JSON fallback an editor offers for a shape no fixed template covers (`JsonEditor.tsx`), the pressable-badge filter row the sources toolbar uses in place of a count-carrying `Select` (`FilterBadgeRow.tsx`), and the pure `.ts` modules they share (`editorDraft.ts` for the draft a modal holds, `jsonDraft.ts` for the JSON fallback's parse, format and refusal sentences). See below. |
| `src/test-support/` | Helpers shared by colocated tests only. No app module imports it and the vitest include collects no non-`*.test.ts` file, so it ships in no bundle. |
| `src/styles.css` | Two imports: `tailwindcss` and `@ar/ui/styles.css`. The design tokens, the element defaults and the theme contract all belong to `@ar/ui`. |
| `tests/e2e/` | The default Playwright suite, behind `playwright.config.ts`. `tests/README.md` states the two-runner split, and why that README is itself load-bearing. |
| `tests/visual/` | The screenshot suite, behind `playwright.visual.config.ts` and deliberately outside the default run. Its baselines are per-machine and untracked; these specs are not, which is what `packages/web/.gitignore` exists to say. |

## The two route bases

The same route tree is mounted TWICE, and nothing below the mount
point branches on which of the two is live:

```text
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
- Five of the six surfaces carry at least one modal sub-route, seven
  addresses in all; settings has none, being one form rather than a
  list with rows to open. Each is declared as a CHILD of its list
  route so the list stays matched behind an open row, and the
  router's table holds a LIST per surface for exactly that: a row
  openable in more than one way is a table row, not a branch. The
  catch-all is likewise a child of the LAYOUT route, which is what
  keeps the shell mounted on a not-found page.
- Every one of those seven entries carries its own ELEMENT beside its
  path, and none of them is the shared placeholder any more. The
  digest opens `DigestDetailModal` at a bare `:entityId` — read-only,
  and already the address a routed detail page would answer at. The
  lexicon, agents and tools each open one editor at `:entityId/edit`
  (`LexiconEditorModal`, `AgentEditorModal`, `ConnectorEditorModal`).
  The sources are the only surface using the list shape so far and
  use all of it: `:entityId/edit` opens `SourceEditorModal`,
  `:entityId/config` opens `SourceConfigApprovalModal`, and
  `:entityId/failures` opens `SourceFailuresModal` — three
  addresses over one list, none of them a child of either other.
- One element serves both bases wherever the target is RELATIVE: the
  index redirect resolves against whichever parent matched, and a
  modal closes by navigating to the parent route. Write the relative
  MODE out rather than inheriting it — route-relative pops the whole
  matched route, where path-relative would climb one segment and land
  on a path no route declares.
- `domainBase` THROWS on a slug that is not one lowercase path
  segment, and the chrome calls it on every render. react-router
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
be replaced: a later wave deletes the fixture modules and re-points
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
  with the page. A 404 from an API endpoint arrives the same way, so
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
  member WOULD be stored against. That is what tells the API swap
  which types need a schema decision before an endpoint can exist. A
  control the schema has no column for is marked `MIRRORS NO COLUMN`
  the same way, with the open decision named.
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
  — so the card surfaces were refitted onto it one at a time:
  lexicon, then agents, then the connector grid in
  `src/pages/tools/ToolsPage.tsx`. All three are refitted now, and
  `Card` is imported nowhere under `src/` — so a new card surface
  composes `EntityCard`, and reaching for `Card` is the thing to
  explain rather than the default.
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
- `src/components/PlaceholderModal.tsx` is the element behind NONE of
  the fourteen modal registrations (seven addresses across two bases).
  The lexicon's two open `src/pages/lexicon/LexiconEditorModal.tsx`,
  the sources' `/edit` pair opens
  `src/pages/sources/SourceEditorModal.tsx`, its `/config` pair opens
  `src/pages/sources/SourceConfigApprovalModal.tsx` and its
  `/failures` pair opens
  `src/pages/sources/SourceFailuresModal.tsx`, the agents' two open
  `src/pages/agents/AgentEditorModal.tsx`, the tools' two open
  `src/pages/tools/ConnectorEditorModal.tsx`, and the digest's two
  open `src/pages/digest/DigestDetailModal.tsx`. Both halves of the
  fraction moved and they moved separately: the numerator shrank by
  two with each surface, the denominator grew by two with each address
  a surface declared BEYOND its first, and the tools connector editor
  took the numerator to zero. The file survives that landing —
  `src/routes/router.test.ts` now asks whether ANY declared address
  opens it, a claim rather than a ledger, and four landed modals cite
  it for the relative-close reading — so removing it is a decision of
  its own.

## `@ar/ui` constraints this app is built around

Each of these was measured against the library as shipped, and none of
them may be "fixed" by editing `@ar/ui` from here — a component gap is
closed by a promotion of its own, on a wave that owns `packages/ui`.
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
  and put only the breakpoint in `className`. `EntityCard`'s promotion
  did NOT retire this bullet, which is worth stating because it did
  narrow it: `EntityCardGrid` owns an auto-fill track as a `min`
  variant, so the three card surfaces no longer reach for `Grid`. The
  one remaining caller under `src/` is the sources stat band, and it
  is written exactly as prescribed — `cols="1"` taken from the
  variant, `md:grid-cols-3` alone in `className`.
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

## Editors, drafts and the write seam

`src/data/drafts.ts` is module-scoped state living in the TAB, and most
of what follows is a consequence of that rather than a design choice.
A later wave flips `src/data/api.ts` to a live API and deletes this
layer; until then these are the app's real rules.

- **The store can never INSERT a row.** An editor gesture that ADDS one
  is adding to that modal's own working copy and to nothing else: the
  save records nothing for it and a reopen does not show it. Do not
  hide it — mint the added row an id the service could never issue
  (negative, descending below the lowest the list carries, the real
  columns being positive serials), export the predicate that reads it
  back, and badge the row with a sentence calling the additions
  unsaved ROWS rather than terms. The minting belongs in the page's
  `.ts` beside the parse, or it is reachable by no test.
- **`applyDrafts` replaces the WHOLE row**, so an omitted key is a key
  the overlaid row no longer HAS. Over the wire an omitted key means
  "keep what you have" and here it does not, so a module with a
  write-only field has to state both readings — a reader taking the
  PUT one for the seam's concludes the opposite of what runs.
- **`page.goto` is a fresh document and resets the store.** A spec
  proving a save survived must re-reach the editor by CLICKING the
  card, never by a second `goto` to the same address: a goto-based
  reopen shows the FIXTURE rows and reddens the case, which reads
  exactly like a save that recorded nothing. `page.reload()` is then
  the reload leg of the same claim, and the one place a fresh document
  is the gesture rather than the bug.
- **Any colocated test touching a read accessor owes a top-level
  `beforeEach(resetDrafts)`** — `api.ts` reads the store on every
  accessor, so without it a case inherits whatever the case before it
  recorded and the file passes or fails on an order nobody chose
  (measured: no-oping that hook reddens six cases). It is also what
  makes block ORDER stop mattering, so new draft-aware cases can be
  appended to an existing file.
- **`invalidateQueries` matches by PREFIX**, so `{ queryKey: [] }`
  matches EVERY query in the cache. Model "what this write can change"
  as a LIST OF WHOLE KEYS, never as one key that could arrive empty:
  an empty LIST invalidates nothing, which is the honest shape for a
  write whose read does not exist yet. Prefix matching is also why a
  two-segment `[slug, resource]` key already covers a three-segment
  single-row read that lands later.
- **`EditorModal` has no refusal channel.** Its save is disabled on
  exactly two readings, `isDirty(draft)` and `saving`, so an editor
  whose page `.ts` answers refusal SENTENCES declines in its own
  `onSave` handler and surfaces them itself. Do not borrow `saving`
  for a third meaning — that flag's whole job is refusing a double
  submit. The cost is a click that is refused rather than prevented,
  so the sentences must be on screen BEFORE the click: a live region
  rendered from mount, not one that arrives with its first sentence.
- **A modal that NORMALISES the loaded row** (stripping a mask,
  blanking a write-only member) must hand `withLoadedRow` the OPENED
  row as the holder's SOURCE, never the row the query answered.
  Comparing a normalised draft against a raw source reports an
  untouched editor as carrying unsaved work and the footer never falls
  silent. Such an editor also can never report itself clean again once
  the field is retyped — the opener strips the key out of every
  source that can ever arrive — so closing on a successful save is
  what keeps it off the screen. That is inherent, not a fixture
  artefact: an HTTP read answers a mask for the same reason.
- **A page-level draft is cleared in `mutate`'s OWN `onSuccess`**,
  never in the hook's. `useInvalidatingMutation` hands the
  invalidation `Promise.all` back, and react-query awaits the
  mutation-level callback before the per-call one, so by then every
  invalidated read has already answered with the saved value.
  Emptying it earlier puts one frame of pre-save values on screen and
  every gate is green through it.
- **A numeric operator-facing field cannot write its draft on every
  keystroke.** Text that does not read as a value stays VISIBLE and
  stays OUT of the draft, which needs a text override map beside it
  — so a save can be offered while a field shows a refusal, the
  refusal meaning the last keystroke did not reach the draft. Note
  `Number('')` is `0` and `Number('Infinity')` is finite-looking, so
  the guard is a non-empty check plus `Number.isFinite`, never
  `!Number.isNaN`. Trimming inside a MOVER is safe only where the
  modal holds its own typed text; a control drawn straight from a
  trimmed draft swallows the space between two words as the second is
  being typed.
- **Adding an accessor SHAPE costs partitions, not assertions.** Both
  `api.test.ts` and `hooks.test.ts` partition the barrel by SHAPE, so
  a single-row read `(slug, id)`, a parent-keyed child list and a
  write each need their own NAME LIST and case TABLE rather than a row
  of a neighbour's — a read taking an id dropped into the
  slug-alone table is driven with `undefined` and its refusal is read
  as the unknown-slug one. Measured blast radius for one such
  accessor: five partitions in each file plus the shared-options
  roster. Budget a commit for the partitions BEFORE writing a single
  new assertion, and add a third population rather than an exemption
  filter, which lets a member of the new shape hide among the old.
- **Only ONE fixture domain carries rows.** `example-tech-radar` is
  seeded and `example-reading-list` is deliberately empty, so a read
  of the sparse domain answers `[]` whatever scope it built — which
  means "scoped by the slug this call was handed" is GREEN under a
  hardcoded slug in `api.ts` and is only half-testable there. Put that
  claim on the WRITE side, where the draft store files whatever it is
  given under whatever scope it is given (measured: all seven scoped
  writes redden by name). A FIXTURE module's own list accessor does
  carry it — the same mutation makes the sparse and unknown reads
  answer the seeded rows — so the limit is a property of the
  OVERLAY layer and not of fixtures.
- **The fixture tables are keyed by id ALONE**, so `findSource(1)`
  answers a row whatever slug stood in the URL, and once the draft
  overlay composes on top a mismatched pair lays one domain's edits
  over another domain's row. Wrap `find*` (not `get*`), check
  `row.domainId` against the resolved domain, and refuse with the SAME
  message a missing row gets — which is what a scoped endpoint
  answers too, and what makes a foreign-row address a real refusal a
  spec can drive rather than a fabricated one.

## Accessibility and motion — measured, with a standing ledger

Every reading here was taken against the app as built, twice and
deterministically, and the ones that are DEBT are recorded as ledgers
that the repair reds rather than as bare zeros.

- **The app carries THREE serious-impact axe violations at the merge
  base, all owned by `@ar/ui` and none reachable from here.**
  `aria-progressbar-name` (1 node, every surface): `SidebarWeekSummary`
  renders `Progress` with no accessible name. `aria-dialog-name` (1
  node, every modal): `Modal` puts `aria-labelledby` on its role-less
  panel while `role="dialog"` sits on the `Overlay` one level up, and
  `Overlay` takes a `label` prop for exactly this that `Modal` never
  passes, so no call site can name a dialog. `color-contrast`:
  `Badge.variants.ts` pairs each tone with a wash of itself and the
  `--fg3` token reads 2.53:1 at 11.5px. `tests/e2e/a11y.spec.ts`
  carries them as a LEDGER compared by SET EQUALITY, which is the
  shape to copy for any scan whose honest answer is non-zero: a new
  finding reds it, AND a ledger entry that has stopped having a
  subject reds it too, which is the half an allowlist cannot do. The
  ledger is also its own liveness control, since a scan that reached a
  blank page answers an EMPTY set. Pin a node COUNT only where the
  rule is renderer-independent — a markup rule is safe,
  `color-contrast` is not, axe moving a node it cannot resolve to
  `incomplete` rather than to `violations`.
- **Focus is NOT returned to the control that opened a modal,
  anywhere.** Radix's `DialogContentModal` cancels its own restore and
  focuses `context.triggerRef.current` instead, which is filled by a
  `Dialog.Trigger` — and `Overlay` renders none, these modals being
  opened by a ROUTE. So `document.activeElement` is the BODY after
  every close (measured on all seven modal addresses, both openers,
  Escape and Cancel alike), and the next Tab restarts the whole shell.
  Carried in, and UNREPAIRABLE from this package: `Overlay` does not
  forward `onCloseAutoFocus`. The spec therefore asserts the body, as
  a documented ledger, with the opener asserted still visible and
  enabled beside it so the red is about focus and never about a
  control that vanished.
- **An open `Modal` `aria-hidden`s the app root**, and that has a
  locator half and an axe half. `page.getByRole('main')` resolves to
  ZERO elements while a dialog is open, taking every locator scoped
  under it (a CSS one included), so a grid/rail/topbar assertion is
  taken BEFORE the modal opens or AFTER it closes. And axe does not
  walk hidden subtrees, so scanning a modal address reports the DIALOG
  alone — which makes a modal address answering the SURFACE set the
  reading that says the dialog never opened. Assert the dialog visible
  before scanning.
- **`.animate-shimmer` is the app-wide settled-state handle.**
  `@ar/ui`'s `Skeleton` is its only user, and every page and modal
  renders one while its read is in flight, so
  `expect(page.locator('.animate-shimmer')).toHaveCount(0)` waits out
  every stand-in at once. It matters most for a SCAN: a `Skeleton` is
  `aria-hidden`, so axe walks straight past one and a scan taken
  mid-load reports a CLEAN page having read no content at all.
- **`test.use({ reducedMotion })` is GONE at the pinned 1.62.1**, and
  its two failure modes need separating because one is silent. The
  flat option is not in `PlaywrightTestOptions` (TS2353), but a test
  DESTRUCTURING it is still handed `'reduce'` while the browser
  context is never told — so a file that suppressed the type error
  runs every case in the DEFAULT state and passes. Use
  `test.use({ contextOptions: { reducedMotion: 'reduce' } })` or
  `page.emulateMedia`, and assert
  `matchMedia('(prefers-reduced-motion: reduce)').matches` in the
  Arrange: it is the only reading separating a reduced-motion case
  from one that quietly ran in the default state. Expect the same
  shape for `forcedColors` and `contrast`.
- **`@ar/ui` reduces motion through TWO independent mechanisms** and a
  spec needs a subject for each: Tailwind's `motion-reduce:animate-none`
  on a CVA variant (`StatusIndicator`, `Skeleton`, `Progress`), and a
  global `*, *::before, *::after` rule in `tokens.css` capping
  animation and transition duration at `0.01ms !important`. The second
  reaches INSIDE the Radix portal (measured), which is worth checking
  rather than assuming. The whole app's settled-state motion inventory
  is TWO `pulseRing` dots, derived by walking every element and
  reading `getComputedStyle(node).animationName` — so a motion
  sweep over the other five surfaces is a zero-hit scan whose only
  liveness control is the sources surface. `Overlay` itself ships NO
  enter/exit transition, so a claim about a modal TRANSITION settling
  has no subject in the frame; the modal motion that exists is inside
  it (`Switch`'s knob is `transition-[left] duration-150`).
- **"Not animating" is a rAF WINDOW reduction, never an instant.**
  `expect.poll` retries until the assertion PASSES, so an animating
  element satisfies an instantaneous read on whichever frame happens
  to match and the case is vacuous. Return the widest deviation across
  N `requestAnimationFrame` samples taken inside ONE browser task, and
  press-and-sample inside one `page.evaluate` — a click issued from
  node returns after the 150ms has already elapsed and reads the same
  zero the settled case does, so a node-side press makes the control
  silently agree with what it was meant to discriminate against.
  `offsetWidth` against `getBoundingClientRect().width` is the free
  transform-blind / transform-aware pair, which lets ONE element
  supply both the reading and its expectation.
- **The shell has NO responsive behaviour of any kind.**
  `appShellSidebar` is a flat `w-[var(--sidebar-w)]` with no media
  query, measured at 264px identically at 320, 768, 1024 and 1440, and
  `AppLayout` seeds collapse as a plain `useState(false)` with nothing
  watching the viewport. A 320px shot is therefore a 264px rail beside
  a 56px content column — a picture of the rail. Record that rather
  than working around it in a spec; open debt for whoever owns the
  `packages/ui` shell.
- **The DOCUMENT scrolls and the shell's own scroller does not**,
  which is the reverse of what the markup suggests: `AppShell` is
  `h-full` inside a body with no height, so it sizes to content, while
  `AppShellContent`'s `overflow-y-auto` reported `scrollHeight ===
  clientHeight` on every surface at every width. So `fullPage: true`
  genuinely reaches everything below the fold, and a spec that scrolls
  the inner slot to reveal a row is driving a scroller that never
  scrolls.
- **`tokens.css`'s Google Fonts `@import` is DROPPED** and the app
  renders in the host's `system-ui` fallback. The postcss `@import
  statements must precede all other statements` warning on every dev
  boot IS the whole story: measured zero offsite requests and
  `document.fonts.size === 0` on a settled page. Good for a screenshot
  suite (no webfont race to lose) and a real finding otherwise — any
  typography claim about the declared display and body families is
  currently false.

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

## Testing — two runners, two Playwright configs

Two runners, and Playwright is configured TWICE over the one app:

| Runner | What it reaches | Where the tests live |
| --- | --- | --- |
| `vitest` | Pure modules only — node environment, no DOM, include `src/**/*.test.ts` (`.ts`, never `.tsx`) | Colocated beside the module |
| `playwright` via `playwright.config.ts` | The assembled app in a real browser, chromium alone, on port 5174 | `tests/e2e/*.spec.ts` |
| `playwright` via `playwright.visual.config.ts` | The same app screenshotted at four widths in both themes, on port 5175 | `tests/visual/*.spec.ts` |

That split is what makes the pure-function/component division in this
package load-bearing rather than stylistic: a `.tsx` file is read by
`lint` and `check-types` and by NO test, so shape each module so the
decision is a pure function over already-read browser values and the
component or hook is the thin part around it. `pages/*/rows.ts`,
`cards.ts`, `fields.ts`, `editor.ts`, `pages/filters.ts`,
`app-shell/theme.ts` and the pair under `src/components/`
(`editorDraft.ts`, `jsonDraft.ts`) are all that shape. Anything
touching `document` at import time crashes the unit runner outright
and takes its whole file with it.

Four scripts drive them, and only the first two are ever a gate:

| Script | What it is |
| --- | --- |
| `pretest` | `bun run --filter '@ar/ui' build`, so the suite is self-contained whatever order the root fan-out reaches the packages in |
| `test` | `vitest run && playwright test` behind one script line — the default config, and the only test script CI runs here |
| `test:visual` | `playwright test --config playwright.visual.config.ts`, asserting the screenshots against THIS machine's baselines |
| `test:visual:update` | the same with `--update-snapshots=changed`, which seeds a machine's set or refreshes only the shots that moved |

The screenshot suite sits outside the default run for a measured
reason rather than a preference. At the pinned 1.62.1 `updateSnapshots`
defaults to `missing`, and a baseline that does not exist is WRITTEN
and reported as a soft error — so the first run on a machine with
none exits 1 having also created the file. CI runs `bun run test` in
this package on a hosted runner that has no baselines at all, so a
screenshot spec living under `tests/e2e/` would red that job on the
first push and stay red. Three consequences, none of them visible
from a green run:

- Neither visual script gets a `pretest`. bun's lifecycle hook is
  `pre` plus the WHOLE script name, so only `test` declares one here
  and the two visual scripts build nothing at all. Build `@ar/ui` by
  hand first, or a baseline is a picture of whatever that package's
  gitignored `dist/` last held.
- `snapshotPathTemplate` resolves a RELATIVE result against the config
  file's own directory, so the set lands in
  `packages/web/visual/__screenshots__/` — inside the repo-root
  `.gitignore`'s unanchored `visual/` entry, which is the whole reason
  the path is spelled that way. The baselines are per-environment for
  the reason `@ar/ui`'s are: regenerate a set, never copy one between
  machines.
- That same unanchored entry also swallowed `tests/visual/`, the
  suite's own SOURCE, and did it silently: every gate reads a spec off
  disk whatever git thinks, so `lint`, `check-types` and the runner
  all stay green while `git add -A` stages nothing.
  `packages/web/.gitignore` restates `visual/` and then negates
  `!tests/visual/` — within one ignore file the LAST matching
  pattern wins.

Reading a run:

- The `&&` short-circuits. A red vitest means Playwright never ran, so
  the ABSENCE of a Playwright section from a capture is not evidence
  that it passed. Read BOTH summaries.
- This package is the ONLY source of the root fan-out's pass-glyph
  ticks, so growing THIS suite is what moves a figure the root
  `AGENTS.md` discusses as invariant under vitest growth. Measured
  across q15: 27 Playwright cases contributing a fan-out total of 31,
  then 146 contributing 150, the constant 4 being two vite build ticks
  apiece from the `@ar/ui` and `@ar/web` pretests. Decompose that total
  BY PREFIX rather than quoting it — the vitest reporter contributes
  exactly zero of them, so the whole figure is this package's Playwright
  count plus 4.
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
  `playwright.visual.config.ts` repeats all four decisions on port
  5175, which is what lets the two suites coexist: a shared port would
  leave whichever started second either waiting out its timeout or
  screenshotting a tree it did not build.
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
  `FIXTURE_NOW` alone does not make that output deterministic. The
  stamp-free way to read a TABLE's membership AND order is the row
  menu triggers' `aria-label`s — `RowContextAction` names each
  `Actions for <entityName>`, so one `evaluateAll` filtered on that
  prefix answers the titles in draw order with no time cell in the
  reading. Where `entityName` is not unique (three sources rows share
  a host), read the leading cell's `textContent` instead and scope
  every row action by ROW first.
- `@ar/ui`'s `Select` is a Radix DROPDOWN MENU, not a listbox: its
  trigger is a `button` named by `ariaLabel` alone, and its panel is a
  `role="menu"` of `menuitemradio` items rendered through a PORTAL. So
  it is addressed as `page.getByRole('menu')` at PAGE scope —
  scoping it under an open dialog finds nothing, the panel being the
  modal's sibling. Its trigger carries the HELD VALUE as its text
  while its accessible NAME is the `ariaLabel`, so the two readings
  answer different things. Arrow keys CLAMP at the last item rather
  than wrapping, typeahead works, and Escape inside an open menu
  closes the MENU ONLY — the second press dismisses the dialog.
- `Table` renders TWO `<table>` elements (a sticky header and the
  body), so `page.getByRole('table')` is a strict-mode violation on
  every list surface and `.last()` under `main` is the body.
- `EntityCard` renders a role-less `div`, so the only stable way into
  one card is its `h2` two steps up
  (`getByRole('heading', { level: 2, name, exact: true })
  .locator('xpath=../..')`). `SmallStatCard` renders no role either
  and wants the same two-step walk off its title text — and that
  title is uppercased by CSS rather than in the markup, so an
  `innerText` reading answers `ACTIVE SOURCES` where the module
  declares `Active sources`.
- `toContainText` compares `textContent`, which runs adjacent
  elements together with NO separator (a polarity footer reads
  `Positive2Negative1`), so pass `{ useInnerText: true }` wherever the
  expected string spans two elements. The ACCESSIBLE NAME of the same
  node is normalised instead (`Positive 2`), and `allTextContents()`
  answers the run-together form — pick one reading and say which. A
  `section` carrying a heading is a `region` whose name is that
  heading's WHOLE text, counts included, so a name that moves with
  every gesture must be matched on the label alone.
- `SectionCard` given no `aria-label` exposes NO landmark at all, and
  its header row draws whatever state the body is in — so a title
  assertion is MEMBERSHIP only and passes identically against a page
  whose every section is showing its loading stand-in. The reading
  with content in it is the section's own controls.
- `page.getByRole('main')` is NOT a page-content scope: the landmark
  holds the whole TOPBAR as well as the surface column, so a
  `getByText` scoped under it is still exposed to chrome collisions
  and a topbar control stays reachable from a page-scoped locator.
- A locator call that AUTO-WAITS and matches nothing burns the WHOLE
  test timeout, and the failure is then reported against the NEXT
  assertion as `Received: undefined` — which reads exactly like
  that assertion being wrong about a correct page. A `.catch()` does
  not help; it fires only once the wait gives up. Read
  `Received: undefined` as an exhausted budget and audit the PRECEDING
  auto-waiting call before touching the component.
- `@ar/ui/cache`'s QueryClient sets `retry: 1`, so a REJECTED read
  settles about a second later rather than on a microtask, and until
  then the body renders the `aria-hidden` loading stand-in. An
  immediate read after `waitUntil: 'networkidle'` therefore sees
  NEITHER the skeleton nor the refusal. Use an auto-retrying assertion.
- `locator.ariaSnapshot()` is the cheapest reading of what a surface
  actually exposes — roles, accessible names and text in one block,
  which is what catches a control named by nothing and a badge that
  never rendered. `page.accessibility` no longer exists here (a
  `TypeError`, not a failed assertion).
- Build an expected filtered URL with
  `new URLSearchParams(params).toString()` rather than by hand: that
  is what react-router serialises `setSearchParams` with, so a needle
  carrying spaces is encoded as `+` on both sides and a hand-written
  `%20` reads as a routing bug. And `withBase(base, surfaceId)` takes
  a NAV ID, not a path — passing `'/sources'` THROWS from
  `getSurface`, which surfaces as an error before the first assertion
  rather than as a 404.
- Two throwaway-probe idioms cover what no gate reaches, and both are
  deleted before staging. For a COMPONENT, a `zz-tmp-*.tsx` under
  `src/` driven by `renderToStaticMarkup` and run with `bun run` from
  INSIDE the package (the isolated linker means /tmp cannot resolve
  `react`, and this also proves a new `@ar/ui` barrel import resolves
  at runtime, which `check-types` structurally cannot). It does NOT
  reach anything under `Modal` — Radix renders through a portal and
  server rendering emits nothing for one, so a wholly EMPTY markup
  string is UNRUN rather than a broken component; split the modal's
  BODY out and the whole surface below the frame becomes probeable.
  For a ROUTED PAGE the probe is a throwaway `tests/e2e/zz-tmp-*.spec.ts`
  instead, since a page needs a router and a query client. Delete
  either in the same step: `tests/e2e/` IS the `testDir`, so a
  leftover probe silently JOINS the suite and its count.

CI runs `bun run test` — the vitest suite and the default
Playwright config, never the screenshot one — from
`.github/workflows/front.yml`'s `checks` job, with
`working-directory: packages/web` on the browser install and on the
test step. That directory is load-bearing rather than tidy:
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
