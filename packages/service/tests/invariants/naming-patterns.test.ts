/**
 * Unit tests for the naming-invariant matcher and its scan surface.
 *
 * The scan over the real tree passes by finding nothing, and a needle
 * that can no longer find anything produces exactly the same result.
 * These tests are what separate the two: every entry in
 * {@link FORBIDDEN_PATTERNS} is handed a planted occurrence of the name
 * it stands for and has to report it, so a pattern that stops matching
 * fails here instead of quietly widening what the scan lets through.
 *
 * The other half is what the needles must not find. Three of the five
 * names have legal near-neighbours — a camelCase compound, an export
 * format this package already declares, an ordinary English word — and
 * a needle widened to the bare name flags every one of them. The
 * controls below are lines those names really take, each asserted to
 * produce nothing, so a needle cannot be loosened into a nuisance
 * without failing here first. That direction matters more than it
 * looks: the cheapest fix for a scan that cries wolf is to delete it.
 *
 * Each sample is assembled from fragments rather than written out, for
 * the same reason the needles are: every phase of this port closes with
 * a repo-wide grep for these names over tracked files, and samples
 * spelled out here would be guaranteed hits in the one file that cannot
 * be cleaned without deleting the coverage it provides.
 *
 * The controls are written out literally instead, which is the point of
 * them: each is a string this repository is allowed to contain, so none
 * is a hit for that grep and none needs hiding from it. Assembling one
 * from fragments would also weaken it, since what a control has to
 * prove safe is the exact string that appears on disk.
 *
 * Samples are planted inside a short body of clean lines rather than
 * passed on their own, so each case also proves the report points at
 * the offending line rather than at the top of the file. The surrounding
 * lines are prose in no particular format, which is the point: the
 * matcher reads content line by line and never parses it, so a sample
 * carries the shape the name really takes — an environment assignment,
 * a repository URL, a hostname, a link, a path — without the body
 * around it having to be a file of any one kind.
 *
 * The last section leaves the matcher for the walk that feeds it. A scan
 * is worth no more than the file list it was handed, and a declared root
 * that has been renamed, emptied, or reduced to build output stops
 * contributing files without saying so: a green run over part of the
 * surface, indistinguishable from a green run over all of it. Those
 * cases build real directory trees, one per way a root goes quiet, and
 * assert the walk refuses each of them for every root it declares.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import {
  EXCLUDED_DIRS,
  EmptyScanRootError,
  FORBIDDEN_PATTERNS,
  SCAN_FILES,
  SCAN_ROOTS,
  collectScannedFiles,
  findForbiddenMatches,
} from './naming-patterns.js';

// ---------------------------------------------------------------------------
// Needle fragments
// ---------------------------------------------------------------------------

// Split across a join so no forbidden name appears contiguously in this
// file, exactly as `naming-patterns.ts` splits the needles themselves.
// None of these fragments is a forbidden name on its own, and none of
// them is what the matcher is being tested against — the samples below
// are assembled from them at run time, which is where the names exist.
const ORIGIN_PREFIX = ['o', 'f', 'w'].join('');
const ORIGIN_PROJECT = ['open', 'for', 'work'].join('-');
const ORIGIN_HOST = ['bife', 'mecanico', '.com'].join('');
const VAULT_URI = ['obsidian', '://'].join('');
const VAULT_PATH = ['/', 'vault', '/'].join('');

// ---------------------------------------------------------------------------
// Planted samples
// ---------------------------------------------------------------------------

/** One planted occurrence, paired with the pattern that must find it. */
interface PlantedSample {
  /**
   * `id` of the {@link FORBIDDEN_PATTERNS} entry under test. Pairing by
   * id rather than by position means a reordered table still tests what
   * it says it tests, and a table entry left without a sample is caught
   * by the coverage case below rather than silently going untested.
   */
  readonly patternId: string;
  /**
   * The line planted into the body, in the shape the name takes where
   * it actually leaks. A sample reduced to the bare needle would pass
   * against a pattern too narrow to survive real content around it.
   */
  readonly line: string;
}

