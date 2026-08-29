/**
 * The two hygiene rules over the port-parity seam, and the guard that
 * keeps them covering every file in it.
 *
 * Nothing else reports either rule. `tests/` sits outside every root
 * the naming invariant declares, and the root ESLint leaf config
 * ignores everything under `packages/`, so a parity file that wrote an
 * operator's origin checkout path down would reach the remote past a
 * fully green verification order. This is a DEFAULT-suite invariant
 * rather than a gated one, which is the deliberate half: the seam it
 * polices skips without the origin variable, and a hygiene check that
 * skipped alongside it would report only on the machines that need it
 * least.
 *
 * The first rule is that no absolute filesystem path literal appears
 * in the harness or in any file under the parity directory. A parity
 * suite addresses an origin module by a GENERIC relative path and
 * takes the root from the environment; the moment one writes a root
 * down, the value stops being an operator's and becomes this
 * repository's, and every clone inherits a path that is true on one
 * machine.
 *
 * The second is that the origin-root variable is named in the harness
 * and in no other file under that seam. One name in one place is what
 * keeps the gate a single decision: a parity file reading the
 * environment for itself would run cases the gate had already decided
 * to skip, and prose repeating the name is a second thing to keep in
 * step. The claim is scoped to the files below on purpose — the
 * package `AGENTS.md` names the variable where it documents the seam,
 * which is documentation OF the gate rather than a second reader of
 * it.
 *
 * Both are zero-hit readings, so both carry a liveness leg. The path
 * detector runs over a planted sample first and then over a sample of
 * the shapes these files legitimately do carry: the first says the
 * needle fires, the second says it discriminates, and only the pair
 * makes the empty result over the real files mean anything. The
 * variable needle needs no planted sample because its positive
 * control is in band — the harness must hold EXACTLY one occurrence,
 * so a needle matching nothing fails there before it reports a clean
 * sweep anywhere else.
 *
 * Neither an absolute path nor the variable name is written as a
 * literal here. The name is assembled from parts and the planted
 * samples are built from a separator constant, so this file holds no
 * instance of what it forbids — which is what lets it join its own
 * scan surface later without falsifying its own claims, and what
 * keeps a repository-wide grep for either shape off the one test that
 * bans them.
 *
 * A hit is reported as `<file>:<line> — <kind>` and never with the
 * text that matched. The whole point of the rule is that such a string
 * is somebody's local filesystem path; a failure message carrying it
 * would copy it into CI logs and terminal scrollback, the one place
 * nobody can go and remove it.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// ---------------------------------------------------------------------------
// The scan surface
// ---------------------------------------------------------------------------

/**
 * Root of `@ar/service`, resolved from this file rather than from the
 * working directory, so the same tree is read whether vitest was
 * started from the package or from the repo root.
 */
const PACKAGE_ROOT = fileURLToPath(new URL('../..', import.meta.url));

/** The harness every parity suite is gated and loaded by. */
const HARNESS_PATH = 'tests/helpers/port-parity.ts';

/** The directory those suites live in. */
const PARITY_DIR = 'tests/parity';

/**
 * Every file under {@link PARITY_DIR} this invariant reads, by name.
 *
 * Declared rather than derived, and that is the whole of what makes an
 * addition visible: a scan built straight from the listing covers a
 * new file silently and prints the same green either way, so nothing
 * in the run would ever say whether the file was read. Held set-equal
 * against the live listing below instead, so a file added later fails
 * HERE, naming itself, and gets registered in the commit that adds it.
 */
const PARITY_FILES: readonly string[] = [
  'harness.parity.test.ts',
];

/** Every package-relative path this invariant reads, harness first. */
const SCANNED_PATHS: readonly string[] = [
  HARNESS_PATH,
  ...PARITY_FILES.map((name) => `${PARITY_DIR}/${name}`),
];

/**
 * Every file under `dir`, as paths relative to it.
 *
 * Recursive and unfiltered by extension. The rules below are about
 * TEXT, and a fixture module or a stored payload added beside the
 * suites carries text exactly as a suite does — an extension filter
 * here is the one way a file could be listed as covered and read by
 * nothing.
 */
function listFiles(dir: string, prefix: string): string[] {
  const found: string[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const step = prefix === ''
      ? entry.name
      : `${prefix}/${entry.name}`;

    if (entry.isDirectory()) {
      found.push(...listFiles(join(dir, entry.name), step));
    } else if (entry.isFile()) {
      found.push(step);
    }
  }

  return found;
}

/** Reads one declared path, package-relative. */
function readScanned(path: string): string {
  return readFileSync(join(PACKAGE_ROOT, path), 'utf8');
}

/** One scanned file, as the rules below read it. */
interface ScannedFile {
  /** Package-relative path, the form a failure prints. */
  readonly path: string;

  /** Its full text. */
  readonly content: string;
}

/**
 * Reads every declared path.
 *
 * Called inside each case rather than resolved at module scope: a path
 * that went missing between the roster and the read belongs to a case
 * that fails naming it, not to a file that refuses to load.
 */
function readScannedFiles(): readonly ScannedFile[] {
  return SCANNED_PATHS.map((path) => ({ path, content: readScanned(path) }));
}

