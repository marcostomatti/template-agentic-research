/**
 * The four endpoints as one connect middleware: `GET
 * /__devtools/status`, `GET /__devtools/templates`, `POST
 * /__devtools/report`, `POST /__devtools/comment`, and `next()` for
 * everything else.
 *
 * Spec items 8.2 to 8.4 are the authority for the status and the
 * report routes, spec item 2 for the templates one, and spec item 7
 * for the comment one — the "also affected" path, which is the one
 * name that action carries anywhere in this package. This is the
 * module that reads `./origin.ts`, `./report.ts`, `./store.ts`,
 * `./templates.ts`, `./comment.ts` and `./gateway.ts` in a row;
 * `./plugin.ts` is the module that resolves the real filesystem, clock
 * and `git` and hands them here, and it is the one Vite ever sees.
 *
 * ## What this module is, and what `./http.ts` is
 *
 * This one routes: it matches a path, decides which rule may refuse a
 * request and in which order, and handles the route it matched.
 * Everything a route does to a request or a response that is NOT a
 * routing decision lives in `./http.ts` — the pathname reader, the
 * capped body reader, the server-origin reader, the `respond` and
 * `refuse` writers, the refusal body and the status codes — and a body
 * SCHEMA lives beside `./report.ts`'s in a module of its own. So a
 * route added here is a handler and a branch.
 *
 * ## One route table, and what a path that is not in it does
 *
 * {@link ROUTE_METHODS} is both the match and the method map: a
 * pathname it has no entry for is not this plugin's and falls through
 * to `next()`, and the method it answers with is the one entry's
 * value. One record rather than two, so a route added here cannot be
 * routed and left with no method of its own — which is the shape the
 * old `path === status ? 'GET' : 'POST'` would have taken on a second
 * `GET`. It is a `Map` rather than an object literal because the key
 * looked up is a pathname a caller sent, and a `Map` has no prototype
 * chain an input could reach a value through.
 *
 * ## The order `POST /__devtools/report` is read in
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
 * ## The order `POST /__devtools/comment` is read in
 *
 * The "also affected" route takes the same first three steps, then
 * `./comment.ts`'s `parseComment` on the body, then
 * {@link DevToolsEndpointContext.gateway} — refused as `gateway-absent`
 * when none is configured — then `ReportGateway.comment`, whose answer
 * is what the caller gets. Steps 5 and 6 above have no counterpart: it
 * writes nothing, because the report it is about was stored by the
 * route above on an earlier request and this one carries only the issue
 * id that request's gateway answer named. The body is checked BEFORE
 * the gateway is looked for, so a form learns its input was malformed
 * whether or not this dev server has anywhere to send a comment — a
 * message that appeared on a gateway-configured machine alone would be
 * a difference nobody would think to look for.
 *
 * ## `GET /__devtools/templates` reads the disk on every request
 *
 * Nothing is cached. The issue forms are a handful of small files, and
 * a dev server is the one place they get EDITED: a cached list would
 * leave a corrected form invisible until the server restarted, which
 * is a failure the person editing `.github/ISSUE_TEMPLATE/` would
 * blame on their own YAML.
 *
 * `./templates.ts` is also the module that decides nothing there is
 * fatal — a directory that cannot be listed answers `[]`, an
 * unreadable or malformed file is skipped with a warning naming it —
 * so this route has no failure of its own to answer, and it answers
 * the ARRAY rather than an envelope around it: the browser half
 * validates the whole answer with `../core/reportTemplate.ts`'s
 * `reportTemplateListSchema`, which is a list.
 *
 * Those warnings go to {@link DevToolsEndpointContext.log}, the sink a
 * refusal is already logged to. `./templates.ts` REQUIRES one where
 * this context's is optional, so a plugin configured without a log
 * drops the skips through {@link ignoreTemplateWarning} rather than
 * throwing on a form somebody mistyped.
 *
 * ## Why the same-origin check is on `POST` and not on `GET`
 *
 * A browser sends `Origin` on every `POST`, same-origin included, and
 * on no same-origin `GET`. Requiring the header on `GET
 * /__devtools/status` would therefore refuse the widget's own status
 * fetch. It is also the reason `./origin.ts` can say "a browser sends
 * one on every CORS-eligible request, which a `POST` always is".
 *
 * All four routes still take `isAllowedRemote`. Spec item 8.3 puts the
 * loopback rule on the report endpoint, and applying it to the other
 * three as well is strictly narrower than the spec asks: the commit,
 * the branch, the round, the repository slug and the questions a form
 * asks are each a small disclosure, and no machine on the LAN needs to
 * read them off a laptop running `vite --host`.
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
 * three. Four shapes:
 *
 * - {@link DevToolsStatusBody} — spec item 8.2's five members, plus the
 *   `repo` slug spec item 7 splices into a prefilled GitHub new-issue
 *   link when a report was stored rather than filed.
 * - A `ReportTemplate[]` from `./templates.ts`, bare; see above.
 * - {@link DevToolsStoredBody} — spec item 8.4's `{status: 'stored',
 *   path}`, plus a `gateway` member when a gateway ran. The stored path
 *   is present in BOTH cases, so a caller reads it without branching
 *   and a gateway that refused cannot be mistaken for a request that
 *   was refused.
 * - {@link DevToolsCommentedBody} — `{status: 'commented', gateway}`,
 *   the "also affected" route's answer, wrapping whatever
 *   `ReportGateway.comment` said. Wrapped rather than bare because a
 *   gateway refusal and a REQUEST refusal are both spelled `status:
 *   'refused'`, so a caller reading the outcome at the top level would
 *   tell them apart by whether a `rule` member happened to be there.
 * - `./http.ts`'s `DevToolsRefusalBody` — `{status: 'refused', rule,
 *   reason}`, where `reason` is a fixed sentence from `./http.ts`,
 *   `./origin.ts`, `./report.ts`, `./comment.ts` or `./store.ts` and
 *   never a value the request carried. A refused body's field `path` is
 *   folded into `rule` as `body.<path>`, and `./report.ts`'s `context`
 *   key is the one input-supplied text a refusal ever names that way —
 *   `./comment.ts`'s two members are flat. It reaches a browser as JSON
 *   inside a string, never as markup.
 *
 * ## Where this module's cases are: split on the assembly, then on how
 * many routes one case drives
 *
 * The rule, for the next route added here: a case pinning ONE route
 * that has to name a resolved build value belongs beside the assembler
 * in `./plugin.test.ts`, one pinning ONE route that does not belongs
 * beside this module in `./endpoint.test.ts`, and one driving MORE than
 * one route against the SAME assembled middleware — a templates read,
 * then a report post, then an "also affected" comment on the same fake
 * tracker; a status payload whose `repo`, `round` and `gateway` all
 * read off one assembly — belongs in `./endpoint.integration.test.ts`.
 * `./http.test.ts` holds the plumbing underneath all three, and
 * `./harness.ts` — not itself a test file — is the fake filesystem,
 * clock, command runner and request/response shim `./plugin.test.ts`
 * and `./endpoint.integration.test.ts` both assemble a middleware from.
 */

