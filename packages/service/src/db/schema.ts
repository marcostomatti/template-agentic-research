/**
 * @packageDocumentation
 * Drizzle schema — starter `users` table; replace with your own tables.
 * Generate migrations with `bun db:generate`, apply with `bun db:migrate`.
 */
import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull()
    .unique(),
  createdAt: timestamp('created_at').defaultNow()
    .notNull(),
});
