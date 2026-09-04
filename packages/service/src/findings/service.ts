/**
 * @packageDocumentation
 * The findings surface's two reads: one window of a domain's
 * findings, and one finding with everything hanging off it.
 *
 * TWO FUNCTIONS AND NO WRITE, which is the read-first law of
 * `docs/architecture/08-http-api.md` arriving here as a shape
 * rather than as an observance. The ruling that appends a
 * `finding_labels` row is `./verdict-service.ts`, a sibling of this
 * module rather than a member of it, and {@link FindingsServiceStore}
 * below names six of `FindingStore`'s seven methods — the seventh,
 * the one writer, is not reachable from anything in this file. A
 * handler cannot re-score a finding here by mistake or by a later
 * edit, because there is nothing on the narrowed port to call.
 *
 * THE DOMAIN IS RESOLVED BEFORE ANY FINDING IS READ, and that read
 * is the entire difference between a domain that has found nothing
 * and a domain that is not there. `FindingStore` answers an empty
 * list and a count of `0` for an id no domain carries, both
 * correctly — nothing points at a row that is not there — so the
 * two finding reads alone could not tell the two states apart, and
 * a mistyped slug would read as a domain whose scoring pass had not
 * run yet. The lookup is awaited on its own rather than folded into
 * the pair below, which is the one place this module deliberately
 * pays a round trip: a 404 that had already issued two reads over
 * `findings` would be scanning the corpus to answer about a domain
 * that does not exist.
 *
 * THE SINGLE GET IS ADDRESSED BY ID AND TAKES NO DOMAIN, which is
 * the addressing rule the whole surface keeps and which
 * `src/findings/store.ts` states at the port. A caller learns which
 * domain a finding belongs to from the row it is answered, and
 * `./verdict-service.ts` reads the vocabulary off that same member
 * rather than off a segment a caller supplied.
 *
 * THE THREE EMBEDDED READS ARE ISSUED TOGETHER AND BELOW THE
 * LOOKUP, on the same reasoning: they are independent questions, so
 * awaiting them one after another would make every single get pay
 * three round trips to answer one body, and issuing them before the
 * lookup would make a 404 cost three reads. They are UNBOUNDED, on
 * the terms the port declares: these rows are embedded in one
 * finding's answer rather than paged on their own, so there is no
 * `?page` for a caller to send, and where a cap is eventually
 * wanted it belongs here with a count beside it rather than as a
 * silent limit inside an implementation.
 *
 * NOTHING HERE MASKS OR CUTS, and the absence is deliberate rather
 * than forgotten. `docs/architecture/08-http-api.md` names two
 * surfaces that answer stored untrusted text — the failures queue
 * and the documents list — and both answer a captured BODY. A
 * finding's `fields` payload is what a scoring pass made of one,
 * and `ar-digest`'s own reduction is applied where a digest is
 * assembled rather than here. Widening the masking to this surface
 * is a change to that document first and to this module second.
 *
 * THE FILTER, THE SORT AND THE WINDOW ARRIVE ALREADY DERIVED, on the
 * terms every list on this surface keeps. `?verdict`, `?category`,
 * `?since`, `?until`, `?sort`, `?page` and `?perPage` are how a
 * caller ASKED, and {@link findingListQuerySchema} is the whole of
 * what this module says about it. A tool spells those same seven
 * as members of one arguments object rather than as a query
 * string, which is why the schema is EXPORTED and why
 * `src/findings/routes.ts` composes the tool input out of it: the
 * spelling is the only part that belongs to HTTP. `toTimeWindow` and
 * `toStoreWindow` in `src/http/schemas.ts` own the two translations,
 * so nothing here re-checks a bound: the schema is what refuses an
 * inverted window and a `perPage` above the cap, and a second check
 * here would be a second rule nobody would notice drifting from the
 * first.
 *
 * NEITHER REFUSAL QUOTES ANYTHING. The two sentences below are
 * constants of this module's own, neither function builds any
 * `details` at all, and no value a caller submitted is composed
 * into either. `./service.test.ts` counts occurrences of a planted
 * sentinel in each serialised refusal rather than asserting
 * absence, with the same count taken over a planted envelope, so a
 * search that would find nothing anywhere cannot report a clean
 * refusal.
 *
 * THE STORE IS A PARAMETER, so every rule here is exercisable with
 * no database: `tests/helpers/memory-research-store.ts` plants the
 * `findings` rows behind all six reads, no port writing one.
 */
import type {
  FindingFilter,
  FindingLabelRecord,
  FindingRecord,
  FindingResearchRecord,
  FindingSightingRecord,
  FindingSort,
  FindingStore,
} from './store.js';
import type { DomainRecord, DomainStore } from '../domains/store.js';
import type { StoreWindow } from '../http/schemas.js';

