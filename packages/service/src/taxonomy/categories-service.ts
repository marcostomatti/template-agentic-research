/**
 * @packageDocumentation
 * The category rules: reading one domain's taxonomy, adding a bucket
 * to it, renaming or reparenting one, and taking one away. What
 * `/domains/:slug/categories` and `/categories/:id` reduce to once
 * HTTP is subtracted from them.
 *
 * FOUR FUNCTIONS AND NOTHING ELSE, for the reason
 * `src/domains/service.ts` gives for its five: a router adds a path,
 * a status code and an envelope over these, and wave 3 exposes the
 * same four as MCP tools. There is no single-category read among
 * them because no route asks for one — a category is met in its
 * domain's list, and `:id` names it only in order to write.
 *
 * THE BODY IS PARSED HERE RATHER THAN ABOVE, exactly as the domains
 * service argues: an operation handed an already-validated input
 * would have two callers validating it, the router today and the MCP
 * tool tomorrow, from a second schema nobody would notice drifting.
 * So {@link createCategory} and {@link patchCategory} take an
 * `unknown` and run it through {@link parseBody}.
 *
 * THE DOMAIN IS RESOLVED FIRST, ON THE TWO OPERATIONS THAT NAME ONE.
 * `TaxonomyStore` resolves no slug — its own header says so — so a
 * `:slug` is turned into a `DomainRecord` through
 * `DomainStore.findDomainBySlug` before any category is read or
 * written, and a slug naming no row is a 404 that costs the taxonomy
 * no read at all. The other two operations name `/categories/:id`
 * and no domain, so there is nothing to resolve: the row carries its
 * own `domainId`, and every rule that needs it is the database's.
 *
 * NO WINDOW REACHES THIS MODULE. {@link listCategories} answers a
 * domain's taxonomy WHOLE, because the taxonomy is shallow and
 * operator-authored and there is no page to describe;
 * `TaxonomyStore.listCategoriesWithTermCounts` carries the argument.
 * The asymmetry with `listDomains` is the collections differing
 * rather than the two surfaces disagreeing.
 *
 * THE DEPTH RULE IS TRANSLATED, NEVER ANTICIPATED. Nothing below
 * looks at a proposed parent before writing it. Depth is a property
 * of the parent row and of the written row's own children rather
 * than of the request, a trigger on `categories` holds it against
 * every writer including the seed and a psql prompt, and a check
 * here would be a second, weaker statement of a rule that already
 * holds — the first one to disagree doing so silently. What this
 * module owns is the way OUT: a `check-violation` becomes a 422
 * whose one detail names `parentId` and states the one-level rule,
 * because that refusal is the only CHECK `categories` carries and
 * the trigger names no constraint for a service to read.
 *
 * ONE CONSTRAINT NAME, TWO ANSWERS, AND THE METHOD IS WHAT SEPARATES
 * THEM. `categories_parent_id_categories_id_fk` refuses a `parentId`
 * naming no row AND the delete of a category still holding children,
 * so `reason` and `constraint` together cannot tell those apart —
 * measured against the live server and recorded in `./store.ts`.
 * They are a 422 and a 409 respectively, and the discriminator is
 * which call raised the refusal, which is why the translation below
 * takes the write as an argument rather than reading the error
 * harder.
 *
 * NOTHING SUBMITTED REACHES A MESSAGE OR A DETAIL BUILT HERE. Every
 * message and every detail below is a constant of this module's own,
 * and no `StoreRefusal` field is copied into one: a driver error's
 * `detail` reads `Key (domain_id, key)=(1, phrases) already exists.`
 * and the drizzle wrapper's `message` carries the whole statement
 * with its bound parameters, so quoting either would put a submitted
 * value on the wire and, through `errorHandler`, in a log line.
 *
 * A `StoreRefusal` IS TRANSLATED AND NEVER RETHROWN AS ITSELF — for
 * the reasons it is declared a plain `Error` in
 * `src/db/store-errors.ts`. The three mechanisms `TaxonomyStore`
 * declares for the category half are translated below and anything
 * else is rethrown untouched, which answers 500 rather than a
 * plausible status no rule authorised.
 *
 * THE STORE IS A PARAMETER, so every rule here is exercisable with
 * no database: `tests/helpers/memory-research-store.ts` stands
 * behind both ports over one dataset, which is what lets a domain
 * resolved through one of them own the categories read through the
 * other.
 */
