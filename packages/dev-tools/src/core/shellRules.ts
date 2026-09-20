/**
 * @packageDocumentation
 * The shell's decisions that are statable as a value: what the About
 * panel reads, and how a slot holding an id finds the item it names.
 *
 * `./Shell.tsx` owns the state slots, the render order and the
 * wiring; everything it decides that is a plain function of plain
 * values lives here. That is the package's two-runner discipline as
 * `../../vitest.config.ts` states it: the jsdom vitest project
 * collects `.ts` only, so a decision left inside a `.tsx` is reachable
 * by the forced Playwright spec and by nothing else. A version line
 * read aloud to an operator and a walk over the menu model are both
 * exactly the kind of thing worth pinning by a unit case, so they are
 * here and the component calls them.
 *
 * The module is pure: no state between calls, no storage, no request,
 * no DOM and no React. It imports two names from `./host.ts` and two
 * types, and nothing else.
 *
 * ## Why the slots hold an id and the items are looked up
 *
 * Decision 6 of `.rafa/specs/q20b-1-dev-tools-shell.md` fixes the
 * shape of the exclusive slot as `{itemId, mode} | null`, and that is
 * the shape {@link DevToolsOpenSurface} has. A slot carrying the
 * chosen {@link MenuItem} itself would have been one line shorter in
 * `./Shell.tsx` and a different thing: the menu model is rebuilt
 * whenever the corner, the size or the status payload changes, and a
 * captured item would then be an item from a model nobody is drawing
 * any more — a `render` closed over a host that has since been
 * replaced. Looking the id up in the CURRENT model per render keeps
 * the open surface and the menu telling the same story.
 *
 * The lookup is by {@link MenuItem.id} rather than by the namespaced
 * node id, because `./Menu.tsx` answers upward with the contract item
 * and not with the node that carried it. `../types.ts` already
 * requires that id to be a stable identity and says in as many words
 * that the shell keys the open-surface slot on it. Two features that
 * spell the same item id therefore collide, and {@link
 * findSurfaceItem} answers the FIRST in draw order rather than
 * throwing: the widget drawing one of the two surfaces is worth more
 * to an operator than a dev tool that refuses to open.
 *
 * ## The popover slot is a union, and that is not symmetry for its
 * own sake
 *
 * {@link DevToolsPopoverSlot} discriminates `about` from `item`
 * instead of holding the About row's id as if it were a feature's.
 * The fixed rows are the shell's own and are not in the menu model as
 * items — `./menuModel.ts` gives About a `kind: 'fixed'` node with no
 * {@link MenuItem} behind it — so an id-only slot would have to be
 * resolved by comparing against `DEVTOOLS_ABOUT_ID` and would open
 * the About panel for any feature that happened to name an item
 * `devtools.about`. The union makes that unrepresentable.
 *
 * ## Every version field is read defensively
 *
 * `../host.ts` already answers `unknown` for a commit, a branch or a
 * round nothing could state, so the empty string should never reach
 * this module. It is read for it anyway: {@link DevToolsConfig}'s
 * `version` member is app-supplied and WINS over the status payload,
 * so `version: { commit: '' }` in a host app's config is a shape the
 * About panel can be handed, and a blank line under a `<dt>Commit</dt>`
 * tells an operator strictly less than `unknown` does. `api` is the
 * one field with its own word: `null` is what the contract says for
 * "the config named no probe, or the probe answered nothing", and
 * {@link DEVTOOLS_ABOUT_UNAVAILABLE} is that said out loud rather
 * than as a second `unknown` an operator would read as a failure.
 *
 * ## Mutation note — what the colocated cases actually catch
 *
 * A green suite is not evidence a case can fail. Each leg below was
 * measured by breaking this file, reds `bun x vitest run
 * src/core/shellRules.test.ts` from `packages/dev-tools` against the
 * 22 cases `./shellRules.test.ts` holds, and restores this file
 * byte-identical:
 *
 * - Answering the raw `api` rather than {@link
 *   DEVTOOLS_ABOUT_UNAVAILABLE} for a blank one answers `Tests  2
 *   failed | 20 passed (22)`: BOTH api cases, `reads a null api as
 *   unavailable` and `reads a blank api as unavailable`. The first
 *   was expected to survive and did not — `null` is normalised to the
 *   empty string a line earlier, so the two shapes meet at the same
 *   branch and one mutation takes them both. The pair is kept because
 *   the normalisation is what makes that true and is itself a line
 *   somebody could delete.
 * - Dropping the blank fallback in `readVersionField`, so an empty
 *   commit is answered whole, answers `2 failed | 20 passed`: the
 *   summary case and the details case for a blank field.
 * - Abbreviating the commit in {@link buildAboutDetails} as well as
 *   in {@link describeAboutSummary} answers `1 failed | 21 passed` —
 *   `carries the WHOLE commit, unlike the version line`. That is the
 *   leg that keeps the details row copyable into a report.
 * - Stopping the walk from recursing into a submenu answers `2 failed
 *   | 20 passed`: the nested lookup and the feature-grouped drawer
 *   collection. Every other nesting case survives it, because two
 *   contributors stay inline and only the third collapses them.
 * - Dropping the duplicate-id fold in {@link collectDrawerItems}
 *   answers `1 failed | 21 passed` — `keeps the first of two drawers
 *   sharing an id`. That is the leg that stops two React children
 *   sharing a key.
 * - Letting {@link findSurfaceItem} answer an action row answers `1
 *   failed | 21 passed` — `answers null for an action row, which
 *   draws no surface`. That leg needed an `as never` cast to compile
 *   at all, which is the reading beside the case: the return type
 *   refuses an action before any case gets to.
 *
 * `check-types` reports none of the six: `bun x tsc --noEmit` exited
 * `0` over each mutated variant (measured, all six). Five are a
 * behaviour change inside a signature that still holds; the sixth
 * only exits `0` because the mutation casts its way past the
 * signature, which is why the case beside it exists. The suite is the
 * only gate that can report any of them.
 */

