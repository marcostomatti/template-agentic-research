/**
 * What a built workflow tree has to be before the workflow invariants
 * are allowed to read it, and the two refusals that fire when it is
 * not.
 *
 * The checks standing on that read are mostly absence checks — no
 * send-capable node anywhere, no model node without a ceiling in front
 * of it — and a check of that shape is satisfied by having nothing to
 * look at. A read that came back empty leaves every one of them
 * passing, and the run prints what a run over a clean tree prints.
 * `loadBuiltWorkflows` refuses instead, and this is where those
 * refusals are shown to happen.
 *
 * They answer one complaint at two levels, and the level is what makes
 * them two sections rather than one roster. A tree yielding no built
 * workflow is a build that did not run, or a reader pointed where no
 * build writes. A built workflow carrying no node parsed, was counted
 * among the workflows read, and holds nothing a node-level assertion
 * can look at. What parts them is the edit each names — one sends a
 * reader to run the build over a tree, the other to the source file of
 * that same name — and a case taking either refusal for the other
 * would be saying neither.
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
 * That accepting read has a property of its own worth asserting, and it
 * is the one every report built on it is printed in: the order.
 * `readdirSync` answers in directory order, which is the filesystem's
 * and not the same one twice across machines, so a read passing it
 * through would list one tree two ways and leave no expectation anybody
 * could write down. The order case drives a tree of several artifacts
 * and holds what came back against an answer declared by hand.
 *
 * Its fixture is built so that answer is not one a listing hands over
 * for free, which took measuring rather than assuming: `readdirSync`
 * here lists in byte order, and over names written in one case that IS
 * the sorted answer. So the artifacts are named to part the two — by
 * letter and by byte in opposite directions — and written in a third
 * order again, for a filesystem that lists in the order things arrive.
 * What no fixture can settle is which order it is handed, so nothing
 * here asserts one.
 *
 * All of it drives a fixture tree and none of it reads the tree this
 * package builds. What that tree holds moves with the plan —
 * `ar-dispatch` landed in `workflows/src/` and grows a node per task —
 * so a case calling `loadBuiltWorkflows` with no argument would assert
 * how far the work has got rather than anything about the reader. The
 * directory parameter is there for exactly this: it keeps both
 * refusals reachable from a tree a caller controls, whatever the real
 * one happens to hold.
 *
 * One axis stands still throughout the second of the two refusal
 * sections, and nothing later in this stage moves it: every tree it
 * drives holds one artifact. So the refusal being raised on the FIRST
 * built workflow carrying no node, rather than collected over the
 * whole read, is not something those cases part from its being raised
 * on the only one.
 *
 * The walk that names offending nodes is a separate subject with a
 * section of its own. What it is asked there is whether a report names
 * every offender or the first one, so its tree carries two in one
 * artifact with a node passed over between them, and a third in an
 * artifact of its own with a clean artifact sorted in between. Only
 * half the order it prints in is that section's: inside an artifact
 * the order is the artifact's own, and across artifacts it is the
 * order the read handed over, which the order case pins instead.
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
  EmptyWorkflowError,
  loadBuiltWorkflows,
  nodesMatching,
} from './workflow-dist.js';

// ---------------------------------------------------------------------------
// Fixture material
// ---------------------------------------------------------------------------

/**
 * The name an empty-tree fixture's dist path is built under, one level
 * inside a fixture root that already exists.
 *
 * Nested rather than used as the fixture root itself, because one of
 * the shapes a read has to refuse is a path that is not there at all.
 * A root the fixture helper created cannot be absent, so the state
 * those shapes vary has to be a child of it. The empty-workflow shapes
 * need the opposite — a directory that is there, holding an artifact —
 * so they are written into the fixture root itself.
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
 * The display name every fixture artifact carries.
 *
 * Shared rather than written per artifact, so the only thing parting
 * an empty-workflow shape from the artifact a read is expected to
 * hand back is the node list — which is the thing that refusal is
 * keyed on.
 */
const WORKFLOW_NAME = 'AR Fixture';

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
  { name: WORKFLOW_NAME, nodes: [FIXTURE_NODE] },
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
// A tree with several workflows in it
// ---------------------------------------------------------------------------

