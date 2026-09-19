/**
 * The three values the dev-server plugin freezes into the app at
 * start: the commit, the branch and the round.
 *
 * Spec item 8.1 is the authority for the first two — "`config()`
 * defines `__DEVTOOLS_COMMIT__` and `__DEVTOOLS_BRANCH__` from `git
 * rev-parse HEAD` / `--abbrev-ref HEAD` at dev-server start (a non-repo
 * answers `unknown`)" — and spec item 9 for the third:
 * "`VITE_DEVTOOLS_ROUND` ...; default the current git branch sanitised
 * to `[a-z0-9-]`". Resolving them is here; defining them is
 * `./plugin.ts`'s, and showing them is `../core/Shell.tsx`'s.
 *
 * ## The command runner and the environment are arguments
 *
 * {@link resolveDevToolsBuildInfo} takes both through
 * {@link DevToolsGitDeps} and reaches for neither itself: there is no
 * `import ... from 'node:child_process'` in this file and no
 * `process.env`. So the colocated cases below spawn nothing, run under
 * any working directory, and pass on a machine with no `git` on its
 * `PATH` — and the non-repository reading is a runner that answers
 * `ok: false`, not a temp directory somebody has to create and clean
 * up. `./plugin.ts` is the one place the real `spawnSync` and the real
 * `process.env` are named.
 *
 * The runner is handed ARGV FOR GIT ONLY — {@link DevToolsCommandRunner}
 * takes no command name — so no option, no environment variable and no
 * request body can make this module run a different program. The three
 * argument vectors it may be called with are the three frozen constants
 * below and nothing else.
 *
 * ## Why the runner is synchronous
 *
 * Vite's `config()` hook may be async, so this could have been a
 * promise. It is not, because these three values are read ONCE per
 * dev-server start and every caller needs all three before it can
 * define anything: an async seam would buy no concurrency and would
 * make `./plugin.ts`'s `config()` hook await three sequential spawns
 * instead of running them sequentially in the open. `spawnSync` is the
 * right tool for a one-shot read at start-up, and the injected seam
 * mirrors it.
 *
 * ## Nothing unverified reaches a `define`
 *
 * Every value here ends up spliced into the browser bundle as a string
 * literal by Vite's `define`, which is a text substitution. So the
 * commit is held to {@link COMMIT_PATTERN} (hex, 7 to 64 characters,
 * which covers both sha1 and sha256 repositories) and the branch to
 * {@link BRANCH_PATTERN} (the ref characters git actually permits, at
 * most {@link BRANCH_MAX} of them). Whatever fails its pattern answers
 * {@link DEVTOOLS_UNKNOWN_BUILD_VALUE} rather than being echoed: a
 * runner that answered a shell banner, a `warning:` line or a quote
 * character would otherwise put it inside a JavaScript literal.
 *
 * That is a belt over braces — a real `git rev-parse` answers a hash —
 * and it is cheap enough to keep, because the runner is an injected
 * seam a future caller shapes freely.
 *
 * ## A detached HEAD has no branch
 *
 * `git rev-parse --abbrev-ref HEAD` answers the literal `HEAD` when
 * nothing is checked out, which is not a branch name; taking it as one
 * would name a round directory `head` and show `HEAD` in the About
 * panel as though it were a branch. So it answers
 * {@link DEVTOOLS_UNKNOWN_BUILD_VALUE} instead, and the round falls
 * back to `VITE_DEVTOOLS_ROUND` or to `unknown` — which is the case
 * where setting that variable is the fix.
 *
 * ## The round: the environment wins, and it wins first
 *
 * `VITE_DEVTOOLS_ROUND` is read BEFORE the repository probe, so a round
 * an operator stated is honoured in a directory that is no repository
 * at all. That is deliberate: the round names a feedback directory and
 * reaches an issue title in q20b-2, and neither of those needs a git
 * checkout to be meaningful. The commit and the branch do, and they
 * stay `unknown` there.
 *
 * Both sources go through `./store.ts`'s `sanitiseSegment`, the same
 * function that sanitises the round again when it names a directory, so
 * the round the browser is told and the round on disk cannot drift.
 *
 * ## The fourth value is read on its own
 *
 * {@link resolveDevToolsRepo} answers the `owner/name` slug of the
 * `origin` remote, which spec item 7 needs for the prefilled GitHub
 * new-issue link on the local-tracker path. It is a separate export
 * rather than a fourth member of {@link DevToolsBuildInfo} because the
 * three members of that record are spliced into the browser bundle by
 * `./plugin.ts`'s `define` and the slug is not: it is read per
 * dev-server start by `GET /__devtools/status` alone. It takes the
 * runner directly, not {@link DevToolsGitDeps}, because no environment
 * variable states it.
 *
 * ## Mutation note - what the colocated cases actually catch
 *
 * A green suite is not evidence a case can fail. Each leg below was
 * measured by breaking this file, running `bun x vitest run
 * src/vite/git.test.ts` from `packages/dev-tools`, and restoring this
 * file byte-identical (checksum compared before and after every leg;
 * the hash is not quoted here because this header is part of the file
 * it would name). The baseline is `Tests 15 passed (15)`.
 *
 * - Making {@link isInsideRepository} answer `true` regardless, so the
 *   two `rev-parse` reads are always attempted, answers `Tests 4 failed
 *   | 11 passed (15)` - the two unreadable-repository cases, `answers
 *   unknown for a failing command inside a repository` and `runs the
 *   repository probe before anything else`. All four fail on the
 *   recorded ARGV rather than on the values, because a runner that
 *   refuses every call answers `unknown` either way: that is exactly
 *   why those cases assert which commands ran.
 * - Taking a command's stdout untrimmed answers `11 failed | 4 passed`
 *   - nearly the file, because every value here is read through
 *   {@link readLine} and the scripted answers carry the newline `git`
 *   prints. That breadth is the reason the legs below are narrower
 *   edits: this one proves only that the trim is load-bearing.
 * - Widening {@link COMMIT_PATTERN} to `/^.+$/` answers `1 failed | 14
 *   passed` - `holds the commit to a hex hash`. Its control half (a
 *   real hash IS answered) survives the leg, so the case reads as
 *   "this one was filtered" rather than as "nothing is ever answered".
 * - Widening {@link BRANCH_PATTERN} to `/^.+$/` answers `1 failed | 14
 *   passed` - `holds the branch to the characters a ref may carry`,
 *   whose control half keeps the leg honest the same way.
 * - Dropping the {@link DETACHED_HEAD} check answers `1 failed | 14
 *   passed` - `answers unknown for the branch on a detached HEAD`. Its
 *   control half (a branch actually NAMED `head`) survives, so the case
 *   is not "any spelling of head is refused".
 * - Letting the branch win whenever it yields a round and consulting
 *   the environment only as a fallback answers `3 failed | 12 passed` -
 *   `lets VITE_DEVTOOLS_ROUND win over the branch`, `sanitises a round
 *   the environment stated` and `falls back to the branch when the
 *   environment round is unusable`. The third is the one that shows the
 *   fallback and the precedence are separate readings: it still passes
 *   under a leg that only reorders them, and fails under this one
 *   because its control half asserts a usable value is taken.
 * - Having {@link roundFromBranch} answer the branch unsanitised
 *   answers `2 failed | 13 passed` - `answers unknown for a round no
 *   source can state` and `sanitises a branch that needs it into the
 *   round`.
 * - Having {@link roundFromEnv} answer the stated value unsanitised
 *   answers `2 failed | 13 passed` - `sanitises a round the environment
 *   stated` and `falls back to the branch when the environment round is
 *   unusable`, the second because an unsanitised `'   '` is truthy and
 *   never falls through.
 *
 * The slug read was measured the same way, over the same baseline:
 *
 * - Having {@link repoFromUrl} answer the url unparsed where neither
 *   pattern matches answers `1 failed | 21 passed (22)` - `answers
 *   unknown for a url it cannot parse`.
 * - Dropping the {@link DOTS_ONLY} guard answers `1 failed | 21
 *   passed` - the same case, on its `https://github.com/../..` entry.
 * - Stripping `.git` everywhere rather than off the end answers `1
 *   failed | 21 passed` - `drops a .git suffix from either form`,
 *   which is why that case carries a `.github` owner and a
 *   `dot.github` name as its control half.
 * - Stripping it nowhere answers `5 failed | 17 passed`, since the
 *   control half of nearly every refusal case is an https url with the
 *   suffix on.
 * - Making {@link HTTP_REMOTE_PATTERN}'s userinfo group CAPTURING, so
 *   the destructure takes the credentials as the owner, answers `6
 *   failed | 16 passed` - including `answers the slug alone for a url
 *   carrying credentials`, the case whose whole point is that nothing
 *   before the host is answered.
 * - Reading the remote's stdout directly instead of through
 *   {@link readLine} answers `1 failed | 21 passed` - `answers
 *   owner/name for an https url`, on the newline `git` prints. The
 *   null guard itself is NOT separately pinned: a refused command and
 *   an empty stdout both reach `unknown` either way.
 *
 * One thing no case pins: NO case here runs a real `git`, so the
 * agreement between {@link DevToolsCommandRunner} and `spawnSync`'s
 * actual behaviour rests on `./plugin.ts`'s use of it and on the
 * type-level assertion the colocated suite makes about the outcome
 * shape.
 */

