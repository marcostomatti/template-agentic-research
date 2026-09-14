#!/usr/bin/env bash
# A disposable copy of this package's compose stack, stood up beside
# the dev one and taken down again, so a verification run has an
# n8n and a Postgres to read that nobody's work lives in. Three
# verbs:
#
#   up    refuse whatever would make the run unsafe, bring both
#         scratch services up healthy, mint a read-scoped API key
#         on the scratch n8n, and write the env file that points a
#         shell at all of it
#   env   print that env file's path while the stack it describes
#         is running, so a shell takes it with
#         `. "$(scripts/test-stack.sh env)"`
#   down  remove the env file, take the project down with its
#         anonymous volumes, and read back what still carries the
#         project's label and which volumes its containers mounted
#         still exist, exiting 1 on any survivor
#
# EVERY COMPOSE CALL NAMES THE PROJECT AND BOTH FILES, through the
# one spelling of that below rather than one per call. The dev
# project's `ar_n8n_data` volume holds the dev n8n's generated
# encryption key, which nothing can restore, and a `down --volumes`
# that resolved to the dev project would take it. The flags are
# explicit rather than inherited for a second reason: the env file
# this command writes sets `COMPOSE_PROJECT_NAME` and
# `COMPOSE_FILE`, and a shell that sourced one would otherwise
# decide what a flagless call here reached. Measured on compose
# v2.31.0, `-p` and `-f` outrank both settings: with the settings
# naming the dev project and the flags naming this one, `config`
# rendered `ar-scratch`, and with the two swapped it rendered the
# dev project.
#
# WHAT A SECOND PROJECT DOES NOT GIVE YOU is argued at
# `docker-compose.scratch.yml`, the overlay these calls merge over
# `docker-compose.yml`: container names of its own, loopback ports
# that replace the base's rather than joining them, and no named
# volume. It is never used alone, and
# `tests/invariants/scratch-stack.test.ts` holds it against the
# base.
#
# NOTHING IS CREATED UNTIL EVERY REFUSAL HAS HAD ITS TURN. `up`
# asks whether the daemon answers, whether `bun` is there to mint
# the key with, whether the project holds anything from an earlier
# run and whether either scratch port is taken, and only then
# brings anything up. A refusal leaves the machine as it found it,
# which is what makes `up` safe to run just to see whether it would.
#
# THE ENV FILE IS WHAT REACHES OTHER COMMANDS, not the stack.
# `context/local-stack.md` names what a shell that sourced it does
# to `panic.sh` and `bootstrap.sh`: both then act on this project
# and not on the dev one.
#
# WHAT IT DOES NOT DO. It applies no migration, imports nothing,
# seeds nothing and arms nothing, so the scratch database starts
# empty and the scratch n8n holds an owner, one key and no
# workflow. `bootstrap.sh` run from a shell that sourced the env
# file is how that instance is given the rest.
#
# Exit 0 when the verb did what it says, 1 on a refusal or a
# failure, and 2 for a command line naming no verb this knows.

# `-e` because `up` is a sequence whose every step is a
# precondition of the next: a key minted on a stack that did not
# come up healthy, or an env file written with no key, is worse
# than stopping. `down` wants the opposite at one step, reading
# back what survived even when compose's own teardown failed, and
# it captures that one status itself rather than giving `-e` up for
# the whole file. `-u` so a misspelled name is a refusal rather
# than an empty string, and `-o pipefail` so a failure at the head
# of a pipeline is not answered for by its tail.
set -euo pipefail

# This package's root, from this file's location rather than the
# working directory, as every sibling resolves it. The compose
# files are named relative to it and the env file is written under
# it.
cd "$(dirname "$0")/.."

# The same root as an absolute path, which is what the env file's
# `COMPOSE_FILE` is spelled against. Measured, a relative
# `COMPOSE_FILE` resolves against the working directory of whatever
# reads it: from this root it rendered the scratch stack, and from
# `/tmp` compose refused with `stat /tmp/docker-compose.yml`.
# `panic.sh` and `bootstrap.sh` both enter this root first, and an
# operator typing `docker compose ps` in that shell is anywhere.
AR_ROOT="$(pwd)"

