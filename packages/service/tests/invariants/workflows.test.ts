/**
 * The workflow invariants, run against the tree this package
 * actually builds.
 *
 * The reader is unit-tested next door over fixture trees, and the
 * rosters over planted nodes. This file is where both meet
 * `workflows/dist/`, which `pretest` rebuilds for the `test`
 * script so a default run reads a tree a real bun process wrote.
 *
 * What it proves is a property of the artifact an operator uploads
 * rather than of the source it was built from. A workflow reaches an
 * instance as built output — markers resolved, a library spliced
 * whole into the Code-node body that runs it, the envelope
 * serialized by `buildTemplate` — so a rule about what may run there
 * is a rule about the artifact. Read over `workflows/src/` the same
 * sweep meets a cron field and a node body that are both still
 * markers, and answers about a file no instance loads. The
 * properties are the roster this phase expects, the send-free rule,
 * the one schedule trigger, the guards in front of a model call, and
 * the forbidden names. The roster, the send-free rule, the one
 * schedule trigger and two of those three guards stand here today,
 * beside the surface they all read; the per-run-ceiling guard and
 * the forbidden-name sweep arrive with their own cases over the
 * rest of this stage.
 *
 * That surface is PARSED nodes and never the artifact's text.
 * `loadBuiltWorkflows` hands over each artifact's own `nodes` array
 * with every entry's `name` and `type` already tested and the rest
 * of a node reachable as `unknown`, narrowed by whichever check
 * reads it. What a check reads is a member, because a member is what
 * decides which code an instance loads and how it runs. A node type
 * spelled in a sticky note, in a SQL comment or inside a Code-node
 * body decides nothing at all, so it can neither satisfy a check nor
 * fail one, which is exactly the difference a sweep over the file's
 * characters cannot make. Two properties here are not about a member
 * at all: the roster, whose subject is which artifacts the tree
 * holds before anything is read out of one, and the forbidden-name
 * sweep, whose subject really is every character that reaches an
 * instance — a case for that sweep serializes the parse back rather
 * than reading anything out of it.
 *
 * The other half is what stops the file passing by finding
 * nothing. Most of those properties are absences, and an absence
 * check handed nothing prints what one over a clean tree prints.
 * `workflow-dist.ts` parts the two by refusing rather than by
 * answering: a `workflows/dist/` that is absent, is not a
 * directory or holds no `*.json` is `EmptyDistDirectoryError`,
 * and an artifact carrying no node is `EmptyWorkflowError`. Both
 * fire at module scope, before a case runs, so a build that
 * produced no workflow takes this file down naming the tree it
 * looked in and the command that fills it. There is no run of
 * this file over nothing that reports a pass.
 *
 * Which is why the read sits at module scope rather than in a
 * case, the way `naming.test.ts` resolves its scan surface there:
 * once there are no built workflows there is nothing left to
 * assert about them, that failure belongs to the file, and the
 * refusal already names the edit.
 */
import type { BuiltWorkflow, BuiltWorkflowNode } from './workflow-dist.js';

import { describe, expect, it } from 'vitest';

import { loadBuiltWorkflows, nodesMatching } from './workflow-dist.js';
import {
  isModelNode,
  isScheduleTrigger,
  isSendCapable,
  queryParametersOf,
} from './workflow-rosters.js';

// ---------------------------------------------------------------------------
// Built tree
// ---------------------------------------------------------------------------

/**
 * Every built workflow, read once for the whole file.
 *
 * At module scope deliberately, and `naming.test.ts` resolves its
 * own scan surface the same way: a read that comes back with
 * nothing to assert over throws, and that failure belongs to the
 * file rather than to one case. No directory is named, so this is
 * `DIST_DIR`, the tree this package builds. The cases over the
 * reader itself hand it trees of their own, which is what keeps
 * its two refusals reachable while this one is healthy.
 */
const BUILT_WORKFLOWS = loadBuiltWorkflows();

// ---------------------------------------------------------------------------
// What this phase expects that tree to hold
// ---------------------------------------------------------------------------

