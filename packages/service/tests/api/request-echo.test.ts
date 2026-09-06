/**
 * One sentinel string is submitted through every WRITE route this
 * service mounts — as a field value, as an unrecognized key, as a
 * key inside an open record and as a query parameter — and, in the
 * query channel alone, through every wave-3 READ route beside them.
 * Each occurrence is counted in what came back and in everything
 * the process wrote while answering. One more request, to a route
 * planted to echo, is what says the counting works.
 *
 * WHAT THIS FILE PROVES THAT ITS SIBLINGS DO NOT is containment
 * across the WHOLE surface in one reading. Each resource group's
 * `*-routes.test.ts` carries a containment row of its own, but each
 * is scoped to its own router and each builds a bare `express()` app
 * with no `pino-http` in it, so none of them can see a log line at
 * all. The rule is that no request body content reaches a response
 * body or a log line through a validation detail, and
 * `docs/architecture/01-invariants.md` registers it, with this file
 * named as the artifact that fails when it stops holding.
 *
 * THE FOUR CHANNELS, and where each has a subject. A FIELD VALUE
 * goes at a declared member: on eighteen of the twenty-two
 * body-bearing write routes the schema refuses it outright (a slug
 * that is not slug-shaped, a string where a number or an enum is
 * declared) and the refusal is a detail naming the field; on the
 * other four — the two personas routes, a connector patch and the
 * finding verdict, whose bodies declare free text and nothing that
 * can refuse a string — the value is ACCEPTED by the schema and the
 * request dies at its address instead, which is the shape where the
 * sentinel travelled FURTHEST into the handler. An UNRECOGNIZED KEY
 * is the sentinel spelled as an undeclared member of a `.strict()`
 * object, which is the one zod issue whose own message quotes what
 * was submitted. An OPEN-RECORD KEY is the sentinel as an
 * operator-chosen key below one of the seven declared open paths,
 * where the leak would be the PATH rather than a message. A QUERY
 * PARAMETER is the sentinel as both the key and the value of a
 * query string, on every write route including the ten that read no
 * body and would otherwise have no row here, and on every wave-3
 * read route beside them.
 *
 * WHY THE READ ROUTES ARE HERE AT ALL, since nothing on them
 * writes. A query parameter is the one channel whose subject
 * depends on whether the route PARSES a query, and until wave 3
 * exactly one route on this surface did — `DELETE /domains/:slug`,
 * for `?cascade=confirm`. Six of wave 3's nine reads parse a
 * `.strict()` one, so the sentinel spelled as a key raises the
 * `unrecognized_keys` issue whose zod message quotes it: the
 * shortest path to a leak this file knows, arriving on the query
 * side rather than in a body. The other three are the single gets,
 * which parse no query and answer about their address instead.
 * Wave-1 and wave-2 reads are deliberately out, and the table guard
 * says so by comparing this half against the SIX wave-3 routers
 * rather than against the twenty read labels the surface declares.
 *
 * THE OPEN-RECORD CHANNEL HAS TWO SHAPES AND EVERY ROW DECLARES
 * WHICH, because the seven open paths do not answer alike and a
 * single loop over them would have had to weaken its assertion to
 * hold both.
 * Three CONSTRAIN their values — `settings.scoringWeights` is a
 * record of numbers and `settings.fieldContract` a record of
 * `.strict()` objects — so a bad entry raises at a path CARRYING the
 * operator key, and the collapse in `src/http/validation.ts` is the
 * only thing between that key and the wire. The other four are each
 * `z.record(z.string(), z.unknown())`: the value schema refuses
 * nothing and a JSON key is always a string, so no issue is reachable
 * strictly below the prefix at all. Their keys are ACCEPTED, carried
 * into a service's own input, and refused at the address instead — no
 * detail, a `404`, and the deepest a submitted KEY travels on this
 * surface. {@link EchoProbe.masksAPath} is where each row says which
 * it is and the table guard asserts both groups are populated, so a
 * record narrowed or widened later reddens the row it changed rather
 * than sliding into the other group's assertions. Both shapes read
 * their answer through `detailFieldsOf`, and the planted window below
 * is where that reader is shown finding a field at all.
 *
 * TWO OF THE THREE WINDOWS ASSERT A ZERO, AND THE SPLIT BETWEEN THEM
 * IS THE FILE'S ONE REAL FINDING. The body channels and the query
 * channel are captured under separate boots because their answers
 * about the process output DIFFER, and a single window would have had
 * to weaken the body claim to accommodate the query one. Over the
 * fifty-one body rows the capture holds the sentinel ZERO times.
 * Over the forty-two query rows it holds it ONE HUNDRED AND
 * SIXTY-SIX,
 * and none of those is a handler's doing: `applyMiddleware` builds
 * `pino-http` with no `redact` option, and its request serialiser
 * records the raw `url` AND the parsed `query` object, so every
 * occurrence in a request URL lands in the capture exactly twice. The
 * query channel's containment claim is therefore about the RESPONSE
 * BODY alone, and the log half of it is a measurement about the
 * transport that this file states rather than a zero it asserts.
 * Nothing on this surface takes a secret in a query string — every
 * parameter it declares is a page bound, a time bound, a sort key
 * or a narrowing by a value the client already knows — so the
 * finding is a boundary on the claim rather than a defect in it.
 * The vocabulary is deliberately not enumerated here: it grew by
 * seven members in one wave, and the claim is about what a
 * parameter IS rather than about how many there are.
 *
 * THE TWO ZEROS ARE ABOUT DIFFERENT CHANNELS, which is worth stating
 * because they read as one claim written twice. `errorHandler` in
 * `lib/errors/handler.ts` logs an `AppError` as `{ code, cause }`
 * plus its `message` and does NOT log `details`, so a leak in a
 * validation detail reaches the response body and never the log. The
 * capture's zero covers the other half — the message a service
 * constructed, the `cause` it attached, and every request header
 * `pino-http` writes out — and only the body's zero covers the
 * detail. A file asserting one of them has said nothing about the
 * other.
 *
 * THE THIRD WINDOW IS A PLANTED LEAK, AND IT IS WHAT MAKES BOTH ZEROS
 * READINGS. A zero-hit scan is satisfied by a needle that stopped
 * matching, by a capture that stopped reading and by a window that
 * never opened, and none of those is distinguishable from a surface
 * that leaks nothing. So a third boot is assembled by the SAME
 * function over the SAME sixteen mounts with one route added —
 * {@link plantLeakingRoute}, mounted where an eleventh router would
 * go — and that route does on purpose everything the surface is
 * forbidden to do. It writes the submitted body to the console, to
 * stderr, into the message of the error it throws and into that
 * error's first detail, and it leaks the operator's own key as an
 * UNCOLLAPSED field path through the request logger and a second
 * detail, and it leaks the QUERY it was sent through that same
 * logger and a third. Each of those is then counted with the same
 * {@link countSentinel} both zeros are counted with.
 *
 * SIX CHANNELS RATHER THAN ONE PLANT, because this file makes six
 * claims and one leak would prove one of them. {@link PLANTED_LEAKS}
 * declares where each is expected to land and the cases read it row
 * by row. Two of the six exist because nothing else in the package
 * can reach them: no module under `src/` writes to the console, and
 * the framework writes to stderr on no healthy boot, so those two
 * patches had no live control at all before this window and their
 * mutation legs were measured zeros. Two more are the channel split
 * above made checkable — the thrown MESSAGE lands in both texts and
 * the DETAIL lands in the response alone, because
 * `lib/errors/handler.ts` logs the one and not the other.
 *
 * THE FIFTH IS THE ONE WAVE 2 MADE NECESSARY, and it is the only
 * channel here whose leaked text is a field PATH. The open-record
 * rows assert that a masking answer carries `<prefix>.*` and that an
 * inert one carries no detail at all, and both of those are satisfied
 * by a `detailFieldsOf` that had stopped finding fields — so the
 * plant answers {@link PLANTED_OPEN_PATH} through that same reader
 * and logs it through the per-request `pino-http` child. Its body is
 * the shape the three inert rows submit, and the path it leaks is
 * BUILT from the key that body carried rather than spelled, which is
 * what a leg answering a constant reddens.
 *
 * THE SIXTH IS THE ONE WAVE 3 MADE NECESSARY, and it is the only
 * one whose leaked bytes came out of the URL rather than out of a
 * body. Thirteen query rows landed with wave 3, nine of them on
 * read routes that parse what they were sent, and their response
 * zeros had no control of their own — every planted leak before
 * this one leaked a BODY. So the planted row carries
 * {@link PLANTED_QUERY} beside its body and the route answers
 * `req.query` back, through the per-request logger and a third
 * detail's message.
 *
 * IT MEASURED SOMETHING ABOUT THE TRANSPORT THAT THE QUERY WINDOW
 * COULD NOT. `pino-http` hands a handler a CHILD logger with the
 * request BOUND, so a record written through `req.log` serialises
 * `req` again: measured, each of the plant's two `req.log.warn`
 * calls writes THREE occurrences of the sentinel, one it leaked and
 * two the bound request repeated. The planted capture therefore
 * holds ELEVEN where its markers account for FIVE, and the
 * six-occurrence difference is {@link PLANTED_TRANSPORT_TOTAL} —
 * one URL, {@link PINO_URL_SITES} sites,
 * {@link PLANTED_REQUEST_RECORDS} records. Read as a finding it is
 * sharper than the query window's: a handler that logs anything at
 * all about a request writes that request's query out again, once
 * per line.
 *
 * WHAT THE PLANTED WINDOW DOES NOT DO is assert a containment claim
 * of its own, and it reaches no store: its route reads the body and
 * the query, leaks them through six channels and throws. It is also
 * invisible to every mutation of `src/http/validation.ts` by
 * construction, which is the point rather than a limit — a control
 * that moved with the subject would be a second measurement of the
 * subject instead of evidence that the instrument works. Measured:
 * dropping the open-path collapse reddens three cases and not one of
 * them is planted, even now that a planted row answers an open path
 * of its own.
 *
 * HOW THE CAPTURE WORKS is `tests/auth/secret-logging.test.ts`'s
 * mechanism, unchanged and for its reasons. pino picks its
 * destination once, at logger construction, and a stream that has not
 * been replaced gets a `SonicBoom` writing straight to file
 * descriptor 1 — which no later patch of `process.stdout.write` can
 * see. So the patch goes in FIRST and every logger on the path is
 * constructed under it: `createService`'s own and the separate
 * instance `applyMiddleware` builds for `pino-http`. The five console
 * methods are patched alongside the two streams, because vitest
 * replaces the console with its own reporting channel and a
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
 * that carried the sentinel and one that never did. Every row asserts
 * the sentinel is present in the bytes it actually SENT — the
 * serialised body for a body row, the request URL for a query row —
 * so a zero is always about a request that carried one. Every row
 * asserts its answer is JSON carrying a `code`, which is the failure
 * envelope and says this surface answered rather than Express's own
 * page. Each window asserts the capture holds the framework's
 * `listening` line and a `request completed` record for one of its
 * own rows, which is what says the window was open across both the
 * boot and the requests. And the search itself has TWO live positive
 * controls rather than none: the planted window above, which is the
 * direct one, and the query window's hundred and sixty-six, which is
 * the same counter over the same kind of capture returning a known
 * non-zero in the same run as the body window's zero. The open-record
 * rows' other reader, `detailFieldsOf`, has the planted window as its
 * ONE live control and nothing else.
 *
 * ONE BOOT PER WINDOW IS BOUNDED BY THE SHIPPED RATE LIMITER, and the
 * headroom is worth reading in the run that spends it. `lib/express`
 * mounts its limiter app-wide at a hundred requests a minute, and
 * each window is its own `createService`, so the three spend
 * fifty-one, forty-two and one request against three separate
 * budgets — the lowest `ratelimit-remaining` any row here saw was
 * forty-nine. A wave large enough to overrun one budget would
 * present as a `429` on whichever rows ran last, which reads as a
 * flaky containment claim rather than as a limit, and the repair is a
 * boot per channel rather than a wider window.
 *
 * THIRTY-ONE MUTATIONS COVER THESE HUNDRED AND FOURTEEN CASES,
 * and every figure below was re-measured at this commit rather
 * than carried. Each leg was run TWICE and the five whose two
 * passes disagreed were re-run three times more and taken by
 * majority — M3, M5, F3a, F9 and P13, four of whose disagreements
 * were the macOS supertest flake and one a suite-level red that
 * counts no case at all. Seven of the twenty-four legs the wave-2
 * revision recorded MOVED, and each moved for a reason the wave
 * explains.
 *
 * THE TWO SANITISER LEGS MOVED FURTHEST, from NINETEEN to
 * TWENTY-NINE, and where the ten came from is the finding this
 * revision carries. Adding `issue.keys` to a detail's message and
 * copying `issue.message` verbatim still redden the IDENTICAL set —
 * two legs, one reading — and it is now the twenty-two
 * unrecognized-key body rows plus SEVEN query rows: `DELETE
 * /domains/:slug`, which has always been there, and the six wave-3
 * reads that parse a `.strict()` query. So the query channel is on
 * the sanitiser's subject seven times over where it used to be
 * once, and a channel this file used to describe as reaching only
 * the transport now reaches the boundary parser on most of its read
 * rows.
 *
 * FOUR MORE MOVED BY EXACTLY THE ROWS OR CHANNELS WAVE 3 ADDED.
 * Logging `details` beside `{ code, cause }` in
 * `lib/errors/handler.ts` went THREE to FOUR, the third planted
 * detail joining the other two in a capture that should hold none
 * of them. A sink that records nothing went SIX to SEVEN and a
 * substitution answering its argument unchanged FIVE to SIX, each
 * gaining exactly one row — the planted query write for the first,
 * the fourth inert open-record row for the second. And not
 * mounting the planted route went EIGHT to NINE, which is the sixth
 * planted channel and nothing else.
 *
 * THE SEVENTH IS THE ONE NOBODY WOULD PREDICT: reading the
 * transport count as one site went ONE to TWO. `PINO_URL_SITES` is
 * now read by {@link PLANTED_TRANSPORT_TOTAL} as well as by the
 * query window's own case, so a leg that used to report on one
 * window reports on two — which is the coupling the planted row's
 * query bought, stated rather than discovered later.
 *
 * THE OTHER SEVENTEEN CARRIED-IN LEGS CAME BACK UNMOVED, which is
 * what says the recorded figures are still live rather than a
 * re-derivation into neighbours. Dropping the open-path collapse
 * and ignoring `options.openPaths` each redden the same THREE
 * masking rows, likewise one reading in two spellings, and both
 * stayed at three because the row wave 3 added to that channel is
 * the inert shape again. A domains handler rethrowing its refusal
 * with `req.body` interpolated reddens FIVE. Dropping the console
 * patch reddens TWO, restoring a stream with a bound copy ONE, a
 * fabricated route THREE, two open-record rows sharing a masked
 * path ONE, and each of {@link keyOf}'s two collapsed spellings
 * ONE.
 *
 * FIVE LEGS AIM AT THE SIXTH PLANTED CHANNEL, and no two redden
 * the same set. Dropping its LOG write reddens TWO — its own
 * channel row and the head-to-head — exactly as the console,
 * stderr and open-path log legs do. Dropping its DETAIL reddens
 * TWO, the channel row and the answered total, where the
 * open-path detail one over reddens THREE: that row is read by a
 * third case, the field-path one, and this one is not. Leaking a
 * CONSTANT query and sending NO query each redden TWO, both times
 * the two totals and neither channel row — the marker still lands
 * where the table says and only the counts that tie a marker to a
 * sentinel report it. And declaring the open-path row OFF the
 * request logger reddens ONE, the head-to-head alone, which is
 * what makes {@link PlantedLeak.viaRequestLogger} a claim rather
 * than a note.
 *
 * A QUERY ROW DROPPED FROM THE TABLE NOW REDDENS TWO DIFFERENT
 * CASES DEPENDING ON WHICH HALF IT CAME FROM, and the pair is the
 * cheapest reading of why the read half needed a route-set guard
 * of its own. Dropping a WRITE query row reddens the CHANNEL guard
 * and not the route-set one, because that route survives through
 * its body rows. Dropping a READ one reddens the route-set guard
 * instead, because a read route has no body rows to survive
 * through — so the two guards report on disjoint faults and
 * neither subsumes the other. A query row that submits no sentinel
 * reddens the sent-bytes guard ALONE, its forty-one response zeros
 * staying green along with a transport count derived from the same
 * URLs: forty-one rows go vacuous at once and one guard is the
 * whole of what reports it.
 *
 * THE HEAD-TO-HEAD CASE IS IN SIXTEEN OF THE THIRTY-ONE RED SETS,
 * more than any other case in the file. It held at eight across the
 * wave-2 rows, moved to eleven with the fifth planted channel and
 * to sixteen with the sixth: every leg that touches what the
 * process writes is reported by it. The one plant leg it does NOT
 * report is the open-record DETAIL, whose write never reaches the
 * capture at all.
 *
 * WHICH ROWS HAVE A LIVE SUBJECT AND WHICH REST ON THE CONTROLS.
 * Twenty-six of the fifty-one body rows are reddened by a module
 * leg above: the twenty-two unrecognized-key rows, the three
 * open-record rows whose record can refuse, and `POST /domains` in
 * the field-value channel under the echoing handler. The other
 * TWENTY-FIVE are reddened by no module leg at all, and that is
 * structural rather than a gap in the grid. Twenty-one are
 * field-value rows, where zod puts a submitted VALUE in no issue
 * path and no issue message, so they pin a channel closed UPSTREAM
 * of the sanitiser and their green says nothing about it. Four are
 * the inert open-record rows, which raise no issue whatever, so
 * there is no detail for a sanitiser change to reach — a second
 * shape of the same absence rather than a second omission. On the
 * query side the split is the other way round: SEVEN of the
 * forty-two rows are on the sanitiser's subject and thirty-five
 * reach the transport and stop. What all of them rest on is the
 * per-row sent-bytes control and the planted window, which is
 * exactly the difference between a zero nobody can read and a zero
 * measured with an instrument shown working in the same run. For
 * the inert rows the instrument is `detailFieldsOf` rather than
 * {@link countSentinel}, since what they assert is an EMPTY list,
 * and the fifth planted channel is the run in which that reader
 * answers a non-empty one.
 *
 * WHAT IS OUT OF REACH HERE is the driver channel, and it is out of
 * reach by construction rather than by omission. A `ConflictError`
 * built with `{ cause: <driver error> }` puts the pg `detail` (
 * `Key (slug)=(<the submitted value>) already exists.`) one property
 * read from `errorHandler`'s log line — but reaching it needs a
 * stored row to collide with, and the store here is empty on purpose.
 * `tests/live/api.live.test.ts` and
 * `tests/live/api-wave2.live.test.ts` are where a real driver error
 * exists at all.
 *
 * NOTHING IS WRITTEN, which is what lets one boot serve a whole
 * window. Every `:slug` and every `:id` names a row that does not
 * exist and every body is one the schema refuses or one whose address
 * does not resolve, so each window's requests answer `422` or `404`
 * and leave the dataset the boot built. The planted route is the
 * same: it reaches no store at all. The last case reads all three
 * stores directly rather than trusting any of that, and reads each of
 * them three ways — no domain, no settings row and no connector. The
 * third is the one wave 2 made necessary: `connectors` is the only
 * table on this surface hanging off no address, so a create the
 * schema accepted would leave a row nothing else here could see,
 * which is also why the open-record row for a connector `config` is a
 * `PATCH` rather than the `POST` that would have had nothing left to
 * refuse it.
 *
 * WAVE 3 NEEDED NO FOURTH READING, and the reason is structural
 * rather than lucky: not one of its four write routes can CREATE a
 * row. A verdict APPENDS to a finding, a patch REWRITES an entity,
 * and the two approvals STAMP columns on a row somebody else
 * queued — so a store holding no domain holds nothing any of them
 * could have reached, and the reads that were already here cover
 * them.
 *
 * NO AUTH BLOCK IS CONFIGURED, and the sixteen mounts still spell
 * `app.use(ctx.requireAuth, router)` exactly as `src/index.ts` does,
 * off {@link mountedRouters} — the one list the table guards read
 * as well, so the surface a guard compares against is the surface a
 * window booted.
 * With no block `createService` resolves `requireAuth` to
 * `passthroughMiddleware`, so every request here REACHES its handler,
 * which is what this file needs and what a local boot does. Whether
 * the guard is real and on the mount is `tests/api/wiring.test.ts`'s
 * subject and is asserted there.
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
import {
  buildConnectorsRouter,
} from '../../src/connectors/routes.js';
import { buildDocumentsRouter } from '../../src/documents/routes.js';
import { buildDomainsRouter } from '../../src/domains/index.js';
import { buildEntitiesRouter } from '../../src/entities/routes.js';
import { buildFindingsRouter } from '../../src/findings/routes.js';
import { buildPersonasRouter } from '../../src/personas/routes.js';
import { buildRunsRouter } from '../../src/runs/routes.js';
import { buildSpendRouter } from '../../src/runs/spend-routes.js';
import { buildSettingsRouter } from '../../src/settings/routes.js';
import {
  buildSourceFailuresRouter,
} from '../../src/sources/failures-routes.js';
import {
  buildSourceProposalsRouter,
} from '../../src/sources/proposals-routes.js';
import { buildSourcesRouter } from '../../src/sources/routes.js';
import {
  buildSubscriptionsRouter,
} from '../../src/subscriptions/routes.js';
import {
  buildCategoriesRouter,
} from '../../src/taxonomy/categories-routes.js';
import { buildTermsRouter } from '../../src/taxonomy/terms-routes.js';
import { buildTopicsRouter } from '../../src/topics/routes.js';
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
 * serve the field-value channel across every body-bearing route
 * rather than a different refusable value per schema.
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
 * The present the two schedule-verb routers answer against.
 *
 * A thunk rather than an instant, and named after the const
 * `src/index.ts` hands the same two routers, because that is what
 * is being mirrored: `TopicsRouterOptions.clock` and
 * `SubscriptionsRouterOptions.clock` are both REQUIRED, so neither
 * can be mounted here without saying which present its verbs write
 * against. No row below reads a due time — every `:id` names no
 * row — so what this has to be is present, not fixed.
 */
