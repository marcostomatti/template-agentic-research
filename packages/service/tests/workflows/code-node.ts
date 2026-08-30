/**
 * @packageDocumentation
 * Running a BUILT workflow's Code-node bodies offline, with the two
 * n8n globals they reach for supplied by hand.
 *
 * A Code node is the one part of a workflow this repository writes
 * as code, and the composition each one writes for itself — which
 * items it pairs against which, what it refuses, what it drops,
 * what it puts on the item it answers — is reached by nothing else
 * in this package. `tests/invariants/workflows.test.ts` reads node
 * MEMBERS: a type, a `retryOnFail`, the two body parameters a
 * marker resolved into, and nothing there ever calls a body.
 * `tests/build/lib-splice.test.ts` proves a library may be spliced
 * at all, and `tests/build/schedule-splice.test.ts` runs one
 * spliced body under `new Function` already — over a fixture tree
 * it built for the purpose, and it says in as many words that this
 * package's own artifact is somebody else's subject. What it
 * claims is that a library survives a splice. What runs here is
 * what the node around that library then does with it.
 *
 * ## The built body, never the source
 *
 * `codeNodeBodies` reads `workflows/dist/`, through the same
 * `loadBuiltWorkflows` the invariants read, so a body reaching a
 * case is the text an instance loads: markers resolved, every
 * library spliced in whole, the whole thing transpiled. Read from
 * `workflows/src/` instead a case would drive a body whose first
 * line is still `__INLINE:parser-config.ts__` and whose functions
 * do not exist, and the failure would be about the marker rather
 * than about the node. Two properties come free with that choice
 * and neither is available from the source: a splice that resolved
 * to the wrong library is a case failing on the rule it carried,
 * and two libraries whose top-level declarations collide is a
 * `SyntaxError` raised the moment a body is compiled.
 *
 * `pretest` runs the build, so a default `bun run test` reads a
 * tree a real bun process wrote rather than whichever one was left
 * on disk.
 *
 * ## Why the globals are BOUND rather than the source rewritten
 *
 * The published recipe for this — the `n8n-code-node-offline-verify`
 * skill — rewrites `typeof require` and `typeof module` out of the
 * body so the dual-context guards inside an inlined library take
 * their runner branch, and warns at length about the rewrite
 * catching an ordinary identifier that merely starts with one of
 * those words. None of that is needed here, and the reason is worth
 * stating because it looks like a shortcut.
 *
 * A `new Function` body may declare its own parameters. Binding
 * `require` and `module` as parameters whose value is `undefined`
 * makes `typeof require` evaluate to `'undefined'` INSIDE the body,
 * which is what the guard is asking and what the Code-node sandbox
 * answers. So the guards take exactly the branch the rewrite was
 * arranging for them to take, with the text under test left
 * byte-identical to the artifact. A harness that transforms its
 * subject is code that can be wrong about it, and its bugs arrive
 * attributed to the subject; this one transforms nothing.
 *
 * The bodies in this package carry no such guard today — the build
 * strips a declaration's `export` keyword and the transpiler
 * resolves nothing — so the binding is doing no work yet. It costs
 * two parameters and it is the branch that stays correct when a
 * library that does carry one is spliced.
 *
 * ## What it refuses
 *
 * Every refusal here answers the same question the built-tree
 * reader answers for the invariants: whether a run that asserted
 * nothing is distinguishable from a run over a healthy tree. A node
 * name that resolves to nothing, a body that still holds a marker,
 * a node read by name that no case mocked, and an answer that is
 * not a list of items are each a case about a workflow this
 * package does not have, and each of them throws naming what to
 * fix. None of them can come back as an empty answer, which is the
 * passing answer for half of what drives this harness.
 */
import type {
  BuiltWorkflow,
  BuiltWorkflowNode,
} from '../invariants/workflow-dist.js';

import { loadBuiltWorkflows } from '../invariants/workflow-dist.js';

/** The node type whose `jsCode` an instance runs as JavaScript. */
export const CODE_NODE_TYPE = 'n8n-nodes-base.code';

/**
 * The marker forms `scripts/build-workflows.ts` resolves.
 *
 * Read here to prove they are GONE. A body still carrying one was
 * read from `workflows/src/` or was built by something that did not
 * resolve it, and either way the case below it would be about a
 * string rather than about a node.
 */
