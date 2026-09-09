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
  -d '{"emailOrLdapLoginId":"operator","password":"yourpassword"}' \
  -c cookies.txt
```

This stores the session cookie. Extract the bearer token from the response
or from the session (the token is a JWT in the `token` field of the login
response if returned). For curl, using the cookie file is simpler:

```bash
COOKIES="-b cookies.txt"
```

### Create a source

Post a new source row for the example domain:

```bash
curl -X POST http://localhost:3000/domains/example/sources \
  $COOKIES \
  -H "Content-Type: application/json" \
  -d '{
    "id": "example-source",
    "kind": "listing-api",
    "name": "Example News Feed",
    "parser_config": {
      "endpoints": [
        "https://newsapi.org/v2/everything?q=AI&sortBy=publishedAt&pageSize=10"
      ],
      "field_map": {
        "title": "title",
        "body": "description",
        "source": "source.name",
        "date": "publishedAt"
      },
      "start_date": "2024-01-01"
    }
  }'
```

The response should be a 201 with the created source. The `id` must be
unique within the domain. The `kind` must match an adapter this service
knows about (`listing-api` or `push`).

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
  $COOKIES \
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
curl -X POST http://localhost:3000/domains/example/exports \
  $COOKIES \
  -H "Content-Type: application/json" \
  -d '{
    "connector_id": <CONNECTOR_ID>,
    "format": "obsidian_md"
  }'
```

Replace `<CONNECTOR_ID>` with the id from Part 4. The response includes
the subscription id. The subscription is now active.

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
  $COOKIES
```

Look for a recent row with `status: "completed"` and `cost` > 0 (indicating
model calls were made). The `started_at` timestamp should be near the time
the dispatch triggered.

Record the run id for later checks.

### Check documents ingested

The `documents` table holds items ingested from sources. If `ar-ingest`
ran, documents should be present:

```bash
curl "http://localhost:3000/domains/example/documents" \
  $COOKIES
```

You should see at least one document with a `body`, a `source`, and a
`parsed_at` timestamp. If the response is an empty array or a 404, no
source was active or ingest did not reach that source.

### Check findings scored

The `findings` table holds scored documents. If ingest and scoring ran:

```bash
curl "http://localhost:3000/domains/example/findings" \
  $COOKIES
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
curl "http://localhost:3000/domains/example/briefings" \
  $COOKIES
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
- At least one topic exists: `curl $COOKIES http://localhost:3000/domains/example/topics`
- That topic has `enabled: true` and a past `next_run_at`

If topics are missing or all are disabled, seed them or enable one
manually:

```bash
curl -X PATCH http://localhost:3000/topics/<ID> \
  $COOKIES \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

### Ingest does not run or claims nothing

Check that:
- A source exists: `curl $COOKIES http://localhost:3000/domains/example/sources`
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

Cookies expire. Regenerate a token with the login endpoint (Part 3) and
update the `$COOKIES` variable:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrLdapLoginId":"operator","password":"yourpassword"}' \
  -c cookies.txt

COOKIES="-b cookies.txt"
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
2. ✅ **Workflows are active** — `docker exec ar-n8n n8n list:workflows`
   shows all six with `active: true`
3. ✅ **Dispatch runs** — A run record exists with `status: "completed"`
4. ✅ **Ingest ingests** — At least one document exists in the example
   domain
5. ✅ **Scoring scores** — At least one finding exists with a non-null
   `score`
6. ✅ **Digest assembles** — A briefing exists for the domain
7. ✅ **Export exports** — A markdown file exists in the export
   destination

If all seven are true, CHECKPOINT 2 has passed. The local pipeline is
running end-to-end against the example domain.