const clock = (): Date => new Date();

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
 * The verbs a WRITE route on this surface can carry.
 *
 * Read against what the mounted routers registered rather than
 * transcribed: {@link registeredWriteLabels} filters their own
 * stacks by this list, so a route added under a verb absent here
 * would leave the surface and this file's table disagreeing.
 */
const WRITE_METHODS = ['delete', 'patch', 'post', 'put'] as const;

/** One member of {@link WRITE_METHODS}. */
type WriteMethod = (typeof WRITE_METHODS)[number];

/**
 * The verbs a READ route on this surface can carry.
 *
 * One, and written as a list anyway so the two sides of every
 * classification here are spelled the same way. Wave 3 is the first
 * wave to put read routes in this file at all: its list routes
 * parse a `.strict()` query, so a query parameter has a subject on
 * them where on a write route that parses none it reaches the
 * transport and stops.
 */
const READ_METHODS = ['get'] as const;

/** One member of {@link READ_METHODS}. */
type ReadMethod = (typeof READ_METHODS)[number];

/** Either of the two, which is what a row's verb may be. */
type ProbeMethod = ReadMethod | WriteMethod;

/** One row of {@link BODY_PROBES} or {@link QUERY_PROBES}. */
interface EchoProbe {
  /** Which of the four positions this row submits the sentinel in. */
  readonly channel: EchoChannel;
  /** The verb, lowercased as supertest and `route.stack` spell it. */
  readonly method: ProbeMethod;
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
  /**
   * For an open-record row: whether the record's own value schema
   * can refuse BELOW the operator-chosen key.
   *
   * True where those values are constrained — a number, a
   * `.strict()` object — so a bad entry raises AT a path carrying
   * the key and the mask is the only thing between it and the
   * wire. False where the value schema is `z.unknown()`, which
   * refuses nothing at all, so no issue is reachable below the
   * prefix, the key is ACCEPTED, and the request is refused at its
   * address instead. Required on every open-record row and absent
   * on every other, both of which the table guard asserts.
   */
  readonly masksAPath?: boolean;
}

