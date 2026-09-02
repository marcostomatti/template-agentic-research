# AGENTS — template-service-express

Standalone Express + MCP service template. Single package, bun-first, no
workspace. Read this before changing anything; the per-area conventions live
in `.claude/skills/` and are pointed to below.

## Layout

| Path | What it is |
| --- | --- |
| `lib/` | The framework: `express` (createService: DI, middleware, health, `/_control`, auth middleware, shutdown), `service-core` (dependencies, typed clients, circuit breaker, retry, http client), `mcp` (createMCP: stdio/HTTP transports + health), `logger` (pino), `errors` (AppError family + the error handler createService registers). Treat as library code — stable, well-tested, changed deliberately. |
| `src/` | The service: `config.ts` (zod env, fail-fast), `routes/`, `db/` (Drizzle+Postgres, default on), `redis/` (opt-in via `REDIS_URL`), `cron/` (interval jobs as a managed dependency), `notifications/` (preference-aware dispatch + channel stubs), `auth/` (the basic credential strategy: argon2id bootstrap, the `/auth` routes, the local session verifier — see "Authentication" below), `mcp/` (MCP entry + tools). |
| `src/lib/` | Pipeline libs, written dual-context so `scripts/build-workflows.ts` can splice one into an n8n Code node body — a node then runs the same function the suite imports rather than a second copy written for the canvas. Three rules are what that costs: no value imports, declaration-form exports only, and no reliance on module scope; the build refuses the first two by name. `schedule.ts` (the interval clamp and batch cap `ar-dispatch` applies) is the first and landed in phase 3; the ported wave landed in phase 4 — structured-text, delimited-record and message parsing, untrusted-text neutralization, entity-name validation, near-duplicate hashing, audit lines, chunk preparation, and the gating, scoring and feature mechanisms; the wave the phase-5 workflows splice landed with them — the deterministic engine `sources.parser_config` and `sources.contract` are data for, the selector matcher it takes as an injected markup step because it may not import one, fail-flag-keep as arithmetic over a source row's counters and stamps, the versioned envelope a push client posts against, the fence a model reads untrusted text through, and the pin naming which mechanism and which term set a stored feature vector was computed under. Distinct from the framework `lib/`. |
| `src/sources/` | Source adapters: the `SourceAdapter` contract (`fetch` → `parse` → `toCanonical`, with I/O confined to the first step), the static registry that selects one of them by id — written out rather than read off the directory, so nothing runs unless it was named, and naming one costs that line plus the shipped-id expectation in `src/sources/index.test.ts` — and the adapters that satisfy that contract, landed in phase 5: `listing-api.ts` over the `api` kind, running the cursor-paged loop across the endpoints a row's `parser_config` names, and `push-capture.ts` over the `push` kind, whose payload is the envelope a client posted rather than anything this service went and read. Each leaves extraction to the parse engine under `src/lib/` — `parser-config.ts` for the field map and the contract check, with `markup-select.ts` handed in as the markup step it may not import — because a Code node can inline a library from there and no path from here, so a workflow and an adapter run one implementation. Also the modules the adapters share, which declare no member of that contract and appear in no registry: `html-text.ts`, a pure markup-to-text reduction, and `paged-list.ts`, the cursor-paged loop an adapter runs inside its own `fetch` when one `sources` row names several listing endpoints. That last one is where the requests are made, through an injected transport it refuses to run without — which is how the isolated-suite law stays readable in a signature, and why the only network reach in this directory is the one `listing-api.ts`'s `fetch` hands that transport to. Beside them `config-proposer.ts`, which no adapter reaches and which fronts no source either: the `ConfigProposer` seam a source's `parser_config` and `contract` are proposed through, the builder turning an answer into a pending `source_config_proposals` row, and the applier that refuses a row carrying no `approved_at` — declared here and implemented nowhere, so the isolated suite drives an injected stub and reaching a model server costs a proposer somebody had to construct and pass in. And in the same directory but importing none of it, the HTTP half of the `sources` table: `store.ts`, `db-store.ts`, `service.ts`, `routes.ts` and `failures-service.ts`/`failures-routes.ts`, no barrel of its own (`index.ts` here is the adapter registry). Five endpoints — the collection under its domain's slug, the row by id, and the read-only failures queue at `/sources/:id/failures`, which serves stored `body` and `parse_error` through `src/http/control-bytes.ts`. A delete is refused outright while documents or sightings reference the row, with no `?cascade=confirm` to waive it: `enabled = false` is how a feed is retired. Neither half imports the other and neither is a misfile: this name was always the table's, so what the two share is the folder and not a word of code — the reverse of what `src/exports/` records, where the name itself was the thing already spoken for. |
| `src/exports/` | Export renderers, one per format a subscription can be rendered into (phase 6). A renderer returns artifacts and never dispatches them — the email format renders a draft and stops there. No router, no port and no store: a reader hunting the `/exports` routes wants `src/subscriptions/`, which took its table's name because this directory already held its prefix. |
| `src/http/` | The route boundary every resource group here shares, and the reason one 422 body does not depend on which router answered. `envelope.ts` holds the `{ success: true, data, meta? }` success envelope plus the pagination meta derived from the window and the store's own count; `schemas.ts` holds the slug and resource-id param schemas, the `?page`/`?perPage` query schema and the one translation of that window into the `limit`/`offset` a store port takes; `validation.ts` is the parse-or-throw boundary, whose `parseBody`/`parseQuery` return typed data or throw a `ValidationError` whose details name a field path and a message from a fixed vocabulary of this repo's own, never zod's wording and never a submitted value. `control-bytes.ts` landed with wave 2 and is read by `src/sources/failures-service.ts` alone: it replaces every C0 control, DEL, every C1 control and every lone surrogate with its escape text form, and cuts by code point so a cap cannot split an astral pair, which is how that queue serves a stored payload. Nothing here reaches a store or decides a rule. The failure half is deliberately the framework's `{ code, message, details? }` — see `docs/architecture/08-http-api.md`. |
| `src/domains/` | The domains resource group, and the layering every other resource group in this table repeats: `store.ts` is the port every rule is written against, `db-store.ts` its one drizzle implementation, `service.ts` the rules as plain functions over that port, and `routes.ts` the router — which the taxonomy splits in two, one service and one router per half. `settings-payload.ts` validates the per-domain `DomainSettings` payload, which a `PATCH` replaces whole and never merges, and `index.ts` is this group's public surface and the only resource-group barrel here, so `src/index.ts` reaches every other group by deep import — the `index.ts` in `src/sources/` is the adapter registry, not a second one. Five endpoints — the collection, and the row by slug; a delete refuses while the domain holds topics, sources or findings, and `?cascade=confirm` is the only spelling that gets past it. |
| `src/taxonomy/` | Categories and terms. One resource, so one port (`store.ts`) and one drizzle implementation (`db-store.ts`) cover both halves, while the rules split into `categories-service.ts` and `terms-service.ts` where they genuinely differ, each with its own router. `seed-format.ts` is the single declaration of the term seed row and file schemas plus the canonical serialiser — `scripts/seed-schemas.ts` re-exports it rather than keeping a second copy, which is what lets the `?format=seed` round trip be byte-for-byte. The one-level depth cap is the database trigger's; this surface only translates it. No barrel. |
| `src/personas/` | The system text a run plays, one row per `(domain, role)`: `store.ts`, `db-store.ts`, `service.ts`, `routes.ts`, no barrel. Four endpoints — the collection under its domain's slug, the row by id. `role` is patchable, which no other natural key on this surface is, so a create and a patch can each propose one and each be answered 409. Nothing caches a persona: a run reads them at its own start, so an edit lands on the following run and there is no invalidation path to get wrong. |
| `src/settings/` | Operator-level preferences — the one `operator_settings` row, whose id the database pins: `store.ts`, `db-store.ts`, `payload.ts` (the strict `OperatorSettings` validator), `service.ts`, `routes.ts`, no barrel. Two routes and no address at all, so this group reaches neither param schema, parses no query, and answers no 404 and no 409. A read before any write is `{}` rather than 404, and a `PUT` replaces the payload whole because omitting a member is how one is cleared. Per-domain settings live on the domain row and are unreachable here. |
| `src/topics/` | The topics a domain researches and the cadence it researches them at: `store.ts`, `db-store.ts`, `service.ts`, `routes.ts`, no barrel. Six endpoints — the collection under its domain's slug, the row by id, and `POST /topics/:id/run-now` plus `POST /topics/:id/pause`. Those last two reach `next_run_at` through one port method and touch no other column, and every ordinary body on this group is refused for naming that column, so the two verbs are the only door onto it here. Their present is injected rather than captured, which is why `src/index.ts` hands this router a clock beside the store. |
| `src/connectors/` | The external services the pipeline calls, one row each: `store.ts`, `db-store.ts`, `service.ts`, `routes.ts`, no barrel — and `secrets.ts`, a fifth module the other groups have no equivalent of, holding the closed roster of credential-bearing config keys and the one mask literal that both the read paths and the write refusal read. Four endpoints, addressed by id and never by a domain slug: the table carries no `domain_id`, so the collection is `/connectors` at the root and takes an optional `?kind` alongside the page window. A `config` is replaced whole, so omitting a secret key clears that secret. |
| `src/subscriptions/` | Standing export subscriptions, one per domain, format and connector triple: `store.ts`, `db-store.ts`, `service.ts`, `routes.ts`, no barrel. Five endpoints, answering under `/domains/:slug/exports` and `/exports/:id` rather than under this directory's own name; the fifth is `POST /exports/:id/run-now`, the second schedule verb on the surface and the reason this router is the other one handed a clock. Open `src/exports/` for the renderers — a different thing, and the reason the group could not take that name. |
| `workflows/` | n8n workflow sources in `workflows/src/`, one JSON file per workflow. `ar-dispatch.json` landed in phase 3: it claims due schedulable rows and invokes the workflows they belong to, and it holds the only schedule trigger across the workflow set. Phase 5 landed the pipeline path itself, each of its workflows reached a different way. `ar-ingest.json` is what a `topic` claim dispatches to, reading a domain's enabled and unflagged sources through the adapters and turning documents into findings across the only model call in the set. `ar-capture.json` is reached from outside instead, its webhook taking what a client captured elsewhere. `ar-score.json` is invoked by both of those and scores findings against the domain's criteria deterministically, with no model call at all. `ar-research` and `ar-digest` stay reserved for phase 6. `workflows/src/README.md` carries that roster, the one-file-per-workflow rule and the marker forms a source may write. `bun run build:workflows` resolves those markers into the gitignored `workflows/dist/` (and `workflows/dist-external/` for a deploy), which is generated and never hand-edited. |
| `data/` | Seed files only, applied to the database by `scripts/seed.ts` — nothing under it is read at runtime. The five JSON files here seed one worked example domain and stay domain-neutral; real subject matter reaches the database through an operator's own seeds. See `data/README.md`. |
| `scripts/` | Operator entry points run by hand. Six have landed: `seed.ts` (`bun run db:seed`), `approve.ts` (`bun run approve`), `build-workflows.ts` (`bun run build:workflows`), `deploy-external.ts` (`bun run deploy:external`), `audit-workflows.ts` (`bun run audit:workflows`), and `activate-workflows.sh`, run by path rather than through a `package.json` script. Not every `.ts` here is a command: `workflow-markers.ts`, `n8n-workflow.ts` and `n8n-client.ts` are halves read by more than one of them and carry no CLI guard. The stack-lifecycle scripts and the doc-link check arrive in phase 7. `scripts/README.md` names every script and the phase each arrives in. |
| `tools/ralph/` (umbrella root) | The agent task loop: `plan` (spec → PLAN/PREREQUISITES), `start` (tracker loop, `--plan`, `--start-at`), `usage`. |
| `tests/` | Cross-cutting tests; `tests/live/` is the live suite (see Testing). Package-level tests are colocated (`lib/**/__tests__`, `src/**/*.test.ts`). |
| `.specs/`, `.plans/` | UNTRACKED (gitignored) working areas — see "Plans and specs" below. |
| `docs/` | Tracked guides (drizzle, rpc, sse, seeding). Generated output goes to gitignored `.docs/` (`bun run docs:generate`). |
| `docs/architecture/` | The architecture doc set: the platform shape, the layout map, and the invariant register — indexed from `ARCHITECTURE.md` and numbered by reading order. See "Research pipeline" below. |

