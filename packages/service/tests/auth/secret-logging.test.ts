/**
 * The bootstrap password never reaches a log line. A service is
 * booted with a sentinel `AUTH_BASIC_PASSWORD`, everything the
 * process writes to stdout and stderr across the bootstrap and a
 * login is captured, and the sentinel is counted in it.
 *
 * THIS IS THE FIRST OF THE TWO INVARIANTS `01-invariants.md`
 * registers for auth, and it is the half no other file can report.
 * `routes.test.ts` asserts what each handler ANSWERS and
 * `bootstrap.test.ts` asserts what the upsert WRITES, and both are
 * green against a service that also prints the credential beside
 * every line — a log is not a return value, and nothing in a
 * response assertion can see one. What is asserted here is the
 * process's own output, which is where a credential goes to become
 * permanent.
 *
 * HOW THE CAPTURE WORKS, and why its ORDER is load-bearing rather
 * than incidental. pino picks its destination once, at logger
 * construction: `hasBeenTampered(process.stdout)` compares the
 * stream's own `write` against its prototype's, and a stream that
 * has NOT been replaced gets a `SonicBoom` writing straight to file
 * descriptor 1 — which no patch of `process.stdout.write` can ever
 * see. So the patch goes in FIRST and every logger on the path is
 * constructed under it: `createService`'s own, the separate
 * instance `applyMiddleware` builds for `pino-http`, and the one
 * {@link captureBootAndLogin} hands to `buildAuthRouter`. A logger
 * hoisted to module scope here would be built before the patch and
 * its lines would be missing from every capture, with the zero
 * below reading exactly as it does now. That is the failure the
 * planted case exists to rule out.
 *
 * THE CONSOLE IS PATCHED TOO, and that is a measurement rather than
 * belt-and-braces. `console.log` reaches stdout in a deployment,
 * but vitest replaces the console with its own reporting channel,
 * so under the runner a `console.log` reaches NO patch of
 * `process.stdout.write` at all (measured: zero writes for a
 * `console.log` and a `console.error` inside an open window). A
 * `console.log(credentials)` added to `src/auth/` would therefore
 * leak in production and be invisible here, which is a blind spot
 * and not a scope boundary — the five console methods that route
 * to stdout and stderr are captured alongside the two streams.
 *
 * WHAT A CAPTURE ACTUALLY HOLDS was measured rather than assumed:
 * seven writes and about 3.2 kB for one boot, one login and one
 * stop. `dependency started` naming `auth-bootstrap`, `listening`,
 * a `pino-http` `request completed` record per request, the two
 * shutdown lines — and, inside each request record, every REQUEST
 * HEADER. `applyMiddleware` builds its `pino-http` with no `redact`
 * option at all (the redacting `createHttpLogger` in
 * `lib/logger/node.ts` is a different constructor and this service
 * does not use it), so a credential that travelled in a header
 * would be in the capture in full. This one travels in a JSON body,
 * which `pino-http` does not serialise, and the containment is
 * therefore about the handlers rather than about the transport.
 *
 * THE ZERO'S IN-BAND CONTROLS, of which there are three, because a
 * capture that read nothing and a service that leaked nothing look
 * identical. The login is asserted to have answered `200` with a
 * token, which is the only reading that says the sentinel really
 * was the live credential — it was hashed by the bootstrap and
 * verified by the login handler, so a zero is about a value that
 * genuinely traversed the path rather than about one no code ever
 * touched. Then the capture is asserted to carry the bootstrap's
 * own `dependency started` line and a `request completed` record
 * for `/auth/login`, which is what says the window was open across
 * BOTH halves the claim names rather than around one of them.
 *
 * THE PLANTED CASE IS THE LIVENESS LEG and it covers the four
 * channels separately, because they are wired at four different
 * moments and any one of them could fall outside the window on its
 * own. The sentinel is emitted deliberately as a structured FIELD
 * through `ctx.logger`, as part of a MESSAGE through the router's
 * logger, as a request HEADER through `pino-http`, and through
 * `console.log` — four occurrences, asserted as an exact count, so
 * a plant landing twice on one channel cannot stand in for a
 * channel that was never captured at all. Everything else about
 * that run is the run above it, including the same three controls,
 * so the two cases differ in the plant and in nothing else. The
 * console plant is the one with no line of its own in the capture:
 * nothing in `src/auth/` writes to the console today, so the plant
 * is the whole of that channel's evidence, and it is there for the
 * edit that has not been made yet.
 *
 * RESTORING THE TWO STREAMS IS EXACT rather than approximate, and
 * this is the one file in the package that has to care. `write` is
 * NOT an own property of `process.stdout` — it is inherited from
 * `Socket.prototype`, measured — so the obvious
 * `process.stdout.write.bind(process.stdout)` round trip puts a
 * DIFFERENT function object back and leaves
 * `hasBeenTampered(process.stdout)` true forever after. Every pino
 * logger any later file in the worker constructs would then pick
 * `process.stdout` over its `SonicBoom`, which is a change to a
 * sibling suite's transport made by a file it never imports. The
 * window therefore saves the own property DESCRIPTOR and puts back
 * exactly what was there, deleting the shadow when there was none,
 * and both cases assert the result.
 *
 * NEITHER CASE ASSERTS A RESPONSE BODY. That the sentinel stays out
 * of what the service writes back is a separate claim with its own
 * case, added beside this one for the malformed-body path.
 *
 * Six mutations were run against these two cases, each split
 * confirmed across two passes.
 *
 * Two are the leaks this file is named for and both redden BOTH
 * cases. `bootstrapAuthUser` printing the configured password with
 * `console.log` reddens the zero on its count and the plant on its
 * exact four, which is the pair of readings that says the console
 * channel is genuinely load-bearing rather than decorative — before
 * the console was patched, the same mutation reddened NEITHER case
 * and the file reported a clean sweep over a leak in plain sight.
 * The login handler putting `parsed.data.password` into the line it
 * logs on success does the same through pino.
 *
 * One reddens NEITHER, and it is the gap worth naming rather than
 * closing here: putting the submitted password into the router's
 * REFUSAL warn is invisible, because the subject logs in
 * successfully and never reaches that branch. The malformed-body
 * case added beside this one is what covers it.
 *
 * Two redden the planted case ALONE, and they are the two ways the
 * window can quietly shrink. Constructing the router's logger at
 * module scope instead of inside the window drops the count to
 * three — the pino destination trap above, reported by nothing
 * else. Dropping the console patch drops it to three the same way.
 * Neither is noticed by the zero case, which is this file's whole
 * reason for having a planted case at all.
 *
 * The sixth reddens BOTH and is the only reading anywhere on the
 * restore: putting the streams back with a bound copy rather than
 * with the saved descriptor. It is worth noting that the leg's
 * DAMAGE is entirely outside this file — every case in the package
 * still passes under it — so the two assertions it reddens are not
 * a restatement of anything, they are the whole guard.
 *
 * Not a leg: dropping the `finally` itself. It changes nothing
 * while every assertion passes, and is invisible until one throws
 * inside the window — which is why every assertion below sits
 * outside it.
 */
