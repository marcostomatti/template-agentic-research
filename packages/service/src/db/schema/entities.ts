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
 * 6). The module gains `entity_research` and `research_pool` later in
 * this stage — what a run found out about a subject, and the gate
 * deciding which subjects are researched at all.
 */
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

import { bigint, bigserial, jsonb, pgTable, text, unique } from 'drizzle-orm/pg-core';

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
