/**
 * A live credential is written through `POST /connectors`, rotated
 * through `PATCH /connectors/:id` and read back through
 * `GET /connectors`, and the sentinel it is spelled with is
 * counted in every answer and in everything the process wrote
 * while answering. Both counts are zero. The store, read directly
 * in the same window, holds both submitted values verbatim.
 *
 * WHAT THIS FILE PROVES THAT ITS SIBLINGS DO NOT is the process
 * output. `src/connectors/secrets.test.ts` proves the two walks in
 * isolation, `src/connectors/service.test.ts` proves that every
 * path answering a config runs through one, and
 * `src/connectors/routes.test.ts` proves each route's own answer
 * carries the mask — and all three are equally green against a
 * service that ALSO prints the credential beside every request it
 * records. A log is not a return value, and nothing in a response
 * assertion can see one. What is asserted here is what the process
 * itself wrote, which is where a credential goes to become
 * permanent: a container's log driver, a shipped index, a boot log
 * somebody pasted into a support ticket.
 *
 * THE SERVICE IS THE ASSEMBLED ONE, and that is the whole reason
 * this is a file rather than a case in `routes.test.ts`. That file
 * builds a bare `express()` carrying the router and an error
 * handler, which has no `pino-http` in it at all, so a request
 * record is not among the things it could read even in principle.
 * Here `createService` builds the shipped middleware stack — the
 * security headers, the rate limiter, `express.json`, `pino-http`
 * and the error handler — and the connectors router is mounted
 * behind `ctx.requireAuth` exactly as `src/index.ts` mounts a
 * router. The store is the only substitution.
 *
 * ONE ROUTER IS MOUNTED AND NOT THE WHOLE SURFACE. No other group
 * can hold a connector config, so a sibling router mounted here
 * would take no request and write no line. What the surface as a
 * whole does with a SUBMITTED value is
 * `tests/api/request-echo.test.ts`'s subject and is a different
 * claim: that one is about a value travelling IN, refused at the
 * boundary and never stored, and this one about a value that was
 * accepted, stored and is being answered back OUT.
 *
 * HOW THE CAPTURE WORKS is `tests/auth/secret-logging.test.ts`'s
 * mechanism, unchanged and for its reasons. pino picks its
 * destination once, at logger construction, and a stream that has
 * not been replaced gets a `SonicBoom` writing straight to file
 * descriptor 1 — which no later patch of `process.stdout.write`
 * can see. So the patch goes in FIRST and every logger on the path
 * is constructed under it: `createService`'s own, and the separate
 * instance `applyMiddleware` builds for `pino-http`. The five
 * console methods are patched alongside the two streams, because
 * vitest replaces the console with its own reporting channel and a
 * `console.log` under the runner therefore reaches no patch of
 * `process.stdout.write` at all. And the streams are put back by
 * restoring the own property DESCRIPTOR rather than by assigning a
 * bound copy, because `write` is INHERITED from `Socket.prototype`
 * here: a bound copy leaves the stream permanently tampered from
 * pino's point of view and quietly changes the transport for every
 * logger a later file in the worker constructs.
 *
 * NOTHING INSIDE THE WINDOW ASSERTS. An `expect` throwing between
 * the patch and the restore would leave all seven replaced for the
 * rest of the worker, and vitest's own account of the failure
 * would go into the capture array instead of to the terminal.
 *
 * THE IN-BAND CONTROLS, because a capture that read nothing and a
 * service that leaked nothing look identical, and so do a request
 * that carried a credential and one that never did. There are
 * four, and each closes a different way for the zeros to be
 * vacuous.
 *
 * THE VALUE TRAVERSED THE PATH. The create is asserted to have
 * answered `201` with an id the request did not carry, and the
 * store — read through {@link MemoryResearchStore} rather than
 * through the surface — is asserted to hold the submitted
 * credential VERBATIM after each write. So the zeros are about a
 * value that was really accepted, really stored and really read
 * back, rather than about one no code ever touched.
 *
 * THE WINDOW WAS OPEN ACROSS BOTH HALVES OF THE CLAIM. The capture
 * is asserted to carry the framework's `listening` line, which is
 * written before any request, and exactly one `request completed`
 * record per request made inside it.
 *
 * THE SERVICE READ THE BYTES. Each write body's own
 * `content-length` is asserted to appear in the capture:
 * `pino-http` records every request header, so that number is the
 * process's own account of having read a body of exactly that
 * size, where both zeros are equally satisfied by a request whose
 * body never left the client.
 *
 * THE NEEDLE STILL MATCHES. {@link countSentinel} is asserted to
 * answer a known NON-ZERO over the stored config in the same run
 * as the two zeros, so a counter that had stopped matching cannot
 * pass for a surface that leaks nothing.
 *
 * WHAT THOSE FOUR DO NOT COVER, said plainly rather than left for
 * a reader to discover: they say the needle still matches and the
 * window was open, and no CASE here says that a leak on each
 * channel the window patches would have been caught. Nothing
 * under `src/` writes to the console and the framework writes to
 * stderr on no healthy boot, so neither of those two patches has
 * a subject among the three requests. Both were shown live by a
 * mutation leg instead, below — and the planted-leak leg that
 * turns that measurement into a control this file CARRIES lands
 * in the next commit. Until it does, the two zeros rest on the
 * four controls above and on nothing else the file asserts.
 *
 * NINE MUTATIONS WERE RUN AGAINST THESE EIGHT CASES, and every
 * red set names what it reports.
 *
 * THREE LAND ON A MODULE. Having `maskConnectorConfig` answer its
 * argument unchanged reddens THREE, one per answer — which is
 * what says all three paths that answer a config run through it,
 * rather than one of them three times. Having the in-memory store
 * mask on the way IN reddens TWO, the create's own answer and the
 * store case, which is the direction a reader does not expect a
 * masking module to fail in. And having the store's patch answer
 * the updated row WITHOUT storing it reddens exactly ONE, the
 * store case.
 *
 * TWO MORE PAIR THAT LAST LEG WITH A FIXTURE EDIT, and they are
 * the whole argument for two distinguishable credentials.
 * Spelling both writes with ONE value reddens nothing on its own,
 * and re-running the patch-stores-nothing leg under it reddens
 * ZERO where it reddened one: with a single value in the column
 * the create's credential is still there, and a rotation that
 * never happened is indistinguishable from one that did.
 *
 * TWO ARE THE LEAK ITSELF, planted at the create handler. A
 * `console.log` of the submitted body and a
 * `process.stderr.write` of it each redden exactly ONE case, the
 * capture zero. So both of the patches with no subject among the
 * requests ARE live, and the capture really does see a channel a
 * deployment would leak through — measured under a leg, which is
 * a weaker artifact than the case the next commit adds.
 *
 * TWO ARE FIXTURE LEGS. A sink that records nothing reddens the
 * window's own control case and NOT the zero beside it, which is
 * precisely why that case is here: a capture that read nothing
 * answers every zero this file asserts. And restoring a stream
 * with a bound copy reddens the streams guard alone — the leg
 * has to be aimed at the DELETE branch of {@link redirectStream},
 * because `write` is INHERITED on both streams here, so
 * `getOwnPropertyDescriptor` answers undefined and the
 * `defineProperty` line is never reached in this file at all.
 *
 * NOTHING IS WRITTEN OUTSIDE THE THREE REQUESTS. The store is
 * constructed empty and the window makes exactly the create, the
 * patch and the list, so the dataset every case reads is the one
 * those three built and the cases are independent of the order
 * vitest ran them in.
 *
 * NO AUTH BLOCK IS CONFIGURED, and the mount still spells
 * `app.use(ctx.requireAuth, router)` exactly as `src/index.ts`
 * does. With no block `createService` resolves `requireAuth` to
 * `passthroughMiddleware`, so every request below reaches its
 * handler. Whether the guard is real and on the mount is
 * `tests/api/wiring.test.ts`'s subject.
 */
