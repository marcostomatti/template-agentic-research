/**
 * The statements the research pool is filled and emptied by, held
 * to the roster next door, over the tree this package actually
 * builds.
 *
 * `pool-sql.ts` says which property belongs to which node of which
 * workflow and what a statement carrying it has to say, and
 * `workflow-dist.ts` says what a built workflow is and refuses a
 * tree there is nothing to read in. This is where the two meet
 * `workflows/dist/`, which `pretest` rebuilds for the `test`
 * script, so a default run reads a tree a real bun process wrote.
 *
 * THE VERDICT IS A ZERO, and that decides the shape of everything
 * here. Twenty two entries over thirty three fragments hold
 * against six statements in three workflows, and what a passing
 * run reads is an empty list of offenders. An empty list is also
 * what a roster emptied of its entries answers, what a walk
 * narrowed away from the roster answers, and what a reading handed
 * a tree with nothing in it answers. So the zero is surrounded
 * rather than asserted.
 *
 * THE PLANT RIDES IN THE SAME ANSWER, which is the first of those
 * guards and the one the others cannot stand in for. An entry
 * carrying a real entry's workflow and a real entry's fragment,
 * pointed at a node name no canvas carries, is walked beside the
 * twenty two and the answer is asserted to be its label and
 * nothing besides. One answer carrying the roster's zero and the
 * plant's label is the shape in which that zero cannot be a
 * reading which never ran: a walk that stopped looking reports
 * neither of them.
 *
 * FOUR SHAPES OF LABEL, and they are four different edits rather
 * than four spellings of one. A workflow id nothing under
 * `workflows/dist/` answers to, a node name no canvas carries, a
 * node that carries no statement at all — a sticky note, a merge
 * — and a fragment a statement stopped carrying. Only the last is
 * about the pipeline. The other three are the roster having come
 * apart from the tree, and a must-find roster answering any of
 * them quietly would be a roster passing by finding nothing. Each
 * is driven on a plant of its own, and each label is written out
 * here rather than built from the constants the reading builds its
 * own from, so the two are two spellings of one sentence rather
 * than one compared against itself.
 *
 * THE WORKFLOW IS HALF OF THE KEY, and the measurement saying so
 * is in this file. Both raisers carry a node called
 * `Raise Research Intentions`, which is why an entry names its
 * artifact as well as its node — and also why swapping an entry
 * onto the sibling raiser is a WEAK control: eight of the eleven
 * entries over those two nodes hold against either workflow, the
 * properties genuinely being shared. Three move, and the case at
 * the foot of this file is what names them.
 *
 * THE GRID THAT SAYS THESE NINE CASES CAN FAIL, six legs over
 * `pool-sql.ts` taken from a `/tmp` hold and each run with
 * `bun x vitest run` on this file alone — which runs no `pretest`,
 * so every leg read the same artifacts a clean build had written.
 * Every case is reddened by at least one of them, and four of the
 * fifteen pairs of legs overlap at all.
 *
 * Emptying `POOL_SQL_RULES` reds 4 of 9 and NOT the walk, which is
 * the vacuity the coverage case exists for, said as a measurement:
 * the plant goes on reporting, so the walk's answer is unchanged
 * while every property the roster carried has stopped being
 * checked. Answering an empty list where an absent node would be
 * named reds 2, the walk and the plant's own case. Looking a node
 * up by name across every workflow rather than inside the one the
 * entry names reds 2, the absent-workflow case and the case at the
 * foot of this file, and nothing besides — which is what says the
 * artifact member is read. Answering an empty list where a node
 * runs no SQL reds 1, and dropping both refusals over an entry
 * that cannot fail reds 1. A `carries` that answers true for
 * everything reds 2, the fragment plant and the foot of the file,
 * that last one because a swapped entry then holds against either
 * raiser and no entry is left to name.
 *
 * Those four pairs are two CASES rather than four independent
 * ones: the plant's own case, shared by the first two legs, and
 * the workflow-half case, shared by the first, the third and the
 * sixth, which is three pairs on its own. Each is a case more than
 * one edit can take out rather than a leg that failed to
 * discriminate. The six splits were re-driven when the two stamp
 * entries were rostered, and every one of them held: 4, 2, 2, 1, 1
 * and 2 before the widening and after. A further widening asks for
 * the same.
 *
 * WHAT IS NOT COVERED HERE, each named so a later widening is a
 * decision rather than a discovery. A fragment reaches words and
 * never a shape, so an entry naming a timestamp and a window is
 * satisfied whichever way round the comparison between them was
 * written; `tests/live/research-interval.live.test.ts` and
 * `tests/live/schedule-ratchet.live.test.ts` are where that half
 * is answered and neither stands in for the other. A node left
 * disabled is read exactly as an enabled one is, which
 * `queryParametersOf` states as its own limit. And every property
 * here is read off the `query` parameter a node carries rather
 * than off the artifact's text, these statements arguing their own
 * decisions in prose that runs to most of their characters —
 * `sqlWords` is what drops it, and the roster records which three
 * of its thirty three fragments a comment would otherwise carry.
 */