import { sanitiseSegment } from './store';

/**
 * What a value answers when it could not be read.
 *
 * The same spelling `../core/host.ts`'s `DEVTOOLS_UNKNOWN_VERSION`
 * uses, and restated here rather than imported: `src/vite/**` is the
 * node layer and `src/core/**` never imports it, so the dependency
 * would run the wrong way for a constant either end can spell.
 */
export const DEVTOOLS_UNKNOWN_BUILD_VALUE = 'unknown';

/** The environment variable that states the round outright. */
export const DEVTOOLS_ROUND_ENV_NAME = 'VITE_DEVTOOLS_ROUND';

/** Is this directory inside a work tree at all. */
const REPOSITORY_PROBE_ARGS: readonly string[] = Object.freeze([
  'rev-parse',
  '--is-inside-work-tree',
]);

/** What the probe answers inside a work tree. */
const INSIDE_WORK_TREE = 'true';

/** Spec item 8.1's commit read. */
const COMMIT_ARGS: readonly string[] = Object.freeze(['rev-parse', 'HEAD']);

/** Spec item 8.1's branch read. */
const BRANCH_ARGS: readonly string[] = Object.freeze([
  'rev-parse',
  '--abbrev-ref',
  'HEAD',
]);

/** What `--abbrev-ref HEAD` answers when nothing is checked out. */
const DETACHED_HEAD = 'HEAD';

