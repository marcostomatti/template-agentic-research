/**
 * @packageDocumentation
 * The term seed shape, declared once: the row schema, the file
 * schema around it, and the serialiser that writes a document back
 * out.
 *
 * `data/terms.json` was the only reader of this shape until the HTTP
 * surface grew a bulk import and a `?format=seed` export. A lexicon
 * that can be imported, edited and exported again is round-trippable
 * only against ONE declaration of the bytes: two declarations agree
 * until the day one of them gains a member, and the failure is a
 * document a route accepts and the seed pass refuses, or the
 * reverse. So the shape belongs in the module that owns the
 * resource, and `scripts/seed-schemas.ts` reaches it from here
 * rather than the other way round — the direction `scripts/`
 * already imports in, and the same split that file and
 * `scripts/seed-apply.ts` already make between what a seed IS and
 * what applying one does.
 *
 * EVERY OBJECT HERE IS `.strict()`, carried over with the shape.
 * Zod's default is to STRIP an unknown key and report nothing, which
 * is the failure worth paying a refusal to avoid: a mistyped member
 * validates, the row is written, and the value its author wrote is
 * nowhere. Both readers can afford the refusal. A seed pass names
 * the file and the key; a route's detail names the object that
 * refused and never the key it refused, because
 * `src/http/validation.ts` builds it.
 *
 * WHAT CANONICAL MEANS, stated rather than assumed, because "byte
 * for byte" is a claim about bytes: an object whose only key is
 * `terms`, two-space indent, each row's five members in the order
 * the schema declares them, rows ordered by `pattern`, and one
 * trailing newline. Every one of those is a choice, and two
 * documents compared for equality are compared on all of them.
 *
 * TWO THINGS AN EXPORT CANNOT REPRODUCE, both properties of
 * `data/terms.json` rather than of this module. That file carries a
 * `_readme` header which `stripUnderscoreKeys` clears before
 * anything is validated, so no row survives to rebuild it and an
 * export of its rows equals its CANONICAL form rather than its own
 * bytes. And its rows span three categories while the export a route
 * serves is scoped to one, so a round-trip fixture is a
 * single-category document derived from those rows and not the file.
 *
 * THE ORDER IS THIS MODULE'S OWN AND RESTS ON NO DATABASE. Postgres
 * orders a read by the collation of the deployment it runs in, and
 * `terms.pattern` is free text carrying case, spaces and
 * punctuation — so a store's `ORDER BY` is what makes a page a
 * page and nothing more. The comparator below is a plain code-unit
 * compare, which is what makes two exports of the same rows equal on
 * any server.
 */
import { z } from 'zod';

import { TERM_POLARITIES } from '../db/schema/values.js';

/**
 * The indent a canonical document is written at.
 *
 * Named rather than passed inline because it is part of the format
 * this module defines and not a formatter's default: a reader
 * comparing two documents is comparing this number as much as the
 * rows.
 */
const INDENT = 2;

/**
 * One row of `data/terms.json`, and one entry of a bulk import: a
 * pattern a category matches on, and what a match is worth. Upserted
 * by the (category, pattern) pair `terms_category_id_pattern_unique`
 * holds.
 *
 * `categoryKey` is not a column. `terms.category_id` holds a key the
 * database issues, which no document can know before the category
 * row is written, so a term names its category by the key
 * `data/categories.json` seeds. Resolving it belongs to whoever
 * reads the document — `loadSeedBundle` for a seed pass, the
 * terms service for an import, which additionally refuses a row
 * naming a category other than the one the path addressed.
 *
 * `weight` is an integer and nothing more. Its sign is not consulted
 * — which way a match points is `polarity`'s to say — so a
 * negative weight means exactly what its positive means, and
 * refusing one here would refuse a row the database accepts and the
 * matcher reads the same way.
 *
 * `polarity` imports `TERM_POLARITIES` rather than restating its
 * three members. That tuple is the single declaration
 * `terms_polarity_check` is generated from, so widening it widens
 * the CHECK and this schema together and no document can name a
 * polarity the column would refuse.
 *
 * `notes` is required AND nullable. A nullable column with no
 * default is written out with an explicit `null` rather than left
 * off, so a deliberate absence is distinguishable from one somebody
 * forgot — and, here, so a serialised row carries the member at
 * all: `JSON.stringify` drops an `undefined`, which would make a
 * document that omits `notes` and one that states `null` two
 * different files saying the same thing.
 */
