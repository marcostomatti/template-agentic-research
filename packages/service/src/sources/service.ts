/**
 * @packageDocumentation
 * The source rules: reading one domain's feeds with what they have
 * captured, adding one, retuning one, and taking one away. What
 * `/domains/:slug/sources` and `/sources/:id` reduce to once HTTP
 * is subtracted from them.
 *
 * FOUR FUNCTIONS, AND THE DIRECTORY HOLDS TWO MORE SURFACES THAT
 * ARE NOT THEM. `./failures-service.ts` beside this file answers
 * `GET /sources/:id/failures` over the same port, and is separate
 * because its subject is a `documents` row rather than a `sources`
 * one. `./index.ts` is the adapter contract and the registry, a
 * different question again about the same rows — `./store.ts`
 * carries that whole split. Nothing here constructs an adapter,
 * opens a socket, or runs a parse: a source is configuration, and
 * this module is what edits it.
 *
 * THERE ARE NO SCHEDULE VERBS HERE. `sources` spreads no
 * `schedulableColumns()` and carries no `next_run_at` at all — a
 * feed is read when the topic that needs it comes due — so the two
 * verbs `src/topics/service.ts` exports have no counterpart on this
 * surface and nothing on this port could serve one.
 *
 * THE BODY IS PARSED HERE RATHER THAN ABOVE, exactly as every
 * wave-1 service argues: an operation handed an already-validated
 * input would have two callers validating it, the router today and
 * the MCP tool tomorrow, from a second schema nobody would notice
 * drifting. So {@link createSource} and {@link patchSource} take an
 * `unknown` and run it through {@link parseBody}.
 *
 * THE WINDOW ARRIVES ALREADY DERIVED, and the asymmetry with the
 * body is the one `src/domains/service.ts` states. What a source IS
 * includes its transport, its address and the arrangement for
 * reading it, so an operation that did not check them would not be
 * the operation; `?page` and `?perPage` are how a caller ASKED, a
 * vocabulary belonging to HTTP that an MCP tool would not spell at
 * all. `toStoreWindow` in `src/http/schemas.ts` owns that
 * translation and {@link listSources} takes its output.
 *
 * THE DOMAIN IS RESOLVED FIRST, ON THE TWO OPERATIONS THAT NAME
 * ONE. `SourceStore` resolves no slug — its own header says so — so
 * a `:slug` is turned into a `DomainRecord` through
 * `DomainStore.findDomainBySlug` before any source is read or
 * written, and a slug naming no row is a 404 that costs the sources
 * table no read at all. The other two operations name
 * `/sources/:id` and no domain, so there is nothing to resolve: the
 * row carries its own `domainId`, and no rule on this table spans a
 * domain in any case.
 *
 * NO CREATE HERE CAN BE A 409, WHICH IS THE DEPARTURE FROM EVERY
 * OTHER RESOURCE GROUP ON THIS SURFACE. `sources` carries no unique
 * key at all — `./store.ts` reads that off the generated SQL — so
 * there is nothing for a duplicate to land on and no
 * `unique-violation` for a translation to answer. Two rows naming
 * one endpoint are ordinary rather than a fault: the same feed read
 * under two kinds, or a second row differing only in
 * `parser_config` while an arrangement is being cut over. The cost
 * is that a double POST leaves two rows fetching one feed and
 * nothing here notices.
 *
 * THE ONE REFUSAL WITH COUNTS IN IT IS THE DELETE, and it is
 * absolute. `documents.source_id` and `finding_sightings.source_id`
 * both emit `ON DELETE no action`, so the database refuses whoever
 * asks; {@link deleteSource} reads the counts first so that the
 * refusal can say what the delete would have taken. There is no
 * `?cascade=confirm` to waive it, unlike `DELETE /domains/:slug`:
 * what a domain cascade takes is the domain's own configuration,
 * and what this one would take is a corpus and the syndication
 * evidence that cites it. Retiring a feed is `enabled: false`
 * through {@link patchSource}, and the refusal names it.
 *
 * A THIRD KEY REFUSES AND IS NOT COUNTED, so a guard that passed is
 * not a promise the delete will land. The key is
 * `source_config_proposals_source_id_sources_id_fk`, which refuses
 * a source a config proposal still names, and
 * `SourceDependentCounts` describes the two above and not that one.
 * A capture can also write a document between the count and the
 * delete. Both arrive as an ordinary `foreign-key-violation` out of
 * the write, and {@link deleteSource} answers them 409 without
 * counts rather than pretending to a number it did not read.
 *
 * A `check-violation` IS RETHROWN, AND THAT IS THE ONE PLACE THIS
 * MODULE DIFFERS FROM ITS SIBLINGS IN HOW IT READS A REFUSAL.
 * `sources_kind_check` is generated from `SOURCE_KINDS` in
 * `src/db/schema/values.ts`, and both schemas below hold `kind` to
 * that same tuple, so the boundary refuses a bad kind as a 422
 * before any write is issued. A CHECK refusal reaching this module
 * therefore means the tuple and the column have drifted apart,
 * which is a deployment fault a caller cannot act on: 500 is the
 * honest status for it, and dressing it as a 422 would tell an
 * operator to fix a request that was correct.
 *
 * THE FIVE PIPELINE-OWNED COLUMNS ARE REFUSED AS UNRECOGNIZED KEYS
 * ON BOTH WRITES. `cursor`, `consecutiveFailures`, `lastSuccessAt`,
 * `lastFailureAt` and `flagged` are answered on every read and
 * declared by neither schema below, which is the rule
 * `docs/architecture/08-http-api.md` states applied to the columns
 * this table carries for the pipeline. It is `.strict()` doing its
 * ordinary work rather than a check of its own, which is what makes
 * the refusal hold for a column added later: it has to be argued
 * ONTO a request schema rather than quietly inherited by one.
 * `flagged` is the one worth arguing rather than asserting, and the
 * argument is in that document: clearing the flag without repairing
 * the config that failed brings it straight back, so a patchable
 * boolean would be a button that hides that nothing was fixed.
 *
 * NOTHING SUBMITTED REACHES A MESSAGE OR A DETAIL BUILT HERE. Every
 * message below is a constant of this module's own, and the only
 * `details` it ever builds are the two dependent counts — numbers
 * this module read, rather than anything a caller sent. No
 * `StoreRefusal` field is copied into a message: a driver error
 * carries the whole statement with its bound parameters, so quoting
 * one would put a submitted endpoint on the wire and, through
 * `errorHandler`, in a log line.
 *
 * THE STORE IS A PARAMETER, so every rule here is exercisable with
 * no database: `tests/helpers/memory-research-store.ts` stands
 * behind both ports over one dataset, which is what lets a domain
 * resolved through one of them own the sources read through the
 * other.
 */
