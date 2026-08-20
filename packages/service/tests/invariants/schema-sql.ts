/**
 * @packageDocumentation
 * The generated migration text the static-SQL invariant reads, the two
 * ways that read comes back saying less than it appears to, and the
 * roster of constraints asserted over it.
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
 *
 * The roster is data here rather than assertions for the same reason
 * `FORBIDDEN_PATTERNS` sits in `naming-patterns.ts` and not in the
 * suite that runs it: what is asserted stays readable in a file `tsc`
 * checks, and the suite can ask whether it reached every entry rather
 * than only whether the entries it reached passed.
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

/** One thing the generated migration is required to say. */
export interface SchemaSqlAssertion {
  /**
   * Stable identifier, unique across the table. Reported in the
   * failure message, and what the suite pairs its cases to so an
   * entry no case ever ran is reported rather than assumed covered.
   *
   * Names the rule rather than the mechanism carrying it, so a
   * constraint moving between a generated and a hand-written
   * migration does not move the id somebody reads a failure by.
   */
  readonly id: string;

  /**
   * What the constraint does, printed beside the id on a failure.
   *
   * Written for a reader who has not opened this file: an unmatched
   * regex reports that a string is gone, never which property of the
   * database went with it.
   */
  readonly description: string;

  /**
   * Text the concatenated migration SQL must contain.
   *
   * A `RegExp` here, unlike the regex SOURCE that `ForbiddenPattern`
   * in `naming-patterns.ts` carries. That table is matched globally
   * against each scanned file in turn, so a shared instance would
   * carry `lastIndex` from one file into the next; these are tested
   * once each against one string. None may carry the `g` flag, which
   * is what keeps that true.
   */
  readonly pattern: RegExp;
}

/**
 * The statements the generated migration must carry.
 *
 * Eight entries over the constraints the parent design calls
 * database-level: the approval gate on `research_pool`, the category
 * depth guard in both of its halves, the pair of constraints that
 * makes `documents.hash` dedupe, both partial scheduling indexes, and
 * the CHECK behind `sources.kind`.
 *
 * A chosen sample and not the whole schema, which is the whole reason
 * {@link EmptyMigrationFileError} exists: a migration truncated to
 * nothing takes everything outside this roster with it while leaving
 * every case here green.
 *
 * Every pattern pins what makes its constraint work, never its name
 * alone. A name-only match reads as present against a constraint
 * renamed onto a different predicate, an index that lost the `WHERE`
 * clause making it partial, and a trigger downgraded to `FOR EACH
 * STATEMENT` — which is handed a null `NEW` rather than an error, so
 * it admits every write it was attached to refuse.
 *
 * Every pattern is anchored to the start of a line, and that is the
 * one defence this scan has against the failure it is otherwise
 * blindest to. A custom migration ends mid-line-comment, so DDL
 * appended to one without a leading newline lands INSIDE that
 * comment: the migrator reports the file applied, the database gets
 * nothing, and the text is still sitting here to be matched. The
 * anchor turns that into a miss.
 *
 * What none of it proves is anything about a database — the point
 * `0002_category_depth_guard.sql` makes at its own trigger, and it
 * holds for every entry here. Text found in this scan is evidence
 * that the repository asks for the constraint; the live suite is the
 * only seam that watches a database refuse a write.
 */
