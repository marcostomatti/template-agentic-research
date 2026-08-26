/**
 * What a built workflow tree has to be before the workflow invariants
 * are allowed to read it, and the refusal that fires when it is not.
 *
 * The checks standing on that read are mostly absence checks — no
 * send-capable node anywhere, no model node without a ceiling in front
 * of it — and a check of that shape is satisfied by having nothing to
 * look at. A read that came back empty leaves every one of them
 * passing, and the run prints what a run over a clean tree prints.
 * `loadBuiltWorkflows` refuses instead, and this is where that refusal
 * is shown to happen.
 *
 * Every case runs against a directory on disk rather than a mocked
 * `node:fs`. What the read has to get right is filesystem behaviour —
 * a path that is a file where a directory belongs, a `.json` sitting
 * one level down, a directory carrying the name of one — and a mock of
 * that behaviour proves only that the mock and the assertion were
 * written to agree.
 *
 * The refusals rest on the control declared with them. A read that
 * threw for whatever it was handed would satisfy every one of them, so
 * a populated tree is asserted to read through first: what these cases
 * establish, they establish about a read that returns workflows when
 * there are workflows to return.
 *
 * All of it drives a fixture tree and none of it reads the tree this
 * package builds. `workflows/src/` names no workflow until
 * `ar-dispatch`, so `workflows/dist/` is not a directory that exists
 * and the refusal is what the package's own tree yields today — which
 * would make a case calling `loadBuiltWorkflows` with no argument an
 * assertion about how far the plan has got rather than about the
 * reader. The directory parameter is there for exactly this: it keeps
 * the refusals reachable from a tree a caller controls, now while the
 * real one is absent and later once it is a healthy one.
 *
 * The reader's other refusal, over a built workflow that parses and
 * carries no node, and the walk that names offending nodes are
 * separate subjects with cases of their own, arriving later in this
 * stage.
 */
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import {
  EmptyDistDirectoryError,
  loadBuiltWorkflows,
} from './workflow-dist.js';

// ---------------------------------------------------------------------------
// Fixture material
// ---------------------------------------------------------------------------

/**
 * The name the dist path is built under, one level inside a fixture
 * root that already exists.
 *
 * Nested rather than used as the fixture root itself, because one of
 * the shapes a read has to refuse is a path that is not there at all.
 * A root the fixture helper created cannot be absent, so the state
 * every shape varies has to be a child of it.
 */
const DIST_NAME = 'dist';

/** The one node the control's artifact carries. */
const FIXTURE_NODE = {
  name: 'Fixture Node',
  type: 'n8n-nodes-base.noOp',
};

/** Named the way an artifact is, and by nothing the roster reserves. */
const WORKFLOW_FILE = 'ar-fixture.json';

/**
 * A built workflow carrying the one node a read is allowed to hand
 * back, written the way `buildAll` writes one: two-space indentation
 * and a trailing newline.
 *
 * The node names both members `BuiltWorkflowNode` declares, `name`
 * and `type`. Neither is decoration — a node short of either is
 * refused before the read returns, so an artifact without them would
 * make the control fail on a cause none of these cases is about.
 */
const WORKFLOW_JSON = `${JSON.stringify(
  { name: 'AR Fixture', nodes: [FIXTURE_NODE] },
  null,
  2,
)}\n`;

/**
 * A file with no `.json` extension, which is the whole of what parts
 * an artifact from anything else that lands in the directory.
 *
 * `buildAll` writes nothing else there, so this is not a file the real
 * tree holds — it is what an editor, an archive or a hand-copied note
 * would leave, and a read that stopped filtering by extension would
 * count it as a workflow and report a tree with something in it.
 */
const NOT_JSON_FILE = 'notes.txt';

/** Never parsed: it is there to be skipped, not read. */
const NOT_JSON_CONTENT = 'not an artifact\n';

/** Where the nested-artifact shape puts its `.json`, one level down. */
const NESTED_DIR = 'nested';

// ---------------------------------------------------------------------------
// Fixture directories
// ---------------------------------------------------------------------------

