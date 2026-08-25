/**
 * What a build makes of a LIBRARY. One workflow source whose node
 * body writes `__INLINE:schedule.ts__`, put through the command an
 * operator runs, over a tree carrying the package's own `src/lib/`.
 * Two things are read back off the artifact: the clamp's body is in
 * the node, and the module boundary it was declared behind is not.
 *
 * The rules underneath a splice are claimed elsewhere and against
 * arguments alone — `workflow-markers.test.ts` drives the refusal
 * and the strip over recorded transpiler output, and
 * `schedule.test.ts` drives the clamp over a case table. What is
 * left to this file is the one seam neither reaches: a real
 * transpile of a real library, inlined at a real marker, landing in
 * a node body.
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
 * until `ar-dispatch` lands later in this phase, so until then the
 * package builds no library at all and a fixture tree is the only
 * place one is put through the shipped command.
 *
 * The two claims are one subject read from both ends, and neither
 * stands alone. A node body that came back empty carries no export
 * keyword either, so the strip claim rests on the body claim beside
 * it; and a body that arrived with its keywords on is a body that
 * reached the node, so the body claim would hold for a build that
 * had skipped the strip entirely. What each rules out is the other
 * one passing for the wrong reason.
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
 * What a node makes of that body, driving the spliced copy through
 * `new Function` against the same case table the imported copy is
 * driven over, arrives later in this stage.
 */
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
 * A source-shaped object whose one node body opens with a marker.
 *
 * Shaped like a workflow source without being one: the build reads
 * no node type and no connection, so what matters is that a string
 * sits where a node body sits. What follows the marker is a
 * `return`, because that is what a Code node holding a library
 * actually looks like — the library is spliced in above the lines
 * that call it.
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
        parameters: { jsCode: `${marker}\n\nreturn [];\n` },
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
