import type { RequestPort } from './client';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The three auth calls over a stubbed `fetch`. Each case loads a FRESH
// copy of the module, because the client and the session store are held
// at module level and built on first use — a case reusing them would be
// reading the previous case's base URL and the previous case's session.
//
// Refusals run before the accepted cases in every block. The order is
// the point: a `login` that stored whatever arrived, a `logout` that
// cleared only on success and a `probeAuth` that answered `'open'` for
// anything non-`401` would each pass the accepted cases below, so the
// cases that tell them apart from the real thing come first.
//
// Every case also asserts what the stub RECEIVED, not only what the
// call answered. A resolved promise says nothing about which URL, which
// method or which body reached the service, and the bodies here are
// exactly what the service's own route tests parse.

const BASE = 'http://service.test';
const SESSION_KEY = 'ar.session';

/** A live session, far enough ahead that no clock skew expires it. */
const HELD = {
  token: 'tok-held',
  sub: 'basic:alice',
  expiresAt: '2999-01-01T00:00:00.000Z',
};

/** The credential a case types in. Not a real one anywhere. */
const CREDENTIAL = { user: 'alice', password: 'pw-typed' };

const fetchStub = vi.fn<
  (url: string, init: RequestPort) => Promise<{ status: number; text: () => Promise<string> }>
>();
const stored = new Map<string, string>();

/** Queue one reply for the next request the stub receives. */
const answer = (status: number, body: string) => {
  fetchStub.mockResolvedValueOnce({ status, text: () => Promise.resolve(body) });
};

/** Put a session in storage, as a reload would find one. */
const holdSession = () => {
  stored.set(SESSION_KEY, JSON.stringify(HELD));
};

const freshAuth = async () => {
  vi.resetModules();

  return import('./auth');
};

/** The request the stub received at `index`, or a failure naming it. */
function requestAt(index: number): readonly [string, RequestPort] {
  const call = fetchStub.mock.calls[index];

  if (call === undefined) {
    throw new Error(`the stub received no request ${String(index)}`);
  }

  return call;
}

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

