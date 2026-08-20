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

import { bigint, bigserial, pgTable, text, unique } from 'drizzle-orm/pg-core';

import { domains } from './domains.js';

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
