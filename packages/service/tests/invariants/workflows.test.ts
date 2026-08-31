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
 * the forbidden names. All five stand here, beside the surface they
 * all read.
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
import type { ForbiddenMatch } from './naming-patterns.js';
import type { BuiltWorkflow, BuiltWorkflowNode } from './workflow-dist.js';

import { describe, expect, it } from 'vitest';

import { findForbiddenMatches } from './naming-patterns.js';
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
// What the phases that have landed expect that tree to hold
// ---------------------------------------------------------------------------

/**
 * The workflows phases 3 and 5 have landed, by id and in the order
 * the read hands them back.
 *
 * Declared rather than derived, which is what leaves a case standing
 * on it with anything to say. `buildAll` writes one artifact per
 * source under the source's own name, so a roster read out of
 * `workflows/src/` would agree with the built tree by construction,
 * holding whatever the build wrote against whatever the build wrote.
 * What is written down here is what those phases say the tree is
 * for, taken off the roster table in `workflows/src/README.md`,
 * where the entries the later phases deliver are named too.
 *
 * A closed set that grows inside a phase rather than at the end of
 * one. That table's delivered-in column marks an entry landed as its
 * source arrives, and an id joins this list in the same commit as
 * the source it names, so an entry a phase has still to deliver is
 * missing here for exactly as long as its source is. Phase 5 read
 * that way from inside, its entries arriving one source at a time;
 * what phase 6 has still to deliver — `ar-research` and `ar-digest`
 * — reads that way now. What that buys is the equality below staying
 * a claim about the tree: a roster written ahead of the sources
 * would report a phase's own unfinished middle as a build that lost
 * an artifact.
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
const PHASE_3_AND_5_WORKFLOW_IDS = [
  'ar-capture',
  'ar-dispatch',
  'ar-ingest',
  'ar-score',
] as const;

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
 * the member here reddens the control that splices a send node
 * into a copy of a built workflow, and nothing else in this file
 * — which is the whole of why that control is here, no case next
 * door reading this composition at all.
 */
function isSendCapableNode(node: BuiltWorkflowNode): boolean {
  return isSendCapable(node.type);
}

/**
 * A node of a type the send roster names, for splicing into a
 * copy of a built workflow.
 *
 * Two members and no more, which is the whole of what a sweep
 * reads off it: `nodesMatching` hands a node to a predicate,
 * {@link isSendCapableNode} reads its `type`, and the label a
 * match comes back as is built from its `name`. A parameter here
 * would be text the property is not about.
 *
 * The type is written out rather than read off `SEND_NODE_TYPES`,
 * so the plant and the roster are two spellings and a case can
 * ask whether they still agree — which is what one guard half
 * beside the claim does. The entry it stands for is the
 * provider-agnostic send node, which that roster calls the entry
 * a workflow acquires by accident.
 *
 * The name is a display name and nothing the roster answers for,
 * which is the point rather than an accident: the mistake this
 * sweep's composition invites is reading `name` where `type`
 * belongs, and a plant whose name were itself a send type would
 * leave that mistake green. The other guard half holds the plant
 * to it.
 *
 * Named for what the node does, as every node planted in this
 * suite is, and named apart from the nodes `ar-dispatch` carries
 * so a label here cannot be read as a claim about one of those.
 */
const SEND_PLANT: BuiltWorkflowNode = {
  name: 'Mail The Outcome',
  type: 'n8n-nodes-base.emailSend',
};

/**
 * `workflow` with {@link SEND_PLANT} spliced onto the end of a
 * copy of its parsed envelope.
 *
 * A copy, and never the artifact it was read out of. The
 * envelope and the node list are both rebuilt, so nothing the
 * splice touches is reachable from {@link BUILT_WORKFLOWS} —
 * which is what lets one case sweep a spliced copy and the tree
 * itself and read the second answer as evidence rather than as
 * an ordering accident. The nodes themselves are shared, and
 * nothing here writes to one.
 *
 * Both ties {@link BuiltWorkflow} documents are rebuilt with it:
 * the copy's `nodes` IS its envelope's own `nodes` member rather
 * than a second array, and `nodeTypes[i]` is `nodes[i].type`. A
 * copy short of either would be a subject the surface case that
 * opens the assertions says nothing about.
 *
 * Onto the end, and the position carries nothing. What says the
 * walk reaches every node it was handed is the sweep-coverage
 * case, so a node spliced at the front and one spliced at the
 * back are the same input here.
 */
function withSendNodePlanted(workflow: BuiltWorkflow): BuiltWorkflow {
  const nodes = [...workflow.nodes, SEND_PLANT];

  return {
    file: workflow.file,
    parsed: { ...workflow.parsed, nodes },
    nodes,
    nodeTypes: nodes.map((node) => node.type),
  };
}

// ---------------------------------------------------------------------------
// The one schedule trigger, and the webhook that is not one
// ---------------------------------------------------------------------------

/**
 * The workflow the one schedule trigger belongs to, by id.
 *
 * Declared rather than read off {@link PHASE_3_AND_5_WORKFLOW_IDS},
 * which names this id among its entries and no longer names it
 * first. The two are separate claims that used to coincide, that
 * roster having held one workflow: it says which artifacts the build
 * is expected to produce, this says which one of them schedules.
 * `ar-ingest` parted them, `ar-capture` parted them further with a
 * trigger of its own that starts a run and sets no clock, `ar-score`
 * parted them again with another of the kind `ar-ingest` carries,
 * and the entries phase 6 has still to deliver part them further
 * again, none of those being a schedule — so the roster grows and
 * this stays a set of one, which is the property itself and is what
 * a value derived from a list that grew with it would stop
 * asserting.
 *
 * By id and never by file name, for the reason
 * {@link PHASE_3_AND_5_WORKFLOW_IDS} gives: a workflow is one file
 * called `<workflow-id>.json`, so a file name is a derivation and an
 * id is the thing to keep in step with the roster table in
 * `workflows/src/README.md`.
 */