## Research pipeline

This package is where the research pipeline lands, and its design is
written down rather than inferred:

- `ARCHITECTURE.md` — the index of the architecture doc set; read it
  first.
- `docs/architecture/00-overview.md` — the platform shape (Postgres as
  the only source of truth, n8n as the pipeline executor, this service
  as the API over the same schema), the layout map, the core
  vocabulary, which document covers each behaviour area, and the test
  harness.
- `docs/architecture/01-invariants.md` — the register of platform-wide
  invariants: what each one is, the artifact that fails when it stops
  holding, the phase that lands that artifact, and its status today.
- `docs/SEEDING.md` — the seed-authoring guide: the shape of a file
  under `data/`, the `"_readme"` header every one opens with, the
  underscore-stripping convention, the natural key each concern is
  upserted on, and the steps to add a domain. It sits outside
  `docs/architecture/`, so `ARCHITECTURE.md` does not index it.
- `.specs/2026-08-19-research-pipeline-port.md` — the approved parent
  design the port runs from, in seven phases. Untracked on purpose
  (see "Plans and specs" below), so it sits on the machine doing the
  work rather than in a clone.

Two rules bind every phase of that port:

- **Same-commit doc-update law**: a commit that changes behaviour in a
  row of the mapping table in `docs/architecture/00-overview.md` updates
  that row's document in the same commit, and behaviour no row covers
  adds a row.
- **Naming invariant**: no naming from the project this pipeline was
  ported from, no vault path, and no real hostname appears in the
  package's scanned source — `tests/invariants/naming.test.ts` fails
  naming the file and line of every hit.

## Conventions

- **Env**: all configuration through `src/config.ts` — zod-validated at
  import, `import process from 'node:process'` (bare `process` fails lint).
- **Dependencies**: anything with a lifecycle (db, redis, cron, future
  queues) is a `createDependency` passed to `createService({ dependencies })`
  — started in order, stopped in reverse, visible to `/_control`.
- **Schema**: tables live one concern per file under `src/db/schema/`, and
  `src/db/schema.ts` is a pure barrel of
  `export * from './schema/<x>.js';` lines. A new module there is only
  half-added until its barrel line lands: without it drizzle-kit never
  sees the table (so no migration is generated) and `drizzle({ schema })`
  cannot resolve a relation it was never handed — both fail silently, not
  loudly. Add the line when the FILE is created, even if its first commit
  defines only a helper. `values.ts`
  is the deliberate exception: it declares the closed value sets and no
  table, so siblings import it directly and it stays out of the barrel.
  Three consumers pin the barrel's path (`drizzle.config.ts`,
  `src/db/index.ts`, `tests/live/live-postgres.ts`) — never move it.
  Past the barrel line, a new `pgTable` is still half-added until it
  reaches TWO more places, each owned by a different gate and neither the
  schema file's own: the alphabetical `TABLES` list in
  `tests/live/live-postgres.ts` (the live TRUNCATE roster) and the
  table/column/constraint counts in `docs/architecture/02-schema.md`. The
  `TABLES` omission is the quiet one — a missing name silently NARROWS
  what a live run resets between cases (green, with leaked rows), while an
  extra name makes every live file throw. Derive the roster instead of
  eyeballing it: `grep -rhoE "pgTable\('[a-z_]+'" src/db/schema/ | sort`
  held set-equal against the literals parsed out of the `TABLES` block,
  plus a sortedness check and one in-neither control name. A count agrees
  at the wrong membership; only the set diff names WHICH entry is missing.
  Which foreign keys REFUSE a delete is re-derived the same way and never
  taken from a plan on trust — a sibling leg's merged migration adds
  refusing keys the plan could not name (measured: a plan named TWO on
  `sources` and the tree carried THREE). `grep 'REFERENCES "public"."<t>"'
  drizzle/*.sql` is the only needle that answers it: a bare `git grep <t>`
  OVERCOUNTS, because a sibling table can record a foreign row's NAME as
  plain text and refuse nothing. Run it in BOTH directions before writing a
  delete guard — `connectors` measured exactly ONE refusing key against
  `sources`' three, so a port copying the sources shape would promise less
  than the schema does. And it is a ZERO-HIT scan whenever the answer is
  none, so pair it with a sibling table of known non-zero answer in the
  SAME invocation, or a mistyped table name reads as a table nothing points
  at.
- **Errors**: throw `AppError` subclasses (`lib/errors`) or let Zod errors
  bubble — the registered handler maps them to typed JSON responses.
  Express 5 awaits an async handler's returned promise, so a rejection
  reaches that handler on its own: a bare `throw` in an `async` route
  needs no try/catch and no `next(err)` (proved in
  `lib/express/create-service.test.ts`). Catch explicitly only where the
  route answers with a body the shared handler would not produce — the
  wrappers in `lib/express/control/routes.ts` are that case; the one
  still in `src/index.ts` `/users` is a pre-Express-5 leftover,
  equivalent to letting the rejection through.
