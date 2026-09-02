/**
 * @packageDocumentation
 * The `SubscriptionStore` port — every database operation the export
 * subscriptions surface performs, declared as an interface so that
 * the asking is separable from Postgres.
 *
 * THIS DIRECTORY IS NAMED FOR THE TABLE AND NOT FOR THE PATH IT
 * ANSWERS UNDER. The table is `export_subscriptions`, the routes are
 * `GET /domains/:slug/exports` and its four siblings, and the
 * directory is `src/subscriptions/`. Three names for one group, and
 * the third is the only one that was free to choose.
 *
 * `src/exports/` BESIDE IT IS THE RENDERER REGISTRY, which is what
 * that third name had to avoid. That file declares `ExportRenderer`
 * and `ExportArtifact` — what turns a domain's findings into bytes,
 * with the registry phase 6 fills — and a subscription is not a
 * renderer. A subscription is a standing request that a renderer be
 * run: this format, to that connector, this often. It NAMES a
 * renderer, the way a `sources` row names an adapter through its
 * `kind`, and calling the selector and the selected one word would
 * leave a reader of `src/exports/` to guess which had been meant.
 *
 * `src/sources/` IS THE SAME QUESTION ANSWERED THE OTHER WAY, and
 * says so in its own header. There the HTTP half landed BESIDE the
 * adapter contract, in one directory named for the table, because
 * the directory was already the table's. Here it could not:
 * `src/exports/` is named for the renderers rather than for
 * `export_subscriptions`, so the HTTP half took a directory of its
 * own. Two splits and one rule — a directory is named for what is in
 * it — and the wire-path table in `docs/architecture/08-http-api.md`
 * is where a reader learns both, rather than from a directory
 * listing that reads like a misfile.
 *
 * THE PORT DECIDES NOTHING, exactly as `src/domains/store.ts`,
 * `src/taxonomy/store.ts`, `src/personas/store.ts`,
 * `src/topics/store.ts`, `src/sources/store.ts` and
 * `src/connectors/store.ts` state for their own surfaces. An unknown
 * domain slug, an unknown subscription id, a triple the domain
 * already subscribes to, a run-now against a subscription whose
 * `enabled` is false: none of those are facts about Postgres. They
 * are decisions taken about rows, and a decision about rows can be
 * driven by anything that supplies rows. So the isolated suite puts
 * `tests/helpers/memory-research-store.ts` behind this interface and
 * a deployment puts `./db-store.ts` behind it, both answering one
 * contract, and the live suite is left proving only that real
 * Postgres agrees.
 *
 * THE SCHEDULE VERB IS THE CLEAREST CASE HERE, as it is on
 * `TopicStore`. {@link SubscriptionStore.updateSubscriptionSchedule}
 * writes the instant it is handed and takes no view of it. Whether a
 * disabled row may be run now is decided one layer up in
 * `./service.ts`, where the request that asked for it is legible,
 * and the clock that instant comes from is injected there so a test
 * can fix it. A store refusing a disabled row on its own would move
 * a rule into the half of the module that cannot be exercised
 * without a database, which is the arrangement this file exists to
 * avoid.
 *
 * EVERY REFUSAL CROSSES THIS PORT AS A `StoreRefusal` — the error
 * `src/db/store-errors.ts` declares — AND AS NOTHING ELSE. A method
 * below either answers or throws that one type: no implementation
 * raises a driver error, a SQLSTATE, a constraint name a caller
 * never chose, or an error class of its own. That is what lets
 * `./service.ts` catch one thing and switch over a closed reason
 * set, and it is why the in-memory implementation has to refuse what
 * Postgres refuses rather than accept it. A fake that admits what
 * the database rejects is a second contract, agreeing right up until
 * the deployment that does not.
 *
 * THE NATURAL KEY IS THE DOMAIN, THE FORMAT AND THE CONNECTOR
 * TOGETHER, and all three are load-bearing.
 * `export_subscriptions_domain_id_format_connector_id_unique` is
 * declared over the triple because no PAIR of the three identifies a
 * subscription: one domain may want the same digest in two formats,
 * and may want one format delivered to two destinations. Both are
 * ordinary, and a key over either pair would refuse the second row.
 * `src/db/schema/scheduling.ts` argues it at the constraint.
 *
 * Two consequences here. There is no name column and no slug — what
 * a subscription IS is the triple — so a row is addressed by
 * {@link SubscriptionRecord.id} and by nothing else, and
 * `ar-dispatch` labels a claimed row with its FORMAT while saying at
 * the query that the label does not identify it. And TWO of the
 * triple's three parts are patchable, per {@link SubscriptionPatch},
 * so this key is reachable on an UPDATE as well as on an INSERT.
 *
 * FOUR MECHANISMS CAN FIRE HERE AND NO OTHERS, read off the
 * generated SQL rather than off the schema module. The unique key
 * above refuses a triple the domain already subscribes to, as a
 * `unique-violation`, on INSERT and on UPDATE alike.
 * `export_subscriptions_format_check` refuses a `format` outside
 * `EXPORT_FORMATS`, as a `check-violation`, on both writes too,
 * `format` being patchable — where `ConnectorStore` reaches its own
 * CHECK on the insert alone, `connectors.kind` being unpatchable for
 * the reason that port gives.
 * `export_subscriptions_domain_id_domains_id_fk` refuses a
 * `domainId` naming no domain, as a `foreign-key-violation`, and
 * only an INSERT can reach it, since `domainId` is not patchable.
 * The fourth is the one worth reading carefully.
 *
 * `export_subscriptions_connector_id_connectors_id_fk` REFUSES A
 * CONNECTOR DELETE RATHER THAN THIS TABLE'S WRITE, which is the
 * opposite of the direction a foreign key is usually read in. It
 * emits `ON DELETE no action`, so deleting a connector an export
 * subscription still names is REFUSED, and that refusal is
 * `ConnectorStore.deleteConnector`'s — counted in advance by
 * `ConnectorStore.countConnectorDependents`, whose one member counts
 * exactly these rows. `src/db/schema/scheduling.ts` argues it at the
 * column: a domain going away takes its own configuration with it,
 * but a connector is deployment-level and shared, and retiring one
 * service should not quietly cancel deliveries in every domain that
 * named it. The refusal is what makes re-pointing or cancelling
 * those subscriptions the explicit step it is — and re-pointing is
 * {@link SubscriptionPatch.connectorId}, here, where the domain that
 * asked for the delivery is the one being edited.
 *
 * On THIS port's writes that same key is a race and nothing more.
 * `./service.ts` resolves the connector before an insert and before
 * a patch that re-points one, and answers `422` when it names no
 * row, so the database is handed a live id by every ordinary
 * request. What is left is the connector deleted between that read
 * and this write, and the two write methods below declare the throw
 * for that alone — exactly as `TopicStore.insertTopic` declares
 * `topics_domain_id_domains_id_fk`. A port promising that this
 * table's write can never reach the key would be promising what the
 * database does not.
 *
 * NOTHING POINTS AT `export_subscriptions`, so no method below can
 * be refused on the way out. Searching the migrations for a
 * reference to `public.export_subscriptions` answers nothing at this
 * commit, which is why there is no dependent count beside
 * {@link SubscriptionStore.deleteSubscription} and no guard for a
 * service to read. `briefings` is the near miss and is not one:
 * `src/db/schema/runs.ts` states that no foreign key runs between
 * the two, the tables answering different questions — a subscription
 * is what a domain wants delivered and how often, a briefing is what
 * was produced — so a rendered digest outlives the subscription that
 * asked for it, as stored text rather than as a reference. The loss
 * `DomainStore.countDomainDependents` warns about is the DOMAIN's,
 * and a subscription goes with its domain through the `ON DELETE
 * CASCADE` on `export_subscriptions.domain_id` rather than through
 * anything here.
 *
 * A SUBSCRIPTION IS MET IN ITS DOMAIN AND WRITTEN BY ITS ID. The
 * collection read takes a `domainId`, because
 * `GET /domains/:slug/exports` is where the group is addressed from
 * and `DomainStore.findDomainBySlug` in `src/domains/store.ts`
 * resolved that slug before anything here was called. Every other
 * method takes {@link SubscriptionRecord.id}, because
 * `PATCH /exports/:id`, `DELETE /exports/:id` and
 * `POST /exports/:id/run-now` name no domain at all. That split is
 * why {@link SubscriptionRecord.domainId} is on the record: it is
 * the only thing saying whose delivery an addressed row is, for a
 * rule or a log line that has to know.
 *
 * ONE METHOD MAY WRITE `next_run_at`, AND IT IS THE ONLY THING THAT
 * METHOD WRITES.
 * {@link SubscriptionStore.updateSubscriptionSchedule} exists so
 * that the column has exactly one door on this port, and
 * {@link SubscriptionPatch} is declared without it so there is no
 * second one. The containment is structural rather than
 * conventional: `nextRunAt` appears on {@link SubscriptionRecord},
 * which is a read, and as the sole parameter of that one method, and
 * on no input type at all — so a create lands unscheduled and no
 * other write on this port can reach the column whatever it is
 * handed.
 *
 * Two mechanisms hold that rule and both are wanted. `nextRunAt` is
 * refused as an unrecognized key by the create and patch schemas in
 * `./service.ts`, which is what a caller meets; the single-purpose
 * method here is what a future route meets, because a port offering
 * exactly one schedule writer cannot grow a second one by accident.
 * `docs/architecture/08-http-api.md` carries the rule for the
 * surface; this file is its shape.
 *
 * The one door has ONE caller where `TopicStore`'s has two.
 * `POST /exports/:id/run-now` is this group's whole access to the
 * column: there is no `POST /exports/:id/pause`, so `pauseFrom` in
 * `src/lib/schedule.ts` is not reached from here and the two bounds
 * on the record below are read by the dispatcher's own reschedule
 * alone. A pause verb landing later is a second CALLER of this one
 * method rather than a second writer of the column, which is the
 * property the single door was declared for.
 */
