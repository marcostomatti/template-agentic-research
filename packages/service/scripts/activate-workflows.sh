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
# What has landed is the preamble: the shell settings, the package
# root every path in this file is written against, and the container
# to enter. The steps that read the built tree and drive the CLI
# against an instance arrive later in this stage.

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
