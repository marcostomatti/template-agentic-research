import type { DevToolsConfig, DevToolsStatus } from './types';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDevToolsBus } from './bus';
import { buildDevToolsHost } from './host';
import {
  DEVTOOLS_DEFAULT_SETTINGS,
  DEVTOOLS_SETTINGS_KEY,
  readSettings,
  writeSettings,
} from './settings';

/**
 * @packageDocumentation
 * The cross-module case for decision 5: `devtools.settings` is the
 * ONLY storage key this package ever touches, in the ONLY storage
 * area it ever touches.
 *
 * `settings.test.ts` pins that `readSettings` and `writeSettings`
 * behave correctly against a spied key. It does not pin that nothing
 * ELSE in the package reaches for storage — a bus that started
 * memoising to `sessionStorage`, or a host builder that read a second
 * `localStorage` key for a cache, would pass every case in that file
 * unchanged. This file is the one that would catch it: it drives
 * `readSettings`, `writeSettings`, a fresh `DevToolsBus` and
 * `buildDevToolsHost` against ONE spying `localStorage` and ONE
 * spying `sessionStorage`, each recording every key it is asked for
 * by any method, and asserts the recorded set is exactly
 * `['devtools.settings']` for the first and empty for the second.
 *
 * The bus and the host builder are documented as touching no storage
 * at all — see `./bus.ts` and `./host.ts` — so this file is also
 * where that claim is proved rather than merely asserted in prose.
 *
 * ## Why the spy records every method, not just `getItem`/`setItem`
 *
 * A key touched only through `removeItem` or `key()` would be invisible
 * to a spy that watched the two read/write methods alone. Recording
 * every method that takes a key argument means a future caller cannot
 * introduce an untracked touch by picking an unwatched method.
 */

/** A spying `Storage`, plus the keys it has recorded. */
interface SpyStorage {
  /** The Storage-shaped object to install as the global. */
  readonly storage: Storage;

  /** Every key any method was called with, in call order, with dupes. */
  readonly touched: string[];
}

/**
 * Build a working, Map-backed `Storage` that records every key it is
 * asked for.
 *
 * @returns The storage object and the keys it has recorded so far.
 */
function createSpyStorage(): SpyStorage {
  const entries = new Map<string, string>();
  const touched: string[] = [];

  const storage = {
    get length(): number {
      return entries.size;
    },
    clear(): void {
      entries.clear();
    },
    getItem(key: string): string | null {
      touched.push(key);

      return entries.get(key) ?? null;
    },
    key(index: number): string | null {
      return [...entries.keys()][index] ?? null;
    },
    removeItem(key: string): void {
      touched.push(key);
      entries.delete(key);
    },
    setItem(key: string, value: string): void {
      touched.push(key);
      entries.set(key, value);
    },
  } satisfies Storage;

  return { storage, touched };
}

/** The real descriptors, restored once this file is done touching them. */
const REAL_LOCAL_STORAGE = Object.getOwnPropertyDescriptor(
  window,
  'localStorage',
);
const REAL_SESSION_STORAGE = Object.getOwnPropertyDescriptor(
  window,
  'sessionStorage',
);

/** The spying stores the current case reads and writes. */
let localSpy = createSpyStorage();
let sessionSpy = createSpyStorage();

beforeEach(() => {
  localSpy = createSpyStorage();
  sessionSpy = createSpyStorage();

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: localSpy.storage,
    writable: true,
  });
  Object.defineProperty(window, 'sessionStorage', {
    configurable: true,
    value: sessionSpy.storage,
    writable: true,
  });
});

afterEach(() => {
  if (REAL_LOCAL_STORAGE) {
    Object.defineProperty(window, 'localStorage', REAL_LOCAL_STORAGE);
  }

  if (REAL_SESSION_STORAGE) {
    Object.defineProperty(window, 'sessionStorage', REAL_SESSION_STORAGE);
  }
});

/** The status payload the host builder is exercised against. */
const STATUS: DevToolsStatus = {
  commit: 'crossmodulecommit',
  branch: 'crossmodule-branch',
  round: 'crossmodule-round',
  persistence: true,
  gateway: 'none',
};

/** A minimal, valid config for the host builder. */
const CONFIG: DevToolsConfig = { features: [] };

describe('the storage constraint, across the modules that could break it', () => {
  it('touches exactly one localStorage key and no sessionStorage key', () => {
    // Arrange: nothing stored yet, both spies fresh from beforeEach.

    // Act: every module this stage ships that could plausibly reach
    // for storage, exercised together.
    readSettings();
    writeSettings(DEVTOOLS_DEFAULT_SETTINGS);

    const bus = createDevToolsBus();

    bus.subscribe('error', () => {});
    bus.publish('error', { message: 'crossmodule' });
    bus.last('error');

    const host = buildDevToolsHost({ config: CONFIG, status: STATUS });

    void host.context();
    void host.version;

    // Assert: the recorded key SET — not the call count, which
    // `readSettings` and `writeSettings` each contribute one of — is
    // exactly the one key the package is allowed to touch, and the
    // session store was never reached at all.
    expect(new Set(localSpy.touched)).toStrictEqual(
      new Set([DEVTOOLS_SETTINGS_KEY]),
    );
    expect(new Set(sessionSpy.touched)).toStrictEqual(new Set());
  });
});
