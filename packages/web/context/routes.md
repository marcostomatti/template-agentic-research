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
