#!/usr/bin/env bash
# Puts this port's two credentials onto a LOCAL n8n at the fixed ids
# every workflow binds — the step between a build and
# `activate-workflows.sh` that nothing in this repository owned
# before. n8n resolves a credential BY ID, so an import that minted
# ids of its own would leave the credential-bound nodes across the
# six artifacts pointing at nothing while the import, the activation
# and the publish each reported success.
#
# The same split as `activate-workflows.sh`, for the same reason.
# What the two credentials ARE, and what a valid import file for
# them says, are already a value next door in
# `scripts/n8n-credentials.ts`, where a case drives them with no
# container anywhere in the run. What is left here is the sequence a
# container is needed for: build the content, refuse an instance
# that is not up, stream the file in, run the verb, read back what
# it did, and remove the file.
#
# That file carries a database password and a model API key, and it
# is never written under the working tree. It is built into a shell
# variable, piped into the container over stdin, and removed from
# in there by a trap that runs whatever the import did. Two shapes
# it is therefore NOT: an argument, since argv is readable through
# `ps` by anyone on the box, and a temporary file on this side,
# since the agent loop that drives this repository runs `git add -A`
# after every task.
#
# THE EXIT CODE OF THE IMPORT IS NOT THE READING, and everything
# below the verb is arranged around that. Measured on the pinned
# image: unknown flags are ignored in silence, so a misspelled
# `--input` is a no-op; both import verbs print their refusals to
# STDOUT rather than stderr; and `import:credentials` answers 0
# having imported nothing when it cannot find its input. It also
# answers 0 when it worked, and no part of the output separates the
# two. So the verdict here is a read-back out of the instance's own
# sqlite, held against the roster the file was built from — which is
# the rule `progress.txt` records for wrapping any external command
# in this repository: assert on the WORK, never on the code.
#
# What that read-back can and cannot witness is worth stating,
# because the obvious half of it is the weaker one. A row present at
# the right id says a binding will resolve; it says nothing about
# whether THIS run wrote it, a row left by an earlier import being
# indistinguishable from a fresh one by id, by name, by type, and by
# `updatedAt`, which measured does not move on a re-import. What
# does move is the stored `data`: n8n encrypts that column with a
# salt, so a re-import of byte-identical content still rewrites the
# ciphertext. The read-back therefore digests that column before and
# after and requires it to have CHANGED for every row that already
# existed. That is what separates an import that applied from one
# that silently did not, and on this version it is the only thing
# that does.
#
# Neither `--userId` nor `--projectId` is passed, and their absence
# is measured rather than assumed. A fresh instance writes a shell
# owner and a personal project at FIRST BOOT, seconds after the
# container starts and long before any CLI runs, while
# `userManagement.isInstanceOwnerSetUp` stays false — so the import
# has a project to share into, needs no owner setup, and running it
# does not advance that flag. A bootstrap knows no ids because
# nobody has ever logged in to mint them, and it does not need to.
#
# What this does not do: connect. That a credential at these
# spellings reaches the database or the model server is a bootstrap
# run's reading and not this command's, and nothing here opens a
# socket to either.

# `-e` so a failing step stops the run rather than letting the one
# after it work on whatever the failure left behind, `-u` so a
# misspelled variable is a refusal rather than an empty string, and
# `-o pipefail` so the failure at the head of the pipeline that
# streams the file in is not answered for by `docker exec`'s status.
# That last one is load-bearing here rather than habitual: without
# it a build that died mid-write would leave a truncated file in the
# container and a pipeline reporting success.
set -euo pipefail

# This package's own root, resolved from this file's location rather
# than from the working directory, so the command answers the same
# from wherever an operator runs it. Both `bun -e` calls below
# resolve their module specifier against the working directory too,
# so the `cd` is what lets them spell a relative path at all.
# `activate-workflows.sh` argues the same line, including why `$0`
# rather than `${BASH_SOURCE[0]}` is enough for a file nothing
# sources.
cd "$(dirname "$0")/.."

