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
 * The package root is derived from this file's own location rather than
 * from the working directory, so the same tree is scanned whether the
 * suite is started from the package or from the repo root.
 */
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { SCAN_ROOTS, collectScannedFiles } from './naming-patterns.js';

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
