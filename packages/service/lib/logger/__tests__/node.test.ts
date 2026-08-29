import type { IncomingMessage, ServerResponse } from 'node:http';

import { EventEmitter } from 'node:events';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createHttpLogger, createLogger } from '../node.js';

describe('createLogger — node entry', () => {
  let stdoutChunks: string[];

  beforeEach(() => {
    stdoutChunks = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      stdoutChunks.push(typeof chunk === 'string'
        ? chunk
        : chunk.toString());
      return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('includes service binding in log output', () => {
    const logger = createLogger('x');
    logger.info({}, 'msg');

    expect(stdoutChunks.length).toBeGreaterThan(0);
    const parsed = JSON.parse(stdoutChunks[0]!) as Record<string, unknown>;
    expect(parsed['service']).toBe('x');
    expect(parsed['msg']).toBe('msg');
  });
});

describe('createLogger — child logger', () => {
  let stdoutChunks: string[];

  beforeEach(() => {
    stdoutChunks = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      stdoutChunks.push(typeof chunk === 'string'
        ? chunk
        : chunk.toString());
      return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('inherits service binding from parent', () => {
    const parent = createLogger('my-service');
    const child = parent.child({ requestId: 'abc' });

    child.info({}, 'child msg');

    expect(stdoutChunks.length).toBeGreaterThan(0);
    const parsed = JSON.parse(stdoutChunks[0]!) as Record<string, unknown>;
    expect(parsed['service']).toBe('my-service');
    expect(parsed['requestId']).toBe('abc');
    expect(parsed['msg']).toBe('child msg');
  });
});

describe('createHttpLogger — req.log attachment', () => {
  it('attaches req.log as a child logger on each request', () => {
    const logger = createLogger('test-service');
    const middleware = createHttpLogger({ logger });

    const req = Object.assign(Object.create(null), {
      headers: {},
      method: 'GET',
      url: '/test',
      socket: { remoteAddress: '127.0.0.1' },
    }) as unknown as IncomingMessage;

    const res = Object.assign(Object.create(null), {
      statusCode: 200,
      setHeader: vi.fn(),
      getHeader: vi.fn(),
      on: vi.fn(),
    }) as unknown as ServerResponse;

    const next = vi.fn();
    middleware(req, res, next);

    const reqWithLog = req as IncomingMessage & { log?: unknown };
    expect(reqWithLog.log).toBeDefined();
    // pino-http declaration-merges `log: pino.Logger` onto `http.IncomingMessage`, and
    // that merged member wins over the local `log?: unknown` above. The double cast
    // erases that pino `Logger` on purpose: it carries no string index signature, and
    // this test deliberately probes the attached value as a bag of properties, so the
    // assertions stay about the child logger's methods rather than pino's type shape.
    expect(typeof (reqWithLog.log as unknown as Record<string, unknown>)['info']).toBe('function');
    expect(typeof (reqWithLog.log as unknown as Record<string, unknown>)['child']).toBe('function');
  });
});

describe('createHttpLogger — authorization header redaction', () => {
  let stdoutChunks: string[];

  beforeEach(() => {
    stdoutChunks = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      stdoutChunks.push(typeof chunk === 'string'
        ? chunk
        : chunk.toString());
      return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('redacts the authorization header value in log output', () => {
    const middleware = createHttpLogger();

    const req = Object.assign(Object.create(null), {
      headers: { authorization: 'Bearer secret-token' },
      method: 'GET',
      url: '/api/data',
      socket: { remoteAddress: '127.0.0.1' },
    }) as unknown as IncomingMessage;

    const res = Object.assign(new EventEmitter(), {
      statusCode: 200,
      setHeader: vi.fn(),
      getHeader: vi.fn(),
    }) as unknown as ServerResponse;

    const next = vi.fn();
    middleware(req, res, next);
    res.emit('finish');

    expect(stdoutChunks.length).toBeGreaterThan(0);
    const parsed = JSON.parse(stdoutChunks[0]!) as Record<string, unknown>;
    const reqField = parsed['req'] as Record<string, unknown> | undefined;
    const headers = reqField?.['headers'] as Record<string, unknown> | undefined;
    expect(headers?.['authorization']).toBe('[Redacted]');
  });
});

/**
 * Every string leaf reachable from a parsed log line, in traversal order.
 *
 * This is the second reader the `x-api-key` cases below check the output with.
 * It shares nothing with pino's redaction engine — no path syntax, no key
 * names — so it still reports a header value that survived under some key the
 * configured redact path does not name. A redactor cannot see its own path
 * stop matching, so its report that a field is masked is not evidence the
 * value left the line.
 */
function stringLeaves(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }
  if (value === null || typeof value !== 'object') {
    return [];
  }
  return Object.values(value as Record<string, unknown>).flatMap(stringLeaves);
}

describe('createHttpLogger — x-api-key header redaction', () => {
  // `x-api-key` is the third default redact path and the only one spelled in
  // bracket notation (`req.headers["x-api-key"]`), because the header name
  // carries hyphens. The pino 10 bump did not move the engine underneath it:
  // 9.14.0 and 10.3.1 both depend on `@pinojs/redact` ^0.4.0 and resolve to the
  // same installed 0.4.0 copy, and both majors driven over this path out of
  // their own store directories emit byte-identical output — the fast-redact
  // replacement landed before 9.14.0, not at the major. Measured against that
  // engine: the bracket form, the single-quoted form and even the bare dotted
  // `req.headers.x-api-key` all resolve to this same key, while a wrong-cased
  // or wrong-parented path leaks the value and throws NOTHING. Only an
  // unterminated bracket is loud (`Invalid redaction path`). That silence is
  // why the second case below re-reads the emitted line instead of asking the
  // redactor whether it worked.
  const API_KEY_SECRET = 'sk-live-redaction-sentinel-0001';
  // Deliberately NOT a redacted path: this header must survive verbatim. It
  // does double duty — it is the liveness control for both readers (a scan
  // that finds nothing proves nothing) and the over-eager direction, since a
  // redactor that masked every header would pass the absence assertion alone.
  const UNLISTED_SECRET = 'sk-live-unlisted-sentinel-0002';

  let stdoutChunks: string[];

  beforeEach(() => {
    stdoutChunks = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      stdoutChunks.push(typeof chunk === 'string'
        ? chunk
        : chunk.toString());
      return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const emitOneRequest = (): void => {
    const middleware = createHttpLogger();

    const req = Object.assign(Object.create(null), {
      headers: {
        'x-api-key': API_KEY_SECRET,
        'x-echo-key': UNLISTED_SECRET,
      },
      method: 'GET',
      url: '/api/data',
      socket: { remoteAddress: '127.0.0.1' },
    }) as unknown as IncomingMessage;

    const res = Object.assign(new EventEmitter(), {
      statusCode: 200,
      setHeader: vi.fn(),
      getHeader: vi.fn(),
    }) as unknown as ServerResponse;

    middleware(req, res, vi.fn());
    res.emit('finish');
  };

  it('reports the x-api-key header as [Redacted] at its configured path', () => {
    emitOneRequest();

    // The redactor's OWN report: the placeholder literal sitting at the exact
    // path `DEFAULT_REDACT_PATHS` names. Pinning it here keeps the censor
    // string a checked constant, but on its own it says only that pino wrote
    // what pino was asked to write.
    expect(stdoutChunks.length).toBeGreaterThan(0);
    const parsed = JSON.parse(stdoutChunks[0]!) as Record<string, unknown>;
    const reqField = parsed['req'] as Record<string, unknown> | undefined;
    const headers = reqField?.['headers'] as Record<string, unknown> | undefined;
    expect(headers?.['x-api-key']).toBe('[Redacted]');
  });

  it('leaves no x-api-key value anywhere in the emitted line', () => {
    emitOneRequest();

    expect(stdoutChunks.length).toBeGreaterThan(0);
    const raw = stdoutChunks[0]!;

    // Controls first, so a reader that has gone blind fails as a control
    // rather than passing as a clean result. Each reader proves itself on the
    // SAME line it is about to clear.
    expect(raw).toContain(UNLISTED_SECRET);
    const leaves = stringLeaves(JSON.parse(raw));
    expect(leaves).toContain(UNLISTED_SECRET);

    // The claims. Neither consults the redact path: the raw scan is blind to
    // structure and the leaf walk is blind to key names, so a value that moved
    // to another field (a serializer, a `customProps` echo) fails here while
    // the case above still reads `[Redacted]`. Both were proven to
    // discriminate by mutating `node.ts`; because a case stops at its first
    // failing assertion, the leaf walk was re-run with the raw scan removed to
    // confirm it fails on its own.
    expect(raw).not.toContain(API_KEY_SECRET);
    expect(leaves.filter((leaf) => leaf.includes(API_KEY_SECRET))).toEqual([]);
  });
});

describe('createHttpLogger — health route ignore', () => {
  let stdoutChunks: string[];

  beforeEach(() => {
    stdoutChunks = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      stdoutChunks.push(typeof chunk === 'string'
        ? chunk
        : chunk.toString());
      return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('skips logging entirely for requests to /_health', () => {
    const middleware = createHttpLogger();

    const req = Object.assign(Object.create(null), {
      headers: {},
      method: 'GET',
      url: '/_health',
      socket: { remoteAddress: '127.0.0.1' },
    }) as unknown as IncomingMessage;

    const res = Object.assign(new EventEmitter(), {
      statusCode: 200,
      setHeader: vi.fn(),
      getHeader: vi.fn(),
    }) as unknown as ServerResponse;

    const next = vi.fn();
    middleware(req, res, next);
    res.emit('finish');

    expect(stdoutChunks.length).toBe(0);
  });
});

describe('createHttpLogger — requestId from crypto.randomUUID()', () => {
  it('generates requestId via crypto.randomUUID() when x-request-id header is absent', () => {
    const middleware = createHttpLogger();

    const req = Object.assign(Object.create(null), {
      headers: {},
      method: 'GET',
      url: '/api/test',
      socket: { remoteAddress: '127.0.0.1' },
    }) as unknown as IncomingMessage;

    const res = Object.assign(Object.create(null), {
      statusCode: 200,
      setHeader: vi.fn(),
      getHeader: vi.fn(),
      on: vi.fn(),
    }) as unknown as ServerResponse;

    middleware(req, res, vi.fn());

    const reqWithId = req as IncomingMessage & { id?: string };
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(reqWithId.id).toMatch(uuidV4Regex);
  });
});

describe('createHttpLogger — requestId from x-request-id header', () => {
  it('uses the x-request-id header value as requestId when present', () => {
    const middleware = createHttpLogger();

    const req = Object.assign(Object.create(null), {
      headers: { 'x-request-id': 'my-trace-id-123' },
      method: 'GET',
      url: '/api/test',
      socket: { remoteAddress: '127.0.0.1' },
    }) as unknown as IncomingMessage;

    const res = Object.assign(Object.create(null), {
      statusCode: 200,
      setHeader: vi.fn(),
      getHeader: vi.fn(),
      on: vi.fn(),
    }) as unknown as ServerResponse;

    middleware(req, res, vi.fn());

    const reqWithId = req as IncomingMessage & { id?: string };
    expect(reqWithId.id).toBe('my-trace-id-123');
  });
});

describe('createLogger — level option suppression', () => {
  let stdoutChunks: string[];

  beforeEach(() => {
    stdoutChunks = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      stdoutChunks.push(typeof chunk === 'string'
        ? chunk
        : chunk.toString());
      return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not emit log lines below the configured level', () => {
    const logger = createLogger('svc', { level: 'warn' });

    logger.trace({}, 'trace msg');
    logger.debug({}, 'debug msg');
    logger.info({}, 'info msg');

    expect(stdoutChunks.length).toBe(0);
  });

  it('emits log lines at or above the configured level', () => {
    const logger = createLogger('svc', { level: 'warn' });

    logger.warn({}, 'warn msg');

    expect(stdoutChunks.length).toBeGreaterThan(0);
    const parsed = JSON.parse(stdoutChunks[0]!) as Record<string, unknown>;
    expect(parsed['msg']).toBe('warn msg');
  });
});

describe('createLogger — LOG_LEVEL env var', () => {
  let stdoutChunks: string[];
  const originalLogLevel = process.env['LOG_LEVEL'];

  beforeEach(() => {
    stdoutChunks = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      stdoutChunks.push(typeof chunk === 'string'
        ? chunk
        : chunk.toString());
      return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    if (originalLogLevel === undefined) {
      delete process.env['LOG_LEVEL'];
    } else {
      process.env['LOG_LEVEL'] = originalLogLevel;
    }
  });

  it('suppresses info-level output when LOG_LEVEL=warn', async () => {
    process.env['LOG_LEVEL'] = 'warn';
    vi.resetModules();

    const { createLogger: createLoggerFresh } = await import('../node.js');
    const logger = createLoggerFresh('svc');

    logger.info({}, 'this should be suppressed');
    expect(stdoutChunks.length).toBe(0);

    logger.warn({}, 'this should appear');
    expect(stdoutChunks.length).toBeGreaterThan(0);
    const parsed = JSON.parse(stdoutChunks[0]!) as Record<string, unknown>;
    expect(parsed['msg']).toBe('this should appear');
  });
});
