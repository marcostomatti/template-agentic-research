# agentic-research

Umbrella monorepo (bun workspaces) for the agentic research platform: research
one or more domains under a shallow taxonomy, produce periodic digests, and
expose/export results over multiple formats/protocols (MCP, Markdown, RSS, …).

## Workspace map

| Path | Package | What it is |
|---|---|---|
| `packages/ui` | `@ar/ui` | Component library (CVA + Tailwind 4 + Radix), Storybook workbench, visual regression harness. Vendored fork of the `components-library` template. |
| `packages/web` | `@ar/web` | The web app (Vite + React 19 + react-router v7), consumes `@ar/ui`. Fixture-backed: the shell and all six surfaces run with no backend. Its own `AGENTS.md` carries the two route bases, the q15 API swap seam and the two-runner test seam. |
| `packages/service` | `@ar/service` | Express + MCP service (drizzle/Postgres), vendored fork of the `template-service-express` template. Future home of the research pipeline stack (workflows, sources, exports). |
| `tools/ralph` | — | The agent task loop (`bun run ralph plan|start|usage` from the repo root). Plans/trackers live in `.plans/`. |

Each package keeps its own `AGENTS.md` with package-specific conventions —
read it before working inside that package. Both vendored packages are
**fork-style copies** of their template repos: no automated sync; a change
wanted in both places must be made in both repos.

## Shared tooling

- `eslint.base.mjs` + `sharedRules.mjs` at the root; each package (and the
  root) layers its own leaf `eslint.config.mjs` on top.
- `tsconfig.base.json` is the shared strict core; leaves specialize
  (DOM/react-jsx for ui/web, node-strict for service, root covers `tools/`).
- Root scripts: `lint:all`, `check-types:all`, `test:all` fan out to every
  package; bare `lint`/`check-types`/`test` cover root files + `tools/`.
- Runtime: bun-first (`packageManager` pinned). `@ar/ui`'s test toolchain
  additionally needs Node 22 on PATH (`bun x` shebang handling).
- `.github/dependabot.yml` opens dependency PRs weekly for two ecosystems,
  both rooted at `/`: `bun` covers every workspace manifest (one entry,
  because the single root lockfile resolves them all) and `github-actions`
  covers the workflow files. The identifier is `bun` and not `npm` because
  the only lockfile here is `bun.lock`, which the npm ecosystem does not
  read — an `npm` entry would resolve nothing at all. (Dependabot's bun
  support wants bun >= 1.1.39; `packageManager` pins 1.3.9.) Each ecosystem
  groups its `minor` and `patch` bumps into one PR and deliberately leaves
  majors OUT of the group, so every major arrives alone and a red gate
  names its own cause. `playwright`/`playwright-core` are the one `ignore`:
  `@ar/ui` pins both to an exact `1.61.1` twice (its devDependencies plus
  an `overrides` block) and `front.yml` spells that version into its
  visual-baseline cache key three times as the literal `pw1.61.1`. Those
  baselines are untracked and exist only in that cache, so a manifest bump
  the key cannot follow restores 1.61.1 renderings to compare a 1.62
  browser against — a false diff on every story whose rendering moved,
  not the clean cache miss that would re-seed. Bump it by hand, cache key
  first.
- The install uses bun's ISOLATED linker: the repo-root `node_modules`
  carries only the root's own devDeps and has NO `@ar` directory at all,
  while each package's deps (and its `@ar/ui` symlink) sit under
  `packages/<pkg>/node_modules`. Two consequences, both measured.
  `ls node_modules/<dep>` at the root is not evidence a package dependency
  is missing — look under the package, or the check reports absent for
  everything the apps actually depend on. And `bun x <tool>` resolves a
  DIFFERENT version per working directory: `bun x playwright --version`
  prints the pinned 1.61.1 from `packages/ui` or `packages/web` and 1.62.1
  from the root, whose `node_modules/.bin` carries no playwright at all —
  the root resolves nothing and silently fetches the registry's latest.
  So a CI step (or any command) invoking a PINNED tool through `bun x`
  must run from a directory that pins it, or it runs a version the
  lockfile never chose while looking identical in the log. Use
  `bun add --cwd packages/<pkg> <name>` to add a workspace dependency; it
  updates the root `bun.lock` in the same step.
