/**
 * The parity harness itself, over the two functions every other file
 * in this directory takes on faith.
 *
 * A parity suite is a go/no-go gate that reads a port against the
 * origin through `loadOriginModule` and `firstDivergence`, and each
 * of the two has a failure shape that would take every one of those
 * suites green while measuring nothing: a loader answering an empty
 * object leaves no export to call, and a differ answering `null` for
 * everything agrees with anything. Neither shows up anywhere else,
 * because a suite built on them reports exactly what they report. So
 * they are measured here, before any port is.
 *
 * The two differ cases are each other's control, and they are
 * deliberately one pair. Both compare the same declared result
 * against the same assembly, and the only difference between the two
 * runs is one label substituted in the parts that assembly is built
 * from — so the agreeing case is what says nothing ELSE about the
 * pair parts, which is what makes the path the diverging case
 * reports the substituted leaf rather than the first of several.
 * Read the other way: a differ reporting a divergence for everything
 * passes the diverging case and fails the agreeing one, and a differ
 * reporting `null` for everything does the reverse. Neither passes
 * both.
 *
 * The declared side is written out and the assembled side is built
 * from a table, which duplicates the fixture on purpose: two
 * structures stamped by one builder are equal by construction and
 * would say nothing about the differ at all. The duplication is not
 * left unwatched — the agreeing case is exactly the check that the
 * two halves still say the same thing, so a fixture that drifted
 * reddens there and names itself.
 *
 * Every load sits INSIDE a case rather than at module scope. The
 * gate binds a `describe` and nothing above one — measured on this
 * package's other gated suites — so module scope runs on a skipped
 * run as well, and a load up there would throw on every run that
 * armed nothing, CI's included. That is the one way a file in this
 * directory can break a run it was written to skip.
 *
 * The absent root is assembled out of this machine's temporary
 * directory rather than written down, because no absolute filesystem
 * path may appear in a file here. Its refusal is pinned to the
 * phrase it is refused in rather than to the fact that something was
 * thrown: three refusals stand ahead of any module resolution, and a
 * case reading only that a throw arrived passes for any of them.
 */
import type { Divergence } from '../helpers/port-parity.js';

import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, it } from 'vitest';

import {
  describePortParity,
  firstDivergence,
  loadOriginModule,
} from '../helpers/port-parity.js';

// ---------------------------------------------------------------------------
// The origin module these cases address, and a root that holds nothing
// ---------------------------------------------------------------------------

/**
 * One origin library, addressed the only way this harness allows.
 *
 * A path relative to the checkout root, carrying an area and a
 * module name and nothing about where that checkout sits — which is
 * the whole of what a parity suite is permitted to know. The module
 * is the port roster's first entry and was chosen for what it does
 * NOT do: it reads text and returns a value, requires no neighbour
 * and touches nothing at load, so a case can ask what it exports
 * without arranging anything first.
 */
const ORIGIN_MODULE_PATH = 'lib/yaml-lite.js';

/**
 * Every name that module assigns to `module.exports`, sorted.
 *
 * Sorted because the loader hands back an object and the claim is
 * about its export SET; the order keys land in belongs to the origin
 * and is not something a port is asked to reproduce.
 */
const ORIGIN_EXPORT_NAMES: readonly string[] = [
  'parseYamlLite',
  'parseYamlScalar',
  'stripYamlComment',
];

/**
 * A root outside this repository that nothing made.
 *
 * Assembled rather than written down: no absolute filesystem path
 * may appear in a file here, and the temporary directory is the one
 * place a machine can be asked for an absolute path it will name
 * itself. The stem is one nothing else uses, and the case below
 * asserts the whole thing is absent before asking the loader to
 * refuse it — a root that happened to exist would be refused for
 * some other reason, or not at all.
 */
const ABSENT_ORIGIN_ROOT = join(tmpdir(), 'ar-port-parity-no-such-origin-root');

// ---------------------------------------------------------------------------
// A pair of results, one written out and one assembled from parts
// ---------------------------------------------------------------------------

/** One row of a sample result. */
interface SampleRow {
  /** What the row is about. */
  readonly id: string;

  /** The leaf the diverging pair below parts at. */
  readonly label: string;

  /** `0` where a zero was measured, `null` where nothing was. */
  readonly measured: number | null;
}

/** A sample result, as both sides of a pair carry it. */
interface SampleResult {
  /** The rows, in order — a list, so this IS order-sensitive. */
  readonly rows: readonly SampleRow[];

  /** How many of them measured anything. */
  readonly counted: number;
}

/** One row's worth of parts, as the assembly below reads them. */
type SamplePart = readonly [id: string, label: string, measured: number | null];

/**
 * The result as a literal, standing in for an origin's answer.
 *
 * Its keys are declared `rows` before `counted`, where the assembly
 * returns them the other way round. That is deliberate rather than
 * untidy: the differ documents key ORDER as something it does not
 * compare, so two objects reaching agreement through it while
 * listing their keys differently is what says the twin below was
 * built by another route rather than copied from here.
 */
