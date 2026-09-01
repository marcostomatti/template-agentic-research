/**
 * @packageDocumentation
 * The export subscription rules: reading what one domain has
 * standing requests for, adding one, retuning one and cancelling
 * one. What `/domains/:slug/exports` and `/exports/:id` reduce to
 * once HTTP is subtracted from them.
 *
 * FIVE FUNCTIONS, AND ONE OF THEM IS NOT AN ORDINARY RESOURCE
 * OPERATION. The first four are what every service on this surface
 * exports: a list, a create, a patch and a delete.
 * {@link runSubscriptionNow} is a separate act on a separate
 * column — what `POST /exports/:id/run-now` reduces to — writing
 * `next_run_at` through the one port method declared for it,
 * reading no body at all, and taking an injected clock that none
 * of the four takes anything of the kind of.
 *
 * SO THE CONTAINMENT MOVED WITH IT rather than going away. It is
 * no longer that this module cannot reach the due time; it is that
 * exactly ONE of the five derives an instant to write, and that it
 * writes through `SubscriptionStore.updateSubscriptionSchedule`
 * and through nothing else. The other four derive none,
 * `SubscriptionPatch` carries no such member, and both request
 * schemas refuse the key.
 *
 * THREE PORTS RATHER THAN TWO, which is the one place this module
 * differs from every service before it in SHAPE rather than in
 * subject. A subscription pairs a domain with a connector, so both
 * ends are resolved before either write lands, and
 * `SubscriptionStore` itself can read neither table — its own
 * header says so. The three are picked apart member by member, so
 * this module claims exactly the seven methods it issues.
 *
 * THE BODY IS PARSED HERE RATHER THAN ABOVE, exactly as every
 * wave-1 service argues: an operation handed an already-validated
 * input would have two callers validating it, the router today and
 * the MCP tool tomorrow, from a second schema nobody would notice
 * drifting. So {@link createSubscription} and
 * {@link patchSubscription} take an `unknown` and run it through
 * {@link parseBody}.
 *
 * THE WINDOW ARRIVES ALREADY DERIVED, and the asymmetry with the
 * body is the one `src/domains/service.ts` states. What a
 * subscription IS includes its format, its destination and its
 * cadence, so an operation that did not check them would not be the
 * operation; `?page` and `?perPage` are how a caller ASKED, a
 * vocabulary belonging to HTTP that an MCP tool would not spell at
 * all. `toStoreWindow` in `src/http/schemas.ts` owns that
 * translation and {@link listSubscriptions} takes its output.
 *
 * THE DOMAIN IS RESOLVED FIRST, ON THE TWO OPERATIONS THAT NAME
 * ONE. `SubscriptionStore` resolves no slug, so a `:slug` is turned
 * into a `DomainRecord` through `DomainStore.findDomainBySlug`
 * before any subscription is read or written, and a slug naming no
 * row is a 404 that costs `export_subscriptions` no read at all.
 * The other two operations name `/exports/:id` and no domain, so
 * there is nothing to resolve: the row carries its own `domainId`,
 * and the one rule that spans a domain is the database's.
 *
 * A `connectorId` NAMING NO ROW IS A 422 AND NOT A 404, and the
 * difference between it and the slug above is the difference
 * between an address and a payload. A `:slug` is where the request
 * was SENT, so a slug naming nothing means there is nothing at that
 * address; a `connectorId` is something the request SUBMITTED, so
 * an id naming nothing means one member of the body is wrong and
 * the refusal names it. `parentId` in
 * `src/taxonomy/categories-service.ts` is the same column shape
 * answered the same way, and the shared reason is that a caller can
 * act on a detail naming the member at fault where it cannot act on
 * a bare 404.
 *
 * THE CONNECTOR IS RESOLVED BEFORE BOTH WRITES THAT CAN NAME ONE,
 * through `ConnectorStore.findConnectorById`, which is what
 * `./store.ts` promises a deployment: the database is handed a live
 * id by every ordinary request, and the foreign key is left holding
 * only the race. Resolving it rather than translating the refusal
 * is what makes {@link patchSubscription} answer the same 422 for
 * the same fault as {@link createSubscription} — the update reaches
 * that key too, `connectorId` being patchable.
 *
 * FOUR MECHANISMS, AND THE BOUNDARY REACHES PAST TWO OF THEM.
 * `export_subscriptions` carries a unique key over the triple, a
 * CHECK on `format`, and a foreign key at each of the other two
 * thirds. The triple is the one this module translates, because it
 * is the one a caller can meet by asking for something reasonable.
 * The CHECK is unreachable from here —
 * {@link createSubscriptionSchema} and
 * {@link patchSubscriptionSchema} hold `format` to the tuple that
 * CHECK is generated from — so meeting one means the two have
 * drifted apart, which is a 500 rather than a status a rule chose.
 * Both foreign keys are unreachable for the ordinary request and
 * reachable only for a lost race.
 *
 * A TRIPLE THE DOMAIN ALREADY SUBSCRIBES TO IS A 409 FROM BOTH
 * WRITES THAT CAN PROPOSE ONE. `SubscriptionPatch` carries `format`
 * and `connectorId`, two thirds of the natural key, so a re-point
 * or a re-format can collide exactly as a create can and
 * {@link patchSubscription} translates the same refusal
 * {@link createSubscription} does rather than treating it as
 * unreachable.
 *
 * A FOREIGN-KEY REFUSAL IS THE LOST RACE, AND THE INSERT CAN LOSE
 * TWO. Both parents were read a moment earlier, so meeting either
 * key means the row went between the lookup and the write. The
 * update can reach only the connector key, `domainId` not being
 * patchable, so it is answered as what it is: the same 422
 * {@link requireConnector} raises, for the same fact. The insert
 * can reach either, and this layer does not read constraint names —
 * `src/db/store-errors.ts` states that rule for every service here
 * — so it answers the DOMAIN 404 for both. That misattributes the
 * rarer of the two, and it errs in the safer direction: a caller
 * told its address is gone re-reads the address, where a caller
 * told its body is wrong when the domain died would go looking at a
 * member that was correct. A retry then meets
 * {@link requireConnector} and is told which member to fix.
 *
 * `nextRunAt` IS REFUSED AS AN UNRECOGNIZED KEY ON BOTH WRITES,
 * which is the pipeline-owned-column rule
 * `docs/architecture/08-http-api.md` states, applied to the one
 * column on this table the dispatcher writes. It is `.strict()`
 * doing its ordinary work rather than a check of its own, which is
 * what makes the refusal hold for a column added later: it has to
 * be argued ONTO a request schema rather than quietly inherited by
 * one. `domainId` is refused by the same clause, and so is every
 * member of another table.
 *
 * A DELETE HERE HAS NO GUARD AND CANNOT BE REFUSED. Nothing in
 * schema v2 points at `export_subscriptions`, so there is no
 * dependent count to read and no `?cascade=confirm` for one to
 * authorise. It is also what CLEARS the refusal one port over: a
 * connector is held by the rows that name it, so cancelling here is
 * exactly what lets `DELETE /connectors/:id` land.
 *
 * NOTHING SUBMITTED REACHES A MESSAGE OR A DETAIL BUILT HERE. Every
 * message below is a constant of this module's own, and no
 * `StoreRefusal` field is copied into one: a driver error carries
 * the submitted values in its `detail` and the drizzle wrapper
 * carries the whole statement with its bound parameters, so quoting
 * either would put a submitted value on the wire and, through
 * `errorHandler`, in a log line.
 *
 * A `StoreRefusal` IS TRANSLATED AND NEVER RETHROWN AS ITSELF — for
 * the reasons it is declared a plain `Error` in
 * `src/db/store-errors.ts`. The reasons this port declares are
 * translated below and anything else is rethrown untouched, which
 * answers 500 rather than a plausible status no rule authorised.
 *
 * THE STORE IS A PARAMETER, so every rule here is exercisable with
 * no database: `tests/helpers/memory-research-store.ts` stands
 * behind all three ports over one dataset, which is what lets a
 * domain resolved through one of them own the subscriptions read
 * through another and refuse a connector id the third has never
 * stored.
 */
