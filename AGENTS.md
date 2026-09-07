# agentic-research

Umbrella monorepo (bun workspaces) for the agentic research platform: research
one or more domains under a shallow taxonomy, produce periodic digests, and
expose/export results over multiple formats/protocols (MCP, Markdown, RSS, …).

## Workspace map

| Path | Package | What it is |
|---|---|---|
| `packages/ui` | `@ar/ui` | Component library (CVA + Tailwind 4 + Radix), Storybook workbench, visual regression harness. Vendored fork of the `components-library` template. |
| `packages/web` | `@ar/web` | The web app (Vite + React 19 + react-router v8), consumes `@ar/ui`. Fixture-backed: the shell, all six surfaces and the seven modal sub-routes run with no backend, writes included — an editor's save lands in a session draft store that lives for the tab and is deleted with the fixture modules. `src/dynamic-form/` draws an editable value from a `FieldDef` list and a zod schema — a tree of the value's structure beside ONE flat form for the selected node, over `@ar/ui`'s `TreeNav`. The lexicon term editor is the only caller so far, drawing it as the middle of three presentations over one draft, between the fixed template and the JSON fallback that still stands beside it. The package's own `AGENTS.md` carries the two route bases, the API swap seam, and the test seam's two runners and two Playwright configs. |
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

That staleness runs in BOTH DIRECTIONS, so a leg that only pulls from the
sibling copy overwrites a row it was right about: measured at one close-out,
`diff` answered 10 lines across 5 hunks with SEVEN rows stale here and ONE
stale there. Neither file is authoritative and the adjudicator is GIT, per
row — the tag resolves, `git log -1 --format=%s <tag>` names the claimed
PR, and `git merge-base --is-ancestor <tag> origin/main` exits 0. Its
controls are one command: a fabricated `v99` not resolving, and one real tag
asserted to name its own PR and NOT a sibling one. A row's FIGURES go stale
the same way its status word does, so a close-out updating a row re-derives
every number in the cell — one row here read `12 routers / 43 routes`
throughout a build that ended at 17 and 55, the superseded pair being a
correct reading of the wrong denominator (a `src/*/routes.ts` glob) rather
than a typo.

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
  143). It also takes a REQUIRED `packageRoot` argument, which the recipe
  above omits: calling it bare throws `TypeError: The "paths[0]" property
  must be of type string, got undefined` from inside a `join`, which reads
  as a broken invariant helper rather than as a wrong call. Pass the
  absolute package root (`collectScannedFiles(PKG)`) — it answered 256
  package-relative paths at the q11 tip, so the 143-of-803 figure above is
  a snapshot of the SURFACE and not of the helper. `findForbiddenMatches`
  beside it takes CONTENT plus a path and needs no root at all, so a probe
  calling both fails on exactly one of them and the traceback names the
  wrong subject. The two non-obvious members: `lib/**/__tests__/*.test.ts` ARE
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
  The complementary half is sharper and bites every prose sweep: `git grep
  -E` here is POSIX ERE, where `\b` is NOT a word boundary and matches
  NOTHING, so the whole line-based half of a sweep returns a clean zero for
  a needle that was never a needle (measured `-E '\brouters?\b'` exit 1
  over a README carrying 5 hits, `-P` the same needle exit 0 at 5). Use
  `-P` for EVERY sweep needle, and pair the two forms on one
  known-present word as the selection pass's own liveness control. Same
  class as the shimmed-`grep` trap and invisible in exactly the same way.
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
  two files leaves the count unchanged. The LINE-keyed set has the
  complementary fault, and it MANUFACTURES a finding rather than hiding
  one: a hit that merely moved down a file the branch edited for an
  unrelated reason comes back as one ADDED plus one REMOVED. Measured at
  the q15 wrap — a carried-in law statement at `packages/ui/AGENTS.md:107`
  read 113 at the tip, exactly the six lines another commit on the same
  branch added above it. So take a SECOND diff with the line number
  DROPPED, as a COUNT per `(patternId, path)` rather than a membership
  set, and settle any pair it leaves by comparing the two line STRINGS
  for byte equality. An unmoved line number is not the converse evidence
  either: this file's OWN hit stayed at line 216 across every edit that
  branch made to it, this bullet included, because they all landed
  beneath it. So `git log <base>..HEAD -- <path>` is what says whether a
  hit's file was touched, and a stable line number says nothing at all.
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
- An unguarded near-neighbour control needs a FORM CHOSEN PER NEEDLE, and
  a needle with no guard to drop has no canonical one — which is what
  reconciles the two contradictory host-control figures this file and
  `progress.txt` have both recorded. Where the needle IS guarded, drop the
  guard (lookbehind, scheme separator, delimiting slashes) and the control
  is live. Where it is a bare multi-fragment LABEL, the only unguarded form
  available is a LEADING FRAGMENT of it, and that form reproduces the
  `2 hits across the invariant's own two files` reading while the FULL
  label reproduces `zero files anywhere` over the SCAN SURFACE, which is
  the denominator that clause is about: measured at the q13 tip the full
  label answers 0 over `collectScannedFiles` and ONE over `git ls-files`,
  that one being the legitimate `NOTICE` attribution. The leading
  fragment's own verdict moves with the fragment COUNT too, live across
  439 files at one fragment and answering that same `NOTICE` line alone
  at two. Both are correct about different probes and the DEAD verdict is
  the same either way, so SAY WHICH FORM and WHICH DENOMINATOR a control
  used — a bare "the host control is dead" sentence is
  unfalsifiable without it. The related claim that the invariant's own two
  files hit ALL the controls "by construction" is FALSE for the two needles
  with no false-positive fixture: both are assembled from fragments in
  their declaring files, so no contiguous copy exists to self-hit, and a
  legitimately EMPTY file set is the expected answer rather than a broken
  probe. Read each control's file SET individually.
