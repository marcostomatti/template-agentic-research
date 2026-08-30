/**
 * @packageDocumentation
 * The persona rules: reading one domain's personas, adding one,
 * retuning one, and taking one away. What
 * `/domains/:slug/personas` and `/personas/:id` reduce to once HTTP
 * is subtracted from them.
 *
 * FOUR FUNCTIONS AND NOTHING ELSE, for the reason
 * `src/domains/service.ts` gives for its five: a router adds a
 * path, a status code and an envelope over these, and wave 3
 * exposes the same four as MCP tools. There is no single-persona
 * read among them because no route asks for one — a persona is met
 * in its domain's list, and `:id` names it only in order to write.
 *
 * THE BODY IS PARSED HERE RATHER THAN ABOVE, exactly as both
 * sibling services argue: an operation handed an already-validated
 * input would have two callers validating it, the router today and
 * the MCP tool tomorrow, from a second schema nobody would notice
 * drifting. So {@link createPersona} and {@link patchPersona} take
 * an `unknown` and run it through {@link parseBody}.
 *
 * THE WINDOW ARRIVES ALREADY DERIVED, and the asymmetry with the
 * body is the one `src/domains/service.ts` states. What a persona
 * IS includes its system text, so an operation that did not check
 * it would not be the operation; `?page` and `?perPage` are how a
 * caller ASKED, a vocabulary belonging to HTTP that an MCP tool
 * would not spell at all. `toStoreWindow` in
 * `src/http/schemas.ts` owns that translation and
 * {@link listPersonas} takes its output — which is where this
 * module follows `listDomains` and `listTerms` rather than
 * `listCategories`, whose collection is a shallow taxonomy with no
 * page to describe. A domain's personas are a list of the same
 * kind as its terms: operator-authored, unbounded in principle,
 * and read one window at a time.
 *
 * THE DOMAIN IS RESOLVED FIRST, ON THE TWO OPERATIONS THAT NAME
 * ONE. `PersonaStore` resolves no slug — its own header says so —
 * so a `:slug` is turned into a `DomainRecord` through
 * `DomainStore.findDomainBySlug` before any persona is read or
 * written, and a slug naming no row is a 404 that costs the
 * personas table no read at all. The other two operations name
 * `/personas/:id` and no domain, so there is nothing to resolve:
 * the row carries its own `domainId`, and the one rule that needs
 * it — a role unique within the domain — is the database's.
 *
 * TWO MECHANISMS, AND NO ORDER BETWEEN THEM. `personas` carries no
 * CHECK and no trigger, so the whole of what a write here can be
 * refused for is a duplicate `(domain_id, role)` and a `domainId`
 * naming no row. `./store.ts` records both measured against the
 * live server, and records why they cannot fire at once: the
 * unique key opens on the very column the foreign key constrains,
 * so a write naming a domain that is not there can duplicate
 * nothing. `./categories-service.ts` in the taxonomy group has a
 * measured refusal order to translate; this module has none to
 * offer and says so rather than copying the sentence.
 *
 * A ROLE IS A 409 FROM BOTH WRITES THAT CAN PROPOSE ONE, and that
 * is the substantive difference from the sibling groups.
 * `PersonaPatch` carries `role`, so a rename can collide exactly
 * as a create can — measured on the live server, where a duplicate
 * answers 23505 naming `personas_domain_id_role_unique` on an
 * UPDATE as readily as on an INSERT. `CategoryPatch` refuses to
 * carry its `key` and `DomainPatch` its `slug`, so neither of
 * those patches can reach a unique key at all; this one can, which
 * is why {@link patchPersona} translates the same refusal
 * {@link createPersona} does rather than treating it as
 * unreachable.
 *
 * A FOREIGN-KEY REFUSAL IS THE LOST RACE, AND IT IS ANSWERED AS
 * WHAT IT IS. Only {@link createPersona} can reach one — `domainId`
 * is absent from `PersonaPatch`, so no update touches that column
 * — and it means the domain resolved a moment earlier was deleted
 * between the lookup and the write. The fact to report is the one
 * {@link requireDomain} already reports: no domain carries that
 * slug. So it is the same 404 rather than a 500, and a caller
 * re-issuing the request gets one answer for one state however the
 * timing fell. The pre-check is not thereby redundant —
 * {@link listPersonas} has no write to be refused by, and
 * {@link createPersona} needs the id the lookup returns before it
 * can write at all.
 *
 * NOTHING SUBMITTED REACHES A MESSAGE OR A DETAIL BUILT HERE.
 * Every message below is a constant of this module's own, and no
 * `StoreRefusal` field is copied into one: a driver error's
 * `detail` reads `Key (domain_id, role)=(1, scorer) already
 * exists.` and the drizzle wrapper's `message` carries the whole
 * statement with its bound parameters, so quoting either would put
 * a submitted value on the wire and, through `errorHandler`, in a
 * log line. The role a request proposed is the value a duplicate
 * is most likely to quote back, which is why the 409 below names
 * the rule rather than the role.
 *
 * A `StoreRefusal` IS TRANSLATED AND NEVER RETHROWN AS ITSELF —
 * for the reasons it is declared a plain `Error` in
 * `src/db/store-errors.ts`. The two mechanisms `PersonaStore`
 * declares are translated below and anything else is rethrown
 * untouched, which answers 500 rather than a plausible status no
 * rule authorised. A `check-violation` out of any call here would
 * be one: the table carries no CHECK for one to come from.
 *
 * THE STORE IS A PARAMETER, so every rule here is exercisable with
 * no database: `tests/helpers/memory-research-store.ts` stands
 * behind both ports over one dataset, which is what lets a domain
 * resolved through one of them own the personas read through the
 * other.
 */