/**
 * What a commit hash may be spelled with.
 *
 * Lower-case hex, 7 to 64 characters: 40 for a sha1 repository, 64 for
 * a sha256 one, and the low bound left short so an abbreviated hash a
 * future read answers is not rejected for being short.
 */
const COMMIT_PATTERN = /^[0-9a-f]{7,64}$/;

/**
 * What a branch name may be spelled with.
 *
 * Letters, digits and the four punctuation characters a git ref
 * commonly carries. Narrower than `git check-ref-format` permits on
 * purpose — this is a guard on what reaches a `define`, not a ref
 * validator — so an exotic but legal ref reads as `unknown` rather
 * than as a hole.
 */
const BRANCH_PATTERN = /^[A-Za-z0-9._/-]+$/;

/** The longest branch name that is taken as one. */
const BRANCH_MAX = 200;

/** The longest sanitised round that is answered. */
const ROUND_MAX = 64;

/** The longest stdout a read looks at, so nothing unbounded is parsed. */
const STDOUT_MAX = 4096;

/**
 * What a command answered.
 *
 * Discriminated rather than `string | null`, the same shape
 * `./origin.ts`, `./report.ts` and `./store.ts` answer with, so a
 * runner can say "the command ran and said nothing" distinctly from
 * "the command failed".
 */
export type DevToolsCommandOutcome =
  | {
    /** Always `true`; the discriminant. */
    readonly ok: true;

    /** What the command wrote to stdout, newline and all. */
    readonly stdout: string;
  }
  | {
    /**
     * Always `false`; the discriminant.
     *
     * Answered for a non-zero exit, for a `git` that is not on the
     * `PATH`, and for a spawn that threw. Nothing about WHY is carried,
     * because nothing here would do anything different with it: all
     * three answer `unknown`.
     */
    readonly ok: false;
  };

/**
 * How a `git` command is run.
 *
 * Takes the argument vector only. The program is not a parameter, so
 * this seam cannot be turned into a general-purpose command executor by
 * a caller or by a later edit here.
 *
 * @param args - The arguments to pass `git`, without the program name.
 * @returns What the command answered. An implementation must not
 * throw: a failure is `{ok: false}`.
 */
export type DevToolsCommandRunner = (
  args: readonly string[],
) => DevToolsCommandOutcome;

/** The two things {@link resolveDevToolsBuildInfo} will not reach for. */
export interface DevToolsGitDeps {
  /** The command runner to read `git` through. */
  readonly run: DevToolsCommandRunner;

  /**
   * The environment to read {@link DEVTOOLS_ROUND_ENV_NAME} from.
   *
   * Shaped as `process.env` is, so `./plugin.ts` hands that over
   * directly and a case hands over a literal.
   */
  readonly env: Readonly<Record<string, string | undefined>>;
}

/**
 * The three values `./plugin.ts` defines and `GET /__devtools/status`
 * answers.
 *
 * Every member is a non-empty string: an unreadable one is
 * {@link DEVTOOLS_UNKNOWN_BUILD_VALUE}, never `null` and never `''`.
 * `../core/shellRules.ts` relies on that — its header says the empty
 * string should never reach it.
 */