/**
 * The workflows phase 3 expects the built tree to hold, by id and in
 * the order the read hands them back.
 *
 * Declared rather than derived, which is what leaves a case standing
 * on it with anything to say. `buildAll` writes one artifact per
 * source under the source's own name, so a roster read out of
 * `workflows/src/` would agree with the built tree by construction,
 * holding whatever the build wrote against whatever the build wrote.
 * What is written down here is what this phase says the tree is for,
 * taken off the roster table in `workflows/src/README.md`, where the
 * entries the later phases deliver are named too.
 *
 * By id and never by file name. That README's 1:1 rule is that a
 * workflow is one file called `<workflow-id>.json`, and the build
 * writes each artifact under its source's own name, so a file name
 * is a derivation and an id is the one thing to keep in step with
 * the table.
 *
 * Nothing re-runs the forbidden-name scan over these strings,
 * `tests/` being outside its scan roots, and nothing needs to. An
 * entry naming no artifact fails the case that reads this roster,
 * and the artifact an entry does name was built from a source under
 * `workflows/` — which that scan reads.
 */
const PHASE_3_WORKFLOW_IDS = ['ar-dispatch'] as const;

// ---------------------------------------------------------------------------
// The send-free rule
// ---------------------------------------------------------------------------

/**
 * Whether a node is one the send roster names, composed the way
 * {@link isSendCapable} says a sweep over built output composes it:
 * the matcher answers for a type, and the read of the member
 * carrying that type happens at the call site.
 *
 * Shared by the claim and the case standing behind it rather than
 * written out twice, because a second spelling is a second place
 * the wrong member can be read. `name` where `type` belongs is the
 * mistake this composition invites: every node carries both, the
 * matcher answers no for a display name, and an absence check
 * reports that the way it reports a clean tree. Measured: swapping
 * the member here reddens no case in this file today. The control
 * arriving later in this stage, which plants a send node into a
 * parsed copy and expects the sweep to name it, is what will.
 */
function isSendCapableNode(node: BuiltWorkflowNode): boolean {
  return isSendCapable(node.type);
}

// ---------------------------------------------------------------------------
// The one schedule trigger
// ---------------------------------------------------------------------------

/**
 * The workflow the one schedule trigger belongs to, by id.
 *
 * Declared rather than read off {@link PHASE_3_WORKFLOW_IDS}, which
 * spells the same id and today holds nothing else. The two are
 * separate claims that coincide while the tree holds one workflow:
 * that roster says which artifacts the build is expected to produce,
 * this says which one of them schedules. Five more workflows arrive
 * in phases 5 and 6 and none of them is a schedule, so the roster
 * grows and this stays a set of one — which is the property itself,
 * and is what a value derived from a list that grew with it would
 * stop asserting.
 *
 * By id and never by file name, for the reason
 * {@link PHASE_3_WORKFLOW_IDS} gives: a workflow is one file called
 * `<workflow-id>.json`, so a file name is a derivation and an id is
 * the thing to keep in step with the roster table in
 * `workflows/src/README.md`.
 */
const SCHEDULE_TRIGGER_WORKFLOW_ID = 'ar-dispatch';

// ---------------------------------------------------------------------------
// The retry guard in front of a model call
// ---------------------------------------------------------------------------

/**
 * Whether a node is one the retry guard names an offender: a model
 * node that does not carry `retryOnFail` written `false`.
 *
 * Composed at the call site the way {@link isSendCapableNode} is
 * and for the reason that one gives, with one read more.
 * {@link isModelNode} answers for a type, so the member carrying
 * that type is read here rather than inside it; `retryOnFail` is a
 * node member of its own, which `BuiltWorkflowNode` deliberately
 * leaves reachable as `unknown` instead of declaring, so this is
 * where it gets narrowed. Neither read is one a rule keyed to the
 * artifact's text could make. A node body, a display name and a
 * sticky note can each spell a model type or a retry setting, and
 * none of them decides anything about what runs.
 *
 * Written `false`, and not merely not written `true`, which is a
 * stricter rule than the behaviour it stands for. Measured in
 * `n8n-core` 2.15.0: all four places that read this member test
 * `retryOnFail === true`, so a node carrying `false` and a node
 * carrying nothing at all run the same way, one try each. What the
 * strict form buys is that the setting was decided rather than
 * defaulted. A file under `workflows/src/` is hand written, and
 * that directory's README states the instance is a deploy target
 * and not a source, so an absent member here is a decision nobody
 * made rather than one a canvas export dropped on the way back.
 * Being wrong about that costs a line in the source; the loose
 * rule's cost is a model node whose retry setting no review saw.
 */
