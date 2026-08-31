/**
 * @packageDocumentation
 * The `TopicStore` port — every database operation the topics
 * surface performs, declared as an interface so that the asking is
 * separable from Postgres.
 *
 * THE PORT DECIDES NOTHING, exactly as `src/domains/store.ts`,
 * `src/taxonomy/store.ts` and `src/personas/store.ts` state for
 * their own surfaces. An unknown domain slug, an unknown topic id, a
 * name the domain already carries, a run-now against a topic whose
 * `enabled` is false, a pause against one that is not scheduled:
 * none of those are facts about Postgres. They are decisions taken
 * about rows, and a decision about rows can be driven by anything
 * that supplies rows. So the isolated suite puts
 * `tests/helpers/memory-research-store.ts` behind this interface and
 * a deployment puts `./db-store.ts` behind it, both answering one
 * contract, and the live suite is left proving only that real
 * Postgres agrees.
 *
 * THE TWO SCHEDULE VERBS ARE THE CLEAREST CASE HERE, because they
 * are the ones whose rules are most easily mistaken for database
 * facts. {@link TopicStore.updateTopicSchedule} writes the instant it
 * is handed and takes no view of it. Whether a disabled row may be
 * run now, whether an unscheduled one may be paused, and what
 * instant a pause of N cycles lands on are all decided one layer up
 * in `./service.ts`, where the request that asked for it is legible
 * and where `pauseFrom` in `src/lib/schedule.ts` is the one place
 * the arithmetic is written. A store refusing a disabled row on its
 * own would move a rule into the half of the module that cannot be
 * exercised without a database, which is the arrangement this file
 * exists to avoid.
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
 * TWO MECHANISMS CAN FIRE HERE AND NO OTHERS, read off the `topics`
 * declaration in `src/db/schema/scheduling.ts` and confirmed in the
 * generated SQL. `topics_domain_id_name_unique` refuses a name the
 * domain already carries, as a `unique-violation`, on INSERT and on
 * UPDATE alike — `name` is patchable, so both writes reach it.
 * `topics_domain_id_domains_id_fk` refuses a `domainId` naming no
 * domain, as a `foreign-key-violation`, and only an INSERT can reach
 * it, since `domainId` is not patchable per {@link TopicPatch}. The
 * table carries no CHECK and no trigger, so a `check-violation` out
 * of any method below would be a fault rather than a rule: the
 * interval bounds are clamped by a writer and constrain nothing at
 * the database, which `schedulableColumns()` states in as many
 * words. Two domains are free to research subjects of the same name,
 * so the unique key is per-domain rather than global.
 *
 * THE TWO CANNOT BE VIOLATED AT ONCE, so there is no refusal order
 * here and none is claimed — the reading `src/personas/store.ts`
 * offers for its own pair, for the same reason. The unique key opens
 * on the very column the foreign key constrains: a write naming a
 * domain that does not exist can duplicate nothing, because nothing
 * is stored under a domain that is not there.
 *
 * NOTHING POINTS AT `topics`, so no method below can be refused on
 * the way out. Schema v2 carries no foreign key onto this table,
 * which is why there is no dependent count beside
 * {@link TopicStore.deleteTopic} and no guard for a service to read.
 * The loss `DomainStore.countDomainDependents` warns about is the
 * DOMAIN's, and a topic goes with its domain through the `ON DELETE
 * CASCADE` on `topics.domain_id` rather than through anything here.
 *
 * A TOPIC IS MET IN ITS DOMAIN AND WRITTEN BY ITS ID. The collection
 * read takes a `domainId`, because `GET /domains/:slug/topics` is
 * where the group is addressed from and
 * `DomainStore.findDomainBySlug` in `src/domains/store.ts` resolved
 * that slug before anything here was called. Every other method
 * takes {@link TopicRecord.id}, because `PATCH /topics/:id`,
 * `DELETE /topics/:id`, `POST /topics/:id/run-now` and
 * `POST /topics/:id/pause` name no domain at all — the natural key
 * is `(domain_id, name)`, so a path naming a name alone names
 * nothing. That split is why {@link TopicRecord.domainId} is on the
 * record: it is the only thing saying which domain an addressed row
 * belongs to, for a rule or a log line that has to know.
 *
 * ONE METHOD MAY WRITE `next_run_at`, AND IT IS THE ONLY THING THAT
 * METHOD WRITES. {@link TopicStore.updateTopicSchedule} exists so
 * that the column has exactly one door on this port, and
 * {@link TopicPatch} is declared without it so there is no second
 * one. The containment is structural rather than conventional:
 * `nextRunAt` appears on {@link TopicRecord}, which is a read, and
 * as the sole parameter of that one method, and on no input type at
 * all — so a create lands unscheduled and no other write on this
 * port can reach the column whatever it is handed.
 *
 * Two mechanisms hold that rule and both are wanted. `nextRunAt` is
 * refused as an unrecognized key by the create and patch schemas in
 * `./service.ts`, which is what a caller meets; the single-purpose
 * method here is what a future route meets, because a port offering
 * exactly one schedule writer cannot grow a second one by accident.
 * `docs/architecture/08-http-api.md` carries the rule for the
 * surface; this file is its shape.
 */
