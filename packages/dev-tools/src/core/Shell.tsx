/**
 * @packageDocumentation
 * The shell: every piece of the widget's state, and the wiring that
 * turns a chosen menu row into a drawn surface.
 *
 * Everything below this component is pure or presentational —
 * `./Trigger.tsx` draws a button from two props, `./Menu.tsx` answers
 * upward through four callbacks, each surface under `./surfaces/`
 * decides how its own element behaves and nothing about which one is
 * open. This file is where those answers land, and it is the only
 * place in the package that holds state across a render.
 *
 * It imports NO feature module, and cannot: features arrive as
 * {@link DevToolsConfig.features} and are turned into rows by
 * `./menuModel.ts`. The one thing a feature is handed back is the
 * {@link DevToolsHost} built here.
 *
 * ## The one nullable slot IS the one-drawer-at-a-time invariant
 *
 * `openSurface: {itemId, mode: 'modal' | 'drawer'} | null` is ONE
 * value. Two drawers cannot occupy it, and neither can a drawer and a
 * modal: choosing a second row overwrites the first, so the first
 * closes because nothing is drawing it any more. There is no code
 * below that checks whether a drawer is already open, no effect that
 * closes one before opening another, and no assertion that the
 * invariant held — decision 6 of
 * `.rafa/specs/q20b-1-dev-tools-shell.md` is structural precisely so
 * that NO GUARD IMPLEMENTS IT and there is therefore no guard to
 * delete, skip or get wrong. A reader looking for the enforcement
 * will not find it; the state's shape is the enforcement.
 *
 * The cost of that shape is stated rather than hidden: a modal and a
 * drawer are mutually exclusive too, which is stricter than the
 * requirement. That is deliberate — both are surfaces the operator is
 * working IN, and a modal that trapped focus over a drawer the
 * operator had just filled in would be the same bug the invariant
 * exists to forbid, one layer up.
 *
 * The popover slot is separate for the opposite reason: a popover is
 * non-blocking, so it may coexist with a drawer, and a slot of its
 * own is what lets it. It is a union rather than a bare id — see
 * `./shellRules.ts` for why the About panel is not spelled as a
 * feature item's id.
 *
 * ## What is held, and what is deliberately NOT
 *
 * - `settings`, read ONCE at mount through `./settings.ts`. Only
 *   `size` is read from it here; the `handles` set belongs to the
 *   drawers, which read and write it themselves, so this snapshot
 *   going stale in that member costs nothing.
 * - `corner`, seeded from {@link DevToolsConfig.corner} — or the
 *   package default — on EVERY load. Decision 5: the corner is not
 *   persisted, by requirement, so it is initialised from the config
 *   and never read back from storage. An operator who moved the
 *   tomato out of the way last week gets it back where the app asked
 *   for it today.
 * - `openSurface`, the exclusive slot above.
 * - `popover`, the non-blocking slot above.
 * - `action`, the chosen `mode: 'action'` row while its `run` is in
 *   flight. Cleared on settle, which is what lets the SAME row run a
 *   second time: the component unmounts and a fresh one mounts, and
 *   `./surfaces/ActionItem.tsx` runs once per MOUNT. Choosing the row
 *   again while it is still running writes into the slot again and
 *   remounts nothing — same element type, same position — so the run
 *   does not start twice. That guarantee is the `started` ref in that
 *   component, not a check here.
 * - `announcement`, what the `role="status"` region currently reads.
 * - `trigger`, the button element, held as STATE rather than in a
 *   ref: `@floating-ui/dom` needs it to position against, and a ref
 *   mutation would not re-render the surfaces that are waiting for
 *   it. Every anchored surface takes `null` until React has attached
 *   it and stays invisible in the meantime.
 *
 * What is NOT held: the host and the menu model, both of which are
 * derived per render and memoised. The host is rebuilt when the
 * corner, the size, the status payload or the API version changes,
 * because `./host.ts` freezes the values it hands features and takes
 * the live settings as input.
 *
 * ## The `role="status"` region is rendered from mount
 *
 * Not created on first use: a live region a screen reader has not
 * already seen announces nothing when it appears WITH content, which
 * is exactly the moment an action has failed and the operator needs
 * telling. It is the last child, it is empty until something speaks,
 * and `../styles.css` hides it visually rather than with `display:
 * none`, which would take it off the accessibility tree.
 *
 * It is also the only channel an action has: the pending card in
 * `./surfaces/ActionItem.tsx` is `aria-hidden`, so a rejection that
 * did not reach this region would reach nobody.
 *
 * ## The bus's `open-item` is the one thing this component listens to
 *
 * It is also the only way into the widget that does not start with a
 * pointer or a key: the app publishes a feature id and an item id,
 * `./openItem.ts` turns the pair into that feature's own
 * {@link MenuItem} or into `null`, and the answer is acted on here.
 * The item goes through `chooseItem` — the SAME callback `./Menu.tsx`
 * answers upward with — and a `null` writes
 * {@link DEVTOOLS_NOTHING_TO_OPEN} into the live region above.
 *
 * Going through `chooseItem` rather than writing the slots again is
 * what makes "exactly as a menu click would" true of all four modes
 * at once: an action runs, a popover takes the non-blocking slot, and
 * a modal and a drawer take the one exclusive slot, invariant
 * included. A second set of branches would be a second thing to keep
 * in step with the first.
 *
 * What a publish deliberately does NOT do is dismiss an open menu. A
 * click dismisses it through `./Menu.tsx`'s own `dismiss`, which
 * FIRST returns focus to the trigger; that function is unreachable
 * from out here, and closing the menu by writing `menuOpen` would
 * unmount the rows with a keyboard operator's focus on one of them
 * and drop it to the document body. Nothing in the menu was
 * activated, so nothing in the menu is finished with.
 *
 * `./bus.ts`'s `subscribe` ANSWERS its disposer and the effect
 * returns it, so unsubscribing on dispose is the cleanup and there is
 * nothing between the two to get wrong. That disposer is idempotent,
 * which is what makes StrictMode's double-invoked effect harmless. The effect re-syncs whenever the host or the feature
 * array changes — a corner move rebuilds the host — and that is an
 * unsubscribe and a subscribe inside one commit rather than a window:
 * delivery is synchronous, so there is no moment between them in
 * which a publish could be made and missed.
 *
 * A resolved item does NOT clear the region, and a live region speaks
 * on change, so a second unresolvable publish in a row says nothing —
 * the text it would write is the text already there (measured;
 * reading 5d below shows the stale line under an opened drawer). That
 * is stated rather than worked around: the fix is a value that
 * toggles, which reads the same sentence twice to an operator who is
 * not the one who published, and the publisher's author has a
 * console.
 *
 * ## About is the shell's own surface
 *
 * `./menuModel.ts` gives About a `kind: 'fixed'` node with no
 * {@link MenuItem} behind it — the row is the widget's, not a
 * feature's — so the panel is drawn here, through the SAME
 * `./surfaces/Popover.tsx` a feature's popover goes through. It
 * shows the version line, and a details button expanding the full
 * commit, the branch, the round and the API version or `unavailable`.
 * Every one of those strings is decided by `./shellRules.ts` and
 * pinned by its cases; this file only draws them.
 *
 * Save settings, the other fixed row, is dispatched and says so in
 * the live region. The row itself is drawn only when the status
 * endpoint reports `persistence: true`, which this plan's plugin
 * never does, so that branch is unreachable in this plan — the wire
 * exists, the behaviour is deferred, exactly as the spec's item 3
 * says. The dispatch is a `switch` with a `never` binding in its
 * default, so a THIRD fixed row added to the model reds
 * `check-types` here rather than doing nothing when it is clicked.
 *
 * ## Render order is a contract, not a layout preference
 *
 * The trigger is rendered FIRST inside `[data-devtools-root]`, then
 * the menu, then the surfaces, then the live region.
 * `./surfaces/Popover.tsx` records that it moves no focus on open
 * because one Tab from the trigger reaches it, and that claim is only
 * true while the popover is rendered after the trigger. Reordering
 * the children below silently falsifies a sentence in that file.
 *
 * ## Drawers are mounted whether or not they are open
 *
 * Every drawer the model offers is rendered for as long as the shell
 * is, because a collapsed drawer with `handle: true` still draws its
 * edge tab and a drawer that was unmounted could not. `open` is a
 * function of the one slot, so exactly one of them can be showing.
 * Their children are withheld while collapsed — a feature's `render`
 * is not called for a drawer nobody is looking at — and each keeps
 * the placement its switcher chose for as long as the shell lives,
 * which is a consequence of staying mounted rather than a feature
 * anything here implements.
 *
 * ## A misconfigured endpoint is loud, and this file does not soften
 * it
 *
 * `buildDevToolsHost` throws when {@link DevToolsConfig.endpoint}
 * names an origin, and it is called during render, so the throw takes
 * the widget's own root down. That is `./host.ts`'s decision and the
 * right one: the operator IS the author of the config, and a widget
 * that quietly talked to a stranger would be worse than one that did
 * not draw. The app is unaffected either way — decision 3 puts this
 * root outside the app's.
 *
 * ## Measured — `react-dom/server` probe in `/tmp`
 *
 * `/tmp/devtools-shell-probe.tsx` (this task's own capture, filed in the
 * close-out notes) rendered this component at mount, twice: once with no
 * features, once with one feature contributing a `mode: 'modal'` item and
 * a `mode: 'drawer'` item side by side.
 *
 * - The trigger's accessible name is `Dev tools` — `aria-label`, from
 *   `./Trigger.tsx`'s own default, nothing passed here overrides it —
 *   carrying `aria-haspopup="menu"` and `aria-expanded="false"` before
 *   the menu has ever been opened.
 * - `role="status"` is present in the static markup at mount, empty
 *   (`<p class="devtools-status" role="status"></p>`), confirming it is
 *   rendered unconditionally rather than created on first announcement.
 * - With both a modal item and a drawer item configured, the markup at
 *   mount carries no `<dialog>` at all and no `.devtools-drawer` panel:
 *   `openSurface` starts `null`, and `modalItem` above and every
 *   drawer's `open` are both read off that ONE value, so neither surface
 *   is open before anything has been chosen.
 * - `renderToStaticMarkup` fires no event handler (no hydration, no
 *   listener), so `chooseItem`'s two blocking branches could not be
 *   exercised by a click inside the probe. What it measured instead:
 *   writing the modal branch's literal and then the drawer branch's
 *   literal into ONE binding typed `DevToolsOpenSurface | null`
 *   (`./shellRules.ts`) leaves the binding reading as exactly one of
 *   them at a time — the second write replaces rather than joins the
 *   first, because there is no third shape that is both. That is the
 *   whole of the mechanical control behind "the one nullable slot IS
 *   the one-drawer-at-a-time invariant" above.
 *
 * The `open-item` subscription was added to the SAME probe rather than
 * to a second one, so this component keeps ONE static-render reading.
 * What the static half can say about the announcement is a refusal,
 * and it is worth saying — a served frame must not carry a sentence
 * nobody has made:
 *
 * - Reading 4: a payload published on `open-item` BEFORE
 *   `renderToStaticMarkup`, and a second one after it, leave the
 *   static frame's region exactly as reading 2 found it — `<p
 *   class="devtools-status" role="status"></p>`, text `""`, the markup
 *   not mentioning `Nothing to open` anywhere. The counting control
 *   beside it: the feature's `items` was called once, by the menu
 *   model's own read during that render, and NEITHER publish moved
 *   that count. No effect runs under `react-dom/server`, so nothing
 *   subscribed and the resolver was never reached.
 *
 * The announcement itself needs the effect, so the probe mounts the
 * same component a second time over `jsdom` + `react-dom/client`
 * through `act` — state and text, not paint; paint is the forced
 * Playwright spec's. `host.bus` is the `devtoolsBus` singleton here,
 * because this file builds the host without a `bus` member:
 *
 * - Reading 5a: mounted, region text `""`, no `.devtools-drawer`.
 * - Reading 5b: publishing `{featureId: 'probe-feature', itemId:
 *   'no-such-item'}` leaves the drawer absent and the region reading
 *   `Nothing to open`, and the feature's `items` call count MOVED —
 *   the resolver was reached and answered `null`.
 * - Reading 5c: an unknown feature id answers the same region text
 *   with nothing open.
 * - Reading 5d: publishing the drawer item's real id opens it —
 *   `.devtools-drawer` with `aria-label="Probe drawer"`, no `<dialog>`
 *   beside it — while the region still reads the previous `Nothing to
 *   open`. That stale line is the "does not clear" paragraph above,
 *   read rather than asserted.
 * - Reading 5e: publishing the MODAL item's id next leaves no
 *   `.devtools-drawer` and an open `<dialog aria-label="Probe
 *   modal">`, and moved the `items` count by exactly 1. The one
 *   exclusive slot behaves through the bus as it does through a click,
 *   which is the whole claim of routing both through `chooseItem`.
 * - Reading 5f: after `root.unmount()`, the container's markup is `""`
 *   and a further publish moves the `items` count by 0 — the effect
 *   cleanup ran the bus's disposer — and nothing threw out of
 *   `publish`.
 * - Reading 6: a SECOND root, so the region starts empty again, takes
 *   a string cast onto the typed topic — what a publisher the compiler
 *   never saw can put on the bus. The region reads `Nothing to open`,
 *   nothing opens, and the `items` count moves by 0: the shape guard
 *   answers before the roster is searched.
 *
 * Two controls, each breaking THIS file, re-running the probe and
 * restoring it byte-identical (`diff` confirmed, both):
 *
 * - Dropping the `useEffect` below entirely (leaving `openPublished`
 *   built and unused) reads `""` at 5b, 5d and 6b, with nothing opened
 *   and the `items` count unmoved at 5b. Every announcement reading
 *   above is therefore a reading of the subscription rather than of a
 *   region that says that anyway.
 * - Keeping the subscription but DISCARDING its disposer — a braced
 *   effect body returning `undefined` — moves 5f's count from 0 to 1:
 *   the unmounted shell's subscriber is still on the bus and still
 *   resolves. 6b stays `Nothing to open` under it, so 5f is the one
 *   reading that separates a leaked subscription from a cleaned one.
 *
 * One reading came out unasked-for: a `react-dom/client` warning,
 * `An update to DevToolsDrawer inside a test was not wrapped in
 * act(...)`, is printed between readings 5c and 5d — as the drawer
 * opens. It is `./surfaces/Drawer.tsx`'s deliberate microtask-deferred
 * `setSeen` landing after the `act` scope that opened it, not anything
 * this file does.
 *
 * ## What proves what
 *
 * Nothing in this file is proved by a unit case: the jsdom vitest
 * project collects `.ts` only, by the two-runner discipline
 * `../../vitest.config.ts` states. The decisions were moved into
 * `./shellRules.ts`, which has 22 of them; what is left here is
 * wiring, and the only readings of it are the probe above, recorded in
 * the close-out notes, and the forced Playwright spec — neither of
 * which re-runs, so a change to the wiring below is reported by
 * nothing automatic.
 */

