/**
 * @packageDocumentation
 * The HTTP surface over `src/auth/service.ts`: three routes, and
 * nothing in them that decides anything.
 *
 * `POST /login` is {@link issueSession}, `POST /logout` is
 * {@link revokeSession}, `POST /introspect` is
 * {@link verifySession}. What a handler adds over the call it wraps
 * is a body to parse, a status to choose and a shape to write — so a
 * change to a session RULE belongs one file over, and the cases that
 * pin those rules still need no server.
 *
 * WHY THIS SERVICE SERVES AN INTROSPECTION ENDPOINT AT ALL, when it
 * verifies its own tokens in-process through the `SessionVerifier`
 * seam and never calls this route itself: the endpoint is for a
 * SIBLING service. Point another deployment's `AUTH_INTROSPECT_URL`
 * here and `createIntrospectVerifier` in `lib/express/auth.ts`
 * becomes its client, which is why the response shape below is that
 * function's input rather than anything this package invented. The
 * two paths are deliberate and they do not meet: no request served
 * by this service takes the loopback HTTP hop that pointing its own
 * verifier here would cost.
 *
 * THE LOGIN ROUTE ANSWERS ONE FLAT `401` FOR EVERY REFUSAL, a
 * malformed body included, and that is the one place a route here
 * departs from the package's ordinary shape. Letting the parse
 * failure through would reach the `errorHandler` `createService`
 * registers last, which answers a `ZodError` with `422` and a
 * `details` array naming which submitted field was wrong. Three
 * things are wrong with that on this route in particular. The
 * status alone tells an unauthenticated caller that the SHAPE was
 * the problem, which is a probe signal on the one endpoint whose
 * refusals are uniform on purpose. The per-field account is
 * strictly more than a refused login has any business disclosing.
 * And the wording of each issue is zod's rather than this repo's —
 * `lib/errors/handler.ts` copies `issue.message` verbatim, and its
 * own docblock records the zod 3-to-4 bump rewording one of them
 * with no diff in this package — so it is text built from a body
 * this route must not echo, on terms no gate here controls. At zod
 * 4.5.1 no message for this schema carries the submitted value
 * (measured over eight malformed bodies, including a password field
 * holding an object and one holding an array); the containment is
 * against the version that changes its mind, not against a leak
 * that exists today.
 *
 * The other two routes keep the ordinary split, because they carry
 * no credential the answer could disclose: a body that is not a
 * `{ token }` object is a `400`, and a `token` that turns out to
 * name nothing is the same success a live token gets. RFC 7009 §2.2
 * asks for exactly that on a revocation endpoint, and it is the
 * same reasoning {@link revokeSession} already gives for collapsing
 * its own two false answers — a client that can tell an unknown
 * token from a real one has been handed an oracle.
 *
 * LOGIN IS ALSO THE ONE ROUTE HERE THAT RATE-LIMITS ITSELF, on top
 * of the app-wide limiter `applyMiddleware` installs. Uniform
 * refusals are the whole design above, and a refusal that costs the
 * caller nothing is an invitation to make a great many of them —
 * the flat `401` is what makes guessing uninformative, and the
 * budget below is what makes it slow. The other two routes take the
 * global limiter alone: neither accepts a credential, and neither
 * can be made to answer differently by being asked more often.
 *
 * NOTHING BUILT FROM A REQUEST BODY REACHES A LOG LINE HERE. The
 * two refusal paths that log at all log a fixed message and a fixed
 * route name, so a login attempt carrying a password in an
 * unexpected field has nowhere to put it. That rule is worth more
 * than it looks: `pino-http` already records every request, so a
 * line added here buys an operator an alertable `warn` and nothing
 * else, and it is not worth a credential to have one.
 *
 * No body parsing is set up here. `applyMiddleware` installs
 * `express.json()` on the app before any router is mounted, so
 * `req.body` is already a parsed value — or `undefined` for a
 * request that sent no body, which the schemas below refuse like
 * any other bad shape.
 */
import type { AuthDeps } from './service.js';
import type { AuthStore } from './store.js';
import type { Logger } from '../../lib/logger/node.js';
import type { Router as RouterType } from 'express';

import { Router } from 'express';
import expressRateLimit from 'express-rate-limit';
import { z } from 'zod';

import { matchesIntrospectSecret } from './introspect-secret.js';
import { issueSession, revokeSession, verifySession } from './service.js';

