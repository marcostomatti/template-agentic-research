/**
 * Port-parity harness — runs an origin JavaScript library and its
 * TypeScript port over the same neutral fixtures and reports the first
 * place their answers differ.
 *
 * The origin checkout path arrives in one environment variable and is
 * recorded nowhere else. Two of the three reasons are what make that
 * law rather than preference. It is an operator's local filesystem
 * path, so a tracked default would publish where a private checkout
 * sits on somebody's disk. And a default would arm the gate below
 * against a path nobody supplied: a suite that quietly loaded
 * something else, or quietly loaded nothing, is strictly worse than
 * one that skips. So `describePortParity` is `describe.skip` until the
 * variable is exported, and the parity files SKIPPING is the steady
 * state of every run that did not arm it — CI included, since nothing
 * in this repository exports the variable and no compose service
 * supplies it. The third reason is de-origination: that value is the
 * only origin-specific string anywhere near this seam, because
 * everything else the loader is handed is a GENERIC relative path the
 * calling suite supplies.
 *
 * `loadOriginModule` refuses an origin root that resolves inside this
 * repository, and that is a correctness rule before it is a hygiene
 * one. A root pointing here would diff the port against files from
 * this same tree — quite possibly against itself — and every parity
 * suite would go green having measured nothing, which is the one
 * failure mode a go/no-go gate must not have. The hygiene half matters
 * too: an origin tree copied under this one is a single `git add -A`
 * from the remote, carrying exactly the material the port exists to
 * leave behind. Refusing the root is what stops such a copy from
 * becoming the quiet path of least resistance the day the variable is
 * unset.
 *
 * One caution about failures. The refusals below interpolate the path
 * they were handed, so a RED parity run can print the origin checkout
 * path; do not paste that output into a tracked file, a commit message
 * or a PR body. A green run prints file names and counts and none of
 * it.
 */
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe } from 'vitest';

/**
 * The only place the origin-root variable is named.
 *
 * Held in one constant so the hygiene invariant over this directory
 * can assert a single occurrence rather than a distribution.
 */
const ORIGIN_ROOT_ENV = 'AR_PORT_PARITY_ORIGIN';

/** The origin checkout root the operator exported, if any. */
export const PORT_PARITY_ORIGIN = process.env[ORIGIN_ROOT_ENV];

/**
 * `describe` when the origin root is exported, `describe.skip` when it
 * is not — the same seam shape as the live-Postgres and n8n gates.
 *
 * The explicit type annotation is load-bearing for the reason
 * `describeLivePg` carries one: inferred, the `describe | describe.skip`
 * union resolves to unnameable vitest-internal types and `tsc --noEmit`
 * fails repo-wide (TS2742/TS4023).
 */
export const describePortParity: (name: string, fn: () => void) => void = PORT_PARITY_ORIGIN
  ? describe
  : describe.skip;

/**
 * This repository's root, resolved from this file rather than from the
 * working directory, so the containment refusal means the same thing
 * however vitest was started.
 */
const REPO_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));

/** Whether `candidate` IS `parent` or sits somewhere beneath it. */
function isAtOrInside(parent: string, candidate: string): boolean {
  const step = relative(parent, candidate);

  return step === '' || (!isAbsolute(step) && step !== '..' && !step.startsWith(`..${sep}`));
}

/**
 * Resolves the origin root, refusing every state in which a parity run
 * would measure something other than the origin.
 *
 * @param originRoot - Root to use, defaulting to the exported one.
 * @returns The absolute, existing origin root.
 */
function requireOriginRoot(originRoot: string | undefined): string {
  if (originRoot === undefined || originRoot === '') {
    throw new Error(
      `[port-parity] ${ORIGIN_ROOT_ENV} is not set. Export the origin checkout root to run the parity suite; nothing in this repository records it.`,
    );
  }

  const root = resolve(originRoot);

  if (isAtOrInside(REPO_ROOT, root)) {
    throw new Error(
      `[port-parity] refusing an origin root inside this repository (./${relative(REPO_ROOT, root) || '.'}) — a root here diffs the port against this same tree and passes having measured nothing.`,
    );
  }

  if (!existsSync(root)) {
    throw new Error(`[port-parity] the origin root does not exist: ${root}`);
  }

  return root;
}

/**
 * Resolves one module inside the origin root.
 *
 * The path must be relative and must stay under the root: the
 * environment carries the only absolute path this harness accepts, and
 * a suite that could reach outside the root could reach back into this
 * repository the containment check above just refused.
 *
 * @param root - Absolute origin root.
 * @param modulePath - Generic path relative to that root.
 * @returns The absolute path of an existing file.
 */
function resolveOriginModule(root: string, modulePath: string): string {
  if (isAbsolute(modulePath)) {
    throw new Error(
      `[port-parity] "${modulePath}" is absolute — a module is addressed by a path relative to the origin root, which only ${ORIGIN_ROOT_ENV} may carry.`,
    );
  }

  const resolved = resolve(root, modulePath);

  if (resolved === root || !isAtOrInside(root, resolved)) {
    throw new Error(`[port-parity] "${modulePath}" resolves outside the origin root.`);
  }

  if (!existsSync(resolved)) {
    throw new Error(`[port-parity] the origin root holds no "${modulePath}".`);
  }

  return resolved;
}

