## Workflow

Feature-branch → PR → merge. Conventional commit types (feat, fix, refactor,
docs, test, chore, perf, ci). Run the verification order before any PR.

**Tag on every completed plan**: when a ralph plan (or an equivalent chunk of
work) completes and lands on `main`, push and tag it `v<N>` (annotated,
sequential — `v0` was the umbrella reintegration) so versions trace back to
the plan that produced them.

**The loop's last stage now waits for CI.** `bun run ralph start` runs the
wrap-up session (promote findings, sync with `origin/main`, commit, push,
open or update the PR) and THEN polls that PR's checks, spending up to
`--ci-attempts` repair sessions on a red or conflicting result before
escalating. It exists because a CONFLICTING PR gets no CI run at all —
GitHub cannot build `refs/pull/<n>/merge` for a branch that does not merge
cleanly — so without the wait the loop reported a finished plan whose
code had never been checked once (measured: 0 check runs over a 44-commit
branch, with `gh pr checks` answering `no checks reported`, which reads
like a run that has not started). `--no-ci-wait` skips the stage,
`--ci-timeout=<min>` bounds it (default 20; CI settles in 2—5 here), and
it skips itself when `gh` is unusable so the loop still works offline.

**Take the mergeability reading BEFORE the push.**
`git merge-tree --write-tree origin/main HEAD` is one command, needs no
checkout, worktree or stash, exits 1 on conflict, and prints the conflicted
paths as stage1/2/3 index entries followed (after the first blank line) by
the `Auto-merging` / `CONFLICT (content)` block naming each one. Doing it
first is what lets a PR body NAME the conflicts and their shape instead of
the reviewer discovering a red merge box, and it is the same reading
`gh pr view --json mergeable` gives only once the PR exists and is
therefore too late to write about.

**But `merge-tree` exits 1 for TWO different reasons**, and "exits 1 on
conflict" covers only one: an UNRESOLVABLE ref answers exit 1 with
`merge-tree: <ref> - not something we can merge` and NO tree OID at all,
indistinguishable from a conflict at the exit code alone. The
discriminator is the FIRST LINE — a 40-hex OID means the merge RAN
(conflicted if stage entries follow, clean if the capture is that one
line), anything else means it never started. Read the first line, never
`$?`. A CLEAN reading is then a zero-hit shape owing a liveness control,
and that control needs nothing written into the shared object database
(which matters with a parallel leg on the same `.git`): `git init` a
`/tmp` dir, commit a three-line file, branch twice off that base
rewriting the SAME line differently, and `merge-tree --write-tree` the
pair. It reproduces the documented conflict shape exactly at exit 1,
while a second pair appending to DIFFERENT files answers exit 0 and one
line. Both in one command, about 2s.

**The complementary-additions conflict is NOT the default outcome**, and
the q15 wrap measured the opposite: both docs files the two sides had
edited (root `AGENTS.md`, `packages/web/AGENTS.md`) auto-merged, their
hunk ranges being disjoint. So the absence of a `CONFLICT` block settles
nothing by itself. The reading that says a real three-way merge RAN
rather than one side winning is LINE ARITHMETIC over `git cat-file -p
<merged-tree>:<path>` — merged == base + (HEAD - base) + (main -
base) EXACTLY, with the merged blob differing from base, from HEAD and
from main. And verify a PLAN's predicted conflict against which HUNK each
side actually touched before reporting it as expected or as missing:
`git diff --unified=0 <base> <ref> -- <path> | grep '^@@'` for both sides
is the whole reading, with `comm -12` over the two `--name-only` sets
naming the both-touched paths first. Measured at the q15 wrap: the plan
expected the workspace-map row to conflict, 111 commits had landed on
main, and main left that row byte-identical to the base.