import type { PersonaRecord, PersonaStore } from './store.js';
import type { DomainRecord, DomainStore } from '../domains/store.js';
import type { StoreWindow } from '../http/schemas.js';

import { z } from 'zod';

import { ConflictError, NotFoundError } from '../../lib/errors/index.js';
import { StoreRefusal } from '../db/store-errors.js';
import { parseBody } from '../http/validation.js';

/**
 * Exactly the port methods these four functions reach, across both
 * ports they reach them on.
 *
 * A `Pick` OF TWO PORTS RATHER THAN EITHER ONE WHOLE, for the
 * reasons `CategoryServiceStore` in
 * `src/taxonomy/categories-service.ts` gives. Resolving a slug is
 * one method of `DomainStore`, and asking for the whole port would
 * have this module claim to need the domain writes it never
 * issues. And `findPersonaById` is on `PersonaStore` for a reader
 * that wants one row; nothing here calls it, because neither write
 * below reads before it writes, so it stays out.
 *
 * Built with `Pick` rather than by listing signatures, so a method
 * here cannot drift from the thing it is naming: a hand-copied
 * signature would go on type-checking against a port that had
 * moved under it.
 */
export type PersonaServiceStore =
  Pick<DomainStore, 'findDomainBySlug'>
  & Pick<
    PersonaStore,
    | 'countPersonas'
    | 'deletePersona'
    | 'insertPersona'
    | 'listPersonas'
    | 'updatePersona'
  >;

/**
 * What a caller is told when no domain carries the slug it named.
 *
 * The slug is not in it, per this module's header, and the same
 * sentence both sibling services answer for their own `:slug` —
 * spelled again rather than imported, because the three are equal
 * by intent rather than by derivation and any of them is free to
 * change without dragging the others with it.
 */
const NO_SUCH_DOMAIN = 'No domain carries that slug';

/** What a caller is told when no persona carries the id it named. */
const NO_SUCH_PERSONA = 'No persona carries that id';

/**
 * What a caller is told when the role it proposed is taken.
 *
 * The rule rather than the role. A duplicate is the one refusal
 * here whose cause is a value the caller submitted, so it is the
 * one where quoting the value back would read most naturally and
 * be exactly the leak this module's header forbids.
 */
const ROLE_ALREADY_TAKEN
  = 'This domain already carries a persona for that role';

