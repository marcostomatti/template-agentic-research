/**
 * One sentinel string is submitted through every wave-1 WRITE route
 * — as a field value, as an unrecognized key, as a key inside an
 * open record and as a query parameter — and counted in what came
 * back and in everything the process wrote while answering. One
 * more request, to a route planted to echo, is what says the
 * counting works.
 *
 * WHAT THIS FILE PROVES THAT ITS SIBLINGS DO NOT is containment
 * across the WHOLE surface in one reading. Each resource group's
 * `*-routes.test.ts` carries a containment row of its own, but each
 * is scoped to its own router and each builds a bare `express()`
 * app with no `pino-http` in it, so none of them can see a log line
 * at all. The rule is that no request body content reaches a
 * response body or a log line through a validation detail, and
 * `docs/architecture/01-invariants.md` registers it, with this
 * file named as the artifact that fails when it stops holding.
 *
 * THE FOUR CHANNELS, and where each has a subject. A FIELD VALUE
 * goes at a declared member: on seven of the nine body-bearing
 * routes the schema refuses it outright (a slug that is not
 * slug-shaped, a string where a number or an enum is declared) and
 * the refusal is a detail naming the field; on the two personas
 * routes no member refuses a string at all, so the value is
 * ACCEPTED by the schema and the request dies at its address
 * instead — which is the shape where the sentinel travelled
 * FURTHEST into the handler. An UNRECOGNIZED KEY is the sentinel
 * spelled as an undeclared member of a `.strict()` object, which is
 * the one zod issue whose own message quotes what was submitted.
 * An OPEN-RECORD KEY is the sentinel as an operator-chosen key
 * below one of the three declared open paths, where the leak would
 * be the PATH rather than a message. A QUERY PARAMETER is the
 * sentinel as both the key and the value of a query string, on
 * every write route including the four `DELETE`s, which carry no
 * body and would otherwise have no row here.
 *
 * TWO OF THE THREE WINDOWS ASSERT A ZERO, AND THE SPLIT BETWEEN THEM
 * IS THE FILE'S ONE REAL FINDING. The body channels and the query
 * channel are captured under separate boots because their answers
 * about the process output DIFFER, and a single window would have had
 * to weaken the body claim to accommodate the query one. Over the
 * twenty-one body rows the capture holds the sentinel ZERO times.
 * Over the fourteen query rows it holds it FIFTY-FOUR, and none of
 * those is a handler's doing: `applyMiddleware` builds `pino-http`
 * with no `redact` option, and its request serialiser records the raw
 * `url` AND the parsed `query` object, so every occurrence in a
 * request URL lands in the capture exactly twice. The query channel's
 * containment claim is therefore about the RESPONSE BODY alone, and
 * the log half of it is a measurement about the transport that this
 * file states rather than a zero it asserts. Nothing on the wave-1
 * surface takes a secret in a query string — `?page`, `?perPage`,
 * `?cascade` and `?format` are the whole vocabulary — so the
 * finding is a boundary on the claim rather than a defect in it.
 *
 * THE TWO ZEROS ARE ABOUT DIFFERENT CHANNELS, which is worth
 * stating because they read as one claim written twice.
 * `errorHandler` in `lib/errors/handler.ts` logs an `AppError` as
 * `{ code, cause }` plus its `message` and does NOT log `details`,
 * so a leak in a validation detail reaches the response body and
 * never the log. The capture's zero covers the other half — the
 * message a service constructed, the `cause` it attached, and every
 * request header `pino-http` writes out — and only the body's zero
 * covers the detail. A file asserting one of them has said nothing
 * about the other.
 *
 * THE THIRD WINDOW IS A PLANTED LEAK, AND IT IS WHAT MAKES BOTH
 * ZEROS READINGS. A zero-hit scan is satisfied by a needle that
 * stopped matching, by a capture that stopped reading and by a
 * window that never opened, and none of those is distinguishable
 * from a surface that leaks nothing. So a third boot is assembled
 * by the SAME function over the SAME five mounts with one route
 * added — {@link plantLeakingRoute}, mounted where a sixth wave-1
 * router would go — and that route does on purpose everything the
 * surface is forbidden to do. It writes the submitted body to the
 * console, to stderr, into the message of the error it throws and
 * into that error's one detail, and each of those is then counted
 * with the same {@link countSentinel} both zeros are counted with.
 *
 * FOUR CHANNELS RATHER THAN ONE PLANT, because this file makes
 * four claims and one leak would prove one of them.
 * {@link PLANTED_LEAKS} declares where each is expected to land
 * and the cases read it row by row. Two of the four exist because
 * nothing else in the package can reach them: no module under
 * `src/` writes to the console, and the framework writes to stderr
 * on no healthy boot, so those two patches had no live control at
 * all before this window and their mutation legs were measured
 * zeros. The other two are the channel split above made
 * checkable — the thrown MESSAGE lands in both texts and the
 * DETAIL lands in the response alone, because
 * `lib/errors/handler.ts` logs the one and not the other.
 *
 * WHAT THE PLANTED WINDOW DOES NOT DO is assert a containment
 * claim of its own, and it reaches no store: its route reads the
 * body, writes it out four times and throws. It is also invisible
 * to every mutation of `src/http/validation.ts` by construction,
 * which is the point rather than a limit — a control that moved
 * with the subject would be a second measurement of the subject
 * instead of evidence that the instrument works.
 *
 * HOW THE CAPTURE WORKS is `tests/auth/secret-logging.test.ts`'s
 * mechanism, unchanged and for its reasons. pino picks its
 * destination once, at logger construction, and a stream that has
 * not been replaced gets a `SonicBoom` writing straight to file
 * descriptor 1 — which no later patch of `process.stdout.write` can
 * see. So the patch goes in FIRST and every logger on the path is
 * constructed under it: `createService`'s own and the separate
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
 * THE IN-BAND CONTROLS, because a capture that read nothing and a
 * service that leaked nothing look identical, and so do a request
 * that carried the sentinel and one that never did. Every row
 * asserts the sentinel is present in the bytes it actually SENT —
 * the serialised body for a body row, the request URL for a query
 * row — so a zero is always about a request that carried one.
 * Every row asserts its answer is JSON carrying a `code`, which is
 * the failure envelope and says the wave-1 surface answered rather
 * than Express's own page. Each window asserts the capture holds
 * the framework's `listening` line and a `request completed` record
 * for one of its own rows, which is what says the window was open
 * across both the boot and the requests. And the search itself has
 * TWO live positive controls rather than none: the planted window
 * above, which is the direct one, and the query window's
 * fifty-four, which is the same counter over the same kind of
 * capture returning a known non-zero in the same run as the body
 * window's zero.
 *
 * TWENTY MUTATIONS WERE RUN AGAINST THESE FIFTY-ONE CASES, twice
 * each with no red set moving between the runs, and NONE of them
 * is a measured zero. The two this file used to carry were both
 * discharged by the planted window, which is the clearest single
 * statement of what that window bought.
 *
 * SIX LAND ON A MODULE. Adding `issue.keys` to a detail's message
 * reddens TEN — the nine unrecognized-key rows and, less
 * obviously, the query row for `DELETE /domains/:slug`, which is
 * the only write route that parses a query at all and whose strict
 * schema raises the same issue about the sentinel KEY. So one
 * query row is on the sanitiser's subject and not only on the
 * transport. Copying `issue.message` verbatim reddens the
 * IDENTICAL ten: two legs, one reading. Dropping the open-path
 * collapse and ignoring `options.openPaths` each redden the same
 * THREE open-record cases, likewise one reading in two spellings.
 * A domains handler rethrowing its refusal with `req.body`
 * interpolated into the message — same status, code, `details` and
 * `cause`, so the leg carries one claim rather than two — reddens
 * FIVE: all three `POST /domains` body rows, the body window's
 * capture case, and the planted window's head-to-head. And logging
 * `details` beside `{ code, cause }` in `lib/errors/handler.ts`
 * reddens TWO, both of them planted cases. That leg WAS the first
 * measured zero: no wave-1 detail carries the sentinel, so
 * widening what is logged reached nothing until a planted detail
 * gave it a subject.
 *
 * THE OTHER FOURTEEN ARE FIXTURE LEGS, and four of them report
 * something a reader would otherwise get wrong. Dropping the
 * console patch reddens TWO, and it was the second measured zero
 * for the same reason: no module under `src/` writes to the
 * console, so that patch had no live control until the planted
 * route wrote one line through it. Restoring a stream with a bound
 * copy reddens the streams guard alone — but the leg has to be
 * aimed at the DELETE branch of {@link redirectStream}, because
 * `write` is INHERITED on both streams here, so
 * `getOwnPropertyDescriptor` answers undefined and the
 * `defineProperty` line is never reached in this file at all.
 * Dropping one query row from the table reddens the CHANNEL guard
 * and not the route-set one: that route survives through its body
 * rows, so a route-set comparison cannot see a channel go missing,
 * which is why both guards are here. And a query row that submits
 * no sentinel reddens the sent-bytes guard ALONE — its thirteen
 * response zeros stay green and so does the transport count, which
 * is derived from the same URLs, so thirteen rows go vacuous at
 * once and one guard is the whole of what reports it.
 *
 * KEYING A WINDOW BY LABEL ALONE REDDENS ONE, and the figure is
 * worth stating because it is the opposite of what the collapse
 * looks like it should cost. `keyOf` answering {@link labelOf}
 * collapses each route's three body rows onto one entry and leaves
 * two cases reading a sibling channel's answer — but every answer
 * on this surface is equally JSON, equally a failure envelope and
 * equally sentinel-free, so no row's own assertions can tell that
 * it read somebody else's. The uniqueness guard is the whole of
 * what reports it. Measured at 1 for that spelling AND for
 * {@link routeLabelOf}, which drops the note as well; a figure of
 * thirty-six recorded by this file's predecessor reproduces at
 * neither, and the general shape is that planting a collision in a
 * table whose rows all answer alike is invisible to every row.
 *
 * THE REMAINING FIXTURE LEGS: a fabricated route reddens three, a
 * substitution that answers its argument unchanged reddens two,
 * reading the transport count as one site rather than two reddens
 * the query capture case, two open-record rows sharing a path
 * redden the distinct-path case, and a sink that records nothing
 * reddens FIVE — both capture cases through their `listening` and
 * `request completed` controls, plus three planted ones. The
 * planted CONSOLE row stays green under that last leg, which is
 * the reading in it: the console patch and the stream sink are two
 * mechanisms, and only a leg per mechanism says so.
 *
 * FOUR LEGS AIM AT THE PLANT ITSELF, since a control nothing can
 * break is not one. Not mounting the planted route reddens SIX —
 * every planted case except the table guard, which reads only the
 * table and is the survivor that says the other six reach the
 * window at all. Dropping the console write reddens TWO and
 * dropping the stderr write another TWO, each its own channel row
 * plus the head-to-head. And making the planted route leak a
 * constant instead of the submitted body reddens TWO: the markers
 * still land where the table says, so the per-channel rows stay
 * green and only the two counts that tie a marker to a sentinel
 * report it — which is what those two totals are for.
 *
 * THE HEAD-TO-HEAD CASE IS IN EIGHT OF THE TWENTY RED SETS, more
 * than any other case in the file. That is what a control looks
 * like when it is load-bearing: every leg that touches what the
 * process writes is reported by it — the module leak, the leg
 * widening what is logged, the leg dropping the console patch, the
 * sink, and all four plant legs.
 *
 * WHICH ROWS HAVE A LIVE SUBJECT AND WHICH REST ON THE CONTROLS.
 * Twelve of the twenty-one body rows are reddened by a module leg
 * above — the nine unrecognized-key rows and the three
 * open-record ones — and a thirteenth, `POST /domains` in the
 * field-value channel, reddens under the echoing handler. The
 * other EIGHT field-value rows are reddened by no module leg at
 * all, and that is structural rather than a gap in the grid: zod
 * puts a submitted VALUE in no issue path and no issue message, so
 * those rows pin a channel closed UPSTREAM of the sanitiser and
 * their green says nothing about it. What they rest on is the
 * per-row sent-bytes control and the planted window — which is
 * exactly the difference between a zero nobody can read and a zero
 * measured with an instrument shown working in the same run.
 *
 * WHAT IS OUT OF REACH HERE is the driver channel, and it is out of
 * reach by construction rather than by omission. A `ConflictError`
 * built with `{ cause: <driver error> }` puts the pg `detail`
 * (`Key (slug)=(<the submitted value>) already exists.`) one
 * property read from `errorHandler`'s log line — but reaching it
 * needs a stored row to collide with, and the store here is empty
 * on purpose. `tests/live/api.live.test.ts` is where a real driver
 * error exists at all.
 *
 * NOTHING IS WRITTEN, which is what lets one boot serve a whole
 * window. Every `:slug` and every `:id` names a row that does not
 * exist and every body is one the schema refuses or one whose
 * address does not resolve, so each window's requests answer `422`
 * or `404` and leave the dataset the boot built. The planted route
 * is the same: it reaches no store at all. The last case reads all
 * three stores directly rather than trusting any of that.
 *
 * NO AUTH BLOCK IS CONFIGURED, and the five mounts still spell
 * `app.use(ctx.requireAuth, router)` exactly as `src/index.ts` does.
 * With no block `createService` resolves `requireAuth` to
 * `passthroughMiddleware`, so every request here REACHES its
 * handler, which is what this file needs and what a local boot
 * does. Whether the guard is real and on the mount is
 * `tests/api/wiring.test.ts`'s subject and is asserted there.
 */
