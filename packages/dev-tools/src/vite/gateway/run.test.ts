import type { RafaRun } from './call';

import { describe, expect, it } from 'vitest';

import { runRafa } from './call';
import {
  RAFA_RUN_EMPTY_ARGV_ERRNO,
  RAFA_RUN_OUTPUT_BYTES_MAX,
  RAFA_RUN_TIMEOUT_MS,
  createRafaRun,
  rafaRun,
} from './run';

/**
 * ## What this file drives
 *
 * `./run.ts` alone, and it is the ONE file in this directory that
 * really starts a process. `./call.test.ts` arranges the four process
 * outcomes and `./rafa.test.ts` arranges an answer; here each outcome
 * is PROVOKED, because the whole value of this module is that it maps
 * what node actually does onto `RafaRunResult` — a mapping no fake can
 * check.
 *
 * The binary every case runs is node itself, never `rafa`: the plan's
 * law that a test never runs the real binary holds, and running node
 * with `-e` gives a child whose exit code, stdout, stderr and lifetime
 * are all stated in the case that spawns it.
 *
 * The refusals run first — an empty argv, a binary that is not there,
 * a non-zero exit, a kill by timeout, an output over the cap — and the
 * accepting cases last, which is this plan's order for every test file
 * in the package. The last of them is the no-shell control: an
 * argument carrying a space, a semicolon and a `$(...)` substitution
 * must arrive as ONE element with those bytes still in it, which is
 * spec decision 6 read as a measurement rather than as a comment.
 */

/** The binary every case runs instead of `rafa`. */
const NODE = process.execPath;

/** A child printing its own arguments back, as JSON. */
const PRINT_ARGV
  = 'process.stdout.write(JSON.stringify(process.argv.slice(1)))';

/** A child printing rafa's two events, as `--output=json` does. */
const PRINT_EVENTS = 'process.stdout.write('
  + '\'{"type":"start","command":"issue list"}\\n\''
  + '+ \'{"type":"result","ok":true,"data":{"tracker":{"kind":"github"}}}\\n\''
  + ')';

/** A child writing to stderr and exiting non-zero. */
const FAIL_LOUDLY = 'process.stderr.write("rafa: not authenticated\\n");'
  + 'process.exit(3)';

/** A child that never exits on its own. */
const NEVER_EXIT = 'setTimeout(function () {}, 300000)';

/** A child printing far more than a tiny cap allows. */
const PRINT_MANY = 'process.stdout.write("x".repeat(5000))';

/** How long a case may wait on a child it expects to be killed. */
const KILL_CASE_TIMEOUT_MS = 20_000;

/** The timeout a case that provokes a kill runs with. */
const SHORT_TIMEOUT_MS = 1_000;

/** The label a refusal carries when this file calls `runRafa`. */
const LABEL = 'rafa issue list';

describe('a command this runner never starts', () => {
  it('answers an errno for an empty argv rather than throwing', async () => {
    // Arrange: `execFile('')` throws ERR_INVALID_ARG_VALUE
    // synchronously, so an unguarded runner would throw out of a
    // gateway call instead of answering it.
    // Act
    const answered = await rafaRun([]);

    // Assert
    expect(answered).toStrictEqual({
      code: null,
      stdout: '',
      stderr: '',
      errno: RAFA_RUN_EMPTY_ARGV_ERRNO,
    });
  });

  it('answers ENOENT when the binary is not on the PATH', async () => {
    // Arrange: the ordinary case on a machine with no rafa installed.
    // Act
    const answered = await rafaRun([
      'devtools-no-such-binary-ever',
      'issue',
      'list',
    ]);

    // Assert
    expect(answered.errno).toBe('ENOENT');
    expect(answered.code).toBeNull();
    expect(answered.stdout).toBe('');
  });
});

