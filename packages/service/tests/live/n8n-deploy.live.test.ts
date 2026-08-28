/**
 * Deploys against a real instance: this package's workflows built the
 * way `bun run deploy:external` builds them, uploaded to whatever
 * `AR_N8N_URL` names, and that instance read back for each of them by
 * name. It creates workflows over there and replaces the ones already
 * held under a name it is uploading, and it uploads more than once, so
 * it changes somebody's own deployment rather than reading one, and
 * the gate it hangs off is the whole of the consent for that.
 *
 * `tests/scripts/deploy-external.test.ts` drives the same sequence in
 * front of a stub, and everything decidable without an instance is
 * settled over there: which calls a run makes, that a refusal makes
 * none, that a name the listing already carries is replaced rather
 * than created a second time. What a stub cannot answer is whether the
 * body this port projects is one the API accepts, whether the instance
 * is holding the workflow once the call has returned, whether it is
 * holding one of each rather than two once a rerun has been through,
 * and what the workflow it stored would do if somebody activated it.
 * That is the whole of what is left for this file. The first case
 * answers the first two — the one by the uploads not being refused,
 * the other by the reading behind them — the second answers the third
 * by uploading twice and counting what the instance holds afterwards,
 * and the third answers the last by reading those stored nodes back
 * and putting them through the classifier the activate path reads a
 * built artifact with.
 *
 * Everything this file does sits inside the gate, which is
 * load-bearing rather than tidy. `describeLiveN8n` binds a `describe`
 * and nothing above one, measured on it, so module scope runs on the
 * skipped branch as well — on every `bun run test`. A build spawned or
 * a checkout made beside the block would therefore run inside the
 * isolated suite: it would write `workflows/dist-external/` on a run
 * pointed at no instance, and resolve that build's settings out of
 * whatever environment the machine happened to carry. So module scope
 * here holds constants and pure functions, and every side effect is in
 * `beforeAll`.
 *
 * The build runs as a subprocess rather than through `runBuildCli`.
 * That function constructs a `Bun.Transpiler`, which exists in a bun
 * process and not in a vitest worker, where the polyfill
 * `vitest.config.ts` installs leaves a partial `Bun` global with no
 * transpiler on it. `DeployOptions.build` is the seam that leaves the
 * sequence drivable anyway, and what goes through it here is
 * `bun scripts/build-workflows.ts --external` — the build
 * `deploy:external` runs — with this run's own environment behind it,
 * which is where an `--external` build resolves its settings from.
 *
 * What it uploads is the artifacts that build REPORTED writing, read
 * off the `built <path>` lines it prints, and never a listing of the
 * directory it wrote them into. A build sweeps nothing, so an artifact
 * whose source has since been renamed or deleted stays where it lies
 * and reads to a listing as a built workflow. Uploading a listing is
 * how that reaches an instance.
 *
 * The checkout `deploy` asks git about is one this file makes rather
 * than this repository. `assertCleanTree` shells out about a directory
 * and nothing is injected beneath it, so the only tree it can be
 * handed is a real one, and this repository's own carries uncommitted
 * work on any run made while anything in it is being edited — which
 * would refuse the cases here for a reason their own fixture cannot
 * touch. That refusal is covered in the isolated suite, where it is
 * the subject rather than the obstacle. What the substitution costs is
 * the thing the refusal was for: the artifacts this run uploads carry
 * whatever stamp the tree produced, `-dirty` among them, so what a run
 * of this file leaves on an instance is not a deploy to leave there.
 *
 * The two settings are read through `src/config.ts`, which is the
 * route `deploy:external` takes, so this run and that command resolve
 * one name the same way. The gate keys on `AR_N8N_URL` alone, so a run
 * carrying that and no `AR_N8N_API_KEY` opens and is refused by
 * `requireInstance` naming the one that is missing — a red with the
 * setting in it rather than a skip, which is what `live-n8n.ts` says a
 * case wanting both should do about the pair. It is asked first in
 * `beforeAll`, ahead of the checkout and the build, so nothing is made
 * or spawned for a run with nowhere to send it.
 *
 * Nothing here reaches a database, which is a property of the import
 * graph rather than a habit to keep. Every module this file pulls in
 * resolves to `node:` builtins, `zod` and `vitest` and to nothing
 * else: no `pg`, no `drizzle-orm`, no `src/db/`, and nothing at all
 * out of `live-postgres.ts`. So the two helpers `assertLiveDatabase`
 * opens, `applyMigrations` and `resetTables`, are called from no line
 * here, and the TRUNCATE inside `resetTables` is not a path a run of
 * this file can take. The build it spawns answers the same one process
 * out, reaching `workflow-markers.ts` and `node:` builtins and
 * stopping there.
 *
 * That is worth writing down because the two gates in this directory
 * key on different settings. A machine that exported `AR_N8N_URL` and
 * not `AR_LIVE_DATABASE_URL` runs every case here with the Postgres
 * ones still skipped, so what the one setting consents to is an
 * instance written to and no database touched at all, and the
 * `fileParallelism: false` in `vitest.config.ts`, held for the files
 * that do truncate between cases, is something this one inherits
 * rather than needs. The limit is what it uploads rather than what it
 * imports: the artifact carries statements against an `AR Postgres`
 * credential, and what keeps those from running is that a create is
 * inert and that nothing here arms one.
 *
 * In the first case's record the last member is the claim and the five
 * in front of it stand behind it. It is an absence — the uploaded
 * names the instance does not hold — and an absence over an empty list
 * is what a run that built nothing or uploaded nothing produces,
 * silently. Three of the five close that: the artifacts are held
 * against the sources they were built from, the directory they landed
 * in against the one the upload reads, and the uploads against those
 * same sources. Measured, a build reporting no artifact reddens
 * exactly those three of that record and leaves its claim green, which
 * is the split that says they stand behind it rather than restate it.
 * The other two name a cause those three would otherwise leave to be
 * guessed at: a build that would not launch, and a git that would not
 * run over the checkout. A listing that came back empty needs no guard
 * at all, every uploaded name being one the instance does not hold —
 * measured, `displayNamesListed` emptied on the way in reddens that
 * claim and nothing else in that record, and both readings of the
 * instance in the second case's. The third case reads the listing for
 * itself rather than through that helper, so the leg leaves it green
 * and its own is one door further out.
 *
 * Run against a real instance rather than left as debt: a throwaway
 * n8n 2.15.1 started for the purpose took the artifact this build
 * writes with its twelve nodes intact, in the source's own order and
 * inert, all three cases here passed over it from an empty instance
 * and from one already holding the workflow, the third passed alone
 * under a `-t` filter naming it, every leg this file quotes split as
 * described, and the four deploys a green run makes left it holding
 * exactly one of that workflow. That is evidence about this sequence
 * at that version and about no instance an operator holds, and nothing
 * re-runs it — the gate leaves this file skipped under every command
 * this package ships.
 *
 * The third case acts no further than the two above it: it deploys, as
 * they do, and everything after that is a reading. It asks the
 * instance what it is holding, puts those nodes through
 * `activatableTriggers` — the rule `activate-workflows.sh` sorts built
 * artifacts by — and holds the answer against the one trigger this
 * port schedules on, so what it says is that a workflow an activation
 * would arm is what reached the instance. Nothing in this file arms
 * one. `n8n-client.ts` exports `activateWorkflow` next door and
 * nothing here imports it, and the reading of `active` taken beside
 * the other two is what says the instance was left as it stood.
 */
