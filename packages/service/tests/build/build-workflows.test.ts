/**
 * What a build makes of a source TREE: the tree it refuses over a
 * marker nothing reads, the near miss of that tree it builds, the
 * tree that is not there at all, and one roster of sources put
 * through the command an operator runs — twice over unchanged,
 * once more with a stamp handed in, and once over a tree whose
 * library moved under an artifact already written.
 *
 * The rules underneath a build are claimed next door, in
 * `workflow-markers.test.ts`, against arguments alone — a chain of
 * sources, a recorded transpile, a parsed template. What is left to
 * this file is the half no argument reaches: the listing, the
 * per-file read, the mkdir and the write. `buildAll` takes both
 * directories as parameters so that a case can move the tree, and
 * moving it is how the first two sections here run. The two after
 * them hand the same problem to a spawned build, which is handed
 * no directories at all and names its own beside the entry point it
 * was launched from — so it is moved by being given a package tree
 * to name rather than by an argument.
 *
 * A temporary tree rather than the package's own, whichever way a
 * build is reached. Pointed at `workflows/src/` a case would
 * rebuild `workflows/dist/` underneath every check that reads it,
 * and with a stand-in loader it would rebuild it into something no
 * build produces. The package's own tree is also no fixture: it
 * holds no workflow source until `ar-dispatch` lands, so a build
 * over it today writes nothing and two runs of it compare equal by
 * having produced nothing to compare.
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
 * The third subject is what a build owes twice over: one roster of
 * sources, built by two runs of the shipped command, writing the
 * same bytes into two output directories. An artifact is a deploy
 * input rather than a diff, so nothing downstream would report a
 * build that quietly wrote something else the second time —
 * `workflows/dist/` is gitignored, and the comparison this section
 * makes is the only one holding two builds of one tree against
 * each other with nothing varied between them.
 *
 * Which is also what makes the section's guards the load-bearing
 * half. Two directories that agree perfectly is what a pair of runs
 * that never happened leaves behind, and what a build writing one
 * artifact under both names leaves too. So the claim stands on
 * three separate cases: that the command ran, that each run wrote
 * one artifact per source, and that a marker pass ran over the
 * bytes being compared.
 *
 * The fourth subject is the one value that is allowed to move.
 * Two runs of one tree agreeing byte for byte says nothing about
 * WHICH bytes a build may change between trees, and the answer is
 * one: the stamp, which the checkout supplies. So the same roster
 * is built a third time with a stamp handed in, and the artifacts
 * are read for the pair — the file whose source names the stamp
 * carries what was handed in, and every other file is the bytes
 * the run handed nothing wrote.
 *
 * Handed in through the deploy build, because that is the only way
 * there is. The default build resolves `ENV_DEFAULTS` alone and
 * reads no environment, so `--external` is not a second thing
 * varied beside the stamp: it is how a stamp reaches the shipped
 * command at all.
 *
 * The fifth subject is the one input a build does not hold still.
 * A library is reached through a marker rather than written out,
 * so what a source says about one is a name, and what an artifact
 * carries is whatever that name resolved to when the build ran. So
 * one tree is built, its library rewritten underneath the artifact
 * that build wrote, and the output directory read at both moments
 * — before anything rebuilds it, and after.
 *
 * Both halves are claimed, because each is empty without the
 * other. An artifact that did not move says nothing where none was
 * written, and two runs that never happened leave the same pair of
 * empty directories to compare; a rebuild carrying the edit says
 * nothing where the text it looks for was there all along. So that
 * section rests on a roster guard naming what the first build
 * wrote and on a fixture guard reading both editions off the path
 * the build resolves the marker to.
 *
 * It is also the only section here whose source writes a library
 * marker, and so the only one whose build reaches a splice at all.
 */
import type { EnvSource, LibLoader } from '../../scripts/workflow-markers.js';

import { spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

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
 * The settings chain every {@link buildTree} call resolves
 * against.
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
  /** The directory holding this tree's workflow sources. */
  readonly sourceDir: string;

  /** The directory a build writes its artifact into. */
  readonly outDir: string;
}

/** The name of the one source {@link treeCarrying} writes. */
const SOURCE_FILE = 'ar-fixture.json';

