/**
 * @packageDocumentation
 * The domain rules: listing domains, reading one, creating one,
 * patching one, and taking one away. What `/domains` and
 * `/domains/:slug` reduce to once HTTP is subtracted from them.
 *
 * FIVE FUNCTIONS AND NOTHING ELSE. `src/domains/routes.ts` adds a
 * path, a status code and an envelope over these, and wave 3
 * exposes the same five as MCP tools — one implementation, two
 * protocols, which is what the parent spec asks for and the reason
 * the rules live in a module a router imports rather than in the
 * router itself.
 *
 * THE BODY IS PARSED HERE RATHER THAN ABOVE, which follows from
 * that paragraph rather than from taste. An operation handed an
 * already-validated input would have two callers validating it —
 * the router today and the MCP tool in wave 3, from a second schema
 * nobody would notice drifting. So {@link createDomain} and
 * {@link patchDomain} take an `unknown` and run it through
 * {@link parseBody}, and the refusal is the one sanitised
 * `ValidationError` every route on this surface answers with:
 * details naming a field path and a message from a fixed
 * vocabulary, never zod's wording and never a submitted value.
 *
 * THE WINDOW ARRIVES ALREADY DERIVED, and the asymmetry with the
 * body is deliberate rather than an oversight. What a domain IS
 * includes its settings, so an operation that did not check them
 * would not be the operation; `?page` and `?perPage` are how a
 * caller ASKED, a vocabulary belonging to HTTP that an MCP tool
 * would not spell at all. `toStoreWindow` in `src/http/schemas.ts`
 * owns that translation, and {@link listDomains} takes its output.
 *
 * EVERY REFUSAL IS AN `AppError` SUBCLASS AND NO CALLER CATCHES
 * ONE. `createService` registers `errorHandler` from `lib/errors`
 * LAST, and under Express 5 a bare `throw` inside an `async`
 * handler reaches it — so a route handler carries no try/catch and
 * no `next(err)`, and a {@link NotFoundError} raised here is a 404
 * carrying `{ code: 'NOT_FOUND', message }` on the wire with no
 * line of the router involved. Wave 3 reads `err.code` rather than
 * the status, which is why the machine-readable code is the part
 * that has to be meaningful and the status is only how HTTP says
 * it.
 *
 * NOTHING SUBMITTED REACHES A MESSAGE OR A DETAIL BUILT HERE. The
 * three messages below are constants, and the only `details` this
 * module constructs are the dependent counts — facts about the
 * database rather than about the request. A slug is not
 * interpolated into a refusal even though `slugParamSchema` has
 * already narrowed it to lowercase alphanumerics and hyphens: the
 * containment rule is about closing the channel, not about how
 * harmless one value looks, and the exception would be the line a
 * later edit widens.
 *
 * A `StoreRefusal` IS TRANSLATED AND NEVER RETHROWN AS ITSELF.
 * `src/db/store-errors.ts` deliberately makes it a plain `Error`,
 * so one escaping this module answers 500 and is logged at error
 * level rather than answering a plausible status no rule
 * authorised. Only `unique-violation` is translated below, because
 * it is the only mechanism `DomainStore` declares; anything else
 * arriving is a store doing something its port does not describe,
 * and it is rethrown untouched.
 *
 * THE STORE IS A PARAMETER, so every rule here is exercisable with
 * no database. `tests/helpers/memory-research-store.ts` stands
 * behind the port in the isolated suite and `./db-store.ts` behind
 * it in a deployment, and the only thing left for the live suite to
 * prove is that real Postgres agrees.
 */
import type {
  DomainDependentCounts,
  DomainRecord,
  DomainStore,
} from './store.js';
import type { StoreWindow } from '../http/schemas.js';

import { z } from 'zod';

import { ConflictError, NotFoundError } from '../../lib/errors/index.js';
import { StoreRefusal } from '../db/store-errors.js';
import { slugParamSchema } from '../http/schemas.js';
import { parseBody } from '../http/validation.js';

import { domainSettingsSchema } from './settings-payload.js';

/**
 * The prefixes of a domain body below which a key is the operator's
 * own rather than this service's, as `ParseOptions.openPaths` in
 * `src/http/validation.ts` takes them.
 *
 * Spelled with the `settings.` prefix because that is where the two
 * open records sit in a body: `domainSettingsSchema` declares them
 * at its own root, and both schemas below nest it one segment down.
 * A prefix is matched segment-wise against the path of the value
 * BEING PARSED, so the same record reached under a different
 * spelling needs a different declaration — which is exactly why the
 * list is here, at the call site, rather than beside the schema.
 *
 * Declared once and passed to both parses. Written twice they would
 * be free to drift, and a `PATCH` that masked a key a `POST` echoed
 * is a leak with no failing test anywhere.
 */