function isModelNodeWithoutRetryOff(node: BuiltWorkflowNode): boolean {
  return isModelNode(node.type) && node.retryOnFail !== false;
}

// ---------------------------------------------------------------------------
// The ledger row behind a model call
// ---------------------------------------------------------------------------

/**
 * The table a model call's ledger row is written to.
 *
 * `src/db/schema/runs.ts` declares it and argues what it is for.
 * `runs` accounts for a pass as a whole; this accounts for the same
 * work one call at a time, which is the granularity the question of
 * what a call cost is asked at. A ceiling declared in a workflow
 * states what a pass will do and these rows are what it did, so a
 * ceiling that quietly stopped being applied reads exactly like a
 * pass whose input happened to be small.
 *
 * Nothing in the schema enforces the write. A call whose row was
 * never written is missing from every total at once and no
 * constraint can notice it, which is why the property is asserted
 * against the workflow that should have written the row rather than
 * against the rows — and so why it is asserted over the artifact an
 * instance loads rather than anywhere a query could reach.
 *
 * Spelled once and read from here by both the rule that matches it
 * and the nodes planted for that rule, so a rename cannot leave the
 * two disagreeing about what a ledger write is. What that costs is
 * that a plant compares this string against itself, which is the
 * send roster's argument for the same shape and the reason the
 * controls beside the plant are what carry the weight.
 */
const LEDGER_TABLE = 'llm_calls';

/**
 * A SQL line comment, from its dashes to the end of its line.
 *
 * Stripped out of a statement before anything is matched in it, and
 * what makes that necessary is this port's own convention rather
 * than a general caution about comments. A workflow source has no
 * comment syntax of its own, so a node's `query` is one of the few
 * tracked homes a decision made at a node has, and every statement
 * `ar-dispatch` runs carries paragraphs of prose inside it. The
 * prose most likely to name a checked thing is the prose explaining
 * the check, so a rule reading a statement whole would be answered
 * by a comment about the ledger as readily as by a write to it.
 *
 * Global, and used only with `replace`. A shared global instance
 * carries `lastIndex` from one `test` into the next, which is why
 * `naming-patterns.ts` keeps its patterns as sources rather than
 * as instances; `replace` resets it, so one instance is safe here.
 */
const SQL_LINE_COMMENT = /--[^\n]*/gu;

/**
 * An insert into {@link LEDGER_TABLE}, however it is spaced and
 * whether or not it names the schema.
 *
 * Built from the table name rather than spelling it a second time,
 * which leaves one place to edit under a rename. What it does not
 * buy is a check on the name itself: the nodes planted for the rule
 * are built from the same constant, so an emptied one moves both
 * sides together and nothing in this file reads it — measured, and
 * green throughout. That is the send roster's argument about a
 * plant comparing a string against itself, and it is why the
 * samples that do NOT carry the name are what say the rule is
 * keyed to it.
 *
 * An insert and not the name on its own, because what the rule is
 * about is a row being kept. A statement that SELECTs from the
 * ledger reads it, a statement naming it in a comment writes
 * nothing, and a rule keyed to the name alone takes both for the
 * write. Bounded either side by a class admitting everything a
 * table name cannot carry, so `llm_calls_archive` is a different
 * table and a quoted spelling of this one is still this one. Folded
 * for case because SQL keywords are, and matched across the
 * whitespace a wrapped statement puts between its words.
 */
const LEDGER_INSERT = new RegExp(
  '(^|[^A-Za-z0-9_])insert[ \t\r\n]+into[ \t\r\n]+' +
  `(public[.])?${LEDGER_TABLE}([^A-Za-z0-9_]|$)`,
  'iu',
);

