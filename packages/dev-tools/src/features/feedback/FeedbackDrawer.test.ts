import type { FeedbackDraftStore } from './drawerDraft';
import type { FeedbackDrawerProps } from './FeedbackDrawer';
import type { ReportTemplate } from '../../core/reportTemplate';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { buildDevToolsHost } from '../../core/host';

import { createFeedbackDraftStore } from './drawerDraft';
import { FeedbackDrawer } from './FeedbackDrawer';

import { FEEDBACK_FEATURE_ID } from './index';

/**
 * @packageDocumentation
 * The four `react-dom/server` readings `./FeedbackDrawer.tsx`'s own
 * header promises and `./index.test.ts`'s header defers: the outcome
 * region's `role="status"`, the selector input's `data-devtools-field`,
 * the screenshot notice, and the submit control's accessible name.
 *
 * This is not a second copy of what `./ReportFormFields.test.ts`,
 * `./DropZone.test.ts` and `./drawerOutcome.test.ts` already prove of
 * their own markup in isolation. It is the one file that renders the
 * ASSEMBLED drawer — the component none of those three mounts — and
 * reads that the four pieces this stage's task names actually land
 * together in one frame, wired through `renderForm`, through
 * `composeFeedbackTemplate` and through the draft store, rather than
 * each in a fixture of its own. Every other behaviour of this
 * component — a click, a keystroke, a drag, a submit — is the forced
 * Playwright spec's, per this package's two-runner discipline
 * (`../../vitest.config.ts` states it and `./FeedbackDrawer.tsx`'s own
 * header repeats it).
 *
 * ## What was measured before this file existed
 *
 * A throwaway probe rendered this component through
 * `renderToStaticMarkup` before this task and was deleted; the close-out
 * notes for `./FeedbackDrawer.tsx` record what it read off two frames —
 * at mount, with no templates, and with one seeded into the store — and
 * says "the task that lands the permanent `react-dom/server` readings
 * can pin all four". This file is that task, and every string pinned
 * below came off a real frame rather than off the sibling component
 * files this module reads only through markup.
 *
 * ## Why a store is built and written to rather than left default
 *
 * `FeedbackDrawer.tsx`'s effect that loads the template list does not
 * run under `react-dom/server` — effects never do — so a frame drawn
 * over the default, empty draft shows no form at all: the select is
 * disabled and the loading line is the only thing the drawer has to
 * say. `./drawerDraft.ts`'s own header calls that out as the reason
 * the template list lives in the store rather than in `useState`, and
 * `{@link loaded}` below is the other half of the same design: a case
 * that needs the form SEEDS the store directly, the same way a reading
 * is meant to.
 *
 * `createFeedbackDraftStore()` rather than the shared
 * `feedbackDraftStore` singleton, once per case: `./drawerDraft.ts`
 * names a reading as exactly the caller its factory exists for, and a
 * shared store would let one case's write answer for the next case's
 * read.
 *
 * ## Refusals first
 *
 * The file opens on the frame at mount, before any template has
 * loaded: no selector input, no screenshot notice, and a submit
 * control disabled rather than one whose accessible name cannot yet be
 * asked for. The accepting cases follow, all four off one seeded
 * frame.
 */

/** A close the static frame is never given a reason to call. */
function close(): void {
  // A static frame is never interacted with.
}

/**
 * The host every frame below renders against.
 *
 * Built once and reused: nothing under `react-dom/server` calls
 * `fetch` (no effect ever runs there), so one frozen host serves every
 * case with no risk of a stray request and no state one case could
 * leave for the next to read.
 */
const host = buildDevToolsHost({ config: { features: [] }, status: null });

/**
 * A served form taking both of the widget's optional fields.
 *
 * `fields: []` on purpose: nothing declared by the template itself is
 * read by any case below, so `./drawerModel.ts`'s
 * `composeFeedbackTemplate` appending the widget's own selector,
 * screenshot and context fields is the whole story of what a chosen
 * template draws.
 */
