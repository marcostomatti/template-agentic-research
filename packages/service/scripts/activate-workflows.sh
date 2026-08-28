#!/usr/bin/env bash
# Arms this package's built workflows on a LOCAL n8n, where
# activation goes through the n8n CLI inside the container rather
# than over the public REST API `deploy-external.ts` and
# `audit-workflows.ts` reach an instance with. Wanting a container is
# what puts this command on the near side of that split: it can only
# ever reach an instance this project stands up itself, which is
# exactly the case the API path was written not to assume.
#
# Being shell is a second question and `README.md` in this directory
# answers it, at where a command's interesting part is. A decision
# belongs in TypeScript, so a case can import it and drive it; a
# sequence of container commands belongs in shell, because wrapping
# those hides the command that actually ran. The decision this one
# would otherwise be holding is already a function next door
# (`activatableTriggers` in `n8n-workflow.ts`), which is what keeps
# what is left here a sequence.
#
# The sequence is the shell settings, the package root every path in
# this file is written against, the container to enter, the read of
# the built tree that says which workflows an activation would arm,
# the refusal for a container that is not running, the history row
# each of those workflows needs before a publish has anything to
# publish against, and the publish that arms them. Each step carries
# its own reasoning where it stands.
#
# Nothing in this repository stands that container up. The compose
# file in this package declares postgres, redis and postgres-live and
# no n8n service at all, `bootstrap.sh` is phase 7 in the roster next
# door, and no tracked file anywhere runs an `import:workflow` — so
# both the instance this arms and the import that puts workflows on
# it are an operator's to supply until that phase lands. What stands
# behind the branches below is therefore a run against a container
# started by hand, and that is the only evidence a shell script in
# this package ever gets: `lint` and `check-types` open no `.sh` at
# all, and the naming invariant, which does read this one, reads
# names rather than behaviour.
#
# The pair of steps this file ends on — seed a `workflow_history`
# row, then publish — is written up in
# `~/.claude/skills/n8n-cli-unattended-ops/SKILL.md`, a user-level
# skill rather than one vendored under `.claude/` here, which is why
# the argument is carried above rather than left to the link. It
# numbers six failures and four of them are out of this file's reach:
# three are about `n8n execute`, which nothing here runs, and one is
# about `import:workflow`, which is not this file's step either. The
# two that remain are what those two steps are for.
#
# What does not carry across from it is the REASONS. It was written
# against 2.3.0 and this port targets 2.15.1 throughout, and on this
# version the import writes its own history row and mints its own
# `versionId`: the seeding below is a repair for a route that
# swallows a failed insert rather than the prerequisite every
# activation once needed, the stale-active-version hazard behind its
# fixed-id advice cannot arise, and one column of the statement it
# gives now labels the version rather than the workflow. Each of
# those is argued at the step it belongs to. What only a note about
# the whole file can add is that they are one divergence and not
# three, so the link is worth following for the shape of the sequence
# and never for why it is shaped that way.

# `-e` so a failing step stops the run rather than letting the one
# after it work on whatever the failure left behind, `-u` so a
# misspelled variable is a refusal rather than an empty string, and
# `-o pipefail` so a failure at the head of a pipeline is not
# answered for by the exit status of whatever it was piped into.
#
# The `-u` half is why `AR_N8N_CONTAINER` is read with a default
# rather than as a bare expansion: unset is the ordinary case for it,
# and under `-u` a bare read of an unset name aborts the run.
set -euo pipefail

# This package's own root, resolved from this file's location rather
# than from the working directory, so the command answers the same
# from wherever an operator happens to run it. Every path in this
# file is written against it. `build-workflows.ts` resolves the same
# root from `import.meta.url` for the same reason and argues it at
# its own `PACKAGE_ROOT`.
#
# A `cd` rather than a variable, because here the working directory
# IS the resolution: a shell script's paths are read by the commands
# it runs, so a root kept in a variable would have to be pasted onto
# every one of them.
#
# `$0` rather than `${BASH_SOURCE[0]}`: measured, the two are the
# same string under every way this is launched — an absolute path, a
# relative one, a bare name found on PATH, and `bash <path>` — and
# they part only when a file is sourced, which this one is not
# written to be.
cd "$(dirname "$0")/.."

