/**
 * @packageDocumentation
 * The `RunStore` port — every database operation the runs and spend
 * surfaces perform, declared as an interface so that the asking is
 * separable from Postgres.
 *
 * THE PORT DECIDES NOTHING, exactly as `src/domains/store.ts`,
 * `src/findings/store.ts` and `src/documents/store.ts` state for
 * their own surfaces. An unknown domain slug, an unknown run id, a
 * `perPage` above the shared cap, a span wider than the summary
 * allows: none of those are facts about Postgres. They are decisions
 * taken about rows, and a decision about rows can be driven by
 * anything that supplies rows. So the isolated suite puts
 * `tests/helpers/memory-research-store.ts` behind this interface and
 * a deployment puts `./db-store.ts` behind it, both answering one
 * contract, and the live suite is left proving only that real
 * Postgres agrees.
 *
 * NOTHING BELOW WRITES. Six methods, all six reads, and there is no
 * seventh: no insert, no update, no delete, no upsert, and no escape
 * hatch — no `query`, no exposed connection, no transaction handle —
 * to reach either table through some other way. So `GET /runs`,
 * `GET /runs/:id` and `GET /spend/summary` are read-only as a
 * PROPERTY OF THIS TYPE rather than as a promise `./routes.ts` and
 * `./spend-routes.ts` keep.
 *
 * `DocumentStore` states the same absence one group over, and the
 * two are worth telling apart. There the port is two methods and the
 * absence IS the port; here it is six methods across two tables, so
 * the claim is that a surface large enough to look like a resource
 * still has nothing to write with.
 *
 * THE LEDGER IS WHAT THIS PORT WOULD BE ASKED TO APPEND TO, which is
 * why the absence is a shape rather than a convention. A surface
 * answering what each model call cost is one line away from offering
 * to record one, and `POST /runs` — opening a pass from the API —
 * reads as the obvious companion to a page that lists them. Both are
 * refused by there being no method to call. Causing work has exactly
 * one spelling on this API and it is `run-now` setting a schedule
 * column that `ar-dispatch` picks up; opening a run here would be a
 * second one, answering a row no pass stands behind.
 *
 * `docs/architecture/08-http-api.md` states that read-first law for
 * the whole wave, under `Read-first`, and
 * `tests/invariants/api-read-first.test.ts` derives it from `keyof`
 * over these types rather than from either paragraph — so a writer
 * added below fails the invariant naming itself, and it is the type
 * and not this sentence that a reader should believe.
 *
 * NO REFUSAL CAN CROSS THIS PORT, which is what follows from having
 * no writer rather than a second decision. `runs_status_check`,
 * `runs_scheduled_by_check` and the two foreign keys either table
 * carries are mechanisms only an INSERT or an UPDATE reaches, so no
 * method below documents a throw, `./service.ts` and
 * `./spend-service.ts` have no store refusal to switch over, and a
 * `StoreRefusal` out of an implementation here would be reporting a
 * fault rather than a rule. `src/documents/store.ts` is the only
 * other port in this package that can say so.
 *
 * SPEND IS A COUNT AND TWO MAGNITUDES, AND NO MEMBER OF IT IS
 * CURRENCY. `llm_calls` carries `node`, `model`, `prompt_chars`,
 * `est_tokens` and `called_at`, and no price, rate, amount or
 * currency column at all — so {@link SpendBucket} answers `calls`,
 * `promptChars` and `estTokens` and has no fourth member, and there
 * is nothing here a reader can mistake for a cost because there is
 * no column behind one.
 *
 * This is the one group where the NAME of the surface pulls the
 * other way, which is why the rule is written at the port rather
 * than left to whoever assembles a response. `spend` is what the
 * question is called and what a widget reading it is for; a member
 * called `cost`, a `usd` beside a total, or a rate applied on the
 * way out would each be a number nobody measured, answered in the
 * one shape a reader trusts without checking.
 *
 * AND `est_tokens` DOES NOT RECONCILE WITH A BILL. Its own TSDoc in
 * `src/db/schema/runs.ts` is the authority and says so plainly: the
 * `est_` is load-bearing, the value is arithmetic over
 * `prompt_chars` rather than a count a provider reported, so the two
 * columns are one reading expressed twice and nothing stored says
 * which estimator produced either. What a magnitude IS good for is
 * comparison — one run against another, one day against the day
 * before — and saying which of the two it is here is what keeps a
 * consumer from doing the other thing with it.
 *
 * `runs.domain_id` IS NULLABLE, AND A DOMAIN-LESS TICK IS AN
 * ORDINARY ROW RATHER THAN A GAP. The dispatcher claims whatever is
 * due across every domain at once, and a maintenance or backfill
 * pass belongs to none of them; the column's own TSDoc records that
 * naming a domain anyway would file work under a domain that did not
 * ask for it. Three things follow, and each of them is why this port
 * is shaped unlike its domain-scoped siblings.
 *
 * FIRST, THE DOMAIN IS A FILTER MEMBER AND NOT A LEADING SCOPE.
 * `FindingStore` and `DocumentStore` take a `domainId` as a separate
 * first parameter because their collections cannot be met outside a
 * domain — `/domains/:slug/findings` has the slug in the path. This
 * one is `/runs`, a collection of every pass the deployment has
 * made, so the domain narrows it and {@link RunFilter.domainId} is
 * where it lives.
 *
 * SECOND, AN ABSENT MEMBER ANSWERS EVERY RUN INCLUDING THE
 * DOMAIN-LESS ONES. A filter that quietly dropped them would make
 * `GET /runs` disagree with the table about how much work the
 * service has done, and the maintenance passes — the ones a reader
 * goes looking for after something stopped happening — are exactly
 * the rows it would hide.
 *
 * THIRD, THERE IS NO SPELLING THAT ANSWERS THE DOMAIN-LESS RUNS
 * ALONE, and the type is what makes that so.
 * {@link RunFilter.domainId} is an optional `number` and never a
 * `number | null`, so there is no value a caller could send to mean
 * the ones belonging to nobody. That is this wave's decision
 * recorded rather than an oversight to be found later: the question
 * is a reasonable one to want, and answering it is a member here, a
 * parameter on the wire and a predicate in each implementation.
 *
 * `llm_calls.run_id` IS NULLABLE TOO, AND THE TWO NULLS MEET IN THE
 * SUMMARY. A call attributed to no run is reachable through neither
 * {@link RunStore.listRunLedger} nor
 * {@link RunStore.countRunLedger}, both of which are addressed by a
 * run id, and there is no `/llm-calls` collection for it to arrive
 * on. {@link RunStore.summariseSpend} is the one method that sees
 * it: the summary covers EVERY row of the ledger inside its window,
 * so a call with no run, and a call whose run named no domain, both
 * land in the bucket whose {@link SpendBucket.domainId} is null.
 *
 * That is the property worth having — the buckets' `calls` add up to
 * the number of calls in the window, so a total taken from the
 * summary cannot silently under-report — and its honest limit is
 * that the two kinds of unattributed call are not separable in the
 * answer. Separating them is another member, and the summary this
 * wave ships does not carry one.
 *
 * EVERY ORDER IS PART OF THE CONTRACT, AND ONLY ONE OF THEM IS
 * BACKED BY AN INDEX. {@link RunStore.listRuns} answers
 * `started_at DESC, id DESC`, which is
 * `runs_domain_id_started_at_idx` read in its own order — so both
 * descending keys have to be spelled `DESC NULLS LAST` even though
 * neither column is nullable. A pathkey carries its nulls ordering
 * and the Postgres planner matches it literally, so a bare `DESC`
 * puts a `Sort` above the index scan and nothing reports it; the
 * index's TSDoc in `src/db/schema/runs.ts` carries the measurement,
 * and the same rule governs why the NULL entries of a domain-less
 * tick sit IN that index rather than outside it.
 *
 * The ledger's `called_at DESC, id DESC` has no index behind it and
 * the schema says why: `llm_calls_called_at_idx` is one column,
 * serving the window the summary scans, and widening it to lead on
 * `run_id` would leave that window — which names no run — on a
 * sequential scan. The per-run read is bounded by the limit its
 * caller passes instead. The order is still the contract; the
 * spelling is not matching anything.
 *
 * The summary's order is a sort ABOVE an aggregate, so no pathkey is
 * involved at all and the `NULLS LAST` argument simply does not
 * apply to it. What is contracted there is the ORDER itself, for the
 * reason any listed answer needs one: two implementations free to
 * emit their groups in whatever order the grouping produced would
 * agree on every number and disagree on the array.
 *
 * THE LEDGER CAP LIVES AT THE SERVICE AND IS PASSED IN.
 * {@link RunStore.listRunLedger} takes a limit rather than choosing
 * one, {@link RunStore.countRunLedger} answers the full count, and
 * `./service.ts` compares the two to answer `ledgerTruncated` beside
 * `RUN_LEDGER_CAP` rows. A limit an implementation chose would be a
 * silent cut — a reader would see a short list and nothing saying it
 * was short — which is exactly the shape
 * `FindingStore.listFindingSightings` declines by staying unbounded
 * and naming this port as the arrangement it did not take.
 *
 * EVERY METHOD BELOW IS REACHED BY A ROUTE, which is worth recording
 * because the sibling port one group over cannot say it.
 * `GET /runs` reads the first two, `GET /runs/:id` reads the next
 * three, `GET /spend/summary` reads the last, and there is no method
 * here an implementation has to write and a live case has to cover
 * for no reader — the rule `DocumentStore` states about a lookup
 * nothing on the wire could reach, and the one `EntityStore` records
 * a departure from.
 *
 * NO METHOD RESOLVES OR DELETES A DOMAIN, which is the division of
 * labour every port here keeps. `DomainStore.findDomainBySlug` turns
 * an optional `?domain=<slug>` into the id
 * {@link RunFilter.domainId} carries, before this port is called, so
 * an unknown slug is a `404` decided one layer up and never an empty
 * page. Nothing below deletes anything, so the cascade that takes a
 * domain's runs with it — and their ledger rows after them — is
 * reached through `DomainStore` and is not expressible from this
 * file.
 */
