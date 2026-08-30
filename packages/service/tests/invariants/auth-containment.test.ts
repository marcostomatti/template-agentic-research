/**
 * The auth hash-containment invariant, run against the real
 * `packages/service` tree.
 *
 * The rule: across `src/` and `lib/`, a stored password hash and a
 * stored session-token hash are named under `src/auth/` and in
 * `src/db/schema/auth.ts` and nowhere else. `auth-containment.ts` next
 * door holds the roster of spellings and the walk that decides which
 * files the rule covers; this file is where both meet the package as
 * it stands on disk.
 *
 * A containment scan passes by finding nothing, which is also what a
 * scan produces once it has stopped working. Three unrelated failures
 * arrive as the same clean zero — a surface that has shrunk to a
 * fraction of the tree, an exclusion that has grown to cover the
 * modules a hash would leak into, and a roster whose spellings no
 * longer match the code they were written for. The cases here are
 * ordered so each of those is ruled out before the zero is asserted.
 *
 * The surface comes first, and it is asserted as a set rather than a
 * count. What the walk returns has to be every file under the declared
 * roots less exactly the permitted paths: a count agrees at the wrong
 * membership, and only the difference of the two sets names which file
 * stopped being read.
 *
 * That difference is taken over the module's own two lists, which is
 * why they are pinned to literals in the same section. Every case here
 * is downstream of them — the subtraction, the walk, the files read —
 * so a root dropped or an exemption added moves the assertions along
 * with the scan and nothing goes red. Measured on both mutations: one
 * case fails, and it is the pin.
 *
 * The roster is next, twice over. Planted samples prove each of the
 * four spellings still matches — assembled in memory rather than kept
 * as a fixture file, since a fixture under a scan root would be a hit
 * against the invariant itself. The permitted files then prove the
 * same thing against real code: they are the one part of the tree
 * where every spelling has to occur, so running the matcher over them
 * is a liveness leg the repository maintains for free.
 *
 * Only then is the scan over the rest of the tree asserted empty. Its
 * failure lists every hit as `<file>:<line> — <identifier>`, the
 * form an editor, a stack trace and `grep -n` all take. Printing the
 * name that matched is safe here and deliberate: these four are names
 * the repository declares on purpose, and which of the two hashes
 * escaped is what a reader of the failure most needs.
 *
 * The last section leaves the real tree for the walk's refusal. A root
 * that has been renamed, emptied, or left holding nothing but
 * permitted paths stops contributing files without saying so, and that
 * last shape is this invariant's own: the walk prunes before it
 * counts, so a root whose whole contents are permitted is one the scan
 * read no file it was allowed to fail on. Those cases build real
 * directory trees, one per way a root goes quiet.
 *
 * The package root is derived from this file's own location rather
 * than from the working directory, so the same tree is scanned whether
 * the suite is started from the package or from the repo root.
 */
import type { HashIdentifierMatch } from './auth-containment.js';

import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, describe, expect, it } from 'vitest';

import {
  EmptyScanError,
  HASH_IDENTIFIERS,
  PERMITTED_PATHS,
  SCAN_ROOTS,
  collectScannedFiles,
  findHashIdentifiers,
} from './auth-containment.js';

// ---------------------------------------------------------------------------
// Scan surface
// ---------------------------------------------------------------------------

/** Root of `@ar/service`, two levels above `tests/invariants/`. */
const PACKAGE_ROOT = fileURLToPath(new URL('../..', import.meta.url));

/**
 * Every file the invariant covers, resolved once for the whole file.
 *
 * Deliberately at module scope: a walk that cannot build the surface
 * throws, and that failure belongs to the file rather than to one
 * case. There is nothing left to assert about contents once the list
 * of files to read is wrong, and the error names the root that went
 * quiet.
 */
const SCANNED_FILES = collectScannedFiles(PACKAGE_ROOT);

/**
 * Every file beneath one directory, permitted paths included.
 *
 * A second walk, written out here rather than borrowed from the module
 * under test, and applying no exclusions at all — which is the whole
 * of its value. The difference between what it returns and what the
 * scan returns is exactly what the scan chose not to read, so a walk
 * that had grown a prune nobody declared (an extension filter, a
 * skipped directory, an early return) shows up as files present in one
 * list and missing from the other.
 */
function walkAll(relativeDir: string): readonly string[] {
  const entries = readdirSync(join(PACKAGE_ROOT, relativeDir), {
    withFileTypes: true,
  });

  return entries.flatMap((entry) => {
    const relativePath = `${relativeDir}/${entry.name}`;

    if (entry.isDirectory()) {
      return walkAll(relativePath);
    }

    return entry.isFile()
      ? [relativePath]
      : [];
  });
}

