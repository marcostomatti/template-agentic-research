/**
 * @packageDocumentation
 * The two calls that leave the browser, and the one type their
 * answers collapse onto.
 *
 * Spec item 7 is the authority: submission "posts to
 * `/__devtools/report`, maps the answer to `SubmitResult`: `filed
 * {tracker, id, url?}`, `duplicate {id, title, url?}`, `stored {path}`
 * (no gateway or tracker refused), `refused {reason}`", and the "also
 * affected" call "posts the comment and answers `filed`". Everything
 * below is that sentence: {@link submitFeedbackReport},
 * {@link submitAlsoAffected}, and the readers that turn a dev server's
 * JSON into one of four shapes.
 *
 * ## Four shapes, and the drawer handles no fifth
 *
 * {@link SubmitResult} is closed at four because the drawer's
 * `role="status"` line has four things to say: the issue was filed,
 * the tracker thinks it already exists, it is on disk and no further,
 * or nothing happened and here is why. Every answer the endpoint can
 * give — and every answer it cannot, a proxy's HTML included — is
 * mapped onto one of them here, so the drawer never reads a status
 * field, never narrows a gateway outcome and never meets `undefined`.
 *
 * A shape a reader cannot see from the type: `filed` and `duplicate`
 * OMIT `url` when there is none, rather than carrying `url:
 * undefined`. `toStrictEqual` tells those apart and the colocated
 * cases use it, so the absence is pinned rather than assumed.
 *
 * ## Why a tracker refusal is `stored` and a comment refusal is not
 *
 * The asymmetry is the endpoint's, read honestly. `POST /report`
 * writes the report to disk BEFORE it calls the gateway — `src/vite/
 * endpoint.ts` orders it that way, and `src/vite/gateway.ts` says a
 * gateway answers a refusal rather than throwing precisely because
 * "the report survives either way". So a gateway that could not reach
 * the tracker leaves a report that really is stored, and `stored
 * {path}` is the true thing to tell the person: the work is not lost,
 * and the path is where it is. That is the parenthetical in spec item
 * 7 — "`stored {path}` (no gateway or tracker refused)" — and it is
 * why the two causes are not told apart here.
 *
 * `POST /comment` writes nothing. A gateway that refused there has
 * left no trace at all, so the same gateway shape maps to `refused
 * {reason}` and the reason is the tracker's own line. One module, two
 * readings of one gateway outcome, because the two routes did
 * different amounts of work before they got there.
 *
 * ## Every reason is sanitised here, even though the far end already
 * sanitises
 *
 * `src/vite/gateway/call.ts` strips control characters from rafa's
 * stderr, collapses whitespace, keeps one line and caps at 300. This
 * module does the same thing again to every reason it reads, and the
 * repetition is deliberate: the browser cannot know WHICH gateway
 * answered. `ReportGateway` is an interface with more than one
 * possible implementation, a later one need not hold itself to that
 * discipline, and the string lands in a `role="status"` region a
 * person reads. {@link FEEDBACK_REASON_LIMIT} matches `call.ts`'s
 * `REASON_TEXT_MAX` so that a reason already capped there is not
 * capped twice and does not grow a second ellipsis.
 *
 * The endpoint's OWN refusals need none of this — `src/vite/http.ts`
 * fixes every sentence and lets no request value into one — but they
 * go through the same reader, because a reader that trusted the
 * origin of a string would have to be able to tell the two apart.
 *
 * ## A `url` is read, not believed
 *
 * `filed` and `duplicate` both carry a url the drawer renders as a
 * link, and the string comes from a tracker by way of a gateway. A
 * value that is not an absolute `http:` or `https:` URL is DROPPED —
 * not refused, not passed through — so the result reads exactly as it
 * does for rafa's `local` tracker, which has no web address to give.
 * A `javascript:` url would otherwise reach an `href`, and no later
 * renderer should have to be the place that remembers.
 *
 * ## The two paths are respelt, like the two length limits
 *
 * {@link FEEDBACK_REPORT_PATH} and {@link FEEDBACK_COMMENT_PATH} are
 * `src/vite/endpoint.ts`'s `DEVTOOLS_REPORT_PATH` and
 * `DEVTOOLS_COMMENT_PATH` with the `/__devtools` prefix removed,
 * spelled here rather than imported: `eslint.config.mjs` refuses a
 * feature importing the node layer, which is the same wall
 * `./submitRules.ts` respells the endpoint's length limits across.
 * The prefix is absent because `DevToolsHost.fetch` joins onto
 * {@link DevToolsHost.endpoint}, so a leading slash here means "from
 * the endpoint" and not "from the origin" — `src/core/host.ts` is the
 * authority for that reading, and its colocated cases pin it.
 *
 * ## What throws, and why exactly one thing does
 *
 * A network failure is caught and answered; an unreadable answer is
 * caught and answered. `JSON.stringify` of the payload is deliberately
 * OUTSIDE both catches, so a payload that cannot be serialised rejects
 * loudly instead of being reported to the person as a dev server that
 * did not answer. The types make it unreachable — a
 * {@link FeedbackContext} holds primitives and `./context.ts` builds
 * it from `host.context()`, which drops everything else — so the only
 * way there is a cast or a JavaScript caller, and both are bugs whose
 * author is the operator. `src/core/menuModel.ts` lets a throwing
 * feature take the menu with it for the same reason.
 *
 * ## Nothing here reads storage, and the PNG is not exempt
 *
 * The plan's law: only the title, the body and the context block reach
 * the tracker; the PNG never leaves the machine. Both hold here by
 * construction. {@link FeedbackReport} carries exactly what `src/vite/
 * report.ts` accepts, the attachments go to the DEV SERVER, which
 * writes them under `.rafa/feedback/<round>/`, and what the gateway
 * appends to an issue body is the stored PATH rather than the bytes.
 * No `sessionStorage`, no `localStorage`, no API client is named in
 * this file.
 *
 * ## Mutation note -- what the colocated cases actually catch
 *
 * A green suite is not evidence a case can fail. Each leg below was
 * measured by breaking this file, running `bun x vitest run
 * src/features/feedback/submit.test.ts` from `packages/dev-tools`
 * against the 34 cases that file holds, running `bun x tsc --noEmit`
 * beside it, and restoring this file byte-identical -- a SHA-256 of
 * the restored text compared to the original's, every leg, all
 * thirty-two restored clean. The baseline is `Tests 34 passed (34)`;
 * each figure below is the count of cases that went red.
 *
 * **The plumbing, and the leg that was a real bug.** One `try` around
 * the `fetch` and the `response.json()` both: `2`, both `answers a
 * refusal when the answer is not JSON`. That is not hypothetical --
 * the first draft of {@link ask} shared one `catch`, those two cases
 * found it, and a dev server answering a 404 page was being reported
 * as a dev server that was not running. Answering
 * {@link UNREADABLE_REASON} from the network `catch`: `2`. Moving
 * `JSON.stringify` inside that `try`: `1`, the case that pins the one
 * throw this module makes. Handing `parsed` over without
 * {@link recordIn}: `1`, the bare `null`, which then rejects on a
 * member read. Making {@link recordIn} unwrap a single-element array:
 * `1`, the JSON array.
 *
 * **The report mapping.** Never consulting {@link refusalIn}: `4` --
 * the endpoint's refusal and the three readings of its reason.
 * Reading a missing `path` as `''`: `2`, of which dropping the blank
 * check from {@link textIn} alone reds the trimmed one. Dropping the
 * `status !== 'stored'` guard: `1`. Answering unreadable rather than
 * stored for an absent gateway: `1`. Skipping {@link filedIn}: `4`.
 * Skipping {@link duplicateIn}: `3`, and reading a duplicate off the
 * gateway rather than off its `match` reds the same `3`. Answering
 * `refused` rather than `stored` for a gateway that refused: `3` --
 * the third and second of them are the fall-backs, because an
 * unreadable `filed` and an unreadable `duplicate` have to land on
 * `stored` too. Dropping the attachments before sending: `1`.
 *
 * **The request.** `GET` instead of `POST`: `2`. Dropping the
 * `content-type` header: `2`. Posting the report to
 * {@link FEEDBACK_COMMENT_PATH}: `1`. The url each case records is
 * the JOINED `/__devtools/report`, so the path, the method and the
 * header are pinned separately.
 *
 * **The url and the reason.** Passing any parseable url through
 * {@link urlIn}: `2`, one on each carrying shape -- a RELATIVE url
 * needs no scheme check to be dropped, since `new URL` throws on it,
 * so the scheme guard is measured by the `javascript:` halves alone.
 * Carrying `url: undefined` rather than omitting the key: `4` for
 * `filed`, `2` for `duplicate`, and every one is a `toStrictEqual`
 * reading `toEqual` would have passed. Leaving control characters in
 * {@link oneLine}: `1`. Dropping its cap: `1`. Answering an empty
 * reason from {@link reasonIn} rather than {@link UNSAID_REASON}: `1`.
 *
 * **The also-affected call.** Never consulting {@link refusalIn}:
 * `1`, the `gateway-absent` refusal. Dropping the `status ===
 * 'commented'` guard: `1`. Answering the body's reason rather than
 * {@link UNREADABLE_REASON} for an unreadable answer: `2`. Skipping
 * {@link filedIn}: `2`. Answering {@link UNREADABLE_REASON} rather
 * than the tracker's own line for a gateway that refused: `1`.
 *
 * **Three legs do NOT red, and the absence is the finding.** Letting
 * {@link recordIn} accept an array leaves all 34 green: a JSON array
 * carries no `status` and no `path`, so the reads below refuse it
 * anyway and the `Array.isArray` guard is belt over a brace. It stays
 * because it makes the function honest about its name, and the
 * unwrapping leg above shows the case is not toothless. Letting
 * {@link recordIn} accept a `null` leaves all 34 green for a happier
 * reason: `typeof null` is `'object'`, so the mutation answers the
 * VALUE `null` and {@link ask}'s `body === null` check catches it one
 * line later -- removing that check is the leg that reds. Reading the
 * refusal branch after the stored branch leaves all 34 green: the two
 * are disjoint on `status`, the order is not load-bearing, and no
 * case pretends it is.
 *
 * `bun x tsc --noEmit` exits `0` under all thirty-two: every leg is a
 * behaviour change over types that still line up, so `check-types`
 * would never report one and the suite is the only gate that does.
 */

