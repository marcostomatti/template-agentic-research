/**
 * @packageDocumentation
 * The entities surface's reads and its two writes: a subject read
 * by id, the passes recorded about it, the patch that rewrites what
 * the registry says it is, and the ruling that lets one queued
 * intention be researched.
 *
 * FOUR FUNCTIONS AND TWO WRITERS. {@link getEntity} and
 * {@link listEntityResearch} read; {@link patchEntity} rewrites
 * `entities` and {@link approveEntityResearch} stamps one
 * `research_pool` row, and those two are the whole of what this
 * module changes. `entity_research` is `ar-research`'s to write and
 * no method on `EntityStore` reaches it, so the
 * ratify-and-never-write split is a property of the port rather
 * than of this module's restraint — the read-first law for the
 * whole wave is stated in `docs/architecture/08-http-api.md`,
 * and `tests/invariants/api-read-first.test.ts` derives it from
 * `keyof` over the port types rather than from either paragraph.
 *
 * THE SUBJECT IS RESOLVED BEFORE EITHER READ ANSWERS AND BEFORE
 * THE WRITE IS ISSUED, and the patch pays for that lookup twice
 * over. Its `domainId` is what the cross-domain alias rule is
 * decided against and there is no second place to get it: the path
 * carries one id, the body carries another, and neither says which
 * registry either sits in. The 404 falls out of the same read. That
 * is why this module reads before it writes where `patchCategory`
 * in `src/taxonomy/categories-service.ts` deliberately does not —
 * there the read would have bought only the refusal the write
 * already answers, and here it buys the rule as well.
 *
 * A SUBJECT THAT IS NOT THERE IS A 404 AND NOT AN EMPTY PAGE, which
 * is the whole reason {@link listEntityResearch} resolves the
 * entity at all. `EntityStore` answers an empty list and a count of
 * `0` for an id no entity carries, both correctly — nothing points
 * at a row that is not there — so the two research reads alone
 * could not tell a mistyped id apart from a subject nothing has
 * researched yet.
 *
 * `name_norm` IS COMPUTED HERE AND NEVER SUBMITTED. A `name` patch
 * is reduced through `normalizeEntityName` in
 * `src/lib/entity-name-norm.ts` — the single definition
 * `entities.name_norm` asked for and did not have — and the pair
 * goes to the port together, so a write moving the display half
 * without the key half is not a request this surface can express. A
 * body naming `nameNorm` is refused as an unrecognized key by
 * {@link patchEntitySchema}, which closes the silent miss that
 * column's own comment warns about: a caller proposing a reduction
 * of its own would key the row on something no spelling of the name
 * reduces to, every later lookup would find nothing, the next
 * sighting would insert a rival row, and nothing in the database
 * would report it.
 *
 * A NAME THAT REDUCES TO NOTHING IS A 422 AND NOT A 500. The
 * library throws a plain `Error` for it, deliberately: it is
 * spliced into workflow nodes where there is no status to raise and
 * no boundary to raise it at. This module is a boundary that has
 * one, so the throw is caught at the single call site and answered
 * as a fault against `name`. The sentence a caller reads is this
 * module's own; the library's is kept as the `cause`, where it
 * names the rule and no name.
 *
 * TWO ALIAS RULES ARE HELD HERE BECAUSE THE DATABASE CANNOT HOLD
 * THEM. A row pointing at itself and a row pointing into another
 * domain are both storable — `entities.alias_of` in
 * `src/db/schema/entities.ts` says so — and neither is a merge
 * anybody meant. The first makes a subject its own subject, which
 * every reader following the pointer either loops on or silently
 * stops at; the second joins two registries whose criteria,
 * findings and research were accumulated apart, and no foreign key
 * anywhere would follow the join. Each is a 422 naming `aliasOf`
 * with a code of this module's own, since no schema could raise
 * either.
 *
 * WHAT THE DATABASE DOES HOLD IS TRANSLATED RATHER THAN REPEATED.
 * `entities_domain_id_name_norm_unique` refusing a rename onto a
 * key another subject in the same domain already holds is a 409,
 * and `entities.alias_of`'s foreign key refusing an id no entity
 * carries is a 422 naming the member the caller supplied. Neither
 * is checked here first: a read-then-write pair would answer a 409
 * about a row that had gone in between and would miss one that
 * arrived, where the constraint is the deployment's own authority
 * on both at the instant of the write.
 *
 * NO REFUSAL HERE QUOTES ANYTHING A CALLER SUBMITTED. Every
 * sentence below is a constant of this module's own, each detail
 * names a member of the body rather than its value, and the one
 * `cause` kept is a library error whose message names the rule it
 * enforces and nothing else. `./service.test.ts` counts occurrences
 * of a planted sentinel in each CHANNEL of each refusal — the
 * message, the details and the cause — against the same count taken
 * over a refusal planted to leak through all three, so a search
 * that would find nothing anywhere cannot report a clean refusal.
 *
 * THE STORE IS A PARAMETER, so every rule here is exercisable with
 * no database: `tests/helpers/memory-research-store.ts` plants the
 * registry and answers the writer behind the port.
 *
 * THE APPROVAL RATIFIES AND NEVER RESEARCHES.
 * {@link approveEntityResearch} calls `approvePoolRow` and nothing
 * else: it records that a person agreed to one intention and moves
 * that row's status, and whatever the agreement makes possible is
 * `ar-research`'s to do and to record. There is no method on this
 * module's port that writes `entity_research`, so the split is the
 * same property of the type the paragraph above names.
 *
 * THE INTENTION IS NAMED IN THE BODY AND ITS SUBJECT IN THE PATH,
 * AND THE TWO MAY DISAGREE. `EntityStore.findPoolRowById` is
 * unscoped on purpose, so a row raised about another subject is
 * read and then REFUSED rather than approved — a 404, because a
 * caller is not entitled to learn that somebody else's intention
 * exists. A row naming no subject at all is refused by that same
 * comparison, `research_pool.entity_id` being nullable, and the
 * refusals are one sentence between them for the reason
 * {@link NO_SUCH_INTENTION} gives.
 *
 * THE GATE'S VOCABULARY IS `src/approvals/ruling.ts` AND NOT THIS
 * MODULE'S. `refuseRuling` decides, `describeRuling` projects, and
 * the ordering that puts the parent check ahead of every other one
 * is argued there — so this gate and the proposal gate one group
 * over cannot drift into answering differently about the same act.
 *
 * RULING TWICE IS A NO-OP RATHER THAN A SECOND RULING.
 * `approved_at` is written `coalesce(approved_at, now())` by both
 * implementations of the port, so a second approval answers the
 * FIRST one's instant and a row already closed ratifies without
 * complaint. That is `RULING_ACTS` rather than a rule of this
 * module's: `ratify` permits what `apply` refuses, and reading it
 * off that roster is what keeps the difference declared once.
 */
