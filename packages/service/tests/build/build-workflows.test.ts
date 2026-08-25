/**
 * What a build makes of a source TREE: the tree it refuses over a
 * marker nothing reads, the near miss of that tree it builds, and
 * the tree that is not there at all.
 *
 * The rules underneath a build are claimed next door, in
 * `workflow-markers.test.ts`, against arguments alone — a chain of
 * sources, a recorded transpile, a parsed template. What is left to
 * this file is the half no argument reaches: the listing, the
 * per-file read, the mkdir and the write. `buildAll` takes both
 * directories as parameters so that a case can move the tree, and
 * moving it is the whole of how these cases run.
 *
 * A temporary tree rather than the package's own. Pointed at
 * `workflows/src/` a case would rebuild `workflows/dist/` underneath
 * every check that reads it, and with a stand-in loader it would
 * rebuild it into something no build produces.
 *
 * The first subject is one marker form and what a build does with
 * it. A marker whose name the grammar cannot read is a hit for
 * nothing: no rule replaces it, no rule refuses it, and it reaches
 * the serialized artifact as the characters the source wrote. What
 * refuses it there is the survival check over that output, which
 * names the form and leaves no file behind.
 *
 * Nothing stands behind that check, which is what parts that
 * section from the refusal cases next door. Those pin a class
 * because a build carrying a retired form fails either way, and
 * only the class says which of two rules caught it. Here the class
 * is pinned because a build fails other ways that arrive as an
 * `Error` — a source that is not JSON, a directory that cannot be
 * listed — and because of one failure that is nearly this one. A
 * WELL-FORMED marker naming a setting no source answers for is
 * refused back at resolution, under a different class, naming the
 * setting. That reading is what its guards rule out: this refusal
 * is about the characters of the marker, and no chain and no
 * defaults table is the edit behind it.
 *
 * So those two trees differ by one character class inside one
 * marker and by nothing else. The unreadable one is what the claims
 * are made over; the readable one is the accept guard, and the only
 * case in that section that moves when a build refuses whatever it
 * is handed — a section of nothing but refusals reads green under
 * such a build.
 *
 * What the refusal cannot say is WHERE. The form is the whole of it,
 * with no file name and no site beside it, and the recovery is a
 * `git grep` for that form across the source tree — not across the
 * output, since a refused build wrote none.
 *
 * The second subject is a source directory that is not there.
 * Nothing to build is an ordinary state of a tree rather than a
 * failure, so a build over one answers with an empty list and stops
 * before its output directory is touched. Both halves of that are
 * claimed, because neither says much alone: an empty answer is what
 * a build that had stopped reading its argument would give too, and
 * an unwritten output directory says nothing about a build that
 * writes none.
 *
 * Nothing to build has two shapes — a source directory that is
 * absent, and one that is there holding no `*.json` — and one
 * answer between them. Only the first is claimed here, and nothing
 * a case reads off a build parts it from the second, so the fixture
 * guard is what says which of the two the tree is.
 *
 * The rest of what a build owes — two runs compared byte for byte,
 * the one value allowed to move with the checkout, and what a
 * rebuild picks up from an edited library — arrives later in this
 * stage.
 */
import type { EnvSource, LibLoader } from '../../scripts/workflow-markers.js';

import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { buildAll } from '../../scripts/build-workflows.js';
import {
  ENV_DEFAULTS,
  ENV_MARKER,
  SurvivingMarkerError,
} from '../../scripts/workflow-markers.js';

import { valueAtPath } from './marker-fixtures.js';

// ---------------------------------------------------------------------------
// The two markers the fixture trees are built around
// ---------------------------------------------------------------------------

/**
 * The setting the readable marker names.
 *
 * An entry `ENV_DEFAULTS` really carries, which the guard below
 * asserts rather than leaves to the eye. The refusal under test is
 * reached by mistyping a setting a source meant to name, so a name
 * nobody ever declared would be a fixture about something else.
 */
const READ_SETTING = 'AR_BUILD_TAG';

