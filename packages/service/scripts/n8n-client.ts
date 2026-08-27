/**
 * @packageDocumentation
 * The HTTP calls this package's operator commands make against an n8n
 * instance's public REST API. `n8n-workflow.ts` next door is the half
 * that opens no socket and wants no credential, answering what it can
 * from a workflow VALUE; this is the half where both happen, so a
 * caller reaching for this module is one that has decided to talk to
 * a running instance rather than to reason about a file.
 *
 * Where that instance is and what authenticates against it are
 * configuration rather than anything this module invents.
 * `AR_N8N_URL` is the base URL every call below is built on and
 * `AR_N8N_API_KEY` is the key the instance issued for those calls,
 * both declared in `src/config.ts`. Both are optional there, so
 * parsing configuration refuses neither, and the refusal for an
 * absent value belongs to the command that wanted one:
 * `deploy-external.ts` reports which of the two is missing before it
 * attempts a request. That leaves this module nothing to check at
 * load.
 *
 * Nothing here reaches an instance until it is called, which is the
 * other half of the same property. Importing this module opens no
 * socket and sends no request: the calls are functions, and a file
 * that names them has made none of them. That is what keeps it
 * importable by the default suite, which touches no external service
 * at all — one doing its HTTP at load could not be reached from there
 * at any price, and that rule is one `AGENTS.md` states with an
 * incident behind it rather than a preference of style.
 *
 * Two of the three instance-facing commands in this directory call
 * in. `deploy-external.ts` uploads built artifacts and
 * `audit-workflows.ts` reads back what an instance is holding, both
 * over the API; `activate-workflows.sh` is the one that does not,
 * activation going through the n8n CLI against a local container
 * rather than over HTTP. The first of those has opened and its
 * `deploy` calls in, listing what an instance holds and creating or
 * replacing each workflow against it; {@link activateWorkflow} is the
 * one of the four still waiting for a caller, arming being the CLI
 * path's job on a local instance and nothing a deploy does.
 * `audit-workflows.ts` has opened since, with no call in it yet — the
 * listing it wants arrives with its command line later in this stage,
 * and so does `activate-workflows.sh`. So `n8n-workflow.ts` answers
 * for three commands where this module serves two, and what parts
 * them is a transport rather than an omission. The live seam under
 * `tests/live/` arrives with them and is no command at all.
 *
 * {@link listWorkflows}, {@link createWorkflow},
 * {@link updateWorkflow} and {@link activateWorkflow} are those
 * calls, each taking the fetch it uses as an argument, so a case can
 * drive one against a stub and the isolated suite stays isolated by
 * construction rather than by discipline. A reply that is not a
 * success is refused rather than handed back, and
 * {@link UnsuccessfulReplyError} is what carries the endpoint, the
 * status and the body it was refused over. Every call reaches that
 * refusal through one function, so one cause covers all four.
 *
 * What an instance does with each of these was read out of the spec
 * and the handler n8n 2.15.1 ships — `dist/public-api/v1/openapi.yml`
 * and `dist/public-api/v1/handlers/workflows/workflows.handler.js` —
 * rather than from documentation about the API. That is a version and
 * not a release channel, n8n publishing ahead of it on `stable`, so
 * every claim below describes the API this port read and not whatever
 * an instance happens to be running.
 */

import type { ApiWorkflow } from './n8n-workflow.js';

/**
 * The reply members these calls read, and the whole of what a
 * stand-in has to answer with.
 *
 * A body is wanted whether or not the call succeeded — a refusal
 * quotes what the instance sent back — and a reply may be read once,
 * so the one read is a read of TEXT and the parse happens afterwards.
 * That is why {@link HttpReply.text} is the only method here and no
 * `json` sits beside it: a slice carrying both would let a caller
 * read the body twice, which is a thing the real type permits and the
 * real object refuses: measured, a `json()` after a `text()` is a
 * `TypeError` reading `Body already used`.
 */