import type {
  DeployBuild,
  DeployedWorkflow,
  InstanceSettings,
} from '../../scripts/deploy-external.js';
import type { N8nInstance, RemoteWorkflow } from '../../scripts/n8n-client.js';
import type {
  ActivationNode,
  ActivationWorkflow,
} from '../../scripts/n8n-workflow.js';
import type { SpawnSyncReturns } from 'node:child_process';

import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, expect, it } from 'vitest';

import { expectedNames } from '../../scripts/audit-workflows.js';
import {
  EXTERNAL_FLAG,
  WORKFLOW_EXTERNAL_DIST_DIR,
  WORKFLOW_SOURCE_DIR,
} from '../../scripts/build-workflows.js';
import { deploy, requireInstance } from '../../scripts/deploy-external.js';
import { listWorkflows } from '../../scripts/n8n-client.js';
import { activatableTriggers } from '../../scripts/n8n-workflow.js';
import { config } from '../../src/config.js';
import { SCHEDULE_TRIGGER_TYPE } from '../invariants/workflow-rosters.js';

import { describeLiveN8n } from './live-n8n.js';

/**
 * The build entry point this file launches, resolved from this file's
 * own location rather than from the working directory.
 *
 * The suite is launched from the package and from the repo root alike,
 * and only one of those makes a relative path name this script — the
 * same reason the build and invariant suites resolve their roots this
 * way.
 */
const BUILD_ENTRY = fileURLToPath(
  new URL('../../scripts/build-workflows.ts', import.meta.url),
);

/** The prefix of every line that build prints an artifact on. */
const BUILT_LINE = 'built ';

/** What {@link runExternalBuild} reports for a run that completed. */
const BUILD_RAN = 'exit 0';

/** What {@link initCleanCheckout} answers for a tree it made. */
const CHECKOUT_CLEAN = 'one commit, nothing uncommitted';

/** The git commands that turn a temporary directory into that. */
const CHECKOUT_STEPS: readonly (readonly string[])[] = [
  ['init', '-q'],
  ['config', 'user.email', 'n8n-deploy@tests.invalid'],
  ['config', 'user.name', 'n8n-deploy live tests'],
  ['add', '-A'],
  ['commit', '-q', '-m', 'the commit this checkout is clean against'],
];

