/**
 * What a build makes of a LIBRARY. One workflow source whose node
 * body writes `__INLINE:schedule.ts__`, put through the command an
 * operator runs, over a tree carrying the package's own `src/lib/`.
 * Two things are read back off the artifact — the clamp's body is
 * in the node, and the module boundary it was declared behind is
 * not — and a third is RUN rather than read: the spliced copy,
 * constructed with `new Function` and handed the globals a Code
 * node is given, answers the rows of the shared case table exactly
 * as the copy this suite imports does.
 *
 * The rules underneath a splice are claimed elsewhere and against
 * arguments alone — `workflow-markers.test.ts` drives the refusal
 * and the strip over recorded transpiler output, and
 * `schedule.test.ts` drives the imported clamp over the same rows
 * in `tests/lib/schedule-cases.ts` that the `new Function` section
 * here drives the spliced one over. What is left to this file is
 * the one seam neither reaches: a real transpile of a real library,
 * inlined at a real marker, landing in a node body and running
 * there.
 *
 * A spawned command rather than a `buildAll` call, and the LAUNCHER
 * decides that rather than a preference between two shapes. The
 * splice reaches for `Bun.Transpiler`, which a vitest worker does
 * not have: measured in this package's own workers, `Bun` is an
 * object carrying `serve` and nothing else, `Bun.Transpiler` is
 * `undefined`, and `bunTranspiler()` refuses there by name. A case
 * already inside a worker cannot relaunch itself, so a subprocess is
 * the only shape left to it — and the sections next door that do
 * call `buildAll` hand it a loader answering for nothing, which is
 * the arrangement a worker permits rather than the one that writes
 * an artifact.
 *
 * Those sections are also why this file exists rather than a seventh
 * case among them. Their sources write settings markers and no
 * library marker, so the transpiler each of their runs builds goes
 * unused and no spliced body is among the bytes they compare. The
 * splice is the half of the build they leave untouched.
 *
 * The tree copies the package's own `src/lib/` rather than planting
 * a library of its own. That is the whole of what makes the claims
 * about `schedule.ts`: a fixture library written to be spliceable
 * would say only that the build can splice something, while the
 * question worth asking is whether the library this package ships
 * and this suite imports is one a Code node could run. Nothing else
 * asks it. `workflows/src/` holds no source writing this marker
 * until `ar-dispatch`'s Code node lands later in this stage, so
 * until then the package builds no library at all and a fixture tree
 * is the only place one is put through the shipped command.
 *
 * The two claims read off the artifact are one subject read from
 * both ends, and neither stands alone. A node body that came back
 * empty carries no export keyword either, so the strip claim rests
 * on the body claim beside it; and a body that arrived with its
 * keywords on is a body that reached the node, so the body claim
 * would hold for a build that had skipped the strip entirely. What
 * each rules out is the other one passing for the wrong reason.
 *
 * What the export detector cannot tell apart is a keyword from the
 * same word inside a string literal or a comment. Neither is
 * reachable here — the transpiler strips comments before the build
 * ever sees the output, and this library writes no such string — but
 * the guard is not left resting on that: it fires the detector at
 * the declaration the library actually writes, so the `false` a
 * claim reads off the artifact is a detector proven live rather than
 * one that matches nothing anywhere.
 *
 * Every claim reads the PARSED node parameter the site names rather
 * than the artifact as text. A body is a string inside a JSON
 * document, so a check over the file would be reading escaped source
 * through its escaping, and a workflow's own prose — a sticky note,
 * a node name — would answer for the node body it is not.
 *
 * The `new Function` section is what a node MAKES of that body.
 * Reading the artifact says the clamp is in the node; running it
 * says the build did not change what the clamp does on the way
 * there. That is the whole of what the comparison can say, and it
 * is worth being exact about: the two copies come from one file, so
 * they cannot disagree about the RULE. What sits between them is
 * the transpile and the strip, and a row they part on is a build
 * that rewrote the arithmetic rather than a library that drifted.
 * Whether the answers are the RIGHT ones is a different question,
 * and `tests/lib/schedule.test.ts` is where the table's recorded
 * column is what the imported copy is held against.
 *
 * That section carries two guards, one for each way agreement can
 * be had cheaply. Two copies that both returned their first
 * argument agree on every row of a table that clamps nothing, so
 * the first guard reads the imported copy and asks that these rows
 * include ones it raises, ones it lowers and ones it leaves alone.
 * A node handed a recorded answer could read one back rather than
 * call anything, so the second asks what the items carry: a
 * proposal, the bounds to judge it against, and nothing else.
 *
 * What the run comes nearest to without reaching is the third rule
 * a spliceable library obeys — that nothing may rely on module
 * scope, which `assertSpliceable` cannot see. Measured inside a
 * worker of this package, `new Function` supplies neither `require`
 * nor `module`, exactly as a Code node does not: an `import.meta`
 * is refused when the function is CONSTRUCTED, whether or not a row
 * ever reaches that line, while a `require` raises only when its
 * line is reached, so a row exercising that path is what would see
 * it. Module-level STATE is invisible in both contexts and stays
 * so — it lives as long as the worker that imported the library
 * here and as long as one execution there, and nothing reports the
 * difference.
 */
