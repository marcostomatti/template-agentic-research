/**
 * @packageDocumentation
 * Window-level failure capture: the two listeners that turn an
 * uncaught error and an unhandled promise rejection into `error`
 * payloads on the bus.
 *
 * `.rafa/specs/q20b-3-error-boundary-provider.md`'s decision 4 is the
 * authority, and it puts this half in the PACKAGE rather than in the
 * app for one reason: a window listener needs no React tree. The app's
 * own `AppErrorBoundary` can only see what renders under it — a throw
 * inside a `setTimeout`, a rejected fetch nobody caught, a script that
 * failed to parse all happen outside every boundary — so the two
 * halves do not overlap and neither replaces the other.
 *
 * ## What it publishes, and what it does NOT
 *
 * One {@link DevToolsGlobalErrorPayload} per event on the bus's
 * `error` topic: the message, the first stack frame,
 * `location.href` and a `Date.now()` stamp. That is the whole list
 * decision 4 names, and nothing here grows it — no `navigator`
 * string, no storage read, no request. Decision 6 is law: this module
 * sends nothing anywhere, and `bus.publish` is the only thing it
 * calls that a caller can observe.
 *
 * The payload deliberately carries no error NAME, unlike the app's own
 * `AppErrorSignal`. A boundary catches a value it knows is a render
 * failure and can afford to describe it; this one summarises whatever
 * the window handed over, and the four members above are what a report
 * block shows.
 *
 * Nothing is prevented either. The handlers do not call
 * `preventDefault`, so the browser still logs the failure to the
 * console exactly as it would with the widget absent: a dev tool that
 * silenced the platform's own reporting would make its presence change
 * what a developer sees.
 *
 * ## The bus is a parameter, and the default is the singleton
 *
 * `installGlobalCapture()` with no argument publishes on
 * {@link devtoolsBus}, which is what the bridge in the host app calls.
 * The parameter exists so a caller can hand in a bus of its own —
 * every case in `globalCapture.test.ts` builds one with
 * `createDevToolsBus()`, so no case can leak a payload into the
 * singleton's ring and be read by the next one.
 *
 * ## No node builtin, no React, no DOM beyond three window members
 *
 * The module imports `./types` (types only) and `./bus` (the
 * singleton) and nothing else. It touches `window.addEventListener`,
 * `window.removeEventListener` and `window.location.href`, which is
 * why its cases run under the jsdom vitest project — the one
 * collecting `src/{core,features}/**\/*.test.ts` — rather than under
 * the node one.
 *
 * There is no `typeof window === 'undefined'` guard. The call site is
 * the dev-only bridge, which runs in a browser by construction, and a
 * guard would be a branch no case could red honestly: under the jsdom
 * project `window` always exists, so the refusal leg would be dead
 * code asserted by nothing. A server-side caller gets a
 * `ReferenceError` naming `window`, which says more than a silent
 * no-op that installs nothing and answers a disposer anyway.
 *
 * ## Installing twice installs twice
 *
 * Each call adds its own pair of listeners and answers its own
 * disposer, so two installs publish two payloads per event. The
 * listeners are fresh closures, so `addEventListener`'s own identity
 * de-duplication cannot collapse them. This is not guarded against:
 * the bridge installs once, and a module-level "already installed"
 * flag would make the second caller's disposer a lie — it would take
 * down the FIRST caller's listeners or nothing at all, and neither is
 * something a caller can reason about.
 *
 * ## The disposer is idempotent, like the bus's
 *
 * Calling it a second time does nothing, for the reason `./bus.ts`
 * gives: a React effect cleanup can run twice under StrictMode, and a
 * disposer that blindly removed "the listener" a second time would be
 * harmless here but the flag is what keeps the shape one thing across
 * the package.
 *
 * ## Mutation note — what the colocated cases actually catch
 *
 * A green suite is not evidence a case can fail. Each leg below was
 * measured by breaking this file, reds `bun x vitest run --project
 * jsdom src/core/globalCapture.test.ts` from `packages/dev-tools`
 * against the 11 cases the file holds, and restores this file
 * byte-identical (`diff -q` confirmed, every leg):
 *
 * - Dropping the `error` `addEventListener` answers `Tests  8 failed
 *   | 3 passed (11)`, and dropping the `unhandledrejection` one `6
 *   failed | 5 passed`. The three cases that survive the first are the
 *   rejection-only ones; the five that survive the second are the
 *   error-only ones. Both blast radii are wide because most cases read
 *   a payload rather than an installation, which is the intended
 *   shape: no case asserts that `addEventListener` was CALLED.
 * - Removing `window.removeEventListener('unhandledrejection', …)`
 *   from the disposer answers `1 failed | 10 passed`, the one being
 *   `stops publishing once the disposer has removed both listeners` —
 *   it reds as `expected 3 to be 2`, which is the reading that makes
 *   that case about BOTH listeners rather than about either.
 * - Removing the `error` half of the disposer instead answers `2
 *   failed | 9 passed`: the same case, plus `leaves a second install
 *   listening when the first is disposed`.
 * - Publishing on `route` rather than on `error` answers `6 failed | 5
 *   passed`, and `publishes on error only, never on the other three
 *   topics` is among them. That case is what stands between a capture
 *   and the `open-item` topic the shell ACTS on.
 * - Returning the whole stack from {@link firstStackFrame} answers `3
 *   failed | 8 passed`, and dropping its `at ` preference — always
 *   answering the first line — answers the same three: `publishes the
 *   message, first stack frame, href and timestamp`, `reads the
 *   message and stack of an error-like reason` and `publishes a real
 *   Error reason the way an error event does`. So the V8 message line
 *   being skipped is pinned, not assumed.
 * - Dropping the error-like `message` leg from {@link describeThrown}
 *   answers `1 failed | 10 passed`, and dropping the `'stack' in
 *   thrown` leg from {@link stackOf} answers the same one case —
 *   `reads the message and stack of an error-like reason`, which is
 *   the only case built on a value that fails `instanceof Error` while
 *   carrying both members.
 * - Dropping the {@link DEVTOOLS_UNKNOWN_FAILURE} fallback answers `1
 *   failed | 10 passed`, the one being `never publishes an empty
 *   message`. Leaving the fallback's `.trim()` off answers the same
 *   count, the one being `falls back to the event message when the
 *   event carries no error`.
 * - Preferring the EVENT's message over the thrown value's answers `1
 *   failed | 10 passed`, the one being `publishes the message, first
 *   stack frame, href and timestamp`, whose event message is the
 *   platform's `Uncaught Error: …` form of the same sentence. That is
 *   the whole of what pins the order of those two.
 * - Freezing `href` to a constant answers `4 failed | 7 passed`, and
 *   `reads href at capture time rather than at read time` is among
 *   them. Freezing `at` to `0` answers `1 failed | 10 passed`, the one
 *   being the payload case, which bounds the stamp between two
 *   readings of the same clock.
 *
 * One reading came back GREEN and is recorded because it says where
 * this file's cases stop. Dropping the `disposed` flag from the
 * disposer — leaving it two bare `removeEventListener` calls — answers
 * `Tests  11 passed (11)`. Removing a listener that is already gone is
 * a no-op in the DOM, so the second call of a bare disposer is
 * harmless and NOTHING can red the flag's absence. The flag is kept
 * for one reason only: every disposer in this package behaves the same
 * way, `./bus.ts`'s is one a second call genuinely breaks, and a
 * reader should not have to check which kind they are holding.
 * `stops publishing once the disposer has removed both listeners`
 * still calls it twice, so the flag being WRONG — a second call that
 * threw or re-published — would red; only its absence is invisible.
 */

