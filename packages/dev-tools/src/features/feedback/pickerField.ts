/**
 * @packageDocumentation
 * The decoration the picker hangs on the selector field: every
 * current match outlined while the field has focus, the match count
 * beside it, and the two arrow keys that walk the selector up and
 * back down the tree.
 *
 * ## The field is FOUND, never drawn
 *
 * Spec item 5: both renderers mark the selector input
 * `data-devtools-field="selector"`, and the picker attaches its
 * decoration and its climb keys to that element rather than to a
 * control it drew itself. That is what makes the behaviour identical
 * under the package's own `./ReportFormFields.tsx` and under
 * `@ar/web`'s `DynamicForm` adapter, which share no module and could
 * not share a component.
 *
 * {@link FEEDBACK_SELECTOR_FIELD_QUERY} is therefore the whole
 * contract between three files, and it is spelled here once.
 * `pickerField.test.ts` renders `./ReportFormFields.tsx` through
 * `react-dom/server` and runs this query over the result, so the two
 * halves of that contract are read against each other rather than
 * asserted separately.
 *
 * ## Why the count is drawn twice, and announced once
 *
 * {@link describeMatches} answers one sentence, and two places draw
 * it:
 *
 * - The sheet's badge, parked on the field's trailing edge by
 *   `./pickerOverlay.ts`, visible only while the field has focus. The
 *   sheet is `aria-hidden`, so this one is never announced.
 * - `./Picker.tsx`'s own count line, beside the pick button, in the
 *   accessibility tree and present whether the field has focus or
 *   not.
 *
 * The split is deliberate. The badge has to sit beside a control this
 * module does not own, so it cannot be a sibling of that control in
 * the markup and cannot be named by its `aria-describedby` — the
 * package's renderer already writes that attribute, and overwriting
 * it from here would silently drop the description and the error slot
 * it names. A floating string in the accessibility tree at the far
 * end of the widget root, describing nothing, is worse than no
 * string; a line beside the button that started the pick is worth
 * reading. One function answers both, so they cannot disagree.
 *
 * ## Five sentences, because a blank field is not a failure
 *
 * `matchesOf('')` answers `{valid: false}` — the empty string is a
 * selector no browser will parse — so a count taken off the matches
 * alone would tell someone who had not picked anything yet that their
 * selector was broken. {@link describeMatches} reads the VALUE first
 * and says `No element chosen`, which is also the state a template
 * that opted into the selector field opens in. `./submitRules.ts`
 * agrees from the other side: a blank selector is no refusal.
 *
 * ## The climb is a trail of selectors, not of elements
 *
 * ArrowUp climbs and ArrowDown returns, so something has to remember
 * where the climb started. {@link FeedbackClimbTrail} holds the
 * selectors walked away from and the one last WRITTEN, and the second
 * member is what makes an edit end a trail: a value that is not the
 * one this module wrote is a value the person typed, so ArrowDown has
 * nothing to return to and ArrowUp starts a fresh trail from it.
 *
 * Selectors rather than elements, for `./picker.ts`'s reason: a
 * description is a reading of a moving document. An element held
 * across a re-render may be detached by the time ArrowDown arrives,
 * and a detached element answers a selector naming a stranger — the
 * exact refusal `describeElement` exists to make. A selector re-run
 * through `matchesOf` is always a reading of the document as it is
 * now.
 *
 * {@link climbSelector} climbs from the FIRST match, which is the
 * first in document order that `./picker.ts` would let anybody pick.
 * A selector matching several elements therefore climbs from the one
 * the person is most likely looking at, and the climb is refused
 * outright when it matches none.
 *
 * ## Modified arrows are the browser's
 *
 * A keydown carrying Alt, Control, Meta or Shift is left alone: those
 * are text-editing and platform shortcuts inside an input, and a dev
 * tool that ate Shift+ArrowUp would have broken selecting to the
 * start of the field. The bare arrows are taken, with
 * `preventDefault`, because their default in a single-line input is
 * to move the caret to an end — a jump nobody asked for under a key
 * that now means something else.
 *
 * ## Mutation note — what the colocated cases actually catch
 *
 * A green suite is no evidence a case can fail. Each leg below was
 * measured by breaking this file, running `bun x vitest run
 * src/features/feedback/pickerField.test.ts` from
 * `packages/dev-tools`, and restoring this file byte-identical — a
 * SHA-256 of the restored text compared against the original's, every
 * leg, all ten restored clean. The baseline is `Tests 24 passed
 * (24)`.
 *
 * - Dropping the blank-value branch from {@link describeMatches}
 *   answers `Tests 1 failed | 23 passed (24)`, and dropping the
 *   `valid` branch answers `1 failed | 23 passed`.
 * - Spelling the singular `1 matches` answers `3 failed | 21 passed`:
 *   the count case and both decoration cases that read the badge.
 * - Dropping the edited-field test from the descent, so a field the
 *   person typed into still returns, answers `1 failed | 23 passed`.
 * - Pushing nothing onto the trail on the way up answers `4 failed |
 *   20 passed`: every case that climbs.
 * - Dropping the first-match guard answers `1 failed | 23 passed`,
 *   and is the one leg two gates catch: `bun x tsc --noEmit` exits
 *   `2` over it, because `climb` then reads an `Element | undefined`.
 * - Dropping the focus test from the draw, so the matches are
 *   outlined whether or not the field has focus, answers `2 failed |
 *   22 passed`.
 * - Dropping the modifier test from the key handler answers `1 failed
 *   | 23 passed`.
 * - Dropping the outline cap answers `1 failed | 23 passed`.
 * - Widening {@link FEEDBACK_SELECTOR_FIELD_QUERY} to
 *   `[data-devtools-field]` — every marked field rather than the
 *   selector — answers `1 failed | 23 passed`, and that leg is the
 *   one that caught a hole in the CASES rather than in this file.
 *   Measured first against the two cases that run the query over
 *   `./ReportFormFields.tsx`'s markup, it answered `24 passed`: that
 *   renderer marks the selector field and marks nothing else, so a
 *   query asking only for the attribute's presence finds the same
 *   element. `passes over another marked field to reach the selector
 *   one` was written for it — two marked controls in one root, the
 *   selector second — which is the shape an app's own renderer can
 *   produce and the package's cannot.
 *
 * `bun x tsc --noEmit` exits `0` under every leg but the first-match
 * guard, measured one by one.
 */

