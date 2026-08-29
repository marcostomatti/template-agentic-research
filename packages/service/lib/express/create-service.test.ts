import type { ServiceContext , ServiceHandle } from './types';

import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NotFoundError } from '../errors/index.js';
import { createDependency } from '../service-core/index.js';

import { passthroughMiddleware } from './auth';
import { createService } from './create-service';

// Tests run in test mode — no process.exit, ephemeral port
process.env.NODE_ENV = 'test';

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

describe('createService — startup', () => {
  let handle: ServiceHandle | undefined;

  afterEach(async () => {
    if (handle) {
      await handle.stop();
      handle = undefined;
    }
  });

  it('minimal config starts and GET /health returns 200', async () => {
    handle = await createService({
      serviceId: 'test-svc',
      register() {},
    });

    const res = await request(handle.app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
  });

  it('dependency start() is called before register()', async () => {
    const events: string[] = [];

    const dep = createDependency({
      name: 'db',
      async onStart() {
        events.push('start');
      },
    });

    handle = await createService({
      serviceId: 'test-svc',
      dependencies: [dep],
      register() {
        events.push('register');
      },
    });

    expect(events).toEqual(['start', 'register']);
  });

  it('throws at startup when control.enabled is true and secret is empty', async () => {
    await expect(
      createService({
        serviceId: 'test-svc',
        control: { enabled: true, secret: '' },
        register() {},
      }),
    ).rejects.toThrow('control.secret must be a non-empty string when the control plane is enabled');
  });

  it('does not throw at startup when control.enabled is false and secret is empty', async () => {
    handle = await createService({
      serviceId: 'test-svc',
      control: { enabled: false, secret: '' },
      register() {},
    });
    expect(handle).toBeDefined();
  });

  it('throws if a dependency start() throws (test mode)', async () => {
    const dep = createDependency({
      name: 'failing-dep',
      async onStart() {
        throw new Error('start failed');
      },
    });

    await expect(
      createService({
        serviceId: 'test-svc',
        dependencies: [dep],
        register() {},
      }),
    ).rejects.toThrow('start failed');
  });

  it('register receives a ServiceContext with all expected fields', async () => {
    let capturedCtx: ServiceContext | undefined;

    handle = await createService({
      serviceId: 'test-svc',
      register(_app, ctx) {
        capturedCtx = ctx;
      },
    });

    expect(capturedCtx).toBeDefined();
    expect(typeof capturedCtx!.logger.info).toBe('function');
    expect(typeof capturedCtx!.logger.warn).toBe('function');
    expect(typeof capturedCtx!.logger.error).toBe('function');
    expect(typeof capturedCtx!.logger.debug).toBe('function');
    expect(capturedCtx!.requireAuth).toBeDefined();
    expect(capturedCtx!.optionalAuth).toBeDefined();
    expect(typeof capturedCtx!.deps.get).toBe('function');
    expect(typeof capturedCtx!.clients.get).toBe('function');
    expect(capturedCtx!.config).toBeDefined();
    expect(capturedCtx!.config.serviceId).toBe('test-svc');
  });
});

// ---------------------------------------------------------------------------
// DepsMap
// ---------------------------------------------------------------------------

describe('createService — DepsMap', () => {
  let handle: ServiceHandle | undefined;

  afterEach(async () => {
    if (handle) {
      await handle.stop();
      handle = undefined;
    }
  });

  it('deps.get(dep) returns the typed .client instance after startup', async () => {
    const fakeClient = { query: () => 'result' };
    const dep = createDependency({ name: 'db', client: fakeClient });
    let capturedCtx: ServiceContext | undefined;

    handle = await createService({
      serviceId: 'test-svc',
      dependencies: [dep],
      register(_app, ctx) {
        capturedCtx = ctx;
      },
    });

    expect(capturedCtx!.deps.get(dep)).toBe(fakeClient);
  });

  it('deps.get(unknownDep) throws with a message containing the dependency name', async () => {
    let capturedCtx: ServiceContext | undefined;

    handle = await createService({
      serviceId: 'test-svc',
      register(_app, ctx) {
        capturedCtx = ctx;
      },
    });

    const unknownDep = createDependency({ name: 'not-registered' });
    expect(() => capturedCtx!.deps.get(unknownDep)).toThrow('not-registered');
  });
});

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

describe('createService — auth', () => {
  const INTROSPECT_URL = 'http://auth.test/introspect';
  const INTROSPECT_SECRET = 'chassis-shared-secret-at-least-32-bytes';

  let handle: ServiceHandle | undefined;

  afterEach(async () => {
    if (handle) {
      await handle.stop();
      handle = undefined;
    }
    vi.unstubAllGlobals();
  });

  it('requireAuth is passthroughMiddleware when no auth config is provided', async () => {
    let capturedCtx: ServiceContext | undefined;

    handle = await createService({
      serviceId: 'test-svc',
      register(_app, ctx) {
        capturedCtx = ctx;
      },
    });

    expect(capturedCtx!.requireAuth).toBe(passthroughMiddleware);
  });

  it('optionalAuth is passthroughMiddleware when no auth config is provided', async () => {
    let capturedCtx: ServiceContext | undefined;

    handle = await createService({
      serviceId: 'test-svc',
      register(_app, ctx) {
        capturedCtx = ctx;
      },
    });

    expect(capturedCtx!.optionalAuth).toBe(passthroughMiddleware);
  });

  it('builds the introspection verifier when the auth block supplies the pair', async () => {
    // The complement of the two passthrough cases above, and a shape no
    // other assertion in this package reached: a resolution answering null
    // for the introspection form would leave requireAuth as
    // passthroughMiddleware and admit every request, with nothing in the
    // response saying the guard was never built.
    const fetchMock = vi.fn().mockResolvedValue(
      { ok: true, json: async () => ({ active: true, sub: 'usr_1' }) } as Response,
    );
    vi.stubGlobal('fetch', fetchMock);

    let capturedCtx: ServiceContext | undefined;

    handle = await createService({
      serviceId: 'test-svc',
      auth: { introspectUrl: INTROSPECT_URL, introspectSecret: INTROSPECT_SECRET },
      register(app, ctx) {
        capturedCtx = ctx;
        app.get('/guarded', ctx.requireAuth, (_req, res) => res.json({ ok: true }));
      },
    });

    expect(capturedCtx!.requireAuth).not.toBe(passthroughMiddleware);

    const res = await request(handle.app).get('/guarded')
      .set('Authorization', 'Bearer session-token');

    expect(res.status).toBe(200);
    // Both configured fields reaching the adapter is what separates "some
    // verifier was built" from "this pair was resolved" — a resolution
    // reading either one from somewhere else answers the same 200.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      INTROSPECT_URL,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${INTROSPECT_SECRET}` }) as unknown,
      }),
    );
  });

  it('throws at startup when auth.introspectUrl is set without introspectSecret', async () => {
    // A half-configured auth block (URL but no secret) must fail at boot —
    // never start up and silently 401 every request forever.
    const badConfig = {
      serviceId: 'test-svc',
      auth: { introspectUrl: 'http://auth.test/introspect' },
      register() {},
    } as unknown as Parameters<typeof createService>[0];

    await expect(createService(badConfig)).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Plugin ordering
// ---------------------------------------------------------------------------

describe('createService — plugin ordering', () => {
  let handle: ServiceHandle | undefined;

  afterEach(async () => {
    if (handle) {
      await handle.stop();
      handle = undefined;
    }
  });

  it('plugins receive ctx.logger with standard log methods', async () => {
    let pluginLogger: unknown;

    const plugin = {
      name: 'logger-check',
      register: vi.fn(({ logger }: { logger: unknown }) => {
        pluginLogger = logger;
      }),
    };

    handle = await createService({
      serviceId: 'test-svc',
      plugins: [plugin],
      register() {},
    });

    expect(pluginLogger).toBeDefined();
    expect(typeof (pluginLogger as { info?: unknown }).info).toBe('function');
    expect(typeof (pluginLogger as { warn?: unknown }).warn).toBe('function');
    expect(typeof (pluginLogger as { error?: unknown }).error).toBe('function');
  });

  it('plugins are applied in array order: plugin[0].register before plugin[1].register', async () => {
    const callOrder: string[] = [];

    const plugin0 = {
      name: 'plugin-0',
      register: vi.fn(async () => {
        callOrder.push('plugin-0');
      }),
    };
    const plugin1 = {
      name: 'plugin-1',
      register: vi.fn(async () => {
        callOrder.push('plugin-1');
      }),
    };

    handle = await createService({
      serviceId: 'test-svc',
      plugins: [plugin0, plugin1],
      register() {},
    });

    expect(callOrder).toEqual(['plugin-0', 'plugin-1']);
  });
});

// ---------------------------------------------------------------------------
// Error handler
// ---------------------------------------------------------------------------

describe('createService — error handler', () => {
  let handle: ServiceHandle | undefined;

  afterEach(async () => {
    if (handle) {
      await handle.stop();
      handle = undefined;
    }
  });

  it('a route that throws is caught by the error handler and returns a 5xx response', async () => {
    handle = await createService({
      serviceId: 'test-svc',
      register(app) {
        app.get('/boom', (_req, _res, next) => {
          next(new Error('test error'));
        });
      },
    });

    const res = await request(handle.app).get('/boom');
    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(res.status).toBeLessThan(600);
  });

  // -------------------------------------------------------------------------
  // Express 5 async-rejection forwarding
  //
  // Express 4 ignored a handler's return value, so a rejected promise from an
  // `async` handler became an unhandled rejection and the request was never
  // answered at all. Express 5 awaits it and routes the rejection down the
  // same path a synchronous `next(err)` takes, which is what lets a handler
  // drop the try/catch wrapper the convention used to require.
  //
  // Measured across the two majors directly, driving the same handler shape
  // over a bare app from each: 4.22.2 answers nothing (the request times out,
  // with the rejection logged as unhandled) and 5.2.1 answers 500 from the
  // registered error handler. So the regression this pair guards against
  // surfaces as a test TIMEOUT rather than an assertion diff — a red here
  // that reads as "hung" is the interesting failure, not a flake.
  // -------------------------------------------------------------------------

  it('an async route handler that rejects is forwarded to the error handler', async () => {
    handle = await createService({
      serviceId: 'test-svc',
      register(app) {
        // No try/catch and no `next(err)`: the bare rejection is the subject.
        app.get('/async-boom', async () => {
          throw new Error('async test error');
        });
      },
    });

    const res = await request(handle.app).get('/async-boom');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    });
  });

  it('the forwarded rejection is the thrown error itself, not a wrapper', async () => {
    // The case above cannot tell "the error handler ran" apart from "some 500
    // came back": its body is the branch that answers ANY unrecognised value.
    // An `AppError` subclass takes a different branch of the same handler, so
    // its own status and `toJSON()` body coming back is what proves Express
    // hands the rejected value over unchanged rather than substituting an
    // error of its own.
    handle = await createService({
      serviceId: 'test-svc',
      register(app) {
        app.get('/async-not-found', async () => {
          throw new NotFoundError('no such widget');
        });
      },
    });

    const res = await request(handle.app).get('/async-not-found');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ code: 'NOT_FOUND', message: 'no such widget' });
  });
});