import type { MenuFixedNode } from './menuModel';
import type {
  DevToolsOpenSurface,
  DevToolsPopoverSlot,
  DevToolsVersion,
} from './shellRules';
import type { DevToolsActionMenuItem } from './surfaces/ActionItem';
import type {
  Corner,
  DevToolsConfig,
  DevToolsOpenItemPayload,
  DevToolsStatus,
  MenuItem,
} from './types';
import type { ReactElement } from 'react';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';

import { DEVTOOLS_DEFAULT_CORNER, buildDevToolsHost } from './host';
import { DevToolsMenu } from './Menu';
import {
  DEVTOOLS_ABOUT_ID,
  DEVTOOLS_SAVE_SETTINGS_ID,
  buildMenuModel,
} from './menuModel';
import { resolveOpenItem } from './openItem';
import { readSettings } from './settings';
import {
  DEVTOOLS_ABOUT_DETAILS_LABEL,
  DEVTOOLS_ABOUT_LABEL,
  DEVTOOLS_NOTHING_TO_OPEN,
  DEVTOOLS_SAVE_SETTINGS_DEFERRED,
  buildAboutDetails,
  collectDrawerItems,
  describeAboutSummary,
  findSurfaceItem,
} from './shellRules';
import { DevToolsActionItem } from './surfaces/ActionItem';
import { DevToolsDrawer } from './surfaces/Drawer';
import { DevToolsModal } from './surfaces/Modal';
import { DevToolsPopover } from './surfaces/Popover';
import { DevToolsTrigger } from './Trigger';

