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
- There are two TREES, and which one runs is a BUILD-time reading
  rather than a URL. `createRoutes({auth})` is the single factory:
  `ROUTES` is the `auth: false` call — the fixture tree above,
  unchanged, and the one every `matchRoutes` case and both Playwright
  suites drive — and `auth: true` adds `/login` beside the two bases
  and wraps each base's chrome in `AuthGate`. `createAppRouter` picks
  by `authMode` from `src/data/auth.ts`. A fixture build therefore
  declares no login route at all, and `/login` reaches the catch-all
  there like any other address nothing claims.
- `/login` sits BESIDE the bases, not below one: the login screen
  brings its own layout and has no shell around it. Declaration order
  does not decide the match — react-router ranks branches by
  specificity, so the static segment outranks the `/` base's
  catch-all wherever it is written — and nothing BELOW `/login` is
  claimed, so `/login/anything` still falls through.
- On the domain base the gate wraps OUTSIDE `DomainGuard`. An
  operator with no session is sent to the form before a malformed
  slug is ruled on: the refusal page is app content like any other,
  and which slugs a deployment answers to is not a question the gate
  has let them ask yet.
- `createAppRouter` passes `basename` from `import.meta.env.BASE_URL`,
  which Vite sets from `base` in `vite.config.ts` — `/` for the dev
  server and both fixture suites, `/app/` for the deployed build the
  service serves under that prefix. react-router strips the basename
  before matching, a trailing `/` on it included, so both bases stay
  declared below it and no path `paths.ts` builds carries the prefix.

## The dev-only crash route

One more child sits below both bases in a DEV build alone:
`__devtools/crash`, registered from `src/dev/crashRoute.tsx`
through a call to `devRoutes()` that is spread into
`routesBelowBase()` behind `import.meta.env.DEV`. It throws on
render so `src/app-shell/AppErrorBoundary.tsx` has something to
catch. Nothing else in this app fails on demand.

The import is STATIC in `src/routes/router.tsx` — every other reach
into `src/dev/` is a dynamic one behind `import.meta.env.DEV` — but
it imports one TYPE and nothing else, so the static edge reaches no
runtime code. A route cannot arrive on a later microtask: the
router builds at module scope in `src/main.tsx`, and the tree is
fixed before the first paint. The guard therefore sits at the USE
site, in `routesBelowBase()`.

Whether the route survives into a production bundle is the bundler's
decision, not the source's: `import.meta.env.DEV` becomes a literal
`false` at build time and the ternary folds; Vite replaces the read
through the optional chain so the import is dropped entire. No
module-scope element is built — the route object is constructed
INSIDE `devRoutes()` — so rolldown sees the module as
side-effect-free. The drop is measured by grepping a real `vite
build`'s `dist/` for the path literal `__devtools/crash` against a
planted `Agentic Research` control; the counts are recorded in the
plan's close-out notes.
