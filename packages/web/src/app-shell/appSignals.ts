/**
 * @packageDocumentation
 * The app's own pub/sub: what the app says about itself, to whoever
 * is listening, with no listener required.
 *
 * This module imports NOTHING outside the language. No `react`, no
 * `@ar/ui`, no storage, no network, and above all no `@ar/dev-tools`
 * — `@ar/web` takes that package as a devDependency, the Docker
 * `web` stage holds its manifest and no `dist/`, and a production
 * module that imported it would fail the image build. The boundary
 * and the fallback that publish here have to survive in a production
 * build, so the channel they publish on is app-local by construction
 * rather than by a grep. `src/dev/` is where the two sides meet: the
 * bridge, reached only through `src/main.tsx`'s
 * `import.meta.env.DEV` dynamic import, subscribes here and
 * republishes onto the package's `devtoolsBus`.
 *
 * Nothing here sends anything anywhere. The signals are memory: two
 * maps and a closure, which is also why a topic with no subscriber
 * costs one function call and one map write.
 *
 * ## The five topics, and who is at each end
 *
 * {@link AppSignalTopic} is CLOSED at five, and the five are not one
 * kind of thing. Three are observations the app makes about itself
 * and the bridge republishes on `devtoolsBus` under the same name:
 *
 * - `error` — a render failure `AppErrorBoundary.componentDidCatch`
 *   reduced through {@link errorPayload}.
 * - `route` — a navigation, published from one effect in
 *   `AppLayout.tsx`.
 * - `artefact` — which entity the current surface is about, published
 *   by `useArtefactSignal` through {@link artefactPayload}, and
 *   `null` once the surface that owned it is gone.
 *
 * The other two are the handshake between the app and whatever
 * reporter is attached, and never reach the bus as themselves:
 *
 * - `devtools` — `{installed}`, published BY the bridge on install
 *   and again from its disposer, read by `CrashFallback` to decide
 *   whether a "report this" button can do anything at all.
 * - `open-feedback` — published BY that button, consumed by the
 *   bridge, which turns it into the bus's `open-item`. The app side
 *   therefore names no feature id and no item id: those are the
 *   package's constants and the bridge's to spell.
 *
 * A topic is added here only with both ends named. The union is the
 * contract; a sixth member with no producer would be a promise
 * nothing keeps.
 *
 * ## Two producers run so far
 *
 * Every module named above — the boundary, the fallback,
 * `useArtefactSignal`, the layout effect and the bridge — lands in a
 * later stage of the same plan as this file, and none of them exists
 * at the commit that adds it. Four have since landed: the layout
 * effect in `AppLayout.tsx`, and beside this file
 * `useArtefactSignal.ts`, `CrashFallback.tsx` and
 * `AppErrorBoundary.tsx`. The fifth is WRITTEN and not yet installed:
 * `src/dev/bridge.ts` holds the whole of the bridge's behaviour and
 * takes its signals, its bus and its window capture as arguments, so
 * until `src/dev/devtools.ts` calls it the only caller it has is its
 * own colocated cases, over a channel they build themselves.
 *
 * TWO of the four publish when the app runs. `AppLayout` is the
 * layout route both route trees nest under, so its effect runs on the
 * first render and on every navigation after it: `route` is live, and
 * {@link AppSignals.last} answers a record there from the first paint
 * onward. `useArtefactSignal` is live too, now that all seven modal
 * sub-routes call it with their own kind and the `entityId` they
 * edit — so `artefact` answers `undefined` until the first modal
 * opens, a record while one is open, and `null` from the moment it
 * closes.
 *
 * The other two are still waiting: nothing renders the fallback or
 * mounts the boundary until `src/main.tsx` wraps the router in it, so
 * `last` answers `undefined` on `error`, and on the two handshake
 * topics the bridge is both ends of, for the whole life of the app
 * until those callers arrive. That is the normal case rather than a
 * gap: what is missing is a caller, not a behaviour.
 *
 * ## The payloads are TYPED, unlike the bus's
 *
 * `packages/dev-tools/src/core/bus.ts` types every payload `unknown`,
 * for a stated reason: its topics were fixed by a plan that had no
 * producer to fix a shape against. This channel is the opposite case
 * — every producer is in this package and lands in the same plan as
 * the channel — so {@link AppSignalPayloads} maps each topic to what
 * is actually published on it, and a `publish` of the wrong shape is
 * a `check-types` error where somebody wrote it rather than a
 * narrowing every subscriber has to repeat.
 *
 * That map is also why `publish` takes its payload as a REST
 * parameter. `open-feedback` carries nothing, and the alternatives
 * were a payload typed `undefined` that every call site has to spell
 * or a payload typed `unknown` that gives the other four topics
 * nothing. {@link AppSignalPublishArgs} resolves to `[]` for the one
 * topic whose payload is `void` and to a one-element tuple for the
 * rest, so `publish('open-feedback')` and `publish('route', payload)`
 * are both exactly as long as they should be.
 *
 * ## What the shapes are, and why
 *
 * Five properties, taken from `packages/dev-tools/src/core/bus.ts`
 * deliberately — that module states the reasoning for each at length
 * and none of it changes when the channel moves into the app:
 *
 * - A disposer is idempotent, so a React effect cleanup running twice
 *   under StrictMode — which this app renders under — cannot remove a
 *   LATER subscriber registered by the same function value.
 * - Subscribers are held in a `Set` per topic, so a function
 *   subscribed twice is held once.
 * - {@link AppSignals.publish} iterates a SNAPSHOT of that set, so a
 *   subscribe or unsubscribe from inside a subscriber takes effect
 *   from the NEXT publish.
 * - `last` is written BEFORE delivery, so a subscriber reading it
 *   while being called sees the payload it is being handed.
 * - A throwing subscriber does not stop the others and the throw does
 *   not escape `publish`. That one is sharper here than it was there:
 *   the publish sites are an error boundary and a layout effect, and
 *   a listener that fell over inside `componentDidCatch` would turn a
 *   caught render error into an uncaught one — the exact failure this
 *   stage exists to prevent. The error is reported on `console.error`
 *   rather than swallowed; the mutation note says what that costs.
 *
 * ## Two absences worth knowing before reading `last`
 *
 * `last('artefact')` answers three different things and a caller has
 * to tell them apart: `undefined` means no surface ever said, `null`
 * means a surface said and has since gone, and a record means one is
 * open now. That is why {@link artefactPayload} answers `null` rather
 * than `undefined` for a blank id — "cleared" is a published fact,
 * and only "never published" is an absence.
 *
 * `last('open-feedback')` cannot tell those apart at all: the topic
 * carries no payload, so the remembered value is `undefined` whether
 * it has been published a hundred times or never. Nothing reads it,
 * and nothing should: that topic is an event, and its consumer is a
 * subscriber.
 *
 * ## The singleton, and when to use the factory instead
 *
 * {@link appSignals} is the module-level instance the app shares —
 * one per app, created on first import. {@link createAppSignals} is
 * the same thing without the sharing, and exists for callers that
 * must not touch that shared state: every case in `appSignals.test.ts`
 * builds its own, so no case can leak a subscriber or a `last` value
 * into the next one.
 *
 * ## Mutation note — what the colocated cases actually catch
 *
 * A green suite is not evidence a case can fail. Each leg below was
 * measured by breaking this file, reds `bun x vitest run
 * src/app-shell/appSignals.test.ts` from `packages/web`, and restores
 * this file byte-identical (`shasum -a 256` compared before and
 * after the sweep). The file's own total is `Tests  29 passed (29)`:
 *
 * - Dropping the `disposed` flag from the disposer — leaving it a
 *   bare `forTopic?.delete(fn)` — answers `Tests  1 failed | 28
 *   passed (29)`, the one being `does not remove a later subscriber
 *   when a disposer is called twice`.
 * - Removing the `try`/`catch` around each delivery answers the same
 *   `1 failed | 28 passed`, the one being `keeps delivering to the
 *   others when a subscriber throws` — the thrown `app-signals-test:
 *   subscriber exploded` escaping `publish`.
 * - Iterating the live `Set` rather than the snapshot answers `2
 *   failed | 27 passed`: `defers a subscription made during delivery
 *   to the next publish` and `defers an unsubscribe made during
 *   delivery to the next publish`. Two rather than one because the
 *   snapshot is load-bearing in both directions, and a channel that
 *   got one right by accident would still red the other.
 * - Delivering over a reversed snapshot answers `1 failed | 28
 *   passed`, the one being `delivers to the subscribers of a topic in
 *   subscription order`. That case subscribes three recorders rather
 *   than two, so a rotation and a reversal are not the same reading.
 * - MOVING the `latest.set` to after the delivery loop answers `1
 *   failed | 28 passed`, the one being `lets a subscriber read last
 *   during delivery and see its own payload`. Deleting that write
 *   outright instead answers `7 failed | 22 passed` — every case that
 *   reads `last` at all. Both are recorded because the narrow one is
 *   the reading that matters and the wide one is what a note claiming
 *   only the narrow one would be hiding.
 * - Dropping `'devtools'` from {@link TOPICS} while leaving it in
 *   {@link AppSignalPayloads} answers `2 failed | 27 passed`:
 *   `delivers to a subscriber of every topic in the union` and `does
 *   not remove a later subscriber when a disposer is called twice`.
 *   This is the silent shape the per-topic sweep exists for — a
 *   subscribe on an unseeded topic returns a disposer like any other
 *   and delivers to nothing — and `check-types` cannot see it,
 *   because the roster is typed by the union rather than checked
 *   against it.
 * - Having {@link artefactPayload} answer a record for a blank id
 *   rather than `null` answers `3 failed | 26 passed`: `answers null
 *   for an id nothing selected`, `answers null for a blank kind or a
 *   blank id`, and `answers a payload the artefact topic accepts` —
 *   the third being the case that publishes what the builder answered.
 * - Having {@link errorPayload} reduce every non-`Error` through
 *   `String(error)` rather than the shape checks answers `3 failed |
 *   26 passed`: `reduces a thrown object with no message to a
 *   readable string`, `reduces the thrown values that have no shape
 *   at all` and `reads a thrown object that is not an Error but
 *   carries a message`. Note which case does NOT red: `reduces a
 *   thrown value a serialiser cannot take` still passes, because
 *   `String` of a cyclic object is the same `[object Object]` the
 *   caught branch answers. That case pins the no-throw, not the
 *   wording.
 *
 * `console.error` is the one behaviour with no case of its own, on
 * purpose: pinning it would mean asserting on a console stub in a
 * file whose subject is delivery, and no caller depends on the
 * reporting. Replacing the `console.error` line with an empty `catch`
 * answers `Tests  29 passed (29)` — measured. What the suite pins is
 * that the throw does not escape and that the remaining subscribers
 * still run.
 */

