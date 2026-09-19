import type { DevToolsMiddleware } from './endpoint';
import type { ReportGateway, ReportGatewayFileOutcome } from './gateway';
import type { DevToolsIncoming, DevToolsOutgoing } from './http';
import type { DevToolsPluginDeps, DevToolsPluginOptions } from './plugin';
import type { DevToolsClock, DevToolsStoreFs } from './store';

import { Buffer } from 'node:buffer';

import { describe, expect, it } from 'vitest';

import {
  DEVTOOLS_GATEWAY_NONE,
  DEVTOOLS_REPORT_PATH,
  DEVTOOLS_STATUS_PATH,
} from './endpoint';
import { DEVTOOLS_UNKNOWN_BUILD_VALUE } from './git';
import { assembleDevTools, devtoolsPlugin } from './plugin';
import { DEVTOOLS_DEFAULT_OUT_DIR } from './store';

/**
 * ## What this file drives, and why it is the one with cases over
 * `./endpoint.ts`
 *
 * `createDevToolsEndpoint` is reached one way only — through this
 * module's `assembleDevTools` — so the cases that exercise the
 * middleware are the assembled ones, and `./endpoint.ts`'s own header
 * says why they live here rather than beside it.
 *
 * Every case below hands `assembleDevTools` an in-memory filesystem, a
 * clock stuck at one instant, and a command runner that answers as
 * though there were no `git` on the `PATH` at all. So nothing here
 * writes to a real directory, nothing spawns a process, and the round
 * this file asserts on is the plugin option alone — `resolveDevToolsBuildInfo`
 * falls back to it because the scripted runner refuses every command.
 *
 * ## The order
 *
 * The five refusals run first, in spec item 8.5's order — bad body,
 * over-length, oversize attachment, cross-origin, LAN without
 * `allowLan` — each asserting the status code, the rule, and that the
 * filesystem recorded neither a directory nor a write. Then the status
 * payload, then a stored report, then a configured gateway. The stored
 * report is the one accepting case in the file and is also this file's
 * positive control: it is the same same-origin, loopback, well-formed
 * request the refusals above are variations of, and it is the one that
 * writes.
 */

/** One call the recorder saw. */
interface RecordedWrite {
  /** Where it was written. */
  readonly path: string;

  /** What was written there. */
  readonly data: string | Uint8Array;
}

/** A filesystem that records instead of writing. */
interface RecordingFs extends DevToolsStoreFs {
  /** Every directory `mkdir` was asked for, in order. */
  readonly directories: readonly string[];

  /** Every file `writeFile` was asked for, in order. */
  readonly writes: readonly RecordedWrite[];
}

/**
 * Build a filesystem that records every write instead of making one.
 *
 * @returns The recorder. Every case below gets a fresh one, so a
 * refusal's "nothing was written" reads against a filesystem that saw
 * nothing else.
 */
function createFs(): RecordingFs {
  const directories: string[] = [];
  const writes: RecordedWrite[] = [];

  return {
    directories,
    writes,
    async mkdir(path: string) {
      directories.push(path);

      return undefined;
    },
    async writeFile(path: string, data: string | Uint8Array) {
      writes.push({ path, data });
    },
  };
}

/** The instant every case is stamped with: 2026-09-18T12:34:56.789Z. */
const CLOCK: DevToolsClock = () => new Date(
  Date.UTC(2026, 8, 18, 12, 34, 56, 789),
);

/** What {@link CLOCK} spells as. */
const STAMP = '20260918-123456-789';

/** The round every case is assembled with, stated as a plugin option. */
const ROUND = 'plugin-test';

/** The port the fake dev server answers on. */
const SERVER_PORT = 5173;

/** The headers a page served by the dev server sends on a POST. */
const SAME_ORIGIN_HEADERS: Readonly<Record<string, string>> = Object.freeze({
  origin: `http://localhost:${SERVER_PORT}`,
  host: `localhost:${SERVER_PORT}`,
});

/** The loopback address every allowed request arrives from. */
const LOOPBACK_ADDRESS = '127.0.0.1';

/** An address on the operator's network, not on loopback. */
const LAN_ADDRESS = '192.168.1.24';

