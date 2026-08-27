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
 * output after an error. All four must-find checks have landed and
 * the first of the absences with them. What is left is the second:
 * the setting read here off the one node that has a failure to
 * route, read there off every node in the workflow.
 *
 * What each of them reads is a parsed member. For a statement that
 * means the `query` parameter its node carries and the `options`
 * member holding the values it is run with; for the wiring it means
 * `connections`, which the format keys by the name of the node an
 * edge leaves, and the `onError` member of the node a second output
 * is appended to. Never the artifact's text. An artifact is one JSON
 * document, so a phrase looked for across it is answered alike by a
 * sticky note, a display name and the SQL of some other node — and
 * this workflow is a poor one to ask that way, spelling its own node
 * names in its notes and arguing its own properties inside its
 * statements. `queryParametersOf` and {@link queryValuesOf} are the
 * two readings over a statement, {@link inboundEdgeLabels} the one
 * over the graph, and `sqlWords` drops the prose out of what the
 * first hands back; none of the four is a thing a sweep over
 * characters can do.
 *
 * The other half is what stops the file passing by finding nothing,
 * and the two kinds of check here want different answers to it. For
 * the ones that must FIND something the tree and the workflow are
 * refused rather than answered, and so is a roster entry that could
 * not fail. The tree is refused a module away, `loadBuiltWorkflows`
 * throwing on a `workflows/dist/` that is absent, is not a directory
 * or holds no `*.json`, and on the first artifact carrying no node —
 * both before a case runs, and both naming the command that fills
 * the tree. The workflow is refused by {@link dispatchWorkflow},
 * every property here belonging to that one workflow. An entry that
 * could not fail, requiring nothing or requiring a fragment holding
 * no word, is refused where its fragments are read rather than
 * counted as an entry a run reached. The hole none of those refusals
 * reaches is the roster going empty, which no assertion over a list
 * of offenders can report: emptied, there is no entry left to go
 * unsatisfied and the list comes back the same either way.
 * {@link REACHED_RULE_IDS} and the case holding it against the
 * roster are what report that. A property held against a written
 * expectation instead has nothing behind it to go empty, which is
 * why the wiring check ships no case of that kind.
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

// ---------------------------------------------------------------------------
// How a node is fed
// ---------------------------------------------------------------------------

/**
 * The node names one output index of one connection is wired to.
 *
 * `connections` is the whole graph the n8n format carries and it is
 * nested three deep: keyed by the name of the node an edge LEAVES,
 * then by connection type, then an array indexed by OUTPUT index
 * whose every entry is a list of objects naming a target node and
 * the input it arrives at. This is the innermost of those three,
 * reduced to the names.
 *
 * Everything walked here arrives out of a `JSON.parse` with no
 * schema checked on the way in, so an entry that is not an array,
 * one holding something that is not an object, and a target whose
 * `node` is not a string are each passed over rather than refused.
 * Quiet on purpose, and safe because of the direction the claim
 * resting on it fails in: an edge that cannot be read is an edge not
 * reported, and what is asserted over these names is that the edges
 * they stand for are THERE.
 */
function targetNames(entries: unknown): readonly string[] {
  if (!Array.isArray(entries)) {
    return [];
  }

  const targets: readonly unknown[] = entries;
  const names: string[] = [];

  for (const target of targets) {
    if (typeof target !== 'object' || target === null) {
      continue;
    }

    const node = (target as Record<string, unknown>).node;

    if (typeof node === 'string') {
      names.push(node);
    }
  }

  return names;
}

/**
 * Every edge one source node has into `nodeName`, labelled
 * `<source>:<type>[<output index>]`.
 *
 * One label per output the edge leaves by, so a node fed twice off
 * two outputs of one source comes back as two labels rather than
 * one. The index is worth carrying because a fan-out is several
 * targets on ONE output: two claims sharing an output are one fire
 * reaching both, the same two spread over two outputs are a
 * different graph, and a label without the index could not tell them
 * apart.
 *
 * A label to READ and never to split, the caution `nodesMatching`
 * carries about its own: nothing stops a node name from holding a
 * colon, and the name is the half a reader opens.
 */