import type { ServiceHandle } from '../../lib/express/index.js';
import type {
  MemoryResearchStore,
} from '../helpers/memory-research-store.js';
import type { Application, Router } from 'express';
import type { Response } from 'supertest';

import process from 'node:process';

import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';

import { ValidationError } from '../../lib/errors/index.js';
import { createService } from '../../lib/express/index.js';
import { buildDomainsRouter } from '../../src/domains/index.js';
import { buildPersonasRouter } from '../../src/personas/routes.js';
import { buildSettingsRouter } from '../../src/settings/routes.js';
import {
  buildCategoriesRouter,
} from '../../src/taxonomy/categories-routes.js';
import { buildTermsRouter } from '../../src/taxonomy/terms-routes.js';
import {
  createMemoryResearchStore,
} from '../helpers/memory-research-store.js';

// Read at boot time by `createService`: an ephemeral port and no
// `process.exit` on a failed dependency. Set here rather than in a
// hook so it is already true for the first service built.
process.env.NODE_ENV = 'test';

/**
 * The needle every row submits and every assertion counts.
 *
 * Shaped so that no schema on the surface accepts it where a value
 * is declared as anything but free text: the dots and the capitals
 * put it outside `slugParamSchema`'s pattern, it is a member of no
 * enum, and it is not a number. That is what lets ONE constant
 * serve the field-value channel across nine routes rather than a
 * different refusable value per schema.
 *
 * Also shaped so it survives a URL unencoded — letters, digits,
 * dots and hyphens are all unreserved — because the query rows
 * count it in the raw request URL and in the capture, and a
 * percent-encoded needle would be a different string in both.
 *
 * And long enough that no substring of a pino record could spell it
 * by accident: a timestamp, a port, an ETag and a rate-limit header
 * are all in the capture.
 */
