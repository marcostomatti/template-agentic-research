#!/usr/bin/env bash
# Puts every built artifact onto a LOCAL n8n at the id its own file
# declares — the step between `build:workflows` and
# `activate-workflows.sh` that nothing in this repository ran before.
# The two commands either side of it already existed: one writes
# `workflows/dist/`, the other arms what an instance is already
# holding, and until this landed the only way to get from the first
# to the second was an operator typing the import by hand.
#
# THE DECLARED ID IS THE WHOLE POINT, because every cross-workflow
# reference in this port is a string rather than a lookup.
# `ar-dispatch` reaches `ar-ingest`, `ar-score`, `ar-research` and
# `ar-digest` through Execute Workflow nodes baked to the four ids
# `ENV_DEFAULTS` in `scripts/workflow-markers.ts` names, and the two
# credentials every node binds resolve by id as well. An import that
# renamed anything on the way in would leave a set of workflows that
# imported, activated and published cleanly and could not call each
# other.
#
# Measured on the pinned image, that cannot present as an id n8n
# invented. `workflow_entity.id` is NOT NULL with no default at
# 2.15.1, so an artifact declaring none is refused at exit 1 with
# nothing written, and the id comes from the JSON rather than from
# the filename — driven with a file whose name, declared id and
# display name all disagreed, and the declared id is what was
# stored. So the only shape the failure has left is an id that is
# present and WRONG, which is what the read-back at the end of this
# file rules on and what the host-side plan read refuses in front of.
#
# The same split as `activate-workflows.sh` and
# `import-credentials.sh`, and here it happens to leave nothing on
# the TypeScript side at all. Those two each have a decision next
# door — which triggers would arm a workflow, what the two
# credentials are — where this command has none: which artifacts to
# import is every file in the built tree, and what each one is called
# is a member of that file. Reading a directory and reading a member
# is not a rule somebody could get wrong in two places, so there is
# no third module here and the reads stay inline.
#
# THE PER-FILE FORM, and not the directory form, though both were
# measured to preserve every id. `import:workflow --separate
# --input=<dir>` imports six files in one invocation and names none
# of them: its whole output is a count, and when one artifact is bad
# the run aborts having written nothing with no line saying which.
# Six invocations cost one loop and buy a failure that names the
# artifact in the command that failed. It also sidesteps a flag
# pairing that is easy to half-remember — measured, a directory
# `--input` with `--separate` omitted is not a smaller directory
# import, it is `EISDIR` at exit 1 — and this form needs neither
# flag.
#
# THE EXIT CODE OF THE IMPORT IS NOT THE READING. Measured on this
# image, per verb rather than per binary: unknown flags are ignored
# in silence, so a misspelled `--input` is a no-op that reports
# success, and both import verbs print their refusals to stdout
# rather than to stderr. This verb does exit 1 on a real error — the
# NOT NULL violation above is one — but nothing about a 0 separates
# an import that landed six workflows from one that landed none. So
# the verdict is a read-back out of the instance's own sqlite, held
# against the artifacts that were actually fed to it, which is the
# rule `progress.txt` records for wrapping any external command
# here: assert on the WORK, never on the code.
#
# WHAT WITNESSES THAT THIS RUN APPLIED is `versionId`, and the
# obvious candidates do not. A re-import is an upsert on the declared
# id: no row is duplicated, `createdAt` is preserved, and measured,
# `updatedAt` DOES NOT MOVE — so neither the row's presence nor its
# timestamps part a workflow this run wrote from one an earlier run
# left behind. What does move is `versionId`, which
# `ImportService.importWorkflows` mints fresh on every import and
# which the artifacts declare a deterministic placeholder for that is
# always overwritten. The read-back therefore records it before and
# requires it to have CHANGED for every id that already existed.
#
# THAT SAME REMINTING IS WHY IMPORT MUST PRECEDE ACTIVATE, ALWAYS,
# and why this command ends by saying so when it has to.
# `activate-workflows.sh` seeds `workflow_history` under the
# `versionId` it reads off the entity at the moment it runs, and its
# publish looks that pair back up. A fresh `versionId` orphans a
# previous seeding under the old one. Measured on top of that, an
# import UNARMS what it lands on — it sets `active` false and clears
# `activeVersionId` — so an instance that was armed before this ran
# is holding the new build and running none of it until an
# activation goes over it again.
#
# The artifacts reach the container as FILES, where
# `import-credentials.sh` refuses to let its own input touch a disk
# anywhere. The difference is what is in them: a built workflow
# carries SQL, prompts and the `(type, id, name)` triples a node
# binds a credential by, and no secret at all — the key and the
# password live in the credential file that command builds in
# memory. `workflows/dist/` and not `workflows/dist-external/` for
# `activate-workflows.sh`'s reason: this arms an instance the project
# stands up itself and imports through that instance's own CLI,
# while the external tree is the one whose settings were resolved
# for an instance somewhere else.