import type {
  ReportGateway,
  ReportGatewayCommentOutcome,
  ReportGatewayFileOutcome,
  ReportGatewayRefusal,
} from './gateway';
import type { DevToolsBuildInfo } from './git';
import type {
  DevToolsBodyRead,
  DevToolsIncoming,
  DevToolsOutgoing,
} from './http';
import type {
  DevToolsClock,
  DevToolsStoreFs,
  DevToolsStoreRule,
} from './store';
import type { DevToolsTemplatesFs } from './templates';

import { parseComment } from './comment';
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
import { loadReportTemplates } from './templates';

/** The prefix all four endpoints sit under — `../core/host.ts`'s default. */
const DEVTOOLS_ENDPOINT_PREFIX = '/__devtools';

/** Spec item 8.2's path. */
export const DEVTOOLS_STATUS_PATH = `${DEVTOOLS_ENDPOINT_PREFIX}/status`;

/** Spec item 8.3's path. */
export const DEVTOOLS_REPORT_PATH = `${DEVTOOLS_ENDPOINT_PREFIX}/report`;

/** Spec item 2's path: the issue forms, parsed. */
export const DEVTOOLS_TEMPLATES_PATH
  = `${DEVTOOLS_ENDPOINT_PREFIX}/templates`;

/**
 * Spec item 7's path: the "also affected" comment.
 *
 * Spelled `/comment` because the plan's task text fixes this path and
 * `ReportGateway.comment` is the method behind it. The ACTION keeps its
 * one name wherever it is described: this module's header, the handler
 * below and every case in `./endpoint.test.ts`.
 */
