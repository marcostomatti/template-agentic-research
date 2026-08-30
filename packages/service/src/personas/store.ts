/**
 * @packageDocumentation
 * The `PersonaStore` port — every database operation the personas
 * surface performs, declared as an interface so that the asking is
 * separable from Postgres.
 *
 * THE PORT DECIDES NOTHING, exactly as `src/domains/store.ts` and
 * `src/taxonomy/store.ts` state for their own surfaces. An unknown
 * domain slug, an unknown persona id, a role the domain already
 * carries: none of those are facts about Postgres, they are
 * decisions taken about rows, and a decision about rows can be
 * driven by anything that supplies rows. So the isolated suite puts
 * `tests/helpers/memory-research-store.ts` behind this interface and
 * a deployment puts `./db-store.ts` behind it, both answering one
 * contract, and the live suite is left proving only that real
 * Postgres agrees.
 *
 * AN EDIT TAKES EFFECT ON THE FOLLOWING RUN, AND THAT IS THE WHOLE
 * INVALIDATION STORY. A run reads its personas at its own start
 * — one query in the first node after its trigger, fetching the
 * domain's taxonomy alongside them — and nothing between this port
 * and that query keeps a copy. There is no cache to expire, no
 * version to bump and nobody to notify, so there is no invalidation
 * path to get wrong, which is why this port has no `refresh`, no
 * `invalidate` and no read that answers anything but rows. What
 * could be read as an omission is the design: a write here lands in
 * Postgres, and the next run picks it up because Postgres is the
 * only place either of them looks.
 *
 * The other half of that rule is what a write does NOT do. A run
 * already in flight keeps the text it started with, so what a run
 * did stays attributable to one set of rows rather than to whichever
 * edit landed partway through it, and an operator retuning a prompt
 * is never racing a run for the paragraph it is reading.
 * `src/db/schema/domains.ts` carries the argument for why a prompt
 * is a row in `personas` before it is anything else; what this port
 * adds is that no layer above the table may remember one.
 *
 * EVERY REFUSAL CROSSES THIS PORT AS A `StoreRefusal` — the error
 * `src/db/store-errors.ts` declares — AND AS NOTHING ELSE. No
 * implementation raises a driver error, a SQLSTATE, or an error
 * class of its own, which is what lets `./service.ts` catch one
 * thing and switch over a closed reason set, and why the in-memory
 * implementation has to refuse what Postgres refuses rather than
 * accept it.
 *
 * Which mechanisms can fire, measured against the live Postgres
 * rather than read off the schema. A duplicate `(domain_id, role)`
 * is 23505 naming `personas_domain_id_role_unique`, on INSERT and on
 * UPDATE alike; a `domainId` naming no row is 23503 naming
 * `personas_domain_id_domains_id_fk`. Each was measured beside a
 * positive control — a second role under the same domain accepted
 * where the duplicate was refused, and the SAME role under another
 * domain accepted, which is what says the key is per-domain rather
 * than global. `personas` carries no CHECK and no trigger, so a
 * `check-violation` out of any method below would be a fault rather
 * than a rule.
 *
 * THE TWO CANNOT BE VIOLATED AT ONCE, so there is no refusal order
 * here and none is claimed. The unique key opens on the very column
 * the foreign key constrains: a write naming a domain that does not
 * exist can duplicate nothing, because nothing is stored under a
 * domain that is not there. `src/taxonomy/store.ts` records a
 * measured order for `categories` because that table's three
 * mechanisms genuinely race; this one has no such reading to offer
 * and says so rather than copying the sentence.
 *
 * READS TAKE THE SURROGATE KEY, and only the collection read takes
 * another row's. A route addresses a persona by `:id` — the natural
 * key is `(domain_id, role)`, so a path naming a role alone names
 * nothing — while `GET /domains/:slug/personas` takes the domain's
 * id, which `DomainStore.findDomainBySlug` in `src/domains/store.ts`
 * resolved from the `:slug` before anything here was called.
 */
