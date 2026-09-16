/**
 * @packageDocumentation
 * The route element that decides whether the app shell may render at
 * all: it asks the service once whether a credential is needed, holds
 * what this tab's session store says, and hands both to
 * {@link authGateDecision}.
 *
 * Every decision here is `./gate.ts`'s, which is pure and unit-tested.
 * What is left in this file is the three things a decision cannot do
 * for itself — run the probe, subscribe to the session, and turn a
 * `redirect` into a navigation — and each of them is a React effect
 * rather than a rule. That split is the same one `./LoginPage.tsx` and
 * `./loginForm.ts` are built on, and it is why nothing below is
 * reachable from the unit suite: the runner is node-only and collects
 * `.ts` alone.
 *
 * ## The probe runs once per tab, not once per mount
 *
 * `GET /me` answers a DEPLOYMENT fact — whether the service was started
 * with `AUTH_BASIC_*` at all — so it is the same answer for as long as
 * the tab is open. The gate is nonetheless mounted more than once: it
 * wraps each of the two route bases separately, so crossing between `/`
 * and `/d/:domainSlug` remounts it, and `StrictMode` double-invokes
 * every effect in development. {@link probeOnce} therefore memoises the
 * in-flight promise at module scope and the ANSWER beside it, exactly
 * as `../../data/http/auth.ts` memoises its client and its store, so a
 * remount joins a probe already out or reads the answer with no request
 * at all.
 *
 * A REJECTION is deliberately not memoised. `probeAuth` rejects only
 * for the readings that do not answer the question — a `5xx`, a
 * `NETWORK` failure, a `BAD_ENVELOPE` — and remembering a non-answer
 * for the life of the tab would close a loop that has no exit: the gate
 * fails closed on `'failed'` (see `./gate.ts`), so an operator who then
 * signs in successfully would be redirected back to the form by a
 * reading taken before they did. Clearing the memo on rejection means
 * the next mount — the one the login navigation causes — asks again.
 *
 * ## Why the session is React state and not `useSyncExternalStore`
 *
 * `SessionStore.get()` re-parses its stored value on every call and
 * answers a NEW object each time. Measured against
 * `../../auth/session.ts` with a map-backed storage port: two `get()`
 * calls either side of nothing at all are equal by value and `false`
 * under `===`. `useSyncExternalStore` wants a snapshot that holds its
 * identity between changes, and a `getSnapshot` calling `get()` would
 * hand it a fresh one every time it asked. So the session is READ once
 * when the gate mounts and replaced by `null` when the store reports a
 * clear, which is the only transition the store notifies.
 *
 * A clear is the transition that matters: `../../data/http/client.ts`
 * clears the store it was built over on any `UNAUTHORIZED`, so a
 * refusal lands here as a `null` session on the very next render, and
 * the redirect carries the location the refusal happened on rather
 * than wherever the operator might drift to next afterwards. Expiry
 * needs no notification — `./gate.ts` re-checks it against the clock
 * on every render, which is what that re-check is for.
 *
 * WHICH STORE, exactly: `authSessionStore()`, the instance
 * `../../data/http/auth.ts` exports so the login page, the sign-out
 * and this gate all write and watch ONE store. The 34 read accessors
 * do NOT share it — `../../data/http/api.ts` builds its client over a
 * `createBrowserSession()` of its own — so an `UNAUTHORIZED` on a page
 * read clears that instance and this subscription never fires.
 * Measured on `../../auth/session.ts` with two stores over one storage
 * port: a `clear()` on the second runs zero listeners on the first,
 * and the first still answers a live session out of its warm memory,
 * which is the outcome `../../data/http/auth.ts`'s own header warns a
 * second store produces. Reported rather than repaired from here: the
 * gate watches the store that module publishes as the tab's one, and
 * which store the accessors take is that module's wiring.
 */

import type { AuthProbeState } from './gate';
import type { Session } from '../../auth/session';
import type { AuthRequirement } from '../../data/http/auth';
import type { ReactNode } from 'react';

import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router';

import { useTheme } from '../../app-shell/theme';
import { authSessionStore, probeAuth } from '../../data/http/auth';

import { authGateDecision } from './gate';