import type { SubscriptionRecord, SubscriptionStore } from './store.js';
import type { FieldError } from '../../lib/errors/index.js';
import type { ConnectorStore } from '../connectors/store.js';
import type { DomainRecord, DomainStore } from '../domains/store.js';
import type { StoreWindow } from '../http/schemas.js';

import { z } from 'zod';

import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../lib/errors/index.js';
import { EXPORT_FORMATS } from '../db/schema/values.js';
import { StoreRefusal } from '../db/store-errors.js';
import { parseBody } from '../http/validation.js';

/**
 * Exactly the port methods these five functions reach, across the
 * three ports they reach them on.
 *
 * A `Pick` OF THREE PORTS RATHER THAN ANY ONE WHOLE, for the
 * reasons `CategoryServiceStore` in
 * `src/taxonomy/categories-service.ts` gives, over one more port
 * than it has. Resolving a slug is one method of `DomainStore` and
 * resolving a connector id is one method of `ConnectorStore`, and
 * asking for either port whole would have this module claim to need
 * the writes it never issues — including, on the connectors side,
 * the delete these very rows refuse.
 *
 * THE THREE ARE PICKED AND NOT UNIONED FOR A SECOND REASON HERE.
 * `tests/helpers/memory-research-store.ts` implements all eight
 * ports at once, so a test can hand this module the whole store
 * either way; what the narrow type buys is the reading a reviewer
 * gets from the declaration alone, that a subscriptions operation
 * cannot reach a connector write.
 *
 * TWO METHODS OF `SubscriptionStore` ARE HERE FOR ONE FUNCTION.
 * `findSubscriptionById` and `updateSubscriptionSchedule` are
 * {@link runSubscriptionNow}'s alone. That verb decides on the
 * STORED row's `enabled` before it writes, which the four ordinary
 * operations never do — {@link patchSubscription} and
 * {@link deleteSubscription} let the store answer `null` for an id
 * no row carries rather than buying a second round trip — and it
 * is the one function on this surface permitted through the
 * column's single door.
 *
 * NAMING THEM WIDENS WHAT THE OTHER FOUR HOLD, which is the cost
 * of one type standing for five functions and is stated rather
 * than hidden: a router handed this type hands every handler a
 * store that CAN write `next_run_at`. What keeps four of the five
 * off the column is that they derive no instant to write, and
 * `tests/invariants/api-schedule-containment.test.ts` reads the
 * modules rather than the types. A second `Pick` for the verb
 * alone would buy a narrower declaration and a second thing to
 * keep in step.
 *
 * Built with `Pick` rather than by listing signatures, so a method
 * here cannot drift from the thing it is naming: a hand-copied
 * signature would go on type-checking against a port that had moved
 * under it.
 */
