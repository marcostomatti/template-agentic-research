/**
 * @packageDocumentation
 * The term rules: reading a category's lexicon, adding one term to
 * it, applying a whole seed document to it, editing or moving one
 * term, taking one away, and writing the category back out as a
 * seed document. What `/categories/:id/terms` and `/terms/:id`
 * reduce to once HTTP is subtracted from them.
 *
 * SIX FUNCTIONS, one more than the categories half has, and the
 * extra two are the round trip the spec asks for: a bulk import
 * that accepts the shape `data/terms.json` carries, and an export
 * that writes the same shape back. Both stand on
 * `./seed-format.ts`, which declares that shape once for this
 * module and for `scripts/seed-schemas.ts` alike — two
 * declarations would agree until one of them gained a member, and
 * the failure would be a document one reader accepts and the other
 * refuses.
 *
 * THE BODY IS PARSED HERE RATHER THAN ABOVE, exactly as
 * `./categories-service.ts` and `src/domains/service.ts` argue: an
 * operation handed an already-validated input would have two
 * callers validating it, the router today and the MCP tool wave 3
 * exposes tomorrow, from a second schema nobody would notice
 * drifting. So every function taking a body takes an `unknown` and
 * runs it through {@link parseBody}.
 *
 * THE WHOLE DOCUMENT IS VALIDATED BEFORE ANY OF IT IS WRITTEN, and
 * that is three separate checks rather than one. `TermsFileSchema`
 * refuses a malformed row wherever it sits, so one bad entry in a
 * hundred leaves zero rows written; {@link importTerms} then
 * refuses a row naming a category other than the one the path
 * addressed; and it refuses a document stating one pattern twice.
 * Only then does a single upsert run. The last of those three is
 * not tidiness: Postgres answers SQLSTATE 21000 when one
 * statement's values repeat the conflict target, `classifyPgError`
 * deliberately does not recognise it, and `TaxonomyStore.upsertTerms`
 * therefore states one-row-per-pattern as a PRECONDITION rather
 * than as something to catch afterwards. A 500 naming neither
 * colliding row is what this check exists to replace.
 *
 * A BULK IMPORT UPSERTS AND A SINGLE CREATE INSERTS, which is the
 * one place two operations over the same table answer a duplicate
 * differently. A document is a lexicon being applied, so it
 * conflicts on `terms_category_id_pattern_unique` and rewrites what
 * it finds — the same thing `scripts/seed.ts` does with the same
 * file, and what lets import, export and re-import settle instead
 * of accumulating a second row that would count the same match
 * twice. A single `POST` is a caller stating that a pattern is not
 * yet in the bucket, so a duplicate is a 409 rather than a silent
 * rewrite of somebody else's weight.
 *
 * THREE OPERATIONS READ THE CATEGORY AND TWO DO NOT, and the split
 * is what each one needs rather than a consistency this module
 * failed to keep. {@link listTerms} reads it because an unknown
 * category and an empty one are otherwise the same answer — the
 * store's list and count both answer emptily for an id no row
 * carries. {@link importTerms} and {@link exportTermsAsSeed} read
 * it for its `key`, which is the member every seed row names.
 * {@link createTerm} reads nothing: `terms.category_id` is a
 * foreign key, so the insert itself is what says the category is
 * not there, and a preceding read would buy a round trip and a
 * second chance for the row to go in between. {@link deleteTerm}
 * addresses a term and names no category at all.
 *
 * A BUCKET MOVE IS THIS MODULE'S RULE AND THE DATABASE HOLDS NO
 * PART OF IT. Nothing in the schema relates a term to a domain —
 * `terms` reaches `domains` only through `categories`, and no
 * constraint follows that path — so moving a term into another
 * domain's taxonomy is a write Postgres accepts, measured.
 * {@link patchTerm} therefore reads both categories when a move is
 * asked for and refuses the ones that disagree, which is the one
 * place here a rule is CHECKED before a write rather than
 * translated after one. The depth rule on the categories half is
 * the opposite case for the opposite reason: a trigger holds it
 * against every writer, so a check there would be a second, weaker
 * statement of a rule that already held.
 *
 * NOTHING SUBMITTED REACHES A MESSAGE OR A DETAIL BUILT HERE. Every
 * message below is a constant of this module's own and every field
 * path is built from a member name and a row INDEX, so a detail can
 * name the row that was wrong without quoting what it said. No
 * `StoreRefusal` field is copied into anything: a driver error's
 * `detail` reads `Key (category_id, pattern)=(...) already exists.`
 * and the drizzle wrapper's `message` carries the whole statement
 * with its bound parameters, so quoting either would put a
 * submitted value on the wire and, through `errorHandler`, in a log
 * line.
 *
 * A `StoreRefusal` IS TRANSLATED AND NEVER RETHROWN AS ITSELF, for
 * the reasons it is declared a plain `Error` in
 * `src/db/store-errors.ts`. The two mechanisms `TaxonomyStore`
 * declares for this half are translated below and anything else is
 * rethrown untouched, which answers 500 rather than a plausible
 * status no rule authorised. A `check-violation` is among the
 * things rethrown: the only CHECK on `terms` is
 * `terms_polarity_check`, and `termSeedSchema` and
 * {@link createTermSchema} are both generated from the same
 * `TERM_POLARITIES` tuple the constraint is, so a store reaching it
 * has written a polarity no caller could have submitted.
 *
 * THE STORE IS A PARAMETER, so every rule here is exercisable with
 * no database: `tests/helpers/memory-research-store.ts` stands
 * behind the port and refuses what Postgres refuses, the burnt ids
 * and the upsert's own conflict behaviour included.
 */
