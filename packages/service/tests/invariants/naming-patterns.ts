/**
 * @packageDocumentation
 * Scan surface and needle set for the naming invariant — which paths
 * under `packages/service` the invariant reads, which it never opens,
 * and which names it refuses to find in them.
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
 *
 * The needles are assembled from fragments rather than written out, so
 * this file does not itself contain the strings it exists to reject.
 */

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

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
 * vendored, `dist` and `dist-external` are built from `workflows/src` and
 * from the `src/lib/` libraries spliced into it, `.tmp` and `.docs` are
 * generated, and `.exports` holds rendered research artifacts
 * (gitignored, so its contents never reach the remote). A hit inside any
 * of them is either a duplicate of one the scan already reports at the
 * authored source, or noise out of minified, hashed, or bundled content —
 * and neither is fixable by editing the file it was found in.
 */
export const EXCLUDED_DIRS: readonly string[] = [
  'node_modules',
  '.tmp',
  'dist',
  'dist-external',
  '.docs',
  '.exports',
];

/**
 * Thrown when a declared scan root contributes no files to the walk.
 *
 * The failure this catches is a quiet one. A root that is renamed,
 * mistyped, or emptied simply stops contributing files; the scan keeps
 * returning a clean result over whatever remains, and nothing in that
 * result says coverage shrank. A green run over half the surface reads
 * exactly like a green run over all of it, so the walk refuses to
 * produce one.
 *
 * A distinct class rather than a bare `Error` so the test covering this
 * path can pin the failure to this cause specifically. A missing
 * directory, an unreadable entry, and a permission refusal all reach a
 * caller as `Error` too, and an assertion that accepted any of them
 * would pass for the wrong reason.
 */
export class EmptyScanRootError extends Error {
  /**
   * The {@link SCAN_ROOTS} entry that resolved to nothing, exactly as
   * that list declares it.
   */
  readonly root: string;

  /**
   * @param root - The {@link SCAN_ROOTS} entry that resolved to nothing.
   * @param packageRoot - Directory the entry was resolved against,
   * carried into the message because the same entry is populated or
   * empty depending on which tree the walk was pointed at.
   */
  constructor(root: string, packageRoot: string) {
    super(
      `Scan root '${root}' resolved to no files under ${packageRoot}. ` +
      'A declared root that contributes nothing shrinks the naming ' +
      'invariant to the files that remain, without saying so: either ' +
      'the root moved and SCAN_ROOTS needs updating, or the walk was ' +
      'pointed at the wrong tree.',
    );
    this.name = this.constructor.name;
    this.root = root;
  }
}

/**
 * Files beneath one directory, relative to the package root.
 *
 * Recursive, pruning {@link EXCLUDED_DIRS} by base name at every level
 * rather than by path, so a nested build directory is dropped as
 * readily as a top-level one.
 *
 * Regular files only: a symlink is skipped rather than followed, since
 * following one either re-walks a tree already covered or leaves the
 * package altogether, and neither yields a file a name can be fixed in.
 *
 * Entries are sorted by name at each level, because `readdirSync`
 * returns directory order — stable on one machine, arbitrary across
 * them. Sorting makes the file list, and any failure report built from
 * it, identical everywhere.
 *
 * Paths are built with a literal `/` rather than `join`, so what comes
 * back is package-relative and slash-separated whatever the platform:
 * the form a failure message prints and a caller matches against a
 * root name.
 */
function walkDirectory(
  packageRoot: string,
  relativeDir: string,
): readonly string[] {
  const entries = readdirSync(join(packageRoot, relativeDir), {
    withFileTypes: true,
  });

  return [...entries]
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const relativePath = `${relativeDir}/${entry.name}`;

      if (entry.isDirectory()) {
        return EXCLUDED_DIRS.includes(entry.name)
          ? []
          : walkDirectory(packageRoot, relativePath);
      }

      return entry.isFile()
        ? [relativePath]
        : [];
    });
}

/**
 * Every file the naming invariant reads, relative to `packageRoot`.
 *
 * Walks {@link SCAN_ROOTS} in declaration order, pruning
 * {@link EXCLUDED_DIRS} as it goes, then appends {@link SCAN_FILES}.
 * The result is package-relative, so a caller joins it back onto
 * `packageRoot` to read a file and prints it as-is to name one.
 *
 * Throws {@link EmptyScanRootError} as soon as a declared root
 * contributes nothing. A root that is absent, or that is not a
 * directory at all, takes that same path rather than surfacing as a
 * filesystem error from inside the walk: both mean the declared surface
 * and the tree disagree, which is one fact worth reporting once.
 *
 * {@link SCAN_FILES} is appended unguarded, deliberately. A declared
 * file that has gone missing cannot quietly shrink coverage the way an
 * empty root can, because every path returned here is opened by the
 * caller, and a missing one fails there naming itself.
 */
