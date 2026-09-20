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

## The error boundary, the fallback, and app signals

`src/app-shell/AppErrorBoundary.tsx`,
`src/app-shell/RouteErrorBoundary.tsx`, and
`src/app-shell/CrashFallback.tsx` are reached from
`src/main.tsx` in a PRODUCTION build. They survive there
because a production run needs to catch a render error and
show something instead of a blank document.

### The two boundaries

React unmounts the whole root when a render throws with no boundary
above it, and a class component is the ONLY kind that can stop that.
Two boundaries catch two separate classes of error:

- `RouteErrorBoundary` is declared as `ErrorBoundary` on every
  top-level route in `src/routes/router.tsx`. A data router catches a
  render error from any route element itself and draws the nearest
  route `ErrorBoundary`, so this component catches everything the
  router renders — every surface, modal sub-route and the shell.
- `AppErrorBoundary` wraps `RouterProvider` in `src/main.tsx` and
  catches what the route boundary does not: a throw from a provider
  above the router or from the router component itself.

Both publish the same `error` signal through `errorPayload` and both
draw `CrashFallback`. An operator reading a crash screen cannot tell
which one caught, and neither can.

### The fallback

`CrashFallback` shows the one sentence saying what happened, the
thrown message in `@ar/ui`'s `Banner` component with its tone set to
danger, and three controls that are always drawn: a "try again" button
that calls the boundary's `reset`, a "reload the page" button that
throws the tab away, and the browser's back button — and a fourth
button "report this" only while a reporter is attached. The fallback
is ONE component rather than two (dev and production) because the
four-button case should stay on the tested path whether the reporter
is there or not, and `import.meta.env.DEV` is not the right condition
anyway — both test servers are dev servers but the widget mounts on
only one.

The fallback SUBSCRIBES to the `devtools` topic rather than reading
`last` once, because the bridge installs on a later microtask than
the first render. A read taken during the first render would be
permanently wrong.

### App signals

`src/app-shell/appSignals.ts` imports NOTHING outside the language.
No `react`, no `@ar/ui`, no storage, no network, and no
`@ar/dev-tools` — that package is a devDependency and the Docker
`web` stage holds its manifest and no `dist/`. A module that imports
it would fail the image build. The channel exists because the two
boundaries and the fallback have to survive in production, and
choosing where a pub/sub lives is the difference between "must be
production-safe" and "can reach dev-only code".

The five topics are CLOSED at five by spec, and three of them make it
into a production build:

- `error` — a render failure, caught by either boundary and published
  through `errorPayload`.
- `route` — a navigation, published from one effect in
  `AppLayout.tsx`.
- `artefact` — which entity the current surface is about, published by
  `useArtefactSignal` through the entity kind and id from a modal
  sub-route, and `null` once the surface closes.

The other two are the handshake between the app and a reporter, and
never reach production:

- `devtools` — `{installed}`, published BY the bridge (which is
  dev-only) on install and from its disposer, read by `CrashFallback`
  to decide whether a "report this" button exists.
- `open-feedback` — published BY that button, consumed by the bridge
  alone. The app side names no feature id and no item id: those are
  the package's constants and the bridge's to spell.

The channel is the reason `@ar/web` remains production-safe without
`@ar/dev-tools` anywhere in its source: the bridge in `src/dev/`
is reached only through a dynamic import behind `import.meta.env.DEV`
in `src/main.tsx`, and a production build never loads it.