import type { ServiceHandle } from '../../lib/express/index.js';
import type { ConnectorRecord } from '../../src/connectors/store.js';
import type {
  MemoryResearchStore,
} from '../helpers/memory-research-store.js';
import type { Response } from 'supertest';

import process from 'node:process';

import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';

import { createService } from '../../lib/express/index.js';
import { buildConnectorsRouter } from '../../src/connectors/routes.js';
import {
  MASKED_SECRET,
  SECRET_CONFIG_KEYS,
} from '../../src/connectors/secrets.js';
import {
  createMemoryResearchStore,
} from '../helpers/memory-research-store.js';

// Read at boot time by `createService`: an ephemeral port and no
// `process.exit` on a failed dependency. Set here rather than in a
// hook so it is already true for the first service built.
process.env.NODE_ENV = 'test';

/**
 * The needle every count below is taken with.
 *
 * Long enough that no substring of a pino record could spell it by
 * accident — a timestamp, a port, an ETag, a rate-limit header and
 * a base64 ETag hash are all in the capture — and shaped out of
 * characters that survive a JSON string unescaped, so the value in
 * the request, the value in the column and the value a search runs
 * over are one string rather than three spellings of one.
 *
 * It is the value of a config member rather than a key, which is
 * where a credential actually sits. No schema on this group
 * refuses it: `connectorConfigSchema` is an open record whose
 * values are `unknown`, so this reaches the store as itself.
 */