const SCHEDULE_TRIGGER_WORKFLOW_ID = 'ar-dispatch';

/**
 * The trigger type `ar-capture` is started by.
 *
 * Written out here rather than read off the artifact that carries
 * it, for the reason {@link SEND_PLANT} gives about spelling a type
 * twice: two spellings are what leave a case able to ask whether
 * they still agree. A type read off the tree would agree with the
 * tree by construction, and the question the case below asks —
 * whether what starts that workflow is the trigger setting no clock
 * — would be answering itself.
 *
 * Here rather than in `workflow-rosters.ts` because no matcher there
 * is keyed to it. {@link SCHEDULE_TRIGGER_TYPE} already argues the
 * type, naming a webhook as one of the three legitimate triggers
 * that start a run and decide nothing about when one starts, so an
 * export beside that one would be a roster entry no rule reads. All
 * that is asked of the string is that {@link isScheduleTrigger}
 * answer no to it, which is a claim about the schedule roster rather
 * than about a webhook one.
 */
const WEBHOOK_TRIGGER_TYPE = 'n8n-nodes-base.webhook';

/**
 * The workflow the webhook trigger belongs to, by id.
 *
 * Declared beside {@link SCHEDULE_TRIGGER_WORKFLOW_ID} and read the
 * same way, by id and never by file name, and kept apart from
 * {@link PHASE_3_AND_5_WORKFLOW_IDS} for the reason that one gives:
 * a roster growing with every source that lands cannot also answer
 * which of its entries carries what. The two ids are what the case
 * below turns into a per-workflow expectation, and every entry the
 * roster names beyond them is expected to carry a trigger of neither
 * kind — which is how `ar-score` joined, its row written before its
 * source landed, and what makes one arriving with a schedule or a
 * webhook redden here rather than pass under a count that happened
 * to stay at one.
 */
const WEBHOOK_TRIGGER_WORKFLOW_ID = 'ar-capture';

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

// ---------------------------------------------------------------------------
// The per-run ceiling in front of a model call
// ---------------------------------------------------------------------------

/**
 * A JavaScript line comment, from its slashes to the end of its
 * line.
 *
 * Stripped out of a body before anything is matched in it, for
 * the reason {@link SQL_LINE_COMMENT} is stripped out of a
 * statement: a workflow source has no comment syntax of its own,
 * so a Code node's body is one of the few tracked homes a
 * decision made at a node has. The one body the built tree
 * carries is prose for ninety-nine of its hundred and nineteen
 * lines, and most of that prose argues about the cap the node
 * applies. Read whole, a body could satisfy this rule by making
 * the case for a ceiling rather than by carrying one.
 *
 * Over this tree the strip changes no answer — measured, that
 * body declares the same ceiling with its prose in or out — so
 * what it is for is the bodies phase 6 writes, and the sample
 * planted for it is what says it runs at all.
 *
 * Line comments and nothing else. Every comment this port writes
 * in a body is one. The two forms left unread, a block comment
 * and a string literal spelling a declaration, can only make
 * this rule ACCEPT a body that bounds nothing, which is the
 * direction worth naming: text a strip misses turns prose into a
 * ceiling, where a strip taking too much would leave a real
 * ceiling unread and redden.
 *
 * Global, and used only with `replace`, for the reason
 * {@link SQL_LINE_COMMENT} gives.
 */
const JS_LINE_COMMENT = /\/\/[^\n]*/gu;

/**
 * A ceiling declared in a Code node body, and the name it is
 * declared under.
 *
 * Two halves, each standing for one way a run comes to have no
 * bound. The name is upper snake case and carries `PER_RUN`,
 * which is half of what `docs/architecture/01-invariants.md`
 * means by an EXPLICIT per-run ceiling: a bound a reviewer finds
 * by reading the declarations rather than by following the
 * arithmetic.
 *
 * That fragment and not a vocabulary of bound-ish words, because
 * the looser rule is nearly vacuous for the bodies this is aimed
 * at. Measured over the origin's built bodies: forty-six numeric
 * upper-snake constants, thirty-five of them carrying `MAX`, and
 * exactly six carrying `PER_RUN` — which are exactly its six
 * per-run ceilings. The other twenty-nine `MAX` names bound a
 * chunk, a field, a slug or an excerpt, and the workflow this
 * port's phase 6 answers to carries both kinds in one body, so a
 * rule taking any `MAX` would read a chunk cap as the run's
 * ceiling and pass a workflow that has none.
 *
 * The cost is that a ceiling has to be NAMED for the run it
 * bounds. That is the register's own word, it is what the origin
 * already did six times over, and the failure names the edit:
 * one line in a source that is hand written and reviewed.
 *
 * The value is a number written down — an integer, or the
 * `Number('25')` a resolved settings marker leaves behind. That is
 * the other half, and what it refuses is the shape the property
 * exists for. The same document puts that shape as a run scaling
 * with its input, and a bound taken from what arrived is written as
 * a `const` like any other: `const MAX_CALLS_PER_RUN = rows.length`
 * is named, is read where the work is done, and is no ceiling at
 * all.
 *
 * Which is also why the value half needs the second form, and
 * why this reads the artifact and never the source. `Plan
 * Dispatch` is where `Number('25')` was measured: its cap is a
 * settings marker, so the built body carries a quoted number
 * where the source carries `Number` over marker text, which is
 * no number at all. That node's own bound is named `CAP` and is
 * not one this rule looks for — the workflow holds no model node
 * and owes no ceiling — but the FORM a resolved setting leaves
 * behind is the form a phase-6 ceiling will arrive in.
 *
 * A fragment is still a fragment, and that is the limit. The
 * rule reads a name and a shape and never an intent, so a
 * per-run bound over something other than the model calls
 * satisfies it — the origin's own six include one bounding
 * polls and one bounding scores. What it refuses is the two
 * failures that have cost money: a run bounded by nothing, and a
 * bound declared and never read. A third spelling of the value,
 * `parseInt` among them, is refused too, and the edit is a
 * second form here arriving with the body that needs one.
 *
 * Global, and read with `matchAll`, which scans through a clone
 * of the pattern rather than through this one — measured,
 * `lastIndex` is still zero afterwards, so the instance is as
 * safe to share as {@link SQL_LINE_COMMENT} is.
 */
