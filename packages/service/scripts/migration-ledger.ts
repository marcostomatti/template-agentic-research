/**
 * @packageDocumentation
 * Drizzle's two records of a schema, read and held against each
 * other. The journal, `drizzle/meta/_journal.json`, decides which
 * migrations the migrator runs and in what order; the ledger,
 * `drizzle.__drizzle_migrations`, is the row the migrator writes into
 * a database as it applies each one. {@link readMigrationJournal}
 * reads the first, {@link readAppliedMigrationTags} reads the second,
 * and {@link compareMigrationTags} names where the two disagree.
 *
 * ONE DECLARATION FOR EVERY READER. The two readers were written for
 * the live suite, in `tests/live/live-postgres.ts`, and moved here so
 * that a script reading a deployment's ledger names a row the way
 * `tests/live/schema.live.test.ts` names one of `ar_live`'s. That
 * file re-exports them rather than keeping a copy, so how a ledger
 * row is named cannot come apart between the two.
 *
 * A HALF, NOT A COMMAND. No `package.json` script names this file and
 * it carries no `INVOKED_AS_CLI` block, so importing it runs nothing.
 *
 * IT READS AND WRITES NOTHING. The journal is read off disk and the
 * ledger through one `SELECT`, sent over a client handed in. No
 * migrator is imported: `applyMigrations` in
 * `tests/live/live-postgres.ts` is the writer, and it stays there
 * behind `assertLiveDatabase`.
 *
 * THE COMPARISON IS PURE. {@link compareMigrationTags} takes two lists
 * of tags and opens nothing, so every disagreement it names can be
 * driven from literals. What each disagreement is worth is the
 * caller's to decide: a list naming a tag is a reading, not a verdict.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * One entry of `drizzle/meta/_journal.json` — the file that decides
 * which migrations the migrator runs, and in what order.
 */
export interface MigrationJournalEntry {
  /** The migration's file stem, without the `.sql` extension. */
  readonly tag: string;

  /**
   * The millisecond stamp drizzle-kit wrote into the entry, and the
   * value its migrator stores as `created_at` on applying it.
   *
   * The only key the journal and the ledger share. The ledger keeps no
   * name, so a row there is attributable to a migration through this
   * and through nothing else.
   */
  readonly when: number;
}

/** This package's journal, located from this file. */
const MIGRATION_JOURNAL = fileURLToPath(
  new URL('../drizzle/meta/_journal.json', import.meta.url),
);

/**
 * The migrations the journal names, in the order it names them.
 *
 * Resolved from this file's own location rather than the working
 * directory, the way `tests/invariants/schema-sql.ts` resolves the
 * same directory. `applyMigrations` in `tests/live/live-postgres.ts`
 * hands the migrator a cwd-relative `./drizzle`, which is right only
 * while the suite is started from the package; a reader keyed the
 * same way would inherit that for no gain.
 *
 * Throws rather than returning an empty list when the journal names
 * nothing. A comparison against `[]` passes for a database that has
 * applied no migration at all, which is the one answer a case
 * asserting they were applied must not accept — and
 * {@link compareMigrationTags} over two empty lists names nothing, so
 * this refusal is what stands in front of that answer.
 *
 * @param journalPath - Journal to read. Defaults to this package's
 * own; a caller passes one of its own only to reach the refusal
 * above, which is otherwise reachable only by emptying the package.
 * @returns The journal's entries, in journal order.
 * @throws Error When the journal names no migration.
 */
export function readMigrationJournal(
  journalPath: string = MIGRATION_JOURNAL,
): readonly MigrationJournalEntry[] {
  const parsed: unknown = JSON.parse(readFileSync(journalPath, 'utf8'));
  const { entries = [] } = parsed as { entries?: readonly MigrationJournalEntry[] };

  if (entries.length === 0) {
    throw new Error(
      `[migration-ledger] ${journalPath} names no migration — a comparison against nothing would pass for any database.`,
    );
  }

  return entries;
}

/**
 * One row of the ledger, as far as {@link readAppliedMigrationTags}
 * reads it.
 *
 * The migrator's own `CREATE TABLE` declares `created_at` a `bigint`
 * with no `NOT NULL`, and the `pg` driver answers a `bigint` as a
 * string, so a string and a null are what a row can carry.
 */
export interface MigrationLedgerRow {
  readonly created_at: string | null;
}

/**
 * What {@link readAppliedMigrationTags} needs of a database client:
 * one query, sent as text, answering rows.
 *
 * A slice rather than `pg`'s `Pool`, so a case can hand over a client
 * that records the statement it was sent and answers rows written out
 * beside it, with no server. The live suite hands over a `Pool`.
 * `check-types` accepting one here says less than it looks: measured,
 * `Pool` also assigns to a slice of this shape whose answer carries no
 * `rows` member at all, so what holds a `Pool` to this slice is a live
 * run and not the type checker.
 */
export interface MigrationLedgerClient {
  query(text: string): Promise<{ readonly rows: readonly MigrationLedgerRow[] }>;
}

