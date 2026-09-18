/**
 * @packageDocumentation
 * The surfaces' decisions that are statable as a value: what the
 * shell's `role="status"` region says about an action, and whether a
 * pointer press landed outside a floating surface.
 *
 * `./ActionItem.tsx` and `./Popover.tsx` own the DOM — an effect that
 * runs a feature's `run(host)`, an element promoted to the platform
 * top layer, a listener on the document. Everything either of them
 * decides that is a plain function of plain values lives here, which
 * is the package's two-runner discipline as `../../../vitest.config.ts`
 * states it: the jsdom vitest project collects `.ts` only, so a
 * decision left inside a `.tsx` is reachable by the forced Playwright
 * spec and by nothing else. A sentence read aloud to an operator and
 * a predicate over a pointer target are both exactly the kind of
 * thing worth pinning by a unit case, so they are here and the two
 * components call them.
 *
 * The module is pure: no state between calls, no storage, no request,
 * and no DOM read beyond the `contains` call {@link isOutsidePress}
 * is. It imports nothing at all.
 *
 * ## Why an action announces three different things
 *
 * The task requires one of the three: a rejection reported in the
 * `role="status"` region. The other two are what make the required
 * one reachable without eyes. `./ActionItem.tsx` draws its pending
 * card `aria-hidden`, because the card and the region would otherwise
 * say the same thing twice to a screen reader; that leaves the region
 * as the ONLY channel an action has, and a channel that speaks on
 * failure alone is silent for the whole of a long run and silent
 * again when it succeeds.
 *
 * So: {@link describeActionStart} when a promise came back and there
 * is therefore something to wait for, {@link describeActionDone} when
 * it settles, {@link describeActionFailure} when it rejects. An
 * action that returns no promise announces its outcome only — there
 * was no wait to narrate, and two utterances in one microtask are one
 * utterance in every screen reader that coalesces a polite region.
 *
 * ## The reason is read defensively, and the reason for that
 *
 * A rejection value is whatever the feature threw, and a feature is
 * third-party code by construction — the shell imports no feature
 * module. So {@link readFailureReason} treats it as hostile input:
 * a rejection with no `Error` in it, a cross-realm `Error` that fails
 * `instanceof`, an object with a `message` getter that throws, an
 * `Object.create(null)` with no `toString`, and a 40,000-character
 * stack dump are all shapes it answers a sentence for rather than
 * shapes it throws over. A throw here would escape the `.then` in
 * `./ActionItem.tsx` as an unhandled rejection, which is precisely
 * the thing the task says must not happen.
 *
 * `instanceof Error` is not used at all, for the cross-realm reason:
 * an `Error` from an iframe or from a worker realm is not an instance
 * of the realm's `Error`, and a feature that fetches through one is
 * not an exotic hypothesis. The duck read — a string `message`, then
 * a string `name` — covers the native case, the cross-realm case and
 * the plain `{ message }` object thrown by a hand-rolled API client,
 * in one branch.
 *
 * `[object Object]` is suppressed rather than announced: it is what
 * `String()` answers for every object that has nothing to say, and a
 * live region reading it aloud tells the operator strictly less than
 * `unknown error` does.
 *
 * ## Mutation note — what the colocated cases actually catch
 *
 * A green suite is not evidence a case can fail. Each leg below was
 * measured by breaking this file, reds `bun x vitest run
 * src/core/surfaces/surfaceRules.test.ts` from `packages/dev-tools`
 * against the 25 cases `./surfaceRules.test.ts` holds, and restores
 * this file byte-identical (compared in full, every leg):
 *
 * - Deleting the `try`/`catch` in {@link readFailureReason}, so a
 *   hostile reason throws out of it, answers `Tests  2 failed | 23
 *   passed (25)`: `answers the fallback for a reason whose message
 *   getter throws` and `answers the fallback for an object with no
 *   prototype`. Both are the no-throw guarantee, and the second is
 *   the one a `message` getter alone would not have caught — it is
 *   `String()` that throws there, not the property read.
 * - Dropping the truncation, so a long reason is answered whole,
 *   answers `1 failed | 24 passed` — `cuts a reason longer than the
 *   cap and marks the cut`.
 * - Letting `[object Object]` through answers `1 failed | 24 passed`
 *   — `answers the fallback rather than [object Object] for an
 *   object with nothing to say`.
 * - Dropping the `name` fallback answers `1 failed | 24 passed` —
 *   `reads the name of a cross-realm error carrying no message`. That
 *   case exists BECAUSE the first shape of this note was wrong: the
 *   obvious case for the branch, a native `new TypeError('')`,
 *   answers `TypeError` with the branch deleted, so the first run of
 *   this mutation came out `24 passed (24)` and green. `String()` on
 *   a native error answers its name when the message is empty
 *   (measured: `String(new TypeError('')) === 'TypeError'`), so the
 *   `String` fallback below silently covers the native case and the
 *   branch is load-bearing for a NON-error carrier alone. The case
 *   was added to pin what the branch actually does.
 * - Inverting {@link isOutsidePress}'s `contains` answers `3 failed |
 *   22 passed`: the two refusals for a press on the surface and on a
 *   node inside it, and the one acceptance for a press outside.
 * - Answering `true` for a target that is not a `Node` answers `1
 *   failed | 24 passed` — `refuses a target that is not a node`.
 *   That is the leg that stops a synthetic event with a plain-object
 *   target from dismissing a surface.
 * - Letting {@link isPromiseLike} answer `true` for any object
 *   answers `2 failed | 23 passed`: `refuses a value that is not
 *   thenable` and `refuses an object whose then is not callable`.
 *
 * `check-types` reports none of the seven: every mutation above is a
 * behaviour change inside a signature that still holds, and `bun x
 * tsc --noEmit` exited 0 over all of them (measured, each leg). The
 * suite is the only gate that can say this module still means what
 * it says.
 */