import type { TermSeed } from './seed-format.js';
import type {
  CategoryRecord,
  TaxonomyStore,
  TermRecord,
} from './store.js';
import type { FieldError } from '../../lib/errors/index.js';
import type { StoreWindow } from '../http/schemas.js';

import { z } from 'zod';

import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../lib/errors/index.js';
import { TERM_POLARITIES } from '../db/schema/values.js';
import { StoreRefusal } from '../db/store-errors.js';
import { parseBody } from '../http/validation.js';

import {
  TermsFileSchema,
  serializeTermSeedDocument,
} from './seed-format.js';

/**
 * Exactly the port methods these six functions reach.
 *
 * A `Pick` RATHER THAN THE PORT WHOLE, for the reason
 * `CategoryServiceStore` in `./categories-service.ts` gives:
 * asking for `TaxonomyStore` entire would have this module claim to
 * need the four category writes it never issues, and a reader could
 * not tell from the type which half of the surface it was looking
 * at. `findCategoryById` is the one category method here, and it is
 * a READ — this module writes no category.
 *
 * NO `DomainStore` AT ALL, unlike the categories half. Neither term
 * path names a `:slug`: a term is addressed under its category and
 * a category is addressed by its id, so there is no natural key to
 * resolve. The one rule that spans domains — a bucket move into
 * another taxonomy — is answered from two `CategoryRecord.domainId`
 * values this module already has to read, not from a domain row.
 *
 * Built with `Pick` rather than by listing signatures, so a method
 * here cannot drift from the thing it is naming.
 */
export type TermServiceStore = Pick<
  TaxonomyStore,
  | 'countTerms'
  | 'deleteTerm'
  | 'findCategoryById'
  | 'findTermById'
  | 'insertTerm'
  | 'listTerms'
  | 'updateTerm'
  | 'upsertTerms'
>;

/**
 * What a caller is told when no category carries the id it named.
 *
 * The same sentence `./categories-service.ts` answers for its own
 * `:id`, spelled again rather than imported. The two are equal by
 * intent rather than by derivation, and either is free to change
 * without dragging the other with it — the same argument that keeps
 * `requireDomain` unexported in both modules that have one.
 */
const NO_SUCH_CATEGORY = 'No category carries that id';

/** What a caller is told when no term carries the id it named. */
const NO_SUCH_TERM = 'No term carries that id';

/** What a caller is told when the pattern it proposed is taken. */
const PATTERN_ALREADY_TAKEN
  = 'This category already carries a term under that pattern';

/**
 * The message a 422 built here carries.
 *
 * The parser's own wording, spelled again for the reason
 * `./categories-service.ts` gives: a caller reading a 422 off this
 * surface gets the same sentence whether a schema refused the body
 * or a rule refused the row, and reads the details for which.
 */
const VALIDATION_FAILED = 'Validation failed';

/** The patch member a bucket refusal is reported against. */
const BUCKET_FIELD = 'categoryId';

/** What a detail says when the bucket names no category. */
const BUCKET_MUST_EXIST = 'No category carries the id named as the bucket';

/** The code that detail carries. */
const UNKNOWN_BUCKET_CODE = 'unknown_bucket';

