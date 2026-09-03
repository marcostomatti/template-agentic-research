import type { Locator, Page } from '@playwright/test';

import { expect, test } from '@playwright/test';

import { fetchSources } from '../../src/data/api';
import { DEFAULT_DOMAIN_SLUG } from '../../src/data/domains';
import { FIXTURE_NOW } from '../../src/data/types';
import { isRunLive, LIVE_RUN_LABEL } from '../../src/pages/sources/rows';
import {
  SINGLE_DOMAIN_BASE,
  SURFACES,
  withBase,
} from '../../src/routes/paths';

// What this app does when the operator has asked for less motion, read
// as GEOMETRY rather than as a class name: a suppressed animation is
// one whose element stops moving, and where it stops is a measurement
// a stylesheet cannot fake.
//
// ## The motion inventory, measured rather than assumed
//
// On a SETTLED page there is exactly one running animation in the whole
// app, and this file found it by walking every element on the sources
// surface and reading `getComputedStyle(el).animationName`: two
// `pulseRing` dots, and nothing else anywhere. The rest of what
// `@ar/ui` can animate is either absent here or gone by the time a page
// settles. `Skeleton`'s shimmer runs only while a read is in flight,
// which is what {@link SKELETON} waits out. `Progress` animates only in
// its indeterminate form, and the one progressbar this shell renders is
// determinate (measured: zero `animate-indeterminate` elements).
//
// The other half of the app's motion is TRANSITIONS, and the one worth
// driving is inside a modal: `Switch`'s knob is `transition-[left]
// duration-150`, so a toggle slides it 16px over about nine frames with
// motion allowed. That is what the modal cases below flip.
//
// ## The option is spelled `contextOptions`, and the obvious spelling
// ## silently does nothing
//
// The documented `test.use({ reducedMotion: 'reduce' })` is GONE from
// the pinned Playwright and its two failure modes are worth writing
// down, because one of them is silent. At 1.62.1 the flat option is not
// in `PlaywrightTestOptions` at all — `check-types` answers TS2353,
// `'reducedMotion' does not exist in type 'Fixtures<...>'`, and the
// bundled runner carries zero occurrences of that string in its whole
// `lib` tree against seven of `colorScheme`. But a test that
// DESTRUCTURES it is still handed `'reduce'` while the browser context
// is never told, so a file that suppressed the type error would run
// every case below in the default state and pass.
//
// `contextOptions` is the form the runner's own type declarations
// recommend and the one that works: measured, the media query flips and
// the pulse stops. It is declared per describe block below.
//
// Neither is trusted. {@link expectMotionState} asserts the media query
// itself in every case's Arrange, so a case can never pass having never
// entered the state it is about — which is precisely what the flat
// option would have produced.
//
// ## Every claim carries its control
//
// "Nothing moved" is the shape that passes against an element that
// never rendered, a variant that stopped being passed and a fixture
// with no live row. The controls that close it are here rather than in
// a reader's head. Each reduced-motion case measures its own resting
// geometry in its Arrange and asserts that figure is non-zero and that
// its subject really is in motion's way; and the second describe block
// re-runs the same readings with motion ALLOWED, where every one of
// them has to come back the other way round.
//
// ## The resting width is measured, not imported
//
// The dot is `size-2` in `@ar/ui` and therefore 8px, and this file
// spells neither figure. The Arrange reads the width the UNPULSED
// siblings draw in the same table column, cross-checked against the
// pulsing dot's own `offsetWidth` — the layout box, which a transform
// does not move. Two independent readings of one figure, both taken in
// the browser this run, so a token changing in another package moves
// the expectation with it instead of falsifying a literal here.
//
// ## What this file deliberately does not claim
//
// That the modal FRAME reduces its entrance. `@ar/ui`'s `Overlay`
// ships no enter/exit transition at all — its variants file says so
// ("Enter/exit transitions are deferred with the rest of the motion
// pass") and the panel measured `animation-name: none` with and
// without the preference. So {@link MODAL_FRAME_CASE} is a REGRESSION
// GUARD with no discriminating control: it pins that the panel is
// settled from the frame the dialog becomes visible, and it is what
// reds the day an unreduced entrance lands. The gap is stated rather
// than papered over.
//
// That reduced motion is enough. Motion is not in the accessibility
// tree at all, which is why the sources surface LABELS the dots it
// pulses; `a11y.spec.ts` and `keyboard.spec.ts` own that half.