describe('login', () => {
  it('refuses a wrong credential with UNAUTHORIZED and stores no session', async () => {
    // Arrange
    answer(401, '{"error":"Unauthorized"}');

    const { login } = await freshAuth();

    // Act
    const refusal = await login(CREDENTIAL).catch((caught: unknown) => caught);

    // Assert
    expect(refusal).toMatchObject({ code: 'UNAUTHORIZED', status: 401 });
    expect(stored.has(SESSION_KEY)).toBe(false);
    expect(requestAt(0)[0]).toBe(`${BASE}/auth/login`);
  });

  it('refuses a rate-limited attempt with RATE_LIMITED and stores no session', async () => {
    // Arrange
    answer(429, '{"error":"Too Many Requests"}');

    const { login } = await freshAuth();

    // Act
    const refusal = await login(CREDENTIAL).catch((caught: unknown) => caught);

    // Assert
    expect(refusal).toMatchObject({ code: 'RATE_LIMITED', status: 429 });
    expect(stored.has(SESSION_KEY)).toBe(false);
    expect(fetchStub).toHaveBeenCalledTimes(1);
  });

  it('refuses a transport failure with NETWORK and stores no session', async () => {
    // Arrange
    fetchStub.mockRejectedValueOnce(new Error('offline'));

    const { login } = await freshAuth();

    // Act
    const refusal = await login(CREDENTIAL).catch((caught: unknown) => caught);

    // Assert
    expect(refusal).toMatchObject({ code: 'NETWORK', status: 0 });
    expect(stored.has(SESSION_KEY)).toBe(false);
    expect(fetchStub).toHaveBeenCalledTimes(1);
  });

  it('refuses a 200 that carries no sub', async () => {
    // Arrange
    answer(200, '{"token":"tok-new","expiresAt":"2999-01-01T00:00:00.000Z"}');

    const { login } = await freshAuth();

    // Act
    const refusal = await login(CREDENTIAL).catch((caught: unknown) => caught);

    // Assert
    expect(refusal).toMatchObject({ code: 'BAD_ENVELOPE' });
    expect(stored.has(SESSION_KEY)).toBe(false);
    expect(fetchStub).toHaveBeenCalledTimes(1);
  });

  it('refuses a 200 whose expiresAt is not an ISO-8601 instant', async () => {
    // Arrange
    answer(200, '{"token":"tok-new","sub":"basic:alice","expiresAt":"in an hour"}');

    const { login } = await freshAuth();

    // Act
    const refusal = await login(CREDENTIAL).catch((caught: unknown) => caught);

    // Assert
    expect(refusal).toMatchObject({ code: 'BAD_ENVELOPE' });
    expect(stored.has(SESSION_KEY)).toBe(false);
  });

  it('refuses a 200 whose token is the empty string', async () => {
    // Arrange
    answer(200, '{"token":"","sub":"basic:alice","expiresAt":"2999-01-01T00:00:00.000Z"}');

    const { login } = await freshAuth();

    // Act
    const refusal = await login(CREDENTIAL).catch((caught: unknown) => caught);

    // Assert
    expect(refusal).toMatchObject({ code: 'BAD_ENVELOPE' });
    expect(stored.has(SESSION_KEY)).toBe(false);
  });

  it('refuses a 200 whose body is not JSON', async () => {
    // Arrange
    answer(200, '<html>proxy</html>');

    const { login } = await freshAuth();

    // Act
    const refusal = await login(CREDENTIAL).catch((caught: unknown) => caught);

    // Assert
    expect(refusal).toMatchObject({ code: 'BAD_ENVELOPE' });
    expect(stored.has(SESSION_KEY)).toBe(false);
  });

  it('posts the credential to /auth/login and holds the session it answers', async () => {
    // Arrange
    answer(200, JSON.stringify({ ...HELD, token: 'tok-new' }));

    const { login } = await freshAuth();

    // Act
    const session = await login(CREDENTIAL);

    // Assert
    expect(session).toStrictEqual({ ...HELD, token: 'tok-new' });
    expect(stored.get(SESSION_KEY)).toBe(JSON.stringify({ ...HELD, token: 'tok-new' }));

    const [url, init] = requestAt(0);

    expect(url).toBe(`${BASE}/auth/login`);
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.body).toBe(JSON.stringify(CREDENTIAL));
  });

  it('sends only user and password, never a member attached beside them', async () => {
    // Arrange
    answer(200, JSON.stringify(HELD));

    const { login } = await freshAuth();

    // Act
    await login({ ...CREDENTIAL, remember: true } as never);

    // Assert
    expect(requestAt(0)[1].body).toBe(JSON.stringify(CREDENTIAL));
  });

  it('strips a member the service added beside the three', async () => {
    // Arrange
    answer(200, JSON.stringify({ ...HELD, scope: 'all' }));

    const { login } = await freshAuth();

    // Act
    const session = await login(CREDENTIAL);

    // Assert
    expect(Object.keys(session).sort()).toStrictEqual(['expiresAt', 'sub', 'token']);
    expect(stored.get(SESSION_KEY)).toBe(JSON.stringify(HELD));
  });
});

describe('logout', () => {
  it('clears the session and then reports a 500', async () => {
    // Arrange
    holdSession();
    answer(500, '{"code":"INTERNAL_ERROR","message":"boom"}');

    const { logout } = await freshAuth();

    // Act
    const refusal = await logout().catch((caught: unknown) => caught);

    // Assert
    expect(refusal).toMatchObject({ code: 'INTERNAL_ERROR', status: 500 });
    expect(stored.has(SESSION_KEY)).toBe(false);
    expect(requestAt(0)[0]).toBe(`${BASE}/auth/logout`);
  });

  it('clears the session and then reports a transport failure', async () => {
    // Arrange
    holdSession();
    fetchStub.mockRejectedValueOnce(new Error('offline'));

    const { logout } = await freshAuth();

    // Act
    const refusal = await logout().catch((caught: unknown) => caught);

    // Assert
    expect(refusal).toMatchObject({ code: 'NETWORK', status: 0 });
    expect(stored.has(SESSION_KEY)).toBe(false);
    expect(fetchStub).toHaveBeenCalledTimes(1);
  });

  it('posts the held token to /auth/logout and clears the session on a 200', async () => {
    // Arrange
    holdSession();
    answer(200, '{"ok":true}');

    const { logout } = await freshAuth();

    // Act
    await expect(logout()).resolves.toBeUndefined();

    // Assert
    const [url, init] = requestAt(0);

    expect(url).toBe(`${BASE}/auth/logout`);
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ token: HELD.token }));
    expect(init.headers.Authorization).toBe(`Bearer ${HELD.token}`);
    expect(stored.has(SESSION_KEY)).toBe(false);
  });

  it('makes no request when no session is held', async () => {
    // Arrange
    const { logout } = await freshAuth();

    // Act
    await expect(logout()).resolves.toBeUndefined();

    // Assert
    expect(fetchStub).not.toHaveBeenCalled();
    expect(stored.has(SESSION_KEY)).toBe(false);
  });

  it('notifies the store subscribers it shares with the rest of the app', async () => {
    // Arrange
    holdSession();
    answer(200, '{"ok":true}');

    const { authSessionStore, logout } = await freshAuth();
    const cleared = vi.fn();

    authSessionStore().subscribe(cleared);

    // Act
    await logout();

    // Assert
    expect(cleared).toHaveBeenCalledTimes(1);
    expect(authSessionStore().get()).toBeNull();
  });
});