- One of those four controls IS dead here, and the tell is the file SET
  rather than the count: the origin HOST needle has no legitimate near
  neighbour in this tree at all. The other three do discriminate, and
  their counts are SNAPSHOTS that grow with the tree rather than
  properties of the guards — re-derive them. Measured at 780 tracked
  files: prefix-without-lookbehind 15 hits / 1 third-party,
  note-app-without-scheme 33 across 16, path-segment-without-slashes 27
  across 3. Re-measured at 1038, after phase 6's export and renderer
  modules landed: 15 / 1 UNCHANGED, then 162 hits across 44 files and
  202 across 16. Re-measured at 1134 tracked files: prefix 24 across
  4, uri 166 across 48, path 202 across 16 — so the PREFIX moved after
  three readings at 15 while the PATH held, and no member of the set
  is stable. A stage holding any of them against a quoted figure
  reports a correct control as a regression. Mind the shape too — a
  `git grep` figure counts LINES while a `findForbiddenMatches` probe
  counts one record per HIT (150 and 187 lines respectively for those
  two). So say which zeros are backed by a live control and which rest
  on the planted sample ALONE — a blanket "the controls proved the
  guards discriminate" is false of the host needle every time.
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
- Read that bucket as a CASE SPLIT and never as one number: the SEVEN
  recorded above is the case-INSENSITIVE reading alone. Measured over 954
  tracked files at the q11 tip, the case-SENSITIVE reading answers SIX, and
  the single case-insensitive-only member is exactly the third bucket — the
  `packages/ui/scripts/compare-design.mjs:11` docblock, whose spelling is
  Capitalised. So a bucket run with a case-sensitive matcher (a bare `git
  grep`, or a `String.includes`) answers six, reads as a hit somebody
  repaired, and misses the one genuine leak in the tree while agreeing with
  nothing recorded here. Both readings do carry a LIVE third-party control
  against the real tree — six hits across five files, and one
  case-insensitive-only — which is the opposite of the five-needle bucket,
  whose origin-HOST control this file records as dead.
- `findForbiddenMatches` compiles every needle with the flags `gi`, so the
  five-needle bucket has NO case-sensitive mode at all and the case split
  above is a fact about the `packages/ui` bucket ALONE. A case-sensitive
  reading of the five is a DERIVED probe recompiling the exported `source`
  strings with `g`, which is worth running and worth LABELLING as derived
  — reporting it as `the invariant read` overstates what ran.
- A control figure is only comparable against the DENOMINATOR it was taken
  over, and the two here differ by more than 3x: `collectScannedFiles`
  answered 325 package-relative paths at the q13 tip against 1089 tracked
  files, and the five needles answer 0 over the scan surface and ONE over
  `git ls-files` (the legitimate `NOTICE` attribution, which sits outside
  the scan surface BY DESIGN). So a recorded `zero anywhere` for any
  five-needle control is a scan-surface reading, and a sweep task told to
  work over `git ls-files` reproduces 1 and reads it as a regression unless
  it measures BOTH. Take the pair in one probe; it is two loops.
- `git cat-file --batch` is the ONE-SPAWN base side of a merge-base hit-set
  diff (against one spawn per tracked file) and it has an alignment trap
  that misattributes every later blob silently: it emits exactly one record
  per INPUT LINE including the two-field missing-object form, so a parser
  that `continue`s on a non-blob record WITHOUT advancing its own index
  shifts every subsequent body onto the wrong path. Key the bodies on a
  counter incremented on EVERY record, and assert the record count equals
  the `git ls-tree` path count in the same probe — the numbers still look
  plausible when it is wrong.