// ---------------------------------------------------------------------------
// Absolute filesystem paths
// ---------------------------------------------------------------------------

/** What kind of absolute path a hit is. */
type PathKind = 'posix-absolute' | 'home-anchored' | 'windows-drive';

/**
 * One needle per kind, each refusing to start halfway along a relative
 * path or inside a pattern.
 *
 * The lookbehind is what separates a real root from the second segment
 * of `tests/parity/x`: a separator preceded by a path character, a
 * backslash or another separator continues something, and only one at
 * a boundary can begin an absolute path. The POSIX needle additionally
 * wants two separators, which is what keeps it off a line comment and
 * off a block-comment marker.
 */
const PATH_NEEDLES: readonly (readonly [PathKind, RegExp])[] = [
  ['posix-absolute', /(?<![A-Za-z0-9_.~\\/-])\/[A-Za-z0-9_.+-]+\/[A-Za-z0-9_.+-]/g],
  ['home-anchored', /(?<![A-Za-z0-9_.~\\/-])~\/[A-Za-z0-9_.+-]/g],
  ['windows-drive', /(?<![A-Za-z0-9_])[A-Za-z]:[\\/]+[A-Za-z0-9_.+-]/g],
];

/**
 * Characters a regular-expression literal may follow, and a path may
 * not.
 *
 * A separator at one of these positions opens a pattern rather than a
 * path. The asterisk is deliberately absent: it opens every line of a
 * TSDoc block, which is exactly where prose could carry a path.
 */
const OPENS_A_PATTERN = new Set([...'=(,:[{!&|?+;>}']);

/** Keywords a pattern may follow, for the same reason. */
const PATTERN_KEYWORD =
  /(?:^|[^A-Za-z0-9_$])(?:return|typeof|case|in|of|new|do|else|await|yield|delete|void)$/;

/**
 * Whether the match at `index` sits where a path could begin.
 *
 * Decided from everything before it on its own line with trailing
 * spaces dropped: the start of a line, a quote, a backtick or a word
 * of prose all mean a path, and the operators and keywords above mean
 * a pattern.
 */
function opensAPath(content: string, index: number): boolean {
  const lineStart = content.lastIndexOf('\n', index - 1) + 1;
  const before = content.slice(lineStart, index).replace(/\s+$/, '');
  const last = before.at(-1);

  if (last === undefined) {
    return true;
  }

  return !OPENS_A_PATTERN.has(last) && !PATTERN_KEYWORD.test(before);
}

/** The 1-based line `index` falls on. */
function lineNumberAt(content: string, index: number): number {
  return content.slice(0, index).split('\n').length;
}

/** Where one absolute path was found, before it is formatted. */
interface PathHit {
  /** 1-based line it sits on. */
  readonly line: number;

  /** Which needle fired. */
  readonly kind: PathKind;
}

/**
 * One hit as the failure list prints it.
 *
 * Kind rather than matched text, and location rather than context:
 * between them they say which needle fired and where to open the file,
 * which is everything needed to remove the path — in the one place it
 * can also be removed.
 */
function formatPathHit(path: string, kind: PathKind, line: number): string {
  return `${path}:${line} — ${kind}`;
}

/** Every absolute path in `content`, in line order. */
function findAbsolutePaths(path: string, content: string): string[] {
  const hits: PathHit[] = [];

  for (const [kind, needle] of PATH_NEEDLES) {
    for (const match of content.matchAll(needle)) {
      if (opensAPath(content, match.index)) {
        hits.push({ line: lineNumberAt(content, match.index), kind });
      }
    }
  }

  return [...hits]
    .sort((left, right) => left.line - right.line)
    .map((hit) => formatPathHit(path, hit.kind, hit.line));
}

/** The separator, so no absolute path is written down in this file. */
const SEPARATOR = String.fromCharCode(47);

/** The Windows one, for the same reason. */
const BACKSLASH = String.fromCharCode(92);

/** Stands in for a file name where a sample is scanned rather than one. */
const SAMPLE_PATH = 'planted-sample';

/**
 * One planted line per kind, each of which the detector must find.
 *
 * Assembled from {@link SEPARATOR} and {@link BACKSLASH} rather than
 * written out, for the reason the header gives. Each line is expected
 * to yield exactly ONE hit, of its OWN kind, which is what says the
 * three needles are bound to the three kinds rather than one of them
 * covering for the others.
 */
const PLANTED_SAMPLES: readonly (readonly [PathKind, string])[] = [
  [
    'posix-absolute',
    `const root = '${SEPARATOR}planted${SEPARATOR}absolute${SEPARATOR}sample';`,
  ],
  [
    'home-anchored',
    `const home = '~${SEPARATOR}planted${SEPARATOR}sample';`,
  ],
  [
    'windows-drive',
    `const drive = 'Z:${BACKSLASH}${BACKSLASH}planted${BACKSLASH}${BACKSLASH}sample';`,
  ],
];

