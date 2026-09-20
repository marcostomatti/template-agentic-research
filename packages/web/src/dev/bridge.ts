/**
 * @packageDocumentation
 * The bridge: what the app says about itself, republished onto the
 * dev-tools bus — and the one translation that runs the other way.
 *
 * `./devtools.ts` is the config and this is the wiring. They are two
 * modules for two reasons. The first is size: that file was already
 * 417 lines against this package's 800-line cap before any of this
 * existed. The second outlives it — the config answers "what is the
 * widget TOLD about this app", and pure functions plus one
 * `mountDevTools` call are the whole of it, while this module answers
 * "which of the app's own facts reach the widget while it is up", and
 * every line of it is a subscription with a lifetime. Nothing here is
 * pure and nothing there holds state.
 *
 * Both halves live under `src/dev/`, which is reached ONLY through
 * `../main.tsx`'s `import.meta.env.DEV` dynamic import, so neither is
 * in a production build. That is what lets this file import
 * `@ar/dev-tools/feedback` at all: `../app-shell/appSignals.ts`
 * imports nothing outside the language precisely so the boundary and
 * the fallback can publish from a production module, and the
 * asymmetry is the seam — the app side names no bus and no feature id,
 * and this side names both.
 *
 * ## Everything it talks to is INJECTED, and that is a test property
 *
 * {@link installDevToolsBridge} takes the signals, the bus and the
 * capture installer rather than importing any of the three. The
 * package's `devtoolsBus` is a singleton and its `installGlobalCapture`
 * reaches `window`; this app's `appSignals` is a singleton too. A
 * module that reached for them directly could be covered by no case
 * in this package: the unit runner is node-only, so `window` is not
 * there to add a listener to, and a case driving the shared bus would
 * leave its own payloads in a ring every later case reads.
 *
 * So the three arguments ARE the seam, `./devtools.ts` is the one
 * module that fills them with the real three, and every case below
 * drives a bus it built itself. The capture arrives as a FUNCTION for
 * the sharper half of the same reason: this module then contains no
 * DOM read at all, and a stub can record which bus it was handed.
 *
 * ## The republished topics are derived, not listed twice
 *
 * {@link DevToolsBridgeTopic} is `Extract<AppSignalTopic,
 * DevToolsBusTopic>` — the topics both channels declare, which is
 * exactly what "republished under the same name" can mean. Today that
 * is `error`, `route` and `artefact`: the app's other two (`devtools`
 * and `open-feedback`) are the handshake and never reach the bus as
 * themselves, and the bus's other one (`open-item`) runs the other
 * way. Derived rather than written as a second union so a topic added
 * to one side alone cannot quietly appear here.
 *
 * {@link REPUBLISHED_TOPICS} is the runtime's copy of that set and the
 * type system cannot check it — the same trap `appSignals.ts`'s
 * `TOPICS` and `bus.ts`'s carry, and the same consequence: a member
 * missing from the array is not a type error, it is a topic that is
 * simply never republished. `check-types` stays green through it.
 * Nothing but one case per topic stands there, which is why the cases
 * below read the three by name rather than looping over the array
 * they are checking.
 *
 * ## Payloads are passed through, not copied
 *
 * A republish hands the bus the SAME object the app published. Every
 * payload type declares every member `readonly` — `AppErrorSignal`,
 * `AppRouteSignal` and `AppArtefactSignal` all do — nothing on either
 * side writes through one, and a copy would make the bus's ring hold
 * values a report could not match against the app's own. So the
 * identity is the contract, and three cases read it with `toBe`.
 *
 * ## Order: the handshake is published LAST, both times
 *
 * On install, `devtools` `{installed: true}` goes out after every
 * subscription is registered and after the capture is installed. The
 * signal means "a reporter is attached and will hear you", and
 * `CrashFallback` reads it to decide whether its report button can do
 * anything; published first, it would be true of a bridge that was
 * still half-built, and a listener that answered it by publishing
 * `open-feedback` would reach nothing.
 *
 * On disposal the mirror: every subscription goes, the capture goes,
 * and `{installed: false}` is published last — so a listener acting on
 * it cannot reach a bridge that is partly alive.
 *
 * ## The disposer takes the capture down too
 *
 * The bridge installed the window listeners, so the bridge removes
 * them. Anything else would leave a pair of listeners publishing on a
 * bus the widget no longer reads, held by a disposer nobody kept —
 * and `startDevTools`'s caller has one thing to call.
 *
 * It is idempotent for the reason every disposer in both channels is:
 * a second call must not publish a second `{installed: false}`, and
 * must not remove a subscriber a LATER install registered under the
 * same function value. React StrictMode runs an effect cleanup twice,
 * and this app renders under it.
 *
 * ## Two things it deliberately does NOT do
 *
 * It does not REPLAY. `AppSignals.last` remembers the most recent
 * payload per topic and this module never reads it, so a navigation
 * that happened before the widget mounted is not republished. That is
 * the honest shape: the bus's ring is what LED to a report, and a
 * single stale payload injected at install time would sit in it dated
 * now rather than then. What that costs is the FIRST `route`:
 * `../main.tsx` reaches this side through a dynamic import, so the
 * layout effect's first publish lands a microtask before the bridge
 * exists — the same ordering `../app-shell/CrashFallback.tsx` states
 * at length, and its reason for subscribing to `devtools` rather than
 * reading `last` once.
 *
 * It does not subscribe to the bus. `open-item` is the only topic that
 * runs into the widget, and the shell is already subscribed to it —
 * the app has nothing to hear back.
 *
 * ## Mutation note — what the colocated cases actually catch
 *
 * A green suite is not evidence a case can fail. Each leg below was
 * measured by breaking this file, reds `bun x vitest run
 * src/dev/bridge.test.ts` from `packages/web` against the 17 cases
 * `./bridge.test.ts` holds, and restores this file byte-identical (the
 * harness compared the restored `shasum -a 256` to the original, every
 * leg):
 *
 * - Dropping the `disposed` flag from the disposer answers `Tests  2
 *   failed | 15 passed (17)`: `publishes the devtools signal once for
 *   a disposer called twice`, as `expected [ true, false, false ] to
 *   deeply equal [ true, false ]`, and `takes the global capture down
 *   once for a disposer called twice`.
 * - Publishing `{installed: true}` BEFORE the subscriptions answers `1
 *   failed | 16 passed`, the one being `registers every subscription
 *   before it announces that it is installed`, as `expected [] to
 *   deeply equal [ 'open-item' ]` — that case answers the handshake by
 *   publishing `open-feedback` from inside the subscriber, which
 *   reaches the bus only if the translation was already wired.
 * - Dropping the install publish outright answers `3 failed | 14
 *   passed`: `announces on the app channel that it is installed`, the
 *   disposer-twice case, and the ordering case above — which is what
 *   says the ordering case is a reading of ORDER rather than a second
 *   reading of the publish.
 * - Dropping the disposal publish answers `2 failed | 15 passed`:
 *   `announces on the app channel that it is gone` and the
 *   disposer-twice case.
 * - Leaving the capture's disposer out of the teardown — installing it
 *   and holding nothing — answers `2 failed | 15 passed`: `takes the
 *   global capture down on disposal` and `takes the global capture
 *   down once for a disposer called twice`, both as `expected [] to
 *   have a length of 1 but got +0`.
 * - Installing the capture on a bus of its own rather than the one the
 *   bridge was handed answers `1 failed | 16 passed`, the one being
 *   `installs the global capture on the bus it was handed`. That is
 *   the silent shape the identity assertion exists for: a capture on
 *   the wrong bus publishes every window failure somewhere nothing
 *   reads, and every other case in the file stays green.
 * - Dropping `'artefact'` from {@link REPUBLISHED_TOPICS} answers `3
 *   failed | 14 passed`: `republishes an artefact payload, and the
 *   null that clears it`, `republishes every topic both channels
 *   declare` and `republishes nothing on any topic after disposal` —
 *   the last through its own control, which publishes all three over a
 *   live bridge and expects three. `bun x tsc --noEmit` exits `0`
 *   through that leg, measured, which is the reading the per-topic
 *   cases exist for: the roster is a value, the derived union cannot
 *   check it, and a missing member republishes nothing while every
 *   other topic still works.
 * - Copying each payload on the way out — `{ ...payload }` — answers
 *   `3 failed | 14 passed`: the three per-topic cases, the first two on
 *   `Object.is` equality between records that read identically and the
 *   `artefact` one on the deep comparison, because a spread of its
 *   `null` clear answers `{}`. The topic SWEEP stays green through it,
 *   which is what says the sweep reads topics and the three named
 *   cases read payloads.
 * - Republishing every topic onto `error` rather than the topic
 *   subscribed answers `3 failed | 14 passed`: the `route` case, the
 *   `artefact` case and the sweep. The `error` case does NOT red,
 *   which is exactly why the three are read one topic at a time.
 * - Reading `signals.last(topic)` at install and republishing the
 *   three answers `11 failed | 6 passed` — the loudest leg in the
 *   file, because a replay puts three payloads on the bus before any
 *   case has published anything, so every reading of what the bus saw
 *   moves at once. The one that names the behaviour is `republishes
 *   nothing that was published before it was installed`.
 *
 * One leg came back GREEN and is recorded because it says where these
 * cases stop. Spelling `'devtools.feedback'` and `'report'` as
 * literals here, instead of importing the package's two constants,
 * answers `Tests  17 passed (17)`: the cases assert against those same
 * constants, so they read the VALUES and cannot see where a value came
 * from. What defends the import is the package owning the ids and this
 * plan's law, not a case — and on the day the package renames one, the
 * literal reds the `open-feedback` case loudly rather than failing
 * silently in a browser, which is why this is a limitation rather than
 * a hole.
 */