import type { StoreWindow } from '../http/schemas.js';

/**
 * One `export_subscriptions` row, whole — its id, the three columns
 * the table declares for itself, and the five `schedulableColumns()`
 * spreads into it.
 *
 * Whole rather than column-scoped, for the reason `DomainRecord` in
 * `src/domains/store.ts` gives: this record IS the resource the
 * route group answers with, and there is nothing on
 * `export_subscriptions` a reader of the API may not have. The
 * credential that reaches the destination is not here — it is on the
 * `connectors` row this one names, which is exactly why an address
 * is stored once per deployment rather than once per subscription —
 * so this record needs no mask, and `ConnectorRecord.config`'s whole
 * argument belongs to that port rather than to this one.
 *
 * THE SCHEDULABLE SET IS ON THE RECORD IN FULL, which is not the
 * same as being writable in full.
 * {@link SubscriptionRecord.nextRunAt} is answered on every read and
 * reachable by exactly one write, per
 * {@link SubscriptionStore.updateSubscriptionSchedule}: that is the
 * pipeline-owned-column rule `docs/architecture/08-http-api.md`
 * states, applied to the one column on this table the pipeline
 * writes. A due time nobody can read is a schedule nobody can act
 * on, so answering it matters as much as refusing it on the way in.
 *
 * {@link SubscriptionRecord.minIntervalSeconds} and
 * {@link SubscriptionRecord.maxIntervalSeconds} together
 * structurally satisfy `IntervalBounds` in `src/lib/schedule.ts`,
 * which is named for the columns rather than for the sides precisely
 * so that a row satisfies it as it stands. Nothing on this surface
 * hands one to `pauseFrom` today, there being no pause verb under
 * `/exports`; the shape is `TopicRecord`'s because the columns are
 * the same helper's, so a bound renamed here would redden that call
 * the day a pause lands rather than silently drop a bound.
 *
 * THERE ARE NO TIMESTAMPS, and their absence is the table's rather
 * than this record's. `export_subscriptions` carries no `created_at`
 * and no `updated_at`, so a subscription cannot report when its
 * cadence was last edited and nothing here pretends otherwise. That
 * absence is also what makes an empty patch a decision this port has
 * to take rather than leave to its two implementations; see
 * {@link SubscriptionStore.updateSubscription}.
 */