/** What {@link AboutPanel} takes. */
interface AboutPanelProps {
  /** What build is running, as the host assembled it. */
  readonly version: DevToolsVersion;
}

/**
 * The About panel: one version line, and the details it expands to.
 *
 * Its own component so the expanded flag is created per open and
 * destroyed with the popover — an operator who expanded the details
 * last time gets the line, not the table, the next time they ask.
 *
 * @param props - {@link AboutPanelProps}.
 * @returns The line, the details button, and the rows while expanded.
 */
function AboutPanel({ version }: AboutPanelProps): ReactElement {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <p>{describeAboutSummary(version)}</p>

      <button
        type="button"
        className="devtools-menu-item"
        aria-expanded={expanded}
        onClick={() => { setExpanded((value) => !value); }}
      >
        {DEVTOOLS_ABOUT_DETAILS_LABEL}
      </button>

      {expanded
        ? (
          <dl>
            {buildAboutDetails(version).map((row) => (
              <Fragment key={row.term}>
                <dt className="devtools-menu-label">{row.term}</dt>
                <dd>{row.value}</dd>
              </Fragment>
            ))}
          </dl>
        )
        : null}
    </>
  );
}

/** What {@link DevToolsShell} takes. */
export interface DevToolsShellProps {
  /** What the app passed to `mountDevTools`. */
  readonly config: DevToolsConfig;

