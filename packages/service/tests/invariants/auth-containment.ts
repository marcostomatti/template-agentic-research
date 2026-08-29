/**
 * @packageDocumentation
 * Scan surface and identifier roster for the auth hash-containment
 * invariant — which trees the scan walks, which two paths inside them
 * are allowed to name a stored hash, and which spellings it looks for
 * everywhere else.
 *
 * The rule this file supplies the parts for: across `src/` and `lib/`,
 * a password hash and a session-token hash are named under
 * `src/auth/` and in `src/db/schema/auth.ts` and nowhere else. That is
 * the register row in `docs/architecture/01-invariants.md` and the
 * claim `docs/architecture/07-auth.md` makes about the `AuthStore`
 * port, both stated as a property of the tree rather than of any one
 * module — which is what makes it checkable at all.
 *
 * Identifiers are what the roster holds, not values. A textual scan
 * cannot follow a hash into a variable named something else, and does
 * not need to: a column spreads by its name being copied, so a
 * repository that started handing whole `auth_users` rows to its
 * callers would carry the column name out with them. Such a change
 * type-checks, it lints, and the suite stays green.
 *
 * Kept apart from the assertions for the same reason the naming
 * invariant next door is. A containment check reports what it found in
 * the files it was handed and says nothing about the files it was not,
 * so a walk that has gone quiet answers exactly what a clean tree
 * does. The walk therefore refuses to produce a result at all rather
 * than return a zero it did not earn, and the test over it proves the
 * surface is populated before asserting anything about its contents.
 *
 * Unlike the de-origination needles, the four spellings below are
 * written out. They are not strings this repository is forbidden to
 * contain — two of them are column names it declares on purpose — and
 * `tests/` is not one of the trees the walk opens, so the roster sits
 * outside its own surface however it is spelled. Assembling it from
 * fragments would hide the one thing a reader of this file needs to
 * see.
 */

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Trees under the package root walked recursively by the scan.
 *
 * The two shipped source trees, and the whole of both: `src/` is the
 * application and `lib/` is the framework layer beneath it. A hash
 * name reaches running code only by passing through one of them.
 *
 * Deliberately outside the scan are three surfaces that name a hash
 * just as legitimately, and leaving them out is what keeps this a
 * check somebody will leave switched on. `drizzle/` holds the
 * generated migration and its snapshot, which spell both columns
 * because the database has them. `tests/` carries the store contract
 * and the in-memory store behind the same port, so every rule about a
 * session is exercised through a record that declares one. And
 * `docs/` argues about both columns in prose. A scan reporting any of
 * those would be narrowed or turned off inside a phase, and a
 * narrowed scan is one nobody afterwards knows the reach of.
 */
export const SCAN_ROOTS: readonly string[] = [
  'src',
  'lib',
];

/**
 * The paths inside {@link SCAN_ROOTS} the rule permits, package-relative.
 *
 * Two entries, one of each kind. `src/auth/` is a directory — the
 * module the rule is about, where a hash is minted, stored, compared
 * and revoked — and `src/db/schema/auth.ts` is a single file, the one
 * that declares the two columns. Both are matched by exact path or by
 * directory prefix, so the first prunes its whole subtree and the
 * second prunes only itself; a sibling named `src/authority` is
 * neither.
 *
 * Nothing else is pruned. There is no build output under either scan
 * root, and any further exclusion would narrow the claim without
 * saying so — the surface would shrink while the result stayed a
 * clean zero. That is the same failure the empty-root refusal below
 * exists for, arriving through a list instead of through a directory.
 *
 * An entry that goes stale is self-reporting rather than silent. If
 * either path is renamed and the code that names a hash moves with it,
 * the exclusion stops matching, the moved file enters the surface, and
 * the scan fails naming it — which is the outcome the rule wants
 * anyway, since the permitted set is exactly two paths and a third is
 * a finding whatever it is called.
 */
export const PERMITTED_PATHS: readonly string[] = [
  'src/auth',
  'src/db/schema/auth.ts',
];

/**
 * Thrown when the walk reads no files, whether for one root or at all.
 *
 * The failure this catches is the one a containment scan cannot report
 * any other way. Its passing answer is an empty list of hits, and a
 * root that has been renamed, emptied, or pointed at the wrong tree
 * produces an empty list of hits too — from a surface it never read.
 * Nothing in the result distinguishes them, so the walk declines to
 * return one.
 *
 * Both shapes are the same fact and share a class. A single root going
 * quiet shrinks the surface to whatever remains; {@link SCAN_ROOTS}
 * itself going empty removes the surface altogether. The second cannot
 * happen while the first is guarded and the list is non-empty, which
 * is precisely why it is worth a check of its own: it is what the
 * per-root guard stops covering the moment somebody edits the list.
 *
 * That also makes the second shape unreachable from a test, and
 * deliberately so — the roots are a module constant with no parameter
 * to override, because a caller able to narrow the surface is the
 * failure this module exists to report. It is a guard against a future
 * edit rather than a path the suite exercises, and nobody should go
 * looking for a fixture that reaches it.
 *
 * A distinct class rather than a bare `Error` so the tests covering
 * this path can pin the failure to this cause. A missing directory, an
 * unreadable entry, and a permission refusal all reach a caller as
 * `Error` too, and an assertion that accepted any of them would pass
 * for the wrong reason.
 */
