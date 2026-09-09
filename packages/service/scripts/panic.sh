#!/usr/bin/env bash
# The stop. One command that takes every surface in this project
# that can spend money and makes it stop spending, run by an
# operator who has just realised something is running that should
# not be.
#
# TWO SURFACES AND NO THIRD. This project can spend without
# anybody typing anything in exactly two places, and this command
# reaches both. The first is whatever `AR_N8N_URL` names, which is
# an n8n holding armed workflows and is reached over its public
# REST API by `scripts/panic-external.ts`. The second is this
# compose project's containers, `ar-n8n` among them, which is
# reached by `docker compose stop`. The roster row this file
# replaces promised "every reachable host"; that is broader than
# what landed, and the row now says what this does instead.
#
# STOP RATHER THAN `down`, AND DEACTIVATE RATHER THAN DELETE, for
# one reason spelled two ways: everything this command does is
# meant to be undone. `docker compose stop` leaves the containers
# and their volumes, so `bun run n8n:start` puts the instance back
# holding every credential, workflow and execution it had —
# where `down` would take the containers and `down -v` the named
# volume with the encryption key in it, which is an instance that
# cannot decrypt its own credentials afterwards. The API side
# reasons the same way and `scripts/panic-external.ts` argues it
# there: a disarmed workflow stays under its own id for an
# activation to put back, where a deleted one is gone with its
# execution history. A panic taken during an emergency must not
# also be the thing that loses the evidence of one.
#
# THE ORDER IS THE API SIDE FIRST, AND IT IS A DECISION RATHER
# THAN A LIST. `.env.example` tells an operator that `AR_N8N_URL`
# CAN name this stack's own container — the compose service
# publishes on loopback at 5678 — so the overlapping case is the
# documented ordinary one rather than a corner. Stopping the
# containers first would then guarantee that the API leg cannot
# reach the instance it was pointed at, and every correctly
# configured run would end on a connection failure. Running it
# first also buys the thing that makes the stop last: a container
# stopped with its workflows still armed comes back armed the
# moment anybody runs `bun run n8n:start`, so disarming before
# stopping is the difference between a stop that holds and one
# that expires at the next `up`.
#
# What that ordering costs is bounded and worth naming. An
# `AR_N8N_URL` pointing at a host that will not answer blocks this
# command for as long as the connection takes to fail while the
# local containers are still up. That is seconds against a refused
# connection and a TCP timeout against a black hole, and it is
# paid before a stop that the operator can always take by hand
# with `docker compose --profile '*' stop`.
#
# IT DOES NOT STOP AT THE FIRST FAILURE, which is why `-e` is
# absent below and is the same decision `disarmEveryWorkflow`
# makes one workflow at a time. A panic that gave up on the
# containers because an instance would not answer would leave the
# half it could certainly have stopped running, having been asked
# to stop everything. So each surface is attempted whatever became
# of the other, and what could not be stopped is reported at the
# end and carried into the exit code.
#
# SAFE TO RUN WHEN NOTHING IS UP, at every step and not only as a
# whole. An unset `AR_N8N_URL` skips the API leg rather than
# failing on an unbound name; `docker compose stop` over a project
# with nothing running is a no-op that exits 0; and the verdict is
# a read-back of what is still running rather than the stop's exit
# code, so a project that was already down reads as stopped for
# the same reason one this command just stopped does. Running it
# twice is running it once and then reading the state.
#
# WHAT IT DOES NOT REACH. Anything armed on an instance
# `AR_N8N_URL` does not name is not stopped and is not reported:
# there is no discovery here, and an operator with a second
# deployment runs this once per instance with the setting pointed
# at each. A model provider is not called off either — a request
# already in flight when this runs is billed whatever this does.
# And with `AR_N8N_URL` unset the local instance is stopped but
# never disarmed, so it re-arms on the next `up`; the durable stop
# needs the pair set.

# `-u` so a misspelled name is a refusal rather than an empty
# string, and `-o pipefail` so a failure at the head of a pipeline
# is not answered for by whatever it was piped into.
#
# `-e` is deliberately NOT here, and this is the one script in
# this directory that leaves it off. Every step in `bootstrap.sh`
# is a precondition of the next, so stopping at a failure is the
# right thing there. Here the two steps are independent surfaces
# and stopping at a failure is the wrong thing: the whole point is
# that everything gets attempted. Each step below therefore
# captures its own status instead, and `AR_FAILED` carries them to
# the verdict.
set -uo pipefail

