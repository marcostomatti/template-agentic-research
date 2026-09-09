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
  (see "Plans and specs" in `context/security.md`), so it sits on the
  machine doing the work rather than in a clone.

Two rules bind every phase of that port:

- **Same-commit doc-update law**: a commit that changes behaviour in a
  row of the mapping table in `docs/architecture/00-overview.md` updates
  that row's document in the same commit, and behaviour no row covers
  adds a row.
- **Naming invariant**: no naming from the project this pipeline was
  ported from, no vault path, and no real hostname appears in the
  package's scanned source — `tests/invariants/naming.test.ts` fails
  naming the file and line of every hit.

### Authoring and verifying a workflow source

A canvas is a JSON file nothing lints for shape, nothing type-checks and
no suite opens except by node TYPE, so most of what follows is convention
held by nothing. Read it before adding a node.

- **The roster law.** An id joins `DELIVERED_WORKFLOW_IDS` in
  `tests/invariants/workflows.test.ts` in the SAME commit as the source it
  names — two cases derive from that constant and both red the moment
  `pretest` rebuilds `workflows/dist/`, so a roster edit scheduled as a
  later task runs the whole stage red. A landing commit is exactly four
  files: the source, the two roster rows (`workflows/src/README.md` and
  `docs/architecture/03-workflows.md`), and that constant.
- **Write a NEW file from python**, `json.dumps(envelope, indent=2,
  ensure_ascii=True) + a newline`, which is what `scripts/scaffold.ts`
  does and for the same reason: a Code-node body is a JS program inside a
  JSON string and one missed escape is a source no build can parse. Every
  tracked source is 100% ASCII where `docs/*.md` carries raw em dashes —
  opposite conventions, so a builder copying doc style lands non-ASCII in
  a canvas. `indent=2` is required rather than tidy: the package lint
  script reads `workflows/` and `jsonc/indent` applies.
- **EDITING one is a different rule, and which rule is measurable.**
  Assert `json.dumps(json.loads(raw), indent=2, ensure_ascii=True) +
  newline == raw` BEFORE editing. True (the fully-expanded sources) means
  load-modify-dump reproduces the tracked bytes and a node may be built as
  a dict; false (the sources keeping short arrays inline) means a raw-text
  `str.replace` with `raw.count(old) == 1` asserted is the only safe edit,
  since a round trip is a 275-line reformat burying a three-node change.
- **Three comment widths in one file**, none of them the 78 the rest of
  the package uses: a Postgres node's SQL comments wrap at <= 86, a Code
  node's JS comments at <= 72 and its code at <= 78. A sticky's `content`
  is unwrapped prose, so a `str.replace` there has no wrap hazard at all.
- **The canvas grid, which no gate reads.** Pipeline nodes run along y=0
  spaced 220 apart in x from the trigger at [0,0]; a model endpoint hangs
  at [x, 220] off its own chain node. Every node carrying a sticky sits at
  a multiple of 440, and a sticky's x is exactly that node's x minus 20 —
  the 440 band is a consequence of 400-wide notes over every other node,
  not the rule. Stickies are 400 wide on the y=-760 band and go LAST in
  the `nodes` array; the trigger's sits alone at [-460,-160]. Height is
  `len(content)` over that STICKY's own ratio (1.3 to 2.6 measured, not
  uniform within a file) rounded to 20, with 1300 the ceiling in the tree.
- **A model group is SIX nodes and the invariants read four.** An
  `@n8n/n8n-nodes-langchain.lm*` node is a SUB-node: it carries the
  credential and connects by `ai_languageModel` to a `chainLlm` root on
  the main path, so an `lm` node alone leaves the pipeline broken. The
  endpoint and model name arrive as DATA from a `Select Model Connector`
  Postgres node, because a Code node opens no connection and a spliced
  library imports nothing.
- **Drive a Code node offline before any suite exists.** A /tmp `.ts`
  under `bun run` importing `tests/workflows/code-node.js` by ABSOLUTE
  path gives `codeNodes('<id>.json').run(node, { input, nodes })` over
  `workflows/dist/`, `nodes` keyed by canvas name. It collects
  `n8n-nodes-base.code` ALONE, so a decision made in a Postgres node's SQL
  or its `queryReplacement` is invisible to that whole harness — check
  every refusal shape a plan names against `codeNodes('<id>.json').names`
  before writing the file, and say in the header where the other half is
  held.
