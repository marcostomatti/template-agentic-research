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
 * arrives later in this stage. `audit-workflows.ts` sits on this side
 * of the same line and has opened, though what it reaches an instance
 * with is its own command line, still to come.
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
 * `n8n-client.ts` holds every HTTP call this package makes against an
 * instance and the refusal for a reply that is not a success, three
 * of which a deploy uses; `toApiWorkflow` in `n8n-workflow.ts` cuts a
 * built artifact down to the members the API accepts; this module is
 * the sequence those are steps in. {@link deploy} runs that sequence,
 * {@link runDeployCli} is the command line over it, and the guard
 * beneath that one is what leaves importing this module running none
 * of it.
 *
 * The two refusals that sequence is worth having in front of it are
 * `assertCleanTree`, which refuses a tree no commit accounts for,
 * and `requireInstance`, which refuses a deploy with no instance
 * configured to send one to. Neither reads the other, and what they
 * share is that both answer before anything is built and before any
 * request is made, which is the whole of what makes a refusal here
 * free.
 *
 * The order they run in is `deploy`'s and not either of theirs.
 * `requireInstance` goes first because it is the one that ANSWERS
 * with something, the instance every call afterwards is made
 * against, so it is the first step of the sequence rather than a
 * check in front of one. What that costs is that an operator whose
 * environment names no instance AND whose tree is dirty is told
 * about the first of those and finds the second on the next run;
 * what it does not cost is anything spent, both being decided
 * before a build has run.
 */

import type { HttpFetch, N8nInstance, RemoteWorkflow } from './n8n-client.js';
import type { ApiWorkflow, BuiltArtifact } from './n8n-workflow.js';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { config } from '../src/config.js';

import {
  EXTERNAL_FLAG,
  WORKFLOW_EXTERNAL_DIST_DIR,
  gitStatusPorcelain,
  isBuildRefusal,
  runBuildCli,
} from './build-workflows.js';
import {
  UnsuccessfulReplyError,
  createWorkflow,
  listWorkflows,
  updateWorkflow,
} from './n8n-client.js';
import { toApiWorkflow } from './n8n-workflow.js';

/**
 * Why a deploy cares about a stamp, appended to both branches of
 * {@link DirtyTreeError}'s message.
 *
 * Carried once rather than written into each branch, for the reason
 * `approve.ts` gives for appending its usage line in one place: a
 * branch added later cannot leave it out. It is the argument
 * `gitBuildTag` in `build-workflows.ts` makes from the stamp's end,
 * stated here as what it costs — `-dirty` is not injective, so two
 * artifacts built from two different trees at one commit carry the
 * identical stamp while differing in content.
 *
 * It reaches that one class and no further. The file's other
 * refusal class, {@link UnconfiguredInstanceError}, says nothing
 * about a stamp and should not: nothing has been built when it
 * fires, a deploy with nowhere to send an artifact having had no
 * reason to make one. Nor do the plain `Error`s {@link deploy}
 * raises over the artifacts it read and the names it found, each of
 * which is about a source or an instance rather than about a
 * tree.
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
 * refused deploy can pin the refusal to it. Nothing the tree
 * question reads raises anything of its own: `gitStatusPorcelain`
 * reports every way the call can fail as `null` rather than by
 * throwing, which is what leaves this the only outcome it produces.
 * The other pre-flight beside it, {@link UnconfiguredInstanceError},
 * has a class of its own for the same reason and is about something
 * else entirely. The steps {@link deploy} takes after the two carry
 * refusals of their own and none of them is a class: a build raises
 * whatever a marker or a launcher refusal is, reading an artifact
 * back raises a plain `Error` naming the file, and a call the
 * instance refused is `UnsuccessfulReplyError` in `n8n-client.ts`.
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

/**
 * The two settings a deploy needs in order to reach an instance, as
 * `src/config.ts` answers for them.
 *
 * Both `string | undefined`, which is the schema's own answer and
 * not a widening here. `AR_N8N_URL` and `AR_N8N_API_KEY` are
 * declared optional there because the running service opens neither,
 * so a boot parses an environment carrying neither and reports
 * nothing about it — which is what leaves the refusal to this
 * command, and why the shape a command reads is the shape a command
 * has to narrow.
 *
 * A bag of the two rather than the parsed config itself, so a case
 * can drive {@link requireInstance} over a pair it wrote by hand.
 * The schema parses `process.env` at import, so a parameter typed as
 * that value would make every case a statement about the environment
 * the suite happened to run in.
 */
export interface InstanceSettings {
  /** Whatever `AR_N8N_API_KEY` was set to, if anything. */
  readonly apiKey: string | undefined;

