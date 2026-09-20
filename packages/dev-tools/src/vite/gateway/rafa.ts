/**
 * `ReportGateway` over the `rafa` binary — the one implementation this
 * package ships, and the only place a stored report leaves the
 * machine.
 *
 * Spec decision 6 is literal: the gateway runs `rafa` with an argv
 * ARRAY, never a shell string, and `gh` is never called directly.
 * Nothing here builds a command line and no `shell` option exists to
 * set; every flag is ONE element in its `--flag=value` form, so a
 * title, a body or a search phrase holding spaces stays one argument
 * whatever sits downstream. The three shapes, exactly as built below:
 *
 * ```text
 * <bin> issue list   --type=bug --search=<words> --output=json
 * <bin> issue create --title=[fb/<round>] <title> --body=<body>
 *                    --type=bug --module=<module> [--priority=<p>]
 *                    --output=json
 * <bin> issue comment <id> --body=<markdown> --output=json
 * ```
 *
 * Running one of those and reading the NDJSON back is `./call.ts`;
 * this file decides what goes IN an argv and what an answer means.
 *
 * ## Why the round tag and the attachment paths are applied HERE
 *
 * `rafa issue create` carries NO label flag — read from its `--help`
 * at plan time and recorded in the close-out notes — so spec decision
 * 8 puts the round in the title instead: `[fb/<round>] <title>`. The
 * browser can apply neither that nor the attachment list: it has no
 * authority over the round, and the paths do not exist until
 * `../store.ts` has written the files. Both therefore land in
 * {@link rafaGateway}'s `file`, which runs AFTER the local write and
 * is handed a {@link DevToolsStoredReport} carrying `round` and
 * `attachmentPaths`. The attachment PATHS travel; the attachment
 * BYTES never do, which is this plan's law and the reason
 * {@link ATTACHMENTS_NOTE} says so in words a triager reads.
 *
 * ## Which field names were measured, and which were not
 *
 * The `issue list` answer was read live at plan time: its result data
 * is `{tracker:{kind,...}, query:{...}, issues:[...]}`, and an issue
 * carries `title` plus a nested `ref:{opt,kind,externalId,url,
 * module}`. So the identifiers are `data.tracker.kind`,
 * `data.issues[].ref.externalId` (a STRING, `"103"` on the github
 * tracker) and `data.issues[].ref.url`. A parser reading `id` off an
 * issue finds nothing and reports every hit as unusable — which is
 * why {@link readIssue} reads the ref, and why `search` refuses when
 * every hit is unusable rather than answering an empty list.
 *
 * The create and comment envelopes were NOT measured: the baseline
 * stage filed nothing and commented on nothing, deliberately, the
 * tracker being a real GitHub repository. The plan's Description
 * states the create one — "a create answers a result event whose data
 * holds the tracker and the ref" — and {@link rafaCreateDataSchema}
 * encodes it. The comment one is stated nowhere, so `comment` does
 * not depend on reading an id back: it answers the id it was GIVEN.
 * Definition-of-done 1 files real issues, and is where both stop
 * being readings from a document.
 *
 * ## Every method answers; none throws
 *
 * `../gateway.ts` fixes this and `./call.ts` carries most of it: the
 * local write has already succeeded when a gateway runs, so a tracker
 * that is missing, unauthenticated or refusing leaves the report on
 * disk and the endpoint answers `stored` with the refusal beside it.
 * The refusals this file raises on its own account are of two kinds:
 * two it answers before running anything at all — a blank search
 * query, which would match every open issue, and an issue id that is
 * blank or opens with a dash — and three about what an answer MEANS:
 * a list it cannot read, a list whose every hit is unusable, and a
 * create that named no identifier.
 *
 * ## The runner is injected, and the default is `./run.ts`
 *
 * `rafaGateway()` runs through `./run.ts`'s `rafaRun` — `execFile`
 * with no shell, a timeout and a captured stderr — so a consumer
 * names no runner to file for real, which is what
 * `packages/web/vite.config.ts` does.
 *
 * The binding reads the KEY rather than the value: `'run' in options`.
 * With `??` a stated `undefined` would silently become the real
 * runner, and the cases that read `NO_RUNNER_REASON` would spawn
 * `rafa` and reach the real tracker from a unit test. So
 * `rafaGateway({ run: undefined })` is the documented way to build a
 * gateway that runs NOTHING, and it is how the two no-runner cases in
 * `./rafa.test.ts` stay honest. A gateway whose `bin` cannot exist is
 * how the same file proves the default IS bound: the refusal names
 * `ENOENT` rather than the missing runner.
 *
 * ## Mutation note — what the colocated cases actually catch
 *
 * A green suite is not evidence a case can fail. Each leg below was
 * measured by breaking this file, running `bun x vitest run
 * src/vite/gateway/call.test.ts src/vite/gateway/rafa.test.ts` from
 * `packages/dev-tools`, and restoring it byte-identical (checksums
 * compared before and after, both `OK`).
 * Every count below was read when this file's cases and
 * `./call.test.ts`'s came to 49. They now come to 50, the extra being
 * the default-runner case at the end, and the directory's total is 59
 * with `./run.test.ts` beside them — so a rerun prints one more
 * PASSING case per leg. The first leg was re-measured to confirm that
 * arithmetic: `9 failed | 41 passed (50)`, the same nine names as the
 * `9 failed | 40 passed (49)` it recorded before.
 *
 * - Dropping `--type=bug` from the LIST argv answers `Tests 9 failed
 *   | 40 passed (49)`. Nine, because every case that reaches a
 *   search asserts the list argv WHOLE — including the four
 *   process-level refusals, which assert it as the one call that
 *   ran. That is the shape a whole-argv assertion is for.
 * - Building the create title without the `[fb/<round>]` prefix
 *   answers `3 failed | 46 passed`: `prefixes the title with the
 *   round and files on github`, `files with the configured module
 *   and priority`, and `keeps a title holding spaces as ONE argv
 *   element`.
 * - Appending the attachment section unconditionally answers `3
 *   failed | 46 passed`, the middle one being `leaves a body without
 *   attachments untouched` — the control that carries this rule.
 * - Emitting `--priority=` when none is configured answers `1 failed
 *   | 48 passed`. ONE, not two: `files with the configured module
 *   and priority` emits `--priority=high` either way, so it is a
 *   control over the flag's SPELLING and not over its absence.
 * - Skipping unusable issues silently rather than refusing answers
 *   `1 failed | 48 passed` — `refuses a list whose issues carry no
 *   identifier`, which is the case that exists because that failure
 *   is otherwise silent.
 * - Reading `id` off an issue instead of `ref.externalId` answers `2
 *   failed | 47 passed` — the duplicate case and the search-matches
 *   case. Only two, because every other case lists NO issues; the
 *   plan's warning about this field is carried by those two alone.
 * - Letting `file` create after a search that refused answers `4
 *   failed | 45 passed` — exactly the four refusal cases, each of
 *   which asserts that the list argv was the ONLY call.
 * - Accepting a dash-leading issue id answers `1 failed | 48 passed`
 *   — `refuses an issue id beginning with a dash`.
 * - Dropping the default runner — `const run = options.run` — answers
 *   `1 failed | 49 passed (50)`: `runs through the shipped runner when
 *   no run is stated`, which reads `Expected: "ENOENT" / Received:
 *   "This rafa gateway has no command runner configured..."`. Measured
 *   after the binding landed, so it is the one leg here read at 50.
 *
 * One leg is deliberately NOT measured: binding the default with `??`
 * instead of `'run' in options`. It would make `rafaGateway({run:
 * undefined})` run the real binary, so the two no-runner cases would
 * reach the real tracker and one of them calls `file` — the mutation
 * is an issue filed on a live GitHub repository, not a red test. The
 * key-not-value binding is therefore carried by the two cases that
 * state `run: undefined` plus this note, and by no measured leg.
 */

