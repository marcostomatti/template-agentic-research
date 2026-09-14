#!/usr/bin/env bash
# Read-only verification of an external-mode deployment: whether
# the instance says it is ready, whether it holds the workflows
# this checkout's sources declare with every one those sources
# would arm armed, whether its database carries every migration
# the journal declares, and which model connector a pass would
# select. Run by an operator, against a deployment somebody else
# owns.
#
# It is the gate `audit-workflows.ts` deliberately is not. That
# command is a reading, and exits 0 whatever it found; this one
# exits 0 only for a deployment that verified, so a caller can act
# on its code. Both may look at the same instance.
#
# ONE PROCESS PER LEG, AND NOTHING BUT LEGS. Each reading is
# `bun scripts/read-deployment.ts <leg>`, started once for each of
# the four legs, and this file invokes nothing else: no `docker`,
# no `curl`, no `bun -e`. So every request and every statement a
# verification causes is one a leg sends, and what a leg may send
# is set out in that module's own header — `GET` requests and
# `SELECT` statements, and nothing else. A leg is a process of its
# own so that one failure cannot hide another: a database that will
# not answer leaves the instance legs reading, and a leg that dies
# leaves the ones after it running.
#
# IT DOES NOT STOP AT THE FIRST FAILURE, which is why `-e` is
# absent below, for the reason `panic.sh` leaves it off: the legs
# are independent, and a verification that gave up on the schema
# because the instance would not answer would report one fault
# where there may be two. Every leg's exit code is kept, and the
# verdict at the end prints one line per leg whatever that leg
# managed to print for itself, so a leg that died before its own
# report is still named, with the code it ended on.
#
# A 1 is the one code read with less certainty than the others. A
# leg ends on 1 for an unhealthy verdict, and also when it dies
# before it can reach one: measured, a leg handed an environment
# `src/config.ts` refuses exits 1 on the error its import raises,
# printing no verdict line of its own. So the verdict line for a 1
# says both, and the leg's own output above it says which. A 2 is
# a leg that read nothing and said so, and any other code is a leg
# that gave no answer at all, `bun` not found or a signal.
#
# THE SETTINGS ARE REFUSED BEFORE ANY LEG RUNS, read from this
# script's own environment rather than through `src/config.ts`.
# Three of them: `AR_N8N_URL` and `AR_N8N_API_KEY`, which name the
# instance, and `DATABASE_URL`, which names its database. Each has
# to be exported and not blank, every one that is not is named, and
# the run exits 2 with no leg started: nothing was read, which is
# what a leg's own 2 says.
#
# EXPORTED, rather than set anywhere a leg would find it, on
# purpose. A leg loads `.env` from this package's root, which a
# test in this shell cannot see, and `DATABASE_URL` has a fallback
# in `src/config.ts` as well, so with the value only in `.env`, or
# nowhere, the two database legs would read that file's database
# or the compose dev one and report on it as the deployment's.
# Measured under Bun 1.3.14, from a directory whose `.env` set two
# of the names: an exported value was what `process.env` answered,
# an exported blank stayed blank rather than being filled from the
# file, and only a name left unexported took the file's value. So
# the value tested below is the value a leg reads. Blank here is
# empty once whitespace is taken out, and `requireInstance` still
# refuses a blank instance pair behind this, inside each leg.
#
# THE EXIT CODE. 0 only when every leg answered 0, and 1 otherwise,
# an unreadable leg's 2 included: the rule `aggregateExitCode` in
# `deployment-verdict.ts` states, spelled again here because
# running it would mean invoking something other than a leg. The
# words a verdict line gives each leg code are `LEG_EXIT_CODES` in
# the same module, the interface a leg documents for its caller. 2
# is kept for a verification that ran nothing: a setting refused,
# or a command line carrying an argument, this script taking none.
#
# WHAT IT DOES NOT CHECK. No leg reaches the model server: the n8n
# container dials it, so a probe from this host would be a reading
# from the wrong network position, and the `connector` leg prints
# that limit on every answer. No deadline is added, here or in a
# leg, so an address that never answers holds its leg open for as
# long as the connect beneath it takes to give up. And nothing here
# prints a setting's value: the refusal names settings, and the
# values reach the legs through the environment alone.

# `-u` so a misspelled name is a refusal rather than an empty
# string, and `-o pipefail` as every sibling sets it, though no
# status here is read off a pipeline. `-e` is left off, as the
# header argues, and each leg's status is captured by hand instead.
set -uo pipefail

