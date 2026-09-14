## The local stack

`docker-compose.yml` here declares TWO services: `postgres` (unprofiled,
container `service-postgres-1`) and `n8n` behind `--profile n8n`, container
`ar-n8n`, on loopback 5678. `scripts/bootstrap.sh` takes a cold tree to an
instance holding the six workflows, imported, armed and registered;
`scripts/panic.sh` stops everything that can spend money, and
`docs/CHECKPOINT-2.md` is the runbook. This page is what those pieces
actually DO when read closely, measured against the pinned n8n 2.15.1 image.

### Compose verbs disagree about profiles

- **`stop` and `up` reach only the services declaring NO profile, while `ps`
  lists a profiled container whether or not the flag is there.** So a `ps`
  reading is NOT a control for what a `stop` would touch: measured against
  this file, a bare `docker compose --dry-run stop` lists
  `service-postgres-1` and not `ar-n8n`, while a bare `ps` lists both.
  `--profile '*'` enables every profile the file declares (compose
  v2.31.0), and the QUOTES are load-bearing -- unquoted, the shell globs
  `*` against the working directory and compose is handed a filename as a
  profile name. `--dry-run` is the free, non-destructive way to measure
  which containers any verb would reach before running it.
- **`docker compose config --services <name>` IGNORES the positional** and
  prints the whole profile set, exiting 0 and listing `n8n` for the bogus
  name `ar-n8n` -- vacuous as an is-this-a-service probe. The selecting form
  DROPS `--services`: `docker compose --profile n8n config ar-n8n` prints
  `no such service: ar-n8n` on STDERR at exit 1, and `config n8n` prints the
  one resolved service at 0. Because this file fixes the service KEY and
  `container_name` to different strings, copying a SIBLING script is
  degenerate evidence -- `stress:start` names `postgres-live`, which is both
  the service key AND the stem of the derived container name, so
  substituting the new container name reads correct and is not. Nothing
  catches it: no gate runs a package script, and an invariant over
  `docker-compose.yml` does not read `package.json`. Run any new
  command-wrapping script ONCE before believing it.
- **`docker compose stop` prints `Stopping` and `Stopped` for a container
  that was ALREADY exited**, so its output says nothing about whether
  anything moved and its exit code is 0 either way. A wrapper over it prints
  the same report whatever it found -- `panic.sh` produced byte-identical
  STDOUT across three preconditions (two exited containers, the same from a
  foreign cwd, and a project holding NO containers), the only variation
  being compose's own chatter on STDERR. That is the design working, and it
  also means its stdout is not evidence that it acted. The verdict is a
  state read-back taken either side, and the precise one is
  `ps --status running --status restarting --status paused`: `running` alone
  answers no about a container coming back under a restart policy or a
  paused one that resumes the moment it is unpaused. Capture the three
  streams separately.
- **`docker compose --profile '*' rm -f` is the non-destructive way to reach
  a "no containers at all" precondition.** Without `-v` it leaves the named
  volumes, and a later `up -d --wait` recreates both containers with every
  workflow id, active flag, credential, execution row and Postgres row
  intact -- cheaper and more reversible than a `down -v`, which destroys the
  encryption key along with the volume.

### What the n8n CLI will and will not do

- **`n8n execute` runs only a three-element allowlist.** `findWorkflowStart`
  (`dist/utils.js`, 2.15.1, off the image) takes `executeWorkflowTrigger`,
  then `STARTING_NODES` -- two manual starters and nothing else -- so a
  schedule- or webhook-only workflow is refused `Missing node to start
  execution` at exit 1, AFTER the broker-port override cleared the port
  collision. Two exits of 1 for unrelated reasons on one command, so the
  MESSAGE and never the code is the reading. `findSubworkflowStart` is the
  same function under another mode and `execute-batch` calls it too, so
  neither a batch run nor an Execute Workflow node is a way round. The way
  that works (`docs/CHECKPOINT-2.md` Part 6) needs an instance OWNER where
  the import verbs do not, and `/executions/{id}/retry` is not a second way
  in.
