/**
 * @packageDocumentation
 * A fresh scratch n8n taken to a public-API key with nobody at the
 * editor: an owner set up, a login as that owner, and one key minted
 * under the session that login opened. What it prints is the one
 * line an env file takes, `AR_N8N_API_KEY=<key>`, and nothing else.
 *
 * WHY THIS EXISTS. The scratch stack runs its n8n under the compose
 * project `ar-scratch` with no volume over `/home/node/.n8n` —
 * `docker-compose.scratch.yml` resets that list — so every `up` is an
 * instance holding no owner, no user and no key. Whatever reads that
 * instance over the public API wants a key, and the editor is the
 * only other place one comes from. On the dev instance a key has to
 * be manufactured around an owner somebody keeps, which
 * `context/local-stack.md` walks through; on a scratch instance there
 * is nothing to keep and nothing to restore, so this does it
 * unattended. `test-stack.sh` is the caller it is written for, and it
 * runs this by path.
 *
 * THE SEQUENCE IS A READING OF ONE IMAGE, NOT A CONTRACT. The three
 * routes are the editor's own `/rest` surface rather than the public
 * API, and n8n promises nothing about their members. Each was read
 * off `docker.n8n.io/n8nio/n8n:2.15.1`, the tag `docker-compose.yml`
 * pins, against a throwaway container with no volume:
 *
 * - `POST /rest/owner/setup` takes `email`, `firstName`, `lastName`
 *   and `password`, and answers a second setup on one instance with
 *   `400 Instance owner already setup`.
 * - `POST /rest/login` takes `emailOrLdapLoginId` and `password`, and
 *   answers with the session in an `n8n-auth` cookie.
 * - `POST /rest/api-keys` takes that cookie and `label`, `scopes` and
 *   `expiresAt` — the last required and nullable — and answers the
 *   usable key once, as `data.rawApiKey`.
 *
 * A tag bump is where those readings are taken again. A reply this
 * module does not recognise is refused by name rather than worked
 * around, so a moved member is a failed run and not a wrong key.
 *
 * THE LOGIN IS KEPT ON PURPOSE. On that image the setup reply already
 * sets an `n8n-auth` cookie, and that cookie alone was measured to
 * mint a key, so the login is not what makes the mint possible there.
 * It is kept because it is the sequence the baseline recorded, and
 * because it leaves the mint independent of whether a setup reply
 * carries a session at all — a behaviour of one route that nothing
 * here should come to rest on. The mint is sent under the login's
 * cookie and never the setup's, and a case reads that back.
 *
 * IT REFUSES EVERY BASE URL BUT `http://127.0.0.1:55678`, compared as
 * a string before any request, and every call is then built on that
 * constant rather than on what was passed in. An instance takes one
 * owner — the second setup is the `400` above — and the password this
 * run sets ends with the run, so aimed at some other instance with no
 * owner yet, this would leave that instance's editor behind a login
 * nobody holds. Nothing is normalised: `localhost`, a trailing slash
 * and `https` are each refused, because the one caller spells the
 * address one way and a parser deciding two spellings name one
 * instance is a second thing to get wrong. The refusal does not quote
 * what it was handed, which could carry userinfo.
 *
 * THE PASSWORD LIVES FOR ONE RUN. {@link generateThrowawayPassword}
 * draws it from `node:crypto`, it goes into the setup body and the
 * login body, and nothing else holds it. It is no setting, no
 * argument, no export, no line of output and no part of any refusal,
 * each of which quotes the instance's reply and never the request.
 * This file imports nothing that writes anywhere but the console — no
 * filesystem module, no child process, no environment write — and
 * `tests/scripts/scratch-instance.test.ts` reads that off its source
 * rather than off this sentence. Nobody can log in to the instance
 * afterwards, which costs nothing: the sqlite holding the owner lives
 * in the container layer and dies with the container.
 *
 * THE KEY LISTS AND DOES NOTHING ELSE. `["workflow:list"]` is the
 * smallest scope set the baseline found: the mint refuses an empty
 * one, and of the 53 scopes the image offers an owner, one key per
 * scope against `GET /api/v1/workflows` answered 200 for that scope
 * alone, `workflow:read` among the 52 answering 403. The same key on
 * a deactivation answered 403 and left the workflow armed. So a
 * verification holding it can list what the instance runs and cannot
 * change it. It is minted with no expiry, `null` being the value
 * that asks for none, because the instance it opens is gone before
 * an expiry would matter.
 *
 * STDOUT IS ONE LINE OR NOTHING. The line is written once the key is
 * in hand and never before, so a shell appending this command's
 * output to an env file appends that line or nothing. The key is
 * refused unless it is three dot-separated base64url segments, the
 * JWT shape the mint answered with, which is what stops a reply
 * carrying a newline or a `$(` from becoming a second line or a
 * command in whatever sources that file. A refusal is a message on
 * stderr and exit 1, written by the guard at the foot of this file
 * and not by the run, so stdout stays empty on every run that ends
 * without a key.
 *
 * THE FETCH IS HANDED IN, as {@link ScratchFetch}, and it is not
 * `HttpFetch` from `n8n-client.ts`. That slice reads a status and a
 * body because a keyed public-API call wants nothing more; a login
 * answers in a header, so this one adds `headers.getSetCookie`. Not
 * `headers.get('set-cookie')`: measured under Bun 1.3.14, that joins
 * every cookie on a comma, and the `Expires` date n8n sets carries a
 * comma of its own. Nothing in `n8n-client.ts` is called either. Its
 * calls are made with a key, and every call here is made to get one.
 */