import type { FeedbackSelectorMatches } from './picker';

import { climb, describeElement } from './picker';
import { createOverlayLayer } from './pickerOverlay';

/**
 * How the picker finds the selector input, under either renderer.
 *
 * Spec item 5's attribute, spelled once. `./ReportFormFields.tsx`
 * writes it as a literal and `packages/web/src/dev/ReportForm.tsx`
 * will write it as a literal too, because the three files share no
 * module — so this constant is the query and never the source of
 * either mark.
 */
export const FEEDBACK_SELECTOR_FIELD_QUERY
  = '[data-devtools-field="selector"]';

/**
 * How many matches are outlined at once.
 *
 * A typed `div` can name thousands of elements on a real page, and a
 * sheet holding one box per match would cost more to draw than the
 * decoration is worth. The COUNT is always the true one — it is read
 * off the matches, not off the boxes — so a reader is told about the
 * matches they cannot see.
 */
export const FEEDBACK_OUTLINE_LIMIT = 50;

/** Said while the field is empty: not a refusal, just nothing yet. */
const NOTHING_CHOSEN = 'No element chosen';

/** …while the browser will not parse what is in the field. */
const UNREADABLE = 'Selector not readable';

/** …while it parses and points at nothing. */
const NO_MATCHES = 'No matches';

/** Where the trail starts, and what an edit resets it to. */
export const FEEDBACK_CLIMB_TRAIL_START: FeedbackClimbTrail = Object.freeze({
  steps: Object.freeze([]),
  written: null,
});

/**
 * Which way an arrow key walks the selector.
 *
 * `'up'` is ArrowUp and climbs to the parent; `'down'` is ArrowDown
 * and returns to where the climb came from.
 */
export type FeedbackClimbDirection = 'up' | 'down';

/** Where a climb has been, and what it last wrote. */
export interface FeedbackClimbTrail {
  /** The selectors climbed away from, oldest first. */
  readonly steps: readonly string[];

  /**
   * The selector this module last wrote into the field.
   *
   * `null` before any climb. A field holding anything else is a field
   * the person edited, which ends the trail.
   */
  readonly written: string | null;
}

/** Everything {@link climbSelector} reads, in one argument. */
export interface FeedbackClimbRequest {
  /** What the selector field holds right now. */
  readonly value: string;

  /** What `matchesOf` answered for it. */
  readonly matches: FeedbackSelectorMatches;

  /** Where the climb has been so far. */
  readonly trail: FeedbackClimbTrail;

  /** Up to the parent, or back down to where the climb came from. */
  readonly direction: FeedbackClimbDirection;
}

/** What a climb answers: the next selector, and the next trail. */
export interface FeedbackClimbResult {
  /** What the field should hold now. */
  readonly value: string;

  /** What the next climb should be given. */
  readonly trail: FeedbackClimbTrail;
}

/**
 * The sentence beside the selector field.
 *
 * @param value - What the field holds.
 * @param matches - What `matchesOf` answered for it.
 * @returns One of five sentences; see this module's header for why a
 * blank field is not reported as an unreadable selector.
 */
export function describeMatches(
  value: string,
  matches: FeedbackSelectorMatches,
): string {
  if (value.trim() === '') {
    return NOTHING_CHOSEN;
  }

  if (!matches.valid) {
    return UNREADABLE;
  }

  const found = matches.elements.length;

  if (found === 0) {
    return NO_MATCHES;
  }

  if (found === 1) {
    return '1 match';
  }

  return `${found} matches`;
}

