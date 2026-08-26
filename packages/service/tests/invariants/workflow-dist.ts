/**
 * @packageDocumentation
 * The built workflow tree the workflow invariants read, and the two
 * ways that read comes back holding nothing while reporting nothing
 * wrong.
 *
 * `workflows/dist/` is generated. `scripts/build-workflows.ts`
 * resolves every source under `workflows/src/` and writes one
 * artifact per source, and `pretest` runs it so the default suite
 * reads a tree built in a real bun process rather than whichever one
 * was left on disk. The directory is gitignored, so no committed
 * copy stands behind it and no diff reports a bad one. What the
 * workflow invariants assert, they assert over what this file hands
 * them and over nothing else.
 *
 * Split from the assertions for the reason `naming-patterns.ts` and
 * `schema-sql.ts` are: the input to a check is a subject in its own
 * right. Kept here it stays readable, it sits inside a file `tsc`
 * reads — which a `.test.ts` is not — and a case can assert about it
 * directly rather than a suite assuming it. The same split is what
 * lets the refusals be reached at all: a caller passing a directory
 * of its own reaches them from a fixture tree instead of by
 * emptying the package.
 *
 * Where this reader parts from those two is the direction the
 * assertions standing on it run, and that is why the refusals are
 * this file's main content: an absence assertion is worth exactly
 * what the input it was handed is worth, and nothing more. The
 * static-SQL roster is must-find, so an empty read turns every
 * constraint red at once — wrongly, but loudly. The workflow suite
 * is mostly the other kind: no send-capable node, no forbidden name,
 * no model node without a ceiling in front of it. A check of that
 * shape is satisfied by having nothing to look at, and a run handed
 * nothing prints what a run over a clean tree prints. That is the
 * naming invariant's shape, and this file answers it the same way —
 * by refusing, rather than by handing back an empty result and
 * leaving the suite to report a pass.
 *
 * The refusal is owed at two levels, and the second is one neither
 * sibling needs. A directory that is absent, is not a directory, or
 * holds no `*.json` is the first. A workflow that parses and carries
 * no node is the second: it is a real file, it is counted, and every
 * check asking whether some node type is present in it comes back
 * no. From a caller's side the two are one fact — there was nothing
 * to assert over — and one of them looks like a working tree.
 *
 * What refusing cannot reach is an input that is too long rather
 * than too short. A build writes one artifact per source and sweeps
 * nothing, so an artifact whose source has since been renamed or
 * deleted stays where it is and reads here as a built workflow;
 * `buildAll` in `scripts/build-workflows.ts` argues that hole where
 * it is made. This file can say it was handed nothing. It cannot say
 * that what it was handed is what the sources produced.
 *
 * {@link DIST_DIR}, {@link EmptyDistDirectoryError} and
 * {@link EmptyWorkflowError} are here, and so is
 * {@link BuiltWorkflow}, the shape a read hands back. The walk
 * that raises both refusals and builds that shape arrives later
 * in this stage; the assertions over the real tree arrive after
 * `ar-dispatch` does, since `workflows/src/` names no workflow
 * until then and `workflows/dist/` is therefore not a directory
 * that exists. The cases over this file drive fixture trees of
 * their own for that reason.
 */

import { fileURLToPath } from 'node:url';

/**
 * The built tree the assertions over real output read, resolved
 * from this file's own location rather than from the working
 * directory.
 *
 * The walk arriving next takes a directory, so a case reaches the
 * refusals over a fixture tree of its own. This constant is the
 * one the assertions over the real tree are handed.
 *
 * `scripts/build-workflows.ts` writes here and resolves the same
 * directory the same way, off its own `import.meta.url`. Neither
 * constant can see the other — the writer's is module-private —
 * so what ties the two is that both are keyed to where a file
 * sits rather than to where a process was started.
 *
 * Keyed to the working directory it would agree with this under
 * every launcher the verification order uses, which is what makes
 * it worth spelling out rather than assuming. `bun run test`
 * inside the package sits in the package, and so does the
 * `bun run --filter '@ar/*' test` fan-out: that form runs each
 * package script with that package as its cwd, not with the repo
 * root. Both are measured, and neither would ever report the
 * difference.
 *
 * The launcher that parts them is the repo-root form,
 * `bun x vitest run --root packages/service`. Vitest resolves
 * its config and its test paths against `--root` and leaves the
 * process where it was started — measured: a worker's
 * `process.cwd()` there is the repo root.
 *
 * A relative `workflows/dist` resolves under that root, which
 * holds no `workflows/` at all, so {@link EmptyDistDirectoryError}
 * would fire naming a directory nobody has built. Loud, and
 * pointed at the wrong edit: it reads as a build that did not
 * run, when what moved was the launcher.
 */