**A textually clean merge makes NO semantic check**, and the merged
content exists nowhere on disk — so sweep the MERGED BLOB rather than
the working copy: `git cat-file -p <the merge-tree OID>:<path>`. Two
readings pay for themselves and both are zero-hit shapes needing a
planted control in the same command: conflict-marker lines
(`grep -cE '^(<{7}|={7}|>{7})( |$)'`) and DUPLICATED HEADINGS
(`grep -E '^#{1,4} ' | sort | uniq -d`), the latter being the classic
both-sides-added-the-same-section hazard.

**`git ls-remote origin refs/heads/main` is the currency check** any
mergeability reading owes: without it the answer may be about a stale
`origin/main` and nothing in the output would say so. It touches no ref,
no index and no working tree, which matters here because a `fetch` writes
into the `.git` two checkouts share. Print the local `git rev-parse
origin/main` beside it — equal is the reading, and unequal means
fetch before believing the merge answer.

That exit 0 is a ZERO-HIT reading. A ready-made control is often DEAD here
— a sibling remote head already an ancestor of `origin/main` answers the
same clean tree oid and proves nothing — but do NOT take that as given: it
is a SNAPSHOT, and one loop over `git for-each-ref refs/remotes/origin/`
with `git merge-base --is-ancestor <ref> origin/main` found FIVE of 27
heads that were not ancestors, two of them conflicting with HEAD at exit 1
with the full shape (22 lines, 1231 bytes). The catch decides how such a
control is REPORTED rather than whether it counts: `git fetch` does not
prune, so a remote-tracking ref OUTLIVES its deleted branch, and both
conflicting refs were exactly that (`git ls-remote --heads origin
refs/heads/<b>` answered zero for each while every head still ON the remote
merged clean). They are real commits and a valid instrument proof; they are
NOT a claim about anything that can land, and saying so is the difference
between a control and a false alarm in a PR body. Classify every candidate
by `ls-remote` presence, never by the remote-tracking ref.

A second corroboration is free, stronger than the exit code, and available
to no grep of the capture: under a fast-forward the tree oid merge-tree
WRITES equals `git rev-parse HEAD^{tree}`, which says the merge took
nothing from the other side rather than merely that nothing collided. Pair
it with `git merge-base --is-ancestor origin/main HEAD` at exit 0 and
`git rev-list --left-right --count origin/main...HEAD` answering `0 <n>`.
A clean answer is ONE line and 41 bytes, so print the byte count beside the
exit code — that is what separates it from a run that produced nothing.

The SYNTHETIC control costs one command — two
throwaway commits off HEAD adding the same path with different blobs,
built with `GIT_INDEX_FILE=/tmp/x` plus `git read-tree` /
`update-index --cacheinfo` / `write-tree` / `commit-tree`, which writes no
ref, no index and no worktree byte (`git status --short -uall` at 0 bytes
is the whole revert check, and the loose objects are unreferenced). It
answers EXIT 1 with the tree oid on line 1, the conflict path list
beneath it, a blank line, then the `Auto-merging` / `CONFLICT` narrative.
Note it is an ADD/ADD conflict carrying stage 2 and stage 3 entries and NO
stage 1, where a real content conflict carries all three per path — so a
probe asserting three stage lines per conflicted path reports the
prescribed control as malformed. The two legs cover different conflict
kinds and neither subsumes the other.
Pair it with the STRUCTURAL reading, which is stronger than merge-tree's
zero and one command: `git merge-base --is-ancestor origin/main HEAD`
exiting 0 says the merge is a FAST-FORWARD, under which no conflict is
possible at all.

Only the clean/conflict PAIR needs that /tmp repo. The UNRESOLVABLE-REF leg
needs nothing at all: measured against the REAL repo,
`refs/heads/zz-no-such-branch` answered EXIT 1 with
`merge-tree: <ref> - not something we can merge` as a NON-OID first line,
writing nothing (`git status --short -uall` at 0 bytes, HEAD and
`origin/main` unmoved either side). Run all three legs in one command and
classify on the FIRST LINE, so the real reading lands in a named cell rather
than being read off an exit code that cannot separate them.

