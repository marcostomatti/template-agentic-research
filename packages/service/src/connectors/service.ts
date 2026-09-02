/**
* @packageDocumentation The connector rules: reading the
* deployment's connectors, adding one, retuning one, and taking one
* away. What `/connectors` and `/connectors/:id` reduce to once HTTP
* is subtracted from them.
*
* THIS IS THE LAYER THAT MASKS, and it is the reason this module
* exists as more than a fourth copy of a resource service.
* `ConnectorStore` answers `config` AS STORED on every method,
* credential and all — its header argues why at length — so every
* record leaving these four functions goes through
* `maskConnectorConfig` in `./secrets.ts` first. There is no path
* out of here carrying an unmasked config: the list masks each row,
* and the rows {@link createConnector} and {@link patchConnector}
* answer with are masked on the way back.
*
* THE SAME ROSTER REFUSES THE MASK ON THE WAY IN. A `config`
* submitting the {@link MASKED_SECRET} literal as a value is a 422
* naming where it sat, and never a write. The round trip that makes
* it necessary is the ordinary one: a caller reads a connector,
* edits one member of the masked config, and sends the whole object
* back, at which point the literal is what gets stored as that
* deployment's API key. `./secrets.ts` holds both directions behind
* one declaration, which is what keeps the value replaced on the way
* out and the value refused on the way in from drifting apart.
*
* NO DOMAIN IS RESOLVED ANYWHERE HERE, which is the structural
* difference from every other resource service on this surface.
* `connectors` carries no `domain_id`: which model endpoint answers,
* or which notebook an export is handed to, is a fact about the
* deployment. So there is no `:slug` to turn into a row, no
* `requireDomain` helper, no 404 for a domain, and no cascade above
* these rows at all — a connector outlives every domain that named
* it.
*
* THE BODY IS PARSED HERE RATHER THAN ABOVE, exactly as every wave-1
* service argues: an operation handed an already-validated input
* would have two callers validating it, the router today and the MCP
* tool tomorrow, from a second schema nobody would notice drifting.
* So {@link createConnector} and {@link patchConnector} take an
* `unknown` and run it through {@link parseBody}.
*
* THE WINDOW AND THE FILTER BOTH ARRIVE ALREADY DERIVED, and the
* asymmetry with the body is the one `src/domains/service.ts`
* states. What a connector IS includes its kind, its name and its
* address, so an operation that did not check them would not be the
* operation. `?page` and `?perPage` are how a caller ASKED, and so
* is a `?kind` narrowing a collection nobody has to narrow:
* `./routes.ts` holds that parameter to `CONNECTOR_KINDS` in its own
* list query schema and hands the result down as a
* `ConnectorFilter`, which is why no schema below declares one and
* why {@link listConnectors} has no refusal of its own.
*
* `kind` IS HELD TO THE TUPLE ON THE ONE WRITE THAT CAN PROPOSE ONE.
* {@link createConnectorSchema} reads `CONNECTOR_KINDS` from
* `src/db/schema/values.ts`, which is the tuple
* `connectors_kind_check` is generated from, so the boundary and the
* column are two readings of one list. {@link patchConnectorSchema}
* declares no `kind` at all — `ConnectorPatch` carries the whole
* argument, and its short form is that a connector's kind is read by
* rows and queries that are not this one and neither can see the
* edit. So a body naming `kind` on a patch is refused as an
* unrecognized key rather than by the enum.
*
* A `check-violation` IS RETHROWN, on the same reading
* `src/sources/service.ts` gives for its own CHECK. The boundary
* refuses a kind outside the tuple as a 422 before any write is
* issued, so a CHECK refusal reaching this module means the tuple
* and the column have drifted apart — a deployment fault a caller
* cannot act on, for which 500 is the honest status. Dressing it as
* a 422 would tell an operator to fix a request that was correct.
*
* THERE IS NO FOREIGN-KEY REFUSAL ON EITHER WRITE, and the absence
* is the table's rather than an omission here. `connectors`
* references nothing: no `domain_id`, no parent, no lookup row. So
* neither write below can raise one, and {@link refuseWrite} has no
* branch for a reason no call site can reach. The delete is where
* this surface meets a foreign key, and it meets it from the other
* side.
*
* THE DELETE IS REFUSED ABSOLUTELY WHILE A SUBSCRIPTION NAMES THE
* ROW. `export_subscriptions_connector_id_connectors_id_fk` emits
* `ON DELETE no action`, so the database refuses whoever asks;
* {@link deleteConnector} reads the count first so that the refusal
* can say what stands in the way. There is no `?cascade=confirm` to
* waive it, unlike `DELETE /domains/:slug`: what a domain cascade
* takes is the domain's own configuration, and what this one would
* take is deliveries other domains asked for.
*
* ZERO IS NOT A PROMISE THE DELETE WILL LAND, and unlike the sources
* group that is a statement about a RACE rather than about an
* uncounted key. `ConnectorDependentCounts` counts the one refusing
* key there is. A subscription written between the count and the
* delete is refused by the database all the same, and
* {@link deleteConnector} answers that as a 409 of its own wording
* with no counts at all — a different sentence, because the counted
* one quotes a number this refusal was reached with at zero, and
* because retrying is the right next act for one and not the other.
*
* NOTHING SUBMITTED REACHES A MESSAGE OR A DETAIL BUILT HERE. Every
* message below is a constant of this module's own, the only
* `details` it builds are the dependent count it read and the masked
* paths it walked, and no `StoreRefusal` field is copied into either
* — a driver error carries the whole statement with its bound
* parameters, so quoting one would put a submitted config on the
* wire and, through `errorHandler`, in a log line. That rule is
* sharper on this group than on any other: what a submitted config
* holds is a live credential.
*
* THE STORE IS A PARAMETER, so every rule here is exercisable with
* no database: `tests/helpers/memory-research-store.ts` stands
* behind the port, and the sentinel capture in
* `tests/api/connector-secret.test.ts` is what watches the assembled
* service instead.
 */