/**
 * Whether `workflow` holds a node that makes a model call.
 *
 * The antecedent of the rule, and a property of a WORKFLOW where
 * every other matcher in this file answers for a node. That follows
 * from what the property joins rather than from taste: the node
 * making the call and the node keeping the row are two nodes, and
 * what has to hold is that one workflow carries both, so a check
 * over nodes alone has nowhere to put it.
 *
 * Read off {@link BuiltWorkflow.nodeTypes} rather than through
 * {@link nodesMatching}, for the reason the schedule-trigger case
 * gives: what this needs is the artifact and not the node, and the
 * label that walk hands back gives the artifact up only by being
 * split, which its own docs say never to do.
 */
function holdsModelNode(workflow: BuiltWorkflow): boolean {
  return workflow.nodeTypes.some((type) => isModelNode(type));
}

/**
 * Whether `node` writes a row to {@link LEDGER_TABLE}.
 *
 * Read off the statement the node runs and never off the artifact's
 * text, which is {@link queryParametersOf}'s whole argument: an
 * artifact is one JSON document, so a phrase searched for across it
 * is answered alike by a sticky note, a display name and the SQL of
 * some other node. Read off the parameter, a claim about a write is
 * a claim about the node that makes it.
 *
 * The limit is a workflow that keeps its ledger row any way but in
 * SQL. An HTTP node posting to a service, or a Code node handing
 * the row to something else, carries no statement for this to read
 * and would pass as a workflow keeping nothing. What makes that
 * narrow rather than a hole is where such a row has to end up:
 * `docs/architecture/00-overview.md` puts every durable fact in
 * Postgres and says no logic bypasses the database, so a ledger row
 * arriving any other way is a departure from that before it is a
 * miss here.
 */
function writesLedgerRow(node: BuiltWorkflowNode): boolean {
  return queryParametersOf(node)
    .some((query) => LEDGER_INSERT.test(query.replace(SQL_LINE_COMMENT, ' ')));
}

/**
 * A statement that keeps a ledger row, as the node making the call
 * would run it.
 *
 * Fixture SQL and not a statement any workflow carries — none
 * does, the workflows that call a model being phase 6. What is
 * asserted over it is the reading. What a real ledger write owes
 * beyond an insert is the run it charges the call to, which
 * `src/db/schema/runs.ts` argues at length and which nothing here
 * reads.
 */
const LEDGER_WRITE =
  `INSERT INTO ${LEDGER_TABLE} (run_id, est_tokens)\n` +
  'VALUES ($1::bigint, $2::integer)';

/**
 * The same statement against another table: an insert that keeps a
 * row, and no ledger row.
 *
 * The nearest legitimate neighbour rather than an invented one.
 * `ar-dispatch` opens a `runs` row per claimed unit and this is the
 * shape of what it runs, so the control stands for a statement the
 * built tree really carries rather than for one nothing would
 * write. What it shares with {@link LEDGER_WRITE} is the insert;
 * what parts them is the table, and the columns that go with it,
 * which no rule here reads.
 */
const RUN_WRITE =
  'INSERT INTO runs (domain_id, scheduled_by)\n' +
  'VALUES ($1::bigint, $2)';

/**
 * A statement that names the ledger insert in a comment and runs
 * none.
 *
 * The control {@link SQL_LINE_COMMENT} exists for, carrying the
 * matched text verbatim rather than a paraphrase of it: a strip
 * that stopped running would take this for a write, and a control
 * quoting something the rule no longer fires on could not report
 * that. The comment sits after the opening clause rather than at
 * the head of the statement, which is where every comment in this
 * port's own statements sits — a Postgres node reads a query whose
 * first characters are dashes as a SELECT, and what it emits for an
 * empty result turns on that.
 */
const LEDGER_MENTION =
  'SELECT id FROM runs WHERE status = $1\n' +
  `-- Each call runs an INSERT INTO ${LEDGER_TABLE} of its own, from\n` +
  '-- the node that made it rather than from here.';

/**
 * A Code node body that names the ledger insert.
 *
 * The member control, and the shape `workflow-rosters.test.ts`
 * plants against the model prefix for the same reason: a body is a
 * parameter like any other, and a script mentioning a write makes
 * none. {@link queryParametersOf} reads `query` and nothing else,
 * so this node answers nothing and the rule never sees the text.
 */