  /** Whatever `AR_N8N_URL` was set to, if anything. */
  readonly baseUrl: string | undefined;
}

/**
 * Whether a setting was answered for at all.
 *
 * Absent and set-to-blank are one answer, which is the reading
 * `resolveEnvVar` in `workflow-markers.ts` already gives the build
 * settings and is worth carrying across to these. A line in a `.env`
 * whose value has been deleted reads as a setting taken back OUT of
 * the file rather than as one set to the empty string, and nothing
 * downstream can tell those apart. Taken at face value, a blank base
 * URL builds every call onto `/api/v1` with no host in front of it
 * and a blank key sends the header with nothing in it, so what an
 * operator gets back is a fetch failure or a `401` about a value
 * they can already see is empty.
 *
 * The trim is the TEST and never the answer. Nothing here rewrites a
 * setting: what was configured is what reaches the instance, and
 * `apiRoot` in `n8n-client.ts` is where a base URL that carries a
 * trailing slash or a stray space is dealt with.
 *
 * It is written as a predicate because the answer has to survive
 * into the tail of {@link requireInstance}, where the two settings
 * are read as the `string` an {@link N8nInstance} declares. The
 * predicate is narrower than the type it asserts: it takes
 * `undefined` off, and the blank it also refuses is a `string` that
 * no type here can exclude — so what a caller may conclude from a
 * `true` is everything this function tested, and what the compiler
 * carries away from it is the smaller half.
 *
 * @param value - The setting as configuration answered for it.
 * @returns Whether it is present and not blank.
 */
function isSet(value: string | undefined): value is string {
  return value !== undefined && value.trim() !== '';
}

/**
 * Thrown when a deploy is asked of an environment that names no
 * instance to deploy to.
 *
 * It carries every setting that went unanswered rather than the
 * first of them, and the plural is the ordinary case rather than an
 * edge of it: an operator who has set neither is one who has not
 * configured this command at all, and a refusal naming one of two
 * buys a second run to learn the other. That is the reading
 * `SeedValidationError` gives in `seed.ts`, applied to a roster of
 * two, and it is why {@link UnconfiguredInstanceError.settings} is
 * a list rather than a name.
 *
 * It is raised for two commands and not one. `audit-workflows.ts`
 * reaches {@link requireInstance} for the same reason a deploy does
 * and stops on the same refusal, which is why nothing in the message
 * names a deploy or a build: what an operator holding it has to do
 * is the same either way, and a sentence naming the wrong command
 * would be the one thing in it they could not act on.
 *
 * A distinct class rather than a bare `Error`, so a case covering a
 * deploy that was never configured can pin the refusal to it. The
 * other ways this path fails all have names of their own or none:
 * {@link DirtyTreeError} above is the tree, `UnsuccessfulReplyError`
 * in `n8n-client.ts` is a call the instance refused, an artifact
 * that is not a workflow and a name two artifacts or two remote
 * workflows share are plain `Error`s out of {@link deploy}'s own
 * steps, and a body that cannot be read arrives as `Error` or as
 * `JSON.parse`'s own `SyntaxError`. An assertion taking any `Error`
 * would pass for the last of those.
 *
 * It is also a different class from `UnresolvedSettingError` in
 * `workflow-markers.ts`, and the two are not variants of one idea.
 * That one is raised while an artifact is being BUILT, over a name
 * a `__ENVVAR:` marker wrote and `ENV_DEFAULTS` has no text for, and
 * the edit it asks for is to that table. This one is raised before
 * anything is built, over a name the zod schema in `src/config.ts`
 * declares and an environment did not answer, and the edit it asks
 * for is to that environment. A deploy resolves both chains in one
 * run, so one class covering both would name the wrong file half the
 * time.
 *
 * Nothing it holds came from configuration. The setting NAMES are
 * this module's own, written here beside the members they test, and
 * the values are exactly what is missing — so there is no route by
 * which a key reaches the message, the stack or a `JSON.stringify`
 * over the error, which prints the one field alongside the class
 * name that `this.name` assigns. `UnsuccessfulReplyError` next door
 * has to argue that property from the request it built; here it is a
 * consequence of what the refusal is about.
 */
export class UnconfiguredInstanceError extends Error {
  /**
   * The names of the settings nothing was configured for, in the
   * order this module reads them: the instance before the key that
   * authenticates against it.
   *
   * Names and never values, and a list rather than one name. It is
   * the whole of what the message is built from, so a caller reading
   * the field and a reader reading the message are answering the
   * same question off the same value.
   */
  readonly settings: readonly string[];

