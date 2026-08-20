/**
 * @packageDocumentation
 * `entities` — the registry of subjects a domain tracks: one row per
 * thing its findings can be about.
 *
 * A finding is a reading of a document; an entity is the subject that
 * reading is attributed to, and the registry is what makes a second
 * finding about the same subject join the first rather than start
 * again. Everything a domain accumulates about a subject over time —
 * what research turned up, how a person judged it, how often it has
 * been seen — hangs off one row here instead of being re-derived from
 * a name at every place that reads it.
 *
 * The registry is per domain. Two domains tracking a subject of the
 * same name hold two rows, and neither sees the other's: the unique
 * key below is (domain, normalized name), not the name alone. The
 * design this port draws from kept one registry because it had one
 * subject matter; here the same table serves every domain at once,
 * and a shared row would carry one domain's reading of a subject into
 * a domain that never asked about it.
 *
 * A name is stored twice, as written and as matched. `name` is what a
 * person reads and `name_norm` is what the registry dedupes on, and
 * that split is what lets one subject arrive spelled three ways and
 * land on one row.
 *
 * Nothing writes these rows yet. Attribution is `ar-ingest`'s (phase
 * 5) and what accumulates against a subject is `ar-research`'s (phase
 * 6). `entity_research` below is what one run found out about a
 * subject; the module gains `research_pool` later in this stage — the
 * gate deciding which subjects are researched at all.
 */
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