const MARKER_PREFIXES = ['__INLINE:', '__ENVVAR:', '__SETTING:'] as const;

/** One item as a Code node sees it and as one answers it. */
export interface CodeNodeItem {
  readonly json: Record<string, unknown>;
}

/**
 * What a case supplies in place of the canvas around the node.
 *
 * `input` is what the node was handed, one plain payload per item,
 * wrapped into `{ json }` on the way in. `nodes` is every OTHER
 * node the body reaches by name, keyed by the name on the canvas —
 * membership is what decides, so an entry holding an empty list is
 * a node that ran and answered nothing, and an absent entry is a
 * node the case forgot.
 */
export interface CodeNodeContext {
  /** Items the node is handed, as plain `json` payloads. */
  readonly input?: readonly unknown[];

  /** Items every node the body names by hand answered. */
  readonly nodes?: Readonly<Record<string, readonly unknown[]>>;
}

/**
 * A node name that resolved to nothing runnable.
 *
 * One error for three shapes — no node of that name, a node of
 * another type, a Code node whose `jsCode` is not a string —
 * because all three are the same edit from a case's point of view
 * and a reader sent back once per shape reads the second failure
 * as a new defect. The message carries the names the artifact DOES
 * hold, which is what a rename costs to fix.
 */
export class MissingCodeNodeError extends Error {
  /** The artifact that was read, by file name. */
  public readonly file: string;

  /** The node name that resolved to nothing. */
  public readonly node: string;

  public constructor(file: string, node: string, held: readonly string[]) {
    super(
      `[code-node] ${file} holds no Code node named ${node}; it holds `
      + (held.length === 0
        ? 'no Code node at all'
        : held.join(', ')),
    );
    this.name = 'MissingCodeNodeError';
    this.file = file;
    this.node = node;
  }
}

/**
 * A built body still carrying a marker the build resolves.
 *
 * The one failure that says the harness read the wrong tree. Every
 * other refusal here is about what a case supplied.
 */
export class UnresolvedMarkerError extends Error {
  /** The node whose body still holds one. */
  public readonly node: string;

  public constructor(file: string, node: string, prefix: string) {
    super(
      `[code-node] ${file}:${node} still holds a ${prefix} marker, so `
      + 'it was read from workflows/src/ rather than from the built '
      + 'tree, or the build did not resolve it',
    );
    this.name = 'UnresolvedMarkerError';
    this.node = node;
  }
}

/**
 * A body reaching a node by name that the case did not supply.
 *
 * n8n answers `undefined` for a node that has not executed, which
 * reaches the body as a member access on nothing and surfaces as a
 * `TypeError` naming a property. Refusing by name here turns that
 * into the sentence the case needs, and it is the one refusal that
 * fires while a case is being WRITTEN rather than in CI.
 */
export class UnmockedNodeError extends Error {
  /** The node name the body reached for. */
  public readonly node: string;

  public constructor(node: string, supplied: readonly string[]) {
    super(
      `[code-node] the body reads $('${node}'), which this case did `
      + 'not supply; it supplied '
      + (supplied.length === 0
        ? 'no node at all'
        : supplied.join(', ')),
    );
    this.name = 'UnmockedNodeError';
    this.node = node;
  }
}

/**
 * A body that answered something other than a list of items.
 *
 * A Code node in run-once-for-all-items mode answers an array of
 * `{ json }`, and an assertion reading members off whatever else it
 * answered would report a shape fault as a missing member several
 * lines later.
 */
export class NotItemsError extends Error {
  public constructor(node: string, answered: string) {
    super(
      `[code-node] ${node} answered ${answered} rather than a list of `
      + 'items, each carrying a json object',
    );
    this.name = 'NotItemsError';
  }
}

/** Everything runnable in one built artifact. */
export interface CodeNodeSuite {
  /** The artifact these bodies were read from, by file name. */
  readonly file: string;

  /** Every Code node's name, in the artifact's own order. */
  readonly names: readonly string[];

  /**
   * One node's built body, as an instance loads it.
   *
   * @param node - The node's name on the canvas.
   * @throws MissingCodeNodeError When no Code node carries it.
   */
  body(node: string): string;