const SETTINGS_OPEN_PATHS = [
  'settings.scoringWeights',
  'settings.fieldContract',
] as const;

/**
 * What a caller is told when no domain carries the slug it named.
 *
 * The slug is not in it. See this module's header: a message is a
 * constant here, and the one addressed to a missing row is the
 * message most tempting to interpolate.
 */
const NO_SUCH_DOMAIN = 'No domain carries that slug';

/** What a caller is told when the slug it proposed is taken. */
const SLUG_ALREADY_TAKEN = 'A domain already exists under that slug';

/**
 * What a caller is told when a delete would take rows the domain
 * accumulated. The counts travel as `details`, so the sentence
 * itself says only what happened.
 */
const DOMAIN_HOLDS_ROWS
  = 'This domain holds rows a delete would take with it';

/**
 * The body `POST /domains` accepts.
 *
 * Strict, like every request schema on this surface, so
 * `scoringWeigths` is a refusal rather than a weight nothing reads.
 * `src/http/validation.ts` is what makes strictness affordable: an
 * `unrecognized_keys` issue names the object that refused and never
 * the key it refused.
 *
 * `settings` is OPTIONAL here and not defaulted by zod, which is
 * the port's own instruction rather than a style choice.
 * `InsertDomainInput` in `./store.ts` requires the member, because
 * a default is a decision about what an omission means and leaving
 * it to the column would make the drizzle store quietly right and
 * the in-memory one quietly wrong — only one of the two has a
 * column to default from. {@link createDomain} supplies the empty
 * object, where the choice is visible and a case can reach it.
 *
 * `name` has to be non-empty. It is the only operator-facing label
 * a domain carries, and a domain named the empty string is one no
 * list can show.
 */
export const createDomainSchema = z.object({
  slug: slugParamSchema,
  name: z.string().min(1),
  settings: domainSettingsSchema.optional(),
}).strict();

/**
 * The body `PATCH /domains/:slug` accepts.
 *
 * Both members optional, so a patch carrying nothing at all is a
 * legal write rather than a refusal — it still moves `updated_at`,
 * which is what `DomainStore.updateDomain` promises and what makes
 * an empty `SET` clause something no implementation has to
 * special-case.
 *
 * `slug` is deliberately absent, so a domain cannot be renamed
 * through this endpoint. `DomainPatch` in `./store.ts` carries the
 * argument: the slug is what every other surface addresses the
 * domain by, none of those references is a foreign key the database
 * would follow, and a rename is therefore a different operation
 * with a fan-out of its own to settle first.
 *
 * `settings` REPLACES the stored payload whole and is never merged
 * into it. That rule is the store's and is stated there; what this
 * schema contributes is that an empty object gets through, since a
 * request clearing every weight and a request leaving them alone
 * would otherwise be the same bytes.
 */
export const patchDomainSchema = z.object({
  name: z.string().min(1)
    .optional(),
  settings: domainSettingsSchema.optional(),
}).strict();

/**
 * One page of the domain list, beside the size of the collection it
 * was read from.
 *
 * Two members rather than a rendered envelope, because building
 * `meta` is the router's half: `buildPaginationMeta` in
 * `src/http/envelope.ts` derives `totalPages` from the window the
 * caller asked for, and this module was never told what that window
 * was in `page`/`perPage` terms.
 */
export interface DomainPage {
  /** The rows in the window, slug ascending, possibly empty. */
  readonly rows: readonly DomainRecord[];
  /** Rows in the whole collection, ignoring the window. */
  readonly total: number;
}

/** What {@link deleteDomain} needs besides the slug. */
export interface DeleteDomainOptions {
  /**
   * Whether the caller has confirmed the cascade.
   *
   * REQUIRED rather than defaulted, so a caller cannot reach the
   * destructive path by forgetting a member. The router sets it
   * from `?cascade=confirm`, which is the only spelling that gets
   * past the guard; an MCP tool in wave 3 will spell its own
   * confirmation and hand the same boolean in.
   *
   * A confirmation is a decision about the REQUEST, which is why it
   * arrives as a boolean rather than as a query string this module
   * would have to know the shape of.
   */
  readonly cascadeConfirmed: boolean;
}