# This package's own root, resolved from this file's location
# rather than from the working directory, so the command answers
# the same from wherever an operator runs it — which for a panic
# is more likely than usual to be somewhere else entirely. It is
# what lets `docker compose` find `docker-compose.yml`, what lets
# the `bun -e` below resolve `./src/config.ts`, and what puts
# `.env` where `bun` looks for it. `activate-workflows.sh` argues
# the same line, including why `$0` rather than `${BASH_SOURCE[0]}`
# is enough for a file nothing sources.
#
# Guarded with an explicit exit, which the siblings do not need:
# each of them runs under `-e`, where a failed `cd` ends the run on
# its own. Without `-e` it would carry on from wherever it started,
# and every step below would then act on a different compose
# project or none.
cd "$(dirname "$0")/.." || {
  echo "panic: could not enter $(dirname "$0")/.." >&2
  exit 1
}

# Whether anything failed, folded to one flag rather than kept per
# step. The per-step reports below say WHAT failed; this says only
# whether the exit code should be 1, which is the whole of what a
# caller can read.
AR_FAILED=0

# The compose profile selector, spelled once because getting it
# wrong is silent. `docker compose stop` with no profile named
# reaches only the services that declare none: measured on compose
# v2.31.0 against this file, a bare `docker compose --dry-run stop`
# lists `service-postgres-1` and NOT `ar-n8n`, which is precisely
# the container this command exists for. `--profile '*'` enables
# every profile the file declares and the same dry run then lists
# both.
#
# The quotes are load-bearing rather than style: unquoted, the
# shell expands `*` against the working directory — this package's
# root, which holds files — and compose is handed a filename as a
# profile name.
AR_ALL_PROFILES=(--profile '*')

# Which container states count as still running for the read-back
# at the end. Three rather than one, because `running` alone
# answers no about two states that are not stopped: a `restarting`
# container is on its way back up under a restart policy, and a
# `paused` one resumes its schedule the moment anybody unpauses
# it. `exited`, `created` and `dead` are the states that are not
# executing and are not about to.
AR_LIVE_STATES=(--status running --status restarting --status paused)

# ---------------------------------------------------------------
# 1. The API side
# ---------------------------------------------------------------
#
# Whether an external instance has been named at all, asked
# through `src/config.ts` rather than off `process.env` in the
# shell. That difference is the whole reason this is a `bun -e`
# and not a `[ -n "${AR_N8N_URL:-}" ]`: `bun` loads `.env` from
# the working directory, which the `cd` above has made this
# package's, so a setting an operator put in their untracked
# `.env` — which is where `.env.example` tells them to put it —
# counts here exactly as it counts for the command being gated.
# A shell test would see only what the launching environment
# exported and would skip the API leg on the ordinary setup.
#
# Blank counts as unset, which is the reading `AR_N8N_URL`'s own
# entry in `src/config.ts` declares and `isSet` in
# `deploy-external.ts` applies. The rule is spelled here rather
# than shared: `isSet` is private to that module, and the two
# questions are different anyway — this one asks whether an
# instance was named, where the command's own refusal asks whether
# the PAIR was, and names both settings when it is not.
#
# Which is why the gate is `AR_N8N_URL` alone and not the pair. An
# operator who has named an instance and left the key unset gets
# that command's refusal, naming the setting; being silently
# skipped would tell somebody in an emergency that there was
# nothing to stop.
if ! AR_NAMED="$(bun -e '
import { config } from "./src/config.ts";

const named = typeof config.AR_N8N_URL === "string"
  && config.AR_N8N_URL.trim() !== "";

process.stdout.write(named ? "named" : "unnamed");
' 2>&1)"; then
  # Configuration that will not parse is not an answer either way,
  # so it is reported and treated as named — attempting the leg
  # and letting that command refuse for itself is the safe
  # direction, where guessing `unnamed` would skip a surface that
  # may well be armed.
  echo "panic: could not read AR_N8N_URL through src/config.ts" >&2
  echo "$AR_NAMED" >&2
  AR_NAMED=named
  AR_FAILED=1
fi

