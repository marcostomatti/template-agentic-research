/**
 * @packageDocumentation
 * Repository queries for the starter `users` table.
 */
import type { Db } from './index.js';

import { users } from './schema.js';

export async function listUsers(db: Db) {
  return db.select().from(users);
}

export async function createUser(db: Db, email: string) {
  const [row] = await db.insert(users).values({ email })
    .returning();
  return row;
}
