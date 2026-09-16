import type { Session, SessionStoragePort } from '../../auth/session';

import { describe, expect, it, vi } from 'vitest';

import { createSessionStore } from '../../auth/session';
import { authGateDecision } from './gate';
import { safeReturnPath } from './returnPath';

// This suite chains the pure modules the way `AuthGate.tsx` does at
// runtime — a session store's clear notification feeding the gate's
// return-path arithmetic, and a stored session feeding the gate's render
// decision — without mounting the component that only wires them
// together. Each `.tsx` file is read by no test; this is where the
// wiring is proven instead.

/** A real deep, domain-scoped location a mid-session redirect fires on. */
const DEEP_PATH = '/d/example-tech-radar/sources/src-1/failures';

/** A fixed clock, so an expiry is pinned rather than dated live. */
const NOW = Date.parse('2026-05-01T12:00:00.000Z');

/** One minute in milliseconds, the offset past {@link NOW}. */
const ONE_MINUTE = 60_000;

/** A map-backed `Storage` stand-in, exactly what the session tests use. */
function memoryStorage(): SessionStoragePort {
  const entries = new Map<string, string>();

  return {
    getItem: vi.fn((key: string) => entries.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      entries.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      entries.delete(key);
    }),
  };
}

/** A well-formed session expiring after {@link NOW}. */
function liveSession(): Session {
  return {
    token: 'tok-flow',
    sub: 'operator@example.test',
    expiresAt: new Date(NOW + ONE_MINUTE).toISOString(),
  };
}

describe('login flow — session clear to gate redirect', () => {
  it(
    'sends a mid-session UNAUTHORIZED on a deep path to a login path ' +
      'that returns to that exact path',
    () => {
      // Arrange
      const store = createSessionStore({
        storage: memoryStorage(),
        now: () => NOW,
      });

      store.set(liveSession());

      let redirectTo: string | undefined;

      store.subscribe(() => {
        const decision = authGateDecision({
          probe: 'required',
          session: store.get(),
          pathname: DEEP_PATH,
          search: '',
          now: NOW,
        });

        if (decision.kind === 'redirect') {
          redirectTo = decision.to;
        }
      });

      // Act — the shape of a service answering UNAUTHORIZED mid-session.
      store.clear();

      // Assert
      expect(redirectTo).toBe(
        '/login?next=%2Fd%2Fexample-tech-radar%2Fsources%2Fsrc-1%2Ffailures',
      );

      const returnPath = new URL(
        redirectTo ?? '',
        'https://return-path.invalid',
      ).searchParams.get('next');

      expect(safeReturnPath(returnPath)).toBe(DEEP_PATH);
    },
  );

  it('replaces a hostile return path with the root instead of the deep path', () => {
    // Arrange / Act
    const accepted = safeReturnPath('//evil.example/steal');

    // Assert
    expect(accepted).toBe('/');
    expect(accepted).not.toBe(DEEP_PATH);
  });
});

describe('login flow — open probe never redirects', () => {
  it('renders with no session held, whatever the location', () => {
    // Arrange / Act
    const decision = authGateDecision({
      probe: 'open',
      session: null,
      pathname: DEEP_PATH,
      search: '',
      now: NOW,
    });

    // Assert
    expect(decision).toEqual({ kind: 'render' });
  });

  it('renders even holding a session that has already expired', () => {
    // Arrange
    const store = createSessionStore({
      storage: memoryStorage(),
      now: () => NOW,
    });

    store.set({ ...liveSession(), expiresAt: new Date(NOW - ONE_MINUTE).toISOString() });

    // Act
    const decision = authGateDecision({
      probe: 'open',
      session: store.get(),
      pathname: DEEP_PATH,
      search: '',
      now: NOW,
    });

    // Assert
    expect(decision).toEqual({ kind: 'render' });
  });
});

describe('login flow — a successful login turns the decision into render', () => {
  it('renders once the session a login stores is read back into the gate', () => {
    // Arrange
    const store = createSessionStore({
      storage: memoryStorage(),
      now: () => NOW,
    });

    const before = authGateDecision({
      probe: 'required',
      session: store.get(),
      pathname: DEEP_PATH,
      search: '',
      now: NOW,
    });

    expect(before.kind).toBe('redirect');

    // Act — the shape a successful `POST /auth/login` leaves behind.
    store.set(liveSession());

    const after = authGateDecision({
      probe: 'required',
      session: store.get(),
      pathname: DEEP_PATH,
      search: '',
      now: NOW,
    });

    // Assert
    expect(after).toEqual({ kind: 'render' });
  });
});