import type {
  RafaCall,
  RafaRun,
} from './call';
import type {
  ReportGateway,
  ReportGatewayCommentOutcome,
  ReportGatewayFileOutcome,
  ReportGatewayFiled,
  ReportGatewayIssue,
  ReportGatewaySearchOutcome,
} from '../gateway';
import type { DevToolsStoredReport } from '../store';

import { z } from 'zod';

import { refuse, runRafa } from './call';
import { rafaRun } from './run';

/**
 * What this gateway answers to, and what `GET /__devtools/status`
 * reports as its `gateway`.
 *
 * Not `'none'`, which is the literal that route uses for "no gateway
 * configured" — `../endpoint.ts` would otherwise say configured and
 * absent at once.
 */
export const RAFA_GATEWAY_NAME = 'rafa';

/** The binary a gateway runs when its options name none. */
const RAFA_DEFAULT_BIN = 'rafa';

/**
 * The tracker module every widget report is filed under.
 *
 * The operator decision the plan records: reports file under
 * `--module=web` with no priority, rafa then labelling them
 * `module:web` and `needs-triage`, and urgency being decided by the
 * plan that reads the round rather than by the person reporting.
 */
const RAFA_DEFAULT_MODULE = 'web';

/** The issue type every call names — spec decision 8's `bug`. */
const RAFA_ISSUE_TYPE = 'bug';

