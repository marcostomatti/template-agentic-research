/**
 * @packageDocumentation
 * Who the operator is, as the service reports it: the pure half of the
 * API-mode `fetchOperator`.
 *
 * `GET /me` answers `{ ok: true, sub }`, a bare object in neither of the
 * service's envelopes. {@link readMeSub} checks that body at the boundary
 * and {@link operatorFromSub} turns its `sub` into the `ProfileMenuUser`
 * the topbar's avatar renders. Neither touches the network, so both are
 * tested with no stub at all.
 *
 * `sub` is `null` when the service runs open — its guard is a passthrough
 * and no session exists — and that answers {@link LOCAL_OPERATOR}, the
 * same "Local Operator" the fixture layer shows. Under an auth block the
 * subject is a `basic:<name>` string minted by the login route, and the
 * operator is named after it. The service has no email to give, so the
 * `sub` itself stands in for one.
 *
 * {@link LOCAL_OPERATOR} is a literal copy of the fixture `OPERATOR`
 * rather than an import of it, because an API-mode build must not pull
 * a fixture module in to answer one object. The colocated test holds the
 * two deep-equal, which is what keeps the copy from drifting.
 */

import type { ProfileMenuUser } from '@ar/ui';

import { ApiError, BAD_ENVELOPE } from './envelope';

/** The prefix the service's basic-auth login mints subjects under. */
export const BASIC_SUB_PREFIX = 'basic:';

/**
 * The operator of a service that checks no credential: the fixture
 * layer's operator, member for member.
 *
 * Frozen for the fixture's reason — one shared object, every member a
 * string, so the shallow freeze is complete.
 */
export const LOCAL_OPERATOR: ProfileMenuUser = Object.freeze({
  name: 'Local Operator',
  email: 'operator@localhost',
  role: 'owner',
});

/**
 * Derive the operator from `/me`'s subject.
 *
 * - `null` answers {@link LOCAL_OPERATOR}.
 * - `basic:<name>` answers `<name>` as the name, everything after the
 *   FIRST `:` — a name may itself carry a colon.
 * - Any other subject, `basic:` with nothing after it included, is
 *   named by the whole `sub`: the badge still has something to say, and
 *   no part of an unknown scheme is guessed at.
 *
 * The email is always the whole `sub` and the role always `owner`, the
 * one role a single-operator deployment has.
 *
 * @param sub - `/me`'s `sub`; `null` under an open service.
 * @returns The operator the profile menu renders.
 */
export function operatorFromSub(sub: string | null): ProfileMenuUser {
  if (sub === null) {
    return LOCAL_OPERATOR;
  }

  const name = sub.startsWith(BASIC_SUB_PREFIX)
    ? sub.slice(BASIC_SUB_PREFIX.length)
    : '';

  return {
    name: name === ''
      ? sub
      : name,
    email: sub,
    role: 'owner',
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Read `sub` off a `GET /me` body, trusting nothing about its shape.
 *
 * @param body - The decoded body.
 * @param status - The status it arrived with, carried onto the error.
 * @returns The subject, or `null` under an open service.
 * @throws ApiError with code {@link BAD_ENVELOPE} when the body is not an
 * object with `ok: true` and a `sub` that is a non-empty string or `null`.
 */
export function readMeSub(body: unknown, status: number): string | null {
  if (isRecord(body) && body.ok === true) {
    const { sub } = body;

    if (sub === null || (typeof sub === 'string' && sub !== '')) {
      return sub;
    }
  }

  throw new ApiError({
    status,
    code: BAD_ENVELOPE,
    message: 'The /me body is not { ok: true, sub } with sub a string or null.',
  });
}
