/**
 * `ar-dispatch` held to the statements and the wiring it has to
 * carry, over the tree this package actually builds.
 *
 * `dispatch-sql.ts` next door says which property belongs to which
 * node and what a statement carrying it has to say, and
 * `workflow-dist.ts` says what a built workflow is and refuses one
 * there is nothing to read in. This is where both meet
 * `workflows/dist/`, which `pretest` rebuilds for the `test` script
 * so a default run reads a tree a real bun process wrote.
 *
 * Six properties, and they divide the way that roster's header
 * divides a must-find check from an absence sweep. Four have to FIND
 * something: every entry satisfied by the SQL of the node it names,
 * every entry in the roster reached by the run, both claim nodes
 * wired straight off the schedule trigger, and the failures of the
 * node that invokes a target reaching a node that closes the run.
 * Two are absences: no statement parameterized from the items its
 * node was handed, and no node left to carry on down its regular
 * output after an error. The first two have landed and the rest
 * arrive later in this stage.
 *
 * What each of them reads is a parsed member, and for a statement
 * that means the `query` parameter its node carries rather than the
 * artifact's text. An artifact is one JSON document, so a phrase
 * looked for across it is answered alike by a sticky note, a display
 * name and the SQL of some other node — and this workflow is a poor
 * one to ask that way, spelling its own node names in its notes and
 * arguing its own properties inside its statements.
 * `queryParametersOf` is the reading and `sqlWords` drops the prose
 * out of what it hands back, neither of which a sweep over
 * characters can do.
 *
 * The other half is what stops the file passing by finding nothing:
 * the tree, the workflow and the entry are each refused rather than
 * answered, and the one hole none of those refusals reaches is
 * closed by a case of its own. The tree is refused a module away,
 * `loadBuiltWorkflows` throwing on a `workflows/dist/` that is
 * absent, is not a directory or holds no `*.json`, and on the first
 * artifact carrying no node — both before a case runs, and both
 * naming the command that fills the tree. The workflow is refused by
 * {@link dispatchWorkflow}, every property here belonging to that
 * one workflow. An entry that could not fail, requiring nothing or
 * requiring a fragment holding no word, is refused where its
 * fragments are read rather than counted as an entry a run reached.
 * The hole is the roster going empty, which no assertion over a list
 * of offenders can report: emptied, there is no entry left to go
 * unsatisfied and the list comes back the same either way.
 * {@link REACHED_RULE_IDS} and the case holding it against the
 * roster are what report that.
 *
 * Which is why the tree is read at module scope rather than in a
 * case, the way `workflows.test.ts` and `naming.test.ts` resolve
 * their own surfaces there: once there is no tree there is nothing
 * left to assert about it, that failure belongs to the file, and the
 * refusal already names the edit.
 */
import type { BuiltWorkflow } from './workflow-dist.js';

import { describe, expect, it } from 'vitest';

import { DISPATCH_SQL_RULES, unsatisfiedRequirements } from './dispatch-sql.js';
import { DIST_DIR, loadBuiltWorkflows } from './workflow-dist.js';

// ---------------------------------------------------------------------------
// The tree, and the workflow every property here belongs to
// ---------------------------------------------------------------------------

/**
 * Every built workflow, read once for the whole file.
 *
 * At module scope for the reason `workflows.test.ts` reads its own
 * there: a read that comes back with nothing to assert over throws,
 * and that failure belongs to the file rather than to one case. No
 * directory is named, so this is `DIST_DIR`, the tree this package
 * builds. The refusals over trees a caller controls are driven in
 * `workflow-dist.test.ts`, which is what keeps them reachable while
 * this one is healthy.
 */
const BUILT_WORKFLOWS = loadBuiltWorkflows();

/**
 * The workflow every property in this file belongs to, by id.
 *
 * `DISPATCH_SQL_RULES` is scoped to one workflow, which is what
 * leaves a bare node name enough to name a statement, and this is
 * the workflow it is scoped to. Declared here rather than read off
 * the roster because there is nothing there to read it from: an
 * entry names a node, and no entry names a workflow.
 *
 * By id and never by file name, the way `workflows.test.ts` declares
 * its own. A workflow is one file called `<workflow-id>.json` per
 * `workflows/src/README.md`, and the build writes each artifact
 * under its source name, so a file name is a derivation and an id is
 * the thing to keep in step with the roster table there.
 */
const DISPATCH_WORKFLOW_ID = 'ar-dispatch';

/**
 * The built `ar-dispatch`, refusing a tree that holds none.
 *
 * Called from inside a case rather than resolved beside
 * {@link BUILT_WORKFLOWS}, which is the one difference between the
 * two reads. A tree with nothing in it leaves nothing for any case
 * to say and belongs to the file; a tree that is otherwise healthy
 * and simply has no `ar-dispatch` in it is a failure this file can
 * report with a case name attached to it.
 *
 * A plain `Error` rather than a class of its own, the split
 * `schema-sql.ts` draws next door: a class is what lets a case pin a
 * cause, and no case in this file drives the read into that state.
 * What the message owes instead is which of two edits fixes it, the
 * artifact being generated — a stale tree wants a rebuild, and a
 * source that is gone is reported by the phase-3 roster case in
 * `workflows.test.ts` rather than here.
 *
 * @returns The built workflow {@link DISPATCH_WORKFLOW_ID} names.
 * @throws Error When the built tree holds no artifact of that name.
 */