import type { DevToolsBus } from './types';

import { devtoolsBus } from './bus';

/**
 * What a global capture publishes on the bus's `error` topic.
 *
 * The topic's declared payload is `unknown` — `./types.ts` says why:
 * the app's own producers settle their shapes and the widget only
 * summarises them. This interface is therefore a description of what
 * THIS producer publishes, not a narrowing of the topic, and a reader
 * of `recent('error', n)` still meets `unknown` and still checks.
 *
 * Every member is a primitive, so the payload can be read, stored in a
 * ring and serialised into a report without carrying a reference to
 * the `Error` it came from — which would pin the whole closure chain
 * of a failed frame in memory for as long as the ring held it.
 */
export interface DevToolsGlobalErrorPayload {
  /**
   * What failed, in one line.
   *
   * The `Error`'s own `message` where there was an `Error`, a
   * description of the value where something else was thrown, the
   * event's own `message` where the platform gave one and the thrown
   * value said nothing, and {@link DEVTOOLS_UNKNOWN_FAILURE} where
   * none of the three said anything at all. Never empty.
   */
  readonly message: string;

  /**
   * The first frame of the stack, trimmed, or `''` where there is
   * none.
   *
   * One frame rather than the whole stack: the ring holds twenty of
   * these and a report shows them as lines, so the site of the
   * failure is what earns the space. A non-`Error` rejection reason
   * carries no stack at all and answers `''`.
   */
  readonly topFrame: string;

