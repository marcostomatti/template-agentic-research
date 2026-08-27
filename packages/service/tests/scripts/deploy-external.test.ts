/**
 * What `deploy` does in front of a stub, over two kinds of run
 * worth reading apart: one refused before it reaches anything, and
 * one that reaches an instance already holding a workflow under one
 * of the names it is uploading. Nothing in this file reads what a
 * deploy returned — every claim here about what one DID is made
 * against the calls the stub recorded.
 *
 * The first block is the refusal: two claims, with a fixture guard
 * in front of them and a control behind. The refusal it is about
 * is {@link UnconfiguredInstanceError} and it names
 * `AR_N8N_API_KEY`, which is what parts it from the other ways this
 * path stops — a tree no commit accounts for, an artifact that is
 * not a workflow, a call the instance would not take — since a case
 * reading only that something was thrown passes for any of them.
 * And nothing reached the stub, which the class cannot say on its
 * own: what a refusal names is which one fired, never what had been
 * spent by the time it did. Measured over that block's four cases,
 * the split is real: a refusal swapped for a bare `Error` reddens
 * the first and leaves the second alone, while the refusal deleted
 * outright reddens the two together, the second because a deploy
 * that carried on made the listing request.
 *
 * That the second claim is reachable at all from this repository's
 * own tree is a property of the order {@link deploy} runs its two
 * pre-flight refusals in. The instance is required before the tree
 * is asked about, so a run made out of a checkout carrying
 * uncommitted work — which is every run made while anything in it
 * is being edited — reaches that refusal rather than the one about
 * the tree. Under the other order the block would say nothing on
 * most machines and everything on a clean one.
 *
 * An absence claim is worth what the thing it is made against is
 * worth, and a stub nothing was ever going to reach records an
 * empty list whatever the code under test did. So that block closes
 * by running the same settings with a key in them, against a stub
 * built the same way, and reading a request back. It gets one: the
 * listing {@link deploy} reads before it knows how many artifacts
 * there are, and nothing after it, the build it is handed reporting
 * none.
 *
 * That it is the control and not a fifth claim is measured rather
 * than argued. A stub rewritten to record nothing leaves the
 * absence claim before it GREEN and reddens that case, which is
 * the vacuity it exists to close; and a sequence that refused
 * whatever it was handed reddens it too, which is what says a
 * block of nothing but a refusal is not a block agreeing with
 * itself. Both legs also redden the second block's claim, every
 * run there going through the same stub and the same sequence.
 *
 * Both blocks want a clean checkout and this file makes one.
 * `assertCleanTree` asks git about a directory and nothing is
 * injected beneath it, so the only tree it can be handed is a real
 * one — a temporary directory with a file and a commit in it,
 * removed when this file finishes. What it turned out to be is read
 * back in the first block's guard rather than inferred from the
 * commands having run, so a git that would not run and a roster
 * that stopped committing both name themselves: measured, each
 * reddens that guard, that block's accepting case and the second
 * block's claim together, and leaves the first block's own two
 * claims alone.
 *
 * The second block is the upsert, and it is where creating and
 * replacing are told apart. Its build reports two artifacts and its
 * instance answers the listing with one workflow, under the display
 * name one of those two carries. Three calls come back: the
 * listing, a create for the name nothing answered to, and a replace
 * at the id the listing gave for the name that did. A deploy
 * putting a second workflow on the instance rather than replacing
 * the first would appear there as a second create, which is the
 * whole of what matching on a display name is for.
 *
 * What that block reads is the stub's own record and never the
 * report {@link deploy} answers with. A report saying a workflow
 * was replaced is the deploy's own account of what it did, so a run
 * that assembled the request and a run that only says it did are
 * one value to a case reading the report; the recorded calls are
 * what an instance would have received. The report is read by
 * nothing here, which is why the create and the replace are told
 * apart by a method and a path rather than by a member of it.
 *
 * That block's artifacts are written outside the checkout, and that
 * is not arrangement for its own sake. `git status --porcelain`
 * counts untracked files, so a directory of artifacts inside the
 * tree `assertCleanTree` reads would be the very thing that refusal
 * is about, and every run in the block would stop before it made a
 * request. The deploy this stands in for meets the same problem and
 * answers it the other way, writing into `workflows/dist-external/`
 * — a path the repository ignores.
 *
 * Three readings this file does not reach. It hands the refusal one
 * arity — a base URL that is answered for and a key that is not —
 * so nothing here says what a run naming neither reports, though
 * the class builds both its message and its field out of a list. It
 * reads nothing the deploy path PRINTS, which is the command line's
 * doing rather than {@link deploy}'s and is where a key would have
 * to appear for anything to have leaked one. And no case reads a
 * request body past the display name an upsert matches on, so what
 * became of the members n8n's API refuses is
 * `tests/scripts/n8n-workflow.test.ts`'s claim rather than one made
 * here. The case this stage still owes this file arrives later in
 * it.
 */