import type {
  CategoryRecord,
  CategoryWithTermCount,
  TaxonomyStore,
} from './store.js';
import type { DomainRecord, DomainStore } from '../domains/store.js';

import { z } from 'zod';

import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../lib/errors/index.js';
import { StoreRefusal } from '../db/store-errors.js';
import { parseBody } from '../http/validation.js';

/**
 * Exactly the port methods these four functions reach, across both
 * ports they reach them on.
 *
 * A `Pick` OF TWO PORTS RATHER THAN EITHER ONE WHOLE, for two
 * reasons that happen to point the same way. Resolving a slug is one
 * method of `DomainStore`, and asking for the whole port would have
 * this module claim to need writes it never issues. And the category
 * half of `TaxonomyStore` is the half that exists so far — the term
 * methods land in their own stage, and the in-memory store
 * implements a `Pick` of the same five until they do — so a service
 * typed on the port entire could not be handed the one store that
 * needs no database.
 *
 * Built with `Pick` rather than by listing signatures, so a method
 * here cannot drift from the thing it is naming: a hand-copied
 * signature would go on type-checking against a port that had moved
 * under it.
 */
export type CategoryServiceStore =
  Pick<DomainStore, 'findDomainBySlug'>
  & Pick<
    TaxonomyStore,
    | 'listCategoriesWithTermCounts'
    | 'insertCategory'
    | 'updateCategory'
    | 'deleteCategory'
  >;

/** What a caller is told when no domain carries the slug it named. */
const NO_SUCH_DOMAIN = 'No domain carries that slug';

/** What a caller is told when no category carries the id it named. */
const NO_SUCH_CATEGORY = 'No category carries that id';

/** What a caller is told when the key it proposed is taken. */
const KEY_ALREADY_TAKEN
  = 'This domain already carries a category under that key';

/**
 * What a caller is told when a delete would strand a category's
 * children.
 *
 * The count is not in it, and deliberately: `TaxonomyStore` declares
 * no method that counts children, so a number here would need a read
 * this module does not make. What a caller needs is that the
 * children have to be dealt with, which is a fact about the rule
 * rather than about how many there happen to be.
 */
const CATEGORY_HOLDS_CHILDREN
  = 'This category holds children, which have to move or go first';

/**
 * The message a 422 built here carries.
 *
 * The parser's own wording, spelled again rather than imported,
 * because the two are equal by intent rather than by derivation: a
 * caller reading a 422 off this surface gets the same sentence
 * whether a schema refused the body or the database refused the row,
 * and reads the details for which. Importing a private constant out
 * of `src/http/validation.ts` would make the agreement look like a
 * dependency and put a second consumer on a string that module built
 * for its own use.
 */
const VALIDATION_FAILED = 'Validation failed';

/** The body member every parent refusal is reported against. */
const PARENT_FIELD = 'parentId';

/**
 * What a detail says when the depth trigger refused the parent.
 *
 * The rule rather than the branch, which is what the trigger leaves
 * this module able to say. All three branches of
 * `categories_enforce_depth()` arrive as one reason carrying no
 * constraint name — a parent that is itself a child, a parent in
 * another domain, and a parent given to a row that already has
 * children — so a message naming one of them would be right a third
 * of the time. The cap they all enforce is one sentence and is true
 * of every one of them.
 */
const ONE_LEVEL_RULE
  = 'A category is a root or the child of a root, and nothing deeper';

/** What a detail says when the parent names no category at all. */
const PARENT_MUST_EXIST = 'No category carries the id named as the parent';

/**
 * The code a depth refusal's detail carries.
 *
 * THIS SERVICE'S OWN, not zod's, and it has to be: no schema can
 * raise it, because the rule it reports is the database's and is
 * unreachable from a body alone. Spelled in the same snake_case
 * register the zod codes on this surface use, so a wave-3 consumer
 * switching on `code` reads one vocabulary rather than two.
 */
const DEPTH_VIOLATION_CODE = 'depth_violation';

/** The code a detail carries when the parent is not there. */
const UNKNOWN_PARENT_CODE = 'unknown_parent';

