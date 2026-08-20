/**
 * @packageDocumentation
 * `findings` — what a domain made of a document: one row per result
 * its criteria found worth keeping, scored and attributed.
 *
 * The split from `documents` is what makes a domain's reading of its
 * own corpus re-derivable. A document records what arrived; a finding
 * records what one domain made of it, under the taxonomy and the
 * weights in force when it was read. Change either and the findings
 * are recomputed over a corpus nothing re-fetched — so the half that
 * cannot be recovered is the half nothing rewrites.
 *
 * The core columns are neutral: which domain, which document, which
 * entity, how it scored, when it was made. Everything a particular
 * subject needs beyond them is `fields`, a payload governed by the
 * domain's own contract rather than by this schema — see
 * `docs/architecture/00-overview.md` for the vocabulary that fixes
 * for the whole repository.
 *
 * Nothing writes these rows yet. `ar-ingest` turns a document into
 * findings and `ar-score` scores them against a domain's criteria,
 * both phase 5. The sightings that record where a finding was seen
 * and the labels an operator puts on one arrive later in this stage
 * as this module's other two tables.
 */
import { bigint, bigserial, integer, jsonb, numeric, pgTable, timestamp } from 'drizzle-orm/pg-core';

import { documents } from './documents.js';
import { domains } from './domains.js';

