/**
 * @packageDocumentation
 * Reads back what an n8n instance is holding and names the workflows
 * on it that this repository does not account for. A deploy matches
 * on a display name and touches what it matched; everything else the
 * instance carries — a workflow uploaded off an older checkout, one
 * left behind by a rename, one somebody built on the canvas — is
 * invisible to it, because `deploy-external.ts` reads the listing to
 * match on and not to judge. Judging it is what this command is for.
 *
 * Read-only unless asked otherwise, which is the shape the roster in
 * `README.md` beside it gives the command rather than a caution about
 * running it: an inventory that could change what it inventories is
 * not one anybody runs for a look. So the default is the inventory
 * and nothing else, and the two flags that do change something —
 * {@link DEACTIVATE_FLAG} and {@link PRUNE_FLAG} — are opt-in twice
 * over, each of them refused unless {@link CONFIRM_FLAG} is on the
 * same command line.
 *
 * The judging is separable from everything that makes it possible,
 * which is what makes it drivable. {@link classify} takes two lists
 * and answers with five readings and a verdict over them, opening no
 * socket, reading no file and knowing nothing about where either list
 * came from — so the question this command exists to settle can be
 * driven from a case holding two literals, with nothing stubbed and
 * no instance in front of it. {@link expectedNames} reads the
 * workflow sources for one of those two lists and
 * `listWorkflows` in `n8n-client.ts` reads the instance for the
 * other. {@link runAuditCli} is the sequence those are steps in, and
 * the guard beneath it is what leaves importing this module running
 * none of it.
 *
 * Nothing here refuses on the verdict. A not-clean instance is
 * reported and the process still exits 0, because what this command
 * answers is a question and not a gate — an operator reads it, and
 * the two flags are how they act on what they read. Only a refusal
 * exits non-zero.
 */

import type { InstanceSettings } from './deploy-external.js';
import type { HttpFetch, N8nInstance, RemoteWorkflow } from './n8n-client.js';

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { config } from '../src/config.js';

import { WORKFLOW_SOURCE_DIR } from './build-workflows.js';
import {
  UnconfiguredInstanceError,
  requireInstance,
} from './deploy-external.js';
import {
  UnsuccessfulReplyError,
  deactivateWorkflow,
  deleteWorkflow,
  listWorkflows,
} from './n8n-client.js';
import { ENV_MARKER, LIB_MARKER } from './workflow-markers.js';

/**
 * One display name the instance holds more than one workflow under.
 *
 * Both halves are worth carrying. The name is the edit — a rename
 * under `workflows/src/`, or a workflow removed on the instance — and
 * the workflows say how far the collision goes and which of them an
 * operator is choosing between.
 */
export interface DuplicateName {
  /** The name they all answer to. */
  readonly name: string;

  /** Every workflow holding it, in the order the instance listed. */
  readonly workflows: readonly RemoteWorkflow[];
}

/**
 * What an instance is holding, sorted against what is expected of it.
 */
export interface Classification {
  /** Workflows an expected name accounts for. */
  readonly known: readonly RemoteWorkflow[];

  /** Workflows no expected name accounts for. */
  readonly stray: readonly RemoteWorkflow[];

  /**
   * The strays the instance has ARMED, which is an `active` of
   * exactly `true` and nothing looser.
   *
   * Counted apart from the rest of them because an armed stray is the
   * only kind that is spending. One sitting inert holds a name and
   * costs nothing until somebody arms it, while one on a schedule
   * runs on its own, against whatever it was built from, and answers
   * to nobody holding this repository. That is what makes it the
   * reading an operator acts on first.
   */
  readonly activeStray: readonly RemoteWorkflow[];

  /** Expected names the instance holds no workflow under. */
  readonly missing: readonly string[];

  /** Names it holds more than one workflow under. */
  readonly duplicate: readonly DuplicateName[];

  /**
   * Whether the instance is holding nothing it should not.
   *
   * A stray or a duplicate makes this false and a missing workflow
   * alone leaves it true, which is not an oversight. What is missing
   * is the instance sitting BEHIND this repository and one deploy
   * away from being level with it; a stray is the instance carrying
   * something no part of this repository accounts for, and a
   * duplicate is a name that has stopped naming one workflow. Both of
   * those are states only a read of the instance itself can find.
   */
  readonly clean: boolean;
}