import type { StoreWindow } from '../http/schemas.js';

/**
 * One `personas` row, whole.
 *
 * Whole rather than column-scoped, for the reason `DomainRecord` in
 * `src/domains/store.ts` gives: this record IS the resource the
 * route group answers with, and there is nothing on `personas` a
 * reader of the API may not have. The system text is the most
 * operator-visible prose in the system — reading it is what an
 * operator comes to this surface for.
 *
 * THERE ARE NO TIMESTAMPS, and their absence is the table's rather
 * than this record's. `personas` carries no `created_at` and no
 * `updated_at`, so a persona cannot report when its text was last
 * retuned and nothing here pretends otherwise. That absence is also
 * what makes an empty patch a decision this port has to take rather
 * than leave to its two implementations; see
 * {@link PersonaStore.updatePersona}.
 */
export interface PersonaRecord {
  /** `personas.id`, and the key every write below takes. */
  readonly id: number;

  /**
   * The domain this persona speaks for. Half of the row's natural
   * key, and read by the one rule a path cannot express: a
   * `PATCH /personas/:id` names no domain, so this is what says
   * whose configuration the addressed row is part of.
   */
  readonly domainId: number;

  /**
   * Which role the text is for — `researcher`, `scorer` and
   * `drafter` today. Free text and not a closed set: `personas.role`
   * carries no CHECK, because the roles a pipeline plays grow with
   * the pipeline and a fourth one should be a row rather than a
   * migration. Half of the row's natural key, unique within the
   * domain.
   */
  readonly role: string;

  /**
   * The system text the role is given.
   *
   * AN EMPTY STRING IS A LEGAL VALUE AND MEANS SOMETHING: the role
   * exists and has no instructions yet, which is a state a reader
   * can act on and which `personaSeedSchema` in
   * `scripts/seed-schemas.ts` deliberately admits. Nothing on this
   * port treats it as an absence.
   */
  readonly systemText: string;
}

/**
 * What {@link PersonaStore.insertPersona} is handed: a complete
 * persona, minus the id the write stamps.
 */
export interface InsertPersonaInput {
  /**
   * The domain this persona speaks for, as
   * `DomainStore.findDomainBySlug` in `src/domains/store.ts` already
   * resolved it from the `:slug` in the path.
   */
  readonly domainId: number;

  /**
   * The role, within the domain.
   * `personas_domain_id_role_unique` refuses one the domain already
   * carries.
   */
  readonly role: string;

  /**
   * The system text. Required and possibly empty, never absent, per
   * {@link PersonaRecord.systemText}: a role with nothing to say
   * says so, rather than being indistinguishable from a member
   * somebody left off the request.
   */
  readonly systemText: string;
}

/**
 * What {@link PersonaStore.updatePersona} is handed: the members to
 * rewrite, and no others.
 *
 * `role` IS PATCHABLE, which is the substantive difference from
 * `DomainPatch` and `CategoryPatch` in the sibling ports, and it is
 * the argument `TermPatch` makes for its own `pattern`. Nothing
 * outside this table holds a reference a rename would strand: no
 * foreign key in schema v2 points at `personas`, the seed upserts on
 * `(domain, role)` so a re-run writes the row the file describes,
 * and a run resolves the role it plays by name at its own start. So
 * a rename changes which text a run finds, at the next run and for
 * the same reason every other edit does, rather than leaving a
 * dangling pointer for something else to trip over later.
 *
 * `domainId` is deliberately absent, so a persona cannot be moved
 * between domains. The text is written ABOUT the subject its domain
 * names, so a move would carry prose about one subject into another
 * and then read as that domain's configuration. Its absence also
 * keeps every foreign-key refusal off
 * {@link PersonaStore.updatePersona}, which is why that method
 * raises the unique key and nothing else.
 *
 * Neither member distinguishes THREE requests the way `CategoryPatch`
 * does with its `parentId`. Both columns are `NOT NULL`, so absent
 * means leave it alone and there is no null to clear anything with
 * — an empty `systemText` is a value being written, not a member
 * being removed.
 */