/**
 * Assemble the middleware over a fresh recording filesystem.
 *
 * @param options - The plugin's options; `round` defaults to
 * {@link ROUND} so every case's paths are exact.
 * @returns The assembly and the filesystem it was given.
 */
function assemble(
  options: DevToolsPluginOptions = {},
): { readonly assembly: ReturnType<typeof assembleDevTools>; readonly fs: RecordingFs } {
  const fs = createFs();
  const deps: DevToolsPluginDeps = {
    fs,
    now: CLOCK,
    // No repository at all: every command is refused, so the commit
    // and the branch resolve to unknown and the round comes from the
    // option above rather than from a branch this file would have to
    // fake a checkout for.
    run: () => ({ ok: false }),
    env: {},
    protocol: 'http:',
  };

  return { assembly: assembleDevTools({ round: ROUND, ...options }, deps), fs };
}

/** What one fake request needs stated. */
interface FakeRequestInit {
  /** The request method. */
  readonly method: string;

  /** The request target. */
  readonly url: string;

  /** The request headers; defaults to none. */
  readonly headers?: Readonly<Record<string, string>>;

  /** The socket's peer address, absent when the socket cannot say. */
  readonly remoteAddress?: string;

  /** The local end's port; absent when the socket cannot say. */
  readonly localPort?: number;

  /** The raw body, sent as a single chunk; absent for no body at all. */
  readonly body?: string;
}

/**
 * Build a request the middleware can read, body included.
 *
 * @param init - The method, path, headers, socket facts and body.
 * @returns A request satisfying `DevToolsIncoming`.
 */
function fakeRequest(init: FakeRequestInit): DevToolsIncoming {
  const chunks = init.body === undefined
    ? []
    : [init.body];

  return {
    method: init.method,
    url: init.url,
    headers: init.headers ?? {},
    socket: {
      remoteAddress: init.remoteAddress,
      localPort: init.localPort,
    },
    async *[Symbol.asyncIterator]() {
      yield* chunks;
    },
  };
}

/**
 * Build a `POST /__devtools/report` request from the dev server's own
 * origin, over loopback.
 *
 * The shape every case above the LAN and the cross-origin refusals
 * needs, so that a body is what refuses the request rather than the
 * two checks that run before it ever gets read.
 *
 * @param body - The raw request body.
 * @param headers - The headers to send; defaults to a same-origin pair.
 * @returns The request.
 */
