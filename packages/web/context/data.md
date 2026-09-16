## The data layer and its build-time swap

`src/data/` is the app's data access layer, shaped for a
build-time swap: `src/data/api.ts` selects between fixture and HTTP
via `resolveDataSource(VITE_AR_API_URL)` — Vite replaces the read at
build time and Playwright's node loader reads `undefined` without
throwing. Nothing under `src/` moves when the swap happens.

### The seam is `api.ts` — Vite-replaced accessor selector

Three properties make a swap a swap and not a rewrite, each one
buying something today at a cost:

- **Async, over fixtures already in memory.** Every accessor returns
  a promise, so every call site is written against one from the first
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

### The data source selector: `src/data/source.ts`

`resolveDataSource(apiUrl)` answers `{kind:'fixture'}` when `apiUrl`
is `undefined` and `{kind:'api', baseUrl}` when it is any string. The
empty string means same-origin; a trailing slash is trimmed. The
`VITE_AR_API_URL` and `VITE_AR_BASE_PATH` env vars are declared in
`src/vite-env.d.ts` and set at build time.

**The fixture hazard:** The fixture data suite expects a fixture
selector. Set `VITE_AR_API_URL` when building, or the tests import
HTTP stubs that reject with `NOT_WIRED` instead of fixture data.
Unset it when building for fixture-backed development.

### The layout: `fixture/`, `http/`, and old-path re-exports

- `src/data/fixture/` holds the fixture modules and their colocated
  tests, exactly as before. Twenty modules total.
- `src/data/http/` holds the HTTP implementations: `api.ts` (34
  accessors by stub), `client.ts` (session + fetch), `envelope.ts`
  (response shape), `operator.ts` (derive from sub claim), `auth.ts`
  (login, logout and the open-service probe, over the tab's one
  session store).
- `src/data/` holds `api.ts` (the Vite-replaced selector), `auth.ts`
  (the session selector: `authMode`, plus `logout` and `probeAuth`,
  both `undefined` in fixture mode so the HTTP auth module and its
  `zod` leave that bundle), `source.ts` (the resolver), `hooks.ts`
  (one cache hook per accessor, plus `useLogout` over `auth.ts`),
  `types.ts` (shared vocabulary and `FIXTURE_NOW`), and one-line
  re-exports at the old paths: `export * from './fixture/<module>'`
  for every fixture module still imported outside
  `src/data/fixture/`.

  `auth.ts` is a SEPARATE selector from `api.ts` on purpose. Merging
  the two would keep `src/data/http/auth.ts` alive in a fixture
  build through the accessors' own import, and the point of the two
  `undefined`s is that rolldown folds the build-time comparison and
  drops the module entirely.

Specs and pages stay byte-identical because they import from the
old paths.

### The `NOT_WIRED` stub convention

Every HTTP accessor (33 of the 34 besides `fetchOperator`) rejects
asynchronously with `ApiError` code `NOT_WIRED` and the accessor name.
That signals: this accessor has no endpoint yet and the build is
linked to a live service that does not have one.

### Counts: 25 reads, 9 writes, 14 `mutate` call sites

- **25 reads:** `fetchDomains`, `fetchConnectors`, `fetchConnector`,
  `fetchSettings`, `fetchSpendSummary`, `fetchSearchSuggestions`,
  `fetchNotifications`, `fetchOperator` (8 unscoped), `fetchProposals`,
  `fetchProposal`, `fetchSourceFailures`, `fetchFindingDetail`,
  `fetchRawFinding`, `fetchDocuments`, `fetchDocument`,
  `fetchAnalysis`, `fetchConnectorFields`, `fetchSearchResults`,
  `fetchSources`, `fetchSourceDetail`, `fetchSourceHistory`,
  `fetchLexicon`, `fetchTerm`, `fetchPersonas`.
- **9 writes:** `saveDomain`, `saveProposal`, `deleteProposal`,
  `saveConnector`, `deleteConnector`, `saveSettings`, `saveTerm`,
  `deletePersona`, `updateSourceStatus`.
- **8 unscoped:** `fetchDomains`, `fetchConnectors`, `fetchConnector`,
  `fetchSettings`, `fetchSpendSummary`, `fetchSearchSuggestions`,
  `fetchNotifications`, `fetchOperator`.
- **7 resources:** domains, connectors, settings, spend, search,
  notifications, operators.
- **14 `mutate` call sites:** Every save and delete operation is
  recorded in the session draft store through a hook mutation. The
  editors and their modals use these mutations to save drafts.

### Reads go through `hooks.ts`, and only through it

`hooks.ts` wraps each accessor in `useCache` from `@ar/ui/cache`.
Pages call the hooks; no page and no chrome component imports
`api.ts` or a fixture accessor directly. One that did would render
identically today and lose its loading and error states on the day
the read stops resolving on a microtask.

What a page MAY take from `src/data/` is everything that is not a
read: types, closed-value constants (`NOTIFICATION_CHANNELS`,
`FIXTURE_NOW`) and pure classifiers (`classifySource`,
`classifyConnector`, `resolveDomainSlug`).

Query keys are `[slug, resource]` for a domain read — the slug FIRST,
which is what makes a switch a different cache entry rather than the
same entry answering with the previous domain's rows — and
`DEPLOYMENT_SCOPE` for the eight that take none. That constant carries
an `@`, which no slug does, so the two key spaces cannot collide
however either grows. The raw route param is resolved to a slug in
exactly one place, inside the hooks, so `/` and
`/d/example-tech-radar` never keep two entries holding the same rows.

### One new domain-scoped accessor costs SIX edits

Budget a new accessor on this layer as a task of its OWN rather than
as a line inside a page task, because every suite here names one of
the six: the fixture accessor and its tests; `api.ts` plus its
`DOMAIN_SCOPED` case table and its length pins; and `hooks.ts` (the
`DomainResource` union AND the hook itself) plus `hooks.test.ts`'s
exhaustiveness record, its hook table and its read count.

Sweep the count PROSE in the same commit. `api.ts` and `hooks.ts`
both carry sentences quoting how many accessors take no slug, and no
gate reads either — a derived figure in a module header goes stale
exactly the way a doc count does.

### Fixtures mirror the service by REDECLARATION

`@ar/web` has no dependency on `@ar/service` and must not take one —
the two are joined by HTTP. Nothing therefore holds the copies in
step mechanically, so the conventions below ARE the drift-detection:

- `types.ts` redeclares the schema vocabulary, and each type's TSDoc
  names the `packages/service/src/db/schema` table it mirrors. Three
  rules keep the redeclaration honest: a nullable column is `T |
  null` and NEVER an optional member (an optional one collapses
  "unscored" into "the author forgot"); a `timestamp with time zone`
  is an ISO string rather than a `Date`, because a string is what the
  API will hand back and what `@ar/ui`'s inputs accept; ids are
  numbers while slugs are the natural keys URLs and accessors use.
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

`FIXTURE_NOW` (`src/data/types.ts`) is the one reference clock
every relative-time render is passed, and each page pins a
`DISPLAY_LOCALE` beside it. Without both, `@ar/ui` falls back to the
wall clock and to `navigator.language`, and a rendered score or
timestamp becomes a property of the machine running the suite rather
than of the data.
