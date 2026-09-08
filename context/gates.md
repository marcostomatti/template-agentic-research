### Which gate reads which file

A fan-out's green SHAPE is invariant under any change to what it COVERS, so
"exits 0 with its five-line shape" and "read my files" are two questions and
the shape answers only the first. A leaf config that had silently stopped
matching anything prints exactly the same five lines.

- NO gate in the `lint:all` fan-out lints any package-ROOT file — 11 of them
  across the three packages, including every `vitest.config.ts`,
  `eslint.config.mjs`, `tsconfig.json`, `AGENTS.md` and `README.md`.
  `@ar/service`'s script is `eslint src lib workflows tests scripts`, and the
  root leaf config ignores `packages/**` (`eslint.config.mjs` line 11).
- Those files are un-TARGETED, not IGNORED, and the two need different fixes
  while looking identical from the fan-out. `bun x eslint -f json
  eslint.config.mjs` from inside the package returns a result entry with
  `messages: []` — the covered-and-clean shape — and NOT a `File ignored
  because of a matching ignore pattern` warning. So the fix is a one-word
  script edit, never an ignore-pattern change, and `--no-ignore` is a
  misleading reflex that presumes the half nobody measured. Ask with a plain
  explicit-path `-f json` run first.
- CORRECTION to the sentence above: which of the four shapes an
  explicit-path run answers is a function of the CONFIG the cwd selects and
  NOT of the file, so any run reporting a shape owes the directory it ran
  from. `packages/service/package.json` is the member that shows it —
  covered-and-clean at 0 errors and 0 warnings from INSIDE the package,
  where the same explicit path taken from the ROOT answers the IGNORED
  shape, the root leaf config ignoring `packages/**`. Measured over one
  branch, all six changed package markdown files plus the manifest answered
  covered-and-clean from `packages/service`, so the repair for any of them
  is a one-word pathspec edit rather than an ignore change — the
  opposite of what the root-taken reading implies. There is a FOURTH shape
  besides covered-and-clean, ignored and a real finding, and `bun.lock` is a
  member: `File ignored because no matching configuration was supplied` at 0
  errors and ONE warning, the base config scoping its blocks to js/mjs/ts,
  md and json. A classifier keying on `"messages":[{` scores it as a
  FINDING. The `bun x` per-directory trap does NOT bite eslint here (v9.39.5
  from both the root and the package), so choosing the directory is about
  the config and never the binary — measure it in the same command
  anyway, or a reader carrying the playwright precedent attributes a shape
  difference to the tool.
- BOTH not-covered shapes exist here and they need OPPOSITE repairs, so
  classify before proposing either. Measured over eleven paths in
  `packages/service` that neither package gate reads: the eight markdown
  files (package-root `AGENTS.md`, `ARCHITECTURE.md`, `README.md`,
  `docs/SEEDING.md` and four under `docs/architecture/`) answer the
  covered-and-clean shape and are un-TARGETED by the script's pathspec,
  while the three `drizzle/` artifacts answer `File ignored because of a
  matching ignore pattern` against an explicit `drizzle/**` at that
  package's `eslint.config.mjs:7`. The one-word-script-edit rule above is
  true of the first half and false of the second, and the two are
  byte-identical from the fan-out.
- Un-TARGETED is not un-LINTABLE, and the gap between the two hides a real
  error nobody will ever be shown. The base config's markdown block DOES
  carry rules for a package-root `.md`: an explicit-path `bun x eslint -f
  json AGENTS.md` from inside `packages/web` once returned neither the
  covered-and-clean shape NOR an ignore warning, but one severity-2
  `markdown/fenced-code-language` naming a route-diagram fence. That
  example is HISTORICAL and no longer reproduces — the fence has since
  been tagged, and at `ee338e3` and after, that file carries two fenced
  blocks with a language apiece and the run answers the covered-and-clean
  shape at exit 0. So the zero there needs the planted control the ROOT
  file's own bullet below prescribes, and it passes it: appending a
  languageless fence reds the same run at exit 1 naming
  `markdown/fenced-code-language`, and restoring leaves the file
  byte-identical. Run the explicit-path form once on any package-root
  docs task: it is the ONLY reading that exists, no fan-out line is
  evidence about the file, and a fence or link fault introduced there is
  invisible forever.
