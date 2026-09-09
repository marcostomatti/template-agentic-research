/**
 * @packageDocumentation
 * The external half of the panic stop: every workflow an n8n
 * instance has armed, disarmed in one pass, over the public REST
 * API that instance exposes.
 *
 * WHAT PANIC IS FOR. Two surfaces in this project can spend money
 * without anybody typing anything: the local stack's containers,
 * and whatever `AR_N8N_URL` names. An armed schedule trigger drives
 * model passes on its own, against whatever it was built from, for
 * as long as the instance is up. This command is the second of
 * those two surfaces. `scripts/panic.sh` is the shell that covers
 * both: it runs this command FIRST and stops the local stack
 * behind it, that order being what keeps a container from coming
 * back armed at the next start and what lets an `AR_N8N_URL`
 * naming this stack's own instance still be reachable when the
 * call is made. Running this by path on its own remains the way
 * to reach an instance somewhere else. Nothing here touches a
 * container, a compose file or a shell on the host being reached,
 * which is the same reach `deploy-external.ts` has and for the same
 * reason: an instance somebody else operates is the case the API
 * side exists to cover.
 *
 * WHY `audit-workflows.ts --deactivate` CANNOT SERVE, which is the
 * whole reason this file exists rather than a flag being added over
 * there. That command deactivates STRAYS, and it carries a refusal
 * — `assertNotExpected` — that stops it reaching a workflow
 * `workflows/src/` declares. Panic wants the exact opposite set:
 * the six workflows this repository deploys are the ones built to
 * call a model, so they are the first thing a stop has to reach.
 * The two commands would have to disagree about their target set
 * whatever flag was hung on which, and one command holding both
 * readings is one an operator has to get right under pressure.
 *
 * SO THIS READS NO SOURCES AT ALL. There is no `expectedNames` call
 * below, no `workflows/src/` read, and no classification. The
 * target set is whatever the instance says it has armed, which
 * makes the verdict a property of the instance rather than of the
 * checkout the command was run from — and that difference is worth
 * stating, because an audit run from an older checkout reports a
 * newer checkout's workflows as strays, and a panic run from any
 * checkout at all stops the same things.
 *
 * IT ASKS NOTHING AND TAKES NO FLAGS. `audit-workflows.ts` refuses
 * either of its acting flags unless `--yes` sits beside it, and
 * that is right for a command whose default is an inventory. It is
 * wrong here twice over: the whole command is the act, so a
 * confirmation would be a confirmation of running it at all; and
 * what it does is reversible, a disarmed workflow staying on the
 * instance under the same id with `activateWorkflow` and the CLI
 * publish path both able to put it back. What is NOT reversible is
 * the hour of model calls a hesitation costs. `deleteWorkflow` is
 * next door in the same module and is reached from nowhere in this
 * file for the same reason.
 *
 * IT REFUSES BEFORE IT REACHES ANYTHING. `requireInstance` in
 * `deploy-external.ts` is what turns the two settings into
 * something a call can be made with, and this command reaches it
 * the way an audit does rather than spelling a second refusal:
 * `AR_N8N_URL` and `AR_N8N_API_KEY` are one pair, an operator who
 * has set neither has configured none of the three commands that
 * want them, and a refusal naming one of two buys a second run to
 * learn the other. Nothing is requested before it clears, which is
 * a property of the signature — every call in `n8n-client.ts`
 * takes an `N8nInstance`, and this file constructs one in exactly
 * one place.
 *
 * IT DOES NOT STOP ON THE FIRST REFUSAL, and that is the one place
 * its control flow parts from `actOnStrays` in
 * `audit-workflows.ts`. An audit acting on strays stops where the
 * instance refuses a call, which is right for a run an operator
 * will read and repeat. A panic that stopped on the third of six
 * would leave three armed and spending, having been asked to stop
 * everything — so each workflow is attempted, whatever became of
 * the one before it, and what could not be disarmed is carried to
 * the end and reported there. {@link PanicOutcome.refused} is that
 * list, and it is what the exit code is taken from: a run that
 * reached the instance and left something armed exits 1, so the
 * shell that calls this can tell it from one that finished.
 *
 * WHAT COUNTS AS ARMED IS THE INSTANCE'S OWN `active`, read as
 * exactly `true` and nothing looser — the same reading
 * `Classification.activeStray` takes next door, so an operator
 * holding an audit beside a panic is reading one word for one
 * state. The limit that rides with it is worth naming rather than
 * leaving to be discovered: a workflow the instance answered for
 * without an `active` member reads as inert here and is reported as
 * already inactive, and no call is made for it, which is a false
 * negative in the one direction that matters. Whether an instance
 * can answer that way at all was NOT measured for this command, so
 * the reading is stated rather than defended — and it is pinned as
 * behaviour by a case in `tests/scripts/panic-external.test.ts`
 * rather than left to be discovered by whoever meets such a
 * reply.
 *
 * THE VERDICT IS A READ-BACK AND NOT THE CALL'S EXIT. Every one of
 * these routes answers with the workflow as the instance now holds
 * it, so {@link disarmEveryWorkflow} reads `active` off the REPLY
 * rather than concluding from a call that did not throw. A reply
 * still carrying `true` puts the workflow in the refused list under
 * that reason. It costs nothing — the answer is already in hand —
 * and it is the difference between reporting that a request was
 * accepted and reporting that a workflow was stopped.
 */