/**
 * Sort what an instance is holding against what is expected of it.
 *
 * Nothing is read and nothing is reached: the two lists are the whole
 * of the input and the answer is built out of them. Neither is
 * written to, so a caller may hold on to both and read them again
 * afterwards.
 *
 * What those readings are worth is settled outside this function.
 * {@link Classification.stray} and {@link Classification.clean} are
 * claims about `expected` as much as about the instance, and nothing
 * here knows or checks where that list came from, which makes the
 * choice of list the caller's whole responsibility rather than a
 * detail of it. What this command hands over is read off
 * `workflows/src/` by {@link expectedNames} and never off a record of
 * what some deploy put on an instance.
 *
 * A record of deploys would be answering a different question in the
 * same shape. It accounts for acts, where an audit asks what this
 * repository declares, and the two come apart in precisely the cases
 * this command exists for. Shared, such a record carries whatever
 * another machine's deploy uploaded, off a branch or a fork this
 * checkout knows nothing about, so the workflow an audit is for reads
 * as expected and is never named. Kept per machine it goes wrong the
 * other way, ratifying what this machine put there off an older
 * checkout under a name no source carries any more, which is the case
 * `deploy` in `deploy-external.ts` names as the one it does not
 * notice.
 *
 * Nor is there such a record to prefer: `deploy` answers with a
 * report of what it did and writes nothing down. What reading the
 * sources costs instead is that the expected set moves with the
 * checkout — it is whatever this commit declares, so an audit run
 * from an older one reports the workflows a newer one added as
 * strays. The verdict is the instance held against one commit, and
 * which commit that is belongs to whoever ran the command.
 *
 * A workflow whose name is not a string is a stray rather than one
 * this passes over. It can equal no expected name, so it is not a
 * match that was dropped but one that was never there — which is the
 * reading `remoteIdsByName` in `deploy-external.ts` already takes,
 * where such a workflow is skipped and what an instance is doing
 * holding it is handed on to an audit. This is that audit. Carrying
 * no name it is keyed under none, so it can be neither missing nor a
 * duplicate: those two are claims about names.
 *
 * {@link Classification.missing} follows the order `expected` was
 * given in, and a name given twice is one name. The other four follow
 * the order the instance listed in, which is the instance's own order
 * and not this repository's.
 *
 * @param remote - Every workflow the instance answered with.
 * @param expected - Every display name this repository accounts for.
 * @returns The five readings over those two lists, and the verdict.
 */
export function classify(
  remote: readonly RemoteWorkflow[],
  expected: readonly string[],
): Classification {
  const wanted = new Set(expected);
  const held = new Map<string, RemoteWorkflow[]>();
  const known: RemoteWorkflow[] = [];
  const stray: RemoteWorkflow[] = [];
  const activeStray: RemoteWorkflow[] = [];

  for (const workflow of remote) {
    const { name } = workflow;

    if (typeof name === 'string') {
      const sharing = held.get(name) ?? [];

      sharing.push(workflow);
      held.set(name, sharing);

      if (wanted.has(name)) {
        known.push(workflow);
        continue;
      }
    }

    stray.push(workflow);

    if (workflow.active === true) {
      activeStray.push(workflow);
    }
  }

  const missing = [...wanted].filter((name) => !held.has(name));
  const duplicate = [...held]
    .filter(([, sharing]) => sharing.length > 1)
    .map(([name, workflows]) => ({ name, workflows }));

  return {
    activeStray,
    clean: stray.length === 0 && duplicate.length === 0,
    duplicate,
    known,
    missing,
    stray,
  };
}

/**
 * Build-marker text, in either grammar, anywhere in a string.
 *
 * Compiled here rather than imported compiled, and out of the
 * exported sources rather than from a second copy of the two
 * grammars, for the reason `ForbiddenPattern.source` in
 * `tests/invariants/naming-patterns.ts` gives: a shared global
 * instance carries `lastIndex` from one call into the next. Measured
 * on these two grammars, that costs the refusal itself — a global
 * instance refuses a name on one call and passes the identical name
 * on the next, the throw being what stops the walk before any second
 * name is reached. This instance is not global, and the grammars are
 * the build's own, so what is read here and what the build resolves
 * cannot drift.
 *
 * Both forms are read even though only a setting marker is a
 * plausible thing to write in a display name. Neither resolves to
 * itself, so what an instance holds is not what the source says
 * either way, and a rule admitting one of them would be narrower than
 * the property for no reason a reader could see. The retired forms
 * are left out: a source carrying one is refused by the build, so it
 * has no artifact, nothing was ever deployed from it, and its name
 * being reported missing is exact rather than a false reading.
 */
const BUILD_MARKER = new RegExp(`${LIB_MARKER}|${ENV_MARKER}`, 'u');

/**
 * Where an audit reads what this repository declares.
 *
 * One member, and a bag rather than a bare path, because the member
 * name is the whole of what ties a call site to the build's own
 * `sourceDir`. The two have to name ONE directory: an expectation
 * read out of some other tree is still a list of names, still sorts
 * against a listing, and still answers with a verdict, so nothing
 * downstream can tell it from a verdict about this repository. A bare
 * string carries none of that to a call site, where a directory
 * handed over wrongly looks exactly like one handed over right.
 */
export interface ExpectedNamesOptions {
  /**
   * The directory `*.json` workflow sources are read out of,
   * `workflows/src/` in a real audit.
   *
   * A parameter carrying no default, the way `buildAll` in
   * `build-workflows.ts` takes both of its directories: the real path
   * reaches this command from its own command line, still to come,
   * and nothing in this module knows it. It is also what lets a case
   * drive the read over a tree of its own rather than over the one
   * the rest of this package is built from.
   */
  readonly sourceDir: string;
}