/**
 * The workflow source the third case holds an instance against.
 *
 * One source and not the whole directory, because what an activation
 * would arm is a different answer per workflow, and the roster in
 * `workflows/src/README.md` already says the set will not agree:
 * `ar-dispatch` holds the only schedule in the system, `ar-capture` is
 * a push webhook and would arm on a URL, and the rest are reached
 * through Execute Workflow and would arm nothing. A claim written over
 * the directory as a whole would be false for part of it the moment
 * phase 5 lands.
 */
const DISPATCH_SOURCE = 'ar-dispatch.json';

/**
 * What the readings of the instance answer with where it is not
 * holding exactly one workflow of the name they were asked about, with
 * a node list on it this file can read.
 *
 * A sentence rather than an empty answer, because each of those
 * readings has an empty answer of its own that means something else —
 * no node that arms, no node at all. The sentence is what parts a
 * reading nobody could take from one that was taken and came back with
 * nothing.
 */
const NOT_READ_BACK = 'no one readable workflow of that name';

/**
 * What the reading of `active` answers with for a workflow the
 * instance is holding and has not armed.
 *
 * A label rather than a boolean, because `RemoteWorkflow.active` is
 * `unknown` and the three answers worth telling apart are `true`,
 * `false` and a member the instance did not send at all. `String` over
 * the value keeps all three, where a comparison against `true` folds
 * the last two into one and reads an answer that never arrived as a
 * workflow left inert.
 */
const INACTIVE = 'active: false';

/**
 * One workflow source, read for the two things this repository
 * declares about it that the third case holds an instance against.
 *
 * The independent side of that case, in the sense
 * {@link LiveDeploy.declaredNames} is of the second: read out of
 * `workflows/src/` rather than off what the build answered with or off
 * what a run uploaded, so a comparison keyed to it is about the
 * workflow this repository declares and not about the run being
 * checked.
 *
 * Read here rather than through `expectedNames`, which answers for
 * every source at once and hands back display names alone. This case
 * is about one source and wants its node types alongside its name, and
 * reading the file once for both is what leaves the two provably about
 * one workflow.
 */
interface DeclaredWorkflow {
  /**
   * The display name it declares, which is the handle the instance
   * holds it under and the one an upsert matches on.
   */
  readonly name: string;

  /**
   * Every node type it declares, in the source order, one entry per
   * node — a count and not a set, so a source carrying two of a type
   * is held against an instance holding two.
   */
  readonly nodeTypes: readonly string[];
}

/**
 * One spawned deploy build, as the run that made it answers for it.
 *
 * Three values rather than the two {@link DeployBuild} carries,
 * because a subprocess has an outcome a function call does not and
 * because where it wrote is a thing to check rather than to assume. A
 * build that would not launch at all reports one string here and an
 * empty file list, so a case reads a run that never happened as a
 * named outcome instead of as a deploy with nothing to upload.
 */
interface ExternalBuild {
  /** The directory and file names {@link deploy} is handed. */
  readonly build: DeployBuild;

  /**
   * Every directory the run reported writing into, deduped.
   *
   * Read off the paths it printed rather than off the constant the
   * upload reads, so the two are held against each other rather than
   * being one value compared with itself.
   */
  readonly directoriesWrittenInto: readonly string[];

  /**
   * {@link BUILD_RAN} for a run that completed, and otherwise the
   * status beside everything the run had to say.
   *
   * One string rather than a status and a stream, because a case
   * comparing a bare status prints a number about a subprocess that is
   * gone by then, where this prints what the launcher said.
   */
  readonly outcome: string;
}

/**
 * Everything the cases here share, made once the gate has opened.
 *
 * Assembled in `beforeAll` rather than at module scope, for the reason
 * the header gives: this file's module scope runs on a skipped pass
 * too, and a build spawned there would run inside the isolated suite.
 */
interface LiveDeploy {
  /** The deploy build, and how the run that made it went. */
  readonly built: ExternalBuild;

  /** The checkout `deploy` is pointed at, removed afterwards. */
  readonly checkout: string;

  /** What git found in it, read back rather than assumed. */
  readonly checkoutState: string;

  /**
   * The display name every workflow source declares, in the order
   * {@link expectedNames} reads them.
   *
   * The independent side of the counting the second case does: read
   * out of `workflows/src/` rather than off what a run uploaded, so a
   * comparison keyed to it is about what this repository declares and
   * not about the run being checked.
   */
  readonly declaredNames: readonly string[];

  /**
   * What `workflows/src/ar-dispatch.json` declares, which is what the
   * third case holds the instance's own copy against.
   */
  readonly dispatch: DeclaredWorkflow;

  /** The instance, for the listing this file reads for itself. */
  readonly instance: N8nInstance;

  /** The two settings, as `src/config.ts` answered for them. */
  readonly settings: InstanceSettings;

  /** Every `*.json` under `workflows/src/`, sorted. */
  readonly sources: readonly string[];
}

/**
 * The checkout made for this file, tracked apart from the fixture so
 * it is removed even where the fixture was never finished.
 */
let checkoutRoot: string | null = null;

/** What `beforeAll` assembled, or nothing if it did not get there. */
let live: LiveDeploy | null = null;

