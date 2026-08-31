/**
 * `src/sources/service.ts` — what the four source operations
 * refuse, and what they let through. Driven over
 * `tests/helpers/memory-research-store.ts`, so every claim here is
 * answered with no database anywhere.
 *
 * ELEVEN CLAIMS IN TWO HALVES. The first seven are the ways this
 * module says no — and the one way it does not, a create here
 * being unable to be a 409 — each carrying the narrow CONTROL its
 * refusal needs, varied along the one axis the refusal turns on,
 * because a module refusing everything passes every assertion a
 * refusal case makes on its own. The last four are the reads and
 * writes that go through, and they carry the same discipline the
 * other way round: each write is compared as a WHOLE record
 * against the row as it was, because an operation reaching a
 * member nobody submitted answers a perfectly plausible source
 * that no field-by-field read would report.
 *
 * THAT AN ADDRESS NAMING NOTHING IS A 404 ON ALL FOUR OPERATIONS,
 * and that the two addresses are told apart. A `:slug` naming no
 * domain and an `:id` naming no source are fixed in different
 * places, so a module answering one sentence to both would send an
 * operator to the wrong one — a distinction pinned without pinning
 * either wording, since the sentences are free to be reworded and
 * the difference is not.
 *
 * THERE IS NO 409 ON A CREATE HERE, AND ITS ABSENCE IS A CLAIM
 * RATHER THAN A GAP. `sources` carries no unique key at all, so two
 * rows may name one endpoint, and the section below plants exactly
 * that: a second create over the fixture's own endpoint, under the
 * same domain and the same kind, has to LAND. Every other resource
 * group on this surface refuses that call, so a service that copied
 * a sibling translation would pass every refusal in this file and
 * fail that one case.
 *
 * THAT A BODY IS PARSED HERE, not above. Every row of the body
 * table is submitted to a SERVICE function rather than to a schema,
 * which is what says an MCP tool in wave 3 cannot be handed a
 * payload the HTTP route would have refused. Both operations that
 * take a body have rows of their own, since a row driven through
 * only one of them pins nothing about the other, and both orderings
 * are pinned: a malformed body outranks a slug that names nothing
 * AND an id that names nothing.
 *
 * Four of those rows are the ones this file exists for, and each
 * has the control that makes it readable. A `kind` outside
 * `SOURCE_KINDS` is refused, and EVERY member of that tuple is
 * accepted in one case — the widening control, since a schema
 * spelling three of the four literals by hand refuses the fourth
 * and is green against every refusal row. An empty `endpoint` is
 * refused and an endpoint of ONE character accepted, a single step
 * from the boundary, so a schema that had stopped checking the
 * address at all fails the first and one refusing every address
 * fails the second. A `parserConfig` that is not an object is
 * refused NAMING THE MEMBER rather than a key inside it, which is
 * the openness of the record read from the refusal side. And the
 * five pipeline-owned columns are refused from both operations as
 * unrecognized keys, which is `.strict()` doing its ordinary work
 * rather than a per-column check — the reason the refusal holds for
 * a column nobody has added yet.
 *
 * THAT THE TWO JSONB MEMBERS ARE OPEN BY KEY. A create and a patch
 * each submit an arrangement whose keys carry spaces, dots and a
 * nested list, and both are stored and read back whole. That is the
 * one reading which says `parserConfig` and `contract` are records
 * this service takes no view of rather than objects it happens not
 * to have narrowed yet, and it is what the `openPaths` declaration
 * beside them is for: no fault is reachable strictly below either
 * prefix while the value schema is `unknown`, so the acceptance is
 * the whole of the evidence available today.
 *
 * THAT A DELETE IS REFUSED ABSOLUTELY WHILE ANYTHING THE GUARD
 * COUNTS STILL CITES THE SOURCE, and that the refusal carries both
 * counts. Each dependent table is planted alone as well as beside
 * the other, so a guard reading one of the two is a named row
 * rather than a count that still adds up, and every refusal carries
 * the counted ZERO of the table it did not plant — a counted zero
 * and a table nobody counted being different facts to an operator
 * reading what a delete would have taken. Three readings sit beside
 * the table. A source nothing cites is deleted, which is the
 * control the rows cannot supply. The operation stops BEFORE the
 * destructive call, which no reading of the stored rows can answer,
 * since a module that deleted the row and then threw would leave
 * the same dataset. And a refusal the guard did not predict — the
 * third foreign key, which nothing here counts — answers a
 * DIFFERENT sentence with no counts at all, because the counted one
 * names two tables that refusal is reached with at zero.
 *
 * THAT THE ONE REASON THIS PORT DECLARES ON A WRITE IS TOLD FROM
 * THE ONES IT DOES NOT. `createSource` resolves the domain and only
 * then writes, so a foreign-key refusal means the row went between
 * the two — a state the ordinary fixture cannot produce and which
 * is therefore RECONSTRUCTED rather than stubbed: the domain is
 * really deleted, the lookup really answers the row it had, and
 * what the write meets is the store's own refusal. Beside it sit
 * the two rethrow cases. A `check-violation` is the one worth
 * having, and it is the opposite of what the sibling services
 * record: `sources_kind_check` is a rule this port genuinely
 * declares, and it is rethrown all the same, because the boundary
 * holds `kind` to the tuple the CHECK is generated from and meeting
 * one anyway means the two have drifted apart.
 *
 * THAT NOTHING SUBMITTED COMES BACK. The containment block counts
 * occurrences of a sentinel in the serialised refusal rather than
 * asserting absence, and takes the same count over a planted
 * envelope — a search that would find nothing anywhere reports a
 * clean refusal and a leaking one alike. One of its needles is a
 * KEY inside an open record rather than a value, which is the
 * channel this resource group has and the wave-1 topics group does
 * not: an operator-chosen key is submitted content in exactly the
 * sense a value is, and zod puts it in `issue.path` verbatim.
 *
 * THAT A LIST IS SCOPED TO ITS DOMAIN, ORDERED BY ID, AND ANSWERS
 * MORE THAN THE TABLE. The scoping is compared as WHOLE records
 * against the rows the fixture planted, so a page assembled out of
 * the right addresses and the wrong rows is a failure rather than
 * a pass. The order is read over a third source addressed AHEAD of
 * both planted ones, since the fixture's own two come back in
 * insertion order under either rule and could not report it. And
 * the total is read through a window of one, which the refusal
 * half could not do at all: its one window was wider than every
 * collection, so a total taken off the rows in hand would have
 * been right there.
 *
 * The aggregate is the member this read adds, and it is three
 * claims rather than one. Its KEYS come from
 * `DOCUMENT_PARSE_STATUSES` on every row of a page, which is what
 * separates a record from the groups a `GROUP BY` answers. Its
 * COUNTS are read over a source holding two `ok` rows and one
 * `failed`, so the two members carry different numbers and a
 * record built with the statuses swapped counts correctly under
 * any fixture that gives them the same total. And a source holding
 * NOTHING answers a counted zero under each member, read member by
 * member off the tuple with the sibling that did capture read in
 * the same case — a status with no rows contributes no group at
 * all, so an implementation handing the groups back leaves `0` and
 * never-counted the same value.
 *
 * The five health columns are read as a whole record per row, with
 * `enabled` moved on one of the two rows first, so a read filling
 * them with constants answers both rows alike and fails. Which
 * columns those are is a roster held to `SourceRecord` by
 * `satisfies`, and the key sets of all three answered types are
 * held in BOTH directions — `satisfies` against a member the type
 * lacks, and a conditional pin against the type growing one
 * nothing here names. The second direction is the one this table
 * needs: five of its twelve columns belong to the pipeline and no
 * request may name one, so this projection is the whole of how
 * they reach a caller.
 *
 * THAT A CREATE LANDS ENABLED, UNFLAGGED AND NEVER FETCHED. The
 * whole row is compared rather than the three members the case is
 * named for, because those five pipeline-owned columns are decided
 * HERE and nowhere else: no body may name one, so a create is the
 * only thing that ever sets them. `enabled` is read as a DEFAULT
 * rather than a constant by the case beside it, which stages a
 * source switched off and reads `flagged` and `cursor` there too.
 * The two jsonb omissions become `{}` rather than absences, with a
 * body supplying both as the control that says a default is a
 * default. And the stored row is read back through the LIST, where
 * it arrives carrying counted zeros rather than no counts at all.
 * The `:slug` reaching the WRITE is its own case, and this is the
 * one resource group where nothing refuses a misfiled row — there
 * is no unique key for it to collide with — so the two collections
 * read back whole are the only reading that reports one.
 *
 * THAT A PATCH REPLACES RATHER THAN MERGES, AND RETIRES RATHER
 * THAN DELETES. The replacement is read three ways because no one
 * of them is enough: a disjoint arrangement, where a merge answers
 * two settings and a replace answers one; a SUBSET of the stored
 * one, which is the shape a caller who edited an arrangement
 * actually sends and which a merge answers identically to a
 * correct replace; and an empty object, the only way to express
 * holding no arrangement at all. That last one submits BOTH jsonb
 * members in one body, which is the only shape that can report a
 * service copying one of the two and leaving the other, since they
 * are written by the same shape of code — and a fourth case moves
 * the contract alone, so the two are separate members rather than
 * a pair. The retirement is the operation {@link deleteSource}
 * names when it refuses: `enabled: false` keeps the address, the
 * arrangement and the corpus, the row stays on the page with its
 * captures still counted, and a second patch brings it back, which
 * is what makes the member two-directional rather than one-way.
 *
 * THAT A DELETE ANSWERS NOTHING AND TAKES ONE ROW. The other side
 * of the guard above it: a source nothing cites at all, where the
 * whole of what the operation answers is `undefined` and the whole
 * of what it did is read back off the page — the sibling compared
 * as a whole record, the second domain's own feed still standing,
 * a second delete of the same id refused, and a PATCH of that id
 * refused too. That last one is what says the row went rather than
 * merely leaving its collection, and it is the reading that tells
 * this operation from the retirement above it.
 *
 * Mutation legs, run over this file with `--reporter=json` and read
 * as the failed case SET rather than as a count. The first eighteen
 * were measured against 82 cases, when the refusals were the whole
 * file; the half below them took it to 112 and added eight of its
 * own. All eighteen were RE-RUN at 112, and every one came back at
 * its recorded figure OUTSIDE the four new sections — which is what
 * says the leg re-run was the leg the prose names rather than a new
 * one reddening something else. Three of them gained reds in the
 * new half and are recorded below with the split; the other fifteen
 * moved by nothing at all.
 *
 * Seventeen of the eighteen mutate `./service.ts` and one mutates
 * `tests/helpers/memory-research-store.ts`, which is the only
 * target that can reach the no-unique-key claim at all. Among the
 * eight new legs that ratio inverts: five mutate the STORE, because
 * the replace-whole rule, the page's order, the aggregate's
 * zero-fill and the values a never-fetched row lands with are all
 * the store's, and no mutation of this module could reach any of
 * them.
 *
 * The two `.strict()` legs redden 7 apiece and their sets are
 * DISJOINT, which is what says the two schemas are separately
 * pinned rather than sharing one `parseBody` nobody would notice
 * degrading. Each is exactly its half's five pipeline-owned rows,
 * its `domainId` row, and that half's containment row.
 *
 * The two kind legs are the pair that makes the tuple
 * two-directional. Widening `kind` to `z.string()` reddens 6 — both
 * kind rows, the containment row that submits one, the create
 * ordering case, and the empty create body, whose MISSING `kind`
 * answers `invalid_value` under an enum and `invalid_type` under a
 * string. Narrowing the tuple to three of its four members reddens
 * a disjoint 3, every one of them an acceptance control, plus ONE
 * in the new half: the create that reads what an omitted
 * arrangement becomes stages a `push` source, so a tuple missing
 * that member refuses the call the case was reading.
 *
 * The three endpoint legs are nearly disjoint. Dropping `.min(1)`
 * from the create reddens only its empty-address row; dropping it
 * from the patch reddens 2, that half's row and the patch ordering
 * case, which sends the empty address to an id that is not there.
 * Raising the create's floor to two characters reddens exactly the
 * one-character control, which is what makes that row a boundary
 * rather than a number.
 *
 * The three jsonb legs read the record's SHAPE against its VALUES.
 * Widening `jsonDocumentSchema` to `z.unknown()` reddens exactly 4,
 * both members on both operations, while narrowing its VALUES to
 * `z.string()` reddens a disjoint 2 in the refusal half, both of
 * them acceptance cases, and 4 more below it — every case that
 * stores an arrangement whose values are not strings, which is what
 * the openness of the record looks like from the accepting side.
 * Dropping `openPaths` from the create parse reddens ZERO, and that
 * zero is recorded rather than repaired: while the value schema is
 * `unknown`, no issue is reachable strictly below either prefix, so
 * the declaration has nothing in this file to report and the
 * acceptance cases are the whole of the evidence for it. The leg
 * that would report it needs the narrowing the declaration exists
 * to survive.
 *
 * The delete legs nest, and what the first leaves GREEN is the
 * reading. Removing the dependent guard entirely reddens 6 — all
 * three 409 rows, the distinctness case, the stop-before-the-delete
 * reading and the counts-on-the-wire case — while all three
 * source-still-standing cases stay green, because the STORE refuses
 * the delete whatever this module decided. That is the port's own
 * claim showing up as a leg that cannot reach it. Reading only
 * `documents` in the guard reddens exactly 1, the sightings-alone
 * row, which is what planting each table alone exists for. Making
 * the guard refuse EVERY delete reddens 9 in the refusal half and
 * is the blunt leg rather than a rule: three of its reds are in the
 * address section and one is a rethrow case. It takes the whole of
 * the delete section below with it too, all 4 cases, which is the
 * same bluntness read from the other end.
 *
 * Three legs redden exactly the one case each is aimed at, which is
 * the narrowest reading here: sharing one sentence between the
 * counted and uncounted delete refusals reddens only the
 * distinctness case, resolving the slug before parsing the create
 * body reddens only that ordering case, and answering the create's
 * lost race a 409 reddens only the lost-race case.
 *
 * Making `refuseWrite` a catch-all reddens 2, both CHECK rethrow
 * cases and neither lost-race case, which is what says the rethrow
 * is a claim about the REASON rather than about the call site.
 *
 * The store leg reaches what no service mutation could. Having the
 * in-memory store refuse a duplicate `(domainId, endpoint)` as a
 * unique key reddens 3: both second-row cases, plus one acceptance
 * case that happens to create four sources over one address. A fake
 * refusing what the database does not is a second contract, and
 * this file is where it is caught.
 *
 * THE EIGHT NEW LEGS, measured against 112 cases. Seven of the
 * eight redden a set lying ENTIRELY inside the four new sections,
 * which is what says the half below is pinned by the cases named
 * for it rather than by something further up the file.
 *
 * The three service legs read what a write DECIDES. Taking `total`
 * from the rows in hand rather than from `countSources` reddens
 * exactly 2, one in the list section and one in the create section,
 * and both are the cases that read a window narrower than their
 * collection — the reading the refusal half's one wide window could
 * not make. Defaulting `enabled` to false reddens 5, and only two
 * of them are create cases: the health row on the list and both
 * retirement cases go with it, since the fixture's own sources
 * would then land disabled. Defaulting an omitted `contract` to a
 * non-empty object reddens 2, the whole-row compare and the
 * omissions case, which is what says the empty object is decided
 * here rather than at a column.
 *
 * The five store legs reach the rules this module hands over rather
 * than makes. Merging a submitted `parserConfig` into the stored
 * one reddens 4 — every replace reading plus the read-back beside
 * them — which is the leg the three-way replacement exists for.
 * Folding the patch's `enabled` through `||` reddens 3, and the
 * case it leaves GREEN is the reading: bringing a retired feed back
 * submits true, so a fold writing true whatever arrived passes it.
 * Ordering the page by address rather than by id reddens 3, one of
 * them in the refusal half — a read-back case that had been reading
 * a page whose order it never asserted. Inserting every source
 * flagged reddens 4 across three sections, which is what a
 * pipeline-owned column answered on every read looks like when it
 * lands wrong.
 *
 * The blunt one of the eight is recorded rather than read: dropping
 * the aggregate's zero-fill, so that only statuses with rows are
 * counted, reddens 11 of the 30 new cases. Every whole-record
 * compare in the half carries `parseStats`, so the leg reaches
 * cases in all four sections and not only the three the aggregate
 * is named for. It is the blunt shape rather than thin coverage:
 * the three aggregate cases are inside it, and the counted-zero one
 * is the only one whose failure names the status that went missing.
 *
 * What no module mutation reaches, by construction: the table
 * guards read only the tables beside them and are aimed at a later
 * edit, such as an operation added with no row or a body half
 * deleted whole. The planted containment control is invisible to
 * every leg for the same reason and deliberately so: it proves the
 * SEARCH, where the rethrow legs prove the SUBJECT. The key-set
 * pins are `check-types`' rather than vitest's and were proved
 * there instead — a member added to `SourceRecord` as OPTIONAL
 * answers one TS2322 at the conditional pin, and a member named in
 * the list that the record lacks answers a TS2322 and a TS1360 at
 * the two `satisfies`, with the run clean either side.
 */