/**
 * Every row whose sentinel travels in a request BODY.
 *
 * Three channels over the twenty-two body-bearing write routes.
 * The FIELD-VALUE rows put the sentinel where a member is
 * declared: eighteen of them at a member no string can satisfy (a
 * slug pattern, a number, an enum, an object), and four at free
 * text the schema accepts, so those four reach the address check
 * with the value intact. The UNRECOGNIZED-KEY rows submit the
 * sentinel as the sole key of an object every one of these schemas
 * declares `.strict()`. The OPEN-RECORD rows cover all seven
 * declared open paths, in the two shapes the header separates: the
 * three that refuse below their own prefix answer a masked path,
 * and the four whose values are `z.unknown()` accept the key and
 * are refused at their address instead.
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
  // Two of the three rows where the SCHEMA accepts the sentinel:
  // `role` and `systemText` are free text with no pattern, so the
  // parse succeeds and the request is refused at its address
  // instead. That is the deepest a submitted value gets on this
  // surface without a row existing for it to collide with.
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

  // Wave 2. `intervalSeconds` is declared a number on both topic
  // bodies, so a string is refused at that member and the detail
  // names it without saying what was in it.
  {
    channel: 'field value',
    method: 'post',
    path: '/domains/:slug/topics',
    body: { name: 'Echo probe', intervalSeconds: SENTINEL },
  },
  {
    channel: 'field value',
    method: 'patch',
    path: '/topics/:id',
    body: { intervalSeconds: SENTINEL },
  },
  // The shortest body on the surface: `cycles` is its one member
  // and a number, so there is nothing else to supply valid for the
  // answer to be one detail.
  {
    channel: 'field value',
    method: 'post',
    path: '/topics/:id/pause',
    body: { cycles: SENTINEL },
  },
  // `kind` is an enum on both source bodies. `endpoint` is supplied
  // valid on the create so that `kind` is the only member refused.
  {
    channel: 'field value',
    method: 'post',
    path: '/domains/:slug/sources',
    body: { kind: SENTINEL, endpoint: 'https://echo.example/feed' },
  },
  {
    channel: 'field value',
    method: 'patch',
    path: '/sources/:id',
    body: { kind: SENTINEL },
  },
  {
    channel: 'field value',
    method: 'post',
    path: '/connectors',
    body: { kind: SENTINEL, name: 'Echo probe' },
  },
  // The third row where the SCHEMA accepts the sentinel, and the
  // only one wave 2 adds: a connector patch declares `name` and
  // `config` and nothing else, and `name` is free text with no
  // pattern. So this row reaches the address check with the value
  // intact, exactly as the two personas rows above do.
  {
    channel: 'field value',
    method: 'patch',
    path: '/connectors/:id',
    body: { name: SENTINEL },
  },
  // `format` is an enum; the other two required members are
  // supplied valid so that `format` is the only one refused.
  {
    channel: 'field value',
    method: 'post',
    path: '/domains/:slug/exports',
    body: { format: SENTINEL, connectorId: 1, intervalSeconds: 3600 },
  },
  {
    channel: 'field value',
    method: 'patch',
    path: '/exports/:id',
    body: { format: SENTINEL },
  },

  // Wave 3, and the fourth row on the surface where the SCHEMA
  // ACCEPTS the sentinel. `verdictBodySchema` declares `verdict` a
  // bare string, because what a legal verdict is comes off the
  // owning domain's row and is not knowable until one has been
  // read — so the parse succeeds, the finding is resolved, and the
  // ADDRESS is what refuses. Measured `404`, not the `422` a ladder
  // refusal would answer over a finding that existed, which is a
  // shape only `tests/live` can reach.
  {
    channel: 'field value',
    method: 'patch',
    path: '/findings/:id/verdict',
    body: { verdict: SENTINEL },
  },
  // `aliasOf` is the one member of an entity patch that refuses a
  // string: `name` is free text and `attributes` is an open record.
  {
    channel: 'field value',
    method: 'patch',
    path: '/entities/:id',
    body: { aliasOf: SENTINEL },
  },
  // The two approval bodies each declare ONE member and both are
  // numbers, so there is nothing else to supply valid for either
  // answer to be a single detail naming the member.
  {
    channel: 'field value',
    method: 'post',
    path: '/entities/:id/approve-research',
    body: { poolId: SENTINEL },
  },
  {
    channel: 'field value',
    method: 'post',
    path: '/sources/:id/approve-config',
    body: { proposalId: SENTINEL },
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

  // Wave 2, one row per body-bearing write route it adds. Several
  // answer more than one detail — a body that names no declared
  // member is also a body missing every required one — which is
  // the ordinary shape of this channel rather than anything about
  // these routes.
  {
    channel: 'unrecognized key',
    method: 'post',
    path: '/domains/:slug/topics',
    body: { [SENTINEL]: 1 },
  },
  {
    channel: 'unrecognized key',
    method: 'patch',
    path: '/topics/:id',
    body: { [SENTINEL]: 1 },
  },
  {
    channel: 'unrecognized key',
    method: 'post',
    path: '/topics/:id/pause',
    body: { [SENTINEL]: 1 },
  },
  {
    channel: 'unrecognized key',
    method: 'post',
    path: '/domains/:slug/sources',
    body: { [SENTINEL]: 1 },
  },
  {
    channel: 'unrecognized key',
    method: 'patch',
    path: '/sources/:id',
    body: { [SENTINEL]: 1 },
  },
  {
    channel: 'unrecognized key',
    method: 'post',
    path: '/connectors',
    body: { [SENTINEL]: 1 },
  },
  {
    channel: 'unrecognized key',
    method: 'patch',
    path: '/connectors/:id',
    body: { [SENTINEL]: 1 },
  },
  {
    channel: 'unrecognized key',
    method: 'post',
    path: '/domains/:slug/exports',
    body: { [SENTINEL]: 1 },
  },
  {
    channel: 'unrecognized key',
    method: 'patch',
    path: '/exports/:id',
    body: { [SENTINEL]: 1 },
  },

  // Wave 3, one row per body-bearing write route it adds. Three of
  // the four answer two details for the reason wave 2's rows
  // already do: a body naming no declared member is also a body
  // missing the one required member these schemas declare.
  {
    channel: 'unrecognized key',
    method: 'patch',
    path: '/findings/:id/verdict',
    body: { [SENTINEL]: 1 },
  },
  {
    channel: 'unrecognized key',
    method: 'patch',
    path: '/entities/:id',
    body: { [SENTINEL]: 1 },
  },
  {
    channel: 'unrecognized key',
    method: 'post',
    path: '/entities/:id/approve-research',
    body: { [SENTINEL]: 1 },
  },
  {
    channel: 'unrecognized key',
    method: 'post',
    path: '/sources/:id/approve-config',
    body: { [SENTINEL]: 1 },
  },

  // `settings.scoringWeights` is a record of numbers, so a string
  // entry fails at `settings.scoringWeights.<the sentinel>` and the
  // mask is the only thing between that path and the wire.
  {
    channel: 'open-record key',
    method: 'post',
    path: '/domains',
    masksAPath: true,
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
    masksAPath: true,
    body: {
      settings: { fieldContract: { [SENTINEL]: { type: 'not a type' } } },
    },
  },
  {
    channel: 'open-record key',
    method: 'put',
    path: '/settings',
    masksAPath: true,
    body: { notificationChannels: { [SENTINEL]: 'not a boolean' } },
  },

  // Wave 2 declares three more open paths and every one of them is
  // the OTHER shape: `parserConfig` and `contract` in
  // `src/sources/service.ts` and `config` in
  // `src/connectors/service.ts` are each
  // `z.record(z.string(), z.unknown())`, whose value schema refuses
  // nothing and whose keys are strings by construction. So no issue
  // is reachable strictly below the prefix, the operator key is
  // ACCEPTED, and each row is refused at its address with no detail
  // at all — which is deeper into the handler than any masking
  // row of this channel reaches. `masksAPath` is where each row
  // says which of the two it is.
  {
    channel: 'open-record key',
    method: 'post',
    path: '/domains/:slug/sources',
    masksAPath: false,
    body: {
      kind: 'url',
      endpoint: 'https://echo.example/feed',
      parserConfig: { [SENTINEL]: 'echo' },
    },
  },
  {
    channel: 'open-record key',
    method: 'patch',
    path: '/sources/:id',
    masksAPath: false,
    body: { contract: { [SENTINEL]: 'echo' } },
  },
  // A connector `config` is the one open record on the surface
  // whose column actually stores a secret, which is why it is here
  // at all. `PATCH` rather than `POST /connectors`, and the reason
  // is this file's own: a connector hangs off no address, so a
  // create carrying an accepted config has nothing left to refuse
  // it and would leave a row behind.
  {
    channel: 'open-record key',
    method: 'patch',
    path: '/connectors/:id',
    masksAPath: false,
    body: { config: { [SENTINEL]: 'echo' } },
  },
  // Wave 3 declares the seventh open path and it is the inert shape
  // again: `attributes` in `src/entities/service.ts` is a
  // `z.record(z.string(), z.unknown())` whose own TSDoc says so —
  // the prefix is declared against the day a value type is
  // narrowed, and until then nothing strictly below it can raise an
  // issue. So the operator key is ACCEPTED and the patch is refused
  // at its address, exactly as the three rows above are.
  {
    channel: 'open-record key',
    method: 'patch',
    path: '/entities/:id',
    masksAPath: false,
    body: { attributes: { [SENTINEL]: 'echo' } },
  },
] as const satisfies readonly EchoProbe[];

/**
 * Every row whose sentinel travels in a QUERY STRING.
 *
 * One row per write route, the ten that read no body included —
 * the eight `DELETE`s and the two `run-now` verbs, for which this
 * is the only channel that reaches them at all. The sentinel is
 * both the key and the value, which covers the two positions a
 * strict query schema can refuse in one request.
 *
 * AND ONE ROW PER WAVE-3 READ ROUTE, which is the half wave 3
 * added and the only place in this file where a read route appears.
 * A read route is here for the reason the write routes mostly are
 * not: six of the nine PARSE a `.strict()` query, so the sentinel
 * spelled as a key raises an `unrecognized_keys` issue whose own
 * zod message quotes it — the shortest path to a leak this file
 * knows, arriving on the query side rather than in a body. The
 * other three are the single gets, which parse no query at all and
 * answer about their address instead. Wave-1 and wave-2 read routes
 * are deliberately absent and the table guard says so by comparing
 * this half against the six wave-3 routers rather than against the
 * whole surface.
 *
 * `DELETE /domains/:slug` carries a second row because it is the
 * only WRITE route on the surface that parses a query at all
 * (`domainDeleteQuerySchema`, for `?cascade=confirm`): the extra
 * row puts the sentinel in the value of a DECLARED parameter, where
 * the refusal is an `invalid_value` naming `cascade` and zod's own
 * message for that issue lists the allowed options rather than the
 * rejected one. Every other write route here parses no query, so
 * its sentinel is ignored by the handler and reaches only the
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

  // Wave 2, one row per write route it adds — including the three
  // `DELETE`s and the two `run-now` verbs, which read no body and
  // for which this is the only channel with a subject at all.
  {
    channel: 'query parameter',
    method: 'post',
    path: '/domains/:slug/topics',
  },
  { channel: 'query parameter', method: 'patch', path: '/topics/:id' },
  { channel: 'query parameter', method: 'delete', path: '/topics/:id' },
  { channel: 'query parameter', method: 'post', path: '/topics/:id/run-now' },
  { channel: 'query parameter', method: 'post', path: '/topics/:id/pause' },
  {
    channel: 'query parameter',
    method: 'post',
    path: '/domains/:slug/sources',
  },
  { channel: 'query parameter', method: 'patch', path: '/sources/:id' },
  { channel: 'query parameter', method: 'delete', path: '/sources/:id' },
  { channel: 'query parameter', method: 'post', path: '/connectors' },
  { channel: 'query parameter', method: 'patch', path: '/connectors/:id' },
  { channel: 'query parameter', method: 'delete', path: '/connectors/:id' },
  {
    channel: 'query parameter',
    method: 'post',
    path: '/domains/:slug/exports',
  },
  { channel: 'query parameter', method: 'patch', path: '/exports/:id' },
  { channel: 'query parameter', method: 'delete', path: '/exports/:id' },
  {
    channel: 'query parameter',
    method: 'post',
    path: '/exports/:id/run-now',
  },

  // Wave 3's four write routes, on the terms every row above takes:
  // none of them parses a query, so the sentinel is ignored by the
  // handler and the request is refused for the body it did not
  // send.
  {
    channel: 'query parameter',
    method: 'patch',
    path: '/findings/:id/verdict',
  },
  { channel: 'query parameter', method: 'patch', path: '/entities/:id' },
  {
    channel: 'query parameter',
    method: 'post',
    path: '/entities/:id/approve-research',
  },
  {
    channel: 'query parameter',
    method: 'post',
    path: '/sources/:id/approve-config',
  },

  // Wave 3's nine reads, and the first read routes in this file.
  // Six parse a `.strict()` query and answer an
  // `unrecognized_keys` detail naming `query`; the three single
  // gets parse none and answer `404` about their address. Which is
  // which is asserted nowhere here on purpose — both are refusals
  // in the same envelope, and what these rows read is what came
  // back in it.
  {
    channel: 'query parameter',
    method: 'get',
    path: '/domains/:slug/findings',
  },
  { channel: 'query parameter', method: 'get', path: '/findings/:id' },
  {
    channel: 'query parameter',
    method: 'get',
    path: '/domains/:slug/documents',
  },
  { channel: 'query parameter', method: 'get', path: '/entities/:id' },
  {
    channel: 'query parameter',
    method: 'get',
    path: '/entities/:id/research',
  },
  { channel: 'query parameter', method: 'get', path: '/runs' },
  { channel: 'query parameter', method: 'get', path: '/runs/:id' },
  { channel: 'query parameter', method: 'get', path: '/spend/summary' },
  {
    channel: 'query parameter',
    method: 'get',
    path: '/sources/:id/pending-configs',
  },
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
 * Outside every path shape on the surface on purpose: no router
 * registers it, so the request below reaches the planted route
 * through the same sixteen `/` mounts every other row falls
 * through,
 * and the route-set guard above never sees it.
 */