/**
 * Walk one step back down a trail.
 *
 * @param request - {@link FeedbackClimbRequest}.
 * @returns The selector to put back, or `null` when there is nowhere
 * to return to — an untouched field, an edited one, or a trail
 * already walked out.
 */
function descend(request: FeedbackClimbRequest): FeedbackClimbResult | null {
  const { trail, value } = request;

  if (trail.written !== value) {
    return null;
  }

  const previous = trail.steps.at(-1);

  if (previous === undefined) {
    return null;
  }

  return Object.freeze({
    value: previous,
    trail: Object.freeze({
      steps: Object.freeze(trail.steps.slice(0, -1)),
      written: previous,
    }),
  });
}

/**
 * Climb one element outwards from the first match.
 *
 * @param request - {@link FeedbackClimbRequest}.
 * @returns The parent's selector, or `null` when the selector matches
 * nothing, when `./picker.ts` refuses the parent — the top of the
 * app, or anything belonging to the widget — or when no selector can
 * name it.
 */
function ascend(request: FeedbackClimbRequest): FeedbackClimbResult | null {
  const { matches, trail, value } = request;
  const from = matches.elements[0];

  if (from === undefined) {
    return null;
  }

  const parent = climb(from);

  if (parent === null) {
    return null;
  }

  const description = describeElement(parent);

  if (description === null) {
    return null;
  }

  // A value this module did not write is a value the person typed, so
  // the climb starts again from it rather than on top of a trail
  // that no longer leads anywhere.
  const steps = trail.written === value
    ? [...trail.steps, value]
    : [value];

  return Object.freeze({
    value: description.selector,
    trail: Object.freeze({
      steps: Object.freeze(steps),
      written: description.selector,
    }),
  });
}

/**
 * What ArrowUp and ArrowDown do to the selector field.
 *
 * Reads the document through `./picker.ts` and changes nothing in it:
 * the caller writes the answer into the field and keeps the trail.
 *
 * @param request - {@link FeedbackClimbRequest}.
 * @returns The next value and trail, or `null` when the key should do
 * nothing at all.
 */
export function climbSelector(
  request: FeedbackClimbRequest,
): FeedbackClimbResult | null {
  if (request.direction === 'down') {
    return descend(request);
  }

  return ascend(request);
}

/** What {@link decorateSelectorField} takes. */
export interface FeedbackDecorationOptions {
  /** The widget's own root, which the field is drawn somewhere in. */
  readonly root: Element;

  /** What the selector field holds right now. */
  readonly value: string;

  /** What `matchesOf` answered for it. */
  readonly matches: FeedbackSelectorMatches;

  /** Called when a bare ArrowUp or ArrowDown lands on the field. */
  readonly onClimb: (direction: FeedbackClimbDirection) => void;
}

/**
 * Outline what the selector matches, count it, and take the arrows.
 *
 * Attaches to whatever carries
 * {@link FEEDBACK_SELECTOR_FIELD_QUERY} inside the widget's root, so
 * a template with no selector field — or a renderer that forgot the
 * mark — costs nothing and reports nothing.
 *
 * @param options - {@link FeedbackDecorationOptions}.
 * @returns The detach. Always safe to call, including where there was
 * no field to attach to.
 */
export function decorateSelectorField({
  root,
  value,
  matches,
  onClimb,
}: FeedbackDecorationOptions): () => void {
  const field = root.querySelector<HTMLElement>(
    FEEDBACK_SELECTOR_FIELD_QUERY,
  );

  if (field === null) {
    return () => {
      // Nothing was attached, so nothing comes off.
    };
  }

  const doc = root.ownerDocument;
  const view = doc.defaultView;
  const layer = createOverlayLayer(root);

  const draw = (): void => {
    if (doc.activeElement !== field) {
      layer.outline([]);
      layer.count(null);

      return;
    }

    const shown = matches.elements.slice(0, FEEDBACK_OUTLINE_LIMIT);

    layer.outline(shown.map((element) => element.getBoundingClientRect()));
    layer.count({
      text: describeMatches(value, matches),
      beside: field.getBoundingClientRect(),
    });
  };

  const key = (event: KeyboardEvent): void => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      // An editing or platform shortcut. See this module's header.
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      onClimb('up');

      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      onClimb('down');
    }
  };

  field.addEventListener('focus', draw);
  field.addEventListener('blur', draw);
  field.addEventListener('keydown', key);
  // Capture, because a scroll event does not bubble.
  doc.addEventListener('scroll', draw, true);
  view?.addEventListener('resize', draw);

  // The field may already hold focus: this runs again on every edit,
  // and an edit does not move focus out of the control being edited.
  draw();

  return () => {
    field.removeEventListener('focus', draw);
    field.removeEventListener('blur', draw);
    field.removeEventListener('keydown', key);
    doc.removeEventListener('scroll', draw, true);
    view?.removeEventListener('resize', draw);
    layer.remove();
  };
}