import type { IntervalBounds } from '../../src/lib/schedule.js';
import type { ClampCase } from '../lib/schedule-cases.js';

import { spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, describe, expect, it } from 'vitest';

import { clampIntervalSeconds } from '../../src/lib/schedule.js';
import { CLAMP_CASES } from '../lib/schedule-cases.js';

import { valueAtPath } from './marker-fixtures.js';

// ---------------------------------------------------------------------------
// The library under the marker, and the text its body is read for
// ---------------------------------------------------------------------------

/** The library the fixture source inlines, as a marker names it. */
const LIB_FILE = 'schedule.ts';

/** The marker naming it, in the form a workflow source writes. */
const LIB_MARKER = `__INLINE:${LIB_FILE}__`;

/** The exported function this file's claims are about. */
const CLAMP_NAME = 'clampIntervalSeconds';

/**
 * The clamp as the library declares it.
 *
 * Both halves of what this file is about are in this one string: the
 * name a spliced body must still carry, and the keyword a spliced
 * body must not. It is asserted against the library rather than
 * derived from it, and the export detector is fired at it, so the
 * detector is proven on the very text the strip has to remove.
 */
const CLAMP_DECLARATION = `export function ${CLAMP_NAME}(`;

/**
 * The clamp as a spliced copy declares it.
 *
 * Written to the opening parenthesis and no further. What sits
 * between it and the brace is the transpiler's business — parameter
 * types erase, and how the remains are laid out is not this file's
 * subject.
 */
const SPLICED_DECLARATION = `function ${CLAMP_NAME}(`;

/** One piece of the clamp's body, and what it stands for. */
interface ClampFragment {
  /** The part of the rule this text carries. */
  readonly standsFor: string;

  /** The text itself, as the library and a spliced copy write it. */
  readonly text: string;
}

/**
 * The pieces of the clamp a built artifact is read for.
 *
 * Expressions rather than whole lines, because a line is the
 * transpiler's to reflow and an expression is not: measured, the
 * ternaries the library writes over four lines come back on one,
 * with every one of these texts intact inside them. Each is unique
 * to this rule, so a body carrying all three is carrying the clamp
 * rather than something shaped like it.
 *
 * The roster is guarded from both ends. Every entry is asserted
 * against the library the tree copies, so no fragment is a text
 * this file invented; and the labels are held against
 * {@link CLAMP_PARTS}, so a roster emptied by an edit fails rather
 * than satisfying a claim that walks it.
 */
const CLAMP_FRAGMENTS: readonly ClampFragment[] = [
  {
    standsFor: 'the absent bound',
    text: 'bounds.minIntervalSeconds === null',
  },
  {
    standsFor: 'the floor',
    text: 'Math.max(intervalSeconds, bounds.minIntervalSeconds)',
  },
  {
    standsFor: 'the ceiling',
    text: 'Math.min(floored, bounds.maxIntervalSeconds)',
  },
];