import { randomBytes } from 'node:crypto';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

/**
 * The one base URL a run accepts: the scratch n8n, on the loopback
 * port `docker-compose.scratch.yml` publishes it at.
 *
 * Every request is built on this constant rather than on the operand
 * it was compared with. The two are equal on every run that gets as
 * far as a request, so what that buys is that the refusal is the
 * only thing standing between an operand and a socket: take it away
 * and a foreign operand still dials this address, which a case
 * reading the stub's calls sees.
 */
const SCRATCH_BASE_URL = 'http://127.0.0.1:55678';

/** Where the owner is set up. */
const OWNER_SETUP_PATH = '/rest/owner/setup';

/** Where a session is opened. */
const LOGIN_PATH = '/rest/login';

/** Where a public-API key is minted under a session. */
const API_KEYS_PATH = '/rest/api-keys';

/**
 * Who the owner is.
 *
 * Throwaway values for an instance that dies with its container. The
 * address is under `.invalid`, a name reserved never to resolve,
 * which the setup route's email check was measured to accept; the
 * names only have to be non-empty.
 */
const SCRATCH_OWNER = {
  email: 'owner@scratch.invalid',
  firstName: 'Scratch',
  lastName: 'Owner',
} as const;

/**
 * The label the key is minted under, which is what the instance
 * lists it by. Within the 1-to-50 characters the route takes, and
 * nothing in it that its markup pass would change.
 */
const SCRATCH_KEY_LABEL = 'ar-scratch';

/**
 * The scopes the key is minted with: `workflow:list` alone, the only
 * one of the 53 offered that a workflow listing answered 200 for.
 */
const SCRATCH_KEY_SCOPES: readonly string[] = ['workflow:list'];

/** The cookie the instance carries a session in. */
const SESSION_COOKIE = 'n8n-auth';

/** What every request here says its body is. */
const JSON_HEADERS: Readonly<Record<string, string>> = {
  'content-type': 'application/json',
};

/**
 * What a key has to look like before it is printed: three
 * dot-separated base64url segments.
 *
 * The JWT shape the mint was measured to answer with, and narrow on
 * purpose. What it keeps out is what would matter in the file the
 * line lands in — a newline, a space, a quote, a `$` — so a reply
 * carrying any of them is refused rather than printed.
 */
const KEY_SHAPE = /^[\w-]+\.[\w-]+\.[\w-]+$/;

/** What the one line of output opens with. */
const KEY_LINE_PREFIX = 'AR_N8N_API_KEY=';

/**
 * The fixed head of every password: an uppercase letter and a digit.
 *
 * The setup route refuses a password without one of each, and a
 * random tail is not certain to carry either, so the head carries
 * both whatever the bytes came out as.
 */
const PASSWORD_HEAD = 'Z9-';

/**
 * How many random bytes the tail is drawn from.
 *
 * 24 bytes are 32 base64url characters, so a password is 35 in all:
 * inside the 8 to 64 the setup route takes, and 192 random bits
 * nobody is ever asked to type.
 */
const PASSWORD_RANDOM_BYTES = 24;