# The fixed values, each spelled once. The container names and the
# ports are the ones `docker-compose.scratch.yml` fixes and
# publishes, and the n8n URL is the one base `scratch-instance.ts`
# accepts. The database URL keeps the base file's `ar` user and
# password, which the overlay leaves alone, over the `ar_scratch`
# database it sets. Its host is `127.0.0.1` on purpose:
# `postgresCredentialData` in `n8n-credentials.ts` rewrites that
# host to `postgres` and keeps the port, so the one URL reaches the
# database from the host and, as the `ar-postgres` credential, from
# inside the n8n container, where the overlay has Postgres listen
# on 55432.
AR_SCRATCH_PROJECT=ar-scratch
AR_SCRATCH_COMPOSE=(
  docker compose -p "$AR_SCRATCH_PROJECT"
  -f docker-compose.yml -f docker-compose.scratch.yml
)
AR_SCRATCH_POSTGRES=ar-scratch-postgres
AR_SCRATCH_N8N=ar-scratch-n8n
AR_SCRATCH_PORTS=(55432 55678)
AR_SCRATCH_N8N_URL=http://127.0.0.1:55678
AR_SCRATCH_DATABASE_URL=postgresql://ar:ar@127.0.0.1:55432/ar_scratch

# The label compose stamps on the containers and the network it
# creates for a project, and so what the leftover refusal and the
# teardown read-back filter on. By label rather than by name: a
# name is the part the overlay controls, and a survivor is what
# nobody anticipated.
#
# NOT on the one volume this stack creates. The postgres image
# declares `VOLUME /var/lib/postgresql/data`, and the anonymous
# volume that mints at `up` was measured carrying
# `com.docker.volume.anonymous` and no project label at all. A
# volume filter on this label answers empty whether that volume
# survived or not, so `down` also reads which volumes the project's
# containers mount before it removes them, and asks after each of
# those by name afterwards.
AR_SCRATCH_LABEL="label=com.docker.compose.project=$AR_SCRATCH_PROJECT"

# Under `.tmp`, which this package's `.gitignore` ignores. That
# matters twice: the loop runs `git add -A` after every task, and
# the file carries an API key.
AR_SCRATCH_ENV_DIR=.tmp/scratch
AR_SCRATCH_ENV_FILE="$AR_SCRATCH_ENV_DIR/env"

# What the one line `scratch-instance.ts` prints opens with.
AR_KEY_PREFIX=AR_N8N_API_KEY=

# ---------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------

# A report on stderr: the first argument is the headline and every
# further one an indented line under it. A `while` over `$#` rather
# than a loop over `"$@"`, so nothing here leans on how bash 3.2
# expands an empty list under `-u`.
say() {
  printf 'test-stack: %s\n' "$1" >&2
  shift
  while [ "$#" -gt 0 ]; do
    printf '            %s\n' "$1" >&2
    shift
  done
}

# A report and then exit 1.
refuse() {
  say "$@"
  exit 1
}

# Indent stdin to sit under a headline, on stderr.
indented() {
  sed 's/^/            /' >&2
}

usage() {
  echo 'usage: scripts/test-stack.sh up|env|down' >&2
  exit 2
}

# ---------------------------------------------------------------
# Readings
# ---------------------------------------------------------------

# Whether the daemon answers, asked so the exit code IS the answer.
# `docker info --format '{{.ServerVersion}}'` reads right and is
# not: measured against a socket nothing listens on, it printed the
# connection error on stderr, nothing on stdout, and exited 0.
# `docker version` with the server's field exited 1 there and 0
# against the running daemon, so it is that, and the empty-output
# test behind it covers a client answering 0 with nothing to say.
# Its own error reaches the terminal uncaptured.
require_daemon() {
  local server

  server="$(docker version --format '{{.Server.Version}}')" \
    || refuse 'the docker daemon did not answer, so nothing was touched'
  [ -n "$server" ] \
    || refuse 'docker named no server version, so nothing was touched'
}