import type {
  ConnectorDependentCounts,
  ConnectorFilter,
  ConnectorRecord,
  ConnectorStore,
} from './store.js';
import type { FieldError } from '../../lib/errors/index.js';
import type { StoreWindow } from '../http/schemas.js';

import { z } from 'zod';

import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../lib/errors/index.js';
import { CONNECTOR_KINDS } from '../db/schema/values.js';
import { StoreRefusal } from '../db/store-errors.js';
import { parseBody } from '../http/validation.js';

import { findMaskedSecretPaths, maskConnectorConfig } from './secrets.js';

/**
 * Exactly the port methods these four functions reach.
 *
 * ONE PORT RATHER THAN TWO, which is where this type is simpler
 * than `SourceServiceStore` and `TopicServiceStore`: those pick a
 * `findDomainBySlug` off `DomainStore` because their collections
 * hang off a domain. This one hangs off the root, so there is no
 * second port to borrow from.
 *
 * SIX OF THE SEVEN METHODS, AND THE ABSENCE IS A CLAIM.
 * `findConnectorById` is not here because nothing below reads a row
 * before writing it: {@link patchConnector} and
 * {@link deleteConnector} let the store answer for an id no row
 * carries rather than buying a second round trip and a second
 * chance for the row to go in between. It is also what keeps a
 * stored credential out of this module's hands on the two
 * operations that have no business reading one.
 *
 * Built with `Pick` rather than by listing signatures, so a method
 * here cannot drift from the thing it is naming: a hand-copied
 * signature would go on type-checking against a port that had moved
 * under it.
 */
export type ConnectorServiceStore = Pick<
  ConnectorStore,
  | 'countConnectorDependents'
  | 'countConnectors'
  | 'deleteConnector'
  | 'insertConnector'
  | 'listConnectors'
  | 'updateConnector'
>;

/**
* The member of both bodies below which a key is the operator's own
* rather than this service's, as `ParseOptions.openPaths` in
* `src/http/validation.ts` takes it.
*
* ONE PREFIX AND IT SITS AT THE ROOT, matching the two
* `src/sources/service.ts` declares and unlike the domain's, which
* has to be spelled with a `settings.` prefix because that schema
* nests its open records one segment down.
*
* WHAT IT MASKS TODAY IS NOTHING FROM ZOD, AND SAYING SO IS THE
* POINT. The value schema under the prefix is `z.unknown()`, which
* refuses nothing, and a key of a JSON object is always a string, so
* no issue can be raised strictly below `config` as things stand. A
* body submitting `config` as an array or a number is refused at the
* prefix ITSELF, which `openCutoff` deliberately leaves unmasked.
*
* The declaration still earns its place twice over. It is in force
* on the day the value schema is narrowed — a config genuinely
* differs by `kind`, so a per-kind shape is the obvious next thing
* to want here. And {@link maskedSecretRefusal} below applies the
* SAME rule by hand to the paths it reports, which is the one
* refusal on this surface that does reach below the prefix.
*
* Declared once and passed to both parses. Written twice they would
* be free to drift, and a PATCH that masked a key a POST echoed is a
* leak with no failing test anywhere.
 */
