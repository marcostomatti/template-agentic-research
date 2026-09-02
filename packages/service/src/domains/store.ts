/**
 * @packageDocumentation
 * The `DomainStore` port — every database operation the domains
 * surface performs, declared as an interface so that the asking is
 * separable from Postgres.
 *
 * THE PORT DECIDES NOTHING, and every rule in `src/domains/service.ts`
 * is exercisable with no database because of it. An unknown slug, a
 * settings payload the validator refuses, a delete refused while the
 * domain still holds rows: none of those are facts about Postgres.
 * They are decisions taken about rows, and a decision about rows can
 * be driven by anything that supplies rows. So the isolated suite
 * puts `tests/helpers/memory-research-store.ts` behind this interface
 * and a deployment puts `./db-store.ts` behind it, both answering one
 * contract. What the live suite is left proving is the narrower claim
 * that real Postgres agrees — which is the only part of this that
 * a container has to be up to answer.
 *
 * The delete guard is the clearest case.
 * {@link DomainStore.countDomainDependents} answers three numbers and
 * takes no view of them; whether a non-zero count is a refusal or a
 * cascade the caller confirmed is decided one layer up, where the
 * request that asked for it is legible. A store that refused on its
 * own would move the rule into the one part of the module that cannot
 * be exercised without a database, which is the arrangement this file
 * exists to avoid.
 *
 * EVERY REFUSAL CROSSES THIS PORT AS A `StoreRefusal` — the error
 * `src/db/store-errors.ts` declares — AND AS NOTHING ELSE. A method
 * below either answers or throws that one type: no implementation
 * raises a driver error, a SQLSTATE, a constraint name a caller never
 * chose, or an error class of its own. That is what lets the service
 * above catch one thing and switch over a closed reason set, and it
 * is why the in-memory implementation has to refuse what Postgres
 * refuses rather than accept it. A fake that admits what the database
 * rejects is a second contract, agreeing right up until the
 * deployment that does not.
 *
 * Only one mechanism can fire here: `domains_slug_unique`, as a
 * `unique-violation`, and {@link DomainStore.insertDomain} is the
 * whole of its surface — a slug is written once and is not
 * patchable, per {@link DomainPatch}. The taxonomy port's much richer
 * refusal set has no counterpart on this one, so a service reading
 * `reason` here is really reading whether the slug was taken.
 *
 * READS TAKE THE NATURAL KEY, WRITES TAKE THE SURROGATE ONE. A route
 * addresses a domain by `:slug`, so
 * {@link DomainStore.findDomainBySlug} is where a request enters, and
 * every write below takes the {@link DomainRecord.id} that read
 * already returned. Not a formality: the service has to resolve the
 * slug anyway to answer 404 before it decides anything, and passing
 * on the id it now holds is what makes the write land on the row the
 * rule was decided about. It is also the only key
 * {@link DomainStore.countDomainDependents} could take, since the
 * dependent tables carry `domain_id` and know nothing of slugs.
 */
import type { DomainSettings } from '../db/schema/domains.js';
import type { StoreWindow } from '../http/schemas.js';

/**
 * One `domains` row, whole.
 *
 * Whole rather than column-scoped, because this record IS the
 * resource the route group answers with: `src/domains/routes.ts`
 * hands it to `ok()` and `JSON.stringify` sees exactly what an
 * implementation projected. There is nothing on `domains` a reader of
 * the API may not have — no hash, no secret, no operator-invisible
 * bookkeeping — so the narrow-projection argument
 * `src/auth/store.ts` makes for its own record types has no
 * counterpart here.
 *
 * TWO MEMBERS ARE READ-ONLY ACROSS THIS PORT.
 * {@link DomainRecord.featureVersion} and
 * {@link DomainRecord.embeddingModel} appear on the record and on
 * neither {@link InsertDomainInput} nor {@link DomainPatch}. They are
 * the feature pipeline's own pins, written by the feature port in
 * phase 4, and an operator editing a domain has no business moving
 * them: a bumped `feature_version` claims vectors were recomputed,
 * and every stale vector then reads as current.
 */
