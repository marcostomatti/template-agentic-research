import type { DevToolsBusTopic } from './types';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { createDevToolsBus, devtoolsBus } from './bus';

/**
 * The four topics, annotated so a topic REMOVED from the union reds
 * this line rather than quietly shrinking what every case below
 * sweeps.
 *
 * `open-item` is swept beside the other three on purpose: it is the
 * one topic with a declared payload, and every reading this list
 * feeds — `last` before a publish, `recent` before a publish, the
 * singleton's untouched state — must answer for it exactly as for the
 * `unknown` ones. A typed payload changes what may be PUBLISHED and
 * nothing about how the bus holds it.
 */
const TOPICS: readonly DevToolsBusTopic[] = [
  'error',
  'route',
  'artefact',
  'open-item',
];

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

  it('answers an empty list from recent on every topic before any publish', () => {
    // Arrange: a bus nothing has touched, built rather than the
    // singleton for the reason the `last` case above gives — a
    // producer landing later would make a reading of the shared
    // instance start failing.
    const bus = createDevToolsBus();

    // Act + Assert: an untouched topic is EMPTY rather than absent.
    // `recent` never answers `undefined`, so a caller writes
    // `recent(t, 5).map(...)` with no guard, and the sweep is over
    // every topic so one seeded differently from the others would red
    // here.
    for (const topic of TOPICS) {
      expect(bus.recent(topic, 5)).toEqual([]);
    }

    // The positive control, varied along the one axis that matters:
    // after a publish the SAME call answers the payload, so a `recent`
    // hard-wired to `[]` would fail here rather than pass the sweep.
    bus.publish('route', '/lexicon');
    expect(bus.recent('route', 5)).toEqual(['/lexicon']);
    expect(bus.recent('error', 5)).toEqual([]);
  });

  it('answers an empty list for a request of zero or fewer', () => {
    // Arrange: a topic with something in it, so an empty answer can
    // only come from the count and not from an empty ring. This is the
    // arrangement the case above cannot make.
    const bus = createDevToolsBus();

    bus.publish('error', 'first');
    bus.publish('error', 'second');

    // Act + Assert: zero asks for nothing and gets nothing.
    expect(bus.recent('error', 0)).toEqual([]);

    // A negative count takes the same branch. Spelled out because
    // `[...].slice(0, -1)` would NOT: it would answer everything but
    // the oldest — here `['second']`, a plausible-looking window
    // nobody asked for — so this line is what separates the guard
    // from a bare slice.
    expect(bus.recent('error', -1)).toEqual([]);

    // The control: the same ring, asked properly, is not empty.
    expect(bus.recent('error', 2)).toEqual(['second', 'first']);
  });

  it('keeps an open-item publish off every other topic', () => {
    // Arrange: a subscriber on each topic, so the case reads where the
    // payload went AND where it did not. The fourth topic is the one
    // the shell itself consumes, so a leak here would open a widget
    // item on a route change.
    const bus = createDevToolsBus();
    const onOpen = recorder();
    const onError = recorder();
    const onRoute = recorder();
    const onArtefact = recorder();

    bus.subscribe('open-item', onOpen.fn);
    bus.subscribe('error', onError.fn);
    bus.subscribe('route', onRoute.fn);
    bus.subscribe('artefact', onArtefact.fn);

    // Act
    bus.publish('open-item', { featureId: 'feedback', itemId: 'drawer' });

    // Assert: one delivery, and the other three topics untouched in
    // every reading they offer — the subscriber, `last` and the ring.
    expect(onOpen.seen).toEqual([{ featureId: 'feedback', itemId: 'drawer' }]);
    expect([onError.seen, onRoute.seen, onArtefact.seen]).toEqual([[], [], []]);
    expect(bus.last('error')).toBeUndefined();
    expect(bus.recent('route', 5)).toEqual([]);
    expect(bus.recent('artefact', 5)).toEqual([]);

    // The control, varied along the one axis that matters: a publish
    // on one of those topics DOES reach its own subscriber, so a bus
    // that had stopped delivering anywhere would fail here rather than
    // pass the emptiness above.
    bus.publish('route', '/lexicon');
    expect(onRoute.seen).toEqual(['/lexicon']);
    expect(onOpen.seen).toHaveLength(1);
  });

  it('answers only what was published when asked for more than there are', () => {
    // Arrange: two payloads, a request for fifty.
    const bus = createDevToolsBus();

    bus.publish('artefact', { id: 'a1' });
    bus.publish('artefact', { id: 'a2' });

    // Act
    const answered = bus.recent('artefact', 50);

    // Assert: what there is, newest first, and nothing padded — no
    // `undefined` tail, which is what a pre-sized array would leave.
    expect(answered).toEqual([{ id: 'a2' }, { id: 'a1' }]);
    expect(answered).toHaveLength(2);
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

  it('holds an open-item payload in last and in the ring like any other', () => {
    // Arrange: the typed topic, read through all three of the bus's
    // readings. The claim is that the payload type buys a compiler
    // refusal at the publish site and changes NOTHING about storage —
    // the same identity out of `last`, the same newest-first ring.
    const bus = createDevToolsBus();
    const listener = recorder();
    const first = { featureId: 'feedback', itemId: 'drawer' };
    const second = { featureId: 'feedback', itemId: 'report' };

    bus.subscribe('open-item', listener.fn);

    // Act
    bus.publish('open-item', first);
    bus.publish('open-item', second);

    // Assert: delivered in publish order, remembered as the newest by
    // identity, and windowed newest-first.
    expect(listener.seen).toEqual([first, second]);
    expect(bus.last('open-item')).toBe(second);
    expect(bus.recent('open-item', 5)).toEqual([second, first]);

    // And the payload is handed through unchanged rather than copied
    // or normalised on the way — a shell resolving it reads the ids
    // the publisher wrote.
    expect(listener.seen[0]).toBe(first);
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
    const observedRings: unknown[][] = [];

    bus.publish('artefact', { id: 'old' });
    bus.subscribe('artefact', () => {
      observed.push(bus.last('artefact'));
      observedRings.push([...bus.recent('artefact', 2)]);
    });

    // Act
    bus.publish('artefact', { id: 'new' });

    // Assert: the new payload, not the one it replaced.
    expect(observed).toEqual([{ id: 'new' }]);

    // The ring is written at the same point, so a subscriber reading
    // it mid-delivery already sees its own payload at the front.
    expect(observedRings).toEqual([[{ id: 'new' }, { id: 'old' }]]);
  });
});