export interface PersonaPatch {
  /**
   * The new role, or absent to leave it alone.
   * `personas_domain_id_role_unique` refuses one the domain already
   * carries.
   */
  readonly role?: string;

  /** The new system text, or absent to leave it alone. */
  readonly systemText?: string;
}

/**
 * Every database operation the personas surface performs.
 *
 * Six methods and no escape hatch: there is no `query`, no exposed
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
 * NO METHOD RESOLVES A DOMAIN, AND NONE DELETES ONE. `:slug` becomes
 * a domain row through `DomainStore.findDomainBySlug` in
 * `src/domains/store.ts` before anything here is called, and the
 * cascade that takes a domain's personas with it belongs to
 * `DomainStore.deleteDomain` and to the `ON DELETE CASCADE` behind
 * that column. One in-memory implementation stands behind both ports
 * over one dataset, which is what keeps a domain deleted in one of
 * them deleted in the other.
 */
export interface PersonaStore {
  /**
   * Reads one window of a domain's personas, ordered by
   * {@link PersonaRecord.role} ascending.
   *
   * THE ORDER IS PART OF THE CONTRACT, because a window over an
   * unordered read is not a page. Postgres promises nothing about
   * row order without an `ORDER BY`, so two requests for consecutive
   * pages may repeat one row and skip another while every count on
   * the wire still adds up. `role` is what to order on because it is
   * unique WITHIN the domain and this read is scoped to one domain,
   * so the order is total and there is no tie-break to forget.
   *
   * @param domainId - The domain whose personas to read, as
   *   `DomainStore.findDomainBySlug` in `src/domains/store.ts`
   *   already returned it.
   * @param window - `limit` and `offset`, as `toStoreWindow` in
   *   `src/http/schemas.ts` derived them from `?page`/`?perPage`.
   *   The window arrives already validated, so no implementation
   *   re-checks its bounds.
   * @returns The rows in that window, possibly empty. A window past
   *   the end of the collection, a domain with no personas and an id
   *   no domain carries are all an empty list rather than an error:
   *   none of the three is a failure to read, and whether the domain
   *   existed is a question `DomainStore.findDomainBySlug` answered
   *   before this was called.
   *
   * @remarks
   * The order is the DATABASE's, taken under its own collation, and
   * a role is free text rather than a slug: it may carry case,
   * spaces and punctuation, so agreement with a JavaScript sort of
   * the same strings is not something this port promises. Measured
   * on the live Postgres, whose `en_US.utf8` ordered a mixed-case,
   * punctuation-bearing role set exactly as a code-unit compare did
   * — but that is a fact about one deployment's locale rather than
   * about this contract. Nothing on this surface serialises personas
   * byte-for-byte, so there is nothing here that has to notice if a
   * deployment's collation differs.
   */
  listPersonas(
    domainId: number,
    window: StoreWindow,
  ): Promise<readonly PersonaRecord[]>;

  /**
   * Counts a domain's personas, ignoring any window.
   *
   * Separate from {@link PersonaStore.listPersonas} rather than
   * answered beside it, because the two are different questions: a
   * page's total describes the collection and not the page.
   * Splitting them also keeps the list read free of a window
   * function an in-memory implementation could only imitate.
   *
   * @param domainId - The domain to count within.
   * @returns How many rows `personas` holds for it. An id no domain
   *   carries answers `0`, which is correct rather than a special
   *   case: nothing points at a row that is not there.
   */
  countPersonas(domainId: number): Promise<number>;