export const DEVTOOLS_COMMENT_PATH = `${DEVTOOLS_ENDPOINT_PREFIX}/comment`;

/** Which method each route answers; see this module's header. */
const ROUTE_METHODS: ReadonlyMap<string, 'GET' | 'POST'> = new Map([
  [DEVTOOLS_STATUS_PATH, 'GET'],
  [DEVTOOLS_TEMPLATES_PATH, 'GET'],
  [DEVTOOLS_REPORT_PATH, 'POST'],
  [DEVTOOLS_COMMENT_PATH, 'POST'],
]);

/** What the status endpoint answers when no gateway is configured. */
export const DEVTOOLS_GATEWAY_NONE = 'none';

/**
 * The tracker module every template this dev server serves files
 * under.
 *
 * A constant rather than an option, because the plan's prerequisites
 * fix it: "Every widget report files under `--module=web` with NO
 * `--priority`". A `.yml` says nothing about which tracker module it
 * belongs to, so `./templates.ts` takes the module as a request member
 * and this is the one value it is ever given here. A second module is
 * a plugin option on the day a second module exists, and YAGNI until
 * then.
 */
export const DEVTOOLS_TEMPLATE_MODULE = 'web';

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

/** What a gateway that threw while filing is reported as. */
const GATEWAY_THREW_FILING
  = 'The report gateway threw while filing this report.';

/** What a gateway that threw while commenting is reported as. */
const GATEWAY_THREW_COMMENTING
  = 'The report gateway threw while commenting on this issue.';

/** The rule a comment with nowhere to go is refused under. */
const GATEWAY_ABSENT_RULE = 'gateway-absent';

/** Why {@link GATEWAY_ABSENT_RULE} refuses. */
const GATEWAY_ABSENT_REASON
  = 'This dev server has no report gateway configured, so a comment '
  + 'cannot reach a tracker.';

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

  /**
   * The `owner/name` slug of the `origin` remote, or `unknown`.
   *
   * Spec item 7 is why it is here: a report the tracker chain filed
   * LOCALLY leaves the drawer offering a prefilled GitHub new-issue
   * link, and that link needs the repository this checkout pushes to.
   * `./git.ts`'s `resolveDevToolsRepo` answers the two capture groups
   * of a remote url and never a fragment of the url itself, so a
   * remote carrying credentials reaches a browser as `unknown` rather
   * than as anything it could leak.
   */
  readonly repo: string;
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
 * Spec item 7's response body: what the "also affected" route answers.
 *
 * `'commented'` names what the ENDPOINT did — it took the comment to
 * the gateway — and {@link gateway} is what the tracker made of it, so
 * a gateway that refused is still a 200 carrying a refusal of its own.
 */
export interface DevToolsCommentedBody {
  /** Always `'commented'`; the discriminant. */
  readonly status: 'commented';

  /** What the configured gateway answered. */
  readonly gateway: ReportGatewayCommentOutcome;
}

