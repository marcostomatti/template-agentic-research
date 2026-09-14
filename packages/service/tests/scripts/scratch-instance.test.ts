/**
 * What `scripts/scratch-instance.ts` sends a stub and writes, over
 * five kinds of reading: a run refused before any request, the three
 * requests of a run that ends with a key, the password two of them
 * carry, a run the instance stops at each step, and the module's own
 * source.
 *
 * Nothing here opens a socket, and the reason is weaker than the one
 * `tests/scripts/panic-external.test.ts` gives for itself. That file
 * points its runs at a `.invalid` host. This module accepts exactly
 * one base URL and it is a real loopback address, so a run that had
 * lost its stub would reach whatever answers on that port — a scratch
 * n8n, if one is up. What stands in the way is the options bag, every
 * run here handing over its own fetch, and the cases themselves:
 * each one reads back the calls that fetch recorded, so a run that
 * went anywhere else reddens on a call list that is empty or short.
 * The stub's cookies and key are strings no n8n issues, so a line
 * printed from a real reply would not match either.
 *
 * THE FIRST BLOCK IS THE REFUSAL of an address, and of a command line
 * carrying other than one operand. Every refused run is read for an
 * empty call list, and the block closes on the control an absence
 * claim needs: the accepted address, through a stub built the same
 * way, reaches all three routes.
 *
 * THE SECOND BLOCK IS THE SEQUENCE, one case per request, each
 * reading that request back off the stub: its method and URL, its
 * headers, and its body's members. The mint's cookie is held to the
 * LOGIN's session with the setup's session on offer, which is what
 * makes the login a step a case can see rather than one a run could
 * drop, and a near-miss cookie name sits in front of the real one.
 *
 * THE THIRD BLOCK IS THE PASSWORD: its shape against the rules the
 * setup route was measured to enforce, each rule shown able to refuse
 * a planted password; a fresh one per run; and the setup and login
 * bodies as the only places it reaches.
 *
 * THE FOURTH BLOCK IS WHERE A RUN STOPS. The instance refuses or
 * answers short at each step in turn, and each case reads the call
 * list to end at that step, with nothing written and no password in
 * the refusal. The key shape sits there too, as the near miss of the
 * one-line claim: a key carrying a newline would otherwise print two.
 *
 * THE FIFTH BLOCK READS THE MODULE'S SOURCE for anything that could
 * put the password somewhere other than a request. Comments are
 * stripped first, and every reach is planted twice, once in code for
 * the reader to find and once in a comment for it to pass over.
 *
 * WHAT NO CASE REACHES is the `INVOKED_AS_CLI` block — the exit code,
 * and a refusal going to stderr rather than stdout — since it runs
 * only when the module is what the process was started with. The
 * hand run recorded with this task stands in for it.
 */
import type {
  ScratchFetch,
  ScratchReply,
  ScratchRequest,
  ScratchStep,
} from '../../scripts/scratch-instance.js';

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  ForeignInstanceError,
  ScratchStepError,
  ScratchUsageError,
  generateThrowawayPassword,
  runScratchInstanceCli,
} from '../../scripts/scratch-instance.js';

// ---------------------------------------------------------------------------
// The instance these runs are pointed at
// ---------------------------------------------------------------------------

/** A line feed, built from its code so no raw byte sits in this file. */
const LINE_FEED = String.fromCharCode(10);

/**
 * The one base URL the module accepts, spelled here rather than read
 * off the module, so a module that had moved it disagrees with this.
 */
const ACCEPTED_URL = 'http://127.0.0.1:55678';

/** The owner setup, as a label to compare. */
const SETUP_CALL = `POST ${ACCEPTED_URL}/rest/owner/setup`;

/** The login, as a label to compare. */
const LOGIN_CALL = `POST ${ACCEPTED_URL}/rest/login`;

/** The key mint, as a label to compare. */
const MINT_CALL = `POST ${ACCEPTED_URL}/rest/api-keys`;

