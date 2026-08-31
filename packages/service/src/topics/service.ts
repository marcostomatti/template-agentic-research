/**
 * @packageDocumentation
 * The topic rules: reading one domain's topics, adding one,
 * retuning one, and taking one away. What
 * `/domains/:slug/topics` and `/topics/:id` reduce to once HTTP is
 * subtracted from them.
 *
 * FOUR FUNCTIONS HERE AND TWO MORE TO COME, which is the one place
 * this module differs from its wave-1 siblings in SHAPE rather
 * than in subject. The four below are the ordinary resource
 * operations `src/personas/service.ts` also exports; the two
 * schedule verbs behind `POST /topics/:id/run-now` and
 * `POST /topics/:id/pause` are a separate act on a separate column
 * and land beside these. Nothing here reads or writes
 * `next_run_at`, and the reason is structural rather than a
 * convention: {@link TopicServiceStore} does not `Pick` the one
 * port method that writes it.
 *
 * THE BODY IS PARSED HERE RATHER THAN ABOVE, exactly as all three
 * wave-1 services argue: an operation handed an already-validated
 * input would have two callers validating it, the router today and
 * the MCP tool tomorrow, from a second schema nobody would notice
 * drifting. So {@link createTopic} and {@link patchTopic} take an
 * `unknown` and run it through {@link parseBody}.
 *
 * THE WINDOW ARRIVES ALREADY DERIVED, and the asymmetry with the
 * body is the one `src/domains/service.ts` states. What a topic IS
 * includes its terms and its cadence, so an operation that did not
 * check them would not be the operation; `?page` and `?perPage`
 * are how a caller ASKED, a vocabulary belonging to HTTP that an
 * MCP tool would not spell at all. `toStoreWindow` in
 * `src/http/schemas.ts` owns that translation and
 * {@link listTopics} takes its output.
 *
 * THE DOMAIN IS RESOLVED FIRST, ON THE TWO OPERATIONS THAT NAME
 * ONE. `TopicStore` resolves no slug — its own header says so — so
 * a `:slug` is turned into a `DomainRecord` through
 * `DomainStore.findDomainBySlug` before any topic is read or
 * written, and a slug naming no row is a 404 that costs the topics
 * table no read at all. The other two operations name
 * `/topics/:id` and no domain, so there is nothing to resolve: the
 * row carries its own `domainId`, and the one rule that spans a
 * domain — a name unique within it — is the database's.
 *
 * TWO MECHANISMS, AND NO ORDER BETWEEN THEM. `topics` carries no
 * CHECK and no trigger, so the whole of what a write here can be
 * refused for is a duplicate `(domain_id, name)` and a `domainId`
 * naming no row. `./store.ts` records both and records why they
 * cannot fire at once: the unique key opens on the very column the
 * foreign key constrains, so a write naming a domain that is not
 * there can duplicate nothing.
 *
 * A NAME IS A 409 FROM BOTH WRITES THAT CAN PROPOSE ONE, which
 * this surface has in common with the personas group and not with
 * the other two. `TopicPatch` carries `name`, so a rename can
 * collide exactly as a create can, and {@link patchTopic}
 * translates the same refusal {@link createTopic} does rather than
 * treating it as unreachable.
 *
 * A FOREIGN-KEY REFUSAL IS THE LOST RACE, AND IT IS ANSWERED AS
 * WHAT IT IS. Only {@link createTopic} can reach one — `domainId`
 * is absent from `TopicPatch`, so no update touches that column —
 * and it means the domain resolved a moment earlier was deleted
 * between the lookup and the write. The fact to report is the one
 * {@link requireDomain} already reports: no domain carries that
 * slug. So it is the same 404 rather than a 500.
 *
 * THE THREE INTERVAL MEMBERS ARE CHECKED ONE AT A TIME AND NEVER
 * AGAINST EACH OTHER. Each has to be a positive integer, which is
 * `topicSeedSchema`'s rule in `scripts/seed-schemas.ts` for the
 * same three columns and for the same reason: a non-positive
 * cadence is not a slow schedule but a row the dispatcher finds
 * due again the moment it finishes one. What is NOT checked is a
 * floor above its ceiling. No CHECK relates the three,
 * `clampIntervalSeconds` in `src/lib/schedule.ts` already resolves
 * crossed bounds to the ceiling, and a refinement here would
 * enforce at this one path a rule nothing enforces anywhere else —
 * so the first row written by hand, by the seed or by a later
 * surface would pass it by.
 *
 * `nextRunAt` IS REFUSED AS AN UNRECOGNIZED KEY ON BOTH WRITES,
 * which is the pipeline-owned-column rule
 * `docs/architecture/08-http-api.md` states, applied to the one
 * column on this table the dispatcher writes. It is `.strict()`
 * doing its ordinary work rather than a check of its own, which is
 * what makes the refusal hold for a column added later: it has to
 * be argued ONTO a request schema rather than quietly inherited by
 * one. `flagged`, `cursor` and the source health counters are
 * refused by the same clause and are not this table's columns at
 * all.
 *
 * NOTHING SUBMITTED REACHES A MESSAGE OR A DETAIL BUILT HERE.
 * Every message below is a constant of this module's own, and no
 * `StoreRefusal` field is copied into one: a driver error's
 * `detail` reads `Key (domain_id, name)=(1, transformers) already
 * exists.` and the drizzle wrapper's `message` carries the whole
 * statement with its bound parameters, so quoting either would put
 * a submitted value on the wire and, through `errorHandler`, in a
 * log line.
 *
 * A `StoreRefusal` IS TRANSLATED AND NEVER RETHROWN AS ITSELF —
 * for the reasons it is declared a plain `Error` in
 * `src/db/store-errors.ts`. The two mechanisms `TopicStore`
 * declares are translated below and anything else is rethrown
 * untouched, which answers 500 rather than a plausible status no
 * rule authorised. A `check-violation` out of any call here would
 * be one: the table carries no CHECK for one to come from.
 *
 * THE STORE IS A PARAMETER, so every rule here is exercisable with
 * no database: `tests/helpers/memory-research-store.ts` stands
 * behind both ports over one dataset, which is what lets a domain
 * resolved through one of them own the topics read through the
 * other.
 */