  /**
   * What `GET <endpoint>/status` answered, or `null` before it has.
   *
   * The shell draws from mount rather than waiting for it: a widget
   * that appeared only once a dev server had answered would be
   * missing exactly when the dev server is what broke.
   *
   * @defaultValue `null`
   */
  readonly status?: DevToolsStatus | null;

  /**
   * What {@link DevToolsConfig.apiVersion} answered, already resolved.
   *
   * Taken settled rather than probed here, so this component stays
   * synchronous and the About panel reads `unavailable` until it is
   * known.
   *
   * @defaultValue `null`
   */
  readonly api?: string | null;
}

/**
 * The widget: the trigger, the menu, the four surfaces and the live
 * region, over the state slots described in this module's header.
 *
 * @param props - {@link DevToolsShellProps}.
 * @returns Everything `[data-devtools-root]` holds.
 */
export function DevToolsShell({
  config,
  status = null,
  api = null,
}: DevToolsShellProps): ReactElement {
  // Read once, at mount. `./settings.ts` never throws: an unreachable
  // or corrupt store answers the defaults.
  const [settings] = useState(readSettings);

  // Seeded from the config on every load, by requirement. Nothing
  // reads a stored corner because nothing stores one.
  const [corner, setCorner] = useState<Corner>(
    config.corner ?? DEVTOOLS_DEFAULT_CORNER,
  );

  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openSurface, setOpenSurface] = useState<DevToolsOpenSurface | null>(
    null,
  );
  const [popover, setPopover] = useState<DevToolsPopoverSlot | null>(null);
  const [action, setAction] = useState<DevToolsActionMenuItem | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const host = useMemo(
    () => buildDevToolsHost({
      config,
      status,
      api,
      settings: { size: settings.size, corner },
    }),
    [api, config, corner, settings.size, status],
  );

  const nodes = useMemo(
    () => buildMenuModel({ features: config.features, host, corner, status }),
    [config.features, corner, host, status],
  );

  const closeMenu = useCallback(() => { setMenuOpen(false); }, []);
  const toggleMenu = useCallback(() => { setMenuOpen((open) => !open); }, []);
  const closeSurface = useCallback(() => { setOpenSurface(null); }, []);
  const closePopover = useCallback(() => { setPopover(null); }, []);
  const settleAction = useCallback(() => { setAction(null); }, []);

  const chooseFixed = useCallback((id: MenuFixedNode['id']) => {
    switch (id) {
      case DEVTOOLS_ABOUT_ID:
        setPopover({ kind: 'about' });
        return;

      case DEVTOOLS_SAVE_SETTINGS_ID:
        // Unreachable in this plan: the row is drawn only when the
        // status endpoint reports `persistence: true`, and this
        // plan's plugin always answers `false`.
        setAnnouncement(DEVTOOLS_SAVE_SETTINGS_DEFERRED);
        return;

      default: {
        // Exhaustive: `id` is `never` here while the model declares
        // two fixed rows, so a third reds `check-types` on this line
        // rather than becoming a row that does nothing when clicked.
        const unhandled: never = id;

        void unhandled;
      }
    }
  }, []);

  const chooseItem = useCallback((item: MenuItem) => {
    switch (item.mode) {
      case 'action':
        setAction(item);
        return;

      case 'popover':
        setPopover({ kind: 'item', itemId: item.id });
        return;

      // Both blocking modes write the ONE slot. That is the whole of
      // the invariant -- see this module's header.
      case 'modal':
        setOpenSurface({ itemId: item.id, mode: 'modal' });
        return;

      default:
        setOpenSurface({ itemId: item.id, mode: 'drawer' });
    }
  }, []);

  const changeDrawer = useCallback((itemId: string, open: boolean) => {
    // No guard on which drawer is asking: only a showing drawer draws
    // a control that collapses it, and an expanding one is claiming
    // the slot whatever was in it.
    setOpenSurface(open
      ? { itemId, mode: 'drawer' }
      : null);
  }, []);

  const openPublished = useCallback((payload: DevToolsOpenItemPayload) => {
    const item = resolveOpenItem(config.features, host, payload);

    if (item === null) {
      // The ONE thing said about any of the resolver's four refusals.
      setAnnouncement(DEVTOOLS_NOTHING_TO_OPEN);
      return;
    }

    // The same call the menu makes, so a published open and a clicked
    // row cannot drift apart -- see this module's header.
    chooseItem(item);
  }, [chooseItem, config.features, host]);

  // `subscribe` ANSWERS its disposer, so the effect's cleanup is the
  // unsubscribe with nothing in between to get wrong.
  useEffect(
    () => host.bus.subscribe('open-item', openPublished),
    [host.bus, openPublished],
  );

  const drawers = collectDrawerItems(nodes);
  const modalItem = openSurface?.mode === 'modal'
    ? findSurfaceItem(nodes, openSurface.itemId)
    : null;
  const popoverItem = popover?.kind === 'item'
    ? findSurfaceItem(nodes, popover.itemId)
    : null;

  return (
    <>
      <DevToolsTrigger
        ref={setTrigger}
        corner={corner}
        size={settings.size}
        open={menuOpen}
        onToggle={toggleMenu}
      />

      <DevToolsMenu
        open={menuOpen}
        nodes={nodes}
        anchor={trigger}
        corner={corner}
        onDismiss={closeMenu}
        onChooseCorner={setCorner}
        onChooseFixed={chooseFixed}
        onChooseItem={chooseItem}
      />

      {/* The two popovers are mutually exclusive by construction: one
          slot, and its two members. */}
      {popover?.kind === 'about'
        ? (
          <DevToolsPopover
            open
            anchor={trigger}
            corner={corner}
            label={DEVTOOLS_ABOUT_LABEL}
            onDismiss={closePopover}
          >
            <AboutPanel version={host.version} />
          </DevToolsPopover>
        )
        : null}

      {popoverItem === null
        ? null
        : (
          <DevToolsPopover
            open
            anchor={trigger}
            corner={corner}
            label={popoverItem.label}
            onDismiss={closePopover}
          >
            {popoverItem.render({ close: closePopover, host })}
          </DevToolsPopover>
        )}

      {modalItem === null
        ? null
        : (
          <DevToolsModal
            open
            label={modalItem.label}
            onDismiss={closeSurface}
          >
            {modalItem.render({ close: closeSurface, host })}
          </DevToolsModal>
        )}

      {drawers.map((item) => {
        const open = openSurface?.mode === 'drawer'
          && openSurface.itemId === item.id;

        return (
          <DevToolsDrawer
            key={item.id}
            itemId={item.id}
            label={item.label}
            open={open}
            placement={item.placement}
            handle={item.handle}
            onOpenChange={(next) => { changeDrawer(item.id, next); }}
          >
            {open
              ? item.render({ close: closeSurface, host })
              : null}
          </DevToolsDrawer>
        );
      })}

      {action === null
        ? null
        : (
          <DevToolsActionItem
            item={action}
            host={host}
            anchor={trigger}
            corner={corner}
            onStatus={setAnnouncement}
            onSettled={settleAction}
          />
        )}

      {/* Present from mount, empty until something speaks. */}
      <p className="devtools-status" role="status">{announcement}</p>
    </>
  );
}