import type { PoolSqlRule } from './pool-sql.js';

import { describe, expect, it } from 'vitest';

import { POOL_SQL_RULES, unsatisfiedPoolRequirements } from './pool-sql.js';
import { loadBuiltWorkflows } from './workflow-dist.js';

// -----------------------------------------------------------------
// The tree the roster is read over
// -----------------------------------------------------------------

/**
 * Every built workflow, read once for the whole file.
 *
 * At module scope for the reason `dispatch-sql.test.ts` reads its
 * own there: a read that comes back with nothing to assert over
 * throws, and that failure belongs to the file rather than to one
 * case. No directory is named, so this is the tree this package
 * builds, and the refusals over trees a caller controls are driven
 * in `workflow-dist.test.ts`, which is what keeps them reachable
 * while this one is healthy.
 *
 * The whole tree and not one workflow, which is the difference
 * between this file and its neighbour: an entry here names its own
 * artifact, so resolving it is the reading's job and the answer
 * every case reads is the answer over the tree entire.
 */
const BUILT_WORKFLOWS = loadBuiltWorkflows();

/**
 * The statement each entry of the roster is read off, as
 * `<workflow>:<node>`.
 *
 * Written out rather than derived from the roster, which is the
 * whole of what it is worth: a list read off the same table the
 * walk goes through agrees with that table however it was narrowed,
 * a roster whose twenty two entries had all come to point at one
 * node included. That narrowing is invisible to the coverage case
 * behind the walk — twenty two ids reached is twenty two ids
 * reached wherever they looked — and this is the reading that
 * reports it.
 *
 * Six, and the three workflows are not interchangeable: the pool is
 * filled by two raisers, emptied by one drain, and accounted for by
 * the row each of those three passes closes.
 */
const POOL_STATEMENTS: readonly string[] = [
  'ar-ingest:Raise Research Intentions',
  'ar-ingest:Close Run',
  'ar-score:Raise Research Intentions',
  'ar-score:Close Score Run',
  'ar-research:Drain Approved Intentions',
  'ar-research:Close Research Run',
];

// -----------------------------------------------------------------
// What a run of the roster reached
// -----------------------------------------------------------------

/**
 * Ids of the entries the walk reached, added as it reaches each.
 *
 * Recorded from inside the walk rather than read off the roster the
 * walk was written over, which is the whole of the difference. Read
 * off the roster, the case behind it would be the table held
 * against itself: it would answer the same for a walk narrowed away
 * from the roster — a slice, a filter, a hand-written list of ids —
 * and the same again for one that never ran at all.
 *
 * It carries the plant's id as well as the roster's, the plant
 * being walked in the same list, and the case reading it says so.
 * Splitting the two would mean asking inside the walk which of them
 * a rule came from, and that question is a second copy of the
 * roster written in a condition.
 *
 * A set rather than a list, so an id two entries share arrives here
 * once and fails against a roster that declares it twice. Nothing
 * else holds these ids apart, `PoolSqlRule.id` saying of itself
 * that distinctness across the roster is convention.
 */
