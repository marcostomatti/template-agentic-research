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
 * output after an error. The first two must-find checks have landed,
 * and the first of the absences with them; the two over this
 * workflow's wiring and the one over the setting that decides where
 * a failure goes arrive later in this stage.
 *
 * What each of them reads is a parsed member, and for a statement
 * that means the `query` parameter its node carries and the
 * `options` member holding the values it is run with, rather than
 * the artifact's text. An artifact is one JSON document, so a phrase
 * looked for across it is answered alike by a sticky note, a display
 * name and the SQL of some other node — and this workflow is a poor
 * one to ask that way, spelling its own node names in its notes and
 * arguing its own properties inside its statements.
 * `queryParametersOf` and {@link queryValuesOf} are the two
 * readings, and `sqlWords` drops the prose out of what the first
 * hands back; none of the three is a thing a sweep over characters
 * can do.
 *
 * The other half is what stops the file passing by finding nothing,
 * and the two kinds of check here want different answers to it. For
 * the ones that must FIND something the tree, the workflow and the
 * entry are each refused rather than answered. The tree is refused a
 * module away, `loadBuiltWorkflows` throwing on a `workflows/dist/`
 * that is absent, is not a directory or holds no `*.json`, and on
 * the first artifact carrying no node — both before a case runs, and
 * both naming the command that fills the tree. The workflow is
 * refused by {@link dispatchWorkflow}, every property here belonging
 * to that one workflow. An entry that could not fail, requiring
 * nothing or requiring a fragment holding no word, is refused where
 * its fragments are read rather than counted as an entry a run
 * reached. The hole none of those refusals reaches is the roster
 * going empty, which no assertion over a list of offenders can
 * report: emptied, there is no entry left to go unsatisfied and the
 * list comes back the same either way. {@link REACHED_RULE_IDS} and
 * the case holding it against the roster are what report that.
 *
 * Which is why the tree is read at module scope rather than in a
 * case, the way `workflows.test.ts` and `naming.test.ts` resolve
 * their own surfaces there: once there is no tree there is nothing
 * left to assert about it, that failure belongs to the file, and the
 * refusal already names the edit.
 *
 * An absence sweep has that hole the other way round. Its passing
 * answer is the empty list, so a rule that could never have fired
 * reports what a clean workflow reports, and no refusal in front of
 * it helps: an input worth asserting over is exactly what leaves
 * nothing to find. So an absence here ships the nodes that say its
 * rule fires, the near miss that says it fires on the right thing,
 * and, where the rule is keyed to a phrase, one reading of the
 * artifact whole that says the phrase it looks for is written in
 * this workflow at all.
 */
import type { BuiltWorkflow, BuiltWorkflowNode } from './workflow-dist.js';

import { describe, expect, it } from 'vitest';

import { DISPATCH_SQL_RULES, unsatisfiedRequirements } from './dispatch-sql.js';
import { DIST_DIR, loadBuiltWorkflows, nodesMatching } from './workflow-dist.js';
import { queryParametersOf } from './workflow-rosters.js';

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

// ---------------------------------------------------------------------------
// Where a statement's values come from
// ---------------------------------------------------------------------------

/**
 * A read of the whole batch a node was handed.
 *
 * `$input.all()` is the n8n expression for it, and what makes this
 * one phrase worth naming is that it is the reach a hand goes to
 * first: the whole of what a node was handed, in one call. `$json`
 * and `$input.item` resolve against the item a run is standing on,
 * so a statement drawing its values from either says something
 * different on each of the runs its node makes; this one says the
 * same thing on all of them.
 *
 * Bounded in front by a class admitting everything an identifier
 * cannot carry, `$` among them, so a variable whose own name
 * merely ends in `input` is not this. Bounded behind by the open
 * parenthesis rather than by a class, because what is read is a
 * CALL: a member named `all` that nothing calls hands nothing to
 * anything. Whitespace is admitted between the parts for the
 * reason a statement's is, an expression being written by hand
 * and wrapped by whoever wrote it.
 *
 * What it does not read is the other ways past the item a run is on.
 * `$input.first()` and `$input.last()` each reach a fixed item of
 * the batch, `$items()` is the version-1 alias for the whole of it,
 * and `$('<node>').all()` takes another node's whole output — each
 * of them the same value on every run of a node, and so the same
 * multiplication. The rule is therefore narrower than the property
 * it stands for, and what it covers is the spelling a query node
 * reaches for in practice: none of the other three is written in a
 * workflow source here, and in the workflow set this port draws from
 * every node that does parameterize a statement from its batch
 * spells this one. The edit is a second pattern arriving with the
 * expression that needs one.
 *
 * Module-private and compiled, having one caller in this file,
 * which is the split `SQL_LINE_COMMENT` in `dispatch-sql.ts`
 * draws: a source string buys something where a second module
 * compiles the same grammar, and buys nothing here. Not global
 * either, and read with `test` — a shared global instance
 * carries `lastIndex` from one `test` into the next, and there
 * is no `replace` here to reset it.
 */
