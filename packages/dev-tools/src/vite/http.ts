/**
 * The request plumbing every dev-tools route sits on: the pathname
 * reader, the capped body reader, the server-origin reader, and the two
 * writers every answer leaves through.
 *
 * `./endpoint.ts` is the module that routes and that handles a route;
 * this is everything it does to a request or a response that is not a
 * routing decision. The split is what lets `./endpoint.ts` be read as
 * routing alone, and it is what lets the readers and writers below be
 * driven directly by `./http.test.ts`: none of them needs an assembled
 * plugin, a filesystem or a clock, so a case there is an object literal
 * and an assertion. `./endpoint.ts`'s own cases are split across
 * `./plugin.test.ts` and `./endpoint.test.ts` on whether they need an
 * assembly to resolve a build value; that module's header has the
 * rule.
 *
 * ## What every response looks like
 *
 * JSON, always, with `Cache-Control: no-store` and
 * `X-Content-Type-Options: nosniff`. {@link respond} is the only place
 * those three headers are set, so no route can answer without them.
 *
 * A refusal is a {@link DevToolsRefusalBody}: `{status: 'refused',
 * rule, reason}`, where `reason` is a fixed sentence and never a value
 * the request carried. The rules this module owns are
 * {@link DevToolsEndpointRule} and their sentences are frozen in one
 * table here; `./origin.ts`, `./report.ts`, `./comment.ts`,
 * `./store.ts` and `./endpoint.ts` carry their own rule names and their
 * own sentences, and a refusal from one of them is answered with that
 * name rather than remapped onto this set.
 *
 * ## Why the rule union is still called `DevToolsEndpointRule`
 *
 * It moved here with the writers that answer it and the name stayed
 * behind it: `./index.ts` — the package's `./vite` entry — re-exports
 * the union, so the name belongs to that entry's surface rather than to
 * this file, and renaming it would cost a consuming `vite.config.ts` an
 * edit in exchange for nothing a reader gains.
 */

import type { DevToolsServerOrigin } from './origin';
import type { IncomingHttpHeaders } from 'node:http';

import { Buffer } from 'node:buffer';

/**
 * The most raw request body that is buffered, in bytes.
 *
 * 24 MiB, which is spec item 8.3's limits read as the largest body they
 * admit: three attachments of 5 MiB is 15 MiB of bytes, base64 inflates
 * that by four thirds to 20 MiB, and the rest is the JSON envelope, the
 * 5,000-character `body` and a `context`. The cap is checked per chunk,
 * so a body over it is abandoned rather than held.
 *
 * `./report.ts` is the authority on what is ACCEPTED; this is only the
 * bound on what is READ, so the two cannot disagree about a limit.
 */
export const DEVTOOLS_BODY_BYTES_MAX = 24 * 1024 * 1024;

/** A request that was answered. */
export const HTTP_OK = 200;

/** A body the endpoint could not accept. */
export const HTTP_BAD_REQUEST = 400;

/** A request from somewhere the endpoint does not act for. */
export const HTTP_FORBIDDEN = 403;

/** The right path, the wrong method. */
export const HTTP_METHOD_NOT_ALLOWED = 405;

/** A body over {@link DEVTOOLS_BODY_BYTES_MAX}. */
export const HTTP_CONTENT_TOO_LARGE = 413;

/** The endpoint's own fault: a failed write, a clock, a thrown error. */
export const HTTP_SERVER_ERROR = 500;

/**
 * Which rule refused, for the refusals this plumbing owns.
 *
 * `./origin.ts`, `./report.ts`, `./comment.ts`, `./store.ts` and
 * `./endpoint.ts` each carry their own rule names, and a refusal from
 * one of them is answered with that name rather than remapped onto
 * this set.
 */
export type DevToolsEndpointRule =
  | 'method-not-allowed'
  | 'socket-unreadable'
  | 'body-too-large'
  | 'body-unreadable'
  | 'body-not-json'
  | 'endpoint-failed';