/** The output format every call asks for. */
const RAFA_OUTPUT_FLAG = '--output=json';

/**
 * What a refusal calls each subcommand.
 *
 * Fixed strings rather than a rendering of the argv, so no
 * request-chosen value can reach a reason. `./call.ts`'s header has
 * the whole of that rule.
 */
const RAFA_LIST_LABEL = 'rafa issue list';

/** @see {@link RAFA_LIST_LABEL} */
const RAFA_CREATE_LABEL = 'rafa issue create';

/** @see {@link RAFA_LIST_LABEL} */
const RAFA_COMMENT_LABEL = 'rafa issue comment';

/** The tracker a filed outcome names when the answer named none. */
const RAFA_UNKNOWN_TRACKER = 'unknown';

/** The heading the stored attachment paths are listed under. */
const ATTACHMENTS_HEADING = '## Attachments';

/** The line under it, which says why there is no file to click. */
const ATTACHMENTS_NOTE
  = 'Captured on the reporting machine and stored there. The files '
  + 'themselves were not uploaded.';

/** The reason a blank search query gives. */
const BLANK_QUERY_REASON
  = 'A tracker search needs something to search for; an empty query '
  + 'would match every open issue.';

/**
 * The reason an unusable issue id gives.
 *
 * `../comment.ts` already refuses a leading dash on the route, and
 * says an implementation "never has to defend against one". This is
 * the belt over that brace, in the shape `../endpoint.ts` uses for
 * its own: the id is the ONE positional argv element this module
 * builds, so a `-` opening it would be read as a flag by every CLI.
 */
const BAD_ISSUE_ID_REASON
  = 'An issue id is a tracker identifier and may not be blank or '
  + 'begin with a dash.';

/**
 * The tracker reference rafa nests under an issue and under a create.
 *
 * `kind` is measured — the live `issue list` reading has
 * `ref:{opt,kind,externalId,url,module}` — and is what
 * {@link readTracker} falls back to. `externalId` accepts a number as
 * well as a string because only the github tracker was read live, and
 * a tracker answering `4` rather than `"4"` would otherwise make
 * every one of its issues unusable.
 */
const rafaRefSchema = z.object({
  kind: z.string().optional(),
  externalId: z.union([z.string(), z.number()]).optional(),
  url: z.string().nullish(),
});

/** One issue in an `issue list` answer. */
const rafaIssueSchema = z.object({
  title: z.string().optional(),
  ref: rafaRefSchema.optional(),
});

/** The `data` of an `issue list` result event. */
const rafaListDataSchema = z.object({
  tracker: z.object({ kind: z.string() }).optional(),
  issues: z.array(rafaIssueSchema).optional(),
});

