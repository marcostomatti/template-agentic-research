import type { DrawerPlacement } from '../types';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DEVTOOLS_SETTINGS_KEY } from '../settings';

import {
  DEVTOOLS_DEFAULT_DRAWER_PLACEMENT,
  describeDrawerDismiss,
  describeDrawerHandle,
  describeDrawerPlacement,
  drawerHandleGlyph,
  drawerPlacementGlyph,
  hasStoredDrawerHandle,
  nextDrawerPlacement,
  rememberDrawerHandle,
} from './drawerRules';

/**
 * The four glyphs, built from code points rather than pasted.
 *
 * A backslash-u escape in a source file is one tool-call decode away
 * from being the character itself on the way to disk, and a case
 * comparing two identical mystery characters proves nothing about
 * which character either of them is. Built from the number, the
 * assertion names the code point it is pinning.
 */
const GLYPHS = {
  start: String.fromCodePoint(0x2039),
  end: String.fromCodePoint(0x203A),
  top: String.fromCodePoint(0x2191),
  bottom: String.fromCodePoint(0x2193),
} as const satisfies Record<DrawerPlacement, string>;

/** Every placement, so a case can sweep the closed set. */
const PLACEMENTS: readonly DrawerPlacement[] = [
  'start',
  'end',
  'top',
  'bottom',
];

/**
 * A `localStorage` that works, plus the keys it has been asked for.
 *
 * The same Map-backed substrate `../settings.test.ts` installs, and
 * for the same measured reason: the `localStorage` this runner exposes
 * is node's built-in Web Storage husk rather than jsdom's, and its
 * `getItem` is `undefined`. That file's header carries the full
 * reading; this one adds a write counter, which the
 * already-stored case needs.
 */
interface MemoryStorage {
  /** The Storage-shaped object to install as the global. */
  readonly storage: Storage;

  /** What is actually stored, for an assertion to read directly. */
  readonly entries: Map<string, string>;

  /** How many times `setItem` has been called. */
  readonly writes: { count: number };
}

/**
 * Build a working, Map-backed `localStorage`.
 *
 * @returns The storage object, the map behind it and the write count.
 */
function createMemoryStorage(): MemoryStorage {
  const entries = new Map<string, string>();
  const writes = { count: 0 };

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
      writes.count += 1;
      entries.set(key, value);
    },
  } satisfies Storage;

  return { storage, entries, writes };
}

/**
 * The global as it was before this file touched it, captured as a
 * DESCRIPTOR rather than a value: one case replaces the property with
 * a throwing getter, so what `afterEach` has to put back is the
 * accessor and not whatever it once answered.
 */
const REAL_LOCAL_STORAGE = Object.getOwnPropertyDescriptor(
  window,
  'localStorage',
);

