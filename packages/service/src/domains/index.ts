/**
 * @packageDocumentation
 * The domains module's public surface: two constructors, and the
 * two shapes a caller builds their arguments in.
 *
 * Listed below in the order `src/index.ts` uses them. The store is
 * built over a database thunk beside the auth one, and the router is
 * mounted at `/` behind `ctx.requireAuth`. That mount is why the
 * paths are root-absolute: `/domains` and `/domains/:slug` are the
 * strings on the wire, and a `/domains` mount would leave the
 * taxonomy group's `/domains/:slug/categories` reaching for the same
 * prefix from a second router. `DomainsRouterOptions` is what the
 * router takes and `DomainStore` is its one member, which is why the
 * port is on this surface at all: the two constructors meet there.
 *
 * THIS SURFACE IS NARROWER THAN THE DIRECTORY, but not for the
 * reason `src/auth/index.ts` gives for its own narrowness. Nothing
 * withheld here would be dangerous to call. `listDomains`,
 * `getDomain`, `createDomain`, `patchDomain` and `deleteDomain` in
 * `./service.ts` ARE the rules — the 404 for an unknown slug, the
 * 409 for a taken one, the guard that refuses a delete while the
 * domain still holds rows it accumulated — so a module reaching
 * one directly would be running them rather than going around them,
 * and `createDomainSchema`, `patchDomainSchema` and
 * `domainSettingsSchema` are the shapes those functions parse their
 * own bodies against. They are absent because nothing outside this
 * directory has a caller for one today. Wave 3 exposes those same
 * functions as MCP tools; the export line belongs to the commit that
 * gives them a second caller, where a case can reach it.
 *
 * A BARREL IS THE APPLICATION'S WAY IN RATHER THAN AN ACCESS RULE,
 * which is what the suite's two deep imports are evidence of rather
 * than an oversight to tidy onto this file.
 * `tests/helpers/memory-research-store.ts` and its own test import
 * `./store.js`, because what one implements and the other drives is
 * the PORT rather than the wiring; neither has any use for the
 * drizzle constructor this file leads with.
 *
 * `./db-store.ts` IS REACHED THROUGH THIS FILE. Measured across
 * `src/`, `lib/`, `tests/`, `scripts/` and `workflows/` when this
 * file landed: no module outside `src/domains/` imports it, and
 * inside the directory only this one does — the router and the
 * service both take the port instead. `src/auth/db-store.ts`
 * measures the same way, and `tests/live/auth.live.test.ts` is the
 * precedent a live seam over this store should copy: it reaches
 * `createDbAuthStore` through `src/auth/index.js` rather than
 * through the module declaring it. The rule earns its line because
 * this is the one export a consumer could want for the wrong reason
 * — a module building a `DomainStore` of its own is a second
 * wiring of the database, with its own thunk, in a service whose
 * Postgres dependency starts once.
 */
export { createDbDomainStore } from './db-store.js';
export { buildDomainsRouter } from './routes.js';

export type { DomainStore } from './store.js';
export type { DomainsRouterOptions } from './routes.js';