- Three surfaces are linted by NOTHING, each measured rather than assumed.
  `.github/workflows/*.yml`: `eslint.base.mjs` scopes its blocks to
  js/mjs/ts, md and json, so ESLint answers `File ignored because no
  matching configuration was supplied` — one warning, zero errors, a PASS
  that read no rules. A package-root markdown file under `packages/*` (an
  `AGENTS.md`, a `README.md`): the root `eslint .` ignores `packages/**`
  wholesale and no package lint script lists `*.md`, though the ROOT
  `AGENTS.md` is itself a lint target. And any package-root config file
  the package's own leaf script does not name. `bun run gate:control-bytes`
  is the only automated gate over the first two, and only once TRACKED —
  its `--staged` mode is the coverage proof a docs commit actually wants,
  since the full run cannot say WHICH files it read. Validate a workflow
  edit by hand: `yaml.safe_load` printing each job's resolved step list
  (name, `working-directory`, first line of `run`) catches a mis-indented
  step or a key landing on the wrong job, and nothing else will.
- No prettier anywhere, root or package: ESLint is the only style gate and
  it does not reflow comments, so comment/TSDoc/markdown wrapping is
  hand-maintained. Match the surrounding file rather than a global number
  (~76 cols in `packages/service/src`, ≤74 in its architecture docs).
- `sharedRules.mjs` shapes more code than a style config usually does:
  `@stylistic/quotes` is single with no `avoidEscape` (an apostrophe inside
  a string literal must be escaped, or rephrased away), `multiline-ternary`
  is `always` (every ternary is three lines, even a trivial one),
  `implicit-arrow-linebreak: beside` plus `arrow-body-style: as-needed`
  leaves no one-line form for a nested callback (break inside the call
  parens, not after the `=>`), and `import/order` lists `type` as the FIRST
  group, so an `import type` sits above the `node:` builtins in its own
  blank-line-separated block.
- Control characters appear in tracked files only as escapes, never as
  raw bytes — a raw NUL makes `git diff` render `Bin` forever and makes
  POSIX grep report no match for text that is present, both silently.
  Two layers enforce this: the universal `ar/no-unsafe-unicode` block in
  `eslint.base.mjs` (rule source: root `unsafeUnicode.mjs`) covers every
  linted language, and `bun run gate:control-bytes`
  (`tools/control-byte-gate/`) is the byte-level floor over every
  tracked file — deny-by-default file selection, exit 2 when it cannot
  run, zero files scanned is a failure, `--staged` judges index blobs.
  CI runs the gate in all three workflows; enable the local pre-commit
  hook once per clone with `git config core.hooksPath .githooks`. Fix a
  finding with a small script that rewrites the byte to its escape
  (binary read/write) — an edit tool cannot reliably match a control
  character it renders as whitespace.

## Plans and specs (CRITICAL)

Working plans and specs go in `.plans/` and `.specs/` at the repo root —
both **gitignored on purpose**: these files routinely describe critical
bugs (privacy/security) before they are patched, and must never reach the
remote ahead of the fix. Never "tidy" them into a tracked path, and never
weaken the `.gitignore` entries. Tracked docs are only for material whose
subject is already visible in the public code; when in doubt, `.specs/`.

Before any `git add -A`, confirm the ignored trio is absent from
`git status --short --untracked-files=all`: `progress.txt`, `.plans/`, and
`.specs/` all carry origin paths and pre-patch security content.
`git check-ignore -v progress.txt .plans .specs` prints the governing rule
and line for each in one command, which turns "the ignores are fine" from an
assumption into evidence. The blast radius of being wrong is an origin path
on the remote.

Both trees also sit outside EVERY gate, and the consequence is a legitimately
EMPTY commit set. The root leaf config lists `.specs/**` and `.plans/**` in
its `ignores` (an explicit-path `bun x eslint -f json <spec>` returns the
*File ignored because of a matching ignore pattern* warning — the IGNORED
shape, not covered-and-clean), and `gate:control-bytes` opens only TRACKED
files, which these are not. So a spec/plan task has no green to lean on AND
`git add -A` stages nothing: derive every claim from a measurement, then
report the empty commit rather than manufacturing a tracked change to have
something to push. The corollary runs the other way too — where a
measurement makes a sentence in a TRACKED file over-broad, recording it only
in `.specs/` leaves the repo asserting the opposite to the next reader, so
qualify the tracked claim in the same commit.

