import type { Session, SessionStoragePort } from './session';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createBrowserSession,
  createSessionStore,
  parseStoredSession,
  SESSION_STORAGE_KEY,
} from './session';

// Negative cases run first: storage is a boundary, so what matters most is
// that an expired, unparseable or incomplete stored value is dropped rather
// than handed onward as a session. Every "dropped" assertion is paired with
// the storage entry being REMOVED, and each negative fixture differs from
// the accepted one by the single fault it names — the accepting case at the
// end is the control that proves the same store would have answered one.

const NOW = Date.parse('2026-09-16T12:00:00.000Z');

const LIVE: Session = {
  token: 'tok-live',
  sub: 'operator-1',
  expiresAt: '2026-09-16T13:00:00.000Z',
};

/** A copy of `session` with one member left out. */
function without(session: Session, member: keyof Session) {
  return Object.fromEntries(
    Object.entries(session).filter(([key]) => key !== member),
  );
}

/** A map-backed `Storage` stand-in that records what it was asked. */
function memoryStorage(initial: Record<string, string> = {}) {
  const entries = new Map(Object.entries(initial));
  const port: SessionStoragePort = {
    getItem: vi.fn((key: string) => entries.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      entries.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      entries.delete(key);
    }),
  };

  return { port, entries };
}

function storeOver(initial: Record<string, string>) {
  const { port, entries } = memoryStorage(initial);
  const store = createSessionStore({ storage: port, now: () => NOW });

  return { store, port, entries };
}

describe('createSessionStore — refusals', () => {
  it('drops an expired stored session on read', () => {
    // Arrange
    const expired = { ...LIVE, expiresAt: '2026-09-16T11:59:59.999Z' };
    const { store, entries } = storeOver({
      [SESSION_STORAGE_KEY]: JSON.stringify(expired),
    });

    // Act
    const session = store.get();

    // Assert
    expect(session).toBeNull();
    expect(entries.has(SESSION_STORAGE_KEY)).toBe(false);
  });

  it('treats a session expiring exactly now as expired', () => {
    // Arrange
    const boundary = { ...LIVE, expiresAt: '2026-09-16T12:00:00.000Z' };
    const { store } = storeOver({
      [SESSION_STORAGE_KEY]: JSON.stringify(boundary),
    });

    // Act
    const session = store.get();

    // Assert
    expect(session).toBeNull();
  });

  it('drops unparseable stored JSON on read', () => {
    // Arrange
    const { store, entries } = storeOver({
      [SESSION_STORAGE_KEY]: '{"token":"tok-live",',
    });

    // Act
    const session = store.get();

    // Assert
    expect(session).toBeNull();
    expect(entries.has(SESSION_STORAGE_KEY)).toBe(false);
  });

  it.each(['token', 'sub', 'expiresAt'] as const)(
    'drops a stored session missing its %s member',
    (member) => {
      // Arrange
      const incomplete = without(LIVE, member);
      const { store, entries } = storeOver({
        [SESSION_STORAGE_KEY]: JSON.stringify(incomplete),
      });

      // Act
      const session = store.get();

      // Assert
      expect(session).toBeNull();
      expect(entries.has(SESSION_STORAGE_KEY)).toBe(false);
    },
  );

  it.each([
    ['a non-object', '"tok-live"'],
    ['null', 'null'],
    ['an empty token', JSON.stringify({ ...LIVE, token: '' })],
    ['a numeric sub', JSON.stringify({ ...LIVE, sub: 1 })],
    ['an unparseable expiresAt', JSON.stringify({ ...LIVE, expiresAt: 'soon' })],
  ])('drops a stored value that is %s', (_label, raw) => {
    // Arrange
    const { store, entries } = storeOver({ [SESSION_STORAGE_KEY]: raw });

    // Act
    const session = store.get();

    // Assert
    expect(session).toBeNull();
    expect(entries.has(SESSION_STORAGE_KEY)).toBe(false);
  });

  it('drops a held session once the clock passes its expiry', () => {
    // Arrange
    const { port, entries } = memoryStorage();
    let now = NOW;
    const store = createSessionStore({ storage: port, now: () => now });
    store.set(LIVE);

    // Act
    now = Date.parse(LIVE.expiresAt);
    const session = store.get();

    // Assert
    expect(session).toBeNull();
    expect(entries.has(SESSION_STORAGE_KEY)).toBe(false);
  });

  it('does not notify clear listeners when a read drops a session', () => {
    // Arrange
    const { store } = storeOver({ [SESSION_STORAGE_KEY]: 'not json' });
    const listener = vi.fn();
    store.subscribe(listener);

    // Act
    store.get();

    // Assert
    expect(listener).not.toHaveBeenCalled();
  });

  it('refuses to set a session missing a member', () => {
    // Arrange
    const { store, port } = storeOver({});
    const incomplete = without(LIVE, 'sub');

    // Act
    const act = () => store.set(incomplete as Session);

    // Assert
    expect(act).toThrow(TypeError);
    expect(port.setItem).not.toHaveBeenCalled();
    expect(store.get()).toBeNull();
  });

  it('reads nothing when storage is empty and removes nothing', () => {
    // Arrange
    const { store, port } = storeOver({});

    // Act
    const session = store.get();

    // Assert
    expect(session).toBeNull();
    expect(port.removeItem).not.toHaveBeenCalled();
  });
});

