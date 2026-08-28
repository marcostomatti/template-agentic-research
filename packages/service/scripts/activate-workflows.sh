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
# What has landed is the preamble, the plan the rest of the run works
# from, and the precondition the steps behind it stand on: the shell
# settings, the package root every path in this file is written
# against, the container to enter, the read of the built tree that
# says which workflows an activation would arm, and the refusal for a
# container that is not running. The steps that drive the CLI against
# an instance arrive later in this stage.

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

# Refuse a container that is not up. The steps that enter it arrive
# later in this stage and this stands in front of them, because
# letting them run is a worse report rather than only a later one: a
# `docker exec` against a stopped container fails once per command
# rather than once, and measured, what it fails with names the
# container by its sixty-four character id and says nothing an
# operator can act on.
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