function reportRequest(
  body: string,
  headers: Readonly<Record<string, string>> = SAME_ORIGIN_HEADERS,
): DevToolsIncoming {
  return fakeRequest({
    method: 'POST',
    url: DEVTOOLS_REPORT_PATH,
    headers,
    remoteAddress: LOOPBACK_ADDRESS,
    localPort: SERVER_PORT,
    body,
  });
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
 * The middleware's own contract is synchronous — `./plugin.ts`'s header
 * says the async work inside it is launched rather than awaited — so a
 * case awaits this instead of the call itself. It resolves the moment a
 * response is written, or immediately when the request falls through to
 * `next()`.
 *
 * @param handler - The assembled middleware.
 * @param req - The request to hand it.
 * @param res - The response to hand it.
 * @returns Once the middleware has finished with this request.
 */
function runMiddleware(
  handler: DevToolsMiddleware,
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

/**
 * Spell a base64 string of an exact decoded byte count, without
 * allocating the bytes it stands for.
 *
 * @param bytes - How many bytes it should decode to.
 * @returns Standard padded base64 of that length.
 */
function base64OfBytes(bytes: number): string {
  const padding = (3 - (bytes % 3)) % 3;
  const groups = (bytes + padding) / 3;

  return `${'A'.repeat(groups * 4 - padding)}${'='.repeat(padding)}`;
}

/** Spec item 8.3's attachment limit, read as mebibytes — see `./report.ts`. */
const ATTACHMENT_BYTES_MAX = 5 * 1024 * 1024;

/** A report body with no attachment, valid everywhere but its title. */
function reportBody(fields: {
  readonly title?: string;
  readonly attachments?: readonly unknown[];
} = {}): string {
  return JSON.stringify({
    feature: 'feedback',
    title: fields.title ?? 'A short title',
    body: 'A body describing the issue.',
    context: { route: '/lexicon' },
    ...(fields.attachments === undefined
      ? {}
      : { attachments: fields.attachments }),
  });
}

describe('the refusals spec item 8.5 orders first', () => {
  it('refuses a body that is not JSON', async () => {
    // Arrange: same origin, over loopback — everything but the body is
    // in order, so the body is what refuses this request.
    const { assembly, fs } = assemble();
    const { res, read } = createResponse();

    // Act
    await runMiddleware(
      assembly.handler,
      reportRequest('not json at all'),
      res,
    );

    // Assert
    expect(read().statusCode).toBe(400);
    expect(read().body).toMatchObject({
      status: 'refused',
      rule: 'body-not-json',
    });
    expect(fs.directories).toEqual([]);
    expect(fs.writes).toEqual([]);
  });

  it('refuses a title over 120 characters', async () => {
    // Arrange
    const { assembly, fs } = assemble();
    const { res, read } = createResponse();

    // Act
    await runMiddleware(
      assembly.handler,
      reportRequest(reportBody({ title: 'x'.repeat(121) })),
      res,
    );

    // Assert
    expect(read().statusCode).toBe(400);
    expect(read().body).toMatchObject({
      status: 'refused',
      rule: 'body.title',
    });
    expect(fs.directories).toEqual([]);
    expect(fs.writes).toEqual([]);
  });

  it('refuses an attachment over 5 MB', async () => {
    // Arrange: one byte past the boundary `./report.ts` enforces.
    const { assembly, fs } = assemble();
    const { res, read } = createResponse();
    const body = reportBody({
      attachments: [{
        name: 'shot.png',
        mime: 'image/png',
        base64: base64OfBytes(ATTACHMENT_BYTES_MAX + 1),
      }],
    });

    // Act
    await runMiddleware(assembly.handler, reportRequest(body), res);

    // Assert
    expect(read().statusCode).toBe(400);
    expect(read().body).toMatchObject({
      status: 'refused',
      rule: 'body.attachments.0.base64',
    });
    expect(fs.directories).toEqual([]);
    expect(fs.writes).toEqual([]);
  });

  it('refuses a cross-origin POST', async () => {
    // Arrange: a Host naming the dev server, and an Origin naming
    // somewhere else entirely — the shape of a page on another origin
    // posting through the operator's own browser.
    const { assembly, fs } = assemble();
    const { res, read } = createResponse();
    const headers = Object.freeze({
      origin: 'http://attacker.example:5173',
      host: `localhost:${SERVER_PORT}`,
    });

    // Act
    await runMiddleware(
      assembly.handler,
      reportRequest(reportBody(), headers),
      res,
    );

    // Assert
    expect(read().statusCode).toBe(403);
    expect(read().body).toMatchObject({
      status: 'refused',
      rule: 'origin-mismatch',
    });
    expect(fs.directories).toEqual([]);
    expect(fs.writes).toEqual([]);
  });

  it('refuses a non-loopback remote address without allowLan', async () => {
    // Arrange: allowLan is not stated, so it defaults to false, and the
    // request arrives from a machine on the operator's own network
    // rather than from loopback.
    const { assembly, fs } = assemble();
    const { res, read } = createResponse();

    // Act
    await runMiddleware(
      assembly.handler,
      fakeRequest({
        method: 'POST',
        url: DEVTOOLS_REPORT_PATH,
        headers: SAME_ORIGIN_HEADERS,
        remoteAddress: LAN_ADDRESS,
        localPort: SERVER_PORT,
        body: reportBody(),
      }),
      res,
    );

    // Assert
    expect(read().statusCode).toBe(403);
    expect(read().body).toMatchObject({
      status: 'refused',
      rule: 'remote-not-loopback',
    });
    expect(fs.directories).toEqual([]);
    expect(fs.writes).toEqual([]);
  });
});

describe('the status payload', () => {
  it('answers commit, branch, round, persistence and gateway', async () => {
    // Arrange: GET carries no Origin on a same-origin request, so only
    // the loopback check applies here — see `./endpoint.ts`'s header
    // for why.
    const { assembly } = assemble();
    const { res, read } = createResponse();

    // Act
    await runMiddleware(
      assembly.handler,
      fakeRequest({
        method: 'GET',
        url: DEVTOOLS_STATUS_PATH,
        remoteAddress: LOOPBACK_ADDRESS,
      }),
      res,
    );

    // Assert: no repository, so commit and branch are unknown; the
    // round is the plugin option; no gateway is configured.
    expect(read().statusCode).toBe(200);
    expect(read().body).toEqual({
      commit: DEVTOOLS_UNKNOWN_BUILD_VALUE,
      branch: DEVTOOLS_UNKNOWN_BUILD_VALUE,
      round: ROUND,
      persistence: false,
      gateway: DEVTOOLS_GATEWAY_NONE,
    });
  });
});

describe('a stored report', () => {
  it('writes the report and its attachment, and answers the path', async () => {
    // Arrange: the accepting case every refusal above varies away from.
    const { assembly, fs } = assemble();
    const { res, read } = createResponse();
    const attachmentText = 'attachment contents';
    const body = reportBody({
      attachments: [{
        name: 'note.txt',
        mime: 'text/plain',
        base64: Buffer.from(attachmentText, 'utf8').toString('base64'),
      }],
    });

    // Act
    await runMiddleware(assembly.handler, reportRequest(body), res);

    // Assert: the response names the stored path, and nothing else.
    const directory = `${DEVTOOLS_DEFAULT_OUT_DIR}/${ROUND}`;
    const slug = 'a-short-title';
    const reportPath = `${directory}/${STAMP}-${slug}.json`;
    const attachmentPath = `${directory}/${STAMP}-${slug}-1-note.txt`;

    expect(read().statusCode).toBe(200);
    expect(read().body).toEqual({ status: 'stored', path: reportPath });

    // ...and the two files are actually on the injected disk, the
    // attachment written before the JSON that names it.
    expect(fs.directories).toEqual([directory]);
    expect(fs.writes.map((write) => write.path)).toEqual([
      attachmentPath,
      reportPath,
    ]);
    expect(Buffer.from(fs.writes[0]?.data ?? '').toString('utf8'))
      .toBe(attachmentText);

    const written = JSON.parse(String(fs.writes[1]?.data)) as {
      readonly attachments: readonly Record<string, unknown>[];
    };

    expect(written.attachments).toEqual([{
      name: 'note.txt',
      mime: 'text/plain',
      bytes: attachmentText.length,
      file: `${STAMP}-${slug}-1-note.txt`,
    }]);
  });
});

describe('a configured gateway', () => {
  it('is handed the stored report, and its answer reaches the caller', async () => {
    // Arrange: a gateway that records what it was filed and answers a
    // fixed outcome.
    const filed: ReportGatewayFileOutcome = Object.freeze({
      status: 'filed' as const,
      tracker: 'local',
      id: '42',
    });
    let received: unknown;
    const gateway: ReportGateway = {
      name: 'test-gateway',
      file: async (report) => {
        received = report;

        return filed;
      },
      search: async () => Object.freeze({ status: 'matches' as const, matches: [] }),
      comment: async () => filed,
    };
    const { assembly, fs } = assemble({ gateway });
    const { res, read } = createResponse();

    // Act
    await runMiddleware(
      assembly.handler,
      reportRequest(reportBody({ title: 'Gateway report' })),
      res,
    );

    // Assert: the path the store wrote to is the one the gateway saw,
    // and the gateway's own answer reaches the response beside it.
    const reportPath
      = `${DEVTOOLS_DEFAULT_OUT_DIR}/${ROUND}/${STAMP}-gateway-report.json`;

    expect(read().statusCode).toBe(200);
    expect(read().body).toEqual({
      status: 'stored',
      path: reportPath,
      gateway: filed,
    });
    expect(received).toMatchObject({ path: reportPath, round: ROUND });
    expect(fs.writes.map((write) => write.path)).toEqual([reportPath]);
  });
});

describe('the plugin itself', () => {
  it('registers for serve only', () => {
    // Arrange + Act + Assert: decision 7's whole production story — see
    // `./plugin.ts`'s header for why `apply: 'serve'` is what keeps
    // every define and both endpoints out of `vite build`.
    expect(devtoolsPlugin().apply).toBe('serve');
  });
});
