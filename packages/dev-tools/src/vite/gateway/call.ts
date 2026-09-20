/**
 * One `rafa` call: hand an argv ARRAY to an injected runner, and read
 * the NDJSON answer — or say, in one line, why there is none.
 *
 * Extracted from `./rafa.ts` rather than written there because that
 * file hit this package's 800-line cap with both halves in it (956
 * lines, measured), which is the same reason `../http.ts` sits beside
 * `../endpoint.ts`. The split is also the honest seam: everything
 * here is about a PROCESS and its output, and nothing here knows what
 * an issue is.
 *
 * The three names a reader meets in this directory, kept apart on
 * purpose:
 *
 * - {@link RafaRun} is the CONTRACT — an argv in, a finished process
 *   out. `./run.ts` is the implementation that ships.
 * - {@link runRafa} is one CALL made through that contract, decided:
 *   a runner that is absent, throws, cannot start the binary, exits
 *   non-zero, or prints something that is not rafa's NDJSON each
 *   answer a refusal rather than an exception.
 * - `./rafa.ts` builds the argv and reads the `data` this answers.
 *
 * ## What `--output=json` actually is
 *
 * NDJSON, not JSON: one `{"type":"start",...}` event, then one
 * `{"type":"result","ok":...,"data":{...}}` event, measured live at
 * plan time against `rafa issue list --limit=1 --output=json` and
 * recorded verbatim in the close-out notes. {@link runRafa} answers
 * the LAST result event's `data`, still unvalidated — what a `data`
 * is allowed to contain belongs to the caller that asked for it.
 *
 * A line that is not a JSON OBJECT refuses the whole output rather
 * than being skipped. The point of the check is to notice a rafa
 * whose `--output=json` stopped meaning what it meant, and skipping
 * would let that pass as "no result event" or, worse, as a list that
 * silently lost members.
 *
 * ## Why nothing here throws, and what a reason may carry
 *
 * `../gateway.ts` fixes the first: the local write has already
 * succeeded by the time a gateway runs, so a tracker that is missing,
 * unauthenticated or refusing leaves the report on disk and the
 * endpoint answers `stored` with the refusal beside it. A throw would
 * instead reach `../endpoint.ts`'s `withoutThrowing` and be reported
 * as a gateway that threw, which says nothing a person can act on.
 *
 * A reason carries exactly two things: a FIXED label for the
 * subcommand, passed in by the caller rather than rendered from the
 * argv, and rafa's own stderr line or error text. So a title, a body
 * or a search phrase — all of them request-chosen — cannot reach a
 * browser through a refusal. `firstLine` is what makes the second
 * safe: control characters become spaces, whitespace runs collapse,
 * one line survives, and it is capped at {@link REASON_TEXT_MAX}
 * characters.
 *
 * ## Mutation note — what the colocated cases actually catch
 *
 * A green suite is not evidence a case can fail. Each leg below was
 * measured by breaking this file, running `bun x vitest run
 * src/vite/gateway/call.test.ts src/vite/gateway/rafa.test.ts` from
 * `packages/dev-tools`, and restoring it byte-identical (checksums
 * compared before and after, both `OK`).
 * Every count below was read when those two files held 49 cases. They
 * now hold 50 — `./rafa.test.ts` gained the case that proves
 * `./run.ts` is the bound default — and the directory's own total is
 * 59 with `./run.test.ts` beside them. So a rerun prints one more
 * PASSING case per leg than the figures below, which two re-measured
 * controls confirm: the `errno` leg is restated at its new reading,
 * and `./rafa.ts`'s `--type=bug` leg answered `9 failed | 41 passed
 * (50)` against the `9 failed | 40 passed (49)` recorded there. What
 * each leg is evidence of is the NAMES that fall, not the totals.
 *
 * - Skipping a line that is not a JSON object rather than refusing
 *   the output answers `Tests 3 failed | 46 passed (49)` — `refuses
 *   output that is not NDJSON`, `refuses a JSON line that is not an
 *   object`, and the gateway-level case of the same name.
 * - Treating a result event whose `ok` is not `true` as a success
 *   answers `4 failed | 45 passed`: the three error-text cases plus
 *   the gateway-level one. `refuses without an error text when the
 *   shape is other` falls with them, which is the point — it reads
 *   the same rule through a third `error` spelling rather than
 *   carrying a rule of its own.
 * - Ignoring a runner's `errno` answers `3 failed | 47 passed (50)`,
 *   re-measured after the default landed — `refuses a binary that
 *   could not be started`, the gateway's `refuses when the binary is
 *   missing, after one call`, and now also its `runs through the
 *   shipped runner when no run is stated`, which reads a REAL
 *   `ENOENT` off `execFile` through this same branch. It was `2
 *   failed | 47 passed (49)` before that case existed.
 * - Ignoring a non-zero exit code answers `7 failed | 42 passed`,
 *   the widest leg here: every reason-shaping case reaches
 *   {@link firstLine} through the exit-code branch, so the
 *   control-character and cap cases fall with it. They are pinned
 *   independently by the two legs below, which is why this one's
 *   breadth is not evidence about them.
 * - Leaving control characters in a reason answers `1 failed | 48
 *   passed` — `strips control characters out of a stderr line`.
 * - Dropping the {@link REASON_TEXT_MAX} cap answers `1 failed | 48
 *   passed` — `caps a stderr line at the reason length`. Its
 *   at-the-limit half survives, so the control is what carries the
 *   boundary rather than the refusal alone.
 *
 * One thing no leg here pins: that the real `rafa` prints what these
 * cases feed in. Nothing in this directory spawns the binary, by
 * design, so the NDJSON fixtures are a reading of the close-out
 * notes' live capture and not of a call made by a test.
 */

