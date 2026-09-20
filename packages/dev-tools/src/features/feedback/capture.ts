/**
 * @packageDocumentation
 * The screenshot a report can carry, taken with the browser's own
 * display-capture prompt: {@link captureScreen} asks
 * `navigator.mediaDevices.getDisplayMedia`, draws ONE frame of the
 * stream it is handed onto a detached canvas, answers that frame as a
 * PNG {@link Blob}, and stops every track of the stream on the way
 * out.
 *
 * One exported function and one exported constant
 * ({@link FEEDBACK_CAPTURE_MIME}). The drawer calls it from its
 * "capture" button; `./DropZone.tsx` — the other half of spec
 * decision 3 — is what accepts a PNG or JPEG pasted or dropped, and
 * this module knows nothing about it.
 *
 * ## Every refusal is `null`, and `null` is the whole report
 *
 * Spec decision 3: a cancelled dialog, an absent API or a
 * non-Chromium browser answers `null` and the report goes without —
 * never a blocked submit. So this function does not throw, for any
 * reason a browser can produce:
 *
 * - `navigator.mediaDevices` absent, which is what a page served over
 *   plain HTTP gets, and what jsdom gives (measured: `typeof
 *   navigator.mediaDevices` is `'undefined'` under this package's
 *   jsdom project).
 * - `getDisplayMedia` absent from a `mediaDevices` that exists —
 *   Safari on iOS, where the rest of the media API is there.
 * - The prompt rejecting: `NotAllowedError` when the user cancels it,
 *   `NotSupportedError`/`TypeError` where display capture is refused
 *   outright, `InvalidStateError` from a document that is not fully
 *   active.
 * - A stream with no video track at all.
 * - A track that has already ended, or that ends before a frame
 *   arrives — the user pressing the browser's own "Stop sharing"
 *   while the element is still spinning up.
 * - A video element that cannot play the stream, whether `play()`
 *   rejects or the element fires `error`.
 * - A frame with no dimensions, a canvas with no 2D context (measured
 *   again: jsdom's `getContext('2d')` answers `null` without the
 *   `canvas` package), and a `toBlob` that hands back `null`.
 *
 * The final `catch` in {@link captureScreen} covers the rest — a
 * browser that throws where these notes expect a rejection, a
 * security error out of `drawImage`. It is a deliberate swallow and
 * not a silent one: `null` is this function's word for "no
 * screenshot", the drawer renders that as the absence of a preview,
 * and the report is worth more than the image.
 *
 * ## `preferCurrentTab`, and the key TypeScript does not have
 *
 * The prompt is asked with `{video: true, audio: false,
 * preferCurrentTab: true}`. `preferCurrentTab` puts this tab at the
 * top of Chromium's picker, which is what the spec asks for; every
 * other browser ignores the key and shows its ordinary picker, which
 * is why it is a preference and never a guarantee — the frame that
 * comes back may be another window entirely, and the drawer shows a
 * preview so the reporter can see what they are about to attach.
 *
 * `audio: false` is explicit rather than omitted. A display capture
 * that quietly carried system audio would be a recording the
 * reporter did not ask for, and only the drawn frame leaves this
 * function in any case.
 *
 * TypeScript 5.9.3's `lib.dom.d.ts` puts `preferCurrentTab` on
 * `MediaStreamConstraints` (`getUserMedia`'s options) and NOT on
 * `DisplayMediaStreamOptions`, so the literal is refused as an excess
 * property against the parameter type. {@link DisplayMediaOptions}
 * below widens it in one place instead, so no call site needs a cast.
 *
 * ## `loadeddata`, not `loadedmetadata`
 *
 * `loadedmetadata` means the dimensions are known; `loadeddata` means
 * `readyState` reached `HAVE_CURRENT_DATA` — a frame exists to draw.
 * Drawing on the earlier event is how a capture ends up a black
 * rectangle of exactly the right size, which looks like a screenshot
 * of a broken app rather than like a failure.
 *
 * ## What this module does NOT do
 *
 * - **It does not upload.** It answers bytes to its caller and holds
 *   none of them. Spec decision 4: the PNG is stored by the plugin,
 *   under `.rafa/feedback/<round>/`, and the issue body links the
 *   path; the image never leaves the machine.
 * - **It does not rasterise the DOM.** Spec decision 3 rules out a
 *   DOM rasteriser, so a browser without display capture has the drop
 *   zone and nothing else.
 * - **It does not time out.** The refusals above cover the ways a
 *   real browser stops: the prompt rejects, the element errors, or
 *   the track ends. A browser that fires none of those leaves the
 *   returned promise pending and its tracks running, because the stop
 *   is in the `finally` of a promise that never settles. That is a
 *   known gap rather than an oversight, recorded in this plan's
 *   close-out notes; a timer is the fix if one is ever seen, and no
 *   reading so far has seen one.
 *
 * ## It is a `.ts`, and it imports no React
 *
 * Two-runner discipline, as `./context.ts` states it: the decisions
 * live here, where the vitest jsdom project collects them, and the
 * button that calls this decides nothing. The DOM this module touches
 * - `navigator`, a detached `<video>`, a detached `<canvas>` — is
 * what the jsdom project is for, and `capture.test.ts` hands it the
 * two elements jsdom cannot really provide.
 *
 * ## Mutation note — what the colocated cases actually catch
 *
 * A green suite is not evidence a case can fail. Each leg below was
 * measured by breaking this file, reds `bun x vitest run
 * src/features/feedback/capture.test.ts` from `packages/dev-tools`
 * against the 18 cases the file holds, and restores this file
 * byte-identical (the harness compared a SHA-256 of the restored text
 * to the original's, every leg):
 *
 * - Dropping {@link stopEveryTrack} from the `finally` answers `Tests
 *   11 failed | 7 passed (18)`: the ten refusals that reach a granted
 *   stream, plus `stops every track of the stream it captured`. "The
 *   tracks are stopped" is asserted on the refusing paths and not only
 *   on the one that produced a PNG, which is what makes the leg this
 *   wide; the three refusals left standing are the two where the API
 *   is absent and the one where the dialog is cancelled, which have no
 *   stream to stop.
 * - Waiting on `loadedmetadata` rather than `loadeddata` answers `8
 *   failed | 10 passed`: every case whose element reports a frame —
 *   the five accepting ones and the three refusals past the wait. The
 *   cases fire the later event only, which is the point — an element
 *   that has dimensions has not yet decoded anything to draw.
 * - Removing the `ended` listener on the TRACK answers `1 failed | 17
 *   passed`: `answers null when the track ends before a frame
 *   arrives`. The element's own `ended` does not stand in for it: the
 *   case fires one and not the other.
 * - Removing the already-`ended` half of the up-front guard answers `1
 *   failed | 17 passed`: `answers null when the track has already
 *   ended`, which reds as `Error: Test timed out in 5000ms.` rather
 *   than as a wrong value — nothing is left that can settle the wait.
 * - Dropping `video.srcObject = null` answers `2 failed | 16 passed`:
 *   `leaves nothing attached or listening once it has the frame` and
 *   `answers null when the track ends before a frame arrives`.
 * - Dropping `video.muted = true` answers `1 failed | 17 passed`:
 *   `leaves nothing attached or listening once it has the frame`.
 * - Dropping the zero-dimension guard answers `1 failed | 17 passed`:
 *   `answers null when the frame has no dimensions`.
 * - Dropping the `catch` on the `play()` promise answers `1 failed |
 *   17 passed`: `answers null when the element cannot play the
 *   stream`, again as a timeout (`Error: Test timed out in 5000ms.`,
 *   with the now-unhandled rejection reported beside it), because a
 *   rejected play is the only thing that case gives the wait to
 *   settle on.
 * - Asking for `preferCurrentTab: false` answers `1 failed | 17
 *   passed`: `asks the prompt for the current tab, video only`.
 * - Dropping the listener removal from `settle` answers `3 failed | 15
 *   passed`: the two cases that count listeners after a refusal and
 *   the one that counts them after a frame.
 * - Drawing with `drawImage(video, 0, 0)` — the overload that takes
 *   the frame's intrinsic size — answers `1 failed | 17 passed`:
 *   `draws the element it attached the stream to, once, whole`.
 * - Rethrowing out of the prompt's `catch` instead of answering `null`
 *   answers `1 failed | 17 passed`: `answers null when the dialog is
 *   cancelled`.
 *
 * `bun x tsc --noEmit` exits `0` under ALL TWELVE, measured one by
 * one: every leg above is a behaviour change over types that still
 * line up, so `check-types` would never report one.
 *
 * One leg the suite does NOT catch, and what does. Deleting the
 * `typeof devices?.getDisplayMedia !== 'function'` guard in
 * {@link requestDisplayStream} answers `Tests  18 passed (18)`: an
 * absent API throws a `TypeError` inside the same `try`, and the
 * `catch` answers the same `null` from one line further down, so no
 * case can tell the two apart. `bun x tsc --noEmit` is what refuses
 * it — exit `2`, `error TS18048: 'devices' is possibly 'undefined'`
 * against the `getDisplayMedia` call below (the line and column it
 * names move with this comment, so they are not quoted) — so the
 * guard is enforced by the type checker, and the cases prove the
 * ANSWER rather than the route to it. Removing the guard and the
 * `catch` together answers `3 failed | 15 passed`: both absent-API
 * cases and the cancelled dialog.
 */