/**
 * Replace `localStorage` for the duration of one case.
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

describe('nextDrawerPlacement', () => {
  // Refusals first: what the switcher will NOT do, before what it
  // does. Leaving the axis is the whole of the refusal.

  it('never leaves the axis it was given', () => {
    // Arrange
    const inline: readonly DrawerPlacement[] = ['start', 'end'];
    const block: readonly DrawerPlacement[] = ['top', 'bottom'];

    // Act
    const fromInline = inline.map((one) => nextDrawerPlacement(one));
    const fromBlock = block.map((one) => nextDrawerPlacement(one));

    // Assert
    expect(fromInline.every((one) => inline.includes(one))).toBe(true);
    expect(fromBlock.every((one) => block.includes(one))).toBe(true);
  });

  // Accepting cases.

  it('swaps a side placement for the other side', () => {
    // Arrange + Act + Assert
    expect(nextDrawerPlacement('start')).toBe('end');
    expect(nextDrawerPlacement('end')).toBe('start');
  });

  it('swaps a block placement for the other block edge', () => {
    // Arrange + Act + Assert
    expect(nextDrawerPlacement('top')).toBe('bottom');
    expect(nextDrawerPlacement('bottom')).toBe('top');
  });

  it('is its own inverse, from every placement', () => {
    // Arrange + Act
    const roundTrip = PLACEMENTS.map(
      (one) => nextDrawerPlacement(nextDrawerPlacement(one)),
    );

    // Assert: the property that makes this a pair swap rather than
    // four rows somebody remembered.
    expect(roundTrip).toStrictEqual(PLACEMENTS);
  });

  it('defaults a drawer that declared no placement to an edge', () => {
    // Arrange + Act + Assert: the constant is a placement, so the
    // switcher can be handed it without a narrowing.
    expect(PLACEMENTS).toContain(DEVTOOLS_DEFAULT_DRAWER_PLACEMENT);
  });
});

describe('drawerPlacementGlyph', () => {
  it('answers a bidi-mirrored glyph for the two logical edges', () => {
    // Arrange: `start` and `end` are writing-direction relative, so
    // the glyph has to be one the bidi algorithm flips under RTL.
    const mirrored = /\p{Bidi_Mirrored}/u;

    // Act
    const answers = [
      drawerPlacementGlyph('start'),
      drawerPlacementGlyph('end'),
    ];

    // Assert
    expect(answers).toStrictEqual([GLYPHS.start, GLYPHS.end]);
    expect(answers.every((glyph) => mirrored.test(glyph))).toBe(true);
  });

  it('answers an unmirrored vertical arrow for the two physical edges', () => {
    // Arrange: the control for the case above — `top` and `bottom` are
    // physical, so their glyphs must NOT be mirrored, which makes the
    // property one the pair of cases could have failed either way.
    const mirrored = /\p{Bidi_Mirrored}/u;

    // Act
    const answers = [
      drawerPlacementGlyph('top'),
      drawerPlacementGlyph('bottom'),
    ];

    // Assert
    expect(answers).toStrictEqual([GLYPHS.top, GLYPHS.bottom]);
    expect(answers.some((glyph) => mirrored.test(glyph))).toBe(false);
  });
});

describe('drawerHandleGlyph', () => {
  it('points the collapsed tab into the page, from every placement', () => {
    // Arrange + Act
    const answers = PLACEMENTS.map((one) => drawerHandleGlyph(one, false));

    // Assert: away from the edge the panel is fixed to, which is the
    // direction it travels when it expands.
    expect(answers).toStrictEqual([
      GLYPHS.end,
      GLYPHS.start,
      GLYPHS.bottom,
      GLYPHS.top,
    ]);
  });

  it('points the expanded control back at its own edge', () => {
    // Arrange + Act
    const answers = PLACEMENTS.map((one) => drawerHandleGlyph(one, true));

    // Assert
    expect(answers).toStrictEqual([
      GLYPHS.start,
      GLYPHS.end,
      GLYPHS.top,
      GLYPHS.bottom,
    ]);
  });
});

describe('describeDrawerPlacement', () => {
  // Refusal first: a feature that gave no usable label.

  it('names the drawer even when the feature gave no label', () => {
    // Arrange + Act
    const answer = describeDrawerPlacement('   ', 'top');

    // Assert: never `Move  to the top edge`, which a screen reader
    // reads as a control with no subject.
    expect(answer).toBe('Move Drawer to the top edge');
  });

  // Accepting case.

  it('names the drawer and the edge it will move to', () => {
    // Arrange + Act + Assert
    expect(describeDrawerPlacement('Feedback', 'start'))
      .toBe('Move Feedback to the start edge');
  });
});

describe('describeDrawerDismiss', () => {
  // Refusal first.

  it('names the drawer even when the feature gave no label', () => {
    // Arrange + Act + Assert
    expect(describeDrawerDismiss('', true)).toBe('Collapse Drawer');
    expect(describeDrawerDismiss('', false)).toBe('Close Drawer');
  });

  // Accepting cases.

  it('says collapse when a tab will be left behind', () => {
    // Arrange + Act + Assert
    expect(describeDrawerDismiss('Feedback', true)).toBe('Collapse Feedback');
  });

  it('says close when no tab will be left behind', () => {
    // Arrange + Act + Assert
    expect(describeDrawerDismiss('Feedback', false)).toBe('Close Feedback');
  });
});

describe('describeDrawerHandle', () => {
  // Refusal first.

  it('names the drawer even when the feature gave no label', () => {
    // Arrange + Act + Assert
    expect(describeDrawerHandle('\n\t')).toBe('Expand Drawer');
  });

  // Accepting case.

  it('says expand, which is what the tab does', () => {
    // Arrange + Act + Assert
    expect(describeDrawerHandle('Feedback')).toBe('Expand Feedback');
  });
});

describe('hasStoredDrawerHandle', () => {
  // Refusals first: every reading that is not a stored id.

  it('refuses an id no load has stored', () => {
    // Arrange: a store holding another drawer's handle, so the answer
    // is about the id and not about the list being empty.
    memory.entries.set(
      DEVTOOLS_SETTINGS_KEY,
      '{"size":"md","handles":["reports"]}',
    );

    // Act + Assert
    expect(hasStoredDrawerHandle('feedback')).toBe(false);

    // The positive control: the same call answers `true` for the id
    // that IS there, so a reader hard-wired to `false` would fail.
    expect(hasStoredDrawerHandle('reports')).toBe(true);
  });

  it('refuses every id when storage cannot be reached', () => {
    // Arrange: the shape a browser with site data blocked has.
    stubLocalStorage({
      get(): Storage {
        throw new Error('blocked');
      },
    });

    // Act + Assert: a refusal, and specifically not a throw.
    expect(() => hasStoredDrawerHandle('reports')).not.toThrow();
    expect(hasStoredDrawerHandle('reports')).toBe(false);
  });

  // Accepting case.

  it('accepts an id an earlier load stored', () => {
    // Arrange
    memory.entries.set(
      DEVTOOLS_SETTINGS_KEY,
      '{"size":"lg","handles":["feedback","reports"]}',
    );

    // Act + Assert
    expect(hasStoredDrawerHandle('feedback')).toBe(true);
  });
});

describe('rememberDrawerHandle', () => {
  // Refusals first: what it does when it cannot do the thing.

  it('answers false when the write could not land', () => {
    // Arrange: a store that reads clean and refuses every write, which
    // is what a full quota looks like from here.
    stubLocalStorage({
      value: {
        ...memory.storage,
        getItem: (): string | null => null,
        setItem: (): void => {
          throw new Error('quota exceeded');
        },
      } as Storage,
      writable: true,
    });

    // Act + Assert: a refusal, and specifically not a throw.
    expect(() => rememberDrawerHandle('feedback')).not.toThrow();
    expect(rememberDrawerHandle('feedback')).toBe(false);
  });

  it('writes nothing when the id is already stored', () => {
    // Arrange
    memory.entries.set(
      DEVTOOLS_SETTINGS_KEY,
      '{"size":"md","handles":["feedback"]}',
    );
    expect(memory.writes.count).toBe(0);

    // Act
    const answer = rememberDrawerHandle('feedback');

    // Assert: it answers yes without touching the store.
    expect(answer).toBe(true);
    expect(memory.writes.count).toBe(0);

    // The positive control: an id that is NOT there does write, so the
    // zero above is a reading the counter could have failed.
    rememberDrawerHandle('reports');
    expect(memory.writes.count).toBe(1);
  });

  // Accepting cases.

  it('adds the id, keeping the stored size', () => {
    // Arrange: a size an operator picked, which the read-modify-write
    // must carry through rather than reset.
    memory.entries.set(DEVTOOLS_SETTINGS_KEY, '{"size":"sm","handles":[]}');

    // Act
    const answer = rememberDrawerHandle('feedback');

    // Assert
    expect(answer).toBe(true);
    expect(memory.entries.get(DEVTOOLS_SETTINGS_KEY))
      .toBe('{"size":"sm","handles":["feedback"]}');
  });

  it('keeps the ids other drawers stored', () => {
    // Arrange
    memory.entries.set(
      DEVTOOLS_SETTINGS_KEY,
      '{"size":"md","handles":["reports"]}',
    );

    // Act
    rememberDrawerHandle('feedback');

    // Assert: both ids, in the order they were added.
    expect(memory.entries.get(DEVTOOLS_SETTINGS_KEY))
      .toBe('{"size":"md","handles":["reports","feedback"]}');
  });
});