# The n8n container to enter, defaulting to the name
# `docker-compose.yml` fixes for the service behind `--profile n8n`.
# Read with a default rather than bare because `-u` aborts on an
# unset name, and unset is the ordinary case. `activate-workflows.sh`
# spells the same default for the same reason; the two are the pair
# an operator runs back to back, so a container named by the
# environment for one is named by it for the other.
AR_N8N_CONTAINER="${AR_N8N_CONTAINER:-ar-n8n}"

# Where the import file lands inside the container. `/tmp` in there
# is the container's read-write layer, so the file dies with the
# container even if the removal below never runs — which is the
# backstop rather than the plan.
AR_REMOTE_FILE=/tmp/ar-credentials-import.json

# The roster, as JSON, out of the module that owns it. The two ids
# are NOT spelled in this file: `scripts/n8n-credentials.ts` is the
# single authority for them, and a second copy here is exactly the
# drift the invariant next door exists to catch — one that no gate
# would ever read, this being a `.sh`.
#
# Safe to print and safe to keep in the environment: a roster entry
# is an id, a display name and a type. The `role` prose each entry
# also carries is dropped here, being for a reader of that module
# rather than for this one.
#
# Single quotes around the snippet so the shell hands it to bun
# untouched, and stderr folded into the capture so a module that
# will not parse reaches the guard as text it can print. Both are
# `activate-workflows.sh`'s reasoning at its own plan read, down to
# the `if !`: a bare assignment's status is the substitution's, so
# `-e` would end the run on the line and this guard would never run.
if ! AR_ROSTER="$(bun -e '
import { CREDENTIAL_ROSTER } from "./scripts/n8n-credentials.ts";

process.stdout.write(JSON.stringify(
  CREDENTIAL_ROSTER.map((entry) => ({
    id: entry.id,
    name: entry.name,
    type: entry.type,
  })),
));
' 2>&1)"; then
  echo "import-credentials: could not read the credential roster" >&2
  echo "                    scripts/n8n-credentials.ts is where it lives" >&2
  echo "$AR_ROSTER" >&2
  exit 1
fi

# The content of the import file, built from the environment by the
# same module. `bun` loads `.env` from the working directory, which
# the `cd` above has already made this package's, so the settings
# reach the builder from the untracked environment exactly as they
# reach every other command here.
#
# stderr is NOT folded into this capture, where it is folded into
# the one above, and the difference is the whole point rather than
# an inconsistency. This variable holds a database password and a
# model API key, so it is the one value in this file that must never
# be echoed — and a fold would make the failure path print it back
# on any failure mode that had already written to stdout. Letting
# bun's stderr through to the terminal instead is also the better
# report: the refusal for an unset setting names the settings, says
# where to set them, and says that a blank value reads as unset,
# none of which this file could improve on by catching it.
#
# Nothing partial can reach the variable on a refusal either. The
# builder resolves both settings and reads the database URL before
# it builds any entry, and it writes the string in one call, so a
# refusal leaves stdout empty rather than half a file.
if ! AR_CONTENT="$(bun -e '
import { credentialsFileContent } from "./scripts/n8n-credentials.ts";

process.stdout.write(credentialsFileContent(process.env));
')"; then
  echo "import-credentials: no credential file was built, so nothing was imported" >&2
  echo "                    the refusal above names what to set" >&2
  exit 1
fi