const CEILING_DECLARATION = new RegExp(
  '(?<![A-Za-z0-9_$])const[ \t]+([A-Z0-9_]*PER_RUN[A-Z0-9_]*)[ \t]*=' +
  '[ \t]*(?:[0-9]+|Number[ \t]*\\([ \t]*[\'"][0-9]+[\'"][ \t]*\\))',
  'gu',
);

/**
 * The JavaScript `node` runs, read off the parameter that
 * carries it — one text per body the node holds, and none for a
 * node holding no body at all.
 *
 * The shape {@link queryParametersOf} has one member over, and
 * for its reasons: a parsed parameter rather than the artifact's
 * text, so a claim about a body is a claim about the node that
 * runs it, and a list rather than a text or nothing, so a node
 * with a body and a node without are one shape at a call site.
 *
 * Keyed to the parameter and not to the node type, which is the
 * same choice made there. `jsCode` is what the Code node opens
 * in a code editor, the way `query` is what the Postgres node
 * opens in a SQL one, and reading the parameter finds a body
 * wherever one is written rather than only in the type that
 * carries it today.
 *
 * `pythonCode` is the spelling not read, the Code node's other
 * language. No workflow in this port carries one, and the edit
 * is a second name here arriving with the node that needs it.
 * What the gap costs falls the safe way for the check reading
 * this: the property is asserted of a workflow that owes a
 * ceiling, so a body this cannot see reads as a workflow
 * bounding nothing and reddens, rather than passing having
 * looked at nothing.
 *
 * It lives here rather than beside the rosters because the rule
 * that reads it does. A member one check reads belongs with the
 * check, and moving it next door is what a second reader asks
 * for — {@link queryParametersOf} sits there because more than
 * one file asks it. `workflow-rosters.test.ts` does have a
 * reader of this same member, for the nodes it plants, and that
 * one REFUSES a node carrying none: the right answer for a
 * fixture whose whole point is its body, and the wrong one here,
 * where most nodes carry none at all and answering empty is what
 * a node running no script has to say.
 */
function codeBodiesOf(node: BuiltWorkflowNode): readonly string[] {
  const parameters = node.parameters;

  if (typeof parameters !== 'object' || parameters === null) {
    return [];
  }

  const body = (parameters as Record<string, unknown>).jsCode;

  return typeof body === 'string'
    ? [body]
    : [];
}

/**
 * The ceilings `code` declares, by name.
 *
 * The capture reads as `string | undefined`, a group being
 * reachable by index like any other member, and a declaration
 * that matched cannot be missing the name that made it one — so
 * the case that cannot arise is dropped rather than asserted
 * away.
 */
function declaredCeilings(code: string): readonly string[] {
  return [...code.matchAll(CEILING_DECLARATION)]
    .flatMap((declaration) => declaration[1] ?? []);
}

/**
 * Whether `code` reads `name` anywhere past the declaration that
 * introduced it.
 *
 * More than one occurrence, the declaration being the first: a
 * second is the ceiling read where the work is done. What this
 * deliberately does not read is WHERE. The origin asserted the
 * site as well as the name, matching a slice against its one
 * drafting node, which it could do because it knew what that
 * node bounded. Here the workflows that will carry a ceiling are
 * phase 6 and what they bound is theirs to choose — a slice, a
 * call like `capBatch`, a loop bound, a comparison ahead of an
 * early return — so the property this can hold is that the name
 * is read at all, which is already what parts a ceiling from a
 * constant somebody left behind.
 *
 * Bounded either side by a class admitting everything an identifier
 * cannot carry, so `CAP` is not found inside `CAPACITY` and a
 * ceiling is not read by a longer name that merely starts with it.
 * Measured, including the case such bounding usually breaks: three
 * occurrences with nothing but a space between them count as three,
 * the bounds being lookarounds and consuming none of what they match
 * against.
 *
 * Built from a name this file captured rather than from one a
 * caller supplied. That name matched a class of upper-case
 * letters, digits and underscores, so it carries no character a
 * pattern would read as syntax and there is no escaping here to
 * get wrong.
 */
function readsPastDeclaration(code: string, name: string): boolean {
  const reads = new RegExp(`(?<![A-Za-z0-9_$])${name}(?![A-Za-z0-9_$])`, 'gu');

  return [...code.matchAll(reads)].length > 1;
}

/**
 * Whether `node` bounds a run by a ceiling it both declares and
 * applies.
 *
 * Both halves of ONE node, which is where the consequent of this
 * rule parts from the ledger's. That one asks whether the
 * workflow holds a node writing a row, and any node it holds will
 * do; this asks whether one body declares a ceiling and reads it,
 * because a ceiling declared in one Code node and read in another
 * is two names that happen to agree rather than a bound —
 * nothing carries a value from one body into the next.
 *
 * Comments out first, then every ceiling the body declares, then
 * whether any one of them is read. Any and not all, because what
 * has to hold is that the run IS bounded: a body that declares a
 * second constant and never gets round to using it is untidy,
 * and bounds its run exactly as the first one says.
 */