# This package's root, from this file's location rather than the
# working directory, as every sibling resolves it: the legs are
# named from it, and it is where each leg finds `.env`. Guarded
# with an explicit exit, standing in for the `-e` that is not here,
# so a failed `cd` cannot run the legs from wherever the operator
# stood.
cd "$(dirname "$0")/.." || {
  echo "verify-external: could not enter $(dirname "$0")/.." >&2
  exit 1
}

# The legs, in the order `LEG_NAMES` in `deployment-verdict.ts`
# lists them. A second spelling of that list rather than a reading
# of it, a reading being an invocation of something other than a
# leg, so a leg added there runs here only once it is added here.
AR_LEGS=(instance workflows schema connector)

# The settings the legs read, each refused below unless exported
# and not blank.
AR_SETTINGS=(AR_N8N_URL AR_N8N_API_KEY DATABASE_URL)

# ---------------------------------------------------------------
# Refusals, before any leg runs
# ---------------------------------------------------------------

if [ "$#" -ne 0 ]; then
  echo 'usage: scripts/verify-external.sh' >&2
  echo '       it takes no arguments and runs every leg; no leg was run' >&2
  exit 2
fi

# `${!AR_SETTING:-}` reads the variable the loop names, the `:-`
# keeping an unset one from ending the run under `-u`, and every
# whitespace character comes out before the emptiness test, so a
# value of spaces is refused as the blank it is. Only the NAME of a
# setting reaches the report; its value goes nowhere but this test.
AR_UNSET=''
for AR_SETTING in "${AR_SETTINGS[@]}"; do
  AR_VALUE="${!AR_SETTING:-}"
  if [ -z "${AR_VALUE//[[:space:]]/}" ]; then
    AR_UNSET="$AR_UNSET $AR_SETTING"
  fi
done

if [ -n "$AR_UNSET" ]; then
  echo "verify-external: not exported, or blank:$AR_UNSET" >&2
  echo '                 export each for the deployment being verified;' >&2
  echo '                 a value in .env is not read here. No leg was run' >&2
  exit 2
fi

# ---------------------------------------------------------------
# The legs
# ---------------------------------------------------------------
#
# Each leg's output streams rather than being captured, so an
# operator who interrupts a slow leg has already read the ones
# before it. Its status is taken on the line after it, which
# without `-e` is the only place it exists: a bare call's nonzero
# exit is otherwise simply discarded.
AR_CODES=()
AR_STEP=0
for AR_LEG in "${AR_LEGS[@]}"; do
  AR_STEP=$((AR_STEP + 1))
  echo "==> [$AR_STEP/${#AR_LEGS[@]}] $AR_LEG"
  bun scripts/read-deployment.ts "$AR_LEG"
  AR_CODES+=("$?")
done

# ---------------------------------------------------------------
# The verdict
# ---------------------------------------------------------------
#
# One line per leg, in the order they ran, each naming the code
# that leg's process ended on and what the code means, then one
# line over all of them. A leg that did not answer 0 fails the
# verification whichever other code it gave.
echo '==> verdict, one line per leg'
AR_FAILED=0
AR_INDEX=0
while [ "$AR_INDEX" -lt "${#AR_LEGS[@]}" ]; do
  AR_LEG="${AR_LEGS[$AR_INDEX]}"
  AR_CODE="${AR_CODES[$AR_INDEX]}"
  case "$AR_CODE" in
    0) AR_MEANING='healthy' ;;
    1) AR_MEANING='unhealthy, or it died before its own verdict' ;;
    2) AR_MEANING='unreadable' ;;
    *) AR_MEANING='no answer, a code no leg gives' ;;
  esac
  printf '    %s: exit %s, %s\n' "$AR_LEG" "$AR_CODE" "$AR_MEANING"
  if [ "$AR_CODE" -ne 0 ]; then
    AR_FAILED=$((AR_FAILED + 1))
  fi
  AR_INDEX=$((AR_INDEX + 1))
done

if [ "$AR_FAILED" -ne 0 ]; then
  echo "verify-external: $AR_FAILED of ${#AR_LEGS[@]} legs did not answer 0," \
    'so the deployment did not verify' >&2
  echo "                 each leg's own lines above say why" >&2
  exit 1
fi

echo "==> the deployment verified: all ${#AR_LEGS[@]} legs answered 0"