# Every container, volume and network carrying the project label,
# one per line, and no output at all for a project holding none.
# A nonzero return is a docker that would not answer, which a
# caller must never read as an empty project.
project_resources() {
  local containers volumes networks

  containers="$(docker ps -a --filter "$AR_SCRATCH_LABEL" \
    --format 'container {{.Names}} ({{.State}})')" || return 1
  volumes="$(docker volume ls --filter "$AR_SCRATCH_LABEL" \
    --format 'volume {{.Name}}')" || return 1
  networks="$(docker network ls --filter "$AR_SCRATCH_LABEL" \
    --format 'network {{.Name}}')" || return 1

  printf '%s\n%s\n%s\n' "$containers" "$volumes" "$networks" \
    | sed '/^$/d'
}

# The volumes the project's containers mount, one name per line,
# read while those containers still exist. It is the only reading
# of the anonymous volume there is: nothing labels it with the
# project, and once its container is gone nothing links it to this
# project either. A nonzero return is a docker that would not say.
mounted_volumes() {
  local ids id

  ids="$(docker ps -aq --filter "$AR_SCRATCH_LABEL")" || return 1
  for id in $ids; do
    docker inspect --format \
      '{{range .Mounts}}{{if eq .Type "volume"}}{{println .Name}}{{end}}{{end}}' \
      "$id" || return 1
  done | sed '/^$/d'
}