function sourceEdgeLabels(
  source: string,
  byType: unknown,
  nodeName: string,
): readonly string[] {
  if (typeof byType !== 'object' || byType === null) {
    return [];
  }

  const labels: string[] = [];
  const perType = Object.entries(byType as Record<string, unknown>);

  for (const [type, value] of perType) {
    if (!Array.isArray(value)) {
      continue;
    }

    const outputs: readonly unknown[] = value;

    for (let index = 0; index < outputs.length; index += 1) {
      if (targetNames(outputs[index]).includes(nodeName)) {
        labels.push(`${source}:${type}[${index}]`);
      }
    }
  }

  return labels;
}

/**
 * Every edge in `workflow` that arrives at `nodeName`, sorted.
 *
 * What a claim about how a node is FED is made of. An n8n node runs
 * once per input item, so how often it runs in a tick is settled by
 * what is wired into it and by how many items each of those sources
 * emits — which makes the edges ARRIVING at a node the thing to
 * hold, and the edges leaving some other node the wrong end to hold
 * it by.
 *
 * It is also what lets one comparison say both halves of `fed off
 * the trigger rather than one behind the other`. Every path into a
 * node, however long, ends in an edge into that node, so an arriving
 * set holding the trigger and nothing else rules out a source at any
 * distance exactly as it rules out an adjacent one.
 *
 * Sorted, so the answer does not move with the order `connections`
 * happens to store its sources in. That order is editor-produced in
 * the format's own exports and is no convention a hand-written
 * source follows.
 *
 * A `connections` that is absent or is not an object answers empty,
 * which is what an empty answer means here anyway: nothing is wired
 * to that node.
 */
function inboundEdgeLabels(
  workflow: BuiltWorkflow,
  nodeName: string,
): readonly string[] {
  const connections = workflow.parsed.connections;

  if (typeof connections !== 'object' || connections === null) {
    return [];
  }

  const sources = Object.entries(connections as Record<string, unknown>);

  return sources
    .flatMap(([source, byType]) => sourceEdgeLabels(source, byType, nodeName))
    .sort();
}

/**
 * The node every branch of this workflow hangs off, by name.
 *
 * `connections` keys by node name, so this is both the name the
 * graph is keyed by and the name a reader opens. Declared here and
 * not read off `DISPATCH_SQL_RULES`, which names no node it has no
 * statement to hold to — the trigger runs none, so nothing over
 * there names it, and the wiring case is the only thing in this file
 * that holds its name against the canvas.
 *
 * That it is a SCHEDULE trigger is a different claim with a home of
 * its own: `workflows.test.ts` asserts there is exactly one in the
 * whole built tree and that it lives in this workflow. What is
 * asserted here is where the branches leave from.
 */
const TRIGGER_NODE_NAME = 'Schedule Trigger';

/**
 * The two nodes that claim a due row, by name, in the order the
 * wiring case reports them.
 *
 * Declared apart from `DISPATCH_SQL_RULES` although every name here
 * is one that roster carries too. They are two claims that coincide:
 * the roster names a node because it runs a statement, this names
 * one because it takes rows off the trigger, and a node gaining a
 * statement or losing one is no reason for the wiring claim to move.
 */
const CLAIM_NODE_NAMES = [
  'Claim Due Topics',
  'Claim Due Export Subscriptions',
] as const;

/**
 * The node that hands a claimed unit to the workflow its kind routes
 * to, by name.
 *
 * Declared here rather than read off `DISPATCH_SQL_RULES`, which
 * names no node it has no statement to hold to. This one runs none:
 * it invokes a workflow rather than a query. What is held of it here
 * is where its failures go, and the setting that gives it anywhere
 * to send them.
 */
const INVOKING_NODE_NAME = 'Invoke Target Workflow';

/**
 * The node a failed invocation reaches, by name.
 *
 * Unlike the node in front of it this one does run a statement, and
 * no entry in `DISPATCH_SQL_RULES` names it. What that statement
 * writes — a run closed as failed, with the target it could not
 * reach named in the row's own list of errors — is argued in its own
 * prose and held to nothing. All this case reads of it is that it
 * runs one at all.
 */