import type { StoreWindow, TimeWindow } from '../http/schemas.js';

/**
 * One `runs` row, whole — the seven columns the table declares
 * beyond its key, and no eighth.
 *
 * Whole rather than column-scoped, for the reason `DomainRecord` in
 * `src/domains/store.ts` and `FindingRecord` in
 * `src/findings/store.ts` give: there is nothing on `runs` a reader
 * of this port may not have. No column here holds a credential, a
 * stored payload or a vector, so the record that would have needed
 * a masking rule — `ConnectorRecord.config` two waves over — has no
 * counterpart on this table.
 *
 * THE OUTCOME OF A PASS IS THREE MEMBERS RATHER THAN ONE, and that
 * is the table's shape carried through rather than this record
 * spreading a column out. {@link RunRecord.status} is what the pass
 * came to, {@link RunRecord.counts} is what it did, and
 * {@link RunRecord.errors} is what it could not do; a reader wanting
 * any of the three has it without parsing the other two.
 */
export interface RunRecord {
  /**
   * `runs.id`, the address of `GET /runs/:id` and the last key of
   * the page's order.
   *
   * The tiebreak is not optional there: `started_at` defaults to
   * `now()`, which is the TRANSACTION's start time, so passes
   * opened together tie to the microsecond and a page boundary
   * falling inside that tie would show one run twice and another
   * never.
   */
  readonly id: number;