- Derive those two needles from the declaration's ARRAY form and assert the
  FRAGMENT COUNT, never the needle's length: both are `['a', 'b'].join('-')`
  here rather than the `+`-concatenation a parser reaches for, so collecting
  every quoted string in the expression captures the SEPARATOR as a third
  fragment and builds a needle of the SAME LENGTH that answers ZERO over the
  whole tree (measured 12 characters either way, 0 hits against 1). The
  fragment-built planted control cannot report it: it plants whatever was
  derived and duly returns both ids, so it proves the MATCHER runs and says
  nothing about whether the NEEDLE is right. What catches a mis-derived
  needle is the fragment count held against the array's arity, plus the real
  tree's own carried-in hits being non-zero.
- Three derivation faults make a five- or seven-needle sweep report a
  clean zero it did not earn, and none is visible in the planted control.
  `FORBIDDEN_PATTERNS`'s entries carry `source` as a STRING field and NOT
  a compiled RegExp, so the reflexive `p.pattern.source` dies as
  `TypeError: undefined is not an object`, which reads as a broken
  invariant helper rather than as a wrong field name — read `p.source`.
  The `origin-prefix` entry is guarded by a NEGATIVE lookbehind `(?<!...)`
  and not the `(?<=` form the drop-the-guard prose implies, so a
  plantable-literal derivation stripping only `^\(\?<=` leaves the guard
  standing and the control comes back 4 of 5 ids — which reads as one
  needle legitimately having no plantable form. Strip
  `^\(\?<[=!][^)]*\)`, hold the id COUNT against
  `FORBIDDEN_PATTERNS.length` with the MISSING ids NAMED, and inspect such
  an entry by MASKING its alphanumerics
  (`source.replace(/[a-z0-9]/gi,'a')`) rather than printing it. And
  deriving the two `packages/ui` needles from the RESOLVED eslint config
  instead of from the declaring ARRAY LITERAL is a live-LOOKING
  under-report: importing that config from a `/tmp` probe WORKS, and the
  two needles sit right there in `no-restricted-imports`'s
  `patterns[].group`, but glob-DECORATED and two characters longer
  apiece, with no array left to hold a fragment count against. Measured
  over 1062 tracked files, the decorated pair answers 1 hit / 1 file EACH
  where the array-literal derivation answers 1/1 and 6/5 — so the scope
  needle looks right by luck and the repo needle misses five of its six.
  Read the declaring file as TEXT.
- The four near-neighbour controls are ONE parse of the declaring module
  rather than four hand-written guard edits, which is what keeps
  `chosen per needle` from collapsing into `guessed per needle`: strip the
  leading lookbehind from the entry's own `source` for the prefix, take
  `frags[0]` for the host and for the URI (which is what drops the scheme
  separator), and take the NON-delimiter fragments for the path segment.
  Measured at 1062 tracked files, reported as THIRD-PARTY files because
  the declaring modules hit every control by construction: prefix 15 hits
  / 1 third-party LIVE, host 2 / 0 DEAD, uri 162 / 42 LIVE, path 202 / 14
  LIVE.
- The cheap attribution above (`git log -1 -- <path>` naming an older
  commit, plus `git diff ——name-only <base>..HEAD -- packages/ui`
  answering nothing) is UNAVAILABLE to any branch that legitimately edits
  that package or either `AGENTS.md`, and both legs then answer
  `the branch touched it` for a hit it did not introduce. The reading that
  survives is per-PATH with the base side in the SAME probe: run the
  matcher over `git show <base>:<path>` and over the working copy, hold
  the hit COUNT per `(patternId, path)` equal, and compare the two hit
  LINES for byte equality. The line-DROPPED diff must be a COUNT and not a
  second membership SET, for a reason beyond settling a moved line — a
  path carrying TWO hits collapses to ONE member under a set, so a
  set-keyed second diff stays green when one of the two vanishes
  (measured: one README carries 2 and an eight-hit tree answers SEVEN
  keys). Measured at the q17 tip: both branch-touched law statements
  carried in, one moving 201 —> 251 under a byte-identical line while the
  other stayed at 363.
- After writing a scan RESULT into a document, sweep that document with
  the SAME matcher — a close-out that records forbidden-name findings is
  exactly where a needle gets retyped into a tracked file. The live
  control that costs nothing: spike a COPY of the real document content
  with one derived literal per line and require every id back, rather than
  planting into a toy sample. Control and sweep then differ only by the
  spike, which is what makes the zero a reading instead of a dead needle.
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
