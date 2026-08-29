/**
 * @packageDocumentation
 * The authentication module's public surface: four constructors, and
 * the four shapes a caller builds their arguments in.
 *
 * Listed below in the order `src/index.ts` uses them. A store is
 * built over a database thunk, the bootstrap dependency is registered
 * behind the Postgres one so the credential is written once the pool
 * is proven live, the router is mounted at `/auth`, and the verifier
 * goes into the `auth` block `createService` builds its request
 * middleware from. The one store serves the other three, which is why
 * `AuthStore` is on this surface at all; `AuthDeps` is what two of
 * them take, the router instead receiving the same clock and TTL as
 * separate fields of `AuthRouterOptions` and assembling its own below
 * the routes.
 *
 * THIS SURFACE IS NARROWER THAN THE DIRECTORY, deliberately. Hashing
 * a password, minting a token, comparing an introspection secret,
 * issuing and verifying and revoking a session, and the bootstrap
 * upsert itself are reached from inside `src/auth/` and, across `src/`
 * and `lib/`, from nowhere else. A module there calling one of them
 * would be doing this module's job without its rules — the refusal
 * that answers an unknown login name and a wrong password
 * identically, the expiry and revocation guards, the digest a
 * presented token is reduced to before any lookup — so what is left
 * out is the point rather than an oversight about what a caller might
 * find useful.
 *
 * NO SHAPE ON THIS SURFACE DECLARES A HASH FIELD. The four record
 * types in `src/auth/store.ts` that do — the credential, the upsert
 * input, the session row and the session insert input — are absent by
 * name, and no constructor here returns one. `bootstrapAuthUser` is
 * the single omission that is about this rather than about narrowness:
 * it answers with the credential it just wrote, hash and all, so what
 * this file exports instead is `createAuthBootstrapDependency`, whose
 * `Dependency` discards that return value and whose own signature
 * names no record at all.
 *
 * What the paragraph above does NOT claim is that a hash is
 * unreachable from here. `AuthStore` is a port; its methods name those
 * four records in their signatures, so `AuthRouterOptions['store']`
 * reaches them exactly as the exported type itself does, and
 * withholding the name would hide nothing while costing every consumer
 * the word for the value it passes around. The containment rule is
 * about call sites rather than about the type graph: across `src/` and
 * `lib/`, only this directory and `src/db/schema/auth.ts` name the
 * field. `src/auth/store.ts` argues why, and a later stage's
 * `tests/invariants/auth-containment.ts` is what holds it.
 *
 * DEEP IMPORTS REMAIN CORRECT FOR THE SUITE, and the two that exist
 * are not an oversight to tidy onto this file. The in-memory store in
 * `tests/helpers/` implements the port against `./store.js`, and the
 * contract in `tests/auth/store-contract.ts` drives it against that
 * and against `./tokens.js`, which it borrows as a fixture generator
 * so a stored hash has the width the real mint path produces. What
 * both are written against is the port rather than the wiring, so
 * neither has any use for this file: a barrel is the application's
 * way in, not an access rule.
 */
export { createDbAuthStore } from './db-store.js';
export { createAuthBootstrapDependency } from './bootstrap.js';
export { buildAuthRouter } from './routes.js';
export { createDbSessionVerifier } from './verifier.js';

export type { AuthStore } from './store.js';
export type { AuthDeps } from './service.js';
export type { BootstrapCredentials } from './bootstrap.js';
export type { AuthRouterOptions } from './routes.js';