import type {
  EntityNamePatch,
  EntityPatch,
  EntityRecord,
  EntityResearchRecord,
  EntityStore,
} from './store.js';
import type {
  Ruling,
  RulingAct,
  RulingRefusalReason,
} from '../approvals/ruling.js';
import type { StoreWindow } from '../http/schemas.js';

import { z } from 'zod';

import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../lib/errors/index.js';
import { describeRuling, refuseRuling } from '../approvals/ruling.js';
import { StoreRefusal } from '../db/store-errors.js';
import { parseBody } from '../http/validation.js';
import { normalizeEntityName } from '../lib/entity-name-norm.js';

/**
 * Exactly the port methods this module reaches, and no others.
 *
 * ONE PORT RATHER THAN TWO, which is where the entities surface
 * differs from every other group in this wave. A findings or a
 * documents route opens on a `:slug` and has to resolve a domain
 * before it can read anything; an entity route opens on the row's
 * own id, so `DomainStore` is reached for nothing at all and the
 * domain a subject belongs to arrives on the subject.
 *
 * TWO OF `EntityStore`'S EIGHT METHODS ARE ABSENT, and the absence
 * is a statement rather than an oversight. `listEntityPool` and
 * `countEntityPool` are reached by nothing on this wave at all,
 * which `src/entities/store.ts` records on each of them — naming
 * them here would have this module claim to need a collection no
 * route pages. The other six are all of it: the four the reads and
 * the patch need, plus the pool lookup and the approval this
 * module's own gate calls.
 *
 * Built with `Pick` rather than by listing signatures, so a method
 * here cannot drift from the thing it names: a hand-copied
 * signature would go on type-checking against a port that had moved
 * under it.
 */
export type EntitiesServiceStore = Pick<
  EntityStore,
  | 'approvePoolRow'
  | 'countEntityResearch'
  | 'findEntityById'
  | 'findPoolRowById'
  | 'listEntityResearch'
  | 'updateEntity'