/**
 * How many `POST /login` attempts one caller gets per window.
 *
 * Stricter than the limiter `applyMiddleware` installs across the
 * whole app on BOTH axes rather than one: ten attempts where that
 * one allows a hundred, over the fifteen minutes named below where
 * it counts a minute. Either axis alone would be arguable, and a
 * shorter window with a smaller count can be the more permissive of
 * two limits; moving both leaves no reading in which this route is
 * the looser one.
 *
 * Ten in fifteen minutes is roomy for the one operator whose
 * credential this is — a mistyped password costs one of them, and
 * there is no lockout to sit out once the window rolls — and no
 * brute-force budget at all against an argon2id hash.
 */
const LOGIN_ATTEMPT_LIMIT = 10;

/**
 * How long that budget takes to refill, in milliseconds.
 *
 * express-rate-limit counts in fixed windows rather than sliding
 * ones, so this is also the longest a caller that spent its budget
 * on the first request of a window waits. Why fifteen minutes and
 * not some other span is on {@link LOGIN_ATTEMPT_LIMIT}: the two
 * numbers are one choice and neither reads as anything alone.
 */
const LOGIN_ATTEMPT_WINDOW_MS = 900_000;

/**
 * What `POST /login` accepts.
 *
 * `user` and not `username`, matching {@link issueSession}'s
 * credential shape and the variable `AUTH_BASIC_USER` names. Both
 * fields carry a `min(1)` so an empty string is refused here rather
 * than reaching an argon2 verify that would refuse it anyway — the
 * answer is identical, and the parse is the cheaper of the two.
 */
const loginBodySchema = z.object({
  user: z.string().min(1),
  password: z.string().min(1),
});

/**
 * What `POST /logout` and `POST /introspect` accept.
 *
 * One schema for both because both take exactly the same thing: an
 * opaque bearer token as issued, unreduced. `token` is the field
 * name RFC 7662 §2.1 and RFC 7009 §2.1 both give it, and it is what
 * `createIntrospectVerifier` sends.
 */
const tokenBodySchema = z.object({
  token: z.string().min(1),
});

/**
 * Everything {@link buildAuthRouter} needs.
 *
 * A single options object rather than a parameter list, because
 * five positional arguments of which two are strings is a call site
 * nobody can read — and `src/index.ts` is the only one there will
 * ever be.
 */
export interface AuthRouterOptions {
  /**
   * Where credentials are read and sessions are written. The port,
   * not the drizzle implementation: this router is drivable against
   * the in-memory store with no database up.
   */
  readonly store: AuthStore;

  /**
   * Reads the present, for the expiry arithmetic and the expiry
   * comparison that happen below the routes.
   *
   * Named `clock` here and {@link AuthDeps.now} one level down: at
   * this level it is the dependency being supplied, and at that one
   * it is the reading being taken. A thunk for the reason given on
   * {@link AuthDeps} — a router built once at boot must not close
   * over the instant it was built at.
   */
  readonly clock: () => Date;

  /**
   * How long a session minted by `POST /login` lives, in seconds.
   * From `AUTH_SESSION_TTL_SECONDS`.
   */
  readonly ttlSeconds: number;

  /**
   * The `AUTH_INTROSPECT_SECRET` a caller must present to reach
   * `POST /introspect`. Not an end user's session token; see
   * {@link matchesIntrospectSecret}.
   */
  readonly introspectSecret: string;

  /**
   * Where a refusal is recorded. Reached with fixed strings only —
   * see the rule about request bodies above.
   */
  readonly logger: Logger;
}