import type { StoreWindow } from '../http/schemas.js';

/**
 * One `topics` row, whole — the four columns the table declares for
 * itself and the five `schedulableColumns()` spreads into it.
 *
 * Whole rather than column-scoped, for the reason `DomainRecord` in
 * `src/domains/store.ts` gives: this record IS the resource the
 * route group answers with, and there is nothing on `topics` a
 * reader of the API may not have. No hash, no secret, no
 * operator-invisible bookkeeping — a topic is configuration
 * somebody wrote plus a due time the dispatcher moves.
 *
 * THE SCHEDULABLE SET IS ON THE RECORD IN FULL, which is not the
 * same as being writable in full. {@link TopicRecord.nextRunAt} is
 * answered on every read and reachable by exactly one write, per
 * {@link TopicStore.updateTopicSchedule}: that is the
 * pipeline-owned-column rule `docs/architecture/08-http-api.md`
 * states, applied to the one column on this table the pipeline
 * writes. A due time nobody can read is a schedule nobody can act
 * on, so answering it matters as much as refusing it on the way in.
 *
 * {@link TopicRecord.minIntervalSeconds} and
 * {@link TopicRecord.maxIntervalSeconds} together structurally
 * satisfy `IntervalBounds` in `src/lib/schedule.ts`, which is named
 * for the columns rather than for the sides precisely so that a row
 * satisfies it as it stands. So the pause path hands a record
 * straight to `pauseFrom` with no renaming step between the read and
 * the rule, and a column renamed here would redden that call rather
 * than silently drop a bound.
 *
 * THERE ARE NO TIMESTAMPS, and their absence is the table's rather
 * than this record's. `topics` carries no `created_at` and no
 * `updated_at`, so a topic cannot report when its terms were last
 * edited and nothing here pretends otherwise. That absence is also
 * what makes an empty patch a decision this port has to take rather
 * than leave to its two implementations; see
 * {@link TopicStore.updateTopic}.
 */
export interface TopicRecord {
  /** `topics.id`, and the key every write below takes. */
  readonly id: number;

  /**
   * The domain whose research this topic is part of. Half of the
   * row's natural key, and read by the one rule a path cannot
   * express: `PATCH /topics/:id` names no domain, so this is what
   * says whose configuration the addressed row is part of.
   */
  readonly domainId: number;

  /**
   * What this topic is about, in the operator's words. The other
   * half of the natural key, unique within the domain, and what a
   * person names the topic by when asking why a run happened.
   *
   * NOT NULL is not the same as non-empty, and the column enforces
   * only the first. `src/db/schema/scheduling.ts` argues that an
   * empty name is a row somebody has not finished — and that it
   * takes the key's place and refuses the next row meaning to
   * occupy it — so refusing one is `./service.ts`'s, at the
   * boundary, rather than anything this port can promise.
   */
  readonly name: string;