export interface SubscriptionRecord {
  /** `export_subscriptions.id`, the key every write takes. */
  readonly id: number;

  /**
   * The domain whose material this subscription exports. One third
   * of the row's natural key, and read by the one rule a path
   * cannot express: `PATCH /exports/:id` names no domain, so this is
   * what says whose delivery the addressed row is.
   */
  readonly domainId: number;

  /**
   * What this subscription renders — one of `EXPORT_FORMATS` in
   * `src/db/schema/values.ts`, and what selects the renderer in
   * `src/exports/`, the way a source's `kind` selects an adapter.
   *
   * `string` rather than the `ExportFormat` union, which is what a
   * SELECT actually answers: the tuple is a CHECK in the database
   * rather than a union in the type system, so a row written before
   * a member was removed still reads back. `ConnectorRecord.kind`
   * and `SourceRecord.kind` take the same view of the same shape of
   * column. The narrowing belongs at the boundary, where
   * `./service.ts` holds a request to the tuple.
   *
   * The second third of the natural key, and the closest thing this
   * table has to a name: `ar-dispatch` labels a claimed row with it
   * and says at the query that the label does not identify the row,
   * two destinations under one format being ordinary.
   */
  readonly format: string;

  /**
   * Where the rendered artifact is handed over: the `connectors` row
   * that receives it, and the last third of the natural key.
   *
   * An id rather than an address, which is the point of the pairing.
   * A destination is deployment-level and lives once, on the
   * connector row; moving it is an UPDATE there and every
   * subscription naming it follows. So this column is a reference
   * and never a copy, and no credential is stored twice.
   *
   * `export_subscriptions_connector_id_connectors_id_fk` constrains
   * it, in the direction the module header sets out: it refuses the
   * CONNECTOR's delete, and reaches this table's own write only in
   * the race where that row goes away mid-request.
   */
  readonly connectorId: number;

