/**
 * @packageDocumentation
 * The `ConnectorStore` port — every database operation the
 * connectors surface performs, declared as an interface so that the
 * asking is separable from Postgres.
 *
 * THE PORT DECIDES NOTHING, exactly as `src/domains/store.ts`,
 * `src/taxonomy/store.ts`, `src/personas/store.ts`,
 * `src/topics/store.ts` and `src/sources/store.ts` state for their
 * own surfaces. An unknown connector id, a kind and name pair the
 * deployment already carries, a delete refused while export
 * subscriptions still name the row: none of those are facts about
 * Postgres. They are decisions taken about rows, and a decision
 * about rows can be driven by anything that supplies rows. So the
 * isolated suite puts `tests/helpers/memory-research-store.ts`
 * behind this interface and a deployment puts `./db-store.ts`
 * behind it, both answering one contract, and the live suite is
 * left proving only that real Postgres agrees.
 *
 * THIS PORT ANSWERS THE CONFIG AS STORED, AND THE MASKING IS
 * `./service.ts`'s. {@link ConnectorRecord.config} carries what the
 * column holds, credential and all, on every method below that
 * answers a row. `maskConnectorConfig` in `./secrets.ts` is applied
 * one layer up, on the way out of the service, and nothing here
 * calls it.
 *
 * That is the arrangement rather than an omission, and three
 * separate readings want it that way. A port that masked could not
 * be read back from: `tests/live/api-wave2.live.test.ts` compares
 * what a write stored against the raw row, and a port answering the
 * mask would agree with itself while saying nothing about the
 * column. A port that masked would move the rule out from under the
 * boundary the sentinel capture in
 * `tests/api/connector-secret.test.ts` actually watches, which is
 * the assembled service rather than a store. And the pipeline reads
 * this column DIRECTLY — `ar-ingest`'s Select Model Connector node
 * SELECTs `config` out of the `llm` row and hands the endpoint to
 * the call — so the mask is a property of what the HTTP surface
 * ANSWERS and never of what the column holds.
 * `docs/architecture/08-http-api.md` states it for the surface;
 * this file is the layer under that sentence.
 *
 * The cost is stated rather than left to be discovered. Every
 * caller of this port holds a credential in hand, so an
 * implementation must not log a record and no error raised below
 * may carry one, and `./service.ts` is what masks before a
 * response, a refusal detail or a log line can.
 *
 * A CONNECTOR IS DEPLOYMENT-LEVEL RATHER THAN DOMAIN-SCOPED, which
 * is the one structural difference between this port and every
 * other resource port in this service. `connectors` carries no
 * `domain_id` at all — `src/db/schema/sources.ts` argues it at the
 * table: which model endpoint answers, or which notebook an export
 * is handed to, is a fact about the deployment rather than about
 * any one domain's subject matter. So no method below takes a
 * domain, the collection is met at `/connectors` rather than under
 * `/domains/:slug`, and nothing here participates in the cascade
 * that takes a domain's topics, sources and subscriptions with it.
 *
 * Which domain wanted which connector is recorded where it varies:
 * an `export_subscriptions` row pairs a domain and a format with
 * the connector that receives the result. So a connector outlives
 * every domain that named it, and the delete below is refused while
 * any of them still does.
 *
 * EVERY REFUSAL CROSSES THIS PORT AS A `StoreRefusal` — the error
 * `src/db/store-errors.ts` declares — AND AS NOTHING ELSE. A method
 * below either answers or throws that one type: no implementation
 * raises a driver error, a SQLSTATE, a constraint name a caller
 * never chose, or an error class of its own. That is what lets
 * `./service.ts` catch one thing and switch over a closed reason
 * set, and it is why the in-memory implementation has to refuse
 * what Postgres refuses rather than accept it. A fake that admits
 * what the database rejects is a second contract, agreeing right up
 * until the deployment that does not.
 *
 * ONE KEY CAN FIRE ON A WRITE, AND ONE CHECK BESIDE IT. Both are
 * read off the generated SQL rather than off the schema module.
 * `connectors_kind_name_unique` refuses a kind and name pair the
 * deployment already carries, as a `unique-violation`, on INSERT
 * and on UPDATE alike — `name` is patchable, so both writes reach
 * it — and it is the only key a write below can violate. The
 * primary key is on `id`, which is a `bigserial` no input type here
 * carries. `connectors_kind_check` refuses a `kind` outside
 * `CONNECTOR_KINDS`, as a `check-violation`, and only an INSERT can
 * reach it, since `kind` is not patchable per
 * {@link ConnectorPatch}. `SourceStore` declares the same mechanism
 * over `sources_kind_check` and reaches it on BOTH writes rather
 * than on the insert alone, for the reason {@link ConnectorPatch}
 * gives.
 *
 * THE TWO CANNOT BE VIOLATED AT ONCE, so there is no refusal order
 * here and none is claimed — the reading `src/topics/store.ts`
 * offers for its own pair, and it holds here for the same shape of
 * reason. The unique key opens on the very column the CHECK
 * constrains: every stored row's `kind` is inside the tuple,
 * because the CHECK kept it there, so a write proposing a kind
 * outside the tuple can duplicate nothing.
 *
 * THE DELETE IS REFUSED FROM OUTSIDE THE ROW, AND BY EXACTLY ONE
 * KEY. `export_subscriptions_connector_id_connectors_id_fk` emits
 * `ON DELETE no action`, so deleting a connector an export
 * subscription still names is REFUSED rather than cascaded.
 * `src/db/schema/scheduling.ts` argues it at that column: a domain
 * going away takes its own configuration with it, but a connector
 * is shared, and retiring one service should not quietly cancel
 * deliveries in every domain that named it.
 *
 * ONE is re-derived from the generated SQL rather than taken from a
 * plan, because a sibling leg's migration can add a refusing key
 * that plan could not name — which is what happened to `sources`,
 * where a third key landed between the planning and the port.
 * Searching the migrations for a reference to `public.connectors`
 * answers exactly one line at this commit.
 * `source_config_proposals.proposed_by` is the near miss and is not
 * one: it records the `connectors.name` that answered as TEXT
 * rather than as a reference, and says so at the column, so a
 * proposal never refuses a delete.
 *
 * That completeness is what {@link ConnectorDependentCounts} can
 * promise and `SourceDependentCounts` cannot — there, two of three
 * refusing keys are counted and the third arrives unannounced. It
 * is a statement about the SCHEMA and not about a race: a
 * subscription written between the count and the delete is refused
 * by the database whatever the count said, so
 * {@link ConnectorStore.deleteConnector} declares the throw anyway.
 *
 * A CONNECTOR IS MET AT THE ROOT AND WRITTEN BY ITS ID. The
 * collection read takes no owner, because `GET /connectors` has
 * none to take, and every other method takes
 * {@link ConnectorRecord.id}. The natural key is the kind and name
 * pair, so a path naming a name alone would name nothing, and
 * addressing by the pair would put a credential-bearing row behind
 * a two-segment path that a rename moves. `src/domains/store.ts` is
 * the one port here addressed by a natural key, and a slug exists
 * to be that key; a connector's name does not.
 */
