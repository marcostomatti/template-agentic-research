import type { DevToolsGlobalErrorPayload } from './globalCapture';
import type { DevToolsBus } from './types';

import { afterEach, describe, expect, it } from 'vitest';

import { createDevToolsBus } from './bus';
import { installGlobalCapture } from './globalCapture';

/**
 * ## What this file pins, and how
 *
 * `globalCapture.ts` needs a `window` and nothing else, so every case
 * below installs on the jsdom one, dispatches a synthetic event and
 * reads what reached a bus of its own. It imports no node builtin and
 * renders nothing: the jsdom vitest project collects it because that
 * is the project collecting `src/core/**\/*.test.ts`, and the DOM it
 * needs is three members of `window`.
 *
 * Each case builds its bus with `createDevToolsBus()` rather than
 * reaching for the `devtoolsBus` singleton the default parameter
 * names. Two reasons: the singleton's ring would carry one case's
 * payloads into the next, and the ring holds twenty per topic, so a
 * leak would not even show up as an overflow until the file grew.
 *
 * The events are SYNTHETIC. jsdom raises neither an uncaught error
 * nor an unhandled rejection at the window the way a browser does, so
 * a case that threw inside a timer would prove nothing about the
 * listener — it would prove something about jsdom's reporting. What
 * is pinned here is therefore the listener's reading of an event of
 * each kind; that a real browser dispatches those events at `window`
 * is the platform's contract, and the forced Playwright spec is where
 * the end-to-end shape belongs.
 *
 * The refusals come first, as they do in every test file in this
 * package: nothing published before an event, nothing published after
 * the disposer, and no empty message. Each carries its own control,
 * because "nothing arrived" is exactly the reading a listener that was
 * never installed would also give.
 */

/**
 * The URL jsdom starts at, restored after each case.
 *
 * Read from `location` rather than spelled, so a vitest config that
 * changed the jsdom URL would not silently make the href cases read a
 * path that no longer exists.
 */
const STARTING_HREF = window.location.href;

/** Every disposer an installed case made, taken down afterwards. */
const installedDisposers: (() => void)[] = [];

afterEach(() => {
  while (installedDisposers.length > 0) {
    installedDisposers.pop()?.();
  }

  window.history.pushState({}, '', STARTING_HREF);
});

/**
 * Install on a bus, and remember the disposer.
 *
 * A case that ends before disposing — because an assertion reds —
 * would otherwise leave its listeners on the shared jsdom `window`
 * for every later case to trip over.
 *
 * @param bus - Where the capture publishes.
 * @returns The disposer, for the cases whose subject it is.
 */
function install(bus: DevToolsBus): () => void {
  const dispose = installGlobalCapture(bus);

  installedDisposers.push(dispose);

  return dispose;
}

/**
 * Dispatch a window `error` event.
 *
 * @param message - What the platform would have written on the event.
 * @param error - The thrown value, where the platform captured one.
 */
function dispatchError(message: string, error?: unknown): void {
  window.dispatchEvent(new ErrorEvent('error', { message, error }));
}

/**
 * Dispatch a window `unhandledrejection` event.
 *
 * The event needs a promise, and a REJECTED one would itself become an
 * unhandled rejection inside the runner — a real failure reported
 * against a case about a synthetic one. A resolved promise carries the
 * same event shape, and the listener reads `reason` alone.
 *
 * @param reason - Whatever the rejection carried.
 */
function dispatchRejection(reason: unknown): void {
  window.dispatchEvent(new PromiseRejectionEvent('unhandledrejection', {
    promise: Promise.resolve(),
    reason,
  }));
}

/**
 * Everything published on `error`, newest first.
 *
 * The topic's declared payload is `unknown`, so this narrows — sound
 * because the only publisher on this bus is the capture under test,
 * and each case asserts the members it reads.
 *
 * @param bus - The case's own bus.
 * @returns Up to twenty payloads, newest first.
 */
function captured(bus: DevToolsBus): readonly DevToolsGlobalErrorPayload[] {
  return bus.recent('error', 20) as readonly DevToolsGlobalErrorPayload[];
}