export interface HttpReply {
  /**
   * Whether the status is a success. Read rather than derived from
   * {@link HttpReply.status}, because it is the reply's own answer
   * about its own status and a range test here would be a second
   * one.
   */
  readonly ok: boolean;

  /** The HTTP status, which a refusal names. */
  readonly status: number;

  /**
   * The body as text, read once and parsed by the caller.
   *
   * @returns The whole body, empty string included.
   */
  text(): Promise<string>;
}

/**
 * The request members these calls set, and nothing besides.
 *
 * Three, because three is what a JSON API over a key needs: a method,
 * the headers carrying the key and the content type, and a body on
 * the two calls that send one. No signal, no redirect policy, no
 * timeout — a stand-in answering for this shape is answering for
 * everything the module asks a fetch to do.
 */
export interface HttpRequest {
  /**
   * The serialized request body, absent on a call that sends none.
   * Already a string: this module serializes, so nothing downstream
   * has to agree with it about how.
   */
  readonly body?: string;

  /** The request headers, the API key among them. */
  readonly headers: Readonly<Record<string, string>>;

  /** The HTTP method, spelled as the API spells it. */
  readonly method: string;
}

/**
 * The slice of `fetch` every call in this module reaches for.
 *
 * Structural rather than `typeof fetch`, which is the same choice
 * `LibTranspiler` in `scripts/build-workflows.ts` makes about
 * `Bun.Transpiler` and made for a related reason. There the class
 * cannot be constructed in a vitest worker at all; here the real
 * global is perfectly constructible and its type is the problem — a
 * parameter naming it would have every stand-in implement an
 * overloaded signature over `Request`, `URL` and `Headers`, none of
 * which this module sends or reads. Named by shape, a stand-in
 * answers three members and is done, and the real `fetch` is
 * assignable to it as it stands.
 *
 * Nothing type-checks the seam. The only files handing a stand-in
 * over are `*.test.ts`, which `tsconfig.json` excludes from the
 * program, so a member added here leaves every stand-in short of it
 * and the first report is a case failing on the call.
 *
 * @param url - The absolute URL to call, assembled by this module.
 * @param init - The method, headers and body for that call.
 * @returns The instance's reply.
 */
export type HttpFetch = (url: string, init: HttpRequest) => Promise<HttpReply>;

/**
 * One n8n instance, as far as a call needs to know one: where it is,
 * what authenticates against it, and what does the talking.
 *
 * One bag rather than three parameters, because every call wants all
 * three and none of them is the call's own subject — an id or a
 * workflow is what parts one call from another, and the instance is
 * what they share. A command resolves it once and threads one value.
 *
 * {@link N8nInstance.fetch} sits in the bag rather than arriving as a
 * separate argument with the global behind it as a default, and that
 * is the load-bearing decision here. A default would make the
 * isolated suite's isolation a matter of every case remembering to
 * override it; required, a case that forgot would not compile if
 * `*.test.ts` were checked and does not run if it is not. The
 * property `AGENTS.md` states — the default suite touches no external
 * service — is then a consequence of the signature rather than of
 * discipline.
 *
 * Nothing here is validated. An empty key or a base URL naming
 * nothing reaches the instance and comes back as whatever it answers,
 * because the refusal for a setting that is absent belongs to the
 * command that wanted it and `src/config.ts` says so from the other
 * end. A shape check here would be a second one, disagreeing with
 * that one the first time either moved.
 */
export interface N8nInstance {
  /** The API key, sent as a header and named in no message. */
  readonly apiKey: string;

  /**
   * The instance's base URL, with or without the API path on the end
   * of it — {@link apiRoot} takes both.
   */
  readonly baseUrl: string;

  /** The fetch every call in this module goes through. */
  readonly fetch: HttpFetch;
}

