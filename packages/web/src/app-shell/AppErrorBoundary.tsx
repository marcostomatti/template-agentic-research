/**
 * @packageDocumentation
 * The one thing in this app that can catch a render failure, and the
 * reason a crash leaves a screen behind rather than a blank document.
 *
 * React unmounts the whole root when a render throws with no boundary
 * above it, and a class component is the ONLY kind that can stop that
 * — there is no hook form of `componentDidCatch`, which is why this
 * file is the single class component under `src/` and why it is
 * `.tsx` rather than the `.ts` the two-runner discipline prefers.
 *
 * This file imports `react` and `./appSignals` and nothing else. It
 * is reached from `src/main.tsx` in a PRODUCTION build, so the rule
 * `./appSignals.ts` states holds here unchanged: `@ar/web` takes
 * `@ar/dev-tools` as a devDependency, the Docker `web` stage holds
 * its manifest and no `dist/`, and a production module that imported
 * it would fail the image build. `@ar/ui` is permitted to this file
 * and unused by it — the boundary draws no markup of its own; every
 * pixel after a catch is the caller's fallback, which is
 * `./CrashFallback.tsx` and is where the `@ar/ui` imports sit.
 *
 * ## The fallback is a FUNCTION, not an element
 *
 * {@link AppErrorBoundaryProps.fallback} takes `(error, reset)` and
 * answers a `ReactNode`. An element prop would be simpler to pass and
 * could carry neither of the two things only the boundary knows: what
 * was thrown, and how to put the children back. Handing those to the
 * caller keeps this file free of every decision about what a crash
 * screen says — the boundary catches, publishes and re-renders, and
 * `CrashFallback` owns the wording, the controls and the reporter
 * handshake.
 *
 * ## Why the state holds a WRAPPER rather than the error
 *
 * A `throw` takes any value at all, `null` and `undefined` among
 * them. A state member typed `unknown` and initialised `null` could
 * therefore not tell "nothing has been caught" from "`null` was
 * thrown", and the second case would render the children again into
 * the same throw, on every render, forever. {@link AppErrorBoundary}
 * holds `{caught: {error} | null}` instead: the `null` is the
 * boundary's own word for "standing", and whatever came out of the
 * throw sits one level in where it cannot collide with it.
 *
 * ## The split between the two React hooks
 *
 * `getDerivedStateFromError` is a RENDER-phase hook: React may call
 * it more than once for one failure and discard the result, so it
 * does what a render may do — answer the next state — and nothing
 * else. `componentDidCatch` is a commit-phase hook, called once the
 * fallback is committed, which is where the side effect belongs; it
 * is the only publisher on the `error` topic.
 *
 * Both are needed. `componentDidCatch` alone would leave the app
 * rendering the children that just threw, and
 * `getDerivedStateFromError` alone would have no `ErrorInfo` — that
 * argument, and with it the component stack the report quotes, exists
 * only on the commit-phase hook.
 *
 * The publish cannot take the app down with it. `appSignals.publish`
 * catches what a subscriber throws and reports it on `console.error`,
 * and `errorPayload` is documented total — it reads no clock, touches
 * no DOM, and answers a string for every input including a cyclic
 * object. That is not politeness: a throw out of `componentDidCatch`
 * turns a caught render error into an uncaught one, which is the
 * exact failure this file exists to prevent.
 *
 * Under `StrictMode` — which `src/main.tsx` renders the app in —
 * React's development build re-throws a caught error to `window` as
 * well, so the browser console shows an uncaught error beside a
 * perfectly healthy fallback. That is React's behaviour and not a
 * boundary that failed to catch; a production build reports the
 * failure once.
 *
 * ## What `reset` does, and what it deliberately does not
 *
 * {@link AppErrorBoundary.reset} clears the caught state, and that is
 * the whole of it. The children then render for the first time since
 * the fallback replaced them, so the subtree mounts fresh — React
 * unmounted it when the tree swapped — without this file naming a
 * `key`, holding a counter or knowing what is below it.
 *
 * It is an instance arrow PROPERTY rather than a method, so its
 * identity is stable for the life of the boundary: the fallback is
 * handed the same function on every render and can hang it on a
 * button without re-binding.
 *
 * Nothing is discarded by a reset. `src/main.tsx` puts this boundary
 * INSIDE the query provider, so the cache the tab has filled is above
 * the state being cleared and survives it — which is what makes "try
 * again" the primary control on the fallback and "reload the page",
 * which throws the tab away, the secondary one.
 *
 * ## What the colocated suite can reach: nothing of the catch
 *
 * `renderToStaticMarkup` never calls `componentDidCatch` — a throw
 * inside a static render propagates to the caller — so the offline
 * probe in `CrashFallback.test.ts` renders the fallback directly with
 * a hand-built error and a `reset` spy, and reads none of this file.
 * The catch, the publish and what `reset` does are proved by the
 * forced Playwright spec, which is the only place an app that really
 * crashed can be looked at.
 */