import type { TopicRecord, TopicStore } from './store.js';
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
 * issues.
 *
 * TWO TOPIC METHODS ARE DELIBERATELY OUT, and their absence is the
 * schedule containment expressed as a type. `findTopicById` is for
 * a reader that wants one row before writing it, and no operation
 * below reads before it writes; `updateTopicSchedule` is the one
 * door onto `next_run_at`, so leaving it out is what says these
 * four functions cannot reach the column even by mistake. Both
 * arrive here when the two schedule verbs land, and the widening
 * is visible in this declaration rather than buried in a call.
 *
 * Built with `Pick` rather than by listing signatures, so a method
 * here cannot drift from the thing it is naming: a hand-copied
 * signature would go on type-checking against a port that had
 * moved under it.
 */
export type TopicServiceStore =
  Pick<DomainStore, 'findDomainBySlug'>
  & Pick<
    TopicStore,
    | 'countTopics'
    | 'deleteTopic'
    | 'insertTopic'
    | 'listTopics'
    | 'updateTopic'
  >;

/**
 * What a caller is told when no domain carries the slug it named.
 *
 * The slug is not in it, per this module's header, and the same
 * sentence all three wave-1 services answer for their own `:slug`
 * — spelled again rather than imported, because the four are equal
 * by intent rather than by derivation and any of them is free to
 * change without dragging the others with it.
 */
const NO_SUCH_DOMAIN = 'No domain carries that slug';

/** What a caller is told when no topic carries the id it named. */
const NO_SUCH_TOPIC = 'No topic carries that id';

/**
 * What a caller is told when the name it proposed is taken.
 *
 * The rule rather than the name. A duplicate is the one refusal
 * here whose cause is a value the caller submitted, so it is the
 * one where quoting the value back would read most naturally and
 * be exactly the leak this module's header forbids.
 */
const NAME_ALREADY_TAKEN
  = 'This domain already researches a topic of that name';