>;

/**
 * The body `PATCH /entities/:id` accepts.
 *
 * STRICT, LIKE EVERY REQUEST SCHEMA ON THIS SURFACE, and here that
 * is load-bearing rather than tidy. `nameNorm` is the one key a
 * caller might plausibly send and must never be allowed to: the
 * key half of the name is COMPUTED from the display half, so a
 * submitted one is a second reduction competing with the single
 * definition. Strictness answers it `unrecognized_keys` against
 * `body`, which is a refusal rather than a member silently dropped
 * — and a dropped one would be indistinguishable, on the wire,
 * from the service having honoured it.
 *
 * EVERY MEMBER IS OPTIONAL, so a patch carrying nothing at all is a
 * legal call answering the stored row. That is `EntityStore`'s
 * promise rather than this schema's leniency: `entities` carries no
 * `updated_at` for a write to stamp, and an empty update list is
 * something drizzle throws on rather than something a caller should
 * meet.
 *
 * `name` IS HELD TO NON-EMPTY AND NOTHING MORE HERE. The column is
 * NOT NULL, which is not the same as non-empty, and what a name may
 * look like beyond that is not a shape question: whether it carries
 * anything that IDENTIFIES a subject is decided by the reduction,
 * one step further on, because that is the same question the key
 * asks and it must not be answered twice.
 *
 * `attributes` REPLACES THE STORED PAYLOAD WHOLE and is never
 * merged into it. That rule is the port's and is stated there; what
 * this schema contributes is that an empty object gets through,
 * since a request clearing every attribute and a request leaving
 * them alone would otherwise be the same bytes.
 *
 * `aliasOf` DISTINGUISHES THREE REQUESTS, which is why it is
 * `.nullable().optional()` and not one or the other. Absent leaves
 * the pointer where it is, a number points the row at a subject,
 * and `null` clears it back to a row that is its own subject — the
 * only way back, and unexpressible if absent and null meant the
 * same thing.
 *
 * `domainId` IS DELIBERATELY ABSENT, so a subject cannot be moved
 * between registries here. `EntityPatch` in `./store.ts` carries
 * the argument, and it is the same one `patchDomainSchema` makes
 * about a slug: the move has a fan-out of its own to settle first.
 */
export const patchEntitySchema = z.object({
  name: z.string().min(1)
    .optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
  aliasOf: z.number().int()
    .positive()
    .nullable()
    .optional(),
}).strict();

/** A parsed entity patch: every member present only if sent. */
export type PatchEntityBody = z.infer<typeof patchEntitySchema>;

/**
 * The body `POST /entities/:id/approve-research` accepts.
 *
 * ONE MEMBER, AND IT NAMES A ROW RATHER THAN DESCRIBING ONE. A
 * ruling is given to one stored intention, whose exact search terms
 * are what an operator read before agreeing, so the request carries
 * that row's id and nothing a caller composed. There is no spelling
 * here for approving a subject's queue wholesale, and adding one
 * would be approving terms nobody was shown.
 *
 * STRICT, so a body naming `entityId`, `status` or `approvedAt` is
 * refused rather than quietly ignored. The first is already in the
 * path; the other two are columns this surface WRITES rather than
 * accepts, and a caller able to set either would be ruling and
 * back-dating the ruling in one request.
 */
export const approveResearchSchema = z.object({
  poolId: z.number().int()
    .positive(),
}).strict();

/** A parsed approval request: the intention being ruled on. */
export type ApproveResearchBody
  = z.infer<typeof approveResearchSchema>;

/**
 * One page of what has been found out about a subject, beside the
 * size of the collection it was read from.
 *
 * Two members rather than a rendered envelope, for the reason every
 * page on this surface gives: building `meta` is the router's half,
 * and this module was never told what the window was in
 * `page`/`perPage` terms.
 */
export interface EntityResearchPage {
  /**
   * The rows the window selected, `researchedAt` descending with
   * `id` descending breaking a tie.
   *
   * The order is the store's, per `EntityStore.listEntityResearch`,
   * and nothing here re-sorts: a service sorting a page it was
   * handed would be answering a different order from the one the
   * window was taken under, which is how two pages come to disagree
   * about which row they hold.
   *
   * `EntityResearchRecord` passed through rather than projected.
   * Nothing on this row is cut and nothing is masked — a summary
   * comes back as stored — so a shape of this module's own would be
   * a second authority for that table's own columns.
   */
  readonly rows: readonly EntityResearchRecord[];