const BATCH_INPUT_READ =
  /(?<![A-Za-z0-9_$])[$]input[ \t\r\n]*[.][ \t\r\n]*all[ \t\r\n]*[(]/u;

/**
 * The values `node` parameterizes its statement with, one text
 * per member carrying them and none for a node carrying none.
 *
 * The half {@link queryParametersOf} deliberately leaves, and
 * the collision that reader's own name is named for: a Postgres
 * node holds its statement in `query` and the values it runs
 * that statement with in `options.queryReplacement`, which the
 * node's editor labels Query Parameters. This is the check that
 * block says reads the second member.
 *
 * The shape is that reader's, one member deeper, and for its
 * reasons. A parsed parameter rather than the artifact's text,
 * so a claim about where a statement's values come from is a
 * claim about the node that runs it. A list rather than a text
 * or nothing, so a node that is parameterized and a node that is
 * not are one shape at a call site.
 *
 * It lives here rather than beside the rosters because the rule
 * that reads it does, which is the split `codeBodiesOf` in
 * `workflows.test.ts` already draws: a member one check reads
 * belongs with the check, and moving it next door is what a
 * second reader asks for.
 *
 * An `options` member that is absent or is not an object, and a
 * `queryReplacement` that is there but is not a string, all answer
 * empty. The first two are ordinary — most nodes carry no `options`
 * at all — while the third is a malformed artifact and is quiet
 * here: what it costs is a node the sweep over this passes over
 * having looked at nothing.
 */
function queryValuesOf(node: BuiltWorkflowNode): readonly string[] {
  const parameters = node.parameters;

  if (typeof parameters !== 'object' || parameters === null) {
    return [];
  }

  const options = (parameters as Record<string, unknown>).options;

  if (typeof options !== 'object' || options === null) {
    return [];
  }

  const values = (options as Record<string, unknown>).queryReplacement;

  return typeof values === 'string'
    ? [values]
    : [];
}

/**
 * Whether `node` draws a statement's values from the whole batch
 * it was handed.
 *
 * Composed at the call site the way the matchers in
 * `workflows.test.ts` are: the rule is about a text, and which
 * members carry a text it is about is read here rather than
 * inside it.
 *
 * Both members, because values reach a statement two ways and
 * either one multiplies it. `options.queryReplacement` carries
 * them beside the statement, one expression per `$n` the
 * statement spells, and an expression written into the `query`
 * itself is resolved into the SQL text before the statement is
 * sent. Measured in `n8n-nodes-base` 2.15.1: the execute-query
 * operation resolves the expressions in both.
 *
 * Shared by the claim and the case standing behind it rather
 * than spelled twice, because a second spelling is a second
 * place the wrong member can be read. The mistake this
 * composition invites is not a member left out but one taken in,
 * `jsCode` above all: the Code node this workflow runs reads its
 * whole input on purpose, so a rule reaching that member reports
 * a clean workflow as an offender.
 */
function parameterizesQueryFromBatch(node: BuiltWorkflowNode): boolean {
  return [...queryParametersOf(node), ...queryValuesOf(node)]
    .some((text) => BATCH_INPUT_READ.test(text));
}

/**
 * A statement whose values arrive one item at a time, as the
 * `$n` placeholders a node fills per run.
 *
 * Shared by the node whose values read the batch and by the node
 * whose values read one item, so the only thing the rule reads that
 * parts those two is the expression under test.
 *
 * Fixture SQL and not a statement `ar-dispatch` runs. What is
 * asserted over these nodes is the reading; the properties the
 * real statements have to satisfy are held against them by
 * `DISPATCH_SQL_RULES`, which names nodes on the canvas and
 * plants nothing.
 */
const PER_ITEM_STATEMENT =
  'INSERT INTO runs (domain_id)\n' +
  'VALUES ($1::bigint)';

/**
 * Values drawn from the whole batch, as one expression.
 *
 * Written out rather than built from {@link BATCH_INPUT_READ},
 * so the pattern and the text it has to fire on are two
 * spellings of the phrase rather than one compared with itself.
 */
const BATCH_VALUES =
  '={{ JSON.stringify($input.all().map((item) => item.json.domain_id)) }}';

/**
 * Values drawn from the one item a run is standing on.
 *
 * The near miss the sweep has to pass over, and one step from
 * {@link BATCH_VALUES} rather than a comfortable distance from it: a
 * node parameterized per item is parameterized, so a rule keyed to
 * whether a statement takes values at all is answered by this
 * exactly as it is by the batch plant. It is also the shape every
 * parameterized node in this workflow is written in, a value
 * resolved against one item rather than against the batch.
 */
const PER_ITEM_VALUES = '={{ $json.domain_id }}';

/**
 * A statement reaching the batch in its own text, taking no
 * value through {@link queryValuesOf}'s member at all.
 *
 * The other route the rule has to cover, and the one the
 * multiplication is easiest to see in: an expression resolved
 * into the SQL rather than passed beside it, so one run writes
 * every row the node was handed and the node makes one such run
 * per row.
 */
const BATCH_STATEMENT =
  'INSERT INTO runs (domain_id)\n' +
  'SELECT domain_id FROM jsonb_to_recordset(\n' +
  '  {{ JSON.stringify($input.all().map((item) => item.json)) }}::jsonb\n' +
  ') AS claimed(domain_id bigint)';

/**
 * A Postgres node carrying `parameters`, planted under `name`.
 *
 * `operation` rides along on every one of them so an answer is
 * never the only text there was to hand back: a rule keyed to
 * some other member of `parameters` has something to find and
 * still has to answer no.
 *
 * Named for what the node does rather than for the type it
 * carries, as every node planted in this suite is.
 */
function plantedQueryNode(
  name: string,
  parameters: Record<string, unknown>,
): BuiltWorkflowNode {
  return {
    name,
    type: 'n8n-nodes-base.postgres',
    parameters: { operation: 'executeQuery', ...parameters },
  };
}

/**
 * A node whose VALUES read the batch, its statement reading
 * nothing, so what flags it can only be the values member.
 */
const BATCH_VALUES_PLANT = plantedQueryNode('Open A Run Per Batch', {
  query: PER_ITEM_STATEMENT,
  options: { queryReplacement: BATCH_VALUES },
});

/**
 * A node whose STATEMENT reads the batch, carrying no values at
 * all, so what flags it can only be the query member.
 */
const BATCH_STATEMENT_PLANT = plantedQueryNode('Open Runs From The Batch', {
  query: BATCH_STATEMENT,
  options: {},
});

/**
 * A node parameterized per item: a placeholder in the statement and
 * a values expression resolving against one item, which is the shape
 * this workflow's own query nodes are written in.
 */
const PER_ITEM_PLANT = plantedQueryNode('Open A Run Per Unit', {
  query: PER_ITEM_STATEMENT,
  options: { queryReplacement: PER_ITEM_VALUES },
});

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
  // behind it read the workflow for properties no entry carries. A
  // run that selects this one without the walk — a `-t` filter
  // naming it — reports the whole roster as unreached, which is
  // what asking at run time costs over reading the roster the walk
  // was written over.
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

  // The rule that keeps a dispatched unit one unit: no statement in
  // `ar-dispatch` draws its values from the whole batch its node was
  // handed.
  //
  // What it prevents is a multiplication, and the multiplication is
  // the node's own behaviour rather than a mistake in the SQL. An
  // executeQuery node maps its statement over the items it was
  // handed and runs it once per INPUT item, so a tick that
  // dispatched N units runs each of these statements N times. Values
  // read off `$json` differ on each of those runs, and N runs write
  // N rows. Values read off `$input.all()` are the same batch on
  // every one of them, so a statement writing what it was handed
  // writes all N rows N times over, and one writing a single row
  // writes one item's answer N times. Both report success, nothing
  // counting the rows a statement touched against the items that
  // reached it, so the tell is downstream: a table that grew with
  // the square of a backlog, or a row per unit carrying one unit's
  // answer. It is a shape somebody has reached for and not a
  // hypothetical: the workflow set this port draws from carries two
  // Postgres nodes with no `executeOnce`, each mapping
  // `$input.all()` into a JSON array in its values member and
  // expanding that array in its statement, so every row the node was
  // handed is written on every run it makes.
  //
  // The workflow argues that mechanism twice already, from the other
  // end. Both claims sit off the Schedule Trigger rather than one
  // behind the other so that neither runs once per row the other
  // emitted, and `Open Run` is fed the per-unit stream precisely so
  // that it opens one row per claimed unit. This is the half with no
  // clause to point at: what holds those statements to one unit is
  // where their values come from, and nothing in a statement says
  // so.
  //
  // Held against an empty array rather than counted, because the
  // answer is already the report. `nodesMatching` labels every
  // offender `<file>:<node name>`, so a failure prints the whole
  // list on its way past and names the source to open under
  // `workflows/src/`.
  //
  // An empty answer is also the passing answer, so what this is
  // worth is what its input, its walk and its matcher are worth. The
  // input is refused twice over, once for the tree and once for the
  // workflow, both argued at the head of this file. The walk is
  // `nodesMatching`, which refuses nothing and is worth what it was
  // handed, which here is one workflow that survived both of those
  // refusals; that it reaches every node it was handed is asserted
  // of the same walk by the sweep-coverage case in
  // `workflows.test.ts`. The matcher and the members it is composed
  // over are what the case behind this one stands behind.
  it('parameterizes no statement from the batch a node was handed', () => {
    const flagged = nodesMatching(
      [dispatchWorkflow()],
      parameterizesQueryFromBatch,
    );

    expect(flagged).toEqual([]);
  });

  // The half an empty list cannot say: that the rule behind it would
  // have named an offender had there been one. An absence check
  // reports the same nothing for a workflow that is clean and for a
  // rule that could never have fired, and no assertion over the
  // answer parts the two — which is the inverse of the roster cases
  // above, where a check that must FIND something reddens whether it
  // recognises too little or too much.
  //
  // Four halves in one record, so a failure names which of them
  // moved rather than reporting that the guard broke.
  //
  // Two say the rule fires, one per route the batch can reach a
  // statement by. The first plants it in the values member and
  // leaves the statement reading nothing; the second plants it in
  // the statement and leaves the values member empty. Each is
  // therefore keyed to the member it was planted in and not to the
  // other, which is what a single plant carrying both could not say.
  //
  // The third is the near miss, and it is one step from the first
  // rather than a comfortable distance from it: a node parameterized
  // per item is parameterized, so a rule keyed to whether a
  // statement takes values at all passes the plants and this alike.
  // It is also the shape every parameterized node in this workflow
  // is written in, so this half and the claim above move together
  // under a rule that widened — measured, both redden. What this
  // adds is the naming: the claim reports which nodes, and this
  // reports which reading.
  //
  // The fourth is about the workflow rather than the rule. The
  // phrase this looks for IS written in `ar-dispatch`, in the Code
  // node that reads its whole input on purpose, so the empty list
  // above is a rule reading the members that decide what a statement
  // runs with rather than a phrase nothing in the workflow spells.
  // It reads the artifact whole, which is the one reading this file
  // otherwise refuses. As a claim it would be answered by a sticky
  // note as readily as by a node, and as a guard being answerable by
  // anything in the workflow at all is exactly what it asks.
  it('flags a statement drawn from the batch and nothing beside it', () => {
    const workflow = dispatchWorkflow();
    const detector = {
      valuesFromTheBatch: parameterizesQueryFromBatch(BATCH_VALUES_PLANT),
      statementFromTheBatch:
        parameterizesQueryFromBatch(BATCH_STATEMENT_PLANT),
      valuesFromOneItem: parameterizesQueryFromBatch(PER_ITEM_PLANT),
      batchReadWrittenSomewhereInTheWorkflow:
        BATCH_INPUT_READ.test(JSON.stringify(workflow.parsed)),
    };

    expect(detector).toEqual({
      valuesFromTheBatch: true,
      statementFromTheBatch: true,
      valuesFromOneItem: false,
      batchReadWrittenSomewhereInTheWorkflow: true,
    });
  });
});