/** Every call of a run that ends with a key, in order. */
const EVERY_CALL = [SETUP_CALL, LOGIN_CALL, MINT_CALL];

/** The session the stub's setup reply sets, which the mint must not use. */
const SETUP_SESSION = 'n8n-auth=zzstubsetupsessionzz';

/** The session the stub's login reply sets, which the mint must use. */
const LOGIN_SESSION = 'n8n-auth=zzstubloginsessionzz';

/**
 * A cookie whose name only starts like the session's, set in front of
 * it on the login reply.
 */
const NEAR_MISS_COOKIE = 'n8n-authx=zzstubnearmisszz; Path=/';

/** The key the stub's mint answers with, in the three-segment shape. */
const STUB_KEY = 'zzstubheader.zzstubpayload.zzstubsignature';

/** The one line a run that ends with that key prints. */
const KEY_LINE = `AR_N8N_API_KEY=${STUB_KEY}`;

/** A success status. */
const OK_STATUS = 200;

/** The lowest status above the success range. */
const PAST_SUCCESS_STATUS = 300;

/** What the stub answers a call to any other route with. */
const NOT_FOUND_STATUS = 404;

/**
 * A session as the instance sets it, with the attributes the image
 * was recorded setting, the comma inside `Expires` included.
 *
 * @param session - The `name=value` pair.
 * @returns The whole `Set-Cookie` value.
 */
function setCookieOf(session: string): string {
  return `${session}; Max-Age=604800; Path=/; `
    + 'Expires=Mon, 21 Sep 2026 12:03:49 GMT; HttpOnly; Secure; SameSite=Lax';
}

/** The user a setup and a login answer with, cut down. */
const OWNER_BODY = JSON.stringify({
  data: { isOwner: true, role: 'global:owner' },
});

/**
 * A mint reply carrying a given `rawApiKey`.
 *
 * @param rawApiKey - What the reply says the key is.
 * @returns The reply body.
 */
function mintBodyOf(rawApiKey: unknown): string {
  return JSON.stringify({
    data: {
      apiKey: '******ture',
      label: 'ar-scratch',
      rawApiKey,
      scopes: ['workflow:list'],
    },
  });
}

// ---------------------------------------------------------------------------
// The stub every call goes through
// ---------------------------------------------------------------------------

/** One call, as the stub was handed it. */
interface RecordedCall {
  /** The method, headers and body the module assembled. */
  readonly init: ScratchRequest;

  /** The absolute URL it assembled them for. */
  readonly url: string;
}

/** What the stub answers one call with. */
interface StubAnswer {
  /** The body, as text. */
  readonly body: string;

  /** Every `Set-Cookie` value. Defaults to none. */
  readonly cookies?: readonly string[];

  /** The status. Defaults to {@link OK_STATUS}. */
  readonly status?: number;
}

/**
 * An instance, as a function of the call's label.
 *
 * A function rather than a list of replies in order, so a run making
 * an unexpected call shows up as an extra label in the call list
 * rather than as a stub that ran out.
 */
type Instance = (label: string) => StubAnswer;

/**
 * One recorded call as a line to read: the method and the URL.
 *
 * @param call - The call as the stub recorded it.
 * @returns Its method and URL.
 */
function labelOf(call: RecordedCall): string {
  return `${call.init.method} ${call.url}`;
}

/**
 * A fresh scratch instance: no owner yet, so every step succeeds.
 *
 * @param label - The call's label.
 * @returns What that route answers.
 */
function freshInstance(label: string): StubAnswer {
  if (label === SETUP_CALL) {
    return { body: OWNER_BODY, cookies: [setCookieOf(SETUP_SESSION)] };
  }

  if (label === LOGIN_CALL) {
    return {
      body: OWNER_BODY,
      cookies: [NEAR_MISS_COOKIE, setCookieOf(LOGIN_SESSION)],
    };
  }

  return label === MINT_CALL
    ? { body: mintBodyOf(STUB_KEY) }
    : { body: '{"message":"not found"}', status: NOT_FOUND_STATUS };
}