function appliesRunCeiling(node: BuiltWorkflowNode): boolean {
  return codeBodiesOf(node).some((body) => {
    const code = body.replace(JS_LINE_COMMENT, ' ');

    return declaredCeilings(code)
      .some((name) => readsPastDeclaration(code, name));
  });
}

/**
 * The two lines a bounded body carries: a ceiling, and the place
 * it is applied.
 *
 * Spelled once and read both by the body that carries them and
 * by the body that only talks about them, so the two are
 * provably about one phrase. A control quoting text the rule no
 * longer fires on is no control, and quoting it by hand a second
 * time is how that comes about.
 */
const CEILING_LINES =
  'const MAX_CALLS_PER_RUN = 5;\n' +
  'const calls = $input.all().slice(0, MAX_CALLS_PER_RUN);';

/**
 * A body that declares a ceiling and applies it.
 *
 * The origin's own shape with its name generalized: six of its
 * built bodies declare a `_PER_RUN` ceiling and take the front
 * of the batch with it, and one of the six is the drafting node
 * whose check this rule generalizes. Written about model calls
 * because that is the work the rule is about, and phase 6 is
 * where such a body lands.
 */
const CEILING_BODY = `${CEILING_LINES}\nreturn calls;`;

/**
 * The same ceiling, declared and never read.
 *
 * The origin's own failure, and the one its check was written
 * for: an unbounded pass made one model call per row it found,
 * unattended, on every tick. A declaration on its own reads as a
 * bound to anybody skimming the body and bounds nothing at all,
 * which is the state a rule stopping at `a ceiling is declared`
 * would pass.
 */
const CEILING_DECLARED_ONLY_BODY =
  'const MAX_CALLS_PER_RUN = 5;\n' +
  'return $input.all();';

/**
 * A body bounding its batch by a number written into the
 * expression that uses it.
 *
 * The half of EXPLICIT a name carries. This body does bound a run,
 * so a rule asking only whether the batch is capped takes it, and
 * what that costs is the rest of what the register asks a ceiling to
 * be: nothing says what the number is for, nothing else in the body
 * can read it, and a reviewer looking for the bound has to read
 * every expression rather than the declarations.
 */
const CEILING_LITERAL_BODY = 'return $input.all().slice(0, 5);';

/**
 * A ceiling named, applied, and taken from the batch it is meant
 * to bound.
 *
 * The failure `docs/architecture/01-invariants.md` states as a
 * run scaling with its input, wearing the shape of a ceiling.
 * It is declared under a name the rule looks for and read where
 * the work is done, so `declared and applied` holds of it both
 * ways; what it is not is a number, which is the half of the
 * declaration that reads the value.
 */
const CEILING_FROM_INPUT_BODY =
  'const rows = $input.all();\n' +
  'const MAX_CALLS_PER_RUN = rows.length;\n' +
  'return rows.slice(0, MAX_CALLS_PER_RUN);';

/**
 * A body whose comments carry the ceiling and its application,
 * and whose statements carry neither.
 *
 * The control {@link JS_LINE_COMMENT} exists for, quoting
 * {@link CEILING_LINES} verbatim rather than paraphrasing it: a
 * strip that stopped running would read this as a bounded body,
 * and a control quoting something the rule no longer fires on
 * could not report that. Prose of this shape is what this port
 * writes, the body in the built tree spending most of its lines
 * arguing about a cap, so the input is one a phase-6 workflow
 * would plausibly produce rather than one contrived to fail.
 */
const CEILING_MENTION_BODY = [
  ...CEILING_LINES.split('\n').map((line) => `// ${line}`),
  'return $input.all();',
].join('\n');

/**
 * A statement bounding its own result, in the parameter this
 * rule does not read.
 *
 * The member control, and the half of the property a planted
 * body cannot stand for: the ceiling has to be in a CODE node. A
 * `LIMIT` is a bound and a real one — both of `ar-dispatch`'s
 * claims carry the batch cap as one — but it bounds a STATEMENT
 * rather than a run, and `src/lib/schedule.ts` argues at length
 * why it is not the copy to rely on: a `LIMIT` is one edit away
 * from being tuned off by somebody reading the query and nothing
 * else. So a workflow whose only bound is in SQL answers no
 * here, and the node carrying it is the shape the built tree
 * already runs.
 */
const CEILING_IN_SQL =
  'SELECT id, search_terms FROM research_pool\n' +
  'WHERE status = $1 AND approved_at IS NOT NULL\n' +
  'ORDER BY approved_at\n' +
  'LIMIT 5';

/** One node {@link appliesRunCeiling} is driven over. */
interface CeilingSample {
  /** What the node carries, in prose, and the name of its row. */
  readonly label: string;

  /** The answer {@link appliesRunCeiling} must give for it. */
  readonly bounds: boolean;

  /** The node, planted. */
  readonly node: BuiltWorkflowNode;
}

/**
 * The nodes {@link appliesRunCeiling} is driven over, one per
 * answer it has to give.
 *
 * One accepts and five refuse, and they are each other's control the
 * way {@link LEDGER_SAMPLES} are: a rule recognising nothing leaves
 * the accepting sample answering no, one recognising everything
 * leaves all five refusals answering yes, and the comparison names
 * whichever moved.
 *
 * Each refusal is a rule this file could plausibly have shipped
 * rather than an input nothing would write, and there are five
 * because the property has that many ways to be met halfway — a
 * ceiling declared and never applied, a bound with no name on it, a
 * bound read off the batch, a ceiling that lives in the prose, and a
 * bound that is real and is in the wrong parameter.
 *
 * Named for what each node does, as every node planted in this
 * suite is, and named apart from the nodes `ar-dispatch`
 * carries so a label here cannot be read as a claim about one
 * of those.
 */