const SENTINEL = 'sentinel.Nn7Qv2xLd4Rk.must-never-be-echoed';

/**
 * The `:slug` every parameterised path here is addressed by.
 *
 * Names no domain. Each window's store is constructed empty and
 * nothing here writes, so a route resolving an address answers
 * `404` rather than serving a row — see the header.
 */
const UNSTORED_SLUG = 'example-tech-radar';

/**
 * The `:id` every parameterised path here is addressed by.
 *
 * Well-formed on purpose. A segment `resourceIdParamSchema` refuses
 * would be answered `422` before the body is ever read, which would
 * make a body row a test of the address instead.
 */
const UNSTORED_ID = '1';

/**
 * How many times one occurrence in a request URL lands in the
 * capture.
 *
 * `applyMiddleware` builds its `pino-http` with no `redact` option
 * and no serialiser of its own, so the default request serialiser
 * writes the raw `url` and the parsed `query` object into every
 * `request completed` record — two sites for the same bytes.
 * Measured; the query window's own case is what re-derives it.
 */
const PINO_URL_SITES = 2;

/**
 * The console methods that reach stdout or stderr in a deployment.
 *
 * All five are replaced for the life of a capture window. Under
 * vitest the console does NOT route through
 * `process.stdout.write`, so without this a `console.log` of a
 * submitted value would be captured by nothing — see the header.
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

/**
 * Counts occurrences of {@link SENTINEL} in a string.
 *
 * A count rather than a `toContain`, because half the readings here
 * are exact non-zeros: the bytes a row sent carry it a known number
 * of times, and so does the query window's capture.
 *
 * @param text - Whatever is being searched.
 * @returns How many times the sentinel occurs in it.
 */
function countSentinel(text: string): number {
  return text.split(SENTINEL).length - 1;
}

/**
 * Counts occurrences of a planted leak's marker.
 *
 * How one planted write is read out of a text holding four of
 * them: each prefixes what it leaks with its own token, so this
 * attributes an occurrence to the channel that wrote it where
 * {@link countSentinel} only counts. What ties the two readings
 * together is that their totals must agree — every marker here is
 * written immediately ahead of the submitted body, so a marker
 * count above a sentinel count would be a planted write that
 * leaked nothing.
 *
 * @param text - Whatever is being searched.
 * @param marker - The token a planted leak prefixes its write
 *   with.
 * @returns How many times that marker occurs in it.
 */
function countMarker(text: string, marker: string): number {
  return text.split(marker).length - 1;
}

/** The four positions a sentinel is submitted in. */
const ECHO_CHANNELS = [
  'field value',
  'open-record key',
  'query parameter',
  'unrecognized key',
] as const;

/** One member of {@link ECHO_CHANNELS}. */
type EchoChannel = (typeof ECHO_CHANNELS)[number];

/**
 * The verbs a wave-1 WRITE route can carry.
 *
 * Read against what the five routers registered rather than
 * transcribed: {@link registeredWriteLabels} filters their own
 * stacks by this list, so a route added under a verb absent here
 * would leave the surface and this file's table disagreeing.
 */
const WRITE_METHODS = ['delete', 'patch', 'post', 'put'] as const;

/** One member of {@link WRITE_METHODS}. */
type WriteMethod = (typeof WRITE_METHODS)[number];

/** One row of {@link BODY_PROBES} or {@link QUERY_PROBES}. */
interface EchoProbe {
  /** Which of the four positions this row submits the sentinel in. */
  readonly channel: EchoChannel;
  /** The verb, lowercased as supertest and `route.stack` spell it. */
  readonly method: WriteMethod;
  /**
   * The express path TEMPLATE, exactly as the router registered it.
   * {@link urlFor} derives the requested URL from it, so a row's
   * label and the address its case asks for cannot drift apart.
   */
  readonly path: string;
  /**
   * What separates two rows that share a route and a channel, and
   * absent everywhere else. Part of the case NAME and never of the
   * route set the coverage guard compares.
   */
  readonly note?: string;
  /** The query string, without its `?`, for a query row. */
  readonly query?: string;
  /** The JSON body, for a row that submits one. */
  readonly body?: Readonly<Record<string, unknown>>;
}

/**
 * Every row whose sentinel travels in a request BODY.
 *
 * Three channels over the nine body-bearing write routes. The
 * FIELD-VALUE rows put the sentinel where a member is declared:
 * seven of them at a member no string can satisfy (a slug pattern,
 * a number, an enum, an object), and the two personas rows at free
 * text the schema accepts, so those two reach the address check
 * with the value intact. The UNRECOGNIZED-KEY rows submit the
 * sentinel as the sole key of an object every one of these schemas
 * declares `.strict()`. The OPEN-RECORD rows cover all three
 * declared open paths — `settings.scoringWeights` and
 * `settings.fieldContract` from `src/domains/service.ts`, and
 * `notificationChannels` from `src/settings/service.ts` — each with
 * a value the record's own schema refuses, so the parse fails at a
 * path whose operator-chosen segment is the sentinel itself.
 */
