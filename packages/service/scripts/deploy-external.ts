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
 * guarded so that importing this module runs none of it, and both
 * arrive next in this stage.
 *
 * The two refusals that sequence is worth having in front of it are
 * here already. `assertCleanTree` refuses a tree no commit accounts
 * for, and `requireInstance` refuses a deploy with no instance
 * configured to send one to. Neither reads the other, so which of
 * them a deploy meets first is `deploy`'s to settle; what they share
 * is that both answer before anything is built and before any
 * request is made, which is the whole of what makes a refusal here
 * free.
 */

import type { HttpFetch, N8nInstance } from './n8n-client.js';

import { gitStatusPorcelain } from './build-workflows.js';

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
 * refusal, {@link UnconfiguredInstanceError}, says nothing about a
 * stamp and should not: nothing has been built when it fires, a
 * deploy with nowhere to send an artifact having had no reason to
 * make one.
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
 * else entirely; the steps a deploy takes after the two — the build,
 * the projection and the calls — each carry refusals of their own,
 * and those arrive with `deploy` later in this stage.
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
 * A distinct class rather than a bare `Error`, so a case covering a
 * deploy that was never configured can pin the refusal to it. The
 * other ways this path fails all have names of their own or none:
 * {@link DirtyTreeError} above is the tree, `UnsuccessfulReplyError`
 * in `n8n-client.ts` is a call the instance refused, and a body that
 * cannot be read arrives as `Error` or as `JSON.parse`'s own
 * `SyntaxError`. An assertion taking any `Error` would pass for the
 * last of those.
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
      `${named} ${verb} not set, so this deploy is refused before ` +
      'anything is built and before any request is made. The two a ' +
      'deploy needs are declared optional in `src/config.ts`, ' +
      'because the running service opens neither and a boot has ' +
      'nothing to refuse: ' +
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