/**
 * What {@link CLAMP_FRAGMENTS} is declared to cover.
 *
 * A second declaration rather than a count. Three entries all
 * standing for one part of the rule would satisfy a count while
 * leaving two thirds of the clamp unread, and an empty roster
 * satisfies both a count of its own length and every walk over it.
 */
const CLAMP_PARTS: readonly string[] = [
  'the absent bound',
  'the floor',
  'the ceiling',
];

/**
 * `export` where it is a keyword rather than part of a name.
 *
 * A non-global instance, so no `lastIndex` is carried from one call
 * into the next — the reason `tests/invariants/naming-patterns.ts`
 * gives for keeping its own patterns as sources rather than as
 * shared compiled ones. The classes are spelled out for the same
 * reason they are there: what is being ruled out is a hit inside a
 * longer identifier, which is the one false positive a bare
 * substring test would give.
 */
const EXPORT_KEYWORD = /(^|[^A-Za-z0-9_$])export([^A-Za-z0-9_$]|$)/u;

// ---------------------------------------------------------------------------
// The tree a build is spawned over
// ---------------------------------------------------------------------------

/** The name the source is written as, and the artifact after it. */
const SOURCE_FILE = 'ar-splice-fixture.json';

/**
 * Where the source buries its marker, and where the artifact carries
 * what replaced it.
 *
 * A node parameter rather than a top-level value, so the marker pass
 * has to descend to reach it and what comes back is a node body
 * rather than a document field.
 */
const BODY_SITE: readonly (string | number)[] = [
  'nodes',
  0,
  'parameters',
  'jsCode',
];

/**
 * The lines the fixture's node body writes under the marker: a Code
 * node's own work, over the library the marker put above it.
 *
 * Reads the items the node was handed, clamps each row's proposal
 * against the bounds that row carries, and emits the answer beside
 * the id it came in with. Written against `$input` and against the
 * fields {@link CLAIMED_ROW_FIELDS} names and nothing else — the
 * case table's recorded answer is not among them, so there is no
 * column here for a body to read back instead of computing.
 *
 * A `const` rather than lines inside the source builder, so
 * {@link runSplicedNode} and the claims it serves can name the same
 * text this is written as.
 */
const NODE_WORK = [
  'return $input.all().map((item) => ({',
  '  json: {',
  '    id: item.json.id,',
  `    answer: ${CLAMP_NAME}(item.json.intervalSeconds, item.json.bounds),`,
  '  },',
  '}));',
].join('\n');

/**
 * A source-shaped object whose one node body opens with a marker.
 *
 * Shaped like a workflow source without being one: the build reads
 * no node type and no connection, so what matters is that a string
 * sits where a node body sits. What follows the marker is
 * {@link NODE_WORK}, because that is what a Code node holding a
 * library actually looks like — the library is spliced in above the
 * lines that call it, and those lines are what
 * {@link runSplicedNode} drives.
 *
 * @param marker - The library marker to open the body with.
 * @returns A fresh object carrying it at {@link BODY_SITE}.
 */
function sourceInlining(marker: string): Record<string, unknown> {
  return {
    name: 'AR Splice Fixture',
    nodes: [
      {
        name: 'Bound the batch',
        parameters: { jsCode: `${marker}\n\n${NODE_WORK}\n` },
      },
    ],
  };
}

/**
 * The directory the fixture tree is written under, removed once this
 * file finishes.
 */
const FIXTURE_ROOT = mkdtempSync(join(tmpdir(), 'ar-schedule-splice-'));

afterAll(() => {
  rmSync(FIXTURE_ROOT, { recursive: true, force: true });
});

/**
 * The package's own `scripts/`, resolved from this file's location
 * rather than from the working directory.
 *
 * The suite is launched from the package and from the repo root
 * alike, and only one of those makes a relative path name this
 * directory.
 */
