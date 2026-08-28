/**
 * @packageDocumentation
 * The build entry point. Reads every workflow source in
 * `workflows/src/`, resolves the markers each one carries, and writes
 * one built artifact per source into `workflows/dist/`.
 *
 * This is the half that touches the world outside the package's own
 * types: the directory listing, the reads and the writes, the git
 * call behind the build stamp, and the one `Bun.Transpiler` the
 * splice needs. What a marker MEANS is next door in
 * `workflow-markers.ts` — the two are one delivery, split so that
 * every rule decidable without a filesystem or a transpiler can be
 * driven without either.
 *
 * That split is by subject rather than by purity, which is worth
 * saying because the per-file transform sits on this side and
 * needs neither. A MARKER is next door; an ARTIFACT is here, and
 * the refusal that reads one back is a claim about output rather
 * than about a marker. It stays drivable outside a bun process
 * regardless, because both of the transform's dependencies — the
 * loader and the settings chain — arrive as parameters.
 *
 * `workflows/dist/` is generated, and a run rewrites every artifact
 * in it while sweeping none away — what a source no longer produces
 * stays where it lies, which is {@link buildAll}'s to explain. The
 * build is unconditional rather than only-when-absent, and the two
 * answers differ over exactly one case — a dist built from older
 * sources — where rebuilding is the answer wanted anyway. The build
 * never reads that directory back: `workflows/src/` is the whole
 * input, so an artifact left over from an earlier checkout changes
 * nothing about what the next run writes over it.
 *
 * A file under `workflows/dist/` is therefore never hand-edited, and
 * the loss is quieter than the overwrite it begins with. The
 * directory is gitignored, so an edit there reaches no diff, no
 * review and no other machine — and no rebuild-and-compare exists to
 * report that it went missing, because where generated output is
 * committed a stale or edited artifact surfaces as a dirty tree and
 * here there is nothing to dirty. The reviewed artifact is the source
 * file, and the same rule covers the sibling artifact directory the
 * `--external` build writes, `workflows/dist-external/`.
 *
 * The transpile step requires bun as the LAUNCHER, which is a
 * stronger claim than a dependency. `Bun.Transpiler` exists only
 * inside a process bun is running; bun sitting on PATH says nothing
 * about the process that opened this file. So the command is
 * `bun scripts/build-workflows.ts`, and nothing else runs it — not
 * node, and not a vitest worker, which is why a case that must
 * exercise the real transpiler spawns this file as a subprocess
 * rather than importing its way to one.
 *
 * That requirement is narrower than the file, and worth stating as
 * such: only the library splice reaches for a transpiler, and a build
 * that quietly did without one would still fail, since the un-inlined
 * marker survives into the serialized artifact and the survival check
 * refuses it there. What refusing at the launcher buys is the
 * message. One names a marker that survived and points at a workflow
 * source; the other names the command to run instead, which is the
 * edit that actually fixes it.
 */

import type {
  EnvSourceOptions,
  LibLoader,
  LibScan,
  ResolveMarkersOptions,
} from './workflow-markers.js';

import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  ENV_DEFAULTS,
  MarkerPathError,
  RetiredMarkerError,
  SURVIVING_MARKER_FORMS,
  SpliceableLibError,
  SurvivingMarkerError,
  UnresolvedSettingError,
  assertSpliceable,
  envSources,
  resolveEnvVar,
  resolveMarkers,
  stripDeclarationExports,
} from './workflow-markers.js';

/**
 * Thrown when the process running the build has no
 * `Bun.Transpiler` to splice a library with.
 *
 * A transpiler comes from the LAUNCHER rather than from the
 * manifest, which is the whole of why this refusal exists.
 * `Bun.Transpiler` is a property of a global that only a process
 * bun is running has, so a bun on PATH, a bun in `packageManager`
 * and a bun that installed the dependencies all say nothing about
 * whether this process can reach one.
 *
 * A distinct class rather than a bare `Error`, so a case covering
 * the launcher can pin the refusal to it. Every other way the
 * splice fails arrives as something else: a library file that
 * cannot be read comes back as whatever `readFileSync` throws, a
 * source the transpiler rejects as whatever it raises, and a
 * library that cannot stand alone in a Code node as
 * `SpliceableLibError`. An assertion accepting any `Error` would
 * pass for all of those.
 *
 * With this refusal missing the build still fails, so the class is
 * about the message rather than about the outcome. What it fails
 * on instead, measured either side of deleting the guard, is
 * `ReferenceError: Bun is not defined` under a launcher with no
 * global and `TypeError: Bun.Transpiler is not a constructor`
 * under one carrying a partial one. Both name a symbol, both are
 * raised from the line that reached for it, and neither is the
 * line anybody edits. This one names the command to run in its
 * place.
 */
export class TranspilerUnavailableError extends Error {
  /**
   * What stood where the constructor should have been, worded as
   * the object of the message rather than as a label, so the
   * refusal reads as one sentence.
   *
   * Two values, and they are two launchers wanting two different
   * edits. No `Bun` global at all is a process bun never touched —
   * node, or a runner over node — and the edit is to run the
   * command under bun. A `Bun` global carrying no `Transpiler` is
   * a vitest worker, where relaunching is not on offer at all and
   * the edit is to spawn the build as a subprocess instead.
   */
  readonly observed: string;

  /**
   * @param observed - What the build found in place of the
   *   transpiler constructor.
   */
  constructor(observed: string) {
    super(
      `The library splice needs Bun.Transpiler, and ${observed}. ` +
      'A transpiler comes from the launcher rather than from the ' +
      'manifest: run the build as `bun scripts/build-workflows.ts` ' +
      'and not under another runtime. From a vitest worker, where ' +
      'relaunching is not on offer, spawn that command as a ' +
      'subprocess rather than building in process.',
    );
    this.name = this.constructor.name;
    this.observed = observed;
  }
}

