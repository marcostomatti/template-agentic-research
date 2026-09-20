/**
 * @packageDocumentation
 * The picker's controls: the button that starts pick mode, the match
 * count beside it, and the effect that hangs the decoration on the
 * selector field.
 *
 * Spec item 5 in one component. What it draws is three elements; what
 * it does is call four functions that live in modules the jsdom
 * vitest project collects:
 *
 * - `./pickerOverlay.ts` — `widgetRootOf` and `startPick`, the sheet
 *   and the pointer-following session drawn on it.
 * - `./pickerField.ts` — `describeMatches`, `climbSelector` and
 *   `decorateSelectorField`, the field's count, its arrows and its
 *   outlines.
 *
 * Nothing below decides anything either of those two could have
 * answered, which is this package's two-runner discipline —
 * `../../vitest.config.ts` states it — and is why this file is a
 * `.tsx` that project does not collect.
 *
 * ## The pick is started from the handler, never from an effect
 *
 * Starting a pick COLLAPSES the drawer, and `src/core/Shell.tsx`
 * draws a collapsed drawer's children as `null` — so the collapse
 * unmounts this component. An effect's cleanup would therefore end
 * the session at the exact moment it began. {@link startPick} is
 * called from the button's own `onClick`, it owns real DOM rather
 * than React's, and it survives the unmount that follows it by one
 * render.
 *
 * The click that pressed the button cannot end up picking the button:
 * the session's listeners are registered on the document in the
 * CAPTURE phase, and document capture for that click has already been
 * and gone by the time a React handler runs.
 *
 * {@link PickerProps.onSelect} is what the pick writes through, and
 * it is called while this component is gone — so the drawer's
 * selector value has to live somewhere that outlives the drawer's
 * React subtree. That is `./FeedbackDrawer.tsx`'s constraint, not a
 * suggestion: state held in a `useState` inside the collapsed subtree
 * is state the collapse throws away, the whole report draft with it.
 *
 * ## The decoration is re-attached on every edit, on purpose
 *
 * The effect below depends on the matches, so a keystroke in the
 * selector field detaches and re-attaches it — a new sheet, new
 * boxes. The alternative, a sheet kept for the component's lifetime
 * and redrawn from a ref holding the latest props, buys a handful of
 * DOM nodes and costs a `ref.current` read during render, which
 * `eslint-plugin-react-hooks` v7 reports (the reading
 * `../../core/surfaces/Drawer.tsx` records for the same temptation).
 *
 * No frame is ever drawn between the two: effects run before the
 * browser paints, so the sheet that goes and the sheet that arrives
 * belong to the same frame.
 *
 * ## The trail is a ref, and it is meant to be forgotten
 *
 * The climb trail is per-mount state: a drawer that closed and
 * re-opened starts with nothing to return to, which is right, because
 * the page behind it may be a different page by then. It is a `ref`
 * and not `useState` because nothing drawn here reads it — the field
 * shows the selector, and the selector is the drawer's.
 *
 * ## This file cannot be imported on a case-insensitive filesystem
 *
 * Measured on the machine this was written on (macOS, APFS,
 * case-insensitive), and the reason no `Picker.test.ts` sits beside
 * it and no module imports it yet:
 *
 * - `import { Picker } from './Picker'` resolves to `./picker.ts`.
 *   Vite's default extension order tries `.ts` before `.tsx`, and a
 *   stat for `Picker.ts` matches `picker.ts`. Under vitest the two
 *   spellings answered the SAME module object and raised nothing at
 *   all — both `FEEDBACK_ATTRIBUTE_VALUE_LIMIT,…,matchesOf`, neither
 *   carrying a `Picker`.
 * - `bun run check-types` refuses the same import loudly: `error
 *   TS1149: File name '…/Picker.ts' differs from already included
 *   file name '…/picker.ts' only in casing`, beside `error TS2305:
 *   Module '"./Picker"' has no exported member 'Picker'`.
 * - And the consequence a green build would otherwise have shipped:
 *   the moment anything does import this file, `vite-plugin-dts`
 *   emits `dist/features/feedback/Picker.d.ts`, which on the same
 *   filesystem REPLACES `picker.d.ts`. Measured by writing one
 *   beside the other: the pure module's declaration went from 16,983
 *   bytes to 37, and the directory listed one file where it had
 *   listed two.
 *
 * The collision is the file NAME's and nothing else's — `picker.ts`,
 * spec item 5's pure half, and `Picker.tsx`, its drawing, differ by
 * one letter's case. On a case-sensitive filesystem all three
 * readings come out fine, so this is a name that works in CI and not
 * on the machine the loop runs on; it is the only such pair in the
 * repository, measured over every directory under `packages/`.
 * Renaming either half is a decision this task had no standing to
 * take. The two modules above carry every decision and every case, so
 * the rename costs this file its name and nothing else.
 *
 * ## What proves what
 *
 * Every function this component calls is driven against a real
 * document by `./pickerOverlay.test.ts` (21 cases) and
 * `./pickerField.test.ts` (24 cases): the sheet, the interception,
 * Escape, the five count sentences, the climb in both directions and
 * the decoration's focus gate. Both files carry their own measured
 * mutation legs.
 *
 * What no case reads is the markup below — the button's `type`, the
 * three elements in the row, the hint — because no `.test.ts` in this
 * directory can import this file. Two gates still cover it: `bun run
 * lint` and `bun run check-types` both read it, the second through
 * `tsconfig.json`'s `include: ["src"]` rather than through any
 * import. The forced Playwright spec is where the button is pressed.
 */

