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
 * the forbidden names. Each arrives with its own case over the rest
 * of this stage; what stands here today is the surface they read.
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
 * characters cannot make. The one property here that is not about a
 * member is the forbidden-name sweep, whose subject really is every
 * character that reaches an instance; a case for that serializes the
 * parse back rather than reading anything out of it.
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
});