/**
 * Where every source in this file buries its marker.
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
 * One builder for every source that buries a SETTINGS marker, and
 * for the expected artifact besides, so a refused source, an
 * accepted source and the value read back differ by that one
 * string and by nothing else. Written out per case they could
 * drift into differing where the build is not about.
 *
 * The one source this file plants that it does not build is
 * {@link sourceInlining}'s, which writes a library marker. That
 * one belongs at the head of a node body rather than inside the
 * quoted literal this builder wraps its value in, which is the
 * whole of why it is a builder of its own.
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
 * The directory every fixture tree is written under, removed once
 * this file finishes.
 *
 * A real directory and not avoidable: `buildAll` lists a directory,
 * reads the files in it and writes what it built, and those four
 * steps are the half of the build no injected dependency reaches. A
 * spawned build reaches nothing else at all — a tree on disk is the
 * whole of what one can be handed.
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
 * The loader every {@link buildTree} call is made with.
 *
 * It answers for nothing and says so. No source the two in-process
 * sections plant writes a library marker, so a call reaching it is
 * a build resolving something they never planted — a failure that
 * has to name itself rather than hand back a body and let a case
 * pass on it.
 *
 * The spawned builds draw the same split tree by tree rather than
 * loader by loader, being made with the real one.
 * {@link SPAWN_SOURCES} writes no library marker and its trees
 * carry no library directory, so a source reaching for one there
 * would fail on the tree. {@link REBUILD_TREE} is the tree that
 * does carry one, and the section over it is where a spliced body
 * is read.
 *
 * @param libPath - The path a library marker named.
 * @returns Nothing: every call is a failure.
 */
const FIXTURE_LOADER: LibLoader = (libPath) => {
  throw new Error(
    `The fixture loader was asked for ${JSON.stringify(libPath)}, and `
    + 'no source the in-process sections plant writes a library marker.',
  );
};

/**
 * Build one fixture tree, with the loader and the chain the two
 * in-process sections share.
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

// ---------------------------------------------------------------------------
// The trees a spawned build names, and what it is given with them
// ---------------------------------------------------------------------------

/** One source a spawned build is pointed at, and what it names. */
interface SpawnSource {
  /** What the source is written as, and the artifact after it. */
  readonly file: string;

  /** The setting its one marker names. */
  readonly setting: string;
}

/**
 * The sources every tree in this section is planted with.
 *
 * Two rather than one, so that every produced file is a roster a
 * case walks rather than a single file it names. They name two
 * different settings on purpose: with one value between them, a
 * build writing either artifact's text under both names would
 * satisfy the comparison as readily as a correct one.
 *
 * The split carries a second load. One of the two names the stamp
 * and the other does not, which is what parts the value a checkout
 * is allowed to move from the values it is not.
 */
const SPAWN_SOURCES: readonly SpawnSource[] = [
  { file: 'ar-fixture-stamp.json', setting: 'AR_BUILD_TAG' },
  { file: 'ar-fixture-cron.json', setting: 'AR_DISPATCH_CRON' },
];

/**
 * The artifact names a build over that roster writes, in the order
 * a directory listing gives them back.
 *
 * Derived from the roster rather than written out beside it, so a
 * source added above cannot leave a second list behind saying the
 * old thing.
 */
const SPAWNED_ARTIFACTS = SPAWN_SOURCES.map((source) => source.file).sort();

/**
 * The setting a stamp is handed in as.
 *
 * The one name in {@link SPAWN_SOURCES} whose value a build is
 * entitled to move: `gitBuildTag` answers it out of a checkout,
 * so an artifact built at one commit and an artifact built at the
 * next differ here and are meant to. Every other setting resolves
 * to the same text until the table or an environment is edited.
 *
 * The same name {@link READ_SETTING} spells, for a different
 * reason — there a marker mistypes it, here it is the value that
 * moves — and spelled twice rather than shared, so an edit made
 * for one section's fixture cannot move the other's.
 */
const STAMP_SETTING = 'AR_BUILD_TAG';

/** The sources whose marker names {@link STAMP_SETTING}. */
const STAMPED_SOURCES = SPAWN_SOURCES.filter(
  (source) => source.setting === STAMP_SETTING,
);

/** The sources whose marker names anything else. */
const UNSTAMPED_SOURCES = SPAWN_SOURCES.filter(
  (source) => source.setting !== STAMP_SETTING,
);

/**
 * The stamp {@link INJECTED_RUN} is handed.
 *
 * Neither answer a build makes for itself. `ENV_DEFAULTS` carries
 * `dev` for this name, and a tree under the temporary root is no
 * checkout, so the build's own git call answers `dev` too — a
 * value neither of them can produce is what makes an artifact
 * carrying it evidence that the stamp handed in is the one that
 * landed.
 */
const INJECTED_TAG = 'tag-handed-to-the-deploy-build';

/**
 * The argument that asks for the deploy build.
 *
 * Spelled here rather than imported, since the build declares it
 * privately — and for the reason {@link SURVIVING_FORM} is spelled
 * too: an expected value taken from the module under test agrees
 * with that module however it changes.
 */
const EXTERNAL_FLAG = '--external';

/**
 * The environment a spawned build is given.
 *
 * Every name {@link ENV_DEFAULTS} carries is taken out of it, and
 * the stamp, where there is one, is put back. `PATH` and whatever
 * else a launcher needs is left where it is: what is stripped is
 * the table's own names and nothing besides.
 *
 * Given to every run rather than to the one that reads an
 * environment, so no two runs differ in anything but the stamp. A
 * developer with `AR_DISPATCH_CRON` exported would otherwise move
 * an artifact that two runs are compared over, for a reason no
 * case in this file is about.
 *
 * @param stamp - The stamp to hand in, or `null` for a run handed
 *   none.
 * @returns The environment to spawn that run with.
 */