/**
 * What a detail says when the bucket belongs to another domain.
 *
 * The rule rather than the two domains, which are facts about
 * stored rows a caller did not ask about and, in the case of the
 * term's own, did not even name.
 */
const CROSS_DOMAIN_MOVE
  = 'A term moves only between categories of one domain';

/**
 * The code a cross-domain move carries.
 *
 * THIS SERVICE'S OWN, and it has to be: no schema can raise it,
 * because the rule it reports is neither the body's nor the
 * database's. Spelled in the same snake_case register the zod codes
 * on this surface use, so a wave-3 consumer switching on `code`
 * reads one vocabulary rather than two.
 */
const CROSS_DOMAIN_CODE = 'cross_domain_move';

/** What a detail says when a row names another category. */
const FOREIGN_CATEGORY_KEY
  = 'Every row names the category the path addressed';

/** The code that detail carries. */
const FOREIGN_CATEGORY_KEY_CODE = 'foreign_category_key';

/**
 * What a detail says when two rows state the same pattern.
 *
 * EVERY colliding row gets one, the first included, because a
 * message naming only the later ones would send a reader to fix the
 * row that is arguably right. Which two rows collided is the whole
 * of what a caller needs here, and the field paths carry it.
 */
const REPEATED_PATTERN = 'One document states one row per pattern';

/** The code that detail carries. */
const REPEATED_PATTERN_CODE = 'repeated_pattern';

/** The document member every import detail is reported under. */
const TERMS_FIELD = 'terms';

/**
 * The body `POST /categories/:id/terms` accepts for ONE term.
 *
 * Strict, like every request schema on this surface, so a misspelt
 * member is a refusal rather than a silently dropped one.
 *
 * `categoryKey` IS NOT AMONG THE MEMBERS, which is the whole
 * difference from `termSeedSchema` in `./seed-format.ts`. A seed
 * row names its category because a file is read on its own with
 * nothing beside it to say which bucket a row belongs in; a single
 * create arrives at `/categories/:id/terms`, where the path has
 * already said. Accepting it here would give one request two ways
 * to name a category and this module a third disagreement to
 * adjudicate. {@link importTerms} takes the seed shape whole and
 * refuses a row whose `categoryKey` disagrees, which is the same
 * rule expressed where a document genuinely carries the member.
 *
 * `weight` and `polarity` are REQUIRED and neither has a default.
 * `terms.weight` is NOT NULL with no default and `terms.polarity`
 * is NOT NULL with none either — how much a term counts and which
 * way it points are the decisions the row exists to record, and a
 * default would let a caller write a term it never chose the
 * meaning of. `polarity` reaches its members through
 * `TERM_POLARITIES`, the single declaration `terms_polarity_check`
 * is generated from, so no request can name a polarity the column
 * would refuse.
 *
 * `weight` is an integer and nothing more, for the reason
 * `termSeedSchema` gives: its sign is not consulted anywhere, so a
 * negative weight means what its positive means and refusing one
 * would refuse a row the database accepts and the matcher reads
 * identically.
 *
 * `notes` is OPTIONAL and nullable here where the seed row requires
 * it, and {@link createTerm} supplies the `null`. The seed's
 * argument is about a FILE, where a member left off is
 * indistinguishable from one nobody meant to write; a request has
 * an endpoint and a service to say what an omission means, which is
 * the same split `createCategorySchema` makes for `parentId`.
 */
export const createTermSchema = z.object({
  pattern: z.string().min(1),
  weight: z.number().int(),
  polarity: z.enum(TERM_POLARITIES),
  notes: z.string().nullable()
    .optional(),
}).strict();

/**
 * The body `PATCH /terms/:id` accepts.
 *
 * ALL FIVE MEMBERS OPTIONAL, so a patch carrying nothing at all is
 * a legal call answering the stored row — which `TaxonomyStore`
 * states rather than leaving to its implementations, since `terms`
 * carries no `updated_at` for a write to stamp and an empty update
 * list is something drizzle throws on.
 *
 * BOTH HALVES OF THE NATURAL KEY ARE PATCHABLE, which is the
 * substantive difference from `patchCategorySchema`. Nothing
 * outside `terms` names a row by `(category_id, pattern)`: a seed
 * file upserts on it, and a re-run after a rewrite writes the row
 * the file describes rather than stranding a reference — precisely
 * the fan-out that keeps `key` off a category patch. So a term is
 * editable in place, and moving one between buckets is an UPDATE
 * rather than a delete and an insert that would lose the row's id.
 *
 * `notes` distinguishes THREE requests, which is why it is
 * `.nullable().optional()` and not one or the other: absent leaves
 * the note alone, a string replaces it, and `null` clears it. The
 * parsed object is handed to the port unchanged for that reason —
 * an absent key stays absent, and body-parser cannot produce an
 * explicit `undefined`.
 */