const CONFIG_OPEN_PATHS = ['config'];

/**
* The body member a masked-secret detail is reported under.
*
* The head of every path {@link maskedSecretRefusal} builds, and the
* one segment of it this service chose rather than the operator.
 */
const CONFIG_FIELD = 'config';

/**
* What a detail shows in place of a path segment the operator chose.
*
* SPELLED AGAIN RATHER THAN IMPORTED, because the constant it
* matches — `OPEN_SEGMENT` in `src/http/validation.ts` — is private
* to that module and deliberately so. The two are equal by intent
* rather than by derivation, which is the arrangement every message
* constant on this surface has; what keeps them honest is that both
* spellings reach the wire and a case pins this one as a literal.
 */
const OPEN_SEGMENT = '*';

/**
 * The message a 422 built here carries.
 *
 * The parser's own wording, spelled again for the reason
 * `src/taxonomy/terms-service.ts` gives: a caller reading a 422 off
 * this surface gets the same sentence whether a schema refused the
 * body or a rule refused the payload, and reads the details for
 * which.
 */
const VALIDATION_FAILED = 'Validation failed';

/**
 * What a detail says when a config submitted the mask.
 *
 * Written in the third person about the field the detail names and
 * closed with a full stop, so it reads as one sentence beside the
 * fixed vocabulary `src/http/validation.ts` answers for a zod issue
 * — a caller reading a details list cannot tell which of the two
 * built which, and has no reason to.
 *
 * It quotes nothing that was sent. What a caller is told is that
 * the value it copied back was never a secret in the first place;
 * which member it copied, it already knows.
 */
const MASK_IS_NOT_A_SECRET
  = 'Carries the value a read answers in place of a secret.';

/**
 * The code that detail carries.
 *
 * THIS SERVICE'S OWN, and it has to be: no schema can raise it,
 * because the rule it reports is about a VALUE and every schema on
 * this surface is forbidden to read one into a refusal. Named for
 * the fact rather than for the remedy, so a client branching on it
 * is branching on what happened.
 */
const MASKED_SECRET_CODE = 'masked_secret';

/** What a caller is told when no connector carries that id. */
const NO_SUCH_CONNECTOR = 'No connector carries that id';

/**
 * What a caller is told when the kind and name pair is taken.
 *
 * Names the PAIR rather than the name, because the key is per-kind:
 * one name under two kinds is ordinary, and a sentence naming the
 * name alone would send an operator looking for a collision that is
 * not there.
 */
const CONNECTOR_NAME_TAKEN
  = 'This deployment already carries a connector of that kind by '
  + 'that name';

/**
* What a caller is told when a delete meets a connector some
* subscription still names.
*
* The rule and the repair, because the repair is a different request
* rather than a correction to this one: the subscriptions naming
* this row are edited under `/exports`, in the domains that asked
* for them. Naming that is what keeps the refusal from reading as a
* dead end, since there is no confirmation that gets past this one.
*
* The count travels as `details`, so the sentence itself says only
* what happened.
 */
const CONNECTOR_IS_SUBSCRIBED
  = 'Export subscriptions still deliver through this connector; '
  + 'retire those under /exports first';

/**
 * What a caller is told when the delete was refused after the guard
 * had passed.
 *
 * A SEPARATE SENTENCE BECAUSE IT IS A SEPARATE FACT, and the one
 * above would be a lie here: it names a count this refusal is
 * reached with at zero. `ConnectorDependentCounts` counts the one
 * key that refuses, so the only state producing this is a
 * subscription written between the count and the delete — which
 * makes retrying the right next act, where retrying the refusal
 * above would only meet it again.
 */
const CONNECTOR_JUST_SUBSCRIBED
  = 'An export subscription named this connector while the delete '
  + 'was in flight';

/**
* What a connector body may carry as its family of service.
*
* `CONNECTOR_KINDS` rather than four literals, so this schema and
* `connectors_kind_check` are two readings of one tuple: a member
* added to it reaches both without either being edited, and a member
* removed from it makes this surface unable to write a kind the
* column would refuse.
*
* An enum answers `invalid_value` and its detail names the allowed
* OPTIONS rather than the value submitted, which
* `src/http/validation.ts` measured — so a caller is told what the
* four are without being told back what it sent. It answers that
* same code for an ABSENT member, where a string would answer
* `invalid_type`, which is measured rather than assumed.
*
* Declared for ONE write rather than two, unlike `sourceKindSchema`,
* which both source writes share. `kind` is not patchable here —
* {@link patchConnectorSchema} says why — so there is no second call
* site to hold to the same set.
 */
