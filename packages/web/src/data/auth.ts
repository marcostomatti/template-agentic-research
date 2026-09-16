/**
 * @packageDocumentation
 * The auth selector: which layer the app is running against, and the
 * two session calls that exist only when that layer is the service.
 *
 * `./api.ts` is the same seam for the 34 accessors; this is the seam
 * for the session, and it is a SEPARATE module for the reason
 * `./http/auth.ts` gives — the fixture build must not carry the auth
 * transport, and a barrel that merged the two would keep the HTTP
 * module alive in the bundle through the accessors' own import.
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
 * `undefined` in fixture mode a DROPPED module rather than a pair of
 * unreachable bindings — with them folded away, nothing in a fixture
 * build references `./http/auth.ts`, and `zod`, the client and the
 * session store leave with it.
 *
 * MEASURED SO FAR, and not more than this: with `VITE_AR_API_URL`
 * unset AND with it set to `''`, a `bun run build` of this package
 * leaves the string `auth/logout` out of `dist/` BOTH times. That
 * reading does not yet separate the two branches — no page calls
 * `useLogout` in this commit, so the binding is dead in either build
 * and the HTTP module goes for a reason that has nothing to do with
 * the switch. The fold itself is `./api.ts`'s measurement, taken on
 * the same Vite; the branch-separating reading here is only
 * available once the topbar consumes the hook.
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