/**
 * The whole filesystem this endpoint reaches.
 *
 * One seam rather than two: `./store.ts` writes a report through
 * `mkdir` and `writeFile`, `./templates.ts` reads the issue forms
 * through `readdir` and `readFile`, and the real `node:fs/promises`
 * satisfies both halves at once — which is why `./plugin.ts` names one
 * object and a case builds one fake.
 */
export type DevToolsEndpointFs = DevToolsStoreFs & DevToolsTemplatesFs;

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

  /**
   * The `owner/name` slug the status payload answers with.
   *
   * Resolved by `./plugin.ts` through `./git.ts`'s
   * `resolveDevToolsRepo`, once per dev-server start, and NOT a member
   * of {@link DevToolsBuildInfo}: those three values are spliced into
   * the browser bundle by the plugin's `define`, and this one is read
   * by the status route alone.
   */
  readonly repo: string;

  /**
   * The issue forms `GET /__devtools/templates` reads, instead of
   * listing `./templates.ts`'s default directory.
   *
   * An explicitly EMPTY list means no template rather than a fallback
   * to the directory — `./templates.ts` says so — which is how a
   * configuration turns the form off without moving a file.
   */
  readonly templates?: readonly string[];

  /** Whether a non-loopback address is accepted. */
  readonly allowLan: boolean;

  /** The scheme the dev server answers on. */
  readonly protocol: 'http:' | 'https:';

  /** Where a stored report goes next, when one is configured. */
  readonly gateway?: ReportGateway;

  /** The filesystem both `./store.ts` and `./templates.ts` go through. */
  readonly fs: DevToolsEndpointFs;

  /** The clock `./store.ts` timestamps with. */
  readonly now: DevToolsClock;

  /**
   * Where a refusal, and a skipped issue form, are logged — defaulting
   * to nowhere.
   *
   * `./origin.ts`'s header says the plugin logs the rule, and this is
   * where it does. Of a REFUSED request the method, the path and the
   * RULE are logged and nothing else — never a header, an address or a
   * body — so a dev-server log cannot become a copy of whatever was
   * posted. The other sender is `./templates.ts`, whose warnings name
   * a file in the working tree and what was wrong with it; those come
   * off the disk rather than off a request, and a form author needs to
   * be told which file was dropped.
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
 * Where a skipped issue form goes when no log sink was configured.
 *
 * `./templates.ts` REQUIRES a warning sink and this context's `log` is
 * optional, so the route needs a sink that does nothing rather than a
 * branch that reads the templates twice. A dropped form is worth a
 * line in a dev-server log and nothing more, so a plugin with nowhere
 * to put that line loses it rather than failing the read.
 */
function ignoreTemplateWarning(): void {
  // Deliberately empty; see above.
}

/**
 * Run one gateway call without letting it throw.
 *
 * An implementation answers a refusal rather than throwing —
 * `./gateway.ts` says so — and this is the belt over that brace. Both
 * callers have something to lose to a throw: the report route has a
 * report already on disk whose path must still reach the caller, and
 * the "also affected" route has a person waiting on an answer about an
 * issue that may well have been commented on before the throw. A thunk
 * rather than a promise, so a SYNCHRONOUS throw is caught too.
 *
 * @param run - The gateway call to make.
 * @param threw - What a throw is reported as.
 * @returns What the gateway answered, or a refusal naming the throw.
 */
async function withoutThrowing<Outcome>(
  run: () => Promise<Outcome>,
  threw: string,
): Promise<Outcome | ReportGatewayRefusal> {
  try {
    return await run();
  } catch {
    return Object.freeze({ status: 'refused' as const, reason: threw });
  }
}