/**
 * A password for one owner on one scratch instance.
 *
 * Exported so a case can hold the shape against the rules the setup
 * route was measured to enforce. A run never takes one from outside:
 * {@link runScratchInstanceCli} calls this itself, so there is no seam
 * through which a password could arrive, or be kept, beside the run.
 *
 * @returns {@link PASSWORD_HEAD} followed by a fresh random tail.
 */
export function generateThrowawayPassword(): string {
  const tail = randomBytes(PASSWORD_RANDOM_BYTES).toString('base64url');

  return `${PASSWORD_HEAD}${tail}`;
}

/**
 * The request members a call here sets, and nothing besides.
 *
 * Every call is a `POST` with a JSON body, and the key mint adds the
 * session cookie to the headers.
 */
export interface ScratchRequest {
  /** The serialized JSON body. */
  readonly body: string;

  /** The content type, and on the mint the session cookie. */
  readonly headers: Readonly<Record<string, string>>;

  /** The HTTP method, which is `POST` on all three. */
  readonly method: string;
}

/**
 * The reply members a call here reads, and the whole of what a
 * stand-in has to answer with.
 *
 * `n8n-client.ts`'s `HttpReply` plus the one header reader a login
 * needs. The body is read once, as text, for the reason given there.
 */
export interface ScratchReply {
  /** The cookies the reply set, one entry per `Set-Cookie` header. */
  readonly headers: {
    /**
     * Every `Set-Cookie` header, whole and unjoined.
     *
     * @returns One string per cookie, attributes included.
     */
    getSetCookie(): readonly string[];
  };

  /** Whether the status is a success, as the reply itself says. */
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
 * The slice of `fetch` every call here goes through.
 *
 * Named by shape for the reason `HttpFetch` in `n8n-client.ts` is:
 * the real global is assignable to it as it stands, and a stand-in
 * answers four members and is done.
 *
 * @param url - The absolute URL, built on {@link SCRATCH_BASE_URL}.
 * @param init - The method, headers and body.
 * @returns The instance's reply.
 */
export type ScratchFetch = (
  url: string,
  init: ScratchRequest,
) => Promise<ScratchReply>;

/**
 * A base URL other than {@link SCRATCH_BASE_URL}, refused before any
 * request is made.
 *
 * The message names the one address accepted and never the one
 * handed in: an operand is the caller's text, and a URL can carry a
 * user and a password in front of its host.
 */
export class ForeignInstanceError extends Error {
  public constructor() {
    super(
      'refusing that base URL: an owner and a key are set up on the '
      + `scratch instance alone, which is ${SCRATCH_BASE_URL}`,
    );
    this.name = 'ForeignInstanceError';
  }
}

/** The command line the guard below reads, spelled out. */
const SCRATCH_USAGE = `usage: bun scripts/scratch-instance.ts ${SCRATCH_BASE_URL}`;

/**
 * A command line carrying other than exactly one operand.
 *
 * Refused rather than defaulted: with no operand there is nothing for
 * {@link ForeignInstanceError} to refuse, and a caller that passed a
 * second one meant something this command does not do.
 */
export class ScratchUsageError extends Error {
  /**
   * @param count - How many operands the command line carried.
   */
  public constructor(count: number) {
    super(`${SCRATCH_USAGE} (one operand, ${count} given)`);
    this.name = 'ScratchUsageError';
  }
}

/** The three steps, as a refusal names the one that stopped a run. */
export type ScratchStep = 'key mint' | 'login' | 'owner setup';

/**
 * One step the instance did not complete the way a key needs.
 *
 * Two kinds of failure share it. A reply that is not a success is
 * quoted whole, because the instance's own body is what says why — an
 * owner already set up, a password refused, a scope the role is not
 * offered. A success missing what the next step needs — a login with
 * no session cookie, a mint with no key of the right shape — is
 * described and never quoted, because a successful body is the one
 * that carries a session or a key.
 *
 * Neither ever carries the request, and that is the shape rather
 * than a redaction: the password travels in a request body, and
 * nothing here builds a message out of one.
 */
export class ScratchStepError extends Error {
  /** The step that stopped the run. */
  public readonly step: ScratchStep;

  /** The status the instance answered that step with. */
  public readonly status: number;