/**
 * Read the display name one workflow source declares.
 *
 * Neither the read nor the parse is wrapped. A file the listing named
 * and a read cannot open arrives as `readFileSync` raised it, naming
 * the absolute path, and one holding something that is not JSON
 * arrives as the `SyntaxError` `JSON.parse` raises. Wrapping either
 * would put this command's own error in front of a cause that already
 * names the file and says what is wrong with it.
 *
 * The parse is read as `unknown` and cast only after the check that
 * earns the cast, which is the check `artifactOf` in
 * `deploy-external.ts` makes of the artifact built from this same
 * file: a non-null object that is not an array. An array passes a
 * bare object test and then answers `undefined` for every member, so
 * without it a source that is not a workflow at all would be refused
 * as one carrying no display name, and the reader sent to add a name
 * to a file that needs rewriting.
 *
 * A name that is not a string is refused and a blank one is not,
 * which is the line `artifactOf` draws over the artifact and the same
 * one for the same reason: a workflow with no name is one no deploy
 * could upsert on, while a blank name is a value only the instance
 * can settle, and a second opinion here would disagree with it the
 * first time either moved.
 *
 * Every refusal here is a plain `Error` rather than a class, on the
 * split `tests/invariants/schema-sql.ts` draws and
 * `assertDistinctNames` in `deploy-external.ts` already takes in this
 * directory: a class is what lets a case PIN a cause, and no case in
 * this plan drives a workflow source into any of these states. What
 * each message owes instead is the edit that fixes it, which for all
 * of them is to a file under `workflows/src/` and never to anything
 * this command holds.
 *
 * @param dir - The directory the workflow sources are read out of.
 * @param file - The source file name inside it.
 * @returns The display name that source declares.
 * @throws Error When the source is not a workflow object, declares no
 *   display name, or declares one this command cannot resolve.
 */
function sourceNameOf(dir: string, file: string): string {
  const path = join(dir, file);
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(
      `${path} is not a workflow object, so it declares no display ` +
      'name for an audit to expect. One JSON object per file is the ' +
      'rule the build, the deploy and this command all read this ' +
      'directory by, and workflows/src/README.md states it. Make ' +
      'that file one, or move it out of this directory.',
    );
  }

  const { name } = parsed as { readonly name?: unknown };

  if (typeof name !== 'string') {
    throw new Error(
      `${path} carries no display name, so an audit has no handle ` +
      'to look for and whatever the instance holds for this source ' +
      'would sort as a stray. Give the workflow a name in ' +
      `workflows/src/${file}.`,
    );
  }

  if (BUILD_MARKER.test(name)) {
    throw new Error(
      `${path} declares a display name carrying build-marker text, ` +
      `so what an instance holds is not ${name}: a marker is resolved ` +
      'when the workflow is built, and which value it resolved to ' +
      'depends on the settings chain that build ran under, which an ' +
      'audit has no way to pick. Write the name out in ' +
      `workflows/src/${file} so this command can ask about it.`,
    );
  }

  return name;
}

/**
 * Read the display name out of every workflow source.
 *
 * The list {@link classify} holds an instance against, and the whole
 * of what this repository declares: one name per `*.json` file
 * directly under `sourceDir`.
 *
 * The walk is `buildAll`'s in `build-workflows.ts`, deliberately and
 * with nothing holding the two together. Top level only, `*.json`
 * only, files only — so a directory sitting beside a source is passed
 * over rather than descended into, and the `README.md` carrying the
 * workflow roster sits with the sources it describes without being
 * read as one of them. A walk that drifted from the build's would
 * leave this command expecting a different set of files from the one
 * a deploy uploads, and the report would name that difference as
 * strays and missing workflows on an instance that was never wrong.
 *
 * Sorted for the same reason the build sorts: `readdirSync` answers
 * in directory order, stable on one machine and arbitrary across
 * them, and {@link Classification.missing} follows the order it was
 * given in. Unsorted, two machines holding one tree would print the
 * same verdict in two orders.
 *
 * Read off the sources and never off `workflows/dist/`, which is
 * {@link classify}'s argument against a deploy record met one step
 * earlier. A build sweeps nothing, so an artifact whose source has
 * since been renamed or deleted stays where it lies — and the
 * workflow the instance is holding under that old name is there for
 * the same rename, so an expectation read out of that directory would
 * account for precisely the stray this command exists to name. It
 * would also put the expectation behind a build, and there are two of
 * those writing two directories, where the tree they are both built
 * from is one.
 *
 * A `sourceDir` that cannot be listed is raised rather than answered
 * for: an absent one is `ENOENT` and one naming a file is `ENOTDIR`,
 * and each names the path it was handed. That is what parts a
 * mistyped directory from an empty one, and it matters more here than
 * to the build this walk comes from — a build given nothing does
 * nothing, where an audit given nothing reports every workflow an
 * instance holds as unaccounted for, which is a loud wrong answer
 * rather than a quiet one. The one path that names nothing back is
 * the empty string, `ENOENT` about no directory at all, which is also
 * the one a caller is likeliest to have assembled rather than typed.
 *
 * A `sourceDir` that IS there and holds no `*.json` comes back empty.
 * That agrees with `buildAll`, and with what `DeployBuild` in
 * `deploy-external.ts` says of the same tree: an empty
 * `workflows/src/` is an ordinary state, and a command refusing it
 * would be disagreeing with the build about what a tree may hold. The
 * limit rides with it — over an empty expectation every workflow an
 * instance holds sorts as a stray, so the flags arriving with this
 * command's command line have that verdict to refuse to act on rather
 * than to read as a licence.
 *
 * Nothing is deduplicated and nothing is refused for being declared
 * twice. {@link classify} reads this list as a set, so a name two
 * sources declare is one name to it, and what a shared display name
 * costs is a deploy's to refuse: `assertDistinctNames` in
 * `deploy-external.ts` refuses it there, where the second workflow
 * would land.
 *
 * @param options - Where the workflow sources are read from.
 * @returns Every display name they declare, sorted by the file each
 *   was read from.
 * @throws Error When the sources cannot be listed, or one of them
 *   declares no display name this command can use.
 */
