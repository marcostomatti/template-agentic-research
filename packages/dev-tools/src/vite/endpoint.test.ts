import type { DevToolsEndpointContext, DevToolsEndpointFs } from './endpoint';
import type {
  ReportGateway,
  ReportGatewayCommentOutcome,
} from './gateway';
import type { DevToolsIncoming, DevToolsOutgoing } from './http';

import { describe, expect, it } from 'vitest';

import {
  DEVTOOLS_COMMENT_PATH,
  createDevToolsEndpoint,
} from './endpoint';

/**
 * ## What this file drives
 *
 * `POST /__devtools/comment` — the "also affected" route — over a
 * {@link createDevToolsEndpoint} built from a context literal. No
 * assembly, because this route reads a body, a schema and the
 * configured gateway and touches no build value, no filesystem and no
 * clock; `./endpoint.ts`'s header states that split, and
 * `./plugin.test.ts` is where the routes that DO need a resolved
 * commit, branch or round are driven from.
 *
 * ## The order
 *
 * The four refusals first — the wrong method, a cross-origin caller, a
 * body the schema refuses, and a request arriving with no gateway
 * configured — then the answered outcome, then the gateway that threw.
 *
 * ## What each refusal's control is
 *
 * Every refusal asserts that the gateway recorded NO call, and that
 * reading is worth nothing on its own: a middleware that answered
 * everything with 404 would satisfy it. `answers the outcome the
 * gateway gave for an also affected report` is the control — the same
 * route, the same context, the same gateway, varying only the one
 * thing each refusal is about — and it is the case that proves a call
 * reaches the gateway at all.
 *
 * {@link REFUSING_FS} is the second control, and it is passive: every
 * one of its four methods rejects, so a route that touched the
 * filesystem would red the case that touched it rather than pass
 * quietly. Nothing below arranges a file, because this route writes
 * none.
 */

/** The port the fake dev server answers on. */
const SERVER_PORT = 5173;

/** The headers a page served by that dev server sends on a `POST`. */
const SAME_ORIGIN_HEADERS: Readonly<Record<string, string>> = Object.freeze({
  origin: `http://localhost:${SERVER_PORT}`,
  host: `localhost:${SERVER_PORT}`,
});

/** The loopback address every allowed request arrives from. */
const LOOPBACK_ADDRESS = '127.0.0.1';

/**
 * A filesystem that refuses every call.
 *
 * The "also affected" route reads no file and writes none, so any call
 * at all is a failure; rejecting says so where a recorder would need a
 * case to remember to read it.
 */
const REFUSING_FS: DevToolsEndpointFs = Object.freeze({
  mkdir: () => Promise.reject(new Error('the comment route made a directory')),
  writeFile: () => Promise.reject(new Error('the comment route wrote a file')),
  readdir: () => Promise.reject(new Error('the comment route listed a dir')),
  readFile: () => Promise.reject(new Error('the comment route read a file')),
});

/** One call {@link createGateway} recorded. */
interface RecordedComment {
  /** The issue id it was given. */
  readonly issueId: string;

  /** The comment markdown it was given. */
  readonly body: string;
}

/** A gateway that records what it was asked to comment on. */
interface RecordingGateway extends ReportGateway {
  /** Every `comment` call, in order. */
  readonly comments: readonly RecordedComment[];
}

/**
 * Build a gateway that records its `comment` calls.
 *
 * @param outcome - What `comment` answers, or a thrown error to raise
 * instead.
 * @returns The gateway. `file` and `search` are present because the
 * interface has them and throw because nothing here may reach them.
 * @throws Whatever `outcome` is, when it is an `Error`.
 */
function createGateway(
  outcome: ReportGatewayCommentOutcome | Error,
): RecordingGateway {
  const comments: RecordedComment[] = [];

  return {
    comments,
    name: 'test-gateway',
    file: () => Promise.reject(new Error('the comment route filed a report')),
    search: () => Promise.reject(new Error('the comment route searched')),
    comment: async (issueId: string, body: string) => {
      comments.push({ issueId, body });

      if (outcome instanceof Error) {
        throw outcome;
      }

      return outcome;
    },
  };
}

/**
 * Build the middleware over a context literal.
 *
 * @param gateway - The configured gateway, or nothing for a dev server
 * with none.
 * @returns The middleware.
 */