const connectorKindSchema = z.enum(CONNECTOR_KINDS);

/**
* What a connector body may carry as its config.
*
* AN OPEN RECORD, whose keys are the operator's and whose values
* this service takes no view of at all. What a config holds is the
* client's business and differs by `kind`, so one shape across the
* four kinds would describe none of them accurately — the argument
* `src/db/schema/sources.ts` makes at the column and `./store.ts`
* repeats for the port.
*
* The `z.string()` in the key slot is the openness spelled out
* rather than a check on it: zod requires a key schema and a value
* schema, and a string key is the one constraint no key of a JSON
* object can violate. `z.unknown()` in the value slot is the same
* statement about values, and it is why the mask refusal below is a
* rule of this module's rather than a member of this schema — a
* value schema refusing one literal would have to read a value into
* an issue, which the boundary parser is built not to do.
*
* WHAT IT STILL REFUSES is a `config` that is not an object — an
* array, a number, a string, a null — which is the one fault this
* member can raise while its value schema is `unknown`, and the
* reason the record is declared at all rather than the member being
* typed `z.unknown()` outright. A config that is not a map of
* settings is configuration nobody finished, and it would reach the
* column as a jsonb value every client reading it would have to
* guess about. It is also what makes
* `Readonly<Record<string, unknown>>` the honest argument type for
* {@link findMaskedSecretPaths}.
*
* ONE KEY IS THE EXCEPTION, AND IT IS ZOD'S RATHER THAN THIS
* MODULE'S: an own `__proto__` inside the record is DROPPED before
* its value is ever seen, so a config carrying one is accepted and
* STORED without it rather than refused. Measured under the zod
* 4.5.1 in this tree, against a body that came through `JSON.parse`.
* `src/sources/service.ts` and `src/settings/payload.ts` record the
* same behaviour on the other open records in this service. It has a
* sharper reading here and it is worth stating: a secret filed under
* that key is dropped rather than stored, so the connector simply
* has no credential, and nothing on the wire says so.
*
* Declared once and reused by both writes, so a create and a patch
* cannot end up held to different rules.
 */
const connectorConfigSchema = z.record(z.string(), z.unknown());

/**
* The body `POST /connectors` accepts.
*
* Strict, like every request schema on this surface, so a misspelt
* member is a refusal rather than a silently dropped one — which on
* a `config` member matters more than usual, a dropped one being a
* connector stored with no credential at all.
*
* `kind` AND `name` ARE THE WHOLE OF WHAT IS REQUIRED, which is what
* a connector minimally is: a family of service and which instance
* of it this row is. Together they are the natural key, so a create
* naming neither could not be told from any other.
*
* `name` IS HELD TO NON-EMPTY AND NOTHING MORE. The column is NOT
* NULL, which is not the same as non-empty, and an empty name is
* configuration somebody has not finished — it takes the natural
* key's place and refuses the next row meaning to occupy it.
* Narrowing further is not available: what a name means is the
* operator's, and the only shape rule the table has is the pair
* being unique.
*
* `config` IS OPTIONAL AND THE OMISSION BECOMES `{}` in
* {@link createConnector} rather than here. That is the port's
* instruction — `InsertConnectorInput` requires it so that no
* implementation gets to decide what an absence means — and the
* empty object is a complete value rather than an absence, which is
* also the column default. For a connector it means there is nowhere
* to reach: the row names a service the pipeline cannot call rather
* than one it calls with defaults.
*
* There is no `domainId` to leave off and no pipeline-owned column
* to refuse. `connectors` carries four columns and this body names
* three of them; the fourth is the id the write stamps.
 */
export const createConnectorSchema = z.object({
  kind: connectorKindSchema,
  name: z.string().min(1),
  config: connectorConfigSchema.optional(),
}).strict();