# `-e` so a failing step stops the run rather than letting the one
# after it work on whatever the failure left behind, `-u` so a
# misspelled variable is a refusal rather than an empty string, and
# `-o pipefail` so the failure at the head of the one pipeline below
# is not answered for by whatever it was piped into.
set -euo pipefail

# This package's own root, resolved from this file's location rather
# than from the working directory, so the command answers the same
# from wherever an operator runs it. The `bun -e` below resolves its
# module specifiers against the working directory too, and every
# path fed to `docker cp` is written against this root.
# `activate-workflows.sh` argues the same line, including why `$0`
# rather than `${BASH_SOURCE[0]}` is enough for a file nothing
# sources.
cd "$(dirname "$0")/.."

# The n8n container to enter, defaulting to the name
# `docker-compose.yml` fixes for the service behind `--profile n8n`.
# Read with a default rather than bare because `-u` aborts on an
# unset name, and unset is the ordinary case. `activate-workflows.sh`
# and `import-credentials.sh` spell the same default: the three are
# run back to back, so a container named by the environment for one
# is named by it for the others.
AR_N8N_CONTAINER="${AR_N8N_CONTAINER:-ar-n8n}"

# Where the artifacts land inside the container. `/tmp` in there is
# the container's read-write layer, so the tree dies with the
# container even if the removal below never runs — which is the
# backstop rather than the plan.
AR_REMOTE_DIR=/tmp/ar-workflows-import

# What is built, and what each artifact calls itself. One line per
# file — the filename, the declared id, then the display name — so
# the import loop has its list and the report names workflows rather
# than counting them. Sorted, because `readdirSync` answers in
# directory order and nothing else here fixes one.
#
# Derived from the built tree rather than from a list kept in this
# file, on `activate-workflows.sh`'s reasoning at its own plan read:
# a hardcoded roster is one more thing to edit whenever a workflow
# lands and is silently wrong until somebody notices.
#
# The refusal for an artifact with no `id` stands here rather than
# being left to the CLI, and it is the cheaper report by a long way.
# Left to n8n it is a `SQLITE_CONSTRAINT` printed to stdout, after
# an unknown number of siblings have already been imported; raised
# here it names the file before the container has been touched.
#
# Single quotes around the snippet so the shell hands it to bun
# untouched — inside double quotes every dollar sign and backslash
# would be bash's own — which is why the snippet writes its strings
# with double quotes and can carry no apostrophe. stderr is folded
# into the capture so a directory nobody has built, an artifact that
# will not parse and a snippet that will not run all reach the guard
# as text it can print. And an `if !` around the assignment rather
# than a bare one: a plain assignment is a command whose status is
# the substitution's, so under `-e` the same read assigned bare ends
# the run on that line and this guard never runs.
if ! AR_PLAN="$(bun -e '
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dist = "workflows/dist";
const files = readdirSync(dist).filter((f) => f.endsWith(".json")).sort();

for (const file of files) {
  const built = JSON.parse(readFileSync(join(dist, file), "utf8"));
  if (typeof built.id !== "string" || built.id.length === 0) {
    throw new Error(
      file + " declares no id, and n8n mints none: workflow_entity.id is NOT NULL",
    );
  }
  console.log(file + " " + built.id + " " + built.name);
}
' 2>&1)"; then
  echo "import-workflows: could not read the built workflows under workflows/dist/" >&2
  echo "                  usually means nothing has been built: bun run build:workflows" >&2
  echo "$AR_PLAN" >&2
  exit 1
fi

