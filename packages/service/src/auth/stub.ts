/**
 * @packageDocumentation
 * Auth backend — STUB.
 *
 * The framework's `requireAuth`/`optionalAuth` middleware (lib/express/auth)
 * are fully wired for bearer tokens: they forward the caller's token to an
 * RFC 7662 `POST /introspect` endpoint and attach the returned claims to
 * `res.locals.auth`. What this template does NOT ship yet is the backend
 * that serves that endpoint.
 *
 * This stub router closes the loop for local development only: it accepts
 * exactly one token, `AUTH_STUB_USER_TOKEN`, and introspects it as an
 * `{ active: true, sub: 'dev-user' }` session. Point `AUTH_INTROSPECT_URL`
 * at the service's own `/auth/introspect` to exercise protected routes
 * end-to-end without a real identity provider.
 *
 * It refuses to run outside development. The real replacement — a basic
 * authentication strategy where a user/password pair defined in `.env`
 * yields a token backed by the database — is specced in
 * `specs/auth-basic-strategy.md`.
 */
import type { Router as RouterType } from 'express';

import { Router } from 'express';

export interface AuthStubOptions {
  /** Service-to-service secret callers must present (`Authorization: Bearer <secret>`). */
  introspectSecret: string;
  /** The single end-user token the stub accepts. */
  userToken: string;
}

/**
 * Builds the development-only introspection stub router.
 *
 * @param options - Shared secret and the accepted dev token.
 * @returns An Express router exposing `POST /introspect`.
 * @throws {Error} When mounted with `NODE_ENV=production`.
 */
export function buildAuthStubRouter(options: AuthStubOptions): RouterType {
  if (process.env['NODE_ENV'] === 'production') {
    throw new Error('[auth-stub] the introspection stub must never run in production');
  }

  const router = Router();

  router.post('/introspect', (req, res) => {
    const header = req.headers.authorization ?? '';
    if (header !== `Bearer ${options.introspectSecret}`) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { token } = (req.body ?? {}) as { token?: string };
    if (token === options.userToken) {
      res.json({ active: true, sub: 'dev-user' });
      return;
    }
    res.json({ active: false });
  });

  return router;
}