export const patchTermSchema = z.object({
  categoryId: z.number().int()
    .positive()
    .optional(),
  pattern: z.string().min(1)
    .optional(),
  weight: z.number().int()
    .optional(),
  polarity: z.enum(TERM_POLARITIES).optional(),
  notes: z.string().nullable()
    .optional(),
}).strict();

/**
 * One page of a category's terms, beside the size of the collection
 * it was read from.
 *
 * Two members rather than a rendered envelope, for the reason
 * `DomainPage` in `src/domains/service.ts` gives: building `meta`
 * is the router's half, and this module was never told what the
 * window was in `page`/`perPage` terms.
 */
export interface TermPage {
  /** The rows the window selected, pattern ascending. */
  readonly rows: readonly TermRecord[];

  /** How many terms the category holds, ignoring the window. */
  readonly total: number;
}

/**
 * Which write raised a refusal, which is what decides whether a
 * missing category is an address that named nothing or a member
 * that did.
 *
 * The same discipline `./categories-service.ts` uses for its one
 * doubly-used constraint name, applied to a different ambiguity:
 * `terms_category_id_categories_id_fk` refuses an insert, an upsert
 * and an update alike, and the category it names is the PATH on the
 * first two and a BODY MEMBER on the third.
 */
type TermWrite = 'insert' | 'update' | 'upsert';

/**
 * Builds the 422 a bucket refusal answers with.
 *
 * @param message - What the one detail says: that the category is
 *   not there, or that it belongs to another domain.
 * @param code - The machine-readable code that detail carries.
 * @param cause - The refusal being translated, where there was one.
 *   Absent for the cross-domain rule, which no store raises: this
 *   module reads two rows and decides, so there is nothing
 *   underneath to keep.
 * @returns The refusal to throw.
 *
 * @remarks
 * The array is built per call rather than shared from a module
 * constant, so nothing a handler or a serialiser does to one
 * refusal's details can reach the next one's.
 */
function bucketRefusal(
  message: string,
  code: string,
  cause?: StoreRefusal,
): ValidationError {
  return new ValidationError(
    VALIDATION_FAILED,
    [{ field: BUCKET_FIELD, message, code }],
    { cause },
  );
}

/**
 * Turns what the store refused into what the caller is told.
 *
 * @param err - Whatever the store threw.
 * @param write - Which call threw it.
 * @returns Never; every path throws.
 * @throws ConflictError - For a pattern the category already
 *   carries.
 * @throws NotFoundError - For a foreign key raised by a write whose
 *   category came from the path.
 * @throws ValidationError - For a foreign key raised by an update,
 *   whose category came from `categoryId` in the body.
 * @throws The original error, unchanged, when it is not a
 *   `StoreRefusal` or carries a reason `TaxonomyStore` does not
 *   declare for this half. A store doing something its port does
 *   not describe answers 500, which is the honest status for it —
 *   a `check-violation` included, since the only CHECK on `terms`
 *   is the polarity one and no body reaching here can violate it.
 *
 * @remarks
 * EVERY FOREIGN-KEY REFUSAL HERE IS A RACE, and translating them is
 * about answering it in the caller's own terms rather than about a
 * case anyone can arrange. {@link importTerms} and
 * {@link exportTermsAsSeed} read the category first, {@link
 * patchTerm} reads the one a move names, and {@link createTerm}
 * relies on this translation outright — so a refusal arriving at
 * any of the four means the category went between the check and the
 * write. The answer is the same one the check would have given:
 * a 404 where the path named it, a 422 naming `categoryId` where
 * the body did.
 */
function refuseWrite(err: unknown, write: TermWrite): never {
  if (!(err instanceof StoreRefusal)) {
    throw err;
  }

  if (err.reason === 'unique-violation') {
    throw new ConflictError(
      PATTERN_ALREADY_TAKEN,
      undefined,
      { cause: err },
    );
  }

  if (err.reason === 'foreign-key-violation') {
    if (write === 'update') {
      throw bucketRefusal(BUCKET_MUST_EXIST, UNKNOWN_BUCKET_CODE, err);
    }

    throw new NotFoundError(NO_SUCH_CATEGORY, undefined, { cause: err });
  }

  throw err;
}