/** The unpruned tree, against which the scan's surface is a subtraction. */
const FULL_TREE_FILES = SCAN_ROOTS.flatMap((root) => walkAll(root));

/**
 * Whether one package-relative path is inside the permitted set.
 *
 * The rule {@link PERMITTED_PATHS} documents, applied here
 * independently of the module that also applies it: exact match or
 * directory prefix, with the separator explicit so a sibling whose
 * name merely starts the same way is not swept in.
 */
function isPermitted(relativePath: string): boolean {
  return PERMITTED_PATHS.some((permitted) => relativePath === permitted
    || relativePath.startsWith(`${permitted}/`));
}

/** The files the rule allows to name a hash, as they stand on disk. */
const PERMITTED_FILES = FULL_TREE_FILES.filter(isPermitted);

// ---------------------------------------------------------------------------
// Coverage
// ---------------------------------------------------------------------------

describe('auth containment — scan surface', () => {
  // Swept across the whole list rather than checked root by root, so a
  // failure names every root that stopped contributing instead of
  // reporting the first and hiding the rest behind it.
  it('scans at least one file under every declared root', () => {
    const uncovered = SCAN_ROOTS.filter(
      (root) => !SCANNED_FILES.some((file) => file.startsWith(`${root}/`)),
    );

    expect(uncovered).toEqual([]);
  });

  // Set difference rather than arithmetic over two counts: the counts
  // agree at the wrong membership, and what a failure has to say is
  // which file left the surface.
  //
  // The permitted files are asserted present first, in band. A
  // subtraction that removes nothing is one a walk reading the whole
  // tree would satisfy — including the two paths that are supposed to
  // be exempt, whose hits would then fail the contents case below for
  // a reason that has nothing to do with containment.
  it('reads every file under the roots except the permitted set', () => {
    expect(PERMITTED_FILES.length).toBeGreaterThan(0);

    const expected = FULL_TREE_FILES.filter((file) => !isPermitted(file));

    expect([...SCANNED_FILES].sort()).toEqual([...expected].sort());
  });

  // The two lists everything else here is derived from, pinned to the
  // paths the rule names. Both cases above read them, and so does the
  // scan: drop a root or add an exemption and the assertions move with
  // it, leaving a green run over a surface that has quietly shrunk.
  // Measured — widening the permitted set by one directory reddened
  // nothing else in this file, and neither did dropping a root.
  //
  // Written out rather than counted, because a count is what a third
  // exemption would satisfy. Both lists are short by design, and the
  // rule they encode is that they stay that way: a change here is a
  // change to what the invariant covers, and it should cost an edit to
  // a case whose name says so.
  it('declares the roots and the exemptions the rule names', () => {
    expect([...SCAN_ROOTS].sort()).toEqual(['lib', 'src']);
    expect([...PERMITTED_PATHS].sort()).toEqual([
      'src/auth',
      'src/db/schema/auth.ts',
    ]);
  });
});

// ---------------------------------------------------------------------------
// Planted samples
// ---------------------------------------------------------------------------

/** One planted occurrence, paired with the identifier that finds it. */
interface PlantedSample {
  /**
   * `identifier` of the {@link HASH_IDENTIFIERS} entry under test.
   * Pairing by id rather than by position means a reordered roster
   * still tests what it says it tests, and an entry left without a
   * sample is caught by the coverage case below rather than silently
   * going untested.
   */
  readonly identifier: string;
  /**
   * The line planted into the body, in a shape the name really takes
   * where a hash escapes: a verify call given a column it fetched, a
   * raw query naming one, a record type carrying the field out of the
   * module that owns it. A sample reduced to the bare identifier would
   * pass against a matcher too narrow to survive real code around it.
   *
   * Exactly one rostered spelling per line, which is what lets each
   * case below assert the whole result rather than search it. The four
   * are mutually exclusive as text, so a line carrying two of them is
   * two hits and would fail the case that planted it.
   */
  readonly line: string;
}

const PLANTED_SAMPLES: readonly PlantedSample[] = [
  {
    identifier: 'passwordHash',
    line: '  const ok = await verifyPassword(credential.passwordHash, plain);',
  },
  {
    identifier: 'password_hash',
    line: '  await db.execute(sql`select sub, password_hash from auth_users`);',
  },
  {
    identifier: 'tokenHash',
    line: '  export interface SessionRow { readonly tokenHash: string }',
  },
  {
    identifier: 'token_hash',
    line: '  const where = sql`token_hash = ${hashSessionToken(token)}`;',
  },
];

// ---------------------------------------------------------------------------
// Synthetic file body
// ---------------------------------------------------------------------------

