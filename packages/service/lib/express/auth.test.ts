import type { SessionClaims, SessionVerifier } from './auth';
import type { ServiceLogger } from '../service-core/index.js';
import type { RequestHandler } from 'express';

import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildOptionalAuth,
  buildOptionalAuthFrom,
  buildRequireAuth,
  buildRequireAuthFrom,
  createIntrospectVerifier,
  getSession,
} from './auth';

const INTROSPECT_URL = 'http://auth.test/introspect';
const SECRET = 'chassis-shared-secret';
const logger = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() } as unknown as ServiceLogger;

/** Fake an introspect HTTP response. */
function mockIntrospect(body: unknown, ok = true): void {
  vi.mocked(fetch).mockResolvedValue({ ok, json: async () => body } as Response);
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
  vi.mocked(logger.warn).mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function requireApp(): express.Express {
  const app = express();
  app.use(buildRequireAuth(INTROSPECT_URL, logger, SECRET));
  app.get('/', (_req, res) => res.json({ sub: getSession(res)?.sub ?? null }));
  return app;
}

/** Claims a scripted verifier resolves — deliberately wider than `sub`. */
function seamClaims(): SessionClaims {
  return { sub: 'usr_seam', email: 'seam@b.dev', amr: ['pwd'] };
}

/**
 * A {@link SessionVerifier} answering from a script rather than over a
 * transport, recording every token it was asked about.
 *
 * `answers` is consumed one entry per call, so ONE verifier can answer
 * claims and then null for the SAME token; past the end of the script
 * every further call answers null. That is the arrangement the seam-first
 * cases need twice over. It is what separates a null answer from a builder
 * that refuses everything — the refusal case asks a verifier that has
 * already accepted the same token — and it is the only shape under which a
 * seam consulted per request differs from one read once at construction.
 */
function scriptedVerifier(
  ...answers: readonly (SessionClaims | null)[]
): SessionVerifier & { readonly asked: string[] } {
  const asked: string[] = [];
  return {
    asked,
    verify(token: string): Promise<SessionClaims | null> {
      asked.push(token);
      return Promise.resolve(answers[asked.length - 1] ?? null);
    },
  };
}

/**
 * Mounts `middleware` and echoes whatever {@link getSession} reads, pushing
 * the very object the reader returned onto `seen`.
 *
 * `seen` carries two readings the response body cannot. Its ENTRIES are
 * those objects themselves, so a case asserts identity against what the
 * verifier resolved rather than equality over the JSON copy — the
 * difference between claims passed through and claims rebuilt from the one
 * field the middleware kept. Its LENGTH says how often the guarded route
 * ran at all, which is what says a refused request never reached past the
 * guard.
 */
function appOver(middleware: RequestHandler, seen: (SessionClaims | undefined)[]): express.Express {
  const app = express();
  app.use(middleware);
  app.get('/', (_req, res) => {
    const claims = getSession(res);
    seen.push(claims);
    return res.json({ session: claims ?? null });
  });
  return app;
}

describe('createIntrospectVerifier', () => {
  it('sends the shared secret as a bearer credential on the introspect POST', async () => {
    mockIntrospect({ active: true, sub: 'usr_1' });

    await createIntrospectVerifier(INTROSPECT_URL, logger, SECRET).verify('some-token');

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      INTROSPECT_URL,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${SECRET}` }) as unknown,
      }),
    );
  });

  it('returns null (fails closed) when the introspect endpoint responds 401', async () => {
    mockIntrospect({ error: 'unauthorized' }, false);

    const claims = await createIntrospectVerifier(INTROSPECT_URL, logger, 'wrong-secret').verify('some-token');

    expect(claims).toBeNull();
  });
});

describe('buildRequireAuth', () => {
  it('401s a request with no bearer token, without calling introspect', async () => {
    const res = await request(requireApp()).get('/');
    expect(res.status).toBe(401);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it('attaches claims and continues for an active token', async () => {
    mockIntrospect({ active: true, sub: 'usr_1', email: 'a@b.dev', amr: ['pwd'] });

    const res = await request(requireApp()).get('/')
      .set('Authorization', 'Bearer good');

    expect(res.status).toBe(200);
    expect(res.body.sub).toBe('usr_1');
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(INTROSPECT_URL, expect.objectContaining({ method: 'POST' }));
  });

  it('401s when introspect reports the token inactive', async () => {
    mockIntrospect({ active: false });
    const res = await request(requireApp()).get('/')
      .set('Authorization', 'Bearer stale');
    expect(res.status).toBe(401);
  });

  it('401s (fails closed) and warns when introspect is unreachable', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('ECONNREFUSED'));
    const res = await request(requireApp()).get('/')
      .set('Authorization', 'Bearer good');
    expect(res.status).toBe(401);
    expect(vi.mocked(logger.warn)).toHaveBeenCalled();
  });
});

describe('buildOptionalAuth', () => {
  function optionalApp(): express.Express {
    const app = express();
    app.use(buildOptionalAuth(INTROSPECT_URL, logger, SECRET));
    app.get('/', (_req, res) => res.json({ sub: getSession(res)?.sub ?? null }));
    return app;
  }

  it('continues without claims when no token is present', async () => {
    const res = await request(optionalApp()).get('/');
    expect(res.status).toBe(200);
    expect(res.body.sub).toBeNull();
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it('attaches claims when a valid token is present', async () => {
    mockIntrospect({ active: true, sub: 'usr_9' });
    const res = await request(optionalApp()).get('/')
      .set('Authorization', 'Bearer good');
    expect(res.body.sub).toBe('usr_9');
  });

  it('continues without claims (never 401) for an invalid token', async () => {
    mockIntrospect({ active: false });
    const res = await request(optionalApp()).get('/')
      .set('Authorization', 'Bearer bad');
    expect(res.status).toBe(200);
    expect(res.body.sub).toBeNull();
  });
});

/**
 * The seam-first builder, driven over a scripted {@link SessionVerifier}
 * instead of over `fetch`.
 *
 * Every case above reaches this same middleware through the thin wrapper,
 * so the delegation is already covered and repeating those answers here
 * would only say twice that a wrapper wraps. What is new at this entry
 * point is what an application supplying its own verifier gets, and it is
 * three readings the introspection form cannot give.
 *
 * NO TRANSPORT. `fetch` is stubbed for every case in this file, so the
 * zero is free; what makes it discriminating is the in-band control
 * beside it, the token list the seam recorded. A zero on its own is also
 * what a middleware that answered before reaching any verifier would
 * report, and that is the whole failure this entry point exists to rule
 * out — a resolution falling back to the HTTP adapter puts a per-request
 * hop under a service that verifies its own tokens, with nothing in the
 * response to say so.
 *
 * A NULL ANSWER IS A 401, and the seam is asked per request. The refusal
 * case runs two requests carrying the SAME token through ONE app against
 * ONE verifier, accepted then refused, because a builder that refused
 * everything answers the second request identically. The same pair is the
 * only fixture under which a verifier consulted per call differs from one
 * read once at construction, which for a session seam means every expiry
 * and every revocation answer frozen at boot.
 *
 * THE CLAIMS ARE THE VERIFIER'S OWN OBJECT. `res.locals.auth` is what
 * every route reading {@link getSession} is handed, so the accept case
 * asserts identity against the object the verifier resolved rather than
 * equality over the JSON — a middleware rebuilding `{ sub }` from the one
 * field the framework names would pass every other assertion here.
 * `SessionClaims` refuses nothing on the way (it carries an index
 * signature), so the fixture claims are deliberately wider than `sub` and
 * the wire reading is `toStrictEqual`, which catches a field dropped and
 * a field added alike.
 *
 * The absent-header case is the one that needs the seam to be visible at
 * all: through the introspection form an absent header and a token the
 * endpoint rejected both show zero `fetch` calls, so nothing there
 * separates refusing before the seam from refusing after it declined an
 * empty string.
 *
 * The grid, measured over these five cases and the nine already here,
 * against the whole of `lib/express` (157 cases) so a leg reaching
 * `create-service.test.ts` is reported rather than assumed. Seven of the
 * eight legs are defects an edit to this middleware could produce; the
 * eighth is named as what it is below. Each split held across two full
 * passes.
 *
 * The two claims this entry point adds are pinned narrowly, one leg each.
 * Rebuilding the claims (`res.locals.auth = { ...claims }`) reddens ONE,
 * the accept case, on the identity assertion — every other reading in the
 * file, here and above, survives a copy. Asking the seam for an empty
 * string instead of refusing an absent header reddens TWO, this file's
 * absent-header case on `asked` and the wrapper's on `fetch`, which is the
 * pair that says the same guard is being read two ways.
 *
 * The claims the seam SHARES with the wrapper redden wide, and that is the
 * finding rather than a failure to isolate: never consulting the verifier
 * reddens 5 across three files, and accepting a null answer reddens 5, the
 * whole 401 population of this file. Both say the wrapper and the
 * seam-first form are one middleware, which is what makes the nine cases
 * above evidence about this code path too.
 *
 * On the optional side, rebuilding the claims reddens TWO (both new cases
 * assert identity), attaching a null answer reddens ONE — the case whose
 * `getSession` reading is `undefined` rather than `null`, and no existing
 * case notices, since `getSession(res)?.sub` answers the same for both —
 * and dropping its absent-header guard reddens ONE, the wrapper's own
 * no-token case, which is why there is no fifth seam-first case repeating
 * it.
 *
 * The `fetch` zeros are reddened by no realistic mutation of this module,
 * which is what the `asked` control beside each one is for. Putting a hop
 * back under both seam-first builders — the failure the entry point exists
 * to prevent, though not one an edit here would produce by accident —
 * reddens 9: all five cases below and the four `fetch` assertions above
 * and in `create-service.test.ts`.
 *
 * Two spurious extras appeared, one per pass, both in
 * `lib/express/control/` on a control-token 403 that no mutation of this
 * module can reach. Three further passes of the two legs involved reported
 * 5 and 2. That is the package's known supertest flake, not coupling.
 */
describe('buildRequireAuthFrom', () => {
  it('verifies through the seam, reaching no HTTP transport at all', async () => {
    const claims = seamClaims();
    const verifier = scriptedVerifier(claims);
    const seen: (SessionClaims | undefined)[] = [];
    const app = appOver(buildRequireAuthFrom(verifier, logger), seen);

    const res = await request(app).get('/')
      .set('Authorization', 'Bearer seam-token');

    expect(res.status).toBe(200);
    // The seam WAS consulted, which is what makes the zero below a
    // statement about where the answer came from rather than about a
    // request that never reached a verifier.
    expect(verifier.asked).toEqual(['seam-token']);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
    // getSession hands back the object the verifier resolved — not a copy
    // and not a rebuild off `sub`, so every claim beside it survives.
    expect(seen).toHaveLength(1);
    expect(seen[0]).toBe(claims);
    expect(res.body.session).toStrictEqual({ sub: 'usr_seam', email: 'seam@b.dev', amr: ['pwd'] });
  });

  it('401s when the verifier resolves null for a token it accepted before', async () => {
    const claims = seamClaims();
    const verifier = scriptedVerifier(claims, null);
    const seen: (SessionClaims | undefined)[] = [];
    const app = appOver(buildRequireAuthFrom(verifier, logger), seen);

    const accepted = await request(app).get('/')
      .set('Authorization', 'Bearer seam-token');
    expect(accepted.status).toBe(200);

    const refused = await request(app).get('/')
      .set('Authorization', 'Bearer seam-token');

    expect(refused.status).toBe(401);
    expect(refused.body).toStrictEqual({ error: 'Unauthorized' });
    // Once per request with the same token both times: a verifier read
    // once at construction would answer the first call's claims forever.
    expect(verifier.asked).toEqual(['seam-token', 'seam-token']);
    // The refused request stopped at the guard rather than reaching the
    // route and being answered 401 from somewhere further in.
    expect(seen).toHaveLength(1);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it('401s without consulting the seam when no bearer header is present', async () => {
    const verifier = scriptedVerifier(seamClaims());
    const seen: (SessionClaims | undefined)[] = [];
    const app = appOver(buildRequireAuthFrom(verifier, logger), seen);

    const res = await request(app).get('/');

    expect(res.status).toBe(401);
    // Empty because the guard refused first, not because this verifier
    // never answers — the two cases above ask the same helper and record
    // the token every time.
    expect(verifier.asked).toEqual([]);
    expect(seen).toHaveLength(0);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });
});

/**
 * The optional seam-first builder. The same three readings, with the one
 * asymmetry the pair exists for: a null answer here is not a 401, it is a
 * request that continues carrying no session at all.
 *
 * That negative answer is also the control the accept case above cannot
 * carry on its own. {@link getSession} answering `undefined` for the
 * refused request, from the same reader that answered claims for the
 * accepted one, is what says the reader reports the verifier rather than
 * anything the middleware always produces.
 */
describe('buildOptionalAuthFrom', () => {
  it('attaches the claims the verifier resolved, reaching no HTTP transport', async () => {
    const claims = seamClaims();
    const verifier = scriptedVerifier(claims);
    const seen: (SessionClaims | undefined)[] = [];
    const app = appOver(buildOptionalAuthFrom(verifier, logger), seen);

    const res = await request(app).get('/')
      .set('Authorization', 'Bearer seam-token');

    expect(res.status).toBe(200);
    expect(verifier.asked).toEqual(['seam-token']);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
    expect(seen).toHaveLength(1);
    expect(seen[0]).toBe(claims);
    expect(res.body.session).toStrictEqual({ sub: 'usr_seam', email: 'seam@b.dev', amr: ['pwd'] });
  });

  it('continues with no session at all when the verifier resolves null', async () => {
    const claims = seamClaims();
    const verifier = scriptedVerifier(claims, null);
    const seen: (SessionClaims | undefined)[] = [];
    const app = appOver(buildOptionalAuthFrom(verifier, logger), seen);

    const attached = await request(app).get('/')
      .set('Authorization', 'Bearer seam-token');
    expect(attached.status).toBe(200);
    expect(seen[0]).toBe(claims);

    const bare = await request(app).get('/')
      .set('Authorization', 'Bearer seam-token');

    expect(bare.status).toBe(200);
    // Undefined rather than null or an empty object: the reader's own
    // negative answer, reached through the route the refusal did NOT
    // short-circuit.
    expect(seen).toHaveLength(2);
    expect(seen[1]).toBeUndefined();
    expect(bare.body.session).toBeNull();
    expect(verifier.asked).toEqual(['seam-token', 'seam-token']);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });
});
