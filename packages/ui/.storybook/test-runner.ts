import { waitForPageReady, type TestRunnerConfig } from '@storybook/test-runner';
import { toMatchImageSnapshot } from 'jest-image-snapshot';

/**
 * Visual regression layer — one PNG per story × theme, diffed against the
 * baselines of THIS environment (baselines are untracked and never cross
 * machines; CI keeps its own set via actions/cache). See
 * the visual suite docs in AGENTS.md for context.
 *
 * Themes are applied exactly the way .storybook/preview.ts applies them:
 * data-theme on the document element. Tokens are pure CSS vars keyed off
 * [data-theme], so toggling the attribute re-themes the render.
 */
const THEMES = ['light', 'dark'] as const;

const customSnapshotsDir = `${process.cwd()}/visual/__image_snapshots__`;
const customDiffDir = `${process.cwd()}/visual/__diff_output__`;

// jest-image-snapshot augments the Jest matchers; expect is a Jest global
// inside the test-runner process. The shim avoids pulling Jest's global
// types into the project tsconfig.
declare const expect: {
  extend: (matchers: Record<string, unknown>) => void;
  (received: unknown): {
    toMatchImageSnapshot: (options: Record<string, unknown>) => void;
  };
};

const config: TestRunnerConfig = {
  setup() {
    expect.extend({ toMatchImageSnapshot });
  },
  async postVisit(page, context) {
    // Async-loaded glyphs (atoms/Icon: per-name React.lazy chunks) mark
    // their stand-ins with data-glyph-pending. Wait until every pending
    // glyph has committed before capturing either theme — otherwise the
    // screenshot races the lazy commit and the baselines flake. The cheap
    // evaluate guard keeps glyph-less stories on their original capture
    // timing (waitForSelector costs a frame even when nothing matches,
    // which was enough to shift the timer-driven Toast demos). A timeout
    // on the wait is a real failure (a chunk never loaded), so let it
    // throw.
    const hasPendingGlyphs = await page.evaluate(() => document.querySelector('[data-glyph-pending]') != null);
    if (hasPendingGlyphs) {
      await page.waitForSelector('[data-glyph-pending]', {
        state: 'detached',
        timeout: 15_000,
      });
    }
    for (const theme of THEMES) {
      await page.evaluate((t) => {
        document.documentElement.setAttribute('data-theme', t);
      }, theme);

      // Deterministic settle: network idle, fonts loaded, animations off.
      await waitForPageReady(page);
      await page.evaluate(() => document.fonts.ready);

      const image = await page.screenshot({ animations: 'disabled' });

      expect(image).toMatchImageSnapshot({
        customSnapshotsDir,
        customDiffDir,
        customSnapshotIdentifier: `${context.id}--${theme}`,
        // Near-exact: epsilon is an anti-aliasing safety valve, not a tolerance.
        failureThreshold: 0.0001,
        failureThresholdType: 'percent',
      });
    }
  },
};

export default config;