import type { StoreWindow } from '../http/schemas.js';

/**
 * One `connectors` row, whole — the four columns the table
 * declares, and no fifth.
 *
 * Whole rather than column-scoped, for the reason `DomainRecord` in
 * `src/domains/store.ts` gives, but NOT for the second half of that
 * reason. There is nothing on `connectors` a reader of this PORT
 * may not have, which is the claim this record makes; whether a
 * reader of the API may have it is a different question, and
 * {@link ConnectorRecord.config} is where the two part company.
 *
 * THERE ARE NO TIMESTAMPS, and their absence is the table's rather
 * than this record's. `connectors` carries no `created_at` and no
 * `updated_at`, so a connector cannot report when its address was
 * last edited and nothing here pretends otherwise. That absence is
 * also what makes an empty patch a decision this port has to take
 * rather than leave to its two implementations; see
 * {@link ConnectorStore.updateConnector}.
 */
export interface ConnectorRecord {
  /** `connectors.id`, and the key every write below takes. */
  readonly id: number;

  /**
   * Which family of service this row fronts — one of
   * `CONNECTOR_KINDS` in `src/db/schema/values.ts`, and what
   * selects the client that talks to the row.
   *
   * `string` rather than the `ConnectorKind` union, which is what a
   * SELECT actually answers: the tuple is a CHECK in the database
   * rather than a union in the type system, so a row written before
   * a member was removed still reads back. `SourceRecord.kind` in
   * `src/sources/store.ts` takes the same view of the same shape of
   * column. The narrowing belongs at the boundary, where
   * `./service.ts` holds a request to the tuple.
   *
   * Half of the row's natural key, and the half the other is scoped
   * to: `connectors_kind_name_unique` is per-kind rather than
   * global, so one name under two kinds is ordinary.
   */
  readonly kind: string;