# Whether something accepts a connection on a loopback port.
#
# A connect, which is the question a publish on `127.0.0.1` would
# collide over, and one bash answers by opening `/dev/tcp` itself,
# with no tool beyond the shell running this. Measured on bash 3.2:
# a port with no listener answered 1, the same port under a
# throwaway `python3 -m http.server` answered 0 twice, and 1 again
# once that server was killed.
#
# The probe IS a connection, so a listener that serves one and then
# exits is used up by it. A port held by hand for a refusal reading
# wants a listener that keeps listening.
port_is_held() {
  (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null
}

# ---------------------------------------------------------------
# up
# ---------------------------------------------------------------

verb_up() {
  local leftovers held port key_line key

  require_daemon

  # `bun` runs the key mint, and a stack brought up for a run that
  # cannot mint is only a stack somebody has to take down again.
  command -v bun >/dev/null \
    || refuse 'bun is not on PATH, so no key could be minted' \
      'nothing was created'

  # A project holding anything at all is refused rather than
  # reused. The scratch n8n takes one owner, and a second owner
  # setup on one instance answers `400 Instance owner already
  # setup`, so a stack an earlier `up` left running could not be
  # handed a key by this one. A stopped container or a lone network
  # is refused on the same terms: what `down` reads back is only
  # evidence about a run that started from nothing.
  leftovers="$(project_resources)" \
    || refuse 'docker would not list the scratch project' \
      'nothing was created'
  if [ -n "$leftovers" ]; then
    say "the $AR_SCRATCH_PROJECT project already holds:"
    printf '%s\n' "$leftovers" | indented
    refuse 'nothing was created' \
      'take it down first: scripts/test-stack.sh down'
  fi

  # Asked after the leftovers on purpose: a scratch stack left up
  # holds both ports itself, and the refusal above names it for
  # what it is. By here nothing of this project exists, so a held
  # port is somebody else's.
  held=''
  for port in "${AR_SCRATCH_PORTS[@]}"; do
    if port_is_held "$port"; then
      held="$held 127.0.0.1:$port"
    fi
  done
  [ -z "$held" ] \
    || refuse "something already accepts connections on$held" \
      'the scratch stack publishes there, so nothing was created'

  # A file an earlier run left describes a stack that is not there
  # any more. It goes before anything is brought up, so a run that
  # fails from here on leaves no env file rather than a stale one.
  rm -f "$AR_SCRATCH_ENV_FILE"

  # The compose SERVICE keys, `postgres` and `n8n`, and never the
  # container names, which `docker compose` does not take. `--profile
  # n8n` because `up` reaches only unprofiled services without it,
  # and `--wait` because the n8n healthcheck polls
  # `/healthz/readiness`, which answers 503 until the instance can
  # take the owner setup the next step sends.
  echo "==> [1/3] bringing $AR_SCRATCH_POSTGRES and $AR_SCRATCH_N8N up"
  "${AR_SCRATCH_COMPOSE[@]}" --profile n8n up -d --wait postgres n8n \
    || refuse 'the scratch stack did not come up healthy' \
      'what it created is still there: scripts/test-stack.sh down'

  # Captured under an explicit `||`, because a bare assignment from
  # a failing substitution ends a `-e` run on the spot, with no
  # message. That command's stdout is one line or nothing and its
  # refusals go to stderr, which is left to reach the terminal.
  #
  # The shape is checked again here, cheaply, because this file is
  # what writes the key into a file a shell sources: a line that is
  # not the prefix and a run of base64url and dot characters
  # carries something, a quote or a `$` or a newline, that would be
  # read as syntax there.
  echo "==> [2/3] minting a read-scoped API key on $AR_SCRATCH_N8N"
  key_line="$(bun scripts/scratch-instance.ts "$AR_SCRATCH_N8N_URL")" \
    || refuse 'no key was minted, for the reason printed above' \
      'the stack is still up: scripts/test-stack.sh down'
  key="${key_line#"$AR_KEY_PREFIX"}"
  case "$key_line" in
    "$AR_KEY_PREFIX"*) ;;
    *) key='' ;;
  esac
  case "$key" in
    '' | *[!A-Za-z0-9._-]*)
      refuse 'the key mint printed something other than a key line' \
        'nothing was written, and the stack is still up:' \
        'scripts/test-stack.sh down'
      ;;
  esac

  # Written only now that the key is in hand, so a file present
  # means a key was minted. `export` on every line because the
  # commands this file is for are child processes of the shell that
  # sources it. `umask 077` inside the subshell, which scopes it to
  # the one file created there: that file carries the key.
  #
  # `DATABASE_URL` is also set in this package's `.env`, and an
  # exported value is the one a `bun` run reads. Measured from this
  # root with `.env` setting it, `bun -e` answered the exported
  # value.
  echo "==> [3/3] writing $AR_SCRATCH_ENV_FILE"
  mkdir -p "$AR_SCRATCH_ENV_DIR"
  (
    umask 077
    {
      echo '# The scratch stack scripts/test-stack.sh up stood up.'
      echo '# Source it; scripts/test-stack.sh down removes it.'
      printf "export DATABASE_URL='%s'\n" "$AR_SCRATCH_DATABASE_URL"
      printf "export AR_N8N_URL='%s'\n" "$AR_SCRATCH_N8N_URL"
      printf "export AR_N8N_API_KEY='%s'\n" "$key"
      printf "export AR_N8N_CONTAINER='%s'\n" "$AR_SCRATCH_N8N"
      printf "export COMPOSE_PROJECT_NAME='%s'\n" "$AR_SCRATCH_PROJECT"
      printf "export COMPOSE_FILE='%s:%s'\n" \
        "$AR_ROOT/docker-compose.yml" \
        "$AR_ROOT/docker-compose.scratch.yml"
    } >"$AR_SCRATCH_ENV_FILE"
  )

  echo '==> the scratch stack is up'
  echo "    point a shell at it: . \"\$(scripts/test-stack.sh env)\""
  echo "    that shell's compose, panic.sh and bootstrap.sh reach" \
    "$AR_SCRATCH_PROJECT"
  echo '    take it down: scripts/test-stack.sh down'
}

# ---------------------------------------------------------------
# env
# ---------------------------------------------------------------

