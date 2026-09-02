/**
 * @packageDocumentation
 * The `SettingsStore` port — every database operation the operator
 * settings surface performs, declared as an interface so that the
 * asking is separable from Postgres.
 *
 * THE PORT DECIDES NOTHING, exactly as `src/domains/store.ts`,
 * `src/taxonomy/store.ts` and `src/personas/store.ts` state for their
 * own surfaces. What a missing row means to a reader, whether a
 * `defaultDomainSlug` names a domain that exists, which payload may
 * replace which: none of those are facts about Postgres. They are
 * decisions taken about rows, and a decision about rows can be driven
 * by anything that supplies rows. So the isolated suite puts
 * `tests/helpers/memory-research-store.ts` behind this interface and
 * a deployment puts `./db-store.ts` behind it, both answering one
 * contract, and the live suite is left proving only that real
 * Postgres agrees.
 *
 * AN ABSENT ROW AND AN EMPTY PAYLOAD ARE THE SAME STATE — the
 * defaults apply, and there is nothing an operator must create before
 * they can configure something. That is the argument
 * `src/db/schema/settings.ts` already makes for the column's `{}`
 * default, and it is why a read before any write is answered `{}`
 * rather than 404.
 *
 * THIS PORT STILL REPORTS WHICH OF THE TWO THE DATABASE IS IN, and
 * the distinction is not a contradiction of the rule above but an
 * instance of it. Whether a row exists is a fact; treating the two as
 * one state is a decision. So {@link SettingsStore.readSettings}
 * answers null for a table with no row, and `./service.ts` is the
 * single place both become `{}`. Collapsing them here instead would
 * move the one reading decision this surface takes into the half that
 * needs a database to exercise, which is the arrangement the
 * port-decides-nothing rule exists to avoid — and it would leave
 * nothing able to tell a never-configured deployment from a
 * configured-to-nothing one, which a diagnostic or a live case may
 * legitimately want to ask.
 *
 * THE SINGLETON IS THE DATABASE'S OWN CHECK, NOT A CONVENTION THIS
 * PORT HOLDS. `operator_settings_singleton_check` pins `id` to 1
 * (measured on the live Postgres, where `pg_get_constraintdef`
 * renders it `CHECK ((id = 1))`), and this port's shape FOLLOWS from
 * that rather than restating it. No method below takes an id, there
 * is no count, no list and no delete, so a second configuration is
 * not something an implementation has to remember not to write — it
 * is something this interface cannot express. A port that held the
 * rule as a convention would need every implementation to keep it,
 * and the one that forgot would leave two valid rows whose precedence
 * depends on an `ORDER BY` nobody wrote.
 *
 * NO REFUSAL IS REACHABLE THROUGH THIS PORT, which is the substantive
 * difference from every sibling port and the reason no method
 * below documents a `StoreRefusal` — the error
 * `src/db/store-errors.ts` declares. The table carries exactly two
 * mechanisms and neither can fire from here, measured against the
 * live Postgres with a positive control in the same transaction. A
 * second insert at the singleton id is 23505 naming
 * `operator_settings_pkey` (Postgres's own derivation, and the one
 * constraint name here that no file in this repository spells), and
 * any id but 1 is 23514 naming the singleton CHECK — on a plain
 * INSERT and through an `ON CONFLICT` alike, because the row is
 * formed before the conflict arbiter is consulted. But
 * {@link SettingsStore.writeSettings} spells the id from
 * `OPERATOR_SETTINGS_ID` rather than from anything a request
 * supplies, and absorbs the conflict by upserting on it, so no caller
 * can reach either. The CHECK guards hand-written SQL and a writer
 * nobody has written yet; it is precisely because this port cannot be
 * where the singleton lives that the database is.
 *
 * The control that makes those two zeros discriminating rather than
 * dead: the same transaction ran the upsert twice and left ONE row
 * carrying the second payload, and rolled back to zero rows
 * afterwards.
 *
 * NO FOREIGN KEY REACHES THE PAYLOAD, and one member reads as though
 * one should. `defaultDomainSlug` names a `domains.slug`, but it sits
 * inside a JSONB column where no constraint reaches, so the app layer
 * is the whole of the enforcement and it checks the slug on the way
 * IN — through `DomainStore.findDomainBySlug` in
 * `src/domains/store.ts`, before anything here is called. NO METHOD
 * BELOW RESOLVES A DOMAIN. A slug left dangling by a later domain
 * delete is not corruption and nothing here repairs it;
 * `src/db/schema/settings.ts` carries why it reads as no default
 * being set.
 *
 * THERE IS NO ID BURN AND NO SEQUENCE, which is where an in-memory
 * implementation of this port departs from its siblings rather than
 * copying them. `operator_settings.id` is `integer` with no default
 * (measured off `information_schema.columns`), so nothing hands out a
 * value and a refused write cannot leave a gap. The counter fidelity
 * every other wave-1 fake owes — advancing ahead of every check,
 * because a `bigserial` is read while the row is formed and a
 * sequence does not roll back — has no subject here at all.
 *
 * NO TIMESTAMP CROSSES THIS PORT. `created_at` and `updated_at` are
 * on the table and are an implementation's to maintain, but nothing
 * on this surface answers when the deployment was configured, so
 * there is no record type here and the payload IS what a read and a
 * write deal in. {@link OperatorSettings} is imported rather than
 * restated, from the module that declares it beside the column it
 * types. Measured with a type-level probe: that interface and the
 * column's inferred type are identical in both assignability
 * directions, so an implementation over drizzle may hand a selected
 * row's `settings` straight through with no narrowing — unlike
 * `terms.polarity` in `src/taxonomy/store.ts`, whose
 * CHECK-constrained `text` column infers wider than the record member
 * it backs.
 */