/**
 * Build the transpiler the library splice runs on.
 *
 * The `ts` loader, because every library a marker inlines is a
 * TypeScript source under `src/lib/`, where the first of them —
 * `schedule.ts` — now sits. What comes back has the types erased and
 * the export keywords still on it, which is why a splice is more than
 * a transpile — taking those off is `stripDeclarationExports`, next
 * door in `workflow-markers.ts`.
 *
 * A function rather than one transpiler built when this module
 * loads. Construction is what fails when the launcher is wrong,
 * and at module scope that failure would land on anything
 * importing this file, including the parts of the build that need
 * no transpiler at all.
 *
 * The check is on the `Transpiler` PROPERTY rather than on the
 * `Bun` global, and that is not a defensive flourish: the obvious
 * `typeof Bun === 'undefined'` is measurably wrong here.
 * `tests/helpers/bun-polyfill.ts` is a setup file in
 * `vitest.config.ts`, so every worker in this package starts with
 * a partial `Bun` global already installed — one carrying `serve`
 * and nothing else, put there so the MCP transport and the health
 * server have something to listen on. Measured inside a worker:
 * `typeof Bun` is `'object'`, `Object.keys(Bun)` is `['serve']`,
 * and `Bun.Transpiler` is `undefined`.
 *
 * So the obvious guard does not fire, the constructor is reached
 * anyway, and what comes back is `TypeError: Bun.Transpiler is
 * not a constructor` — the same failure
 * {@link TranspilerUnavailableError} records for a build carrying
 * NO guard at all, measured with the wrong guard written and
 * with none. For the one launcher that has a partial global,
 * writing that check and writing nothing end in the identical
 * place, and only one of the two looks like a guard on the way
 * there.
 *
 * What makes the wrong check convincing is that it is right
 * twice. Under node the global is genuinely absent and it fires;
 * under bun the global is whole and it does not. It is wrong for
 * exactly one launcher, and that launcher is the one this refusal
 * exists for — a worker is where the build gets reached by
 * accident, and the only place relaunching is not the edit.
 *
 * An identity check discriminates too: measured,
 * `process.versions.bun` is `1.3.14` under bun and absent in a
 * worker. It answers a different question, though — who launched
 * the process, rather than whether the constructor the next line
 * calls is there to be called. Only the property answers the
 * second, which is the one being asked.
 *
 * @returns A transpiler over the `ts` loader.
 * @throws TranspilerUnavailableError When the process running the
 *   build has no `Bun.Transpiler` to construct.
 */
export function bunTranspiler(): Bun.Transpiler {
  if (typeof globalThis.Bun?.Transpiler !== 'function') {
    throw new TranspilerUnavailableError(
      typeof globalThis.Bun === 'undefined'
        ? 'this process has no Bun global at all'
        : 'the Bun global this process has carries no Transpiler',
    );
  }

  return new Bun.Transpiler({ loader: 'ts' });
}

/**
 * The slice of `Bun.Transpiler` the library splice reaches for:
 * two questions asked of one source.
 *
 * Structural rather than the class itself, and that is a
 * requirement rather than a courtesy. A vitest worker has no
 * `Bun.Transpiler` to construct, so a parameter naming the class
 * would leave {@link loadLib} drivable from a real build alone,
 * and every rule behind it reachable only through a subprocess.
 * Named by shape, the same loader takes a stand-in answering out
 * of recorded output.
 *
 * `scan` answers with {@link LibScan}, which is the shape
 * {@link assertSpliceable} judges, so what a transpiler reports
 * about a library reaches the refusal without being taken apart
 * on the way.
 *
 * `tests/build/marker-fixtures.ts` declares these same two
 * members for its own stand-in rather than importing them from
 * here, so that the fixtures can answer for a transpiler without
 * depending on which bun types are installed. The two are tied by
 * assignment and nothing else, and no type checker reads that
 * seam: the only files handing a stand-in over are `*.test.ts`,
 * which `tsconfig.json` excludes from the program. A third member
 * added here would leave the stand-in short of it, and the first
 * report would be a case failing on the call.
 */
export interface LibTranspiler {
  /**
   * Erase a source's types, leaving its export keywords on.
   *
   * @param source - The library as it was authored.
   * @returns The same library as JavaScript.
   */
  transformSync(source: string): string;

  /**
   * Report what a source depends on and what it declares.
   *
   * @param source - The library as it was authored.
   * @returns Its imports and its exported names.
   */
  scan(source: string): LibScan;
}

