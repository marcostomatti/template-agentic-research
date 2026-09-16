import type { RequestPort } from './client';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as fixtureApi from '../fixture/api';

import * as httpApi from './api';
import { ApiError, UNAUTHORIZED } from './envelope';
import { LOCAL_OPERATOR } from './operator';

// The HTTP barrel against the fixture barrel. The NOT_WIRED stubs are read
// straight off a static import. `fetchOperator` holds a module-level client,
// so each of its cases loads a FRESH copy of the module after stubbing the
// global `fetch`, `window` and `VITE_AR_API_URL` it reads on first use.

const BASE = 'http://service.test';
const SESSION_KEY = 'ar.session';

type Settled =
  | { readonly kind: 'threw'; readonly error: unknown }
  | { readonly kind: 'rejected'; readonly error: unknown }
  | { readonly kind: 'resolved'; readonly value: unknown };

/** Call with no arguments and report HOW it failed or answered. */
async function settle(call: () => unknown): Promise<Settled> {
  let returned: unknown;

  try {
    returned = call();
  } catch (error) {
    return { kind: 'threw', error };
  }

  try {
    return { kind: 'resolved', value: await returned };
  } catch (error) {
    return { kind: 'rejected', error };
  }
}

const accessorNames = (namespace: object) => Object.keys(namespace)
  .filter((name) => typeof (namespace as Record<string, unknown>)[name] === 'function')
  .sort();

describe('the export name set', () => {
  it('equals the fixture barrel\'s 34 accessor names', () => {
    expect(accessorNames(fixtureApi)).toHaveLength(34);
    expect(accessorNames(httpApi)).toStrictEqual(accessorNames(fixtureApi));
  });

  it('adds only the NOT_WIRED code beside the accessors', () => {
    const extra = Object.keys(httpApi).filter((name) => !(name in fixtureApi));

    expect(extra).toStrictEqual(['NOT_WIRED']);
  });
});

describe('settle (control)', () => {
  it('tells a synchronous throw from a rejection and a resolution', async () => {
    const thrower = () => {
      throw new Error('sync');
    };

    expect((await settle(thrower)).kind).toBe('threw');
    expect((await settle(() => Promise.reject(new Error('async')))).kind).toBe('rejected');
    expect((await settle(() => Promise.resolve(1))).kind).toBe('resolved');
  });
});

describe('the NOT_WIRED stubs', () => {
  const stubNames = accessorNames(httpApi).filter((name) => name !== 'fetchOperator');

  it('number 33', () => {
    expect(stubNames).toHaveLength(33);
  });

  it.each(stubNames)('%s rejects with NOT_WIRED naming itself rather than throwing', async (name) => {
    const accessor = (httpApi as unknown as Record<string, unknown>)[name];

    expect(accessor).toBeTypeOf('function');

    const settled = await settle(() => (accessor as () => unknown)());

    expect(settled.kind).toBe('rejected');

    const { error } = settled as { error: unknown };

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      code: httpApi.NOT_WIRED,
      status: 0,
      details: { accessor: name },
    });
    expect((error as ApiError).message).toContain(name);
  });
});