import type { DeployBuild, InstanceSettings } from '../../scripts/deploy-external.js';
import type { HttpFetch, HttpRequest } from '../../scripts/n8n-client.js';
import type { SpawnSyncReturns } from 'node:child_process';

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import {
  UnconfiguredInstanceError,
  deploy,
} from '../../scripts/deploy-external.js';

// ---------------------------------------------------------------------------
// The instance these runs are pointed at
// ---------------------------------------------------------------------------

/**
 * The base URL every run in this file is configured with.
 *
 * A `.invalid` host, which is a reserved name and resolves nowhere.
 * Nothing here opens a socket, every call going through
 * {@link recorder}, so what the name buys is what a run that had
 * lost that stub would do: fail to resolve rather than reach
 * whatever is answering on the machine the suite is running on.
 */
const BASE_URL = 'https://instance.invalid';

/**
 * The key every run that is not refused is configured with.
 *
 * A string nothing else in this file or in the module under test
 * can produce, so a reading that asks whether it reached some text
 * is asking about this value rather than about a substring it
 * collided with.
 */
const API_KEY = 'zzdeploykeyzz';

/**
 * The settings the refusal is about: an instance named, and nothing
 * set for the key that authenticates against it.
 */
const REFUSED_SETTINGS: InstanceSettings = {
  apiKey: undefined,
  baseUrl: BASE_URL,
};

/**
 * The near miss of them: the same pair with the key in it, and what
 * every run that gets as far as a request is configured with.
 *
 * Spread off {@link REFUSED_SETTINGS} rather than written out a
 * second time, so the two differ in the key and in nothing else by
 * construction. The first block's guard reads both back anyway —
 * what a spread cannot say is that the pair it was built from still
 * holds what these cases are about.
 */
const ACCEPTED_SETTINGS: InstanceSettings = {
  ...REFUSED_SETTINGS,
  apiKey: API_KEY,
};

/**
 * The listing call, which is the first thing any run that gets past
 * the pre-flight refusals makes.
 *
 * {@link deploy} reads the listing before it knows how many
 * artifacts there are, so it goes out whether or not there is
 * anything to upload. Spelled here rather than imported:
 * `n8n-client.ts` assembles the endpoint out of literals inside its
 * own loop and there is nothing to import, which is also the
 * arrangement a comparison wants, since a URL read off the module
 * that built it would agree with a module that had assembled some
 * other one.
 *
 * Pinning that assembly is a by-product rather than the subject.
 * What the first block's last case is about is that a request
 * reached the stub at all, and what the second block's claim is
 * about is what followed this one.
 */
const LISTING_CALL = `GET ${BASE_URL}/api/v1/workflows?limit=250`;

// ---------------------------------------------------------------------------
// The stub every call goes through
// ---------------------------------------------------------------------------

/** One call, as the stub was handed it. */
interface RecordedCall {
  /** The method, headers and body `n8n-client.ts` assembled. */
  readonly init: HttpRequest;

  /** The absolute URL it assembled them for. */
  readonly url: string;
}

/** A stub, and the calls it has been handed so far. */
interface CallRecorder {
  /** Every call, in the order they were made. */
  readonly calls: readonly RecordedCall[];

  /** What {@link deploy} is handed as its fetch. */
  readonly fetch: HttpFetch;
}