  /**
   * The domain this pass ran for, or null when it ran for none.
   *
   * NULL IS AN ORDINARY STATE, per the module header, and it is
   * what makes this collection wider than every domain-scoped page
   * on this surface. A maintenance or cross-domain tick lands here
   * with no domain, sits in the middle of the page by start time,
   * and is answered by `GET /runs` with no `?domain` named.
   *
   * ON THE RECORD RATHER THAN LEFT TO THE PATH, which is the
   * opposite of `DocumentRecord`, whose domain is omitted because
   * the domain is the path. Here it is not: `/runs` names no
   * domain, so this member is the only thing on the row saying
   * whose pass it was — the same reason `FindingRecord.domainId`
   * carries one for a surface addressed by id.
   *
   * An id rather than the domain itself. `src/domains/store.ts` is
   * where a domain is met, and embedding one per run would put a
   * second authority on what a domain is.
   */
  readonly domainId: number | null;

  /**
   * When the row was opened, and by convention when the pass began.
   *
   * What the page is ordered by, newest first, and why
   * {@link RunRecord.id} sits beside it in that order. NOT NULL on
   * the table: a pass with no start is not a run, and a NULL would
   * sort outside the ordering rather than inside it.
   *
   * The convention is the writer's and the column's TSDoc says so:
   * `now()` is the transaction's start time, so a writer opening
   * the row before its work dates the start while one inserting a
   * single closed row at the end dates the whole pass at its
   * finish. Nothing stored tells the two apart, and this port
   * answers the column rather than a guess about which it was.
   */
  readonly startedAt: Date;