import { z } from 'zod';

import { NotFoundError } from '../../lib/errors/index.js';
import {
  paginationQuerySchema,
  sortQuerySchema,
  timeWindowQuerySchema,
} from '../http/schemas.js';

/**
 * Exactly the port methods {@link listFindings} and
 * {@link getFinding} reach, across both ports they reach them on.
 *
 * A `Pick` OF TWO PORTS RATHER THAN EITHER ONE WHOLE, for the
 * reason `SourceServiceStore` in `src/sources/service.ts` gives.
 * Resolving a slug is one method of `DomainStore`, and asking for
 * that port whole would have this module claim to need the domain
 * writes it never issues.
 *
 * `insertFindingLabel` IS THE ONE `FindingStore` METHOD ABSENT, and
 * the absence is this module's read-only claim written as a type
 * rather than kept as a habit. That method belongs to
 * `./verdict-service.ts`, so the ruling and the reads are
 * separately declared and the two files cannot reach each other's
 * half by accident. There is nothing else on that port to leave
 * out: the other six are the whole of what the findings surface
 * reads.
 *
 * Built with `Pick` rather than by listing signatures, so a method
 * here cannot drift from the thing it names: a hand-copied
 * signature would go on type-checking against a port that had moved
 * under it.
 */
export type FindingsServiceStore =
  Pick<DomainStore, 'findDomainBySlug'>
  & Pick<
    FindingStore,
    | 'countFindings'
    | 'findFindingById'
    | 'listFindingLabels'
    | 'listFindingResearch'
    | 'listFindingSightings'
    | 'listFindings'
  >;

/**
 * The orderings `GET /domains/:slug/findings` offers, most-default
 * first.
 *
 * THE TUPLE IS THE VALUE AND `FindingSort` IS THE TYPE, which is
 * the split every port in this package keeps: `./store.ts` exports
 * types alone, so a tuple naming its members could not live beside
 * the union that names them. `satisfies` is what holds the two
 * together — a key here that the port does not name is a
 * `check-types` error at this declaration rather than a `?sort`
 * accepted on the wire and refused nowhere.
 *
 * THE FIRST MEMBER IS THE DEFAULT, and it is stated once. That is
 * `sortQuerySchema`'s rule rather than this module's: an absent
 * `?sort` takes `keys[0]`, so the default ordering is spelled by
 * the tuple's ORDER and there is no second declaration of it to
 * come to disagree.
 *
 * `score` FIRST BECAUSE A DIGEST'S ORDER IS THE ORDER A READER
 * EXPECTS. It is three keys deep — score descending with an absent
 * score sorted LAST rather than lowest, then `created_at`
 * descending, then `id` descending — and the whole of it lives
 * behind that one word, which `compareFindings` in
 * `src/lib/digest-assemble.ts` already settled for the digest
 * selection and every renderer.
 */
export const FINDING_SORT_KEYS = [
  'score',
  'recency',
] as const satisfies readonly FindingSort[];

/**
 * The whole query `GET /domains/:slug/findings` reads: a window
 * over time, a page over what the window selected, an ordering, and
 * two narrowings.
 *
 * COMPOSED FROM THE THREE SHARED DECLARATIONS RATHER THAN
 * RESPELT, so the default page, the 200 cap, the ISO-8601 stamp
 * format, the half-open bounds and the sort vocabulary are all
 * inherited and none of them is stated twice.
 *
 * THE COMPOSITION HAS A DIRECTION AND IT IS NOT THE ONE THAT READS
 * NATURALLY. `since` before `until` is a check on the window
 * OBJECT, and measured against the zod in this tree, `.extend()`
 * carries such a check OUTWARDS and never inwards: extending FROM
 * `timeWindowQuerySchema` keeps the check and extending INTO it
 * drops it, silently, while both spellings type-check and answer
 * every other request identically. So this chain opens with the
 * window schema, and `./service.test.ts` sends an inverted window
 * through THIS schema rather than through the window schema alone
 * — a case driving the base would stay green through the reversal.
 * `docs/architecture/08-http-api.md` carries the measurement.
 *
 * STRICT, which it inherits rather than re-declares: all three
 * sources are `.strict()`, and `.extend()` keeps the catchall. An
 * undeclared parameter is therefore a `422` naming `query` rather
 * than a narrowing quietly dropped, which is the difference
 * between a caller being told its filter was ignored and a caller
 * reading an unnarrowed page as the answer to it.
 *
 * NEITHER NARROWING CARRIES A LENGTH RULE, and that is the port's
 * decision rather than an omission here. `FindingFilter` states
 * that a verdict no label carries and a category key the domain
 * never declared are each an empty page rather than an error, so a
 * `.min(1)` at this boundary would refuse one particular unmatched
 * value while accepting every other — a second authority on a
 * question `./store.ts` has already answered once.
 *
 * The two are `string` rather than unions for the same reason.
 * A domain's verdict vocabulary is a per-domain setting read at the
 * moment of a RULING, and a domain that has since retired a verdict
 * still holds rows stored under it; a category key is whatever an
 * operator declared. Neither is a closed set this schema could
 * name.
 */
