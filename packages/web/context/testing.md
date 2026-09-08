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
`cards.ts`, `fields.ts`, `editor.ts`, `schema.ts`, `fieldDefs.ts`,
`pages/filters.ts`, `app-shell/theme.ts`, the pair under
`src/components/` (`editorDraft.ts`, `jsonDraft.ts`) and the six pure
modules under `src/dynamic-form/` are all that shape — the provider's
whole core is `.ts` for exactly this reason, and its three `.tsx` hold
no decision the unit runner would have wanted. Anything touching
`document` at import time crashes the unit runner outright and takes
its whole file with it.

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
- This package is the only source of the fan-out's VARIABLE pass-glyph
  ticks, so growing THIS suite is what moves a figure the repo-root
  `context/verification.md` discusses as invariant under vitest growth. It
  is NOT the only source outright, and a decomposition says so: measured
  at `b510833`, the 174 split by prefix as `@ar/web test:` 170 (Playwright
  per-case lines, every one carrying `[chromium]`), `@ar/web pretest:
  @ar/ui build:` 2, and `@ar/ui pretest:` 2 — that last pair being
  `@ar/ui`'s own script, which no run of this package emits. Three
  readings of the same rule now: 27 Playwright cases contributing a
  fan-out total of 31 across q15, then 146 contributing 150, then 170
  contributing 174 once one new `tests/e2e` spec and three extended
  ones added 24 cases for the dynamic form. The constant 4 is two vite
  build ticks apiece from the `@ar/ui` and `@ar/web` pretests, and the
  wave's `tests/visual/` spec contributes NOTHING to it, being behind
  the other config. Decompose that total BY PREFIX rather than quoting
  it — the vitest reporter contributes exactly zero of them, measured
  over 5561-, 1704-, 45- and 18-case runs, so the whole figure is this
  package's Playwright count plus 4. A package-scope `bun run test` at
  the same commit reads 172, exactly the `@ar/web` top-level bucket
  plus the `@ar/ui build:` pair its own pretest emits, which is what
  reconciles the two scopes. Both captures carried 0 from the failure
  family, and it is the pass count beside it that makes that zero a
  reading rather than the shape a capture read with the wrong codec
  also produces.
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

- The dynamic form's locator vocabulary, which no gate states and which
  four specs now depend on. `NodeForm` wraps the ONE mounted form in
  `role="group"` named after the node it draws, so
  `getByRole('group', { name, exact: true })` is the scope handle that
  says WHICH node's members a locator is reaching. A container's
  drill-in row is a `button` whose exact accessible name is that same
  label (its chevron is `aria-hidden` and its description sits OUTSIDE
  the button via `aria-describedby`), while `TreeNav` draws its row as a
  `span` inside the `li[role="treeitem"]` — so a `button` name locator
  addresses the FORM's row and a `treeitem` one addresses the TREE, with
  no collision. `@ar/ui`'s `Breadcrumb` is
  `nav[aria-label="Breadcrumb"]` over `button`s carrying
  `aria-current="page"`, its first step being the walk back to the list
  level, and `Segmented` is a `role="tablist"` over `role="tab"` buttons
  whose accessible name IS the label. Derive both node labels from
  `treeNavNodes(buildFormTree(defs, payload))` and a box label from the
  def whose `key` is the payload member — that crossing keeps a spec
  addressing a MEMBER rather than a word somebody may reword.
- The tab order inside it, likewise unstated anywhere else: the
  presentation segments, then the tree as ONE stop (the
  `li[role="treeitem"]` holds the tabindex, not the `ul`), then the
  breadcrumb's steps in trail order, then the mounted form's own
  controls in def order, then `Cancel` and `Close`. A DISABLED `Save` is
  not a stop, so the cycle GROWS BY ONE the moment a case dirties the
  draft. Selecting through the tree is Home, then one ArrowDown per row
  (the root is a row of its own), then Enter. A DISABLED control is in
  the accessibility tree but NOT in the tab order, so a roster read
  through `getByRole` and one read off a Tab walk are different lengths
  BY CONSTRUCTION (measured 8 move controls against 6 tab stops, the
  first row's `up` and the last row's `down` being disabled at the
  ends): read an ORDER off the role locator and REACHABILITY off the
  walk.