import type {
  SourceDependentCounts,
  SourceRecord,
  SourceStore,
  SourceWithParseStats,
} from './store.js';
import type { DomainRecord, DomainStore } from '../domains/store.js';
import type { StoreWindow } from '../http/schemas.js';

import { z } from 'zod';

import { ConflictError, NotFoundError } from '../../lib/errors/index.js';
import { SOURCE_KINDS } from '../db/schema/values.js';
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
 * have this module claim to need the domain writes it never issues.
 *
 * THREE OF THE NINE SOURCE METHODS ARE DELIBERATELY ABSENT, and
 * each absence is a claim. `listSourceFailures` and
 * `countSourceFailures` belong to `./failures-service.ts`, so the
 * review queue and the resource operations are separately declared
 * and neither can quietly grow into the other. `findSourceById` is
 * absent because nothing here reads a row before writing it:
 * {@link patchSource} and {@link deleteSource} let the store answer
 * for an id no row carries rather than buying a second round trip
 * and a second chance for the row to go in between. The two topic
 * schedule verbs need that method and say so; nothing on this
 * surface decides on a stored member.
 *
 * Built with `Pick` rather than by listing signatures, so a method
 * here cannot drift from the thing it is naming: a hand-copied
 * signature would go on type-checking against a port that had moved
 * under it.
 */
export type SourceServiceStore =
  Pick<DomainStore, 'findDomainBySlug'>
  & Pick<
    SourceStore,
    | 'countSourceDependents'
    | 'countSources'
    | 'deleteSource'
    | 'insertSource'
    | 'listSourcesWithParseStats'
    | 'updateSource'
  >;