function spawnEnv(stamp: string | null): Record<string, string | undefined> {
  const settingNames = Object.keys(ENV_DEFAULTS);
  const carried = Object.entries(process.env).filter(
    ([name]) => !settingNames.includes(name),
  );

  return Object.fromEntries(
    stamp === null
      ? carried
      : [...carried, [STAMP_SETTING, stamp]],
  );
}

/**
 * The package's own `scripts/`, resolved from this file's location
 * rather than from the working directory.
 *
 * The suite is launched from the package and from the repo root
 * alike, and only one of those makes a relative path name this
 * directory — the same reason the invariant suites resolve their
 * roots this way.
 */
const PACKAGE_SCRIPTS_DIR = fileURLToPath(
  new URL('../../scripts', import.meta.url),
);

/** The file inside that directory a build is launched from. */
const ENTRY_FILE = 'build-workflows.ts';

/** What {@link spawnedBuild} reports for a run that completed. */
const LAUNCH_OK = 'exit 0';

/** One tree a build was spawned over, and how that run went. */
interface SpawnedBuild extends FixtureTree {
  /**
   * `exit 0` for a run that completed, and otherwise the status
   * beside everything the run had to say.
   *
   * Carried as one string rather than as a status and a stream, so
   * a case failing over a build that never ran says why in its own
   * failure instead of leaving it in a subprocess nobody kept.
   */
  readonly launch: string;
}

/**
 * Plant a package tree, spawn the build over it, and answer with
 * where it wrote and how it went.
 *
 * A spawned command rather than a `buildAll` call, and it is the
 * LAUNCHER that decides that rather than a preference between two
 * shapes. The build's library splice reaches for `Bun.Transpiler`,
 * which a vitest worker does not have: measured in this package's
 * own workers, `Bun` is an object carrying `serve` and nothing
 * else, `Bun.Transpiler` is `undefined`, and `bunTranspiler()`
 * refuses there with `TranspilerUnavailableError`. A case already
 * inside a worker cannot relaunch itself, so a subprocess is the
 * only shape left to it.
 *
 * The other half of the reason is what a call would leave out. The
 * two sections driving `buildAll` in this process hand it
 * {@link FIXTURE_LOADER} in place of a loader over a real
 * transpiler, which is the arrangement a worker permits and not
 * the one that writes `workflows/dist/`: the shipped path builds a
 * transpiler whether or not the tree holds a source to splice,
 * picks its settings chain off the command line, and names its two
 * directories and its stamp root off the entry point instead of
 * taking any of them as arguments. Two in-process runs would agree
 * byte for byte about a build this file had supplied half of.
 *
 * What the spawn does not buy belongs in the same breath:
 * {@link SPAWN_SOURCES} writes settings markers and no library
 * marker, so the transpiler each run builds goes unused and no
 * spliced body is among the bytes compared. What a rebuild makes
 * of an edited library is a subject of its own, claimed over
 * {@link REBUILD_TREE}, which carries a library for its source to
 * name.
 *
 * The command takes no directories: it names `workflows/src/` and
 * `workflows/dist/` beside the entry point it was launched from. So
 * a build is pointed somewhere else by being given a tree to name —
 * a copy of `scripts/` beside a source directory — and the copy is
 * taken at run time, so what runs is the file this package ships
 * rather than a second one to keep in step with it.
 *
 * `cwd` is the tree too, though every path the build resolves hangs
 * off the entry point's own location rather than off the launcher's
 * directory. A build that had it the other way round would answer
 * the same here and differently everywhere else.
 *
 * A run handed a stamp is the deploy build, and those are one
 * thing rather than two. The default build resolves `ENV_DEFAULTS`
 * alone and reads no environment at all, so {@link EXTERNAL_FLAG}
 * is not a second knob turned beside the stamp — it is the whole
 * of how a stamp reaches the shipped command. It moves where the
 * artifacts land as well, into `workflows/dist-external/`, which
 * is the same opt-in rule from its other side: an artifact that
 * absorbed an environment and one that could not never share a
 * name.
 *
 * @param name - The subdirectory of {@link FIXTURE_ROOT} to plant
 *   the tree under, so no two runs share a source or an output.
 * @param stamp - The stamp to hand the build, or `null` for a run
 *   handed none. A stamp asks for the deploy build.
 * @returns Where that run read and wrote, and how it went.
 */
