import type { DevToolsFetch } from './host';
import type { DevToolsConfig, DevToolsStatus } from './types';

import { describe, expect, it } from 'vitest';

import { devtoolsBus, createDevToolsBus } from './bus';
import {
  DEVTOOLS_DEFAULT_ENDPOINT,
  DEVTOOLS_UNKNOWN_VERSION,
  buildDevToolsHost,
  resolveDevToolsApiVersion,
} from './host';

/**
 * ## What this file pins, and what it cannot
 *
 * `host.ts` is pure, so every case here is a call and a read: no
 * renderer, no storage, no network. The platform `fetch` is injected
 * through `fetchImpl`, so the joined path is read off a recorder
 * rather than off a request that was actually sent — which is what
 * makes the refusal cases provable at all, since a refused path must
 * produce no call.
 *
 * What it cannot pin is that the browser treats the joined path as
 * same-origin. The join answers a path and the assertions read a
 * string; that a string beginning `/__devtools/` is sent to the app's
 * own origin is the platform's guarantee, not this module's, and no
 * case below would notice if the platform changed its mind.
 */

/** The status payload every case starts from. */
const STATUS: DevToolsStatus = {
  commit: 'statuscommit',
  branch: 'status-branch',
  round: 'status-round',
  persistence: false,
  gateway: 'none',
};

/**
 * Build a config, defaulting the one required member.
 *
 * @param overrides - Whatever the case is about.
 * @returns A config safe to hand to the builder.
 */
function createConfig(overrides: Partial<DevToolsConfig> = {}): DevToolsConfig {
  return { features: [], ...overrides };
}

/**
 * Build an `extra` answering whatever a JavaScript caller might.
 *
 * The cast is the point: `extra` is TYPED to answer primitives, and
 * these cases prove what happens when it does not — an app compiled
 * from JavaScript, an `as` cast, or a stale build.
 *
 * @param value - What the getter should answer.
 * @returns A getter answering exactly that.
 */
function extraAnswering(value: unknown): NonNullable<DevToolsConfig['extra']> {
  return (() => value) as NonNullable<DevToolsConfig['extra']>;
}

/** A recording `fetch` and the calls it took. */
interface FetchRecorder {
  /** Every `(url, init)` pair, in call order. */
  readonly calls: [string, RequestInit | undefined][];

  /** The implementation to inject. */
  readonly impl: DevToolsFetch;

  /** What every call answers. */
  readonly response: Response;
}

/**
 * Build a `fetch` that records and sends nothing.
 *
 * @returns The recorder.
 */
function createFetchRecorder(): FetchRecorder {
  const calls: [string, RequestInit | undefined][] = [];
  const response = new Response('{}');

  return {
    calls,
    response,
    impl: (url, init) => {
      calls.push([url, init]);

      return Promise.resolve(response);
    },
  };
}