  /**
   * When the pass reported an end, or null when none has been
   * reported — the pass is still working, or its writer never came
   * back.
   *
   * Nothing in the database ties this to
   * {@link RunRecord.status}, so a row saying `running` with a
   * finish time, or the reverse, is storable. This port answers
   * both columns as they stand rather than reconciling them, which
   * would be inventing an outcome no writer recorded.
   */
  readonly finishedAt: Date | null;

  /**
   * What the pass came to: one of `RUN_STATUSES` in
   * `src/db/schema/values.ts`, as stored.
   *
   * `string` rather than the union, which is what a SELECT actually
   * answers: the tuple is a CHECK in the database rather than a
   * union in the type system, so a row written before a member was
   * removed still reads back. `DocumentRecord.parseStatus` and
   * `SourceRecord.kind` take the same view of the same kind of
   * column.
   *
   * The honest limit is the column default rather than this
   * member's: `status` defaults to `running`, so it cannot tell a
   * pass that is working from one whose writer never set the
   * column, and records both as `running`.
   */
  readonly status: string;

  /**
   * What the pass did, as the tallies it kept while doing it.
   *
   * NOT NULL defaulting to `{}`, and an empty object is the
   * ordinary state of a pass that counted nothing rather than a
   * pass that reported nothing.
   *
   * `Record<string, number>` because the column declares that
   * shape and nothing narrower: the KEYS are the writer's, one per
   * thing a pass thought worth counting, and a port naming them
   * would be a second authority on a vocabulary each workflow sets
   * for itself. A reader is handed the tallies and reads whichever
   * it knows.
   */
  readonly counts: Record<string, number>;

  /**
   * What the pass could not do, as its writer recorded it.
   *
   * NOT NULL defaulting to `[]`, and empty is the ordinary state:
   * nothing reads no failures recorded differently from no
   * failures.
   *
   * `unknown` because the column is `jsonb` with no declared shape
   * at all — no `$type`, no CHECK, nothing constraining what a
   * writer puts there. A record claiming an array of anything
   * would be a claim the schema does not make, and a consumer
   * written against it would break on the first writer that
   * disagreed. A reader that knows the shape its own workflow
   * writes narrows it; this port does not pretend to know.
   */
  readonly errors: unknown;

  /**
   * Which of the ways of setting a due time chose the one this pass
   * fired against: one of `RUN_SCHEDULERS` in
   * `src/db/schema/values.ts`, as stored, and `string` for the
   * reason {@link RunRecord.status} gives.
   *
   * It is the column that separates an unexpected schedule from an
   * unexpected DISPATCH, which is why the page answers it rather
   * than the two stamps alone. NOT NULL: a pass fired against
   * something, and a writer that could not say what is a writer
   * that has not been written yet.
   */
  readonly scheduledBy: string;
}

/**
 * One `llm_calls` row as a run's ledger answers it: which step
 * called what, how large the prompt was, and when.
 *
 * SIX MEMBERS OVER A SEVEN-COLUMN TABLE, and the omission is
 * `run_id`. The run is the path — these rows are read through
 * {@link RunStore.listRunLedger}, which is addressed by a run id
 * and filters on that column, so every row it answers carries the
 * id the caller already sent. That is the rule
 * `DocumentRecord` states about the scope column it omits, and
 * `SourceFailureRecord` before it.
 *
 * WHICH LEAVES ONE STATE THIS RECORD CANNOT BE IN. `run_id` is
 * NULLABLE, so a call attributed to no run is a storable row, and
 * no method on this port answers one: both ledger reads take a run
 * id, and the summary counts such a call without ever handing it
 * out. The module header carries where those calls DO land.
 *
 * NOTHING HERE IS MONEY, per the module header. Two of the six
 * members are magnitudes and neither is a cost.
 */
export interface LlmCallRecord {
  /**
   * `llm_calls.id`, and the tiebreak of the ledger's order.
   *
   * Not optional there: `called_at` defaults to `now()`, which is
   * the transaction's start time, so calls ledgered together carry
   * one stamp to the microsecond and the table has no unique key
   * above it to separate them.
   */
  readonly id: number;

  /**
   * Which step made the call, as that step names itself. NOT NULL,
   * and known by construction rather than looked up: the caller
   * writing the row is the step.
   *
   * `string` and not a roster, because there is no roster — no
   * CHECK, no tuple in `src/db/schema/values.ts` — and a port
   * naming the nodes it expects would go stale on the next
   * workflow.
   */
  readonly node: string;