export type SubscriptionServiceStore =
  Pick<DomainStore, 'findDomainBySlug'>
  & Pick<ConnectorStore, 'findConnectorById'>
  & Pick<
    SubscriptionStore,
    | 'countSubscriptions'
    | 'deleteSubscription'
    | 'findSubscriptionById'
    | 'insertSubscription'
    | 'listSubscriptions'
    | 'updateSubscription'
    | 'updateSubscriptionSchedule'
  >;

/**
 * What a caller is told when no domain carries the slug it named.
 *
 * The slug is not in it, per this module's header, and the same
 * sentence every service on this surface answers for its own
 * `:slug` — spelled again rather than imported, because they are
 * equal by intent rather than by derivation and any of them is free
 * to change without dragging the others with it.
 */
const NO_SUCH_DOMAIN = 'No domain carries that slug';

/**
 * What a caller is told when no subscription carries the id it
 * named.
 *
 * Names the resource in full rather than as a subscription, because
 * this surface answers under `/exports` while the table is
 * `export_subscriptions` and the directory is `src/subscriptions/`:
 * a caller reading this sentence has just addressed `/exports/:id`,
 * so the noun it meets should be the one it would search the API
 * documentation for.
 */
const NO_SUCH_SUBSCRIPTION = 'No export subscription carries that id';

/**
 * What a caller is told when the triple it proposed is taken.
 *
 * Names all three parts of the key rather than the format, because
 * two thirds of it are patchable and either is what a caller may
 * have moved. A sentence naming the format alone would send an
 * operator looking for a collision that is not there — a domain
 * taking one format to two connectors is ordinary, and so is a
 * domain taking two formats to one.
 */
const ALREADY_SUBSCRIBED
  = 'This domain already exports that format to that connector';

/**
 * What a caller is told when a run now meets a disabled
 * subscription.
 *
 * The rule and the repair, because the repair is a different
 * request rather than a correction to this one: `enabled` is
 * patchable, so enabling the subscription is a `PATCH` the caller
 * takes first as its own decision. The alternative — writing the
 * clock anyway — produces a row that looks due forever and is
 * never claimed, since the dispatch claim reads `WHERE enabled AND
 * next_run_at <= now()` and
 * `export_subscriptions_dispatch_claim_idx` is declared over the
 * enabled rows alone. That is a silent no-op the caller has no way
 * to see, which is what this sentence exists instead of.
 *
 * The same sentence `src/topics/service.ts` answers for the same
 * state on the other schedulable table, spelled again rather than
 * shared: the two groups are equal by intent rather than by
 * derivation, exactly as {@link NO_SUCH_DOMAIN} is.
 */
const SUBSCRIPTION_NOT_ENABLED
  = 'This subscription is disabled, so a run now would never be claimed';

/**
 * What the one detail of a `connectorId` refusal says.
 *
 * The rule and not the id: the number the caller sent is the one
 * thing this module could quote back and the one thing its header
 * forbids, and a caller reading this already knows which id it
 * submitted.
 */
const NO_SUCH_CONNECTOR = 'No connector carries that id';

/**
 * The member a `connectorId` refusal names, so a caller is told
 * which one of six to fix.
 */
const CONNECTOR_FIELD = 'connectorId';

/**
 * The code that detail carries, alongside the zod issue codes every
 * other detail on this surface answers with.
 *
 * Its own code rather than one of zod's, because no zod issue
 * describes it: the shape was legal and the value was a positive
 * integer, and what failed is a question only the store could
 * answer. `unknown_parent` in `src/taxonomy/categories-service.ts`
 * and `masked_secret` in `src/connectors/service.ts` are the two
 * precedents, and all three are snake_case so that a client
 * branching on `code` reads one vocabulary.
 */
const UNKNOWN_CONNECTOR_CODE = 'unknown_connector';

/**
 * The message a validation refusal built here carries, matching the
 * one `src/http/validation.ts` puts on the refusals zod raises.
 *
 * One sentence for both, so a client reading `message` cannot tell
 * a shape fault from a reference fault and has to read `details` —
 * which is where this surface says everything it says about a body.
 */
const VALIDATION_FAILED = 'Validation failed';

/**
 * How often a subscription may deliver, in seconds, as both writes
 * spell it.
 *
 * A positive integer and nothing more, which is
 * `intervalSecondsSchema`'s rule in `src/topics/service.ts` for the
 * same five columns of the same `schedulableColumns()` helper. Zero
 * is the value this refusal exists for: a subscription whose
 * interval is zero is not one that delivers slowly but one
 * `ar-dispatch` finds due again the moment it finishes, and the
 * cost of that is a delivery per tick for as long as nobody
 * notices. A negative interval is the same row read backwards.
 *
 * Declared once and reused by all three members rather than written
 * out per column, so a floor and a ceiling cannot end up held to a
 * different rule from the cadence they bound. The two bounds add
 * `.nullable()` on top of it, which is the only difference between
 * them and `intervalSeconds`.
 */
const intervalSecondsSchema = z.number().int()
  .positive();

