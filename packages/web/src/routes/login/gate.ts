/**
 * @packageDocumentation
 * The auth gate's one decision: given what the service said about
 * whether it needs a credential and what session this tab holds, show
 * the shell, wait, or send the operator to the login form.
 *
 * {@link authGateDecision} is pure and takes the location as arguments,
 * so the whole decision is reachable from the unit suite — the `.tsx`
 * that mounts it, subscribes to session clears and renders a
 * `<Navigate>` is not. It holds no state: the probe result and the
 * session are read by the component and handed in, and calling this
 * twice with the same arguments answers the same thing.
 *
 * ## The four probe readings
 *
 * `./gate.ts` treats the probe as a four-value reading rather than the
 * two `probeAuth` resolves with, because the two states AROUND that
 * call are decisions of their own:
 *
 * - `'pending'` — the probe has not answered yet. Neither the shell nor
 *   the form may be shown: rendering the shell would fire every
 *   surface's reads against a service that may refuse them, and
 *   redirecting would send an operator who is signed in through a login
 *   round trip on every cold load of the tab.
 * - `'failed'` — the probe rejected. `probeAuth` rejects for exactly the
 *   readings that do not answer the question (a `5xx`, a `NETWORK`
 *   failure, a `BAD_ENVELOPE`), so the gate does not know whether a
 *   credential is needed. It FAILS CLOSED and redirects, session or no
 *   session: the login route is the one surface that is useful without
 *   an answer, and guessing `open` would render a shell whose every read
 *   is about to fail anyway. The cost of the wrong guess is asymmetric —
 *   fail closed and a signed-in operator signs in again, fail open and
 *   an app that needs a credential paints as though it has one.
 * - `'open'` — the service runs with no credential configured. The shell
 *   renders whether or not a session is held; a leftover session is not
 *   in the way, since the client sends its bearer and an open guard
 *   ignores it.
 * - `'required'` — a live session renders, anything else redirects.
 *
 * ## Why expiry is re-checked here
 *
 * `SessionStore.get()` already drops an expired session and answers
 * `null`, so a caller reading through the store hands this `null` and
 * the expiry branch never fires. It fires anyway for the callers that
 * do NOT go through a fresh `get()`: a component holding a session in
 * React state across a render, or one whose subscription has not run
 * yet, is holding a value that was live when it was read and may not be
 * now. A gate that trusted a non-null session would render the shell
 * for exactly as long as that stale value sat in state.
 *
 * The comparison needs a clock, which is the one thing here that is not
 * an argument in the task's four — so it IS an argument, optional, and
 * only defaulted to `Date.now`. Handing {@link AuthGateInput.now} in is
 * what lets the unit suite pin an expiry rather than date-arithmetic
 * around the wall clock.
 */

import type { Session } from '../../auth/session';
import type { AuthRequirement } from '../../data/http/auth';

import { loginPathFor } from './returnPath';

/**
 * What the auth probe has said so far.
 *
 * The two {@link AuthRequirement} values are `probeAuth`'s own; the
 * other two are the states around it — not yet answered, and rejected.
 */
export type AuthProbeState = AuthRequirement | 'pending' | 'failed';

/** What {@link authGateDecision} is asked. */
export interface AuthGateInput {
  /** The probe's reading, or where it stands. */
  readonly probe: AuthProbeState;
  /** The session this tab holds, or `null` when it holds none. */
  readonly session: Session | null;
  /** Current path, below the router basename. */
  readonly pathname: string;
  /** Current query string, with its leading `?`, or empty. */
  readonly search: string;
  /** Epoch milliseconds an expiry is compared against. */
  readonly now?: number;
}

/** Wait: the probe has not answered, so nothing may be shown yet. */
export interface PendingDecision {
  readonly kind: 'pending';
}

/** Show the shell the gate wraps. */
export interface RenderDecision {
  readonly kind: 'render';
}

/** Send the operator to the login form. */
export interface RedirectDecision {
  readonly kind: 'redirect';
  /** The `/login` path, carrying the current location as its `next`. */
  readonly to: string;
}

/** The three answers the gate has. */
export type AuthGateDecision =
  | PendingDecision
  | RenderDecision
  | RedirectDecision;

const PENDING: PendingDecision = { kind: 'pending' };
const RENDER: RenderDecision = { kind: 'render' };

/**
 * Whether a held session is still worth rendering the shell for.
 *
 * An unparseable `expiresAt` reads as expired rather than as live: the
 * store refuses to hold such a value in the first place, so a session
 * carrying one reached the gate around the store and is not a session
 * this app issued.
 *
 * @param session - The held session, or `null`.
 * @param now - Epoch milliseconds to compare the expiry against.
 * @returns `true` only for a session that has not expired at `now`.
 */
function isLive(session: Session | null, now: number): boolean {
  if (session === null) {
    return false;
  }

  const expiresAt = Date.parse(session.expiresAt);

  return !Number.isNaN(expiresAt) && expiresAt > now;
}

/**
 * Decide what the auth gate shows.
 *
 * @param input - The probe reading, the held session and the location.
 * @returns `pending` while the probe is out, `render` when the shell may
 * be shown, and `redirect` carrying the `/login` path to send the
 * operator to otherwise.
 */
export function authGateDecision(input: AuthGateInput): AuthGateDecision {
  const { probe, session, pathname, search, now = Date.now() } = input;

  if (probe === 'pending') {
    return PENDING;
  }

  if (probe === 'open') {
    return RENDER;
  }

  if (probe === 'required' && isLive(session, now)) {
    return RENDER;
  }

  return { kind: 'redirect', to: loginPathFor(pathname, search) };
}
