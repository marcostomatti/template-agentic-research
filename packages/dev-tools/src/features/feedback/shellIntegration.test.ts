import type { DevToolsGlobalErrorPayload } from '../../core/globalCapture';
import type { DevToolsConfig } from '../../core/types';
import type { Root } from 'react-dom/client';

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

import { devtoolsBus } from '../../core/bus';
import { installGlobalCapture } from '../../core/globalCapture';
import { buildDevToolsHost } from '../../core/host';
import { DevToolsShell } from '../../core/Shell';
import { DEVTOOLS_NOTHING_TO_OPEN } from '../../core/shellRules';

import { collectFeedbackContext } from './context';

import {
  FEEDBACK_FEATURE_ID,
  FEEDBACK_ITEM_ID,
  FEEDBACK_ITEM_LABEL,
  feedbackFeature,
} from './index';

/**
 * @packageDocumentation
 * Integration cases over the ASSEMBLED shell, proving two package-half
 * seams end to end rather than through the isolated modules each
 * already pins on its own:
 *
 * - A window `error` reaching `installGlobalCapture()`'s listener,
 *   landing on the shared `devtoolsBus` ring, and then showing up in
 *   `collectFeedbackContext()`'s own reading of that same ring.
 * - An `open-item` publish resolving through `./openItem.ts` inside
 *   `./Shell.tsx`'s own subscription, opening the feedback feature's
 *   drawer item the same way a menu click would; and a publish naming
 *   an item no feature holds instead announcing "Nothing to open" and
 *   opening nothing.
 *
 * Every piece is already pinned on its own: `globalCapture.test.ts`
 * proves the listener, `bus.test.ts` the ring, `context.test.ts` the
 * context read, `openItem.test.ts` the resolver, and `mount.test.ts`
 * puts a real React root on jsdom for the first time in this package.
 * What none of those proves is that the pieces are actually WIRED to
 * each other inside a mounted shell, which is what this file adds:
 * `react-dom/client`, over jsdom, mirroring `mount.test.ts`'s own
 * precedent rather than a DOM-testing library.
 *
 * ## Why this file lives under `src/features/feedback/`
 *
 * It imports `feedbackFeature`, and the core layer's eslint rule
 * refuses `**` + `/features/**` — a feature may import the core, never the
 * reverse. `src/core/shellIntegration.test.ts` would not lint.
 *
 * ## Why both scenarios reach the SAME singleton
 *
 * `./Shell.tsx` builds its host with no `bus` member, so it always
 * resolves to the `devtoolsBus` singleton — never a bus a case built
 * for itself. Both scenarios below publish on and read from that same
 * singleton, exactly as `./Shell.tsx`'s own header records its
 * `react-dom/client` probe having done. Because it is a singleton,
 * every case here shares its ring with every other case in this file;
 * `recent('error', 1)` is read rather than a length, so an earlier
 * case's own payload cannot be mistaken for this one's.
 *
 * ## Why this is not a test of interaction
 *
 * Per this package's two-runner discipline, nothing below clicks,
 * types or drags: it dispatches a platform `error` event and publishes
 * on the bus, then reads the state and the markup that follow from an
 * effect subscription already wired by `./Shell.tsx`. A click, a
 * keystroke or a drag is the forced Playwright spec's.
 *
 * ## The drawer's own network reads are left to fail, on purpose
 *
 * Opening the feedback item below runs `./FeedbackDrawer.tsx`'s mount
 * effect, which calls `host.fetch` for the template list and the repo
 * slug. Neither is stubbed: `./Shell.tsx` builds its host with the
 * platform `fetch`, exactly as `mountDevTools` does, and `mount.test.ts`
 * already establishes the pattern of letting that reach the real
 * global `fetch` in jsdom rather than injecting one. A relative URL
 * rejects there before any socket opens (measured, `node -e
 * "fetch('/__devtools/templates').catch(e => console.log(e.message))"`
 * answers `Failed to parse URL from /__devtools/templates`
 * synchronously), and `./drawerData.ts`'s own `readJson` catches every
 * rejection, so the form still renders — with no template chosen,
 * which this file does not assert on.
 */

/**
 * Tells `act()` it is safe to batch updates for this file.
 *
 * Unset by default under this package's `vitest.config.ts` -- there is
 * no setup file naming it, and neither `mount.test.ts` nor any other
 * case in this package calls `act()` at all. Without it every call
 * below still runs the render and the state updates it wraps, but
 * React prints `The current testing environment is not configured to
 * support act(...)` to `stderr` for each one (measured). Scoped to
 * this file rather than to a package-wide setup file, since it is the
 * one case in this package that needs it. Written onto `window` rather
 * than `globalThis` -- this package's eslint globals do not list the
 * latter, and under jsdom the two are the same object.
 */