describe('createSessionStore — accepting cases', () => {
  it('recovers a live stored session, as a reloaded tab does', () => {
    // Arrange
    const { store } = storeOver({
      [SESSION_STORAGE_KEY]: JSON.stringify(LIVE),
    });

    // Act
    const session = store.get();

    // Assert
    expect(session).toEqual(LIVE);
  });

  it('keeps only the three members of a stored session', () => {
    // Arrange
    const { store } = storeOver({
      [SESSION_STORAGE_KEY]: JSON.stringify({ ...LIVE, role: 'admin' }),
    });

    // Act
    const session = store.get();

    // Assert
    expect(session).toEqual(LIVE);
  });

  it('holds a set session in memory and mirrors it under the one key', () => {
    // Arrange
    const { store, port, entries } = storeOver({});

    // Act
    store.set(LIVE);

    // Assert
    expect(store.get()).toEqual(LIVE);
    expect(port.setItem).toHaveBeenCalledTimes(1);
    expect(port.setItem).toHaveBeenCalledWith(
      SESSION_STORAGE_KEY,
      JSON.stringify(LIVE),
    );
    expect([...entries.keys()]).toEqual([SESSION_STORAGE_KEY]);
  });

  it('answers a set session from memory without reading storage', () => {
    // Arrange
    const { store, port } = storeOver({});
    store.set(LIVE);

    // Act
    store.get();

    // Assert
    expect(port.getItem).not.toHaveBeenCalled();
  });

  it('clears memory and storage and notifies each listener once', () => {
    // Arrange
    const { store, entries } = storeOver({});
    const first = vi.fn();
    const second = vi.fn();
    store.subscribe(first);
    store.subscribe(second);
    store.set(LIVE);

    // Act
    store.clear();

    // Assert
    expect(store.get()).toBeNull();
    expect(entries.has(SESSION_STORAGE_KEY)).toBe(false);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('stops notifying a listener once it unsubscribes', () => {
    // Arrange
    const { store } = storeOver({});
    const kept = vi.fn();
    const removed = vi.fn();
    store.subscribe(kept);
    const unsubscribe = store.subscribe(removed);

    // Act
    unsubscribe();
    store.clear();

    // Assert
    expect(kept).toHaveBeenCalledTimes(1);
    expect(removed).not.toHaveBeenCalled();
  });

  it('keeps the session in memory when storage throws', () => {
    // Arrange
    const refusing: SessionStoragePort = {
      getItem: () => {
        throw new Error('storage disabled');
      },
      setItem: () => {
        throw new Error('storage disabled');
      },
      removeItem: () => {
        throw new Error('storage disabled');
      },
    };
    const store = createSessionStore({ storage: refusing, now: () => NOW });

    // Act
    store.set(LIVE);

    // Assert
    expect(store.get()).toEqual(LIVE);
    expect(() => store.clear()).not.toThrow();
    expect(store.get()).toBeNull();
  });
});

describe('parseStoredSession', () => {
  it('answers null for nothing stored', () => {
    expect(parseStoredSession(null, NOW)).toBeNull();
  });

  it('answers the session for a live stored value', () => {
    expect(parseStoredSession(JSON.stringify(LIVE), NOW)).toEqual(LIVE);
  });
});

describe('createBrowserSession', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads no browser global when it is built', () => {
    // Arrange
    const reads = vi.fn();
    vi.stubGlobal('window', {
      get sessionStorage() {
        reads();

        return memoryStorage().port;
      },
    });

    // Act
    createBrowserSession(() => NOW);

    // Assert
    expect(reads).not.toHaveBeenCalled();
  });

  it('binds window.sessionStorage on first use', () => {
    // Arrange
    const { port, entries } = memoryStorage({
      [SESSION_STORAGE_KEY]: JSON.stringify(LIVE),
    });
    const reads = vi.fn();
    vi.stubGlobal('window', {
      get sessionStorage() {
        reads();

        return port;
      },
    });
    const store = createBrowserSession(() => NOW);

    // Act
    const session = store.get();
    store.clear();

    // Assert
    expect(reads).toHaveBeenCalled();
    expect(session).toEqual(LIVE);
    expect(port.getItem).toHaveBeenCalledWith(SESSION_STORAGE_KEY);
    expect(entries.has(SESSION_STORAGE_KEY)).toBe(false);
  });

  it('degrades to memory where no window exists', () => {
    // Arrange
    const store = createBrowserSession(() => NOW);

    // Act
    store.set(LIVE);

    // Assert
    expect(typeof window).toBe('undefined');
    expect(store.get()).toEqual(LIVE);
  });
});