  /**
   * How many passes have been recorded about the subject, ignoring
   * the window.
   *
   * There is no filter on this collection, so this is the whole of
   * it rather than the narrowed part a caller asked for.
   */
  readonly total: number;
}

/**
 * What a caller is told when no entity carries the id.
 *
 * The id is not in it, per this module's header, and it is the same
 * sentence every other `:id` refusal on this surface answers —
 * spelled again rather than imported, because the several are equal
 * by intent rather than by derivation and any of them is free to
 * change without dragging the others with it.
 */
const NO_SUCH_ENTITY = 'No entity carries that id';

/**
 * What a caller is told when the reduced name is already taken.
 *
 * THE RULE RATHER THAN THE ROW. Which subject holds the key is a
 * fact about a row the caller did not ask about and, its display
 * spelling being free to differ, may never have seen — and naming
 * it would let a caller enumerate a registry by proposing names.
 */
const NAME_ALREADY_TAKEN
  = 'Another subject in this domain reduces to the same key';

/** The message every `ValidationError` here carries at the top. */
const VALIDATION_FAILED = 'Validation failed';

/** The patch member a name refusal is reported against. */
const NAME_FIELD = 'name';

/** The patch member an alias refusal is reported against. */
const ALIAS_FIELD = 'aliasOf';

/**
 * The dotted prefixes below which the body is an OPEN record.
 *
 * `attributes` is a map whose keys the domain chose rather than
 * this service, so a zod issue raised inside it names `attributes.*`
 * and never the key itself — `ParseOptions.openPaths` in
 * `src/http/validation.ts` argues why a key is submitted content in
 * the same sense a value is.
 *
 * NOTHING BELOW THE PREFIX CAN RAISE ONE TODAY, and declaring it
 * anyway is the point. The record's values are `z.unknown()`, which
 * refuses nothing, so the only reachable issue is against the
 * record AS A WHOLE — which this prefix deliberately does not mask.
 * The day a value type is narrowed, the keys stay off the wire with
 * this line unedited.
 */
const ATTRIBUTES_OPEN_PATHS = ['attributes'];

/**
 * What a detail says when the submitted name identifies nothing.
 *
 * The rule and not the name, which is the containment claim in this
 * module's header expressed as a declaration rather than as a
 * review of which values were touched.
 */
const NAME_MUST_IDENTIFY
  = 'A name has to carry something that identifies a subject';

/**
 * The code that detail carries.
 *
 * THIS MODULE'S OWN, and it has to be: no schema raised it, because
 * no schema could — whether a name reduces to nothing is the
 * reduction's answer and not a shape rule. Spelled in the same
 * snake_case register the zod codes on this surface use, so a
 * consumer switching on `code` reads one vocabulary rather than two.
 */
const EMPTY_KEY_CODE = 'empty_entity_key';

/** What a detail says when a row is aimed at itself. */
const ALIAS_NOT_ITSELF = 'A subject is not an alias of itself';

/** The code that detail carries. */
const SELF_ALIAS_CODE = 'self_alias';

/**
 * What a detail says when the alias names another registry.
 *
 * The rule rather than the two domains, which are facts about
 * stored rows a caller did not ask about and, in the case of the
 * subject's own, did not even name.
 */
const ALIAS_ONE_REGISTRY
  = 'A subject aliases only subjects of its own domain';

/** The code that detail carries. */
const CROSS_DOMAIN_ALIAS_CODE = 'cross_domain_alias';

/** What a detail says when the alias names no subject at all. */
const ALIAS_MUST_EXIST = 'No entity carries the id named as the alias';

/** The code that detail carries. */
const UNKNOWN_ALIAS_CODE = 'unknown_alias';

/**
 * The act this gate performs, named from `RULING_ACTS`.
 *
 * ANNOTATED RATHER THAN INFERRED, so a member removed from that
 * roster reports on this line instead of at a call site further
 * down. It is also the whole of what tells `refuseRuling` that a
 * closed row ratifies here where it would be refused one group
 * over: the difference between the two gates is a value declared
 * once, and not an `if` in either of them.
 */
const RATIFY: RulingAct = 'ratify';