/** U+2026 HORIZONTAL ELLIPSIS: one character, never three dots. */
const ELLIPSIS = '\u2026';

/**
 * How many characters of a rejection reason reach the live region.
 *
 * A rejection may carry a serialised response body or a stack, and a
 * polite region reads what it is given. Exported so the colocated
 * case pins the number rather than a copy of it.
 */
export const DEVTOOLS_STATUS_REASON_MAX = 200;

/**
 * What a nameless action is called in the region.
 *
 * A `MenuItem` is typed with a required `label`, so this is reached
 * only by a feature that passed the empty string or whitespace —
 * third-party code, and therefore a shape to answer rather than to
 * trust.
 */
const FALLBACK_LABEL = 'Action';

/** What the region says when the rejection carried nothing readable. */
const UNKNOWN_REASON = 'unknown error';

/** What `String()` answers for an object with nothing to say. */
const USELESS_STRING = '[object Object]';

/**
 * The label, or a stand-in when the feature gave none.
 *
 * @param label - The menu row's label, as the feature wrote it.
 * @returns A non-empty name for the region to use.
 */
function readLabel(label: string): string {
  const trimmed = label.trim();

  return trimmed === ''
    ? FALLBACK_LABEL
    : trimmed;
}

/**
 * Whether a value is a thenable, and so something to wait for.
 *
 * Duck-typed rather than `instanceof Promise`: a feature may return a
 * promise from another realm or from a library that predates native
 * ones, and both await correctly. The answer is a plain `boolean`
 * rather than a type predicate on purpose — the caller's value is
 * already typed `void | Promise<void>` by the contract, so it needs
 * the question answered and not the type narrowed.
 *
 * @param value - Whatever `run(host)` answered.
 * @returns `true` when awaiting it would actually wait.
 */