/**
 * What a render failure is reduced to before it is published.
 *
 * Strings all the way down, and never `null` or `undefined`: the
 * payload crosses into the dev-tools bus and from there into a report
 * body, where a missing member and an empty one would have to be told
 * apart twice. An absent part is the empty string, once, here.
 */
export interface AppErrorSignal {
  /** `Error.name`, or {@link NON_ERROR_NAME} when a non-`Error` was thrown. */
  readonly name: string;

  /** What happened, in the thrower's own words. Never empty in practice. */
  readonly message: string;

  /**
   * The first FRAME of the thrown stack, trimmed — not the whole
   * stack.
   *
   * One line is what a widget shows and what a report quotes, and the
   * rest of the stack is still on the `Error` at the throw site for
   * anyone who needs it. `''` when nothing was thrown with a stack.
   */
  readonly topFrame: string;

  /**
   * React's component stack, trimmed, or `''` when there is none.
   *
   * Kept whole rather than reduced to its first frame: which
   * component threw is only half the question, and the ancestors are
   * what say which route was rendering it.
   */
  readonly componentStack: string;
}

/**
 * Which entity the current surface is about.
 *
 * `kind` is the surface's own word for what it edits — one distinct
 * string per modal sub-route — and `id` is the entity id that route
 * carries.
 */
