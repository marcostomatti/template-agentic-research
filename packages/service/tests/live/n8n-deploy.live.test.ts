/**
 * One deploy against a real instance: this package's workflows built
 * the way `bun run deploy:external` builds them, uploaded to whatever
 * `AR_N8N_URL` names, and that instance read back for each of them by
 * name. It creates workflows over there and replaces the ones already
 * held under a name it is uploading, so it changes somebody's own
 * deployment rather than reading one, and the gate it hangs off is the
 * whole of the consent for that.
 *
 * `tests/scripts/deploy-external.test.ts` drives the same sequence in
 * front of a stub, and everything decidable without an instance is
 * settled over there: which calls a run makes, that a refusal makes
 * none, that a name the listing already carries is replaced rather
 * than created a second time. What a stub cannot answer is whether the
 * body this port projects is one the API accepts and whether the
 * instance is holding the workflow once the call has returned. That is
 * the whole of what is left for this file, and this case answers both:
 * the first by the uploads not being refused, the second by the
 * reading behind them.
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
 * would refuse this case for a reason its own fixture cannot touch.
 * That refusal is covered in the isolated suite, where it is the
 * subject rather than the obstacle. What the substitution costs is the
 * thing the refusal was for: the artifacts this run uploads carry
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
 * The last member of the record is the claim and the five in front of
 * it stand behind it. It is an absence — the uploaded names the
 * instance does not hold — and an absence over an empty list is what a
 * run that built nothing or uploaded nothing produces, silently. Three
 * of the five close that: the artifacts are held against the sources
 * they were built from, the directory they landed in against the one
 * the upload reads, and the uploads against those same sources.
 * Measured, a build reporting no artifact reddens exactly those three
 * and leaves the claim green, which is the split that says they stand
 * behind it rather than restate it. The other two name a cause those
 * three would otherwise leave to be guessed at: a build that would not
 * launch, and a git that would not run over the checkout. A listing
 * that came back empty needs no guard at all, every uploaded name
 * being one the instance does not hold — measured, a listing emptied
 * on the way in reddens the claim and nothing else.
 *
 * Run once against a real instance rather than left as debt: a
 * throwaway n8n 2.15.1 started for the purpose took the artifact this
 * build writes with its twelve nodes intact and inert, and both legs
 * above split as described over it. That is evidence about this
 * sequence at that version and about no instance an operator holds,
 * and nothing re-runs it — the gate leaves this file skipped under
 * every command this package ships.
 *
 * Two more cases arrive next in this stage — a second upload, which is
 * what says the upsert creates nothing twice against a real instance,
 * and a reading of whether `ar-dispatch` would arm on one.
 */
import type { DeployBuild, InstanceSettings } from '../../scripts/deploy-external.js';
import type { N8nInstance } from '../../scripts/n8n-client.js';
import type { SpawnSyncReturns } from 'node:child_process';

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, expect, it } from 'vitest';

import {
  EXTERNAL_FLAG,
  WORKFLOW_EXTERNAL_DIST_DIR,
  WORKFLOW_SOURCE_DIR,
} from '../../scripts/build-workflows.js';
import { deploy, requireInstance } from '../../scripts/deploy-external.js';
import { listWorkflows } from '../../scripts/n8n-client.js';
import { config } from '../../src/config.js';

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
 * The independent side of the build comparison below. `buildAll`
 * writes one artifact per `*.json` it finds here and keeps the
 * source's own name, so this list is what the build should have
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
 * Every display name the instance is holding, as strings.
 *
 * A workflow whose `name` is not a string is passed over rather than
 * coerced. `RemoteWorkflow.name` is `unknown` because the instance is
 * what settles it, and one that is not a string can equal no name this
 * port uploaded — what an instance is doing holding such a workflow is
 * a question for `audit-workflows.ts` rather than for a deploy.
 *
 * @param instance - The instance to list.
 * @returns The names it holds.
 */
async function namesHeldBy(instance: N8nInstance): Promise<ReadonlySet<string>> {
  const listed = await listWorkflows(instance);
  const named = listed
    .map((workflow) => workflow.name)
    .filter((name): name is string => typeof name === 'string');

  return new Set(named);
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
});
