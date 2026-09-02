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
 * - The wave-1 HTTP surface — domains, the taxonomy (categories and terms),
 *   personas and operator settings, as five routers each mounted at `/`
 *   behind `ctx.requireAuth`. The paths those routers declare are
 *   root-absolute, so `/domains/:slug/categories` is the string on the wire
 *   and no mount prefix has to be carried in the reader's head. See
 *   `src/domains/`, `src/taxonomy/`, `src/personas/`, `src/settings/` and
 *   `docs/architecture/08-http-api.md`.
 * - The wave-2 HTTP surface — topics, sources with their read-only
 *   failures queue, connectors and export subscriptions, as five more
 *   routers mounted the same way. Two of the four groups do not sit in a
 *   directory named for the path they answer under: `src/sources/` also
 *   holds the source ADAPTER contract, and the export subscriptions
 *   answer under `/exports` from `src/subscriptions/` because
 *   `src/exports/` is the renderer registry. Two of those five routers
 *   take a clock beside the store, for the schedule verbs that write
 *   `next_run_at`. See `src/topics/`, `src/sources/`, `src/connectors/`,
 *   `src/subscriptions/` and the same doc.
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
import { createDbConnectorStore } from './connectors/db-store.js';
import { buildConnectorsRouter } from './connectors/routes.js';
import { createCronDependency } from './cron/index.js';
import { createDbDependency } from './db/index.js';
import { listUsers } from './db/users.js';
import { buildDomainsRouter, createDbDomainStore } from './domains/index.js';
import {
  registerEmailChannel,
  registerPushChannel,
  registerWebhookChannel,
} from './notifications/index.js';
import { createDbPersonaStore } from './personas/db-store.js';
import { buildPersonasRouter } from './personas/routes.js';
import { createRedisDependency } from './redis/index.js';
import { exampleRouter } from './routes/example.js';
import { createDbSettingsStore } from './settings/db-store.js';
import { buildSettingsRouter } from './settings/routes.js';
import { createDbSourceStore } from './sources/db-store.js';
import { buildSourceFailuresRouter } from './sources/failures-routes.js';
import { buildSourcesRouter } from './sources/routes.js';
import { createDbSubscriptionStore } from './subscriptions/db-store.js';
import { buildSubscriptionsRouter } from './subscriptions/routes.js';
import { buildCategoriesRouter } from './taxonomy/categories-routes.js';
import { createDbTaxonomyStore } from './taxonomy/db-store.js';
import { buildTermsRouter } from './taxonomy/terms-routes.js';
import { createDbTopicStore } from './topics/db-store.js';
import { buildTopicsRouter } from './topics/routes.js';

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
 * The resource stores, over the same thunk and for the same reason the
 * auth store above takes one.
 *
 * `() => dbDep.client` rather than a resolved client: every
 * `createDb*Store` here opens nothing at construction and resolves the
 * client per call, so every store on this page is legal to build before
 * the Postgres dependency has started. What this wiring owes is only that
 * no CALLER arrives first, and every route gets that from `register`
 * running after the dependency array.
 *
 * One constructor per resource group rather than one for all of them,
 * because each group is its own PORT over one database — see
 * `src/domains/store.ts` and its siblings. None of them holds state, so
 * building them separately costs nothing.
 *
 * The wave-2 four sit below the wave-1 four, in the order their routers
 * mount. There is no ninth: `createDbSourceStore` serves BOTH source
 * routers, the failures queue being a `Pick` of that same port rather
 * than a port of its own.
 */
const domainStore = createDbDomainStore(() => dbDep.client);
const taxonomyStore = createDbTaxonomyStore(() => dbDep.client);
const personaStore = createDbPersonaStore(() => dbDep.client);
const settingsStore = createDbSettingsStore(() => dbDep.client);
const topicStore = createDbTopicStore(() => dbDep.client);
const sourceStore = createDbSourceStore(() => dbDep.client);
const connectorStore = createDbConnectorStore(() => dbDep.client);
const subscriptionStore = createDbSubscriptionStore(() => dbDep.client);