- A value read at the KEYSTROKE is evidence about the BOX and never
  about the draft — a control reporting nothing at all still leaves
  every character on screen and passes `toHaveValue`, because the boxes
  here hold typed text beside the value they reported. The separating
  reading is the REMOUNT, and it needs no new mechanism: `DynamicForm`
  keys the one mounted form by the node's path key, so walking out to
  the list level through the breadcrumb and drilling back in unmounts
  every control and redraws it from the VALUE. Take every acceptance
  read AFTER that walk, and assert the UNEDITED members in the SAME
  post-walk loop as the edited one. A presentation SWAP is the coarser
  remount beside it and the only one crossing COMPONENT boundaries,
  which is what makes a three-way swap the reading that says N drawings
  are over ONE draft rather than each holding its own copy.
- A refusal in that provider has TWO channels and a spec that does not
  separate them lets one stand for the other. The `string` boxes accept
  every text they can hold, an empty one included, so a cleared required
  member and an out-of-union enum spelling are both READER acceptances
  that only the whole-payload `safeParse` refuses. The reading that
  separates them is the box's own `aria-invalid`, which React renders as
  the literal `"false"` while the banner is up — assert it, or a case
  cannot tell a member only the payload can refuse from one the control
  refuses on its own, and a leg marking every box invalid passes every
  other assertion.
- A `number` field drawn for DIRECT text entry has a three-part evidence
  set, each part answering a different way of getting it wrong: the
  box's `type` reading `text` (never `number`), its `inputmode` reading
  `decimal`, and `getByRole('spinbutton')` at zero across the dialog.
  The keystroke claim is separate again and one `toHaveValue` at the end
  of typing does not make it, that assertion agreeing with a control
  that rewrote the text on the way through — press one character at a
  time and assert the RUNNING prefix after each.
- Every label in that list is POSITIONAL — the tree's items, the form's
  drill-in rows and both move controls — so a reorder moves NONE of them
  and an order reading has to be TWO readings. The ROSTER, off the move
  controls' `aria-label`s in DOM order, is invariant under a move by
  construction and is what reports a row lost, duplicated or
  misnumbered; the CONTENT, off each entry's own boxes after drilling
  in, is what MOVED. Driving `@ar/ui`'s `Sortable` from Playwright takes
  `page.mouse` and never `locator.dragTo()`: its container `onDragOver`
  claims a slot when `overIndex` is null and runs LAST on the first
  event of a drag, so ONE move over the target drops the row at the END
  of the list. Press inside the row's GRIP (about 18px in), one small
  move to start, then TWO moves over the target's half above its
  midpoint, then release.
- `tests/` carries NO shared helper module and that is the CONVENTION
  rather than an oversight: every spec imports from `src/`, from
  `@playwright/test` and from nothing else in the tree, and `SKELETON`
  alone is redeclared in six of them. A task tempted to hoist
  `expectSettled` or a `first` helper into a sibling module is changing
  a convention rather than removing duplication, and it drags every
  existing spec's imports with it.
- Two FAST gates a scoped task owes, neither of them a full
  `bun run test`. `bun x vitest run` from inside the package is the unit
  half ALONE — it runs no `pretest`, never starts the dev server and so
  never binds 5174, which is the port a parallel checkout's run steals.
  `bun x playwright test tests/e2e/<file>.spec.ts` is its e2e sibling,
  —5s for a three-case file where the whole chain is minutes, and the
  whole `tests/e2e` suite is —40s at 149 cases with 5 workers. Both DO
  bind 5174 in the second case, so the parallel-leg port check still
  applies, and neither runs `pretest` — so the sha256-against-pristine
  check on `@ar/ui`'s built `dist/index.js` is mandatory before either,
  and redundant only before `bun run test`.

CI runs `bun run test` — the vitest suite and the default
Playwright config, never the screenshot one — from
`.github/workflows/front.yml`'s `checks` job, with
`working-directory: packages/web` on the browser install and on the
test step. That directory is load-bearing rather than tidy:
bun's isolated linker leaves the repo root with no playwright binary
to resolve, so `bun x playwright` there silently fetches a version the
lockfile never chose.