# The filenames the import loop walks, and the report of what it is
# about to feed the container. A herestring rather than a pipe, so
# the loop runs in this shell and the array it fills survives it;
# the empty-line skip is for the one line a herestring makes out of
# an empty plan. `read -r file id name` puts the display name last
# on purpose — it is the one field that can carry a space, and the
# last name in a `read` absorbs the rest of the line.
AR_FILES=()
echo "==> workflows/dist/ declares"
while read -r file id name; do
  [ -n "${file:-}" ] || continue
  AR_FILES+=("$file")
  echo "  $id ($name) from $file"
done <<<"$AR_PLAN"

# Refuse rather than carry on, and before the array is expanded
# anywhere: measured on the bash macOS ships, 3.2, a count of an
# empty array is 0 while a quoted expansion of one under `-u` aborts
# the run as an unbound variable.
[ "${#AR_FILES[@]}" -gt 0 ] || {
  echo "import-workflows: workflows/dist/ holds no artifact to import" >&2
  echo "                  build them first: bun run build:workflows" >&2
  exit 1
}

# Refuse a container that is not up, before anything is copied into
# it. Folded onto the one answer that means running: `docker
# inspect` prints `true` for a running container and `false` for a
# stopped one, and FAILS for a container nothing created, for a
# daemon it cannot reach, and where docker is not installed — so the
# fallback turns those three into an answer, and the comparison is
# against `true` rather than against its opposite, because a missing
# container leaves a blank line before the failure rather than
# `false`. `activate-workflows.sh` carries the full argument.
#
# After the plan read rather than in front of it, on that file's
# ordering: the read ANSWERS with the value the rest of the run
# works from, and it puts the local problem first — a tree with
# nothing built in it is wrong on every machine, where a container
# that is down is wrong on this one and an operator fixes it in
# place.
AR_RUNNING="$(docker inspect -f '{{.State.Running}}' "$AR_N8N_CONTAINER" 2>/dev/null || echo false)"
[ "$AR_RUNNING" = "true" ] || {
  echo "import-workflows: the n8n container $AR_N8N_CONTAINER is not running" >&2
  echo "                  bring it up: bun run n8n:start" >&2
  echo "                  or run the whole sequence: scripts/bootstrap.sh" >&2
  exit 1
}

# Take the copied tree away whatever happens next. Installed BEFORE
# the directory is made rather than after the copy, so a run that
# dies part way through the copy is covered too.
#
# `INT` and `TERM` are trapped alongside `EXIT` because bash does not
# run an `EXIT` trap for a signal it was not told about; each of
# those handlers exits, which is what runs `EXIT`. Every command in
# the handler is made non-fatal, and that is not tidiness: measured
# on bash 3.2, a failing command inside an `EXIT` trap REPLACES the
# status the shell was about to exit with, and under `-e` it aborts
# the handler before a later line could put the status back.
trap 'docker exec "$AR_N8N_CONTAINER" rm -rf "$AR_REMOTE_DIR" >/dev/null 2>&1 || true' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# A clean directory rather than one that might already hold
# something. The removal matters more than the creation: a leftover
# artifact from an earlier run is a file the loop below would never
# name, but it is one the read-back at the end WOULD read, and it
# would then rule on a workflow this run never imported. `$1` rather
# than the path pasted into the single-quoted program, so the path
# is written once and the trap above names the same variable.
#
# A directory of its own rather than the artifacts dropped straight
# into `/tmp`, and that is what makes the trap able to do its job.
# `docker cp` writes as root while every `docker exec` here runs as
# the image's `node`, and `/tmp` carries the sticky bit — so a
# root-owned file sitting directly in there is one the cleanup
# cannot unlink, measured. Unlinking is governed by the containing
# directory, and this one is made by `node`, so `node` can take
# root's files out of it.
docker exec "$AR_N8N_CONTAINER" sh -c 'rm -rf "$1" && mkdir -p "$1"' sh "$AR_REMOTE_DIR"

# The artifacts, copied in whole. `docker cp` rather than a stream
# per file: there is no secret in a built workflow, which is the
# whole of what makes a path acceptable here and a shell variable
# mandatory in `import-credentials.sh`.
#
# `dist/.` rather than `dist`, which is the difference between
# copying the CONTENTS of the directory and copying the directory
# into it — the second would put the artifacts at
# `$AR_REMOTE_DIR/dist/` and every `--input` below would miss.
docker cp workflows/dist/. "$AR_N8N_CONTAINER:$AR_REMOTE_DIR/"