const PACKAGE_SCRIPTS_DIR = fileURLToPath(
  new URL('../../scripts', import.meta.url),
);

/** The package's own `src/lib/`, resolved the same way. */
const PACKAGE_LIB_DIR = fileURLToPath(new URL('../../src/lib', import.meta.url));

/** The library as this package ships it, read once. */
const LIBRARY_SOURCE = readFileSync(join(PACKAGE_LIB_DIR, LIB_FILE), 'utf8');

/** The file inside the copied `scripts/` a build is launched at. */
const ENTRY_FILE = 'build-workflows.ts';

/** What {@link spliceBuild} reports for a run that completed. */
const LAUNCH_OK = 'exit 0';

/** One tree a build was spawned over, and how that run went. */
interface SplicedBuild {
  /** The directory holding the tree's one workflow source. */
  readonly sourceDir: string;

  /** The directory the build wrote its artifact into. */
  readonly outDir: string;

  /** The directory the build resolved the library marker against. */
  readonly libDir: string;

  /**
   * `exit 0` for a run that completed, and otherwise the status
   * beside everything the run had to say.
   *
   * Carried as one string rather than as a status and a stream, so a
   * case failing over a build that never ran says why in its own
   * failure instead of leaving it in a subprocess nobody kept.
   */
  readonly launch: string;
}

/**
 * Plant a package tree around the shipped library, spawn the build
 * over it, and answer with where it wrote and how it went.
 *
 * The command takes no directories: it names `workflows/src/`,
 * `workflows/dist/` and `src/lib/` beside the entry point it was
 * launched from. So a build is pointed somewhere else by being given
 * a tree to name, and both halves of that tree are taken at run time
 * — a copy of `scripts/` and a copy of `src/lib/` — so what runs is
 * the build this package ships against the library it ships, rather
 * than a second copy of either to keep in step.
 *
 * Whole directories rather than the two files a marker and an entry
 * point name. `build-workflows.ts` imports a sibling and the library
 * may one day import a type from one of its own, and a copy
 * assembled file by file would go stale the first time either
 * happened, in a way whose only report is a build failing over a
 * tree nobody meant to be short.
 *
 * The run is the default build, which resolves `ENV_DEFAULTS` alone
 * and reads no environment: nothing a developer has exported can
 * move it, and the source carries no settings marker for one to move
 * anyway.
 *
 * @param name - The subdirectory of {@link FIXTURE_ROOT} to plant
 *   the tree under.
 * @returns Where that run read and wrote, and how it went.
 */
function spliceBuild(name: string): SplicedBuild {
  const root = join(FIXTURE_ROOT, name);
  const tree = {
    sourceDir: join(root, 'workflows', 'src'),
    outDir: join(root, 'workflows', 'dist'),
    libDir: join(root, 'src', 'lib'),
  };

  mkdirSync(tree.sourceDir, { recursive: true });
  cpSync(PACKAGE_SCRIPTS_DIR, join(root, 'scripts'), { recursive: true });
  cpSync(PACKAGE_LIB_DIR, tree.libDir, { recursive: true });
  writeFileSync(
    join(tree.sourceDir, SOURCE_FILE),
    `${JSON.stringify(sourceInlining(LIB_MARKER), null, 2)}\n`,
  );

  const run = spawnSync(
    'bun',
    [join(root, 'scripts', ENTRY_FILE)],
    { cwd: root, encoding: 'utf8' },
  );

  return {
    ...tree,
    launch: run.status === 0
      ? LAUNCH_OK
      : `exit ${String(run.status)}: ${run.error?.message ?? ''}${run.stderr}`,
  };
}

/** The one run every case in this file reads. */
const SPLICE_RUN = spliceBuild('spliced-library');