/**
 * What a body may carry as the connector it delivers to.
 *
 * A row id, so the shape is what an id can be and nothing more:
 * whether the connector is THERE is a question about rows, which
 * {@link requireConnector} asks a moment later and answers with a
 * detail naming this same member. The two refusals differ in their
 * `code` alone, which is what lets a client tell a malformed id
 * from an id that named nothing while branching on one field.
 */
const connectorIdSchema = z.number().int()
  .positive();

/**
 * What a body may carry as the format it renders.
 *
 * `EXPORT_FORMATS` rather than five literals, so this schema and
 * `export_subscriptions_format_check` are two readings of one
 * tuple: a member added to it reaches both without either being
 * edited, and a member removed from it makes this surface unable to
 * write a format the column would refuse. That is what puts the
 * CHECK out of reach from here and makes a `check-violation` a 500.
 *
 * An enum answers `invalid_value` and its detail names the allowed
 * OPTIONS rather than the value submitted, which
 * `src/http/validation.ts` measured — so a caller is told what the
 * five are without being told back what it sent. It answers that
 * same code for an ABSENT member, where a string would answer
 * `invalid_type`, and for an explicit `null`.
 *
 * Declared for both writes rather than one, unlike
 * `connectorKindSchema` in `src/connectors/service.ts`: `format` is
 * patchable here for the reason `SourcePatch.kind` is patchable, so
 * there is a second call site to hold to the same set.
 */
const subscriptionFormatSchema = z.enum(EXPORT_FORMATS);

/**
 * The body `POST /domains/:slug/exports` accepts.
 *
 * Strict, like every request schema on this surface, so a misspelt
 * member is a refusal rather than a silently dropped one — and, on
 * this table, so that `nextRunAt` is refused by the same clause
 * that refuses a typo.
 *
 * `format` AND `connectorId` ARE BOTH REQUIRED, because they are
 * two thirds of the row's natural key and neither has a default
 * worth inventing. A create with no format is a delivery that says
 * nothing about what it delivers; a create with no connector is one
 * that says nothing about where.
 *
 * `enabled` IS OPTIONAL AND DEFAULTS TO TRUE in
 * {@link createSubscription} rather than here, which is what lets a
 * subscription be staged switched off. The port asks for it that
 * way — `InsertSubscriptionInput` requires the member so that no
 * implementation gets to decide what an absence means.
 *
 * The two bounds are OPTIONAL AND NULLABLE, which distinguishes two
 * requests where a patch of the same members distinguishes three.
 * On a create there is nothing stored to leave alone, so an absent
 * bound and an explicit `null` mean one thing — no floor, no
 * ceiling — and {@link createSubscription} folds them together.
 *
 * `domainId` is absent, and deliberately: the path names the
 * domain, and a body member naming a second one would be a request
 * that could disagree with its own URL. `nextRunAt` is absent per
 * this module's header, so a subscription is created unscheduled
 * and no body can say otherwise.
 */
export const createSubscriptionSchema = z.object({
  format: subscriptionFormatSchema,
  connectorId: connectorIdSchema,
  intervalSeconds: intervalSecondsSchema,
  enabled: z.boolean().optional(),
  minIntervalSeconds: intervalSecondsSchema.nullable().optional(),
  maxIntervalSeconds: intervalSecondsSchema.nullable().optional(),
}).strict();

/**
 * The body `PATCH /exports/:id` accepts.
 *
 * Every member optional, so a patch carrying nothing at all is a
 * legal call answering the stored row — which `SubscriptionStore`
 * states rather than leaving to its implementations, since
 * `export_subscriptions` carries no `updated_at` for a write to
 * stamp and an empty update list is something drizzle throws on.
 *
 * TWO THIRDS OF THE NATURAL KEY ARE PATCHABLE HERE, which is what
 * puts `export_subscriptions_domain_id_format_connector_id_unique`
 * on the update as well as the insert and so what makes
 * {@link patchSubscription} translate a duplicate at all. `format`
 * is patchable because nothing outside the row reads it — it
 * selects the renderer that runs for THIS subscription — and
 * `connectorId` is patchable because the `ON DELETE no action` on
 * that key exists, in the words of `src/db/schema/scheduling.ts`,
 * to make re-pointing the explicit step it is.
 *
 * THE TWO BOUNDS DISTINGUISH THREE REQUESTS HERE, which is the
 * whole difference from the create above and the reason they are
 * declared `.nullable().optional()` in both places and folded in
 * only one. Absent leaves the stored bound alone; a number sets it;
 * `null` clears it, which is the only way to remove a floor or a
 * ceiling and would be unexpressible if absent and null meant the
 * same thing. {@link patchSubscription} hands the parsed patch
 * straight to the port for that reason: a `??` anywhere between
 * here and the store would collapse the two.
 *
 * `domainId` is absent, so a subscription cannot be moved between
 * domains: it is a request ABOUT the material its domain produces,
 * and a move would carry it to another domain's. `nextRunAt` is
 * absent per this module's header.
 */
export const patchSubscriptionSchema = z.object({
  format: subscriptionFormatSchema.optional(),
  connectorId: connectorIdSchema.optional(),
  intervalSeconds: intervalSecondsSchema.optional(),
  enabled: z.boolean().optional(),
  minIntervalSeconds: intervalSecondsSchema.nullable().optional(),
  maxIntervalSeconds: intervalSecondsSchema.nullable().optional(),
}).strict();