/**
 * A fresh instance answering one route differently.
 *
 * @param at - The label of the call answered differently.
 * @param answer - What that call is answered with.
 * @returns The instance.
 */
function answeringAt(at: string, answer: StubAnswer): Instance {
  return (label) => label === at
    ? answer
    : freshInstance(label);
}

/** A stub, and the calls it has been handed so far. */
interface CallRecorder {
  /** Every call, in the order they were made. */
  readonly calls: readonly RecordedCall[];

  /** What the run is handed as its fetch. */
  readonly fetch: ScratchFetch;
}

/**
 * A fresh stub, one per run, so the calls a case reads are the calls
 * of ONE run. `ok` is derived from the status because a real reply
 * derives it, and a stub answering the two apart could hand the
 * module a pair no instance could.
 *
 * @param instance - What the instance answers each call with.
 * @returns The call list and the fetch that writes to it.
 */
function recorder(instance: Instance): CallRecorder {
  const calls: RecordedCall[] = [];

  return {
    calls,
    fetch: (url, init) => {
      const call = { init, url };

      calls.push(call);

      const {
        body,
        cookies = [],
        status = OK_STATUS,
      } = instance(labelOf(call));
      const reply: ScratchReply = {
        headers: { getSetCookie: () => [...cookies] },
        ok: status >= OK_STATUS && status < PAST_SUCCESS_STATUS,
        status,
        text: () => Promise.resolve(body),
      };

      return Promise.resolve(reply);
    },
  };
}

// ---------------------------------------------------------------------------
// One run, and everything it produced to be read
// ---------------------------------------------------------------------------

/** Stands in for the thrown value when the run came back instead. */
const RETURNED = Symbol('nothing thrown');

/** One run, as the stub, the console and whatever threw all saw it. */
interface ScratchRun {
  /** Every call the stub was handed, in order. */
  readonly calls: readonly RecordedCall[];

  /** Every line written to either console stream. */
  readonly lines: readonly string[];

  /** What it threw, or {@link RETURNED}. */
  readonly thrown: unknown;
}

/**
 * Run the command against a stub of its own, collecting both console
 * streams for the length of the run and putting them back after.
 *
 * Both streams, because "nothing but the line" is a claim about
 * everything the run writes rather than about stdout alone.
 *
 * @param argv - The operands.
 * @param instance - What the instance answers.
 * @returns Its calls, its lines and whatever stopped it.
 */
async function scratchRun(
  argv: readonly string[],
  instance: Instance = freshInstance,
): Promise<ScratchRun> {
  const stub = recorder(instance);
  const written: string[] = [];
  const printed = { error: console.error, log: console.log };
  const collect = (...args: readonly unknown[]): void => {
    written.push(args.map((arg) => String(arg)).join(' '));
  };
  let thrown: unknown = RETURNED;

  console.error = collect;
  console.log = collect;

  try {
    await runScratchInstanceCli({ argv, fetch: stub.fetch });
  } catch (cause) {
    thrown = cause;
  } finally {
    console.error = printed.error;
    console.log = printed.log;
  }

  return {
    calls: stub.calls,
    lines: written.flatMap((entry) => entry.split(LINE_FEED)),
    thrown,
  };
}

/**
 * The call a run made to one route, refused where it made none, so a
 * case reading a request that never came fails naming the calls that
 * did.
 *
 * @param run - The run.
 * @param label - The call's label.
 * @returns The first such call.
 */
function callAt(run: ScratchRun, label: string): RecordedCall {
  const call = run.calls.find((candidate) => labelOf(candidate) === label);

  if (call === undefined) {
    throw new Error(
      `the stub received no ${label}; it received `
      + JSON.stringify(run.calls.map(labelOf)),
    );
  }

  return call;
}

/**
 * A recorded call's body, parsed.
 *
 * @param call - The call.
 * @returns Its members.
 */
function bodyOf(call: RecordedCall): Readonly<Record<string, unknown>> {
  const parsed: unknown = JSON.parse(call.init.body);

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error(`${labelOf(call)} sent a body that is not an object`);
  }

  return parsed as Readonly<Record<string, unknown>>;
}