function spawnedBuild(name: string, stamp: string | null = null): SpawnedBuild {
  const root = join(FIXTURE_ROOT, name);
  const external = stamp !== null;
  const tree: FixtureTree = {
    sourceDir: join(root, 'workflows', 'src'),
    outDir: join(
      root,
      'workflows',
      external
        ? 'dist-external'
        : 'dist',
    ),
  };

  mkdirSync(tree.sourceDir, { recursive: true });
  cpSync(PACKAGE_SCRIPTS_DIR, join(root, 'scripts'), { recursive: true });

  for (const source of SPAWN_SOURCES) {
    const planted = sourceCarrying(`__ENVVAR:${source.setting}__`);

    writeFileSync(
      join(tree.sourceDir, source.file),
      `${JSON.stringify(planted, null, 2)}\n`,
    );
  }

  const entry = join(root, 'scripts', ENTRY_FILE);
  const run = spawnSync(
    'bun',
    external
      ? [entry, EXTERNAL_FLAG]
      : [entry],
    { cwd: root, encoding: 'utf8', env: spawnEnv(stamp) },
  );

  return {
    ...tree,
    launch: run.status === 0
      ? LAUNCH_OK
      : `exit ${String(run.status)}: ${run.error?.message ?? ''}${run.stderr}`,
  };
}

/**
 * The first of two runs over one roster of sources, and the run
 * handed no stamp that {@link INJECTED_RUN} is held against.
 */
const FIRST_RUN = spawnedBuild('first-run');

/** The second, over a tree differing only in where it sits. */
const SECOND_RUN = spawnedBuild('second-run');

/** The same roster again, with {@link INJECTED_TAG} handed in. */
const INJECTED_RUN = spawnedBuild('injected-stamp', INJECTED_TAG);

/**
 * Every artifact a run wrote, as the bytes it wrote them as.
 *
 * Bytes rather than parsed values: what a deploy uploads is the
 * file, indentation and trailing newline included, and a parse
 * would let two artifacts differing in either compare equal.
 *
 * @param run - The run whose output directory to read.
 * @returns The artifacts, keyed by file name.
 */
function artifactBytesOf(run: SpawnedBuild): Record<string, Uint8Array> {
  return Object.fromEntries(
    readdirSync(run.outDir)
      .sort()
      .map((file) => [file, readFileSync(join(run.outDir, file))]),
  );
}

/**
 * The bytes of the artifacts whose sources name no stamp.
 *
 * Read by name off {@link UNSTAMPED_SOURCES} rather than by
 * listing the directory, so two runs are held against the same
 * roster of names either way and a run that wrote one of them
 * fails on the read — naming the path — rather than on a record
 * that came back shorter.
 *
 * @param run - The run whose artifacts to read.
 * @returns Those artifacts, keyed by file name.
 */
function unstampedBytesOf(run: SpawnedBuild): Record<string, Uint8Array> {
  return Object.fromEntries(
    UNSTAMPED_SOURCES.map(
      (source) => [source.file, readFileSync(join(run.outDir, source.file))],
    ),
  );
}

/**
 * What the marker in each source resolved to, read back out of the
 * artifacts one run wrote.
 *
 * @param run - The run whose artifacts to read.
 * @returns One value per source, in roster order.
 */
function resolvedValuesOf(run: SpawnedBuild): readonly unknown[] {
  return SPAWN_SOURCES.map(
    (source) => valueAtPath(artifactIn(run, source.file), MARKER_SITE),
  );
}

/**
 * What `ENV_DEFAULTS` answers for one source's setting.
 *
 * A missing entry is a fixture that has come apart rather than a
 * value to compare against — a build over such a source refuses
 * back at resolution — so it is reported here instead of standing
 * in as an expected `undefined`.
 *
 * @param source - The source whose setting to look up.
 * @returns The value the table carries for it.
 */
function settingValue(source: SpawnSource): string {
  const value = ENV_DEFAULTS[source.setting];

  if (value === undefined) {
    throw new Error(`ENV_DEFAULTS carries no ${source.setting}.`);
  }

  return value;
}