  /**
   * Looks one persona up by its id. Where a request naming
   * `/personas/:id` enters.
   *
   * @param id - The id as `resourceIdParamSchema` in
   *   `src/http/schemas.ts` parsed it.
   * @returns The row, or null when no persona carries that id. Null
   *   is neither an error nor a refusal: it is the fact from which
   *   the service decides a 404. The row carries
   *   {@link PersonaRecord.domainId}, which is the only thing that
   *   says which domain a `PATCH /personas/:id` is editing.
   */
  findPersonaById(id: number): Promise<PersonaRecord | null>;

  /**
   * Inserts one persona.
   *
   * ASSERTS A NEW ROW, AND DOES NOT UPSERT — unlike
   * `scripts/seed.ts`, which writes this same table through an
   * `ON CONFLICT` on this same natural key. A `POST` is a caller
   * stating that the domain has no persona for the role yet, so a
   * duplicate is a 409 rather than a silent rewrite of system text
   * somebody spent an afternoon tuning. The seed's upsert answers a
   * different intent: a file being applied whole, where rewriting is
   * the point rather than the accident.
   *
   * @param input - The complete row, minus its id.
   * @returns The stored row, read back rather than reconstructed
   *   from the input, so the id is the database's own.
   * @throws A `StoreRefusal` with `reason` `unique-violation` and
   *   `constraint` `personas_domain_id_role_unique`, when the domain
   *   already carries that role.
   * @throws A `StoreRefusal` with `reason` `foreign-key-violation`
   *   and `constraint` `personas_domain_id_domains_id_fk`, when
   *   `domainId` names no domain. The service resolved the domain
   *   before calling, so this is reachable only if the row went in
   *   between.
   */
  insertPersona(input: InsertPersonaInput): Promise<PersonaRecord>;

  /**
   * Rewrites the supplied members of one persona.
   *
   * A PATCH CARRYING NO MEMBER ANSWERS THE STORED ROW WITHOUT
   * WRITING, and this port decides that rather than leaving it to
   * two implementations. `personas` has no `updated_at`, so an empty
   * patch has literally nothing to set: drizzle throws
   * `No values to set` on an empty update list, while an in-memory
   * implementation would happily answer the row. Left unstated, the
   * two halves of this port would disagree about a call the surface
   * admits. `TaxonomyStore.updateCategory` and
   * `TaxonomyStore.updateTerm` in `src/taxonomy/store.ts` carry the
   * same rule for the same reason; `DomainStore.updateDomain` does
   * not, because `domains` has a timestamp to stamp.
   *
   * The edit is visible to the next run and to no run already in
   * flight. The module header carries why that needs no invalidation
   * anywhere, and it is the reason this method has nothing to
   * announce after it writes.
   *
   * @param id - The {@link PersonaRecord.id} a read already
   *   returned.
   * @param patch - The members to rewrite. `domainId` is not among
   *   them, per {@link PersonaPatch}.
   * @returns The stored row afterwards, or null when no row carries
   *   that id. Null is reachable even after a successful read, since
   *   the row may go in between, and answering it rather than
   *   throwing leaves what that means to the caller.
   * @throws A `StoreRefusal` with `reason` `unique-violation` and
   *   `constraint` `personas_domain_id_role_unique`, when the
   *   RESULTING role is one the domain already carries. This is the
   *   only refusal an update raises: `domainId` is not patchable, so
   *   no update reaches the foreign key at all.
   */
  updatePersona(
    id: number,
    patch: PersonaPatch,
  ): Promise<PersonaRecord | null>;

  /**
   * Deletes one persona.
   *
   * Nothing hangs off a persona — no foreign key in schema v2 points
   * at this table — so there is no cascade and no guard, and this is
   * a delete that cannot be refused. A run that afterwards finds no
   * row for the role it plays is in exactly the state of a run whose
   * domain never named that role, which is what makes removing a
   * persona a whole operation rather than half of one with a
   * reference left behind.
   *
   * @param id - The {@link PersonaRecord.id} a read already
   *   returned.
   * @returns Whether a row was removed. False means no persona
   *   carried that id.
   */
  deletePersona(id: number): Promise<boolean>;
}