/**
 * The `data` of an `issue create` result event.
 *
 * NOT measured; see this module's header. `ref` is the plan's
 * Description read literally, and `issue.ref` is accepted beside it
 * because the measured LIST envelope nests a ref exactly there, so a
 * create reusing that envelope puts it in the second place rather
 * than in some third one. `comment` reads its answer through this
 * same schema, and through nothing else it depends on.
 */
const rafaCreateDataSchema = z.object({
  tracker: z.object({ kind: z.string() }).optional(),
  ref: rafaRefSchema.optional(),
  issue: z.object({ ref: rafaRefSchema.optional() }).optional(),
});

/** A validated `issue list` issue. */
type RafaIssue = z.infer<typeof rafaIssueSchema>;

/** A validated tracker reference. */
type RafaRef = z.infer<typeof rafaRefSchema>;

/** How a {@link rafaGateway} is configured. */
export interface RafaGatewayOptions {
  /**
   * The binary to run, default `rafa`.
   *
   * A path or a bare name; it is passed as argv[0] and never through
   * a shell, so it needs no quoting and may hold spaces.
   */
  readonly bin?: string;

  /**
   * What actually runs a command, default `./run.ts`'s `rafaRun`.
   *
   * Injected so a test never spawns the real binary. The default is
   * bound on the KEY and not on the value: leaving `run` out gives
   * the shipped runner, while stating it as `undefined` gives NO
   * runner and every call refuses with `./call.ts`'s
   * `NO_RUNNER_REASON`. That distinction is the seam the colocated
   * cases read that refusal through, and it is why `??` is not what
   * binds the default below.
   */
  readonly run?: RafaRun;

  /**
   * The tracker module reports file under, default `web`.
   *
   * Blank counts as absent, so a consumer passing an unset
   * environment variable gets the default rather than `--module=`.
   */
  readonly module?: string;

  /**
   * The priority reports file under, default ABSENT.
   *
   * Absent means the create argv carries no `--priority` element at
   * all rather than an empty one, which is the operator decision the
   * plan records: rafa labels an issue filed without a priority
   * `needs-triage`, and that is the intended state.
   */
  readonly priority?: string;
}

/**
 * Take a configured string, or the fallback when it is blank.
 *
 * @param value - The configured value, possibly absent.
 * @param fallback - What to use instead of a blank one.
 * @returns The trimmed value, or the fallback.
 */
function textOr(value: string | undefined, fallback: string): string {
  const text = value?.trim() ?? '';

  return text === ''
    ? fallback
    : text;
}

/**
 * Read a tracker identifier as the string every tracker answers in.
 *
 * @param value - `ref.externalId`, whichever type it arrived as.
 * @returns The id, or `null` when there is none to use.
 */
function readId(value: string | number | undefined): string | null {
  if (value === undefined) {
    return null;
  }

  const id = typeof value === 'number'
    ? String(value)
    : value.trim();

  return id === ''
    ? null
    : id;
}

/**
 * Name the tracker an answer landed on.
 *
 * `data.tracker.kind` is the measured place and is preferred; the
 * ref's own `kind` is the measured fallback, the live `issue list`
 * reading carrying it on every ref.
 *
 * @param kind - `data.tracker.kind`, when the answer had one.
 * @param ref - The ref, when the answer had one.
 * @returns The tracker name, never blank.
 */
function readTracker(
  kind: string | undefined,
  ref: RafaRef | undefined,
): string {
  return textOr(kind, textOr(ref?.kind, RAFA_UNKNOWN_TRACKER));
}

/**
 * Turn one listed issue into a match, or drop it.
 *
 * An issue with no id cannot be commented on, and one with no title
 * cannot be shown to the person deciding, so either missing makes the
 * hit unusable.
 *
 * @param issue - One member of `data.issues`.
 * @returns The match, or `null`.
 */
function readIssue(issue: RafaIssue): ReportGatewayIssue | null {
  const id = readId(issue.ref?.externalId);
  const title = issue.title?.trim() ?? '';

  if (id === null || title === '') {
    return null;
  }

  const url = issue.ref?.url ?? '';

  return url === ''
    ? Object.freeze({ id, title })
    : Object.freeze({ id, title, url });
}