/**
 * Build the loader a marker pass resolves `__INLINE:<path>__`
 * through.
 *
 * Reads the library a marker named, erases its types, refuses it
 * if a Code node could not run it, and hands back the body with
 * its export keywords gone. That is the whole of what
 * {@link LibLoader} promises, assembled in the one place able to
 * promise it: every step needs something this module has and
 * `workflow-markers.ts` deliberately has not — a directory to
 * read from, and a transpiler only a bun process can construct.
 *
 * A factory rather than a function taking a third argument. The
 * marker pass hands a loader one path and nothing else, because a
 * marker names nothing else; the directory and the transpiler are
 * the build's own, settled once per build, and threading them
 * through `resolveMarkers` would put two of the build's decisions
 * into a signature about markers. Closing over them also settles
 * that one transpiler answers for every library in a build,
 * rather than one being built per marker.
 *
 * The refusal runs before the strip, and holding that order is
 * this function's job rather than a happy accident.
 * {@link stripDeclarationExports} says it relies on the refusal
 * being in front of it: the three re-export forms are statements
 * in their own right, so the strip leaves them exactly as it
 * found them, and a library carrying one comes back looking
 * spliceable. Nothing further along would notice. The body would
 * reach a node still wearing `export default` and fail on first
 * execution, which is the failure the refusal exists to move to
 * build time.
 *
 * Both questions are asked of the same text. `scan` reads the
 * library as authored rather than the transpiled output, so the
 * refusal judges the dependencies the author wrote while the
 * strip runs over what the transpiler made of that same source.
 * Measured across every sample in `tests/build/marker-fixtures.ts`
 * the two texts report an identical import list, so this is about
 * never letting the pair disagree rather than about a difference
 * anything has seen.
 *
 * Nothing here is wrapped, which is the contract
 * `inlineLibString` already states from the other side. A path
 * naming no file comes back as whatever `readFileSync` raises,
 * and so does a directory or a file the build may not read:
 * measured, `ENOENT`, `EISDIR` and `EACCES`. The first and the
 * last name the joined path; the middle one names no path at all,
 * and is the one refusal on this path that leaves a reader
 * nothing to look up. A `git grep` for the marker form across
 * `workflows/src/` is what turns any of them back into the
 * workflow source that asked, which is what `SpliceableLibError`
 * says for the refusal it carries.
 *
 * The path is not judged here, and this is not a second guard.
 * `assertMarkerPath` runs inside `inlineLibString` before a
 * loader is called, so a path pointing outside the library
 * directory never reaches this. Handed one directly, `join`
 * simply resolves it: measured, a `..` segment is consumed rather
 * than refused, so `../x.ts` against a library directory lands on
 * a file beside that directory, and if that file reads and
 * splices the build reports success. Which is why the path rule
 * sits ahead of the loader rather than behind it — neither this
 * nor anything downstream would report the escape.
 *
 * Nothing is cached. A source inlining one library at two markers
 * reads it twice, and the next build reads every library again.
 * Both are a handful of small files per run, and a cache would be
 * the only thing in the build answering from before an edit.
 *
 * @param libDir - The directory a marker's path is relative to.
 * @param transpiler - The transpiler every library is put
 *   through, {@link bunTranspiler}'s in a real build.
 * @returns A loader over that directory and that transpiler.
 */
export function loadLib(
  libDir: string,
  transpiler: LibTranspiler,
): LibLoader {
  return (libPath: string): string => {
    const source = readFileSync(join(libDir, libPath), 'utf8');
    const transpiled = transpiler.transformSync(source);

    assertSpliceable(transpiled, transpiler.scan(source), libPath);

    return stripDeclarationExports(transpiled);
  };
}

/**
 * The stamp a build with no commit to name carries.
 *
 * Deliberately the same text `ENV_DEFAULTS.AR_BUILD_TAG` holds, so
 * the two ways an artifact ends up unstamped agree on what an
 * operator reads: a build that asked git and got no answer supplies
 * this, and a build that resolved the setting from nowhere at all
 * falls through to that table and finds the same word. Nothing ties
 * them but this sentence. Reading the table from here answers
 * `string | undefined` under `noUncheckedIndexedAccess`, measured,
 * so a fallback would have to sit behind the lookup — a second
 * literal rather than one fewer.
 */
const NO_COMMIT_BUILD_TAG = 'dev';

/**
 * What git printed, or `null` when git could not be asked.
 *
 * The two outcomes a caller has to tell apart are empty output and
 * no output at all: `git status --porcelain` prints nothing for a
 * clean tree, and prints nothing when the command never ran. The
 * empty string is the first of those and `null` is the second, so
 * neither reading can be mistaken for the other.
 *
 * Every way the call can fail collapses into that `null`, which is
 * a swallow written on purpose and is why it is confined to this
 * helper rather than spread across its callers. Measured over the
 * conditions a build actually meets: a missing git binary and a
 * `root` that does not exist both come back with no `status` at
 * all and an `ENOENT` in `error`, a directory that is not a
 * checkout exits 128, and a checkout with nothing committed yet
 * exits 128 as well. None of the four is distinguished here,
 * because none of them changes what a caller does about it.
 *
 * The `catch` covers none of those — every one is reported in the
 * result object rather than raised — and is here so that not
 * throwing is a property of this function rather than an inherited
 * promise from `spawnSync`.
 *
 * @param root - The directory to ask git from.
 * @param args - The git subcommand and the arguments it takes.
 * @returns The trimmed standard output when git exited cleanly,
 *   and `null` for every other outcome.
 */
function gitOutput(root: string, args: string[]): string | null {
  try {
    const git = spawnSync('git', args, { cwd: root, encoding: 'utf8' });

    return git.status === 0
      ? (git.stdout ?? '').trim()
      : null;
  } catch {
    return null;
  }
}

/**
 * What `git status --porcelain` printed, or `null` when the status
 * could not be answered.
 *
 * Three answers, and the two callers read them in opposite
 * directions, which is why the argument for the READING sits at
 * neither of them and the command itself is spelled once here. Empty
 * is a clean tree. Non-empty is the listing of what is not committed.
 * `null` is {@link gitOutput}'s no-answer, and it means the question
 * was never put rather than that it came back negative.
 *
 * {@link gitBuildTag} folds the last two together, a tree it cannot
 * vouch for being stamped `-dirty` either way; `assertCleanTree` in
 * `deploy-external.ts` refuses both and tells them apart in what it
 * says, because one asks an operator to commit something and the
 * other asks them to find out why git could not be run. Neither of
 * those readings is available here, and neither caller can state the
 * relation between them.
 *
 * What is asked is the whole REPOSITORY and not `root`. Measured from
 * this package's own subdirectory, `git status --porcelain` answers
 * about a file planted at the repo root, and untracked files count
 * toward that answer. {@link gitBuildTag} argues what the reading
 * buys a stamp; a caller wanting a narrower one would need a pathspec
 * rather than a directory.
 *
 * @param root - A directory inside the checkout to ask git from,
 *   resolved as a `cwd` and so never safely empty or relative.
 * @returns The trimmed listing, empty for a clean tree, and `null`
 *   when the status could not be answered — which covers git
 *   refusing as well as git never running.
 */