**On a CONFLICTED merge the marker sweep is an EXPECTED non-zero**, and
reading it as a finding inverts the check — the merged blob carries the
markers by construction. The cross-check that turns it back into a reading
is arithmetic and free: marker lines divided by three is that path's own
conflict REGION count, which must be at least 1 and which you read
against the hunks rather than against the narrative — `merge-tree`
prints ONE `CONFLICT (content)` line per PATH however many regions that
path carries, so the two agree only for a single-region path and a check
holding them equal reports a correct multi-region conflict as broken
(measured 6/3 == 2 regions in `bun.lock` against 1 narrative line, and
3/3 == 1 against 1 in a manifest). The stage entries in the same capture
tell the conflict KIND apart in one line — all THREE stages per path is
a content conflict, where the add/add shape carries stages 2 and 3 alone.
And the whole-tree diff against the merged oid survives a conflicted merge
intact, so it is available here too and not only as the fast-forward
replacement: merged-versus-HEAD must answer exactly the OTHER side's
changed paths and merged-versus-`origin/main` exactly your own (measured 6
and 62), which is the one reading saying the merge took BOTH sides rather
than one winning. Where the both-touched set EQUALS the conflicted set no
blob was three-way merged at all, so the line-arithmetic reading is
UNAVAILABLE rather than skipped, and the duplicated-heading reader can be
VACUOUS on a both-touched set carrying no markdown while its planted
control still fires LIVE — a control proves the READER and never the
subject, so say which of the two a zero is.

**A dependency-adding branch meeting Dependabot on `main` conflicts on
exactly the two manifest paths**, and the conflict is ADJACENT-LINE rather
than semantic: ours inserted a dependency immediately above a package theirs
BUMPED, once in the manifest and again in the lockfile's copy of the same
block. The repair is taking both manifest edits and RE-INSTALLING; a
hand-merged `bun.lock` is a lockfile no resolver ever wrote.

**`git rev-parse --short <a> <b>` with TWO revisions dies**
`fatal: Needed a single revision`, `--short` carrying `--verify` semantics,
which reads as a missing ref rather than as a wrong call — the exact
misreading the stale-`origin/main` trap wants to avoid. Ask one revision per
call, or drop `--short` and shorten afterwards. And the
`<base>..main` versus `<base>..origin/main` count pair reproduces with a
NON-ZERO gap rather than only in principle: measured, both merge-bases
answered the IDENTICAL sha while the two counts split 3 against 5, local
`main` sitting two commits behind an `origin/main` `ls-remote` confirmed
CURRENT.

**That fast-forward corroboration is UNAVAILABLE on a branch BEHIND main**,
and reaching for it reports a correct clean merge as broken. Where
`git merge-base --is-ancestor origin/main HEAD` exits 1 the merged tree oid
does NOT equal `HEAD^{tree}`. What replaces it is a whole-tree diff against
the merged oid: it must differ from HEAD by exactly the OTHER side's changed
paths and from `origin/main` by exactly your own (measured 1 and 105). And
where the two sides' changed-path sets are DISJOINT (`comm -12` over the two
`--name-only` sets is empty) the LINE-ARITHMETIC reading has no subject at
all — no blob was three-way merged — so the honest delivery says so rather
than running it over a path only one side touched. Spot-check one path per
side through `git rev-parse <merged-oid>:<path>` against all three blobs.