export function isPromiseLike(value: unknown): boolean {
  if (typeof value !== 'object' && typeof value !== 'function') {
    return false;
  }

  if (value === null) {
    return false;
  }

  return typeof (value as { then?: unknown }).then === 'function';
}

/**
 * The most readable string a rejection value carries, before the cap.
 *
 * May throw: every property read below is on an object a feature
 * owns. {@link readFailureReason} is where that is caught.
 *
 * @param reason - Whatever was thrown or rejected with.
 * @returns The text, or the empty string when there is none.
 */
function rawReason(reason: unknown): string {
  if (typeof reason === 'string') {
    return reason;
  }

  if (reason === null || reason === undefined) {
    return '';
  }

  if (typeof reason === 'object' || typeof reason === 'function') {
    const carrier = reason as { message?: unknown; name?: unknown };

    if (typeof carrier.message === 'string' && carrier.message.trim() !== '') {
      return carrier.message;
    }

    if (typeof carrier.name === 'string' && carrier.name.trim() !== '') {
      return carrier.name;
    }
  }

  const text = String(reason);

  return text === USELESS_STRING
    ? ''
    : text;
}

/**
 * What a rejection reads as in the shell's `role="status"` region.
 *
 * Never throws, whatever it is handed: see this module's header for
 * the five hostile shapes that drove each branch.
 *
 * @param reason - Whatever was thrown or rejected with.
 * @returns One line, never empty, never longer than
 * {@link DEVTOOLS_STATUS_REASON_MAX}.
 */
export function readFailureReason(reason: unknown): string {
  let text: string;

  try {
    text = rawReason(reason).trim();
  } catch {
    // A `message` getter that throws, or an object with no prototype
    // and so no `toString`. Either way the operator gets a sentence.
    text = '';
  }

  if (text === '') {
    return UNKNOWN_REASON;
  }

  if (text.length <= DEVTOOLS_STATUS_REASON_MAX) {
    return text;
  }

  const cut = text.slice(0, DEVTOOLS_STATUS_REASON_MAX - 1).trimEnd();

  return `${cut}${ELLIPSIS}`;
}

/**
 * What the region says as a returned promise starts being waited on.
 *
 * @param label - The menu row's label.
 * @returns One line.
 */
export function describeActionStart(label: string): string {
  return `Running ${readLabel(label)}${ELLIPSIS}`;
}

/**
 * What the region says when the action settled without rejecting.
 *
 * @param label - The menu row's label.
 * @returns One line.
 */
export function describeActionDone(label: string): string {
  return `${readLabel(label)} finished`;
}

/**
 * What the region says when the action rejected or threw.
 *
 * @param label - The menu row's label.
 * @param reason - Whatever was thrown or rejected with.
 * @returns One line, the reason already read and capped.
 */
export function describeActionFailure(label: string, reason: unknown): string {
  return `${readLabel(label)} failed: ${readFailureReason(reason)}`;
}

/**
 * Whether a pointer press landed outside a floating surface.
 *
 * Containment is asked of the DOM tree, which the platform top layer
 * does not move: a `popover="manual"` element is painted above
 * everything and is still a child of `[data-devtools-root]`, so
 * `contains` answers about it exactly as it does about any other
 * element.
 *
 * Both refusals are deliberate rather than defensive. A `null`
 * surface means the caller has nothing to be outside OF, and a target
 * that is not a `Node` — a synthetic event, or an event from another
 * document — is a thing no reading can be taken of. Dismissing on
 * either would be dismissing on ignorance.
 *
 * @param target - The event's target.
 * @param surface - The floating element, or `null` before React has
 * attached it.
 * @returns `true` only when a reading could be taken and it was
 * outside.
 */
export function isOutsidePress(
  target: EventTarget | null,
  surface: HTMLElement | null,
): boolean {
  if (surface === null) {
    return false;
  }

  if (!(target instanceof Node)) {
    return false;
  }

  return !surface.contains(target);
}