- **Drive a node's SQL live against `ar_live`.** The credential is spelled
  once, in `test:live`'s own script definition, so the invocation is
  `docker exec -i service-postgres-live-1 psql -U ar -d ar_live -f -`
  (`-U postgres` fails: no such role). `PREPARE q AS <query>;` alone
  proves it compiles against the real schema and settles the constructs a
  reader doubts. Behaviour goes in one `BEGIN; ... ROLLBACK;` script
  driving `EXECUTE`, in ONE session — a second `docker exec` answers
  `prepared statement "q" does not exist`. A statement you expect to be
  REFUSED needs `SAVEPOINT`/`ROLLBACK TO SAVEPOINT` around it (a CHECK
  violation aborts the transaction, so the after-state a nothing-was-
  written case reads is otherwise unreadable) and `\set ON_ERROR_STOP
  off`/`on`, or the probe stops at the refusal it was written to observe.
  Roll back to the savepoint only when the statement actually threw.
- **Get a live fixture's shape from the database, not from schema files.**
  `information_schema.columns` filtered to `is_nullable='NO' and
  column_default is null` names every column an INSERT must supply, and
  `pg_get_constraintdef` over `pg_constraint` names the value vocabularies
  a CHECK enforces — neither is guessable from a column name, and a
  violation aborts the transaction so every later `\gset` then fails with
  a syntax error at `:`, which reads as a psql quoting problem.
- **A mutation leg over a built artifact goes in `workflows/dist/` and is
  run with `bun x vitest run <file>` DIRECTLY**, never through the package
  script, whose `pretest` rebuilds the plant away; `bun run
  build:workflows` restores byte-for-byte -- but that holds WITHIN one
  commit only, and only for `ar-dispatch.json`. The HEAD-sha stamp the
  build writes reaches exactly ONE of the six artifacts (`grep -c` for
  the short sha answers 1 for `ar-dispatch.json`, `AR_BUILD_TAG`'s only
  consumer, and 0 for the other five), so the other five reproduce
  hash-for-hash across ANY commit that does not touch their sources and
  are usable as a rebuild control where the dispatch artifact is not.
  A LIVE file that rebuilds dist
  in its own `beforeAll` inverts this — the plant goes in
  `workflows/src/` and the restore is a `cp` from a /tmp hold.
- **Know what the invariants do NOT read.** Every per-node case keys on a
  node TYPE, so deleting a closing Postgres node wholesale left all 11
  invariant files passing. A Postgres node's whole verification is the
  psql harness plus an offline drive of its `queryReplacement`; a task
  should say so rather than leaning on a suite that never opened it.
- **The seed traps are a roster, and each fails as a column name a reader
  would not guess.** A probe planting rows meets these before it reaches
  the statement under test: `runs.scheduled_by` takes a `RUN_SCHEDULERS`
  member (interval/agent/operator); `sources` has NO `name` and wants
  `kind` + `endpoint`; `documents` wants `hash` + `body` rather than the
  content-hash/raw pair the TSDoc prose suggests, and `documents.hash` is
  UNIQUE across the WHOLE table rather than per domain, so one document
  per scenario needs a distinct hash; `research_pool` REFUSES a row at
  status `done` with no `approved_at` (`research_pool_approval_check`
  reads `researched_at IS NULL OR approved_at IS NOT NULL`); `entities`
  wants `name_norm` as well as `name`, both NOT NULL; `domains` wants
  `name` and NOT `title`; and `topics` wants `name` and has neither
  `slug` nor `title`. The misses surface as 23502 or as 42703 naming a
  column, which reads as a schema the migrations did not apply rather
  than as a guess. Read the newest `drizzle/meta/<idx>_snapshot.json` for
  a table's column map, NOT the schema module, which spreads helpers and
  hides the roster.
- **Proving a shipped workflow statement parses, type-resolves and
  behaves needs no `test:live` and no `AR_LIVE_DATABASE_URL`.** Create a
  THROWAWAY database on the live cluster; the maintenance connection is
  `postgresql://ar:ar@localhost:5433/ar_live`, read off the `test:live`
  script definition. Apply `drizzle/*.sql` in `_journal.json` order
  splitting each file on `--> statement-breakpoint`, drive the BUILT
  artifact's statement looked up BY NODE NAME through `pg`, then
  `DROP DATABASE`. That is strictly better evidence than a mutation leg
  for an SQL claim, and it is the only reading that catches a statement
  which does not parse before the live-suite task lands. Two cautions.
  `ar_live` is NOT empty any more — every `test:live` migrates it — so
  the old `count(*) from information_schema.tables` at ZERO either side
  is a DEAD control; the readings that still discriminate are per-FACT
  (`ar_live` must not carry the column the branch just added, must hold
  none of the probe's seeded rows, and no `zz_tmp_*` database may
  survive). And `count(*)` comes back from `pg` as a STRING, bigint
  having no lossless JS number, so a count held against a numeric literal
  is false for every count including zero.