export const findingListQuerySchema = timeWindowQuerySchema
  .extend(paginationQuerySchema.shape)
  .extend(sortQuerySchema(FINDING_SORT_KEYS).shape)
  .extend({
    category: z.string().optional(),
    verdict: z.string().optional(),
  });

/**
 * A parsed findings query: the page and the sort always present
 * because both carry a default, the other four present only when
 * they were sent.
 */
export type FindingListQuery = z.infer<typeof findingListQuerySchema>;

/**
 * What a caller is told when no domain carries the slug it named.
 *
 * The slug is not in it, per this module's header, and it is the
 * same sentence the wave-1 and wave-2 services answer for their own
 * `:slug` — spelled again rather than imported, because the several
 * are equal by intent rather than by derivation and any of them is
 * free to change without dragging the others with it.
 */
const NO_SUCH_DOMAIN = 'No domain carries that slug';

/**
 * What a caller is told when no finding carries the id it named.
 *
 * Equal by intent to the sentence `./verdict-service.ts` answers
 * for the same `:id`, and spelled again on the same terms.
 */
const NO_SUCH_FINDING = 'No finding carries that id';

/**
 * One page of a domain's findings, beside the size of the
 * collection it was read from.
 *
 * Two members rather than a rendered envelope, for the reason every
 * page on this surface gives: building `meta` is the router's half,
 * and this module was never told what the window was in
 * `page`/`perPage` terms.
 */
export interface FindingPage {
  /**
   * The rows the window selected, in the order the sort key names.
   *
   * The order is the store's, per `FindingStore.listFindings`, and
   * nothing here re-sorts: a service sorting a page it was handed
   * would be answering a different order from the one the window
   * was taken under, which is how two pages come to disagree about
   * which row they hold.
   *
   * `FindingRecord` passed through rather than projected. Nothing
   * on this row is a secret, nothing is cut and nothing is masked —
   * the module header says why — so a shape of this module's own
   * would be a second authority for the table's own columns.
   */
  readonly rows: readonly FindingRecord[];

  /**
   * How many findings the same domain and the same FILTER select,
   * ignoring the window.
   *
   * The same filter the page was read through, which is what keeps
   * `meta.total` describing the page's own collection: a total
   * counted without the verdict narrowing would tell a caller
   * filtering by one verdict how many findings the domain has
   * altogether.
   */
  readonly total: number;
}

/**
 * One finding and everything the surface hangs off it.
 *
 * FOUR MEMBERS RATHER THAN A FLATTENED ROW, because the three
 * lists are about different tables and a reader has to be able to
 * tell an empty one from a finding that has none. A finding nobody
 * has judged, a finding no feed has cited again and a finding
 * attributed to nobody each answer an empty list here, and each is
 * an ordinary state rather than a failure to read.
 */
export interface FindingDetail {
  /** The row itself, as `FindingStore.findFindingById` read it. */
  readonly finding: FindingRecord;

  /**
   * Where it has been seen, newest first. Empty for a finding no
   * feed has cited — which is every finding today, nothing having
   * written one of these rows yet.
   */
  readonly sightings: readonly FindingSightingRecord[];

  /**
   * Its rulings, NEWEST FIRST, and the whole sequence rather than
   * the head of it.
   *
   * THE FIRST ROW IS THE VERDICT IN FORCE. `finding_labels` carries
   * no unique key at all, so re-judging APPENDS and the sequence is
   * the record of an operator changing their mind; the ruling a
   * later one replaced is still a true statement about the moment
   * it was made. The ordering is the store's, and
   * `FindingStore.listFindingLabels` carries why its tiebreak is
   * not optional.
   */
  readonly labels: readonly FindingLabelRecord[];

  /**
   * What research has recorded about the entity this finding names,
   * newest first.
   *
   * RESOLVED THROUGH THE FINDING'S OWN `entityId` BY THE PORT, so
   * nothing here reads that member, branches on its nullability or
   * addresses a second surface. An unattributed finding answers an
   * empty list.
   *
   * READ AND NEVER WRITTEN. No method on the narrowed port touches
   * `entity_research` — those rows are `ar-research`'s to write —
   * so the embedding is read-only structurally rather than by
   * convention.
   */
  readonly research: readonly FindingResearchRecord[];
}