/**
 * The prefixes of a source body below which a key is the operator's
 * own rather than this service's, as `ParseOptions.openPaths` in
 * `src/http/validation.ts` takes them.
 *
 * BOTH SIT AT THE ROOT of the two bodies below, unlike the domain's
 * two, which `src/domains/service.ts` has to spell with a
 * `settings.` prefix because its schema nests them one segment
 * down. A prefix is matched segment-wise against the path of the
 * value BEING PARSED, so the same record reached under a different
 * spelling needs a different declaration — which is why the list is
 * here, at the call site, rather than beside the schemas.
 *
 * WHAT IT MASKS TODAY IS NOTHING, AND SAYING SO IS THE POINT. The
 * value schema under both prefixes is `z.unknown()`, which refuses
 * nothing, and a key of a JSON object is always a string, so no
 * issue can be raised strictly below either prefix as things stand.
 * A body submitting `parserConfig` as an array or a number is
 * refused at the prefix ITSELF, which `openCutoff` deliberately
 * leaves unmasked — a fault against the record AS A WHOLE names it,
 * and that is the one refusal these two members can reach.
 *
 * It is declared anyway, and the cost is one array. What the
 * declaration buys is that the masking is already in place on the
 * day the value schema is narrowed: a parser config genuinely
 * differs by `kind`, so a per-kind shape is the obvious next thing
 * to want here, and it is the edit that would otherwise start
 * putting operator-chosen keys into a refusal with no diff in
 * `src/http/validation.ts` and no failing case anywhere.
 *
 * Declared once and passed to both parses. Written twice they would
 * be free to drift, and a PATCH that masked a key a POST echoed is
 * a leak with no failing test anywhere.
 */
const CONFIG_OPEN_PATHS = ['parserConfig', 'contract'];

/**
 * What a caller is told when no domain carries the slug it named.
 *
 * The slug is not in it, per this module's header, and the same
 * sentence the wave-1 services and `src/topics/service.ts` answer
 * for their own `:slug` — spelled again rather than imported,
 * because the five are equal by intent rather than by derivation
 * and any of them is free to change without dragging the others
 * with it.
 */
const NO_SUCH_DOMAIN = 'No domain carries that slug';

/** What a caller is told when no source carries the id it named. */
const NO_SUCH_SOURCE = 'No source carries that id';

/**
 * What a caller is told when a delete meets a source the corpus
 * still cites.
 *
 * The rule and the repair, because the repair is a different
 * request rather than a correction to this one: `enabled` is
 * patchable, so retiring the feed is a PATCH the caller takes
 * instead. Naming it is what keeps the refusal from reading as a
 * dead end, since there is no confirmation that gets past this one
 * and no second call that would.
 *
 * The counts travel as `details`, so the sentence itself says only
 * what happened.
 */
const SOURCE_HOLDS_ROWS
  = 'This source has captured rows that still cite it; retire it by '
  + 'setting enabled to false';

/**
 * What a caller is told when the delete was refused by something
 * the guard did not count.
 *
 * A SEPARATE SENTENCE BECAUSE IT IS A SEPARATE FACT, and the one
 * above would be a lie here: it names documents and sightings, and
 * this refusal is reached with both of those counted at zero. Two
 * states produce it — a pending or applied config proposal still
 * naming the source, which nothing on this port counts, and a
 * capture that wrote a document between the count and the delete —
 * and neither has a number this module could put in `details`
 * without reading it a second time and inviting the same race
 * again.
 *
 * `./store.ts` carries the whole of that argument, including why
 * the third key is not counted at all.
 */
const SOURCE_STILL_REFERENCED
  = 'Something outside this feed still references this source';

/**
 * What a source body may carry as its transport family.
 *
 * `SOURCE_KINDS` rather than four literals, so this schema and
 * `sources_kind_check` are two readings of one tuple: a member
 * added to it reaches both without either being edited, and a
 * member removed from it makes this surface unable to write a kind
 * the column would refuse. `ProposalSource` in
 * `./config-proposer.ts` takes the same view of the same column.
 *
 * An enum answers `invalid_value` and its detail names the allowed
 * OPTIONS rather than the value submitted, which
 * `src/http/validation.ts` measured — so a caller is told what the
 * four are without being told back what it sent.
 *
 * Declared once and reused by both writes rather than written out
 * twice, since `kind` is patchable and a create and a repoint have
 * to be held to one set.
 */
