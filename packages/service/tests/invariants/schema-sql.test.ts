/**
 * The static-SQL invariant: what the generated migration is required to
 * say, and the read that hands it over.
 *
 * The assertions over what the migration says are must-find, so the one
 * input they cannot report is the one they were never handed. A read
 * that came back with nothing turns every one of them red at once, each
 * naming a constraint it went looking for and none of them naming the
 * empty string it looked in. `readMigrationSql` refuses instead, and
 * the first half of this file is where those refusals are shown to
 * happen.
 *
 * Every case about the read runs against a directory on disk rather
 * than a mocked `node:fs`. What the read has to get right is filesystem
 * behaviour — a path that is a file where a directory was expected, a
 * `.sql` sitting one level down — and a mock of that behaviour proves
 * only that the mock and the assertion were written to agree.
 *
 * The refusals rest on the control above them. A read that threw for
 * whatever it was handed would satisfy every one of them, so the
 * populated fixture is asserted first: what these cases establish, they
 * establish about a read that returns text when there is text to
 * return.
 *
 * The assertions themselves take no fixture at all. The directory
 * parameter exists so those two refusals are reachable without emptying
 * the package, and the sweep over the roster calls `readMigrationSql`
 * with no argument, against the migrations this package generates.
 *
 * The last case asks something the roster deliberately does not. Every
 * entry there is one string the migration has to carry, which is a
 * question about the constraint rather than about what it lets through
 * — so the members behind `sources.kind` are compared against
 * `SOURCE_KINDS` itself, the tuple the CHECK was generated from. The
 * two sides are independent in the way that matters: one is TypeScript
 * somebody edits, the other is SQL a generator wrote, and widening the
 * first without re-running the second is exactly the state where the
 * union a caller programs against and the constraint the database
 * enforces stop describing the same set.
 *
 * What that sweep is evidence about is the repository, never a
 * database. A constraint dropped at a psql prompt leaves every
 * statement asserted here exactly where it was, and the live suite is
 * the only seam that watches a database refuse a write — the point
 * `schema-sql.ts` makes at the roster itself.
 */
import type { SchemaSqlAssertion } from './schema-sql.js';

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { SOURCE_KINDS } from '../../src/db/schema/values.js';

import {
  EmptyMigrationDirectoryError,
  EmptyMigrationFileError,
  SCHEMA_SQL_ASSERTIONS,
  readMigrationSql,
  sourceKindCheckMembers,
} from './schema-sql.js';

// ---------------------------------------------------------------------------
// Fixture material
// ---------------------------------------------------------------------------

/** What `drizzle.config.ts` names as its `out`, one level down. */
const MIGRATIONS_NAME = 'drizzle';

/** The subdirectory the real migration directory keeps beside its SQL. */
const META_DIR = 'meta';

const FIRST_FILE = '0000_first.sql';
const SECOND_FILE = '0001_second.sql';

/** A file the real directory holds that carries no statement to run. */
const JOURNAL_FILE = '_journal.json';

/**
 * Fixture SQL, one distinct statement per file and neither ending in a
 * newline.
 *
 * Both halves are deliberate. Distinct, so the concatenation cannot be
 * satisfied by either file twice; unterminated, because that is how
 * drizzle writes a migration, and it is the reason the read has a
 * separator to get right at all.
 */
const FIRST_SQL = 'CREATE TABLE "first" ("id" bigint);';
const SECOND_SQL = 'CREATE TABLE "second" ("id" bigint);';

/** A migration truncated to nothing, in the shape truncation leaves. */
const BLANK_SQL = '\n   \n';

/** Never read: the journal is there to be skipped, not parsed. */
const JOURNAL_CONTENT = '{}\n';

// ---------------------------------------------------------------------------
// Fixture directories
// ---------------------------------------------------------------------------

/** Fixture trees created below, removed once this file finishes. */
const FIXTURE_DIRS: string[] = [];

