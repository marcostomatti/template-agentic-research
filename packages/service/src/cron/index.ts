/**
 * @packageDocumentation
 * Minimal recurring-job runner, packaged as a managed service dependency.
 *
 * Interval-based on purpose — nothing here has needed cron expressions or
 * timezone math yet. If that day comes, swap the internals for `croner` and
 * keep the {@link CronJob} contract.
 *
 * Guarantees:
 * - Overlap suppression: a job still running when its next tick fires is
 *   skipped (with a warn log), never run concurrently with itself.
 * - Errors never escape: a throwing `run()` is logged (or handed to the
 *   job's `onError`) and the schedule keeps going.
 * - Timers are `unref()`ed so a stray scheduler can't keep the process alive.
 * - As a `TypedDependency`, jobs start on service start and stop on graceful
 *   shutdown, and show up under `/_control/dependencies`.
 */
import type { Logger } from '../../lib/logger/node.js';
import type { TypedDependency } from '../../lib/service-core/index.js';

import { createDependency } from '../../lib/service-core/index.js';

export interface CronJob {
  /** Unique job name, used in logs. */
  name: string;
  /** Interval between run starts, in milliseconds. */
  intervalMs: number;
  /** The work. Async; a rejection is contained and logged. */
  run(): Promise<void>;
  /** Optional error hook; defaults to a warn log. */
  onError?(error: unknown): void;
  /** Run once immediately on start instead of waiting a full interval. */
  runOnStart?: boolean;
}

export interface CronRunner {
  /** Names of registered jobs. */
  jobs(): string[];
  /** True while the runner is started. */
  isRunning(): boolean;
}

/**
 * Creates the cron runner as a managed dependency.
 *
 * @param jobsToRun - The recurring jobs to schedule.
 * @param logger - Service logger for job lifecycle and error logs.
 * @returns A `TypedDependency<CronRunner>` for `createService({ dependencies })`.
 *
 * @example
 * ```ts
 * const cronDep = createCronDependency([
 *   { name: 'cleanup-expired', intervalMs: 60_000, run: () => cleanupExpired(db) },
 * ], logger);
 * await createService({ serviceId: '…', dependencies: [dbDep, cronDep], register() {} });
 * ```
 */
export function createCronDependency(
  jobsToRun: CronJob[],
  logger: Logger,
): TypedDependency<CronRunner> {
  const names = new Set<string>();
  for (const job of jobsToRun) {
    if (names.has(job.name)) {
      throw new Error(`[cron] duplicate job name "${job.name}"`);
    }
    names.add(job.name);
  }

  const timers = new Map<string, ReturnType<typeof setInterval>>();
  const inFlight = new Set<string>();
  let running = false;

  const tick = async (job: CronJob): Promise<void> => {
    if (inFlight.has(job.name)) {
      logger.warn({ job: job.name }, 'cron tick skipped — previous run still in flight');
      return;
    }
    inFlight.add(job.name);
    try {
      await job.run();
    } catch (error) {
      if (job.onError) {
        job.onError(error);
      } else {
        logger.warn({ job: job.name, err: error }, 'cron job failed');
      }
    } finally {
      inFlight.delete(job.name);
    }
  };

  const runner: CronRunner = {
    jobs: () => [...names],
    isRunning: () => running,
  };

  return createDependency({
    name: 'cron',
    client: runner,
    async onStart() {
      running = true;
      for (const job of jobsToRun) {
        const timer = setInterval(() => {
          void tick(job);
        }, job.intervalMs);
        timer.unref();
        timers.set(job.name, timer);
        logger.info({ job: job.name, intervalMs: job.intervalMs }, 'cron job scheduled');
        if (job.runOnStart) void tick(job);
      }
    },
    async onStop() {
      running = false;
      for (const [name, timer] of timers) {
        clearInterval(timer);
        logger.info({ job: name }, 'cron job stopped');
      }
      timers.clear();
    },
  });
}
