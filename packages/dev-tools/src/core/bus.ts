/**
 * @packageDocumentation
 * The pub/sub a feature reaches through `DevToolsHost.bus` — the
 * runtime behind the {@link DevToolsBus} contract `./types.ts`
 * declares.
 *
 * This module is pure and React-free: no import of `react`, no
 * `document`, no `localStorage`, no request sent and no timer. It is
 * three maps and a closure — the subscribers, the last payload per
 * topic and that topic's ring — so it needs no renderer to be tested
 * and pulls nothing into a bundle beyond itself.
 *
 * ## WHO PUBLISHES, AND WHICH WAY EACH TOPIC RUNS
 *
 * No module in this package publishes on this bus as of this commit.
 * `error`, `route` and `artefact` run INTO the widget from the host
 * app — announcements it makes about itself, whose payloads stay
 * `unknown` because their shapes are the producer's to settle and a
 * type guessed here would be a contract nothing publishes against.
 * `open-item` runs into the widget too but is acted ON rather than
 * summarised: the publisher names a feature id and an item id and the
 * shell opens that item, so it is the one topic `./types.ts` gives a
 * payload type — {@link DevToolsOpenItemPayload}.
 *
 * A typed payload constrains the CALLER the compiler can see, which
 * is not the same as a guarantee about the value: a consumer acting
 * on an `open-item` payload still checks its shape before trusting
 * it.
 *
 * So every reading in `bus.test.ts` publishes its own payloads. That
 * is not a gap in coverage: the bus is finished, and what is missing
 * is a caller. Until one lands, {@link DevToolsBus.last} answers
 * `undefined` and {@link DevToolsBus.recent} an empty array on all
 * four topics for the whole life of the app, and a feature reading
 * either must treat that as the normal case rather than as a failure
 * — which is why neither reading is spelled as a refusal: an
 * untouched topic answers the empty list a drained one answers.
 *
 * ## The three assertions in the factory
 *
 * The contract's members are generic in their topic; the closure's
 * three maps are not, and cannot be — one `Map` holds every topic's
 * payloads at once, so its value type is the union, which is
 * `unknown`. Each assertion below therefore re-states what
 * {@link DevToolsBus.publish}'s signature already enforced at the way
 * in, and none of them widens what a caller may publish. They are the
 * whole of the unchecked typing in this module:
 *
 * - `subscribe` stores the handler as `(payload: unknown) => void`.
 * - `last` and `recent` re-narrow what the maps answer.
 *
 * The runtime is topic-keyed and copies nothing between topics, so a
 * payload cannot reach a reader of a different topic than the one it
 * was published on — which is what makes the re-narrowing sound.
 *
 * ## What the shapes are, and why
 *
 * - A disposer is idempotent. {@link DevToolsBus.subscribe} returns a
 *   function that may be called any number of times; the second call
 *   and every one after it does nothing. A React effect cleanup can
 *   run twice under StrictMode, and a disposer that removed "whatever
 *   is there now" would remove a LATER subscriber registered by the
 *   same function value.
 * - Subscribers are held in a `Set` per topic, so the same function
 *   subscribed twice is held once. That is the honest reading of
 *   identity-keyed listeners, and it is why the disposer clears its
 *   own flag rather than counting.
 * - {@link DevToolsBus.publish} iterates a SNAPSHOT of the set. A
 *   subscriber that subscribes or unsubscribes while being called
 *   therefore takes effect from the NEXT publish, and cannot make the
 *   current one skip or double-deliver.
 * - A throwing subscriber does not stop the others, and the throw does
 *   not escape `publish`. A dev-tools widget that fell over because
 *   one listener was buggy would take the app's whole publish site
 *   with it. The error is reported on `console.error` rather than
 *   swallowed — see the mutation note for what that costs.
 * - `last` is written BEFORE delivery, so a subscriber that reads
 *   `last(topic)` while being called for that topic sees the payload
 *   it is being handed and not the previous one.
 * - The ring is written at the same point and in the same order:
 *   newest FIRST, capped at 20 payloads per topic, the oldest dropped
 *   once the cap is reached. Newest-first rather than append-and-
 *   reverse because every caller wants the newest few and `slice(0,
 *   n)` is then the whole of `recent`.
 * - Each publish REPLACES the ring with a new array rather than
 *   mutating the held one, and `recent` slices a copy on the way out.
 *   The promise is that an array a caller holds neither grows as
 *   payloads arrive nor reaches the bus's state when the caller sorts
 *   it, and `recent`'s copy alone is what currently keeps it — the
 *   replace in `publish` is unobservable on its own, measured in the
 *   mutation note, and is here so the promise survives a later
 *   `recent` written without one.
 * - `recent(topic, n)` answers `min(n, published, 20)` payloads and
 *   pads nothing, and `n <= 0` answers an empty array rather than
 *   reaching `slice`, where a negative would have read as an offset
 *   from the END and answered a window nobody asked for.
 *
 * ## The singleton, and when to use the factory instead
 *
 * {@link devtoolsBus} is the module-level instance the shell and its
 * features share — one bus per app, created on first import of this
 * module. {@link createDevToolsBus} is the same thing without the
 * sharing, and exists for the callers that must not touch that shared
 * state: every case in `bus.test.ts` builds its own, so no case can
 * leak a subscriber or a `last` value into the next one.
 *
 * ## Mutation note — what the colocated cases actually catch
 *
 * A green suite is not evidence a case can fail. Each leg below was
 * measured by breaking this file, reds `bun x vitest run
 * src/core/bus.test.ts` from `packages/dev-tools`, and restores this
 * file byte-identical:
 *
 * - Dropping the `disposed` flag from the disposer — leaving it a bare
 *   `set.delete(fn)` — answers `Tests  1 failed | 20 passed (21)`, the
 *   one being `does not remove a later subscriber when an unsubscribe
 *   is called twice`.
 * - Removing the `try`/`catch` around each delivery answers the same
 *   `1 failed | 20 passed`, the one being `keeps delivering to the
 *   others when a subscriber throws` — the thrown `devtools-test:
 *   subscriber exploded` escaping `publish`.
 * - Iterating the live `Set` rather than the snapshot answers `1 failed
 *   | 20 passed`, the one being `defers a subscription made during
 *   delivery to the next publish`.
 * - Writing `last` after delivery instead of before answers `1 failed |
 *   20 passed`, the one being `lets a subscriber read last during
 *   delivery and see its own payload`. Moving the RING's write after
 *   delivery answers the same one failure, because that case reads
 *   both mid-delivery.
 * - Making `last` answer `null` rather than `undefined` for an
 *   untouched topic answers `6 failed | 15 passed` — every case that
 *   reads an unpublished topic: `answers undefined from last on every
 *   topic before any publish`, `remembers the most recent payload per
 *   topic`, `keeps an open-item publish off every other topic`, `leaves
 *   last reading exactly what it read before the ring existed`, `gives
 *   each created bus its own subscribers and its own last` and `exports
 *   a shared singleton that no producer in this plan publishes on`.
 *   Named rather than trimmed to one, because a mutation note that
 *   claims a tighter blast radius than the run reports is the same
 *   false confidence it exists to prevent.
 *
 * The ring's own legs, measured the same way:
 *
 * - Appending oldest-first — `[...held, payload]` — answers `9 failed |
 *   12 passed`. Every ring case reads order, so the blast radius is the
 *   whole of them plus `lets a subscriber read last during delivery`
 *   and the `open-item` ring case; this is the mutation the suite is
 *   loudest about.
 * - Dropping the `.slice(0, DEVTOOLS_BUS_RING_LIMIT)` answers `1 failed
 *   | 20 passed`, the one being `holds at most twenty payloads per
 *   topic and drops the oldest`. Raising the cap to `21` answers the
 *   same single failure, which is what makes that case a reading of
 *   TWENTY rather than of "some cap".
 * - Dropping the `n <= 0` guard and letting `slice` see the count
 *   answers `1 failed | 20 passed`, the one being `answers an empty
 *   list for a request of zero or fewer` — the negative half of it,
 *   where a bare `slice(0, -1)` answers `['second']`.
 * - Handing back the held array when it fits — `held.length <= n ?
 *   held : held.slice(0, n)` — answers `1 failed | 20 passed`, the one
 *   being `answers a fresh array a caller may not write back through`.
 *
 * The fourth topic's own legs, measured the same way:
 *
 * - Dropping `'open-item'` from {@link TOPICS} — leaving the runtime
 *   roster three members while the union keeps four — answers `2
 *   failed | 19 passed`: `keeps an open-item publish off every other
 *   topic` and `holds an open-item payload in last and in the ring
 *   like any other`. `check-types` stays GREEN through it, which is
 *   the point of measuring it: the roster is a value the contract
 *   cannot check, so only these two cases stand between a topic in the
 *   union and a topic the runtime seeds.
 * - Delivering to every topic's subscribers rather than the published
 *   one's answers `2 failed | 19 passed`: `hands a published payload to
 *   every subscriber of that topic only` and `keeps an open-item
 *   publish off every other topic`. The second of the pair is what
 *   makes the crosstalk reading specific to the topic the shell acts
 *   on.
 *
 * Two readings came back green and are recorded because they say where
 * this file's cases stop. Replacing the `console.error` line with an
 * empty `catch` answers `Tests  21 passed (21)`: the reporting has no
 * case of its own on purpose, since pinning it would mean asserting on
 * a console stub in a file whose subject is delivery. And making the
 * ring an in-place `unshift` — mutating the held array instead of
 * replacing it — ALSO answers `21 passed`, because `recent` still
 * slices on the way out and nothing outside this closure can tell. So
 * the fresh-array case pins the copy `recent` makes, not the copy
 * `publish` makes; the two together only red when BOTH go (`1 failed |
 * 20 passed`, the same case). The replace in `publish` is belt to that
 * brace and is kept for the reader, not for the suite.
 */