# The n8n container to enter. `docker exec` addresses a CONTAINER
# where the rest of this package addresses a compose SERVICE
# (`package.json` names `postgres` and `postgres-live`, never a
# container), so the name has to be supplied here rather than taken
# from anything the package already spells.
#
# The default follows the `ar` this package names everything else
# with — the `ar` and `ar_live` databases, the `ar_pg_data` volume,
# the `AR_` settings — rather than the `<project>-n8n-<n>` compose
# would derive on its own. That project half is the checkout's
# directory name, so it moves with a `docker compose -p` and with a
# clone under another path: a default built on it would be a name
# nobody chose.
#
# No compose file here declares an n8n service, so today the default
# names a container nothing in this repository creates, and the
# environment is how an operator points this at one that exists.
# There is no entry to make for it in `src/config.ts` either: that
# schema is a module a process reads by importing it, which is how
# `AR_N8N_URL` and `AR_N8N_API_KEY` reach the TypeScript commands
# beside this one, and nothing a shell script runs can import
# anything.
AR_N8N_CONTAINER="${AR_N8N_CONTAINER:-ar-n8n}"

# What is built, and which of it an activation would actually arm.
# One line per artifact — `arm` or `manual`, then the workflow id,
# then its display name — so the split that follows can tell the two
# apart and the report names workflows rather than counting them.
# Sorted so it reads the same on every machine: `readdirSync` answers
# in directory order and nothing here joins the artifacts, which is
# the whole of what the sort buys.
#
# Derived from the built tree rather than from a list kept here. A
# hardcoded list is one more thing to edit whenever a workflow lands
# and is silently wrong until somebody notices — and quietly wrong,
# for the shapes this port has. Measured in `n8n` 2.15.1: an
# activation is refused only where every enabled node outside its two
# manual-starter types declares no trigger, poll or webhook, so a
# workflow reached through an execute-workflow trigger activates and
# registers nothing rather than being turned away. The rule is
# `activatableTriggers` in `n8n-workflow.ts`, where this directory
# keeps the questions an instance-facing command asks about a
# workflow, so a second command asking what one would start reads
# that same answer rather than a second reading of it.
#
# `workflows/dist/` and not `workflows/dist-external/`: this command
# arms an instance the project stands up itself and imports through
# that instance's own CLI, while the external tree is the one whose
# settings were resolved against an environment for an instance
# somewhere else.
#
# The directory is spelled relative to the root this file has already
# moved to rather than imported from the build, and relative costs
# nothing extra here: bun resolves the module specifier in the same
# snippet against the working directory too, so a run from anywhere
# else fails on the import before it ever reaches the directory.
# `build-workflows.ts` writes that path and
# `tests/invariants/workflow-dist.ts` reads it, each resolving it
# from its own file's location, and the `cd` is this file's version
# of the same thing — so none of the three is keyed to where a
# process was started.
#
# Single quotes around the snippet, so the shell hands it to bun
# untouched. Inside double quotes every dollar sign, backtick and
# backslash would be bash's own, and a template literal reached for
# later would be interpolated before bun ever saw it. What that costs
# is a snippet writing its strings with double quotes where the
# TypeScript beside it writes single ones, and one that can carry no
# apostrophe at all.
#
# The capture folds stderr in, so a directory nobody has built, an
# artifact that will not parse and a snippet that will not run all
# reach the guard as text it can print. The two lines an operator
# acts on go first and the raw failure after them, because bun prints
# a source excerpt around an uncaught error and a fix line behind
# that is a fix line nobody reads.
#
# An `if !` around the assignment rather than a bare one, because
# `-e` is the one thing here it costs rather than buys. A plain
# assignment is a command and its status is the substitution's, so
# the same substitution assigned bare ends the run on that line and
# this guard never runs. A condition is where `-e` does not act on a
# status, and that is the whole of what leaves this failure a message
# of its own to end on.
#
# The capture and that abort are separate, and running the two
# together is the easy thing to get wrong about this line: it is not
# the redirection that ENDS the run. Measured on the bash `env` finds
# here, 3.2: the same assignment without the `2>&1` aborts on the
# same status, and what folding stderr in takes away is the one thing
# that would still have reached a terminal. With the redirection in
# place, a bare assignment leaves a non-zero exit and no output at
# all.
if ! PLAN="$(bun -e '
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { activatableTriggers } from "./scripts/n8n-workflow.ts";