/**
 * Build a filed outcome, carrying a url only when there is one.
 *
 * @param tracker - Where it landed.
 * @param id - The issue's identifier.
 * @param url - Where to read it, when the tracker has such a place.
 * @returns The frozen outcome.
 */
function fileOutcome(
  tracker: string,
  id: string,
  url: string | null | undefined,
): ReportGatewayFiled {
  return url === null || url === undefined || url === ''
    ? Object.freeze({ status: 'filed' as const, tracker, id })
    : Object.freeze({ status: 'filed' as const, tracker, id, url });
}

/**
 * The title an issue is created with.
 *
 * Spec decision 8's `[fb/<round>] <title>`. The round comes from
 * `../store.ts`, which refuses a round that sanitises to nothing, so
 * the prefix is never `[fb/]`.
 *
 * @param report - The stored report.
 * @returns The prefixed title.
 */
function createTitle(report: DevToolsStoredReport): string {
  return `[fb/${report.round}] ${report.report.title}`;
}

/**
 * The body an issue is created with.
 *
 * The reporter's body, plus a section naming each stored attachment
 * when there is one; a report with no attachment gets its body
 * unchanged rather than an empty section.
 *
 * The paths are fenced in backticks and are safe to fence: every
 * segment `../store.ts` writes has been through its `sanitiseSegment`
 * or its attachment-name equivalent, so a path carries `[a-z0-9._-]`
 * and the separator and nothing that could close the span.
 *
 * @param report - The stored report.
 * @returns The body to file.
 */
function createBody(report: DevToolsStoredReport): string {
  const { body } = report.report;

  if (report.attachmentPaths.length === 0) {
    return body;
  }

  const listed = report.attachmentPaths
    .map((entry) => `- \`${entry}\``)
    .join('\n');
  const heading = `${ATTACHMENTS_HEADING}\n\n${ATTACHMENTS_NOTE}`;
  const section = `${heading}\n\n${listed}`;

  return `${body}\n\n${section}`;
}

/**
 * Read a create's or a comment's answer for its tracker and its ref.
 *
 * @param answered - What {@link runRafa} read.
 * @returns The tracker name and the ref, the ref being `undefined`
 * where the answer did not parse or carried none.
 */
function readRef(answered: RafaCall): {
  readonly tracker: string;
  readonly ref: RafaRef | undefined;
} {
  const parsed = answered.ok
    ? rafaCreateDataSchema.safeParse(answered.data)
    : null;

  if (parsed === null || !parsed.success) {
    return { tracker: RAFA_UNKNOWN_TRACKER, ref: undefined };
  }

  const ref = parsed.data.ref ?? parsed.data.issue?.ref;

  return { tracker: readTracker(parsed.data.tracker?.kind, ref), ref };
}

/**
 * A {@link ReportGateway} over the `rafa` binary.
 *
 * Frozen, and built once per dev server: `vite.config.ts` passes
 * `rafaGateway()` to `devtoolsPlugin` and the plugin holds it for the
 * server's life. Nothing here keeps state between calls, so one
 * instance serving concurrent requests is safe.
 *
 * @param options - The binary, the runner, and the module and
 * priority every create is filed under.
 * @returns The gateway.
 */