const PLANTED_PATH = '/planted-leak-control';

/**
 * The open-record prefix the planted body puts its sentinel below.
 *
 * `parserConfig` is one of the three open paths wave 2 declared, so
 * the planted body is the shape those rows submit rather than a
 * body invented for the plant — which is what makes the leak below
 * a control on THEIR channel and not a fifth write that happens to
 * carry the needle.
 */
const PLANTED_OPEN_PREFIX = 'parserConfig';

/**
 * The field path a leaking handler would name, uncollapsed.
 *
 * What `openPaths` in `src/http/validation.ts` turns into
 * `parserConfig.*` before a detail reaches the wire, and therefore
 * exactly what the seven open-record rows assert never arrives.
 * The planted route answers it whole and logs it — which is the
 * channel the plant was missing after wave 2 declared three more
 * open paths, wave 3 having added a fourth of the same shape.
 */
const PLANTED_OPEN_PATH = `${PLANTED_OPEN_PREFIX}.${SENTINEL}`;

/**
 * The query string the planted row sends beside its body.
 *
 * The sentinel as a bare KEY with no value, so the URL carries it
 * exactly ONCE — which is the property the two planted totals rest
 * on, and which {@link DEFAULT_SENTINEL_QUERY} deliberately does
 * not have: every query row on the surface sends it twice, and a
 * plant doing the same would put two occurrences behind one marker.
 *
 * It is a query on a `POST` where the rows it controls are `GET`s,
 * and that is not a gap: what a handler reads is `req.query` and
 * what the transport records is `req.url`, neither of which is
 * reached differently by one verb than by the other.
 */