/**
 * A workflow as an instance answers with one, cut down to the three
 * members a caller comes here for.
 *
 * `id` is how a workflow is addressed again — an update, an
 * activation, a delete all take it, and it is per-instance, so it is
 * learned rather than carried. `name` is the handle that IS stable
 * across instances, which is what makes an upsert match on it. And
 * `active` is whether the instance has the workflow armed, which the
 * deploy path reads to know whether an activation is still owed.
 *
 * Every member `unknown`, for the reason `ApiWorkflow` gives next
 * door: nothing in this module reads one, so a caller wanting an id
 * as a string narrows it where it needs one and none has to promise a
 * shape it did not check. Open, because the answer carries a great
 * deal more than three members — timestamps, a version id, a trigger
 * count, the nodes and the wiring — and none of it is this module's
 * to name.
 *
 * What the cast behind this is worth is exactly one check. The reader
 * refuses a value that is not a non-null object before handing it
 * back, so a member read on one of these cannot fail on the value
 * itself; that a member is THERE is not checked and not claimed, and
 * an answer short of one reads back `undefined`.
 */
export interface RemoteWorkflow {
  /** Whether the instance has this workflow armed. */
  readonly active: unknown;

  /** The instance's own id for this workflow, stable nowhere else. */
  readonly id: unknown;

  /** The display name, which is what an upsert matches on. */
  readonly name: unknown;

  /** Everything else the answer carries, read by nobody here. */
  readonly [key: string]: unknown;
}

/** Where the public API is mounted, per the spec's own `servers`. */
const API_PATH = '/api/v1';

/**
 * The largest page the API will answer with. Its `limit` parameter
 * defaults to 100 and declares a maximum of 250, so this is the
 * fewest round trips a full listing can take rather than a tuning
 * choice.
 */
const PAGE_LIMIT = 250;

/**
 * How many pages {@link listWorkflows} will follow before it refuses.
 *
 * The cursor loop is the one loop in this module whose end another
 * machine decides, so it gets a bound. At {@link PAGE_LIMIT}
 * workflows a page that is ten thousand of them, which no instance
 * this port deploys to is near — and the bound REFUSES rather than
 * returning what it has, because a listing silently cut short is what
 * the audit path would read as a pile of workflows that are missing.
 */
const MAX_PAGES = 40;

/**
 * The API root every call is built on, from an operator's base URL.
 *
 * Trailing slashes go, and a base URL that already ends in the API
 * path is taken as naming the root rather than having a second copy
 * appended to it. Both spellings are ones an operator pastes, and the
 * alternative is not a refusal but a silent one: the doubled path
 * would 404 on every call, and a refusal naming an endpoint and a
 * status says nothing about the base URL that produced it.
 *
 * @param baseUrl - The configured base URL, either spelling.
 * @returns The URL prefix an endpoint is appended to.
 */
function apiRoot(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/u, '');

  return trimmed.endsWith(API_PATH)
    ? trimmed
    : `${trimmed}${API_PATH}`;
}

/**
 * The headers one call sends.
 *
 * The key travels as `X-N8N-API-KEY`, which is what the spec's own
 * security scheme names; `accept` asks for JSON, which is the only
 * thing any of these routes answers with; and `content-type` is set
 * only where there is a body, so a GET does not announce one it did
 * not send.
 *
 * @param apiKey - The key the instance issued.
 * @param hasBody - Whether this call sends a serialized body.
 * @returns The headers for that call.
 */
function requestHeaders(
  apiKey: string,
  hasBody: boolean,
): Readonly<Record<string, string>> {
  const headers = { accept: 'application/json', 'X-N8N-API-KEY': apiKey };

  return hasBody
    ? { ...headers, 'content-type': 'application/json' }
    : headers;
}

