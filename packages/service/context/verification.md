## Verification order

```bash
bun run lint && bun run check-types && bun run test
```

All three must be green before a PR. `check-types` covers `**/*.test.ts`
too: the exclusion carried from the origin is gone, so a type error in a
test file fails the gate like any other.

Run these from inside `packages/service` as the fast inner loop (seconds);
the root `lint:all` / `check-types:all` / `test:all` fan-out is the gate
before a PR.

`tests/` no longer carries a type-checking asymmetry: plain `.ts` modules
and their `*.test.ts` siblings are both in the program (tsconfig `include`
lists `tests`, and nothing excludes the tests). Matcher, walker and helper
logic inlined into a `.test.ts` now gets the same tsc gate as a plain
module beside it, so splitting it out is a readability call rather than
the coverage one it used to be.

A new directory under `src` needs no config change (tsconfig `include`
already covers `src`, the `lint` script covers `src lib tests scripts`,
and vitest discovers tests). `scripts/` used to be asymmetric — listed by
tsconfig `include`, unnamed by the `lint` script — and phase 2 closed the
gap, so a `.ts` file there is both type-checked and linted. Phase 3 widened
`lint` to `eslint src lib workflows tests scripts`, which reaches the
workflow sources, `workflows/src/README.md` AND both generated trees (the
base config's `dist/**` ignore is base-relative and does not match a nested
`workflows/dist/**`), so that gate's file set moves with build state — a
fresh clone lints two files under `workflows/` where a built tree lints
four. It reads STRUCTURE only there (`jsonc/indent`, empty lines, markdown
recommended): no node name, statement, marker form or display name is
checked by it. `data/` and `docs/` are still covered by no lint or
type-check target.

Prove coverage rather than assuming it — and prove it from the directory you
are running in, because BOTH gates are cwd-dependent. `eslint`'s governing
leaf config changes with the launch directory, so a file "no lint gate
reads" from the repo root is ordinarily linted from inside the package;
`tsc`'s program is worse than partial — from `packages/service` it is ~857
files of which 91 are the package's, and from the repo root it is ~311 of
which ZERO are. Use `--no-warn-ignored -f json` for eslint (a plain
`errorCount: 0` is indistinguishable between a clean file and a skipped one;
the tell is `warningCount: 1` carrying `File ignored`) and
`tsc --noEmit --listFilesOnly` for types, which has no third state. The
strongest reading of either is a COUNT DELTA between two argument lists
rather than a grep for one path. See the `prove-gate-coverage-read-only`
skill.

A `.sh` under a scan root is a third cell: `collectScannedFiles` applies no
extension filter, so the naming invariant reads it, while `eslint` and `tsc`
name it never. Shell behaviour here is proven by RUNNING it — including its
refusal paths — and by nothing else.

Markdown and JSON are gated unevenly here, and the map is worth knowing
before calling a prose edit verified. The naming invariant's scan roots
carry no extension filter, so they reach three READMEs —
`workflows/src/`, `data/` and `scripts/` — plus everything generated
under `drizzle/`, meta snapshots included. ESLint's `**/*.md` block
reaches a markdown file only where a lint target names its directory,
which today is `scripts/README.md` alone, and it checks document
STRUCTURE only: no width, no link target, no reference label. Everything
else — this file, `ARCHITECTURE.md`, all of `docs/`, and `package.json` —
is read by NO gate at all, so a green `test:all` says nothing about it.
Verify those by deriving each claim from the artifact it describes (parse
the roster out of the prose, compare it against the barrel or the
directory) rather than by reading the doc and agreeing with it.

`.env.example` is the exception to that map and is NOT gateless: it is
listed in `SCAN_FILES` in `tests/invariants/naming-patterns.ts` (beside
`docker-compose.yml`) precisely because it is copied verbatim by whoever
stands the stack up, so the de-origination invariant opens it on every
`bun run test`. Prove that coverage rather than assuming it --
`collectScannedFiles` takes a `packageRoot` ARGUMENT, and calling it with
none dies `ERR_INVALID_ARG_TYPE` on `paths[0]` from inside `join`, which
reads like a broken module instead of a wrong call. Pair the membership
assertion with an absent-path control in the same run. An example VALUE in
that file can also be falsified while every sentence around it stays true,
so a prose sweep keyed on words never reaches it: check each commented-out
value against the WIRING's own conditions, since a presence toggle
routinely makes two of them exact complements.

