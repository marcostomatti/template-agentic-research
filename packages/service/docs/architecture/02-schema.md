# Schema — the tables and the rules the database holds

Schema v2 is the whole of the pipeline's storage: what a domain is,
what it is looking for, where its raw material comes from, what was
made of that material, and what each pass did. This document is the
map of it — the tables by area, and the rules the database enforces
itself rather than leaving to whoever writes the row.

It is the document the Schema row of the behaviour table in
`docs/architecture/00-overview.md` names, so a change to the shape of
a stored row or to one of the rules below lands here in the same
commit. The design it implements is
`.specs/2026-08-19-research-pipeline-port.md` — §2 for the table
roster, §3 for scheduling — and phase numbers throughout refer to the
7-phase sequencing in that design, §7.

The tables live one file per concern under `src/db/schema/`, and
`src/db/schema.ts` re-exports them: that barrel is what drizzle-kit
reads to generate a migration and what `drizzle({ schema })` resolves
the client's table set from. Reasoning about a single column stays in
TSDoc beside that column. What is here is the shape of the whole, and
the rules that span more than one of them.

## The roster

Twenty-five tables. Each area below is one module, and that module's
header carries the argument for why its tables sit together.

### Domains — `src/db/schema/domains.ts`

| Table | What it holds |
| --- | --- |
| `domains` | One subject being researched, and the settings that make it one: scoring weights, verdict vocabulary, the field contract its findings are validated against, the display alias it may carry. Every other pipeline table hangs off a domain row, which is what makes a second domain a seed rather than a fork. |
| `personas` | The system text a domain gives each role a run plays, one row per (domain, role). A run fetches these at the top of each pass, so no prompt is written into a workflow file. |

### Taxonomy — `src/db/schema/taxonomy.ts`

| Table | What it holds |
| --- | --- |
| `categories` | One named bucket of a domain's taxonomy: a root, or the child of a root, and nothing deeper. |
| `terms` | One pattern a category matches on, its polarity, and what a match is worth. Direction and magnitude are separate columns, so the sign of a weight is never consulted and a typo cannot invert a term. |
| `criteria` | One thing a domain has stated about what it wants, filed under one of its categories. Rendered into prompts and digests rather than matched against a document. |

### Sources — `src/db/schema/sources.ts`

| Table | What it holds |
| --- | --- |
| `sources` | One feed the pipeline is allowed to read: which transport family fronts it, what address to reach, how records are pulled out of the payload, what that payload has to contain, where the last fetch stopped, and its health. Adding a feed is an INSERT; only a new kind of feed needs a module. |
| `source_config_proposals` | One proposed `parser_config` and `contract` for a source, held until a person rules on it. Only the approval writes those two columns onto the source row, and a named CHECK refuses a row that records having been applied while recording no approval — so a model may propose what the pipeline extracts and never decide it. |
| `connectors` | One external service the pipeline calls — a model, a search endpoint, a notebook, an export target. Deployment-level rather than domain-scoped: which instance answers is a fact about where this is running, and a domain names the connector it wants where the choice actually varies. |

### Scheduling — `src/db/schema/scheduling.ts`

| Table | What it holds |
| --- | --- |
| `topics` | One standing subject a domain wants looked into, with the exact terms its search will be issued with, and how often. |
| `export_subscriptions` | One standing delivery a domain wants: what format is rendered, which connector it is handed to, and how often. |

### Corpus — `src/db/schema/documents.ts`

| Table | What it holds |
| --- | --- |
| `documents` | One row per distinct item ingested, stored as it arrived, with the outcome of parsing it and whatever has since been computed over it — features and an embedding, each pinned to the version that produced it. |
| `ingested_files` | The ingest tray's read log: one row per file already picked up, keyed on the hash of its path, so a poll finding the same file still sitting there passes over it. |

### Findings — `src/db/schema/findings.ts`

| Table | What it holds |
| --- | --- |
| `findings` | What a domain made of a document: neutral core columns — which domain, which document, which entity, how it scored, when — plus a `fields` payload governed by that domain's own contract. |
| `finding_sightings` | Where a finding has been seen: one row per finding, source, and the source's own id for the item. |
| `finding_labels` | What an operator made of a finding: one row per judgement, kept rather than replaced, so what changed between two readings stays readable. |

### Entities — `src/db/schema/entities.ts`

| Table | What it holds |
| --- | --- |
| `entities` | The registry of subjects a domain tracks, deduped on a normalized name so one subject spelled three ways lands on one row, with aliases folded onto the row they name. |
| `entity_research` | What one pass found out about a subject: the prose a person reads and the structured payload behind it, one row per pass. |
| `research_pool` | The approval gate: one row per intention to research something, held with the terms it would be searched with until a person rules on it. |