/**
 * Builds the authentication router.
 *
 * @param options - The store to act against, the clock and TTL the
 *   session rules are applied with, the introspection secret and a
 *   logger. See {@link AuthRouterOptions}.
 * @returns A configured Express `Router`, to be mounted at `/auth`
 *   by the host application.
 *
 * @remarks
 * **Endpoints** — listed router-relative, so at the `/auth` mount
 * the wire paths are `/auth/login` and so on:
 *
 * - `POST /login` — exchanges `{ user, password }` for a session.
 *   `200` with `{ token, sub, expiresAt }`; `401` with
 *   `{ error: 'Unauthorized' }` for a malformed body, an unknown
 *   login name and a wrong password alike; `429` with
 *   `{ error: 'Too Many Requests' }` once a caller has spent its
 *   attempt budget, ahead of both the parse and the store. It is
 *   the only route here that carries a limiter of its own.
 * - `POST /logout` — revokes the session named by `{ token }`.
 *   `200` with `{ ok: true }` whether or not the token named a live
 *   session; `400` with `{ error: 'Bad Request' }` when the body is
 *   not a `{ token }` object.
 * - `POST /introspect` — answers RFC 7662 introspection for
 *   `{ token }`, guarded by the service-to-service secret. `401`
 *   with `{ error: 'Unauthorized' }` before any read when the
 *   `Authorization` header does not carry it; `400` for a malformed
 *   body; otherwise `200` with `{ active: true, sub }` for a live
 *   session and `{ active: false }` for anything else.
 *
 * Every route is a `POST`, including the two that only ask a
 * question. A token in a query string reaches the access log of
 * every proxy on the way, and RFC 7662 §2.1 requires the form
 * anyway.
 */