export const findings = pgTable('findings', {
  /** Surrogate key; see `domains.id` for why `number` mode. */
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  /**
   * The domain whose criteria produced this finding. Cascading on
   * delete like every other domain-owned row: a finding is a reading
   * made under one domain's taxonomy and weights, and neither
   * outlives the domain that held them.
   */
  domainId: bigint('domain_id', { mode: 'number' }).notNull()
    .references(() => domains.id, { onDelete: 'cascade' }),

  /**
   * The document this finding was read out of.
   *
   * NOT NULL because a finding is a reading OF something. A row that
   * lost its document would be a score with nothing behind it, and
   * every surface that shows a finding shows the material it came
   * from beside it.
   *
   * Cascading on delete, where `documents.source_id` refuses, because
   * a document does own its findings: they are what one domain made
   * of it rather than evidence standing on its own. The pair is also
   * asymmetric in what can be rebuilt — re-scoring recomputes
   * findings over a corpus nothing re-fetched, while a document whose
   * source has since expired cannot be fetched again at all.
   *
   * What the cascade reaches is worth naming rather than leaving to
   * be met: an operator's judgements hang off these rows in
   * `finding_labels`, later in this module, and whether deleting a
   * judged finding is allowed is settled at that table's own FK.
   */
  documentId: bigint('document_id', { mode: 'number' }).notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),

  /**
   * The entity this finding is about, when it is about one.
   *
   * NULL is an ordinary state rather than an edge case. A finding is
   * attributed when the pipeline can name the subject behind it, and
   * plenty are worth keeping without one — a document nobody could
   * attribute still scored, and its finding is still read. Absent
   * rather than a placeholder "unattributed" entity, which would be a
   * subject research could be queued against and a registry entry
   * that accumulates every unattributed finding there is.
   *
   * The reference itself is not here yet: `entities` arrives later in
   * this stage, and the column takes its `.references()` then. What
   * is already decided is the delete behaviour, recorded here so that
   * it is a choice rather than whatever the later edit reaches for.
   * No `onDelete`, so it emits `ON DELETE no action` and deleting an
   * entity that findings still cite is REFUSED. `ON DELETE SET NULL`
   * is expressible precisely because the column is nullable and is
   * the one option that must not be taken: the NULL it writes already
   * means "never attributed", so an attribution that was made and
   * then lost would be indistinguishable from one never made. A
   * cascade inverts the fault — it would discard scored findings
   * because the subject they were about was tidied away.
   */
  entityId: bigint('entity_id', { mode: 'number' }),

  /**
   * Everything this domain needs beyond the neutral columns above,
   * keyed by field name: the part of a finding that another domain's
   * findings would have no use for.
   *
   * What may appear here is the domain's declaration rather than this
   * schema's. `DomainSettings.fieldContract` in `./domains.ts` names
   * each field and what it holds, and the app layer validates a write
   * against it — no CHECK reaches inside a JSONB payload, so that
   * validation is the whole of the enforcement.
   *
   * The two halves together — neutral core columns plus a payload
   * the domain validates — are what let one table serve every
   * domain. Neither works alone: neutral columns with no payload
   * push each domain's own material into columns of its own, and a
   * payload with no neutral core leaves nothing to join, order or
   * filter on that means the same thing in two domains. What the
   * split buys is one schema behind the executor, the API and the
   * exports at once, where a table or a column set per domain would
   * fork every query into a per-domain branch and multiply
   * migrations by the number of domains.
   *
   * A domain's latitude over the naming stops at the display name of
   * the term: `DomainSettings.findingsDisplayName` in `./domains.ts`
   * is what one calls a finding in a heading or an export, resolved
   * where it is rendered. No alias reaches storage — the table stays
   * `findings`, and so do its columns, the queries, the API fields
   * and every identifier in the code — and the keys inside this
   * payload come from the contract rather than from renaming a
   * column above. Nothing joins on a label, which is the whole
   * reason the alias costs nothing; the rule in full lives in
   * `docs/architecture/00-overview.md`.
   *
   * Annotated only as a record, which is as much as holds across
   * every domain: the keys come from a contract this schema does not
   * carry, so what the annotation claims is that the payload is an
   * object keyed by field name rather than an array or a scalar. Like
   * every `$type` here it emits no DDL and validates nothing at
   * runtime, and the pipeline's hand-written SQL can store a shape it
   * would reject.
   *
   * Defaults to an empty object rather than to null, on the reason
   * `domains.settings` gives: a finding carrying no extra fields and
   * one whose fields were never written come to the same thing for
   * every reader, so a null would buy no distinction and would cost
   * each of them a guard.
   */
  fields: jsonb('fields').$type<Record<string, unknown>>()
    .default({})
    .notNull(),

  /**
   * How this finding scored against its domain's criteria: the number
   * a digest orders by and a threshold filters on. NULL means it has
   * not been scored.
   *
   * This is the signal half of the null-vs-zero rule, and the column
   * to cite for it: a number computed from data is nullable with no
   * default, and an absent measurement is never stored as 0. The
   * other two numeric classes have exemplars of their own —
   * `sources.consecutive_failures` is a counter, NOT NULL with a 0
   * default because no failures is a reading; `terms.weight` is an
   * authored magnitude, NOT NULL with no default because nothing
   * computes it. A numeric column added later joins one of the three
   * deliberately, which is what a test later in this phase pins by
   * listing the signal and the counter columns explicitly.
   *
   * A zero costs more here than in a version column like
   * `score_version` below, where 0 at least names a scheme that never
   * existed. A score's zero sits inside the range the column reports,
   * so it reads as wrong nowhere: an unscored finding written as 0
   * takes its place at the bottom of every ranking as though it had
   * been read and found worthless, and nothing distinguishes it from
   * a finding genuinely scored to zero — an ordinary outcome for a
   * document that matched nothing the domain weights, or whose
   * matches cancelled.
   *
   * NULL is also what makes the filters behave. A `score >= 0.7`
   * threshold evaluates to UNKNOWN against a NULL and so neither takes
   * an unscored finding nor reports it, which is right, because
   * nothing has measured it. That is the same three-valued logic that
   * makes a NULL dangerous in `sources.consecutive_failures`, where a
   * counter never set escapes the detector it exists for; the
   * treatments differ only because the question does — whether the
   * absent state is a real reading. There is no default for the same
   * reason: any number one named would be a measurement claim about a
   * row nothing has read.
   *
   * What the schema buys is room for the truthful answer and no more
   * than that. Nullability does not stop a scorer writing a 0 for a
   * finding it failed to score, and once stored no constraint can
   * tell that apart from a measured zero — `ar-score`, phase 5, is
   * the only thing holding the rule.
   *
   * `numeric` rather than a binary float, because the value is
   * compared against thresholds a person writes as decimals. In
   * binary floating point 0.7 is not the number that was typed, so a
   * `>= 0.7` filter takes or drops a row sitting on the boundary
   * according to arithmetic nobody wrote.
   *
   * Read in `number` mode rather than drizzle's default `string`.
   * That default preserves arbitrary precision, which a score does
   * not have, and it costs the one thing every consumer does with the
   * column: JS compares strings lexicographically, so `'10' < '9'` is
   * true and an ordering or a threshold built on it is wrong with
   * nothing raised. The exactness that matters is kept where the
   * comparisons that matter happen — the scoring and filter queries
   * are SQL, run against the stored `numeric`.
   */
  score: numeric('score', { mode: 'number' }),

  /**
   * Which scoring version produced the number above — the finding's
   * half of a pin, as `documents.feature_version` is for a vector. A
   * stored score is stale exactly when this is behind the version the
   * scorer is at, and that is a comparison nobody can make unless it
   * was recorded at the time.
   *
   * The other half is not a column in this schema: scoring is one
   * mechanism over a domain's criteria rather than a per-domain
   * pinned artifact, so the version to read this against belongs to
   * the scorer that arrives in phase 5.
   *
   * NULL means never scored, the same absence `score` above encodes,
   * which is why the two are written by one statement or by neither.
   * Absent rather than zero: 0 is a version like any other, and
   * writing it would claim a score computed under a scheme that never
   * existed. The pairing that costs most is a score stored with a
   * NULL version — it reads as scored to everything looking for a
   * number, and there is no version for a re-score to find it stale
   * by, so it survives every pass the pin exists to trigger.
   */
  scoreVersion: integer('score_version'),

  /**
   * When this finding was made, which is when a document was read
   * into one — not when the document was captured, and not when its
   * source published it. `documents.captured_at` records the first of
   * those and nothing here records the second.
   *
   * Defaults to now because creation IS the insert, and NOT NULL for
   * the same reason: there is no window in which one of these rows
   * exists and has not been made, so there is no absent state for the
   * column to encode.
   */
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
    .notNull(),
});