/**
 * What an instance answers one call with, as body text.
 *
 * A function of the call rather than a list of replies in order. A
 * script would report a run that made an unexpected call as a stub
 * that ran out, where the call list already reports it as an extra
 * label naming a method and a URL — and the two answers this file
 * needs are decided by the call rather than by how many came
 * before it.
 *
 * @param call - The call as the stub recorded it.
 * @returns The reply body, as text the caller parses.
 */
type ReplyBody = (call: RecordedCall) => string;

/**
 * A listing carrying no workflows.
 *
 * One answer for every call {@link instanceHoldingNothing} is asked
 * about rather than a script, because a run that reached a second
 * call is a run the first block's cases are not about and is better
 * reported as an extra label than as a stub that ran out of
 * replies.
 */
const EMPTY_LISTING = JSON.stringify({ data: [], nextCursor: null });

/**
 * An instance holding no workflows at all.
 *
 * It answers the same body to anything, which costs nothing where
 * the build reports no artifact: a run over one makes the listing
 * call or none, and never an upload for this to be a wrong answer
 * to.
 *
 * @returns {@link EMPTY_LISTING}, whatever was asked of it.
 */
function instanceHoldingNothing(): string {
  return EMPTY_LISTING;
}

/**
 * A fresh stub, recording what it is handed and answering with
 * whatever `answer` makes of the call.
 *
 * One per run rather than one for the file: what each case here
 * reads is the calls ONE deploy made, and a shared recorder would
 * leave every one of them a statement about the runs before it as
 * well.
 *
 * The body is settled when the call is recorded rather than when it
 * is read back, so a reply is an answer to the call sitting beside
 * it in the list and not to whatever the run went on to do.
 *
 * @param answer - What the instance answers each call with.
 * @returns The call list and the fetch that writes to it.
 */
function recorder(answer: ReplyBody): CallRecorder {
  const calls: RecordedCall[] = [];

  return {
    calls,
    fetch: (url, init) => {
      const call = { init, url };

      calls.push(call);

      const body = answer(call);

      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(body),
      });
    },
  };
}

/** What {@link displayNameIn} answers for text carrying no name. */
const NO_DISPLAY_NAME = '(no display name)';

/**
 * The display name in a piece of JSON text.
 *
 * One reader over the two texts a display name has to survive: what
 * a build wrote, which the second block's guard reads off disk, and
 * what {@link deploy} assembled from it, which {@link labelOf}
 * reads off a request body.
 *
 * The parse is not wrapped, on the reasoning `artifactOf` states
 * next door: this is only ever handed text that this file or
 * `n8n-client.ts` serialized, and text that is not JSON is not a
 * state either can produce. A name that is not a string answers
 * with the sentinel rather than throwing, so a case prints what it
 * got instead of dying on the way to saying so.
 *
 * @param text - A serialized workflow, or a request body carrying
 *   one.
 * @returns Its display name, or {@link NO_DISPLAY_NAME}.
 */
function displayNameIn(text: string): string {
  const parsed = JSON.parse(text) as { readonly name?: unknown } | null;
  const name = parsed?.name;

  return typeof name === 'string'
    ? name
    : NO_DISPLAY_NAME;
}

/**
 * One recorded call as a line to read.
 *
 * The method, the URL, and — on a call that sent a body — the
 * display name in it, which is the one member of a request body an
 * upsert turns on. Neither the headers nor the rest of the body:
 * the key travels as a header, so what this leaves out is what
 * keeps that out of a failing diff, and what it keeps in is what
 * says which workflow a create or a replace carried.
 *
 * A label to READ and never one to split. Nothing stops a display
 * name carrying a space, which is what the three parts are
 * separated by.
 *
 * @param call - The call as the stub recorded it.
 * @returns Its method and URL, and the name it uploaded.
 */
function labelOf(call: RecordedCall): string {
  const where = `${call.init.method} ${call.url}`;
  const { body } = call.init;

  return body === undefined
    ? where
    : `${where} ${displayNameIn(body)}`;
}

// ---------------------------------------------------------------------------
// The checkout every run asks git about
// ---------------------------------------------------------------------------

