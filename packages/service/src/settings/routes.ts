/**
 * @packageDocumentation
 * The HTTP surface over `src/settings/service.ts`: two routes over
 * one row, and nothing in them that decides anything.
 *
 * `GET /settings` is {@link getSettings} and `PUT /settings` is
 * {@link putSettings}. What a handler adds over the call it wraps
 * is a status to choose and an envelope to write — so a change
 * to what an operator may configure belongs one file over, and the
 * cases that pin those rules still need no server.
 *
 * ONE PATH AND NO ADDRESS, which is where this group departs from
 * all three of its siblings. Each of them declares two path shapes
 * because a resource is met in its parent and written by its id;
 * `operator_settings` holds ONE row whose id the database pins, so
 * there is no collection to page, no parent to hang off and no
 * segment for a request to get wrong. Neither handler below reads
 * `req.params`, and `src/http/schemas.ts`'s two param schemas are
 * imported by every sibling router and by neither route here.
 *
 * THAT ABSENCE IS WHY THIS FILE HAS NO `404` AND NO `409`. There is
 * no address to name a row that is not there, and no natural key a
 * request could propose twice: a caller reads the settings that
 * exist and writes the settings it wants, and the only thing either
 * can get wrong is the payload. Both routes are also the only ones
 * on the surface whose store call cannot be refused —
 * `src/settings/store.ts` records both mechanisms
 * `operator_settings` carries seen firing against the live server,
 * and records why a port writing one id it chose itself reaches
 * neither.
 *
 * PER-DOMAIN SETTINGS ARE NOT HERE AND CANNOT BE REACHED FROM HERE.
 * `domains.settings` is a different column on a different table
 * holding a different shape — scoring weights, a verdict
 * vocabulary, a field contract — and it is written through
 * `PATCH /domains/:slug`, where it is one member of a larger body.
 * What this row holds is the deployment's own preferences, which
 * belong to no domain. The two are near enough in name that a
 * reader may expect one to reach the other, so
 * `docs/architecture/08-http-api.md` states the separation beside
 * this group's table rather than leaving it to be inferred.
 *
 * A `PUT` RATHER THAN A `PATCH`, AND THE TWO WOULD NOT BE THE SAME
 * OPERATION. The payload IS the request here: omitting a member is
 * how it is cleared, and there is no third state for a request to
 * express. `PATCH /domains/:slug` is the shape that needs the other
 * verb, because `settings` is one member of a larger body there and
 * omitting the member and emptying it are two different requests.
 * `src/settings/store.ts` carries the whole-unit rule this method
 * name follows from, and this router adds nothing to it: the parsed
 * payload is handed over unaltered and no member is invented here.
 *
 * THE BODY IS NOT PARSED HERE, exactly as in the three sibling
 * routers and for the same reason. {@link putSettings} takes an
 * `unknown` and parses it itself, because wave 3 exposes that same
 * function as an MCP tool and a body validated by the router would
 * leave that caller validating against a second schema nobody would
 * notice drifting. What a router owns is what only HTTP has —
 * and on this group that is the verb and the status alone.
 *
 * NEITHER ROUTE PARSES A QUERY, which is a departure from
 * `GET /domains/:slug/categories` rather than from the paginated
 * list routes. That route answers a COLLECTION whole and still
 * refuses `?page`, because a window silently ignored would let a
 * caller read every row believing it had read the first page. A
 * singleton has no page for a caller to believe in: `?page=2` on a
 * route answering one payload is as meaningless as it is on
 * `GET /domains/:slug`, which is the read this pair follows.
 *
 * NO HANDLER HERE CARRIES A TRY/CATCH AND NONE CALLS `next(err)`.
 * `createService` registers `errorHandler` from `lib/errors` LAST,
 * and under Express 5 a bare `throw` inside an `async` handler
 * reaches it — so the `ValidationError` {@link putSettings}
 * raises, whether the schema refused the body or the lookup refused
 * the slug, is a `422` carrying its sanitised `details` with no line
 * of this file involved.
 *
 * THE PAYLOAD IS ANSWERED AS THE PORT ANSWERED IT. `ok()` carries
 * its argument by reference and reshapes nothing, which is that
 * function's stated contract, so what a store handed back is what
 * `JSON.stringify` sees. `OperatorSettings` in
 * `src/db/schema/settings.ts` is on the wire member for member, and
 * `{}` is a complete value of it rather than a placeholder —
 * which is what a read before any write answers.
 *
 * PATHS ARE ROOT-ABSOLUTE AND THIS ROUTER MOUNTS AT `/`, which is
 * the surface-wide rule. The string below is the string on the
 * wire, which is what keeps a path seen in a log greppable in this
 * repository. This router is the one on the surface that would lose
 * nothing to a `/settings` mount, since it owns that prefix whole
 * and always will — it mounts at `/` anyway, because a reader
 * comparing five routers should not have to check which of them is
 * the exception. The argument is in `docs/architecture/08-http-api.md`,
 * which records the `/auth` mount as the one departure.
 *
 * No body parsing is set up here. `applyMiddleware` installs
 * `express.json()` on the app before any router is mounted, so
 * `req.body` is already a parsed value — or `undefined` for a
 * request that sent no body, which `operatorSettingsSchema` refuses
 * like any other bad shape.
 */