# The path and nothing else on stdout, and nothing at all on a
# refusal, so `. "$(scripts/test-stack.sh env)"` either sources the
# file or fails on an empty name rather than sourcing something
# stale. A stack counts as running only when both containers are
# `running` AND carry this project's label, so a container that
# merely took one of the names does not pass.
verb_env() {
  local name state stale=''

  [ -f "$AR_SCRATCH_ENV_FILE" ] \
    || refuse "no env file at $AR_SCRATCH_ENV_FILE" \
      'scripts/test-stack.sh up writes one'

  require_daemon

  for name in "$AR_SCRATCH_POSTGRES" "$AR_SCRATCH_N8N"; do
    state="$(docker inspect --format \
      '{{.State.Status}} {{index .Config.Labels "com.docker.compose.project"}}' \
      "$name" 2>/dev/null)" || state=absent
    if [ "$state" != "running $AR_SCRATCH_PROJECT" ]; then
      stale="$stale $name ($state)"
    fi
  done
  [ -z "$stale" ] \
    || refuse "the env file describes a stack that is not running:$stale" \
      'take what is left down, then bring it up again:' \
      'scripts/test-stack.sh down && scripts/test-stack.sh up'

  printf '%s\n' "$AR_ROOT/$AR_SCRATCH_ENV_FILE"
}

# ---------------------------------------------------------------
# down
# ---------------------------------------------------------------

verb_down() {
  local compose_failed=0 mounted all_volumes volume survivors

  # Both readings come before anything is removed. A daemon that
  # will not answer leaves the env file describing a stack that may
  # well still be up, and the mounts are only readable while the
  # containers holding them exist.
  require_daemon
  mounted="$(mounted_volumes)" \
    || refuse 'docker would not say what the scratch containers mount' \
      'nothing was taken down'

  rm -f "$AR_SCRATCH_ENV_FILE"

  # `--profile '*'` so the profiled `n8n` is in the model the
  # teardown works from, quoted so the shell does not glob it
  # against this directory. Measured with a dry run against a
  # running scratch stack, the same `down` without it stopped and
  # removed `ar-scratch-postgres` and never named `ar-scratch-n8n`.
  #
  # `--volumes` is bounded twice: the merged model declares no named
  # volume, so what it can remove is the anonymous volume a
  # container of this project mounts, and `-p` keeps it inside this
  # project whatever it finds. `--remove-orphans` takes a container
  # carrying this project's label that no service here declares.
  #
  # The exit code is kept and not trusted: the read-back below is
  # the verdict, and a compose that failed still exits 1 after it.
  echo "==> [1/2] taking the $AR_SCRATCH_PROJECT project down"
  "${AR_SCRATCH_COMPOSE[@]}" --profile '*' down --volumes \
    --remove-orphans || {
    compose_failed=1
    say 'compose did not take the project down cleanly' \
      'the read-back below rules on what is left'
  }

  # Two readings, because either alone can miss. The label filter
  # covers the containers and the network and anything compose made
  # that nobody expected; the volumes read before the teardown cover
  # the anonymous one the label filter cannot see, looked up by name
  # in the full list rather than by `docker volume inspect`, whose
  # failure would read the same for a missing volume and for a
  # daemon that stopped answering.
  #
  # What neither reaches is an anonymous volume orphaned BEFORE this
  # run, by a teardown that took its container without it: no label
  # names it and no container is left to have mounted it. A sorted
  # `docker volume ls -q` taken before `up` and after `down` is the
  # reading that catches that one.
  echo "==> [2/2] reading back what carries the $AR_SCRATCH_PROJECT label"
  survivors="$(project_resources)" \
    || refuse 'docker would not list the scratch project' \
      'so nothing here can rule on what survived'
  all_volumes="$(docker volume ls -q)" \
    || refuse 'docker would not list its volumes' \
      'so nothing here can rule on what survived'
  for volume in $mounted; do
    if grep -Fqx -- "$volume" <<<"$all_volumes"; then
      survivors="$(printf '%s\n%s\n' "$survivors" \
        "volume $volume (mounted before the teardown)" | sed '/^$/d')"
    fi
  done
  if [ -n "$survivors" ]; then
    say 'these survived the teardown:'
    printf '%s\n' "$survivors" | indented
    refuse 'remove each by name, then run down again'
  fi
  [ "$compose_failed" -eq 0 ] || exit 1

  echo '    no container, volume or network carries the label'
  echo '==> the scratch stack is gone'
}

[ "$#" -eq 1 ] || usage

case "$1" in
  up) verb_up ;;
  env) verb_env ;;
  down) verb_down ;;
  *) usage ;;
esac