/**
 * A checkout of this file's own making, removed once it finishes.
 *
 * Real, and not avoidable. `assertCleanTree` in the module under
 * test shells out to git about a directory and nothing is injected
 * beneath it, so the only tree it can be handed is one that exists
 * — and the only one that is reliably clean is one made here. This
 * repository's own is not: a run made while anything in it is being
 * edited carries uncommitted work.
 */
const CLEAN_CHECKOUT = mkdtempSync(join(tmpdir(), 'ar-deploy-external-'));

afterAll(() => {
  rmSync(CLEAN_CHECKOUT, { recursive: true, force: true });
});

/** What {@link initCleanCheckout} answers for a tree it made. */
const CHECKOUT_CLEAN = 'one commit, nothing uncommitted';

/** The git commands that turn a temporary directory into that. */
const CHECKOUT_STEPS: readonly (readonly string[])[] = [
  ['init', '-q'],
  ['config', 'user.email', 'deploy-external@tests.invalid'],
  ['config', 'user.name', 'deploy-external tests'],
  ['add', '-A'],
  ['commit', '-q', '-m', 'the commit this checkout is clean against'],
];

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
 * Make `root` a checkout with one commit in it and nothing beside
 * it, and say what it turned out to be.
 *
 * Answers with a sentence rather than throwing, so a git that would
 * not run is a value the first block's guard prints instead of a
 * failure at import that takes the file down before any case can
 * say what happened. Each step is tested against SUCCESS rather
 * than against a failure code: a binary that is not there comes
 * back with no status at all, so a run compared against zero covers
 * that and one compared against a non-zero code covers neither of
 * the two.
 *
 * The tree is then read rather than inferred from the steps having
 * run. A roster that had stopped making a commit leaves every
 * command in it succeeding, so what the guard would be reading is
 * this function's own account of itself. Reading it costs a second
 * spelling of the question `assertCleanTree` asks, which is what
 * the reading is worth: it says a checkout was made, and nothing at
 * all about whether the module under test reads one correctly.
 *
 * @param root - The directory to build the checkout in.
 * @returns {@link CHECKOUT_CLEAN}, or the command that would not
 *   run and whatever it said, or what git found uncommitted.
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

/** What that made, read back by the guard rather than assumed. */
const CHECKOUT_STATE = initCleanCheckout(CLEAN_CHECKOUT);

/**
 * What the build the first block's runs are handed reports: a
 * directory, and no artifacts written into it.
 *
 * A build is a function on {@link deploy}'s options for the reason
 * that module states — the real one constructs a `Bun.Transpiler`,
 * which does not exist inside a vitest worker — and what this one
 * reports is the emptiest thing a build can. That is what keeps the
 * first block's accepting run one call long: nothing is read off
 * disk, nothing is projected onto a body, and nothing is uploaded.
 *
 * The directory is named and never created, which is exactly what a
 * build that wrote nothing leaves behind.
 */
const NOTHING_BUILT: DeployBuild = {
  dir: join(CLEAN_CHECKOUT, 'dist'),
  files: [],
};

// ---------------------------------------------------------------------------
// Two artifacts, and an instance already holding one of them
// ---------------------------------------------------------------------------

/** The display name of the workflow the instance already holds. */
const HELD_NAME = 'AR Held';

/** The display name of the one it does not. */
const UNHELD_NAME = 'AR Unheld';

/**
 * The held artifact's own id, which is its SOURCE's rather than the
 * instance's.
 *
 * A built artifact carries the id `workflows/src/` gave it and an
 * instance mints one of its own, so one workflow has two ids that
 * are nothing alike. That is why an upsert matches on the display
 * name, and it is why the second block's guard holds these two
 * strings apart: an artifact whose own id happened to be the
 * instance's would be satisfied in full by a deploy that never
 * matched on a name at all.
 */
const HELD_SOURCE_ID = 'ar-held';

/** The other artifact's own id, which nothing matches on either. */
const UNHELD_SOURCE_ID = 'ar-unheld';

/** The instance's own id for the workflow it holds by name. */
const HELD_INSTANCE_ID = 'wf-held-01';