/**
 * How often a topic may be run, in seconds, as both writes spell
 * it.
 *
 * A positive integer and nothing more, which is
 * `topicSeedSchema`'s rule in `scripts/seed-schemas.ts` for the
 * same three columns. Zero is the value this refusal exists for: a
 * topic whose interval is zero is not one that runs slowly but one
 * `ar-dispatch` finds due again the moment it finishes, and the
 * cost of that is paid once per tick for as long as nobody
 * notices. A negative interval is the same row read backwards.
 *
 * Declared once and reused by all three members rather than
 * written out per column, so a floor and a ceiling cannot end up
 * held to a different rule from the cadence they bound. The two
 * bounds add `.nullable()` on top of it, which is the only
 * difference between them and `intervalSeconds`.
 */
const intervalSecondsSchema = z.number().int()
  .positive();

/**
 * The body `POST /domains/:slug/topics` accepts.
 *
 * Strict, like every request schema on this surface, so a misspelt
 * member is a refusal rather than a silently dropped one — and, on
 * this table, so that `nextRunAt` is refused by the same clause
 * that refuses a typo.
 *
 * `name` is held to non-empty and NOTHING MORE, which is
 * `topicSeedSchema`'s shape for the same column. `topics.name`
 * carries no CHECK, and a name never appears in a path segment
 * since a topic is addressed by `:id`, so there is no URL shape to
 * enforce and narrowing here would only make this surface unable
 * to write names the seed can. Non-empty is the one restriction
 * that survives that argument: a name is half the row's natural
 * key, so an empty one takes the key's place and refuses the next
 * row meaning to occupy it.
 *
 * `searchTerms` IS OPTIONAL AND THE OMISSION BECOMES `[]` in
 * {@link createTopic} rather than here. That is the port's
 * instruction — `InsertTopicInput` requires the member so that no
 * implementation gets to decide what an absence means — and the
 * empty list is a complete value rather than an absence: a topic
 * that issues nothing comes due on time and gives its run nothing
 * to issue.
 *
 * `enabled` IS OPTIONAL AND DEFAULTS TO TRUE the same way, which
 * is what lets a topic be staged switched off. That matters
 * because of a rule this module does not hold yet:
 * `POST /topics/:id/run-now` refuses a disabled row, so a topic
 * created disabled is one an operator has to enable deliberately
 * rather than one that quietly answers a run-now with a due time
 * nothing ever reads.
 *
 * The two bounds are OPTIONAL AND NULLABLE, which distinguishes
 * two requests where a patch of the same members distinguishes
 * three. On a create there is nothing stored to leave alone, so an
 * absent bound and an explicit `null` mean one thing — no floor,
 * no ceiling — and {@link createTopic} folds them together. The
 * seed spells its bounds out with an explicit `null` under a
 * different rule, the one `scripts/seed-schemas.ts` states: a file
 * is read on its own, with nothing beside it to say whether an
 * omission was deliberate, while a request has an endpoint and a
 * service to say so.
 *
 * `domainId` is absent, and deliberately: the path names the
 * domain, and a body member naming a second one would be a request
 * that could disagree with its own URL. `nextRunAt` is absent per
 * this module's header.
 */
export const createTopicSchema = z.object({
  name: z.string().min(1),
  searchTerms: z.array(z.string()).optional(),
  intervalSeconds: intervalSecondsSchema,
  enabled: z.boolean().optional(),
  minIntervalSeconds: intervalSecondsSchema.nullable().optional(),
  maxIntervalSeconds: intervalSecondsSchema.nullable().optional(),
}).strict();