import type {
  DevToolsBus,
  DevToolsBusPayloads,
  DevToolsBusTopic,
} from './types';

/**
 * Every topic, so a fresh bus can seed one entry per topic.
 *
 * The runtime's copy of the roster `./types.ts` declares as the keys
 * of `DevToolsBusPayloads`, and it must list the same four members: a
 * topic missing here is subscribable — the maps answer `undefined`
 * and every read falls back — but its `Set` is never seeded, which is
 * a difference no caller should have to know about.
 */
const TOPICS: readonly DevToolsBusTopic[] = [
  'error',
  'route',
  'artefact',
  'open-item',
];

/**
 * How many payloads a topic's ring keeps.
 *
 * Twenty per topic, by the spec, and deliberately not configurable:
 * the ring exists so a report can carry the few failures that led to
 * the one being reported, and a number a caller could raise would make
 * this an unbounded log of every payload an app ever published — held
 * by a widget that never unmounts, on payloads it does not own.
 *
 * Module-private rather than exported, so the cap can only be read
 * where it is enforced. `bus.test.ts` pins the literal `20` instead of
 * importing this: a case asserting `ring.length === LIMIT` would pass
 * for whatever this said, which is the one thing a cap case must not
 * do.
 */
const DEVTOOLS_BUS_RING_LIMIT = 20;