export function gitStatusPorcelain(root: string): string | null {
  return gitOutput(root, ['status', '--porcelain']);
}

/**
 * The stamp a built workflow carries, naming the checkout it was
 * generated from.
 *
 * Three answers, and which one comes back is the whole of what the
 * stamp says. A bare short commit means every input the build read
 * sits at that commit. That same commit with `-dirty` behind it
 * means something in the tree does not, so the commit locates the
 * artifact without describing it. {@link NO_COMMIT_BUILD_TAG}
 * means there was no commit to name at all — no git binary, a
 * directory that is not a checkout, or a checkout with nothing
 * committed yet.
 *
 * Cleanliness is asked of the whole repository rather than of
 * `root`. `git status --porcelain` reports the working tree entire
 * whatever directory it is run from, measured, and untracked files
 * count toward its answer. Both are the wanted reading here: the
 * build splices libraries out of `src/lib/` and reads sources out
 * of `workflows/src/`, and a file untracked at either is one the
 * commit cannot account for.
 *
 * A status that cannot be answered reads as `-dirty` rather than
 * as clean. The absence of that suffix is a claim about the tree,
 * and a build that could not run `git status` has no grounds for
 * making one; a suffix nobody can rule out costs a reader a second
 * look, which is the cheaper of the two mistakes. That case is
 * reachable rather than theoretical: measured, a corrupt index
 * exits `git status` 128 while `git rev-parse` still names the
 * commit, and the stamp comes back as the commit with `-dirty`
 * behind it.
 *
 * A commit that comes back empty is treated as no commit at all,
 * for the same reason: the alternative is a stamp reading `-dirty`
 * with nothing in front of it, which names neither a commit nor
 * the absence of one.
 *
 * Nothing here throws, for any root, and that is a contract rather
 * than an accident of the two calls behind it. Measured over what
 * a build can be handed: a directory that is not a checkout, one
 * that does not exist, and a path naming a file rather than a
 * directory all come back with a stamp. The reason is what a stamp
 * IS — a label, read by an operator off a canvas and by nothing in
 * a running workflow. A build that refused to write an artifact
 * because git could not be asked would have stopped a deploy over
 * a note on that canvas, and that is the trade this function is
 * written to refuse.
 *
 * That totality is over what git makes of `root`, and it is
 * narrower than it sounds. `root` is handed over as a `cwd` and
 * inherits like one: measured, an empty string resolves to the
 * PROCESS's own cwd rather than to nowhere, and a relative root
 * resolves against that same cwd. So a build launched from inside
 * this checkout stamps the repository's own commit for an empty
 * root, where the three roots just named all answer with the
 * no-commit tag. Nothing throws either way, which is both the
 * point and the cost: the one input this function cannot report
 * is a root that reads as absent but resolves to a real checkout.
 * A later caller treating the stamp as evidence that there is no
 * checkout to be found therefore cannot hand it a possibly-empty
 * string.
 *
 * The swallow that buys it is confined to {@link gitOutput}, and
 * it is not the silent kind the package's error rule refuses: the
 * failure IS the value, and the value is printed where a reader
 * looks for it. `dev` is no more a commit than a blank line is a
 * sentence. Two things it does not buy, both worth knowing before
 * leaning on a stamp. It does not say which of the three states
 * produced it — the distinction is gone by the time the string
 * comes back, and no caller can ask afterwards. And it refuses
 * nothing, which is where `assertCleanTree` in
 * `deploy-external.ts` came from: it stops a deploy on a dirty
 * TREE rather than on the label this produced, and it parts the
 * two states this folds together, since a tree with uncommitted
 * work in it and a tree git could not be asked about want
 * different things done. That refusal is the whole of what this
 * one does not do.
 *
 * This is also the one value in the build permitted to move with
 * anything but the sources, which is the second half of why a
 * label is worth this much prose. Everything else an artifact is
 * made of is fixed by the tree: the workflow sources, the
 * libraries their markers inline, and `ENV_DEFAULTS` in this
 * package's own source. Nothing reads a clock, nothing is
 * randomized, and settings resolve from that table rather than
 * from an ambient environment unless a caller opts in —
 * {@link runBuildCli}'s `--external` build is the one that does,
 * and it writes to a sibling directory rather than to
 * `workflows/dist/`. So two runs over one unchanged tree write
 * byte-identical files, and this is the single value that could
 * say otherwise.
 *
 * Identical within one tree, different across commits, and both
 * halves want reading exactly. The stamp is keyed to the state of
 * the repository rather than to what the build read, so an edit to
 * a file no build ever opens flips the suffix: standing still
 * means the tree, not the sources. Across commits it moves whether
 * or not anything the build reads moved with it, which is what
 * makes one artifact distinguishable from another at all. The
 * direction that does NOT hold is the one an operator is likeliest
 * to want: `-dirty` is one text for every uncommitted state, so
 * two artifacts built from two different trees at one commit carry
 * the same stamp while differing in content. It says an artifact
 * is unaccounted for, never what is in it.
 *
 * Which is why the obvious stamp is the wrong one. A build
 * timestamp or a generated id reads just as usefully on a canvas
 * and moves on every run, and with `workflows/dist/` gitignored
 * there is no committed artifact to rebuild and diff — a
 * comparison between two builds of one tree is the whole of what
 * says this build is deterministic, and a per-run stamp would
 * leave that comparison with nothing to assert.
 *
 * @param root - A directory inside the checkout to ask git from,
 *   resolved as a `cwd` and so never safely empty or relative.
 * @returns The short commit, that commit with `-dirty` behind it,
 *   or {@link NO_COMMIT_BUILD_TAG}.
 */
export function gitBuildTag(root: string): string {
  const commit = gitOutput(root, ['rev-parse', '--short', 'HEAD']);

  if (commit === null || commit === '') {
    return NO_COMMIT_BUILD_TAG;
  }

  return gitStatusPorcelain(root) === ''
    ? commit
    : `${commit}-dirty`;
}