/**
 * The class `@ar/ui`'s `Skeleton` renders its shimmer with.
 *
 * The settled-state handle for the whole app, as `a11y.spec.ts` uses
 * it. It matters twice here: a page still loading has stand-ins whose
 * geometry moves for reasons that are not the subject, and the shimmer
 * IS an animation, so a reading taken mid-load would report one this
 * file is not about. The class token is in the DOM either way —
 * reduced motion suppresses the animation, not the attribute.
 */
const SKELETON = '.animate-shimmer';

/** The surface whose rows carry the app's only running animation. */
const SOURCES_SURFACE_ID = 'sources';

/**
 * The segment the source editor sits at under a source id.
 *
 * Spelled rather than imported for the reason `sources.spec.ts` gives:
 * `routes/router.tsx` builds the pattern and is a `.tsx` no spec may
 * load, and the router's own unit suite is what holds them in step.
 */
const EDIT_SEGMENT = 'edit';

/**
 * The accessible name of the source editor's first switch.
 *
 * `SourceEditorModal.tsx` keeps its label constants private — a `.tsx`
 * in this package may export components and types and nothing else —
 * so this is the literal, named once beside the control it addresses.
 */
const ENABLED_SWITCH_NAME = 'Enabled';

/** The title of the case the file header calls out as controlless. */
const MODAL_FRAME_CASE = 'the modal frame is settled from the frame it '
  + 'becomes visible';

/**
 * How many frames one geometry window samples.
 *
 * Fifteen at 60Hz is a quarter of a second: long enough that the 150ms
 * knob transition finishes inside one window and that the 2s pulse
 * grows well past {@link MOTION_EPSILON}, and short enough that a
 * polled assertion re-takes it several times inside a test timeout.
 * Measured with motion allowed: the pulse spans 8.12px to 8.61px
 * across one window, and the knob paints thirteen distinct positions.
 */
const SAMPLE_FRAMES = 15;

/**
 * How far a box may drift and still count as still, in CSS pixels.
 *
 * Sub-pixel layout noise is real, and an exact float comparison over
 * two independently measured boxes is not worth the flake. A hundredth
 * of a pixel is far below one frame of either subject's motion — the
 * pulse grows about 0.03px per frame and the knob moves about 1.8px —
 * so nothing this file looks for can hide under it.
 */
const MOTION_EPSILON = 0.01;

/** The list path of the surface the pulsing dots are on. */
const SOURCES_PATH = withBase(SINGLE_DOMAIN_BASE, SOURCES_SURFACE_ID);

/** Wait out every loading stand-in on the page. See {@link SKELETON}. */
async function expectSettled(page: Page): Promise<void> {
  await expect(page.locator(SKELETON)).toHaveCount(0);
}

/**
 * Prove the page really is in the motion state the block declares.
 *
 * Not decoration: it is the one reading that separates a case about
 * reduced motion from a case that quietly ran in the default state,
 * and the file header measures exactly how easy that is to get. Every
 * case calls it before it measures anything.
 *
 * @param page - The page a case is about to drive.
 * @param reduce - Whether the block asked for less motion.
 */