describe('bun scripts/build-workflows.ts — one roster, two runs', () => {
  // The fixture guard the resolution case rests on: the two sources
  // name settings the table answers for, and answers apart. Were
  // both to resolve to one value, a build writing either artifact's
  // text under both file names would pass every case here.
  it('plants two sources naming settings the table answers apart', () => {
    const values = SPAWN_SOURCES.map((source) => ENV_DEFAULTS[source.setting]);

    expect(values).not.toContain(undefined);
    expect(new Set(values).size).toBe(SPAWN_SOURCES.length);
  });

  // The launch guard, and the first of the three the comparison
  // stands on. A command that never ran leaves two directories with
  // nothing in them, and nothing compares equal to nothing — so the
  // exit status is what says this section is about a build at all.
  // Read as a string carrying what the run printed, since a failure
  // here is a subprocess that will not be there to ask afterwards.
  it('runs to completion in both trees', () => {
    expect(FIRST_RUN.launch).toBe(LAUNCH_OK);
    expect(SECOND_RUN.launch).toBe(LAUNCH_OK);
  });

  // The second: what each run left behind, by name. The comparison
  // walks the artifacts a run wrote rather than the sources it was
  // given, so a build writing one of the two would compare equal
  // against another build doing the same — this is what says both
  // runs wrote both files.
  it('writes one artifact per source in both output directories', () => {
    expect(Object.keys(artifactBytesOf(FIRST_RUN))).toEqual(SPAWNED_ARTIFACTS);
    expect(Object.keys(artifactBytesOf(SECOND_RUN))).toEqual(SPAWNED_ARTIFACTS);
  });

  // The third: that the bytes being compared are a build's output
  // rather than its input. A pass that copied every source through
  // untouched would write two directories agreeing perfectly, and
  // the marker sites are where that reading is ruled out — each
  // artifact holds what the setting its source named resolved to.
  //
  // Which of two answers supplied the stamp is not claimed. A tree
  // under the temporary root is no checkout, so the build's own git
  // call answers `dev`, which is also what the table carries, and
  // nothing here can tell the two apart. What this section is about
  // is that the answer, whichever gave it, was the same twice.
  it('resolves the setting each source names, in both trees', () => {
    const expected = SPAWN_SOURCES.map(
      (source) => valueAtPath(sourceCarrying(settingValue(source)), MARKER_SITE),
    );

    expect(resolvedValuesOf(FIRST_RUN)).toEqual(expected);
    expect(resolvedValuesOf(SECOND_RUN)).toEqual(expected);
  });

  // The claim: one roster of sources, built twice, byte for byte
  // the same both times. Made as one comparison over the whole of
  // what each run wrote rather than as a walk with an expectation
  // inside it, so a comparison that reached no file fails on the
  // names it did not find instead of passing quietly.
  //
  // The two trees differ in where they sit and in nothing else, so
  // what this also rules out is a build letting its own location
  // reach an artifact — a path baked into a node body would deploy
  // one machine's build directory to every instance.
  it('writes byte-identical artifacts into both directories', () => {
    expect(artifactBytesOf(SECOND_RUN)).toEqual(artifactBytesOf(FIRST_RUN));
  });
});

describe('bun scripts/build-workflows.ts --external — a stamp handed in', () => {
  // The fixture guard both claims here rest on, and the half
  // neither of them can supply: the roster carries a source naming
  // the stamp AND a source naming something else. With only the
  // first, the byte comparison would hold two empty records
  // against each other; with only the second, nothing in the tree
  // would carry a stamp at all.
  it('plants a source naming the stamp and a source naming another', () => {
    expect(STAMPED_SOURCES).not.toEqual([]);
    expect(UNSTAMPED_SOURCES).not.toEqual([]);
  });

  // The second guard: the stamp handed in is a value no build
  // makes for itself. `ENV_DEFAULTS` answers `dev` for this name,
  // and a fixture tree is no checkout, so the build's own git call
  // answers `dev` too. Which of the two supplied it is not
  // knowable from here — so what is read is the run handed
  // nothing, and that covers whichever it was.
  it('hands in a stamp no unstamped build resolves to', () => {
    const injected = valueAtPath(sourceCarrying(INJECTED_TAG), MARKER_SITE);
    const handedNothing = STAMPED_SOURCES.map(
      (source) => valueAtPath(artifactIn(FIRST_RUN, source.file), MARKER_SITE),
    );

    expect(INJECTED_TAG).not.toBe(ENV_DEFAULTS[STAMP_SETTING]);
    expect(handedNothing).not.toContain(injected);
  });

  // The launch guard. A command that never ran leaves no output
  // directory at all, so every read below it would fail naming a
  // path rather than the run that never wrote one — which is why
  // the status is carried as the string the spawn built, printing
  // whatever the run had to say for itself.
  it('runs to completion with a stamp in its environment', () => {
    expect(INJECTED_RUN.launch).toBe(LAUNCH_OK);
  });

  // The roster guard: this run built the whole tree rather than
  // the one artifact the claim below reads. A build stopping after
  // the source it found a stamp for would satisfy that claim
  // outright.
  it('writes one artifact per source', () => {
    expect(Object.keys(artifactBytesOf(INJECTED_RUN))).toEqual(SPAWNED_ARTIFACTS);
  });

  // The first claim: the stamp a build is handed is the stamp its
  // artifacts carry. Read at the marker site out of the file on
  // disk rather than off the line the build printed — a build
  // reporting one stamp and writing another is the failure the
  // shipped command reads its own chain back to avoid, and a case
  // trusting that report could not see it.
  it('writes the stamp it was handed into the artifact naming it', () => {
    const expected = STAMPED_SOURCES.map(
      () => valueAtPath(sourceCarrying(INJECTED_TAG), MARKER_SITE),
    );
    const written = STAMPED_SOURCES.map(
      (source) => valueAtPath(artifactIn(INJECTED_RUN, source.file), MARKER_SITE),
    );

    expect(written).toEqual(expected);
  });

  // The second claim, and the half that makes the stamp the ONLY
  // value that moves: every artifact whose source names another
  // setting is the bytes the run handed nothing wrote. Two things
  // were varied between these two runs — the stamp, and the build
  // mode that is the only way to hand one in — and this is what
  // says neither of them reached a file the stamp does not name.
  //
  // Held as one record against another rather than as a walk with
  // an expectation inside it. What that leaves is a roster which
  // could be empty, and ruling that out is the fixture guard's
  // job rather than this case's.
  it('leaves every artifact naming another setting byte-identical', () => {
    expect(unstampedBytesOf(INJECTED_RUN)).toEqual(unstampedBytesOf(FIRST_RUN));
  });
});