/**
* The body `PATCH /connectors/:id` accepts.
*
* Every member optional, so a patch carrying nothing at all is a
* legal call answering the stored row — which `ConnectorStore`
* states rather than leaving to its implementations, since
* `connectors` carries no `updated_at` for a write to stamp and an
* empty update list is something drizzle throws on.
*
* `kind` IS DELIBERATELY ABSENT, which is where this patch differs
* from `patchSourceSchema`, whose `kind` IS patchable. The two
* columns look alike and are not: a source's kind selects the
* adapter that reads that one row, while a connector's kind is read
* by rows and by queries that are not this one and neither can see
* the edit — an `export_subscriptions` row names a connector by id
* while MEANING one of a particular kind, and `ar-ingest` selects
* the row it calls BY KIND. `ConnectorPatch` carries the whole
* argument. A connector whose kind is wrong is a different
* connector: delete it and create the one that was meant, which is
* an explicit act with a delete guard in front of it.
*
* A body naming `kind` is therefore refused as an unrecognized key
* rather than by an enum, and that difference is worth knowing when
* reading a detail: it names `body` rather than `kind`.
*
* EVERY MEMBER DISTINGUISHES TWO REQUESTS AND NOT THREE. Absent
* leaves the column alone and a value replaces it; neither member is
* nullable, because both columns are NOT NULL. A config is cleared
* by sending `{}`, which is what empty means at that column rather
* than a workaround.
*
* `config` REPLACES THE STORED DOCUMENT WHOLE and is never merged
* into it. That rule is the store's and is stated there; what this
* schema contributes is that an empty object gets through, since a
* request clearing every setting and a request leaving them alone
* would otherwise be the same bytes. The consequence is sharper here
* than on a domain's `settings` and
* `docs/architecture/08-http-api.md` argues it: a patch omitting a
* secret's key has CLEARED that secret, and the request doing it by
* accident is byte-identical to the one doing it on purpose.
 */
export const patchConnectorSchema = z.object({
  name: z.string().min(1)
    .optional(),
  config: connectorConfigSchema.optional(),
}).strict();

/**
* One page of the connector list, beside the size of the collection
* it was read from.
*
* Two members rather than a rendered envelope, for the reason
* `DomainPage` in `src/domains/service.ts` gives: building `meta` is
* the router's half, and this module was never told what the window
* was in `page`/`perPage` terms.
 */
export interface ConnectorPage {
  /**
  * The rows the window selected, kind ascending with name ascending
  * beside it, EVERY CONFIG MASKED.
  *
  * `ConnectorRecord` is the type either way, masked or not, because
  * `config` is `unknown` on it and a mask is a value of that type.
  * What says these are masked is this module, at the one place a
  * row leaves it.
   */
  readonly rows: readonly ConnectorRecord[];

  /** How many connectors match the filter, ignoring the window. */
  readonly total: number;
}

/**
 * One record, with every rostered value replaced by the mask.
 *
 * @param row - The row as the port answered it, credential and all.
 * @returns A record of the same shape whose `config` is a NEW value
 *   with each rostered member replaced. The stored object is never
 *   mutated and never shared with the answer, which
 *   `maskConnectorConfig` promises unconditionally.
 *
 * @remarks
 * THE ONE PLACE A ROW LEAVES THIS MODULE, and it is a function
 * rather than three call sites spelling the same spread so that a
 * fifth operation added here has one obvious thing to call. Every
 * exported function below that answers a record answers this.
 *
 * It is deliberately not on the port. `ConnectorStore` answers the
 * config as stored, and its header gives three separate readings
 * that want it that way — the live suite compares a write against
 * the raw row, the sentinel capture watches the assembled service
 * rather than a store, and `ar-ingest` reads the column directly.
 * The mask is a property of what this SURFACE answers.
 */
function masked(row: ConnectorRecord): ConnectorRecord {
  return { ...row, config: maskConnectorConfig(row.config) };
}

/**
* The refusal a config submitting the mask earns, or null.
*
* @param config - The config as submitted, after the schema has made
*   it a record. Absent on a body that named no config, where there
*   is nothing to walk.
* @returns The 422 to throw, or null when the literal appears
*   nowhere.
*
* @remarks ONE DETAIL PER PLACE THE LITERAL SAT, in submission
* order, so a caller that copied two masked members back is told
* there were two. `findMaskedSecretPaths` reports the literal
* wherever it is and not only under a rostered key, because a value
* that reads as a sentinel is never one somebody meant to store and
* because the key it was copied onto need not be the key it was
* copied FROM.
*
* EVERY SEGMENT BELOW `config` IS MASKED, one for one, exactly as
* `toFieldPath` in `src/http/validation.ts` masks the segments below
* an `openPaths` prefix. A key inside this record is submitted
* content in the same sense a value is, and a detail naming it would
* be this module declaring the prefix open for zod's issues and then
* echoing the very keys that declaration exists to keep off the
* wire.
*
* What survives the masking is the DEPTH, which is structural: a
* caller reading `config.*` was told the literal sat at a member of
* the config and one reading `config.*.*` was told it sat inside
* one, and those are different things to go and look at. The count
* survives too, one detail per occurrence. What a caller is not told
* is which key — which it already knows, having copied it.
*
* The details are built per call rather than shared from a module
* constant, so nothing a handler or a serialiser does to one
* refusal's details can reach the next one's.
 */