const PLANTED_SAMPLES: readonly PlantedSample[] = [
  // Upper-cased and preceded by whitespace: the compose or env form,
  // which is both the likeliest leak and the case the pattern's
  // lookbehind has to admit. A guard that rejected it would make the
  // scan blind to the exact place these names survive longest.
  {
    patternId: 'origin-prefix',
    line: `      - ${ORIGIN_PREFIX.toUpperCase()}_BASE_URL=http://localhost:5678`,
  },
  {
    patternId: 'origin-project',
    line: `    "url": "git+https://github.com/example/${ORIGIN_PROJECT}.git",`,
  },
  // Carries a subdomain and a TLD the needle does not mention, so this
  // sample fails the moment the entry is narrowed to a fully qualified
  // host — the form that would let every subdomain of it through.
  {
    patternId: 'origin-host',
    line: `AR_SERVICE_URL=https://api.${ORIGIN_HOST}`,
  },
  {
    patternId: 'vault-uri',
    line: `  const link = '${VAULT_URI}open?file=digest';`,
  },
  {
    patternId: 'vault-path',
    line: `  const outputDir = '/Users/someone${VAULT_PATH}inbox';`,
  },
];

// ---------------------------------------------------------------------------
// False-positive controls
// ---------------------------------------------------------------------------

// Planted samples prove the needles still match. These prove they still
// match nothing else, which is the half that decides whether the scan
// survives contact with the repository. Every line below would go red
// under exactly the widening the needles were written to avoid: the
// origin letters without their lookbehind, the note application without
// its scheme separator, the path segment without its slashes.

/** One legal string a needle has to leave alone. */
interface FalsePositiveControl {
  /**
   * `id` of the {@link FORBIDDEN_PATTERNS} entry this line sits next to
   * — the one whose needle would flag it if widened to the bare name.
   * Recorded rather than asserted against: each case asserts zero
   * matches across the whole table, since a needle that flags another
   * entry's near-miss is the same defect wherever it turns up.
   */
  readonly patternId: string;
  /** What the line is, used as the case name. */
  readonly label: string;
  /**
   * The fragment of the guarded name this line carries, asserted to be
   * present before the line is asserted to be clean. A control that had
   * drifted away from the name it stands beside would keep passing
   * while proving nothing — the vacuous pass this file exists to rule
   * out, arriving through the back door.
   */
  readonly nearMiss: string;
  /** The line, in the shape it takes where it legitimately occurs. */
  readonly line: string;
}

const FALSE_POSITIVE_CONTROLS: readonly FalsePositiveControl[] = [
  // camelCase compounds are the everyday source of the bare-letter false
  // positive: any identifier joining a word ending in `o` to `Of` or
  // `For` and a `W` word carries the letters in the middle.
  {
    patternId: 'origin-prefix',
    label: 'the camelCase compound poolOfWorkers',
    nearMiss: ORIGIN_PREFIX,
    line: '  const poolOfWorkers = createWorkerPool({ concurrency: 4 });',
  },
  {
    patternId: 'origin-prefix',
    label: 'the camelCase compound numberOfWorkers',
    nearMiss: ORIGIN_PREFIX,
    line: '      numberOfWorkers: config.concurrency ?? 4,',
  },
  // The other everyday source, and the one that would make the scan
  // useless rather than merely noisy: base64 carries the letters at
  // random, and a lockfile is nothing but base64. A bare sweep of this
  // repository's lockfile returns six hits, every one of them inside a
  // `sha512-` integrity string and none of them fixable by editing it.
  {
    patternId: 'origin-prefix',
    label: 'the origin letters inside a base64 integrity hash',
    nearMiss: ORIGIN_PREFIX,
    // Kept on one line, over the width the prose here wraps at. The
    // letters are guarded in this token by whatever base64 character
    // precedes them, and a concatenation broken just in front of one
    // would put an unguarded copy into this file for the close-out
    // grep to find — a hit in the source of a control asserting the
    // runtime string is clean.
    line: '    "integrity": "sha512-Nd0aH9BvcNqA1ofWCmJvT2xqR8kSLpXbGz7YeUwOFWjKcV6nHrTsIuMlPd4gAyBxQEZ0RiWvCkStUnGmLhJfDa==",',
  },
  // Already tracked, in `src/exports/index.ts`: this is the package's
  // own export format, so a needle matching the note application by its
  // bare name would flag the port's own code on the day it landed.
  {
    patternId: 'vault-uri',
    label: 'the obsidian_md export format',
    nearMiss: 'obsidian',
    line: '  | \'obsidian_md\'',
  },
  // Not tracked yet: phase 6 adds the renderer for that format, and its
  // module path carries the same name a second time.
  {
    patternId: 'vault-uri',
    label: 'a module path named after that export format',
    nearMiss: 'obsidian',
    line: '  "include": ["src/exports/obsidian-md.ts"],',
  },
  // Ordinary English, and a word this domain reaches for: findings are
  // retained, archived, vaulted. The needle carries its slashes so that
  // a word is never mistaken for somebody's directory.
  {
    patternId: 'vault-path',
    label: 'the ordinary English word vaulted',
    nearMiss: 'vault',
    line: '   * Retained findings are vaulted for the digest window.',
  },
];