import type { ReportGatewayRefusal } from '../gateway';

import { z } from 'zod';

/**
 * The reason a gateway built without a runner gives.
 *
 * Reachable two ways now that `./run.ts` is `./rafa.ts`'s default:
 * through `runRafa` called with no runner, as the cases below do, and
 * through `rafaGateway({ run: undefined })`, which states the key and
 * so opts OUT of that default. A gateway without a runner refuses
 * every call rather than pretending to have filed something.
 */
export const NO_RUNNER_REASON
  = 'This rafa gateway has no command runner configured, so nothing '
  + 'was run.';

/** How much of rafa's own output a reason may carry. */
export const REASON_TEXT_MAX = 300;

/** What a truncated reason ends with. */
const REASON_ELLIPSIS = '...';

/**
 * Every control character, C0 and C1 alike.
 *
 * Spelled as a Unicode property escape rather than as a range of
 * six-character escapes, because this repository's control-byte law
 * is about what reaches a FILE and such an escape written into a tool
 * call has been seen to arrive on disk as the byte it names.
 */
const CONTROL_CHARACTERS = /\p{Cc}/gu;

/** Any run of whitespace, collapsed to one space in a reason. */
const WHITESPACE_RUN = /\s+/g;

/** How NDJSON separates its events, on either line ending. */
const EVENT_SEPARATOR = /\r?\n/;

/** The `type` of the event every call reads its answer from. */
const RESULT_EVENT_TYPE = 'result';

/** What one NDJSON event carries. */
const rafaEventSchema = z.object({
  type: z.string(),
  ok: z.boolean().optional(),
  data: z.unknown().optional(),
  error: z.unknown().optional(),
});

/**
 * The two shapes rafa's own error text may take.
 *
 * Neither was read live — the baseline stage filed nothing, so no
 * call was made that could refuse — so both are accepted and anything
 * else falls back to a fixed sentence rather than refusing to report
 * the refusal.
 */
const rafaErrorSchema = z.union([
  z.string(),
  z.object({ message: z.string() }),
]);

/**
 * What an injected runner answers.
 *
 * The four things a finished process has, and no interpretation of
 * them: deciding what a non-zero {@link RafaRunResult.code} or a set
 * {@link RafaRunResult.errno} MEANS is {@link runRafa}'s job, so a
 * runner stays a thin wrapper over whatever spawns the binary.
 */
export interface RafaRunResult {
  /**
   * The exit status, or `null` when the process was killed or never
   * started — which is where a timeout lands.
   */
  readonly code: number | null;

  /** Everything the process wrote to stdout. */
  readonly stdout: string;

