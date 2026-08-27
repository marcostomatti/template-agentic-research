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
 * the forbidden names. The roster is the one standing here today,
 * beside the surface they all read; the rest arrive with their own
 * cases over the rest of this stage.
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
import { describe, expect, it } from 'vitest';

import { loadBuiltWorkflows } from './workflow-dist.js';

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
});