// Clean on both sides of the plant, so a case reporting one match
// reports it for the planted line and for nothing else. These lines are
// asserted clean nowhere, and do not have to be: a rostered name in any
// of them turns every case below red by adding a second match to a
// result asserted to hold exactly one.

const CLEAN_LINES_BEFORE: readonly string[] = [
  'A body of ordinary source, naming neither stored hash in either of',
  'its two spellings, wrapped around the one line that does.',
];

const CLEAN_LINES_AFTER: readonly string[] = [
  'The matcher reads content line by line and never parses it, so the',
  'code around a plant makes no difference to the hit it reports.',
];

/** 1-based, matching what the matcher reports and what an editor shows. */
const PLANTED_LINE_NUMBER = CLEAN_LINES_BEFORE.length + 1;

/**
 * Path the samples are attributed to. Named but never opened: the
 * matcher takes content, so this only has to be the string it carries
 * back into the report. Fabricated rather than real, so no case here
 * can be read as a claim about a file that exists.
 */
const SAMPLE_FILE_PATH = 'src/example/repository.ts';

/** The sample line surrounded by clean content, as one file's worth. */
function plantInFile(line: string): string {
  return [...CLEAN_LINES_BEFORE, line, ...CLEAN_LINES_AFTER].join('\n');
}

// ---------------------------------------------------------------------------
// Matcher liveness
// ---------------------------------------------------------------------------

describe('findHashIdentifiers — planted samples', () => {
  // Without this, an identifier added to the roster with no sample
  // beside it is one nothing proves can still match, and the suite
  // stays green while coverage shrinks — the same vacuous pass the walk
  // guards against by refusing a scan root that contributes nothing.
  it('plants a sample for every identifier the roster declares', () => {
    const planted = PLANTED_SAMPLES.map((sample) => sample.identifier);
    const declared = HASH_IDENTIFIERS.map((entry) => entry.identifier);

    expect([...planted].sort()).toEqual([...declared].sort());
  });

  for (const sample of PLANTED_SAMPLES) {
    // Exact equality on the whole record, not a length or a containment
    // check: it pins the hit to the planted line rather than to any hit
    // anywhere in the body, and it fails if a sample starts matching a
    // second identifier as well — which is how a spelling widened past
    // its own name first shows up.
    it(`flags ${sample.identifier} on the line it occurs`, () => {
      const matches = findHashIdentifiers(
        plantInFile(sample.line),
        SAMPLE_FILE_PATH,
      );

      const expected: HashIdentifierMatch = {
        identifier: sample.identifier,
        filePath: SAMPLE_FILE_PATH,
        lineNumber: PLANTED_LINE_NUMBER,
        line: sample.line,
      };

      expect(matches).toStrictEqual([expected]);
    });
  }

  // Every sample above is spelled the way the code already spells it,
  // so none of them would notice the matcher's case-insensitive flag
  // going — measured, dropping it reddens this case and no other in
  // the file. This is the one plant whose casing is not a declared
  // one: the same column becomes `PasswordHash` the moment somebody
  // names a type after it, and a case-sensitive scan is one that
  // rename walks straight past.
  //
  // Reported under the roster's own spelling rather than the matched
  // text, which is what makes a hit in any casing fixable by looking
  // up the one entry that describes it.
  it('flags a rostered identifier in another casing', () => {
    const line = '  type PasswordHash = string;';
    const matches = findHashIdentifiers(plantInFile(line), SAMPLE_FILE_PATH);

    const expected: HashIdentifierMatch = {
      identifier: 'passwordHash',
      filePath: SAMPLE_FILE_PATH,
      lineNumber: PLANTED_LINE_NUMBER,
      line,
    };

    expect(matches).toStrictEqual([expected]);
  });
});

