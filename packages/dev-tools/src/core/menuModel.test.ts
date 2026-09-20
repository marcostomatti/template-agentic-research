import type {
  MenuCornerNode,
  MenuItemNode,
  MenuNode,
  MenuNodeIcon,
  MenuSubmenuNode,
} from './menuModel';
import type {
  Corner,
  DevToolsFeature,
  DevToolsHost,
  DevToolsStatus,
  MenuItem,
} from './types';

import { describe, expect, it } from 'vitest';

import {
  DEVTOOLS_ABOUT_ID,
  DEVTOOLS_FEATURE_ID_PREFIX,
  DEVTOOLS_FEATURES_ID,
  DEVTOOLS_ITEM_ID_PREFIX,
  DEVTOOLS_POSITION_ID,
  DEVTOOLS_SAVE_SETTINGS_ID,
  buildMenuModel,
} from './menuModel';

/**
 * ## What this file pins, and what it cannot
 *
 * `menuModel.ts` is pure and React-free, so every case here is a
 * plain call and a read of the returned rows — no renderer, no
 * `document`, no storage. It runs under the jsdom project because
 * that is the project collecting `src/core/**\/*.test.ts`, not
 * because anything below needs a DOM.
 *
 * What it cannot pin is what the rows LOOK like: that Position opens
 * a real submenu, that the checked corner reads as checked to a
 * screen reader, that roving focus walks the order below. Those are
 * `Menu.tsx`'s, and the forced Playwright spec's.
 *
 * The host stub's `settings.corner` is deliberately set to a corner
 * no case passes as the input corner, so a model that read the host
 * instead of its input would mark the wrong row rather than pass by
 * coincidence.
 */

/** A corner the stub host claims, and no case ever asks for. */
const HOST_CORNER: Corner = 'top-left';

/**
 * Build a host that answers the contract and records nothing.
 *
 * The model reads no member of it — it only passes it to the two
 * feature callbacks — so every member here is the cheapest legal
 * value rather than a meaningful one.
 *
 * @returns A {@link DevToolsHost} safe to hand to the builder.
 */
function createHost(): DevToolsHost {
  return {
    version: { commit: 'abc1234', branch: 'main', round: 'q20b', api: null },
    endpoint: '/__devtools',
    context: () => ({}),
    settings: { size: 'md', corner: HOST_CORNER },
    bus: {
      subscribe: () => () => {},
      publish: () => {},
      last: () => undefined,
      recent: () => [],
    },
    fetch: () => Promise.reject(new Error('the menu model never fetches')),
  };
}

/** What {@link createFeature} needs. */
interface FeatureOptions {
  /** The feature's own id, as an app would spell it. */
  readonly id: string;

  /** The feature's own label. */
  readonly label: string;

  /** What its `items` answers. */
  readonly items: readonly MenuItem[];

  /** Its glyph, if it has one. */
  readonly icon?: MenuNodeIcon;

  /**
   * What its `isEnabled` answers.
   *
   * Omitted means the feature declares no `isEnabled` at all, which
   * the contract reads as always enabled.
   */
  readonly enabled?: boolean;
}

/**
 * Build a feature that answers fixed values.
 *
 * @param options - What the feature is and what it answers.
 * @returns The feature.
 */
function createFeature(options: FeatureOptions): DevToolsFeature {
  const { enabled } = options;

  return {
    id: options.id,
    label: options.label,
    icon: options.icon,
    items: () => options.items,
    ...(enabled === undefined
      ? {}
      : { isEnabled: () => enabled }),
  };
}

/**
 * Build an `action` item, the cheapest legal {@link MenuItem}.
 *
 * @param id - The item's own id.
 * @param label - What the row reads.
 * @returns The item.
 */
function createItem(id: string, label: string): MenuItem {
  return { id, label, mode: 'action', run: () => {} };
}

/**
 * Build a status payload.
 *
 * @param persistence - The one member the model reads.
 * @returns The payload.
 */
function createStatus(persistence: boolean): DevToolsStatus {
  return {
    commit: 'abc1234',
    branch: 'main',
    round: 'q20b',
    persistence,
    gateway: 'none',
  };
}

/**
 * Read a node by position, failing loudly when there is none.
 *
 * @param nodes - The rows to index into.
 * @param index - Which one.
 * @returns The row.
 */