/**
 * Thrown when an instance answers a call with anything but a success.
 *
 * The reply's own `ok` is what decides that, and what the refusal
 * carries is what a reader acts on: the endpoint that was called, the
 * status the instance answered with, and the body it sent back. The
 * body is there because a status on its own is a number to go and ask
 * about, while the body is where an instance says which member it
 * would not take. The method rides with the endpoint, for the reason
 * {@link UnsuccessfulReplyError.method} gives.
 *
 * A distinct class rather than a bare `Error`, so a case covering a
 * refused call can pin the refusal to it. Every other way one of
 * these calls fails arrives as `Error`: a success whose body is not a
 * workflow object, a listing page carrying no list of them, an
 * instance offering more pages than {@link MAX_PAGES}, a
 * `SyntaxError` out of `JSON.parse` for a success whose body is not
 * JSON at all, and whatever the injected fetch raises when it cannot
 * reach the host. An assertion taking any `Error` would pass for
 * every one of those.
 *
 * What stands behind this refusal is worth having measured rather
 * than assumed, and it is not one answer. Measured with the check
 * deleted and each call driven against a stub answering `400` with
 * the instance's own refusal body: {@link createWorkflow},
 * {@link updateWorkflow} and {@link activateWorkflow} RESOLVE,
 * handing that refusal body back as a workflow whose `id`, `name` and
 * `active` all read `undefined`, so a deploy records a create the
 * instance never made. {@link listWorkflows} is caught one function
 * on, by the reader that finds no list in the page, but what it
 * reports is a success carrying no workflows, which sends a reader to
 * check the base URL over a call the instance answered perfectly
 * clearly. So nothing stands behind the class for three of the four,
 * and what stands behind it for the fourth names the wrong thing.
 *
 * Nothing about the API key reaches the message, and that is the
 * shape rather than a redaction. The refusal is built out of the
 * REPLY and the path it was asked of, while the key is a member of
 * the REQUEST, travelling as the `X-N8N-API-KEY` header. Measured
 * either side of one call: the assembled URL carries no key, it being
 * a header and not a query, and the request object handed to the
 * fetch does, so a refusal built from the request would carry it and
 * one built from the reply has nothing to carry. The four values are
 * enumerable own properties of the error, so a `JSON.stringify` over
 * one prints them and leaves out `message` and `stack`, which are
 * not. All three of those readings were measured, and the key is in
 * none of them.
 *
 * The limit is the body. It is the instance's own text, quoted whole
 * and read by nothing here, so what this class promises is that
 * nothing IT holds about the credential reaches a message rather than
 * that no character of an arbitrary body ever could. An instance
 * echoing a request header back inside an error would be quoted as
 * faithfully as one naming a member it would not take.
 */
export class UnsuccessfulReplyError extends Error {
  /**
   * The method that reached the endpoint, carried because an endpoint
   * on its own does not name a call. The API mounts a listing and a
   * create on `/workflows`, so a refusal naming the path and not the
   * method names two of them. It belongs to the message rather than
   * being a fourth thing the refusal is about: what a reader acts on
   * is the endpoint, the status and the body.
   */
  readonly method: string;

  /**
   * The path under the API root, with its own query and with no base
   * URL in front of it. That is one fewer thing about an operator's
   * own deployment in a log, and it is also why a refusal cannot be
   * read as an opinion about the base URL: it names the call and
   * never the instance it was made against.
   */
  readonly endpoint: string;

  /**
   * The status the instance answered with, which is what parts the
   * edits this refusal can prescribe. A `401` is the key in
   * `AR_N8N_API_KEY`, a `404` on a workflow path is an id this
   * instance does not hold, and a `400` is the body this port sent
   * it.
   */
  readonly status: number;

  /**
   * The body the instance sent back, exactly as it sent it and an
   * empty one included. It is read before the status is judged, so it
   * is here whether or not there was ever anything to parse.
   */
  readonly body: string;