describe('findHashIdentifiers — permitted files', () => {
  // The liveness leg the repository maintains for free, and the
  // stronger of the two. Planted samples prove the roster matches
  // strings this file wrote; these prove it matches the code the rule
  // is about, which is the half that goes stale on its own — rename
  // either column in `src/auth/` and in the schema together and the
  // roster matches nothing anywhere, with every other case here still
  // green.
  //
  // Reported as the identifiers that went unseen rather than as a
  // count, so a failure names which spelling stopped occurring. The
  // permitted set being non-empty is established by the surface case
  // above; a run that reached here over no files would report all four.
  it('finds every rostered identifier inside the permitted set', () => {
    const found = PERMITTED_FILES.flatMap((relativePath) => {
      const content = readFileSync(join(PACKAGE_ROOT, relativePath), 'utf8');

      return findHashIdentifiers(content, relativePath);
    });

    const seen = new Set(found.map((match) => match.identifier));
    const declared = HASH_IDENTIFIERS.map((entry) => entry.identifier);
    const unseen = declared.filter((identifier) => !seen.has(identifier));

    expect(unseen).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Contents
// ---------------------------------------------------------------------------

/**
 * One hit, in the form the failure list prints it.
 *
 * The identifier is the useful half — it says which of the two hashes
 * escaped — and printing it is safe, unlike the de-origination reports
 * next door: these are names the repository declares on purpose. The
 * offending line is left out all the same. A failure list reaches CI
 * logs and terminal scrollback, and source quoted there is source
 * nobody can open or fix; the file and line are what lead to the one
 * place it can be.
 */
function formatMatch(match: HashIdentifierMatch): string {
  return `${match.filePath}:${match.lineNumber} — ${match.identifier}`;
}

describe('auth containment — contents', () => {
  // Compared against an empty array rather than against a count, so the
  // failure diff is the list of hits itself: every one of them, each
  // naming its own file and line, instead of a number to go chasing.
  //
  // Files are read here rather than at module scope, so a path that has
  // gone missing between the walk and the read belongs to this case,
  // which fails naming it.
  it('names no stored hash outside the permitted set', () => {
    const found = SCANNED_FILES.flatMap((relativePath) => {
      const content = readFileSync(join(PACKAGE_ROOT, relativePath), 'utf8');

      return findHashIdentifiers(content, relativePath).map(formatMatch);
    });

    expect(found).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Scan-root fixtures
// ---------------------------------------------------------------------------

// The walk is asserted against real directories rather than a mocked
// `node:fs`. What it has to get right is filesystem behaviour — a path
// that is a file where a directory was declared, a root holding nothing
// the scan is allowed to read — and a mock of that behaviour proves
// only that the mock and the assertion were written to agree.

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
 * The permitted directory the last case fills its root with, and the
 * declared root that directory sits under.
 *
 * Named here rather than written inline so the case can pin both to the
 * module's own lists before building anything on them: a fixture whose
 * directory is no longer permitted, or no longer under a declared root,
 * would leave the walk with a file it is allowed to read and turn the
 * case into an assertion about nothing.
 */
const PERMITTED_DIR = 'src/auth';
const PERMITTED_DIR_ROOT = 'src';

/** One way a declared root stops contributing files. */
interface RootSabotage {
  /** Reads as the case name: `refuses a root that <label>`. */
  readonly label: string;
  /**
   * Puts the root path into that state, having first been handed a root
   * whose contents were removed — so a sabotage that does nothing
   * leaves the root absent.
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
  // filesystem at all here, which makes this the case that would pass
  // in silence were the walk to take its own root list on trust.
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
];

/** A miniature package root with one plain file inside every root. */
function makeFixture(): string {
  const packageRoot = mkdtempSync(join(tmpdir(), 'ar-auth-scan-'));
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
 * Only {@link EmptyScanError} counts as a refusal; anything else is
 * rethrown. A missing directory arriving as a bare filesystem error is
 * a different event from the walk naming a root it will not accept, and
 * folding the two together would let a walk that had stopped working
 * pass an assertion about coverage.
 */
function refusedRoot(packageRoot: string): string | null {
  try {
    collectScannedFiles(packageRoot);
  } catch (thrown) {
    if (thrown instanceof EmptyScanError) {
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
  // fixture and breaks exactly one root, so a refusal says something
  // only while the untouched tree is one the walk accepts and reports
  // in full — otherwise a fixture nothing could walk would satisfy all
  // of them.
  it('returns every file when each declared root is populated', () => {
    const expected = SCAN_ROOTS.map((root) => `${root}/${FIXTURE_FILE}`);

    expect(collectScannedFiles(makeFixture())).toEqual(expected);
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

  // This invariant's own shape, and the one no filesystem error
  // reports: a root that is present, readable and populated, holding
  // nothing but paths the rule permits. The walk prunes before it
  // counts, so it refuses this exactly as it refuses an empty root —
  // which is the intended reading rather than an edge case. The
  // permitted set would then be the whole of that root, and the scan
  // would have read no file it is allowed to fail on.
  it('refuses a root left holding nothing but permitted paths', () => {
    expect(SCAN_ROOTS).toContain(PERMITTED_DIR_ROOT);
    expect(PERMITTED_PATHS).toContain(PERMITTED_DIR);

    const packageRoot = makeFixture();

    rmSync(join(packageRoot, PERMITTED_DIR_ROOT), { recursive: true });
    mkdirSync(join(packageRoot, PERMITTED_DIR), { recursive: true });
    writeFileSync(
      join(packageRoot, PERMITTED_DIR, FIXTURE_FILE),
      FIXTURE_CONTENT,
    );

    expect(refusedRoot(packageRoot)).toBe(PERMITTED_DIR_ROOT);
  });
});
