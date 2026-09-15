import process from 'node:process';

import { z } from 'zod';

import {
  corsOriginsSchema,
  rateLimitMaxSchema,
} from './http/service-options.js';

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
 * - `AR_CORS_ORIGINS` unset (the default) → no cross-origin read is
 *   allowed. `AR_RATE_LIMIT_MAX` unset (the default) → the framework's
 *   100-per-minute limiter. Both are translated for `createService` by
 *   `src/http/service-options.ts`.
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
  /**
   * Postgres — the default datastore. The fallback matches docker-compose.
   *
   * `scripts/read-deployment.ts` reads it too, for its `schema` and
   * `connector` legs, each sending one `SELECT`. The fallback is the one
   * thing that reader cannot see past: with nothing set, those legs read
   * the compose dev database rather than refusing, which is why
   * `scripts/verify-external.sh`, running those legs, refuses to start
   * one until the value is exported for the deployment it reads.
   */
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
   * Origins a browser may let read this service's responses,
   * comma-separated — the web app's own origin when it is served from
   * somewhere other than this port. Unset leaves the framework
   * answering every cross-origin request with no
   * `Access-Control-Allow-Origin` at all.
   *
   * Each entry must be a bare `http` or `https` origin, written as a
   * browser sends it in `Origin`. A blank entry (a blank value, a
   * doubled or trailing comma) and `*` are boot failures rather than
   * readings of "nothing" or "everything": see `corsOriginsSchema` in
   * `src/http/service-options.ts`, which is also where the parsed list
   * becomes the `cors` member `createService` takes.
   */
  AR_CORS_ORIGINS: corsOriginsSchema.optional(),
  /**
   * Requests one client may make per minute, app-wide. Unset leaves
   * the framework's own limit of 100. The window is fixed at a minute
   * in `src/http/service-options.ts`, so this is the only knob.
   *
   * A positive integer; a blank value coerces to 0 and is a boot
   * failure, as it is for `AUTH_SESSION_TTL_SECONDS` above. Setting it
   * changes the limiter's response headers as well as its count: a
   * block supplied here reaches the limiter without the draft-6 header
   * choice the framework fallback carries, so responses answer
   * `X-RateLimit-Limit` rather than `RateLimit-Limit`.
   */
  AR_RATE_LIMIT_MAX: rateLimitMaxSchema.optional(),
  /**
   * Base URL of the n8n instance `scripts/deploy-external.ts` uploads built
   * workflows to, over the public REST API that instance exposes. That script
   * names this entry in a refusal of its own when nothing is set for it,
   * before it builds anything or makes a request, and reads a value that is
   * present but blank as nothing set. The running service never opens it at
   * all, which is what makes the entry optional: unset, it leaves a boot
   * exactly as it was.
   *
   * `scripts/read-deployment.ts` reads it as well, refusing on it through
   * the same pre-flight before any of its legs reads anything. It asks for
   * readiness at the instance root, taking the API path off a value that
   * carries one, and lists workflows under the API.
   *
   * `scripts/verify-external.sh`, which runs those legs, reads the name
   * off its own environment instead of through this schema, and refuses
   * before any leg runs where it or `AR_N8N_API_KEY` is not exported or
   * is blank, so a value set only in `.env` is refused there.
   */
  AR_N8N_URL: z.string().optional(),
  /**
   * API key that same deploy authenticates with, issued by the instance
   * `AR_N8N_URL` names. No length floor, unlike `AUTH_INTROSPECT_SECRET`
   * above: that secret is picked by whoever configures this deployment, so a
   * floor is a demand this schema is in a position to make, while a bound
   * written here would refuse whatever the instance decided a key of its own
   * looks like.
   *
   * `scripts/read-deployment.ts` sends it on the workflow listing and on
   * nothing else, the readiness route taking no key. The listing is the one
   * route it needs a scope for, and `workflow:list` alone is enough: n8n
   * 2.15.1 answers a key minted with only that scope 200 on the listing and
   * 403 on a deactivation, refused on the scope before any handler runs.
   */
  AR_N8N_API_KEY: z.string().optional(),
  /**
   * Base URL of the model server this deployment's passes call.
   * Nothing reads it through this schema. `scripts/llm-connector.ts`
   * reads it off an environment directly, when it writes the one
   * `connectors` row of kind `llm` a deployment carries, which is
   * where the value is destined.
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
   * entirely. Blankness is answered twice where the value is used, and
   * neither answer is this schema's: the command reads a blank as unset
   * and refuses to write a row at all, and the projection above wraps
   * its read in `nullif`, so an endpoint that got stored empty anyway
   * reaches a pass as null rather than as an address of zero length.
   */
  AR_LLM_ENDPOINT: z.string().optional(),
  /**
   * Model name those passes ask that endpoint for, read off the same
   * environment by the same command and not through this schema for
   * the same reason. It is destined for the same `llm` row's
   * `config.model`, projected by the same node, and read by the same
   * `Model Endpoint` nodes as their `model` parameter.
   *
   * Declared beside the endpoint rather than folded into it because the
   * row keeps the two apart and the nodes read them separately: one
   * endpoint commonly serves several models, so moving between them is
   * an edit to one member of one row and not to an address.
   *
   * No floor, for the endpoint's reason, and blank is read as unset
   * there too — the difference being that an unset model is not a
   * refusal but a row written without the member. The projection
   * treats an empty value the same way: null rather than a request
   * for a model whose name is the empty string.
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
