# CHECKPOINT 2: Local Pipeline End-to-End

CHECKPOINT 2 verifies the n8n local stack with all six workflows running
against the example domain. This runbook takes you from a cold checkout
to a passing pass, checking each piece along the way.

## Prerequisites

1. **Environment**: Copy `.env.example` to `.env` in the package root.
2. **Model settings**: Set `AR_LLM_ENDPOINT`, `AR_LLM_MODEL` (optional),
   and `AR_LLM_API_KEY` in `.env`. These tell the workflows where to reach
   a model server and how to authenticate. The model server must be
   reachable from the n8n container — if it runs on the host, use
   `host.docker.internal` as the endpoint (on Linux, docker-compose
   already maps this via `extra_hosts`).
3. **Working tree**: No uncommitted changes; `git status` is clean.
4. **Docker**: Running and able to start containers.

## Part 1: Bootstrap the Local Stack

The `bootstrap.sh` script brings up both Postgres and n8n, applies
migrations, builds and imports the workflows, creates the LLM connector
row, activates all workflows with a Schedule Trigger, and restarts n8n
so triggers register.

### Run bootstrap

```bash
cd packages/service
scripts/bootstrap.sh
```

The script will output progress for each step. Look for:
- Both containers (`postgres` and `ar-n8n`) reported healthy
- Migrations applied (or "already up to date" on rerun)
- Workflows built and imported with ids preserved
- LLM connector reported as created or found
- Workflows activated (one line per workflow with its id)
- n8n restart completing with triggers registering

Exit code 0 means success. Exit 1 stops at the first failure and reports
which step failed. A second run is safe — it will skip completed steps
and catch up on any that failed the first time.

### Verify the stack is up

```bash
docker compose --profile n8n ps
```

Two containers should be healthy:
- `service-postgres-1` (port 5432, internal)
- `ar-n8n` (port 5678, loopback only)

If either shows `Exited`, `bootstrap.sh` or something else stopped it.
Restart with `docker compose --profile n8n up -d --wait`.

### Check n8n in the browser

Visit `http://localhost:5678` and log in. The default owner is created on
first visit. Click through and dismiss the personalization survey if
prompted.

## Part 2: Seed the Example Domain

The example domain and its taxonomy are loaded once into the database when
the service boots. CHECKPOINT 2 uses the domain named `example`, which the
seed creates if it does not exist.

If the stack was up from a previous run and the example domain is already
seeded, you can skip this step. Otherwise:

```bash
cd packages/service
bun run db:seed
```

Watch for the seed to report:
- `example` domain created (or "unchanged")
- All five taxonomy concerns applied (categories, terms, personas, topics)

## Part 3: Create a Sources Row

The workflow `ar-ingest` starts by reading active sources from the
database. Without a sources row, it claims nothing and ingest cannot
begin. Create one through the HTTP API with auth enabled.

### Check auth settings

Auth is controlled by `AUTH_BASIC_USER` and `AUTH_BASIC_PASSWORD` in
`.env`. If these are set, every endpoint requires a bearer token
(obtained via login). If unset, auth is a passthrough and endpoints are
open.

For this checkpoint, set basic auth credentials in `.env`:

```bash
AUTH_BASIC_USER=operator
AUTH_BASIC_PASSWORD=yourpassword
```

Then restart the service (or let it restart on its own if configured to
watch):

```bash
cd packages/service
bun run dev
```

The service boots with auth enabled. You should see `auth` dependency
starting in the logs.

### Obtain an auth token

Create a session by logging in:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"user":"operator","password":"yourpassword"}'
```

This service issues a BEARER TOKEN, not a cookie: a `200` answers
`{ token, sub, expiresAt }`, and every later call carries the token in an
`Authorization` header. (The `emailOrLdapLoginId`-plus-cookie shape is
n8n's login, not this one.) Hold it in a variable the rest of this file
uses:

```bash
TOKEN=<the token from the response>
```

### Create a source

Post a new source row for the example domain:

```bash
curl -X POST http://localhost:3000/domains/example-tech-radar/sources \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "api",
    "endpoint": "https://newsapi.org/v2/everything?q=AI&pageSize=10",
    "parserConfig": {
      "fieldMap": {
        "title": "title",
        "body": "description",
        "date": "publishedAt"
      }
    }
  }'