/** The fixed explanation each of these rules answers with. */
const REASONS: Readonly<Record<DevToolsEndpointRule, string>> = Object.freeze({
  'method-not-allowed':
    'This dev-tools endpoint does not answer that method.',
  'socket-unreadable':
    'The local port of this request is unknown, so the request cannot '
    + 'be held to the dev server own origin.',
  'body-too-large':
    'The request body is larger than the endpoint reads.',
  'body-unreadable':
    'The request body could not be read to the end.',
  'body-not-json':
    'The request body is not JSON.',
  'endpoint-failed':
    'The dev-tools endpoint failed while answering this request.',
});

/** What a refused request is answered with. */
export interface DevToolsRefusalBody {
  /** Always `'refused'`; the discriminant. */
  readonly status: 'refused';

  /**
   * Which rule refused — one of {@link DevToolsEndpointRule},
   * `./origin.ts`'s `DevToolsRequestRule`, `./store.ts`'s
   * `DevToolsStoreRule`, `./endpoint.ts`'s `gateway-absent`, or
   * `body.<field path>` for `./report.ts` and `./comment.ts`.
   */
  readonly rule: string;

  /** A fixed explanation, carrying no value the request sent. */
  readonly reason: string;
}

/** What a node socket has to say about where a request came from. */
export interface DevToolsSocketFacts {
  /** The peer's address, absent when the socket has closed. */
  readonly remoteAddress?: string | undefined;

  /** The local end's port, which is the port the server listens on. */
  readonly localPort?: number | undefined;
}

/**
 * The part of a request this package reads.
 *
 * Structural rather than node's `IncomingMessage`, so a case builds one
 * as an object literal with an async generator for a body. The real
 * `IncomingMessage` satisfies it — `server.middlewares.use(handler)` in
 * `./plugin.ts` is the compile-time proof.
 */
export interface DevToolsIncoming extends AsyncIterable<unknown> {
  /** The request method, upper-case as node hands it over. */
  readonly method?: string | undefined;

  /** The request target: path, and query if there is one. */
  readonly url?: string | undefined;

  /** The headers, lower-cased as node hands them over. */
  readonly headers: IncomingHttpHeaders;

  /** The connection the request arrived on. */
  readonly socket: DevToolsSocketFacts;
}

/** The part of a response this package writes. */
export interface DevToolsOutgoing {
  /** The status code, set before the body. */
  statusCode: number;

  /**
   * Set one response header.
   *
   * @param name - The header name.
   * @param value - Its value.
   * @returns Whatever the implementation answers, which is ignored.
   */
  setHeader(name: string, value: string): unknown;

  /**
   * Write the whole body and finish.
   *
   * @param chunk - The body; always a string here, because every
   * response this package writes is JSON.
   * @returns Whatever the implementation answers, which is ignored.
   */
  end(chunk: string): unknown;
}

/**
 * Refuse one request: log the rule, answer the fixed reason.
 *
 * @param req - The request, for the method and path in the log line.
 * @param res - The response to write.
 * @param code - The status code.
 * @param body - The refusal.
 */
export type DevToolsRefuse = (
  req: DevToolsIncoming,
  res: DevToolsOutgoing,
  code: number,
  body: DevToolsRefusalBody,
) => void;

/**
 * Build the refusal body for one of this module's rules.
 *
 * @param rule - Which rule refused.
 * @returns The body, frozen.
 */
export function refusalOf(rule: DevToolsEndpointRule): DevToolsRefusalBody {
  return Object.freeze({
    status: 'refused' as const,
    rule,
    reason: REASONS[rule],
  });
}

/**
 * Read the path a request is addressed to.
 *
 * @param url - `req.url`, path and query.
 * @returns The pathname, or `null` when there is no usable one — which
 * reads as "not our path" and falls through to `next()`.
 */