export function expectedNames(
  options: ExpectedNamesOptions,
): readonly string[] {
  const { sourceDir } = options;

  return readdirSync(sourceDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right))
    .map((file) => sourceNameOf(sourceDir, file));
}

/**
 * The argument that asks an audit to disarm the strays it found
 * armed.
 *
 * The cheaper of the two acts, and the reversible one: a workflow
 * disarmed this way is still on the instance under the same id, and
 * `activateWorkflow` in `n8n-client.ts` puts it back. What it stops
 * is the spending — a schedule that was firing, a webhook that was
 * answering — which is the reading {@link Classification.activeStray}
 * exists to hand an operator first.
 */
export const DEACTIVATE_FLAG = '--deactivate';

/**
 * The argument that asks an audit to delete the strays it found.
 *
 * The act that cannot be undone from here, and the one whose cost is
 * larger than its name. `deleteWorkflow` in `n8n-client.ts` carries
 * the whole of it, read out of the handler and the service n8n ships:
 * the public API's delete is the hard one rather than the archive an
 * instance's own interface does first, so there is no archived copy
 * afterwards, and the binary data of every execution that workflow
 * ever had goes with the row.
 *
 * It subsumes {@link DEACTIVATE_FLAG} rather than sitting beside it.
 * A delete disarms what it deletes before the row goes, so a command
 * line carrying both is a prune and the deactivate has nothing left
 * to do — and a prune reaches every stray where a deactivate reaches
 * only the armed ones, so there is no stray the narrower flag would
 * have touched and this one leaves alone.
 */
export const PRUNE_FLAG = '--prune';

/**
 * The argument that says an acting flag was meant.
 *
 * Named rather than a prompt, because this command has no terminal to
 * ask at: it is run from a shell, from a `bun run` script and one day
 * from whatever schedules it, and a prompt would either block a run
 * nobody is watching or be answered by whatever was on standard
 * input. A second flag is the same question asked in the one place
 * every one of those can answer it, and it leaves the answer in the
 * shell history beside the act it authorised.
 *
 * `--yes` rather than a spelling of its own, on the reasoning that a
 * confirmation an operator has to look up is one they will look up
 * once and then paste forever. What makes this one worth typing is
 * not that it is hard to type but that it is absent by default.
 */
export const CONFIRM_FLAG = '--yes';

/**
 * What a command line asked this audit to do past reporting.
 *
 * Three booleans and no ordering, because the flags are independent
 * of each other on the way in and only {@link runAuditCli} resolves
 * what a combination of them means. Reading them apart from acting on
 * them is what lets the refusal for an unconfirmed act be a decision
 * about a value rather than a step somewhere inside a run.
 */
export interface AuditActions {
  /** Whether {@link CONFIRM_FLAG} was given. */
  readonly confirmed: boolean;

  /** Whether {@link DEACTIVATE_FLAG} was given. */
  readonly deactivate: boolean;

  /** Whether {@link PRUNE_FLAG} was given. */
  readonly prune: boolean;
}

/**
 * Read the three flags off a command line.
 *
 * Membership and not order: a flag is present or it is not, none of
 * them takes a value, and an argument this command does not know is
 * ignored rather than refused. That last one is the same reading
 * `runBuildCli` in `build-workflows.ts` gives its own argv, and it is
 * worth being plain about, because it is the reading under which a
 * misspelled `--prune` runs a read-only audit: an unrecognised
 * argument asks for nothing, so the failure of a typo here is a
 * command that reports and does not act, which is the direction this
 * command is meant to fail in.
 *
 * @param argv - The arguments after the script name.
 * @returns Which of the three were given.
 */
export function auditActions(argv: readonly string[]): AuditActions {
  return {
    confirmed: argv.includes(CONFIRM_FLAG),
    deactivate: argv.includes(DEACTIVATE_FLAG),
    prune: argv.includes(PRUNE_FLAG),
  };
}

