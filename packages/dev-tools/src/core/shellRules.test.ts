import type { MenuNode } from './menuModel';
import type { DevToolsFeature, MenuItem } from './types';

import { describe, expect, it } from 'vitest';

import { buildDevToolsHost } from './host';
import { DEVTOOLS_ABOUT_ID, buildMenuModel } from './menuModel';
import {
  DEVTOOLS_ABOUT_COMMIT_LENGTH,
  DEVTOOLS_ABOUT_LABEL,
  DEVTOOLS_ABOUT_UNAVAILABLE,
  DEVTOOLS_SAVE_SETTINGS_DEFERRED,
  buildAboutDetails,
  collectDrawerItems,
  describeAboutSummary,
  findSurfaceItem,
} from './shellRules';

/**
 * A host built from the emptiest legal config.
 *
 * `buildDevToolsHost` is pure and reads no storage, so this costs
 * nothing per case and is a real host rather than a cast.
 */
const HOST = buildDevToolsHost({ config: { features: [] }, status: null });

/** A commit of the length git actually answers, to abbreviate. */
const LONG_COMMIT = '0123456789abcdef0123456789abcdef01234567';

/**
 * One popover item, which is what a case uses when the mode does not
 * matter to what it is measuring.
 *
 * @param id - The item's contract id.
 * @returns The item.
 */
function popoverItem(id: string): MenuItem {
  return { id, label: `Row ${id}`, mode: 'popover', render: () => null };
}

/**
 * One drawer item.
 *
 * @param id - The item's contract id.
 * @returns The item, declaring a placement and a handle so a case can
 * read that both survive the walk.
 */
function drawerItem(id: string): MenuItem {
  return {
    id,
    label: `Drawer ${id}`,
    mode: 'drawer',
    placement: 'top',
    handle: true,
    render: () => null,
  };
}

/**
 * One feature contributing the given rows.
 *
 * @param id - The feature's id.
 * @param items - What it contributes.
 * @returns The feature.
 */
function feature(id: string, items: readonly MenuItem[]): DevToolsFeature {
  return { id, label: `Feature ${id}`, items: () => items };
}

/**
 * The menu model the real builder answers for those features.
 *
 * Built rather than hand-written, so the nesting a case walks is the
 * nesting `./menuModel.ts` actually produces — including the Features
 * submenu it collapses three contributors under.
 *
 * @param features - The features, in menu order.
 * @returns The model.
 */
function modelOf(features: readonly DevToolsFeature[]): readonly MenuNode[] {
  return buildMenuModel({
    features,
    host: HOST,
    corner: 'bottom-right',
    status: null,
  });
}

describe('describeAboutSummary', () => {
  // Refusals first: every shape that must not reach the panel as it
  // was handed over, before any shape that is carried through.

  it('reads a blank commit and a blank branch as unknown', () => {
    // Arrange
    const version = { commit: '', branch: '   ', round: 'r', api: null };

    // Act
    const line = describeAboutSummary(version);

    // Assert
    expect(line).toBe('commit unknown on unknown');
  });

  // Accepting cases.

  it('abbreviates a full commit and names the branch', () => {
    // Arrange
    const version = {
      commit: LONG_COMMIT,
      branch: 'main',
      round: 'q20b',
      api: null,
    };

    // Act
    const line = describeAboutSummary(version);

    // Assert
    expect(line).toBe('commit 0123456 on main');
    expect(line).not.toContain(LONG_COMMIT);
  });

  it('leaves a commit shorter than the abbreviation whole', () => {
    // Arrange
    const version = { commit: 'abc', branch: 'main', round: 'r', api: null };

    // Act
    const line = describeAboutSummary(version);

    // Assert
    expect(line).toBe('commit abc on main');
    expect(DEVTOOLS_ABOUT_COMMIT_LENGTH).toBeGreaterThan(0);
  });
});

describe('buildAboutDetails', () => {
  // Refusals first.

  it('reads a null api as unavailable', () => {
    // Arrange
    const version = {
      commit: LONG_COMMIT,
      branch: 'main',
      round: 'q20b',
      api: null,
    };

    // Act
    const details = buildAboutDetails(version);

    // Assert
    expect(details.at(-1)).toStrictEqual({
      term: 'API',
      value: DEVTOOLS_ABOUT_UNAVAILABLE,
    });
  });

  it('reads a blank api as unavailable', () => {
    // Arrange
    const version = {
      commit: LONG_COMMIT,
      branch: 'main',
      round: 'q20b',
      api: '   ',
    };

    // Act
    const details = buildAboutDetails(version);

    // Assert
    expect(details.at(-1)?.value).toBe(DEVTOOLS_ABOUT_UNAVAILABLE);
  });

  it('reads a blank commit, branch and round as unknown', () => {
    // Arrange
    const version = { commit: '', branch: '', round: '', api: '1.2.3' };

    // Act
    const values = buildAboutDetails(version).map((row) => row.value);

    // Assert
    expect(values).toStrictEqual(['unknown', 'unknown', 'unknown', '1.2.3']);
  });

  // Accepting cases.

  it('names commit, branch, round and API in that order', () => {
    // Arrange
    const version = {
      commit: LONG_COMMIT,
      branch: 'main',
      round: 'q20b',
      api: '1.2.3',
    };

    // Act
    const terms = buildAboutDetails(version).map((row) => row.term);

    // Assert
    expect(terms).toStrictEqual(['Commit', 'Branch', 'Round', 'API']);
  });

  it('carries the WHOLE commit, unlike the version line', () => {
    // Arrange
    const version = {
      commit: LONG_COMMIT,
      branch: 'main',
      round: 'q20b',
      api: ' 1.2.3 ',
    };

    // Act
    const details = buildAboutDetails(version);

    // Assert
    expect(details[0]?.value).toBe(LONG_COMMIT);
    expect(details.at(-1)?.value).toBe('1.2.3');
  });
});

