/**
 * Integration tests for the control router.
 *
 * These tests mount the control router on a real Express application and drive
 * it through the full HTTP request/response cycle using supertest. Unlike the
 * unit tests in `routes.test.ts`, the stub dependencies here are **stateful**:
 * their `status` field mutates as `stop()` and `start()` are called, letting
 * us verify state transitions across multiple sequential requests.
 */

import type { Dependency } from '../../service-core/index.js';

import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createControlRouter } from './routes';

const SECRET = 'int-secret';

/**
 * Creates a stateful dependency stub whose `status` property reflects live
 * lifecycle transitions: `stop()` sets it to `'stopped'`, `start()` sets it
 * to `'running'`. Both fns are vitest mocks so call assertions work as normal.
 */
function makeStatefulDep(
  name: string,
  initialStatus: Dependency['status'] = 'running',
): Dependency {
  let currentStatus: Dependency['status'] = initialStatus;

  const dep = {
    get name() {
      return name;
    },
    get status() {
      return currentStatus;
    },
    start: vi.fn().mockImplementation(async () => {
      currentStatus = 'running';
    }),
    stop: vi.fn().mockImplementation(async () => {
      currentStatus = 'stopped';
    }),
  };

  return dep as unknown as Dependency;
}

function makeApp(deps: Dependency[], clients: Dependency[] = []) {
  const app = express();
  app.use(
    '/_control',
    createControlRouter(deps, clients, { enabled: true, secret: SECRET }, 'int-service'),
  );
  return app;
}

// ---------------------------------------------------------------------------
// GET /_control/status — full request-response cycle
// ---------------------------------------------------------------------------

describe('GET /_control/status — integration', () => {
  it('returns 200 with JSON Content-Type and a complete payload shape', async () => {
    const db = makeStatefulDep('db', 'running');
    const redis = makeStatefulDep('redis', 'degraded');
    const authClient = makeStatefulDep('auth', 'running');
    const app = makeApp([db, redis], [authClient]);

    const res = await request(app)
      .get('/_control/status')
      .set('x-control-token', SECRET);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toMatchObject({
      serviceId: 'int-service',
      version: expect.stringMatching(/^\d+\.\d+\.\d+/),
      status: 'degraded',
      dependencies: {
        db: { status: 'running' },
        redis: { status: 'degraded' },
      },
      clients: {
        auth: { status: 'running', circuitBreaker: 'closed' },
      },
    });
    expect(typeof res.body.uptime).toBe('number');
    expect(res.body.uptime).toBeGreaterThanOrEqual(0);
  });

  it('reflects live dependency status changes across sequential requests', async () => {
    const db = makeStatefulDep('db', 'running');
    const app = makeApp([db]);

    // first request: dep is running
    const r1 = await request(app)
      .get('/_control/status')
      .set('x-control-token', SECRET);
    expect(r1.body.dependencies.db.status).toBe('running');
    expect(r1.body.status).toBe('running');

    // mutate dep state directly (simulates an external stop)
    await (db as unknown as { stop(): Promise<void> }).stop();

    // second request: dep is now stopped; aggregate still reports 'running'
    // because aggregateStatus only escalates on 'error' or 'degraded'
    const r2 = await request(app)
      .get('/_control/status')
      .set('x-control-token', SECRET);
    expect(r2.body.dependencies.db.status).toBe('stopped');
  });

  it('includes healthDetail from deps that implement it', async () => {
    const dbBase = makeStatefulDep('db', 'running');
    const db = Object.assign(dbBase, {
      healthDetail: vi.fn().mockReturnValue({ pool: { idle: 3, active: 2 } }),
    });
    const app = makeApp([db as unknown as Dependency]);

    const res = await request(app)
      .get('/_control/status')
      .set('x-control-token', SECRET);

    expect(res.status).toBe(200);
    expect(res.body.dependencies.db.detail).toEqual({ pool: { idle: 3, active: 2 } });
  });
});

// ---------------------------------------------------------------------------
// GET /_control/dependencies — full request-response cycle
// ---------------------------------------------------------------------------

