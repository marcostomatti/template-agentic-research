/**
 * The default {@link RafaRun}: one argv ARRAY, one child process, no
 * shell.
 *
 * `./call.ts` declares the contract and `./rafa.ts` builds the argvs;
 * this file is the one thing in this directory that actually starts a
 * process, and it is deliberately the thinnest of the three. It
 * decides nothing about issues, nothing about NDJSON and nothing
 * about what a failure MEANS. It hands back the four things a
 * finished process has — an exit code, stdout, stderr, and the error
 * code when the process never ran to completion — and `./call.ts`
 * turns those into a refusal a person can read.
 *
 * ## Spec decision 6, unreachable rather than merely unused
 *
 * `execFile`, never `exec`: `exec` takes a command STRING and spawns
 * a shell to read it, which is the thing decision 6 forbids.
 * `execFile` takes the file and an argument ARRAY and starts the
 * binary directly — and `shell: false` is passed explicitly all the
 * same, so a reader meets the decision in the code rather than in a
 * documented default. argv[0] is the file and every later element is
 * an argument verbatim, so a title, a body or a search phrase holding
 * spaces, semicolons, backticks or `$(...)` reaches rafa as ONE
 * argument still carrying those bytes. `./run.test.ts` proves it with
 * a child that prints its own `process.argv` back, compared element
 * by element.
 *
 * ## What each outcome maps to, measured
 *
 * Read off node 25.8.0 by running the five shapes through `execFile`
 * and printing `code`, `errno`, `signal` and `killed` — the reading
 * is in the close-out notes, and the cases in `./run.test.ts` provoke
 * each row rather than arranging it:
 *
 * | Shape                | node's error         | Answered as             |
 * | -------------------- | -------------------- | ----------------------- |
 * | exited zero          | `null`               | `code: 0`               |
 * | exited 3             | `code: 3` (number)   | `code: 3`, stderr kept  |
 * | binary absent        | `code: 'ENOENT'`     | `errno: 'ENOENT'`       |
 * | killed by timeout    | `code: null`, SIGTERM| `code: null`            |
 * | output over the cap  | `code: 'ERR_...'`    | `errno: 'ERR_...'`      |
 *
 * So the rule is: a NUMERIC `code` is an exit status, a STRING `code`
 * is reported as {@link RafaRunResult.errno} verbatim, and anything
 * else — a kill, which is where a timeout lands — is `code: null`
 * with no errno, the shape `./call.ts` reports as "did not exit
 * normally".
 *
 * One wording limit that mapping carries, stated rather than hidden:
 * `./call.ts` prints an errno as "could not be started (CODE)", which
 * is exactly right for `ENOENT` and `EACCES` and slightly wrong for
 * `ERR_CHILD_PROCESS_STDIO_MAXBUFFER`, where the process started and
 * was then aborted for printing more than {@link
 * RAFA_RUN_OUTPUT_BYTES_MAX}. Reporting the code loudly beats
 * reporting a cap breach as a vague non-exit, and the cap is eight
 * orders of magnitude above the two-event NDJSON rafa prints, so the
 * row is a guard rather than an expected reading.
 *
 * ## An empty argv is answered, not thrown
 *
 * `execFile('')` throws `ERR_INVALID_ARG_VALUE` SYNCHRONOUSLY
 * (measured, same node) rather than calling back, so an argv with no
 * usable first element is answered as {@link
 * RAFA_RUN_EMPTY_ARGV_ERRNO} before anything is started. `./call.ts`
 * does catch a runner that throws, so this is belt and braces — but
 * it keeps "every answer is a value" true of this file on its own,
 * and it is the one refusal here that provokes no process at all.
 *
 * ## The environment and the working directory are inherited
 *
 * Neither is set. rafa resolves its tracker from `.rafa/config.yaml`
 * relative to the working directory and reads its credentials from
 * the environment, so a runner that scrubbed either would file
 * nothing on a correctly configured machine and the reason would name
 * the tracker rather than the scrubbing. The dev server's own cwd and
 * env are therefore what a call sees, which is the same authority the
 * operator running `bun run dev` already has.
 *
 * ## How this is the DEFAULT, and how a test opts out
 *
 * `./rafa.ts` binds {@link rafaRun} for a gateway that states no
 * runner, so `rafaGateway()` — what `packages/web/vite.config.ts`
 * passes to the plugin — files through this file. The binding reads
 * the KEY: `'run' in options`. So `rafaGateway({ run: undefined })`
 * runs NOTHING and refuses with `./call.ts`'s `NO_RUNNER_REASON`,
 * which is the seam that keeps a unit test off the real tracker,
 * while a bare `rafaGateway()` in a test would spawn `rafa` for real.
 * `../index.ts` exports {@link rafaRun} beside `rafaGateway` all the
 * same, for a consumer that wants to name it.
 *
 * ## Mutation note — what the colocated cases actually catch
 *
 * A green suite is not evidence a case can fail. Each leg below was
 * measured by breaking this file, running `bun x vitest run
 * src/vite/gateway/run.test.ts` from `packages/dev-tools`, and
 * restoring it byte-identical (`shasum -a 256 -c` after every run,
 * `OK` each time). The baseline is `Tests 9 passed (9)` for this file,
 * and `Tests 58 passed (58)` for the directory.
 *
 * - Dropping the empty-argv guard answers `1 failed | 8 passed` —
 *   `answers an errno for an empty argv rather than throwing`, which
 *   reds on the synchronous `ERR_INVALID_ARG_VALUE` rather than on a
 *   wrong value.
 * - Never reporting a STRING `code` as an errno answers `2 failed | 7
 *   passed`: the `ENOENT` case and the output-cap case, the two rows
 *   of the table above that share that mapping.
 * - Dropping the numeric-`code` branch answers `1 failed | 8 passed` —
 *   `answers the exit code with the captured stderr`.
 * - Passing `shell: true` answers `6 failed | 3 passed`, the widest
 *   leg here: every case that spawns anything reds, the no-shell
 *   control among them. Breadth is the point — a shell is not a
 *   subtle change of behaviour, and the three survivors are the two
 *   cases that start no process and the contract assignment.
 * - Ignoring `timeoutMs` and always using {@link RAFA_RUN_TIMEOUT_MS}
 *   answers `1 failed | 8 passed` after 20 seconds — `answers no exit
 *   code when the timeout killed it`, reached through the case's own
 *   limit rather than through a wrong reading.
 * - Ignoring `maxBytes` answers `1 failed | 8 passed` — `answers the
 *   node error code when output passed the cap`.
 *
 * What no leg here pins is the one thing this file cannot pin: that
 * the real `rafa` prints rafa's NDJSON. The stand-in is node, by
 * design, and definition-of-done 1 is where the binary itself is run.
 */