const REACHED_RULE_IDS = new Set<string>();

// -----------------------------------------------------------------
// The plants, one per shape of label
// -----------------------------------------------------------------

/**
 * The rostered entry every plant below is built off, by id.
 *
 * One real entry shadowed four times rather than four inventions,
 * so what makes a plant fail is the one member it moved. A plant
 * built from nothing would fail for whatever reason it happened to
 * have, and the label it came back with would say which reason
 * rather than which member.
 */
const SHADOWED_RULE_ID = 'pool-ingest-one-intention-per-finding';

/** The workflow that entry names, and every plant with it. */
const SHADOWED_WORKFLOW_ID = 'ar-ingest';

/** The artifact that workflow id resolves to, as a label has it. */
const SHADOWED_ARTIFACT = 'ar-ingest.json';

/** The node that entry names, on the canvas of that workflow. */
const SHADOWED_NODE_NAME = 'Raise Research Intentions';

/**
 * The fragment that entry requires, spelled as the roster has it.
 *
 * Carried by the statement the shadowed entry names, so a plant
 * keeping it is a plant whose fragment is not what failed. Held
 * against the roster's own copy by the case that drives the node
 * plant, the two being written out separately here and there.
 */
const SHADOWED_REQUIRES = [
  'FROM research_pool p WHERE p.finding_id = s.id',
];

/**
 * A node name the canvas carries no node under.
 *
 * One word longer than {@link SHADOWED_NODE_NAME} and beginning
 * with it, which is the near miss worth planting rather than a
 * comfortable distance from it: a reading that matched a node name
 * as a prefix, or as text found anywhere in the artifact, would
 * resolve this to the real raiser and report nothing at all.
 */
const ABSENT_NODE_NAME = 'Raise Research Intentions Twice';

/**
 * The plant the walk over the roster carries, and the control the
 * roster's own zero rests on.
 *
 * Four of its five members are the shadowed entry's. Its id says
 * what it is in any output it reaches, and its node name is the one
 * thing about it that is not true of this tree.
 */
const ABSENT_NODE_PLANT: PoolSqlRule = {
  id: 'planted-absent-node',
  property:
    'Planted. Names a node the canvas does not carry, so the ' +
    'walk over the roster has one entry it must report and the ' +
    'zero the other twenty two answer is a reading rather than a ' +
    'list nobody looked at.',
  workflowId: SHADOWED_WORKFLOW_ID,
  nodeName: ABSENT_NODE_NAME,
  requires: SHADOWED_REQUIRES,
};

/**
 * The label {@link ABSENT_NODE_PLANT} has to come back with.
 *
 * Written out rather than built from the constants above, so the
 * label and the text it has to equal are two spellings of one
 * sentence. Built from them, an assertion would hold through a
 * reading that had stopped naming the artifact, the node or the
 * entry, and the failure a must-find roster exists to report is
 * exactly the one whose whole content is its label.
 */
const ABSENT_NODE_LABEL =
  'planted-absent-node: ar-ingest.json has no node named ' +
  'Raise Research Intentions Twice';

/** A workflow id nothing under `workflows/dist/` answers to. */
const ABSENT_WORKFLOW_ID = 'ar-nonesuch';

/**
 * The plant for an entry naming a workflow that is gone.
 *
 * The shape a roster spanning three artifacts can fail in and its
 * neighbour cannot, `DISPATCH_SQL_RULES` being scoped to one
 * workflow named beside it rather than inside each entry.
 */
