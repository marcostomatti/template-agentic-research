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
 * One entry per constraint the parent design calls database-level: the
 * approval gate on `research_pool` and the one on
 * `source_config_proposals` beside it, the category depth guard in both
 * of its halves, the pair of constraints that makes `documents.hash`
 * dedupe, the read index behind the two per-source `documents` readers,
 * both partial scheduling indexes, the CHECKs behind `sources.kind` and
 * `source_config_proposals.status`, the five holding the two auth
 * tables together — three unique keys, the session-to-user foreign key,
 * and the NOT NULL that bounds a session — the CHECK that makes
 * `operator_settings` a singleton, and the six read indexes the
 * wave-3 API pages are served from.
 *
 * A chosen sample and not the whole schema, which is the whole reason
 * {@link EmptyMigrationFileError} exists: a migration truncated to
 * nothing takes everything outside this roster with it while leaving
 * every case here green.
 *
 * Every pattern pins what makes its constraint work, never its name
 * alone. A name-only match reads as present against a constraint
 * renamed onto a different predicate, an index that lost the `WHERE`
 * clause making it partial, an index whose key order or nulls
 * ordering moved out from under the reader it was added for, and a
 * trigger downgraded to `FOR EACH STATEMENT` — which is handed a
 * null `NEW` rather than an error, so it admits every write it was
 * attached to refuse.
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
      'only once an approved_at is set. A CHECK spanning two columns ' +
      'rather than constraining one, so it is named for the rule ' +
      'rather than for a column, and the predicate is pinned beside ' +
      'the name.',
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
  // The first of the two entries whose text does not name its own
  // table, and so anchored inside a CREATE TABLE. Two neighbours make
  // that load-bearing rather than pedantic: ingested_files carries a
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
  // The one index in this roster that must NOT be qualified, and the
  // pattern says so by ending at the terminator. The two scheduling
  // indexes below pin their predicate because a partial index that
  // lost it is still an index; this one is the inverse. A predicate
  // added here would serve whichever reader it was written for and
  // leave the other on a sequential scan of the corpus table, which
  // Postgres reports by planning around the index rather than by
  // refusing it.
  {
    id: 'documents-source-parse-status-index',
    description:
      'Index over documents by source_id and parse_status, which is ' +
      'what the per-source parse-status aggregate behind the sources ' +
      'list and the failed-parse filter behind the failures queue ' +
      'both read through. Pins the column order, source_id leading ' +
      'because both readers narrow on it first, and pins the ' +
      'terminator behind the column list, so a WHERE qualifying this ' +
      'index is a miss rather than a match.',
    pattern: /^[ \t]*CREATE INDEX "documents_source_parse_status_idx" ON "documents" USING btree \("source_id","parse_status"\);/m,
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
  // The two constraints on source_config_proposals, kept apart for the
  // reason the depth guard is: they are generated from one table
  // declaration and they fail into different databases. Without the
  // status CHECK the gate's account of where a row stands admits
  // anything a writer types; without the approval CHECK the gate
  // itself is gone, and a row may record that a config was written
  // onto its source with nothing recording that anybody approved it.
  //
  // Stops at the opening parenthesis for the reason sources.kind
  // above does, and the members are asked for by a case of its own in
  // the same way — sharper here, because the tuple behind them is
  // rendered into the migrations twice, once per constrained column.
  {
    id: 'source-config-proposals-status-check',
    description:
      'CHECK constraining source_config_proposals.status to the ' +
      'declared value set, which is what keeps a proposal inside the ' +
      'queue an operator reviews: a member outside the set is a row ' +
      'no status filter selects. Pins the constrained column and the ' +
      'membership test; the members are covered against their tuple ' +
      'elsewhere.',
    pattern: /^[ \t]*CONSTRAINT "source_config_proposals_status_check" CHECK \("source_config_proposals"\."status" in \(/m,
  },
  {
    id: 'source-config-proposals-approval-check',
    description:
      'Approval gate on source_config_proposals: a row may carry an ' +
      'applied_at only once an approved_at is set. What lets a model ' +
      'propose a parser config without being able to put one into ' +
      'service, spanning two columns like the research_pool gate and ' +
      'named for the rule the same way.',
    pattern: /^[ \t]*CONSTRAINT "source_config_proposals_approval_check" CHECK \("source_config_proposals"\."applied_at" IS NULL OR "source_config_proposals"\."approved_at" IS NOT NULL\)/m,
  },
  // The five auth entries are the whole of what a database enforces
  // for the basic strategy. Everything else a verified token has to
  // satisfy — not expired, not revoked — is a comparison somebody
  // performs after the row is in hand, and a comparison is not a
  // constraint. These are the shapes those comparisons stand on.
  {
    id: 'auth-users-username-unique',
    description:
      'UNIQUE on auth_users.username, which is what the bootstrap ' +
      'upsert resolves its conflict against. Postgres refuses an ON ' +
      'CONFLICT naming a column no unique constraint covers, so this ' +
      'key going takes restart-idempotent bootstrapping with it.',
    pattern: /^[ \t]*CONSTRAINT "auth_users_username_unique" UNIQUE\("username"\)/m,
  },
  {
    id: 'auth-users-sub-unique',
    description:
      'UNIQUE on auth_users.sub, the subject identifier session ' +
      'claims carry. One credential row per subject, or a verified ' +
      'token is ambiguous about whose it is and the copy each session ' +
      'took at mint time no longer names a single row.',
    pattern: /^[ \t]*CONSTRAINT "auth_users_sub_unique" UNIQUE\("sub"\)/m,
  },
  {
    id: 'auth-sessions-token-hash-unique',
    description:
      'UNIQUE on auth_sessions.token_hash, the key a presented token ' +
      'is looked up by. It is what makes that lookup answer at most ' +
      'one row: without it a hash can name several sessions that ' +
      'disagree on subject or expiry, and a reader sees one of them.',
    pattern: /^[ \t]*CONSTRAINT "auth_sessions_token_hash_unique" UNIQUE\("token_hash"\)/m,
  },
  // Both halves of the reference are pinned, because losing each
  // leaves a different database behind. Without the key at all,
  // user_id may name a credential row that is not there; with the key
  // but not the cascade, the reference holds and deleting an operator
  // is refused outright while any session it issued is still on file.
  {
    id: 'auth-sessions-user-fk',
    description:
      'Foreign key from auth_sessions.user_id to auth_users.id, ' +
      'cascading on delete, so removing a credential takes the ' +
      'sessions issued against it rather than being refused while ' +
      'they stand. Pins the referenced table and column beside it.',
    pattern: /^[ \t]*ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_auth_users_id_fk" FOREIGN KEY \("user_id"\) REFERENCES "public"\."auth_users"\("id"\) ON DELETE cascade/m,
  },
  // The second entry anchored inside a CREATE TABLE, and for the
  // reason the documents one gives: a column line names its column
  // and not its table, so unanchored this would report an expires_at
  // belonging to anything. The negated class stops the match at the
  // statement terminator so it cannot reach past the table it opened.
  {
    id: 'auth-sessions-expires-at-not-null',
    description:
      'NOT NULL on auth_sessions.expires_at, which is what makes ' +
      'every session carry a bound at all. Nullable, the column ' +
      'admits a row with no expiry, and what such a row means is ' +
      'left to whoever reads it — a SQL comparison against NULL ' +
      'answers unknown rather than expired.',
    pattern: /^[ \t]*CREATE TABLE "auth_sessions" \([^;]*?^[ \t]*"expires_at" timestamp with time zone NOT NULL,/m,
  },
  // The bound is in the pattern rather than the constraint name and
  // its column alone, and what that buys is narrower than it looks. A
  // `sql` template value that missed `.inlineParams()` reaches the
  // migration as `$1`, which Postgres refuses at DDL time —
  // measured: `there is no parameter $1` — so the placeholder form
  // is a migration that cannot apply rather than a constraint that
  // admits everything. Loud, but only where a database is watching:
  // the text is green through lint, check-types and this suite either
  // way, and pinning the literal is what reports it in a run that
  // opens no connection at all.
  {
    id: 'operator-settings-singleton-check',
    description:
      'CHECK pinning operator_settings.id to 1, which is what makes ' +
      'the table one row rather than a convention every writer has to ' +
      'remember. A second row raises nothing by itself: two readable ' +
      'configurations, and which one the deployment behaves as ' +
      'depends on an ORDER BY nobody wrote. Pins the bound as a ' +
      'literal, so a placeholder reaching the migration is a miss.',
    pattern: /^[ \t]*CONSTRAINT "operator_settings_singleton_check" CHECK \("operator_settings"\."id" = 1\)/m,
  },
  // The six read indexes the wave-3 API pages are served from, pinned
  // as one group because what makes each of them work is the same
  // thing: the exact key, in the exact order, carrying the exact
  // nulls ordering the reader spells in its own ORDER BY.
  //
  // The qualifiers are in the patterns because losing one is silent
  // everywhere else. drizzle renders a descending key as `DESC NULLS
  // LAST`, which is the opposite of what the bare word means to
  // Postgres, and the planner matches a pathkey's nulls ordering
  // literally rather than reasoning about whether the column can hold
  // a null at all. So an index whose qualifier moved is still
  // created, still valid, and still used for something; the one thing
  // that stops using it is the reader it was added for, which goes
  // back to sorting rows it has already fetched. Measured on Postgres
  // 16 with sequential scans off: the fully qualified page plans as
  // an index only scan, and the same query writing a bare `DESC` on
  // two NOT NULL keys puts an incremental sort above it.
  //
  // Column order is pinned one step earlier in the same argument. A
  // b-tree serves a sort only from a prefix of its key, so two keys
  // swapped is an index that answers a different query while
  // carrying the name of this one.
  //
  // Every pattern runs to the statement terminator, which is what
  // makes a WHERE added to any of them a miss rather than a match,
  // for the reason the per-source `documents` index above gives at
  // length.
  //
  // Measured rather than argued. Each of the six statements deleted
  // from the generated migration in turn reddens exactly one case,
  // the one named for the index that went, at 1 failed and 33 passed
  // every time. Deletion is the weaker half though: a name-only
  // pattern would report it identically. The three legs that reach
  // what these patterns actually pin are dropping the `NULLS LAST`
  // from the findings key on `score`, swapping the two trailing key
  // columns of the documents index, and qualifying the `llm_calls`
  // index with a WHERE, and each of those reddens that one entry and
  // nothing else.
  {
    id: 'findings-domain-id-score-created-at-index',
    description:
      'Read index behind the findings page: one domain, score ' +
      'descending with absence sorted last, then created_at and id ' +
      'descending, which is the order the digest selection and every ' +
      'renderer already agree on. Pins all four columns in order and ' +
      'the NULLS LAST on each descending key, which is what the ' +
      'ORDER BY reading through it has to spell too.',
    pattern: /^[ \t]*CREATE INDEX "findings_domain_id_score_created_at_idx" ON "findings" USING btree \("domain_id","score" DESC NULLS LAST,"created_at" DESC NULLS LAST,"id" DESC NULLS LAST\);/m,
  },
  {
    id: 'documents-domain-id-captured-at-index',
    description:
      'Read index behind the per-domain documents page: newest ' +
      'first, with id breaking the tie a batch capture leaves when ' +
      'every row takes the same transaction timestamp. A different ' +
      'reader from the per-source index above rather than a widening ' +
      'of it, which is why both are asserted: that key leads on ' +
      'source_id, which this page does not filter on at all.',
    pattern: /^[ \t]*CREATE INDEX "documents_domain_id_captured_at_idx" ON "documents" USING btree \("domain_id","captured_at" DESC NULLS LAST,"id" DESC NULLS LAST\);/m,
  },
  {
    id: 'finding-labels-finding-id-labelled-at-index',
    description:
      'Read index behind the latest-verdict lookup: one finding, ' +
      'labels newest first. finding_labels carries no unique key at ' +
      'all, so re-judging appends and the first row under this order ' +
      'IS the verdict, which is also how the DISTINCT ON subquery ' +
      'behind the verdict filter resolves a whole page at once. Pins ' +
      'id behind labelled_at, two labels written in one transaction ' +
      'carrying the same stamp.',
    pattern: /^[ \t]*CREATE INDEX "finding_labels_finding_id_labelled_at_idx" ON "finding_labels" USING btree \("finding_id","labelled_at" DESC NULLS LAST,"id" DESC NULLS LAST\);/m,
  },
  {
    id: 'llm-calls-called-at-index',
    description:
      'Read index behind the spend window, which is what makes a ' +
      'ledger nothing prunes readable at all: every model call the ' +
      'service makes lands there, so an unbounded summary is a scan ' +
      'that grows forever. One column, no direction because the ' +
      'summary groups rather than orders, and the terminator pinned ' +
      'behind it so a predicate qualifying this index is a miss.',
    pattern: /^[ \t]*CREATE INDEX "llm_calls_called_at_idx" ON "llm_calls" USING btree \("called_at"\);/m,
  },
  {
    id: 'runs-domain-id-started-at-index',
    description:
      'Read index behind the runs page, filtered or not. domain_id ' +
      'is nullable and a b-tree stores nulls, so the runs belonging ' +
      'to no domain sit inside this index rather than outside it, ' +
      'which is what lets the unfiltered page read the whole table in ' +
      'the same order. Pins the three columns and the NULLS LAST on ' +
      'both descending keys.',
    pattern: /^[ \t]*CREATE INDEX "runs_domain_id_started_at_idx" ON "runs" USING btree \("domain_id","started_at" DESC NULLS LAST,"id" DESC NULLS LAST\);/m,
  },
  {
    id: 'source-config-proposals-source-id-status-index',
    description:
      'Read index behind the pending-config queue, which the HTTP ' +
      'route and the approval CLI both read through: one queue with ' +
      'two clients rather than two that happen to agree today. ' +
      'Equality on both columns, so neither carries a direction, and ' +
      'the terminator is pinned because a WHERE on the pending ' +
      'status would serve these two readers and leave every other ' +
      'status read on a sequential scan.',
    pattern: /^[ \t]*CREATE INDEX "source_config_proposals_source_id_status_idx" ON "source_config_proposals" USING btree \("source_id","status"\);/m,
  },
];

/**
 * The value list inside the `sources.kind` CHECK, captured whole.
 *
 * Not the roster entry of the same name, which stops at the opening
 * parenthesis. That one asks whether the constraint is there and this
 * one asks what it admits: a single pattern spelling the members out
 * would report a tuple widened without a migration as a constraint
 * that had gone missing, which is one defect reported as another in
 * the first place a reader would go looking for it.
 *
 * Greedy to the last `))` on the line, where `checkOneOf` closes the
 * membership test and the CHECK around it. `.` stops at a newline and
 * drizzle writes the list on one line, so the capture cannot run on
 * past the statement it started in.
 */
const SOURCES_KIND_CHECK_VALUES = /^[ \t]*CONSTRAINT "sources_kind_check" CHECK \("sources"\."kind" in \((.*)\)\)/m;

/**
 * The value list inside the `source_config_proposals.status` CHECK,
 * captured whole, and the counterpart of the one above.
 *
 * Keyed on the constraint name rather than on the predicate, which
 * matters more here than it does for `sources.kind`.
 * `RESEARCH_POOL_STATUSES` constrains two columns, so the same four
 * literals are rendered into the migrations twice under two
 * constraint names — and a pattern reading the membership test alone
 * would answer about whichever table drizzle wrote first, whatever
 * the caller asked about.
 *
 * Greedy to the last `))` on the line for the reason given above, and
 * the trailing comma the generated line carries after it is outside
 * the capture either way.
 */
const PROPOSAL_STATUS_CHECK_VALUES = /^[ \t]*CONSTRAINT "source_config_proposals_status_check" CHECK \("source_config_proposals"\."status" in \((.*)\)\)/m;

/**
 * Every single-quoted literal in a rendered value list, in order.
 *
 * The plain form, matching what `tests/schema/value-sets.test.ts`
 * reads out of a freshly rendered CHECK. A member carrying a quote of
 * its own reaches the migration as SQL's doubled-quote escape and
 * comes back out of here as two literals — wrong, but not quiet: the
 * comparison against the tuple then fails rather than passing on a
 * member neither side holds.
 */
function literalsIn(valueList: string): readonly string[] {
  return [...valueList.matchAll(/'([^']*)'/g)].map((match) => match[1] ?? '');
}

/**
 * The members a rendered value list names, or a throw carrying
 * `refusal` when the CHECK is not in the text at all.
 *
 * Refuses rather than returning nothing. An empty list compares
 * against a tuple as a CHECK admitting no member at all, which is a
 * different defect from a CHECK that is gone — and the roster entry
 * beside each caller is what reports that one.
 *
 * The sentence is passed in rather than assembled here, because what
 * a reader has to be told names the tuple that has nothing to compare
 * against and the roster entry that reports the absence properly.
 * Neither is derivable from the pattern.
 *
 * @param pattern - Value-list pattern, capturing the rendered
 * literals in its first group.
 * @param text - Concatenated migration SQL, as
 * {@link readMigrationSql} returns it.
 * @param refusal - What to say when the pattern resolves nothing.
 * @returns The literals the CHECK names, in the order it names them.
 */
function checkMembers(
  pattern: RegExp,
  text: string,
  refusal: string,
): readonly string[] {
  const match = pattern.exec(text);

  if (match === null) {
    throw new Error(refusal);
  }

  return literalsIn(match[1] ?? '');
}

/**
 * The members the generated migration's `sources.kind` CHECK admits.
 *
 * Read out of the SQL rather than off `SOURCE_KINDS`, which is the
 * whole of what makes asking worthwhile: the tuple and the CHECK are
 * two declarations of one set, and the migration is where the second
 * stops following the first. A tuple widened in `values.ts` and never
 * generated leaves the database refusing rows the union derived from
 * it calls valid, and no other seam in this package reads both sides.
 *
 * @param text - Concatenated migration SQL, as
 * {@link readMigrationSql} returns it.
 * @returns The literals the CHECK names, in the order it names them.
 */
export function sourceKindCheckMembers(text: string): readonly string[] {
  return checkMembers(
    SOURCES_KIND_CHECK_VALUES,
    text,
    'No sources_kind_check CHECK resolved from the migration text, ' +
    'so there is no value list to compare against SOURCE_KINDS. The ' +
    'roster entry sources-kind-check reports that absence as what it ' +
    'is; this refusal is here so the two are never confused for a ' +
    'CHECK that admits nothing.',
  );
}

/**
 * The members the generated migration's
 * `source_config_proposals.status` CHECK admits.
 *
 * The question {@link sourceKindCheckMembers} asks, put to the other
 * tuple a CHECK in this schema is generated from, and for the same
 * reason: `RESEARCH_POOL_STATUSES` and the constraint are two
 * declarations of one set, and the migration is where the second
 * stops following the first.
 *
 * Keyed on this table's constraint name, because that tuple
 * constrains two columns and so reaches the migrations as two CHECKs
 * carrying identical value lists. Knowing which of them answered is
 * what the name buys: `research_pool_status_check` renders the same
 * four literals, is read by nothing here, and sits in an earlier
 * migration — so a reading that fell through to it would report
 * that column's rendering under this column's name.
 *
 * @param text - Concatenated migration SQL, as
 * {@link readMigrationSql} returns it.
 * @returns The literals the CHECK names, in the order it names them.
 */
export function proposalStatusCheckMembers(
  text: string,
): readonly string[] {
  return checkMembers(
    PROPOSAL_STATUS_CHECK_VALUES,
    text,
    'No source_config_proposals_status_check CHECK resolved from the ' +
    'migration text, so there is no value list to compare against ' +
    'RESEARCH_POOL_STATUSES. The roster entry ' +
    'source-config-proposals-status-check reports that absence as ' +
    'what it is; this refusal is here so the two are never confused ' +
    'for a CHECK that admits nothing.',
  );
}