Their prose conventions are unenforced and therefore hand-owned: prose wraps
at 77 cols in `.specs` (markdown tables exempt), and the dash/arrow are the
NON-ASCII forms, not the ASCII `--`. Emit those from `String.fromCharCode`
behind an ASCII placeholder token, never as a literal in the tool call.

## Security posture (carried from the templates, incident-derived)

- Isolated vs live test split is structural: the default suite touches no
  external service; the live files self-skip unless the service they need is
  configured, and the Postgres half runs only against the no-volume `ar_live`
  DB on port 5433, whose destructive helpers refuse any other database name.
  There are TWO gates now, armed differently — `describeLivePg` keys on
  `AR_LIVE_DATABASE_URL`, which `bun run test:live` sets in its own script
  definition, and `describeLiveN8n` keys on `AR_N8N_URL`, which nothing here
  exports and no compose service satisfies. So a live run's steady state is
  the Postgres files running and the n8n file skipping, and "the live suite"
  is two things whenever a skip count is being read.
- Security findings route to a private advisory, never a public tracker —
  and are never searched for on a public tracker first (see the
  `qa-bug-reporter` agent).
- No `@open-tomato/*` imports anywhere (ESLint-enforced). Origin prose only
  in README/NOTICE.
- De-origination has two halves and only one of them is automated. The
  forbidden needles live once, assembled from string parts, in
  `packages/service/tests/invariants/naming-patterns.ts` — never write one
  as a literal into a tracked file, here or anywhere else. Its test scans
  only that package's `src`, `lib`, `workflows`, `data`, `scripts`, and
  `drizzle`, plus two config files: roughly a fifth of the repo's tracked
  files. `packages/ui`, `packages/web`, the root docs, and the TRACKED
  `.claude/` tree are reached by a manual repo-wide `git grep` of those same
  needles and by nothing else. Run it after any `.claude/` vendoring, not
  just after service work — a user-level skill can carry a real origin
  hostname, and a green `test:all` would not notice. Zero hits is only
  evidence once the scan itself is proven live (`zero-hit-scan-proof-kit`).
- Do not classify that split by hand — it is COMPUTABLE, and the two
  clauses a reader most often infers are both wrong. `collectScannedFiles`
  is exported from `tests/invariants/naming-patterns.ts`, so a `bun -e`
  importing it and intersecting against
  `git diff --name-only <base>..HEAD` names exactly which changed files the
  automated scan covers and which the manual sweep still owes (surface: 143
  of 803 tracked files at the q06 tip — re-derive it, both halves move).
  It answers paths relative to the PACKAGE root, not repo-relative and not
  absolute, so the intersection needs a `packages/service/` prefix. Without
  it the result is EMPTY and the manual half reads as owing every tracked
  file, a plausible-looking number nothing contradicts (measured 0 against
  143). The two non-obvious members: `lib/**/__tests__/*.test.ts` ARE
  scanned (they sit under the `lib` root, so "tests are out" is true only
  of `tests/`), and `scripts/README.md` IS scanned (a `.md` inside a scan
  root, so "READMEs are out" is true only of the package-root one).
- For the manual half, run the invariant's OWN matcher rather than a
  retyped `git grep`: `findForbiddenMatches(content, path)` takes CONTENT,
  so feeding it `git ls-files` applies the five declared needle SOURCES
  with no hand-transcription step and no exposure to the shimmed-`grep`
  trap (measured 676/676 tracked files, agreeing with the git grep at 1
  hit; the DENOMINATOR is a snapshot that moves with every added file, so
  re-derive it and let `git ls-files | wc -l` agreeing with the probe's own
  counter be the coverage reading). It carries its own liveness leg for
  free — the same matcher over an in-memory planted sample built from
  fragments must return 5 hits naming all five ids. Run BOTH readings and
  let their agreement be the result.
  `git grep -P` DOES support lookbehind here (the ugrep shim is on bare
  `grep`, not on `git grep`), so the guarded needle is runnable as-is.
