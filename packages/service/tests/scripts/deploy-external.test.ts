/**
 * What `deploy` does when nothing is configured for the key it
 * authenticates with, driven against a stub nothing is expected to
 * reach.
 *
 * Two claims and two cases. The refusal is
 * {@link UnconfiguredInstanceError} and it names `AR_N8N_API_KEY`,
 * which is what parts it from the other ways this path stops — a
 * tree no commit accounts for, an artifact that is not a workflow,
 * a call the instance would not take — since a case reading only
 * that something was thrown passes for any of them. And nothing
 * reached the stub, which the class cannot say on its own: what a
 * refusal names is which one fired, never what had been spent by
 * the time it did. Measured over the four cases here, that split is
 * real: a refusal swapped for a bare `Error` reddens the first and
 * leaves the second alone, while the refusal deleted outright
 * reddens the two together, the second because a deploy that
 * carried on made the listing request.
 *
 * That the second claim is reachable at all from this repository's
 * own tree is a property of the order {@link deploy} runs its two
 * pre-flight refusals in. The instance is required before the tree
 * is asked about, so a run made out of a checkout carrying
 * uncommitted work — which is every run made while anything in it
 * is being edited — reaches this refusal rather than the one about
 * the tree. Under the other order this block would say nothing on
 * most machines and everything on a clean one.
 *
 * An absence claim is worth what the thing it is made against is
 * worth, and a stub nothing was ever going to reach records an
 * empty list whatever the code under test did. So the last case
 * runs the same settings with a key in them, against a stub built
 * the same way, and reads a request back. It gets one: the listing
 * {@link deploy} reads before it knows how many artifacts there
 * are, and nothing after it, the build it is handed reporting
 * none.
 *
 * That it is the control and not a fifth claim is measured rather
 * than argued. A stub rewritten to record nothing leaves the
 * absence claim above GREEN and reddens this case alone, which is
 * the vacuity it exists to close; and a sequence that refused
 * whatever it was handed reddens this case alone as well, which is
 * what says a block of nothing but a refusal is not a block
 * agreeing with itself.
 *
 * That run wants a clean checkout and makes one. `assertCleanTree`
 * asks git about a directory and nothing is injected beneath it, so
 * the only tree it can be handed is a real one — a temporary
 * directory with a file and a commit in it, removed when this file
 * finishes. What it turned out to be is read back in the guard
 * rather than inferred from the commands having run, so a git that
 * would not run and a roster that stopped committing both name
 * themselves: measured, each reddens the guard and the accepting
 * case together and leaves both claims alone.
 *
 * Three readings this block does not reach. It hands the refusal
 * one arity — a base URL that is answered for and a key that is
 * not — so nothing here says what a run naming neither reports,
 * though the class builds both its message and its field out of a
 * list. It reads nothing the deploy path PRINTS, a key being the
 * one thing this run never had. And the accepting run's build
 * reports no artifact, so the create-and-replace half of a deploy
 * is not exercised: one request goes out and none of it is an
 * upload. The rest of this file arrives later in this stage.
 */
import type { DeployBuild, InstanceSettings } from '../../scripts/deploy-external.js';
import type { HttpFetch, HttpRequest } from '../../scripts/n8n-client.js';
import type { SpawnSyncReturns } from 'node:child_process';

import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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
 * The base URL both runs are configured with.
 *
 * A `.invalid` host, which is a reserved name and resolves nowhere.
 * Nothing here opens a socket, every call going through the stub
 * below, so what the name buys is what a run that had lost that
 * stub would do: fail to resolve rather than reach whatever is
 * answering on the machine the suite is running on.
 */
const BASE_URL = 'https://instance.invalid';

/**
 * The key the accepting run is configured with.
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
 * The near miss of them: the same pair with the key in it.
 *
 * Spread off {@link REFUSED_SETTINGS} rather than written out a
 * second time, so the two differ in the key and in nothing else by
 * construction. The guard below reads both back anyway — what a
 * spread cannot say is that the pair it was built from still holds
 * what these cases are about.
 */
const ACCEPTED_SETTINGS: InstanceSettings = {
  ...REFUSED_SETTINGS,
  apiKey: API_KEY,
};

