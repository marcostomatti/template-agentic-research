import type { DevToolsSettings } from './settings';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  DEVTOOLS_DEFAULT_SETTINGS,
  DEVTOOLS_SETTINGS_KEY,
  readSettings,
  writeSettings,
} from './settings';

/**
 * ## Why every case installs its own `localStorage`
 *
 * The jsdom one is not reachable from here. Node 25 ships a built-in
 * Web Storage global, and vitest's jsdom environment leaves it in
 * place rather than replacing it with jsdom's — `document.defaultView`
 * IS the global object, and its `localStorage` is the node one, so
 * there is no second reference to reach a jsdom store through.
 * Started without `--localstorage-file`, that node object is a husk:
 * `Object.getOwnPropertyNames` answers `[]` on it AND on its
 * prototype, so `localStorage.getItem` is `undefined` and
 * `localStorage.clear()` reds with `localStorage.clear is not a
 * function` (measured, under both the jsdom and the node project of
 * this package's vitest config).
 *
 * So the substrate below is a Map. It is not a shim standing in for a
 * browser API the suite could otherwise use — it is the only store
 * this runner has. The one thing it costs is that jsdom's quota and
 * its serialisation of non-string values are not exercised here; what
 * this file pins is what `settings.ts` does with what a store hands
 * back, and the hostile stores are modelled explicitly by the
 * refusal cases rather than waited for.
 */

/** A `localStorage` that works, plus the keys it has been asked for. */
interface MemoryStorage {
  /** The Storage-shaped object to install as the global. */
  readonly storage: Storage;

  /** What is actually stored, for an assertion to read directly. */
  readonly entries: Map<string, string>;
}

/**
 * Build a working, Map-backed `localStorage`.
 *
 * @returns The storage object and the map behind it.
 */
function createMemoryStorage(): MemoryStorage {
  const entries = new Map<string, string>();

  const storage = {
    get length(): number {
      return entries.size;
    },
    clear(): void {
      entries.clear();
    },
    getItem(key: string): string | null {
      return entries.get(key) ?? null;
    },
    key(index: number): string | null {
      return [...entries.keys()][index] ?? null;
    },
    removeItem(key: string): void {
      entries.delete(key);
    },
    setItem(key: string, value: string): void {
      entries.set(key, value);
    },
  } satisfies Storage;

  return { storage, entries };
}

/**
 * The global as it was before this file touched it, captured as a
 * DESCRIPTOR rather than a value: several cases replace the property
 * with a throwing getter, so what `afterEach` has to put back is the
 * accessor and not whatever it once answered.
 */
const REAL_LOCAL_STORAGE = Object.getOwnPropertyDescriptor(
  window,
  'localStorage',
);

/**
 * Replace `localStorage` for the duration of one case.
 *
 * Defined on `window`, which under this runner IS the global object —
 * so the bare `localStorage` the module under test reaches resolves to
 * whatever is installed here.
 *
 * @param descriptor - What the property should do while the case runs.
 */
function stubLocalStorage(descriptor: PropertyDescriptor): void {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    ...descriptor,
  });
}

/** The working store the current case reads and writes. */
let memory = createMemoryStorage();

beforeEach(() => {
  memory = createMemoryStorage();
  stubLocalStorage({ value: memory.storage, writable: true });
});

afterEach(() => {
  if (REAL_LOCAL_STORAGE) {
    Object.defineProperty(window, 'localStorage', REAL_LOCAL_STORAGE);
  }
});

