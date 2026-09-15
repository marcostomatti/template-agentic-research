import type { FetchPort, ResponsePort, SessionPort } from './client';
import type { Session } from '../../auth/session';

import { describe, expect, it, vi } from 'vitest';

import {
  createApiClient,
  joinUrl,
  NETWORK,
  PAGINATION_DRIFT,
  WALK_PER_PAGE,
} from './client';
import { ApiError, BAD_ENVELOPE, RATE_LIMITED, UNAUTHORIZED } from './envelope';

// Every case runs over a stubbed `fetch` and asserts what the stub RECEIVED
// — method, URL and headers — never that the real network was left alone.
// A case asserting the stub received NO request (a refused path, a walk that
// stops) is paired with a control in which the same client does reach it,
// so a stub that could never be called would fail the control.

const BASE = 'http://service.test';

const HELD: Session = {
  token: 'tok-held',
  sub: 'basic:operator',
  expiresAt: '2026-09-16T13:00:00.000Z',
};

interface Reply {
  readonly status: number;
  readonly body?: unknown;
}

function responseFor(reply: Reply): ResponsePort {
  const text = reply.body === undefined
    ? ''
    : typeof reply.body === 'string'
      ? reply.body
      : JSON.stringify(reply.body);

  return { status: reply.status, text: () => Promise.resolve(text) };
}

/** A `fetch` stub answering `replies` in order, recording every call. */
function stubFetch(...replies: readonly Reply[]) {
  let queue = replies;
  const fetch = vi.fn<FetchPort>(() => {
    const [next, ...rest] = queue;

    if (next === undefined) {
      return Promise.reject(new Error('the stub has no reply left'));
    }

    queue = rest;

    return Promise.resolve(responseFor(next));
  });

  return fetch;
}

function sessionHolding(held: Session | null) {
  let current = held;
  const session = {
    get: vi.fn(() => current),
    clear: vi.fn(() => {
      current = null;
    }),
  } satisfies SessionPort;

  return session;
}

function clientOver(
  fetch: FetchPort,
  session: SessionPort = sessionHolding(null),
  onUnauthorized: () => void = vi.fn(),
) {
  return createApiClient({ baseUrl: BASE, fetch, session, onUnauthorized });
}

/** The URL, method and headers of the stub's `index`-th call. */
function received(fetch: ReturnType<typeof stubFetch>, index = 0) {
  const call = fetch.mock.calls[index];

  if (call === undefined) {
    throw new Error(`the stub received no request ${String(index)}`);
  }

  const [url, init] = call;

  return {
    url,
    method: init.method,
    headers: init.headers,
    body: init.body,
  };
}

/** Await `promise`'s rejection, failing when it resolves. */
async function rejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }

  throw new Error('expected the request to reject');
}

async function apiRejection(promise: Promise<unknown>): Promise<ApiError> {
  const error = await rejection(promise);

  if (!(error instanceof ApiError)) {
    throw error;
  }

  return error;
}

function listBody(rows: readonly unknown[], page: number, total: number) {
  return {
    success: true,
    data: rows,
    meta: {
      page,
      perPage: WALK_PER_PAGE,
      total,
      totalPages: Math.ceil(total / WALK_PER_PAGE),
    },
  };
}

describe('joinUrl', () => {
  it.each([
    ['a relative path', 'domains'],
    ['an absolute URL', 'https://elsewhere.test/domains'],
    ['a protocol-relative path', '//elsewhere.test/domains'],
    ['an empty path', ''],
  ])('refuses %s', (_, path) => {
    // Act / Assert
    expect(() => joinUrl(BASE, path)).toThrow(TypeError);
  });

  it.each([
    ['an absolute origin', BASE, `${BASE}/domains`],
    ['a trailing slash on the base', `${BASE}/`, `${BASE}/domains`],
    ['the dev proxy prefix', '/api', '/api/domains'],
    ['the same-origin empty base', '', '/domains'],
  ])('joins %s with a root-absolute path', (_, base, expected) => {
    // Act / Assert
    expect(joinUrl(base, '/domains')).toBe(expected);
  });

  it('appends the query in order and leaves undefined values out', () => {
    // Act
    const url = joinUrl(BASE, '/terms', {
      q: 'a b',
      category: undefined,
      active: true,
      page: 2,
    });

    // Assert
    expect(url).toBe(`${BASE}/terms?q=a+b&active=true&page=2`);
  });
});