/**
 * The body `POST /domains/:slug/personas` accepts.
 *
 * Strict, like every request schema on this surface, so a misspelt
 * member is a refusal rather than a silently dropped one.
 *
 * `role` is held to non-empty and NOTHING MORE, which is
 * `personaSeedSchema`'s shape in `scripts/seed-schemas.ts` for the
 * same column. `personas.role` carries no CHECK — the roles a
 * pipeline plays grow with the pipeline, and a fourth one should
 * be a row rather than a migration — and a role never appears in a
 * path segment, since a persona is addressed by `:id`. So there is
 * no URL shape to enforce and narrowing here would only make this
 * surface unable to write roles the seed can. Non-empty is the one
 * restriction that survives that argument: a role is half the
 * row's natural key and a persona keyed the empty string is one no
 * list can label.
 *
 * `systemText` IS REQUIRED AND MAY BE EMPTY, which is the pairing
 * the seed makes and the one `PersonaRecord.systemText` argues
 * for. An empty string is a legal value meaning the role exists
 * and has no instructions yet — a state an operator can act on —
 * while an ABSENT member is a request that forgot to say. Holding
 * the member required and its value unconstrained is what keeps
 * those two apart, and it is why this schema does not simply
 * default the member to the empty string.
 *
 * `domainId` is absent, and deliberately: the path names the
 * domain, and a body member naming a second one would be a request
 * that could disagree with its own URL.
 */
export const createPersonaSchema = z.object({
  role: z.string().min(1),
  systemText: z.string(),
}).strict();

/**
 * The body `PATCH /personas/:id` accepts.
 *
 * Both members optional, so a patch carrying nothing at all is a
 * legal call answering the stored row — which `PersonaStore`
 * states rather than leaving to its implementations, since
 * `personas` carries no `updated_at` for a write to stamp and an
 * empty update list is something drizzle throws on.
 *
 * `role` IS PATCHABLE HERE, unlike the `key` and `slug` its
 * siblings refuse to carry. `PersonaPatch` in `./store.ts` carries
 * the argument: no foreign key in schema v2 points at `personas`,
 * the seed upserts on `(domain, role)` so a re-run writes the row
 * the file describes, and a run resolves the role it plays by name
 * at its own start — so a rename changes which text a run finds,
 * at the next run and for the same reason every other edit does,
 * rather than leaving a dangling pointer behind.
 *
 * Neither member distinguishes THREE requests the way a nullable
 * patch member does. Both columns are `NOT NULL`, so absent means
 * leave it alone and there is no null to clear anything with. An
 * empty `systemText` is a value being written and not a member
 * being removed, which is why it is admitted here exactly as it is
 * on the create.
 *
 * `domainId` is absent, so a persona cannot be moved between
 * domains: the text is written ABOUT the subject its domain names,
 * and a move would carry prose about one subject into another and
 * then read as that domain's configuration. Its absence is also
 * what keeps every foreign-key refusal off {@link patchPersona}.
 */
export const patchPersonaSchema = z.object({
  role: z.string().min(1)
    .optional(),
  systemText: z.string().optional(),
}).strict();

/**
 * One page of a domain's personas, beside the size of the
 * collection it was read from.
 *
 * Two members rather than a rendered envelope, for the reason
 * `DomainPage` in `src/domains/service.ts` gives: building `meta`
 * is the router's half, and this module was never told what the
 * window was in `page`/`perPage` terms.
 */
export interface PersonaPage {
  /** The rows the window selected, role ascending. */
  readonly rows: readonly PersonaRecord[];

  /** How many personas the domain holds, ignoring the window. */
  readonly total: number;
}

/**
 * Turns what the store refused into what the caller is told.
 *
 * @param err - Whatever the store threw.
 * @returns Never; every path throws.
 * @throws ConflictError - For a role the domain already carries,
 *   from a create and from a rename alike.
 * @throws NotFoundError - For a `domainId` naming no row, which is
 *   the domain having gone between the lookup and the write. See
 *   this module's header for why that is the same 404 the lookup
 *   itself raises.
 * @throws The original error, unchanged, when it is not a
 *   `StoreRefusal` or carries a reason `PersonaStore` does not
 *   declare. A store doing something its port does not describe
 *   answers 500, which is the honest status for it.
 *
 * @remarks
 * No argument says which write raised the refusal, unlike the
 * translator in `src/taxonomy/categories-service.ts`. It needs one
 * because a single constraint name there covers two faults wearing
 * two statuses; here each reason maps to one answer whichever call
 * produced it, so a `write` parameter would be a discriminator
 * with nothing to discriminate.
 */