  /**
   * How long to wait between deliveries, in seconds. NOT NULL: a
   * schedulable row saying nothing about how often is one the
   * dispatcher cannot reschedule after running it.
   */
  readonly intervalSeconds: number;

  /**
   * When this subscription is next due to render, or null when it is
   * not scheduled at all.
   *
   * NULL IS A STATE AND NOT AN ABSENCE. The dispatch claim reads
   * `WHERE enabled AND next_run_at <= now()`, so a null row is never
   * claimed whatever its interval says. A create lands here, no
   * input type on this port carrying the column, and
   * `POST /exports/:id/run-now` is the only route that moves it.
   */
  readonly nextRunAt: Date | null;

  /**
   * Whether this subscription takes part in scheduling at all.
   * Defaults true at the column, because a schedulable row exists in
   * order to be run.
   *
   * Operator-owned and patchable, unlike a source's `flagged`. False
   * excludes the row from `export_subscriptions_dispatch_claim_idx`,
   * which is the partial index the claim walks, so a run-now against
   * a disabled subscription would write a due time nothing ever
   * reads — a silent no-op the caller could not see, and the reason
   * `./service.ts` answers `409` instead.
   *
   * DISABLING IS NOT CANCELLING, which the schema states at that
   * index: the row keeps its format, its destination and its
   * cadence, and cancelling is
   * {@link SubscriptionStore.deleteSubscription}.
   */
  readonly enabled: boolean;

  /**
   * The shortest interval this subscription may be delivered at, in
   * seconds, or null for no floor. Not an enforcement boundary and
   * no CHECK relates it to anything: what reads it is the
   * dispatcher's own reschedule, which clamps the interval it adds
   * with `LEAST(max_interval_seconds,
   * GREATEST(min_interval_seconds, interval_seconds))`.
   */
  readonly minIntervalSeconds: number | null;

  /**
   * The longest it may go between deliveries, in seconds, or null
   * for no ceiling. The other half of the clamp
   * `clampIntervalSeconds` in `src/lib/schedule.ts` writes in
   * TypeScript and `ar-dispatch` writes as that SQL expression;
   * bounds that cross resolve to this one, per that function's
   * contract.
   */
  readonly maxIntervalSeconds: number | null;
}

/**
 * What {@link SubscriptionStore.insertSubscription} is handed: a
 * complete subscription, minus the id the write stamps and minus the
 * due time no input on this port carries.
 *
 * EVERY MEMBER IS REQUIRED, INCLUDING THE ONE THE COLUMN DEFAULTS,
 * and that is the port deciding nothing again — the argument
 * `InsertDomainInput` makes for its `settings`, `InsertTopicInput`
 * for its `searchTerms` and `enabled`, and `InsertConnectorInput`
 * for its `config`. A default is a decision about what an omission
 * means, and leaving `enabled` to the column would make the drizzle
 * implementation quietly right and the in-memory one quietly wrong,
 * since only one of the two has a column to default from.
 * `./service.ts` supplies the `true` where the choice is visible and
 * a test can reach it.
 *
 * `nextRunAt` IS ABSENT, so a subscription is INSERTED UNSCHEDULED
 * and there is no way to create one that is already due. Scheduling
 * it is a second, separate act through
 * {@link SubscriptionStore.updateSubscriptionSchedule}, which is
 * what makes the one-writer rule structural rather than a convention
 * two implementations could drift on. The cost is stated rather than
 * hidden: a subscription created and never run-now'd sits at null
 * forever and delivers nothing, and
 * `docs/architecture/08-http-api.md` is where the surface says so.
 *
 * THIS IS THE ONLY WRITE THAT CAN PROPOSE A `domainId`, which is
 * what puts `export_subscriptions_domain_id_domains_id_fk` on the
 * insert alone. Both of the other two thirds of the natural key are
 * patchable, so the unique key, the format CHECK and the connector
 * foreign key all reach the update as well.
 */
export interface InsertSubscriptionInput {
  /**
   * The domain this subscription exports, as
   * `DomainStore.findDomainBySlug` in `src/domains/store.ts` already
   * resolved it from the `:slug` in the path.
   */
  readonly domainId: number;