/**
 * Thrown when an audit was asked to act and was not told twice.
 *
 * A distinct class rather than a bare `Error`, so a case covering the
 * refusal can pin it: {@link ExpectedWorkflowError} below is the
 * other class this module raises, {@link UnconfiguredInstanceError}
 * in `deploy-external.ts` is a setting nobody supplied and
 * {@link UnsuccessfulReplyError} in `n8n-client.ts` is a call the
 * instance refused, and a source that is not a workflow, one
 * declaring no usable display name and a stray carrying no id are
 * plain `Error`s. An assertion taking any `Error` would pass for the
 * last three. It carries the flags that asked, because the message is
 * about them and because a caller holding the refusal can say which
 * act was refused without parsing a sentence.
 *
 * Nothing is spent before it fires. It is the first thing
 * {@link runAuditCli} does, ahead of the configuration refusal, ahead
 * of reading a single source and ahead of the listing — so a command
 * line that asked for a prune and forgot the confirmation reaches no
 * instance at all rather than reaching one and stopping partway.
 */
export class UnconfirmedActionError extends Error {
  /** The acting flags the command line carried. */
  readonly asked: readonly string[];

  /**
   * @param asked - The acting flags that were given.
   */
  constructor(asked: readonly string[]) {
    const named = asked.join(' and ');
    const verb = asked.length === 1
      ? 'asks'
      : 'ask';

    super(
      `${named} ${verb} this audit to change what it is auditing, ` +
      'and this command line does not say so twice. Nothing was read ' +
      `and no instance was reached. Add ${CONFIRM_FLAG} to the same ` +
      'command line if that is what was meant, or drop the acting ' +
      'flags to get the inventory on its own, which is what this ' +
      'command does with no flags at all.',
    );
    this.name = this.constructor.name;
    this.asked = asked;
  }
}

/**
 * Refuse an audit that was asked to act and not confirmed.
 *
 * Both acting flags are named where both were given, so an operator
 * adding the confirmation is answering for the whole command line
 * rather than for the flag this happened to check first.
 *
 * @param actions - What the command line asked for.
 * @throws UnconfirmedActionError When an acting flag was given and
 *   {@link CONFIRM_FLAG} was not.
 */
export function assertConfirmed(actions: AuditActions): void {
  const asked: string[] = [];

  if (actions.deactivate) {
    asked.push(DEACTIVATE_FLAG);
  }

  if (actions.prune) {
    asked.push(PRUNE_FLAG);
  }

  if (asked.length > 0 && !actions.confirmed) {
    throw new UnconfirmedActionError(asked);
  }
}

/**
 * Thrown when an act would reach a workflow the sources account for.
 *
 * This refusal is deliberately stricter than the property it stands
 * for, and the gap is the point. {@link classify} partitions what an
 * instance holds, so a workflow drawn from
 * {@link Classification.stray} is one no expected name matched and
 * this can no more fire over that list than a partition can overlap
 * itself. What it stands between is a later edit and a deleted
 * workflow: the acting walk reads a list somebody chose, and the day
 * that list is chosen differently — a wider one, a caller's own, a
 * classification handed in — this is the check that says so instead
 * of the instance losing something the next deploy would have to put
 * back.
 *
 * So it is asked once per workflow, immediately before the call, and
 * not once over the list. A guard in front of a loop answers about
 * the list the loop was given; a guard inside it answers about the
 * workflow the next call is about.
 *
 * That it cannot fire today is a claim about {@link classify} and
 * not about this, and the two were measured apart rather than
 * reasoned about. Relaxing the partition so a matched workflow is
 * sorted into {@link Classification.stray} as well as
 * {@link Classification.known}, and running a prune over an instance
 * holding one: this refuses and the recorded calls are the listing
 * and nothing else. Relaxing the partition AND taking the call to
 * this out of the acting walk: the same run returns, and the
 * recorded calls are the listing and a DELETE of a workflow
 * `workflows/src/` declares. So what stands behind it is one line in
 * another function, and what it costs to be wrong is the workflow
 * this repository exists to deploy.
 */
export class ExpectedWorkflowError extends Error {
  /** The act that was about to be performed. */
  readonly act: string;

  /** The display name the sources also declare. */
  readonly workflowName: string;

  /**
   * @param act - The act that was about to reach it.
   * @param workflowName - The display name it shares with a source.
   */
  constructor(act: string, workflowName: string) {
    super(
      `this audit was about to ${act} a workflow named ` +
      `${workflowName}, which is a name workflows/src/ declares, so ` +
      'it is one this repository accounts for rather than a stray. ' +
      'Nothing was changed. This is a fault in the command and not ' +
      'in the instance or the sources: report it rather than working ' +
      'around it, because the acting flags reached a workflow they ' +
      'are not allowed to reach.',
    );
    this.name = this.constructor.name;
    this.act = act;
    this.workflowName = workflowName;
  }
}

/**
 * Refuse an act about to reach a workflow the sources declare.
 *
 * A workflow carrying no display name cannot be one of those — it
 * matches no expected name, which is the whole of why
 * {@link classify} sorts it as a stray — so it passes here rather
 * than being refused for having nothing to compare.
 *
 * @param act - The act about to be performed, named in the refusal.
 * @param workflow - The workflow it would reach.
 * @param expected - Every display name this repository declares.
 * @throws ExpectedWorkflowError When the instance holds it under a
 *   name the sources declare.
 */