import type { FeedbackContext } from './context';
import type { DevToolsHost } from '../../core/types';

/**
 * The report route, as a path under {@link DevToolsHost.endpoint}.
 *
 * See this module's documentation for why the `/__devtools` prefix is
 * absent and why the string is respelt rather than imported.
 */
export const FEEDBACK_REPORT_PATH = '/report';

/** The "also affected" route, under the same endpoint. */
export const FEEDBACK_COMMENT_PATH = '/comment';

/**
 * How much of a tracker's own words a reason may carry.
 *
 * The same 300 as `src/vite/gateway/call.ts`'s `REASON_TEXT_MAX`, so
 * a line that was capped there arrives at exactly the limit here and
 * is not given a second ellipsis.
 */
export const FEEDBACK_REASON_LIMIT = 300;

/** What a truncated reason ends with. Plain ASCII, deliberately. */
const REASON_ELLIPSIS = '...';

/**
 * Every control character, C0 and C1 alike.
 *
 * Spelled as a Unicode property escape rather than as a range of
 * six-character escapes, because this repository's control-byte law is
 * about what reaches a FILE and such an escape written into a tool
 * call has been seen to arrive on disk as the byte it names.
 */
const CONTROL_CHARACTERS = /\p{Cc}/gu;

/** Any run of whitespace, collapsed to one space in a reason. */
const WHITESPACE_RUN = /\s+/g;