const PLANTED_QUERY = SENTINEL;

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
  /**
   * Whether this leak is written through `req.log`.
   *
   * Load-bearing rather than descriptive, because `pino-http`
   * hands a handler a CHILD logger with the request BOUND: every
   * record written through it repeats the serialised `req`, so a
   * write through this channel puts the request's own URL and
   * parsed query in the capture a second time on top of whatever
   * it leaked. {@link PLANTED_REQUEST_RECORDS} is where that is
   * counted, and it is the reason this window's marker total and
   * its sentinel total are two numbers.
   */
  readonly viaRequestLogger: boolean;
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
 * answer zero over the surface's own rows and are each caught
 * here.
 *
 * The six rows are not interchangeable — they are the six
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
 *
 * OPEN PATH is the row wave 2 made necessary, and it is the only
 * one whose leaked text is a field PATH. The seven open-record
 * rows assert two things this file could not otherwise read: that
 * a masked answer carries `<prefix>.*` and that an inert one
 * carries no detail at all — and both of those are satisfied by a
 * `detailFieldsOf` that had stopped finding fields. This row
 * answers {@link PLANTED_OPEN_PATH} through that same reader and
 * logs it through the per-request `pino-http` child, so the
 * channel's two claims each have an instrument shown working in
 * the same run.
 *
 * QUERY is the row wave 3 made necessary, and it is the only one
 * whose leaked bytes came out of the URL. Thirteen query rows
 * landed with that wave, nine of them on reads that parse what
 * they were sent, and nothing before this row had ever shown a
 * query-sourced byte reaching a response at all. It writes through
 * the same per-request child the row above does and answers
 * through a third detail's MESSAGE rather than its field, which is
 * what keeps the two rows' red sets disjoint.
 */
const PLANTED_LEAKS = [
  {
    channel: 'a console line',
    marker: 'planted-console-leak',
    captured: 1,
    answered: 0,
    viaRequestLogger: false,
  },
  {
    channel: 'a stderr write',
    marker: 'planted-stderr-leak',
    captured: 1,
    answered: 0,
    viaRequestLogger: false,
  },
  {
    channel: 'the message of the error it throws',
    marker: 'planted-message-leak',
    captured: 1,
    answered: 1,
    // `errorHandler` logs through the SERVICE logger and not
    // through the per-request child, so this record carries no
    // `req` and repeats nothing.
    viaRequestLogger: false,
  },
  {
    // Twice in the body: once in the detail's `field` and once in
    // its `message`, which is both halves of what a detail carries.
    channel: 'a detail of the error it throws',
    marker: 'planted-detail-leak',
    captured: 0,
    answered: 2,
    viaRequestLogger: false,
  },
  {
    // Once in each text, and through two different mechanisms: the
    // per-request `pino-http` child for the capture, a second
    // detail's `field` for the answer. The only row whose leaked
    // text is a PATH rather than a body.
    channel: 'an open-record path it answers and logs',
    marker: 'planted-open-path-leak',
    captured: 1,
    answered: 1,
    viaRequestLogger: true,
  },
  {
    // Once in each text again, through the same two mechanisms and
    // over a different SOURCE: what this row leaks came out of the
    // URL rather than out of the body, which is the channel the
    // wave-3 read rows added and the one nothing here could
    // otherwise show a leak of.
    channel: 'the query string it was sent',
    marker: 'planted-query-leak',
    captured: 1,
    answered: 1,
    viaRequestLogger: true,
  },
] as const satisfies readonly PlantedLeak[];

