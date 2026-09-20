import type { AppRouteSignal, AppSignals, AppSignalTopic } from './appSignals';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  appSignals,
  artefactPayload,
  createAppSignals,
  errorPayload,
  NON_ERROR_NAME,
} from './appSignals';

// The channel is pure — two maps and a closure — so every case below
// runs in this package's node-only vitest with no DOM and no renderer.
// What has no case here is the PUBLISHING side, and at this commit it
// has no code either: the boundary, the layout effect and
// `useArtefactSignal` land in later stages of this plan, they all
// need React, and the forced Playwright spec is what will read them
// (`tests/README.md` has the two-runner split). So this file plays
// producer for every topic.
//
// Every case builds its own channel through `createAppSignals()`. The
// module-level `appSignals` is a shared instance, and a case that
// subscribed to it would leak that subscriber into whatever file the
// runner reaches next; the ONE case that reads it is last, and
// disposes what it registers.

/**
 * A recorder: a subscriber that keeps what it was handed.
 *
 * Returned as a pair rather than a spy so each case reads its own
 * payloads back by value, with no matcher indirection between the
 * publish and the assertion.
 *
 * @returns The subscriber, and the payloads it has been handed.
 */
function recorder<TPayload>(): { fn: (payload: TPayload) => void; seen: TPayload[] } {
  const seen: TPayload[] = [];

  return { fn: (payload: TPayload) => { seen.push(payload); }, seen };
}

/**
 * The five topics, annotated so a topic REMOVED from the union reds
 * this line rather than quietly shrinking what the sweeps below
 * cover.
 */
const TOPICS: readonly AppSignalTopic[] = [
  'error',
  'route',
  'artefact',
  'devtools',
  'open-feedback',
];

/** A route payload, so the delivery cases are not about its shape. */
const A_ROUTE: AppRouteSignal = { path: '/lexicon', search: '', at: 1 };

/** A second one, distinguishable from {@link A_ROUTE}. */
const ANOTHER_ROUTE: AppRouteSignal = { path: '/digests', search: '?q=x', at: 2 };

/**
 * One publish per topic, each with a payload that topic accepts.
 *
 * A `Record` over the union rather than a list, so a SIXTH topic reds
 * this declaration instead of quietly going unswept — which is the
 * failure the sweep below exists for: `createAppSignals` seeds one
 * subscriber set per topic from its own roster, and a topic in the
 * union but missing from that roster accepts subscribers and delivers
 * to none of them, silently.
 */
