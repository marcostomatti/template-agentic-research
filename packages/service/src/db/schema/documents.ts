/**
 * @packageDocumentation
 * `documents` — the raw material of the corpus: one row per distinct
 * item the pipeline has ingested, stored as it arrived.
 *
 * A document is what was captured, never what was made of it. Nothing
 * here is scored, judged, or attributed to a subject; those are
 * `findings` and `entities`, which hang off these rows. Keeping the
 * three apart is what lets scoring be re-run over a corpus that was
 * never re-fetched — a change in how a domain reads its material is a
 * recomputation rather than a re-ingest — and it is the vocabulary
 * `docs/architecture/00-overview.md` fixes for the whole repository.
 *
 * One row per DISTINCT item is `hash`'s doing. Capture is allowed to
 * be repetitive: the same item reaches two sources, a poll overlaps
 * the one before it, a file is handed in twice. Deduplicating on the
 * content itself absorbs all three without any reader having to know
 * which of them happened.
 *
 * Nothing writes these rows yet. The adapters arrive in phase 4 and
 * the parse engine they run under in phase 5; what the table fixes
 * now is the shape they write into, which is the same shape
 * `CanonicalDocument` in `src/sources/index.ts` is now narrowed to,
 * member for column, so that no adapter is ever written against a
 * guess.
 *
 * The module carries a second table, `ingested_files`, because the
 * question that one answers is about how a document ARRIVED rather
 * than about what a domain makes of it: it records that a file in
 * the ingest tray has already been read, so a later poll passes
 * over it. That guard and `hash` below are a pair rather than two
 * copies of one idea — one stops a file being read twice, the
 * other stops two reads becoming two rows — and each table's own
 * comments carry the half of the argument belonging to it.
 */
import { bigint, bigserial, integer, jsonb, pgTable, real, text, timestamp } from 'drizzle-orm/pg-core';

import { domains } from './domains.js';
import { sources } from './sources.js';
import { DOCUMENT_PARSE_STATUSES, checkOneOf } from './values.js';