# Hold the copy to what it was given, so a partial one is a refusal
# here rather than a puzzle three steps later. `docker cp` is quiet
# about a great deal and this is the only reading that says every
# artifact arrived. Counted rather than compared file by file
# because the loop below names each file explicitly and a missing
# one would fail its own import — what a count catches that the
# loop cannot is a copy that landed the tree somewhere else
# entirely.
AR_COPIED="$(docker exec "$AR_N8N_CONTAINER" \
  sh -c 'ls -1 "$1"/*.json 2>/dev/null | wc -l' sh "$AR_REMOTE_DIR" | tr -d '[:space:]')"
[ "$AR_COPIED" = "${#AR_FILES[@]}" ] || {
  echo "import-workflows: copied $AR_COPIED artifacts into $AR_N8N_CONTAINER, expected ${#AR_FILES[@]}" >&2
  echo "                  nothing was imported" >&2
  exit 1
}

# The read this command's verdict is taken with, written once and
# run twice — before the imports and after them. One program rather
# than two copies because the two runs are being COMPARED: a read
# that drifted between them would report a difference the instance
# does not have, which is the one failure a second copy makes
# possible and review does not catch.
#
# The mode is which variables it was given. With `AR_BEFORE` unset it
# prints the state as JSON and stops; with `AR_BEFORE` set it holds
# the state it now reads against the state it was handed and rules on
# the imports.
#
# It reads the EXPECTATION out of the copied artifacts rather than
# being handed one from this side, which is what makes the comparison
# a comparison against the bytes that were actually fed to the CLI
# and not against a second reading of the host's tree. The copy count
# above is what stands behind that: an empty directory in here would
# otherwise let the whole verdict pass by having nothing to rule on.
#
# The row count is read alongside the per-id rows, and the growth is
# held against how many declared ids were absent before. That is the
# assertion that no id was invented, and it is the one reading here
# that a per-id walk structurally cannot make: a row written under an
# id no artifact declares satisfies every question asked about the
# six that are, and shows up only in the total. Planted, and it is
# not hypothetical — an extra `--input` at an id of its own left all
# six per-id lines reporting success and was caught by this line
# alone.
#
# `{ readOnly: true }` on the open, which matters more than it looks:
# `node:sqlite` CREATES a database at a path holding none, so a
# read-write open against a moved file would leave an empty database
# behind and fail a statement later on a table that was never there.
# The `statSync` guard in front of it is what turns that into a
# message. The path is n8n's own default and `docker-compose.yml`
# sets none of the three settings that move it, which is written up
# at that file and at `activate-workflows.sh`'s seeding step.
#
# `node --no-warnings` because `node:sqlite` announces itself as
# experimental on every run, and the busy timeout because the running
# n8n holds the same database open.
AR_READ_STATE_JS="$(cat <<'NODE'
const { readdirSync, readFileSync, statSync } = require('node:fs');
const { join } = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const dbFile = '/home/node/.n8n/database.sqlite';
if (statSync(dbFile, { throwIfNoEntry: false }) === undefined) {
  console.error('import-workflows: no n8n database at ' + dbFile);
  console.error('                  an instance that moved it needs this step edited');
  process.exit(1);
}

const dist = process.env.AR_REMOTE_DIR;
const declared = readdirSync(dist)
  .filter((name) => name.endsWith('.json'))
  .sort()
  .map((name) => {
    const built = JSON.parse(readFileSync(join(dist, name), 'utf8'));
    return {
      file: name,
      id: built.id,
      name: built.name,
      nodes: Array.isArray(built.nodes) ? built.nodes.length : -1,
    };
  });

const db = new DatabaseSync(dbFile, { readOnly: true });
db.exec('PRAGMA busy_timeout = 8000;');
const stored = db.prepare(
  'SELECT id, name, active, versionId, nodes FROM workflow_entity WHERE id = ?',
);
const total = db.prepare('SELECT COUNT(*) AS n FROM workflow_entity');

const state = { total: Number(total.get().n), rows: {} };
for (const entry of declared) {
  const row = stored.get(entry.id);
  const nodes = row === undefined ? null : JSON.parse(String(row.nodes));
  state.rows[entry.id] = row === undefined
    ? null
    : {
        name: row.name,
        active: Number(row.active),
        versionId: String(row.versionId),
        nodes: Array.isArray(nodes) ? nodes.length : -1,
      };
}
db.close();