/** The artifact file the instance already holds a workflow for. */
const HELD_FILE = 'ar-held.json';

/** The artifact file it does not. */
const UNHELD_FILE = 'ar-unheld.json';

/**
 * One artifact, written the way a build writes one.
 *
 * The four members n8n's API takes and the three a built artifact
 * carries on top of them, so what this block hands {@link deploy}
 * is a build's output rather than a request body. What becomes of
 * those three is `tests/scripts/n8n-workflow.test.ts`'s claim; what
 * writing them here buys is that nothing in this file has quietly
 * done the projection's work in front of it.
 *
 * The node list is empty, which costs this block nothing. The
 * deploy path forwards it and reads no part of it, so a full one
 * would carry exactly what this one does.
 *
 * @param id - The id its source gave it.
 * @param name - Its display name, which is what an upsert matches
 *   on.
 * @returns The file text, as a build would have written it.
 */
function artifactText(id: string, name: string): string {
  const artifact = {
    active: false,
    connections: {},
    id,
    name,
    nodes: [],
    settings: { executionOrder: 'v1' },
    versionId: `${id}-version`,
  };

  return `${JSON.stringify(artifact, null, 2)}\n`;
}

/**
 * A directory of this block's own making, holding the two artifacts
 * its build reports, and removed once this file finishes.
 *
 * Outside {@link CLEAN_CHECKOUT} and not inside it.
 * `git status --porcelain` counts untracked files, so a directory
 * of artifacts written into the tree `assertCleanTree` reads would
 * be exactly the thing that refusal exists for, and every run in
 * this block would stop before it made a request. The deploy this
 * stands in for meets the same problem and answers it the other
 * way, writing into `workflows/dist-external/` — a path the
 * repository ignores.
 */
const ARTIFACT_DIR = mkdtempSync(join(tmpdir(), 'ar-deploy-artifacts-'));

afterAll(() => {
  rmSync(ARTIFACT_DIR, { recursive: true, force: true });
});

/**
 * Write the two artifacts and say what a build over them reports.
 *
 * The order is all a build reports beyond the names, and it is the
 * artifact nothing answers to FIRST. A deploy that ran every
 * replacement ahead of every create would agree with the other
 * order and disagree with this one, so the one the instance holds
 * is put second on purpose.
 *
 * @param dir - The directory to write them into.
 * @returns The directory and the file names, in build order.
 */
function writeTwoArtifacts(dir: string): DeployBuild {
  writeFileSync(join(dir, HELD_FILE), artifactText(HELD_SOURCE_ID, HELD_NAME));
  writeFileSync(
    join(dir, UNHELD_FILE),
    artifactText(UNHELD_SOURCE_ID, UNHELD_NAME),
  );

  return { dir, files: [UNHELD_FILE, HELD_FILE] };
}

/** Those two, written once, and what a build over them reports. */
const TWO_ARTIFACTS: DeployBuild = writeTwoArtifacts(ARTIFACT_DIR);

/**
 * The listing this block's instance answers with: one workflow,
 * under the display name one of the two artifacts carries.
 *
 * One page and no cursor, so `listWorkflows` makes one request and
 * stops. `nextCursor` is null rather than absent, which is what the
 * API answers on a last page.
 */
const HELD_LISTING = JSON.stringify({
  data: [{ active: true, id: HELD_INSTANCE_ID, name: HELD_NAME }],
  nextCursor: null,
});

/**
 * What either upload is answered with.
 *
 * One member, because {@link deploy} reads one member off an
 * upload's answer — whether the instance has the workflow armed —
 * and nothing in this block reads what it made of that. A fuller
 * answer would be describing a claim no case in this file makes.
 */
const STORED_WORKFLOW = JSON.stringify({ active: false });

/**
 * An instance already holding a workflow under {@link HELD_NAME}.
 *
 * Keyed on the method rather than on the URL. The listing is the
 * one GET a deploy makes, and a create and a replace differ in a
 * method and a path rather than in what either is answered with.
 *
 * @param call - The call as the stub recorded it.
 * @returns The listing for the GET, the stored workflow for either
 *   upload.
 */