/**
 * The body `PATCH /topics/:id` accepts.
 *
 * Every member optional, so a patch carrying nothing at all is a
 * legal call answering the stored row — which `TopicStore` states
 * rather than leaving to its implementations, since `topics`
 * carries no `updated_at` for a write to stamp and an empty update
 * list is something drizzle throws on.
 *
 * `name` IS PATCHABLE HERE, as a persona's role is and as a
 * category's key and a domain's slug are not. `TopicPatch` in
 * `./store.ts` carries the argument: no foreign key in schema v2
 * points at `topics`, and the seed upserts on `(domain, name)`, so
 * a rename changes which row a seed pass adjusts rather than
 * leaving a dangling pointer behind. It is also what puts
 * `topics_domain_id_name_unique` on the update as well as the
 * insert, and so what makes {@link patchTopic} translate a
 * duplicate at all.
 *
 * THE TWO BOUNDS DISTINGUISH THREE REQUESTS HERE, which is the
 * whole difference from the create above and the reason they are
 * declared `.nullable().optional()` in both places and folded in
 * only one. Absent leaves the stored bound alone; a number sets
 * it; `null` clears it, which is the only way to remove a floor or
 * a ceiling and would be unexpressible if absent and null meant
 * the same thing. {@link patchTopic} hands the parsed patch
 * straight to the port for that reason: a `??` anywhere between
 * here and the store would collapse the two.
 *
 * `searchTerms` REPLACES THE STORED LIST WHOLE and is never merged
 * into it or appended to. That rule is the store's and is stated
 * there; what this schema contributes is that an empty array gets
 * through, since a request clearing every term and a request
 * leaving them alone would otherwise be the same bytes.
 *
 * `domainId` is absent, so a topic cannot be moved between
 * domains: a topic is a question asked ABOUT the subject its
 * domain names, and its terms, its cadence and the findings
 * already attributed to it are read in that context. Its absence
 * is also what keeps every foreign-key refusal off
 * {@link patchTopic}. `nextRunAt` is absent per this module's
 * header.
 */
export const patchTopicSchema = z.object({
  name: z.string().min(1)
    .optional(),
  searchTerms: z.array(z.string()).optional(),
  intervalSeconds: intervalSecondsSchema.optional(),
  enabled: z.boolean().optional(),
  minIntervalSeconds: intervalSecondsSchema.nullable().optional(),
  maxIntervalSeconds: intervalSecondsSchema.nullable().optional(),
}).strict();

/**
 * One page of a domain's topics, beside the size of the collection
 * it was read from.
 *
 * Two members rather than a rendered envelope, for the reason
 * `DomainPage` in `src/domains/service.ts` gives: building `meta`
 * is the router's half, and this module was never told what the
 * window was in `page`/`perPage` terms.
 */
export interface TopicPage {
  /** The rows the window selected, name ascending. */
  readonly rows: readonly TopicRecord[];

  /** How many topics the domain holds, ignoring the window. */
  readonly total: number;
}

/**
 * Turns what the store refused into what the caller is told.
 *
 * @param err - Whatever the store threw.
 * @returns Never; every path throws.
 * @throws ConflictError - For a name the domain already carries,
 *   from a create and from a rename alike.
 * @throws NotFoundError - For a `domainId` naming no row, which is
 *   the domain having gone between the lookup and the write. See
 *   this module's header for why that is the same 404 the lookup
 *   itself raises.
 * @throws The original error, unchanged, when it is not a
 *   `StoreRefusal` or carries a reason `TopicStore` does not
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
    throw new ConflictError(NAME_ALREADY_TAKEN, undefined, { cause: err });
  }

  if (err.reason === 'foreign-key-violation') {
    throw new NotFoundError(NO_SUCH_DOMAIN, undefined, { cause: err });
  }

  throw err;
}

/**
 * Resolves the `:slug` a topics collection path opens with.
 *
 * @param store - Where the domain is read.
 * @param slug - The natural key, already narrowed by
 *   `slugParamSchema` at whichever boundary the request entered.
 * @returns The domain row, for its id.
 * @throws NotFoundError - When no domain carries the slug.
 *
 * @remarks
 * Private, and its message is this module's own. All three wave-1
 * services keep the identical helper unexported for exactly this
 * reason: a shared one would put one route group's wording on
 * another's refusals, and the four are free to diverge the moment
 * any of them has something of its own to say. It is the same
 * sentence today, which is the four agreeing rather than the four
 * being one.
 */