# Refuse a container that is not up, before anything is streamed
# into it. Folded onto the one answer that means running:
# `docker inspect` prints `true` for a running container and `false`
# for a stopped one, and FAILS for a container nothing created, for
# a daemon it cannot reach, and where docker is not installed —
# so the fallback turns those three into an answer, and the
# comparison is against `true` rather than against its opposite,
# because a missing container leaves a blank line before the failure
# rather than `false`. `activate-workflows.sh` carries the same
# reading and the full argument for it.
#
# After the two builds rather than in front of them, on that file's
# ordering as well: a tree that cannot answer what the credentials
# are is wrong on every machine, where a container that is down is
# wrong on this one and an operator fixes it in place.
AR_RUNNING="$(docker inspect -f '{{.State.Running}}' "$AR_N8N_CONTAINER" 2>/dev/null || echo false)"
[ "$AR_RUNNING" = "true" ] || {
  echo "import-credentials: the n8n container $AR_N8N_CONTAINER is not running" >&2
  echo "                    bring it up: bun run n8n:start" >&2
  echo "                    (scripts/bootstrap.sh will do that and this, once it lands)" >&2
  exit 1
}

# The read this command's verdict is taken with, written once and
# run twice — before the import and after it. One snippet rather
# than two copies because the two runs are being COMPARED: a read
# that drifted between them would report a difference the instance
# does not have, which is the one failure a second copy makes
# possible and review does not catch.
#
# The mode is which arguments it was given. With `AR_BEFORE` unset
# it prints the state as JSON and stops; with `AR_BEFORE` set it
# holds the state it now reads against the state it was handed and
# rules on the import. Reading `AR_ROSTER` in both, so both runs ask
# about exactly the ids the file was built for and neither goes
# looking at rows this port did not write.
#
# The digest is of the ENCRYPTED column and is truncated, and it is
# never the plaintext: what is being compared is whether the stored
# bytes changed, and a hash answers that without a secret reaching a
# terminal, a CI log or scrollback.
#
# `{ readOnly: true }` on the open, which matters more than it
# looks: `node:sqlite` CREATES a database at a path holding none, so
# a read-write open against a moved file would leave an empty
# database behind and fail a statement later on a table that was
# never there. The `statSync` guard in front of it is what turns
# that into a message. The path is n8n's own default and
# `docker-compose.yml` sets none of the three settings that move it,
# which is written up at that file and at
# `activate-workflows.sh`'s seeding step.
#
# `node --no-warnings` because `node:sqlite` announces itself as
# experimental on every run, and the busy timeout because the
# running n8n holds the same database open.
AR_READ_STATE_JS="$(cat <<'NODE'
const { statSync } = require('node:fs');
const { createHash } = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const file = '/home/node/.n8n/database.sqlite';
if (statSync(file, { throwIfNoEntry: false }) === undefined) {
  console.error('import-credentials: no n8n database at ' + file);
  console.error('                    an instance that moved it needs this step edited');
  process.exit(1);
}

const db = new DatabaseSync(file, { readOnly: true });
db.exec('PRAGMA busy_timeout = 8000;');
const stored = db.prepare(
  'SELECT id, name, type, data FROM credentials_entity WHERE id = ?',
);

const roster = JSON.parse(process.env.AR_ROSTER);
const state = {};
for (const entry of roster) {
  const row = stored.get(entry.id);
  state[entry.id] = row === undefined
    ? null
    : {
        digest: createHash('sha256')
          .update(String(row.data))
          .digest('hex')
          .slice(0, 16),
        name: row.name,
        type: row.type,
      };
}
db.close();

if (process.env.AR_BEFORE === undefined) {
  console.log(JSON.stringify(state));
  process.exit(0);
}

const before = JSON.parse(process.env.AR_BEFORE);
const faults = [];
for (const entry of roster) {
  const was = before[entry.id];
  const now = state[entry.id];

  if (now === null) {
    faults.push(entry.id + ': no row at this id, so every node binding it resolves to nothing');
    continue;
  }
  if (now.name !== entry.name || now.type !== entry.type) {
    faults.push(
      entry.id + ': stored as ' + now.name + '/' + now.type +
      ', declared as ' + entry.name + '/' + entry.type,
    );
    continue;
  }
  if (was !== null && was.digest === now.digest) {
    faults.push(
      entry.id + ': the stored fields did not change, so this run did not apply',
    );
    continue;
  }
  console.log(
    '  ' + (was === null ? 'created' : 'rewritten') + ': ' +
    entry.id + ' (' + now.name + ', ' + now.type + ')',
  );
}