  /**
   * @param settings - The names of every setting that was absent or
   *   blank, in reading order and at least one of them.
   */
  constructor(settings: readonly string[]) {
    const named = settings.join(' and ');
    const verb = settings.length === 1
      ? 'is'
      : 'are';

    super(
      `${named} ${verb} not set, so the command that asked for them ` +
      'is refused before it reads anything and before any request is ' +
      'made. The two settings are declared optional in ' +
      '`src/config.ts`, because the running service opens neither ' +
      'and a boot has nothing to refuse: ' +
      '`AR_N8N_URL` is the base URL of the public REST API the ' +
      'target instance exposes, and `AR_N8N_API_KEY` is the key ' +
      'that instance issued for these calls. Set them in the ' +
      'untracked environment, in `.env` or in the launching shell, ' +
      'and never in a tracked file. A setting that is present but ' +
      'blank is read here as unset, so a `.env` line with nothing ' +
      'after the `=` is one of these.',
    );
    this.name = this.constructor.name;
    this.settings = settings;
  }
}

/**
 * Refuse a deploy that has no instance configured, and hand back the
 * instance it cleared.
 *
 * It returns an {@link N8nInstance} rather than answering `void` the
 * way {@link assertCleanTree} does, and that is the load-bearing
 * decision here rather than a convenience. Every call in
 * `n8n-client.ts` takes one of those, and this is where one is made,
 * so a request that has not been through this refusal is not a
 * request this command can make. Refusing before any
 * request is attempted is then a property of the signature rather
 * than an order somebody has to keep, which is the same argument
 * {@link N8nInstance} makes for carrying its own fetch: a rule the
 * types enforce outlives a rule every caller has to remember.
 *
 * It is a property to keep rather than one the types hand over. That
 * interface is three members and an object literal satisfies it, so
 * a second assembly of them anywhere in this module would put a
 * request back outside the refusal, and no gate here would say so.
 *
 * The narrowing is the other half of it. Configuration answers
 * `string | undefined` for both settings, and a caller left holding
 * those has only a `??` or a `!` between it and a request built on a
 * blank — which is the silent failure this refusal exists to be
 * instead of. That is also why each setting is read through
 * {@link isSet} twice below: the composed test is what the compiler
 * narrows on, and the two beneath it are what name the offenders.
 * The duplication is control flow rather than a second rule, both
 * readings going through the one predicate, so there is no spelling
 * of `unset` here for the other to drift from.
 *
 * What it does NOT check is worth being plain about, because the
 * refusal reads stronger than it is. A base URL that is present and
 * names nothing, a key that is present and was revoked, an instance
 * that is simply down: every one of them passes here and comes back
 * from the far side as whatever the instance or the fetch answers,
 * which is `UnsuccessfulReplyError` in the cases where there was
 * something to answer. This refusal is about a value that was never
 * supplied, and about nothing else — a shape check here would be a
 * second opinion on a value only the instance can settle, which is
 * the reading {@link N8nInstance} states from the other end.
 *
 * @param settings - The two settings as configuration answered for
 *   them.
 * @param fetch - What the calls go through, taken as an argument so
 *   that a case drives them against a stub and the isolated suite
 *   stays isolated by construction.
 * @returns The instance those calls are made against.
 * @throws UnconfiguredInstanceError When either setting is absent or
 *   blank, naming every one that is.
 */
export function requireInstance(
  settings: InstanceSettings,
  fetch: HttpFetch,
): N8nInstance {
  const { apiKey, baseUrl } = settings;

  if (!isSet(baseUrl) || !isSet(apiKey)) {
    const missing: string[] = [];

    if (!isSet(baseUrl)) {
      missing.push('AR_N8N_URL');
    }

    if (!isSet(apiKey)) {
      missing.push('AR_N8N_API_KEY');
    }

    throw new UnconfiguredInstanceError(missing);
  }

  return { apiKey, baseUrl, fetch };
}

/**
 * What a deploy build wrote, as the step that ran it answers for
 * it.
 *
 * The directory and the file names in one value rather than two
 * options a caller has to keep in step, which is the shape
 * `BuildTarget` in `build-workflows.ts` takes for the same reason:
 * where a build writes and what it wrote there are one fact, and
 * splitting them leaves a way to ask for half of it.
 *
 * The files are what the build REPORTED writing rather than what
 * the directory holds, and the two are not the same list. A build
 * sweeps nothing, so an artifact whose source has since been
 * renamed or deleted stays where it lies and reads to a listing as
 * a built workflow. Uploading the reported list is what keeps a
 * deploy about the tree under review rather than about whatever an
 * earlier checkout left behind.
 *
 * A build given nothing reports no files, and a deploy over that
 * uploads nothing and reports nothing. It is not refused here: an
 * empty `workflows/src/` is a state `buildAll` in
 * `build-workflows.ts` answers for as an ordinary one, and a
 * command refusing it would be disagreeing with the build about
 * what a tree may hold.
 */
