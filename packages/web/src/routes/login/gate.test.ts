import type { Session } from '../../auth/session';

import { describe, expect, it } from 'vitest';

import { authGateDecision } from './gate';

// The cases run in the order the gate's answers can be distinguished
// from a stub: every redirect case first, then the two that render. A
// gate that returned `render` unconditionally would pass the last two
// and fail the first three, and one that redirected unconditionally
// would fail only the last two — so neither half alone proves anything
// and the order says which half is the control for which.

/** A real deep location, the shape a mid-session redirect carries. */
const DEEP_PATH = '/d/example-tech-radar/sources/src-1/failures';

/** The login path {@link DEEP_PATH} is expected to come back as. */
const DEEP_LOGIN_PATH =
  '/login?next=%2Fd%2Fexample-tech-radar%2Fsources%2Fsrc-1%2Ffailures';

/** A fixed clock, so an expiry is pinned rather than dated live. */
const NOW = Date.parse('2026-05-01T12:00:00.000Z');

/** One minute in milliseconds, the offset either side of {@link NOW}. */
const ONE_MINUTE = 60_000;

/**
 * A session expiring a fixed offset from {@link NOW}.
 *
 * @param offsetMs - Milliseconds past {@link NOW}; negative is expired.
 * @returns A well-formed session with that expiry.
 */
function sessionExpiringAt(offsetMs: number): Session {
  return {
    token: 'tok-gate',
    sub: 'operator@example.test',
    expiresAt: new Date(NOW + offsetMs).toISOString(),
  };
}

describe('authGateDecision', () => {
  it('redirects to login when a credential is required and no session is held', () => {
    // Arrange / Act
    const decision = authGateDecision({
      probe: 'required',
      session: null,
      pathname: DEEP_PATH,
      search: '',
      now: NOW,
    });

    // Assert
    expect(decision).toEqual({ kind: 'redirect', to: DEEP_LOGIN_PATH });
  });

  it('redirects when the held session has already expired', () => {
    // Arrange
    const session = sessionExpiringAt(-ONE_MINUTE);

    // Act
    const decision = authGateDecision({
      probe: 'required',
      session,
      pathname: DEEP_PATH,
      search: '',
      now: NOW,
    });

    // Assert
    expect(decision).toEqual({ kind: 'redirect', to: DEEP_LOGIN_PATH });
  });

  it('redirects when the probe failed, even holding a live session', () => {
    // Arrange
    const session = sessionExpiringAt(ONE_MINUTE);

    // Act
    const decision = authGateDecision({
      probe: 'failed',
      session,
      pathname: DEEP_PATH,
      search: '',
      now: NOW,
    });

    // Assert
    expect(decision).toEqual({ kind: 'redirect', to: DEEP_LOGIN_PATH });
  });

  it('renders on an open service with no session held', () => {
    // Arrange / Act
    const decision = authGateDecision({
      probe: 'open',
      session: null,
      pathname: DEEP_PATH,
      search: '',
      now: NOW,
    });

    // Assert
    expect(decision).toEqual({ kind: 'render' });
  });

  it('renders when a credential is required and the session is live', () => {
    // Arrange
    const session = sessionExpiringAt(ONE_MINUTE);

    // Act
    const decision = authGateDecision({
      probe: 'required',
      session,
      pathname: DEEP_PATH,
      search: '',
      now: NOW,
    });

    // Assert
    expect(decision).toEqual({ kind: 'render' });
  });

  it('waits while the probe is still out, whatever the session says', () => {
    // Arrange
    const session = sessionExpiringAt(ONE_MINUTE);

    // Act
    const decision = authGateDecision({
      probe: 'pending',
      session,
      pathname: DEEP_PATH,
      search: '',
      now: NOW,
    });

    // Assert
    expect(decision).toEqual({ kind: 'pending' });
  });

  it('waits before deciding even with no session at all', () => {
    // Arrange / Act
    const decision = authGateDecision({
      probe: 'pending',
      session: null,
      pathname: DEEP_PATH,
      search: '',
      now: NOW,
    });

    // Assert
    expect(decision).toEqual({ kind: 'pending' });
  });

  it('carries the query string into the return path', () => {
    // Arrange / Act
    const decision = authGateDecision({
      probe: 'required',
      session: null,
      pathname: '/sources',
      search: '?status=failing',
      now: NOW,
    });

    // Assert
    expect(decision).toEqual({
      kind: 'redirect',
      to: '/login?next=%2Fsources%3Fstatus%3Dfailing',
    });
  });

  it('sends a hostile location to a bare login path', () => {
    // Arrange / Act
    const decision = authGateDecision({
      probe: 'required',
      session: null,
      pathname: '//evil.example/digest',
      search: '',
      now: NOW,
    });

    // Assert
    expect(decision).toEqual({ kind: 'redirect', to: '/login' });
  });

  it('treats a session whose expiry is not a date as expired', () => {
    // Arrange
    const session: Session = {
      token: 'tok-gate',
      sub: 'operator@example.test',
      expiresAt: 'whenever',
    };

    // Act
    const decision = authGateDecision({
      probe: 'required',
      session,
      pathname: DEEP_PATH,
      search: '',
      now: NOW,
    });

    // Assert
    expect(decision).toEqual({ kind: 'redirect', to: DEEP_LOGIN_PATH });
  });

  it('renders with no clock handed in when the expiry is far ahead', () => {
    // Arrange
    const session: Session = {
      token: 'tok-gate',
      sub: 'operator@example.test',
      expiresAt: '2099-01-01T00:00:00.000Z',
    };

    // Act
    const decision = authGateDecision({
      probe: 'required',
      session,
      pathname: DEEP_PATH,
      search: '',
    });

    // Assert
    expect(decision).toEqual({ kind: 'render' });
  });

  it('redirects with no clock handed in when the expiry is long past', () => {
    // Arrange
    const session: Session = {
      token: 'tok-gate',
      sub: 'operator@example.test',
      expiresAt: '2020-01-01T00:00:00.000Z',
    };

    // Act
    const decision = authGateDecision({
      probe: 'required',
      session,
      pathname: DEEP_PATH,
      search: '',
    });

    // Assert
    expect(decision).toEqual({ kind: 'redirect', to: DEEP_LOGIN_PATH });
  });
});