const BODY_PROBES = [
  // `slug` is the one member of this body that refuses a string,
  // and the detail names `slug` without saying what was in it.
  {
    channel: 'field value',
    method: 'post',
    path: '/domains',
    body: { slug: SENTINEL, name: 'Echo probe' },
  },
  // `settings` is declared an object, so a string is refused there
  // and the patch never reaches the store.
  {
    channel: 'field value',
    method: 'patch',
    path: '/domains/:slug',
    body: { settings: SENTINEL },
  },
  {
    channel: 'field value',
    method: 'post',
    path: '/domains/:slug/categories',
    body: { key: 'echo-probe', name: 'Echo probe', parentId: SENTINEL },
  },
  {
    channel: 'field value',
    method: 'patch',
    path: '/categories/:id',
    body: { parentId: SENTINEL },
  },
  // `pattern` and `weight` are supplied valid so that `polarity` is
  // the only member refused and the answer is one detail.
  {
    channel: 'field value',
    method: 'post',
    path: '/categories/:id/terms',
    body: {
      pattern: 'echo-probe',
      weight: 1,
      polarity: SENTINEL,
      notes: null,
    },
  },
  {
    channel: 'field value',
    method: 'patch',
    path: '/terms/:id',
    body: { polarity: SENTINEL },
  },
  // The two rows where the SCHEMA accepts the sentinel: `role` and
  // `systemText` are free text with no pattern, so the parse
  // succeeds and the request is refused at its address instead.
  // That is the deepest a submitted value gets on this surface
  // without a row existing for it to collide with.
  {
    channel: 'field value',
    method: 'post',
    path: '/domains/:slug/personas',
    body: { role: SENTINEL, systemText: '' },
  },
  {
    channel: 'field value',
    method: 'patch',
    path: '/personas/:id',
    body: { role: SENTINEL },
  },
  {
    channel: 'field value',
    method: 'put',
    path: '/settings',
    body: { digestFormat: SENTINEL },
  },

  // The sentinel as the sole undeclared key. zod raises ONE
  // `unrecognized_keys` issue per container and puts the offending
  // names in `issue.keys` and in its own quoted message, neither of
  // which `src/http/validation.ts` reads.
  {
    channel: 'unrecognized key',
    method: 'post',
    path: '/domains',
    body: { [SENTINEL]: 1 },
  },
  {
    channel: 'unrecognized key',
    method: 'patch',
    path: '/domains/:slug',
    body: { [SENTINEL]: 1 },
  },
  {
    channel: 'unrecognized key',
    method: 'post',
    path: '/domains/:slug/categories',
    body: { [SENTINEL]: 1 },
  },
  {
    channel: 'unrecognized key',
    method: 'patch',
    path: '/categories/:id',
    body: { [SENTINEL]: 1 },
  },
  // No `terms` member, so this reaches the single-create schema
  // rather than the bulk one — which is the branch whose refusal
  // names `body` rather than `terms.0`.
  {
    channel: 'unrecognized key',
    method: 'post',
    path: '/categories/:id/terms',
    body: { [SENTINEL]: 1 },
  },
  {
    channel: 'unrecognized key',
    method: 'patch',
    path: '/terms/:id',
    body: { [SENTINEL]: 1 },
  },
  {
    channel: 'unrecognized key',
    method: 'post',
    path: '/domains/:slug/personas',
    body: { [SENTINEL]: 1 },
  },
  {
    channel: 'unrecognized key',
    method: 'patch',
    path: '/personas/:id',
    body: { [SENTINEL]: 1 },
  },
  {
    channel: 'unrecognized key',
    method: 'put',
    path: '/settings',
    body: { [SENTINEL]: 1 },
  },

  // `settings.scoringWeights` is a record of numbers, so a string
  // entry fails at `settings.scoringWeights.<the sentinel>` and the
  // mask is the only thing between that path and the wire.
  {
    channel: 'open-record key',
    method: 'post',
    path: '/domains',
    body: {
      slug: 'echo-probe-domain',
      name: 'Echo probe',
      settings: { scoringWeights: { [SENTINEL]: 'not a number' } },
    },
  },
  // `settings.fieldContract` is the second declared open path, and
  // its values are `.strict()` objects — so this row fails one
  // level BELOW the operator key and answers a path carrying two
  // masked segments.
  {
    channel: 'open-record key',
    method: 'patch',
    path: '/domains/:slug',
    body: {
      settings: { fieldContract: { [SENTINEL]: { type: 'not a type' } } },
    },
  },
  {
    channel: 'open-record key',
    method: 'put',
    path: '/settings',
    body: { notificationChannels: { [SENTINEL]: 'not a boolean' } },
  },
] as const satisfies readonly EchoProbe[];

/**
 * Every row whose sentinel travels in a QUERY STRING.
 *
 * One row per write route, the four `DELETE`s included — they carry
 * no body, so this is the only channel that reaches them at all.
 * The sentinel is both the key and the value, which covers the two
 * positions a strict query schema can refuse in one request.
 *
 * `DELETE /domains/:slug` carries a second row because it is the
 * ONLY write route on the surface that parses a query at all
 * (`domainDeleteQuerySchema`, for `?cascade=confirm`): the extra
 * row puts the sentinel in the value of a DECLARED parameter, where
 * the refusal is an `invalid_value` naming `cascade` and zod's own
 * message for that issue lists the allowed options rather than the
 * rejected one. Every other route here parses no query, so its
 * sentinel is ignored by the handler and reaches only the
 * transport.
 */
const QUERY_PROBES = [
  { channel: 'query parameter', method: 'post', path: '/domains' },
  { channel: 'query parameter', method: 'patch', path: '/domains/:slug' },
  { channel: 'query parameter', method: 'delete', path: '/domains/:slug' },
  {
    channel: 'query parameter',
    method: 'delete',
    path: '/domains/:slug',
    note: 'cascade',
    query: `cascade=${SENTINEL}`,
  },
  {
    channel: 'query parameter',
    method: 'post',
    path: '/domains/:slug/categories',
  },
  { channel: 'query parameter', method: 'patch', path: '/categories/:id' },
  { channel: 'query parameter', method: 'delete', path: '/categories/:id' },
  {
    channel: 'query parameter',
    method: 'post',
    path: '/categories/:id/terms',
  },
  { channel: 'query parameter', method: 'patch', path: '/terms/:id' },
  { channel: 'query parameter', method: 'delete', path: '/terms/:id' },
  {
    channel: 'query parameter',
    method: 'post',
    path: '/domains/:slug/personas',
  },
  { channel: 'query parameter', method: 'patch', path: '/personas/:id' },
  { channel: 'query parameter', method: 'delete', path: '/personas/:id' },
  { channel: 'query parameter', method: 'put', path: '/settings' },
] as const satisfies readonly EchoProbe[];

/** Every row in the file, for the guards that read the whole table. */
const ALL_PROBES: readonly EchoProbe[] = [...BODY_PROBES, ...QUERY_PROBES];

/**
 * The query string a query row submits when it declares none.
 *
 * The sentinel in BOTH positions, so one request covers the two
 * places a strict query schema can refuse it: as an undeclared key,
 * where the detail names the container, and as that key's value.
 */
const DEFAULT_SENTINEL_QUERY = `${SENTINEL}=${SENTINEL}`;

/**
 * The path the planted-leak control mounts its route at.
 *
 * Outside every wave-1 path shape on purpose: no router registers
 * it, so the request below reaches the planted route through the
 * same five `/` mounts every other row falls through, and the
 * route-set guard above never sees it.
 */
const PLANTED_PATH = '/planted-leak-control';

/** One deliberate leak the planted route writes. */
interface PlantedLeak {
  /** What the case reading it is named for. */
  readonly channel: string;
  /**
   * The token this leak prefixes the sentinel with, so a capture
   * holding several of them can be read one leak at a time.
   */
  readonly marker: string;
  /** How many times it puts the sentinel in the CAPTURE. */
  readonly captured: number;
  /** How many times it puts the sentinel in the RESPONSE BODY. */
  readonly answered: number;
}

/**
 * Every channel the planted route leaks the sentinel through, and
 * where each one lands.
 *
 * The reason this file's zeros are readings rather than assertions
 * about nothing: each row is a leak the real surface does not make,
 * written through the mechanism the real surface would use, and
 * measured with the same {@link countSentinel} every zero above is
 * measured with. A counter that had stopped matching, a capture
 * that had stopped reading and a window that never opened all
 * answer zero over the wave-1 rows and are each caught here.
 *
 * The four rows are not interchangeable — they are the four
 * channels the file makes a claim about. CONSOLE is the only live
 * control the console patch has at all: no module under `src/`
 * writes to the console today, so without this row that patch's
 * mutation leg is a measured zero. STDERR is the same for the
 * second stream, which the framework never writes to on a healthy
 * boot. MESSAGE is a service-constructed `AppError` message, which
 * `lib/errors/handler.ts` logs AND answers, so it is the one row
 * reaching both. DETAIL is the counterpart that reaches the body
 * ALONE: that same handler logs `{ code, cause }` and the message
 * and does NOT log `details`, so the header's claim that the two
 * zeros cover different channels is measured here rather than
 * argued.
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
    channel: 'the message of the error it throws',
    marker: 'planted-message-leak',
    captured: 1,
    answered: 1,
  },
  {
    // Twice in the body: once in the detail's `field` and once in
    // its `message`, which is both halves of what a detail carries.
    channel: 'a detail of the error it throws',
    marker: 'planted-detail-leak',
    captured: 0,
    answered: 2,
  },
] as const satisfies readonly PlantedLeak[];

/** What {@link countSentinel} must answer over the planted capture. */
const PLANTED_CAPTURED_TOTAL = PLANTED_LEAKS
  .reduce((total, leak) => total + leak.captured, 0);