export class EmptyScanError extends Error {
  /**
   * The {@link SCAN_ROOTS} entry that resolved to nothing, exactly as
   * that list declares it, or `null` when the list declared no roots
   * at all and there was no entry to name.
   */
  readonly root: string | null;

  /**
   * @param root - The {@link SCAN_ROOTS} entry that resolved to
   * nothing, or `null` for an empty root list.
   * @param packageRoot - Directory the entry was resolved against,
   * carried into the message because the same entry is populated or
   * empty depending on which tree the walk was pointed at.
   */
  constructor(root: string | null, packageRoot: string) {
    const subject = root === null
      ? 'The hash-containment scan declares no roots at all'
      : `Scan root '${root}' resolved to no files`;

    super(
      `${subject} under ${packageRoot}. A containment scan that read ` +
      'nothing answers exactly what a clean tree answers, so the walk ' +
      'refuses rather than report a zero it did not earn: either a ' +
      'root moved and SCAN_ROOTS needs updating, or the walk was ' +
      'pointed at the wrong tree.',
    );
    this.name = this.constructor.name;
    this.root = root;
  }
}

/**
 * Whether one package-relative path is inside the permitted set.
 *
 * Exact match or directory prefix, so a {@link PERMITTED_PATHS} entry
 * naming a file prunes that file and an entry naming a directory
 * prunes everything beneath it. The explicit separator is what keeps
 * the prefix test from reaching a sibling whose name merely starts the
 * same way.
 */
function isPermittedPath(relativePath: string): boolean {
  return PERMITTED_PATHS.some((permitted) => relativePath === permitted
    || relativePath.startsWith(`${permitted}/`));
}

/**
 * Files beneath one directory, relative to the package root.
 *
 * Recursive, dropping a {@link PERMITTED_PATHS} match the moment the
 * walk meets it, so a permitted directory is never descended into
 * rather than being filtered out of the result afterwards.
 *
 * Every regular file, whatever its extension. The rule is about a name
 * appearing in a tracked file under these trees, not about a name
 * appearing in TypeScript, and a filter by extension would be one more
 * way for the surface to shrink without saying so.
 *
 * A symlink is skipped rather than followed, since following one
 * either re-walks a tree already covered or leaves the package
 * altogether, and neither yields a file a name can be fixed in.
 *
 * Entries are sorted by name at each level, because `readdirSync`
 * returns directory order — stable on one machine, arbitrary across
 * them. Sorting makes the file list, and any failure report built from
 * it, identical everywhere.
 *
 * Paths are built with a literal `/` rather than `join`, so what comes
 * back is package-relative and slash-separated whatever the platform:
 * the form a failure message prints, a caller matches against a root
 * name, and {@link isPermittedPath} compares against.
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

      if (isPermittedPath(relativePath)) {
        return [];
      }

      if (entry.isDirectory()) {
        return walkDirectory(packageRoot, relativePath);
      }

      return entry.isFile()
        ? [relativePath]
        : [];
    });
}

/**
 * Every file the containment scan reads, relative to `packageRoot`.
 *
 * Walks {@link SCAN_ROOTS} in declaration order, pruning
 * {@link PERMITTED_PATHS} as it goes. The result is package-relative,
 * so a caller joins it back onto `packageRoot` to read a file and
 * prints it as-is to name one.
 *
 * Throws {@link EmptyScanError} rather than returning an empty or
 * short list: once if the root list itself is empty, and again as soon
 * as any declared root contributes nothing. A root that is absent, or
 * that is not a directory at all, takes that same path rather than
 * surfacing as a filesystem error from inside the walk — both mean the
 * declared surface and the tree disagree, which is one fact worth
 * reporting once.
 *
 * The refusal is checked per root and not only over the total. Two
 * roots are declared here, so a total-only guard would stay silent for
 * whichever one went quiet while the other kept the count above zero,
 * and half a surface is what this invariant most needs to be told
 * about.
 *
 * Pruning happens before the count, so a root left with nothing but
 * permitted paths refuses exactly as an empty one does. That is the
 * intended reading rather than an edge case: the permitted set would
 * then be the whole of that root, the scan would have read no file it
 * is allowed to fail on, and its clean answer would be about nothing.
 */
export function collectScannedFiles(
  packageRoot: string,
): readonly string[] {
  if (SCAN_ROOTS.length === 0) {
    throw new EmptyScanError(null, packageRoot);
  }

  return SCAN_ROOTS.flatMap((root) => {
    const stats = statSync(join(packageRoot, root), {
      throwIfNoEntry: false,
    });
    const files = stats !== undefined && stats.isDirectory()
      ? walkDirectory(packageRoot, root)
      : [];

    if (files.length === 0) {
      throw new EmptyScanError(root, packageRoot);
    }

    return files;
  });
}