  /** Everything it wrote to stderr. */
  readonly stderr: string;

  /**
   * The errno code when the process could not be STARTED, `null`
   * otherwise.
   *
   * `'ENOENT'` is the one an operator meets first, a missing `rafa`
   * being the ordinary case; any other code is reported the same
   * way, verbatim.
   *
   * `./run.ts` also reports one code that is NOT a spawn failure
   * here — `'ERR_CHILD_PROCESS_STDIO_MAXBUFFER'`, a process aborted
   * for printing past its cap — because a loud code beats a vague
   * "did not exit normally". So {@link interpret}'s "could not be
   * started" reads slightly wide on that one row, which that file's
   * header states rather than hides.
   */
  readonly errno: string | null;
}

/**
 * How this gateway runs a command.
 *
 * One argument, an argv ARRAY whose first element is the binary. Not
 * `(bin, args)`, so that a case asserting "the exact argv of every
 * call" reads one value and cannot miss a flag that leaked into the
 * wrong half. No `shell` option exists to pass, which is spec
 * decision 6 made unreachable rather than merely unused.
 */
export type RafaRun = (argv: readonly string[]) => Promise<RafaRunResult>;

/** A call that reached a successful result event. */
export interface RafaCallRead {
  /** Always `true`; the discriminant. */
  readonly ok: true;

  /** The result event's `data`, still unvalidated. */
  readonly data: unknown;
}

/** A call that did not, and the refusal to answer with. */
export interface RafaCallRefused {
  /** Always `false`; the discriminant. */
  readonly ok: false;

  /** The refusal, ready to be answered as-is. */
  readonly refusal: ReportGatewayRefusal;
}

/**
 * What {@link runRafa} answers.
 *
 * The discriminated shape `../report.ts`, `../origin.ts` and
 * `../store.ts` all answer in, because a caller reads them in a row.
 */
export type RafaCall = RafaCallRead | RafaCallRefused;

/** A runner that answered, or the reason it did not. */
type RafaAttempt =
  | { readonly ok: true; readonly result: RafaRunResult }
  | { readonly ok: false; readonly reason: string };

/**
 * Build a refusal.
 *
 * Shared with `./rafa.ts`, which refuses on its own account for
 * things no process is run for — a blank search query, an unusable
 * issue id.
 *
 * @param reason - One line, already collapsed and capped.
 * @returns The frozen refusal.
 */
export function refuse(reason: string): ReportGatewayRefusal {
  return Object.freeze({ status: 'refused' as const, reason });
}

/**
 * Build a refused {@link RafaCall}.
 *
 * @param reason - One line, already collapsed and capped.
 * @returns The frozen call answer.
 */
function refuseCall(reason: string): RafaCallRefused {
  return Object.freeze({ ok: false as const, refusal: refuse(reason) });
}

/**
 * Reduce arbitrary process output to one safe line.
 *
 * Control characters become spaces rather than being escaped: a
 * reason reaches a browser as JSON, and an ESC would rewrite a
 * terminal that printed it.
 *
 * @param text - stderr, or rafa's own error text.
 * @returns The line, capped, or `''` when there was nothing to say.
 */
function firstLine(text: string): string {
  const line = text
    .split(EVENT_SEPARATOR)
    .map((entry) => entry
      .replace(CONTROL_CHARACTERS, ' ')
      .replace(WHITESPACE_RUN, ' ')
      .trim())
    .find((entry) => entry !== '');

  if (line === undefined) {
    return '';
  }

  return line.length > REASON_TEXT_MAX
    ? `${line.slice(0, REASON_TEXT_MAX)}${REASON_ELLIPSIS}`
    : line;
}

/**
 * Parse one NDJSON line, answering `null` rather than throwing.
 *
 * @param line - One trimmed line of stdout.
 * @returns The parsed value, or `null` when it is not JSON at all.
 */
function readJson(line: string): unknown {
  try {
    return JSON.parse(line) as unknown;
  } catch {
    return null;
  }
}

/**
 * Read rafa's own error text off a refusing result event.
 *
 * @param error - The event's `error`, unvalidated.
 * @returns One safe line, or `''`.
 */