/** How a multi-line message is split before one line is kept. */
const LINE_SEPARATOR = /\r?\n/;

/** The only two schemes a url the drawer may link is allowed to use. */
const SAFE_URL_SCHEMES: readonly string[] = Object.freeze([
  'http:',
  'https:',
]);

/** What every request this module makes declares it is sending. */
const JSON_HEADERS: Readonly<Record<string, string>> = Object.freeze({
  'content-type': 'application/json',
});

/** Shown when the dev server could not be reached at all. */
const UNREACHABLE_REASON
  = 'The dev server did not answer. Is it still running?';

/** Shown when the answer was not something this widget can read. */
const UNREADABLE_REASON
  = 'The dev server answered something this widget could not read.';

/** Shown when the answer refused and carried no readable reason. */
const UNSAID_REASON = 'The dev server refused it and gave no reason.';

/** One captured file travelling with a report, ready for the wire. */
export interface FeedbackReportAttachment {
  /** A plain filename: no separator, no leading dot, no directory. */
  readonly name: string;

  /** The type the browser reported, lower case. */
  readonly mime: string;

  /** The bytes, standard padded base64. */
  readonly base64: string;
}

/**
 * The body of `POST <endpoint>/report`.
 *
 * The browser-side spelling of `src/vite/report.ts`'s
 * `DevToolsReport`, respelt for the reason this module's
 * documentation gives for the two paths: the feature layer may not
 * import the node layer. The far end validates with zod and answers a
 * `body.<field>` refusal where the two ever disagree, which this
 * module maps onto {@link SubmitRefused} — so a drift is a visible
 * refusal one round trip later rather than a silent drop.
 */