import type {
  AppSignalTopic,
  AppSignals,
} from '../app-shell/appSignals';
import type { DevToolsBus, DevToolsBusTopic } from '@ar/dev-tools';

import { FEEDBACK_FEATURE_ID, FEEDBACK_ITEM_ID } from '@ar/dev-tools/feedback';

/**
 * A topic both channels declare, and therefore one the bridge can
 * republish under its own name.
 *
 * Derived from the two unions rather than written out: the app's
 * `devtools` and `open-feedback` are the handshake and the bus's
 * `open-item` runs the other way, so the intersection IS the
 * republish set.
 */
export type DevToolsBridgeTopic = Extract<AppSignalTopic, DevToolsBusTopic>;

/**
 * What the bridge hands back. Calling it more than once is harmless.
 *
 * Deliberately the same shape as the package's own `DevToolsDisposer`
 * rather than that type imported: `./devtools.ts` returns ONE disposer
 * covering the widget and the bridge, and the two being
 * structurally identical is what lets it compose them without an
 * adapter.
 */
export type DevToolsBridgeDisposer = () => void;

/**
 * How the bridge installs the package's window capture.
 *
 * `installGlobalCapture`'s shape, taken as an argument. The bus is a
 * REQUIRED parameter here although the package's default is optional,
 * so nothing can install the capture onto a bus other than the one
 * the bridge was handed.
 */
