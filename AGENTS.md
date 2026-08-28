# agentic-research

Umbrella monorepo (bun workspaces) for the agentic research platform: research
one or more domains under a shallow taxonomy, produce periodic digests, and
expose/export results over multiple formats/protocols (MCP, Markdown, RSS, …).

## Workspace map

| Path | Package | What it is |
|---|---|---|
| `packages/ui` | `@ar/ui` | Component library (CVA + Tailwind 4 + Radix), Storybook workbench, visual regression harness. Vendored fork of the `components-library` template. |
| `packages/web` | `@ar/web` | The web app (Vite + React 19), consumes `@ar/ui`. Shell scaffold today; pages arrive per the UI spec. |
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
  automated scan covers and which the manual sweep still owes (surface: 125
  files). The two non-obvious members: `lib/**/__tests__/*.test.ts` ARE
  scanned (they sit under the `lib` root, so "tests are out" is true only
  of `tests/`), and `scripts/README.md` IS scanned (a `.md` inside a scan
  root, so "READMEs are out" is true only of the package-root one).
- For the manual half, run the invariant's OWN matcher rather than a
  retyped `git grep`: `findForbiddenMatches(content, path)` takes CONTENT,
  so feeding it `git ls-files` applies the five declared needle SOURCES
  with no hand-transcription step and no exposure to the shimmed-`grep`
  trap (measured 676/676 tracked files, agreeing with the git grep at 1
  hit). It carries its own liveness leg for free — the same matcher over an
  in-memory planted sample built from fragments must return 5 hits naming
  all five ids. Run BOTH readings and let their agreement be the result.
  `git grep -P` DOES support lookbehind here (the ugrep shim is on bare
  `grep`, not on `git grep`), so the guarded needle is runnable as-is.
- The correct outcome of that sweep is ONE hit, not zero, and a literal
  zero would itself be the finding: `NOTICE:10` carries the Apache-2.0
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
- Neither fan-out declares a lifecycle hook, so one exit-zero line per
  package is exact for both. `test:all` is the exception: `pretest` gives
  `@ar/service` and `@ar/ui` two prefixed lines apiece.
- `test:all` prints the root vitest summary, then one line per package.
  TRAP: `@ar/web`'s `test` script is a placeholder `echo`, so its code-0
  line is not evidence of a passing suite. "Every package suite passes"
  means two real suites plus one placeholder — report it that way.
- Do NOT grep a `test:all` capture for `failed`/`FAIL`. A fully green run is
  ~1900 lines and `@ar/service` writes those words deliberately: its
  vendored framework half exercises its own error paths through structured
  pino logs (`dependency failed to start`, a request record carrying a 500,
  `dependency stop failed`), so the natural grep reports three regressions
  over a run whose every package exited 0. Read the summary lines, which
  are prefixed per package (`@ar/service test:  Test Files ...`) — a
  `^ *Test Files` anchor catches the root's summary alone and silently
  misses every package's.
- Keying that same capture on vitest's failure glyphs (`×`/`✕`/`✗`) is a
  ZERO-HIT scan with no in-band control, because a GREEN default-reporter
  run emits no per-case glyph at all. The only two `✓` in an 1888-line
  capture are `@ar/ui pretest`'s vite lines (`✓ 2092 modules transformed.`),
  so reading one as proof the glyph vocabulary is present misattributes a
  build line and makes a dead needle look live. Plant the control — a
  throwaway file carrying `×`/`✕`/`✗` grepped in the SAME command — or use
  Python (`re.compile('[×✕✗]')` over decoded text), which needs no PCRE and
  dodges the shimmed-`grep` family entirely. The summary lines remain the
  primary reading; the glyphs are a cross-check that must prove itself.
- Classifying every line is what makes "no failures" a measurement, and the
  biggest bucket is not vitest: of 1888 lines, 1780 are `@ar/ui pretest`'s
  vite chunk-size table (two `│` apiece) and 49 are the framework's
  deliberate pino error-path JSON. The `Exited with code 0` set is exactly
  FIVE and worth NAMING rather than counting — `@ar/service pretest`,
  `@ar/ui pretest`, `@ar/ui test`, `@ar/web test`, `@ar/service test`.
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
  `README.md` and `AGENTS.md` included (676 scanned, and that count is its
  own liveness control). So a docs-only commit is NOT gateless — it has
  exactly one green worth reading, and it is neither fan-out.
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