/**
 * Run one git command in `root`.
 *
 * @param root - The directory to run it in.
 * @param args - The command and its arguments.
 * @returns What the run answered, status and streams.
 */
function git(root: string, args: readonly string[]): SpawnSyncReturns<string> {
  return spawnSync('git', args, { cwd: root, encoding: 'utf8' });
}

/**
 * Make `root` a checkout with one commit in it and nothing beside it,
 * and say what it turned out to be.
 *
 * Answers with a sentence rather than throwing, so a git that would
 * not run is a value the case prints instead of a failure in
 * `beforeAll` that takes the block down before anything can say what
 * happened. Each step is tested against SUCCESS rather than against a
 * failure code: a binary that is not there comes back with no status
 * at all, so a run compared against zero covers that and one compared
 * against a non-zero code covers neither of the two.
 *
 * The tree is then read rather than inferred from the steps having
 * run. A roster that had stopped making a commit leaves every command
 * in it succeeding, so what a guard would be reading is this
 * function's own account of itself.
 *
 * @param root - The directory to build the checkout in.
 * @returns {@link CHECKOUT_CLEAN}, or the command that would not
 * run and whatever it said, or what git found uncommitted.
 */
function initCleanCheckout(root: string): string {
  writeFileSync(join(root, 'README.md'), 'A checkout with one commit.\n');

  for (const args of CHECKOUT_STEPS) {
    const step = git(root, args);

    if (step.status !== 0) {
      return `git ${args.join(' ')}: ${step.error?.message ?? ''}${step.stderr ?? ''}`;
    }
  }

  const status = git(root, ['status', '--porcelain']);

  if (status.status !== 0) {
    return `git status: ${status.error?.message ?? ''}${status.stderr ?? ''}`;
  }

  return status.stdout === ''
    ? CHECKOUT_CLEAN
    : `uncommitted: ${status.stdout}`;
}

/**
 * Every workflow source this package ships, sorted.
 *
 * The independent side of the build comparisons the cases make.
 * `buildAll` writes one artifact per `*.json` it finds here and keeps
 * the source's own name, so this list is what the build should have
 * reported and it is derived from the tree rather than from the run
 * being checked. Directory entries are filtered out the way that build
 * filters them, so the two answers cannot disagree over one.
 *
 * @returns The source file names, sorted.
 */
function sourceWorkflowFiles(): readonly string[] {
  return readdirSync(WORKFLOW_SOURCE_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => entry.name)
    .sort();
}

/**
 * Whether `value` is a node the arming question can be asked about.
 *
 * Two conditions and no more, which is exactly what `ActivationNode`
 * declares: an object that is not an array, carrying a `type` that is
 * a string. `disabled` is not tested, that shape declaring it
 * `unknown` because `activatableTriggers` compares it against `true`
 * and the comparison is total over any value.
 *
 * A predicate rather than a cast, so the two readers using it narrow
 * through `filter` and hand a checked list on. Neither is handed a
 * node by a caller: each parses one out of a file or out of a reply,
 * which is where a hand-declared shape is worth what the walk behind
 * it did and no more.
 *
 * @param value - Anything a parsed node list held.
 * @returns Whether it can be read as a node.
 */
function isActivationNode(value: unknown): value is ActivationNode {
  return typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
    && typeof (value as { readonly type?: unknown }).type === 'string';
}

/**
 * Read one workflow source for its display name and its node types.
 *
 * Refuses rather than coerces, and every refusal names the file,
 * because a source this cannot read is a repository problem and never
 * an instance one. Folded into an empty answer instead, the readings
 * it is held against would report an instance that had lost every node
 * it was sent.
 *
 * Two of the three refusals are `expectedNames`'s own over the same
 * directory. Its third, a display name carrying build-marker text, is
 * left out because the fixture reads that list as well, so a second
 * spelling of the rule here would be one more thing to keep in step.
 * What is added instead is the node types, which no other reader of
 * this directory asks a source for.
 *
 * @param dir - The directory workflow sources are read out of.
 * @param file - The source file name inside it.
 * @returns Its display name and the node types it declares.
 * @throws Error When the source is not a workflow object, carries no
 *   display name, or carries no node list this can read.
 */
function declaredWorkflow(dir: string, file: string): DeclaredWorkflow {
  const path = join(dir, file);
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(
      `${path} is not a workflow object, so it declares neither a ` +
      'display name to look for on the instance nor a node list to ' +
      'hold what the instance stored against. One JSON object per ' +
      'file is the rule this directory is read by everywhere.',
    );
  }

  const { name, nodes } = parsed as {
    readonly name?: unknown;
    readonly nodes?: unknown;
  };

  if (typeof name !== 'string') {
    throw new Error(
      `${path} carries no display name, so there is no handle to ask ` +
      'the instance about and every reading below would report a ' +
      `workflow it is not holding. Give it a name in ${file}.`,
    );
  }

  const declared: readonly unknown[] = Array.isArray(nodes)
    ? nodes
    : [];
  const readable = declared.filter(isActivationNode);

  if (readable.length === 0 || readable.length !== declared.length) {
    throw new Error(
      `${path} carries no node list this can read — ${String(declared.length)} ` +
      `entries, ${String(readable.length)} of them objects with a string ` +
      'type on them. The arming question is asked of node types, so ' +
      `the edit is to the nodes member of ${file} rather than to ` +
      'anything the instance is holding.',
    );
  }

  return { name, nodeTypes: readable.map((node) => node.type) };
}