- The covered-and-clean shape has NO liveness of its own, and for the ROOT
  `AGENTS.md` it is a zero over an EMPTY rule surface: that file carries
  ZERO fenced code blocks, so the one markdown rule measured to fire here
  has nothing to read there and `messages: []` is the answer whether the
  block matched or not. Close it with a planted control in the same
  sitting — append a languageless fence, re-run, read the exit 1 and
  the named rule, restore — and pair that with the IGNORED shape from a
  sibling path (`packages/web/AGENTS.md` handed to the same root-run
  command). The plant proves a rule COULD fire; the sibling proves the run
  is not ignoring its subject. Neither alone is the reading.
- A "this directory was never touched" claim has a needle-liveness half,
  and BOTH git commands fail silently without it: `git diff --name-only
  <range> -- packages/servicx` and `git log --oneline <range> --
  packages/servicx` each exit 0 with zero bytes on stdout AND on stderr,
  byte-identical to a correctly spelled pathspec answering honestly empty.
  A sibling path asserted PRESENT proves the RANGE is non-empty and says
  nothing about the spelling. `git ls-files -- <pathspec> | wc -l` above
  zero, or `git ls-files --error-unmatch -- <a known member>` at exit 0
  with a fabricated sibling asserted exit 1, is the leg that closes it.
  Three free widenings: `--full-history` (print the branch's MERGE COUNT
  beside it, since zero merges means the two forms agree by construction
  and the flag proved nothing), `--no-renames`, and the whole-branch
  changed set bucketed by TOP-LEVEL path, which needs no pathspec at all
  and so cannot inherit a pathspec fault. Both subject commands read
  COMMITTED history alone, so the claim also owes the working-tree half
  (`git status --short -uall -- <path>` plus `git diff HEAD --name-only --
  <path>`) — trivially empty on a clean tree, which is exactly when a
  reader forgets it was part of the claim.
- Two of those three widenings carry a MECHANISM worth stating, because
  both read as ceremonial. `——no-renames` is LOAD-BEARING on any
  package-was-not-touched claim: under rename detection a file MOVED OUT
  of the excluded package is ONE rename entry printing its DESTINATION
  only, so a `-- packages/<pkg>` pathspec never matches it and the
  exclusion claim comes back clean; `——no-renames` splits that into a
  delete the pathspec does match. Print the branch's whole rename
  inventory beside it (`diff ——name-status ——find-renames` filtered to
  `^R`) — zero renames means the two forms agree by construction and the
  flag proved nothing, the same caveat `——full-history` carries against a
  zero merge count. And the TOP-LEVEL bucketing is the STRONGEST leg
  precisely because it takes no pathspec: bucket `git diff ——name-only
  ——no-renames <base>..HEAD`, read the excluded package's bucket as
  absent, and reconcile the buckets against the total by ARITHMETIC
  (measured 30 web + 6 ui + 1 repo-root + 0 service == 37). The sum
  reconciling is what says the classifier dropped no path; the pathspec
  forms structurally cannot say it, each seeing only its own slice. Run
  the misspelt pathspec in the SAME command — `packages/servicx` answered
  exit 0, 0 stdout bytes and 0 stderr bytes, byte-identical to the correct
  spelling's honest empty.
- `git check-ignore -v`'s SOURCE field is the load-bearing half of the
  ignored-trio claim above, and the prescription naming only the rule and
  the LINE leaves it open: an ignore can come from `.git/info/exclude`,
  which is per-CLONE, untracked and travels with nobody, so a path
  protected only there is UNPROTECTED on a fresh clone and in CI while
  every local reading still says ignored. Both sources are live here and
  one command reports both — measured `.gitignore` lines 7, 20 and 21
  governing `progress.txt`, `.plans` and `.specs`, against
  `.git/info/exclude:7` governing `.claude/worktrees/`. So assert the
  source is the TRACKED `.gitignore` (`git ls-files ——error-unmatch
  .gitignore`) rather than merely non-empty, and cross-read each named
  line with `awk`. The `ls —ld` leg beside it carries the exit-code trap
  in the OPPOSITE direction: `check-ignore` exits 0 when ANY ONE argument
  is ignored, while `ls —ld a b c` exits 1 when ANY ONE is missing and
  identically when ALL THREE are (measured 2 stdout lines beside 1 stderr,
  against 0 beside 3, both at EXIT=1). The reading in BOTH halves is the
  stdout LINE COUNT held at three, for opposite reasons — and `ls` SORTS
  its output rather than preserving argument order, so a positional read
  of the first line names the wrong path.