- **Routes**: validate input at the boundary with zod (see the `api` skill).
- **Logger**: `import type { Logger } from '../../lib/logger/node.js'`.
  `ServiceLogger` from `lib/service-core` is `@deprecated` (a bare alias for
  the same type) and NOTHING in the verification order reports it — `lint`,
  `check-types` and the suite are all green, and the only signal is the
  editor's TS6385. `lib/express/*` still uses the deprecated spelling, so
  copying an import line out of the framework half is how the alias spreads;
  `src/cron/index.ts` and `src/notifications/dispatch.ts` are the precedents
  to copy instead. Grep a symbol for `@deprecated` at its DECLARATION before
  copying any import from `lib/`.
- **Claims-shaped values are a `type` alias, never an `interface`.** A TS
  `interface` has NO implicit index signature and a `type` alias does, which
  makes the two NON-interchangeable at any boundary onto a type that
  declares one — `lib/express/auth.ts`'s `SessionClaims`
  (`{ sub: string; [key: string]: unknown }`) being the one here. Measured,
  both spellings in one probe: `interface X { readonly sub: string }` is
  TS2322 *not assignable to type 'SessionClaims'* and the identical
  `type X = { readonly sub: string }` assigns clean (`readonly` is not what
  breaks it). Say why in the docblock: the next reader's instinct is to tidy
  it into an interface, `lint` stays green through that, and `check-types`
  reports it at the CONSUMER, a file the edit never touched.
- **Rate limits**: spell the count `limit`, not `max` — `max` has been the
  deprecated alias since express-rate-limit v7 and
  `lib/express/middleware.ts`'s literal predates the rename, so copying its
  wording spreads it. Two limiters on ONE route BOTH run, and each
  `RateLimit-*` header goes to whichever middleware set it LAST, so a
  route-level limiter that omits `standardHeaders`/`legacyHeaders` takes the
  library defaults and the response ships draft-6 headers naming the
  APP-WIDE limit beside legacy ones naming the route's — two contradictory
  answers to one question, green everywhere. Restate `applyMiddleware`'s two
  header settings on every route-level limiter. To key by address at all,
  `app.set('trust proxy', <number>)` plus `X-Forwarded-For`: v8 throws
  `ERR_ERL_PERMISSIVE_TRUST_PROXY` on the `true` form.
- **Docs**: TSDoc on exported surfaces; see the `documentation` skill.
- **Tracked markdown**: no author/date header — files open straight with
  `# Title`. Under `docs/architecture/`, `##` headings are noun labels
  (`Layout`, `Core vocabulary`) while `###` sub-headings are assertive
  full-sentence claims (`Vitest is the single test runner`), each followed
  by the why. Prose wraps at ≤74 cols, table rows run long, and paths are
  inline code rather than links, so a future link check has no forward
  reference to resolve. `ARCHITECTURE.md` is the one tracked markdown file
  here that carries links: it indexes the doc set, so a commit landing a new
  architecture doc adds its row in the same commit.
  That `<=74` is a CEILING and not the house width: each file under
  `docs/architecture/` has its own measured population and they disagree in
  opposite directions, so re-measure the file you are editing rather than
  reflowing to a sibling's shape. Measured, `08-http-api.md` runs prose to
  70 and `###` headings to 73 while `01-invariants.md` runs prose to 72 and
  headings to 70. Measure in CHARACTERS: `awk`'s `length($0)` counts BYTES,
  so every em dash on a line costs three, and a line that measures 74 in
  awk may be 72 characters and perfectly legal — wrap against the
  character count and keep awk only as the confirmation that the byte
  ceiling did not move. No doc in the set uses a fenced code block at all,
  so a JSON or shell example belongs in prose plus inline code, and the
  only non-ASCII characters in the tree are U+2014 and U+00A7.
- **Wrap width is per FILE FAMILY and per COMMENT SHAPE, and nothing
  reports either.** No `max-len` rule is configured anywhere, so code width
  is convention only and the two halves of one file routinely differ by 40+
  columns. Measured: `src/lib/schedule.ts` comments <=75; `tests/lib/
  schedule.test.ts` comments <=78 with code to 112; `src/db/schema/*`
  TSDoc <=71, code to 122; `src/*/store.ts` TSDoc <=70-71, code 67-77;
  `src/*/service.ts` and `src/*/service.test.ts` comments <=68, code <=79;
  `src/*/routes.ts` comments <=68, code <=78. A `routes.test.ts` holds
  FIVE different buckets at once — TSDoc continuations, a single-line
  `/** ... */`, a `//` comment, the `// ---` section rules (exactly 78) and
  code — and they disagree by file. Measure the file you are editing,
  before AND after writing, and bucket by SHAPE: a probe lumping every
  `//` line together scores the 77-character section rules as the comment
  ceiling and invites filling prose to it, and a single-line `/** ... */`
  lands in the CODE bucket unless it is split out.
- **Prefer deleting a derived figure to maintaining it.** A count spelled
  into prose is falsified by the next thing that lands and no gate reads
  any of them — measured, one sentence shape (`sibling drizzle stores`)
  appeared in three `db-store.ts` files quoting four, five and six, all
  wrong at HEAD and TWO already wrong when written. The durable repair is
  the COUNT-FREE sentence, because the claim these paragraphs carry
  (`the same three lines, deliberately not imported`; `no two of the eight
  ports declare a method under the same name`) never needed the number.
  Where a figure must stay, DERIVE it rather than incrementing —
  incrementing propagates an error the derivation would have caught.
- **Two layout maps, neither derived from the other**: the coarse `## Layout`
  table above (package-level orientation) and the finer one in
  `docs/architecture/00-overview.md` (per-area detail and rationale). A
  change that adds a directory updates BOTH, keeps them non-contradictory
  rather than identical, and inserts the row adjacent to its parent so the
  table still reads as a tree.
  Non-contradictory-rather-than-identical is operationalisable rather than
  aspirational, and the cheap discipline is a REGISTER split rather than a
  content one: this file's rows carry the file inventory plus the surface
  facts a reader working in the directory needs (which file do I open, how
  many endpoints, is there a barrel), and `00-overview.md`'s carry the
  design rationale with NO file names (why one port covers both taxonomy
  halves, why nothing caches a persona). Equal granularity in both is fine
  and keeps either table usable alone; what the rule forbids is the same
  SENTENCE, which is exactly what a copy-paste insert produces and what
  then drifts into two competing descriptions of one fact.
- **A row added to either map owes a DISCHARGE sweep**, and the stale
  sentences name none of the paths being added, so no symbol or path grep
  finds them. Three shapes, each measured: an ARRIVAL clause beside a
  reserved row (`Arrives with the wave-1 route groups`); the paragraph
  legitimising left-hand-column reservations, which is falsified a SECOND
  time when the code lands, by a different commit from the one that wrote
  it; and the SIBLING row whose scope the new rows silently narrow (`The
  API surface itself` became over-broad once four router-holding
  directories landed beside it). The needles are the reservation vocabulary
  (`reserv`, `arrives with`, `lands after`) over the JOINED prose and, for
  the third, reading the rows ADJACENT to the insert point as a set.
  Repair by stating the discharge as a measurement — every path in the
  column existence-checked with a fabricated sibling asserted absent.

## Operator control plane

`lib/express/control/` is the framework's `/_control` surface — status,
dependency listing, per-dependency pause/resume/restart, client reset and
stop — mounted by `createService` whenever `control` is configured. It is
vendored from the service template this package forks and diverges from
that origin deliberately at the points below; a reader who finds the
template otherwise reads each divergence as a mistake.

**`POST /_control/stop` is opt-in.** `ControlConfig.allowStop` defaults to
`false`, so a config that enables the plane keeps every other route and
loses the one that ends the process. A refusal answers 404 and not 403 —
the same answer the whole plane gives while `enabled` is `false` — so a
caller already holding a valid token is not told that a shutdown endpoint
exists here and is merely switched off. The check sits inside the handler
rather than skipping the `router.post` registration, so a refusal carries
this router's own body rather than whatever the host application answers
for an unmatched path.

**The token compare is timing-safe.** `controlAuth` reduces both the
supplied `x-control-token` and the configured secret to fixed-length
SHA-256 digests and compares those with `crypto.timingSafeEqual`, so what
a rejection costs does not vary with how much of the token was correct.
The digest step is not decoration: `timingSafeEqual` throws `RangeError`
on operands of unequal length, so comparing raw tokens would turn a
wrong-length token into an exception rather than a rejection, and which
of the two paths ran would itself disclose the secret's length. A token
shorter than the secret, one longer than it, and one the same length but
different in content all reach the same constant-time compare.