/** Fixture trees created here, removed once this file finishes. */
const FIXTURE_DIRS: string[] = [];

afterAll(() => {
  for (const fixtureDir of FIXTURE_DIRS) {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
});

/**
 * A fresh empty directory, registered for removal.
 *
 * One per case rather than one shared between them, so a case that
 * leaves a file behind can never decide what the next one reads.
 */
function makeFixtureDir(): string {
  const directory = mkdtempSync(join(tmpdir(), 'ar-workflow-dist-'));

  FIXTURE_DIRS.push(directory);

  return directory;
}

// ---------------------------------------------------------------------------
// The shapes a tree yields nothing in
// ---------------------------------------------------------------------------

/** What a path is, told apart the way the reader tells it apart. */
type PathState = 'a directory' | 'a file' | 'nothing';

/**
 * The state of a path, total over every path a shape can leave.
 *
 * Written with the package's own absent-without-throwing idiom rather
 * than with a separate existence call, so a path that is not there is
 * one of the three answers instead of a failure the guard reading it
 * would have to handle.
 */
function pathState(path: string): PathState {
  const stats = statSync(path, { throwIfNoEntry: false });

  if (stats === undefined) {
    return 'nothing';
  }

  return stats.isDirectory()
    ? 'a directory'
    : 'a file';
}

/** One way a directory yields no built workflow to read. */
interface EmptyDistShape {
  /** Stable, and what the coverage guard reports a gap by. */
  readonly id: string;

  /** Reads as the case name: `refuses a tree that <label>`. */
  readonly label: string;

  /**
   * What {@link pathState} reports for the dist path once
   * {@link EmptyDistShape.apply} has run.
   *
   * Declared rather than derived, so a shape whose `apply` quietly
   * stopped doing what it says has something to fail against. Two of
   * the three refusals reach the same answer through different
   * branches — a directory that holds nothing and one that holds no
   * `*.json` are both `a directory` — and nothing a case reads off the
   * refusal parts them, so the state is asserted where it is set up
   * rather than inferred from what came back.
   */
  readonly leaves: PathState;

  /**
   * Puts the dist path into that state, having been handed a path
   * inside a fresh fixture directory that nothing has created yet — so
   * a shape that does nothing leaves it absent.
   */
  readonly apply: (distDir: string) => void;
}

const EMPTY_DIST_SHAPES: readonly EmptyDistShape[] = [
  // Nothing is put there: the tree a build has not written yet, or a
  // reader pointed somewhere no build writes. It is what this package
  // hands out today, and it is also the shape that has to be caught
  // before `readdirSync` reaches it, so a caller is told which path
  // came back empty rather than handed an ENOENT out of the middle of
  // the read.
  {
    id: 'absent',
    label: 'is missing altogether',
    leaves: 'nothing',
    apply: () => {},
  },
  // A file where a directory belongs, which is what the path becomes
  // when something is renamed onto it. The content is a perfectly good
  // artifact on purpose: what is wrong here is the path and not what
  // is in it, and a read that opened the path before asking what it
  // was would find a workflow and report one.
  {
    id: 'not-a-directory',
    label: 'is a file rather than a directory',
    leaves: 'a file',
    apply: (distDir) => writeFileSync(distDir, WORKFLOW_JSON),
  },
  // Present, readable, and holding nothing. The filesystem reports no
  // error at all here, which makes it the shape a read taking its own
  // directory on trust would pass over in silence.
  {
    id: 'no-entries',
    label: 'exists but holds nothing',
    leaves: 'a directory',
    apply: (distDir) => mkdirSync(distDir),
  },
  // Populated, with nothing a build wrote. Split from the shape above
  // because a read that stopped filtering by extension passes that one
  // and fails this one, and the two are one fact only to a caller.
  {
    id: 'not-json',
    label: 'holds only files that are not .json',
    leaves: 'a directory',
    apply: (distDir) => {
      mkdirSync(distDir);
      writeFileSync(join(distDir, NOT_JSON_FILE), NOT_JSON_CONTENT);
    },
  },
  // The artifact is there, one level down. `buildAll` writes flat and
  // makes no subdirectory, so a `.json` nested under the output
  // directory is something no build put there — and a read that
  // started recursing would go on reporting workflows out of a tree
  // the build no longer writes into.
  {
    id: 'json-nested',
    label: 'holds a .json file only in a subdirectory',
    leaves: 'a directory',
    apply: (distDir) => {
      mkdirSync(join(distDir, NESTED_DIR), { recursive: true });
      writeFileSync(join(distDir, NESTED_DIR, WORKFLOW_FILE), WORKFLOW_JSON);
    },
  },
  // The name is right and the entry is a directory. Split from the
  // nested shape because the two fail on different halves of the same
  // filter: this one is caught by asking whether the entry is a file,
  // that one by not descending into it, and either alone leaves the
  // other uncovered.
  {
    id: 'json-is-a-directory',
    label: 'holds a directory carrying an artifact name',
    leaves: 'a directory',
    apply: (distDir) => {
      mkdirSync(join(distDir, WORKFLOW_FILE), { recursive: true });
    },
  },
];

/** A dist path inside a fixture tree, in one of those shapes. */
function makeEmptyDist(shape: EmptyDistShape): string {
  const distDir = join(makeFixtureDir(), DIST_NAME);

  shape.apply(distDir);

  return distDir;
}

// ---------------------------------------------------------------------------
// Refusals
// ---------------------------------------------------------------------------

/** Returned when the read ran to the end instead of refusing. */
const NOT_REFUSED = '(nothing refused)';

/**
 * The directory {@link loadBuiltWorkflows} refused, or
 * {@link NOT_REFUSED} when it read the fixture through.
 *
 * Only {@link EmptyDistDirectoryError} counts as a refusal, and
 * anything else is rethrown. The reader's other named refusal means
 * something different — a tree with a built workflow in it, that
 * workflow holding no node — and a filesystem error surfacing from the
 * middle of the read is a third event again. Folding any of them
 * together would let a read that had stopped working pass every case
 * that reads this.
 */
function refusedDirectory(directory: string): string {
  try {
    loadBuiltWorkflows(directory);
  } catch (thrown) {
    if (thrown instanceof EmptyDistDirectoryError) {
      return thrown.directory;
    }

    throw thrown;
  }

  return NOT_REFUSED;
}

/**
 * Ids of the shapes whose case ran, added as each one does.
 *
 * Recorded from inside the case rather than as the loop declares it,
 * which is the difference between a roster the sweep was written over
 * and one it reached. Recorded before the assertion too, so a shape
 * that stopped being refused still counts as exercised — otherwise one
 * broken refusal is reported twice, the second time as a shape nothing
 * covers.
 *
 * A set rather than a list, so an id declared twice arrives here once
 * and fails against a roster carrying it twice. Nothing else holds the
 * ids apart, and two shapes sharing one are two cases a reader cannot
 * tell apart in a verbose run.
 */
const EXERCISED_IDS = new Set<string>();

// ---------------------------------------------------------------------------
// A tree with workflows in it
// ---------------------------------------------------------------------------

describe('loadBuiltWorkflows — a tree with workflows in it', () => {
  // The control the refusals over an empty tree rest on, and the only
  // case that tells a read refusing a tree with nothing in it from one
  // refusing whatever it is handed. Every case about a refusal is
  // satisfied by a reader that throws unconditionally; this is what is
  // not.
  //
  // It is a near miss of the shapes it stands behind rather than any
  // healthy tree. The directory holds the non-`.json` file the
  // `not-json` shape holds and one artifact besides, so what parts
  // this tree from that one is the extension on a single file — which
  // is the thing the refusal is keyed on, and the only thing the
  // control is allowed to be about.
  //
  // Asserted on values only the fixture supplies. A name the reader
  // could have got from somewhere of its own would be satisfied by a
  // read that never opened the directory, and the node type comes back
  // through the parse, so a reader handing out an artifact it did not
  // read has nothing to answer with.
  it('returns every .json artifact it read, parsed', () => {
    const distDir = makeFixtureDir();

    writeFileSync(join(distDir, NOT_JSON_FILE), NOT_JSON_CONTENT);
    writeFileSync(join(distDir, WORKFLOW_FILE), WORKFLOW_JSON);

    const read = loadBuiltWorkflows(distDir).map((workflow) => ({
      file: workflow.file,
      types: workflow.nodeTypes,
    }));

    expect(read).toEqual([
      { file: WORKFLOW_FILE, types: [FIXTURE_NODE.type] },
    ]);
  });
});

// ---------------------------------------------------------------------------
// A tree holding nothing to read
// ---------------------------------------------------------------------------

describe('loadBuiltWorkflows — a tree holding nothing to read', () => {
  // In front of the loop rather than left to it. A roster that came
  // back empty generates no case at all, and a describe block with
  // nothing in it is the whole refusal going quiet — this is what
  // names the list it went quiet over.
  it('declares at least one shape to drive', () => {
    expect(EMPTY_DIST_SHAPES.length).toBeGreaterThan(0);
  });

  // What every case that follows takes on trust. A shape whose `apply`
  // quietly stopped doing what it says still gets refused — an absent
  // path and a directory nothing was written into reach the same
  // refusal by different branches — so a roster that had collapsed
  // onto one state would read as full coverage and print six ticks.
  //
  // Both halves are asserted in one case rather than one case per
  // shape, because what is worth failing on is the roster covering
  // three distinct states and not any single shape reaching its own.
  // Compared as `<id>: <state>` pairs so the diff names the shape that
  // drifted rather than reporting that two lists differ.
  it('puts the tree into the state each shape declares', () => {
    const observed = EMPTY_DIST_SHAPES.map(
      (shape) => `${shape.id}: ${pathState(makeEmptyDist(shape))}`,
    );
    const declared = EMPTY_DIST_SHAPES.map(
      (shape) => `${shape.id}: ${shape.leaves}`,
    );

    expect(observed).toEqual(declared);
  });

  for (const shape of EMPTY_DIST_SHAPES) {
    // Asserted on the directory the refusal carries rather than on the
    // fact that something was thrown. The message sends a reader to a
    // path and tells them to run the build against it, and one naming
    // a path the caller never asked about sends them to a tree the
    // workflows were never expected to be in.
    //
    // The class is pinned by the helper, which rethrows everything
    // else. `EmptyDistDirectoryError` is what says the read got as far
    // as looking and found nothing worth handing over; an ENOENT out
    // of the middle of the read says the reader broke, and an
    // assertion taking either would not be saying which happened.
    it(`refuses a tree that ${shape.label}`, () => {
      EXERCISED_IDS.add(shape.id);

      const distDir = makeEmptyDist(shape);

      expect(refusedDirectory(distDir)).toBe(distDir);
    });
  }

  // Last in the block on purpose: vitest runs a file's cases in the
  // order they were declared, so the set read here is one every case
  // before it has already written to. A run that selects this case
  // without them — a `-t` filter naming it — reports the whole roster
  // as unexercised, which is what asking at run time costs over
  // reading the loop that declared them.
  //
  // Run time is what makes it worth the cost. The cases are generated
  // from `EMPTY_DIST_SHAPES`, so the loop and the roster agree by
  // construction and an id counted off the loop would be the table
  // compared against itself. Counted off the cases, what is asserted
  // is that each shape reached one that ran.
  //
  // Which is the drift it is here for: a sweep narrowed away from the
  // roster — a slice, a filter, a hand-written list of ids — goes on
  // passing over whatever is left, and a shape added after that has no
  // case at all. Equality reports it by name in both directions.
  it('runs a case for every shape the roster declares', () => {
    const exercised = [...EXERCISED_IDS].sort();
    const declared = EMPTY_DIST_SHAPES.map((shape) => shape.id).sort();

    expect(exercised).toEqual(declared);
  });
});