/**
 * Resolves the `:id` a category-scoped path opens with.
 *
 * @param store - Where the category is read.
 * @param categoryId - The id, as `resourceIdParamSchema` in
 *   `src/http/schemas.ts` parsed it.
 * @returns The category row, for its id and its key.
 * @throws NotFoundError - When no category carries the id.
 *
 * @remarks
 * Private, and its message is this module's own; see
 * {@link NO_SUCH_CATEGORY}. Three of the six operations call it and
 * two deliberately do not — this module's header carries which and
 * why.
 */
async function requireCategory(
  store: TermServiceStore,
  categoryId: number,
): Promise<CategoryRecord> {
  const row = await store.findCategoryById(categoryId);

  if (row === null) {
    throw new NotFoundError(NO_SUCH_CATEGORY);
  }

  return row;
}

/**
 * Refuses a bucket move the two categories do not agree on.
 *
 * @param store - Where the term and both categories are read.
 * @param id - The term being moved.
 * @param categoryId - The bucket the patch named.
 * @returns Nothing. A move this says nothing about is one
 *   {@link patchTerm} may write.
 * @throws NotFoundError - When no term carries the id. The read is
 *   made for the term's current category, so the 404 costs nothing
 *   extra and is the same fact `TaxonomyStore.updateTerm` would
 *   have reported by answering null.
 * @throws ValidationError - When the bucket names no category, or
 *   one belonging to another domain. Both name `categoryId`, which
 *   is the member the caller supplied, and carry different codes.
 *
 * @remarks
 * A MOVE ONTO THE TERM'S OWN CATEGORY IS A LEGAL CALL, and falls
 * out of the rule rather than being excepted from it: one category
 * is trivially in one domain with itself. So a caller replaying a
 * patch it already applied is not refused.
 *
 * The null the term's own category can read back as is discussed on
 * {@link patchTerm}: it means the category went between the two
 * reads and took this term with it, so the move is let through to a
 * write that answers 404.
 */
async function requireSameDomain(
  store: TermServiceStore,
  id: number,
  categoryId: number,
): Promise<void> {
  const term = await store.findTermById(id);

  if (term === null) {
    throw new NotFoundError(NO_SUCH_TERM);
  }

  const [target, current] = await Promise.all([
    store.findCategoryById(categoryId),
    store.findCategoryById(term.categoryId),
  ]);

  if (target === null) {
    throw bucketRefusal(BUCKET_MUST_EXIST, UNKNOWN_BUCKET_CODE);
  }

  if (current !== null && current.domainId !== target.domainId) {
    throw bucketRefusal(CROSS_DOMAIN_MOVE, CROSS_DOMAIN_CODE);
  }
}

/**
 * Every pattern a document states more than once.
 *
 * @param rows - The document's rows, in the order it stated them.
 * @returns The repeated patterns. Empty for a document stating each
 *   one once, which is every document that can be written.
 *
 * @remarks
 * A set of PATTERNS rather than of row indices, so the caller can
 * report every colliding row including the first. See
 * {@link REPEATED_PATTERN} for why the first is reported at all.
 */
function repeatedPatterns(rows: readonly TermSeed[]): ReadonlySet<string> {
  const seen = new Set<string>();
  const repeated = new Set<string>();

  for (const row of rows) {
    if (seen.has(row.pattern)) {
      repeated.add(row.pattern);
    }

    seen.add(row.pattern);
  }

  return repeated;
}

/**
 * What is wrong with one row of a document, beyond its shape.
 *
 * @param row - The row, already validated against `termSeedSchema`.
 * @param index - Where it sits in the document, which is the only
 *   thing a detail can say about WHICH row without quoting it.
 * @param categoryKey - The key of the category the path addressed.
 * @param repeated - Every pattern the document states twice.
 * @returns A detail per fault, in a fixed order, so a row that is
 *   wrong twice reports both. Empty for a row that is fine.
 */