- **A CLI's `--help` flag list is not a contract and its exit code is often
  not the answer, and the reading is PER VERB.** On this image unknown flags
  are silently IGNORED, and two verbs print their refusal to STDOUT at exit
  0 while sibling verbs in the same binary exit 1 correctly -- so no single
  probe generalises. Measure per verb with the exit code captured
  separately (what a missing required flag does, what an unknown flag does,
  which stream the refusal lands on), and have the wrapper assert on the
  WORK rather than on the code.
- **`DELETE /rest/workflows/{id}` answers 400**; a workflow must be archived
  first, so the working pair is `POST /rest/workflows/{id}/archive` then
  `DELETE`, both 200. A file `docker cp`ed into the container is root-owned
  and the node user cannot remove it -- `docker exec -u root`.

### Reading the instance's own state

- **Two sqlite schema traps.** `user` has NO `role` column (it is
  `roleSlug`, `global:owner` on the shell owner a first boot writes), and
  sharing is PROJECT-scoped: `shared_credentials` and `shared_workflow`
  carry a `projectId`, never a `userId`.
- **`updatedAt` is a DEAD witness in two places**, each measured either side
  of an operation that really happened. A credential re-import moves NEITHER
  `createdAt` NOR `updatedAt` -- the salted ciphertext (same length, new
  head) is the only field that changes -- which, with the workflow half's
  `versionId` witness, means the two rows whose `updatedAt` DOES move after
  a bootstrap are the ones the ACTIVATION and the publish touched, not
  either import. A public-API DEACTIVATE does not move
  `workflow_entity.updatedAt` either: what moves is `active` (1 -> 0) and
  `activeVersionId` (a uuid -> null), while `versionId` is PRESERVED. That
  is the mechanism behind "deactivated stays re-armable" -- the version that
  was active is still named on the row, so a later `activate-workflows.sh`
  reports `already current` and republishes it rather than seeding history
  again. Date a disarm from an execution row or the log, never from
  `updatedAt`.
- **`workflow_history` IS pruned to ONE row per workflow** (the current
  `versionId`) on the community edition, silently and with no log line --
  but the prune is NOT a restart-time operation on 2.15.1: after a second
  import plus restart the table still held two rows per workflow 54s after
  the restart and again minutes later on a healthy instance. So a count read
  either side of a restart is not a precondition anything can use. To plant
  a MISSING history row, clear `active` and `activeVersionId` first (the
  foreign key refuses the delete otherwise); `publish:workflow`'s refusal
  lands on STDOUT with stderr empty at exit 1.
- **A schedule trigger fires at the next matching wall-clock boundary after
  REGISTRATION** and never at registration, so time-to-first-pass is uniform
  in [0, interval). Registration is witnessed by the `Activated workflow
  "<name>" (ID: <id>)` log line about 3s after SIGTERM. Scheduled and
  hand-started passes enter the identical node graph; `execution_entity.mode`
  (`trigger` vs `manual`) is the only thing separating them afterwards.
