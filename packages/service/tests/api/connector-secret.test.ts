/**
 * A live credential is written through `POST /connectors`, rotated
 * through `PATCH /connectors/:id`, read back through
 * `GET /connectors`, and submitted once more to a create the
 * deployment refuses. The sentinel it is spelled with is counted in
 * every answer and in everything the process wrote while answering,
 * and every count is zero. The store, read directly in the same
 * window, holds both accepted values verbatim.
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
 * THE FOURTH REQUEST IS A REFUSAL, and it reaches a channel the
 * other three cannot. `errorHandler` in `lib/errors/handler.ts`
 * answers an `AppError` 's `toJSON()` and logs its `code`, `cause`
 * and `message`, so a refusal is the only answer on this group free
 * to carry a `details` list and the only log line built out of
 * something a handler composed rather than out of the request
 * record. The repeat create proposes the kind and name pair the
 * first one landed, `connectors_kind_name_unique` refuses it, and
 * the credential it submitted is in the body that reached the
 * handler: the `409` is asserted whole, its key set carries no
 * `details` at all, and the sentinel is counted in what it answered
 * and in what the process wrote for it.
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
 * THE SERVICE READ THE BYTES. Each submitted body's own
 * `content-length` is asserted to appear in the capture:
 * `pino-http` records every request header, so that number is the
 * process's own account of having read a body of exactly that size,
 * where both zeros are equally satisfied by a request whose body
 * never left the client. The three readings are asserted distinct
 * from each other, so one cannot stand in for another.
 *
 * THE NEEDLE STILL MATCHES. {@link countSentinel} is asserted to
 * answer a known NON-ZERO over the stored config in the same run
 * as the two zeros, so a counter that had stopped matching cannot
 * pass for a surface that leaks nothing.
 *
 * THE SECOND WINDOW IS A PLANTED LEAK, AND IT IS WHAT MAKES THE
 * ZEROS READINGS. A pass here is a zero, and a zero is equally what
 * a counter that stopped matching, a capture that stopped reading
 * and a surface that leaks nothing all answer. So a second service
 * is booted, over its own store, with one route added beside the
 * same mount: it reads the STORED config back out of the store
 * through the port the list route reads it through, writes it to
 * the console and to stderr, and answers it unmasked in the member
 * the three real answers put the literal in. {@link PLANTED_LEAKS}
 * declares where each of the three writes is expected to land, and
 * the same {@link countSentinel} every zero above is taken with
 * reports each of them. Both searches this file rests on — one over
 * a response body, one over the capture — are shown finding the
 * sentinel in the same run that reports them finding none.
 *
 * TWO OF THE THREE PLANTED ROWS ARE THE ONLY LIVE CONTROL THEIR
 * PATCH HAS. Nothing under `src/` writes to the console, and the
 * framework writes to stderr on no healthy boot, so neither of
 * those patches has a subject among the four requests. They were
 * shown live by a mutation leg before this window existed, which is
 * an artifact nobody re-runs; now a case carries each.
 *
 * WHAT THE PLANTED WINDOW DOES NOT DO is assert a containment claim
 * of its own. It is not a second surface held to the rule — it is
 * the antecedent the first window's zeros are read against, which
 * is why it boots separately rather than mounting its route beside
 * the four requests. A leak reachable from the real surface would
 * otherwise be measured over a service carrying one.
 *
 * SIXTEEN MUTATIONS WERE RUN AGAINST THESE SIXTEEN CASES, and every
 * red set names what it reports.
 *
 * THREE LAND ON THE MODULES THAT MASK AND STORE. Having
 * `maskConnectorConfig` answer its argument unchanged reddens FOUR
 * — one per answer that carries a config, plus the planted window's
 * head-to-head — which is what says all three paths answering a
 * config run through it rather than one of them three times. Having
 * the in-memory store keep the mask literal in place of the config
 * it was handed reddens FOUR: the create's own answer, the store
 * case, and both of the planted window's counts, which is the
 * direction a reader does not expect a masking module to fail in.
 * That leg has to replace the WHOLE config — masking only the value
 * under the rostered key reddens ONE, because the service masks a
 * rostered key again on the way out and every answer is identical
 * either way. And having the store's patch answer the updated row
 * WITHOUT storing it reddens TWO, the store case and the refusal's
 * read-back.
 *
 * TWO ARE THE REGISTER'S OWN CLAIM ABOUT A REFUSAL, and they land
 * on different channels by design. The create's catch quoting the
 * submitted config in a `details` entry reddens exactly ONE, the
 * `409` case, and NOT the capture beside it. Quoting the same value
 * in the MESSAGE reddens THREE — the `409` case, the capture zero
 * and the planted head-to-head — because `errorHandler` logs a
 * message and does not log `details`. So the two zeros this file
 * asserts are two claims rather than one written twice, measured
 * rather than argued.
 *
 * THREE ARE FIXTURE LEGS, and two of them pair with a leg above.
 * Spelling both accepted writes with ONE value reddens the
 * three-values guard alone, and re-running the patch-stores-nothing
 * leg under it takes that leg's own two reds to ZERO: with a single
 * value in the column the create's credential is still there, and a
 * rotation that never happened is indistinguishable from one that
 * did. Giving the fourth request a free name rather than the taken
 * pair reddens the `409` case alone, which is what says that
 * request is really refused rather than quietly landing a second
 * row.
 *
 * TWO PLANT A LEAK ON THE REAL SURFACE, at the create handler. A
 * `console.log` of the submitted body and a `process.stderr.write`
 * of it each redden TWO: the capture zero, and the planted window's
 * head-to-head against it. The zero and the non-zero it is read
 * against move together, which is what a head-to-head is for.
 *
 * FOUR AIM AT THE PLANTED WINDOW ITSELF, because a control that had
 * stopped controlling reads exactly like a surface that leaks
 * nothing. Not mounting the planted route reddens FIVE of its six
 * cases; the sixth reads only the table and is meant to. Answering
 * the config MASKED there reddens ONE, the answer count — the
 * per-channel row for that write counts its MARKER, which sits
 * beside the config rather than inside it, so the two are separate
 * claims. Dropping its console line reddens TWO and dropping its
 * stderr write reddens TWO, each the row named for it plus the
 * capture total.
 *
 * TWO ARE THE CAPTURE MECHANISM. A sink that records nothing
 * reddens THREE — the window's own boot-line control, the planted
 * capture total and the planted STDERR row — and leaves the planted
 * CONSOLE row GREEN, because the five console methods are replaced
 * by a sink of their own that pushes straight to the array and
 * never goes through a stream write at all. And restoring a stream
 * with a bound copy reddens the streams guard alone; that leg has
 * to be aimed at the DELETE branch of {@link redirectStream},
 * because `write` is INHERITED on both streams here, so
 * `getOwnPropertyDescriptor` answers undefined and the
 * `defineProperty` line is never reached in this file at all.
 *
 * NOTHING IS WRITTEN OUTSIDE THE FOUR REQUESTS. The store is
 * constructed empty and the window makes exactly the create, the
 * patch, the list and the refused create, so the dataset every case
 * reads is the one those four built and the cases are independent
 * of the order vitest ran them in. The planted window holds a store
 * of its own, with one row planted through the port before it
 * boots.
 *
 * NO AUTH BLOCK IS CONFIGURED IN EITHER BOOT, and both mounts still
 * spell `app.use(ctx.requireAuth, router)` exactly as
 * `src/index.ts` does. With no block `createService` resolves
 * `requireAuth` to `passthroughMiddleware`, so every request below
 * reaches its handler. Whether the guard is real and on the mount
 * is `tests/api/wiring.test.ts` 's subject.
 */