**The version is resolved relative to the module.** `readServiceVersion`
walks up from `dirname(fileURLToPath(import.meta.url))` to the first
readable `package.json`. It used to join against `process.cwd()`, which
belongs to whoever launched the process — so a service started from a
parent directory reported that directory's version, or `'unknown'`, with
no error to show for it. `ControlConfig.version` short-circuits the read
entirely and is the escape hatch for a bundled deployment with no
`package.json` above the module. Both the probe and the read go through
the single `_impl.readFile` seam, which makes a candidate that throws
indistinguishable from an absent one: the match is the first READABLE
`package.json`, and a malformed one is still the match rather than being
skipped in favour of an ancestor's.

A field added to `ControlConfig` is only half-added until the matching key
lands in the `control` object of `lib/express/schema.ts`. The interface
reaches that validator through a cast and a zod object strips the keys it
does not declare, so the compile-time and runtime halves drift silently —
and the drift is not cosmetic: `createControlRouter` is not exported from
`lib/express/index.ts`, and its only production caller hands it
`config.control`, which is the zod OUTPUT, so an interface-only field can
never reach the router. `allowStop` and `version` are each declared in
both places for that reason. No gate here says so — lint, `check-types`
and the suite are green either way.

Both gates ahead of the routes are router-level `router.use` layers, so
the 404 for a disabled plane and the 403 for a bad token are decided one
layer out from any per-route check. A per-route gate such as `allowStop`
can therefore only move requests that were already reaching the handler,
and a 404 from `/_control` is ambiguous by construction: disabled plane,
unmatched path and refused stop all answer the same, so a test asserting
one of them needs a sibling assertion to say which it got.

## Authentication

`src/auth/` is this service's own credential strategy; `lib/express/auth.ts`
is the framework seam it plugs into. That seam declares `SessionVerifier`
around "verify a bearer token" and ships one implementation of it —
`createIntrospectVerifier`, which asks another deployment over RFC 7662
HTTP. `src/auth/verifier.ts` is the other one, answering from this
service's own `auth_sessions` table. `createService` builds
`requireAuth`/`optionalAuth` from whichever form it is handed, and from
neither when the `auth` block is absent, in which case both stay
passthroughs.

**The strategy is presence-toggled on `AUTH_BASIC_USER` plus
`AUTH_BASIC_PASSWORD`.** Both set: the bootstrap dependency, the `/auth`
routes and the local DB-backed verifier are all registered. Neither set: a
boot is exactly what it was before the strategy existed. `src/index.ts`
derives ONE value from the pair and gates all three halves on it, which is
what stops them disagreeing about whether auth is configured — a half that
consulted the env a second time could answer differently. It is a presence
check rather than a truthiness one because `src/config.ts` gives both
entries a length floor (1 and 12), so a blank value is already a boot
failure and the two spellings cannot differ. The introspection pair is the
one where they can, and `resolveAuthConfig` keeps truthiness there
deliberately: a present-but-blank `AUTH_INTROSPECT_URL` has to go on
meaning nothing configured, rather than an adapter pointed at the empty
string that refuses every request forever.

**The bootstrap runs as a managed dependency ordered behind Postgres.**
`createAuthBootstrapDependency` registers `auth-bootstrap`, which upserts
the operator credential on every boot — argon2id, rewriting
`password_hash` and `updated_at` and leaving `sub` and `created_at` as
first written — and it sits AFTER the database dependency in the
`dependencies` array, because dependencies start in array order and the
upsert needs a live pool. So a boot against an unmigrated database aborts
THERE, on the pino line naming `auth-bootstrap`, rather than limping on to
fail at the first login. `bun run db:migrate` stays the operator step it
always was: nothing in this package migrates at boot, and drizzle's
migrator does an unlocked check-then-write that concurrent callers race
into catalog errors (`tests/live/live-postgres.ts` records the incident),
so adding one is a behaviour change with its own failure modes rather than
a convenience.

**Two introspection paths exist and they never meet.** This service
verifies its own tokens in-process through the `SessionVerifier` seam: the
sessions a request presents were minted here and are one row away, so a
loopback HTTP hop would be this process asking itself a question it has
already answered. It serves `POST /auth/introspect` anyway, and that
endpoint is for a SIBLING deployment pointing its own
`AUTH_INTROSPECT_URL` here — which is why the response shape is
`createIntrospectVerifier`'s input rather than anything this package
invented. `AUTH_INTROSPECT_SECRET` keeps its old meaning on that route:
the credential authorizing a caller to ASK, compared timing-safe by
`src/auth/introspect-secret.ts` on the same digest-then-compare precedent
as `controlAuth` above, and refused before any store read. Unset leaves
the route mounted and CLOSED rather than absent — the compare is against
`''`, which no well-formed Bearer credential can equal. Precedence in
`src/index.ts` runs basic, then the introspection pair, then no `auth`
block at all; a precedence and not a merge, because `lib/express/schema.ts`
refines that block to exactly one of the two forms and refuses one
carrying both at parse time.

**A password hash and a token hash are named in two files and no third.**
Across `src/` and `lib/`, `passwordHash`/`password_hash` and
`tokenHash`/`token_hash` appear only under `src/auth/` and in
`src/db/schema/auth.ts`, where the columns are declared. The `AuthStore`
port is what holds that: `findUserCredential` answers with the four
columns the login path needs rather than a whole `auth_users` row, so no
caller outside the module acquires a hash it has no use for, and a
repository handing rows around would have spread the column past every
rule about where it may travel. `src/auth/index.ts` exports no constructor
returning a record that declares one — `bootstrapAuthUser` answers with
the credential it just wrote and is deliberately off that surface, while
`createAuthBootstrapDependency`, whose `Dependency` discards it, is on it.
The rule is about call sites and not about the type graph: `AuthStore`'s
methods name those records in their own signatures and reach them through
the exported type as readily as anything else would. A later stage adds
`tests/invariants/auth-containment.ts` to walk both trees with exactly
those two exclusions; until it lands, the rule is carried by this
paragraph and by `src/auth/store.ts`.

## Verification order

```bash
bun run lint && bun run check-types && bun run test
```

All three must be green before a PR. `check-types` covers `**/*.test.ts`
too: the exclusion carried from the origin is gone, so a type error in a
test file fails the gate like any other.

Run these from inside `packages/service` as the fast inner loop (seconds);
the root `lint:all` / `check-types:all` / `test:all` fan-out is the gate
before a PR.

`tests/` no longer carries a type-checking asymmetry: plain `.ts` modules
and their `*.test.ts` siblings are both in the program (tsconfig `include`
lists `tests`, and nothing excludes the tests). Matcher, walker and helper
logic inlined into a `.test.ts` now gets the same tsc gate as a plain
module beside it, so splitting it out is a readability call rather than
the coverage one it used to be.

A new directory under `src` needs no config change (tsconfig `include`
already covers `src`, the `lint` script covers `src lib tests scripts`,
and vitest discovers tests). `scripts/` used to be asymmetric — listed by
tsconfig `include`, unnamed by the `lint` script — and phase 2 closed the
gap, so a `.ts` file there is both type-checked and linted. Phase 3 widened
`lint` to `eslint src lib workflows tests scripts`, which reaches the
workflow sources, `workflows/src/README.md` AND both generated trees (the
base config's `dist/**` ignore is base-relative and does not match a nested
`workflows/dist/**`), so that gate's file set moves with build state — a
fresh clone lints two files under `workflows/` where a built tree lints
four. It reads STRUCTURE only there (`jsonc/indent`, empty lines, markdown
recommended): no node name, statement, marker form or display name is
checked by it. `data/` and `docs/` are still covered by no lint or
type-check target.

Prove coverage rather than assuming it — and prove it from the directory you
are running in, because BOTH gates are cwd-dependent. `eslint`'s governing
leaf config changes with the launch directory, so a file "no lint gate
reads" from the repo root is ordinarily linted from inside the package;
`tsc`'s program is worse than partial — from `packages/service` it is ~857
files of which 91 are the package's, and from the repo root it is ~311 of
which ZERO are. Use `--no-warn-ignored -f json` for eslint (a plain
`errorCount: 0` is indistinguishable between a clean file and a skipped one;
the tell is `warningCount: 1` carrying `File ignored`) and
`tsc --noEmit --listFilesOnly` for types, which has no third state. The
strongest reading of either is a COUNT DELTA between two argument lists
rather than a grep for one path. See the `prove-gate-coverage-read-only`
skill.

