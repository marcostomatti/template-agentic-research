/**
 * What `scripts/panic-external.ts` does in front of a stub, over
 * four kinds of run worth reading apart: one refused before it
 * reaches anything, one over an instance holding armed workflows
 * beside inert ones and one it states no `active` for at all, one
 * over an instance that will not let go of three of them, and the
 * summary read as a value rather than as output.
 *
 * Nothing here opens a socket. Every call goes through
 * {@link recorder}, and {@link BASE_URL} names a host that resolves
 * nowhere, so a run that had lost that stub fails to resolve rather
 * than reaching whatever is answering on the machine the suite runs
 * on.
 *
 * THE FIRST BLOCK IS THE REFUSAL, and it is two claims with a
 * fixture guard in front of them and a control behind. The refusal
 * is `UnconfiguredInstanceError` and it names `AR_N8N_API_KEY`,
 * which is what parts it from the other ways this path stops — a
 * listing the instance would not answer, a page that is not a
 * listing — since a case reading only that something was thrown
 * passes for any of them. And nothing reached the stub, which the
 * class cannot say on its own: what a refusal names is which one
 * fired, never what had been spent by the time it did.
 *
 * An absence claim is worth what the thing it is made against is
 * worth, and a stub nothing was ever going to reach records an
 * empty list whatever the code under test did. So that block closes
 * by running the same settings with a key in them, against a stub
 * built the same way, and reading a call back. It gets one — the
 * listing — and it reads the report that run wrote as well, which
 * is the only place in this file the empty instance is covered: `0
 * on the instance` and the stopped verdict, out of a run that made
 * a request and found nothing armed.
 *
 * THE SECOND BLOCK IS THE ACT, and what it is really about is the
 * one property that makes this command exist rather than a flag on
 * `audit-workflows.ts`. Its instance holds a workflow under a
 * display name `workflows/src/` DECLARES, read out of the sources
 * rather than written here, and panic disarms it. Its guard puts
 * the other half beside it: `assertNotExpected`, which is the
 * refusal an audit's acting flags carry, throws
 * `ExpectedWorkflowError` over that same workflow. So the two
 * commands are measured against one another over one value rather
 * than compared in prose, and a panic that had grown that refusal
 * would redden here.
 *
 * It carries the module's documented LIMIT as a case too: a
 * workflow the listing states no `active` for is reported already
 * inactive and produces no call. That is a false negative in the
 * one direction that matters, and it is here so the reading is
 * pinned rather than discovered — measured by loosening the module
 * to treat anything but `false` as armed, which reddens this
 * block's two claims and nothing else in the file.
 *
 * That block reads the stub's own record and the lines the command
 * wrote, and never what the run RETURNED for the parts either can
 * answer. A report saying a workflow was disarmed is the command's
 * own account of what it did, so a run that assembled the request
 * and a run that only says it did are one value to a case reading
 * the outcome; the recorded calls are what an instance would have
 * received.
 *
 * THE THIRD BLOCK IS THE CONTROL FLOW, which is where this command
 * parts from `actOnStrays` next door. Its instance refuses one
 * call outright, answers a second still armed, and answers the
 * listing with a third workflow carrying no id at all — three
 * failures of three different kinds, one per branch of the
 * module's per-workflow reason — and a fourth workflow behind them
 * that the instance disarms. That fourth is the whole point: it is
 * in the disarmed list, and its POST is in the recorded calls, so
 * a pass that stopped at the first refusal reddens the block twice
 * over rather than passing quietly with four workflows left armed.
 *
 * Its reasons are compared as TAGS rather than as text.
 * `UnsuccessfulReplyError` quotes an instance's whole body into a
 * paragraph, and a case holding that paragraph would be a case
 * about that class's wording rather than about which of the three
 * failures happened. {@link reasonTag} is the reading, and it
 * answers with the reason itself where it recognises none, so a
 * fourth failure mode names itself in the diff instead of arriving
 * as a tag that fits.
 *
 * THE FOURTH BLOCK is the summary as a value, and it covers the one
 * reading no run here can produce: an instance holding far more
 * than this pass touched. Every stub above answers the listing with
 * exactly the workflows it then acts on, so `held` and the three
 * list lengths move together and a summary deriving the total from
 * the lists would satisfy all of them.
 *
 * TWO READINGS THIS FILE DOES NOT REACH. It hands the refusal one
 * arity — a base URL that is answered for and a key that is not —
 * so nothing here says what a run naming neither reports, though
 * the class builds both its message and its field out of a list.
 * And no case reaches the `INVOKED_AS_CLI` block or the exit code
 * it sets, that block running only when the module is what the
 * process was started with; what stands in for it is the hand run
 * recorded with this task, which reached the refusal at exit 1 and
 * the listing request at exit 1 over a host that resolves nowhere.
 */