function refuseWrite(err: unknown): never {
  if (!(err instanceof StoreRefusal)) {
    throw err;
  }

  if (err.reason === 'unique-violation') {
    throw new ConflictError(ROLE_ALREADY_TAKEN, undefined, { cause: err });
  }

  if (err.reason === 'foreign-key-violation') {
    throw new NotFoundError(NO_SUCH_DOMAIN, undefined, { cause: err });
  }

  throw err;
}

/**
 * Resolves the `:slug` a personas collection path opens with.
 *
 * @param store - Where the domain is read.
 * @param slug - The natural key, already narrowed by
 *   `slugParamSchema` at whichever boundary the request entered.
 * @returns The domain row, for its id.
 * @throws NotFoundError - When no domain carries the slug.
 *
 * @remarks
 * Private, and its message is this module's own. Both sibling
 * services keep the identical helper unexported for exactly this
 * reason: a shared one would put one route group's wording on
 * another's refusals, and the three are free to diverge the moment
 * any of them has something of its own to say. It is the same
 * sentence today, which is the three agreeing rather than the
 * three being one.
 */
async function requireDomain(
  store: PersonaServiceStore,
  slug: string,
): Promise<DomainRecord> {
  const row = await store.findDomainBySlug(slug);

  if (row === null) {
    throw new NotFoundError(NO_SUCH_DOMAIN);
  }

  return row;
}

/**
 * Reads one window of a domain's personas.
 *
 * @param store - Where the domain and its personas are read.
 * @param slug - The domain's natural key.
 * @param window - The `limit`/`offset` window, as `toStoreWindow`
 *   in `src/http/schemas.ts` derived it from `?page` and
 *   `?perPage`. Already validated, so nothing here re-checks its
 *   bounds.
 * @returns The rows and the size of the whole collection.
 * @throws NotFoundError - When no domain carries the slug.
 *
 * @remarks
 * THE DOMAIN IS RESOLVED FIRST, and that read is the whole
 * difference between a domain with no personas and a domain that
 * is not there. `PersonaStore.listPersonas` answers an empty list
 * for an id no row carries and `countPersonas` answers `0`, both
 * of them correctly — nothing points at a row that is not there —
 * so a caller issuing the two reads alone could not tell the two
 * states apart, and a mistyped slug would read as a domain whose
 * personas somebody had removed.
 *
 * The two reads are issued together rather than in sequence, for
 * the reason `listDomains` gives: a page's rows and the
 * collection's size are independent questions, and awaiting them
 * one after the other would make every list request pay two round
 * trips to answer one body.
 *
 * A window past the end of the collection is an empty page rather
 * than a 404. The collection exists and only the window over it is
 * empty, which a caller can see from `meta` once the router has
 * built one.
 */
export async function listPersonas(
  store: PersonaServiceStore,
  slug: string,
  window: StoreWindow,
): Promise<PersonaPage> {
  const domain = await requireDomain(store, slug);
  const [rows, total] = await Promise.all([
    store.listPersonas(domain.id, window),
    store.countPersonas(domain.id),
  ]);

  return { rows, total };
}

/**
 * Adds one persona to a domain.
 *
 * @param store - Where the domain is read and the persona written.
 * @param slug - The domain's natural key.
 * @param body - The unvalidated request body, or the arguments an
 *   MCP tool was called with.
 * @returns The stored row, read back rather than reconstructed, so
 *   the id is the database's own.
 * @throws ValidationError - When the body does not satisfy
 *   {@link createPersonaSchema}, with one detail per fault.
 * @throws NotFoundError - When no domain carries the slug, and
 *   when the domain went away between the lookup and the write.
 * @throws ConflictError - When the domain already carries a
 *   persona for that role.
 *
 * @remarks
 * ASSERTS A NEW ROW AND DOES NOT UPSERT, which is the difference
 * from `scripts/seed.ts` writing this same table through an
 * `ON CONFLICT` on this same natural key. A `POST` is a caller
 * stating that the domain has no persona for the role yet, so a
 * duplicate is a 409 rather than a silent rewrite of system text
 * somebody spent an afternoon tuning. The seed's upsert answers a
 * different intent: a file being applied whole, where rewriting is
 * the point rather than the accident.
 *
 * THE BODY IS PARSED BEFORE THE SLUG IS RESOLVED, so a malformed
 * body is a 422 whether or not the domain exists. The shape of a
 * body is a fact about the request alone, and answering the same
 * body a 422 or a 404 depending on what happens to be stored would
 * make a caller's error depend on rows it never asked about. It
 * also costs that refusal no read at all.
 *
 * The insert is `return await` inside the `try` rather than a bare
 * `return`: returning the promise unawaited would settle it
 * outside this block, the `catch` would never run, and every
 * duplicate role in the deployment would answer 500 with the file
 * still reading as if it handled one.
 */