const CEILING_SAMPLES: readonly CeilingSample[] = [
  {
    label: 'a Code node declaring a ceiling and applying it',
    bounds: true,
    node: {
      name: 'Bound The Calls',
      type: 'n8n-nodes-base.code',
      parameters: { jsCode: CEILING_BODY },
    },
  },
  {
    label: 'a Code node declaring a ceiling and reading it nowhere',
    bounds: false,
    node: {
      name: 'Declare The Bound',
      type: 'n8n-nodes-base.code',
      parameters: { jsCode: CEILING_DECLARED_ONLY_BODY },
    },
  },
  {
    label: 'a Code node bounding its batch by a bare number',
    bounds: false,
    node: {
      name: 'Take The First Few',
      type: 'n8n-nodes-base.code',
      parameters: { jsCode: CEILING_LITERAL_BODY },
    },
  },
  {
    label: 'a Code node taking its ceiling from the batch',
    bounds: false,
    node: {
      name: 'Bound By What Arrived',
      type: 'n8n-nodes-base.code',
      parameters: { jsCode: CEILING_FROM_INPUT_BODY },
    },
  },
  {
    label: 'a Code node whose comments carry the ceiling',
    bounds: false,
    node: {
      name: 'Explain The Bound',
      type: 'n8n-nodes-base.code',
      parameters: { jsCode: CEILING_MENTION_BODY },
    },
  },
  {
    label: 'a node bounding its statement with a SQL LIMIT',
    bounds: false,
    node: {
      name: 'Read The Approved Pool',
      type: 'n8n-nodes-base.postgres',
      parameters: { operation: 'executeQuery', query: CEILING_IN_SQL },
    },
  },
];

// ---------------------------------------------------------------------------
// The forbidden names
// ---------------------------------------------------------------------------

/**
 * One hit, in the form the failure list prints it.
 *
 * The shape `naming.test.ts` prints, and for its reasons: the
 * pattern id says which needle fired and the location says where,
 * which is everything needed to go and read the rest — and the
 * matched text is exactly what an assertion message must not carry,
 * a failure list reaching CI logs and terminal scrollback being the
 * one place nobody can go and remove it.
 *
 * What the location means here is a line of the SERIALIZATION and
 * never a line of a source. Two steps stand between: the artifact
 * is built from a file under `workflows/src/`, and the text swept
 * is that artifact parsed and written back out. Today the two
 * agree line for line — measured, `buildTemplate` indents by two
 * and this does too, so the serialization is the artifact's own
 * bytes short of its trailing newline — and nothing here rests on
 * that, `workflow-dist.ts` saying of this sweep that serializing
 * costs it the artifact's formatting and nothing asserts it. The
 * step that genuinely cannot be walked back is a name inside a
 * spliced library body: JSON escapes the newlines, so the whole
 * body is one line of the serialization and the number names the
 * member carrying it rather than the line of `src/lib/` it came
 * from.
 */
