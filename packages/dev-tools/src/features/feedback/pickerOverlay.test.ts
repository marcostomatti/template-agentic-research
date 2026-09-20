import type { FeedbackElementDescription } from './picker';
import type { FeedbackPickSession } from './pickerOverlay';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isPickable } from './picker';
import {
  createOverlayLayer,
  outlineBox,
  startPick,
  widgetRootOf,
} from './pickerOverlay';

/**
 * ## What a case here can and cannot see
 *
 * jsdom ships no Popover API — measured under this package's own
 * jsdom project: `typeof element.showPopover` is `'undefined'` and
 * `'popover' in element` is `false` — so every case below runs the
 * UNPROMOTED path, where the sheet stays an ordinary child of the
 * widget root. That is the path an older browser takes too, so the
 * readings are worth having; what no case here proves is the
 * promotion itself, which is the forced Playwright spec's.
 *
 * Nothing is laid out either: `getBoundingClientRect` answers zeroes
 * for everything in jsdom. So the geometry is asked of
 * {@link outlineBox} directly, with rects written by hand, and the
 * cases that drive a session ask WHICH element was outlined rather
 * than where the box landed.
 *
 * ## Refusals first
 *
 * The file opens on what the picker will not do: find a root from
 * outside the widget, let its own sheet be picked, swallow a press
 * meant for the widget's own controls, or keep listening after the
 * session has ended.
 */

/** Every session a case started, so none outlives its case. */
const sessions: FeedbackPickSession[] = [];

/** The widget's own root, as `mountDevTools` would have appended it. */
let root: HTMLElement;

/** Somewhere in the app for the picker to point at. */
let app: HTMLElement;

/**
 * Start a session that the teardown will end whatever the case does.
 *
 * @param onPick - What the pick should call.
 * @returns The session.
 */
function pick(
  onPick: (description: FeedbackElementDescription) => void,
): FeedbackPickSession {
  const session = startPick({ root, onPick });

  sessions.push(session);

  return session;
}

/**
 * Send one event the way a browser would.
 *
 * @param target - What it is dispatched on.
 * @param type - The event's name.
 * @returns The event, so a case can read `defaultPrevented`.
 */
function send(target: Element, type: string): Event {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true });

  target.dispatchEvent(event);

  return event;
}

/**
 * Move the pointer over one element.
 *
 * @param target - What the pointer is over.
 */
function hover(target: Element): void {
  target.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
}

/**
 * Press a key on the document.
 *
 * @param key - The key's name.
 */
function press(key: string): void {
  document.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }),
  );
}

/** @returns Every outline drawn on the one sheet in the document. */
function outlines(): readonly Element[] {
  return [...document.querySelectorAll('.devtools-pick-outline')];
}

beforeEach(() => {
  document.body.innerHTML = '';

  root = document.createElement('div');
  root.setAttribute('data-devtools-root', '');

  app = document.createElement('main');
  app.innerHTML = '<button data-testid="app-save">Save</button>';

  document.body.append(app, root);
});

afterEach(() => {
  for (const session of sessions.splice(0)) {
    session.end();
  }
});

describe('the picker overlay, what it will not do', () => {
  it('finds no widget root from a ref that never attached', () => {
    expect(widgetRootOf(null)).toBeNull();
  });

  it('finds no widget root from an element outside the widget', () => {
    expect(widgetRootOf(app)).toBeNull();
  });

  it('draws its sheet somewhere the picker refuses to pick', () => {
    const layer = createOverlayLayer(root);
    const drawn = root.querySelector('.devtools-pick-layer');

    expect(drawn).not.toBeNull();
    expect(isPickable(drawn as Element)).toBe(false);

    layer.remove();
  });

  it('leaves a press on the widget its own, and ends the session', () => {
    const onPick = vi.fn();

    pick(onPick);

    const handle = document.createElement('button');

    root.append(handle);

    const down = send(handle, 'pointerdown');

    expect(down.defaultPrevented).toBe(false);
    expect(root.querySelector('.devtools-pick-layer')).toBeNull();
  });

  it('picks nothing from a click on the widget itself', () => {
    const onPick = vi.fn();

    pick(onPick);

    const handle = document.createElement('button');

    root.append(handle);
    send(handle, 'click');

    expect(onPick).not.toHaveBeenCalled();
  });

  it('outlines nothing while the pointer is over the widget', () => {
    pick(vi.fn());
    hover(app.querySelector('button') as Element);

    expect(outlines()).toHaveLength(1);

    hover(root);

    expect(outlines()).toHaveLength(0);
  });

  it('picks nothing once the session has ended', () => {
    const onPick = vi.fn();
    const session = pick(onPick);

    session.end();

    const target = app.querySelector('button') as Element;
    const clicked = send(target, 'click');

    expect(onPick).not.toHaveBeenCalled();
    expect(clicked.defaultPrevented).toBe(false);
  });

  it('ends on Escape and takes its sheet with it', () => {
    pick(vi.fn());

    expect(root.querySelector('.devtools-pick-layer')).not.toBeNull();

    press('Escape');

    expect(root.querySelector('.devtools-pick-layer')).toBeNull();
  });

  it('survives every key that is not Escape', () => {
    pick(vi.fn());
    press('Enter');
    press('a');
    press('ArrowUp');

    expect(root.querySelector('.devtools-pick-layer')).not.toBeNull();
  });

  it('ends twice without complaining', () => {
    const session = pick(vi.fn());

    session.end();

    expect(() => { session.end(); }).not.toThrow();
  });
});

