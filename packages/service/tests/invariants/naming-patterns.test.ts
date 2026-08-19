/**
 * Unit tests for the naming-invariant matcher.
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
 */
import { describe, expect, it } from 'vitest';

import { FORBIDDEN_PATTERNS, findForbiddenMatches } from './naming-patterns.js';

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
    line:
      '    "integrity": "sha512-Nd0aH9BvcNqA1ofWCmJvT2xqR8kSLpXbGz7YeUw' +
      'OFWjKcV6nHrTsIuMlPd4gAyBxQEZ0RiWvCkStUnGmLhJfDa==",',
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