- **A reading taken in the EDITOR UI is not evidence about what an artifact
  declared**, because two mechanisms manufacture a bound-looking credential
  field from an unbound one. `import:workflow` REMAPS a credential reference
  whose id does not resolve onto an existing credential of the same TYPE
  with the same NAME, rewriting the stored id (measured on a copy never
  opened in a browser), so an import is not a faithful record of the ids it
  was fed. Separately, OPENING a node's NDV auto-selects the sole credential
  of its type and SAVES it, so a UI reading is not read-only and the one
  node you clicked gains a binding the import never wrote. Only a reference
  whose id AND name both fail to resolve renders as missing
  (`node-credentials-empty-state`, input disabled at placeholder "No
  credentials yet", beside `setup-credential-button`). The discriminator
  worth automating is id MEMBERSHIP -- every node's credential id against
  the id set from `GET /rest/credentials` -- or behaviour, an execution row
  that got through a credentialled node.
- **The editor can be driven for real with the playwright installed in
  `packages/ui`** (a probe must LIVE in that package to resolve it, and be
  deleted in the command that finishes with it). Two pieces of instance
  state are needed first, and the one script here creating either is
  `scripts/scratch-instance.ts`, which sets an owner up on the scratch
  instance alone and dismisses no survey: an owner
  (`POST /rest/owner/setup`, else `/setup` redirects) and a dismissed
  personalization survey (`POST /rest/me/survey`, else the modal covers the
  canvas and a screenshot shows only the modal). Node handles are
  `[data-test-id="canvas-node"][data-node-name="<name>"]`, double-click
  opens the NDV, and a node with unsatisfied requirements carries
  `[data-test-id="node-issues"]`. A workflow opened within a second or two
  of its import redirects to `/entity-not-found/workflow`, and the identical
  navigation succeeds on a retry.
- **This instance holds NO public-API key** (`user_api_keys` empty) and the
  owner password is recorded nowhere, so a task needing `AR_N8N_API_KEY` has
  to manufacture a session: save the owner's bcrypt hash out of the
  container's sqlite, overwrite it with one computed by the container's own
  `bcryptjs`, `POST /rest/login` (body
  `{"emailOrLdapLoginId":...,"password":...}`) for a cookie, `POST
  /rest/api-keys` with an explicit `scopes` array for a `public-api` JWT in
  `rawApiKey`, then RESTORE the hash at once and delete the key row when
  finished. Scopes are ENFORCED, so a key minted for reading and
  (de)activating answers 403 on `POST /api/v1/workflows` -- ask for what you
  need, or take the control over a COPY of the database instead. That a
  session is takeable from file access at all is a reason this stack
  publishes on loopback.

### Reading a container from this sandbox

- **`docker logs` CANNOT be split by stream here.** Every redirection form
  answers the identical whole log: `2>/dev/null`, `2>&1 >/dev/null | cat`
  and a bare `2>&1` each produced the identical capture off one container,
  and the fold does NOT double a line. So a per-stream count taken here is
  not a per-stream count, and the safe shape for a script comparing two log
  readings is to fold `2>&1` into BOTH so they are over one view whatever
  the mechanism.
- **A "state left behind" note from an EARLIER section of a measurements
  file is not a precondition a later one can trust**: one section recorded
  keeping a named volume on purpose and it was gone by the next. Re-read the
  container, volume and row state at the START of any operator-run section
  and record what you actually found -- a cold instance and an inherited one
  change which read-back branch (`created` vs `rewritten`/`reimported`) the
  run can exercise at all, and a cold one cannot reach the branch the
  scripts' verdicts rest on. Run each command TWICE and take the second
  run's reading too.

### What sourcing the scratch env file does to the other scripts

- **`scripts/test-stack.sh up` writes `.tmp/scratch/env`, and a shell that
  sources it sends every flagless compose call to the `ar-scratch`
  project.** The file exports `COMPOSE_PROJECT_NAME=ar-scratch` and a
  `COMPOSE_FILE` naming both compose files by absolute path, which compose
  reads whenever a call carries no `-p` and no `-f`. A RELATIVE
  `COMPOSE_FILE` would not do: measured, it rendered the scratch stack
  from this package's root and refused from `/tmp` with `stat
  /tmp/docker-compose.yml`. With the stack up and the file sourced, a
  `--dry-run` of the stop `scripts/panic.sh` takes, of step 1 of
  `scripts/bootstrap.sh` and of `bun run n8n:start`'s command each named
  `ar-scratch-postgres` and `ar-scratch-n8n` and no dev container, from
  this root and from the repository root alike. Flags still win over both
  settings, which is why `test-stack.sh` itself passes `-p ar-scratch` and
  both `-f` on every call. The file also exports `DATABASE_URL`,
  `AR_N8N_URL`, `AR_N8N_API_KEY` and `AR_N8N_CONTAINER`, and an exported
  `DATABASE_URL` is the one a `bun` run reads over the one in `.env`,
  measured with `bun -e` from this root.
- **`scripts/panic.sh` run from that shell stops the SCRATCH stack and not
  the dev one.** Measured from `/tmp` against a freshly brought-up scratch
  stack: the API leg took `AR_N8N_URL` as naming an instance and listed
  the scratch n8n (`0 on the instance, 0 disarmed, 0 already inactive, 0
  still armed`), the stop named the two scratch containers and both read
  `exited` afterwards, the run exited 0, and `ar-n8n` and
  `service-postgres-1` kept their ids, `Created` and `State.StartedAt`. So
  a panic meant for the dev stack comes from a shell that never sourced
  the file. Its closing lines still say `bun run n8n:start` puts the stack
  back, which from that shell starts the scratch copy. Read off the code
  and not run: on a scratch instance holding ARMED workflows, the API leg
  meets a key minted with `workflow:list` alone, which answered 403 on a
  deactivation, so `panic-external.ts` reports each armed workflow STILL
  ARMED and `panic.sh` exits 1 after stopping the containers regardless.
  The stop that holds for the scratch stack is `down`.
- **`scripts/bootstrap.sh` run from that shell bootstraps the SCRATCH
  instance.** Each of its steps reaches the scratch project through a
  setting the file exports. Step 1 is the flagless compose call above. The
  migration, the `llm` connector row and the `ar-postgres` credential read
  `DATABASE_URL`, whose `127.0.0.1` host `postgresCredentialData` rewrites
  to `postgres` while keeping 55432, the port the overlay has the scratch
  Postgres listen on inside its container. The two imports, the activation
  and the restart read `AR_N8N_CONTAINER`, each script taking `ar-n8n`
  only as its default. It still wants `AR_LLM_API_KEY` and
  `AR_LLM_ENDPOINT` from `.env` or the shell, which the env file does not
  carry. Measured from a shell that sourced the file, a full run exited 0:
  step 1's stderr named only the two scratch containers, step 8 restarted
  `ar-scratch-n8n`, and the dev project's two containers, already stopped,
  stayed `exited` with their `State.StartedAt` and volumes unmoved. The
  same run with `AR_LLM_ENDPOINT` unset imported both credentials and all
  six workflows, then refused at step 6 and exited 1 before activating
  anything, which leaves an UNARMED instance that
  `scripts/verify-external.sh` reads as unhealthy. A complete run leaves
  `ar-dispatch`'s hourly Schedule Trigger armed on `ar-scratch-n8n` until
  the scratch stack is taken down, so an execution count taken either side
  of anything moves on the hour by itself. Attribute a change by its
  `execution_entity` rows (`workflowId`, `mode`, `startedAt`), read from
  the instance's sqlite opened read-only inside `ar-scratch-n8n`: the
  minted key carries `workflow:list` alone, no scope over executions.
- **`down` removes the file and not a shell's copy of it.** A shell that
  sourced the file keeps all six settings after the teardown, so its
  compose calls go on addressing an `ar-scratch` project that holds
  nothing and its `AR_N8N_URL` names a port nothing listens on. Close that
  shell, or unset the six, before running anything from it that is meant
  for the dev stack. The `env` verb is the guard on the way in: it prints
  the path only while both scratch containers are running under the
  project's label, and measured after that panic it refused with nothing
  on stdout, so `. "$(scripts/test-stack.sh env)"` fails on an empty name
  rather than sourcing a stale file.
- **The anonymous volume an image's `VOLUME` mints carries no compose
  project label**, so a teardown read-back filtering volumes on
  `com.docker.compose.project` answers empty whether that volume survived
  or not. Measured on the scratch Postgres: its volume carried
  `com.docker.volume.anonymous` and nothing else, while the network and
  both containers carried the project label. So `scripts/test-stack.sh`
  also reads, in `down`, which volumes the project's containers mount
  before removing them, and asks after each by name; a copy of it with
  `--volumes` dropped exited 1 naming the survivor while the label filter
  read zero. What neither reading reaches is a volume orphaned by an
  EARLIER teardown that took its container without it, which only a sorted
  `docker volume ls -q` taken either side of the run shows.