/**
 * The body `POST /domains/:slug/categories` accepts.
 *
 * Strict, like every request schema on this surface, so a misspelt
 * member is a refusal rather than a silently dropped one.
 *
 * `key` is held to non-empty and NOTHING MORE, which is the seed's
 * shape rather than a slug's. `categorySeedSchema` in
 * `scripts/seed-schemas.ts` says `.min(1)` about the same column,
 * and a category key never appears in a path segment — a category is
 * addressed by `:id` — so there is no URL shape to enforce and
 * narrowing here would only make this surface unable to write keys
 * the seed can. `key` is absent from {@link patchCategorySchema},
 * which is `CategoryPatch`'s rule and not this one.
 *
 * `name` has to be non-empty, which IS narrower than the seed's
 * `z.string()`. It is the only operator-facing label a category
 * carries, and a bucket named the empty string is one no list can
 * show; the same argument `createDomainSchema` makes for a domain.
 *
 * `parentId` is OPTIONAL and nullable, and the omission becomes
 * `null` in {@link createCategory} rather than here. That is the
 * port's instruction — `InsertCategoryInput` requires the member so
 * that no implementation gets to decide what an absence means — and
 * it is also where the seed and this schema legitimately differ: a
 * seed row states `parentKey: null` because a file is read on its
 * own, with nothing beside it to say whether a root was deliberate,
 * while a request has an endpoint and a service to say so.
 */
export const createCategorySchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  parentId: z.number().int()
    .positive()
    .nullable()
    .optional(),
}).strict();

/**
 * The body `PATCH /categories/:id` accepts.
 *
 * Both members optional, so a patch carrying nothing at all is a
 * legal call answering the stored row — which `TaxonomyStore`
 * states rather than leaving to its implementations, since
 * `categories` carries no `updated_at` for a write to stamp and an
 * empty update list is something drizzle throws on.
 *
 * `key` is deliberately absent, so a category cannot be re-keyed
 * here. `CategoryPatch` in `./store.ts` carries the argument: the
 * key is what the seed upserts on and what a term seed row names in
 * `categoryKey`, none of those references is a foreign key the
 * database would follow, and a re-key is therefore a different
 * operation with a fan-out of its own rather than a member on a
 * patch.
 *
 * `parentId` distinguishes THREE requests, which is why it is
 * `.nullable().optional()` and not one or the other. Absent leaves
 * the row where it is, a number moves it under that root, and `null`
 * promotes it to a root — the only way back up, and unexpressible if
 * absent and null meant the same thing. The parsed object is handed
 * to the port unchanged for exactly that reason: an absent key stays
 * absent, and body-parser cannot produce an explicit `undefined`.
 */
export const patchCategorySchema = z.object({
  name: z.string().min(1)
    .optional(),
  parentId: z.number().int()
    .positive()
    .nullable()
    .optional(),
}).strict();

/**
 * Which write raised a refusal, which is the only thing that
 * separates two of them.
 *
 * See this module's header: one constraint name covers a parent that
 * is not there and children that are, and they are a 422 and a 409.
 */
type CategoryWrite = 'insert' | 'update' | 'delete';

/**
 * Builds the 422 a parent refusal answers with.
 *
 * @param message - What the one detail says: the one-level rule, or
 *   that the parent is not there.
 * @param code - The machine-readable code that detail carries.
 * @param cause - The refusal being translated, kept for a debugger
 *   and for the error-level log line `errorHandler` writes.
 * @returns The refusal to throw.
 *
 * @remarks
 * The array is built per call rather than shared from a module
 * constant, so nothing a handler or a serialiser does to one
 * refusal's details can reach the next one's.
 */
function parentRefusal(
  message: string,
  code: string,
  cause: StoreRefusal,
): ValidationError {
  return new ValidationError(
    VALIDATION_FAILED,
    [{ field: PARENT_FIELD, message, code }],
    { cause },
  );
}