**Pick PR pre-flight controls by a number you have SEEN, never by a
branch looking historical.** Two dead-control traps, both measured. A
MERGED PR is not a valid control for the
`git ls-remote origin 'refs/pull/N/*'` merge-ref reading: GitHub DROPS
`refs/pull/N/merge` once a PR merges, so a merged control answers `head`
ALONE — byte-identical to the CONFLICTING shape the check exists to
detect. Only another OPEN PR can corroborate the positive. And the
`gh pr list --head <h> --state all` pre-flight can answer `<none>` for a
branch that is merely old, because it was merged by a direct push and
never had a PR at all — so a broken filter and a genuine absence stay
indistinguishable, which is the exact failure that control exists to rule
out and whose cost is a duplicate PR. Two related states worth not
misreading: `mergeable` is computed lazily and `UNKNOWN` beside a present
merge ref is healthy, and `mergeStateStatus` reads `UNSTABLE` while a
check is pending, settling to `CLEAN` — neither is `DIRTY`, which is the
one that means a conflict.

**The `gh pr list --head <branch>` pre-flight HAS a cheap live control**,
which is what the dead-control note above leaves missing: the same command
with `--state open` and NO head filter must return some other branch's PR.
That separates `[]` meaning no PR exists from `[]` meaning the filter is
broken, where a MERGED PR cannot serve. Pair it with
`git ls-remote --heads origin` for the branch, which answers nothing when it
was never pushed — two independent reasons for the same `[]`, and a body
claiming no hosted green owes both.

**But that `--state open` control is itself DEAD on a remote with no open
PRs**, which is the steady state here between merges: measured, `--state
open` with no head filter answered `[]`, so it could not tell a genuine
absence from a broken filter either. `--state all` with no head filter is
the form that stays live (it returned three merged PRs), and the merged-PR
caveat above is about the merge-REF reading, not about this one. Pick the
`ls-remote` half's control the same way: off `git ls-remote --heads origin`
itself, never off `git for-each-ref refs/remotes/origin/`, where 29 of this
clone's 33 remote-tracking refs named branches the remote no longer has.
One real head asserted present at 1 line, the subject at 0, and a
fabricated sibling at 0 is the discriminating trio.

**A conflicting PR dispatches NO workflow at all**, so `no checks reported`
on a fresh PR is a MERGE-STATE reading and not a trigger or changed-path
bug to debug: GitHub cannot compute `refs/pull/N/merge` while
`mergeStateStatus` is `DIRTY`, and the trigger blocks and path filters are
both green and explain nothing. Read
`gh pr view <n> --json mergeable,mergeStateStatus` FIRST. Two consequences
for the outbound body — a branch behind `main` has no hosted green, so
the local gate captures are the whole of the evidence and the body has to
say so rather than leaving a reader to assume CI agreed; and a job that
RAN and went red is a different state from one that was never created.

**Do not predict your own `v<N>` tag.** Tags here are assigned by MERGE
order across parallel legs, so the next free number is already taken by
whichever leg merged first and the qNN-to-vNN reflex claims another leg's
tag. `git tag --list 'v*' | sort -V | tail` plus
`git log -1 --format='%h %s' <tag>` is the check, and an honest close-out
row states what is TRUE at the commit (built, gates green at `<sha>`, PR
and tag pending) rather than a number the push task will discover.

**A close-out's gate captures routinely PREDATE HEAD by a commit**, and the
gap is closed per GATE by which files each one can OPEN rather than by
re-running the battery: `check-types` and `test` cannot open a markdown
file, so their captures cover a docs-only HEAD's code exactly, while `lint`
DOES reach repo-root markdown and is the one gate worth re-running. The
reading that surfaces the gap at all is the `pretest` stamp line inside the
test capture, whose sha is the tree the artifacts were built from; without
it a close-out silently reports a battery against the wrong commit. Say
which sha each row was taken at rather than quoting one for all three.

**Two markdown faults bite close-out prose specifically**, and no width
check, link sweep or gate reports either. A bare vertical bar inside a TABLE
CELL (quoting a vitest summary such as `9 passed | 2 skipped`) splits the
cell silently and the row renders with an extra column — assert every row's
pipe count equals the header's in the same probe that writes it. And a code
span WRAPPING across a newline is safe only where the break is a WORD
boundary: CommonMark turns the newline into a space, so breaking
mid-identifier at a dot or an underscore renders a space INTO the name. The
check is one line — a line whose BACKTICK COUNT IS ODD has a span crossing
the newline, and it is a fault only when that line ends in an identifier
character.