### Runs — `src/db/schema/runs.ts`

| Table | What it holds |
| --- | --- |
| `runs` | One row per pass: when it opened, how it ended, what it counted, what it could not do, and what scheduled it. Its reader is the next pass, which renders the last one's errors into a digest somebody was going to read anyway. |
| `llm_calls` | One row per model call — the ledger a per-run ceiling is counted against, and what makes spend attributable to the pass that made it. |
| `benchmark_cases` | Inputs somebody has judged, frozen with the case, so a change to a domain's scoring can be measured rather than assumed. |
| `briefings` | A domain's periodic digest, kept as a row rather than only rendered and handed on. |

### Auth — `src/db/schema/auth.ts`

| Table | What it holds |
| --- | --- |
| `auth_users` | One operator credential: the login name a request presents, the argon2id hash it is checked against, and the `sub` that session claims carry. No pipeline row points at it, and only the bootstrap upsert writes it — replacing the hash on every boot and leaving `sub` and `created_at` where they were. |
| `auth_sessions` | One issued session token, held as a SHA-256 hash so a reader of the table cannot mint a request from it. Carries its own copy of `sub`, so verifying a token is a single-row read; an expiry that bounds it; and a nullable `revoked_at` that keeps a revoked session distinguishable from a lapsed one. |

### Outside the pipeline — `src/db/schema/users.ts`

| Table | What it holds |
| --- | --- |
| `users` | The starter table this package's service template arrived with. No pipeline row points at it; it stays because `GET /users` is the service's only route that issues a real query against Postgres, and the live user suite round-trips a row through it. |

## The rules the database holds

Each rule below is enforced by the server rather than by the writer,
and each is followed by the limit of that enforcement. A rule stated
without its limit reads as a guarantee it is not, and a reviewer can
disprove the overclaim in two statements.

### An absent measurement is never stored as zero

Numeric columns divide into three classes, and one question decides
which a column joins: is its absent state a real reading?

- **Signal** — nullable, no default. `findings.score` is the
  exemplar: a score is a reading, and nothing has read a finding no
  scorer has reached yet.
- **Counter** — NOT NULL, default 0. `sources.consecutive_failures`
  is the exemplar: zero failures is a count, not the absence of one.
- **Authored magnitude** — NOT NULL, no default. `terms.weight` is
  the exemplar: nothing computes it, so there is no never-computed
  state for a NULL to encode.

Signal and counter take opposite treatments for the same reason
rather than for different ones. A comparison against NULL is UNKNOWN
rather than false, so a threshold query passes over a row whose
column is absent — which is exactly wrong for a counter, whose
never-set rows would neither trip a detector nor turn up among what
it skipped, and exactly right for a signal, where `score >= 0.7`
should neither take nor report a finding nothing has measured.

The cost of choosing wrong is only paid at a measurement column, and
it is paid in silence. A version column defaulted to 0 at least names
a scheme that never existed; a score defaulted to 0 sits inside the
range the column reports, participates in every ordering and every
threshold, and is indistinguishable from a genuinely zero reading.

What nullability buys is room for the truthful answer, and nothing
more: no constraint requires a writer to leave the column NULL rather
than write a 0 into it. `tests/schema/canonical-document.test.ts`
carries the two classes as explicit lists and asserts the nullability
of each entry, which holds a declared column to its class — it does
not discover numeric columns and demand they be classified, so a
column added without an entry is undecided rather than merely
untested.

### `documents.hash` dedupes because it is NOT NULL

One row per distinct item is the hash's doing. Capture is allowed to
be repetitive — the same item reaches two sources, a poll overlaps
the one before it, a file is handed in twice — and deduplicating on
the content itself absorbs all three without any reader having to
know which happened.

NOT NULL and UNIQUE are one mechanism here, not two constraints
sharing a column. NULL is the one value that conflicts with nothing,
another NULL included, so a unique key with a nullable member admits
every row whose member is absent while still reading, in the schema
and in review, as a key. The write that lands a repeat capture is an
insert with `ON CONFLICT DO NOTHING`; against a nullable hash that
clause never fires, the insert proceeds, the statement reports
success, and the corpus grows by a copy per pass with nothing logged.
The first symptom is a count somewhere downstream.

Because the defect appears only among rows whose key member is
absent, the obvious assertion cannot see it: two inserts of one
non-null hash conflict whether or not the column is NOT NULL. The
live suite therefore copies `documents` into a temporary table,
drops the NOT NULL off the copy, and hands the same write to both:
the corpus refuses it, the copy takes it twice — the defect
reproducing next to the constraint holding.

