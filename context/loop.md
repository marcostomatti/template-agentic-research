## The ralph loop

`tools/ralph` is the agent task loop: `bun run ralph plan/start/usage/effort`
from the repo root, with plans and trackers in the gitignored `.plans/`.
This page is the authority for the loop's own architecture — what each
module owns, what the loop does per task, and which of its literals are
copied into a second file that nothing ties back to the first.

**The loop's own code is frozen at PROCESS LAUNCH.** Node loads the module
graph once, so a task that lands a change to `start.ts` or anything it
imports is dispatched by the loop that was already running. Measured with
`dispatchTask`, `parseTaskDeclaration` and `commitFinishedTask` all present
on disk: a task dispatched by a `ralph start` launched seven hours earlier
ran with its declaration block UNSTRIPPED in the prompt, on the loop's
default model rather than the declared one, and with no commit made on its
behalf. So a plan that lands its own dispatcher change cannot discharge a
definition of done resting on that change in the SAME run — restart the
loop, or re-run the task under a fresh one, and never cite the declaration
itself as evidence that routing applied.

The narrower companion: `start.ts` reads `PROMPT.md` and the PLAN once
before its `while` loop and re-reads only the TRACKER per iteration. An
edit to the injected prompt or to the plan text takes effect on the next
`ralph start`; a tracker edit is visible immediately. A task can tell which
generation dispatched it by holding the instructions in its own injected
prompt against the tracked `tools/ralph/PROMPT.md` — read the INJECTED copy
as the authority for what that session must do itself.

### Module map

| Module | What it owns, and the seam a test drives |
|---|---|
| `ralph.ts` | The CLI dispatcher. EXECUTES on import (a top-level `switch` over `process.argv`), so nothing unit-tests it by importing it; the seams are the subcommand modules' default exports, uniformly `(args: string[]) => Promise<void>`. Two levels deep for `effort collect` / `effort report`, with `HELP` and `isHelpRequest` shared by both levels. |
| `start.ts` | The loop. SAFE to import (module scope computes a `__dirname` and one `let`), but `start()` itself spawns Claude, so every per-task decision has to be lifted out of it to be testable: `buildTaskPrompt`, `dispatchTask`, `commitFinishedTask`, `maybeCompactProgress`. |
| `utils/claude.ts` | The ONE door onto the CLI. `runClaude(prompt, flags?, spawn?)` keeps the no-flags call shape byte-for-byte, `claudeArgs` is the pure argv seam, `CLAUDE_BASE_ARGS` is the `-p` + `--dangerously-skip-permissions` pair no declaration can reach. |
| `utils/commit.ts` | Staging and committing a finished task. `commitTaskWork(options)` takes a `runGit` seam; `deriveCommitSubject` / `buildCommitMessage` are the pure derivation; `stageAllArgs` / `stagedChangesArgs` / `commitArgs` / `headShaArgs` are exported argv. |
| `utils/declaration.ts` | The trailing routing block on a task line. `parseTaskDeclaration` answers the text with the block removed plus the record, `resolveDeclarationFlags` maps it onto CLI flags. |
| `utils/progress.ts` | Whether `progress.txt` is due for compaction, from a byte size and a task counter alone — the file's CONTENT never reaches the decision or a log line. |
| `utils/tracker.ts` | `findNextTask` / `updateTrackerLine`. Both survive a declaration block unchanged: `findNextTask` hands it through inside `taskInfo.task`, and a ticked line differs from its pre-tick spelling in exactly `- [ ]` -> `- [x]`. |
| `effort/` | The cost pipeline: `session-log.ts` (streaming JSONL reader), `classify.ts` (session kind from its first enqueue), `attribution.ts` (branch -> plan stub, enqueue -> task text), `store.ts` (append-only NDJSON), `commits.ts` (one row per commit), `collect.ts` (the orchestrator), `report.ts` (per-plan rollup). |

### The per-task tail

In order, and every step of it is load-bearing:

1. `dispatchTask` — strips the declaration ONCE, builds the prompt, resolves
   the flags, spawns.
2. `commitFinishedTask` — stages and commits, marking the tracker line.
3. `maybeCompactProgress` — the compaction decision.
4. `checkUsage` — the usage gate.

Two control-flow laws hold anything added there later. **A step that can
FAIL runs BEFORE the tick**: `updateTrackerLine(..., 'blocked')` rewrites
only `^- [ ]`, so it is a silent no-op against a line already `- [x]` and a
tick written too early cannot be retracted. **A failure that blocks the task
must STOP the loop**: `findNextTask` resumes a BLOCKED task first, so
carrying on re-dispatches the same task immediately and forever.