function maskedSecretRefusal(
  config: Readonly<Record<string, unknown>> | undefined,
): ValidationError | null {
  if (config === undefined) {
    return null;
  }

  const paths = findMaskedSecretPaths(config);

  if (paths.length === 0) {
    return null;
  }

  const details: FieldError[] = paths.map((path) => ({
    field: [
      CONFIG_FIELD,
      ...path.split('.').map(() => OPEN_SEGMENT),
    ].join('.'),
    message: MASK_IS_NOT_A_SECRET,
    code: MASKED_SECRET_CODE,
  }));

  return new ValidationError(VALIDATION_FAILED, details);
}

/**
* Turns what a connector WRITE refused into what the caller is told.
*
* @param err - Whatever the store threw.
* @returns Never; every path throws.
* @throws ConflictError - For a kind and name pair the deployment
*   already carries, which is the one reason either write below
*   declares.
* @throws The original error, unchanged, when it is not a
*   `StoreRefusal` or carries a reason this translation does not
*   name. A `check-violation` is the one worth calling out: the
*   boundary holds `kind` to the tuple the CHECK is generated from,
*   so meeting one here means the two have drifted apart, and 500 is
*   the honest status for a fault no caller can act on.
*
* @remarks NO `foreign-key-violation` BRANCH, AND THAT IS THIS TABLE
* RATHER THAN AN OMISSION. `connectors` references nothing at all,
* so neither write below can raise one and a branch for it would be
* unreachable code describing a constraint that does not exist. The
* delete has a translation of its own, because the foreign key it
* meets points the other way: at this row, from a subscription.
 */
function refuseWrite(err: unknown): never {
  if (!(err instanceof StoreRefusal)) {
    throw err;
  }

  if (err.reason === 'unique-violation') {
    throw new ConflictError(CONNECTOR_NAME_TAKEN, undefined, {
      cause: err,
    });
  }

  throw err;
}

/**
 * Whether a connector is still named by anything.
 *
 * @param counts - What the store counted.
 * @returns Whether any member is above zero.
 *
 * @remarks
 * Read over the VALUES rather than member by member, so a second
 * counted table added to `ConnectorDependentCounts` is guarded the
 * day it is answered rather than the day somebody remembers to add
 * a clause. The spread is what lets a readonly record be walked.
 *
 * `holdsDependents` in `src/domains/service.ts` and in
 * `src/sources/service.ts` are the same shape over different
 * records, and the three are separate for the reason every
 * duplicated helper here is: the records are equal by intent rather
 * than by derivation.
 */
function holdsDependents(counts: ConnectorDependentCounts): boolean {
  return Object.values({ ...counts }).some((count) => count > 0);
}

/**
* Reads one window of the deployment's connectors, every config
* masked.
*
* @param store - Where the rows are read.
* @param filter - What to narrow to, or `{}` for every connector.
*   Already held to `CONNECTOR_KINDS` by `./routes.ts`, so nothing
*   here re-checks it and a kind no row carries is an empty page
*   rather than a refusal.
* @param window - The `limit`/`offset` window, as `toStoreWindow` in
*   `src/http/schemas.ts` derived it from `?page` and `?perPage`.
*   Already validated, so nothing here re-checks its bounds.
* @returns The rows and the size of the whole collection.
* @throws Nothing. There is no address to get wrong on this read —
*   the collection is met at the root — so this operation has no
*   refusal of its own and the router answers 200 unconditionally.
*
* @remarks THIS IS THE READ THE WRITE-ONLY RULE IS ABOUT. A caller
* reading a connector reads it here, and what it gets under a
* rostered key is the mask. Every row is masked, not the first page
* or the rows a filter selected: the map below is unconditional.
*
* The two reads are issued together rather than in sequence, for the
* reason `listDomains` gives: a page's rows and the collection's
* size are independent questions, and awaiting them one after the
* other would make every list request pay two round trips to answer
* one body. Both are handed the SAME filter, which is what keeps a
* page's `meta.total` from describing a different collection than
* the page.
*
* A window past the end of the collection is an empty page rather
* than a 404. The collection exists and only the window over it is
* empty, which a caller can see from `meta` once the router has
* built one.
 */