export const DIST_DIR = fileURLToPath(
  new URL('../../workflows/dist', import.meta.url),
);

/**
 * Thrown when a directory holds no built workflow to read.
 *
 * Covers a directory that is absent, one that is not a directory
 * at all, and one that is there holding no `*.json`. All three
 * mean the same thing to a caller — there is nothing built to
 * assert over — and that is one fact worth reporting once, the
 * way `schema-sql.ts` folds the same three into its own
 * empty-directory refusal. Which of them it was is not carried,
 * because no edit turns on it: all three are answered by running
 * the build, and the message names it.
 *
 * The absent shape is the one this package hands out today.
 * `buildAll` in `scripts/build-workflows.ts` takes the reverse
 * split — absent is its empty answer, and only a path it cannot
 * list raises — and it stops before touching its output directory
 * when there is nothing to write. `workflows/src/` names no
 * workflow until `ar-dispatch`, so `workflows/dist/` is not a
 * directory that exists rather than an empty one.
 *
 * A distinct class rather than a bare `Error`, so a case covering
 * this path can pin the failure to this cause. A read that got
 * as far as opening an artifact refuses under
 * {@link EmptyWorkflowError} instead, and everything else on the
 * path arrives as `Error` — a directory that cannot be listed, an
 * artifact that cannot be opened, a `SyntaxError` out of
 * `JSON.parse`. An assertion taking any of those would pass for a
 * read that got further than this one ever does.
 *
 * What stands behind it is one case rather than a suite. The
 * roster case arriving later in this plan holds the workflows
 * this phase expects against what the read returned, so over the
 * real tree an empty read reddens there too — naming the
 * workflows it went looking for, the way the static-SQL roster
 * reports a missing constraint and never a missing migration.
 * Most of that suite is absence checks, which pass over nothing
 * at all, and a caller driving a fixture tree of its own has no
 * roster case in front of it. So this refusal is what
 * makes the failure name the edit, rather than the only thing
 * that fails.
 */
export class EmptyDistDirectoryError extends Error {
  /** Directory that yielded nothing, as the caller named it. */
  readonly directory: string;

  /**
   * @param directory - Directory that was read, or that was not
   * there to read.
   */
  constructor(directory: string) {
    super(
      `No .json artifact resolved under ${directory}. The workflow ` +
      'invariants are mostly absence checks, so a read that comes ' +
      'back with nothing leaves every one of them passing and the ' +
      'run printing what a run over a clean tree prints: either ' +
      'the build has not run — `bun run build:workflows` writes ' +
      'this directory, and `pretest` runs it for the `test` ' +
      'script and for no other — or the reader was pointed at a ' +
      'tree no build writes.',
    );
    this.name = this.constructor.name;
    this.directory = directory;
  }
}