describe('what the host refuses', () => {
  it('drops a nested value from the context record', () => {
    const host = buildDevToolsHost({
      config: createConfig({
        extra: extraAnswering({
          route: '/agents',
          nested: { deep: 'value' },
          list: ['a', 'b'],
          nothing: null,
          missing: undefined,
          callback: () => 'no',
          huge: 10n,
          tag: Symbol('tag'),
        }),
      }),
      status: STATUS,
    });

    expect(host.context()).toEqual({
      commit: STATUS.commit,
      branch: STATUS.branch,
      round: STATUS.round,
      endpoint: DEVTOOLS_DEFAULT_ENDPOINT,
      route: '/agents',
    });
  });

  it('drops a NaN and an infinity while keeping a finite number', () => {
    const host = buildDevToolsHost({
      config: createConfig({
        extra: extraAnswering({
          items: 12,
          ratio: Number.NaN,
          ceiling: Number.POSITIVE_INFINITY,
          floor: Number.NEGATIVE_INFINITY,
        }),
      }),
      status: STATUS,
    });

    expect(host.context()).toMatchObject({ items: 12 });
    expect(Object.keys(host.context())).not.toContain('ratio');
    expect(Object.keys(host.context())).not.toContain('ceiling');
    expect(Object.keys(host.context())).not.toContain('floor');
  });

  it('answers the fixed keys alone when extra() throws', () => {
    const host = buildDevToolsHost({
      config: createConfig({
        extra: () => {
          throw new Error('the app context getter is broken');
        },
      }),
      status: STATUS,
    });

    expect(() => host.context()).not.toThrow();
    expect(host.context()).toEqual({
      commit: STATUS.commit,
      branch: STATUS.branch,
      round: STATUS.round,
      endpoint: DEVTOOLS_DEFAULT_ENDPOINT,
    });
  });

  it('answers the fixed keys alone when extra() answers no record', () => {
    const fixed = {
      commit: STATUS.commit,
      branch: STATUS.branch,
      round: STATUS.round,
      endpoint: DEVTOOLS_DEFAULT_ENDPOINT,
    };

    for (const answer of [null, ['a'], 'text', 7]) {
      const host = buildDevToolsHost({
        config: createConfig({ extra: extraAnswering(answer) }),
        status: STATUS,
      });

      expect(host.context()).toEqual(fixed);
    }
  });

  it(
    'rejects a path climbing above the endpoint, and sends nothing',
    async () => {
      const recorder = createFetchRecorder();
      const host = buildDevToolsHost({
        config: createConfig(),
        status: STATUS,
        fetchImpl: recorder.impl,
      });

      await expect(host.fetch('../../admin')).rejects.toThrow(
        'escapes the endpoint /__devtools',
      );
      expect(recorder.calls).toEqual([]);
    },
  );

  it('rejects a path that names another origin', async () => {
    const recorder = createFetchRecorder();
    const host = buildDevToolsHost({
      config: createConfig(),
      status: STATUS,
      fetchImpl: recorder.impl,
    });

    await expect(host.fetch('http://example.test/x')).rejects.toThrow(
      'names an origin',
    );
    expect(recorder.calls).toEqual([]);
  });

  it('rejects a protocol-relative path', async () => {
    const recorder = createFetchRecorder();
    const host = buildDevToolsHost({
      config: createConfig(),
      status: STATUS,
      fetchImpl: recorder.impl,
    });

    await expect(host.fetch('//example.test/x')).rejects.toThrow(
      'names an origin',
    );
    expect(recorder.calls).toEqual([]);
  });

  it(
    'rejects a doubled-backslash path that lands outside the endpoint',
    async () => {
      const recorder = createFetchRecorder();
      const host = buildDevToolsHost({
        config: createConfig(),
        status: STATUS,
        fetchImpl: recorder.impl,
      });

      // Measured, not assumed: `new URL('\\example.test/x',
      // 'http://devtools.invalid/__devtools/')` answers origin
      // `http://example.test` and pathname `/x`, because WHATWG maps a
      // backslash onto a slash for special schemes. Both guards would
      // catch this one; the case below is the one that separates them.
      await expect(host.fetch('\\\\example.test/x')).rejects.toThrow(
        'resolves onto another origin',
      );
      expect(recorder.calls).toEqual([]);
    },
  );

  it(
    'rejects a doubled-backslash path whose pathname lands INSIDE it',
    async () => {
      const recorder = createFetchRecorder();
      const host = buildDevToolsHost({
        config: createConfig(),
        status: STATUS,
        fetchImpl: recorder.impl,
      });

      // The case that makes the origin comparison a reachable guard
      // rather than a decorative one: this resolves to origin
      // `http://example.test` with pathname `/__devtools/report`, which
      // the containment check finds acceptable. Dropping the origin
      // comparison reds this case and nothing else (measured; see the
      // module's mutation note).
      await expect(
        host.fetch('\\\\example.test/__devtools/report'),
      ).rejects.toThrow('resolves onto another origin');
      expect(recorder.calls).toEqual([]);
    },
  );

  it(
    'rejects a single-backslash path, which lands outside the endpoint',
    async () => {
      const recorder = createFetchRecorder();
      const host = buildDevToolsHost({
        config: createConfig(),
        status: STATUS,
        fetchImpl: recorder.impl,
      });

      await expect(host.fetch('\\example.test')).rejects.toThrow(
        'escapes the endpoint /__devtools',
      );
      expect(recorder.calls).toEqual([]);
    },
  );

  it('refuses to build when the configured endpoint names an origin', () => {
    expect(() => buildDevToolsHost({
      config: createConfig({ endpoint: 'https://example.test/__devtools' }),
      status: STATUS,
    })).toThrow('names an origin');

    expect(() => buildDevToolsHost({
      config: createConfig({ endpoint: '//example.test/__devtools' }),
      status: STATUS,
    })).toThrow('names an origin');
  });

  it('refuses to build when the configured endpoint could resolve out '
    + 'of itself', () => {
    for (const endpoint of ['/__devtools/..', '/..', '/a/./b', '/a b']) {
      expect(() => buildDevToolsHost({
        config: createConfig({ endpoint }),
        status: STATUS,
      })).toThrow('is not a plain path');
    }
  });

  it('answers a null api version when the probe rejects', async () => {
    const config = createConfig({
      apiVersion: () => Promise.reject(new Error('service down')),
    });

    await expect(resolveDevToolsApiVersion(config)).resolves.toBeNull();
  });

  it(
    'answers a null api version when the probe throws synchronously',
    async () => {
      const config = createConfig({
        apiVersion: () => {
          throw new Error('probe misconfigured');
        },
      });

      await expect(resolveDevToolsApiVersion(config)).resolves.toBeNull();
    },
  );

  it(
    'answers a null api version when the probe answers a blank string',
    async () => {
      const config = createConfig({
        apiVersion: () => Promise.resolve('   '),
      });

      await expect(resolveDevToolsApiVersion(config)).resolves.toBeNull();
    },
  );
});

