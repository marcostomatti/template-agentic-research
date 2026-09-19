/**
 * @packageDocumentation
 * The tomato, as one inline SVG and nothing else.
 *
 * `./Trigger.tsx` draws this; the About popover may draw it again at
 * a fixed size. It is a pure function of its two props: no state, no
 * effect, no storage, no request, and no import but a React type. The
 * mark is inline rather than a `.svg` asset on purpose — an asset
 * would need a loader, a URL and a network round trip, and a widget
 * whose job is to still stand when the app's build is broken cannot
 * depend on any of the three.
 *
 * ## The reference it was traced from
 *
 * `.tmp/dev-tomato.jpg` in the repository root — the reference image
 * spec item 2 of `.rafa/specs/q20b-1-dev-tools-shell.md` names, placed
 * there by the operator against the `[human]` prerequisite in
 * `.rafa/plans/PREREQUISITES-q20b-1-dev-tools-shell.md`. It is a
 * 1024x1024 JPEG (`.tmp/` is gitignored, so the file is NOT in the
 * repository and this comment is the only record of it): a red tomato
 * body under a dark outline, a green calyx and stem, and a white
 * `< >` glyph across the body.
 *
 * Traced by measurement rather than by eye. Every number below was
 * read off that bitmap with a pixel scan:
 *
 * - Palette, as the median of a flat patch of each region, so JPEG
 *   ringing at the edges does not move it: body `#DA5647`, outline
 *   `#7C766D` (a warm grey, not a neutral one), calyx `#79BB4F`,
 *   glyph `#FFFFFF`.
 * - Outline thickness 16px at 1024, read across the body's left edge
 *   (`0.73` after normalisation).
 * - Body silhouette: widest row band y 492-543 spanning x 256-767,
 *   bottom y 751, crown y ~288. So the body is WIDER than tall and
 *   flatter over the shoulders than under them, which is why it is
 *   four cubics rather than an `<ellipse>`: fitting each half
 *   separately answers ry 221 / handle 0.65 above the waist and ry
 *   231 / handle 0.58 below it. Residual of that fit against the
 *   traced silhouette, over 254 columns sampled every 2px: RMS 1.1px
 *   on top and 0.5px underneath, at 1024. A single ellipse through
 *   the same three extremes leaves a median residual of 10.2px on the
 *   shoulders — measured, and the reason the split is here.
 * - Calyx: green tips at (403, 314) and (619, 314) to the sides and
 *   (442, 383) / (580, 383) below, a waist at (458, 341) / (565, 341)
 *   between each pair, and ONE notch, at (511, 346) between the two
 *   hanging lobes. The row scan is what settled that count: the
 *   silhouette runs unbroken from a side tip through its waist into
 *   the lobe below it, so the four-notch star the shape reads as is
 *   not what is there. The tips, the waists and the notch are
 *   measured; the CONTROL points that bend the curve between two of
 *   them are the one part of this file drawn by eye.
 * - Stem: green 23-29px wide (it tapers), cap at y 239, base where
 *   the calyx swallows it at y ~312.
 * - Glyph: two chevrons, apexes at x 390 and 632 on row y 528, arm
 *   ends on rows y 450 and 605, perpendicular stroke 23px. What is
 *   drawn is the CENTRELINE of each stroke, so every one of those
 *   figures is the outer edge and is pulled in by half a stroke here.
 *
 * ## The viewBox it is normalised to
 *
 * `0 0 24 24`, the icon grid the rest of the package's sizes are
 * whole numbers of. The mapping from the reference's pixels is
 * `view = (source - [247.5, 224]) / 22` — a uniform scale, so nothing
 * is stretched: the art's 528px height becomes exactly 24 units and
 * its 512px width becomes 23.3, centred. Under it the body's waist
 * lands on y 13.45 and the drawing touches 0.39 and 23.96 on x and
 * 3.4 and 23.96 on y, which is the whole grid with the ~0.4 of margin
 * the outline's outer edge needs.
 *
 * Coordinates below are therefore view units, and any number changed
 * here should be re-derived through that mapping rather than nudged.
 *
 * ## How close the trace came, and how that was read
 *
 * Not by eye. A `/tmp` probe rendered this component through
 * `react-dom/server`, drew the markup at 528x528 over the reference's
 * own framing at offset (247.5, 224) — the mapping above, run
 * backwards — screenshotted it at 1024 in Chromium and classified
 * both bitmaps into red / green / outline by the same thresholds the
 * trace used. Agreement, as intersection over union per region:
 * silhouette 0.955, red 0.971, outline 0.797, calyx green 0.804.
 *
 * Two readings say the comparison could have failed rather than
 * merely passing:
 *
 * - Shifting the render 30px right drops silhouette to 0.758 and
 *   outline to 0.134 — a control, run against this same file.
 * - The calyx first carried its outline as a centred stroke on a
 *   filled path, and scored 0.485 on green against the reference's
 *   10,318px: half the outline's width was being eaten out of the
 *   fill, a third of that small shape's area. Painting the wide dark
 *   stroke first and the fill over it — which is what the file does
 *   now — took green to 10,136px and 0.804. The number found a real
 *   defect, which is why it is recorded.
 *
 * The residual is concentrated in the calyx's flanks, where the
 * reference's lobes are fuller than four Béziers make them. One
 * attempt at fuller flanks was measured and REFUSED: bowing the
 * waist controls outward took green to 0.780 and outline to 0.777,
 * so the shape below is the better of the two that were read.
 *
 * ## Why the graphic is `aria-hidden` while it still takes a `title`
 *
 * The two are not in tension, and the order matters. `aria-hidden` is
 * on the `<svg>` because the BUTTON around it carries the accessible
 * name: `./Trigger.tsx` labels itself, and a named graphic inside a
 * named button is announced twice. The mark is decorative in the
 * accessibility sense — it says nothing the button does not.
 *
 * The `<title>` it still renders is consequently NOT an accessible
 * name and must not be counted as one: `aria-hidden` prunes the whole
 * subtree, this element included, from the accessibility tree. It is
 * there for the two readers outside that tree — a browser's hover
 * tooltip when the SVG is opened on its own, and the element's label
 * in a DOM inspector, which is worth something in a debugging widget.
 * A caller that needs the mark to BE the name must drop `aria-hidden`
 * itself rather than lean on the title below.
 *
 * ## No stylesheet reaches this file
 *
 * The four fills are literals rather than `--devtools-*` custom
 * properties, alone in this package. The token layer is theme-aware
 * and the mark is not: a tomato is red in both themes, and resolving
 * it through `var()` would let a host that failed to import
 * `styles.css` draw an unpainted mark. Sizing is the opposite case
 * and does go through the token layer — see {@link DevToolsTomatoProps.size}.
 *
 * The one class the element carries, `devtools-tomato`, has NO rule in
 * `../styles.css` today: it is a hook for `./Trigger.tsx`, which is
 * where a mark that has to sit as a block inside the button will want
 * one. Nothing here depends on it being styled.
 */

