## Verification order

1. `bun run lint:all` — zero problems.
2. `bun run check-types:all` — clean.
3. `bun run test:all` — root (ralph) + every package's default suite.
4. UI work additionally follows `packages/ui/AGENTS.md` (visual baselines
   FIRST, then the rest — baselines are per-environment, regenerate, never
   copy).

Read the per-package lines, not just the exit code. Each fan-out expands to
`bun run <script> && bun run --filter '@ar/*' <script>`: the root run gates
the fan-out, but among packages the filter does NOT short-circuit, so one
red package never masks another and a single run gives the whole picture.

- A green `lint:all` prints nothing from ESLint itself — the only positive
  output is one `@ar/<pkg> lint: Exited with code 0` line per package, and
  those three lines are what distinguish "all packages linted clean" from
  "the filter matched nothing". The two fast fan-outs list those package
  lines in DIFFERENT ORDERS on one clean tree in one sitting (`@ar/ui`
  first under `lint:all`, `@ar/service` first under `check-types:all`,
  measured twelve seconds apart at the same sha), which turns the
  read-it-as-a-SET rule from advice into a live control that costs
  nothing: any POSITIONAL reading is wrong between two GREEN gates and not
  only on the red run the `tail -2` warning below is written about, so
  holding the two fan-outs against each other row by row, or naming "the
  first package line", reports a difference that is the filter's
  nondeterminism. Hold the three package NAMES set-equal
  against `packages/*` rather than counting to three — a count cannot say
  WHICH three. `check-types:all` is the identical shape rather than a longer
  one: both fan-outs are exactly five lines, and the root `tsc --noEmit`
  echo occupies the same slot `lint:all` fills with `$ eslint .`. Classify
  every line, because an unaccounted line IS the tool's own output, and that
  is the only reading that makes "prints nothing" a measurement.
- CORRECTION to "both fan-outs are exactly five lines": that is true of
  `check-types:all` and NOT of `lint:all`, because ESLint WARNINGS leave
  the exit code at 0. Measured on a clean tree, `lint:all` came back at
  13 lines and exit 0, `@ar/ui` printing two carried-in
  `Unused eslint-disable directive` warnings against
  `packages/ui/src/atoms/Menu/Menu.tsx`. So a classifier applying the
  five-line SHAPE to both reports a green run as carrying eight
  unexplained lines. The per-package `Exited with code` SET is the
  verdict; a warning block is a carried-in reading worth recording in a
  baseline, never a failure.
- The sibling clause above — the two fan-outs listing their package lines
  in DIFFERENT ORDERS, "a live control that costs nothing" — is a
  SNAPSHOT and not a property. Measured at another sha, BOTH fan-outs put
  `@ar/ui` first. The order is nondeterministic rather than reliably
  different, so a run finding the two orders EQUAL has lost a control
  rather than found a fault, and the read-it-as-a-SET rule has to stand
  on its own.
- Both fast fan-out captures can come back BYTE-IDENTICAL to a baseline
  taken before the branch had a single commit — measured, `diff` at ZERO
  lines against both `/tmp` baselines across 42 commits, at 695 and 200
  bytes. That is this file's own "a green SHAPE is invariant under what
  it COVERS" law as a measurement, so byte-identity is the EXPECTED
  result and never a corroboration: a capture task recording an exit-code
  SET without a per-PATH coverage reading beside it hands the wrap-up a
  capture indistinguishable from the pre-branch one.
- A LOCAL INSTALL PREDATING A MERGED PR reds `test:all` as FILE-level
  COLLECTION failures reading exactly like a code regression: measured,
  four files answered `Cannot find package '<name>' imported from ...`
  for three packages a just-merged PR had added to a manifest. NEITHER
  fast fan-out warns first — both were GREEN while `test:all` was red,
  the missing module never being imported by a type-checked path. The
  discriminator is two readings in one command: the manifest DECLARES it
  at HEAD, and it is ABSENT from `packages/<pkg>/node_modules` (the
  isolated linker means the ROOT one is not where to look). Repair is
  `bun install --frozen-lockfile`, which resolves what the lockfile
  already says and rewrites nothing — `git status --short -uall` at ZERO
  bytes afterwards is the whole check.
- Collection and CASE failures are DIFFERENT populations inside one
  summary, and holding the two against each other separates them free:
  `Test Files 5 failed` beside `Tests 1 failed` means four files never
  collected, the failure GLYPH count scores only the case-level one, and
  the uncollected files' cases are missing from the case TOTAL too — so
  the repair moves the case total while the FILE total holds (measured
  192 files both sides, 6299 then 6406 cases).
- A `test:all` case-total delta has a FOURTH population beyond added,
  modified and skipped test files, and no changed-set reading of
  `*.test.ts` can find it: a test file the branch NEVER TOUCHED whose
  cases are GENERATED per entry of a roster module that it DID change.
  Measured reconciling 6406 to 6453 — 34 cases from four ADDED files, 9
  from three MODIFIED ones, and 4 from an unchanged
  `tests/invariants/schema-sql.test.ts` whose `SCHEMA_SQL_ASSERTIONS`
  went 23 entries to 27. Without that member the sum is short by exactly
  the roster delta and reads as cases nobody can account for, which is
  the shape a real regression has. Sweep the changed set for roster
  MODULES beside the `.test.ts` files.
- The BASE-side case count of a MODIFIED test file needs no worktree, no
  stash and no install: `git show <base>:<path>` written to a
  `zz-tmp-base-<name>.test.ts` in the SAME directory resolves its own
  relative imports and runs, so `bun x vitest run` over the base copy
  beside the HEAD copy answers both counts in one command (measured 73 to
  82 over three files, ~2s, `git status --short -uall` at zero bytes
  after the `rm`). Expect the base copy to RED where its roster disagrees
  with HEAD's `src` — the case COUNT is the reading and the red is not a
  finding.