// ---------------------------------------------------------------------------
// The tree whose library is edited under an artifact already written
// ---------------------------------------------------------------------------

/** The library the source in this section inlines. */
const LIB_FILE = 'ar-fixture-lib.ts';

/** The marker naming it, in the form a workflow source writes. */
const LIBRARY_MARKER = `__INLINE:${LIB_FILE}__`;

/** The one function that library declares. */
const LIB_FUNCTION = 'fixtureLibraryEdition';

/**
 * The text the library returns before the edit.
 *
 * A text rather than a rule: what the library DOES is not this
 * section's subject, and a node body carrying this string is a body
 * carrying the library that declared it. Spelled to be unique to
 * this file, so a body holding it holds it because a library put it
 * there.
 */
const FIRST_EDITION = 'library-text-the-first-build-read';

/**
 * The text the same library returns after the edit.
 *
 * Different from {@link FIRST_EDITION}, and a guard says so: a
 * rebuild carrying one of the two is evidence about the edit only
 * where the other is what it carried before.
 */
const SECOND_EDITION = 'library-text-written-after-that-build';

/**
 * The library, written around one of those two editions.
 *
 * One builder for both, so the text a build reads and the text an
 * edit leaves behind differ in that one string and in nothing else.
 * A declaration-form export and no import of any kind, which is the
 * whole of what `assertSpliceable` asks of a library: one it refused
 * would fail the runs below on the build rather than on anything
 * this section is about.
 *
 * @param edition - The text the declared function returns.
 * @returns The library source, as a file.
 */
function libraryDeclaring(edition: string): string {
  return [
    `export function ${LIB_FUNCTION}(): string {`,
    `  return '${edition}';`,
    '}',
    '',
  ].join('\n');
}

/** The name this section's source is written as, and its artifact. */
const REBUILD_SOURCE_FILE = 'ar-rebuild-fixture.json';

/**
 * The line the fixture's node body writes under the marker: a Code
 * node's own work, over the library the marker put above it.
 *
 * Nothing constructs or runs this body. The claims here read it as
 * text, and `schedule-splice.test.ts` is where a spliced body is
 * handed the globals a node is given and driven.
 */
const NODE_WORK = `return [{ json: { tag: ${LIB_FUNCTION}() } }];`;

/**
 * A source-shaped object whose one node body opens with a library
 * marker.
 *
 * A second source builder rather than a call to
 * {@link sourceCarrying}, which buries its string inside a quoted
 * literal — the shape a settings value belongs in and a library does
 * not. What follows the marker is {@link NODE_WORK}, because that is
 * what a Code node holding a library looks like: the library spliced
 * in above the line that calls it.
 *
 * @param marker - The library marker to open the body with.
 * @returns A fresh object carrying it at {@link MARKER_SITE}.
 */
function sourceInlining(marker: string): Record<string, unknown> {
  return {
    name: 'AR Rebuild Fixture',
    nodes: [
      {
        name: 'Read the library',
        parameters: { jsCode: `${marker}\n\n${NODE_WORK}\n` },
      },
    ],
  };
}

/** One tree a build can be run over more than once. */
interface EditableTree extends FixtureTree {
  /** The tree's own root, which a build is launched from inside. */
  readonly root: string;

  /** The directory a build resolves the library marker against. */
  readonly libDir: string;
}

/**
 * Write the library into a tree, over whatever is there.
 *
 * One call plants the first edition and makes the edit, so the edit
 * is a library file rewritten rather than a second arrangement —
 * which is exactly what an operator changing a library does.
 *
 * @param tree - The tree whose library directory to write into.
 * @param edition - The text the library is to return.
 */
function editLibrary(tree: EditableTree, edition: string): void {
  writeFileSync(join(tree.libDir, LIB_FILE), libraryDeclaring(edition));
}

/**
 * The library as it sits on disk.
 *
 * Read back rather than taken from what was written, so the fixture
 * guard is about a file a build could open rather than about a call
 * this file made.
 *
 * @param tree - The tree whose library to read.
 * @returns The library source.
 */
function libraryTextOf(tree: EditableTree): string {
  return readFileSync(join(tree.libDir, LIB_FILE), 'utf8');
}

/**
 * Plant a package tree around a library of this file's own, and
 * answer with where a build over it reads and writes.
 *
 * The tree {@link spawnedBuild} plants with one directory more: the
 * command names `src/lib/` beside its entry point as well, so a tree
 * whose source writes a library marker has to carry one.
 *
 * The library is planted rather than copied out of the package's own
 * `src/lib/`, which is where this section and
 * `schedule-splice.test.ts` part company. That file copies the
 * shipped library because the shipped library IS its subject —
 * whether what this package ships is something a Code node could
 * run. Here the subject is the artifact, and what the library says
 * matters only in that one build read one text and the next read
 * another.
 *
 * Nothing is built here. A build is a call of its own because two of
 * them run over this one tree with an edit between, and the whole of
 * the claim is what sits either side of it.
 *
 * @param name - The subdirectory of {@link FIXTURE_ROOT} to plant
 *   the tree under.
 * @param edition - The text the planted library returns.
 * @returns Where a build over that tree reads and writes.
 */