export type DevToolsCaptureInstaller =
  (bus: DevToolsBus) => DevToolsBridgeDisposer;

/** The three collaborators the bridge is handed, and never reaches for. */
export interface DevToolsBridgeInput {
  /** The app's channel — `appSignals` in the app, a fresh one in a case. */
  readonly signals: AppSignals;

  /** The widget's bus — `devtoolsBus` in the app, an injected one in a case. */
  readonly bus: DevToolsBus;

  /** The window capture installer, called once with {@link bus}. */
  readonly capture: DevToolsCaptureInstaller;
}

/**
 * The topics republished verbatim, in the order they are subscribed.
 *
 * The runtime's copy of {@link DevToolsBridgeTopic}, and the type
 * system cannot check it: a member missing here is a topic that is
 * never republished rather than an error. `./bridge.test.ts` reads the
 * three by NAME for that reason.
 */
const REPUBLISHED_TOPICS: readonly DevToolsBridgeTopic[] = [
  'error',
  'route',
  'artefact',
];

/**
 * Wire the app's signals to the dev-tools bus, and back for one topic.
 *
 * Called once per mount, and only when the widget actually mounted —
 * a bridge installed over a widget that refused would publish
 * `devtools` `{installed: true}` to a fallback whose report button
 * then had nowhere to go. `./devtools.ts` is the caller that takes
 * that reading; until it does, the only caller this function has is
 * `./bridge.test.ts`.
 *
 * Four subscriptions and one capture go up: `error`, `route` and
 * `artefact` are republished on the bus under the same names with the
 * payload passed through untouched, `open-feedback` becomes an
 * `open-item` publish naming the package's feedback feature and its
 * report item, and the window capture publishes on the same bus.
 * `devtools` `{installed: true}` is published last.
 *
 * @param input - The signals, the bus and the capture installer. See
 * this module's documentation on why all three are arguments.
 * @returns A disposer that removes every subscription, takes the
 * capture down and publishes `devtools` `{installed: false}` — in that
 * order. Calling it more than once is harmless.
 */
export function installDevToolsBridge(
  input: DevToolsBridgeInput,
): DevToolsBridgeDisposer {
  const { signals, bus, capture } = input;

  // Built in one expression rather than pushed into, so nothing can
  // be installed after the list that undoes it was closed. The
  // capture is last in, and the loop below takes them all down in the
  // same order they were installed - none of them cares.
  const installed: readonly DevToolsBridgeDisposer[] = [
    ...REPUBLISHED_TOPICS.map((topic) => signals.subscribe(topic, (payload) => {
      // The payload itself, not a copy: the bus's ring holds what the
      // app published, so a report can match the two.
      bus.publish(topic, payload);
    })),

    signals.subscribe('open-feedback', () => {
      // The one translation, and the ids are the package's own
      // constants: the app side names no feature and no item, which is
      // what `appSignals.ts` says of this topic.
      bus.publish('open-item', {
        featureId: FEEDBACK_FEATURE_ID,
        itemId: FEEDBACK_ITEM_ID,
      });
    }),

    capture(bus),
  ];

  // Last, so the fallback that reads this signal is answering a bridge
  // that can already hear it.
  signals.publish('devtools', { installed: true });

  // Per-DISPOSER rather than per-bridge: a second call must not
  // publish a second `{installed: false}`, and must not remove a
  // subscriber a later install registered under the same function
  // value. A React effect cleanup runs twice under StrictMode.
  let disposed = false;

  return () => {
    if (disposed) {
      return;
    }

    disposed = true;

    for (const dispose of installed) {
      dispose();
    }

    // Last again, and after the capture has gone: a listener acting on
    // `{installed: false}` cannot reach a bridge that is partly alive.
    signals.publish('devtools', { installed: false });
  };
}