import type {
  ServiceContext,
  ServiceHandle,
} from '../../lib/express/index.js';
import type { AuthDeps } from '../../src/auth/index.js';
import type { Response } from 'supertest';

import process from 'node:process';

import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createService } from '../../lib/express/index.js';
import { createLogger } from '../../lib/logger/node.js';
import {
  buildAuthRouter,
  createAuthBootstrapDependency,
  createDbSessionVerifier,
} from '../../src/auth/index.js';
import { createMemoryAuthStore } from '../helpers/memory-auth-store.js';

// Read at boot time by `createService`: an ephemeral port and no
// `process.exit` on a failed dependency. Set here rather than in a
// hook so it is already true for the first service built.
process.env.NODE_ENV = 'test';

/** The `AUTH_BASIC_USER` every service here boots with. */
const BASIC_USER = 'secret-logging-operator';

/**
 * The `AUTH_BASIC_PASSWORD` every service here boots with, and the
 * needle both cases count.
 *
 * Long enough for `AUTH_BASIC_PASSWORD`'s 12-character floor in
 * `src/config.ts`, and shaped so that no substring of a pino record
 * could produce it by accident — a timestamp, a port, a base64url
 * token and a PHC hash are all in the capture, and none of them can
 * spell this.
 */
const SENTINEL_PASSWORD = 'sentinel-Nn7Qv2xLd4Rk-must-never-be-logged';

/**
 * The `AUTH_INTROSPECT_SECRET` the router is built with.
 *
 * No case here reaches `POST /introspect`; the value is real rather
 * than empty so this file does not quietly become a test of the
 * closed-gate fallback, and it is deliberately NOT the sentinel — a
 * second secret spelled the same way would make the count ambiguous
 * about which one leaked.
 */
const INTROSPECT_SECRET = 'secret-logging-introspect-32-bytes-ok';

/** The TTL every session here is minted under. */
const SESSION_TTL_SECONDS = 3600;

/**
 * The console methods that reach stdout or stderr in a deployment.
 *
 * All five are replaced for the life of a capture window. See the
 * header: under vitest the console does NOT route through
 * `process.stdout.write`, so without this a `console.log` of a
 * credential is captured by nothing.
 */