/**
 * The password a run sent, read off its setup request.
 *
 * @param run - The run.
 * @returns The password.
 */
function passwordOf(run: ScratchRun): string {
  const { password } = bodyOf(callAt(run, SETUP_CALL));

  if (typeof password !== 'string') {
    throw new TypeError('the setup body carried no password string');
  }

  return password;
}

/**
 * What a run refused with, as text, or a sentence saying it returned.
 *
 * @param run - The run.
 * @returns The message.
 */
function messageOf(run: ScratchRun): string {
  return run.thrown instanceof Error
    ? run.thrown.message
    : `(nothing thrown: ${String(run.thrown)})`;
}

/**
 * The step a run was stopped at. Only `ScratchStepError` counts and
 * anything else thrown is rethrown, so a run stopped by something
 * else reports itself.
 *
 * @param run - The run.
 * @returns The step, or a sentinel where nothing was refused.
 */
function stepOf(run: ScratchRun): ScratchStep | '(nothing refused)' {
  if (run.thrown === RETURNED) {
    return '(nothing refused)';
  }

  if (run.thrown instanceof ScratchStepError) {
    return run.thrown.step;
  }

  throw run.thrown;
}

// ---------------------------------------------------------------------------
// The refusal
// ---------------------------------------------------------------------------

describe('scratch-instance refuses before it reaches anything', () => {
  it.each([
    { baseUrl: 'http://127.0.0.1:5678', name: 'the dev n8n' },
    { baseUrl: 'http://localhost:55678', name: 'the scratch port by name' },
    { baseUrl: 'http://127.0.0.1:55678/', name: 'a trailing slash' },
    { baseUrl: 'https://127.0.0.1:55678', name: 'https' },
  ])('refuses $name ($baseUrl) with no request made', async ({ baseUrl }) => {
    const run = await scratchRun([baseUrl]);

    expect(run.thrown).toBeInstanceOf(ForeignInstanceError);
    expect(run.calls.map(labelOf)).toStrictEqual([]);
    expect(run.lines).toStrictEqual([]);
  });

  it('quotes nothing of an address it refuses, which can carry a password', async () => {
    const run = await scratchRun(['http://owner:zzstubsecretzz@127.0.0.1:55678']);

    expect(run.thrown).toBeInstanceOf(ForeignInstanceError);
    expect(run.calls.map(labelOf)).toStrictEqual([]);
    // Guard: the message does quote an address, the accepted one, so
    // the absence below is read off a message that names URLs.
    expect(messageOf(run)).toContain(ACCEPTED_URL);
    expect(messageOf(run).includes('zzstubsecretzz')).toBe(false);
  });

  it.each([
    { argv: [], name: 'no operand' },
    { argv: [ACCEPTED_URL, ACCEPTED_URL], name: 'a second operand' },
  ])('refuses a command line carrying $name with no request made', async ({ argv }) => {
    const run = await scratchRun(argv);

    expect(run.thrown).toBeInstanceOf(ScratchUsageError);
    expect(run.calls.map(labelOf)).toStrictEqual([]);
    expect(run.lines).toStrictEqual([]);
  });

  it('reaches every route for the one address it accepts, through a stub built the same way', async () => {
    const run = await scratchRun([ACCEPTED_URL]);

    expect(run.thrown).toBe(RETURNED);
    expect(run.calls.map(labelOf)).toStrictEqual(EVERY_CALL);
  });
});

// ---------------------------------------------------------------------------
// The sequence
// ---------------------------------------------------------------------------

