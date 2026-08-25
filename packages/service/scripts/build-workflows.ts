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