A `.sh` under a scan root is a third cell: `collectScannedFiles` applies no
extension filter, so the naming invariant reads it, while `eslint` and `tsc`
name it never. Shell behaviour here is proven by RUNNING it — including its
refusal paths — and by nothing else.

Markdown and JSON are gated unevenly here, and the map is worth knowing
before calling a prose edit verified. The naming invariant's scan roots
carry no extension filter, so they reach three READMEs —
`workflows/src/`, `data/` and `scripts/` — plus everything generated
under `drizzle/`, meta snapshots included. ESLint's `**/*.md` block
reaches a markdown file only where a lint target names its directory,
which today is `scripts/README.md` alone, and it checks document
STRUCTURE only: no width, no link target, no reference label. Everything
else — this file, `ARCHITECTURE.md`, all of `docs/`, and `package.json` —
is read by NO gate at all, so a green `test:all` says nothing about it.
Verify those by deriving each claim from the artifact it describes (parse
the roster out of the prose, compare it against the barrel or the
directory) rather than by reading the doc and agreeing with it.

`.env.example` is the exception to that map and is NOT gateless: it is
listed in `SCAN_FILES` in `tests/invariants/naming-patterns.ts` (beside
`docker-compose.yml`) precisely because it is copied verbatim by whoever
stands the stack up, so the de-origination invariant opens it on every
`bun run test`. Prove that coverage rather than assuming it --
`collectScannedFiles` takes a `packageRoot` ARGUMENT, and calling it with
none dies `ERR_INVALID_ARG_TYPE` on `paths[0]` from inside `join`, which
reads like a broken module instead of a wrong call. Pair the membership
assertion with an absent-path control in the same run. An example VALUE in
that file can also be falsified while every sentence around it stays true,
so a prose sweep keyed on words never reaches it: check each commented-out
value against the WIRING's own conditions, since a presence toggle
routinely makes two of them exact complements.

`Dockerfile`'s build stage runs `bun run check-types` over a PARTIAL tree
(`tsconfig` + `lib` + `src`) while the package tsconfig's `include` also
names `tests`, so any colocated `src/**/*.test.ts` importing a shared
fixture out of `tests/helpers/` type-checks locally and breaks the IMAGE --
and no gate in either fan-out reports it, since nothing but a docker build
ever type-checks that subset (measured: 10 TS2307 across four
`src/auth/*.test.ts` files, plus 2 TS7006 cascades, tsc exiting 2). The
Dockerfile has to COPY whatever `tests/` subtree `src/` reaches, and the
helper's own imports have to stay inside the copied set. Two readings such
a build owes. A `docker build` whose every layer prints CACHED is a REPLAY,
not a measurement — it exits 0 without running a single RUN step, and the
`check-types` layer is exactly the one a stale cache hides; take it with
`--no-cache` and read the RUN steps' OWN output (a genuine run prints both
`bun install` summaries and `$ tsc --noEmit`). And a build with no
`--platform` targets the HOST arch, so on Apple Silicon every claim about a
`linux-x64` artifact is unproven — `--platform linux/amd64` builds the
actual deploy target and costs nothing measurable here.

Neither `max-len` nor `max-lines` exists in any config, so the ~800-line
file cap and the hand-maintained comment wrapping are review-quality
conventions that turn no gate red. The absent-rule list is longer than it
looks and each entry means a shape review has to catch: `max-len`,
`no-unnecessary-condition` (so a `?.` left dead by a widened type is
lint-clean and sibling sites already carry them), `no-use-before-define`
(so a self-referential stub may return its own hoisted binding),
`no-inferrable-types` (so an explicit `const X: string = 'literal'` is
fine), and `exactOptionalPropertyTypes` — `tsconfig.base.json` carries only
`strict: true`. Do not generalise from that to style at large: style here
is UNPOLICED on width and type-awareness while being strict on SHAPE, and
`sharedRules.mjs` DOES carry `@stylistic/newline-per-chained-call`, so a
two-hop builtin chain such as
`createHash('sha256').update(t, 'utf8').digest()` is an ERROR even at 60
columns. Write any chain past one `.` broken one call per line from the
start, and run `bun run lint` in the package (seconds) BEFORE
`check-types` — the shape errors are the ones no type probe surfaces. That
rule forbids three links in ONE expression, not three links: a four-call
`.replace(...).replace(...).replace(...).trim()` written one call per LINE
lints clean, which is how every ported text pass here is written.

A new module under `src/lib/` hits a predictable set of findings, and the
regex ones are measured rather than inferred. `import/order` comes first —
parent (`../x`) and sibling (`./y`) are SEPARATE groups needing a blank
line between them, on top of the `type`-first-group rule. Then
`no-useless-escape`, which reads a class by POSITION: `\-` is KEPT where a
hyphen could open a range (`[A-Za-z0-9_.\- ]` is clean, another member
following it) and is an ERROR where it cannot — last in the class,
immediately before the `]`, so `[\p{L}\p{N} .,&'()\-]` is one error and
dropping the backslash is the only repair that lints. An origin pattern of
that second shape therefore does NOT port verbatim; the set it matches is
unchanged and nothing else reports the edit, which is why it belongs in the
port's `What is dropped` paragraph. The same rule flags `\/` INSIDE a class
while requiring it outside one, so write `[\\/]`, never `[\\\/]`.
`no-control-regex` does NOT fire on `\r`, `\n` or `\t` — a ported denylist
naming the two line terminators ports as a literal — and is owed the
`new RegExp` + `String.fromCharCode` construction only where a class
reaches past those three. `no-misleading-character-class` fires on a class
holding a zero-width JOINER between two other characters, the exact shape
any ported invisible-character strip carries; the repair that keeps the
match identical is an alternation built with `new RegExp` over the same
code points, since reordering the class is fragile.

Re-derive the over-cap roster
(`wc -l scripts/*.ts | sort -rn`) rather than quoting one: phase 3 put five
more files over it, `scripts/workflow-markers.ts` furthest by a wide margin,
and any roster written down here goes stale on the next docs task without a
gate to say so.

Comment WIDTH is likewise measured and not quoted. It varies per directory,
per file and per block — `scripts/` alone spans 63 to 67 characters of text
— so read the width off the block you are editing (reproduce its existing
line breaks at each candidate width) rather than from a sibling, a
directory, or a number recorded in a doc. The `prose-reflow-helper-asserts`
skill carries the helper and the nine ways a programmatic rewrap ships
broken prose that every mechanical check passes.

The seam each over-cap file wants is recorded here rather than in the file:
split the LOADER out of
`seed.ts` into `scripts/seed-load.ts` (no import cycle, and it leaves
`seed.ts` a thin entry point — moving `runSeedCli` out instead does cycle,
since the guard must stay in the file `bun scripts/seed.ts` runs), and
move `formatPendingTable` / `formatRuling` / `PENDING_COLUMNS` out of
`approve.ts` into `scripts/approve-render.ts`, re-exported from it. Both
follow the `seed-schemas.ts` / `seed-apply.ts` precedent — a bare
`export * from './<x>.js';` beside the normal import — and a move of that
size lands as its OWN refactor commit, never alongside new behaviour.

## Testing — isolated vs live (CRITICAL)

The default suite is FULLY ISOLATED: no db, no network, no credentials.
Keep it that way — a past incident where tests ran against live
infrastructure with real credentials burned a month of tokens in under an
hour. The rules:

1. New tests mock or fake external systems by default. If a fake gets
   nontrivial, give the fake its own contract tests.
2. Live tests go in `tests/live/*.live.test.ts`, gated through whichever
   `describeLive*` in that directory keys on the service they need (env-var
   opt-in → `describe.skip` otherwise; keep the explicit type annotation —
   inference breaks `tsc` with TS2742).
3. Live tests run only against the `--profile stress` compose services
   (`bun run stress:start / test:live / stress:stop`) — separate port,
   separate database name, no volume.