if (faults.length > 0) {
  console.error('import-credentials: the import did not do what it reported');
  for (const fault of faults) {
    console.error('  ' + fault);
  }
  process.exit(1);
}
NODE
)"

# What the instance holds for these two ids before anything is
# written, so the verdict below can tell a row this run wrote from
# one that was already there. A herestring rather than a heredoc at
# the call, because the program is the variable above and is fed to
# both runs the same way.
AR_BEFORE="$(docker exec -i -e AR_ROSTER="$AR_ROSTER" "$AR_N8N_CONTAINER" \
  node --no-warnings <<<"$AR_READ_STATE_JS")"

# Remove the file from the container whatever happens next, which is
# this command's half of never leaving two secrets somewhere they
# can be read. Installed BEFORE the write rather than after it, so a
# write that dies part way through is covered too.
#
# `INT` and `TERM` are trapped alongside `EXIT` because bash does
# not run an `EXIT` trap for a signal it was not told about, and a
# Ctrl-C during the import is exactly when the file is on disk in
# there. Each of those handlers exits, which is what runs `EXIT`.
#
# Every command in the handler is made non-fatal, and that is not
# tidiness: measured on the bash macOS ships, 3.2, a failing command
# inside an `EXIT` trap REPLACES the status the shell was about to
# exit with — a cleanup that cannot reach a stopped container would
# turn a specific failure into a bare 1 — and under `-e` it aborts
# the handler before a later line could put the status back.
trap 'docker exec "$AR_N8N_CONTAINER" rm -f "$AR_REMOTE_FILE" >/dev/null 2>&1 || true' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# Stream the file in. Over stdin and never `docker cp`, so the
# content exists on this side only as a variable in this process:
# there is no path on the host to leak, to forget, or for a
# `git add -A` to find.
#
# `umask 077` inside the container so the file is readable by the
# user that wrote it and nobody else, for the minutes it exists.
# `$1` rather than the path pasted into the single-quoted program,
# because the path is a variable here and the trap above has to name
# the same one.
#
# `printf` rather than `echo`, which would have an opinion about a
# leading `-` and about backslashes, and with the newline the
# builder ends its content with put back: a command substitution
# strips trailing newlines, and a file without one is awkward to
# inspect with the tools the container ships.
echo "==> importing the credential file into $AR_N8N_CONTAINER"
printf '%s\n' "$AR_CONTENT" | docker exec -i "$AR_N8N_CONTAINER" \
  sh -c 'umask 077; cat > "$1"' sh "$AR_REMOTE_FILE"

# The verb the measurements read off this image, with the one flag
# that selects the input. Its output is reported and is not believed:
# `Successfully imported 2 credentials.` is the CLI's own claim, and
# the same verb prints `An input file or directory with --input must
# be provided` at exit 0. The read-back below is what rules.
#
# It does exit 1 on a real error — a NOT NULL violation on an entry
# with no id, say — and `-e` ends the run there, with the trap above
# taking the file away on the way out. A partially-invalid file
# imports NOTHING on this version rather than the valid entries
# ahead of the bad one, so an abort here leaves the instance as it
# was rather than half-written.
docker exec "$AR_N8N_CONTAINER" n8n import:credentials --input="$AR_REMOTE_FILE"

# Rule on what is actually stored. Same program, now given the state
# from before the import, so it reports one line per credential and
# refuses the three ways this can go wrong while reporting success:
# no row at a declared id, a row whose name or type is not the one
# declared, and a row that was already there and did not change.
echo "==> reading back what the import wrote"
docker exec -i -e AR_ROSTER="$AR_ROSTER" -e AR_BEFORE="$AR_BEFORE" \
  "$AR_N8N_CONTAINER" node --no-warnings <<<"$AR_READ_STATE_JS"