**Appending a close-out section to a ralph plan must write BOTH**
`PLAN-<stub>.md` and `PLAN_TRACKER-<stub>.md`, or the two stop being
byte-identical apart from checkbox state and a wrap-up session reading
either one may miss it. It is safe: `findNextTask` in
`tools/ralph/utils/tracker.ts` matches only `^- \[ \] ` and
`^- \[BLOCKED\] `, so headings, tables and plain `- ` bullets are ignored,
and nothing in the loop parses a `# Stage:` heading at all. Prove it rather
than assuming — import `findNextTask` under bun and drive it over the
edited tracker; it must still name the same open task at the same line
number. Verify the pair with
`diff <(sed 's/^- \[x\]/- [ ]/' <tracker>) <plan>` at zero lines.

**But "it is safe" covers the PARSER and not the LOOP, and the loop cannot
tick a task that appends to its own plan.** `tools/ralph/start.ts` reads the
tracker and computes `taskInfo.lineNum` BEFORE dispatching the agent, then
calls `updateTrackerLine(trackerPath, taskInfo.lineNum, 'done')` AFTER it
returns. Every close-out task appends under the `## Close-out notes`
heading, which sits ABOVE the whole task list, so the append shifts every
checkbox down by however many lines it wrote and that captured index is
stale by exactly that much. `updateTrackerLine` re-reads the file but
indexes it positionally, and its `line.replace(/^- \[ \]/, '- [x]')` is a
silent NO-OP on a non-checkbox line, so the tracker is rewritten
byte-identical and the SAME task is dispatched again forever. Measured: a
160-line append moved the task from 0-idx 573 to 733 and left the loop
aiming at a code-fence line. The repair is for the appending task to tick
its OWN box in the TRACKER (never the plan — the pair is byte-identical
APART from checkbox state).

**The safety property that owes is about the BLOCK, not the arithmetic.**
The stale index routinely lands INSIDE the appended block rather than on
shifted old content (measured, offset 68 of a 151-line block), so assert
the appended block carries NO checkbox line ANYWHERE and the loop's later
positional write is a guaranteed no-op wherever in it it lands. A probe
holding `pre[captured - inserted] == post[captured]` FAILS on a correct
append and reads as broken arithmetic, the shift formula only applying at
or beyond the block's END; `inserted` is `anchor - start`, the block
INCLUDING its blank separator.

**`findNextTask` takes the tracker's CONTENT, not its path**, and handing
it a path returns `null` rather than throwing — which reads exactly like a
tracker whose edit broke the parser, the shape the probe exists to rule
out. Its `TaskInfo` fields are `task`, `lineNum` (ZERO-indexed) and
`status`, NOT `text`/`lineNumber`, and the open status VALUE is
`'unchecked'` rather than the `'pending'` a reader assumes (blocked is
`'blocked'`). Reconstruct the pre-edit side by REVERSING the edit in
memory: `.plans/` is untracked, so `git show HEAD:<the plan>` dies and
there is no committed before-side to diff against at all. And the usual
controls go UNINFORMATIVE the moment your own tick leaves the tracker with
no open task — `null` is then the correct answer, and the
path-instead-of-content and every-box-ticked controls both answer `null`
for the trivial reason. The discriminating drive is to UN-TICK your own box
in memory and require the parser to name THIS task at THIS index.

**A deterministic doc-appender's splice must remove the block AND the blank
separator it wrote**, or the file GROWS BY ONE LINE per run and the fault
surfaces three places away from its cause. Measured: backing the end off
over blanks removed 118 of the 119 lines it had inserted, so run 2 left a
doubled blank, the reconstruct-the-pre-edit-file sha MISSED — which reads
exactly like the retouched-neighbouring-line finding that check exists to
report — and the ralph index arithmetic went off by one with every other
assertion still passing. Take `lines[:start] + lines[anchor:]`, and let a
second run's sha equality be the reading.