/**
 * What a caller is told when the body names no intention this
 * subject holds.
 *
 * ONE SENTENCE FOR THREE REFUSALS, WHICH IS THE CONTAINMENT RULE
 * RATHER THAN A SHORTCUT. `refuseRuling` separates `no-such-ruling`
 * from `not-on-this-parent` so that a gate can act differently on
 * them; what a CALLER reads has to be the same either way, or the
 * two answers between them tell it that a row it does not own
 * exists. The write's own null answers it for a third reason, the
 * row having gone in between.
 *
 * The submitted id is not in it, per this module's header.
 */
const NO_SUCH_INTENTION
  = 'No intention of this subject carries that id';

/**
 * What a ratification refused for a closed row would say.
 *
 * UNREACHABLE, AND THE GUARD IS THE POINT. `RULING_ACTS` records
 * that ratifying twice is a no-op, so `refuseRuling` never answers
 * `already-ruled` for {@link RATIFY} and no request can reach this
 * sentence. It is a plain `Error` answering 500 rather than a 404
 * given quietly in a 409's place: the day that roster says
 * otherwise, the mismatch is a fault somebody is shown instead of
 * a status nobody notices.
 */
const CLOSED_ROW_IS_RATIFIABLE
  = 'A ratification cannot be refused for a closed row';

/**
 * Builds the 422 an alias refusal answers with.
 *
 * @param message - What the one detail says: the self rule, the
 *   one-registry rule, or that no subject carries the id.
 * @param code - The machine-readable code that detail carries.
 * @param cause - The store refusal being translated, where there
 *   was one. Absent for the two rules this module holds itself,
 *   which no store was asked about.
 * @returns The refusal to throw.
 *
 * @remarks
 * The array is built per call rather than shared from a module
 * constant, so nothing a handler or a serialiser does to one
 * refusal's details can reach the next one's.
 */
function aliasRefusal(
  message: string,
  code: string,
  cause?: StoreRefusal,
): ValidationError {
  return new ValidationError(
    VALIDATION_FAILED,
    [{ field: ALIAS_FIELD, message, code }],
    { cause },
  );
}

/**
 * Reduces a submitted name to the pair the port stores.
 *
 * @param display - The name as the caller spelled it, already held
 *   to non-empty by {@link patchEntitySchema}.
 * @returns The display half verbatim and the key half computed.
 * @throws ValidationError - When the name carries nothing that
 *   identifies a subject, so the key would be the empty string. One
 *   detail naming {@link NAME_FIELD}, and the submitted name in
 *   none of its three channels.
 *
 * @remarks
 * THE CATCH IS BROAD AND THAT IS SAFE HERE RATHER THAN CARELESS.
 * `normalizeEntityName` declares exactly one failure, its argument
 * is a `string` the schema has already guaranteed, and every module
 * under `src/lib/` imports nothing at all — so there is no
 * dependency underneath it with a second thing to raise. Matching
 * on the message instead would pin this module to the wording of a
 * sentence that module is free to rewrite.
 *
 * The library error is kept as the `cause` for the debugger and for
 * the error-level line `errorHandler` writes. It names the rule and
 * quotes nothing, which is what makes keeping it compatible with
 * the containment claim rather than an exception to it.
 */
function reduceName(display: string): EntityNamePatch {
  try {
    return { display, norm: normalizeEntityName(display) };
  } catch (err) {
    throw new ValidationError(VALIDATION_FAILED, [{
      field: NAME_FIELD,
      message: NAME_MUST_IDENTIFY,
      code: EMPTY_KEY_CODE,
    }], { cause: err });
  }
}

/**
 * Turns what the entity write refused into what the caller is told.
 *
 * @param err - Whatever the store threw.
 * @returns Never; every path throws.
 * @throws ConflictError - For a rename onto a key another subject
 *   in the same domain already holds, which is
 *   `entities_domain_id_name_norm_unique`.
 * @throws ValidationError - For an `aliasOf` naming an id no entity
 *   carries, which is the alias foreign key.
 * @throws The original error, unchanged, when it is not a
 *   `StoreRefusal` or carries a reason `EntityStore` does not
 *   declare for this write. A store doing something its port does
 *   not describe answers 500, which is the honest status for a
 *   fault no caller can act on.
 *
 * @remarks
 * NO `check-violation` BRANCH, AND THAT IS THIS TABLE RATHER THAN
 * AN OMISSION. `entities` carries no CHECK at all, so a branch for
 * one would be unreachable code describing a constraint that does
 * not exist. The two mechanisms above are the two `EntityStore`
 * declares for this method and there is no third.
 *
 * THE FOREIGN KEY IS THE ONE RULE NOT CHECKED BEFORE THE WRITE,
 * which is deliberate and is the module header's argument: a
 * read-then-write pair would answer about a row that had gone in
 * between and miss one that arrived. It answers the same 422 the
 * alias rules do, naming the same member, because it is a fault of
 * the same kind against the same submitted id.
 */