- `gate:control-bytes` has a THIRD mode: `——include-untracked` adds
  `git ls-files ——others ——exclude-standard` to the walk. Measured at a
  throwaway repo — an untracked file carrying a raw NUL is INVISIBLE to
  the default run (exit 0, 2 files scanned) and CAUGHT by the flag (exit 1
  naming it), while a GITIGNORED file carrying the same byte is invisible
  to BOTH, so `progress.txt`, `.plans/` and `.specs/` stay outside even
  that mode. It is a NO-OP on a clean tree (identical count at the real
  repo), so it cannot serve as a coverage proof on its own and the
  stage-first law still owns that job. `bun run` forwards the flag. Parse
  the scanned count out of the gate's own CAPTURE rather than hardcoding
  a number a run printed, and anchor the regex on the ASCII tail
  (`file\(s\) scanned`) — the OK line separates the verdict from the
  count with a non-ASCII dash, so a matcher keyed on that spelling is a
  codec risk on the one line the whole coverage proof turns on.
- A task told to run a gate `with every file STAGED` is discharged by
  TRACKEDNESS on any plan whose earlier tasks each committed their own
  work, and the healthy evidence reads exactly like a failure:
  `git add —A` exits 0 having staged ZERO, so `git diff ——cached
  ——name-only` is empty and a driver requiring a non-empty staged set
  reports a correct state as broken. The FULL gate walks `git ls-files`,
  so committed is strictly STRONGER than staged and the precondition is
  already met. The reading with content is per-PATH membership instead
  (measured 37 of 37 present, 0 deleted, 0 unscanned, over a branch of 24
  added and 13 modified).
- A branch's mergeability can be entirely about `origin/main` while local
  `main` sits AT the merge-base, so `git merge-base main HEAD` and
  `git merge-base origin/main HEAD` answer the SAME sha and nothing says
  the local ref is stale. Measured at the q17 tip: both answered `ee338e3`
  while `origin/main` was 80 commits beyond it, so every before/after
  reading the plan took against `main` stayed correct while the merge
  answer was about a tree none of them had seen. Print
  `git rev-list ——count <base>..main` beside `<base>..origin/main` — a
  plan quoting `the merge-base` is not wrong, and a reader takes local
  `main` for current.
- The both-touched set can be exactly ONE file and that file can be the
  conflict, which makes the line-arithmetic reading above UNAVAILABLE
  rather than skipped: there is no auto-merged both-touched blob to take
  it over. Measured 37 paths ours against 111 theirs intersecting at one
  docs file. SAY the reading is unavailable — a close-out silently
  omitting it reads as one that forgot, and the merged blob still owes the
  conflict-marker and duplicate-heading sweep, which a conflicted path
  does carry. Two parallel legs can also independently correct the SAME
  false claim in a shared doc, and that conflict is an AGREEMENT rather
  than a disagreement, which changes the resolution from a merge to a
  choice of wording. What separates it from a real semantic conflict is
  reading the two sides' COMMIT SUBJECTS and the paragraphs whole
  (`git show <ref>:<path>` per side, braced against the zsh
  history-modifier trap), never the conflict hunk alone.
- `bun run test:all` at a clean tree can come back FULLY GREEN even
  though the `@ar/service` supertest flake is live, so a stage asserting
  the one-red shape reports a clean fan-out as a broken baseline.
  Measured twice at ONE commit on one tree, 42 minutes apart: EXIT 1 with
  `1 failed | 138 passed | 25 skipped (164)` and EXIT 0 with
  `139 passed | 25 skipped (164)`, the two reconciling member for member
  with the one case crossing out of the `failed` segment. The FILE and
  CASE totals are identical on both sides and are what a stage can hold;
  the failing case's identity re-rolls between files AND within one file.
  Attribute such a red by running the NAMED FILE ALONE first —
  `bun x vitest run <file>` from inside the package is —10s, runs NO
  `pretest`, builds nothing and mutates nothing, which makes it safe
  against a package a parallel leg owns.