/**
 * Thrown when a built workflow carries no node.
 *
 * Covers a `nodes` array that is empty and an artifact with no
 * `nodes` member at all. Both are one fact to a caller — the file
 * parses, it is counted among the built workflows, and it holds
 * nothing a node-level assertion can read — and nothing a case
 * goes on to do turns on which of the two it was.
 *
 * The file name is carried because the edit is in the source of
 * that name and not in the artifact. Marker resolution walks a
 * parsed source and rebuilds it, adding no node and dropping
 * none, and the write keeps the source's own file name — so an
 * artifact holding no node was built from a source holding none,
 * and a rebuild writes the same file again.
 *
 * A distinct class rather than a bare `Error`, so a case covering
 * an empty workflow pins the failure here rather than to
 * {@link EmptyDistDirectoryError}. The two answer one complaint
 * at two levels — nothing built to read, against a built file
 * with nothing in it — and an assertion taking either would pass
 * for a read that opened no artifact at all. Everything else on
 * the path arrives as `Error`: a directory that cannot be
 * listed, an artifact that cannot be opened, a `SyntaxError` out
 * of `JSON.parse`.
 *
 * Raised on the first such workflow rather than collected over
 * the read, the way `schema-sql.ts` raises on the first empty
 * migration. One named file is enough to reach the source
 * directory holding the rest.
 *
 * This is the refusal the absence assertions need most, and the
 * quietest one to go without. A workflow carrying no node
 * satisfies every check of the shape `no node of type X` — no
 * send-capable node, no model node without a ceiling in front
 * of it — because each asks its question of a list that is
 * empty. They are not weak checks. They are the right checks
 * handed nothing to run over, and a pass is what they report
 * either way.
 *
 * Nothing in a green run parts the two. The artifact parses, so
 * it is counted among the workflows read, and a roster held
 * against the file names is answered by it. The cases are one
 * per property rather than one per node, so the names, the
 * counts and the ticks are what a healthy tree prints. Nothing
 * moved, and no case is left to name what is not there.
 *
 * What parts them is a check that must FIND something, and
 * which workflows have one is a matter of what a roster happens
 * to name rather than a property of the build. `ar-dispatch`
 * gets two later in this plan — the schedule trigger has to
 * live in it, and `dispatch-sql.ts` reads statements off its
 * nodes by name — while a workflow no roster names carries
 * absence checks alone, and a fixture tree a caller passes in
 * has none in front of it at all.
 *
 * Both of those checks read what this file hands back, so with
 * the refusal in place neither ever meets an empty workflow, and
 * that ordering is the point rather than a side effect. A
 * schedule-trigger case failing over an empty `ar-dispatch`
 * reports a trigger that is not present — one node to go and
 * add — when what the file holds is no node at all. Which of
 * the two says which edit fixes it is the whole reason this
 * refusal runs first.
 */
export class EmptyWorkflowError extends Error {
  /** Name of the empty artifact, relative to `directory`. */
  readonly file: string;

  /**
   * Directory it was read from, carried because the same file
   * name is populated or empty depending on which tree the
   * reader was pointed at.
   */
  readonly directory: string;

  /**
   * @param file - Name of the empty artifact, relative to
   * `directory`.
   * @param directory - Directory it was read from.
   */
  constructor(file: string, directory: string) {
    super(
      `Built workflow '${file}' under ${directory} carries no ` +
      'node. The build resolves markers over a parsed source and ' +
      'rebuilds it without adding or dropping one, and the write ' +
      'keeps the source name, so a rebuild produces this same ' +
      'file again: the node belongs in the source of that name ' +
      'under `workflows/src/`.',
    );
    this.name = this.constructor.name;
    this.file = file;
    this.directory = directory;
  }
}

/**
 * One built workflow, as the checks over the built tree read it.
 *
 * Parsed, and never the file's text. Every property the workflow
 * invariants assert is a property of NODES — no send-capable type
 * anywhere, exactly one schedule trigger and it in `ar-dispatch`,
 * a model node with no retry in front of it, a claim statement
 * that takes its rows the way the dispatcher has to — and a check
 * keyed to the artifact's text cannot tell where the text it
 * matched was sitting. A type name reads the same in a node's
 * `type` member, in a display name, in a sticky note, and inside
 * a Code node's body.
 *
 * That is not a hypothetical here. The prose most likely to name
 * a checked thing is the prose explaining the check, and
 * `ar-dispatch` arrives later in this plan carrying sticky notes
 * about the very properties this suite asserts: that it holds
 * the only schedule trigger in the system, and what happens when
 * a workflow it invokes is not there yet. A search over text
 * finds those sentences. A parse does not — a node type is a
 * member or it is not, and a note is a string in a member
 * nothing asks about.
 *
 * So this shape hands out the parse and not the bytes. There is
 * no text member to grep, which is most of the enforcement: the
 * easy wrong path is not on offer. It is not a fence —
 * {@link DIST_DIR} is exported and `readFileSync` is one import
 * away — so the rule the header states, that the invariants
 * assert over what this file hands them, stays a convention this
 * shape makes cheap to keep rather than one it can force.
 *
 * The one check in this suite with a reason to read a whole
 * artifact serializes {@link BuiltWorkflow.parsed} rather than
 * opening the file. It arrives later in this plan and sweeps
 * for forbidden names, which is the other half of the split
 * `schema-sql.ts` states about its own directory: a constraint
 * is only real where the migrator will run it, while a
 * forbidden name is worth reporting wherever it is stored — an
 * envelope, a sticky note, a spliced library body. Serializing
 * costs that sweep the artifact's formatting, which nothing
 * asserts, and buys it the same tree the node-level checks read.
 */