export function assertNotExpected(
  act: string,
  workflow: RemoteWorkflow,
  expected: ReadonlySet<string>,
): void {
  const { name } = workflow;

  if (typeof name === 'string' && expected.has(name)) {
    throw new ExpectedWorkflowError(act, name);
  }
}

/** How a workflow with no display name is printed. */
const NO_NAME = '<no display name>';

/** How a workflow with no id is printed. */
const NO_ID = '<no id>';

/**
 * One workflow as a line of the report names it.
 *
 * Three readings on one line because an operator acting on a stray
 * wants all three: the name is what a rename would have been, `armed`
 * against `inert` is whether it is spending, and the id is what a
 * prune would address it by and what a canvas URL ends in.
 *
 * Every member is read defensively and none is refused. This is
 * report text, and a workflow the instance answered with in some
 * shape this command did not expect is exactly the workflow an
 * operator most needs named — so a missing name or id prints as the
 * absence it is rather than taking the report down.
 *
 * @param workflow - The workflow to name.
 * @returns Its name, whether it is armed, and its id.
 */
function workflowLabel(workflow: RemoteWorkflow): string {
  const { active, id, name } = workflow;
  const called = typeof name === 'string'
    ? name
    : NO_NAME;
  const state = active === true
    ? 'armed'
    : 'inert';
  const at = typeof id === 'string'
    ? id
    : NO_ID;

  return `${called} (${state}) id ${at}`;
}

/**
 * The instance's id for a workflow an act is about to reach.
 *
 * Refused rather than skipped where there is none. A stray with no id
 * is one this command can report and cannot address, and carrying on
 * past it would leave a run that reported every stray acted on while
 * one of them was never reached — which is the shape of failure the
 * acting flags exist to be an alternative to.
 *
 * A plain `Error` rather than a class, on the split
 * `tests/invariants/schema-sql.ts` draws and `remoteIdFor` in
 * `deploy-external.ts` already takes for the same reading of the same
 * member: a class is what lets a case PIN a cause, and no case in
 * this plan drives an instance into answering with a workflow that
 * carries no id.
 *
 * @param workflow - The workflow to address.
 * @returns The instance's id for it.
 * @throws Error When it carries no id that is a string.
 */
function strayIdOf(workflow: RemoteWorkflow): string {
  const { id } = workflow;

  if (typeof id !== 'string') {
    throw new Error(
      'the instance answered with a workflow this audit sorted as a ' +
      `stray — ${workflowLabel(workflow)} — that carries no id to ` +
      'address it by, so there is no path to act on it at. Check ' +
      'that the base URL names an n8n instance and not something in ' +
      'front of one. The inventory above is unaffected; nothing was ' +
      'changed.',
    );
  }

  return id;
}

/**
 * Everything an audit cannot find out for itself.
 *
 * The four seams, and the whole of what parts a run from a case: what
 * the command line asked for, where the sources are, what the two
 * settings answered, and what the calls go through. The settings
 * arrive unrefused and the fetch arrives beside them, which is the
 * pair `DeployOptions` in `deploy-external.ts` takes for the same
 * reason — `requireInstance` is what turns the two into something a
 * call can be made with, and holding the refused value here would put
 * the refusal outside the run that is supposed to report it.
 */
export interface AuditOptions {
  /** What the command line asked for beyond reporting. */
  readonly actions: AuditActions;

  /**
   * What the calls go through, taken as an argument so that a case
   * drives them against a stub and the isolated suite stays isolated
   * by construction.
   */
  readonly fetch: HttpFetch;

  /**
   * The two settings as configuration answered for them, either of
   * them possibly unset.
   */
  readonly settings: InstanceSettings;

  /** The directory the workflow sources are read out of. */
  readonly sourceDir: string;
}

/**
 * Print what an instance is holding, sorted.
 *
 * A line per finding and then two lines of summary, which is
 * `runDeployCli`'s shape in `deploy-external.ts`. The findings come
 * first because they are what an operator acts on and the counts are
 * what they quote afterwards.
 *
 * Nothing that is accounted for is printed. An instance holding
 * fifty workflows this repository declares has nothing to say about
 * any of them, and a report listing them is one nobody reads to the
 * end — the count line is where they are, and the verdict is the
 * whole of what a clean instance produces past it.
 *
 * The base URL is nowhere in it. It is the one thing about an
 * operator's own deployment this command holds, and
 * `UnsuccessfulReplyError` in `n8n-client.ts` keeps it out of a
 * refusal for that reason; a report is read wherever a refusal is.
 *
 * @param sorted - What the instance is holding, classified.
 * @param held - How many workflows the instance answered with.
 */
