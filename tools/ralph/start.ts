#!/usr/bin/env bun

/**
 * ralph start — the task loop.
 *
 * Walks the plan's tracker checklist one task at a time, delegating each task
 * to a Claude Code session, marking `[x]` on success and `[BLOCKED]` on
 * failure or interrupt. Re-running resumes: blocked tasks are retried first.
 *
 *   bun tools/ralph/ralph.ts start [--plan=PLAN-foo.md] [--start-at=HH:MM]
 *
 * --plan        plan file to execute (default: PLAN.md at the repo root). The
 *               tracker is derived per plan (PLAN-foo.md → PLAN_TRACKER-foo.md)
 *               so several plans can coexist.
 * --start-at    defer the run until a local time of day (e.g. 23:00) — queue
 *               off-hours runs without cron.
 * --no-ci-wait  finish at the push instead of waiting for CI.
 * --ci-timeout  minutes to wait for checks to settle (default 20).
 * --ci-attempts repair sessions to spend on a red or conflicting PR
 *               before escalating (default 2; 0 disables repair but
 *               still reports the verdict).
 *
 * After the last task the loop runs a wrap-up session (promote findings,
 * sync with main, commit, push, open or update the PR) and then WAITS on
 * that PR's checks. A conflicting PR gets no CI run at all, so without
 * this last stage the loop can report a finished plan whose code was
 * never checked once.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { runClaude, checkUsage } from './utils/claude.js';
import { getCurrentBranch, getRepoRoot } from './utils/git.js';
import {
  failingRows,
  findOpenPullRequest,
  formatRows,
  isGhUsable,
  probeChecks,
  readMergeState,
  waitForChecks,
} from './utils/pr.js';
import { deferUntil } from './utils/schedule.js';
import { findNextTask, trackerPathFor, updateTrackerLine } from './utils/tracker.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let interrupted = false;

async function preserveProgress(): Promise<void> {
  const branch = getCurrentBranch();

  const prompt = [
    '* Read `@progress.txt` in full.',
    '* If there\'s anything worth keeping, grab what\'s generally relevant from `@progress.txt` and include it in `@AGENTS.md`, `@README.md`, `@CONTRIBUTING.md` or a pertinent skill under `.claude/skills/`.',
    '* If a learn/learn-eval skill is available in this session, invoke it now so reusable patterns from this run are persisted as skills.',
    '* Then compact `@progress.txt` per `.claude/skills/progress-hygiene/SKILL.md`: drop every finding that was just persisted somewhere durable and anything stale or task-specific; keep only broadly-relevant findings not yet promoted. The file must stay small — future plan generation injects it as context.',
    '* If it\'s present, extract the issue reference from the plan file (e.g. "#42") to be used in the PR title.',
    `* If the reference is not present on the plan check if the branch name (${branch}) carries one (e.g. feat/42-slug).`,
    '* Use the plan title as the PR title, include the issue reference if you found it, e.g. "Implement user authentication (#42)".',
    '* Create a concise yet descriptive PR description that summarizes the overall work done based on the completed plan and progress notes.',
    '* BEFORE pushing, bring the branch up to date with the base: `git fetch origin main` then `git merge origin/main`. A branch that conflicts with main gets NO CI run at all — GitHub cannot build `refs/pull/<n>/merge` for it — so a conflicted PR is a plan reported finished whose code was never once checked. Resolving here, where the plan\'s context is still loaded, is the cheapest place it will ever be.',
    '* Resolve MECHANICAL conflicts yourself and do not stop for them: dependency version bumps (take the base\'s version unless this branch deliberately pinned it, and say which in the commit), lockfiles, generated artifacts, and complementary additions where both sides appended different material to the same file (keep BOTH). Stop only for a genuine semantic conflict — two sides changing the same behaviour incompatibly. In that case commit nothing, leave the branch as it is, and report the conflicting paths and both sides\' intent, so a human decides.',
    '* If the merge touched `bun.lock` or any `package.json`, run `bun install --frozen-lockfile` and require it to pass BEFORE pushing. It is the one-second local reproduction of the CI install step, and it catches a lockfile that no longer matches the merged manifests — the failure mode where every CI job dies at its first step and nothing downstream runs. When it fails, do NOT hand-edit the lockfile: restore the base\'s copy (`git checkout origin/main -- bun.lock`), run a plain `bun install` so this branch\'s own dependencies are re-added, and confirm the frozen run then passes.',
    `* Commit these changes and push them to the CURRENT branch (${branch}). Never create a branch here: the work under review is this branch's, and a second branch splits one plan across two reviews.`,
    '* This step is IDEMPOTENT because a plan\'s own close-out may already have opened the PR. Read the state first with `gh pr list --head <branch> --state open --json number`: when it names a PR, push to it and update its body with `gh pr edit` so the description covers the promotions this session just committed; only create one with `gh pr create` when that list is empty. A `gh pr create` failure saying the PR already exists is the expected shape of that race, never a reason to open a second PR from a new branch.',
    '* Do not include Claude attribution in the commit or PR message.',
  ].join('\n');

  const exitCode = await runClaude(prompt);
  if (exitCode !== 0) {
    console.error(`\n❌ Failed to preserve progress (exit ${exitCode}). Please try again.`);
  } else {
    console.log('\n✅ Progress preserved; PR opened or updated on this branch.');
  }
}

/** How long to keep polling a PR's checks before giving up on them. */
const DEFAULT_CI_TIMEOUT_MIN = 20;