function dispatchWorkflow(): BuiltWorkflow {
  const file = `${DISPATCH_WORKFLOW_ID}.json`;
  const found = BUILT_WORKFLOWS.find((workflow) => workflow.file === file);

  if (found === undefined) {
    throw new Error(
      `No '${file}' under ${DIST_DIR}. Every property this file ` +
      `asserts belongs to ${DISPATCH_WORKFLOW_ID}, so a tree ` +
      'without it leaves nothing here to hold: run ' +
      '`bun run build:workflows` if the tree is stale, and if the ' +
      'source of that name is gone from `workflows/src/`, the ' +
      'phase-3 roster case in `workflows.test.ts` is what says so.',
    );
  }

  return found;
}

// ---------------------------------------------------------------------------
// What a run of the roster reached
// ---------------------------------------------------------------------------

/**
 * Ids of the {@link DISPATCH_SQL_RULES} the walk over them reached,
 * added as it reaches each one.
 *
 * Recorded from inside the walk rather than read off the roster the
 * walk was written over, which is the whole of the difference. Read
 * off the roster, the case behind it would be the table held
 * against itself: it would answer the same for a walk narrowed away
 * from the roster — a slice, a filter, a hand-written list of ids —
 * and the same again for one that never ran at all.
 *
 * Recorded ahead of the entry being held to its node, which is where
 * the readers in this directory put theirs and which here buys
 * nothing a case can see. What would part the two placements is an
 * entry that cannot fail, and {@link unsatisfiedRequirements} throws
 * for one of those, which stops the walk and leaves every entry
 * behind it unreached whichever side of the call the record sits on.
 * Measured: that refusal reddens the walk and the case behind it
 * together, either way, so a malformed entry is reported twice —
 * once naming the entry, and once as a roster the walk did not get
 * through.
 *
 * A set rather than a list, so an id two entries share arrives here
 * once and fails against a roster that declares it twice. Nothing
 * else holds the entry ids apart, `DispatchSqlRule.id` saying of
 * itself that distinctness across the roster is convention.
 */
const REACHED_RULE_IDS = new Set<string>();

describe('ar-dispatch invariants — built tree', () => {
  // Every entry in the roster held against the node it names, in the
  // one workflow the roster is scoped to. An entry that holds
  // reports nothing; one that does not reports a label per thing
  // that did not hold, and the three shapes of label are three
  // different edits — a node nobody on the canvas is named after, a
  // named node that runs no SQL, and a statement that dropped the
  // phrase. Only the last is about the dispatcher rather than about
  // the roster.
  //
  // Read off the `query` parameter each named node carries and never
  // off the artifact's text, which is what makes a claim about a
  // statement a claim about the node that runs it. `sqlWords` drops
  // the `--` prose out of that parameter before anything is matched
  // in it, which this workflow needs rather more than a general
  // caution about comments would suggest: a node argues its own
  // decisions inside its own statement, so the text most likely to
  // spell a phrase an entry requires is the paragraph saying why the
  // statement carries it. Three of the nine entries rest on that,
  // measured and recorded on the roster.
  //
  // Held against an empty array rather than counted, because the
  // answer is already the report. `unsatisfiedRequirements` labels
  // each miss `<id>: <what>`, leading with the entry and not the
  // node: one claim statement here carries four properties at once,
  // so a label naming only the node would say which file to open and
  // not which property went missing. Every entry is driven and every
  // fragment within an entry checked, so one run says all of it
  // rather than finding the next miss each time.
  //
  // What the case is worth is what its input and its entries are
  // worth. The input is refused twice over, once for the tree and
  // once for the workflow, both argued at the head of this file. An
  // entry that could not fail is refused where its fragments are
  // read. The roster going empty is what an empty list of offenders
  // cannot report, and the case behind this one, holding the ids
  // this walk reached against the roster, is what reports it — which
  // is why the walk records each entry on its way past rather than
  // that case counting the roster it was written over.
  it('holds every statement the dispatch roster requires', () => {
    const workflow = dispatchWorkflow();

    const unsatisfied = DISPATCH_SQL_RULES.flatMap((rule) => {
      REACHED_RULE_IDS.add(rule.id);

      return unsatisfiedRequirements(rule, workflow);
    });

    expect(unsatisfied).toEqual([]);
  });

  // The half a list of offenders held against an empty one cannot
  // say: that the walk in front of it was handed the whole roster
  // to go through. An entry dropped from `DISPATCH_SQL_RULES`, and
  // a walk narrowed away from the entries that are still in it,
  // each take a property with them and leave a list of offenders
  // that reads exactly like the one a clean tree gives.
  //
  // Held as sorted lists rather than as two sets, so an id two
  // entries share is reported rather than swallowed:
  // `REACHED_RULE_IDS` is a set and the roster is read as it is
  // written, so a shared id comes back once against a list carrying
  // it twice.
  //
  // The roster declaring anything at all is paired into the same
  // comparison rather than left to a case of its own, because it is
  // the one failure the ids cannot report between them. Emptied,
  // the roster declares nothing and the walk reaches nothing, so
  // one empty list equals the other — while the case in front of
  // this one goes on printing a tick over a roster with no property
  // left in it to check.
  //
  // Behind the walk rather than last in the file: vitest runs a
  // file's cases in the order they were declared, so what is read
  // here is what the case in front of it wrote, and the cases
  // arriving later in this stage read the workflow for properties
  // no entry carries. A run that selects this one without the walk
  // — a `-t` filter naming it — reports the whole roster as
  // unreached, which is what asking at run time costs over reading
  // the roster the walk was written over.
  it('reaches every entry the dispatch roster declares', () => {
    const reached = {
      rosterDeclaresAny: DISPATCH_SQL_RULES.length > 0,
      ids: [...REACHED_RULE_IDS].sort(),
    };
    const declared = {
      rosterDeclaresAny: true,
      ids: DISPATCH_SQL_RULES.map((rule) => rule.id).sort(),
    };

    expect(reached).toEqual(declared);
  });
});
