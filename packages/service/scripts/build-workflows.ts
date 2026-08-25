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