import type { InstanceSettings } from '../../scripts/deploy-external.js';
import type { HttpFetch, HttpRequest, RemoteWorkflow } from '../../scripts/n8n-client.js';
import type { PanicOutcome } from '../../scripts/panic-external.js';

import { describe, expect, it } from 'vitest';

import {
  ExpectedWorkflowError,
  assertNotExpected,
  expectedNames,
} from '../../scripts/audit-workflows.js';
import { WORKFLOW_SOURCE_DIR } from '../../scripts/build-workflows.js';
import { UnconfiguredInstanceError } from '../../scripts/deploy-external.js';
import {
  formatPanicSummary,
  runPanicExternalCli,
} from '../../scripts/panic-external.js';

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
const BASE_URL = 'https://panic.invalid';

/**
 * The key every run that is not refused is configured with.
 *
 * A string nothing else in this file or in the module under test
 * can produce, so a reading that asks whether it reached some text
 * is asking about this value rather than about a substring it
 * collided with.
 */
const API_KEY = 'zzpanickeyzz';

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
 * the refusal makes.
 *
 * Spelled here rather than imported: `n8n-client.ts` assembles the
 * endpoint out of literals inside its own loop and there is nothing
 * to import, which is also the arrangement a comparison wants,
 * since a URL read off the module that built it would agree with a
 * module that had assembled some other one.
 */
const LISTING_CALL = `GET ${BASE_URL}/api/v1/workflows?limit=250`;

/**
 * The call that disarms one workflow, as a label to compare.
 *
 * @param id - The instance's id for it.
 * @returns The method and URL a deactivation is made at.
 */
function disarmCall(id: string): string {
  return `POST ${BASE_URL}/api/v1/workflows/${id}/deactivate`;
}

// ---------------------------------------------------------------------------
// The stub every call goes through
// ---------------------------------------------------------------------------

/** One call, as the stub was handed it. */
interface RecordedCall {
  /** The method and headers `n8n-client.ts` assembled. */
  readonly init: HttpRequest;

  /** The absolute URL it assembled them for. */
  readonly url: string;
}

/**
 * What an instance answers one call with, as body text.
 *
 * A function of the call rather than a list of replies in order. A
 * script would report a run that made an unexpected call as a stub
 * that ran out, where the call list already reports it as an extra
 * label naming a method and a URL.
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
 * of the request. The third block needs them apart, answering the
 * listing and refusing one deactivation behind it.
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

/** A stub, and the calls it has been handed so far. */
interface CallRecorder {
  /** Every call, in the order they were made. */
  readonly calls: readonly RecordedCall[];

  /** What the run is handed as its fetch. */
  readonly fetch: HttpFetch;
}

/**
 * A fresh stub, recording what it is handed and answering it the
 * way `answer` and `status` make of the call.
 *
 * One per run rather than one for the file: what each case here
 * reads is the calls ONE pass made, and a shared recorder would
 * leave every one of them a statement about the runs before it as
 * well.
 *
 * What a case reading these calls cannot tell on its own is which
 * system answered them, which is why the first block's absence
 * claim is followed by a run that reads a call back off a stub
 * built the same way. That failure is written up in
 * `~/.claude/skills/assert-the-stub-was-hit/SKILL.md`, and the
 * defences it asks for are answered here the way
 * `tests/scripts/deploy-external.test.ts` answers them: the whole
 * fetch is required rather than defaulted, the base URL names a
 * host that resolves nowhere, and the key is a value no real
 * service could have issued.
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
 *   to an instance that takes them all.
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

/**
 * One recorded call as a line to read.
 *
 * The method and the URL, and nothing else. No call on this path
 * sends a body — a deactivation is a POST with none — so what a
 * label leaves out is the headers, which is what keeps the key out
 * of a failing diff.
 *
 * @param call - The call as the stub recorded it.
 * @returns Its method and URL.
 */
function labelOf(call: RecordedCall): string {
  return `${call.init.method} ${call.url}`;
}

/**
 * A listing the instance answers with, one page and no cursor.
 *
 * `nextCursor` is null rather than absent, which is what the API
 * answers on a last page, so `listWorkflows` makes one request and
 * stops.
 *
 * @param workflows - What the instance is holding.
 * @returns The listing as body text.
 */
function listingOf(workflows: readonly RemoteWorkflow[]): string {
  return JSON.stringify({ data: workflows, nextCursor: null });
}

/** Whether a call is a listing rather than a deactivation. */
function isListing(call: RecordedCall): boolean {
  return call.init.method === 'GET';
}

// ---------------------------------------------------------------------------
// One pass, and everything it produced to be read
// ---------------------------------------------------------------------------

/**
 * Stands in for the thrown value when the pass came back instead.
 *
 * A symbol rather than `undefined` or a sentence, because a pass
 * that threw either of those is a run this would otherwise read as
 * one that returned.
 */
