import type { FetchPort, ResponsePort } from './client';
import type { Session } from '../../auth/session';

import { describe, expect, it, vi } from 'vitest';

import { createSessionStore } from '../../auth/session';

import { createApiClient, WALK_PER_PAGE } from './client';
import { UNAUTHORIZED } from './envelope';

// The cross-module case set: a real session store (over a memory-backed
// storage port and an injected clock, never `createBrowserSession`) driving
// a real API client over a stubbed `fetch`. `session.ts`, `envelope.ts` and
// `client.ts` are each covered on their own elsewhere; what only shows up
// here is the seam between them — an expired session reaching the client's
// header builder, and a client's `UNAUTHORIZED` reaching the store's clear.

const BASE = 'http://service.test';
const NOW = Date.parse('2026-09-16T12:00:00.000Z');

const HELD: Session = {
  token: 'tok-held',
  sub: 'operator-1',
  expiresAt: '2026-09-16T13:00:00.000Z',
};

const EXPIRED: Session = {
  ...HELD,
  token: 'tok-expired',
  expiresAt: '2026-09-16T11:59:59.999Z',
};

function memoryStorage(initial: Record<string, string> = {}) {
  const entries = new Map(Object.entries(initial));

  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
    removeItem: (key: string) => {
      entries.delete(key);
    },
  };
}

function storeHolding(session: Session | null) {
  const store = createSessionStore({
    storage: memoryStorage(
      session === null
        ? {}
        : { 'ar.session': JSON.stringify(session) },
    ),
    now: () => NOW,
  });

  return store;
}

interface Reply {
  readonly status: number;
  readonly body?: unknown;
}

function responseFor(reply: Reply): ResponsePort {
  return {
    status: reply.status,
    text: () => Promise.resolve(JSON.stringify(reply.body ?? {})),
  };
}

function stubFetch(...replies: readonly Reply[]) {
  let queue = replies;

  return vi.fn<FetchPort>(() => {
    const [next, ...rest] = queue;

    if (next === undefined) {
      return Promise.reject(new Error('the stub has no reply left'));
    }

    queue = rest;

    return Promise.resolve(responseFor(next));
  });
}

/** The `Authorization` header, if any, of the stub's `index`-th call. */
function authorizationOf(fetch: ReturnType<typeof stubFetch>, index = 0): string | undefined {
  const call = fetch.mock.calls[index];

  if (call === undefined) {
    throw new Error(`the stub received no request ${String(index)}`);
  }

  return call[1].headers.Authorization;
}

function listBody(rows: readonly unknown[], page: number, totalPages: number) {
  return {
    success: true,
    data: rows,
    meta: { page, perPage: WALK_PER_PAGE, total: totalPages * rows.length, totalPages },
  };
}

describe('an expired stored session', () => {
  it('sends no Authorization header', async () => {
    // Arrange
    const session = storeHolding(EXPIRED);
    const fetch = stubFetch({ status: 200, body: { success: true, data: [] } });
    const client = createApiClient({
      baseUrl: BASE,
      fetch,
      session,
      onUnauthorized: vi.fn(),
    });

    // Act
    await client.get('/domains');

    // Assert
    expect(session.get()).toBeNull();
    expect(authorizationOf(fetch)).toBeUndefined();
  });
});

describe('a 401 partway through fetchAllPages', () => {
  it('on page two, clears the session, calls onUnauthorized once and requests no page three', async () => {
    // Arrange
    const session = storeHolding(HELD);
    const onUnauthorized = vi.fn();
    const fetch = stubFetch(
      { status: 200, body: listBody(['a1', 'a2'], 1, 3) },
      { status: 401, body: { error: 'Unauthorized' } },
      { status: 200, body: listBody(['never'], 3, 3) },
    );
    const client = createApiClient({
      baseUrl: BASE,
      fetch,
      session,
      onUnauthorized,
    });

    // Act
    const error = await client.fetchAllPages('/domains/d/terms').catch((caught: unknown) => caught);

    // Assert
    expect(error).toMatchObject({ code: UNAUTHORIZED });
    expect(session.get()).toBeNull();
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(new URL(fetch.mock.calls[1]?.[0] ?? '').searchParams.get('page')).toBe('2');
  });
});

describe('a held session across a three-page walk', () => {
  it('reaches the stub on every page and answers one array in page order', async () => {
    // Arrange
    const session = storeHolding(HELD);
    const fetch = stubFetch(
      { status: 200, body: listBody(['a1', 'a2'], 1, 3) },
      { status: 200, body: listBody(['b1', 'b2'], 2, 3) },
      { status: 200, body: listBody(['c1'], 3, 3) },
    );
    const client = createApiClient({
      baseUrl: BASE,
      fetch,
      session,
      onUnauthorized: vi.fn(),
    });

    // Act
    const rows = await client.fetchAllPages('/domains/d/terms');

    // Assert
    expect(rows).toEqual(['a1', 'a2', 'b1', 'b2', 'c1']);
    expect(fetch).toHaveBeenCalledTimes(3);
    [0, 1, 2].forEach((index) => {
      expect(authorizationOf(fetch, index)).toBe('Bearer tok-held');
    });
  });
});
