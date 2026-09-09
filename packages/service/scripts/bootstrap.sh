#!/usr/bin/env bash
# The one command that takes a cold checkout to an n8n holding this
# port's six workflows, armed and registered. Everything it runs
# already existed as a step somebody could type; what did not exist
# is the ORDER, and the order is the part that is easy to get wrong
# in ways nothing reports — an activation before an import arms the
# previous build, an import after an activation silently unarms
# what it lands on, and a publish with no restart behind it sets an
# active version that no trigger is registered for.
#
# The sequence, and why each step sits where it does:
#
#   1. both compose services up and healthy, because everything
#      after this either dials the database from the host or enters
#      the container
#   2. migrations, because the connector row in step 6 needs the
#      table and every workflow node needs the schema
#   3. build, so the import in step 5 puts the CURRENT tree on the
#      instance rather than whatever was last built
#   4. credentials, before the workflows rather than after them,
#      since a workflow imported against a missing credential id
#      binds to nothing and n8n says so at run time rather than at
#      import time
#   5. workflows, at the ids their own files declare
#   6. the `llm` connector row, which no seed file carries and
#      without which every model node reads a null endpoint
#   7. activation, which must follow the import every time because
#      the import unarms what it lands on
#   8. a restart, which is what actually registers the triggers
#
# STEP 8 IS THE REASON THIS COMMAND EXISTS rather than being a note
# in a README telling an operator to run the other three in order.
# Publishing sets the active version and registers nothing:
# measured, an instance with both armable workflows published and
# `active=1` had ZERO `Activated workflow` lines in its log, and
# `publish:workflow` closes by asking for a restart precisely
# because of that. `activate-workflows.sh` deliberately does not
# take one — it is handed a container it did not start and it is
# not that command's to bounce — so until this file landed the last
# step of the local path was an instruction printed once per
# workflow and carried out by hand.
#
# The verdict at the end is a READ-BACK and not the restart's exit
# code, which is the rule `progress.txt` records for wrapping any
# external command here: assert on the work. The instance is asked
# which workflows it holds as active, and each of those has to
# print an `Activated workflow` line AFTER the restart. Counted per
# id rather than found by grep over the whole log, which is the
# trap that reading names: the log survives a restart, so a search
# for the line matches the PREVIOUS boot's copy and answers
# instantly and wrongly. A count that has to increase cannot.
#
# IDEMPOTENT MEANS A SECOND RUN CONVERGES ON THE SAME STATE AND
# EXITS 0, and it does not mean every step is a no-op. Three of
# them are deliberate re-runs and a reader who expects otherwise
# will read the right behaviour as a broken guard, so each argues
# its own case where it stands. In summary: steps 1, 2 and 6 do
# nothing on a second run; step 3 rewrites a build directory that
# is not the instance's state at all; and steps 4, 5, 7 and 8 run
# in full every time because that is what keeps the instance
# holding the current build — an import rewrites and unarms, so an
# activation and a restart behind it are not optional the second
# time either.
#
# WHAT IT DOES NOT DO. It does not seed (`bun run db:seed` is the
# operator's, and the worked example is a decision rather than a
# prerequisite), it does not create the `sources` row or the
# `export_target` connector a full pass needs — those are the
# checkpoint runbook's, over the HTTP API with auth on — and it
# does not stop anything. Stopping is `scripts/panic.sh`.
#
# It also opens no socket to the database or the model server on
# their behalf. That the `ar-postgres` credential reaches Postgres
# and that `AR_LLM_ENDPOINT` reaches a model is a first pass's
# reading: a workflow whose credential names a host it cannot
# resolve imports, activates, publishes and registers exactly as
# cleanly as one that can.

# `-e` so a failing step stops the run rather than letting the one
# after it work on whatever the failure left behind, `-u` so a
# misspelled variable is a refusal rather than an empty string, and
# `-o pipefail` so a failure at the head of a pipeline is not
# answered for by whatever it was piped into.
#
# `-e` is doing more here than in the scripts this one calls. Every
# step below is a precondition of the one after it, and there is no
# step whose failure leaves a sensible thing to try next: an import
# onto an instance whose migrations did not apply, or an activation
# over an import that did not land, is a worse state than stopping.
# Stopping is also cheap, because a rerun repeats the whole
# sequence and the steps already done are the no-ops and re-runs
# argued above.
set -euo pipefail

# This package's own root, resolved from this file's location
# rather than from the working directory, so the command answers
# the same from wherever an operator runs it. Every path below is
# written against it: `docker compose` finds `docker-compose.yml`
# here, `bun run` finds `package.json` here, and the three sibling
# scripts are named relative to it. `activate-workflows.sh` argues
# the same line, including why `$0` rather than `${BASH_SOURCE[0]}`
# is enough for a file nothing sources.
cd "$(dirname "$0")/.."