/**
 * That same name with hyphens where the marker grammar wants
 * underscores.
 *
 * Written out rather than derived from the name above, so the two
 * are two declarations a guard can compare. Derived, the pair would
 * agree for whatever either became.
 */
const UNREAD_SETTING = 'AR-BUILD-TAG';

/**
 * A whole marker naming {@link READ_SETTING}, in the form a
 * workflow source writes one.
 */
const READ_MARKER = `__ENVVAR:${READ_SETTING}__`;

/**
 * The same marker around the mistyped name.
 *
 * A hit for no grammar, so nothing replaces it and nothing refuses
 * it until a build reads its own output back.
 */
const UNREAD_MARKER = `__ENVVAR:${UNREAD_SETTING}__`;

/**
 * The form the refusal names.
 *
 * Spelled here rather than read out of the roster the check walks:
 * an expected value taken from the module under test agrees with
 * that module however it changes.
 */
const SURVIVING_FORM = '__ENVVAR:';

/**
 * What {@link READ_MARKER} resolves to through the chain below.
 *
 * Nothing `ENV_DEFAULTS` carries, and the guard asserts as much. The
 * accept guard reads this value back out of a built artifact, and
 * would hold for a build ignoring the chain it was handed if the
 * value were the one the shipped table answers with.
 */
const FIXTURE_BUILD_TAG = 'tag-the-fixture-chain-answered';

/**
 * The settings chain both builds resolve against.
 *
 * One source, answering for one name. `ENV_DEFAULTS` is not behind
 * it: a chain assembled here rather than through `envSources` is
 * what makes the value read back the fixture's own.
 */
const FIXTURE_CHAIN: readonly EnvSource[] = [
  { [READ_SETTING]: FIXTURE_BUILD_TAG },
];

// ---------------------------------------------------------------------------
// The trees the build is pointed at
// ---------------------------------------------------------------------------

/** Where one build over a fixture tree reads from and writes to. */
interface FixtureTree {
  /** The directory holding the one workflow source. */
  readonly sourceDir: string;

  /** The directory a build writes its artifact into. */
  readonly outDir: string;
}

/** The name of the one workflow source each tree holds. */
const SOURCE_FILE = 'ar-fixture.json';

/**
 * Where every source below buries its marker.
 *
 * A node parameter rather than a top-level value, so the walk under
 * the build has to descend to reach it. Depth is not this file's
 * subject — it is claimed next door over the multi-depth template in
 * `marker-fixtures.ts` — but a marker the walk never reached would
 * leave both the refusal and the resolution below about nothing.
 */
const MARKER_SITE: readonly (string | number)[] = [
  'nodes',
  0,
  'parameters',
  'jsCode',
];

/**
 * A source-shaped object carrying one string at {@link MARKER_SITE}.
 *
 * One builder for both trees and for the expected artifact, so a
 * refused source, an accepted source and the value read back differ
 * by that one string and by nothing else. Written out per case they
 * could drift into differing where the build is not about.
 *
 * Shaped like a workflow source without being one. The build reads
 * no node type and no connection, so what matters here is that a
 * string sits where a node body sits.
 *
 * @param value - The text to bury: a marker when a tree is written,
 *   and what that marker resolves to when an expected artifact is.
 * @returns A fresh object carrying it at {@link MARKER_SITE}.
 */
function sourceCarrying(value: string): Record<string, unknown> {
  return {
    name: 'AR Build Fixture',
    nodes: [
      {
        name: 'Read settings',
        parameters: { jsCode: `// build\nconst tag = '${value}';\n` },
      },
    ],
  };
}

/**
 * The directory both fixture trees are written under, removed once
 * this file finishes.
 *
 * A real directory and not avoidable: `buildAll` lists a directory,
 * reads the files in it and writes what it built, and those four
 * steps are the half of the build no injected dependency reaches.
 */
const FIXTURE_ROOT = mkdtempSync(join(tmpdir(), 'ar-build-workflows-'));

afterAll(() => {
  rmSync(FIXTURE_ROOT, { recursive: true, force: true });
});

