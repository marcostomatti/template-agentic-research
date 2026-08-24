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
 *
 * The cap is enforced by the database rather than by whoever writes
 * the row. A `BEFORE INSERT OR UPDATE` trigger on `categories` calls
 * `categories_enforce_depth()`, which refuses three writes: a row
 * whose parent is itself a child, a row given a parent while it
 * already has children — the same cap broken from the other end, by an
 * UPDATE instead of an INSERT — and a parent belonging to a different
 * domain than the child.
 *
 * Two separate things stop that check living in application code. The
 * first is that depth is not a property of the row being written: it
 * is a property of that row's parent, and of its own children, so
 * there is nothing for a column constraint to look at. The second is
 * that there is no single writer to put the check in. Rows reach this
 * table from the seed script, from hand-written SQL inside workflow
 * nodes, and from an operator at a psql prompt, and a check written in
 * one of those binds only that one — a branch in a workflow the
 * executor's UI can edit is not a rule, it is one writer's habit. A
 * trigger refuses the write whoever makes it. That is the whole of
 * what it buys: it does not serialize two concurrent writers, and
 * nothing here relies on it doing so.
 *
 * It ships in a hand-written migration under `drizzle/` rather than
 * being generated from this file, which means the rule is real in the
 * database and invisible in this module — the columns below do not
 * show it. That split is deliberate: drizzle-kit's snapshot does not
 * model triggers, so it never proposes dropping one it cannot see, and
 * `db:generate` reporting no changes goes on meaning that the schema
 * and the migrations agree.
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
   * whoever writes the row: both are enforced in the database, by the
   * `categories_enforce_depth()` trigger this module's header
   * describes.
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

/**
 * `criteria` — one thing a domain has stated about what it wants,
 * filed under one of its categories.
 *
 * A criterion is not matched against a document the way a term is. It
 * is what the pipeline can say about the domain when it asks a model
 * to judge something: the things wanted, the things refused, the
 * background a draft would otherwise have to invent. `terms` decide
 * mechanically what a document scores; `criteria` are the stated
 * position that scoring is against.
 *
 * That is why the two stay separate tables despite both hanging off a
 * category. A term is a pattern and a magnitude, and nothing else can
 * be done with it. A criterion is a sentence about the domain, and one
 * matched as if it were a pattern — or rendered as if it were a
 * measurement — is wrong in both directions.
 *
 * Nothing reads these rows yet; the scoring port that does is phase 5.
 */
export const criteria = pgTable('criteria', {
  /** Surrogate key; see `domains.id` for why `number` mode. */
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  /**
   * The domain whose position this row states. Cascading on delete
   * like every other domain-owned row: a criterion outliving its
   * domain states a position nobody holds.
   *
   * Carried here as well as on the category so a run can read a
   * domain's whole stated position in one query rather than joining
   * through the taxonomy to find out whose it is. The two must name
   * the same domain, and no column constraint says so — a writer that
   * invents the pair instead of reading it off the category is the
   * only way they come apart.
   */
  domainId: bigint('domain_id', { mode: 'number' }).notNull()
    .references(() => domains.id, { onDelete: 'cascade' }),

  /**
   * The bucket this criterion is filed under — a row in `categories`,
   * so which buckets exist is the domain's to decide.
   *
   * A foreign key here is the port's substantive change to this table.
   * The design this one is ported from filed a criterion under a text
   * column constrained to a fixed vocabulary, which put the list of
   * buckets in DDL: adding one meant dropping the constraint and
   * re-adding it widened. Here the list is rows in a table the domain
   * already owns, so a bucket nobody anticipated is an INSERT — the
   * same row-not-a-migration property `domains.settings` has, applied
   * to the taxonomy rather than to the configuration.
   *
   * What the enum form cost is worth stating, because it is why this
   * is not merely a tidier spelling of the same thing. A widened
   * constraint has to be re-added by exactly one migration — the
   * newest that touches it — or a replay from an intermediate state
   * meets two migrations adding one constraint and fails. And the
   * drop is easy to leave out: one migration there described its own
   * drop in a comment without writing it, so a fresh database aborted
   * the whole run at the first row carrying a value the original set
   * did not admit, while the long-lived database, which already held
   * the widened constraint, never showed it. Nothing about a category
   * is DDL here, so neither failure has a shape to take.
   *
   * The FK also makes the set per-domain, which the enum could not be:
   * a fixed vocabulary is one list for every domain, so one domain's
   * new bucket would widen what every other domain may file under.
   *
   * Cascading on delete for the reason `terms` does: criteria are a
   * category's contents rather than rows of their own, and one left
   * behind by a dropped category is filed under nothing.
   */
  categoryId: bigint('category_id', { mode: 'number' }).notNull()
    .references(() => categories.id, { onDelete: 'cascade' }),

  /**
   * What is being stated, as the operator wrote it.
   *
   * NOT NULL, which is not the same as non-empty. An empty value is an
   * unfilled criterion: the domain has said the question exists and
   * has no answer for it yet, and every reader must treat that as no
   * opinion stated rather than as a stated blank. The distinction is
   * not cosmetic — read as a value, an empty row under a bucket that
   * excludes things says "exclude everything", which is the opposite
   * of what leaving it blank meant.
   */
  value: text('value').notNull(),

  /**
   * Which way the statement points: whether the value is something the
   * domain wants, something it refuses, or context that is neither.
   *
   * It belongs beside the value wherever criteria are handed to a
   * model, not used to filter them. A refusal dropped from the read,
   * or presented as background, is the domain's clearest signal
   * arriving as its vaguest.
   *
   * NOT NULL, and free text with no CHECK. Which distinctions are
   * worth drawing is part of what a domain states, and a set fixed in
   * DDL would need a migration to admit the next one.
   */
  kind: text('kind').notNull(),

  /**
   * Guidance for whoever edits the row next: what the value should
   * look like, what leaving it blank means here. NULL means nobody
   * wrote any, and nothing derives anything from its absence.
   */
  notes: text('notes'),
}, (table) => [
  /**
   * A value is stated once per category, and that pair is the row's
   * natural key: the seed upserts on it, so a second pass rewrites a
   * criterion's kind and notes rather than leaving two rows stating
   * the same thing, possibly in opposite directions.
   *
   * Scoped to the category rather than to the domain, as `terms` is.
   * The same value under two categories is two different statements —
   * what it asserts is the category's — and a domain-wide key would
   * refuse the second one.
   */
  unique('criteria_category_id_value_unique').on(table.categoryId, table.value),
]);