export interface AppArtefactSignal {
  /** The surface's own word for what it edits. Never blank. */
  readonly kind: string;

  /** The entity id the route carries. Never blank. */
  readonly id: string;
}

/** Where the app just went, and when it noticed. */
export interface AppRouteSignal {
  /** The pathname, as the router reports it. */
  readonly path: string;

  /** The query string, as the router reports it. */
  readonly search: string;

  /** `Date.now()` at the publish, so a consumer can order two of them. */
  readonly at: number;
}

/** Whether a reporter is attached to this app right now. */
export interface AppDevToolsSignal {
  /**
   * `true` from the bridge's install, `false` from its disposer.
   *
   * The fallback SUBSCRIBES to this as well as reading `last`: the
   * bridge installs on a later microtask than the first render, so a
   * one-shot read taken before it would be permanently wrong.
   */
  readonly installed: boolean;
}

/**
 * What each topic carries.
 *
 * The map IS the contract — {@link AppSignalTopic} is derived from it
 * rather than declared beside it, so a topic can never be added to
 * one and forgotten in the other.
 */
export interface AppSignalPayloads {
  /** A caught render failure, already flattened. */
  error: AppErrorSignal;

  /** A navigation. */
  route: AppRouteSignal;

  /** The open entity, or `null` once the surface that owned it is gone. */
  artefact: AppArtefactSignal | null;