describe('probeAuth', () => {
  it('rejects a 500 rather than guessing either reading', async () => {
    // Arrange
    answer(500, '{"code":"INTERNAL_ERROR","message":"boom"}');

    const { probeAuth } = await freshAuth();

    // Act
    const refusal = await probeAuth().catch((caught: unknown) => caught);

    // Assert
    expect(refusal).toMatchObject({ code: 'INTERNAL_ERROR', status: 500 });
    expect(requestAt(0)[0]).toBe(`${BASE}/me`);
  });

  it('rejects a transport failure rather than reading it as open', async () => {
    // Arrange
    fetchStub.mockRejectedValueOnce(new Error('offline'));

    const { probeAuth } = await freshAuth();

    // Act
    const refusal = await probeAuth().catch((caught: unknown) => caught);

    // Assert
    expect(refusal).toMatchObject({ code: 'NETWORK', status: 0 });
    expect(fetchStub).toHaveBeenCalledTimes(1);
  });

  it('rejects a 200 whose body is not JSON, which no service wrote', async () => {
    // Arrange
    answer(200, '<html>proxy</html>');

    const { probeAuth } = await freshAuth();

    // Act
    const refusal = await probeAuth().catch((caught: unknown) => caught);

    // Assert
    expect(refusal).toMatchObject({ code: 'BAD_ENVELOPE' });
    expect(fetchStub).toHaveBeenCalledTimes(1);
  });

  it('answers required on a 401, dropping the refused session on the way', async () => {
    // Arrange
    holdSession();
    answer(401, '{"error":"Unauthorized"}');

    const { probeAuth } = await freshAuth();

    // Act
    const requirement = await probeAuth();

    // Assert
    expect(requirement).toBe('required');
    expect(stored.has(SESSION_KEY)).toBe(false);
    expect(requestAt(0)[1].headers.Authorization).toBe(`Bearer ${HELD.token}`);
  });

  it('answers open on a 200, over GET /me', async () => {
    // Arrange
    answer(200, '{"ok":true,"sub":null}');

    const { probeAuth } = await freshAuth();

    // Act
    const requirement = await probeAuth();

    // Assert
    expect(requirement).toBe('open');

    const [url, init] = requestAt(0);

    expect(url).toBe(`${BASE}/me`);
    expect(init.method).toBe('GET');
    expect(init.headers.Authorization).toBeUndefined();
  });
});

describe('the three calls over one store', () => {
  it('sends the bearer a login stored on the next probe, and none after a logout', async () => {
    // Arrange
    answer(200, JSON.stringify(HELD));
    answer(200, '{"ok":true,"sub":"basic:alice"}');
    answer(200, '{"ok":true}');
    answer(200, '{"ok":true,"sub":null}');

    const { login, logout, probeAuth } = await freshAuth();

    // Act
    await login(CREDENTIAL);
    await probeAuth();
    await logout();
    await probeAuth();

    // Assert
    expect(requestAt(1)[1].headers.Authorization).toBe(`Bearer ${HELD.token}`);
    expect(requestAt(2)[1].headers.Authorization).toBe(`Bearer ${HELD.token}`);
    expect(requestAt(3)[1].headers.Authorization).toBeUndefined();
  });
});

describe('the bare-body lift (control)', () => {
  it('is load-bearing: a plain client reads the same login body as BAD_ENVELOPE', async () => {
    // Arrange
    answer(200, JSON.stringify(HELD));

    const { createApiClient } = await import('./client');
    const client = createApiClient({
      baseUrl: BASE,
      fetch: fetchStub,
      session: { get: () => null, clear: () => undefined },
      onUnauthorized: () => undefined,
    });

    // Act
    const refusal = await client
      .post('/auth/login', CREDENTIAL)
      .catch((caught: unknown) => caught);

    // Assert
    expect(refusal).toMatchObject({ code: 'BAD_ENVELOPE' });
    expect(fetchStub).toHaveBeenCalledTimes(1);
  });
});
