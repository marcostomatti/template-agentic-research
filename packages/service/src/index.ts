/**
 * Service entrypoint — Option 1 of the entry-point setups in the README is a
 * single process serving the API; Option 2 adds `src/mcp/index.ts` as a
 * second process for MCP. Both share the modules under `src/`.
 *
 * What gets wired here:
 * - Postgres (default on) as a managed dependency — see `src/db/`.
 * - Redis (off by default) — registered only when `REDIS_URL` is set.
 * - Cron jobs — see `src/cron/`; the starter job is a heartbeat to replace.
 * - Notification channels — stubs + webhook; see `src/notifications/`.
 * - Auth — presence-toggled on `AUTH_BASIC_USER` + `AUTH_BASIC_PASSWORD`.
 *   Both set: the operator credential is bootstrapped behind Postgres,
 *   `/auth` serves login/logout/introspect, and `requireAuth`/`optionalAuth`
 *   verify against this service's own session table. Neither set:
 *   `AUTH_INTROSPECT_URL` + `AUTH_INTROSPECT_SECRET` point them at somebody
 *   else's RFC 7662 endpoint instead, and with neither pair configured they
 *   stay no-op passthroughs. See `src/auth/`.
 */
import type { AuthDeps } from './auth/index.js';
import type { ServiceConfig } from '../lib/express/index.js';

import { createService } from '../lib/express/index.js';
import { createLogger } from '../lib/logger/node.js';

import {
  buildAuthRouter,
  createAuthBootstrapDependency,
  createDbAuthStore,
  createDbSessionVerifier,
} from './auth/index.js';
import { config } from './config.js';
import { createCronDependency } from './cron/index.js';
import { createDbDependency } from './db/index.js';
import { listUsers } from './db/users.js';
import {
  registerEmailChannel,
  registerPushChannel,
  registerWebhookChannel,
} from './notifications/index.js';
import { createRedisDependency } from './redis/index.js';
import { exampleRouter } from './routes/example.js';

const logger = createLogger('template-service-express');

// Notification channels register before the HTTP server accepts requests.
registerEmailChannel();
registerPushChannel();
registerWebhookChannel();

const dbDep = createDbDependency(config.DATABASE_URL);

const cronDep = createCronDependency(
  [
    {
      name: 'heartbeat',
      intervalMs: 60_000,
      // Starter job — replace with real recurring work (cleanup, syncs, …).
      run: async () => {
        logger.debug('heartbeat cron tick');
      },
    },
  ],
  logger,
);

/**
 * The auth store, over the database the Postgres dependency owns.
 *
 * Built out here rather than inside `register` because the verifier and
 * the bootstrap dependency are both arguments to the `createService` call
 * below, and dependencies start before `register` ever runs. The thunk is
 * what makes that legal: `createDbAuthStore` opens nothing at
 * construction and resolves the client per call, so the ordering this
 * wiring owes is only that no CALLER arrives before the pool is live.
 * The bootstrap gets that from its place in the dependency array and
 * every route gets it for free.
 *
 * `dbDep.client` rather than `ctx.deps.get(dbDep)` for the same reason:
 * the sanctioned accessor exists only once the service is registering,
 * which is after the bootstrap has already run. The two resolve the same
 * object.
 */
const authStore = createDbAuthStore(() => dbDep.client);

/**
 * The clock and the TTL every session decision below is made against.
 *
 * `now` is a thunk and not an instant. The verifier and the router are
 * built once and then answer for the life of the process, so a captured
 * `Date` would freeze every expiry comparison at the moment of boot.
 */
const authDeps: AuthDeps = {
  now: () => new Date(),
  ttlSeconds: config.AUTH_SESSION_TTL_SECONDS,
};

/**
 * The operator credential to make exist, or null when the basic strategy
 * is off.
 *
 * Toggled on BOTH variables, so a half-configured deployment gets the
 * service it had rather than a credential with a name and no password.
 * This one value gates all three halves of the strategy — the bootstrap
 * dependency, the `/auth` routes and the local verifier — which is what
 * keeps them from disagreeing about whether auth is configured.
 *
 * A presence check and not a truthiness one, because `src/config.ts`
 * gives both entries a length floor: a blank value is already a boot
 * failure there, so the two spellings cannot differ here. The
 * introspection pair below is the one where they can, and it says why.
 */