  /**
   * The terms a run issues on this topic's behalf, stored rather
   * than assembled at run time so that what will be issued can be
   * read before it is issued.
   *
   * Empty is a complete value and the column's default: the topic
   * comes due on time and gives its run nothing to issue. Nothing
   * on this port treats it as an absence.
   *
   * `readonly` on the array as well as the member, so a caller
   * cannot edit stored state through a record it was answered. An
   * implementation therefore copies on the way out as well as on
   * the way in — the same rule that keeps a `Date` on this record
   * from being a handle on the store's own clock reading.
   */
  readonly searchTerms: readonly string[];

  /**
   * How long to wait between runs of this topic, in seconds. NOT
   * NULL: a schedulable row saying nothing about how often is one
   * the dispatcher cannot reschedule after running it.
   */
  readonly intervalSeconds: number;

  /**
   * When this topic is next due to run, or null when it is not
   * scheduled at all.
   *
   * NULL IS A STATE AND NOT AN ABSENCE. The dispatch claim reads
   * `WHERE enabled AND next_run_at <= now()`, so a null row is
   * never claimed whatever its interval says — which is why a pause
   * of one is a `409` in `./service.ts` rather than a write:
   * pausing an unscheduled topic would SCHEDULE it, the opposite of
   * what was asked. A create lands here, since no input type on
   * this port carries this column.
   */
  readonly nextRunAt: Date | null;

  /**
   * Whether this topic takes part in scheduling at all. Defaults
   * true at the column, because a schedulable row exists in order
   * to be run.
   *
   * Operator-owned and patchable, unlike a source's `flagged`.
   * False excludes the row from `topics_dispatch_claim_idx`, which
   * is the partial index the claim walks, so a run-now against a
   * disabled topic would write a due time nothing ever reads — a
   * silent no-op the caller could not see, and the reason
   * `./service.ts` answers `409` instead.
   */
  readonly enabled: boolean;

  /**
   * The shortest interval this topic may be run at, in seconds, or
   * null for no floor. Bounds what the pause path proposes; it is
   * not an enforcement boundary, and no CHECK relates it to
   * anything.
   */
  readonly minIntervalSeconds: number | null;

  /**
   * The longest it may go between runs, in seconds, or null for no
   * ceiling. The other half of the clamp `clampIntervalSeconds` in
   * `src/lib/schedule.ts` applies; bounds that cross resolve to
   * this one, per that function's contract.
   */
  readonly maxIntervalSeconds: number | null;
}

/**
 * What {@link TopicStore.insertTopic} is handed: a complete topic,
 * minus the id the write stamps and minus the due time no input on
 * this port carries.
 *
 * EVERY MEMBER IS REQUIRED, INCLUDING THE ONES THE COLUMN DEFAULTS,
 * and that is the port deciding nothing again — the argument
 * `InsertDomainInput` makes for its `settings` and
 * `InsertCategoryInput` for its `parentId`. A default is a decision
 * about what an omission means, and leaving `searchTerms` or
 * `enabled` to the column would make the drizzle implementation
 * quietly right and the in-memory one quietly wrong, since only one
 * of the two has a column to default from. `./service.ts` supplies
 * the empty list and the `true` where the choice is visible and a
 * test can reach it.
 *
 * `nextRunAt` IS ABSENT, so a topic is INSERTED UNSCHEDULED and
 * there is no way to create one that is already due. Scheduling it
 * is a second, separate act through
 * {@link TopicStore.updateTopicSchedule}, which is what makes the
 * one-writer rule structural rather than a convention two
 * implementations could drift on. The cost is stated rather than
 * hidden: a topic created and never run-now'd sits at null forever,
 * and `docs/architecture/08-http-api.md` is where the surface says
 * so.
 */
