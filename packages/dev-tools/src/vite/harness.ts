/**
 * The fake filesystem, fake clock, fake command runner and fake
 * request/response shims that every node case driving an ASSEMBLED
 * middleware is built from.
 *
 * `./plugin.ts`'s `assembleDevTools` is the one function that produces a
 * `DevToolsMiddleware`, so every case that needs one goes through it the
 * same way: an in-memory filesystem that records what it was asked to
 * write and answers a fixed issue-form directory ({@link createFs}), a
 * clock stuck at one instant ({@link CLOCK}), a command runner that
 * answers as though there were no `git` on the `PATH` unless a case
 * scripts `remote get-url origin` (built inside {@link assemble}), and
 * the request/response pair a connect middleware is handed
 * ({@link fakeRequest}, {@link createResponse}, {@link runMiddleware}).
 *
 * ## Why this module exists, and why it carries no case of its own
 *
 * `./plugin.test.ts`'s close-out notes record the debt this module pays:
 * that file measured 799 of this package's 800-line cap once the
 * comment-route task landed — one line short of the room the following
 * task needed to add anything at all, let alone a second file's worth of
 * integration cases. Splitting `./plugin.test.ts` the way `./endpoint.ts`
 * was split is the other shape that debt could have taken; moving the
 * five functions those notes name by hand — `createFs`, `assemble`,
 * `fakeRequest`, `createResponse`, `runMiddleware` — here is the one this
 * package had no precedent for (`packages/service` names its equivalents
 * `*.fixtures.ts`, never colocated beside the module under test), so this
 * file is choosing a pattern rather than following one already in this
 * package.
 *
 * `vitest.config.ts`'s node project collects `src/vite/**\/*.test.ts`
 * only, so this file — named without a `.test.ts` suffix on purpose — is
 * never collected as a suite of its own; it is a plain module that
 * `./plugin.test.ts` and `./endpoint.integration.test.ts` both import
 * from, and a third file that needs the same fakes is free to import it
 * too rather than growing a third copy.
 *
 * ## What stayed behind in `./plugin.test.ts`
 *
 * Fixture DATA that is specific to one route — the issue-form YAML
 * strings, a report body builder, the base64 byte-count helper — is not
 * here: only the five functions above, and the constants they close
 * over (the clock's instant, the round, the loopback and LAN addresses,
 * the dev server's fake port and the same-origin headers built from it).
 * A case that needs route-specific fixture data builds its own, the way
 * `./endpoint.test.ts` already does for the "also affected" route.
 */

import type { DevToolsEndpointFs, DevToolsMiddleware } from './endpoint';
import type { DevToolsCommandRunner } from './git';
import type { DevToolsIncoming, DevToolsOutgoing } from './http';
import type {
  DevToolsAssembly,
  DevToolsPluginDeps,
  DevToolsPluginOptions,
} from './plugin';
import type { DevToolsClock } from './store';

import { assembleDevTools } from './plugin';
import { DEVTOOLS_ISSUE_FORM_DIR } from './templates';

/** One call {@link createFs} recorded. */
export interface RecordedWrite {
  /** Where it was written. */
  readonly path: string;

  /** What was written there. */
  readonly data: string | Uint8Array;
}

/** A filesystem that records writes and answers a fixed directory. */
export interface RecordingFs extends DevToolsEndpointFs {
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
 * @returns The recorder. Every case gets a fresh one, so a refusal's
 * "nothing was written" reads against a filesystem that saw nothing
 * else.
 */
export function createFs(
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
export const CLOCK: DevToolsClock = () => new Date(
  Date.UTC(2026, 8, 18, 12, 34, 56, 789),
);

/** What {@link CLOCK} spells as. */
export const STAMP = '20260918-123456-789';

/** The round every case is assembled with unless it states its own. */
export const ROUND = 'plugin-test';

/** The port the fake dev server answers on. */
export const SERVER_PORT = 5173;

/** The headers a page served by the dev server sends on a `POST`. */
export const SAME_ORIGIN_HEADERS: Readonly<Record<string, string>>
  = Object.freeze({
    origin: `http://localhost:${SERVER_PORT}`,
    host: `localhost:${SERVER_PORT}`,
  });

/** The loopback address every allowed request arrives from. */
export const LOOPBACK_ADDRESS = '127.0.0.1';

/** An address on the operator's network, not on loopback. */
export const LAN_ADDRESS = '192.168.1.24';

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
export function assemble(
  options: DevToolsPluginOptions = {},
  forms: Readonly<Record<string, string>> | null = null,
  remote?: string,
): { readonly assembly: DevToolsAssembly; readonly fs: RecordingFs } {
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
export interface FakeRequestInit {
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
export function fakeRequest(init: FakeRequestInit): DevToolsIncoming {
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

/** What the middleware wrote to a fake response. */
export interface RecordedResponse {
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
export function createResponse(): {
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
export function runMiddleware(
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