/**
 * One page of a domain's export subscriptions, beside the size of
 * the collection it was read from.
 *
 * Two members rather than a rendered envelope, for the reason
 * `DomainPage` in `src/domains/service.ts` gives: building `meta`
 * is the router's half, and this module was never told what the
 * window was in `page`/`perPage` terms.
 */
export interface SubscriptionPage {
  /**
   * The rows the window selected, format ascending with the
   * connector id ascending beside it.
   */
  readonly rows: readonly SubscriptionRecord[];

  /** How many subscriptions the domain holds, ignoring the window. */
  readonly total: number;
}

/**
 * Which write raised a refusal, which is the only thing separating
 * the two foreign keys this table carries.
 *
 * See this module's header: an update can reach only the connector
 * key and an insert can reach either, and the two mean different
 * things to a caller. There is no `delete` member, unlike
 * `CategoryWrite` in `src/taxonomy/categories-service.ts`: nothing
 * points at `export_subscriptions`, so the delete below has no
 * refusal to translate.
 */
type SubscriptionWrite = 'insert' | 'update';

/**
 * Builds the 422 a `connectorId` naming no row answers with.
 *
 * @param cause - The refusal being translated, where one is being
 *   translated. Absent on the ordinary path, where
 *   {@link requireConnector} found no row and nothing was thrown
 *   for this to wrap.
 * @returns The refusal to throw.
 *
 * @remarks
 * ONE SENTENCE FOR THE LOOKUP AND FOR THE LOST RACE, which is what
 * makes the pre-flight read a convenience rather than a second
 * rule: both mean the same thing to a caller, that the id in its
 * body names no connector, and answering them differently would
 * tell a caller its retry had met a different fault when it had met
 * the same one.
 *
 * The array is built per call rather than shared from a module
 * constant, so nothing a handler or a serialiser does to one
 * refusal's details can reach the next one's.
 */
function unknownConnectorRefusal(cause?: StoreRefusal): ValidationError {
  const details: FieldError[] = [{
    field: CONNECTOR_FIELD,
    message: NO_SUCH_CONNECTOR,
    code: UNKNOWN_CONNECTOR_CODE,
  }];

  return new ValidationError(VALIDATION_FAILED, details, { cause });
}

/**
 * Turns what the store refused into what the caller is told.
 *
 * @param err - Whatever the store threw.
 * @param write - Which call threw it, which is the only thing
 *   separating the two foreign keys.
 * @returns Never; every path throws.
 * @throws ConflictError - For a triple the domain already
 *   subscribes to, from a create and from a re-point alike.
 * @throws ValidationError - For a `connectorId` naming no row,
 *   which on this path is the connector having gone between the
 *   lookup and the write.
 * @throws NotFoundError - For a `domainId` naming no row, which is
 *   the domain having gone between the lookup and the write, and
 *   which an insert cannot tell from the case above. See this
 *   module's header for why it answers the wider of the two.
 * @throws The original error, unchanged, when it is not a
 *   `StoreRefusal` or carries a reason this translation does not
 *   name. A `check-violation` is the one worth calling out: both
 *   schemas hold `format` to the tuple the CHECK is generated from,
 *   so meeting one means the two have drifted, and 500 is the
 *   honest status for a fault no caller can act on.
 *
 * @remarks
 * The `write` argument does what `CategoryWrite` does one directory
 * over and for a related reason, though the ambiguity is on the
 * other side of the call. There, one constraint name covers two
 * faults wearing two statuses; here, two constraint names cover two
 * faults wearing two statuses and this layer reads no constraint
 * name — so the discriminator that is available is which call was
 * made.
 */
function refuseWrite(err: unknown, write: SubscriptionWrite): never {
  if (!(err instanceof StoreRefusal)) {
    throw err;
  }

  if (err.reason === 'unique-violation') {
    throw new ConflictError(ALREADY_SUBSCRIBED, undefined, {
      cause: err,
    });
  }

  if (err.reason === 'foreign-key-violation') {
    if (write === 'update') {
      throw unknownConnectorRefusal(err);
    }

    throw new NotFoundError(NO_SUCH_DOMAIN, undefined, { cause: err });
  }

  throw err;
}

/**
 * Resolves the `:slug` an exports collection path opens with.
 *
 * @param store - Where the domain is read.
 * @param slug - The natural key, already narrowed by
 *   `slugParamSchema` at whichever boundary the request entered.
 * @returns The domain row, for its id.
 * @throws NotFoundError - When no domain carries the slug.
 *
 * @remarks
 * Private, and its message is this module's own. Every service on
 * this surface keeps the identical helper unexported for exactly
 * this reason: a shared one would put one route group's wording on
 * another's refusals, and they are free to diverge the moment any
 * of them has something of its own to say. It is the same sentence
 * today, which is them agreeing rather than them being one.
 */
async function requireDomain(
  store: SubscriptionServiceStore,
  slug: string,
): Promise<DomainRecord> {
  const row = await store.findDomainBySlug(slug);

  if (row === null) {
    throw new NotFoundError(NO_SUCH_DOMAIN);
  }

  return row;
}