  /**
   * Which instance of that kind this row is: two model endpoints,
   * or one notebook per environment, are rows of a single kind told
   * apart by this.
   *
   * NOT NULL is not the same as non-empty, and the column enforces
   * only the first. `src/db/schema/sources.ts` argues that an empty
   * name is configuration somebody has not finished — and that it
   * takes the natural key's place and refuses the next row meaning
   * to occupy it — so refusing one is `./service.ts`'s, at the
   * boundary, rather than anything this port can promise.
   */
  readonly name: string;

  /**
   * What a client needs in order to reach this service, AS STORED:
   * its address, and whatever else that kind of client takes.
   *
   * CREDENTIAL AND ALL, which is the module header's central claim
   * expressed as a member. Whatever authenticates the call is held
   * here, `src/db/schema/sources.ts` says so at the column, and
   * this port hands it back unmasked to whoever asked. Masking is
   * `./service.ts`'s, through `maskConnectorConfig` in
   * `./secrets.ts`, and it happens on the way out of THAT layer —
   * so a value read here is a live credential and belongs in no
   * log, no error and no response.
   *
   * `unknown` rather than a shape, for the reason
   * `SourceRecord.parserConfig` carries none: what a config holds
   * is the client's business and differs by
   * {@link ConnectorRecord.kind}, so one interface across the four
   * kinds would describe none of them accurately. Empty is a
   * complete value and the column's default, and for a connector it
   * means there is nowhere to reach — the row names a service the
   * pipeline cannot call rather than one it calls with defaults,
   * which is exactly how `ar-ingest` reads a missing endpoint.
   */
  readonly config: unknown;
}

/**
 * What narrows the collection read: the kind to answer, or nothing.
 *
 * ONE MEMBER, AND IT IS A FILTER RATHER THAN AN ADDRESS. A kind is
 * not a scope the way a `domainId` is on the wave-1 collections —
 * it names no owner and no row is reachable only through it — so
 * omitting it answers every connector rather than none.
 *
 * The parameter itself is REQUIRED on both methods that take it,
 * and only its member is optional. An optional parameter would make
 * an omitted argument mean something an implementation had to
 * decide, which is the port deciding nothing again: the caller says
 * `{}` when it wants everything, and both implementations read one
 * shape.
 *
 * `string` rather than `ConnectorKind`, matching
 * {@link ConnectorRecord.kind} for the same reason. A filter that
 * could only express members of today's tuple could not ask about a
 * row written under a member since removed. `./routes.ts` holds a
 * `?kind` from the wire to `CONNECTOR_KINDS` in its list query
 * schema, before either this port or `./service.ts` sees one, so the
 * narrowing is at the boundary and the port stays as wide as the
 * column.
 */
export interface ConnectorFilter {
  /**
   * Answer only connectors of this kind, or absent for every kind.
   *
   * A kind no row carries is an empty page rather than an error,
   * the same way a window past the end is: nothing failed to read.
   */
  readonly kind?: string;
}