/** What it must answer over the planted response body. */
const PLANTED_ANSWERED_TOTAL = PLANTED_LEAKS
  .reduce((total, leak) => total + leak.answered, 0);

/**
 * The one row the planted window submits.
 *
 * An {@link EchoProbe} so it travels the same `captureProbes` path
 * every other row does — the same URL builder, the same sent-bytes
 * control and the same response map. Its channel is `field value`
 * because that is where its sentinel sits in the body it sends; it
 * is deliberately absent from {@link ALL_PROBES}, so no coverage
 * guard reads it and the route set stays exactly the wave-1
 * surface.
 */
const PLANTED_PROBE = {
  channel: 'field value',
  method: 'post',
  path: PLANTED_PATH,
  note: 'planted leak',
  body: { plantedValue: SENTINEL },
} as const satisfies EchoProbe;

/**
 * The one spelling of a route's label, so the table and the routers
 * are compared in one vocabulary.
 *
 * @param method - The verb, in whatever case its source spells it.
 * @param path - The express path template.
 * @returns `POST /domains/:slug/categories` and the like.
 */
function labelFor(method: string, path: string): string {
  return `${method.toUpperCase()} ${path}`;
}

/**
 * The route a row addresses, with its note left off.
 *
 * What the coverage guard compares against the routers, so two rows
 * sharing a route collapse to one member rather than reading as a
 * route the surface does not declare.
 *
 * @param probe - The row.
 * @returns Its route label.
 */
function routeLabelOf(probe: EchoProbe): string {
  return labelFor(probe.method, probe.path);
}

/**
 * The name a row's case carries.
 *
 * Unique within a describe rather than across the file: the three
 * body channels each carry a row for the same nine routes, and the
 * channel is the describe those cases sit in. {@link keyOf} is what
 * has to be unique file-wide.
 *
 * @param probe - The row.
 * @returns Its route label, plus its note when it has one.
 */
function labelOf(probe: EchoProbe): string {
  return probe.note === undefined
    ? routeLabelOf(probe)
    : `${routeLabelOf(probe)} (${probe.note})`;
}

/**
 * The one identity of a row across the whole file.
 *
 * The channel is in it because the three body channels submit to
 * the same nine routes: without it a window's response map would
 * key three rows to one entry, keep the last, and leave two cases
 * silently reading somebody else's answer.
 *
 * @param probe - The row.
 * @returns Its channel and its label.
 */
function keyOf(probe: EchoProbe): string {
  return `${probe.channel} ${labelOf(probe)}`;
}

/**
 * The query string a row submits, or undefined for a body row.
 *
 * @param probe - The row.
 * @returns The query string without its `?`.
 */
function queryOf(probe: EchoProbe): string | undefined {
  if (probe.channel !== 'query parameter') return undefined;

  return probe.query ?? DEFAULT_SENTINEL_QUERY;
}

/**
 * The URL a row requests.
 *
 * Derived from the path TEMPLATE rather than written out, so the
 * label a case carries and the address it asks for are one string.
 * Both substitutions name nothing, which is what keeps a row from
 * writing.
 *
 * @param probe - The row.
 * @returns The path with every parameter substituted, plus the
 *   row's query string when it has one.
 */
function urlFor(probe: EchoProbe): string {
  const address = probe.path
    .replace(':slug', UNSTORED_SLUG)
    .replace(':id', UNSTORED_ID);
  const query = queryOf(probe);

  return query === undefined
    ? address
    : `${address}?${query}`;
}

/**
 * The bytes a row actually put on the wire that could carry the
 * sentinel.
 *
 * The in-band control for every zero in this file: a row whose
 * request never carried the needle answers zero occurrences for a
 * reason that has nothing to do with containment.
 *
 * @param probe - The row.
 * @returns Its serialised body, or its URL when it sends none.
 */
function sentBytesOf(probe: EchoProbe): string {
  return probe.body === undefined
    ? urlFor(probe)
    : JSON.stringify(probe.body);
}

/** One verb-and-path pair a router registered. */
interface RegisteredRoute {
  /** The verb, lowercased as express stores it. */
  readonly method: string;
  /** The path template the router was given. */
  readonly path: string;
}

/**
 * Every route a router registered, read off its stack.
 *
 * `router.stack` carries one layer per registered path and that
 * layer's own `stack` carries one handler layer per verb, which is
 * where the method is legible at all — so a path registered for two
 * verbs is one outer layer with two inner ones.
 *
 * Pairs rather than labels, because the caller filters on the VERB
 * and express spells it lowercase where {@link labelFor} upper-cases
 * it. Re-splitting a built label to get it back is the shape that
 * quietly matched nothing.
 *
 * @param router - A built router.
 * @returns One pair per verb-and-path it declares.
 */
function routesOf(router: Router): RegisteredRoute[] {
  return router.stack.flatMap((layer) => {
    const route = layer.route;

    if (route === undefined) return [];

    return route.stack.map((inner) => ({
      method: inner.method,
      path: route.path,
    }));
  });
}

/**
 * Whether a verb registered by a router is a write.
 *
 * @param method - The verb as `route.stack` spells it.
 * @returns True when it is a member of {@link WRITE_METHODS}.
 */
function isWriteMethod(method: string): boolean {
  return (WRITE_METHODS as readonly string[]).includes(method);
}

/**
 * The labels of every WRITE route the five wave-1 routers register.
 *
 * Built over a store of its own rather than a booted service's: a
 * router factory registers its routes at construction and reads
 * nothing, so this answers the routers' own declaration.
 *
 * @returns Every registered write label, across all five routers.
 */
function registeredWriteLabels(): string[] {
  const store = createMemoryResearchStore();

  return [
    buildDomainsRouter({ store }),
    buildCategoriesRouter({ store }),
    buildTermsRouter({ store }),
    buildPersonasRouter({ store }),
    buildSettingsRouter({ store }),
  ]
    .flatMap(routesOf)
    .filter((route) => isWriteMethod(route.method))
    .map((route) => labelFor(route.method, route.path));
}

/**
 * Mounts the route that deliberately leaks, on the app a window
 * was built over.
 *
 * Everything the wave-1 handlers are forbidden to do, done on
 * purpose and in one place. The submitted body is serialised once
 * and written out four times: to the console, to stderr, into the
 * message of the error this route throws and into that error's
 * one detail. `createService` registers `errorHandler` LAST, so
 * the throw reaches the same handler every wave-1 refusal reaches
 * and is answered in the same envelope — which is what makes the
 * planted response a control on the readers the real rows use and
 * not only on the counter.
 *
 * Mounted AFTER the five routers, exactly where a sixth wave-1
 * router would go. No router matches {@link PLANTED_PATH}, so the
 * request falls through all five `/` mounts to reach it.
 *
 * @param app - The application a window's `register` was handed.
 */