  /**
   * Which model answered, as the writer named it, or null when no
   * writer recorded one.
   *
   * NULL IS A CALL THAT STILL COUNTS, which is the whole reason the
   * column is nullable: a row saying nothing about which model
   * answered is still a row saying a call was made, and
   * {@link SpendBucket.calls} counts it.
   */
  readonly model: string | null;

  /**
   * How large the prompt was, in characters, or null when nothing
   * measured it.
   *
   * CHARACTERS RATHER THAN TOKENS because characters are what the
   * caller has: tokenization belongs to the model, and this is a
   * count taken on the way out.
   *
   * NULL IS NOT ZERO. Zero is a real reading here — a call declined
   * before it was sent — so a null means nothing measured this call
   * and an implementation coalescing the two would answer a
   * magnitude nobody took.
   */
  readonly promptChars: number | null;

  /**
   * How many tokens that prompt is estimated to have been, or null
   * on the terms {@link LlmCallRecord.promptChars} states.
   *
   * AN ESTIMATE, AND THE COLUMN'S OWN TSDoc SAYS WHAT KIND. It is
   * arithmetic over the member above rather than a count a provider
   * reported, so the two are one reading expressed twice, and a
   * total over this member does not reconcile with a bill. The
   * module header carries what it IS good for.
   */
  readonly estTokens: number | null;

  /**
   * When the row was written, and by convention when the call was
   * made.
   *
   * NOT NULL, because a ledger entry outside time cannot be
   * totalled over a window, which is how the table is read. It is
   * the ledger's own order, newest first, and the column
   * {@link RunStore.summariseSpend} windows and buckets by.
   *
   * The convention is the writer's, as it is for
   * {@link RunRecord.startedAt}: a writer recording the row after
   * its call returns dates the return rather than the request, and
   * nothing stored tells that apart.
   */
  readonly calledAt: Date;
}

/**
 * One cell of the spend summary: what one domain spent on one UTC
 * day, as a count and two magnitudes.
 *
 * A BUCKET EXISTS BECAUSE CALLS LANDED IN IT. There is no row here
 * for a day nothing was called on and none for a domain that made
 * no calls, so {@link SpendBucket.calls} is at least one on every
 * bucket answered, and a caller filling a chart supplies its own
 * zeroes for the gaps. A store inventing empty buckets would be
 * answering a calendar rather than a ledger, and would have to be
 * told which calendar.
 *
 * NO MEMBER IS CURRENCY AND THERE IS NO FOURTH, per the module
 * header: `llm_calls` carries no price, rate, amount or currency
 * column, so there is nothing behind a cost for this record to
 * answer.
 */
export interface SpendBucket {
  /**
   * Whose calls these were, or null for the calls that belong to no
   * domain.
   *
   * THE NULL BUCKET HOLDS TWO KINDS OF ROW and the module header
   * says why: a call whose run named no domain, and a call
   * attributed to no run at all. Both are unattributed spend, both
   * are counted, and nothing in this record separates them.
   *
   * An id and not a slug, on the terms every port here keeps: a
   * slug is how a domain is met on the wire, and resolving one is
   * `DomainStore`'s. A caller that sent `?domain=<slug>` already
   * holds it.
   */
  readonly domainId: number | null;

  /**
   * The UTC day these calls fall on, as the instant that OPENS it:
   * midnight UTC, and the bucket is `[day, day + 1 day)`.
   *
   * UTC EXPLICITLY, NEVER THE SESSION'S ZONE. `called_at` is a
   * `timestamptz`, so it names an absolute instant and the
   * truncation is what chooses a calendar to name it in — and
   * `date_trunc` reads whatever `TimeZone` the session carries
   * unless it is told. That is a setting rather than a constant, so
   * a summary that inherited it would put the same call in
   * different buckets on two deployments, silently, with every
   * number still adding up.
   *
   * The instant that opens the day rather than a `YYYY-MM-DD`
   * string, because a bound is comparable and a label is not: a
   * consumer ordering, windowing or joining these buckets works on
   * the `Date`, and the day's name is a rendering decision left to
   * whoever displays it.
   */
  readonly day: Date;

  /**
   * How many calls landed in this bucket. At least one, per
   * {@link SpendBucket}, and a count of ROWS rather than of
   * measured ones — a call carrying neither magnitude is still a
   * call that was made.
   */
  readonly calls: number;

