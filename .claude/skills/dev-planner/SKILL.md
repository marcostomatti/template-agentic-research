---
name: dev-planner
description: Use when producing or parsing a plan document (PLAN-<stub>.md, PLAN_TRACKER-<stub>.md, PREREQUISITES-<stub>.md) for the ralph agent loop — establishes the checkbox/stage-heading syntax the tracker parser requires, task granularity rules, and testing-task insertion patterns.
---

# dev-planner — Plan Document Format Specification

This skill specifies the format of plan documents produced for feature development work and consumed by the ralph agent loop (`tools/ralph/`). It does not define agent behavior, personas, or workflow — those belong in agent profiles.

---

## Files produced by a planning session

| File | Purpose |
| --- | --- |
| `PLAN-<stub>.md` | Full task checklist with technical context, stage labels, and code examples |
| `PLAN_TRACKER-<stub>.md` | Loop-parsed checklist; must use the exact format the parser expects |
| `PREREQUISITES-<stub>.md` | Non-automatable setup steps required before the plan can run (only when any exist) |

Plans are generated with `bun run ralph plan --spec=specs/<file>.md` (optionally `--stub=<name>`; the stub defaults to the spec's basename) and live at the repo root. The tracker is derived from the plan file by `trackerPathFor()` in `tools/ralph/utils/tracker.ts` (`PLAN-foo.md` → `PLAN_TRACKER-foo.md`) — never create or edit the tracker by hand during planning; the loop owns it. The unstubbed forms `PLAN.md` / `PLAN_TRACKER.md` / `PREREQUISITES.md` are also valid and are the loop's default (`bun run ralph start` with no `--plan`).

Execute a plan with `bun run ralph start --plan=PLAN-<stub>.md`.

---

## PLAN.md format

`PLAN-<stub>.md` is the human-readable plan. Its task lines are injected into agent prompts by the loop, with any trailing routing declaration stripped off first (Task declarations below).

```markdown
# Plan: {Feature Title}

## Description

{Technical context and background. No behavioral instructions.}

# Stage: {Stage Name}
- [ ] Task one
- [ ] Task two

# Stage: {Next Stage}
- [ ] Task three
```

Rules:
- Stage labels use `# Stage: {name}` (top-level heading, not `##`).
- Tasks use `- [ ]` checkbox syntax.
- A task line may carry a trailing routing declaration — `{agent=doc-updater}` — naming what the loop should dispatch it with. See Task declarations (routing) below.
- Keep the plan focused on tasks and technical context only. Link to relevant `.claude/skills/` files where they clarify a task, but do not embed behavioral prose.
- Code snippets are allowed to illustrate a desired pattern. Keep them minimal and directly relevant to the task.
- Do not use words like "current", "previous", or "next" in task descriptions. The loop injects the task text into agent prompts; relative references confuse the agent about what has already been done.
- If the plan is long, add a `PLAN_SUMMARY-<stub>.md` with a high-level overview of stages for quick reference.

### Plan header: `Implements`

A plan that implements a GitHub issue opens with, near the top of the Description:

```markdown
**Implements:** #<n>
```

so the work stays traceable back to the issue it delivers.

---

## PLAN_TRACKER.md format

`PLAN_TRACKER-<stub>.md` is consumed line-by-line by `findNextTask()` in `tools/ralph/utils/tracker.ts`. The parser applies strict prefix matching — any deviation in syntax will cause tasks to be skipped or misread.

```markdown
# Stage: {Stage Name}

- [ ] Open task — not yet started
- [x] Completed task
- [BLOCKED] Blocked task — {reason why it is blocked}
```

### Parser format contract

| Status | Exact line prefix | Parser regex |
| --- | --- | --- |
| Unchecked | `- [ ] ` | `^- \[ \] (.+)` |
| Completed | `- [x] ` | written by the loop's `updateTrackerLine()`; skipped by the parser |
| Blocked | `- [BLOCKED] ` | `^- \[BLOCKED\] (.+)` |

Important notes:
- `[BLOCKED]` uses uppercase only. `[blocked]` or `[Blocked]` will not be matched.
- There is one space between `]` and the task text for both `- [ ]` and `- [BLOCKED]`.
- Stage heading lines (`# Stage: ...`) are **not parsed** by the loop. They are visual separators only and do not affect task selection — as is any other prose or code between task lines.
- `findNextTask()` prefers blocked tasks over unchecked ones — it resumes interrupted work before starting new tasks.
- A trailing declaration block is invisible to both parsers: `findNextTask()` hands it through inside the captured task text, and `updateTrackerLine()` rewrites only the checkbox prefix — so a ticked declared line differs from its unticked spelling in exactly `- [ ]` → `- [x]`.

---

## Task declarations (routing)

A task line may carry a trailing declaration block naming what the loop should dispatch it with. It is written on the PLAN line, travels into the tracker with it, and is read at dispatch by `parseTaskDeclaration()` in `tools/ralph/utils/declaration.ts`.

```text
- [ ] Add the Zod schema for `CreateJobRequest`  {agent=loop-implementer}
- [ ] Rewrite the gates page  {agent=doc-updater}
- [ ] Sweep the changed set  {tools=Read,Grep,Glob model=haiku effort=low}
```

### Declaration grammar

| Key | Value | Flag it maps to |
| --- | --- | --- |
| `agent` | An agent name, spelled as a file under `.claude/agents/` is named | `--agent <name>` |
| `model` | An alias (`opus`, `sonnet`, `haiku`, `fable`) or a full name (`claude-fable-5`) | `--model <model>` |
| `effort` | One of `low`, `medium`, `high`, `xhigh`, `max` | `--effort <level>` |
| `tools` | Comma-separated tool names with no spaces (`Read,Write,Edit`) | `--tools <list>` |

Rules:
- The block is the LAST brace group on the line, anchored at end of line, carrying no nested braces, holding at least one recognised key, and never the whole task text. Two spaces separate it from the task text.
- Anything failing one of those rules is ordinary task text — a task ending on a code span holding `{ "a": 1 }` is not a declaration.
- Tokens inside the block are space-separated `key=value` pairs. An unrecognised key parses and is retained for telemetry, but maps to no flag.
- `agent` outranks `model`, `effort` and `tools`: with an agent named the loop passes only `--agent`, because the agent definition supplies its own model and tool set. The other three are still recorded, so the effort collector can report what the plan asked for against what the agent supplied.
- A recognised key whose value the loop cannot use maps to no flag rather than failing the task, so a misspelled effort level costs the routing silently. Spell values from the table above.
- A task line with no block is dispatched exactly as every task was before declarations existed: the loop's defaults, with nothing stripped.
- The loop strips the block before the task text reaches the agent's prompt, the operator log and the commit message. A declaration is a planning annotation, never an instruction.

### Choosing the agent

Route by the task's SHAPE rather than its subject or its verb — a documentation task's verb is whatever the edit happens to be (`Remove ...`, `Rewrite ...`, `Split ...`) while the thing it names is reliably a markdown file. The `### Task shape to agent` table in `context/workflow.md` is the authority: it maps prose to `doc-updater`, tests to `tdd-guide`, migrations to `database-reviewer`, repair to `build-error-resolver`, cleanup to `refactor-cleaner`, review to the read-only reviewers, and implementation to `loop-implementer`.

- Prefer a row whose third column names a tracked `.claude/agents/<name>.md` file. A `user-level` row resolves against whatever the machine happens to hold, and a fresh clone receives none of them.
- An agent name that resolves to nothing STOPS the dispatch — exit 1 with the whole roster on stderr and no model call — so a wrong name is loud rather than a silent downgrade.
- Where no row fits the task's shape, declare the granular keys instead of an agent: a narrow `tools=` list beside a `model=`/`effort=` pair routes a task the table has no row for.

---

## PREREQUISITES.md format

`PREREQUISITES-<stub>.md` lists non-automatable setup steps. It is not parsed by the loop — it is a human checklist.

```markdown
# Prerequisites

## Services
- [ ] {Service name} running on port {n}

## Environment Variables
- `VAR_NAME` — description and where to obtain it

## Credentials
- [ ] {Credential description}
```

Rules:
- Only include prerequisites that are genuinely non-automatable (installed services, external credentials, manual env var setup).
- Do not duplicate steps already documented in the repo's contributor docs (README, CONTRIBUTING, and the like).
- For example: do not mark `bun install` as a prerequisite if it is already documented as a required step for all development work.
- Link to the prerequisites file from the plan.

---

## Task granularity guidelines

- One atomic action per task. Each task must be completable in a single focused session without depending on another task being partially done.
- No compound tasks joined by "and". Split "implement X and write tests for X" into two tasks.
- Tasks must be independently completable in the order listed.
- Use imperative, specific wording: "Add Zod schema for `CreateJobRequest`" rather than "Handle input validation".

---

## Testing task insertion patterns

- Add a test task at the end of each stage at minimum.
- For large refactors or multi-file additions, add test tasks at smaller increments — logical sub-chunks that can be verified independently.
- Write negative tests before positive tests (error paths, early exits, edge cases).
- Write unit tests before integration tests.
- Place test tasks in the same stage as the code they cover, not in a separate testing stage.

---

## `[BLOCKED]` marker

The `[BLOCKED]` marker is written by the loop (via `updateTrackerLine()`) when a task fails or is interrupted. Format:

```text
- [BLOCKED] {task description} — {reason why it is blocked}
```

- The em dash (`—`) separates the task description from the reason. Do not use a hyphen (`-`) or colon.
- The full line including reason is passed back to the agent as the scoped task on the next run.
- Do not reformat `[BLOCKED]` lines manually unless correcting a syntax error — the loop will re-parse them on the next iteration.

---

## Format validation

Before changing checkbox syntax or stage heading format, verify compatibility against `findNextTask()` and `updateTrackerLine()` in `tools/ralph/utils/tracker.ts`. The parser uses simple prefix regex matching with no tolerance for whitespace variations or casing differences.
