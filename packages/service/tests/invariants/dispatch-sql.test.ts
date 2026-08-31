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
 * output after an error. All six have landed, and each absence ships
 * a case behind it saying its rule would have named an offender had
 * there been one and would have named nothing else — eight cases
 * over the six properties. The setting a node carries about its own
 * failure is read twice over, and the two readings are two claims:
 * once off the one node that has a failure to route, as the half of
 * that branch a reading of the graph cannot see, and once off every
 * node in the workflow, which is what reaches the nodes that have
 * none.
 *
 * What each of them reads is a parsed member. For a statement that
 * means the `query` parameter its node carries and the `options`
 * member holding the values it is run with; for the wiring it means
 * `connections`, which the format keys by the name of the node an
 * edge leaves; and for what a node does with its own failure it
 * means `onError`, read off the node a second output is appended to
 * and off every node besides. Never the artifact's text. An artifact
 * is one JSON document, so a phrase looked for across it is answered
 * alike by a sticky note, a display name and the SQL of some other
 * node — and this workflow is a poor one to ask that way, spelling
 * its own node names in its notes and arguing its own properties
 * inside its statements. `queryParametersOf` and
 * {@link queryValuesOf} are the two readings over a statement,
 * {@link inboundEdgeLabels} the one over the graph,
 * {@link continuesPastAnError} the one over a node's own setting,
 * and `sqlWords` drops the prose out of what the first hands back;
 * none of the five is a thing a sweep over characters can do.
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
 * rule fires, a near miss per widening the rule has to survive, and
 * one reading of the workflow itself saying that the thing the rule
 * looks for — a phrase in a statement, a member on a node — is
 * written in it at all.
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
 * source that is gone is reported by the roster case in
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
      'roster case in `workflows.test.ts` is what says so.',
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

// ---------------------------------------------------------------------------
// What a node does with its own failure
// ---------------------------------------------------------------------------

/**
 * The `onError` value that hands a failed node's own input on down
 * the output every ordinary edge leaves by.
 *
 * Measured in `n8n-core` 2.15.0, where the whole of it happens. The
 * executor admits two values that let a pass carry on past a node
 * that threw, and under either of them it puts that node's INPUT
 * items on an output as though the node had produced them; this is
 * the one that puts them on output 0. It then clears the error at
 * the top of the next node's turn, so the pass reaches the end with
 * nothing left to report and the execution is recorded as a success.
 * The failure is in that node's own run data and nowhere else.
 *
 * Which is what turns a write that did not happen into one that
 * reads as though it did. Every statement this workflow runs writes:
 * two claim a due row and reschedule it in the same statement, one
 * opens the `runs` row that attributes the schedule, two close a run
 * by outcome. Set `Open Run` to this and a failed insert hands the
 * units it was given straight on to `Invoke Target Workflow`, which
 * dispatches every one of them against a run row that was never
 * opened, and the tick comes back green. Nothing counts rows written
 * against items received, so the first sign of it is a table that
 * stopped growing.
 *
 * The setting is argued in three places in this package already, two
 * of them on this workflow's own canvas, and all three argue it at
 * `Invoke Target Workflow`, where what it would cost is a failed
 * dispatch handed to the node that closes a run as succeeded. Those
 * are about the one node that has a failure to route. The nodes that
 * have none are where the cost is a lost write, and for them there
 * is no clause in a statement and no edge in the graph to read
 * instead: a sweep over the member is the whole of what says
 * anything about them.
 *
 * An absent setting is neither this nor an omission. The same
 * reading falls back to a legacy boolean when `onError` is missing
 * and that boolean defaults to false, so a node carrying nothing
 * stops the pass — which is why all but one of this workflow's nodes
 * carry nothing, and why the rule is keyed to a value rather than to
 * the member being written. The retry guard in `workflows.test.ts`
 * is the other way round and says so: there absent and the refused
 * value behave alike, so that rule is deliberately stricter than the
 * executor.
 *
 * It is a habit diverged from rather than a gap filled. In the
 * workflow set this port draws from every one of the 76 nodes that
 * carry the setting at all carries this value, and not one carries
 * the value that routes a failure — measured over its built output —
 * which is the mechanism under the incident `src/lib/schedule.ts`
 * records, where a pass spent a month of model budget in about forty
 * minutes and recorded every run of it as a success.
 *
 * Spelled here for the rule and again in each of the plants, so the
 * value and the nodes it has to fire on are two spellings of it
 * rather than one compared with itself. That is the split
 * {@link BATCH_VALUES} draws in this file, and for its reason.
 */
const CONTINUE_ON_REGULAR_OUTPUT = 'continueRegularOutput';