  /**
   * The prompt characters of the calls in this bucket that recorded
   * any, or null when none of them did.
   *
   * A SUM OVER THE MEASURED CALLS BESIDE A COUNT OF ALL OF THEM,
   * which is what makes this member and {@link SpendBucket.calls}
   * worth reading together: the two disagreeing is information
   * rather than a fault, and it says how much of the bucket was
   * measured at all.
   *
   * NULL RATHER THAN ZERO WHEN NOTHING WAS MEASURED, for the reason
   * {@link LlmCallRecord.promptChars} gives one table down. Zero is
   * a real reading, so an implementation coalescing an unmeasured
   * bucket to it would report a day of calls that sent nothing —
   * the same shape as a day nobody measured, and no member left to
   * tell them apart.
   */
  readonly promptChars: number | null;

  /**
   * The estimated tokens of the calls in this bucket that recorded
   * any, or null on the terms {@link SpendBucket.promptChars}
   * states.
   *
   * AN ESTIMATE SUMMED, WHICH IS STILL AN ESTIMATE. Nothing about
   * adding these up makes them a bill — the estimator is arithmetic
   * over the characters beside it, so this member and the one above
   * are one reading expressed twice at bucket scale exactly as they
   * are at row scale.
   */
  readonly estTokens: number | null;
}

/**
 * What narrows the runs page and the spend summary: a domain, or
 * nothing at all.
 *
 * A VALUE OBJECT RATHER THAN THE QUERY THE ROUTE PARSED, which is
 * the separation `StoreWindow` draws from `PaginationQuery` in
 * `src/http/schemas.ts`: one is what a caller asked for and the
 * other is what SQL is handed. `./routes.ts` and `./spend-routes.ts`
 * rebuild this shape member by member rather than forwarding a
 * parsed query, so a parameter added to the wire reaches this port
 * only when somebody adds it here too.
 *
 * ONE FILTER OVER TWO COLLECTIONS, and that is a claim rather than
 * a saving. `GET /runs` and `GET /spend/summary` narrow on the same
 * axis and are read by the same operator asking two halves of one
 * question, so a second filter type would be two places for the
 * narrowing to drift — and the summary reaches the column through a
 * join while the page reads it directly, which is exactly where two
 * declarations would come to disagree.
 *
 * THE MEMBER IS A NARROWING AND NOT A SCOPE, which is where this
 * port departs from `FindingFilter` and `DocumentFilter` one group
 * over. Those collections take their domain as a separate leading
 * parameter because they cannot be met outside one; `/runs` and
 * `/spend/summary` are deployment-wide, so the domain is optional
 * and omitting it widens.
 *
 * NO WINDOW MEMBER, though one of the two callers has a window.
 * {@link RunStore.summariseSpend} takes its `[since, until)` as a
 * separate parameter for the reason `FindingFilter` keeps its sort
 * out: {@link RunStore.listRuns} and {@link RunStore.countRuns}
 * read no window at all, and a filter carrying one would hand two
 * methods a member they have to ignore — which is the shape an
 * implementation comes to disagree with itself in.
 */
export interface RunFilter {
  /**
   * Answer only the runs of this domain, or absent for every run.
   *
   * ABSENT IS EVERY RUN INCLUDING THE DOMAIN-LESS ONES, per the
   * module header, and that is the default a page gets. Dropping
   * them would make `GET /runs` disagree with the table about how
   * much work the service has done.
   *
   * OPTIONAL `number` AND NEVER `number | null`, which is what
   * makes the domain-less runs unaskable-for on their own: there is
   * no value to send that means the ones belonging to nobody. The
   * module header records that as this wave's decision.
   *
   * An id, as `DomainStore.findDomainBySlug` resolved `?domain`
   * into before this port was called — so an unknown slug is a
   * `404` one layer up, and an id no domain carries is an empty
   * page rather than an error, nothing pointing at a row that is
   * not there.
   *
   * On {@link RunStore.summariseSpend} it narrows the same axis
   * through a join, `llm_calls` carrying no domain of its own. A
   * ledger row reaches a domain only through its run, so narrowing
   * here excludes every unattributed call — correctly, none of them
   * being this domain's.
   */
  readonly domainId?: number;
}