import type { ErrorInfo, ReactNode } from 'react';

import { Component } from 'react';

import { appSignals, errorPayload } from './appSignals';

/** What the boundary is given. */
export interface AppErrorBoundaryProps {
  /**
   * What to draw once something below has thrown.
   *
   * @param error - Whatever was thrown, unreduced. Any value at all.
   * @param reset - Clears the catch and renders the children again.
   * @returns The crash screen.
   */
  readonly fallback: (error: unknown, reset: () => void) => ReactNode;

  /** The tree the boundary is guarding. */
  readonly children?: ReactNode;
}

/**
 * What was caught, held one level in.
 *
 * A wrapper rather than a bare member because `null` and `undefined`
 * are both throwable — see this module's documentation.
 */
interface AppErrorBoundaryCatch {
  /** The thrown value, exactly as it arrived. */
  readonly error: unknown;
}

/** The boundary's whole state: caught, or standing. */
interface AppErrorBoundaryState {
  /** The catch, or `null` while the children are rendering. */
  readonly caught: AppErrorBoundaryCatch | null;
}

/** Nothing has been caught. */
const STANDING: AppErrorBoundaryState = { caught: null };

/**
 * Catch a render failure, publish it, and show the caller's fallback.
 *
 * The app's only class component, and the only subscriber-facing
 * producer on the `error` topic.
 */
export class AppErrorBoundary
  extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  /**
   * @param props - The fallback and the guarded tree.
   */
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = STANDING;
  }

  /**
   * Swap the children for the fallback.
   *
   * Render-phase, so it answers the next state and does nothing else:
   * React may call this more than once for one failure and discard
   * what it answers. The publish lives in
   * {@link AppErrorBoundary.componentDidCatch}.
   *
   * @param error - Whatever was thrown. Any value at all.
   * @returns The state that draws the fallback.
   */
  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return { caught: { error } };
  }

  /**
   * Say on `appSignals` what just happened.
   *
   * The only publisher on the `error` topic, and the only reason this
   * hook is implemented at all: the state swap is already done by
   * then. `errorPayload` is the one decision here that can be pure,
   * and it lives in `./appSignals.ts` where it is pinned.
   *
   * Never throws: the reducer is total and `publish` contains what a
   * subscriber does, so a listener falling over cannot turn this
   * caught error into an uncaught one.
   *
   * @param error - Whatever was thrown.
   * @param info - React's component stack for the failing render.
   */
  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    appSignals.publish('error', errorPayload(error, info));
  }

  /**
   * Render the children again.
   *
   * An arrow property rather than a method so the fallback is handed
   * one stable function for the life of the boundary. Clearing the
   * catch is the whole behaviour: the subtree was unmounted when the
   * fallback replaced it, so it mounts fresh with no `key` arithmetic
   * here, and nothing above this boundary — the query cache included
   * — is touched.
   */
  reset = (): void => {
    this.setState(STANDING);
  };

  /**
   * @returns The fallback while something is caught, else the
   * children.
   */
  override render(): ReactNode {
    const { caught } = this.state;

    if (caught !== null) {
      return this.props.fallback(caught.error, this.reset);
    }

    return this.props.children;
  }
}