export interface DeployBuild {
  /** The directory the artifacts were written into. */
  readonly dir: string;

  /**
   * The file names it wrote, one per source built, in the order it
   * reported them.
   */
  readonly files: readonly string[];
}

/**
 * Everything {@link deploy} needs and nothing it can find out for
 * itself.
 *
 * Four values, and each is a thing this module deliberately does not
 * resolve: where the checkout is, what configuration answered for
 * the two settings, what does the talking, and how a build is run.
 * `buildAll` in `build-workflows.ts` takes its directories the same
 * way and for the same reason. The real values are the command
 * line's to supply, and a function that named them could be driven
 * only against the one tree and the one instance it named.
 *
 * {@link DeployOptions.build} is a function rather than a directory,
 * and that is the one of the four worth arguing. The deploy build is
 * `runBuildCli(['--external'])`, which constructs a
 * `Bun.Transpiler`: a thing that exists inside a bun process and not
 * inside a vitest worker, where a partial `Bun` global is installed
 * with no transpiler on it. Taking the build as an argument is what
 * leaves the sequence drivable from a case at all, and it is the
 * same seam `buildTemplate` opens with the loader it takes.
 */
export interface DeployOptions {
  /**
   * Runs the deploy build and answers with what it wrote.
   *
   * Called after both pre-flight refusals and before any request,
   * so a deploy that is going to be refused builds nothing.
   */
  readonly build: () => DeployBuild;

  /**
   * What every call goes through, threaded into the
   * {@link N8nInstance} {@link requireInstance} assembles.
   */
  readonly fetch: HttpFetch;

  /**
   * A directory inside the checkout to ask git about, resolved as a
   * `cwd` and so never safely empty or relative.
   */
  readonly root: string;

  /** The two settings as configuration answered for them. */
  readonly settings: InstanceSettings;
}

/**
 * What one artifact upload did, as a report an operator reads.
 *
 * Four members and no id. An id belongs to the instance that minted
 * it and is stable nowhere else, so it is a handle for the next call
 * rather than for a reader: {@link deploy} learns one where it needs
 * one and passes it no further.
 *
 * {@link DeployedWorkflow.armed} is here because an upload is not
 * an activation and that gap is what an operator most often misses.
 * `POST /workflows` forces `active` false whatever the body
 * carried, so a created workflow is never armed, while an updated
 * one is armed exactly as it already was. Either way this is read
 * back off what the instance answered rather than assumed from
 * which of the two calls ran.
 */
export interface DeployedWorkflow {
  /** Whether the instance has it armed now the upload has landed. */
  readonly armed: boolean;

  /** Whether this run created it rather than replacing one. */
  readonly created: boolean;

  /** The artifact it was uploaded from. */
  readonly file: string;

  /**
   * Its display name, as the artifact and the instance both hold
   * it.
   */
  readonly name: string;
}

/**
 * One built artifact, read back as the request that uploads it.
 *
 * The name is lifted out of the body rather than read off it again
 * later, because every step after this one wants it as a `string`
 * and {@link ApiWorkflow} carries it as `unknown`, the projection
 * forwarding what the artifact held and promising nothing about it.
 * Reading it once here is what leaves one place where an artifact
 * with no handle to upsert on is refused.
 */
interface DeployArtifact {
  /** The four members the API takes, projected off the artifact. */
  readonly body: ApiWorkflow;

  /** The file it was read from, named in a refusal and reported. */
  readonly file: string;

  /** Its display name, which is what the upsert matches on. */
  readonly name: string;
}

/**
 * Read one built artifact off disk as the request that uploads it.
 *
 * The read is not wrapped. A file the build reported and did not
 * write arrives as `readFileSync` raised it, naming the absolute
 * path, and one holding something that is not JSON arrives as the
 * `SyntaxError` `JSON.parse` raises. Neither is a state a deploy
 * can do anything about beyond naming the file, and both already
 * do.
 *
 * The parse is read as `unknown` and cast only after the one check
 * that earns the cast, which is the check `n8n-client.ts` makes of
 * a workflow an instance answered with: a non-null object that is
 * not an array. An array passes a bare object test and then answers
 * `undefined` for every member the projection reads, which is a
 * body the instance refuses about something else.
 *
 * A display name that is not a string is refused and a blank one is
 * not, which is the same line {@link requireInstance} draws. A
 * missing name is a workflow this command cannot match on and could
 * not find again; a blank one is a value only the instance can
 * settle, and a second opinion here would disagree with it the first
 * time either moved.
 *
 * @param dir - The directory the deploy build wrote into.
 * @param file - The artifact file name inside it.
 * @returns The request body, the file it came from, and the name it
 *   will be upserted on.
 * @throws Error When the artifact is not a workflow object, or
 *   carries no display name.
 */