const RETURNED = Symbol('nothing thrown');

/** One pass, as the stub, the console and whatever threw all saw it. */
interface PanicRun {
  /** Every call the stub was handed, in order. */
  readonly calls: readonly RecordedCall[];

  /** Every line it wrote, split on the newlines it wrote them with. */
  readonly lines: readonly string[];

  /** What it returned, or `undefined` where something stopped it. */
  readonly outcome: PanicOutcome | undefined;

  /** What it threw, or {@link RETURNED}. */
  readonly thrown: unknown;
}

/**
 * An instance holding nothing at all.
 *
 * It answers the same empty listing to anything, which costs
 * nothing where there is nothing to act on: a run over one makes
 * the listing call or none, and never a deactivation for this to be
 * a wrong answer to.
 *
 * @returns An empty listing, whatever was asked of it.
 */
function instanceHoldingNothing(): string {
  return listingOf([]);
}

/**
 * Run one pass against a stub of its own, and answer with
 * everything it produced.
 *
 * The calls, the lines and the outcome in one value because the
 * cases here read them apart and each needs the others to mean
 * anything: a call list is evidence about a report only where the
 * same run produced the two.
 *
 * Both console methods are collected for the length of the run and
 * put back in a `finally`, so a run that threw leaves the console
 * as it found it and whatever the suite prints next prints
 * normally. Every argument is rendered with `String`, which is
 * exact for everything this is handed — the command writes strings
 * — and each written entry is then split on newlines, the summary
 * being one write carrying two lines.
 *
 * `runPanicExternalCli` rather than `disarmEveryWorkflow`, because
 * the refusal, the summary and the exit-shaped outcome are the
 * command's rather than the walk's, and what an operator sees of a
 * run is what the command wrote.
 *
 * @param settings - The two settings to configure the run with.
 * @param answer - What the instance answers each call with.
 * @param status - What status it answers each call with.
 * @returns Its calls, its lines, its outcome and whatever stopped
 *   it.
 */
async function panicRun(
  settings: InstanceSettings,
  answer: ReplyBody = instanceHoldingNothing,
  status: ReplyStatus = takesEveryCall,
): Promise<PanicRun> {
  const stub = recorder(answer, status);
  const written: string[] = [];
  const printed = { error: console.error, log: console.log };
  const collect = (...args: readonly unknown[]): void => {
    written.push(args.map((arg) => String(arg)).join(' '));
  };

  console.error = collect;
  console.log = collect;

  try {
    const outcome = await runPanicExternalCli({
      fetch: stub.fetch,
      settings,
    });

    return {
      calls: stub.calls,
      lines: written.flatMap((entry) => entry.split('\n')),
      outcome,
      thrown: RETURNED,
    };
  } catch (thrown) {
    return {
      calls: stub.calls,
      lines: written.flatMap((entry) => entry.split('\n')),
      outcome: undefined,
      thrown,
    };
  } finally {
    console.error = printed.error;
    console.log = printed.log;
  }
}

/** A refusal, cut down to what a case asserts about one. */
interface PanicRefusalRead {
  /** The class name, which `this.name` assigns. */
  readonly name: string;

  /** The settings it says nothing was configured for. */
  readonly settings: readonly string[];
}

/**
 * Stands in for the refusal when the pass returned instead.
 *
 * A sentinel rather than an absent member, so a case expecting a
 * refusal and handed a report says which of the two happened in its
 * own diff instead of holding a class name up against nothing.
 */
const NOT_REFUSED: PanicRefusalRead = {
  name: '(nothing refused)',
  settings: [],
};

/**
 * What a run refused with, as a case asserts one.
 *
 * Only `UnconfiguredInstanceError` counts and anything else is
 * rethrown, which is where the class gets pinned: a command that
 * had started refusing these settings with a bare `Error` fails the
 * cases reading this, naming it, rather than passing them. It is
 * also what leaves a run stopped by something else entirely
 * reporting itself rather than arriving as a call list a reader has
 * to account for.
 *
 * @param run - The pass as {@link panicRun} answered for it.
 * @returns The class name and the settings it named, or
 *   {@link NOT_REFUSED}.
 */
function refusalOf(run: PanicRun): PanicRefusalRead {
  const { thrown } = run;

  if (thrown === RETURNED) {
    return NOT_REFUSED;
  }

  if (thrown instanceof UnconfiguredInstanceError) {
    return { name: thrown.name, settings: thrown.settings };
  }

  throw thrown;
}

/**
 * What the pass answered, as a case asserts it, with each refusal's
 * reason read down to a tag.
 *
 * A sentinel where the run threw instead, so a case expecting an
 * outcome and handed a refusal says so in its own diff.
 *
 * @param run - The pass as {@link panicRun} answered for it.
 * @returns The four readings, refusals tagged.
 */