const sourceKindSchema = z.enum(SOURCE_KINDS);

/**
 * What a source body may carry as either of its two jsonb
 * documents.
 *
 * AN OPEN RECORD, whose keys are the operator's and whose values
 * this service takes no view of at all. What a parser config holds
 * is the adapter's business and differs by `kind`, so one shape
 * across all four kinds would describe none of them accurately —
 * the argument `src/db/schema/sources.ts` makes at both columns and
 * `./store.ts` repeats for the port.
 *
 * The `z.string()` in the key slot is the openness spelled out
 * rather than a check on it: zod requires a key schema and a value
 * schema, and a string key is the one constraint no key of a JSON
 * object can violate. `z.unknown()` in the value slot is the same
 * statement about values.
 *
 * WHAT IT STILL REFUSES is a `parserConfig` that is not an object —
 * an array, a number, a string, a null — which is the one fault
 * these members can raise and the reason the record is declared at
 * all rather than the member being typed `z.unknown()` outright. A
 * config that is not a map of settings is configuration nobody
 * finished, and it would reach the column as a jsonb array that
 * every adapter reading it would have to guess about.
 *
 * ONE KEY IS THE EXCEPTION, AND IT IS ZOD'S RATHER THAN THIS
 * MODULE'S: an own `__proto__` inside the record is DROPPED before
 * its value is ever seen, so an arrangement carrying one is
 * accepted and STORED without it rather than refused. Measured
 * under the zod 4.5.1 in this tree, against a body that came
 * through `JSON.parse`. `src/settings/payload.ts` records the same
 * behaviour on the other open record in this service, for the same
 * reason it is worth recording at all: what is stored differs from
 * what was submitted, and nothing on the wire says so.
 *
 * Declared once and reused by both members on both writes, so the
 * arrangement and the contract cannot end up held to different
 * rules.
 */
const jsonDocumentSchema = z.record(z.string(), z.unknown());

/**
 * The body `POST /domains/:slug/sources` accepts.
 *
 * Strict, like every request schema on this surface, so a misspelt
 * member is a refusal rather than a silently dropped one — and, on
 * this table, so that the five pipeline-owned columns are refused
 * by the same clause that refuses a typo.
 *
 * `kind` AND `endpoint` ARE THE WHOLE OF WHAT IS REQUIRED, which is
 * what a source minimally is: a transport family and an address.
 * Everything else has a complete empty value, and this schema is
 * where that is decided rather than at a column.
 *
 * `endpoint` IS HELD TO NON-EMPTY AND NOTHING MORE. The column is
 * NOT NULL, which is not the same as non-empty, and an empty
 * endpoint is configuration somebody has not finished — nothing to
 * fetch from and nowhere to listen. Narrowing further is not
 * available: what an endpoint means is `kind`'s to say, so a URL
 * shape would refuse the `push` rows whose endpoint names where a
 * payload lands, and it is not unique either, so there is no key
 * shape to enforce.
 *
 * THE TWO JSONB MEMBERS ARE OPTIONAL AND THE OMISSION BECOMES `{}`
 * in {@link createSource} rather than here. That is the port's
 * instruction — `InsertSourceInput` requires both so that no
 * implementation gets to decide what an absence means — and the
 * empty object is a complete value rather than an absence, which is
 * also the column default.
 *
 * `enabled` IS OPTIONAL AND DEFAULTS TO TRUE the same way, since a
 * source row exists in order to be read. Staging one switched off
 * is still expressible, which is what the member is for.
 *
 * `domainId` is absent, and deliberately: the path names the
 * domain, and a body member naming a second one would be a request
 * that could disagree with its own URL. The five pipeline-owned
 * columns are absent per this module's header, so a source is
 * created NEVER FETCHED and cannot claim a history it does not
 * have.
 */