  /** Whether the dev-tools bridge is installed. */
  devtools: AppDevToolsSignal;

  /** A request to open the feedback surface. Carries nothing. */
  'open-feedback': void;
}

/**
 * The five topics the app may say something on.
 *
 * Closed at five by `.rafa/specs/q20b-3-error-boundary-provider.md`
 * decision 2, and derived from {@link AppSignalPayloads} so the union
 * and the payload map cannot drift apart.
 */
export type AppSignalTopic = keyof AppSignalPayloads;

/**
 * What {@link AppSignals.publish} takes after the topic.
 *
 * `[]` for the one topic whose payload is `void`, a one-element tuple
 * for every other — so a topic that carries nothing is published with
 * no second argument rather than with a spelled-out `undefined`.
 */
export type AppSignalPublishArgs<TTopic extends AppSignalTopic> =
  AppSignalPayloads[TTopic] extends void
    ? []
    : [payload: AppSignalPayloads[TTopic]];

/** What a subscriber of one topic is handed. */
export type AppSignalSubscriber<TTopic extends AppSignalTopic> =
  (payload: AppSignalPayloads[TTopic]) => void;

/** Undo a {@link AppSignals.subscribe}. Calling it twice is harmless. */
export type AppSignalDisposer = () => void;

/**
 * The app's pub/sub. Three methods, no React, no storage, no network.
 */
export interface AppSignals {
  /**
   * Listen to a topic.
   *
   * @param topic - One of the five topics.
   * @param fn - Called with each published payload, in subscription
   * order, and never with a payload of another topic.
   * @returns A disposer; calling it more than once is harmless, and a
   * stale one never removes a later subscriber of the same function
   * value.
   */
  subscribe<TTopic extends AppSignalTopic>(
    topic: TTopic,
    fn: AppSignalSubscriber<TTopic>,
  ): AppSignalDisposer;

  /**
   * Say something on a topic.
   *
   * Never throws, whatever the subscribers do. Delivery walks a
   * snapshot, so a subscribe or unsubscribe from inside a subscriber
   * lands on the following publish.
   *
   * @param topic - One of the five topics.
   * @param payload - What that topic carries; omitted for a topic
   * that carries nothing.
   */
  publish<TTopic extends AppSignalTopic>(
    topic: TTopic,
    ...payload: AppSignalPublishArgs<TTopic>
  ): void;

  /**
   * The most recent payload published on a topic.
   *
   * @param topic - One of the five topics.
   * @returns The last payload, or `undefined` before any publish. On
   * `artefact`, `null` and `undefined` are different answers — see
   * this module's documentation.
   */
  last<TTopic extends AppSignalTopic>(
    topic: TTopic,
  ): AppSignalPayloads[TTopic] | undefined;
}