/**
 * Resolves the `:slug` the findings collection path opens with.
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
  store: FindingsServiceStore,
  slug: string,
): Promise<DomainRecord> {
  const row = await store.findDomainBySlug(slug);

  if (row === null) {
    throw new NotFoundError(NO_SUCH_DOMAIN);
  }

  return row;
}

/**
 * Reads one window of a domain's findings, narrowed and ordered as
 * the caller asked.
 *
 * @param store - Where the domain and its findings are read.
 * @param slug - The domain's natural key.
 * @param filter - What to narrow to, as the router rebuilt it from
 *   the parsed query. Its `window` member is required and carries
 *   `null` for an unbounded bound, which `toTimeWindow` in
 *   `src/http/schemas.ts` already answers.
 * @param sort - Which ordering to answer in. Separate from the
 *   filter because `FindingStore.countFindings` takes no ordering:
 *   an ordering cannot change how many rows a predicate selects.
 * @param window - The `limit`/`offset` window, as `toStoreWindow`
 *   derived it from `?page` and `?perPage`. Already validated, so
 *   nothing here re-checks its bounds.
 * @returns The rows and the size of the whole narrowed collection.
 * @throws NotFoundError - When no domain carries the slug. The only
 *   refusal this function has: a domain that has found nothing, a
 *   verdict no label carries, a category key the domain never
 *   declared, a span in which nothing was made and a window past
 *   the end are each an empty page.
 *
 * @remarks
 * THE LOOKUP IS AWAITED BEFORE THE TWO READS ARE ISSUED, which is
 * the ordering the module header argues and the one thing a reader
 * might otherwise fold into the `Promise.all` below. A 404 must
 * cost `findings` no read at all.
 *
 * The two reads that DO run are issued together, for the reason
 * every list on this surface gives: a page's rows and its
 * collection's size are independent questions, and awaiting them in
 * sequence would make every request pay two round trips to answer
 * one body. Both are handed the SAME filter, which is what keeps a
 * page's `meta.total` from describing a different collection than
 * the page.
 *
 * A WINDOW PAST THE END IS AN EMPTY PAGE RATHER THAN A 404. The
 * collection exists and only the window over it is empty, which a
 * caller can see from `meta` once the router has built one.
 */
export async function listFindings(
  store: FindingsServiceStore,
  slug: string,
  filter: FindingFilter,
  sort: FindingSort,
  window: StoreWindow,
): Promise<FindingPage> {
  const domain = await requireDomain(store, slug);
  const [rows, total] = await Promise.all([
    store.listFindings(domain.id, filter, sort, window),
    store.countFindings(domain.id, filter),
  ]);

  return { rows, total };
}

/**
 * Reads one finding and the three collections hanging off it.
 *
 * @param store - Where the finding and its three lists are read.
 * @param id - The id as `resourceIdParamSchema` in
 *   `src/http/schemas.ts` parsed it.
 * @returns The row and its sightings, its rulings newest first and
 *   its entity's research.
 * @throws NotFoundError - When no finding carries the id. The only
 *   refusal this function has: a finding nobody has judged, one no
 *   feed has cited and one attributed to nobody are each an empty
 *   list beside a `200`.
 *
 * @remarks
 * THE LOOKUP IS AWAITED BEFORE THE THREE READS ARE ISSUED, on the
 * reasoning {@link listFindings} gives for its own pair. All three
 * embedded reads answer an empty list for an id no finding carries,
 * correctly, so a function issuing them first would answer a
 * mistyped id with three scans and then a 404.
 *
 * THE THREE THAT DO RUN ARE ISSUED TOGETHER, so one body costs one
 * round trip rather than three. They are independent: no member of
 * one is read to address another, `listFindingResearch` resolving
 * the entity through the finding inside the port.
 *
 * THE ROW IS ANSWERED AS THE LOOKUP READ IT and is not read twice.
 * `findFindingById` is what turns a missing id into the null this
 * refusal is decided from, and the same row is what travels — a
 * second read to answer with would be a second chance for the row
 * to move between them.
 */
export async function getFinding(
  store: FindingsServiceStore,
  id: number,
): Promise<FindingDetail> {
  const finding = await store.findFindingById(id);

  if (finding === null) {
    throw new NotFoundError(NO_SUCH_FINDING);
  }

  const [sightings, labels, research] = await Promise.all([
    store.listFindingSightings(id),
    store.listFindingLabels(id),
    store.listFindingResearch(id),
  ]);

  return { finding, sightings, labels, research };
}