if (process.env.AR_BEFORE === undefined) {
  console.log(JSON.stringify(state));
  process.exit(0);
}

const before = JSON.parse(process.env.AR_BEFORE);
const faults = [];
let unarmed = 0;
let absent = 0;

for (const entry of declared) {
  const was = before.rows[entry.id] ?? null;
  const now = state.rows[entry.id];
  if (was === null) {
    absent += 1;
  }

  if (now === null) {
    faults.push(
      entry.id + ': no row at this id, so ' + entry.file +
      ' was fed to the import and stored under something else or not at all',
    );
    continue;
  }
  if (now.name !== entry.name) {
    faults.push(
      entry.id + ': stored as ' + now.name + ', declared as ' + entry.name,
    );
    continue;
  }
  if (now.nodes !== entry.nodes) {
    faults.push(
      entry.id + ': stored with ' + now.nodes + ' nodes, ' +
      entry.file + ' declares ' + entry.nodes,
    );
    continue;
  }
  if (was !== null && was.versionId === now.versionId) {
    faults.push(
      entry.id + ': the stored version did not move, so this run did not apply',
    );
    continue;
  }
  if (was !== null && was.active === 1 && now.active !== 1) {
    unarmed += 1;
  }
  console.log(
    '  ' + (was === null ? 'created' : 'reimported') + ': ' + entry.id +
    ' (' + entry.name + ', ' + entry.nodes + ' nodes)',
  );
}

const grew = state.total - before.total;
if (grew !== absent) {
  faults.push(
    'workflow_entity gained ' + grew + ' rows against ' + absent +
    ' declared ids absent before' +
    (grew > absent
      ? ', so something was stored under an id no artifact declares'
      : ', so a declared id reached no row of its own'),
  );
}

if (faults.length > 0) {
  console.error('import-workflows: the imports did not do what they reported');
  for (const fault of faults) {
    console.error('  ' + fault);
  }
  process.exit(1);
}

if (unarmed > 0) {
  console.log(
    '  note: ' + unarmed + ' of these were armed and an import unarms what it lands on',
  );
  console.log(
    '        it also remints every versionId, which orphans a seeded history row',
  );
  console.log('        re-arm them: scripts/activate-workflows.sh');
}
NODE
)"

# What the instance holds for these ids before anything is imported,
# so the verdict below can tell a row this run wrote from one that
# was already there. A herestring rather than a heredoc at the call,
# because the program is the variable above and is fed to both runs
# the same way.
AR_BEFORE="$(docker exec -i -e AR_REMOTE_DIR="$AR_REMOTE_DIR" "$AR_N8N_CONTAINER" \
  node --no-warnings <<<"$AR_READ_STATE_JS")"

# One invocation per artifact, on the reasoning in the docblock. The
# CLI's own three lines per file are left unfiltered, on
# `activate-workflows.sh`'s reasoning over its publish loop: they are
# the shipped command's report of what it believes it did, and the
# read-back below is what rules on it.
#
# `-e` ends the run on the first artifact that will not import,
# leaving the ones behind it unimported. That is the report worth
# having rather than a cost — importing part of a set and saying
# nothing about the rest leaves an operator believing an instance is
# current — and a re-import being an upsert on the declared id means
# a rerun repairs it with no duplicate row and no second share.
echo "==> importing ${#AR_FILES[@]} artifacts into $AR_N8N_CONTAINER"
for file in "${AR_FILES[@]}"; do
  docker exec "$AR_N8N_CONTAINER" n8n import:workflow --input="$AR_REMOTE_DIR/$file"
done

# Rule on what is actually stored. Same program, now given the state
# from before the imports, so it reports one line per workflow naming
# the id it landed at and refuses the five ways this can go wrong
# while every command above reported success: no row at a declared
# id, a row under the wrong display name, a row holding a different
# number of nodes than the artifact declares, a row that was already
# there and did not change, and a row written under an id no artifact
# declares.
echo "==> reading back what the imports wrote"
docker exec -i -e AR_REMOTE_DIR="$AR_REMOTE_DIR" -e AR_BEFORE="$AR_BEFORE" \
  "$AR_N8N_CONTAINER" node --no-warnings <<<"$AR_READ_STATE_JS"