export const createSourceSchema = z.object({
  kind: sourceKindSchema,
  endpoint: z.string().min(1),
  parserConfig: jsonDocumentSchema.optional(),
  contract: jsonDocumentSchema.optional(),
  enabled: z.boolean().optional(),
}).strict();

/**
 * The body `PATCH /sources/:id` accepts.
 *
 * Every member optional, so a patch carrying nothing at all is a
 * legal call answering the stored row — which `SourceStore` states
 * rather than leaving to its implementations, since `sources`
 * carries no `updated_at` for a write to stamp and an empty update
 * list is something drizzle throws on.
 *
 * `kind` IS PATCHABLE, which no natural key on this surface is and
 * which this table can afford because it has no natural key at all.
 * Repointing a feed at a different transport is an ordinary
 * correction — a source configured as `url` that turns out to serve
 * an `api` payload — and what it changes is which adapter in
 * `./index.ts` reads the row on the next pass. It leaves the
 * documents already captured through the source exactly where they
 * are, which is the point of a source being configuration rather
 * than code. It is also what puts `sources_kind_check` on the
 * update as well as the insert.
 *
 * EVERY MEMBER DISTINGUISHES TWO REQUESTS AND NOT THREE, which is
 * where this patch differs from `patchTopicSchema` and from the
 * taxonomy's: absent leaves the column alone, present writes it,
 * and no member is nullable, because every column here is NOT NULL.
 * The two jsonb documents are cleared by sending `{}`, which is
 * what empty means at those columns rather than a workaround, and
 * {@link patchSource} hands the parsed patch straight to the port
 * so that nothing between the two can collapse an absence into
 * one.
 *
 * BOTH JSONB MEMBERS REPLACE THE STORED DOCUMENT WHOLE and are
 * never merged into it. That rule is the store's and is stated
 * there; what this schema contributes is that an empty object gets
 * through, since a request clearing every setting and a request
 * leaving them alone would otherwise be the same bytes.
 *
 * `domainId` is absent, so a source cannot be moved between
 * domains: the corpus it produced carries the OLD domain on every
 * row, so a move would leave a feed in one domain and its documents
 * in another with nothing in the schema to notice. Its absence is
 * also what keeps every foreign-key refusal off
 * {@link patchSource}. The five pipeline-owned columns are absent
 * per this module's
 * header, so no patch can clear a flag, rewind a cursor, or
 * backdate a stamp.
 */
export const patchSourceSchema = z.object({
  kind: sourceKindSchema.optional(),
  endpoint: z.string().min(1)
    .optional(),
  parserConfig: jsonDocumentSchema.optional(),
  contract: jsonDocumentSchema.optional(),
  enabled: z.boolean().optional(),
}).strict();

/**
 * One page of a domain's sources, beside the size of the collection
 * it was read from.
 *
 * Two members rather than a rendered envelope, for the reason
 * `DomainPage` in `src/domains/service.ts` gives: building `meta`
 * is the router's half, and this module was never told what the
 * window was in `page`/`perPage` terms.
 */
export interface SourcePage {
  /**
   * The rows the window selected, id ascending, each carrying its
   * parse-status aggregate.
   *
   * `SourceWithParseStats` rather than `SourceRecord`, which is the
   * one place a page on this surface answers more than the table:
   * the counts are what an operator deciding which feed to retire
   * is reading, and `./store.ts` carries why they are part of this
   * read rather than a second call.
   */
  readonly rows: readonly SourceWithParseStats[];

  /** How many sources the domain holds, ignoring the window. */
  readonly total: number;
}

/**
 * Turns what a source WRITE refused into what the caller is told.
 *
 * @param err - Whatever the store threw.
 * @returns Never; every path throws.
 * @throws NotFoundError - For a `domainId` naming no row, which is
 *   the domain having gone between the lookup and the write. See
 *   this module's header for why that is the same 404 the lookup
 *   itself raises.
 * @throws The original error, unchanged, when it is not a
 *   `StoreRefusal` or carries a reason this translation does not
 *   name. A `check-violation` is the one worth calling out: the
 *   boundary holds `kind` to the tuple the CHECK is generated from,
 *   so meeting one here means the two have drifted apart, and 500
 *   is the honest status for a fault no caller can act on.
 *
 * @remarks
 * NO `unique-violation` BRANCH, AND THAT IS THIS TABLE RATHER THAN
 * AN OMISSION. `sources` carries no unique key, so no write below
 * can raise one and a branch for it would be unreachable code
 * describing a constraint that does not exist.
 *
 * The delete has a translation of its own rather than sharing this
 * one, because the foreign-key refusal it meets means the opposite
 * of the one here: on a create it is a domain that went, and on a
 * delete it is a dependent that stayed.
 */