const SENTINEL = 'sentinel.Nn7Qv2xLd4Rk.must-never-be-answered';

/**
 * The credential `POST /connectors` submits.
 *
 * Two distinguishable values rather than one submitted twice, so
 * the store reading after the patch says which write put it there.
 * With one value a patch that stored NOTHING would leave the
 * sentinel in the column from the create and read exactly like a
 * rotation that landed.
 */
const CREATED_SECRET = `${SENTINEL}.created`;

/** The credential `PATCH /connectors/:id` replaces it with. */
const ROTATED_SECRET = `${SENTINEL}.rotated`;

/**
 * The config key the credential is submitted under.
 *
 * A member of `SECRET_CONFIG_KEYS`, which one case asserts against
 * the runtime roster rather than against a copy of it — so a key
 * removed from that roster reddens this file instead of leaving it
 * asserting a mask that has quietly stopped being applied.
 */
const SECRET_KEY = 'apiKey';

/**
 * The config key beside it, which no roster names.
 *
 * The control on the other side of the mask: a module masking a
 * config WHOLESALE answers every zero this file asserts, and only
 * a member that comes back as itself says the mask replaced a
 * VALUE rather than standing in for a document. Asserted absent
 * from the runtime roster in the same case the member above is
 * asserted present in.
 */
const OPEN_KEY = 'endpoint';

/** What that member holds: an address, and no credential. */
const ENDPOINT = 'https://models.example.test/v1';

/** The `kind` the connector is created under. */
const CONNECTOR_KIND = 'llm';

/** The `name` it is created under. */
const CONNECTOR_NAME = 'secret-capture-model';

/**
 * The body `POST /connectors` is sent.
 *
 * Declared as one object rather than assembled at the call site,
 * because {@link CREATE_BODY_BYTES} is derived from it: the number
 * asserted to appear in the capture and the bytes actually sent
 * are then the same value, where two spellings would agree until
 * one of them was edited.
 */
const CREATE_BODY = {
  kind: CONNECTOR_KIND,
  name: CONNECTOR_NAME,
  config: { [OPEN_KEY]: ENDPOINT, [SECRET_KEY]: CREATED_SECRET },
};

/**
 * The body `PATCH /connectors/:id` is sent.
 *
 * `config` REPLACES the stored document whole, so this names the
 * address member again: a patch carrying the credential alone
 * would have cleared the endpoint, which is the surface's stated
 * rule and not the subject of this file.
 */
const PATCH_BODY = {
  config: { [OPEN_KEY]: ENDPOINT, [SECRET_KEY]: ROTATED_SECRET },
};