/** Seconds between polls. CI here settles in 2-5 minutes. */
const CI_POLL_INTERVAL_MS = 20_000;

/** Repair sessions spent on a red or conflicting PR before escalating. */
const DEFAULT_CI_ATTEMPTS = 2;

/**
 * Runs one Claude session to repair a PR that CI has rejected.
 *
 * The session is told what failed and where, and explicitly told not to
 * open a second PR — the branch already has one, and a new branch would
 * split a single plan across two reviews.
 */
async function repairPullRequest(
  prNumber: number,
  branch: string,
  reason: string,
  detail: string,
): Promise<number> {
  const prompt = [
    `The pull request for branch \`${branch}\` (#${prNumber}) is not mergeable: ${reason}`,
    '',
    detail,
    '',
    '* Diagnose the ACTUAL cause before changing anything. For a failing GitHub Actions job, read its log: `gh run view <run-id> --log-failed`, or `gh api repos/<owner>/<repo>/actions/jobs/<job-id>/logs` while other jobs in the run are still going. Identify which STEP failed — a job that dies at `Install dependencies` says nothing about the tests, and the fix is not in the test files.',
    '* A `lockfile had changes, but lockfile is frozen` failure means `bun.lock` no longer matches the manifests. Restore the base copy with `git checkout origin/main -- bun.lock`, run a plain `bun install` to re-add this branch\'s own dependencies, and verify with `bun install --frozen-lockfile`. Never hand-edit the lockfile.',
    '* Reproduce locally before pushing a fix, and re-run the affected gate (`bun run lint:all`, `bun run check-types:all`, `bun run test:all`) so the push is not a guess.',
    '* A test that fails under the full suite and passes when run alone is the known parallel-load flake, not a regression. Re-run the file alone to establish which it is, and if it is the flake, say so and change nothing.',
    `* Commit the fix and push to the CURRENT branch (${branch}). Do NOT create a branch and do NOT open a second PR — #${prNumber} already exists and will pick the push up.`,
    '* If the cause is a genuine semantic conflict or a real defect you cannot fix without a product decision, change nothing, and report what you found and what the options are.',
    '* Do not include Claude attribution in the commit message.',
  ].join('\n');

  return runClaude(prompt);
}

/**
 * The wrap-up's last gate: a PR is not done until CI has spoken about it.
 *
 * Polls the PR's checks, and spends up to `maxAttempts` repair sessions on
 * a red or conflicting result before escalating to the operator. Skips
 * itself cleanly when `gh` is unusable, so the loop still works offline.
 */