export const SCHEMA_SQL_ASSERTIONS: readonly SchemaSqlAssertion[] = [
  {
    id: 'research-pool-approval-check',
    description:
      'Approval gate on research_pool: a row may carry a researched_at ' +
      'only once an approved_at is set. The one CHECK in this schema ' +
      'spanning two columns, so it is named for the rule rather than ' +
      'for a column, and the predicate is pinned beside the name.',
    pattern: /^[ \t]*CONSTRAINT "research_pool_approval_check" CHECK \("research_pool"\."researched_at" IS NULL OR "research_pool"\."approved_at" IS NOT NULL\)/m,
  },
  // The depth guard is two entries because it is two statements that
  // fail independently. A function nobody attached is an ordinary
  // function nobody calls, and a database carrying it admits every
  // write it refuses; a trigger naming a function that is not there is
  // refused by the migrator the first time the file runs. One half
  // fails loudly and one half not at all, which is the reason to
  // assert them apart. The migration file argues both at the
  // statements themselves.
  {
    id: 'category-depth-function',
    description:
      'Function behind the category depth cap, which refuses a parent ' +
      'that is itself a child, a row given a parent while it already ' +
      'has children, and a parent belonging to another domain.',
    pattern: /^[ \t]*CREATE OR REPLACE FUNCTION categories_enforce_depth\(\) RETURNS trigger/m,
  },
  {
    id: 'category-depth-trigger',
    description:
      'Attachment of the depth guard to categories. Pins FOR EACH ROW ' +
      'and both events: a statement-level trigger is a silent no-op ' +
      'here, and naming one event leaves the half of the cap that ' +
      'breaks through the other one unguarded.',
    pattern: /^[ \t]*CREATE OR REPLACE TRIGGER categories_enforce_depth_trigger\s+BEFORE INSERT OR UPDATE ON "public"\."categories"\s+FOR EACH ROW\s+EXECUTE FUNCTION categories_enforce_depth\(\);/m,
  },
  // The only entry whose text does not name its own table, and so the
  // only one anchored inside a CREATE TABLE. Two neighbours make that
  // load-bearing rather than pedantic: ingested_files carries a
  // `path_hash text NOT NULL` one table down, and the negated class
  // stops the match at the statement terminator so it can never drift
  // onto it.
  {
    id: 'documents-hash-not-null',
    description:
      'NOT NULL on documents.hash, which is what makes the unique key ' +
      'over it dedupe at all: a null member collides with nothing, so ' +
      'ON CONFLICT DO NOTHING against a nullable hash inserts every ' +
      'time rather than reporting a duplicate.',
    pattern: /^[ \t]*CREATE TABLE "documents" \([^;]*?^[ \t]*"hash" text NOT NULL,/m,
  },
  {
    id: 'documents-hash-unique',
    description:
      'UNIQUE constraint on documents.hash, the half that does the ' +
      'deduping. It catches every row carrying a hash whatever the ' +
      'column allows, so the rows it lets through are exactly the ' +
      'ones with none — which is what the NOT NULL above it closes, ' +
      'and why the two are asserted apart.',
    pattern: /^[ \t]*CONSTRAINT "documents_hash_unique" UNIQUE\("hash"\)/m,
  },
  // Both scheduling indexes carry the WHERE clause in the pattern,
  // because a partial index that lost it is still an index: it is
  // created, it is used, and the only thing that changed is that it
  // now holds a row per disabled unit for a claim query that will
  // never ask for one.
  {
    id: 'topics-dispatch-claim-index',
    description:
      'Partial index the dispatcher claims due topics through, over ' +
      'enabled and next_run_at, qualified by the enabled predicate.',
    pattern: /^[ \t]*CREATE INDEX "topics_dispatch_claim_idx" ON "topics" USING btree \("enabled","next_run_at"\) WHERE "topics"\."enabled";/m,
  },
  {
    id: 'export-subscriptions-dispatch-claim-index',
    description:
      'Partial index the dispatcher claims due export subscriptions ' +
      'through, in the same shape as the topics index beside it.',
    pattern: /^[ \t]*CREATE INDEX "export_subscriptions_dispatch_claim_idx" ON "export_subscriptions" USING btree \("enabled","next_run_at"\) WHERE "export_subscriptions"\."enabled";/m,
  },
  // Stops deliberately at the opening parenthesis of the value list.
  // Which members the CHECK admits is asserted against SOURCE_KINDS by
  // a case of its own, and a pattern spelling them out here would
  // report a widened tuple twice while describing it as a missing
  // constraint once.
  {
    id: 'sources-kind-check',
    description:
      'CHECK constraining sources.kind to the declared value set, ' +
      'which is what selects an adapter for a feed. Pins the ' +
      'constrained column and the membership test; the members ' +
      'themselves are covered against their tuple elsewhere.',
    pattern: /^[ \t]*CONSTRAINT "sources_kind_check" CHECK \("sources"\."kind" in \(/m,
  },
];
