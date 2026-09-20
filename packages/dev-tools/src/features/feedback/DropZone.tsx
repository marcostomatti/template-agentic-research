/**
 * @packageDocumentation
 * The screenshot control: the capture button, the drop zone and its
 * drag-over state, the PNG/JPEG file input, the preview thumbnail
 * with its remove button, and the one line that says the image stays
 * on this machine.
 *
 * It is the feature's OWN control under both form renderers. Spec
 * decision 9 makes the form renderer a slot, and `./types.ts`
 * withholds the `file` kind from that slot at the type level, so this
 * file is the single piece of code that accepts an image into a
 * report — under the package's plain-HTML renderer and under
 * `@ar/web`'s adapter alike. Spec decision 4 is why that matters: the
 * PNG never leaves the machine, and one path in is one path to read.
 *
 * ## Controlled, and it decides nothing it could import
 *
 * The component holds no attachment of its own: {@link
 * DropZoneProps.file} is what the drawer holds and {@link
 * DropZoneProps.onChange} is how it changes. Three pieces of state
 * are genuinely local, and all three are about the browser rather
 * than about the report — whether a drag is over the zone, whether a
 * capture is in flight, and the object URL the preview draws.
 *
 * Every judgement is imported:
 *
 * - `./submitRules.ts`'s `refuseAttachment` decides whether a file is
 *   a PNG or a JPEG and whether it is within 5 MB. It is called on
 *   EVERY way in — the drop, the input and the capture — so a 6 MB
 *   screenshot of a large display is refused by the same sentence a
 *   6 MB dropped file is.
 * - `FEEDBACK_ATTACHMENT_MIMES` from the same module is what the file
 *   input's `accept` is built from, so the types the picker offers
 *   and the types the rule accepts cannot drift apart.
 * - `./capture.ts`'s `captureScreen` takes the screenshot and answers
 *   `null` for every refusal a browser can produce.
 *
 * What is left here is the DOM: four drag handlers, a change handler,
 * a click, and the markup. That is this package's two-runner
 * discipline — `../../vitest.config.ts` states it — and it is why
 * this file is a `.tsx` the jsdom project does not collect.
 *
 * ## The refusal goes UP, and the control keeps nothing back
 *
 * A file this control will not take is reported through {@link
 * DropZoneProps.onRefuse} and is not drawn here. The drawer owns the
 * one `role="status"` region this feature speaks through, so a
 * refusal spoken here would either be a second live region competing
 * with it or a sentence no screen reader ever announced.
 *
 * {@link DropZoneProps.error} is the other half of that: the drawer
 * passes the reason back down and this file draws it in the error
 * slot the control's `aria-describedby` already names. Same shape as
 * `./ReportFormFields.tsx`'s per-field slot — always present, empty
 * until there is a reason, never a live region of its own.
 *
 * A capture that answers `null` travels the same way, as {@link
 * CAPTURE_EMPTY}. It is not a refusal of anything the person did —
 * spec decision 3: a cancelled dialog, an absent API or a
 * non-Chromium browser means the report goes WITHOUT a screenshot,
 * never a blocked submit — so the sentence says the report can still
 * go.
 *
 * ## `refuseAttachment` here is the early guard, not the only one
 *
 * `./submitRules.ts`'s `refuseSubmit` reads every attachment again at
 * submit. That is deliberate duplication of the kind that file's
 * header already names for the two length limits: this is the guard
 * that lets a person fix the problem while they can still see the
 * file they picked, and the submit-time one is what a report built
 * any other way still meets.
 *
 * ## The preview is an object URL, created in an effect
 *
 * `URL.createObjectURL` is called from a `useEffect` and revoked in
 * its cleanup, so exactly one URL exists per attachment and it is
 * released when the attachment is replaced, removed or unmounted. It
 * is not a `useMemo`: a memo may be recomputed or discarded without a
 * cleanup ever running, which is the shape of leak that leaves blob
 * URLs alive for the lifetime of the document.
 *
 * The URL reaches state through a microtask rather than straight out
 * of the effect body, because `react-hooks/set-state-in-effect`
 * refuses the synchronous call — measured here as `error: Calling
 * setState synchronously within an effect can trigger cascading
 * renders` on `bun run lint`. `../../core/surfaces/Drawer.tsx`
 * already takes the same way out for the same rule, so this file
 * follows the package's own precedent rather than inventing a second
 * shape.
 *
 * The consequence worth knowing when reading the colocated cases:
 * effects do not run under `react-dom/server`, so a STATIC frame of
 * this component draws the preview figure, the caption and the remove
 * button and draws NO `<img>`. That is why the figure is drawn on the
 * attachment and the image on the URL rather than both on the URL —
 * the remove button is the control a person needs if the preview
 * never paints, and it must not be waiting on a paint to exist.
 *
 * The thumbnail carries no `width`/`height` attributes, which is a
 * departure from this repo's image rule and is forced: the bytes are
 * a `Blob` whose pixel size is unknown until it decodes. The
 * stylesheet caps both axes instead, so the layout the reserved box
 * would have protected is bounded anyway.
 *
 * ## The drag-over state, and why `dragleave` is read through
 * `relatedTarget`
 *
 * `dragenter` and `dragleave` fire for every element the pointer
 * crosses, children included, so a zone that cleared its state on any
 * `dragleave` flickers as the pointer passes over the button inside
 * it. The state is cleared only when the element being entered is
 * outside the zone — `currentTarget.contains(relatedTarget)` — and
 * `relatedTarget` is `null` when the drag leaves the window, which
 * `contains(null)` reads as outside.
 *
 * `dragover` calls `preventDefault()` on every tick, which is what
 * makes an element a drop target at all: the default action of
 * `dragover` is to REFUSE the drop, and a zone that only prevented
 * `dragenter` opens the file in a new tab instead.
 *
 * ## The file input is a real, visible `<input type="file">`
 *
 * q20b-1's decision 2: the package depends on no design system, so
 * the control is the bare element with the user agent's own drawing —
 * the same reasoning `./ReportFormFields.tsx` writes out for its six
 * kinds. It is the keyboard path to this control: a drop zone is
 * pointer-only, and the capture button opens a prompt that a browser
 * may not have.
 *
 * Its `value` is cleared after every pick. A file input fires no
 * `change` when the same file is chosen twice, so a person who
 * removes a screenshot and picks it again would get nothing at all;
 * clearing also keeps the user agent's "no file chosen" text from
 * disagreeing with a preview this component draws itself.
 *
 * ## The one control in this package the stylesheet has to draw
 *
 * `./ReportFormFields.tsx` adds no CSS at all, and says so with a
 * reading: `grep -c devtools-field src/styles.css` answers `0`,
 * because an `input`, a `select` and a `textarea` all have a drawing
 * of their own. A drop target does not — it is a `div`, and with no
 * rule it has no border, no padding and no way to show that a drag is
 * over it — so this control brought a `Screenshot control` block into
 * `../../styles.css`, scoped under `[data-devtools-root]` like every
 * other rule there.
 *
 * Two consequences were measured rather than assumed. That file's
 * header carries a scan of its own selectors, and the block moved it
 * from `52 rule preludes, 60 selectors, 0 unscoped` to `62 rule
 * preludes, 72 selectors, 0 unscoped` — the same scan over the file
 * plus an appended `body { color: red; }` still answers `1` unscoped,
 * so the zero is a reading that could have failed. Both places
 * carrying the old figures, that header and
 * `../../core/surfaces/ActionItem.tsx`, were moved in the same
 * commit. And every class this file styles is spelled
 * `devtools-screenshot…`, so the renderer's `devtools-field` reading
 * is still `0`.
 *
 * The drag-over rule changes `border-style`, `border-color` and
 * `background-color` and leaves the width at `1px`: the highlight
 * repaints and never reflows the drawer while a file is over it.
 *
 * ## `accept` is a hint, and the rule is what refuses
 *
 * `accept="image/png,image/jpeg"` filters the picker's default view
 * and is not enforcement — every browser lets a person switch it to
 * "all files", and a drop is not filtered by it at all. So
 * `refuseAttachment` runs on the result of all three ways in, and the
 * `accept` string is built from the same list it reads.
 *
 * ## What proves what
 *
 * `./DropZone.test.ts` renders one static frame per case through
 * `react-dom/server` and reads the markup back through jsdom: the
 * accepted types, the 5 MB sentence, the notice and the
 * `aria-describedby` that ties it to the input, the preview and its
 * remove button, the drag-over attribute's resting value, and the
 * single file input.
 *
 * What a static frame CANNOT show is every behaviour above: no drop,
 * no pick, no capture and no drag-over highlight. Those are the
 * forced Playwright spec's — plan item 10 drives the drop zone with a
 * fixture PNG precisely because a display-media prompt cannot be
 * accepted under automation — and this file's cases claim nothing
 * about them.
 *
 * ## Mutation note — what the colocated cases actually catch
 *
 * A green suite is no evidence a case can fail. Each leg below was
 * measured by breaking this file, running `bun x vitest run
 * src/features/feedback/DropZone.test.ts` from `packages/dev-tools`
 * against the 19 cases that file holds, and restoring this file
 * byte-identical — a SHA-256 of the restored text compared to the
 * original's, every leg, all eight restored clean. The baseline is
 * `Tests 19 passed (19)`.
 *
 * - Spelling {@link ACCEPT} `'image/png'` rather than joining the
 *   rule's list answers `Tests 1 failed | 18 passed (19)`: `offers
 *   the picker the two types the rule accepts`.
 * - Reading the cap as `FEEDBACK_ATTACHMENT_BYTES_LIMIT / 1000 /
 *   1000` answers `1 failed | 18 passed`: `names the same 5 MB the
 *   rule enforces`, which reds on `5.24 MB`. That leg is why the case
 *   pins both ends to LITERALS — `5 MB` in the sentence and
 *   `5_242_880` in the constant — rather than recomputing the number
 *   the way this file does.
 * - Dropping the notice's id from {@link describedBy} answers `2
 *   failed | 17 passed`: both described-by cases, the one with a
 *   template description and the one without.
 * - Drawing the preview `<figure>` on the object URL rather than on
 *   the attachment answers `4 failed | 15 passed`: the three cases
 *   that read a static frame holding a file — the figure and its
 *   remove button, and the two captions — plus `draws both buttons as
 *   buttons and not as submits`, which then finds one button where it
 *   expects two. `bun x tsc --noEmit` refuses that leg as well, exit
 *   `2` with `TS2345: Argument of type 'Blob | null' is not
 *   assignable`, because {@link nameOf} then reads a nullable file;
 *   it is the one leg of the eight that two gates catch.
 * - Dropping `data-dragover` from the zone answers `1 failed | 18
 *   passed`: `draws the zone not dragged over`.
 * - Drawing the notice only when there is an attachment answers `2
 *   failed | 17 passed`: `says the image stays on this machine` and
 *   the described-by case that walks every id the input names and
 *   asks for the element behind it.
 * - Giving the remove button no `type` answers `1 failed | 18
 *   passed`: `draws both buttons as buttons and not as submits`. A
 *   `<button>` inside the drawer's `<form>` defaults to `submit`, so
 *   the leg is a real one — removing a screenshot would file the
 *   report.
 *
 * `bun x tsc --noEmit` exits `0` under the other seven, measured one
 * by one: they are behaviour changes over types that still line up.
 *
 * ## …and the leg neither gate catches
 *
 * Dropping the {@link refuseAttachment} call from `offer`, so any
 * dropped or chosen file is accepted, answers `Tests 19 passed (19)`
 * and `tsc` exit `0`. A static frame runs no handler, so no case here
 * can see it: the wiring is the forced Playwright spec's to prove
 * (plan item 10 drops a fixture PNG on this control), and
 * `./submitRules.ts`'s own 31 cases cover the rule itself. The hole
 * is named rather than papered over — a `.test.ts` that mounted this
 * component to click it would be the DOM-testing layer this package's
 * two-runner discipline refuses.
 */

