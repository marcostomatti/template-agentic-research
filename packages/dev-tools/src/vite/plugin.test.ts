import type { DevToolsEndpointFs, DevToolsMiddleware } from './endpoint';
import type { ReportGateway, ReportGatewayFileOutcome } from './gateway';
import type { DevToolsCommandRunner } from './git';
import type { DevToolsIncoming, DevToolsOutgoing } from './http';
import type { DevToolsPluginDeps, DevToolsPluginOptions } from './plugin';
import type { DevToolsClock } from './store';

import { Buffer } from 'node:buffer';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { REPORT_TEMPLATE_DEVTOOLS_DEFAULTS } from '../core/reportTemplate';

import {
  DEVTOOLS_GATEWAY_NONE,
  DEVTOOLS_REPORT_PATH,
  DEVTOOLS_STATUS_PATH,
  DEVTOOLS_TEMPLATE_MODULE,
  DEVTOOLS_TEMPLATES_PATH,
} from './endpoint';
import { DEVTOOLS_UNKNOWN_BUILD_VALUE } from './git';
import { assembleDevTools, devtoolsPlugin } from './plugin';
import { DEVTOOLS_DEFAULT_OUT_DIR } from './store';
import { DEVTOOLS_ISSUE_FORM_DIR } from './templates';

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
 * though there were no `git` on the `PATH` at all — except the one
 * status case that scripts `git remote get-url origin`. So nothing
 * here writes to a real directory, nothing spawns a process, and the
 * round this file asserts on is the plugin option alone —
 * `resolveDevToolsBuildInfo` falls back to it because the scripted
 * runner refuses every command it is not given an answer for.
 *
 * ## The order
 *
 * The five refusals run first, in spec item 8.5's order — bad body,
 * over-length, oversize attachment, cross-origin, LAN without
 * `allowLan` — each asserting the status code, the rule, and that the
 * filesystem recorded neither a directory nor a write. Then the two
 * the templates route adds: the wrong method, and a caller off
 * loopback with no `allowLan`. Then the accepting cases — the status
 * payload, the templates, a stored report, a configured gateway.
 *
 * ## What each refusal's control is
 *
 * "The answer is not a stored report" and "the answer is not a
 * template list" are both satisfied by a middleware answering nothing
 * at all, so neither reading stands alone. The stored report is the
 * control for the five body and origin refusals — the same
 * same-origin, loopback, well-formed request they vary away from — and
 * `answers the issue forms it read` is the control for the two
 * templates refusals, varying only the method and the address.
 */

/** One call the recorder saw. */
interface RecordedWrite {
  /** Where it was written. */
  readonly path: string;

  /** What was written there. */
  readonly data: string | Uint8Array;
}

/** A filesystem that records writes and answers a fixed directory. */
interface RecordingFs extends DevToolsEndpointFs {
  /** Every directory `mkdir` was asked for, in order. */
  readonly directories: readonly string[];

  /** Every file `writeFile` was asked for, in order. */
  readonly writes: readonly RecordedWrite[];
}

/**
 * Build a filesystem that records every write instead of making one,
 * and answers one in-memory issue-form directory.
 *
 * @param forms - Bare filenames under {@link DEVTOOLS_ISSUE_FORM_DIR}
 * to their text, or `null` for a directory that does not exist — which
 * is how the empty-list reading is spelled, with no path to arrange.
 * @returns The recorder. Every case below gets a fresh one, so a
 * refusal's "nothing was written" reads against a filesystem that saw
 * nothing else.
 */
