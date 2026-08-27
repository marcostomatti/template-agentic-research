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
 * the forbidden names. The roster, the send-free rule and the one
 * schedule trigger stand here today, beside the surface they all
 * read; the rest arrive with their own cases over the rest of this
 * stage.
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
import type { BuiltWorkflowNode } from './workflow-dist.js';

import { describe, expect, it } from 'vitest';

import { loadBuiltWorkflows, nodesMatching } from './workflow-dist.js';
import { isScheduleTrigger, isSendCapable } from './workflow-rosters.js';

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
});