const ABSENT_WORKFLOW_PLANT: PoolSqlRule = {
  id: 'planted-absent-workflow',
  property:
    'Planted. Names a workflow no artifact answers to, which is ' +
    'the shape an entry fails in when a source is renamed or a ' +
    'build writes a tree that no longer holds it.',
  workflowId: ABSENT_WORKFLOW_ID,
  nodeName: SHADOWED_NODE_NAME,
  requires: SHADOWED_REQUIRES,
};

/** The label {@link ABSENT_WORKFLOW_PLANT} comes back with. */
const ABSENT_WORKFLOW_LABEL =
  'planted-absent-workflow: no built workflow named ar-nonesuch.json';

/**
 * A node the canvas does carry and which runs no statement.
 *
 * A sticky note on the raising workflow, so the plant naming it is
 * an entry pointed at the wrong node rather than at no node: the
 * reading has something to find and still has to answer that there
 * is no SQL in it. Asserted to be on that canvas by the case that
 * drives it, since a note renamed out from under this would leave
 * the plant failing for the shape above instead.
 */
const SILENT_NODE_NAME = 'Invoked Never Scheduled';

/** The plant for an entry naming a node that runs no SQL. */
const SILENT_NODE_PLANT: PoolSqlRule = {
  id: 'planted-silent-node',
  property:
    'Planted. Names a node that carries no statement, which is ' +
    'the shape an entry fails in when it is pointed at a note or ' +
    'a merge rather than at the node that runs the SQL.',
  workflowId: SHADOWED_WORKFLOW_ID,
  nodeName: SILENT_NODE_NAME,
  requires: SHADOWED_REQUIRES,
};

/** The label {@link SILENT_NODE_PLANT} has to come back with. */
const SILENT_NODE_LABEL =
  'planted-silent-node: Invoked Never Scheduled in ar-ingest.json ' +
  'runs no SQL';

/**
 * A fragment the raising statement does not carry.
 *
 * One column away from `p.researched_at IS NULL`, which the drain
 * does carry, so the plant is a phrase of this pipeline's own
 * vocabulary rather than a string nothing anywhere resembles.
 */
const ABSENT_FRAGMENT = 'p.abandoned_at IS NOT NULL';

/** The plant for a statement that dropped what it has to carry. */
const ABSENT_FRAGMENT_PLANT: PoolSqlRule = {
  id: 'planted-absent-fragment',
  property:
    'Planted. Requires a phrase the statement does not run, which ' +
    'is the one shape of failure about the pipeline rather than ' +
    'about the roster.',
  workflowId: SHADOWED_WORKFLOW_ID,
  nodeName: SHADOWED_NODE_NAME,
  requires: [ABSENT_FRAGMENT],
};

/**
 * The label {@link ABSENT_FRAGMENT_PLANT} has to come back with.
 *
 * The fragment arrives in it REDUCED — `sqlWords` drops the dot
 * along with every other thing a word cannot hold — so the label
 * spells the words and not the column. Which is worth pinning here
 * rather than leaving to be discovered by whoever next reads a
 * failure and looks for a column that is not in it.
 */
const ABSENT_FRAGMENT_LABEL =
  'planted-absent-fragment: Raise Research Intentions in ' +
  'ar-ingest.json runs no SQL carrying p abandoned_at is not null';

// -----------------------------------------------------------------
// The roster over the built tree
// -----------------------------------------------------------------

