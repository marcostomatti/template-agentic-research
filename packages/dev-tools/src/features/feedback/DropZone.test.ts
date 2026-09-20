import type { DropZoneProps, ReportScreenshotField } from './DropZone';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { DropZone } from './DropZone';
import { FEEDBACK_ATTACHMENT_BYTES_LIMIT } from './submitRules';

/**
 * ## Why this file is `.test.ts` and renders a `.tsx`
 *
 * The same reading `./ReportFormFields.test.ts` opens with, and for
 * the same reason: the jsdom vitest project collects `.ts` only, a
 * decision lives in a module a project collects, and a component
 * stays thin. Every case below renders ONE static frame through
 * `react-dom/server` and reads the markup back through jsdom. Nothing
 * is dropped, picked, dragged or captured — those are the forced
 * Playwright spec's, which drives this control with a fixture PNG
 * because a display-media prompt cannot be accepted under automation.
 *
 * Two consequences of a static frame shape what is asked below:
 *
 * - Effects do not run, so the preview's object URL does not exist
 *   and no `<img>` is drawn. `draws no image until the effect has
 *   run` pins that deliberately, so the absence reads as a known
 *   property rather than as a broken preview.
 * - State is at its initial value, so the drag-over attribute can
 *   only be read at rest. The highlight itself is the e2e's.
 *
 * ## Refusals first
 *
 * The file opens on what this control will not take: a descriptor of
 * the wrong kind, which is a `check-types` error; the two types it
 * offers; and the size it names. Spec decision 4 — the image never
 * leaves the machine — is the reason the notice and its
 * `aria-describedby` are asked for immediately after.
 */

/** A change reader the static frames never call. */
function ignore(): void {
  // A static frame changes nothing.
}

/** The screenshot descriptor as the drawer will append it. */
const screenshot = {
  id: 'screenshot',
  kind: 'file',
  label: 'Screenshot',
  description: 'The frame that travels with this report.',
  required: false,
} satisfies ReportScreenshotField;

/** …and the same descriptor with no help text under the label. */
const bare = {
  id: 'screenshot',
  kind: 'file',
  label: 'Screenshot',
  required: false,
} satisfies ReportScreenshotField;

/**
 * Draw one frame and hand back the markup, parsed.
 *
 * @param props - What the control takes.
 * @returns A detached element holding the drawn control.
 */
function draw(props: DropZoneProps): HTMLElement {
  const host = document.createElement('div');

  host.innerHTML = renderToStaticMarkup(createElement(DropZone, props));

  return host;
}

/**
 * Draw the control over one descriptor, with no attachment.
 *
 * @param field - The descriptor to draw.
 * @returns The drawn control.
 */
function drawEmpty(field: ReportScreenshotField): HTMLElement {
  return draw({ field, file: null, onChange: ignore, onRefuse: ignore });
}

describe('DropZone, what it will not take', () => {
  it('refuses a descriptor of any other kind at the type level', () => {
    const selector = {
      id: 'selector',
      kind: 'selector',
      label: 'Element',
      required: false,
    } as const;

    // @ts-expect-error the screenshot control draws the `file` kind
    // alone; every other kind is the form renderer's.
    const field: ReportScreenshotField = selector;

    expect(field.kind).toBe('selector');
  });

  it('offers the picker the two types the rule accepts', () => {
    const input = drawEmpty(screenshot).querySelector('input');

    expect(input?.getAttribute('type')).toBe('file');
    expect(input?.getAttribute('accept')).toBe('image/png,image/jpeg');
  });

  it('names the same 5 MB the rule enforces', () => {
    const hint = drawEmpty(screenshot)
      .querySelector('.devtools-screenshot-hint');

    // Both ends as literals on purpose: a case that recomputed the
    // megabytes from the constant would move with it and red nothing.
    expect(FEEDBACK_ATTACHMENT_BYTES_LIMIT).toBe(5_242_880);
    expect(hint?.textContent)
      .toBe('Drop a PNG or JPEG here, at most 5 MB, or choose one below.');
  });

  it('draws one file input and no other control that takes a file', () => {
    const host = drawEmpty(screenshot);

    expect(host.querySelectorAll('input')).toHaveLength(1);
    expect(host.querySelectorAll('input[type="file"]')).toHaveLength(1);
    expect(host.querySelector('form')).toBeNull();
  });
});