function refuseWrite(err: unknown): never {
  if (!(err instanceof StoreRefusal)) {
    throw err;
  }

  if (err.reason === 'unique-violation') {
    throw new ConflictError(NAME_ALREADY_TAKEN, undefined, {
      cause: err,
    });
  }

  if (err.reason === 'foreign-key-violation') {
    throw aliasRefusal(ALIAS_MUST_EXIST, UNKNOWN_ALIAS_CODE, err);
  }

  throw err;
}

/**
 * Resolves the `:id` every entity path opens with.
 *
 * @param store - Where the subject is read.
 * @param id - The row's own id, as `resourceIdParamSchema` in
 *   `src/http/schemas.ts` parsed the path segment.
 * @returns The row, for its `domainId` as much as for its answer.
 * @throws NotFoundError - When no entity carries the id.
 *
 * @remarks
 * Private, and its message is this module's own. Every service on
 * this surface keeps the identical helper unexported for exactly
 * this reason: a shared one would put one route group's wording on
 * another's refusals, and each is free to diverge the moment it has
 * something of its own to say.
 */
async function requireEntity(
  store: EntitiesServiceStore,
  id: number,
): Promise<EntityRecord> {
  const row = await store.findEntityById(id);

  if (row === null) {
    throw new NotFoundError(NO_SUCH_ENTITY);
  }

  return row;
}

/**
 * Refuses the two aliases the database would store and nobody
 * meant.
 *
 * @param store - Where the alias target is read.
 * @param entity - The subject being patched, as
 *   {@link requireEntity} resolved it. Its `id` decides the first
 *   rule and its `domainId` the second.
 * @param aliasOf - What the patch proposed: absent to leave the
 *   pointer alone, `null` to clear it, or the id of the subject
 *   this row turns out to be.
 * @returns Nothing. An alias this says nothing about is one
 *   {@link patchEntity} may write.
 * @throws ValidationError - For a row aimed at itself, and for one
 *   aimed into another domain. Both name `aliasOf`, which is the
 *   member the caller supplied, and carry different codes.
 *
 * @remarks
 * ABSENT AND `null` BOTH COST NO READ AND TAKE NO RULE. Clearing a
 * pointer cannot aim it anywhere, so the guard is skipped rather
 * than passed — which is also what keeps a patch touching only
 * `name` or `attributes` to a single round trip.
 *
 * THE SELF RULE IS DECIDED BEFORE THE READ, because it can be: the
 * two ids are both in hand, and a subject aimed at itself is
 * refused whether or not anything else is true of it. The read that
 * follows is made for the domain comparison alone.
 *
 * A TARGET THAT IS NOT THERE FALLS THROUGH TO THE WRITE. There is
 * no domain to compare against, and answering the refusal here
 * would be this module holding a rule the database holds already —
 * one it holds at the instant of the write rather than at the
 * instant of a read, which is the difference the module header
 * argues. The foreign key raises it and {@link refuseWrite}
 * translates it, so the caller reads the same 422 either way.
 */
async function requireAliasable(
  store: EntitiesServiceStore,
  entity: EntityRecord,
  aliasOf: number | null | undefined,
): Promise<void> {
  if (aliasOf === undefined || aliasOf === null) {
    return;
  }

  if (aliasOf === entity.id) {
    throw aliasRefusal(ALIAS_NOT_ITSELF, SELF_ALIAS_CODE);
  }

  const target = await store.findEntityById(aliasOf);

  if (target !== null && target.domainId !== entity.domainId) {
    throw aliasRefusal(ALIAS_ONE_REGISTRY, CROSS_DOMAIN_ALIAS_CODE);
  }
}

/**
 * Turns a refusal reason into what the caller is told.
 *
 * @param reason - What `refuseRuling` answered.
 * @returns The error to throw. Both reasons a ratification can
 *   produce are one 404 between them, per
 *   {@link NO_SUCH_INTENTION}; the third is unreachable and
 *   answers a plain `Error`, per {@link CLOSED_ROW_IS_RATIFIABLE}.
 *
 * @remarks
 * IT RETURNS RATHER THAN THROWS, so the call site reads `throw` and
 * nothing here depends on the compiler taking a view about whether
 * this function comes back — which is what {@link refuseWrite}
 * above, whose every path throws, has to be `return`ed from to say.
 */