function rowFaults(
  row: TermSeed,
  index: number,
  categoryKey: string,
  repeated: ReadonlySet<string>,
): FieldError[] {
  const faults: FieldError[] = [];

  if (row.categoryKey !== categoryKey) {
    faults.push({
      field: `${TERMS_FIELD}.${index}.categoryKey`,
      message: FOREIGN_CATEGORY_KEY,
      code: FOREIGN_CATEGORY_KEY_CODE,
    });
  }

  if (repeated.has(row.pattern)) {
    faults.push({
      field: `${TERMS_FIELD}.${index}.pattern`,
      message: REPEATED_PATTERN,
      code: REPEATED_PATTERN_CODE,
    });
  }

  return faults;
}

/**
 * Reads one page of a category's terms.
 *
 * @param store - Where the category and its terms are read.
 * @param categoryId - The category's id.
 * @param window - The `limit`/`offset` window, as `toStoreWindow`
 *   in `src/http/schemas.ts` derived it from `?page` and
 *   `?perPage`. Already validated, so nothing here re-checks its
 *   bounds.
 * @returns The rows and the size of the whole collection.
 * @throws NotFoundError - When no category carries the id.
 *
 * @remarks
 * THE CATEGORY IS RESOLVED FIRST, and that read is the whole
 * difference between an empty lexicon and a category that is not
 * there. `TaxonomyStore.listTerms` answers an empty list for an id
 * no row carries and `countTerms` answers `0`, both of them
 * correctly — nothing points at a row that is not there — so a
 * caller issuing the two reads alone could not tell the two states
 * apart, and a mistyped id would read as a bucket somebody had
 * emptied.
 *
 * The two reads are issued together rather than in sequence, for
 * the reason `listDomains` gives: a page's rows and the
 * collection's size are independent questions, and awaiting them
 * one after the other would make every list request pay two round
 * trips to answer one body.
 */
export async function listTerms(
  store: TermServiceStore,
  categoryId: number,
  window: StoreWindow,
): Promise<TermPage> {
  const category = await requireCategory(store, categoryId);
  const [rows, total] = await Promise.all([
    store.listTerms(category.id, window),
    store.countTerms(category.id),
  ]);

  return { rows, total };
}

/**
 * Adds one term to a category.
 *
 * @param store - Where the term is written.
 * @param categoryId - The category the path addressed.
 * @param body - The unvalidated request body, or the arguments an
 *   MCP tool was called with.
 * @returns The stored row, read back rather than reconstructed, so
 *   the id is the database's own.
 * @throws ValidationError - When the body does not satisfy
 *   {@link createTermSchema}, with one detail per fault.
 * @throws NotFoundError - When no category carries the id.
 * @throws ConflictError - When the category already carries a term
 *   under that pattern.
 *
 * @remarks
 * ASSERTS A NEW ROW RATHER THAN UPSERTING, which is the difference
 * from {@link importTerms} and the reason both exist. A single
 * `POST` is a caller stating that a pattern is not yet in the
 * bucket, so a duplicate is a 409 rather than a silent rewrite of
 * somebody else's weight.
 *
 * NO CATEGORY IS READ. `terms.category_id` is a foreign key, so the
 * insert itself is what says the category is not there, and a
 * preceding read would buy a round trip and a second chance for the
 * row to go in between. The 404 is the same fact either way.
 *
 * The `null` for an omitted `notes` is supplied HERE, where the
 * choice is visible and a case can reach it, rather than being left
 * to a column only one of the two implementations has.
 *
 * The insert is `return await` inside the `try` rather than a bare
 * `return`: returning the promise unawaited would settle it outside
 * this block, the `catch` would never run, and every duplicate
 * pattern in the deployment would answer 500 with the file still
 * reading as if it handled one.
 */
export async function createTerm(
  store: TermServiceStore,
  categoryId: number,
  body: unknown,
): Promise<TermRecord> {
  const input = parseBody(createTermSchema, body);

  try {
    return await store.insertTerm({
      categoryId,
      pattern: input.pattern,
      weight: input.weight,
      polarity: input.polarity,
      notes: input.notes ?? null,
    });
  } catch (err) {
    return refuseWrite(err, 'insert');
  }
}