describe('createApiClient — refusals', () => {
  it('rejects a path that is not root-absolute before calling fetch', async () => {
    // Arrange
    const fetch = stubFetch({ status: 200, body: { success: true, data: 1 } });
    const client = clientOver(fetch);

    // Act
    const error = await rejection(client.get('https://elsewhere.test/x'));

    // Assert
    expect(error).toBeInstanceOf(TypeError);
    expect(fetch).not.toHaveBeenCalled();

    // Control: the same client and stub answer a root-absolute path.
    await expect(client.get('/x')).resolves.toBe(1);
    expect(received(fetch).url).toBe(`${BASE}/x`);
  });

  it('rejects a fetch that rejects as NETWORK with status 0', async () => {
    // Arrange
    const fetch = vi.fn<FetchPort>(() => Promise.reject(new TypeError('Failed to fetch')));
    const client = clientOver(fetch);

    // Act
    const error = await apiRejection(client.get('/domains'));

    // Assert
    expect(error.code).toBe(NETWORK);
    expect(error.status).toBe(0);
    expect(error.message).toContain('Failed to fetch');
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/domains`,
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('rejects a body that cannot be read as NETWORK', async () => {
    // Arrange
    const fetch = vi.fn<FetchPort>(() => Promise.resolve({
      status: 200,
      text: () => Promise.reject(new Error('connection reset')),
    }));
    const client = clientOver(fetch);

    // Act
    const error = await apiRejection(client.get('/domains'));

    // Assert
    expect(error.code).toBe(NETWORK);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]?.[0]).toBe(`${BASE}/domains`);
  });

  it('rejects a 2xx body with no envelope as BAD_ENVELOPE', async () => {
    // Arrange
    const fetch = stubFetch({ status: 200, body: { id: 'd1' } });

    // Act
    const error = await apiRejection(clientOver(fetch).get('/domains/d1'));

    // Assert
    expect(error.code).toBe(BAD_ENVELOPE);
    expect(received(fetch)).toMatchObject({ url: `${BASE}/domains/d1`, method: 'GET' });
  });

  it('rejects a framework failure with its code, message and details', async () => {
    // Arrange
    const fetch = stubFetch({
      status: 422,
      body: { code: 'VALIDATION_ERROR', message: 'Invalid body', details: [{ path: 'name' }] },
    });
    const session = sessionHolding(HELD);
    const onUnauthorized = vi.fn();

    // Act
    const error = await apiRejection(
      clientOver(fetch, session, onUnauthorized).post('/domains', { name: '' }),
    );

    // Assert
    expect(error).toMatchObject({
      status: 422,
      code: 'VALIDATION_ERROR',
      message: 'Invalid body',
      details: [{ path: 'name' }],
    });
    expect(received(fetch)).toMatchObject({ url: `${BASE}/domains`, method: 'POST' });
    expect(session.clear).not.toHaveBeenCalled();
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it.each([
    ['requireAuth\'s bare body', { error: 'Unauthorized' }],
    ['a framework body', { code: 'UNAUTHORIZED', message: 'Token expired' }],
    ['a body that is not JSON', '<html>401</html>'],
  ])('on a 401 with %s, clears the session and calls onUnauthorized before rejecting', async (_, body) => {
    // Arrange
    const order: string[] = [];
    const fetch = stubFetch({ status: 401, body });
    const session = sessionHolding(HELD);
    session.clear.mockImplementation(() => {
      order.push('clear');
    });
    const onUnauthorized = vi.fn(() => {
      order.push('onUnauthorized');
    });
    const client = clientOver(fetch, session, onUnauthorized);

    // Act
    const error = await client.get('/me').catch((caught: unknown) => {
      order.push('rejected');

      return caught;
    });

    // Assert
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe(UNAUTHORIZED);
    expect(order).toEqual(['clear', 'onUnauthorized', 'rejected']);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(received(fetch)).toMatchObject({
      url: `${BASE}/me`,
      method: 'GET',
      headers: { Authorization: 'Bearer tok-held' },
    });
  });

  it('on a 429, rejects as RATE_LIMITED and keeps the session', async () => {
    // Arrange
    const fetch = stubFetch({ status: 429, body: { error: 'Too Many Requests' } });
    const session = sessionHolding(HELD);
    const onUnauthorized = vi.fn();

    // Act
    const error = await apiRejection(
      clientOver(fetch, session, onUnauthorized).post('/auth/login', { username: 'u' }),
    );

    // Assert
    expect(error.code).toBe(RATE_LIMITED);
    expect(received(fetch)).toMatchObject({ url: `${BASE}/auth/login`, method: 'POST' });
    expect(session.clear).not.toHaveBeenCalled();
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});

describe('createApiClient — requests', () => {
  it('sends no Authorization header when no session is held', async () => {
    // Arrange
    const fetch = stubFetch({ status: 200, body: { success: true, data: [] } });

    // Act
    await clientOver(fetch, sessionHolding(null)).get('/domains');

    // Assert
    const { url, method, headers } = received(fetch);
    expect(url).toBe(`${BASE}/domains`);
    expect(method).toBe('GET');
    expect(headers).toEqual({ Accept: 'application/json' });
  });

  it('sends the held session as a bearer header, read at request time', async () => {
    // Arrange
    const fetch = stubFetch(
      { status: 200, body: { success: true, data: 1 } },
      { status: 200, body: { success: true, data: 2 } },
    );
    let held: Session | null = null;
    const session: SessionPort = { get: () => held, clear: vi.fn() };
    const client = clientOver(fetch, session);

    // Act
    await client.get('/one');
    held = HELD;
    await client.get('/two');

    // Assert
    expect(received(fetch, 0).headers).not.toHaveProperty('Authorization');
    expect(received(fetch, 1)).toMatchObject({
      url: `${BASE}/two`,
      method: 'GET',
      headers: { Authorization: 'Bearer tok-held' },
    });
  });

  it('resolves a GET to the envelope data and sends its query', async () => {
    // Arrange
    const fetch = stubFetch({ status: 200, body: { success: true, data: { id: 'd1' } } });

    // Act
    const data = await clientOver(fetch).get<{ id: string }>('/domains/d1', {
      query: { include: 'counts' },
    });

    // Assert
    expect(data).toEqual({ id: 'd1' });
    expect(received(fetch)).toMatchObject({
      url: `${BASE}/domains/d1?include=counts`,
      method: 'GET',
    });
  });

  it.each(['post', 'put', 'patch'] as const)('%s sends a JSON body with its content type', async (verb) => {
    // Arrange
    const fetch = stubFetch({ status: 200, body: { success: true, data: { ok: verb } } });
    const client = clientOver(fetch, sessionHolding(HELD));

    // Act
    const data = await client[verb]('/settings', { theme: 'dark' });

    // Assert
    expect(data).toEqual({ ok: verb });
    expect(received(fetch)).toEqual({
      url: `${BASE}/settings`,
      method: verb.toUpperCase(),
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'Bearer tok-held',
      },
      body: '{"theme":"dark"}',
    });
  });

  it('delete resolves a 204 with no body to undefined', async () => {
    // Arrange
    const fetch = stubFetch({ status: 204 });

    // Act
    const data = await clientOver(fetch, sessionHolding(HELD)).delete('/terms/t1', {
      query: { confirm: 1 },
    });

    // Assert
    expect(data).toBeUndefined();
    expect(received(fetch)).toEqual({
      url: `${BASE}/terms/t1?confirm=1`,
      method: 'DELETE',
      headers: { Accept: 'application/json', Authorization: 'Bearer tok-held' },
      body: undefined,
    });
  });
});

describe('fetchAllPages — refusals', () => {
  it.each(['page', 'perPage'])('rejects a query naming %s before calling fetch', async (member) => {
    // Arrange
    const fetch = stubFetch({ status: 200, body: listBody([], 1, 0) });
    const client = clientOver(fetch);

    // Act
    const error = await rejection(client.fetchAllPages('/terms', { [member]: 1 }));

    // Assert
    expect(error).toBeInstanceOf(TypeError);
    expect(fetch).not.toHaveBeenCalled();

    // Control: the same client and stub walk the path without it.
    await expect(client.fetchAllPages('/terms')).resolves.toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('refuses a meta whose totalPages changes mid-walk and requests no further page', async () => {
    // Arrange
    const fetch = stubFetch(
      { status: 200, body: listBody(['a'], 1, 401) },
      { status: 200, body: listBody(['b'], 2, 601) },
      { status: 200, body: listBody(['c'], 3, 601) },
    );

    // Act
    const error = await apiRejection(clientOver(fetch).fetchAllPages('/terms'));

    // Assert
    expect(error.code).toBe(PAGINATION_DRIFT);
    expect(error.status).toBe(200);
    expect(error.details).toEqual({ page: 2, expected: 3, received: 4 });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(received(fetch, 1).url).toBe(`${BASE}/terms?page=2&perPage=200`);
  });

  it('rejects a page that is not a paginated envelope as BAD_ENVELOPE', async () => {
    // Arrange
    const fetch = stubFetch({ status: 200, body: { success: true, data: [] } });

    // Act
    const error = await apiRejection(clientOver(fetch).fetchAllPages('/terms'));

    // Assert
    expect(error.code).toBe(BAD_ENVELOPE);
    expect(received(fetch).url).toBe(`${BASE}/terms?page=1&perPage=200`);
  });

  it('ends the walk on a failed page with that page\'s error', async () => {
    // Arrange
    const fetch = stubFetch(
      { status: 200, body: listBody(['a'], 1, 401) },
      { status: 500, body: { code: 'INTERNAL_ERROR', message: 'boom' } },
      { status: 200, body: listBody(['c'], 3, 401) },
    );

    // Act
    const error = await apiRejection(clientOver(fetch).fetchAllPages('/terms'));

    // Assert
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(received(fetch, 1).url).toBe(`${BASE}/terms?page=2&perPage=200`);
  });
});

describe('fetchAllPages — walks', () => {
  it('answers total: 0 from one request', async () => {
    // Arrange
    const fetch = stubFetch(
      { status: 200, body: listBody([], 1, 0) },
      { status: 200, body: listBody(['never'], 2, 0) },
    );

    // Act
    const rows = await clientOver(fetch).fetchAllPages('/terms');

    // Assert
    expect(rows).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(received(fetch)).toMatchObject({
      url: `${BASE}/terms?page=1&perPage=200`,
      method: 'GET',
    });
  });

  it('stops at page === totalPages when there is one page', async () => {
    // Arrange
    const fetch = stubFetch(
      { status: 200, body: listBody(['a', 'b'], 1, 2) },
      { status: 200, body: listBody([], 2, 2) },
    );

    // Act
    const rows = await clientOver(fetch).fetchAllPages('/terms');

    // Assert
    expect(rows).toEqual(['a', 'b']);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('walks every page with its filters and the bearer header, rows in page order', async () => {
    // Arrange
    const fetch = stubFetch(
      { status: 200, body: listBody(['a1', 'a2'], 1, 401) },
      { status: 200, body: listBody(['b1', 'b2'], 2, 401) },
      { status: 200, body: listBody(['c1'], 3, 401) },
      { status: 200, body: listBody(['never'], 4, 401) },
    );

    // Act
    const rows = await clientOver(fetch, sessionHolding(HELD)).fetchAllPages('/domains/d/terms', {
      category: 'c1',
    });

    // Assert
    expect(rows).toEqual(['a1', 'a2', 'b1', 'b2', 'c1']);
    expect(fetch).toHaveBeenCalledTimes(3);
    [1, 2, 3].forEach((page, index) => {
      expect(received(fetch, index)).toMatchObject({
        url: `${BASE}/domains/d/terms?category=c1&page=${String(page)}&perPage=200`,
        method: 'GET',
        headers: { Authorization: 'Bearer tok-held' },
      });
    });
  });
});
