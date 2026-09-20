import type { FeedbackClimbResult, FeedbackClimbTrail } from './pickerField';
import type { ReportFormField } from './types';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { matchesOf } from './picker';
import {
  FEEDBACK_CLIMB_TRAIL_START,
  FEEDBACK_OUTLINE_LIMIT,
  FEEDBACK_SELECTOR_FIELD_QUERY,
  climbSelector,
  decorateSelectorField,
  describeMatches,
} from './pickerField';
import { ReportFormFields } from './ReportFormFields';

/**
 * ## What the query case is actually reading
 *
 * `the query finds the input the package's own renderer marks` is the
 * one case in this package that puts both halves of spec item 5 in
 * the same assertion: `./ReportFormFields.tsx` writes
 * `data-devtools-field="selector"` as a literal, `./pickerField.ts`
 * writes the query as a literal, and the two share no module. Drift
 * in either is silent everywhere else — the picker would simply
 * decorate nothing.
 *
 * The `@ar/web` adapter is the third literal and is not readable
 * from here; the forced Playwright spec is where that one is proved.
 *
 * ## Refusals first
 *
 * The file opens on the climbs that answer nothing and the counts
 * that are not a count: a blank field, a selector the browser will
 * not read, a trail with nowhere to return to, and a field the
 * person has edited since the last climb.
 */

/** Every detach a case installed, so none outlives its case. */
const detachers: (() => void)[] = [];

/** The widget's own root, as `mountDevTools` would have appended it. */
let root: HTMLElement;

/** Somewhere in the app for a selector to point at. */
let app: HTMLElement;

/**
 * Put a marked selector input inside the widget root.
 *
 * @returns The input.
 */
function markedField(): HTMLInputElement {
  const field = document.createElement('input');

  field.type = 'text';
  field.setAttribute('data-devtools-field', 'selector');
  root.append(field);

  return field;
}

/**
 * Attach the decoration, and take it off again at the end of the
 * case whatever the case does.
 *
 * @param value - What the field holds.
 * @param onClimb - What an arrow key should call.
 * @returns The detach.
 */
function decorate(
  value: string,
  onClimb: (direction: 'up' | 'down') => void = vi.fn(),
): () => void {
  const detach = decorateSelectorField({
    root,
    value,
    matches: matchesOf(value),
    onClimb,
  });

  detachers.push(detach);

  return detach;
}

/**
 * Press one key on an element.
 *
 * @param target - What has focus.
 * @param key - The key's name.
 * @param modifier - A modifier held with it, if any.
 * @returns The event, so a case can read `defaultPrevented`.
 */
function press(
  target: Element,
  key: string,
  modifier?: 'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey',
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    key,
    ...modifier === undefined
      ? {}
      : { [modifier]: true },
  });

  target.dispatchEvent(event);

  return event;
}

/** @returns Every outline drawn on the sheet. */
function outlines(): readonly Element[] {
  return [...root.querySelectorAll('.devtools-pick-outline')];
}

/** @returns What the match badge reads, or `null` where there is none. */
function badge(): string | null {
  return root.querySelector('.devtools-pick-badge')?.textContent ?? null;
}

/**
 * A climb request over the document as it stands.
 *
 * @param value - What the field holds.
 * @param trail - Where the climb has been.
 * @param direction - Which way the arrow went.
 * @returns What the climb answers.
 */
function walk(
  value: string,
  trail: FeedbackClimbTrail,
  direction: 'up' | 'down',
): FeedbackClimbResult | null {
  return climbSelector({
    value,
    matches: matchesOf(value),
    trail,
    direction,
  });
}

beforeEach(() => {
  document.body.innerHTML = '';

  root = document.createElement('div');
  root.setAttribute('data-devtools-root', '');

  app = document.createElement('main');
  app.innerHTML
    = '<section data-testid="app-panel">'
    + '<button data-testid="app-save">Save</button>'
    + '</section>';

  document.body.append(app, root);
});

afterEach(() => {
  for (const detach of detachers.splice(0)) {
    detach();
  }
});