function artifactOf(dir: string, file: string): DeployArtifact {
  const path = join(dir, file);
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(
      `${path} is not a workflow object, so there is nothing to ` +
      'project onto a request body. A built artifact is whatever ' +
      `its source serialized to, so the edit is to workflows/src/${file} ` +
      'and not to the artifact this read.',
    );
  }

  const body = toApiWorkflow(parsed as BuiltArtifact);

  if (typeof body.name !== 'string') {
    throw new Error(
      `${path} carries no display name, so there is no handle to ` +
      'upsert on and this deploy cannot tell whether the instance ' +
      'already holds it. Give the workflow a name in ' +
      `workflows/src/${file} and rebuild.`,
    );
  }

  return { body, file, name: body.name };
}

/**
 * Refuse a build whose artifacts do not each name a different
 * workflow.
 *
 * Two sources declaring one display name is the one way a FIRST run
 * creates something twice, and it defeats the upsert rather than
 * being caught by it. The listing is read once, before the first
 * upload, so the second artifact looks for a name the first has just
 * created and does not find it. The instance ends up holding two
 * workflows for two sources that meant to be one, and on every run
 * after that, one workflow for two sources that meant to be two.
 * Neither is a state the instance objects to.
 *
 * Refused rather than reported afterwards, because the cost lands
 * on the instance while the edit is in this repository: the fix is
 * to rename a workflow under `workflows/src/`, whose `README.md`
 * carries the roster those names come from. Every shared name is
 * named, for {@link UnconfiguredInstanceError}'s reason, a refusal
 * naming one of two buying a second run to learn the other.
 *
 * A plain `Error` rather than a class, on the split
 * `tests/invariants/schema-sql.ts` draws: a class is what lets a
 * case PIN a cause, and no case drives this port's sources into
 * declaring one name twice.
 *
 * @param artifacts - Every artifact this build is uploading.
 * @throws Error When two of them carry one display name.
 */
function assertDistinctNames(artifacts: readonly DeployArtifact[]): void {
  const byName = new Map<string, string[]>();

  for (const { file, name } of artifacts) {
    const files = byName.get(name) ?? [];

    files.push(file);
    byName.set(name, files);
  }

  const shared = [...byName]
    .filter(([, files]) => files.length > 1)
    .map(([name, files]) => `${name} (${files.join(', ')})`);

  if (shared.length > 0) {
    throw new Error(
      'more than one workflow source declares the same display ' +
      'name, so this deploy would put a second workflow on the ' +
      'instance rather than replace the first: the listing an ' +
      'upsert matches on is read once, before the first upload, so ' +
      'the second artifact does not find what the first just ' +
      'created. Rename one of each pair under workflows/src/. ' +
      `Shared names: ${shared.join('; ')}.`,
    );
  }
}

/**
 * Index what the instance is holding by display name.
 *
 * A name maps to a LIST of ids rather than to one, because an
 * instance is free to hold several workflows under a single name and
 * {@link listWorkflows} hands back the whole set rather than asking
 * the API to filter. Its `?name=` is a substring match, so matching
 * exactly is a caller's own, and a second workflow carrying the name
 * is visible here rather than merely absent.
 *
 * An entry whose name is not a string is passed over rather than
 * refused, which is exact rather than lenient: it can equal no
 * artifact name, so it is not a match this drops but one that was
 * never there. What an instance is doing holding such a workflow is
 * a question for an audit of that instance and not for a deploy.
 *
 * @param remote - Every workflow the instance answered with.
 * @returns The ids it holds under each name it holds any under.
 */
function remoteIdsByName(
  remote: readonly RemoteWorkflow[],
): ReadonlyMap<string, readonly unknown[]> {
  const byName = new Map<string, unknown[]>();

  for (const workflow of remote) {
    const { name } = workflow;

    if (typeof name === 'string') {
      const ids = byName.get(name) ?? [];

      ids.push(workflow.id);
      byName.set(name, ids);
    }
  }

  return byName;
}

/**
 * The instance id for the workflow named `name`, or `null` where it
 * holds none.
 *
 * `null` is the whole of what makes this an upsert: a name nothing
 * answers to is a workflow to create, and a name one workflow
 * answers to is a workflow to replace. Nothing else is read out of
 * an absence.
 *
 * A name several workflows answer to is refused instead. Updating
 * one of them is not an upsert but a choice made by whichever order
 * the instance answered in, and it leaves the rest running whatever
 * they were built from while this command reports a success. That
 * is the failure matching on a name exists to avoid, so it is the
 * one state here that cannot be carried on from.
 *
 * @param byName - The instance workflows indexed by name.
 * @param name - The display name to match exactly.
 * @returns The id to update at, or `null` to create at.
 * @throws Error When more than one workflow answers to the name, or
 *   when the one that does carries no id to address it by.
 */
