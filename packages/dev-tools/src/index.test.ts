import type { DevToolsMountDecision } from './index';

import { describe, expect, it } from 'vitest';

import * as barrel from './index';
import { shouldMountDevTools } from './index';

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
 */
describe('the browser barrel', () => {
  it('exports nothing beyond the three values it names', () => {
    const names = Object.keys(barrel).sort();

    expect(names).toEqual([
      'devtoolsBus',
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
});