- A `zero commits touch <dir>` claim is NOT answered by the changed-set
  bucket above, and the two are different questions. `git diff <base>..HEAD`
  is a TREE-to-TREE comparison, so a path CREATED AND DELETED inside the
  range sits in neither tree and is absent from the bucket AND from the
  pathspec form, while every commit that touched it is real (measured in a
  throwaway repo: both diff forms answered EMPTY where `git log --oneline
  <range> -- <path>` answered 2 commits). So the bucket is the PATH reading
  and only a per-commit walk is the COMMIT one; they can agree without
  either being the other's control, so run both and say which carried the
  claim. The per-COMMIT top-level partition needs no pathspec, so it cannot
  inherit a pathspec fault: bucket each commit's own
  `git show --name-only --format= -z` paths by first segment (first TWO
  under `packages/`), then hold the bucket SUM against
  `git rev-list --count <range>` — equal is what says every commit was
  classified, so a commit touching nothing any bucket names is NAMED rather
  than silently absent.
- That sum reconciles ONLY when each commit lands in exactly ONE bucket, so
  key the bucket on the commit's whole SET of top-level segments joined and
  never add the commit once per segment. Measured over 41 commits: three
  touched two areas at once, so the per-segment spelling answered 44 against
  41 and read as three double-counted commits — landing precisely on the
  arithmetic that IS the reconciliation. The set-keyed form also keeps a
  commit no bucket names visible as its own empty-set bucket.
- A per-commit walk over a range containing MERGES is silently BLIND, and it
  answers an exclusion claim CLEAN for the merge that brought the excluded
  package in: `git show --format= --name-only <merge>` prints ZERO paths
  (measured 0 against 6 for that same commit under `-m --first-parent`).
  Branch the walk on the parent count from
  `git rev-list --parents -n 1 <sha>`.
- All three widenings of a never-touched claim can be VACUOUS BY
  CONSTRUCTION, and the honest close-out says which proved nothing: zero
  renames makes `--no-renames` agree with the default, zero merges makes
  `--full-history` agree, and a range whose paths all still exist at HEAD
  makes the per-commit UNION equal the tree-to-tree changed set (measured
  62 == 62 with ZERO transient paths over 41 commits). What makes the walk a
  reading anyway is two SET comparisons rather than its own bucket sum —
  the union held as a SUPERSET of the changed set (a walk that resolved
  nothing answers an empty union and reports every changed path as missing),
  plus the TRANSIENT set printed, which is the only population the
  tree-to-tree diff structurally cannot see.
- The repo-ROOT untracked plant cannot prove a PATHSPEC-scoped
  `git status --short -uall -- <dir>` zero: the root plant says `-uall`
  reports untracked files at all, where a plant INSIDE the excluded
  directory is the only one saying the pathspec resolves to it. Measured 0
  bytes at rest, 42 naming the plant, 0 after removal, with the whole-tree
  status byte-identical either side as the revert check.
- `git ls-files --error-unmatch` gives such a claim a THIRD control the
  fabricated-sibling one cannot: a nonexistent file UNDER a real tracked
  prefix. `packages/webx` exits 1 for the trivial reason, where
  `packages/web/zz-no-such-file.ts` exits 1 though its whole directory is
  tracked — which is what says the pathspec resolves to FILES and not to a
  directory prefix that merely exists — and the bare prefix exits 0 by
  matching the tracked files beneath it. The three exits (0, 1, 1) are
  three different claims, and only the pair of 1s says the mechanism
  discriminates.