function outcomeOf(run: PanicRun): unknown {
  const { outcome } = run;

  if (outcome === undefined) {
    return `(nothing returned: ${String(run.thrown)})`;
  }

  return {
    disarmed: outcome.disarmed,
    held: outcome.held,
    inactive: outcome.inactive,
    refused: outcome.refused.map(
      (refusal) => `${refusal.label}: ${reasonTag(refusal.reason)}`,
    ),
  };
}

// ---------------------------------------------------------------------------
// The three ways a workflow is left armed, read as tags
// ---------------------------------------------------------------------------

/** What the third block's instance sends back with its refusal. */
const REFUSED_BODY = JSON.stringify({ message: 'zzinstancesaidnozz' });

/** The status it refuses that one call with. */
const REFUSED_STATUS = 400;

/** The tag for a call the instance would not take. */
const TAG_REFUSED = 'the instance refused the call';

/** The tag for a workflow the listing gave no id for. */
const TAG_NO_ID = 'no id to address it by';

/** The tag for a call it took while answering with it still armed. */
const TAG_STILL_ARMED = 'it answered with the workflow still armed';

/**
 * Which of the three failures a reason is about.
 *
 * A reading over the reason text rather than an assertion on it.
 * `UnsuccessfulReplyError` quotes an instance's whole body into a
 * paragraph and the other two are sentences of the module's own, so
 * a case holding any of them verbatim would be a case about
 * wording. Each needle is a phrase only one of the three carries,
 * and the body needle is a value no real service could have sent.
 *
 * A reason it recognises none of comes back whole. A fourth failure
 * mode then names itself in the diff rather than arriving as a tag
 * that happens to fit.
 *
 * @param reason - Why the module said a workflow is still armed.
 * @returns The tag, or the reason itself.
 */
function reasonTag(reason: string): string {
  if (reason.includes('zzinstancesaidnozz')) {
    return TAG_REFUSED;
  }

  if (reason.includes('no path to disarm it at')) {
    return TAG_NO_ID;
  }

  if (reason.includes('answered with the workflow still armed')) {
    return TAG_STILL_ARMED;
  }

  return `(unrecognized reason: ${reason})`;
}

/**
 * One written line with any reason in it read down to a tag.
 *
 * The per-workflow line for a workflow still armed is
 * `<prefix> <label>: <reason>`, and the reason is the paragraph
 * {@link reasonTag} exists to not compare. Every other line — the
 * two the ordinary outcomes produce, the counts and the verdict —
 * carries no `: ` at all and comes back untouched.
 *
 * @param line - One line the command wrote.
 * @returns It, with the reason tagged where there is one.
 */
function taggedLine(line: string): string {
  const parts = line.split(': ');
  const head = parts[0] ?? line;

  return parts.length === 1
    ? line
    : `${head}: ${reasonTag(parts.slice(1).join(': '))}`;
}

// ---------------------------------------------------------------------------
// A pass an environment configured no key for
// ---------------------------------------------------------------------------