/**
 * Shapes the harness and the parity suites legitimately carry, none of
 * which is an absolute path.
 *
 * Without this the planted sample alone would be satisfied by a needle
 * that fired on every separator in the tree, which would report the
 * relative module path in every import as a leaked root and make the
 * invariant unusable rather than wrong. Every line here is taken from
 * a form already in the seam: a relative import, a documentation URL,
 * an anchored pattern, a pattern behind an operator or a keyword, an
 * interpolated root, a comment marker, and prose naming a directory.
 */
const NEAR_MISS_SAMPLE: readonly string[] = [
  'import { firstDivergence } from \'../helpers/port-parity.js\';',
  'const ORIGIN_MODULE_PATH = \'lib/yaml-lite.js\';',
  '/** a block opens here',
  ' * see https://example.invalid/reserved/for/documentation',
  ' * the tests/parity/ directory holds every suite in the seam',
  ' * and it closes here */',
  '// a line comment naming src/lib and nothing else',
  'const PLAIN_KEY = /^[A-Za-z_$][A-Za-z0-9_$]*$/;',
  'const trimmed = before.replace(/\\s+$/, EMPTY);',
  'const flagged = text.match(/seg/gi);',
  'return /seg/x.test(value);',
  'const built = `${originRoot}/lib/module.js`;',
  'const ratio = measured / total;',
  'const dated = 2026/08/29;',
];

// ---------------------------------------------------------------------------
// The origin-root variable
// ---------------------------------------------------------------------------

/**
 * The origin-root variable, assembled rather than written.
 *
 * A test asserting that a name appears in exactly one file cannot
 * itself be a second file carrying it: the claim would be false the
 * day this file joins its own scan surface, and a repository-wide grep
 * for the name would report the invariant that bans it beside the
 * harness that owns it. A rename in the harness fails the case below
 * rather than sliding past it — the old name stops occurring there.
 */
const ORIGIN_ROOT_ENV = ['AR', 'PORT', 'PARITY', 'ORIGIN'].join('_');

/** How many times `needle` appears in `content`. */
function countOccurrences(content: string, needle: string): number {
  return content.split(needle).length - 1;
}

// ---------------------------------------------------------------------------
// Scan surface
// ---------------------------------------------------------------------------

describe('parity origin hygiene — scan surface', () => {
  // Set-equal rather than a count, so the failure diff is the file that
  // arrived or the one that left, named. A count says three where three
  // are expected and never says which three.
  it('reads every file the parity directory holds, and no other', () => {
    const listed = listFiles(join(PACKAGE_ROOT, PARITY_DIR), '');

    expect([...listed].sort()).toEqual([...PARITY_FILES].sort());
  });

  it('reads the harness beside them', () => {
    expect(SCANNED_PATHS).toContain(HARNESS_PATH);
  });

  // The non-vacuity leg for everything below: both sweeps are zero-hit
  // readings over these files, and a surface that had shrunk to nothing
  // — a renamed directory, a file emptied — would satisfy both while
  // reading no text at all.
  it('reads text out of every path it declares', () => {
    const read = readScannedFiles().map(
      (file) => `${file.path}: ${file.content.length > 0}`,
    );

    expect(SCANNED_PATHS.length).toBeGreaterThan(1);
    expect(read).toEqual(SCANNED_PATHS.map((path) => `${path}: true`));
  });
});

// ---------------------------------------------------------------------------
// Absolute filesystem paths
// ---------------------------------------------------------------------------

describe('parity origin hygiene — absolute path literals', () => {
  it('finds a planted path of every kind it looks for', () => {
    const found = PLANTED_SAMPLES.flatMap(
      ([, sample]) => findAbsolutePaths(SAMPLE_PATH, sample),
    );
    const expected = PLANTED_SAMPLES.map(([kind]) => formatPathHit(SAMPLE_PATH, kind, 1));

    expect(found).toEqual(expected);
  });

  it('finds none in the shapes these files legitimately carry', () => {
    const sample = NEAR_MISS_SAMPLE.join('\n');

    expect(findAbsolutePaths(SAMPLE_PATH, sample)).toEqual([]);
  });

  it('finds none in any scanned file', () => {
    const found = readScannedFiles().flatMap(
      (file) => findAbsolutePaths(file.path, file.content),
    );

    expect(found).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The origin-root variable
// ---------------------------------------------------------------------------

describe('parity origin hygiene — the origin-root variable', () => {
  // Exactly one, not at least one. The harness holds the name in a
  // single constant precisely so this can be a count rather than a
  // distribution, and the same case is the needle's own positive
  // control: a needle that matched nothing fails here, before it
  // reports a clean sweep next door.
  it('names it exactly once, in the harness', () => {
    expect(countOccurrences(readScanned(HARNESS_PATH), ORIGIN_ROOT_ENV)).toBe(1);
  });

  it('names it in no other file under the seam', () => {
    const counted = readScannedFiles()
      .filter((file) => file.path !== HARNESS_PATH)
      .map((file) => `${file.path}: ${countOccurrences(file.content, ORIGIN_ROOT_ENV)}`);
    const expected = SCANNED_PATHS
      .filter((path) => path !== HARNESS_PATH)
      .map((path) => `${path}: 0`);

    expect(counted).toEqual(expected);
  });
});