if [ "$AR_NAMED" = "named" ]; then
  echo "==> [1/2] disarming the instance AR_N8N_URL names"

  # Run rather than imported, so what this reads is the exit code
  # that command documents for a caller: 1 where it reached the
  # instance and left something armed, 1 where it could not reach
  # or was not configured, 0 where nothing on the instance is
  # armed. Its output is left to stream to the terminal rather
  # than captured, because it prints one line per workflow AS the
  # call for that workflow returns — an operator who interrupts a
  # slow pass has already been told what happened, and a captured
  # report is one an interrupted run never writes.
  #
  # The status is captured rather than left to the shell, which is
  # the whole cost of running without `-e`: a bare call's nonzero
  # exit is simply discarded, so a run that reached the instance
  # and left three workflows armed would close on the success
  # line. Under `-e` it would be read and would end the run here
  # instead, leaving the containers up — which is the failure this
  # file is arranged against, and why neither default will do.
  bun scripts/panic-external.ts || {
    AR_FAILED=1
    echo "panic: the API side did not finish clean" >&2
    echo "       two readings look the same from here and the lines above" >&2
    echo "       separate them: workflows reported STILL ARMED are still" >&2
    echo "       spending, while a connection or configuration failure means" >&2
    echo "       nothing was read at all — and if AR_N8N_URL names this" >&2
    echo "       stack's own container, an already-stopped one answers that" >&2
    echo "       way and has nothing armed running on it." >&2
  }
else
  echo "==> [1/2] AR_N8N_URL names no instance, so there is no API side to stop"
  echo "    note: the local instance below is being stopped and not disarmed," \
       "so it re-arms on the next start"
fi

# ---------------------------------------------------------------
# 2. The containers
# ---------------------------------------------------------------
#
# Every service this file declares, whatever profile gates it,
# stopped in one call. Named services are deliberately absent from
# the command line: a list here would be a second roster to keep
# in step with `docker-compose.yml`, and the failure mode of one
# that drifted is a service that quietly stops being stopped.
#
# IDEMPOTENT and safe against a project that is already down.
# Compose reconciles rather than acts: containers already stopped
# are left alone, and a project with no containers at all is a
# no-op. Its exit code is captured rather than trusted, which the
# read-back below is the reason for.
echo "==> [2/2] stopping every container in this compose project"
docker compose "${AR_ALL_PROFILES[@]}" stop || {
  AR_FAILED=1
  echo "panic: docker compose stop did not exit clean" >&2
  echo "       the read-back below is what rules on whether anything is" >&2
  echo "       still running" >&2
}

# ---------------------------------------------------------------
# The verdict
# ---------------------------------------------------------------
#
# What is still running, asked of docker rather than concluded
# from the exit code above. That is this directory's standing rule
# for wrapping an external command — assert on the work — and it
# earns its keep twice here. It turns a project that was already
# down into a clean verdict rather than into whatever compose
# chose to say about being asked to stop nothing, and it catches a
# container that came back up under a restart policy between the
# stop and this line.
#
# `--orphans` is left at its default of true, so a container
# carrying this project's label whose service the file no longer
# declares is counted. `docker compose stop` will not reach one,
# which is exactly why the verdict should: an orphan of this
# project that is running is something a panic did not stop and an
# operator needs named.
if AR_STILL="$(docker compose "${AR_ALL_PROFILES[@]}" ps \
  "${AR_LIVE_STATES[@]}" --format '{{.Name}} {{.State}}' 2>&1)"; then
  if [ -n "$AR_STILL" ]; then
    AR_FAILED=1
    echo "panic: these containers are still running:" >&2
    # Indented per line rather than with a `printf` prefix: the
    # capture is one string carrying newlines, so a prefixed
    # format string indents the first line and leaves the rest
    # against the margin.
    printf '%s\n' "$AR_STILL" | sed 's/^/       /' >&2
    echo "       stop them by name: docker stop <name>" >&2
  else
    echo "    nothing in this compose project is running"
  fi
else
  # A docker that will not answer is not a project known to be
  # down, so this is a refusal rather than a shrug. The reading it
  # replaces is the only one that matters, and an operator told
  # "stopped" on the strength of a daemon that never answered
  # would stop looking.
  AR_FAILED=1
  echo "panic: docker would not say what is running, so this command" >&2
  echo "       cannot rule on whether anything here is stopped" >&2
  echo "$AR_STILL" >&2
fi

if [ "$AR_FAILED" -ne 0 ]; then
  echo "panic: something above is still able to spend — read the lines" >&2
  echo "       marked panic: and clear each one" >&2
  exit 1
fi

echo "==> panic complete"
echo "    the local stack is stopped and its containers and volumes are"
echo "    intact: bun run n8n:start puts it back, scripts/bootstrap.sh"
echo "    puts it back armed"