  /**
   * @param method - The method the call was made with.
   * @param endpoint - The path under the API root it was made to.
   * @param status - The status the instance answered with.
   * @param body - The body it sent back.
   */
  constructor(
    method: string,
    endpoint: string,
    status: number,
    body: string,
  ) {
    super(
      `The n8n public API answered ${method} ${endpoint} with ` +
      `${status} rather than a success, and this body: ${body}. ` +
      'Which edit that asks for is the instance\'s to say: a 401 is ' +
      'the key in `AR_N8N_API_KEY`, a 404 on a workflow path is an ' +
      'id this instance does not hold, and a 400 is the body this ' +
      'port sent it.',
    );
    this.name = this.constructor.name;
    this.method = method;
    this.endpoint = endpoint;
    this.status = status;
    this.body = body;
  }
}

/**
 * Make one call and hand back its parsed body.
 *
 * Every call in this module goes through here, which is what settles
 * the URL, the headers, the refusal and the parse once rather than
 * four times. The four exported functions are then each an endpoint,
 * a method and a reading of the answer.
 *
 * The body is read before the status is judged, because a refusal
 * quotes it: an instance that refuses a workflow says which member it
 * would not take, and a reader who is told only `400` has to go and
 * ask again. It is read as text for {@link HttpReply}'s reason, and
 * the parse happens after.
 *
 * The refusal is {@link UnsuccessfulReplyError}, thrown from here and
 * nowhere else. That is what lets a caller tell a call the instance
 * refused from a reply it could not read, over four calls and one
 * `catch`.
 *
 * Nothing about the key reaches that refusal, and the reason is what
 * this function hands over rather than a redaction: the method, the
 * path, and the reply's own status and body, never the request it
 * built. The key sits in that request, as a header, and
 * {@link UnsuccessfulReplyError} is where the whole of it is argued.
 *
 * The parse is not wrapped. A success carrying a body that is not
 * JSON arrives as whatever `JSON.parse` raises, which names an offset
 * in the text and not the call that produced it; that is the one
 * failure on this path a reader is left to trace by hand, and the
 * shape readers above it name the endpoint for every other.
 *
 * @param instance - Where to call and what to authenticate with.
 * @param method - The HTTP method.
 * @param endpoint - The path under the API root, query and all.
 * @param body - The request body, on the calls that send one.
 * @returns The parsed reply body.
 * @throws UnsuccessfulReplyError When the instance answered
 *   anything but a success.
 */
async function request(
  instance: N8nInstance,
  method: string,
  endpoint: string,
  body?: ApiWorkflow,
): Promise<unknown> {
  const bodyText = body === undefined
    ? undefined
    : JSON.stringify(body);
  const reply = await instance.fetch(`${apiRoot(instance.baseUrl)}${endpoint}`, {
    body: bodyText,
    headers: requestHeaders(instance.apiKey, bodyText !== undefined),
    method,
  });
  const text = await reply.text();

  if (!reply.ok) {
    throw new UnsuccessfulReplyError(method, endpoint, reply.status, text);
  }

  return JSON.parse(text);
}

/**
 * Read a parsed reply body as one workflow.
 *
 * The one check the cast to {@link RemoteWorkflow} earns, and the
 * whole of it: a non-null object that is not an array. An array would
 * pass a bare object test and then answer `undefined` for every
 * member a caller reads, which is the shape that fails somewhere
 * else, later, about something else.
 *
 * A plain `Error` rather than a class, on the split
 * `tests/invariants/schema-sql.ts` already draws: a class is what
 * lets a case PIN a cause, and no case drives an instance into
 * answering a success with a body of the wrong shape.
 *
 * @param endpoint - The path that produced this body, for the
 *   refusal to name.
 * @param body - The parsed reply.
 * @returns The same value, read as a workflow.
 * @throws Error When the body is not an object.
 */
function workflowOf(endpoint: string, body: unknown): RemoteWorkflow {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new Error(
      `the n8n public API answered ${endpoint} with a success whose ` +
      'body is not a workflow object, so there is nothing to read an ' +
      'id or a name off. Check that the base URL names an n8n ' +
      'instance and not something in front of one.',
    );
  }

  return body as RemoteWorkflow;
}