import type { SourcePage, SourceServiceStore } from './service.js';
import type {
  ParseStatusCounts,
  SourceRecord,
  SourceWithParseStats,
} from './store.js';
import type { FieldError } from '../../lib/errors/index.js';
import type {
  MemoryResearchStore,
  MemorySourceDocument,
} from '../../tests/helpers/memory-research-store.js';
import type { StoreWindow } from '../http/schemas.js';

import { describe, expect, it } from 'vitest';

import {
  AppError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../lib/errors/index.js';
import {
  createMemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';
import {
  DOCUMENT_PARSE_STATUSES,
  SOURCE_KINDS,
} from '../db/schema/values.js';
import { StoreRefusal } from '../db/store-errors.js';

import {
  createSource,
  deleteSource,
  listSources,
  patchSource,
} from './service.js';

/** The seeded worked example, and the domain every case stores. */
const RADAR = 'example-tech-radar';

/** A second domain, invented in the same neutral register. */
const TRANSIT = 'example-urban-transit';

/** A slug shaped like one and carried by no row in any case here. */
const MISSING_SLUG = 'example-not-a-domain';

/** An id shaped like one and carried by no row in any case here. */
const MISSING_ID = 9999;

/** The feed the fixture reads {@link RADAR} through. */
const RADAR_FEED = 'https://example.test/radar/feed.xml';

/** A second address under {@link RADAR}, read as an api. */
const RADAR_ITEMS = 'https://example.test/radar/items';

/** The one address under {@link TRANSIT}. */
const TRANSIT_FEED = 'https://example.test/transit/feed.xml';

/**
 * An address no fixture row carries, for the rows that have to
 * submit one without colliding with anything planted.
 *
 * Colliding would be harmless — this table has no unique key, which
 * is a claim of its own below — but a row whose refusal could be
 * confused for a duplicate is a row that reads ambiguously.
 */
const FRESH_ENDPOINT = 'https://example.test/radar/releases.atom';

/**
 * A window wider than any collection planted here.
 *
 * Wide on purpose, because a REFUSAL is the subject of every case
 * in the half below: a window narrow enough to be interesting would
 * make every list refusal depend on where its rows happened to
 * fall. What the window ARRIVES as rather than what it selects is
 * `src/http/schemas.ts`'s claim, and the two cases that read what
 * it SELECTS pass their own narrower one — a total taken off the
 * rows in hand is right under this window and wrong under theirs.
 */
const WIDE_WINDOW: StoreWindow = { limit: 50, offset: 0 };

/**
 * Two domains and three sources, and the store holding them.
 *
 * Planted through {@link createSource} rather than through the
 * store, so every case starts from writes this module accepted. A
 * planting helper reaching past the subject would leave the whole
 * file green against a `createSource` that refused everything.
 *
 * The three rows differ in `kind` as well as in address, which
 * costs nothing and buys the widening control below a fixture it
 * can be read against: three of the four members of `SOURCE_KINDS`
 * are already in use before any case names one.
 */
interface PlantedSources {
  /** The store, holding {@link RADAR} and {@link TRANSIT}. */
  readonly store: MemoryResearchStore;

  /**
   * A source of {@link RADAR}, carrying no arrangement at all.
   *
   * The one a retirement is read on below, and the one every
   * successful delete takes, since it is the row nothing cites.
   */
  readonly feed: SourceRecord;

  /**
   * A second source of {@link RADAR}, carrying an arrangement.
   *
   * The one every refused delete is read on, and the one a patch
   * replaces a stored document on — which needs a row that has one.
   */
  readonly items: SourceRecord;

  /** A source of {@link TRANSIT}, so scope faults have somewhere to go. */
  readonly foreign: SourceRecord;
}

/**
 * Plants that shape.
 *
 * @returns The store and the three rows.
 */
async function plantSources(): Promise<PlantedSources> {
  const store = createMemoryResearchStore();

  await store.insertDomain({ slug: RADAR, name: 'Radar', settings: {} });
  await store.insertDomain({ slug: TRANSIT, name: 'Transit', settings: {} });

  const feed = await createSource(store, RADAR, {
    kind: 'rss',
    endpoint: RADAR_FEED,
  });
  const items = await createSource(store, RADAR, {
    kind: 'api',
    endpoint: RADAR_ITEMS,
    parserConfig: { itemsAt: 'data.items' },
  });
  const foreign = await createSource(store, TRANSIT, {
    kind: 'url',
    endpoint: TRANSIT_FEED,
  });

  return { store, feed, items, foreign };
}

/**
 * Runs a call that has to be refused, and hands the refusal back.
 *
 * @param run - The call.
 * @returns The `AppError` it raised.
 * @throws When the call ANSWERED, so an operation whose refusal
 *   quietly stopped happening fails here — naming the refusal it
 *   wanted — rather than asserting over an error nobody built.
 *   Anything that is not an `AppError` is rethrown unchanged: a
 *   `StoreRefusal` reaching a caller is a bug in this module rather
 *   than one of its answers, and folding it in would report a 500
 *   as a rule working.
 */
async function refusalFrom(run: () => Promise<unknown>): Promise<AppError> {
  try {
    await run();
  } catch (err) {
    if (err instanceof AppError) {
      return err;
    }

    throw err;
  }

  throw new Error('expected a refusal, and the call answered');
}

/**
 * The two facts a caller reads off each detail of a 422.
 *
 * `message` is not among them: every detail this module answers
 * with was built by `src/http/validation.ts`, whose wording is
 * asserted in that module's own file. What a field path and a code
 * say here is what THIS module asked for.
 *
 * @param details - `err.details`, absent when nothing built any.
 * @returns One `{ field, code }` per detail, in the order the
 *   details were raised.
 */
function detailsOf(
  details: readonly FieldError[] | undefined,
): { field: string; code: string }[] {
  return [...details ?? []].map((detail) => ({
    field: detail.field,
    code: detail.code ?? '',
  }));
}

/**
 * @param haystack - The text to search.
 * @param needle - The string to count.
 * @returns How many times the needle occurs. A count rather than a
 *   boolean, so a zero can be read against a known positive taken
 *   by this same function in the same case.
 */
function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

// ---------------------------------------------------------------------------
// An address that names nothing
// ---------------------------------------------------------------------------

/** Every function this module exports. */
const OPERATIONS = [
  'createSource',
  'deleteSource',
  'listSources',
  'patchSource',
];

/**
 * One operation asked for something that is not there, beside the
 * same operation asked for something that is.
 *
 * The control is a member of the row rather than a table of its
 * own, because the two are one claim: a 404 for an address naming
 * nothing means nothing unless the identical call against a real
 * address answers.
 */
interface MissingCase {
  /** The exported function under test, and the row label. */
  readonly operation: string;

  /**
   * Which address was wrong. Two subjects reach these four
   * operations — a `:slug` that names no domain, and an `:id` that
   * names no source — and a caller has to be able to tell which,
   * since the two are fixed in different places.
   */
  readonly subject: 'domain' | 'source';

  /** The call that has to be refused. */
  readonly refuse: (planted: PlantedSources) => Promise<unknown>;

  /** The same call against an address that is there. */
  readonly control: (planted: PlantedSources) => Promise<unknown>;
}

/** Every operation that can be handed an address naming no row. */
const MISSING_CASES: readonly MissingCase[] = [
  {
    operation: 'listSources',
    subject: 'domain',
    refuse: ({ store }) => listSources(store, MISSING_SLUG, WIDE_WINDOW),
    control: ({ store }) => listSources(store, RADAR, WIDE_WINDOW),
  },
  {
    operation: 'createSource',
    subject: 'domain',
    refuse: ({ store }) => createSource(store, MISSING_SLUG, {
      kind: 'rss',
      endpoint: FRESH_ENDPOINT,
    }),
    control: ({ store }) => createSource(store, RADAR, {
      kind: 'rss',
      endpoint: FRESH_ENDPOINT,
    }),
  },
  {
    operation: 'patchSource',
    subject: 'source',
    refuse: ({ store }) => patchSource(store, MISSING_ID, {
      endpoint: FRESH_ENDPOINT,
    }),
    control: ({ store, feed }) => patchSource(store, feed.id, {
      endpoint: FRESH_ENDPOINT,
    }),
  },
  {
    // The control deletes the row NOTHING cites. `items` carries a
    // planted arrangement and no documents either, but the delete
    // guard is the subject two sections down and a control that
    // could be refused for a second reason reads ambiguously.
    operation: 'deleteSource',
    subject: 'source',
    refuse: ({ store }) => deleteSource(store, MISSING_ID),
    control: ({ store, feed }) => deleteSource(store, feed.id),
  },
];

describe('an address that names nothing', () => {
  it('covers every operation this module exports', () => {
    // Paired by name rather than by count, so a fifth operation
    // added to the module without a row here is this case failing
    // rather than a table that quietly covers four of five.
    expect(MISSING_CASES.map((row) => row.operation).sort())
      .toEqual([...OPERATIONS].sort());
  });

  it('carries rows for both addresses a path can name', () => {
    expect([...new Set(MISSING_CASES.map((row) => row.subject))].sort())
      .toEqual(['domain', 'source']);
  });

  for (const row of MISSING_CASES) {
    it(`answers 404 from ${row.operation}`, async () => {
      const planted = await plantSources();
      const refusal = await refusalFrom(() => row.refuse(planted));

      expect(refusal).toBeInstanceOf(NotFoundError);
      expect(refusal.code).toBe('NOT_FOUND');
      expect(refusal.statusCode).toBe(404);
      expect(refusal.details).toBeUndefined();
    });

    it(`answers ${row.operation} for an address that is`, async () => {
      // The positive control for the row above, varied along the
      // one axis under test: the same operation, the same body, an
      // address that resolves. A module refusing everything passes
      // the refusal case and fails this one.
      const planted = await plantSources();

      await expect(row.control(planted)).resolves.not.toThrow();
    });
  }

  it('says which of the two addresses was wrong', async () => {
    // Not a pin on the wording, which is free to change: a pin on
    // the DISTINCTION. A module answering one sentence to both
    // would send an operator to fix a slug when the id was the
    // fault, and is green against every case above.
    const planted = await plantSources();
    const said = new Map<string, Set<string>>();

    for (const row of MISSING_CASES) {
      const refusal = await refusalFrom(() => row.refuse(planted));
      const seen = said.get(row.subject) ?? new Set<string>();

      seen.add(refusal.message);
      said.set(row.subject, seen);
    }

    const messages = [...said].map(([subject, seen]) => ({
      subject,
      distinct: seen.size,
    }));

    // One sentence per subject, and two subjects: so the map holds
    // exactly two messages and neither is shared.
    expect(messages.sort((left, right) => left.subject < right.subject
      ? -1
      : 1)).toEqual([
      { subject: 'domain', distinct: 1 },
      { subject: 'source', distinct: 1 },
    ]);

    const everySentence = [...said.values()].flatMap((seen) => [...seen]);

    expect(new Set(everySentence).size).toBe(2);
  });

  it('leaves the collection alone when it refuses', async () => {
    // A delete refused for naming nothing must not have taken
    // something else on the way past. Read back through the list,
    // not off the refusal.
    const planted = await plantSources();

    await refusalFrom(() => deleteSource(planted.store, MISSING_ID));

    const page = await listSources(planted.store, RADAR, WIDE_WINDOW);

    expect(page.rows.map((row) => row.endpoint))
      .toEqual([RADAR_FEED, RADAR_ITEMS]);
    expect(page.total).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// A second row over one endpoint
// ---------------------------------------------------------------------------

describe('a second row over one endpoint', () => {
  it('creates a source over an endpoint already read', async () => {
    // The absence of a 409, asserted rather than left implicit.
    // `sources` carries no unique key at all, so the same domain
    // may read one address twice — the same feed under two kinds,
    // or a second row differing only in `parserConfig` while an
    // arrangement is being cut over. Every OTHER resource group on
    // this surface refuses the equivalent call, so a service that
    // copied a sibling translation passes every refusal case in
    // this file and fails only this one.
    const planted = await plantSources();
    const second = await createSource(planted.store, RADAR, {
      kind: 'rss',
      endpoint: RADAR_FEED,
    });

    expect(second.endpoint).toBe(planted.feed.endpoint);
    expect(second.kind).toBe(planted.feed.kind);
    expect(second.domainId).toBe(planted.feed.domainId);
    expect(second.id).not.toBe(planted.feed.id);
  });

  it('leaves both rows in the collection afterwards', async () => {
    // Read back through the list, which is what says the second
    // write LANDED rather than that it merely answered. A store
    // upserting on the endpoint would satisfy every assertion
    // above and answer two rows here as one.
    const planted = await plantSources();

    await createSource(planted.store, RADAR, {
      kind: 'rss',
      endpoint: RADAR_FEED,
    });

    const page = await listSources(planted.store, RADAR, WIDE_WINDOW);

    expect(page.rows.map((row) => row.endpoint))
      .toEqual([RADAR_FEED, RADAR_ITEMS, RADAR_FEED]);
    expect(page.total).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// The bodies these operations refuse
// ---------------------------------------------------------------------------

/** The two operations {@link BODY_CASES} covers. */
const BODY_OPERATIONS = ['create', 'patch'];

/**
 * The five columns of this table the pipeline writes and this
 * surface never accepts.
 *
 * Every one of them is a column of `sources` — unlike the topics
 * table, whose own list borrows a member from here to show the
 * refusal is not per-column. This table needs no such loan: it has
 * five of its own, which is more than any other table on this
 * surface carries, and the reason the pipeline-owned rule is worth
 * a section of `docs/architecture/08-http-api.md`.
 */
const PIPELINE_OWNED = [
  'consecutiveFailures',
  'cursor',
  'flagged',
  'lastFailureAt',
  'lastSuccessAt',
];

/** One detail, as a caller reads it off a validation refusal. */
interface ExpectedDetail {
  /** The dotted field path, or the root name the parser supplies. */
  readonly field: string;

  /** The zod issue code the detail carries through unchanged. */
  readonly code: string;
}

/** One body, and what the operation it was submitted to answers. */
interface BodyCase {
  /** What makes this row different from every other. */
  readonly label: string;

  /** Which operation is handed the body. */
  readonly operation: string;

  /** The body, unvalidated, exactly as a request would carry it. */
  readonly body: unknown;

  /** Every detail the refusal has to carry, in order. */
  readonly details: readonly ExpectedDetail[];
}

/**
 * The bodies the two operations have to refuse.
 *
 * Both carry rows of their own rather than sharing them. They run
 * through one `parseBody`, so a mutation degrading that function
 * reddens both halves equally and a table driven through one of
 * them would pin only that the two share an implementation — while
 * the two schemas genuinely differ, `kind` and `endpoint` being
 * required by one and optional on the other.
 *
 * Every row here is submitted to a SERVICE function rather than to
 * a schema, which is the point: it is what says an MCP tool in wave
 * 3 cannot be handed a body the HTTP route would have refused.
 *
 * THE KIND ROWS ANSWER `invalid_value` AND NOT `invalid_type`, on a
 * missing member as readily as on a wrong one, which is measured
 * rather than assumed: `z.enum` raises its own code for an absence,
 * where `z.string()` raises `invalid_type`. The empty create body
 * below is what carries that reading, since it omits both required
 * members and answers two different codes for them.
 *
 * THE JSONB ROWS NAME THE MEMBER AND NEVER A KEY INSIDE IT. A
 * record handed a list, a number or a null is refused AT the
 * member, which is the one fault these two members can raise while
 * their value schema is `unknown` — and it is the fault
 * `openCutoff` in `src/http/validation.ts` deliberately leaves
 * unmasked, because a fault against the record AS A WHOLE names the
 * one segment this service chose.
 *
 * THE PIPELINE-OWNED ROWS ARE INDISTINGUISHABLE FROM EACH OTHER AT
 * THE DETAIL LEVEL, every one of them `unrecognized_keys` at
 * `body`, and what makes each worth having is the KEY it submits
 * rather than the detail it expects. All five reach both
 * operations, which the guard below reads off the bodies rather
 * than off these labels.
 */
const BODY_CASES: readonly BodyCase[] = [
  {
    label: 'a create body that is not an object',
    operation: 'create',
    body: null,
    details: [{ field: 'body', code: 'invalid_type' }],
  },
  {
    label: 'a create body carrying neither required member',
    operation: 'create',
    body: {},
    details: [
      { field: 'kind', code: 'invalid_value' },
      { field: 'endpoint', code: 'invalid_type' },
    ],
  },
  {
    label: 'a create body fronted by a transport nobody registered',
    operation: 'create',
    body: { kind: 'ftp', endpoint: FRESH_ENDPOINT },
    details: [{ field: 'kind', code: 'invalid_value' }],
  },
  {
    label: 'a create body addressed to the empty string',
    operation: 'create',
    body: { kind: 'rss', endpoint: '' },
    details: [{ field: 'endpoint', code: 'too_small' }],
  },
  {
    label: 'a create body leaving the address off',
    operation: 'create',
    body: { kind: 'rss' },
    details: [{ field: 'endpoint', code: 'invalid_type' }],
  },
  {
    label: 'a create body arranging its parse as a list',
    operation: 'create',
    body: { kind: 'rss', endpoint: FRESH_ENDPOINT, parserConfig: [] },
    details: [{ field: 'parserConfig', code: 'invalid_type' }],
  },
  {
    label: 'a create body contracting for a string',
    operation: 'create',
    body: { kind: 'rss', endpoint: FRESH_ENDPOINT, contract: 'anything' },
    details: [{ field: 'contract', code: 'invalid_type' }],
  },
  {
    label: 'a create body carrying its own cursor',
    operation: 'create',
    body: { kind: 'rss', endpoint: FRESH_ENDPOINT, cursor: 'page-2' },
    details: [{ field: 'body', code: 'unrecognized_keys' }],
  },
  {
    label: 'a create body counting its own failures',
    operation: 'create',
    body: {
      kind: 'rss',
      endpoint: FRESH_ENDPOINT,
      consecutiveFailures: 0,
    },
    details: [{ field: 'body', code: 'unrecognized_keys' }],
  },
  {
    label: 'a create body stamping a success it never had',
    operation: 'create',
    body: {
      kind: 'rss',
      endpoint: FRESH_ENDPOINT,
      lastSuccessAt: '2026-08-31T09:00:00.000Z',
    },
    details: [{ field: 'body', code: 'unrecognized_keys' }],
  },
  {
    label: 'a create body stamping a failure it never had',
    operation: 'create',
    body: {
      kind: 'rss',
      endpoint: FRESH_ENDPOINT,
      lastFailureAt: '2026-08-31T09:00:00.000Z',
    },
    details: [{ field: 'body', code: 'unrecognized_keys' }],
  },
  {
    label: 'a create body flagging itself',
    operation: 'create',
    body: { kind: 'rss', endpoint: FRESH_ENDPOINT, flagged: true },
    details: [{ field: 'body', code: 'unrecognized_keys' }],
  },
  {
    label: 'a create body naming its own domain',
    operation: 'create',
    body: { kind: 'rss', endpoint: FRESH_ENDPOINT, domainId: 1 },
    details: [{ field: 'body', code: 'unrecognized_keys' }],
  },
  {
    label: 'a patch body that is not an object',
    operation: 'patch',
    body: 7,
    details: [{ field: 'body', code: 'invalid_type' }],
  },
  {
    label: 'a patch repointing at a transport nobody registered',
    operation: 'patch',
    body: { kind: 'ftp' },
    details: [{ field: 'kind', code: 'invalid_value' }],
  },
  {
    label: 'a patch clearing the transport with null',
    operation: 'patch',
    body: { kind: null },
    details: [{ field: 'kind', code: 'invalid_value' }],
  },
  {
    label: 'a patch addressing the source at the empty string',
    operation: 'patch',
    body: { endpoint: '' },
    details: [{ field: 'endpoint', code: 'too_small' }],
  },
  {
    label: 'a patch arranging its parse as a list',
    operation: 'patch',
    body: { parserConfig: [] },
    details: [{ field: 'parserConfig', code: 'invalid_type' }],
  },
  {
    label: 'a patch clearing its contract with null',
    operation: 'patch',
    body: { contract: null },
    details: [{ field: 'contract', code: 'invalid_type' }],
  },
  {
    label: 'a patch rewinding its own cursor',
    operation: 'patch',
    body: { cursor: 'page-1' },
    details: [{ field: 'body', code: 'unrecognized_keys' }],
  },
  {
    label: 'a patch resetting its own failure count',
    operation: 'patch',
    body: { consecutiveFailures: 0 },
    details: [{ field: 'body', code: 'unrecognized_keys' }],
  },
  {
    label: 'a patch backdating its last success',
    operation: 'patch',
    body: { lastSuccessAt: '2026-08-31T09:00:00.000Z' },
    details: [{ field: 'body', code: 'unrecognized_keys' }],
  },
  {
    label: 'a patch clearing its last failure',
    operation: 'patch',
    body: { lastFailureAt: null },
    details: [{ field: 'body', code: 'unrecognized_keys' }],
  },
  {
    label: 'a patch clearing the flag',
    operation: 'patch',
    body: { flagged: false },
    details: [{ field: 'body', code: 'unrecognized_keys' }],
  },
  {
    label: 'a patch proposing a move between domains',
    operation: 'patch',
    body: { domainId: 2 },
    details: [{ field: 'body', code: 'unrecognized_keys' }],
  },
];

/**
 * Submits one body to the operation its row names.
 *
 * @param planted - The store and its rows.
 * @param row - The row.
 * @returns Whatever the operation answered, which for every row in
 *   {@link BODY_CASES} is a throw.
 */
async function submitBody(
  planted: PlantedSources,
  row: BodyCase,
): Promise<unknown> {
  return row.operation === 'create'
    ? createSource(planted.store, RADAR, row.body)
    : patchSource(planted.store, planted.feed.id, row.body);
}

/**
 * @param body - A row's body, of any shape at all.
 * @param key - The member to look for.
 * @returns Whether the body is an object carrying that key. Read
 *   off the row rather than off its label, so a guard below cannot
 *   be satisfied by prose.
 */
function bodyCarries(body: unknown, key: string): boolean {
  return typeof body === 'object'
    && body !== null
    && Object.hasOwn(body, key);
}

/**
 * @param body - A row's body.
 * @param key - The member to read.
 * @returns What that member holds, or `undefined` when the body is
 *   not an object or does not carry it.
 */
function bodyMember(body: unknown, key: string): unknown {
  return bodyCarries(body, key)
    ? (body as Record<string, unknown>)[key]
    : undefined;
}

describe('the bodies these operations refuse', () => {
  it('carries rows for both operations that take one', () => {
    expect([...new Set(BODY_CASES.map((row) => row.operation))].sort())
      .toEqual([...BODY_OPERATIONS].sort());
  });

  it('labels every row distinctly', () => {
    const labels = BODY_CASES.map((row) => row.label);

    expect(labels.length).toBe(new Set(labels).size);
  });

  it('names a distinct reason for each class of refusal', () => {
    const codes = BODY_CASES.flatMap(
      (row) => row.details.map((detail) => detail.code),
    );

    expect([...new Set(codes)].sort()).toEqual([
      'invalid_type', 'invalid_value', 'too_small', 'unrecognized_keys',
    ]);
  });

  it('refuses a kind outside the tuple from both operations', () => {
    // The scoped claim, held against the table rather than against
    // a memory of what was written into it: a row deleted from
    // either half stops this file covering the refusal it is named
    // for, and nothing else here would report it. Read off the
    // BODY rather than the label, and against `SOURCE_KINDS`
    // rather than against the literal `ftp`, so a member ADDED to
    // that tuple turns a refusal row into this case failing rather
    // than into a row nobody notices is now wrong.
    const kinds: readonly string[] = SOURCE_KINDS;
    const outside = BODY_CASES.filter((row) => {
      const kind = bodyMember(row.body, 'kind');

      return typeof kind === 'string' && !kinds.includes(kind);
    });

    expect(outside.map((row) => row.operation).sort())
      .toEqual([...BODY_OPERATIONS].sort());
    expect([...new Set(outside.flatMap(
      (row) => row.details.map((detail) => detail.code),
    ))]).toEqual(['invalid_value']);
  });

  it('refuses an empty endpoint from both operations', () => {
    const empty = BODY_CASES.filter(
      (row) => bodyMember(row.body, 'endpoint') === '',
    );

    expect(empty.map((row) => row.operation).sort())
      .toEqual([...BODY_OPERATIONS].sort());
    expect(empty.every((row) => row.details.length === 1)).toBe(true);
    expect([...new Set(empty.flatMap(
      (row) => row.details.map((detail) => detail.code),
    ))]).toEqual(['too_small']);
  });

  it('refuses every pipeline-owned member from both operations', () => {
    // One reading per member rather than one over the set, so a
    // member submitted through the create alone is this case
    // naming which one rather than a count that still adds up.
    const reach = PIPELINE_OWNED.map((key) => ({
      key,
      operations: [...new Set(BODY_CASES
        .filter((row) => bodyCarries(row.body, key))
        .map((row) => row.operation))].sort(),
    }));

    expect(reach).toEqual(PIPELINE_OWNED.map((key) => ({
      key,
      operations: [...BODY_OPERATIONS].sort(),
    })));
  });

  it('names the jsonb member rather than a key inside it', () => {
    // The openness read from the refusal side. A record handed a
    // list is refused AT the member, which is the segment this
    // service chose; a detail naming `parserConfig.*` here would
    // mean the masking had swallowed the one name a caller can act
    // on. Both jsonb members carry a row, on different operations,
    // so a schema narrowing one of the two is a named failure.
    const documents = BODY_CASES.filter(
      (row) => row.details.some(
        (detail) => detail.field === 'parserConfig'
          || detail.field === 'contract',
      ),
    );

    expect(documents.map((row) => row.operation).sort())
      .toEqual([...BODY_OPERATIONS, ...BODY_OPERATIONS].sort());
    expect([...new Set(documents.flatMap(
      (row) => row.details.map((detail) => detail.field),
    ))].sort()).toEqual(['contract', 'parserConfig']);
  });

  for (const row of BODY_CASES) {
    it(`refuses ${row.label}`, async () => {
      const planted = await plantSources();
      const refusal = await refusalFrom(() => submitBody(planted, row));

      expect(refusal).toBeInstanceOf(ValidationError);
      expect(refusal.code).toBe('VALIDATION_ERROR');
      expect(refusal.statusCode).toBe(422);
      expect(detailsOf(refusal.details as FieldError[] | undefined))
        .toEqual([...row.details]);
    });
  }

  it('accepts a body of each declared shape', async () => {
    // The positive control for the whole table, one call per
    // operation, naming every member each schema declares: a
    // module refusing every body passes all twenty-five rows above
    // and fails this.
    const { store, feed } = await plantSources();
    const created = await createSource(store, RADAR, {
      kind: 'api',
      endpoint: FRESH_ENDPOINT,
      parserConfig: { itemsAt: 'data.releases' },
      contract: { required: ['title'] },
      enabled: false,
    });
    const patched = await patchSource(store, feed.id, {
      kind: 'url',
      endpoint: FRESH_ENDPOINT,
      parserConfig: { selector: 'main' },
      contract: { required: ['body'] },
      enabled: false,
    });

    expect(created.endpoint).toBe(FRESH_ENDPOINT);
    expect(patched.kind).toBe('url');
  });

  it('accepts every kind the tuple declares', async () => {
    // The WIDENING control for the two kind rows, and the one a
    // single accepted kind cannot stand in for: a schema spelling
    // three of the four literals by hand refuses the fourth and is
    // green against every refusal row above. Driven over
    // `SOURCE_KINDS` rather than over four literals, so a member
    // added to that tuple is covered here the day it lands.
    const { store } = await plantSources();
    const landed: string[] = [];

    for (const kind of SOURCE_KINDS) {
      const created = await createSource(store, RADAR, {
        kind,
        endpoint: FRESH_ENDPOINT,
      });

      landed.push(created.kind);
    }

    expect(landed).toEqual([...SOURCE_KINDS]);
  });

  it('accepts a repoint onto every kind the tuple declares', async () => {
    // The same control on the other write, since `kind` is
    // patchable here and the two call sites are two parses.
    const { store, feed } = await plantSources();
    const landed: string[] = [];

    for (const kind of SOURCE_KINDS) {
      const patched = await patchSource(store, feed.id, { kind });

      landed.push(patched.kind);
    }

    expect(landed).toEqual([...SOURCE_KINDS]);
  });

  it('accepts an endpoint of one character from both', async () => {
    // The boundary control for the empty-endpoint rows, a single
    // step from the value they refuse. A schema that had stopped
    // checking the address at all passes those rows' neighbours
    // and fails them; a schema refusing every address passes them
    // and fails this. Neither reading is available from one of the
    // two.
    const { store, feed } = await plantSources();
    const created = await createSource(store, RADAR, {
      kind: 'push',
      endpoint: 'x',
    });
    const patched = await patchSource(store, feed.id, { endpoint: 'x' });

    expect(created.endpoint).toBe('x');
    expect(patched.endpoint).toBe('x');
  });

  it('accepts an arrangement whose keys are the operator', async () => {
    // The open-record control, and the one reading that says these
    // two members are records this service takes no view of rather
    // than objects it has not narrowed yet. The keys carry a
    // space, a dot and a leading digit, and the values nest a list
    // inside an object — none of which any declared schema on this
    // surface would accept — and both come back stored whole.
    //
    // It is also the whole of the evidence available for the
    // `openPaths` declaration beside them: while the value schema
    // is `unknown`, no issue is reachable strictly below either
    // prefix, so there is no `*` to assert and the acceptance is
    // what stands in for one.
    const arrangement = {
      'items at': { path: 'data.items', depth: [1, 2] },
      '2ndPass': null,
      'field.map': { title: 'headline' },
    };
    const { store, feed } = await plantSources();
    const created = await createSource(store, RADAR, {
      kind: 'api',
      endpoint: FRESH_ENDPOINT,
      parserConfig: arrangement,
      contract: arrangement,
    });
    const patched = await patchSource(store, feed.id, {
      parserConfig: arrangement,
      contract: arrangement,
    });

    expect(created.parserConfig).toEqual(arrangement);
    expect(created.contract).toEqual(arrangement);
    expect(patched.parserConfig).toEqual(arrangement);
    expect(patched.contract).toEqual(arrangement);
  });

  it('refuses a malformed body before it reads the slug', async () => {
    // The ordering: the shape of a body is a fact about the
    // request alone, so the same body answers 422 whether or not
    // the domain exists. A service resolving the slug first
    // answers 404 here and is green against every row above.
    const { store } = await plantSources();
    const refusal = await refusalFrom(() => createSource(
      store,
      MISSING_SLUG,
      { kind: 'ftp', endpoint: FRESH_ENDPOINT },
    ));

    expect(refusal).toBeInstanceOf(ValidationError);
    expect(refusal.statusCode).toBe(422);
  });

  it('refuses a malformed patch before it reads the id', async () => {
    // The same ordering on the other write, where the row the id
    // names is not there either. A service reading the row first
    // answers 404 and passes every patch row above.
    const { store } = await plantSources();
    const refusal = await refusalFrom(() => patchSource(
      store,
      MISSING_ID,
      { endpoint: '' },
    ));

    expect(refusal).toBeInstanceOf(ValidationError);
    expect(refusal.statusCode).toBe(422);
  });
});

// ---------------------------------------------------------------------------
// What a delete refuses
// ---------------------------------------------------------------------------

/**
 * Every table {@link SourceDependentCounts} counts, spelled out.
 *
 * Written out once so an empty roster cannot make the sweep below
 * vacuously green, and held against the counts each row declares —
 * which `check-types` already holds to the record, so a third
 * counted table reddens there before it reaches this line.
 */
const DEPENDENT_TABLES = ['documents', 'findingSightings'];

/** When the fixture says its planted captures happened. */
const CAPTURED_AT = new Date('2026-08-30T11:00:00.000Z');

/**
 * One planted `documents` row.
 *
 * `ok` rather than `failed`, deliberately: the delete guard counts
 * a source's documents whatever their parse status, so planting the
 * status the review queue reads would let a guard that filtered on
 * it pass. What a `failed` row means is `./failures-service.ts`'s
 * subject and not this one.
 *
 * @param id - The document id, which is also the tiebreak on the
 *   queue's order and is unique here for that reason.
 * @returns The row, as the planting seam takes it.
 */
function capture(id: number): MemorySourceDocument {
  return {
    id,
    url: `${RADAR_ITEMS}/${id}`,
    body: 'a captured document',
    parseError: null,
    capturedAt: CAPTURED_AT,
    parseStatus: 'ok',
  };
}

/** One state a source can be in that refuses its own delete. */
interface DependentCase {
  /** What makes this row different from every other. */
  readonly label: string;

  /** Puts the source in that state, through the planting seams. */
  readonly plant: (planted: PlantedSources) => void;

  /** Both counts the refusal has to carry, the zeros included. */
  readonly counts: Readonly<Record<string, number>>;
}

/**
 * Every state the guard refuses, each table planted alone as well
 * as beside the other.
 *
 * ALONE IS WHAT MAKES EACH TABLE A NAMED CLAIM. A guard reading one
 * of the two — or summing them into a single boolean before either
 * is counted — passes a row that plants both and fails exactly one
 * of the two rows below, which is a failure naming the table it
 * missed rather than a count that still adds up.
 *
 * EVERY ROW CARRIES THE COUNTED ZERO of the table it did not plant.
 * A counted zero and a table nobody counted are different facts to
 * an operator reading what a delete would have taken, and the
 * refusal is the only place that difference is legible.
 */
const DEPENDENT_CASES: readonly DependentCase[] = [
  {
    label: 'documents the corpus still holds',
    plant: ({ store, items }) => {
      store.setSourceDocuments(items.id, [
        capture(1), capture(2), capture(3),
      ]);
    },
    counts: { documents: 3, findingSightings: 0 },
  },
  {
    label: 'sightings that still cite it',
    plant: ({ store, items }) => {
      store.setSourceSightings(items.id, 2);
    },
    counts: { documents: 0, findingSightings: 2 },
  },
  {
    label: 'a document and four sightings at once',
    plant: ({ store, items }) => {
      store.setSourceDocuments(items.id, [capture(1)]);
      store.setSourceSightings(items.id, 4);
    },
    counts: { documents: 1, findingSightings: 4 },
  },
];

/**
 * Wraps a store so that every method reached through it is
 * recorded.
 *
 * A refusal claim has two halves — what was answered, and where the
 * operation stopped — and only the second one says a guard refused
 * BEFORE the destructive call rather than after it. Nothing else in
 * this file can see the difference: the in-memory dataset would
 * look identical if the row had been deleted and the refusal thrown
 * afterwards.
 *
 * @param store - The store to wrap.
 * @param calls - The array every reached method name is pushed
 *   onto, in call order.
 * @returns A store answering exactly as the wrapped one does.
 */
function recordingStore(
  store: MemoryResearchStore,
  calls: string[],
): MemoryResearchStore {
  return new Proxy(store, {
    get(target, key): unknown {
      const member = Reflect.get(target, key) as unknown;

      if (typeof member !== 'function') {
        return member;
      }

      const method = member as (...args: unknown[]) => unknown;

      return (...args: unknown[]): unknown => {
        calls.push(String(key));

        return Reflect.apply(method, target, args);
      };
    },
  });
}

describe('what a delete refuses', () => {
  it('labels every row distinctly', () => {
    const labels = DEPENDENT_CASES.map((row) => row.label);

    expect(labels.length).toBe(new Set(labels).size);
  });

  it('counts every table the port declares', () => {
    // The roster and the rows read against each other. A row
    // declaring one count would leave the other table unasserted
    // while every case below still passed.
    expect(DEPENDENT_TABLES).toEqual(['documents', 'findingSightings']);

    for (const row of DEPENDENT_CASES) {
      expect(Object.keys(row.counts).sort())
        .toEqual([...DEPENDENT_TABLES].sort());
    }
  });

  it('plants each table on its own at least once', () => {
    // The reading that says the two tables are separate claims: for
    // each, some row plants it and nothing else. A table only ever
    // planted beside the other is a table no case can attribute a
    // refusal to.
    const alone = DEPENDENT_TABLES.filter((table) => DEPENDENT_CASES.some(
      (row) => Object.entries(row.counts).every(
        ([name, count]) => name === table
          ? count > 0
          : count === 0,
      ),
    ));

    expect(alone.sort()).toEqual([...DEPENDENT_TABLES].sort());
  });

  for (const row of DEPENDENT_CASES) {
    it(`answers 409 to a source holding ${row.label}`, async () => {
      const planted = await plantSources();

      row.plant(planted);

      const refusal = await refusalFrom(
        () => deleteSource(planted.store, planted.items.id),
      );

      expect(refusal).toBeInstanceOf(ConflictError);
      expect(refusal.code).toBe('CONFLICT');
      expect(refusal.statusCode).toBe(409);

      // Every counted table, the zero included.
      expect(refusal.details).toEqual(row.counts);
    });

    it(`leaves the source standing over ${row.label}`, async () => {
      // Read back through the list rather than off the refusal: a
      // guard that answered 409 after deleting would satisfy every
      // assertion above.
      const planted = await plantSources();

      row.plant(planted);

      await refusalFrom(
        () => deleteSource(planted.store, planted.items.id),
      );

      const page = await listSources(planted.store, RADAR, WIDE_WINDOW);

      expect(page.rows.map((source) => source.id))
        .toEqual([planted.feed.id, planted.items.id]);
    });
  }

  it('deletes a source nothing cites at all', async () => {
    // The control for every row above, and the one they cannot
    // supply: a guard refusing every delete passes all three and
    // fails this. The counts here are two zeros rather than
    // absent, which is what the planting seams make reachable.
    const { store, items } = await plantSources();

    store.setSourceDocuments(items.id, []);
    store.setSourceSightings(items.id, 0);

    await expect(deleteSource(store, items.id)).resolves.toBeUndefined();
  });

  it('stops before the delete rather than after it', async () => {
    // Where the operation stopped, which no reading of the stored
    // rows can answer on its own.
    const planted = await plantSources();

    planted.store.setSourceDocuments(planted.items.id, [capture(1)]);

    const guarded: string[] = [];

    await refusalFrom(() => deleteSource(
      recordingStore(planted.store, guarded),
      planted.items.id,
    ));

    expect(guarded).toContain('countSourceDependents');
    expect(guarded).not.toContain('deleteSource');
  });

  it('reaches the delete when the guard passes', async () => {
    // The control the case above needs: a wrapper recording
    // nothing would satisfy its `not.toContain` too.
    const planted = await plantSources();
    const reached: string[] = [];

    await deleteSource(
      recordingStore(planted.store, reached),
      planted.feed.id,
    );

    expect(reached).toContain('countSourceDependents');
    expect(reached).toContain('deleteSource');
  });

  it('answers 409 to a refusal the guard did not count', async () => {
    // The third foreign key, which nothing on this port counts: a
    // config proposal naming the source refuses the delete with
    // both counted tables at zero. Reconstructed as a store whose
    // write refuses, because no seam here can plant a proposal —
    // `tests/helpers/memory-research-store.ts` says so, and the
    // live suite is where the counted answer is discharged.
    const { store, feed } = await plantSources();
    const refusing: SourceServiceStore = {
      ...store,
      deleteSource: async () => {
        throw new StoreRefusal({
          reason: 'foreign-key-violation',
          constraint: 'source_config_proposals_source_id_sources_id_fk',
        });
      },
    };
    const refusal = await refusalFrom(() => deleteSource(refusing, feed.id));

    expect(refusal).toBeInstanceOf(ConflictError);
    expect(refusal.statusCode).toBe(409);

    // No counts, because none were read for it: the sentence is
    // all there is, and inventing two zeros would say the opposite
    // of what happened.
    expect(refusal.details).toBeUndefined();
    expect(refusal.cause).toBeInstanceOf(StoreRefusal);
  });

  it('says which of the two refusals it met', async () => {
    // The distinction rather than either wording. The counted
    // sentence names documents and sightings, and the uncounted
    // one is reached with both of those at zero, so a module
    // answering one sentence to both would tell an operator to go
    // and look at a corpus that is empty.
    const planted = await plantSources();

    planted.store.setSourceDocuments(planted.items.id, [capture(1)]);

    const counted = await refusalFrom(
      () => deleteSource(planted.store, planted.items.id),
    );
    const refusing: SourceServiceStore = {
      ...planted.store,
      deleteSource: async () => {
        throw new StoreRefusal({
          reason: 'foreign-key-violation',
          constraint: 'source_config_proposals_source_id_sources_id_fk',
        });
      },
    };
    const uncounted = await refusalFrom(
      () => deleteSource(refusing, planted.feed.id),
    );

    expect(counted.statusCode).toBe(uncounted.statusCode);
    expect(counted.message).not.toBe(uncounted.message);
  });

  it('rethrows a delete refusal of another reason', async () => {
    // Only a foreign-key refusal is a conflict here. Anything else
    // out of that write is a store doing something its port does
    // not describe, and answers 500 rather than a plausible status
    // no rule authorised.
    const { store, feed } = await plantSources();
    const misbehaving: SourceServiceStore = {
      ...store,
      deleteSource: async () => {
        throw new StoreRefusal({
          reason: 'check-violation',
          constraint: 'a constraint no delete can reach',
        });
      },
    };

    await expect(deleteSource(misbehaving, feed.id))
      .rejects.toBeInstanceOf(StoreRefusal);
  });
});

// ---------------------------------------------------------------------------
// What only a lost race can produce
// ---------------------------------------------------------------------------

describe('what only a lost race can produce', () => {
  it('answers 404 when the domain went between the two', async () => {
    // The one branch the ordinary fixture cannot reach:
    // `createSource` resolves the domain and only then writes, so
    // a foreign-key refusal means the row was deleted in between.
    // Reconstructed rather than stubbed — the domain is really
    // removed, and the lookup really answers the row it had — so
    // what the write meets is the store's own refusal. The answer
    // is the same 404 the lookup itself raises, because it is the
    // same fact: no domain carries that slug.
    const { store } = await plantSources();
    const found = await store.findDomainBySlug(RADAR);

    if (found === null) {
      throw new Error('the fixture planted no domain to capture');
    }

    await store.deleteDomain(found.id);

    const vanished: SourceServiceStore = {
      ...store,
      findDomainBySlug: async () => found,
    };
    const refusal = await refusalFrom(() => createSource(vanished, RADAR, {
      kind: 'rss',
      endpoint: FRESH_ENDPOINT,
    }));

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.statusCode).toBe(404);
    expect(refusal.cause).toBeInstanceOf(StoreRefusal);
  });

  it('rethrows the CHECK this port does declare', async () => {
    // The one place this module reads a refusal differently from
    // its siblings. `sources_kind_check` is a rule `SourceStore`
    // genuinely declares — `kind` is patchable, so both writes
    // reach it — and it is rethrown all the same, because both
    // schemas here hold `kind` to the tuple the CHECK is generated
    // from. Meeting one anyway means the tuple and the column have
    // drifted apart, which is a deployment fault no caller can act
    // on; a translation answering 422 would tell an operator to
    // fix a request that was correct.
    const { store } = await plantSources();
    const misbehaving: SourceServiceStore = {
      ...store,
      insertSource: async () => {
        throw new StoreRefusal({
          reason: 'check-violation',
          constraint: 'sources_kind_check',
        });
      },
    };

    await expect(createSource(misbehaving, RADAR, {
      kind: 'rss',
      endpoint: FRESH_ENDPOINT,
    })).rejects.toBeInstanceOf(StoreRefusal);
  });

  it('rethrows the same CHECK out of a patch', async () => {
    // The other write reaches the same constraint, through the
    // same translator, and a module that had grown a catch-all on
    // one call site alone passes the case above and fails this.
    const { store, feed } = await plantSources();
    const misbehaving: SourceServiceStore = {
      ...store,
      updateSource: async () => {
        throw new StoreRefusal({
          reason: 'check-violation',
          constraint: 'sources_kind_check',
        });
      },
    };

    await expect(patchSource(misbehaving, feed.id, { kind: 'api' }))
      .rejects.toBeInstanceOf(StoreRefusal);
  });

  it('rethrows an error that is not a store refusal', async () => {
    // A driver fault is not a decision about rows, so nothing here
    // dresses it as one.
    const { store, feed } = await plantSources();
    const misbehaving: SourceServiceStore = {
      ...store,
      updateSource: async () => {
        throw new TypeError('the driver failed on its own account');
      },
    };

    await expect(patchSource(misbehaving, feed.id, {
      endpoint: FRESH_ENDPOINT,
    })).rejects.toBeInstanceOf(TypeError);
  });
});

// ---------------------------------------------------------------------------
// What a refusal is allowed to say
// ---------------------------------------------------------------------------

/** A slug shaped like one, so it reaches the store rather than the parser. */
const SENTINEL_SLUG = 'sentinel-slug-value';

/**
 * An address, submitted as one.
 *
 * Shaped like a URL because `endpoint` is held to non-empty and
 * nothing more: a sentinel a schema would have refused for its
 * SHAPE would be testing the parser rather than the containment.
 */
const SENTINEL_ENDPOINT = 'https://sentinel.endpoint.test/feed';

/**
 * A KEY inside an open record, submitted as one.
 *
 * The channel this resource group has and the wave-1 topics group
 * does not. An operator-chosen key is submitted content in exactly
 * the sense a value is, and zod puts it in `issue.path` verbatim —
 * which is what `openPaths` in `src/http/validation.ts` exists to
 * mask and what this needle is aimed at.
 */
const SENTINEL_KEY = 'sentinelConfigKey';

/** A transport family no registry declares, submitted as one. */
const SENTINEL_KIND = 'sentinel-kind-value';

/** A key no schema here declares, submitted as one. */
const SENTINEL_MEMBER = 'sentinelMemberValue';

/**
 * The five strings the rows below submit. None is a substring of
 * another, so a count against one cannot be satisfied by another.
 */
const SENTINELS = [
  SENTINEL_SLUG,
  SENTINEL_ENDPOINT,
  SENTINEL_KEY,
  SENTINEL_KIND,
  SENTINEL_MEMBER,
];

/** One refused request, and what it submitted that must not return. */
interface ContainmentCase {
  /** What makes this row different from every other. */
  readonly label: string;

  /** The call, submitting the needles below. */
  readonly run: (planted: PlantedSources) => Promise<unknown>;

  /** The submitted strings the answer must not carry. */
  readonly needles: readonly string[];
}

/** Every channel a submitted string could come back through. */
const CONTAINMENT_CASES: readonly ContainmentCase[] = [
  {
    label: 'a slug that names no domain',
    run: ({ store }) => listSources(store, SENTINEL_SLUG, WIDE_WINDOW),
    needles: [SENTINEL_SLUG],
  },
  {
    label: 'a create against a slug that names no domain',
    run: ({ store }) => createSource(store, SENTINEL_SLUG, {
      kind: 'rss',
      endpoint: SENTINEL_ENDPOINT,
      parserConfig: { [SENTINEL_KEY]: 'a selector' },
    }),
    needles: [SENTINEL_SLUG, SENTINEL_ENDPOINT, SENTINEL_KEY],
  },
  {
    label: 'a create fronted by a transport nobody registered',
    run: ({ store }) => createSource(store, RADAR, {
      kind: SENTINEL_KIND,
      endpoint: SENTINEL_ENDPOINT,
    }),
    needles: [SENTINEL_KIND, SENTINEL_ENDPOINT],
  },
  {
    label: 'an undeclared member of a create body',
    run: ({ store }) => createSource(store, RADAR, {
      kind: 'rss',
      endpoint: SENTINEL_ENDPOINT,
      parserConfig: { [SENTINEL_KEY]: 'a selector' },
      [SENTINEL_MEMBER]: 1,
    }),
    needles: [SENTINEL_ENDPOINT, SENTINEL_KEY, SENTINEL_MEMBER],
  },
  {
    label: 'an undeclared member of a patch body',
    run: ({ store, feed }) => patchSource(store, feed.id, {
      contract: { [SENTINEL_KEY]: 'a required field' },
      [SENTINEL_MEMBER]: 1,
    }),
    needles: [SENTINEL_KEY, SENTINEL_MEMBER],
  },
  {
    label: 'a patch against an id that is not there',
    run: ({ store }) => patchSource(store, MISSING_ID, {
      endpoint: SENTINEL_ENDPOINT,
      parserConfig: { [SENTINEL_KEY]: 'a selector' },
    }),
    needles: [SENTINEL_ENDPOINT, SENTINEL_KEY],
  },
];

describe('what a refusal is allowed to say', () => {
  it('submits every sentinel through at least one channel', () => {
    const submitted = CONTAINMENT_CASES.flatMap((row) => [...row.needles]);

    expect([...new Set(submitted)].sort()).toEqual([...SENTINELS].sort());
  });

  it('would find a sentinel a refusal did carry', () => {
    // The planted control. Every row below counts to zero, and a
    // zero is what a search over the wrong text answers too — so
    // the same helper is run against an envelope built here, out
    // of details this module did not produce, and has to find each
    // one.
    const planted = JSON.stringify({
      code: 'CONFLICT',
      message: `No domain carries ${SENTINEL_SLUG}`,
      details: [
        {
          field: `parserConfig.${SENTINEL_KEY}`,
          message: `${SENTINEL_KIND} at ${SENTINEL_ENDPOINT}`,
          code: SENTINEL_MEMBER,
        },
      ],
    });
    const found = SENTINELS.map((needle) => ({
      needle,
      occurrences: countOccurrences(planted, needle),
    }));

    expect(found).toEqual(SENTINELS.map((needle) => ({
      needle,
      occurrences: 1,
    })));
  });

  for (const row of CONTAINMENT_CASES) {
    it(`answers ${row.label} without quoting it`, async () => {
      const planted = await plantSources();
      const refusal = await refusalFrom(() => row.run(planted));
      const answered = JSON.stringify(refusal.toJSON());
      const found = row.needles.map((needle) => ({
        needle,
        occurrences: countOccurrences(answered, needle),
      }));

      // Counted rather than asserted absent, so the reading is a
      // number the planted control above has shown can be
      // something other than zero.
      expect(found).toEqual(row.needles.map((needle) => ({
        needle,
        occurrences: 0,
      })));

      // The envelope was built at all: a helper answering an empty
      // string would satisfy every count above.
      expect(answered.length).toBeGreaterThan(0);
      expect(refusal.toJSON().code).toBe(refusal.code);
    });
  }

  it('keeps the driver error off the wire and on the cause', async () => {
    // The delete's uncounted refusal passes the `StoreRefusal` as
    // `cause`, which is where a debugger and the error-level log
    // line find it. `cause` is non-enumerable per spec, so it
    // reaches no serialised body — a property of the platform
    // rather than of this module, which is why it is measured here
    // rather than assumed.
    const { store, feed } = await plantSources();
    const refusing: SourceServiceStore = {
      ...store,
      deleteSource: async () => {
        throw new StoreRefusal({
          reason: 'foreign-key-violation',
          constraint: `${SENTINEL_MEMBER}_fk`,
        });
      },
    };
    const refusal = await refusalFrom(() => deleteSource(refusing, feed.id));

    expect(refusal.cause).toBeInstanceOf(StoreRefusal);
    expect(Object.keys(refusal.toJSON()).sort())
      .toEqual(['code', 'message']);
    expect(countOccurrences(
      JSON.stringify(refusal.toJSON()),
      SENTINEL_MEMBER,
    )).toBe(0);
  });

  it('puts the counts it read on the wire and nothing else', async () => {
    // The one refusal here that carries `details` at all, and the
    // reading that says what they are: two numbers this module
    // counted, rather than anything a caller sent. The endpoint
    // and the arrangement key were both submitted on the row being
    // deleted, so a refusal echoing the row it refused would be
    // caught by the same count the rows above take.
    const planted = await plantSources();
    const source = await createSource(planted.store, RADAR, {
      kind: 'rss',
      endpoint: SENTINEL_ENDPOINT,
      parserConfig: { [SENTINEL_KEY]: 'a selector' },
    });

    planted.store.setSourceDocuments(source.id, [capture(1)]);

    const refusal = await refusalFrom(
      () => deleteSource(planted.store, source.id),
    );
    const answered = JSON.stringify(refusal.toJSON());

    expect(refusal.details).toEqual({ documents: 1, findingSightings: 0 });
    expect(Object.keys(refusal.toJSON()).sort())
      .toEqual(['code', 'details', 'message']);
    expect([SENTINEL_ENDPOINT, SENTINEL_KEY].map((needle) => ({
      needle,
      occurrences: countOccurrences(answered, needle),
    }))).toEqual([SENTINEL_ENDPOINT, SENTINEL_KEY].map((needle) => ({
      needle,
      occurrences: 0,
    })));
  });
});

// ---------------------------------------------------------------------------
// What a list scopes to
// ---------------------------------------------------------------------------

/**
 * The members `SourceRecord` declares.
 *
 * Written out rather than derived, because an interface has no
 * runtime form to read keys off — and pinned in BOTH directions,
 * since a one-directional list is exactly as green as no list at
 * all against the drift that matters. `satisfies` closes the
 * direction where this names a member the record lacks;
 * {@link EVERY_KEY_LISTED} closes the one where the record grows a
 * member nothing here learned about.
 *
 * The second direction is the one THIS table needs. Five of these
 * twelve columns belong to the pipeline and no request may name
 * one, so this projection is the whole of how they reach a caller:
 * a column added beside them is answered on every read the day it
 * lands, and every field-by-field assertion in this file would stay
 * green while the surface carried it.
 */
const SOURCE_KEYS = [
  'consecutiveFailures',
  'contract',
  'cursor',
  'domainId',
  'enabled',
  'endpoint',
  'flagged',
  'id',
  'kind',
  'lastFailureAt',
  'lastSuccessAt',
  'parserConfig',
] as const satisfies readonly (keyof SourceRecord)[];

/**
 * What a LIST row carries on top of those: the aggregate, and
 * nothing else.
 *
 * Spread from {@link SOURCE_KEYS} rather than written out again, so
 * the one member is the whole of the difference between the two
 * reads — a projection dropping a column on the list alone is this
 * list disagreeing with the row a write answers.
 */
const LISTED_KEYS = [
  ...SOURCE_KEYS,
  'parseStats',
] as const satisfies readonly (keyof SourceWithParseStats)[];

/** The two members a page carries around its rows. */
const PAGE_KEYS = [
  'rows',
  'total',
] as const satisfies readonly (keyof SourcePage)[];

/**
 * The columns an operator reads a feed's HEALTH off.
 *
 * Four are the pipeline's own and `enabled` is the operator's,
 * which is the pairing that makes the reading useful: a feed
 * failing every pass and a feed somebody switched off are two
 * states an operator has to tell apart, and both are answered here.
 * `cursor` is the pipeline's fifth column and is not a health
 * reading at all — it is where the last pass got to — so it sits in
 * {@link SOURCE_KEYS} and in every whole-record compare below
 * rather than in this roster.
 *
 * Held to `SourceRecord` by `satisfies`, so a renamed column is a
 * refusal here rather than a string nobody reads.
 */
const HEALTH_KEYS = [
  'consecutiveFailures',
  'enabled',
  'flagged',
  'lastFailureAt',
  'lastSuccessAt',
] as const satisfies readonly (keyof SourceRecord)[];

/** Exactly the members {@link HEALTH_KEYS} names. */
type SourceHealth = Pick<SourceRecord, (typeof HEALTH_KEYS)[number]>;

/**
 * `true` only while `L` names every key of `T`.
 *
 * The tuple wrapper is load-bearing rather than decoration: without
 * it the union distributes over the conditional and the answer is
 * `boolean`, which accepts `true` as an initializer and pins
 * nothing at all.
 *
 * @typeParam T - The type whose keys must all be named.
 * @typeParam L - The list naming them, as `typeof <the const>`.
 */
type CoversEveryKey<T, L extends readonly PropertyKey[]> =
  [Exclude<keyof T, L[number]>] extends [never] ? true : false;

/** The three lists above, held against the types they describe. */
type EveryKeyListed =
  CoversEveryKey<SourceRecord, typeof SOURCE_KEYS>
  & CoversEveryKey<SourceWithParseStats, typeof LISTED_KEYS>
  & CoversEveryKey<SourcePage, typeof PAGE_KEYS>;

/**
 * The half of the drift guard `check-types` owns.
 *
 * A member added to `SourceRecord`, to `SourceWithParseStats` or to
 * `SourcePage` and to none of the lists above turns
 * {@link EveryKeyListed} into `never`, and this initializer is then
 * a TS2322 at this line — before any case can compare a record
 * against a set that has quietly stopped describing it. Read in a
 * case below, so it is a symbol this file uses rather than one lint
 * reports.
 */
const EVERY_KEY_LISTED: EveryKeyListed = true;

/** {@link SOURCE_KEYS}, sorted at use rather than by hand. */
const SOURCE_KEY_SET: readonly string[] = [...SOURCE_KEYS].sort();

/** {@link LISTED_KEYS}, sorted. */
const LISTED_KEY_SET: readonly string[] = [...LISTED_KEYS].sort();

/** {@link PAGE_KEYS}, sorted. */
const PAGE_KEY_SET: readonly string[] = [...PAGE_KEYS].sort();

/** A third domain, invented in the same neutral register. */
const SEABED = 'example-seabed-mapping';

/**
 * An address sorting ahead of both of {@link RADAR}'s, for the one
 * case that reads the page's ORDER.
 */
const EARLY_ENDPOINT = 'https://example.test/radar/archive.json';

/**
 * What every health column reads as on a source nothing has fetched
 * yet, which is every source this file can create.
 *
 * Typed as {@link SourceHealth}, so a column added to
 * {@link HEALTH_KEYS} is a missing member here rather than a
 * roster the expectations quietly stopped covering.
 */
const NEVER_FETCHED: SourceHealth = {
  consecutiveFailures: 0,
  enabled: true,
  flagged: false,
  lastFailureAt: null,
  lastSuccessAt: null,
};

/**
 * What the aggregate reads as for a source that captured nothing.
 *
 * Built from `DOCUMENT_PARSE_STATUSES` rather than from two
 * literals, so a member added to that tuple is expected here the
 * day it lands rather than left out of every comparison below. The
 * cast is what `Object.fromEntries` costs: it answers an index
 * signature, and the record this stands for is keyed by the tuple.
 */
const NO_CAPTURES: ParseStatusCounts = Object.fromEntries(
  DOCUMENT_PARSE_STATUSES.map((status) => [status, 0]),
) as ParseStatusCounts;

/**
 * One planted `documents` row that did not parse.
 *
 * {@link capture} answers the `ok` side, deliberately, because the
 * delete guard it was written for counts a source's documents
 * whatever their status. The aggregate below groups ACROSS both
 * members of `DOCUMENT_PARSE_STATUSES`, so a fixture that could
 * plant only one of them would leave a record keyed by the wrong
 * status counting correctly.
 *
 * @param id - The document id.
 * @returns The row, as the planting seam takes it.
 */
function failedCapture(id: number): MemorySourceDocument {
  return {
    ...capture(id),
    parseError: 'the payload did not match the contract',
    parseStatus: 'failed',
  };
}

/**
 * One stored row as a list answers it while nothing has been
 * captured through it.
 *
 * @param row - The source, as a write answered it.
 * @returns The same row with the counted zeros beside it.
 */
function neverCaptured(row: SourceRecord): SourceWithParseStats {
  return { ...row, parseStats: NO_CAPTURES };
}

/**
 * The health of one answered source.
 *
 * Written out member by member rather than folded off the roster,
 * because {@link SourceHealth} is then what checks it: a column
 * added to {@link HEALTH_KEYS} is a missing member here rather than
 * a key a fold would have silently skipped.
 *
 * @param row - The source, as a read answered it.
 * @returns Exactly the members {@link HEALTH_KEYS} names.
 */
function healthOf(row: SourceRecord): SourceHealth {
  return {
    consecutiveFailures: row.consecutiveFailures,
    enabled: row.enabled,
    flagged: row.flagged,
    lastFailureAt: row.lastFailureAt,
    lastSuccessAt: row.lastSuccessAt,
  };
}

/**
 * Finds one answered source by the address it reads.
 *
 * @param rows - What a read answered.
 * @param endpoint - The address to look for.
 * @returns The row carrying it.
 * @throws When no row does. A `find` answering `undefined` compares
 *   equal to another `undefined`, so a case reading a stored row
 *   back against a write that never landed would otherwise pass for
 *   nobody's reason. Two rows may share an address on this table,
 *   which no case below plants and which would answer the first.
 */
function sourceAt(
  rows: readonly SourceWithParseStats[],
  endpoint: string,
): SourceWithParseStats {
  const found = rows.find((row) => row.endpoint === endpoint);

  if (found === undefined) {
    throw new Error('no answered row reads that address');
  }

  return found;
}

/**
 * The keys of a stored jsonb document.
 *
 * `SourceRecord.parserConfig` is `unknown` by design — the port
 * takes no view of what an adapter's arrangement holds — so a case
 * reading its SHAPE says so here once rather than casting on every
 * line.
 *
 * @param document - What a read answered.
 * @returns Its own keys, sorted.
 */
function settingsOf(document: unknown): string[] {
  return Object.keys(document as object).sort();
}

describe('what a list scopes to', () => {
  it('holds every key set against the type it describes', () => {
    // The runtime half of the pin above. What it asserts is not the
    // `true` — that is a constant — but that the symbol exists to
    // be read: its VALUE is the statement `check-types` makes at
    // the declaration, which is a TS2322 the moment any of the
    // three types grows a member no list names.
    expect(EVERY_KEY_LISTED).toBe(true);

    // Every aggregate expectation below is derived from the tuple,
    // so an emptied tuple would make each of them vacuously true.
    // Two members is what `documents_parse_status_check` carries.
    expect(DOCUMENT_PARSE_STATUSES.length).toBeGreaterThan(1);
  });

  it('answers the sources of the domain it was given', async () => {
    // The scoping claim. Whole records rather than addresses, so a
    // page assembled out of the right endpoints and the wrong rows
    // is this case failing — and every row carries the aggregate,
    // which is the one member a list answers and no other read on
    // this surface does.
    const planted = await plantSources();
    const here = await listSources(planted.store, RADAR, WIDE_WINDOW);
    const there = await listSources(planted.store, TRANSIT, WIDE_WINDOW);

    expect(here.rows).toStrictEqual([
      neverCaptured(planted.feed),
      neverCaptured(planted.items),
    ]);
    expect(here.total).toBe(2);
    expect(there.rows).toStrictEqual([neverCaptured(planted.foreign)]);
    expect(there.total).toBe(1);

    // The sorted key SET beside the records the case compares. A
    // member arriving on the row by spread — a column nobody
    // projected — is invisible to a compare against a record this
    // same module answered, and is exactly what this line catches.
    expect(Object.keys(sourceAt(here.rows, RADAR_FEED)).sort())
      .toEqual([...LISTED_KEY_SET]);
    expect(Object.keys(here).sort()).toEqual([...PAGE_KEY_SET]);
  });

  it('carries every health column on every row', async () => {
    // The five columns an operator reads a feed's condition off,
    // answered on every row of the page and compared as a whole
    // record per row: a projection dropping one of them answers a
    // perfectly plausible source. `enabled` is moved on one of the
    // two rows first, so a read filling the health columns with
    // constants answers both rows alike and fails here.
    const planted = await plantSources();

    await patchSource(planted.store, planted.items.id, { enabled: false });

    const page = await listSources(planted.store, RADAR, WIDE_WINDOW);

    expect(page.rows.map(healthOf)).toEqual([
      NEVER_FETCHED,
      { ...NEVER_FETCHED, enabled: false },
    ]);

    // The expectation names exactly the roster. `check-types` says
    // so at the declaration; this is that pin's runtime half.
    expect(Object.keys(NEVER_FETCHED).sort())
      .toEqual([...HEALTH_KEYS].sort());
  });

  it('keys the aggregate by the whole status tuple', async () => {
    // The record's KEYS rather than its counts, on every row of the
    // page: a grouped read answers a row per status that HAS
    // documents, so an implementation handing those groups straight
    // back answers a record whose members differ per source. Read
    // off the tuple `documents_parse_status_check` is generated
    // from, so the two are one reading rather than two literals.
    const planted = await plantSources();

    planted.store.setSourceDocuments(planted.feed.id, [capture(1)]);

    const page = await listSources(planted.store, RADAR, WIDE_WINDOW);
    const keyed = page.rows.map((row) => Object.keys(row.parseStats).sort());
    const tuple = [...DOCUMENT_PARSE_STATUSES].sort();

    expect(keyed).toHaveLength(2);
    expect(keyed).toEqual(page.rows.map(() => tuple));
  });

  it('counts each status the documents sit at', async () => {
    // Two `ok` rows and one `failed` under one source, so the two
    // members carry DIFFERENT numbers: a record built with the two
    // statuses swapped counts correctly under any fixture that
    // gives them the same total. The sibling captured nothing and
    // is read from the same page, which is what says the counts are
    // per SOURCE rather than over the domain's whole corpus.
    const planted = await plantSources();

    planted.store.setSourceDocuments(planted.feed.id, [
      capture(1), capture(2), failedCapture(3),
    ]);

    const page = await listSources(planted.store, RADAR, WIDE_WINDOW);

    expect(sourceAt(page.rows, RADAR_FEED).parseStats)
      .toStrictEqual({ ok: 2, failed: 1 });
    expect(sourceAt(page.rows, RADAR_ITEMS).parseStats)
      .toStrictEqual(NO_CAPTURES);
  });

  it('counts a zero under each member for a source with none', async () => {
    // The trap `ParseStatusCounts` names: a status with no rows
    // contributes no group to the `GROUP BY`, so an implementation
    // handing the groups back leaves `0` and never-counted the same
    // value. Read member by member off the tuple rather than as one
    // record, so a failure names the status that went missing. The
    // sibling that DID capture is read in the same case: a module
    // answering zeros to everything passes the first half of this
    // and fails the second.
    const planted = await plantSources();

    planted.store.setSourceDocuments(planted.items.id, [failedCapture(1)]);

    const page = await listSources(planted.store, RADAR, WIDE_WINDOW);
    const empty = sourceAt(page.rows, RADAR_FEED).parseStats;

    expect(DOCUMENT_PARSE_STATUSES.map((status) => ({
      status,
      count: empty[status],
    }))).toEqual(DOCUMENT_PARSE_STATUSES.map((status) => ({
      status,
      count: 0,
    })));
    expect(Object.keys(empty).sort())
      .toEqual([...DOCUMENT_PARSE_STATUSES].sort());
    expect(sourceAt(page.rows, RADAR_ITEMS).parseStats.failed).toBe(1);
  });

  it('orders the page by id rather than by address', async () => {
    // The port's contract, and the fixture cannot report it on its
    // own: its two rows come back in insertion order under either
    // rule. A third source addressed AHEAD of both of them
    // alphabetically is what separates the two — a read ordered by
    // endpoint answers it first, and a window over an unordered
    // read is not a page at all.
    const planted = await plantSources();
    const late = await createSource(planted.store, RADAR, {
      kind: 'rss',
      endpoint: EARLY_ENDPOINT,
    });
    const page = await listSources(planted.store, RADAR, WIDE_WINDOW);

    expect(page.rows.map((row) => row.id))
      .toEqual([planted.feed.id, planted.items.id, late.id]);
    expect(late.endpoint < planted.feed.endpoint).toBe(true);
  });

  it('reports the collection rather than the page in hand', async () => {
    // `total` is a second question rather than the length of the
    // rows in hand, and the refusal half of this file could not say
    // so: its one window was wider than every collection, so a
    // total taken off the rows would have been right there. This
    // window holds one row of two.
    const planted = await plantSources();
    const page = await listSources(planted.store, RADAR, {
      limit: 1,
      offset: 0,
    });

    expect(page.rows.map((row) => row.endpoint)).toEqual([RADAR_FEED]);
    expect(page.total).toBe(2);
  });

  it('answers an empty page for a domain holding none', async () => {
    // A domain with no sources and a slug naming no domain are two
    // states, and this is the one that is not a 404: the collection
    // is there and empty. The RADAR read beside it is the control —
    // a module answering an empty page to everything passes the
    // first half of this and fails the second.
    const planted = await plantSources();

    await planted.store.insertDomain({
      slug: SEABED,
      name: 'Seabed',
      settings: {},
    });

    const empty = await listSources(planted.store, SEABED, WIDE_WINDOW);
    const held = await listSources(planted.store, RADAR, WIDE_WINDOW);

    expect(empty).toStrictEqual({ rows: [], total: 0 });
    expect(held.total).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// What a create lands
// ---------------------------------------------------------------------------

/** The arrangement the creates below hand their parser. */
const FRESH_CONFIG = { itemsAt: 'data.releases', page: 'cursor' };

/** The contract they hand it beside that. */
const FRESH_CONTRACT = { required: ['title', 'url'] };

describe('what a create lands', () => {
  it('answers a row that is enabled and never fetched', async () => {
    // The whole row rather than the two members the case is named
    // for. `enabled` true is what makes a source a feed the
    // pipeline reads, and `flagged` false is the adapter-rot
    // detector never having spoken — but a create reaching a member
    // nobody submitted is exactly as wrong and is invisible to a
    // pair of field reads. The five pipeline-owned columns are the
    // point of the whole compare: no body may name one, so this is
    // the only place their landing value is decided at all.
    const planted = await plantSources();
    const created = await createSource(planted.store, RADAR, {
      kind: 'rss',
      endpoint: FRESH_ENDPOINT,
    });

    expect(created).toStrictEqual({
      id: created.id,
      domainId: planted.feed.domainId,
      kind: 'rss',
      endpoint: FRESH_ENDPOINT,
      parserConfig: {},
      contract: {},
      cursor: null,
      consecutiveFailures: 0,
      lastSuccessAt: null,
      lastFailureAt: null,
      enabled: true,
      flagged: false,
    });

    // The id is the store's own — no body here carries one — and
    // the sorted key set beside it, since the id is the one member
    // a whole-row compare cannot pin against anything but itself.
    expect(created.id).toBeGreaterThan(planted.foreign.id);
    expect(Object.keys(created).sort()).toEqual([...SOURCE_KEY_SET]);
  });

  it('turns the two omissions into values', async () => {
    // Both jsonb members are optional in the schema and REQUIRED by
    // `InsertSourceInput`, so what an absence means is decided in
    // the service and is readable here rather than left to a column
    // only one of the two implementations has. The empty object is
    // a complete value: a source with no arrangement is one whose
    // adapter reads the payload as it comes.
    const { store } = await plantSources();
    const created = await createSource(store, RADAR, {
      kind: 'push',
      endpoint: FRESH_ENDPOINT,
    });

    expect(created.parserConfig).toStrictEqual({});
    expect(created.contract).toStrictEqual({});
    expect(created.enabled).toBe(true);
  });

  it('lands the arrangement a body did supply', async () => {
    // The control for the case above: a service writing `{}`
    // whatever arrived passes it and fails this. Both members in
    // one body, since the two are copied by the same shape of code
    // and a call naming one of them cannot report the other.
    const { store } = await plantSources();
    const created = await createSource(store, RADAR, {
      kind: 'api',
      endpoint: FRESH_ENDPOINT,
      parserConfig: FRESH_CONFIG,
      contract: FRESH_CONTRACT,
    });

    expect(created.parserConfig).toStrictEqual(FRESH_CONFIG);
    expect(created.contract).toStrictEqual(FRESH_CONTRACT);
  });

  it('stages a source switched off when the body says so', async () => {
    // The control that makes the `enabled: true` above a DEFAULT
    // rather than a constant: a service writing true whatever was
    // submitted passes both cases above and fails this. `flagged`
    // is read beside it because the two are different facts — a
    // feed staged off is one nobody has read yet, not one an
    // adapter found broken — and no body can reach the second.
    const { store } = await plantSources();
    const created = await createSource(store, RADAR, {
      kind: 'url',
      endpoint: FRESH_ENDPOINT,
      enabled: false,
    });

    expect(created.enabled).toBe(false);
    expect(created.flagged).toBe(false);
    expect(created.cursor).toBeNull();
  });

  it('stores the row it answered', async () => {
    // Read back through the OTHER operation, so the claim is about
    // what is stored rather than about what one call happened to
    // answer: a create returning a row it never wrote passes every
    // case above and fails this. The listed row is the created row
    // plus the aggregate, which is what says a source arrives on
    // the page with counted zeros rather than with no counts.
    const planted = await plantSources();
    const created = await createSource(planted.store, RADAR, {
      kind: 'rss',
      endpoint: FRESH_ENDPOINT,
    });
    const page = await listSources(planted.store, RADAR, WIDE_WINDOW);

    expect(sourceAt(page.rows, FRESH_ENDPOINT))
      .toStrictEqual(neverCaptured(created));
  });

  it('writes into the domain the path addressed', async () => {
    // The `:slug` reached the WRITE rather than only a lookup: a
    // create stamping another domain answers a perfectly plausible
    // row and files it under configuration nobody asked about.
    // Nothing on this table refuses a misfiled row — there is no
    // unique key for it to collide with, which is where this
    // differs from every sibling group — so the two collections
    // read back whole are the only reading that reports it.
    const planted = await plantSources();

    await createSource(planted.store, TRANSIT, {
      kind: 'rss',
      endpoint: FRESH_ENDPOINT,
    });

    const here = await listSources(planted.store, TRANSIT, WIDE_WINDOW);
    const there = await listSources(planted.store, RADAR, WIDE_WINDOW);

    expect(here.rows.map((row) => row.endpoint))
      .toEqual([TRANSIT_FEED, FRESH_ENDPOINT]);
    expect(here.total).toBe(2);
    expect(there.rows).toStrictEqual([
      neverCaptured(planted.feed),
      neverCaptured(planted.items),
    ]);
  });

  it('counts the new row in the total a page reports', async () => {
    // `total` is a second question rather than the length of the
    // rows in hand, so a create the count never saw would leave a
    // page claiming to be the whole of a domain it is not. Read
    // through a window of one, so the two numbers cannot agree by
    // accident.
    const planted = await plantSources();

    await createSource(planted.store, RADAR, {
      kind: 'rss',
      endpoint: FRESH_ENDPOINT,
    });

    const page = await listSources(planted.store, RADAR, {
      limit: 1,
      offset: 0,
    });

    expect(page.rows).toHaveLength(1);
    expect(page.total).toBe(3);
  });

  it('leaves the feeds the domain already read', async () => {
    // A write lands one row. The two the fixture planted are still
    // there and still say what they said, which no assertion over
    // the created row could report.
    const planted = await plantSources();

    await createSource(planted.store, RADAR, {
      kind: 'rss',
      endpoint: FRESH_ENDPOINT,
    });

    const page = await listSources(planted.store, RADAR, WIDE_WINDOW);

    expect(sourceAt(page.rows, RADAR_FEED))
      .toStrictEqual(neverCaptured(planted.feed));
    expect(sourceAt(page.rows, RADAR_ITEMS))
      .toStrictEqual(neverCaptured(planted.items));
  });
});

// ---------------------------------------------------------------------------
// What a patch retunes
// ---------------------------------------------------------------------------

/**
 * The arrangement a patch writes in place of a stored one.
 *
 * Shares NO key with the `itemsAt` the fixture gave `items`, so the
 * two readings a merge could be come apart: a merge answers two
 * settings and a replace answers this one. A replacement sharing a
 * key would leave both satisfiable together.
 */
const REPLACED_CONFIG = { selector: 'main article' };

/** What a patch writes in place of a stored contract. */
const REPLACED_CONTRACT = { required: ['body'] };

/** An arrangement of two settings, for the SUBSET reading. */
const TWO_SETTINGS = { selector: 'main', strip: ['nav', 'footer'] };

describe('what a patch retunes', () => {
  it('replaces the arrangement whole rather than merging', async () => {
    // Compared against the row as it was rather than field by
    // field: a patch reaching a second member answers a plausible
    // source and quietly changes what the next pass reads. The
    // stored arrangement shares no key with the one replacing it,
    // so a merge answers two settings where a replace answers one,
    // and the keys are read on both sides rather than the values.
    const planted = await plantSources();
    const patched = await patchSource(planted.store, planted.items.id, {
      parserConfig: REPLACED_CONFIG,
    });

    expect(patched).toStrictEqual({
      ...planted.items,
      parserConfig: REPLACED_CONFIG,
    });
    expect(settingsOf(planted.items.parserConfig)).toEqual(['itemsAt']);
    expect(settingsOf(patched.parserConfig)).toEqual(['selector']);
  });

  it('stores the arrangement it replaced', async () => {
    // Read back through the list, so the claim is about the stored
    // row rather than about what the patch answered. A module
    // answering a row it never wrote passes the case above.
    const planted = await plantSources();

    await patchSource(planted.store, planted.items.id, {
      parserConfig: REPLACED_CONFIG,
    });

    const page = await listSources(planted.store, RADAR, WIDE_WINDOW);

    expect(sourceAt(page.rows, RADAR_ITEMS)).toStrictEqual(neverCaptured({
      ...planted.items,
      parserConfig: REPLACED_CONFIG,
    }));
  });

  it('drops a setting by being sent the rest without it', async () => {
    // The SUBSET reading, which the disjoint replacement above
    // cannot make: a caller sends the arrangement it wants to
    // exist, so removing one setting is sending the other. A store
    // merging the two answers both keys here and is
    // indistinguishable from a correct replace whenever the
    // submitted document is a subset of the stored one — which is
    // the shape a caller who edited an arrangement actually sends.
    const { store } = await plantSources();
    const source = await createSource(store, RADAR, {
      kind: 'url',
      endpoint: FRESH_ENDPOINT,
      parserConfig: TWO_SETTINGS,
    });
    const patched = await patchSource(store, source.id, {
      parserConfig: { selector: TWO_SETTINGS.selector },
    });

    expect(settingsOf(source.parserConfig)).toEqual(['selector', 'strip']);
    expect(patched.parserConfig).toStrictEqual({
      selector: TWO_SETTINGS.selector,
    });
  });

  it('clears both documents when it is sent empty objects', async () => {
    // An empty object is a complete value and the only way to
    // express holding no arrangement at all, so a store treating it
    // as an absence leaves the stored settings standing and answers
    // a row that looks right. Both members in ONE body, which is
    // the only shape that reports a service copying one of the two
    // and leaving the other: they are written by the same shape of
    // code, so a case naming one of them alone cannot see it.
    const { store } = await plantSources();
    const source = await createSource(store, RADAR, {
      kind: 'api',
      endpoint: FRESH_ENDPOINT,
      parserConfig: FRESH_CONFIG,
      contract: FRESH_CONTRACT,
    });
    const patched = await patchSource(store, source.id, {
      parserConfig: {},
      contract: {},
    });

    expect(patched).toStrictEqual({
      ...source,
      parserConfig: {},
      contract: {},
    });
  });

  it('moves the contract and leaves the parser config', async () => {
    // The two are separate members rather than a pair. A patch
    // writing both from whichever one was submitted answers a
    // plausible row, passes the case above — it submits both — and
    // is reported by nothing else in this file.
    const planted = await plantSources();
    const patched = await patchSource(planted.store, planted.items.id, {
      contract: REPLACED_CONTRACT,
    });

    expect(patched).toStrictEqual({
      ...planted.items,
      contract: REPLACED_CONTRACT,
    });
    expect(patched.parserConfig).toStrictEqual(planted.items.parserConfig);
  });

  it('retires a feed without deleting it', async () => {
    // `enabled` is the column the schema provides for taking a feed
    // out of the pipeline, and this is the whole of what a
    // retirement writes: the address, the arrangement and the
    // corpus stay, which is what makes it recoverable and what
    // makes it the operation `deleteSource` names when it refuses.
    const planted = await plantSources();
    const patched = await patchSource(planted.store, planted.feed.id, {
      enabled: false,
    });

    expect(planted.feed.enabled).toBe(true);
    expect(patched).toStrictEqual({ ...planted.feed, enabled: false });

    // The flag is not what a retirement writes and no body could
    // reach it: setting it is the adapter-rot detector's, and
    // clearing it is on no surface at all.
    expect(patched.flagged).toBe(false);
  });

  it('keeps a retired feed on the page it was listed on', async () => {
    // `enabled` is not a filter on this read. A list quietly hiding
    // disabled rows would leave an operator with no way to find the
    // feed they had just switched off, and every count in the
    // refusal half of this file would still add up. The documents
    // it captured are still counted beside it, which is what says a
    // retirement takes nothing away.
    const planted = await plantSources();

    planted.store.setSourceDocuments(planted.feed.id, [capture(1)]);

    await patchSource(planted.store, planted.feed.id, { enabled: false });

    const page = await listSources(planted.store, RADAR, WIDE_WINDOW);

    expect(page.rows.map((row) => row.endpoint))
      .toEqual([RADAR_FEED, RADAR_ITEMS]);
    expect(page.total).toBe(2);
    expect(sourceAt(page.rows, RADAR_FEED).enabled).toBe(false);
    expect(sourceAt(page.rows, RADAR_FEED).parseStats.ok).toBe(1);
  });

  it('brings a retired feed back', async () => {
    // The member is not one-way, and this is what says so. A
    // service folding `enabled` through `||` rather than `??`
    // writes true for a submitted false and fails the retirement
    // above; one that had stopped writing the column at all passes
    // that case only while the stored value already differed, and
    // fails here.
    const planted = await plantSources();

    await patchSource(planted.store, planted.feed.id, { enabled: false });

    const revived = await patchSource(planted.store, planted.feed.id, {
      enabled: true,
    });

    expect(revived).toStrictEqual(planted.feed);
  });

  it('patches the source it named and no other', async () => {
    // Both domains read back whole: three sources, one arrangement
    // moved. A patch reaching more rows than the id it was given
    // answers the same row and is invisible to every case above.
    const planted = await plantSources();

    await patchSource(planted.store, planted.items.id, {
      parserConfig: REPLACED_CONFIG,
    });

    const here = await listSources(planted.store, RADAR, WIDE_WINDOW);
    const there = await listSources(planted.store, TRANSIT, WIDE_WINDOW);

    expect(sourceAt(here.rows, RADAR_FEED))
      .toStrictEqual(neverCaptured(planted.feed));
    expect(there.rows).toStrictEqual([neverCaptured(planted.foreign)]);
  });
});

// ---------------------------------------------------------------------------
// What a delete takes
// ---------------------------------------------------------------------------

describe('what a delete takes', () => {
  it('answers nothing and leaves the sibling standing', async () => {
    // The other side of the guard two sections up: a source nothing
    // cites at all, where the whole of what the operation answers
    // is `undefined` and the whole of what it did is read back off
    // the page. The sibling is compared as a WHOLE record — a
    // delete that took the right row and edited the one beside it
    // answers the same page of addresses.
    const planted = await plantSources();

    await expect(deleteSource(planted.store, planted.feed.id))
      .resolves.toBeUndefined();

    const page = await listSources(planted.store, RADAR, WIDE_WINDOW);

    expect(page.rows).toStrictEqual([neverCaptured(planted.items)]);
    expect(page.total).toBe(1);
  });

  it('leaves the second domain reading its own feed', async () => {
    // A delete keyed on anything but the id — the address, the kind
    // — would reach across the two domains, and every count taken
    // inside RADAR alone would still add up.
    const planted = await plantSources();

    await deleteSource(planted.store, planted.feed.id);

    const there = await listSources(planted.store, TRANSIT, WIDE_WINDOW);

    expect(there.rows).toStrictEqual([neverCaptured(planted.foreign)]);
    expect(there.total).toBe(1);
  });

  it('answers 404 to a second delete of the same id', async () => {
    // The row is gone rather than merely unlisted, which no read
    // above can say: a delete that unlinked the row without
    // removing it answers this second call as a success.
    const planted = await plantSources();

    await deleteSource(planted.store, planted.feed.id);

    const refusal = await refusalFrom(
      () => deleteSource(planted.store, planted.feed.id),
    );

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.statusCode).toBe(404);
  });

  it('answers 404 from a patch of the id it took', async () => {
    // The id is unusable by every operation that names one rather
    // than only by the delete that took it: a store dropping the
    // row from its domain's collection while leaving it addressable
    // passes both reads above and answers this patch. It is also
    // where the delete and the retirement above come apart — a
    // module answering a delete by writing `enabled: false` would
    // find a row here.
    const planted = await plantSources();

    await deleteSource(planted.store, planted.feed.id);

    const refusal = await refusalFrom(() => patchSource(
      planted.store,
      planted.feed.id,
      { enabled: true },
    ));

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.statusCode).toBe(404);
  });
});