function createEndpoint(gateway?: ReportGateway): ReturnType<
  typeof createDevToolsEndpoint
> {
  const context: DevToolsEndpointContext = {
    info: { commit: 'unknown', branch: 'unknown', round: 'endpoint-test' },
    outDir: '.rafa/feedback',
    repo: 'acme/widgets',
    allowLan: false,
    protocol: 'http:',
    gateway,
    fs: REFUSING_FS,
    now: () => new Date(Date.UTC(2026, 8, 18, 12, 34, 56, 789)),
  };

  return createDevToolsEndpoint(context);
}

/** What one fake request needs stated. */
interface FakeRequestInit {
  /** The request method. */
  readonly method: string;

  /** The request headers; defaults to the same-origin pair. */
  readonly headers?: Readonly<Record<string, string>>;

  /** The raw body, sent as a single chunk. */
  readonly body?: string;
}

/**
 * Build a request for the "also affected" route, over loopback.
 *
 * The method and the headers are what this file's refusals vary, so
 * they are what it states; the address and the port are the allowed
 * ones throughout, because `./plugin.test.ts` is where the loopback
 * rule is pinned and repeating it here would prove nothing new.
 *
 * @param init - The method, headers and body.
 * @returns A request satisfying `DevToolsIncoming`.
 */
function commentRequest(init: FakeRequestInit): DevToolsIncoming {
  const chunks = init.body === undefined
    ? []
    : [init.body];

  return {
    method: init.method,
    url: DEVTOOLS_COMMENT_PATH,
    headers: init.headers ?? SAME_ORIGIN_HEADERS,
    socket: { remoteAddress: LOOPBACK_ADDRESS, localPort: SERVER_PORT },
    async *[Symbol.asyncIterator]() {
      yield* chunks;
    },
  };
}

/** What the middleware wrote to a fake response. */
interface RecordedResponse {
  /** The status code it was left with. */
  readonly statusCode: number;

  /** The body, parsed as JSON. */
  readonly body: unknown;
}

/**
 * Build a response that records what the middleware writes to it.
 *
 * @returns The response, and a reader for what it recorded so far.
 */
function createResponse(): {
  readonly res: DevToolsOutgoing;
  readonly read: () => RecordedResponse;
} {
  let body: unknown;
  const res: DevToolsOutgoing = {
    statusCode: 0,
    setHeader: () => undefined,
    end: (chunk: string) => {
      body = JSON.parse(chunk);
    },
  };

  return { res, read: () => ({ statusCode: res.statusCode, body }) };
}

/**
 * Drive the middleware and wait for it to finish answering.
 *
 * The middleware's own contract is synchronous — `./endpoint.ts`'s
 * header says the async work inside it is launched rather than
 * awaited — so a case awaits this instead of the call itself. It
 * resolves the moment a response is written, or immediately when the
 * request falls through to `next()`.
 *
 * @param handler - The middleware.
 * @param req - The request to hand it.
 * @param res - The response to hand it.
 * @returns Once the middleware has finished with this request.
 */
function runMiddleware(
  handler: ReturnType<typeof createDevToolsEndpoint>,
  req: DevToolsIncoming,
  res: DevToolsOutgoing,
): Promise<void> {
  return new Promise((resolve) => {
    const originalEnd = res.end.bind(res);

    res.end = (chunk: string) => {
      const outcome = originalEnd(chunk);

      resolve();

      return outcome;
    };

    handler(req, res, resolve);
  });
}

/** A body the schema accepts, spelled once. */
const COMMENT_BODY = JSON.stringify({
  issueId: 'AR-123',
  body: 'Also affected: the same modal traps focus on Firefox 148.',
});

/** What the gateway answers for an accepted comment. */
const COMMENTED: ReportGatewayCommentOutcome = Object.freeze({
  status: 'filed' as const,
  tracker: 'local',
  id: 'AR-123',
  url: 'https://tracker.example/AR-123',
});