**A PR-opening task's own verification is `gh pr checks`**, and it can
find a defect no local gate could — run it rather than treating the
create's URL as the outcome. Two readings it gives free. Jobs EXISTING is
the post-push corroboration of a pre-push clean `merge-tree` reading,
since a DIRTY PR dispatches none. And `mergeStateStatus` `UNSTABLE`
beside `mergeable: MERGEABLE` is checks-in-flight-or-failed and NEVER a
merge problem, so a reader keying on "not CLEAN" reports a healthy PR as
blocked. Poll it with the tool's own `run_in_background` and a loop over
`gh pr checks` breaking when no row reads `pending`; a job's log is
unreachable through `gh run view --log-failed` while ANY job in the run
is still going, and the fetchable form meanwhile is
`gh api repos/<o>/<r>/actions/jobs/<id>/logs`, with the step list from
the same endpoint without `/logs`.

**When a hosted gate contradicts a body you already published, AMEND the
body** rather than reporting the red only in the chat or a spec: an
outbound document asserting green while its own CI is red is the one
artifact a reviewer takes entirely on trust. The shape that worked — a
`## Known red` section LEADING the body with the mechanism and the
candidate repairs, the DoD bullet the red belongs to qualified in place,
and a pointer inside the contradicted capture block itself, so a reader
landing on the capture cannot take it for a verdict. Do NOT pick the
repair inside a PR task where the candidates differ in blast radius
— state them and let the next plan choose.

**Compare a published PR body in BYTES on both sides**, or the two figures
disagree by exactly the multi-byte characters and a correct edit reads as
never having published: measured on a body carrying em dashes, python's
`len(str)` answered 17543 where `len(bytes)` answered 17603, a 60-byte gap
that is entirely U+2014. Normalise CRLF and the trailing newline, compare
the BYTES, and print both lengths beside the boolean. Two readings make
that comparison self-explaining rather than a bare boolean, and both are
one line. Where the two lengths are EQUAL the body is pure ASCII and the
em-dash gap is moot for that body, which is worth SHOWING rather than
leaving a reader to wonder whether it was checked. And GitHub adds exactly
one trailing byte — the raw remote body comes back one byte longer than
the local file — which the CRLF normalisation plus an `rstrip` of the
trailing newline absorbs; a comparison skipping it reports every correct
publication as a mismatch.

**A PR body's hosted-CI sentence is stale BY CONSTRUCTION**: it has to be
written before the push, and the run it describes cannot exist until after
`gh pr create` returns. Write it as of the moment it was written, then
UPDATE it once the run resolves — and treat `gh pr edit --body-file` as a
SECOND publication owing the whole outbound discipline again, the
origin-needle sweep and the remote byte re-read included, since the edit is
exactly where an unswept paragraph enters. Say which HALF of the tree the
hosted green covers rather than letting a tick stand for the fan-out:
`back.yml` runs `@ar/service`'s own suite and not `test:all`, cannot run
`test:live` at all, and `front.yml` correctly does NOT dispatch on a
service-only branch — so an absent Front job is a path-filter reading and
not a missing check. Derive that per-workflow match count from the filters
rather than asserting it; root `AGENTS.md` matches NEITHER.

### Task shape to agent

**A task's `agent=` key routes its dispatch, and the key is the task's
SHAPE rather than its subject or its verb.** A documentation task's verb
is whatever the edit happens to be (`Remove ...`, `Rewrite ...`,
`Split ...`) while the thing it names is reliably a markdown file, so
the shape discriminates where the verb does not.