const CONSOLE_METHODS = ['debug', 'error', 'info', 'log', 'warn'] as const;

/** One member of {@link CONSOLE_METHODS}. */
type ConsoleMethod = (typeof CONSOLE_METHODS)[number];

/**
 * Either standard stream, spelled without the ambient `NodeJS`
 * namespace — no ESLint config here declares that global, so the
 * `NodeJS.WriteStream` spelling is a `no-undef` error even though
 * tsc resolves it.
 */
type StdioStream = typeof process.stdout | typeof process.stderr;

/**
 * Replaces a stream's `write` and hands back the undo.
 *
 * The undo is a descriptor restore rather than an assignment,
 * because `write` is inherited here and putting a bound copy back
 * would leave the stream permanently tampered from pino's point of
 * view. See the header.
 *
 * @param stream - The stream to redirect.
 * @param sink - What to write through instead.
 * @returns A function putting the stream back exactly as it was.
 */
function redirectStream(
  stream: StdioStream,
  sink: StdioStream['write'],
): () => void {
  const original = Object.getOwnPropertyDescriptor(stream, 'write');

  stream.write = sink;

  return () => {
    if (original === undefined) {
      Reflect.deleteProperty(stream, 'write');
      return;
    }

    Object.defineProperty(stream, 'write', original);
  };
}

/**
 * Whether a stream's `write` is the one pino would call untampered.
 *
 * The same comparison `hasBeenTampered` makes in `pino/lib/tools`,
 * and the only reading that says a window closed cleanly.
 *
 * @param stream - The stream to check.
 * @returns True when the stream still carries its prototype's
 *   `write`.
 */
function isPristine(stream: StdioStream): boolean {
  const prototype = stream.constructor.prototype as StdioStream;

  return stream.write === prototype.write;
}

/** What one capture window produced. */
interface Capture {
  /** Everything written to stdout and stderr inside the window. */
  readonly text: string;
  /** The response to the `POST /auth/login` made inside it. */
  readonly login: Response;
}

/**
 * Counts occurrences of the sentinel in captured output.
 *
 * A count rather than a `toContain`, because the planted case's
 * claim is about how MANY channels reached the capture and a
 * presence assertion cannot express it.
 *
 * @param text - The captured stdout and stderr.
 * @returns How many times {@link SENTINEL_PASSWORD} occurs.
 */
function countSentinel(text: string): number {
  return text.split(SENTINEL_PASSWORD).length - 1;
}

/**
 * Boots a service over the sentinel credential, logs in with it,
 * and returns everything the process wrote while doing so.
 *
 * The patches on `process.stdout.write`, `process.stderr.write` and
 * the five console methods are installed before anything else and
 * removed in a `finally`, and NOTHING inside the window asserts: an
 * `expect` throwing between the two would leave all seven replaced
 * for the rest of the worker, and vitest's own account of the
 * failure would go into the array instead of to the terminal.
 * {@link expectStreamsRestored} is what says the `finally` put the
 * two streams back the way pino needs to find them.
 *
 * The store is the in-memory one, which is the only substitution.
 * The bootstrap hashes with real argon2id, the router mints and
 * verifies real tokens and `createService` builds the real
 * middleware stack, so the lines in the capture are the lines a
 * deployment writes.
 *
 * @param plantSentinel - When true, the sentinel is deliberately
 *   emitted once through each of the four channels on the path.
 * @returns The captured output and the login response.
 * @throws Error When `register` never ran, which would leave the
 *   planted branch with no context logger to write through.
 */