describe('research pool invariants — the roster', () => {
  // Every entry held against the node of the workflow it names,
  // with the plant walked in the same list and its label the whole
  // of what the answer is allowed to be.
  //
  // Read off the `query` parameter each named node carries and
  // never off the artifact's text, which is what makes a claim
  // about a statement a claim about the node that runs it.
  // `sqlWords` drops the `--` prose out of that parameter before
  // anything is matched in it, which these statements need rather
  // more than a general caution about comments would suggest: they
  // run to between seven tenths and nine tenths comment by
  // character, this port arguing its decisions inside the SQL that
  // carries them. Three of the thirty three fragments are carried
  // by their own node's prose as well, measured and recorded on
  // the roster; none of the twenty two entries is wholly
  // satisfiable that way.
  //
  // Held against a written list rather than counted, because the
  // answer is already the report. Every miss is labelled
  // `<id>: <what>`, leading with the entry and not the node: two
  // of these six statements carry four entries apiece and the two
  // raisers carry five and six, so a label naming only the node
  // would say which file to open and not which property went
  // missing. Every entry is driven and every fragment within an
  // entry checked, so one run says all of it rather than finding
  // the next miss each time.
  //
  // What the case is worth is what its input, its entries and its
  // plant are worth. The tree is refused a module away, on a
  // `workflows/dist/` that is absent, is not a directory, holds no
  // artifact or holds one carrying no node. An entry that could
  // not fail — requiring nothing, or requiring a fragment holding
  // no word — is refused where its fragments are read, and a case
  // below drives both halves of that refusal. The roster going
  // empty is what no assertion over a list of offenders can
  // report, and the case behind this one is what reports it. And
  // the plant is what says this walk can report anything at all.
  it('holds every rostered statement beside a planted miss', () => {
    const walked = [...POOL_SQL_RULES, ABSENT_NODE_PLANT];

    const unsatisfied = walked.flatMap((rule) => {
      REACHED_RULE_IDS.add(rule.id);

      return unsatisfiedPoolRequirements(rule, BUILT_WORKFLOWS);
    });

    expect(unsatisfied).toEqual([ABSENT_NODE_LABEL]);
  });

  // The half a list of offenders held against a written one cannot
  // say: that the walk in front of it was handed the whole roster
  // to go through. An entry dropped from `POOL_SQL_RULES`, and a
  // walk narrowed away from the entries still in it, each take a
  // property with them and leave an answer reading exactly like
  // the one a clean tree gives.
  //
  // The plant is in both lists, which is what its riding along in
  // the walk costs and it is the honest spelling of it: the walk
  // went through twenty three entries and this says which twenty
  // three they were.
  //
  // Held as sorted lists rather than as two sets, so an id two
  // entries share is reported rather than swallowed:
  // `REACHED_RULE_IDS` is a set and the roster is read as it is
  // written, so a shared id comes back once against a list
  // carrying it twice.
  //
  // The roster declaring anything at all is paired into the same
  // comparison rather than left to a case of its own, because it
  // is the one failure the ids cannot report between them.
  // Emptied, the roster declares nothing and the walk reaches
  // nothing but the plant, so one list equals the other — while
  // the case in front of this one goes on printing a tick over a
  // roster with no property left in it to check.
  //
  // Behind the walk rather than last in the file: vitest runs a
  // file's cases in the order they were declared, so what is read
  // here is what the case in front of it wrote. A run selecting
  // this one without the walk — a `-t` filter naming it — reports
  // the whole roster as unreached, which is what asking at run
  // time costs over reading the roster the walk was written over.
  it('reaches every entry the pool roster declares', () => {
    const reached = {
      rosterDeclaresAny: POOL_SQL_RULES.length > 0,
      ids: [...REACHED_RULE_IDS].sort(),
    };
    const declared = {
      rosterDeclaresAny: true,
      ids: [
        ...POOL_SQL_RULES.map((rule) => rule.id),
        ABSENT_NODE_PLANT.id,
      ].sort(),
    };

    expect(reached).toEqual(declared);
  });

  // What the coverage case above cannot report, and the reason
  // this roster spans three artifacts rather than one: the
  // statements it is over. Twenty two ids reached is twenty two
  // ids reached wherever they looked, so a roster whose entries
  // had all come to name one node — a workflow renamed and the
  // entries repointed, a node absorbed into another — passes that
  // case with a property of the drain and both properties of the
  // close rows silently no longer checked by anything.
  //
  // Held as a set, the roster carrying several entries per
  // statement by design, and against a written list rather than
  // against a count: six is six whichever six they are, and what a
  // failure has to say is which statement left the roster.
  it('spans every statement the pool is moved by', () => {
    const spanned = [...new Set(POOL_SQL_RULES.map(
      (rule) => `${rule.workflowId}:${rule.nodeName}`,
    ))].sort();

    expect(spanned).toEqual([...POOL_STATEMENTS].sort());
  });
});