export interface DomainRecord {
  /** `domains.id`, and the key every write below takes. */
  readonly id: number;

  /**
   * The domain's natural key, unique across the table. What a route
   * path, an operator's `defaultDomainSlug` and the seed's upsert all
   * address the row by.
   */
  readonly slug: string;

  /** Operator-facing label. Free text, and safe to rename. */
  readonly name: string;

  /**
   * The domain's own configuration, shaped by `DomainSettings` in
   * `src/db/schema/domains.ts`. An empty object is a complete value
   * and the column's default: absent members mean the pipeline's
   * defaults apply, so a domain configures only what it wants to
   * differ.
   */
  readonly settings: DomainSettings;

  /**
   * The feature-vector version this domain's stored vectors are
   * expected to be at, or null when it has never been featurized.
   * Null is an absence rather than a zero — 0 is a version like any
   * other.
   */
  readonly featureVersion: number | null;

  /**
   * The embedding model those vectors were produced by, as the
   * embedder reported it, or null when this domain has never been
   * embedded.
   */
  readonly embeddingModel: string | null;

  /** When the row was inserted, stamped by the store. */
  readonly createdAt: Date;

  /**
   * When the row was last written, stamped by the store. There is no
   * trigger and no drizzle `$onUpdate` behind the column, because the
   * pipeline writes these rows through hand-written SQL as well; see
   * `src/db/schema/domains.ts`. Every write below stamps it, which is
   * this port's half of keeping that promise.
   */
  readonly updatedAt: Date;
}

/**
 * What a domain has ACCUMULATED, per dependent table, as
 * {@link DomainStore.countDomainDependents} counted it.
 *
 * THREE TABLES, AND WHICH THREE IS THE DECISION. `topics`, `sources`
 * and `findings` are what a domain accumulated: the questions it was
 * asked to research, the places it was told to look, and the results
 * that came back. Its categories, terms, criteria and personas are
 * what it was CONFIGURED WITH — rows with no meaning apart from the
 * domain, written by the same operator who is now deleting it, and
 * going with it is the outcome anybody would expect. Nobody is
 * surprised to lose a lexicon they wrote for a subject they are
 * discarding; losing the findings that subject produced is the loss
 * worth stopping to confirm.
 *
 * The counts are not what makes a delete safe or unsafe. Every
 * foreign key onto `domains.id` in schema v2 is `ON DELETE CASCADE`,
 * so the database takes all of it either way and no number here
 * prevents anything. What they are for is making the loss EXPLICIT:
 * the service refuses while any of the three is non-zero and names
 * them in the refusal, so the confirmation that gets past it is a
 * sentence an operator wrote after reading how much goes.
 *
 * Which means all three at `0` is NOT a promise that nothing else is
 * removed. `documents`, `entities`, `research_pool` and `runs` hang
 * off the same id and cascade with it, and are deliberately not
 * counted — these three are what the parent spec names for the
 * guard, and the guard is a warning rather than an inventory.
 */
export interface DomainDependentCounts {
  /** Rows in `topics` carrying this `domain_id`. */
  readonly topics: number;

  /** Rows in `sources` carrying this `domain_id`. */
  readonly sources: number;

  /** Rows in `findings` carrying this `domain_id`. */
  readonly findings: number;
}

/**
 * What {@link DomainStore.insertDomain} is handed: a complete domain,
 * minus the id and the two timestamps the write stamps.
 *
 * `settings` is REQUIRED here even though the column defaults to an
 * empty object, and that is the port deciding nothing again. A
 * default is a decision about what an omission means, and leaving it
 * to the column would make the drizzle implementation quietly right
 * and the in-memory one quietly wrong, since only one of the two has
 * a column to default from. The service supplies the empty object
 * when a request omitted settings, where the choice is visible and a
 * test can reach it.
 */