/**
 * The indentation every built artifact is written at.
 *
 * Fixed here rather than read off the source it was built from,
 * so how an artifact is shaped is a property of the build and not
 * of whoever hand-wrote the file that produced it. Two builds of
 * two differently-formatted sources come back formatted alike,
 * which is what lets a comparison between two artifacts be about
 * their content.
 *
 * Indented at all because a generated file is still READ. Every
 * refusal on this path names a form and leaves a `git grep` to
 * turn it back into a site, an instance rejecting an import names
 * a node, and the determinism check is a comparison between two
 * files. One line of JSON answers none of those legibly.
 */
const ARTIFACT_INDENT = 2;

/**
 * Refuse an artifact whose text still carries marker text.
 *
 * Read over the serialized bytes rather than over the value they
 * came from, and that is the only vantage from which the three
 * ways a marker gets this far are visible at once —
 * {@link SurvivingMarkerError} carries the roster and what each
 * one costs. A second walk over the value would see what
 * {@link resolveMarkers} already saw, which is markers in object
 * values and nothing else.
 *
 * Roster order decides which form is named when an artifact
 * carries more than one, and it is {@link SURVIVING_MARKER_FORMS}
 * that settles that order rather than this loop.
 *
 * @param serialized - The artifact as it would be written.
 * @throws SurvivingMarkerError When the text carries a marker
 *   form, naming the first of them in roster order.
 */
function assertNoSurvivingMarker(serialized: string): void {
  for (const form of SURVIVING_MARKER_FORMS) {
    if (serialized.includes(form)) {
      throw new SurvivingMarkerError(form);
    }
  }
}

/**
 * Build one workflow artifact out of one workflow source.
 *
 * Parse the source, resolve every marker it carries, serialize
 * what comes back, and refuse it if marker text survived. That is
 * the whole transform from a file under `workflows/src/` to the
 * file of the same name under `workflows/dist/`, minus the
 * directory listing, the read and the write — which belong to
 * {@link buildAll}, the directory build one level up.
 *
 * Text in and text out, which is a decision rather than a
 * convenience. The survival check has to read the artifact as it
 * will be written, and that text does not exist until something
 * serializes it. Taking a parsed value would leave serializing to
 * the caller and make the check a step a caller could skip;
 * handing a parsed value back would put the same choice at the
 * other end. Doing both here is what makes the bytes that were
 * checked and the bytes that get written the same bytes.
 *
 * The trailing newline is appended unconditionally, so the
 * artifact is a text file by the ordinary convention — a last
 * line that ends, and a line-oriented reader that sees it whole.
 * Unconditional matters as much as present: a newline added only
 * when one was missing would be a second thing two builds could
 * differ over.
 *
 * Nothing here reads a clock, a counter or an ambient
 * environment, so one source text and one set of options produce
 * one artifact, byte for byte. Member order comes from the parse
 * and from the rebuild {@link resolveMarkers} walks with, both
 * functions of the input alone, and the indent is
 * {@link ARTIFACT_INDENT} rather than anything read off the
 * source. This is where that fixity gets spent:
 * {@link gitBuildTag} argues why a label is the only value
 * allowed to move and why a per-run one would be wrong, and this
 * is the function whose output the comparison it describes
 * compares.
 *
 * Both of its refusals reach a caller as they were raised. A
 * source that is not JSON comes back as whatever `JSON.parse`
 * throws, and every refusal the marker pass carries — a retired
 * form, a path outside the library directory, a setting no source
 * answers for, a library a Code node could not run — comes back
 * as the class {@link resolveMarkers} documents.
 *
 * What none of them can name is the FILE. This is handed text and
 * has no name to give, so a `SyntaxError` about position 412
 * belongs to whichever source the caller opened, and it is the
 * caller that holds it. The same is true of the marker refusals,
 * which say so from their own end.
 *
 * The check runs last, over the value that is about to be
 * returned, which makes it a contract on the return rather than a
 * step in the middle: nothing this function hands back carries
 * marker text. Nothing downstream looks again.
 *
 * @param templateJson - One workflow source, as it was read.
 * @param options - The loader every library marker is resolved
 *   through, and the chain every setting marker is resolved
 *   against. The marker pass's own options, unwidened, because
 *   this adds nothing to them and a second type would be a copy
 *   to keep in step.
 * @returns The artifact: the resolved source, indented, with a
 *   trailing newline.
 * @throws SurvivingMarkerError When marker text survived into the
 *   serialized artifact.
 */
export function buildTemplate(
  templateJson: string,
  options: ResolveMarkersOptions,
): string {
  const resolved = resolveMarkers(JSON.parse(templateJson), options);
  const serialized = `${JSON.stringify(resolved, null, ARTIFACT_INDENT)}\n`;

  assertNoSurvivingMarker(serialized);

  return serialized;
}

/**
 * Where a build reads its sources from and writes its artifacts
 * to, alongside how it resolves the markers it finds in between.
 *
 * The marker pass's own options with two directories added, so
 * everything {@link buildTemplate} is handed per file arrives
 * here once for the whole tree.
 */
export interface BuildAllOptions extends ResolveMarkersOptions {
  /**
   * The directory `*.json` workflow sources are read out of,
   * `workflows/src/` in a real build.
   */
  readonly sourceDir: string;

  /**
   * The directory one artifact per source is written into,
   * `workflows/dist/` in a real build and
   * `workflows/dist-external/` in the `--external` deploy build.
   */
  readonly outDir: string;
}