export const documents = pgTable('documents', {
  /** Surrogate key; see `domains.id` for why `number` mode. */
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  /**
   * The domain whose corpus this document belongs to. Cascading on
   * delete like every other domain-owned row: a document outliving
   * its domain is raw material for a subject nobody researches, and
   * the taxonomy that gave it meaning went with the domain.
   */
  domainId: bigint('domain_id', { mode: 'number' }).notNull()
    .references(() => domains.id, { onDelete: 'cascade' }),

  /**
   * The feed this document was captured through, when it came through
   * one. NULL means it did not — a file handed to the ingest path, an
   * item an operator pasted in — and is an absence rather than a
   * placeholder row standing for "no source", which would be a feed
   * the pipeline could try to read and an adapter could be selected
   * for.
   *
   * Deliberately no `onDelete`, so it emits `ON DELETE no action` and
   * deleting a source that still has documents is REFUSED. A source
   * does not own the corpus it produced: findings hang off these rows
   * and are read long after a feed is retired, so a cascade would
   * discard evidence nobody asked about, and nulling the column would
   * forget where a document came from without saying it had. Retiring
   * a feed is `sources.enabled = false`, the column that exists for
   * exactly that; deleting one is also a decision about its
   * documents, and refusing makes it an explicit one.
   */
  sourceId: bigint('source_id', { mode: 'number' })
    .references(() => sources.id),

  /**
   * The content hash of the document as captured, and the key the one
   * row per distinct item stands on. Capturing the same item again —
   * from a second source, from a poll overlapping the last one —
   * lands on this row instead of adding a rival to it.
   *
   * NOT NULL and UNIQUE are one mechanism here rather than two
   * constraints that happen to share a column: the NOT NULL is what
   * makes the UNIQUE key dedupe at all. NULL is the one value that
   * conflicts with nothing, another NULL included, so a key with a
   * nullable member admits every row whose member is absent while
   * still reading — in the schema, and in review — as a key.
   *
   * What that would cost is paid in silence. The write that lands a
   * repeat capture is an insert with `ON CONFLICT DO NOTHING`, and
   * against a nullable hash that conflict clause never fires: the
   * insert proceeds, the statement reports success, and the corpus
   * grows by a copy per pass with nothing logged. Every later stage
   * then reads the copies as separate items, so the first symptom
   * is a count somewhere downstream rather than an error here.
   *
   * The live suite proves the property instead of arguing it, and
   * proves it against a control table, because the obvious assertion
   * does not bite: two inserts of one non-null hash conflict whether
   * or not this column is NOT NULL. `tests/live/schema.live.test.ts`,
   * later in this phase, therefore stands a temporary table with a
   * nullable hash under the same UNIQUE key beside the real one and
   * requires it to accept two NULL-hash rows — the defect
   * reproducing beside the constraint holding, which is what makes
   * the assertion on this column evidence rather than a claim that
   * would pass either way.
   *
   * The constraint is named rather than left to drizzle's derivation
   * so the static-SQL invariant suite can assert it is present by
   * grepping the generated migration for it.
   */
  hash: text('hash').notNull()
    .unique('documents_hash_unique'),

  /**
   * Where this document can be read at its source, when there is such
   * a place. NULL means there is not — an ingested file, a pasted
   * body — and never an empty string: `''` is a value, and a reader
   * handed it renders a link to nowhere.
   */
  url: text('url'),

  /**
   * The document's text as captured, and what every later stage reads.
   *
   * NOT NULL, which is not the same as non-empty. An empty body is a
   * capture that yielded no text and was kept anyway rather than
   * dropped — fail-flag-keep, the rule `parse_status` below records
   * — so a source whose shape has drifted leaves a row to read
   * instead of a silence indistinguishable from a quiet day.
   * Nullable, the column would add a third state on top of that pair,
   * and every reader would carry a guard buying no distinction.
   */
  body: text('body').notNull(),

  /**
   * The source's own payload, verbatim: what the fetch returned,
   * before anything was extracted from it.
   *
   * Kept because re-parse beats re-fetch. A parser that turns out to
   * have dropped a field is corrected against what is stored here,
   * and sources expire their items, so a re-fetch would often return
   * nothing to correct against at all.
   *
   * Nullable, unlike the JSONB columns on `sources`, because here the
   * two absences differ. An empty `parser_config` and an unwritten
   * one come to the same thing for every reader, which is why that
   * column defaults to `{}`; NULL here says no payload was ever
   * stored for this document — the state a pasted body or an ingested
   * file is in — while `{}` would claim the source answered and
   * answered with nothing. Only the second is something a re-parse
   * can act on.
   *
   * Carries no `$type` annotation, for the reason `parser_config`
   * carries none: the shape is the source's rather than this schema's,
   * and one interface across every kind of source would describe none
   * of them accurately.
   */
  raw: jsonb('raw'),

  /**
   * When the pipeline captured this document, which is not when its
   * source published it. The two diverge by however long an item sat
   * before a poll reached it, and only this one is a fact about the
   * corpus rather than a claim copied out of a payload.
   *
   * Defaults to now because capture IS the insert: there is no window
   * in which a document row exists and has not been captured, so
   * there is no absent state for the column to encode and no reason
   * for it to be nullable.
   */
  capturedAt: timestamp('captured_at', { withTimezone: true }).defaultNow()
    .notNull(),

  /**
   * Whether this document's payload parsed under its source's
   * contract — see `DOCUMENT_PARSE_STATUSES` in `./values.js` for
   * what the two members mean.
   *
   * This column is the flag of fail-flag-keep, and the row it sits on
   * is the keep. A payload its contract rejects is stored with its
   * `parse_error` rather than dropped, the source's
   * `consecutive_failures` counter is bumped, and a run of those
   * rejections trips `sources.flagged` — the adapter-rot detector
   * that column's comment describes. Dropping the payload instead
   * would leave the drift showing up only as a fall in volume, which
   * is what a quiet week looks like too.
   *
   * Defaults to `ok` because a failure is something that HAPPENED,
   * and only the writer that saw it can say so — nothing reading a
   * stored row later can work out that its parse went wrong. An unset
   * status can therefore mean nothing else. The honest limit of that
   * is worth stating rather than leaving to be found: the default
   * cannot tell a document that parsed from one whose writer never
   * set the column, and records both as `ok`.
   *
   * NOT NULL is what makes the CHECK below cover the column at all. A
   * CHECK is UNKNOWN against NULL and so admits it, the same way
   * `sources.kind` is NOT NULL for its own. It also holds the readers
   * to two cases: the review surface is a `parse_status = 'failed'`
   * filter, and a third state would be a document neither queue
   * reports — missing from the failures an operator works through and
   * missing from the corpus everything else treats as sound.
   */
  parseStatus: text('parse_status').default('ok')
    .notNull(),

  /**
   * What went wrong, when something did: the parse failure's own
   * message, kept beside the payload it was raised against.
   *
   * NULL means no error was recorded, which for an `ok` row is the
   * ordinary state. Never an empty string, for the reason `url` above
   * is never one: `''` is a value, and a reader handed it renders a
   * failure with no account of itself as though the account had been
   * read and was blank.
   *
   * Nothing in the database ties this column to the one above. A
   * `failed` row whose error is NULL is storable, and it is the shape
   * that costs the most — the document is kept, the source's counter
   * climbs toward its threshold, and what the operator is shown is a
   * failure nobody can act on. Only the writer keeps the pair
   * together, so an adapter reporting a failure (phase 4, under the
   * engine that arrives in phase 5) records the reason in the same
   * insert that sets the status.
   */
  parseError: text('parse_error'),

  /**
   * The deterministic feature vector computed from this document: a
   * flat record of finite numbers, one key per feature, in a fixed
   * key order.
   *
   * Never read without `feature_version` beside it. The key order is
   * part of what the vector MEANS rather than a serialization detail
   * — a one-hot's position is which member it stands for — so two
   * vectors are comparable only when they were computed under the
   * same version, and a comparison across two of them is arithmetic
   * that succeeds over numbers no longer standing for the same
   * things.
   *
   * Nullable rather than defaulting to `{}`, because here the two
   * absences differ the way they do for `raw` above: NULL says this
   * document has never been featurized, while `{}` would say a
   * featurizer ran and measured nothing in it. Only the second is a
   * result; the first is work the recompute has yet to reach.
   *
   * Annotated, unlike `raw`, because the shape is one thing across
   * every domain — numbers under feature names — even though WHICH
   * names appear comes from a domain's own taxonomy, which is exactly
   * what `feature_version` pins. The annotation emits no DDL and
   * validates nothing at runtime, so it is a claim readers program
   * against rather than a constraint: the pipeline also writes these
   * rows through hand-written SQL, which can store a shape it
   * rejects.
   */
  features: jsonb('features').$type<Record<string, number>>(),

  /**
   * Which version the vector above was computed under — the half of
   * the pin that lives on the document. `domains.feature_version` is
   * the other half, and its comment carries why the version is per
   * domain rather than one constant for the pipeline. A stored vector
   * is stale exactly when the two numbers differ, and that is a
   * comparison nobody can make unless both of them were recorded.
   *
   * NULL means this document has never been featurized. Absent rather
   * than zero, for the reason the domain's column gives: 0 is a
   * version like any other, so writing it would claim a vector
   * computed under a scheme that never existed.
   *
   * Nothing in the database ties this column to `features`, the same
   * way nothing ties `parse_error` to `parse_status` above, and the
   * pairing that costs most is a vector stored with a NULL version.
   * It reads as present to everything that looks for a vector, and
   * there is no version for a recompute to find it stale by, so it
   * survives every pass the pin exists to trigger. Only the writer
   * holds the two together: the featurizer that arrives with the
   * feature port in phase 4 writes both in one statement or neither.
   */
  featureVersion: integer('feature_version'),

  /**
   * The document's embedding, stored as an array of reals.
   *
   * An array rather than a vector-extension column, deliberately. At
   * the corpus sizes one operator's domains reach, a brute-force
   * cosine over these arrays is instant, while the extension would
   * mean changing the Postgres image that everything else in the
   * stack shares — a large change to the deployment bought for a
   * scan that is not yet slow. Corpus size is the only trigger for
   * re-opening it, somewhere in the tens of thousands of documents in
   * one domain, and it is written here rather than in a plan because
   * this column is what somebody reads when they wonder why a vector
   * is an array.
   *
   * NULL means this document has never been embedded, and never an
   * empty array: `[]` is a vector of no dimensions, which a
   * similarity would consume without complaint and return a number
   * standing for nothing.
   *
   * Never read without `embedding_model` beside it, for the reason
   * that column and `domains.embedding_model` both give — a
   * similarity computed across two models is wrong in a way nothing
   * raises.
   */
  embedding: real('embedding').array(),

  /**
   * The embedder that produced the vector above, recorded as the
   * embedder REPORTED it rather than as whatever configuration said
   * it would be. `domains.embedding_model` carries that argument in
   * full, along with why the column is free text instead of one of
   * `./values.ts`'s tuples.
   *
   * This is the document's half of that pin, as `feature_version` is
   * for the vector before it: the domain's column says which model
   * its corpus is meant to be at, this one says which model this row
   * was actually embedded by, and the rows where the two disagree are
   * what a re-embed goes looking for.
   *
   * NULL means never embedded — the same absence `embedding`'s NULL
   * encodes, which is why the two are written by one statement or by
   * neither. A vector whose model is NULL is unusable rather than
   * merely unlabelled: nothing stored anywhere else can recover which
   * embedder produced it.
   */
  embeddingModel: text('embedding_model'),
}, (table) => [
  /**
   * The parse-status domain, enumerated in the generated SQL from the
   * same tuple `DocumentParseStatus` is derived from. Named rather
   * than left to drizzle's derivation so the static-SQL invariant
   * suite can assert the constraint is present by grepping for it.
   */
  checkOneOf('documents_parse_status_check', table.parseStatus, DOCUMENT_PARSE_STATUSES),
]);

