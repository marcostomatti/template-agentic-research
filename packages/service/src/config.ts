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
 *
 * Not every optional entry is an integration toggle. `AR_N8N_URL` and
 * `AR_N8N_API_KEY` are read by an operator command rather than by the
 * service, so their absence changes nothing a boot does, and the command that
 * wants them is what refuses.
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
  /**
   * Base URL of the n8n instance `scripts/deploy-external.ts` uploads built
   * workflows to, over the public REST API that instance exposes. That script
   * names this entry in a refusal of its own when nothing is set for it,
   * before it builds anything or makes a request, and reads a value that is
   * present but blank as nothing set. The running service never opens it at
   * all, which is what makes the entry optional: unset, it leaves a boot
   * exactly as it was.
   */
  AR_N8N_URL: z.string().optional(),
  /**
   * API key that same deploy authenticates with, issued by the instance
   * `AR_N8N_URL` names. No length floor, unlike `AUTH_INTROSPECT_SECRET`
   * above: that secret is picked by whoever configures this deployment, so a
   * floor is a demand this schema is in a position to make, while a bound
   * written here would refuse whatever the instance decided a key of its own
   * looks like.
   */
  AR_N8N_API_KEY: z.string().optional(),
});

export type Config = z.infer<typeof EnvSchema>;

export const config: Config = EnvSchema.parse(process.env);