| Task shape | Agent | Where it lives |
|---|---|---|
| Prose — an `AGENTS.md` map, a `context/` page, a README, a skill or an agent file | `doc-updater` | `.claude/agents/doc-updater.md` |
| Tests — a suite over code that already exists, or a red-first case | `tdd-guide` | user-level |
| Migrations — drizzle SQL, schema or query work under `packages/service` | `database-reviewer` | user-level |
| Repair — a red gate, a type error, a broken build | `build-error-resolver` | user-level |
| Cleanup — dead code, duplicates, a consolidation | `refactor-cleaner` | user-level |
| Review of a TypeScript change | `typescript-reviewer` | user-level |
| Review of a change as a whole | `code-reviewer` | user-level |
| Review of an `@ar/ui` component or reference page | `component-reviewer` | `.claude/agents/component-reviewer.md` |
| Implementation — a module plus its TSDoc plus its colocated tests | `loop-implementer` | `.claude/agents/loop-implementer.md` |

**`user-level` in the third column is a portability warning and not a
footnote.** Those six definitions live outside the repo, so a fresh
clone receives none of them and the name resolves against whatever that
machine happens to hold — or against nothing. The three tracked rows
travel. A project file also SHADOWS a user-level agent of the same name
rather than merging with it, and the roster is blind to the difference:
a shadowed name appears exactly ONCE in the CLI's own list of available
agents, so only a behavioural probe separates a shadow from an
unshadowed name — ask for a literal each definition carries and the
other does not, and require each side to answer its own plus a refusal
token for the other's, since a resolver that MERGED the two would
answer both questions from one column.

**A name that resolves to nothing STOPS the dispatch**, which is what
makes a wrong row something a test can find rather than a silent
downgrade: an unresolvable agent exits 1 with NO JSON at all and the
whole roster on stderr, before any model call. That makes the refusal a
free roster reading too, but only the DIFFERENCE between two rosters is
a bijection with a directory — the repo-root roster minus an empty
project's was exactly the files in `.claude/agents/`, while neither
roster alone matched any directory on disk.

**`agent=` outranks the other three declaration keys because routing
supplies the model.** A declaration carrying an agent passes only
`--agent`; its `model`, `effort` and `tools` stay on the record so the
collector can report what the planner expected against what ran, and
none of the three reaches the CLI. The model comes from the agent
file's own frontmatter — `doc-updater` haiku, `loop-implementer` and
`component-reviewer` opus, every user-level row sonnet — and a haiku
session writes no top-level effort field at all, so routing a task to
one empties the effort histogram rather than filling it in.

**Routing also changes what a session can be read back from.** The
prompt is untouched, byte-identical to what was piped in, but record 0
becomes an agent-setting record and the enqueue moves to record 1, so
every prompt-keyed reader has to key on the type/operation pair and
never on position. Three listing attachments and the prompt snapshot go
away with them, worth a constant 28,509 tokens per turn at both prompt
sizes measured — a saving ADDITIVE with the AGENTS.md split rather than
overlapping it, since the instructions attachment carries those files
over unchanged. The cost is that a routed session's system prompt and
tool list are unreadable from its log; the agent NAME is the whole of
what can be read back.

**The three review rows land nothing, and there is no fourth.** Each
carries Read, Grep, Glob and Bash and neither Write nor Edit, so a
review task's deliverable is a report and the repair it asks for is a
separate task under one of the rows above. `security-reviewer` is NOT
one of them whatever its name suggests: it carries Write and Edit, so
routing a review there hands a reviewer the ability to land the change
it is reviewing.
**A FAST-FORWARD makes `git merge-tree --write-tree` trivially clean**, and a
close-out quoting the clean answer without saying so overstates it. Measured
with `origin/main` an ancestor of HEAD: exit 0, 41 bytes, one 40-hex OID —
and that OID EQUALS `HEAD^{tree}`, THEIRS is zero paths, and the both-touched
set is empty BY CONSTRUCTION. So the two readings a real three-way merge owes
are UNAVAILABLE rather than skipped: no auto-merged blob to take line
arithmetic over, and no disjoint-hunk argument to make. What keeps the
mechanism live is the `/tmp` throwaway CLEAN control's own arithmetic — two
branches appending to DIFFERENT files, the merged tree carrying both sides'
line counts — beside the CONFLICT and NOT-RUN legs. Say that the answer is
only true while the base has not moved.

