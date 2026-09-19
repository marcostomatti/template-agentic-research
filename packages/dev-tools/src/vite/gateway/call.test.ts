import type { RafaCall, RafaRun, RafaRunResult } from './call';

import { describe, expect, it } from 'vitest';

import { NO_RUNNER_REASON, REASON_TEXT_MAX, refuse, runRafa } from './call';

/**
 * ## What this file drives
 *
 * `./call.ts` alone: an argv and a finished process in, a result
 * event's `data` or a refusal out. What goes INTO an argv, and what a
 * `data` is allowed to contain, are `./rafa.test.ts`'s subject.
 *
 * Nothing here spawns anything. Every case hands `runRafa` a runner
 * of its own, so the four process outcomes — could not start, exited
 * non-zero, printed the wrong thing, refused — are arranged rather
 * than provoked, and the real `rafa` is never on the path of a test.
 *
 * The refusals run first and the one accepting case is last, which is
 * this plan's order for every test file in the package. Each refusal
 * varies ONE thing away from that accepting case, so a `runRafa` that
 * refused everything would fail the last case rather than pass these.
 */

/** The label every case below passes, and every reason names. */
const LABEL = 'rafa issue list';

/** The argv every case runs; its content is `./rafa.test.ts`'s job. */
const ARGV = Object.freeze(['rafa', 'issue', 'list', '--output=json']);

/** The start event rafa prints before every result event. */
const START = JSON.stringify({
  type: 'start',
  command: 'issue list',
  ts: '2026-09-19T21:47:53.941Z',
});

/** A result event carrying two issues, as `issue list` answers. */
const RESULT = JSON.stringify({
  type: 'result',
  ok: true,
  data: { tracker: { kind: 'github' }, query: {}, issues: [] },
});

/**
 * A process that exited zero and printed `stdout`.
 *
 * @param stdout - What it printed.
 * @returns The runner answer.
 */
function printed(stdout: string): RafaRunResult {
  return { code: 0, stdout, stderr: '', errno: null };
}

/**
 * A runner answering one fixed result, recording what it was given.
 *
 * @param result - What the one call answers.
 * @returns The runner and the argv list it fills.
 */
function runnerFor(result: RafaRunResult): {
  readonly run: RafaRun;
  readonly calls: string[][];
} {
  const calls: string[][] = [];

  return {
    calls,
    run: (argv) => {
      calls.push([...argv]);

      return Promise.resolve(result);
    },
  };
}

/**
 * The reason a refused call carries.
 *
 * @param answered - What {@link runRafa} answered.
 * @returns The reason, or `''` when the call was not refused — which
 * reds the case that read it, every caller below having arranged a
 * refusal.
 */
function reasonOf(answered: RafaCall): string {
  return answered.ok
    ? ''
    : answered.refusal.reason;
}