// -----------------------------------------------------------------
// The four shapes of a miss
// -----------------------------------------------------------------

describe('research pool invariants — a miss is reported', () => {
  // The plant the walk carries, driven on its own so that what
  // makes it fail is pinned rather than inferred. Three readings,
  // and the third is the only one the walk above also makes.
  //
  // The canvas carries no node of that name, which is the fact the
  // plant rests on and the one thing about it that could quietly
  // stop being true. It carries the shadowed entry's workflow and
  // the shadowed entry's fragment, held against the roster's own
  // copy of both, which is what says the node name is the only
  // member that moved — a plant differing in two would report the
  // same label while standing for less.
  it('names an entry pointed at a node the canvas has not', () => {
    const shadowed = POOL_SQL_RULES.find(
      (rule) => rule.id === SHADOWED_RULE_ID,
    );
    const artifact = BUILT_WORKFLOWS.find(
      (workflow) => workflow.file === SHADOWED_ARTIFACT,
    );
    const named = artifact?.nodes.filter(
      (node) => node.name === ABSENT_NODE_NAME,
    );

    expect(named).toEqual([]);
    expect(ABSENT_NODE_PLANT.workflowId).toBe(shadowed?.workflowId);
    expect(ABSENT_NODE_PLANT.requires).toEqual(shadowed?.requires);
    expect(unsatisfiedPoolRequirements(ABSENT_NODE_PLANT, BUILT_WORKFLOWS))
      .toEqual([ABSENT_NODE_LABEL]);
  });

  // The shape only a roster spanning artifacts can fail in, and
  // the reason the workflow id is a member rather than a constant
  // beside the table. The tree is asserted to hold no artifact of
  // that name in the same case, so the label is a report about
  // this tree rather than about a string nobody looked up.
  it('names an entry pointed at a workflow the tree has not', () => {
    const files = BUILT_WORKFLOWS.map((workflow) => workflow.file);

    expect(files).not.toContain(`${ABSENT_WORKFLOW_ID}.json`);
    expect(
      unsatisfiedPoolRequirements(ABSENT_WORKFLOW_PLANT, BUILT_WORKFLOWS),
    ).toEqual([ABSENT_WORKFLOW_LABEL]);
  });

  // A node that is on the canvas and runs nothing, which is the
  // shape between the two above and the one a reading could most
  // easily answer with silence: a node found and no statement in
  // it is an empty list of statements, and an empty list of
  // statements carries no fragment and could as well have been
  // reported as a fragment missing.
  //
  // The node is asserted to be on that canvas first. Renamed, the
  // plant would fail for the shape two cases up while this case
  // went on reading as if it had driven this one.
  it('names an entry pointed at a node that runs no SQL', () => {
    const artifact = BUILT_WORKFLOWS.find(
      (workflow) => workflow.file === SHADOWED_ARTIFACT,
    );
    const named = artifact?.nodes.filter(
      (node) => node.name === SILENT_NODE_NAME,
    );

    expect(named?.length).toBe(1);
    expect(
      unsatisfiedPoolRequirements(SILENT_NODE_PLANT, BUILT_WORKFLOWS),
    ).toEqual([SILENT_NODE_LABEL]);
  });

  // The one shape about the pipeline rather than about the roster,
  // and the only one of the four that a real statement dropping a
  // property would produce. Everything about the plant resolves —
  // the workflow, the node and its statement — and what fails is
  // the phrase.
  //
  // Its label is asserted whole, which is where the reduction
  // becomes visible: the fragment arrives in it as the words
  // `sqlWords` leaves rather than as the column the entry was
  // written with.
  it('names a fragment the statement does not carry', () => {
    expect(
      unsatisfiedPoolRequirements(ABSENT_FRAGMENT_PLANT, BUILT_WORKFLOWS),
    ).toEqual([ABSENT_FRAGMENT_LABEL]);
  });

  // The refusal that stands where an entry would otherwise pass by
  // asserting nothing, driven on both shapes it covers. An entry
  // requiring nothing and an entry requiring a fragment that
  // reduces to nothing are the same hole from either end: each is
  // carried by every statement ever written, so the entry holds
  // while its own property line claims more than it checks, and
  // the coverage case above counts it as an entry the run reached.
  //
  // Driven on the shadowed entry rather than on an invention, so
  // both refusals are shown happening to an entry that otherwise
  // holds. Matched on the message rather than on a class, the
  // roster throwing a plain `Error` for a malformed entry: a class
  // is what lets a case pin a cause, and this is a line somebody
  // wrote by hand rather than a state a caller drives the reading
  // into.
  it('refuses an entry that cannot fail', () => {
    const requiringNothing = { ...ABSENT_NODE_PLANT, requires: [] };
    const requiringComment = {
      ...ABSENT_NODE_PLANT,
      requires: ['-- a phrase that is only a comment'],
    };

    expect(
      () => unsatisfiedPoolRequirements(requiringNothing, BUILT_WORKFLOWS),
    ).toThrow('requires nothing of the SQL on');
    expect(
      () => unsatisfiedPoolRequirements(requiringComment, BUILT_WORKFLOWS),
    ).toThrow('requires a fragment holding no word');
  });
});