describe('a command that ran and failed', () => {
  it('answers the exit code with the captured stderr', async () => {
    // Arrange + Act
    const answered = await rafaRun([NODE, '-e', FAIL_LOUDLY]);

    // Assert: the code is the number node reported, not a null, and
    // the stderr line is there for `./call.ts` to put in a reason.
    expect(answered.code).toBe(3);
    expect(answered.errno).toBeNull();
    expect(answered.stderr).toContain('rafa: not authenticated');
  });

  it('answers no exit code when the timeout killed it', async () => {
    // Arrange: a child that would outlive the dev server, run with a
    // second instead of the shipped minute.
    const run = createRafaRun({ timeoutMs: SHORT_TIMEOUT_MS });

    // Act
    const answered = await run([NODE, '-e', NEVER_EXIT]);

    // Assert: a kill is neither an exit status nor a spawn failure, so
    // `./call.ts` reads it as "did not exit normally".
    expect(answered.code).toBeNull();
    expect(answered.errno).toBeNull();
    expect(answered.stdout).toBe('');
  }, KILL_CASE_TIMEOUT_MS);

  it('answers the node error code when output passed the cap', async () => {
    // Arrange: a cap far below the shipped one, so the guard is
    // provoked rather than described.
    const run = createRafaRun({ maxBytes: 100 });

    // Act
    const answered = await run([NODE, '-e', PRINT_MANY]);

    // Assert: a STRING code reaches `errno` verbatim, which is the one
    // row where `./call.ts` will say "could not be started" about a
    // process that did start — stated in `./run.ts`'s header.
    expect(answered.errno).toBe('ERR_CHILD_PROCESS_STDIO_MAXBUFFER');
    expect(answered.code).toBeNull();
    expect(RAFA_RUN_OUTPUT_BYTES_MAX).toBeGreaterThan(100);
  });
});

describe('a command that ran and worked', () => {
  it('answers code zero with the captured stdout', async () => {
    // Arrange + Act
    const answered = await rafaRun([NODE, '-e', PRINT_ARGV, 'issue', 'list']);

    // Assert
    expect(answered.code).toBe(0);
    expect(answered.errno).toBeNull();
    expect(answered.stderr).toBe('');
    expect(JSON.parse(answered.stdout)).toStrictEqual(['issue', 'list']);
  });

  it('keeps an argument whole, so nothing reads it as a shell', async () => {
    // Arrange: the three things a shell would change — a space, a
    // command separator and a substitution — in one title, as
    // `./rafa.ts` builds it.
    const title = '--title=[fb/round-1] Modal traps focus; echo $(pwd)';

    // Act: the `--` is node's own end-of-options marker and reaches
    // the child as nothing. Without it node reads `--title=` as one of
    // ITS options and exits 9 (measured), which says nothing about
    // this runner and everything about the stand-in binary.
    const answered = await rafaRun([
      NODE,
      '-e',
      PRINT_ARGV,
      '--',
      title,
      '--type=bug',
    ]);

    // Assert: two arguments arrive, and the first is byte-for-byte the
    // one that was passed. Under a shell it would have been split at
    // the semicolon and the substitution would have run.
    expect(answered.code).toBe(0);
    expect(JSON.parse(answered.stdout)).toStrictEqual([title, '--type=bug']);
  });

  it('feeds runRafa, which reads the NDJSON the child printed', async () => {
    // Arrange + Act: the two halves of this directory over one real
    // process — the runner starting it and `./call.ts` reading it.
    const answered = await runRafa(
      rafaRun,
      [NODE, '-e', PRINT_EVENTS],
      LABEL,
    );

    // Assert
    expect(answered.ok).toBe(true);
    expect(answered.ok
      ? answered.data
      : null).toStrictEqual({ tracker: { kind: 'github' } });
  });

  it('satisfies the contract the gateway is configured with', () => {
    // Arrange + Act: the assignment is the assertion — `RafaRun` is
    // what `rafaGateway({run})` takes, so a drift in either signature
    // reds `check-types` here.
    const run: RafaRun = rafaRun;

    // Assert
    expect(typeof run).toBe('function');
    expect(RAFA_RUN_TIMEOUT_MS).toBeGreaterThan(SHORT_TIMEOUT_MS);
  });
});