describe('DropZone, the notice that the image stays here', () => {
  it('says the image stays on this machine', () => {
    const notice = drawEmpty(screenshot)
      .querySelector('#devtools-field-screenshot-notice');

    expect(notice?.textContent).toBe(
      'This image stays on this machine: the dev server saves it beside '
      + 'the report and the tracker gets the path.',
    );
  });

  it('describes the input by description, notice and error slot', () => {
    const host = drawEmpty(screenshot);
    const input = host.querySelector('input');

    expect(input?.getAttribute('aria-describedby')).toBe(
      'devtools-field-screenshot-description '
      + 'devtools-field-screenshot-notice '
      + 'devtools-field-screenshot-error',
    );

    const named = input?.getAttribute('aria-describedby')?.split(' ') ?? [];

    for (const id of named) {
      expect(host.querySelector(`#${id}`)).not.toBeNull();
    }
  });

  it('describes it by the notice and slot alone with no description', () => {
    const host = drawEmpty(bare);

    expect(host.querySelector('input')?.getAttribute('aria-describedby')).toBe(
      'devtools-field-screenshot-notice devtools-field-screenshot-error',
    );
    expect(host.querySelector('.devtools-field-description')).toBeNull();
  });
});

describe('DropZone, the control at rest', () => {
  it('labels the file input with the descriptor label', () => {
    const host = drawEmpty(screenshot);

    expect(host.querySelector('label')?.getAttribute('for'))
      .toBe('devtools-field-screenshot');
    expect(host.querySelector('label')?.textContent).toBe('Screenshot');
    expect(host.querySelector('input')?.id).toBe('devtools-field-screenshot');
  });

  it('draws the zone not dragged over', () => {
    const zone = drawEmpty(screenshot)
      .querySelector('.devtools-screenshot-zone');

    expect(zone?.getAttribute('data-dragover')).toBe('false');
  });

  it('draws the capture button ready rather than capturing', () => {
    const button = drawEmpty(screenshot)
      .querySelector('.devtools-screenshot-capture');

    expect(button?.textContent).toBe('Capture screenshot');
    expect(button?.hasAttribute('disabled')).toBe(false);
  });

  it('marks the input required only where the descriptor is', () => {
    const optional = drawEmpty(screenshot).querySelector('input');
    const required = drawEmpty({ ...screenshot, required: true })
      .querySelector('input');

    expect(optional?.hasAttribute('required')).toBe(false);
    expect(optional?.getAttribute('aria-required')).toBe('false');
    expect(required?.getAttribute('aria-required')).toBe('true');
  });

  it('draws the error slot empty and the control valid with no reason', () => {
    const host = drawEmpty(screenshot);
    const slot = host.querySelector('#devtools-field-screenshot-error');

    expect(slot).not.toBeNull();
    expect(slot?.textContent).toBe('');
    expect(host.querySelector('input')?.getAttribute('aria-invalid'))
      .toBe('false');
  });

  it('draws a reason the drawer holds in the slot the input names', () => {
    const host = draw({
      field: screenshot,
      file: null,
      error: 'An attachment is a PNG or a JPEG.',
      onChange: ignore,
      onRefuse: ignore,
    });

    expect(host.querySelector('#devtools-field-screenshot-error')?.textContent)
      .toBe('An attachment is a PNG or a JPEG.');
    expect(host.querySelector('input')?.getAttribute('aria-invalid'))
      .toBe('true');
  });

  it('draws no preview and no remove button with no attachment', () => {
    const host = drawEmpty(screenshot);

    expect(host.querySelector('figure')).toBeNull();
    expect(host.querySelectorAll('button')).toHaveLength(1);
  });
});

describe('DropZone, the preview', () => {
  /** A dropped or chosen file, as the browser hands one over. */
  const chosen = new File([new Uint8Array([1, 2, 3])], 'sidebar.png', {
    type: 'image/png',
  });

  /** …and a capture, which is a `Blob` and carries no name. */
  const captured = new Blob([new Uint8Array([4, 5])], { type: 'image/png' });

  /**
   * Draw the control holding one attachment.
   *
   * @param file - What the drawer holds.
   * @returns The drawn control.
   */
  function drawWith(file: Blob): HTMLElement {
    return draw({
      field: screenshot,
      file,
      onChange: ignore,
      onRefuse: ignore,
    });
  }

  it('draws the preview and its remove button for an attachment', () => {
    const host = drawWith(chosen);
    const remove = host.querySelector('.devtools-screenshot-remove');

    expect(host.querySelector('figure')).not.toBeNull();
    expect(remove?.textContent).toBe('Remove image');
  });

  it('captions the preview with the name the browser reported', () => {
    expect(drawWith(chosen).querySelector('figcaption')?.textContent)
      .toBe('sidebar.png');
  });

  it('captions an attachment that arrived with no name of its own', () => {
    expect(drawWith(captured).querySelector('figcaption')?.textContent)
      .toBe('Screenshot');
  });

  it('draws no image until the effect that makes its URL has run', () => {
    // A static frame runs no effect, so the object URL does not
    // exist; the figure, the caption and the remove button do not
    // wait on it. See this file's header.
    expect(drawWith(chosen).querySelector('img')).toBeNull();
  });

  it('draws both buttons as buttons and not as submits', () => {
    const host = drawWith(chosen);
    const types = [...host.querySelectorAll('button')]
      .map((button) => button.getAttribute('type'));

    expect(types).toStrictEqual(['button', 'button']);
  });
});