const LEDGER_MENTION_BODY =
  `// One INSERT INTO ${LEDGER_TABLE} per call, kept by the node\n` +
  '// that made it.\n' +
  'return $input.all();';

/** One node {@link writesLedgerRow} is driven over. */
interface LedgerSample {
  /** What the node carries, in prose, and the name of its row. */
  readonly label: string;

  /** The answer {@link writesLedgerRow} must give for it. */
  readonly writes: boolean;

  /** The node, planted. */
  readonly node: BuiltWorkflowNode;
}

/**
 * The nodes {@link writesLedgerRow} is driven over, one per answer
 * it has to give.
 *
 * One accepts and three refuse, and they are each other's control:
 * a rule recognising nothing leaves the accepting sample answering
 * no, one recognising everything leaves all three refusals
 * answering yes, and the comparison names whichever moved. Neither
 * half needs a control written for it separately. Each refusal is a
 * wrong rule this file could plausibly have shipped rather than an
 * input nothing would produce — a write to another table, a comment
 * about the write, and the write named in the one parameter the
 * reader does not read.
 *
 * Named for what each node does, as every node planted in this
 * suite is, and named apart from the nodes `ar-dispatch` carries so
 * a label here cannot be read as a claim about one of those.
 */
const LEDGER_SAMPLES: readonly LedgerSample[] = [
  {
    label: 'a node inserting a row into the ledger',
    writes: true,
    node: {
      name: 'Ledger The Call',
      type: 'n8n-nodes-base.postgres',
      parameters: { operation: 'executeQuery', query: LEDGER_WRITE },
    },
  },
  {
    label: 'a node inserting a row into another table',
    writes: false,
    node: {
      name: 'Open A Run',
      type: 'n8n-nodes-base.postgres',
      parameters: { operation: 'executeQuery', query: RUN_WRITE },
    },
  },
  {
    label: 'a node whose comment names the ledger insert',
    writes: false,
    node: {
      name: 'Read The Running Passes',
      type: 'n8n-nodes-base.postgres',
      parameters: { operation: 'executeQuery', query: LEDGER_MENTION },
    },
  },
  {
    label: 'a Code node whose body names the ledger insert',
    writes: false,
    node: {
      name: 'Plan The Calls',
      type: 'n8n-nodes-base.code',
      parameters: { jsCode: LEDGER_MENTION_BODY },
    },
  },
];