/** What the planted markers must answer over the capture. */
const PLANTED_CAPTURED_TOTAL = PLANTED_LEAKS
  .reduce((total, leak) => total + leak.captured, 0);

/** What they must answer over the planted response body. */
const PLANTED_ANSWERED_TOTAL = PLANTED_LEAKS
  .reduce((total, leak) => total + leak.answered, 0);

/**
 * The detail field the open-record leak answers.
 *
 * Its marker written immediately ahead of the path, exactly as
 * every other planted write is spelled, so one string carries one
 * marker and one sentinel and the two totals above stay
 * comparable. Read back through {@link detailFieldsOf} rather than
 * counted, which is what makes it a control on the reader the
 * seven open-record rows share.
 */
const PLANTED_OPEN_FIELD = `${PLANTED_LEAKS[4].marker} ${PLANTED_OPEN_PATH}`;

/**
 * The one row the planted window submits.
 *
 * An {@link EchoProbe} so it travels the same `captureProbes` path
 * every other row does — the same URL builder, the same sent-bytes
 * control and the same response map. It is deliberately absent
 * from {@link ALL_PROBES}, so no coverage guard reads it and the
 * route set stays exactly the mounted surface.
 *
 * Its channel is `open-record key`, and the body is the shape the
 * three inert wave-2 rows submit: the sentinel as the operator's
 * own key below a declared open prefix. That is what lets the
 * route below leak a PATH built from what was submitted rather
 * than one built from a constant. It carries the sentinel exactly
 * ONCE, which is the property the two planted totals rest on —
 * every leak writes one marker ahead of one occurrence, so a
 * marker count and a sentinel count are comparable.
 *
 * IT ALSO CARRIES A QUERY, which is the half wave 3 made
 * necessary. {@link PLANTED_QUERY} puts the sentinel in the URL
 * once, so the route below has a query-sourced byte to leak and
 * the read rows' response zeros have a control of their own. A row
 * declaring a query is not a query-channel row — {@link queryOf}
 * takes a declared one whatever the channel is — and the two leaks
 * are read apart by their markers rather than by the row.
 *
 * {@link EchoProbe.masksAPath} is absent rather than false: that
 * member says whether a SCHEMA can refuse below its own prefix,
 * and the planted route parses nothing at all. The table guard
 * that would ask reads {@link ALL_PROBES}, which this row is not
 * in.
 */
const PLANTED_PROBE = {
  channel: 'open-record key',
  method: 'post',
  path: PLANTED_PATH,
  note: 'planted leak',
  query: PLANTED_QUERY,
  body: { [PLANTED_OPEN_PREFIX]: { [SENTINEL]: 'echo' } },
} as const satisfies EchoProbe;

/**
 * How many records in the planted capture carry the request line.
 *
 * ONE FOR `pino-http`'S OWN `request completed`, plus one for each
 * planted write that goes through `req.log` — the child logger it
 * hands a handler has the request BOUND, so every record written
 * through that channel serialises `req` again. Measured: the two
 * `req.log.warn` calls below each write THREE occurrences of the
 * sentinel, one they leaked and two the bound request repeated.
 *
 * Which is a finding about the transport rather than about the
 * plant, and a sharper one than the query window's: a handler
 * logging anything at all about a request whose query carried a
 * secret writes that secret out once more PER LINE.
 */
const PLANTED_REQUEST_RECORDS = 1 + PLANTED_LEAKS
  .filter((leak) => leak.viaRequestLogger).length;

/**
 * What the planted row's URL puts in the capture on its own.
 *
 * UNMARKED, and the reason the planted window's marker total and
 * its sentinel total are no longer the same number.
 * `applyMiddleware` builds its `pino-http` with no `redact` option
 * and no serialiser of its own, so the raw `url` and the parsed
 * `query` object are written {@link PINO_URL_SITES} times in each
 * of {@link PLANTED_REQUEST_RECORDS} records — the same finding
 * the query window records, met one window over and derived by the
 * same arithmetic.
 *
 * Read off {@link urlFor} rather than rebuilt, so the number and
 * the address requested cannot drift apart.
 */
const PLANTED_TRANSPORT_TOTAL = countSentinel(urlFor(PLANTED_PROBE))
  * PINO_URL_SITES
  * PLANTED_REQUEST_RECORDS;

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
 * body channels each carry a row for the same body-bearing routes,
 * and the channel is the describe those cases sit in.
 * {@link keyOf} is what has to be unique file-wide.
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
 * the same routes: without it a window's response map would key
 * three rows to one entry, keep the last, and leave two cases
 * silently reading somebody else's answer.
 *
 * @param probe - The row.
 * @returns Its channel and its label.
 */
function keyOf(probe: EchoProbe): string {
  return `${probe.channel} ${labelOf(probe)}`;
}

/**
 * The query string a row submits, or undefined when it sends none.
 *
 * A DECLARED query wins whatever the row's channel is, and only a
 * query-channel row falls back to the default. That is what lets
 * the planted row below carry a query BESIDE its body: the plant
 * leaks both, and the two leaks are read as separate channels.
 * Every row in {@link ALL_PROBES} that declares one is a
 * query-channel row, so this reads exactly as it did before for
 * all of them.
 *
 * @param probe - The row.
 * @returns The query string without its `?`.
 */