import type { InstanceSettings } from './deploy-external.js';
import type { HttpFetch, N8nInstance, RemoteWorkflow } from './n8n-client.js';

import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { config } from '../src/config.js';

import {
  UnconfiguredInstanceError,
  requireInstance,
} from './deploy-external.js';
import {
  UnsuccessfulReplyError,
  deactivateWorkflow,
  listWorkflows,
} from './n8n-client.js';

/**
 * How a workflow the instance answered with no display name is
 * printed.
 *
 * Its own constant rather than one shared with
 * `audit-workflows.ts`, which spells the same sentinel for the same
 * absence. Nothing holds the two reports together and nothing
 * should: they answer different questions, and a shared vocabulary
 * would be a coupling between two commands that are deliberately
 * free to say different things about one instance.
 */
const NO_NAME = '<no display name>';

/** How a workflow it answered with no id is printed. */
const NO_ID = '<no id>';

/**
 * One workflow as a line of the report names it.
 *
 * The name and the id, and no third reading: what state it was in
 * is what the line's own prefix says, so a label carrying it too
 * would be printing the same fact twice and would read wrongly on
 * the one line that matters — `disarmed <name> (armed)` describes
 * neither the state before nor the state after.
 *
 * Every member is read defensively and none is refused. This is
 * report text, and a workflow answered for in a shape this command
 * did not expect is exactly the one an operator most needs named —
 * so a missing name or id prints as the absence it is rather than
 * taking the report down. The id is there because it is what a
 * canvas URL ends in and what an operator arms the workflow again
 * by when the emergency is over.
 *
 * @param workflow - The workflow to name.
 * @returns Its display name and the instance's id for it.
 */
function workflowLabel(workflow: RemoteWorkflow): string {
  const { id, name } = workflow;
  const called = typeof name === 'string'
    ? name
    : NO_NAME;
  const at = typeof id === 'string'
    ? id
    : NO_ID;

  return `${called} id ${at}`;
}

/**
 * One workflow this run was asked to disarm and did not.
 *
 * The label and the reason, because neither is worth much alone.
 * The reason on its own does not say which workflow is still
 * spending, and the label on its own leaves an operator with a name
 * and no idea whether to retry it, look it up on the canvas or go
 * and stop the instance.
 */
export interface PanicRefusal {
  /** The workflow, as {@link workflowLabel} names it. */
  readonly label: string;

  /** Why it is still armed, in one sentence and no stack. */
  readonly reason: string;
}

/**
 * What one pass over an instance did.
 *
 * Four readings and every one of them a count an operator acts on.
 * {@link PanicOutcome.held} is what the instance answered the
 * listing with, and it is what the other three are read against: a
 * run that disarmed two of two is a different report from one that
 * disarmed two of forty, and neither is legible from the acted-on
 * numbers alone.
 *
 * The three lists are labels rather than workflows. Nothing
 * downstream reads a member off one, the report is the only
 * consumer, and a value carrying whole workflows would be carrying
 * every member an instance chose to answer with into whatever a
 * caller does with it.
 *
 * They partition the listing: every workflow the instance answered
 * with lands in exactly one of the three, so
 * `disarmed + inactive + refused` is `held` on every run. Nothing
 * here asserts that — it is a property of the one loop that fills
 * them — and a case reading the four together is what says it still
 * holds.
 */