function plantLeakingRoute(app: Application): void {
  app.post(PLANTED_PATH, async (req) => {
    const submitted = JSON.stringify(req.body);

    // Reaches the capture only through the five console patches:
    // under vitest the console does NOT route through
    // `process.stdout.write`, so this row is the one live control
    // those patches have.
    console.log(`${PLANTED_LEAKS[0].marker} ${submitted}`);

    // The second stream, which nothing on a healthy boot writes
    // to — so it is the one live control the stderr redirect has.
    process.stderr.write(`${PLANTED_LEAKS[1].marker} ${submitted}\n`);

    await Promise.resolve();

    // `errorHandler` logs an `AppError`'s message and answers its
    // `toJSON()`, so the third marker lands in BOTH texts and the
    // fourth — inside `details`, which that handler does not log —
    // lands in the response alone.
    throw new ValidationError(`${PLANTED_LEAKS[2].marker} ${submitted}`, [
      {
        field: `${PLANTED_LEAKS[3].marker} ${submitted}`,
        message: `${PLANTED_LEAKS[3].marker} ${submitted}`,
      },
    ]);
  });
}

/** What one capture window produced. */
interface EchoWindow {
  /** Everything written to stdout and stderr inside the window. */
  readonly text: string;
  /** Each row's answer, by {@link labelOf}. */
  readonly responses: ReadonlyMap<string, Response>;
  /** The store all five routers were built over. */
  readonly store: MemoryResearchStore;
}

/**
 * Boots a service assembled the way `src/index.ts` assembles one,
 * submits every row through it, and returns everything the process
 * wrote while doing so.
 *
 * The patches on the two streams and the five console methods are
 * installed before anything else and removed in a `finally`, and
 * NOTHING inside the window asserts: an `expect` throwing between
 * the two would leave all seven replaced for the rest of the
 * worker, and vitest's own account of the failure would go into the
 * array instead of to the terminal.
 *
 * The store is the in-memory one and it is the only substitution.
 * The routers, the services behind them, the boundary parser, the
 * error handler and the whole `createService` middleware stack are
 * the shipped modules, so the lines in the capture are the lines a
 * deployment writes.
 *
 * @param probes - The rows to submit, in order.
 * @param plant - Mounts one extra route on the app, for the window
 *   whose job is to leak. Absent for the two windows that assert a
 *   zero, so the only difference between them and the planted one
 *   is the route that echoes — which is exactly the antecedent
 *   those zeros are read against.
 * @returns The captured output, each row's response, and the store.
 */
