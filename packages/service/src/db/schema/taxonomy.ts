/**
 * @packageDocumentation
 * The shallow taxonomy: how a domain states what it is looking for.
 *
 * `categories` are the buckets a domain sorts its subject matter into,
 * and each one owns the terms that decide what falls in it. What a
 * file-per-concern lexicon would scatter — a positive list, a negative
 * list, a phrase list, one file per kind of match — is rows here
 * instead, under one domain, editable without a deploy.
 *
 * Shallow is the design and not a stage it has yet to grow out of. A
 * category is a root or the child of a root, and nothing deeper: the
 * single-operator tools that survive at this job converged on flat
 * labels with group-level inheritance, and this is that shape with one
 * level of grouping — not a taxonomy waiting to deepen.
 */
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

import { bigint, bigserial, integer, pgTable, text, unique } from 'drizzle-orm/pg-core';

import { domains } from './domains.js';
import { TERM_POLARITIES, checkOneOf } from './values.js';

/**
 * `categories` — one named bucket of a domain's taxonomy.
 *
 * A category carries no matching logic of its own. It is the thing
 * terms hang off and `criteria` rows point at, which is what lets a
 * domain add a bucket the pipeline has never heard of by writing a row
 * rather than by widening an enum.
 */
export const categories = pgTable('categories', {
  /** Surrogate key; see `domains.id` for why `number` mode. */
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  /**
   * The domain whose taxonomy this category belongs to. Cascading on
   * delete for the reason `personas` does: a category has no identity
   * apart from its domain, and one left behind would strand every term
   * under it in a taxonomy nothing can reach.
   */
  domainId: bigint('domain_id', { mode: 'number' }).notNull()
    .references(() => domains.id, { onDelete: 'cascade' }),

  /**
   * The stable identifier the category is named by from outside the
   * table — a seed file, a query, a `criteria` row. The seed upserts on
   * it, so this is what makes a second seed pass rewrite this category
   * rather than add a rival one beside it.
   */
  key: text('key').notNull(),

  /** Operator-facing label. Free text, and safe to rename. */
  name: text('name').notNull(),

  /**
   * The category this one sits under, or NULL for a root. NULL is the
   * common case and the honest one: most taxonomies are flat, and a
   * root is not a category missing a parent.
   *
   * A parent must be a root and must belong to the same domain, so the
   * tree is at most one level deep and never crosses a domain. Neither
   * rule is expressible as a column constraint, and neither is left to
   * whoever writes the row: both are enforced in the database, by a
   * guard that lands with this schema's migrations.
   *
   * No cascade here, deliberately, unlike `domain_id` above. Deleting
   * a category that still holds children is refused rather than
   * quietly taking them, and their terms, with it; reparenting or
   * removing the children first makes that an explicit decision. It
   * does not obstruct dropping the whole domain: the default NO ACTION
   * is checked at the end of the statement, by which point the
   * domain's cascade has removed parent and children together.
   */
  parentId: bigint('parent_id', { mode: 'number' }).references((): AnyPgColumn => categories.id),
}, (table) => [
  /**
   * A key identifies one category within its domain, and that pair is
   * the row's natural key: the seed upserts on it, and a `criteria`
   * row resolves a category through it. Two domains are free to use
   * the same key for unrelated buckets.
   */
  unique('categories_domain_id_key_unique').on(table.domainId, table.key),
]);

/**
 * `terms` — one pattern a category matches on, and what a match is
 * worth.
 *
 * A row states all three parts of a match in one place: what to look
 * for, how much it counts, and which way it points. A lexicon kept as
 * files spreads those across a positive list, a negative list and an
 * ignore list, where a term's direction is carried by which file it
 * sits in and its weight by nothing at all. Here a list is a query
 * over this table, and moving a term between lists is an UPDATE of the
 * row rather than a cut and a paste between two files that can both
 * end up holding it.
 *
 * Nothing matches on these rows yet. The matcher — how a pattern is
 * applied to a document, and how the hits are combined into a score —
 * arrives with the scoring port in phase 5. What the table fixes now
 * is the shape the matcher will read: pattern, magnitude and
 * direction as three separate columns, none of them inferable from
 * where the row is stored.
 */
export const terms = pgTable('terms', {
  /** Surrogate key; see `domains.id` for why `number` mode. */
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  /**
   * The category this term matches for. Cascading on delete because a
   * term has no meaning apart from the bucket it fills: a term left
   * behind by a dropped category would go on matching for nothing,
   * which is worse than not existing.
   *
   * Unlike `categories.parent_id`, which refuses a delete rather than
   * taking children with it, the cascade is right here — terms are
   * the category's own contents, not rows of their own that someone
   * would want reparented.
   */
  categoryId: bigint('category_id', { mode: 'number' }).notNull()
    .references(() => categories.id, { onDelete: 'cascade' }),

  /**
   * What the row looks for, stored as the text an operator wrote.
   *
   * How it is applied is the matcher's decision and not this column's:
   * a pattern is matched anchored, never bare, because a short one
   * matched bare fires inside longer and unrelated words — the kind of
   * false positive that is invisible in a score and obvious only in
   * the document it came from.
   */
  pattern: text('pattern').notNull(),

  /**
   * How much a match is worth. Magnitude only — the direction is
   * `polarity`'s job, and the sign written here is not consulted, so a
   * negative number means what its positive means and no typo can
   * invert a term.
   *
   * NOT NULL because a weight is authored rather than measured. The
   * null-vs-zero rule leaves a numeric column nullable when NULL
   * distinguishes never-computed from a real zero; nothing computes
   * this one, and a term meant to carry no signal says so with
   * `ignore` polarity rather than by leaving its weight out. There is
   * no default either: how much a term counts is the decision the row
   * exists to record, and a default would let it be skipped silently.
   */
  weight: integer('weight').notNull(),

  /**
   * Which way a match moves the score — see `TERM_POLARITIES` in
   * `./values.js` for what each member means. The CHECK enforcing it
   * is generated from that tuple below, so the stored domain and the
   * union callers program against are one declaration.
   *
   * NOT NULL is what makes that CHECK cover the column. A CHECK
   * evaluates to UNKNOWN against NULL and so admits it: without this,
   * the column's domain would be four values — the three the tuple
   * names, plus one that satisfies the constraint by not being a value
   * at all, and that no reader of the union would ever expect.
   */
  polarity: text('polarity').notNull(),

  /**
   * Why this term is here, for whoever meets the row next. NULL means
   * nobody wrote one; nothing derives anything from it, and no reader
   * treats its absence as saying anything about the term.
   */
  notes: text('notes'),
}, (table) => [
  /**
   * A pattern appears once per category, and that pair is the row's
   * natural key: the seed upserts on it, so UNIQUE is what makes a
   * second seed pass rewrite a term's weight rather than add a second
   * row that would then count the same match twice.
   *
   * Scoped to the category rather than to the domain on purpose. The
   * same pattern under two categories is two different statements —
   * what it means is the category's — and a domain-wide key would
   * refuse the second one.
   */
  unique('terms_category_id_pattern_unique').on(table.categoryId, table.pattern),

  /**
   * The polarity domain, enumerated in the generated SQL from the
   * tuple the union is derived from. Named rather than left to
   * drizzle's derivation so the constraint is greppable in the
   * migration by the static-SQL invariant suite.
   */
  checkOneOf('terms_polarity_check', table.polarity, TERM_POLARITIES),
]);