describe('the selector field, what it will not say or do', () => {
  it('calls a blank field nothing chosen, not an unreadable one', () => {
    expect(describeMatches('', matchesOf(''))).toBe('No element chosen');
    expect(describeMatches('   ', matchesOf('   ')))
      .toBe('No element chosen');
  });

  it('names a selector the browser refuses to parse', () => {
    const broken = 'div[';

    expect(matchesOf(broken).valid).toBe(false);
    expect(describeMatches(broken, matchesOf(broken)))
      .toBe('Selector not readable');
  });

  it('names a readable selector that points at nothing', () => {
    expect(describeMatches('.absent', matchesOf('.absent')))
      .toBe('No matches');
  });

  it('returns nowhere from a trail nothing has been pushed onto', () => {
    expect(walk('main', FEEDBACK_CLIMB_TRAIL_START, 'down')).toBeNull();
  });

  it('returns nowhere once the field has been edited', () => {
    const climbed = walk(
      '[data-testid="app-save"]',
      FEEDBACK_CLIMB_TRAIL_START,
      'up',
    );

    expect(climbed).not.toBeNull();
    // The person typed over what the climb wrote.
    expect(walk('.mine', climbed?.trail as FeedbackClimbTrail, 'down'))
      .toBeNull();
  });

  it('climbs nowhere from a selector that matches nothing', () => {
    expect(walk('.absent', FEEDBACK_CLIMB_TRAIL_START, 'up')).toBeNull();
  });

  it('climbs nowhere above the app', () => {
    expect(walk('body', FEEDBACK_CLIMB_TRAIL_START, 'up')).toBeNull();
  });

  it('attaches to nothing where no field carries the mark', () => {
    const detach = decorate('main');

    expect(root.querySelector('.devtools-pick-layer')).toBeNull();
    expect(() => { detach(); }).not.toThrow();
  });

  it('outlines nothing while the field does not have focus', () => {
    markedField();
    decorate('main');

    expect(outlines()).toHaveLength(0);
    expect(badge()).toBeNull();
  });

  it('leaves a modified arrow to the browser', () => {
    const field = markedField();
    const onClimb = vi.fn();

    decorate('main', onClimb);

    const event = press(field, 'ArrowUp', 'shiftKey');

    expect(onClimb).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });
});

describe('the selector field, the count it reads', () => {
  it('says one match in the singular', () => {
    const one = '[data-testid="app-save"]';

    expect(describeMatches(one, matchesOf(one))).toBe('1 match');
  });

  it('says how many when there are several', () => {
    app.innerHTML = '<p class="ar-line"></p><p class="ar-line"></p>'
      + '<p class="ar-line"></p>';

    expect(describeMatches('.ar-line', matchesOf('.ar-line')))
      .toBe('3 matches');
  });
});

describe('the selector field, the mark both renderers write', () => {
  it('finds the input the package\'s own renderer marks', () => {
    const fields: readonly ReportFormField[] = [
      { id: 'element', kind: 'selector', label: 'Element', required: false },
    ];
    const host = document.createElement('div');

    host.innerHTML = renderToStaticMarkup(
      createElement(ReportFormFields, {
        fields,
        values: {},
        onChange: () => {
          // A static frame changes nothing.
        },
      }),
    );

    const found = host.querySelector(FEEDBACK_SELECTOR_FIELD_QUERY);

    expect(found?.tagName.toLowerCase()).toBe('input');
    expect(found?.id).toBe('devtools-field-element');
  });

  it('finds no plain text field drawn by the same renderer', () => {
    const fields: readonly ReportFormField[] = [
      { id: 'title', kind: 'text', label: 'Title', required: true },
    ];
    const host = document.createElement('div');

    host.innerHTML = renderToStaticMarkup(
      createElement(ReportFormFields, {
        fields,
        values: {},
        onChange: () => {
          // A static frame changes nothing.
        },
      }),
    );

    expect(host.querySelector(FEEDBACK_SELECTOR_FIELD_QUERY)).toBeNull();
  });

  it('passes over another marked field to reach the selector one', () => {
    // What an app's own renderer may well draw: more than one control
    // carrying the attribute, only one of them the selector.
    const other = document.createElement('input');

    other.setAttribute('data-devtools-field', 'title');
    root.append(other);

    const field = markedField();

    decorate('[data-testid="app-save"]');
    field.focus();

    expect(outlines()).toHaveLength(1);
    expect(badge()).toBe('1 match');
  });
});