function refuseWrite(err: unknown): never {
  if (!(err instanceof StoreRefusal)) {
    throw err;
  }

  if (err.reason === 'foreign-key-violation') {
    throw new NotFoundError(NO_SUCH_DOMAIN, undefined, { cause: err });
  }

  throw err;
}

/**
 * Whether a source has accumulated anything at all.
 *
 * @param counts - What the store counted.
 * @returns Whether any member is above zero.
 *
 * @remarks
 * Read over the VALUES rather than member by member, so a third
 * counted table added to `SourceDependentCounts` is guarded the day
 * it is answered rather than the day somebody remembers to add a
 * clause. The spread is what lets a readonly record be walked.
 *
 * `holdsDependents` in `src/domains/service.ts` is the same shape
 * over a different record, and the two are separate for the reason
 * every duplicated helper here is: the two records are equal by
 * intent rather than by derivation.
 */
function holdsDependents(counts: SourceDependentCounts): boolean {
  return Object.values({ ...counts }).some((count) => count > 0);
}

/**
 * Resolves the `:slug` a sources collection path opens with.
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
 * another's refusals, and each is free to diverge the moment it has
 * something of its own to say.
 */
async function requireDomain(
  store: SourceServiceStore,
  slug: string,
): Promise<DomainRecord> {
  const row = await store.findDomainBySlug(slug);

  if (row === null) {
    throw new NotFoundError(NO_SUCH_DOMAIN);
  }

  return row;
}

/**
 * Reads one window of a domain's sources, each with its
 * parse-status aggregate.
 *
 * @param store - Where the domain and its sources are read.
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
 * difference between a domain with no sources and a domain that is
 * not there. `SourceStore.listSourcesWithParseStats` answers an
 * empty list for an id no row carries and `countSources` answers
 * `0`, both correctly — nothing points at a row that is not there —
 * so a caller issuing the two reads alone could not tell the two
 * states apart, and a mistyped slug would read as a domain whose
 * feeds somebody had removed.
 *
 * The two reads are issued together rather than in sequence, for
 * the reason `listDomains` gives: a page's rows and the
 * collection's size are independent questions, and awaiting them
 * one after the other would make every list request pay two round
 * trips to answer one body.
 *
 * THE AGGREGATE IS THE STORE'S TO COUNT AND NOT THIS MODULE'S TO
 * ASSEMBLE. One `GROUP BY (source_id, parse_status)` over the whole
 * page is what the port asks for, and every member of
 * `DOCUMENT_PARSE_STATUSES` comes back present — a source that has
 * captured nothing answers a counted zero under each rather than an
 * empty record. Nothing here fills a gap in, because a gap filled
 * at this layer would be filled only on this path and not on the
 * live one.
 *
 * A window past the end of the collection is an empty page rather
 * than a 404. The collection exists and only the window over it is
 * empty, which a caller can see from `meta` once the router has
 * built one.
 */
export async function listSources(
  store: SourceServiceStore,
  slug: string,
  window: StoreWindow,
): Promise<SourcePage> {
  const domain = await requireDomain(store, slug);
  const [rows, total] = await Promise.all([
    store.listSourcesWithParseStats(domain.id, window),
    store.countSources(domain.id),
  ]);

  return { rows, total };
}