/** One artifact of the tree the order case reads. */
interface OrderedWorkflow {
  /**
   * Artifact name, and the whole of what the read sorts on.
   *
   * Named the way an artifact is and by nothing the roster reserves,
   * for the reason {@link WORKFLOW_FILE} is: a fixture borrowing a name
   * the built tree will one day carry reads as an assertion about that
   * workflow rather than about the reader.
   */
  readonly file: string;

  /**
   * The name of the one node it carries, distinct per artifact.
   *
   * There so the read is held against pairs rather than against a list
   * of file names. The file half comes off the directory listing and
   * this half comes out of the parse, so a pair ties each name the read
   * hands back to the artifact it was opened from; a case reading names
   * alone asserts only that the listing was sorted.
   */
  readonly node: string;
}

/**
 * The artifacts the order case writes, in the order it writes them —
 * which is not the order the read has to hand back.
 *
 * Out of order on purpose, and that is half of what makes the case
 * about sorting rather than about the filesystem. On a filesystem
 * listing in insertion order this IS what a read that dropped its sort
 * would return.
 *
 * Their case is the other half, and it is there because the first half
 * alone does not survive contact with this machine. `readdirSync` here
 * lists in byte order — measured, not assumed — and over names written
 * in one case that byte order IS the sorted answer, so a read handing
 * back its listing would be handed the answer for free and the case
 * would pass over a reader that never sorted at all.
 *
 * Base letters ordered one way and bytes the other is what keeps the
 * two apart. `ar-Beta` sorts after `ar-alpha` by letter and before it
 * by byte, and the letter half of that holds in every locale: a
 * difference of base letter is a primary difference in the root
 * collation each one inherits, where case is a weaker one that never
 * gets to overturn it. So the answer in {@link ORDERED_LABELS} is not
 * any listing order this file has been able to produce.
 *
 * What no fixture can decide is which order a filesystem lists in, and
 * one that lists in sorted order leaves the case unable to part a read
 * that sorts from one that does not. Nothing here asserts a listing
 * order, because the listing is not this code's to control — the two
 * halves are what make the fixture worth reading on the filesystems
 * that are.
 *
 * Several rather than two, because the answer a two-artifact tree has
 * to hand back is one of only two orders and half the ways of getting
 * there arrive at it by accident.
 */
const ORDERED_WORKFLOWS: readonly OrderedWorkflow[] = [
  { file: 'ar-echo.json', node: 'Echo Node' },
  { file: 'ar-Delta.json', node: 'Delta Node' },
  { file: 'ar-alpha.json', node: 'Alpha Node' },
  { file: 'ar-charlie.json', node: 'Charlie Node' },
  { file: 'ar-Beta.json', node: 'Beta Node' },
];

/**
 * What the read has to hand back, sorted by file name, written out by
 * hand.
 *
 * A literal rather than {@link ORDERED_WORKFLOWS} sorted inside the
 * assertion. Sorting the roster there would be the reader's own line
 * copied next to it, and a sort held against itself agrees whatever
 * either of them does.
 *
 * It is the reader's collating order and not a byte sort, which is the
 * one thing this list pins beyond the sorting itself: `ar-Beta.json`
 * sits after `ar-alpha.json` here and would sit in front of it under
 * `[].sort()` with no comparator. Deliberate — an order that reads the
 * same on every machine is what `loadBuiltWorkflows` documents its sort
 * as buying, and a swap of comparator is a change to that answer rather
 * than a refactor of it.
 */
const ORDERED_LABELS: readonly string[] = [
  'ar-alpha.json: Alpha Node',
  'ar-Beta.json: Beta Node',
  'ar-charlie.json: Charlie Node',
  'ar-Delta.json: Delta Node',
  'ar-echo.json: Echo Node',
];

/**
 * One roster entry as the order case reads an artifact back,
 * `<file>: <node name>`.
 *
 * Shaped like an {@link ORDERED_LABELS} entry so the drift guard can
 * hold the write order against the answer with neither derived from
 * the other.
 */
function orderedLabel(entry: OrderedWorkflow): string {
  return `${entry.file}: ${entry.node}`;
}

/**
 * That entry as a built workflow, written the way `buildAll` writes
 * one: two-space indentation and a trailing newline.
 *
 * Carries {@link WORKFLOW_NAME} and {@link FIXTURE_NODE}'s type the way
 * every other fixture artifact does, so the only thing parting one
 * artifact of this tree from another is the pair the case reads back.
 */
