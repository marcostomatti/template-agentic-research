/**
 * @packageDocumentation
 * The menu's rows, derived from the fixed items and the configured
 * features — and nothing else.
 *
 * `src/core/Menu.tsx` draws what {@link buildMenuModel} answers. The
 * split is this package's two-runner discipline: every decision about
 * WHAT the menu holds — the fixed order, the persistence gate, the
 * grouping threshold, which corner is marked — lives here in a `.ts`
 * the jsdom vitest project collects, and the component stays a
 * renderer of the answer. Anything statable as "given these features,
 * the menu holds these rows" belongs in this file rather than in the
 * component, where only the forced Playwright spec could reach it.
 *
 * The module is pure in the strong sense: it reads no storage, sends
 * no request, holds no state and mutates neither its input nor the
 * {@link MenuItem}s it passes through. The one impure thing it does
 * is CALL the two feature callbacks, {@link DevToolsFeature.isEnabled}
 * and {@link DevToolsFeature.items}, which is the whole of how a
 * feature reaches the menu.
 *
 * ## It imports no React, not even a type
 *
 * `./types.ts` takes `import type { ReactNode }` because the contract
 * it writes down mentions one. This module needs no such import: an
 * icon travels through it untouched, so the member is typed as
 * {@link MenuNodeIcon} — `DevToolsFeature['icon']` — and the React
 * dependency stays where the contract already declared it.
 *
 * ## The fixed order, and why the corners are not `MenuItem`s
 *
 * Position, About, then Save settings, then the features. Position is
 * first because it is the one row an operator reaches while the
 * widget is in the way of what they were reading; About is the
 * widget's own identity; Save settings is a preference.
 *
 * The four corner rows are {@link MenuCornerNode}s rather than
 * {@link MenuItem}s of `mode: 'action'`, and the difference is not
 * cosmetic. An action carries `run(host)`, and a corner row's effect
 * is to write the shell's corner slot — state this module cannot
 * reach and must not be handed, or it would stop being pure. So a
 * corner row DESCRIBES itself (`corner`, `checked`) and the shell
 * dispatches on `kind`. The same reasoning makes About and Save
 * settings {@link MenuFixedNode}s: both draw React the shell owns,
 * and a `render` member here would drag a React import into a pure
 * module for no gain.
 *
 * ## The persistence gate
 *
 * Save settings is drawn only when the status payload reports
 * `persistence: true`. A `null` status — nothing fetched yet, or a
 * fetch that failed — reads as `false`, so the row is absent while the
 * question is open rather than offered and then withdrawn.
 *
 * This plan's Vite plugin always answers `persistence: false`, by
 * spec item 8.2, so the row this module can produce is one nothing in
 * this plan produces. That is deliberate: the item and its wire exist,
 * the behaviour is deferred, and the gate is proved here rather than
 * waiting for a server that can answer `true`.
 *
 * ## The grouping threshold counts CONTRIBUTORS, not enabled features
 *
 * Fewer than {@link FEATURE_GROUPING_THRESHOLD} features inline; three
 * or more under one Features submenu. The spec sentence says "the
 * enabled features", and it does not say what an enabled feature
 * answering zero items counts as — so this module decides, and the
 * decision is recorded here rather than left to be read off the code.
 *
 * The count is of features that CONTRIBUTE a row: enabled AND
 * answering at least one item. The threshold exists to stop the top
 * level growing without bound, and a feature that draws nothing adds
 * nothing to grow. Counting it would bury two visible rows under a
 * Features submenu because a third, invisible feature existed — a
 * menu whose depth changes for a reason the operator cannot see. The
 * alternative reading — count every enabled feature, empty or not —
 * is one `filter` away in {@link buildFeatureNodes}, and the colocated
 * case `does not count a feature answering zero items toward the
 * grouping` is what would red if it were taken.
 *
 * ## One item renders that item; several render a submenu
 *
 * A feature answering one item contributes that item's row, under the
 * ITEM's label — the feature's own label is not drawn, because a
 * submenu of one is a click for nothing. A feature answering several
 * contributes its own submenu, under the FEATURE's label.
 *
 * The icon follows the label: it sits on the single row in the first
 * shape and on the submenu in the second, never repeated down a
 * submenu's children. A feature answering zero items contributes
 * nothing at all, not an empty submenu.
 *
 * ## Node ids are namespaced; the item's own id is untouched
 *
 * A feature's `id` comes from an app this package does not control,
 * and nothing stops one being `position`. Node ids are therefore
 * prefixed — {@link DEVTOOLS_FEATURE_ID_PREFIX} and
 * {@link DEVTOOLS_ITEM_ID_PREFIX} — so a feature cannot collide with
 * a fixed row's id and silently take its keying or its focus slot.
 *
 * That prefixing is for the NODE only. {@link MenuItemNode.item} is
 * the feature's own {@link MenuItem}, handed through unchanged, and
 * the shell keys its `openSurface` slot on `item.id` exactly as the
 * contract says. Two ids, two jobs: the node's identifies a row in
 * this menu, the item's identifies a surface.
 *
 * ## A throwing feature is NOT caught here
 *
 * `isEnabled` and `items` are called bare. A feature whose callback
 * throws takes the menu build with it, and that is the intended
 * behaviour rather than an omission: the operator of a dev tool IS
 * the author of the feature, and a stack at the throw site is worth
 * more to them than a menu that quietly lost a row. Swallowing it
 * here would make a broken feature indistinguishable from a feature
 * that answered `false`.
 *
 * Where the same question has a different answer, it is because the
 * caller is not the author: `./settings.ts` swallows every storage
 * failure because the browser, not the feature, is what failed, and
 * `./host.ts` catches the config's `extra()` because a report must
 * still be sendable when the app's context getter is broken.
 *
 * ## Mutation note — what the colocated cases actually catch
 *
 * A green suite is not evidence a case can fail. Each leg below was
 * measured by breaking this file, reds `bun x vitest run
 * src/core/menuModel.test.ts` from `packages/dev-tools` against the 16
 * cases the file holds, and restores this file byte-identical
 * (`diff` confirmed, every leg):
 *
 * - Reading the gate as `status?.persistence === false` rather than
 *   `!== true` answers `Tests  1 failed | 15 passed (16)`, the one
 *   being `omits Save settings when no status payload has arrived`.
 *   The `persistence: false` case does NOT red on it, which is the
 *   reading worth writing down: the `!== true` spelling is pinned by
 *   the NULL case alone, and a plan that deleted the null case would
 *   leave the pre-fetch behaviour unguarded while the suite stayed
 *   green.
 * - Deleting the gate outright, so Save settings is always drawn,
 *   answers `12 failed | 4 passed`, both omission cases among them.
 *   Named so the false case is not read as idle — it is blind to the
 *   narrower mutation above and not to this one.
 * - Counting `features.length` instead of the contributors answers `2
 *   failed | 14 passed`: `does not count a feature answering zero
 *   items toward the grouping` and `does not count a disabled feature
 *   toward the grouping`. Those two cases ARE the contributor reading
 *   documented above; flipping the reading reds exactly them.
 * - Lowering {@link FEATURE_GROUPING_THRESHOLD} to `2` answers `3
 *   failed | 13 passed` — the same two plus `draws two contributing
 *   features inline`. So the two-feature and three-feature shapes hold
 *   the constant from both sides rather than from above only.
 * - Ignoring `isEnabled` answers `3 failed | 13 passed`: `omits a
 *   feature whose isEnabled answers false, and never asks it for
 *   items`, `does not count a disabled feature toward the grouping`,
 *   and `hands the host to isEnabled and to items`.
 * - Dropping the zero-item `return null`, so an empty feature
 *   contributes an empty submenu, answers `2 failed | 14 passed` —
 *   `omits a feature answering zero items rather than drawing an empty
 *   submenu` and the grouping case built on it.
 * - Dropping the single-item branch, so every feature gets a submenu,
 *   answers `7 failed | 9 passed`. The wide blast radius is the point:
 *   most of the file's expected label lists are written in terms of
 *   the inline shape.
 * - Dropping {@link DEVTOOLS_ITEM_ID_PREFIX} from the node id answers
 *   `1 failed | 15 passed`, the one being `namespaces the node id
 *   while handing the item through unchanged`.
 * - Handing `feature.icon` to a submenu's children answers `1 failed |
 *   15 passed`, the one being `renders a multi-item feature as its own
 *   submenu, with the icon on the submenu alone`.
 * - Drawing the fixed rows before Position answers `10 failed | 6
 *   passed` — the order is read positionally nearly everywhere.
 * - Marking every corner `checked: true` answers `2 failed | 14
 *   passed`: both corner cases.
 *
 * The false negative runs the opposite way from `./types.ts`'s. There,
 * the pins are `@ts-expect-error` directives that only `check-types`
 * can report and `vitest` cannot see. Here, every mutation above is a
 * behaviour change over types that still line up: `bun x tsc --noEmit`
 * exits `0` under the threshold, the unprefixed-id and the
 * repeated-icon mutations (all three measured). So `bun run
 * check-types` alone would never say this model had changed its mind,
 * and the suite is the only gate that reports it.
 */