function plantEditableTree(name: string, edition: string): EditableTree {
  const root = join(FIXTURE_ROOT, name);
  const tree: EditableTree = {
    root,
    sourceDir: join(root, 'workflows', 'src'),
    outDir: join(root, 'workflows', 'dist'),
    libDir: join(root, 'src', 'lib'),
  };

  mkdirSync(tree.sourceDir, { recursive: true });
  mkdirSync(tree.libDir, { recursive: true });
  cpSync(PACKAGE_SCRIPTS_DIR, join(root, 'scripts'), { recursive: true });
  writeFileSync(
    join(tree.sourceDir, REBUILD_SOURCE_FILE),
    `${JSON.stringify(sourceInlining(LIBRARY_MARKER), null, 2)}\n`,
  );
  editLibrary(tree, edition);

  return tree;
}

/**
 * Spawn the shipped command over a tree, and answer with how it
 * went.
 *
 * {@link spawnedBuild} plants and runs in one call, which is what a
 * run over a fresh tree wants. This one only runs: the two runs here
 * are over ONE tree, and what parts them is the edit between rather
 * than the tree beneath.
 *
 * Handed {@link spawnEnv}'s environment like every other run in this
 * file, though nothing in this tree reads one — the default build
 * resolves `ENV_DEFAULTS` alone, and this source writes a library
 * marker and no settings marker for an environment to answer.
 *
 * @param tree - The tree to build.
 * @returns `exit 0` for a run that completed, and otherwise the
 *   status beside everything the run had to say.
 */
function rebuildOver(tree: EditableTree): string {
  const run = spawnSync(
    'bun',
    [join(tree.root, 'scripts', ENTRY_FILE)],
    { cwd: tree.root, encoding: 'utf8', env: spawnEnv(null) },
  );

  return run.status === 0
    ? LAUNCH_OK
    : `exit ${String(run.status)}: ${run.error?.message ?? ''}${run.stderr}`;
}

/**
 * Every artifact in an output directory, keyed by name.
 *
 * Total over a directory that is not there, unlike
 * {@link artifactBytesOf}, and where each is read from is the
 * reason. That one is called from inside a case, where a build
 * that never wrote should fail naming the path; this one is called
 * between an edit and a rebuild, where no case is standing and a
 * throw would take the whole file down before the launch guard
 * could say why.
 *
 * What being total costs is that an absent directory and a build
 * that wrote nothing come back alike, and two empty records compare
 * equal. The roster guard is what rules that out rather than
 * anything here.
 *
 * Read as text rather than as bytes, since these same artifacts are
 * what a node body is parsed out of below. Nothing is given up for
 * it: a decode is lossless over the UTF-8 JSON a build writes, so
 * the indentation and the trailing newline are still inside the
 * comparison.
 *
 * @param outDir - The output directory to read.
 * @returns The artifacts, keyed by file name.
 */
function artifactTextsUnder(outDir: string): Record<string, string> {
  if (!existsAt(outDir)) {
    return {};
  }

  return Object.fromEntries(
    readdirSync(outDir)
      .sort()
      .map((file) => [file, readFileSync(join(outDir, file), 'utf8')]),
  );
}

/**
 * The node body one snapshot's artifact carries.
 *
 * Parsed and walked to {@link MARKER_SITE}, so what a case reads is
 * the string a node would be handed rather than the JSON escaping
 * around it. Two things are reported rather than coerced: a snapshot
 * holding no artifact of that name, and a site holding anything but
 * a string. `String(undefined)` carries neither edition, so a
 * snapshot with nothing in it would satisfy the absence claim below
 * outright.
 *
 * @param artifacts - The snapshot to read.
 * @returns The node body its artifact carries.
 */
function bodyIn(artifacts: Record<string, string>): string {
  const text = artifacts[REBUILD_SOURCE_FILE];

  if (text === undefined) {
    throw new Error(
      `No ${REBUILD_SOURCE_FILE} among `
      + `${JSON.stringify(Object.keys(artifacts))}: the run that was to `
      + 'write it left this snapshot as it stands.',
    );
  }

  const parsed: unknown = JSON.parse(text);
  const body: unknown = valueAtPath(parsed, MARKER_SITE);

  if (typeof body !== 'string') {
    throw new Error(
      `The node body at [${MARKER_SITE.join(', ')}] came back as `
      + `${typeof body} rather than a string. The artifact and the `
      + 'site naming it have drifted apart — fix whichever moved.',
    );
  }

  return body;
}

/**
 * The tree the section below runs over, planted with the first
 * edition of its library.
 *
 * What follows is a sequence rather than a set of fixtures, and it
 * runs out here because one of its readings has nowhere else to
 * happen: the state of an output directory at a moment between an
 * edit and a rebuild, which no case can be standing at. Every case
 * below reads what was recorded here rather than a disk that has
 * moved on.
 */