describe('panic — an environment that names no API key', () => {
  // What both of this block's claims take on trust, and what its
  // accepting run needs before it can be a control at all. Held as
  // one record so a fixture that drifted is named in the diff
  // rather than reported as a run that behaved oddly.
  //
  // `toStrictEqual` rather than `toEqual`, because the half that
  // carries the most is a member with nothing in it: `toEqual`
  // reads a key that is present and undefined as absent, so a
  // refused pair that had grown a key would satisfy it.
  it('was handed a near miss of its settings', () => {
    expect({
      theAcceptedPair: ACCEPTED_SETTINGS,
      theRefusedPair: REFUSED_SETTINGS,
    }).toStrictEqual({
      theAcceptedPair: { apiKey: API_KEY, baseUrl: BASE_URL },
      theRefusedPair: { apiKey: undefined, baseUrl: BASE_URL },
    });
  });

  // The class and the setting it names, in one comparison. The
  // class on its own is not the claim: this path stops in several
  // different ways and which of them fired is what a reader acts
  // on. The field rather than the message, both being built out of
  // the same list and only one of them a value a case can hold
  // without quoting a paragraph.
  it('refuses with a class naming the setting nothing was set for', async () => {
    const run = await panicRun(REFUSED_SETTINGS);

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
  // The lines are in the same record because the refusal is written
  // by the command-line block this file cannot reach: a run refused
  // here writes NOTHING at all, and a command that had started
  // reporting before it refused would be a command whose first act
  // is to say what it is about to do to an instance it has not
  // reached.
  it('makes no request and writes nothing', async () => {
    const run = await panicRun(REFUSED_SETTINGS);

    expect({ calls: run.calls.map(labelOf), lines: run.lines }).toEqual({
      calls: [],
      lines: [],
    });
  });

  // What the claim before it is worth is what this stub is worth,
  // and a stub nothing was ever going to reach records an empty
  // list whatever the code under test did. This is the same
  // settings with a key in them, run against a stub built the same
  // way, and it reads one call and two lines back.
  //
  // One call and not more, because the instance holds nothing:
  // the listing is what a pass reads before it knows how many
  // workflows there are, and everything past it is per workflow.
  // The two lines are this file's only reading of an instance with
  // nothing on it — the counts at zero and the stopped verdict,
  // which is also what a second run of a pass that worked reports.
  it('reaches that stub over the same settings with a key in them', async () => {
    const run = await panicRun(ACCEPTED_SETTINGS);

    expect({
      calls: run.calls.map(labelOf),
      lines: run.lines,
      refusal: refusalOf(run),
    }).toEqual({
      calls: [LISTING_CALL],
      lines: [
        '0 on the instance, 0 disarmed, 0 already inactive, 0 still armed',
        'nothing on this instance is armed, so nothing on it is spending.',
      ],
      refusal: NOT_REFUSED,
    });
  });
});

// ---------------------------------------------------------------------------
// An instance holding one of this repository's own workflows, armed
// ---------------------------------------------------------------------------

/** What the sources declare, and whether they could be read at all. */
interface DeclaredSources {
  /** Every display name `workflows/src/` declares. */
  readonly names: readonly string[];

  /** {@link SOURCES_READ} or what went wrong reading them. */
  readonly read: string;
}

/** What {@link declaredSources} answers for a read that worked. */
const SOURCES_READ = 'read';

/**
 * The display names this repository's own workflow sources declare.
 *
 * Read out of `workflows/src/` through the same function
 * `audit-workflows.ts` reads them with, and through the same
 * directory constant the build resolves, so the name this block
 * disarms is one the sources actually declare rather than one this
 * file asserts they do. A rename under that directory moves this
 * fixture with it.
 *
 * It answers with a sentence rather than throwing, so a directory
 * that cannot be read is a value the guard prints instead of a
 * failure at import that takes the file down before any case can
 * say what happened.
 *
 * @returns The names, and how the read went.
 */
function declaredSources(): DeclaredSources {
  try {
    return {
      names: expectedNames({ sourceDir: WORKFLOW_SOURCE_DIR }),
      read: SOURCES_READ,
    };
  } catch (cause) {
    return { names: [], read: `workflows/src/: ${String(cause)}` };
  }
}

/** Those names, read once. */
const DECLARED = declaredSources();

/** What {@link DECLARED_NAME} answers for sources that read empty. */
const NO_DECLARED_NAME = '(workflows/src/ declares no display name)';

/**
 * The one this block's instance holds armed.
 *
 * The first in the order `expectedNames` sorts them, which is by
 * the file each was read from. Which one it is does not matter and
 * is deliberately not written down here — what matters is that it
 * is one of them, which the guard reads back.
 */
const DECLARED_NAME = DECLARED.names[0] ?? NO_DECLARED_NAME;

/** The instance's own id for it, which is not the artifact's. */
const DECLARED_ID = 'wf-declared-01';

/** The display name of the inert workflow beside it. */
const INERT_NAME = 'AR Panic Inert';

/** The instance's id for that one. */
const INERT_ID = 'wf-inert-02';

/** The display name of the armed workflow nothing here declares. */
const STRAY_NAME = 'AR Panic Stray';

/** The instance's id for that one. */
const STRAY_ID = 'wf-stray-03';

/**
 * The display name of the workflow the listing states no `active`
 * for at all.
 *
 * The limit the module's own documentation names, made into a case
 * rather than left as a sentence: a workflow answered for without
 * that member reads as inert and is reported as already inactive,
 * which is a false negative in the one direction that matters. What
 * the case pins is that the reading is exactly `true` and nothing
 * looser — measured by loosening it to anything but `false`, which
 * moves the calls this block reads and nothing else in this file.
 */
const UNSTATED_NAME = 'AR Panic Unstated';

/** The instance's id for that one. */
const UNSTATED_ID = 'wf-unstated-04';

/**
 * What this block's instance is holding: two armed, one inert, and
 * one it states no `active` for — with the inert one BETWEEN the
 * two armed ones.
 *
 * The order is load-bearing. A pass that skipped the inert workflow
 * by breaking out of its walk rather than by not calling for it
 * would disarm the first and never reach the third, which the call
 * list and the line list each report from a different side.
 *
 * The fourth is last because it is the odd one: `active` is absent
 * rather than false, which is a shape no reply n8n's own handler
 * assembles and exactly the shape the module's reading of `active`
 * is documented to treat as inert. Nothing here says that reading
 * is the right one — it says it is the one taken.
 */
const HELD_BESIDE_THE_DECLARED_ONE: readonly RemoteWorkflow[] = [
  { active: true, id: DECLARED_ID, name: DECLARED_NAME },
  { active: false, id: INERT_ID, name: INERT_NAME },
  { active: true, id: STRAY_ID, name: STRAY_NAME },
  { active: undefined, id: UNSTATED_ID, name: UNSTATED_NAME },
];

/** What a deactivation this instance accepts answers with. */
const DISARMED_REPLY = JSON.stringify({ active: false });

/**
 * That instance: the listing for the GET, a disarmed workflow for
 * any deactivation.
 *
 * Keyed on the method rather than on the URL, the listing being the
 * one GET a pass makes and every deactivation being answered the
 * same way.
 *
 * @param call - The call as the stub recorded it.
 * @returns The listing, or the workflow as it now stands.
 */
function instanceHoldingThree(call: RecordedCall): string {
  return isListing(call)
    ? listingOf(HELD_BESIDE_THE_DECLARED_ONE)
    : DISARMED_REPLY;
}

/**
 * Whether `audit-workflows.ts` would refuse to act on the workflow
 * this block disarms.
 *
 * The other half of the property this block exists for, asked
 * through the very function an audit's acting walk asks it with and
 * over the very workflow the pass below disarms. A panic that had
 * grown that refusal, or an audit that had lost it, moves this.
 *
 * @returns The class an audit would refuse with, or what it did
 *   instead.
 */
function auditRefusalOverTheDeclaredOne(): string {
  const declared = HELD_BESIDE_THE_DECLARED_ONE[0];

  if (declared === undefined) {
    return '(this block holds no workflows)';
  }

  try {
    assertNotExpected('deactivate', declared, new Set(DECLARED.names));

    return '(an audit would have acted on it)';
  } catch (cause) {
    return cause instanceof ExpectedWorkflowError
      ? cause.name
      : `(refused with something else: ${String(cause)})`;
  }
}

describe('panic — an instance holding a workflow this repository declares', () => {
  // What the claims after it take on trust, in one record so a
  // fixture that drifted is named in the diff rather than reported
  // as a pass that behaved oddly.
  //
  // Four halves. The sources were read at all, which is what keeps
  // the name below from being a sentinel every other reading would
  // still accept. They declare the name this block's instance holds
  // armed, so the workflow being disarmed is genuinely one of this
  // repository's own. `assertNotExpected` refuses that same
  // workflow, which is the audit-side half of the property and the
  // whole reason this command is not a flag over there. And the
  // instance's id for it is not the display name, so nothing below
  // could be satisfied by a pass addressing workflows by name.
  it('holds a name the sources declare and an audit would refuse', () => {
    expect({
      theAuditRefusesTheSameWorkflow: auditRefusalOverTheDeclaredOne(),
      theInstanceIdIsNotTheName: DECLARED_ID !== DECLARED_NAME,
      theSourcesDeclareTheNameItHolds: DECLARED.names.includes(DECLARED_NAME),
      theSourcesWereRead: DECLARED.read,
    }).toStrictEqual({
      theAuditRefusesTheSameWorkflow: 'ExpectedWorkflowError',
      theInstanceIdIsNotTheName: true,
      theSourcesDeclareTheNameItHolds: true,
      theSourcesWereRead: SOURCES_READ,
    });
  });

  // The whole of the act in one list: a listing, and a deactivation
  // for each of the two the instance had armed, at the ids the
  // listing gave and in the order it gave them. Two of the four
  // produce no call at all, which is the absence this list carries.
  // The inert one sits BETWEEN the two that do, so a pass that
  // stopped at it shows up as a missing third label rather than as
  // a shorter list that could mean anything; the one the listing
  // states no `active` for sits behind them, and it is the reading
  // the module documents as exactly `true` and nothing looser.
  //
  // Measured: loosening that reading to anything but `false` reddens
  // this case and the one below it and nothing else in the file —
  // the unstated workflow gains a POST here and a `disarmed` line
  // there — which is why the fixture carries it at all.
  //
  // Read off the stub and never off what the pass returned. Its
  // outcome carries a disarmed list, which is the command's own
  // account of what it did: a run that assembled the wrong request
  // and one that assembled the right one can answer with the same
  // outcome, while the recorded calls are what an instance would
  // have received.
  //
  // The deactivations are addressed at the ids the LISTING gave, so
  // a pass matching on a display name would put its POSTs at paths
  // this list does not hold.
  it('disarms every armed workflow, the declared one included', async () => {
    const run = await panicRun(ACCEPTED_SETTINGS, instanceHoldingThree);

    expect({
      calls: run.calls.map(labelOf),
      refusal: refusalOf(run),
    }).toEqual({
      calls: [LISTING_CALL, disarmCall(DECLARED_ID), disarmCall(STRAY_ID)],
      refusal: NOT_REFUSED,
    });
  });

  // What an operator reads, and what the pass answered, in one
  // record. One line per workflow in the order the instance listed
  // them, then the counts and the verdict.
  //
  // The two are read together because neither is the other: the
  // lines are what a run that was interrupted has already said, and
  // the outcome is what a caller — `scripts/panic.sh`, through the
  // exit code — acts on. A command that reported three workflows
  // and answered with two would redden here and nowhere else.
  it('reports one line per workflow and closes on the counts', async () => {
    const run = await panicRun(ACCEPTED_SETTINGS, instanceHoldingThree);

    expect({ lines: run.lines, outcome: outcomeOf(run) }).toEqual({
      lines: [
        `disarmed ${DECLARED_NAME} id ${DECLARED_ID}`,
        `already inactive ${INERT_NAME} id ${INERT_ID}`,
        `disarmed ${STRAY_NAME} id ${STRAY_ID}`,
        `already inactive ${UNSTATED_NAME} id ${UNSTATED_ID}`,
        '4 on the instance, 2 disarmed, 2 already inactive, 0 still armed',
        'nothing on this instance is armed, so nothing on it is spending.',
      ],
      outcome: {
        disarmed: [
          `${DECLARED_NAME} id ${DECLARED_ID}`,
          `${STRAY_NAME} id ${STRAY_ID}`,
        ],
        held: 4,
        inactive: [
          `${INERT_NAME} id ${INERT_ID}`,
          `${UNSTATED_NAME} id ${UNSTATED_ID}`,
        ],
        refused: [],
      },
    });
  });
});

// ---------------------------------------------------------------------------
// An instance that will not let go of three of the four
// ---------------------------------------------------------------------------

/** The workflow the instance refuses the call for. */
const REFUSED_ID = 'wf-refused-01';

/** Its display name. */
const REFUSED_NAME = 'AR Panic Refused';

/** The workflow it takes the call for and answers still armed. */
const STUBBORN_ID = 'wf-stubborn-02';

/** Its display name. */
const STUBBORN_NAME = 'AR Panic Stubborn';

/** The display name of the workflow the listing gives no id for. */
const UNADDRESSABLE_NAME = 'AR Panic Unaddressable';

/** The workflow behind all three, which the instance disarms. */
const LAST_ID = 'wf-last-04';

/** Its display name. */
const LAST_NAME = 'AR Panic Last';

/**
 * What this block's instance is holding: three armed workflows it
 * will not let go of, and a fourth BEHIND them that it will.
 *
 * The order is the whole claim. A pass that stopped on the first
 * failure never reaches the fourth, so its position is what turns
 * `carries on` from an assertion about intent into one about a
 * recorded call.
 *
 * The third carries no `id` member at all, which is the one of the
 * three failures the instance is not asked about: it is refused
 * before a call is made.
 */
const HELD_AND_NOT_LET_GO_OF: readonly RemoteWorkflow[] = [
  { active: true, id: REFUSED_ID, name: REFUSED_NAME },
  { active: true, id: STUBBORN_ID, name: STUBBORN_NAME },
  { active: true, id: undefined, name: UNADDRESSABLE_NAME },
  { active: true, id: LAST_ID, name: LAST_NAME },
];

/** What the stubborn workflow's deactivation answers with. */
const STILL_ARMED_REPLY = JSON.stringify({ active: true });

/**
 * That instance's bodies: the listing, its refusal, the workflow it
 * hands back still armed, and a disarmed one for the last.
 *
 * @param call - The call as the stub recorded it.
 * @returns What it answers that call with.
 */
function instanceRefusingThree(call: RecordedCall): string {
  if (isListing(call)) {
    return listingOf(HELD_AND_NOT_LET_GO_OF);
  }

  if (call.url.includes(REFUSED_ID)) {
    return REFUSED_BODY;
  }

  return call.url.includes(STUBBORN_ID)
    ? STILL_ARMED_REPLY
    : DISARMED_REPLY;
}

/**
 * That instance's statuses: a refusal for one deactivation and a
 * success for everything else.
 *
 * The stubborn workflow is answered with a SUCCESS carrying it
 * still armed, which is the point of it: a pass reading the call's
 * outcome rather than the reply's would count that one as disarmed.
 *
 * @param call - The call as the stub recorded it.
 * @returns The status it answers that call with.
 */
function refusesTheFirstDeactivation(call: RecordedCall): number {
  return call.url.includes(REFUSED_ID)
    ? REFUSED_STATUS
    : FIRST_SUCCESS_STATUS;
}

describe('panic — an instance that leaves three workflows armed', () => {
  // Every call this pass made, and the claim is the LAST of them. A
  // pass that stopped where the instance refused would answer with
  // this list minus its last two labels; one that stopped where a
  // workflow carried no id would answer with it minus the last. So
  // the failure this block is about is visible as a shorter list
  // rather than as a count nobody can attribute.
  //
  // Three deactivations for four workflows, the unaddressable one
  // producing no call: it is refused before a request is made,
  // which is what keeps a workflow the instance never named from
  // being POSTed at `/workflows/undefined/deactivate`.
  it('carries on past every failure and reaches the last workflow', async () => {
    const run = await panicRun(
      ACCEPTED_SETTINGS,
      instanceRefusingThree,
      refusesTheFirstDeactivation,
    );

    expect({
      calls: run.calls.map(labelOf),
      refusal: refusalOf(run),
    }).toEqual({
      calls: [
        LISTING_CALL,
        disarmCall(REFUSED_ID),
        disarmCall(STUBBORN_ID),
        disarmCall(LAST_ID),
      ],
      refusal: NOT_REFUSED,
    });
  });

  // The three failures sorted, each under the tag of the reason it
  // is about, and the fourth workflow in the disarmed list where a
  // fail-fast pass would leave it in neither.
  //
  // The stubborn one is the reading the call's own success cannot
  // give: the instance answered 200 and handed the workflow back
  // still armed, so a pass concluding from the call rather than
  // from the reply would report it disarmed. It is a separate row
  // from the refused one for that reason — the two are different
  // branches and are separately deletable.
  it('sorts each failure under its own reason and disarms the rest', async () => {
    const run = await panicRun(
      ACCEPTED_SETTINGS,
      instanceRefusingThree,
      refusesTheFirstDeactivation,
    );

    expect(outcomeOf(run)).toEqual({
      disarmed: [`${LAST_NAME} id ${LAST_ID}`],
      held: 4,
      inactive: [],
      refused: [
        `${REFUSED_NAME} id ${REFUSED_ID}: ${TAG_REFUSED}`,
        `${STUBBORN_NAME} id ${STUBBORN_ID}: ${TAG_STILL_ARMED}`,
        `${UNADDRESSABLE_NAME} id <no id>: ${TAG_NO_ID}`,
      ],
    });
  });

  // What an operator sees of that run, reasons read down to tags.
  // The verdict is the half worth having a case for: a pass that
  // left three armed has to say so in the words an operator acts
  // on, and it is the one line that sends them at the instance
  // itself rather than at this command.
  it('names each workflow it left armed and says the instance is spending', async () => {
    const run = await panicRun(
      ACCEPTED_SETTINGS,
      instanceRefusingThree,
      refusesTheFirstDeactivation,
    );

    expect(run.lines.map(taggedLine)).toEqual([
      `STILL ARMED ${REFUSED_NAME} id ${REFUSED_ID}: ${TAG_REFUSED}`,
      `STILL ARMED ${STUBBORN_NAME} id ${STUBBORN_ID}: ${TAG_STILL_ARMED}`,
      `STILL ARMED ${UNADDRESSABLE_NAME} id <no id>: ${TAG_NO_ID}`,
      `disarmed ${LAST_NAME} id ${LAST_ID}`,
      '4 on the instance, 1 disarmed, 0 already inactive, 3 still armed',
      '3 still armed and still able to spend. Read the reasons above, and '
      + 'stop the instance itself if they cannot be cleared.',
    ]);
  });
});

// ---------------------------------------------------------------------------
// The summary read as a value
// ---------------------------------------------------------------------------

describe('panic — the counts and the verdict', () => {
  // The rendering, over an outcome larger than any run in this file
  // produces: forty on the instance, one disarmed, thirty-nine
  // already inert. What it pins is the wording, the order of the
  // four counts, and that the verdict is decided by the refused
  // list ALONE rather than by how much of the instance the pass
  // touched — an instance holding thirty-nine inert workflows reads
  // as stopped.
  //
  // What it does NOT catch is worth recording, because the obvious
  // reading of the fixture is that it does. A summary that summed
  // the three lists instead of reading `held` leaves this case
  // GREEN, measured: the loop partitions the listing, so the total
  // and the sum are equal on every outcome that command can
  // produce, and the two spellings are behaviourally identical. The
  // failure that WOULD break the partition — a pass that stopped
  // part way through — is the third block's to report, and it
  // reddens three cases there.
  it('renders the four counts and reads the verdict off the refusals', () => {
    expect(formatPanicSummary({
      disarmed: ['AR One id wf-01'],
      held: 40,
      inactive: Array.from({ length: 39 }, (_, at) => `AR ${at} id wf-${at}`),
      refused: [],
    })).toBe(
      '40 on the instance, 1 disarmed, 39 already inactive, 0 still armed\n'
      + 'nothing on this instance is armed, so nothing on it is spending.',
    );
  });
});