import type {
  Corner,
  DevToolsFeature,
  DevToolsHost,
  DevToolsStatus,
  MenuItem,
} from './types';

/** The Position submenu's node id. */
export const DEVTOOLS_POSITION_ID = 'devtools.position';

/** The About row's node id. */
export const DEVTOOLS_ABOUT_ID = 'devtools.about';

/** The Save settings row's node id. */
export const DEVTOOLS_SAVE_SETTINGS_ID = 'devtools.save-settings';

/** The Features submenu's node id, used at three contributors or more. */
export const DEVTOOLS_FEATURES_ID = 'devtools.features';

/**
 * What a feature's own submenu id starts with.
 *
 * Exported so a caller can assert the namespacing rather than trust
 * it — see this module's documentation for why a feature's id is
 * never a node id on its own.
 */
export const DEVTOOLS_FEATURE_ID_PREFIX = 'devtools.feature.';

/** What a feature-contributed row's node id starts with. */
export const DEVTOOLS_ITEM_ID_PREFIX = 'devtools.item.';

/**
 * How many contributing features it takes to collapse them under one
 * Features submenu.
 *
 * Three, from the spec. The count is of CONTRIBUTORS — see this
 * module's documentation for what an empty feature counts as.
 */
export const FEATURE_GROUPING_THRESHOLD = 3;