/**
 * The eight ports as one object, which is what most of the routers below
 * need.
 *
 * `CategoryServiceStore`, `PersonaServiceStore`, `SettingsServiceStore`,
 * `TopicServiceStore` and `SourceServiceStore` each intersect a `Pick` of
 * `DomainStore` with a `Pick` of their own port, because a route addressed
 * by `:slug` resolves the domain before it does anything else — and
 * `SubscriptionServiceStore` intersects THREE, a subscription naming a
 * connector as well as a domain. So a router spanning more than one port
 * needs one object carrying them all, and a spread is what builds it: no
 * two of the eight ports declare a method under the same name, so no
 * member of one shadows a member of another.
 *
 * ONE composition rather than six, handed to every router including the
 * four that reach a single port. Each router's own `store` type is what
 * narrows it to the methods that router may reach, and a type is a stronger
 * statement than the shape of the argument — it is checked rather than
 * conventional. `tests/helpers/memory-research-store.ts` is the same shape
 * from the other side: one implementation behind all eight ports, which is
 * what lets the suite drive every router here with no database up.
 */
const researchStore = {
  ...domainStore,
  ...taxonomyStore,
  ...personaStore,
  ...settingsStore,
  ...topicStore,
  ...sourceStore,
  ...connectorStore,
  ...subscriptionStore,
};

/**
 * The present, for the two routers below whose schedule verbs write
 * `next_run_at`.
 *
 * A thunk and not an instant: a router is built once, at boot, and then
 * answers for the life of the process, so a captured `Date` would freeze
 * every due time it ever writes at the moment of wiring. The session clock
 * below is a thunk for the same reason.
 *
 * ONE const rather than an inline `() => new Date()` at each of the two
 * mounts, because the two verbs answer the same present and a reader
 * should not have to compare two expressions to know it. It is not a
 * default being supplied: `TopicsRouterOptions.clock` and
 * `SubscriptionsRouterOptions.clock` are both REQUIRED, which is those
 * types refusing to let a caller mount a schedule verb without saying
 * which present it answers against. This is that call site.
 */
const clock = () => new Date();

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

    // The wave-1 HTTP surface. The guard sits on the MOUNT rather than on
    // each handler, per `docs/architecture/08-http-api.md`: a route added
    // to one of these routers later inherits it without anyone remembering
    // to attach it.
    //
    // LAST in `register`, and the position is load-bearing. Each mount is
    // at `/` with no path of its own, so its `ctx.requireAuth` runs for
    // every request that REACHES it and not only for the ones its router
    // matches. Measured against a service carrying an auth block: from
    // here, `/example`, `/auth/*`, `/users` and `/me` answer exactly as
    // they did, because all four are mounted above; a credentialled
    // request runs the guard once per mount it falls through, so the
    // LAST router below runs it once for every router above it too; and
    // an unmatched path answers `401` rather than `404` to a caller with
    // no credential, which is the one answer on this service these
    // mounts change outside their own prefixes.
    app.use(ctx.requireAuth, buildDomainsRouter({ store: researchStore }));
    app.use(ctx.requireAuth, buildCategoriesRouter({ store: researchStore }));
    app.use(ctx.requireAuth, buildTermsRouter({ store: researchStore }));
    app.use(ctx.requireAuth, buildPersonasRouter({ store: researchStore }));
    app.use(ctx.requireAuth, buildSettingsRouter({ store: researchStore }));

    // The wave-2 HTTP surface, below the wave-1 mounts and guarded the
    // same way. Order among the five is presentational only: every path
    // these routers declare is distinct, and `/sources/:id/failures` is
    // a longer pattern than anything the sources router registers, so no
    // mount can shadow another whichever way round they sit.
    //
    // Two take a clock as well as the store. That is the whole of what
    // separates them here: `POST /topics/:id/run-now`, `/topics/:id/pause`
    // and `POST /exports/:id/run-now` are the only routes on this service
    // that write a due time, and the instant they write is read from the
    // thunk above rather than from a `Date` this file captured at boot.
    app.use(ctx.requireAuth, buildTopicsRouter({
      store: researchStore,
      clock,
    }));
    app.use(ctx.requireAuth, buildSourcesRouter({ store: researchStore }));
    app.use(
      ctx.requireAuth,
      buildSourceFailuresRouter({ store: researchStore }),
    );
    app.use(ctx.requireAuth, buildConnectorsRouter({ store: researchStore }));
    app.use(ctx.requireAuth, buildSubscriptionsRouter({
      store: researchStore,
      clock,
    }));
  },
});