describe('the refusals of one rafa call', () => {
  it('refuses when no runner is configured', async () => {
    // Arrange + Act: the state this stage ships in, `./run.ts` being
    // the next task.
    const answered = await runRafa(undefined, ARGV, LABEL);

    // Assert
    expect(answered.ok).toBe(false);
    expect(answered).toMatchObject({
      ok: false,
      refusal: { status: 'refused', reason: NO_RUNNER_REASON },
    });
  });

  it('refuses when the runner rejects, naming the cause', async () => {
    // Arrange: an injected runner is not necessarily `./run.ts`, and
    // one that rejects must not make the gateway throw.
    const run: RafaRun = () => Promise.reject(new Error('spawn blew up'));

    // Act
    const answered = await runRafa(run, ARGV, LABEL);

    // Assert
    expect(answered.ok).toBe(false);
    expect(reasonOf(answered))
      .toBe(`${LABEL} could not be run: spawn blew up`);
  });

  it('refuses when the runner throws synchronously', async () => {
    // Arrange: a runner that is not even a promise-returning one.
    const run = (() => {
      throw new Error('not callable');
    }) as unknown as RafaRun;

    // Act
    const answered = await runRafa(run, ARGV, LABEL);

    // Assert
    expect(answered.ok).toBe(false);
    expect(reasonOf(answered))
      .toContain('not callable');
  });

  it('refuses a binary that could not be started', async () => {
    // Arrange: the ENOENT case — a machine with no rafa installed.
    const { run } = runnerFor({
      code: null,
      stdout: '',
      stderr: '',
      errno: 'ENOENT',
    });

    // Act
    const answered = await runRafa(run, ARGV, LABEL);

    // Assert
    expect(answered.ok).toBe(false);
    expect(reasonOf(answered))
      .toBe(`${LABEL} could not be started (ENOENT).`);
  });

  it('refuses a non-zero exit, carrying its stderr line', async () => {
    // Arrange
    const { run } = runnerFor({
      code: 1,
      stdout: '',
      stderr: 'error: no tracker is configured\n',
      errno: null,
    });

    // Act
    const answered = await runRafa(run, ARGV, LABEL);

    // Assert
    expect(answered.ok).toBe(false);
    expect(reasonOf(answered))
      .toBe(`${LABEL} exited 1: error: no tracker is configured`);
  });

  it('refuses a non-zero exit that printed no stderr', async () => {
    // Arrange: the control over the case above — the reason must not
    // end in a dangling colon when there is no line to carry.
    const { run } = runnerFor({
      code: 2,
      stdout: '',
      stderr: '   \n\n',
      errno: null,
    });

    // Act
    const answered = await runRafa(run, ARGV, LABEL);

    // Assert
    expect(reasonOf(answered))
      .toBe(`${LABEL} exited 2.`);
  });

  it('refuses a process that never exited normally', async () => {
    // Arrange: where a timeout lands — killed, so no exit code.
    const { run } = runnerFor({
      code: null,
      stdout: '',
      stderr: 'timed out after 30s',
      errno: null,
    });

    // Act
    const answered = await runRafa(run, ARGV, LABEL);

    // Assert
    expect(reasonOf(answered))
      .toBe(`${LABEL} did not exit normally: timed out after 30s`);
  });

  it('strips control characters out of a stderr line', async () => {
    // Arrange: an ESC would rewrite a terminal printing the reason,
    // and a reason is one line by contract.
    const { run } = runnerFor({
      code: 1,
      stdout: '',
      stderr: 'a\u{1b}[31mb\tc',
      errno: null,
    });

    // Act
    const answered = await runRafa(run, ARGV, LABEL);

    // Assert
    const reason = reasonOf(answered);

    expect(reason).toBe(`${LABEL} exited 1: a [31mb c`);
    expect(reason).not.toContain('\u{1b}');
  });

  it('caps a stderr line at the reason length', async () => {
    // Arrange: both sides of the cap, so a moved limit reds a half.
    const over = runnerFor({
      code: 1,
      stdout: '',
      stderr: 'x'.repeat(REASON_TEXT_MAX + 1),
      errno: null,
    });
    const at = runnerFor({
      code: 1,
      stdout: '',
      stderr: 'y'.repeat(REASON_TEXT_MAX),
      errno: null,
    });

    // Act
    const long = await runRafa(over.run, ARGV, LABEL);
    const exact = await runRafa(at.run, ARGV, LABEL);

    // Assert
    expect(reasonOf(long)).toContain(
      `${'x'.repeat(REASON_TEXT_MAX)}...`,
    );
    expect(reasonOf(exact)).toContain(
      'y'.repeat(REASON_TEXT_MAX),
    );
    expect(reasonOf(exact)).not.toContain('...');
  });

  it('refuses output that is not NDJSON', async () => {
    // Arrange: a line that is not JSON at all refuses the whole
    // output rather than being skipped past.
    const noise = `${START}\nnot json at all\n${RESULT}`;
    const { run } = runnerFor(printed(noise));

    // Act
    const answered = await runRafa(run, ARGV, LABEL);

    // Assert
    expect(answered.ok).toBe(false);
    expect(reasonOf(answered))
      .toBe(`${LABEL} answered output that is not NDJSON.`);
  });

  it('refuses a JSON line that is not an object', async () => {
    // Arrange: `JSON.parse` succeeds on a bare number, so parsing is
    // not on its own enough to call a line an event.
    const { run } = runnerFor(printed(`${START}\n42\n${RESULT}`));

    // Act
    const answered = await runRafa(run, ARGV, LABEL);

    // Assert
    expect(reasonOf(answered))
      .toBe(`${LABEL} answered output that is not NDJSON.`);
  });

  it('refuses output with no result event in it', async () => {
    // Arrange: the start event alone, which is what a rafa killed
    // mid-call would leave behind.
    const { run } = runnerFor(printed(START));

    // Act
    const answered = await runRafa(run, ARGV, LABEL);

    // Assert
    expect(reasonOf(answered))
      .toBe(`${LABEL} answered no result event.`);
  });

  it('refuses a process that printed nothing at all', async () => {
    // Arrange + Act
    const { run } = runnerFor(printed('   \n\n'));
    const answered = await runRafa(run, ARGV, LABEL);

    // Assert
    expect(reasonOf(answered))
      .toBe(`${LABEL} answered no output.`);
  });

  it('refuses a result event whose ok is false', async () => {
    // Arrange
    const event = JSON.stringify({
      type: 'result',
      ok: false,
      error: 'gh auth login is required',
    });
    const { run } = runnerFor(printed(`${START}\n${event}`));

    // Act
    const answered = await runRafa(run, ARGV, LABEL);

    // Assert
    expect(answered.ok).toBe(false);
    expect(reasonOf(answered))
      .toBe(`${LABEL} refused this call: gh auth login is required`);
  });

  it('reads an error carried as an object with a message', async () => {
    // Arrange: the second accepted shape, the field never having
    // been read live.
    const event = JSON.stringify({
      type: 'result',
      ok: false,
      error: { message: 'rate limited' },
    });
    const { run } = runnerFor(printed(`${START}\n${event}`));

    // Act
    const answered = await runRafa(run, ARGV, LABEL);

    // Assert
    expect(reasonOf(answered))
      .toBe(`${LABEL} refused this call: rate limited`);
  });

  it('refuses without an error text when the shape is other', async () => {
    // Arrange: the control over the two cases above — an error rafa
    // spelled some third way still refuses, with a fixed sentence.
    const shape = { type: 'result', ok: false, error: [1, 2] };
    const event = JSON.stringify(shape);
    const { run } = runnerFor(printed(`${START}\n${event}`));

    // Act
    const answered = await runRafa(run, ARGV, LABEL);

    // Assert
    expect(reasonOf(answered))
      .toBe(`${LABEL} refused this call.`);
  });

  it('never names the argv in a refusal', async () => {
    // Arrange: a reason carries the fixed label and rafa's own
    // output, never a request-chosen value.
    const secret = 'a-title-nobody-should-see';
    const { run } = runnerFor({
      code: 1,
      stdout: '',
      stderr: 'refused',
      errno: null,
    });

    // Act
    const answered = await runRafa(
      run,
      [...ARGV, `--search=${secret}`],
      LABEL,
    );

    // Assert
    expect(reasonOf(answered)).not.toContain(secret);
  });
});