export interface DevToolsBuildInfo {
  /** The full commit hash at `HEAD`, or `unknown`. */
  readonly commit: string;

  /** The checked-out branch, or `unknown`. */
  readonly branch: string;

  /** The round tag, sanitised to `[a-z0-9-]`, or `unknown`. */
  readonly round: string;
}

/**
 * Read one command's single-line answer.
 *
 * @param run - The injected runner.
 * @param args - Which command to run.
 * @returns The trimmed first line, or `null` when the command failed or
 * said more than {@link STDOUT_MAX} characters.
 */
function readLine(
  run: DevToolsCommandRunner,
  args: readonly string[],
): string | null {
  const outcome = run(args);

  if (!outcome.ok || outcome.stdout.length > STDOUT_MAX) {
    return null;
  }

  const line = outcome.stdout.trim();

  return line === ''
    ? null
    : line;
}

/**
 * Is the runner's working directory inside a git work tree.
 *
 * Asked BEFORE the two `rev-parse` reads, so that a non-repository
 * costs one refused command rather than two, and so that the
 * non-repository case is a reading of this probe rather than of two
 * coincidentally failing reads.
 *
 * @param run - The injected runner.
 * @returns Whether the probe said `true`.
 */
function isInsideRepository(run: DevToolsCommandRunner): boolean {
  return readLine(run, REPOSITORY_PROBE_ARGS) === INSIDE_WORK_TREE;
}

/**
 * Read the commit at `HEAD`.
 *
 * @param run - The injected runner.
 * @returns The hash, or {@link DEVTOOLS_UNKNOWN_BUILD_VALUE} when the
 * command failed or answered something that is no hash.
 */
function readCommit(run: DevToolsCommandRunner): string {
  const line = readLine(run, COMMIT_ARGS);

  if (line === null || !COMMIT_PATTERN.test(line)) {
    return DEVTOOLS_UNKNOWN_BUILD_VALUE;
  }

  return line;
}

/**
 * Read the checked-out branch.
 *
 * @param run - The injected runner.
 * @returns The branch name, or {@link DEVTOOLS_UNKNOWN_BUILD_VALUE} for
 * a failed command, a detached `HEAD`, or a name too long or spelled
 * with something {@link BRANCH_PATTERN} does not permit.
 */
function readBranch(run: DevToolsCommandRunner): string {
  const line = readLine(run, BRANCH_ARGS);

  if (line === null || line === DETACHED_HEAD) {
    return DEVTOOLS_UNKNOWN_BUILD_VALUE;
  }

  if (line.length > BRANCH_MAX || !BRANCH_PATTERN.test(line)) {
    return DEVTOOLS_UNKNOWN_BUILD_VALUE;
  }

  return line;
}

/**
 * Read the round an operator stated.
 *
 * @param env - The environment to read.
 * @returns The sanitised round, or `null` when the variable is absent,
 * empty, or left empty by sanitisation — all three of which fall
 * through to the branch.
 */
function roundFromEnv(
  env: Readonly<Record<string, string | undefined>>,
): string | null {
  const stated = env[DEVTOOLS_ROUND_ENV_NAME];

  if (stated === undefined) {
    return null;
  }

  const round = sanitiseSegment(stated, ROUND_MAX);

  return round === ''
    ? null
    : round;
}

/**
 * Derive the round from a branch.
 *
 * @param branch - What {@link readBranch} answered.
 * @returns The sanitised round, or {@link DEVTOOLS_UNKNOWN_BUILD_VALUE}
 * when there is no branch or nothing survives sanitisation.
 */
function roundFromBranch(branch: string): string {
  if (branch === DEVTOOLS_UNKNOWN_BUILD_VALUE) {
    return DEVTOOLS_UNKNOWN_BUILD_VALUE;
  }

  const round = sanitiseSegment(branch, ROUND_MAX);

  return round === ''
    ? DEVTOOLS_UNKNOWN_BUILD_VALUE
    : round;
}

/**
 * Resolve the commit, the branch and the round.
 *
 * Runs at most three `git` commands, in this order: the work-tree
 * probe, then — only inside a work tree — `rev-parse HEAD` and
 * `rev-parse --abbrev-ref HEAD`. Nothing here throws: a runner that
 * refuses every call answers three `unknown`s, save for a round the
 * environment stated, which is read first and needs no repository.
 *
 * @param deps - The command runner and the environment, both injected.
 * @returns The three values, each a non-empty string.
 */