async function requireDomain(
  store: TopicServiceStore,
  slug: string,
): Promise<DomainRecord> {
  const row = await store.findDomainBySlug(slug);

  if (row === null) {
    throw new NotFoundError(NO_SUCH_DOMAIN);
  }

  return row;
}

/**
 * Reads one window of a domain's topics.
 *
 * @param store - Where the domain and its topics are read.
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
 * difference between a domain with no topics and a domain that is
 * not there. `TopicStore.listTopics` answers an empty list for an
 * id no row carries and `countTopics` answers `0`, both of them
 * correctly — nothing points at a row that is not there — so a
 * caller issuing the two reads alone could not tell the two states
 * apart, and a mistyped slug would read as a domain whose topics
 * somebody had removed.
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
export async function listTopics(
  store: TopicServiceStore,
  slug: string,
  window: StoreWindow,
): Promise<TopicPage> {
  const domain = await requireDomain(store, slug);
  const [rows, total] = await Promise.all([
    store.listTopics(domain.id, window),
    store.countTopics(domain.id),
  ]);

  return { rows, total };
}

/**
 * Adds one topic to a domain, UNSCHEDULED.
 *
 * @param store - Where the domain is read and the topic written.
 * @param slug - The domain's natural key.
 * @param body - The unvalidated request body, or the arguments an
 *   MCP tool was called with.
 * @returns The stored row, read back rather than reconstructed, so
 *   the id is the database's own and `nextRunAt` is the null the
 *   write actually landed.
 * @throws ValidationError - When the body does not satisfy
 *   {@link createTopicSchema}, with one detail per fault.
 * @throws NotFoundError - When no domain carries the slug, and
 *   when the domain went away between the lookup and the write.
 * @throws ConflictError - When the domain already researches a
 *   topic of that name.
 *
 * @remarks
 * A TOPIC IS CREATED UNSCHEDULED AND NOTHING HERE CAN CHANGE THAT.
 * `InsertTopicInput` carries no `nextRunAt`, so the row lands with
 * a null due time whatever was submitted, and scheduling it is the
 * separate act `POST /topics/:id/run-now` performs. The cost is
 * stated rather than hidden: a topic created and never run-now'd
 * sits at null until something writes a due time, and
 * `docs/architecture/08-http-api.md` is where the surface says so.
 *
 * THE TWO OMISSIONS BECOME VALUES HERE rather than in the schema
 * or at the column. `searchTerms` becomes the empty list and
 * `enabled` becomes true, which is what `InsertTopicInput`
 * requiring both members asks for: a default is a decision about
 * what an absence means, and leaving either to the column would
 * make the drizzle implementation quietly right and the in-memory
 * one quietly wrong, since only one of the two has a column to
 * default from. The bounds fold `undefined` and `null` together
 * for the reason {@link createTopicSchema} gives — on a create
 * there is nothing stored for an absent bound to leave alone.
 *
 * ASSERTS A NEW ROW AND DOES NOT UPSERT, which is the difference
 * from `scripts/seed-apply.ts` writing this same table through an
 * `ON CONFLICT` on this same natural key. A `POST` is a caller
 * stating that the domain has no topic on the subject yet, so a
 * duplicate is a 409 rather than a silent rewrite of the terms and
 * the cadence somebody tuned. The seed's upsert answers a
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
 * duplicate name in the deployment would answer 500 with the file
 * still reading as if it handled one.
 */
export async function createTopic(
  store: TopicServiceStore,
  slug: string,
  body: unknown,
): Promise<TopicRecord> {
  const input = parseBody(createTopicSchema, body);
  const domain = await requireDomain(store, slug);

  try {
    return await store.insertTopic({
      domainId: domain.id,
      name: input.name,
      searchTerms: input.searchTerms ?? [],
      intervalSeconds: input.intervalSeconds,
      enabled: input.enabled ?? true,
      minIntervalSeconds: input.minIntervalSeconds ?? null,
      maxIntervalSeconds: input.maxIntervalSeconds ?? null,
    });
  } catch (err) {
    return refuseWrite(err);
  }
}