function remoteIdFor(
  byName: ReadonlyMap<string, readonly unknown[]>,
  name: string,
): string | null {
  const ids = byName.get(name);

  if (ids === undefined) {
    return null;
  }

  if (ids.length > 1) {
    throw new Error(
      `the instance holds ${String(ids.length)} workflows named ` +
      `${name}, so an upsert on that name has no single one to ` +
      'update and would leave the rest running whatever they were ' +
      'built from. Remove the duplicates on the instance, or ' +
      'rename the workflow this port deploys under workflows/src/.',
    );
  }

  const [id] = ids;

  if (typeof id !== 'string') {
    throw new Error(
      `the instance answered with a workflow named ${name} that ` +
      'carries no id to address it by, so there is no path to ' +
      'update it at. Check that the base URL names an n8n instance ' +
      'and not something in front of one.',
    );
  }

  return id;
}

/**
 * Build this package's workflows and put every one of them on the
 * instance, creating what is not there and replacing what is.
 *
 * The sequence, in the order it runs: refuse a deploy with no
 * instance configured, refuse one from a tree no commit accounts
 * for, build, read each artifact back and project it onto a request
 * body, refuse a build whose artifacts collide by name, list what
 * the instance holds, and upsert one artifact at a time. Everything
 * ahead of the listing is decided on this machine, so a deploy that
 * one of those refuses makes no request whatsoever. The two refusals
 * past it read the listing, so they cost one GET and still land
 * ahead of the first upload.
 *
 * Upserting on the display NAME is the whole of how a rerun creates
 * nothing twice. An id belongs to the instance that minted it and
 * this repository holds none, so nothing in an artifact says which
 * workflow on an instance it is; the name is the only handle that
 * survives the trip, which is what {@link ApiWorkflow} says of its
 * own member from the other end. The listing is read once, ahead of
 * the first upload, and every match comes out of it.
 *
 * One at a time, in the order the build reported. A deploy of a
 * handful of workflows has nothing to gain from overlapping the
 * requests, and running them in sequence is what makes the report
 * an account of what happened rather than of what was started: a
 * refusal part way through leaves the artifacts ahead of it
 * uploaded and the ones behind it untouched, which is a state an
 * operator can read off the report and finish by rerunning.
 *
 * Nothing here arms anything. `POST /workflows` stores a workflow
 * inert whatever the body carried, so what a deploy leaves is an
 * instance holding this port's workflows and running none of them,
 * and {@link DeployedWorkflow.armed} is what says so per workflow.
 * Arming a LOCAL instance is `activate-workflows.sh`, which goes
 * through the n8n CLI and arrives later in this stage.
 *
 * What it does not do is notice anything an instance holds that this
 * build did not produce. A workflow deployed off an older checkout,
 * under a name no source carries any more, is untouched and
 * unreported, because a deploy reads the listing to match on and not
 * to judge. Reading an instance back whole is `audit-workflows.ts`,
 * which has opened; the command that does that reading arrives later
 * in this stage.
 *
 * @param options - Where the checkout is, what to reach and how,
 *   and how to run the build.
 * @returns One record per artifact uploaded, in build order.
 * @throws UnconfiguredInstanceError When either setting is unset.
 * @throws DirtyTreeError When the tree is not known to be clean.
 * @throws UnsuccessfulReplyError When the instance refuses a call.
 * @throws Error When an artifact cannot be read as a workflow, when
 *   two artifacts or two remote workflows share a name, and for
 *   whatever the build itself refuses.
 */
export async function deploy(
  options: DeployOptions,
): Promise<readonly DeployedWorkflow[]> {
  const { build, fetch, root, settings } = options;
  const instance = requireInstance(settings, fetch);

  assertCleanTree(root);

  const built = build();
  const artifacts = built.files.map((file) => artifactOf(built.dir, file));

  assertDistinctNames(artifacts);

  const byName = remoteIdsByName(await listWorkflows(instance));
  const deployed: DeployedWorkflow[] = [];

  for (const artifact of artifacts) {
    const id = remoteIdFor(byName, artifact.name);
    const stored = id === null
      ? await createWorkflow(instance, artifact.body)
      : await updateWorkflow(instance, id, artifact.body);

    deployed.push({
      armed: stored.active === true,
      created: id === null,
      file: artifact.file,
      name: artifact.name,
    });
  }

  return deployed;
}