import type { ReportField } from '../../core/reportTemplate';
import type { ChangeEvent, DragEvent, ReactElement } from 'react';

import { useEffect, useState } from 'react';

import { captureScreen } from './capture';
import {
  FEEDBACK_ATTACHMENT_BYTES_LIMIT,
  FEEDBACK_ATTACHMENT_MIMES,
  refuseAttachment,
} from './submitRules';

/**
 * The template descriptor this control draws.
 *
 * The one `ReportField` kind `./types.ts` withholds from the renderer
 * slot, derived from the union rather than restated, so the field
 * that reaches this control and the field the slot refuses are the
 * same declaration.
 */
export type ReportScreenshotField = Extract<ReportField, { kind: 'file' }>;

/**
 * What every id this file writes starts with.
 *
 * The same prefix `./ReportFormFields.tsx` writes, respelt rather
 * than imported: it is private there, and the two files agree because
 * the drawer draws them into ONE document and an id has to be unique
 * across both. The field id is an identifier and is unique within a
 * template (`src/core/reportTemplate.ts` refuses anything else), and
 * the renderer never draws the `file` field, so nothing collides.
 */
const FIELD_ID_PREFIX = 'devtools-field-';

/** …and what the description element's id ends with. */
const DESCRIPTION_SUFFIX = '-description';