function createFs(
  forms: Readonly<Record<string, string>> | null = null,
): RecordingFs {
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
    readdir: (path: string): Promise<readonly string[]> => (
      forms === null || path !== DEVTOOLS_ISSUE_FORM_DIR
        ? Promise.reject(new Error(`ENOENT: ${path}`))
        : Promise.resolve(Object.keys(forms))
    ),
    readFile: (path: string): Promise<string> => {
      const text = forms?.[path.slice(DEVTOOLS_ISSUE_FORM_DIR.length + 1)];

      return text === undefined
        ? Promise.reject(new Error(`ENOENT: ${path}`))
        : Promise.resolve(text);
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
 * @param forms - The issue forms on the injected disk; see
 * {@link createFs}.
 * @param remote - What `git remote get-url origin` answers, when a
 * case scripts one.
 * @returns The assembly and the filesystem it was given.
 */
function assemble(
  options: DevToolsPluginOptions = {},
  forms: Readonly<Record<string, string>> | null = null,
  remote?: string,
): { readonly assembly: ReturnType<typeof assembleDevTools>; readonly fs: RecordingFs } {
  const fs = createFs(forms);
  // No repository unless a case scripts one: every command is refused,
  // so the commit and the branch resolve to unknown and the round comes
  // from the option above rather than from a branch this file would
  // have to fake a checkout for.
  const run: DevToolsCommandRunner = (args) => (
    args[0] === 'remote' && remote !== undefined
      ? { ok: true, stdout: `${remote}\n` }
      : { ok: false }
  );
  const deps: DevToolsPluginDeps = {
    fs,
    now: CLOCK,
    run,
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

/** An issue form mapping onto exactly one text field. */
const BUG_FORM = `name: Bug report
description: Something in the app behaves wrong.
body:
  - type: input
    id: what-happened
    attributes:
      label: What happened
    validations:
      required: true
`;

/** A second form, so a case can prove which one an option picked. */
const UI_FORM = `name: UI feedback
description: Something on screen looks wrong.
body:
  - type: input
    id: what-looks-wrong
    attributes:
      label: What looks wrong
`;

/** What {@link BUG_FORM} reaches a caller as; the id is the filename. */
const BUG_TEMPLATE = Object.freeze({
  id: 'bug-report',
  name: 'Bug report',
  description: 'Something in the app behaves wrong.',
  module: DEVTOOLS_TEMPLATE_MODULE,
  fields: [{
    id: 'what-happened',
    kind: 'text',
    label: 'What happened',
    required: true,
  }],
  devtools: REPORT_TEMPLATE_DEVTOOLS_DEFAULTS,
});

/**
 * Build a request for the templates route.
 *
 * @param method - The method to send; the route answers `GET`.
 * @param remoteAddress - The peer address; loopback is the allowed one.
 * @returns The request. Those two are what this route's own refusals
 * read, so they are the only things a case varies.
 */
function templatesRequest(
  method = 'GET',
  remoteAddress: string = LOOPBACK_ADDRESS,
): DevToolsIncoming {
  return fakeRequest({
    method,
    url: DEVTOOLS_TEMPLATES_PATH,
    remoteAddress,
    localPort: SERVER_PORT,
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

describe('the refusals the templates route adds', () => {
  it('refuses a POST to the templates route', async () => {
    // Arrange: over loopback, with forms on the injected disk, so the
    // METHOD is the only thing wrong with this request.
    const { assembly } = assemble({}, { 'bug-report.yml': BUG_FORM });
    const { res, read } = createResponse();

    // Act
    await runMiddleware(assembly.handler, templatesRequest('POST'), res);

    // Assert
    expect(read().statusCode).toBe(405);
    expect(read().body).toMatchObject({
      status: 'refused',
      rule: 'method-not-allowed',
    });
  });

  it('refuses a non-loopback caller without allowLan', async () => {
    // Arrange: allowLan is not stated, so it defaults to false.
    const { assembly } = assemble({}, { 'bug-report.yml': BUG_FORM });
    const { res, read } = createResponse();

    // Act
    await runMiddleware(
      assembly.handler,
      templatesRequest('GET', LAN_ADDRESS),
      res,
    );

    // Assert
    expect(read().statusCode).toBe(403);
    expect(read().body).toMatchObject({
      status: 'refused',
      rule: 'remote-not-loopback',
    });
  });
});

describe('the templates route', () => {
  it('answers the issue forms it read', async () => {
    // Arrange: the control for both refusals above — same route, same
    // filesystem, same assembly, over loopback with the right method.
    const { assembly } = assemble({}, { 'bug-report.yml': BUG_FORM });
    const { res, read } = createResponse();

    // Act
    await runMiddleware(assembly.handler, templatesRequest(), res);

    // Assert: the bare list the browser half validates.
    expect(read().statusCode).toBe(200);
    expect(read().body).toEqual([BUG_TEMPLATE]);
  });

  it('answers an empty list where no template directory exists', async () => {
    // Arrange: `forms` defaults to null, so `readdir` rejects the way
    // it does on a checkout with no `.github/ISSUE_TEMPLATE/`.
    const { assembly } = assemble();
    const { res, read } = createResponse();

    // Act
    await runMiddleware(assembly.handler, templatesRequest(), res);

    // Assert: answered, not refused — a missing directory is no
    // failure of the dev server's.
    expect(read().statusCode).toBe(200);
    expect(read().body).toEqual([]);
  });

  it('reads the paths the templates option names, not the directory', async () => {
    // Arrange: two forms on disk, and an option naming one of them.
    const { assembly } = assemble(
      { templates: [join(DEVTOOLS_ISSUE_FORM_DIR, 'ui-feedback.yml')] },
      { 'bug-report.yml': BUG_FORM, 'ui-feedback.yml': UI_FORM },
    );
    const { res, read } = createResponse();

    // Act
    await runMiddleware(assembly.handler, templatesRequest(), res);

    // Assert: the named one alone — the whole shape of a template is
    // pinned by the case above, so this one reads the ids, which is
    // what proves the option reached the reader rather than the
    // directory listing that would have answered both.
    const answered = read().body as readonly { readonly id: string }[];

    expect(read().statusCode).toBe(200);
    expect(answered.map((template) => template.id)).toEqual(['ui-feedback']);
  });
});

describe('the status payload', () => {
  it('answers commit, branch, round, persistence, gateway and repo', async () => {
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

    // Assert: no repository, so commit, branch and repo are unknown;
    // the round is the plugin option; no gateway is configured.
    expect(read().statusCode).toBe(200);
    expect(read().body).toEqual({
      commit: DEVTOOLS_UNKNOWN_BUILD_VALUE,
      branch: DEVTOOLS_UNKNOWN_BUILD_VALUE,
      round: ROUND,
      persistence: false,
      gateway: DEVTOOLS_GATEWAY_NONE,
      repo: DEVTOOLS_UNKNOWN_BUILD_VALUE,
    });
  });

  it('names the repository the origin remote points at', async () => {
    // Arrange: the control for the `repo: unknown` above — a payload
    // hard-wired to `unknown` passes that case and fails this one. The
    // runner answers the remote alone, so commit stays unknown.
    const { assembly } = assemble({}, null, 'git@github.com:acme/widgets.git');
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

    // Assert: the slug alone, with the `.git` suffix dropped.
    expect(read().statusCode).toBe(200);
    expect(read().body).toMatchObject({
      commit: DEVTOOLS_UNKNOWN_BUILD_VALUE,
      repo: 'acme/widgets',
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
    // every define and all three endpoints out of `vite build`.
    expect(devtoolsPlugin().apply).toBe('serve');
  });
});