  /**
   * One node's body, run over what the case supplies.
   *
   * @param node - The node's name on the canvas.
   * @param context - The items it is handed and the items every
   * node it reads by name answered.
   * @returns The items the body returned.
   * @throws MissingCodeNodeError When no Code node carries the name.
   * @throws UnmockedNodeError When the body reads a node the case
   * did not supply.
   * @throws NotItemsError When the body answered anything else.
   */
  run(node: string, context?: CodeNodeContext): readonly CodeNodeItem[];
}

/** The `parameters` object of a node, or an empty one. */
function parametersOf(node: BuiltWorkflowNode): Record<string, unknown> {
  const parameters = node['parameters'];

  return typeof parameters === 'object' && parameters !== null
    && !Array.isArray(parameters)
    ? parameters as Record<string, unknown>
    : {};
}

/** How a bad answer is described, without quoting it. */
function shapeOf(answer: unknown): string {
  if (answer === null) {
    return 'null';
  }

  return Array.isArray(answer)
    ? 'a list holding something other than items'
    : typeof answer;
}

/** Wraps a case's plain payloads into the items a node reads. */
function itemsOf(payloads: readonly unknown[]): readonly CodeNodeItem[] {
  return payloads.map((json) => ({ json } as CodeNodeItem));
}

/** Whether an answer is the list of items a Code node returns. */
function isItems(answer: unknown): answer is readonly CodeNodeItem[] {
  return Array.isArray(answer)
    && answer.every((item) => typeof item === 'object' && item !== null
      && typeof (item as { json?: unknown }).json === 'object');
}

/**
 * Every Code-node body in one built artifact, ready to run.
 *
 * @param file - The artifact's file name under `workflows/dist/`,
 * exactly as the build wrote it.
 * @returns A suite over that artifact's Code nodes.
 * @throws EmptyDistDirectoryError When nothing has been built.
 * @throws MissingCodeNodeError When the artifact is not there, or
 * holds no Code node at all.
 * @throws UnresolvedMarkerError When a body still carries a marker.
 */
export function codeNodes(file: string): CodeNodeSuite {
  const workflow: BuiltWorkflow | undefined = loadBuiltWorkflows()
    .find((built) => built.file === file);
  const bodies = new Map<string, string>();

  for (const node of workflow?.nodes ?? []) {
    const code = parametersOf(node)['jsCode'];

    if (node.type !== CODE_NODE_TYPE || typeof code !== 'string') {
      continue;
    }

    for (const prefix of MARKER_PREFIXES) {
      if (code.includes(prefix)) {
        throw new UnresolvedMarkerError(file, node.name, prefix);
      }
    }

    bodies.set(node.name, code);
  }

  const names = [...bodies.keys()];

  if (names.length === 0) {
    throw new MissingCodeNodeError(file, '<any>', names);
  }

  const bodyOf = (node: string): string => {
    const code = bodies.get(node);

    if (code === undefined) {
      throw new MissingCodeNodeError(file, node, names);
    }

    return code;
  };

  return {
    file,
    names,
    body: bodyOf,
    run: (node, context = {}) => runBody(node, bodyOf(node), context),
  };
}

/**
 * One built body, compiled and run with the globals it reaches for.
 *
 * `require` and `module` are parameters bound to `undefined` rather
 * than a rewrite of the source — see the header. `Buffer` is the
 * real one, which is what a Code node has and what nothing in this
 * package's nodes uses yet.
 */
function runBody(
  node: string,
  code: string,
  context: CodeNodeContext,
): readonly CodeNodeItem[] {
  const supplied = context.nodes ?? {};
  const names = Object.keys(supplied);
  const input = itemsOf(context.input ?? []);
  const $input = {
    all: () => input,
    first: () => input[0],
  };
  const $ = (name: string) => {
    if (!Object.hasOwn(supplied, name)) {
      throw new UnmockedNodeError(name, names);
    }

    const items = itemsOf(supplied[name] ?? []);

    return {
      all: () => items,
      first: () => items[0],
    };
  };
  const body = new Function(
    '$input',
    '$',
    'Buffer',
    'require',
    'module',
    code,
  );
  const answer: unknown = body($input, $, Buffer, undefined, undefined);

  if (!isItems(answer)) {
    throw new NotItemsError(node, shapeOf(answer));
  }

  return answer;
}
