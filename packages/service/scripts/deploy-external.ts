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
 * guarded so that importing this module runs none of it. Both arrive
 * next in this stage, along with the refusal for a missing setting;
 * `assertCleanTree` and `DirtyTreeError` below are the dirty-tree
 * half, and they are what a deploy meets first.
 */

import { gitStatusPorcelain } from './build-workflows.js';

/**
 * Why a deploy cares, appended to both refusals below.
 *
 * Carried once rather than written into each message, for the reason
 * `approve.ts` gives for appending its usage line in one place: a
 * refusal added later cannot leave it out. It is the argument
 * `gitBuildTag` in `build-workflows.ts` makes from the stamp's end,
 * stated here as what it costs — `-dirty` is not injective, so two
 * artifacts built from two different trees at one commit carry the
 * identical stamp while differing in content.
 */
const STAMP_AT_STAKE =
  'An artifact leaves the tree that built it, and on the far side its ' +
  'build stamp is the only handle back to a commit: `-dirty` is one ' +
  'suffix for every uncommitted state, so it names a commit without ' +
  'describing what was uploaded.';

/**
 * Thrown when a deploy is asked of a tree that is not known to be
 * clean.
 *
 * Two states under one class, and the fold is the package's own
 * reading rather than a convenience here. A tree carrying uncommitted
 * work and a tree git could not be asked about are both trees a stamp
 * cannot vouch for, and `gitBuildTag` in `build-workflows.ts` already
 * writes `-dirty` for each of them. What the two do not share is the
 * edit they ask for, so they are told apart in the message and in
 * {@link DirtyTreeError.changes} rather than by a second class.
 *
 * A distinct class rather than a bare `Error`, so a case covering a
 * refused deploy can pin the refusal to it. Nothing else on this path
 * raises anything today: `gitStatusPorcelain` reports every way the
 * call can fail as `null` rather than by throwing, which is what
 * leaves this the only outcome to distinguish. The steps a deploy
 * takes after it — the build, the projection and the calls — each
 * carry refusals of their own, and those arrive with `deploy` later
 * in this stage.
 *
 * Nothing stands behind it, which is the other half of why it is a
 * class and not a warning. Measured over a tree with uncommitted work
 * in it: the build ran, reported success and stamped the commit with
 * `-dirty` behind it, and neither the projection nor the public API
 * reads a stamp at all. So the artifact that reaches an instance is
 * well-formed, accepted, and describes a tree no commit holds — and
 * the only reader who could ever notice is somebody holding that
 * canvas against a repository that never carried it.
 *
 * Both of its values are enumerable own properties, so a
 * `JSON.stringify` over one prints them — alongside the class name,
 * which `this.name` assigns as a third — and leaves out `message` and
 * `stack`, which are not. Measured on both branches rather than
 * carried over from the sibling that words it the same way. That is
 * deliberate and it diverges from `UnsuccessfulReplyError` next door,
 * which keeps an operator's base URL out of what it carries: these
 * two name a LOCAL checkout and the work sitting in it, and a refusal
 * that would not say which files are dirty leaves a reader nothing to
 * act on. Neither value is read from configuration, so no credential
 * reaches either one by any route.
 */
export class DirtyTreeError extends Error {
  /**
   * The directory git was asked from, named because a refusal about
   * the wrong checkout is otherwise indistinguishable from one about
   * this one.
   *
   * It is where the question was PUT and never what was in scope:
   * {@link gitStatusPorcelain} answers about the whole repository, so
   * a file that dirtied this tree may sit nowhere near this path.
   */
  readonly root: string;

  /**
   * The porcelain listing, quoted whole, or `null` for a status that
   * could not be answered.
   *
   * The one member that parts the two states this class covers, which
   * is why it is here rather than folded into the message alone.
   * Quoted whole rather than counted or truncated: the listing names
   * the files, and naming them is the whole of what turns the refusal
   * into an edit.
   */
  readonly changes: string | null;

  /**
   * @param root - The directory git was asked from.
   * @param changes - What `git status --porcelain` printed, or `null`
   *   when the status could not be answered.
   */
  constructor(root: string, changes: string | null) {
    super(
      changes === null
        ? `Whether the working tree at ${root} is clean could not ` +
          'be established: `git status --porcelain` did not answer, ' +
          'so this deploy is refused before anything is built. ' +
          `${STAMP_AT_STAKE} Check that git is on PATH and that the ` +
          'path above is a readable checkout; a corrupt index answers ' +
          'this way while `git rev-parse` still names a commit.'
        : `The working tree at ${root} carries uncommitted work, ` +
          'so this deploy is refused before anything is built. ' +
          `\`git status --porcelain\` reported:\n${changes}\n` +
          `${STAMP_AT_STAKE} Commit or stash that work, or run the ` +
          'deploy from a checkout that is clean.',
    );
    this.name = this.constructor.name;
    this.root = root;
    this.changes = changes;
  }
}

/**
 * Refuse a deploy from a tree that is not known to be clean.
 *
 * Before anything is built and before any request is made, and the
 * order is the point rather than tidiness. An upload cannot be taken
 * back — a workflow that reached an instance is on it, inert but
 * present, and undoing that is an operator's job on the far side.
 * Running first is what keeps the cost of being dirty a refusal on
 * this machine instead.
 *
 * The answer would not move if it ran later, which is worth knowing
 * so that nobody reorders it on the strength of a fear it does not
 * have to carry: both directories a build writes to are gitignored by
 * anchored paths in the repository's own `.gitignore`, so the deploy
 * build cannot dirty the tree this vouched for. Measured either side
 * of an `--external` build that wrote an artifact: the porcelain
 * listing came back byte-identical. What running first buys is what
 * has been SPENT by the time the answer is read, not the answer.
 *
 * A status that could not be answered is refused rather than passed,
 * and this is where the reading `gitBuildTag` in `build-workflows.ts`
 * gives that case gets paid for. The absence of a change list is not
 * evidence of a clean tree; it is the absence of evidence either way,
 * and a deploy is the step with nothing behind it to catch a wrong
 * guess.
 *
 * How much it refuses is argued at the top of this file rather than
 * here: the reading is repository-wide and counts untracked files, so
 * a scratch file no build ever opens is enough to stop a deploy. That
 * is more than the property strictly needs and never less, which is
 * the direction to be wrong in when being wrong the other way is what
 * cannot be undone.
 *
 * @param root - A directory inside the checkout to ask git from,
 *   resolved as a `cwd` and so never safely empty or relative. The
 *   cost of getting that wrong is steeper here than at
 *   `gitBuildTag`, where a root naming another checkout mislabels
 *   an artifact: here it clears or refuses a deploy on the strength
 *   of a tree nobody was asking about.
 * @throws DirtyTreeError When the tree carries uncommitted work, and
 *   when whether it does could not be answered.
 */
export function assertCleanTree(root: string): void {
  const changes = gitStatusPorcelain(root);

  if (changes !== '') {
    throw new DirtyTreeError(root, changes);
  }
}