- An explicit-path `-f json` run and the SCRIPT's own pathspec answer
  DIFFERENT questions, and a gate-coverage claim owes BOTH. The explicit
  run proves ESLint does not IGNORE the file and says nothing about
  whether the gate REACHES it, because the run supplies the paths itself;
  only running the script's own pathspec (`bun x eslint src lib workflows
  tests scripts -f json` from inside the package) and holding its reported
  `filePath` set against the changed paths puts the pathspec under test on
  the gate's side. Measured on one branch: the script's run reported 220
  entries at 0 errors and covered all 54 changed `.ts` files, and the same
  54 handed explicitly came back 54/54 set-equal. Only the second reading
  survives a task quietly dropping `tests` or `scripts` from the script.
- `bun run gate:control-bytes` DOES open every tracked file, package-root
  `README.md` and `AGENTS.md` included (676 scanned at the time of writing,
  and that count is its own liveness control). So a docs-only commit is NOT
  gateless — it has exactly one green worth reading, and it is neither
  fan-out.
- That gate is BLIND to a file you just created, and it prints the same
  count either way, so "the scanned count moved by the files I added" is a
  false green until `git add`. It walks TRACKED files, and an untracked new
  file is not one (measured 677 with a new file present AND with it stashed,
  then 678 the moment it was staged). Stage first, then read the count as
  the coverage proof. The pre-commit hook is NOT the same reading: its
  `--staged` mode reports the STAGED file count, which says the hook ran and
  nothing about repo-wide coverage.
  `--staged` also has NO liveness control of its own in the vacuous shape:
  `nothing staged to scan` at 0 staged is byte-identical to a `--staged`
  mode that had stopped scanning, and the scanned-equals-staged rule reads
  0 == 0 either way. One throwaway file closes it in about ten seconds —
  write an ASCII `zz-tmp-*.md` at the repo root, `git add` it, re-run and
  read `1 file(s) scanned`, then `git restore --staged` plus `rm` with
  `git status --short --untracked-files=all` printing 0 BYTES as the whole
  revert check. Same plant-and-revert discipline the repo already uses for
  a tracked mutation leg, one gate over.
- Deriving that delta needs no checkout, worktree or stash: `isScannable` is
  EXPORTED from `tools/control-byte-gate/control-byte-gate.ts` and that
  module imports only node builtins, so a /tmp `.mjs` importing it by
  ABSOLUTE path applies the gate's OWN selection to
  `git ls-tree -r --name-only -z <base>` as well as to `git ls-files -z` at
  HEAD. The HEAD-derived number agreeing with the count the gate just
  printed is what says the derivation used the gate's selection rather than
  a retyped guess, and it names WHICH paths arrived. Owe the delta against
  the PLAN's base (`git merge-base main HEAD`), never against a figure an
  earlier stage recorded — the two disagree by construction. Carry two
  controls: a definitely-absent but scannable path (in NEITHER set, so
  membership is discriminating) and a binary-allowlist path (`a/b.png`,
  false, so the predicate is not simply answering true for everything).
  That second control is necessarily SYNTHETIC here and saying so is part
  of the reading: ZERO tracked files carry any of the 40
  `BINARY_EXTENSIONS` and `ALLOWLISTED_PATHS` is empty, so `isScannable` is
  the IDENTITY over `git ls-files` and the three numbers agree trivially.
  Print the EXCLUDED count (`tracked - scannable`) beside the verdict so
  that zero is visible rather than implied — a reader taking `a/b.png` for
  a real tracked file reads the derivation as stronger than it is.
- `--staged` is VACUOUS in two shapes, and both print the same
  `nothing staged to scan` the pre-commit hook does, so the
  scanned-count-equals-staged-count rule has nothing to read there. A pure
  DELETION commit is the first; a plan's FINAL staging task is the second,
  since every earlier task committed its own work and `git add -A` exits 0
  having staged nothing. The reading with coverage in it is the FULL run
  derived through `isScannable` (measured 780 == 780 over `git ls-files`,
  and 775 to 774 naming exactly the removed path on a deletion).
- That `tracked == scanned` equality is an IDENTITY in this repo, so it
  cannot report a selection that has widened and must not be quoted as the
  coverage measurement on its own. Measured at one HEAD: 832 tracked == 832
  scanned == the 832 the gate itself printed, with EXACTLY ZERO tracked
  paths excluded — `ALLOWLISTED_PATHS` is empty and not one tracked
  file carries a `BINARY_EXTENSIONS` member (the whole tracked extension
  set is ts/tsx/md/json/mjs/css/yml/sql/example/sh/html plus 13
  extensionless, and `bun.lock` is `lock` rather than the binary `lockb`).
  So the three-way agreement would hold under a predicate answering true
  for every string, and the two controls named above carry the whole
  discrimination — both of them SYNTHETIC, with no real subject in the
  tree. Report it as an identity plus its synthetic controls, expect the
  excluded count to stay 0 until the first tracked binary asset lands, and
  re-derive the denominator: it moved 780 -> 831 -> 832 -> 975 across four
  recorded readings, the tracked extension inventory holding at the same
  twelve extensions while only the extensionless half grew (the newcomer
  being `packages/web/.gitignore`, which `isScannable` files there because
  it keys on `lastIndexOf('.') <= 0` rather than on an extension called
  `gitignore`).
- That scanned count is a COVERAGE reading and says NOTHING about whether
  the scanner still discriminates — which is the half the identity
  above cannot supply. The zero-risk liveness control drives the same
  binary at a THROWAWAY repo instead: `git init` a `/tmp` dir, write one
  clean file and one carrying a raw NUL (python `bytes([0])`, never an
  edit tool, which cannot reliably emit a byte it renders as whitespace),
  commit, and run the gate with `--root <that dir>`. Measured exit 1
  naming `planted.ts:1:20  0x00` with the byte rendered back as `<0x00>`,
  then exit 0 over the same repo after a `git rm` of the plant. That
  exercises walk, selection, read, scan and exit code end to end with the
  real tree never touched, which is what makes a 975-file zero a reading
  rather than a dead needle.
- Extend the coverage proof from the ADDED/REMOVED count delta to per-PATH
  MEMBERSHIP, which is the leg that says the gate read THIS BRANCH rather
  than that a number matched: every path in `git diff --name-only -z
  <base>..HEAD` still present at HEAD must be a member of the
  `isScannable`-filtered `git ls-files` set (measured 101 of 101 present,
  0 deleted, 0 unscanned), with the fabricated-absent control asserted NOT
  in that set in the same command. Under a predicate that is the identity
  over the tracked set, a count cannot say anything at all.
- The clause beside it — "confirm the ignored trio is absent from
  `git status --short --untracked-files=all`" — is evaluated against an
  EMPTY capture on a clean tree, where a grep returns 0 for every needle
  INCLUDING a misspelt one, so the absence is proven by nothing at all.
  Three controls close it in one command: the three paths must EXIST on
  disk (`ls -ld`), `git check-ignore -v` must name the governing rule AND
  LINE for each with one TRACKED path asserted exit-1 so the exit-0s are
  shown discriminating, and the same grep shape must return a hit for all
  three over a PLANTED capture. That exit code is NOT itself a three-path
  reading: it is 0 when ANY ONE argument is ignored, measured printing two
  lines and exiting 0 over a trio carrying a misspelt member, so parse ONE
  OUTPUT LINE PER PATH and assert the path SET equals the trio. The record
  is `<source>:<line>:<pattern>` TAB `<path>` and the pattern is free to
  carry colons, so split on the TAB first and never on the whole record.
  Filtering `git ls-files` through `isScannable` then closes the loop for
  free: the trio is in NEITHER the tracked nor the scanned set, which is a
  stronger statement than the ignores alone.
- That path-SET assertion fails on a CORRECT ignore whenever the trio is
  spelled with trailing slashes: `git check-ignore -v` echoes each path
  ARGUMENT back verbatim while the PATTERN it names carries the slash, so
  `.plans` in answers path `.plans` and pattern `.plans/` on one
  TAB-separated record. Assert the set against the ARGUMENT spelling and
  keep the pattern for the cross-read against the named `.gitignore` line
  — they are different strings by construction and only the second is
  comparable to the file.
- That `--root <throwaway repo>` liveness control has TWO failure modes
  which each read as a RESULT rather than as a broken probe, and both land
  precisely on the exit code the control is read by. A RELATIVE script path
  under a moved cwd answers `error: Module not found` at EXIT 1, identical
  at `$?` to the caught plant the control exists to produce. And a plant
  written by `python3 -c "..." VAR="$D"` is never written at all: an
  assignment placed AFTER the `-c` argument is an ARGV member and not an
  env prefix, so python raises `KeyError` while the gate answers
  `OK, 1 file(s) scanned` at exit 0, which reads exactly like a scanner
  that had stopped scanning. Three one-line closes, all needed: spell the
  gate by ABSOLUTE path, put the assignment BEFORE the command, and assert
  the plant is TRACKED (`git ls-files` naming BOTH files) before reading
  any verdict — then read the exit-1 output TEXT rather than `$?`. The
  throwaway also needs a SECOND, CLEAN tracked file or the NEGATIVE half
  cannot exist: the gate refuses a zero-file scan by design, so after the
  `git rm` of the plant a one-file repo cannot answer exit 0 for the right
  reason. The in-band reading is the OK line's own count.
- The `isScannable` scanned-count delta is a NET figure, so a plan whose
  stages DELETE files makes it smaller than the added-file count and a task
  predicting `the count moved by the files I added` reports the difference
  as missing coverage. Measured across one wave: 1038 to 1090 is +52 net,
  decomposing as 54 ADDED and 2 REMOVED. Report ADDED and REMOVED as SETS
  beside the net.
- `.github/**` joins package-root `AGENTS.md` in the read-by-no-fan-out-gate
  set, for a different reason: ESLint here has no YAML plugin at all, so
  `lint:all` never opens a `.yml` whatever the ignore patterns say, and
  there is nothing for `check-types`/`test` to read either. A workflow or
  Dependabot change has exactly one green worth running, the STAGED
  `gate:control-bytes`, plus whatever you measure by hand. For YAML that
  hand-check is `python3 -c "import yaml"` (PyYAML is present here): parse
  the file and DUMP the parsed structure rather than reading the exit code,
  because a comment-only mistake and a mis-indented key both parse.
- The tracked `.claude/` tree is the THIRD member, and it is IGNORED rather
  than un-targeted: an explicit-path `bun x eslint -f json
  .claude/skills/**/*.md` returns the *File ignored because of a matching
  ignore pattern* warning, so no `lint:all` line is evidence about it and
  only `gate:control-bytes` opens it. This matters beyond de-origination:
  a rule or skill file under `.claude/` can assert a version claim about
  this repo's own manifest, which a bump in `packages/` silently falsifies.
  Sweep `.claude/` explicitly; a `git ls-files packages/` denominator will
  never reach it.
- A tsconfig `include` can name a glob that resolves to NOTHING and neither
  fan-out says so: `packages/service/tsconfig.json` includes `*.mjs` while
  `allowJs` is unset, so TypeScript drops the extension and that package's
  own `eslint.config.mjs` is type-checked by nothing despite being named in
  the include. The attribution is READ-ONLY and needs no config edit —
  `bun x tsc --noEmit --listFilesOnly --allowJs` gained exactly 4 files
  (that config plus the three root `.mjs` modules it imports) over the
  default run's 403, and the sibling `*.ts` glob resolving 2 package-root
  files (`drizzle.config.ts`, `vitest.config.ts`) is the positive control
  saying the glob MECHANISM works and only the extension is dropped. That
  file is also un-TARGETED by the lint script's pathspec, so a change to it
  has only `gate:control-bytes` and an explicit-path
  `bun x eslint <it> -f json` behind it.
- The `workflows/` real-but-excluded control pays a THIRD way: it is IN the
  lint script's own pathspec and OUT of tsconfig's `include`, so one path
  shows the two gates' scopes genuinely DIFFER rather than merely that tsc
  excludes something. Measured at the q13 tip: 7 tracked files on disk, 13
  `workflows/` entries in the eslint `-f json` read list, 0 in tsc's read
  list by ABSOLUTE package-root prefix, and 7 by the naive substring test
  (all of them `tests/workflows`, which IS in the include). Report all four
  numbers — the substring figure is what shows the prefix form is
  load-bearing rather than pedantry.
- A per-path membership probe structurally CANNOT report a root a task
  quietly dropped from the lint script whenever the changed set happens not
  to touch it, so hold a per-ROOT non-zero count beside it and parse the
  roots out of the MANIFEST rather than transcribing them. Measured off the
  script's own read list: src 220, lib 61, workflows 13, tests 120, scripts
  13, summing to 427. The same parse asserts every declared root is a
  directory on disk, which catches a root renamed in the tree and left
  standing in the script. And a changed set carrying markdown and a manifest
  has no `N of N covered` reading at all — the shape that IS a
  measurement is a REASON per miss with an UNEXPLAINED bucket asserted
  EMPTY (measured 51 of 58 in eslint's read list and 50 of 58 in tsc's, with
  all 50 changed `.ts` files in BOTH and every miss classifying as
  outside-the-pathspec or not-a-TypeScript-file; the two gates differing by
  exactly one path is the healthy shape rather than a gap).
- A changed-set membership reading must split the DELETED half out or every
  deletion reads as a missing member: `git diff --name-only <base>..HEAD`
  lists paths that no longer exist and both gates correctly never list
  them. Derive the set with `--name-status -z` (handling the three-field R
  record) or `--diff-filter`, then assert the deleted paths ABSENT from
  both read lists as a control in its own right — it is free, and it is
  the one member of the changed set whose absence is the correct answer.
- A gate-coverage probe taking its package root from
  `os.path.abspath('.')` reports EVERY owed file as MISSING and the
  real-but-excluded control's subject as EMPTY, which reads as a
  catastrophic gate failure rather than as the Bash-tool cwd trap recorded
  above: one call ending `cd <repo root> && ...` reset the persisted cwd,
  so `os.path.relpath` produced repo-relative keys against a
  package-relative changed set (89 of 89 MISSING) with every number still
  plausible. Pin the package root as an ABSOLUTE LITERAL, drive git with
  `-C <root>`, and assert in-probe that no `relpath` result starts with two
  dots — it costs nothing and fires before the first verdict is printed.
- The ROOT `AGENTS.md` is the exception to all of the above: the root leaf
  config ignores `packages/**`, but repo-root markdown IS in `eslint .`'s
  target set, so an explicit-path `bun x eslint -f json AGENTS.md` returns
  the covered-and-clean shape and a docs-only commit HERE has TWO greens —
  `bun run lint` plus `gate:control-bytes`. The gate's scanned COUNT is not
  one of them: it is invariant under an edit to an already-tracked file.
  Root house wrap, measured over non-table lines: prose peaks at 70-76 with
  a cap of 78, and the four `| ... |` workspace-map rows are exempt.
- Proving a gate ran over YOUR work needs a different mechanism per gate,
  because the file-count control is invariant under any plan that only edits
  files already in the target list. For ESLint, per-PATH membership:
  `git diff --name-only $(git merge-base main HEAD)..HEAD -- packages/`
  against the absolute `filePath`s in an `-f json` capture, with a
  definitely-absent path asserted false in the same command. For tsc there
  is no per-file line to read at all, so plant
  `export const planted: number = 'x'` in a throwaway `zz-tmp-control.test.ts`
  and run the FAN-OUT (not `-p <cfg>`, which is evidence about a config and
  not about the script). That also settles the RED shape of both fan-outs:
  the green five lines PLUS package-prefixed error lines above the failing
  package's own `Exited with code 2`, with sibling packages still printing
  code-0 lines beneath — the filter does not short-circuit, now measured.
  `git status --short -uall` printing nothing after the `rm` is the whole
  revert check.
- For a COVERAGE change specifically, membership must be a set DIFF and not
  a remembered count: `bun x tsc --noEmit --listFilesOnly -p <cfg> | grep
  '\.test\.ts$'` sorted against `git ls-files -- '*.test.ts'`, run from
  INSIDE the package with a BARE pathspec — the repo-root-relative form
  matches nothing there and prints a zero that reads as "no test files
  exist".
- A `--listFilesOnly` membership proof needs a REAL-BUT-EXCLUDED control
  and not only the fabricated-absent sibling above: a path nothing on disk
  backs is absent for the trivial reason, so its zero says the predicate is
  not answering true for every STRING and nothing about whether it
  discriminates among files that EXIST. `workflows/` is the free one in
  `packages/service` and it pays twice — it sits INSIDE the eslint
  script's target list and OUTSIDE tsconfig's `include`, so one path shows
  the two gates' scopes genuinely differ AND that tsc's read list excludes
  real on-disk files rather than merely missing ones (measured:
  `workflows/dist/ar-dispatch.json`, two `.md` and one `.sql` all present
  on disk and all absent from the read list).
- macOS BSD `xargs` HAS NO `-a`, and the failure is loud at the exit code
  while SILENT in the capture: `xargs -a <list> bun x eslint -f json` into
  a redirect exits 1 with a usage banner on stderr and writes ZERO bytes,
  so a reader keying on the JSON file alone parses whatever was there
  before and attributes a previous run's answer to this one. Feed the list
  on stdin instead. Two disciplines make any capture-into-a-file probe
  honest and both cost one token: `rm -f` the capture before re-running so
  a stale file cannot read as fresh, and print `EXIT=$?` beside the
  capture's BYTE COUNT in the same command — the byte count is what
  separates an aborted tool from a tool that legitimately found nothing.
- A probe's own VERDICT line is prose no gate ever re-runs, exactly like a
  commit message or a TSDoc mutation note, so DERIVE its totals from the
  checks themselves rather than typing them: a hand-written
  `checks run: 24` sat over 19 actual assertions here and read precisely
  like a measurement. Append every check's label to a list and print that
  list's length — one line, and it also makes a leg that silently stopped
  running visible as a total that moved.