/**
 * Every database operation the runs and spend surfaces perform.
 *
 * SIX METHODS, ALL SIX READS. There is no seventh, and the module
 * header carries what the absence buys: no insert, no update, no
 * delete and no escape hatch, so an implementation is substitutable
 * by anything that can hold rows and a handler has nothing to write
 * with. That closure is also what makes the in-memory
 * implementation a genuine second implementation rather than a stub
 * covering the easy calls.
 *
 * TWO TABLES, THREE ROUTES, AND NO METHOD REACHED BY NOTHING. The
 * first two answer `GET /runs`, the next three answer
 * `GET /runs/:id`, and the last answers `GET /spend/summary`.
 *
 * Every method is asynchronous, including the ones an in-memory
 * implementation could answer synchronously. The port is shaped by
 * the caller that has to await a database, and a synchronous member
 * would be one drizzle could not satisfy.
 */
export interface RunStore {
  /**
   * Reads one window of the passes the service has made, narrowed
   * by the filter and ordered by {@link RunRecord.startedAt}
   * descending with {@link RunRecord.id} descending breaking a tie.
   *
   * THE ORDER IS PART OF THE CONTRACT, because a window over an
   * unordered read is not a page. Postgres promises nothing about
   * row order without an `ORDER BY`, so two requests for
   * consecutive pages may repeat one row and skip another while
   * every count on the wire still adds up. The module header
   * carries why both descending keys have to be spelled
   * `DESC NULLS LAST` and what a bare `DESC` costs silently.
   *
   * NEWEST FIRST, BECAUSE THE PAGE IS READ TO SEE WHAT JUST
   * HAPPENED. An operator reaching for this collection is asking
   * what the pipeline has been doing, and an ascending order would
   * put the first pass a long-running deployment ever made on page
   * one forever.
   *
   * @param filter - What to narrow to, or an empty filter for every
   *   run the service has made — the domain-scoped passes and the
   *   domain-less ticks alike. Narrowing here and in
   *   {@link RunStore.countRuns} is the same question asked twice,
   *   and an implementation answering the two through different
   *   predicates would put a page's `meta.total` at odds with the
   *   page.
   * @param window - `limit` and `offset`, as `toStoreWindow` in
   *   `src/http/schemas.ts` derived them from `?page`/`?perPage`.
   *   The window arrives already validated, so no implementation
   *   re-checks its bounds.
   * @returns The rows in that window, possibly empty. A window past
   *   the end, a deployment that has run nothing, a domain that has
   *   run nothing and an id no domain carries are all an empty list
   *   rather than an error: none of the four is a failure to read.
   */
  listRuns(
    filter: RunFilter,
    window: StoreWindow,
  ): Promise<readonly RunRecord[]>;

  /**
   * Counts the runs the same filter selects, ignoring any window.
   *
   * Separate from {@link RunStore.listRuns} rather than answered
   * beside it, because the two are different questions: a page's
   * total describes the collection and not the page. Splitting them
   * also keeps the list read free of a window function an in-memory
   * implementation could only imitate.
   *
   * @param filter - The same narrowing the list was read through.
   * @returns How many runs stand under it. An id no domain carries
   *   answers `0`, which is correct rather than a special case:
   *   nothing points at a row that is not there.
   */
  countRuns(filter: RunFilter): Promise<number>;

  /**
   * Looks one pass up by its id. Where every request naming
   * `/runs/:id` enters.
   *
   * TAKES NO DOMAIN, which is the addressing rule this surface
   * keeps: a domain is met by slug and everything else is written
   * by its id. {@link RunRecord.domainId} on the answer is how the
   * caller learns whose pass it was, and a null there is the
   * ordinary answer for a maintenance tick rather than a row that
   * failed to resolve.
   *
   * @param id - The id as `resourceIdParamSchema` in
   *   `src/http/schemas.ts` parsed it.
   * @returns The row, or null when no run carries that id. Null is
   *   neither an error nor a refusal: it is the fact from which the
   *   service decides a 404.
   */
  findRunById(id: number): Promise<RunRecord | null>;