/**
 * Resolves the connector a body names, or refuses the body.
 *
 * @param store - Where the connector is read.
 * @param connectorId - The id the body carried, already narrowed to
 *   a positive integer by whichever schema parsed it.
 * @returns Nothing. What the caller needs is that the row is THERE
 *   — the id it already has is what the write stores — so this
 *   reads for existence and answers no record.
 * @throws ValidationError - When no connector carries the id, with
 *   one detail naming `connectorId`.
 *
 * @remarks
 * `ConnectorStore.findConnectorById` ANSWERS A ROW AND THIS
 * DISCARDS IT, which is deliberate rather than wasteful. The port
 * has no cheaper existence read, and taking the record here would
 * invite a later rule to branch on the connector's `kind` — the
 * pairing of a format with a family of service is a question
 * `src/exports/` will answer when the renderers land, and answering
 * it half here would put the rule in two places.
 *
 * THE ROW IS NOT MASKED AND IS NOT ANSWERED, so this module never
 * holds a connector `config` at all. That is the containment
 * `src/connectors/service.ts` argues for its own answers, reached
 * here by not asking: `maskConnectorConfig` is not imported and no
 * subscription response has a config-shaped member for one to leak
 * through.
 */
async function requireConnector(
  store: SubscriptionServiceStore,
  connectorId: number,
): Promise<void> {
  const row = await store.findConnectorById(connectorId);

  if (row === null) {
    throw unknownConnectorRefusal();
  }
}

/**
 * Reads one window of a domain's export subscriptions.
 *
 * @param store - Where the domain and its subscriptions are read.
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
 * difference between a domain subscribing to nothing and a domain
 * that is not there. `SubscriptionStore.listSubscriptions` answers
 * an empty list for an id no row carries and `countSubscriptions`
 * answers `0`, both of them correctly — nothing points at a row
 * that is not there — so a caller issuing the two reads alone could
 * not tell the two states apart, and a mistyped slug would read as
 * a domain whose deliveries somebody had cancelled.
 *
 * The two reads are issued together rather than in sequence, for
 * the reason `listDomains` gives: a page's rows and the
 * collection's size are independent questions, and awaiting them
 * one after the other would make every list request pay two round
 * trips to answer one body.
 *
 * NO CONNECTOR IS READ AND NONE IS RESOLVED. A row answers the id
 * it stores, so a caller wanting to know where a delivery goes
 * reads `GET /connectors` — which is one request for the whole page
 * rather than one per row, and which is the surface that masks a
 * config. This read joins nothing.
 *
 * A window past the end of the collection is an empty page rather
 * than a 404. The collection exists and only the window over it is
 * empty, which a caller can see from `meta` once the router has
 * built one.
 */
export async function listSubscriptions(
  store: SubscriptionServiceStore,
  slug: string,
  window: StoreWindow,
): Promise<SubscriptionPage> {
  const domain = await requireDomain(store, slug);
  const [rows, total] = await Promise.all([
    store.listSubscriptions(domain.id, window),
    store.countSubscriptions(domain.id),
  ]);

  return { rows, total };
}

/**
 * Adds one export subscription to a domain, UNSCHEDULED.
 *
 * @param store - Where the domain and the connector are read and
 *   the subscription written.
 * @param slug - The domain's natural key.
 * @param body - The unvalidated request body, or the arguments an
 *   MCP tool was called with.
 * @returns The stored row, read back rather than reconstructed, so
 *   the id is the database's own and `nextRunAt` is the null the
 *   write actually landed.
 * @throws ValidationError - When the body does not satisfy
 *   {@link createSubscriptionSchema}, with one detail per fault;
 *   and when its `connectorId` names no connector.
 * @throws NotFoundError - When no domain carries the slug, and when
 *   the domain went away between the lookup and the write.
 * @throws ConflictError - When the domain already exports that
 *   format to that connector.
 *
 * @remarks
 * A SUBSCRIPTION IS CREATED UNSCHEDULED AND NOTHING HERE CAN CHANGE
 * THAT. `InsertSubscriptionInput` carries no `nextRunAt`, so the
 * row lands with a null due time whatever was submitted, and
 * scheduling it is the separate act `POST /exports/:id/run-now`
 * performs. The cost is stated rather than hidden: a subscription
 * created and never run-now-ed sits at null and delivers nothing,
 * and `docs/architecture/08-http-api.md` is where the surface says
 * so.
 *
 * THE ORDER OF THE THREE STEPS IS THE MODULE'S WHOLE POSITION ON
 * WHAT OUTRANKS WHAT, and each step is what the next one needs. The
 * body is parsed first, so a malformed body is a 422 whether or not
 * the domain exists: the shape of a body is a fact about the
 * request alone, and answering the same body a 422 or a 404
 * depending on what happens to be stored would make a caller's
 * error depend on rows it never asked about. The domain is resolved
 * second because the insert NEEDS its id, so that read is a data
 * dependency rather than a precedence choice. The connector is
 * resolved third and last, so an unknown connector under an unknown
 * slug answers the slug — which is the same reading that makes the
 * address outrank the payload everywhere else on this surface.
 *
 * THE OMISSIONS BECOME VALUES HERE rather than in the schema or at
 * the column. `enabled` becomes true and the two bounds fold
 * `undefined` and `null` together, which is what
 * `InsertSubscriptionInput` requiring every member asks for: a
 * default is a decision about what an absence means, and leaving
 * one to the column would make the drizzle implementation quietly
 * right and the in-memory one quietly wrong, since only one of the
 * two has a column to default from.
 *
 * ASSERTS A NEW ROW AND DOES NOT UPSERT, though
 * `src/db/schema/scheduling.ts` describes the natural key as one a
 * seed pass would upsert on. A `POST` is a caller stating that the
 * domain does not take that format at that destination yet, so a
 * duplicate is a 409 rather than a silent rewrite of a cadence
 * somebody tuned. No seed writes this table today, so this is its
 * only create.
 *
 * The insert is `return await` inside the `try` rather than a bare
 * `return`: returning the promise unawaited would settle it outside
 * this block, the `catch` would never run, and every duplicate
 * triple in the deployment would answer 500 with the file still
 * reading as if it handled one.
 */
