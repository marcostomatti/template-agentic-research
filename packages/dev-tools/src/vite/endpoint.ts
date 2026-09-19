/**
 * The two endpoints as one connect middleware: `GET
 * /__devtools/status`, `POST /__devtools/report`, and `next()` for
 * everything else.
 *
 * Spec items 8.2 to 8.4 are the authority. This is the module that
 * reads `./origin.ts`, `./report.ts`, `./store.ts` and `./gateway.ts`
 * in a row; `./plugin.ts` is the module that resolves the real
 * filesystem, clock and `git` and hands them here, and it is the one
 * Vite ever sees.
 *
 * ## What this module is, and what `./http.ts` is
 *
 * This one routes: it matches a path, decides which rule may refuse a
 * request and in which order, and handles the route it matched.
 * Everything a route does to a request or a response that is NOT a
 * routing decision lives in `./http.ts` — the pathname reader, the
 * capped body reader, the server-origin reader, the `respond` and
 * `refuse` writers, the refusal body and the status codes. So a route
 * added here is a handler and a branch, and the plumbing it sits on is
 * already written and already tested.
 *
 * ## The order a `POST` is read in
 *
 * `./origin.ts`, then `./report.ts`, then `./store.ts` — the order the
 * plan's task text names — and each step gates the next:
 *
 * 1. `isAllowedRemote` on `req.socket.remoteAddress`. The cheapest
 *    check, and the only one that does not depend on a header, so a
 *    caller on the LAN is refused before anything it SENT is looked at.
 * 2. `isSameOriginRequest` on the headers. `POST` only — see below.
 * 3. The raw body, capped at `./http.ts`'s `DEVTOOLS_BODY_BYTES_MAX`
 *    and decoded once, then `JSON.parse`.
 * 4. `parseReport`, which is the whole of spec item 8.3's schema.
 * 5. `storeReport`, which writes the attachments and then the JSON
 *    naming them.
 * 6. `ReportGateway.file`, only when a gateway was configured.
 *
 * Nothing is written before step 5, so every refusal above it leaves
 * the filesystem untouched.
 *
 * ## Why the same-origin check is on `POST` and not on `GET`
 *
 * A browser sends `Origin` on every `POST`, same-origin included, and
 * on no same-origin `GET`. Requiring the header on `GET
 * /__devtools/status` would therefore refuse the widget's own status
 * fetch. It is also the reason `./origin.ts` can say "a browser sends
 * one on every CORS-eligible request, which a `POST` always is".
 *
 * Both routes still take `isAllowedRemote`. Spec item 8.3 puts the
 * loopback rule on the report endpoint, and applying it to the status
 * endpoint as well is strictly narrower than the spec asks: the commit,
 * the branch and the round are a small disclosure, and no machine on
 * the LAN needs to read them off a laptop running `vite --host`.
 *
 * ## The port comes from the kernel
 *
 * `isSameOriginRequest` needs the port the dev server actually listens
 * on, and `./http.ts`'s `serverOriginOf` reads it per request from
 * `req.socket.localPort` — the local end of the accepted connection,
 * the same number the browser put in `Host`, and one no header can
 * contradict; that module's header says why the configured port is not
 * it. A socket that cannot say is refused here as `socket-unreadable`:
 * an unreadable socket is not evidence of anything, which is the
 * reading `./origin.ts` takes of an absent remote address.
 *
 * ## What every response looks like
 *
 * JSON, always, with `Cache-Control: no-store` and
 * `X-Content-Type-Options: nosniff` — `./http.ts`'s `respond` sets all
 * three. Three shapes:
 *
 * - {@link DevToolsStatusBody} — spec item 8.2's five members exactly.
 * - {@link DevToolsStoredBody} — spec item 8.4's `{status: 'stored',
 *   path}`, plus a `gateway` member when a gateway ran. The stored path
 *   is present in BOTH cases, so a caller reads it without branching
 *   and a gateway that refused cannot be mistaken for a request that
 *   was refused.
 * - `./http.ts`'s `DevToolsRefusalBody` — `{status: 'refused', rule,
 *   reason}`, where `reason` is a fixed sentence from `./http.ts`,
 *   `./origin.ts`, `./report.ts` or `./store.ts` and never a value the
 *   request carried. `./report.ts`'s refusal `path` is folded into
 *   `rule` as `body.<path>`, which is the one place a refusal names
 *   input-supplied text — a `context` key. It reaches a browser as JSON
 *   inside a string, never as markup.
 *
 * ## Why the colocated suite is `./plugin.test.ts`
 *
 * {@link createDevToolsEndpoint} is reached one way only: through
 * `./plugin.ts`'s `assembleDevTools`, which is what resolves the build
 * info this module puts in the status payload. So the cases that drive
 * this middleware are the assembled ones, and they live beside the
 * assembler rather than here — a colocated `endpoint.test.ts` would
 * have to rebuild that assembly to say anything. This file is the one
 * in the pair with no test of its own; `./plugin.test.ts` is where its
 * five refusals, its status payload and its stored report are pinned,
 * and `./http.test.ts` is where the plumbing underneath them is, since
 * none of that needs an assembly.
 */