/**
 * Whether `node` is set to carry on down its regular output when it
 * fails.
 *
 * A parsed member, and the member the executor reads. A value
 * spelled in a display name, in a sticky note or inside a
 * statement's prose decides nothing, and this workflow spells a good
 * deal in all three.
 *
 * What it does not read is `continueOnFail`, the boolean the
 * executor still falls back to when `onError` is absent. A node
 * carrying `continueOnFail: true` and no `onError` carries on down
 * its regular output exactly as one carrying
 * {@link CONTINUE_ON_REGULAR_OUTPUT} does, and nothing here sees it
 * — measured in the same reading. So the rule is narrower than the
 * property it stands for, and what it covers is the member a source
 * written today spells: the boolean is what the format wrote before
 * the setting existed, and no source under `workflows/src/` carries
 * one. The edit is a second read arriving with the first source that
 * does.
 *
 * A node left `disabled` answers as an enabled one does, the reading
 * the rosters next door record of their own matchers. Here it is the
 * intended answer rather than a limit: what is asserted is that no
 * source carries the setting, and switching a node off is lost on
 * the next import anyway, the instance being a deploy target and
 * never a source.
 */
function continuesPastAnError(node: BuiltWorkflowNode): boolean {
  return node.onError === CONTINUE_ON_REGULAR_OUTPUT;
}

/**
 * A node that writes a row, planted under `name` with its `onError`
 * set to `setting`.
 *
 * Built on {@link plantedQueryNode} so a plant carries a statement
 * and an operation beside the setting under test: a rule reading
 * some other member has something to find and still has to answer
 * the way its plant declares. The statement is also what the
 * argument is about — what this setting costs is a write that did
 * not happen, so a plant with nothing to write would stand for a
 * node with nothing to lose.
 *
 * Named for what the node does rather than for the value it carries,
 * as every node planted in this suite is.
 */
function plantedWritingNode(
  name: string,
  setting: string,
): BuiltWorkflowNode {
  return {
    ...plantedQueryNode(name, { query: PER_ITEM_STATEMENT }),
    onError: setting,
  };
}

/**
 * A writing node set to carry on down its regular output, which is
 * the one shape the sweep has to name.
 */
const CARRY_ON_PLANT = plantedWritingNode(
  'Write A Row And Carry On',
  'continueRegularOutput',
);

/**
 * A writing node set to put its failures on a second output.
 *
 * The near miss for a rule keyed to the member rather than to what
 * is in it, and the closest one there is: it is the other value the
 * executor lets a pass carry on under, and it is what
 * `Invoke Target Workflow` is set to, so a rule reading the member
 * alone reports this workflow's own branch as an offender.
 */
const ROUTE_FAILURE_PLANT = plantedWritingNode(
  'Write A Row And Route Its Failure',
  'continueErrorOutput',
);

/**
 * A writing node set to stop the pass, which is the third value the
 * setting admits: measured in `n8n-workflow` 2.15.0, whose schema
 * for the member is an enum of exactly these three.
 *
 * The near miss for a rule keyed to anything but the routing value.
 * Stopping is the loud outcome and the one an absent setting behaves
 * as, so a rule flagging it would refuse a workflow that fails
 * safely — and no node here carries it, which leaves the case behind
 * this one the only thing that would report a rule that flagged it.
 */