describe('what the host is pointed at', () => {
  it('defaults the endpoint to /__devtools', () => {
    const host = buildDevToolsHost({ config: createConfig(), status: STATUS });

    expect(host.endpoint).toBe('/__devtools');
    expect(DEVTOOLS_DEFAULT_ENDPOINT).toBe('/__devtools');
  });

  it('adds a leading slash and drops trailing ones', () => {
    const host = buildDevToolsHost({
      config: createConfig({ endpoint: '__inner/tools//' }),
      status: STATUS,
    });

    expect(host.endpoint).toBe('/__inner/tools');
  });

  it('defaults the endpoint when the configured one is blank', () => {
    const host = buildDevToolsHost({
      config: createConfig({ endpoint: '   ' }),
      status: STATUS,
    });

    expect(host.endpoint).toBe(DEVTOOLS_DEFAULT_ENDPOINT);
  });
});

describe('what the host fetches', () => {
  it('joins a bare path onto the endpoint', async () => {
    const recorder = createFetchRecorder();
    const host = buildDevToolsHost({
      config: createConfig(),
      status: STATUS,
      fetchImpl: recorder.impl,
    });

    await host.fetch('report');

    expect(recorder.calls).toEqual([['/__devtools/report', undefined]]);
  });

  it(
    'reads a leading slash as endpoint-relative, never origin-relative',
    async () => {
      const recorder = createFetchRecorder();
      const host = buildDevToolsHost({
        config: createConfig({ endpoint: '/__inner' }),
        status: STATUS,
        fetchImpl: recorder.impl,
      });

      await host.fetch('/report');

      expect(recorder.calls).toEqual([['/__inner/report', undefined]]);
    },
  );

  it('keeps a query and a fragment', async () => {
    const recorder = createFetchRecorder();
    const host = buildDevToolsHost({
      config: createConfig(),
      status: STATUS,
      fetchImpl: recorder.impl,
    });

    await host.fetch('report?round=q20b#last');

    expect(recorder.calls).toEqual([
      ['/__devtools/report?round=q20b#last', undefined],
    ]);
  });

  it('answers the endpoint itself for an empty path', async () => {
    const recorder = createFetchRecorder();
    const host = buildDevToolsHost({
      config: createConfig(),
      status: STATUS,
      fetchImpl: recorder.impl,
    });

    await host.fetch('');

    expect(recorder.calls).toEqual([['/__devtools', undefined]]);
  });

  it('keeps a nested path under the endpoint', async () => {
    const recorder = createFetchRecorder();
    const host = buildDevToolsHost({
      config: createConfig(),
      status: STATUS,
      fetchImpl: recorder.impl,
    });

    await host.fetch('reports/q20b/latest');

    expect(recorder.calls).toEqual([
      ['/__devtools/reports/q20b/latest', undefined],
    ]);
  });

  it('passes the init through and answers the response', async () => {
    const recorder = createFetchRecorder();
    const init: RequestInit = { method: 'POST', body: '{"a":1}' };
    const host = buildDevToolsHost({
      config: createConfig(),
      status: STATUS,
      fetchImpl: recorder.impl,
    });

    const answered = await host.fetch('report', init);

    expect(recorder.calls).toEqual([['/__devtools/report', init]]);
    expect(answered).toBe(recorder.response);
  });
});