export const termSeedSchema = z.object({
  categoryKey: z.string().min(1),
  pattern: z.string().min(1),
  weight: z.number().int(),
  polarity: z.enum(TERM_POLARITIES),
  notes: z.string().nullable(),
}).strict();

/**
 * The whole of a terms document: `data/terms.json` once
 * `stripUnderscoreKeys` has cleared its header, or a bulk import
 * body as it arrives.
 *
 * Strict at this level too. A top-level key other than `terms` is a
 * document whose rows would never be read, and an apply reporting
 * nothing written is a worse answer than an error naming the key.
 *
 * Named in the seed-file register (`DomainsFileSchema`,
 * `CategoriesFileSchema`, ...) rather than the camelCase one the
 * rest of `src/` uses for a payload validator, because the name is
 * what `scripts/seed.ts` already imports and a rename would buy
 * nothing but the churn.
 */
export const TermsFileSchema = z.object({
  terms: z.array(termSeedSchema),
}).strict();

/**
 * One validated terms row, as {@link TermsFileSchema} yields it.
 */
export type TermSeed = z.infer<typeof termSeedSchema>;

/**
 * Orders two rows for a canonical document: by
 * {@link TermSeed.pattern} first, then by `categoryKey`.
 *
 * A plain code-unit compare rather than `localeCompare`, for the
 * reason the module header gives: the order has to be a property of
 * this file and not of the locale a process or a database happens to
 * run under.
 *
 * The second key is what makes the order TOTAL. Within one category
 * `terms_category_id_pattern_unique` already makes `pattern` unique,
 * so the tie-break never fires on the export a route serves; it
 * fires on a document spanning categories, where ordering on
 * `pattern` alone would leave two rows in whatever order the caller
 * handed them over. `Array.prototype.sort` is stable, which is
 * exactly why that would go unnoticed until the same rows arrived in
 * a different order.
 */
function compareTermSeeds(left: TermSeed, right: TermSeed): number {
  if (left.pattern !== right.pattern) {
    return left.pattern < right.pattern
      ? -1
      : 1;
  }

  if (left.categoryKey === right.categoryKey) {
    return 0;
  }

  return left.categoryKey < right.categoryKey
    ? -1
    : 1;
}

/**
 * Writes rows out as a canonical terms seed document, in the shape
 * {@link TermsFileSchema} accepts back.
 *
 * Each row is REBUILT member by member rather than spread, and that
 * is the whole of the key-order guarantee. `JSON.stringify` writes
 * own enumerable keys in insertion order, so a row that reached this
 * function from `JSON.parse` of a hand-edited file, or from a store
 * projection listing its columns in another order, validates
 * identically and would otherwise serialise to different bytes.
 *
 * @param rows - Rows already validated against
 *   {@link termSeedSchema}. Not mutated: the sort runs over a copy,
 *   so a caller's array keeps the order it had.
 * @returns The document's whole text, ending in exactly one
 *   newline — what a file on disk carries and what a
 *   `?format=seed` response body is compared against.
 */
export function serializeTermSeedDocument(
  rows: readonly TermSeed[],
): string {
  const ordered = [...rows].sort(compareTermSeeds);
  const document = {
    terms: ordered.map((row) => ({
      categoryKey: row.categoryKey,
      pattern: row.pattern,
      weight: row.weight,
      polarity: row.polarity,
      notes: row.notes,
    })),
  };

  return `${JSON.stringify(document, null, INDENT)}\n`;
}