export function resolveDevToolsBuildInfo(
  deps: DevToolsGitDeps,
): DevToolsBuildInfo {
  const statedRound = roundFromEnv(deps.env);

  if (!isInsideRepository(deps.run)) {
    return Object.freeze({
      commit: DEVTOOLS_UNKNOWN_BUILD_VALUE,
      branch: DEVTOOLS_UNKNOWN_BUILD_VALUE,
      round: statedRound ?? DEVTOOLS_UNKNOWN_BUILD_VALUE,
    });
  }

  const commit = readCommit(deps.run);
  const branch = readBranch(deps.run);

  return Object.freeze({
    commit,
    branch,
    round: statedRound ?? roundFromBranch(branch),
  });
}

/** Spec item 7's remote read. */
const REMOTE_ARGS: readonly string[] = Object.freeze([
  'remote',
  'get-url',
  'origin',
]);

/** What a remote url may carry after the host, per path segment. */
const REPO_SEGMENT = '[A-Za-z0-9._-]{1,100}';

/**
 * An `https://` (or `http://`) remote, with optional userinfo and port.
 *
 * A token-carrying url — `https://x-access-token:...@host/owner/name` —
 * is matched by the optional userinfo group, and the userinfo is
 * DROPPED rather than answered: only the two captured segments reach a
 * caller, so no credential a remote url carries can reach the browser.
 */
const HTTP_REMOTE_PATTERN = new RegExp(
  `^https?://(?:[^\\s/@]+@)?[^\\s/:@]+(?::\\d{1,5})?/(${REPO_SEGMENT})/(${REPO_SEGMENT})$`,
);

/**
 * A `git@host:owner/name` remote, and its `ssh://git@host/owner/name`
 * spelling, which git writes for a remote carrying a port.
 */
const SCP_REMOTE_PATTERN = new RegExp(
  `^(?:ssh://)?[^\\s/@]+@[^\\s/:@]+(?::\\d{1,5})?[:/](${REPO_SEGMENT})/(${REPO_SEGMENT})$`,
);

/** The suffix git leaves on a remote url and GitHub's slug does not. */
const GIT_SUFFIX = '.git';

/** A segment made of dots alone, which names no owner and no repo. */
const DOTS_ONLY = /^\.+$/;

/**
 * Turn a remote url into `owner/name`.
 *
 * @param url - What `git remote get-url origin` printed, trimmed.
 * @returns The slug, or `null` for a url neither pattern matches and
 * for one whose owner or name is dots alone.
 */
function repoFromUrl(url: string): string | null {
  const bare = url.endsWith(GIT_SUFFIX)
    ? url.slice(0, -GIT_SUFFIX.length)
    : url;
  const match = HTTP_REMOTE_PATTERN.exec(bare) ?? SCP_REMOTE_PATTERN.exec(bare);

  if (match === null) {
    return null;
  }

  const [, owner, name] = match;

  if (
    owner === undefined
    || name === undefined
    || DOTS_ONLY.test(owner)
    || DOTS_ONLY.test(name)
  ) {
    return null;
  }

  return `${owner}/${name}`;
}

/**
 * Resolve the `owner/name` slug of the `origin` remote.
 *
 * Runs exactly one command, `git remote get-url origin`, and reads its
 * single-line answer through the same {@link readLine} the three build
 * values use. Nothing here throws: a directory that is no repository, a
 * repository with no `origin`, and a `git` that is not on the `PATH`
 * all answer {@link DEVTOOLS_UNKNOWN_BUILD_VALUE}, because all three
 * are one refused command to this seam.
 *
 * No work-tree probe runs first: unlike the commit and the branch,
 * there is one read here, so a probe would double the cost of the
 * answering case to save nothing in the refusing one.
 *
 * The slug reaches a caller only through the two patterns above, and
 * the two capture groups are all that is answered. So a remote url
 * carrying credentials, a host, a port or a query answers the slug
 * alone or answers `unknown` — never a fragment of the url itself. That
 * matters because spec item 7 splices this value into a GitHub
 * new-issue link.
 *
 * @param run - The injected runner, the same seam
 * {@link resolveDevToolsBuildInfo} takes.
 * @returns `owner/name`, or {@link DEVTOOLS_UNKNOWN_BUILD_VALUE} when
 * there is no remote to read or its url parses as no repository.
 */
export function resolveDevToolsRepo(run: DevToolsCommandRunner): string {
  const line = readLine(run, REMOTE_ARGS);

  if (line === null) {
    return DEVTOOLS_UNKNOWN_BUILD_VALUE;
  }

  return repoFromUrl(line) ?? DEVTOOLS_UNKNOWN_BUILD_VALUE;
}