export function buildAuthRouter(options: AuthRouterOptions): RouterType {
  const router = Router();
  const deps: AuthDeps = {
    now: options.clock,
    ttlSeconds: options.ttlSeconds,
  };

  /**
   * The attempt budget in front of `POST /login`, and the only
   * limiter any route here carries of its own.
   *
   * Built per router rather than once at module scope, because
   * express-rate-limit's default store is a `Map` living on the
   * middleware instance. One at module scope would give every
   * router this factory ever builds a SHARED window, which in the
   * suite makes a case's remaining budget a function of how many
   * cases ran before it. Per router, a fresh router is a fresh
   * window — and the deployment builds exactly one.
   *
   * That same per-instance store is the caveat worth stating for a
   * deployment: the count is per PROCESS, so N replicas behind one
   * load balancer offer an attacker N times the budget below. Fixing
   * that means a shared store (Redis) and is a change to make when
   * this service is first replicated, not before.
   *
   * NO `keyGenerator` IS PASSED, and that omission is the part of
   * this call doing the most work. v8's default masks an IPv6 address
   * down to its /56 network before keying, so two addresses out of
   * one allocation share a window rather than earning two apiece;
   * v7 keyed on the exact `req.ip` and did not. Any custom generator
   * opts back out of that, and the library's own guard against doing
   * so by accident is a substring check for `req.ip` in the
   * function's SOURCE TEXT — read the address any other way and the
   * opt-out is silent. `lib/express/middleware.ts` takes the default
   * for the same reason and records the measurement behind it.
   *
   * The two header settings restate the global limiter's rather than
   * taking the library's own defaults, which are the other way round
   * (`legacyHeaders: true`, `standardHeaders: false`). BOTH limiters
   * run on this route, and each header goes to whichever middleware
   * set it last. Taking the defaults would therefore leave a
   * response carrying draft-6 `RateLimit-*` naming the global limit
   * of 100 beside legacy `X-RateLimit-*` naming this one of 10 — two
   * contradictory answers to one question. Named alike, this limiter
   * simply overwrites all four values with its own, which is the
   * honest reading: the tighter limit is the one that binds.
   * Measured on the first request to a fresh router behind the
   * global limiter, `ratelimit-limit` is `10` and never `100`.
   *
   * `message` is an object rather than the default string `Too many
   * requests, please try again later.`, which `res.send` writes as
   * `text/plain` — an empty body to a client parsing the `{ error }`
   * envelope every other refusal on this router answers with.
   *
   * `limit` and not `max`: they are one setting under two names, and
   * `max` has been the deprecated spelling since v7. The global
   * literal predates that rename; copying its wording here would
   * spread it.
   */
  const loginRateLimit = expressRateLimit({
    limit: LOGIN_ATTEMPT_LIMIT,
    windowMs: LOGIN_ATTEMPT_WINDOW_MS,
    standardHeaders: 'draft-6',
    legacyHeaders: false,
    message: { error: 'Too Many Requests' },
  });

  /**
   * POST /auth/login
   *
   * Exchanges a credential for a session token.
   *
   * **Side effects:** writes one `auth_sessions` row on success.
   *
   * The refusal is written out twice rather than shared, because
   * the two paths are reached differently and only their ANSWER is
   * meant to be identical — including the log line, so an operator
   * reading the logs cannot separate a malformed body from a wrong
   * password either.
   *
   * `expiresAt` goes out as an ISO-8601 string rather than as the
   * `Date` it is. `res.json` would serialise it to the same
   * characters, so this pins the wire shape rather than changing
   * it: the value a client parses stops depending on how Express
   * happens to serialise a `Date`.
   *
   * {@link loginRateLimit} runs ahead of everything below, so a
   * caller past its budget is answered without the body being
   * parsed and without the store being touched. That ordering is
   * the point of a limiter on this route in particular: the work an
   * attempt costs this service is an argon2id verify, which is
   * deliberately expensive, so an unbudgeted `/login` is a way to
   * spend the service's CPU as well as a way to guess a password.
   *
   * - `429` with `{ error: 'Too Many Requests' }` once the caller
   *   has spent its attempts for the window, whatever the body was.
   * - `401` with `{ error: 'Unauthorized' }` for a body that is not
   *   `{ user, password }`, a login name matching no row, and a
   *   password that does not verify.
   * - `200` with `{ token, sub, expiresAt }` otherwise.
   */
  router.post('/login', loginRateLimit, async (req, res) => {
    const parsed = loginBodySchema.safeParse(req.body);

    if (!parsed.success) {
      options.logger.warn({ route: 'login' }, 'authentication refused');
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const session = await issueSession(options.store, deps, parsed.data);

    if (session === null) {
      options.logger.warn({ route: 'login' }, 'authentication refused');
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    res.status(200).json({
      token: session.token,
      sub: session.sub,
      expiresAt: session.expiresAt.toISOString(),
    });
  });

  /**
   * POST /auth/logout
   *
   * Revokes the session a token names.
   *
   * **Side effects:** stamps `auth_sessions.revoked_at` when the
   * token names a session that was not already revoked.
   *
   * {@link revokeSession}'s boolean answer is deliberately dropped.
   * It separates "this call revoked it" from "there was nothing to
   * revoke", and putting that difference on the wire would let an
   * unauthenticated client ask whether a token it holds was ever
   * real. RFC 7009 §2.2 asks for the same `200` on an invalid
   * token for the same reason.
   *
   * The `400` is not a hole in that: it says the request had no
   * `token` field, which is a fact about the request the sender
   * already has, and it is reached before the store is.
   *
   * - `400` with `{ error: 'Bad Request' }` when the body is not a
   *   `{ token }` object.
   * - `200` with `{ ok: true }` otherwise, whatever the token
   *   turned out to name.
   */
  router.post('/logout', async (req, res) => {
    const parsed = tokenBodySchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: 'Bad Request' });
      return;
    }

    await revokeSession(options.store, deps, parsed.data.token);
    res.status(200).json({ ok: true });
  });

  /**
   * POST /auth/introspect
   *
   * Answers RFC 7662 token introspection for a sibling service.
   *
   * The secret check is first and it is the whole reason this route
   * can exist: the response discloses a session's claims, which RFC
   * 7662 §2.1 is explicit must not be readable by whoever asks. A
   * refusal answers before the body is even parsed, so a caller
   * without the secret learns nothing about which tokens are live
   * and costs this service no database read.
   *
   * The success shapes are `createIntrospectVerifier`'s input
   * rather than a choice made here. It requires `active === true`
   * and a string `sub`, drops `active` and hands the rest on as
   * claims — so the `{ active: true, sub }` below is exactly the
   * claims a client of this endpoint ends up with, and an extra key
   * added here would silently become a claim.
   *
   * Expired, revoked and unknown are one answer, which is
   * {@link verifySession}'s null and not a decision taken here.
   *
   * - `401` with `{ error: 'Unauthorized' }`, before any read, when
   *   the `Authorization` header does not carry the configured
   *   secret.
   * - `400` with `{ error: 'Bad Request' }` when the body is not a
   *   `{ token }` object.
   * - `200` with `{ active: true, sub }` for a live session.
   * - `200` with `{ active: false }` for a token that names no live
   *   session.
   */
  router.post('/introspect', async (req, res) => {
    const authorized = matchesIntrospectSecret(
      req.headers.authorization,
      options.introspectSecret,
    );

    if (!authorized) {
      options.logger.warn({ route: 'introspect' }, 'introspection refused');
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parsed = tokenBodySchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: 'Bad Request' });
      return;
    }

    const token = parsed.data.token;
    const session = await verifySession(options.store, deps, token);

    if (session === null) {
      res.status(200).json({ active: false });
      return;
    }

    res.status(200).json({ active: true, sub: session.sub });
  });

  return router;
}