/**
 * `ingested_files` — the ingest tray's read log: one row per file the
 * pipeline has already picked up, so a poll that finds the same file
 * still sitting there passes over it instead of reading it again.
 *
 * The tray cannot be marked in place, which is the whole reason the
 * table exists. It may be a read-only share, and the pipeline never
 * moves, renames, or deletes what an operator dropped into it, so
 * "already handled" has nowhere to live in the directory itself.
 *
 * Deployment-level rather than domain-level, which is why it carries
 * no domain FK where nearly every other table in schema v2 does. One
 * tray serves the service; which domain a file's contents belong to
 * is settled when the file is READ and is recorded on the document
 * that comes out of it. A per-domain read log over one shared
 * directory would be several logs disagreeing about the same files,
 * and a file dropped for one domain would be read again by each of
 * the others.
 */
export const ingestedFiles = pgTable('ingested_files', {
  /** Surrogate key; see `domains.id` for why `number` mode. */
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  /**
   * The hash of the path this file was read at, and the key the skip
   * decision stands on: a poll compares the tray's listing against
   * these rows and reads only what is missing from them.
   *
   * The PATH rather than the contents, deliberately, and the two are
   * not interchangeable. Hashing the contents means opening and
   * reading every file on every poll in order to decide whether to
   * read it — the work the guard exists to avoid — while a path is
   * already in the listing that found the file. That choice leaves
   * the corpus no less guarded, because `documents.hash` above
   * dedupes on content: the two constraints answer different
   * questions and neither stands in for the other. This one stops a
   * file being re-READ; that one stops a re-read becoming a second
   * row.
   *
   * The honest limit is the mirror of the same choice, and both
   * halves of it are ordinary rather than exotic. A file edited in
   * place under one path is not read again, since nothing the key
   * looks at changed — re-reading it means deleting this row or
   * giving the file another name. A file copied to a second path IS
   * read twice, and it is `documents.hash` rather than this
   * constraint that absorbs the second read.
   *
   * NOT NULL for the reason `documents.hash` sets out at length and
   * that does not need restating here: NULL conflicts with nothing,
   * so a nullable member turns the UNIQUE key into one admitting
   * every row whose member is absent. What it would look like from
   * outside is a tray re-read in full on every poll while this table
   * fills up with rows that skip nothing. That column's control
   * table is where the property is demonstrated; this one rests on
   * the same argument rather than on a second proof of it.
   *
   * The constraint is named rather than left to drizzle's derivation
   * so the static-SQL invariant suite can grep for it, and so a
   * column rename cannot quietly move the name it greps for.
   */
  pathHash: text('path_hash').notNull()
    .unique('ingested_files_path_hash_unique'),

  /**
   * Where the file was read, kept so that a row can be read back by
   * a person: the hash above is what a poll compares, and this is
   * what says which file it stands for.
   *
   * Nullable, and the asymmetry with the hash is the point rather
   * than an oversight. The guard rests on `path_hash` alone, so a
   * row with no path still skips the file it was written for; what a
   * NULL costs is legibility — an operator asking which file a row
   * accounts for has nothing to read — and not correctness. The
   * derived column being the NOT NULL one and the human-readable
   * column being nullable reads backwards until those two roles
   * are held apart.
   *
   * Never an empty string, for the reason `url` above is never one:
   * `''` is a value, and a reader handed it shows a path that was
   * recorded and recorded as blank.
   */
  path: text('path'),

  /**
   * When the pipeline read this file. Defaults to now because the
   * read IS the insert, the way `captured_at` above defaults for the
   * capture: there is no window in which one of these rows exists
   * and the file it stands for has not been read, so there is no
   * absent state for the column to encode.
   *
   * What it is not is when the file was dropped into the tray.
   * Nothing here records that, and a filesystem timestamp would be a
   * fact about the share rather than about this pipeline — so the
   * gap between this column and a poll's cadence measures how long a
   * file waited to be noticed, never how long it sat there.
   */
  ingestedAt: timestamp('ingested_at', { withTimezone: true }).defaultNow()
    .notNull(),

  /**
   * The document this file became, when it became one.
   *
   * NULL is a state the ingest path reaches routinely rather than an
   * edge case, which is what makes the column nullable and what
   * decides its delete behaviour below. Three ordinary reads end
   * there: a file that yielded no document at all, a file whose
   * contents were already in the corpus — the insert is `ON CONFLICT
   * DO NOTHING` against `documents.hash`, which returns no id to
   * attribute — and a file recorded as read before its document was
   * written. All three still need their row, because a file with no
   * row is read again on the next poll, and a file that can never
   * yield a document would then be read again on every poll there
   * is.
   *
   * Deliberately no `onDelete`, so it emits `ON DELETE no action`,
   * and both alternatives fail quietly in ways this one does not.
   * `ON DELETE SET NULL` is expressible precisely because the column
   * is nullable, and it would write a fourth meaning over the three
   * above: a file that DID produce a document would afterwards read
   * as one that produced none, while the poll went on passing over
   * it, so the deleted document could not come back and nothing
   * would say why. A cascade inverts the same fault — dropping this
   * row unreads the file, so the next poll rebuilds a document an
   * operator had just deleted.
   *
   * What refusing costs is worth stating plainly rather than leaving
   * to be met, because the absent domain FK makes the refusal reach
   * further than the document itself. Deleting a domain cascades to
   * its documents, and the FK check at the end of that statement
   * finds these rows still citing them, so Postgres refuses the
   * domain delete too, naming this constraint and the document id.
   * The remedy is one statement ahead of it, clearing the file rows
   * for that domain's documents; the point of refusing is that the
   * operator is asked to make that decision rather than having it
   * made silently.
   */
  documentId: bigint('document_id', { mode: 'number' })
    .references(() => documents.id),
});