- The needle set is SEVEN, not five: `packages/ui/eslint.config.mjs`
  assembles two further ones — the banned import scope and the
  design-extraction source repo — and its `no-restricted-imports` rule
  reaches only `packages/ui` IMPORTS, never prose and never another
  package. Sweep all seven whenever the manual half is run.
- The correct outcome of the FIVE-needle half is ONE hit, not zero, and a
  literal zero would itself be the finding: `NOTICE:10` carries the Apache-2.0
  §4(d) attribution that the `origin-project` needle's own description
  names as the reason `NOTICE` sits outside the scan surface. It is the
  positive control against the real tree — needle, pathspec and case flags
  all proven live in the output that reports the result. The other four
  needles have zero legitimate occurrences, so each gets a near-neighbour
  control instead: drop the guard from the needle and re-run, and the
  UNguarded form must return a non-zero set of legitimate near misses (each
  one measured in single digits here — a base64 run inside `bun.lock`, the
  invariant's own false-positive fixture, and one legal `ExportFormat`
  member). That is what makes the guarded zero a guard discriminating
  rather than a dead needle. Build those unguarded forms at the shell from
  fragments, exactly as `naming-patterns.ts` assembles the real ones — a
  bare needle token pasted into a doc, a plan or a commit message becomes
  the very literal the law forbids, and this paragraph tripped that on its
  first draft.
- The SEVEN-needle sweep's correct answer is EIGHT hits, not that one, and
  reading it as one scores a clean tree as dirty. The two needles assembled
  in `packages/ui/eslint.config.mjs` add seven more (measured at the q06
  tip): both `NOTICE` files, `packages/ui/README.md` twice,
  `packages/ui/AGENTS.md`, `packages/ui/scripts/compare-design.mjs`, and
  the root `AGENTS.md` bullet that STATES the banned import scope. Every
  one is `packages/ui` attribution/provenance prose or the rule's own
  self-reference. Report the five-needle and two-needle halves separately
  with the eight-hit total named, or every close-out re-opens the same
  closed question — and note neither ui needle fires in the config that
  DECLARES it, since those literals are assembled at run time, so "the
  config contains its own needle" is a dead control. Extract them by
  parsing the `const <ID> = [...].join('<sep>');` declarations out of the
  config's source text; the same parser covers all seven and builds the
  masking table for showing context around a legitimate hit.
- Separate a pre-existing hit from one the branch introduced with a
  merge-base hit-set DIFF, the only leg that can: `git archive <merge-base>
  | tar -x -C /tmp/<fresh-dir>` — never `rm -rf` the directory first, which
  the permission layer denies outright, and a fresh unique name needs no
  cleanup — then run the IDENTICAL matcher over
  `git ls-tree -r --name-only -z <base>` and over `git ls-files`, and diff
  the `patternId`/path/line sets BOTH ways. Measured at the q06 wrap: 752
  files / 8 hits at the base against 803 / 8 at the tip, 0 added and 0
  removed. The totals agreeing is the weaker reading — a hit moving between
  two files leaves the count unchanged.
- NEVER print a `ForbiddenMatch` wholesale. The record carries `line`
  verbatim by design, so a probe that dumps matches seeds the banned string
  into terminal scrollback, the tool-result capture and any file the run is
  redirected to — the one place nobody can go and fix it, which is the
  exact reason the failure message is built from `patternId`. Print
  `patternId` + `filePath` + `lineNumber` and nothing else; to show CONTEXT
  around a legitimate hit, read the file separately and mask the needle with
  a python `str.replace` built from fragments.
- Read the unguarded near-neighbour controls by their file SET, never their
  count: the invariant's own two files (`naming-patterns.ts` and its test)
  hit ALL of them by construction, since they carry the fragments and the
  false-positive fixtures. A control returning those 2 files alone is a DEAD
  control reporting only the scanner — only the third-party members say the
  guard discriminates against what is actually in the tree.
- The whole sweep runs from ONE /tmp `.mjs` under bun rather than from
  inside `packages/service`: `naming-patterns.ts` imports only node
  builtins, so a probe importing it by ABSOLUTE path reaches
  `findForbiddenMatches` with no cwd trap and no package graph. That lets
  tracked files, an outbound PR body, the planted control and the near-miss
  controls be ONE command whose output is a single verdict block — which
  matters because the controls are only evidence when they ran against the
  same matcher instance as the sweep.