async function captureBootAndLogin(plantSentinel: boolean): Promise<Capture> {
  const chunks: string[] = [];
  const originalConsole = new Map<ConsoleMethod, unknown>();

  const sink = ((chunk: unknown): boolean => {
    chunks.push(String(chunk));
    return true;
  }) as StdioStream['write'];

  function consoleSink(...args: unknown[]): void {
    chunks.push(`${args.map((arg) => String(arg)).join(' ')}\n`);
  }

  let login: Response;

  const restoreOut = redirectStream(process.stdout, sink);
  const restoreErr = redirectStream(process.stderr, sink);

  for (const name of CONSOLE_METHODS) {
    originalConsole.set(name, console[name]);
    console[name] = consoleSink;
  }

  try {
    // Every logger below is constructed from here on, which is what
    // puts it inside the capture. See the header.
    const routerLogger = createLogger('secret-logging-auth');
    const store = createMemoryAuthStore();
    const deps: AuthDeps = {
      now: () => new Date(),
      ttlSeconds: SESSION_TTL_SECONDS,
    };

    let captured: ServiceContext | undefined;

    const handle: ServiceHandle = await createService({
      serviceId: 'secret-logging-probe',
      dependencies: [
        createAuthBootstrapDependency(store, deps, {
          user: BASIC_USER,
          password: SENTINEL_PASSWORD,
        }),
      ],
      auth: { verifier: createDbSessionVerifier(store, deps) },
      register(app, ctx) {
        captured = ctx;
        app.use('/auth', buildAuthRouter({
          store,
          clock: deps.now,
          ttlSeconds: deps.ttlSeconds,
          introspectSecret: INTROSPECT_SECRET,
          logger: routerLogger,
        }));
      },
    });

    if (captured === undefined) {
      throw new Error('register never ran, so no context was captured');
    }

    if (plantSentinel) {
      // One occurrence per channel, each in the shape a real leak
      // would take there: a bound field on the service logger, the
      // message text on the router's, a request header on
      // `pino-http`'s, and an argument on the console.
      captured.logger.info(
        { plantedField: SENTINEL_PASSWORD },
        'planted: a credential bound as a structured field',
      );
      routerLogger.warn(
        { route: 'login' },
        `planted: a credential in a message — ${SENTINEL_PASSWORD}`,
      );
      console.log(
        'planted: a credential on the console —',
        SENTINEL_PASSWORD,
      );
    }

    const pending = request(handle.app)
      .post('/auth/login')
      .send({ user: BASIC_USER, password: SENTINEL_PASSWORD });

    login = await (plantSentinel
      ? pending.set('x-planted-credential', SENTINEL_PASSWORD)
      : pending);

    await handle.stop();
  } finally {
    restoreOut();
    restoreErr();

    for (const name of CONSOLE_METHODS) {
      const original = originalConsole.get(name);

      if (original !== undefined) {
        console[name] = original as typeof console.log;
      }
    }
  }

  return { text: chunks.join(''), login };
}

/**
 * Asserts the three readings that say a capture is about something.
 *
 * Two of them are about the window and one is about the sentinel:
 * the bootstrap dependency and the login both wrote into it, and
 * the login was answered with a session, so the value counted
 * afterwards was the live credential rather than a string nothing
 * on the path had ever seen.
 *
 * @param capture - The window to check.
 */
function expectCaptureCoversBootstrapAndLogin(capture: Capture): void {
  // The sentinel was the real credential: only a password that the
  // bootstrap hashed and the login handler verified gets a token.
  expect(capture.login.status).toBe(200);
  expect(typeof (capture.login.body as { token?: unknown }).token)
    .toBe('string');

  // The bootstrap half of the window.
  expect(capture.text).toContain('"dep":"auth-bootstrap"');
  expect(capture.text).toContain('"msg":"dependency started"');

  // The login half of it.
  expect(capture.text).toContain('"url":"/auth/login"');
  expect(capture.text).toContain('"msg":"request completed"');
}

/**
 * Asserts the capture window left the two streams as it found them.
 *
 * Nothing else in the package reports this. A window that put back
 * a bound copy still passes every case here and every case
 * everywhere else, and the damage — pino choosing `process.stdout`
 * over a `SonicBoom` for every logger a later file constructs — is
 * a change to suites this one does not import.
 */
function expectStreamsRestored(): void {
  expect(isPristine(process.stdout)).toBe(true);
  expect(isPristine(process.stderr)).toBe(true);
}

// ---------------------------------------------------------------------------
// The claim: nothing on the path writes the credential out
// ---------------------------------------------------------------------------

describe('the bootstrap password in the process output', () => {
  it('appears nowhere across a boot and a login', async () => {
    const capture = await captureBootAndLogin(false);

    expectCaptureCoversBootstrapAndLogin(capture);
    expectStreamsRestored();

    expect(countSentinel(capture.text)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// The liveness leg: the capture reports a sentinel that IS written
// ---------------------------------------------------------------------------

describe('the capture over the same boot and login', () => {
  it('reports the sentinel once per channel when it is planted', async () => {
    const capture = await captureBootAndLogin(true);

    // The same three controls as the case above: the planted run is
    // that run plus four lines, so a divergence in what it booted
    // would make it evidence about a different service.
    expectCaptureCoversBootstrapAndLogin(capture);
    expectStreamsRestored();

    // Four, not "at least one". `createService`'s logger, the
    // router's logger, `applyMiddleware`'s `pino-http` instance and
    // the console are wired at four different moments, and a floor
    // would be satisfied by any one of them reaching the capture
    // alone.
    expect(countSentinel(capture.text)).toBe(4);
  });
});