/**
 * Reads a domain that the caller has to have named.
 *
 * @param store - Where the row is read.
 * @param slug - The natural key, already narrowed by
 *   `slugParamSchema` at whichever boundary the request entered
 *   through.
 * @returns The row.
 * @throws NotFoundError - When no domain carries the slug. A 404
 *   with `code: 'NOT_FOUND'` once `errorHandler` has answered it.
 *
 * @remarks
 * Written once and private, so the four operations that address a
 * domain by slug cannot answer a missing one four different ways.
 * The taxonomy, personas and settings services resolve the same
 * slug through the same port method, and their own refusals are
 * theirs to declare — this helper is not exported, because a shared
 * one would put this module's message on their routes.
 */
async function requireDomain(
  store: DomainStore,
  slug: string,
): Promise<DomainRecord> {
  const row = await store.findDomainBySlug(slug);

  if (row === null) {
    throw new NotFoundError(NO_SUCH_DOMAIN);
  }

  return row;
}

/**
 * Whether anything is hanging off the domain that a delete would
 * take with it.
 *
 * @param counts - What `DomainStore.countDomainDependents`
 *   answered.
 * @returns True when any of the counted tables holds a row.
 *
 * @remarks
 * Read off `Object.values` rather than by naming `topics`,
 * `sources` and `findings`, so a fourth table added to
 * `DomainDependentCounts` is guarded the moment the port counts it
 * rather than the moment somebody remembers this line.
 *
 * The spread is load-bearing and not a defensive copy. An
 * INTERFACE gets no implicit index signature, so `Object.values`
 * over the record itself does not type-check at all (measured:
 * TS2345, index signature missing); over the spread it answers
 * `number[]` rather than the `any[]` overload, so the comparison
 * below is checked against a number (measured: reading a member off
 * the swept value is TS2339 naming `number`).
 */
function holdsDependents(counts: DomainDependentCounts): boolean {
  return Object.values({ ...counts }).some((count) => count > 0);
}

/**
 * Reads one window of the domain list.
 *
 * @param store - Where the rows and the count are read.
 * @param window - The `limit`/`offset` window, as `toStoreWindow`
 *   derived it from `?page` and `?perPage`. Already validated, so
 *   nothing here re-checks its bounds.
 * @returns The rows and the size of the whole collection.
 *
 * @remarks
 * The two reads are issued together rather than in sequence. They
 * are independent questions — a page's rows and the collection's
 * size — and awaiting them one after the other would make every
 * list request pay two round trips to answer one body.
 *
 * There is no refusal on this path at all. A window past the end of
 * the collection is an empty list rather than a 404, because the
 * collection exists and only the window over it is empty; a caller
 * that overshot can see it from `meta` once the router has built
 * one.
 */
export async function listDomains(
  store: DomainStore,
  window: StoreWindow,
): Promise<DomainPage> {
  const [rows, total] = await Promise.all([
    store.listDomains(window),
    store.countDomains(),
  ]);

  return { rows, total };
}

/**
 * Reads one domain by its natural key.
 *
 * @param store - Where the row is read.
 * @param slug - The natural key.
 * @returns The row, whole. `DomainRecord` in `./store.ts` records
 *   why the projection is the whole row: there is nothing on
 *   `domains` a reader of the API may not have.
 * @throws NotFoundError - When no domain carries the slug.
 */
export async function getDomain(
  store: DomainStore,
  slug: string,
): Promise<DomainRecord> {
  return requireDomain(store, slug);
}

/**
 * Creates a domain.
 *
 * @param store - Where the row is written.
 * @param body - The unvalidated request body, or the arguments an
 *   MCP tool was called with. Parsed here; see this module's
 *   header for why the parse is not the caller's.
 * @returns The stored row, read back rather than reconstructed, so
 *   the id and both stamps are the database's own.
 * @throws ValidationError - When the body does not satisfy
 *   {@link createDomainSchema}, with one detail per fault.
 * @throws ConflictError - When a domain already carries the slug.
 *
 * @remarks
 * The empty `settings` object is supplied HERE when the body
 * omitted the member, which is the port's instruction rather than a
 * convenience: see {@link createDomainSchema}.
 *
 * The insert is `return await` inside the `try` and not a bare
 * `return`, which is load-bearing rather than noise. Returning the
 * promise unawaited would settle it outside this block, the `catch`
 * would never run, and every duplicate slug in the deployment would
 * answer 500 with the whole file still reading as if it handled
 * one.
 *
 * The refusal is recognised by `reason` and not by the constraint
 * name. `DomainStore` declares `domains_slug_unique` as the only
 * mechanism it can raise, so on this port the two questions have
 * one answer; keying on the reason is what keeps the translation
 * true if a second unique key is ever added to the table, at which
 * point the message is what needs revisiting rather than the
 * branch.
 */
