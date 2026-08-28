/**
 * What `deploy` does in front of a stub, over three kinds of run
 * worth reading apart: one refused before it reaches anything, one
 * that reaches an instance already holding a workflow under one of
 * the names it is uploading, and one read for the text the command
 * wrote about it afterwards. Nothing in this file reads what a
 * deploy RETURNED — a claim here about what a run DID is made
 * against the calls the stub recorded, or against what it put where
 * an operator would read it.
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
 * than argued. Three legs reach it and every one of them leaves the
 * absence claim GREEN: a stub rewritten to record nothing, a run
 * pointed at a second stub built the same way, and a sequence that
 * refused whatever it was handed. The first two are the two ways an
 * empty call list can mean nothing at all, and the argument for the
 * second is on {@link recorder}; the third is what says a block of
 * nothing but a refusal is not a block agreeing with itself. All
 * three also redden the second block's claim, every run there going
 * through the same stub and the same sequence, and the first and
 * the third the third block's guard along with it.
 *
 * Every block wants a clean checkout and this file makes one.
 * `assertCleanTree` asks git about a directory and nothing is
 * injected beneath it, so the only tree it can be handed is a real
 * one — a temporary directory with a file and a commit in it,
 * removed when this file finishes. What it turned out to be is read
 * back in the first block's guard rather than inferred from the
 * commands having run, so a git that would not run and a roster
 * that stopped committing both name themselves: measured, each
 * reddens that guard, that block's accepting case, the second
 * block's claim and the third block's guard together, and leaves
 * the first block's own two claims alone.
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
 * what an instance would have received. That report is read by
 * nothing in this file, which is why the create and the replace are
 * told apart by a method and a path rather than by a member of it.
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
 * The third block is about what a reader ever sees. A key goes to
 * the instance on purpose, as a header on every request it
 * authenticates; what the command writes is the other way out of
 * this machine, and the only one nobody asked for — which makes
 * what it wrote the whole of that surface, and `runDeployCli`
 * rather than {@link deploy} the thing to run. Three runs carry a
 * key to an instance there and everything each produced is read
 * back for it: the report lines, and for the run something stopped,
 * the message, the stack and the serialization a command line makes
 * of a thrown value.
 *
 * Its guard is where that stops being an absence claim over
 * nothing. A text read for something and found not to hold it is
 * the same green whether the reading works or matches nothing
 * anywhere, so the guard plants a key in a written line and in a
 * thrown refusal and reads both back through the same collection
 * the claim uses. Measured: a reading that matches nothing reddens
 * that guard ALONE and leaves the claim green, and so does a roster
 * with no runs in it, while a report line built to carry the key
 * and a refusal built out of the request rather than the reply each
 * redden the claim alone.
 *
 * Two readings this file does not reach. It hands the refusal one
 * arity — a base URL that is answered for and a key that is not —
 * so nothing here says what a run naming neither reports, though
 * the class builds both its message and its field out of a list.
 * And no case reads a request body past the display name an upsert
 * matches on, so what became of the members n8n's API refuses is
 * `tests/scripts/n8n-workflow.test.ts`'s claim rather than one made
 * here.
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
  runDeployCli,
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
 * label naming a method and a URL — and the answers this file needs
 * are decided by the call rather than by how many came before it.
 *
 * @param call - The call as the stub recorded it.
 * @returns The reply body, as text the caller parses.
 */
type ReplyBody = (call: RecordedCall) => string;

/**
 * What status an instance answers one call with.
 *
 * A function of the call for {@link ReplyBody}'s reason, and a
 * separate one because the two are answered by different things: a
 * body is what an instance has to say, and a status is what it made
 * of the request. The one run that needs them apart answers a
 * listing and refuses the uploads behind it.
 *
 * @param call - The call as the stub recorded it.
 * @returns The status the instance answers that call with.
 */
type ReplyStatus = (call: RecordedCall) => number;

/** The lowest status a reply reports success for. */
const FIRST_SUCCESS_STATUS = 200;

/** The lowest status above that range. */
const PAST_SUCCESS_STATUS = 300;

/**
 * An instance that takes every call it is handed.
 *
 * @returns {@link FIRST_SUCCESS_STATUS}, whatever was asked of it.
 */