export async function createSubscription(
  store: SubscriptionServiceStore,
  slug: string,
  body: unknown,
): Promise<SubscriptionRecord> {
  const input = parseBody(createSubscriptionSchema, body);
  const domain = await requireDomain(store, slug);

  await requireConnector(store, input.connectorId);

  try {
    return await store.insertSubscription({
      domainId: domain.id,
      format: input.format,
      connectorId: input.connectorId,
      intervalSeconds: input.intervalSeconds,
      enabled: input.enabled ?? true,
      minIntervalSeconds: input.minIntervalSeconds ?? null,
      maxIntervalSeconds: input.maxIntervalSeconds ?? null,
    });
  } catch (err) {
    return refuseWrite(err, 'insert');
  }
}

/**
 * Rewrites the supplied members of one export subscription.
 *
 * @param store - Where the connector is read and the row written.
 * @param id - The subscription's id, as `resourceIdParamSchema` in
 *   `src/http/schemas.ts` parsed it.
 * @param body - The unvalidated patch.
 * @returns The stored row afterwards.
 * @throws ValidationError - When the body does not satisfy
 *   {@link patchSubscriptionSchema}, with one detail per fault; and
 *   when a `connectorId` it carries names no connector.
 * @throws NotFoundError - When no subscription carries the id.
 * @throws ConflictError - When the resulting triple is one the
 *   subscription's domain already carries on another row.
 *
 * @remarks
 * THE PARSED PATCH IS HANDED STRAIGHT TO THE PORT, with no
 * defaulting step between the two, and that is load-bearing rather
 * than terse. `SubscriptionPatch` distinguishes an absent bound
 * from an explicit `null`, so a `??` here would collapse the two
 * and make clearing a floor unexpressible from this surface — the
 * member would arrive as a number that was never submitted. The
 * create above folds them together because it has nothing stored to
 * leave alone; this one must not.
 *
 * THE CONNECTOR IS RESOLVED ONLY WHEN THE PATCH NAMES ONE, so a
 * patch retuning a cadence issues no connector read at all. That is
 * what the `undefined` check below is for, and it is not an
 * optimisation: resolving an absent member would mean reading a
 * connector whose id this module would have to fetch from the
 * stored row first, which is a read the port does not need and a
 * rule nobody asked for.
 *
 * NO SUBSCRIPTION IS READ AND NO DOMAIN IS RESOLVED.
 * `PATCH /exports/:id` addresses the row directly, and the rule
 * that spans a domain — the triple unique within it — is checked
 * against the domain the STORED row is in, which
 * `SubscriptionPatch` refusing to carry `domainId` is what
 * guarantees. `SubscriptionStore.updateSubscription` answers `null`
 * for an id no row carries, so a preceding lookup would buy a
 * second round trip and a second chance for the row to go in
 * between; the 404 below is the same fact either way. That is why
 * this operation issues no lookup of its own, where
 * {@link runSubscriptionNow} — which has to read the stored
 * `enabled` before it can decide anything — issues one.
 *
 * SO AN UNKNOWN CONNECTOR OUTRANKS AN UNKNOWN ID HERE, where on the
 * create an unknown slug outranks an unknown connector. The two
 * orderings are not a policy pointing both ways: the create
 * resolves its address because it needs the id, and this one never
 * resolves its address at all — the store's own `null` reports it,
 * which happens at the write and therefore last.
 *
 * A patch carrying no member at all is legal and answers the stored
 * row, which is the port's rule rather than this module's:
 * `export_subscriptions` has no `updated_at`, so an empty patch has
 * literally nothing to set.
 *
 * The edit takes effect on the following delivery and there is
 * nothing here to announce afterwards — including when the cadence
 * itself moved. `ar-dispatch` reads `interval_seconds` inside the
 * claim it reschedules with, so a new cadence is in force from the
 * next tick without this module touching `next_run_at`, which it
 * could not do in any case.
 */
export async function patchSubscription(
  store: SubscriptionServiceStore,
  id: number,
  body: unknown,
): Promise<SubscriptionRecord> {
  const patch = parseBody(patchSubscriptionSchema, body);

  if (patch.connectorId !== undefined) {
    await requireConnector(store, patch.connectorId);
  }

  let updated: SubscriptionRecord | null;

  try {
    updated = await store.updateSubscription(id, patch);
  } catch (err) {
    return refuseWrite(err, 'update');
  }

  if (updated === null) {
    throw new NotFoundError(NO_SUCH_SUBSCRIPTION);
  }

  return updated;
}

