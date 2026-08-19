/**
 * @packageDocumentation
 * Scan surface for the naming invariant — which paths under
 * `packages/service` the invariant reads, and which it never opens.
 *
 * Kept apart from the assertions so the surface itself can be asserted.
 * A content check is only as strong as the set of files it was given: a
 * root that silently resolves to nothing turns a passing run into a
 * vacuous one, and nothing about the output distinguishes the two. The
 * walk therefore fails loudly on an empty root, and the invariant test
 * proves every entry below contributes at least one file before it
 * asserts anything about their contents.
 *
 * Everything named here is authored in this repository. Generated,
 * vendored, and rendered output is pruned rather than searched, because
 * none of it is a place a name can be fixed.
 */

/**
 * Directories under the package root walked recursively by the scan.
 *
 * These six are the shipped surface — application code, the framework
 * layer, workflow definitions, seed data, operator scripts, and
 * migrations. A forbidden name reaches running code, a deployed artifact,
 * or a stored row only by passing through one of them.
 *
 * Deliberately outside the scan: `docs/`, `README.md`, and `NOTICE`.
 * Those are the only places origin prose is allowed to live (umbrella
 * `AGENTS.md`), and the repo-root `NOTICE` carries an attribution line
 * that Apache-2.0 §4(d) requires be kept. Scanning them would force a
 * choice between deleting required attribution and weakening the pattern
 * set, and it would buy nothing: prose in a doc is not a name anything
 * resolves.
 *
 * `tests/` is out too, since the matcher's planted samples and
 * false-positive controls live there — every one of them a string the
 * scan exists to flag. They are assembled from parts rather than written
 * as literals, but the invariant should not have to depend on that
 * convention holding to stay green.
 */
export const SCAN_ROOTS: readonly string[] = [
  'src',
  'lib',
  'workflows',
  'data',
  'scripts',
  'drizzle',
];

/**
 * Individual files at the package root included in the scan.
 *
 * The package root is not itself a scan root: walking it would pull in
 * `README.md`, `NOTICE`, and `LICENSE`, the files the scan stays away
 * from. These two are named one by one because they are where a name
 * survives outside source — a service or volume name in the compose file,
 * an environment variable prefix in the example env — and both are copied
 * verbatim by whoever stands the stack up, so a name left in either
 * propagates to every machine that follows the README.
 */
export const SCAN_FILES: readonly string[] = [
  'docker-compose.yml',
  '.env.example',
];

/**
 * Directory names pruned wherever the walk meets them, at any depth.
 *
 * Matched by base name rather than by path, so a nested `dist` inside a
 * scan root is pruned as readily as a top-level one.
 *
 * Every entry is installed, built, or rendered output: `node_modules` is
 * vendored, `dist` and `dist-external` are built from `workflows/src`,
 * `.tmp` and `.docs` are generated, and `.exports` holds rendered
 * research artifacts (gitignored, so its contents never reach the
 * remote). A hit inside any of them is either a duplicate of one the scan
 * already reports at the authored source, or noise out of minified,
 * hashed, or bundled content — and neither is fixable by editing the file
 * it was found in.
 */
export const EXCLUDED_DIRS: readonly string[] = [
  'node_modules',
  '.tmp',
  'dist',
  'dist-external',
  '.docs',
  '.exports',
];