/**
 * Build a bus with no subscribers and no remembered payloads.
 *
 * Prefer {@link devtoolsBus} in application and feature code — one app
 * has one bus. Reach for this factory when a caller must NOT share
 * that state: every case in `bus.test.ts` builds its own, which is
 * what keeps the cases independent of each other's ordering.
 *
 * @returns A fresh, independent {@link DevToolsBus}.
 */
export function createDevToolsBus(): DevToolsBus {
  const subscribers = new Map<DevToolsBusTopic, Set<(payload: unknown) => void>>(
    TOPICS.map((topic) => [topic, new Set<(payload: unknown) => void>()]),
  );
  const latest = new Map<DevToolsBusTopic, unknown>();

  // Newest first, capped at `DEVTOOLS_BUS_RING_LIMIT` per topic. Held
  // beside `latest` rather than derived from it: `latest` remembers one
  // payload and the ones it replaced are gone, so a window over them
  // has to be kept as they arrive.
  const rings = new Map<DevToolsBusTopic, readonly unknown[]>();

  return {
    subscribe(topic, fn) {
      const forTopic = subscribers.get(topic);

      // The set holds one handler type for every topic, so the
      // topic-narrowed handler is stored widened. Sound because the
      // set is the one for THIS topic and `publish` only ever hands it
      // that topic's payload.
      const listener = fn as (payload: unknown) => void;

      forTopic?.add(listener);

      // `disposed` is per-DISPOSER rather than per-subscriber: the
      // second call of this disposer must not delete a subscriber that
      // a later `subscribe(topic, fn)` put back under the same
      // function value.
      let disposed = false;

      return () => {
        if (disposed) {
          return;
        }

        disposed = true;
        forTopic?.delete(listener);
      };
    },

    publish(topic, payload) {
      // Before delivery, so a subscriber reading `last(topic)` — or
      // `recent(topic, n)` — while it is being called sees what it was
      // handed rather than the payload before it.
      latest.set(topic, payload);

      // A NEW array each publish rather than an `unshift` into the held
      // one, so an array handed out earlier cannot grow or shift under
      // its holder. On its own this is unobservable — `recent` slices
      // on the way out, and the suite stays green when this line
      // mutates in place instead (measured; see the mutation note). It
      // is kept because the two copies together are what make the
      // promise hold however `recent` is later written.
      rings.set(topic, [payload, ...(rings.get(topic) ?? [])].slice(
        0,
        DEVTOOLS_BUS_RING_LIMIT,
      ));

      // A snapshot, so subscribing or unsubscribing from inside a
      // subscriber takes effect from the next publish rather than
      // mid-loop.
      const delivering = [...(subscribers.get(topic) ?? [])];

      for (const fn of delivering) {
        try {
          fn(payload);
        } catch (error) {
          // Reported, never swallowed — and never rethrown: one buggy
          // listener may not take down the publishing site.
          console.error(`devtools bus: a '${topic}' subscriber threw`, error);
        }
      }
    },

    last(topic) {
      // Re-narrowed: the map is keyed by topic and written only by
      // `publish`, which took this topic's payload type.
      return latest.get(topic) as DevToolsBusPayloads[typeof topic] | undefined;
    },

    recent(topic, n) {
      // Guarded rather than left to `slice`: `slice(0, -1)` answers
      // everything BUT the oldest, which is a plausible-looking window
      // no caller asked for. Zero takes the same branch, and its answer
      // is the untouched topic's answer.
      if (n <= 0) {
        return [];
      }

      // `slice` copies, so the caller never holds the ring itself.
      // Re-narrowed for the reason `last` gives.
      return (rings.get(topic) ?? []).slice(
        0,
        n,
      ) as DevToolsBusPayloads[typeof topic][];
    },
  };
}

/**
 * The bus the shell and its features share — one per app.
 *
 * Created at module load, which is the earliest any importer can
 * observe it, so a subscriber registered during the app's own module
 * evaluation is already held before the first publish could happen.
 *
 * No producer exists in this plan: nothing publishes on it yet, so
 * {@link DevToolsBus.last} answers `undefined` and
 * {@link DevToolsBus.recent} an empty array on all four topics until
 * the plan that adds the producers lands.
 */
export const devtoolsBus: DevToolsBus = createDevToolsBus();