export async function listConnectors(
  store: ConnectorServiceStore,
  filter: ConnectorFilter,
  window: StoreWindow,
): Promise<ConnectorPage> {
  const [rows, total] = await Promise.all([
    store.listConnectors(filter, window),
    store.countConnectors(filter),
  ]);

  return { rows: rows.map(masked), total };
}

/**
* Adds one connector to the deployment.
*
* @param store - Where the row is written.
* @param body - The unvalidated request body, or the arguments an
*   MCP tool was called with.
* @returns The stored row, MASKED, and read back rather than
*   reconstructed, so the id is the database's own.
* @throws ValidationError - When the body does not satisfy
*   {@link createConnectorSchema}, with one detail per fault; and
*   when its `config` submits the mask, with one detail per place
*   the literal sat.
* @throws ConflictError - When the deployment already carries a
*   connector of that kind by that name.
*
* @remarks THE ANSWER IS MASKED THOUGH THE CALLER JUST SENT THE
* SECRET, and that is deliberate rather than pedantic. A create is
* answered by the same shape a read answers, so a client written
* against one works against the other, and a response body that
* carried the credential back would be the very artifact — a proxy
* log, a terminal scrollback, a pasted support ticket — the masking
* exists to keep it out of. The store holds what was submitted; this
* is what the wire sees.
*
* THE MASK IS REFUSED BEFORE THE WRITE IS ISSUED, so a body carrying
* it costs the table no round trip and a caller reading a 422 knows
* nothing was stored. It is refused before the CONFLICT is reached
* too: a body that both submits the mask and names a taken pair is a
* 422, which is the ordinary ordering of a fact about the request
* ahead of a fact about the rows.
*
* THE OMISSION BECOMES A VALUE HERE rather than in the schema or at
* the column, which is what `InsertConnectorInput` requiring
* `config` asks for: a default is a decision about what an absence
* means, and leaving one to the column would make the drizzle
* implementation quietly right and the in-memory one quietly wrong,
* since only one of the two has a column to default from.
*
* THE SERVICE IS NOT REACHED. This writes a row and answers it, with
* no request to the address the config names and no check that the
* credential works, so a config that turns out to be wrong is
* discovered by the next pipeline pass rather than by the call that
* wrote it. That is the ordinary price of configuration being a row,
* and it is what keeps this operation answerable with no network at
* all.
*
* The insert is `return await` inside the `try` rather than a bare
* `return`: returning the promise unawaited would settle it outside
* this block, the `catch` would never run, and every lost race in
* the deployment would answer 500 with the file still reading as if
* it handled one.
 */
export async function createConnector(
  store: ConnectorServiceStore,
  body: unknown,
): Promise<ConnectorRecord> {
  const input = parseBody(createConnectorSchema, body, {
    openPaths: CONFIG_OPEN_PATHS,
  });
  const submittedMask = maskedSecretRefusal(input.config);

  if (submittedMask !== null) {
    throw submittedMask;
  }

  try {
    const stored = await store.insertConnector({
      kind: input.kind,
      name: input.name,
      config: input.config ?? {},
    });

    return masked(stored);
  } catch (err) {
    return refuseWrite(err);
  }
}

/**
* Rewrites the supplied members of one connector.
*
* @param store - Where the row is written.
* @param id - The connector's id, as `resourceIdParamSchema` in
*   `src/http/schemas.ts` parsed it.
* @param body - The unvalidated patch.
* @returns The stored row afterwards, MASKED.
* @throws ValidationError - When the body does not satisfy
*   {@link patchConnectorSchema}, with one detail per fault; and
*   when its `config` submits the mask.
* @throws NotFoundError - When no connector carries the id.
* @throws ConflictError - When the RESULTING name is one the
*   deployment already carries under this row's kind.
*
* @remarks THE PARSED PATCH IS HANDED STRAIGHT TO THE PORT, with no
* defaulting step between the two. Every member here distinguishes
* two requests rather than three, so there is no absent-versus-null
* pair for a `??` to collapse — but the same discipline applies for
* a different reason: a default supplied here would rewrite a column
* the caller left alone, and on `config` that would clear a
* credential nobody asked about.
*
* THE ROUND TRIP THIS OPERATION IS THE HALF OF. A caller reads a
* connector, edits one member, and sends the whole object back —
* which is exactly the request the mask refusal above exists for,
* and exactly the request the replace-whole rule punishes when a
* caller drops the masked member instead of keeping it. The first is
* refused here; the second cannot be, being byte-identical to a
* deliberate clear, and `docs/architecture/08-http-api.md` argues
* why a merge would be the worse trade.
*
* NO ROW IS READ BEFORE THE WRITE. `ConnectorStore.updateConnector`
* answers `null` for an id no row carries, so a preceding
* `findConnectorById` would buy a second round trip and a second
* chance for the row to go in between; the 404 below is the same
* fact either way. That is also why `findConnectorById` is not among
* the methods {@link ConnectorServiceStore} picks, and it is what
* keeps a stored credential out of this operation's hands.
*
* A patch carrying no member at all is legal and answers the stored
* row, which is the port's rule rather than this module's:
* `connectors` has no `updated_at`, so an empty patch has literally
* nothing to set.
*
* NO PATCH CAN REACH `kind`, and the containment is the schema's
* rather than a check here — {@link patchConnectorSchema} declares
* no member that could carry one. That is also what keeps
* `connectors_kind_check` off this write, so an update raises
* exactly one mechanism.
 */