describe('the refusals of the also affected route', () => {
  it('refuses a GET to the also affected route', async () => {
    // Arrange: over loopback with a gateway configured, so the METHOD
    // is the only thing wrong with this request.
    const gateway = createGateway(COMMENTED);
    const { res, read } = createResponse();

    // Act
    await runMiddleware(
      createEndpoint(gateway),
      commentRequest({ method: 'GET' }),
      res,
    );

    // Assert
    expect(read().statusCode).toBe(405);
    expect(read().body).toMatchObject({
      status: 'refused',
      rule: 'method-not-allowed',
    });
    expect(gateway.comments).toEqual([]);
  });

  it('refuses a cross-origin also affected comment', async () => {
    // Arrange: a Host naming the dev server, and an Origin naming
    // somewhere else entirely — the shape of a page on another origin
    // posting through the operator's own browser.
    const gateway = createGateway(COMMENTED);
    const { res, read } = createResponse();
    const headers = Object.freeze({
      origin: 'http://attacker.example:5173',
      host: `localhost:${SERVER_PORT}`,
    });

    // Act
    await runMiddleware(
      createEndpoint(gateway),
      commentRequest({ method: 'POST', headers, body: COMMENT_BODY }),
      res,
    );

    // Assert
    expect(read().statusCode).toBe(403);
    expect(read().body).toMatchObject({
      status: 'refused',
      rule: 'origin-mismatch',
    });
    expect(gateway.comments).toEqual([]);
  });

  it('refuses an also affected body the schema refuses', async () => {
    // Arrange: an issue id opening with a dash, which every CLI reads
    // as a flag rather than as a value — the refusal `./comment.ts`'s
    // pattern exists for.
    const gateway = createGateway(COMMENTED);
    const { res, read } = createResponse();
    const body = JSON.stringify({ issueId: '--force', body: 'Also here.' });

    // Act
    await runMiddleware(
      createEndpoint(gateway),
      commentRequest({ method: 'POST', body }),
      res,
    );

    // Assert: the field path folded into the rule, and no call made.
    expect(read().statusCode).toBe(400);
    expect(read().body).toMatchObject({
      status: 'refused',
      rule: 'body.issueId',
    });
    expect(gateway.comments).toEqual([]);
  });

  it('refuses an also affected comment with no gateway configured', async () => {
    // Arrange: everything about the request is in order; the dev server
    // is what has nowhere to send it.
    const { res, read } = createResponse();

    // Act
    await runMiddleware(
      createEndpoint(),
      commentRequest({ method: 'POST', body: COMMENT_BODY }),
      res,
    );

    // Assert: the server's own fault, so a 500 rather than a 400, and
    // the reason names no value the request sent.
    expect(read().statusCode).toBe(500);
    expect(read().body).toEqual({
      status: 'refused',
      rule: 'gateway-absent',
      reason: 'This dev server has no report gateway configured, so a '
        + 'comment cannot reach a tracker.',
    });
  });
});

describe('the also affected route', () => {
  it('answers the outcome the gateway gave for an also affected report', async () => {
    // Arrange: the control for all four refusals above — the same
    // route, the same context and the same gateway, with nothing varied
    // away.
    const gateway = createGateway(COMMENTED);
    const { res, read } = createResponse();

    // Act
    await runMiddleware(
      createEndpoint(gateway),
      commentRequest({ method: 'POST', body: COMMENT_BODY }),
      res,
    );

    // Assert: the outcome wrapped rather than bare, and the two body
    // members reaching the gateway as its two arguments.
    expect(read().statusCode).toBe(200);
    expect(read().body).toEqual({ status: 'commented', gateway: COMMENTED });
    expect(gateway.comments).toEqual([{
      issueId: 'AR-123',
      body: 'Also affected: the same modal traps focus on Firefox 148.',
    }]);
  });

  it('answers a refusal for an also affected comment the gateway threw on', async () => {
    // Arrange: a gateway that throws where the interface says it should
    // answer — the belt `withoutThrowing` is the brace over.
    const gateway = createGateway(new Error('tracker unreachable'));
    const { res, read } = createResponse();

    // Act
    await runMiddleware(
      createEndpoint(gateway),
      commentRequest({ method: 'POST', body: COMMENT_BODY }),
      res,
    );

    // Assert: a 200 carrying the gateway's refusal, because the REQUEST
    // was not refused, and a fixed reason that quotes neither the
    // thrown error nor anything the request sent.
    expect(read().statusCode).toBe(200);
    expect(read().body).toEqual({
      status: 'commented',
      gateway: {
        status: 'refused',
        reason: 'The report gateway threw while commenting on this issue.',
      },
    });
    expect(gateway.comments).toHaveLength(1);
  });
});