/**
 * This package's root, and the checkout a deploy asks git about.
 *
 * Resolved from this file's own location rather than from the working
 * directory, so it names this tree however the process was started.
 * `build-workflows.ts` resolves every path it holds the same way, and
 * `seed.ts` the seed directory it ships, each off its own
 * `import.meta.url`.
 *
 * Absolute is what the argument needs rather than a tidiness.
 * {@link deploy} hands it on as a `cwd` — `gitStatusPorcelain` in
 * `build-workflows.ts` spawns git in it — so an empty or a relative
 * one answers about whatever checkout the process happened to start
 * in, and answers in exactly the same words. What a deploy would then
 * act on is a clean reading of the wrong tree.
 */
const PACKAGE_ROOT = fileURLToPath(new URL('..', import.meta.url));

/**
 * Run the deploy build and answer with what it wrote and where.
 *
 * The build is {@link runBuildCli} handed {@link EXTERNAL_FLAG}
 * rather than a command line of its own, which is the seam that
 * function's `argv` parameter exists for. So a deploy runs the build
 * `bun scripts/build-workflows.ts --external` runs, prints the lines
 * it prints, and stops on the things that stop it.
 *
 * The directory and the file names are answered together because they
 * are one thing to whoever reads them. {@link runBuildCli} reports
 * names alone, so a caller pairing them with a directory it resolved
 * for itself is a caller that can read one this build has stopped
 * writing to — and what a stale directory holds is an earlier
 * checkout's artifacts rather than nothing, the build sweeping
 * nothing on its way through.
 *
 * @returns The directory the build wrote into and the file names it
 *   wrote, in the order it reported them.
 */
function runDeployBuild(): DeployBuild {
  return {
    dir: WORKFLOW_EXTERNAL_DIST_DIR,
    files: runBuildCli([EXTERNAL_FLAG]),
  };
}

/**
 * The two settings as `src/config.ts` answered for them.
 *
 * Read through the schema rather than off `process.env`, so this
 * command and the running service resolve one setting the same way
 * and a malformed environment is refused once, at import, by the
 * schema that owns it — the arrangement `seed.ts` and `approve.ts`
 * both give for `DATABASE_URL`.
 *
 * Nothing is refused here, though. Both entries are optional over
 * there because the service opens neither, so what an unset one costs
 * is {@link requireInstance}'s to say, and it says it before a build
 * has run.
 *
 * @returns Both settings, either of them possibly unset.
 */
function configuredInstance(): InstanceSettings {
  return {
    apiKey: config.AR_N8N_API_KEY,
    baseUrl: config.AR_N8N_URL,
  };
}

/**
 * Everything {@link deploy} cannot find out for itself, with a
 * command line's answers in it.
 *
 * The one function that fills all four seams in, which is the whole
 * of what parts a run from a case: the checkout is this package, the
 * settings are configuration's, the talking is the global `fetch`,
 * and the build is the deploy build. {@link runBuildCli} gathers its
 * own directories in one function for the same reason.
 *
 * The global fetch arrives here rather than as a default on
 * {@link N8nInstance}, which is the decision that interface argues
 * from its own end: a default there would leave the isolated suite's
 * isolation to every case remembering to override it, where this way
 * a case supplying its own options has nothing to talk to unless it
 * says so.
 *
 * @returns The four, with their real values in them.
 */
function commandLineOptions(): DeployOptions {
  return {
    build: runDeployBuild,
    fetch,
    root: PACKAGE_ROOT,
    settings: configuredInstance(),
  };
}

/**
 * One deploy end to end: build, upload every artifact, report what
 * landed.
 *
 * The report is a line per artifact and then a count, in the order
 * {@link deploy} answered, which is the order the build reported.
 * Each line says which of the two calls ran and whether the instance
 * has that workflow armed now, and neither is inferable from the
 * other: a created workflow is never armed, `POST /workflows` storing
 * it inert whatever the body carried, while an updated one is armed
 * exactly as it already was.
 *
 * Nothing here names the instance. Its base URL is the one thing
 * about an operator's own deployment this command holds, and
 * `UnsuccessfulReplyError` in `n8n-client.ts` keeps it out of a
 * refusal for that reason — a report is read wherever a refusal is.
 *
 * A build that wrote nothing is reported rather than refused, which
 * is what {@link DeployBuild} says of an empty `workflows/src/`
 * carried through to the line an operator reads. The listing still
 * happened, {@link deploy} reading it before it knows how many
 * artifacts there are, so what the line says is that nothing was
 * deployed and not that nothing was done.
 *
 * @param options - Where the checkout is, what to reach and how, and
 *   how to run the build. Defaults to what a command line answers
 *   for; a caller handing over its own is what makes this drivable
 *   with no checkout, no instance and no bun.
 * @returns One record per artifact uploaded, in build order.
 * @throws UnconfiguredInstanceError When either setting is unset.
 * @throws DirtyTreeError When the tree is not known to be clean.
 * @throws UnsuccessfulReplyError When the instance refuses a call.
 * @throws Error When an artifact cannot be read as a workflow, when
 *   two artifacts or two remote workflows share a name, and for
 *   whatever the build itself refuses.
 */