function formatForbiddenMatch(match: ForbiddenMatch): string {
  return `${match.filePath}:${match.lineNumber} — ${match.patternId}`;
}

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
  // reasons. `loadBuiltWorkflows` sorts, and
  // `PHASE_3_AND_5_WORKFLOW_IDS` is written in that order. A
  // comparison sorting both sides again would be answered by a read
  // that never sorted at all, and a roster naming one id twice would
  // come back as the same set as one naming it once. An array parts
  // both.
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
  it('holds every workflow the phase-3 and phase-5 roster expects', () => {
    const built = BUILT_WORKFLOWS.map((workflow) => ({
      file: workflow.file,
      hasNodes: workflow.nodes.length > 0,
    }));
    const expected = PHASE_3_AND_5_WORKFLOW_IDS.map((id) => ({
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
  // `workflow-rosters.test.ts`, and the composition reading it is
  // covered over this tree by the control that splices a send
  // node into a copy of it.
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
  // only the send-free one, so every other sweep in this file
  // rests on it rather than each repeating it.
  it('sweeps every node the built tree carries', () => {
    const swept: string[] = [];

    nodesMatching(BUILT_WORKFLOWS, (node) => {
      swept.push(node.type);

      return isSendCapableNode(node);
    });
    const carried = BUILT_WORKFLOWS.flatMap((workflow) => workflow.nodeTypes);

    expect(swept).toEqual(carried);
  });

  // The half neither the send-free claim nor the sweep-coverage
  // case beside it can reach: that the composition they both read
  // would have named an offender had the tree carried one. An
  // absence check prints the same nothing for a clean tree as for
  // a rule that could never have fired, and each of those two
  // answers with a list — one over what matched, one over what
  // was visited — so neither parts the two.
  //
  // The composition is the part with no other home. The matcher
  // is driven over planted types in `workflow-rosters.test.ts`
  // and the walk over fixture trees in `workflow-dist.test.ts`,
  // and neither reads `isSendCapableNode`, which is where the
  // member carrying a node's type is chosen. That read is the one
  // mistake in the send-free rule nothing else reports: every node
  // carries a `name` as well, the matcher answers no for a display
  // name, and a sweep asking the wrong member prints the clean
  // tree's own empty list.
  //
  // Four halves in one record, so a failure names which moved.
  //
  // The first splices a send node into a copy of every built
  // workflow and expects the sweep to label each one. Held against
  // one label per artifact rather than against a count, so a sweep
  // naming some other node reddens as loudly as one naming
  // nothing. The name half of each label is the plant's own and is
  // compared with itself, so what the labels add over a count is
  // which node was named and not that the name is right.
  //
  // The second is that same sweep over the artifacts themselves,
  // run after the copies were built, and it is the revert half:
  // the splice reached no artifact the tree holds. `nodesMatching`
  // is a read, so what could reach one is the splice, and
  // `withSendNodePlanted` rebuilds the envelope and the node list
  // precisely so nothing does. It is also what parts a sweep that
  // named the plant from one naming whatever it is handed.
  //
  // The last two are about the plant rather than the sweep. Its
  // type has to be one the roster still names, or the first half
  // is a claim about an arbitrary string; its name has to be one
  // the roster does not, or the wrong-member read this case
  // exists for stays green while reading as covered. Both ask
  // the matcher directly, so a roster that lost the entry names
  // itself here beside the claim rather than leaving a sweep
  // that quietly stopped working as the whole report.
  //
  // Measured, seven legs, and only one of them reddens a second
  // case. The composition read swapped to `name` reddens this
  // case alone, which is the leg it exists for. A matcher
  // recognising nothing, the roster emptied, and the plant's type
  // moved off the roster each redden the first half and the type
  // guard together and nothing else in the file: three causes and
  // one report, and the guard is what says the plant stopped
  // being a send node rather than that the sweep stopped working.
  // A matcher recognising everything reddens the second half and
  // the name guard, and is the one leg the send-free claim moves
  // under too. The splice made to write into the
  // artifact reddens the second half alone, every case ahead of
  // this one having already run and every case behind it reading
  // the tree for something a send node is not; and the plant's
  // name moved onto a rostered type reddens the name guard alone.
  // Those last two are reported by nothing else in this file,
  // which is the whole of what the revert half and the guards
  // are for. An empty tree is the shape the file's own head
  // covers: the read refuses at module scope, so the run reports
  // no case either way and the class in its log is what parts a
  // refusal from a leg that isolated nothing.
  //
  // What this does not add is the roster. The plant spells one
  // entry's type, so the eight entries and the near neighbours
  // they must not reach stay `workflow-rosters.test.ts`'s to
  // prove, and this case would pass over a roster of one.
  it('names a send node spliced into a built copy and none in the tree', () => {
    const spliced = BUILT_WORKFLOWS
      .map((workflow) => withSendNodePlanted(workflow));
    const control = {
      overTheSplicedCopies: nodesMatching(spliced, isSendCapableNode),
      overTheArtifactsThemselves: nodesMatching(
        BUILT_WORKFLOWS,
        isSendCapableNode,
      ),
      theSplicedTypeIsSendCapable: isSendCapable(SEND_PLANT.type),
      theSplicedNameIsSendCapable: isSendCapable(SEND_PLANT.name),
    };

    expect(control).toEqual({
      overTheSplicedCopies: BUILT_WORKFLOWS
        .map((workflow) => `${workflow.file}:${SEND_PLANT.name}`),
      overTheArtifactsThemselves: [],
      theSplicedTypeIsSendCapable: true,
      theSplicedNameIsSendCapable: false,
    });
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

  // The same one-trigger rule read per workflow rather than over the
  // tree, and what asks for a second reading is `ar-capture`. Its
  // webhook is the first trigger in this tree that is neither a
  // schedule nor the execute-workflow trigger `ar-ingest` carries,
  // and all the case above can say about it is that a flat count of
  // schedule triggers did not move — which is the answer a tree
  // holding no webhook at all gives too.
  //
  // So the webhook is asserted present. `ar-capture` carrying
  // exactly one node of {@link WEBHOOK_TRIGGER_TYPE}, held beside a
  // schedule count of zero for that same artifact, is what leaves
  // not counted as a schedule a claim with a subject rather than a
  // count that stayed still.
  //
  // Three readings in one comparison, so a failure names which
  // moved. The webhook counts say which artifact is started by a
  // request. The schedule counts say `ar-dispatch` is still the only
  // one started by a clock, which is the case above read per
  // workflow instead of as a list of file names, and is where a
  // second schedule prints beside the workflow that grew it. And
  // {@link isScheduleTrigger} is asked about the type directly,
  // which is the not-counted half with no tree in front of it.
  //
  // That last reading is the one `workflow-rosters.test.ts` already
  // makes, over a webhook planted as a node rather than over one the
  // tree holds, and it is restated here rather than left next door
  // for what it costs: nothing, and a failure that names the matcher
  // and the artifact in one comparison instead of sending a reader
  // to another file to find out which of the two moved. It adds no
  // coverage that control does not already have. What this case adds
  // over it is the subject — that the planted type is the type an
  // artifact in the built tree is actually started by.
  //
  // The expectation is derived from
  // {@link PHASE_3_AND_5_WORKFLOW_IDS} and the two id constants
  // rather than written out per file, so the roster stays the one
  // place a workflow is named. Every entry beyond those two is
  // expected to carry neither trigger, which is what makes this a
  // claim about the whole tree instead of about whichever artifacts
  // happen to be in it: `ar-score` joined with its row already
  // written, and one landing with a trigger of either kind reddens
  // here rather than passing under a count that happened to stay at
  // one.
  //
  // What it rests on is the roster case above, which is what says
  // those ids are the artifacts the tree holds; a workflow missing
  // from the tree entirely reddens there first. What it does not
  // reach is the limit the case above names: a trigger left
  // `disabled` is in the artifact and on no clock, and neither a
  // type nor a count over one parts that tree from a running one.
  //
  // Measured over `tests/invariants/`, five legs, 150 cases, and
  // only the first reddens anything else. {@link isScheduleTrigger}
  // widened onto the webhook type reddens three: this case, the
  // one-trigger case above, and the planted webhook next door —
  // three readings of one matcher, and the split above is what says
  // which is which. The remaining four redden this case alone.
  // {@link WEBHOOK_TRIGGER_TYPE} misspelt and the trigger
  // `ar-capture` carries renamed in the built artifact are the pair
  // that earns the second spelling: one moves the constant, one
  // moves the tree, and the flat count above reads both as a clean
  // tree. {@link WEBHOOK_TRIGGER_WORKFLOW_ID} moved onto another
  // roster entry, and pointed at
  // {@link SCHEDULE_TRIGGER_WORKFLOW_ID} so both ids name one
  // workflow, each redden the columns rather than the type reading,
  // which is what says the per-workflow half is not riding on it.
  it(
    'counts the webhook in ar-capture as no schedule and ar-dispatch as the one',
    () => {
      const perWorkflow = BUILT_WORKFLOWS.map((workflow) => ({
        file: workflow.file,
        webhooks: workflow.nodeTypes
          .filter((type) => type === WEBHOOK_TRIGGER_TYPE).length,
        schedules: workflow.nodeTypes
          .filter((type) => isScheduleTrigger(type)).length,
      }));
      const control = {
        perWorkflow,
        theWebhookTypeIsAScheduleTrigger: isScheduleTrigger(
          WEBHOOK_TRIGGER_TYPE,
        ),
      };

      expect(control).toEqual({
        perWorkflow: PHASE_3_AND_5_WORKFLOW_IDS.map((id) => ({
          file: `${id}.json`,
          webhooks: id === WEBHOOK_TRIGGER_WORKFLOW_ID
            ? 1
            : 0,
          schedules: id === SCHEDULE_TRIGGER_WORKFLOW_ID
            ? 1
            : 0,
        })),
        theWebhookTypeIsAScheduleTrigger: false,
      });
    },
  );

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
  // recognising everything reddens this case and the two cost-guard
  // cases that follow it, each reading the same matcher for an
  // antecedent of its own. So the only mistake in the predicate this
  // tree can report reaches it through the matcher half, and says
  // nothing about the read sitting behind it.
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
  // nothing: the control that splices a node into a copy of a built
  // workflow and expects the sweep to name it splices a send node,
  // not a model one.
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
  // this case, the retry case and the per-run-ceiling case, all
  // three reading the same matcher; one recognising nothing reddens
  // none of them. The ledger read forced true and forced false each
  // leave this case green and redden the sample-driven case instead,
  // which is what running across zero workflows means. A model node
  // planted into the built artifact reddens this case and the
  // ceiling case, one node satisfying both antecedents, and stops
  // reddening this one once a ledger write is planted beside it.
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

  // The last of the three guards in front of a model call, read
  // over built output: a workflow holding a node that calls a model
  // holds a Code node that declares a ceiling on the pass and
  // applies it. `docs/architecture/01-invariants.md` puts what its
  // absence costs as a run scaling with its input — one pass over
  // an unusually large batch makes as many calls as it found rows,
  // which is the second of the four properties bounding what a run
  // can spend.
  //
  // Both halves in one answer, because the origin's own check is
  // what says one half is worth nothing alone: it asserted the
  // ceiling constant AND the site applying it, on the reasoning
  // that a declaration nobody reads bounds nothing while reading as
  // a bound to anybody skimming the body. `appliesRunCeiling`
  // carries that pair; what this case adds is which workflows owe
  // it.
  //
  // One record per workflow that owes a ceiling, held against the
  // same records saying it has one, so a failure prints the
  // artifact to open. The antecedent is read per workflow and the
  // consequent per node, which is where this parts from the
  // ledger-row case beside it: a ledger row may be kept by any node
  // in the workflow, and a ceiling has to be declared and read in
  // ONE body, nothing carrying a `const` from one Code node into
  // the next.
  //
  // It runs across zero workflows and will until phase 6, the same
  // empty as the ledger-row case and not the retry case's — the
  // shape `MODEL_NODE_TYPE_PREFIX` names for both: the antecedent
  // is false, so the implication holds and the ceiling read is
  // never reached at all. What stands behind it meanwhile is
  // elsewhere, in two halves. The matcher is covered over planted
  // nodes in `workflow-rosters.test.ts`, by the mutual-control pair
  // `isModelNode` has there. The ceiling read is covered by the
  // case that drives it over planted bodies, and by nothing else —
  // no workflow in the built tree holds a model node, so this case
  // cannot exercise that rule and does not. The input is covered a
  // module away, by the two refusals the sweeps in this file rest
  // on. There is no walk to cover, this case reading each
  // workflow's own nodes rather than the sweep those use.
  //
  // Measured, six legs. A matcher recognising every type reddens
  // this case, the retry case and the ledger-row case, all three
  // reading it for an antecedent of their own; one recognising
  // nothing reddens none of them. The ceiling read forced true and
  // forced false each leave this case green and redden the
  // sample-driven case instead, which is what running across zero
  // workflows means.
  //
  // The fixture leg that reads this case is two coordinated edits
  // to the built artifact rather than one: a model node, to fire
  // the antecedent, and a ledger write beside it, or the ledger-row
  // case reddens alongside and the split says nothing. That reddens
  // this case alone. Planting a Code node carrying a ceiling beside
  // them takes it green again, which is what parts a case reading
  // the property from one a plant reddened by being there.
  it('holds an applied ceiling in every workflow that holds a model node', () => {
    const owing = BUILT_WORKFLOWS
      .filter((workflow) => holdsModelNode(workflow))
      .map((workflow) => ({
        file: workflow.file,
        appliesRunCeiling: workflow.nodes.some((node) => appliesRunCeiling(node)),
      }));
    const bounded = owing.map((workflow) => ({
      file: workflow.file,
      appliesRunCeiling: true,
    }));

    expect(owing).toEqual(bounded);
  });

  // The rule the ceiling case cannot exercise, driven over the
  // bodies planted for it. Every answer in one comparison and one
  // record per sample, so a failure names which of the six moved
  // rather than reporting that something did.
  //
  // What it cannot report is `CEILING_SAMPLES` going empty: both
  // sides are derived from it, and one empty list equals the other.
  // That is why the samples are a literal declared beside the rule
  // rather than a list assembled from anywhere else — the edit that
  // would empty it is in the diff that makes it, which is a
  // guarantee about review rather than about the suite.
  //
  // Measured, seven legs, each one red case whose failure names the
  // sample that moved. A rule accepting nothing flips the accepting
  // sample alone; one accepting everything flips all five refusals
  // and not the accept. Then one loosening per refusal, which is
  // what says each is keyed to something rather than riding along
  // behind the others: dropping the test for a read past the
  // declaration flips the declared-only sample, letting the
  // declaration take any value flips the sample whose ceiling is
  // its own batch, dropping the comment strip flips the commented
  // sample, counting a SQL `LIMIT` flips the Postgres sample, and
  // counting a bare number inside a bounding call flips the sample
  // with no name on its bound. Each of the five flips that sample
  // and no other.
  it('reads an applied ceiling off the body a Code node runs', () => {
    const read = CEILING_SAMPLES.map((sample) => ({
      label: sample.label,
      appliesRunCeiling: appliesRunCeiling(sample.node),
    }));
    const declared = CEILING_SAMPLES.map((sample) => ({
      label: sample.label,
      appliesRunCeiling: sample.bounds,
    }));

    expect(read).toEqual(declared);
  });

  // The de-origination rule read over built output: not one of the
  // five names `naming-patterns.ts` refuses, in any artifact this
  // package produces. That module declares them, assembled from
  // fragments so it does not itself carry the strings it exists to
  // reject, and argues each one's legitimate near-neighbours.
  // `docs/architecture/01-invariants.md` argues what a name reaching
  // a deployed artifact costs.
  //
  // A re-check rather than a property of its own. Every file the
  // build reads is one the naming scan reads first: the workflow
  // source under `workflows/src/`, the library its Code node splices
  // out of `src/lib/`, and the settings table in
  // `scripts/workflow-markers.ts` the markers resolve against.
  // `naming-patterns.ts` prunes built output for that reason, a hit
  // inside it being a duplicate of one the scan reports at the
  // authored source. So a name this sweep finds is one
  // `naming.test.ts` finds first, and the file to edit is the same
  // either way.
  //
  // Asserted anyway, on two grounds. The first is that it is cheap:
  // one serialization and one matcher call per artifact, over a tree
  // already read at module scope, with no fixture, no second read
  // off disk and no build of its own.
  //
  // The second is the splice. It is where a library body first
  // reaches a workflow, and the two halves are scanned apart — the
  // library as a module, the source as a workflow — with neither
  // holding the other, so what a node runs is read here for the
  // first time. It is not the library's text, either, but the
  // transpiler's output of it: comments stripped, the `export`
  // keyword taken off, the quotes rewritten. That body is a
  // transform of something already scanned rather than a copy of it,
  // and the build stamp — a short commit, so nothing a needle is
  // shaped to match — is the only string in an artifact that came
  // from no file at all.
  //
  // The one check in this file whose subject is the artifact's
  // characters rather than a member, and the only one entitled to
  // be. Everywhere else the file's own header states the rule: a
  // node type spelled in a sticky note decides nothing, so text is
  // the wrong surface to read it off. A forbidden name has no such
  // distinction to draw — it is worth reporting wherever it is
  // stored, in a workflow's display name, in a sticky note, in a SQL
  // comment or inside a spliced library body — so this one sweeps
  // everything, and `BuiltWorkflow.parsed` is what it sweeps.
  //
  // Serialized from the parse rather than read off disk, which
  // `workflow-dist.ts` puts as the shape's one concession: there is
  // no text member to grep, so a check with a reason to read the
  // whole artifact writes the parse back out. What that buys is that
  // this sweep and every node-level check above it are reading one
  // tree, read once, refused together when it is empty. What it
  // costs is the artifact's formatting, which nothing here asserts.
  //
  // Held against an empty array rather than counted, for the reason
  // the send-free case gives: the answer is already the report. Each
  // hit names its own artifact and line, so a failure prints every
  // one of them rather than a number to go chasing.
  //
  // An empty answer is the passing answer, so what this is worth is
  // what its input and its needles are worth, and neither is covered
  // here. The input is covered a module away, `loadBuiltWorkflows`
  // refusing an absent tree, one holding no `*.json` and an artifact
  // carrying no node, all three before a case runs; the tie from
  // `parsed` to the nodes those refusals counted is the surface case
  // at the head of this block. The needles are covered in
  // `naming-patterns.test.ts`, over planted samples and the
  // false-positive controls each entry's near-neighbours need.
  //
  // Measured, four legs. Emptying `FORBIDDEN_PATTERNS` reddens
  // nothing here, which is what running a clean sweep means and why
  // the matcher is proven next door rather than by this case.
  // Planting the origin prefix into the envelope's `name` reddens
  // it, naming the artifact and the line. Planting the project name
  // into a spliced Code-node body reddens it too, at the line
  // carrying that body — the leg that says the sweep reaches the
  // half of an artifact its own source under `workflows/src/` does
  // not hold. Sweeping `nodes` in place of `parsed` keeps the
  // second and loses the first, which is why the subject is the
  // whole envelope.
  it('holds no forbidden name in any built workflow', () => {
    const found = BUILT_WORKFLOWS.flatMap((workflow) => {
      const serialized = JSON.stringify(workflow.parsed, null, 2);

      return findForbiddenMatches(serialized, workflow.file)
        .map(formatForbiddenMatch);
    });

    expect(found).toEqual([]);
  });
});