function ratificationRefusal(reason: RulingRefusalReason): Error {
  return reason === 'already-ruled'
    ? new Error(CLOSED_ROW_IS_RATIFIABLE)
    : new NotFoundError(NO_SUCH_INTENTION);
}

/**
 * Reads one subject of one registry.
 *
 * @param store - Where the row is read.
 * @param id - The row's own id.
 * @returns The stored row, whole. Nothing on it is cut, masked or
 *   projected: a registry entry is what a domain wrote about a
 *   subject, and every column of it is answerable.
 * @throws NotFoundError - When no entity carries the id. The only
 *   refusal this function has.
 *
 * @remarks
 * A row whose `aliasOf` points at a subject is answered AS IT
 * STANDS rather than resolved to what it points at. Following the
 * pointer would answer a different row than the one addressed, and
 * a caller that asked about an alias is entitled to learn that it
 * is one.
 */
export async function getEntity(
  store: EntitiesServiceStore,
  id: number,
): Promise<EntityRecord> {
  return requireEntity(store, id);
}

/**
 * Reads one window of what has been found out about a subject.
 *
 * @param store - Where the subject and its research are read.
 * @param id - The subject's own id.
 * @param window - The `limit`/`offset` window, as `toStoreWindow`
 *   in `src/http/schemas.ts` derived it from `?page` and
 *   `?perPage`. Already validated, so nothing here re-checks a
 *   bound.
 * @returns The rows in the window and the size of the whole
 *   collection.
 * @throws NotFoundError - When no entity carries the id. The only
 *   refusal this function has: a subject nothing has researched and
 *   a window past the end are each an empty page.
 *
 * @remarks
 * THE LOOKUP IS AWAITED BEFORE THE TWO READS ARE ISSUED, which is
 * the module header's argument and the one thing a reader might
 * otherwise fold into the `Promise.all` below.
 *
 * The two reads that DO run are issued together, for the reason
 * every page on this surface gives: a page's rows and its
 * collection's size are independent questions, and awaiting them in
 * sequence would make every request pay two round trips to answer
 * one body.
 */
export async function listEntityResearch(
  store: EntitiesServiceStore,
  id: number,
  window: StoreWindow,
): Promise<EntityResearchPage> {
  const entity = await requireEntity(store, id);
  const [rows, total] = await Promise.all([
    store.listEntityResearch(entity.id, window),
    store.countEntityResearch(entity.id),
  ]);

  return { rows, total };
}

/**
 * Rewrites the supplied members of one subject.
 *
 * @param store - Where the subject is read and written.
 * @param id - The subject's own id.
 * @param body - The unvalidated request body, or the arguments an
 *   MCP tool was called with.
 * @returns The stored row afterwards, read back from the write
 *   rather than rebuilt from the argument, so the caller sees the
 *   key half it never submitted.
 * @throws ValidationError - When the body does not satisfy
 *   {@link patchEntitySchema}; when the name reduces to nothing;
 *   when the alias names the subject itself, a subject in another
 *   domain, or no subject at all.
 * @throws NotFoundError - When no entity carries the id.
 * @throws ConflictError - When the reduced name is one another
 *   subject in the same domain already holds.
 *
 * @remarks
 * THE BODY IS PARSED AND THE NAME IS REDUCED BEFORE ANYTHING IS
 * READ. Both are facts about the request alone — the shape of a
 * body, and whether a name carries anything that identifies a
 * subject — so answering either a 422 or a 404 depending on what
 * happens to be stored would make a caller's error depend on rows
 * it never asked about. It also costs both refusals no read at all.
 *
 * THE PATCH IS BUILT MEMBER BY MEMBER AND AN ABSENT KEY STAYS
 * ABSENT. `EntityPatch` distinguishes an absent member from every
 * value one could carry — `{}` clears the attributes and `null`
 * clears the alias — so a key set to `undefined` rather than left
 * out would hand an implementation a member to interpret. The name
 * is the one member reshaped on the way through: what arrives is a
 * spelling and what leaves is the pair.
 *
 * THE 404 IS TAKEN TWICE, from the lookup and from the write's own
 * null, and neither makes the other redundant. The lookup's is what
 * the alias rules are decided after; the write's is the row having
 * gone in between, which is the same fact by the time a caller
 * reads it.
 *
 * The write is `await`ed inside the `try` rather than returned
 * unawaited: returning the promise would settle it outside this
 * block, the `catch` would never run, and every duplicate key in
 * the deployment would answer 500 with the function still reading
 * as if it handled one.
 */