/**
 * The node body one run wrote, read back off the artifact on disk.
 *
 * Parsed and walked to {@link BODY_SITE}, so what a case asserts
 * over is the string a node would be handed rather than the JSON
 * escaping around it. A site holding anything but a string is
 * reported here rather than coerced: `String(undefined)` carries no
 * export keyword either, so a build that wrote no body at all would
 * satisfy the strip claim outright.
 *
 * Called from inside each case rather than resolved once beside the
 * run, so a build that never wrote fails on the case that reads it
 * and leaves the launch guard free to say why.
 *
 * @param run - The run whose artifact to read.
 * @returns The node body it wrote.
 */
function splicedBodyOf(run: SplicedBuild): string {
  const artifact: unknown = JSON.parse(
    readFileSync(join(run.outDir, SOURCE_FILE), 'utf8'),
  );
  const body: unknown = valueAtPath(artifact, BODY_SITE);

  if (typeof body !== 'string') {
    throw new Error(
      `The node body at [${BODY_SITE.join(', ')}] came back as `
      + `${typeof body} rather than a string. The artifact and the `
      + 'site naming it have drifted apart — fix whichever moved.',
    );
  }

  return body;
}

/**
 * The fragments a text does NOT carry, named by what they stand for.
 *
 * Answers with a list rather than throwing at the first miss, so a
 * failure names every part of the clamp that is absent instead of
 * the one that happened to be looked for first.
 *
 * @param text - The library, or a spliced copy of it.
 * @returns What each missing fragment stands for.
 */
function fragmentsMissingFrom(text: string): readonly string[] {
  return CLAMP_FRAGMENTS
    .filter((fragment) => !text.includes(fragment.text))
    .map((fragment) => fragment.standsFor);
}