/**
 * How many bytes {@link CREATE_BODY} is on the wire.
 *
 * `pino-http` records every request header, `content-length`
 * included, so this number appearing in the capture is the
 * process's own account of having read a body of exactly that
 * size. Derived rather than transcribed; supertest serialises the
 * object with `JSON.stringify`, which preserves the order the
 * members are declared in above.
 */
const CREATE_BODY_BYTES = Buffer.byteLength(JSON.stringify(CREATE_BODY));

/** The same reading for {@link PATCH_BODY}. */
const PATCH_BODY_BYTES = Buffer.byteLength(JSON.stringify(PATCH_BODY));

/**
 * What both writes and the list are expected to answer as `config`.
 *
 * The rostered member replaced by the literal `./secrets.ts`
 * exports, and its neighbour untouched. The literal is imported
 * rather than spelled: what pins its TEXT is
 * `src/connectors/secrets.test.ts`, and a second copy here would
 * agree with the export however it were respelt.
 */
const MASKED_CONFIG = { [OPEN_KEY]: ENDPOINT, [SECRET_KEY]: MASKED_SECRET };

/** How many rows the window's list is expected to answer. */
const LISTED_ROWS = 1;

/** How many `request completed` records the window should hold. */
const REQUESTS_MADE = 3;

/**
 * The console methods that reach stdout or stderr in a deployment.
 *
 * All five are replaced for the life of the window. Under vitest
 * the console does NOT route through `process.stdout.write`, so
 * without this a `console.log` of a stored config would be
 * captured by nothing — see the header.
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
 * The undo is a descriptor restore rather than an assignment: see
 * the header, and `tests/auth/secret-logging.test.ts`, which owns
 * the measurement.
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
 * and the only reading that says the window closed cleanly.
 *
 * @param stream - The stream to check.
 * @returns True when the stream still carries its prototype's
 *   `write`.
 */
function isPristine(stream: StdioStream): boolean {
  const prototype = stream.constructor.prototype as StdioStream;

  return stream.write === prototype.write;
}

/**
 * Counts occurrences of {@link SENTINEL} in a string.
 *
 * A count rather than a `toContain`, because half the readings
 * here are exact non-zeros: each submitted body carries the
 * sentinel once and each stored config carries it once, and those
 * are what say a zero was answered by a counter that still
 * matches.
 *
 * @param text - Whatever is being searched.
 * @returns How many times the sentinel occurs in it.
 */
function countSentinel(text: string): number {
  return text.split(SENTINEL).length - 1;
}

/**
 * Counts occurrences of any string in another.
 *
 * Used for the capture's structural readings — the boot line and
 * one record per request — where the needle is not the sentinel.
 *
 * @param text - Whatever is being searched.
 * @param needle - The string to count.
 * @returns How many times it occurs.
 */