import type { ReactElement } from 'react';

/**
 * Fill and stroke, as measured off the reference — see the module
 * comment for how each was sampled.
 */
const RED = '#DA5647';
const OUTLINE = '#7C766D';
const GREEN = '#79BB4F';
const GLYPH = '#FFFFFF';

/** The outline's own thickness, 16px of the reference's 1024. */
const OUTLINE_WIDTH = 0.73;

/**
 * The body: four cubics, the top two flatter than the bottom two.
 *
 * Fitted per half rather than drawn as an `<ellipse>`: ry 9.68 with a
 * 0.65 handle above the waist, ry 10.14 with a 0.58 handle below it.
 */
const BODY_PATH = 'M23.25 13.45'
  + ' C23.25 19.33 18.53 23.59 12 23.59'
  + ' C5.47 23.59 0.75 19.33 0.75 13.45'
  + ' C0.75 7.16 4.69 3.77 12 3.77'
  + ' C19.31 3.77 23.25 7.16 23.25 13.45 Z';

/**
 * The stem: a stroke rather than a shape, so it is drawn twice — the
 * wide dark pass IS its outline.
 */
const STEM_PATH = 'M12.73 1.15 C12.55 1.85 12.05 2.5 11.89 4';
const STEM_WIDTH = 1.15;

