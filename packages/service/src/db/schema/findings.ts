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
 * both phase 5. `finding_sightings` below records where a finding
 * has been seen, and `finding_labels` after it records what an
 * operator made of one — the module's only rows a person writes.
 */
import { bigint, bigserial, integer, jsonb, numeric, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';

import { documents } from './documents.js';
import { domains } from './domains.js';
import { sources } from './sources.js';

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

/**
 * `finding_sightings` — where a finding has been seen: one row per
 * finding, source, and the source's own id for the item, kept and
 * never pruned.
 *
 * A duplicate is evidence rather than noise, which is the whole
 * reason these rows exist. An item four feeds carry reads
 * differently from one that turned up in a single place, so
 * convergence keeps ONE finding and records each sighting against
 * it — and the count of them is the cheapest syndication measure
 * there is.
 *
 * Nothing else in the schema can hold that. `documents.hash`
 * collapses a repeat capture onto the row already there, and the
 * write that does it is an insert with `ON CONFLICT DO NOTHING`, so
 * it returns no id and changes nothing: `documents.source_id` goes
 * on naming the feed the document was FIRST captured through, and
 * no column anywhere records the second. Without these rows a
 * source's involvement is absorbed by the very mechanism that makes
 * the corpus one row per item.
 *
 * Hung off `findings` rather than `documents` because the finding
 * is what a digest renders and an operator judges, which is where
 * the count is read — and read at render rather than copied onto
 * the finding when it is made. Convergence goes on adding sightings
 * afterwards, so a count stored at the time would be stale by the
 * moment the second source arrived.
 *
 * Nothing writes these rows yet. The adapters that meet a source's
 * items arrive in phase 4, under the engine in phase 5 that decides
 * two captures are the same thing.
 */
export const findingSightings = pgTable('finding_sightings', {
  /** Surrogate key; see `domains.id` for why `number` mode. */
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  /**
   * The finding this sighting is of.
   *
   * NOT NULL because the row has no content without it — a sighting
   * is the claim that a particular finding was seen somewhere — and
   * because it is the first member of the natural key below.
   *
   * Cascading on delete, where `source_id` beside it refuses,
   * because the finding does own these rows: they say where IT was
   * seen and nothing reads them except through it. That is the same
   * ownership test `findings.document_id` above applies, and a
   * sighting outliving its finding would be provenance for a row
   * nobody can reach.
   */
  findingId: bigint('finding_id', { mode: 'number' }).notNull()
    .references(() => findings.id, { onDelete: 'cascade' }),

  /**
   * The feed this finding was seen at, and the second member of the
   * natural key.
   *
   * NOT NULL, unlike `documents.source_id`, and the difference is
   * what each column is for. That one records how a document
   * arrived and admits documents that arrived through no feed at
   * all — a pasted body, an ingested file. This row IS the
   * statement that something was seen at a feed, so a sighting
   * without one says nothing, and there would be no key left to
   * deduplicate it on.
   *
   * Deliberately no `onDelete`, so it emits `ON DELETE no action`
   * and deleting a source these rows still cite is REFUSED — the
   * answer `documents.source_id` gives, for a sharper reason here.
   * This table IS the provenance record, so a cascade would drop
   * syndication evidence a feed at a time, and every count taken
   * afterwards would be lower with nothing saying why.
   * `ON DELETE SET NULL` is not the escape it looks like on a NOT
   * NULL column: Postgres accepts the declaration and defers the
   * failure to the delete, which then reports a not-null violation
   * on this column instead of the reference it was really about.
   * Refusing outright says the same thing where a reader can act
   * on it. Retiring a feed without losing what it once carried is
   * `sources.enabled = false`, the column that exists for exactly
   * that.
   */
  sourceId: bigint('source_id', { mode: 'number' }).notNull()
    .references(() => sources.id),

  /**
   * The source's own id for the item behind this finding: what the
   * feed calls it, kept so a sighting can be matched back to the
   * entry that produced it.
   *
   * Not to be confused with `source_id` above, which is this
   * schema's FK to `sources`. The two sit a line apart on purpose —
   * the identifier belongs to the far end, the FK to this one — and
   * a design carrying the feed's name as text rather than as a
   * table would have called this one `source_id` instead.
   *
   * NULL means the source publishes no id of its own, which is
   * ordinary rather than exceptional: a feed may offer nothing more
   * stable than a URL, and some offer an id that changes between
   * polls.
   *
   * Being nullable AND a member of the unique key below is worth
   * stating plainly rather than leaving to be met, because it is
   * the property `documents.hash` sets out at length, arriving here
   * through one member of a key rather than through the whole of
   * it. NULL conflicts with nothing, another NULL included, so for
   * a source publishing no id the key does not fire: seeing the
   * same finding at the same feed again inserts a rival row instead
   * of landing on the one already there, and an `ON CONFLICT DO
   * NOTHING` write never no-ops. What that costs is the measure the
   * table exists for — the count climbs with polls rather than with
   * syndication, and the first symptom is a number downstream
   * rather than an error here.
   *
   * So for an id-less source the deduplication is the writer's to
   * hold and not the schema's, and the shape that would move it
   * back is a NOT NULL column defaulting to `''`, where "publishes
   * no id" is a value that still conflicts with itself. Where a
   * source does publish an id the key is whole and asks nothing of
   * the writer.
   */
  externalId: text('external_id'),

  /**
   * When the pipeline saw this finding at this source — not when
   * the source published the item, which nothing here records.
   *
   * Defaults to now because the sighting IS the insert, the way
   * `created_at` above defaults for the finding: there is no window
   * in which one of these rows exists and nothing has been seen.
   *
   * Which of a finding's sightings at one feed the timestamp stands
   * for is the writer's choice rather than the schema's, and the
   * column has room for one of the two. A repeat write with `ON
   * CONFLICT DO NOTHING` leaves the first time in place and this
   * reads as first-seen; one with `DO UPDATE` moves it to the
   * latest and it reads as last-seen. Neither says whether the item
   * is still carried by the source, and a reader taking this column
   * for that answer reports a feed as current on the strength of a
   * sighting made once.
   */
  seenAt: timestamp('seen_at', { withTimezone: true }).defaultNow()
    .notNull(),
}, (table) => [
  /**
   * Finding, source and the source's own id together are the row's
   * natural key: seeing the same entry again lands on the row
   * already there rather than adding a second — subject to what
   * `external_id` above records about its own NULLs.
   *
   * All three, because no pair of them identifies a sighting. One
   * finding seen at several sources is the signal the table exists
   * to keep, and one source can carry two entries that converged
   * onto a single finding, which is two sightings and not one.
   *
   * Named rather than left to drizzle's derivation so the
   * static-SQL invariant suite can assert the constraint is present
   * by grepping the generated migration for it, and so a column
   * rename cannot quietly move the name it greps for.
   */
  unique('finding_sightings_finding_id_source_id_external_id_unique').on(table.findingId, table.sourceId, table.externalId),
]);
/**
 * `finding_labels` — what an operator made of a finding: one row per
 * judgement, kept apart from the finding it judges.
 *
 * The separation repeats one level up the split `findings` draws from
 * `documents`. A finding is what the pipeline computed under a
 * domain's taxonomy and weights; a label is what a person concluded
 * looking at it. Plenty in this schema is authored — the taxonomy,
 * the personas, a domain's settings — but all of that is input the
 * pipeline consumes, and these are the only rows holding a person's
 * reading of what it produced. Folded into the finding row a label
 * would sit in the path of a re-score, which rewrites everything
 * around it and can recompute none of this.
 *
 * A finding may carry several, and the schema neither prevents that
 * nor orders them. There is no unique key here, so re-judging adds a
 * row rather than replacing one and the sequence is the record of an
 * operator changing their mind — worth keeping for the same reason
 * the last verdict is. What it costs every reader is that a
 * finding's verdict is not a lookup: it is the latest row by
 * `labelled_at`, and a query that forgets to order reports whichever
 * row the scan reached first, with nothing raised and no guarantee
 * it reaches the same one twice.
 *
 * Nothing writes these rows yet. The operator surfaces that produce
 * them, the API and the UI, arrive outside this port's phases;
 * `ar-digest`, phase 6, is what renders a finding beside the verdict
 * standing on it.
 */
export const findingLabels = pgTable('finding_labels', {
  /** Surrogate key; see `domains.id` for why `number` mode. */
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  /**
   * The finding this judgement is about.
   *
   * NOT NULL because the row is a verdict ON something. Without it
   * the row is the word `avoid` with nothing to attach it to, and no
   * reader could recover what was judged.
   *
   * Cascading on delete, which settles the question `findings` above
   * defers to this FK: deleting a judged finding IS allowed, and it
   * takes the judgements with it. The ownership test the module
   * already applies at `finding_sightings.finding_id` gives the
   * answer — nothing reads a label except through its finding — and
   * refusing would preserve no judgement worth having, only a
   * verdict whose subject is gone.
   *
   * The reach is the other half of why refusing was not close.
   * `findings.document_id` and `findings.domain_id` both cascade, so
   * `ON DELETE no action` here would refuse deleting a document or a
   * domain two hops away, over rows an operator standing at either
   * of those cannot see. That is the shape `ingested_files` states
   * at its own FK, where the knock-on was accepted; here it would be
   * paid on the ordinary lifecycle of a domain.
   *
   * The honest limit is that the cascade discards the only thing it
   * reaches that nothing recomputes. Re-scoring rebuilds findings
   * over a corpus nothing re-fetched; nothing rebuilds what a person
   * concluded. So whatever deletes findings is what decides whether
   * judged ones may go, and no constraint here will stop it.
   */
  findingId: bigint('finding_id', { mode: 'number' }).notNull()
    .references(() => findings.id, { onDelete: 'cascade' }),

  /**
   * The operator's ruling: one of the verdicts the owning domain
   * names in `DomainSettings.verdictVocabulary`, or one of
   * `DEFAULT_VERDICT_VOCABULARY` in `./values.ts` where it names
   * none.
   *
   * NOT NULL, because the ruling is the whole content of the row.
   * The one column in this schema constrained to a value set and
   * carrying no CHECK for it: the vocabulary is a per-domain setting
   * rather than a fixed set, so it is validated at the app layer
   * against the domain's own `settings`.
   */
  verdict: text('verdict').notNull(),

  /**
   * Whatever the operator wanted to say about the verdict, in their
   * own words.
   *
   * NULL is the ordinary case rather than a gap — a ruling that
   * needed no explanation — which is why this is nullable where a
   * column an operator is asked to fill would be NOT NULL defaulting
   * to `''`. There is no writer but a person here, so an absent note
   * is a person having written none, and the two states a default of
   * `''` would keep apart do not exist.
   *
   * Prose, and nothing computes from it. A reader deriving anything
   * countable here would be parsing free text against a shape no
   * domain declared; the structured half of a judgement is `verdict`
   * beside it, and a second structured field would be a column
   * rather than a convention inside this one.
   */
  note: text('note'),

  /**
   * When the judgement was made, which is when the row was written.
   * Defaults to now and NOT NULL on the reason `created_at` above
   * gives: there is no window in which a label exists and nobody has
   * made it.
   *
   * It is also what orders a finding's labels, and with no unique
   * key on the table it is the only thing that does — see the header
   * for what a reader that forgets to order gets. The ordering is
   * total in practice and not by construction: `now()` is the
   * transaction's start time rather than the statement's, so two
   * labels written in one transaction carry the same timestamp to
   * the microsecond and what separates them is `id`.
   */
  labelledAt: timestamp('labelled_at', { withTimezone: true }).defaultNow()
    .notNull(),
});
