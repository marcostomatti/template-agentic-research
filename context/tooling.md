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
  prints a version PER DIRECTORY, and those pins move separately —
  re-derive them from each package manifest rather than quoting a number
  here (measured at the q15 tip: 1.61.1 from `packages/ui`, 1.62.1 from
  `packages/web`, and 1.62.1 from the root, whose `node_modules/.bin`
  carries no playwright at all, so the root resolves nothing and silently
  fetches the registry's latest).
  So a CI step (or any command) invoking a PINNED tool through `bun x`
  must run from a directory that pins it, or it runs a version the
  lockfile never chose while looking identical in the log. Use
  `bun add --cwd packages/<pkg> <name>` to add a workspace dependency; it
  updates the root `bun.lock` in the same step.
- That add is NOT a plain `bun add`, because the ROOT manifest pins some
  packages through an `overrides` block rather than through a dependency
  (`zod` is the standing example): the add silently resolves the PINNED
  version and then writes a CARET range derived from what it resolved, so
  the package manifest reads `^4.5.1` like any floating range and nothing
  in it says the version is held — only root `overrides` plus
  `bun.lock` do. Read `overrides` before taking a range at face value or
  "fixing" one that looks behind latest. The reading that separates
  "resolved the pin" from "fetched a fresh registry latest" is the
  lockfile's `packages` SECTION and not the version string: a correct add
  leaves the existing entry byte-identical and adds exactly ONE content
  line under the workspace's own dependencies, and since bun separates
  entries with a BLANK line a correctly-deduped one-package add lands as a
  THREE-line diff — predict CONTENT lines, or the separator reads as
  the one line unaccounted for, which is exactly the shape a SPLIT would
  have. Pair it with `bun pm view <name> version` as the discriminating
  control, and say so when that control is VACUOUS: for a package no
  manifest overrides, resolving registry latest IS the correct outcome, so
  a matching version is satisfied by construction and proves nothing.
- A hand-resolved MERGE can leave `bun.lock` inconsistent with manifests it
  resolved CORRECTLY, and the whole CI battery then dies at its FIRST step
  saying nothing about the code (measured: all three jobs at 8-12s, every
  later step SKIPPED, on a nested `playwright-core` the merged manifests no
  longer justified). Run `bun install --frozen-lockfile` locally after any
  merge touching a manifest or the lockfile; the repair is never a hand edit.
  Mechanism, repair and the minimality reading: the `lockfile-bump-split-vs-
  dedupe` skill, plus `.claude/skills/git-workflow/SKILL.md`.
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
- The `type` block and the VALUE block demand OPPOSITE orders for the SAME
  two modules, and one file carrying both looks inconsistent while being
  the only green spelling. Measured both ways in one test file: putting a
  PARENT type import first is `type import should occur after type import
  of './schema'`, and putting that same module's VALUE import after a
  sibling is `import should occur before import of './cards'`. So the type
  block is sibling-then-parent and the value block is parent-then-sibling,
  in one file, both required. The related first-write error is a missing
  BLANK LINE rather than a wrong order, the value block's parent and
  sibling imports being two groups. Write it, run `lint`, and take the
  order from the MESSAGE — every attempt to reason it out of the `groups`
  array has been wrong here.
- Three further orderings measured off the message, so a new module can skip
  the round trip. Inside the single `type` group a SIBLING outranks an
  EXTERNAL as well as a parent, so a router module's three-way order is
  SIBLING, then PARENT, then EXTERNAL (`./x.js` type import should occur
  before type import of `../http/y.js`, and before `express`). A `tests/`
  file importing package modules AND a sibling-of-tests helper directory
  writes ONE unbroken value block, `../../src/x.js` and `../helpers/y.js`
  both being `parent` — the blank line the eye wants there is
  `There should be no empty line within import group`. But a
  `tests/invariants/*.test.ts` importing a package module AND its own
  SIBLING helper writes THREE value blocks (`vitest`, `../../src/x.js`,
  `./y.js`), parent and sibling being distinct groups.
- Naming the commits that installed something, for a status banner or a
  close-out, is TWO git readings and neither is a range walk:
  `git log --oneline --diff-filter=A -- <the artifact paths>` names the
  commit that ADDED each file (several paths in one call, one line apiece),
  and `git log -S'<the specifier>' --oneline -- <the manifest>` names a
  dependency add, which no `--diff-filter=A` can reach because the manifest
  already existed.
- Two `@stylistic` rules put a hard ARITHMETIC ceiling on a vitest title and
  on any supertest chain, and `lint:fix` repairs neither the way you want.
  `function-paren-newline` refuses the two-line `it('long title',\n
  async () => {` form, so `  it('` + title + `', async () => {` must fit the
  file's own code width — 56 characters of title at two-space indent in a
  78-column file. Compute it BEFORE writing the titles; the repair that
  keeps the width is a shorter title, never a reformatted call. The same
  rule refuses any call whose arguments span lines, where the repair is
  hoisting the inner expression to a const on the line above. And
  `newline-per-chained-call` counts `request(app).get(path).query({...})` as
  THREE deep, so the one-line form is an error and every call goes on its
  own line — which is why the shape only appears once a case adds a query,
  the two-deep `request(app).get(path)` being legal.
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
- Three zsh behaviours CORRUPT OR ABORT a whole Bash call, each measured
  here and each reading as something other than what it is. `path` is a
  SPECIAL ARRAY tied to `$PATH`, so the reflexive `while IFS=$'\t' read -r
  rule path` clobbers the search path and every later external command in
  that call dies as `command not found: git` — never bind `path`,
  `cdpath`, `fpath` or `manpath`; `p`, `target` and `filepath` are free.
  There is no `${!var}` indirect expansion (that is a bash-ism), so a
  roster loop over variable NAMES aborts the call with `bad substitution`,
  taking every later statement with it — read env vars from python
  instead. And a bare `$var:X` takes zsh's HISTORY-STYLE MODIFIERS, so
  `git show "$ref:AGENTS.md"` is mangled into `<abspath>GENTS.md` (`:A` is
  the absolute-path modifier and eats the `A`) and fails as an ambiguous
  revision; it fires only for paths whose first letter is a modifier
  letter, so `"$ref:src/x.ts"` works and `"$ref:AGENTS.md"` does not.
  Always brace the parameter: `"${ref}:AGENTS.md"`.
- `bun -e <code>` exposes a trailing argument at `process.argv[1]`, NOT
  `[2]`: there is no script-path slot to occupy the middle position, and a
  `--` separator is consumed either way. The node reflex therefore reads
  `undefined`, and a probe handing itself a JSON payload dies as a parse
  error naming `"undefined"` — which reads as a malformed payload
  rather than as an argv index. Pass structured or large payloads through
  the ENVIRONMENT (`process.env.AR_PROBE_X`), which also dodges ARG_MAX
  for a `git ls-files`-sized list.
- The working tree can be switched OUT FROM UNDER a running task by
  another process, several worktrees sharing one `.git`, and the symptom
  is a file you read minutes ago reporting `No such file or directory`
  while `pwd` and every path are correct. Measured: HEAD moved to `main`
  via a `checkout` + `pull --ff-only` pair sitting at HEAD@{1}/HEAD@{0},
  so half a plan's modules vanished and eslint reported
  `import/no-unresolved` for three of them. Untracked work SURVIVES the
  switch. The repair is `git branch --show-current`, `git reflog -8` to
  attribute it, `git checkout <branch>` — then RE-RUN every reading
  taken before the move, a green from the other branch being evidence
  about a tree you were not on. Suspect it whenever an established path
  stops resolving, rather than assuming your own edit. A SECOND cause
  produces the same `import/no-unresolved` symptom and needs the opposite
  response: another process REBUILDING a package's gitignored `dist/`.
  `@ar/web`'s `pretest` wipes and rewrites `@ar/ui`'s, so a `lint` started
  while that build is in flight reports the error against a file the
  branch never touched, with `check-types` GREEN through it (that
  package's exports map resolves types and values from DIFFERENT files).
  Attribute before investigating — `git log --oneline <base>..HEAD --
  <the named file>` and `git status --short -uall -- <it>` both answering
  zero means the finding is not yours — and never run a package gate in
  the foreground alongside a backgrounded `test`/`test:all`.
- The Bash tool's persisted cwd is NOT reliably updated by a `cd <dir> &&
  <cmd>` in a later call, and the symptom is byte-identical to that
  worktree switch: an established relative path answers `No such file or
  directory` while the tree is fine. Measured in one sitting
  — a bare `cd` persisted, a later `cd <root> && python3 ...` ran from
  the root for THAT CALL ALONE, and the call after it was back in the old
  directory. The discriminator is one command, `pwd` beside `git branch
  --show-current`: a correct branch under a wrong pwd is cwd and never a
  checkout, and no reading needs re-running. Use ABSOLUTE paths in any
  probe spanning more than one call.
- `git status --short -uall` is the usual discriminator for that trap, and
  it is BLIND whenever the mis-landed path is GITIGNORED — which is the
  case for the file the loop writes on every run. Measured this session: a
  `cd packages/service` persisted from an eslint call three calls earlier,
  so a python heredoc opening the relative `progress.txt` wrote
  `packages/service/progress.txt`, `packages/service/.gitignore:5` ignored
  it, `git status --short -uall` printed ZERO BYTES, and the root file was
  still its uncompacted self while every number the probe printed was
  correct about the file it had actually written. The reading that catches
  it is a `wc -c` (or an `ls -l`) on the ABSOLUTE path the edit was meant
  for, in the SAME call as the edit — the counter-that-must-move rule,
  aimed at the target rather than at its contents. Spell an absolute path
  in any probe that writes, and never trust a clean `git status` as
  evidence about an ignored file.
- `.claude/worktrees/<name>/` holds FULL sibling checkouts of this repo,
  excluded at `.git/info/exclude`, so `git grep` and `git ls-files` never
  see them while a plain `grep -r` does (measured on one doc heading: 1
  file from `git grep`, 2 from `grep -rl`). Prefer `git grep` for every
  sweep, or exclude the directory by name — an extra hit is another
  leg's tree, and a prose sweep that "fixes" it writes into a checkout
  this branch will never commit.
- A git PATHSPEC's `*` crosses `/` (git uses wildmatch without
  FNM_PATHNAME), so `'src/*.test.ts'` and `'src/**/*.test.ts'` answer the
  IDENTICAL set and the `**` reads as load-bearing when it is not.
  Harmless for a set-equality check, fatal for a DEPTH question: ask depth
  with a regex over the listing (`^src/[^/]+\.test\.ts$`). The sibling
  trap in the same family is a character class that silently matches
  nothing — `tests/[a-z]*/` misses `tests/e2e` outright, the `2` being
  a digit, and reports a green run as having executed no spec at all. Use
  `[a-z0-9]`, and pair any such sweep with a PLANTED path in the same
  command.
- A FOREGROUND Bash call that times out ORPHANS the process it spawned:
  the tool gives up at its timeout but the child survives the shell and
  spins detached (measured: a hand-rolled tokenizer whose index stopped
  advancing burned 100% CPU for hours, invisible to every terminal). So
  any hand-rolled scanner loop must provably advance its index on EVERY
  branch, and a risky one-off script wants a hard cap the OS can reap
  (`timeout 60 python3 ...`, gtimeout via coreutils on macOS, or a
  `signal.alarm` inside the script). The general rule for anything
  multi-minute — `test:all` is ~6 min here — is the tool's own
  `run_in_background` writing BOTH a capture and a separate
  `echo EXIT=$? > <f>.exit`, never a manual `(cmd; echo ...) &` inside a
  foreground call (the tool returns when its own last statement does and
  the subshell is killed mid-run, leaving a truncated capture and NO exit
  file, which reads exactly like a gate still running). `rm -f` BOTH files
  in the same command that launches the run: `/tmp` survives sessions, so
  a poll before the run finishes reads a PREVIOUS run's verdict and
  reports the opposite of what happened (measured). The harness refuses a
  foreground `sleep`, so the poll is `until [ -f <f>.exit ]; do sleep 5;
  done` launched the same way — which then notifies on completion, so
  no polling call is needed at all.
- `bun pm view <pkg>` SUMMARY omits peerDependencies entirely: it prints a
  `deps: N` line and a `dependencies (N)` block and stops, so a package
  whose only constraint on the tree is a PEER reads as unconstrained
  (measured on `@axe-core/playwright`, whose summary showed one dependency
  and no peer section while `bun pm view <pkg> peerDependencies` answered
  `playwright-core: ">= 1.0.0"` — exactly the constraint worth knowing
  in a repo pinning playwright twice at two versions). Query the field by
  NAME before predicting a lockfile delta or reading a green type-check.
- That by-NAME query EXITS 1 with `error: Property <field> not found`
  whenever the field is simply ABSENT, so it ABORTS an `&&` chain and
  silently skips every later query in it, with a message reading exactly
  like a broken query. Measured on one package: `peerDependencies` and
  `engines` both answered it while `dependencies` was fine. Separate the
  queries with `;`, echo `$?` per query, and pair any absence with a
  package that DOES declare the field as the live control
  (`@axe-core/playwright` still answers `playwright-core` here) — an
  unpaired `not found` cannot tell a genuine absence from a query that
  never worked.
- Walking a dependency chain under the isolated linker is realpath, then
  the SIBLING, then realpath again. A package's `node_modules/<dep>` is a
  symlink into `.bun/<name>@<ver>+<hash>/node_modules/<name>`, and a
  dependency OF that package sits BESIDE it in the same
  `.bun/.../node_modules/` rather than under the realpath'd store dir.
  Getting the shape wrong is silent at the hop and loud three steps later,
  because `os.path.realpath` returns a non-existent path UNCHANGED rather
  than raising: the walk prints a plausible nested path and dies at the
  first file read, which reads as a missing file rather than as a bad
  walk. `ls` the store dir's own `node_modules` before trusting a chain
  — its sibling list is also the free reading of what that consumer
  can see.