- A summary-line classifier over a `test:all` capture silently drops the
  ROOT vitest block, and the omission is invisible because the
  per-package lines it does find look complete. The root summary carries
  LEADING WHITESPACE and no `@ar/` prefix (` Test Files 3 passed (3)`),
  and the per-package form has TWO spaces after its colon — so a
  reflexive `^(?:(@ar/\S+ \S+:)\s+)?(Test Files|Tests)` matches nothing
  at the root, and a single-space `\S+: ` anchor drops every package line
  as well and answers only the Playwright ones. Allow `^\s*` in front and
  `\s+` after the colon, and hold the block COUNT at four (root, ui, web,
  service).
- A NEW shape of the `@ar/service` supertest port steal, and it reads as
  a null-safety bug in the test rather than as the flake: `TypeError:
  Cannot read properties of undefined (reading 'find')` from a helper
  destructuring the response body, the request having been answered by
  something that is not this service. Its sibling in the same run was the
  recorded `socket hang up`. The failure set can also re-roll to EMPTY
  rather than to a different set — run 2 at the same commit was fully
  green with IDENTICAL file and case totals (196 / 6453) and the two
  failed cases crossing into passed member for member, which is a
  stronger attribution leg than either solo run and costs one more
  `test:all`.
- `gate:control-bytes` is a ROOT script and not a package one: run from
  `packages/service` it answers `error: Script not found` at exit 1,
  which reads like the gate having been removed rather than like a wrong
  working directory.
- Which CI workflow a branch dispatches is DERIVABLE rather than
  assertable, and it is one `yaml.safe_load` over `.github/workflows/`:
  hold the branch's changed set against each workflow's own
  `pull_request` `paths` list with `fnmatch`. Measured over one branch of
  32 changed paths — `back.yml` matched 31 and `front.yml` matched NONE,
  so an absent Front job is a path-filter reading rather than a missing
  check, and the single unmatched path was the repo-root `AGENTS.md`,
  which matches neither. The same parse prints each job's resolved `run`
  list, which is what says a hosted green covers the ROOT and
  `@ar/service` halves of `lint`/`check-types`/`test` and NOT `test:all`
  — so `@ar/ui`, `@ar/web` and every `tests/live/` file have no hosted
  evidence at all.
- An EXTERNAL process can reformat a tracked markdown file mid-task, and
  the damage lands on exactly the cell this file warns about. A
  prettier-style table rewrite appeared in the root `AGENTS.md` between a
  clean `git status` and a python write that touched only ten lines six
  hundred lines below the table, with NO PostToolUse hook configured
  here; it padded every column and CORRUPTED the workspace-map row whose
  cell carries a bare `|` inside a code span, splitting the row into
  extra columns and dropping a `(`. The tell is `git diff --stat`
  reporting more lines than the edit wrote (16/14 against the 10/8 the
  script produced), so read the whole `git diff` after any tracked-file
  write and never the stat alone. The repair is
  `git checkout HEAD -- <file>` followed by re-running the edit as a
  DETERMINISTIC /tmp script, which is the second reason to build a doc
  edit that way rather than by hand.
- Read a RED `check-types:all` by its shape, not by an exit code: `tsc
  --noEmit` exits **2** on a type error, so the per-package line reads
  `@ar/<pkg> check-types: Exited with code 2` and a driver keying on 1
  reads a red run as an unparsed one. The other half is the `&&` at the
  front — a red ROOT short-circuits the fan-out entirely, so the capture
  carries the two `$` echo lines and ZERO package lines. One red package
  still leaves the other two printing `0` (the filter does not
  short-circuit). A capture MISSING package lines is the root failing,
  never three silent passes.
- A package `check-types` GREEN can rest on a peer type that resolved to
  NOTHING, and `skipLibCheck` is what hides it — so a clean CI install
  reds a call site an incrementally-grown `node_modules` type-checked
  against no contract at all. Measured at the q15 PR: `@axe-core/
  playwright` declares `playwright-core` as a PEER and its `.d.ts` opens
  `import { Page } from 'playwright-core'`; locally that store dir's only
  sibling was `playwright` and no `playwright-core` existed at the root or
  under `packages/web`, so the import resolved to nothing,
  `tsconfig.base.json`'s `skipLibCheck: true` suppressed the resulting
  TS2307 inside `node_modules`, `Page` degraded to `any`, and the call was
  green. The runner's `bun install --frozen-lockfile` resolved the same
  peer to the OTHER pinned copy and answered TS2322 naming both store
  paths. Two rules. A dependency whose constraint on the tree is a PEER is
  an install-layout-dependent type check wherever this repo pins its
  provider more than once, so ask `bun pm view <pkg> peerDependencies` by
  NAME before reading a green. And where the local and hosted answers
  disagree the LOCAL one is the suspect: read the error's two store paths,
  then check what the importing package's own store dir has as a SIBLING
  — an empty answer there is the diagnosis, not a missing file.
- Proving a gate READ the files a change added is a set diff, not a count:
  `eslint <paths> --format json` piped through a `filePath` print, or
  `bun x tsc --showConfig` filtered to the non-`node_modules` entries of
  the resolved `files` array, diffed against a filesystem walk of the
  script's or tsconfig's OWN paths — both differences empty. A count says
  how many files a scope read, never whether they were the right ones, and
  a file added under a path the script does not list is invisible to a
  count and obvious in the diff. Pick any live-control mutation's target
  OUT of that read list rather than guessing a path, or the leg silently
  lands on a file that does not exist.
- Neither fan-out declares a lifecycle hook, so one exit-zero line per
  package is exact for both. `test:all` is the exception, and all three
  packages declare a `pretest` there: `@ar/service` and `@ar/ui` give two
  exit-zero lines apiece, `@ar/web` gives FOUR. Its pretest is itself a
  filtered run (`bun run --filter '@ar/ui' build`, so the app's suite is
  self-contained whatever order the fan-out reaches the packages in), and
  the nested filter prints `@ar/ui build:` and `@ar/ui postbuild:` exit
  lines of its own inside `@ar/web pretest:`. Read four there as the
  healthy count, not as a package that ran twice — and note the doubled
  prefix is what keeps those lines classifiable, since they are `@ar/ui`'s
  build output sitting under `@ar/web`'s name.