import type { MenuNode } from './menuModel';
import type { DevToolsHost, MenuItem } from './types';

import { DEVTOOLS_UNKNOWN_VERSION } from './host';

/** The About popover's accessible name, and its row's label. */
export const DEVTOOLS_ABOUT_LABEL = 'About';

/** What the button that expands the About details reads. */
export const DEVTOOLS_ABOUT_DETAILS_LABEL = 'Details';

/**
 * What the About panel says instead of a service version.
 *
 * Its own word rather than a second `unknown`: the service not having
 * been asked, or having answered nothing, is not the same event as a
 * build that cannot say what commit it is.
 */
export const DEVTOOLS_ABOUT_UNAVAILABLE = 'unavailable';

/**
 * How many characters of the commit the version line carries.
 *
 * Seven, which is what `git` itself abbreviates to. The details rows
 * below carry the whole hash, so nothing is lost — the line is what
 * an operator reads at a glance.
 */
export const DEVTOOLS_ABOUT_COMMIT_LENGTH = 7;

/**
 * What the shell's live region says when Save settings is chosen.
 *
 * The row is drawn only when the status endpoint reports
 * `persistence: true`, which this plan's plugin never does, so the
 * sentence is unreachable in this plan and the wire exists anyway —
 * see `./menuModel.ts` for the gate and the spec's item 3 for why the
 * behaviour is deferred rather than absent.
 */
export const DEVTOOLS_SAVE_SETTINGS_DEFERRED
  = 'Saving settings to the dev server is not implemented in this build.';

/**
 * What the shell's live region says when a published `open-item`
 * names nothing it can open.
 *
 * Decision 7 of `.rafa/specs/q20b-3-error-boundary-provider.md` fixes
 * the words: `./openItem.ts` collapses an unknown feature id, an
 * unknown item id, a disabled feature and a payload of the wrong
 * shape into ONE `null`, and this is the one thing `./Shell.tsx` says
 * about any of them. Four sentences would have told the operator
 * which of the publisher's mistakes it was, which is a thing the
 * publisher's author reads in a console and the operator cannot act
 * on.
 *
 * Stated with no trailing stop, unlike
 * {@link DEVTOOLS_SAVE_SETTINGS_DEFERRED}: that one is a sentence
 * about this build, this is a label about one publish.
 *
 * It has no colocated case of its own, as
 * {@link DEVTOOLS_ABOUT_DETAILS_LABEL} has none: a case reading that
 * a constant is a non-empty string pins nothing this module decides.
 * What the words are FOR is pinned where they are said — the live
 * region of a mounted shell, which `./Shell.tsx`'s probe reads and
 * the stage's assembled-shell cases pin.
 */
export const DEVTOOLS_NOTHING_TO_OPEN = 'Nothing to open';

/**
 * What build is running, as the About panel reads it.
 *
 * Spelled as a lookup into {@link DevToolsHost} rather than restated,
 * so a member added to the version line reaches this module as a
 * `check-types` error rather than as a second definition that has
 * quietly stopped matching.
 */
export type DevToolsVersion = DevToolsHost['version'];

/**
 * The shell's one exclusive surface slot.
 *
 * Decision 6's shape, unchanged. One nullable value of it is the
 * whole of "one drawer at a time" — see `./Shell.tsx`'s header for
 * why no guard implements that.
 */
export interface DevToolsOpenSurface {
  /** The chosen {@link MenuItem}'s own id. */
  readonly itemId: string;

  /** Which of the two blocking modes the item declared. */
  readonly mode: 'modal' | 'drawer';
}

/**
 * The shell's popover slot, which may be occupied while a drawer is.
 *
 * A union rather than an id, so the shell's own About panel and a
 * feature's popover cannot be mistaken for each other whatever a
 * feature names its items. See this module's header.
 */
export type DevToolsPopoverSlot =
  | {
    /** Discriminant: the shell's own About panel. */
    readonly kind: 'about';
  }
  | {
    /** Discriminant: a feature's `mode: 'popover'` item. */
    readonly kind: 'item';

    /** The chosen {@link MenuItem}'s own id. */
    readonly itemId: string;
  };