4. Destructive helpers must call `assertLiveDatabase` (refuses any database
   but `ar_live`). Never widen the truncate list implicitly.
   That name is also the reason the live Postgres is SHARED across every
   worktree and branch on one machine: there is one `ar_live` on port 5433,
   and `applyMigrations` points the migrator at `./drizzle`, so whichever
   checkout last ran `test:live` migrated it. A branch based on an older
   `main` therefore reads `schema.live.test.ts`'s
   `records every migration the journal names, in journal order` as RED
   through no fault of its own — the ledger carries a sibling branch's rows
   and the case renders them `unrecognized(<when>)`. Those numbers are
   attributable rather than mysterious: they are journal `when` values, so
   `git show <ref>:packages/service/drizzle/meta/_journal.json` across
   `git branch -a` names the migration and the branch that applied it. Do
   NOT repair it by deleting the ledger rows or dropping the extra tables —
   that is the sibling worktree's working state, and greening one branch
   reddens the other. Take the reading on an ISOLATED cluster instead:
   every Postgres-gated file calls `applyMigrations` in `beforeAll`, so a
   throwaway `postgres:16-alpine` with no volume is enough, and it must be
   NAMED `ar_live` or `assertLiveDatabase` refuses the destructive helpers.
   `bun run test:live` cannot be pointed at it — the script sets
   `AR_LIVE_DATABASE_URL` in its own definition, which wins over the
   environment — so the isolated leg is
   `AR_LIVE_DATABASE_URL=<url> bun x vitest run tests/live` from inside the
   package.
5. Clean up after live runs: `stress:stop` removes only the stress
   containers. Leave no long-lived processes or scheduled jobs behind.
   `db:stop` is NOT its counterpart: it is `docker compose down`, which
   acts on the whole PROJECT regardless of profile, so running it while
   the live container is up takes `postgres-live` with it. The pair is
   asymmetric by construction — `db:start` is per-service
   (`up -d postgres`) while `db:stop` is per-project and also removes the
   project network. Read the script body rather than inferring the
   counterpart from the name.
6. `fileParallelism: false` lives in `vitest.config.ts`, not on a script
   flag, so exported env vars can't re-parallelize the live files.

`src/index.ts` cannot be imported by the isolated suite AT ALL: it resolves
`src/config.ts` at import time and ends in a top-level `createService` call,
so an import boots a service against a real database. Two complements cover
it and neither is optional. The isolated one RE-ASSEMBLES the wiring shape
over the in-memory store — same presence toggle, same 0-or-1 dependency
array, same form precedence, same conditional mount — and its cost belongs
in the file header: a divergence introduced in `src/index.ts` ITSELF stays
invisible to a green run. Such a file must hand the SAME store to the
bootstrap dependency, the router and the verifier, then assert the SUBJECT
the guarded route saw rather than only its status (a service wired over two
different stores answers the same 200); and a refusal case for an ABSENT
credential exercises less of the path than one for a BAD credential, since
`buildRequireAuthFrom` short-circuits on `extractBearer` returning null.

Say it as a coverage fact rather than only as an import one: NOTHING in the
suite imports `src/index.ts`, so a wiring change has ZERO runtime coverage
from `bun run test` and a green suite is no evidence the mounts work —
`tests/api/wiring.test.ts` REBUILDS the mount block over
`createMemoryResearchStore`, and its route table is a second transcription
of the same list. Two readings are available instead and both are cheap.
`check-types` IS the structural proof for the COMPOSED store: the spread is
handed to every router and each router's `store` type re-checks it, so a
port method missing from the composition is a compile error rather than a
500. And a throwaway `zz-tmp-*.ts` at the PACKAGE ROOT that builds every
router over the memory store, mounts them on a bare express app and prints
`router.stack`'s path/verb set gives the wire inventory plus a status per
probe in one run — the 200s are the discriminating half, since an
id-addressed 404 is exactly what an UNMOUNTED path answers too.

`tests/api/wiring.test.ts` is bounded by the SHIPPED rate limiter and the
ceiling is closer than the file reads: one `createService` serves every
case, `lib/express` mounts its limiter app-wide at 100 requests a minute,
and each table row costs TWO. A group of any size overruns it, and the
failure presents as a `429` on whichever rows vitest happened to run last,
i.e. as a flaky mount rather than as a limit. Read the headroom in the same
run that adds rows — minimise `Number(res.headers['ratelimit-remaining'])`
over the responses, which needs no extra request. The repair when it comes
is a second service per describe, not a wider window. Note the limiter
bounds a file PER `createService`, so a file that boots a service per
capture window gets a fresh budget each time and this ceiling does not
generalise to it.

The other complement is booting it by hand, which is the only evidence a
WIRING change has:
`( cd packages/service && env PORT=... DATABASE_URL=<live 5433> ... bun run
src/index.ts )` in the background, curl the surfaces, kill it. Dependency
ORDER is NOT readable from the running service (this service configures no
`control` block, so `/_control/*` is an unmatched path here) — take it from
boot-FAILURE attribution instead, which is three legs: an unreachable
database must name the FIRST dependency, a reachable-but-UNMIGRATED one must
name the later dependency that needed the schema, and the same unmigrated
database with the feature toggled OFF must BOOT, which is the control saying
leg 2 was that dependency rather than something else about an empty
database. Each leg reads as one pino line (`dep=<name>` with
`dependency failed to start`) plus the exit code, since `createService`
calls `process.exit(1)` outside `NODE_ENV=test`. Make a SCRATCH database
rather than using `ar_live`, and preflight-refuse a name that already exists
so the trap's drop cannot reach somebody else's. Trap while doing it:
`( ... ) & PID=$!` captures the SUBSHELL, not the server, so `kill "$PID"`
leaves the child holding the port and the NEXT run's readiness poll is
answered INSTANTLY by that orphan — every reading then lands on the stale
service and looks like a real regression. Use `exec` inside the subshell,
preflight-refuse a port already answering, and re-check `ps` for orphans
AFTER the run.

What an unmatched path ANSWERS there is not a constant, and the difference
is the resource surface rather than the control plane: every one of its
routers mounts at `/`, so each guard runs for every request that reaches its
mount. Measured all four ways against a real `createService` carrying the
auth block `AUTH_BASIC_USER`/`AUTH_BASIC_PASSWORD` produce — with the pair
set, an uncredentialled `/_control/status` answers `401` `application/json`
and a credentialled one the `404` `text/html`; with it unset the guard is a
passthrough and both answer `404`. `/health` is `200` in all four. So a
`401` while curling the surfaces says the guard is on the mounts, not that
the plane is mounted and refusing — and `/nope` answers identically, which
is what says the change belongs to unmatched paths generally.

**The one-off probe: where it may live is decided by BARE SPECIFIERS and
nothing else.** bun resolves a bare specifier by walking up from the
IMPORTING file, so a probe importing `drizzle-orm`, `express` or
`supertest` from `/tmp` hangs or dies on resolution while its own
`writeFileSync` output still looks complete — put those at the PACKAGE
ROOT as `zz-tmp-<name>.ts`, with `rm` plus `git status --short -uall`
printing nothing as the whole revert check. A probe importing only node
builtins (`tests/invariants/naming-patterns.ts` is the one here) resolves
fine from `/tmp` by absolute path. Read the target module's own import
list rather than picking a location by habit.

Three further corrections for a probe driving an unimported `db-store.ts`
against the live Postgres, each of which fails LOUDLY but names the wrong
subject. It cannot run from any cwd: `applyMigrations` in
`tests/live/live-postgres.ts` passes a RELATIVE `migrationsFolder:
'./drizzle'`, so an absolute-import probe still dies with `Can't find
meta/_journal.json file` unless the shell is inside `packages/service` —
which reads as a broken helper. A raw `db.execute` on this
drizzle/node-postgres client answers a pg `QueryResult` and NOT an array,
so the idiomatic `const [row] = await db.execute(...)` throws `TypeError:
{} is not iterable` from inside the probe's own fixture setup and never
reaches the module under test — destructure `{ rows }`
(`tests/live/schema.live.test.ts` is the in-repo precedent). And for any
git-shelling probe, `execFileSync('git', args, { cwd: REPO })` with an
absolute REPO const pins every reading to the repo root whatever directory
the shell is in.

Put the ACCEPTED writes and the REFUSALS in the SAME run: the accepted
half is the positive control that keeps the refusals from being a store
that refuses everything. One run then answers the projection's key set,
each mechanism's refusal `reason`/`constraint`, the absent-versus-explicit-
null patch split, and the ordering — in about ten seconds against a stress
Postgres that is already up.

**A probe that LOGS its measurement reports nothing.** `console.log` from
inside a test is INVISIBLE under this package's default reporter and the
run is green either way (measured: marker count 0 by default, 1 under
`--reporter=verbose`). Have the probe `writeFileSync` its JSON to `/tmp`
and `cat` that after the run — independent of the reporter, and readable
even when the run is red.

`describeLivePg` is one of the gates in that directory, and the others are
armed differently — which is the part to know before reading a run.
`describeLiveN8n`, in `tests/live/live-n8n.ts`, keys the n8n cases to
`AR_N8N_URL`, and `describeLiveOllama`, in `tests/live/live-ollama.ts`,
keys the config-proposer case to `AR_OLLAMA_URL`, both the same way.
`test:live` sets `AR_LIVE_DATABASE_URL` in its own script definition and
sets nothing else, so it opens the Postgres gate itself and leaves every
other one shut; nothing here exports either of those settings, and a value
an operator put in `.env` for the deploy commands does not reach a worker.
A live run with the stress container up therefore reports those files
skipping while the Postgres files run, which is that command's steady state
rather than a broken setup, and the skip count a plain `bun run test` prints
has a source in each of them.