describe('what the host says the app is doing', () => {
  it('merges the fixed keys with the app extra keys', () => {
    const host = buildDevToolsHost({
      config: createConfig({
        extra: () => ({ route: '/agents', source: 'fixtures', live: false }),
      }),
      status: STATUS,
      api: '1.4.0',
    });

    expect(host.context()).toEqual({
      commit: STATUS.commit,
      branch: STATUS.branch,
      round: STATUS.round,
      endpoint: DEVTOOLS_DEFAULT_ENDPOINT,
      api: '1.4.0',
      route: '/agents',
      source: 'fixtures',
      live: false,
    });
  });

  it('omits the api key when no probe answered', () => {
    const host = buildDevToolsHost({ config: createConfig(), status: STATUS });

    expect(Object.keys(host.context())).not.toContain('api');
  });

  it('lets an app key win over the fixed key of the same name', () => {
    const host = buildDevToolsHost({
      config: createConfig({ extra: () => ({ round: 'app-round' }) }),
      status: STATUS,
    });

    expect(host.context().round).toBe('app-round');
  });

  it('calls extra() per read rather than capturing it once', () => {
    const routes = ['/agents', '/lexicon'];
    let reads = 0;
    const host = buildDevToolsHost({
      config: createConfig({
        extra: () => {
          const route = routes[reads] ?? '/gone';

          reads += 1;

          return { route };
        },
      }),
      status: STATUS,
    });

    expect(host.context().route).toBe('/agents');
    expect(host.context().route).toBe('/lexicon');
    expect(reads).toBe(2);
  });

  it('names the endpoint it was actually pointed at', () => {
    const host = buildDevToolsHost({
      config: createConfig({ endpoint: '/__inner' }),
      status: STATUS,
    });

    expect(host.context().endpoint).toBe('/__inner');
  });
});

describe('what build the host says is running', () => {
  it('takes the config value over the status payload', () => {
    const host = buildDevToolsHost({
      config: createConfig({
        version: { commit: 'configcommit', branch: 'config-branch' },
      }),
      status: STATUS,
    });

    expect(host.version).toEqual({
      commit: 'configcommit',
      branch: 'config-branch',
      round: STATUS.round,
      api: null,
    });
  });

  it('takes the status payload when the config says nothing', () => {
    const host = buildDevToolsHost({ config: createConfig(), status: STATUS });

    expect(host.version).toEqual({
      commit: STATUS.commit,
      branch: STATUS.branch,
      round: STATUS.round,
      api: null,
    });
  });

  it('reads unknown when neither source said anything', () => {
    const host = buildDevToolsHost({ config: createConfig(), status: null });

    expect(host.version).toEqual({
      commit: DEVTOOLS_UNKNOWN_VERSION,
      branch: DEVTOOLS_UNKNOWN_VERSION,
      round: DEVTOOLS_UNKNOWN_VERSION,
      api: null,
    });
  });

  it('falls through a blank config value to the status payload', () => {
    const host = buildDevToolsHost({
      config: createConfig({ version: { commit: '', branch: '  ' } }),
      status: STATUS,
    });

    expect(host.version.commit).toBe(STATUS.commit);
    expect(host.version.branch).toBe(STATUS.branch);
  });

  it('takes api from the resolved probe alone', async () => {
    const config = createConfig({
      apiVersion: () => Promise.resolve('2.0.1'),
    });
    const api = await resolveDevToolsApiVersion(config);
    const host = buildDevToolsHost({ config, status: STATUS, api });

    expect(host.version.api).toBe('2.0.1');
  });

  it(
    'answers a null api version when the config names no probe',
    async () => {
      await expect(resolveDevToolsApiVersion(createConfig())).resolves
        .toBeNull();
    },
  );
});

describe('what else the host carries', () => {
  it('takes the live settings the shell handed it', () => {
    const host = buildDevToolsHost({
      config: createConfig({ size: 'sm', corner: 'top-left' }),
      status: STATUS,
      settings: { size: 'lg', corner: 'top-right' },
    });

    expect(host.settings).toEqual({ size: 'lg', corner: 'top-right' });
  });

  it('falls back to the configured size and corner', () => {
    const host = buildDevToolsHost({
      config: createConfig({ size: 'sm', corner: 'top-left' }),
      status: STATUS,
    });

    expect(host.settings).toEqual({ size: 'sm', corner: 'top-left' });
  });

  it('falls back to the medium trigger in the bottom-right corner', () => {
    const host = buildDevToolsHost({ config: createConfig(), status: STATUS });

    expect(host.settings).toEqual({ size: 'md', corner: 'bottom-right' });
  });

  it('carries the bus it was handed', () => {
    const bus = createDevToolsBus();
    const host = buildDevToolsHost({
      config: createConfig(),
      status: STATUS,
      bus,
    });

    expect(host.bus).toBe(bus);
  });

  it('carries the singleton bus when it was handed none', () => {
    const host = buildDevToolsHost({ config: createConfig(), status: STATUS });

    expect(host.bus).toBe(devtoolsBus);
  });

  it('is frozen, so one feature cannot edit what the next one reads', () => {
    const host = buildDevToolsHost({ config: createConfig(), status: STATUS });

    expect(Object.isFrozen(host)).toBe(true);
    expect(Object.isFrozen(host.version)).toBe(true);
    expect(Object.isFrozen(host.settings)).toBe(true);
  });
});