describe('what installGlobalCapture does not publish', () => {
  it('publishes nothing at all until an event arrives', () => {
    const bus = createDevToolsBus();

    install(bus);

    expect(captured(bus)).toEqual([]);
    expect(bus.last('error')).toBeUndefined();

    // The control: the same bus, the same install, one event. Without
    // it the case would pass against a function that installed no
    // listener at all.
    dispatchError('devtools-test: the control fired');

    expect(captured(bus)).toHaveLength(1);
  });

  it('publishes on error only, never on the other three topics', () => {
    const bus = createDevToolsBus();

    install(bus);
    dispatchError('devtools-test: an uncaught failure');
    dispatchRejection('devtools-test: a rejection');

    expect(captured(bus)).toHaveLength(2);

    // `route` and `artefact` carry the app's own announcements and
    // `open-item` is acted on by the shell: a capture that published
    // on any of them would open something on a crash.
    expect(bus.last('route')).toBeUndefined();
    expect(bus.last('artefact')).toBeUndefined();
    expect(bus.last('open-item')).toBeUndefined();
  });

  it('stops publishing once the disposer has removed both listeners', () => {
    const bus = createDevToolsBus();
    const dispose = install(bus);

    // The control first: both listeners answer while installed, so
    // "nothing arrived" below cannot be a capture that never listened.
    dispatchError('devtools-test: before the disposer');
    dispatchRejection('devtools-test: before the disposer');

    expect(captured(bus)).toHaveLength(2);

    dispose();
    dispatchError('devtools-test: after the disposer');
    dispatchRejection('devtools-test: after the disposer');

    // Two, not three and not four: BOTH listeners went, and a disposer
    // that removed only one would read as three here.
    expect(captured(bus)).toHaveLength(2);

    // Idempotent, for the reason the bus's own disposer is: a React
    // effect cleanup can run twice under StrictMode.
    expect(() => {
      dispose();
      dispose();
    }).not.toThrow();
    expect(captured(bus)).toHaveLength(2);
  });

  it('leaves a second install listening when the first is disposed', () => {
    const bus = createDevToolsBus();
    const first = install(bus);

    install(bus);

    // Two installs, two listeners per event: the closures are fresh, so
    // `addEventListener`'s identity de-duplication cannot collapse them.
    dispatchError('devtools-test: while both are installed');

    expect(captured(bus)).toHaveLength(2);

    first();
    dispatchError('devtools-test: while one is installed');

    // Three: the second install's listener survived the first's
    // disposer, which is what makes the disposer per-install rather
    // than a global teardown.
    expect(captured(bus)).toHaveLength(3);
  });

  it('never publishes an empty message', () => {
    const bus = createDevToolsBus();

    install(bus);

    // The three ways nothing gets said: a cross-origin script error
    // (the platform blanks both members), an `Error` with no message,
    // and `Promise.reject()` with no reason at all.
    dispatchError('');
    dispatchError('', new Error(''));
    dispatchRejection(undefined);

    expect(captured(bus).map((payload) => payload.message)).toEqual([
      'An unknown failure reached the window.',
      'An unknown failure reached the window.',
      'An unknown failure reached the window.',
    ]);

    // The control: the same two event kinds with something to say. So
    // the line above is the fallback and not the only thing this
    // capture ever writes.
    dispatchError('devtools-test: the platform said this');
    dispatchRejection('devtools-test: the rejection said this');

    const newest = captured(bus).slice(0, 2);

    expect(newest.map((payload) => payload.message)).toEqual([
      'devtools-test: the rejection said this',
      'devtools-test: the platform said this',
    ]);
  });
});