import type { ReportGateway, ReportGatewayFileOutcome } from './gateway';
import type { DevToolsBuildInfo } from './git';
import type { DevToolsIncoming, DevToolsOutgoing } from './http';
import type {
  DevToolsClock,
  DevToolsStoredReport,
  DevToolsStoreFs,
  DevToolsStoreRule,
} from './store';

import {
  HTTP_BAD_REQUEST,
  HTTP_CONTENT_TOO_LARGE,
  HTTP_FORBIDDEN,
  HTTP_METHOD_NOT_ALLOWED,
  HTTP_OK,
  HTTP_SERVER_ERROR,
  createRefuse,
  pathnameOf,
  readBody,
  refusalOf,
  respond,
  serverOriginOf,
} from './http';
import { isAllowedRemote, isSameOriginRequest } from './origin';
import { parseReport } from './report';
import { storeReport } from './store';

/** The prefix both endpoints sit under — `../core/host.ts`'s default. */
const DEVTOOLS_ENDPOINT_PREFIX = '/__devtools';

/** Spec item 8.2's path. */
export const DEVTOOLS_STATUS_PATH = `${DEVTOOLS_ENDPOINT_PREFIX}/status`;

/** Spec item 8.3's path. */
export const DEVTOOLS_REPORT_PATH = `${DEVTOOLS_ENDPOINT_PREFIX}/report`;

/** What the status endpoint answers when no gateway is configured. */
export const DEVTOOLS_GATEWAY_NONE = 'none';

/**
 * Which status code each of `./store.ts`'s rules answers with.
 *
 * Split on whose fault it is, which is the split a caller can act on: a
 * title or an attachment name that sanitises to nothing came out of the
 * BODY, so it is a 400 the sender can fix, while the round, the clock
 * and a failed write are the dev server's own and are 500s nothing the
 * sender does would change.
 */
const STORE_STATUS: Readonly<Record<DevToolsStoreRule, number>>
  = Object.freeze({
    'round-unusable': HTTP_SERVER_ERROR,
    'slug-unusable': HTTP_BAD_REQUEST,
    'attachment-name-unusable': HTTP_BAD_REQUEST,
    'clock-unusable': HTTP_SERVER_ERROR,
    'write-failed': HTTP_SERVER_ERROR,
  });

/** What a gateway that threw is reported as. */
const GATEWAY_THREW = 'The report gateway threw while filing this report.';

/** Spec item 8.2's response body. */
export interface DevToolsStatusBody {
  /** `HEAD` at dev-server start, or `unknown`. */
  readonly commit: string;

  /** The checked-out branch, or `unknown`. */
  readonly branch: string;

  /** The round tag reports are filed under. */
  readonly round: string;

  /**
   * Always `false`.
   *
   * See {@link createDevToolsEndpoint} for why, and for what the item
   * it gates is.
   */
  readonly persistence: false;

  /** The configured gateway's name, or {@link DEVTOOLS_GATEWAY_NONE}. */
  readonly gateway: string;
}

/** Spec item 8.4's response body. */
export interface DevToolsStoredBody {
  /** Always `'stored'`; the discriminant. */
  readonly status: 'stored';