/**
 * Rewrites the supplied members of one topic.
 *
 * @param store - Where the row is written.
 * @param id - The topic's id, as `resourceIdParamSchema` in
 *   `src/http/schemas.ts` parsed it.
 * @param body - The unvalidated patch.
 * @returns The stored row afterwards.
 * @throws ValidationError - When the body does not satisfy
 *   {@link patchTopicSchema}, with one detail per fault.
 * @throws NotFoundError - When no topic carries the id.
 * @throws ConflictError - When the resulting name is one the
 *   topic's domain already carries on another row.
 *
 * @remarks
 * THE PARSED PATCH IS HANDED STRAIGHT TO THE PORT, with no
 * defaulting step between the two, and that is load-bearing rather
 * than terse. `TopicPatch` distinguishes an absent bound from an
 * explicit `null`, so a `??` here would collapse the two and make
 * clearing a floor unexpressible from this surface — the member
 * would arrive as a number that was never submitted. The create
 * above folds them together because it has nothing stored to leave
 * alone; this one must not.
 *
 * NO DOMAIN IS RESOLVED AND NONE IS NAMED. `PATCH /topics/:id`
 * addresses the row directly, and the rule that spans a domain — a
 * name unique within it — is checked against the domain the STORED
 * row is in, which `TopicPatch` refusing to carry `domainId` is
 * what guarantees.
 *
 * There is no read before the write. `TopicStore.updateTopic`
 * answers `null` for an id no row carries, so a preceding
 * `findTopicById` would buy a second round trip and a second
 * chance for the row to go in between; the 404 below is the same
 * fact either way. That is also why `findTopicById` is not among
 * the methods {@link TopicServiceStore} picks.
 *
 * A patch carrying no member at all is legal and answers the
 * stored row, which is the port's rule rather than this module's:
 * `topics` has no `updated_at`, so an empty patch has literally
 * nothing to set.
 *
 * The edit takes effect on the following run and there is nothing
 * here to announce afterwards — including when the cadence itself
 * moved. `ar-dispatch` reads `interval_seconds` inside the claim
 * it reschedules with, so a new cadence is in force from the next
 * tick without this module touching `next_run_at`, which it could
 * not do in any case.
 */
export async function patchTopic(
  store: TopicServiceStore,
  id: number,
  body: unknown,
): Promise<TopicRecord> {
  const patch = parseBody(patchTopicSchema, body);
  let updated: TopicRecord | null;

  try {
    updated = await store.updateTopic(id, patch);
  } catch (err) {
    return refuseWrite(err);
  }

  if (updated === null) {
    throw new NotFoundError(NO_SUCH_TOPIC);
  }

  return updated;
}

/**
 * Deletes one topic.
 *
 * @param store - Where the row is removed.
 * @param id - The topic's id.
 * @returns Nothing. The router answers 204, because a deleted
 *   resource has no representation to carry.
 * @throws NotFoundError - When no topic carries the id.
 *
 * @remarks
 * NOTHING HANGS OFF A TOPIC — no foreign key in schema v2 points
 * at this table — so this delete has neither a guard nor a cascade
 * and cannot be refused. There is no `?cascade=confirm` here and
 * nothing for one to authorise, which is the difference from
 * `DELETE /sources/:id`: a source accumulated a corpus that its
 * documents and sightings still reference, and a topic accumulated
 * nothing that names it. A run is not a counter-example — `runs`
 * carries no `topic_id`, so what a run was about survives its
 * topic as recorded text rather than as a reference.
 *
 * A DELETE AND A DISABLE ARE DIFFERENT OPERATIONS, and the surface
 * offers both because it means both. `enabled: false` through
 * {@link patchTopic} keeps the subject, its terms and its cadence
 * and stops the topic coming due; this removes them. Neither
 * reaches work already dispatched: the dispatcher claims a row and
 * commits its reschedule in one transaction, so by the time a
 * delete can take the row the run it claimed for has already gone
 * out.
 */
export async function deleteTopic(
  store: TopicServiceStore,
  id: number,
): Promise<void> {
  const removed = await store.deleteTopic(id);

  if (!removed) {
    throw new NotFoundError(NO_SUCH_TOPIC);
  }
}