import type { ServiceHandle } from '../../lib/express/index.js';
import type { ConnectorRecord } from '../../src/connectors/store.js';
import type {
  MemoryResearchStore,
} from '../helpers/memory-research-store.js';
import type { Application } from 'express';
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
 * The credential a create the deployment refuses submits.
 *
 * A third distinguishable value, so the zeros over that refusal
 * are about a string that reached the handler in THAT request
 * rather than about either value already sitting in the column. It
 * is never stored: the pair it proposes is taken, and the store
 * refuses the insert before any row is formed.
 */
const REFUSED_SECRET = `${SENTINEL}.refused`;

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
 * The body a SECOND `POST /connectors` is sent.
 *
 * The kind and name pair the create already landed, so
 * `connectors_kind_name_unique` refuses it and the surface answers
 * a `409` — the one answer on this group carrying a message a
 * handler composed rather than a row a store read.
 *
 * Its config names the rostered key ALONE, one member where the
 * two above name two, so {@link DUPLICATE_BODY_BYTES} differs from
 * both of their readings and no `content-length` in the capture
 * can stand in for another.
 */
const DUPLICATE_BODY = {
  kind: CONNECTOR_KIND,
  name: CONNECTOR_NAME,
  config: { [SECRET_KEY]: REFUSED_SECRET },
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

/** The same reading for {@link DUPLICATE_BODY}. */
const DUPLICATE_BODY_BYTES
  = Buffer.byteLength(JSON.stringify(DUPLICATE_BODY));

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
const REQUESTS_MADE = 4;

/**
 * The whole body a taken kind and name pair answers with.
 *
 * Asserted WHOLE rather than by status, because what this file is
 * about is which members a refusal is free to carry. There is no
 * `details` list on it at all, and the message is a constant of
 * `src/connectors/service.ts` rather than anything the store, the
 * driver or the request said. `src/connectors/routes.test.ts` owns
 * the wording; what is read here is that nothing submitted got
 * into it.
 */
const PAIR_TAKEN_BODY = {
  code: 'CONFLICT',
  message: 'This deployment already carries a connector of that kind '
    + 'by that name',
};

/**
 * The path the planted-leak window mounts its route at.
 *
 * Outside every shape the connectors router registers, so the
 * request below falls through that mount to reach the planted
 * route rather than displacing a real handler.
 */
const PLANTED_PATH = '/planted-secret-leak';

/** One deliberate leak the planted route commits. */
interface PlantedLeak {
  /** What the case reading it is named for. */
  readonly channel: string;
  /**
   * The token this leak prefixes what it leaks with, so a text
   * holding several of them can be read one leak at a time.
   */
  readonly marker: string;
  /** How many times it puts the sentinel in the CAPTURE. */
  readonly captured: number;
  /** How many times it puts the sentinel in the RESPONSE BODY. */
  readonly answered: number;
}

/**
 * Every channel the planted route leaks the stored config through,
 * and where each one lands.
 *
 * The reason this file's zeros are readings rather than assertions
 * about nothing. Each row is a leak the real surface does not
 * make, committed through the mechanism a deployment would leak
 * through, and measured with the same {@link countSentinel} every
 * zero above is measured with.
 *
 * The three are not interchangeable, and two of them are the only
 * live control their patch has. CONSOLE is one: nothing under
 * `src/` writes to the console, so without this row the five
 * console patches have no subject in this file at all. STDERR is
 * the other: the framework writes to that stream on no healthy
 * boot. ANSWER is the read path itself — the stored config served
 * as stored, which is exactly what the three real answers mask —
 * and it is the row that reaches the RESPONSE and not the capture,
 * so the two searches this file rests on are each shown finding
 * the needle.
 */
const PLANTED_LEAKS = [
  {
    channel: 'a console line',
    marker: 'planted-console-leak',
    captured: 1,
    answered: 0,
  },
  {
    channel: 'a stderr write',
    marker: 'planted-stderr-leak',
    captured: 1,
    answered: 0,
  },
  {
    channel: 'the config it answers',
    marker: 'planted-answer-leak',
    captured: 0,
    answered: 1,
  },
] as const satisfies readonly PlantedLeak[];

/**
 * What {@link countSentinel} must answer over the planted capture.
 */
const PLANTED_CAPTURED_TOTAL = PLANTED_LEAKS
  .reduce((total, leak) => total + leak.captured, 0);

/** What it must answer over the planted response body. */
const PLANTED_ANSWERED_TOTAL = PLANTED_LEAKS
  .reduce((total, leak) => total + leak.answered, 0);

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
  /** The answer to the create the deployment refuses. */
  readonly refused: Response;
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

/** What the planted window answered, and what it planted. */
interface PlantedSet {
  /** The answer to the one request it makes. */
  readonly leaked: Response;
  /** The row it planted through the port before booting. */
  readonly stored: ConnectorRecord;
}

/** The planted window, with everything the process wrote in it. */
interface PlantedWindow extends PlantedSet {
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
 * Runs one window: patches the seven channels, runs what it is
 * handed, and returns everything the process wrote while it ran.
 *
 * The patches on the two streams and the five console methods go
 * in before anything else and come out in a `finally`, and nothing
 * inside asserts — see the header.
 *
 * Generic over what the run produces rather than hard-wired to one
 * shape, because this file opens TWO windows and the second is the
 * control on the first: the leaking window has to be captured by
 * the identical mechanism, or the head-to-head between its
 * non-zero and the zero above it compares two different readers.
 *
 * @param run - What to do inside the window. Every logger on the
 *   path is constructed by it, which is what puts it inside the
 *   capture.
 * @returns The captured output and whatever the run produced.
 * @throws Error When the window closed without producing anything.
 */
async function captureWindow<T>(
  run: () => Promise<T>,
): Promise<{ text: string; result: T }> {
  const chunks: string[] = [];
  const originalConsole = new Map<ConsoleMethod, unknown>();

  const sink = ((chunk: unknown): boolean => {
    chunks.push(String(chunk));
    return true;
  }) as StdioStream['write'];

  function consoleSink(...args: unknown[]): void {
    chunks.push(`${args.map((arg) => String(arg)).join(' ')}\n`);
  }

  const restoreOut = redirectStream(process.stdout, sink);
  const restoreErr = redirectStream(process.stderr, sink);

  let produced: { value: T } | undefined;

  for (const name of CONSOLE_METHODS) {
    originalConsole.set(name, console[name]);
    console[name] = consoleSink;
  }

  try {
    produced = { value: await run() };
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
  if (produced === undefined) {
    throw new Error('the window closed without submitting anything');
  }

  return { text: chunks.join(''), result: produced.value };
}

/**
 * Boots the service and submits the four requests.
 *
 * The store is read directly, between the writes, because what is
 * stored is half the claim: a masked answer is equally green over
 * a column holding the credential and over one holding nothing at
 * all.
 *
 * @returns The four answers, and the stored row as it stood after
 *   each write.
 */
async function submitConnectorSecret(): Promise<SubmittedSet> {
  const store: MemoryResearchStore = createMemoryResearchStore();

  const handle: ServiceHandle = await createService({
    serviceId: 'api-connector-secret-probe',
    register(app, ctx) {
      // The mount `src/index.ts` writes, with its guard. No `auth`
      // block is configured, so `ctx.requireAuth` is the
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
  // Last of the four, so the three readings above are taken over a
  // store the refusal has not been offered a chance to disturb.
  const refused = await request(handle.app)
    .post('/connectors')
    .send(DUPLICATE_BODY);

  await handle.stop();

  return { created, patched, listed, refused, afterCreate, afterPatch };
}

/**
 * Mounts the route that deliberately leaks, on the app the planted
 * window was built over.
 *
 * Everything the connectors surface is forbidden to do, done on
 * purpose and in one place. The config is read back out of the
 * store through the same port the list route reads it through, and
 * then written out three times: to the console, to stderr, and into
 * the body it answers — unmasked, as stored, in the `config` member
 * the three real answers put the literal in.
 *
 * Mounted AFTER the connectors router, exactly where a second
 * wave-2 router would go. No route of that router matches
 * {@link PLANTED_PATH}, so the request falls through the `/` mount
 * to reach it.
 *
 * @param app - The application the window's `register` was handed.
 * @param store - The store holding the planted row.
 * @param id - The planted row's id.
 */
function plantLeakingRoute(
  app: Application,
  store: MemoryResearchStore,
  id: number,
): void {
  app.get(PLANTED_PATH, async (_req, res) => {
    const stored = await store.findConnectorById(id);

    if (stored === null) {
      throw new Error('the planted row is gone, so nothing can leak');
    }

    const config = JSON.stringify(stored.config);

    // Reaches the capture only through the five console patches:
    // under vitest the console does NOT route through
    // `process.stdout.write`, so this is the one live control
    // those five have.
    console.log(`${PLANTED_LEAKS[0].marker} ${config}`);

    // The second stream, which nothing on a healthy boot writes
    // to — so it is the one live control the stderr redirect has.
    process.stderr.write(`${PLANTED_LEAKS[1].marker} ${config}\n`);

    // And the answer, which is where the third row lands and the
    // capture does not: a response body is not a log line, which
    // is the whole reason the two zeros are separate claims.
    res.json({ marker: PLANTED_LEAKS[2].marker, config: stored.config });
  });
}

/**
 * Plants one connector through the port, boots a service that
 * leaks it, and asks for it.
 *
 * Planted through the PORT rather than through `POST /connectors`,
 * so this window makes exactly ONE request and the capture it
 * produces holds no record of a real write at all — every
 * occurrence of the sentinel in it is one the planted route wrote.
 *
 * @returns The one answer, and the row that was planted.
 */
async function submitPlantedLeak(): Promise<PlantedSet> {
  const store: MemoryResearchStore = createMemoryResearchStore();
  const stored = await store.insertConnector({
    kind: CONNECTOR_KIND,
    name: CONNECTOR_NAME,
    config: { [OPEN_KEY]: ENDPOINT, [SECRET_KEY]: CREATED_SECRET },
  });

  const handle: ServiceHandle = await createService({
    serviceId: 'api-connector-secret-planted',
    register(app, ctx) {
      app.use(ctx.requireAuth, buildConnectorsRouter({ store }));
      plantLeakingRoute(app, store, stored.id);
    },
  });

  const leaked = await request(handle.app).get(PLANTED_PATH);

  await handle.stop();

  return { leaked, stored };
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
 * The planted window, or undefined before `beforeAll` has run.
 *
 * Assembled by the same {@link captureWindow} over the same mount,
 * with one route added that answers and logs what it reads. It
 * asserts no zero — it is what says the zeros above were read by a
 * counter that still matches and through a capture that was still
 * open.
 */
let plantedWindow: PlantedWindow | undefined;

/**
 * The planted window, or a throw.
 *
 * @returns The window the planted cases read.
 * @throws Error When the boot never ran or never finished.
 */
function openedPlant(): PlantedWindow {
  if (plantedWindow === undefined) {
    throw new Error('the planted window never opened, so no case reads it');
  }

  return plantedWindow;
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
  const submitted = await captureWindow(submitConnectorSecret);

  secretWindow = { text: submitted.text, ...submitted.result };

  // Its own boot rather than a route added to the window above, so
  // no zero asserted here is measured over a service carrying a
  // leak. The only difference between the two is the route.
  const planted = await captureWindow(submitPlantedLeak);

  plantedWindow = { text: planted.text, ...planted.result };
});

// ---------------------------------------------------------------------------
// What was submitted, and the window it was submitted into
// ---------------------------------------------------------------------------

describe('the three bodies the window submitted', () => {
  it('carries the sentinel under a rostered key', () => {
    const createBytes = JSON.stringify(CREATE_BODY);
    const patchBytes = JSON.stringify(PATCH_BODY);
    const duplicateBytes = JSON.stringify(DUPLICATE_BODY);

    // The control behind every zero below: a request that never
    // carried the needle answers zero for a reason that has
    // nothing to do with masking. The third is the refusal's, and
    // it is what makes the 409 case a containment reading rather
    // than a status assertion.
    expect(countSentinel(createBytes)).toBe(1);
    expect(countSentinel(patchBytes)).toBe(1);
    expect(countSentinel(duplicateBytes)).toBe(1);

    // Three distinguishable values rather than one submitted three
    // times, so a column read after a write says WHICH write put
    // what is in it there.
    expect(new Set([CREATED_SECRET, ROTATED_SECRET, REFUSED_SECRET]).size)
      .toBe(3);

    // Read off the RUNTIME roster rather than a copy of it, in
    // both directions. A key removed from `SECRET_CONFIG_KEYS`
    // reddens here rather than leaving this file asserting a mask
    // that has quietly stopped being applied, and a roster grown
    // to name `endpoint` would make the neighbour control below
    // pass for a module masking everything.
    const rostered: readonly string[] = SECRET_CONFIG_KEYS;

    expect(rostered).toContain(SECRET_KEY);
    expect(rostered).not.toContain(OPEN_KEY);

    // The three `content-length` readings are distinct needles, so
    // one of them appearing in the capture cannot stand in for
    // another.
    const sizes = [
      CREATE_BODY_BYTES,
      PATCH_BODY_BYTES,
      DUPLICATE_BODY_BYTES,
    ];

    expect(new Set(sizes).size).toBe(sizes.length);
  });
});

describe('the window the four requests were made in', () => {
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
    expect(text).toContain(`"content-length":"${DUPLICATE_BODY_BYTES}"`);
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

describe('the answer to a create the deployment refuses', () => {
  it('is a 409 naming no field and no submitted value', () => {
    const { refused } = openedWindow();

    expect(refused.status).toBe(409);
    expect(refused.type).toBe('application/json');

    // The WHOLE body, which on a refusal is the containment claim
    // rather than a wording one: `details` is where a refusal is
    // free to quote the request back, and this one has no such
    // member at all. `errorHandler` answers an `AppError`'s
    // `toJSON()`, so what is asserted here is what a caller reads.
    expect(refused.body).toStrictEqual(PAIR_TAKEN_BODY);
    expect(Object.keys(refused.body).sort()).toStrictEqual([
      'code',
      'message',
    ]);

    // Over the RAW payload, so a leak anywhere in the envelope
    // counts and not only one arriving as a declared member.
    expect(countSentinel(refused.text)).toBe(0);
  });

  it('leaves the rotated credential where the patch put it', () => {
    const { afterPatch } = openedWindow();
    const rotated = storedRow(afterPatch, 'after the patch');

    // The control that says the refusal was reached at all rather
    // than answered by a boundary that never met the store: the
    // key it collides with is on the row this window created, so a
    // 409 with the column still holding the ROTATED value is a
    // store that refused after reading and before writing.
    expect(rotated.config).toStrictEqual({
      [OPEN_KEY]: ENDPOINT,
      [SECRET_KEY]: ROTATED_SECRET,
    });
  });
});

// ---------------------------------------------------------------------------
// What the process wrote while answering
// ---------------------------------------------------------------------------

describe('the capture over the four requests', () => {
  it('holds the sentinel nowhere at all', () => {
    const { text, afterPatch } = openedWindow();
    const stored = JSON.stringify(storedRow(afterPatch, 'after the patch'));

    // The live control on the search, in the same run as the zero
    // it qualifies: the same counter over a string this window
    // produced returns a known non-zero, so a needle that had
    // stopped matching cannot pass for a service that leaks
    // nothing. What it does NOT say is that a leak on each
    // patched channel would have been captured, which is the
    // planted window's job below.
    expect(countSentinel(stored)).toBe(1);

    // The claim. It covers the boot lines, every `request
    // completed` record and every request header `pino-http`
    // wrote out, across a create that stored a credential, a
    // patch that replaced it, a list that read it back and a
    // create the store refused.
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

// ---------------------------------------------------------------------------
// The planted leak the zeros above are read against
// ---------------------------------------------------------------------------

describe('the planted-leak window', () => {
  it('answers the stored config where every answer above masks it', () => {
    const { leaked, stored } = openedPlant();

    // The control on the plant itself: the row this window reads
    // really does carry the needle, so a marker written ahead of
    // an empty config could not pass for a leak.
    expect(countSentinel(JSON.stringify(stored.config))).toBe(1);

    expect(leaked.status).toBe(200);
    expect(leaked.type).toBe('application/json');

    // The `config` member the three real answers put the literal
    // in, served as stored. The head-to-head is what makes it a
    // control: the same member, the same reader, one masked and
    // one not.
    expect(leaked.body.config).toStrictEqual({
      [OPEN_KEY]: ENDPOINT,
      [SECRET_KEY]: CREATED_SECRET,
    });

    // The claim: `countSentinel` over a response body finds what
    // is there. Every zero this file asserts over an answer is
    // this same call, so without this the whole reading is a
    // zero-hit scan whose needle is never shown matching.
    expect(PLANTED_ANSWERED_TOTAL).toBeGreaterThan(0);
    expect(countSentinel(leaked.text)).toBe(PLANTED_ANSWERED_TOTAL);
    expect(countSentinel(openedWindow().created.text)).toBe(0);
  });

  it('writes the stored config where the window above wrote none', () => {
    const planted = openedPlant();

    // The window was open across the boot and the request, exactly
    // as the window above asserts of itself.
    expect(planted.text).toContain('"msg":"listening"');
    expect(planted.text).toContain('"msg":"request completed"');

    // The claim, and its head-to-head: the same counter over the
    // same kind of capture, produced by the same
    // {@link captureWindow} over the same mount, answers a known
    // non-zero here and zero there. A patch that had stopped
    // capturing, or a counter that had stopped matching, would
    // answer zero in both.
    expect(PLANTED_CAPTURED_TOTAL).toBeGreaterThan(0);
    expect(countSentinel(planted.text)).toBe(PLANTED_CAPTURED_TOTAL);
    expect(countSentinel(openedWindow().text)).toBe(0);
  });

  for (const leak of PLANTED_LEAKS) {
    it(`${leak.channel} lands where the table says`, () => {
      const { text, leaked } = openedPlant();

      // Per channel rather than in total, because the three are
      // the three claims this window makes about where a stored
      // credential can go, and a total is satisfied by any two.
      const answered = countOccurrences(leaked.text, leak.marker);

      expect(countOccurrences(text, leak.marker)).toBe(leak.captured);
      expect(answered).toBe(leak.answered);
    });
  }

  it('plants a distinct channel in each row it declares', () => {
    const markers = PLANTED_LEAKS.map((leak) => leak.marker);

    // A row copied and left unedited would read as a second live
    // control and be neither.
    expect(new Set(markers).size).toBe(markers.length);

    for (const leak of PLANTED_LEAKS) {
      expect(leak.captured + leak.answered).toBeGreaterThan(0);
    }

    // The two-zeros-are-different-channels claim, as a property of
    // the table rather than as prose: one row reaches the capture
    // and not the body, and one reaches the body and not the
    // capture. Nothing logs a response body, which is the whole of
    // why the two searches this file runs are two claims.
    const captureOnly = PLANTED_LEAKS
      .filter((leak) => leak.captured > 0 && leak.answered === 0);
    const answerOnly = PLANTED_LEAKS
      .filter((leak) => leak.answered > 0 && leak.captured === 0);

    expect(captureOnly.length).toBeGreaterThan(0);
    expect(answerOnly.length).toBeGreaterThan(0);
  });
});