export interface InsertDomainInput {
  /**
   * The natural key. `domains_slug_unique` refuses a duplicate, which
   * is the one refusal this port raises.
   */
  readonly slug: string;

  /** Operator-facing label. */
  readonly name: string;

  /** The whole payload, empty when the domain configures nothing. */
  readonly settings: DomainSettings;
}

/**
 * What {@link DomainStore.updateDomain} is handed: the members to
 * rewrite, and no others.
 *
 * AN ABSENT MEMBER AND A PRESENT EMPTY ONE ARE DIFFERENT THINGS.
 * Omitting `settings` leaves the stored payload alone; supplying an
 * empty object replaces it with nothing, clearing every weight, the
 * verdict vocabulary and the field contract in one write. That is the
 * whole-unit rule the spec asks for: settings are patchable AS A
 * UNIT, so a caller sends the payload it wants to exist rather than
 * the members it wants to change, and no merge happens at any layer.
 * A merge would also make the clearing of a member unexpressible,
 * since the request that omits it and the request that removes it
 * would be the same bytes.
 *
 * `slug` is deliberately absent, so a domain cannot be renamed
 * through this port. The slug is what every other surface addresses
 * the domain by — the route path, the seed's upsert key, an
 * operator's `defaultDomainSlug` in `operator_settings` — and none
 * of those references is a foreign key the database would follow. A
 * rename is therefore a different operation from an edit, with a
 * fan-out of its own to settle first, rather than a member on a patch.
 */
export interface DomainPatch {
  /** The new label, or absent to leave it alone. */
  readonly name?: string;

  /**
   * The payload to store WHOLE, or absent to leave it alone. Never
   * merged into what is already there.
   */
  readonly settings?: DomainSettings;
}

/**
 * Every database operation the domains surface performs.
 *
 * Seven methods and no escape hatch: there is no `query`, no exposed
 * connection and no transaction handle, so an implementation is
 * substitutable by anything that can hold rows. That closure is what
 * makes the in-memory implementation a genuine second implementation
 * rather than a stub covering the easy calls.
 *
 * Every method is asynchronous, including the ones an in-memory
 * implementation could answer synchronously. The port is shaped by
 * the caller that has to await a database, and a synchronous member
 * would be one drizzle could not satisfy.
 *
 * Four other modules read a domain through this port rather than
 * declaring a lookup of their own: the taxonomy, personas, topics
 * and settings services all resolve a `:slug` (or a
 * `defaultDomainSlug`) through
 * {@link DomainStore.findDomainBySlug} before doing anything of
 * their own. One in-memory implementation therefore stands behind
 * all five ports, over one dataset, which is what keeps a domain
 * deleted in one of them deleted in the others.
 */
export interface DomainStore {
  /**
   * Reads one window of the domain list, ordered by
   * {@link DomainRecord.slug} ascending.
   *
   * THE ORDER IS PART OF THE CONTRACT, because a window over an
   * unordered read is not a page. Postgres promises nothing about row
   * order without an `ORDER BY`, so two requests for consecutive
   * pages may repeat one row and skip another while every count on
   * the wire still adds up. `slug` is what to order on because it is
   * UNIQUE: the order is total, so there is no tie-break to forget.
   *
   * @param window - `limit` and `offset`, as `toStoreWindow` in
   *   `src/http/schemas.ts` derived them from `?page`/`?perPage`. The
   *   type is declared there rather than here because every
   *   windowed port shares it — the four of wave 1 and
   *   `TopicStore` beside them — and it is already validated by the
   *   time it arrives, so no implementation re-checks its bounds.
   * @returns The rows in that window, possibly empty. A window past
   *   the end of the collection is an empty list rather than an
   *   error: the collection exists, and only the window over it is
   *   empty.
   */
  listDomains(window: StoreWindow): Promise<readonly DomainRecord[]>;