const DECLARED_RESULT: SampleResult = {
  rows: [
    { id: 'first', label: 'alpha', measured: 0 },
    { id: 'second', label: 'beta', measured: null },
  ],
  counted: 1,
};

/** The parts the twin is assembled from. */
const AGREEING_PARTS: readonly SamplePart[] = [
  ['first', 'alpha', 0],
  ['second', 'beta', null],
];

/** The same parts with one label moved, and nothing else. */
const DIVERGING_PARTS: readonly SamplePart[] = [
  ['first', 'alpha', 0],
  ['second', 'gamma', null],
];

/**
 * A result assembled from parts rather than written out.
 *
 * `counted` is reduced out of the rows instead of stated, so the
 * side this builds reaches its value the way an implementation would
 * rather than by agreeing with the literal in advance.
 *
 * @param parts - One entry per row, in order.
 * @returns The result those parts describe.
 */
function assembleResult(parts: readonly SamplePart[]): SampleResult {
  const rows: readonly SampleRow[] = parts.map(([id, label, measured]) => ({
    measured,
    label,
    id,
  }));

  return {
    counted: rows.filter((row) => row.measured !== null).length,
    rows,
  };
}

/** {@link DECLARED_RESULT}, assembled instead of written. */
const ASSEMBLED_TWIN: SampleResult = assembleResult(AGREEING_PARTS);

/** The same assembly with one label moved. */
const ASSEMBLED_APART: SampleResult = assembleResult(DIVERGING_PARTS);

/**
 * The whole of what the differ should report about that one label.
 *
 * Pinned as a record rather than as a path alone, because the path
 * is only half the answer a failing parity run needs: `value` says
 * the two sides held the same kind of thing, and the two rendered
 * sides say which of them was which.
 */
const EXPECTED_DIVERGENCE: Divergence = {
  path: '$.rows[1].label',
  reason: 'value',
  origin: '"beta"',
  port: '"gamma"',
};

// ---------------------------------------------------------------------------
// Narrowing what the loader hands back
// ---------------------------------------------------------------------------

/** Whether a loaded module is something with readable keys. */
function isExportsObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * A loaded module, narrowed to the object a require answers with.
 *
 * The loader returns `unknown` on purpose so each suite narrows what
 * it asked for; this is that step, and it refuses rather than
 * casting. A module that answered a primitive would otherwise read
 * as one carrying no exports at all, which is precisely the false
 * green the loader's return type exists to prevent.
 *
 * @param loaded - Whatever the loader answered with.
 * @returns The same value, with its keys readable.
 */
function exportsOf(loaded: unknown): Record<string, unknown> {
  if (!isExportsObject(loaded)) {
    throw new TypeError(
      `the origin module answered ${typeof loaded}, not an exports object.`,
    );
  }

  return loaded;
}

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

describePortParity('loadOriginModule — an origin root that is not there', () => {
  it('is handed a root nothing made', () => {
    expect(existsSync(ABSENT_ORIGIN_ROOT)).toBe(false);
  });

  it('refuses it naming the path it was handed', () => {
    expect(() => loadOriginModule(ORIGIN_MODULE_PATH, ABSENT_ORIGIN_ROOT))
      .toThrow(ABSENT_ORIGIN_ROOT);
  });

  it('refuses it for being absent, not for being somewhere', () => {
    expect(() => loadOriginModule(ORIGIN_MODULE_PATH, ABSENT_ORIGIN_ROOT))
      .toThrow('the origin root does not exist');
  });
});

describePortParity('loadOriginModule — a module the origin holds', () => {
  it('returns the export names that module declares', () => {
    const loaded = exportsOf(loadOriginModule(ORIGIN_MODULE_PATH));

    expect(Object.keys(loaded).sort()).toEqual(ORIGIN_EXPORT_NAMES);
  });

  it('returns each of those names bound to something callable', () => {
    const loaded = exportsOf(loadOriginModule(ORIGIN_MODULE_PATH));

    expect(ORIGIN_EXPORT_NAMES.map((name) => `${name}: ${typeof loaded[name]}`))
      .toEqual(ORIGIN_EXPORT_NAMES.map((name) => `${name}: function`));
  });
});

describePortParity('firstDivergence — two results that part', () => {
  it('reports the path they parted at, and what parted there', () => {
    expect(firstDivergence(DECLARED_RESULT, ASSEMBLED_APART))
      .toEqual(EXPECTED_DIVERGENCE);
  });
});

describePortParity('firstDivergence — two results built independently', () => {
  it('is handed a twin the declared result shares nothing with', () => {
    expect(ASSEMBLED_TWIN).not.toBe(DECLARED_RESULT);
    expect(ASSEMBLED_TWIN.rows).not.toBe(DECLARED_RESULT.rows);
    expect(Object.keys(ASSEMBLED_TWIN)).not.toEqual(Object.keys(DECLARED_RESULT));
  });

  it('reports no divergence between them', () => {
    expect(firstDivergence(DECLARED_RESULT, ASSEMBLED_TWIN)).toBeNull();
  });
});