- **A probe that DIES mid-run leaves its `zz_tmp_*` database behind**,
  and the next run's own "no `zz_tmp` database survives" check then reds
  against a leftover it did not make. Read
  `select datname from pg_database where datname like 'zz\_tmp\_%'` and
  drop the strays before treating it as a finding; the leftover is
  invisible to `git status`, nothing in the working tree recording that a
  database exists.
- **Edit a workflow source's `query` as a BYTE-level replacement of the
  ESCAPED string, never by re-serialising the parsed JSON.**
  `json.dumps(..., indent=2)` explodes every inline `"position": [0, 0]`
  into three lines, so a one-clause SQL edit lands as a
  217-insertion/51-deletion diff. `json.dumps(query,
  ensure_ascii=False)[1:-1]` occurs EXACTLY ONCE in the raw text, so
  `raw.replace(enc_old, enc_new)` leaves every other byte alone and the
  diff is the `1 1` a one-JSON-line query predicts. Assert that count of
  1 before writing — a mismatch surfaces as a count of 0 rather than as a
  corrupted file. Anchor a mutation leg the same way and report the
  anchor's OCCURRENCE COUNT rather than asserting it is 1: one digit
  guard occurred FIVE times in a single source, while a guard spelled in
  two arms of one `CASE` legitimately anchors twice.
- **Workflow SQL has house widths of its own and they are NOT `src/`'s.**
  Comments fill to 86 columns and code to 84, and `workflows/src/*.json`
  is PURE ASCII (zero characters above U+007E) where `src/` and `tests/`
  TSDoc use em dashes freely — so a paragraph moved from a TS header into
  a node comment has to lose its dashes. The fill is reproducible and
  worth proving before writing a paragraph:
  `textwrap.fill(' '.join(text.split()), width=86, initial_indent='-- ',
  subsequent_indent='-- ', break_long_words=False,
  break_on_hyphens=False)` reproduced all 20 existing paragraphs of one
  node byte-identically. `break_on_hyphens=False` is load-bearing, the
  workflow ids being hyphenated. The one documented exception is a
  paragraph quoting an identifier that carries SPACES (an
  `$('Node Name').first().json` handle), hand-broken so the identifier
  lands whole at a line start; mask it with an EQUAL-LENGTH no-space
  token, fill, substitute back.
- **A node's prose NARRATES its neighbours, and an n8n canvas's STICKY
  NOTES narrate the statement below them in the same words.** Widening
  one node's projection therefore falsifies a sentence in a DIFFERENT
  node of the same artifact, and nothing reports it — not the must-find
  roster, not the anti-join inventory, not either fan-out. Sticky notes
  are SINGLE UNWRAPPED LINES in the source JSON, so the 86-column
  discipline does not apply to them and a `textwrap` control over one
  reports every paragraph as a mismatch; edit them as whole paragraphs
  through the same escaped-string byte replacement.
- **A workflow-source task that adds a QUERY PARAMETER reds a live test
  that binds that node's values by hand, and nothing in the default
  verification order reports it.** Measured: a raise statement gained a
  second parameter three commits before the live task that owned it, and
  the file died `bind message supplies 1 parameters, but prepared
  statement "" requires 2` — a driver error reading like a malformed
  statement rather than a stale fixture. `bun run test` was GREEN through
  it (every `tests/live/` file self-skips) and so were both fast
  fan-outs. Any stage changing a node's `queryReplacement` ARITY owes
  `bun x vitest run tests/live/<file>` in THAT stage, which is about a
  second. Adding KEYS to a single `JSON.stringify` envelope does NOT move
  the arity and is a different question.
- **An optional `queryReplacement` resolvable must go through
  `JSON.stringify(x ?? null)`.** The bare form binds the STRING
  `'undefined'` when the member is missing from the answering node's
  projection — a value `nullif($n::jsonb, 'null'::jsonb)` does not catch
  and `::bigint` refuses. The spelling that survives both id spellings is
  `$n::jsonb #>> '{}'` behind a digit regex, `#>>` answering the text of
  a JSON string and a JSON number alike and SQL NULL for a JSON null.