export interface PanicOutcome {
  /** Every workflow this run stopped, in the order it listed. */
  readonly disarmed: readonly string[];

  /** How many workflows the instance answered the listing with. */
  readonly held: number;

  /** Every workflow it was already holding inert. */
  readonly inactive: readonly string[];

  /** Every workflow that is still armed, and why. */
  readonly refused: readonly PanicRefusal[];
}

/** Why a workflow with no id could not be reached. */
const NO_ID_REASON
  = 'the instance answered with no id to address it by, so there is '
  + 'no path to disarm it at';

/** Why a workflow the instance accepted the call for is still armed. */
const STILL_ARMED_REASON
  = 'the instance took the call and answered with the workflow still '
  + 'armed';

/**
 * Disarm one workflow, and say what stopped it if anything did.
 *
 * Three ways this answers a reason and each is a different failure.
 * A workflow carrying no id is one this command can report and
 * cannot address; a call the instance refused arrives as whatever
 * was thrown, which is `UnsuccessfulReplyError` carrying the
 * endpoint, the status and the body where there was an instance to
 * answer at all; and a call it took while answering with the
 * workflow still armed is the read-back the packageDocumentation
 * argues for.
 *
 * The catch is broad on purpose and it is narrow in what it can
 * reach. Everything inside the `try` but the call is a member read
 * on a value `workflowOf` in `n8n-client.ts` has already refused
 * unless it is a non-null object, so the only statement there that
 * can throw is the request. What that buys is the property this
 * command is built around: one workflow the instance would not take
 * does not end the pass.
 *
 * A thrown value that is not an `Error` is rendered rather than
 * dropped. Nothing on this path is known to throw one — an injected
 * fetch is the only place one could come from — and a reason
 * reading `[object Object]` is still a workflow named as still
 * armed, where a swallowed one would be a workflow reported
 * disarmed.
 *
 * @param instance - The instance the workflow is on.
 * @param workflow - The workflow to disarm.
 * @returns Why it is still armed, or `null` where the instance
 *   answered with it disarmed.
 */
async function disarmOne(
  instance: N8nInstance,
  workflow: RemoteWorkflow,
): Promise<string | null> {
  const { id } = workflow;

  if (typeof id !== 'string') {
    return NO_ID_REASON;
  }

  try {
    const stored = await deactivateWorkflow(instance, id);

    return stored.active === true
      ? STILL_ARMED_REASON
      : null;
  } catch (cause) {
    return cause instanceof Error
      ? cause.message
      : String(cause);
  }
}

/** How a workflow this run stopped is announced. */
const DISARMED_PREFIX = 'disarmed';

/** How one it found inert is announced. */
const INACTIVE_PREFIX = 'already inactive';

/** How one it could not stop is announced. */
const REFUSED_PREFIX = 'STILL ARMED';

/**
 * List the instance and disarm everything it has armed.
 *
 * One line per workflow and one loop, in the order the instance
 * listed, so the report is a walk of the listing rather than three
 * blocks a reader has to reassemble. Each line is printed AFTER the
 * call it is about has returned, which is what makes the output
 * usable as a record: an operator who interrupts a pass, or whose
 * process is killed part way through it, has already been told
 * exactly what happened and nothing that has not.
 *
 * That is also why nothing here defers its writing to a formatter
 * over the returned value the way `scripts/llm-connector.ts` does.
 * That command reports on a state it read; this one reports on
 * changes it is making one at a time, and a report assembled at the
 * end would be a report a run that did not reach the end never
 * writes.
 *
 * The listing is not wrapped and a failure there ends the pass.
 * There is nothing to walk if the instance would not say what it
 * holds, and a command that carried on past it would be reporting
 * `0 armed` about an instance it never read — the one report on
 * this path that would be read as good news.
 *
 * @param instance - The instance to stop.
 * @returns What it did, per workflow and in counts.
 * @throws UnsuccessfulReplyError When the instance refuses the
 *   listing.
 * @throws Error When a page of the listing is not a listing, or the
 *   instance offers more pages than the client will follow.
 */