export interface InsertTopicInput {
  /**
   * The domain this topic researches, as
   * `DomainStore.findDomainBySlug` in `src/domains/store.ts` already
   * resolved it from the `:slug` in the path.
   */
  readonly domainId: number;

  /**
   * The subject, within the domain.
   * `topics_domain_id_name_unique` refuses one the domain already
   * carries.
   */
  readonly name: string;

  /** The terms to issue. Possibly empty, never absent. */
  readonly searchTerms: readonly string[];

  /** How often to run, in seconds. */
  readonly intervalSeconds: number;

  /** Whether the topic takes part in scheduling from the outset. */
  readonly enabled: boolean;

  /** The floor on the interval, or null for none. */
  readonly minIntervalSeconds: number | null;

  /** The ceiling on the interval, or null for none. */
  readonly maxIntervalSeconds: number | null;
}

/**
 * What {@link TopicStore.updateTopic} is handed: the members to
 * rewrite, and no others.
 *
 * `name` IS PATCHABLE, which is what puts
 * `topics_domain_id_name_unique` on the update as well as on the
 * insert. Nothing outside this table holds a reference a rename
 * would strand — no foreign key in schema v2 points at `topics`,
 * and `scripts/seed-apply.ts` upserts on `(domain, name)` so a
 * re-run writes the row the file describes — so a rename changes
 * which row a seed pass adjusts rather than leaving a dangling
 * pointer behind.
 *
 * `domainId` is deliberately absent, so a topic cannot be moved
 * between domains. A topic is a question asked ABOUT the subject
 * its domain names, and its terms, its cadence and the findings
 * already attributed to it are all read in that context; a move
 * would carry them into another. Its absence is also what keeps
 * every foreign-key refusal off {@link TopicStore.updateTopic},
 * which is why that method raises the unique key and nothing else.
 *
 * `nextRunAt` is deliberately absent, per the module header: this
 * is the type whose shape makes the one-writer rule structural, and
 * a member added here would defeat it silently while every schema
 * in `./service.ts` still refused the key on the wire.
 *
 * THE TWO BOUNDS DISTINGUISH THREE REQUESTS rather than two, the
 * way `CategoryPatch.parentId` does in `src/taxonomy/store.ts`.
 * Absent leaves the bound alone; a number sets it; `null` clears
 * it, which is the only way to remove a floor or a ceiling and
 * would be unexpressible if absent and null meant the same thing.
 * `intervalSeconds` and `enabled` are NOT NULL columns and so
 * distinguish only two.
 */
export interface TopicPatch {
  /**
   * The new subject, or absent to leave it alone.
   * `topics_domain_id_name_unique` refuses one the domain already
   * carries.
   */
  readonly name?: string;

  /**
   * The terms to store WHOLE, or absent to leave them alone. Never
   * merged into what is already there and never appended to: a
   * caller sends the list it wants to exist, which is the only
   * shape under which removing a term is expressible at all.
   */
  readonly searchTerms?: readonly string[];

  /** The new cadence in seconds, or absent to leave it alone. */
  readonly intervalSeconds?: number;

  /**
   * Whether to take part in scheduling, or absent to leave it
   * alone. This is the column for retiring a topic; deleting it is
   * {@link TopicStore.deleteTopic}, and pausing it is neither.
   */
  readonly enabled?: boolean;

  /**
   * The new floor, `null` to remove it, or absent to leave it
   * alone.
   */
  readonly minIntervalSeconds?: number | null;

  /**
   * The new ceiling, `null` to remove it, or absent to leave it
   * alone.
   */
  readonly maxIntervalSeconds?: number | null;
}