`ingested_files.path_hash` is the other half of the same job rather
than a second copy of it. One stops a file being read twice; the
other stops two reads becoming two rows. Each accepts a limit the
other covers: a file edited in place under one path is never re-read,
and a file copied to a second path is read twice and absorbed by the
content key.

### A schedulable row carries the whole column set

`schedulableColumns()` in `src/db/schema/scheduling.ts` declares five
columns once, and every schedulable table spreads it: `next_run_at`,
`interval_seconds`, `enabled`, `min_interval_seconds`, and
`max_interval_seconds`. `next_run_at` is the single scheduling truth
— every mode of scheduling is a write to it — and the min/max pair is
what clamps a time an agent proposes.

Half the set is worse than none of it. A row with an interval and no
due time repeats on a schedule nothing ever claims, and a table
writing out three of the five reads as schedulable to a person and to
the claim query both, right up to the write that reschedules it after
a run and names a column it has not got. So the contract is over the
columns a table ends up with, not over which helper it called.

`tests/schema/schedulable-contract.test.ts` discovers the schedulable
tables from the barrel by looking for `next_run_at` and holds each to
the rest of the set. `enabled` is deliberately not the tell:
`sources.enabled` is an operator's on/off switch on a table that
holds no due time and is never claimed, and discovering by that
column would drag it into a contract it has no business in. The same
file also pins the roster — `topics` and `export_subscriptions` — so
a table growing a `next_run_at` fails until it is named there. That
edit is the acknowledgement, because another schedulable table is
another row claimed on every tick from then on.

One dispatcher reads these columns. `ar-dispatch` (phase 3) holds the
only schedule trigger in the system, takes the rows that are enabled
and whose `next_run_at` has passed with `FOR UPDATE SKIP LOCKED`, and
runs what it claimed; no table keeps a timetable of its own. Two
partial indexes serve that claim, `topics_dispatch_claim_idx` and
`export_subscriptions_dispatch_claim_idx`, each over
(`enabled`, `next_run_at`) and restricted by a `WHERE` clause to the
rows that are enabled. Both are named for the query they exist for
rather than for the columns they cover.

Three limits belong beside them. Postgres uses a partial index only
where the query's predicate implies the index's, so the same claim
query with `enabled` omitted falls back to a sequential scan with no
error and no warning. The `SKIP LOCKED` guarantee lasts exactly as
long as the transaction holding the lock, so the claim and the write
that moves `next_run_at` forward belong in one transaction — commit
the claim early and the row is unlocked and still due. And a row held
by a transaction that never finishes is passed over with no error, so
skipped and not-yet-due are indistinguishable from outside.

### Nothing is recorded as researched without an approval

`research_pool_approval_check` is the gate, and it is a CHECK on
`research_pool`: `researched_at IS NULL OR approved_at IS NOT NULL`.
A row may record that it was closed only if it already records that
it was approved. The register in `docs/architecture/01-invariants.md`
carries the row; what follows is what the constraint does and does
not reach.

What it refuses is a state rather than a transition, so it bites from
both directions: stamping `researched_at` on a row nobody approved is
rejected, and so is clearing `approved_at` on a row already closed.
Postgres re-evaluates the CHECK against the whole new row on every
update, so the reverse write needs no second constraint.

It is a rule the database holds rather than a branch a workflow takes
because there is no single writer to put a branch in. Intentions are
raised by one workflow and drained by another, approved through a
small CLI (`scripts/approve.ts`) and through the API and the UI after
that, and corrected by an operator at a psql prompt when something has
gone wrong. A branch governs the writes of the one thing it sits in
and leaves every other writer to its own habits — and the writes it
does not cover are exactly the ones nothing was watching.

The other half is reviewability. A guard edited on the executor's
canvas is lost at the next import and reaches no diff on the way.
This constraint is not beyond changing either, but changing it in the
repository is DDL: a migration under `drizzle/`, tracked, read like
any other diff. A `DROP CONSTRAINT` issued by hand at a psql prompt
is as unreviewed as the canvas edit, and nothing here reports it —
what the database buys is not that the rule cannot be removed, only
that the ordinary way of removing it passes through a diff.

Three things it does not reach, worth reading beside it. Both
timestamps NULL is the open state and passes. An approval nothing
ever acts on passes indefinitely, because the constraint knows
nothing about the passage of time. And `status` is not consulted at
all, so a row stamped `done` with neither timestamp set is storable:
the status column and the timestamp pair are two accounts of one row,
and only the pair is enforced.

### Category nesting is capped at one level