/**
 * The type a capture answers, and the only type it answers.
 *
 * Exported because more than this module cares: `./submitRules.ts`
 * refuses an attachment that is neither PNG nor JPEG, and a report
 * whose two halves disagreed about the spelling of this string would
 * refuse the widget's own screenshot.
 */
export const FEEDBACK_CAPTURE_MIME = 'image/png';

/**
 * `getDisplayMedia`'s options, plus the one key TypeScript omits.
 *
 * See this module's documentation: `preferCurrentTab` is real, is
 * what spec decision 3 names, and is absent from
 * `DisplayMediaStreamOptions` in TypeScript 5.9.3. Widened here so
 * {@link DISPLAY_MEDIA_OPTIONS} is a plain typed constant rather than
 * a cast at the call.
 */
interface DisplayMediaOptions extends DisplayMediaStreamOptions {
  /** Chromium's hint to list this tab first. Ignored elsewhere. */
  readonly preferCurrentTab?: boolean;
}

/** Exactly what the display-capture prompt is asked for. */
const DISPLAY_MEDIA_OPTIONS: DisplayMediaOptions = {
  video: true,
  audio: false,
  preferCurrentTab: true,
};

/**
 * Ask the browser for a display stream.
 *
 * @returns The stream the user granted, or `null` when the API is
 * absent, incomplete, or refused the request for any reason.
 */
