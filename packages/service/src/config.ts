import process from 'node:process';

import { z } from 'zod';

/**
 * Environment configuration — parsed once at import time; the process fails
 * fast on invalid env instead of limping into a broken state.
 *
 * Optional integrations are toggled by presence:
 * - `REDIS_URL` unset (the default) → the Redis dependency is not registered.
 * - `AUTH_INTROSPECT_URL`/`AUTH_INTROSPECT_SECRET` unset → `requireAuth` and
 *   `optionalAuth` are no-op passthroughs (see `src/auth/`).
 */
const EnvSchema = z.object({
  PORT: z.coerce.number().int()
    .positive()
    .default(3000),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
  /** Postgres — the default datastore. The fallback matches docker-compose. */
  DATABASE_URL: z
    .string()
    .default('postgresql://ar:ar@localhost:5432/ar'),
  /** Redis — OFF by default; set a URL to register the dependency. */
  REDIS_URL: z.string().optional(),
  /** RFC 7662 token introspection endpoint (see src/auth/ and specs/). */
  AUTH_INTROSPECT_URL: z.string().optional(),
  /** Service-to-service secret for the introspection call (min 32 chars). */
  AUTH_INTROSPECT_SECRET: z.string().min(32)
    .optional(),
});

export type Config = z.infer<typeof EnvSchema>;

export const config: Config = EnvSchema.parse(process.env);