  /**
   * What to render. `export_subscriptions_format_check` refuses one
   * outside `EXPORT_FORMATS`.
   */
  readonly format: string;

  /**
   * Which connector receives the artifact.
   * `export_subscriptions_connector_id_connectors_id_fk` refuses one
   * naming no connector, which the service has already read for.
   */
  readonly connectorId: number;

  /** How often to deliver, in seconds. */
  readonly intervalSeconds: number;

  /**
   * Whether the subscription takes part in scheduling from the
   * outset.
   */
  readonly enabled: boolean;

  /** The floor on the interval, or null for none. */
  readonly minIntervalSeconds: number | null;

  /** The ceiling on the interval, or null for none. */
  readonly maxIntervalSeconds: number | null;
}

/**
 * What {@link SubscriptionStore.updateSubscription} is handed: the
 * members to rewrite, and no others.
 *
 * TWO THIRDS OF THE NATURAL KEY ARE PATCHABLE, which is what puts
 * `export_subscriptions_domain_id_format_connector_id_unique` on the
 * update as well as on the insert, and the format CHECK with it.
 * Both are edits somebody means: changing what a domain receives, or
 * where it is delivered, without cancelling the delivery and
 * starting it again on a fresh schedule.
 *
 * `format` IS PATCHABLE FOR THE REASON `SourcePatch.kind` IS and
 * `ConnectorPatch.kind` IS NOT. It selects the renderer that runs
 * for THIS row and nothing outside the row reads it: no other table
 * records a format, and no pipeline query selects a subscription by
 * one. So a format patch reaches exactly what it names.
 *
 * `connectorId` IS PATCHABLE BECAUSE THE SCHEMA ASKS FOR IT. The
 * `ON DELETE no action` on that foreign key exists, in the words of
 * `src/db/schema/scheduling.ts`, to make re-pointing or cancelling a
 * subscription the explicit step it is — and re-pointing is this
 * member. A surface refusing it would leave the refused connector
 * delete with only one answer, cancelling, which is not what a
 * deployment moving a destination between services means.
 *
 * `domainId` is deliberately absent, so a subscription cannot be
 * moved between domains, on the reasoning `TopicPatch` gives for the
 * same column: a subscription is a request ABOUT the material its
 * domain produces, and a move would carry it to another domain's.
 * Its absence is also what keeps
 * `export_subscriptions_domain_id_domains_id_fk` off
 * {@link SubscriptionStore.updateSubscription}.
 *
 * `nextRunAt` is deliberately absent, per the module header: this is
 * the type whose shape makes the one-writer rule structural, and a
 * member added here would defeat it silently while every schema in
 * `./service.ts` still refused the key on the wire.
 *
 * THE TWO BOUNDS DISTINGUISH THREE REQUESTS rather than two, the way
 * `TopicPatch` and `CategoryPatch.parentId` do. Absent leaves the
 * bound alone; a number sets it; `null` clears it, which is the only
 * way to remove a floor or a ceiling and would be unexpressible if
 * absent and null meant the same thing. The other four members are
 * NOT NULL columns and so distinguish only two.
 */
export interface SubscriptionPatch {
  /**
   * The format to render instead, or absent to leave it alone.
   * `export_subscriptions_format_check` refuses one outside
   * `EXPORT_FORMATS`, and the unique key refuses a resulting triple
   * the domain already subscribes to.
   */
  readonly format?: string;

  /**
   * The connector to deliver to instead, or absent to leave it
   * alone. The re-pointing the connector delete's refusal exists to
   * make explicit.
   */
  readonly connectorId?: number;

  /** The new cadence in seconds, or absent to leave it alone. */
  readonly intervalSeconds?: number;

  /**
   * Whether to take part in scheduling, or absent to leave it alone.
   * This is the column for suspending a delivery; cancelling it is
   * {@link SubscriptionStore.deleteSubscription}, and a run-now is
   * neither.
   */
  readonly enabled?: boolean;

  /**
   * The new floor, `null` to remove it, or absent to leave it alone.
   */
  readonly minIntervalSeconds?: number | null;

  /**
   * The new ceiling, `null` to remove it, or absent to leave it
   * alone.
   */
  readonly maxIntervalSeconds?: number | null;
}