/**
 * Build every workflow source under one directory.
 *
 * The whole of what a build does to a tree: read every `*.json`
 * in `sourceDir`, put each through {@link buildTemplate}, and
 * write what comes back into `outDir` under the same file name.
 *
 * Sorted, for the reason `tests/invariants/naming-patterns.ts`
 * gives for its own walk: `readdirSync` answers in directory
 * order, stable on one machine and arbitrary across them, so an
 * unsorted list would leave the names this returns — and any
 * report built from them — differing between machines that hold
 * identical trees.
 *
 * The top level only. A workflow source is a file directly under
 * `workflows/src/`, so a directory found beside one is passed
 * over rather than descended into, and `*.json` rather than
 * everything is what lets the `README.md` carrying the workflow
 * roster sit with the sources it describes.
 *
 * A `sourceDir` that is not there at all is nothing to build, and
 * comes back as an empty list. Anything else that cannot be
 * listed arrives as `readdirSync` raised it — a path naming a
 * file rather than a directory is `ENOTDIR`, and names that path.
 *
 * That is the reverse of the split the sibling reader in
 * `tests/invariants/schema-sql.ts` makes, and the difference is
 * the job rather than the idiom. That reader folds absent,
 * not-a-directory and empty into one refusal, because a suite
 * asserting over no migrations passes by finding nothing, so an
 * empty result is the thing it exists to refuse. A build has no
 * such stake: nothing to build is an ordinary state of a tree,
 * and it was this package's own state until `ar-dispatch` landed
 * in `workflows/src/`.
 *
 * Nothing to build has two shapes and one answer — a `sourceDir`
 * that is absent, and one that is there holding no `*.json`. Both
 * come back as an empty list, and both stop before `outDir` is
 * touched, so a build that finds nothing leaves the disk as it
 * was rather than an empty directory behind it.
 *
 * What the empty answer costs is that a wrong path and an empty
 * tree read alike. `sourceDir` is a path like any other: a
 * relative one resolves against the process's cwd, and an empty
 * string reads as absent rather than as that cwd, so a caller
 * that assembled the path wrongly is told nothing was built and
 * not that nothing was found. Folding the unlistable cases in too
 * would widen that silence to a `sourceDir` naming a file, which
 * `ENOTDIR` names outright — leaving them raised keeps the one
 * case that says which edit fixes it. What stands behind the
 * silence is not this function: the reader over `workflows/dist/`
 * arriving later in this phase refuses a directory holding no
 * workflow, which is where a build of nothing surfaces. Nothing
 * sweeping `outDir` leaves that backstop a hole — an artifact an
 * earlier run wrote satisfies it on behalf of a run that wrote
 * nothing.
 *
 * Every artifact is built before any is written, so a source the
 * marker pass refuses leaves `outDir` as it stands rather than
 * half of this run's output over half of the last one's. Nothing
 * downstream could tell that mixture from a clean build: what
 * reads the directory sees file names, never the run that put
 * them there.
 *
 * `outDir` is created, parents and all, once there is something
 * to write. Both it and its deploy sibling are gitignored, so a
 * fresh clone has neither, and a build requiring one to exist
 * already would fail on every first checkout.
 *
 * Nothing is swept. An artifact whose source has since been
 * renamed or deleted is written over by nothing and removed by
 * nothing, so it stays where it is and reads to everything
 * downstream as a built workflow. `workflows/src/` is the whole
 * input to a build; it is not the whole of what a reader of
 * `outDir` finds.
 *
 * Every refusal reaches a caller as {@link buildTemplate} raised
 * it, with the file name left off. This function holds that name
 * and does not attach it: wrapping would put a build error in
 * front of the class each case pins — a retired form, a path
 * outside the library directory, a setting no source answers for,
 * a marker that survived. What a `SyntaxError` about position 412
 * costs instead is a `git grep` across `sourceDir`, which is the
 * recovery every refusal on this path already documents.
 *
 * Both directories are parameters, and this function names no
 * default for either. `workflows/src/` and `workflows/dist/`
 * reach it from {@link runBuildCli}, and nothing here knows those
 * paths.
 *
 * That is what lets a case drive a real build over a fixture
 * tree — a source directory under `mkdtempSync`, an output
 * directory beside it — and reach the half of a build no injected
 * dependency does. {@link buildTemplate}'s loader and settings
 * chain already put the transform within reach of a test; the
 * listing, the sort, the per-file read, the mkdir, the writes and
 * the sweeping that does not happen are reachable only by moving
 * the tree. Moving it is also what keeps such a case off the tree
 * the rest of the suite reads: pointed at the real pair it would
 * rebuild `workflows/dist/` underneath every check over it, and
 * with a stand-in loader it would rebuild it into something no
 * build produces. The same parameter carries the determinism
 * check, which has nowhere else to stand — `workflows/dist/` is
 * gitignored, so no committed artifact exists to rebuild and diff
 * against, and two builds of one tree into two temporary output
 * directories is what is left of the comparison.
 *
 * A parameter moves the tree, not the process. The library splice
 * still reaches for a transpiler that exists only inside a bun
 * process, so a case running in-process drives this with a
 * stand-in loader and one that must exercise the real transpiler
 * spawns this file instead. A fixture tree also says nothing
 * about which tree a real build reads: the two paths that make it
 * the real build are the launcher's to get right, and no case
 * over a temporary directory ever sees them.
 *
 * @param options - Where to read, where to write, and how to
 *   resolve the markers in between.
 * @returns The file names written, sorted, one per source built.
 */
export function buildAll(options: BuildAllOptions): readonly string[] {
  const { sourceDir, outDir } = options;

  if (statSync(sourceDir, { throwIfNoEntry: false }) === undefined) {
    return [];
  }

  const artifacts = readdirSync(sourceDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right))
    .map((file) => ({
      file,
      text: buildTemplate(readFileSync(join(sourceDir, file), 'utf8'), options),
    }));

  if (artifacts.length === 0) {
    return [];
  }

  mkdirSync(outDir, { recursive: true });

  for (const { file, text } of artifacts) {
    writeFileSync(join(outDir, file), text);
  }

  return artifacts.map((artifact) => artifact.file);
}

