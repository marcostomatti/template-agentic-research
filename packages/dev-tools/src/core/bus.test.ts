import type { DevToolsBusTopic } from './types';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { createDevToolsBus, devtoolsBus } from './bus';

/**
 * The three topics, annotated so a topic REMOVED from the union reds
 * this line rather than quietly shrinking what every case below
 * sweeps.
 */
const TOPICS: readonly DevToolsBusTopic[] = ['error', 'route', 'artefact'];

/**
 * A recorder: a subscriber that keeps what it was handed.
 *
 * Returned as a pair rather than a spy so each case reads its own
 * payloads back by value, with no matcher indirection between the
 * publish and the assertion.
 *
 * @returns The subscriber, and the payloads it has been handed.
 */
function recorder(): { fn: (payload: unknown) => void; seen: unknown[] } {
  const seen: unknown[] = [];

  return { fn: (payload: unknown) => { seen.push(payload); }, seen };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('what the bus refuses to do', () => {
  it('answers undefined from last on every topic before any publish', () => {
    // Arrange: a bus nothing has touched. The singleton would do for
    // this one reading TODAY, because no producer exists in this plan
    // — and that is exactly why it would be the wrong instance to
    // read: the case would start failing the moment one lands.
    const bus = createDevToolsBus();

    // Act + Assert: `undefined`, and specifically not `null`. A
    // feature distinguishes "nothing published" from "published
    // null", so the absent case may not be spelled with a value a
    // producer could legitimately publish.
    for (const topic of TOPICS) {
      expect(bus.last(topic)).toBeUndefined();
    }

    // The positive control, varied along the one axis that matters:
    // after a publish the SAME call answers the payload, so a `last`
    // stubbed to return `undefined` unconditionally would fail here
    // rather than pass the sweep above.
    bus.publish('route', '/lexicon');
    expect(bus.last('route')).toBe('/lexicon');
    expect(bus.last('error')).toBeUndefined();
  });

  it('does not remove a later subscriber when an unsubscribe is called twice', () => {
    // Arrange: one function value, subscribed, disposed, and
    // subscribed again. Subscribers are held identity-keyed in a
    // `Set`, so this is the shape a bare `set.delete(fn)` disposer
    // gets wrong — the stale disposer would delete the SECOND
    // registration.
    const bus = createDevToolsBus();
    const listener = recorder();
    const dispose = bus.subscribe('error', listener.fn);

    dispose();
    bus.subscribe('error', listener.fn);

    // Act: the stale disposer runs a second time. A React effect
    // cleanup running twice under StrictMode is this call.
    dispose();
    bus.publish('error', 'boom');

    // Assert: the live registration survived the stale disposer.
    expect(listener.seen).toEqual(['boom']);
  });

  it('keeps delivering to the others when a subscriber throws', () => {
    // `console.error` is silenced rather than asserted on: the bus
    // reports a thrown subscriber there, but no caller depends on
    // that, and stubbing it here is about keeping the run's output
    // readable. Removing the report from `bus.ts` leaves this file
    // green — measured.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    // Arrange: a thrower between two recorders, so the case reads
    // both "the ones before it still ran" and "the ones after it were
    // not skipped". One thrower at the end would only ever prove the
    // first.
    const bus = createDevToolsBus();
    const before = recorder();
    const after = recorder();

    bus.subscribe('artefact', before.fn);
    bus.subscribe('artefact', () => {
      throw new Error('devtools-test: subscriber exploded');
    });
    bus.subscribe('artefact', after.fn);

    // Act + Assert: the throw does not escape `publish`. Asserted as
    // a no-throw rather than caught, so a `publish` that rethrew
    // would red HERE with the thrown message rather than somewhere
    // downstream.
    expect(() => { bus.publish('artefact', { id: 'a1' }); }).not.toThrow();

    expect(before.seen).toEqual([{ id: 'a1' }]);
    expect(after.seen).toEqual([{ id: 'a1' }]);

    // And the bus is still usable afterwards: a thrower is not a
    // poisoned topic.
    bus.publish('artefact', { id: 'a2' });
    expect(after.seen).toHaveLength(2);
    expect(bus.last('artefact')).toEqual({ id: 'a2' });
  });
});

describe('what the bus delivers', () => {
  it('hands a published payload to every subscriber of that topic only', () => {
    // Arrange
    const bus = createDevToolsBus();
    const firstOnRoute = recorder();
    const secondOnRoute = recorder();
    const onError = recorder();

    bus.subscribe('route', firstOnRoute.fn);
    bus.subscribe('route', secondOnRoute.fn);
    bus.subscribe('error', onError.fn);

    // Act
    bus.publish('route', '/sources');

    // Assert: both subscribers of the topic, and no crosstalk.
    expect(firstOnRoute.seen).toEqual(['/sources']);
    expect(secondOnRoute.seen).toEqual(['/sources']);
    expect(onError.seen).toEqual([]);
  });

  it('remembers the most recent payload per topic', () => {
    // Arrange
    const bus = createDevToolsBus();

    // Act
    bus.publish('route', '/lexicon');
    bus.publish('route', '/digests');
    bus.publish('error', new Error('devtools-test: caught'));

    // Assert: last is the latest and not the first, and each topic
    // remembers its own.
    expect(bus.last('route')).toBe('/digests');
    expect(bus.last('error')).toBeInstanceOf(Error);
    expect(bus.last('artefact')).toBeUndefined();
  });

  it('stops delivering to a subscriber once its disposer has run', () => {
    // Arrange
    const bus = createDevToolsBus();
    const listener = recorder();
    const dispose = bus.subscribe('route', listener.fn);

    // Act
    bus.publish('route', '/before');
    dispose();
    bus.publish('route', '/after');

    // Assert: the payload published before the disposal arrived, the
    // one after it did not, and `last` still moved — unsubscribing is
    // not the same as not publishing.
    expect(listener.seen).toEqual(['/before']);
    expect(bus.last('route')).toBe('/after');
  });

  it('holds a function subscribed twice to one topic once', () => {
    // Arrange: identity-keyed listeners, stated as a reading rather
    // than left implied by the `Set`. A bus that grew an array of
    // subscribers would deliver twice here.
    const bus = createDevToolsBus();
    const listener = recorder();

    bus.subscribe('error', listener.fn);
    bus.subscribe('error', listener.fn);

    // Act
    bus.publish('error', 'once');

    // Assert
    expect(listener.seen).toEqual(['once']);
  });

  it('defers a subscription made during delivery to the next publish', () => {
    // Arrange: a subscriber that subscribes another while it is being
    // called. Delivery walks a snapshot, so the newcomer waits.
    const bus = createDevToolsBus();
    const latecomer = recorder();

    bus.subscribe('route', () => {
      bus.subscribe('route', latecomer.fn);
    });

    // Act
    bus.publish('route', '/first');

    // Assert: not called during the publish that registered it...
    expect(latecomer.seen).toEqual([]);

    // ...and called from the next one. Without this half, a bus that
    // never delivered to the newcomer at all would pass.
    bus.publish('route', '/second');
    expect(latecomer.seen).toEqual(['/second']);
  });

  it('lets a subscriber read last during delivery and see its own payload', () => {
    // Arrange: `last` is written before delivery, so the payload a
    // subscriber is handed is already the remembered one.
    const bus = createDevToolsBus();
    const observed: unknown[] = [];

    bus.publish('artefact', { id: 'old' });
    bus.subscribe('artefact', () => {
      observed.push(bus.last('artefact'));
    });

    // Act
    bus.publish('artefact', { id: 'new' });

    // Assert: the new payload, not the one it replaced.
    expect(observed).toEqual([{ id: 'new' }]);
  });
});

describe('the factory and the singleton', () => {
  it('gives each created bus its own subscribers and its own last', () => {
    // Arrange
    const one = createDevToolsBus();
    const other = createDevToolsBus();
    const onOne = recorder();

    one.subscribe('route', onOne.fn);

    // Act
    other.publish('route', '/elsewhere');

    // Assert: no leak in either direction.
    expect(onOne.seen).toEqual([]);
    expect(one.last('route')).toBeUndefined();
    expect(other.last('route')).toBe('/elsewhere');
  });

  it('exports a shared singleton that no producer in this plan publishes on', () => {
    // The singleton is a bus, reachable and subscribable. What it is
    // NOT, in this plan, is a bus anything publishes on — so its own
    // delivery is exercised here by this file playing producer, and
    // the sweep below records the state a feature actually meets at
    // runtime today.
    for (const topic of TOPICS) {
      expect(devtoolsBus.last(topic)).toBeUndefined();
    }

    const listener = recorder();
    const dispose = devtoolsBus.subscribe('route', listener.fn);

    devtoolsBus.publish('route', '/singleton');
    expect(listener.seen).toEqual(['/singleton']);

    // Disposed, so this case leaves no subscriber behind on the
    // module-level instance for a later file to trip over. The `last`
    // it wrote stays, which is why every other case above builds its
    // own bus.
    dispose();
    devtoolsBus.publish('route', '/after-dispose');
    expect(listener.seen).toEqual(['/singleton']);
  });
});
