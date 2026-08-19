import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createCronDependency } from './index.js';

function makeLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
    child: vi.fn(),
  } as never;
}

describe('createCronDependency', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejects duplicate job names', () => {
    expect(() => createCronDependency(
      [
        { name: 'a', intervalMs: 1000, run: async () => {} },
        { name: 'a', intervalMs: 2000, run: async () => {} },
      ],
      makeLogger(),
    )).toThrow(/duplicate job name/);
  });

  it('runs jobs on their interval and stops cleanly', async () => {
    const run = vi.fn(async () => {});
    const dep = createCronDependency([{ name: 'tick', intervalMs: 1000, run }], makeLogger());

    await dep.start();
    expect(dep.client.isRunning()).toBe(true);

    await vi.advanceTimersByTimeAsync(3100);
    expect(run).toHaveBeenCalledTimes(3);

    await dep.stop();
    expect(dep.client.isRunning()).toBe(false);
    await vi.advanceTimersByTimeAsync(5000);
    expect(run).toHaveBeenCalledTimes(3);
  });

  it('runs immediately when runOnStart is set', async () => {
    const run = vi.fn(async () => {});
    const dep = createCronDependency(
      [{ name: 'eager', intervalMs: 60_000, run, runOnStart: true }],
      makeLogger(),
    );

    await dep.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(run).toHaveBeenCalledTimes(1);
    await dep.stop();
  });

  it('suppresses overlapping runs of the same job', async () => {
    let resolveRun!: () => void;
    const run = vi.fn(() => new Promise<void>((resolve) => {
      resolveRun = resolve;
    }));
    const logger = makeLogger();
    const dep = createCronDependency([{ name: 'slow', intervalMs: 1000, run }], logger);

    await dep.start();
    await vi.advanceTimersByTimeAsync(1000); // first tick — hangs
    await vi.advanceTimersByTimeAsync(1000); // second tick — must be skipped
    expect(run).toHaveBeenCalledTimes(1);
    expect((logger as { warn: ReturnType<typeof vi.fn> }).warn).toHaveBeenCalledWith(
      { job: 'slow' },
      expect.stringContaining('skipped'),
    );

    resolveRun();
    await vi.advanceTimersByTimeAsync(1000); // next tick runs again
    expect(run).toHaveBeenCalledTimes(2);
    await dep.stop();
  });

  it('contains job errors and keeps the schedule going', async () => {
    const boom = vi.fn(async () => {
      throw new Error('boom');
    });
    const logger = makeLogger();
    const dep = createCronDependency([{ name: 'flaky', intervalMs: 1000, run: boom }], logger);

    await dep.start();
    await vi.advanceTimersByTimeAsync(2100);
    expect(boom).toHaveBeenCalledTimes(2);
    expect((logger as { warn: ReturnType<typeof vi.fn> }).warn).toHaveBeenCalledWith(
      expect.objectContaining({ job: 'flaky' }),
      'cron job failed',
    );
    await dep.stop();
  });

  it('routes errors to onError when provided', async () => {
    const onError = vi.fn();
    const dep = createCronDependency(
      [{
        name: 'handled',
        intervalMs: 1000,
        run: async () => {
          throw new Error('handled-err');
        },
        onError,
      }],
      makeLogger(),
    );

    await dep.start();
    await vi.advanceTimersByTimeAsync(1100);
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    await dep.stop();
  });
});
