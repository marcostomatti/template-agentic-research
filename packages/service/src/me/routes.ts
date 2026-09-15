/**
 * @packageDocumentation
 * `GET /me`: who the service believes is asking.
 *
 * One route, and nothing in it that verifies anything. The guard
 * `src/index.ts` puts in front of it is `ctx.requireAuth`, which
 * either answers `401` before this router is reached or leaves the
 * verified claims on `res.locals.auth`; the handler reads them back
 * through `getSession` and writes the subject. A change to what
 * counts as a session belongs to the verifier seam, not here.
 *
 * THE ROUTE IS A GUARDED ONE WITH NO GUARD OF ITS OWN. Nothing
 * below attaches `requireAuth`, so the router is drivable in a test
 * with no auth block at all — and, more to the point, a deployment
 * decides whether it is protected at the mount, which is where
 * every other guarded router here is protected too.
 */
import type { RouteSchemas } from '../http/openapi-bindings.js';
import type { Router as RouterType } from 'express';

import { Router } from 'express';
import { z } from 'zod';

import { getSession } from '../../lib/express/auth.js';

/**
 * What `GET /me` answers.
 *
 * `sub` IS NULLABLE BECAUSE THE SERVICE CAN RUN OPEN. With no auth
 * block configured, `createService` resolves `ctx.requireAuth` to a
 * passthrough: every request reaches the handler, and none carries
 * a session, so there is no subject to report. `null` is that fact
 * on the wire. It is not an anonymous user and not a refusal. A
 * client reading `{ ok: true, sub: null }` is talking to a service
 * that checks no credential at all, which is worth knowing and is
 * exactly what an absent key or an empty string would hide.
 *
 * Under an auth block the same `null` is unreachable: the guard
 * answers `401` before this route runs, so a request that gets here
 * carries claims, and `SessionClaims` requires their `sub` to be a
 * string.
 *
 * Exported beside the table rather than inside it, because
 * `RouteSchemas` declares a request's params, query and body and
 * has no response member. The handler builds its answer THROUGH
 * this schema, so a document describing the response names the
 * object the route really writes rather than a copy written out for
 * the document.
 */
export const meResponseSchema = z.object({
  ok: z.literal(true),
  sub: z.string().nullable(),
});

/**
 * What the one route below binds, keyed by the label the wire
 * carries.
 *
 * `{}` because the route parses nothing: no address, no query and
 * no body. `src/http/openapi-bindings.ts` argues why an empty
 * binding is a claim about a real route rather than a placeholder.
 * The key needs no prefix: the router registers the root-absolute
 * path, so what it declares is already what a caller sends.
 *
 * `satisfies` and not a bare `as const`, so a member `RouteSchemas`
 * does not declare fails `check-types`.
 */
export const meRouteSchemas = {
  'GET /me': {},
} as const satisfies Readonly<Record<string, RouteSchemas>>;

/**
 * Builds the identity router.
 *
 * @returns A configured Express `Router`, to be mounted at `/`
 *   behind `ctx.requireAuth` by the host application.
 *
 * @remarks
 * **Endpoints:**
 *
 * - `GET /me` — `200` with `{ ok: true, sub }`. `sub` is the
 *   verified session's subject, or `null` when the guard in front
 *   is a passthrough and no session exists; see
 *   {@link meResponseSchema} for why that is `null` and not a
 *   refusal.
 */
export function buildMeRouter(): RouterType {
  const router = Router();

  /**
   * GET /me
   *
   * Reports the verified subject.
   *
   * **Side effects:** none.
   *
   * A session whose `sub` is not a string fails the parse and
   * reaches the error handler as a `500`. No verifier here can
   * produce one, and answering it as a subject would put whatever
   * it is on the wire.
   */
  router.get('/me', (_req, res) => {
    const sub = getSession(res)?.sub ?? null;

    res.status(200).json(meResponseSchema.parse({ ok: true, sub }));
  });

  return router;
}