function instanceHoldingTheHeldOne(call: RecordedCall): string {
  return call.init.method === 'GET'
    ? HELD_LISTING
    : STORED_WORKFLOW;
}

/** The create the artifact nothing answers to produces. */
const CREATE_CALL = `POST ${BASE_URL}/api/v1/workflows ${UNHELD_NAME}`;

/**
 * The replacement the other one produces, addressed at the id the
 * listing gave rather than at the id the artifact carries.
 */
const REPLACE_CALL = `PUT ${BASE_URL}/api/v1/workflows/${HELD_INSTANCE_ID} ${HELD_NAME}`;

/**
 * The display names of the artifacts this build reports, read back
 * off disk in the order it reports them.
 *
 * Read rather than taken from the constants they were written from,
 * which is the whole of what a fixture guard is for: a name that
 * never reached a file is a name the claim's labels would go on
 * being spelled with.
 *
 * @returns One display name per artifact, in build order.
 */
function artifactNamesOnDisk(): readonly string[] {
  return TWO_ARTIFACTS.files.map(
    (file) => displayNameIn(readFileSync(join(ARTIFACT_DIR, file), 'utf8')),
  );
}

/**
 * What the instance answers the listing with, as name-and-id pairs.
 *
 * Read back out of the serialized listing rather than off the
 * object it was built from, so a listing that stopped carrying what
 * this block assumes is named here rather than reported as a deploy
 * that behaved oddly.
 *
 * @returns One `<name> at <id>` label per workflow it holds.
 */
function namesTheInstanceHolds(): readonly string[] {
  const listing = JSON.parse(HELD_LISTING) as {
    readonly data: readonly { readonly id: unknown; readonly name: unknown }[];
  };

  return listing.data.map((held) => `${String(held.name)} at ${String(held.id)}`);
}

// ---------------------------------------------------------------------------
// One deploy, and what came back from it
// ---------------------------------------------------------------------------

/** A refusal, cut down to what a case asserts about one. */
interface DeployRefusal {
  /** The class name, which `this.name` assigns. */
  readonly name: string;

  /** The settings it says nothing was configured for. */
  readonly settings: readonly string[];
}

/**
 * Stands in for the refusal when the deploy returned instead.
 *
 * A sentinel rather than an absent member, so a case expecting a
 * refusal and handed a report says which of the two happened in its
 * own diff instead of holding a class name up against nothing.
 */
const NOT_REFUSED: DeployRefusal = {
  name: '(nothing refused)',
  settings: [],
};

/**
 * Stands in for the thrown value when the deploy came back instead.
 *
 * A symbol rather than `undefined` or a sentence, because a deploy
 * that threw either of those is a run this would otherwise read as
 * one that returned.
 */
const RETURNED = Symbol('nothing thrown');

/** One deploy, as the stub and whatever it threw both saw it. */
interface DeployRun {
  /** Every call the stub was handed, in order. */
  readonly calls: readonly RecordedCall[];

  /** What it threw, or {@link RETURNED}. */
  readonly thrown: unknown;
}

/**
 * Run one deploy against a stub of its own, and answer with what it
 * did and with whatever stopped it.
 *
 * Both in one value because the cases here read them apart and each
 * needs the other to mean anything: a call list is evidence about a
 * refusal only where the same run produced the two.
 *
 * Nothing is read off what was thrown here, and that is deliberate.
 * A case about the calls a run made is not a case about the class
 * it stopped with, so pinning one in the middle of the other would
 * leave a refusal that changed class reddening a claim its own diff
 * does not explain. {@link refusalOf} is where the class is pinned,
 * for the cases that are about it.
 *
 * The instance and the build default to the emptiest pair there is
 * — one holding nothing, and one that wrote nothing — which is what
 * the first block wants and what leaves a run there with one call
 * to make at most. The second block hands both over.
 *
 * @param settings - The two settings to configure the run with.
 * @param answer - What the instance answers each call with.
 * @param built - What the build reports, and where it wrote it.
 * @returns The calls it made and what it threw.
 */
