import type {
  DevToolsEndpointRule,
  DevToolsIncoming,
  DevToolsOutgoing,
} from './http';

import { Buffer } from 'node:buffer';

import { describe, expect, it } from 'vitest';

import {
  DEVTOOLS_BODY_BYTES_MAX,
  HTTP_BAD_REQUEST,
  HTTP_FORBIDDEN,
  createRefuse,
  pathnameOf,
  readBody,
  refusalOf,
  respond,
  serverOriginOf,
} from './http';

/**
 * ## Why there is no server and no socket here
 *
 * `http.ts` reads its arguments and nothing else: a request is an
 * object literal with an async generator for a body, a response is a
 * recorder, and a log sink is an array. Nothing is listened on, nothing
 * is written to disk, and no case depends on the order the others ran
 * in. `./plugin.test.ts` is where the same plumbing is driven through
 * an assembled middleware; this file is where each piece is driven on
 * its own, which is the whole reason the plumbing was split out of
 * `./endpoint.ts`.
 *
 * ## Why so many cases carry a positive control
 *
 * Most readings below are a refusal — a `null`, or an `ok: false`
 * carrying a rule — and a reader hard-wired to refuse would pass every
 * one of them. So each case that could read as a false negative pairs
 * the refusal with the ONE edit that should make the same call succeed:
 * a `url` that is a path, a chunk that is text, a socket that can say
 * its port.
 *
 * Refusals run before accepting cases, which is this plan's order for
 * every test file.
 */

/** The port the fake dev server answers on. */
const SERVER_PORT = 5173;

/** What one fake request needs stated. */
interface FakeRequestInit {
  /** The request method; absent when the case does not need one. */
  readonly method?: string;

  /** The request target; absent when the case does not need one. */
  readonly url?: string;

  /** The request headers; defaults to none. */
  readonly headers?: Readonly<Record<string, string>>;

  /** The local end's port; absent when the socket cannot say. */
  readonly localPort?: number;

  /** The chunks the body iterates, in order; defaults to none. */
  readonly chunks?: readonly unknown[];

  /** Thrown by the body after the chunks above have been yielded. */
  readonly thrown?: Error;
}

/** A request, plus what the case can ask about how it was read. */
interface FakeRequest {
  /** What the module under test is handed. */
  readonly req: DevToolsIncoming;

  /** How many chunks were actually pulled off the body. */
  readonly pulled: () => number;
}

/**
 * Build a request the readers can be handed, body included.
 *
 * @param init - The method, target, headers, socket port and body.
 * @returns The request and a reader for how much of it was consumed —
 * the second is how the "an oversize body is abandoned rather than
 * held" claim is measured rather than assumed.
 */
function fakeRequest(init: FakeRequestInit = {}): FakeRequest {
  const chunks = init.chunks ?? [];
  let pulled = 0;

  return {
    pulled: () => pulled,
    req: {
      method: init.method,
      url: init.url,
      headers: init.headers ?? {},
      socket: { remoteAddress: '127.0.0.1', localPort: init.localPort },
      async *[Symbol.asyncIterator]() {
        for (const chunk of chunks) {
          pulled += 1;

          yield chunk;
        }

        if (init.thrown !== undefined) {
          throw init.thrown;
        }
      },
    },
  };
}

/** What a writer left on a fake response. */
interface RecordedResponse {
  /** The status code it was left with. */
  readonly statusCode: number;

  /** Every header set, by name. */
  readonly headers: Readonly<Record<string, string>>;

  /** The body, exactly as written. */
  readonly raw: string;
}

/**
 * Build a response that records what is written to it.
 *
 * @returns The response, and a reader for what it recorded.
 */
function createResponse(): {
  readonly res: DevToolsOutgoing;
  readonly read: () => RecordedResponse;
} {
  const headers: Record<string, string> = {};
  let raw = '';
  const res: DevToolsOutgoing = {
    statusCode: 0,
    setHeader: (name: string, value: string) => {
      headers[name] = value;
    },
    end: (chunk: string) => {
      raw = chunk;
    },
  };

  return { res, read: () => ({ statusCode: res.statusCode, headers, raw }) };
}