/**
 * A feature's glyph, carried through the model untouched.
 *
 * Spelled as a lookup into {@link DevToolsFeature} rather than as
 * `ReactNode` so this module needs no React import of any kind.
 */
export type MenuNodeIcon = DevToolsFeature['icon'];

/**
 * One of the four Position rows.
 *
 * The shell writes its corner slot from {@link corner} when the row
 * is chosen; nothing in this module can do that, which is why the row
 * describes itself instead of carrying a callback.
 */
export interface MenuCornerNode {
  /** Discriminant. */
  readonly kind: 'corner';

  /** Identity within the menu, for keying and roving focus. */
  readonly id: string;

  /** What the row reads. */
  readonly label: string;

  /** Where choosing this row puts the trigger. */
  readonly corner: Corner;

  /** Whether the trigger is in this corner right now. */
  readonly checked: boolean;
}

/**
 * One of the two rows the shell itself draws.
 *
 * The id is a closed union on purpose: the shell's dispatch over it
 * is exhaustive, so a third fixed row added here is a `check-types`
 * error where the shell handles the other two rather than a row that
 * does nothing when clicked.
 */
export interface MenuFixedNode {
  /** Discriminant. */
  readonly kind: 'fixed';

  /** Which fixed row this is. */
  readonly id: typeof DEVTOOLS_ABOUT_ID | typeof DEVTOOLS_SAVE_SETTINGS_ID;