/**
 * This package's own root, resolved from this file's location
 * rather than from the working directory.
 *
 * Every path below hangs off it. One built from the working
 * directory would name this tree only while the process was
 * started from the package, and `scripts/seed.ts` resolves the
 * seed directory it ships the same way for the same reason.
 *
 * Absolute is also what {@link gitBuildTag} needs of a root: the
 * argument is handed over as a `cwd`, so an empty or relative one
 * answers about whatever checkout the process happened to start
 * in rather than about this one.
 */
const PACKAGE_ROOT = fileURLToPath(new URL('..', import.meta.url));

/**
 * Where every build reads its workflow sources from.
 *
 * One directory for both builds: what a build READS is the same
 * tree either way, and `--external` moves only where artifacts
 * land and what their settings resolve against.
 *
 * Exported for a second reader that is not a build at all.
 * `audit-workflows.ts` reads the display name out of every source
 * here to know what an instance is supposed to be holding, and
 * `ExpectedNamesOptions.sourceDir` over there states the property
 * that makes importing this the only correct way to hand it over:
 * an expectation read out of some other tree is still a list of
 * names and still answers with a verdict, so nothing downstream
 * can tell it from a verdict about this repository. Two spellings
 * of one path drift silently, and this is a path where the drift
 * would surface as an instance being told it is wrong.
 */
export const WORKFLOW_SOURCE_DIR = join(PACKAGE_ROOT, 'workflows', 'src');

/**
 * Where the default build writes, and the directory every check
 * over built output reads.
 */
const WORKFLOW_DIST_DIR = join(PACKAGE_ROOT, 'workflows', 'dist');

/**
 * Where the `--external` build writes.
 *
 * A separate directory rather than a flag on the same one, so an
 * artifact that absorbed an environment and one that could not
 * are never the same file. Both are gitignored.
 *
 * Exported because {@link runBuildCli} answers with file names
 * and not with the directory it wrote them into, so the command
 * that uploads those files has to be told where they are. Told by
 * importing this rather than by resolving
 * `workflows/dist-external/` a second time: two spellings of one
 * path drift silently, and what a stale one finds is not nothing
 * but the artifacts an earlier run left there, this build
 * sweeping nothing on its way through.
 */
export const WORKFLOW_EXTERNAL_DIST_DIR = join(
  PACKAGE_ROOT,
  'workflows',
  'dist-external',
);

/**
 * The directory a `__INLINE:<path>__` marker names a library
 * inside.
 *
 * `src/lib/` is this package's pipeline half, and it holds its
 * first library, `schedule.ts`. `ar-dispatch` names it: the
 * `Plan Dispatch` Code node's body opens with
 * `__INLINE:schedule.ts__`, so a build over this package's own
 * tree opens this directory and splices that library into the
 * artifact it writes.
 */
const LIB_DIR = join(PACKAGE_ROOT, 'src', 'lib');

/**
 * The `.env` the `--external` build reads settings from, and the
 * default build names not at all.
 */
const ENV_FILE = join(PACKAGE_ROOT, '.env');

/**
 * The argument that asks for the deploy build.
 *
 * Exported for the reason the directory above is.
 * `scripts/deploy-external.ts` reaches this build by handing
 * {@link runBuildCli} an argv of its own, and a second spelling
 * of the flag would quietly ask for the DEFAULT build — which
 * writes into the other directory, leaving the deploy to read
 * whatever an earlier external build left in this one.
 */
export const EXTERNAL_FLAG = '--external';

/**
 * The setting the build stamp resolves through.
 *
 * Named here because the build both SUPPLIES it and reads it back
 * — supplies the checkout's own answer behind every other source,
 * and reads what the chain made of that to report the stamp the
 * artifacts actually carry.
 */
const BUILD_TAG_SETTING = 'AR_BUILD_TAG';

/**
 * Everything `--external` moves, gathered so that it moves
 * together.
 *
 * The output directory and the settings sources are one decision
 * rather than two. A build resolving an operator's environment
 * into `workflows/dist/` is what the opt-in settings chain exists
 * to prevent, and a build writing defaults into
 * `workflows/dist-external/` is a deploy artifact carrying
 * placeholders — putting the pair in one value is what leaves no
 * way to ask for half of it.
 */
interface BuildTarget {
  /** The directory this build's artifacts are written into. */
  readonly outDir: string;

  /**
   * The sources this build resolves settings against, above the
   * defaults table every build stands on.
   */
  readonly settings: EnvSourceOptions;

  /**
   * How the line the build prints names those sources, so which
   * of the two resolutions ran is read rather than inferred from
   * the output directory.
   */
  readonly settingsOrigin: string;
}

/**
 * Pick where a build writes and what it resolves settings
 * against.
 *
 * @param external - Whether the command line carried
 *   {@link EXTERNAL_FLAG}.
 * @returns The target that flag selects.
 */
function buildTarget(external: boolean): BuildTarget {
  return external
    ? {
      outDir: WORKFLOW_EXTERNAL_DIST_DIR,
      settings: { env: process.env, envFile: ENV_FILE },
      settingsOrigin: `the environment and ${ENV_FILE}`,
    }
    : {
      outDir: WORKFLOW_DIST_DIR,
      settings: {},
      settingsOrigin: 'ENV_DEFAULTS alone',
    };
}