The compaction step sits after the commit and before the usage gate for a
reason: the counter lives in `start()`'s own scope and a fresh `ralph start`
begins at zero, so a run that paused at the usage gate without compacting
would hand the whole oversized file to the next run's first task, which
cannot compact either. The counter resets on DISPATCH and not on success —
an asked-for session that removed nothing has still been asked.

A between-tasks compaction is the one loop session with NO tracker line and
NO commit, and both are structural: the helper is handed no tracker path at
all, and its prompt confines the session to the gitignored `progress.txt`.
That confinement is the design — a promotion written into a tracked
`context/` page mid-run has no commit of its own and is swept into the NEXT
task's, under a subject describing something else. See
`.claude/skills/progress-hygiene/SKILL.md` for the caps and the ladder.

### The injected prompts

The loop injects FIVE prompt shapes and each literal lives in exactly one
place: the task prompt, `preserveProgress`, `repairPullRequest` and the
compaction prompt in `start.ts`, plan generation at `plan-prompt.md` line 1.

**The FIRST LINE of each is a classifier key.** `effort/classify.ts` matches
each kind on a prefix, so a bullet added ABOVE line 1 re-buckets every later
session of that kind as residue. Nothing enforces it: the drift guard in
`classify.test.ts` is `source.includes(shape.prefix)` over the whole file,
so a prepend keeps it green (measured — two lines planted above
`plan-prompt.md` line 1 left all 34 cases passing). Assert line 1 EXPLICITLY
inside any script editing an injected prompt. For a prompt built by an
exported FUNCTION the hole is closable in four lines: call the real builder
from the classifier's own test and assert `prompt.startsWith(shape.prefix)`.