/**
 * Loads one origin module and returns its exports as `unknown`.
 *
 * The origin ships CommonJS, so this goes through `createRequire`
 * rather than a dynamic import — based at the module's own resolved
 * path, which is what lets a relative require INSIDE that module find
 * its neighbour. Node's require cache means a second load of the same
 * module returns the same object; measured, none of the modules this
 * plan ports has a load-time side effect, which is what makes a
 * same-process parity run possible at all.
 *
 * The return type is `unknown` and not `any` on purpose. `any` would
 * disable checking at every call site in every parity suite, so a
 * mistyped export name would read as `undefined` at run time while
 * type-checking clean — and a parity case comparing `undefined`
 * against `undefined` is the false green this whole seam exists to
 * prevent. Each suite narrows what it asked for.
 *
 * @param modulePath - Generic path relative to the origin root, e.g.
 * a `<area>/<name>.js` under the checkout.
 * @param originRoot - Root to load from. Defaults to the exported one;
 * a caller passes its own only to reach the refusals above.
 * @returns Whatever the origin module assigned to `module.exports`.
 */
export function loadOriginModule(
  modulePath: string,
  originRoot: string | undefined = PORT_PARITY_ORIGIN,
): unknown {
  const root = requireOriginRoot(originRoot);
  const resolved = resolveOriginModule(root, modulePath);
  const requireFromOrigin = createRequire(resolved);

  return requireFromOrigin(resolved) as unknown;
}

/** What kind of difference `firstDivergence` found. */
export type DivergenceReason =
  /** Both sides hold a value of the same kind, and they differ. */
  | 'value'
  /** The two sides hold different kinds of value. */
  | 'type'
  /** One side has no value at this path at all. */
  | 'absent'
  /** A kind the differ does not model, reported rather than assumed equal. */
  | 'unsupported';

/** The first place two results parted, and how. */
export interface Divergence {
  /** Reader-facing path into the results, rooted at `$`. */
  readonly path: string;

  /** What differs there. */
  readonly reason: DivergenceReason;

  /** The origin side at that path, rendered for a failure message. */
  readonly origin: string;

  /** The port side at that path, rendered the same way. */
  readonly port: string;
}

/**
 * The first structural divergence between two results, by path, or
 * `null` when they agree.
 *
 * Four decisions a reader should not have to infer from the code.
 *
 * Primitives compare with `Object.is`, so `NaN` matches `NaN` and a
 * signed zero is a divergence: the two serialize identically, which
 * means nothing downstream of a JSON round trip would ever catch it.
 *
 * Object keys are visited in SORTED order, and key ORDER is not itself
 * compared. Sorting makes the reported path independent of which side
 * happened to declare its keys first; leaving order out keeps the
 * differ honest about what it measures, since order is a claim about
 * one implementation rather than about the two agreeing. A caller who
 * needs it gets it for free by diffing `Object.keys(a)` against
 * `Object.keys(b)` here — arrays ARE order-sensitive.
 *
 * A missing key and a key holding `undefined` are different answers,
 * reported as `absent` and `value` respectively. JSON collapses them;
 * `Object.keys` does not, and neither does this.
 *
 * A value whose kind the differ does not model comes back as an
 * `unsupported` divergence naming that kind, never as agreement — an
 * exotic object with no own enumerable keys would otherwise read as
 * equal to any other, which is the failure a go/no-go gate cannot
 * afford. Cycles are safe: a pair already under comparison is treated
 * as agreeing, the standard structural-equality reading.
 *
 * @param origin - Result the origin module produced.
 * @param port - Result the port produced from the same input.
 * @returns The first divergence, or `null` when the two agree.
 */
export function firstDivergence(origin: unknown, port: unknown): Divergence | null {
  return walk(origin, port, '$', new Map());
}

/** Stands for a path one side does not have at all. */
const ABSENT = Symbol('port-parity.absent');

/** Longest rendered value a divergence carries before it is cut. */
const RENDER_LIMIT = 120;

/** Keys that read back as `.name` rather than as a bracketed string. */
const PLAIN_KEY = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function walk(
  origin: unknown,
  port: unknown,
  path: string,
  seen: Map<object, Set<object>>,
): Divergence | null {
  if (Object.is(origin, port)) {
    return null;
  }

  const originKind = kindOf(origin);
  const portKind = kindOf(port);

  if (originKind !== portKind) {
    const reason: DivergenceReason = originKind === 'absent' || portKind === 'absent'
      ? 'absent'
      : 'type';

    return divergence(path, reason, origin, port);
  }

  if (!isObjectLike(origin) || !isObjectLike(port)) {
    return divergence(path, 'value', origin, port);
  }

  if (hasBeenCompared(seen, origin, port)) {
    return null;
  }

  if (originKind === 'date') {
    return Object.is((origin as Date).getTime(), (port as Date).getTime())
      ? null
      : divergence(path, 'value', origin, port);
  }

  if (originKind === 'regexp') {
    return String(origin) === String(port)
      ? null
      : divergence(path, 'value', origin, port);
  }

  if (originKind === 'array') {
    return walkList(origin as readonly unknown[], port as readonly unknown[], path, seen);
  }

  if (isIndexedView(origin) && isIndexedView(port)) {
    return walkList(Array.from(origin), Array.from(port), path, seen);
  }

  if (originKind === 'object') {
    return walkKeys(origin, port, path, seen);
  }

  return divergence(path, 'unsupported', origin, port);
}