# The n8n container the last step bounces, defaulting to the name
# `docker-compose.yml` fixes for the service behind `--profile n8n`.
# Read with a default rather than bare because `-u` aborts on an
# unset name, and unset is the ordinary case.
#
# The three scripts this one calls spell the same default and read
# the same variable out of their own environment, so a name set in
# the launching shell reaches all four and one set nowhere leaves
# all four on `ar-n8n`. There is nothing to export here.
#
# A name pointing OUTSIDE this compose project is the one shape
# this command is not for: step 1 would start the project's own
# instance and every step after it would work on somebody else's.
# That case is what the three scripts are individually for, and
# each of them takes the same variable.
AR_N8N_CONTAINER="${AR_N8N_CONTAINER:-ar-n8n}"

# How long the restart step waits, in seconds, for the container to
# come back healthy and then for the triggers to register. Both are
# generous against what was measured — a cold `up -d --wait` on
# this image reported healthy in 6.5 s, and the registration lines
# landed within 2 s and 4 s of a restart on two separate readings —
# because the cost of a ceiling that is too high is a slow refusal
# on a broken instance, while the cost of one that is too low is a
# refusal on a working one, which is the failure that wastes an
# afternoon.
#
# Named rather than written into the loops, so the two waits are
# one edit and a reader can see what the command will do in the
# worst case without reading a loop condition.
AR_HEALTH_WAIT_SECONDS=180
AR_REGISTRATION_WAIT_SECONDS=90

# ---------------------------------------------------------------
# 1. The stack
# ---------------------------------------------------------------
#
# Both services named explicitly, where `bun run n8n:start` names
# only `n8n`. Measured, naming `n8n` alone brings `postgres` along
# and waits for it healthy, because the n8n service declares a
# `depends_on` with `condition: service_healthy` on it — so the
# extra name buys nothing at runtime today. What it buys is that
# this command's promise does not rest on an edge in another file
# that could be removed for an unrelated reason. Step 2 dials that
# database from the HOST, which no `depends_on` says anything
# about.
#
# `--wait` rather than a bare `-d`, and that is the difference
# between started and usable: measured, the last line of this
# command is `Container ar-n8n Healthy`, and this service's
# healthcheck polls `/healthz/readiness`, which answers 503 until
# n8n's own database connection is up, ITS migrations are applied
# and the server has marked itself ready — nothing to do with step
# 2's, which are this package's and run against Postgres. A `-d`
# alone would hand the CLI verbs in steps 4 and 5 an instance with
# nowhere to write.
#
# IDEMPOTENT because compose reconciles rather than creates:
# containers already running with the config the file describes are
# left alone and reported `Running`, and `--wait` re-reads their
# health rather than restarting them. The one case where a second
# run is not a no-op is a compose file that CHANGED since the
# first, which recreates the container — and the named volume is
# what makes that survivable, since the generated encryption key
# and every imported row live in it rather than in the container's
# own layer.
echo "==> [1/8] bringing the stack up"
docker compose --profile n8n up -d --wait postgres n8n

# ---------------------------------------------------------------
# 2. The schema
# ---------------------------------------------------------------
#
# drizzle's own migrator, through the package script, so this
# command applies migrations the same way an operator does rather
# than being a second engine — the rule `scripts/README.md` states
# for this directory. It reads `DATABASE_URL` and falls back to the
# dev URL the compose service above serves, which is why nothing
# has to be set for the default path to work.
#
# IDEMPOTENT because the migrator keeps its own applied-migration
# table: a second run finds nothing pending and applies nothing.
# This is a re-run that does no work rather than a step that is
# skipped, and the distinction matters for reading the output —
# there is no line saying "already migrated", only an absence of
# lines saying anything was applied.
echo "==> [2/8] applying migrations"
bun run db:migrate

# ---------------------------------------------------------------
# 3. The build
# ---------------------------------------------------------------
#
# In front of the import rather than left to the operator, because
# the failure it prevents is the quiet one: an import reads
# `workflows/dist/`, and a tree built before the last edit imports
# cleanly, activates cleanly and runs the previous version of every
# spliced library. Building here costs seconds and removes the
# question.
#
# IDEMPOTENT in the sense that matters — it is a pure function of
# `workflows/src/` and `src/lib/` — but it is a REWRITE rather than
# a no-op, and it is not byte-stable across commits: the build
# stamps the HEAD sha into each artifact, so a rerun on a moved
# HEAD writes different bytes for the same sources. That is
# correct rather than a fault, and it is why the import behind this
# always has something new to store on a rebuilt tree.
echo "==> [3/8] building the workflows"
bun run build:workflows