/** One identifier the scan refuses to find outside the permitted set. */
export interface HashIdentifier {
  /**
   * The spelling itself, which is also the pattern the matcher
   * compiles and the id a failure report and the roster's own coverage
   * case pair on. None of the four carries a regex metacharacter, so
   * the identifier doubles as pattern source with nothing to escape.
   */
  readonly identifier: string;
  /**
   * Which of the two stored hashes the spelling names, and where the
   * column it stands for is declared.
   */
  readonly description: string;
}

/**
 * The names no scanned file may contain.
 *
 * Two hashes, two spellings each: the TypeScript form a property or a
 * drizzle column object takes, and the snake form the SQL column takes.
 * Both spellings of both hashes are the whole roster, because a hash
 * travels by one of those four strings being copied into a new file.
 *
 * No entry carries a guard, and none needs one. The de-origination
 * needles next door are narrowed by lookbehinds and separators because
 * their bare forms collide with camelCase compounds, ordinary English,
 * and base64 noise; these four collide with nothing. A wider name that
 * contains one — a hash of some other token, a second credential
 * table — is a hit this rule wants reported rather than a false
 * positive, since the containment claim is about the name and not
 * about which column produced it.
 *
 * The four are mutually exclusive as text: no occurrence of one is
 * inside an occurrence of another, so the number of hits a file
 * produces is the number of times it names a hash.
 */
export const HASH_IDENTIFIERS: readonly HashIdentifier[] = [
  {
    identifier: 'passwordHash',
    description:
      'TypeScript spelling of the argon2id PHC string stored in ' +
      '`auth_users.password_hash`.',
  },
  {
    identifier: 'password_hash',
    description:
      'SQL spelling of the same column, as `src/db/schema/auth.ts` ' +
      'declares it and the generated migration creates it.',
  },
  {
    identifier: 'tokenHash',
    description:
      'TypeScript spelling of the SHA-256 digest stored in ' +
      '`auth_sessions.token_hash`, the verifier lookup key.',
  },
  {
    identifier: 'token_hash',
    description:
      'SQL spelling of the same column, unique because one hash ' +
      'resolves to at most one session.',
  },
];

/** One occurrence of a rostered identifier, as the scan reports it. */
export interface HashIdentifierMatch {
  /**
   * `identifier` of the {@link HASH_IDENTIFIERS} entry that matched,
   * which is the spelling itself. Safe in a failure message, unlike
   * the de-origination reports next door: these names are ones the
   * repository declares on purpose, and printing one seeds nothing.
   */
  readonly identifier: string;
  /**
   * Where the content came from, exactly as the caller named it. The
   * matcher never opens a file, so this is carried rather than derived
   * — its only job is to let a caller scanning many files say which
   * one a hit belongs to.
   */
  readonly filePath: string;
  /**
   * 1-based, so the pair `<file>:<line>` means the same thing here as
   * in an editor, a stack trace, or `grep -n` output.
   */
  readonly lineNumber: number;
  /**
   * The offending line, verbatim and untrimmed, for a caller that
   * wants to show the hit locally. A failure report is built from the
   * three fields above instead: the fix is always in the named file,
   * and a line quoted into CI output is source nobody reads there.
   */
  readonly line: string;
}

/**
 * Every rostered identifier in one file's content, one record per hit.
 *
 * Takes content rather than a path, which is the seam that makes the
 * roster testable: a planted sample can be assembled in memory and
 * passed straight in, with no fixture file that would itself land
 * inside a scan root.
 *
 * One record per hit, not per line or per file. A line naming two of
 * the four is two findings, and a report that collapsed them would
 * quietly let the second survive the fix for the first.
 *
 * Matching is case-insensitive. The same column is `password_hash` in
 * SQL, `passwordHash` in TypeScript, and `PasswordHash` the moment
 * somebody names a type after it; a case-sensitive scan would be one a
 * rename slips past without anybody meaning to.
 *
 * The needles are compiled fresh on every call and never cached. They
 * match globally, and a global `RegExp` carries `lastIndex` from one
 * use to the next, so a shared instance would start each file wherever
 * the previous file left off — a scan that passes and fails
 * alternately over unchanged input. `matchAll` keeps that property
 * inside the call too: it iterates an internal clone, so the loops
 * below cannot advance the instance they were handed.
 *
 * Results come back in file order — ascending line number, and within
 * a line in the order {@link HASH_IDENTIFIERS} declares.
 */
export function findHashIdentifiers(
  content: string,
  filePath: string,
): readonly HashIdentifierMatch[] {
  const needles = HASH_IDENTIFIERS.map((entry) => ({
    identifier: entry.identifier,
    needle: new RegExp(entry.identifier, 'gi'),
  }));

  return content.split('\n').flatMap((line, index) => needles.flatMap(
    ({ identifier, needle }) => [...line.matchAll(needle)].map(() => ({
      identifier,
      filePath,
      lineNumber: index + 1,
      line,
    })),
  ));
}