/**
 * Cancels one export subscription.
 *
 * @param store - Where the row is removed.
 * @param id - The subscription's id.
 * @returns Nothing. The router answers 204, because a deleted
 *   resource has no representation to carry.
 * @throws NotFoundError - When no subscription carries the id.
 *
 * @remarks
 * NOTHING HANGS OFF A SUBSCRIPTION — no foreign key in schema v2
 * points at `export_subscriptions`, read off the generated SQL
 * rather than the schema — so this delete has neither a guard nor a
 * cascade and cannot be refused. There is no `?cascade=confirm`
 * here and nothing for one to authorise, which is the difference
 * from `DELETE /connectors/:id`: a connector is pointed at, by
 * these very rows, and a subscription is not. A rendered digest is
 * not a counter-example — `briefings` carries no `subscription_id`,
 * so what was produced survives the subscription that asked for it
 * as stored text rather than as a reference.
 *
 * CANCELLING HERE IS WHAT CLEARS THE REFUSAL ONE PORT OVER.
 * `ConnectorStore.deleteConnector` is refused while any
 * subscription names its row, so retiring a destination means
 * cancelling or re-pointing the deliveries first — which is the
 * explicit step `src/db/schema/scheduling.ts` says the
 * `ON DELETE no action` exists to force, and this is one of its two
 * answers. Re-pointing is the other, through
 * {@link patchSubscription}.
 *
 * A DELETE AND A SUSPEND ARE DIFFERENT OPERATIONS, and the surface
 * offers both because it means both. `enabled: false` through
 * {@link patchSubscription} keeps the format, the destination and
 * the cadence and stops the subscription coming due; this removes
 * them. Neither reaches work already dispatched: the dispatcher
 * claims a row and commits its reschedule in one transaction, so by
 * the time a delete can take the row the render it claimed for has
 * already gone out.
 */
export async function deleteSubscription(
  store: SubscriptionServiceStore,
  id: number,
): Promise<void> {
  const removed = await store.deleteSubscription(id);

  if (!removed) {
    throw new NotFoundError(NO_SUCH_SUBSCRIPTION);
  }
}

/**
 * Brings one subscription's next delivery forward to now.
 *
 * @param store - Where the row is read and written.
 * @param now - Reads the present. A thunk, so the instant is
 *   resolved at the moment of the write rather than when the
 *   dependency was assembled — and so a test can put a fixed one
 *   behind it and compare the stored value exactly.
 * @param id - The subscription's id, as `resourceIdParamSchema` in
 *   `src/http/schemas.ts` parsed it.
 * @returns The stored row afterwards, whose `nextRunAt` is the
 *   instant `now` answered.
 * @throws NotFoundError - When no subscription carries the id, and
 *   when the row went between the read and the write.
 * @throws ConflictError - When the subscription is disabled.
 *
 * @remarks
 * WRITES `next_run_at` AND NOTHING ELSE. There is no second write
 * here: the verb does not enable the row it refuses, does not
 * touch the cadence and does not stamp anything, because
 * `SubscriptionStore.updateSubscriptionSchedule` takes a bare
 * instant and offers no member a second column could be added to.
 * That port method declares it refuses nothing — no mechanism on
 * `export_subscriptions` constrains the column, and a time in the
 * past is an overdue row rather than an invalid one — so there is
 * no {@link refuseWrite} on this path, and a `StoreRefusal` out of
 * it would be a store doing something its port does not describe,
 * answering 500.
 *
 * A DISABLED SUBSCRIPTION IS A `409` RATHER THAN A WRITE, and the
 * reason is that the write would appear to succeed. See
 * {@link SUBSCRIPTION_NOT_ENABLED}: the row is excluded from the
 * partial index the dispatch claim walks, so the instant written
 * onto it would sit there looking due forever. Suspending a
 * delivery and cancelling one are the two things a disabled row
 * may be waiting for, and neither is undone quietly by a request
 * that asked for something else.
 *
 * IT DOES NOT DELIVER ANYTHING, and the name is the shortest
 * honest one available rather than a promise. `ar-dispatch` holds
 * the only schedule trigger in the system: it wakes on its own
 * cron, takes what has come due with `FOR UPDATE SKIP LOCKED`,
 * opens the `runs` row and invokes the workflow. This moves one
 * timestamp so that the next tick picks the row up, which is why
 * there is no delivery to report back and nothing here to await.
 *
 * CALLING IT TWICE IS NOT REFUSED. A row already due answers again
 * with whatever the clock reads then, because the verb describes a
 * state — due now — rather than an action taken, and refusing the
 * second call would answer `409` to a request asking for what
 * already holds. That is the difference from the refusal above,
 * which is about a state the write could not reach.
 *
 * TWO READS, SEQUENTIAL, AND NEITHER IS FOLDED INTO THE OTHER. The
 * first answers the `enabled` this verb decides on, which no write
 * reports; the second IS the write, and its own `null` is the row
 * having gone between the two. Both are spelled here rather than
 * behind private helpers, which at one call site apiece would name
 * the steps without moving them: a pause verb under `/exports`
 * would be the second caller that earns a pair, and there is none.
 */
export async function runSubscriptionNow(
  store: SubscriptionServiceStore,
  now: () => Date,
  id: number,
): Promise<SubscriptionRecord> {
  const subscription = await store.findSubscriptionById(id);

  if (subscription === null) {
    throw new NotFoundError(NO_SUCH_SUBSCRIPTION);
  }

  if (!subscription.enabled) {
    throw new ConflictError(SUBSCRIPTION_NOT_ENABLED);
  }

  const written = await store.updateSubscriptionSchedule(id, now());

  if (written === null) {
    throw new NotFoundError(NO_SUCH_SUBSCRIPTION);
  }

  return written;
}