  /** What the row reads. */
  readonly label: string;
}

/** A row backed by a feature's own {@link MenuItem}. */
export interface MenuItemNode {
  /** Discriminant. */
  readonly kind: 'item';

  /** Identity within the menu; namespaced, never the item's own id. */
  readonly id: string;

  /** What the row reads: the ITEM's label, not the feature's. */
  readonly label: string;

  /** The feature's glyph, present only on a single-item feature's row. */
  readonly icon?: MenuNodeIcon;

  /** The contract value, handed through unchanged. */
  readonly item: MenuItem;
}

/** A row that opens another list: Position, Features, or a feature. */
export interface MenuSubmenuNode {
  /** Discriminant. */
  readonly kind: 'submenu';

  /** Identity within the menu, for keying and roving focus. */
  readonly id: string;

  /** What the row reads. */
  readonly label: string;

  /** The feature's glyph, on a feature's own submenu. */
  readonly icon?: MenuNodeIcon;

  /** What the submenu holds, in draw order. Never empty. */
  readonly children: readonly MenuNode[];
}

/** Any row the menu can draw. */
export type MenuNode =
  | MenuCornerNode
  | MenuFixedNode
  | MenuItemNode
  | MenuSubmenuNode;

/** What {@link buildMenuModel} needs to answer. */
export interface MenuModelInput {
  /** The configured features, in menu order. */
  readonly features: readonly DevToolsFeature[];

  /** The one surface a feature may reach; passed to both callbacks. */
  readonly host: DevToolsHost;

  /**
   * Where the trigger is RIGHT NOW.
   *
   * Taken as its own member rather than read off
   * `host.settings.corner`, because the shell owns the corner slot and
   * moves it during a session while the host may have been assembled
   * once at mount. Passing the live value keeps the checkmark honest
   * whichever way the host is built.
   */
  readonly corner: Corner;

  /**
   * What the dev-server endpoint answered, or `null` before it has.
   *
   * Only `persistence` is read. `null` reads as not persisting.
   */
  readonly status: DevToolsStatus | null;
}

/** The four corners in clockwise order, with what each row reads. */
const CORNER_ROWS: readonly { corner: Corner; label: string }[] = [
  { corner: 'top-left', label: 'Top left' },
  { corner: 'top-right', label: 'Top right' },
  { corner: 'bottom-right', label: 'Bottom right' },
  { corner: 'bottom-left', label: 'Bottom left' },
];

/**
 * Build the Position submenu.
 *
 * @param active - Where the trigger is right now.
 * @returns The submenu, holding all four corners with one checked.
 */
function buildPositionNode(active: Corner): MenuSubmenuNode {
  const children = CORNER_ROWS.map(({ corner, label }): MenuCornerNode => ({
    kind: 'corner',
    id: `${DEVTOOLS_POSITION_ID}.${corner}`,
    label,
    corner,
    checked: corner === active,
  }));

  return {
    kind: 'submenu',
    id: DEVTOOLS_POSITION_ID,
    label: 'Position',
    children,
  };
}

/**
 * Build the shell's own rows, applying the persistence gate.
 *
 * @param status - The status payload, or `null` before one arrived.
 * @returns About alone, or About followed by Save settings.
 */
function buildFixedNodes(
  status: DevToolsStatus | null,
): readonly MenuFixedNode[] {
  const about: MenuFixedNode = {
    kind: 'fixed',
    id: DEVTOOLS_ABOUT_ID,
    label: 'About',
  };

  // `!== true` rather than `=== false`, so a null status and a status
  // that somehow carried a non-boolean both read as "does not
  // persist". The row is absent while the question is open.
  if (status?.persistence !== true) {
    return [about];
  }

  return [
    about,
    {
      kind: 'fixed',
      id: DEVTOOLS_SAVE_SETTINGS_ID,
      label: 'Save settings',
    },
  ];
}