describe('the picker overlay, where a box goes', () => {
  it('answers whole pixels with a unit', () => {
    expect(outlineBox({ x: 12, y: 40, width: 220, height: 32 })).toEqual({
      x: '12px',
      y: '40px',
      width: '220px',
      height: '32px',
    });
  });

  it('rounds a measured box rather than carrying its subpixels', () => {
    expect(outlineBox({
      x: 12.4,
      y: 39.5,
      width: 219.75,
      height: 31.2,
    })).toEqual({
      x: '12px',
      y: '40px',
      width: '220px',
      height: '31px',
    });
  });
});

describe('the picker overlay, the sheet', () => {
  it('appends one manual popover the reader is never told about', () => {
    const layer = createOverlayLayer(root);
    const drawn = root.querySelector('.devtools-pick-layer');

    expect(drawn?.getAttribute('popover')).toBe('manual');
    expect(drawn?.getAttribute('aria-hidden')).toBe('true');

    layer.remove();
  });

  it('draws one box per rect, carrying its geometry as properties', () => {
    const layer = createOverlayLayer(root);

    layer.outline([
      { x: 10, y: 20, width: 30, height: 40 },
      { x: 50, y: 60, width: 70, height: 80 },
    ]);

    const drawn = outlines();

    expect(drawn).toHaveLength(2);
    expect(drawn[0]?.getAttribute('style')).toBe(
      '--devtools-pick-x: 10px; --devtools-pick-y: 20px; '
      + '--devtools-pick-width: 30px; --devtools-pick-height: 40px;',
    );
    expect(drawn[1]?.getAttribute('style')).toContain(
      '--devtools-pick-x: 50px',
    );

    layer.remove();
  });

  it('drops the boxes a shorter list no longer needs', () => {
    const layer = createOverlayLayer(root);

    layer.outline([
      { x: 0, y: 0, width: 1, height: 1 },
      { x: 2, y: 2, width: 1, height: 1 },
      { x: 4, y: 4, width: 1, height: 1 },
    ]);

    expect(outlines()).toHaveLength(3);

    layer.outline([{ x: 6, y: 6, width: 1, height: 1 }]);

    expect(outlines()).toHaveLength(1);
    expect(outlines()[0]?.getAttribute('style')).toContain(
      '--devtools-pick-x: 6px',
    );

    layer.outline([]);

    expect(outlines()).toHaveLength(0);

    layer.remove();
  });

  it('draws the match count over the box it was given', () => {
    const layer = createOverlayLayer(root);

    layer.count({
      text: '3 matches',
      beside: { x: 8, y: 16, width: 240, height: 28 },
    });

    const badge = root.querySelector('.devtools-pick-badge');

    expect(badge?.textContent).toBe('3 matches');
    expect(badge?.getAttribute('style')).toBe(
      '--devtools-pick-x: 8px; --devtools-pick-y: 16px; '
      + '--devtools-pick-width: 240px; --devtools-pick-height: 28px;',
    );

    layer.remove();
  });

  it('takes the count away again', () => {
    const layer = createOverlayLayer(root);

    layer.count({ text: '1 match', beside: { x: 0, y: 0, width: 1, height: 1 } });
    layer.count(null);

    expect(root.querySelector('.devtools-pick-badge')).toBeNull();

    layer.remove();
  });

  it('leaves the document when it is removed', () => {
    const layer = createOverlayLayer(root);

    layer.remove();

    expect(root.querySelector('.devtools-pick-layer')).toBeNull();
  });
});

describe('the picker overlay, a session', () => {
  it('outlines exactly the element the pointer is over', () => {
    pick(vi.fn());

    const target = app.querySelector('button') as Element;

    hover(target);

    expect(outlines()).toHaveLength(1);
  });

  it('answers the clicked element and ends', () => {
    const onPick = vi.fn();

    pick(onPick);
    send(app.querySelector('button') as Element, 'click');

    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick.mock.calls[0]?.[0]).toMatchObject({
      selector: '[data-testid="app-save"]',
      tag: 'button',
      text: 'Save',
    });
    expect(root.querySelector('.devtools-pick-layer')).toBeNull();
  });

  it('stops the press reaching the app, not just the click', () => {
    const heard: string[] = [];
    const target = app.querySelector('button') as Element;

    for (const type of ['pointerdown', 'mousedown', 'mouseup', 'click']) {
      target.addEventListener(type, () => { heard.push(type); });
    }

    pick(vi.fn());

    const down = send(target, 'mousedown');
    const up = send(target, 'mouseup');

    expect(heard).toEqual([]);
    expect(down.defaultPrevented).toBe(true);
    expect(up.defaultPrevented).toBe(true);
  });
});
