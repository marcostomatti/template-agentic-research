/**
 * The naming invariant, run against the real `packages/service` tree.
 *
 * The needles and the walk that feeds them are unit-tested next door,
 * against planted samples and hand-built fixtures. This file is where
 * both meet the package as it actually stands on disk.
 *
 * What it establishes first is that there is a surface to scan at all.
 * A content check reports what it found in the files it was handed and
 * says nothing about the files it was not: a declared root that has
 * been renamed, emptied, or reduced to build output simply stops
 * contributing, and the run stays green over whatever is left. Nothing
 * in that run distinguishes full coverage from half of it, so the
 * coverage is asserted here rather than assumed — every root has to
 * appear in the list the scan is about to read.
 *
 * `collectScannedFiles` refuses an empty root on its own, and the case
 * below is not a second copy of that guard. It asserts the property at
 * the point of use: that the paths handed back are package-relative and
 * carry the root they came from, which is what makes a hit attributable
 * to a root and a failure message locatable. A walk that began
 * returning absolute paths would satisfy the guard and fail here.
 *
 * With the surface established, the scan over its contents is a single
 * sweep rather than a case per file. The test count then follows the
 * invariant instead of the size of the tree, and a run with several
 * hits reports all of them together, which is how they get fixed
 * together. Each is listed as `<file>:<line> — <pattern id>`, the form
 * an editor, a stack trace, and `grep -n` all take, so a reported hit
 * is a path to open rather than a string to go looking for.
 *
 * What that line never carries is the text that matched. Failure output
 * reaches CI logs and terminal scrollback, and a copy of a banned name
 * landing there is one no later scan can reach and nobody can edit.
 *
 * The package root is derived from this file's own location rather than
 * from the working directory, so the same tree is scanned whether the
 * suite is started from the package or from the repo root.
 */
import type { ForbiddenMatch } from './naming-patterns.js';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  SCAN_ROOTS,
  collectScannedFiles,
  findForbiddenMatches,
} from './naming-patterns.js';

// ---------------------------------------------------------------------------
// Scan surface
// ---------------------------------------------------------------------------

/**
 * Root of `@ar/service`, two levels above `tests/invariants/`.
 *
 * Trailing slash and all, which `join` normalizes away — it survives
 * only into the message of a walk that refuses a root, where it reads
 * as the directory it is.
 */
const PACKAGE_ROOT = fileURLToPath(new URL('../..', import.meta.url));

/**
 * Every file the invariant covers, resolved once for the whole file.
 *
 * Deliberately at module scope: a walk that cannot build the surface
 * throws, and that failure belongs to the file rather than to one case.
 * There is nothing left to assert about contents once the list of files
 * to read is wrong, and the error names the root that went quiet.
 */
const SCANNED_FILES = collectScannedFiles(PACKAGE_ROOT);

// ---------------------------------------------------------------------------
// Coverage
// ---------------------------------------------------------------------------

describe('naming invariant — scan surface', () => {
  // Swept across the whole list rather than checked root by root, so a
  // failure names every root that stopped contributing instead of
  // reporting the first and hiding the rest behind it.
  it('scans at least one file under every declared root', () => {
    const uncovered = SCAN_ROOTS.filter(
      (root) => !SCANNED_FILES.some((file) => file.startsWith(`${root}/`)),
    );

    expect(uncovered).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Contents
// ---------------------------------------------------------------------------

/**
 * One hit, in the form the failure list prints it.
 *
 * Pattern id rather than matched text, and no offending line either:
 * the id says which needle fired and the location says where, which is
 * everything needed to open the file and read the rest there — the one
 * place the name can also be removed.
 */
function formatMatch(match: ForbiddenMatch): string {
  return `${match.filePath}:${match.lineNumber} — ${match.patternId}`;
}

describe('naming invariant — contents', () => {
  // Compared against an empty array rather than against a count, so the
  // failure diff is the list of hits itself: every one of them, each
  // naming its own file and line, instead of a number to go chasing.
  //
  // Files are read here rather than at module scope. A path that has
  // gone missing between the walk and the read belongs to this case,
  // which fails naming it, and `SCAN_FILES` leans on exactly that: the
  // walk appends those two unguarded because opening them is what
  // proves they are still there.
  it('finds no forbidden name in any scanned file', () => {
    const found = SCANNED_FILES.flatMap((relativePath) => {
      const content = readFileSync(join(PACKAGE_ROOT, relativePath), 'utf8');

      return findForbiddenMatches(content, relativePath).map(formatMatch);
    });

    expect(found).toEqual([]);
  });
});