function queryOf(probe: EchoProbe): string | undefined {
  if (probe.query !== undefined) return probe.query;
  if (probe.channel !== 'query parameter') return undefined;

  return DEFAULT_SENTINEL_QUERY;
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
 * Whether a verb registered by a router is a read.
 *
 * @param method - The verb as `route.stack` spells it.
 * @returns True when it is a member of {@link READ_METHODS}.
 */
function isReadMethod(method: string): boolean {
  return (READ_METHODS as readonly string[]).includes(method);
}

/**
 * Whether a route reads a request body at all.
 *
 * What the coverage guard branches on, and it reads the ROUTE
 * rather than the verb because three different shapes answer no.
 * Every `GET` and every `DELETE` on this surface carries no body.
 * And the two `run-now` verbs take no argument — `runTopicNow` and
 * `runSubscriptionNow` are handed a store, a clock and an id, so a
 * request that sent a body is answered exactly as one that did
 * not. None of the three has a field-value or an unrecognized-key
 * channel with a subject in it, because none parses an object for
 * a member or a stray key to sit in, and a row claiming either
 * would be a name for something that never happened.
 *
 * @param label - A route label, as {@link labelFor} spells it.
 * @returns True when the route parses a request body.
 */
function parsesABody(label: string): boolean {
  return !label.startsWith('DELETE ')
    && !label.startsWith('GET ')
    && !label.endsWith('/run-now');
}

/**
 * The six routers wave 3 mounted.
 *
 * Named apart from the other ten because the read half of the
 * table is scoped to exactly these: wave-1 and wave-2 read routes
 * carry no row here, so the guard over that half compares against
 * this list rather than against every `GET` the surface declares.
 *
 * @param store - The store to build them over.
 * @returns The six, in the order `src/index.ts` mounts them.
 */
function waveThreeRouters(store: MemoryResearchStore): Router[] {
  return [
    buildFindingsRouter({ store }),
    buildDocumentsRouter({ store }),
    buildEntitiesRouter({ store }),
    buildRunsRouter({ store }),
    buildSpendRouter({ store, clock }),
    buildSourceProposalsRouter({ store }),
  ];
}

/**
 * Every router `src/index.ts` mounts, in its order.
 *
 * ONE LIST, read by the window that boots a service and by the
 * guards that hold this table against the surface. Two lists is
 * what it used to be, and a router added to the mounts and not to
 * the guard's copy would have left the table claiming to cover a
 * surface it was not compared against.
 *
 * The source failures router is included even though it declares a
 * `get` and nothing else: leaving it out would make this a
 * hand-picked subset rather than a mirror, and its contributing no
 * write label is the read-only DLQ showing up here as an absence.
 *
 * @param store - The store to build them over.
 * @returns All sixteen routers.
 */
function mountedRouters(store: MemoryResearchStore): Router[] {
  return [
    buildDomainsRouter({ store }),
    buildCategoriesRouter({ store }),
    buildTermsRouter({ store }),
    buildPersonasRouter({ store }),
    buildSettingsRouter({ store }),
    buildTopicsRouter({ store, clock }),
    buildSourcesRouter({ store }),
    buildSourceFailuresRouter({ store }),
    buildConnectorsRouter({ store }),
    buildSubscriptionsRouter({ store, clock }),
    ...waveThreeRouters(store),
  ];
}

/**
 * The labels a set of routers register under one class of verb.
 *
 * Built over a store of its own rather than a booted service's: a
 * router factory registers its routes at construction and reads
 * nothing, so this answers the routers' own declaration.
 *
 * @param routers - The routers to walk.
 * @param keep - Which verbs to keep, {@link isWriteMethod} or
 *   {@link isReadMethod}.
 * @returns One label per matching verb-and-path.
 */
function registeredLabels(
  routers: readonly Router[],
  keep: (method: string) => boolean,
): string[] {
  return routers
    .flatMap(routesOf)
    .filter((route) => keep(route.method))
    .map((route) => labelFor(route.method, route.path));
}

/**
 * The labels of every WRITE route the mounted routers register.
 *
 * @returns Every registered write label, across all sixteen.
 */
function registeredWriteLabels(): string[] {
  return registeredLabels(
    mountedRouters(createMemoryResearchStore()),
    isWriteMethod,
  );
}

/**
 * The labels of every READ route they register.
 *
 * @returns Every registered read label, across all sixteen.
 */
function registeredReadLabels(): string[] {
  return registeredLabels(
    mountedRouters(createMemoryResearchStore()),
    isReadMethod,
  );
}

/**
 * The labels of every read route the SIX wave-3 routers register.
 *
 * @returns The read half of the surface this table covers.
 */
function waveThreeReadLabels(): string[] {
  return registeredLabels(
    waveThreeRouters(createMemoryResearchStore()),
    isReadMethod,
  );
}

/**
 * Mounts the route that deliberately leaks, on the app a window
 * was built over.
 *
 * Everything the mounted handlers are forbidden to do, done on
 * purpose and in one place. The submitted body is serialised once
 * and written out four times: to the console, to stderr, into the
 * message of the error this route throws and into that error's
 * first detail. A fifth write leaks the operator's own key as an
 * uncollapsed field PATH, into the request logger and into a
 * second detail. A sixth leaks the QUERY the request carried, into
 * the same logger and into a third detail's message — the channel
 * wave 3's read rows added, and the only one here whose leaked
 * bytes came out of the URL. `createService` registers
 * `errorHandler` LAST, so
 * the throw reaches the same handler every refusal on the surface
 * reaches and is answered in the same envelope — which is what makes
 * planted response a control on the readers the real rows use and
 * not only on the counter.
 *
 * Mounted AFTER the sixteen routers, exactly where a seventeenth
 * would go. No router matches {@link PLANTED_PATH}, so the request
 * falls through all sixteen `/` mounts to reach it.
 *
 * @param app - The application a window's `register` was handed.
 */
function plantLeakingRoute(app: Application): void {
  app.post(PLANTED_PATH, async (req) => {
    const submitted = JSON.stringify(req.body);

    // The query as the handler received it, not as the URL spelled
    // it: a route echoing a parameter it refused would reach for
    // this object, and it is the one a `.strict()` query schema
    // raises its `unrecognized_keys` issue about.
    const asked = JSON.stringify(req.query);

    // The operator-chosen key, read back out of the body the way a
    // handler building a field path would reach it — derived
    // rather than spelled, so a leg leaking a constant is reported
    // here as well as by the two totals.
    const record = (req.body as Record<string, unknown>)[
      PLANTED_OPEN_PREFIX
    ] ?? {};
    const openPath = Object.keys(record as Record<string, unknown>)
      .map((key) => `${PLANTED_OPEN_PREFIX}.${key}`)
      .join(' ');

    // Reaches the capture only through the five console patches:
    // under vitest the console does NOT route through
    // `process.stdout.write`, so this row is the one live control
    // those patches have.
    console.log(`${PLANTED_LEAKS[0].marker} ${submitted}`);

    // The second stream, which nothing on a healthy boot writes
    // to — so it is the one live control the stderr redirect has.
    process.stderr.write(`${PLANTED_LEAKS[1].marker} ${submitted}\n`);

    // The log half of the open-record channel. `req.log` is the
    // per-request child `pino-http` attaches, so this record goes
    // to the destination the framework's own records go to and is
    // captured by the stdout patch — which is the channel a
    // handler that logged a field path would actually use.
    req.log.warn(`${PLANTED_LEAKS[4].marker} ${openPath}`);

    // The log half of the query channel, through the same child.
    req.log.warn(`${PLANTED_LEAKS[5].marker} ${asked}`);

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
      {
        // The answer half of the open-record channel, and the
        // shape the collapse exists to prevent: the operator key
        // whole, where every masked row answers `<prefix>.*`. Its
        // message carries no sentinel, so this detail contributes
        // one marker and one occurrence like every other write.
        field: `${PLANTED_LEAKS[4].marker} ${openPath}`,
        message: 'an open-record path, answered uncollapsed',
      },
      {
        // The answer half of the query channel, and the one detail
        // here whose leak is in the MESSAGE alone: `field` names
        // the container the boundary parser would have named, so
        // this row's marker and its occurrence both sit where a
        // handler quoting a rejected parameter would put them.
        field: 'query',
        message: `${PLANTED_LEAKS[5].marker} ${asked}`,
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
  /** The store all sixteen routers were built over. */
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
        // The sixteen mounts of `src/index.ts`, in its order and
        // with its guard, off the one list the table guards read.
        // No `auth` block is configured, so `ctx.requireAuth` is
        // the passthrough and every request below reaches its
        // handler.
        for (const router of mountedRouters(store)) {
          app.use(ctx.requireAuth, router);
        }

        // Where a seventeenth router would be mounted. Absent for
        // both windows that assert a zero.
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
 * Assembled by the same function over the same sixteen mounts, with
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
 * The control that says this surface answered rather than
 * Express's own page: every row here is refused, and every refusal
 * on it is `AppError.toJSON()`, whose `code` is a string.
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

/** Those whose record can refuse below the operator key. */
const MASKING_OPEN_RECORD_PROBES: readonly EchoProbe[] = OPEN_RECORD_PROBES
  .filter((probe) => probe.masksAPath === true);

/** Those whose record cannot, so the key is accepted instead. */
const INERT_OPEN_RECORD_PROBES: readonly EchoProbe[] = OPEN_RECORD_PROBES
  .filter((probe) => probe.masksAPath === false);

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
  it('names every write route the surface mounts', () => {
    const declared = [...new Set(
      ALL_PROBES.filter((probe) => isWriteMethod(probe.method))
        .map(routeLabelOf),
    )];
    const registered = [...new Set(registeredWriteLabels())];

    // Both directions, and both matter. A write route added to any
    // of the sixteen routers and not to the table is a route whose
    // refusals nothing here reads; a row naming a route no router
    // registered asks for a path Express never matches, where the
    // zero is about a `404` page rather than about containment.
    expect([...declared].sort()).toStrictEqual([...registered].sort());
    // The anti-vacuity leg for the comparison itself: two empty
    // lists are equal, and sixteen routers that registered nothing
    // would make the whole file pass with no route in it.
    expect(registered.length).toBeGreaterThan(0);
  });

  it('names every wave-3 read route and no other read', () => {
    const declared = [...new Set(
      ALL_PROBES.filter((probe) => isReadMethod(probe.method))
        .map(routeLabelOf),
    )];
    const waveThree = [...new Set(waveThreeReadLabels())];

    // The read half is a deliberate SUBSET of the surface, which is
    // what makes this a different comparison from the one above
    // rather than the same one with a verb swapped. Wave 3 is the
    // wave whose read routes parse a strict query, so its nine are
    // in and the rest are out — and the guard is against the SIX
    // wave-3 routers, so a read route added to one of them without
    // a row reddens here.
    expect([...declared].sort()).toStrictEqual([...waveThree].sort());
    expect(waveThree.length).toBeGreaterThan(0);

    // And every one of them is a route the surface really mounts,
    // which the comparison above cannot say: the wave-3 routers are
    // a list this file keeps, where these labels come off all
    // sixteen. The surface's read set being strictly larger is what
    // says the subset is deliberate rather than the whole of it.
    const mounted = new Set(registeredReadLabels());

    for (const label of declared) expect(mounted.has(label)).toBe(true);

    expect(mounted.size).toBeGreaterThan(waveThree.length);
  });

  it('covers all four channels across those routes', () => {
    const channels = [...new Set(ALL_PROBES.map((probe) => probe.channel))];
    const labels = [...new Set(ALL_PROBES.map(routeLabelOf))];

    expect(channels.sort()).toStrictEqual([...ECHO_CHANNELS].sort());

    // Which channels reach which route is decided by whether the
    // route reads a body, and by nothing a reader has to hold in
    // their head. A route that reads none — every read route, every
    // `DELETE` and the two `run-now` verbs — has the query channel
    // as its only subject; every other route owes a row in each of
    // the three channels a body can carry. The open-record channel
    // is deliberately not in this rule — seven routes declare an
    // open path and the rest have none, which the open-record cases
    // assert directly.
    for (const label of labels) {
      const covering = ALL_PROBES
        .filter((probe) => routeLabelOf(probe) === label)
        .map((probe) => probe.channel);

      if (!parsesABody(label)) {
        expect([...new Set(covering)]).toStrictEqual(['query parameter']);
        continue;
      }

      expect(covering).toContain('field value');
      expect(covering).toContain('unrecognized key');
      expect(covering).toContain('query parameter');
    }

    // Both branches above have a subject, so neither rule is a
    // clause that never ran. A table holding only body-bearing
    // routes would satisfy every assertion in the loop.
    expect(labels.filter(parsesABody).length).toBeGreaterThan(0);
    expect(labels.filter((label) => !parsesABody(label)).length)
      .toBeGreaterThan(0);
  });

  it('says which shape each open-record row has', () => {
    // Declared per row rather than inferred from the answer, so a
    // record whose value schema is narrowed later — or widened to
    // `z.unknown()` — reddens the row it changed instead of
    // quietly moving into the other group's assertions.
    for (const probe of ALL_PROBES) {
      if (probe.channel === 'open-record key') {
        expect(typeof probe.masksAPath).toBe('boolean');
        continue;
      }

      expect(probe.masksAPath).toBeUndefined();
    }

    // And both shapes are present, which is what makes the split a
    // reading rather than a member every row happens to share.
    expect(MASKING_OPEN_RECORD_PROBES.length).toBeGreaterThan(0);
    expect(INERT_OPEN_RECORD_PROBES.length).toBeGreaterThan(0);
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
  for (const probe of MASKING_OPEN_RECORD_PROBES) {
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

  it('reaches a different open path in every masked row', () => {
    const fields = MASKING_OPEN_RECORD_PROBES
      .flatMap((probe) => detailFieldsOf(answerTo(
        openedWindow(bodyWindow),
        probe,
      )));

    // One detail per row, and no two rows landing on the same
    // masked path — which is what says these rows cover the
    // declared open paths that can refuse rather than one of them
    // several times. Derived from the answers, so a row copied and
    // left unedited fails here rather than reading as coverage.
    expect(fields.length).toBe(MASKING_OPEN_RECORD_PROBES.length);
    expect(new Set(fields).size).toBe(fields.length);
  });

  for (const probe of INERT_OPEN_RECORD_PROBES) {
    it(`${labelOf(probe)} takes the key and echoes none`, () => {
      const response = answerTo(openedWindow(bodyWindow), probe);

      expect(response.type).toBe('application/json');
      expect(isFailureEnvelope(response)).toBe(true);

      // The other shape, and the pair of assertions that says so
      // rather than describing it. NO detail at all: the value
      // schema is `z.unknown()` and a JSON key is always a string,
      // so nothing strictly below the prefix can raise an issue
      // and the mask has nothing to mask. And a `404`: the parse
      // ACCEPTED the operator key, carried it into the service,
      // and the address is what refused. A record narrowed later
      // reddens both.
      expect(detailFieldsOf(response)).toStrictEqual([]);
      expect(response.status).toBe(404);

      // Which makes this the deepest a submitted KEY travels on
      // the surface — past the boundary parser, into a service's
      // own input — and the zero is therefore about a value the
      // handler held rather than one the schema turned away.
      expect(countSentinel(response.text)).toBe(0);
    });
  }
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
    // Nothing on this surface takes a secret in a query string, so
    // this bounds the claim rather than breaking it.
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
  it('answers the sentinel where every other row answers none', () => {
    const window = openedWindow(plantedWindow);
    const response = answerTo(window, PLANTED_PROBE);

    // Read through the SAME two classifiers the ninety-three rows
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
    // same sixteen mounts, answers a known non-zero here and zero
    // there. A patch that had stopped capturing, or a counter that
    // had stopped matching, would answer zero in both.
    //
    // The capture holds MORE than the plant wrote, and by exactly
    // the transport's account of the one URL that carries a query.
    // That is the query window's own finding met one window over,
    // and writing it as a sum rather than as a number is what keeps
    // the two halves separable: a plant that stopped leaking still
    // leaves the transport term standing.
    const expected = PLANTED_CAPTURED_TOTAL + PLANTED_TRANSPORT_TOTAL;

    expect(PLANTED_CAPTURED_TOTAL).toBeGreaterThan(0);
    expect(PLANTED_TRANSPORT_TOTAL).toBeGreaterThan(0);
    expect(countSentinel(window.text)).toBe(expected);
    expect(countSentinel(openedWindow(bodyWindow).text)).toBe(0);

    // The markers count the LEAKS alone, which is what says the
    // difference above is the transport rather than a write nobody
    // declared.
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

      // Per channel rather than in total, because the six are the
      // six claims this file makes about where a leak can go and a
      // total is satisfied by any five of them.
      expect(countMarker(window.text, leak.marker)).toBe(leak.captured);
      expect(countMarker(response.text, leak.marker)).toBe(leak.answered);
    });
  }

  it('answers the open-record path a masked row would collapse', () => {
    const window = openedWindow(plantedWindow);
    const response = answerTo(window, PLANTED_PROBE);
    const fields = detailFieldsOf(response);

    // Read through the SAME reader the seven open-record rows are
    // read through. Their two assertions — a masked row's `.*` and
    // an inert row's empty list — are each satisfied by a
    // `detailFieldsOf` that had stopped finding fields at all, and
    // this is the run in which it is shown finding one.
    expect(fields).toContain(PLANTED_OPEN_FIELD);

    // And the shape the collapse in `src/http/validation.ts`
    // exists to prevent: the operator key whole, where every
    // masking row on the surface answers `<prefix>.*` instead. Read
    // off the ANSWER rather than off the constant, so a route that
    // masked what it leaked reddens here.
    expect(fields.filter((field) => field.includes('.*')))
      .toStrictEqual([]);
    expect(fields.filter((field) => countSentinel(field) > 0).length)
      .toBeGreaterThan(0);

    // The key it names is the one the request sent, which is what
    // separates a leak of submitted content from a leak of a
    // constant this file happens to also spell.
    expect(countSentinel(sentBytesOf(PLANTED_PROBE))).toBeGreaterThan(0);
    expect(PLANTED_OPEN_FIELD).toContain(SENTINEL);
  });

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

    // And both sides of the request-logger split are populated,
    // which is what makes {@link PLANTED_REQUEST_RECORDS} a count
    // over two groups rather than a member every row happens to
    // share. A plant written entirely through `req.log` would
    // multiply the transport term by its own size and read as a
    // transport that had grown.
    const viaChild = PLANTED_LEAKS.filter((leak) => leak.viaRequestLogger);

    expect(viaChild.length).toBeGreaterThan(0);
    expect(viaChild.length).toBeLessThan(PLANTED_LEAKS.length);
    expect(PLANTED_REQUEST_RECORDS).toBe(viaChild.length + 1);
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
      // Three readings cover the whole surface, and which three is
      // decided by what hangs off what. Every other table here
      // hangs off `domains.id` — categories, terms, personas,
      // topics, sources and export subscriptions alike — so a
      // store holding no domain can hold none of them. The
      // settings row is one piece of state no address hides
      // behind. `connectors` is the other and the one wave 2
      // added: it is deployment-level, so a create that had been
      // accepted would leave a row this file could not otherwise
      // see, which is exactly why the open-record row for a
      // connector config is a `PATCH`.
      //
      // Wave 3 adds no fourth reading and needs none: none of its
      // four write routes can create a row, so the first of the
      // three already covers every table they could reach.
      expect(await window.store.countDomains()).toBe(0);
      expect(await window.store.readSettings()).toBeNull();
      expect(await window.store.countConnectors({})).toBe(0);
    }
  });
});