  /** Where the report JSON was written. */
  readonly path: string;

  /** What the configured gateway answered, when one ran. */
  readonly gateway?: ReportGatewayFileOutcome;
}

/**
 * The middleware, shaped so that Vite's `Connect.NextHandleFunction`
 * satisfies it.
 *
 * @param req - The request.
 * @param res - The response.
 * @param next - Called, and nothing else done, for every path that is
 * neither of this plugin's two.
 */
export type DevToolsMiddleware = (
  req: DevToolsIncoming,
  res: DevToolsOutgoing,
  next: () => void,
) => void;

/** Everything {@link createDevToolsEndpoint} is told, already resolved. */
export interface DevToolsEndpointContext {
  /** The three build values, resolved once per dev-server start. */
  readonly info: DevToolsBuildInfo;

  /** Where the round directory is created. */
  readonly outDir: string;

  /** Whether a non-loopback address is accepted. */
  readonly allowLan: boolean;

  /** The scheme the dev server answers on. */
  readonly protocol: 'http:' | 'https:';

  /** Where a stored report goes next, when one is configured. */
  readonly gateway?: ReportGateway;

  /** The filesystem `./store.ts` writes through. */
  readonly fs: DevToolsStoreFs;

  /** The clock `./store.ts` timestamps with. */
  readonly now: DevToolsClock;

  /**
   * Where a refusal is logged, defaulting to nowhere.
   *
   * `./origin.ts`'s header says the plugin logs the rule, and this is
   * where it does. The method, the path and the RULE are logged and
   * nothing else — never a header, an address or a body — so a
   * dev-server log cannot become a copy of whatever was posted.
   */
  readonly log?: (message: string) => void;
}

/**
 * What the status payload calls the configured gateway.
 *
 * @param gateway - The configured gateway, when there is one.
 * @returns Its name, or {@link DEVTOOLS_GATEWAY_NONE} — which is also
 * the answer for a gateway whose name is blank, so that a payload
 * cannot claim "configured" and "absent" at once.
 */
function gatewayNameOf(gateway: ReportGateway | undefined): string {
  if (gateway === undefined || typeof gateway.name !== 'string') {
    return DEVTOOLS_GATEWAY_NONE;
  }

  const name = gateway.name.trim();

  if (name === '') {
    return DEVTOOLS_GATEWAY_NONE;
  }

  return name;
}

/**
 * Take a stored report to the gateway without letting it throw.
 *
 * An implementation answers a refusal rather than throwing —
 * `./gateway.ts` says so — and this is the belt over that brace: the
 * report is on disk by the time a gateway runs, so a gateway that threw
 * must not cost the caller the path it was written to.
 *
 * @param gateway - The configured gateway.
 * @param stored - The report, already written.
 * @returns What the gateway answered, or a refusal naming the throw.
 */
async function fileThroughGateway(
  gateway: ReportGateway,
  stored: DevToolsStoredReport,
): Promise<ReportGatewayFileOutcome> {
  try {
    return await gateway.file(stored);
  } catch {
    return Object.freeze({ status: 'refused' as const, reason: GATEWAY_THREW });
  }
}

/**
 * Build the middleware that answers both endpoints.
 *
 * ## `persistence` is always `false` in this plan
 *
 * The status payload reports `persistence: false`, unconditionally and
 * with no option that changes it. The item it gates — the menu's "Save
 * settings" row, which `../core/menuModel.ts` draws only when the
 * status payload reports `persistence: true` — EXISTS: the row, the
 * `DevToolsStatus.persistence` field it reads, the model's gate and the
 * cases on both sides of that gate are all in this package. What is
 * deferred is the behaviour behind it, which the spec's "Deliberately
 * deferred" list names as "'Save settings' behaviour and any
 * persistence the plugin could report". So the wire is complete and the
 * server end of it says `false`, the one honest answer while nothing on
 * the server can persist anything.
 *
 * @param context - The build info, the options and the injected
 * filesystem, clock and log sink.
 * @returns The middleware, holding no mutable state of its own.
 */