import type { OperatorSettings } from '../db/schema/settings.js';

/**
 * Every database operation the operator settings surface performs.
 *
 * Two methods and no escape hatch: there is no `query`, no exposed
 * connection and no transaction handle, so an implementation is
 * substitutable by anything that can hold one payload. That closure
 * is what makes the in-memory implementation a genuine second
 * implementation rather than a stub covering the easy calls.
 *
 * Both methods are asynchronous, including ones an in-memory
 * implementation could answer synchronously. The port is shaped by
 * the caller that has to await a database, and a synchronous member
 * would be one drizzle could not satisfy.
 *
 * NEITHER METHOD TAKES A KEY, per the singleton rule in the module
 * header. There is one row, its id is the database's business, and a
 * parameter naming it would be an invitation to pass something else.
 */
export interface SettingsStore {
  /**
   * Reads the operator's configuration.
   *
   * @returns The stored payload, or null when the table holds no row
   *   yet. Null is neither an error nor a refusal: it is the fact
   *   from which `./service.ts` answers `{}`, and the module header
   *   carries why the collapse belongs there rather than here. An
   *   empty object is a DIFFERENT answer and means a row was written
   *   carrying no members — the same state as far as any reader of
   *   the configuration is concerned, and a distinguishable one to
   *   anything asking whether this deployment has ever been
   *   configured.
   * @throws Nothing. There is no key to get wrong and no constraint a
   *   read can reach, so this method has no failure of its own to
   *   report.
   */
  readSettings(): Promise<OperatorSettings | null>;

  /**
   * Writes the operator's configuration.
   *
   * A FIRST WRITE AND A REWRITE ARE ONE CALL. The caller does not ask
   * whether the row exists and does not branch on the answer, which
   * is what keeps `PUT /settings` a single request rather than a read
   * followed by a create-or-update the caller has to sequence. An
   * implementation over drizzle satisfies it in one statement, by
   * upserting on the singleton id; an in-memory one satisfies it by
   * holding one payload.
   *
   * THE PAYLOAD IS WRITTEN AS A WHOLE UNIT AND IS NEVER MERGED INTO
   * THE STORED ONE. A member absent from `settings` is absent from
   * the stored payload afterwards, which is the only way a member is
   * cleared: were this a merge, the request that omits a preference
   * and the request that removes it would be the same bytes and
   * removal would be unexpressible. The same rule
   * `DomainStore.updateDomain` in `src/domains/store.ts` states for
   * `domains.settings`, and it is why the route is a `PUT` rather
   * than a `PATCH` — on a domain, `settings` is one member of a
   * larger patch, so omitting the member and omitting a key inside it
   * are two different requests; here the payload IS the request and
   * there is no third state to express.
   *
   * @param settings - The complete configuration to store. Not an
   *   input type of its own, unlike `InsertPersonaInput` in
   *   `src/personas/store.ts`: there is no id to omit and no member
   *   the write does not supply, so the payload and the argument are
   *   the same shape.
   * @returns The stored payload, read back rather than echoed from
   *   the argument, so a caller sees what the database actually
   *   holds.
   * @throws Nothing. The module header carries the measurement: the
   *   table's two mechanisms exist and were seen firing, and neither
   *   is reachable from a port that writes one id it chose itself. A
   *   `StoreRefusal` out of an implementation of this method would be
   *   a fault rather than a rule.
   */
  writeSettings(settings: OperatorSettings): Promise<OperatorSettings>;
}