describe('GET /_control/dependencies — integration', () => {
  it('returns 200 with an array reflecting live dependency states', async () => {
    const db = makeStatefulDep('db', 'running');
    const redis = makeStatefulDep('redis', 'degraded');
    const app = makeApp([db, redis]);

    const res = await request(app)
      .get('/_control/dependencies')
      .set('x-control-token', SECRET);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual([
      { name: 'db', status: 'running' },
      { name: 'redis', status: 'degraded' },
    ]);
  });

  it('reflects dep state changes across sequential requests', async () => {
    const db = makeStatefulDep('db', 'running');
    const app = makeApp([db]);

    const r1 = await request(app)
      .get('/_control/dependencies')
      .set('x-control-token', SECRET);
    expect(r1.body[0].status).toBe('running');

    await (db as unknown as { stop(): Promise<void> }).stop();

    const r2 = await request(app)
      .get('/_control/dependencies')
      .set('x-control-token', SECRET);
    expect(r2.body[0].status).toBe('stopped');
  });
});

// ---------------------------------------------------------------------------
// POST /_control/dependencies/:name/restart — state transitions
// ---------------------------------------------------------------------------

describe('POST /_control/dependencies/:name/restart — integration', () => {
  it('transitions dep from running → stopped → running on success', async () => {
    const db = makeStatefulDep('db', 'running');
    const app = makeApp([db]);

    // initial state
    const r1 = await request(app)
      .get('/_control/dependencies')
      .set('x-control-token', SECRET);
    expect(r1.body[0].status).toBe('running');

    // restart
    const restart = await request(app)
      .post('/_control/dependencies/db/restart')
      .set('x-control-token', SECRET);
    expect(restart.status).toBe(200);
    expect(restart.body).toEqual({ ok: true });

    // post-restart state: back to running
    const r2 = await request(app)
      .get('/_control/dependencies')
      .set('x-control-token', SECRET);
    expect(r2.body[0].status).toBe('running');
  });

  it('calls stop() before start() during restart', async () => {
    const callOrder: string[] = [];
    const db = makeStatefulDep('db', 'running');
    (db as unknown as { stop: ReturnType<typeof vi.fn> }).stop.mockImplementation(async () => {
      callOrder.push('stop');
    });
    (db as unknown as { start: ReturnType<typeof vi.fn> }).start.mockImplementation(async () => {
      callOrder.push('start');
    });
    const app = makeApp([db]);

    await request(app)
      .post('/_control/dependencies/db/restart')
      .set('x-control-token', SECRET);

    expect(callOrder).toEqual(['stop', 'start']);
  });

  it('leaves dep in stopped state and returns 500 when start() throws', async () => {
    const db = makeStatefulDep('db', 'running');

    // Override start() to throw after stop() already mutated status to 'stopped'
    (db as unknown as { start: ReturnType<typeof vi.fn> }).start.mockImplementation(async () => {
      throw new Error('start failed');
    });

    const app = makeApp([db]);

    // restart fails because start() throws
    const restart = await request(app)
      .post('/_control/dependencies/db/restart')
      .set('x-control-token', SECRET);
    expect(restart.status).toBe(500);
    expect(restart.body).toEqual({ error: 'start failed' });

    // dep is now in 'stopped' state because stop() succeeded but start() failed
    const status = await request(app)
      .get('/_control/dependencies')
      .set('x-control-token', SECRET);
    expect(status.body[0].status).toBe('stopped');

    // re-mock start to succeed and transition status back to running
    (db as unknown as { start: ReturnType<typeof vi.fn> }).start.mockImplementation(async () => {
      Object.defineProperty(db, 'status', { get: () => 'running', configurable: true });
    });

    const recover = await request(app)
      .post('/_control/dependencies/db/restart')
      .set('x-control-token', SECRET);
    expect(recover.status).toBe(200);
  });

  it('does not call start() when stop() throws', async () => {
    const db = makeStatefulDep('db', 'running');
    (db as unknown as { stop: ReturnType<typeof vi.fn> }).stop.mockRejectedValue(
      new Error('stop failed'),
    );
    const app = makeApp([db]);

    const res = await request(app)
      .post('/_control/dependencies/db/restart')
      .set('x-control-token', SECRET);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'stop failed' });
    expect((db as unknown as { start: ReturnType<typeof vi.fn> }).start).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// POST /_control/stop — acknowledgment and shutdown trigger
// ---------------------------------------------------------------------------

describe('POST /_control/stop — integration', () => {
  // Every case in this block builds its router inline rather than through
  // `makeApp`, because `allowStop` is the axis they vary along: the three
  // below opt in, the fourth omits the field entirely, and that difference
  // is the whole subject. Routing the accept half through a helper default
  // would bury half the grid where a reader has to go and look it up — and
  // would silently convert the omitting case the day the helper widens.
  it('responds 200 with { ok: true } before triggering shutdown', async () => {
    const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);
    const app = express();
    app.use(
      '/_control',
      createControlRouter(
        [],
        [],
        { enabled: true, secret: SECRET, allowStop: true },
        'int-service',
      ),
    );

    const res = await request(app)
      .post('/_control/stop')
      .set('x-control-token', SECRET);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({ ok: true });

    // Flush the setImmediate queue so the route's kill call runs while the spy is still active
    await new Promise<void>(resolve => setImmediate(resolve));
    killSpy.mockRestore();
  });

  it('triggers SIGTERM on the current process via setImmediate after responding', async () => {
    const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);
    const app = express();
    app.use(
      '/_control',
      createControlRouter(
        [],
        [],
        { enabled: true, secret: SECRET, allowStop: true },
        'int-service',
      ),
    );

    await request(app)
      .post('/_control/stop')
      .set('x-control-token', SECRET);

    // SIGTERM is emitted inside setImmediate — wait one tick for it to fire
    await new Promise<void>(resolve => setImmediate(resolve));

    expect(killSpy).toHaveBeenCalledWith(process.pid, 'SIGTERM');

    killSpy.mockRestore();
  });

  it('still returns 200 when deps are in a degraded or error state', async () => {
    const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);
    const db = makeStatefulDep('db', 'error');
    const app = express();
    app.use(
      '/_control',
      createControlRouter(
        [db],
        [],
        { enabled: true, secret: SECRET, allowStop: true },
        'int-service',
      ),
    );

    const res = await request(app)
      .post('/_control/stop')
      .set('x-control-token', SECRET);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    // Flush the setImmediate queue so the route's kill call runs while the spy is still active
    await new Promise<void>(resolve => setImmediate(resolve));
    killSpy.mockRestore();
  });

  // The unit-test sibling in `routes.test.ts` drives the same refusal at the
  // handler; this one drives it over the wire, which is the only place the
  // 404 body and its `application/json` Content-Type can be observed as the
  // control router's own answer rather than whatever Express would emit for
  // an unmatched path. Enabled plane, valid token, deps present — nothing
  // but the missing opt-in stands between the request and a shutdown.
  it('returns 404 with a JSON body and never signals when allowStop is omitted', async () => {
    const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);
    const db = makeStatefulDep('db', 'running');
    const app = express();
    app.use(
      '/_control',
      createControlRouter([db], [], { enabled: true, secret: SECRET }, 'int-service'),
    );

    const res = await request(app)
      .post('/_control/stop')
      .set('x-control-token', SECRET);
    // The served route defers its signal by one tick, so give that tick a
    // chance to run before asserting it never came. Measured here, the
    // supertest round-trip already outlasts the deferral and the assertion
    // catches a refuse-but-signal router with or without this line — but
    // that ordering is incidental to the socket, not guaranteed by it, so
    // the wait pins it rather than leaving the case resting on a race.
    await new Promise<void>(resolve => setImmediate(resolve));

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({ error: 'not found' });
    expect(killSpy).not.toHaveBeenCalled();

    // The refusal is the route's own, not a dead router: a sibling control
    // route on the same app still answers 200 with the same token.
    const alive = await request(app)
      .get('/_control/dependencies')
      .set('x-control-token', SECRET);
    expect(alive.status).toBe(200);
    expect(alive.body).toEqual([{ name: 'db', status: 'running' }]);

    killSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// x-control-token — wrong-length refusal across route kinds
// ---------------------------------------------------------------------------

describe('x-control-token — integration', () => {
  const SHORTER = 'int';
  const LONGER = `${SECRET}-and-then-some`;

  /**
   * Issues one request at a read-only control route and one at a mutating
   * one, both carrying `token`, and returns the two responses.
   */
  async function callBothRouteKinds(app: ReturnType<typeof makeApp>, token: string) {
    const readOnly = await request(app)
      .get('/_control/status')
      .set('x-control-token', token);
    const mutating = await request(app)
      .post('/_control/dependencies/db/restart')
      .set('x-control-token', token);
    return { readOnly, mutating };
  }

  // `controlAuth` reduces both sides to a SHA-256 digest before handing
  // them to `timingSafeEqual`, which throws a `RangeError` on operands of
  // unequal length. That is what makes a wrong-LENGTH token worth driving
  // over the wire rather than only at the middleware: a compare over raw
  // tokens throws, and Express turns that throw into a 500, so what an
  // operator reads would be a crash rather than a refusal. The unit
  // sibling in `middleware.test.ts` covers the same token classes, but a
  // throw there surfaces as `Input buffers must have the same byte length`
  // — a test error, never a status.
  //
  // Each case spans both route kinds because the status is only half the
  // refusal: on the mutating route the dependency's `stop()` never running
  // is what says the request was turned away before it could act. The
  // exact secret closing each case is the accept control — without it a
  // router that refused everything would leave both cases green — and it
  // is also what proves the `not.toHaveBeenCalled()` above it can fail.
  it('refuses a token shorter than the secret at both route kinds', async () => {
    expect(SHORTER.length).toBeLessThan(SECRET.length);

    const db = makeStatefulDep('db', 'running');
    const stop = (db as unknown as { stop: ReturnType<typeof vi.fn> }).stop;
    const app = makeApp([db]);

    const refused = await callBothRouteKinds(app, SHORTER);
    expect(refused.readOnly.status).toBe(403);
    expect(refused.readOnly.headers['content-type']).toMatch(/application\/json/);
    expect(refused.readOnly.body).toEqual({ error: 'forbidden' });
    expect(refused.mutating.status).toBe(403);
    expect(refused.mutating.body).toEqual({ error: 'forbidden' });
    expect(stop).not.toHaveBeenCalled();

    const accepted = await callBothRouteKinds(app, SECRET);
    expect(accepted.readOnly.status).toBe(200);
    expect(accepted.mutating.status).toBe(200);
    expect(stop).toHaveBeenCalledTimes(1);
  });

  // The longer token carries the secret as a PREFIX, so a compare that
  // absorbed the length difference by truncating to the secret's length
  // would accept it where the digest refuses it. That leg reddens this
  // case alone, with its shorter sibling still green — which is what says
  // the two are not copies of each other, since nothing accepts a
  // truncated secret by accident.
  it('refuses a token longer than the secret at both route kinds', async () => {
    expect(LONGER.length).toBeGreaterThan(SECRET.length);
    expect(LONGER.startsWith(SECRET)).toBe(true);

    const db = makeStatefulDep('db', 'running');
    const stop = (db as unknown as { stop: ReturnType<typeof vi.fn> }).stop;
    const app = makeApp([db]);

    const refused = await callBothRouteKinds(app, LONGER);
    expect(refused.readOnly.status).toBe(403);
    expect(refused.readOnly.headers['content-type']).toMatch(/application\/json/);
    expect(refused.readOnly.body).toEqual({ error: 'forbidden' });
    expect(refused.mutating.status).toBe(403);
    expect(refused.mutating.body).toEqual({ error: 'forbidden' });
    expect(stop).not.toHaveBeenCalled();

    const accepted = await callBothRouteKinds(app, SECRET);
    expect(accepted.readOnly.status).toBe(200);
    expect(accepted.mutating.status).toBe(200);
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
