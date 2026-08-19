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
 * Each sample is assembled from fragments rather than written out, for
 * the same reason the needles are: every phase of this port closes with
 * a repo-wide grep for these names over tracked files, and samples
 * spelled out here would be guaranteed hits in the one file that cannot
 * be cleaned without deleting the coverage it provides.
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