async function captureProbes(
  probes: readonly EchoProbe[],
  plant?: (app: Application) => void,
): Promise<EchoWindow> {
  const chunks: string[] = [];
  const originalConsole = new Map<ConsoleMethod, unknown>();
  const responses = new Map<string, Response>();
  const store = createMemoryResearchStore();

  const sink = ((chunk: unknown): boolean => {
    chunks.push(String(chunk));
    return true;
  }) as StdioStream['write'];

  function consoleSink(...args: unknown[]): void {
    chunks.push(`${args.map((arg) => String(arg)).join(' ')}\n`);
  }

  const restoreOut = redirectStream(process.stdout, sink);
  const restoreErr = redirectStream(process.stderr, sink);

  for (const name of CONSOLE_METHODS) {
    originalConsole.set(name, console[name]);
    console[name] = consoleSink;
  }

  try {
    // Every logger on the path is constructed from here on, which
    // is what puts it inside the capture. See the header.
    const handle: ServiceHandle = await createService({
      serviceId: 'api-request-echo-probe',
      register(app, ctx) {
        // The five mounts of `src/index.ts`, in its order and with
        // its guard. No `auth` block is configured, so
        // `ctx.requireAuth` is the passthrough and every request
        // below reaches its handler.
        app.use(ctx.requireAuth, buildDomainsRouter({ store }));
        app.use(ctx.requireAuth, buildCategoriesRouter({ store }));
        app.use(ctx.requireAuth, buildTermsRouter({ store }));
        app.use(ctx.requireAuth, buildPersonasRouter({ store }));
        app.use(ctx.requireAuth, buildSettingsRouter({ store }));

        // Where a sixth wave-1 router would be mounted. Absent
        // for both windows that assert a zero.
        if (plant !== undefined) plant(app);
      },
    });

    for (const probe of probes) {
      const pending = request(handle.app)[probe.method](urlFor(probe));

      const response = await (probe.body === undefined
        ? pending
        : pending.send(probe.body));

      responses.set(keyOf(probe), response);
    }

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

  return { text: chunks.join(''), responses, store };
}

/** The body window, or undefined before `beforeAll` has run. */
let bodyWindow: EchoWindow | undefined;

/** The query window, or undefined before `beforeAll` has run. */
let queryWindow: EchoWindow | undefined;

/**
 * The planted window, or undefined before `beforeAll` has run.
 *
 * Assembled by the same function over the same five mounts, with
 * one route added that echoes what it was sent. It asserts no zero
 * — it is what says the two zeros above were read by a counter
 * that still matches and a capture that was still open.
 */
let plantedWindow: EchoWindow | undefined;

/**
 * One of the two windows, or a throw.
 *
 * The throw is a vacuity guard rather than a convenience: a case
 * reading an undefined window would fail on a property access, with
 * a message about the test rather than about the boot.
 *
 * @param window - The window a describe was built over.
 * @returns That window.
 * @throws Error When the boot never ran or never finished.
 */
function openedWindow(window: EchoWindow | undefined): EchoWindow {
  if (window === undefined) {
    throw new Error('the window never opened, so no case can read it');
  }

  return window;
}

/**
 * A row's answer, or a throw.
 *
 * A reader rather than a member access, because the alternative to
 * throwing is a case counting the sentinel in `String(undefined)` —
 * which is zero, and zero is exactly what the case is looking for.
 *
 * @param window - The window the row was submitted in.
 * @param probe - The row.
 * @returns The response it was answered with.
 * @throws Error When that row was never submitted.
 */
function answerTo(window: EchoWindow, probe: EchoProbe): Response {
  const response = openedWindow(window).responses.get(keyOf(probe));

  if (response === undefined) {
    throw new Error(`no request was made for ${keyOf(probe)}`);
  }

  return response;
}

/**
 * Whether a response carries the framework's failure envelope.
 *
 * The control that says the wave-1 surface answered rather than
 * Express's own page: every row here is refused, and every refusal
 * on this surface is `AppError.toJSON()`, whose `code` is a string.
 *
 * @param response - The response to classify.
 * @returns True when the body carries a string `code`.
 */
function isFailureEnvelope(response: Response): boolean {
  const body: unknown = response.body;

  if (typeof body !== 'object' || body === null) return false;

  return typeof (body as { code?: unknown }).code === 'string';
}

/** One entry of a `ValidationError`'s `details` list. */
interface EchoDetail {
  /** The field path the boundary parser built. */
  readonly field?: unknown;
}

/**
 * The field paths a refusal named.
 *
 * @param response - A response carrying the failure envelope.
 * @returns One string per detail, empty when there are none.
 */
function detailFieldsOf(response: Response): string[] {
  const body = response.body as { details?: unknown };

  if (!Array.isArray(body.details)) return [];

  return (body.details as EchoDetail[]).map((detail) => String(detail.field));
}

/** The rows submitting the sentinel at a declared member. */
const FIELD_VALUE_PROBES: readonly EchoProbe[] = BODY_PROBES
  .filter((probe) => probe.channel === 'field value');

/** The rows submitting it as the sole undeclared key. */
const UNRECOGNIZED_KEY_PROBES: readonly EchoProbe[] = BODY_PROBES
  .filter((probe) => probe.channel === 'unrecognized key');

/** The rows submitting it as a key below a declared open path. */
const OPEN_RECORD_PROBES: readonly EchoProbe[] = BODY_PROBES
  .filter((probe) => probe.channel === 'open-record key');

beforeAll(async () => {
  // Two windows, one after the other rather than one around both:
  // their answers about the process output differ, and the query
  // rows' transport records would otherwise have to be subtracted
  // out of the body rows' zero. See the header.
  bodyWindow = await captureProbes(BODY_PROBES);
  queryWindow = await captureProbes(QUERY_PROBES);
  // The third differs from the first in exactly one thing: a route
  // that echoes. Its own boot rather than a mount added to one of
  // the others, so neither zero above is measured over a service
  // carrying a leak.
  plantedWindow = await captureProbes([PLANTED_PROBE], plantLeakingRoute);
});

// ---------------------------------------------------------------------------
// The table, held against the surface it claims to cover
// ---------------------------------------------------------------------------

describe('the request-echo table', () => {
  it('names every wave-1 write route', () => {
    const declared = [...new Set(ALL_PROBES.map(routeLabelOf))];
    const registered = [...new Set(registeredWriteLabels())];

    // Both directions, and both matter. A write route added to any
    // of the five routers and not to the table is a route whose
    // refusals nothing here reads; a row naming a route no router
    // registered asks for a path Express never matches, where the
    // zero is about a `404` page rather than about containment.
    expect([...declared].sort()).toStrictEqual([...registered].sort());
    // The anti-vacuity leg for the comparison itself: two empty
    // lists are equal, and five routers that registered nothing
    // would make the whole file pass with no route in it.
    expect(registered.length).toBeGreaterThan(0);
  });

  it('covers all four channels across those routes', () => {
    const channels = [...new Set(ALL_PROBES.map((probe) => probe.channel))];

    expect(channels.sort()).toStrictEqual([...ECHO_CHANNELS].sort());

    // Which channels reach which route is decided by the VERB
    // rather than by anything a reader has to hold in their head.
    // The four `DELETE`s carry no body on this surface, so the
    // query channel is the only one with a subject there; every
    // other write route owes a row in each of the three channels a
    // body can carry. The open-record channel is deliberately not
    // in this rule — three routes declare an open path and the
    // rest have none, which the open-record cases assert directly.
    for (const label of new Set(ALL_PROBES.map(routeLabelOf))) {
      const covering = ALL_PROBES
        .filter((probe) => routeLabelOf(probe) === label)
        .map((probe) => probe.channel);

      if (label.startsWith('DELETE ')) {
        expect([...new Set(covering)]).toStrictEqual(['query parameter']);
        continue;
      }

      expect(covering).toContain('field value');
      expect(covering).toContain('unrecognized key');
      expect(covering).toContain('query parameter');
    }
  });

  it('sends the sentinel in every row it declares', () => {
    for (const probe of ALL_PROBES) {
      // The control behind every zero below: a row whose request
      // never carried the needle answers zero for a reason that has
      // nothing to do with containment.
      expect(countSentinel(sentBytesOf(probe))).toBeGreaterThan(0);
      // A template reaching supertest with its `:` intact is still
      // routed, still refused, and still counted at zero — the
      // segment would simply name something nobody meant.
      expect(urlFor(probe)).not.toContain(':');
    }

    // What gives the loop something to do: most of the table is
    // parameterised, so a substitution that answered its argument
    // unchanged fails above rather than agreeing with every row.
    const parameterised = ALL_PROBES
      .filter((probe) => probe.path.includes(':'));

    expect(parameterised.length).toBeGreaterThan(0);
  });

  it('names every row exactly once', () => {
    const keys = ALL_PROBES.map(keyOf);

    // Each window keys its responses by this, so two rows sharing
    // one would silently overwrite each other and leave a case
    // reading somebody else's answer at a zero of its own.
    expect(new Set(keys).size).toBe(keys.length);

    // And the name a case carries has to be unique inside its
    // describe, which is a weaker claim than the one above and the
    // one a duplicate `it` name would actually break.
    for (const channel of ECHO_CHANNELS) {
      const named = ALL_PROBES
        .filter((probe) => probe.channel === channel)
        .map(labelOf);

      expect(new Set(named).size).toBe(named.length);
    }
  });

  it('left both standard streams as it found them', () => {
    // Nothing else in the package reports this. A window that put
    // back a bound copy passes every case here and everywhere else,
    // and the damage — pino choosing `process.stdout` over a
    // `SonicBoom` for every logger a later file constructs — is a
    // change to suites this one does not import.
    expect(isPristine(process.stdout)).toBe(true);
    expect(isPristine(process.stderr)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The sentinel at a declared member
// ---------------------------------------------------------------------------

describe('a sentinel submitted as a field value', () => {
  for (const probe of FIELD_VALUE_PROBES) {
    it(`${labelOf(probe)} echoes none of it back`, () => {
      const response = answerTo(openedWindow(bodyWindow), probe);

      // The surface answered, rather than Express's own page: every
      // row here is refused, and every refusal on this surface is
      // `AppError.toJSON()`.
      expect(response.type).toBe('application/json');
      expect(isFailureEnvelope(response)).toBe(true);

      // Over the RAW payload rather than the parsed body, so a leak
      // anywhere in what was written back counts and not only one
      // arriving as a JSON field.
      expect(countSentinel(response.text)).toBe(0);
    });
  }
});

// ---------------------------------------------------------------------------
// The sentinel as a key no schema declares
// ---------------------------------------------------------------------------

describe('a sentinel submitted as an unrecognized key', () => {
  for (const probe of UNRECOGNIZED_KEY_PROBES) {
    it(`${labelOf(probe)} echoes none of it back`, () => {
      const response = answerTo(openedWindow(bodyWindow), probe);

      expect(response.type).toBe('application/json');
      expect(isFailureEnvelope(response)).toBe(true);

      // The channel with the shortest path to a leak on the whole
      // surface: zod's own message for this issue QUOTES the keys
      // it refused, and `src/http/validation.ts` answers a message
      // of this repo's own from a fixed vocabulary instead.
      expect(countSentinel(response.text)).toBe(0);
    });
  }
});

// ---------------------------------------------------------------------------
// The sentinel as an operator-chosen key inside a declared open record
// ---------------------------------------------------------------------------

describe('a sentinel submitted as an open-record key', () => {
  for (const probe of OPEN_RECORD_PROBES) {
    it(`${labelOf(probe)} answers a masked path`, () => {
      const response = answerTo(openedWindow(bodyWindow), probe);
      const fields = detailFieldsOf(response);

      expect(response.type).toBe('application/json');
      expect(isFailureEnvelope(response)).toBe(true);

      // Here the leak would be the PATH rather than a message:
      // every record issue puts the operator-chosen key IN
      // `issue.path`, which is why an open-path rule is needed at
      // all. A field carrying `.*` is that key having been masked.
      expect(fields.length).toBeGreaterThan(0);

      for (const field of fields) {
        expect(field).toContain('.*');
      }

      expect(countSentinel(response.text)).toBe(0);
    });
  }

  it('reaches a different open path in every row', () => {
    const fields = OPEN_RECORD_PROBES
      .flatMap((probe) => detailFieldsOf(answerTo(
        openedWindow(bodyWindow),
        probe,
      )));

    // One detail per row, and no two rows landing on the same
    // masked path — which is what says the three rows cover the
    // three declared open paths rather than one of them three
    // times. Derived from the answers, so a row copied and left
    // unedited fails here rather than reading as coverage.
    expect(fields.length).toBe(OPEN_RECORD_PROBES.length);
    expect(new Set(fields).size).toBe(fields.length);
  });
});

// ---------------------------------------------------------------------------
// The sentinel in a query string
// ---------------------------------------------------------------------------

describe('a sentinel submitted as a query parameter', () => {
  for (const probe of QUERY_PROBES) {
    it(`${labelOf(probe)} echoes none of it back`, () => {
      const response = answerTo(openedWindow(queryWindow), probe);

      expect(response.type).toBe('application/json');
      expect(isFailureEnvelope(response)).toBe(true);

      // The RESPONSE half only. What the process WROTE about these
      // rows is the transport's account of the URL and is asserted
      // as a known non-zero below — see the header.
      expect(countSentinel(response.text)).toBe(0);
    });
  }
});

// ---------------------------------------------------------------------------
// What the process wrote while answering
// ---------------------------------------------------------------------------

describe('the capture over the body rows', () => {
  it('holds the sentinel nowhere at all', () => {
    const window = openedWindow(bodyWindow);

    // The window was open across BOTH halves the claim names: the
    // boot, whose `listening` line the framework writes before any
    // request, and the requests themselves, each of which
    // `pino-http` records. Without these the zero below is equally
    // satisfied by a capture that read nothing.
    expect(window.text).toContain('"msg":"listening"');
    expect(window.text).toContain('"msg":"request completed"');
    expect(window.text).toContain('"url":"/settings"');

    // The claim. It covers the message a service constructed, the
    // `cause` it attached and every request header the transport
    // wrote out — but NOT the `details` list, which
    // `lib/errors/handler.ts` does not log and which only each
    // row's own response assertion reaches.
    expect(countSentinel(window.text)).toBe(0);
  });
});

describe('the capture over the query rows', () => {
  it('holds each URL occurrence exactly twice', () => {
    const window = openedWindow(queryWindow);
    const expected = QUERY_PROBES.reduce(
      (total, probe) => total + countSentinel(urlFor(probe)) * PINO_URL_SITES,
      0,
    );

    expect(window.text).toContain('"msg":"listening"');
    expect(window.text).toContain('"msg":"request completed"');

    // NOT a zero, and the departure is the finding this file
    // carries. `applyMiddleware` builds `pino-http` with no
    // `redact` option, and its request serialiser writes the raw
    // `url` and the parsed `query` object, so a query parameter is
    // recorded verbatim by the transport before any handler runs.
    // Nothing on the wave-1 surface takes a secret in a query
    // string, so this bounds the claim rather than breaking it.
    //
    // Derived from the rows rather than transcribed, and it doubles
    // as this file's one live control on the search: the same
    // counter over the same kind of capture returns a known
    // non-zero in the same run as the body window's zero.
    expect(expected).toBeGreaterThan(0);
    expect(countSentinel(window.text)).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// The planted leak, which is what makes the zeros above readings
// ---------------------------------------------------------------------------

describe('the planted-leak control', () => {
  it('answers the sentinel where every wave-1 row answers none', () => {
    const window = openedWindow(plantedWindow);
    const response = answerTo(window, PLANTED_PROBE);

    // Read through the SAME two classifiers the forty-four rows
    // are read through, so a control that answered Express's own
    // page would not pass for a route that echoed.
    expect(response.type).toBe('application/json');
    expect(isFailureEnvelope(response)).toBe(true);

    // The same sent-bytes control every other row carries.
    expect(countSentinel(sentBytesOf(PLANTED_PROBE))).toBeGreaterThan(0);

    // The claim: `countSentinel` over a response body finds what is
    // there. Every zero asserted above is this call answering zero,
    // so without this the whole file is a zero-hit scan whose needle
    // is never shown matching anything.
    expect(PLANTED_ANSWERED_TOTAL).toBeGreaterThan(0);
    expect(countSentinel(response.text)).toBe(PLANTED_ANSWERED_TOTAL);

    // And the two independent counts agree, which is what says each
    // marker was written ahead of a body that carried the sentinel
    // rather than ahead of nothing.
    const tagged = PLANTED_LEAKS.reduce(
      (total, leak) => total + countMarker(response.text, leak.marker),
      0,
    );

    expect(tagged).toBe(PLANTED_ANSWERED_TOTAL);
  });

  it('writes the sentinel where the body window wrote none', () => {
    const window = openedWindow(plantedWindow);

    // The window was open across the boot and the request, exactly
    // as each window above asserts of itself.
    expect(window.text).toContain('"msg":"listening"');
    expect(window.text).toContain('"msg":"request completed"');

    // The claim, and its head-to-head: the same counter over the
    // same kind of capture, produced by the same function over the
    // same five mounts, answers a known non-zero here and zero
    // there. A patch that had stopped capturing, or a counter that
    // had stopped matching, would answer zero in both.
    expect(PLANTED_CAPTURED_TOTAL).toBeGreaterThan(0);
    expect(countSentinel(window.text)).toBe(PLANTED_CAPTURED_TOTAL);
    expect(countSentinel(openedWindow(bodyWindow).text)).toBe(0);

    const tagged = PLANTED_LEAKS.reduce(
      (total, leak) => total + countMarker(window.text, leak.marker),
      0,
    );

    expect(tagged).toBe(PLANTED_CAPTURED_TOTAL);
  });

  for (const leak of PLANTED_LEAKS) {
    it(`${leak.channel} lands where the table says`, () => {
      const window = openedWindow(plantedWindow);
      const response = answerTo(window, PLANTED_PROBE);

      // Per channel rather than in total, because the four are the
      // four claims this file makes about where a leak can go and
      // a total is satisfied by any three of them.
      expect(countMarker(window.text, leak.marker)).toBe(leak.captured);
      expect(countMarker(response.text, leak.marker)).toBe(leak.answered);
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
    // capture. `lib/errors/handler.ts` logs an `AppError`'s message
    // and not its `details`, which is the whole of why.
    const captureOnly = PLANTED_LEAKS
      .filter((leak) => leak.captured > 0 && leak.answered === 0);
    const answerOnly = PLANTED_LEAKS
      .filter((leak) => leak.answered > 0 && leak.captured === 0);

    expect(captureOnly.length).toBeGreaterThan(0);
    expect(answerOnly.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// What the three windows left behind
// ---------------------------------------------------------------------------

describe('the stores behind the three windows', () => {
  it('hold nothing any window submitted', async () => {
    const windows = [
      openedWindow(bodyWindow),
      openedWindow(queryWindow),
      // The planted route reaches no store at all — it reads the
      // body, writes it out four times and throws — so the window
      // that leaks is as inert as the two that do not.
      openedWindow(plantedWindow),
    ];

    for (const window of windows) {
      // What lets one boot serve a whole window. Every row was
      // refused on its payload or on its address, so the dataset
      // each case saw is the one the boot built and the cases are
      // independent of the order vitest ran them in.
      //
      // Two readings cover the whole surface: every other wave-1
      // table hangs off `domains.id`, so a store holding no domain
      // can hold no category, term or persona either, and the
      // settings row is the one piece of state no address hides
      // behind.
      expect(await window.store.countDomains()).toBe(0);
      expect(await window.store.readSettings()).toBeNull();
    }
  });
});