export interface FeedbackReport {
  /** Which registered feature the report came from. */
  readonly feature: string;

  /** One line; what the report is about. */
  readonly title: string;

  /** The Markdown `./body.ts` built. */
  readonly body: string;

  /** The flat record `./context.ts` collected. */
  readonly context: FeedbackContext;

  /** The screenshot and anything dropped beside it. */
  readonly attachments?: readonly FeedbackReportAttachment[];
}

/** The report reached the tracker, or a comment did. */
export interface SubmitFiled {
  /** Always `'filed'`; the discriminant. */
  readonly status: 'filed';

  /** Which tracker it landed on: `'github'`, `'local'`, or a later one. */
  readonly tracker: string;

  /** The issue's identifier, as the tracker spells it. */
  readonly id: string;

  /** Where to read it; absent when the tracker has no such place. */
  readonly url?: string;
}

/** The tracker believes this report is already filed. */
export interface SubmitDuplicate {
  /** Always `'duplicate'`; the discriminant. */
  readonly status: 'duplicate';

  /** The matched issue's identifier, which "also affected" comments on. */
  readonly id: string;

  /** The matched issue's title, shown to the person deciding. */
  readonly title: string;

  /** Where to read it; absent when the tracker has no such place. */
  readonly url?: string;
}

/**
 * The report is on disk and went no further.
 *
 * Answered both where no gateway is configured and where one refused;
 * see this module's documentation for why the two are not told apart.
 */
export interface SubmitStored {
  /** Always `'stored'`; the discriminant. */
  readonly status: 'stored';

  /** Where the dev server wrote it, relative to the repository. */
  readonly path: string;
}

/** Nothing happened, and this is the sentence to show. */
export interface SubmitRefused {
  /** Always `'refused'`; the discriminant. */
  readonly status: 'refused';

  /** One line, control characters stripped and capped. */
  readonly reason: string;
}

/** What either call in this module answers. */
export type SubmitResult
  = SubmitFiled | SubmitDuplicate | SubmitStored | SubmitRefused;

/** A dev-server answer that could be read as an object. */
interface FeedbackAnswerRead {
  /** Always `true`; the discriminant. */
  readonly ok: true;

  /** The parsed body, as a record whose members are still `unknown`. */
  readonly body: Record<string, unknown>;
}

/** A request that never produced a readable answer. */
interface FeedbackAnswerRefused {
  /** Always `false`; the discriminant. */
  readonly ok: false;

  /** The result to answer the caller with, already built. */
  readonly refusal: SubmitRefused;
}

/**
 * What {@link ask} answers.
 *
 * A union rather than `Record<string, unknown> | SubmitRefused`,
 * because a parsed body may itself carry `status: 'refused'` and the
 * two would then be indistinguishable at the call.
 */
type FeedbackAnswer = FeedbackAnswerRead | FeedbackAnswerRefused;

/**
 * Reduce any message to one safe line.
 *
 * @param text - Whatever was said, possibly over several lines.
 * @returns The first non-empty line, control characters replaced by
 * spaces, whitespace runs collapsed and the whole capped at
 * {@link FEEDBACK_REASON_LIMIT}; `''` when there was nothing to say.
 */
