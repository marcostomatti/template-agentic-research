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
 * - Auth — `requireAuth`/`optionalAuth` come from the framework; without
 *   `AUTH_INTROSPECT_URL` configured they are no-op passthroughs. The dev
 *   introspection stub can be mounted below (see `src/auth/stub.ts`).
 */
import { createService } from '../lib/express/index.js';
import { createLogger } from '../lib/logger/node.js';

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

await createService({
  serviceId: 'template-service-express',
  port: config.PORT,
  dependencies: [
    dbDep,
    cronDep,
    // Redis is opt-in: no REDIS_URL, no dependency (and no startup probe).
    ...(config.REDIS_URL
      ? [createRedisDependency(config.REDIS_URL)]
      : []),
  ],
  // Enable bearer-token auth by configuring both env vars; see src/auth/.
  ...(config.AUTH_INTROSPECT_URL && config.AUTH_INTROSPECT_SECRET
    ? {
      auth: {
        introspectUrl: config.AUTH_INTROSPECT_URL,
        introspectSecret: config.AUTH_INTROSPECT_SECRET,
      },
    }
    : {}),
  register(app, ctx) {
    app.use('/example', exampleRouter);

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
