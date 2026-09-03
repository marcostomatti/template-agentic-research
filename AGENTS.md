# agentic-research

Umbrella monorepo (bun workspaces) for the agentic research platform: research
one or more domains under a shallow taxonomy, produce periodic digests, and
expose/export results over multiple formats/protocols (MCP, Markdown, RSS, …).

## Workspace map

| Path | Package | What it is |
|---|---|---|
| `packages/ui` | `@ar/ui` | Component library (CVA + Tailwind 4 + Radix), Storybook workbench, visual regression harness. Vendored fork of the `components-library` template. |
| `packages/web` | `@ar/web` | The web app (Vite + React 19 + react-router v7), consumes `@ar/ui`. Fixture-backed: the shell and all six surfaces run with no backend. Its own `AGENTS.md` carries the two route bases, the API swap seam and the two-runner test seam. |
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
- Four more `sharedRules.mjs` behaviours, each invisible until `lint` runs
  and each the likeliest single finding on a new module. `import/order`
  treats parent (`../x`) and sibling (`./y`) as SEPARATE groups, so a module
  importing both needs a blank line between them, and within the single
  `type` group the order is by GROUP first and alphabetical only inside it
  (a sibling `./store.js` type import sorts BEFORE a parent `../db/index.js`
  one — the opposite of a string compare). `no-unused-vars` does NOT have
  `ignoreRestSiblings` on, so the idiomatic omit-a-key `const { key,
  ...rest } = obj;` is an error. `@stylistic/newline-per-chained-call` is
  `{ ignoreChainWithDepth: 2 }`, so a TWO-deep chain is legal on one line
  and only the third call forces the break — measure rather than
  pre-breaking, since a gratuitously split chain is equally green and reads
  as if the rule demanded it. And `implicit-arrow-linebreak: beside` forbids
  any newline between `=>` and its expression INCLUDING inside call parens,
  which `eslint --fix` resolves by JOINING the lines — silently undoing
  hand-maintained wrapping into a 95-130 char one-liner. Run
  `awk 'length > 79'` over any file after a `lint:fix`; nothing else reports
  the reflow. The repairs that keep both the rule and the width are a
  `function` declaration (no `func-style` rule is configured anywhere here)
  or hoisting a nested callback's inner list to a module-scope const.
- The two unused-symbol gates disagree by POSITION, so a uniform-signature
  design is lint-green and `check-types` RED. The recommended
  `args: 'after-used'` on `@typescript-eslint/no-unused-vars` never reports
  a parameter sitting BEFORE a used one, while tsconfig's
  `noUnusedParameters` reports every unused parameter whatever its position
  (measured: TS6133 on the middle parameter of a three-parameter function
  whose third is read).
  So a family of functions given ONE signature needs the `_` prefix that tsc
  honours and eslint never asked for (precedent: `_ctx` in
  `lib/express/builtin-routes.ts`, `_req, _res` in `passthroughMiddleware`).
  A green `lint` is no evidence about an unused symbol here at all.