A category is a root or the child of a root, and nothing deeper. The
cap is enforced by `categories_enforce_depth()`, a trigger on
`categories` firing `BEFORE INSERT OR UPDATE`, which refuses three
writes: a row whose parent is itself a child, a row given a parent
while it already has children — the same cap broken from the other
end, by an UPDATE rather than an INSERT — and a row whose parent
belongs to a different domain.

Two separate things keep that check out of application code. Depth is
not a property of the row being written: it is a property of that
row's parent and of its own children, so there is nothing for a
column constraint to look at. And, as with the approval gate, there
is no single writer to host it — rows reach this table from the seed
script, from hand-written SQL inside workflow nodes, and from an
operator at a psql prompt.

The rule ships in a hand-written migration under `drizzle/` rather
than being generated from `src/db/schema/taxonomy.ts`, which means it
is real in the database and invisible in the module: the columns
there do not show it. drizzle-kit's snapshot models tables, columns,
constraints and indexes and nothing else, so the generator never
proposes dropping a trigger it cannot see, and `db:generate`
reporting no changes goes on meaning that the schema and the
migrations agree.

Being invisible to the snapshot costs the other direction. The trigger
cannot be reported missing either: nothing in this repository reads
`pg_trigger`, so a database this migration never reached is
indistinguishable from one where the guard stands. A scan over
`drizzle/*.sql` is evidence about the file and about nothing else;
only the depth cases in `tests/live/schema.live.test.ts` watch a
database refuse a write.

Two more limits. A trigger refuses the write whoever makes it, and
that is the whole of what it buys — it does not serialize two
concurrent writers, and nothing here relies on it doing so. And the
domain rule is asked at the child, so it binds every write naming a
parent and nothing else: moving a root that already has children into
another domain is accepted, and strands them across the boundary the
rule otherwise refuses to create.

## Which migration owns which constraint

`drizzle/` holds two mechanisms. All but one of its files were
written by `db:generate`, which diffs `src/db/schema.ts` against the
newest snapshot under `drizzle/meta/` and emits the difference;
`0002_category_depth_guard.sql` was written by hand and is the only
migration here that was.

| Owner | What it carries |
| --- | --- |
| Generated — `0000_talented_proteus.sql`, `0001_lethal_paibok.sql`, `0003_motionless_nova.sql`, `0004_wooden_quentin_quire.sql` | Every table and column, and with them every PRIMARY KEY, NOT NULL and DEFAULT: 25 tables, 173 columns. Every named key and constraint over a stored row: 16 UNIQUE, and 11 CHECK — the nine value-set checks generated from the tuples in `src/db/schema/values.ts`, plus the two spanning two columns, `research_pool_approval_check` and `source_config_proposals_approval_check`. All 34 foreign keys, each emitted as its own `ALTER TABLE` after the last `CREATE TABLE` rather than inline. Both partial dispatch-claim indexes. |
| Hand-written — `0002_category_depth_guard.sql` | `categories_enforce_depth()` and the `BEFORE INSERT OR UPDATE` trigger on `categories` that calls it. Two statements, one rule, and the whole of the custom-owned DDL. |

The snapshot decides that split, not taste. A table's entry in
`drizzle/meta/*_snapshot.json` models its columns, check constraints,
unique constraints, indexes and foreign keys — the first row of the
table above, exactly — and carries no notion of a trigger or of a
function anywhere in it. So a rule of that first kind has to be
declared in a schema module and generated from it. Hand-write one
into a migration instead and the snapshot goes on describing a
database without it, which is a generator whose "no changes" verdict
has stopped meaning anything. The trigger is hand-written safely for
the mirror-image reason, argued above and in the header of
`0002_category_depth_guard.sql`: what the snapshot cannot describe it
cannot diff, cannot propose dropping, and cannot regenerate.

What decides where a new rule goes is therefore whether drizzle can
express it, not whether it looks exotic. Both partial indexes read
like custom work and are not — `index(...).where(...)` is an ordinary
drizzle declaration, so they sit in `src/db/schema/scheduling.ts` and
are generated like everything else. The depth cap goes the other way
for the reason its own section gives: it reads the parent and the
children of the row being written, which no table definition states.

Ownership says nothing about the reading. `readMigrationSql()` in
`tests/invariants/schema-sql.ts` concatenates every `.sql` under
`drizzle/` and its assertions run over the whole text, so thirteen of
them land in the generated migrations and two in the hand-written one
with nothing in the roster recording which. What does follow from the
split is what a match there is worth. A generated statement is one of
two tracked copies of one rule, and the module it came from is the
other; the trigger is written down once, so that file is the only
tracked record of it, and the live suite is the only thing anywhere
that watches a database refuse the write.