/**
 * Write one fixture tree and answer with the pair of directories a
 * build over it is pointed at.
 *
 * `outDir` is named and not created. A build creates it once there
 * is something to write, so a refused build leaves nothing behind at
 * all.
 *
 * @param name - The subdirectory of {@link FIXTURE_ROOT} to build
 *   the tree under, so no two trees share a source or an output.
 * @param marker - The marker the tree's one source carries.
 * @returns Where a build over that tree reads and writes.
 */
function treeCarrying(name: string, marker: string): FixtureTree {
  const tree: FixtureTree = {
    sourceDir: join(FIXTURE_ROOT, name, 'src'),
    outDir: join(FIXTURE_ROOT, name, 'dist'),
  };

  mkdirSync(tree.sourceDir, { recursive: true });
  writeFileSync(
    join(tree.sourceDir, SOURCE_FILE),
    `${JSON.stringify(sourceCarrying(marker), null, 2)}\n`,
  );

  return tree;
}

/** The tree whose source carries the marker nothing reads. */
const UNREAD_TREE = treeCarrying('unread-marker', UNREAD_MARKER);

/** The same tree with the one character class fixed. */
const READ_TREE = treeCarrying('read-marker', READ_MARKER);

/**
 * A pair of directories where neither half was ever written.
 *
 * Declared rather than built, which is the whole of what makes it
 * the tree that is not there: {@link treeCarrying} exists to write
 * a source directory, so a tree with none cannot come from it.
 *
 * The names still hang off {@link FIXTURE_ROOT}, so a build that
 * created either of them leaves it inside the directory `afterAll`
 * removes rather than somewhere nothing sweeps.
 */
const ABSENT_TREE: FixtureTree = {
  sourceDir: join(FIXTURE_ROOT, 'absent-source', 'src'),
  outDir: join(FIXTURE_ROOT, 'absent-source', 'dist'),
};

/**
 * The near miss of {@link ABSENT_TREE}: the same pair with a source
 * directory written under it.
 *
 * Its own tree rather than one of the two above, so the case
 * reading it neither depends on another having run first nor
 * rebuilds a tree those cases read.
 *
 * Which marker its source carries is not this tree's subject — it
 * takes the readable one so that a build over it gets as far as
 * writing, which is the half being guarded.
 */
const PRESENT_TREE = treeCarrying('present-source', READ_MARKER);

/**
 * The loader every build below is made with.
 *
 * It answers for nothing and says so. No source in this file writes
 * a library marker, so a call reaching it is a build resolving
 * something these cases never planted — a failure that has to name
 * itself rather than hand back a body and let a case pass on it.
 *
 * @param libPath - The path a library marker named.
 * @returns Nothing: every call is a failure.
 */
const FIXTURE_LOADER: LibLoader = (libPath) => {
  throw new Error(
    `The fixture loader was asked for ${JSON.stringify(libPath)}, and `
    + 'no source in this file writes a library marker.',
  );
};

/**
 * Build one fixture tree, with the loader and the chain every case
 * here shares.
 *
 * @param tree - The tree to build.
 * @returns The file names written.
 */
function buildTree(tree: FixtureTree): readonly string[] {
  return buildAll({
    sourceDir: tree.sourceDir,
    outDir: tree.outDir,
    loadLib: FIXTURE_LOADER,
    sources: FIXTURE_CHAIN,
  });
}

/**
 * Read a built artifact back off the disk it was written to.
 *
 * Parsed rather than compared as text, so what a case asserts is the
 * value a node would be given rather than the indentation around it.
 *
 * @param tree - The tree whose output directory to read.
 * @param file - The artifact's file name.
 * @returns The artifact, parsed.
 */
function artifactIn(tree: FixtureTree, file: string): unknown {
  const parsed: unknown = JSON.parse(readFileSync(join(tree.outDir, file), 'utf8'));

  return parsed;
}