/** What the waiting screen says while the probe is out. */
const PENDING_MESSAGE = 'Checking your session…';

/**
 * What the gate renders while the probe has not answered.
 *
 * Its own layout, like `./LoginPage.tsx`'s: the shell is exactly what
 * may not be mounted yet, so there is no chrome to sit inside.
 *
 * No live region. A `role="status"` announces a change made to a region
 * that was already mounted, and this text is born with the screen — so
 * a region here would announce nothing, while the sentence as page
 * content is read by a screen reader arriving on it either way.
 *
 * `aria-busy` on the landmark is the machine-readable half: the page is
 * mid-operation rather than finished and empty.
 */
const PENDING_SCREEN = (
  <main
    aria-busy="true"
    className="flex min-h-dvh items-center justify-center bg-surface-sunk px-6"
  >
    <p className="text-sm text-fg3">{PENDING_MESSAGE}</p>
  </main>
);

/**
 * The probe's answer for this tab, once there is one.
 *
 * Module scope rather than component state, so a remount reads it
 * without a request. Only ever written with what `probeAuth` RESOLVED
 * with — see the header on why a rejection is not remembered.
 */
let answer: AuthRequirement | undefined;

/** The probe currently out, so a second mount joins it. */
let inFlight: Promise<AuthRequirement> | undefined;

/**
 * Ask the service whether a login is required, at most once per tab.
 *
 * @returns The answer already held, the probe already out, or a fresh
 * one.
 */
function probeOnce(): Promise<AuthRequirement> {
  if (answer !== undefined) {
    return Promise.resolve(answer);
  }

  inFlight ??= probeAuth().then(
    (requirement) => {
      answer = requirement;
      inFlight = undefined;

      return requirement;
    },
    (error: unknown) => {
      inFlight = undefined;

      throw error;
    },
  );

  return inFlight;
}

/** What the gate wraps. */
export interface AuthGateProps {
  /**
   * The route base's chrome, rendered only once the gate is satisfied.
   * A node rather than a render prop, for `../DomainGuard.tsx`'s
   * reason: the gate has nothing to hand it, and passing the children
   * through untouched keeps `../router.tsx` the single place naming
   * the shell.
   */
  readonly children: ReactNode;
}

/**
 * Gate a route base on the service's auth requirement and this tab's
 * session.
 *
 * @param props - The chrome to render for an operator who may see it.
 * @returns A waiting screen, a redirect to the login form, or the
 * children untouched.
 */
export const AuthGate = ({ children }: AuthGateProps) => {
  const location = useLocation();
  const [probe, setProbe] = useState<AuthProbeState>(() => answer ?? 'pending');
  const [session, setSession] = useState<Session | null>(
    () => authSessionStore().get(),
  );

  // The theme is resolved and written by `../../app-shell/theme.ts`'s
  // hook, which lives in the topbar — and the topbar is inside exactly
  // the shell this gate may refuse to mount. Called here for its DOM
  // effect alone, so the waiting screen and the login form it redirects
  // to are drawn in the operator's theme rather than in the document's
  // default until the shell arrives.
  useTheme();

  useEffect(() => {
    let live = true;

    const settle = (state: AuthProbeState): void => {
      if (live) {
        setProbe(state);
      }
    };

    void probeOnce().then(
      (requirement) => {
        settle(requirement);
      },
      () => {
        settle('failed');
      },
    );

    return () => {
      live = false;
    };
  }, []);

  // `subscribe` answers its own unsubscribe, which is exactly what an
  // effect cleanup is, so the subscription is one expression. It fires
  // on a clear and on nothing else — see the header.
  useEffect(() => authSessionStore().subscribe(() => {
    setSession(null);
  }), []);

  const decision = authGateDecision({
    probe,
    session,
    pathname: location.pathname,
    search: location.search,
  });

  if (decision.kind === 'pending') {
    return PENDING_SCREEN;
  }

  if (decision.kind === 'redirect') {
    // `replace`, so the address that was refused does not sit in
    // history for a Back to land on — the return path in the query
    // carries it instead, which is the copy the open-redirect guard
    // inspects.
    return <Navigate to={decision.to} replace />;
  }

  return children;
};