(window as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Every root this file mounted, unwound after each case. */
const mountedRoots: { readonly root: Root; readonly container: HTMLElement }[] = [];

/** Every disposer a case installed, taken down after it. */
const installedDisposers: (() => void)[] = [];

afterEach(async () => {
  while (installedDisposers.length > 0) {
    installedDisposers.pop()?.();
  }

  while (mountedRoots.length > 0) {
    const mounted = mountedRoots.pop();

    if (mounted === undefined) {
      continue;
    }

    // Unmounting runs `./Shell.tsx`'s effect cleanup, which unsubscribes
    // from `open-item` — leaving it mounted would carry one case's
    // subscriber into the next case's publish.
     
    await act(async () => {
      mounted.root.unmount();
    });

    mounted.container.remove();
  }
});

/**
 * Mount `DevToolsShell` into a fresh, tracked, detached container.
 *
 * Rendered directly with `react-dom/client` rather than through
 * `mountDevTools`: that function takes its own automation and
 * empty-feature decisions before anything is drawn, and neither
 * matters here — `./Shell.tsx`'s own header records taking the same
 * shortcut for its own probe, for the same reason.
 *
 * @param config - What to hand the shell.
 * @returns The detached container the shell was rendered into.
 */
async function mountShell(config: DevToolsConfig): Promise<HTMLElement> {
  const container = document.createElement('div');

  document.body.append(container);

  const root = createRoot(container);

  await act(async () => {
    root.render(createElement(DevToolsShell, { config }));
  });

  mountedRoots.push({ root, container });

  return container;
}

/**
 * Install the global capture, tracked for teardown.
 *
 * @returns The disposer. Every case below lets `afterEach` call it.
 */
function installCapture(): () => void {
  const dispose = installGlobalCapture();

  installedDisposers.push(dispose);

  return dispose;
}

describe('a captured window error reaches the ring and then the feedback context', () => {
  it('publishes onto the shared bus, and collectFeedbackContext reads it back', async () => {
    const config: DevToolsConfig = { features: [feedbackFeature()] };

    // The shell is mounted first, so the reading is of a real running
    // widget rather than of the bus in isolation -- the same singleton
    // its own feedback feature's host would reach too.
    await mountShell(config);
    installCapture();

    await act(async () => {
      window.dispatchEvent(new ErrorEvent('error', {
        message: 'Uncaught Error: shell integration boom',
        error: new Error('shell integration boom'),
      }));
    });

    const ring = devtoolsBus.recent('error', 1) as readonly DevToolsGlobalErrorPayload[];

    expect(ring).toHaveLength(1);
    expect(ring[0]?.message).toBe('shell integration boom');

    // The same host shape `./Shell.tsx` builds for a feature: no `bus`
    // member, so `buildDevToolsHost` resolves the identical singleton
    // the capture above just published on.
    const host = buildDevToolsHost({ config, status: null, api: null });
    const context = collectFeedbackContext(host);

    // Not `Error`-typed at the point `collectFeedbackContext` meets it
    // -- `./globalCapture.ts` already flattened it to four primitives --
    // so `summariseBusPayload` reads it through its JSON branch rather
    // than its `Error` one; the message still survives inside it.
    expect(typeof context.error).toBe('string');
    expect(context.error).toContain('shell integration boom');
  });
});

describe('an open-item publish over the assembled shell', () => {
  it('answers "Nothing to open" and opens nothing for an item id no feature holds', async () => {
    const container = await mountShell({ features: [feedbackFeature()] });

    await act(async () => {
      devtoolsBus.publish('open-item', {
        featureId: FEEDBACK_FEATURE_ID,
        itemId: 'no-such-item',
      });
    });

    const region = container.querySelector('[role="status"]');

    expect(region?.textContent).toBe(DEVTOOLS_NOTHING_TO_OPEN);
    expect(container.querySelector('.devtools-drawer')).toBeNull();
  });

  it('opens the feedback drawer item, the same way a menu click would', async () => {
    const container = await mountShell({ features: [feedbackFeature()] });

    await act(async () => {
      devtoolsBus.publish('open-item', {
        featureId: FEEDBACK_FEATURE_ID,
        itemId: FEEDBACK_ITEM_ID,
      });

      // Gives the drawer's own rejected `fetch` calls a turn to settle
      // inside this `act` scope rather than after it -- see this file's
      // header on why neither read is stubbed.
      await Promise.resolve();
      await Promise.resolve();
    });

    const drawer = container.querySelector('.devtools-drawer');

    expect(drawer).not.toBeNull();
    expect(drawer?.getAttribute('aria-label')).toBe(FEEDBACK_ITEM_LABEL);
    expect(drawer?.querySelector('form.devtools-feedback')).not.toBeNull();

    // Deliberately not asserted here: the previous case's region text.
    // `./Shell.tsx`'s own header records that a resolved publish does
    // not clear the live region, and this file's cases share the same
    // singleton bus but each mount its own shell -- a fresh
    // `announcement` state -- so there is nothing stale to read in
    // THIS container.
  });
});