export async function patchConnector(
  store: ConnectorServiceStore,
  id: number,
  body: unknown,
): Promise<ConnectorRecord> {
  const patch = parseBody(patchConnectorSchema, body, {
    openPaths: CONFIG_OPEN_PATHS,
  });
  const submittedMask = maskedSecretRefusal(patch.config);

  if (submittedMask !== null) {
    throw submittedMask;
  }

  let updated: ConnectorRecord | null;

  try {
    updated = await store.updateConnector(id, patch);
  } catch (err) {
    return refuseWrite(err);
  }

  if (updated === null) {
    throw new NotFoundError(NO_SUCH_CONNECTOR);
  }

  return masked(updated);
}

/**
* Deletes one connector, refusing absolutely while a subscription
* still delivers through it.
*
* @param store - Where the count is read and the row removed.
* @param id - The connector's id.
* @returns Nothing. The router answers 204, because a deleted
*   resource has no representation to carry — and on this group that
*   also means no last unmasked read of a config.
* @throws NotFoundError - When no connector carries the id.
* @throws ConflictError - When export subscriptions still name the
*   connector, with `details` carrying the count; and when one was
*   written after the count was read, with no `details` at all.
*
* @remarks THERE IS NO CONFIRMATION THAT GETS PAST THIS GUARD, which
* is the difference from `DELETE /domains/:slug` and is a decision
* about what each act takes. A domain cascade takes the domain's own
* configuration, which an operator can be shown and can authorise.
* This would cancel deliveries that other domains asked for, and the
* operator retiring a shared service is not the operator who
* subscribed to it — `src/db/schema/scheduling.ts` argues it at the
* column. So the refusal names where those subscriptions are edited
* instead.
*
* THE GUARD PREVENTS NOTHING AT THE DATABASE, and it is not there
* to. The one foreign key onto `connectors.id` emits
* `ON DELETE no action`, so the statement below is refused whatever
* this function decided. What the guard buys is a refusal a caller
* can read: the count says how much is holding the row, where the
* bare foreign-key error says only that something is.
*
* THE COUNTED SET IS COMPLETE HERE, which it is not on the sources
* group, and the second refusal below is therefore about a RACE
* rather than about a key nobody counts. `./store.ts` re-derives
* that from the generated SQL rather than from a plan. A
* subscription written between the count and the write is refused
* all the same, and it answers a different sentence with no counts —
* inventing a zero there would say the opposite of what happened,
* and the two refusals want different next acts: retry, or go and
* look at `/exports`.
*
* AN UNKNOWN ID FALLS THROUGH THE GUARD RATHER THAN BEING LOOKED UP
* FIRST. `countConnectorDependents` answers zero for an id no
* connector carries, because nothing points at a row that is not
* there, so the guard passes and the store answers `false` — the
* same 404 a lookup would have raised, one round trip earlier.
 */
export async function deleteConnector(
  store: ConnectorServiceStore,
  id: number,
): Promise<void> {
  const dependents = await store.countConnectorDependents(id);

  if (holdsDependents(dependents)) {
    throw new ConflictError(CONNECTOR_IS_SUBSCRIBED, dependents);
  }

  let removed: boolean;

  try {
    removed = await store.deleteConnector(id);
  } catch (err) {
    if (
      err instanceof StoreRefusal
      && err.reason === 'foreign-key-violation'
    ) {
      throw new ConflictError(CONNECTOR_JUST_SUBSCRIBED, undefined, {
        cause: err,
      });
    }

    throw err;
  }

  if (!removed) {
    throw new NotFoundError(NO_SUCH_CONNECTOR);
  }
}