function orderedWorkflowJson(entry: OrderedWorkflow): string {
  return `${JSON.stringify(
    {
      name: WORKFLOW_NAME,
      nodes: [{ name: entry.node, type: FIXTURE_NODE.type }],
    },
    null,
    2,
  )}\n`;
}

/**
 * A fixture tree holding every {@link ORDERED_WORKFLOWS} artifact and
 * nothing else, written in roster order.
 *
 * Written into the fixture root itself, the way the empty-workflow
 * trees are: what this tree has to be is one a read gets all the way
 * through, so the directory has to be there and hold artifacts.
 */
function makeOrderedTree(): string {
  const distDir = makeFixtureDir();

  for (const entry of ORDERED_WORKFLOWS) {
    writeFileSync(join(distDir, entry.file), orderedWorkflowJson(entry));
  }

  return distDir;
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

/**
 * A dist path inside a fixture tree, in one of the
 * {@link EMPTY_DIST_SHAPES}.
 */
function makeEmptyDist(shape: EmptyDistShape): string {
  const distDir = join(makeFixtureDir(), DIST_NAME);

  shape.apply(distDir);

  return distDir;
}

// ---------------------------------------------------------------------------
// The shapes a built workflow holds nothing in
// ---------------------------------------------------------------------------

/** What an artifact holds where its node list belongs. */
type NodesMember =
  | 'a list with a node in it'
  | 'an empty list'
  | 'no list at all'
  | 'no members to read at all';

/**
 * What an artifact's own text holds where its nodes belong, total
 * over every artifact a shape can write.
 *
 * Total the way {@link pathState} is, and for the same reason: an
 * artifact that drifted into another shape's state has an answer of
 * its own to fail with rather than being read as a duplicate of
 * whatever it came to resemble.
 *
 * Read off the artifact's text and never off what the reader handed
 * back, because for every one of these shapes the reader hands back
 * nothing at all — the refusal is the whole of its answer, and it is
 * one refusal for all of them. A guard derived from something that
 * cannot tell the shapes apart would be the claim written twice.
 *
 * The parse is the artifact's own, not the reader's. Both walk the
 * same three questions in the same order, which is what makes the
 * labels line up with the branches; what stops that being circular is
 * that the labels are DECLARED per shape and this only reads them
 * back.
 */
function nodesMemberOf(json: string): NodesMember {
  const parsed: unknown = JSON.parse(json);

  if (typeof parsed !== 'object' || parsed === null) {
    return 'no members to read at all';
  }

  const member: unknown = (parsed as Record<string, unknown>)['nodes'];

  if (!Array.isArray(member)) {
    return 'no list at all';
  }

  const entries: readonly unknown[] = member;

  return entries.length === 0
    ? 'an empty list'
    : 'a list with a node in it';
}

/** One way a built workflow comes back carrying no node. */
interface EmptyWorkflowShape {
  /** Stable, and what the coverage guard reports a gap by. */
  readonly id: string;

  /**
   * Reads as the case name: `refuses a built workflow that <label>`.
   */
  readonly label: string;

  /**
   * What {@link nodesMemberOf} reports for
   * {@link EmptyWorkflowShape.json}.
   *
   * Declared rather than derived, so a shape whose JSON quietly
   * stopped being what it says has something to fail against. All
   * three reach one refusal through different branches of the same
   * read, and the refusal carries a file name and a directory and
   * nothing about which branch caught it — so what the artifact holds
   * is asserted where it is written rather than inferred from what
   * came back.
   */
  readonly holds: NodesMember;

  /**
   * The artifact's whole text, written the way `buildAll` writes one:
   * two-space indentation and a trailing newline.
   *
   * Carries {@link WORKFLOW_NAME} wherever it carries an envelope at
   * all, so what parts it from the artifact the accepted tree holds
   * is the node list and nothing else.
   */
  readonly json: string;
}

const EMPTY_WORKFLOW_SHAPES: readonly EmptyWorkflowShape[] = [
  // The list is there and holds nothing, which is what a source
  // written as a stub leaves: an envelope, a display name, and the
  // nodes still to come. It is the shape every absence check over the
  // built tree passes on, having asked its question of a list with
  // nothing in it.
  {
    id: 'nodes-empty',
    label: 'carries an empty node list',
    holds: 'an empty list',
    json: `${JSON.stringify({ name: WORKFLOW_NAME, nodes: [] }, null, 2)}\n`,
  },
  // No `nodes` member at all, which is what a source hand-written
  // from the envelope out leaves before the list is added. Split from
  // the shape above because the read reaches the refusal by a
  // different branch — there is nothing to measure the length of —
  // and a read that stopped checking one goes on passing the other.
  {
    id: 'nodes-absent',
    label: 'carries no node list at all',
    holds: 'no list at all',
    json: `${JSON.stringify({ name: WORKFLOW_NAME }, null, 2)}\n`,
  },
  // Parses, and to something no member can be read off. `buildAll`
  // cannot write this one — it serializes what marker resolution
  // handed it, and that is an object — so this is the truncated
  // write, the hand-edit, the file restored from the wrong place.
  // It is here because it is the third branch: without the guard in
  // front of the member read it is a `TypeError` out of the middle of
  // the read rather than a refusal naming the artifact, and the two
  // are one line apart.
  {
    id: 'not-an-object',
    label: 'parses to something with no members at all',
    holds: 'no members to read at all',
    json: 'null\n',
  },
];

/** Where a shape's artifact was written, and under what name. */
interface EmptyWorkflowTree {
  /** The directory handed to the read. */
  readonly distDir: string;

  /** The artifact's name inside it. */
  readonly file: string;
}

/**
 * A fixture tree holding that shape's artifact and nothing else.
 *
 * Written into the fixture root itself rather than under
 * {@link DIST_NAME}, because a tree that yields no artifact is
 * refused one level up: reaching this refusal at all takes a
 * directory that is there and holds a `*.json`.
 *
 * Named per shape rather than from one shared constant, so the file
 * half of what the refusal reports is a value the fixture supplied
 * for this shape and a refusal answering with a fixed name fails.
 */
function makeEmptyWorkflowTree(shape: EmptyWorkflowShape): EmptyWorkflowTree {
  const distDir = makeFixtureDir();
  const file = `ar-${shape.id}.json`;

  writeFileSync(join(distDir, file), shape.json);

  return { distDir, file };
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
 * Ids of the {@link EMPTY_DIST_SHAPES} whose case ran, added as each
 * one does.
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
const EXERCISED_DIST_IDS = new Set<string>();

/**
 * The artifact {@link loadBuiltWorkflows} refused and the tree it was
 * read from, as `<file> in <directory>`, or {@link NOT_REFUSED} when
 * it read the fixture through.
 *
 * Only {@link EmptyWorkflowError} counts as a refusal, and anything
 * else is rethrown — {@link EmptyDistDirectoryError} most of all. A
 * tree whose one artifact holds no node is one `readdirSync` filter
 * away from a tree that yields no artifact, so a helper taking either
 * would let a read that had stopped opening files pass every case in
 * that section while reporting the wrong edit.
 *
 * Both named members in one answer rather than one apiece. They are
 * one fact to a reader — which artifact, in which tree — and a case
 * asserting the pair prints both on the way past, where two cases
 * would report the file and leave the directory to a second run.
 */
function refusedWorkflow(directory: string): string {
  try {
    loadBuiltWorkflows(directory);
  } catch (thrown) {
    if (thrown instanceof EmptyWorkflowError) {
      return `${thrown.file} in ${thrown.directory}`;
    }

    throw thrown;
  }

  return NOT_REFUSED;
}

/**
 * Ids of the {@link EMPTY_WORKFLOW_SHAPES} whose case ran, added as
 * each one does.
 *
 * A second set rather than one shared with
 * {@link EXERCISED_DIST_IDS}, because each is held against a roster of
 * its own: pooled, a shape missing from one roster would be covered by
 * an id the other supplied. Everything {@link EXERCISED_DIST_IDS} says
 * about recording from inside the case, recording before the
 * assertion, and being a set holds here unchanged.
 */
const EXERCISED_WORKFLOW_IDS = new Set<string>();

// ---------------------------------------------------------------------------
// A tree with workflows in it
// ---------------------------------------------------------------------------

describe('loadBuiltWorkflows — a tree with workflows in it', () => {
  // The control both refusal sections rest on, and the only case in
  // this file written to tell a read refusing what it should from one
  // refusing whatever it is handed. Every case about a refusal is
  // satisfied by a reader that throws unconditionally; this is what is
  // not. Other cases read a populated tree too and redden alongside it
  // — measured, the sort case and the walk's two — but none of them is
  // a near miss of anything refused, so none says which refusal it was
  // that stopped working.
  //
  // It is a near miss of the shapes it stands behind rather than any
  // healthy tree, and it is one for each section by a different
  // margin. The directory holds the non-`.json` file the `not-json`
  // shape holds and one artifact besides, so what parts this tree from
  // that one is the extension on a single file. The artifact carries
  // the display name every empty-workflow shape carries and one node,
  // so what parts it from `nodes-empty` is that node. Each margin is
  // the thing its refusal is keyed on, and between them they are all
  // the control is allowed to be about.
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

  // Half of what the order case takes on trust — the half a filesystem
  // listing in insertion order runs into. Writing the artifacts out of
  // order is what parts a read that sorts from one handing back the
  // listing it was given there, so a roster whose write order had
  // drifted onto the answer would leave the two indistinguishable on
  // those machines while printing a tick.
  //
  // The other half is the naming, and it is not asserted anywhere: what
  // makes `ar-Beta.json` sort after `ar-alpha.json` and list before it
  // is a collation this file does not own. It is checked by mutation
  // instead — dropping the reader's sort reddens the case below — which
  // is the tool for a claim about an environment rather than about a
  // value.
  //
  // Both halves in one case because they are one fact: the same
  // artifacts, in a different order. Held as multisets first, so a
  // roster that lost an entry or gained one fails here rather than in
  // the case reading the tree, where it would read as the sort having
  // gone wrong.
  it('writes those artifacts in an order that is not the answer', () => {
    const written = ORDERED_WORKFLOWS.map((entry) => orderedLabel(entry));

    expect([...written].sort()).toEqual([...ORDERED_LABELS].sort());
    expect(written).not.toEqual(ORDERED_LABELS);
  });

  // The order the read hands back, which is the order every report
  // built on it prints in: `nodesMatching` lists offenders in it, and
  // the roster case arriving later in this plan holds its expectations
  // against it. `readdirSync` answers in directory order — stable on
  // one machine, arbitrary across them — so a read passing that through
  // would print one tree two ways on two machines, and no expectation
  // could be written down at all.
  //
  // Asserted as `<file>: <node name>` pairs rather than as file names,
  // so what comes back is tied to what was opened: the file half is the
  // directory listing and the node half is the parse, and a list of
  // names alone would be answered by a read that sorted a listing
  // without opening anything under it.
  it('hands back several artifacts sorted by file name', () => {
    const distDir = makeOrderedTree();

    const read = loadBuiltWorkflows(distDir).map((workflow) => {
      const names = workflow.nodes.map((node) => node.name).join(', ');

      return `${workflow.file}: ${names}`;
    });

    expect(read).toEqual(ORDERED_LABELS);
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
      EXERCISED_DIST_IDS.add(shape.id);

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
    const exercised = [...EXERCISED_DIST_IDS].sort();
    const declared = EMPTY_DIST_SHAPES.map((shape) => shape.id).sort();

    expect(exercised).toEqual(declared);
  });
});

// ---------------------------------------------------------------------------
// A built workflow holding nothing to read
// ---------------------------------------------------------------------------

describe('loadBuiltWorkflows — a built workflow with no node in it', () => {
  // In front of the loop rather than left to it, for the reason the
  // same case gives one section up: a roster that came back empty
  // generates no case at all, and a describe block with nothing in it
  // is the whole refusal going quiet.
  it('declares at least one shape to drive', () => {
    expect(EMPTY_WORKFLOW_SHAPES.length).toBeGreaterThan(0);
  });

  // What every case that follows takes on trust. All three shapes
  // reach one refusal by three branches of one read, and the refusal
  // reports a file and a directory and nothing about which branch
  // caught it — so a roster that had collapsed onto one state would
  // read as full coverage and print three ticks.
  //
  // The accepted artifact is the fourth entry because the section's
  // split rests on it: the case reading it, one section up, is the
  // only thing parting these refusals from a read that refuses
  // whatever it is handed, and it is worth exactly as much as its
  // artifact holding a node. That case cannot report the drift
  // itself. A diff that emptied the artifact and rewrote the case to
  // expect a refusal leaves it green, the three refusal cases in this
  // section green, and nothing anywhere saying the accept control has
  // stopped being one — except this entry, which still declares a
  // node.
  //
  // Read off each artifact's text rather than off the refusal, and
  // asserted as `<id>: <state>` pairs so the diff names the artifact
  // that drifted rather than reporting that two lists differ.
  it('holds what each shape declares, a node in the accepted one', () => {
    const observed = [
      ...EMPTY_WORKFLOW_SHAPES.map(
        (shape) => `${shape.id}: ${nodesMemberOf(shape.json)}`,
      ),
      `the accepted artifact: ${nodesMemberOf(WORKFLOW_JSON)}`,
    ];
    const declared = [
      ...EMPTY_WORKFLOW_SHAPES.map((shape) => `${shape.id}: ${shape.holds}`),
      'the accepted artifact: a list with a node in it',
    ];

    expect(observed).toEqual(declared);
  });

  for (const shape of EMPTY_WORKFLOW_SHAPES) {
    // Asserted on the artifact and the tree the refusal carries rather
    // than on the fact that something was thrown. The message sends a
    // reader to a source file under `workflows/src/` and tells them to
    // put a node in it, and one naming the wrong artifact sends them
    // to a file that has one. Both halves are values this shape's
    // fixture supplied: the name was derived from the shape's own id
    // and the directory was made for this case alone, so neither is
    // one the reader could have answered with without having read the
    // tree it was handed.
    //
    // The class is pinned by the helper, which rethrows everything
    // else. `EmptyWorkflowError` is what says the read got as far as
    // parsing an artifact and found nothing in it worth asserting
    // over; `EmptyDistDirectoryError` says it never had an artifact,
    // and a `SyntaxError` says the file is not one. The three want
    // three different edits, so an assertion taking any of them would
    // not be saying which.
    it(`refuses a built workflow that ${shape.label}`, () => {
      EXERCISED_WORKFLOW_IDS.add(shape.id);

      const { distDir, file } = makeEmptyWorkflowTree(shape);

      expect(refusedWorkflow(distDir)).toBe(`${file} in ${distDir}`);
    });
  }

  // Last in the block for the reason the same case is one section up:
  // the set is read at run time, so every case that writes to it has
  // to have run first. What it is here for is the same drift — a sweep
  // narrowed away from the roster goes on passing over whatever is
  // left, and a shape added after that has no case at all.
  //
  // Held against this section's own roster, and its own set. A single
  // pooled set would let a shape missing a case here be answered by an
  // id the other section supplied, which is the failure this whole
  // case exists to report.
  it('runs a case for every shape the roster declares', () => {
    const exercised = [...EXERCISED_WORKFLOW_IDS].sort();
    const declared = EMPTY_WORKFLOW_SHAPES.map((shape) => shape.id).sort();

    expect(exercised).toEqual(declared);
  });
});

// ---------------------------------------------------------------------------
// A tree with offending nodes across it
// ---------------------------------------------------------------------------

/**
 * The node type the walk's cases collect on.
 *
 * A fixture type rather than one the node rosters name, for the
 * reason {@link WORKFLOW_FILE} carries a fixture name. `nodesMatching`
 * reads no type at all — the predicate is the caller's — so a real
 * send-capable type here would read as an assertion about
 * `SEND_NODE_TYPES`, which now lives in `workflow-rosters.ts` and
 * keys on this same member.
 */
const OFFENDING_TYPE = 'ar-fixture.offending';

/** Whether a node of this type is one the walk's cases collect. */
function isOffendingType(type: string): boolean {
  return type === OFFENDING_TYPE;
}

/** One node of an artifact in the tree the walk's cases read. */
interface OffenderNode {
  /**
   * Distinct across the whole tree, so a label names one node and an
   * answer held against a literal cannot be satisfied by the wrong
   * one.
   */
  readonly name: string;

  /**
   * {@link OFFENDING_TYPE} for a node the predicate collects, and
   * {@link FIXTURE_NODE}'s type for one it passes over.
   */
  readonly type: string;
}

/** One artifact of that tree. */
interface OffenderWorkflow {
  /**
   * Artifact name, and the half of a label that says which source to
   * open.
   *
   * Named the way an artifact is and by nothing the roster reserves,
   * for the reason {@link WORKFLOW_FILE} is.
   */
  readonly file: string;

  /** Its nodes, in the order the artifact carries them. */
  readonly nodes: readonly OffenderNode[];
}

/**
 * The tree the walk's cases read.
 *
 * A collector's fixture has more to carry than one offender in one
 * artifact, and that obvious tree parts none of what is worth
 * parting: a walk stopping at the first match inside an artifact, one
 * stopping at the first artifact that had a match, and one taking a
 * slice off the front where a filter belongs all hand back the same
 * answer over it. Each is a distinct way of naming one offender and
 * calling the rest of the tree clean, and each needs a shape of its
 * own to show up in. {@link OFFENDER_AXES} is the list of them,
 * asserted rather than left to the reading of this roster.
 */
const OFFENDER_WORKFLOWS: readonly OffenderWorkflow[] = [
  // Two offenders with a node the predicate passes over between them.
  // The pair is what parts every offender in an artifact from the
  // first one, and the node between them is what parts a filter from
  // a slice taken off the front.
  {
    file: 'ar-first.json',
    nodes: [
      { name: 'Alpha Offender', type: OFFENDING_TYPE },
      { name: 'Quiet Node', type: FIXTURE_NODE.type },
      { name: 'Beta Offender', type: OFFENDING_TYPE },
    ],
  },
  // Nothing to collect, and sorted between the two artifacts that
  // have something. A walk that gave up on the first artifact
  // yielding nothing would hand back what the artifact in front of
  // this one held and call the one after it clean.
  {
    file: 'ar-second.json',
    nodes: [{ name: 'Idle Node', type: FIXTURE_NODE.type }],
  },
  // The offender in a second artifact, which is what parts every
  // artifact from the first one that had a match in it.
  {
    file: 'ar-third.json',
    nodes: [{ name: 'Gamma Offender', type: OFFENDING_TYPE }],
  },
];

/**
 * What the walk has to name over that tree, written out by hand.
 *
 * A literal rather than {@link OFFENDER_WORKFLOWS} filtered inside
 * the assertion, for the reason {@link ORDERED_LABELS} is one: a
 * filter held against itself agrees whatever either of them does, and
 * a filter is the thing under test.
 *
 * `<file>:<node name>`, with nothing between the halves — the walk's
 * own form, which is not {@link orderedLabel}'s. That helper reads an
 * artifact back for a case of this file's own and spaces the two; this
 * list is what `nodesMatching` returns, so it is spelled the way the
 * walk spells it.
 *
 * Three of the tree's five nodes, which is the other thing it pins. A
 * walk handing back everything it was given answers with five, and one
 * that never called the predicate answers with none.
 */
const OFFENDER_LABELS: readonly string[] = [
  'ar-first.json:Alpha Offender',
  'ar-first.json:Beta Offender',
  'ar-third.json:Gamma Offender',
];

/** Every node of an artifact the predicate collects. */
function offendersOf(workflow: OffenderWorkflow): readonly OffenderNode[] {
  return workflow.nodes.filter((node) => isOffendingType(node.type));
}

/**
 * Whether something passed over sits between two things collected, in
 * the order given.
 *
 * Asked at both levels a slice can be taken at — over an artifact's
 * nodes, and over the tree's artifacts — so the two axes reading it
 * cannot drift into asking different questions.
 */
function passedOverBetween(collected: readonly boolean[]): boolean {
  const first = collected.indexOf(true);
  const last = collected.lastIndexOf(true);

  return first !== -1 && collected.slice(first + 1, last).includes(false);
}

/**
 * One distinction the tree draws, without which a claim over it would
 * be about less than it reads as.
 */
interface OffenderAxis {
  /** Stable, and what the fixture guard reports a gap by. */
  readonly id: string;

  /** Whether {@link OFFENDER_WORKFLOWS} still draws it. */
  readonly holds: (workflows: readonly OffenderWorkflow[]) => boolean;
}

const OFFENDER_AXES: readonly OffenderAxis[] = [
  // Without it, every offender in an artifact and the first one in it
  // are the same answer.
  {
    id: 'two-in-one-artifact',
    holds: (workflows) => workflows.some(
      (workflow) => offendersOf(workflow).length > 1,
    ),
  },
  // Without it, every artifact and the first artifact with a match in
  // it are the same answer.
  {
    id: 'two-artifacts-with-one',
    holds: (workflows) => workflows
      .filter((workflow) => offendersOf(workflow).length > 0)
      .length > 1,
  },
  // Without it, a filter over an artifact's nodes and a slice off the
  // front of them are the same answer.
  {
    id: 'passed-over-between-nodes',
    holds: (workflows) => workflows.some(
      (workflow) => passedOverBetween(
        workflow.nodes.map((node) => isOffendingType(node.type)),
      ),
    ),
  },
  // The same distinction one level up: without it, a walk that gave up
  // on the first artifact holding nothing answers the same as one that
  // read them all.
  {
    id: 'passed-over-between-artifacts',
    holds: (workflows) => passedOverBetween(
      workflows.map((workflow) => offendersOf(workflow).length > 0),
    ),
  },
];

/**
 * That artifact's whole text, written the way `buildAll` writes one:
 * two-space indentation and a trailing newline.
 *
 * Carries {@link WORKFLOW_NAME} the way every other fixture artifact
 * does, so the only thing parting one artifact of this tree from
 * another is its nodes.
 */
function offenderWorkflowJson(entry: OffenderWorkflow): string {
  return `${JSON.stringify(
    { name: WORKFLOW_NAME, nodes: entry.nodes },
    null,
    2,
  )}\n`;
}

/**
 * A fixture tree holding every {@link OFFENDER_WORKFLOWS} artifact and
 * nothing else, written in roster order.
 *
 * Roster order is also the order the read sorts them into, which is
 * deliberate and is the limit stated with the claim: the half of the
 * walk's order that runs across artifacts is the read's doing, pinned
 * by the sort case, and this tree is not written to test it twice.
 */
function makeOffenderTree(): string {
  const distDir = makeFixtureDir();

  for (const entry of OFFENDER_WORKFLOWS) {
    writeFileSync(join(distDir, entry.file), offenderWorkflowJson(entry));
  }

  return distDir;
}

// ---------------------------------------------------------------------------
// Every offending node across a tree
// ---------------------------------------------------------------------------

describe('nodesMatching — every offender across a tree', () => {
  // What the claim after it takes on trust, and the whole of what
  // makes that a claim about collecting rather than about matching.
  // Every way of naming one offender and calling the rest of the tree
  // clean is invisible over a tree with one offender in it, so a
  // roster that drifted onto that shape would print a tick over a walk
  // that stops at the first thing it finds.
  //
  // In front of the claim rather than after it, for the reason the
  // same guard sits in front of each refusal loop: what is worth
  // failing on first is the input. Held as ids, so a distinction the
  // tree stopped drawing is named rather than counted.
  //
  // The order the read hands the artifacts over is asserted with
  // them, because two of the axes are about what sits between what
  // and the roster is read in the order it is DECLARED in. The walk
  // sees the order the read chose, so a rename that moved the clean
  // artifact to one end would leave those axes answering about a
  // sequence nothing is ever handed — measured: renaming it reddens
  // nothing without this. It ties the roster to the tree rather than
  // asserting the sort, which the order case owns.
  it('drives a tree drawing every distinction the claim needs', () => {
    const drawn = OFFENDER_AXES
      .filter((axis) => axis.holds(OFFENDER_WORKFLOWS))
      .map((axis) => axis.id);

    expect(drawn).toEqual(OFFENDER_AXES.map((axis) => axis.id));

    const read = loadBuiltWorkflows(makeOffenderTree());

    expect(read.map((workflow) => workflow.file))
      .toEqual(OFFENDER_WORKFLOWS.map((entry) => entry.file));
  });

  // What a failing absence check over the built tree prints. A report
  // naming one offender turns one edit into as many runs as there are
  // offenders, each finding the next, so the walk has to reach past
  // the first match inside an artifact and past the first artifact
  // that had one.
  //
  // Held against a literal, so what came back is compared with what
  // the tree was written to hold rather than with the tree filtered a
  // second time.
  //
  // Read through `loadBuiltWorkflows` rather than assembled here.
  // `BuiltWorkflow` is declared in a module `tsc` reads and a
  // `*.test.ts` is not one, so nodes planted by hand are checked by
  // nothing; read off disk they are the reader's own, and what the
  // walk is asked about is the shape it is actually handed.
  //
  // The order it prints in is two halves and only one of them belongs
  // to this case. Inside an artifact the order is the artifact's, and
  // `Alpha Offender` before `Beta Offender` is asserted here. Across
  // artifacts it is the order the read handed over, which the sort
  // case pins instead — this tree is written in the order it sorts
  // into, so nothing here would notice a read that stopped sorting.
  it('names every offending node in every artifact', () => {
    const read = loadBuiltWorkflows(makeOffenderTree());

    const offenders = nodesMatching(
      read,
      (node) => isOffendingType(node.type),
    );

    expect(offenders).toEqual(OFFENDER_LABELS);
  });
});