To see WHICH file skipped, pass the flag through rather than retyping the
URL: `bun run test:live --reporter=verbose` APPENDS to the script's own
inline `AR_LIVE_DATABASE_URL`, so the per-case reading costs nothing and
honours the never-export-it-by-hand rule. The default summary's skip count
cannot name a file; only the verbose `↓` lines say which skips belong to
the n8n and config-proposer files rather than to a Postgres file that
silently stopped being armed. Note also that a skipped file is still
IMPORTED, so collection proves the module parses and nothing more — never
read a `1 skipped` as evidence about a change under `tests/live/`.

There is also nothing here to point that gate at, which is why rule 3 is one
an n8n case cannot satisfy rather than one it breaks. `docker-compose.yml`
declares postgres, redis and postgres-live and no n8n service, and
`scripts/bootstrap.sh`, which would stand one up, is phase 7 in
`scripts/README.md`'s roster, so until that phase the instance an n8n case
needs is an operator's own, started by hand. Every command this package
ships leaves those cases skipped, which makes what is written under that
gate debt recorded rather than behaviour a gate here proves: treat a case
added there as unrun until somebody runs it. `tests/live/live-n8n.ts`
carries the rest — what a skipped-but-collected case still reports, and the
one place the seam can be broken without touching the gate.
`tests/live/live-ollama.ts` records the same arrangement for the
config-proposer case: no compose service supplies a model server either,
nothing starts one, and `.env.example` names neither of its two settings.

A seam of another kind sits beside the live ones, in `tests/parity/`, gated
the same way for a different reason. `bun run test:parity` runs
`tests/parity/*.parity.test.ts`, where a file drives a ported library and
the origin it was ported from over one set of neutral fixtures and diffs
the answers. `describePortParity`, in `tests/helpers/port-parity.ts`, keys
those files to `AR_PORT_PARITY_ORIGIN` — the origin checkout root, which is
an operator's own local filesystem path and is recorded in no tracked file
here — the harness TSDoc carries why. So this gate is armed unlike EITHER
live one. `test:live` opens the Postgres gate from its own script
definition; nothing in this package sets the parity variable, no compose
service supplies it and no default stands in for it, so only an operator
export arms it. A run with it unset reports the parity files SKIPPING, and
that is the steady state of this command, of `bun run test` and of CI
alike, not a broken setup.

The arming is therefore per-MACHINE rather than per-command, which is the
half that catches a reader out. `vitest.config.ts` declares no `include`
override, so `tests/parity/` matches the default glob and a plain
`bun run test` collects those files too: on a machine whose shell profile
exports the variable, the default suite reaches an origin checkout outside
this repository and CI's run does not, off the same tree. The closed-gate
reading has to be FORCED there rather than observed —
`env -u AR_PORT_PARITY_ORIGIN bun run test:parity` is the one command that
shows the skip, and it is how a change to the gate itself gets read.
Measured both ways at the seam's first file: 8 passed armed, 8 skipped
unarmed, `Test Files 1 skipped (1)` naming the file rather than a count.

Test files open with a `/** ... */` header stating what the file PROVES (not
what it calls), and separate regions with `// ---` banner comments 78 chars
wide. Table-driven suites carry their own anti-vacuity guards — pair samples
to the constant table by id and assert set equality, or an entry added later
is silently untested (see the `table-driven-test-vacuity-guards` skill).

More conventions under `lib/**`, measured rather than assumed. There is not
ONE `it.each`/`describe.each`/`test.each` in the whole package, so a table
of cases is written as plain `it()` blocks and a loop is the only precedent
(`for (const err of [...]`). A NESTED `describe` is the established
sub-grouping idiom, while the `// ---` banners separate TOP-LEVEL describes
ONLY — a new sub-block of an existing describe takes a plain `//` prose
comment, never a banner. Shared fixtures are module-scope UPPER_SNAKE and
three files independently spell the same one `SECRET`. Local helpers carry
either no comment or a short `/** */` of prose with no `@param` tags. A
helper added under `lib/` throws a PLAIN message — the `[<file-stub>]`
prefix is a `tests/live/` convention that exists to tell two live files'
failures apart in one run, and no `lib/` test carries it. Em dashes ARE the
prose convention in `//` comments there and in framework SOURCE TSDoc
alike, unlike the ASCII-only rule that governs control BYTES; caps-for-
emphasis is sanctioned but sparse. Line width runs to ~97 columns in
`lib/**` tests, well past the doc-comment numbers above.

Conventions under `tests/live/` differ from those, and the differences are
deliberate. A row-narrowing helper is LOCAL to its file rather than shared
out of `live-postgres.ts` (`schedule-clamp.live.test.ts` has `firstRow`,
`schema.live.test.ts` has `oneRow`). Every thrown error opens with a
`[<file-stub>]` prefix naming its source (`[live-postgres]`,
`[schedule-clamp]`, `[schema-live]`) — that prefix is what tells two live
files' failures apart in one run, and it is also what says a HELPER threw
rather than the database. `@throws Error When ...` is the form used here,
not the `@throws {Error}` the `documentation` skill shows, by roughly 20
sites to 4. Doc-comment prose wraps at <=72 columns, against the ~76 that
`src` uses — measure the file you are editing rather than carrying a number
across.

Vitest does NOT type-check, so a throwaway mutation may leave a binding
unused or otherwise lint/type-red and still run exactly as intended — do
not let compile-cleanliness constrain a mutation leg. Read such a leg by
the ` > `-joined NAMES a `--reporter=verbose` run prints, never by the
failure count; `test-delta-signatures-by-task-shape` covers why the count
can hold constant across structurally different legs.
`--reporter=verbose` prints per-CASE lines and NO per-file line at all
(vitest 4.1.11), so a step asking to read `the per-file lines` has to
DERIVE the split by grouping the case lines on their `<path> > ` prefix.
The per-file `# path (N tests)` line comes from the DEFAULT reporter under
a two-reporter PAIR and never from verbose: passing
`--reporter=default --reporter=json --outputFile=<f>` gives the human
summary, the per-file lines AND the machine-readable per-file split in one
capture, where `--reporter=json` alone leaves stdout at a single 42-byte
`JSON report written to` line. Two readings then come free from a verbose
capture with no second command — it IS the collected roster, so the
collected-vs-disk set equality is the grouped file set held against
`git ls-files` rather than a `vitest list --filesOnly` run, and bun echoes
the FORWARDED arguments into its `$` line, which is how an appended flag is
shown to have reached the runner rather than having been eaten by
`bun run`.

No `db-store.ts` in this package carries a colocated test file, so a claim
handed forward to `the drizzle half's own cases` is handed to files that do
not exist. A branch that exists only because the other implementation
throws (an empty-patch early return, a `RETURNING` list) is pinnable at the
LIVE SEAM and nowhere else, and each such zero is discharged per TABLE:
landing one table's case leaves the siblings' zeros exactly as they were.
Its leg fails as a THROW carrying drizzle's own message rather than as an
assertion diff, so a grid runner reading only counts cannot tell it from an
ordinary red — read `failureMessages`.

The default suite READS `workflows/dist/` and never builds it. `pretest`
runs `bun scripts/build-workflows.ts`, so the tree is written in a bun
process of its own before any worker opens it. bun keys that hook to the
script NAME rather than to the launcher: it fires for the `test` script —
`bun run test`, a path appended to it, and the root fan-out that runs the
same script — and for no other. `test:live`, `test:parity`, `test:watch`
and a bare `bun x vitest run <path>` all read whatever the directory
happens to hold, so `bun run test <path>` and `bun x vitest run <path>` are
two ways of running one file that differ in exactly this. Rebuild by hand
before reading a built artifact for any purpose.

Forgetting is loud rather than silent, but only in the run log.
`loadBuiltWorkflows` refuses a tree that yielded no artifact, naming the
directory and `bun run build:workflows`, so the absence checks over built
output cannot sweep nothing and pass. It throws at module scope, though, so
the summary reads `Test Files 1 failed (1)` and `Tests no tests` — byte for
byte what an unparseable test file prints. The case counts are not the
reading; the class in the log is.

A worker cannot do that build itself, so do not write one there.