describe('scratch-instance sets up, logs in and mints, in that order', () => {
  it('makes the three requests in order and prints the one line', async () => {
    const run = await scratchRun([ACCEPTED_URL]);

    expect(run.calls.map(labelOf)).toStrictEqual(EVERY_CALL);
    expect(run.lines).toStrictEqual([KEY_LINE]);
  });

  it('sends the setup route an owner as JSON, with no cookie', async () => {
    const run = await scratchRun([ACCEPTED_URL]);
    const setup = callAt(run, SETUP_CALL);
    const body = bodyOf(setup);

    expect(Object.keys(body).sort())
      .toStrictEqual(['email', 'firstName', 'lastName', 'password']);
    expect(setup.init.headers)
      .toStrictEqual({ 'content-type': 'application/json' });
    expect(body.email).toMatch(/^[^\s@]+@[^\s@]+\.invalid$/);
    expect(body.firstName).toMatch(/\S/);
    expect(body.lastName).toMatch(/\S/);
  });

  it('logs in as that owner with that password, as JSON, with no cookie', async () => {
    const run = await scratchRun([ACCEPTED_URL]);
    const setup = bodyOf(callAt(run, SETUP_CALL));
    const login = callAt(run, LOGIN_CALL);

    expect(bodyOf(login)).toStrictEqual({
      emailOrLdapLoginId: setup.email,
      password: setup.password,
    });
    expect(login.init.headers)
      .toStrictEqual({ 'content-type': 'application/json' });
  });

  it('mints a workflow:list key with no expiry under the login session, not the setup one', async () => {
    const run = await scratchRun([ACCEPTED_URL]);
    const mint = callAt(run, MINT_CALL);

    // Guard: the stub offered both sessions, and a near-miss cookie
    // name ahead of the login's, so the header below is a choice.
    expect(freshInstance(SETUP_CALL).cookies)
      .toStrictEqual([setCookieOf(SETUP_SESSION)]);
    expect(freshInstance(LOGIN_CALL).cookies)
      .toStrictEqual([NEAR_MISS_COOKIE, setCookieOf(LOGIN_SESSION)]);

    expect(bodyOf(mint)).toStrictEqual({
      expiresAt: null,
      label: 'ar-scratch',
      scopes: ['workflow:list'],
    });
    expect(mint.init.headers).toStrictEqual({
      'content-type': 'application/json',
      cookie: LOGIN_SESSION,
    });
  });
});

// ---------------------------------------------------------------------------
// The password
// ---------------------------------------------------------------------------

/** The shortest password the setup route takes. */
const PASSWORD_FLOOR = 8;

/** The longest. */
const PASSWORD_CEILING = 64;

/**
 * Every rule of the setup route's password check a password breaks,
 * as the baseline read them off the image: 8 to 64 characters, at
 * least one digit, at least one uppercase letter.
 *
 * @param password - The password.
 * @returns One fault per rule broken, in a fixed order.
 */
function policyFaultsOf(password: string): readonly string[] {
  return [
    password.length < PASSWORD_FLOOR && 'shorter than 8',
    password.length > PASSWORD_CEILING && 'longer than 64',
    !/\d/.test(password) && 'no digit',
    !/[A-Z]/.test(password) && 'no uppercase letter',
  ].filter((fault) => typeof fault === 'string');
}