function takesEveryCall(): number {
  return FIRST_SUCCESS_STATUS;
}

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
 * A fresh stub, recording what it is handed and answering it the
 * way `answer` and `status` make of the call.
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
 * What a case reading these calls cannot tell on its own is which
 * system answered them. An empty list is what this records for a
 * run refused before it made a call, and equally what it records
 * for a run that made every call it meant to and made them
 * somewhere else. Measured by handing {@link deploy} a second
 * recorder built the same way and asserting against this one: the
 * cases that move are the accepting control and the upsert claim,
 * each of which reads a call back, while the first block's absence
 * claim stays GREEN, correct and fail-capable and about a system
 * that run never used.
 *
 * That failure is written up in
 * `~/.claude/skills/assert-the-stub-was-hit/SKILL.md`, a user-level
 * skill rather than one vendored under `.claude/` here, which is
 * why the argument is carried above rather than left to the link.
 * Two of its five defences are what this file is arranged around:
 * that a stub-backed block owes a reading saying the stub was
 * reached at all, which here is a case of its own rather than a
 * line inside another; and that a claim compares the request
 * SEQUENCE rather than the value a run answered with, which is what
 * {@link labelOf} is for and why no case here reads the report
 * {@link deploy} returns.
 *
 * The remaining three are answered elsewhere rather than declined.
 * It asks that a fake base URL be required and not defaulted, the
 * failure it was extracted from being an override that silently
 * missed and left the client on the production default it ships;
 * here the whole fetch is required, `deploy` taking it as a member
 * of its options, `n8n-client.ts` putting every call through the
 * one it is handed and reaching for no global, and this file
 * constructing a deploy in one place, so there is no default left
 * to inherit. It asks that the runner block the network, which
 * would be guarding a route that does not exist; {@link BASE_URL}
 * answers the same worry the other way, by naming a host that
 * resolves nowhere. And it asks for fixture values a real service
 * could not have produced, which {@link API_KEY} is, though the
 * reading argued there is a different one.
 *
 * The reply's own `ok` is derived from the status rather than
 * answered for separately. `HttpReply` in `n8n-client.ts` declares
 * the two apart and says why the module reads one instead of
 * working it out from the other; what this stands in for is a
 * `Response`, which does work it out, so a stub answering the two
 * independently could hand the module under test a pair no instance
 * could produce.
 *
 * @param answer - What the instance answers each call with.
 * @param status - What status it answers each call with. Defaults
 *   to an instance that takes them all, which is what every run but
 *   one here wants.
 * @returns The call list and the fetch that writes to it.
 */