function reportClassification(
  sorted: Classification,
  held: number,
): void {
  for (const workflow of sorted.stray) {
    console.log(`stray ${workflowLabel(workflow)}`);
  }

  for (const { name, workflows } of sorted.duplicate) {
    console.log(
      `duplicate ${name}: ${String(workflows.length)} workflows answer ` +
      'to it',
    );
  }

  for (const name of sorted.missing) {
    console.log(`missing ${name}`);
  }

  console.log(
    `${String(held)} on the instance, ${String(sorted.known.length)} ` +
    `accounted for, ${String(sorted.stray.length)} stray ` +
    `(${String(sorted.activeStray.length)} of them armed), ` +
    `${String(sorted.duplicate.length)} duplicated, ` +
    `${String(sorted.missing.length)} expected and absent`,
  );

  console.log(
    sorted.clean
      ? 'clean: the instance holds nothing this repository does not '
        + 'account for'
      : 'not clean: the instance holds something this repository does '
        + 'not account for',
  );
}

/**
 * Do what the acting flags asked, to the strays and to nothing else.
 *
 * Which strays depends on the flag and the difference is not a
 * preference. {@link PRUNE_FLAG} reaches every stray, an inert one
 * being just as unaccounted for as an armed one and a delete having
 * something to do either way. {@link DEACTIVATE_FLAG} reaches only
 * the armed ones, and that is a report decision rather than a
 * correctness one: measured in the service n8n 2.15.1 ships,
 * deactivating a workflow that is already inactive returns it
 * unchanged rather than refusing, so the narrower list is what keeps
 * every line this prints a line about something that moved.
 *
 * A prune where both flags were given, for the reason
 * {@link PRUNE_FLAG} states: it disarms what it deletes and it
 * reaches a superset of the strays a deactivate would, so running
 * both would be running one of them twice over the same rows.
 *
 * The calls are made one at a time and in the order the instance
 * listed. A failure part way through stops the rest, and what has
 * already been printed is what has already happened — which is why
 * each line is printed AFTER its call returns rather than before it.
 *
 * @param instance - The instance to act against.
 * @param sorted - What it is holding, classified.
 * @param expected - Every display name this repository declares.
 * @param actions - What the command line asked for.
 * @returns How many workflows were acted on.
 * @throws ExpectedWorkflowError When a target is one the sources
 *   declare.
 * @throws UnsuccessfulReplyError When the instance refuses a call.
 * @throws Error When a target carries no id to address it by.
 */
async function actOnStrays(
  instance: N8nInstance,
  sorted: Classification,
  expected: ReadonlySet<string>,
  actions: AuditActions,
): Promise<number> {
  const act = actions.prune
    ? 'prune'
    : 'deactivate';
  const targets = actions.prune
    ? sorted.stray
    : sorted.activeStray;
  let acted = 0;

  for (const workflow of targets) {
    assertNotExpected(act, workflow, expected);

    const id = strayIdOf(workflow);

    if (actions.prune) {
      await deleteWorkflow(instance, id);
    } else {
      await deactivateWorkflow(instance, id);
    }

    acted += 1;
    console.log(`${act}d ${workflowLabel(workflow)}`);
  }

  return acted;
}

/**
 * One audit end to end: read the sources, list the instance, report
 * what it is holding, and act only where asked and confirmed.
 *
 * The order of the two refusals in front of it is the decision worth
 * recording. The confirmation is checked first, before configuration
 * is read at all, because it is the one of the two whose subject is
 * the destructive half and because it is about what the operator
 * typed rather than about the machine they typed it on. `deploy` in
 * `deploy-external.ts` settles the opposite order for the opposite
 * reason — its first refusal ANSWERS with the instance the rest of
 * its sequence is built on — and both are free, so neither has spent
 * anything by the time it fires. What this order costs is that an
 * operator with an unconfirmed flag AND no instance configured is
 * told about the flag and finds the configuration on the next run.
 *
 * The sources are read before the listing, which costs a round trip
 * on a tree that cannot be read and is worth it: a `workflows/src/`
 * this command cannot walk is a fault in the checkout, and reporting
 * it without having reached an instance is one fewer thing an
 * operator has to rule out.
 *
 * Reporting happens whether or not the flags asked for anything, and
 * it happens BEFORE any act. An operator reading the output back has
 * the inventory the acts were decided from sitting above them, in the
 * same run, rather than having to trust that the run they are reading
 * acted on what the run before it reported.
 *
 * The verdict is the instance held against one commit. What is
 * expected is read out of this checkout's `workflows/src/`, so an
 * audit run from an older one reports the workflows a newer one added
 * as strays — and with the acting flags that is not merely a wrong
 * report but a wrong act, which is the other half of what the
 * confirmation is asking about. {@link classify} argues the choice of
 * list in full.
 *
 * @param options - What was asked for, where the sources are, and
 *   what to reach and how. Defaults to what a command line answers
 *   for; a caller handing over its own is what makes this drivable
 *   with no command line and no instance.
 * @returns What the instance was holding, classified, as it stood
 *   before anything was acted on.
 * @throws UnconfirmedActionError When an acting flag was given and
 *   {@link CONFIRM_FLAG} was not.
 * @throws UnconfiguredInstanceError When either setting is unset.
 * @throws ExpectedWorkflowError When an act would reach a workflow
 *   the sources declare.
 * @throws UnsuccessfulReplyError When the instance refuses a call.
 * @throws Error When the sources cannot be read, or when a workflow
 *   an act would reach carries no id.
 */