async function deployRun(
  settings: InstanceSettings,
  answer: ReplyBody = instanceHoldingNothing,
  built: DeployBuild = NOTHING_BUILT,
): Promise<DeployRun> {
  const stub = recorder(answer);

  try {
    await deploy({
      build: () => built,
      fetch: stub.fetch,
      root: CLEAN_CHECKOUT,
      settings,
    });
  } catch (thrown) {
    return { calls: stub.calls, thrown };
  }

  return { calls: stub.calls, thrown: RETURNED };
}

/**
 * What a run refused with, as a case asserts one.
 *
 * Only {@link UnconfiguredInstanceError} counts and anything else
 * is rethrown, which is where the class gets pinned: a sequence
 * that had started refusing these settings with a bare `Error`
 * fails the cases reading this, naming it, rather than passing
 * them. It is also what leaves a run stopped by something else
 * entirely — a tree the checkout step failed to make clean, an
 * artifact this file named and did not write — reporting itself
 * rather than arriving as a call list a reader has to account for.
 *
 * @param run - The deploy as {@link deployRun} answered for it.
 * @returns The class name and the settings it named, or
 *   {@link NOT_REFUSED}.
 */
function refusalOf(run: DeployRun): DeployRefusal {
  const { thrown } = run;

  if (thrown === RETURNED) {
    return NOT_REFUSED;
  }

  if (thrown instanceof UnconfiguredInstanceError) {
    return { name: thrown.name, settings: thrown.settings };
  }

  throw thrown;
}

// ---------------------------------------------------------------------------
// A deploy an environment configured no key for
// ---------------------------------------------------------------------------

describe('deploy — an environment that names no API key', () => {
  // What both of this block's claims take on trust, and what its
  // accepting case needs before it can be a control at all. Held as
  // one record so a fixture that drifted is named in the diff
  // rather than reported as a run that behaved oddly.
  //
  // `toStrictEqual` rather than `toEqual`, because the half that
  // carries the most is a member with nothing in it: `toEqual`
  // reads a key that is present and undefined as absent, so a
  // refused pair that had grown a key would satisfy it.
  it('was handed a clean checkout and a near miss of its settings', () => {
    expect({
      theAcceptedPair: ACCEPTED_SETTINGS,
      theCheckoutBothRunsAsk: CHECKOUT_STATE,
      theRefusedPair: REFUSED_SETTINGS,
    }).toStrictEqual({
      theAcceptedPair: { apiKey: API_KEY, baseUrl: BASE_URL },
      theCheckoutBothRunsAsk: CHECKOUT_CLEAN,
      theRefusedPair: { apiKey: undefined, baseUrl: BASE_URL },
    });
  });

  // The class and the setting it names, in one comparison. The
  // class on its own is not the claim: this path refuses several
  // different things and which of them fired is what a reader acts
  // on. The field rather than the message, both being built out of
  // the same list and only one of them a value a case can hold
  // without quoting a paragraph.
  it('refuses with a class naming the setting nothing was set for', async () => {
    const run = await deployRun(REFUSED_SETTINGS);

    expect(refusalOf(run)).toEqual({
      name: 'UnconfiguredInstanceError',
      settings: ['AR_N8N_API_KEY'],
    });
  });

  // The half the class cannot carry. A refusal names which one
  // fired and says nothing about what had already gone out by the
  // time it did, so no other case in this block reads whether a
  // request was made.
  //
  // It reads nothing about the class either, which is what keeps
  // the two apart: a refusal that stopped being the one this block
  // names is the previous case's to report, and this one goes on
  // saying what it says about a run that stopped for any reason at
  // all.
  //
  // Compared as labels rather than as the recorded calls, so a run
  // that made one prints a method and a URL instead of a request
  // object — and the key, which travels as a header, reaches no
  // diff at all.
  it('makes no request', async () => {
    const run = await deployRun(REFUSED_SETTINGS);

    expect(run.calls.map(labelOf)).toEqual([]);
  });

  // What the claim before it is worth is what this stub is worth,
  // and a stub nothing was ever going to reach records an empty
  // list whatever the code under test did. This is the same
  // settings with a key in them, run against a stub built the same
  // way, and it reads one call back.
  //
  // One and not more, because the build reports no artifact: the
  // listing is what a deploy reads before it knows how many there
  // are, and everything past it is per artifact. The refusal half
  // is in the same record so that a run stopped by something else
  // names itself rather than arriving as an empty list a reader has
  // to account for.
  it('reaches that stub over the same settings with a key in them', async () => {
    const run = await deployRun(ACCEPTED_SETTINGS);

    expect({
      calls: run.calls.map(labelOf),
      refusal: refusalOf(run),
    }).toEqual({ calls: [LISTING_CALL], refusal: NOT_REFUSED });
  });
});

