/**
 * @packageDocumentation
 * The pub/sub a feature reaches through `DevToolsHost.bus` — the
 * runtime behind the {@link DevToolsBus} contract `./types.ts`
 * declares.
 *
 * This module is pure and React-free: no import of `react`, no
 * `document`, no `localStorage`, no request sent and no timer. It is
 * three maps and a closure, so it needs no renderer to be tested and
 * pulls nothing into a bundle beyond itself.
 *
 * ## NO PRODUCER EXISTS IN THIS PLAN
 *
 * Nothing in `q20b-1-dev-tools-shell` publishes on this bus. The three
 * topics are fixed here — `error`, `route`, `artefact` — and the
 * payloads stay `unknown`, because the shapes they carry are settled
 * by the plan that adds the producers, not by this one. A payload type
 * guessed now would be a contract nothing publishes against.
 *
 * So every reading in `bus.test.ts` publishes its own payloads. That
 * is not a gap in coverage: the bus is finished, and what is missing
 * is a caller. Until one lands, {@link DevToolsBus.last} answers
 * `undefined` on all three topics for the whole life of the app, and
 * a feature reading it must treat that as the normal case rather than
 * as a failure.
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
 *   `set.delete(fn)` — answers `Tests  1 failed | 10 passed (11)`, the
 *   one being `does not remove a later subscriber when an unsubscribe
 *   is called twice`.
 * - Removing the `try`/`catch` around each delivery answers the same
 *   `1 failed | 10 passed`, the one being `keeps delivering to the
 *   others when a subscriber throws` — the thrown `devtools-test:
 *   subscriber exploded` escaping `publish`.
 * - Iterating the live `Set` rather than the snapshot answers `1 failed
 *   | 10 passed`, the one being `defers a subscription made during
 *   delivery to the next publish`.
 * - Writing `last` after delivery instead of before answers `1 failed |
 *   10 passed`, the one being `lets a subscriber read last during
 *   delivery and see its own payload`.
 * - Making `last` answer `null` rather than `undefined` for an
 *   untouched topic answers `4 failed | 7 passed` — every case that
 *   reads an unpublished topic, which is the first refusal case and
 *   three later ones. Named here rather than trimmed to one, because a
 *   mutation note that claims a tighter blast radius than the run
 *   reports is the same false confidence it exists to prevent.
 *
 * `console.error` is the one behaviour with no case of its own, on
 * purpose: pinning it would mean asserting on a console stub in a file
 * whose subject is delivery, and the reporting is not what a caller
 * depends on. Replacing the `console.error` line with an empty `catch`
 * answers `Tests  11 passed (11)` — measured. What the suite pins is
 * that the throw does not escape and that the remaining subscribers
 * still run.
 */

import type { DevToolsBus, DevToolsBusTopic } from './types';

/** Every topic, so a fresh bus can seed one entry per topic. */
const TOPICS: readonly DevToolsBusTopic[] = ['error', 'route', 'artefact'];

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

  return {
    subscribe(topic, fn) {
      const forTopic = subscribers.get(topic);

      forTopic?.add(fn);

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
        forTopic?.delete(fn);
      };
    },

    publish(topic, payload) {
      // Before delivery, so a subscriber reading `last(topic)` while
      // it is being called sees what it was handed.
      latest.set(topic, payload);

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
      return latest.get(topic);
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
 * {@link DevToolsBus.last} answers `undefined` on all three topics
 * until the plan that adds the producers lands.
 */
export const devtoolsBus: DevToolsBus = createDevToolsBus();