/**
 * Every database operation the export subscriptions surface
 * performs.
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
 * SIX METHODS AND THE SEVENTH, which is the split worth reading this
 * interface by, and it is `TopicStore`'s split rather than
 * `ConnectorStore`'s. Six are the ordinary resource operations the
 * wave-1 ports also declare — a windowed list, its count, a lookup,
 * an insert, a patch and a delete. The seventh,
 * {@link SubscriptionStore.updateSubscriptionSchedule}, exists only
 * so that `next_run_at` has one door. There is no dependent count
 * here, because nothing points at this table.
 *
 * NO METHOD RESOLVES A DOMAIN, AND NONE DELETES ONE. `:slug` becomes
 * a domain row through `DomainStore.findDomainBySlug` in
 * `src/domains/store.ts` before anything here is called, and the
 * cascade that takes a domain's subscriptions with it belongs to
 * `DomainStore.deleteDomain` and to the `ON DELETE CASCADE` behind
 * `export_subscriptions.domain_id`. One in-memory implementation
 * stands behind both ports over one dataset, which is what keeps a
 * domain deleted in one of them deleted in the other.
 *
 * NO METHOD READS OR WRITES `connectors`, and the absence is the
 * mirror of the one `ConnectorStore` declares. That port can count
 * these rows and can read no column of one; this one names a
 * connector by id and can read no column of THAT. So resolving a
 * `connectorId` before a write is `./service.ts`'s, over
 * `ConnectorStore.findConnectorById`, where both ports are in hand
 * and neither has grown a reader into the other's table.
 *
 * NO METHOD RENDERS ANYTHING, AND NONE DELIVERS. A row here is a
 * standing request; `src/exports/` holds the renderers that answer
 * it and `ar-digest` is what will run them. The send-free rule
 * `docs/architecture/00-overview.md` states applies to this port
 * trivially, there being no member that could reach a connector's
 * address at all.
 *
 * NO METHOD CLAIMS A ROW, OPENS A `runs` ROW OR INVOKES A WORKFLOW,
 * and the absence is the design rather than an omission.
 * `ar-dispatch` holds the only schedule trigger in the system: it
 * wakes on its own cron, takes what has come due with `FOR UPDATE
 * SKIP LOCKED` and dispatches it. Everything this port can do to a
 * schedule is move one timestamp, so a run-now is a request for the
 * next tick to pick the row up rather than a second trigger racing
 * the first for the same row.
 * `tests/invariants/api-schedule-containment.test.ts` is what makes
 * that a property of the tree rather than a sentence here.
 */
export interface SubscriptionStore {
  /**
   * Reads one window of a domain's export subscriptions, ordered by
   * {@link SubscriptionRecord.format} ascending with
   * {@link SubscriptionRecord.connectorId} ascending beside it.
   *
   * THE ORDER IS PART OF THE CONTRACT, because a window over an
   * unordered read is not a page. Postgres promises nothing about
   * row order without an `ORDER BY`, so two requests for consecutive
   * pages may repeat one row and skip another while every count on
   * the wire still adds up. The pair is what to order on because the
   * pair is UNIQUE within one domain — it is what the natural key
   * has left once the domain is fixed — so the order is total and
   * there is no tie-break to forget.
   *
   * Ordered by the format first, so a page reads as what the domain
   * receives, grouped by what it gets rather than by where it goes.
   * Not by {@link SubscriptionRecord.nextRunAt}, for the reason
   * `TopicStore.listTopics` gives: a due time is nullable and
   * non-unique, and it MOVES, so a page over it is a page over a
   * collection that reorders underneath it.
   *
   * @param domainId - The domain whose subscriptions to read, as
   *   `DomainStore.findDomainBySlug` in `src/domains/store.ts`
   *   already returned it.
   * @param window - `limit` and `offset`, as `toStoreWindow` in
   *   `src/http/schemas.ts` derived them from `?page`/`?perPage`.
   *   The window arrives already validated, so no implementation
   *   re-checks its bounds.
   * @returns The rows in that window, possibly empty. A window past
   *   the end of the collection, a domain subscribing to nothing and
   *   an id no domain carries are all an empty list rather than an
   *   error: none of the three is a failure to read, and whether the
   *   domain existed is a question `DomainStore.findDomainBySlug`
   *   answered before this was called.
   */
  listSubscriptions(
    domainId: number,
    window: StoreWindow,
  ): Promise<readonly SubscriptionRecord[]>;

  /**
   * Counts a domain's export subscriptions, ignoring any window.
   *
   * Separate from {@link SubscriptionStore.listSubscriptions} rather
   * than answered beside it, because the two are different
   * questions: a page's total describes the collection and not the
   * page. Splitting them also keeps the list read free of a window
   * function an in-memory implementation could only imitate.
   *
   * @param domainId - The domain to count within.
   * @returns How many rows `export_subscriptions` holds for it. An
   *   id no domain carries answers `0`, which is correct rather than
   *   a special case: nothing points at a row that is not there.
   */
  countSubscriptions(domainId: number): Promise<number>;