/**
 * Run the deploy build the way `deploy:external` runs it, and answer
 * with what it wrote, where, and how the run went.
 *
 * A subprocess for the reason the header gives, and the shipped entry
 * point rather than a copy of it: what is under test on the far side
 * of this is the artifact `bun run deploy:external` would upload, so a
 * build assembled here would be about some other one.
 *
 * The environment is inherited rather than built. An `--external`
 * build resolves its settings from the environment and from `.env`,
 * and an operator running this file has configured the deploy those
 * settings are for — so passing anything narrower would upload
 * artifacts nobody would have deployed.
 *
 * @returns The build, the directories it named, and its outcome.
 */
function runExternalBuild(): ExternalBuild {
  const run = spawnSync(
    'bun',
    [BUILD_ENTRY, EXTERNAL_FLAG],
    { encoding: 'utf8' },
  );
  const written = (run.stdout ?? '')
    .split('\n')
    .filter((line) => line.startsWith(BUILT_LINE))
    .map((line) => line.slice(BUILT_LINE.length));

  return {
    build: {
      dir: WORKFLOW_EXTERNAL_DIST_DIR,
      files: written.map((path) => basename(path)),
    },
    directoriesWrittenInto: [...new Set(written.map((path) => dirname(path)))],
    outcome: run.status === 0
      ? BUILD_RAN
      : `exit ${String(run.status)}: ${run.error?.message ?? ''}${run.stderr ?? ''}`,
  };
}

/**
 * What `beforeAll` assembled, refused rather than coerced.
 *
 * Called from inside a case rather than resolved beside it, so a hook
 * that did not finish reports as a named failure in the case that
 * wanted the value instead of as an assertion about `undefined` —
 * which for an absence claim is a green.
 *
 * @returns The shared fixture.
 * @throws Error When `beforeAll` did not reach the end.
 */
function fixture(): LiveDeploy {
  if (live === null) {
    throw new Error(
      'the fixture for this block was never assembled, so nothing ' +
      'here was deployed and nothing was read back. Whatever ' +
      'beforeAll raised is above this in the run log.',
    );
  }

  return live;
}

/**
 * Every display name the instance is holding, one per workflow and in
 * the order it listed them.
 *
 * A workflow whose `name` is not a string is passed over rather than
 * coerced. `RemoteWorkflow.name` is `unknown` because the instance is
 * what settles it, and one that is not a string can equal no name this
 * port uploaded — what an instance is doing holding such a workflow is
 * a question for `audit-workflows.ts` rather than for a deploy.
 *
 * Duplicates are kept, which is the whole of what parts this from
 * {@link namesHeldBy}: two workflows under one display name is the
 * state a repeat of a deploy is supposed to leave impossible, so it
 * has to survive the read that goes looking for it.
 *
 * @param instance - The instance to list.
 * @returns The names it holds, one per workflow.
 */
async function displayNamesListed(
  instance: N8nInstance,
): Promise<readonly string[]> {
  const listed = await listWorkflows(instance);

  return listed
    .map((workflow) => workflow.name)
    .filter((name): name is string => typeof name === 'string');
}

/**
 * Every display name the instance is holding, deduplicated.
 *
 * The membership half of {@link displayNamesListed}, which is where
 * the argument for what it passes over lives.
 *
 * @param instance - The instance to list.
 * @returns The names it holds, with no name in it twice.
 */
async function namesHeldBy(instance: N8nInstance): Promise<ReadonlySet<string>> {
  return new Set(await displayNamesListed(instance));
}

/**
 * How many workflows the instance is holding under each of `names`.
 *
 * One `<name>: <count>` label per name rather than a tally, so a name
 * held twice reports as two beside the one the comparison expected,
 * and a name it lost reports as zero. A count of the wrong ones would
 * say how many and never which.
 *
 * The names are asked FOR rather than read off the listing, so the
 * answer is keyed to what this repository declares and not to what the
 * instance happens to hold: a workflow nobody here deployed is neither
 * counted nor reported, which is `audit-workflows.ts`'s question
 * rather than a deploy's.
 *
 * @param instance - The instance to list.
 * @param names - The display names to count, in the order to report.
 * @returns One label per name, in that order.
 */
async function timesHeldBy(
  instance: N8nInstance,
  names: readonly string[],
): Promise<readonly string[]> {
  const held = await displayNamesListed(instance);

  return names.map((name) => {
    const times = held.filter((candidate) => candidate === name).length;

    return `${name}: ${String(times)}`;
  });
}