/**
 * Adds one source to a domain, NEVER FETCHED.
 *
 * @param store - Where the domain is read and the source written.
 * @param slug - The domain's natural key.
 * @param body - The unvalidated request body, or the arguments an
 *   MCP tool was called with.
 * @returns The stored row, read back rather than reconstructed, so
 *   the id is the database's own and the five pipeline-owned
 *   columns are the ones the write actually landed.
 * @throws ValidationError - When the body does not satisfy
 *   {@link createSourceSchema}, with one detail per fault.
 * @throws NotFoundError - When no domain carries the slug, and when
 *   the domain went away between the lookup and the write.
 *
 * @remarks
 * IT CANNOT BE A 409, and that is the whole of what a reader coming
 * from the topics or personas group will expect here and not find.
 * The table has no unique key for a second row to collide with; see
 * this module's header for what that costs.
 *
 * THE THREE OMISSIONS BECOME VALUES HERE rather than in the schema
 * or at the column. Both jsonb members become `{}` and `enabled`
 * becomes true, which is what `InsertSourceInput` requiring all
 * three asks for: a default is a decision about what an absence
 * means, and leaving one to the column would make the drizzle
 * implementation quietly right and the in-memory one quietly wrong,
 * since only one of the two has a column to default from.
 *
 * A SOURCE IS CREATED NEVER FETCHED AND NOTHING HERE CAN CHANGE
 * THAT. `InsertSourceInput` carries no cursor, no failure counter,
 * neither stamp and no flag, so the row lands unfetched and
 * unflagged whatever was submitted. The containment is the type's
 * rather than a check this function could forget.
 *
 * THE ADDRESS IS NOT PROBED. This writes a row and answers it, with
 * no request to the endpoint it names, so a config that turns out
 * to be wrong is discovered by the next pipeline pass rather than
 * by the call that wrote it. That is the ordinary price of
 * configuration being a row, and it is what keeps this operation
 * answerable with no network at all.
 *
 * THE BODY IS PARSED BEFORE THE SLUG IS RESOLVED, so a malformed
 * body is a 422 whether or not the domain exists. The shape of a
 * body is a fact about the request alone, and answering the same
 * body a 422 or a 404 depending on what happens to be stored would
 * make a caller's error depend on rows it never asked about. It
 * also costs that refusal no read at all.
 *
 * The insert is `return await` inside the `try` rather than a bare
 * `return`: returning the promise unawaited would settle it outside
 * this block, the `catch` would never run, and every lost race in
 * the deployment would answer 500 with the file still reading as if
 * it handled one.
 */
export async function createSource(
  store: SourceServiceStore,
  slug: string,
  body: unknown,
): Promise<SourceRecord> {
  const input = parseBody(createSourceSchema, body, {
    openPaths: CONFIG_OPEN_PATHS,
  });
  const domain = await requireDomain(store, slug);

  try {
    return await store.insertSource({
      domainId: domain.id,
      kind: input.kind,
      endpoint: input.endpoint,
      parserConfig: input.parserConfig ?? {},
      contract: input.contract ?? {},
      enabled: input.enabled ?? true,
    });
  } catch (err) {
    return refuseWrite(err);
  }
}

/**
 * Rewrites the supplied members of one source.
 *
 * @param store - Where the row is written.
 * @param id - The source's id, as `resourceIdParamSchema` in
 *   `src/http/schemas.ts` parsed it.
 * @param body - The unvalidated patch.
 * @returns The stored row afterwards.
 * @throws ValidationError - When the body does not satisfy
 *   {@link patchSourceSchema}, with one detail per fault.
 * @throws NotFoundError - When no source carries the id.
 *
 * @remarks
 * THE PARSED PATCH IS HANDED STRAIGHT TO THE PORT, with no
 * defaulting step between the two. Every member here distinguishes
 * two requests rather than three, so there is no absent-versus-null
 * pair for a `??` to collapse — but the same discipline applies for
 * a different reason: a default supplied here would rewrite a
 * column the caller left alone, and on the two jsonb members that
 * would clear an arrangement nobody asked about.
 *
 * NO DOMAIN IS RESOLVED AND NONE IS NAMED. `PATCH /sources/:id`
 * addresses the row directly, and no rule on this table spans a
 * domain, which `SourcePatch` refusing to carry `domainId` is what
 * keeps true.
 *
 * There is no read before the write. `SourceStore.updateSource`
 * answers `null` for an id no row carries, so a preceding
 * `findSourceById` would buy a second round trip and a second
 * chance for the row to go in between; the 404 below is the same
 * fact either way. That is also why `findSourceById` is not among
 * the methods {@link SourceServiceStore} picks.
 *
 * A patch carrying no member at all is legal and answers the stored
 * row, which is the port's rule rather than this module's:
 * `sources` has no `updated_at`, so an empty patch has literally
 * nothing to set.
 *
 * RETIRING A FEED IS THIS OPERATION. `enabled: false` keeps the
 * endpoint, the arrangement and the corpus and stops the pipeline
 * reading, and it is what {@link deleteSource} names when it
 * refuses. The edit is visible to the next pipeline pass and to no
 * pass already in flight: nothing between this port and the query a
 * pass issues at its own start keeps a copy, so there is no cache
 * to expire.
 */