async function verifyPullRequest(timeoutMs: number, maxAttempts: number): Promise<void> {
  const branch = getCurrentBranch();

  if (!isGhUsable()) {
    console.warn('\n⚠️  `gh` is not available or not authenticated — skipping the CI check.');
    console.warn('   The PR has been pushed but nothing here confirms CI agreed with it.');
    return;
  }

  for (let attempt = 0; attempt <= maxAttempts; attempt++) {
    const prNumber = findOpenPullRequest(branch);
    if (prNumber === null) {
      console.warn(`\n⚠️  No open PR found for ${branch}. Nothing to verify.`);
      return;
    }

    console.log(`\n⏳ Waiting for CI on PR #${prNumber} (up to ${Math.round(timeoutMs / 60000)} min)...`);

    const result = await waitForChecks({
      probe: () => Promise.resolve(probeChecks(prNumber)),
      timeoutMs,
      intervalMs: CI_POLL_INTERVAL_MS,
      onPoll: (rows, verdict, elapsedMs) => {
        const secs = Math.round(elapsedMs / 1000);
        console.log(`   [${secs}s] ${verdict} — ${rows.length} check(s)`);
      },
    });

    if (result.verdict === 'green') {
      console.log(`\n✅ CI green on PR #${prNumber}:`);
      console.log(formatRows(result.rows));
      return;
    }

    if (result.verdict === 'timeout') {
      console.warn(`\n⚠️  CI still running after ${Math.round(result.elapsedMs / 1000)}s. Not waiting further.`);
      console.warn(formatRows(result.rows));
      console.warn(`   Check it yourself: gh pr checks ${prNumber}`);
      return;
    }

    if (attempt === maxAttempts) break;

    // `none` and `red` both get a repair session, with different framing:
    // no checks at all is almost always a conflict, since GitHub cannot
    // build a merge ref for a PR that does not merge cleanly.
    const merge = readMergeState(prNumber);
    if (result.verdict === 'none') {
      if (merge?.state === 'MERGED') {
        console.log(`\n✅ PR #${prNumber} is already merged.`);
        return;
      }
      if (merge !== null && merge.mergeStateStatus !== 'DIRTY') {
        console.warn(`\n⚠️  PR #${prNumber} reports no checks and is not conflicting`);
        console.warn(`   (mergeable=${merge.mergeable} state=${merge.mergeStateStatus}).`);
        console.warn('   Most likely no workflow matches the changed paths. Nothing to repair.');
        return;
      }
      console.warn(`\n❌ PR #${prNumber} has no checks — it does not merge cleanly, so GitHub scheduled no run.`);
      const exitCode = await repairPullRequest(
        prNumber,
        branch,
        'it conflicts with the base branch, so GitHub scheduled no CI run at all.',
        'Merge `origin/main` into this branch and resolve the conflicts, then push. Mechanical conflicts (versions, lockfiles, complementary additions) are yours to resolve; a genuine semantic conflict is not.',
      );
      if (exitCode !== 0) {
        console.error(`\n❌ Conflict-repair session failed (exit ${exitCode}).`);
        return;
      }
      continue;
    }

    console.warn(`\n❌ CI red on PR #${prNumber}:`);
    console.warn(formatRows(result.rows));
    const failed = failingRows(result.rows);
    const exitCode = await repairPullRequest(
      prNumber,
      branch,
      'its CI checks failed.',
      ['The failing checks are:', formatRows(failed)].join('\n'),
    );
    if (exitCode !== 0) {
      console.error(`\n❌ CI-repair session failed (exit ${exitCode}).`);
      return;
    }
  }

  console.error(`\n❌ CI still not green after ${maxAttempts} repair attempt(s) on ${branch}.`);
  console.error('   Stopping rather than looping. Read the failing jobs and decide.');
}

function argValue(args: string[], flag: string): string | undefined {
  const hit = args.find((a) => a.startsWith(`${flag}=`));
  return hit?.slice(flag.length + 1);
}