export function pathnameOf(url: string | undefined): string | null {
  if (typeof url !== 'string' || !url.startsWith('/')) {
    return null;
  }

  const cut = url.search(/[?#]/);

  if (cut === -1) {
    return url;
  }

  return url.slice(0, cut);
}

/**
 * Turn one body chunk into bytes.
 *
 * @param chunk - Whatever the request iterated.
 * @returns Its bytes, or `null` when it is neither a string nor a byte
 * view — a stream shape this module will not guess at.
 */
function bytesOf(chunk: unknown): Uint8Array | null {
  if (typeof chunk === 'string') {
    return Buffer.from(chunk, 'utf8');
  }

  if (chunk instanceof Uint8Array) {
    return chunk;
  }

  return null;
}

/** What {@link readBody} answers. */
export type DevToolsBodyRead =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly rule: DevToolsEndpointRule };

/**
 * Read a request body to the end, capped, and parse it as JSON.
 *
 * Bytes are concatenated and decoded ONCE, so a multi-byte character
 * split across two chunks survives. Leaving the loop early closes the
 * stream, which is what stops an oversize body being buffered.
 *
 * @param req - The request to drain.
 * @returns The parsed JSON, or the rule that refused it.
 */
export async function readBody(
  req: DevToolsIncoming,
): Promise<DevToolsBodyRead> {
  const chunks: Uint8Array[] = [];
  let size = 0;

  try {
    for await (const chunk of req) {
      const bytes = bytesOf(chunk);

      if (bytes === null) {
        return { ok: false, rule: 'body-unreadable' };
      }

      size += bytes.length;

      if (size > DEVTOOLS_BODY_BYTES_MAX) {
        return { ok: false, rule: 'body-too-large' };
      }

      chunks.push(bytes);
    }
  } catch {
    return { ok: false, rule: 'body-unreadable' };
  }

  try {
    return { ok: true, value: JSON.parse(Buffer.concat(chunks).toString()) };
  } catch {
    return { ok: false, rule: 'body-not-json' };
  }
}

/**
 * Read the dev server's own origin off the accepted connection.
 *
 * The port is the local end of the ACCEPTED connection rather than
 * `server.config.server.port`, which is the port that was asked for:
 * with `strictPort` off Vite moves to the next free one, and a
 * comparison against the configured number would then refuse every
 * request.
 *
 * @param req - The request, for its socket.
 * @param protocol - The scheme the dev server answers on.
 * @returns The origin, or `null` when the socket could not say which
 * port the request arrived on.
 */
export function serverOriginOf(
  req: DevToolsIncoming,
  protocol: 'http:' | 'https:',
): DevToolsServerOrigin | null {
  const port = req.socket.localPort;

  if (typeof port !== 'number' || !Number.isInteger(port) || port <= 0) {
    return null;
  }

  return { protocol, port };
}

/**
 * Write one JSON response.
 *
 * @param res - The response to write.
 * @param code - The status code.
 * @param body - What to answer with.
 */
export function respond(
  res: DevToolsOutgoing,
  code: number,
  body: unknown,
): void {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  // Every body here is JSON a caller reads with `response.json()`;
  // nosniff stops one ever being rendered as something else.
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(`${JSON.stringify(body)}\n`);
}

/**
 * Build the refusal writer, bound to where refusals are logged.
 *
 * `./origin.ts`'s header says the plugin logs the rule, and this is
 * where it does. The method, the path and the RULE are logged and
 * nothing else — never a header, an address or a body — so a
 * dev-server log cannot become a copy of whatever was posted.
 *
 * @param log - Where a refusal is logged, defaulting to nowhere.
 * @returns The writer, which answers through {@link respond} so that a
 * refusal carries the same three headers an answer does.
 */
export function createRefuse(log?: (message: string) => void): DevToolsRefuse {
  return (req, res, code, body) => {
    log?.(
      `devtools: refused ${req.method ?? 'a request'} `
      + `${pathnameOf(req.url) ?? ''} (${body.rule})`,
    );
    respond(res, code, body);
  };
}