- Also true of ANY sweep needle here: prove it excludes its legitimate
  sibling before reading a count as an inventory. `specs/` sits inside
  `.specs/`, so a bare `git grep -E 'specs/'` returned 24 lines of which 18
  were correct `.specs/` references; the negative-context form
  `-E '(^|[^.])specs/'` returns only the dangling ones. That is a false
  POSITIVE where the liveness controls above guard false negatives.

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
  "the filter matched nothing". Hold the three package NAMES set-equal
  against `packages/*` rather than counting to three — a count cannot say
  WHICH three. `check-types:all` is the identical shape rather than a longer
  one: both fan-outs are exactly five lines, and the root `tsc --noEmit`
  echo occupies the same slot `lint:all` fills with `$ eslint .`. Classify
  every line, because an unaccounted line IS the tool's own output, and that
  is the only reading that makes "prints nothing" a measurement.
- Read a RED `check-types:all` by its shape, not by an exit code: `tsc
  --noEmit` exits **2** on a type error, so the per-package line reads
  `@ar/<pkg> check-types: Exited with code 2` and a driver keying on 1
  reads a red run as an unparsed one. The other half is the `&&` at the
  front — a red ROOT short-circuits the fan-out entirely, so the capture
  carries the two `$` echo lines and ZERO package lines. One red package
  still leaves the other two printing `0` (the filter does not
  short-circuit). A capture MISSING package lines is the root failing,
  never three silent passes.
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
  printed once by `@ar/ui pretest` and once nested inside `@ar/web
  pretest`, so it can only move from that package, and `@ar/service
  pretest` emits two lines whatever the package holds — which is why
  landing modules under `src/lib/` or `src/sources/` cannot move any line
  bucket at all. The six `Exited with code 0` SCRIPTS are worth NAMING
  rather than counting — `@ar/service pretest`, `@ar/ui pretest`,
  `@ar/web pretest`, `@ar/ui test`, `@ar/web test`, `@ar/service test` —
  but a `grep -c 'Exited with code'` over the capture returns EIGHT, not
  six, because `@ar/web`'s pretest also emits doubled-prefix
  `@ar/web pretest: @ar/ui build`/`postbuild` lines that match the needle.
- Of those buckets exactly one is assertable by MEMBERSHIP instead of by a
  drifting count: the OTHER (unprefixed) bucket enumerates completely as the
  two `$` echoes, the root vitest run's own nine-line block (banner, FOUR
  blanks, its two summary lines, `Start at`, `Duration`) and — only when
  bun emits it — the trailing `error: script "<name>" exited with code N`.
  ELEVEN lines on green, twelve when that last one is present; a reader
  asserting twelve on a green run gets a false red. "No unexplained line"
  is a real measurement only because this bucket is enumerable; assert its
  members, count the rest.
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
- `@ar/service` reporting skipped tests is the expected steady state, and it
  now has TWO sources behind it: the Postgres-gated files self-skipping
  without `AR_LIVE_DATABASE_URL`, and the n8n-gated file self-skipping
  without `AR_N8N_URL`. A run with zero skipped means a live service leaked
  into the default suite, not that something improved. The count is not the
  check — it moves with every case added under `tests/live/`, so compare it
  against HEAD's own run rather than against a number quoted here or in a
  plan. When the tree IS HEAD there is nothing to compare and nothing to
  stash: `@ar/service`'s `pretest` prints `1 built, stamped <sha>` a few
  lines above the vitest banner, so that sha held against
  `git rev-parse --short HEAD`, plus the ABSENCE of a `-dirty` suffix, says
  both that the artifacts under test are HEAD's and that the tree is clean —
  in one line of one run.

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

## Workflow

Feature-branch → PR → merge. Conventional commit types (feat, fix, refactor,
docs, test, chore, perf, ci). Run the verification order before any PR.

**Tag on every completed plan**: when a ralph plan (or an equivalent chunk of
work) completes and lands on `main`, push and tag it `v<N>` (annotated,
sequential — `v0` was the umbrella reintegration) so versions trace back to
the plan that produced them.
