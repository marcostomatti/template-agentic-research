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
  table in `AGENTS.md` (package-level orientation) and the finer one in
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
- **Three rosters here are keyed on a FILESYSTEM LISTING, so adding a
  module reds a test in a file nobody edited.** `src/sources/index.test.ts`
  holds `NON_ADAPTER_MODULES` (every non-adapter entry, each with a REASON
  SENTENCE) against `readdirSync` of its own directory;
  `tests/build/lib-splice.test.ts` holds `SPLICED_LIBRARIES` against
  `src/lib`; `tests/invariants/workflow-dist.ts` holds one over
  `workflows/src`. None is reachable from `lint` or `check-types`, all
  three are green until a `bun run test`, and each fails naming the FILE
  rather than the roster — so a task adding a module owes a full package
  run before it can call itself done. Predict it with
  `git grep -ln readdirSync -- src tests` BEFORE creating the file. A
  missing `NON_ADAPTER_MODULES` row reds TWO cases, which is the cheap
  liveness leg for the edit; its TSDoc enumerates the buckets, so check
  whether the new module falls under a sentence already there before
  adding one, and avoid apostrophes in the reason
  (`@stylistic/quotes` has no `avoidEscape`). `tests/invariants/` itself
  has no such roster, so an invariant file reds nothing on arrival.
- **Every library under `src/lib/` puts its TOP-LEVEL names, private ones
  included, into the SAME scope as any other library spliced into the same
  Code node.** A duplicate `const` is a `SyntaxError` on that node's first
  execution and a duplicate `function` is a silent last-one-wins, and
  nothing in the build, the splice roster or either fan-out reports it.
  Scan before naming anything: a column-anchored
  `^(?:export )?(?:function|const|let|var|class)\s+(\w+)` over the
  directory found 14 names already shared, `asText` across NINE libraries.
  Prefix a new library's top-level names, and check the intersection
  against the library most likely to be spliced BESIDE it rather than
  against the whole directory. Related, and undocumented in the splice
  test's own header: no `ownText` roster entry may carry a STRING LITERAL,
  because the entries are matched against the shipped SOURCE and against
  the TRANSPILED body and bun's transpiler re-quotes single to double —
  regex literals and identifier-only expressions are what survive.
- **Every `src/*/store.ts` exports TYPES ONLY** — nine port modules, zero
  `const`, and the only imports are `import type`. So a VALUE a port's
  vocabulary needs (a sort-key tuple for `sortQuerySchema`, a roster, a
  cap) cannot live beside the type that names it and belongs in the group's
  `service.ts` or `routes.ts`: declare the port's side as a union type and
  let the tuple in the service be what the schema factory is handed, with
  the tuple's FIRST member and the union's first line stating one default
  rather than two. The same rule is why a port declaring a row by hand
  imports no drizzle — which leaves those hand-written records pinned by
  NOTHING, closable with a throwaway `src/<group>/zz-tmp-pin.ts` asserting
  `[Row] extends [Rec]` against `typeof <table>.$inferSelect` and one
  deliberately-wrong shape as `false`, run under the PACKAGE gate
  `bun x tsc --noEmit` and then removed. A deliberately COLUMN-SCOPED
  record is `true` in ONE direction only; a whole-table record is true in
  both and owes a RENAME leg as well as a nullability one; and an
  AGGREGATE record (a GROUP BY result) has no `$inferSelect` counterpart
  and is pinned by nothing at `check-types` at all.
- **Which group exports its list query schema is a decision, not a
  style.** A group with a NARROWING to declare exports it from
  `service.ts` (`findingListQuerySchema`, `documentListQuerySchema`) so a
  service test can drive the BOUNDARY refusals; a collection with no filter
  takes the shared `paginationQuerySchema` in the router instead, since a
  group-local schema over nothing but `?page` and `?perPage` would be a
  second declaration of the cap and the default. Where a schema IS composed,
  extend FROM the schema carrying the cross-field check: zod 4 carries an
  object-level refinement OUTWARDS ONLY, so `a.extend(b.shape)` keeps `a`'s
  `.refine()` and the reverse silently DROPS it while type-checking and
  answering every other request identically.