/**
 * Whether anything sits at a path.
 *
 * The package's own way of asking, from
 * `tests/invariants/schema-sql.ts` and from `buildAll` itself: a
 * stat that answers rather than throws when nothing is there. What
 * it buys over a stat in a `try` is that a path which cannot be
 * reached for some other reason still raises, instead of being
 * folded into the same `false` as one that is simply absent.
 *
 * @param path - The path to ask about.
 * @returns Whether something is there.
 */
function existsAt(path: string): boolean {
  return statSync(path, { throwIfNoEntry: false }) !== undefined;
}

/**
 * The {@link SurvivingMarkerError} a build refused with.
 *
 * Anything else thrown is rethrown rather than handed back as this
 * refusal, which is where the class gets pinned for the cases
 * reading a field off it. A build failing some other way — a source
 * that is not JSON, a marker naming a setting no source answers for,
 * a library marker reaching the loader above — fails those cases
 * with that error instead of passing them.
 *
 * A build that RETURNED is its own failure and says so with what it
 * wrote. Reading a field off a refusal that never happened would
 * otherwise fail on a property of `undefined`, naming neither what
 * was expected nor what occurred.
 *
 * @param build - The build under test, passed unmade so what it
 *   throws lands here.
 * @returns The refusal it threw.
 */
function survivingRefusalOf(
  build: () => readonly string[],
): SurvivingMarkerError {
  let built: readonly string[];

  try {
    built = build();
  } catch (thrown) {
    if (thrown instanceof SurvivingMarkerError) {
      return thrown;
    }

    throw thrown;
  }

  throw new Error(
    `buildAll wrote ${JSON.stringify(built)} where a refusal was `
    + 'expected.',
  );
}

describe('buildAll — a source carrying a marker form nothing reads', () => {
  // The fixture guard: the marker under test mistypes a setting that
  // exists, rather than naming one nobody ever declared. That is how
  // a shipped build reaches this refusal at all, and it is also what
  // makes the tree below a near miss rather than a second fixture.
  //
  // The last expectation is about the value the accept guard reads
  // back. `ENV_DEFAULTS` stands at the foot of every chain a real
  // build walks, so a fixture answering with the same text it does
  // would leave that guard green for a build that had stopped
  // consulting the chain it was handed.
  it('is asked about a marker mistyping a setting the table carries', () => {
    expect(UNREAD_SETTING.replace(/-/gu, '_')).toBe(READ_SETTING);
    expect(Object.keys(ENV_DEFAULTS)).toContain(READ_SETTING);
    expect(FIXTURE_BUILD_TAG).not.toBe(ENV_DEFAULTS[READ_SETTING]);
  });

  // The guard that says which refusal this section is about, and the
  // one no other case can supply. Both markers carry the `__ENVVAR:`
  // form; only one of them is a marker any rule can read. Read
  // through the grammar the build exports rather than through the
  // check under test, which matches on the form alone and would
  // agree with itself here whatever the name said.
  //
  // Without it the section would hold equally for a marker naming a
  // setting the chain has no answer for — a different refusal, under
  // a different class, wanting a different edit.
  it('is asked about a marker the setting grammar cannot read', () => {
    const grammar = new RegExp(ENV_MARKER, 'u');

    expect(grammar.test(UNREAD_MARKER)).toBe(false);
    expect(grammar.test(READ_MARKER)).toBe(true);
  });

  // The accept guard, and the only case in this section that moves
  // when a build refuses whatever it is handed. Every claim here
  // reads a refusal, and a section of nothing but refusals is green
  // under such a build.
  //
  // The near miss is one character class inside one marker, so a
  // rule keyed on the form rather than on the name refuses the
  // marker a build exists to resolve, and fails here and nowhere
  // else. The value is read back out of the artifact on disk rather
  // than off the return, so a build reporting a file it never wrote
  // fails here too — and the expected value is the same builder
  // called with what the chain answers, which keeps the comparison
  // from spelling a second copy of the body.
  it('builds that same tree with the marker written in a form it reads', () => {
    const built = buildTree(READ_TREE);
    const resolved = sourceCarrying(FIXTURE_BUILD_TAG);

    expect(built).toEqual([SOURCE_FILE]);
    expect(valueAtPath(artifactIn(READ_TREE, SOURCE_FILE), MARKER_SITE))
      .toBe(valueAtPath(resolved, MARKER_SITE));
  });

  // The claim, as the class rather than as the throw. Nothing stands
  // behind this refusal, so it is not saying which of two rules
  // caught the marker — it is the whole of what stops the characters
  // a source wrote from reaching an instance. What a bare `Error`
  // would also accept is every other way a build over a tree fails:
  // a source that is not JSON, an output directory that cannot be
  // written, and the near-miss refusal above all.
  it('throws SurvivingMarkerError rather than a bare Error', () => {
    expect(() => buildTree(UNREAD_TREE)).toThrow(SurvivingMarkerError);
  });

  // Which form was found, carried as a field so a case says what the
  // build refused over without parsing a sentence it did not write.
  // The form is also the whole of what the refusal knows: the check
  // reads serialized text with no marker parse behind it, so there
  // is no name, no site and no file name to carry beside it.
  it('names the marker form it found in the artifact', () => {
    const refusal = survivingRefusalOf(() => buildTree(UNREAD_TREE));

    expect(refusal.form).toBe(SURVIVING_FORM);
  });

  // The same form in the sentence an operator actually reads, since
  // a build refusing on a terminal prints the message and none of
  // the fields.
  it('names that form in the message', () => {
    const refusal = survivingRefusalOf(() => buildTree(UNREAD_TREE));

    expect(refusal.message).toContain(SURVIVING_FORM);
  });
});