  /**
   * @param step - The step that stopped the run.
   * @param status - The status the instance answered it with.
   * @param detail - The body of a refusal, or what a success lacked.
   */
  public constructor(step: ScratchStep, status: number, detail: string) {
    super(`${step} answered ${status}: ${detail}`);
    this.name = 'ScratchStepError';
    this.step = step;
    this.status = status;
  }
}

/** What a login is refused for when it opens no session. */
const NO_SESSION = `no ${SESSION_COOKIE} cookie came with it to mint a key under`;

/** What a mint is refused for when its key is absent or misshapen. */
const NO_KEY = 'no data.rawApiKey in the shape of a key came with it';

/** A reply, and its body read once. */
interface Answered {
  /** The body, as text. */
  readonly body: string;

  /** The reply it was read from, for its status and its headers. */
  readonly reply: ScratchReply;
}

/**
 * Make one step's request, and refuse a reply that is not a success.
 *
 * @param through - The fetch the run was handed.
 * @param step - Which step this is, for a refusal to name.
 * @param path - Where under {@link SCRATCH_BASE_URL} it is made.
 * @param payload - The body, serialized here.
 * @param session - The session cookie, on the one step that sends it.
 * @returns The reply and its body.
 * @throws ScratchStepError When the reply is not a success, quoting
 *   its body.
 */
async function post(
  through: ScratchFetch,
  step: ScratchStep,
  path: string,
  payload: unknown,
  session?: string,
): Promise<Answered> {
  const headers = session === undefined
    ? JSON_HEADERS
    : { ...JSON_HEADERS, cookie: session };
  const reply = await through(`${SCRATCH_BASE_URL}${path}`, {
    body: JSON.stringify(payload),
    headers,
    method: 'POST',
  });
  const body = await reply.text();

  if (!reply.ok) {
    throw new ScratchStepError(step, reply.status, body);
  }

  return { body, reply };
}

/**
 * The session a login opened, as the cookie header that sends it back.
 *
 * The `name=value` pair of the `n8n-auth` cookie with its attributes
 * cut off, which is exactly what a `Cookie` header carries. A pair
 * with nothing after the `=` is no session.
 *
 * @param login - The login's reply.
 * @returns The pair, ready to send.
 * @throws ScratchStepError When the reply set no such cookie.
 */
function sessionOf(login: ScratchReply): string {
  const prefix = `${SESSION_COOKIE}=`;

  for (const cookie of login.headers.getSetCookie()) {
    const end = cookie.indexOf(';');
    const pair = end === -1
      ? cookie
      : cookie.slice(0, end);

    if (pair.startsWith(prefix) && pair.length > prefix.length) {
      return pair;
    }
  }

  throw new ScratchStepError('login', login.status, NO_SESSION);
}

/**
 * Whether a parsed value can have a member read off it.
 *
 * @param value - What `JSON.parse` answered.
 * @returns Whether it is a non-null object.
 */
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}

/**
 * The key a mint answered with, refused unless it has
 * {@link KEY_SHAPE}.
 *
 * @param mint - The mint's reply and body.
 * @returns The key.
 * @throws ScratchStepError When the body is not JSON, carries no
 *   `data.rawApiKey`, or carries one of another shape.
 */
function keyOf(mint: Answered): string {
  let parsed: unknown;

  try {
    parsed = JSON.parse(mint.body);
  } catch {
    throw new ScratchStepError('key mint', mint.reply.status, NO_KEY);
  }

  const key = isRecord(parsed) && isRecord(parsed.data)
    ? parsed.data.rawApiKey
    : undefined;

  if (typeof key !== 'string' || !KEY_SHAPE.test(key)) {
    throw new ScratchStepError('key mint', mint.reply.status, NO_KEY);
  }

  return key;
}

/**
 * Set an owner up, log in as it, and mint the key.
 *
 * The password is generated here and goes no further than the two
 * bodies that carry it, so it is out of reach the moment this
 * returns or throws.
 *
 * @param baseUrl - The instance to reach, which has to be
 *   {@link SCRATCH_BASE_URL}.
 * @param through - The fetch every call goes through.
 * @returns The key.
 * @throws ForeignInstanceError When `baseUrl` is anything else,
 *   before any request.
 * @throws ScratchStepError When a step is refused or answers short of
 *   what the next one needs; nothing after that step is requested.
 */
