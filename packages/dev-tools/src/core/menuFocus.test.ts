import type { Corner } from './types';

import { describe, expect, it } from 'vitest';

import {
  DEVTOOLS_MENU_GAP,
  DEVTOOLS_MENU_VIEWPORT_PADDING,
  menuPlacementForCorner,
  nextMenuIndex,
  submenuPlacementForCorner,
} from './menuFocus';

/**
 * The four corners, annotated so a corner REMOVED from the union reds
 * this line rather than quietly shrinking what the table cases below
 * sweep.
 */
const CORNERS: readonly Corner[] = [
  'top-left',
  'top-right',
  'bottom-right',
  'bottom-left',
];

/** The four keys {@link nextMenuIndex} answers a move for. */
const MOVE_KEYS: readonly string[] = ['ArrowDown', 'ArrowUp', 'Home', 'End'];

describe('nextMenuIndex', () => {
  // Refusals first: every shape that must answer null, before any
  // shape that answers an index.

  it('answers null for a key that moves nothing', () => {
    // Arrange
    const keys = ['Escape', 'Tab', 'ArrowLeft', 'ArrowRight', 'a', 'Enter'];

    // Act
    const answers = keys.map((key) => nextMenuIndex(key, 0, 4));

    // Assert
    expect(answers).toStrictEqual([null, null, null, null, null, null]);
  });

  it('answers null for every move key when the panel holds no rows', () => {
    // Arrange / Act
    const answers = MOVE_KEYS.map((key) => nextMenuIndex(key, 0, 0));

    // Assert
    expect(answers).toStrictEqual([null, null, null, null]);
  });

  it('answers null rather than a negative index for a negative count', () => {
    // Arrange / Act
    const answers = MOVE_KEYS.map((key) => nextMenuIndex(key, 0, -3));

    // Assert
    expect(answers).toStrictEqual([null, null, null, null]);
  });

  // Accepting cases.

  it('moves forward one row, and wraps off the last row to the first', () => {
    // Arrange / Act
    const walked = [
      nextMenuIndex('ArrowDown', 0, 4),
      nextMenuIndex('ArrowDown', 1, 4),
      nextMenuIndex('ArrowDown', 2, 4),
      nextMenuIndex('ArrowDown', 3, 4),
    ];

    // Assert
    expect(walked).toStrictEqual([1, 2, 3, 0]);
  });

  it('moves backward one row, and wraps off the first row to the last', () => {
    // Arrange / Act
    const walked = [
      nextMenuIndex('ArrowUp', 3, 4),
      nextMenuIndex('ArrowUp', 2, 4),
      nextMenuIndex('ArrowUp', 1, 4),
      nextMenuIndex('ArrowUp', 0, 4),
    ];

    // Assert
    expect(walked).toStrictEqual([2, 1, 0, 3]);
  });

  it('starts a forward move from the top when nothing is focused', () => {
    // Arrange / Act
    const answer = nextMenuIndex('ArrowDown', -1, 4);

    // Assert
    expect(answer).toBe(0);
  });

  it('starts a backward move from the bottom when nothing is focused', () => {
    // Arrange / Act
    const answer = nextMenuIndex('ArrowUp', -1, 4);

    // Assert
    expect(answer).toBe(3);
  });

  it('clamps an index past the end rather than answering past it', () => {
    // Arrange: the shape a shrinking row list leaves for one commit.
    // Act
    const forward = nextMenuIndex('ArrowDown', 9, 4);
    const backward = nextMenuIndex('ArrowUp', 9, 4);

    // Assert
    expect([forward, backward]).toStrictEqual([0, 3]);
  });

  it('answers the first and the last row for Home and End', () => {
    // Arrange / Act
    const home = nextMenuIndex('Home', 2, 4);
    const end = nextMenuIndex('End', 2, 4);

    // Assert
    expect([home, end]).toStrictEqual([0, 3]);
  });

  it('answers the one row for Home and End in a panel of one', () => {
    // Arrange / Act
    const answers = MOVE_KEYS.map((key) => nextMenuIndex(key, 0, 1));

    // Assert: forward and backward both wrap onto the only row.
    expect(answers).toStrictEqual([0, 0, 0, 0]);
  });
});

describe('menuPlacementForCorner', () => {
  it('opens downward from a top corner and upward from a bottom one', () => {
    // Arrange / Act
    const placements = CORNERS.map((corner) => menuPlacementForCorner(corner));

    // Assert
    expect(placements).toStrictEqual([
      'bottom-start',
      'bottom-end',
      'top-end',
      'top-start',
    ]);
  });

  it('aligns to the same side as the corner the trigger sits in', () => {
    // Arrange / Act: the horizontal axis, read off the two top corners
    // so the vertical one is held constant.
    const left = menuPlacementForCorner('top-left');
    const right = menuPlacementForCorner('top-right');

    // Assert
    expect(left.endsWith('-start')).toBe(true);
    expect(right.endsWith('-end')).toBe(true);
  });
});

describe('submenuPlacementForCorner', () => {
  it('opens away from the edge the trigger sits on', () => {
    // Arrange / Act
    const placements = CORNERS.map(
      (corner) => submenuPlacementForCorner(corner),
    );

    // Assert
    expect(placements).toStrictEqual([
      'right-start',
      'left-start',
      'left-start',
      'right-start',
    ]);
  });

  it('never opens a submenu on the same side as the root menu', () => {
    // Arrange / Act / Assert: the root menu's alignment and the
    // submenu's side are the two halves of "stays inside the
    // viewport", and they must disagree for every corner.
    for (const corner of CORNERS) {
      const onTheRight = corner.endsWith('right');

      expect(submenuPlacementForCorner(corner)).toBe(
        onTheRight
          ? 'left-start'
          : 'right-start',
      );
    }
  });
});

describe('the two lengths floating-ui needs in JS', () => {
  it('states a gap and a viewport padding as positive pixel counts', () => {
    // Arrange / Act / Assert: both are handed to middleware that
    // silently does nothing useful at zero.
    expect(DEVTOOLS_MENU_GAP).toBeGreaterThan(0);
    expect(DEVTOOLS_MENU_VIEWPORT_PADDING).toBeGreaterThan(0);
  });
});