describe('a rafa call that answered', () => {
  it('answers the last result event data and the argv it ran', async () => {
    // Arrange: the two-event NDJSON measured at plan time.
    const event = JSON.stringify({
      type: 'result',
      ok: true,
      data: { tracker: { kind: 'github' }, issues: [{ title: 'one' }] },
    });
    const { calls, run } = runnerFor(printed(`${START}\n${event}\n`));

    // Act
    const answered = await runRafa(run, ARGV, LABEL);

    // Assert
    expect(answered.ok).toBe(true);
    const data = answered.ok
      ? answered.data
      : null;

    expect(data).toStrictEqual({
      tracker: { kind: 'github' },
      issues: [{ title: 'one' }],
    });
    expect(calls).toStrictEqual([[...ARGV]]);
  });

  it('reads events separated by CRLF as well as by LF', async () => {
    // Arrange + Act
    const { run } = runnerFor(printed(`${START}\r\n${RESULT}\r\n`));
    const answered = await runRafa(run, ARGV, LABEL);

    // Assert
    expect(answered.ok).toBe(true);
  });

  it('builds a refusal a caller can answer with as-is', async () => {
    // Arrange + Act: `refuse` is shared with `./rafa.ts`, which
    // refuses for things no process is run for.
    const refusal = refuse('nothing was run');

    // Assert
    expect(refusal).toStrictEqual({
      status: 'refused',
      reason: 'nothing was run',
    });
    expect(Object.isFrozen(refusal)).toBe(true);
  });
});