export function rafaGateway(options: RafaGatewayOptions = {}): ReportGateway {
  const bin = textOr(options.bin, RAFA_DEFAULT_BIN);
  const issueModule = textOr(options.module, RAFA_DEFAULT_MODULE);
  const priority = options.priority?.trim() ?? '';
  const run = 'run' in options
    ? options.run
    : rafaRun;

  /**
   * Look for issues that may already be this report.
   *
   * @param query - Free text; passed as ONE argv element.
   * @returns The matches, possibly none, or a refusal.
   */
  async function search(query: string): Promise<ReportGatewaySearchOutcome> {
    const words = query.trim();

    if (words === '') {
      return refuse(BLANK_QUERY_REASON);
    }

    const answered = await runRafa(run, [
      bin,
      'issue',
      'list',
      `--type=${RAFA_ISSUE_TYPE}`,
      `--search=${words}`,
      RAFA_OUTPUT_FLAG,
    ], RAFA_LIST_LABEL);

    if (!answered.ok) {
      return answered.refusal;
    }

    const parsed = rafaListDataSchema.safeParse(answered.data);

    if (!parsed.success) {
      return refuse(
        `${RAFA_LIST_LABEL} answered a result this gateway cannot read.`,
      );
    }

    const issues = parsed.data.issues ?? [];
    const matches = issues
      .map((issue) => readIssue(issue))
      .filter((issue) => issue !== null);

    // Every hit unusable is a refusal rather than an empty answer: a
    // rafa that renamed `ref.externalId` would otherwise make dedupe
    // stop working while every call still read as a success.
    if (issues.length > 0 && matches.length === 0) {
      return refuse(`${RAFA_LIST_LABEL} answered ${String(issues.length)} `
        + 'issues and none of them carries an identifier and a title.');
    }

    return Object.freeze({
      status: 'matches' as const,
      matches: Object.freeze(matches),
    });
  }

  /**
   * Take a stored report to the tracker.
   *
   * Searches FIRST, and a search that refused refuses the whole call
   * rather than creating anyway: the two calls share a binary, so a
   * missing or refusing rafa would fail the create too, and a
   * transient list failure that did not would file a duplicate
   * nobody asked for. The report is on disk either way, which is
   * what makes refusing the safe direction.
   *
   * @param report - The stored report, written before this runs.
   * @returns Filed, a duplicate to decide about, or a refusal.
   */
  async function file(
    report: DevToolsStoredReport,
  ): Promise<ReportGatewayFileOutcome> {
    const found = await search(report.report.title);

    if (found.status === 'refused') {
      return found;
    }

    const [match] = found.matches;

    if (match !== undefined) {
      return Object.freeze({ status: 'duplicate' as const, match });
    }

    const priorityFlag = priority === ''
      ? []
      : [`--priority=${priority}`];

    const answered = await runRafa(run, [
      bin,
      'issue',
      'create',
      `--title=${createTitle(report)}`,
      `--body=${createBody(report)}`,
      `--type=${RAFA_ISSUE_TYPE}`,
      `--module=${issueModule}`,
      ...priorityFlag,
      RAFA_OUTPUT_FLAG,
    ], RAFA_CREATE_LABEL);

    if (!answered.ok) {
      return answered.refusal;
    }

    const { tracker, ref } = readRef(answered);
    const id = readId(ref?.externalId);

    if (id === null) {
      return refuse(`${RAFA_CREATE_LABEL} answered no issue identifier, so `
        + 'this report may or may not have been filed.');
    }

    return fileOutcome(tracker, id, ref?.url);
  }

  /**
   * Add a comment to an existing issue — the "also affected" path.
   *
   * The outcome names the id it was GIVEN rather than one read back
   * out of the answer, because the comment envelope was never read
   * live and a comment that landed must not be reported as a
   * refusal. See this module's header.
   *
   * @param issueId - The issue being commented on.
   * @param body - The comment markdown, already rendered.
   * @returns The issue as filed, or a refusal.
   */
  async function comment(
    issueId: string,
    body: string,
  ): Promise<ReportGatewayCommentOutcome> {
    const id = issueId.trim();

    if (id === '' || id.startsWith('-')) {
      return refuse(BAD_ISSUE_ID_REASON);
    }

    const answered = await runRafa(run, [
      bin,
      'issue',
      'comment',
      id,
      `--body=${body}`,
      RAFA_OUTPUT_FLAG,
    ], RAFA_COMMENT_LABEL);

    if (!answered.ok) {
      return answered.refusal;
    }

    const { tracker, ref } = readRef(answered);

    return fileOutcome(tracker, id, ref?.url);
  }

  return Object.freeze({
    name: RAFA_GATEWAY_NAME,
    file,
    search,
    comment,
  });
}