export function createDevToolsEndpoint(
  context: DevToolsEndpointContext,
): DevToolsMiddleware {
  const statusBody: DevToolsStatusBody = Object.freeze({
    commit: context.info.commit,
    branch: context.info.branch,
    round: context.info.round,
    persistence: false as const,
    gateway: gatewayNameOf(context.gateway),
  });

  const refuse = createRefuse(context.log);

  /**
   * Answer `POST /__devtools/report`: steps 3 to 6 of the order in this
   * module's header.
   *
   * @param req - The request, whose body is read here.
   * @param res - The response to write.
   */
  async function report(
    req: DevToolsIncoming,
    res: DevToolsOutgoing,
  ): Promise<void> {
    const body = await readBody(req);

    if (!body.ok) {
      const code = body.rule === 'body-too-large'
        ? HTTP_CONTENT_TOO_LARGE
        : HTTP_BAD_REQUEST;

      refuse(req, res, code, refusalOf(body.rule));

      return;
    }

    const parsed = parseReport(body.value);

    if (!parsed.ok) {
      refuse(req, res, HTTP_BAD_REQUEST, Object.freeze({
        status: 'refused' as const,
        rule: `body.${parsed.path}`,
        reason: parsed.reason,
      }));

      return;
    }

    const written = await storeReport(
      {
        report: parsed.report,
        outDir: context.outDir,
        round: context.info.round,
      },
      { fs: context.fs, now: context.now },
    );

    if (!written.ok) {
      refuse(req, res, STORE_STATUS[written.rule], Object.freeze({
        status: 'refused' as const,
        rule: written.rule,
        reason: written.reason,
      }));

      return;
    }

    const { path } = written.stored;

    if (context.gateway === undefined) {
      respond(res, HTTP_OK, Object.freeze({ status: 'stored' as const, path }));

      return;
    }

    respond(res, HTTP_OK, Object.freeze({
      status: 'stored' as const,
      path,
      gateway: await fileThroughGateway(context.gateway, written.stored),
    }));
  }

  /**
   * Route a request that is addressed to one of the two endpoints.
   *
   * @param req - The request.
   * @param res - The response to write.
   * @param path - Its pathname, already matched.
   */
  async function route(
    req: DevToolsIncoming,
    res: DevToolsOutgoing,
    path: string,
  ): Promise<void> {
    const remote = isAllowedRemote(req.socket.remoteAddress, context.allowLan);

    if (!remote.allowed) {
      refuse(req, res, HTTP_FORBIDDEN, Object.freeze({
        status: 'refused' as const,
        rule: remote.rule,
        reason: remote.reason,
      }));

      return;
    }

    const wanted = path === DEVTOOLS_STATUS_PATH
      ? 'GET'
      : 'POST';

    if (req.method !== wanted) {
      refuse(
        req,
        res,
        HTTP_METHOD_NOT_ALLOWED,
        refusalOf('method-not-allowed'),
      );

      return;
    }

    if (path === DEVTOOLS_STATUS_PATH) {
      respond(res, HTTP_OK, statusBody);

      return;
    }

    const origin = serverOriginOf(req, context.protocol);

    if (origin === null) {
      refuse(req, res, HTTP_FORBIDDEN, refusalOf('socket-unreadable'));

      return;
    }

    const sameOrigin = isSameOriginRequest(req.headers, origin);

    if (!sameOrigin.allowed) {
      refuse(req, res, HTTP_FORBIDDEN, Object.freeze({
        status: 'refused' as const,
        rule: sameOrigin.rule,
        reason: sameOrigin.reason,
      }));

      return;
    }

    await report(req, res);
  }

  return (req, res, next) => {
    const path = pathnameOf(req.url);

    if (path !== DEVTOOLS_STATUS_PATH && path !== DEVTOOLS_REPORT_PATH) {
      next();

      return;
    }

    // The middleware contract is synchronous, so the async work is
    // launched rather than awaited, and nothing is allowed out of it:
    // an unhandled rejection in a connect middleware takes the whole
    // dev-server process, and this endpoint is not worth that.
    void route(req, res, path).catch(() => {
      refuse(req, res, HTTP_SERVER_ERROR, refusalOf('endpoint-failed'));
    });
  };
}
