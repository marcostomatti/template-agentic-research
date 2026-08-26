/**
 * @packageDocumentation
 * The built workflow tree the workflow invariants read, and the two
 * ways that read comes back holding nothing while reporting nothing
 * wrong.
 *
 * `workflows/dist/` is generated. `scripts/build-workflows.ts`
 * resolves every source under `workflows/src/` and writes one
 * artifact per source, and `pretest` runs it so the default suite
 * reads a tree built in a real bun process rather than whichever one
 * was left on disk. The directory is gitignored, so no committed
 * copy stands behind it and no diff reports a bad one. What the
 * workflow invariants assert, they assert over what this file hands
 * them and over nothing else.
 *
 * Split from the assertions for the reason `naming-patterns.ts` and
 * `schema-sql.ts` are: the input to a check is a subject in its own
 * right. Kept here it stays readable, it sits inside a file `tsc`
 * reads — which a `.test.ts` is not — and a case can assert about it
 * directly rather than a suite assuming it. The same split is what
 * lets the refusals be reached at all: a caller passing a directory
 * of its own reaches them from a fixture tree instead of by
 * emptying the package.
 *
 * Where this reader parts from those two is the direction the
 * assertions standing on it run, and that is why the refusals are
 * this file's main content: an absence assertion is worth exactly
 * what the input it was handed is worth, and nothing more. The
 * static-SQL roster is must-find, so an empty read turns every
 * constraint red at once — wrongly, but loudly. The workflow suite
 * is mostly the other kind: no send-capable node, no forbidden name,
 * no model node without a ceiling in front of it. A check of that
 * shape is satisfied by having nothing to look at, and a run handed
 * nothing prints what a run over a clean tree prints. That is the
 * naming invariant's shape, and this file answers it the same way —
 * by refusing, rather than by handing back an empty result and
 * leaving the suite to report a pass.
 *
 * The refusal is owed at two levels, and the second is one neither
 * sibling needs. A directory that is absent, is not a directory, or
 * holds no `*.json` is the first. A workflow that parses and carries
 * no node is the second: it is a real file, it is counted, and every
 * check asking whether some node type is present in it comes back
 * no. From a caller's side the two are one fact — there was nothing
 * to assert over — and one of them looks like a working tree.
 *
 * What refusing cannot reach is an input that is too long rather
 * than too short. A build writes one artifact per source and sweeps
 * nothing, so an artifact whose source has since been renamed or
 * deleted stays where it is and reads here as a built workflow;
 * `buildAll` in `scripts/build-workflows.ts` argues that hole where
 * it is made. This file can say it was handed nothing. It cannot say
 * that what it was handed is what the sources produced.
 *
 * Nothing is exported yet. The directory constant, the two refusals
 * and the walk arrive next in this stage; the assertions over the
 * real tree arrive after `ar-dispatch` does, since `workflows/src/`
 * names no workflow until then and `workflows/dist/` is therefore
 * not a directory that exists. The cases over this file drive
 * fixture trees of their own for that reason.
 */