// ---------------------------------------------------------------------------
// Synthetic file body
// ---------------------------------------------------------------------------

// Clean on both sides of the plant, so a case that reports one match
// reports it for the planted line and for nothing else. These lines are
// not asserted to be clean anywhere — they do not have to be, since a
// forbidden name in either one turns every case below red by adding a
// second match to a result asserted to hold exactly one.
const CLEAN_LINES_BEFORE: readonly string[] = [
  'A body of ordinary content, carrying no forbidden name in any',
  'casing, wrapped around the one line that does.',
];

const CLEAN_LINES_AFTER: readonly string[] = [
  'The matcher reads content line by line and never parses it, so the',
  'format of the lines around a plant makes no difference to the hit.',
];

/** 1-based, matching what the matcher reports and what an editor shows. */
const PLANTED_LINE_NUMBER = CLEAN_LINES_BEFORE.length + 1;

/**
 * Path the samples are attributed to. Named but never opened: the
 * matcher takes content, so this only has to be the string it carries
 * back into the report.
 */
const SAMPLE_FILE_PATH = 'src/example/config.ts';

/** The sample line surrounded by clean content, as one file's worth. */
function plantInFile(line: string): string {
  return [...CLEAN_LINES_BEFORE, line, ...CLEAN_LINES_AFTER].join('\n');
}

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

describe('findForbiddenMatches — planted samples', () => {
  // Without this, a pattern added to the table with no sample beside it
  // is a pattern nothing proves can still match, and the suite stays
  // green while coverage shrinks — the same vacuous pass the scan
  // itself guards against by refusing an empty scan root.
  it('plants a sample for every pattern the table declares', () => {
    const planted = PLANTED_SAMPLES.map((sample) => sample.patternId).sort();
    const declared = FORBIDDEN_PATTERNS.map((pattern) => pattern.id).sort();

    expect(planted).toEqual(declared);
  });

  for (const sample of PLANTED_SAMPLES) {
    // Exact equality on the whole record, not a length or a containment
    // check: it pins the hit to the planted line rather than to any hit
    // anywhere in the body, and it fails if a sample starts matching a
    // second pattern as well — which is how a needle widened past its
    // own name first shows up.
    it(`flags ${sample.patternId} on the line it occurs`, () => {
      const matches = findForbiddenMatches(
        plantInFile(sample.line),
        SAMPLE_FILE_PATH,
      );

      const expected = {
        patternId: sample.patternId,
        filePath: SAMPLE_FILE_PATH,
        lineNumber: PLANTED_LINE_NUMBER,
        line: sample.line,
      };

      expect(matches).toEqual([expected]);
    });
  }
});