function walkList(
  origin: readonly unknown[],
  port: readonly unknown[],
  path: string,
  seen: Map<object, Set<object>>,
): Divergence | null {
  const length = Math.max(origin.length, port.length);

  for (let index = 0; index < length; index += 1) {
    const found = walk(at(origin, index), at(port, index), `${path}[${index}]`, seen);

    if (found !== null) {
      return found;
    }
  }

  return null;
}

function walkKeys(
  origin: object,
  port: object,
  path: string,
  seen: Map<object, Set<object>>,
): Divergence | null {
  const keys = [...new Set([...Object.keys(origin), ...Object.keys(port)])].sort();

  for (const key of keys) {
    const found = walk(read(origin, key), read(port, key), `${path}${step(key)}`, seen);

    if (found !== null) {
      return found;
    }
  }

  return null;
}

/** The element at `index`, or `ABSENT` when the list is shorter. */
function at(list: readonly unknown[], index: number): unknown {
  return index < list.length
    ? list[index]
    : ABSENT;
}

/** The own value at `key`, or `ABSENT` when the key is not there. */
function read(source: object, key: string): unknown {
  return Object.hasOwn(source, key)
    ? (source as Record<string, unknown>)[key]
    : ABSENT;
}

function step(key: string): string {
  return PLAIN_KEY.test(key)
    ? `.${key}`
    : `[${JSON.stringify(key)}]`;
}

/**
 * Whether this pair has already been compared, recording it when not.
 *
 * Keyed on the PAIR rather than on either side: two structures can
 * share a node without being the same structure, and collapsing that
 * to a single seen-set would report agreement nobody established.
 */
function hasBeenCompared(
  seen: Map<object, Set<object>>,
  origin: object,
  port: object,
): boolean {
  const against = seen.get(origin);

  if (against === undefined) {
    seen.set(origin, new Set([port]));
    return false;
  }

  if (against.has(port)) {
    return true;
  }

  against.add(port);
  return false;
}

function isObjectLike(value: unknown): value is object {
  return (typeof value === 'object' && value !== null) || typeof value === 'function';
}

/**
 * Typed arrays and buffers, which compare like lists.
 *
 * `DataView` is excluded: it carries no indices, so a list read of one
 * is empty for every instance and any two would read as equal.
 */
function isIndexedView(value: unknown): value is ArrayLike<number | bigint> {
  return ArrayBuffer.isView(value) && !(value instanceof DataView);
}

/** The kind name a divergence is classified and reported by. */
function kindOf(value: unknown): string {
  if (value === ABSENT) {
    return 'absent';
  }

  if (value === null) {
    return 'null';
  }

  const type = typeof value;

  if (type !== 'object' && type !== 'function') {
    return type;
  }

  const tag = Object.prototype.toString.call(value);

  return tag.slice(8, -1).toLowerCase();
}

function divergence(
  path: string,
  reason: DivergenceReason,
  origin: unknown,
  port: unknown,
): Divergence {
  return { path, reason, origin: render(origin), port: render(port) };
}

/**
 * A value as a failure message should show it.
 *
 * Two rules beyond the obvious. Rendering never throws: the neutral
 * corpus these suites run over holds a circular object, and
 * `JSON.stringify` throws on one — a differ that died while describing
 * a difference would report no difference at all. And an object kind
 * the differ does not model renders as its kind name rather than
 * through JSON, because `JSON.stringify` answers `{}` for a `Set`, an
 * `Error` and much else besides, which reads as an empty object and
 * hides what was actually there.
 */
function render(value: unknown): string {
  const kind = kindOf(value);

  switch (kind) {
    case 'absent':
      return '<absent>';
    case 'string':
      return truncate(JSON.stringify(value));
    case 'bigint':
      return `${String(value)}n`;
    case 'regexp':
      return truncate(String(value));
    case 'null':
    case 'undefined':
    case 'number':
    case 'boolean':
    case 'symbol':
      return String(value);
    default:
      break;
  }

  if (kind !== 'object' && kind !== 'array' && kind !== 'date') {
    return `<${kind}>`;
  }

  try {
    const json: string | undefined = JSON.stringify(value);

    return json === undefined
      ? `<${kind}>`
      : truncate(json);
  } catch {
    return `<${kind}>`;
  }
}

function truncate(text: string): string {
  return text.length <= RENDER_LIMIT
    ? text
    : `${text.slice(0, RENDER_LIMIT)}...`;
}
