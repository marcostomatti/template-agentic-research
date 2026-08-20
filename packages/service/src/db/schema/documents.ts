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
 * `CanonicalDocument` in `src/sources/index.ts` is narrowed to later
 * in this phase, so that no adapter is ever written against a guess.
 */
import { bigint, bigserial, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { domains } from './domains.js';
import { sources } from './sources.js';

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
   * dropped — fail-flag-keep, the rule `DOCUMENT_PARSE_STATUSES` in
   * `./values.js` states — so a source whose shape has drifted leaves
   * a row to read instead of a silence indistinguishable from a quiet
   * day. Nullable, the column would add a third state on top of that
   * pair, and every reader would carry a guard buying no distinction.
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
});
