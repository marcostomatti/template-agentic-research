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

### One new domain-scoped accessor costs SIX edits

Budget a new accessor on this layer as a task of its OWN rather than as a
line inside a page task, because every suite here names one of the six:
the fixture accessor and its tests; `api.ts` plus its `DOMAIN_SCOPED` case
table and its length pins; and `hooks.ts` (the `DomainResource` union AND
the hook itself) plus `hooks.test.ts`'s exhaustiveness record, its hook
table and its read count.

Sweep the count PROSE in the same commit. `api.ts` and `hooks.ts` both
carry sentences quoting how many accessors take no slug, and no gate reads
either — a derived figure in a module header goes stale exactly the way a
doc count does.

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