- `test:all` prints the root vitest summary, then one line per package.
  All three packages now run real vitest suites — `@ar/web`'s placeholder
  `echo` is gone, so its code-0 line finally means a suite RAN, and
  `vitest run` exits 1 on zero matching files, so no suite can quietly
  shrink to a vacuous pass. `@ar/web` now chains TWO runners behind its
  single line (`vitest run && playwright test`), so that line covers two
  summaries and the `&&` short-circuits: a red vitest means Playwright
  never ran at all, and its absence from the capture is not evidence it
  passed. The split is by what each runner can reach — vitest's include is
  `src/**/*.test.ts` under the node environment, so it reads colocated
  tests over PURE modules only, and every `.tsx` component plus the
  assembled app falls to the specs under `packages/web/tests/e2e/`. Read
  both summaries, not just the exit line.
- A PARALLEL LEG's checkout STEALS port 5174 and reds `@ar/web test:` in
  yours, in two shapes, and the second reads exactly like a real
  regression. `packages/web`'s Playwright half runs `vite --host 127.0.0.1
  --port 5174 --strictPort`, so with a sibling leg's own run live the port
  is taken PROCESS-WIDE rather than per-directory: cases fail
  `net::ERR_CONNECTION_REFUSED`, and one got an ordinary
  `expect(locator).toBeVisible() failed / element(s) not found` because the
  SIBLING's server answered the navigation, serving its mid-mutation
  source. The vitest half stays green and only the Playwright summary reds,
  so the `&&` chain's single `@ar/web test: Exited with code 1` line is the
  whole signal. Attribute in one command before spending anything else:
  `for p in $(lsof -nP -iTCP:5174 -sTCP:LISTEN -t); do ps -p $p -o args=;
  done` prints the OTHER checkout's absolute path, and `git log $(git
  merge-base main HEAD)..HEAD -- packages/web packages/ui` answering empty
  closes it. Distinct from the `@ar/service` flake — different package,
  DETERMINISTIC while the sibling runs, and no `socket hang up`.
- The `@ar/service` flake has TWO further shapes beyond the recorded
  timeout and `socket hang up`, and both read as ordinary regressions. It
  answers WRONG-SERVICE STATUSES (`expected 401 to be 422`,
  `expected 404 to be 201`) when another service in the same run answers
  the request, and it can answer a body that is not this service's
  envelope AT ALL — a foreign server on the machine, whose error JSON
  the assertion prints. A non-HTTP peer gives `Error: Parse Error:
  Expected HTTP/`, and the SAME describe's written-out spend case then
  fails `expected 26 to be 27`, one lost request being exactly one short:
  a derived-count assertion is a DOWNSTREAM reporter of the flake, so a
  task reading it alone attributes a stolen port to its own edit. It
  re-rolls across FILES as well as within one, with EMPTY overlap between
  two runs' failure sets at identical file and case totals.
- Where a branch legitimately EDITED the files a flake names, the
  `git log <base>..HEAD -- <file>` attribution leg is DEAD (it answers
  `the branch touched it` for all of them), and the leg that still
  discriminates costs one `git show`: test the failing CASE TITLE for
  presence in `git show <base>:<path>`, with a title the branch DID add as
  the control. Measured — three failing titles present at the
  merge-base and the branch's own added title absent there and present at
  HEAD, so the reds were carried-in cases. It composes with the solo-run
  and failure-set-overlap legs rather than replacing them.
- Do NOT grep a `test:all` capture for `failed`/`FAIL`. A fully green run
  is ~3700 lines — over half of it the `@ar/ui` library build, printed
  TWICE now that `@ar/web`'s pretest builds it as well, and elided to the
  last ten lines per script only when the fan-out has a TTY — and
  `@ar/service` writes those words deliberately: its
  vendored framework half exercises its own error paths through structured
  pino logs (`dependency failed to start`, a request record carrying a 500,
  `dependency stop failed`), so the natural grep reports three regressions
  over a run whose every package exited 0. Read the summary lines, which
  are prefixed per package (`@ar/service test:  Test Files ...`) — a
  `^ *Test Files` anchor catches the root's summary alone and silently
  misses every package's.
- Both figures in that bullet are SNAPSHOTS of the app half, and the naive
  grep's OWNER has already flipped: measured 13 matching lines on a run
  whose every gate exited 0, of which 9 are `Validation failed` route
  refusals and only 4 the framework's. Quote the rule, re-derive the
  number. The grep is also not decomposable by `msg` — a pino record is
  a nested object and the grep is line-shaped, so two `request errored`
  records match through the serialised `err.message` (also inside `stack`)
  while their own `msg` carries neither word and sits at level 30. Parse
  each line as JSON and classify on `level`, which is the one attribution
  that does not move as resource groups land: measured 169 records split
  147/18/4 across levels 30/40/50, level 50 being exactly the framework's
  four vendored error-path records and level 40 the app's route refusals
  plus one framework case.
- The two needles in that rule are NOT equally unusable, and the difference
  is one space. Measured across a GREEN and a RED `test:all` at ONE commit:
  the space-delimited ` FAIL ` answered 0 on the green capture and 1 on the
  red, naming the failing file, where `failed` answered 22 on that SAME
  green capture — every one of them a deliberate pino record, 18/2/2 across
  levels 40/50/30. So the bullet above is about `failed`; the delimited
  ` FAIL ` is the runners' own per-file verdict spelling and a green run
  carries none of it. Two captures at one commit is the whole evidence, so
  treat it as a cross-check that still owes its control and never as the
  verdict — the summary lines and the separately captured `EXIT=$?` remain
  the primary reading.
- Keying that same capture on the runners' failure glyphs is a ZERO-HIT
  scan without a live control, because a GREEN run emits no per-case
  FAILURE glyph at all. Cover all five glyphs in one matcher (U+00D7 from
  vitest, U+2718 from Playwright, plus U+2715/U+2716/U+2717) rather than
  picking per runner — `@ar/web`'s single line carries BOTH runners'
  output under one prefix. The free in-band control is the PASS glyph
  `✓`: count it FIRST (31 in a green capture, from Playwright's per-test
  lines plus the vite builds) — a capture read with the wrong codec, or a
  runner that dropped its reporter, reads EXACTLY like a clean sweep
  without it. Use Python (`re.compile('[×✕✖✗✘]')` over decoded text),
  which needs no PCRE and dodges the shimmed-`grep` family entirely. The
  summary lines remain the primary reading; the glyphs are a cross-check
  that must prove itself.
- Classifying every line is what makes "no failures" a measurement, and the
  biggest bucket is not vitest: of 3763 lines, 3562 are the `@ar/ui`
  library build's vite chunk-size table and 75 are the framework's
  deliberate pino error-path JSON, leaving 115 other `@ar/`-prefixed and 11
  unprefixed. Those figures are a SNAPSHOT, not an invariant — every test
  that builds a service over supertest adds its own deliberate pino JSON,
  so a plan adding tests legitimately moves them (measured 1888/1780/49,
  then 1999/1800/75 in one dependency-bump plan, then the figures above).
  Re-derive the buckets per run and read the OTHER bucket, which is where an
  unexplained line would sit. Two rules make the classifier honest and both
  were measured wrong first. The vite table's separator is U+2502 (box
  drawings light vertical), NOT the ASCII pipe, so a rule keyed on `|`
  scores ONE vite line instead of 3562 and silently tips the rest into
  whichever bucket runs next — the sum still reconciles and every count
  still looks plausible. And pino lines carry the `@ar/service test:`
  prefix themselves, so a generic `@ar/`-prefixed bucket tested BEFORE the
  pino rule scores pino at zero, the same way. Attribute a moved bucket by
  EMITTING SCRIPT: the vite figure is 1781 + 1781, the `@ar/ui` build
  printed once by `@ar/ui pretest` and once nested inside `@ar/web pretest`,
  so it can only move from that package, and `@ar/service pretest` emits one
  line per workflow SOURCE beside its summary — three lines over a tree
  holding one workflow and four over two — so a landed workflow moves the
  other-`@ar/` bucket by exactly one, while a module under `src/lib/` or
  `src/sources/` moves no bucket at all. The `Exited with code 0` set is
  exactly SIX and worth NAMING rather than counting — `@ar/service pretest`,
  `@ar/ui pretest`, `@ar/web pretest`, `@ar/ui test`, `@ar/web test`,
  `@ar/service test`.
- Confirming that SET needs an ANCHORED matcher, because a substring count
  answers EIGHT and reads as the tree having grown two scripts: `@ar/web`'s
  pretest nests a filtered `@ar/ui` build, so
  `@ar/web pretest: @ar/ui build: Exited with code 0` and its `postbuild:`
  sibling carry the same string under a DOUBLED prefix.
  `^@ar/\S+ \S+: Exited with code (\d+)$` splits the two populations
  exactly (measured 6 top-level, 2 nested), and that anchor is what
  reconciles the two sentences above — "@ar/web gives FOUR" counts the
  nested pair and "the set is exactly SIX" does not, so a reader taking
  either literally against a raw count concludes the other is stale. Assert
  the six by NAME against `packages/*` with a fabricated member asserted
  absent, and capture the CODE as a group rather than matching `code 0`, or
  a red package silently drops out of the set instead of showing a 2.
- The do-not-grep-for-`failed` rule has a second population the pino example
  does not cover, and it is shaped like a COMPILE ERROR rather than a log
  line: `@ar/web`'s Playwright half prints its own dev server's stdout under
  a `[WebServer]` prefix, so a vite/postcss `@import statements must precede
  all other statements` warning arrives as a five-line block with source
  line numbers and a caret underline, in a run whose every summary is green
  and whose Playwright line reads `27 passed`. Classify the OTHER bucket by
  PREFIX before reading any line in it as a finding, and attribute an
  alarming line with `git diff --name-only $(git merge-base main HEAD)..HEAD`
  rather than by re-running: a branch that touched nothing under
  `packages/web` or `packages/ui` cannot have authored it.
- That pass-glyph in-band control is a property of `test:all`'s NON-vitest
  members (Playwright's per-test lines plus the vite builds) and does NOT
  exist at PACKAGE scope: a fully green 65-file `bun run test` measured 0
  pass glyphs AND 0 failure glyphs, so the glyph matcher there has no
  positive control and its zero is uninformative in both directions. The
  general rule is that vitest's DEFAULT reporter emits no per-case glyph at
  any scope on a green run, so the cross-check only proves itself where
  another runner shares the capture. At package scope the readings with
  evidence in them are the summary line parsed into SEGMENTS (a red run
  gains a `failed` segment rather than changing a number) and a line
  classification whose `other` bucket is enumerable — measured 121 lines
  as 108 deliberate pino JSON, 4 summary, 2 `$` echoes, 1 banner, 4 blank
  and exactly the 2 pretest build lines.
- That gap is CLOSABLE after all, for one flag: `--reporter=verbose` gives
  vitest its OWN per-case pass glyph, so any variant run (`test:live`,
  `test:parity`, a single-file run) whose zero FAILURE glyphs would
  otherwise be uninformative in both directions buys its liveness control
  there. Measured on a green `bun run test:live --reporter=verbose`: 72
  per-case lines parse on one anchored regex (glyph, then path, then
  ` > `) into a per-file pass/skip/fail table reconciling member-for-member
  with both summary lines, the 68 pass glyphs equalling the pass total
  exactly — so a capture read with the wrong codec, or a reporter that
  dropped its per-case lines, is reportable rather than reading as a clean
  sweep. Two equalities make the table a measurement rather than a
  listing, both free in the same parse: matched line count == the `Tests`
  line's parenthesised total (the table covers the whole run, not a
  prefix), and ran-union-skipped == the `git ls-files` roster (a file that
  was neither collected nor skipped is NAMED rather than merely absent).
  Note `--reporter=verbose` also GROUPS failing cases by identical error
  MESSAGE and prints one error block per group, so a probe counting
  `AssertionError` occurrences reads nineteen reds as THREE; take the red
  SET off the per-case glyph lines or the ` FAIL ` lines, which the
  section header's own `Failed Tests N` cross-checks.
- Two refinements to the figures above, both measured at a much larger
  suite. The pass-glyph total tracks the NON-VITEST members alone and not
  suite size, because vitest's default reporter contributes exactly ZERO of
  them — the count is whatever `@ar/web test:` contributes (Playwright's
  per-test lines) plus 2 apiece from the `@ar/ui` and `@ar/web` pretest vite
  builds. Decompose it BY PREFIX rather than quoting the total: the two vite
  halves hold at 2 each, and the Playwright half moves with that suite. It
  read 31 (27 + 2 + 2) at both 2709 and 5783 vitest cases, which is why this
  file once called 31 invariant, and 150 (146 + 2 + 2) at the q13 tip with
  `@ar/service` at 5930 passing cases contributing none of them. So the
  DECOMPOSITION is the law and every figure in it is a snapshot: re-derive
  the PARTS, and a total quoted without them cannot say which half moved.
  And that package-scope `other` bucket is
  assertable by MEMBERSHIP exactly as the fan-out's own unprefixed bucket
  is — but it is NOT invariant at nine, and the clause that only the pino
  and summary buckets scale is false. It is N+8, where N is the workflow
  SOURCE count `@ar/service`'s `pretest` builds: measured 12 at N=4 (150
  files / 4973 cases) against 9 at N=1. What IS invariant is SIX — four
  blank lines, one ` RUN  v...` banner and the `$ vitest run` echo — and
  the pretest BLOCK is the scaling half at N+2 (its own
  `$ bun scripts/build-workflows.ts` echo, one `built <abs path>` line per
  source, and the `N built, stamped <sha>` line). So a task text quoting
  `the two pretest build lines` has taken the FAN-OUT's figure, which is
  right there and wrong at package scope on any tree holding more than one
  workflow — a classifier asserting nine reports a green run as carrying
  three unexplained lines, which is exactly the shape an unaccounted line
  is supposed to have. Assert the six by MEMBERSHIP and derive the pretest
  block from `git ls-files -- 'workflows/src'` minus its README. The
  fan-out's ELEVEN is unaffected and still right: that bucket is the root
  vitest run's own, and the root suite grows with nothing in `packages/`,
  so a reader carrying the N+8 correction ACROSS scopes reports a green
  fan-out as three lines short. Two laws, not one figure someone mistyped.
- A package-scope `bun run test` capture also carries TWO file-level
  readings free in the run you already did. The summary's PARENTHESISED
  total is a third member of the `vitest list --filesOnly` set equality
  above (measured 65 == 65 == 65 for `@ar/service`), so a test file on disk
  that was never collected shows up as the total disagreeing, with no
  second command. And the SKIPPED-FILE count is a membership question
  rather than the drifting one: the summary's skipped-FILE count held
  against `git ls-files -- 'tests/live/*.test.ts'` says the skips are
  exactly the env-gated roster, and any file skipped that is NOT in it is a
  non-live suite that has quietly gone `.skip`. Read it as a SET and never
  as a number — the roster grows with every added gate (six at the q06
  wrap, seven from the q09 approval-gate stage), so a stage comparing
  against a figure quoted here or in a plan reports a correct run as a
  regression. Prefer that over the
  skipped CASE count, which is comparable only against HEAD's own run.
- That live roster is SEVEN files now rather than the six the example
  quotes — `tests/live/api.live.test.ts` landed with the wave-1 live
  seam. The MEMBERSHIP rule the bullet states is unchanged and still the
  right reading; only its illustrative count moved, so re-derive it from
  `git ls-files` rather than quoting either number.
- Of those buckets exactly one is assertable by MEMBERSHIP instead of by a
  drifting count: the OTHER (unprefixed) bucket enumerates completely as the
  two `$` echoes, the root vitest run's own nine-line block (banner, FOUR
  blanks, its two summary lines, `Start at`, `Duration`) and — only when
  bun emits it — the trailing `error: script "<name>" exited with code N`.
  ELEVEN lines on green, twelve when that last one is present; a reader
  asserting twelve on a green run gets a false red. "No unexplained line"
  is a real measurement only because this bucket is enumerable; assert its
  members, count the rest.
- Read that capture with `splitlines()` and NEVER `split` on a newline:
  every capture here ends with a trailing newline, so `split` yields a
  PHANTOM final empty element that inflates this bucket by exactly one
  — the one bucket asserted by MEMBERSHIP, so the inflation lands
  precisely where it is read as a finding. Measured on a GREEN `test:all`:
  12 under `split` against 11 under `splitlines`, where 11 is the
  enumeration above with bun's `error: script` line correctly ABSENT, so
  the `split` reading reports a green fan-out as RED with nothing else in
  the capture disagreeing. `wc -l` agrees with `splitlines` and is the free
  cross-check; run it in the same command as the capture.
  That +1 is on EVERY capture, and it does the most damage on the two FAST
  fan-outs, where the LINE COUNT itself is the shape assertion: measured 6
  under `split` against 5 under `splitlines`/`wc -l` for both `lint:all`
  and `check-types:all`, so a reader confirming the documented five-line
  shape with the naive split reports a sixth unexplained line in a fan-out
  that is exactly right. The inflation lands precisely on the number being
  asserted, same as it does on the eleven-line `other` bucket.
- Derive the package-NAME denominator for any of these set equalities from
  `packages/*/package.json`'s `name` field and never from the directory
  names: the directories are `service`/`ui`/`web` while every fan-out line
  prints `@ar/service`, so a directory-derived denominator either compares
  the wrong strings or reconstructs them by concatenation — at which
  point a package renamed in its manifest but not on disk still comes back
  set-equal. One `json.load` per package, with a fabricated `@ar/nope`
  asserted absent in the same probe so the equality is shown
  discriminating.
- NEVER key "did this gate fail?" on that `error: script` line: bun does not
  emit it for every failing fan-out. Measured in one sitting on one tree,
  `test:all` exiting 1 printed it as the capture's last line while
  `check-types:all` exiting 2 printed nothing of the kind. A reader keying
  failure on it reads a red `check-types:all` as GREEN. The reliable markers
  are the per-package `Exited with code N` set (both fan-outs print it in
  full through a red) and the script's own exit code captured separately —
  `bun run <gate> > <f> 2>&1; echo EXIT=$?` — never a grep of the capture.
- vitest's summary lines CHANGE SHAPE when a run is red, so any regex keyed
  on the green spelling silently misreads a red capture: `Test Files  47
  passed | 5 skipped (52)` becomes `Test Files  3 failed | 45 passed | 5
  skipped (53)`, and a needle like `Test Files +([0-9]+) passed` extracts the
  FAILED count's neighbour or nothing at all. Same for the `Tests` line.
  Capture the whole summary line and parse its segments, or quote it
  verbatim; never key on the position of `passed`. The `tail -N` idiom fails
  the same way — `tail -2` of a check-types:all capture shows two `Exited
  with code 0` lines for a run that exited 2, because the failing package
  sorts FIRST in the fan-out.
- Playwright's summary line `27 passed (5.7s)` matches the same
  `\d+ passed \(` shape as vitest's `Test Files  26 passed (26)`, so a
  capture holding both runners needs its anchor on the trailing duration
  or on Playwright's `Running N tests using M workers` banner, never on
  the bare shape.
- `--reporter=basic` no longer exists (vitest 4 removed it) and the failure
  is indistinguishable from a red suite at the exit code: the run exits 1
  having executed NOTHING, printing a `Failed to load custom Reporter from
  basic` stack instead of any test result. It bites single-FILE runs too.
  `--reporter=json --outputFile=<f>` DOES load and carries every file's
  assertion list, so a per-file pass/fail/skip split is a `bun -e` group-by
  away — which the default reporter cannot give you, since it names only
  FAILING files. Appending such a flag to a DIRECT package script is fine
  and is the exception to the never-append-to-a-fan-out rule.
- A green capture carries NO per-file and no per-case line, so grepping one
  for a test file's NAME reports whether that file's code LOGS, never
  whether it ran (measured: all four `lib/express/control/*.test.ts` names
  appear zero times; `create-service.test.ts` appears once, solely because
  its 500-path pino log embeds a stack trace). "Confirm file X reports zero
  failures" has exactly two readings and neither is a grep of the run: the
  whole-suite summary's zero, plus `bun x vitest list --filesOnly` run from
  INSIDE the package (BARE pathspec) held set-equal against
  `git ls-files -- '*.test.ts'` — the one check that catches a test file on
  disk that was never collected.
- The capture's LINE COUNT is not stable across two runs of the IDENTICAL
  tree (measured 1888 vs 1889 at the same clean HEAD), so it can never be a
  suite-identity check: the whole delta is `@ar/ui`'s vite
  `[PLUGIN_TIMINGS]` block, whose length depends on which plugin hooks
  cross a percentage threshold that run. What IS stable is a skeleton diff —
  strip the pino JSON, normalise durations/ports/timestamps, then `difflib`
  the rest.
- `@ar/service` reporting skipped tests is the expected steady state, and
  every gate under `tests/live/` is a source of it: the Postgres-gated files
  self-skipping without `AR_LIVE_DATABASE_URL`, the n8n-gated file without
  `AR_N8N_URL`, and the proposer-gated file without `AR_OLLAMA_URL`. A
  `bun run test:live` run therefore leaves TWO files skipped and not one,
  so a plan or stage task predicting "the only skipped file is
  `n8n-deploy.live.test.ts`" reports a correct run as a regression
  (measured 7 passed | 2 skipped over a 9-file roster). Derive the skipped
  set from a `grep -l` for `describeLiveOllama` and `describeLiveN8n` over
  `tests/live/*.test.ts` and never from a count. Classifying each roster
  file by WHICH gate helper it names is free and finer than any count: the
  histogram (7
  `describeLivePg` + 1 `describeLiveOllama` + 1 `describeLiveN8n`) predicts
  the open run's own split exactly, so two captures already on disk
  cross-check each other with no new run, and it says WHICH env var owns
  which sub-roster. Pair it with a grep for a bare `describe.skip`/`it.skip`
  across the same files, plus the helper ternaries themselves — that pair
  is what separates "env-gated" from "quietly went `.skip`", which a set
  equality against the roster alone cannot report.
  At PACKAGE scope that roster is TWO populations and the membership rule
  above names only the first: measured 23 skipped files in `@ar/service` =
  8 `tests/live/*.test.ts` (the `describeLive*` gates) + 15
  `tests/parity/*.test.ts`, which `tests/helpers/port-parity.ts` resolves
  to `describe.skip` whenever the origin root is not exported. A reader
  holding 23 against the live roster alone reports 15 phantom regressions.
  Hold it against the UNION of both `git ls-files` rosters. A run
  with zero skipped means a live service leaked into the default suite, not
  that something improved. The count is not the check — it moves with every
  case added under `tests/live/`, so compare it against HEAD's own run
  rather than against a number quoted here or in a plan. When the tree IS
  HEAD there is nothing to compare and nothing to stash: `@ar/service`'s
  `pretest` prints `N built, stamped <sha>` a few lines above the vitest
  banner, N being the workflow SOURCE count rather than a constant, so
  that sha held against `git rev-parse --short HEAD`, plus the ABSENCE of
  a `-dirty` suffix, says both that the artifacts under test are HEAD's
  and that the tree is clean — in one line of one run.
- A `test:<variant>` package script runs NO `pretest`: bun's lifecycle
  hook is `pre<the whole script name>`, so only `test` declares one here
  and `test:parity`/`test:live` build no workflows. Their captures
  therefore carry no `N built, stamped <sha>` line at all, and the reading
  that line supplies (the artifacts under test are HEAD's, the tree is not
  `-dirty`) is simply UNAVAILABLE for them — a stage gate reading a
  variant capture owes `git status --short -uall` plus
  `git rev-parse HEAD` by hand instead. A variant run is correspondingly
  cheaper than the full suite rather than mysteriously faster.
- The pretest stamp line's REAL spelling is `<N> built, stamped <sha>,
  settings from <origin>` and every quotation of it above is a PREFIX, so a
  classifier anchoring `stamped (\S+)$` reports a correct line as
  UNACCOUNTED — landing precisely on the pretest block, which is the one
  bucket asserted by membership rather than counted. It is one
  `console.log` in `scripts/build-workflows.ts` whose second half is a `+`
  concatenation, which is why a grep for the recorded phrase finds the line
  and a line-anchored match does not. Parse it as
  `^(\d+) built, stamped ([^,]+), settings from (.+)$`, which keeps the sha
  reading and buys the settings ORIGIN free. Build any planted control for
  a capture classifier from the RECORDED spelling on purpose: the plant
  coming back unaccounted under the corrected rule is what proves a
  recorded spelling stale, where a plant built from the tree's own line
  agrees with everything and says nothing.
- The gate-helper histogram above names THREE helpers and reaches the
  `tests/live/` roster ALONE, so it predicts under half the package-scope
  skips and the rest read as unexplained. There is a FOURTH —
  `describePortParity` in `tests/helpers/port-parity.ts`, gated on
  `AR_PORT_PARITY_ORIGIN` — and it owns the MAJORITY: measured at the q13
  tip, 26 skipped files decompose as 9 `describeLivePg` + 1
  `describeLiveOllama` + 1 `describeLiveN8n` + 15 `describePortParity`.
  Its companion bare-`.skip` sweep must run over the ROSTER FILES and never
  over the helpers: the `describe.skip` legitimately lives inside
  `port-parity.ts`'s own ternary, so grepping the helper reports the gate
  as hardcoded.
- The closed-loopback-port control generalises to all FOUR gate helpers,
  including the two whose gate is not a URL, and none of them needs the
  service its suite is gated on. Measured, all four flipping `1 skipped` to
  `1 failed` on one file apiece: `AR_N8N_URL` and `AR_OLLAMA_URL` at
  `http://127.0.0.1:9`, `AR_LIVE_DATABASE_URL` at
  `postgres://ar:x@127.0.0.1:9/ar_live` (which needs no `stress:start` and
  reaches no cluster), and `AR_PORT_PARITY_ORIGIN` at a NONEXISTENT
  directory — so the parity half's ternary is provable without locating
  the origin checkout and with no resolved path entering any file. Assert
  the armed target really is absent or closed in the SAME command; an
  accidental hit is a control that proved the opposite of what it reads as.
- The closed-target control flips the FILE line for all four helpers, but
  its CASE line splits three ways, so a leg scored on the case counters
  reads two live gates as dead. Measured one file apiece, every one at
  `Test Files 1 failed (1)`: `describeLivePg` answered `Tests 19 skipped`,
  `describeLiveN8n` `3 skipped`, `describeLiveOllama` `1 failed`, and
  `describePortParity` `2 failed | 6 passed`. Score the FILE line.
- A PLAIN `bun run test` capture carries NO per-file line at all, so the
  `Test Files N skipped` membership reading has nothing to read in it, and
  the flag pair that supplies one is cheaper than `--reporter=verbose`:
  measured at one commit, `bun run test` alone answered 304 lines with ZERO
  file-level pass or skip lines where the same script plus
  `--reporter=default --reporter=json --outputFile.json=<f>` answered 535
  with 26 down-glyph (U+2193) and 165 check-glyph FILE lines, equalling
  that run's own `26 skipped` and `165 passed` segments exactly. bun
  forwards the flags through the script, so `pretest` still runs and the
  `N built, stamped <sha>` line sits in the same capture. The COMBINATION
  was measured; which half supplies the per-file lines was not.
- Do NOT derive a skipped-FILE set from the JSON reporter's own counters:
  it answers a FILE-level `status` of `passed` for a fully-SKIPPED file and
  `numPendingTestSuites` is `0` on a run whose summary reports 26 skipped
  files, so the membership question silently has no subject. Derive it from
  the ASSERTION statuses (every member `skipped`), and note
  `numTotalTestSuites` counts DESCRIBE blocks (1562 against 192 files) so
  it is no file denominator either.
- A vitest JSON report makes a RED run usable evidence for the specific
  files a claim names, which is what saves re-running a 6400-case suite for
  a close-out: every OTHER file still carries its own `status` plus a
  per-case `assertionResults` list, so a DoD item backed by three named
  files is dischargeable out of a capture whose exit was 1. Two conditions
  make it honest — NAME the failing file and its attribution beside the
  verdict, and read the per-CASE statuses rather than the file `status`
  alone, which the fully-skipped-file trap above already shows is `passed`
  for a file that ran nothing.
- The package-scope six-invariant-line law is a GREEN-run law, and a
  classifier applying its blank-line rule to a RED capture reports that
  bucket at 14 where the law says 6 — eight unexplained lines landing in
  precisely the bucket asserted by MEMBERSHIP. The four invariant blanks do
  survive, but the failure block INTERLEAVES eight of its own between the
  third and the fourth, so NO positional scope recovers exactly four and
  cutting at the `Failed Tests` banner answers 3. Classify the failure
  block as its own bucket and take the membership reading off a GREEN
  capture. At package scope vitest's DEFAULT reporter DOES emit a per-case
  glyph for FAILING cases alone, so the failure-glyph half is LIVE there
  (2 on a red capture, 0 on a green one, agreeing with ` FAIL ` both
  times) and only the missing POSITIVE control is what the recorded
  `uninformative in both directions` is about.
- The Playwright half of the pass-glyph decomposition carries an IN-BAND
  three-way cross-check — the glyph count must equal the
  `Running N tests using M workers` banner AND the summary's own
  `N passed (<duration>)` — and the recorded both-runners anchor trap
  lands precisely on it. Anchored on the bare `\d+ passed \(` the
  comparison instead picks up vitest's `Test Files 49 passed (49)`, which
  sits EARLIER in the capture, and answers `170 == 170 == 49`: a correct
  decomposition reported as broken. Anchor on the trailing DURATION and
  assert in the same probe that the vitest `Test Files` lines are NOT
  matched by it.
- Whether to run `test:all` BEFORE the two fast fan-outs is MEASURABLE
  rather than the fresh-clone/worktree heuristic recorded below: compare
  `packages/ui/dist`'s mtime against `git log -1 --format=%cd --
  packages/ui`, then confirm that commit is an ANCESTOR of HEAD. The
  ancestor leg is load-bearing rather than ceremony — `git log -1 --
  <path>` walks from HEAD, so it can name a MERGE commit whose subject is
  another leg's branch, which reads as a sibling checkout's work until
  `merge-base --is-ancestor` answers.
- The `--reporter=verbose` per-case regex above must make the trailing
  ` <n>ms` OPTIONAL: a line carries its duration only when the case RAN, so
  a regex REQUIRING it silently drops every SKIPPED line and the damage
  lands precisely on the ran-union-skipped roster equality, which then
  reports the env-gated files as missing from the capture rather than as
  skipped. Glyphs measured under vitest 4.1.11: pass is U+2713 and skip is
  U+2193. Grouping those lines by FILE is the only thing that can hold
  `Test Files N skipped` against a roster as a SET, and two cross-checks
  make the classification a reading rather than a guess, both free in the
  same parse: files carrying BOTH glyphs must be ZERO (a partially-skipped
  file classifies silently as ran), and the pass-glyph-carrying FILE count
  must equal the `Test Files` `passed` segment.
- A `test:<variant>` capture's non-case envelope is exactly TEN lines and
  the package-scope N+8 rule does NOT reach it, the variant running no
  `pretest` at all: the ten are the six invariants (the `$` echo, the
  ` RUN  v` banner and four blanks) plus FOUR summary lines (`Test Files`,
  `Tests`, `Start at`, `Duration`). Every remaining line is a per-case
  glyph line, which is what makes `no unexplained line` a measurement on a
  variant run — read with `splitlines`, since the naive newline split puts
  its phantom trailing element in exactly that bucket and answers 11.
- A background `bun run test` launched as `<cmd> > f 2>&1; echo EXIT=$? >
  f.exit` reports the WRAPPER's status in the task notification, so a RED
  suite arrives announced as `exit code 0`. Read the `.exit` file, never
  the notification's summary — measured on a run whose notification said 0
  and whose file said 1, with `Test Files 1 failed | 154 passed` in the
  capture.
- A capture directory can hold a `.txt` and its `.exit` from DIFFERENT
  runs, and the pair then reports a red run's verdict against a green run's
  output: measured, a `ct.exit` reading `EXIT=2` beside a `ct.txt` whose
  three package lines all read `Exited with code 0`, because the same
  filename was reused for a later run whose exit went to `ct2.exit`. The
  tell is free and is the MTIME ORDERING — a `.txt` NEWER than its own
  `.exit` cannot be that run's capture. Check it before quoting anybody
  else's captures, including an earlier task's in the same plan, and write
  per-run unique filenames. `rm -f` on both is necessary and not
  sufficient: it does not stop a LATER run from overwriting one.
- A STALE gitignored `packages/ui/dist/` reds `@ar/web check-types` with
  TS2305 `Module '"@ar/ui"' has no exported member 'X'`, a DIFFERENT shape
  from the `import/no-unresolved` one recorded above for the same cause:
  the module RESOLVES and the symbol is simply not in the built `.d.ts`,
  `@ar/ui`'s exports map pointing `types` at `./dist/index.d.ts`. The
  repair is a rebuild and nothing else, so the gate ORDER matters —
  `@ar/web`'s `pretest` runs `bun run --filter '@ar/ui' build`, which means
  `test:all` silently regenerates the artifact `check-types:all` just
  failed on (same command, no tracked change, exit 2 then exit 0). On any
  tree whose `@ar/ui` dist may be stale (a fresh clone, a worktree, a
  rebase onto a leg that touched `packages/ui`), run `test:all` FIRST or
  build `@ar/ui` by hand. Grepping `dist/index.d.ts` for a SYMBOL is a dead
  reading in both directions — it is a six-line re-export barrel naming no
  component whether or not the build is current; ask the whole type surface
  (`grep -rl '<Symbol>' dist --include='*.d.ts'`) or read the barrel CHAIN.
- `bun run test:live` reds are TWO populations and only one is the
  carried-in ledger row. The second is live-only ARITY ASSERTIONS, which
  nothing in `test:all` can reach, `tests/live/` being
  collected-but-skipped there: a landed workflow falsified
  `schedule-clamp.live.test.ts`'s `artifactsBuilt` equality in a file the
  branch never edited, and a prose sweep's needles are aimed at sentences
  and structurally cannot reach an assertion. Attribute with
  `git ls-tree -r --name-only <merge-base> -- packages/service/workflows/src/`
  against `git ls-files` over the same path, plus
  `git log <base>..HEAD -- <the test file>` answering empty. The repair is
  the count-free move applied to an ASSERTION rather than to prose
  (`includes(...)` held against `true`). Run `test:live` BEFORE a phase's
  prose sweep rather than as its last verification task, or the finding
  arrives with nothing left to bundle it into.

- On a tree already RED from an earlier stage, "is this red mine?" is answered
  by a before/after SET diff, never by a figure this file or an earlier commit
  recorded: capture the diagnostic and failure sets BEFORE your change, then
  `diff <(grep 'error TS' before) <(grep 'error TS' after)`. Empty is the
  whole reading, and it works while both sides are red, where an exit code and
  a count each say nothing. `git stash push -- <only your paths>` is the
  fallback when no baseline was taken — reversible, unlike `git checkout`,
  which silently destroys a file you authored. A carried-in red is STABLE
  across a stage, and that stability is the reading a stage gate owes: diff
  the SETS gate-to-gate and attribute the COUNT separately, since an unchanged
  set under a moved count is the healthy shape and a moved SET under an
  unchanged count is what the pairing exists to catch.
- A before/after failure-set diff can also SHRINK, and a vanished failure
  needs the same attribution as an added one: a `socket hang up` present
  before and absent after turned out to be a flake, 3/3 green when the file
  ran alone. supertest over a built service is where the flake lives here.
- An env-gated live suite's CASE-level skip count cannot tell a CLOSED gate
  from an armed-but-unusable one — read the FILE status instead. Measured on
  `describeLiveN8n`: with `AR_N8N_URL` unset the file reports `1 skipped`, and
  with it pointed at a closed loopback port (`http://127.0.0.1:9`) the file
  flips to `1 failed` while the case line still reads `3 skipped`. The
  closed-port form is the safe control for any env-gated suite: it proves the
  ternary produced the skip (rather than a hardcoded `describe.skip` or cases
  gutted to stubs) and the refusal happens before any request, so it reaches
  no service.