/**
 * What a connector is STILL NAMED BY, per dependent table, as
 * {@link ConnectorStore.countConnectorDependents} counted it.
 *
 * THE ONE REFUSING FOREIGN KEY, and the module header carries why
 * that is the whole set rather than a subset somebody chose. A
 * `409` on `DELETE /connectors/:id` carries this number in its
 * details, so a caller reading the refusal learns what stands in
 * the way rather than only that something did.
 *
 * A record over one member rather than a bare number, deliberately.
 * The refusal detail on this surface is keyed by the table that
 * holds the rows — `DomainDependentCounts` and
 * `SourceDependentCounts` both are — so naming the table here is
 * this port's job and not a string `./service.ts` invents. A second
 * key landing later is then a member rather than a change of shape.
 *
 * A zero is a counted zero, on the same terms those two state: an
 * implementation grouping one query has to fill a missing group in,
 * because a table holding no rows contributes no row to a grouped
 * result.
 *
 * ZERO IS NOT A PROMISE THAT THE DELETE WILL LAND. A subscription
 * written between this count and the delete is refused by the
 * database whatever the count said.
 * {@link ConnectorStore.deleteConnector} declares the refusal for
 * that reason alone, there being no uncounted key here.
 */
export interface ConnectorDependentCounts {
  /** Rows in `export_subscriptions` carrying this `connector_id`. */
  readonly exportSubscriptions: number;
}

/**
 * What {@link ConnectorStore.insertConnector} is handed: a complete
 * connector, minus the id the write stamps.
 *
 * EVERY MEMBER IS REQUIRED, INCLUDING THE ONE THE COLUMN DEFAULTS,
 * and that is the port deciding nothing again — the argument
 * `InsertDomainInput` makes for its `settings` and
 * `InsertSourceInput` for its two jsonb members. A default is a
 * decision about what an omission means, and leaving `config` to
 * the column would make the drizzle implementation quietly right
 * and the in-memory one quietly wrong, since only one of the two
 * has a column to default from. `./service.ts` supplies the empty
 * object where the choice is visible and a test can reach it.
 *
 * THIS IS THE ONE WRITE THAT CAN PROPOSE A `kind`, which is what
 * puts `connectors_kind_check` on the insert alone.
 */
export interface InsertConnectorInput {
  /**
   * Which family of service to front.
   * `connectors_kind_check` refuses one outside `CONNECTOR_KINDS`.
   */
  readonly kind: string;

  /**
   * Which instance of that kind this is.
   * `connectors_kind_name_unique` refuses a pair the deployment
   * already carries.
   */
  readonly name: string;

  /**
   * What a client needs to reach the service. Possibly empty, never
   * absent, and stored as submitted — see
   * {@link ConnectorRecord.config} for what that means for a
   * credential.
   *
   * A record rather than `unknown` on the way IN, unlike the read:
   * the column defaults to an object, so a config that is not one
   * is a value no reader on either side of this port is written
   * for. The read stays `unknown` because a row stored before this
   * port existed need not have obeyed that.
   */
  readonly config: Readonly<Record<string, unknown>>;
}

/**
 * What {@link ConnectorStore.updateConnector} is handed: the
 * members to rewrite, and no others.
 *
 * `name` IS PATCHABLE, which is what puts
 * `connectors_kind_name_unique` on the update as well as on the
 * insert. Nothing outside this table holds a reference a rename
 * would strand — `export_subscriptions` names a connector by id —
 * so a rename changes what the row is called and nothing else.
 *
 * `kind` IS DELIBERATELY ABSENT, which is where this port departs
 * from `SourcePatch` in `src/sources/store.ts`, whose `kind` IS
 * patchable. The two columns look alike and are not. A source's
 * kind selects the adapter that reads that one row, so changing it
 * affects that row and no other. A connector's kind is read by rows
 * and by queries that are not this one, and neither can see the
 * edit:
 *
 * An `export_subscriptions` row names a connector by ID while
 * MEANING one of a particular kind, and the foreign key constrains
 * the id alone — so a kind patch would silently re-point live
 * subscriptions at a service of another family, with nothing
 * refusing it and nothing in either row saying it happened. And
 * `ar-ingest` selects the connector it calls BY KIND (`WHERE kind =
 * 'llm'`), so a kind patch changes which row the pipeline reaches
 * without touching the row it was reading.
 *
 * A connector whose kind is wrong is therefore a different
 * connector: delete it and create the one that was meant, which is
 * an explicit act with a delete guard in front of it. Keeping the
 * column off this type is also what keeps `connectors_kind_check`
 * off the update, so an update raises exactly one mechanism.
 *
 * NEITHER MEMBER DISTINGUISHES THREE REQUESTS. Both columns are NOT
 * NULL, so absent leaves the member alone and a value replaces it,
 * and there is no third request to express — unlike
 * `TopicPatch.minIntervalSeconds`, where `null` clears a bound.
 */