const FAILURE_CLOSING_NODE_NAME = 'Close Run Failed';

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

  // Both claims fed off the schedule trigger, and off nothing else,
  // which is what keeps each of them to one run a tick.
  //
  // An n8n node runs once per INPUT item, and the schedule trigger
  // emits exactly one item per fire — measured in the shipped node,
  // which ends a tick by emitting a single-element array. So a claim
  // wired to the trigger and to nothing else runs once. Chain the
  // second claim behind the first and it runs once per row the first
  // claimed, each run taking the cap afresh: a tick that claimed
  // twenty topics would run the export claim twenty times, and every
  // one of those runs claims and reschedules more subscriptions. The
  // sweep over where a statement draws its values from holds the
  // same multiplication from the other end; this is the half about
  // the graph, and the two do not stand in for each other — values
  // read per item are no help to a node that is run too often, and a
  // node run once still writes the whole batch if that is what its
  // values say.
  //
  // What is held is the set of edges ARRIVING at each claim rather
  // than the set leaving the trigger, and one comparison then says
  // both halves of the property. Carrying the trigger says the claim
  // is fed by it. Carrying nothing else says no other node is, the
  // sibling claim included — and since every path into a node ends
  // in an edge into that node, that reaches a claim put behind the
  // other at any distance and not only next to it.
  //
  // The names are held against the canvas in the same record, which
  // is what parts a node that is gone from one that is wired
  // wrongly: renamed, a claim reports no arriving edge at all, and a
  // reader sent to look at a wire has a node to find first. It is
  // also what makes this a claim about `nodes` and not about
  // `connections` alone — an artifact whose graph is intact and
  // whose node list is empty satisfies every edge held here.
  // `loadBuiltWorkflows` refuses that artifact before a case runs,
  // so the half cannot fire over this tree; take that refusal away
  // and it is what reddens.
  //
  // Held against a written-down expectation rather than against an
  // empty list, so nothing behind it can go quietly empty: a reader
  // answering nothing and a reader answering every edge in the
  // workflow both redden, which is the way round a must-find check
  // fails and the reason it wants no coverage case of the kind an
  // absence sweep needs. Both node names are written twice over,
  // once to drive the read and once as what the read has to come
  // back with, so neither spelling is compared with itself: a name
  // wrong in one place disagrees with the other, and a name wrong in
  // both is a name the canvas does not carry.
  //
  // What it does not say is how many items the trigger emits. That
  // is a property of the node type, measured once against the
  // published package and argued where the wiring was decided, and
  // no artifact carries it.
  it('feeds both claims off the schedule trigger and off nothing else', () => {
    const workflow = dispatchWorkflow();
    const onTheCanvas = new Set(workflow.nodes.map((node) => node.name));
    const named = [TRIGGER_NODE_NAME, ...CLAIM_NODE_NAMES];

    const wiring = {
      namedNodesOnTheCanvas: named.filter((name) => onTheCanvas.has(name)),
      claimsFedBy: CLAIM_NODE_NAMES.map((name) => ({
        node: name,
        from: inboundEdgeLabels(workflow, name),
      })),
    };

    expect(wiring).toEqual({
      namedNodesOnTheCanvas: [
        'Schedule Trigger',
        'Claim Due Topics',
        'Claim Due Export Subscriptions',
      ],
      claimsFedBy: [
        { node: 'Claim Due Topics', from: ['Schedule Trigger:main[0]'] },
        {
          node: 'Claim Due Export Subscriptions',
          from: ['Schedule Trigger:main[0]'],
        },
      ],
    });
  });

  // Where a failed invocation goes, which is the half of a dispatch
  // this file otherwise reads nothing of.
  //
  // `Invoke Target Workflow` hands each claimed unit to the workflow
  // its kind routes to, and neither of those workflows exists yet:
  // the id resolves and nothing on the instance answers to it, so
  // every unit this node is handed fails. They arrive one at a time,
  // one target in phase 5 and the other in phase 6, so through phase
  // 5 a tick records successes and failures side by side. That is
  // the accurate record rather than a fault to suppress, and what
  // makes it a record at all is that the failure has somewhere to
  // go. A node that fails and routes its failure nowhere drops the
  // item, so the row `Open Run` opened for that unit keeps the
  // status it was opened with and nothing ever closes it — a run
  // left running for a dispatch that finished.
  //
  // Two things have to hold for the branch to exist and neither
  // implies the other, which is why both are in the record. The node
  // carries `onError` set to the value that appends a second output
  // for its own failures, which is what makes an output index of 1
  // an output at all; and an edge leaves that output for a node that
  // closes the run. Take the setting away and the edge is still
  // written in `connections`, still legal, and wired to an output
  // the executor never builds — so a reading of the graph alone
  // passes over a workflow that drops every failure it has. The
  // setting is read here off the one node with a failure to route;
  // the value that would leave a node carrying on down its regular
  // output instead is a sweep over every node in the workflow, and a
  // check of its own.
  //
  // What is held of the edge is the set arriving at
  // `Close Run Failed` rather than the set leaving the invocation,
  // the reading the wiring case above uses and for its reason: an
  // arriving set holding the error output alone says both that
  // failures reach this node and that nothing else feeds it, so a
  // second stream closing runs as failed for a reason nobody wired
  // is reported too.
  //
  // The last half says the branch ends in something that writes.
  // `queryParametersOf` answers empty for a node running no
  // statement, so a branch re-wired to a sticky note, or to a node
  // that only passes items on, would read as a failure recorded
  // where nothing records it. What it does not say is which
  // statement or what it writes: no entry in `DISPATCH_SQL_RULES`
  // names this node, so the row being closed as failed with the
  // target named in it is asserted nowhere.
  //
  // The names are held against the canvas in the same record for the
  // reason the wiring case above gives, and this case inherits both
  // halves of it: it parts a node that is gone from one that is
  // wired wrongly, and it keeps this a claim about `nodes` rather
  // than about `connections` alone. Held against a written-down
  // expectation, so nothing behind it can go quietly empty, which is
  // the way round a must-find check fails and the reason it wants no
  // coverage case of the kind an absence sweep needs.
  //
  // Measured, seven legs. `inboundEdgeLabels` answering nothing, and
  // answering every edge in the workflow, each redden this case and
  // the wiring case above — both read it, and they are the only two
  // legs that move a second case in this file. The other five redden
  // this one alone, one per edit the property is about and none of
  // them reachable by mutating a module: the setting dropped from
  // the invocation, which leaves the edge written and wired to an
  // output the executor never builds; the error output wired
  // nowhere; the two closers swapped across the two outputs; the
  // closing node's `parameters` emptied, so the branch ends in a
  // node running no statement; and that node renamed in `nodes`
  // alone, which moves the canvas half and the arriving set
  // together. A tree with no artifact in it is none of the seven: it
  // reports no case at all, `loadBuiltWorkflows` refusing before any
  // of them runs, and only the class in the run log says which
  // refusal it was.
  it('routes a failed invocation to the node that closes its run', () => {
    const workflow = dispatchWorkflow();
    const onTheCanvas = new Set(workflow.nodes.map((node) => node.name));
    const named = [INVOKING_NODE_NAME, FAILURE_CLOSING_NODE_NAME];
    const invoking = workflow.nodes.find(
      (node) => node.name === INVOKING_NODE_NAME,
    );
    const closing = workflow.nodes.find(
      (node) => node.name === FAILURE_CLOSING_NODE_NAME,
    );

    const routing = {
      namedNodesOnTheCanvas: named.filter((name) => onTheCanvas.has(name)),
      onErrorAtTheInvocation: invoking?.onError,
      failuresArriveFrom: inboundEdgeLabels(
        workflow,
        FAILURE_CLOSING_NODE_NAME,
      ),
      theBranchRunsAStatement:
        closing !== undefined && queryParametersOf(closing).length > 0,
    };

    expect(routing).toEqual({
      namedNodesOnTheCanvas: ['Invoke Target Workflow', 'Close Run Failed'],
      onErrorAtTheInvocation: 'continueErrorOutput',
      failuresArriveFrom: ['Invoke Target Workflow:main[1]'],
      theBranchRunsAStatement: true,
    });
  });
});