export async function patchSource(
  store: SourceServiceStore,
  id: number,
  body: unknown,
): Promise<SourceRecord> {
  const patch = parseBody(patchSourceSchema, body, {
    openPaths: CONFIG_OPEN_PATHS,
  });
  let updated: SourceRecord | null;

  try {
    updated = await store.updateSource(id, patch);
  } catch (err) {
    return refuseWrite(err);
  }

  if (updated === null) {
    throw new NotFoundError(NO_SUCH_SOURCE);
  }

  return updated;
}

/**
 * Deletes one source, refusing absolutely while the corpus it
 * produced still cites it.
 *
 * @param store - Where the counts are read and the row removed.
 * @param id - The source's id.
 * @returns Nothing. The router answers 204, because a deleted
 *   resource has no representation to carry.
 * @throws NotFoundError - When no source carries the id.
 * @throws ConflictError - When documents or sightings still cite
 *   the source, with `details` carrying both counts; and when the
 *   write is refused by something the guard did not count, with no
 *   `details` at all.
 *
 * @remarks
 * THERE IS NO CONFIRMATION THAT GETS PAST THIS GUARD, which is the
 * difference from `DELETE /domains/:slug` and is a decision about
 * what each act takes. A domain cascade takes the domain's own
 * configuration, which an operator can be shown and can authorise.
 * This would take a corpus and the syndication evidence citing it,
 * and `src/db/schema/findings.ts` argues at the column that the
 * sightings table IS the provenance record: a cascade would drop
 * that evidence a feed at a time, and every count taken afterwards
 * would be lower with nothing saying why. So the refusal names the
 * operation that was wanted instead.
 *
 * THE GUARD PREVENTS NOTHING AT THE DATABASE, and it is not there
 * to. All three foreign keys onto `sources.id` emit `ON DELETE no
 * action`, so the statement below is refused whatever this function
 * decided. What the guard buys is a refusal a caller can read: the
 * counts say what is holding the row, where the bare foreign-key
 * error says only that something is.
 *
 * The counts are read on every delete rather than on a guarded path
 * alone, which is where this differs from `deleteDomain` — there is
 * no confirmed path here for a caller to skip the question on.
 *
 * BOTH ZERO IS NOT A PROMISE THE DELETE WILL LAND, and the second
 * refusal below is what that costs. `source_config_proposals` is
 * not counted and a capture can write a document between the count
 * and the write, so the store's own foreign-key refusal is
 * translated as a 409 carrying no counts — a different sentence,
 * because the first one names two tables this one is reached with
 * at zero.
 *
 * AN UNKNOWN ID FALLS THROUGH THE GUARD RATHER THAN BEING LOOKED UP
 * FIRST. `countSourceDependents` answers two zeros for an id no
 * source carries, because nothing points at a row that is not
 * there, so the guard passes and the store answers `false` — the
 * same 404 a lookup would have raised, one round trip earlier.
 */
export async function deleteSource(
  store: SourceServiceStore,
  id: number,
): Promise<void> {
  const dependents = await store.countSourceDependents(id);

  if (holdsDependents(dependents)) {
    throw new ConflictError(SOURCE_HOLDS_ROWS, dependents);
  }

  let removed: boolean;

  try {
    removed = await store.deleteSource(id);
  } catch (err) {
    if (
      err instanceof StoreRefusal
      && err.reason === 'foreign-key-violation'
    ) {
      throw new ConflictError(SOURCE_STILL_REFERENCED, undefined, {
        cause: err,
      });
    }

    throw err;
  }

  if (!removed) {
    throw new NotFoundError(NO_SUCH_SOURCE);
  }
}