describe('the selector field, the climb', () => {
  it('rewrites the field with the parent and remembers where it was', () => {
    const climbed = walk(
      '[data-testid="app-save"]',
      FEEDBACK_CLIMB_TRAIL_START,
      'up',
    );

    expect(climbed?.value).toBe('[data-testid="app-panel"]');
    expect(climbed?.trail.steps).toEqual(['[data-testid="app-save"]']);
    expect(climbed?.trail.written).toBe('[data-testid="app-panel"]');
  });

  it('stacks a second climb on the first', () => {
    const first = walk(
      '[data-testid="app-save"]',
      FEEDBACK_CLIMB_TRAIL_START,
      'up',
    ) as { value: string; trail: FeedbackClimbTrail };
    const second = walk(first.value, first.trail, 'up');

    expect(second?.value).toBe('main');
    expect(second?.trail.steps).toEqual([
      '[data-testid="app-save"]',
      '[data-testid="app-panel"]',
    ]);
  });

  it('walks back down the way it came, and then stops', () => {
    const first = walk(
      '[data-testid="app-save"]',
      FEEDBACK_CLIMB_TRAIL_START,
      'up',
    ) as { value: string; trail: FeedbackClimbTrail };
    const second = walk(first.value, first.trail, 'up') as {
      value: string;
      trail: FeedbackClimbTrail;
    };
    const back = walk(second.value, second.trail, 'down') as {
      value: string;
      trail: FeedbackClimbTrail;
    };

    expect(back.value).toBe('[data-testid="app-panel"]');

    const bottom = walk(back.value, back.trail, 'down') as {
      value: string;
      trail: FeedbackClimbTrail;
    };

    expect(bottom.value).toBe('[data-testid="app-save"]');
    expect(walk(bottom.value, bottom.trail, 'down')).toBeNull();
  });

  it('starts a fresh trail from a value the person typed', () => {
    const climbed = walk(
      '[data-testid="app-save"]',
      FEEDBACK_CLIMB_TRAIL_START,
      'up',
    ) as { value: string; trail: FeedbackClimbTrail };
    const typed = walk('[data-testid="app-save"]', climbed.trail, 'up') as {
      value: string;
      trail: FeedbackClimbTrail;
    };

    expect(typed.trail.steps).toEqual(['[data-testid="app-save"]']);
  });
});

describe('the selector field, the decoration', () => {
  it('outlines every match and counts them once the field has focus', () => {
    const field = markedField();

    decorate('[data-testid="app-save"]');
    field.focus();

    expect(outlines()).toHaveLength(1);
    expect(badge()).toBe('1 match');
  });

  it('takes the outlines and the count away again on blur', () => {
    const field = markedField();

    decorate('[data-testid="app-save"]');
    field.focus();
    field.blur();

    expect(outlines()).toHaveLength(0);
    expect(badge()).toBeNull();
  });

  it('outlines at most the limit while counting them all', () => {
    const rows = Array.from(
      { length: FEEDBACK_OUTLINE_LIMIT + 2 },
      () => '<p class="ar-row"></p>',
    ).join('');

    app.innerHTML = rows;

    const field = markedField();

    decorate('.ar-row');
    field.focus();

    expect(outlines()).toHaveLength(FEEDBACK_OUTLINE_LIMIT);
    expect(badge()).toBe(`${FEEDBACK_OUTLINE_LIMIT + 2} matches`);
  });

  it('reports a bare arrow in each direction and eats the caret jump', () => {
    const field = markedField();
    const onClimb = vi.fn();

    decorate('main', onClimb);

    const up = press(field, 'ArrowUp');
    const down = press(field, 'ArrowDown');

    expect(onClimb.mock.calls).toEqual([['up'], ['down']]);
    expect(up.defaultPrevented).toBe(true);
    expect(down.defaultPrevented).toBe(true);
  });

  it('leaves nothing behind when it is detached', () => {
    const field = markedField();
    const onClimb = vi.fn();
    const detach = decorate('main', onClimb);

    field.focus();
    detach();

    expect(root.querySelector('.devtools-pick-layer')).toBeNull();

    press(field, 'ArrowUp');

    expect(onClimb).not.toHaveBeenCalled();
  });
});