/** …and the local-only notice's. */
const NOTICE_SUFFIX = '-notice';

/** …and the error slot's. */
const ERROR_SUFFIX = '-error';

/** One mebibyte, as `./submitRules.ts` reads "MB". */
const BYTES_PER_MEGABYTE = 1024 * 1024;

/**
 * The cap as the hint says it, read off the cap the rule enforces.
 *
 * Derived rather than written as `5`, so the sentence cannot name a
 * size the rule does not hold to. The colocated case pins both ends
 * to literals — the drawn `5 MB` and the imported `5_242_880` —
 * because a case that recomputed this would move with it.
 */
const ATTACHMENT_MEGABYTES = FEEDBACK_ATTACHMENT_BYTES_LIMIT
  / BYTES_PER_MEGABYTE;

/**
 * What the picker offers first.
 *
 * Built from the rule's own list; see this module's header for why it
 * is a hint and never the enforcement.
 */
const ACCEPT = FEEDBACK_ATTACHMENT_MIMES.join(',');

/** What the capture button reads at rest. */
const CAPTURE_LABEL = 'Capture screenshot';

/** …and while the browser's prompt is up. */
const CAPTURING_LABEL = 'Capturing…';

/**
 * Said when a capture produced no frame.
 *
 * Spec decision 3: that is not a failure of the report. The sentence
 * names the ways out a person has — the prompt again, a file — and
 * says the report can go without one.
 */