export async function runDeployCli(
  options: DeployOptions = commandLineOptions(),
): Promise<readonly DeployedWorkflow[]> {
  const deployed = await deploy(options);

  for (const workflow of deployed) {
    const verb = workflow.created
      ? 'created'
      : 'updated';
    const state = workflow.armed
      ? 'armed'
      : 'inert';

    console.log(`${verb} ${workflow.name} (${state}) from ${workflow.file}`);
  }

  const armed = deployed.filter((workflow) => workflow.armed).length;

  console.log(
    deployed.length === 0
      ? 'nothing deployed: the build wrote no artifact'
      : `${deployed.length} deployed, ${armed} of them armed`,
  );

  return deployed;
}

/**
 * Every refusal a deploy raises on purpose and can name by class.
 *
 * A roster rather than a chain of `instanceof` tests, for the reason
 * `BUILD_REFUSALS` in `build-workflows.ts` gives: the set is what
 * matters, and this one spans this module and `n8n-client.ts`. The
 * build's own set is not copied in — {@link isBuildRefusal} is
 * composed with this instead, so a refusal added over there reaches
 * this command with no edit here.
 *
 * What no roster reaches is the plain `Error`s {@link deploy} raises
 * over the artifacts it read and the names it found. Each of those is
 * as much a report as anything named here, and none of them carries a
 * class to be named by — so a roster admitting them would have to
 * admit bare `Error`, which is every unexpected failure on the path
 * as well: the `ENOENT` a read raises over a file the build reported
 * and did not write, and whatever an injected fetch throws when it
 * cannot reach a host. So they print with a stack over them, which
 * buries the message rather than losing it. What would part them is
 * classes of their own, and nothing here gives them any.
 */
const DEPLOY_REFUSALS = [
  DirtyTreeError,
  UnconfiguredInstanceError,
  UnsuccessfulReplyError,
];

/**
 * Whether a caught value is one this command can report as a message.
 *
 * @param cause - What the run threw.
 * @returns Whether its message is the whole report.
 */
function isDeployRefusal(cause: unknown): cause is Error {
  return isBuildRefusal(cause)
    || DEPLOY_REFUSALS.some((refusal) => cause instanceof refusal);
}

/**
 * Whether this file is what the process was started with, rather than
 * something another module imported.
 *
 * `import.meta.url` is a `file:` URL where `process.argv[1]` is a
 * path, so comparing the two as they come is false however the
 * process was started, and the block below would silently never run.
 * `fileURLToPath` is what makes the comparison able to hold at all.
 * `build-workflows.ts`, `seed.ts` and `approve.ts` carry the same
 * guard.
 *
 * Worth asking because this module is both a command and a library:
 * `bun scripts/deploy-external.ts` puts this package's workflows on
 * an instance, while a test importing {@link deploy} or
 * {@link requireInstance} gets the exports and reaches nothing. What
 * the guard is worth is higher here than in any of those three: on a
 * machine that has the two settings, an unguarded import would build,
 * resolve that operator's own environment into the artifacts, and PUT
 * them onto whatever `AR_N8N_URL` names, out of a run that asked for
 * none of it.
 *
 * A copy per command rather than one helper, and deliberately.
 * `import.meta.url` is lexical to the module it is written in, so a
 * guard moved into a shared helper compares that HELPER's path
 * against `process.argv[1]` and answers false in every process;
 * `build-workflows.ts` carries that measurement and the argument in
 * full.
 */
const INVOKED_AS_CLI = process.argv[1] !== undefined
  && fileURLToPath(import.meta.url) === process.argv[1];

if (INVOKED_AS_CLI) {
  try {
    await runDeployCli();
  } catch (cause) {
    // Each refusal on the roster is already a report — the setting,
    // the tree, the call an instance would not take, or the marker a
    // build stopped on — so a stack over it buries the thing worth
    // reading. Anything else is unexpected, and there the stack is
    // what a reader needs. Which reports fall on the wrong side of
    // that line is `DEPLOY_REFUSALS`'s own paragraph.
    process.exitCode = 1;
    console.error(
      isDeployRefusal(cause)
        ? cause.message
        : cause,
    );
  }
}