  /**
   * Looks one subscription up by its id. Where every request naming
   * `/exports/:id` enters — the patch, the delete and the run-now.
   *
   * The run-now is why this read carries more weight here than its
   * counterpart does on the wave-1 ports: that verb decides on the
   * STORED row before writing, reading
   * {@link SubscriptionRecord.enabled}, so this method is where the
   * fact the rule turns on comes from.
   *
   * @param id - The id as `resourceIdParamSchema` in
   *   `src/http/schemas.ts` parsed it.
   * @returns The row, or null when no subscription carries that id.
   *   Null is neither an error nor a refusal: it is the fact from
   *   which the service decides a 404. The row carries
   *   {@link SubscriptionRecord.domainId}, which is the only thing
   *   saying whose delivery an addressed subscription is.
   */
  findSubscriptionById(id: number): Promise<SubscriptionRecord | null>;

  /**
   * Inserts one subscription, UNSCHEDULED: `next_run_at` is null on
   * the row this answers, because {@link InsertSubscriptionInput}
   * carries no member that could set it.
   *
   * ASSERTS A NEW ROW, AND DOES NOT UPSERT, though
   * `src/db/schema/scheduling.ts` describes the natural key as one a
   * seed pass upserts on. A `POST` is a caller stating that the
   * domain does not take that format at that destination yet, so a
   * duplicate is a 409 rather than a silent rewrite of a cadence
   * somebody tuned. No seed writes this table today —
   * `scripts/seed-apply.ts` names no subscription at all — so this
   * port is its only writer.
   *
   * @param input - The complete row, minus its id and its due time.
   * @returns The stored row, read back rather than reconstructed
   *   from the input, so the id is the database's own and the
   *   defaults are the ones actually stored.
   * @throws A `StoreRefusal` with `reason` `unique-violation` and
   *   `constraint`
   *   `export_subscriptions_domain_id_format_connector_id_unique`,
   *   when the domain already subscribes to that format at that
   *   connector.
   * @throws A `StoreRefusal` with `reason` `check-violation` and
   *   `constraint` `export_subscriptions_format_check`, when
   *   `format` is outside `EXPORT_FORMATS`.
   * @throws A `StoreRefusal` with `reason` `foreign-key-violation`
   *   and `constraint`
   *   `export_subscriptions_domain_id_domains_id_fk`, when
   *   `domainId` names no domain. Only this method can raise it,
   *   `domainId` being unpatchable, and the service resolved the
   *   domain before calling, so it arrives only if the row went in
   *   between.
   * @throws A `StoreRefusal` with `reason` `foreign-key-violation`
   *   and `constraint`
   *   `export_subscriptions_connector_id_connectors_id_fk`, when
   *   `connectorId` names no connector. Same race and no other
   *   reading: the service resolved the connector before calling.
   */
  insertSubscription(
    input: InsertSubscriptionInput,
  ): Promise<SubscriptionRecord>;

  /**
   * Rewrites the supplied members of one subscription.
   *
   * NEVER WRITES `next_run_at`, WHATEVER IT IS HANDED, because
   * {@link SubscriptionPatch} declares no member that could carry
   * one. That is the containment stated in the module header,
   * expressed as a type rather than as a check an implementation
   * could forget. It never writes `domain_id` either, and for the
   * same structural reason.
   *
   * A PATCH CARRYING NO MEMBER ANSWERS THE STORED ROW WITHOUT
   * WRITING, and this port decides that rather than leaving it to
   * two implementations. `export_subscriptions` has no `updated_at`,
   * so an empty patch has literally nothing to set: drizzle throws
   * `No values to set` on an empty update list, while an in-memory
   * implementation would happily answer the row. Left unstated, the
   * two halves of this port would disagree about a call the surface
   * admits. `TopicStore.updateTopic`, `SourceStore.updateSource` and
   * `ConnectorStore.updateConnector` carry the same rule for the
   * same reason; `DomainStore.updateDomain` does not, because
   * `domains` has a timestamp to stamp.
   *
   * The edit is visible to the next delivery and to no render
   * already in flight, on the same terms every other configuration
   * edit is: nothing between this port and the query a pass issues
   * at its own start keeps a copy, so there is no cache to expire
   * and no invalidation path to get wrong.
   *
   * @param id - The {@link SubscriptionRecord.id} a read already
   *   returned.
   * @param patch - The members to rewrite. A bound set to `null` is
   *   cleared rather than left alone.
   * @returns The stored row afterwards, or null when no row carries
   *   that id. Null is reachable even after a successful read, since
   *   the row may go in between, and answering it rather than
   *   throwing leaves what that means to the caller.
   * @throws A `StoreRefusal` with `reason` `unique-violation` and
   *   `constraint`
   *   `export_subscriptions_domain_id_format_connector_id_unique`,
   *   when the RESULTING triple is one the domain already
   *   subscribes to. Reachable because two thirds of the key are
   *   patchable.
   * @throws A `StoreRefusal` with `reason` `check-violation` and
   *   `constraint` `export_subscriptions_format_check`, when the
   *   patched `format` is outside `EXPORT_FORMATS`.
   * @throws A `StoreRefusal` with `reason` `foreign-key-violation`
   *   and `constraint`
   *   `export_subscriptions_connector_id_connectors_id_fk`, when a
   *   patched `connectorId` names no connector — the race the module
   *   header describes, the service having resolved it before
   *   calling. No update reaches the domain foreign key, `domainId`
   *   not being patchable.
   */
  updateSubscription(
    id: number,
    patch: SubscriptionPatch,
  ): Promise<SubscriptionRecord | null>;