const CAPTURE_EMPTY
  = 'No screenshot came back. Drop or choose an image instead, or '
  + 'send the report without one.';

/** What the drop zone reads. */
const ZONE_HINT
  = `Drop a PNG or JPEG here, at most ${ATTACHMENT_MEGABYTES} MB, or `
  + 'choose one below.';

/** The one-line notice, and the whole of spec decision 4 in a line. */
const LOCAL_NOTICE
  = 'This image stays on this machine: the dev server saves it beside '
  + 'the report and the tracker gets the path.';

/** What the preview's image is called where it cannot be seen. */
const PREVIEW_ALT = 'Preview of the image attached to this report';

/** What the preview calls an attachment that arrived with no name. */
const CAPTURED_NAME = 'Screenshot';

/** What the remove button reads. */
const REMOVE_LABEL = 'Remove image';

/**
 * Name an attachment for the preview caption.
 *
 * @param file - What the drawer holds.
 * @returns The browser's own filename for a dropped or chosen file,
 * and {@link CAPTURED_NAME} for a capture, which is a `Blob` and has
 * none. This is the caption a person reads; the name that travels on
 * the wire is the drawer's to build, under the charset
 * `src/vite/report.ts` accepts.
 */
function nameOf(file: Blob): string {
  if (file instanceof File) {
    return file.name;
  }

  return CAPTURED_NAME;
}

/**
 * What the file input is described by.
 *
 * @param field - The screenshot descriptor.
 * @returns The notice's id and the error slot's, preceded by the
 * description's where the template wrote one. All three are named
 * always, for `./ReportFormFields.tsx`'s reason: a slot that appeared
 * and vanished would change the control's description as the person
 * works, and a stable empty element describes nothing while it is
 * empty.
 */
function describedBy(field: ReportScreenshotField): string {
  const tail = `${FIELD_ID_PREFIX}${field.id}${NOTICE_SUFFIX} `
    + `${FIELD_ID_PREFIX}${field.id}${ERROR_SUFFIX}`;

  if (field.description === undefined) {
    return tail;
  }

  return `${FIELD_ID_PREFIX}${field.id}${DESCRIPTION_SUFFIX} ${tail}`;
}

/** What {@link DropZone} takes. */
export interface DropZoneProps {
  /** The template's screenshot descriptor: its id, label and help. */
  readonly field: ReportScreenshotField;

  /** The image the report will carry, or `null` while there is none. */
  readonly file: Blob | null;

  /** The reason the drawer holds for this control, if any. */
  readonly error?: string;

  /**
   * Called with the image the report should carry, or with `null`
   * when the remove button is pressed.
   *
   * Only ever called with a file {@link refuseAttachment} accepted.
   */
  readonly onChange: (next: Blob | null) => void;

  /**
   * Called with a sentence when a file was NOT taken.
   *
   * A wrong type, an oversized file, or a capture that produced no
   * frame. The drawer speaks it in the one `role="status"` region
   * this feature owns; see this module's header.
   */
  readonly onRefuse: (reason: string) => void;
}