function recorder(
  answer: ReplyBody,
  status: ReplyStatus = takesEveryCall,
): CallRecorder {
  const calls: RecordedCall[] = [];

  return {
    calls,
    fetch: (url, init) => {
      const call = { init, url };

      calls.push(call);

      const body = answer(call);
      const code = status(call);

      return Promise.resolve({
        ok: code >= FIRST_SUCCESS_STATUS && code < PAST_SUCCESS_STATUS,
        status: code,
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
 *
 * The annotation is what keeps that guard compiling. Both ids are
 * declared `const`, so `tsc` infers two distinct literal types and
 * reports a comparison between them as statically decidable
 * (TS2367) — an error about how the fixture is written rather
 * than about the drift the guard is watching for. Widening this
 * one to `string` answers the static reading and leaves the
 * runtime comparison its work.
 */
const HELD_SOURCE_ID: string = 'ar-held';

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
// Everything one run of the command put where a reader is
// ---------------------------------------------------------------------------

/** What one collected run wrote, and whatever stopped it. */
interface CapturedWrites {
  /** What it threw, or {@link RETURNED}. */
  readonly thrown: unknown;

  /** One entry per write it made, in the order it made them. */
  readonly written: readonly string[];
}

/**
 * Run `during` with the console collected rather than printed, and
 * answer with what it wrote and with whatever stopped it.
 *
 * Both streams, because the command uses both: `runDeployCli`
 * reports on `console.log`, and the block that runs it as a command
 * writes a refusal to `console.error`. The two methods are put back
 * in a `finally`, so a run that threw leaves the console as it
 * found it and whatever the suite prints next prints normally.
 *
 * Every argument is rendered with `String`, which is exact for
 * everything this is ever handed: `runDeployCli` writes strings,
 * and the one block that would hand over a thrown value is the one
 * no case can reach. Such a value would lose whatever a terminal
 * makes of it, which is why {@link readableTextsOf} reads a thrown
 * refusal separately rather than pushing it through here.
 *
 * @param during - The run to collect the writes of.
 * @returns What it wrote and what it threw.
 */
async function whileCapturingWrites(
  during: () => Promise<unknown>,
): Promise<CapturedWrites> {
  const written: string[] = [];
  const printed = { error: console.error, log: console.log };
  const collect = (...args: readonly unknown[]): void => {
    written.push(args.map((arg) => String(arg)).join(' '));
  };

  console.error = collect;
  console.log = collect;

  try {
    await during();

    return { thrown: RETURNED, written };
  } catch (thrown) {
    return { thrown, written };
  } finally {
    console.error = printed.error;
    console.log = printed.log;
  }
}

/** One text a run produced, and what produced it. */
interface ReadableText {
  /** What produced it, which is what a failure names. */
  readonly reading: string;

  /** The text itself, which no failure here prints. */
  readonly text: string;
}

/**
 * Every text one run put where an operator could read it.
 *
 * What it wrote, and — where something stopped it — the three
 * readings a command line makes of what it threw. A command line
 * writes a refusal's `message` for the ones it can name by class
 * and hands anything else to `console.error` whole, which renders
 * it with its stack; and a structured logger reading the same value
 * serializes it, which prints the fields a refusal assigned
 * alongside the class name and leaves out `message` and `stack`,
 * those two being properties of the prototype rather than of the
 * error. No one of the three contains the other two.
 *
 * The block doing that writing runs only when this module is what
 * the process was started with, so no case can reach it. Reading
 * the thrown value here is what stands in for it: what a command
 * line would have put on a terminal, out of a run that handed the
 * same value to a caller instead.
 *
 * @param run - The run as {@link whileCapturingWrites} answered.
 * @returns One entry per text it produced to be read.
 */
function readableTextsOf(run: CapturedWrites): readonly ReadableText[] {
  const written = run.written.map((text, line) => ({
    reading: `written line ${line + 1}`,
    text,
  }));

  if (run.thrown === RETURNED) {
    return written;
  }

  const refusal = run.thrown instanceof Error
    ? run.thrown
    : undefined;

  return [
    ...written,
    {
      reading: 'the message it refused with',
      text: refusal?.message ?? String(run.thrown),
    },
    {
      reading: 'the stack over that refusal',
      text: String(refusal?.stack ?? ''),
    },
    {
      reading: 'that refusal serialized',
      text: String(JSON.stringify(run.thrown)),
    },
  ];
}

/**
 * Whether a text carries the key.
 *
 * A plain substring test over {@link API_KEY}, which that constant
 * is shaped for: a needle able to occur for some other reason
 * reports a leak that is not one, and a false report of a leaked
 * credential reads exactly like a true one.
 *
 * @param text - Something a run produced to be read.
 * @returns Whether the key is anywhere in it.
 */
function carriesTheKey(text: string): boolean {
  return text.includes(API_KEY);
}

/** The header the key travels as, which is the spec's own name. */
const KEY_HEADER = 'X-N8N-API-KEY';

/** The status an instance answers a call it refuses a key for. */
const KEY_REFUSED_STATUS = 401;

/**
 * What the instance sends back with that refusal.
 *
 * Naming nothing about the request, and deliberately.
 * `UnsuccessfulReplyError` quotes a reply's body whole and reads no
 * part of it, so a body echoing the key back would be carried into
 * the message as faithfully as one naming a member the instance
 * would not take — which is the limit that class states about
 * itself rather than a leak this file could catch. The claim that
 * rests on it is that nothing the deploy path HOLDS about the
 * credential reaches a message, never that no character of an
 * arbitrary body could.
 */
const UNAUTHORIZED_BODY = JSON.stringify({ message: 'unauthorized' });

/**
 * An instance that answers the listing and refuses the uploads
 * behind it.
 *
 * A 401 rather than any other refusal, that being the status an
 * instance means the key by — `UnsuccessfulReplyError`'s own
 * message says a 401 is the key in `AR_N8N_API_KEY`. So the refusal
 * this produces is the one most about the credential, out of the
 * call that carried the most: a key header and a serialized
 * workflow both.
 *
 * @param call - The call as the stub recorded it.
 * @returns A success for the listing, a refusal for either upload.
 */
function refusesEveryUpload(call: RecordedCall): number {
  return call.init.method === 'GET'
    ? FIRST_SUCCESS_STATUS
    : KEY_REFUSED_STATUS;
}

/**
 * That instance's bodies: the listing it holds, and its refusal.
 *
 * @param call - The call as the stub recorded it.
 * @returns The listing for the GET, {@link UNAUTHORIZED_BODY} for
 *   either upload.
 */
function instanceRefusingTheUploads(call: RecordedCall): string {
  return call.init.method === 'GET'
    ? HELD_LISTING
    : UNAUTHORIZED_BODY;
}

/** One run of {@link KEY_BEARING_RUNS}. */
interface KeyBearingRun {
  /** What the instance answers each of its calls with. */
  readonly answer: ReplyBody;

  /** What its build reports, and where it wrote it. */
  readonly built: DeployBuild;

  /** What names it in a failure. */
  readonly id: string;

  /** A phrase its own output carries and no other run's does. */
  readonly produces: string;

  /** What status the instance answers each of its calls with. */
  readonly status: ReplyStatus;
}

/**
 * The runs the sweep is made over: a report, an empty report and a
 * refusal, each out of a run that was configured with a key.
 *
 * Key-bearing on purpose, and that is what the whole claim rests
 * on. A run refused for an absent key never had one to leak, so the
 * first block is no part of this however loudly it refuses — what
 * is swept here is runs that carried the key to an instance, which
 * the guard reads back off the requests they made rather than off
 * the settings they were handed.
 *
 * The third is the one the claim is really about. The two reports
 * are assembled out of display names and file names, where there is
 * no credential anywhere near the text, while a refusal out of a
 * call is the one message on this path built from a request at all.
 * The refusals this leaves out — a tree no commit accounts for, an
 * artifact that is not a workflow — are built the way the reports
 * are, out of paths and names, with no call behind them.
 */
const KEY_BEARING_RUNS: readonly KeyBearingRun[] = [
  {
    answer: instanceHoldingTheHeldOne,
    built: TWO_ARTIFACTS,
    id: 'the report over two artifacts',
    produces: '2 deployed',
    status: takesEveryCall,
  },
  {
    answer: instanceHoldingNothing,
    built: NOTHING_BUILT,
    id: 'the report over a build that wrote nothing',
    produces: 'nothing deployed',
    status: takesEveryCall,
  },
  {
    answer: instanceRefusingTheUploads,
    built: TWO_ARTIFACTS,
    id: 'an upload the instance refused',
    produces: 'UnsuccessfulReplyError',
    status: refusesEveryUpload,
  },
];

/**
 * Those same three, written out rather than read off the roster.
 *
 * Two spellings is the only arrangement where comparing them says
 * anything, which is the reasoning `approve-args.test.ts` gives for
 * its own hand-written copy. What it buys here is the one drift a
 * comparison built out of the roster alone cannot see: a roster
 * with nothing in it sweeps no run, and every half of the guard
 * that reads it then holds an empty list up against another.
 */
const SWEPT_RUN_IDS: readonly string[] = [
  'the report over two artifacts',
  'the report over a build that wrote nothing',
  'an upload the instance refused',
];

/** One swept run, beside the row it was made for. */
interface SweptRun {
  /** The row it was made for. */
  readonly row: KeyBearingRun;

  /** Its calls, its writes, and whatever stopped it. */
  readonly run: WrittenRun;
}

/** One run of the command, and all it produced to be read. */
interface WrittenRun extends CapturedWrites {
  /** Every call its stub was handed, in order. */
  readonly calls: readonly RecordedCall[];
}

/**
 * Run the command one row is about, and collect what it produced.
 *
 * `runDeployCli` rather than {@link deploy}, which is the whole of
 * what parts this block from the two beside it. The report is the
 * COMMAND's and not the deploy's, so a case running the deploy
 * would be reading a value where this one is reading a message —
 * and what the command writes is the whole of what an operator sees
 * of a run.
 *
 * @param row - The run to make.
 * @returns Its calls, its writes and whatever stopped it.
 */
async function commandOutputOf(row: KeyBearingRun): Promise<WrittenRun> {
  const stub = recorder(row.answer, row.status);
  const captured = await whileCapturingWrites(() => runDeployCli({
    build: () => row.built,
    fetch: stub.fetch,
    root: CLEAN_CHECKOUT,
    settings: ACCEPTED_SETTINGS,
  }));

  return { ...captured, calls: stub.calls };
}

/**
 * Run every row and answer with each beside the row it was made
 * for.
 *
 * One after another rather than together. The collection replaces
 * two console methods for the length of one run, so runs made at
 * once would each be handed whatever the others wrote.
 *
 * @returns One entry per row, in roster order.
 */
async function sweepKeyBearingRuns(): Promise<readonly SweptRun[]> {
  const swept: SweptRun[] = [];

  for (const row of KEY_BEARING_RUNS) {
    swept.push({ row, run: await commandOutputOf(row) });
  }

  return swept;
}

/**
 * Which of the swept runs a set of texts could have come from, by
 * the phrases those runs declare.
 *
 * Every row is asked and not just the one the texts came from,
 * which is what turns a per-run reading into a comparison: a sweep
 * whose runs had all stopped for one reason answers with the same
 * name everywhere, or with none at all, and either reads as a drift
 * rather than as a run that behaved oddly.
 *
 * @param texts - What one run produced to be read.
 * @returns The rows whose declared phrase is in it.
 */
function producedBy(texts: readonly ReadableText[]): string {
  const from = KEY_BEARING_RUNS.filter(
    (row) => texts.some((readable) => readable.text.includes(row.produces)),
  );

  return from.length === 0
    ? '(no phrase this sweep declares)'
    : from.map((row) => row.id).join(', ');
}

/**
 * Whether every call one run made carried the key.
 *
 * Read off the requests the stub was handed rather than off the
 * settings the run was configured with, which is the difference
 * between a key that was in play and one that was merely written
 * down. A run that made no call at all falls to the count, `0 of 0`
 * being exactly the answer that would otherwise read as every call
 * having carried it.
 *
 * @param run - The run as {@link commandOutputOf} answered.
 * @returns That every call carried it, or how many of how many did.
 */
function keyOnTheWireIn(run: WrittenRun): string {
  const carried = run.calls.filter(
    (call) => call.init.headers[KEY_HEADER] === API_KEY,
  ).length;

  return carried > 0 && carried === run.calls.length
    ? 'every call carried the key'
    : `${carried} of ${run.calls.length} calls carried the key`;
}

/**
 * A line carrying the key, written through the same collection.
 *
 * @returns What that collected.
 */
async function aWrittenLineCarryingTheKey(): Promise<CapturedWrites> {
  return whileCapturingWrites(() => {
    console.log(`deployed something, with ${API_KEY} in the line`);

    return Promise.resolve();
  });
}

/**
 * A refusal carrying the key, thrown through the same collection.
 *
 * A second plant rather than a second expectation on the first: the
 * two halves of {@link readableTextsOf} are separately deletable,
 * and a written line proves nothing about the readings a thrown
 * value gets.
 *
 * @returns What that collected.
 */
async function aRefusalCarryingTheKey(): Promise<CapturedWrites> {
  return whileCapturingWrites(
    () => Promise.reject(new Error(`refused, with ${API_KEY} in it`)),
  );
}

/**
 * Which of one run's texts carry the key, as labels to read.
 *
 * The run and the reading, and never the text. A failure here is a
 * credential in a place it should not be, and a diff quoting the
 * text to say so would be putting a second copy of it wherever the
 * first one was already too many.
 *
 * @param entry - One swept run.
 * @returns One label per reading of it that carries the key.
 */
function keyCarryingReadingsIn(entry: SweptRun): readonly string[] {
  return readableTextsOf(entry.run)
    .filter((readable) => carriesTheKey(readable.text))
    .map((readable) => `${entry.row.id}: ${readable.reading}`);
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
  // Measured over this block and the two beside it, three drifts
  // redden this guard ALONE and the claim after it sees none of
  // them: flipping the build order and flipping the claim's own
  // list of labels with it; giving the held artifact the id the
  // instance minted, which is what a deploy matching on an
  // artifact's own id rather than on its name would be satisfied
  // by; and a listing that grew a workflow no artifact names.
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
  // file reads that value at all.
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
  // Measured over this block and the two beside it: a match that
  // never finds a name and one that answers the same id for every
  // name each redden this case ALONE, as does a label that stops
  // carrying the display name it was handed. A sequence that
  // uploads nothing reddens it alongside the third block's guard,
  // that block reading a report which then says nothing was
  // deployed.
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

// ---------------------------------------------------------------------------
// A deploy that carried a key, and everything it wrote afterwards
// ---------------------------------------------------------------------------

describe('deploy — what the command writes over a run holding a key', () => {
  // What the claim after it takes on trust, in one record so a
  // fixture or a mechanism that drifted is named in the diff rather
  // than reported as a command that behaved oddly.
  //
  // Four halves and each stands behind a different way the claim
  // could hold over nothing at all. The sweep is the runs it says
  // it is, held against a list written out rather than read off the
  // roster, so a roster with nothing in it reports itself instead
  // of leaving every comparison in this record an empty list
  // against another. Each of those runs produced its own declared
  // phrase and no other run's, so a sweep whose runs had all
  // stopped for one reason is named here rather than swept. The key
  // was in play: every call every run made carried it, read back
  // off the requests the stub was handed rather than off the
  // settings a run was configured with, which is the difference
  // between a credential that reached an instance and one that was
  // only ever written down. And the sweep can SEE a key — a written
  // line and a thrown refusal, each carrying one, each put through
  // the same collection and the same reading the claim uses.
  //
  // That last half is the one the claim cannot do without. A text
  // read for something and found not to hold it is the same green
  // whether the reading works or matches nothing anywhere, and the
  // two halves of that reading are separately deletable, which is
  // why there are two plants and not one.
  it('swept the runs it names, carried the key, and can see one', async () => {
    const swept = await sweepKeyBearingRuns();
    const plants = [
      await aWrittenLineCarryingTheKey(),
      await aRefusalCarryingTheKey(),
    ];

    expect({
      eachRunProducedItsOwnOutput: swept.map(
        (entry) => `${entry.row.id}: ${producedBy(readableTextsOf(entry.run))}`,
      ),
      everyCallEveryRunMadeCarriedTheKey: swept.map(
        (entry) => `${entry.row.id}: ${keyOnTheWireIn(entry.run)}`,
      ),
      theRunsSwept: swept.map((entry) => entry.row.id),
      theSweepSeesAPlantedKey: plants.map(
        (plant) => readableTextsOf(plant).some(
          (readable) => carriesTheKey(readable.text),
        ),
      ),
    }).toStrictEqual({
      eachRunProducedItsOwnOutput: SWEPT_RUN_IDS.map((id) => `${id}: ${id}`),
      everyCallEveryRunMadeCarriedTheKey: SWEPT_RUN_IDS.map(
        (id) => `${id}: every call carried the key`,
      ),
      theRunsSwept: SWEPT_RUN_IDS,
      theSweepSeesAPlantedKey: [true, true],
    });
  });

  // The claim, and it is about everything an operator ever sees of
  // a run. A key goes to the instance on purpose, as a header on
  // every request it authenticates; what the command writes is the
  // other way out of this machine, and the only one nobody asked
  // for.
  //
  // So every text every swept run produced is read back for it —
  // each report line, and for the run that was stopped the message,
  // the stack and the serialization, which are the three a command
  // line makes of a thrown value and no one of which contains the
  // other two. The key is in none of them.
  //
  // Answered as labels rather than as a boolean or a count, so a
  // failure names which run leaked and which reading it leaked
  // through — and as the label alone, never the text, since a diff
  // quoting the text to report a credential in the wrong place
  // would be putting a second copy of it there.
  //
  // What this does not claim is that no character of an arbitrary
  // reply could reach a message. `UnsuccessfulReplyError` quotes an
  // instance's body whole, so an instance echoing the key back
  // would be carried faithfully; that limit is stated where the
  // body this sweep answers a refusal with is declared. The claim
  // is about what the deploy path itself holds.
  it('writes no message carrying the API key', async () => {
    const swept = await sweepKeyBearingRuns();

    expect(swept.flatMap(keyCarryingReadingsIn)).toEqual([]);
  });
});