function readErrorText(error: unknown): string {
  const parsed = rafaErrorSchema.safeParse(error);

  if (!parsed.success) {
    return '';
  }

  return firstLine(
    typeof parsed.data === 'string'
      ? parsed.data
      : parsed.data.message,
  );
}

/**
 * Read a finished process's stdout as rafa's NDJSON answer.
 *
 * @param stdout - Everything the process printed.
 * @param label - What a refusal calls the subcommand.
 * @returns The result event's data, or a refusal.
 */
function readEvents(stdout: string, label: string): RafaCall {
  const lines = stdout
    .split(EVENT_SEPARATOR)
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '');

  if (lines.length === 0) {
    return refuseCall(`${label} answered no output.`);
  }

  const parsed = lines.map(
    (line) => rafaEventSchema.safeParse(readJson(line)),
  );
  const events = parsed.flatMap((entry) => (entry.success
    ? [entry.data]
    : []));

  if (events.length !== lines.length) {
    return refuseCall(`${label} answered output that is not NDJSON.`);
  }

  const last = events
    .filter((event) => event.type === RESULT_EVENT_TYPE)
    .at(-1);

  if (last === undefined) {
    return refuseCall(`${label} answered no result event.`);
  }

  if (last.ok !== true) {
    const text = readErrorText(last.error);
    const reason = text === ''
      ? `${label} refused this call.`
      : `${label} refused this call: ${text}`;

    return refuseCall(reason);
  }

  return Object.freeze({ ok: true as const, data: last.data });
}

/**
 * Call the runner without letting it throw.
 *
 * A runner is injected, so it is not necessarily `./run.ts`: one that
 * rejects — `execFile`'s own error is a rejection — must still leave
 * the gateway answering rather than throwing.
 *
 * @param run - The configured runner.
 * @param argv - What to run.
 * @param label - What a refusal calls the subcommand.
 * @returns The result, or the reason there is none.
 */
async function attemptRun(
  run: RafaRun,
  argv: readonly string[],
  label: string,
): Promise<RafaAttempt> {
  try {
    return { ok: true as const, result: await run(argv) };
  } catch (cause) {
    const text = firstLine(
      cause instanceof Error
        ? cause.message
        : String(cause),
    );
    const reason = text === ''
      ? `${label} could not be run.`
      : `${label} could not be run: ${text}`;

    return { ok: false as const, reason };
  }
}

/**
 * Decide what a finished process means.
 *
 * @param result - What the runner answered.
 * @param label - What a refusal calls the subcommand.
 * @returns The result event's data, or a refusal.
 */
function interpret(result: RafaRunResult, label: string): RafaCall {
  if (result.errno !== null && result.errno !== undefined) {
    return refuseCall(
      `${label} could not be started (${firstLine(result.errno)}).`,
    );
  }

  if (result.code !== 0) {
    const status = result.code === null
      ? 'did not exit normally'
      : `exited ${String(result.code)}`;
    const text = firstLine(result.stderr);
    const reason = text === ''
      ? `${label} ${status}.`
      : `${label} ${status}: ${text}`;

    return refuseCall(reason);
  }

  return readEvents(result.stdout, label);
}

/**
 * Make one rafa call and read its answer.
 *
 * The five refusals, in the order they are reached: no runner
 * configured, a runner that threw, a binary that could not be
 * started, a non-zero exit, and output that is not rafa's NDJSON —
 * the last covering both a malformed line and a result event whose
 * `ok` is not `true`.
 *
 * @param run - The configured runner, or `undefined`.
 * @param argv - The command, binary first, one element per flag.
 * @param label - What a refusal calls the subcommand. A FIXED string
 * per subcommand, never a rendering of {@link argv}: see this
 * module's header for why that matters.
 * @returns The result event's `data`, or a refusal.
 */
export async function runRafa(
  run: RafaRun | undefined,
  argv: readonly string[],
  label: string,
): Promise<RafaCall> {
  if (run === undefined) {
    return refuseCall(NO_RUNNER_REASON);
  }

  const attempt = await attemptRun(run, argv, label);

  return attempt.ok
    ? interpret(attempt.result, label)
    : refuseCall(attempt.reason);
}