function at(nodes: readonly MenuNode[], index: number): MenuNode {
  const node = nodes[index];

  if (node === undefined) {
    throw new Error(`expected a node at ${index}, read ${nodes.length} rows`);
  }

  return node;
}

/**
 * Narrow a row to a submenu, failing loudly when it is not one.
 *
 * @param node - The row.
 * @returns The same row, narrowed.
 */
function asSubmenu(node: MenuNode): MenuSubmenuNode {
  if (node.kind !== 'submenu') {
    throw new Error(`expected a submenu, read kind '${node.kind}'`);
  }

  return node;
}

/**
 * Narrow a row to a feature-backed item, failing loudly otherwise.
 *
 * @param node - The row.
 * @returns The same row, narrowed.
 */
function asItem(node: MenuNode): MenuItemNode {
  if (node.kind !== 'item') {
    throw new Error(`expected an item, read kind '${node.kind}'`);
  }

  return node;
}

/**
 * The labels of a list of rows, in order.
 *
 * @param nodes - The rows.
 * @returns What each reads.
 */
function labelsOf(nodes: readonly MenuNode[]): readonly string[] {
  return nodes.map((node) => node.label);
}

/**
 * The corners a Position submenu marked as active, in order.
 *
 * A type-predicate filter rather than a `kind` check inside the
 * `map`, because only the predicate narrows the element type — and
 * the assertions below read `corner`, which lives on that member
 * alone.
 *
 * @param nodes - A Position submenu's children.
 * @returns Every corner whose row reads as checked.
 */
function checkedCornersOf(nodes: readonly MenuNode[]): readonly Corner[] {
  return nodes
    .filter((node): node is MenuCornerNode => node.kind === 'corner')
    .filter((node) => node.checked)
    .map((node) => node.corner);
}

/**
 * The ids of a list of rows, in order.
 *
 * @param nodes - The rows.
 * @returns Each row's node id.
 */
function idsOf(nodes: readonly MenuNode[]): readonly string[] {
  return nodes.map((node) => node.id);
}

describe('what the menu model refuses to draw', () => {
  it('omits Save settings when the status reports persistence false', () => {
    // Arrange: a server that answered, and answered no.
    const host = createHost();

    // Act
    const nodes = buildMenuModel({
      features: [],
      host,
      corner: 'bottom-right',
      status: createStatus(false),
    });

    // Assert: About is there, so the absence below is the gate and
    // not an empty model.
    expect(idsOf(nodes)).toContain(DEVTOOLS_ABOUT_ID);
    expect(idsOf(nodes)).not.toContain(DEVTOOLS_SAVE_SETTINGS_ID);
  });

  it('omits Save settings when no status payload has arrived', () => {
    // Arrange: nothing fetched yet, or a fetch that failed.
    const host = createHost();

    // Act
    const nodes = buildMenuModel({
      features: [],
      host,
      corner: 'bottom-right',
      status: null,
    });

    // Assert
    expect(idsOf(nodes)).not.toContain(DEVTOOLS_SAVE_SETTINGS_ID);
  });

  it('omits a feature whose isEnabled answers false, and never asks it '
    + 'for items', () => {
    // Arrange: a feature that would contribute a row if it were asked.
    let asked = 0;
    const disabled: DevToolsFeature = {
      id: 'hidden',
      label: 'Hidden',
      isEnabled: () => false,
      items: () => {
        asked += 1;

        return [createItem('one', 'One')];
      },
    };

    // Act
    const nodes = buildMenuModel({
      features: [disabled],
      host: createHost(),
      corner: 'bottom-right',
      status: createStatus(false),
    });

    // Assert: Position and About and nothing else.
    expect(labelsOf(nodes)).toEqual(['Position', 'About']);
    expect(asked).toBe(0);
  });

  it('omits a feature answering zero items rather than drawing an empty '
    + 'submenu', () => {
    // Arrange: enabled, and with nothing to say.
    const empty = createFeature({ id: 'empty', label: 'Empty', items: [] });

    // Act
    const nodes = buildMenuModel({
      features: [empty],
      host: createHost(),
      corner: 'bottom-right',
      status: createStatus(false),
    });

    // Assert
    expect(labelsOf(nodes)).toEqual(['Position', 'About']);
  });

  it(
    'does not count a feature answering zero items toward the grouping',
    () => {
      // Arrange: three enabled features, one of which draws nothing —
      // two contributors, which is below the threshold.
      const features = [
        createFeature({
          id: 'one',
          label: 'One',
          items: [createItem('a', 'A')],
        }),
        createFeature({ id: 'empty', label: 'Empty', items: [] }),
        createFeature({
          id: 'two',
          label: 'Two',
          items: [createItem('b', 'B')],
        }),
      ];

      // Act
      const nodes = buildMenuModel({
        features,
        host: createHost(),
        corner: 'bottom-right',
        status: createStatus(false),
      });

      // Assert: inline, in configured order, with no Features wrapper.
      expect(labelsOf(nodes)).toEqual(['Position', 'About', 'A', 'B']);
      expect(idsOf(nodes)).not.toContain(DEVTOOLS_FEATURES_ID);
    },
  );

  it('does not count a disabled feature toward the grouping', () => {
    // Arrange: the same shape, refused by isEnabled rather than by an
    // empty items list — the other way a feature can fail to count.
    const features = [
      createFeature({
        id: 'one',
        label: 'One',
        items: [createItem('a', 'A')],
      }),
      createFeature({
        id: 'off',
        label: 'Off',
        items: [createItem('c', 'C')],
        enabled: false,
      }),
      createFeature({
        id: 'two',
        label: 'Two',
        items: [createItem('b', 'B')],
      }),
    ];

    // Act
    const nodes = buildMenuModel({
      features,
      host: createHost(),
      corner: 'bottom-right',
      status: createStatus(false),
    });

    // Assert
    expect(labelsOf(nodes)).toEqual(['Position', 'About', 'A', 'B']);
    expect(idsOf(nodes)).not.toContain(DEVTOOLS_FEATURES_ID);
  });
});