const PUBLISH_ONE: Record<AppSignalTopic, (signals: AppSignals) => void> = {
  error: (signals) => { signals.publish('error', errorPayload('sweep')); },
  route: (signals) => { signals.publish('route', A_ROUTE); },
  artefact: (signals) => { signals.publish('artefact', null); },
  devtools: (signals) => { signals.publish('devtools', { installed: false }); },
  'open-feedback': (signals) => { signals.publish('open-feedback'); },
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('what the app signals refuse to do', () => {
  it('answers undefined from last on every topic before any publish', () => {
    // Arrange: a channel nothing has touched. The module-level
    // instance would answer this today too, and that is exactly why
    // it would be the wrong instance to read: the case would start
    // failing the moment a producer landed.
    const signals = createAppSignals();

    // Act + Assert: `undefined`, and specifically not `null`. The
    // `artefact` topic publishes `null` for "cleared", so the absent
    // case may not be spelled with a value a producer publishes.
    for (const topic of TOPICS) {
      expect(signals.last(topic)).toBeUndefined();
    }

    // The positive control, varied along the one axis that matters:
    // after a publish the SAME call answers the payload, so a `last`
    // stubbed to answer `undefined` unconditionally would fail here
    // rather than pass the sweep above.
    signals.publish('route', A_ROUTE);
    expect(signals.last('route')).toEqual(A_ROUTE);
    expect(signals.last('error')).toBeUndefined();
  });

  it('does not remove a later subscriber when a disposer is called twice', () => {
    // Arrange: one function value, subscribed, disposed, and
    // subscribed again. Subscribers are held identity-keyed in a
    // `Set`, so this is the shape a bare `delete(fn)` disposer gets
    // wrong — the stale disposer would delete the SECOND
    // registration. A React effect cleanup running twice under
    // StrictMode, which this app renders under, is this call.
    const signals = createAppSignals();
    const listener = recorder<{ installed: boolean }>();
    const dispose = signals.subscribe('devtools', listener.fn);

    dispose();
    signals.subscribe('devtools', listener.fn);

    // Act
    dispose();
    signals.publish('devtools', { installed: true });

    // Assert: the live registration survived the stale disposer.
    expect(listener.seen).toEqual([{ installed: true }]);
  });

  it('keeps delivering to the others when a subscriber throws', () => {
    // `console.error` is silenced rather than asserted on: the
    // channel reports a thrown subscriber there, but no caller
    // depends on that, and stubbing it here is about keeping the
    // run's output readable. Removing the report leaves this file
    // green — measured, and recorded in the module's mutation note.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    // Arrange: a thrower BETWEEN two recorders, so the case reads
    // both "the ones before it still ran" and "the ones after it were
    // not skipped". One thrower at the end would only ever prove the
    // first.
    const signals = createAppSignals();
    const before = recorder<{ kind: string; id: string } | null>();
    const after = recorder<{ kind: string; id: string } | null>();

    signals.subscribe('artefact', before.fn);
    signals.subscribe('artefact', () => {
      throw new Error('app-signals-test: subscriber exploded');
    });
    signals.subscribe('artefact', after.fn);

    // Act + Assert: the throw does not escape `publish`. Asserted as
    // a no-throw rather than caught, so a `publish` that rethrew
    // would red HERE with the thrown message rather than somewhere
    // downstream — which in production would be the error boundary
    // itself, mid-catch.
    expect(() => {
      signals.publish('artefact', { kind: 'lexicon', id: 'a1' });
    }).not.toThrow();

    expect(before.seen).toEqual([{ kind: 'lexicon', id: 'a1' }]);
    expect(after.seen).toEqual([{ kind: 'lexicon', id: 'a1' }]);

    // And the topic is still usable afterwards: a thrower is not a
    // poisoned topic.
    signals.publish('artefact', { kind: 'lexicon', id: 'a2' });
    expect(after.seen).toHaveLength(2);
    expect(signals.last('artefact')).toEqual({ kind: 'lexicon', id: 'a2' });
  });

  it('stops delivering to a subscriber once its disposer has run', () => {
    // Arrange
    const signals = createAppSignals();
    const listener = recorder<AppRouteSignal>();
    const dispose = signals.subscribe('route', listener.fn);

    // Act
    signals.publish('route', A_ROUTE);
    dispose();
    signals.publish('route', ANOTHER_ROUTE);

    // Assert: the payload published before the disposal arrived, the
    // one after it did not, and `last` still moved — unsubscribing is
    // not the same as not publishing.
    expect(listener.seen).toEqual([A_ROUTE]);
    expect(signals.last('route')).toEqual(ANOTHER_ROUTE);
  });
});

describe('what the app signals deliver', () => {
  it('delivers to a subscriber of every topic in the union', () => {
    // Arrange + Act: one fresh channel per topic, one subscriber, one
    // publish. Swept rather than left to the topics the other cases
    // happen to use, because the gap this covers is silent: a
    // subscribe on a topic the channel never seeded is a no-op that
    // answers a disposer like any other.
    const delivered: Partial<Record<AppSignalTopic, number>> = {};

    for (const topic of TOPICS) {
      const signals = createAppSignals();
      let heard = 0;

      signals.subscribe(topic, () => { heard += 1; });
      PUBLISH_ONE[topic](signals);
      delivered[topic] = heard;
    }

    // Assert: named per topic rather than counted, so a failure says
    // WHICH topic went dark.
    expect(delivered).toEqual({
      error: 1,
      route: 1,
      artefact: 1,
      devtools: 1,
      'open-feedback': 1,
    });
  });

  it('delivers to the subscribers of a topic in subscription order', () => {
    // Arrange: three subscribers writing their own name into ONE log,
    // which is what makes this a reading of order rather than of
    // arrival. Three rather than two: with two, a delivery that
    // reversed the set would be indistinguishable from one that
    // rotated it.
    const signals = createAppSignals();
    const order: string[] = [];

    signals.subscribe('route', () => { order.push('first'); });
    signals.subscribe('route', () => { order.push('second'); });
    signals.subscribe('route', () => { order.push('third'); });

    // Act
    signals.publish('route', A_ROUTE);

    // Assert
    expect(order).toEqual(['first', 'second', 'third']);
  });

  it('hands a published payload to every subscriber of that topic only', () => {
    // Arrange
    const signals = createAppSignals();
    const firstOnRoute = recorder<AppRouteSignal>();
    const secondOnRoute = recorder<AppRouteSignal>();
    const onError = recorder<unknown>();

    signals.subscribe('route', firstOnRoute.fn);
    signals.subscribe('route', secondOnRoute.fn);
    signals.subscribe('error', onError.fn);

    // Act
    signals.publish('route', A_ROUTE);

    // Assert: both subscribers of the topic, and no crosstalk.
    expect(firstOnRoute.seen).toEqual([A_ROUTE]);
    expect(secondOnRoute.seen).toEqual([A_ROUTE]);
    expect(onError.seen).toEqual([]);
  });

  it('holds a function subscribed twice to one topic once', () => {
    // Arrange: identity-keyed listeners, stated as a reading rather
    // than left implied by the `Set`. A channel that grew an array of
    // subscribers would deliver twice here.
    const signals = createAppSignals();
    const listener = recorder<AppRouteSignal>();

    signals.subscribe('route', listener.fn);
    signals.subscribe('route', listener.fn);

    // Act
    signals.publish('route', A_ROUTE);

    // Assert
    expect(listener.seen).toEqual([A_ROUTE]);
  });

  it('remembers the most recent payload per topic', () => {
    // Arrange
    const signals = createAppSignals();

    // Act
    signals.publish('route', A_ROUTE);
    signals.publish('route', ANOTHER_ROUTE);
    signals.publish('devtools', { installed: true });

    // Assert: the latest and not the first, and each topic remembers
    // its own.
    expect(signals.last('route')).toEqual(ANOTHER_ROUTE);
    expect(signals.last('devtools')).toEqual({ installed: true });
    expect(signals.last('artefact')).toBeUndefined();
    expect(signals.last('error')).toBeUndefined();
  });

  it('tells a cleared artefact apart from one that was never published', () => {
    // Arrange: the three answers `last('artefact')` has, which a
    // consumer has to tell apart — never said, said and gone, open
    // now.
    const signals = createAppSignals();

    // Act + Assert
    expect(signals.last('artefact')).toBeUndefined();

    signals.publish('artefact', { kind: 'source', id: 's1' });
    expect(signals.last('artefact')).toEqual({ kind: 'source', id: 's1' });

    signals.publish('artefact', null);
    expect(signals.last('artefact')).toBeNull();
  });

  it('publishes a topic that carries nothing with no payload at all', () => {
    // Arrange: `open-feedback` is an event, not a value. The reading
    // that matters is that a subscriber is CALLED — `last` cannot
    // say, since the remembered value is `undefined` whether it has
    // been published or not.
    const signals = createAppSignals();
    const listener = recorder<void>();

    signals.subscribe('open-feedback', listener.fn);

    // Act
    signals.publish('open-feedback');
    signals.publish('open-feedback');

    // Assert
    expect(listener.seen).toHaveLength(2);
    expect(signals.last('open-feedback')).toBeUndefined();
  });

  it('defers a subscription made during delivery to the next publish', () => {
    // Arrange: a subscriber that subscribes another while it is being
    // called. Delivery walks a snapshot, so the newcomer waits.
    const signals = createAppSignals();
    const latecomer = recorder<AppRouteSignal>();

    signals.subscribe('route', () => {
      signals.subscribe('route', latecomer.fn);
    });

    // Act
    signals.publish('route', A_ROUTE);

    // Assert: not called during the publish that registered it...
    expect(latecomer.seen).toEqual([]);

    // ...and called from the next one. Without this half, a channel
    // that never delivered to the newcomer at all would pass.
    signals.publish('route', ANOTHER_ROUTE);
    expect(latecomer.seen).toEqual([ANOTHER_ROUTE]);
  });

  it('defers an unsubscribe made during delivery to the next publish', () => {
    // Arrange: the other half of the snapshot. The FIRST subscriber
    // disposes the second while the first is being called, so the
    // second is already gone from the live set by the time the loop
    // would reach it.
    const signals = createAppSignals();
    const target = recorder<AppRouteSignal>();
    let disposeTarget: () => void = () => { };

    signals.subscribe('route', () => { disposeTarget(); });
    disposeTarget = signals.subscribe('route', target.fn);

    // Act
    signals.publish('route', A_ROUTE);

    // Assert: delivered anyway, because delivery walks a snapshot
    // taken before the first subscriber ran...
    expect(target.seen).toEqual([A_ROUTE]);

    // ...and gone from the one after it. Without this half, a channel
    // that ignored the disposer entirely would pass.
    signals.publish('route', ANOTHER_ROUTE);
    expect(target.seen).toEqual([A_ROUTE]);
  });

  it('lets a subscriber read last during delivery and see its own payload', () => {
    // Arrange: `last` is written before delivery, so the payload a
    // subscriber is handed is already the remembered one.
    const signals = createAppSignals();
    const observed: unknown[] = [];

    signals.publish('route', A_ROUTE);
    signals.subscribe('route', () => {
      observed.push(signals.last('route'));
    });

    // Act
    signals.publish('route', ANOTHER_ROUTE);

    // Assert: the new payload, not the one it replaced.
    expect(observed).toEqual([ANOTHER_ROUTE]);
  });
});

describe('what errorPayload refuses to read as an error', () => {
  it('reduces a thrown string to the flat shape', () => {
    // Arrange + Act: a `throw` takes any value, and a string is the
    // commonest non-`Error` one.
    const payload = errorPayload('app-signals-test: plain string');

    // Assert: every member a string, and the name says the thrown
    // value could not name itself.
    expect(payload).toEqual({
      name: NON_ERROR_NAME,
      message: 'app-signals-test: plain string',
      topFrame: '',
      componentStack: '',
    });
  });

  it('reduces a thrown object with no message to a readable string', () => {
    // Arrange + Act
    const payload = errorPayload({ status: 503, url: '/api/digests' });

    // Assert: the JSON form, so the members survive rather than
    // collapsing to `[object Object]`.
    expect(payload.name).toBe(NON_ERROR_NAME);
    expect(payload.message).toBe('{"status":503,"url":"/api/digests"}');
    expect(payload.topFrame).toBe('');
  });

  it('reduces a thrown value a serialiser cannot take', () => {
    // Arrange: a cycle, which throws inside `JSON.stringify`. A
    // builder that let that escape would replace a caught render
    // error with an uncaught serialiser error, inside
    // `componentDidCatch`.
    const cyclic: Record<string, unknown> = { name: 'cyclic' };

    cyclic.self = cyclic;

    // Act + Assert
    expect(() => errorPayload(cyclic)).not.toThrow();
    expect(errorPayload(cyclic).message).toBe('[object Object]');
  });

  it('reduces the thrown values that have no shape at all', () => {
    // Arrange: the primitives a `throw` can carry, plus the two
    // absences. Swept rather than written one case each: none of them
    // has its own behaviour, and what matters is that every one
    // answers a non-empty string instead of an empty member.
    const thrown: readonly unknown[] = [null, undefined, 0, Number.NaN, false, 7n];

    // Act + Assert
    for (const value of thrown) {
      const payload = errorPayload(value);

      expect(payload.name).toBe(NON_ERROR_NAME);
      expect(payload.message.length).toBeGreaterThan(0);
    }

    expect(errorPayload(null).message).toBe('null');
    expect(errorPayload(undefined).message).toBe('undefined');
    expect(errorPayload('   ').message).toBe('(threw an empty string)');
  });

  it('answers empty strings rather than absent members when React said nothing', () => {
    // Arrange + Act: no second argument at all, then an explicit
    // `null`, then an info whose `componentStack` is `null` — all
    // three shapes React's own types permit.
    const noInfo = errorPayload(new Error('app-signals-test: bare'));
    const nullInfo = errorPayload(new Error('app-signals-test: bare'), null);
    const nullStack = errorPayload(new Error('app-signals-test: bare'), {
      componentStack: null,
    });

    // Assert: `''`, never `undefined` — the payload crosses into a
    // report body, where a missing member and an empty one would have
    // to be told apart twice.
    for (const payload of [noInfo, nullInfo, nullStack]) {
      expect(payload.componentStack).toBe('');
      expect(payload.message).toBe('app-signals-test: bare');
    }
  });
});

describe('what errorPayload reads', () => {
  it('reduces an Error and a component stack to the flat shape', () => {
    // Arrange: a hand-built stack rather than a thrown one, so the
    // expected first frame is a literal in this file and not whatever
    // the runner's own frames happen to be.
    const error = new TypeError('app-signals-test: cannot read id of null');

    error.stack = [
      'TypeError: app-signals-test: cannot read id of null',
      '    at LexiconEditorModal (/src/pages/lexicon/LexiconEditorModal.tsx:42:7)',
      '    at renderWithHooks (/node_modules/react-dom/index.js:1:1)',
    ].join('\n');

    // Act
    const payload = errorPayload(error, {
      componentStack: '\n    in LexiconEditorModal\n    in AppLayout\n',
    });

    // Assert: four strings, the header line dropped from the frame,
    // and the component stack trimmed but whole — the ancestors are
    // what say which route was rendering.
    expect(payload).toEqual({
      name: 'TypeError',
      message: 'app-signals-test: cannot read id of null',
      topFrame: 'at LexiconEditorModal (/src/pages/lexicon/LexiconEditorModal.tsx:42:7)',
      componentStack: 'in LexiconEditorModal\n    in AppLayout',
    });
  });

  it('answers the first line when a stack has no frame line at all', () => {
    // Arrange: not every engine writes `at ` frames, and a stack of
    // an unexpected shape should still say something.
    const error = new Error('app-signals-test: odd stack');

    error.stack = 'app-signals-test@http://localhost:5173/src/main.tsx:1:1';

    // Act + Assert
    expect(errorPayload(error).topFrame).toBe(
      'app-signals-test@http://localhost:5173/src/main.tsx:1:1',
    );

    // And no stack at all is the empty string rather than a crash.
    error.stack = undefined;
    expect(errorPayload(error).topFrame).toBe('');
  });

  it('reads a thrown object that is not an Error but carries a message', () => {
    // Arrange: a failure that crossed a realm — an iframe, a second
    // copy of a library — fails `instanceof Error` while carrying a
    // perfectly good name, message and stack.
    const crossRealm = {
      name: 'RangeError',
      message: 'app-signals-test: out of range',
      stack: 'RangeError: app-signals-test: out of range\n    at someFrame (/x.js:1:1)',
    };

    // Act
    const payload = errorPayload(crossRealm);

    // Assert: read as the error it is, not stringified as an object.
    expect(payload).toEqual({
      name: 'RangeError',
      message: 'app-signals-test: out of range',
      topFrame: 'at someFrame (/x.js:1:1)',
      componentStack: '',
    });
  });

  it('names an error that has no name of its own', () => {
    // Arrange: `Error.name` is writable, and an empty one would
    // otherwise reach a report as a blank member.
    const error = new Error('app-signals-test: nameless');

    error.name = '';

    // Act + Assert
    expect(errorPayload(error).name).toBe(NON_ERROR_NAME);
  });
});

describe('what artefactPayload refuses to build', () => {
  it('answers null for an id nothing selected', () => {
    // Arrange + Act + Assert: a route parameter that has not
    // resolved is `undefined`, and a cleared one is `null`. Both are
    // "no artefact".
    expect(artefactPayload('lexicon', undefined)).toBeNull();
    expect(artefactPayload('lexicon', null)).toBeNull();
  });

  it('answers null for a blank kind or a blank id', () => {
    // Arrange + Act + Assert: whitespace is not an id, and a kind
    // nobody named is not a kind.
    expect(artefactPayload('', 'a1')).toBeNull();
    expect(artefactPayload('   ', 'a1')).toBeNull();
    expect(artefactPayload('lexicon', '')).toBeNull();
    expect(artefactPayload('lexicon', '  ')).toBeNull();
  });
});

describe('what artefactPayload builds', () => {
  it('answers the trimmed kind and id', () => {
    // Arrange + Act
    const payload = artefactPayload(' lexicon ', ' term-42 ');

    // Assert
    expect(payload).toEqual({ kind: 'lexicon', id: 'term-42' });
  });

  it('answers a payload the artefact topic accepts', () => {
    // Arrange: the builder and the topic are separate declarations,
    // so this is the reading that keeps them in step — a subscriber
    // typed by the topic receives exactly what the builder answered.
    const signals = createAppSignals();
    const listener = recorder<{ kind: string; id: string } | null>();

    signals.subscribe('artefact', listener.fn);

    // Act: what `useArtefactSignal` does on mount, then on unmount.
    signals.publish('artefact', artefactPayload('digest', 'd-7'));
    signals.publish('artefact', artefactPayload('digest', undefined));

    // Assert
    expect(listener.seen).toEqual([{ kind: 'digest', id: 'd-7' }, null]);
  });
});

describe('the factory and the shared channel', () => {
  it('gives each created channel its own subscribers and its own last', () => {
    // Arrange
    const one = createAppSignals();
    const other = createAppSignals();
    const onOne = recorder<AppRouteSignal>();

    one.subscribe('route', onOne.fn);

    // Act
    other.publish('route', ANOTHER_ROUTE);

    // Assert: no leak in either direction.
    expect(onOne.seen).toEqual([]);
    expect(one.last('route')).toBeUndefined();
    expect(other.last('route')).toEqual(ANOTHER_ROUTE);
  });

  it('exports a shared channel that no producer in this stage publishes on', () => {
    // The module-level instance is a channel, reachable and
    // subscribable. What it is NOT, at this stage, is a channel
    // anything publishes on — the boundary, the layout effect and the
    // hook land later — so its delivery is exercised here by this
    // file playing producer.
    const listener = recorder<AppRouteSignal>();
    const dispose = appSignals.subscribe('route', listener.fn);

    appSignals.publish('route', A_ROUTE);
    expect(listener.seen).toEqual([A_ROUTE]);

    // Disposed, so this case leaves no subscriber behind on the
    // shared instance for a later file to trip over. The `last` it
    // wrote stays, which is why every other case above builds its
    // own.
    dispose();
    appSignals.publish('route', ANOTHER_ROUTE);
    expect(listener.seen).toEqual([A_ROUTE]);
  });
});