/**
 * Every database operation the topics surface performs.
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
 * SIX METHODS AND THE SEVENTH, which is the split worth reading
 * this interface by. Six are the ordinary resource operations the
 * wave-1 ports also declare — a windowed list, its count, a lookup,
 * an insert, a patch and a delete. The seventh,
 * {@link TopicStore.updateTopicSchedule}, exists only so that
 * `next_run_at` has one door, and it is the reason this port has
 * seven methods where `PersonaStore` has six over a table of
 * comparable shape.
 *
 * NO METHOD RESOLVES A DOMAIN, AND NONE DELETES ONE. `:slug`
 * becomes a domain row through `DomainStore.findDomainBySlug` in
 * `src/domains/store.ts` before anything here is called, and the
 * cascade that takes a domain's topics with it belongs to
 * `DomainStore.deleteDomain` and to the `ON DELETE CASCADE` behind
 * `topics.domain_id`. One in-memory implementation stands behind
 * both ports over one dataset, which is what keeps a domain deleted
 * in one of them deleted in the other.
 *
 * NO METHOD CLAIMS A ROW, OPENS A `runs` ROW OR INVOKES A WORKFLOW,
 * and the absence is the design rather than an omission.
 * `ar-dispatch` holds the only schedule trigger in the system: it
 * wakes on its own cron, takes what has come due with `FOR UPDATE
 * SKIP LOCKED` and runs it. Everything this port can do to a
 * schedule is move one timestamp, so a run-now is a request for the
 * next tick to pick the row up rather than a second trigger racing
 * the first for the same row.
 * `tests/invariants/api-schedule-containment.test.ts` is what makes
 * that a property of the tree rather than a sentence here.
 */
export interface TopicStore {
  /**
   * Reads one window of a domain's topics, ordered by
   * {@link TopicRecord.name} ascending.
   *
   * THE ORDER IS PART OF THE CONTRACT, because a window over an
   * unordered read is not a page. Postgres promises nothing about
   * row order without an `ORDER BY`, so two requests for
   * consecutive pages may repeat one row and skip another while
   * every count on the wire still adds up. `name` is what to order
   * on because it is unique WITHIN the domain and this read is
   * scoped to one domain, so the order is total and there is no
   * tie-break to forget.
   *
   * Ordered by name rather than by {@link TopicRecord.nextRunAt},
   * which would be the operator's other natural reading of this
   * list. A due time is nullable and non-unique, so ordering on it
   * needs a tie-break and puts every unscheduled topic in one
   * indistinguishable block; and it MOVES, so a page read while the
   * dispatcher is working is a page over a collection that reorders
   * underneath it. A name is stable and total.
   *
   * @param domainId - The domain whose topics to read, as
   *   `DomainStore.findDomainBySlug` in `src/domains/store.ts`
   *   already returned it.
   * @param window - `limit` and `offset`, as `toStoreWindow` in
   *   `src/http/schemas.ts` derived them from `?page`/`?perPage`.
   *   The window arrives already validated, so no implementation
   *   re-checks its bounds.
   * @returns The rows in that window, possibly empty. A window past
   *   the end of the collection, a domain with no topics and an id
   *   no domain carries are all an empty list rather than an error:
   *   none of the three is a failure to read, and whether the
   *   domain existed is a question `DomainStore.findDomainBySlug`
   *   answered before this was called.
   */
  listTopics(
    domainId: number,
    window: StoreWindow,
  ): Promise<readonly TopicRecord[]>;

  /**
   * Counts a domain's topics, ignoring any window.
   *
   * Separate from {@link TopicStore.listTopics} rather than
   * answered beside it, because the two are different questions: a
   * page's total describes the collection and not the page.
   * Splitting them also keeps the list read free of a window
   * function an in-memory implementation could only imitate.
   *
   * @param domainId - The domain to count within.
   * @returns How many rows `topics` holds for it. An id no domain
   *   carries answers `0`, which is correct rather than a special
   *   case: nothing points at a row that is not there.
   */
  countTopics(domainId: number): Promise<number>;

