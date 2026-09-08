---
name: progress-hygiene
description: Use when compacting progress.txt — the loop dispatches a compaction session between tasks once the file passes its caps, and the wrap-up runs one more at the end of a plan. Governs what gets promoted out of progress.txt (skills, context/ pages, docs), what gets deleted, and what a mid-run compaction may not touch, so the file stays small enough to inject into plan generation.
---

# progress-hygiene — keep progress.txt small and true

`progress.txt` is the loop's scratch memory: broadly-applicable findings
appended between tasks. Since `ralph plan` injects it into plan generation
as advisory context, it earns its size — every stale or duplicated line is
context bloat for every future plan. The injection truncates at 16,000
characters, oldest findings first (see `tools/ralph/plan.ts`), and the loop
enforces that same number itself so the truncation never has to act.

## When to compact

Compaction is no longer an end-of-run step. `tools/ralph/start.ts` asks
`tools/ralph/utils/progress.ts` between every pair of tasks — after the
finished task is committed and ticked, before the usage gate — and
dispatches a compaction session when the answer is due. Four rules,
decided in this order:

- **No task has completed since the last compaction.** Never due,
  whatever the size: nothing has been appended to compact, and this is
  the bound on a file the model cannot shrink.
- **At or over the hard cap, 16,000 bytes.** Due at once, on the task
  that pushed it there. The cap is enforced in BYTES against an
  injection limit spelled in CHARACTERS, and UTF-8 gives at least one
  byte per character, so it can only ever fire early.
- **Under the soft cap** — this skill's own **~8k characters**, read as
  8,000 bytes. Never due whatever the counter says: a session over a
  handful of findings costs a whole session and removes nothing.
- **Between the two caps.** Due every 10 completed tasks. That is the
  rolling cadence.

Two compactions still happen outside that cadence. The wrap-up session at
the end of a completed plan compacts as well, and it is the one that owns
the promotion ladder below; and between items in a multi-plan queue run,
or whenever you are already editing a file past the soft cap, compacting
by hand is free.

## A mid-run compaction deletes, it does not promote

A session dispatched between tasks is confined to `progress.txt` and
changes no other file. That file is gitignored, so such a session leaves
the working tree clean and the loop makes no commit for it — whereas a
promotion written into a tracked `context/` page or skill mid-run would
have no commit of its own, and would be swept into the NEXT task's commit
under a subject describing something else entirely.

So mid-run: delete what is already covered somewhere durable, opening the
destination to confirm it before dropping the line; merge near-duplicates
into the single most precise phrasing; keep everything else. Get under the
soft cap if the file honestly allows it, and if it does not, stop there
rather than deleting a finding that is still true and unpromoted. The
counter resets on DISPATCH and not on success, so the loop asks again
after the next task — where a finding deleted here is gone for good.

## The promotion ladder — persist first, then delete

The end-of-run wrap-up owns this ladder. A finding leaves `progress.txt`
in one of two ways: promoted somewhere durable, or deleted as noise. Never
delete an unpromoted finding that is still broadly true.

| Finding | Destination |
| --- | --- |
| A reusable pattern, gotcha, or technique | A skill: invoke the learn/learn-eval skill when available in the session; otherwise write `.claude/skills/<name>/SKILL.md` by hand |
| A repo convention or architectural fact | The `context/` page that owns the subject — repo-root for tree-wide law, `packages/<pkg>/context/` for one package's — or the pertinent existing skill. `AGENTS.md` is a capped map: add a pointer there, never the finding |
| Consumer-facing behaviour | `README.md` / `docs/` |
| A defect or follow-up too big for now | A spec — `.specs/` if sensitive (unpatched privacy/security), tracked `specs/` + index otherwise |

## What to delete outright

- Findings already persisted anywhere durable (verify, then drop — the
  durable copy is now the source of truth).
- Task-specific details that never belonged (the loop prompt forbids them,
  but they leak in).
- Stale facts: anything a later finding or the current code contradicts.
- Duplicates and near-duplicates — keep the most precise phrasing.

## How to compact

Rewrite the file, don't append a "cleaned" section. Keep surviving findings
in their original order (recency is meaningful — the injection cap truncates
oldest-first). One finding per line or short bullet, no headers, no dates,
and no summary of what you removed. If nothing survives, leave the file
empty rather than deleting it.