import type { SettingsServiceStore } from './service.js';
import type { Router as RouterType } from 'express';

import { Router } from 'express';

import { ok } from '../http/envelope.js';

import { getSettings, putSettings } from './service.js';

/** Everything {@link buildSettingsRouter} needs. */
export interface SettingsRouterOptions {
  /**
   * Where the configuration is read and written, and where a
   * `defaultDomainSlug` is resolved. `SettingsServiceStore` and not
   * either port whole: it is the intersection of the two `Pick`s
   * the service declares, so this router asks for exactly the three
   * methods the two functions below reach and
   * `tests/helpers/memory-research-store.ts` can stand behind it
   * with no database up.
   *
   * The only member, and an options object regardless, so the five
   * wave-1 routers are built the same way and a dependency added
   * here later is not a signature change at the one call site in
   * `src/index.ts`.
   */
  readonly store: SettingsServiceStore;
}

/**
 * Builds the operator settings router.
 *
 * @param options - The store to act against; see
 *   {@link SettingsRouterOptions}.
 * @returns A configured Express `Router`, to be mounted at `/` by
 *   the host application with `app.use(ctx.requireAuth, router)`.
 *
 * @remarks
 * **Endpoints** — root-absolute, so these are the wire paths:
 *
 * - `GET /settings` — reads what this deployment is configured
 *   with. `200` with `{ success: true, data }`, where `data` is the
 *   stored payload, or `{}` when no row has been written yet. No
 *   `meta`: there is no collection here and so no window to
 *   describe. THIS ROUTE HAS NO REFUSAL AT ALL — no address to
 *   get wrong, no body to check and no query it reads, so the only
 *   status it answers is `200`.
 * - `PUT /settings` — replaces the configuration whole. `200`
 *   with the stored payload afterwards, read back rather than
 *   echoed. `422` with `code: 'VALIDATION_ERROR'` for a body
 *   `operatorSettingsSchema` refuses — one detail per fault,
 *   with a key inside `notificationChannels` reported as
 *   `notificationChannels.*` and an undeclared top-level key
 *   reported against `body` — and `422` again when a
 *   well-formed `defaultDomainSlug` names no domain, that one
 *   carrying `code: 'unknown_domain'` on its single detail.
 *
 * `200` AND NOT `201` ON THE WRITE, although the first one may
 * create the row. The resource a caller addressed exists before any
 * row does: `GET /settings` answers `{}` rather than `404`, so a
 * `201` would announce a creation no caller can observe and would
 * make the first write answer differently from every later one for
 * a reason about storage rather than about the request. No
 * `Location` header either, for the same reason — the address
 * is fixed, and the caller already has it.
 *
 * `200` AND NOT `204`, because the answer is worth reading. A write
 * is a replacement, so what is held afterwards is exactly what a
 * caller then has to check against what it meant, and the port
 * reads the payload back rather than echoing the argument —
 * `jsonb` may normalise what it stored.
 *
 * NEITHER ROUTE CAN ANSWER `404`, `409` OR `500` FROM A RULE. The
 * first two have no subject here, per the module header. The third
 * is not a rule at all: a `StoreRefusal` reaching a caller from
 * this group would be a store doing something its port does not
 * describe, which `src/settings/service.ts` deliberately leaves
 * unhandled rather than dressing as a status.
 *
 * Both can also answer `401` with `{ error: 'Unauthorized' }` —
 * the guard's own body, in neither envelope — because
 * `src/index.ts` mounts this router behind `ctx.requireAuth`. That
 * is the whole of the reason a read is guarded: what this row holds
 * is operator configuration, and it has no anonymous consumer.
 * `docs/architecture/08-http-api.md` tabulates that answer beside
 * the three other framework-shaped ones.
 */
export function buildSettingsRouter(
  options: SettingsRouterOptions,
): RouterType {
  const router = Router();

  /**
   * GET /settings
   *
   * Reads the operator's configuration.
   *
   * **Side effects:** none.
   *
   * `req` is unread because there is nothing on it this route is
   * entitled to: no segment, no declared query parameter and no
   * body. A handler reaching for one of them would be inventing a
   * vocabulary the endpoint does not have.
   *
   * The collapse of an absent row into `{}` is
   * {@link getSettings}'s and not this handler's, which is why the
   * answer below is unconditional. A router branching on the store
   * having a row would be taking that reading decision twice.
   */
  router.get('/settings', async (_req, res) => {
    const settings = await getSettings(options.store);

    res.status(200).json(ok(settings));
  });

  /**
   * PUT /settings
   *
   * Replaces the operator's configuration.
   *
   * **Side effects:** writes the one `operator_settings` row,
   * creating it when the table holds none. Never more than one row:
   * the id is the port's own constant and the database CHECKs it,
   * so there is nothing this handler could pass that would make a
   * second.
   *
   * The body reaches {@link putSettings} unparsed. That is the
   * module header's rule rather than an omission here, and it is
   * what makes the refusal below the service's answer rather than
   * this router's.
   */
  router.put('/settings', async (req, res) => {
    const stored = await putSettings(options.store, req.body);

    res.status(200).json(ok(stored));
  });

  return router;
}
