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
 * - `AUTH_BASIC_USER`/`AUTH_BASIC_PASSWORD` unset (the default) → no
 *   credential is bootstrapped, no session routes are mounted, and a boot
 *   is exactly what it was. Both set → the bootstrap upsert, the `/auth`
 *   routes and a DB-backed verifier that takes precedence over the
 *   introspection pair above.
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
  /** RFC 7662 introspection endpoint at a SIBLING service (see src/auth/). */
  AUTH_INTROSPECT_URL: z.string().optional(),
  /** Shared secret on the introspection call, either direction (min 32). */
  AUTH_INTROSPECT_SECRET: z.string().min(32)
    .optional(),
  /**
   * Login name of the single operator credential the bootstrap upserts
   * into `auth_users` on every boot. Presence-toggled with
   * `AUTH_BASIC_PASSWORD`: the strategy is on only when both are set,
   * so a half-configured deployment gets no credential rather than one
   * with a name and no password.
   *
   * The floor of 1 makes a present-but-blank value a boot failure
   * rather than a third state, unlike `AR_N8N_URL` below, whose reader
   * takes blank as nothing set.
   */
  AUTH_BASIC_USER: z.string().min(1)
    .optional(),
  /**
   * Plaintext password for that credential, hashed with argon2id on
   * the way into `auth_users` (`src/auth/password.ts`) and never
   * stored as given.
   *
   * The 12-character floor is the policy `src/auth/password.ts` defers
   * to: `hashPassword` deliberately checks nothing about its input, so
   * a weak bootstrap password is refused here or nowhere. The bound is
   * lower than `AUTH_INTROSPECT_SECRET`'s 32 because this is a value a
   * human types at a login form, not a generated service secret.
   */
  AUTH_BASIC_PASSWORD: z.string().min(12)
    .optional(),
  /**
   * How long a minted session token stays valid, in seconds; 24 hours
   * by default. Not a presence toggle — it has a default, so it is
   * read whenever the basic-auth pair above is configured, and read
   * by nothing when that pair is not.
   *
   * The value is written into `auth_sessions.expires_at` at mint time
   * rather than consulted again at verify time, so changing it moves
   * only sessions minted afterwards and leaves live ones expiring on
   * the terms they were issued under.
   */
  AUTH_SESSION_TTL_SECONDS: z.coerce.number().int()
    .positive()
    .default(86400),
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