import { bigint, bigserial, jsonb, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';

import { domains } from './domains.js';

/**
 * `entities` — one subject a domain tracks.
 *
 * The row is deliberately thin. What a subject IS varies between
 * domains more than anything else in this schema, so the columns hold
 * only what is needed to find the row again and attribute to it;
 * everything else is `attributes`, which the domain fills.
 */
export const entities = pgTable('entities', {
  /** Surrogate key; see `domains.id` for why `number` mode. */
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  /**
   * The domain whose registry this subject belongs to. Cascading on
   * delete like every other domain-owned row: which subjects are
   * worth tracking is a decision made under one domain's criteria,
   * and a registry outliving the domain that built it is a list
   * nothing can say the purpose of.
   */
  domainId: bigint('domain_id', { mode: 'number' }).notNull()
    .references(() => domains.id, { onDelete: 'cascade' }),

  /**
   * The subject's name as it arrived, for a person to read.
   *
   * The display half of the pair. Nothing matches on it, so it is
   * free to keep the capitalization, punctuation and spacing the
   * source used rather than whatever survived normalization — and
   * renaming it moves no key and breaks no join.
   *
   * NOT NULL is not the same as non-empty, and the empty string means
   * something here: that the writer had no name to show. It costs
   * legibility rather than correctness, the same asymmetry
   * `ingested_files.path_hash` and `path` carry in `./documents.ts`;
   * the cost of a blank is paid at `name_norm` below, which is the
   * half the registry actually rests on.
   */
  name: text('name').notNull(),

  /**
   * The same name reduced to the form the registry matches on: the
   * row's key half, what an upsert resolves an entity through, and
   * what makes one subject spelled three ways land on one row.
   *
   * What "normalized" means is the writer's definition and not this
   * schema's. Nothing here computes the value, so every writer that
   * stores or looks up an entity has to reduce a name the same way —
   * and a writer that does not agree never fails, it silently misses:
   * the lookup finds nothing, the write inserts a rival row beside
   * the one it meant to find, and the registry goes on looking
   * correct from the inside. The design this port draws from met
   * exactly that with three places deriving the key separately, and
   * answered it with one stored function all of them called; whatever
   * answers it here has to be a single definition for the same
   * reason.
   *
   * The empty string is the one value that must never be stored. A
   * blank key collapses every subject a writer could not name onto a
   * single row per domain — one entity accumulating the research,
   * findings and judgements of all of them. A writer with no name to
   * hand synthesizes something that distinguishes the subject
   * instead, and `alias_of` below is how that placeholder is settled
   * when the real subject is finally named.
   */
  nameNorm: text('name_norm').notNull(),

  /**
   * The entity this row turned out to be, when it turned out to be
   * another one. NULL says the row IS its own subject, which is the
   * ordinary state — an alias is the exception, not a pointer every
   * other row is missing.
   *
   * A merge is a pointer rather than a rewrite. A placeholder that
   * stood in for a subject nobody had named yet keeps its own row and
   * its own history, and readers resolve through this column
   * (`COALESCE(alias_of, id)`) instead. Re-pointing the rows that
   * cite the placeholder would destroy the one thing it was worth
   * keeping for: when the subject was first seen, and under what it
   * was first called.
   *
   * No `onDelete`, so it emits `ON DELETE no action` and deleting an
   * entity that aliases still point at is refused. `ON DELETE SET
   * NULL` is expressible here — the column is nullable — and is the
   * one option worth arguing against explicitly, because the design
   * this port draws from took it: the NULL it writes already means
   * "this row is its own subject", so a deleted target quietly
   * promotes every placeholder back into a subject of its own. That
   * is the duplicate the alias existed to collapse, restored in a
   * state indistinguishable from a row that was never an alias. A
   * cascade inverts the fault instead, discarding a placeholder's
   * history because the subject it points at was tidied away.
   * Refusing leaves the choice with whoever is deleting, and it does
   * not obstruct dropping the whole domain, for the reason
   * `categories.parent_id` in `./taxonomy.ts` records at the same
   * shape of self-reference.
   *
   * Two things this column does not enforce, worth naming rather than
   * assuming: a row may point at itself, and two rows may point at
   * each other. Neither loops a reader, because resolution is one hop
   * — a self-alias resolves to the row itself, and a chain resolves
   * to whatever its first hop names rather than being followed to the
   * end. Neither is refused either, so a writer that builds one gets
   * no error and the second hop is simply never read.
   */
  aliasOf: bigint('alias_of', { mode: 'number' }).references((): AnyPgColumn => entities.id),

  /**
   * Whatever this domain records about a subject beyond its name.
   *
   * Defaults to `{}` and is NOT NULL, the settled choice for a JSONB
   * payload whose two absences come to the same thing: nothing
   * recorded yet and recorded as nothing read identically to
   * everything that opens this column, so a NULL would buy a
   * distinction no reader acts on and cost every reader a guard. Set
   * against `documents.raw` in `./documents.ts`, which is nullable
   * because there the two genuinely differ.
   *
   * No `$type` annotation, for the reason `sources.parser_config`
   * carries none: what belongs here varies by domain, and one
   * interface across every domain would describe none of them. No
   * CHECK reaches inside a JSONB payload either, so the shape is the
   * writing domain's to keep — this schema stores the payload and
   * says nothing about it.
   */
  attributes: jsonb('attributes').default({})
    .notNull(),
}, (table) => [
  /**
   * A normalized name identifies one subject within its domain, and
   * that pair is the row's natural key: an upsert resolves an entity
   * through it, which is what makes a second sighting of a subject
   * find the row the first one left. Two domains are free to track
   * unrelated subjects under the same name.
   */
  unique('entities_domain_id_name_norm_unique').on(table.domainId, table.nameNorm),
]);

/**
 * `entity_research` — what one run found out about a subject: the
 * prose a person reads and the structured payload behind it, one row
 * per research pass rather than one per subject.
 *
 * Research reaches outside the corpus and spends model calls to get
 * there, and nothing else stored here can reproduce what it comes
 * back with. So the result is written where every later reader finds
 * it — a digest, an export, and the next run's decision about whether
 * to research the subject again — and a subject researched recently
 * is not researched a second time. How recently counts as recent is
 * the reader's question rather than this table's: no column holds a
 * freshness window, and a reader that wants one compares
 * `researched_at` below against an interval of its own.
 *
 * Rows ACCUMULATE, which is this port's divergence from the design it
 * draws from. There the table held one row per subject, keyed on the
 * normalized name and upserted on every pass, so each result
 * overwrote the last and what a subject looked like before the newest
 * pass had no answer. Here the key is a surrogate and the entity FK
 * repeats: every pass keeps its own row, the current picture is the
 * newest of them, and what changed between two passes is readable.
 * `finding_labels` in `./findings.ts` makes the same trade against
 * the same design for the same reason, and states what it costs every
 * reader. Here the cost is that the current result is `ORDER BY
 * researched_at DESC LIMIT 1` rather than a select, and a reader that
 * forgets gets every pass at once rather than an error.
 *
 * Nothing writes these rows yet; `ar-research` is phase 6.
 */
export const entityResearch = pgTable('entity_research', {
  /** Surrogate key; see `domains.id` for why `number` mode. */
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  /**
   * The subject this research is about.
   *
   * NOT NULL because the row has no content without it — a result is
   * a result ABOUT something — and because nothing reads these rows
   * except through the subject they hang off.
   *
   * Cascading on delete, where `run_id` beside it takes the opposite
   * answer, because the entity does own these rows: they are what a
   * domain accumulated about that subject, which is the ownership
   * test `findings.document_id` in `./findings.ts` applies. Research
   * outliving its subject would be a summary of a row nobody can
   * reach, and the way to retire a subject whose research is still
   * wanted is `alias_of` above rather than a DELETE.
   */
  entityId: bigint('entity_id', { mode: 'number' }).notNull()
    .references(() => entities.id, { onDelete: 'cascade' }),

  /**
   * The run that produced this result, when a run produced it.
   *
   * NULL is an ordinary state rather than a gap. Research can also be
   * written by hand, carried in from whatever a domain kept before it
   * had a pipeline, or backfilled — none of that happened inside a
   * run, and naming one anyway would make the ledger claim work it
   * never did.
   *
   * The reference is not here yet: `runs` arrives later in this
   * stage, and `.references()` cannot name a module that does not
   * exist. What it will take is already settled, so the later edit is
   * one line rather than a decision made in passing. No `onDelete`,
   * emitting `ON DELETE no action`, on the rule the rest of this
   * schema follows: cascade only where the referenced row owns the
   * referencing one, and a run does not own what it found — the
   * entity one column above does. `ON DELETE SET NULL` is the option
   * worth refusing explicitly, because the NULL it writes already
   * means no run produced this row, so a run deleted out from under
   * its own results would silently reclassify them as hand-written.
   *
   * Refusing has a reach to check when the reference is wired rather
   * than to assume now: a run scoped to a domain goes when that
   * domain does, and whether the results citing it are already gone
   * by the end of that statement is what decides whether dropping a
   * domain is refused. `ingested_files.document_id` in
   * `./documents.ts` records the same two-hop trap met from the other
   * side.
   */
  runId: bigint('run_id', { mode: 'number' }),

  /**
   * What the research found, in prose, for a person to read.
   *
   * Nullable, and the NULL means no prose was produced — a pass that
   * came back with structured fields and no narrative, or a writer
   * that stores the payload now and renders a summary later. It is
   * not the same as `''`, which claims a summary was written and that
   * it was empty: a surface showing "not summarized" and one showing
   * a blank paragraph are different answers, and only the first is
   * honest about a pass that produced none. That is the text
   * analogue of the rule `findings.score` in `./findings.ts` states
   * for numbers.
   *
   * Unbounded on purpose. What a summary is worth varies by domain,
   * and a length cap here would truncate at a number no domain agreed
   * to; the writer that calls the model is where a limit belongs,
   * because it is the only place that knows what was asked for.
   */
  summary: text('summary'),

  /**
   * The structured half of the same result: whatever a domain's
   * research is meant to come back with beyond prose.
   *
   * The design this port draws from spent a column each on the fields
   * its own subject matter wanted, which is the part that cannot port
   * — a second domain researching something else would need its own
   * columns and a migration to add them. Neutral core columns plus a
   * domain-shaped payload is the same split `findings.fields` in
   * `./findings.ts` makes, for the same reason.
   *
   * One difference from that column is worth knowing before reading
   * this one: a finding's payload has `DomainSettings.fieldContract`
   * in `./domains.ts` to be validated against, and this payload has
   * nothing — no contract declares its keys and no CHECK reaches
   * inside a JSONB value, so a reader has only the writing domain's
   * own convention to go on.
   *
   * Defaults to `{}` and is NOT NULL, following `entities.attributes`
   * above: a row is written only when research actually ran, so
   * nothing structured found and nothing stored are the same state
   * here, and a NULL would buy a distinction no reader acts on. No
   * `$type` either, for the reason recorded there — what belongs
   * inside varies by domain, and one interface across all of them
   * would describe none of them.
   */
  payload: jsonb('payload').default({})
    .notNull(),

  /**
   * When this research was recorded.
   *
   * Defaults to now and is NOT NULL because there is no window in
   * which one of these rows exists and the research behind it has not
   * happened. The honest limit is which moment it names: the default
   * dates the WRITE, so a pass that searched at one time and
   * persisted five minutes later is dated by the second, and only a
   * writer holding the search time can record that instead by passing
   * it.
   *
   * This is the column the table is ordered and filtered by, and it
   * carries that weight without a unique key above it — so the two
   * things it cannot do alone are worth naming. `now()` is the
   * TRANSACTION's start time, so two rows written in one transaction
   * tie to the microsecond and the tiebreak is `id`, exactly as
   * `finding_labels.labelled_at` in `./findings.ts` records. And
   * nothing here stops two passes over one subject landing seconds
   * apart; accumulating is the point, but a reader wanting the
   * current picture has to say so rather than assume the table holds
   * one row per subject.
   */
  researchedAt: timestamp('researched_at', { withTimezone: true }).defaultNow()
    .notNull(),
});
