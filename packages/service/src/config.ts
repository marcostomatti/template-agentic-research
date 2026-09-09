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
 * Not every optional entry is an integration toggle. The `AR_N8N_*` pair and
 * the `AR_LLM_*` trio below belong to operator commands rather than to the
 * service — the pair to the ones that talk to an n8n instance over its REST
 * API, the trio to the ones that arm a local stack with a model to call — so
 * their absence changes nothing a boot does, and the command that wants one
 * is what refuses.
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
  /**
   * Base URL of the model server this deployment's passes call. No
   * module reads it yet, here or under `scripts/`: it is declared ahead
   * of the operator command that writes the one `connectors` row of kind
   * `llm` a deployment carries, which is where the value is destined.
   * On that row it is `config.endpoint`, and the `Model Endpoint` node
   * in each of `ar-digest`, `ar-ingest` and `ar-research` takes it from
   * there as an expression over what that workflow's
   * `Select Model Connector` node projected — so the address reaches a
   * pass as DATA on a row rather than as a setting anything in this
   * process resolves.
   *
   * Which is why the host written here is the container's view and not
   * this machine's: the socket is opened from inside the n8n container,
   * so a model server listening on the host is reached at
   * `host.docker.internal` — `docker-compose.yml` carries the
   * `host-gateway` entry that makes that name resolve on Linux — while
   * `localhost` here is n8n talking to itself.
   *
   * No floor, deliberately, and for a sharper reason than `AR_N8N_URL`'s:
   * a floor would refuse a blank at BOOT, in a process that never opens
   * the setting, on behalf of a pipeline that runs somewhere else
   * entirely. Blankness is answered where the value is used instead: the
   * projection above wraps its read in `nullif`, so an empty endpoint
   * reaches a pass as null rather than as an address of zero length.
   */
  AR_LLM_ENDPOINT: z.string().optional(),
  /**
   * Model name those passes ask that endpoint for, and unread here for
   * the same reason. It is destined for the same `llm` row's
   * `config.model`, projected by the same node, and read by the same
   * `Model Endpoint` nodes as their `model` parameter.
   *
   * Declared beside the endpoint rather than folded into it because the
   * row keeps the two apart and the nodes read them separately: one
   * endpoint commonly serves several models, so moving between them is
   * an edit to one member of one row and not to an address.
   *
   * No floor, for the endpoint's reason, and the projection treats an
   * empty value the same way — null rather than a request for a model
   * whose name is the empty string.
   */
  AR_LLM_MODEL: z.string().optional(),
  /**
   * Key those passes authenticate to that endpoint with. Unlike the two
   * above it never touches the `llm` row: it is the single field of the
   * `ar-model` n8n credential, and `scripts/n8n-credentials.ts` is where
   * the name is spelled for that build. The model nodes read only
   * `endpoint` and `model` off the row, so a key written there would be
   * a stored secret with no reader, which `src/connectors/secrets.ts`
   * would then have to mask on every read.
   *
   * Declared here as a matter of record rather than as the path the
   * value travels, which is what parts it from `AR_N8N_API_KEY` above:
   * that one is read as `config.AR_N8N_API_KEY` by
   * `scripts/deploy-external.ts`, while the credential builder is handed
   * an environment directly by the shell that drives it. Both end up
   * reading the same `.env`; this entry is what says the name is one
   * this deployment configures at all, which is the convention
   * `context/conventions.md` states for every setting here.
   *
   * No length floor, for `AR_N8N_API_KEY`'s reason: a bound written here
   * would refuse whatever the model server decided a key of its own
   * looks like. An endpoint wanting no key at all is still configured
   * with something rather than with nothing — the credential builder
   * reads a blank as unset and refuses it by name.
   */
  AR_LLM_API_KEY: z.string().optional(),
});

export type Config = z.infer<typeof EnvSchema>;

export const config: Config = EnvSchema.parse(process.env);