const STOP_THE_PASS_PLANT = plantedWritingNode(
  'Write A Row And Stop',
  'stopWorkflow',
);

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
  // its kind routes to, and the two arrive one at a time: phase 5
  // delivered `ar-ingest` for a claimed topic and `ar-digest` for a
  // claimed subscription is phase 6's, so a tick now records
  // successes and failures side by side. A unit routed at the second
  // still fails — the id resolves and nothing on the instance
  // answers to it. That is the accurate record rather than a fault
  // to suppress, and what makes it a record at all is that the
  // failure has somewhere to go. A node that fails and routes its
  // failure nowhere drops the item, so the row `Open Run` opened for
  // that unit keeps the status it was opened with and nothing ever
  // closes it — a run left running for a dispatch that finished.
  //
  // Two things have to hold for the branch to exist and neither
  // implies the other, which is why both are in the record. The node
  // carries `onError` set to the value that appends a second output
  // for its own failures, which is what makes an output index of 1
  // an output at all; and an edge leaves that output for a node that
  // closes the run. Take the setting away and the edge is still
  // written in `connections`, still legal, and wired to an output
  // the executor never builds — so a reading of the graph alone
  // passes over a workflow that drops every failure it has. What is
  // read here is that this one node routes its failures somewhere;
  // that no node anywhere in the workflow is set to the other
  // continuing value, the one that carries on down its regular
  // output, is swept over every node by the last two cases in this
  // file.
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
  // Measured, seven legs. Three move a second case in this file.
  // `inboundEdgeLabels` answering nothing, and answering every edge
  // in the workflow, each redden this case and the wiring case
  // above, both of them reading it. The setting dropped from the
  // invocation reddens this case and the setting sweep at the end of
  // the file, which is the same fact read twice: with the member
  // gone the edge is still written in `connections`, still legal,
  // and wired to an output the executor never builds, while the
  // sweep's own guard loses the one node that says it reads a member
  // this workflow carries. The other four redden this one alone, one
  // per edit the property is about and none of them reachable by
  // mutating a module: the error output wired nowhere; the two
  // closers swapped across the two outputs; the closing node's
  // `parameters` emptied, so the branch ends in a node running no
  // statement; and that node renamed in `nodes` alone, which moves
  // the canvas half and the arriving set together. A tree with no
  // artifact in it is none of the seven: it reports no case at all,
  // `loadBuiltWorkflows` refusing before any of them runs, and only
  // the class in the run log says which refusal it was.
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

  // The rule that keeps a failure a failure: no node in
  // `ar-dispatch` is set to carry on down its regular output after
  // one.
  //
  // What the setting does is measured and argued on the constant
  // this reads. What it costs is a write that did not happen
  // reported as one that did. The executor hands a failed node's own
  // input to the node behind it, clears the error, and records the
  // pass as a success, so a failed `Open Run` dispatches every unit
  // it was handed against a run row that does not exist and the tick
  // comes back green.
  //
  // It is the second reading this file takes of how this workflow
  // handles a failure, and the one that is about every node. The
  // case above holds the invocation's failures to the node that
  // closes their run, reading the setting off that one node because
  // that is the node with a failure to route. This reads the same
  // member off all of them, which is the only reading in this suite
  // that reaches the nodes nobody wrote a branch for.
  //
  // Held against an empty array rather than counted, because the
  // answer is already the report: `nodesMatching` labels every
  // offender `<file>:<node name>`, which names the source to open
  // under `workflows/src/` and the node inside it.
  //
  // An empty answer is also the passing answer, so what this is
  // worth is what its input, its walk and its matcher are worth. The
  // input is refused twice over, once for the tree and once for the
  // workflow, both argued at the head of this file. The walk is
  // `nodesMatching`, which refuses nothing and is worth what it was
  // handed; that it reaches every node it was handed is asserted of
  // the same walk by the sweep-coverage case in `workflows.test.ts`.
  // The matcher, and that this workflow carries the member it reads
  // at all, are what the case behind this one stands behind.
  it('leaves no node carrying on down its regular output', () => {
    const flagged = nodesMatching(
      [dispatchWorkflow()],
      continuesPastAnError,
    );

    expect(flagged).toEqual([]);
  });

  // The half an empty list cannot say: that the rule behind it would
  // have named an offender had there been one, and that it would
  // have named nothing else.
  //
  // Four halves in one record, so a failure names which of them
  // moved rather than reporting that the guard broke.
  //
  // The first says the rule fires. Its plant spells the value out
  // rather than reading the constant the rule reads, so the two are
  // two spellings of it: emptied or misspelled, the constant leaves
  // this half red while the claim above goes on passing over a
  // workflow whose nodes carry nothing it would match.
  //
  // The two behind it are near misses, one per widening, and each is
  // a value the executor admits. The routing value stands against a
  // rule keyed to the member rather than to what is in it, and it is
  // what the one node in this workflow that carries the setting is
  // set to, so that widening reddens the claim above as well. The
  // stopping value stands against a rule keyed to anything but the
  // routing one: it stops the pass, which is the loud outcome and
  // the one an absent setting behaves as, and no node here carries
  // it, so nothing but this half would report a rule that flagged
  // it.
  //
  // The fourth is about the workflow rather than the rule. The
  // member this reads IS written in `ar-dispatch`, on the node that
  // routes its failures, so the empty list above is a rule reading a
  // member the workflow uses rather than one nothing carries. It
  // asks only that something carries it, which is what parts it from
  // the case above: that one holds a named node to a named value as
  // part of the branch it describes, and this asks whether the sweep
  // had anything to look at.
  //
  // Measured, eight legs, each naming the half it is about. A
  // matcher recognising nothing reddens the first half alone and
  // leaves the claim above green, which is the vacuity this case
  // exists for; recognising everything reddens the claim and this
  // together. Emptying the constant, and moving the plant's value
  // off the one the rule reads, each redden the first half alone
  // with the claim green, which is what the two spellings are for.
  // Widening to the stopping value reddens the third half alone, and
  // widening to the routing value reddens the second half and the
  // claim together — the difference between a widening no node here
  // would meet and one this workflow's own branch already meets. Two
  // are edits to the built artifact rather than to a module: a node
  // planted carrying the value reddens the claim alone, and the
  // setting dropped from `Invoke Target Workflow` reddens the fourth
  // half alongside the routing case above. A tree with no artifact
  // in it is none of the eight: it reports no case at all, and only
  // the class in the run log says which refusal it was.
  it('flags the setting that carries on and nothing beside it', () => {
    const workflow = dispatchWorkflow();
    const detector = {
      carriesOnDownTheRegularOutput: continuesPastAnError(CARRY_ON_PLANT),
      routesTheFailureToASecondOutput:
        continuesPastAnError(ROUTE_FAILURE_PLANT),
      stopsThePassInstead: continuesPastAnError(STOP_THE_PASS_PLANT),
      theSettingIsWrittenSomewhereInThisWorkflow: workflow.nodes.some(
        (node) => node.onError !== undefined,
      ),
    };

    expect(detector).toEqual({
      carriesOnDownTheRegularOutput: true,
      routesTheFailureToASecondOutput: false,
      stopsThePassInstead: false,
      theSettingIsWrittenSomewhereInThisWorkflow: true,
    });
  });
});
