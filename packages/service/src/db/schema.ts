/**
 * @packageDocumentation
 * Drizzle schema barrel — the one module every consumer and every tool
 * resolves the table set through. The tables themselves live one file
 * per concern under `src/db/schema/`; this file re-exports them and
 * holds no definition of its own.
 *
 * This path is load-bearing and stays where it is. `drizzle.config.ts`
 * names it as drizzle-kit's `schema` entry point, `src/db/index.ts`
 * imports it as a namespace to type the `drizzle()` client, and
 * `tests/live/live-postgres.ts` does the same for the live suite.
 * Splitting the definitions into modules behind the barrel keeps all
 * three untouched while the 800-line file cap holds across the schema
 * v2 table roster.
 *
 * A new module under `src/db/schema/` is only half the work: without
 * its `export *` line here, drizzle-kit never sees the table and so
 * generates no migration for it, and `drizzle({ schema })` cannot
 * resolve a relation it was never handed.
 *
 * Generate migrations with `bun db:generate`, apply with `bun db:migrate`.
 */
export * from './schema/domains.js';
export * from './schema/users.js';