/**
 * The workflow the instance is holding under `name`, in the shape
 * `activatableTriggers` asks its question of, or `null` where the
 * listing carries no such workflow, more than one of them, or one
 * whose nodes are not a list this can read.
 *
 * Exactly one, because two workflows under a single display name leave
 * a reading with no subject to be about. Which of them an instance
 * would run is the case above's question rather than this one's, so
 * here it is a state to report and never one to pick a workflow out
 * of.
 *
 * Nothing is copied away or renamed: what comes back is the listing's
 * own object with its node list narrowed, so the rest of the answer
 * rides along through `ActivationWorkflow`'s index signature. That is
 * where the reading of whether the instance has it armed is taken
 * from, `active` being a member `RemoteWorkflow` declares and the
 * arming shape does not.
 *
 * An absent node list is `null` and an empty one is not. An answer
 * carrying no `nodes` member is one this could not read; an answer
 * carrying an empty list is the instance saying it holds a workflow
 * with nothing in it, which is a thing the readings above are entitled
 * to report rather than one to hide behind a sentence.
 *
 * @param listed - Every workflow the instance answered with.
 * @param name - The display name to look for.
 * @returns That workflow in the arming shape, or `null`.
 */
function storedAs(
  listed: readonly RemoteWorkflow[],
  name: string,
): ActivationWorkflow | null {
  const held = listed.filter((workflow) => workflow.name === name);
  const [only] = held;

  if (only === undefined || held.length !== 1) {
    return null;
  }

  const member: unknown = only.nodes;

  if (!Array.isArray(member)) {
    return null;
  }

  const stored: readonly unknown[] = member;
  const nodes = stored.filter(isActivationNode);

  return nodes.length === stored.length
    ? { ...only, nodes }
    : null;
}