- **Every artifact passing a NULLABLE column through `queryReplacement`
  has the renders-`null`-as-TEXT shape latent**, and it only fires on
  live data. A Postgres node casting such a parameter dies
  `invalid input syntax for type timestamp with time zone: "null"` --
  `ar-ingest`'s `Apply Source Health` hits it on the FIRST successful
  fetch of any source, because a source that has never failed carries
  `last_failure_at = null`. The sibling failure is the EMPTY STRING:
  `ar-research`'s `Select Model Connector` renders `={{ $json.run_id }}`
  to nothing when the pool drained empty, and the node refuses with
  `Query Parameters must be a string of comma-separated values or an
  array of values`. Audit both shapes whenever a nullable or
  possibly-absent column enters a resolvable.
- **`@ar/service`'s tsconfig `include` lists `tests`**, so every
  `tests/**/*.test.ts` IS in the program `tsc` reads. Several helper
  headers under `tests/invariants/` repeat the opposite verbatim ("a
  `.test.ts` sits outside the program `tsc` reads"); that claim is FALSE
  here — a throwaway `zz-tmp-*.test.ts` carrying
  `export const planted: number = 'x';` reds `bun run check-types` with
  TS2322 naming that file. So a roster written into a service `.test.ts`
  IS type-checked and a tsc mutation leg can target one. Re-measure per
  package before carrying it; `@ar/ui` and `@ar/web` have separate
  configs.
- **`packages/service/scripts/` is read by BOTH package gates**, unlike
  the package-ROOT files `context/gates.md` documents as
  un-targeted: the lint script's pathspec names `scripts` and tsconfig's
  include reaches it. So a scripts-only change has two real greens rather
  than the one a docs change has.
- **The invariant helpers under `tests/invariants/` are drivable from a
  standalone `/tmp` `.mjs` under bun by ABSOLUTE path, `.ts` included** —
  they import only node builtins or each other, so a whole detector runs
  over the real tree AND over planted samples in one command before any
  `.test.ts` exists. Two limits. The trick reaches the HELPERS and never
  a `.test.ts`, whose `./x.js` imports resolve against its own directory,
  so a mutation grid over a new invariant test runs on a copy INSIDE that
  directory (`zz-tmp-<name>.test.ts`) — which joins the suite until it is
  deleted. And a probe importing a PACKAGE DEPENDENCY (`pg`, not a node
  builtin) cannot live in `/tmp` at all: put it at the package ROOT as a
  `zz-tmp-*.mjs`, which BOTH package gates are blind to.
- **A must-find roster entry's discriminating control is an IN-MEMORY
  mutation of the BUILT tree**, needing no source edit, no `pretest` and
  no rebuild: `JSON.parse(JSON.stringify(loadBuiltWorkflows()))`, rewrite
  the target node's `parameters.query`, re-drive the roster. Six legs ran
  in under a second where the grid runner through `pretest` is ~55s, and
  it dodges the restore trap entirely — a workflow-source leg SURVIVES in
  the gitignored `workflows/dist/`, so `git status` printing zero bytes
  after the source is put back is NOT evidence the artifact is back.
  Re-run `bun scripts/build-workflows.ts` and read its stamp line: a sha
  WITHOUT `-dirty` is what says the tree under test is HEAD's again.
- **Two workflows carry a node under the SAME name**
  (`Raise Research Intentions` in both `ar-ingest` and `ar-score`), so
  any roster spanning artifacts must key on the PAIR; a node-name lookup
  silently reads whichever it finds first.
- **NO workflow calls the Express service.** Measured over all six
  sources by node type: five are Postgres, Code, LLM and trigger nodes
  alone, and the single `n8n-nodes-base.httpRequest` in the tree resolves
  a URL expression naming a SOURCE's own endpoint. So nothing in the
  pipeline crosses `lib/express/middleware.ts`, and the auth gate, the
  request validation and the rate-limit window are evidence about the API
  surface and never about a scheduled pass. The pipeline's own bounds are
  SQL.
- **`RESEARCH_POOL_STATUSES` in `src/db/schema/values.ts` is the domain
  of TWO tables**, not one: `research_pool.status` and
  `source_config_proposals.status` each take it through their own
  `checkOneOf`. Adding a member for one widens the other's domain with a
  value that means nothing there, and both CHECK constraints move in the
  same migration. Expect the same shape from any other tuple in that
  module.
- **A `db:generate` touches exactly THREE paths and only ONE is visible
  to `git diff`**: the new `<tag>.sql` and `meta/<idx>_snapshot.json`
  arrive UNTRACKED and `_journal.json` is modified as a pure append. So
  the reading that says no EXISTING migration or snapshot was rewritten
  is a `find drizzle -type f | sort | xargs shasum` diff either side of
  the run. Run it with stdin closed (`bun db:generate < /dev/null`),
  which turns drizzle-kit's add-versus-rename prompt into an error rather
  than a hang. A destructive-statement sweep over the result must be
  statement-LEADING (`^\s*(DROP|UPDATE|DELETE|INSERT|TRUNCATE)\b`): a
  bare `\bDELETE\b` needle fires on drizzle's own
  `ON DELETE no action` and reports a pure ADD COLUMN file as carrying a
  data statement.

### Running a pass against the live stack

- **Whether a sub-workflow runs at all is decided by the PARENT's
  execution mode**, off the 2.15.1 image
  (`dist/workflow-execute-additional-data.js`):
  `useDraftVersion = isManualOrChatExecution(options.executionMode)`. A
  sub-workflow invoked from a MANUAL execution runs off its DRAFT; one
  invoked from any other mode (`trigger`, `integrated`) is loaded by
  `getPublishedWorkflowData`, which throws `Workflow is not active and
  cannot be executed.` when the row carries no `activeVersion`. Two
  consequences bite here. `activate-workflows.sh` publishes only the
  trigger-carrying workflows and reports the rest `manual-only, left
  inactive`, so nothing a SCHEDULED `ar-dispatch` invokes can load --
  and a hand-started pass is NOT evidence about that, being manual is
  exactly what let it reach them. And one level down is already "not
  manual": an `ar-ingest` running as `integrated` cannot reach
  `ar-score` or `ar-research` even when the pass that started it was
  manual. `n8n publish:workflow --id=<id>` fixes it per workflow and
  sets `active=1` with it.
- **An `executeWorkflow` node whose child failed to LOAD reports
  `executionStatus: success`** and hands the error on as an ordinary
  item (`{"json":{"error":"Workflow is not active and cannot be
  executed."}}`), so a green parent execution and a green node list are
  both consistent with the child never having run. The only reading is
  the node's OUTPUT DATA, and `execution_data.data` is `flatted`: an
  array in which a numeric STRING is a reference back into the same
  array. Walk it with a recursive deref, find the runData map (the one
  object whose keys are node names and whose values are all numeric
  strings), and follow the node's `data` ref down 20-odd levels before
  believing anything.
- **A seeded topic and a created export subscription are inserted
  UNSCHEDULED** (`next_run_at = NULL`), and `Claim Due Topics` filters
  `next_run_at <= now()`, which NULL never satisfies -- so a dispatch
  pass against a freshly seeded domain claims nothing. `next_run_at` is
  pipeline-owned and absent from every patch schema; the only doors are
  `POST /topics/:id/run-now` and `POST /exports/:id/run-now`.
- **The seeded example domain cannot produce a finding, whatever the
  model.** `promptFrame` in `src/lib/prompt-frame.ts` adds NO JSON
  contract -- a persona's `system_text` IS the entire system prompt --
  while `data/personas.json`'s researcher opens with the word
  "Placeholder" and asks for prose, and `Validate Finding Fields`
  requires an object matching `domains.settings.fieldContract`. So
  `findings` stays 0 with `finding_refusal` "the answer is not JSON" on
  every document. Rewrite persona 1 through `PATCH /personas/:id` to
  name the contract's members before expecting any pipeline reading
  that depends on a finding; a 3B local model then answers acceptably.
- **A reachability reading for the pipeline must be taken from INSIDE
  the container.** The sandbox's own outbound reach to loopback is PER
  PORT and is not the containers': `curl` to `127.0.0.1:11434`
  succeeded while `127.0.0.1:8909` answered `000` with `lsof` finding
  no listener, and the n8n container reached BOTH through
  `host.docker.internal`. So a host probe that cannot reach a local
  server is not evidence a workflow cannot -- use `docker exec
  <container> wget -qO-`. Related: ollama binds `127.0.0.1` only and is
  still reachable at `host.docker.internal` from a container on Docker
  Desktop for Mac.