function oneLine(text: string): string {
  const line = text
    .split(LINE_SEPARATOR)
    .map((entry) => entry
      .replace(CONTROL_CHARACTERS, ' ')
      .replace(WHITESPACE_RUN, ' ')
      .trim())
    .find((entry) => entry !== '');

  if (line === undefined) {
    return '';
  }

  return line.length > FEEDBACK_REASON_LIMIT
    ? `${line.slice(0, FEEDBACK_REASON_LIMIT)}${REASON_ELLIPSIS}`
    : line;
}

/**
 * Read a member that has to be a non-empty string.
 *
 * @param value - Any member of a parsed body.
 * @returns The trimmed text, or `null` when it is not usable.
 */
function textIn(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const text = value.trim();

  return text === ''
    ? null
    : text;
}

/**
 * Read a member that has to be a plain object.
 *
 * An array is refused as well as a `null`: both are `'object'` to
 * `typeof`, and neither is a body this module can read a `status` off.
 *
 * @param value - Any member of a parsed body, or the body itself.
 * @returns The record, or `null` when it is not one.
 */
function recordIn(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

/**
 * Read a url the drawer may put in an `href`.
 *
 * @param value - The `url` member a tracker supplied.
 * @returns The url, or `undefined` when it is absent, relative, or of
 * a scheme other than `http:` and `https:`.
 */
function urlIn(value: unknown): string | undefined {
  const text = textIn(value);

  if (text === null) {
    return undefined;
  }

  try {
    return SAFE_URL_SCHEMES.includes(new URL(text).protocol)
      ? text
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Read a `reason` member down to one line a person can be shown.
 *
 * @param value - Whatever a refusal put in its `reason`.
 * @returns The reduced line, or {@link UNSAID_REASON} where there was
 * nothing readable to reduce.
 */
function reasonIn(value: unknown): string {
  const reason = typeof value === 'string'
    ? oneLine(value)
    : '';

  return reason === ''
    ? UNSAID_REASON
    : reason;
}

/**
 * Build a refusal.
 *
 * @param reason - The sentence to show, already fixed or already
 * reduced by {@link oneLine}.
 * @returns The frozen result.
 */
function refuse(reason: string): SubmitRefused {
  return Object.freeze({ status: 'refused' as const, reason });
}

/**
 * Build a stored result.
 *
 * @param path - Where the dev server wrote the report.
 * @returns The frozen result.
 */
function store(path: string): SubmitStored {
  return Object.freeze({ status: 'stored' as const, path });
}

/**
 * Read a gateway outcome that says it filed.
 *
 * @param gateway - The `gateway` member of an answer.
 * @returns The filed result, or `null` when this outcome is not a
 * readable `filed` one.
 */
function filedIn(gateway: Record<string, unknown>): SubmitFiled | null {
  if (gateway.status !== 'filed') {
    return null;
  }

  const tracker = textIn(gateway.tracker);
  const id = textIn(gateway.id);

  if (tracker === null || id === null) {
    return null;
  }

  const url = urlIn(gateway.url);
  const result: SubmitFiled = url === undefined
    ? { status: 'filed', tracker, id }
    : { status: 'filed', tracker, id, url };

  return Object.freeze(result);
}

/**
 * Read a gateway outcome that says it matched an existing issue.
 *
 * The id and the title both come off `match`, which is where
 * `src/vite/gateway.ts` puts the `ReportGatewayIssue`; an outcome
 * missing either is unreadable rather than half-read, because the
 * drawer's "also affected" button needs the id and its prompt needs
 * the title.
 *
 * @param gateway - The `gateway` member of an answer.
 * @returns The duplicate result, or `null` when this outcome is not a
 * readable `duplicate` one.
 */
function duplicateIn(
  gateway: Record<string, unknown>,
): SubmitDuplicate | null {
  if (gateway.status !== 'duplicate') {
    return null;
  }

  const match = recordIn(gateway.match);

  if (match === null) {
    return null;
  }

  const id = textIn(match.id);
  const title = textIn(match.title);

  if (id === null || title === null) {
    return null;
  }

  const url = urlIn(match.url);
  const result: SubmitDuplicate = url === undefined
    ? { status: 'duplicate', id, title }
    : { status: 'duplicate', id, title, url };

  return Object.freeze(result);
}

/**
 * Read an answer that refused the request itself.
 *
 * @param body - The parsed answer.
 * @returns The refusal, or `null` when the answer is not one.
 */
function refusalIn(body: Record<string, unknown>): SubmitRefused | null {
  if (body.status !== 'refused') {
    return null;
  }

  return refuse(reasonIn(body.reason));
}

/**
 * Post one JSON body to a route under the endpoint.
 *
 * The two throwing edges are caught SEPARATELY, and that is
 * load-bearing rather than tidy: one `try` around both would report a
 * dev server that answered HTML as one that did not answer at all,
 * and the colocated cases red on exactly that (measured -- the first
 * draft of this function shared one `catch` and two cases failed).
 * `JSON.stringify` runs before either `try` on purpose; see this
 * module's documentation.
 *
 * @param host - The one surface a feature may reach.
 * @param path - {@link FEEDBACK_REPORT_PATH} or
 * {@link FEEDBACK_COMMENT_PATH}.
 * @param payload - The body to send.
 * @returns The parsed answer, or the refusal to give the caller.
 */
async function ask(
  host: DevToolsHost,
  path: string,
  payload: unknown,
): Promise<FeedbackAnswer> {
  const sent = JSON.stringify(payload);
  let response: Response;

  try {
    response = await host.fetch(path, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: sent,
    });
  } catch {
    return { ok: false, refusal: refuse(UNREACHABLE_REASON) };
  }

  let parsed: unknown;

  try {
    parsed = await response.json();
  } catch {
    return { ok: false, refusal: refuse(UNREADABLE_REASON) };
  }

  const body = recordIn(parsed);

  if (body === null) {
    return { ok: false, refusal: refuse(UNREADABLE_REASON) };
  }

  return { ok: true, body };
}

/**
 * Send a built report to the dev server and read what became of it.
 *
 * @param host - The one surface a feature may reach.
 * @param report - The title, the built body, the collected context and
 * any attachments.
 * @returns One of the four {@link SubmitResult} shapes; never throws
 * for a network or an answer this module could not read.
 */
export async function submitFeedbackReport(
  host: DevToolsHost,
  report: FeedbackReport,
): Promise<SubmitResult> {
  const answer = await ask(host, FEEDBACK_REPORT_PATH, report);

  if (!answer.ok) {
    return answer.refusal;
  }

  const refusal = refusalIn(answer.body);

  if (refusal !== null) {
    return refusal;
  }

  const path = textIn(answer.body.path);

  if (answer.body.status !== 'stored' || path === null) {
    return refuse(UNREADABLE_REASON);
  }

  const gateway = recordIn(answer.body.gateway);

  if (gateway === null) {
    return store(path);
  }

  return filedIn(gateway) ?? duplicateIn(gateway) ?? store(path);
}

/**
 * Say "also affected" on an issue the tracker already has.
 *
 * The action has one name, here and everywhere: spec item 7 admits no
 * other wording for it. The arguments are `ReportGateway.comment`'s
 * own, in its own order, so a reader moving between the drawer, this
 * call, the route and the gateway meets one spelling.
 *
 * @param host - The one surface a feature may reach.
 * @param issueId - The {@link SubmitDuplicate.id} the report answered.
 * @param body - The comment markdown, already rendered.
 * @returns {@link SubmitFiled} for the issue that was commented on, or
 * {@link SubmitRefused}; nothing is stored by this route, so `stored`
 * is not among its answers.
 */
export async function submitAlsoAffected(
  host: DevToolsHost,
  issueId: string,
  body: string,
): Promise<SubmitResult> {
  const answer = await ask(host, FEEDBACK_COMMENT_PATH, { issueId, body });

  if (!answer.ok) {
    return answer.refusal;
  }

  const refusal = refusalIn(answer.body);

  if (refusal !== null) {
    return refusal;
  }

  const gateway = answer.body.status === 'commented'
    ? recordIn(answer.body.gateway)
    : null;

  if (gateway === null) {
    return refuse(UNREADABLE_REASON);
  }

  const filed = filedIn(gateway);

  if (filed !== null) {
    return filed;
  }

  return refuse(reasonIn(gateway.reason));
}