import type { RafaRun, RafaRunResult } from './call';
import type { ExecException } from 'node:child_process';

import { execFile } from 'node:child_process';

/**
 * How long one rafa call may take before it is killed.
 *
 * Far above a normal call and far below forever: a create talks to a
 * tracker over the network, so seconds are ordinary and a minute is
 * already a call that will not come back. `./plugin.ts` gives `git`
 * five seconds for the same reason with a smaller number, that being
 * a local read.
 */
export const RAFA_RUN_TIMEOUT_MS = 60_000;

/**
 * The most output one rafa call may produce before it is aborted.
 *
 * rafa prints two NDJSON events; a list of every issue in a large
 * tracker is still kilobytes. Eight mebibytes is a guard against a
 * binary that streams, not a size anything is expected to approach.
 */
export const RAFA_RUN_OUTPUT_BYTES_MAX = 8 * 1024 * 1024;

/** The errno an argv with no usable first element is answered with. */
export const RAFA_RUN_EMPTY_ARGV_ERRNO = 'EINVAL';

/** What may be varied about a runner, both limits above being caps. */
export interface RafaRunSettings {
  /**
   * How long a call may take, default {@link RAFA_RUN_TIMEOUT_MS}.
   *
   * Configurable so a case can provoke a kill in a second rather than
   * in a minute; a consumer on a slow tracker may raise it.
   */
  readonly timeoutMs?: number;

  /**
   * The output cap, default {@link RAFA_RUN_OUTPUT_BYTES_MAX}.
   *
   * Configurable for the same reason: a case proves the cap by
   * setting a tiny one.
   */
  readonly maxBytes?: number;
}

/**
 * Build the answer for a process that never started.
 *
 * @param errno - The code to report.
 * @returns The frozen result.
 */
function unstarted(errno: string): RafaRunResult {
  return Object.freeze({ code: null, stdout: '', stderr: '', errno });
}

/**
 * Turn what `execFile` called back with into a {@link RafaRunResult}.
 *
 * @param error - node's error, or `null` when the process exited
 * zero.
 * @param stdout - Everything it printed, up to the cap.
 * @param stderr - Everything it printed to stderr, up to the cap.
 * @returns The frozen result, uninterpreted.
 */
function readOutcome(
  error: ExecException | null,
  stdout: string,
  stderr: string,
): RafaRunResult {
  if (error === null) {
    return Object.freeze({ code: 0, stdout, stderr, errno: null });
  }

  const { code } = error;

  if (typeof code === 'number') {
    return Object.freeze({ code, stdout, stderr, errno: null });
  }

  return Object.freeze({
    code: null,
    stdout,
    stderr,
    errno: typeof code === 'string'
      ? code
      : null,
  });
}

/**
 * Build a runner over `execFile`.
 *
 * @param settings - The timeout and the output cap; both default.
 * @returns A runner satisfying {@link RafaRun}, which never throws
 * and never rejects.
 */
export function createRafaRun(settings: RafaRunSettings = {}): RafaRun {
  const timeout = settings.timeoutMs ?? RAFA_RUN_TIMEOUT_MS;
  const maxBuffer = settings.maxBytes ?? RAFA_RUN_OUTPUT_BYTES_MAX;

  return (argv) => {
    const file = argv.at(0) ?? '';

    if (file === '') {
      return Promise.resolve(unstarted(RAFA_RUN_EMPTY_ARGV_ERRNO));
    }

    const args = argv.slice(1);

    return new Promise<RafaRunResult>((resolve) => {
      execFile(file, args, {
        encoding: 'utf8',
        maxBuffer,
        shell: false,
        timeout,
        windowsHide: true,
      }, (error, stdout, stderr) => {
        resolve(readOutcome(error, stdout, stderr));
      });
    });
  };
}

/**
 * The runner this package ships, built with both defaults.
 *
 * One instance, held for the module's life: it keeps no state between
 * calls, so concurrent calls through it are independent processes.
 */
export const rafaRun: RafaRun = createRafaRun();
