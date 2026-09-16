/**
 * @packageDocumentation
 * The auth selector: which layer the app is running against, and the
 * two session calls that exist only when that layer is the service.
 *
 * `./api.ts` is the same seam for the 34 accessors; this is the seam
 * for the session, and it is a SEPARATE module for the reason
 * `./http/auth.ts` gives: a barrel that merged the two would keep the
 * HTTP auth module alive in EVERY bundle through the accessors' own
 * import, and would tie the two switches together for good. What the
 * separation buys is measured below, and it is less than it was.
 *
 * THE SWITCH RULE is `./source.ts`'s, unchanged: `VITE_AR_API_URL`
 * UNSET selects the fixture layer; any string at all selects the HTTP
 * layer, the EMPTY string included, because the empty string is the
 * same-origin production value of a `/app` build. The value itself is
 * never read here — `./http/auth.ts` resolves its own base URL when it
 * first builds a client.
 *
 * WHY THE COMPARISON IS INLINE rather than `resolveDataSource(...)
 * .kind === 'fixture'`, and why each export is its own ternary rather
 * than one destructured object: `./api.ts` measured both halves of
 * this. Vite replaces the `import.meta.env` read with a literal, and
 * rolldown folds a comparison against that literal and drops the
 * branch not taken; it does NOT fold a call across a module boundary.
 * That is what makes {@link logout} and {@link probeAuth} being
 * `undefined` in fixture mode a pair of DROPPED bindings rather than
 * unreachable ones: the ternary folds, and whatever is reachable only
 * through the branch not taken goes with it.
 *
 * WHAT IT NO LONGER BUYS is a dropped MODULE, and this header used to
 * claim it did. `src/routes/login/` imports `./http/auth.ts` directly
 * — the login page calls `login`, the auth gate calls `probeAuth` —
 * and `src/routes/router.tsx` names both of those components while
 * building the API route tree, so a fixture build now reaches the
 * module through the ROUTER whatever these two exports fold to.
 *
 * MEASURED, `bun run build` in this package with `grep -rlF` over
 * `dist/`, three builds:
 *
 * - `VITE_AR_API_URL` unset: `auth/login` and `ar.session` PRESENT,
 *   `auth/logout` absent.
 * - `VITE_AR_API_URL` set to `''`: the same three readings.
 * - The same fixture build taken with the previous `router.tsx`,
 *   which named neither login component: all three absent.
 *
 * So the fold is real and is doing exactly one thing — `logout` has
 * no caller yet, and its path string leaves BOTH bundles — while the
 * transport, the client and the session store now ship in either.
 * `zod` was never a reading this module could claim on its own: the
 * editors' schemas put it in the fixture bundle already, and
 * `invalid_type` is present in the pre-router build above. The
 * branch-separating reading arrives with the topbar's `useLogout`
 * call, where `auth/logout` should appear in an API build and stay
 * out of a fixture one.
 *
 * WHY THE READ IS OPTIONAL-CHAINED: `import.meta.env` is undefined in
 * the Playwright node process and in the unit runner, where a bare
 * member read throws at import and takes the importing file with it.
 * `./api.ts` carries that measurement.
 *
 * A caller that holds one of the two must therefore narrow it — the
 * `undefined` is the fixture answer and not an error — which is what
 * `./hooks.ts`'s `useLogout` hands a page, and what keeps
 * `src/app-shell/Topbar.tsx` omitting `onLogout` under fixtures
 * exactly as it does today.
 */

import type { AuthRequirement } from './http/auth';

import * as httpAuth from './http/auth';

/** Which layer the app's session calls are taken from. */
export type AuthMode = 'fixture' | 'api';

/** Revoke the held session; `undefined` when there is no service. */
export type LogoutCall = () => Promise<void>;

/** Ask whether a login is required; `undefined` under fixtures. */
export type ProbeAuthCall = () => Promise<AuthRequirement>;

/** The build-time `VITE_AR_API_URL` read; `undefined` under node. */
const API_URL = import.meta.env?.VITE_AR_API_URL;

/**
 * Which layer this build talks to.
 *
 * `'fixture'` means no network and no login: the router publishes no
 * `/login` route and the shell renders no sign-out. `'api'` means the
 * service answers, and both calls below are functions.
 */
export const authMode: AuthMode = API_URL === undefined
  ? 'fixture'
  : 'api';

/**
 * Sign out at the service and drop the tab's session.
 *
 * `undefined` under fixtures, where there is no session to drop.
 */
export const logout: LogoutCall | undefined = API_URL === undefined
  ? undefined
  : httpAuth.logout;

/**
 * Ask the service whether it requires a credential.
 *
 * `undefined` under fixtures, where the question has no answer: the
 * auth gate is not mounted in that tree at all.
 */
export const probeAuth: ProbeAuthCall | undefined = API_URL === undefined
  ? undefined
  : httpAuth.probeAuth;