/**
 * Applies a whole seed document to one category.
 *
 * @param store - Where the category is read and the terms written.
 * @param categoryId - The category the path addressed, and the
 *   bucket every row lands in.
 * @param body - The unvalidated document, in the shape
 *   `data/terms.json` carries.
 * @returns The stored rows, one per submitted row, in an
 *   UNSPECIFIED order — `TaxonomyStore.upsertTerms` says why, and a
 *   caller wanting them ordered re-reads through
 *   {@link listTerms} or {@link exportTermsAsSeed}.
 * @throws ValidationError - When the document does not satisfy
 *   `TermsFileSchema`; when a row names a category other than the
 *   one the path addressed; or when two rows state one pattern.
 * @throws NotFoundError - When no category carries the id.
 *
 * @remarks
 * NOTHING IS WRITTEN UNTIL EVERYTHING HAS BEEN CHECKED, and the
 * three checks are three different kinds of statement. The schema
 * answers whether each row is a term at all, and it is applied to
 * the document WHOLE — one malformed entry in a hundred refuses the
 * hundred, which is what makes a bulk import an operation rather
 * than a batch of them. The category-key check answers whether the
 * document is about the bucket the path named. The repeated-pattern
 * check answers whether the document is self-consistent. Only then
 * is one statement issued, and `TaxonomyStore.upsertTerms` is
 * atomic, so what follows lands whole or not at all.
 *
 * THE REPEATED-PATTERN CHECK IS NOT TIDINESS. Postgres answers
 * SQLSTATE 21000 — `ON CONFLICT DO UPDATE command cannot affect row
 * a second time` — when one statement's values carry the same
 * conflict target twice, measured against a control proving the
 * same batch with distinct patterns is accepted. `classifyPgError`
 * deliberately does not recognise it, so without this check the
 * document would answer 500 naming neither colliding row.
 *
 * A ROW NAMING ANOTHER CATEGORY IS A 422 AND NOT A SILENT
 * REDIRECTION. `categoryKey` is a member of the seed shape because
 * a file is read on its own; here the path has already named the
 * bucket, so a row disagreeing with it is a document that was
 * written about something else. Writing it into the addressed
 * category would be this service deciding which of the two the
 * caller meant, and the seed pass — which resolves the same member
 * against `data/categories.json` — would then disagree with the
 * API about where those rows live.
 *
 * AN EMPTY DOCUMENT IS LEGAL and answers an empty list without
 * touching the database, which the port states rather than leaving
 * to its implementations. A lexicon that declares no terms is not a
 * special case for a caller, and it is the shape an export of an
 * empty category round-trips through.
 *
 * The category is read BEFORE the two document checks because both
 * of them need it — the key to compare against, and a bucket for
 * the rows to land in. So a document that is malformed AND
 * addressed at nothing answers 422 for its shape, while one that is
 * well-formed and addressed at nothing answers 404.
 */
export async function importTerms(
  store: TermServiceStore,
  categoryId: number,
  body: unknown,
): Promise<readonly TermRecord[]> {
  const document = parseBody(TermsFileSchema, body);
  const category = await requireCategory(store, categoryId);
  const repeated = repeatedPatterns(document.terms);
  const faults = document.terms.flatMap(
    (row, index) => rowFaults(row, index, category.key, repeated),
  );

  if (faults.length > 0) {
    throw new ValidationError(VALIDATION_FAILED, faults);
  }

  try {
    return await store.upsertTerms(
      category.id,
      document.terms.map((row) => ({
        pattern: row.pattern,
        weight: row.weight,
        polarity: row.polarity,
        notes: row.notes,
      })),
    );
  } catch (err) {
    return refuseWrite(err, 'upsert');
  }
}

/**
 * Rewrites the supplied members of one term, moving it between
 * buckets when the patch names one.
 *
 * @param store - Where the term, the categories and the write go.
 * @param id - The term's id, as `resourceIdParamSchema` in
 *   `src/http/schemas.ts` parsed it.
 * @param body - The unvalidated patch.
 * @returns The stored row afterwards.
 * @throws ValidationError - When the body does not satisfy
 *   {@link patchTermSchema}; when `categoryId` names no category;
 *   or when it names one in another domain.
 * @throws NotFoundError - When no term carries the id.
 * @throws ConflictError - When the RESULTING `(category, pattern)`
 *   pair is already taken. Both halves are patchable, so that is
 *   reachable by renaming the pattern, by moving the term, or by
 *   doing both at once.
 *
 * @remarks
 * A BUCKET MOVE IS CHECKED BEFORE THE WRITE, and it is the only
 * rule on this surface that is. Nothing in the schema relates a
 * term to a domain — `terms` reaches `domains` only through
 * `categories`, and no constraint follows that path — so Postgres
 * accepts a move into another domain's taxonomy, measured. A term
 * that landed there would go on scoring for a domain nobody put it
 * in and would arrive in that domain's export, so the rule is real
 * and this module is the only place it can live.
 *
 * A PATCH NAMING NO BUCKET READS NOTHING FIRST, which is the same
 * argument `patchCategory` makes: `TaxonomyStore.updateTerm`
 * answers null for an id no row carries, so a preceding read would
 * buy a second round trip and a second chance for the row to go in
 * between. A patch that DOES name one has to read the term anyway,
 * for the category it is currently in, so the 404 comes from that
 * read instead — the same fact, from whichever call was already
 * being made.
 *
 * The two category reads are issued together. They are independent
 * questions, and the answer needs both.
 *
 * WHERE THE TERM'S OWN CATEGORY READS BACK AS NULL, the move is let
 * through to the write rather than refused. That is reachable only
 * by the category being deleted between the two reads — and
 * `terms.category_id` is `ON DELETE CASCADE`, so the same delete
 * took this term with it. The write below then answers null and the
 * caller gets the 404 that is the honest fact, where a refusal here
 * would report a bucket rule against a term that no longer exists.
 */