/**
 * The calyx: two side tips, a waist on each flank, two hanging lobes
 * and ONE notch between them at the bottom.
 *
 * Its top edge sits on the body's crown, which is why the outline
 * reads as a single line across the shoulders there — the reference
 * does the same.
 */
const CALYX_PATH = 'M12 3.64'
  + ' Q15.2 3.6 16.89 4.09'
  + ' C16.5 4.35 15.3 4.75 14.43 5.32'
  + ' Q14.85 6.2 15.11 7.23'
  + ' C13.6 6.6 12.6 5.95 12 5.55'
  + ' C11.4 5.95 10.4 6.6 8.89 7.23'
  + ' Q9.15 6.2 9.57 5.32'
  + ' C8.7 4.75 7.5 4.35 7.11 4.09'
  + ' Q8.8 3.6 12 3.64 Z';

/**
 * The `< >` glyph: two stroke centrelines, round-capped as the
 * reference's arm ends and apexes are.
 */
const GLYPH_LEFT = 'M9.68 10.67 L7.18 13.82 L9.68 16.92';
const GLYPH_RIGHT = 'M14.32 10.67 L16.82 13.82 L14.32 16.92';
const GLYPH_WIDTH = 1.05;

/** What {@link DevToolsTomato} takes. */
export interface DevToolsTomatoProps {
  /**
   * The side of the square the mark is drawn in.
   *
   * Any CSS length, or a number read as px by SVG's own attribute
   * rules. It defaults to `'100%'` because the usual caller is
   * `./Trigger.tsx`, whose own box is already sized by
   * `--devtools-size-sm|md|lg` from `../styles.css`: filling that box
   * keeps ONE place where a size is decided. Pass a length only where
   * there is no such box — a fixed mark in the About popover, say.
   */
  readonly size?: number | string;
  /**
   * The `<title>` the graphic renders.
   *
   * Not an accessible name: `aria-hidden` on the `<svg>` prunes it.
   * See the module comment for why it is still worth carrying.
   */
  readonly title: string;
}

/**
 * The tomato mark.
 *
 * Decorative by construction — see the module comment.
 *
 * @param props - {@link DevToolsTomatoProps}.
 * @returns One `<svg>`, `aria-hidden`, drawn on the 24x24 grid.
 */
export function DevToolsTomato({
  size = '100%',
  title,
}: DevToolsTomatoProps): ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className="devtools-tomato"
    >
      <title>{title}</title>

      <path
        d={BODY_PATH}
        fill={RED}
        stroke={OUTLINE}
        strokeWidth={OUTLINE_WIDTH}
      />

      {/* Stem, before the calyx so the calyx covers where it lands. */}
      <path
        d={STEM_PATH}
        fill="none"
        stroke={OUTLINE}
        strokeWidth={STEM_WIDTH + OUTLINE_WIDTH}
        strokeLinecap="round"
      />
      <path
        d={STEM_PATH}
        fill="none"
        stroke={GREEN}
        strokeWidth={STEM_WIDTH}
        strokeLinecap="round"
      />

      {/* The calyx, twice, and the order is the whole trick: a wide
          dark stroke first and the green fill over it leaves the
          outline OUTSIDE the traced shape, which is where the
          reference puts it. Filling and stroking in one pass instead
          would eat half the outline's width out of the green — a
          third of the calyx's area, measured. */}
      <path
        d={CALYX_PATH}
        fill="none"
        stroke={OUTLINE}
        strokeWidth={OUTLINE_WIDTH * 2}
        strokeLinejoin="round"
      />
      <path
        d={CALYX_PATH}
        fill={GREEN}
        stroke="none"
      />

      <path
        d={GLYPH_LEFT}
        fill="none"
        stroke={GLYPH}
        strokeWidth={GLYPH_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={GLYPH_RIGHT}
        fill="none"
        stroke={GLYPH}
        strokeWidth={GLYPH_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