describeLiveN8n('deploying the built workflows to a live n8n instance', () => {
  beforeAll(() => {
    const sources = sourceWorkflowFiles();
    const settings: InstanceSettings = {
      apiKey: config.AR_N8N_API_KEY,
      baseUrl: config.AR_N8N_URL,
    };

    // Asked before anything is made or spawned. It is the one refusal
    // here that names a setting, and a run with a URL and no key opens
    // the gate and reaches it — so getting it out of the way first is
    // what keeps that run from building.
    const instance = requireInstance(settings, fetch);

    checkoutRoot = mkdtempSync(join(tmpdir(), 'ar-n8n-deploy-'));

    live = {
      built: runExternalBuild(),
      checkout: checkoutRoot,
      checkoutState: initCleanCheckout(checkoutRoot),
      declaredNames: expectedNames({ sourceDir: WORKFLOW_SOURCE_DIR }),
      dispatch: declaredWorkflow(WORKFLOW_SOURCE_DIR, DISPATCH_SOURCE),
      instance,
      settings,
      sources,
    };
  });

  afterAll(() => {
    if (checkoutRoot !== null) {
      rmSync(checkoutRoot, { recursive: true, force: true });
    }
  });

  it('leaves the instance holding every built workflow by name', async () => {
    const { built, checkout, checkoutState, instance, settings, sources } =
      fixture();

    const uploaded = await deploy({
      build: () => built.build,
      fetch,
      root: checkout,
      settings,
    });

    // Read after the uploads and not before: what is being asked is
    // what the instance is holding once the calls have returned, which
    // is the half the isolated suite has no way to reach.
    const held = await namesHeldBy(instance);
    const missing = uploaded
      .map((workflow) => workflow.name)
      .filter((name) => !held.has(name))
      .sort();

    expect({
      theBuildRan: built.outcome,
      itWroteOneArtifactPerSource: [...built.build.files].sort(),
      itWroteThemWhereTheUploadReads: built.directoriesWrittenInto,
      theCheckoutTheDeployAsksGitAbout: checkoutState,
      everyArtifactWasUploaded: uploaded
        .map((workflow) => workflow.file)
        .sort(),
      namesTheInstanceDoesNotHold: missing,
    }).toEqual({
      theBuildRan: BUILD_RAN,
      itWroteOneArtifactPerSource: sources,
      itWroteThemWhereTheUploadReads: [WORKFLOW_EXTERNAL_DIST_DIR],
      theCheckoutTheDeployAsksGitAbout: CHECKOUT_CLEAN,
      everyArtifactWasUploaded: sources,
      namesTheInstanceDoesNotHold: [],
    });
  });

  // A repeat of the deploy `bun run deploy:external` runs, measured
  // against the state the pass in front of it left. Upserting on the
  // display name is the whole of how a rerun creates nothing twice,
  // and the isolated suite already pins that from the request side: a
  // name the listing carries is a PUT at the id the listing gave and
  // not a second POST. What a stub cannot answer is what the instance
  // is holding once both passes have returned, which is the one place
  // a create nobody wanted and a replace that landed on the wrong
  // workflow look different from each other.
  //
  // Both passes are this case's own rather than the first of them
  // being the one the case before it makes. A repeat has to say what
  // it is a repeat of, and the reading taken between the two is what
  // says it — off the instance rather than off a sibling case having
  // run first, which a `-t` filter or a reordering would leave untrue
  // with nothing reporting it.
  //
  // The two claims are the last two members and the six in front of
  // them stand behind: an absence of creates and a count of one apiece
  // are both what a run that built nothing or uploaded nothing leaves,
  // silently. What the build reported is held against the sources it
  // was built from and each pass's uploads against those same sources,
  // so a run with nothing to say is reported as one rather than read
  // as a deploy that repeated well.
  //
  // Where the build wrote is not among them, as it is in the first
  // case's record. A directory the upload read and the build did not
  // write into is an artifact `artifactOf` cannot open, which arrives
  // here as the `ENOENT` it raised naming the path rather than as a
  // short list somebody has to account for.
  //
  // Measured over a throwaway instance, and the legs are what part the
  // two claims from each other and from the guards. Over an EMPTY
  // instance, a match that never finds a name — so that every pass
  // creates — moves all three readings here: the count between the
  // passes, the count after them, and the created list naming the
  // workflow. That same mutation with the report calling every create
  // a replace leaves the created list GREEN and moves the two counts
  // alone, which is what says the instance's state carries a failure
  // the deploy's own account of itself cannot. Over an instance
  // already holding the workflow, a build reporting no artifact moves
  // the three build-and-upload members and leaves both claims and the
  // count between the passes alone; and a listing read that came back
  // empty, and one answering every name twice, each move the two
  // counts and leave the created list green.
  it('replaces what it already put there rather than deploying it twice', async () => {
    const {
      built,
      checkout,
      checkoutState,
      declaredNames,
      instance,
      settings,
      sources,
    } = fixture();
    const upload = async (): Promise<readonly DeployedWorkflow[]> => deploy({
      build: () => built.build,
      fetch,
      root: checkout,
      settings,
    });
    const heldOnce = declaredNames.map((name) => `${name}: 1`);

    const first = await upload();

    // The state the repeat is measured against, read off the instance
    // rather than inferred from the pass that just ran. A first pass
    // that uploaded nothing to an instance already holding these names
    // leaves this reading exactly as a first pass that landed does, so
    // what parts the two is the first pass's own upload list and not
    // this.
    const between = await timesHeldBy(instance, declaredNames);
    const second = await upload();
    const created = second
      .filter((workflow) => workflow.created)
      .map((workflow) => workflow.name)
      .sort();

    // The two claims, and each is a reading the other cannot make. The
    // first is the deploy's own account of what it did, which is what
    // says it took the update path at all; the second is the
    // instance's state, which is what says the update landed where the
    // account claims. A run that replaced nothing and posted twice
    // fails both, and one that reported a replace while creating a
    // copy fails only the second.
    expect({
      theBuildRan: built.outcome,
      itWroteOneArtifactPerSource: [...built.build.files].sort(),
      theCheckoutTheDeployAsksGitAbout: checkoutState,
      theFirstPassUploadedEveryArtifact: first
        .map((workflow) => workflow.file)
        .sort(),
      whatTheInstanceHeldBetweenThePasses: between,
      theSecondPassUploadedEveryArtifact: second
        .map((workflow) => workflow.file)
        .sort(),
      whatTheSecondPassCreatedRatherThanReplaced: created,
      whatTheInstanceHoldsNow: await timesHeldBy(instance, declaredNames),
    }).toEqual({
      theBuildRan: BUILD_RAN,
      itWroteOneArtifactPerSource: sources,
      theCheckoutTheDeployAsksGitAbout: CHECKOUT_CLEAN,
      theFirstPassUploadedEveryArtifact: sources,
      whatTheInstanceHeldBetweenThePasses: heldOnce,
      theSecondPassUploadedEveryArtifact: sources,
      whatTheSecondPassCreatedRatherThanReplaced: [],
      whatTheInstanceHoldsNow: heldOnce,
    });
  });

  // What only an instance answers here is what its own copy of the
  // workflow would do. `activatableTriggers` is driven over
  // hand-written workflows in `tests/scripts/n8n-workflow.test.ts` and
  // over built artifacts by the plan step of `activate-workflows.sh`,
  // and neither of those is the copy an instance stored.
  // Between an artifact and that copy sit `toApiWorkflow`, which drops
  // every member outside the four the API takes, and the create
  // handler itself, which mints ids into the nodes it is handed — so
  // whether what reached the instance is still a workflow an
  // activation would arm is a question with no answer on this side of
  // the wire.
  //
  // The deploy is this case's own rather than the two above it having
  // made one. A `-t` filter naming this case, or a run whose cases
  // were reordered, would otherwise leave it reading whatever an
  // operator's instance already held, and every reading below would be
  // about that instead — silently, since an instance holding an older
  // copy answers all three of them.
  //
  // Two claims, and each is held against something written down, which
  // is what leaves them loud in both directions. The first is what the
  // classifier answers over the stored nodes, against the one trigger
  // this port schedules on: a classifier answering for everything
  // answers with eleven more entries, one answering for nothing
  // answers with none, and an instance holding no such workflow
  // answers with the sentence that says so. The second is what the
  // instance says about having it armed, read as a label rather than
  // as a boolean so an answer that never arrived is not taken for a
  // workflow left inert.
  //
  // The guard both claims rest on is the one in front of them that
  // reads the instance: the node types it stored the workflow with,
  // held against what the source declares. Without it a one-node
  // workflow under this name satisfies both — a schedule trigger arms,
  // and nothing armed it — so the reading would be about something
  // that is not what was deployed. The source is the independent side,
  // the way `declaredNames` is for the case above.
  //
  // The listing is read once and three things are asked of it, which
  // is why neither `namesHeldBy` nor `timesHeldBy` is reached for:
  // each of those lists for itself, and three readings taken over
  // three listings can disagree about an instance that moved between
  // them.
  //
  // Nothing here arms anything, and the reading of `active` is what
  // says so rather than an assertion about calls nobody made.
  // `activateWorkflow` is exported by `n8n-client.ts` and this file
  // does not import it; what the reading adds is the half that is not
  // about this file at all, that the upload did not arm it either —
  // the create handler forces a new workflow inactive, and an update
  // republishes only one that was already armed.
  //
  // The limit is the walk's disabled skip, which no run of this can
  // reach. No node in `workflows/src/` carries the member and nothing
  // between an artifact and the instance adds one, so what parts a
  // node an operator switched off from one left running is
  // `tests/scripts/n8n-workflow.test.ts`'s claim alone and stays there
  // until somebody edits a workflow on the canvas.
  //
  // Measured over a throwaway instance, and five of the eight legs
  // name a single member. The classifier answering for nothing and the
  // classifier answering for everything each move the arming claim
  // alone, which is the pair saying a must-find held against a
  // written-down expectation needs no coverage case of its own. The
  // reader finding no workflow of that name moves all three readings,
  // and so does `listWorkflows` answering with nothing, which is a
  // mutation in the client rather than in anything here and reddens
  // the two cases above as well.
  //
  // The guard is read by two legs, one from either side of the
  // comparison it makes. An upload cut down to its first node leaves
  // the instance holding a one-node workflow under this name, and the
  // guard moves ALONE with both claims green — the vacuity it exists
  // for, measured rather than argued. Truncating what the source
  // declares moves it alone from the other side, which is what says it
  // reads that file rather than restating the reading it is held
  // against.
  //
  // The inactive claim has a leg of its own that edits nothing: arm
  // the workflow on the instance by hand and run. It moves that claim
  // alone, the arming claim and the guard staying green, and what it
  // measures on the way past is why the claim is worth asserting at
  // all — a redeploy over an armed workflow republishes it rather than
  // standing it down, so an upload is inert only for a workflow the
  // instance was not already running.
  //
  // The build and upload guards come apart from the claims the way the
  // case above's do. Over an instance already holding the workflow, a
  // build reporting no artifact moves two of them alone and leaves
  // every reading of the instance green. And the leg those two cases
  // rest on does not reach here: `displayNamesListed` emptied moves
  // three members between them and nothing of this, this case reading
  // the listing for itself rather than through the helper they share.
  it('reads the dispatch workflow back as one an activation would arm', async () => {
    const {
      built,
      checkout,
      checkoutState,
      dispatch,
      instance,
      settings,
      sources,
    } = fixture();

    const uploaded = await deploy({
      build: () => built.build,
      fetch,
      root: checkout,
      settings,
    });

    // One listing behind all three readings below, taken after the
    // upload: what is asked is what the instance is holding once the
    // calls have returned, and asking it three times would be asking
    // about three moments.
    const stored = storedAs(await listWorkflows(instance), dispatch.name);

    expect({
      theBuildRan: built.outcome,
      itWroteOneArtifactPerSource: [...built.build.files].sort(),
      theCheckoutTheDeployAsksGitAbout: checkoutState,
      everyArtifactWasUploaded: uploaded
        .map((workflow) => workflow.file)
        .sort(),
      theNodeTypesTheInstanceStoredItWith: stored === null
        ? [NOT_READ_BACK]
        : stored.nodes.map((node) => node.type),
      whatAnActivationWouldArmItFor: stored === null
        ? [NOT_READ_BACK]
        : activatableTriggers(stored).map((node) => node.type),
      whetherTheInstanceHasItArmed: stored === null
        ? NOT_READ_BACK
        : `active: ${String(stored.active)}`,
    }).toEqual({
      theBuildRan: BUILD_RAN,
      itWroteOneArtifactPerSource: sources,
      theCheckoutTheDeployAsksGitAbout: CHECKOUT_CLEAN,
      everyArtifactWasUploaded: sources,
      theNodeTypesTheInstanceStoredItWith: dispatch.nodeTypes,
      whatAnActivationWouldArmItFor: [SCHEDULE_TRIGGER_TYPE],
      whetherTheInstanceHasItArmed: INACTIVE,
    });
  });
});