describe('findForbiddenMatches — false-positive controls', () => {
  // A control naming a pattern the table no longer declares is a control
  // guarding nothing: it keeps asserting zero matches, but the needle it
  // was written against is gone, and so is the reason the line was
  // chosen over any other clean line.
  it('sits beside a pattern the table declares', () => {
    const declared = FORBIDDEN_PATTERNS.map((pattern) => pattern.id);
    const dangling = FALSE_POSITIVE_CONTROLS
      .map((control) => control.patternId)
      .filter((patternId) => !declared.includes(patternId));

    expect(dangling).toEqual([]);
  });

  // The one thing a zero-match assertion cannot check about itself. A
  // control edited into a line that no longer carries the near-name is
  // an assertion over ordinary prose: green forever, and green for a
  // reason that has nothing to do with the needle it was guarding.
  it('carries the near-name it is a control for', () => {
    const empty = FALSE_POSITIVE_CONTROLS
      .filter((control) => !control.line.toLowerCase()
        .includes(control.nearMiss.toLowerCase()))
      .map((control) => control.label);

    expect(empty).toEqual([]);
  });

  for (const control of FALSE_POSITIVE_CONTROLS) {
    // Planted in the same body the samples use, so a control also proves
    // the clean lines around it stay clean — and asserted empty rather
    // than filtered to one pattern, because a widened needle flags its
    // neighbour's near-miss as readily as its own.
    it(`does not flag ${control.label}`, () => {
      const matches = findForbiddenMatches(
        plantInFile(control.line),
        SAMPLE_FILE_PATH,
      );

      expect(matches).toEqual([]);
    });
  }
});

// ---------------------------------------------------------------------------
// Scan-root fixtures
// ---------------------------------------------------------------------------

// The walk is asserted against real directories rather than a mocked
// `node:fs`. What it has to get right is filesystem behaviour — a path
// that is a file where a directory was declared, a root holding nothing
// but output the scan prunes — and a mock of that behaviour proves only
// that the mock and the assertion were written to agree.

/**
 * Fixture package roots created below, removed once this file finishes.
 *
 * A registry rather than a single shared tree: each case builds its own
 * root per sabotage, so one case can never leave another looking at a
 * directory it already broke.
 */
const FIXTURE_ROOTS: string[] = [];