- **The MCP seam.** `src/mcp/server.ts` calls `createMCP` at module scope,
  so importing it BOOTS a server and binds a port — no test can read the
  tool list through it, and the only reading available is a throwaway
  package-root probe that COPIES the registration expression over
  `InMemoryTransport`. `src/mcp/tools/registry.ts` is the half that CAN be
  imported (type-only imports plus one zod type). A wave module filling
  `MCP_TOOLS` is a VALUE import in `registry.ts` and a type-only import
  back, so there is no runtime cycle — but a shared answer helper must
  live in a THIRD file and never in `registry.ts`, where a value import
  back would close one. Every tool input schema is declared per exposed
  ROUTE, in the route module, spread from the pieces that route parses;
  exporting a router's PRIVATE address const instead falsifies the
  `identical const is private` sentence a dozen route modules carry, so
  export a DERIVED schema that spreads it.
- **Every descending ORDER BY key in a db-store must spell
  `desc nulls last`, as a `sql` template per key.** Neither `asc` nor
  `desc` from `drizzle-orm` can express it and no helper exists, while
  drizzle's INDEX column builder `.desc()` renders `DESC NULLS LAST` — the
  opposite of Postgres's own default for that word. The planner matches a
  pathkey LITERALLY, so a store writing bare `DESC` cannot use the index,
  and NOT NULL does not make the qualifier moot (measured on PG 16: fully
  qualified plans as a bare `Index Only Scan`, bare `DESC` on the NOT NULL
  keys degrades to an `Incremental Sort`, bare throughout to a full
  `Sort`). Ascending keys take NO qualifier — `NULLS LAST` is already the
  `ASC` default — so a store carrying both orders looks inconsistent and
  owes a sentence saying why.
