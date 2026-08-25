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
 * `workflows/dist/` is generated, and a run rewrites it in full. The
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
 * file, and the same rule covers the sibling
 * `workflows/dist-external/` the deploy build writes, which arrives
 * later in this stage.
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

import type { LibLoader, LibScan } from './workflow-markers.js';

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { assertSpliceable, stripDeclarationExports } from './workflow-markers.js';

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
 * TypeScript source under `src/lib/` — a directory the first
 * library lands in later in this phase. What comes back has the
 * types erased and the export keywords still on it, which is why
 * a splice is more than a transpile — taking those off is
 * `stripDeclarationExports`, next door in `workflow-markers.ts`.
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
 * The swallow that buys it is confined to {@link gitOutput}, and
 * it is not the silent kind the package's error rule refuses: the
 * failure IS the value, and the value is printed where a reader
 * looks for it. `dev` is no more a commit than a blank line is a
 * sentence. Two things it does not buy, both worth knowing before
 * leaning on a stamp. It does not say which of the three states
 * produced it — the distinction is gone by the time the string
 * comes back, and no caller can ask afterwards. And it refuses
 * nothing: the refusal a stamp this forgiving warrants belongs to
 * the deploy path, which stops on a dirty TREE rather than on the
 * label it produced, and which arrives later in this plan.
 *
 * This is also the one value in the build permitted to move with
 * anything but the sources, which is the second half of why a
 * label is worth this much prose. Everything else an artifact is
 * made of is fixed by the tree: the workflow sources, the
 * libraries their markers inline, and `ENV_DEFAULTS` in this
 * package's own source. Nothing reads a clock, nothing is
 * randomized, and settings resolve from that table rather than
 * from an ambient environment unless a caller opts in — the deploy
 * build arriving later in this stage is the one that does, and it
 * writes to a sibling directory rather than to `workflows/dist/`.
 * So two runs over one unchanged tree write byte-identical files,
 * and this is the single value that could say otherwise.
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
 * @param root - A directory inside the checkout to ask git from.
 * @returns The short commit, that commit with `-dirty` behind it,
 *   or {@link NO_COMMIT_BUILD_TAG}.
 */
export function gitBuildTag(root: string): string {
  const commit = gitOutput(root, ['rev-parse', '--short', 'HEAD']);

  if (commit === null || commit === '') {
    return NO_COMMIT_BUILD_TAG;
  }

  return gitOutput(root, ['status', '--porcelain']) === ''
    ? commit
    : `${commit}-dirty`;
}