  /**
   * Looks one topic up by its id. Where every request naming
   * `/topics/:id` enters — the patch, the delete, and both schedule
   * verbs.
   *
   * The schedule verbs are why this read carries more weight here
   * than its counterpart does on the wave-1 ports. Both of them
   * decide on the STORED row before writing: a run-now reads
   * {@link TopicRecord.enabled} and a pause reads
   * {@link TopicRecord.nextRunAt} and the two bounds, so this
   * method is where the facts those rules turn on come from.
   *
   * @param id - The id as `resourceIdParamSchema` in
   *   `src/http/schemas.ts` parsed it.
   * @returns The row, or null when no topic carries that id. Null
   *   is neither an error nor a refusal: it is the fact from which
   *   the service decides a 404. The row carries
   *   {@link TopicRecord.domainId}, which is the only thing saying
   *   which domain an addressed topic belongs to.
   */
  findTopicById(id: number): Promise<TopicRecord | null>;

  /**
   * Inserts one topic, UNSCHEDULED: `next_run_at` is null on the
   * row this answers, because {@link InsertTopicInput} carries no
   * member that could set it.
   *
   * ASSERTS A NEW ROW, AND DOES NOT UPSERT — unlike
   * `scripts/seed-apply.ts`, which writes this same table through an
   * `ON CONFLICT` on this same natural key. A `POST` is a caller
   * stating that the domain has no topic on the subject yet, so a
   * duplicate is a 409 rather than a silent rewrite of the terms
   * and the cadence somebody tuned. The seed's upsert answers a
   * different intent: a file being applied whole, where rewriting
   * is the point rather than the accident.
   *
   * @param input - The complete row, minus its id and its due time.
   * @returns The stored row, read back rather than reconstructed
   *   from the input, so the id is the database's own and the
   *   defaults are the ones actually stored.
   * @throws A `StoreRefusal` with `reason` `unique-violation` and
   *   `constraint` `topics_domain_id_name_unique`, when the domain
   *   already carries a topic of that name.
   * @throws A `StoreRefusal` with `reason` `foreign-key-violation`
   *   and `constraint` `topics_domain_id_domains_id_fk`, when
   *   `domainId` names no domain. The service resolved the domain
   *   before calling, so this is reachable only if the row went in
   *   between.
   */
  insertTopic(input: InsertTopicInput): Promise<TopicRecord>;

  /**
   * Rewrites the supplied members of one topic.
   *
   * NEVER WRITES `next_run_at`, WHATEVER IT IS HANDED, because
   * {@link TopicPatch} declares no member that could carry one.
   * That is the containment stated in the module header, expressed
   * as a type rather than as a check an implementation could
   * forget.
   *
   * A PATCH CARRYING NO MEMBER ANSWERS THE STORED ROW WITHOUT
   * WRITING, and this port decides that rather than leaving it to
   * two implementations. `topics` has no `updated_at`, so an empty
   * patch has literally nothing to set: drizzle throws `No values
   * to set` on an empty update list, while an in-memory
   * implementation would happily answer the row. Left unstated, the
   * two halves of this port would disagree about a call the surface
   * admits. `PersonaStore.updatePersona` carries the same rule for
   * the same reason; `DomainStore.updateDomain` does not, because
   * `domains` has a timestamp to stamp.
   *
   * The edit is visible to the next run and to no run already in
   * flight, on the same terms every other configuration edit is:
   * nothing between this port and the query a run issues at its own
   * start keeps a copy, so there is no cache to expire and no
   * invalidation path to get wrong.
   *
   * @param id - The {@link TopicRecord.id} a read already returned.
   * @param patch - The members to rewrite. `searchTerms` replaces
   *   the stored list WHOLE and is never merged into it; a bound
   *   set to `null` is cleared rather than left alone.
   * @returns The stored row afterwards, or null when no row carries
   *   that id. Null is reachable even after a successful read,
   *   since the row may go in between, and answering it rather than
   *   throwing leaves what that means to the caller.
   * @throws A `StoreRefusal` with `reason` `unique-violation` and
   *   `constraint` `topics_domain_id_name_unique`, when the
   *   RESULTING name is one the domain already carries. This is the
   *   only refusal an update raises: `domainId` is not patchable,
   *   so no update reaches the foreign key at all.
   */
  updateTopic(id: number, patch: TopicPatch): Promise<TopicRecord | null>;