- Two more places `lint` and `check-types` disagree, in both directions.
  `NodeJS.WriteStream` — and every other member of the ambient `NodeJS`
  namespace — is a `no-undef` ESLint ERROR here while tsc resolves it fine,
  no config in the repo declaring that global; spell the type structurally
  (`typeof process.stdout | typeof process.stderr`) rather than reaching for
  an `eslint-disable`. And `isolatedModules` is on repo-wide, so NO spelling
  of an AMBIENT `const enum` member from a dependency compiles — direct
  access, destructuring, index access, a namespace import and a cast through
  `unknown` were each measured TS2748, with `lint` and a `bun -e` runtime
  probe green for every one of them. NAPI-RS ships its enums that way
  (`@node-rs/argon2`'s `Algorithm` is the first here), so expect it on the
  next native dependency; the repair is `import type` plus the numeric
  literal annotated with it (`const ARGON2ID: Algorithm = 2;`), which tsc
  still membership-checks.
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
The schedule table in `.specs/README.md` is gitignored like the rest, so
each parallel leg holds its OWN copy and git never reconciles them —
every row about the other leg's items is stale in your copy by
construction, with no merge, no gate and no diff that would ever report it
(measured: ten diff lines between two legs' copies at the same moment,
including one leg's guess at the other's row). A close-out task should
update ONLY its own row; repairing a sibling row from your copy
manufactures a second authority for the same fact. Say in the report which
sibling rows you measured stale and where the current values live
(`diff <other-checkout>/.specs/README.md .specs/README.md` is the whole
reading).

## Security posture (carried from the templates, incident-derived)

- Isolated vs live test split is structural: the default suite touches no
  external service; the live files self-skip unless the service they need is
  configured, and the Postgres half runs only against the no-volume `ar_live`
  DB on port 5433, whose destructive helpers refuse any other database name.
  The gates in that directory are armed differently, and only one is armed
  by anything here — `describeLivePg` keys on `AR_LIVE_DATABASE_URL`, which
  `bun run test:live` sets in its own script definition, while
  `describeLiveN8n` keys on `AR_N8N_URL` and `describeLiveOllama` on
  `AR_OLLAMA_URL`, neither of which anything here exports and no compose
  service satisfies. So a live run's steady state is the Postgres files
  running and every other gated file skipping, and "the live suite" is more
  than one thing whenever a skip count is being read.
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
- That ONE-hit figure is a claim about the FIVE needles
  `findForbiddenMatches` holds and NOT about the seven-needle sweep it sits
  inside, and the two populations obey DIFFERENT laws — so a run
  reporting the union against it reads as six regressions. Measured over
  780 tracked files: the matcher's five return exactly
  `origin-project : NOTICE : 10`, and the two needles assembled in
  `packages/ui/eslint.config.mjs` return SEVEN more, and those SEVEN
  decompose THREE ways rather than the two a reader expects: legitimate
  origin prose under the README/NOTICE clause, LAW STATEMENTS naming their
  own subject (root `AGENTS.md`'s import ban spells the scope it bans;
  `packages/ui/AGENTS.md`'s reference-free rule spells the repo whose prose
  it restricts), and the pre-existing comment leak this file records below
  as the third shape both automated halves miss
  (`packages/ui/scripts/compare-design.mjs`). Hold the total against a
  two-way split and one member is left unaccounted, which reads exactly
  like a leak the branch introduced — so attribute that bucket before
  reporting it: `git log -1 -- <path>` naming a commit older than the
  branch, plus `git diff --name-only <base>..HEAD -- packages/ui` answering
  nothing, is two lines and settles it. Report the
  result bucketed by needle SOURCE with the law each bucket answers to,
  never as one number against the five-needle figure.
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
- One of those four controls IS dead here, and the tell is the file SET
  rather than the count: dropping the guard from the origin HOST needle
  returns 2 hits across exactly the invariant's own two files and ZERO
  third-party ones, because that label has no legitimate near neighbour in
  this tree at all. The other three do discriminate (prefix-without-
  lookbehind: 15 hits, 1 third-party; note-app-without-scheme: 33 across 16;
  path-segment-without-slashes: 27 across 3). So say which zeros are backed
  by a live control and which rest on the planted sample ALONE — a blanket
  "the controls proved the guards discriminate" is false of the host needle
  every time.
- The `packages/ui` bucket is a SEPARATE probe from `findForbiddenMatches`
  and needs its OWN fragment-built planted control, taken from
  `packages/ui/eslint.config.mjs`'s `BANNED_SOURCE_SCOPE` and
  `BANNED_SOURCE_REPO` the way the five come from `naming-patterns.test.ts`.
  A bucket run without one carries the same dead-needle risk the five
  already guard against, and nothing else in the repo reports it. A branch
  touching ZERO files under `packages/ui` still owes that bucket, which is
  the counter-intuitive half: both needles scan the WHOLE tree, so the
  branch's new files elsewhere sit inside their surface even though the
  ESLint rule declaring them reaches only `packages/ui` imports.
- On a tree that already carries legitimate hits there is no zero to lean
  on, and the only reading separating yours from carried-in is a
  before/after hit SET diff taken with the SAME matcher:
  `git ls-tree -r --name-only -z <merge-base>` plus `git show <base>:<f>`
  gives the base side in the same probe `git ls-files` gives HEAD's, and
  `ADDED: <none> / REMOVED: <none>` is the whole verdict. Print the two file
  COUNTS beside it (752 vs 780 here) — a base-side walk that resolved
  nothing produces an empty base set and reports every real hit as ADDED,
  which reads exactly like the branch having introduced all of them.
- That base walk carries its OWN liveness control whenever the tree has a
  carried-in hit, and it is stronger than the file-count reading beside it:
  the legitimate `NOTICE` attribution appears on BOTH sides, so a
  `git show <base>:<f>` loop that resolved nothing would surface it as
  ADDED rather than as a silent zero. On a tree whose expected answer is a
  literal zero that control does not exist and the counts are the whole
  reading, so say which of the two a run had. Cost, so the shape is not
  avoided for the wrong reason: 780 base-side `git show` spawns plus 831
  HEAD-side disk reads ran in 16s wall under bun — cheap enough to be
  the default over a worktree or a stash, and `readFileSync(p, 'utf8')`
  over a binary tracked file is lossy but never throws, so the probe's read
  counter equals `git ls-files | wc -l` exactly with no allowlist.
- A THIRD leak shape survives both automated halves: a docblock in a script
  naming the design source's HTML file (`packages/ui/scripts/
  compare-design.mjs:11`, pre-existing, matched case-insensitively on a
  Capitalised spelling). `no-restricted-imports` reaches only `packages/ui`
  IMPORTS and `naming-patterns.ts` scans only `packages/service`, while
  `packages/ui/AGENTS.md` states the very clause it violates. Expect the
  manual half's real findings in comments under `packages/ui/scripts/` and
  `packages/ui/**/*.stories.*`, which no gate in either fan-out opens.
- The whole sweep runs from ONE /tmp `.mjs` under bun rather than from
  inside `packages/service`: `naming-patterns.ts` imports only node
  builtins, so a probe importing it by ABSOLUTE path reaches
  `findForbiddenMatches` with no cwd trap and no package graph. That lets
  tracked files, an outbound PR body, the planted control and the near-miss
  controls be ONE command whose output is a single verdict block — which
  matters because the controls are only evidence when they ran against the
  same matcher instance as the sweep.
- The planted control for those five is DERIVABLE from the needles
  themselves, which removes the guessing step that silently turns a control
  dead: `FORBIDDEN_PATTERNS` is exported and each entry's `source` IS the
  regex text, so stripping a leading lookbehind and unescaping gives a
  plantable literal per needle with no hand-transcription and nothing
  banned typed into the probe. A control built from GUESSED fragments
  answered 0 of 5 ids while looking exactly like a clean sweep. It needs
  TWO guards beyond "all five ids returned", because the id SET alone is
  satisfiable by a sample no needle discriminates on: `findForbiddenMatches`
  splits on newlines and the guarded needle's lookbehind is satisfied by a
  line START as readily as by a non-alphanumeric character, so plant ONE
  literal PER LINE behind a short marker and assert exactly one hit on each
  plant's own line, then pair it with a CLEAN sample through the same
  matcher answering 0. The `packages/ui` bucket wants the same per-line
  shape, which is also what proves its two needles are DISTINCT from each
  other where an id-set equality cannot.
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
- Two refinements to the figures above, both measured at a much larger
  suite. The pass-glyph 31 is the one number in this file that is NOT a
  snapshot: it held at 31 with the fan-out grown to 2709 vitest cases,
  because vitest's default reporter contributes exactly ZERO of them
  — 27 come from `@ar/web test:` (Playwright's per-test lines) and 2
  apiece from the `@ar/ui` and `@ar/web` pretest vite builds. Decompose it
  BY PREFIX rather than quoting the total, and do not "re-derive" a correct
  31 as though it tracked suite size. And that package-scope `other` bucket
  is INVARIANT at its nine lines however far the suite grows, so it is
  assertable by MEMBERSHIP exactly as the fan-out's own unprefixed bucket
  is: only the pino and summary buckets scale, measured 169+4+9 = 182 at
  86 files / 1899 cases against the 108+4+9 = 121 recorded at 65.
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
  `AR_N8N_URL`, and the proposer-gated file without `AR_OLLAMA_URL`. A run
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
  re-derive the denominator: it moved 780 -> 831 -> 832 across three
  recorded readings.
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

## Workflow

Feature-branch → PR → merge. Conventional commit types (feat, fix, refactor,
docs, test, chore, perf, ci). Run the verification order before any PR.

**Tag on every completed plan**: when a ralph plan (or an equivalent chunk of
work) completes and lands on `main`, push and tag it `v<N>` (annotated,
sequential — `v0` was the umbrella reintegration) so versions trace back to
the plan that produced them.

**Take the mergeability reading BEFORE the push.**
`git merge-tree --write-tree origin/main HEAD` is one command, needs no
checkout, worktree or stash, exits 1 on conflict, and prints the conflicted
paths as stage1/2/3 index entries followed (after the first blank line) by
the `Auto-merging` / `CONFLICT (content)` block naming each one. Doing it
first is what lets a PR body NAME the conflicts and their shape instead of
the reviewer discovering a red merge box, and it is the same reading
`gh pr view --json mergeable` gives only once the PR exists and is
therefore too late to write about. Expect the complementary-additions shape
here: the recurring conflicts are `docs/architecture/` tables both sides
appended rows to, which want both sides kept.

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

**Compare a published PR body in BYTES on both sides**, or the two figures
disagree by exactly the multi-byte characters and a correct edit reads as
never having published: measured on a body carrying em dashes, python's
`len(str)` answered 17543 where `len(bytes)` answered 17603, a 60-byte gap
that is entirely U+2014. Normalise CRLF and the trailing newline, compare
the BYTES, and print both lengths beside the boolean.
