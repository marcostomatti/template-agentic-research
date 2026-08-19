/**
 * @packageDocumentation
 * Drizzle + Postgres, wired as a managed service dependency (the default
 * datastore of this template). The pool is probed eagerly on service start —
 * startup fails fast if the database is unreachable — and drained on stop.
 */
import type { TypedDependency } from '../../lib/service-core/index.js';

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { createDependency } from '../../lib/service-core/index.js';

import * as schema from './schema.js';

export type Db = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Creates the Postgres dependency.
 *
 * @param connectionString - Postgres connection URL (see `DATABASE_URL`).
 * @returns A `TypedDependency<Db>` for `createService({ dependencies })`.
 */
export function createDbDependency(connectionString: string): TypedDependency<Db> {
  const pool = new Pool({ connectionString, max: 10 });
  const db = drizzle({ client: pool, schema });

  return createDependency({
    name: 'postgres',
    client: db,
    async onStart() {
      // Probe the connection eagerly so startup fails fast if DB is unreachable
      const probe = await pool.connect();
      probe.release();
    },
    async onStop() {
      await pool.end();
    },
  });
}