  /**
   * Counts every domain, ignoring any window.
   *
   * Separate from {@link DomainStore.listDomains} rather than
   * answered beside it, because the two are different questions: a
   * page's total describes the collection and not the page. Splitting
   * them also keeps the list read free of a window function that an
   * in-memory implementation could only imitate.
   *
   * @returns How many rows `domains` holds.
   */
  countDomains(): Promise<number>;

  /**
   * Looks a domain up by its natural key. The entry point for every
   * request naming a `:slug`, on this surface and on the taxonomy and
   * personas ones.
   *
   * @param slug - The slug as it reached the handler. Express 5
   *   URL-decodes a route parameter, so this is the decoded value and
   *   `slugParamSchema` in `src/http/schemas.ts` is what refuses
   *   anything that is not a slug.
   * @returns The row, or null when no domain carries that slug. Null
   *   is neither an error nor a refusal: it is the fact from which
   *   the service decides a 404.
   */
  findDomainBySlug(slug: string): Promise<DomainRecord | null>;

  /**
   * Inserts a domain, stamping `created_at` and `updated_at`.
   *
   * @param input - The complete row, minus its id and timestamps.
   * @returns The stored row, read back rather than reconstructed from
   *   the input, so the id and both stamps are the database's own.
   * @throws A `StoreRefusal` whose `reason` is `unique-violation` and
   *   whose `constraint` is `domains_slug_unique`, when a domain
   *   already carries that slug. This is the only refusal any method
   *   on this port raises.
   */
  insertDomain(input: InsertDomainInput): Promise<DomainRecord>;

  /**
   * Rewrites the supplied members of one domain, and stamps
   * `updated_at`.
   *
   * The stamp moves on every call, which is what makes a patch
   * carrying no member at all a legal write rather than an empty
   * `SET` clause an implementation would have to special-case.
   *
   * @param id - The {@link DomainRecord.id} a read already returned.
   * @param patch - The members to rewrite. `settings` replaces the
   *   stored payload WHOLE and is never merged into it.
   * @returns The stored row afterwards, or null when no row carries
   *   that id. Null is reachable even after a successful read, since
   *   the row may go in between, and answering it rather than
   *   throwing leaves what that means to the caller.
   */
  updateDomain(id: number, patch: DomainPatch): Promise<DomainRecord | null>;

  /**
   * Counts what the domain has accumulated, per dependent table.
   *
   * Read by the delete path before it decides anything, and by
   * nothing else. {@link DomainDependentCounts} carries which three
   * tables are counted and why those three.
   *
   * @param id - The {@link DomainRecord.id} to count against. The
   *   dependent tables carry `domain_id` and no slug, so this is the
   *   only key available.
   * @returns All three counts, every one present.
   *
   * @remarks
   * A zero is a counted zero. An implementation grouping one query
   * over the three tables has to fill the missing groups in, because
   * a table holding no rows contributes no row to a grouped result —
   * and letting that reach a caller as an absent member would make
   * `0` and "never counted" the same value on a guard whose whole job
   * is telling them apart.
   *
   * An id no domain carries answers three zeros rather than failing,
   * which is correct rather than a special case: nothing points at a
   * row that is not there. Whether that id should have existed is a
   * question {@link DomainStore.findDomainBySlug} already answered.
   */
  countDomainDependents(id: number): Promise<DomainDependentCounts>;

  /**
   * Deletes one domain.
   *
   * THE CASCADE IS THE DATABASE'S, not this method's. Every foreign
   * key onto `domains.id` is `ON DELETE CASCADE`, so a single
   * statement takes the taxonomy, the personas, the topics, the
   * sources and the findings with it. No implementation deletes a
   * dependent row itself and none reports what went, which is exactly
   * why {@link DomainStore.countDomainDependents} is a separate read
   * taken BEFORE the decision rather than a number this method could
   * hand back after it.
   *
   * @param id - The {@link DomainRecord.id} a read already returned.
   * @returns Whether a row was removed. False means no domain carried
   *   that id, which the service reaches only if the row went between
   *   its read and this call.
   */
  deleteDomain(id: number): Promise<boolean>;
}