describe('what the settings refuse to do', () => {
  it('answers the defaults when the key is absent', () => {
    // Arrange: nothing stored. Asserted rather than assumed, so a
    // leaked value from an earlier case reds here and not downstream.
    expect(memory.entries.size).toBe(0);

    // Act + Assert
    expect(readSettings()).toEqual({ size: 'md', handles: [] });

    // The positive control: the same call answers something ELSE once
    // a value is there, so a `readSettings` hard-wired to the defaults
    // would fail here rather than pass the assertion above.
    writeSettings({ size: 'lg', handles: ['reports'] });
    expect(readSettings()).toEqual({ size: 'lg', handles: ['reports'] });
  });

  it('answers the defaults when the stored text is not JSON', () => {
    // Arrange: the shape a half-written or hand-edited value takes.
    memory.entries.set(DEVTOOLS_SETTINGS_KEY, '{size: md,');

    // Act + Assert: a refusal, and specifically not a throw — a parse
    // error escaping would take out the mount that called it.
    expect(() => readSettings()).not.toThrow();
    expect(readSettings()).toEqual(DEVTOOLS_DEFAULT_SETTINGS);
  });

  it('answers the defaults when the stored JSON is of the wrong shape', () => {
    // Arrange + Act + Assert: four values that parse cleanly and mean
    // nothing — both members wrong, a bare array, a string, and null.
    // Swept in one case because they share an answer; the message
    // names the value so a failure says which one moved.
    const wrongShapes = [
      '{"size":42,"handles":"nope"}',
      '["md"]',
      '"md"',
      'null',
    ];

    for (const stored of wrongShapes) {
      memory.entries.set(DEVTOOLS_SETTINGS_KEY, stored);

      expect(readSettings(), `stored: ${stored}`)
        .toEqual(DEVTOOLS_DEFAULT_SETTINGS);
    }
  });

  it('answers the default handles when the stored array holds a non-string', () => {
    // Arrange: an array that is an array but not a list of ids. It is
    // refused whole rather than filtered down to its strings.
    memory.entries.set(
      DEVTOOLS_SETTINGS_KEY,
      '{"size":"sm","handles":["reports",7]}',
    );

    // Act + Assert: the valid size survives; the list does not.
    expect(readSettings()).toEqual({ size: 'sm', handles: [] });
  });

  it('keeps a valid member when the other member is wrong', () => {
    // Arrange + Act + Assert: repair is member by member, so the day a
    // member is ADDED to the shape, an operator's stored size is not
    // thrown away by the first read of the new build.
    memory.entries.set(
      DEVTOOLS_SETTINGS_KEY,
      '{"size":"lg","handles":"nope"}',
    );
    expect(readSettings()).toEqual({ size: 'lg', handles: [] });

    memory.entries.set(
      DEVTOOLS_SETTINGS_KEY,
      '{"size":"enormous","handles":["reports"]}',
    );
    expect(readSettings()).toEqual({ size: 'md', handles: ['reports'] });
  });

  it('answers the defaults when reaching localStorage itself throws', () => {
    // Arrange: a browser with site data blocked, where reaching the
    // PROPERTY throws rather than the store merely being empty. A
    // `typeof` guard around a hoisted reference would not survive it.
    stubLocalStorage({
      get() {
        throw new Error('devtools-test: storage is blocked');
      },
    });

    // Act + Assert: both directions answer, and neither throws.
    expect(() => readSettings()).not.toThrow();
    expect(readSettings()).toEqual(DEVTOOLS_DEFAULT_SETTINGS);
    expect(writeSettings({ size: 'lg', handles: [] })).toBe(false);
  });

  it('answers the defaults when there is no localStorage at all', () => {
    // Arrange: SSR and prerender, where the global is simply absent.
    stubLocalStorage({ value: undefined, writable: true });

    // Act + Assert
    expect(readSettings()).toEqual(DEVTOOLS_DEFAULT_SETTINGS);
    expect(writeSettings({ size: 'sm', handles: ['reports'] })).toBe(false);
  });

  it('answers the defaults when getItem throws', () => {
    // Arrange: a store that is reachable but refuses to read — the
    // shape a hardened or disabled implementation takes.
    stubLocalStorage({
      value: {
        getItem(): string | null {
          throw new Error('devtools-test: getItem refused');
        },
      },
      writable: true,
    });

    // Act + Assert
    expect(() => readSettings()).not.toThrow();
    expect(readSettings()).toEqual(DEVTOOLS_DEFAULT_SETTINGS);
  });

  it('answers false and does not throw when setItem throws', () => {
    // Arrange: a full quota, which is the common one in a long dev
    // session against an app that stores fixtures.
    stubLocalStorage({
      value: {
        getItem(): string | null {
          return null;
        },
        setItem(): void {
          throw new Error('devtools-test: quota exceeded');
        },
      },
      writable: true,
    });

    // Act + Assert: a `false`, not a throw. A caller that does not
    // care may ignore the answer; one that does can report it.
    let answer: boolean | undefined;

    expect(() => { answer = writeSettings({ size: 'lg', handles: [] }); })
      .not.toThrow();
    expect(answer).toBe(false);
  });
});

describe('what the settings persist', () => {
  it('round-trips both members through storage', () => {
    // Arrange
    const value: DevToolsSettings = {
      size: 'sm',
      handles: ['reports', 'network'],
    };

    // Act
    const wrote = writeSettings(value);

    // Assert: the write reports landing, and the read answers what was
    // handed over rather than a default that happens to match.
    expect(wrote).toBe(true);
    expect(readSettings()).toEqual(value);
    expect(readSettings()).not.toEqual(DEVTOOLS_DEFAULT_SETTINGS);
  });

  it('writes under the single devtools.settings key and no other', () => {
    // Arrange: an unrelated app key, to prove the write is not a
    // wholesale clear of the operator's store.
    memory.entries.set('ar.session', 'untouched');

    // Act
    writeSettings({ size: 'lg', handles: [] });

    // Assert: the key is exactly the documented string, the package
    // added no second key, and the app's key is still there.
    expect(DEVTOOLS_SETTINGS_KEY).toBe('devtools.settings');
    expect([...memory.entries.keys()].sort())
      .toEqual(['ar.session', 'devtools.settings']);
    expect(memory.entries.get(DEVTOOLS_SETTINGS_KEY))
      .toBe('{"size":"lg","handles":[]}');
    expect(memory.entries.get('ar.session')).toBe('untouched');
  });

  it('collapses duplicate handle ids on write', () => {
    // Arrange + Act: a caller that re-added an id it already had. The
    // record must not grow without bound.
    writeSettings({ size: 'md', handles: ['reports', 'reports', 'network'] });

    // Assert: on the stored text, so the dedupe is proved to happen at
    // the write rather than being hidden by the read's own dedupe.
    expect(memory.entries.get(DEVTOOLS_SETTINGS_KEY))
      .toBe('{"size":"md","handles":["reports","network"]}');
  });

  it('collapses duplicates and drops unknown members on read', () => {
    // Arrange: the record another build might have left — a duplicate
    // id, and a `corner` that this shape deliberately does not carry.
    memory.entries.set(
      DEVTOOLS_SETTINGS_KEY,
      '{"size":"sm","handles":["a","a","b"],"corner":"top-left"}',
    );

    // Act
    const read = readSettings();

    // Assert: the corner is not persisted, by requirement, so a stored
    // one is ignored rather than honoured.
    expect(read).toEqual({ size: 'sm', handles: ['a', 'b'] });
    expect(Object.keys(read).sort()).toEqual(['handles', 'size']);
  });

  it('replaces the stored record rather than merging into it', () => {
    // Arrange
    writeSettings({ size: 'lg', handles: ['reports'] });

    // Act
    writeSettings({ size: 'sm', handles: [] });

    // Assert: the earlier handles are gone, not merged forward.
    expect(readSettings()).toEqual({ size: 'sm', handles: [] });
  });
});