/** One page of a workflow listing, as {@link pageOf} reads it. */
interface WorkflowPage {
  /**
   * The cursor for the page after this one, or `null` on the last —
   * which is the API's own signal, `nextCursor` being nullable and
   * null exactly when there is nothing further to read.
   */
  readonly cursor: string | null;

  /**
   * The workflows this page carried, in the order it carried them.
   */
  readonly workflows: readonly RemoteWorkflow[];
}

/**
 * Read a parsed reply body as one page of a listing.
 *
 * The listing route answers with an envelope rather than an array —
 * `data` alongside `nextCursor` — so both halves are read here, and
 * the cursor is taken only when it is a string. A `null`, an absent
 * member and anything else all mean the same thing to the loop above,
 * which is that there is no page after this one.
 *
 * @param endpoint - The path that produced this body.
 * @param body - The parsed reply.
 * @returns The page's workflows and the cursor after it.
 * @throws Error When the envelope or one of its entries is not an
 *   object.
 */
function pageOf(endpoint: string, body: unknown): WorkflowPage {
  const envelope = workflowOf(endpoint, body);
  const data: unknown = envelope.data;

  if (!Array.isArray(data)) {
    throw new Error(
      `the n8n public API answered ${endpoint} with a success ` +
      'carrying no list of workflows, so a listing cannot be read ' +
      'off it. Check that the base URL names an n8n instance and ' +
      'not something in front of one.',
    );
  }

  const entries: readonly unknown[] = data;

  return {
    cursor: typeof envelope.nextCursor === 'string'
      ? envelope.nextCursor
      : null,
    workflows: entries.map((entry) => workflowOf(endpoint, entry)),
  };
}

/**
 * Every workflow the instance is holding, in the order it answered.
 *
 * Every one of them, which is what the cursor loop is for. The route
 * pages, and its `limit` maxes out at {@link PAGE_LIMIT}: a single
 * request answers with a page and a cursor, and stopping at the first
 * page would be a cap nothing reports. Both readings this list is for
 * make that concrete and the deploy makes it worst. An audit taking a
 * verdict over the whole of an instance from a page-sized answer
 * reports every workflow past the first page as missing and leaves
 * every stray among them unnamed, both silently and both in the
 * direction that reads as a clean instance. A deploy matching on a
 * name against the same answer finds no workflow it already put there
 * and CREATES a second one, which is the state its upsert then
 * refuses on every run after.
 *
 * No name filter, though the route has one, and that is measured
 * rather than an omission. Its handler builds the filter as
 * `Like('%' + name.trim() + '%')`, so `?name=` is a SUBSTRING match:
 * asking for one name answers with every workflow whose name contains
 * it, and a caller that took the answer for an exact match would
 * upsert onto a workflow it was not about. Matching a name exactly is
 * a caller's own filter over this list, where the whole set is in
 * front of it and a second workflow carrying the name is visible
 * rather than merely absent.
 *
 * @param instance - The instance to list.
 * @returns Every workflow it holds.
 * @throws UnsuccessfulReplyError When a reply is not a success.
 * @throws Error When a page is not a listing, or when the instance
 *   offers more pages than {@link MAX_PAGES}.
 */
export async function listWorkflows(
  instance: N8nInstance,
): Promise<readonly RemoteWorkflow[]> {
  const workflows: RemoteWorkflow[] = [];
  let cursor: string | null = null;
  let pages = 0;

  do {
    const endpoint = cursor === null
      ? `/workflows?limit=${PAGE_LIMIT}`
      : `/workflows?limit=${PAGE_LIMIT}&cursor=${encodeURIComponent(cursor)}`;
    const page = pageOf(endpoint, await request(instance, 'GET', endpoint));

    workflows.push(...page.workflows);
    cursor = page.cursor;
    pages += 1;

    if (cursor !== null && pages >= MAX_PAGES) {
      throw new Error(
        `listing workflows read ${String(workflows.length)} of them over ` +
        `${String(pages)} pages and the instance is still offering more. ` +
        'Either that instance holds far more workflows than this port ' +
        'deploys to one, or its cursor is not advancing.',
      );
    }
  } while (cursor !== null);

  return workflows;
}