describe('what a window error event publishes', () => {
  it('publishes the message, first stack frame, href and timestamp', () => {
    const bus = createDevToolsBus();

    install(bus);

    // Thrown and caught, so the stack is a real engine stack rather
    // than a string this file wrote: a case built on a handwritten
    // `stack` would pass against a reader that never split on newlines.
    const thrown = ((): Error => {
      try {
        throw new Error('devtools-test: the window caught this');
      } catch (error) {
        return error as Error;
      }
    })();

    const before = Date.now();

    dispatchError('Uncaught Error: devtools-test: the window caught this', thrown);

    const after = Date.now();
    const [payload] = captured(bus);

    // The thrown value's own message, NOT the platform's `Uncaught …`
    // prefix, which is the event's message and only the fallback.
    expect(payload?.message).toBe('devtools-test: the window caught this');

    // One frame, V8's own, and not the whole stack: the message line
    // V8 writes first is skipped, and what is left is one line.
    expect(payload?.topFrame.startsWith('at ')).toBe(true);
    expect(payload?.topFrame).not.toContain('\n');
    expect(thrown.stack).toContain(payload?.topFrame ?? 'devtools-test: absent');

    expect(payload?.href).toBe(window.location.href);

    // Bounded by two readings of the same clock rather than compared
    // with one: an `at` of `0`, of `NaN` or of a parsed date string
    // reds here.
    expect(payload?.at).toBeGreaterThanOrEqual(before);
    expect(payload?.at).toBeLessThanOrEqual(after);

    // `last` and the ring's head are the same payload, by identity, so
    // a later reader of either sees one capture rather than two.
    expect(bus.last('error')).toBe(payload);
  });

  it('falls back to the event message when the event carries no error', () => {
    const bus = createDevToolsBus();

    install(bus);

    // What a cross-origin script failure looks like once the platform
    // has stripped it, and what an old `window.onerror` shim dispatches.
    dispatchError('  devtools-test: only the event said something  ');

    const [payload] = captured(bus);

    // Trimmed: the fallback is a platform string and reaches a report
    // as a line.
    expect(payload?.message).toBe('devtools-test: only the event said something');

    // No value, no stack — `''` rather than a guess or an `undefined`
    // member.
    expect(payload?.topFrame).toBe('');
  });

  it('reads href at capture time rather than at read time', () => {
    const bus = createDevToolsBus();

    install(bus);
    dispatchError('devtools-test: on the first route');

    window.history.pushState({}, '', '/devtools-test/second-route');
    dispatchError('devtools-test: on the second route');

    const [newest, oldest] = captured(bus);

    expect(newest?.href).toBe(`${window.location.origin}/devtools-test/second-route`);
    expect(oldest?.href).toBe(STARTING_HREF);

    // The two differ, which is the whole reading: a capture that read
    // `location.href` when the ring was read would answer the second
    // route for both.
    expect(newest?.href).not.toBe(oldest?.href);
  });
});

describe('what an unhandled rejection publishes', () => {
  it('describes a non-Error reason and carries no stack frame', () => {
    const bus = createDevToolsBus();

    install(bus);

    // The four shapes a reason that is not an `Error` actually takes:
    // a string, a plain object, a number, and an object JSON cannot
    // say anything useful about.
    dispatchRejection('devtools-test: a plain string reason');
    dispatchRejection({ status: 418, url: '/api/teapot' });
    dispatchRejection(42);
    dispatchRejection(new Map([['devtools-test', 'unserialisable']]));

    expect(captured(bus).map((payload) => payload.message)).toEqual([
      '[object Map]',
      '42',
      '{"status":418,"url":"/api/teapot"}',
      'devtools-test: a plain string reason',
    ]);

    // None of the four carries a stack, and none of them gets one
    // invented.
    expect(captured(bus).map((payload) => payload.topFrame)).toEqual([
      '',
      '',
      '',
      '',
    ]);

    // The rest of the payload is filled for a non-`Error` exactly as
    // for an `Error`: the capture never publishes a partial payload.
    expect(captured(bus).every((payload) => payload.href === window.location.href))
      .toBe(true);
    expect(captured(bus).every((payload) => Number.isFinite(payload.at)))
      .toBe(true);
  });

  it('reads the message and stack of an error-like reason', () => {
    const bus = createDevToolsBus();

    install(bus);

    // A structured-cloned `Error` from a worker, or one a library
    // rebuilt: it fails `instanceof Error`, and `JSON.stringify` of a
    // real `Error` answers `{}` because its members are not enumerable.
    dispatchRejection({
      message: 'devtools-test: an error from another realm',
      name: 'TypeError',
      stack: 'TypeError: devtools-test\n    at fromAnotherRealm (worker.js:4:9)',
    });

    const [payload] = captured(bus);

    expect(payload?.message).toBe('devtools-test: an error from another realm');
    expect(payload?.topFrame).toBe('at fromAnotherRealm (worker.js:4:9)');
  });

  it('publishes a real Error reason the way an error event does', () => {
    const bus = createDevToolsBus();

    install(bus);
    dispatchRejection(new Error('devtools-test: a rejected Error'));

    const [payload] = captured(bus);

    expect(payload?.message).toBe('devtools-test: a rejected Error');
    expect(payload?.topFrame.startsWith('at ')).toBe(true);
    expect(payload?.href).toBe(window.location.href);
  });
});
