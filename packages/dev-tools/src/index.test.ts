import type { DevToolsMountDecision } from './index';

import { describe, expect, it } from 'vitest';

import * as barrel from './index';
import { isDevToolsAutomated, isDevToolsForced, shouldMountDevTools } from './index';

/**
 * ## What this file pins
 *
 * The barrel's own reading: that each name it promises is REACHABLE
 * through `./index` and that nothing else is. Every decision behind
 * those names is pinned by the module that owns it — this file never
 * re-proves `mountDevTools`'s refusals or the bus's ring, it proves
 * the export list.
 *
 * `DevToolsMountDecision` is a type and erases, so it cannot be read
 * off the namespace object. It is imported at the top of this file
 * instead and USED in the accepting case below: a barrel that stopped
 * exporting it would red `check-types` rather than this file, which
 * is the only reading a type can have.
 *
 * The three names the host app's dev-only bridge needs —
 * `isDevToolsAutomated`, `isDevToolsForced` and `installGlobalCapture`
 * — are read here as PRESENT and callable and no further: what each
 * one answers is pinned by `./core/mount.test.ts` and
 * `./core/globalCapture.test.ts`, and re-proving it from the barrel
 * would be the same reading taken twice. `installGlobalCapture` is
 * read as a function without being CALLED, because calling it adds
 * two listeners to this project's shared jsdom `window` that no
 * disposer in this file would be honest about owning.
 */
describe('the browser barrel', () => {
  it('exports nothing beyond the six values it names', () => {
    const names = Object.keys(barrel).sort();

    expect(names).toEqual([
      'devtoolsBus',
      'installGlobalCapture',
      'isDevToolsAutomated',
      'isDevToolsForced',
      'mountDevTools',
      'shouldMountDevTools',
    ]);
  });

  it('exports shouldMountDevTools as a callable decision', () => {
    const decision: DevToolsMountDecision = {
      config: { features: [] },
      automated: true,
      forced: false,
    };

    expect(typeof barrel.shouldMountDevTools).toBe('function');
    expect(shouldMountDevTools(decision)).toBe(false);
  });

  it('exports the two environment readings that decision is taken over', () => {
    // The app takes the same decision before installing its bridge,
    // and it must take it over THESE two readings rather than over a
    // second reading of its own — see the barrel's own header.
    // jsdom sets no `navigator.webdriver` and this package's build
    // went through no app pipeline, so both answer false here, which
    // is what says they were really called.
    expect(isDevToolsAutomated()).toBe(false);
    expect(isDevToolsForced()).toBe(false);
  });

  it('exports the window capture the bridge installs', () => {
    // Read, never called: the listeners it installs belong to a
    // disposer the caller holds, and this file holds none.
    expect(typeof barrel.installGlobalCapture).toBe('function');
  });
});