/**
 * Turns what the store refused into what the caller is told.
 *
 * @param err - Whatever the store threw.
 * @param write - Which call threw it.
 * @returns Never; every path throws.
 * @throws ConflictError - For a duplicate key, and for a delete the
 *   category's children refused.
 * @throws ValidationError - For the depth trigger, and for a
 *   `parentId` naming no row.
 * @throws The original error, unchanged, when it is not a
 *   `StoreRefusal` or carries a reason `TaxonomyStore` does not
 *   declare for this half. A store doing something its port does not
 *   describe answers 500, which is the honest status for it.
 *
 * @remarks
 * A `check-violation` is the depth rule and can be nothing else:
 * that trigger is the only CHECK on `categories`, so the reason
 * alone identifies it — which is as well, because a
 * `RAISE ... USING ERRCODE` names no constraint for anything to
 * match on.
 *
 * A `foreign-key-violation` out of an insert or an update is a
 * `parentId` naming no row, and out of a delete it is children still
 * pointing at the row. There is a second foreign key on the table —
 * `domain_id` — which an insert could in principle raise, and only
 * by a domain being deleted between the lookup a moment earlier and
 * the write. That race is reported here as a parent fault rather
 * than branched on: the constraint name would separate them, but the
 * domain is gone under either reading and a 422 naming `parentId` is
 * a worse answer than a 500 only for a request nobody can retry.
 */
function refuseWrite(err: unknown, write: CategoryWrite): never {
  if (!(err instanceof StoreRefusal)) {
    throw err;
  }

  if (err.reason === 'unique-violation') {
    throw new ConflictError(KEY_ALREADY_TAKEN, undefined, { cause: err });
  }

  if (err.reason === 'check-violation') {
    throw parentRefusal(ONE_LEVEL_RULE, DEPTH_VIOLATION_CODE, err);
  }

  if (err.reason === 'foreign-key-violation') {
    if (write === 'delete') {
      throw new ConflictError(
        CATEGORY_HOLDS_CHILDREN,
        undefined,
        { cause: err },
      );
    }

    throw parentRefusal(PARENT_MUST_EXIST, UNKNOWN_PARENT_CODE, err);
  }

  throw err;
}

/**
 * Resolves the `:slug` a taxonomy path opens with.
 *
 * @param store - Where the domain is read.
 * @param slug - The natural key, already narrowed by
 *   `slugParamSchema` at whichever boundary the request entered.
 * @returns The domain row, for its id.
 * @throws NotFoundError - When no domain carries the slug.
 *
 * @remarks
 * Private, and its message is this module's own. The domains service
 * keeps the identical helper unexported for exactly this reason: a
 * shared one would put one route group's wording on another's
 * refusals, and the two are free to diverge the moment either has
 * something of its own to say. It is the same sentence today, which
 * is the two agreeing rather than the two being one.
 */
async function requireDomain(
  store: CategoryServiceStore,
  slug: string,
): Promise<DomainRecord> {
  const row = await store.findDomainBySlug(slug);

  if (row === null) {
    throw new NotFoundError(NO_SUCH_DOMAIN);
  }

  return row;
}

/**
 * Reads one domain's taxonomy, whole.
 *
 * @param store - Where the domain and its categories are read.
 * @param slug - The domain's natural key.
 * @returns Every category in the domain, key ascending, each with
 *   the number of terms hanging off it. Possibly empty: a domain
 *   whose taxonomy has not been written yet is not an error.
 * @throws NotFoundError - When no domain carries the slug. This is
 *   the whole difference between an empty taxonomy and a domain that
 *   is not there, and it is why the read is not simply issued
 *   against whatever id a caller supplied.
 *
 * @remarks
 * No window, no total and no `meta`; see this module's header.
 */
export async function listCategories(
  store: CategoryServiceStore,
  slug: string,
): Promise<readonly CategoryWithTermCount[]> {
  const domain = await requireDomain(store, slug);

  return store.listCategoriesWithTermCounts(domain.id);
}

