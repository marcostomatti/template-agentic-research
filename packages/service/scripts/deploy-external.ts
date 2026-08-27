/**
 * @packageDocumentation
 * Uploads this package's built workflows to an n8n instance that
 * already exists, over the public REST API that instance exposes. Its
 * whole reach is what that one API accepts: no container is started
 * or entered, no compose file is read, and no shell is opened on the
 * host being deployed to. The absence is what the command is FOR
 * rather than a convenience of it — a deploy that reached for a
 * container could only ever reach a machine this port stands up
 * itself, and an instance somebody else operates is the case this one
 * exists to cover.
 *
 * The sibling on the other side of that line is
 * `activate-workflows.sh`, which reaches a LOCAL instance through the
 * n8n CLI and so wants the container this one does without. It
 * arrives later in this stage, as does `audit-workflows.ts`.
 *
 * What it uploads is the `--external` build's output,
 * `workflows/dist-external/`, rather than `workflows/dist/`. That is
 * one choice and not two: `build-workflows.ts` pairs the output
 * directory with the settings chain in a single value, so a caller
 * asking for settings resolved against a real environment has asked
 * for that directory by the same act. A deploy is the caller that
 * pairing was written for. Nothing in it moves the source of record
 * either — `workflows/src/` holds the workflows, and the instance is
 * a deploy target rather than a source, which
 * `workflows/src/README.md` states with the canvas round trip it
 * exists to refuse.
 *
 * An upload is not an activation. `POST /workflows` assigns `active`
 * false over whatever the body carried and mints a `versionId` of its
 * own — read out of the handler n8n 2.15.1 ships rather than from
 * documentation about the API — so a workflow that arrives is on the
 * instance and inert until something arms it. That is the API's
 * behaviour and not a choice of this command's, and it is why an
 * operator who has run a deploy has not yet run anything.
 *
 * A dirty tree is refused, before anything is built and before any
 * request is made. `gitBuildTag` in `build-workflows.ts` argues that
 * refusal from the STAMP's end, where it is what a label that
 * forgiving warrants; this is the end where it is paid for. An
 * artifact leaves the tree that made it, and on the far side the
 * stamp is the only handle back to a commit that whoever holds the
 * instance is left with, nothing over there being re-derivable from
 * what arrived. That the suffix is one text for every uncommitted
 * state is a limit `gitBuildTag` records on itself; what it costs is
 * paid here, as an instance running something no commit describes,
 * found later by somebody holding a canvas against a repository that
 * never carried it.
 *
 * The refusal is blunter than the property, deliberately.
 * `git status --porcelain` reports the whole REPOSITORY wherever it
 * is run from, and untracked files count toward it, so a scratch file
 * no build ever opens is enough to stop a deploy: what is being read
 * is the tree standing still, not the sources this build read.
 * Narrowing it to those sources would take a pathspec per input, and
 * would then go quiet about the one file a reader most needs named.
 * So it refuses more than it strictly has to and never less, which is
 * the direction to be wrong in when being wrong the other way is the
 * thing that cannot be undone.
 *
 * A deploy is also where both of this package's configuration chains
 * are resolved in one run, and what parts them is where a value
 * LANDS. The build settings are `ENV_DEFAULTS` in
 * `workflow-markers.ts`, reached through `__ENVVAR:` markers and
 * baked INTO the artifact, which is why an `--external` build
 * resolves them from the environment and an ordinary build never
 * does. The service settings are the zod schema in `src/config.ts`,
 * and the two wanted here, `AR_N8N_URL` and `AR_N8N_API_KEY`, address
 * the request rather than being written into anything it sends. Both
 * are optional there because the running service opens neither, which
 * is what leaves the refusal for an absent one to this command.
 *
 * Neither the calls nor the projection is written again here.
 * `n8n-client.ts` holds the four HTTP calls and the refusal for a
 * reply that is not a success, and `toApiWorkflow` in
 * `n8n-workflow.ts` cuts a built artifact down to the members the API
 * accepts; this module is the sequence those are steps in. `deploy`
 * runs that sequence and `runDeployCli` is the command line over it,
 * guarded so that importing this module runs none of it. They arrive
 * next in this stage, with the two refusals above.
 */