`workflows/dist/` and `dist-external/` are gitignored and the build SWEEPS
NOTHING, so a renamed or deleted source leaves its artifact behind and every
reader takes it for a real built workflow, with no diff to fail.
`rm -f workflows/dist/*.json && bun run build:workflows` is the first thing
to try when a built-tree check fails inexplicably. The artifact on disk is
stamped for whatever the tree looked like when something LAST built it —
which `pretest` makes the last suite run, not HEAD — so the build's own
`1 built, stamped <sha>` line held against `git rev-parse --short HEAD`,
plus the ABSENCE of a `-dirty` suffix, is the whole freshness check.
`Bun.Transpiler` belongs to a global only a bun process carries, and
`tests/helpers/bun-polyfill.ts` is a `setupFiles` entry, so every worker in
this package starts with a partial `Bun` holding `serve` and nothing else:
`typeof Bun` is `'object'`, `Bun.Transpiler` is `undefined`, and
`process.versions.bun` is absent. The obvious `typeof Bun === 'undefined'`
guard therefore does not fire — the constructor is reached anyway and raises
`TypeError: Bun.Transpiler is not a constructor`. Check the `Transpiler`
property, never the global. A case that needs the real transpiler spawns
`bun scripts/build-workflows.ts` as a subprocess;
`docs/architecture/03-workflows.md` carries the argument for both halves.

That transpiler also NORMALIZES string quotes to double, which decides how
an `ownText` entry in `tests/build/lib-splice.test.ts` has to be picked. A
snippet carrying a single-quoted literal is present in the shipped source
and ABSENT from the spliced body, so the roster's own-library case passes
while its text-arrived case fails over a library that is perfectly fine
(measured: `.replace(SLUG_SEPARATOR_RE, '-')` and `typeof maxLen ===
'number'` both vanish where `protectedSpans.push(rendered)` and
`spans[Number(index)]` survive). Combined with the existing rule that the
text must be an EXPRESSION — type annotations erase and lines reflow — the
selection rule is: no string literal, no type annotation, and CHECK by
transpiling before registering. Three lines of a /tmp `.mjs` building a
real `new Bun.Transpiler({ loader: 'ts' })` and calling `transformSync`
answers own/transpiled/other-library membership for a whole candidate list
at once.

Four known flakes live in the vendored framework `lib/` half, none in
anything this port wrote, so a single red case naming one of them is not a
regression in your change. In `lib/express/control/routes.test.ts`, the
restart route's `returns 404 when control plane is disabled` case is
order-dependent, and `POST /_control/stop`'s `returns 403 when
x-control-token is missing` was seen once in six runs as a supertest
`socket hang up`; in `lib/express/control/routes.integration.test.ts`,
`reflects live dependency status changes across sequential requests` failed
once with `r2.body.dependencies` undefined, then passed 6/6 standalone and
3/3 in full-suite re-runs of the SAME tree — it appears only under the full
suite; in `lib/express/builtin-routes.test.ts`, `GET /health`'s
`returns 200 when all dependencies are running` fails with `socket hang up`,
which is transport-level rather than an assertion at all.

Distinct from those four, and reaching `src/**` and the vendored `lib/`
half alike, is the macOS supertest PORT-STEAL flake. It has EIGHT measured
presentations, so a triage keyed on any one of them sees nothing: `socket
hang up`; a wrong STATUS (404 for an expected 200, 401 for an expected
204); `Error: Parse Error: Expected HTTP/`; `AssertionError: Target cannot
be null or undefined` from a `toHaveLength` on a body that never arrived; a
MATCHING status beside an EMPTY body; an empty CONTENT-TYPE header
(`expected '' to be 'application/json'`); a plain `expected false to be
true` from a boolean envelope check; and — worst-shaped — a `socket hang
up` inside `beforeAll`, which fails the whole FILE so a mutation-grid
runner reading the JSON reporter scores that leg N-of-N.

`tests/helpers/loopback-bind.ts` does NOT exist on this HEAD, so the
mitigation is genuinely unreachable rather than merely unverified: `ls
tests/helpers/` is the one-command check before assuming any
supertest-bearing work is protected.

Attribute it with the CHEAP readings before any re-run, because a re-run of
the failing file is a coin flip at this base rate and the failing file is
not stable across runs either. Three settle it and none costs a suite:
`git log $(git merge-base main HEAD)..HEAD -- <file>` empty (the branch
never touched it); `grep -rn '<the new module path>' src tests lib scripts`
answering only a TSDoc prose mention (nothing can execute the change);
and, for a change under `tests/live/`, the file self-skips in the default
suite so it is unreachable BY CONSTRUCTION. The confirming pair is the file
green standalone plus an immediate full re-run at IDENTICAL totals, with
the failures moved into the passed column — read the CASE count as well as
the file count, which a file-level reading misses. Do not read a
presence/absence pair as causation: measured 2-of-2 red at HEAD against
5-of-5 green at the base over a change with zero runtime exports that no
test imports.

Resolve a flake record's bare case NAME to a ` > `-joined path before
applying the discriminators, because the two select different sets: the
restart record's `returns 404 when control plane is disabled` names SEVEN
cases in `routes.test.ts` (one per route describe), with seven more `→ 404`
siblings in a nested `all routes return 404 ...` describe.
`grep -cE '> <name>'` over a `--reporter=verbose` capture says how many
cases a record actually selects and costs nothing. Note too that a targeted
`bun x vitest run <dir> --reporter=verbose` collects in a DIFFERENT order
from the full run, so for an ORDER-DEPENDENT case it can never substitute
for it — it is a companion to the green full suite, not a replacement.
Corollary: a task whose acceptance is conditional on a red is MOOT rather
than satisfied when the run is green, since all three discriminators are
only reachable from a red.
Three discriminators, and all three must hold: it passes when run alone, an
immediate full re-run is green, and the two runs report the SAME totals with
the failure moved into the passed column — that totals identity is the
cheapest evidence a red is a flake rather than a case that stopped running.
Under the default reporter a one-off red cannot be attributed at all (it
prints only a count), so capture with `--reporter=verbose`. Check `uptime`
before chasing either: machine-load timeouts pick a different victim each
run, and the tell is the summary line, where a healthy `@ar/service` run
reads `import ~4s / tests ~2.5s` and a degraded one reads hundreds of
seconds. Never start a second vitest process while the full suite runs.

A green suite cannot say a file was COLLECTED. Renaming one out of the glob
leaves the run fully green and moves only the two denominators, which nobody
holds against a prior run — `bun x vitest list --filesOnly` collects without
running, so a grep over it answers membership directly and its count against
the run's own parenthesised denominator ties collection to the run.

## Plans and specs

`.plans/` and `.specs/` are the destinations for working plans and specs,
and they are **gitignored on purpose**: these files routinely describe
critical bugs (privacy/security) before they are patched, and must never
reach the remote ahead of the fix. Rules:

- Generated plan artifacts (`PLAN-<stub>.md`, `PREREQUISITES-<stub>.md`,
  `PLAN_TRACKER-<stub>.md`) live in `.plans/` — `ralph plan` writes there,
  and the loop's commit step can then never pick them up by accident.
- Specs you are actively working from go in `.specs/`. There is no tracked
  `specs/` directory here — a follow-up whose subject is already visible in
  the public code is written up in `docs/` or in the section of this file
  that owns the behaviour (the control-plane hardening notes live under
  "Operator control plane"); when in doubt, `.specs/`.
- Never "tidy" these files into a tracked path, and never weaken the
  `.gitignore` entries.

## The loop

`bun run ralph plan --spec=.specs/<file>.md` writes
`.plans/PLAN-<stub>.md` (+ `.plans/PREREQUISITES-<stub>.md` when needed) per
the `dev-planner` skill; when a `progress.txt` exists, its findings are
injected as advisory planning context (skip with `--no-progress`).
`bun run ralph start --plan=.plans/PLAN-<stub>.md` executes it task-by-task
with a per-plan tracker, marking `[x]`/`[BLOCKED]` and resuming blocked
tasks first. `--start-at=HH:MM` defers a run. On completion the loop
promotes general findings from `progress.txt` into the repo docs/skills and
then compacts the file per `.claude/skills/progress-hygiene/SKILL.md` —
progress feeds future plan generation, so it must stay small and current.

## Issue reporting

The `qa-bug-reporter` agent files findings as GitHub issues via `gh`
(dedupes first, never guesses priority, asks before filing). Security
findings are routed to a private security advisory by a human — never to the
public tracker, and never searched for on it first.

## Workflow

Feature-branch → PR → merge. `test.yml` gates PRs with the isolated suite
only. Integration/live testing is a local (or self-hosted-runner) concern by
design.