```

The seeded domain's slug is `example-tech-radar`, not `example`.

`createSourceSchema` in `src/sources/service.ts` is `.strict()`, so read
the members off it rather than off this file: `kind`, `endpoint`,
`parserConfig`, `contract`, `enabled`, and nothing else — a `name`, an
`id` or a snake_cased `parser_config` is a 400. `kind` is one of
`SOURCE_KINDS` (`url`, `api`, `rss`, `push`); the id is assigned by the
service and comes back in the response.

Record the source id — you'll reference it when setting up the export
below.

## Part 4: Create an Export Target Connector

The workflow `ar-digest` ends by rendering and storing a briefing. Without
an export target connector, nothing happens with that briefing. Create one.

Connectors are global (not per-domain), but their configuration is
deployment-specific. The `kind` distinguishes what each connector does. For
this checkpoint, create one for Markdown export.

```bash
curl -X POST http://localhost:3000/connectors \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "export_target",
    "name": "Local Markdown Export",
    "config": {
      "format": "obsidian_md",
      "destination": "/tmp/exports"
    }
  }'
```

The response includes the created connector's id. Record it — you'll use it
when creating the export subscription.

Note: The `config` field is free-form JSON. The export renderers in
`src/exports/` read whatever they need; for Markdown, at minimum a
`format` and a `destination` path.

## Part 5: Create an Export Subscription

A subscription ties a domain, an export format, and a connector together.
When a briefing is generated for that domain, the subscription's renderer
produces an artifact and the connector receives it.

```bash
curl -X POST http://localhost:3000/domains/example-tech-radar/exports \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "obsidian_md",
    "connectorId": <CONNECTOR_ID>,
    "intervalSeconds": 86400
  }'
```

Replace `<CONNECTOR_ID>` with the id from Part 4. `createSubscriptionSchema`
in `src/subscriptions/service.ts` is `.strict()` and REQUIRES all three of
`format`, `connectorId` and `intervalSeconds` — a snake_cased
`connector_id` is a 400, and so is omitting the interval. `format` is one
of `EXPORT_FORMATS` (`obsidian_md`, `notion_md`, `rss`, `pdf`,
`email_draft`).

The response includes the subscription id. Note it is created UNSCHEDULED
(`next_run_at = NULL`) and `Claim Due Topics` filters `next_run_at <=
now()`, which NULL never satisfies — so a dispatch pass claims nothing
until `POST /exports/:id/run-now` (and `POST /topics/:id/run-now` for the
topic half) brings it forward. That column is pipeline-owned and appears in
no patch schema; those two routes are the only doors.

## Part 6: Run an On-Demand Dispatch

The `ar-dispatch` workflow runs on a schedule (every hour by default). To
test the pipeline end-to-end without waiting, trigger a dispatch manually.

There are two approaches:

### Option A: Use the n8n REST API (if you have an n8n API key)

The public API offers no execution-starting endpoint. Instead, use the
internal editor API, available only over loopback inside the n8n
container:

```bash
docker exec ar-n8n curl -X POST http://localhost:5678/rest/workflows/ar-dispatch/run \
  -H "Content-Type: application/json" \
  -d '{"triggerToStartFrom":{"name":"Manual Trigger"}}'