/**
 * The one request a deploy over a build that wrote nothing makes.
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
 * What the case reading this is about is that a request reached the
 * stub at all.
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
 * A listing carrying no workflows, which is what the stub answers
 * every call with.
 *
 * One answer for all of them rather than a script, because a run
 * that reached a second call is a run these cases are not about and
 * is better reported as an extra label than as a stub that ran out
 * of replies.
 */
const EMPTY_LISTING = JSON.stringify({ data: [], nextCursor: null });

/**
 * A fresh stub, recording what it is handed and answering an empty
 * listing.
 *
 * One per run rather than one for the file: what each case here
 * reads is the calls ONE deploy made, and a shared recorder would
 * leave every one of them a statement about the runs before it as
 * well.
 *
 * @returns The call list and the fetch that writes to it.
 */
function recorder(): CallRecorder {
  const calls: RecordedCall[] = [];

  return {
    calls,
    fetch: (url, init) => {
      calls.push({ init, url });

      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(EMPTY_LISTING),
      });
    },
  };
}

/**
 * One recorded call as a line to read.
 *
 * The method and the URL, and neither the headers nor the body,
 * which keeps a failing diff a list of calls rather than a wall of
 * request objects — the key travels as a header, so it is also what
 * keeps that out of one.
 *
 * @param call - The call as the stub recorded it.
 * @returns Its method and URL, space-separated.
 */
function labelOf(call: RecordedCall): string {
  return `${call.init.method} ${call.url}`;
}

// ---------------------------------------------------------------------------
// The checkout both runs ask git about
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
 * not run is a value the guard below prints instead of a failure at
 * import that takes the file down before any case can say what
 * happened. Each step is tested against SUCCESS rather than against
 * a failure code: a binary that is not there comes back with no
 * status at all, so a run compared against zero covers that and one
 * compared against a non-zero code covers neither of the two.
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
 * What the build every run here is handed reports: a directory, and
 * no artifacts written into it.
 *
 * A build is a function on {@link deploy}'s options for the reason
 * that module states — the real one constructs a `Bun.Transpiler`,
 * which does not exist inside a vitest worker — and what this one
 * reports is the emptiest thing a build can. That is what keeps the
 * accepting run's call list one long: nothing is read off disk,
 * nothing is projected onto a body, and nothing is uploaded.
 *
 * The directory is named and never created, which is exactly what a
 * build that wrote nothing leaves behind.
 */
const NOTHING_BUILT: DeployBuild = {
  dir: join(CLEAN_CHECKOUT, 'dist'),
  files: [],
};

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
 * Both in one value because the cases below read them apart and
 * each needs the other to mean anything: a call list is evidence
 * about a refusal only where the same run produced the two.
 *
 * Nothing is read off what was thrown here, and that is deliberate.
 * A case about the calls a run made is not a case about the class
 * it stopped with, so pinning one in the middle of the other would
 * leave a refusal that changed class reddening a claim its own diff
 * does not explain. {@link refusalOf} is where the class is pinned,
 * for the cases that are about it.
 *
 * @param settings - The two settings to configure the run with.
 * @returns The calls it made and what it threw.
 */
async function deployRun(settings: InstanceSettings): Promise<DeployRun> {
  const stub = recorder();

  try {
    await deploy({
      build: () => NOTHING_BUILT,
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
 * entirely — a tree the checkout step failed to make clean —
 * reporting itself rather than arriving as an empty call list a
 * reader has to account for.
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
  // What both claims below take on trust, and what the accepting
  // case needs before it can be a control at all. Held as one
  // record so a fixture that drifted is named in the diff rather
  // than reported as a run that behaved oddly.
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
  // time it did, so nothing above this reads whether a request was
  // made.
  //
  // It reads nothing about the class either, which is what keeps
  // the two apart: a refusal that stopped being the one above is
  // the case above's to report, and this one goes on saying what it
  // says about a run that stopped for any reason at all.
  //
  // Compared as labels rather than as the recorded calls, so a run
  // that made one prints a method and a URL instead of a request
  // object — and the key, which travels as a header, reaches no
  // diff at all.
  it('makes no request', async () => {
    const run = await deployRun(REFUSED_SETTINGS);

    expect(run.calls.map(labelOf)).toEqual([]);
  });

  // What the claim above is worth is what this stub is worth, and a
  // stub nothing was ever going to reach records an empty list
  // whatever the code under test did. This is the same settings
  // with a key in them, run against a stub built the same way, and
  // it reads one call back.
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