  /**
   * Writes one subscription's due time, AND NOTHING ELSE. The one
   * method on this port permitted to write `next_run_at`, and the
   * only thing it is permitted to write.
   *
   * Both halves of that sentence are load-bearing and both are
   * enforced by the signature rather than by an implementation.
   * There is no other method taking a due time, so the column has
   * exactly one door; and this one takes a bare `Date` rather than a
   * patch object, so there is no member for a second column to be
   * added to later. A route wanting to move a schedule AND re-point
   * a subscription has to make two calls, which is the point: the
   * write that moved the schedule is legible on its own afterwards.
   *
   * A `Date` AND NOT `Date | null`, so this method cannot UNSCHEDULE
   * a row. Nothing on the surface asks to —
   * `POST /exports/:id/run-now` writes the service clock's instant
   * and is this method's only caller — and admitting null would make
   * unscheduling reachable from a route nobody wrote a rule for.
   * Suspending a delivery is `enabled: false` through
   * {@link SubscriptionStore.updateSubscription}, which is the
   * column the schema provides for it; `enabled` and `next_run_at`
   * are kept apart on purpose.
   *
   * TAKES THE INSTANT AND TAKES NO VIEW OF IT. This method does not
   * read the clock, does not clamp, does not consult
   * {@link SubscriptionRecord.enabled} and does not compare against
   * the stored due time. All four are `./service.ts`'s, because all
   * four are decisions: the clock is injected there so a test can
   * fix it, and the refusal of a run-now against a disabled row is a
   * status a rule chose rather than a fact a database reported.
   *
   * @param id - The {@link SubscriptionRecord.id} a read already
   *   returned.
   * @param nextRunAt - The instant to store. Absolute and already
   *   decided: this port neither derives it nor bounds it.
   * @returns The stored row afterwards, or null when no row carries
   *   that id — the same shape and the same reachability as
   *   {@link SubscriptionStore.updateSubscription}. The whole record
   *   comes back so a route can answer the stored row rather than
   *   echo what it sent, which is what lets a caller read the
   *   instant that actually landed.
   * @throws Nothing. No mechanism on `export_subscriptions`
   *   constrains this column: the bounds are clamped by a writer and
   *   enforced by no CHECK, and a time in the past is an overdue row
   *   rather than an invalid one — which is exactly what a run-now
   *   writes.
   */
  updateSubscriptionSchedule(
    id: number,
    nextRunAt: Date,
  ): Promise<SubscriptionRecord | null>;

  /**
   * Deletes one subscription. Cancelling a delivery, as against
   * suspending one, which is `enabled: false` through
   * {@link SubscriptionStore.updateSubscription}.
   *
   * Nothing hangs off a subscription — no foreign key in schema v2
   * points at this table, confirmed in the generated SQL rather than
   * read off the schema — so there is no cascade to warn about, no
   * guard to read, and this is a delete that cannot be refused. That
   * is the difference from `DELETE /connectors/:id`, which THESE
   * rows are what refuses: a connector is pointed at and a
   * subscription is not, so cancelling here is exactly what clears
   * the way there.
   *
   * A rendered digest is not a counter-example. `briefings` carries
   * no `subscription_id`, per `src/db/schema/runs.ts`, so what was
   * produced survives the subscription that asked for it as stored
   * text rather than as a reference.
   *
   * @param id - The {@link SubscriptionRecord.id} a read already
   *   returned.
   * @returns Whether a row was removed. False means no subscription
   *   carried that id.
   */
  deleteSubscription(id: number): Promise<boolean>;
}