// ---------------------------------------------------------------------------
// A deploy onto an instance already holding one of the workflows
// ---------------------------------------------------------------------------

describe('deploy — an instance already holding one of the workflows', () => {
  // What the claim after it takes on trust, in one record so a
  // fixture that drifted is named in the diff rather than reported
  // as a deploy that behaved oddly.
  //
  // Measured over the six cases in this file, three drifts redden
  // this guard ALONE and the claim after it sees none of them:
  // flipping the build order and flipping the claim's own list of
  // labels with it; giving the held artifact the id the instance
  // minted, which is what a deploy matching on an artifact's own
  // id rather than on its name would be satisfied by; and a
  // listing that grew a workflow no artifact names.
  //
  // Two more take the claim down with this guard — a display name
  // that never reached its file, and a listing that stopped
  // carrying the held one. What the guard earns its line for there
  // is saying which of the two sides moved: on its own the claim
  // reports a create where a replace was expected, which sends a
  // reader to the deploy.
  it('was handed two artifacts and an instance holding one by name', () => {
    expect({
      theArtifactNamesOnDisk: artifactNamesOnDisk(),
      theBuildReportsTheUnheldOneFirst: TWO_ARTIFACTS.files,
      theHeldArtifactCarriesAnIdTheInstanceDidNotMint:
        HELD_SOURCE_ID !== HELD_INSTANCE_ID,
      theNamesTheInstanceHolds: namesTheInstanceHolds(),
    }).toStrictEqual({
      theArtifactNamesOnDisk: [UNHELD_NAME, HELD_NAME],
      theBuildReportsTheUnheldOneFirst: [UNHELD_FILE, HELD_FILE],
      theHeldArtifactCarriesAnIdTheInstanceDidNotMint: true,
      theNamesTheInstanceHolds: [`${HELD_NAME} at ${HELD_INSTANCE_ID}`],
    });
  });

  // The whole of the upsert in one list: a listing, a create for
  // the name nothing answered to, and a replace at the id the
  // listing gave for the name that did. A deploy that put the held
  // workflow on the instance a second time appears here as a second
  // POST, and one that replaced both appears as a second PUT, so
  // the two failures this is about are told apart by the labels
  // rather than by a count.
  //
  // Read off the stub and never off what the deploy returned. Its
  // report carries a `created` member per workflow, which is the
  // deploy's own account of what it did: a run that assembled the
  // wrong request and one that assembled the right one can answer
  // with the same report, while the recorded calls are what an
  // instance would have received. So the create and the replace are
  // told apart here by a method and a path, and no case in this
  // file reads the report at all.
  //
  // The replace is addressed at the id the LISTING gave, which is
  // not the id the artifact carries — so a deploy matching on an
  // artifact's own id would put its PUT at a path this list does
  // not hold.
  //
  // The refusal half is in the same record so that a run stopped by
  // anything at all names itself rather than arriving as a short
  // call list a reader has to account for.
  //
  // Measured over the six cases in this file: a match that never
  // finds a name, one that answers the same id for every name, and
  // a sequence that uploads nothing each redden this case ALONE,
  // as does a label that stops carrying the display name it was
  // handed.
  it('replaces the workflow it holds and creates the one it does not', async () => {
    const run = await deployRun(
      ACCEPTED_SETTINGS,
      instanceHoldingTheHeldOne,
      TWO_ARTIFACTS,
    );

    expect({
      calls: run.calls.map(labelOf),
      refusal: refusalOf(run),
    }).toEqual({
      calls: [LISTING_CALL, CREATE_CALL, REPLACE_CALL],
      refusal: NOT_REFUSED,
    });
  });
});