  /**
   * Reads the head of one run's ledger: its model calls ordered by
   * {@link LlmCallRecord.calledAt} descending with
   * {@link LlmCallRecord.id} descending breaking a tie, cut at the
   * limit its caller passes.
   *
   * THE LIMIT IS THE CALLER'S AND THE CUT IS NOT SILENT. The module
   * header carries the arrangement: `./service.ts` passes
   * `RUN_LEDGER_CAP`, reads {@link RunStore.countRunLedger} beside
   * this, and answers a truncation flag from the two. An
   * implementation choosing its own limit would answer a short list
   * with nothing saying it was short.
   *
   * NEWEST FIRST, so what the cut drops is the OLDEST end of a long
   * pass. That is the useful half to lose — a reader opening a run
   * is asking what it has been doing lately — and it is why the
   * order is the contract rather than a presentation choice: a read
   * that forgot to order would cut an arbitrary subset and report
   * the same count beside it.
   *
   * @param runId - The {@link RunRecord.id} a read already
   *   returned. Ledger rows carry `run_id`, so this is the key
   *   available.
   * @param limit - How many rows to answer at most. Positive, and
   *   supplied rather than defaulted: there is no window here and
   *   no offset, the embedded ledger being the head of an ordering
   *   rather than a page a caller can move through.
   * @returns The rows newest first, at most `limit` of them and
   *   possibly empty. A pass that called nothing and an id no run
   *   carries are both an empty list rather than an error. Calls
   *   attributed to NO run are unreachable here, per the module
   *   header.
   */
  listRunLedger(
    runId: number,
    limit: number,
  ): Promise<readonly LlmCallRecord[]>;

  /**
   * Counts one run's model calls, ignoring any limit.
   *
   * THE FULL COUNT IS WHAT MAKES THE CUT REPORTABLE. It is the
   * number `./service.ts` answers beside the capped list and the
   * one it compares against `RUN_LEDGER_CAP` to say whether
   * anything was dropped, so a reader shown a short ledger is told
   * how much of it that is.
   *
   * @param runId - The run to count within.
   * @returns How many calls that pass ledgered. An id no run
   *   carries answers `0`, and so does a pass that called nothing:
   *   the two are the same fact from this method's side, and
   *   {@link RunStore.findRunById} is what separates them.
   */
  countRunLedger(runId: number): Promise<number>;

  /**
   * Aggregates the ledger over a window into one bucket per domain
   * per UTC day.
   *
   * COUNTS AND MAGNITUDES, NEVER CURRENCY, per the module header
   * and per {@link SpendBucket}: `calls`, `promptChars`,
   * `estTokens`, and no member behind which there is a price.
   *
   * EVERY ROW IN THE WINDOW IS COUNTED, including the calls of a
   * domain-less tick and the calls attributed to no run at all.
   * Both land in the bucket whose {@link SpendBucket.domainId} is
   * null, so the buckets' `calls` add up to the number of calls the
   * window holds — which is what stops a total taken from this
   * summary silently under-reporting. Narrowing by
   * {@link RunFilter.domainId} excludes them, correctly: none of
   * them is that domain's.
   *
   * ORDERED BY {@link SpendBucket.day} DESCENDING, THEN BY
   * {@link SpendBucket.domainId} ASCENDING WITH THE NULL BUCKET
   * LAST. Newest day first, matching every other time-ordered
   * collection on this surface bar the proposals queue. The order
   * is contracted because a listed answer needs one; the module
   * header carries why the `NULLS LAST` spelling the other orders
   * argue for does not apply to a sort above an aggregate, and why
   * an ascending key needs no qualifier in any case.
   *
   * @param filter - What to narrow to, or an empty filter for every
   *   call in the window. The domain is reached through a join to
   *   `runs`, `llm_calls` carrying none of its own.
   * @param window - The half-open `[sinceInclusive, untilExclusive)`
   *   span over {@link LlmCallRecord.calledAt}, as `toTimeWindow`
   *   in `src/http/schemas.ts` answered it. Half-open, so a call
   *   stamped exactly at the lower bound is IN and one at the upper
   *   is OUT — two adjacent windows that both took their shared
   *   boundary would double-count exactly at the seam a caller
   *   paging through time crosses most often.
   *
   *   Either bound may be `null` for unbounded, that being what the
   *   shared type admits. No request reaches here that way:
   *   `./spend-service.ts` defaults an absent window to a declared
   *   span and refuses one above a declared maximum, so an
   *   unbounded scan of the ledger is unreachable from the wire.
   *   Enforcing that here would put a route's rule in the half of
   *   the module that cannot be exercised without a database.
   * @returns The buckets in that order, possibly empty. A window in
   *   which nothing was called, a domain that called nothing and an
   *   id no domain carries are all an empty list rather than an
   *   error. There is no bucket for a day nothing landed on, per
   *   {@link SpendBucket}.
   */
  summariseSpend(
    filter: RunFilter,
    window: TimeWindow,
  ): Promise<readonly SpendBucket[]>;
}