describe('fetchOperator', () => {
  const fetchStub = vi.fn<(url: string, init: RequestPort) => Promise<{ status: number; text: () => Promise<string> }>>();
  const stored = new Map<string, string>();

  const answer = (status: number, body: string) => {
    fetchStub.mockResolvedValueOnce({ status, text: () => Promise.resolve(body) });
  };

  const freshApi = async () => {
    vi.resetModules();

    return import('./api');
  };

  beforeEach(() => {
    stored.clear();
    fetchStub.mockReset();
    vi.stubEnv('VITE_AR_API_URL', `${BASE}/`);
    vi.stubGlobal('fetch', fetchStub);
    vi.stubGlobal('window', {
      sessionStorage: {
        getItem: (key: string) => stored.get(key) ?? null,
        setItem: (key: string, value: string) => stored.set(key, value),
        removeItem: (key: string) => stored.delete(key),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('rejects UNAUTHORIZED and clears the stored session on a 401', async () => {
    stored.set(SESSION_KEY, JSON.stringify({
      token: 'tok-refused',
      sub: 'basic:alice',
      expiresAt: '2999-01-01T00:00:00.000Z',
    }));
    answer(401, '{"error":"Unauthorized"}');

    const { fetchOperator } = await freshApi();

    await expect(fetchOperator()).rejects.toMatchObject({ code: UNAUTHORIZED, status: 401 });
    expect(fetchStub).toHaveBeenCalledTimes(1);
    expect(stored.has(SESSION_KEY)).toBe(false);
  });

  it('rejects BAD_ENVELOPE on a 200 body that is not { ok: true, sub }', async () => {
    answer(200, '{"ok":true,"sub":7}');

    const { fetchOperator } = await freshApi();

    await expect(fetchOperator()).rejects.toMatchObject({ code: 'BAD_ENVELOPE' });
    expect(fetchStub).toHaveBeenCalledTimes(1);
  });

  it('rejects BAD_ENVELOPE on a 200 body that is not JSON', async () => {
    answer(200, '<html></html>');

    const { fetchOperator } = await freshApi();

    await expect(fetchOperator()).rejects.toMatchObject({ code: 'BAD_ENVELOPE' });
  });

  it('answers LOCAL_OPERATOR from an open service\'s null sub, over GET /me', async () => {
    answer(200, '{"ok":true,"sub":null}');

    const { fetchOperator } = await freshApi();

    await expect(fetchOperator()).resolves.toStrictEqual(LOCAL_OPERATOR);
    expect(fetchStub).toHaveBeenCalledTimes(1);
    expect(fetchStub).toHaveBeenCalledWith(`${BASE}/me`, expect.objectContaining({
      method: 'GET',
      headers: expect.not.objectContaining({ Authorization: expect.anything() }),
    }));
  });

  it('names the operator after a basic sub and sends the stored bearer', async () => {
    stored.set(SESSION_KEY, JSON.stringify({
      token: 'tok-held',
      sub: 'basic:alice',
      expiresAt: '2999-01-01T00:00:00.000Z',
    }));
    answer(200, '{"ok":true,"sub":"basic:alice"}');

    const { fetchOperator } = await freshApi();

    await expect(fetchOperator()).resolves.toStrictEqual({
      name: 'alice',
      email: 'basic:alice',
      role: 'owner',
    });
    expect(fetchStub).toHaveBeenCalledWith(`${BASE}/me`, expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer tok-held' }),
    }));
  });

  it('builds the client once and reads the base URL on first use, not at import', async () => {
    vi.stubEnv('VITE_AR_API_URL', 'http://unused.test');

    const { fetchOperator } = await freshApi();

    vi.stubEnv('VITE_AR_API_URL', BASE);
    answer(200, '{"ok":true,"sub":null}');
    await fetchOperator();
    vi.stubEnv('VITE_AR_API_URL', 'http://later.test');
    answer(200, '{"ok":true,"sub":"basic:bob"}');
    await fetchOperator();

    expect(fetchStub.mock.calls.map(([url]) => url)).toStrictEqual([`${BASE}/me`, `${BASE}/me`]);
  });

  it('needs the lift: a client without it reads the same /me body as BAD_ENVELOPE (control)', async () => {
    answer(200, '{"ok":true,"sub":null}');

    const { createApiClient } = await import('./client');
    const client = createApiClient({
      baseUrl: BASE,
      fetch: fetchStub,
      session: { get: () => null, clear: () => undefined },
      onUnauthorized: () => undefined,
    });

    await expect(client.get('/me')).rejects.toMatchObject({ code: 'BAD_ENVELOPE' });
    expect(fetchStub).toHaveBeenCalledTimes(1);
  });
});