function countOccurrences(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

/** What the three requests answered, and what they left behind. */
interface SubmittedSet {
  /** The answer to `POST /connectors`. */
  readonly created: Response;
  /** The answer to `PATCH /connectors/:id`. */
  readonly patched: Response;
  /** The answer to `GET /connectors`. */
  readonly listed: Response;
  /**
   * The stored row as it stood after the create, read through the
   * port rather than through the surface.
   *
   * `null` would be a create that answered a row it never wrote,
   * which the store case reports rather than dereferences.
   */
  readonly afterCreate: ConnectorRecord | null;
  /** The same reading after the patch. */
  readonly afterPatch: ConnectorRecord | null;
}

/** One capture window: what was written, and what was answered. */
interface SecretWindow extends SubmittedSet {
  /** Everything written to stdout and stderr inside the window. */
  readonly text: string;
}

/**
 * Reads the id a create answered, or throws.
 *
 * A reader rather than a member access, and it is one of this
 * file's in-band controls rather than a convenience: `POST
 * /connectors` carries no id on its body, so a number arriving
 * here is the store having stamped one. The alternative to
 * throwing is a patch addressed to `/connectors/undefined`, whose
 * `422` would leave every zero below green over a rotation that
 * never happened.
 *
 * @param response - The answer to the create.
 * @returns The id the stored row was stamped with.
 * @throws Error When the answer carried no numeric id.
 */
function idOf(response: Response): number {
  const body = response.body as { data?: { id?: unknown } };
  const id = body.data?.id;

  if (typeof id !== 'number') {
    throw new Error('the create answered no id, so nothing can be patched');
  }

  return id;
}

/**
 * Boots the service, submits the three requests, and returns
 * everything the process wrote while doing so.
 *
 * The patches on the two streams and the five console methods go
 * in before anything else and come out in a `finally`, and nothing
 * inside asserts — see the header.
 *
 * The store is read directly, between the writes and inside the
 * window, because what is stored is half the claim: a masked
 * answer is equally green over a column holding the credential and
 * over one holding nothing at all.
 *
 * @returns The captured output, the three answers, and the stored
 *   row as it stood after each write.
 * @throws Error When the window closed without submitting.
 */
async function captureConnectorSecret(): Promise<SecretWindow> {
  const chunks: string[] = [];
  const originalConsole = new Map<ConsoleMethod, unknown>();
  const store: MemoryResearchStore = createMemoryResearchStore();

  const sink = ((chunk: unknown): boolean => {
    chunks.push(String(chunk));
    return true;
  }) as StdioStream['write'];

  function consoleSink(...args: unknown[]): void {
    chunks.push(`${args.map((arg) => String(arg)).join(' ')}\n`);
  }

  const restoreOut = redirectStream(process.stdout, sink);
  const restoreErr = redirectStream(process.stderr, sink);

  let submitted: SubmittedSet | undefined;

  for (const name of CONSOLE_METHODS) {
    originalConsole.set(name, console[name]);
    console[name] = consoleSink;
  }

  try {
    // Every logger on the path is constructed from here on, which
    // is what puts it inside the capture. See the header.
    const handle: ServiceHandle = await createService({
      serviceId: 'api-connector-secret-probe',
      register(app, ctx) {
        // The mount `src/index.ts` writes, with its guard. No
        // `auth` block is configured, so `ctx.requireAuth` is the
        // passthrough and every request below reaches a handler.
        app.use(ctx.requireAuth, buildConnectorsRouter({ store }));
      },
    });

    const created = await request(handle.app)
      .post('/connectors')
      .send(CREATE_BODY);
    const id = idOf(created);
    const afterCreate = await store.findConnectorById(id);
    const patched = await request(handle.app)
      .patch(`/connectors/${id}`)
      .send(PATCH_BODY);
    const afterPatch = await store.findConnectorById(id);
    const listed = await request(handle.app).get('/connectors');

    await handle.stop();

    submitted = { created, patched, listed, afterCreate, afterPatch };
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

  // Unreachable while the block above either assigns or throws.
  // It is here so the type is honest rather than asserted away,
  // and so a window that somehow closed empty says so instead of
  // handing every case an undefined to count zero occurrences in.
  if (submitted === undefined) {
    throw new Error('the window closed without submitting anything');
  }

  return { text: chunks.join(''), ...submitted };
}

/** The window, or undefined before `beforeAll` has run. */
let secretWindow: SecretWindow | undefined;

/**
 * The window, or a throw.
 *
 * A vacuity guard rather than a convenience: a case reading an
 * undefined window would fail on a property access, with a message
 * about this file rather than about the boot.
 *
 * @returns The window every case below reads.
 * @throws Error When the boot never ran or never finished.
 */
function openedWindow(): SecretWindow {
  if (secretWindow === undefined) {
    throw new Error('the window never opened, so no case can read it');
  }

  return secretWindow;
}

/**
 * The stored row after one of the two writes, or a throw.
 *
 * @param row - What the port answered for the created id.
 * @param when - Which write it was read after, for the message.
 * @returns That row.
 * @throws Error When the port answered no row at all.
 */
function storedRow(
  row: ConnectorRecord | null,
  when: string,
): ConnectorRecord {
  if (row === null) {
    throw new Error(`no connector was stored ${when}`);
  }

  return row;
}

beforeAll(async () => {
  secretWindow = await captureConnectorSecret();
});

// ---------------------------------------------------------------------------
// What was submitted, and the window it was submitted into
// ---------------------------------------------------------------------------

describe('the two bodies the window submitted', () => {
  it('carries the sentinel under a rostered key', () => {
    const createBytes = JSON.stringify(CREATE_BODY);
    const patchBytes = JSON.stringify(PATCH_BODY);

    // The control behind every zero below: a request that never
    // carried the needle answers zero for a reason that has
    // nothing to do with masking.
    expect(countSentinel(createBytes)).toBe(1);
    expect(countSentinel(patchBytes)).toBe(1);

    // Read off the RUNTIME roster rather than a copy of it, in
    // both directions. A key removed from `SECRET_CONFIG_KEYS`
    // reddens here rather than leaving this file asserting a mask
    // that has quietly stopped being applied, and a roster grown
    // to name `endpoint` would make the neighbour control below
    // pass for a module masking everything.
    const rostered: readonly string[] = SECRET_CONFIG_KEYS;

    expect(rostered).toContain(SECRET_KEY);
    expect(rostered).not.toContain(OPEN_KEY);

    // The two `content-length` readings are distinct needles, so
    // one of them appearing in the capture cannot stand in for
    // the other.
    expect(CREATE_BODY_BYTES).not.toBe(PATCH_BODY_BYTES);
  });
});

describe('the window the three requests were made in', () => {
  it('holds the boot line and one record per request', () => {
    const { text } = openedWindow();

    // Open across BOTH halves the claim names: the boot, whose
    // `listening` line the framework writes before any request,
    // and the requests themselves, each of which `pino-http`
    // records once. Without these the zero below is equally
    // satisfied by a capture that read nothing at all.
    expect(countOccurrences(text, '"msg":"listening"')).toBe(1);
    expect(
      countOccurrences(text, '"msg":"request completed"'),
    ).toBe(REQUESTS_MADE);

    // And the service READ the bytes. `pino-http` records every
    // request header, so each write body's own `content-length`
    // in the capture is the process's own account of having read
    // a body of exactly that size — where both zeros are equally
    // satisfied by a request whose body never left the client.
    expect(text).toContain(`"content-length":"${CREATE_BODY_BYTES}"`);
    expect(text).toContain(`"content-length":"${PATCH_BODY_BYTES}"`);
  });

  it('left both standard streams as it found them', () => {
    // Nothing else in the package reports this. A window that put
    // back a bound copy passes every case here and everywhere
    // else, and the damage — pino choosing `process.stdout` over
    // a `SonicBoom` for every logger a later file constructs — is
    // a change to suites this one does not import.
    expect(isPristine(process.stdout)).toBe(true);
    expect(isPristine(process.stderr)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// What each answer carries
// ---------------------------------------------------------------------------

describe('the answer to POST /connectors', () => {
  it('is a 201 whose config carries the mask', () => {
    const { created } = openedWindow();

    // The status is an in-band control as much as a claim: a
    // create that was REFUSED answers no config at all, and a
    // zero over its body would then be about a `422`.
    expect(created.status).toBe(201);
    expect(created.type).toBe('application/json');
    expect(created.body.success).toBe(true);

    // The whole row, so a create reaching a member nobody
    // submitted is a red case rather than an answer three field
    // reads agreed with. The config is the point of the compare:
    // the operator's own key came back as it was sent and the
    // rostered one did not, which is the mask replacing a VALUE
    // rather than standing in for a document.
    expect(created.body.data).toStrictEqual({
      id: idOf(created),
      kind: CONNECTOR_KIND,
      name: CONNECTOR_NAME,
      config: MASKED_CONFIG,
    });

    // Over the RAW payload rather than the parsed body, so a leak
    // anywhere in what was written back counts and not only one
    // arriving as a JSON field.
    expect(countSentinel(created.text)).toBe(0);
  });
});

describe('the answer to PATCH /connectors/:id', () => {
  it('is a 200 whose rotation carries the mask', () => {
    const { created, patched } = openedWindow();

    expect(patched.status).toBe(200);
    expect(patched.type).toBe('application/json');
    expect(patched.body.success).toBe(true);

    // The same row and the same masked config: a rotation is
    // invisible on the wire by design, which is why the store
    // reading below is the only place the two values are told
    // apart.
    expect(patched.body.data).toStrictEqual({
      id: idOf(created),
      kind: CONNECTOR_KIND,
      name: CONNECTOR_NAME,
      config: MASKED_CONFIG,
    });

    expect(countSentinel(patched.text)).toBe(0);
  });
});

describe('the answer to GET /connectors', () => {
  it('lists the stored row with its config masked', () => {
    const { created, listed } = openedWindow();
    const meta = listed.body.meta as { total?: unknown };

    expect(listed.status).toBe(200);
    expect(listed.type).toBe('application/json');
    expect(listed.body.success).toBe(true);

    // The read path rather than a write's own answer, which is
    // the one a caller returns to and the one a client caches.
    expect(listed.body.data).toStrictEqual([{
      id: idOf(created),
      kind: CONNECTOR_KIND,
      name: CONNECTOR_NAME,
      config: MASKED_CONFIG,
    }]);

    // The window is the whole collection, so the row above is the
    // page rather than the head of one — a masking pass reaching
    // only the first row of a page would be reported by
    // `src/connectors/routes.test.ts`, whose fixture holds three.
    expect(meta.total).toBe(LISTED_ROWS);

    expect(countSentinel(listed.text)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// What the process wrote while answering
// ---------------------------------------------------------------------------

describe('the capture over the three requests', () => {
  it('holds the sentinel nowhere at all', () => {
    const { text, afterPatch } = openedWindow();
    const stored = JSON.stringify(storedRow(afterPatch, 'after the patch'));

    // The live control on the search, in the same run as the zero
    // it qualifies: the same counter over a string this window
    // produced returns a known non-zero, so a needle that had
    // stopped matching cannot pass for a service that leaks
    // nothing. What it does NOT say is that a leak on each
    // patched channel would have been captured — see the header,
    // and the planted-leak leg that lands next.
    expect(countSentinel(stored)).toBe(1);

    // The claim. It covers the boot lines, every `request
    // completed` record and every request header `pino-http`
    // wrote out, across a create that stored a credential, a
    // patch that replaced it and a list that read it back.
    expect(countSentinel(text)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// What the store holds behind the mask
// ---------------------------------------------------------------------------

describe('the column the three answers masked', () => {
  it('holds both submitted secrets verbatim', () => {
    const { afterCreate, afterPatch } = openedWindow();
    const created = storedRow(afterCreate, 'after the create');
    const rotated = storedRow(afterPatch, 'after the patch');

    // What makes every zero above a claim about containment
    // rather than about an empty column: the credential really
    // was accepted, really was stored and really was read back
    // out by the list. `src/db/schema/sources.ts` says the column
    // is protected by the database's access control and by
    // nothing else, and this is that sentence measured.
    expect(created.config).toStrictEqual({
      [OPEN_KEY]: ENDPOINT,
      [SECRET_KEY]: CREATED_SECRET,
    });

    // Two distinguishable values, so this says the PATCH stored
    // what it was handed. With one value submitted twice, a patch
    // that wrote nothing would leave the create's credential in
    // the column and read exactly like a rotation that landed.
    expect(rotated.config).toStrictEqual({
      [OPEN_KEY]: ENDPOINT,
      [SECRET_KEY]: ROTATED_SECRET,
    });

    // And the mask never reached the column, which is the other
    // direction of the same rule: a module masking on the way IN
    // would answer every zero above over a deployment whose
    // connector can no longer authenticate against anything.
    expect(created.config).not.toStrictEqual(MASKED_CONFIG);
    expect(rotated.config).not.toStrictEqual(MASKED_CONFIG);
  });
});
