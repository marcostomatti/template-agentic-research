/**
 * @packageDocumentation
 * The starter `users` table, carried over unchanged from the
 * pre-schema-v2 `src/db/schema.ts`. It has nothing to do with the
 * research pipeline and is not a table any pipeline row points at.
 *
 * It stays because two shipped things read it. The DB-backed route
 * `GET /users` in `src/index.ts` is the service's only proof that the
 * Postgres dependency is actually live rather than merely constructed
 * — `GET /health` reports a dependency's recorded status, this route
 * issues a real query. And `tests/live/users.live.test.ts` round-trips
 * a row through the real database, with `users` the sole entry in the
 * `TABLES` list `resetTables` truncates.
 *
 * Dropping the table breaks both, and it breaks them quietly: the live
 * suite self-skips without `AR_LIVE_DATABASE_URL`, so the default
 * suite would stay green while the route started returning 500.
 */
import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull()
    .unique(),
  createdAt: timestamp('created_at').defaultNow()
    .notNull(),
});