Two consequences worth knowing before editing one. Adding a shape is never a
one-file change — a fifth shape landed without a fifth entry in
`PROMPT_SHAPES` re-buckets every session of that kind while every gate stays
green (`report.ts`'s `SESSION_KINDS` derives from it and needs nothing). And
a prompt assembled in a TEMPLATE literal has its inner backticks ESCAPED in
the source text, so a containment guard over the whole first line fails
while the prompt is fine — assert a fragment that stops before the first
backtick.

`start.ts` must keep spelling `Your scoped task is: ` itself however the
tail is refactored: the drift guard reads that file's source, so hoisting
the prefix into a sibling module reds it.

### The task declaration

A task line may end in a brace block resolving to CLI flags —
`{agent=... model=... effort=... tools=...}`. The grammar is documented in
`tools/ralph/plan-prompt.md` and `.claude/skills/dev-planner/SKILL.md`, and
`context/workflow.md` carries the task-shape to agent routing table it draws
from. Four rules keep a brace a task WROTE ABOUT from being read as a
declaration, and the first three all exist in this tree's own plans:
anchored at end of text, no nested braces, at least one RECOGNISED key, and
not the whole text. Nothing throws — an unusable value lands in `issues` and
emits no flag, and an unrecognised KEY is retained in `extras`, which is
what lets the grammar grow without reddening older plans.

An `agent` outranks `model`, `effort` and `tools`: the three stay on the
record and `ResolvedFlags.suppressed` names them. Documenting that rule
invites an example contradicting it — three of four examples across the two
documents spelled the outranked keys before the parser was driven over them.

Resolved flags are APPENDED to the argv and never prepended, because
`--tools <tools...>` is VARIADIC: it consumes tokens until one starting with
a dash, so leading flags would put `-p` behind it.

`claude --help` documents the four flags' value grammars: `--effort` takes
low/medium/high/xhigh/max, `--model` an alias (opus, sonnet, haiku, fable)
or a full name, `--tools` the comma-joined single argument (plus `default`
for all and `""` for none), `--agent` a name. Validating a tool NAME against
a hardcoded list is the trap — the built-in set lives in the CLI and moves
with it, so a list kept in this repo eventually refuses a real tool while
reading as a broken declaration.

**Strip the block at every USE, not only at the use a task names.** A task
text carrying it goes through `buildCommitMessage` into the commit body and
subject — the four consumers here are the prompt, the operator log, the
commit subject and the commit body, and git history is the one place a leak
cannot be taken back out of.

### What the LOOP owns rather than the session

Asserted in five TRACKED places that drift independently and that no test
reads: `tools/ralph/PROMPT.md`, `tools/ralph/plan-prompt.md`'s RUNNER
bullet, the boundaries section of `.claude/agents/loop-implementer.md`, the
tracker sentence in `.claude/skills/dev-planner/SKILL.md`, and
`context/workflow.md`. A `(loop|runner)` near-`owns` sweep finds four of the
five and misses the workflow one, which spells the same fact as what the
last stage DOES — so sweep that boundary by SUBJECT.

The loop owns staging and committing each finished task, the push, the pull
request and the merge. `nothing-to-commit` is a SUCCESS: a task writing only
to `.plans/`, `.specs/`, `progress.txt` or `/tmp` legitimately changes no
tracked file.

The corollary bites a whole family of tasks: where the deliverable IS a
`.plans/` measurements section, neither a commit stat nor a ticked tracker
box is evidence the section was written. Before appending a new one, grep
the measurements file for the PRIOR task's own COMMAND STRING — the heading
numbers stay contiguous across a gap, so reading them makes a file with a
hole in it look complete.

**Check for a PRIOR ATTEMPT in BOTH shapes before starting a scoped task.**
It is either uncommitted in the WORKING TREE, or already COMMITTED at the
branch tip — and the second leaves a clean tree with the task reading as
untouched, its only tell being the tip commit's SUBJECT against the task
sentence. Re-drive one leg per claim the prior note makes: case COUNTS
drift where error CODES re-drive as written. The uncommitted shape is
visible ONLY in the session-start `git status`, so capture that BEFORE
editing — `git add -A` otherwise bundles the leftover into a commit whose
subject describes only the current work, and the repair is two commits with
their own accurate subjects.

Deriving the commit's conventional-commit TYPE from the task sentence needs
a BOUNDED window, not a keyword search: every module task in this tree ends
`plus its TSDoc and colocated unit tests`, so an unbounded search for the
test noun labels every task a test task. Measured over twenty sentences
split by hand, genuine test tasks name their test noun at index 6-23 and
module tasks first reach one at 120-320, so the window is chosen for the
GAP rather than for the number. The complementary ordering: a docs rule
keyed on a `.md` path runs BEFORE every verb rule, a documentation task's
verb being whatever the edit happens to be (`Remove ...`, `Rewrite ...`)
while the thing it names is reliably a markdown file.

### The effort stack

The store is append-only NDJSON under a gitignored `.ralph/effort/`, and
`openEffortStore(path, keyOf)` binds a file to ONE key projection — the set
a collector SKIPS by and the set an append DEDUPES by must be the same
projection, or the store grows a duplicate per run while looking like it
works. `effortStorePath(root, kind)` is the only place `.ralph/effort` is
spelled.

Three properties to know before quoting a figure from it:

- **The commit half carries a free denominator**: its row count must equal
  `git rev-list --count HEAD` exactly on a full walk with no `--since`. No
  report reads that store yet — `report.ts` rolls up sessions alone.
- **Every collect freezes the running session's own row**, so an
  incremental store understates the branch under study while reading as up
  to date. Empty it on both sides of a before/after (4.5s for ~950 logs),
  and back the two `.ndjson` files up first.
- **The entrypoint filter is what makes a report about the LOOP** rather
  than about the log directory: unfiltered, the model histogram carries
  every desktop and probe session too.

`git`'s approxidate resolves an UNREADABLE `--since` to NOW rather than
failing, so a typo collects zero rows and exits 0. `collect.ts` resolves
such a value with `Date.parse` and refuses what it cannot read; the
capability lost is git's relative forms, and the alternative is a silent
empty run.

### Testing the loop

- The root vitest `include` is `tools/**/*.test.ts`, so a test COLOCATED
  beside a module under `tools/` is collected with no config change and the
  root suite's totals move by exactly that file.
- The root `tsconfig.json` EXCLUDES `**/*.test.ts`, so a test file is
  LINTED but never type-checked. The repair is two commands: a
  `zz-tmp-*.json` at the repo root extending `./tsconfig.json` with
  `include` naming the test plus the modules it imports and `exclude`
  dropping the test glob, then `bun x tsc --noEmit -p` over it and `rm`.
  It routinely finds `noUncheckedIndexedAccess` errors in a file already
  passing lint and vitest.
- The real spawn is `Bun.spawn` and the root suite runs vitest under NODE,
  so the default spawn path CANNOT execute in a test. The free control that
  says the default is still the real spawner is a case calling it with no
  injection and requiring a `ReferenceError` naming `Bun`, guarded by
  `it.skipIf` on that same probe.
- A temporary git repository built for a test MUST set its own
  `core.hooksPath`, or it inherits this clone's `.githooks` and the
  control-byte gate runs against an index it knows nothing about. Set
  `commit.gpgsign false` and a local `user.email` / `user.name` too.
- Assert what a loop helper PRINTED with `vi.spyOn(console, ...)` and never
  a `process.stdout.write` patch: vitest replaces the console object, so a
  stream capture reads zero lines and every assertion about an absent line
  passes. Empty the capture inside the per-subject driver, not in
  `beforeEach` — a table-driven case otherwise reads the first subject's
  line for all of them.