export interface ConnectorPatch {
  /**
   * The new name, or absent to leave it alone.
   * `connectors_kind_name_unique` refuses one already taken under
   * this row's kind.
   */
  readonly name?: string;

  /**
   * The config to store WHOLE, or absent to leave it alone. Never
   * merged into what is already there: a caller sends the object it
   * wants to exist, which is the only shape under which removing a
   * member is expressible at all.
   *
   * The consequence is sharper here than on a domain's `settings`
   * and is stated rather than smoothed over. A patch that omits a
   * secret's key has CLEARED that secret, and the request doing it
   * by accident is byte-identical to the one doing it on purpose.
   * `docs/architecture/08-http-api.md` carries the argument for
   * why a merge would be worse; this port only stores what it is
   * handed.
   */
  readonly config?: Readonly<Record<string, unknown>>;
}

/**
 * Every database operation the connectors surface performs.
 *
 * Seven methods and no escape hatch: there is no `query`, no
 * exposed connection and no transaction handle, so an
 * implementation is substitutable by anything that can hold rows.
 * That closure is what makes the in-memory implementation a genuine
 * second implementation rather than a stub covering the easy calls.
 *
 * Every method is asynchronous, including the ones an in-memory
 * implementation could answer synchronously. The port is shaped by
 * the caller that has to await a database, and a synchronous member
 * would be one drizzle could not satisfy.
 *
 * SIX METHODS AND THE SEVENTH, the same split `SourceStore` reads
 * by. Six are the ordinary resource operations the wave-1 ports
 * also declare — a windowed list, its count, a lookup, an insert, a
 * patch and a delete. The seventh,
 * {@link ConnectorStore.countConnectorDependents}, is the delete
 * guard, and it exists because this table is pointed at.
 *
 * NO METHOD RESOLVES OR DELETES A DOMAIN, and here that is not the
 * division of labour it is on the other resource ports: there is no
 * domain in this group at all. `TopicStore` and `SourceStore` leave
 * `:slug` to `DomainStore.findDomainBySlug` because their
 * collections hang off a domain. This one hangs off the root, so no
 * request reaching it names a domain and no domain delete reaches
 * these rows.
 *
 * NO METHOD READS OR WRITES `export_subscriptions` BEYOND COUNTING,
 * and the absence is structural. The one method that touches that
 * table answers a number; nothing here can read a subscription's
 * columns, re-point one at another connector, or delete one to
 * clear the way for a delete of this row. Cancelling a delivery is
 * `SubscriptionStore`'s, under `/exports`, where the domain that
 * asked for it is the one being edited.
 *
 * NO METHOD CALLS THE SERVICE A ROW DESCRIBES. A connector is an
 * address the pipeline reads at run time; this port stores and
 * answers the address, and never opens a connection to it. There is
 * no reachability probe, no credential check and no health column
 * on this table, so a config naming a service that does not answer
 * is stored exactly like one that does, and the first thing to
 * notice is the run that tried.
 */