**A plan's own Description predicts which CI workflows its changes will
trigger, nothing re-reads that prediction, and it is routinely FALSE by the
tip.** Measured on q19, whose Description said no package under `packages/` is
touched: 26 changed paths sat under `packages/` and BOTH workflows' `paths:`
filters matched. Derive the match by holding each filter glob against
`git diff --name-only <base>..HEAD` rather than against what the plan
remembered, and read the matching job's STEPS too — `back.yml`'s test step is
`bun run test` at the root, which IS the ralph suite. The filter to check
FIRST is the one the two workflows SHARE: `bun.lock` sits in both, so any plan
that adds a dependency dispatches the front-end workflow on a branch that
changes no file under `packages/ui` or `packages/web`.

**Regenerating a plan from its spec is not an annotate-in-place job**, and
`ralph plan` cannot do it in place either: `plan.ts` REFUSES when
`.plans/PLAN-<stub>.md` already exists (exit 1), and `.plans/` being
gitignored means the file has no HEAD side to recover from — so a copy in
`/tmp` taken before the write is the only undo, and its sha is what says the
installed file is the one that was verified. What makes it a REGENERATION
rather than a retrofit is re-deriving the plan's own anchors: measured
regenerating q16a, every CODE figure still held while the prose anchors had
all moved, so take the code figures as the cross-check that the plan is still
about this tree and re-derive every file/line citation and every count. A
task-count breakdown in a Description drifts the same way and in the
direction that flatters the plan; the arithmetic that closes it is code plus
operator runs plus captures equalling the task total.

**A plan whose task lines carry declarations has ONE reading and it is
hand-run**, `.plans/` sitting outside every gate: drive each `- [ ] ` line's
captured text through the real `parseTaskDeclaration` and
`resolveDeclarationFlags` under bun, and take the RESOLVED FLAG HISTOGRAM
rather than a declared/undeclared count. The histogram is what shows two
spellings of one tool set reading as two routes, which no per-line check
sees. Pair it with `findNextTask` over the same text and with two negative
controls in the same run — a line with no block, and a line ending on a code
span holding braces — both required to answer null.

**Four guards make a close-out block writable without a gate**, and all four
are cheap to run BEFORE the append rather than after: the file's own measured
prose width, backtick parity per PARAGRAPH (and per ROW inside a table),
pipe count per contiguous table block against that block's own header, and no
byte under 0x20. Each owes a PLANTED violation in the same run, and the plant
itself needs measuring — a line planted as "much much much too long" came out
at 67 characters and the width guard correctly ignored it, reporting the
guard as dead when it was the control that was. A guard that aborts the
appender leaves both the plan and its tracker byte-identical, which is a far
cheaper failure than a repair edit.

**A multi-line substring replacement inside hand-wrapped prose whose `old`
ends MID-LINE silently joins its tail onto the rest of that line.** Measured:
a five-line replacement that preserved its own line count produced a
93-character line because the source line ran on past the replaced text. The
width check catches it and nothing else does — the sha reconstruction still
matches and the join is word-identical. Re-wrap the joined remainder and hold
`' '.join(wrapped)` against the original join.

**Locate a table row to edit by its LEADING CELL with a uniqueness assertion**
rather than by line number, then assert the changed-line SET equals exactly
those rows. That is what makes "touched no sibling row" a reading instead of a
promise, and it composes with the reconstruct-and-compare-sha check that
`.specs/` and `.plans/` files owe for having no HEAD side.