/** Every rule this module owns, for the case that sweeps them. */
const RULES: readonly DevToolsEndpointRule[] = [
  'method-not-allowed',
  'socket-unreadable',
  'body-too-large',
  'body-unreadable',
  'body-not-json',
  'endpoint-failed',
];

describe('what the pathname reader refuses', () => {
  it('refuses a request that states no target at all', () => {
    // Act
    const path = pathnameOf(undefined);

    // Assert
    expect(path).toBeNull();

    // The positive control: the same reader, handed a target, answers
    // it - so a reader that answered null for everything would fail
    // here rather than pass the assertion above.
    expect(pathnameOf('/__devtools/status')).toBe('/__devtools/status');
  });

  it('refuses an absolute-form target, which is not a path', () => {
    // Arrange: what a proxy may send on the request line.
    const url = 'http://localhost:5173/__devtools/status';

    // Act + Assert
    expect(pathnameOf(url)).toBeNull();
  });

  it('refuses a target that is a bare query string', () => {
    // Act + Assert
    expect(pathnameOf('?round=1')).toBeNull();
  });
});

describe('what the body reader refuses', () => {
  it('refuses a chunk that is neither text nor bytes', async () => {
    // Arrange: a stream shape this module will not guess at.
    const { req } = fakeRequest({ chunks: [{ title: 'a report' }] });

    // Act
    const read = await readBody(req);

    // Assert
    expect(read).toEqual({ ok: false, rule: 'body-unreadable' });

    // The positive control: the same object, sent as the text it would
    // have been serialised to, is read.
    const text = fakeRequest({ chunks: ['{"title":"a report"}'] });

    await expect(readBody(text.req)).resolves.toEqual({
      ok: true,
      value: { title: 'a report' },
    });
  });

  it('refuses a stream that throws before it ends', async () => {
    // Arrange: a connection dropped mid-body.
    const { req } = fakeRequest({
      chunks: ['{"title":'],
      thrown: new Error('ECONNRESET'),
    });

    // Act
    const read = await readBody(req);

    // Assert: the rule, and no trace of what the stream said.
    expect(read).toEqual({ ok: false, rule: 'body-unreadable' });
  });

  it('refuses a body one byte over the cap, and stops pulling it', async () => {
    // Arrange: the cap in one chunk, then the byte that passes it, then
    // a chunk that should never be asked for.
    const request = fakeRequest({
      chunks: [Buffer.alloc(DEVTOOLS_BODY_BYTES_MAX, 0x61), 'b', 'c'],
    });

    // Act
    const read = await readBody(request.req);

    // Assert
    expect(read).toEqual({ ok: false, rule: 'body-too-large' });

    // Abandoned rather than held: the reader left the loop on the
    // chunk that passed the cap, so the third was never pulled.
    expect(request.pulled()).toBe(2);
  });

  it('refuses a body that is not JSON', async () => {
    // Arrange
    const { req } = fakeRequest({ chunks: ['a report, but plain text'] });

    // Act + Assert
    await expect(readBody(req)).resolves.toEqual({
      ok: false,
      rule: 'body-not-json',
    });
  });

  it('refuses a body that ends mid-JSON', async () => {
    // Arrange: every chunk arrived, and they still do not parse.
    const { req } = fakeRequest({ chunks: ['{"title":', '"a report"'] });

    // Act + Assert
    await expect(readBody(req)).resolves.toEqual({
      ok: false,
      rule: 'body-not-json',
    });
  });
});