describe('findSurfaceItem', () => {
  // Refusals first.

  it('answers null for a model holding no item at all', () => {
    // Arrange
    const nodes = modelOf([]);

    // Act
    const found = findSurfaceItem(nodes, 'anything');

    // Assert
    expect(found).toBeNull();
  });

  it('answers null for an id nothing in the model carries', () => {
    // Arrange
    const nodes = modelOf([feature('f', [popoverItem('one')])]);

    // Act
    const found = findSurfaceItem(nodes, 'two');

    // Assert
    expect(found).toBeNull();
  });

  it('answers null for an action row, which draws no surface', () => {
    // Arrange
    const nodes = modelOf([
      feature('f', [{ id: 'act', label: 'Act', mode: 'action', run: () => {} }]),
    ]);

    // Act
    const found = findSurfaceItem(nodes, 'act');

    // Assert
    expect(found).toBeNull();
  });

  it('answers null for a fixed row, which is no item', () => {
    // Arrange
    const nodes = modelOf([feature('f', [popoverItem('one')])]);

    // Act
    const found = findSurfaceItem(nodes, DEVTOOLS_ABOUT_ID);

    // Assert
    expect(found).toBeNull();
  });

  // Accepting cases.

  it('finds an item a single-item feature contributed inline', () => {
    // Arrange
    const nodes = modelOf([feature('f', [popoverItem('one')])]);

    // Act
    const found = findSurfaceItem(nodes, 'one');

    // Assert
    expect(found?.id).toBe('one');
    expect(found?.mode).toBe('popover');
  });

  it('finds an item nested under a feature submenu', () => {
    // Arrange
    const nodes = modelOf([
      feature('f', [popoverItem('one'), drawerItem('two')]),
    ]);

    // Act
    const found = findSurfaceItem(nodes, 'two');

    // Assert
    expect(found?.mode).toBe('drawer');
  });

  it('answers the first of two features spelling one id', () => {
    // Arrange
    const nodes = modelOf([
      feature('first', [drawerItem('shared')]),
      feature('second', [popoverItem('shared')]),
    ]);

    // Act
    const found = findSurfaceItem(nodes, 'shared');

    // Assert
    expect(found?.mode).toBe('drawer');
  });
});

describe('collectDrawerItems', () => {
  // Refusals first.

  it('collects none from a model with no drawer', () => {
    // Arrange
    const nodes = modelOf([feature('f', [popoverItem('one')])]);

    // Act
    const drawers = collectDrawerItems(nodes);

    // Assert
    expect(drawers).toStrictEqual([]);
  });

  it('collects none from the shell rows alone', () => {
    // Arrange
    const nodes = modelOf([]);

    // Act
    const drawers = collectDrawerItems(nodes);

    // Assert
    expect(drawers).toStrictEqual([]);
  });

  // Accepting cases.

  it('collects drawers from under the Features submenu, in order', () => {
    // Arrange: three contributors, which is what collapses them.
    const nodes = modelOf([
      feature('a', [drawerItem('one')]),
      feature('b', [popoverItem('two')]),
      feature('c', [drawerItem('three')]),
    ]);

    // Act
    const ids = collectDrawerItems(nodes).map((item) => item.id);

    // Assert
    expect(ids).toStrictEqual(['one', 'three']);
  });

  it('keeps the first of two drawers sharing an id', () => {
    // Arrange
    const nodes = modelOf([
      feature('a', [drawerItem('same')]),
      feature('b', [drawerItem('same')]),
    ]);

    // Act
    const drawers = collectDrawerItems(nodes);

    // Assert
    expect(drawers).toHaveLength(1);
    expect(drawers[0]?.label).toBe('Drawer same');
  });

  it('carries the placement and the handle through the walk', () => {
    // Arrange
    const nodes = modelOf([feature('a', [drawerItem('one')])]);

    // Act
    const [drawer] = collectDrawerItems(nodes);

    // Assert
    expect(drawer?.placement).toBe('top');
    expect(drawer?.handle).toBe(true);
  });
});

describe('the strings the shell draws itself', () => {
  it('names the About popover exactly as the About row reads', () => {
    // Arrange
    const [, about] = modelOf([]);

    // Act
    const label = about?.kind === 'fixed'
      ? about.label
      : null;

    // Assert
    expect(about?.id).toBe(DEVTOOLS_ABOUT_ID);
    expect(label).toBe(DEVTOOLS_ABOUT_LABEL);
  });

  it('states the deferred Save settings outcome as a sentence', () => {
    // Arrange / Act
    const message = DEVTOOLS_SAVE_SETTINGS_DEFERRED;

    // Assert
    expect(message.trim()).toBe(message);
    expect(message).not.toBe('');
  });
});
