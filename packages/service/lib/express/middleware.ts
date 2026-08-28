import type { ResolvedServiceConfig } from './schema';
import type { ServiceLogger } from '../service-core/index.js';
import type { Application } from 'express';

import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import expressRateLimit from 'express-rate-limit';
import helmet from 'helmet';
import pino from 'pino';
import pinoHttp from 'pino-http';

/**
 * Attaches the standard middleware stack to the given Express app.
 *
 * Applied in order:
 * 1. `helmet` — sets secure HTTP headers (12 of them, and unsets `X-Powered-By`)
 * 2. `cors` — configures allowed origins from `config.cors`; denies all cross-origin when omitted
 * 3. `express.json` — parses JSON bodies up to `config.body.limit` (default `'1mb'`)
 * 4. `express.urlencoded` — parses URL-encoded bodies
 * 5. `cookie-parser` — parses Cookie headers
 * 6. `express-rate-limit` — limits requests per window (default 100 req / 60 s)
 * 7. `pino-http` — HTTP request/response logging via a dedicated pino instance
 *
 * Helmet's default header set is pinned name-by-name and value-by-value in
 * `__tests__/middleware.test.ts`. That file is the enumeration; this one
 * deliberately does not carry a second copy of it to drift out of sync.
 *
 * What the helmet 7.2.0 to 8.3.0 bump changed about that set, measured two
 * ways (the pinned test going red, and a direct diff of the two majors'
 * middleware over a recording response): exactly one value. Helmet 8
 * raises the `Strict-Transport-Security` `max-age` from `15552000`
 * (180 days) to `31536000` (365 days). It adds no header, drops none,
 * rewords no other value, still removes `X-Powered-By` rather than setting
 * it, and still leaves `Cross-Origin-Embedder-Policy` off by default.
 *
 * That single value is a longer promise than it looks: a browser that has
 * seen the header refuses plain HTTP to this origin for a year rather than
 * six months, and it keeps refusing for the rest of that year even if the
 * service later shortens the header or stops sending it.
 *
 * @param app - The Express application to configure.
 * @param config - Resolved service configuration.
 * @param logger - The service logger; used to emit a startup trace and available for
 *   future middleware that needs access to the service logger.
 */
export function applyMiddleware(
  app: Application,
  config: ResolvedServiceConfig,
  logger: ServiceLogger,
): void {
  logger.debug({ serviceId: config.serviceId }, 'applying middleware');
  const httpLogger = pino({ name: config.serviceId });
  app.use(helmet());
  app.use(cors(config.cors
    ? { origin: config.cors.origins }
    : { origin: false }));
  app.use(express.json({ limit: config.body?.limit ?? '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(
    expressRateLimit(
      config.rateLimit ?? { max: 100, windowMs: 60_000, standardHeaders: true, legacyHeaders: false },
    ),
  );
  app.use(pinoHttp({ logger: httpLogger }));
}

// The error handler lives in lib/errors (AppError/ZodError-aware) and is
// registered by create-service.ts as the last middleware.
