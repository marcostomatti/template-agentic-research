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
 * not one anybody runs for a look. The flags that do change something
 * arrive with the command line later in this stage, and so does the
 * listing they would act on.
 *
 * What has landed is the sorting, and the half of the input this
 * repository answers for on its own. {@link classify} takes two lists
 * and answers with five readings and a verdict over them, opening no
 * socket, reading no file and knowing nothing about where either list
 * came from — so the question this command exists to settle can be
 * driven from a case holding two literals, with nothing stubbed and
 * no instance in front of it. {@link expectedNames} reads the
 * workflow sources for one of those two lists. The listing it is
 * sorted against arrives with the command line.
 */

import type { RemoteWorkflow } from './n8n-client.js';

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

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
