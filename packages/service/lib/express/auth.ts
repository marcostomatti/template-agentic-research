import type { ServiceLogger } from '../service-core/index.js';
import type { Request, RequestHandler, Response } from 'express';

/** Middleware that unconditionally calls `next()` — used as a no-op passthrough. */
export const passthroughMiddleware: RequestHandler = (_req, _res, next) => next();

/**
 * Claims a session verifier resolves from a bearer token. Intentionally open —
 * the chassis doesn't own the auth service's exact claim shape; it only relies
 * on `sub` being present. Attached to `res.locals.auth` after `requireAuth`.
 */
export interface SessionClaims {
  sub: string;
  [key: string]: unknown;
}

/**
 * Pluggable token → claims verifier — the **key-resolver seam**. The HTTP
 * `/introspect` adapter below is the one the chassis ships. An application that
 * verifies its own tokens — from a session store it owns, or offline against
 * RS256/JWKS selecting the signing key by `kid` — supplies its own verifier
 * instead and reaches the same middleware through {@link buildRequireAuthFrom}
 * and {@link buildOptionalAuthFrom}, with no HTTP hop per request. That is the
 * graduation path off central per-request introspection (see the auth
 * architecture direction): shape the seam around "verify a token", never around
 * "a shared secret".
 */
export interface SessionVerifier {
  verify(token: string): Promise<SessionClaims | null>;
}

/** Read the verified session attached by {@link buildRequireAuth}, if any. */
export function getSession(res: Response): SessionClaims | undefined {
  return res.locals['auth'] as SessionClaims | undefined;
}

const BEARER = /^Bearer (.+)$/i;

function extractBearer(req: Request): string | null {
  const match = BEARER.exec(req.headers.authorization ?? '');
  const token = match?.[1]?.trim();
  return token == null || token === ''
    ? null
    : token;
}

/**
 * A {@link SessionVerifier} that validates a bearer token by calling the auth
 * service's `POST /introspect` (RFC 7662-shaped: `{ active, ...claims }`). This
 * is the first adapter behind the seam; the JWKS/offline adapter is the swap.
 *
 * `secret` is sent as `Authorization: Bearer <secret>` on every introspect
 * call — it authorizes *this service* to query introspect, since the endpoint
 * discloses full session claims (RFC 7662 §2.1 requires the endpoint be
 * protected). It is distinct from the end-user's session token.
 */
export function createIntrospectVerifier(introspectUrl: string, logger: ServiceLogger, secret: string): SessionVerifier {
  return {
    async verify(token: string): Promise<SessionClaims | null> {
      try {
        const res = await fetch(introspectUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${secret}`,
          },
          body: JSON.stringify({ token }),
        });
        if (!res.ok) return null;

        const body = (await res.json()) as { active?: unknown; sub?: unknown } & Record<string, unknown>;
        if (body.active !== true || typeof body.sub !== 'string') return null;

        // Return the claims without the RFC 7662 `active` status flag (copy, then
        // drop the key — no input mutation, no throwaway binding).
        const claims: SessionClaims = { ...body, sub: body.sub };
        Reflect.deleteProperty(claims, 'active');
        return claims;
      } catch (err) {
        logger.warn({ err }, 'session introspection failed');
        return null;
      }
    },
  };
}

/**
 * Builds middleware that requires a valid session over an already-constructed
 * {@link SessionVerifier}. Extracts the bearer token, verifies it through the
 * seam, and either attaches the claims to `res.locals.auth` and continues, or
 * responds `401`. An absent or empty bearer header never reaches the verifier.
 *
 * This is the verifier-first form, and it is the one an application supplying
 * its own adapter calls: it takes the seam rather than an introspection URL
 * and a shared secret, neither of which a service verifying its own tokens
 * has anything to put in.
 *
 * `logger` covers the one failure the seam itself does not own — a verifier
 * that THROWS rather than resolving null. {@link createIntrospectVerifier}
 * catches its own transport errors and answers null, so that path is
 * unreachable through {@link buildRequireAuth}; a verifier reading a database
 * is not. The request still travels on to the shared error handler; the
 * warning is the only line naming auth as the origin.
 */
export function buildRequireAuthFrom(verifier: SessionVerifier, logger: ServiceLogger): RequestHandler {
  return async (req, res, next) => {
    try {
      const token = extractBearer(req);
      const claims = token == null
        ? null
        : await verifier.verify(token);
      if (claims == null) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      res.locals['auth'] = claims;
      next();
    } catch (err) {
      logger.warn({ err }, 'session verifier threw');
      next(err);
    }
  };
}

/**
 * Builds middleware that optionally validates a session over an
 * already-constructed {@link SessionVerifier}: attaches `res.locals.auth` when
 * a valid token is present, but never rejects an unauthenticated (or
 * invalid-token) request. The verifier-first counterpart of
 * {@link buildOptionalAuth}; `logger` has the job it has in
 * {@link buildRequireAuthFrom}.
 */
export function buildOptionalAuthFrom(verifier: SessionVerifier, logger: ServiceLogger): RequestHandler {
  return async (req, res, next) => {
    try {
      const token = extractBearer(req);
      if (token != null) {
        const claims = await verifier.verify(token);
        if (claims != null) res.locals['auth'] = claims;
      }
      next();
    } catch (err) {
      logger.warn({ err }, 'session verifier threw');
      next(err);
    }
  };
}

/**
 * Builds middleware that requires a valid session, verified over the auth
 * service's HTTP introspection endpoint. A thin wrapper: it constructs
 * {@link createIntrospectVerifier} and delegates to
 * {@link buildRequireAuthFrom}, which is where the middleware itself lives.
 * The signature is unchanged from before the seam-first form existed, so
 * every call site through `resolved.auth.introspectUrl` still reads the same.
 */
export function buildRequireAuth(introspectUrl: string, logger: ServiceLogger, secret: string): RequestHandler {
  return buildRequireAuthFrom(createIntrospectVerifier(introspectUrl, logger, secret), logger);
}

/**
 * Builds middleware that optionally validates a session, verified over the
 * auth service's HTTP introspection endpoint. The same thin wrapper as
 * {@link buildRequireAuth}, over {@link buildOptionalAuthFrom}.
 */
export function buildOptionalAuth(introspectUrl: string, logger: ServiceLogger, secret: string): RequestHandler {
  return buildOptionalAuthFrom(createIntrospectVerifier(introspectUrl, logger, secret), logger);
}