const LOADED_TEMPLATE: ReportTemplate = {
  id: 'bug-report',
  name: 'Bug report',
  description: 'Something in the app behaves wrong.',
  module: 'web',
  fields: [],
  devtools: { screenshot: true, selector: true, context: true },
};

/**
 * Draw one static frame of the drawer and hand back the markup, parsed.
 *
 * @param store - What the drawer reads instead of the shared
 * singleton; see this file's header for why every case builds its own.
 * @returns A detached element holding the drawn drawer.
 */
function draw(store: FeedbackDraftStore): HTMLElement {
  const el = document.createElement('div');
  const props: FeedbackDrawerProps = {
    host,
    feature: FEEDBACK_FEATURE_ID,
    close,
    store,
  };

  el.innerHTML = renderToStaticMarkup(createElement(FeedbackDrawer, props));

  return el;
}

/**
 * A frame drawn once {@link LOADED_TEMPLATE} is the chosen template.
 *
 * @returns The drawn drawer, over a fresh store written to before the
 * single render this function performs.
 */
function loaded(): HTMLElement {
  const store = createFeedbackDraftStore();

  store.write({
    templates: [LOADED_TEMPLATE],
    templateId: LOADED_TEMPLATE.id,
  });

  return draw(store);
}

describe('FeedbackDrawer, at mount, before a template has loaded', () => {
  it('draws the outcome region present and empty, and no form at all', () => {
    const frame = draw(createFeedbackDraftStore());
    const region = frame.querySelector('[role="status"]');

    expect(region?.className).toBe('devtools-feedback-outcome');
    expect(region?.textContent).toBe('');
    expect(frame.querySelector('[data-devtools-field="selector"]'))
      .toBeNull();
    expect(frame.querySelector('.devtools-screenshot-notice')).toBeNull();
  });

  it('names the submit control Send report, disabled with no template', () => {
    const submit = draw(createFeedbackDraftStore())
      .querySelector('button[type="submit"]');

    expect(submit?.textContent).toBe('Send report');
    expect(submit?.hasAttribute('disabled')).toBe(true);
  });
});

describe('FeedbackDrawer, the static render once a template is loaded', () => {
  it('carries the outcome region as a role="status" line, empty at rest', () => {
    const region = loaded().querySelector('[role="status"]');

    expect(region).not.toBeNull();
    expect(region?.getAttribute('role')).toBe('status');
    expect(region?.textContent).toBe('');
  });

  it('marks the selector input data-devtools-field="selector"', () => {
    const input = loaded().querySelector('[data-devtools-field="selector"]');

    expect(input?.tagName).toBe('INPUT');
    // Spec item 5's id, off `./drawerModel.ts`'s
    // `FEEDBACK_SELECTOR_FIELD_ID` through `./ReportFormFields.tsx`'s
    // `devtools-field-` prefix — pinned as a literal, the same way
    // that file's own cases pin its ids.
    expect(input?.id).toBe('devtools-field-devtools-selector');
  });

  it('says the screenshot stays on this machine', () => {
    const notice = loaded().querySelector('.devtools-screenshot-notice');

    // Pinned as the literal `./DropZone.test.ts` already pins for the
    // same sentence, drawn here through the assembled drawer rather
    // than through that file's isolated fixture.
    expect(notice?.textContent).toBe(
      'This image stays on this machine: the dev server saves it beside '
      + 'the report and the tracker gets the path.',
    );
  });

  it('names the submit control\'s accessible name Send report', () => {
    const submit = loaded().querySelector('button[type="submit"]');

    expect(submit?.tagName).toBe('BUTTON');
    expect(submit?.getAttribute('type')).toBe('submit');
    // No `aria-label` anywhere on this control, so its accessible name
    // is its text content — the read the accessible-name algorithm
    // gives a button with no label override.
    expect(submit?.hasAttribute('aria-label')).toBe(false);
    expect(submit?.textContent).toBe('Send report');
    expect(submit?.hasAttribute('disabled')).toBe(false);
  });
});