  /**
   * `location.href` when the failure was captured.
   *
   * Read at capture time rather than at report time, because a
   * failure that navigates — or that the operator navigates away from
   * before reporting — would otherwise be filed against the wrong
   * route.
   */
  readonly href: string;

  /**
   * `Date.now()` when the failure was captured.
   *
   * Epoch milliseconds rather than an ISO string, so a reader can
   * order and subtract without parsing. The ring is already
   * newest-first, so this is for showing "how long ago" rather than
   * for sorting.
   */
  readonly at: number;
}

/**
 * The message used when nothing said anything.
 *
 * Reachable three ways: a rejection with a reason of `undefined`
 * (`Promise.reject()`), an `Error` whose message is empty, and a
 * cross-origin script error, where the platform blanks both the
 * event's `message` and its `error`. A payload with an empty
 * `message` would render as a blank row in a report, which reads as a
 * bug in the widget rather than as what actually happened.
 */
const DEVTOOLS_UNKNOWN_FAILURE = 'An unknown failure reached the window.';

/**
 * Say what a thrown or rejected value was, in one line.
 *
 * A `throw` and a `Promise.reject` both take any value at all, so this
 * is a boundary and is read like one: an `Error` is its message, a
 * string is itself, another primitive is its `String` form, an object
 * carrying a non-empty string `message` is that message, and any other
 * object is its JSON form when it has a useful one and its
 * `Object.prototype.toString` tag when it does not. A cycle throws
 * inside `JSON.stringify`, which is caught here rather than allowed to
 * replace a captured failure with a serialiser failure inside the tool
 * that captures failures.
 *
 * @param thrown - Whatever the event carried.
 * @returns A trimmed line, or `''` when the value says nothing — which
 * is the caller's cue to fall back.
 */
function describeThrown(thrown: unknown): string {
  if (thrown instanceof Error) {
    return thrown.message.trim();
  }

  if (thrown === undefined || thrown === null) {
    return '';
  }

  if (typeof thrown === 'string') {
    return thrown.trim();
  }

  if (typeof thrown !== 'object') {
    return String(thrown);
  }

  // An error-LIKE object: a structured-cloned `Error` from a worker, a
  // rejection built by a library that never threw. It fails
  // `instanceof` and its JSON form is `{}` — `Error`'s own members are
  // not enumerable — so without this leg the one thing it says would
  // be replaced by its tag.
  const message = (thrown as { readonly message?: unknown }).message;

  if (typeof message === 'string' && message.trim() !== '') {
    return message.trim();
  }

  try {
    const json = JSON.stringify(thrown);

    return typeof json === 'string' && json !== '{}'
      ? json
      : Object.prototype.toString.call(thrown);
  } catch {
    // A cycle, a throwing `toJSON` or a BigInt member. The tag still
    // says what kind of thing it was.
    return Object.prototype.toString.call(thrown);
  }
}

/**
 * Read whatever the value calls a stack, without trusting it.
 *
 * The `instanceof` leg is not enough on its own: an `Error` built in
 * another realm — an iframe, a worker message — fails it while still
 * carrying a perfectly good `stack`, so the property check answers for
 * those. Neither leg reads a value's type; {@link firstStackFrame} is
 * where a non-string is refused.
 *
 * @param thrown - Whatever the event carried.
 * @returns The value's `stack` member, of whatever type, or
 * `undefined`.
 */