/**
 * Build the middleware that answers all four endpoints.
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
    repo: context.repo,
  });

  const refuse = createRefuse(context.log);

  /**
   * Answer `GET /__devtools/templates`: the issue forms, parsed.
   *
   * Reads the disk per request and caches nothing — this module's
   * header says why — and answers the bare list, because
   * `./templates.ts` skips what it cannot read rather than failing,
   * and `../core/reportTemplate.ts`'s `reportTemplateListSchema` is
   * what the browser half validates the answer with.
   *
   * @param res - The response to write.
   */
  async function answerTemplates(res: DevToolsOutgoing): Promise<void> {
    const loaded = await loadReportTemplates(
      { paths: context.templates, module: DEVTOOLS_TEMPLATE_MODULE },
      { fs: context.fs, warn: context.log ?? ignoreTemplateWarning },
    );

    respond(res, HTTP_OK, loaded);
  }

  /**
   * Read a `POST` body, answering the refusal here when it cannot be
   * read. Both `POST` routes take this step, and take it identically.
   *
   * @param req - The request, whose body is drained here.
   * @param res - The response, written only when the read refused.
   * @returns What `./http.ts` read. `ok: false` leaves a caller nothing
   * to do but return: the response is already written, 413 for the
   * over-cap body and 400 for the other two rules.
   */
  async function readOrRefuse(
    req: DevToolsIncoming,
    res: DevToolsOutgoing,
  ): Promise<DevToolsBodyRead> {
    const body = await readBody(req);

    if (!body.ok) {
      const code = body.rule === 'body-too-large'
        ? HTTP_CONTENT_TOO_LARGE
        : HTTP_BAD_REQUEST;

      refuse(req, res, code, refusalOf(body.rule));
    }

    return body;
  }

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
    const body = await readOrRefuse(req, res);

    if (!body.ok) {
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
    const { gateway } = context;

    if (gateway === undefined) {
      respond(res, HTTP_OK, Object.freeze({ status: 'stored' as const, path }));

      return;
    }

    respond(res, HTTP_OK, Object.freeze({
      status: 'stored' as const,
      path,
      gateway: await withoutThrowing(
        () => gateway.file(written.stored),
        GATEWAY_THREW_FILING,
      ),
    }));
  }

  /**
   * Answer `POST /__devtools/comment`: the "also affected" route, steps
   * 3 to 6 of the second order in this module's header.
   *
   * @param req - The request, whose body is read here.
   * @param res - The response to write.
   */
  async function alsoAffected(
    req: DevToolsIncoming,
    res: DevToolsOutgoing,
  ): Promise<void> {
    const body = await readOrRefuse(req, res);

    if (!body.ok) {
      return;
    }

    const parsed = parseComment(body.value);

    if (!parsed.ok) {
      // The field path folded into `rule` as `body.<path>`, the shape
      // `./report.ts`'s refusals already reach a caller in.
      refuse(req, res, HTTP_BAD_REQUEST, Object.freeze({
        status: 'refused' as const,
        rule: `body.${parsed.path}`,
        reason: parsed.reason,
      }));

      return;
    }

    const { gateway } = context;

    if (gateway === undefined) {
      // The dev server's own configuration, not the request's fault:
      // nothing the sender changes would make a comment reachable,
      // which is what `STORE_STATUS` reads a missing round as too.
      refuse(req, res, HTTP_SERVER_ERROR, Object.freeze({
        status: 'refused' as const,
        rule: GATEWAY_ABSENT_RULE,
        reason: GATEWAY_ABSENT_REASON,
      }));

      return;
    }

    const commented: DevToolsCommentedBody = Object.freeze({
      status: 'commented' as const,
      gateway: await withoutThrowing(
        () => gateway.comment(parsed.comment.issueId, parsed.comment.body),
        GATEWAY_THREW_COMMENTING,
      ),
    });

    respond(res, HTTP_OK, commented);
  }

  /**
   * Route a request addressed to one of this plugin's four paths.
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

    if (req.method !== ROUTE_METHODS.get(path)) {
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

    if (path === DEVTOOLS_TEMPLATES_PATH) {
      await answerTemplates(res);

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

    if (path === DEVTOOLS_COMMENT_PATH) {
      await alsoAffected(req, res);

      return;
    }

    await report(req, res);
  }

  return (req, res, next) => {
    const path = pathnameOf(req.url);

    if (path === null || !ROUTE_METHODS.has(path)) {
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