afterAll(() => {
  for (const fixtureDir of FIXTURE_DIRS) {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
});

/**
 * A fresh empty directory, registered for removal.
 *
 * One per case rather than one shared between them, so a case that
 * leaves a file behind can never decide what the next one reads.
 */
function makeFixtureDir(): string {
  const directory = mkdtempSync(join(tmpdir(), 'ar-schema-sql-'));

  FIXTURE_DIRS.push(directory);

  return directory;
}

/** One way a directory yields no `.sql` file to read. */
interface EmptyDirectoryShape {
  /** Reads as the case name: `refuses a directory that <label>`. */
  readonly label: string;

  /**
   * Puts the migration path into that state, having been handed a path
   * inside a fresh fixture directory that nothing has created yet — so
   * a shape that does nothing leaves it absent.
   */
  readonly apply: (migrationsDir: string) => void;
}

const EMPTY_DIRECTORY_SHAPES: readonly EmptyDirectoryShape[] = [
  // Nothing is put there: the directory that was renamed, or a read
  // pointed at a tree that never held migrations. It is also the shape
  // that has to be caught before `readdirSync` reaches it, so a caller
  // is told which path came back empty rather than handed an ENOENT
  // out of the middle of the read.
  {
    label: 'is missing altogether',
    apply: () => {},
  },
  // Present, readable, and holding nothing. The filesystem reports no
  // error at all here, which makes it the shape a read taking its own
  // directory on trust would pass in silence.
  {
    label: 'exists but holds nothing',
    apply: (migrationsDir) => mkdirSync(migrationsDir),
  },
  // A file where a directory was expected, which is what the path
  // becomes when something is renamed onto it.
  {
    label: 'is a file rather than a directory',
    apply: (migrationsDir) => writeFileSync(migrationsDir, FIRST_SQL),
  },
  // Populated, and with what the real directory keeps beside its
  // migrations. A read that stopped filtering by extension would find
  // the journal and the snapshots here — and a snapshot serializes
  // every constraint name and every CHECK predicate verbatim, so it
  // would go on reporting a constraint whose statement is gone.
  {
    label: 'holds only files that are not .sql',
    apply: (migrationsDir) => {
      mkdirSync(migrationsDir);
      writeFileSync(join(migrationsDir, JOURNAL_FILE), JOURNAL_CONTENT);
    },
  },
  // The SQL is there, one level down. Split from the shape above
  // because the two fail on different causes and either alone leaves
  // the other uncovered: a read that stopped filtering by extension
  // passes this one, and a read that started recursing passes that one.
  {
    label: 'holds a .sql file only in a subdirectory',
    apply: (migrationsDir) => {
      mkdirSync(join(migrationsDir, META_DIR), { recursive: true });
      writeFileSync(join(migrationsDir, META_DIR, FIRST_FILE), FIRST_SQL);
    },
  },
];

/** A migration path inside a fixture tree, in one of those shapes. */
function makeEmptyDirectory(shape: EmptyDirectoryShape): string {
  const migrationsDir = join(makeFixtureDir(), MIGRATIONS_NAME);

  shape.apply(migrationsDir);

  return migrationsDir;
}

// ---------------------------------------------------------------------------
// Refusals
// ---------------------------------------------------------------------------

/** Returned when the read ran to the end instead of refusing. */
const NOT_REFUSED = '(nothing refused)';

/**
 * The directory {@link readMigrationSql} refused, or
 * {@link NOT_REFUSED} when it read the fixture through.
 *
 * Only {@link EmptyMigrationDirectoryError} counts as a refusal, and
 * anything else is rethrown. A filesystem error surfacing from the
 * middle of the read is a different event from the read naming a
 * directory it will not accept, and folding the two together would let
 * a read that had stopped working pass every case below.
 */
function refusedDirectory(directory: string): string {
  try {
    readMigrationSql(directory);
  } catch (thrown) {
    if (thrown instanceof EmptyMigrationDirectoryError) {
      return thrown.directory;
    }

    throw thrown;
  }

  return NOT_REFUSED;
}

/**
 * The file {@link readMigrationSql} refused as empty, or
 * {@link NOT_REFUSED} when it read the fixture through.
 *
 * Separated from {@link refusedDirectory} by class rather than by
 * message: the two refusals mean different things — nothing to read
 * against something read that carries nothing — and a case satisfied by
 * either would not be asserting which one happened.
 */
function refusedFile(directory: string): string {
  try {
    readMigrationSql(directory);
  } catch (thrown) {
    if (thrown instanceof EmptyMigrationFileError) {
      return thrown.file;
    }

    throw thrown;
  }

  return NOT_REFUSED;
}

// ---------------------------------------------------------------------------
// A directory with migrations in it
// ---------------------------------------------------------------------------

describe('readMigrationSql — a directory of migrations', () => {
  // The control every refusal below rests on, and the only case that
  // tells a read that refuses an empty directory from one that refuses
  // whatever it is handed.
  //
  // The text is compared against the exact join rather than searched
  // for each half, which pins the one thing the read adds to what it
  // read: a newline between files. Neither fixture ends in one, as
  // drizzle's own migrations do not, so a bare concatenation would run
  // the first statement into the second file's opening line and produce
  // a line neither of them contains.
  //
  // Written to disk in the reverse of the order asserted. That is not
  // proof the sort runs — a filesystem free to return either order is
  // free to return the sorted one — but `files` and `text` are asserted
  // to agree on the order the migrator applies them in.
  it('returns every .sql file it read and their contents joined', () => {
    const directory = makeFixtureDir();

    writeFileSync(join(directory, SECOND_FILE), SECOND_SQL);
    writeFileSync(join(directory, FIRST_FILE), FIRST_SQL);

    expect(readMigrationSql(directory)).toEqual({
      files: [FIRST_FILE, SECOND_FILE],
      text: `${FIRST_SQL}\n${SECOND_SQL}`,
    });
  });
});

// ---------------------------------------------------------------------------
// A directory holding no SQL
// ---------------------------------------------------------------------------

describe('readMigrationSql — a directory holding no SQL', () => {
  for (const shape of EMPTY_DIRECTORY_SHAPES) {
    // Asserted on the directory the refusal carries rather than on the
    // fact that something was thrown. The message sends a reader to a
    // path, and one naming a path the caller never asked about sends
    // them somewhere the migrations were never expected to be.
    it(`refuses a directory that ${shape.label}`, () => {
      const migrationsDir = makeEmptyDirectory(shape);

      expect(refusedDirectory(migrationsDir)).toBe(migrationsDir);
    });
  }
});

// ---------------------------------------------------------------------------
// A migration holding no SQL
// ---------------------------------------------------------------------------

describe('readMigrationSql — a migration holding no SQL', () => {
  // The half of the read no assertion over the text covers. Those name
  // a chosen roster of constraints, so a migration truncated to nothing
  // takes whatever it carried outside that roster with it and leaves
  // every case green — while the file list goes on naming it, claiming
  // coverage the text no longer has.
  //
  // Whitespace rather than zero bytes: that is what a truncation
  // leaves, and it is the shape that still reads as a file on disk.
  //
  // It sits beside a populated migration so the refusal is about the
  // file rather than about the directory. A directory of this shape is
  // exactly what the control above reads through.
  it('refuses a .sql file holding nothing but whitespace', () => {
    const directory = makeFixtureDir();

    writeFileSync(join(directory, FIRST_FILE), FIRST_SQL);
    writeFileSync(join(directory, SECOND_FILE), BLANK_SQL);

    expect(refusedFile(directory)).toBe(SECOND_FILE);
  });
});

// ---------------------------------------------------------------------------
// The generated migration
// ---------------------------------------------------------------------------

/**
 * The migrations this package generates, read once for the whole file.
 *
 * At module scope for the reason the naming invariant resolves its scan
 * surface there: a read that cannot hand back migration text throws,
 * and that failure belongs to the file rather than to one case. The
 * refusal names the directory that came back empty, which is the one
 * thing worth reporting — the cases below would each report a
 * constraint instead, every one of them, and none of them the read.
 *
 * The cost is that the refusals above cannot run to say the reader
 * still works. They would pass, and passing is not what a reader
 * looking at an empty `drizzle/` needs to be told.
 *
 * Called with no argument, so what is asserted is the package's own
 * migration directory and never a fixture. Nothing the fixtures above
 * hold reaches this text.
 */
const MIGRATION = readMigrationSql();

/** Reported in place of an entry the migration text carries. */
const CARRIED = '(carried)';

/**
 * The entry's id and description when the migration text does not carry
 * its statement, or {@link CARRIED} when it does.
 *
 * Compared against a sentinel rather than asserted as a boolean, so the
 * failure diff is the entry itself. `toBe(true)` reports that something
 * was false and leaves a reader to open this file, find the roster and
 * work out which property of the database went with it — which is what
 * the description is written to say instead, to someone who has opened
 * neither.
 */
function missingStatement(assertion: SchemaSqlAssertion): string {
  if (assertion.pattern.test(MIGRATION.text)) {
    return CARRIED;
  }

  return `${assertion.id} — ${assertion.description}`;
}

describe('static-SQL invariant — the generated migration', () => {
  // In front of the loop rather than left to it. A roster that came
  // back empty generates no case at all, and a describe block with
  // nothing in it is the whole invariant going quiet — this is what
  // names the list it went quiet over.
  it('declares at least one statement to require', () => {
    expect(SCHEMA_SQL_ASSERTIONS.length).toBeGreaterThan(0);
  });

  for (const assertion of SCHEMA_SQL_ASSERTIONS) {
    // Named for the id, so a verbose run lists every entry the sweep
    // reached and a new one is visible as a case that was collected
    // rather than as a count that moved.
    //
    // One case per entry rather than one sweep reporting all the
    // misses together. The roster is eight hand-written entries, not a
    // tree of unknown size, and a case per entry is what lets the run
    // itself say which ids were exercised.
    it(`carries the statement behind ${assertion.id}`, () => {
      expect(missingStatement(assertion)).toBe(CARRIED);
    });
  }
});

// ---------------------------------------------------------------------------
// The sources.kind value set
// ---------------------------------------------------------------------------

/** Sorted copy, so an equality is over members rather than over order. */
function sorted(members: readonly string[]): readonly string[] {
  return [...members].sort();
}

describe('static-SQL invariant — the sources.kind value set', () => {
  // Equality rather than a search per member, which is what makes the
  // case fail in both directions: on a member the tuple grew and the
  // migration never heard about, and on a literal the CHECK admits
  // that the tuple no longer declares. Only the second of those is
  // visible from the database, and neither is visible from the roster
  // entry above — it stops at the opening parenthesis for this reason.
  //
  // `SOURCE_KINDS` is imported rather than written out here, unlike the
  // members in `tests/schema/value-sets.test.ts`. That file is what
  // holds the tuple to a set somebody typed by hand; this one is about
  // the tuple and the generated SQL agreeing, so importing one side is
  // the assertion rather than a shortcut around it.
  it('names exactly the members of SOURCE_KINDS', () => {
    const members = sourceKindCheckMembers(MIGRATION.text);

    expect(sorted(members)).toEqual(sorted(SOURCE_KINDS));
  });
});