export function collectScannedFiles(
  packageRoot: string,
): readonly string[] {
  const walked = SCAN_ROOTS.flatMap((root) => {
    const stats = statSync(join(packageRoot, root), {
      throwIfNoEntry: false,
    });
    const files = stats !== undefined && stats.isDirectory()
      ? walkDirectory(packageRoot, root)
      : [];

    if (files.length === 0) {
      throw new EmptyScanRootError(root, packageRoot);
    }

    return files;
  });

  return [...walked, ...SCAN_FILES];
}

/**
 * Fragments the needles are assembled from.
 *
 * Each banned name is split across an array join so that none of them
 * appears contiguously in this file — the same technique
 * `packages/ui/eslint.config.mjs` uses for its banned import scopes.
 * Every phase of this port closes with a repo-wide `git grep` for these
 * names over tracked files, and a scanner that spelled its own needles
 * out would be the one guaranteed hit: the only way to keep that grep
 * clean would then be to delete the test.
 *
 * None of the fragments carries a regex metacharacter, so each joins
 * into pattern source unescaped. The one piece of regex syntax in the
 * table below is the lookbehind on the first entry.
 */
const ORIGIN_PREFIX = ['o', 'f', 'w'].join('');
const ORIGIN_PROJECT = ['open', 'for', 'work'].join('-');
const ORIGIN_HOST = ['bife', 'mecanico'].join('');
const VAULT_URI = ['obsidian', '://'].join('');
const VAULT_PATH = ['/', 'vault', '/'].join('');

/** One forbidden name, as the scan stores it. */
export interface ForbiddenPattern {
  /**
   * Stable identifier, reported in the failure message and used by the
   * matcher tests to pair each entry with its planted sample. Carries no
   * part of the name it stands for, so it stays printable in tracked
   * output and in CI logs.
   */
  readonly id: string;
  /**
   * Why the name is banned, phrased by reference rather than by example.
   * Spelling the literal out here would put it back into a tracked file
   * and make the entry match itself.
   */
  readonly description: string;
  /**
   * Regex source, not a `RegExp`. The matcher compiles a fresh instance
   * per call: matching is global, and a shared global instance carries
   * `lastIndex` from one file into the next, which surfaces as a scan
   * that alternately passes and fails on unchanged input.
   */
  readonly source: string;
}

/**
 * The names no scanned file may contain.
 *
 * Two categories, five entries. The origin project supplies three — an
 * identifier prefix, a repository name, a deployment hostname — and one
 * contributor's local note store supplies two, a path segment and a URI
 * scheme. A hit in either category means a file carries a name that
 * belongs to where the code came from rather than to what it does.
 *
 * Kept narrow on purpose. Three of these names have legitimate
 * near-neighbours in this repository or in ordinary English, and a
 * needle that also flags those is a needle somebody eventually deletes.
 */