export async function disarmEveryWorkflow(
  instance: N8nInstance,
): Promise<PanicOutcome> {
  const held = await listWorkflows(instance);
  const disarmed: string[] = [];
  const inactive: string[] = [];
  const refused: PanicRefusal[] = [];

  for (const workflow of held) {
    const label = workflowLabel(workflow);

    if (workflow.active === true) {
      const reason = await disarmOne(instance, workflow);

      if (reason === null) {
        disarmed.push(label);
        console.log(`${DISARMED_PREFIX} ${label}`);
      } else {
        refused.push({ label, reason });
        console.log(`${REFUSED_PREFIX} ${label}: ${reason}`);
      }
    } else {
      inactive.push(label);
      console.log(`${INACTIVE_PREFIX} ${label}`);
    }
  }

  return { disarmed, held: held.length, inactive, refused };
}

/** The verdict where the instance has nothing armed left. */
const STOPPED
  = 'nothing on this instance is armed, so nothing on it is spending.';

/**
 * The verdict where something is.
 *
 * It says what to do rather than only what happened, because an
 * operator reading it is in the middle of an emergency: the
 * instance itself is the next lever, and it is one this command
 * cannot reach — the local stack's containers are stopped beside
 * this command rather than by it, and an instance somewhere else is
 * stopped by whoever operates it.
 */
const STILL_SPENDING
  = 'still armed and still able to spend. Read the reasons above, and '
  + 'stop the instance itself if they cannot be cleared.';

/**
 * The two closing lines of the report.
 *
 * A pure function of the outcome, unlike the per-workflow lines
 * above, so the wording and the verdict are readable as a value
 * rather than only as console output.
 *
 * The counts line names all four readings, `held` included. Three
 * counts with no total is the shape that reads as complete and is
 * not: `2 disarmed, 0 already inactive, 0 still armed` says nothing
 * about whether the instance holds two workflows or two hundred.
 *
 * What reading the total buys is bounded, and it was measured
 * rather than assumed. The loop above partitions the listing, so
 * `held` and the sum of the three lists are equal on every outcome
 * this command can produce, and a summary that added them up
 * instead would be behaviourally identical — measured by making
 * that substitution, which leaves the whole of
 * `tests/scripts/panic-external.test.ts` green. The total is read
 * anyway, because that equality is a property of one loop rather
 * than of anything this function can see.
 *
 * @param outcome - What the pass did.
 * @returns The counts and the verdict, newline-separated and
 *   unterminated.
 */
export function formatPanicSummary(outcome: PanicOutcome): string {
  return [
    `${outcome.held} on the instance, `
    + `${outcome.disarmed.length} disarmed, `
    + `${outcome.inactive.length} already inactive, `
    + `${outcome.refused.length} still armed`,
    outcome.refused.length === 0
      ? STOPPED
      : `${outcome.refused.length} ${STILL_SPENDING}`,
  ].join('\n');
}

/**
 * Everything this command cannot find out for itself.
 *
 * Two seams and no third: there is no command line to read and no
 * source tree to point at, which is the whole of what parts this
 * from `AuditOptions` next door. The settings arrive UNREFUSED and
 * the fetch arrives beside them, which is the pair a deploy and an
 * audit both take for the same reason — {@link requireInstance} is
 * what turns the two into something a call can be made with, and
 * holding an already-refused value here would put the refusal
 * outside the run that is supposed to report it.
 */
export interface PanicOptions {
  /**
   * What the calls go through, taken as an argument so that a case
   * drives them against a stub and the isolated suite stays
   * isolated by construction.
   */
  readonly fetch: HttpFetch;

  /**
   * The two settings as configuration answered for them, either of
   * them possibly unset.
   */
  readonly settings: InstanceSettings;
}

/**
 * One panic pass end to end: refuse an environment naming no
 * instance, list what it holds, disarm everything armed, and close
 * on the counts.
 *
 * The refusal is first and it is the only one in front of the pass.
 * An audit checks its confirmation flag ahead of configuration
 * because the flag is about what the operator typed; there is no
 * flag here, so the ordering question does not arise and the
 * instance is the first thing asked for.
 *
 * The summary is printed whatever happened, including over an
 * instance holding nothing at all — `0 on the instance` and the
 * stopped verdict, which is the correct report for an instance with
 * no workflows on it and the same one an operator gets from a
 * second run of a pass that worked.
 *
 * @param options - What to reach and how. Defaults to what
 *   configuration answers for; a caller handing over its own is
 *   what makes this drivable with no instance.
 * @returns What the pass did.
 * @throws UnconfiguredInstanceError When either setting is absent
 *   or blank, naming every one that is, before any request.
 * @throws UnsuccessfulReplyError When the instance refuses the
 *   listing. A call refused for ONE workflow is reported rather
 *   than thrown.
 */