const dist = "workflows/dist";
const files = readdirSync(dist).filter((f) => f.endsWith(".json")).sort();

for (const file of files) {
  const built = JSON.parse(readFileSync(join(dist, file), "utf8"));
  const kind = activatableTriggers(built).length > 0 ? "arm" : "manual";
  console.log(kind + " " + built.id + " " + built.name);
}
' 2>&1)"; then
  echo "activate: could not read the built workflows under workflows/dist/" >&2
  echo "          usually means nothing has been built: bun run build:workflows" >&2
  echo "$PLAN" >&2
  exit 1
fi

# Split the plan: the armed ids are what the steps after this drive
# the CLI with, and the manual-only ones are reported and left alone.
# A herestring rather than a pipe, so the loop runs in this shell and
# the array it fills survives it; the empty-line skip is for the one
# line a herestring makes out of an empty plan.
#
# Left inactive is the outcome rather than a gap. Manual-only means
# an activation would start nothing, and the workflows `ar-dispatch`
# reaches through an Execute Workflow node are started by it rather
# than by anything an activation registers. Not everything still to
# land is one of those — `ar-capture` in the phase-5 roster starts at
# a webhook, which arms — so the split is read off each artifact
# rather than assumed. Nothing built today is manual-only:
# `ar-dispatch` holds the only schedule trigger in the system and
# arms on it.
ARMED_IDS=()
while read -r kind id name; do
  [ -n "${kind:-}" ] || continue
  if [ "$kind" = "arm" ]; then
    ARMED_IDS+=("$id")
  else
    echo "  manual-only, left inactive: $id ($name) — an activation would start nothing"
  fi
done <<<"$PLAN"

# Refuse rather than carry on: a run with nothing to arm is either a
# tree with nothing built in it or a system that has lost its only
# clock, and the message says how to read which. It also has to come
# before the array is expanded anywhere. Measured on the bash macOS
# ships, 3.2, a count of an empty array is 0 while a quoted expansion
# of one under `-u` aborts the run as an unbound variable.
[ "${#ARMED_IDS[@]}" -gt 0 ] || {
  echo "activate: no built workflow has a trigger an activation would arm" >&2
  echo "          nothing printed above means workflows/dist/ is empty: bun run build:workflows" >&2
  exit 1
}

# Refuse a container that is not up. The two steps behind this one
# enter it and this stands in front of both, because letting them run
# is a worse report rather than only a later one: a `docker exec`
# against a stopped container fails once per command rather than
# once, and measured, what it fails with names the container by its
# sixty-four character id and says nothing an operator can act on.
#
# After the plan read rather than in front of it. That read ANSWERS
# with the value the rest of the run works from, so it is the first
# step and not a check standing ahead of one, and the ordering also
# puts the local problem first — a tree with nothing built in it is
# wrong on every machine, where a container that is down is wrong on
# this one and an operator fixes it in place.
#
# The reading is folded onto one answer on purpose. Measured:
# `docker inspect` prints `true` for a running container and `false`
# for a stopped one, and FAILS for a container nothing created, for a
# daemon it cannot reach, and where docker is not installed at all —
# so the `|| echo false` is what turns the three that are errors into
# an answer, and the comparison is against the one answer that means
# running rather than against its opposite. That second half is
# load-bearing: measured, a missing container leaves not `false` but
# a blank line and then it, `docker inspect` writing an empty line to
# stdout before it fails and a substitution keeping a leading
# newline.
#
# No `if !` wrapper here, where the plan read above needs one. The
# fallback answers for every way the read can fail, so this
# substitution exits zero whatever happened and `-e` has no status to
# act on.
#
# What the fold costs is a diagnosis, and it costs it for two of the
# four states that reach it. A stopped container and one nothing
# created both get the same two lines and bringing the stack up is
# the edit for either; a docker that is not running, or is not
# installed at all, gets them too and is not, and finds out when the
# command named below refuses in its turn.
#
# That command is `bootstrap.sh`, which the roster in `README.md`
# here describes as bringing the stack up and importing credentials —
# the credentials clause is why the message names it rather than a
# bare compose command. It arrives in phase 7, so what the message
# points at is a command an operator cannot run yet: the same shape
# as the container default above, and the roster is where a reader
# looks either of them up.
RUNNING="$(docker inspect -f '{{.State.Running}}' "$AR_N8N_CONTAINER" 2>/dev/null || echo false)"
[ "$RUNNING" = "true" ] || {
  echo "activate: the n8n container $AR_N8N_CONTAINER is not running" >&2
  echo "          bring the stack up and try again: scripts/bootstrap.sh" >&2
  exit 1
}

