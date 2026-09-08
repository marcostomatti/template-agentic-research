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