export async function createPersona(
  store: PersonaServiceStore,
  slug: string,
  body: unknown,
): Promise<PersonaRecord> {
  const input = parseBody(createPersonaSchema, body);
  const domain = await requireDomain(store, slug);

  try {
    return await store.insertPersona({
      domainId: domain.id,
      role: input.role,
      systemText: input.systemText,
    });
  } catch (err) {
    return refuseWrite(err);
  }
}

/**
 * Rewrites the supplied members of one persona.
 *
 * @param store - Where the row is written.
 * @param id - The persona's id, as `resourceIdParamSchema` in
 *   `src/http/schemas.ts` parsed it.
 * @param body - The unvalidated patch.
 * @returns The stored row afterwards.
 * @throws ValidationError - When the body does not satisfy
 *   {@link patchPersonaSchema}, with one detail per fault.
 * @throws NotFoundError - When no persona carries the id.
 * @throws ConflictError - When the resulting role is one the
 *   persona's domain already carries on another row.
 *
 * @remarks
 * NO DOMAIN IS RESOLVED AND NONE IS NAMED. `PATCH /personas/:id`
 * addresses the row directly, and the rule that spans a domain — a
 * role unique within it — is checked against the domain the STORED
 * row is in, which `PersonaPatch` refusing to carry `domainId` is
 * what guarantees.
 *
 * There is no read before the write. `PersonaStore.updatePersona`
 * answers `null` for an id no row carries, so a preceding
 * `findPersonaById` would buy a second round trip and a second
 * chance for the row to go in between; the 404 below is the same
 * fact either way.
 *
 * A patch carrying no member at all is legal and answers the
 * stored row, which is the port's rule rather than this module's:
 * `personas` has no `updated_at`, so an empty patch has literally
 * nothing to set.
 *
 * The edit takes effect on the following run, and there is nothing
 * here to announce afterwards. `./store.ts` carries why that needs
 * no invalidation anywhere: a run reads its personas at its own
 * start and nothing between this module and that query keeps a
 * copy.
 */
export async function patchPersona(
  store: PersonaServiceStore,
  id: number,
  body: unknown,
): Promise<PersonaRecord> {
  const patch = parseBody(patchPersonaSchema, body);
  let updated: PersonaRecord | null;

  try {
    updated = await store.updatePersona(id, patch);
  } catch (err) {
    return refuseWrite(err);
  }

  if (updated === null) {
    throw new NotFoundError(NO_SUCH_PERSONA);
  }

  return updated;
}

/**
 * Deletes one persona.
 *
 * @param store - Where the row is removed.
 * @param id - The persona's id.
 * @returns Nothing. The router answers 204, because a deleted
 *   resource has no representation to carry.
 * @throws NotFoundError - When no persona carries the id.
 *
 * @remarks
 * NOTHING HANGS OFF A PERSONA — no foreign key in schema v2 points
 * at this table — so this delete has neither a guard nor a cascade
 * and cannot be refused. There is no `?cascade=confirm` here and
 * nothing for one to authorise, unlike `deleteDomain`, whose
 * guard exists because the database would otherwise silently take
 * everything a domain accumulated.
 *
 * A run that afterwards finds no row for the role it plays is in
 * exactly the state of a run whose domain never named that role,
 * which is what makes removing a persona a whole operation rather
 * than half of one with a reference left behind.
 */
export async function deletePersona(
  store: PersonaServiceStore,
  id: number,
): Promise<void> {
  const removed = await store.deletePersona(id);

  if (!removed) {
    throw new NotFoundError(NO_SUCH_PERSONA);
  }
}