/**
 * Adds a category to one domain's taxonomy.
 *
 * @param store - Where the domain is read and the category written.
 * @param slug - The domain's natural key.
 * @param body - The unvalidated request body, or the arguments an
 *   MCP tool was called with.
 * @returns The stored row, read back rather than reconstructed, so
 *   the id is the database's own.
 * @throws ValidationError - When the body does not satisfy
 *   {@link createCategorySchema}; when the depth trigger refuses the
 *   parent; or when `parentId` names no category.
 * @throws NotFoundError - When no domain carries the slug.
 * @throws ConflictError - When the domain already carries that key.
 *
 * @remarks
 * THE BODY IS PARSED BEFORE THE SLUG IS RESOLVED, so a malformed
 * body is a 422 whether or not the domain exists. The shape of a
 * body is a fact about the request alone, and answering the same
 * body a 422 or a 404 depending on what happens to be stored would
 * make a caller's error depend on rows it never asked about. It also
 * costs that refusal no read at all.
 *
 * The `null` for an omitted `parentId` is supplied HERE, where the
 * choice is visible and a case can reach it, rather than being left
 * to a column only one of the two implementations has.
 *
 * The insert is `return await` inside the `try` rather than a bare
 * `return`: returning the promise unawaited would settle it outside
 * this block, the `catch` would never run, and every duplicate key
 * in the deployment would answer 500 with the file still reading as
 * if it handled one.
 */
export async function createCategory(
  store: CategoryServiceStore,
  slug: string,
  body: unknown,
): Promise<CategoryRecord> {
  const input = parseBody(createCategorySchema, body);
  const domain = await requireDomain(store, slug);

  try {
    return await store.insertCategory({
      domainId: domain.id,
      key: input.key,
      name: input.name,
      parentId: input.parentId ?? null,
    });
  } catch (err) {
    return refuseWrite(err, 'insert');
  }
}

/**
 * Rewrites the supplied members of one category.
 *
 * @param store - Where the row is written.
 * @param id - The category's id, as `resourceIdParamSchema` in
 *   `src/http/schemas.ts` parsed it.
 * @param body - The unvalidated patch.
 * @returns The stored row afterwards.
 * @throws ValidationError - When the body does not satisfy
 *   {@link patchCategorySchema}; when the depth trigger refuses the
 *   parent; or when `parentId` names no category.
 * @throws NotFoundError - When no category carries the id.
 *
 * @remarks
 * NO DOMAIN IS RESOLVED AND NONE IS NAMED. `PATCH /categories/:id`
 * addresses the row directly, and the one rule that spans domains —
 * a parent belonging to another one — is a branch of the depth
 * trigger rather than something this module could usefully check
 * first.
 *
 * There is no read before the write. `TaxonomyStore.updateCategory`
 * answers `null` for an id no row carries, so a preceding
 * `findCategoryById` would buy a second round trip and a second
 * chance for the row to go in between; the 404 below is the same
 * fact either way.
 *
 * No `unique-violation` can arrive here, which is `CategoryPatch`
 * refusing to carry `key` rather than an omission — nothing else on
 * the row is unique.
 */
export async function patchCategory(
  store: CategoryServiceStore,
  id: number,
  body: unknown,
): Promise<CategoryRecord> {
  const patch = parseBody(patchCategorySchema, body);
  let updated: CategoryRecord | null;

  try {
    updated = await store.updateCategory(id, patch);
  } catch (err) {
    return refuseWrite(err, 'update');
  }

  if (updated === null) {
    throw new NotFoundError(NO_SUCH_CATEGORY);
  }

  return updated;
}

/**
 * Deletes one category, unless it still holds children.
 *
 * @param store - Where the row is removed.
 * @param id - The category's id.
 * @returns Nothing. The router answers 204, because a deleted
 *   resource has no representation to carry.
 * @throws NotFoundError - When no category carries the id.
 * @throws ConflictError - When the category still holds children.
 *
 * @remarks
 * ITS TERMS AND CRITERIA GO WITH IT AND ITS CHILDREN DO NOT, and
 * neither half is decided here: both of the first two cascade on
 * `category_id` and `categories.parent_id` is `NO ACTION`, so what
 * this function contributes is the status the refusal wears. That
 * asymmetry is what makes losing a sub-tree an explicit decision —
 * reparent or remove the children, and the delete goes through.
 *
 * There is no cascade confirmation here, unlike `deleteDomain`. A
 * domain's delete is guarded because the database would silently
 * take everything; a category's is guarded by the database itself,
 * so there is nothing for a confirmation to authorise that the
 * caller could not do by removing the children.
 */
export async function deleteCategory(
  store: CategoryServiceStore,
  id: number,
): Promise<void> {
  let removed: boolean;

  try {
    removed = await store.deleteCategory(id);
  } catch (err) {
    return refuseWrite(err, 'delete');
  }

  if (!removed) {
    throw new NotFoundError(NO_SUCH_CATEGORY);
  }
}