/**
 * The feature's screenshot control.
 *
 * @param props - {@link DropZoneProps}.
 * @returns The capture button, the drop zone and its file input, the
 * preview when there is an attachment, the local-only notice and the
 * error slot.
 */
export function DropZone({
  field,
  file,
  error,
  onChange,
  onRefuse,
}: DropZoneProps): ReactElement {
  const [dragOver, setDragOver] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = file === null
      ? null
      : URL.createObjectURL(file);

    // Deferred into a microtask so the setState is not synchronous
    // within this effect, which `react-hooks/set-state-in-effect`
    // refuses; `../../core/surfaces/Drawer.tsx` takes the same way
    // out and says so in the same words. A microtask settles before
    // the browser paints, so no frame is ever drawn holding the URL
    // the cleanup above it has just revoked.
    void Promise.resolve().then(() => { setPreviewUrl(url); });

    if (url === null) {
      return undefined;
    }

    return () => { URL.revokeObjectURL(url); };
  }, [file]);

  const inputId = `${FIELD_ID_PREFIX}${field.id}`;

  // Every way in lands here, so the two refusals are asked once.
  const offer = (candidate: Blob | null): void => {
    if (candidate === null) {
      return;
    }

    const reason = refuseAttachment(candidate);

    if (reason !== null) {
      onRefuse(reason);

      return;
    }

    onChange(candidate);
  };

  const capture = async (): Promise<void> => {
    setCapturing(true);

    try {
      const shot = await captureScreen();

      if (shot === null) {
        onRefuse(CAPTURE_EMPTY);

        return;
      }

      offer(shot);
    } finally {
      setCapturing(false);
    }
  };

  const allowDrop = (event: DragEvent<HTMLDivElement>): void => {
    // The default action of both events is to refuse the drop.
    event.preventDefault();
    setDragOver(true);
  };

  const endDrag = (event: DragEvent<HTMLDivElement>): void => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setDragOver(false);
    }
  };

  const drop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragOver(false);
    // The first file only: a report carries one image, and a person
    // who dropped several is told about the one that was read.
    offer(event.dataTransfer.files.item(0));
  };

  const choose = (event: ChangeEvent<HTMLInputElement>): void => {
    offer(event.target.files?.item(0) ?? null);
    // See this module's header: without this, picking the same file
    // twice fires no second `change`.
    event.target.value = '';
  };

  return (
    <div className="devtools-screenshot">
      <label className="devtools-field-label" htmlFor={inputId}>
        {field.label}
      </label>

      {field.description !== undefined && (
        <p
          className="devtools-field-description"
          id={`${FIELD_ID_PREFIX}${field.id}${DESCRIPTION_SUFFIX}`}
        >
          {field.description}
        </p>
      )}

      <div
        className="devtools-screenshot-zone"
        data-dragover={dragOver}
        onDragEnter={allowDrop}
        onDragOver={allowDrop}
        onDragLeave={endDrag}
        onDrop={drop}
      >
        <button
          type="button"
          className="devtools-screenshot-capture"
          disabled={capturing}
          onClick={() => { void capture(); }}
        >
          {capturing
            ? CAPTURING_LABEL
            : CAPTURE_LABEL}
        </button>

        <p className="devtools-screenshot-hint">{ZONE_HINT}</p>

        <input
          id={inputId}
          className="devtools-screenshot-input"
          type="file"
          accept={ACCEPT}
          aria-describedby={describedBy(field)}
          aria-required={field.required}
          aria-invalid={error !== undefined}
          onChange={choose}
        />
      </div>

      {file !== null && (
        <figure className="devtools-screenshot-preview">
          {previewUrl !== null && (
            <img
              className="devtools-screenshot-thumb"
              src={previewUrl}
              alt={PREVIEW_ALT}
            />
          )}

          <figcaption className="devtools-screenshot-name">
            {nameOf(file)}
          </figcaption>

          <button
            type="button"
            className="devtools-screenshot-remove"
            onClick={() => { onChange(null); }}
          >
            {REMOVE_LABEL}
          </button>
        </figure>
      )}

      <p
        className="devtools-screenshot-notice"
        id={`${FIELD_ID_PREFIX}${field.id}${NOTICE_SUFFIX}`}
      >
        {LOCAL_NOTICE}
      </p>

      <p
        className="devtools-field-error"
        id={`${FIELD_ID_PREFIX}${field.id}${ERROR_SUFFIX}`}
      >
        {error}
      </p>
    </div>
  );
}