export const FORBIDDEN_PATTERNS: readonly ForbiddenPattern[] = [
  // The lookbehind is what makes this entry usable. Matching the bare
  // letters is a false-positive generator with two proven sources:
  // camelCase compounds (`poolOfWorkers`, `numberOfWorkers`, `endOfWeek`)
  // and base64 noise, where a case-insensitive sweep of the repo lockfile
  // returns six hits, all inside `sha512-` integrity strings. Requiring a
  // non-alphanumeric character in front costs none of the real forms:
  // each is preceded by an underscore, hyphen, slash, quote, whitespace,
  // or the start of a line.
  {
    id: 'origin-prefix',
    description:
      'Short abbreviation of the origin project, used there to prefix ' +
      'environment variables, table names, and workflow identifiers.',
    source: `(?<![A-Za-z0-9])${ORIGIN_PREFIX}`,
  },
  {
    id: 'origin-project',
    description:
      'Repository name of the origin project. Apache-2.0 §4(d) requires ' +
      'it as attribution in the repo-root NOTICE, which is why that file ' +
      'sits outside the scan surface rather than being exempted here.',
    source: ORIGIN_PROJECT,
  },
  // Matched on the domain label alone, without a TLD, so subdomain and
  // alternate-TLD forms fall to the same entry — and so this check is
  // never weaker than the repo-wide close-out grep, which uses the same
  // bare label. The label is distinctive enough that widening it this
  // far costs no precision.
  {
    id: 'origin-host',
    description:
      'Hostname the origin deployment ran under. Tracked examples name ' +
      'localhost, a compose service, or a documented placeholder — never ' +
      'a real host, which would be a naming leak and a live target both.',
    source: ORIGIN_HOST,
  },
  // Carries its scheme separator rather than matching the application
  // name alone: `obsidian_md` is a legitimate `ExportFormat` member in
  // `src/exports/index.ts`, and phase 6 adds a renderer module named
  // after it. A bare-name needle would flag the port's own export format
  // on the day it lands.
  {
    id: 'vault-uri',
    description:
      'Desktop URI scheme of the note application the origin wrote its ' +
      'output into. A link built on it resolves on one machine only.',
    source: VAULT_URI,
  },
  // Slash-delimited so the needle is a path segment rather than a word.
  // `vaulted` and a column named `vault_id` are ordinary English and
  // ordinary schema tokens; neither hard-codes anybody's directory layout.
  {
    id: 'vault-path',
    description:
      'Path segment naming a personal note store. Reaching a scanned ' +
      'file, it pins shared code to the directory layout of one machine.',
    source: VAULT_PATH,
  },
];

/** One occurrence of a forbidden name, as the scan reports it. */
export interface ForbiddenMatch {
  /**
   * `id` of the {@link FORBIDDEN_PATTERNS} entry that matched. A failure
   * report is built from this rather than from the text that matched:
   * assertion messages reach CI logs and terminal scrollback, and
   * echoing the name there would seed a fresh copy of it in the one
   * place nobody can go and fix.
   */
  readonly patternId: string;
  /**
   * Where the content came from, exactly as the caller named it. The
   * matcher never opens a file, so this is carried rather than derived
   * — its only job is to let a caller scanning many files say which one
   * a hit belongs to.
   */
  readonly filePath: string;
  /**
   * 1-based, so the pair `<file>:<line>` means the same thing here as in
   * an editor, a stack trace, or `grep -n` output.
   */
  readonly lineNumber: number;
  /**
   * The offending line, verbatim and untrimmed. Not part of the failure
   * message for the reason given on `patternId`; it is here so a caller
   * that has already found a hit can show it locally without re-reading
   * the file.
   */
  readonly line: string;
}

/**
 * Every forbidden name in one file's content, one record per hit.
 *
 * Takes content rather than a path, which is the seam that makes the
 * needles testable: planted samples and false-positive controls can be
 * assembled in memory and passed straight in, with no fixture file that
 * would itself have to carry the banned strings.
 *
 * One record per hit, not per line or per file. A line naming two
 * forbidden things is two findings, and a report that collapsed them
 * would quietly let the second survive the fix for the first.
 *
 * Matching is case-insensitive. The origin prefix appears upper-cased in
 * environment variables and lower-cased in identifiers and paths, and
 * hostnames are case-insensitive by definition, so a case-sensitive scan
 * would be a scan somebody slips past without meaning to. Splitting into
 * lines costs the lookbehind nothing: at the start of a line there is no
 * preceding character, so it succeeds — which is the form a `.env` key
 * or a YAML key takes.
 *
 * The needles are compiled fresh on every call and never cached. They
 * match globally, and a global `RegExp` carries `lastIndex` from one use
 * to the next, so a shared instance would start each file wherever the
 * previous file left off — a scan that passes and fails alternately over
 * unchanged input. `matchAll` keeps that property inside the call too:
 * it iterates an internal clone, so the loops below cannot advance the
 * instance they were handed.
 *
 * Results come back in file order — ascending line number, and within a
 * line in the order {@link FORBIDDEN_PATTERNS} declares.
 */
export function findForbiddenMatches(
  content: string,
  filePath: string,
): readonly ForbiddenMatch[] {
  const needles = FORBIDDEN_PATTERNS.map((pattern) => ({
    patternId: pattern.id,
    needle: new RegExp(pattern.source, 'gi'),
  }));

  return content.split('\n').flatMap((line, index) => needles.flatMap(
    ({ patternId, needle }) => [...line.matchAll(needle)].map(() => ({
      patternId,
      filePath,
      lineNumber: index + 1,
      line,
    })),
  ));
}
