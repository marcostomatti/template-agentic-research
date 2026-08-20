/**
 * @packageDocumentation
 * The generated migration text the static-SQL invariant reads, and the
 * two ways that read comes back saying less than it appears to.
 *
 * Split from the assertions for the reason the naming invariant splits
 * the same way: a scan is worth no more than the input it was handed.
 * The assertions themselves are must-find, so an empty read does turn
 * them red — but red against the constraints, every one of them at
 * once, when the one thing that went wrong is that nothing was read.
 * Refusing here is what makes that failure say so.
 *
 * The emptied-file half is the one no assertion covers. They name a
 * chosen roster of constraints rather than the whole schema, so a
 * migration truncated to nothing loses everything it carried outside
 * that roster without a single case turning red.
 *
 * Only `*.sql` is read, and that filter is load-bearing rather than
 * tidiness. `drizzle/meta/` holds one snapshot per migration that
 * serializes every constraint name and every CHECK predicate verbatim,
 * so a reader taking the whole directory would still find a constraint
 * after its statement was deleted from the SQL — and the plant/revert
 * control on this suite would pass while proving nothing. The naming
 * invariant reads every file under that same directory and is right
 * to: a forbidden name is worth reporting wherever it is stored, while
 * a constraint is only real where the migrator will run it.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The generated migration directory, resolved from this file's own
 * location rather than from the working directory.
 *
 * `drizzle.config.ts` declares `./drizzle` as its `out`, relative to
 * the package. A reader keyed on the working directory would agree
 * with that only while the suite is started from the package, and
 * resolve somewhere else — or nowhere — from the repo root.
 */
export const MIGRATIONS_DIR = fileURLToPath(
  new URL('../../drizzle', import.meta.url),
);

/**
 * Thrown when a directory holds no `*.sql` file to read.
 *
 * Covers a directory that is absent, one that is not a directory at
 * all, and one that is there and holds nothing matching. All three
 * mean the same thing to a caller — there is no migration text — and
 * that is one fact worth reporting once, the way the naming
 * invariant's walk folds a missing root into its empty-root error.
 *
 * A distinct class rather than a bare `Error`, so the case covering
 * this path can pin the failure to this cause. A permission refusal
 * and an unreadable entry reach a caller as `Error` too, and an
 * assertion that accepted any of them would pass for the wrong reason.
 */
export class EmptyMigrationDirectoryError extends Error {
  /** Directory that yielded nothing, exactly as the caller named it. */
  readonly directory: string;

  /**
   * @param directory - Directory that was read, or that was not there
   * to read.
   */
  constructor(directory: string) {
    super(
      `No .sql file resolved under ${directory}. Every assertion in ` +
      'the static-SQL invariant then fails at once, each naming the ' +
      'constraint it went looking for rather than the one thing that ' +
      'went wrong: either the migrations moved, or the reader was ' +
      'pointed at the wrong tree.',
    );
    this.name = this.constructor.name;
    this.directory = directory;
  }
}

/**
 * Thrown when a `*.sql` file under the migration directory is empty.
 *
 * Empty means nothing but whitespace: a file holding a single newline
 * contributes exactly as much SQL as a zero-byte one does.
 *
 * This is the half of the read that no assertion covers. The invariant
 * asserts a chosen roster of constraints, so a migration truncated to
 * nothing takes whatever it carried outside that roster with it and
 * leaves every case green. It is also the one failure the returned
 * file list would otherwise misreport: a file named there while
 * contributing no text claims coverage the text does not have.
 *
 * Raised on the first such file rather than collected across all of
 * them. There is nothing to assert about the contents once any part of
 * them is missing, and the name of one truncated migration is enough
 * to send a reader to the directory holding the rest.
 */
export class EmptyMigrationFileError extends Error {
  /** Name of the empty file, relative to `directory`. */
  readonly file: string;

  /**
   * Directory the file was read from, carried because the same file
   * name is populated or empty depending on which tree it came out of.
   */
  readonly directory: string;

  /**
   * @param file - Name of the empty file, relative to `directory`.
   * @param directory - Directory it was read from.
   */
  constructor(file: string, directory: string) {
    super(
      `Migration '${file}' under ${directory} holds no SQL. A file ` +
      'read but contributing nothing overstates what the invariant ' +
      'covered, and whatever that migration carried outside the ' +
      'asserted roster is gone with no case left to report it.',
    );
    this.name = this.constructor.name;
    this.file = file;
    this.directory = directory;
  }
}

/** The generated migration SQL, and the files it was read from. */
export interface MigrationSql {
  /**
   * Names of the `*.sql` files read, relative to the directory they
   * came out of, sorted by name.
   *
   * Sorted because `readdirSync` returns directory order — stable on
   * one machine, arbitrary across them — and the text below is built
   * by concatenating in this order. drizzle-kit's zero-padded numeric
   * prefix makes that sort the order the migrator applies them in, up
   * to the four digits it pads to.
   *
   * Not the journal, though. `drizzle/meta/_journal.json` is what
   * decides which migrations run and in what order, and this reader
   * never opens it: a file left on disk after being dropped from the
   * journal still contributes its text here.
   */
  readonly files: readonly string[];

  /**
   * The files' contents in `files` order, joined by a newline.
   *
   * Nothing is inserted but that separator, so text found here was
   * written in a migration rather than assembled by the read. The
   * separator earns its place: drizzle's generated migrations end
   * without a trailing newline, so a bare concatenation would fuse one
   * file's last statement onto the next file's first line and produce
   * a line neither of them contains.
   *
   * It is also all that separates them, so a pattern spanning lines
   * can still match across a file boundary and report something no
   * single migration carries.
   */
  readonly text: string;
}

/**
 * Every `*.sql` file under `directory`, and their contents as one
 * string.
 *
 * Reads the directory itself and does not recurse: drizzle-kit writes
 * every migration flat into its `out`, and the only subdirectory is
 * `meta/`, which this reader has a stated reason to stay out of.
 *
 * Throws {@link EmptyMigrationDirectoryError} when nothing resolves,
 * and {@link EmptyMigrationFileError} on the first file that holds no
 * SQL. Both are refusals to hand back something that reads as coverage
 * — the one thing a caller cannot check for itself, because an
 * assertion over an empty string reports the constraint it looked for
 * and never the string it looked in.
 *
 * @param directory - Where to read from. Defaults to
 * {@link MIGRATIONS_DIR}, the migrations this package generates; a
 * caller passes a directory of its own to reach the two refusals
 * above, which is otherwise only reachable by emptying the package.
 * @returns The file names read, and their concatenated contents.
 */
export function readMigrationSql(
  directory: string = MIGRATIONS_DIR,
): MigrationSql {
  const stats = statSync(directory, { throwIfNoEntry: false });

  if (stats === undefined || !stats.isDirectory()) {
    throw new EmptyMigrationDirectoryError(directory);
  }

  const files = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  if (files.length === 0) {
    throw new EmptyMigrationDirectoryError(directory);
  }

  const contents = files.map((file) => {
    const content = readFileSync(join(directory, file), 'utf8');

    if (content.trim() === '') {
      throw new EmptyMigrationFileError(file, directory);
    }

    return content;
  });

  return { files, text: contents.join('\n') };
}