function stackOf(thrown: unknown): unknown {
  if (thrown instanceof Error) {
    return thrown.stack;
  }

  if (typeof thrown === 'object' && thrown !== null && 'stack' in thrown) {
    return (thrown as { readonly stack: unknown }).stack;
  }

  return undefined;
}

/**
 * The first frame of a stack, trimmed.
 *
 * Engines disagree about the first LINE: V8 repeats the message there
 * and the frames follow, while SpiderMonkey and JavaScriptCore start
 * at the first frame. So a frame line is preferred — `at ` is V8's
 * marker — and the first line is the fallback for the engines that do
 * not write one.
 *
 * @param stack - A value's `stack` member, of whatever type.
 * @returns The frame, or `''` where the value was not a string or held
 * no non-empty line.
 */
function firstStackFrame(stack: unknown): string {
  if (typeof stack !== 'string') {
    return '';
  }

  const lines = stack
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');

  return lines.find((line) => line.startsWith('at ')) ?? lines[0] ?? '';
}

/**
 * Build the payload for one captured failure.
 *
 * @param thrown - The `Error` or other value the event carried.
 * @param eventMessage - What the EVENT itself said, used only where
 * {@link thrown} said nothing. `''` for a rejection, which carries no
 * message of its own.
 * @returns The four members, every one of them filled.
 */
function capturePayload(
  thrown: unknown,
  eventMessage: string,
): DevToolsGlobalErrorPayload {
  // The event's own message is the fallback rather than the first
  // choice: the platform writes `Uncaught TypeError: ...` there, and
  // the thrown value's own message is the same sentence without the
  // ceremony.
  const described = describeThrown(thrown);
  const said = described === ''
    ? eventMessage.trim()
    : described;

  return {
    message: said === ''
      ? DEVTOOLS_UNKNOWN_FAILURE
      : said,
    topFrame: firstStackFrame(stackOf(thrown)),
    href: window.location.href,
    at: Date.now(),
  };
}

/**
 * Listen for window-level failures and publish each one on the bus.
 *
 * Installs an `error` listener and an `unhandledrejection` listener on
 * `window`, each publishing one {@link DevToolsGlobalErrorPayload} on
 * the `error` topic. Call it once, from the dev-only bridge, after the
 * widget has decided to mount.
 *
 * @param bus - Where to publish. Defaults to {@link devtoolsBus}, the
 * one bus an app has; pass one in to keep a caller's payloads out of
 * the shared ring.
 * @returns A disposer removing BOTH listeners. Calling it more than
 * once is harmless.
 */
export function installGlobalCapture(
  bus: DevToolsBus = devtoolsBus,
): () => void {
  const onError = (event: ErrorEvent): void => {
    // `ErrorEvent.error` is `any` in the DOM lib; narrowed to
    // `unknown` on the way in so nothing below can read a member of it
    // unchecked.
    const thrown: unknown = event.error;

    bus.publish('error', capturePayload(
      thrown,
      typeof event.message === 'string'
        ? event.message
        : '',
    ));
  };

  const onRejection = (event: PromiseRejectionEvent): void => {
    // Same narrowing, and the reason is far likelier than `error` to
    // be something other than an `Error`: a rejected fetch wrapper
    // hands back a response, a rejected `Promise.reject('nope')` a
    // string.
    const reason: unknown = event.reason;

    // No fallback message: a rejection event carries no message of its
    // own, so `describeThrown` and the unknown-failure line are the
    // whole of what can be said.
    bus.publish('error', capturePayload(reason, ''));
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);

  // Not load-bearing, and measured so: removing a listener that is
  // already gone is a no-op in the DOM, so dropping this flag reds
  // nothing (see the mutation note). It is here so every disposer in
  // the package reads the same way as `./bus.ts`'s, where a second
  // call genuinely does damage without it.
  let disposed = false;

  return () => {
    if (disposed) {
      return;
    }

    disposed = true;
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
}