  /**
   * Writes one topic's due time, AND NOTHING ELSE. The one method
   * on this port permitted to write `next_run_at`, and the only
   * thing it is permitted to write.
   *
   * Both halves of that sentence are load-bearing and both are
   * enforced by the signature rather than by an implementation.
   * There is no other method taking a due time, so the column has
   * exactly one door; and this one takes a bare `Date` rather than
   * a patch object, so there is no member for a second column to be
   * added to later. A route wanting to move a schedule AND rename a
   * topic has to make two calls, which is the point: the write that
   * moved the schedule is legible on its own afterwards.
   *
   * A `Date` AND NOT `Date | null`, so this method cannot
   * UNSCHEDULE a row. Nothing on the surface asks to — a run-now
   * writes the service clock's instant and a pause writes a time
   * `cycles` clamped intervals out, per `pauseFrom` in
   * `src/lib/schedule.ts` — and admitting null would make
   * unscheduling reachable from a route nobody wrote a rule for.
   * Retiring a topic is `enabled: false` through
   * {@link TopicStore.updateTopic}, which is the column the schema
   * provides for it; `enabled` and `next_run_at` are kept apart on
   * purpose, and a pause is not a disable.
   *
   * TAKES THE INSTANT AND TAKES NO VIEW OF IT. This method does not
   * read the clock, does not clamp, does not consult
   * {@link TopicRecord.enabled} and does not compare against the
   * stored due time. All four are `./service.ts`'s, because all
   * four are decisions: the clock is injected there so a test can
   * fix it, the clamp is `clampIntervalSeconds`'s so the rule stays
   * written once, and the two refusals — a run-now against a
   * disabled row, a pause against an unscheduled one — are statuses
   * a rule chose rather than facts a database reported.
   *
   * @param id - The {@link TopicRecord.id} a read already returned.
   * @param nextRunAt - The instant to store. Absolute and already
   *   decided: this port neither derives it nor bounds it.
   * @returns The stored row afterwards, or null when no row carries
   *   that id — the same shape and the same reachability as
   *   {@link TopicStore.updateTopic}. The whole record comes back
   *   so a route can answer the stored row rather than echo what it
   *   sent, which is what lets a caller read the instant that
   *   actually landed.
   * @throws Nothing. No mechanism on `topics` constrains this
   *   column: the bounds are clamped by a writer and enforced by no
   *   CHECK, and a time in the past is an overdue row rather than
   *   an invalid one — which is exactly what a run-now writes.
   */
  updateTopicSchedule(
    id: number,
    nextRunAt: Date,
  ): Promise<TopicRecord | null>;

  /**
   * Deletes one topic.
   *
   * Nothing hangs off a topic — no foreign key in schema v2 points
   * at this table, confirmed in the generated SQL rather than read
   * off the schema — so there is no cascade to warn about and no
   * guard to read, and this is a delete that cannot be refused.
   * That is the difference from `DELETE /sources/:id`, which is
   * refused absolutely while documents or sightings reference the
   * row: a source accumulated a corpus, and a topic accumulated
   * nothing that names it. A run is not a counter-example — `runs`
   * carries no `topic_id`, so what a run was about survives its
   * topic as recorded text rather than as a reference.
   *
   * A DELETE AND A DISABLE ARE DIFFERENT OPERATIONS, and the port
   * offers both because the surface means both. Disabling keeps the
   * subject, its terms and its cadence and stops the topic coming
   * due; this removes them. Neither reaches work already dispatched:
   * the dispatcher claims a row and commits its reschedule in one
   * transaction, so by the time a delete can take the row the run it
   * claimed for has already gone out.
   *
   * @param id - The {@link TopicRecord.id} a read already returned.
   * @returns Whether a row was removed. False means no topic
   *   carried that id.
   */
  deleteTopic(id: number): Promise<boolean>;
}