/**
 * Create `workflow` on the instance and hand back what it made.
 *
 * The body is the projection and not an artifact: the schema behind
 * this route is `additionalProperties: false`, so a member outside it
 * is refused rather than ignored and nothing is created at all.
 * `toApiWorkflow` next door is what cuts an artifact down to a body
 * this route takes, and its own block is where the members and the
 * refusal are argued.
 *
 * Two members of the answer are the instance's own and not the
 * caller's. The handler forces `active` to false and mints a
 * `versionId` before it saves, so a newly created workflow is never
 * armed however the artifact that produced it was written — which is
 * what leaves an activation as a step of its own rather than
 * something a create can be asked to do.
 *
 * @param instance - Where to create it.
 * @param workflow - The four members the API takes.
 * @returns The workflow as the instance stored it, id and all.
 * @throws UnsuccessfulReplyError When the reply is not a success.
 * @throws Error When it is a success carrying no workflow object.
 */
export async function createWorkflow(
  instance: N8nInstance,
  workflow: ApiWorkflow,
): Promise<RemoteWorkflow> {
  const endpoint = '/workflows';

  return workflowOf(
    endpoint,
    await request(instance, 'POST', endpoint, workflow),
  );
}

/**
 * Replace the workflow at `id` with `workflow`.
 *
 * A replacement rather than a patch — the route is a `PUT` and the
 * handler assigns the body over a fresh entity — so a member the body
 * leaves out is a member the stored workflow loses. That is what the
 * deploy path wants and it is worth stating: an upsert whose update
 * half merged would leave nodes behind from whatever was there
 * before, and the instance would be running something no artifact
 * describes.
 *
 * `id` is the instance's own, learned from {@link listWorkflows} or
 * from a {@link createWorkflow} that just ran. It is escaped into the
 * path here, so a caller hands over the id it was given rather than a
 * path it assembled.
 *
 * @param instance - Where the workflow lives.
 * @param id - The instance's id for it.
 * @param workflow - The four members the API takes.
 * @returns The workflow as the instance stored it.
 * @throws UnsuccessfulReplyError When the reply is not a success.
 * @throws Error When it is a success carrying no workflow object.
 */
export async function updateWorkflow(
  instance: N8nInstance,
  id: string,
  workflow: ApiWorkflow,
): Promise<RemoteWorkflow> {
  const endpoint = `/workflows/${encodeURIComponent(id)}`;

  return workflowOf(
    endpoint,
    await request(instance, 'PUT', endpoint, workflow),
  );
}

/**
 * Arm the workflow at `id`, so the instance starts what its triggers
 * would start.
 *
 * No body, though the route takes an optional one naming a version to
 * publish. Absent, the instance publishes the latest, which is the
 * one an update just wrote — and naming a version here would mean
 * this module carrying a second opinion about which of an instance's
 * versions is current.
 *
 * This is the one call in the module that costs something after it
 * returns. Everything else moves stored JSON around; this one leaves
 * a timer set, a connection open or a URL answering, which is why
 * deciding whether a workflow has anything to arm belongs in front of
 * this call rather than in whatever an instance answers after it.
 * What a workflow would start is `activatableTriggers`, next door.
 *
 * @param instance - Where the workflow lives.
 * @param id - The instance's id for it.
 * @returns The workflow as the instance stored it, now armed.
 * @throws UnsuccessfulReplyError When the reply is not a success.
 * @throws Error When it is a success carrying no workflow object.
 */
export async function activateWorkflow(
  instance: N8nInstance,
  id: string,
): Promise<RemoteWorkflow> {
  const endpoint = `/workflows/${encodeURIComponent(id)}/activate`;

  return workflowOf(endpoint, await request(instance, 'POST', endpoint));
}