describe('buildAll — a source directory that is not there', () => {
  // The fixture guard, and the one no claim in this section can
  // supply. Nothing to build has two shapes — a directory that is
  // absent, and one that is there holding no `*.json` — reached
  // through two branches that answer alike, so what a case reads
  // off a build is the same for both. This says the tree under
  // test is the first of them, and says it of the near miss too:
  // paired here rather than left to a second case, since a guard
  // over the absent half alone could not tell a fixture root that
  // had gone missing entirely from one written as intended.
  it('is asked about a source directory that is not there', () => {
    expect(existsAt(ABSENT_TREE.sourceDir)).toBe(false);
    expect(existsAt(PRESENT_TREE.sourceDir)).toBe(true);
  });

  // The first claim: nothing to build is an ordinary state of a
  // tree and not a failure, so a build over one answers rather
  // than refuses. What the answer costs is that it cannot name a
  // wrong path — a source directory assembled badly reads exactly
  // like one holding nothing — and the empty list is where that
  // silence begins.
  it('reports nothing built', () => {
    expect(buildTree(ABSENT_TREE)).toEqual([]);
  });

  // The second claim, and a separate one because a build can
  // report nothing while still having touched the disk: an output
  // directory created before the sources are counted would leave
  // the claim above green and this one red. What it pins is that
  // a build finding nothing leaves the disk as it stands rather
  // than an empty directory behind it — which is what a reader of
  // that directory is later entitled to assume, since nothing
  // downstream can tell an empty output from one a build made.
  it('writes nothing where its output would go', () => {
    buildTree(ABSENT_TREE);

    expect(existsAt(ABSENT_TREE.outDir)).toBe(false);
  });

  // The accept guard, and the only case in this section that moves
  // when a build reports nothing and writes nothing whatever it is
  // handed. Both claims here read an absence, and a pair of absence
  // claims is green under such a build.
  //
  // The near miss is the source directory and nothing else, so a
  // build that had stopped reading its argument fails here and
  // nowhere else. The output directory is read before as well as
  // after, since `treeCarrying` names one and creates none: read
  // only afterwards, the guard would hold for a directory the
  // fixture had made rather than one this build did.
  it('builds and writes over the same pair with a source there', () => {
    expect(existsAt(PRESENT_TREE.outDir)).toBe(false);
    expect(buildTree(PRESENT_TREE)).toEqual([SOURCE_FILE]);
    expect(existsAt(PRESENT_TREE.outDir)).toBe(true);
  });
});