# ---------------------------------------------------------------
# 4. The credentials
# ---------------------------------------------------------------
#
# Before the workflows, because a workflow node binds a credential
# BY ID and n8n does not check at import time that the id resolves:
# importing the artifacts first would land 43 bound nodes on an
# instance holding neither credential, and every one of them would
# report the missing binding at run time instead. Landing the
# credentials first makes that window nonexistent rather than
# short.
#
# The refusal for a setting nothing was set for is that script's
# and reaches a terminal unchanged. Under `-e` it ends this run,
# which is the right place to stop: the two settings it names
# (`DATABASE_URL` and `AR_LLM_API_KEY`) are what every later step
# is for, and there is nothing useful to do without them.
#
# IDEMPOTENT as an upsert on the two declared ids: two rows before,
# two rows after, no duplicate at a generated id. What a second run
# is NOT is a no-op, and the report says so — it prints `rewritten`
# rather than `created` for each row, because n8n re-encrypts the
# stored data with a fresh salt on every import and that changed
# ciphertext is the only witness on this version that the import
# applied at all. A reader who expects a guard to skip the write
# will misread that line; there is no guard, and the rewrite is the
# measurement.
echo "==> [4/8] importing the credentials"
scripts/import-credentials.sh

# ---------------------------------------------------------------
# 5. The workflows
# ---------------------------------------------------------------
#
# IDEMPOTENT as an upsert on each artifact's declared id, which is
# the property the whole port rests on: `ar-dispatch` reaches its
# four callees through Execute Workflow nodes baked to ids, so an
# import that minted new ones would leave a set of workflows that
# imported and activated cleanly and could not call each other. The
# row count does not move on a second run.
#
# Two things a second run DOES change, both by design and both
# reported by that script. It remints every `versionId`, which is
# the only witness that the import applied — measured, `updatedAt`
# does not move on a re-import — and it UNARMS what it lands on,
# clearing `active` and `activeVersionId`. That second one is the
# whole reason steps 7 and 8 are unconditional: an instance
# bootstrapped twice would otherwise be holding the current build
# and running none of it.
echo "==> [5/8] importing the workflows"
scripts/import-workflows.sh

# ---------------------------------------------------------------
# 6. The model connector
# ---------------------------------------------------------------
#
# The one `connectors` row of kind `llm` a pass reads its endpoint
# and model off. It has no seed file and wants none — `connectors`
# is deployment-level rather than domain-scoped and an endpoint is
# a per-machine address — so without this step a fully seeded,
# fully imported, fully armed deployment reaches every model node
# with a null endpoint.
#
# After the migrations for the table and after the imports for no
# reason of its own: it touches Postgres and never the container,
# so it commutes with steps 4 and 5. It is here rather than second
# because the settings it needs are the ones an operator is most
# likely not to have set yet, and a refusal at this point leaves an
# instance imported but UNARMED — nothing registered, nothing
# scheduled, nothing spending — which is the safe half of a partial
# bootstrap to be left in. A rerun once the setting is supplied
# picks up from a state every earlier step treats as ordinary.
#
# IDEMPOTENT on the KIND rather than on the name, because that is
# what the pipeline selects on: `Select Model Connector` reads
# `WHERE kind = 'llm' ORDER BY c.id LIMIT 1`, so any `llm` row
# stops the write and a second run reports the row it found. One
# keyed on the name would write a second row, younger than the
# first and never read by anything. Measured, that also means the
# existing row WINS over a differently-configured environment: this
# step will not move a deployment to a new endpoint, which is an
# edit of the row rather than a rerun of this command.
echo "==> [6/8] ensuring the llm connector"
bun run llm:connector

# ---------------------------------------------------------------
# 7. The activation
# ---------------------------------------------------------------
#
# IDEMPOTENT, and the least no-op step here. It runs in full on
# every bootstrap because step 5 unarmed everything it touched, so
# there is nothing left over from a previous run to skip. Its
# history seeding is an upsert on the version key and reports
# `already current` on the ordinary path; its publish loop runs
# once per armed workflow every time, which is a re-run by design
# and not a guard that failed to fire.
#
# Which workflows it arms is read off the built tree rather than
# listed anywhere: a workflow with no trigger an activation would
# register is reported and left inactive, which is the correct
# outcome for the four this port drives through Execute Workflow
# nodes.
echo "==> [7/8] activating"
scripts/activate-workflows.sh