/**
 * One build end to end: pick the target, build every source
 * under `workflows/src/`, and report what was written.
 *
 * This is where the directories {@link buildAll} takes as
 * parameters get their real values, and the only place in the
 * build that names them.
 *
 * The stamp is resolved once per build and put in front of
 * `ENV_DEFAULTS` rather than in front of the whole chain, so
 * `AR_BUILD_TAG` keeps the precedence every other setting has:
 * the table's own entry is the fallback for a caller supplying no
 * stamp, this supplies the one the checkout answers with, and an
 * operator's environment still overrides it in a deploy build.
 *
 * Which is why the stamp is reported by reading it back OUT of
 * the chain rather than by printing what git answered. The two
 * part company exactly where the override happens, and a line
 * naming a commit the artifacts do not carry would be worse than
 * no line at all.
 *
 * A transpiler is constructed whether or not the tree holds a
 * source to splice, so a build launched under the wrong runtime
 * says so rather than reporting that there was nothing to do.
 *
 * Every other refusal reaches a caller as {@link buildAll} raised
 * it, unwrapped and naming no file. {@link BUILD_REFUSALS} is the
 * roster the block below reports as a message rather than as a
 * stack.
 *
 * @param argv - The arguments after the script name. Defaults to
 *   `process.argv.slice(2)`, which is what a launcher leaves; a
 *   caller passing its own is what makes the deploy build
 *   reachable without a command line.
 * @returns The file names written, sorted, one per source built.
 * @throws TranspilerUnavailableError When the process running the
 *   build is not one bun launched.
 */
export function runBuildCli(
  argv: readonly string[] = process.argv.slice(2),
): readonly string[] {
  const target = buildTarget(argv.includes(EXTERNAL_FLAG));
  const sources = envSources({
    ...target.settings,
    envDefaults: {
      ...ENV_DEFAULTS,
      [BUILD_TAG_SETTING]: gitBuildTag(PACKAGE_ROOT),
    },
  });
  const built = buildAll({
    sourceDir: WORKFLOW_SOURCE_DIR,
    outDir: target.outDir,
    loadLib: loadLib(LIB_DIR, bunTranspiler()),
    sources,
  });

  for (const file of built) {
    console.log(`built ${join(target.outDir, file)}`);
  }

  console.log(
    built.length === 0
      ? `nothing to build: no workflow source in ${WORKFLOW_SOURCE_DIR}`
      : `${built.length} built, stamped ${resolveEnvVar(BUILD_TAG_SETTING, sources)}`
        + `, settings from ${target.settingsOrigin}`,
  );

  return built;
}

/**
 * Every refusal a build raises on purpose.
 *
 * A roster rather than a chain of `instanceof` tests, because the
 * set is what matters and it spans two modules: the launcher
 * refusal is declared here and the marker refusals next door.
 * Each is a report an operator acts on, which is what separates
 * them from a `SyntaxError` out of `JSON.parse` or an `ENOENT`
 * out of a read — those are unexpected here, and a stack is what
 * a reader needs of them.
 */
const BUILD_REFUSALS = [
  MarkerPathError,
  RetiredMarkerError,
  SpliceableLibError,
  SurvivingMarkerError,
  TranspilerUnavailableError,
  UnresolvedSettingError,
];

/**
 * Whether a caught value is one of the build's own refusals.
 *
 * Exported so a command that RUNS a build reports what the build
 * refused the way this file's own command line does. One
 * predicate over one roster rather than a copy per caller: a
 * refusal added to {@link BUILD_REFUSALS} reaches every command
 * composing this, where a copy would go on printing that one as a
 * stack.
 *
 * @param cause - What the build threw.
 * @returns Whether its message is the whole report.
 */
export function isBuildRefusal(cause: unknown): cause is Error {
  return BUILD_REFUSALS.some((refusal) => cause instanceof refusal);
}

/**
 * Whether this file is what the process was started with, rather
 * than something another module imported.
 *
 * `import.meta.url` is a `file:` URL where `process.argv[1]` is a
 * path, so comparing the two as they come is false however the
 * process was started, and the block below would silently never
 * run. `fileURLToPath` is what makes the comparison able to hold
 * at all. `scripts/seed.ts`, `scripts/approve.ts` and
 * `scripts/deploy-external.ts` carry the same guard.
 *
 * Worth asking because this module is both a command and a
 * library: `bun scripts/build-workflows.ts` writes a dist, while
 * a test importing {@link buildAll} or {@link buildTemplate} gets
 * the exports and no build.
 *
 * What holds that pair together is a LOCATION rule, and it is the
 * half a reader is likeliest to tidy away: the guard has to stay
 * in the file that command names. `import.meta.url` is lexical to
 * the module it is written in, so a guard moved into a shared
 * helper compares that HELPER's path against `process.argv[1]`
 * and answers false in every process — measured, as an exported
 * const and as a function alike. The one extraction that survives
 * is a helper taking `import.meta.url` as an ARGUMENT, evaluated
 * at the call site. This package took four copies of two lines
 * instead, here and in the three scripts named above.
 *
 * Worth a paragraph because moving it fails silently, and lands
 * on the same observable the unconverted comparison above does —
 * two wrong forms, one outcome, and only one of them looks like a
 * mistake. Measured: a run whose guard never holds prints nothing
 * and exits 0, which is exactly what importing this module by
 * path does, while a build over an empty source tree prints one
 * line saying so. Nothing downstream parts them either — the
 * un-run build writes no artifact, `workflows/dist/` is
 * gitignored, and so there is no diff for one to go missing from.
 * The tell is the absence of every line, not an error.
 *
 * The rule is written up in
 * `~/.claude/skills/esm-dual-purpose-cli-module/SKILL.md`, a
 * user-level skill rather than one vendored under `.claude/`
 * here, which is why the argument is carried above rather than
 * left to the link.
 */
const INVOKED_AS_CLI = process.argv[1] !== undefined
  && fileURLToPath(import.meta.url) === process.argv[1];

if (INVOKED_AS_CLI) {
  try {
    runBuildCli();
  } catch (cause) {
    // Each of the build's own refusals is already a report — the
    // form, the path or the setting that failed, and which edit
    // fixes it — so a stack above it buries the thing worth
    // reading. Anything else is unexpected, and there the stack
    // is what a reader needs.
    process.exitCode = 1;
    console.error(
      isBuildRefusal(cause)
        ? cause.message
        : cause,
    );
  }
}