afterAll(() => {
  for (const fixtureRoot of FIXTURE_ROOTS) {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

/** The one file every healthy fixture root is given. */
const FIXTURE_FILE = 'placeholder.txt';

/** Never opened: the walk lists files, so only their presence matters. */
const FIXTURE_CONTENT = 'Fixture content, which the walk never reads.\n';

/**
 * Pruned directory the last sabotage builds its root from. Named here
 * rather than written inline so the case below can pin it to
 * {@link EXCLUDED_DIRS}.
 */
const PRUNED_DIR = 'dist';

/** One way a declared root stops contributing files. */
interface RootSabotage {
  /** Reads as the case name: `refuses a root that <label>`. */
  readonly label: string;
  /**
   * Puts the root path into that state, having first been handed a root
   * whose contents were removed — so a sabotage that does nothing leaves
   * the root absent.
   */
  readonly apply: (rootPath: string) => void;
}

const ROOT_SABOTAGES: readonly RootSabotage[] = [
  // Nothing is put back: the renamed or mistyped root. It is also the
  // case the walk has to intercept before `readdirSync` reaches it, so
  // that a declared surface disagreeing with the tree is reported as
  // that, rather than as an ENOENT out of the middle of the recursion.
  {
    label: 'is missing altogether',
    apply: () => {},
  },
  // Present, readable, and holding nothing. No error surfaces from the
  // filesystem at all here, which makes this the case that would pass in
  // silence were the walk to take its own root list on trust.
  {
    label: 'exists but is empty',
    apply: (rootPath) => mkdirSync(rootPath),
  },
  // A file where a directory was declared — the shape a root takes when
  // something is renamed onto it, or when a root collapses to a single
  // module and its declaration does not follow.
  {
    label: 'is a file rather than a directory',
    apply: (rootPath) => writeFileSync(rootPath, FIXTURE_CONTENT),
  },
  // Populated, but only with output the scan prunes. Nothing the
  // filesystem reports calls this root empty, and the walk still has to
  // treat it as contributing nothing: a root left holding build output
  // is a root whose sources moved somewhere the scan is not looking.
  {
    label: 'holds only pruned output',
    apply: (rootPath) => {
      mkdirSync(join(rootPath, PRUNED_DIR), { recursive: true });
      writeFileSync(join(rootPath, PRUNED_DIR, FIXTURE_FILE), FIXTURE_CONTENT);
    },
  },
];

/**
 * A miniature package root with one plain file inside every declared
 * scan root.
 *
 * {@link SCAN_FILES} are deliberately not created. The walk appends them
 * without opening them, and a fixture that carried them would obscure
 * that — the control case expects them back from a tree where nothing on
 * disk backs them.
 */
function makeFixture(): string {
  const packageRoot = mkdtempSync(join(tmpdir(), 'ar-naming-scan-'));
  FIXTURE_ROOTS.push(packageRoot);

  for (const root of SCAN_ROOTS) {
    const rootPath = join(packageRoot, root);
    mkdirSync(rootPath);
    writeFileSync(join(rootPath, FIXTURE_FILE), FIXTURE_CONTENT);
  }

  return packageRoot;
}

/** The same fixture with one root emptied and then sabotaged. */
function makeSabotagedFixture(root: string, sabotage: RootSabotage): string {
  const packageRoot = makeFixture();
  const rootPath = join(packageRoot, root);

  rmSync(rootPath, { recursive: true });
  sabotage.apply(rootPath);

  return packageRoot;
}

/** Returned when the walk ran to the end instead of refusing a root. */
const NOT_REFUSED = '(no root refused)';

/**
 * The root {@link collectScannedFiles} refused, or {@link NOT_REFUSED}
 * when it walked the fixture through.
 *
 * Only {@link EmptyScanRootError} counts as a refusal; anything else is
 * rethrown. A missing directory arriving as a bare filesystem error is a
 * different event from the walk naming a root it will not accept, and
 * folding the two together would let a walk that had stopped working
 * pass an assertion about coverage.
 */
function refusedRoot(packageRoot: string): string {
  try {
    collectScannedFiles(packageRoot);
  } catch (thrown) {
    if (thrown instanceof EmptyScanRootError) {
      return thrown.root;
    }

    throw thrown;
  }

  return NOT_REFUSED;
}

// ---------------------------------------------------------------------------
// Scan-root cases
// ---------------------------------------------------------------------------

describe('collectScannedFiles — declared scan roots', () => {
  // The control the refusals rest on. Every case below starts from this
  // fixture and breaks exactly one root, so a refusal says something only
  // while the untouched tree is one the walk accepts and reports in full
  // — otherwise a fixture nothing could walk would satisfy all four.
  it('returns every file when each declared root is populated', () => {
    const expected = [
      ...SCAN_ROOTS.map((root) => `${root}/${FIXTURE_FILE}`),
      ...SCAN_FILES,
    ];

    expect(collectScannedFiles(makeFixture())).toEqual(expected);
  });

  // Not a vacuity guard: were this name to leave EXCLUDED_DIRS, the
  // pruned-output case would fail anyway, since the walk would then find
  // the file inside it. It is here to say which fact broke — a fixture
  // built on a directory nobody prunes any more, rather than a walk that
  // stopped refusing roots that contribute nothing.
  it('builds its pruned-output fixture from a pruned directory', () => {
    expect(EXCLUDED_DIRS).toContain(PRUNED_DIR);
  });

  for (const sabotage of ROOT_SABOTAGES) {
    // Swept across every declared root rather than applied to one. The
    // guard runs inside the per-root walk, and a version of it that
    // covered only the first root — or only the last — would pass a
    // single-root case while leaving the rest of the surface free to
    // shrink in silence. Reported as the list of roots that went
    // unrefused, so a failure names them instead of counting them.
    it(`refuses a root that ${sabotage.label}`, () => {
      const unrefused = SCAN_ROOTS.filter(
        (root) => refusedRoot(makeSabotagedFixture(root, sabotage)) !== root,
      );

      expect(unrefused).toEqual([]);
    });
  }
});