```

This invokes the dispatch workflow manually. The name `Manual Trigger` is
ignored by the n8n internal API — it accepts any string. The response is
a 200 with the execution id if successful.

A manual pass is not the same test as a scheduled one, and the difference
is not cosmetic. On this n8n version a sub-workflow invoked from a MANUAL
execution runs off its DRAFT, while one invoked from any other mode
(`trigger`, `integrated`) is loaded from its PUBLISHED version and throws
`Workflow is not active and cannot be executed.` when the row carries no
`activeVersion`. `scripts/activate-workflows.sh` publishes only the
trigger-carrying workflows and reports the rest `manual-only, left
inactive` — so Option A can succeed while Option B's identical pass cannot
reach its children at all. Worse, an `executeWorkflow` node whose child
failed to LOAD still reports `executionStatus: success` and hands the error
on as an ordinary item, so both the parent execution and the node list read
green. `docker exec ar-n8n n8n publish:workflow --id=<id>` publishes one,
and `context/local-stack.md` carries the mechanism.

### Option B: Wait for the schedule

By default, `ar-dispatch` is scheduled to run at the top of every hour
(cron `0 * * * *`). The first pass fires at the next hour boundary after
the n8n container starts. If you restarted during bootstrap, wait up to
60 minutes for the first pass; subsequent passes are hourly.

You can check how long to wait by looking at the n8n container's local
time:

```bash
docker exec ar-n8n date
```

If it shows 14:35, the next dispatch runs at 15:00 (25 minutes).

## Part 7: Verify the Pass Executed

Once the dispatch runs, five tables record what happened: `runs`,
`documents`, `findings`, `briefings` (for digest output), and `execution`
records (in n8n). Check each to confirm the pass completed.

### Check the run record

The `runs` table tracks each execution of the pipeline. Query it:

```bash
curl http://localhost:3000/runs \
  -H "Authorization: Bearer $TOKEN"
```

Look for a recent row with `status: "completed"` and `cost` > 0 (indicating
model calls were made). The `started_at` timestamp should be near the time
the dispatch triggered.

Record the run id for later checks.

### Check documents ingested

The `documents` table holds items ingested from sources. If `ar-ingest`
ran, documents should be present:

```bash
curl "http://localhost:3000/domains/example-tech-radar/documents" \
  -H "Authorization: Bearer $TOKEN"
```

You should see at least one document with a `body`, a `source`, and a
`parsed_at` timestamp. If the response is an empty array or a 404, no
source was active or ingest did not reach that source.

### Check findings scored

The `findings` table holds scored documents. If ingest and scoring ran:

```bash
curl "http://localhost:3000/domains/example-tech-radar/findings" \
  -H "Authorization: Bearer $TOKEN"
```

Each finding should have a `topic_id` (linking it to a topic), a `score`
(from the scoring model), and a `content` object with fields from the
document.

If findings are empty but documents exist, scoring may have run but found
nothing worth storing, or the model did not execute.

### Check the briefing

The `briefings` table holds digests. If digest ran after documents and
findings were present:

```bash
curl "http://localhost:3000/domains/example-tech-radar/briefings" \
  -H "Authorization: Bearer $TOKEN"
```

A recent briefing should exist with an `assembled_at` timestamp matching
the run's end time. The `body` field contains the assembled markdown.

### Check the export artifact

If an export subscription exists and digest ran, an artifact should be
written to the destination path in the connector config (set in Part 4 to
`/tmp/exports` by default).

List files in the destination:

```bash
ls -la /tmp/exports
```

You should see a markdown file with a name like
`example-briefing-TIMESTAMP.md`. Read it:

```bash
cat /tmp/exports/example-briefing-*.md | head -50
```

The file should contain a briefing assembled from the findings — headings,
sections by category, counts, and excerpts.

### Check n8n execution logs (optional)

Open `http://localhost:5678`, find the `ar-dispatch` workflow, and click
**Executions**. The most recent execution should show:

- Status: **Succeeded** (green)
- Mode: **trigger** (manual) or **trigger** (scheduled) depending on how
  you started it
- Time: Matching when you ran it (in Part 6)

Click the execution to open its graph and see which nodes ran. Each
workflow that was invoked (ingest, score, research, digest) should have
its own entry in the execution list.

## Troubleshooting

### Dispatch does not claim any topics