- **A db-store's SQL is readable END TO END without a database**, and the
  claims its header makes are pinned by nothing without it: `check-types`
  is BLIND to a store projecting MORE columns than its record declares
  (excess-property checking fires only on a fresh object literal, which a
  query builder's result never is). Drive the REAL module through
  `drizzle(fakeClient, { schema })` where `fakeClient` is
  `{ query(config, params) { ... } }` recording `config.text` and
  returning one plausible row. Write the probe at the PACKAGE ROOT, not in
  `/tmp`: every bare specifier in a `/tmp` probe resolves from `/tmp`, and
  under the isolated linker that finds the wrong copy and names the wrong
  subject. Two complements, neither substitutable — `PREPARE s1 AS <the
  rendered statement>` against the running live cluster says every
  statement is valid against the REAL schema and
  `pg_prepared_statements.parameter_types` says what Postgres inferred for
  each `$n`; and a `CREATE TEMP TABLE` shadowing the real one on ONE
  dedicated connection says what the store ANSWERS, which is the only
  reading of the DECODED values (`sum()` arrives as a STRING where
  `count()` arrives as a number). See the `drizzle-recording-client-probe`
  and `pg-temp-table-shadow-probe` skills.
- **Adding a member to `DomainSettings` is THREE edits, and the tripwire for
  the other two is visible to `check-types` ALONE.**
  `src/domains/settings-payload.test.ts` holds a type-level constant whose
  annotation goes unsatisfiable the moment the interface in
  `src/db/schema/domains.ts` gains a member the zod schema and its
  `DECLARED_MEMBERS` roster do not name. Measured on the interface edit
  alone: EXIT 2 with exactly ONE TS2322 at that constant, while the
  single-file vitest run over the same file is fully GREEN — so a task
  running only the suite reads a clean file. The error also names the TEST
  file rather than the schema module that was edited, which reads as a
  broken test until the annotation is read, and `domainSettingsSchema` is
  `.strict()`, so the member is REFUSED on any write until the zod half
  lands. That half is FIVE more edits in the same test (the roster, the full
  payload the omit-each-member case holds SET-EQUAL to it, and the
  refusal-class code SET), TWO prose claims in `settings-payload.ts`'s own
  header, and the `settings` COLUMN's TSDoc back in the schema module, which
  ENUMERATES the payload in prose. None of it is gated, no grep for a
  numeral finds any of it, every count being spelled as a word, and the
  interface's own header does NOT enumerate — so a task working from the
  schema module alone sees none of it. `scripts/seed-schemas.ts` holds a
  SECOND `.strict()` copy of the schema for `data/domains.json` and nothing
  gates the pair.
- **The counterpoint, worth not over-preparing for:** adding an entry to
  `ENV_DEFAULTS` in `scripts/workflow-markers.ts` is ONE edit. Nothing pins
  the key SET (its test guards three named settings with `toContain` and no
  length or set equality) and no tracked prose counts or enumerates the
  entries, so a new key reddens nothing and falsifies nothing. An entry no
  marker NAMES is inert by design. That module imports only `node:fs`, so
  `bun -e` drives the real resolver over the real table with no test file
  and no build; the two controls that make such a probe discriminating are a
  MISSPELLING still throwing, and a chain with the name in front of the
  table returning the FRONT value.
- **The null-vs-zero law's AUTHORITY is two hand-written lists** in
  `tests/schema/canonical-document.test.ts`: `SIGNAL_COLUMNS` nullable, and
  `COUNTER_COLUMNS` NOT NULL because zero is a count. A column on NEITHER
  list is UNDECIDED rather than untested, and nothing anywhere discovers it
  — that file's own header says so. Adding to either list is covered by
  construction (one case per entry) and falsifies THREE counts in that same
  file, all spelled as words. The worked precedent a new counter's TSDoc
  should reproduce is `sources.consecutive_failures`, including the half a
  reader omits: the NOT NULL is what makes the threshold comparison work at
  all, a NULL comparing UNKNOWN rather than false, so such a row would
  neither trip the detector nor turn up among the rows it passed over.
- **A column added to a table whose store port answers a WHOLE-ROW record
  falsifies prose in two files and NEITHER gate reports it:** the `*Record`
  header counting the table's own columns against the ones the shared column
  helper spreads in, and the `every column it has` clause in the
  `tests/live/` API rosters, where three sibling rosters carry the identical
  clause for their own tables. The type pins beside them are about the
  RECORD and never the table, so the `satisfies readonly (keyof T)[]` and
  the key-set conditional both stay green, as does the whole suite.
  Line-JOIN the sweep or it finds nothing, the clause wrapping in every
  case.
- **A drizzle snapshot's six schema figures are one sum apiece** over the
  per-table maps in `drizzle/meta/<idx>_snapshot.json` (`columns`,
  `uniqueConstraints`, `checkConstraints`, `foreignKeys`, `indexes`,
  `compositePrimaryKeys`, with `tables` the length of the top-level map).
  Two traps: `version` is the STRING `'7'`, so a control comparing it to the
  integer reports FAIL on a correct snapshot, and a table missing one of
  those keys scores 0 silently — assert every table DECLARES all six before
  reading any total. Reading a new column's NOT NULL and DEFAULT out of a
  snapshot needs its own discrimination, since `notNull` is a boolean and
  `default` a value: some column must read `notNull: false` and some must
  carry no `default`, plus the leg a task omits — assert the column is
  ABSENT from the PREVIOUS snapshot, or "the snapshot carries it" is
  satisfied by a snapshot that always did. The index map answers more than a
  count, too: `isUnique` per index and a non-empty `where` per index are
  what let a doc row describe the set rather than tally it.
- **A TSDoc cross-reference to a doc section, or to an assertion a LATER
  task in the same plan will add, is FALSE at the commit that writes it**,
  and nothing re-reads a header. Prefer the capability form the schema
  modules already use — a constraint is NAMED so the static-SQL invariant
  suite HAS a name to grep, which is true the moment the name exists — over
  claiming the suite greps for it. Run the converse sweep as well: a header
  can point AT a doc for material that doc does not carry, so a docs task's
  first sweep is `git grep` for the document's own path. A section can
  SATISFY a carried-in forward reference rather than falsify one, and a
  pointer that is now half-right reads as fully satisfied to the next
  reader, so say which half a section closes.
- **Three docs-structure rules, none of them gated.**
  `docs/architecture/01-invariants.md`'s header paragraph is an ORDERED
  enumeration of which spec each register row came from and ends in a
  FINALITY claim, so every task adding a row falsifies a sentence in the
  same file and owes the repair in the same commit. `ARCHITECTURE.md`'s row
  for a doc enumerates that doc's sections at the `###` grain and NOT the
  `##` one, so a `###` added under an existing `##` owes the row too. And
  these documents back-reference their PREDECESSOR by content rather than by
  number, so inserting a `###` between two sections breaks a sentence no
  gate reads — read the FOLLOWING heading's first sentence before inserting.
- **A register row claiming `Implemented` rather than `Unexercised` is two
  commands** and never a reading of the artifact's own prose:
  `bun x vitest run <the test>` from inside the package (about a second, no
  `pretest`), which reports the case count, plus
  `bun x vitest list --filesOnly | grep -c <the file>` at 1, which is what
  says an ordinary `bun run test` collects it at all.
- **An invariant that MEASURES the absence of a live subject inverts what a
  mutation leg's green means**, and a leg scored on the exit code reads a
  working allowance as a broken rule. Planting the ALLOWED form (a read the
  rule permits) leaves the VERDICT green — no finding is reported — while
  the case recording `no such read exists in this tree` reddens, the plant
  being exactly the subject it measures the absence of. Such a leg still
  exits 1, and the reading is WHICH case moved. Two legs at one site whose
  red sets are DISJOINT is what says the allowance is a branch the rule
  takes rather than a read it never sees.
- **A must-find roster whose LIVENESS PLANT rides in the same walk as the
  real entries keeps its verdict GREEN through the roster being EMPTIED.**
  Measured over one 9-case invariant file: emptying the roster reddened 4
  cases and NOT the walk, the plant going on reporting while every property
  the roster carried stopped being checked. The coverage case holding the
  reached ids against the declared ones is the ONLY thing that reports it,
  and it needs a `rosterDeclaresAny` member beside the ids — with the plant
  in both lists, an emptied roster leaves one list equal to the other. Say
  WHICH case moved per leg, never the exit code.
- **`sqlWords()` in `tests/invariants/dispatch-sql.ts` cannot answer any
  question about SQL STRUCTURE**, and reaching for it is the reflex: it
  drops parentheses, so `NOT EXISTS (SELECT 1 FROM x)` and a bare read
  reduce to word streams differing only by two keywords somewhere earlier in
  the line. A subquery-containment reading needs the comment strip and the
  case fold WITHOUT the punctuation flattening, plus its own paren-depth
  walk — and that walk must step over single-quoted literals while treating
  a DOUBLE-quoted identifier as code, `"entity_research"` being a read of
  the table rather than a string. It also flattens the DOT, so a failure
  label built from a reduced fragment spells `p abandoned_at is not null`
  where the roster entry was written `p.abandoned_at IS NOT NULL`, and a
  reader grepping the failure for the column finds nothing; take such a
  literal from a probe, never from the entry. Containment is the
  space-padded `carries` rule and not a bare `String.includes`.
- **`@ar/service` has TWO statement surfaces and neither exercises both
  halves of an SQL rule**, so a detector pair driven over one of them is
  half-dead: the built workflows (read through `loadBuiltWorkflows()`) and
  `src/`'s modules read as text. Drive BOTH, in ONE call, and say which
  surface each half was shown live on. A SQL string-literal walk applied to
  a TYPESCRIPT file is separately blind by APOSTROPHE PARITY — an apostrophe
  in prose opens a single-quote literal that never closes, so every later
  occurrence in that file reads as quoted and a structural reading reports
  zero. A word reading and a structural reading over the same TS tree
  therefore legitimately disagree, and the only claim a run can hold is the
  DIRECTION (the word reading is the wider), never the two counts.