# Give every armed workflow a `workflow_history` row to publish
# against. The publish behind this reads that pair back:
# `WorkflowRepository.publishVersion` looks the workflow's own
# `versionId` up in `workflow_history` and refuses where nothing is
# there, naming the version it wanted and the workflow it wanted it
# for. So a row missing is not a smaller problem than a workflow
# missing — the step behind this one cannot run at all.
#
# What this repairs on n8n 2.15.1 is narrower than the origin's
# version of it and worth spelling out, because a reader who finds
# the origin otherwise reads the difference as a mistake. There it
# was the ordinary path: 2.3.0's `import:workflow` wrote no history
# row, so every activation needed one seeded first. Measured on
# 2.15.1, the import writes one itself, in the same transaction that
# upserts the entity and under a `versionId` it mints there rather
# than the one the file carries — so on that path a publish would
# succeed with this step absent.
#
# The route that still leaves a workflow without one is the API.
# `WorkflowHistoryService.saveVersion` catches its own insert
# failing, logs it and returns, so a create or an update over the
# public REST API can store a workflow and leave nothing behind it
# with nothing raised — and `deploy-external.ts` reaches an instance
# that way, which nothing stops an operator pointing at the one this
# arms. Whoever does that and comes here meets the publish refusal
# instead, which names a version rather than a cause. Running this in
# front of it is what makes that case a repair rather than a puzzle.
#
# An upsert on the `versionId` primary key, and never an insert that
# ignores a conflict. On the ordinary path the row is already there,
# so a plain insert would refuse every rerun and an ignoring one
# would pass over a row without ever reading it. Writing the entity's
# own nodes back leaves the version an activation will run and what
# the entity holds the same text, which is the property worth having:
# measured, an active workflow does not run the nodes in
# `workflow_entity` at all — n8n's active workflow manager reads
# `nodes` and `connections` off `dbWorkflow.activeVersion`, the
# history row `activeVersionId` points at. It also keeps that foreign
# key, which references `workflow_history(versionId)`, pointing at a
# row that exists — which is why setting `active` and
# `activeVersionId` by hand is not the shorter route it looks.
#
# No `name` in the write, where the origin has one. On this version
# that column is the version's own label rather than the workflow's
# display name — the public API's activate takes a name and a
# description for the version it publishes — and an import leaves it
# null for a version nobody labelled. Copying the display name into
# it, measured, relabels the version an operator sees.
#
# An id the import never wrote is reported and passed over rather
# than ending the run on it, so the report names every one of them
# rather than the first. Nothing is swallowed by that: publishing
# refuses a workflow it cannot find, so the run still ends on the
# step behind this one, with the whole list already printed above the
# refusal.
#
# The database file is n8n's own default rather than a name this
# project chose, and measured, it is where the published image puts
# it. `@n8n/config` 2.14.0, which n8n 2.15.1 pins: `DB_TYPE` defaults
# to sqlite, `DB_SQLITE_DATABASE` names the file and defaults to
# `database.sqlite`, and that resolves against `.n8n` under
# `N8N_USER_FOLDER` or the home directory, which is `/home/node`
# there. Those three settings are what move it, so a compose file in
# phase 7 choosing any of them owes this step an edit. The refusal in
# front of the open is what says so on the day: measured,
# `node:sqlite` CREATES a database at a path holding none, so opening
# one blind leaves an empty file behind and fails a statement later
# on a table that was never there.
#
# A quoted heredoc rather than a single-quoted argument, so unlike
# the plan read above this snippet writes its strings the way the
# TypeScript beside it does. The ids reach it through the environment
# because a `node` reading its program from stdin has no argument
# list to read them from. `node:sqlite` ships with the container's
# own Node and needs no driver installed, `--no-warnings` is for the
# notice it prints about being experimental, and the busy timeout is
# for the running n8n, which holds the same database open.
echo "==> seeding workflow_history for: ${ARMED_IDS[*]}"
docker exec -i -e AR_IDS="${ARMED_IDS[*]}" "$AR_N8N_CONTAINER" node --no-warnings <<'NODE'
const { statSync } = require('node:fs');
const { DatabaseSync } = require('node:sqlite');