/**
 * The `mode: 'drawer'` member of {@link MenuItem}, named.
 *
 * Extracted from the union rather than declared again, the way
 * `./surfaces/ActionItem.tsx` names the action member.
 */
export type DevToolsDrawerMenuItem = Extract<MenuItem, { mode: 'drawer' }>;

/**
 * Any item that DRAWS something: everything but an action.
 *
 * Spelled as an `Exclude` rather than an `Extract` of the three
 * drawing modes, because `Extract<MenuItem, { mode: 'modal' }>` is
 * `never`: the contract carries popover and modal on ONE member whose
 * `mode` is the pair, and that member is not assignable to either
 * literal alone. Excluding the action member is the only spelling
 * that answers the three drawing members, and every one of them
 * carries `render`.
 */
export type DevToolsSurfaceMenuItem = Exclude<MenuItem, { mode: 'action' }>;

/** One row of the expanded About details. */
export interface DevToolsAboutDetail {
  /** What the row is called; the `<dt>`. */
  readonly term: string;

  /** What it reads; the `<dd>`. Never blank. */
  readonly value: string;
}

/**
 * Read one version field, answering `unknown` for a blank one.
 *
 * @param value - Whatever the host's version member carried.
 * @returns The trimmed value, or `unknown`.
 */
function readVersionField(value: string): string {
  const trimmed = value.trim();

  return trimmed === ''
    ? DEVTOOLS_UNKNOWN_VERSION
    : trimmed;
}

/**
 * The version line: the abbreviated commit and the branch it is on.
 *
 * @param version - What build is running.
 * @returns One line, never blank.
 */
export function describeAboutSummary(version: DevToolsVersion): string {
  const commit = readVersionField(version.commit)
    .slice(0, DEVTOOLS_ABOUT_COMMIT_LENGTH);

  return `commit ${commit} on ${readVersionField(version.branch)}`;
}

/**
 * The four rows the details button expands.
 *
 * The commit is carried WHOLE here, unlike in
 * {@link describeAboutSummary}: the line is for reading, these rows
 * are for copying into a report.
 *
 * @param version - What build is running.
 * @returns The rows, in a fixed order. Every value is non-blank.
 */
export function buildAboutDetails(
  version: DevToolsVersion,
): readonly DevToolsAboutDetail[] {
  const api = version.api === null
    ? ''
    : version.api.trim();

  return [
    { term: 'Commit', value: readVersionField(version.commit) },
    { term: 'Branch', value: readVersionField(version.branch) },
    { term: 'Round', value: readVersionField(version.round) },
    {
      term: 'API',
      value: api === ''
        ? DEVTOOLS_ABOUT_UNAVAILABLE
        : api,
    },
  ];
}

/**
 * Every {@link MenuItem} the model carries, in draw order.
 *
 * Recursive over submenus, because a feature with several items and a
 * menu of three features or more both nest their rows one level
 * deeper — see `./menuModel.ts`.
 *
 * @param nodes - The model, or one submenu's children.
 * @returns The items, flattened.
 */
function listMenuItems(nodes: readonly MenuNode[]): readonly MenuItem[] {
  const items: MenuItem[] = [];

  for (const node of nodes) {
    if (node.kind === 'submenu') {
      items.push(...listMenuItems(node.children));
    } else if (node.kind === 'item') {
      items.push(node.item);
    }
  }

  return items;
}

/**
 * Find the drawable item a slot names.
 *
 * An `action` row is refused rather than answered, because it has no
 * `render` and a slot naming one is a slot nothing can draw. The
 * shell writes actions into their own slot, so this is a shape that
 * only arises when two features spell the same item id.
 *
 * @param nodes - The menu model as it stands right now.
 * @param itemId - What the slot holds.
 * @returns The item, or `null` when the model no longer carries one
 * of that id — a feature whose `isEnabled` went false while its
 * surface was open, for instance — or when the id names an action.
 * The shell then draws nothing rather than an empty surface.
 */
export function findSurfaceItem(
  nodes: readonly MenuNode[],
  itemId: string,
): DevToolsSurfaceMenuItem | null {
  const item = listMenuItems(nodes).find((candidate) => candidate.id === itemId);

  return item === undefined || item.mode === 'action'
    ? null
    : item;
}

/**
 * Every drawer the model offers, in draw order and one per id.
 *
 * The shell renders all of them for as long as it is mounted, open or
 * not, because a collapsed drawer with a handle still draws its edge
 * tab — see `./surfaces/Drawer.tsx`.
 *
 * @param nodes - The menu model as it stands right now.
 * @returns The drawer items. A second item repeating an earlier id is
 * dropped: React would otherwise be handed two children under one key.
 */
export function collectDrawerItems(
  nodes: readonly MenuNode[],
): readonly DevToolsDrawerMenuItem[] {
  const seen = new Set<string>();
  const drawers: DevToolsDrawerMenuItem[] = [];

  for (const item of listMenuItems(nodes)) {
    if (item.mode === 'drawer' && !seen.has(item.id)) {
      seen.add(item.id);
      drawers.push(item);
    }
  }

  return drawers;
}