describe('what the server-origin reader refuses', () => {
  it('refuses a socket that cannot say which port it accepted', () => {
    // Arrange: a socket that has already closed.
    const { req } = fakeRequest({ method: 'POST' });

    // Act
    const origin = serverOriginOf(req, 'http:');

    // Assert
    expect(origin).toBeNull();

    // The positive control: the same request off a socket that can say
    // answers an origin.
    const open = fakeRequest({ method: 'POST', localPort: SERVER_PORT });

    expect(serverOriginOf(open.req, 'http:')).toEqual({
      protocol: 'http:',
      port: SERVER_PORT,
    });
  });

  it('refuses a port that is not a usable whole number', () => {
    // Arrange + Act + Assert: zero is what an unbound socket reports,
    // and neither a fraction nor NaN is a port.
    for (const port of [0, -1, 1.5, Number.NaN]) {
      const { req } = fakeRequest({ localPort: port });

      expect(serverOriginOf(req, 'https:')).toBeNull();
    }
  });
});

describe('what a refusal says', () => {
  it('answers a fixed sentence for every rule it owns', () => {
    // Act + Assert: each rule answers itself, frozen, with a sentence
    // of its own - so no two refusals are told apart by their code
    // alone.
    const reasons = new Set<string>();

    for (const rule of RULES) {
      const body = refusalOf(rule);

      expect(body.status).toBe('refused');
      expect(body.rule).toBe(rule);
      expect(body.reason.length).toBeGreaterThan(0);
      expect(Object.isFrozen(body)).toBe(true);

      reasons.add(body.reason);
    }

    expect(reasons.size).toBe(RULES.length);
  });

  it('repeats nothing the refused request carried', () => {
    // Arrange: a request whose every readable part is a marked value.
    const { req } = fakeRequest({
      method: 'POST',
      url: '/__devtools/report?token=QUERYMARK',
      headers: {
        origin: 'http://HEADERMARK.example',
        cookie: 'session=COOKIEMARK',
      },
      localPort: SERVER_PORT,
      chunks: ['{"title":"BODYMARK"}'],
    });
    const lines: string[] = [];
    const { res, read } = createResponse();

    // Act
    createRefuse((line) => lines.push(line))(
      req,
      res,
      HTTP_BAD_REQUEST,
      refusalOf('body-not-json'),
    );

    // Assert: neither the answer nor the log line carries any of them.
    const written = `${read().raw}\n${lines.join('\n')}`;

    for (const mark of ['QUERYMARK', 'HEADERMARK', 'COOKIEMARK', 'BODYMARK']) {
      expect(written).not.toContain(mark);
    }

    // The positive control: the parts that ARE logged are there, so
    // this is not passing over an empty string.
    expect(written).toContain('body-not-json');
    expect(written).toContain('/__devtools/report');
  });
});

describe('what the pathname reader answers', () => {
  it('answers a bare path unchanged', () => {
    // Act + Assert
    expect(pathnameOf('/__devtools/report')).toBe('/__devtools/report');
  });

  it('cuts a query string off the path', () => {
    // Act + Assert
    expect(pathnameOf('/__devtools/status?round=q20b')).toBe(
      '/__devtools/status',
    );
  });

  it('cuts a fragment off the path', () => {
    // Act + Assert
    expect(pathnameOf('/__devtools/status#top')).toBe('/__devtools/status');
  });

  it('cuts at the first of the two, whichever came first', () => {
    // Act + Assert: a '#' inside the query is part of the fragment, and
    // either way the path ends where the first of them starts.
    expect(pathnameOf('/__devtools/status#a?b')).toBe('/__devtools/status');
  });
});