export interface BuiltWorkflow {
  /**
   * Name of the artifact, relative to the directory it was read
   * from — the name {@link EmptyWorkflowError.file} carries too.
   *
   * Half of what a failure prints. A node type on its own says
   * that some tree broke the property; this says which file to
   * open, and since the build writes one artifact per source
   * under the source's own name, it names the file to edit.
   */
  readonly file: string;

  /**
   * The whole artifact, parsed.
   *
   * A `Record<string, unknown>` rather than a declared workflow
   * shape. The envelope carries whatever the n8n format puts
   * there — `connections`, `settings`, `meta`, `tags` — and
   * declaring that here would give a format this repo does not
   * own a second home in it. Narrowing a member where it is read
   * costs the one case reading it a line and keeps the rest of
   * the format out of this file.
   *
   * {@link BuiltWorkflow.nodes} is this object's own `nodes`
   * member rather than a copy of it, so the two cannot come
   * apart.
   */
  readonly parsed: Record<string, unknown>;

  /**
   * Every node the workflow carries, in the artifact's order.
   *
   * Never empty: a workflow holding no node is refused under
   * {@link EmptyWorkflowError} rather than handed back, since a
   * list with nothing in it answers `no such node` to every
   * question asked of it.
   */
  readonly nodes: readonly BuiltWorkflowNode[];

  /**
   * The `type` of every node, in {@link BuiltWorkflow.nodes}
   * order, so `nodeTypes[i]` is `nodes[i].type`.
   *
   * A list and not a set. One case asserts a COUNT — exactly one
   * schedule trigger across every built workflow — so a deduped
   * list would read a workflow carrying two triggers as one
   * carrying one, which is the invariant itself rather than an
   * edge of it.
   *
   * It answers whether and how many, never which: the node it
   * came off is gone from it, so a failure that has to name an
   * offender walks {@link BuiltWorkflow.nodes} instead. The index
   * tie above is the way back from one to the other.
   */
  readonly nodeTypes: readonly string[];
}

/**
 * One node of a built workflow, cut down to what the checks over
 * it read.
 *
 * Two members are named because every roster in the suite keys on
 * one of them: {@link BuiltWorkflowNode.type} for the send,
 * trigger and model rosters, and {@link BuiltWorkflowNode.name}
 * for the statements read off `ar-dispatch` by node name later in
 * this plan. Everything else stays reachable as `unknown` —
 * `parameters` holds the SQL a Postgres node runs and the body a
 * Code node runs, `onError` decides where a failure goes,
 * `retryOnFail` is a cost guard — narrowed by whichever helper
 * reads it rather than declared once here, since which members a
 * node has depends on the kind of node it is.
 *
 * Hand-declared, and the parse proves none of it. `JSON.parse`
 * hands back `unknown`, no schema is checked on the way in, and
 * nothing in the format forces either named member to be a
 * string. A cast is the only way in — measured: `tsc` refuses a
 * parsed value assigned to this shape without one — so the cast
 * is where the declaration gets asserted, and the walk arriving
 * next in this stage is what has to earn it rather than assert
 * it and carry on. A node a case plants by hand is checked only
 * where it is declared in a plain `.ts` module: a `*.test.ts`
 * sits outside the program `tsc` reads.
 *
 * Which of the two members it gets wrong decides how loud being
 * wrong is. A `name` that is not a string surfaces in a failure
 * message, where a reader can see it. A `type` that is not one
 * surfaces nowhere at all: it matches no roster entry, so every
 * check of the shape `no node of type X` passes — which is
 * {@link EmptyWorkflowError}'s vacuity again, one node further
 * down.
 */
export interface BuiltWorkflowNode {
  /**
   * The node's name on the canvas, and the half of a failure
   * that says which node to open.
   */
  readonly name: string;

  /**
   * The node type an instance loads, fully qualified.
   *
   * What the rosters match, and the reason they match here
   * rather than over text: this member is what decides which
   * code runs, and a type named anywhere else in the artifact
   * decides nothing.
   */
  readonly type: string;

  /** Everything else the node carries, narrowed where it is read. */
  readonly [key: string]: unknown;
}