describe('bun scripts/build-workflows.ts — a source inlining a library', () => {
  // The fixture guard the strip claim rests on, and the positive
  // control for the detector that claim reads a `false` off. The
  // library declares the clamp behind the keyword, and the detector
  // fires on that declaration — so an artifact the detector finds
  // nothing in is a keyword that was taken off rather than one that
  // was never written.
  //
  // Fired at the declaration rather than at the whole library, which
  // carries the word in its prose as well: a detector proven on a
  // comment would be proven on text no strip is about.
  it('is asked about a library declaring the clamp with the keyword', () => {
    expect(LIBRARY_SOURCE).toContain(CLAMP_DECLARATION);
    expect(EXPORT_KEYWORD.test(CLAMP_DECLARATION)).toBe(true);
  });

  // The second fixture guard, for the body claim: every fragment it
  // looks for is text the library really writes, and the roster
  // covers the three parts of the rule it is declared to cover.
  //
  // Both halves are needed and neither implies the other. Without
  // the first, a fragment misremembered into something the clamp
  // never says would fail the claim over a perfectly good artifact;
  // without the second, an emptied roster would satisfy the claim
  // and this guard alike, since a walk over nothing finds nothing
  // missing.
  it('looks for body text the library it inlines really carries', () => {
    expect(fragmentsMissingFrom(LIBRARY_SOURCE)).toEqual([]);
    expect(CLAMP_FRAGMENTS.map((fragment) => fragment.standsFor))
      .toEqual([...CLAMP_PARTS]);
  });

  // The launch guard, and the case that has to come first: a command
  // that never ran leaves no output directory, so every read past
  // it would fail naming a path rather than the run that never wrote
  // one. Read as a string carrying what the run printed, since a
  // failure here is a subprocess that will not be there to ask
  // afterwards.
  it('runs to completion over the tree it was pointed at', () => {
    expect(SPLICE_RUN.launch).toBe(LAUNCH_OK);
  });

  // The third fixture guard, and the one that says which library the
  // claims are about. The tree is built from a copy, and a copy is
  // where a claim about a shipped file quietly stops being one — so
  // what the build resolved the marker against is held against what
  // this package ships, byte for byte.
  it('resolves the marker against the library this package ships', () => {
    expect(readFileSync(join(SPLICE_RUN.libDir, LIB_FILE), 'utf8'))
      .toBe(LIBRARY_SOURCE);
  });

  // The first claim: the clamp is in the node. The declaration says
  // the function is there under its own name, and the fragments say
  // its body came with it — a splice that had inlined a signature
  // and dropped what it does would satisfy the first alone.
  //
  // It is also what the strip claim stands on. An empty body
  // carries no export keyword, and so does a body a build never
  // wrote.
  it('writes the clamp function body into the node that inlined it', () => {
    const body = splicedBodyOf(SPLICE_RUN);

    expect(body).toContain(SPLICED_DECLARATION);
    expect(fragmentsMissingFrom(body)).toEqual([]);
  });

  // The second claim: nothing in that body is an export keyword. A
  // Code node is not a module — nothing resolves a specifier for it
  // and nothing consumes what it declares — so a body reaching one
  // still wearing the keyword its library was authored with fails on
  // first execution, which is the failure the strip moves to build
  // time.
  //
  // Over the node body rather than the artifact, so a workflow's own
  // prose cannot answer for it in either direction.
  it('carries no export keyword into that body', () => {
    expect(EXPORT_KEYWORD.test(splicedBodyOf(SPLICE_RUN))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// What a node makes of the body it was handed
// ---------------------------------------------------------------------------

/**
 * The fields of a claimed row the fixture's node body is given, and
 * the whole of them.
 *
 * The case table's recorded answer is deliberately outside this
 * roster. A body reading a recorded column rather than calling the
 * spliced clamp would agree with the imported copy word for word,
 * and keeping the column out of the node's reach rules that out by
 * construction instead of by a check somebody has to remember.
 */
const CLAIMED_ROW_FIELDS = ['bounds', 'id', 'intervalSeconds'] as const;

/** The column a node handed one of these rows must never see. */
const RECORDED_ANSWER_FIELD = 'expected';

/** One item the harness hands over, wrapped as an executor does. */
interface ClaimedRowItem {
  readonly json: {
    readonly bounds: IntervalBounds;
    readonly id: string;
    readonly intervalSeconds: number;
  };
}

/** One item {@link NODE_WORK} emits: a row id and its answer. */
interface AnsweredItem {
  readonly json: {
    readonly answer: unknown;
    readonly id: string;
  };
}

/** Sorted copy, so an equality is over members rather than order. */
function sorted(names: readonly string[]): readonly string[] {
  return [...names].sort();
}

/**
 * The rows a case drives, wrapped the way an executor hands items to
 * a node.
 *
 * Projected down to {@link CLAIMED_ROW_FIELDS} rather than passed
 * whole. `bounds` arrives as the object {@link clampIntervalSeconds}
 * takes rather than as the two columns a claimed row carries
 * separately, which is the one place these items are shaped for the
 * function instead of for the row — the projection the dispatcher
 * does is its own business and no part of what this file claims.
 *
 * @param rows - The case-table rows to hand over.
 * @returns One item per row, in the order given.
 */
function claimedRowItems(rows: readonly ClampCase[]): readonly ClaimedRowItem[] {
  return rows.map((testCase) => ({
    json: {
      bounds: testCase.bounds,
      id: testCase.id,
      intervalSeconds: testCase.intervalSeconds,
    },
  }));
}

/**
 * Run a node body the way an executor would: the globals a Code node
 * is given, the items it was handed, and whatever it returned.
 *
 * `new Function` rather than an import, because the subject is a
 * string inside an artifact rather than a module — which is also the
 * context it is judged in. Nothing is passed in for `require` or
 * `module`, for the reason a Code node supplies neither: measured
 * inside a worker of this package, a body reaching for either finds
 * nothing on the scope around it, so a library that had come to rely
 * on module scope fails here rather than on an instance.
 *
 * `$input` is stubbed with the rows the caller is driving. `$` is
 * stubbed to REFUSE: this body reads no other node, so a call
 * reaching it is a body that grew a dependency nobody meant it to
 * have, and a stub answering with an empty list would let that pass
 * as a node with nothing to say.
 *
 * The shape is written up in
 * `~/.claude/skills/n8n-code-node-offline-verify/SKILL.md`, a
 * user-level skill rather than one vendored under `.claude/` here,
 * which is why the argument is carried above rather than left to
 * the link. What is taken from it is the core of the technique: the
 * body comes off a BUILT artifact rather than out of a source, so
 * what runs is what the splice produced rather than what a library
 * said before one.
 *
 * What is deliberately left is the transform. That harness rewrites
 * the body before running it, blanking the `typeof require` and
 * `typeof module` guards a library written for two contexts
 * carries, and its own warning is that a harness rewriting source
 * is itself code that can be wrong, whose bugs are then reported
 * against the library it was pointed at. No library here writes
 * such a guard: the build takes the export keyword off a
 * declaration and leaves the rest alone, so there is nothing to
 * neutralize and the body runs exactly as the artifact carries it.
 * `Buffer` is left unpassed for a smaller reason — measured inside
 * a worker of this package, a `new Function` body reports it as a
 * function without being handed one, and this body reaches for
 * none of it anyway.
 *
 * The `$` stub is where the two shapes disagree outright. That one
 * stages the nodes a body names, so that a node left unstaged
 * answers the way an un-run one does; this one refuses the call
 * instead, because the body it is given names none and a body that
 * had grown one is the thing worth hearing about.
 *
 * @param body - A node body, as an artifact carries it.
 * @param items - The items to hand the node.
 * @returns Whatever the body returned, unread.
 */
function runSplicedNode(body: string, items: readonly ClaimedRowItem[]): unknown {
  const input = { all: (): readonly ClaimedRowItem[] => items };
  const other = (node: string): never => {
    throw new Error(
      `The node body read the output of ${node}, which this harness `
      + 'does not stage. The body it is given reads its own input and '
      + 'nothing else — either that body grew a dependency, or the '
      + 'wrong one was read off the artifact.',
    );
  };

  return new Function('$input', '$', body)(input, other);
}

/**
 * The answers a run's emitted items carry, keyed by the row id each
 * came in with.
 *
 * A map rather than a list, so a comparison is one expression over
 * two whole maps: it fails on a missing row as well as on a wrong
 * number, and prints the pair. What it cannot do is fail for holding
 * no rows at all, which is what the guards this serves are for.
 *
 * A body that returned something other than a list is refused here
 * by name. Left to fall through, it would fail as a property access
 * on whatever it was, naming neither the node nor the run.
 *
 * @param emitted - Whatever {@link runSplicedNode} returned.
 * @returns One answer per emitted item, keyed by id.
 */
function answersById(emitted: unknown): Record<string, unknown> {
  if (!Array.isArray(emitted)) {
    throw new Error(
      `The node body returned ${typeof emitted} rather than a list of `
      + 'items. A Code node emits items — either the body read off the '
      + 'artifact was not the one this file writes, or the splice put '
      + 'something ahead of it.',
    );
  }

  const items = emitted as readonly AnsweredItem[];

  return Object.fromEntries(items.map((item) => [item.json.id, item.json.answer]));
}

/**
 * What the imported copy answers, keyed the same way.
 *
 * This is the whole of the side the spliced copy is held against,
 * and the rows' own recorded column is no part of it. Reading that
 * column here would be this file claiming the answers are RIGHT,
 * which is `tests/lib/schedule.test.ts`'s claim over those same
 * rows. What is claimed here is only that the two copies agree.
 *
 * That split is why `tests/lib/schedule-cases.ts` is a shared module
 * rather than a table written into each file. The two claims are
 * halves of one thing — the spliced copy answers as the imported one
 * does, and the imported one answers what its row says it owes — and
 * they compose only while both are over the same rows. A copy of the
 * table here would let them drift apart with nothing to report it: a
 * row added over there to exercise a relation would never be
 * spliced, and a row added here would be agreed upon with nothing
 * saying the agreed answer was the right one. One module makes every
 * row reach both, and ids rather than positions are what tie a row
 * to the same row on the other side.
 *
 * What sharing the rows does not do is make the two claims one. Each
 * is asserted in its own file and reddens alone, and which of the
 * two does is what parts a rule answering wrongly from a build that
 * rewrote it on the way into the node.
 *
 * @param rows - The rows to drive it over.
 * @returns One answer per row, keyed by id.
 */
function importedAnswers(rows: readonly ClampCase[]): Record<string, number> {
  return Object.fromEntries(rows.map((testCase) => [
    testCase.id,
    clampIntervalSeconds(testCase.intervalSeconds, testCase.bounds),
  ]));
}

/** What a clamp can do to a proposal, and the whole of it. */
const CLAMP_OUTCOMES = ['left alone', 'lowered', 'raised'] as const;

/**
 * Which of {@link CLAMP_OUTCOMES} the imported copy does to a row.
 *
 * Read off the imported function rather than off the table's
 * recorded column, because the imported copy is what the claim
 * compares against: what makes that comparison worth making is that
 * this side moves some of these rows, and a reading of a column
 * neither side of the claim consults would not say so.
 *
 * Total over every row, so a row the clamp leaves alone names its
 * own shape rather than being absorbed into one of the other two.
 *
 * @param testCase - The row to judge.
 * @returns What the imported copy does to its proposal.
 */
function clampOutcome(testCase: ClampCase): string {
  const answer = clampIntervalSeconds(testCase.intervalSeconds, testCase.bounds);

  if (answer > testCase.intervalSeconds) {
    return 'raised';
  }

  return answer < testCase.intervalSeconds
    ? 'lowered'
    : 'left alone';
}

describe('new Function — the spliced clamp a Code node would run', () => {
  // The guard the comparison in this section rests on, and the one
  // it cannot do without: two copies that both returned their first
  // argument agree on every row of a table that clamps nothing, so
  // agreement is a claim only where the copy agreed with does
  // something.
  //
  // Set equality against a declared roster rather than a count. The
  // table carries more rows than there are outcomes, so the covered
  // list is deduped first — three rows all sitting in one outcome
  // would satisfy a count while leaving two thirds of the rule
  // unexercised.
  it('is compared against a copy that raises rows, lowers rows and leaves rows', () => {
    const covered = [...new Set(CLAMP_CASES.map(clampOutcome))];

    expect(sorted(covered)).toEqual(sorted([...CLAMP_OUTCOMES]));
  });

  // The second guard, and what says the node COMPUTED rather than
  // read something back. The items it is handed carry a proposal and
  // the bounds to judge it against, and no recorded answer — so a
  // body that had reached for one would find nothing there.
  //
  // Both halves are asserted and neither implies the other: the
  // first fails for an item shaped some other way, the second for a
  // roster widened to admit the recorded column. It also cannot pass
  // over no items, since an empty table leaves the field list empty
  // and the roster is not.
  it('hands the node a claimed row and never its recorded answer', () => {
    const fields = [...new Set(
      claimedRowItems(CLAMP_CASES).flatMap((item) => Object.keys(item.json)),
    )];

    expect(sorted(fields)).toEqual(sorted([...CLAIMED_ROW_FIELDS]));
    expect(fields).not.toContain(RECORDED_ANSWER_FIELD);
  });

  // The claim. The body is the one the build wrote, constructed with
  // `new Function` and driven over the same rows the imported copy
  // is driven over in `tests/lib/schedule.test.ts`, and every answer
  // is held against what that copy returns for the same row.
  //
  // Compared as two whole maps in one expression, so a row the node
  // never answered for fails on the key rather than going unread.
  //
  // What a disagreement would mean is narrow and worth being exact
  // about: the two copies come from one file, so they cannot differ
  // about the RULE. What sits between them is the transpile and the
  // strip, and a row they part on is a build that rewrote the
  // arithmetic on the way into the node.
  it('answers every row exactly as the imported copy does', () => {
    const emitted = runSplicedNode(
      splicedBodyOf(SPLICE_RUN),
      claimedRowItems(CLAMP_CASES),
    );

    expect(answersById(emitted)).toEqual(importedAnswers(CLAMP_CASES));
  });
});