describe('scratch-instance holds a password for one run and nowhere else', () => {
  it.each([
    { faults: ['shorter than 8'], name: 'seven characters', password: 'Short1A' },
    { faults: ['longer than 64'], name: 'sixty-five characters', password: `A1${'x'.repeat(63)}` },
    { faults: ['no digit'], name: 'no digit', password: 'NoDigitsHere' },
    { faults: ['no uppercase letter'], name: 'no uppercase letter', password: 'nouppercase1' },
  ])('the policy reader refuses a planted password with $name', ({ faults, password }) => {
    expect(policyFaultsOf(password)).toStrictEqual(faults);
  });

  it('generates a password the setup route takes, and a different one each call', () => {
    const first = generateThrowawayPassword();
    const second = generateThrowawayPassword();

    expect(policyFaultsOf(first)).toStrictEqual([]);
    expect(policyFaultsOf(second)).toStrictEqual([]);
    expect(first).not.toBe(second);
  });

  it('sends a fresh password on every run', async () => {
    const first = await scratchRun([ACCEPTED_URL]);
    const second = await scratchRun([ACCEPTED_URL]);

    expect(policyFaultsOf(passwordOf(first))).toStrictEqual([]);
    expect(passwordOf(first)).not.toBe(passwordOf(second));
  });

  it('puts the password in the setup and login bodies and in no other request or line', async () => {
    const run = await scratchRun([ACCEPTED_URL]);
    const password = passwordOf(run);
    const carrying = run.calls
      .filter((call) => JSON.stringify(call).includes(password))
      .map(labelOf);

    expect(carrying).toStrictEqual([SETUP_CALL, LOGIN_CALL]);
    expect(run.lines).toStrictEqual([KEY_LINE]);
    expect(run.lines.filter((line) => line.includes(password)))
      .toStrictEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Where a run stops
// ---------------------------------------------------------------------------

describe('scratch-instance stops at the step the instance refuses, printing nothing', () => {
  it.each([
    {
      answer: {
        body: '{"code":400,"message":"Instance owner already setup"}',
        status: 400,
      },
      at: SETUP_CALL,
      name: 'a setup on an instance that has its owner',
      quotes: ['Instance owner already setup'],
      reached: [SETUP_CALL],
      step: 'owner setup',
      withholds: [],
    },
    {
      answer: {
        body: '{"code":401,"message":"Wrong username or password."}',
        status: 401,
      },
      at: LOGIN_CALL,
      name: 'a login refusing the password',
      quotes: ['Wrong username or password.'],
      reached: [SETUP_CALL, LOGIN_CALL],
      step: 'login',
      withholds: [],
    },
    {
      answer: { body: OWNER_BODY, cookies: [NEAR_MISS_COOKIE] },
      at: LOGIN_CALL,
      name: 'a login setting only a near-miss cookie',
      quotes: [],
      reached: [SETUP_CALL, LOGIN_CALL],
      step: 'login',
      withholds: ['zzstubnearmisszz', 'global:owner'],
    },
    {
      answer: { body: OWNER_BODY, cookies: ['n8n-auth=; Path=/'] },
      at: LOGIN_CALL,
      name: 'a login setting an empty session',
      quotes: [],
      reached: [SETUP_CALL, LOGIN_CALL],
      step: 'login',
      withholds: ['global:owner'],
    },
    {
      answer: {
        body: '{"code":400,"message":"Invalid scopes for user role"}',
        status: 400,
      },
      at: MINT_CALL,
      name: 'a mint refusing the scopes',
      quotes: ['Invalid scopes for user role'],
      reached: EVERY_CALL,
      step: 'key mint',
      withholds: [],
    },
    {
      answer: { body: JSON.stringify({ data: { apiKey: '******ture' } }) },
      at: MINT_CALL,
      name: 'a mint answering no key',
      quotes: [],
      reached: EVERY_CALL,
      step: 'key mint',
      withholds: ['******ture'],
    },
    {
      answer: { body: '<html>zzstubpagezz</html>' },
      at: MINT_CALL,
      name: 'a mint answering a body that is not JSON',
      quotes: [],
      reached: EVERY_CALL,
      step: 'key mint',
      withholds: ['zzstubpagezz'],
    },
    {
      answer: { body: mintBodyOf(42) },
      at: MINT_CALL,
      name: 'a key that is not a string',
      quotes: [],
      reached: EVERY_CALL,
      step: 'key mint',
      withholds: [],
    },
    {
      answer: {
        body: mintBodyOf(`${STUB_KEY}${LINE_FEED}AR_N8N_URL=zzstubzz`),
      },
      at: MINT_CALL,
      name: 'a key carrying a second line',
      quotes: [],
      reached: EVERY_CALL,
      step: 'key mint',
      withholds: [STUB_KEY, 'zzstubzz'],
    },
    {
      answer: { body: mintBodyOf('zzstub.zzstub.$(zzstubcommand)') },
      at: MINT_CALL,
      name: 'a key carrying a command substitution',
      quotes: [],
      reached: EVERY_CALL,
      step: 'key mint',
      withholds: ['zzstubcommand'],
    },
  ])('refuses $name at the $step step', async ({
    answer,
    at,
    quotes,
    reached,
    step,
    withholds,
  }) => {
    const run = await scratchRun([ACCEPTED_URL], answeringAt(at, answer));
    const message = messageOf(run);
    const leaked = [passwordOf(run), ...withholds]
      .filter((text) => message.includes(text));

    expect(run.calls.map(labelOf)).toStrictEqual(reached);
    expect(stepOf(run)).toBe(step);
    expect(run.lines).toStrictEqual([]);
    expect(quotes.filter((text) => !message.includes(text)))
      .toStrictEqual([]);
    expect(leaked).toStrictEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The module's own source
// ---------------------------------------------------------------------------

/** The module under test, as text. */
const MODULE_SOURCE = readFileSync(
  new URL('../../scripts/scratch-instance.ts', import.meta.url),
  'utf8',
);

/** A block comment, TSDoc included. */
const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//g;

/** A line comment standing on a line of its own. */
const LINE_COMMENT = /^\s*\/\/.*$/gm;

/**
 * A source with its comments taken out, so prose naming a reach is
 * not read as one.
 *
 * @param source - The source.
 * @returns What is left.
 */
function codeOf(source: string): string {
  return source.replace(BLOCK_COMMENT, '').replace(LINE_COMMENT, '');
}

/** Each way a module could put a value anywhere but a request. */
const WRITING_REACHES: readonly {
  readonly name: string;
  readonly pattern: RegExp;
}[] = [
  { name: 'a filesystem module', pattern: /from\s+'(?:node:)?fs(?:\/promises)?'/ },
  { name: 'a child process', pattern: /from\s+'(?:node:)?child_process'/ },
  { name: 'a Bun call', pattern: /\bBun\./ },
  { name: 'the environment', pattern: /\bprocess\.env\b/ },
  { name: 'a dynamic import', pattern: /\bimport\(|\brequire\(/ },
];

/**
 * Every reach a source's code makes.
 *
 * @param source - The source.
 * @returns The name of each reach found, in roster order.
 */
function writingReachesIn(source: string): readonly string[] {
  const code = codeOf(source);

  return WRITING_REACHES
    .filter(({ pattern }) => pattern.test(code))
    .map(({ name }) => name);
}

/**
 * Every module specifier a source's code imports from, sorted.
 *
 * @param source - The source.
 * @returns The specifiers.
 */
function importSpecifiersOf(source: string): readonly string[] {
  return [...codeOf(source).matchAll(/from\s+'([^']+)'/g)]
    .flatMap((match) => match[1] === undefined
      ? []
      : [match[1]])
    .sort();
}

describe('scratch-instance imports nothing that could keep the password', () => {
  it('makes none of the reaches the roster names', () => {
    expect(writingReachesIn(MODULE_SOURCE)).toStrictEqual([]);
  });

  it('imports node:crypto, node:process and node:url and nothing else', () => {
    expect(importSpecifiersOf(MODULE_SOURCE))
      .toStrictEqual(['node:crypto', 'node:process', 'node:url']);
  });

  it.each([
    { name: 'a filesystem module', probe: 'import { writeFileSync } from \'node:fs\';' },
    { name: 'a filesystem module', probe: 'import { writeFile } from \'fs/promises\';' },
    { name: 'a child process', probe: 'import { execFileSync } from \'node:child_process\';' },
    { name: 'a Bun call', probe: 'await Bun.write(\'owner.txt\', password);' },
    { name: 'the environment', probe: 'process.env.AR_SCRATCH_PASSWORD = password;' },
    { name: 'a dynamic import', probe: 'const fs = await import(\'node:fs\');' },
  ])('finds $name planted in code, and not in a comment: $probe', ({ name, probe }) => {
    expect(writingReachesIn(probe)).toStrictEqual([name]);
    expect(writingReachesIn(`/** ${probe} */`)).toStrictEqual([]);
    expect(writingReachesIn(`// ${probe}`)).toStrictEqual([]);
  });
});