export async function patchTerm(
  store: TermServiceStore,
  id: number,
  body: unknown,
): Promise<TermRecord> {
  const patch = parseBody(patchTermSchema, body);

  if (patch.categoryId !== undefined) {
    await requireSameDomain(store, id, patch.categoryId);
  }

  let updated: TermRecord | null;

  try {
    updated = await store.updateTerm(id, patch);
  } catch (err) {
    return refuseWrite(err, 'update');
  }

  if (updated === null) {
    throw new NotFoundError(NO_SUCH_TERM);
  }

  return updated;
}

/**
 * Deletes one term.
 *
 * @param store - Where the row is removed.
 * @param id - The term's id.
 * @returns Nothing. The router answers 204, because a deleted
 *   resource has no representation to carry.
 * @throws NotFoundError - When no term carries the id.
 *
 * @remarks
 * NOTHING HANGS OFF A TERM, so this is the one delete on the
 * taxonomy surface with neither a guard nor a cascade and the one
 * that cannot be refused. There is no `?cascade=confirm` here and
 * nothing for one to authorise.
 */
export async function deleteTerm(
  store: TermServiceStore,
  id: number,
): Promise<void> {
  const removed = await store.deleteTerm(id);

  if (!removed) {
    throw new NotFoundError(NO_SUCH_TERM);
  }
}

/**
 * Writes one category's terms out as a seed document.
 *
 * @param store - Where the category and its terms are read.
 * @param categoryId - The category the path addressed.
 * @returns The document's whole text, ending in exactly one
 *   newline — the bytes {@link importTerms} accepts back, and what
 *   a `?format=seed` response body carries instead of an envelope.
 * @throws NotFoundError - When no category carries the id.
 *
 * @remarks
 * THE READ TAKES NO WINDOW, and that is what makes the answer a
 * document rather than a page. `TaxonomyStore.listTerms` reads the
 * whole category when handed no window, which is one read; counting
 * first and then asking for a window that size would be two, whose
 * answers can disagree — a term written in between is simply
 * missing from a document that claims to be the category.
 *
 * `categoryKey` IS STAMPED FROM THE CATEGORY ROW rather than
 * carried on the terms, because no term carries it: `terms` holds a
 * `category_id`, and the key is what a document names instead,
 * since an id the database issued means nothing to a file. Every
 * row of one export therefore carries the same key, which is the
 * single-category scope `./seed-format.ts` records as one of the
 * two reasons an export of `data/terms.json` is not that file.
 *
 * THE ORDER IS THE SERIALISER'S AND NOT THE STORE'S.
 * `serializeTermSeedDocument` sorts what it is handed, so the bytes
 * are the same on any server — the read's `ORDER BY` runs under the
 * deployment's collation and a pattern is free text carrying case,
 * spaces and punctuation. The round trip rests on the sort in
 * `./seed-format.ts` and on nothing here.
 */
export async function exportTermsAsSeed(
  store: TermServiceStore,
  categoryId: number,
): Promise<string> {
  const category = await requireCategory(store, categoryId);
  const rows = await store.listTerms(category.id);

  return serializeTermSeedDocument(rows.map((row) => ({
    categoryKey: category.key,
    pattern: row.pattern,
    weight: row.weight,
    polarity: row.polarity,
    notes: row.notes,
  })));
}