export async function runAuditCli(
  options: AuditOptions = commandLineOptions(),
): Promise<Classification> {
  const { actions, fetch, settings, sourceDir } = options;

  assertConfirmed(actions);

  const instance = requireInstance(settings, fetch);
  const expected = expectedNames({ sourceDir });
  const remote = await listWorkflows(instance);
  const sorted = classify(remote, expected);

  reportClassification(sorted, remote.length);

  if (actions.deactivate || actions.prune) {
    const acted = await actOnStrays(
      instance,
      sorted,
      new Set(expected),
      actions,
    );

    console.log(`${String(acted)} of them acted on`);
  }

  return sorted;
}

/**
 * Everything an audit cannot find out for itself, with a command
 * line's answers in it.
 *
 * The one function that fills all four seams in, which is what
 * `commandLineOptions` does in `deploy-external.ts` and
 * `runBuildCli`'s reason for gathering its own directories in one
 * place: the flags are the command line's, the sources are this
 * package's, the settings are configuration's, and the talking is the
 * global `fetch`.
 *
 * The source directory is imported from `build-workflows.ts` rather
 * than resolved here, so this command and the build that produced
 * whatever is on the instance are reading one tree by one name.
 * {@link ExpectedNamesOptions.sourceDir} is where that property is
 * argued.
 *
 * @returns The four, with their real values in them.
 */
function commandLineOptions(): AuditOptions {
  return {
    actions: auditActions(process.argv.slice(2)),
    fetch,
    settings: {
      apiKey: config.AR_N8N_API_KEY,
      baseUrl: config.AR_N8N_URL,
    },
    sourceDir: WORKFLOW_SOURCE_DIR,
  };
}

/**
 * Every refusal an audit raises on purpose and can name by class.
 *
 * A roster rather than a chain of `instanceof` tests, for the reason
 * `BUILD_REFUSALS` in `build-workflows.ts` gives: the set is what
 * matters, and this one spans three modules. Each is a report an
 * operator acts on — a flag that asked for more than the command line
 * confirmed, a setting nobody supplied, a call the instance would not
 * take, and the one that is a fault in this command rather than in
 * anything it was pointed at.
 *
 * What no roster reaches is the plain `Error`s a run raises over the
 * sources it read and the workflows it was answered with. Each of
 * those is as much a report as anything named here and none carries a
 * class to be named by, so a roster admitting them would have to
 * admit bare `Error` — which is every unexpected failure on the path
 * as well, the `ENOENT` from a source directory that is not there and
 * whatever an injected fetch throws when it cannot reach a host. So
 * they print with a stack over them, which buries the message rather
 * than losing it.
 */
const AUDIT_REFUSALS = [
  ExpectedWorkflowError,
  UnconfiguredInstanceError,
  UnconfirmedActionError,
  UnsuccessfulReplyError,
];

/**
 * Whether a caught value is one this command can report as a message.
 *
 * @param cause - What the run threw.
 * @returns Whether its message is the whole report.
 */
function isAuditRefusal(cause: unknown): cause is Error {
  return AUDIT_REFUSALS.some((refusal) => cause instanceof refusal);
}

/**
 * Whether this file is what the process was started with, rather than
 * something another module imported.
 *
 * `import.meta.url` is a `file:` URL where `process.argv[1]` is a
 * path, so comparing the two as they come is false however the
 * process was started, and the block below would silently never run.
 * `fileURLToPath` is what makes the comparison able to hold at all.
 * `build-workflows.ts`, `deploy-external.ts`, `seed.ts` and
 * `approve.ts` carry the same guard, and a copy per command is
 * deliberate: `import.meta.url` is lexical to the module it is
 * written in, so a guard moved into a shared helper would compare
 * that HELPER's path against `process.argv[1]` and answer false in
 * every process.
 *
 * Worth asking because this module is both a command and a library.
 * `bun scripts/audit-workflows.ts` reaches an instance; a test
 * importing {@link classify} or {@link expectedNames} gets the
 * exports and reaches nothing. What the guard is worth here is what
 * it is worth next door and then some: on a machine that has the two
 * settings, an unguarded import would list somebody's instance out of
 * a run that asked for none of it — and an unguarded import of a
 * process whose own argv happened to carry {@link PRUNE_FLAG} and
 * {@link CONFIRM_FLAG} would do a great deal more than list it.
 */
const INVOKED_AS_CLI = process.argv[1] !== undefined
  && fileURLToPath(import.meta.url) === process.argv[1];

if (INVOKED_AS_CLI) {
  try {
    await runAuditCli();
  } catch (cause) {
    // Each refusal on the roster is already a report — the flag, the
    // setting, the call an instance would not take, or the workflow
    // the acting flags were not allowed to reach — so a stack over it
    // buries the thing worth reading. Anything else is unexpected,
    // and there the stack is what a reader needs. Which reports fall
    // on the wrong side of that line is `AUDIT_REFUSALS`'s own
    // paragraph.
    process.exitCode = 1;
    console.error(
      isAuditRefusal(cause)
        ? cause.message
        : cause,
    );
  }
}