# ---------------------------------------------------------------
# 8. The restart, and the read-back that rules on it
# ---------------------------------------------------------------
#
# What the instance holds as ACTIVE, asked of the instance rather
# than derived a second time from the built tree. Those are the
# workflows a restart owes a registration line for, and taking the
# list from the database rather than from `activatableTriggers`
# means a workflow armed by something other than step 7 — a stray
# from an earlier deployment, say — is covered by the verdict too.
#
# `{ readOnly: true }` on the open, which matters more than it
# looks: `node:sqlite` CREATES a database at a path holding none,
# so a read-write open against a moved file would leave an empty
# database behind and fail a statement later on a table that was
# never there. The `statSync` guard in front of it is what turns
# that into a message. The path is n8n's own default and
# `docker-compose.yml` sets none of the three settings that move
# it, which is written up at that file and at
# `activate-workflows.sh`'s seeding step.
#
# `node --no-warnings` because `node:sqlite` announces itself as
# experimental on every run, and the busy timeout because the
# running n8n holds the same database open.
echo "==> [8/8] restarting $AR_N8N_CONTAINER so the triggers register"
AR_ACTIVE="$(docker exec -i "$AR_N8N_CONTAINER" node --no-warnings <<'NODE'
const { statSync } = require('node:fs');
const { DatabaseSync } = require('node:sqlite');

const file = '/home/node/.n8n/database.sqlite';
if (statSync(file, { throwIfNoEntry: false }) === undefined) {
  console.error('bootstrap: no n8n database at ' + file);
  console.error('           an instance that moved it needs this step edited');
  process.exit(1);
}

const db = new DatabaseSync(file, { readOnly: true });
db.exec('PRAGMA busy_timeout = 8000;');
for (const row of db
  .prepare('SELECT id, name FROM workflow_entity WHERE active = 1 ORDER BY id')
  .all()) {
  console.log(row.id + ' ' + row.name);
}
db.close();
NODE
)"

# Split the read. A herestring rather than a pipe, so the loops run
# in this shell and the arrays they fill survive them; the
# empty-line skip is for the one line a herestring makes out of an
# empty read. `read -r id name` puts the display name last on
# purpose — it is the field that can carry a space, and the last
# name in a `read` absorbs the rest of the line.
#
# Two parallel arrays rather than one map, because the bash macOS
# ships is 3.2 and has no associative arrays.
AR_IDS=()
AR_NAMES=()
while read -r id name; do
  [ -n "${id:-}" ] || continue
  AR_IDS+=("$id")
  AR_NAMES+=("$name")
done <<<"$AR_ACTIVE"

# Refuse rather than restart into a verdict with nothing to rule
# on, and before either array is expanded anywhere: measured on
# bash 3.2, a count of an empty array is 0 while a quoted expansion
# of one under `-u` aborts the run as an unbound variable.
#
# Reaching here means step 7 reported a publish for every workflow
# it armed and the instance holds none of them active, which is a
# state no reading in this file explains — so it is a refusal
# rather than a skipped restart.
[ "${#AR_IDS[@]}" -gt 0 ] || {
  echo "bootstrap: the instance holds no active workflow after an activation" >&2
  echo "           nothing would register, so the restart was not taken" >&2
  exit 1
}

# How many times each of those ids has ALREADY been registered, over
# the whole log. The restart below has to make every one of these
# numbers grow.
#
# A count that must increase, rather than a search for the line,
# and this is the one reading in the file that is easy to get
# wrong. Docker keeps a container's log across a restart, so a grep
# for `Activated workflow` matches the previous boot's copy and
# answers instantly whether or not this restart registered
# anything. `progress.txt` records that trap and names counting
# occurrences as one of the two ways out; it is the way that needs
# no line arithmetic and no assumption about which stream a line
# landed on.
#
# stderr is folded into the capture so the count is over the same
# view both times, whichever stream n8n wrote a line to.
#
# `grep -c` exits 1 when it counts zero while still printing the
# `0`, so the `|| true` is what keeps a legitimate zero from ending
# the run under `-e` and `-o pipefail`. The zero is captured either
# way.
AR_LOG="$(docker logs "$AR_N8N_CONTAINER" 2>&1)"
AR_REGISTERED_BEFORE=()
for id in "${AR_IDS[@]}"; do
  AR_REGISTERED_BEFORE+=("$(
    printf '%s\n' "$AR_LOG" | grep -c "Activated workflow .*(ID: $id)" || true
  )")
done

# The restart itself. `docker restart` on the container rather than
# `docker compose restart` on the service, because the container is
# what every step from 4 onwards has been writing to: the imports
# and the activation entered `$AR_N8N_CONTAINER`, and a restart
# that named a service could bounce a different one and leave the
# imported instance registered against nothing.
docker restart "$AR_N8N_CONTAINER"