export default async function start(args: string[]): Promise<void> {
  const repoRoot = getRepoRoot();

  const startAt = argValue(args, '--start-at');
  if (startAt) await deferUntil(startAt);

  const ciWait = !args.includes('--no-ci-wait');
  const ciTimeoutMin = Number(argValue(args, '--ci-timeout') ?? DEFAULT_CI_TIMEOUT_MIN);
  const ciAttempts = Number(argValue(args, '--ci-attempts') ?? DEFAULT_CI_ATTEMPTS);

  // Default plan: .plans/PLAN.md (the untracked plans directory `ralph plan`
  // writes to), falling back to a root PLAN.md for hand-written plans.
  const planArg = argValue(args, '--plan');
  const defaultPlanPath = fs.existsSync(path.join(repoRoot, '.plans', 'PLAN.md'))
    ? path.join(repoRoot, '.plans', 'PLAN.md')
    : path.join(repoRoot, 'PLAN.md');
  const planPath = planArg
    ? path.resolve(repoRoot, planArg)
    : defaultPlanPath;

  const rootPromptPath = path.join(repoRoot, 'PROMPT.md');
  const promptPath = fs.existsSync(rootPromptPath)
    ? rootPromptPath
    : path.join(__dirname, 'PROMPT.md');

  const trackerPath = trackerPathFor(planPath);

  if (!fs.existsSync(planPath)) {
    console.error(`❌ Plan file not found: ${planPath}`);
    process.exit(1);
  }

  const planContent = fs.readFileSync(planPath, 'utf8');
  const promptContent = fs.readFileSync(promptPath, 'utf8');

  // Initialize tracker only if it doesn't exist
  if (!fs.existsSync(trackerPath)) {
    console.log(`📋 Creating new plan tracker at ${path.basename(trackerPath)}...`);
    fs.copyFileSync(planPath, trackerPath);
  } else {
    console.log(`📋 Resuming from existing ${path.basename(trackerPath)}...`);
  }

  // SIGINT: flag and finish cleanup (mark blocked + exit) after the await returns.
  process.on('SIGINT', () => {
    interrupted = true;
  });

  while (true) {
    if (interrupted) break;

    const trackerContent = fs.readFileSync(trackerPath, 'utf8');
    const taskInfo = findNextTask(trackerContent);

    if (!taskInfo) {
      console.log('\n✅ All tasks completed!');
      console.log('🧹 Wrap-up session starting: promote progress.txt findings, compact it, sync with main, then commit, push and open the PR.');
      console.log('   This is one full Claude session with no intermediate output — expect several quiet minutes. Interrupting it skips the push and PR; if that happens, run again to retry just this stage.');
      await preserveProgress();
      if (ciWait) {
        await verifyPullRequest(
          Math.max(1, ciTimeoutMin) * 60_000,
          Math.max(0, ciAttempts),
        );
      }
      break;
    }

    if (taskInfo.status === 'blocked') {
      console.log(`\n⚠️  Resuming blocked task: ${taskInfo.task}`);
    } else {
      console.log(`\n🔄 Executing task: ${taskInfo.task}`);
    }

    const prompt = [
      `Your scoped task is: ${taskInfo.task}`,
      'Consider tasks listed above this one in the plan checklist as completed. Do not re-evaluate or re-do them. Focus only on the scoped task.',
      '',
      promptContent,
      planContent,
    ].join('\n');

    const exitCode = await runClaude(prompt);

    if (interrupted) {
      updateTrackerLine(trackerPath, taskInfo.lineNum, 'blocked');
      console.log('\n⚠️  Interrupted. Task marked as blocked. Run again to resume.');
      process.exit(0);
    }

    if (exitCode !== 0) {
      updateTrackerLine(trackerPath, taskInfo.lineNum, 'blocked');
      console.error(`\n❌ Task failed (exit ${exitCode}). Marked as blocked. Run again to retry.`);
      return;
    }

    updateTrackerLine(trackerPath, taskInfo.lineNum, 'done');
    console.log(`✅ Task done: ${taskInfo.task}`);

    const shouldPause = await checkUsage('task');
    if (shouldPause) {
      console.log('\n⚠️  Pausing task loop due to high Claude usage. Run again when usage is lower.');
      break;
    }
  }
}
