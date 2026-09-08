## The loop

`bun run ralph plan --spec=.specs/<file>.md` writes
`.plans/PLAN-<stub>.md` (+ `.plans/PREREQUISITES-<stub>.md` when needed) per
the `dev-planner` skill; when a `progress.txt` exists, its findings are
injected as advisory planning context (skip with `--no-progress`).
`bun run ralph start --plan=.plans/PLAN-<stub>.md` executes it task-by-task
with a per-plan tracker, marking `[x]`/`[BLOCKED]` and resuming blocked
tasks first. `--start-at=HH:MM` defers a run. On completion the loop
promotes general findings from `progress.txt` into the repo docs/skills and
then compacts the file per `.claude/skills/progress-hygiene/SKILL.md` —
progress feeds future plan generation, so it must stay small and current.

## Issue reporting

The `qa-bug-reporter` agent files findings as GitHub issues via `gh`
(dedupes first, never guesses priority, asks before filing). Security
findings are routed to a private security advisory by a human — never to the
public tracker, and never searched for on it first.

## Workflow

Feature-branch → PR → merge. `test.yml` gates PRs with the isolated suite
only. Integration/live testing is a local (or self-hosted-runner) concern by
design.