The `Select Active Topics` node queries `WHERE enabled = true AND
next_run_at <= now()`. Check that:
- At least one topic exists:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/domains/example-tech-radar/topics
```

- That topic has `enabled: true` AND a past `next_run_at`

A SEEDED topic has neither guaranteed. It is inserted UNSCHEDULED
(`next_run_at = NULL`), and NULL never satisfies `next_run_at <= now()`,
so a freshly seeded domain claims nothing however many topics it has.
`next_run_at` is pipeline-owned and is in NO patch schema, so a `PATCH`
cannot set it — the only door is the run-now route, which moves the column
to the clock's instant:

```bash
curl -X POST http://localhost:3000/topics/<ID>/run-now \
  -H "Authorization: Bearer $TOKEN"
```

If a topic is merely disabled, enable it first:

```bash
curl -X PATCH http://localhost:3000/topics/<ID> \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

### Ingest does not run or claims nothing

Check that:
- A source exists:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/domains/example-tech-radar/sources
```

- That source has `enabled: true` and is not flagged for failure
- The source's endpoint is reachable (test it with `curl` from the n8n
  container: `docker exec ar-n8n curl <endpoint>`)

If the endpoint is unreachable from inside the container, the model server
address or API key may be wrong. Re-check `.env` and restart the service
or the n8n container.

### No findings generated

If documents exist but findings don't:
- The scoring model may have failed. Check the n8n execution log for
  errors in the `ar-score` workflow step.
- The model may have been unreachable. Verify `AR_LLM_ENDPOINT` and
  `AR_LLM_API_KEY` are correct in `.env` and reachable from the n8n
  container.

### Auth token expired or invalid

A session expires at the `expiresAt` the login answered. Mint a new one
with the login endpoint (Part 3) and re-read `$TOKEN` from the response:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"user":"operator","password":"yourpassword"}'
```

### Service or container crashed

Check logs:

```bash
# Service logs
cd packages/service
bun run dev &  # or check output from existing process

# n8n logs
docker logs ar-n8n

# Postgres logs
docker logs service-postgres-1
```

If the n8n container exited, restart it:

```bash
docker compose --profile n8n up -d ar-n8n
```

If Postgres is down, restart both services:

```bash
docker compose --profile n8n up -d --wait
```

## Cleanup

To stop the local stack without losing state:

```bash
scripts/panic.sh
```

This disarms all workflows and stops both containers. Data persists in
named volumes. To bring them back up, run `bootstrap.sh` again.

To destroy everything and start fresh:

```bash
docker compose --profile n8n down -v
```

This removes containers and named volumes. The next `bootstrap.sh` will
create a fresh stack from migrations.

## Success Criteria

CHECKPOINT 2 passes when all of the following are true:

1. ✅ **Bootstrap completes** — `scripts/bootstrap.sh` exits 0
2. ✅ **Workflows are active** — the verb is `list:workflow` (singular);
   `list:workflows` does not exist. It prints no active flag either, so
   read `active` and `activeVersionId` out of the instance's own database
   rather than from that command's output
3. ✅ **Dispatch runs** — A run record exists with `status: "completed"`
4. ✅ **Ingest ingests** — At least one document exists in the example
   domain
5. ✅ **Scoring scores** — At least one finding exists with a non-null
   `score`. NOTE: the seeded example domain cannot reach this as shipped,
   whatever the model. `promptFrame` adds no JSON contract — a persona's
   `system_text` IS the whole system prompt — while `data/personas.json`'s
   researcher opens with the word "Placeholder" and asks for prose, and
   `Validate Finding Fields` requires an object matching
   `domains.settings.fieldContract`. `findings` therefore stays 0 with
   `finding_refusal` "the answer is not JSON" on every document. Rewrite
   persona 1 through `PATCH /personas/:id` to name the contract's members
   first; a 3B local model then answers acceptably
6. ✅ **Digest assembles** — A briefing exists for the domain
7. ✅ **Export exports** — A markdown file exists in the export
   destination

If all seven are true, CHECKPOINT 2 has passed. The local pipeline is
running end-to-end against the example domain.