async function mintScratchKey(
  baseUrl: string,
  through: ScratchFetch,
): Promise<string> {
  if (baseUrl !== SCRATCH_BASE_URL) {
    throw new ForeignInstanceError();
  }

  const password = generateThrowawayPassword();

  await post(through, 'owner setup', OWNER_SETUP_PATH, {
    ...SCRATCH_OWNER,
    password,
  });

  const login = await post(through, 'login', LOGIN_PATH, {
    emailOrLdapLoginId: SCRATCH_OWNER.email,
    password,
  });
  const session = sessionOf(login.reply);
  const mint = await post(through, 'key mint', API_KEYS_PATH, {
    expiresAt: null,
    label: SCRATCH_KEY_LABEL,
    scopes: SCRATCH_KEY_SCOPES,
  }, session);

  return keyOf(mint);
}

/**
 * The base URL a command line names, refused unless it names exactly
 * one thing.
 *
 * @param argv - The operands, the runtime and the script path already
 *   cut off.
 * @returns The one operand.
 * @throws ScratchUsageError When there is not exactly one.
 */
function baseUrlOf(argv: readonly string[]): string {
  const [baseUrl, ...extra] = argv;

  if (baseUrl === undefined || extra.length > 0) {
    throw new ScratchUsageError(argv.length);
  }

  return baseUrl;
}

/**
 * Everything a run cannot find out for itself: its operands and what
 * it talks through.
 */
export interface ScratchOptions {
  /** The operands, the runtime and the script path already cut off. */
  readonly argv: readonly string[];

  /**
   * What every call goes through, taken as an argument so that a case
   * drives the run against a stub and the isolated suite reaches no
   * instance.
   */
  readonly fetch: ScratchFetch;
}

/**
 * One run end to end: read the operand, refuse any address but the
 * scratch instance's, set up, log in, mint, and print the line.
 *
 * Both refusals come before the first request, and the line is the
 * only thing written, after the last one.
 *
 * @param options - The operands and the fetch. Defaults to the
 *   process's own; a caller handing over its own is what makes this
 *   drivable with no instance.
 * @throws ScratchUsageError When there is not exactly one operand.
 * @throws ForeignInstanceError When that operand is not
 *   {@link SCRATCH_BASE_URL}.
 * @throws ScratchStepError When the instance refuses a step or
 *   answers short of what the next one needs.
 */
export async function runScratchInstanceCli(
  options: ScratchOptions = configuredOptions(),
): Promise<void> {
  const baseUrl = baseUrlOf(options.argv);
  const key = await mintScratchKey(baseUrl, options.fetch);

  console.log(`${KEY_LINE_PREFIX}${key}`);
}

/**
 * The two seams with the process's own values in them.
 *
 * The fetch is the global one, and this is the single place in the
 * file the real network is chosen.
 *
 * @returns The operands and the fetch a real run uses.
 */
function configuredOptions(): ScratchOptions {
  return {
    argv: process.argv.slice(2),
    fetch,
  };
}

/**
 * Every refusal this command raises on purpose, each a message whole
 * enough to print without a stack.
 *
 * What is not here is whatever the fetch itself throws — nothing
 * listening on the port, a connection reset — which prints with its
 * stack, on stderr like the rest.
 */
const SCRATCH_REFUSALS = [
  ForeignInstanceError,
  ScratchStepError,
  ScratchUsageError,
];

/**
 * Whether a caught value is one this command can report as a message.
 *
 * @param cause - What the run threw.
 * @returns Whether its message is the whole report.
 */
function isScratchRefusal(cause: unknown): cause is Error {
  return SCRATCH_REFUSALS.some((refusal) => cause instanceof refusal);
}

/**
 * Whether this file is what the process was started with, rather than
 * something another module imported.
 *
 * `fileURLToPath` because `import.meta.url` is a `file:` URL where
 * `process.argv[1]` is a path; `scripts/build-workflows.ts` carries
 * the measurement behind that. A case importing
 * {@link runScratchInstanceCli} gets the export and sets nothing up.
 */
const INVOKED_AS_CLI = process.argv[1] !== undefined
  && fileURLToPath(import.meta.url) === process.argv[1];

if (INVOKED_AS_CLI) {
  try {
    await runScratchInstanceCli();
  } catch (cause) {
    // stderr and never stdout: the caller captures stdout as the env
    // line, so a refusal written there would become a line of the env
    // file. The exit code is what tells that caller there is no key.
    process.exitCode = 1;
    console.error(
      isScratchRefusal(cause)
        ? cause.message
        : cause,
    );
  }
}
