/**
 * @packageDocumentation
 * The route tree's error boundary: what a top-level route draws when
 * anything below it throws while rendering.
 *
 * ## Why `AppErrorBoundary` alone is not enough
 *
 * `../main.tsx` wraps `RouterProvider` in {@link AppErrorBoundary},
 * and a throw from a ROUTE never reaches it. A data router catches a
 * render error from any route element itself, records it in its own
 * state, and draws the nearest route `ErrorBoundary` — or, when no
 * route declares one, its built-in default error screen. Measured: the
 * dev-only crash route drew that default screen, `CrashFallback` never
 * rendered, and nothing was published on `appSignals`.
 *
 * So there are two catchers with one fallback between them:
 *
 * - THIS component, declared as `ErrorBoundary` on every top-level
 *   route in `../routes/router.tsx`, catches everything the router
 *   renders — every surface, modal sub-route and the shell itself.
 * - `AppErrorBoundary` catches what is left: a throw from a provider
 *   above the router, or from the router component itself.
 *
 * Both publish the same `error` signal through `errorPayload` and both
 * draw `CrashFallback`, so an operator cannot tell which one caught.
 *
 * ## It sits on the TOP-LEVEL routes on purpose
 *
 * The fallback replaces the whole shell rather than the content slot.
 * A shell that threw cannot be trusted to frame its own failure, and
 * one placement keeps "what a crash looks like" a single screen.
 *
 * ## Retry is a navigation, not a state reset
 *
 * A class boundary retries by clearing its own state. The router owns
 * this error, and clears it on the next navigation — so retry
 * navigates to the location it is already at, with `replace` so the
 * history gains nothing. If the route throws again the router catches
 * again and this component re-renders with the new error.
 *
 * ## The publish is an effect keyed on the error
 *
 * Rendering must stay pure, and `StrictMode` renders twice. The effect
 * runs once per distinct error value, which is also what makes a
 * SECOND crash after a retry publish a second signal.
 */

import type { ReactElement } from 'react';

import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate, useRouteError } from 'react-router';

import { appSignals, errorPayload } from './appSignals';
import { CrashFallback } from './CrashFallback';

/**
 * Draws {@link CrashFallback} for the error the router caught, and
 * publishes it on `appSignals` once.
 *
 * Takes no props: a route `ErrorBoundary` is rendered by the router,
 * which hands the error over through `useRouteError`.
 */
export function RouteErrorBoundary(): ReactElement {
  const error = useRouteError();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    appSignals.publish('error', errorPayload(error));
  }, [error]);

  const retry = useCallback((): void => {
    void navigate(
      { pathname: location.pathname, search: location.search },
      { replace: true },
    );
  }, [location.pathname, location.search, navigate]);

  return <CrashFallback error={error} reset={retry} />;
}