const REBUILD_TREE = plantEditableTree('edited-library', FIRST_EDITION);

/** The library the first build resolved the marker against. */
const LIBRARY_AS_BUILT = libraryTextOf(REBUILD_TREE);

/** How that build went. */
const FIRST_LAUNCH = rebuildOver(REBUILD_TREE);

/** What it left in the output directory. */
const BUILT_ARTIFACTS = artifactTextsUnder(REBUILD_TREE.outDir);

// The edit itself: the library rewritten while the artifact that
// build wrote is still sitting where it wrote it.
editLibrary(REBUILD_TREE, SECOND_EDITION);

/** The library as the edit leaves it. */
const EDITED_LIBRARY = libraryTextOf(REBUILD_TREE);

/** The same output directory, read again with no build between. */
const ARTIFACTS_AFTER_THE_EDIT = artifactTextsUnder(REBUILD_TREE.outDir);

/** How the build run after the edit went. */
const SECOND_LAUNCH = rebuildOver(REBUILD_TREE);

/** What that run left in the same output directory. */
const REBUILT_ARTIFACTS = artifactTextsUnder(REBUILD_TREE.outDir);

describe('bun scripts/build-workflows.ts — a library edited after a build', () => {
  // The launch guard, and the case that has to come first: two runs
  // over one tree, both of which have to have happened for anything
  // here to be about a build at all. A command that never ran leaves
  // no output directory, and the reader above answers for one of
  // those with an empty record rather than a throw — so without
  // this, a pair of runs that never happened would satisfy the
  // unchanged claim perfectly.
  it('runs to completion before the edit and again after it', () => {
    expect(FIRST_LAUNCH).toBe(LAUNCH_OK);
    expect(SECOND_LAUNCH).toBe(LAUNCH_OK);
  });

  // The fixture guard for the edit, read off the disk a build reads
  // rather than off the call that wrote it. Both editions are read
  // at the path the build resolves the marker to, and held against
  // each other as well: an edit writing the same text twice would
  // leave the unchanged claim green for the wrong reason, and one
  // writing somewhere else would leave the rebuild nothing to pick
  // up.
  it('rewrites the library the build resolves its marker against', () => {
    expect(LIBRARY_AS_BUILT).toBe(libraryDeclaring(FIRST_EDITION));
    expect(EDITED_LIBRARY).toBe(libraryDeclaring(SECOND_EDITION));
    expect(EDITED_LIBRARY).not.toBe(LIBRARY_AS_BUILT);
  });

  // The roster guard, and the half the unchanged claim rests on
  // rather than supplies for itself: two empty snapshots compare
  // equal, so what says that claim is about an artifact at all is
  // that the first build wrote one — named, and carrying the
  // library it read.
  //
  // The body half is also where the splice is proven to have
  // happened. A marker left unresolved is refused by the survival
  // check and fails the launch guard above, so what is left for
  // this to catch is an artifact written from something other than
  // the file the marker named.
  it('writes one artifact carrying the library that build read', () => {
    expect(Object.keys(BUILT_ARTIFACTS)).toEqual([REBUILD_SOURCE_FILE]);
    expect(bodyIn(BUILT_ARTIFACTS)).toContain(FIRST_EDITION);
  });

  // The first claim, and the property a reader of `workflows/dist/`
  // is owed: an artifact is a copy taken when a build ran rather
  // than a view of the files that made it. The library moved under
  // it and it did not move. What that rules out is an artifact
  // still POINTING at what it was built from — a body written to
  // reach for the library when the node runs would answer
  // differently the moment the file changed, and would read exactly
  // like this one until then.
  //
  // Held as one snapshot against another rather than as a walk with
  // an expectation inside it. What that leaves is a pair of empty
  // records comparing equal, and the roster guard above is what
  // rules it out rather than this case.
  it('leaves that artifact as it was while nothing rebuilds it', () => {
    expect(ARTIFACTS_AFTER_THE_EDIT).toEqual(BUILT_ARTIFACTS);
  });

  // The second claim: running the same command again is the whole
  // of what carries an edit across. Nothing had to be asked of the
  // build for that — it caches no library and reads no artifact
  // back, so a rebuild is a first build over an input that moved.
  it('carries the edit into the artifact once it is run again', () => {
    expect(bodyIn(REBUILT_ARTIFACTS)).toContain(SECOND_EDITION);
  });

  // The third, and the half saying the rebuild REPLACED the body
  // rather than adding to it: nothing of the library the first
  // build read is left. An absence over produced text is worth what
  // the presence beside it is worth, and this detector is proven
  // live by the roster guard above, which reads this same text out
  // of the artifact the first build wrote.
  it('leaves nothing of the library the first build read', () => {
    expect(bodyIn(REBUILT_ARTIFACTS)).not.toContain(FIRST_EDITION);
  });
});