async function expectMotionState(page: Page, reduce: boolean): Promise<void> {
  const matches = await page.evaluate(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  expect(
    matches,
    'the page is not in the motion state this case is about.',
  ).toBe(reduce);
}

/**
 * One element's rendered box width, sampled across animation frames.
 *
 * `getBoundingClientRect` rather than `offsetWidth` on purpose: the
 * rect is the TRANSFORMED box, so a `scale()` keyframe moves it and a
 * suppressed one does not. That difference is the whole reading.
 *
 * @param target - The element to watch.
 * @param frames - How many frames to sample over.
 * @returns One width per frame, in the order they were painted.
 */
async function sampleWidths(
  target: Locator,
  frames: number,
): Promise<readonly number[]> {
  return target.evaluate(async (element, count) => {
    const widths: number[] = [];

    for (let index = 0; index < count; index += 1) {
      await new Promise((resolve) => {
        requestAnimationFrame(() => resolve(null));
      });
      widths.push(element.getBoundingClientRect().width);
    }

    return widths;
  }, frames);
}

/** How far the furthest sample sits from a reference figure. */
function widestDeviation(
  samples: readonly number[],
  reference: number,
): number {
  return samples.reduce(
    (worst, sample) => Math.max(worst, Math.abs(sample - reference)),
    0,
  );
}

/** What an Arrange measured off the sources table's status column. */
interface DotGeometry {
  /** The dot this surface pulses. */
  readonly dot: Locator;
  /** The width an unpulsed dot in the same column draws. */
  readonly resting: number;
}

/**
 * The dot the sources table pulses, and the width its siblings rest at.
 *
 * The live dots are the only `role="status"` elements on this surface
 * (measured two, against seven dots): `CellStatus` names a dot from
 * `label` alone wherever a `text` renders, and `SourcesPage` passes one
 * only on the rows it reads as running. The resting figure comes from
 * the OTHER rows' dots in the same column, reached through the live
 * dot's own cell index so nothing here counts columns.
 *
 * @param page - A settled sources surface.
 * @returns The pulsing dot and the width an unpulsed one draws.
 */
async function readDotGeometry(page: Page): Promise<DotGeometry> {
  const dot = page.getByRole('status', { name: LIVE_RUN_LABEL }).first();

  await expect(dot).toBeVisible();

  const measured = await dot.evaluate((element) => {
    const cell = element.closest('td');
    const index = cell === null
      ? -1
      : cell.cellIndex;
    const widths: number[] = [];

    for (const row of Array.from(
      document.querySelectorAll('main table tbody tr'),
    )) {
      const sibling = row.children[index];
      const other = sibling?.querySelector('span > span:first-child');

      if (!(other instanceof HTMLElement)) {
        continue;
      }

      if (other.getAttribute('role') === 'status') {
        continue;
      }

      widths.push(other.getBoundingClientRect().width);
    }

    return {
      layout: element instanceof HTMLElement
        ? element.offsetWidth
        : 0,
      widths,
    };
  });

  const [first] = measured.widths;

  // Both halves of this Arrange are assertions rather than reads. A
  // table with no unpulsed row leaves nothing to compare against, and
  // a zero width would satisfy every claim below trivially — an
  // element that never rendered measures zero and holds it perfectly.
  expect(
    first,
    'no unpulsed dot in this table to measure a resting width from.',
  ).not.toBeUndefined();

  const resting = first ?? 0;

  expect(resting).toBeGreaterThan(0);

  // The second, independent reading of the same figure. `offsetWidth`
  // is the LAYOUT box, which a transform does not move, so the pulsing
  // dot answers its own resting width even mid-animation. The two
  // agreeing is what says the expectation is not a property of
  // whichever element it happened to be taken from.
  expect(
    measured.layout,
    'the pulsing dot and its unpulsed siblings draw different boxes.',
  ).toBeCloseTo(resting, 1);

  // Every unpulsed dot in the column, not just the first: one sibling
  // agreeing is satisfied by a table drawing several sizes.
  for (const width of measured.widths) {
    expect(width).toBeCloseTo(resting, 2);
  }

  return { dot, resting };
}

/** The id of a source this surface draws as running. */
async function liveSourceId(): Promise<number> {
  const sources = await fetchSources(DEFAULT_DOMAIN_SLUG);
  const [live] = sources.filter((source) => isRunLive(source, FIXTURE_NOW));

  // `pages/sources/rows.test.ts` pins that the shipped rows fall on
  // both sides of the live-run window, so this is a fixture property
  // rather than a hope — but a spec that silently built a path ending
  // in `undefined` would drive the not-found page and red somewhere
  // that does not name the cause.
  expect(live, 'no source in the fixtures reads as running.').toBeDefined();

  return live?.id ?? -1;
}

/** What an Arrange opened, for a case that drives the editor. */
interface OpenEditor {
  /** The dialog itself. */
  readonly dialog: Locator;
  /** Its first switch, whose knob carries the transition. */
  readonly toggle: Locator;
}

/**
 * Open the source editor over a row and hand back its first switch.
 *
 * @param page - A fresh page in a declared motion state.
 * @returns The dialog and the switch inside it.
 */
async function openSourceEditor(page: Page): Promise<OpenEditor> {
  const id = await liveSourceId();

  await page.goto(`${SOURCES_PATH}/${String(id)}/${EDIT_SEGMENT}`);

  const dialog = page.getByRole('dialog');

  // What separates an editor that opened from a route whose read
  // refused: the list behind it renders perfectly well either way, and
  // every geometry reading below would then be about the wrong tree.
  await expect(dialog).toBeVisible();
  await expectSettled(page);

  const toggle = dialog.getByRole('switch', { name: ENABLED_SWITCH_NAME });

  await expect(toggle).toBeVisible();

  return { dialog, toggle };
}

/**
 * Flip a switch and sample where its knob was painted, frame by frame.
 *
 * The click and the sampling share one browser task on purpose: the
 * transition is 150ms with motion allowed, so a round trip between the
 * two would be most of it.
 *
 * `Switch` renders exactly one element child and that child is the
 * knob, which is what makes `firstElementChild` a reading of the
 * shipped component rather than a class-name guess. The throws are
 * deliberate: neither absence may arrive as a silent zero, which every
 * geometry claim below would satisfy.
 *
 * @param toggle - The switch to flip.
 * @param frames - How many frames to sample after the click.
 * @returns The knob's left edge before the click, then once per frame.
 */
async function toggleAndTrackKnob(
  toggle: Locator,
  frames: number,
): Promise<readonly number[]> {
  return toggle.evaluate(async (element, count) => {
    const knob = element.firstElementChild;

    if (!(element instanceof HTMLElement)) {
      throw new Error('the switch is not an HTML element.');
    }

    if (!(knob instanceof HTMLElement)) {
      throw new Error('the switch renders no knob to track.');
    }

    const positions: number[] = [knob.getBoundingClientRect().x];

    element.click();

    for (let index = 0; index < count; index += 1) {
      await new Promise((resolve) => {
        requestAnimationFrame(() => resolve(null));
      });
      positions.push(knob.getBoundingClientRect().x);
    }

    return positions;
  }, frames);
}

/**
 * The knob's left edge, sampled across frames with nothing driving it.
 *
 * @param toggle - The switch whose knob to watch.
 * @param frames - How many frames to sample over.
 * @returns One position per frame.
 */
async function sampleKnobPositions(
  toggle: Locator,
  frames: number,
): Promise<readonly number[]> {
  return toggle.evaluate(async (element, count) => {
    const knob = element.firstElementChild;

    if (!(knob instanceof HTMLElement)) {
      throw new Error('the switch renders no knob to track.');
    }

    const positions: number[] = [];

    for (let index = 0; index < count; index += 1) {
      await new Promise((resolve) => {
        requestAnimationFrame(() => resolve(null));
      });
      positions.push(knob.getBoundingClientRect().x);
    }

    return positions;
  }, frames);
}

/** Where a knob started, where it ended, and what was painted between. */
interface KnobTrack {
  /** Its left edge before the click. */
  readonly from: number;
  /** Its left edge on the last frame sampled. */
  readonly to: number;
  /** Every sample at neither endpoint. */
  readonly between: readonly number[];
}

/**
 * Split a sampled knob track into its endpoints and its middle.
 *
 * @param track - What {@link toggleAndTrackKnob} answered.
 * @returns The two endpoints and the intermediate positions.
 */
function readTrack(track: readonly number[]): KnobTrack {
  const from = track[0] ?? 0;
  const to = track[track.length - 1] ?? 0;
  const between = track.filter(
    (position) => Math.abs(position - from) > MOTION_EPSILON
      && Math.abs(position - to) > MOTION_EPSILON,
  );

  return { from, to, between };
}

/** Every element currently running an animation, named by keyframe. */
async function runningAnimations(page: Page): Promise<readonly string[]> {
  return page.evaluate(() => Array.from(document.querySelectorAll('*'))
    .map((node) => getComputedStyle(node).animationName)
    .filter((name) => name !== 'none'));
}

test.describe('under reduced motion', () => {
  // `contextOptions`, not the flat `reducedMotion` option: the file
  // header measures why the obvious spelling is both a type error and,
  // where that error is suppressed, a silent no-op.
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('the live-run dot holds the width its unpulsed siblings draw', async ({
    page,
  }) => {
    await page.goto(SOURCES_PATH);
    await expectMotionState(page, true);
    await expectSettled(page);

    const { dot, resting } = await readDotGeometry(page);

    // Polled rather than read once: the surface can still be settling
    // when the skeletons go, and each attempt re-takes a whole WINDOW
    // rather than re-reading one instant. An animating dot cannot pass
    // it — `pulseRing` grows continuously, so the widest sample in any
    // window sits well past the epsilon.
    await expect
      .poll(
        async () => widestDeviation(
          await sampleWidths(dot, SAMPLE_FRAMES),
          resting,
        ),
        {
          message: `the pulsing dot left its resting ${
            String(resting)}px box.`,
        },
      )
      .toBeLessThanOrEqual(MOTION_EPSILON);
  });

  for (const surface of SURFACES) {
    test(`nothing on the ${surface.id} surface is animating`, async ({
      page,
    }) => {
      await page.goto(withBase(SINGLE_DOMAIN_BASE, surface.id));
      await expectMotionState(page, true);
      await expectSettled(page);

      // The sweep the geometry case cannot make: every element, not
      // just the one this file knows the name of. It is a zero-hit
      // scan on five of these six addresses, and its liveness control
      // is the sources case in the second describe block, where this
      // same reading has a subject and must answer it by name.
      expect(await runningAnimations(page)).toEqual([]);
    });
  }

  test('the editor switch paints no intermediate knob position', async ({
    page,
  }) => {
    const { toggle } = await openSourceEditor(page);

    await expectMotionState(page, true);

    const { from, to, between } = readTrack(
      await toggleAndTrackKnob(toggle, SAMPLE_FRAMES),
    );

    // Non-vacuity, and the whole reason this reads as a SUPPRESSED
    // transition rather than as a control that does nothing: the knob
    // has to have moved for 'it painted no intermediate position' to
    // say anything at all.
    expect(
      Math.abs(to - from),
      'the knob did not move, so there was no transition to reduce.',
    ).toBeGreaterThan(MOTION_EPSILON);

    expect(
      between,
      'the knob was painted part-way, so the transition still ran.',
    ).toEqual([]);

    // And it stays put. A fresh window with no spread is the 'settle'
    // half of the claim, taken through a polled assertion so a late
    // frame cannot be missed.
    await expect
      .poll(
        async () => widestDeviation(
          await sampleKnobPositions(toggle, SAMPLE_FRAMES),
          to,
        ),
        { message: 'the knob was still moving after the transition.' },
      )
      .toBeLessThanOrEqual(MOTION_EPSILON);
  });

  test(MODAL_FRAME_CASE, async ({ page }) => {
    const { dialog } = await openSourceEditor(page);

    await expectMotionState(page, true);

    const panel = dialog.locator('div').first();
    const opened = await panel.evaluate(
      (element) => element.getBoundingClientRect().width,
    );

    // The guard the file header calls out as controlless: `Overlay`
    // ships no enter/exit transition today, so this passes with motion
    // allowed as well. It is here to red the day one lands unreduced.
    expect(
      opened,
      'the modal panel drew no box, so there is nothing to watch.',
    ).toBeGreaterThan(0);

    await expect
      .poll(
        async () => widestDeviation(
          await sampleWidths(panel, SAMPLE_FRAMES),
          opened,
        ),
        { message: 'the modal panel was still moving after it opened.' },
      )
      .toBeLessThanOrEqual(MOTION_EPSILON);
  });
});

test.describe('with motion allowed, the control', () => {
  // Stated rather than inherited. The default happens to be
  // no-preference, but a case whose whole job is to come back the
  // other way round should not rest on a default the config could
  // change without this file noticing.
  test.use({ contextOptions: { reducedMotion: 'no-preference' } });

  test('the live-run dot really does animate its own geometry', async ({
    page,
  }) => {
    await page.goto(SOURCES_PATH);
    await expectMotionState(page, false);
    await expectSettled(page);

    const { dot, resting } = await readDotGeometry(page);

    // Without this the reduced case is satisfied by a dot that never
    // pulsed: a fixture with no running row, a variant that stopped
    // being passed, a keyframe that was dropped. Here the SAME locator
    // and the SAME reading have to come back the other way round.
    expect(
      widestDeviation(await sampleWidths(dot, SAMPLE_FRAMES), resting),
      'the dot did not move with motion allowed, so it never pulses.',
    ).toBeGreaterThan(MOTION_EPSILON);
  });

  test('the sources surface really does run an animation', async ({
    page,
  }) => {
    await page.goto(SOURCES_PATH);
    await expectMotionState(page, false);
    await expectSettled(page);

    // The liveness control for the six-surface sweep above, which is a
    // zero-hit scan at every other address. This is the one place the
    // same reading has a subject, and it names the KEYFRAME rather
    // than counting — a sweep looking at the wrong property answers an
    // empty list here too, and only a named answer says otherwise.
    const running = await runningAnimations(page);

    expect(running.length).toBeGreaterThan(0);
    expect(new Set(running)).toEqual(new Set(['pulseRing']));
  });

  test('the editor switch really does slide its knob', async ({ page }) => {
    const { toggle } = await openSourceEditor(page);

    await expectMotionState(page, false);

    const { from, to, between } = readTrack(
      await toggleAndTrackKnob(toggle, SAMPLE_FRAMES),
    );

    expect(Math.abs(to - from)).toBeGreaterThan(MOTION_EPSILON);

    // The half that makes the reduced case a reading rather than a
    // restatement of the fixture: with motion allowed the knob IS
    // painted part-way, several times over.
    expect(
      between.length,
      'the knob jumped straight to its destination, so the reduced '
        + 'case above is measuring nothing.',
    ).toBeGreaterThan(0);
  });
});