export interface ConnectorStore {
  /**
   * Reads one window of the connector list, optionally narrowed to
   * one kind, ordered by {@link ConnectorRecord.kind} ascending
   * with {@link ConnectorRecord.name} ascending beside it.
   *
   * THE ORDER IS PART OF THE CONTRACT, because a window over an
   * unordered read is not a page. Postgres promises nothing about
   * row order without an `ORDER BY`, so two requests for
   * consecutive pages may repeat one row and skip another while
   * every count on the wire still adds up. The pair is what to
   * order on because the pair is UNIQUE: the order is total, so
   * there is no tie-break to forget. Kind first rather than name
   * first, so an unfiltered page reads as the deployment's services
   * grouped by what they are.
   *
   * @param filter - What to narrow to, or `{}` for every
   *   connector. Narrowing here and in
   *   {@link ConnectorStore.countConnectors} is the same question
   *   asked twice, and an implementation answering the two through
   *   different predicates would put a page's `meta.total` at odds
   *   with the page.
   * @param window - `limit` and `offset`, as `toStoreWindow` in
   *   `src/http/schemas.ts` derived them from `?page`/`?perPage`.
   *   The window arrives already validated, so no implementation
   *   re-checks its bounds.
   * @returns The rows in that window, CONFIG UNMASKED, possibly
   *   empty. A window past the end and a kind no row carries are
   *   both an empty list rather than an error: neither is a failure
   *   to read.
   */
  listConnectors(
    filter: ConnectorFilter,
    window: StoreWindow,
  ): Promise<readonly ConnectorRecord[]>;

  /**
   * Counts the connectors the same filter selects, ignoring any
   * window.
   *
   * Separate from {@link ConnectorStore.listConnectors} rather than
   * answered beside it, because the two are different questions: a
   * page's total describes the collection and not the page.
   * Splitting them also keeps the list read free of a window
   * function an in-memory implementation could only imitate.
   *
   * @param filter - The same narrowing the list was read through.
   * @returns How many rows `connectors` holds under it. A kind no
   *   row carries answers `0`, which is correct rather than a
   *   special case.
   */
  countConnectors(filter: ConnectorFilter): Promise<number>;

  /**
   * Looks one connector up by its id. Where every request naming
   * `/connectors/:id` enters — the patch and the delete.
   *
   * @param id - The id as `resourceIdParamSchema` in
   *   `src/http/schemas.ts` parsed it.
   * @returns The row, CONFIG UNMASKED, or null when no connector
   *   carries that id. Null is neither an error nor a refusal: it
   *   is the fact from which the service decides a 404.
   */
  findConnectorById(id: number): Promise<ConnectorRecord | null>;

  /**
   * Inserts one connector.
   *
   * ASSERTS A NEW ROW, AND DOES NOT UPSERT, though the schema
   * describes the natural key as one an upsert lands on. A `POST`
   * is a caller stating that the deployment has no connector of
   * that kind by that name yet, so a duplicate is a 409 rather than
   * a silent rewrite of an address and a credential somebody set.
   * `scripts/seed-apply.ts` writes no connector at all today, so
   * this port is the only writer of the table.
   *
   * @param input - The complete row, minus its id.
   * @returns The stored row, read back rather than reconstructed
   *   from the input, so the id is the database's own and the
   *   defaults are the ones actually stored.
   * @throws A `StoreRefusal` with `reason` `unique-violation` and
   *   `constraint` `connectors_kind_name_unique`, when the
   *   deployment already carries that kind and name pair.
   * @throws A `StoreRefusal` with `reason` `check-violation` and
   *   `constraint` `connectors_kind_check`, when `kind` is outside
   *   `CONNECTOR_KINDS`. This is the only method that can raise it,
   *   `kind` being unpatchable.
   */
  insertConnector(input: InsertConnectorInput): Promise<ConnectorRecord>;

