import { afterEach, describe, expect, it, vi } from 'vitest';

import * as api from './api';
import * as fixtureApi from './fixture/api';
import * as httpApi from './http/api';
import { resolveDataSource } from './source';

// The selector, from both sides of its one switch. The statically
// imported `api` above is the module as the unit suite loads it — no
// `VITE_AR_API_URL` in the environment, so the fixture layer — and each
// case that wants the other side loads a FRESH copy of all three modules
// after stubbing the variable, because the selection is made once at
// import and a stub applied afterwards would reach nothing.
//
// Identity is the assertion throughout: an export that merely BEHAVES
// like the fixture accessor would pass a behavioural check while coming
// from the wrong layer, and `hooks.test.ts` compares its fetchers to
// these same bindings by identity too.

/** The accessor count both barrels carry. */
const ACCESSOR_COUNT = 34;

/** The exported function names of a barrel, sorted. */
const accessorNames = (namespace: object): readonly string[] => Object
  .keys(namespace)
  .filter(
    (name) => typeof (namespace as Record<string, unknown>)[name] === 'function',
  )
  .sort();

/** One barrel's export, by name. */
const at = (namespace: object, name: string): unknown => (
  namespace as Record<string, unknown>
)[name];

/** Load the selector and both layers under one `VITE_AR_API_URL`. */
const freshLayers = async (apiUrl: string | undefined) => {
  vi.resetModules();
  vi.stubEnv('VITE_AR_API_URL', apiUrl);

  return {
    selector: await import('./api'),
    fixture: await import('./fixture/api'),
    http: await import('./http/api'),
  };
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('the export surface', () => {
  it('is exactly the fixture barrel\'s 34 accessor names', () => {
    // Arrange / Act
    const exported = accessorNames(api);

    // Assert
    expect(exported).toHaveLength(ACCESSOR_COUNT);
    expect(exported).toStrictEqual(accessorNames(fixtureApi));
  });

  it('exports no value beside the accessors', () => {
    // The guard `hooks.test.ts` rests on: it partitions
    // `Object.keys(api)` into 25 reads and 9 writes by the `fetch`
    // prefix, so any extra value export here would be counted as a
    // write and demand a hook that does not exist.
    // Arrange / Act
    const exported = Object.keys(api);

    // Assert
    expect(exported.sort()).toStrictEqual(accessorNames(fixtureApi));
  });
});

describe('the switch', () => {
  it('takes every accessor from the fixture layer with the variable unset', async () => {
    // Arrange
    const { selector, fixture, http } = await freshLayers(undefined);

    // Assert
    for (const name of accessorNames(fixture)) {
      expect(at(selector, name)).toBe(at(fixture, name));
      expect(at(selector, name)).not.toBe(at(http, name));
    }
  });

  it('takes every accessor from the HTTP layer with a base URL set', async () => {
    // The control for the case above: the same 34 comparisons, answered
    // the other way, so a selector wired to one layer unconditionally
    // fails one of the two.
    // Arrange
    const { selector, fixture, http } = await freshLayers('http://service.test');

    // Assert
    for (const name of accessorNames(fixture)) {
      expect(at(selector, name)).toBe(at(http, name));
      expect(at(selector, name)).not.toBe(at(fixture, name));
    }
  });

  it('takes the HTTP layer for the empty string, which is same-origin', async () => {
    // The production value of a `/app` build. A falsy test in the
    // selector would send this build back to the fixtures.
    // Arrange
    const { selector, fixture, http } = await freshLayers('');

    // Assert
    expect(at(selector, 'fetchOperator')).toBe(at(http, 'fetchOperator'));
    expect(at(selector, 'fetchOperator')).not.toBe(at(fixture, 'fetchOperator'));
  });

  it('answers the unit suite\'s own import from the fixture layer', async () => {
    // What every other colocated suite and the page tests depend on,
    // asserted on the STATIC import rather than a reloaded one: a
    // `VITE_AR_API_URL` in the environment or in a `.env` file would
    // move the whole fixture suite onto NOT_WIRED stubs, and this is
    // the case that would say so.
    // Assert
    expect(api.fetchDomains).toBe(fixtureApi.fetchDomains);
    await expect(api.fetchDomains()).resolves.not.toHaveLength(0);
  });
});

describe('the inlined comparison against resolveDataSource', () => {
  // `./api.ts` selects on `API_URL === undefined` rather than on
  // `resolveDataSource(...).kind`, because rolldown folds the former
  // against the literal Vite substitutes and drops the layer not taken,
  // and does not fold the latter. These cases are what keeps the two
  // spellings the same rule: every value `./source.test.ts` covers is
  // asked of both.
  const VALUES: readonly (string | undefined)[] = [
    undefined,
    '',
    '/api',
    'http://127.0.0.1:3100/',
    '   ',
  ];

  it.each(VALUES)('agrees on %o', (value) => {
    // Arrange / Act
    const inlined = value === undefined;

    // Assert
    expect(inlined).toBe(resolveDataSource(value).kind === 'fixture');
  });

  it('would not agree if the comparison were a falsy test (control)', () => {
    // The near-miss the cases above exist to catch, and the proof they
    // could fail: `!value` and `value === undefined` differ on exactly
    // the same-origin value, and only one of them is the rule.
    // Arrange
    const falsySelectsFixture = (value: string | undefined): boolean => !value;

    // Assert
    expect(falsySelectsFixture('')).toBe(true);
    expect(resolveDataSource('').kind).toBe('api');
    expect(falsySelectsFixture(undefined)).toBe(true);
    expect(resolveDataSource(undefined).kind).toBe('fixture');
  });
});

describe('the HTTP layer behind the switch', () => {
  it('answers a stub accessor by rejecting rather than throwing', async () => {
    // The shape a page meets on the other side of the switch, read
    // through the selector rather than through `./http/api.ts`: a
    // rejected promise is an error state a page renders, where a
    // synchronous throw would take the shell down with it.
    // Arrange
    const { selector } = await freshLayers('http://service.test');

    // Act
    const called = (selector.fetchSettings as () => Promise<unknown>)();

    // Assert
    await expect(called).rejects.toMatchObject({
      code: httpApi.NOT_WIRED,
      details: { accessor: 'fetchSettings' },
    });
  });
});