export async function createDomain(
  store: DomainStore,
  body: unknown,
): Promise<DomainRecord> {
  const input = parseBody(createDomainSchema, body, {
    openPaths: SETTINGS_OPEN_PATHS,
  });

  try {
    return await store.insertDomain({
      slug: input.slug,
      name: input.name,
      settings: input.settings ?? {},
    });
  } catch (err) {
    if (err instanceof StoreRefusal && err.reason === 'unique-violation') {
      throw new ConflictError(SLUG_ALREADY_TAKEN, undefined, { cause: err });
    }

    throw err;
  }
}

/**
 * Rewrites the supplied members of one domain.
 *
 * @param store - Where the row is read and written.
 * @param slug - The natural key naming the row to patch.
 * @param body - The unvalidated patch.
 * @returns The stored row afterwards.
 * @throws ValidationError - When the body does not satisfy
 *   {@link patchDomainSchema}.
 * @throws NotFoundError - When no domain carries the slug.
 *
 * @remarks
 * THE BODY IS PARSED BEFORE THE SLUG IS RESOLVED, so a malformed
 * patch is a 422 whether or not the domain exists. That ordering is
 * a decision: the shape of a body is a fact about the request
 * alone, and answering the same malformed patch a 422 or a 404
 * depending on what happens to be stored would make a caller's
 * error message depend on someone else's rows. It also costs the
 * refusal no database read at all.
 *
 * The second `null` check is not the first one repeated. The row
 * was there when it was read and can go before it is written —
 * nothing here holds a lock — so the update answering `null` is a
 * genuine second outcome, and it is the same 404 because it is the
 * same fact by the time a caller reads it.
 */
export async function patchDomain(
  store: DomainStore,
  slug: string,
  body: unknown,
): Promise<DomainRecord> {
  const patch = parseBody(patchDomainSchema, body, {
    openPaths: SETTINGS_OPEN_PATHS,
  });
  const existing = await requireDomain(store, slug);
  const updated = await store.updateDomain(existing.id, patch);

  if (updated === null) {
    throw new NotFoundError(NO_SUCH_DOMAIN);
  }

  return updated;
}

/**
 * Deletes a domain, refusing while it still holds rows it
 * accumulated unless the caller has confirmed the cascade.
 *
 * @param store - Where the counts are read and the row removed.
 * @param slug - The natural key naming the row to delete.
 * @param options - Whether the cascade is confirmed; see
 *   {@link DeleteDomainOptions}.
 * @returns Nothing. The router answers 204, because a deleted
 *   resource has no representation to carry.
 * @throws NotFoundError - When no domain carries the slug.
 * @throws ConflictError - When the domain holds topics, sources or
 *   findings and the cascade is unconfirmed. `details` carries the
 *   three counts.
 *
 * @remarks
 * THE GUARD PREVENTS NOTHING AT THE DATABASE. Every foreign key
 * onto `domains.id` is `ON DELETE CASCADE`, so the statement below
 * takes the taxonomy, the personas, the topics, the sources and the
 * findings whatever this function decided. What the guard buys is
 * that the loss was EXPLICIT: the confirmation that gets past it is
 * a sentence an operator wrote after reading how much goes, and the
 * counts are in the refusal so that reading is possible.
 *
 * The counts are read only on the guarded path. They exist to build
 * a refusal, and a confirmed delete has no refusal to build — so a
 * caller that has already decided does not pay for the question.
 *
 * Which tables are counted, and why those three rather than every
 * table that cascades, is `DomainDependentCounts` in `./store.ts`.
 * The short version: these are what the domain ACCUMULATED, while
 * its categories, terms, criteria and personas are what it was
 * CONFIGURED WITH and are expected to go with it.
 */
export async function deleteDomain(
  store: DomainStore,
  slug: string,
  options: DeleteDomainOptions,
): Promise<void> {
  const existing = await requireDomain(store, slug);

  if (!options.cascadeConfirmed) {
    const dependents = await store.countDomainDependents(existing.id);

    if (holdsDependents(dependents)) {
      throw new ConflictError(DOMAIN_HOLDS_ROWS, dependents);
    }
  }

  const removed = await store.deleteDomain(existing.id);

  if (!removed) {
    throw new NotFoundError(NO_SUCH_DOMAIN);
  }
}