// -----------------------------------------------------------------
// The workflow is half of the key
// -----------------------------------------------------------------

describe('research pool invariants — the workflow half', () => {
  // Both raisers carry a node called `Raise Research Intentions`,
  // which is the whole reason an entry names its artifact and a
  // node-name lookup across the tree would read whichever it found
  // first. This is the measurement of what that buys, and it is
  // less than the arrangement suggests: swap the eleven entries
  // over those two nodes onto the sibling raiser and eight of them
  // still hold, the properties genuinely being shared between two
  // statements written to the same law.
  //
  // Three move, and they are the three the pair does not share.
  // `ar-ingest` writes findings with no entity, so its raise files
  // intentions against none; `ar-score` reads the subject off the
  // handover it was given and files under it, which is what leaves
  // the window guard a row to find. The two stamps part company
  // for the same kind of reason: one raiser is dispatched by a run
  // and binds that id straight into the INSERT, the other is
  // handed a run id or nothing and reads it out of a guarded CTE.
  // Named rather than counted, because a count of three is
  // satisfied by whichever three happened to move.
  //
  // A weak control reported as one. What it says is that the
  // artifact member is load-bearing for three entries and that the
  // roster would not notice the other eight being pointed at the
  // wrong raiser — which is a limit of a phrase-shaped reading
  // rather than of the roster, and the live seams are where a
  // raise is driven against the rows it actually writes.
  it('holds one raiser entry to the workflow it names', () => {
    const sibling: Record<string, string> = {
      'ar-ingest': 'ar-score',
      'ar-score': 'ar-ingest',
    };

    const raisers = POOL_SQL_RULES.filter(
      (rule) => rule.nodeName === SHADOWED_NODE_NAME,
    );

    const moved = raisers.filter((rule) => {
      const swapped = sibling[rule.workflowId] ?? rule.workflowId;
      const missing = unsatisfiedPoolRequirements(
        { ...rule, workflowId: swapped },
        BUILT_WORKFLOWS,
      );

      return missing.length > 0;
    });

    expect(raisers.length).toBeGreaterThan(moved.length);
    expect(moved.map((rule) => rule.id)).toEqual([
      'pool-ingest-stamps-the-originating-run',
      'pool-score-raises-against-a-subject',
      'pool-score-stamps-the-originating-run',
    ]);
  });
});