export async function runPanicExternalCli(
  options: PanicOptions = configuredOptions(),
): Promise<PanicOutcome> {
  const { fetch: through, settings } = options;
  const instance = requireInstance(settings, through);
  const outcome = await disarmEveryWorkflow(instance);

  console.log(formatPanicSummary(outcome));

  return outcome;
}

/**
 * Those two seams with their real values in them.
 *
 * Read through the schema in `src/config.ts` rather than off
 * `process.env`, so this command, the deploy and the audit resolve
 * one pair of settings the same way and a malformed environment is
 * refused once, at import, by the schema that owns them.
 *
 * The fetch is the global one. `n8n-client.ts` reaches for no
 * global of its own, which is what leaves this the single place in
 * the command where the real network is chosen.
 *
 * @returns The settings and the fetch a real run uses.
 */
function configuredOptions(): PanicOptions {
  return {
    fetch,
    settings: {
      apiKey: config.AR_N8N_API_KEY,
      baseUrl: config.AR_N8N_URL,
    },
  };
}

/**
 * Every refusal this command raises on purpose and can name by
 * class.
 *
 * Two, where an audit's roster is four: there is no acting flag to
 * leave unconfirmed and no source tree to hold an instance against,
 * so what is left is the environment that named no instance and the
 * one call whose failure ends the pass. A call refused for a single
 * workflow reaches no roster at all — it is caught where it is made
 * and reported as a line, which is the control-flow decision this
 * command is built around.
 *
 * What no roster reaches is the plain `Error`s `listWorkflows`
 * raises over a page that is not a listing or a cursor that will
 * not stop. Each is as much a report as either named here and
 * neither carries a class to be named by, so admitting them would
 * mean admitting bare `Error` — which is every unexpected failure
 * on the path as well, whatever an injected fetch throws included.
 * So they print with a stack over them, which buries the message
 * rather than losing it.
 */
const PANIC_REFUSALS = [UnconfiguredInstanceError, UnsuccessfulReplyError];

/**
 * Whether a caught value is one this command can report as a
 * message.
 *
 * @param cause - What the run threw.
 * @returns Whether its message is the whole report.
 */
function isPanicRefusal(cause: unknown): cause is Error {
  return PANIC_REFUSALS.some((refusal) => cause instanceof refusal);
}

/**
 * Whether this file is what the process was started with, rather
 * than something another module imported.
 *
 * `import.meta.url` is a `file:` URL where `process.argv[1]` is a
 * path, so comparing the two as they come is false however the
 * process was started and the block below would silently never run.
 * `fileURLToPath` is what makes the comparison able to hold at all;
 * `scripts/build-workflows.ts` carries the measurement behind that
 * and the reason the guard cannot be moved into a shared helper.
 *
 * Worth asking here more than anywhere else in this directory.
 * `bun scripts/panic-external.ts` disarms every workflow an
 * instance has armed; a case importing {@link disarmEveryWorkflow}
 * or {@link formatPanicSummary} gets the exports and reaches
 * nothing. An unguarded import on a machine that has the two
 * settings would stop somebody's instance out of a run that asked
 * for none of it, and this command needs no flag to do it.
 */
const INVOKED_AS_CLI = process.argv[1] !== undefined
  && fileURLToPath(import.meta.url) === process.argv[1];

if (INVOKED_AS_CLI) {
  try {
    const outcome = await runPanicExternalCli();

    // A pass that reached the instance and left something armed is
    // not a success, and the shell that will call this is the caller
    // that has to be able to tell the two apart: the per-workflow
    // lines have already said which workflows and why, so the code is
    // the whole of what is added here.
    if (outcome.refused.length > 0) {
      process.exitCode = 1;
    }
  } catch (cause) {
    // Each refusal on the roster is already a report — the settings
    // nobody supplied, or the listing an instance would not answer
    // — so a stack over it buries the thing worth reading. Anything
    // else is unexpected, and there the stack is what a reader
    // needs. `PANIC_REFUSALS` argues which failures fall on the
    // wrong side of that line.
    process.exitCode = 1;
    console.error(
      isPanicRefusal(cause)
        ? cause.message
        : cause,
    );
  }
}