/**
 * Wrap one of a feature's items as a row.
 *
 * @param feature - The feature the item came from, for the namespace.
 * @param item - The contract value, handed through unchanged.
 * @param icon - The glyph to draw, or `undefined` to draw none.
 * @returns The row.
 */
function buildItemNode(
  feature: DevToolsFeature,
  item: MenuItem,
  icon: MenuNodeIcon,
): MenuItemNode {
  return {
    kind: 'item',
    id: `${DEVTOOLS_ITEM_ID_PREFIX}${feature.id}.${item.id}`,
    label: item.label,
    icon,
    item,
  };
}

/**
 * Turn one enabled feature into the node it contributes.
 *
 * @param feature - The feature; its `items` is called exactly once.
 * @param host - The one surface a feature may reach.
 * @returns The row, the submenu, or `null` when it answered no items.
 */
function buildFeatureNode(
  feature: DevToolsFeature,
  host: DevToolsHost,
): MenuNode | null {
  const items = feature.items(host);
  const [first] = items;

  // Zero items contributes nothing — not an empty submenu, which
  // would be a row that opens onto nothing. The destructure is also
  // what narrows `first` away from `undefined` for the line below,
  // which `noUncheckedIndexedAccess` would otherwise refuse.
  if (first === undefined) {
    return null;
  }

  if (items.length === 1) {
    return buildItemNode(feature, first, feature.icon);
  }

  return {
    kind: 'submenu',
    id: `${DEVTOOLS_FEATURE_ID_PREFIX}${feature.id}`,
    label: feature.label,
    icon: feature.icon,
    children: items.map((item) => buildItemNode(feature, item, undefined)),
  };
}

/**
 * Turn the configured features into the rows they contribute.
 *
 * @param features - The configured features, in menu order.
 * @param host - The one surface a feature may reach.
 * @returns The contributed rows inline, or one Features submenu over
 * them once there are {@link FEATURE_GROUPING_THRESHOLD} or more.
 */
function buildFeatureNodes(
  features: readonly DevToolsFeature[],
  host: DevToolsHost,
): readonly MenuNode[] {
  const contributed: MenuNode[] = [];

  for (const feature of features) {
    // A feature that omits `isEnabled` is always enabled. `items` is
    // not called at all for a disabled one, so a feature may assume
    // it is only asked for rows it is allowed to draw.
    if (feature.isEnabled?.(host) ?? true) {
      const node = buildFeatureNode(feature, host);

      if (node !== null) {
        contributed.push(node);
      }
    }
  }

  if (contributed.length < FEATURE_GROUPING_THRESHOLD) {
    return contributed;
  }

  return [{
    kind: 'submenu',
    id: DEVTOOLS_FEATURES_ID,
    label: 'Features',
    children: contributed,
  }];
}

/**
 * Derive the whole menu.
 *
 * Position first with the active corner marked, then About, then Save
 * settings when and only when the status payload reports
 * `persistence: true`, then the contributing features — inline below
 * three of them, under one Features submenu at three or more.
 *
 * Pure: reads no storage, sends nothing, holds nothing between calls
 * and mutates neither the input nor the {@link MenuItem}s it carries.
 * It does call {@link DevToolsFeature.isEnabled} and
 * {@link DevToolsFeature.items}, once each per feature, and lets a
 * throw from either escape — see this module's documentation.
 *
 * @param input - The features, the host, the live corner and the
 * status payload.
 * @returns The rows, in draw order. Never empty: Position and About
 * are drawn whatever the features answer.
 */
export function buildMenuModel(input: MenuModelInput): readonly MenuNode[] {
  return [
    buildPositionNode(input.corner),
    ...buildFixedNodes(input.status),
    ...buildFeatureNodes(input.features, input.host),
  ];
}