describe('what the menu model draws', () => {
  it('draws Position, then About, then the features', () => {
    // Arrange
    const feature = createFeature({
      id: 'one',
      label: 'One',
      items: [createItem('a', 'A')],
    });

    // Act
    const nodes = buildMenuModel({
      features: [feature],
      host: createHost(),
      corner: 'bottom-right',
      status: createStatus(false),
    });

    // Assert
    expect(labelsOf(nodes)).toEqual(['Position', 'About', 'A']);
    expect(at(nodes, 0).id).toBe(DEVTOOLS_POSITION_ID);
  });

  it('includes Save settings after About when persistence is true', () => {
    // Arrange: the answer this plan's own plugin never gives — the row
    // exists and its wire exists; the behaviour is deferred.
    const host = createHost();

    // Act
    const nodes = buildMenuModel({
      features: [],
      host,
      corner: 'bottom-right',
      status: createStatus(true),
    });

    // Assert
    expect(labelsOf(nodes)).toEqual(['Position', 'About', 'Save settings']);
    expect(at(nodes, 2).id).toBe(DEVTOOLS_SAVE_SETTINGS_ID);
  });

  it('draws the four corners clockwise with the active one checked', () => {
    // Act
    const nodes = buildMenuModel({
      features: [],
      host: createHost(),
      corner: 'bottom-right',
      status: null,
    });

    // Assert
    const position = asSubmenu(at(nodes, 0));

    expect(labelsOf(position.children)).toEqual([
      'Top left',
      'Top right',
      'Bottom right',
      'Bottom left',
    ]);

    expect(checkedCornersOf(position.children)).toEqual(['bottom-right']);
    expect(idsOf(position.children)).toEqual([
      `${DEVTOOLS_POSITION_ID}.top-left`,
      `${DEVTOOLS_POSITION_ID}.top-right`,
      `${DEVTOOLS_POSITION_ID}.bottom-right`,
      `${DEVTOOLS_POSITION_ID}.bottom-left`,
    ]);
  });

  it('marks the corner it was handed, not the corner the host claims', () => {
    // Arrange: the stub host claims HOST_CORNER; ask for another.
    const asked: Corner = 'bottom-left';

    expect(asked).not.toBe(HOST_CORNER);

    // Act
    const nodes = buildMenuModel({
      features: [],
      host: createHost(),
      corner: asked,
      status: null,
    });

    // Assert
    const position = asSubmenu(at(nodes, 0));

    expect(checkedCornersOf(position.children)).toEqual([asked]);
  });

  it('draws two contributing features inline', () => {
    // Arrange
    const features = [
      createFeature({
        id: 'one',
        label: 'One',
        items: [createItem('a', 'A')],
      }),
      createFeature({
        id: 'two',
        label: 'Two',
        items: [createItem('b', 'B')],
      }),
    ];

    // Act
    const nodes = buildMenuModel({
      features,
      host: createHost(),
      corner: 'bottom-right',
      status: createStatus(false),
    });

    // Assert
    expect(labelsOf(nodes)).toEqual(['Position', 'About', 'A', 'B']);
  });

  it('draws three contributing features under one Features submenu', () => {
    // Arrange: the same shape as the two-feature case plus one.
    const features = [
      createFeature({
        id: 'one',
        label: 'One',
        items: [createItem('a', 'A')],
      }),
      createFeature({
        id: 'two',
        label: 'Two',
        items: [createItem('b', 'B')],
      }),
      createFeature({
        id: 'three',
        label: 'Three',
        items: [createItem('c', 'C')],
      }),
    ];

    // Act
    const nodes = buildMenuModel({
      features,
      host: createHost(),
      corner: 'bottom-right',
      status: createStatus(false),
    });

    // Assert: one row where the two-feature shape had two, and the
    // three rows moved under it in configured order.
    expect(labelsOf(nodes)).toEqual(['Position', 'About', 'Features']);

    const group = asSubmenu(at(nodes, 2));

    expect(group.id).toBe(DEVTOOLS_FEATURES_ID);
    expect(labelsOf(group.children)).toEqual(['A', 'B', 'C']);
  });

  it('renders a single-item feature as that item, carrying its icon', () => {
    // Arrange: a feature whose label differs from its item's, so the
    // assertion can tell which one was drawn.
    const feature = createFeature({
      id: 'one',
      label: 'The feature',
      icon: 'ICON',
      items: [createItem('a', 'The item')],
    });

    // Act
    const nodes = buildMenuModel({
      features: [feature],
      host: createHost(),
      corner: 'bottom-right',
      status: createStatus(false),
    });

    // Assert
    const row = asItem(at(nodes, 2));

    expect(row.label).toBe('The item');
    expect(row.icon).toBe('ICON');
  });

  it('renders a multi-item feature as its own submenu, with the icon on '
    + 'the submenu alone', () => {
    // Arrange
    const feature = createFeature({
      id: 'one',
      label: 'The feature',
      icon: 'ICON',
      items: [createItem('a', 'First'), createItem('b', 'Second')],
    });

    // Act
    const nodes = buildMenuModel({
      features: [feature],
      host: createHost(),
      corner: 'bottom-right',
      status: createStatus(false),
    });

    // Assert
    const submenu = asSubmenu(at(nodes, 2));

    expect(submenu.label).toBe('The feature');
    expect(submenu.icon).toBe('ICON');
    expect(submenu.id).toBe(`${DEVTOOLS_FEATURE_ID_PREFIX}one`);
    expect(labelsOf(submenu.children)).toEqual(['First', 'Second']);
    expect(asItem(at(submenu.children, 0)).icon).toBeUndefined();
  });

  it(
    'namespaces the node id while handing the item through unchanged',
    () => {
      // Arrange: a feature whose id is exactly a fixed row's, which is
      // the collision the namespace exists to survive.
      const item = createItem('about', 'Collides');
      const feature = createFeature({
        id: 'devtools',
        label: 'Colliding',
        items: [item],
      });

      // Act
      const nodes = buildMenuModel({
        features: [feature],
        host: createHost(),
        corner: 'bottom-right',
        status: createStatus(false),
      });

      // Assert: the node id is namespaced and distinct from About's,
      // while the contract value is the very object the feature gave.
      const row = asItem(at(nodes, 2));

      expect(row.id).toBe(`${DEVTOOLS_ITEM_ID_PREFIX}devtools.about`);
      expect(row.id).not.toBe(DEVTOOLS_ABOUT_ID);
      expect(row.item).toBe(item);
    },
  );

  it('hands the host to isEnabled and to items', () => {
    // Arrange
    const host = createHost();
    const seen: DevToolsHost[] = [];
    const feature: DevToolsFeature = {
      id: 'one',
      label: 'One',
      isEnabled: (given) => {
        seen.push(given);

        return true;
      },
      items: (given) => {
        seen.push(given);

        return [createItem('a', 'A')];
      },
    };

    // Act
    buildMenuModel({
      features: [feature],
      host,
      corner: 'bottom-right',
      status: createStatus(false),
    });

    // Assert: both callbacks, each once, each with the same host.
    expect(seen).toEqual([host, host]);
  });
});