describe('workflow invariants — built tree', () => {
  // The surface every check in this file reads, asserted where it
  // is used rather than taken on trust. `loadBuiltWorkflows` refuses
  // an artifact carrying no node, so nothing empty reaches a case;
  // what it does not refuse is a surface that has come apart from
  // the artifact it was read out of. Both ties are the reader's own
  // documented contract and the parse proves neither: `nodes` is
  // meant to BE the envelope's array rather than a copy, which is
  // what makes a check over parsed nodes a check over the file an
  // operator uploads, and `nodeTypes[i]` is meant to be
  // `nodes[i].type`, which is what lets a case counting types and a
  // case naming offenders be about the same nodes.
  //
  // Compared as one record per artifact rather than node by node, so
  // a failure names the file to open and prints the whole surface
  // beside what the parse says it should have been.
  it('hands over the parsed nodes each artifact carries', () => {
    const handed = BUILT_WORKFLOWS.map((workflow) => ({
      file: workflow.file,
      envelopeNodes: Object.is(workflow.nodes, workflow.parsed['nodes']),
      types: [...workflow.nodeTypes],
    }));
    const carried = BUILT_WORKFLOWS.map((workflow) => ({
      file: workflow.file,
      envelopeNodes: true,
      types: workflow.nodes.map((node) => node.type),
    }));

    expect(handed).toEqual(carried);
  });

  // Held as an ordered list rather than as two sets, for two
  // reasons. `loadBuiltWorkflows` sorts, and `PHASE_3_WORKFLOW_IDS`
  // is written in that order. A comparison sorting both sides again
  // would be answered by a read that never sorted at all, and a
  // roster naming one id twice would come back as the same set as
  // one naming it once. An array parts both.
  //
  // Equality and not containment, because what this exists to catch
  // is an artifact whose source is gone. The build writes one
  // artifact per source and sweeps nothing, `workflows/dist/` is
  // gitignored so no diff reports a stale file in it, and the build
  // never reads that directory back — so a renamed or deleted source
  // leaves its artifact standing, where every check in this file
  // goes on reading it as a workflow this package builds. A roster
  // asserted as a subset passes over exactly that, and the schedule
  // trigger a stale copy still carries is what would break the
  // one-trigger case for a reason nobody's diff explains.
  //
  // The node half is a second reader of what `loadBuiltWorkflows`
  // already refuses: an artifact carrying no node is
  // `EmptyWorkflowError` before a case runs, so over this tree that
  // member can only read true. It is asserted anyway because the
  // absence checks in this file rest on it and the refusal supplying
  // it is a module away — relax that refusal and this is what
  // reddens, rather than every absence check passing quietly over a
  // workflow with nothing in it to look at.
  //
  // One record per artifact and one comparison, the way the case
  // over the reader's surface reads: a walk that reached no workflow
  // fails on the record list rather than passing through an
  // expectation nothing ran.
  it('holds every workflow the phase-3 roster expects', () => {
    const built = BUILT_WORKFLOWS.map((workflow) => ({
      file: workflow.file,
      hasNodes: workflow.nodes.length > 0,
    }));
    const expected = PHASE_3_WORKFLOW_IDS.map((id) => ({
      file: `${id}.json`,
      hasNodes: true,
    }));

    expect(built).toEqual(expected);
  });

  // The send-free rule read over built output: not one node of a
  // type that can reach outward, in any workflow this package
  // builds. `workflows/src/README.md` states it over the workflow
  // set and `docs/architecture/01-invariants.md` argues what its
  // absence costs.
  //
  // Held against an empty array rather than counted, because the
  // answer is already the report. `nodesMatching` labels every
  // offender `<file>:<node name>`, so a failure prints the whole
  // list on the way past and names each source to open under
  // `workflows/src/`; one naming only the first offender turns a
  // single edit into as many runs as there are offenders.
  //
  // An empty answer is also the passing answer, so what this is
  // worth is what its input, its walk and its matcher are worth.
  // The input is covered a module away, `loadBuiltWorkflows`
  // refusing an empty tree and an artifact with no node before a
  // case runs. The walk is covered by the sweep-coverage case in
  // this section. The matcher is covered over planted nodes in
  // `workflow-rosters.test.ts`, and over this tree by the control
  // arriving later in this stage.
  it('holds no send-capable node in any built workflow', () => {
    expect(nodesMatching(BUILT_WORKFLOWS, isSendCapableNode)).toEqual([]);
  });

  // The half a list held against an empty one cannot say: that the
  // sweep was handed anything to look at. A walk answering with
  // nothing because it visited nothing prints what a walk over a
  // clean tree prints, and no assertion over the answer parts the
  // two — `nodesMatching` says as much of itself, having no refusal
  // of its own and being worth what it was handed.
  //
  // So the predicate records what it was asked about, and what it
  // recorded is held against the types the reader counted. Two
  // mechanisms rather than one: the left side is the walk's own
  // call sequence, the right a direct map over what was read.
  // `nodeTypes` and not a second read of `nodes`, because the
  // surface case ties the two index for index, so this rests on
  // that tie rather than working around it.
  //
  // What it says holds for any sweep built on the same walk, not
  // only the send-free one, so the sweeps arriving later in this
  // stage rest on it rather than each repeating it.
  it('sweeps every node the built tree carries', () => {
    const swept: string[] = [];

    nodesMatching(BUILT_WORKFLOWS, (node) => {
      swept.push(node.type);

      return isSendCapableNode(node);
    });
    const carried = BUILT_WORKFLOWS.flatMap((workflow) => workflow.nodeTypes);

    expect(swept).toEqual(carried);
  });

  // The one-trigger rule read over built output: one schedule
  // trigger in the whole tree, and `ar-dispatch` is the workflow
  // that carries it. `SCHEDULE_TRIGGER_TYPE` argues why the type is
  // a set of one, and which of a workflow's other triggers are
  // legitimate and start nothing on a clock.
  //
  // Unlike the send-free rule beside it, this one has to FIND
  // something, which inverts what a wrong matcher costs: recognise
  // too little and the list comes back empty, too much and it comes
  // back one entry per node in the tree, and both redden. So it
  // needs no coverage case of its own the way an absence check here
  // does. A matcher or a walk that reached nothing answers with an
  // empty list, and empty is the failing answer here rather than the
  // passing one; the side it is held against is written down rather
  // than read off the tree, so a build that produced no
  // `ar-dispatch` at all reddens it too.
  //
  // Read off `nodeTypes` rather than through `nodesMatching`, for
  // two reasons the reader gives itself. That list is kept undeduped
  // for a count of exactly this shape, where a set would read a
  // workflow carrying two triggers as one carrying one. And what a
  // failure has to name here is the artifact and not the node, which
  // the `<file>:<node name>` label gives up only by being split —
  // which its own docs say never to do, nothing stopping a node name
  // from carrying a colon.
  //
  // So one file name per trigger found, held against a list of one,
  // which is both halves of the property in a single comparison. A
  // second trigger prints as a second file name rather than as a
  // number, and one in the wrong workflow prints the workflow to
  // open.
  //
  // What it rests on and what it does not reach. That `nodeTypes` is
  // the types the artifacts carry, index for index, is the surface
  // case's claim rather than this one's. And a count of one is not a
  // schedule that fires: a trigger left `disabled` is in the tree
  // and on no clock, and neither the type nor a count over it parts
  // that tree from a running one.
  it('holds exactly one schedule trigger, and ar-dispatch carries it', () => {
    const found = BUILT_WORKFLOWS.flatMap((workflow) => workflow.nodeTypes
      .filter((type) => isScheduleTrigger(type))
      .map(() => workflow.file));

    expect(found).toEqual([`${SCHEDULE_TRIGGER_WORKFLOW_ID}.json`]);
  });

  // The first of the three guards in front of a model call, read
  // over built output: not one model node in any built workflow left
  // free to retry. `docs/architecture/01-invariants.md` argues what
  // its absence costs — a retried call against a failing credential
  // is not one failure but one per schedule tick, multiplied by the
  // retry count, which is one of the four properties bounding what a
  // run can spend.
  //
  // Held against an empty array rather than counted, for the reason
  // the send-free case gives: `nodesMatching` labels every offender
  // `<file>:<node name>`, so the answer is the report.
  //
  // It runs across zero nodes, and will until phase 6.
  // `MODEL_NODE_TYPE_PREFIX` records why: the workflows that make
  // model calls are `ar-research` and `ar-digest`, both phase 6, and
  // phase 3 delivers `ar-dispatch` alone. The half of the predicate
  // reading the retry setting is not merely unsatisfied over this
  // tree, it never runs at all — the matcher answers no for every
  // node the tree carries and the conjunction stops there. Measured:
  // gutting that read reddens nothing here, and a matcher
  // recognising nothing reddens nothing either, while one
  // recognising everything reddens this case and the ledger-row case
  // that follows it, which reads the same matcher for an antecedent
  // of its own. So the only mistake in the predicate this tree can
  // report reaches it through the matcher half, and says nothing
  // about the read sitting behind it.
  //
  // What stands behind it meanwhile is the roster's own controls, in
  // `workflow-rosters.test.ts`. A type planted under the namespace
  // and a Code node whose body names a model are each other's
  // control: a matcher recognising nothing reddens the plant, one
  // recognising everything reddens the refusal, and a third case
  // holds the two fixtures against each other so neither drifts off
  // the vendor name they share. Those three are the whole of what
  // says the matcher is live while there is no model node to ask it
  // about, and this case adds none of it. What it adds is that the
  // rule is in place before the nodes are, so phase 6 lands a node
  // rather than a node and a check.
  //
  // The rest of what it is worth, part by part. The input is covered
  // a module away, `loadBuiltWorkflows` refusing an empty tree and
  // an artifact with no node before a case runs. The walk is covered
  // by the sweep-coverage case in this section, which says as much
  // for any sweep built on it. The composition is covered by
  // nothing, here or later in this stage: the control that plants a
  // node into a parsed copy and expects the sweep to name it plants
  // a send node, not a model one.
  it('holds no model node left free to retry', () => {
    expect(nodesMatching(BUILT_WORKFLOWS, isModelNodeWithoutRetryOff)).toEqual([]);
  });

  // The second of the three guards in front of a model call, read
  // over built output: a workflow holding a node that calls a model
  // holds a node writing the ledger row that call is counted in.
  // `docs/architecture/01-invariants.md` names it the property that
  // makes the other four checkable after the fact — a ceiling needs
  // something to count against, and spend nobody can attribute to a
  // run is spend nobody can act on.
  //
  // One record per workflow that owes a row, held against the same
  // records saying it kept one, so a failure prints the artifact to
  // open beside what it was missing. The antecedent is read per
  // workflow and never per node, for the reason `holdsModelNode`
  // gives: the node that calls and the node that keeps the row are
  // two nodes, and the rule is that one workflow carries both.
  //
  // It runs across zero workflows and will until phase 6, which is
  // a different empty from the retry guard.
  // `MODEL_NODE_TYPE_PREFIX` names both: that one is a claim about
  // every model node, so it holds over none of them; this is a
  // claim about every workflow HOLDING one, so its antecedent is
  // false and the implication holds. This is the emptier of the
  // two — with no workflow owing a row, the ledger read is never
  // reached at all.
  //
  // So what stands behind it is elsewhere, in two halves. The
  // matcher is covered over planted nodes in
  // `workflow-rosters.test.ts`, by the mutual-control pair
  // `isModelNode` has there. The ledger read is covered by the case
  // that drives it over planted statements, and by nothing else: no
  // node in the built tree writes a ledger row, so this case cannot
  // exercise that rule and does not. The input is covered a module
  // away, by the two refusals the sweeps in this file rest on. There
  // is no walk to cover, this case reading each workflow's own nodes
  // rather than the sweep those use.
  //
  // Measured, six legs. A matcher recognising every type reddens
  // this case and the retry case, which reads the same matcher;
  // one recognising nothing reddens neither. The ledger read
  // forced true and forced false each leave this case green and
  // redden the sample-driven case instead, which is what running
  // across zero workflows means. A model node planted into the
  // built artifact reddens this case alone, and reddens nothing
  // once a ledger write is planted beside it.
  it('holds a ledger write in every workflow that holds a model node', () => {
    const owing = BUILT_WORKFLOWS
      .filter((workflow) => holdsModelNode(workflow))
      .map((workflow) => ({
        file: workflow.file,
        writesLedgerRow: workflow.nodes.some((node) => writesLedgerRow(node)),
      }));
    const kept = owing.map((workflow) => ({
      file: workflow.file,
      writesLedgerRow: true,
    }));

    expect(owing).toEqual(kept);
  });

  // The rule the ledger-row case cannot exercise, driven over the
  // statements planted for it. Every answer in one comparison and
  // one record per sample, so a failure names which of the four
  // moved rather than reporting that something did.
  //
  // What it cannot report is `LEDGER_SAMPLES` going empty:
  // both sides are derived from it, and one empty list equals the
  // other. That is why the samples are a literal declared beside
  // the rule rather than a list assembled from anywhere else — the
  // edit that would empty it is in the diff that makes it, which is
  // a guarantee about review rather than about the suite, and worth
  // saying so rather than leaving a reader to assume a stronger
  // one.
  //
  // Measured, five legs, each one red case whose failure names the
  // samples that moved. A rule recognising nothing flips the
  // accepting sample alone; one recognising everything flips all
  // three refusals and not the accept. Then one loosening per
  // refusal, which is what says each is keyed to something rather
  // than riding along behind the others: dropping the comment strip
  // flips the commented sample alone, keying the rule to any insert
  // flips the other-table sample alone, and reading every string
  // parameter rather than the query flips the Code-node sample
  // alone.
  it('reads a ledger write off the statement a node runs', () => {
    const read = LEDGER_SAMPLES.map((sample) => ({
      label: sample.label,
      writesLedgerRow: writesLedgerRow(sample.node),
    }));
    const declared = LEDGER_SAMPLES.map((sample) => ({
      label: sample.label,
      writesLedgerRow: sample.writes,
    }));

    expect(read).toEqual(declared);
  });
});