export async function patchEntity(
  store: EntitiesServiceStore,
  id: number,
  body: unknown,
): Promise<EntityRecord> {
  const input = parseBody(patchEntitySchema, body, {
    openPaths: ATTRIBUTES_OPEN_PATHS,
  });
  const name = input.name === undefined
    ? undefined
    : reduceName(input.name);
  const entity = await requireEntity(store, id);

  await requireAliasable(store, entity, input.aliasOf);

  const patch: EntityPatch = {
    ...name === undefined
      ? {}
      : { name },
    ...input.attributes === undefined
      ? {}
      : { attributes: input.attributes },
    ...input.aliasOf === undefined
      ? {}
      : { aliasOf: input.aliasOf },
  };
  let updated: EntityRecord | null;

  try {
    updated = await store.updateEntity(entity.id, patch);
  } catch (err) {
    return refuseWrite(err);
  }

  if (updated === null) {
    throw new NotFoundError(NO_SUCH_ENTITY);
  }

  return updated;
}

/**
 * Records that a person ruled in favour of one queued intention.
 *
 * @param store - Where the subject and the intention are read, and
 *   where the ruling is written.
 * @param id - The subject's own id, from the path.
 * @param body - The unvalidated request body, or the arguments an
 *   MCP tool was called with.
 * @returns The four-member ruling `describeRuling` projects, taken
 *   off the row the write answered rather than rebuilt from the
 *   request: the row's id, where it stands, when a person agreed,
 *   and when the intention was closed.
 * @throws ValidationError - When the body does not satisfy
 *   {@link approveResearchSchema}.
 * @throws NotFoundError - When no entity carries the id; when no
 *   intention carries the submitted `poolId`; and when the
 *   intention it carries was raised about another subject, or about
 *   none at all. The last three answer one sentence, per
 *   {@link NO_SUCH_INTENTION}.
 *
 * @remarks
 * THE SUBJECT IS RESOLVED BEFORE THE INTENTION IS READ, so an id
 * nothing carries costs one lookup and never reaches the queue. The
 * ordering is also what makes the parent comparison decidable: it
 * is the ADDRESSED entity the stored row has to name.
 *
 * THE ROW IS READ AND THEN JUDGED RATHER THAN SELECTED. A lookup
 * scoped to the subject would answer null for `no such row` and for
 * `not this subject's row` alike, and this gate has to tell the two
 * apart even though a caller reads one sentence for both —
 * `EntityStore.findPoolRowById` argues it from the port's end.
 *
 * NOTHING IS ASKED OF THE ROW'S STATE. `refuseRuling` reads the two
 * timestamps and never `status`, exactly as
 * `research_pool_approval_check` does, and for {@link RATIFY} a
 * closed row is no refusal at all: it is ratified again, the
 * instant a person first agreed at stands, and the status moves to
 * approved.
 *
 * THE WRITE IS THE ONE THING THIS FUNCTION DOES. `approvePoolRow`
 * stamps two columns of one row; no research is recorded and no
 * search is issued, which is the ratify-and-never-write split the
 * header states and `EntityStore` holds structurally.
 *
 * THE WRITE'S OWN NULL IS THE ROW HAVING GONE between the read and
 * the ruling, and it answers the sentence the read's own absence
 * answers. No ordinary sequence of calls produces it.
 */
export async function approveEntityResearch(
  store: EntitiesServiceStore,
  id: number,
  body: unknown,
): Promise<Ruling> {
  const input = parseBody(approveResearchSchema, body);
  const entity = await requireEntity(store, id);
  const row = await store.findPoolRowById(input.poolId);
  const reason = refuseRuling({
    act: RATIFY,
    parentId: entity.id,
    candidate: row === null
      ? null
      : { parentId: row.entityId, row },
  });

  if (reason !== null) {
    throw ratificationRefusal(reason);
  }

  const ruled = await store.approvePoolRow(input.poolId);

  if (ruled === null) {
    throw new NotFoundError(NO_SUCH_INTENTION);
  }

  return describeRuling(ruled);
}