describe('the recent ring', () => {
  it('answers the newest payloads first and stops at the asked-for count', () => {
    // Arrange: five publishes on one topic, distinguishable by value
    // so the ORDER of the answer is readable and not just its length.
    const bus = createDevToolsBus();

    for (const route of ['/one', '/two', '/three', '/four', '/five']) {
      bus.publish('route', route);
    }

    // Act
    const newestThree = bus.recent('route', 3);

    // Assert: newest first. Asserted as the whole array rather than
    // element by element, so a ring that answered oldest-first — the
    // reversed list, which has the same length and the same members —
    // reds here.
    expect(newestThree).toEqual(['/five', '/four', '/three']);

    // And the window is the newest end of the stream rather than a
    // slice from anywhere in it: asking for everything shows the two
    // the request above left out, still in the same order.
    expect(bus.recent('route', 5)).toEqual([
      '/five',
      '/four',
      '/three',
      '/two',
      '/one',
    ]);
  });

  it('keeps each topic its own ring', () => {
    // Arrange: interleaved publishes, so a single shared ring would
    // answer the other topic's payloads here.
    const bus = createDevToolsBus();

    bus.publish('error', 'e1');
    bus.publish('route', '/r1');
    bus.publish('error', 'e2');

    // Act + Assert
    expect(bus.recent('error', 5)).toEqual(['e2', 'e1']);
    expect(bus.recent('route', 5)).toEqual(['/r1']);
    expect(bus.recent('artefact', 5)).toEqual([]);
  });

  it('holds at most twenty payloads per topic and drops the oldest', () => {
    // Arrange: twenty-five publishes, five more than the cap. The `20`
    // below is the literal rather than the module's constant on
    // purpose — importing the cap would make this case pass for
    // whatever the cap said, which is exactly what a cap case must
    // not do.
    const bus = createDevToolsBus();

    for (let index = 1; index <= 25; index += 1) {
      bus.publish('error', `boom-${String(index)}`);
    }

    // Act: ask for more than the cap, so the length read below is the
    // RING's and not the request's.
    const held = bus.recent('error', 100);

    // Assert: twenty held, newest first, the oldest five gone.
    expect(held).toHaveLength(20);
    expect(held[0]).toBe('boom-25');
    expect(held[19]).toBe('boom-6');
    expect(held).not.toContain('boom-5');
    expect(held).not.toContain('boom-1');
  });

  it('answers a fresh array a caller may not write back through', () => {
    // Arrange
    const bus = createDevToolsBus();

    bus.publish('error', 'kept');

    // Act: a caller does what a caller does with an array it was
    // handed — sorts it, pushes to it, holds on to it.
    const held = bus.recent('error', 5);

    (held as unknown[]).push('intruder');
    bus.publish('error', 'later');

    // Assert: the bus's own ring is untouched by the push, and the
    // array the caller holds did not grow when the later payload
    // arrived. Two separate promises, and a `recent` returning the
    // ring itself would break both.
    expect(bus.recent('error', 5)).toEqual(['later', 'kept']);
    expect(held).toEqual(['kept', 'intruder']);
  });

  it('leaves last reading exactly what it read before the ring existed', () => {
    // Arrange: more publishes than a `last` can hold, which is the
    // arrangement where a `last` accidentally rewired to the ring
    // would show — it would answer an ARRAY rather than the payload.
    const bus = createDevToolsBus();

    bus.publish('route', '/first');
    bus.publish('route', '/second');
    bus.publish('route', '/third');

    // Act + Assert: one payload, the newest, by identity.
    expect(bus.last('route')).toBe('/third');
    expect(bus.last('route')).not.toBeInstanceOf(Array);

    // The two readings agree where they overlap...
    expect(bus.recent('route', 1)).toEqual(['/third']);

    // ...and disagree where they must: `last` is still `undefined`
    // and not `[]` on an untouched topic, so the ring did not change
    // how a feature tells "nothing published" from "published
    // nothing".
    expect(bus.last('artefact')).toBeUndefined();
    expect(bus.recent('artefact', 1)).toEqual([]);
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