  /**
   * Rewrites the supplied members of one connector.
   *
   * NEVER WRITES `kind`, WHATEVER IT IS HANDED, because
   * {@link ConnectorPatch} declares no member that could carry one.
   * That is the containment stated on that type, expressed as a
   * type rather than as a check an implementation could forget.
   *
   * A PATCH CARRYING NO MEMBER ANSWERS THE STORED ROW WITHOUT
   * WRITING, and this port decides that rather than leaving it to
   * two implementations. `connectors` has no `updated_at`, so an
   * empty patch has literally nothing to set: drizzle throws `No
   * values to set` on an empty update list, while an in-memory
   * implementation would happily answer the row. Left unstated, the
   * two halves of this port would disagree about a call the surface
   * admits. `TopicStore.updateTopic` and `SourceStore.updateSource`
   * carry the same rule for the same reason;
   * `DomainStore.updateDomain` does not, because `domains` has a
   * timestamp to stamp.
   *
   * The edit is visible to the next run that reads the row and to
   * no run already in flight: nothing between this port and the
   * SELECT a pass issues at its own start keeps a copy, so there is
   * no cache to expire and no invalidation path to get wrong. A
   * call already dispatched against the old address completes
   * against it.
   *
   * @param id - The {@link ConnectorRecord.id} a read already
   *   returned.
   * @param patch - The members to rewrite. `config` replaces the
   *   stored document WHOLE and is never merged into it, so a
   *   member left out is cleared.
   * @returns The stored row afterwards, CONFIG UNMASKED, or null
   *   when no row carries that id. Null is reachable even after a
   *   successful read, since the row may go in between, and
   *   answering it rather than throwing leaves what that means to
   *   the caller.
   * @throws A `StoreRefusal` with `reason` `unique-violation` and
   *   `constraint` `connectors_kind_name_unique`, when the
   *   RESULTING name is one the deployment already carries under
   *   this row's kind. This is the only refusal an update raises:
   *   `kind` is not patchable, so no update reaches the CHECK, and
   *   nothing this table points AT can be violated by a rename.
   */
  updateConnector(
    id: number,
    patch: ConnectorPatch,
  ): Promise<ConnectorRecord | null>;

  /**
   * Counts what still names a connector, and takes no view of it.
   *
   * The guard behind `DELETE /connectors/:id`, read before the
   * delete is attempted so that the refusal can say what stands in
   * the way. Whether a non-zero count refuses is `./service.ts`'s,
   * and on this resource it refuses absolutely: there is no
   * `?cascade=confirm` here, because what a cascade would take is
   * other domains' deliveries rather than the configuration the
   * caller was editing.
   *
   * @param id - The {@link ConnectorRecord.id} to count against.
   *   The dependent table carries `connector_id`, so this is the
   *   only key available.
   * @returns The count, present rather than omitted at zero.
   *
   * @remarks
   * An id no connector carries answers zero rather than failing,
   * which is correct rather than a special case: nothing points at
   * a row that is not there. Whether that id should have existed is
   * a question {@link ConnectorStore.findConnectorById} already
   * answered.
   *
   * THE ONE REFUSING KEY IS COUNTED, unlike
   * `SourceStore.countSourceDependents`, which counts two of three.
   * Zero is still not a promise the delete will land: a
   * subscription can be written between this call and the next one.
   */
  countConnectorDependents(id: number): Promise<ConnectorDependentCounts>;

  /**
   * Deletes one connector.
   *
   * NO CASCADE ANYWHERE, which is the opposite of what
   * `DomainStore.deleteDomain` does and is the schema's decision
   * rather than this method's. The one foreign key onto
   * `connectors.id` emits `ON DELETE no action`, so this either
   * removes a row nothing references or is refused; it never takes
   * a second row with it.
   *
   * The guard above is what makes the refusal legible, and this
   * method is what makes it true. A service that only consulted the
   * count would be enforcing a convention; the database refuses
   * whoever asks, this port included.
   *
   * @param id - The {@link ConnectorRecord.id} a read already
   *   returned.
   * @returns Whether a row was removed. False means no connector
   *   carried that id.
   * @throws A `StoreRefusal` with `reason` `foreign-key-violation`
   *   and `constraint`
   *   `export_subscriptions_connector_id_connectors_id_fk`, while
   *   any export subscription still names this connector. The
   *   service reads the count off
   *   {@link ConnectorStore.countConnectorDependents} before
   *   calling, so this arrives only when a subscription was written
   *   in between.
   */
  deleteConnector(id: number): Promise<boolean>;
}