/** Every topic, so a fresh channel can seed one entry per topic. */
const TOPICS: readonly AppSignalTopic[] = [
  'error',
  'route',
  'artefact',
  'devtools',
  'open-feedback',
];

/**
 * What {@link AppErrorSignal.name} reads when the thrown value was
 * not an `Error` and could not say what it was.
 */
export const NON_ERROR_NAME = 'NonError';

/**
 * Build signals with no subscribers and nothing remembered.
 *
 * Prefer {@link appSignals} in application code — one app has one
 * channel. Reach for this factory when a caller must NOT share that
 * state: every case in `appSignals.test.ts` builds its own, which is
 * what keeps the cases independent of each other's ordering.
 *
 * @returns A fresh, independent {@link AppSignals}.
 */
export function createAppSignals(): AppSignals {
  // Held with a `never` payload because the topic-to-payload map is
  // what relates a subscriber to its topic, and a `Set` cannot carry
  // that relation. Every `(payload: X) => void` is assignable to
  // `(payload: never) => void`, so putting one IN is sound; taking
  // one out and calling it is where the single assertion below sits.
  const subscribers = new Map<AppSignalTopic, Set<(payload: never) => void>>(
    TOPICS.map((topic) => [topic, new Set<(payload: never) => void>()]),
  );
  const latest = new Map<AppSignalTopic, unknown>();

  return {
    subscribe<TTopic extends AppSignalTopic>(
      topic: TTopic,
      fn: AppSignalSubscriber<TTopic>,
    ): AppSignalDisposer {
      const forTopic = subscribers.get(topic);

      forTopic?.add(fn);

      // `disposed` is per-DISPOSER rather than per-subscriber: the
      // second call of this disposer must not delete a subscriber
      // that a later `subscribe(topic, fn)` put back under the same
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

    publish<TTopic extends AppSignalTopic>(
      topic: TTopic,
      ...rest: AppSignalPublishArgs<TTopic>
    ): void {
      // The place the typed map is narrowed away, and the reason the
      // assertion is sound: `subscribers` holds `(payload: never) =>
      // void` because a `Set` cannot carry the topic-to-payload
      // relation, and the map is what guarantees this payload is the
      // one this topic's subscribers were written against.
      const payload = rest[0] as never;

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
          // Reported, never swallowed - and never rethrown: a
          // listener that threw inside `componentDidCatch` would turn
          // a caught render error into an uncaught one.
          console.error(`app signals: a '${topic}' subscriber threw`, error);
        }
      }
    },

    last<TTopic extends AppSignalTopic>(
      topic: TTopic,
    ): AppSignalPayloads[TTopic] | undefined {
      return latest.get(topic) as AppSignalPayloads[TTopic] | undefined;
    },
  };
}

/**
 * The channel the app shares - one per app.
 *
 * Created at module load, which is the earliest any importer can
 * observe it, so a subscriber registered during the app's own module
 * evaluation is already held before the first publish could happen.
 */
export const appSignals: AppSignals = createAppSignals();

/**
 * What {@link errorPayload} accepts as React's second argument.
 *
 * Declared here rather than imported as React's `ErrorInfo` because
 * this module imports nothing outside the language. The two are
 * structurally the same member, so `componentDidCatch` hands its
 * `ErrorInfo` over with no cast and no adapter.
 */
export interface AppErrorInfo {
  /** The component stack React captured, when it captured one. */
  readonly componentStack?: string | null;
}

/**
 * The first stack FRAME, trimmed.
 *
 * A stack starts with a `Name: message` header that repeats what the
 * payload already carries, so the header is skipped and the first
 * `at ...` line is taken. A stack of an unexpected shape answers its
 * first non-empty line rather than nothing.
 *
 * @param stack - `Error.stack`, which is not guaranteed to exist.
 * @returns One line, or `''`.
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
 * Say what a thrown value was, when it was not an `Error`.
 *
 * A `throw` takes any value at all, so this is a boundary and is
 * validated like one: a string is itself, a primitive is its `String`
 * form, and an object is its JSON form when it has one and its
 * `Object.prototype.toString` tag when it does not. A cycle throws
 * inside `JSON.stringify`, which is caught here rather than allowed
 * to replace a caught render error with an uncaught serialiser error.
 *
 * @param thrown - Whatever reached `componentDidCatch`.
 * @returns A non-empty, human-readable line.
 */