describe('what the body reader answers', () => {
  it('joins the chunks a body arrived in', async () => {
    // Arrange
    const { req } = fakeRequest({
      chunks: ['{"title":"a ', 'report","body":"why"}'],
    });

    // Act + Assert
    await expect(readBody(req)).resolves.toEqual({
      ok: true,
      value: { title: 'a report', body: 'why' },
    });
  });

  it('keeps a multi-byte character split across two chunks', async () => {
    // Arrange: the bytes of '{"title":"café"}', cut through the middle
    // of the 'é' - which is exactly what a decode-per-chunk reader
    // would answer 'caf��' for.
    const bytes = Buffer.from('{"title":"café"}', 'utf8');
    const cut = bytes.indexOf(0xc3) + 1;
    const { req } = fakeRequest({
      chunks: [bytes.subarray(0, cut), bytes.subarray(cut)],
    });

    // Act
    const read = await readBody(req);

    // Assert
    expect(read).toEqual({ ok: true, value: { title: 'café' } });
  });

  it('reads a body of exactly the cap', async () => {
    // Arrange: a JSON string whose encoded length is the cap to the
    // byte, so the size check is met with equality and not with room
    // to spare.
    const text = `"${'a'.repeat(DEVTOOLS_BODY_BYTES_MAX - 2)}"`;
    const { req } = fakeRequest({ chunks: [text] });

    // Act
    const read = await readBody(req);

    // Assert: the pair to the over-cap refusal above - the cap is the
    // largest body that IS read.
    expect(Buffer.byteLength(text, 'utf8')).toBe(DEVTOOLS_BODY_BYTES_MAX);
    expect(read.ok).toBe(true);
  });

  it('reads an empty JSON body', async () => {
    // Arrange: the shape a route with no payload still has to parse.
    const { req } = fakeRequest({ chunks: ['{}'] });

    // Act + Assert
    await expect(readBody(req)).resolves.toEqual({ ok: true, value: {} });
  });
});

describe('what the writers write', () => {
  it('answers JSON, uncached and unsniffable, with a trailing newline', () => {
    // Arrange
    const { res, read } = createResponse();

    // Act
    respond(res, HTTP_BAD_REQUEST, { status: 'refused' });

    // Assert
    const written = read();

    expect(written.statusCode).toBe(HTTP_BAD_REQUEST);
    expect(written.headers).toEqual({
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    expect(written.raw).toBe('{"status":"refused"}\n');
  });

  it('logs the method, the path and the rule, and answers the body', () => {
    // Arrange
    const { req } = fakeRequest({
      method: 'POST',
      url: '/__devtools/report?round=q20b',
      localPort: SERVER_PORT,
    });
    const lines: string[] = [];
    const { res, read } = createResponse();

    // Act
    createRefuse((line) => lines.push(line))(
      req,
      res,
      HTTP_FORBIDDEN,
      refusalOf('socket-unreadable'),
    );

    // Assert: one line, and the path in it is the pathname rather than
    // the target the request stated.
    expect(lines).toEqual([
      'devtools: refused POST /__devtools/report (socket-unreadable)',
    ]);

    const written = read();

    expect(written.statusCode).toBe(HTTP_FORBIDDEN);
    expect(JSON.parse(written.raw)).toEqual(refusalOf('socket-unreadable'));
    expect(written.headers['Cache-Control']).toBe('no-store');
  });

  it('logs a request that states neither method nor target', () => {
    // Arrange: both fallbacks at once.
    const { req } = fakeRequest();
    const lines: string[] = [];
    const { res } = createResponse();

    // Act
    createRefuse((line) => lines.push(line))(
      req,
      res,
      HTTP_BAD_REQUEST,
      refusalOf('body-not-json'),
    );

    // Assert
    expect(lines).toEqual(['devtools: refused a request  (body-not-json)']);
  });

  it('answers with no log sink configured', () => {
    // Arrange: the default - a plugin that was given no logger.
    const { req } = fakeRequest({ method: 'GET', url: '/__devtools/status' });
    const { res, read } = createResponse();

    // Act
    createRefuse()(req, res, HTTP_BAD_REQUEST, refusalOf('body-not-json'));

    // Assert: the refusal still reaches the caller.
    expect(read().statusCode).toBe(HTTP_BAD_REQUEST);
    expect(JSON.parse(read().raw)).toMatchObject({ rule: 'body-not-json' });
  });
});