# Wait for the container to come back healthy. Not the verdict —
# the registration poll below is — but taking it first means the
# common case reaches that poll with the instance already up, and
# means a container that never comes back is described by what its
# health actually read rather than by a silent timeout.
#
# The template answers `none` for a container carrying no
# healthcheck at all, which is a legitimate configuration for an
# instance somebody else declared, and `unreadable` for a daemon
# that will not answer. Both break the wait immediately rather than
# spinning for three minutes: neither is a state that improves by
# being waited on, and the registration poll rules on either.
AR_WAITED=0
AR_HEALTH=unread
while [ "$AR_WAITED" -lt "$AR_HEALTH_WAIT_SECONDS" ]; do
  AR_HEALTH="$(
    docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' \
      "$AR_N8N_CONTAINER" 2>/dev/null || echo unreadable
  )"
  case "$AR_HEALTH" in
    healthy|none|unreadable) break ;;
  esac
  sleep 1
  AR_WAITED=$((AR_WAITED + 1))
done
[ "$AR_HEALTH" = "healthy" ] || {
  echo "  note: health reads $AR_HEALTH after ${AR_WAITED}s, continuing to the registration read"
}

# Poll until every active id has registered again, or until the
# ceiling. Re-reading the whole log each time rather than following
# it, because a count is what the comparison needs and a count of a
# small log is cheap; n8n writes a few hundred lines per boot.
#
# The loop ends on the first pass where nothing is missing, so the
# ordinary case costs one read rather than the whole ceiling.
echo "  waiting for the triggers to register"
AR_WAITED=0
AR_MISSING=""
while :; do
  AR_LOG="$(docker logs "$AR_N8N_CONTAINER" 2>&1)"
  AR_MISSING=""
  AR_INDEX=0
  while [ "$AR_INDEX" -lt "${#AR_IDS[@]}" ]; do
    AR_NOW="$(
      printf '%s\n' "$AR_LOG" |
        grep -c "Activated workflow .*(ID: ${AR_IDS[$AR_INDEX]})" || true
    )"
    if [ "$AR_NOW" -le "${AR_REGISTERED_BEFORE[$AR_INDEX]}" ]; then
      AR_MISSING="$AR_MISSING ${AR_IDS[$AR_INDEX]}"
    fi
    AR_INDEX=$((AR_INDEX + 1))
  done

  [ -n "$AR_MISSING" ] || break
  [ "$AR_WAITED" -lt "$AR_REGISTRATION_WAIT_SECONDS" ] || break
  sleep 1
  AR_WAITED=$((AR_WAITED + 1))
done

# Rule. A missing registration is a failure of the thing this
# command exists to do, so it ends the run rather than being noted:
# an operator who reads a success line here will not check again,
# and an unregistered schedule trigger is a pipeline that never
# starts and says nothing about it.
#
# The two causes worth naming are the ones a reader cannot see from
# the message alone. An instance whose log level was raised above
# `info` prints no `Activated workflow` line at all, so this
# refusal is what a correctly-registered instance looks like under
# that setting — the compose service here sets no level and the
# image defaults to `info`. And a workflow whose trigger n8n
# refuses at activation time reports the refusal in the same log,
# which is where the next reading is.
[ -z "$AR_MISSING" ] || {
  echo "bootstrap: after ${AR_WAITED}s these active workflows did not register:$AR_MISSING" >&2
  echo "           read the container log for the refusal or for a raised log level:" >&2
  echo "           docker logs $AR_N8N_CONTAINER" >&2
  exit 1
}

AR_INDEX=0
while [ "$AR_INDEX" -lt "${#AR_IDS[@]}" ]; do
  echo "  registered: ${AR_IDS[$AR_INDEX]} (${AR_NAMES[$AR_INDEX]})"
  AR_INDEX=$((AR_INDEX + 1))
done

# What the run leaves behind, said plainly because the two halves
# are easy to conflate. Registered triggers are armed clocks and
# webhooks on this machine: the schedule fires at each wall-clock
# boundary from now on, measured to be the next matching boundary
# after registration rather than one at registration, so the wait
# for a first hourly pass is uniform over the hour.
#
# What is still missing before one of those passes does anything is
# rows this command deliberately does not create — a `sources` row
# for a domain and an `export_target` connector with a subscription
# naming it — which is the checkpoint runbook's, over the HTTP API.
echo "==> bootstrap complete"
echo "    the armed triggers above are live on this machine from now on"
echo "    stop everything that can spend: scripts/panic.sh"