`Dockerfile`'s build stage runs `bun run check-types` over a PARTIAL tree
(`tsconfig` + `lib` + `src`) while the package tsconfig's `include` also
names `tests`, so any colocated `src/**/*.test.ts` importing a shared
fixture out of `tests/helpers/` type-checks locally and breaks the IMAGE --
and no gate in either fan-out reports it, since nothing but a docker build
ever type-checks that subset (measured: 10 TS2307 across four
`src/auth/*.test.ts` files, plus 2 TS7006 cascades, tsc exiting 2). The
Dockerfile has to COPY whatever `tests/` subtree `src/` reaches, and the
helper's own imports have to stay inside the copied set. Two readings such
a build owes. A `docker build` whose every layer prints CACHED is a REPLAY,
not a measurement — it exits 0 without running a single RUN step, and the
`check-types` layer is exactly the one a stale cache hides; take it with
`--no-cache` and read the RUN steps' OWN output (a genuine run prints both
`bun install` summaries and `$ tsc --noEmit`). And a build with no
`--platform` targets the HOST arch, so on Apple Silicon every claim about a
`linux-x64` artifact is unproven — `--platform linux/amd64` builds the
actual deploy target and costs nothing measurable here.

Neither `max-len` nor `max-lines` exists in any config, so the ~800-line
file cap and the hand-maintained comment wrapping are review-quality
conventions that turn no gate red. The absent-rule list is longer than it
looks and each entry means a shape review has to catch: `max-len`,
`no-unnecessary-condition` (so a `?.` left dead by a widened type is
lint-clean and sibling sites already carry them), `no-use-before-define`
(so a self-referential stub may return its own hoisted binding),
`no-inferrable-types` (so an explicit `const X: string = 'literal'` is
fine), and `exactOptionalPropertyTypes` — `tsconfig.base.json` carries only
`strict: true`. Do not generalise from that to style at large: style here
is UNPOLICED on width and type-awareness while being strict on SHAPE, and
`sharedRules.mjs` DOES carry `@stylistic/newline-per-chained-call`, so a
two-hop builtin chain such as
`createHash('sha256').update(t, 'utf8').digest()` is an ERROR even at 60
columns. Write any chain past one `.` broken one call per line from the
start, and run `bun run lint` in the package (seconds) BEFORE
`check-types` — the shape errors are the ones no type probe surfaces. That
rule forbids three links in ONE expression, not three links: a four-call
`.replace(...).replace(...).replace(...).trim()` written one call per LINE
lints clean, which is how every ported text pass here is written.

A new module under `src/lib/` hits a predictable set of findings, and the
regex ones are measured rather than inferred. `import/order` comes first —
parent (`../x`) and sibling (`./y`) are SEPARATE groups needing a blank
line between them, on top of the `type`-first-group rule. Then
`no-useless-escape`, which reads a class by POSITION: `\-` is KEPT where a
hyphen could open a range (`[A-Za-z0-9_.\- ]` is clean, another member
following it) and is an ERROR where it cannot — last in the class,
immediately before the `]`, so `[\p{L}\p{N} .,&'()\-]` is one error and
dropping the backslash is the only repair that lints. An origin pattern of
that second shape therefore does NOT port verbatim; the set it matches is
unchanged and nothing else reports the edit, which is why it belongs in the
port's `What is dropped` paragraph. The same rule flags `\/` INSIDE a class
while requiring it outside one, so write `[\\/]`, never `[\\\/]`.
`no-control-regex` does NOT fire on `\r`, `\n` or `\t` — a ported denylist
naming the two line terminators ports as a literal — and is owed the
`new RegExp` + `String.fromCharCode` construction only where a class
reaches past those three. `no-misleading-character-class` fires on a class
holding a zero-width JOINER between two other characters, the exact shape
any ported invisible-character strip carries; the repair that keeps the
match identical is an alternation built with `new RegExp` over the same
code points, since reordering the class is fragile.

Re-derive the over-cap roster
(`wc -l scripts/*.ts | sort -rn`) rather than quoting one: phase 3 put five
more files over it, `scripts/workflow-markers.ts` furthest by a wide margin,
and any roster written down here goes stale on the next docs task without a
gate to say so.

Comment WIDTH is likewise measured and not quoted. It varies per directory,
per file and per block — `scripts/` alone spans 63 to 67 characters of text
— so read the width off the block you are editing (reproduce its existing
line breaks at each candidate width) rather than from a sibling, a
directory, or a number recorded in a doc. The `prose-reflow-helper-asserts`
skill carries the helper and the nine ways a programmatic rewrap ships
broken prose that every mechanical check passes.

The seam each over-cap file wants is recorded here rather than in the file:
split the LOADER out of
`seed.ts` into `scripts/seed-load.ts` (no import cycle, and it leaves
`seed.ts` a thin entry point — moving `runSeedCli` out instead does cycle,
since the guard must stay in the file `bun scripts/seed.ts` runs), and
move `formatPendingTable` / `formatRuling` / `PENDING_COLUMNS` out of
`approve.ts` into `scripts/approve-render.ts`, re-exported from it. Both
follow the `seed-schemas.ts` / `seed-apply.ts` precedent — a bare
`export * from './<x>.js';` beside the normal import — and a move of that
size lands as its OWN refactor commit, never alongside new behaviour.