function describeThrown(thrown: unknown): string {
  if (typeof thrown === 'string') {
    return thrown.trim() === ''
      ? '(threw an empty string)'
      : thrown;
  }

  if (typeof thrown !== 'object' || thrown === null) {
    return String(thrown);
  }

  try {
    const json = JSON.stringify(thrown);

    return typeof json === 'string' && json !== '{}'
      ? json
      : Object.prototype.toString.call(thrown);
  } catch {
    return Object.prototype.toString.call(thrown);
  }
}

/**
 * Read a member off a value that may not have one.
 *
 * @param value - Any object.
 * @param key - The member to read.
 * @returns The member when it is a non-empty string, else `''`.
 */
function readStringMember(value: object, key: string): string {
  const member = (value as Record<string, unknown>)[key];

  return typeof member === 'string'
    ? member
    : '';
}

/**
 * Reduce a caught failure to the flat shape the channel carries.
 *
 * Pure, and total: it reads no clock, touches no DOM and throws for
 * no input, because its one caller is
 * `AppErrorBoundary.componentDidCatch` and a builder that threw there
 * would take down the boundary that just saved the app.
 *
 * `instanceof Error` is deliberately not the only accepting branch. A
 * failure that crossed a realm — an iframe, a second copy of a
 * library — fails that check while carrying a perfectly good `name`
 * and `message`, so an object with a string `message` is read as an
 * error-like rather than stringified as an anonymous object.
 *
 * Nothing is capped here. The payload lives in memory, and the one
 * consumer that quotes it into an issue body caps it at that edge,
 * where the cap and the ellipsis it appends already live.
 *
 * @param error - Whatever was thrown. Any value at all.
 * @param info - React's `ErrorInfo`, when there is one.
 * @returns The flat payload the `error` topic carries.
 */
export function errorPayload(
  error: unknown,
  info?: AppErrorInfo | null,
): AppErrorSignal {
  const componentStack = typeof info?.componentStack === 'string'
    ? info.componentStack.trim()
    : '';

  if (error instanceof Error) {
    return {
      name: error.name === ''
        ? NON_ERROR_NAME
        : error.name,
      message: error.message,
      topFrame: firstStackFrame(error.stack),
      componentStack,
    };
  }

  const errorLike = typeof error === 'object' && error !== null
    ? error
    : null;
  const message = errorLike === null
    ? ''
    : readStringMember(errorLike, 'message');

  if (errorLike !== null && message !== '') {
    const name = readStringMember(errorLike, 'name');

    return {
      name: name === ''
        ? NON_ERROR_NAME
        : name,
      message,
      topFrame: firstStackFrame(readStringMember(errorLike, 'stack')),
      componentStack,
    };
  }

  return {
    name: NON_ERROR_NAME,
    message: describeThrown(error),
    topFrame: '',
    componentStack,
  };
}

/**
 * Build what the `artefact` topic carries, or say there is nothing.
 *
 * Pure, and the ONE place "no artefact" is spelled: `useArtefactSignal`
 * publishes what this answers on mount and on every change, and
 * publishes `null` on unmount, so a surface with a route parameter
 * that has not resolved yet and a surface that has closed produce the
 * same published fact through the same function.
 *
 * `null` rather than `undefined` on purpose: `undefined` from
 * {@link AppSignals.last} means nothing was ever published, and a
 * cleared artefact is something that WAS.
 *
 * @param kind - The surface's own word for what it edits.
 * @param id - The entity id the route carries, which a route
 * parameter may not have yet.
 * @returns The payload, or `null` when either part is missing.
 */
export function artefactPayload(
  kind: string,
  id: string | null | undefined,
): AppArtefactSignal | null {
  const trimmedKind = kind.trim();
  const trimmedId = typeof id === 'string'
    ? id.trim()
    : '';

  if (trimmedKind === '' || trimmedId === '') {
    return null;
  }

  return { kind: trimmedKind, id: trimmedId };
}