const file = '/home/node/.n8n/database.sqlite';
if (statSync(file, { throwIfNoEntry: false }) === undefined) {
  console.error('activate: no n8n database at ' + file);
  console.error('          an instance that moved it needs this step edited');
  process.exit(1);
}

const db = new DatabaseSync(file);
db.exec('PRAGMA busy_timeout = 8000;');

const entity = db.prepare(
  'SELECT id, versionId, nodes, connections FROM workflow_entity WHERE id = ?',
);
const active = db.prepare('SELECT nodes FROM workflow_history WHERE versionId = ?');
const seed = db.prepare(
  'INSERT INTO workflow_history ' +
  '(versionId, workflowId, authors, nodes, connections, autosaved) ' +
  'VALUES (?, ?, ?, ?, ?, 0) ' +
  'ON CONFLICT(versionId) DO UPDATE SET nodes = excluded.nodes, ' +
  'connections = excluded.connections, ' +
  "updatedAt = STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')",
);

for (const id of (process.env.AR_IDS || '').split(/\s+/).filter(Boolean)) {
  const workflow = entity.get(id);
  if (!workflow) {
    console.log('  not imported, nothing to seed: ' + id);
    continue;
  }
  const before = active.get(workflow.versionId);
  seed.run(
    workflow.versionId,
    workflow.id,
    'activate-workflows.sh',
    workflow.nodes,
    workflow.connections,
  );
  const state = !before
    ? 'seeded'
    : before.nodes === workflow.nodes
      ? 'already current'
      : 'refreshed';
  console.log('  ' + state + ': ' + id);
}

db.close();
NODE

# Publish each armed workflow, which is what an activation is on this
# version. `update:workflow --active=true` is the older spelling and
# still runs, but measured on 2.15.1 it warns that it is deprecated,
# points at this command, and calls the same publish underneath, so
# there is nothing behind it left to prefer.
#
# It runs after every import and not only the first. Measured, an
# import unarms what it lands on: it sets `active` false, clears
# `activeVersionId`, and logs that the workflow was deactivated and
# is to be activated later. So a second import over an armed instance
# leaves it holding the new build and running none of it until this
# step goes over it again, which is what makes the command worth
# rerunning rather than only worth running once.
#
# No output filter and no fallback over the loop, where the origin
# carries both. `-e` ends the run on the first workflow that will not
# publish, which is the report worth having: publishing part of a set
# and saying nothing about the rest leaves an operator believing a
# half-armed instance is armed. What that costs is a partial state,
# and it is one the run named on its way out and a rerun repairs.
#
# Publishing is not arming. It sets the active version, and the
# triggers register when the container comes back up — measured, the
# command closes by asking for a restart where n8n is already
# running. That line is the shipped command's own and is printed once
# per workflow, which is why nothing here repeats it.
echo "==> publishing"
for id in "${ARMED_IDS[@]}"; do
  docker exec "$AR_N8N_CONTAINER" n8n publish:workflow --id="$id"
done