const basicCredentials = config.AUTH_BASIC_USER !== undefined
  && config.AUTH_BASIC_PASSWORD !== undefined
  ? { user: config.AUTH_BASIC_USER, password: config.AUTH_BASIC_PASSWORD }
  : null;

/**
 * The bootstrap dependency, as the 0-or-1 element it is spread in as.
 */
const bootstrapDependencies = basicCredentials === null
  ? []
  : [createAuthBootstrapDependency(authStore, authDeps, basicCredentials)];

/**
 * The `auth` block `createService` builds its request middleware from —
 * exactly one of the framework's two forms, or neither.
 *
 * A configured basic strategy takes precedence. The sessions a request
 * presents here were minted here and are one row away, so asking another
 * deployment about them would be a loopback hop to a question this
 * process already answers. `POST /auth/introspect` stays mounted
 * regardless, for the SIBLING service pointing its own
 * `AUTH_INTROSPECT_URL` at us: the two directions are separate and never
 * meet.
 *
 * It is a precedence rather than a merge because the schema refuses a
 * block carrying both forms at parse time — see `lib/express/schema.ts`.
 *
 * @returns The key to spread into the config, or an empty object when
 *   neither form is configured, which is the case that leaves
 *   `requireAuth` and `optionalAuth` as passthroughs.
 */
function resolveAuthConfig(): Pick<ServiceConfig, 'auth'> {
  if (basicCredentials !== null) {
    const verifier = createDbSessionVerifier(authStore, authDeps);
    return { auth: { verifier } };
  }

  // Truthiness, not a presence check, and deliberately unlike the pair
  // above: it keeps a present-but-blank `AUTH_INTROSPECT_URL` meaning
  // what it meant before this strategy existed — nothing configured,
  // rather than an adapter pointed at the empty string that 401s every
  // request forever. The secret has no such third state, since
  // `.min(32)` makes a blank one a boot failure.
  if (!config.AUTH_INTROSPECT_URL || !config.AUTH_INTROSPECT_SECRET) {
    return {};
  }

  return {
    auth: {
      introspectUrl: config.AUTH_INTROSPECT_URL,
      introspectSecret: config.AUTH_INTROSPECT_SECRET,
    },
  };
}

const authConfig = resolveAuthConfig();

await createService({
  serviceId: 'template-service-express',
  port: config.PORT,
  dependencies: [
    dbDep,
    // Behind Postgres deliberately: dependencies start in array order and
    // the upsert needs a live pool. A boot against an unmigrated database
    // therefore fails HERE, on the line naming `auth-bootstrap`, rather
    // than at the first login.
    ...bootstrapDependencies,
    cronDep,
    // Redis is opt-in: no REDIS_URL, no dependency (and no startup probe).
    ...(config.REDIS_URL
      ? [createRedisDependency(config.REDIS_URL)]
      : []),
  ],
  ...authConfig,
  register(app, ctx) {
    app.use('/example', exampleRouter);

    // The session routes ride the same toggle as the verifier: with no
    // credential bootstrapped, a login could only ever be refused.
    if (basicCredentials !== null) {
      app.use('/auth', buildAuthRouter({
        store: authStore,
        clock: authDeps.now,
        ttlSeconds: authDeps.ttlSeconds,
        // Unset leaves POST /auth/introspect mounted and closed rather
        // than absent: the compare is against '', and a well-formed
        // Bearer credential can never be empty, so every caller is
        // refused until a secret is configured.
        introspectSecret: config.AUTH_INTROSPECT_SECRET ?? '',
        logger,
      }));
    }

    // Starter DB-backed route demonstrating the deps map.
    app.get('/users', async (_req, res, next) => {
      try {
        const db = ctx.deps.get(dbDep);
        res.json(await listUsers(db));
      } catch (err) {
        next(err);
      }
    });

    // Protected route example — a no-op passthrough until auth is configured.
    app.get('/me', ctx.requireAuth, (_req, res) => {
      res.json({ ok: true });
    });
  },
});