async function requestDisplayStream(): Promise<MediaStream | null> {
  // Typed non-optional in `lib.dom.d.ts` and genuinely absent on a
  // non-secure origin, so the cast is what lets the guard exist.
  const devices = navigator.mediaDevices as MediaDevices | undefined;

  if (typeof devices?.getDisplayMedia !== 'function') {
    return null;
  }

  try {
    return await devices.getDisplayMedia(DISPLAY_MEDIA_OPTIONS);
  } catch {
    // The cancelled dialog lands here, and so does every browser that
    // refuses display capture outright. Both mean "no screenshot".
    return null;
  }
}

/**
 * Stop every track of a stream, video and audio alike.
 *
 * Called from a `finally`, so the browser's "sharing this tab"
 * indicator goes away whether a frame was drawn or the attempt was
 * refused halfway. A capture that left a track live would leave the
 * page recording the screen after the drawer was closed.
 *
 * @param stream - What the prompt granted.
 */
function stopEveryTrack(stream: MediaStream): void {
  for (const track of stream.getTracks()) {
    track.stop();
  }
}

/**
 * Wait for the first frame, or for whatever says there will not be
 * one.
 *
 * Playback is started from inside, after the listeners are attached,
 * because `play()` is what makes a `MediaStream` element decode and
 * both of its failure shapes — a synchronous throw and a rejected
 * promise — have to reach the same settle as the events do.
 *
 * @param video - The detached element the stream is attached to.
 * @param track - The video track being watched for an early end.
 * @returns `true` when a frame is there to draw, `false` otherwise.
 */