/**
 * The one statement {@link readAppliedMigrationTags} sends.
 *
 * `id` is the ledger's `SERIAL` key, so ordering by it answers the
 * rows in the order they were inserted.
 */
const LEDGER_QUERY = 'SELECT "created_at" FROM drizzle."__drizzle_migrations" ORDER BY "id"';

/**
 * The migrations this database records as applied, named, in the order
 * the migrator applied them.
 *
 * Reads drizzle's own ledger — schema `drizzle`, table
 * `__drizzle_migrations`. Both are the migrator's defaults and
 * `applyMigrations` in `tests/live/live-postgres.ts` overrides
 * neither, so they are where it writes; a drizzle that moved them
 * fails this query loudly rather than reporting an empty ledger.
 *
 * The ledger stores a stamp and no name, so each row is named back
 * through {@link readMigrationJournal}. A row whose stamp the journal
 * does not carry comes back as `unrecognized(<stamp>)` rather than
 * being dropped — a migration applied here and since removed from the
 * journal is a difference worth reporting, not one worth hiding.
 *
 * @param client - Client to read the ledger through; the live suite
 * hands over its `Pool`.
 * @returns One tag per ledger row, in application order.
 */
export async function readAppliedMigrationTags(
  client: MigrationLedgerClient,
): Promise<readonly string[]> {
  const tagByWhen = new Map(
    readMigrationJournal().map((entry): [number, string] => [entry.when, entry.tag]),
  );
  const { rows } = await client.query(LEDGER_QUERY);

  return rows.map((row) => tagByWhen.get(Number(row.created_at)) ?? `unrecognized(${row.created_at})`);
}

/**
 * Where a ledger and the journal it was applied from disagree, named
 * by tag.
 */
export interface MigrationComparison {
  /**
   * Journal tags the ledger holds no row for, in journal order.
   *
   * Pending is not the same as one `db:migrate` away. Read off
   * `migrate` in drizzle-orm 0.45.2's `pg-core/dialect.js`, the
   * migrator reads only the ledger's newest row by `created_at` and
   * applies an entry only where its `when` is greater, so a pending
   * tag stamped below that row is one it passes over on every run.
   */
  readonly pending: readonly string[];

  /**
   * Ledger tags the journal does not carry, in ledger order and once
   * per row.
   */
  readonly unrecognized: readonly string[];

  /**
   * Recognized ledger rows applied out of journal order, in ledger
   * order and once per row.
   *
   * A ledger in journal order climbs the journal, so each recognized
   * row is held against the furthest journal position any recognized
   * row before it reached. A row at or behind that position is named:
   * a migration applied after one the journal places after it, or a
   * second row for a migration already applied. The earlier row of
   * such a pair is not named, being in order when it was applied.
   * Unrecognized rows hold no journal position and are passed over
   * here, since they have a list of their own.
   */
  readonly outOfOrder: readonly string[];

  /**
   * Whether all three lists are empty.
   *
   * For a journal naming each tag once, that is exactly when the
   * ledger names the journal's tags in full, once each, in journal
   * order: no pending tag says every one is there, no unrecognized
   * row says nothing else is, and no row out of order says each
   * appears once and in order.
   */
  readonly matchesJournal: boolean;
}

/**
 * Holds the tags a ledger names against the journal's, and names every
 * disagreement between them.
 *
 * Nothing is read and nothing is reached, and neither list is written
 * to. A tag is recognized by being one the journal carries and not by
 * how it is spelled, so the `unrecognized(<stamp>)` name
 * {@link readAppliedMigrationTags} gives a row is unrecognized here for
 * the same reason any foreign tag would be.
 *
 * An empty journal is not refused: over two empty lists every reading
 * is empty and {@link MigrationComparison.matchesJournal} is true.
 * {@link readMigrationJournal} refuses one before a caller has a list
 * to hand over, and a caller building its list some other way inherits
 * that gap.
 *
 * @param journal - The journal's tags, in journal order.
 * @param applied - The ledger's tags, in the order its rows were
 * applied.
 * @returns The three readings, and whether all of them are empty.
 */
export function compareMigrationTags(
  journal: readonly string[],
  applied: readonly string[],
): MigrationComparison {
  const positionOf = new Map(journal.map((tag, index): [string, number] => [tag, index]));
  const appliedTags = new Set(applied);
  const pending = journal.filter((tag) => !appliedTags.has(tag));
  const unrecognized = applied.filter((tag) => !positionOf.has(tag));
  const outOfOrder: string[] = [];
  let furthest = -1;

  for (const tag of applied) {
    const position = positionOf.get(tag);

    if (position === undefined) {
      continue;
    }

    if (position <= furthest) {
      outOfOrder.push(tag);
      continue;
    }

    furthest = position;
  }

  return {
    matchesJournal: pending.length === 0 && unrecognized.length === 0 && outOfOrder.length === 0,
    outOfOrder,
    pending,
    unrecognized,
  };
}