import type { FeedbackSelectorMatches } from './picker';
import type { FeedbackClimbDirection } from './pickerField';
import type { ReactElement } from 'react';

import { useCallback, useEffect, useRef } from 'react';

import {
  FEEDBACK_CLIMB_TRAIL_START,
  climbSelector,
  decorateSelectorField,
  describeMatches,
} from './pickerField';
import { startPick, widgetRootOf } from './pickerOverlay';

/** What the button that starts pick mode reads. */
const PICK_LABEL = 'Pick element';

/**
 * The one line of help under the two controls.
 *
 * It is the only place the climb keys are written down: a key that
 * does something and says nothing is a key nobody presses.
 */
const PICK_HINT
  = 'Click an element on the page to fill the selector, or press '
  + 'Escape to cancel. With the field focused, ArrowUp selects the '
  + 'parent and ArrowDown returns.';

/** What {@link Picker} takes. */
export interface PickerProps {
  /** What the selector field holds right now. */
  readonly value: string;

  /** What `./picker.ts`'s `matchesOf` answered for it. */
  readonly matches: FeedbackSelectorMatches;

  /**
   * Called with the selector the field should hold now.
   *
   * A pick calls it while the drawer is collapsed and this component
   * is unmounted; see this module's header for what that asks of the
   * drawer.
   */
  readonly onSelect: (selector: string) => void;

  /**
   * Collapse the drawer to its handle.
   *
   * The `close` the shell hands a surface. Called once, on the way
   * into pick mode; nothing here expands it again, because a surface
   * is given no way to.
   */
  readonly onCollapse: () => void;
}

/**
 * The pick control, the live match count and the field decoration.
 *
 * @param props - {@link PickerProps}.
 * @returns The button, the count and the hint.
 */
export function Picker({
  value,
  matches,
  onSelect,
  onCollapse,
}: PickerProps): ReactElement {
  const anchor = useRef<HTMLDivElement | null>(null);
  const trail = useRef(FEEDBACK_CLIMB_TRAIL_START);

  const onClimb = useCallback((direction: FeedbackClimbDirection) => {
    const next = climbSelector({
      value,
      matches,
      trail: trail.current,
      direction,
    });

    if (next === null) {
      return;
    }

    trail.current = next.trail;
    onSelect(next.value);
  }, [matches, onSelect, value]);

  useEffect(() => {
    const root = widgetRootOf(anchor.current);

    if (root === null) {
      return undefined;
    }

    return decorateSelectorField({ root, value, matches, onClimb });
  }, [matches, onClimb, value]);

  const start = (): void => {
    const root = widgetRootOf(anchor.current);

    if (root === null) {
      return;
    }

    onCollapse();
    startPick({
      root,
      onPick: (description) => { onSelect(description.selector); },
    });
  };

  return (
    <div className="devtools-picker" ref={anchor}>
      <button
        type="button"
        className="devtools-picker-start"
        onClick={start}
      >
        {PICK_LABEL}
      </button>

      <p className="devtools-picker-count">
        {describeMatches(value, matches)}
      </p>

      <p className="devtools-picker-hint">{PICK_HINT}</p>
    </div>
  );
}