function waitForFirstFrame(
  video: HTMLVideoElement,
  track: MediaStreamTrack,
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const removers: (() => void)[] = [];

    const settle = (arrived: boolean): void => {
      while (removers.length > 0) {
        removers.pop()?.();
      }

      resolve(arrived);
    };

    const on = (target: EventTarget, type: string, arrived: boolean): void => {
      const listener = (): void => settle(arrived);

      target.addEventListener(type, listener);
      removers.push(() => target.removeEventListener(type, listener));
    };

    // `ended` on the element fires when every track of the stream has
    // ended; `ended` on the track fires when that one has. A tab
    // shared and then stopped can produce either first.
    on(video, 'loadeddata', true);
    on(video, 'error', false);
    on(video, 'ended', false);
    on(track, 'ended', false);

    try {
      const started: unknown = video.play();

      if (started instanceof Promise) {
        started.catch(() => settle(false));
      }
    } catch {
      // A browser that throws where it should reject.
      settle(false);
    }
  });
}

/**
 * Encode a canvas as a PNG.
 *
 * @param canvas - The canvas one frame was drawn onto.
 * @returns The PNG, or `null` where the browser could not encode it.
 */
function encodePng(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, FEEDBACK_CAPTURE_MIME);
  });
}

/**
 * Draw the frame the element is showing and encode it.
 *
 * The canvas is sized to the frame's own pixels rather than to the
 * element's layout box: the element is detached and never laid out,
 * and a screenshot scaled to a CSS size would be a screenshot of
 * nothing anyone saw.
 *
 * @param video - An element with a frame ready to draw.
 * @returns The PNG, or `null` where the browser could not draw it.
 */
async function paintFrame(video: HTMLVideoElement): Promise<Blob | null> {
  const width = video.videoWidth;
  const height = video.videoHeight;

  if (width <= 0 || height <= 0) {
    return null;
  }

  const canvas = document.createElement('canvas');

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');

  if (context === null) {
    return null;
  }

  context.drawImage(video, 0, 0, width, height);

  return await encodePng(canvas);
}

/**
 * Attach a granted stream to a detached element and draw one frame.
 *
 * The element is muted and `playsInline` because an autoplaying video
 * with sound is blocked outright by every browser's autoplay policy,
 * and iOS takes an unmarked one fullscreen. Neither is cosmetic: both
 * are the difference between a frame and a refusal.
 *
 * @param stream - What the prompt granted.
 * @returns The PNG, or `null` at any of the refusals this module
 * documents.
 */
async function drawFirstFrame(stream: MediaStream): Promise<Blob | null> {
  const [track] = stream.getVideoTracks();

  // An audio-only grant has no frame to give, and a track that ended
  // between the grant and this line never will either.
  if (track === undefined || track.readyState === 'ended') {
    return null;
  }

  const video = document.createElement('video');

  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;

  try {
    const arrived = await waitForFirstFrame(video, track);

    return arrived
      ? await paintFrame(video)
      : null;
  } finally {
    // The tracks are stopped by the caller; this drops the element's
    // own reference to the stream so nothing holds it after the
    // capture, whichever way the capture went.
    video.srcObject = null;
  }
}

/**
 * Take one screenshot through the browser's display-capture prompt.
 *
 * Answers a PNG of a single frame, or `null` — never a throw, and
 * never a rejection. Every track of the granted stream is stopped
 * before this resolves, including on the refusing paths and including
 * the audio tracks a browser handed over despite being asked for
 * none.
 *
 * The bytes are the caller's: nothing here keeps a reference, sends
 * one anywhere or writes one to storage.
 *
 * @returns The captured frame as an `image/png` {@link Blob}, or
 * `null` where no frame could be captured.
 */
export async function captureScreen(): Promise<Blob | null> {
  const stream = await requestDisplayStream();

  if (stream === null) {
    return null;
  }

  try {
    return await drawFirstFrame(stream);
  } catch {
    // Whatever this browser did that the documented refusals do not
    // name. A report without a screenshot beats a drawer that threw.
    return null;
  } finally {
    stopEveryTrack(stream);
  }
}
