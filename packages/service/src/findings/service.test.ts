/**
 * `src/findings/service.ts` — what the two findings reads refuse,
 * what a page carries, and what each refusal is careful not to say.
 * Driven over `tests/helpers/memory-research-store.ts`, so every
 * claim here is answered with no database anywhere.
 *
 * TEN SECTIONS AND THIRTY CASES. Nineteen are about a refusal and
 * eleven about what a read ANSWERS: the scoping, the two filters,
 * the window's two boundaries, and the single get's three embedded
 * lists. What ORDER a findings PAGE comes back in is still another
 * task's half, so every PAGE assertion below reads a membership, a
 * count or a call tally rather than a position. The ordering claims
 * this file does make are over the two EMBEDDED lists a single get
 * carries, whose order the port promises: a finding's rulings and
 * its entity's research, both newest first. The rulings are the one
 * that is load-bearing rather than presentational — the head of
 * that list is the verdict in force.
 *
 * EVERY REFUSAL CASE CARRIES ITS OWN CONTROL, VARIED ALONG THAT
 * ROW'S OWN AXIS. A function refusing everything and a schema
 * refusing every query each pass a refusal case written on its own,
 * so the control has to be in the same case and has to differ from
 * the refused input in exactly the thing under test: the same
 * filter, sort and window under a slug that resolves; the same
 * three-read call under an id that resolves; the same parse under a
 * key the tuple declares; the same two stamps the right way round.
 *
 * AND EVERY POSITIVE CASE CARRIES ONE TOO, on the mirrored
 * reasoning: a block of nothing but accepts is green against a
 * store that narrows nothing and against one that answers
 * everything. Each is the same read varied along its own axis — the
 * other domain's page beside this domain's, the other verdict's
 * page beside this one's, a declared category key beside an
 * undeclared one, the upper bound one millisecond later, and a
 * finding carrying none of the three embedded lists beside the one
 * carrying all of them.
 *
 * THE FIXTURE IS BUILT TO DISCRIMINATE RATHER THAN MERELY TO
 * EXIST, which is where most of the positive cases get their force.
 *
 * The two judged findings carry BOTH verdicts in OPPOSITE ORDER, so
 * which ruling is in force is the only thing separating them: a
 * store matching any label rather than the latest answers both
 * verdict pages with both rows. Each verdict case reads that
 * premise off the store in the same case rather than assuming it.
 *
 * The second domain files a finding under the SAME category key and
 * holds one judged the SAME verdict, so every narrowed page here is
 * a scoping reading as well: a store that had stopped taking the
 * domain answers two rows where one is asserted.
 *
 * The three lists a single get embeds carry THREE DIFFERENT
 * LENGTHS, and a case asserts that they do. Two of them swapped in
 * the assembly is invisible to any reading over equal-length lists,
 * which is exactly the leg the previous revision of this header
 * recorded as reddening nothing.
 *
 * The three findings sit at three different places against one
 * window — one before the lower bound, one exactly on it, one
 * exactly on the upper — so a store closing either bound the other
 * way answers a different pair.
 *
 * THE CLOCK IS FIXED AND ADVANCING. Rulings are stamped off it, so
 * a re-judged finding's two labels carry two instants rather than
 * tying to the microsecond as they would under a wall clock, and
 * the newest-first reading is about `labelled_at` rather than about
 * the `id` tiebreak alone.
 *
 * EVERY POSITIVE PAGE IS READ THROUGH THE COMPOSED SCHEMA rather
 * than through a filter written by hand. {@link pageOf} parses the
 * query a router would have been handed, rebuilds the filter member
 * by member and derives the window, so a narrowing that cannot be
 * BUILT from a query is reported here rather than on the wire.
 *
 * THAT A SLUG NAMING NO DOMAIN IS A 404 RATHER THAN AN EMPTY PAGE.
 * That distinction is the whole reason `listFindings` reads the
 * domain at all: `FindingStore` answers an empty list and a count
 * of `0` for an id no domain carries, both correctly, so a function
 * that skipped the lookup would answer a mistyped slug exactly as
 * it answers a domain whose scoring pass has not run. Two readings
 * make the claim rather than one. The finding reads are never
 * ISSUED, counted off a store that tallies all seven methods, with
 * the same tally taken over a slug that resolves in the same case —
 * a lookup moved below the reads passes the status assertion and
 * fails this one. And findings really PLANTED under a domain id no
 * row carries are still refused, which is the reading that says the
 * 404 comes from the lookup rather than from there being nothing to
 * answer. `getFinding` is held to both readings one function over,
 * where the cost of getting the ordering wrong is three reads
 * rather than two.
 *
 * THAT THE SORT AND THE WINDOW ARE REFUSED AT THE BOUNDARY AND NOT
 * IN THE SERVICE. Every one of those rows is submitted to
 * `parseQuery` over {@link findingListQuerySchema} — the call a
 * router makes — so what is pinned is that no filter, sort or
 * window can be BUILT from a query outside the rules, rather than
 * that something downstream would have caught it. The sort section
 * closes the loop from the other side: every key the tuple declares
 * is parsed and then driven end to end through `listFindings`, so a
 * tuple that had grown a member the port does not take is reported
 * here rather than on the wire.
 *
 * THAT THE COMPOSED QUERY IS WHAT REFUSES AN INVERTED WINDOW, AND
 * NOT THE WINDOW SCHEMA ALONE. `.extend()` carries an object-level
 * check OUTWARDS and never inwards, so a chain built the other way
 * round accepts an inverted window while type-checking and
 * answering every other request identically. The case that reports
 * it submits the two bounds BESIDE every other member this schema
 * declares, which is why it reads as a composition claim rather
 * than as a second copy of `src/http/schemas.test.ts`.
 *
 * THAT NO REFUSAL QUOTES ANYTHING. The containment block counts
 * occurrences of a planted sentinel in each serialised refusal
 * rather than asserting absence, and takes the same count over a
 * planted envelope in the same case — a search that would find
 * nothing anywhere reports a clean refusal and a leaking one alike.
 * The needles are the four things a caller submitted: the slug, the
 * finding id, the sort key, and the two window stamps. Two stored
 * values ride along beside them — a `fields` payload and a
 * sighting's external id, both planted under the missing address —
 * because a refusal composed from a row it had just read would be
 * the leak this rule exists to close.
 *
 * Mutation grid, run whole over this file with `--reporter=json`
 * and read as the failed case SET rather than as a count. Sixteen
 * legs, each measured TWICE — once against HEAD's copy of this file
 * and once at the tip — so what the positive sections bought is a
 * before/after difference rather than a comparison against a figure
 * some header records. Eight legs mutate `./service.ts` and eight
 * mutate `tests/helpers/memory-research-store.ts`, and that split
 * is itself the change: the previous revision could say every leg
 * was a service mutation because nothing here rested on the store's
 * own scoping, filtering or ordering, and now nine cases do.
 *
 * THE SIX CARRIED-IN LEGS THAT ALREADY REDDENED SOMETHING HELD
 * EXACTLY, 19 cases to 30, which is what says the refusal sections
 * were not disturbed. Comparing a resolved row against `undefined`
 * so the branch never fires reddens 8 — three cases in each lookup
 * section plus the two containment cases that go through them.
 * Issuing the reads above the lookup reddens exactly 2, one per
 * counting case, every status assertion being green either way.
 * Reversing the `.extend()` direction reddens 3: both inverted-
 * window cases and the containment case that submits one, since a
 * query no longer refused reaches the helper's own throw.
 * Reordering `FINDING_SORT_KEYS` reddens 1. The two quoting legs
 * redden 1 each, disjoint.
 *
 * THE TWO LEGS THE PREVIOUS REVISION RECORDED AS REDDENING NOTHING
 * ARE CLOSED, each from 0 at HEAD to a set naming its own sections.
 * Dropping the filter from the count read reddens 5: every narrowed
 * page that reads a `total`, which is every one of them except the
 * unjudged-finding case, whose subject is a membership. Swapping
 * two of the single get's three embedded lists reddens 2: the one
 * new single-get case whose finding carries all three, and the
 * refusal section's own positive control, which could not report it
 * while all three lists held one row.
 *
 * TWO IS THAT LEG'S CEILING RATHER THAN A GAP IN IT. The other two
 * single-get cases address findings whose two swapped lists are
 * both EMPTY, so no reading over them can tell the swap from the
 * truth — which is the equal-length trap one step further along,
 * and it cannot be closed without taking those two cases off the
 * states they are there to hold.
 *
 * THE EIGHT STORE LEGS ALL READ 0 AT HEAD, which is the sharpest
 * thing these sections can be said to have bought. Dropping the
 * domain from the findings read reddens 10 against 1 at HEAD, that
 * one being the case which plants findings under a domain id no row
 * carries. Dropping the verdict narrowing reddens 2 and dropping
 * the category narrowing reddens 2. Taking the OLDEST ruling as the
 * one in force reddens 1, and the fixture's opposite-order pair is
 * the only thing that can report it. Closing the upper bound
 * reddens 2 and opening the lower bound reddens 3. Ordering the
 * rulings oldest first reddens 3 — the two single-get cases and the
 * verdict page, which reads the head of that same list — and
 * ordering the research oldest first reddens 1.
 */
import type {
  FindingListQuery,
  FindingPage,
  FindingsServiceStore,
} from './service.js';
import type {
  FindingFilter,
  FindingLabelRecord,
  FindingRecord,
  InsertFindingLabelInput,
} from './store.js';
import type { FieldError } from '../../lib/errors/index.js';
import type {
  MemoryDomainFinding,
  MemoryEntityResearch,
  MemoryFindingSighting,
  MemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';
import type { StoreWindow } from '../http/schemas.js';

import { describe, expect, it } from 'vitest';

import { AppError, NotFoundError } from '../../lib/errors/index.js';
import {
  createMemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';
import { toStoreWindow, toTimeWindow } from '../http/schemas.js';
import { parseQuery } from '../http/validation.js';

import {
  FINDING_SORT_KEYS,
  findingListQuerySchema,
  getFinding,
  listFindings,
} from './service.js';

/** The seeded worked example, and the domain every case stores. */
const RADAR = 'example-tech-radar';

/**
 * A second domain, holding findings of its own.
 *
 * IT FILES ONE UNDER THE SAME CATEGORY KEY AND HOLDS ONE JUDGED THE
 * SAME VERDICT as the domain above, which is what makes every
 * narrowed page here a scoping reading too: a store that had
 * stopped taking the domain answers two rows where each of those
 * cases asserts one.
 */
const SIBLING = 'example-newsroom';

/**
 * A slug shaped like one and carried by no domain in any case here.
 *
 * SENTINEL-SHAPED ON PURPOSE, so the containment block's count of
 * it in a refusal is a reading of the refusal rather than a
 * coincidence of wording. It still satisfies `slugParamSchema`,
 * because what is under test is a slug that PARSED and resolved to
 * nothing, not a segment the boundary would have refused.
 */
const MISSING_SLUG = 'zzsentinelslugzz';

/** An id shaped like one and carried by no finding in any case. */
const MISSING_ID = 9999;

/** A domain id no `domains` row carries, for the plant below. */
const MISSING_DOMAIN_ID = 8888;

/** The entity the attributed finding names. */
const ENTITY_ID = 501;

/**
 * The finding whose LATEST ruling is {@link CONFIRMED}, judged the
 * other way first. The single get addresses this one.
 */
const CONFIRMED_ID = 11;

/**
 * The finding re-judged AWAY from {@link CONFIRMED}: the same two
 * rulings in the opposite order, so recency is the only thing
 * separating it from the row above.
 */
const REJECTED_ID = 12;

/** The finding nobody has judged, and the one attributed to none. */
const UNJUDGED_ID = 13;

/** {@link SIBLING}'s finding, filed under {@link PEOPLE}. */
const SIBLING_FILED_ID = 14;

/** {@link SIBLING}'s finding, judged {@link CONFIRMED}. */
const SIBLING_JUDGED_ID = 15;

/** A sort key shaped like one and outside {@link FINDING_SORT_KEYS}. */
const MISSING_SORT = 'zzsentinelsortzz';

/** A category value planted in a stored `fields` payload. */
const SENTINEL_FIELD = 'zzsentinelfieldzz';

/** A category key two domains here each file one finding under. */
const PEOPLE = 'people';

/**
 * A category key shaped like one and declared by no domain here.
 *
 * Filed under by nothing in either domain, which is the state
 * `FindingFilter.category` answers an empty page for rather than a
 * `404`.
 */
const MISSING_CATEGORY = 'zzsentinelcategoryzz';

/** One of the two verdicts every judged finding here carries. */
const CONFIRMED = 'confirmed';

/** The other, so which is in force is the only difference. */
const REJECTED = 'rejected';

/** Both of them, ascending, for the reads that assert the premise. */
const BOTH_VERDICTS: readonly string[] = [CONFIRMED, REJECTED];

/**
 * The lower bound of every inverted window submitted here.
 *
 * DELIBERATELY OUTSIDE THE SPAN THE FINDINGS WERE MADE IN, so a
 * refusal case and a boundary case cannot be reading the same
 * instant under two names. What this pair is for is the ORDER of
 * two bounds; which rows a bound selects is
 * {@link FIRST_MADE} and its two siblings.
 */
const LATER_STAMP = '2026-04-02T00:00:00.000Z';

/** The upper bound of every inverted window submitted here. */
const EARLIER_STAMP = '2026-04-01T00:00:00.000Z';

/**
 * When {@link CONFIRMED_ID} was made, and the lower bound a
 * half-open window TAKES.
 */
const FIRST_MADE = '2026-03-01T00:00:00.000Z';

/**
 * When {@link REJECTED_ID} was made: inside the first window here
 * and exactly on the lower bound of the second.
 */
const SECOND_MADE = '2026-03-02T00:00:00.000Z';

/**
 * When {@link UNJUDGED_ID} was made, and the upper bound a
 * half-open window DROPS.
 */
const THIRD_MADE = '2026-03-03T00:00:00.000Z';

/**
 * One millisecond past it, and the control for that drop: the same
 * window with its upper bound moved by the smallest step the stamp
 * can carry takes the row back.
 */
const AFTER_THIRD = '2026-03-03T00:00:00.001Z';

/** Where the store's clock starts. */
const CLOCK_START = '2026-03-10T00:00:00.000Z';

/** How far it moves on every reading, in milliseconds. */
const CLOCK_STEP_MS = 60000;

/**
 * A window wider than any page planted here.
 *
 * Wide on purpose, and used by the REFUSAL sections alone: a
 * `limit` narrow enough to be interesting would make each refusal
 * depend on where its rows happened to fall. The positive sections
 * take their window from {@link pageOf}, which derives it from the
 * query the way a router does, so the two halves of this file never
 * share a hand-written one. The case that parses a `perPage` above
 * the schema's ceiling is `src/http/schemas.test.ts`'s.
 */
const WIDE_WINDOW: StoreWindow = { limit: 50, offset: 0 };

/**
 * The filter that narrows nothing: no verdict, no category, and an
 * unbounded window.
 *
 * `window` is REQUIRED and unbounded is two nulls rather than an
 * omitted member, which is what `FindingFilter` declares and what
 * `toTimeWindow` answers for a query carrying neither bound.
 */
const EVERY_FINDING: FindingFilter = {
  window: { sinceInclusive: null, untilExclusive: null },
};

/**
 * The three findings {@link plantFindings} gives {@link RADAR}.
 *
 * PLANTED RATHER THAN WRITTEN, because `FindingStore` declares no
 * insert at all: `src/findings/store.ts` states that the absence IS
 * the read-first rule, so `MemoryResearchStore.setDomainFindings`
 * is the only way this table gets rows and every read below would
 * otherwise answer an empty page.
 *
 * The three differ along every axis a case here narrows on and
 * along no others. One is attributed to an entity and two are not.
 * One carries no score at all. One carries the sentinel category so
 * the containment block has a stored value to look for, one is
 * filed under {@link PEOPLE} and one is filed under nothing. Two
 * are judged and one is not. And their three stamps sit at three
 * different places against the windows below — before the lower
 * bound, exactly on it, exactly on the upper — so a store closing
 * either bound the other way answers a different pair.
 *
 * What the ORDER of them is still belongs to another task, which is
 * why every page assertion below reads a count or a membership
 * rather than a position.
 */
const PLANTED_FINDINGS: readonly MemoryDomainFinding[] = [
  {
    id: CONFIRMED_ID,
    documentId: 1,
    entityId: ENTITY_ID,
    fields: { category: SENTINEL_FIELD },
    score: 0.9,
    scoreVersion: 1,
    createdAt: new Date(FIRST_MADE),
  },
  {
    id: REJECTED_ID,
    documentId: 2,
    entityId: null,
    fields: { category: PEOPLE },
    score: 0.4,
    scoreVersion: 1,
    createdAt: new Date(SECOND_MADE),
  },
  {
    id: UNJUDGED_ID,
    documentId: 3,
    entityId: null,
    fields: {},
    score: null,
    scoreVersion: null,
    createdAt: new Date(THIRD_MADE),
  },
];

/** How many findings {@link plantFindings} gives its domain. */
const PLANTED_COUNT = PLANTED_FINDINGS.length;

/**
 * Their ids, ascending because that is the order they are planted
 * in — which is what {@link idsOf} answers whatever order a page
 * came back in.
 */
const PLANTED_IDS: readonly number[] = PLANTED_FINDINGS.map(
  (row) => row.id,
);

/**
 * The two findings {@link plantFindings} gives {@link SIBLING}.
 *
 * NEITHER IS A COPY OF A ROW ABOVE AND BOTH OVERLAP ONE. The first
 * is filed under {@link PEOPLE}, which {@link REJECTED_ID} is filed
 * under, and is stamped at {@link FIRST_MADE}, which
 * {@link CONFIRMED_ID} carries; the second is judged
 * {@link CONFIRMED}, which {@link CONFIRMED_ID} stands under. So
 * each narrowed page in the sections below has a row in this domain
 * that a store which had stopped scoping would answer with.
 */
const SIBLING_FINDINGS: readonly MemoryDomainFinding[] = [
  {
    id: SIBLING_FILED_ID,
    documentId: 4,
    entityId: null,
    fields: { category: PEOPLE },
    score: 0.7,
    scoreVersion: 1,
    createdAt: new Date(FIRST_MADE),
  },
  {
    id: SIBLING_JUDGED_ID,
    documentId: 5,
    entityId: null,
    fields: {},
    score: 0.2,
    scoreVersion: 1,
    createdAt: new Date(SECOND_MADE),
  },
];

/** How many findings {@link plantFindings} gives {@link SIBLING}. */
const SIBLING_COUNT = SIBLING_FINDINGS.length;

/** Their ids, ascending, on {@link PLANTED_IDS}' terms. */
const SIBLING_IDS: readonly number[] = SIBLING_FINDINGS.map(
  (row) => row.id,
);

/**
 * Where {@link CONFIRMED_ID} has been seen: ONE row, and the
 * shortest of the three lists a single get embeds.
 *
 * THE THREE LENGTHS ARE ONE, TWO AND THREE, DELIBERATELY. Two
 * embedded lists swapped in the assembly is invisible to any
 * reading over lists of equal length, so the fixture is what makes
 * that mistake reportable and a case asserts the three are
 * distinct.
 */
const PLANTED_SIGHTINGS: readonly MemoryFindingSighting[] = [
  {
    id: 21,
    sourceId: 31,
    externalId: 'radar-11',
    seenAt: new Date('2026-03-01T01:00:00.000Z'),
  },
];

/**
 * What research has recorded about {@link ENTITY_ID}: THREE rows,
 * planted OLDEST FIRST, and the longest of the three lists.
 *
 * Reached through the finding rather than named by a case — only
 * {@link CONFIRMED_ID} is attributed, so this is what the other two
 * findings answer an empty list instead of.
 */
const PLANTED_RESEARCH: readonly MemoryEntityResearch[] = [
  {
    id: 41,
    runId: 51,
    summary: 'what a pass made of it',
    payload: { note: 'stored' },
    researchedAt: new Date('2026-03-01T02:00:00.000Z'),
  },
  {
    id: 42,
    runId: 52,
    summary: 'what a later pass added',
    payload: { note: 'added' },
    researchedAt: new Date('2026-03-02T02:00:00.000Z'),
  },
  {
    id: 43,
    runId: null,
    summary: null,
    payload: { note: 'outside a run' },
    researchedAt: new Date('2026-03-03T02:00:00.000Z'),
  },
];

/**
 * The order a read has to answer them in, derived from the plant
 * rather than restated: the rows go in oldest first, so newest
 * first is that list reversed.
 */
const RESEARCH_NEWEST_FIRST: readonly number[] = PLANTED_RESEARCH
  .map((row) => row.id)
  .reverse();

/**
 * Every ruling {@link plantFindings} appends, in the order it
 * appends them.
 *
 * THE TWO JUDGED FINDINGS CARRY BOTH VERDICTS IN OPPOSITE ORDER,
 * which is the whole discriminating power of the verdict section: a
 * store matching ANY label rather than the latest answers both
 * verdict pages with both rows, and one matching the FIRST answers
 * them swapped. Neither is separable from the correct store by a
 * fixture where one finding carries one ruling.
 *
 * APPENDED THROUGH THE PORT rather than planted, because
 * `finding_labels` is the one table in this half a method writes.
 */
const PLANTED_RULINGS: readonly InsertFindingLabelInput[] = [
  { findingId: CONFIRMED_ID, verdict: REJECTED, note: null },
  { findingId: REJECTED_ID, verdict: CONFIRMED, note: null },
  { findingId: CONFIRMED_ID, verdict: CONFIRMED, note: 'read again' },
  { findingId: REJECTED_ID, verdict: REJECTED, note: null },
  { findingId: SIBLING_JUDGED_ID, verdict: CONFIRMED, note: null },
];

/**
 * A clock that moves one step on every reading.
 *
 * FIXED AND ADVANCING RATHER THAN THE WALL CLOCK, which is what
 * makes a ruling's stamp something a case can assert. Two appends
 * inside one millisecond of wall time tie on `labelled_at`, and the
 * newest-first reading would then rest on the `id` tiebreak alone —
 * a true ordering, but not the one this file says it is reading.
 *
 * @returns A clock of its own, so two stores never share a count.
 */
function advancingClock(): () => Date {
  let readings = 0;

  return () => {
    const at = new Date(Date.parse(CLOCK_START) + readings * CLOCK_STEP_MS);

    readings += 1;

    return at;
  };
}

/** Two domains holding findings of their own, and the store. */
interface PlantedDomain {
  /** The store, holding both domains and their five findings. */
  readonly store: MemoryResearchStore;

  /** The id `RADAR` resolved to, for the direct port reads. */
  readonly domainId: number;

  /** The id `SIBLING` resolved to, for the same. */
  readonly siblingId: number;

  /** The id of the finding every single-get case addresses. */
  readonly findingId: number;
}

/**
 * Plants that shape.
 *
 * @returns The store, both domain ids and one finding's id.
 *
 * @remarks
 * THE SECOND DOMAIN IS PLANTED FOR EVERY CASE, including the ones
 * about a refusal, and it is what turns each narrowed page below
 * into a scoping reading as well. Nothing in the refusal sections
 * reads it: those cases page {@link RADAR}, whose own page is
 * unchanged by a domain sitting beside it, which is exactly the
 * claim the first positive section makes.
 */
async function plantFindings(): Promise<PlantedDomain> {
  const store = createMemoryResearchStore({ now: advancingClock() });
  const domain = await store.insertDomain({
    slug: RADAR,
    name: 'Radar',
    settings: {},
  });
  const sibling = await store.insertDomain({
    slug: SIBLING,
    name: 'Newsroom',
    settings: {},
  });

  store.setDomainFindings(domain.id, PLANTED_FINDINGS);
  store.setDomainFindings(sibling.id, SIBLING_FINDINGS);
  store.setFindingSightings(CONFIRMED_ID, PLANTED_SIGHTINGS);
  store.setEntityResearch(ENTITY_ID, PLANTED_RESEARCH);

  for (const ruling of PLANTED_RULINGS) {
    await store.insertFindingLabel(ruling);
  }

  return {
    store,
    domainId: domain.id,
    siblingId: sibling.id,
    findingId: CONFIRMED_ID,
  };
}

/** How many times each read these two functions issue was issued. */
interface ReadCounts {
  /** Lookups of the domain a list path named. */
  findDomainBySlug: number;

  /** Reads of one window of that domain's findings. */
  listFindings: number;

  /** Reads of how many the same filter selects. */
  countFindings: number;

  /** Lookups of the finding a single-get path named. */
  findFindingById: number;

  /** Reads of where one finding has been seen. */
  listFindingSightings: number;

  /** Reads of one finding's rulings. */
  listFindingLabels: number;

  /** Reads of its entity's research. */
  listFindingResearch: number;
}

/** A tally with every member at zero. */
const NO_READS: ReadCounts = {
  findDomainBySlug: 0,
  listFindings: 0,
  countFindings: 0,
  findFindingById: 0,
  listFindingSightings: 0,
  listFindingLabels: 0,
  listFindingResearch: 0,
};

/**
 * The seven-method port with a tally beside it.
 *
 * A COUNTING WRAPPER RATHER THAN A STUB: every call is forwarded to
 * the planted store, so a case reading the tally is reading a call
 * that really happened and really answered. A stub would pin the
 * ordering and lose every other claim in the same case.
 *
 * @param store - Where the calls go.
 * @returns The port to hand the functions, and the tally it fills.
 */
function countingStore(store: MemoryResearchStore): {
  counted: FindingsServiceStore;
  calls: ReadCounts;
} {
  const calls: ReadCounts = { ...NO_READS };
  const counted: FindingsServiceStore = {
    findDomainBySlug(slug) {
      calls.findDomainBySlug += 1;

      return store.findDomainBySlug(slug);
    },
    listFindings(domainId, filter, sort, window) {
      calls.listFindings += 1;

      return store.listFindings(domainId, filter, sort, window);
    },
    countFindings(domainId, filter) {
      calls.countFindings += 1;

      return store.countFindings(domainId, filter);
    },
    findFindingById(id) {
      calls.findFindingById += 1;

      return store.findFindingById(id);
    },
    listFindingSightings(findingId) {
      calls.listFindingSightings += 1;

      return store.listFindingSightings(findingId);
    },
    listFindingLabels(findingId) {
      calls.listFindingLabels += 1;

      return store.listFindingLabels(findingId);
    },
    listFindingResearch(findingId) {
      calls.listFindingResearch += 1;

      return store.listFindingResearch(findingId);
    },
  };

  return { counted, calls };
}

/**
 * Runs a call that has to be refused, and hands the refusal back.
 *
 * @param run - The call.
 * @returns The `AppError` it raised.
 * @throws When the call ANSWERED, so a refusal that quietly stopped
 *   happening fails here — naming the refusal it wanted — rather
 *   than asserting over an error nobody built. Anything that is not
 *   an `AppError` is rethrown unchanged.
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
 * Parses a query the composed schema has to refuse, and hands back
 * the refusal.
 *
 * @param query - The query string members, as Express hands them.
 * @returns The `AppError` the parse raised.
 * @throws When the parse ANSWERED, so a rule that quietly stopped
 *   being enforced fails here rather than leaving a case asserting
 *   over an error nobody built. Anything that is not an `AppError`
 *   is rethrown unchanged.
 */
function refusalFromQuery(query: Record<string, string>): AppError {
  try {
    parseQuery(findingListQuerySchema, query);
  } catch (err) {
    if (err instanceof AppError) {
      return err;
    }

    throw err;
  }

  throw new Error('expected a refused query, and the parse answered');
}

/**
 * The filter a router rebuilds from a parsed query.
 *
 * The two calls a list handler makes between the parse and the
 * service, spelled here so a case can drive the store with a query
 * that really went through {@link findingListQuerySchema} rather
 * than with a filter written by hand.
 *
 * @param query - The parsed query.
 * @returns What `FindingStore` narrows on.
 */
function filterFrom(query: FindingListQuery): FindingFilter {
  return {
    verdict: query.verdict,
    category: query.category,
    window: toTimeWindow(query),
  };
}

/**
 * The two facts a caller reads off each detail of a 422.
 *
 * `message` is not among them: every detail here was built by
 * `src/http/validation.ts`, whose wording is asserted in that
 * module's own file.
 *
 * @param details - `err.details`, absent when nothing built any.
 * @returns One `{ field, code }` per detail, in the order raised.
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

/**
 * @param rows - The page a read answered.
 * @returns The ids in it, ASCENDING, for a membership reading that
 *   says nothing about the order a page came back in — which
 *   belongs to another task.
 */
function idsOf(rows: readonly FindingRecord[]): number[] {
  return [...rows].map((row) => row.id).sort((left, right) => left - right);
}

/**
 * @param rows - Rows a read answered, in the order it answered them.
 * @returns Their ids, ORDER PRESERVED — unlike {@link idsOf}, which
 *   sorts. Used only over the embedded lists, whose order the port
 *   does promise.
 */
function orderedIdsOf(rows: readonly { readonly id: number }[]): number[] {
  return rows.map((row) => row.id);
}

/**
 * @param labels - The rulings a read answered.
 * @returns Their verdicts, in the order they were answered — newest
 *   first, per `FindingStore.listFindingLabels`.
 */
function verdictsOf(labels: readonly FindingLabelRecord[]): string[] {
  return labels.map((row) => row.verdict);
}

/**
 * @param id - A planted finding.
 * @returns When it was made, read off the FIXTURE rather than off a
 *   store, so a window case's boundary is the instant the row
 *   really carries rather than one asserted of it. `undefined` for
 *   an id nothing plants, which fails the assertion it is compared
 *   in.
 */
function madeAt(id: number): Date | undefined {
  return PLANTED_FINDINGS.find((row) => row.id === id)?.createdAt;
}

/**
 * Reads one page the way a router does: parse the query, rebuild
 * the filter member by member, derive the window, call the service.
 *
 * THE COMPOSED SCHEMA IS IN THE PATH OF EVERY POSITIVE PAGE, which
 * is what makes a narrowing here a claim about what can be BUILT
 * from a query rather than about a filter written by hand.
 *
 * @param store - Where the domain and its findings are read.
 * @param slug - The domain to page.
 * @param query - The query string members, as Express hands them.
 * @returns The rows and the size of the narrowed collection.
 */
async function pageOf(
  store: FindingsServiceStore,
  slug: string,
  query: Record<string, string>,
): Promise<FindingPage> {
  const parsed = parseQuery(findingListQuerySchema, query);

  return listFindings(
    store,
    slug,
    filterFrom(parsed),
    parsed.sort,
    toStoreWindow(parsed),
  );
}

// ---------------------------------------------------------------------------
// A slug that names no domain
// ---------------------------------------------------------------------------

describe('a slug that names no domain', () => {
  it('answers 404', async () => {
    const { store } = await plantFindings();
    const refusal = await refusalFrom(() => listFindings(
      store,
      MISSING_SLUG,
      EVERY_FINDING,
      'score',
      WIDE_WINDOW,
    ));

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.code).toBe('NOT_FOUND');
    expect(refusal.statusCode).toBe(404);
    expect(refusal.details).toBeUndefined();
  });

  it('answers a page for a slug that is', async () => {
    // The positive control for the case above, varied along the one
    // axis under test: the same filter, the same sort, the same
    // window, a slug that resolves. A function refusing everything
    // passes the refusal and fails this.
    const { store } = await plantFindings();
    const page = await listFindings(
      store,
      RADAR,
      EVERY_FINDING,
      'score',
      WIDE_WINDOW,
    );

    expect(idsOf(page.rows)).toEqual(PLANTED_IDS);
    expect(page.total).toBe(PLANTED_COUNT);
  });

  it('reads no finding before it refuses', async () => {
    // The ordering claim, which no assertion on the status can
    // make: a lookup moved below the two reads answers the same 404
    // having already scanned the corpus for a domain that is not
    // there. Counted rather than asserted absent, and the control is
    // the same tally taken over a slug that resolves — a wrapper
    // that had stopped counting reports zero for both.
    const { store } = await plantFindings();
    const refused = countingStore(store);

    await refusalFrom(() => listFindings(
      refused.counted,
      MISSING_SLUG,
      EVERY_FINDING,
      'score',
      WIDE_WINDOW,
    ));

    expect(refused.calls).toEqual({ ...NO_READS, findDomainBySlug: 1 });

    const answered = countingStore(store);

    await listFindings(
      answered.counted,
      RADAR,
      EVERY_FINDING,
      'score',
      WIDE_WINDOW,
    );

    expect(answered.calls).toEqual({
      ...NO_READS,
      findDomainBySlug: 1,
      listFindings: 1,
      countFindings: 1,
    });
  });

  it('refuses though findings are planted', async () => {
    // The reading that says the 404 comes from the LOOKUP rather
    // than from there being nothing to answer. The planting seam
    // takes a domain id that names no row on purpose, so this state
    // is reachable: findings really are there, the port answers them
    // to whoever asks it directly, and the refusal is still what a
    // slug naming no domain gets.
    const { store } = await plantFindings();

    store.setDomainFindings(MISSING_DOMAIN_ID, PLANTED_FINDINGS);

    await expect(
      store.countFindings(MISSING_DOMAIN_ID, EVERY_FINDING),
    ).resolves.toBe(PLANTED_COUNT);

    const refusal = await refusalFrom(() => listFindings(
      store,
      MISSING_SLUG,
      EVERY_FINDING,
      'score',
      WIDE_WINDOW,
    ));

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.statusCode).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// An id that names no finding
// ---------------------------------------------------------------------------

describe('an id that names no finding', () => {
  it('answers 404', async () => {
    const { store } = await plantFindings();
    const refusal = await refusalFrom(() => getFinding(store, MISSING_ID));

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.code).toBe('NOT_FOUND');
    expect(refusal.statusCode).toBe(404);
    expect(refusal.details).toBeUndefined();
  });

  it('answers the finding for an id that is', async () => {
    // The positive control, varied along the one axis under test: an
    // id that resolves. What the three embedded lists CARRY is the
    // last section's subject; what this reads is that an id
    // resolving is enough for the four members to be built at all,
    // each at the length its own fixture planted.
    const { store, findingId } = await plantFindings();
    const detail = await getFinding(store, findingId);

    expect(detail.finding.id).toBe(findingId);
    expect(detail.sightings).toHaveLength(PLANTED_SIGHTINGS.length);
    expect(detail.labels).toHaveLength(2);
    expect(detail.research).toHaveLength(PLANTED_RESEARCH.length);
  });

  it('reads no embedded list before it refuses', async () => {
    // The same ordering claim one function over, and it costs three
    // reads rather than two. The control is the same tally over an
    // id that resolves, in the same case.
    const { store, findingId } = await plantFindings();
    const refused = countingStore(store);

    await refusalFrom(() => getFinding(refused.counted, MISSING_ID));

    expect(refused.calls).toEqual({ ...NO_READS, findFindingById: 1 });

    const answered = countingStore(store);

    await getFinding(answered.counted, findingId);

    expect(answered.calls).toEqual({
      ...NO_READS,
      findFindingById: 1,
      listFindingSightings: 1,
      listFindingLabels: 1,
      listFindingResearch: 1,
    });
  });

  it('refuses an id sightings were planted under', async () => {
    // The lookup is what refuses, not the embedded reads. The
    // sightings seam takes an id that names no planted finding on
    // purpose, so rows really are reachable under the missing id and
    // the 404 is still the answer.
    const { store } = await plantFindings();

    store.setFindingSightings(MISSING_ID, [
      {
        id: 22,
        sourceId: 32,
        externalId: SENTINEL_FIELD,
        seenAt: new Date('2026-03-04T00:00:00.000Z'),
      },
    ]);

    await expect(
      store.listFindingSightings(MISSING_ID),
    ).resolves.toHaveLength(1);

    const refusal = await refusalFrom(() => getFinding(store, MISSING_ID));

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.statusCode).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// A sort outside the declared tuple
// ---------------------------------------------------------------------------

describe('a sort outside the declared tuple', () => {
  it('refuses the key at the boundary', async () => {
    const refusal = refusalFromQuery({ sort: MISSING_SORT });

    expect(refusal.code).toBe('VALIDATION_ERROR');
    expect(refusal.statusCode).toBe(422);
    expect(detailsOf(refusal.details as FieldError[] | undefined)).toEqual([
      { field: 'sort', code: 'invalid_value' },
    ]);

    // The control, inside the case and varied along this row's own
    // axis: the same parse with a key the tuple DOES declare. A
    // schema refusing every sort passes the assertions above and
    // fails this one.
    const taken = parseQuery(findingListQuerySchema, {
      sort: FINDING_SORT_KEYS[0],
    });

    expect(taken.sort).toBe(FINDING_SORT_KEYS[0]);
  });

  it('takes every key the tuple declares', async () => {
    // The whole tuple rather than its first member, so a key added
    // to `FINDING_SORT_KEYS` and refused by the schema is reported
    // here rather than discovered on the wire. The fabricated key is
    // asserted absent in the same case, which is what makes the
    // membership above discriminating.
    const parsed = FINDING_SORT_KEYS.map(
      (key) => parseQuery(findingListQuerySchema, { sort: key }).sort,
    );

    expect(parsed).toEqual([...FINDING_SORT_KEYS]);
    expect([...FINDING_SORT_KEYS]).not.toContain(MISSING_SORT);
  });

  it('defaults an absent sort to the first key', async () => {
    // The tuple states its own default by its ORDER, per
    // `sortQuerySchema`, so this reads the tuple rather than a
    // transcribed word: reordering `FINDING_SORT_KEYS` moves both
    // sides of the assertion together and reordering only one of
    // them is what fails.
    const empty = parseQuery(findingListQuerySchema, {});

    expect(empty.sort).toBe(FINDING_SORT_KEYS[0]);
    expect(FINDING_SORT_KEYS[0]).toBe('score');
  });

  it('drives the store with each declared key', async () => {
    // What ties the tuple to the port: every key the schema takes is
    // an ordering `FindingStore.listFindings` accepts, driven end to
    // end over the planted rows. Which ORDER each answers in belongs
    // to another task, so this reads membership and a total.
    const { store } = await plantFindings();

    for (const key of FINDING_SORT_KEYS) {
      const query = parseQuery(findingListQuerySchema, { sort: key });
      const page = await listFindings(
        store,
        RADAR,
        filterFrom(query),
        query.sort,
        toStoreWindow(query),
      );

      expect(idsOf(page.rows)).toEqual(PLANTED_IDS);
      expect(page.total).toBe(PLANTED_COUNT);
    }
  });
});

// ---------------------------------------------------------------------------
// A window that is not ordered
// ---------------------------------------------------------------------------

describe('a window that is not ordered', () => {
  it('refuses a since equal to its until', async () => {
    const refusal = refusalFromQuery({
      since: EARLIER_STAMP,
      until: EARLIER_STAMP,
    });

    expect(refusal.code).toBe('VALIDATION_ERROR');
    expect(refusal.statusCode).toBe(422);
    expect(detailsOf(refusal.details as FieldError[] | undefined)).toEqual([
      { field: 'since', code: 'custom' },
    ]);

    // The control, varied along this row's own axis: the same pair
    // with `until` moved past `since`. A schema refusing every
    // two-bound window passes the assertions above and fails this.
    const taken = parseQuery(findingListQuerySchema, {
      since: EARLIER_STAMP,
      until: LATER_STAMP,
    });

    expect(toTimeWindow(taken).untilExclusive)
      .toEqual(new Date(LATER_STAMP));
  });

  it('refuses a since after its until', async () => {
    // Submitted BESIDE every other member this schema declares,
    // which is the reading that says the composed query refuses
    // rather than the window schema alone. `.extend()` carries an
    // object-level check outwards and not inwards, so a chain built
    // the other way round accepts this and fails nowhere else.
    const refusal = refusalFromQuery({
      since: LATER_STAMP,
      until: EARLIER_STAMP,
      sort: 'recency',
      page: '2',
      perPage: '10',
      category: 'people',
      verdict: 'confirmed',
    });

    expect(refusal.statusCode).toBe(422);
    expect(detailsOf(refusal.details as FieldError[] | undefined)).toEqual([
      { field: 'since', code: 'custom' },
    ]);

    // The control, same members, the two bounds the right way round.
    const taken = parseQuery(findingListQuerySchema, {
      since: EARLIER_STAMP,
      until: LATER_STAMP,
      sort: 'recency',
      page: '2',
      perPage: '10',
      category: 'people',
      verdict: 'confirmed',
    });

    expect(taken.page).toBe(2);
    expect(taken.verdict).toBe('confirmed');
  });

  it('takes either bound alone and neither', async () => {
    // The half-bounded controls, which the two cases above cannot
    // supply: a schema refusing every window carrying ONE bound
    // leaves both of them green, and only these three readings
    // report it. The unbounded one is what `EVERY_FINDING` above is
    // derived from, so it is read here rather than assumed.
    const lower = parseQuery(findingListQuerySchema, {
      since: EARLIER_STAMP,
    });
    const upper = parseQuery(findingListQuerySchema, {
      until: LATER_STAMP,
    });
    const neither = parseQuery(findingListQuerySchema, {});

    expect(toTimeWindow(lower)).toEqual({
      sinceInclusive: new Date(EARLIER_STAMP),
      untilExclusive: null,
    });
    expect(toTimeWindow(upper)).toEqual({
      sinceInclusive: null,
      untilExclusive: new Date(LATER_STAMP),
    });
    expect(toTimeWindow(neither)).toEqual(EVERY_FINDING.window);
  });

  it('refuses an undeclared query parameter', async () => {
    // What says `.strict()` survived three `.extend()` calls. An
    // undeclared parameter is a `422` naming the CONTAINER rather
    // than a narrowing quietly dropped, and the detail names `query`
    // because `src/http/validation.ts` never reads `issue.keys`.
    const refusal = refusalFromQuery({ [MISSING_SORT]: 'anything' });

    expect(refusal.statusCode).toBe(422);
    expect(detailsOf(refusal.details as FieldError[] | undefined)).toEqual([
      { field: 'query', code: 'unrecognized_keys' },
    ]);

    // The control: the same parse with that key removed and every
    // declared one present. A schema refusing every query passes the
    // assertions above and fails this.
    const taken = parseQuery(findingListQuerySchema, {
      since: EARLIER_STAMP,
      sort: 'score',
      page: '1',
    });

    expect(taken.page).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// What a refusal carries
// ---------------------------------------------------------------------------

describe('what a refusal carries', () => {
  it('quotes neither the slug nor a planted finding', async () => {
    const { store } = await plantFindings();

    store.setDomainFindings(MISSING_DOMAIN_ID, PLANTED_FINDINGS);

    const needles = [MISSING_SLUG, SENTINEL_FIELD];
    const refusal = await refusalFrom(() => listFindings(
      store,
      MISSING_SLUG,
      EVERY_FINDING,
      'score',
      WIDE_WINDOW,
    ));
    const answered = JSON.stringify(refusal.toJSON());

    expect(needles.map((needle) => ({
      needle,
      occurrences: countOccurrences(answered, needle),
    }))).toEqual(needles.map((needle) => ({ needle, occurrences: 0 })));

    // The search would find them: a planted envelope carrying both
    // needles is counted by the same function in the same case, so
    // the zeros above are a reading rather than a search that could
    // only ever answer nothing.
    const planted = JSON.stringify({
      code: 'NOT_FOUND',
      message: `no domain ${MISSING_SLUG} filing ${SENTINEL_FIELD}`,
    });

    expect(needles.map((needle) => ({
      needle,
      occurrences: countOccurrences(planted, needle),
    }))).toEqual(needles.map((needle) => ({ needle, occurrences: 1 })));

    // The envelope was built at all: a helper answering an empty
    // string would satisfy every count above.
    expect(answered.length).toBeGreaterThan(0);
    expect(refusal.toJSON().code).toBe(refusal.code);
  });

  it('quotes neither the id nor a planted sighting', async () => {
    const { store } = await plantFindings();

    store.setFindingSightings(MISSING_ID, [
      {
        id: 22,
        sourceId: 32,
        externalId: SENTINEL_FIELD,
        seenAt: new Date('2026-03-04T00:00:00.000Z'),
      },
    ]);

    const needles = [String(MISSING_ID), SENTINEL_FIELD];
    const refusal = await refusalFrom(() => getFinding(store, MISSING_ID));
    const answered = JSON.stringify(refusal.toJSON());

    expect(needles.map((needle) => ({
      needle,
      occurrences: countOccurrences(answered, needle),
    }))).toEqual(needles.map((needle) => ({ needle, occurrences: 0 })));

    const planted = JSON.stringify({
      code: 'NOT_FOUND',
      message: `no finding ${MISSING_ID} seen as ${SENTINEL_FIELD}`,
    });

    expect(needles.map((needle) => ({
      needle,
      occurrences: countOccurrences(planted, needle),
    }))).toEqual(needles.map((needle) => ({ needle, occurrences: 1 })));

    expect(answered.length).toBeGreaterThan(0);
    expect(refusal.toJSON().code).toBe(refusal.code);
  });

  it('quotes neither the sort key nor the window', async () => {
    // The two boundary refusals, whose submitted values are a key a
    // caller chose and two stamps it sent. `src/http/validation.ts`
    // copies the issue's CODE and a fixed sentence and never
    // `issue.message`, in which zod quotes both — so what this reads
    // is that the parse went through that module rather than through
    // a raw `.parse()`.
    const sorted = refusalFromQuery({ sort: MISSING_SORT });
    const windowed = refusalFromQuery({
      since: LATER_STAMP,
      until: EARLIER_STAMP,
    });
    const needles = [MISSING_SORT, LATER_STAMP, EARLIER_STAMP];
    const answered = [sorted, windowed]
      .map((refusal) => JSON.stringify(refusal.toJSON()))
      .join(' ');

    expect(needles.map((needle) => ({
      needle,
      occurrences: countOccurrences(answered, needle),
    }))).toEqual(needles.map((needle) => ({ needle, occurrences: 0 })));

    const planted = JSON.stringify({
      code: 'VALIDATION_ERROR',
      message: `${MISSING_SORT} ${LATER_STAMP} ${EARLIER_STAMP}`,
    });

    expect(needles.map((needle) => ({
      needle,
      occurrences: countOccurrences(planted, needle),
    }))).toEqual(needles.map((needle) => ({ needle, occurrences: 1 })));

    // Both envelopes carry their details, so the zeros above are
    // taken over text that really described the two faults.
    expect(detailsOf(sorted.details as FieldError[] | undefined))
      .toHaveLength(1);
    expect(detailsOf(windowed.details as FieldError[] | undefined))
      .toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// A page scoped to one domain
// ---------------------------------------------------------------------------

describe('a page scoped to one domain', () => {
  it('answers one domain and not the other', async () => {
    // The two pages are each other's control, varied along the one
    // axis under test: a store that had stopped scoping answers all
    // five rows to both, and a store answering nothing fails both.
    // Read as a membership rather than as a position — what order a
    // page comes back in is another task's half.
    const { store } = await plantFindings();
    const radar = await pageOf(store, RADAR, {});
    const sibling = await pageOf(store, SIBLING, {});

    expect(idsOf(radar.rows)).toEqual(PLANTED_IDS);
    expect(radar.total).toBe(PLANTED_COUNT);
    expect(idsOf(sibling.rows)).toEqual(SIBLING_IDS);
    expect(sibling.total).toBe(SIBLING_COUNT);
  });
});

// ---------------------------------------------------------------------------
// A verdict filter
// ---------------------------------------------------------------------------

describe('a verdict filter', () => {
  it('answers the verdict in force on each finding', async () => {
    // THE LATEST AND NOT ANY. Both judged findings carry both
    // verdicts, in opposite order, so which ruling is in force is
    // the only thing separating them: a store matching any label
    // answers both pages with both rows, and one matching the first
    // answers them swapped. The two label reads are that premise
    // MEASURED in the same case rather than assumed — without them
    // the two pages below are satisfied by a fixture where each
    // finding was only ever judged once.
    const { store } = await plantFindings();
    const onConfirmed = await store.listFindingLabels(CONFIRMED_ID);
    const onRejected = await store.listFindingLabels(REJECTED_ID);

    expect([...verdictsOf(onConfirmed)].sort()).toEqual(BOTH_VERDICTS);
    expect([...verdictsOf(onRejected)].sort()).toEqual(BOTH_VERDICTS);

    const confirmed = await pageOf(store, RADAR, { verdict: CONFIRMED });
    const rejected = await pageOf(store, RADAR, { verdict: REJECTED });

    expect(idsOf(confirmed.rows)).toEqual([CONFIRMED_ID]);
    expect(confirmed.total).toBe(1);
    expect(idsOf(rejected.rows)).toEqual([REJECTED_ID]);
    expect(rejected.total).toBe(1);
  });

  it('leaves a finding nobody has judged out', async () => {
    // A finding carrying no ruling has no latest row to read a
    // verdict off, so it matches none a caller can name — which
    // follows from the table rather than being decided. The control
    // is the same finding in the UNFILTERED page: a store that had
    // lost the row entirely satisfies the two absences and fails
    // that one.
    const { store } = await plantFindings();
    const rulings = await store.listFindingLabels(UNJUDGED_ID);
    const confirmed = await pageOf(store, RADAR, { verdict: CONFIRMED });
    const rejected = await pageOf(store, RADAR, { verdict: REJECTED });
    const every = await pageOf(store, RADAR, {});

    expect(rulings).toEqual([]);
    expect(idsOf(confirmed.rows)).not.toContain(UNJUDGED_ID);
    expect(idsOf(rejected.rows)).not.toContain(UNJUDGED_ID);
    expect(idsOf(every.rows)).toContain(UNJUDGED_ID);
  });
});

// ---------------------------------------------------------------------------
// A category filter
// ---------------------------------------------------------------------------

describe('a category filter', () => {
  it('answers the findings filed under the key', async () => {
    // Filed through the `fields.category` member and through
    // nothing else — no column links a finding to a category at
    // all. The other domain files one of its own under the SAME
    // key, and is paged in the same case, so a store that had
    // stopped scoping answers the first page with two rows and
    // fails.
    const { store } = await plantFindings();
    const filed = await pageOf(store, RADAR, { category: PEOPLE });
    const elsewhere = await pageOf(store, SIBLING, { category: PEOPLE });

    expect(idsOf(filed.rows)).toEqual([REJECTED_ID]);
    expect(filed.total).toBe(1);
    expect(idsOf(elsewhere.rows)).toEqual([SIBLING_FILED_ID]);
    expect(elsewhere.total).toBe(1);
  });

  it('answers an empty page for an undeclared key', async () => {
    // An empty page rather than a `404`: nothing failed to read,
    // the domain simply has no finding filed under a category it
    // never named, and a refusal would make the answer depend on
    // the taxonomy in force at the moment of the request rather
    // than on the rows. Two controls sit in the same case — the
    // same domain answers three rows unfiltered and one under a key
    // it does file something under, so a store answering nothing at
    // all fails here.
    const { store } = await plantFindings();
    const missing = await pageOf(store, RADAR, {
      category: MISSING_CATEGORY,
    });
    const declared = await pageOf(store, RADAR, { category: PEOPLE });
    const every = await pageOf(store, RADAR, {});

    expect(missing.rows).toEqual([]);
    expect(missing.total).toBe(0);
    expect(declared.total).toBe(1);
    expect(every.total).toBe(PLANTED_COUNT);
  });
});

// ---------------------------------------------------------------------------
// A half-open window
// ---------------------------------------------------------------------------

describe('a half-open window', () => {
  it('takes the lower bound and drops the upper', async () => {
    // `[sinceInclusive, untilExclusive)`, and both bounds are the
    // instant a planted finding really carries — read off the
    // fixture in the same case, so this is a boundary reading
    // rather than two stamps that happen to sit near some rows. The
    // other domain has a finding stamped at the lower bound too,
    // which a store that had stopped scoping would answer with.
    const { store } = await plantFindings();
    const window = await pageOf(store, RADAR, {
      since: FIRST_MADE,
      until: THIRD_MADE,
    });

    expect(madeAt(CONFIRMED_ID)).toEqual(new Date(FIRST_MADE));
    expect(madeAt(UNJUDGED_ID)).toEqual(new Date(THIRD_MADE));
    expect(idsOf(window.rows)).toEqual([CONFIRMED_ID, REJECTED_ID]);
    expect(window.total).toBe(2);
  });

  it('takes the dropped row when the bound moves', async () => {
    // The control for the drop above, varied along that row's own
    // axis: the same window with its upper bound one millisecond
    // later takes the finding back. Without it the absence above is
    // equally satisfied by a store that had lost the row, by one
    // refusing every window and by one answering an empty page.
    const { store } = await plantFindings();
    const widened = await pageOf(store, RADAR, {
      since: FIRST_MADE,
      until: AFTER_THIRD,
    });

    expect(idsOf(widened.rows)).toEqual(PLANTED_IDS);
    expect(widened.total).toBe(PLANTED_COUNT);
  });

  it('takes a row stamped exactly at the lower bound', async () => {
    // The lower bound read on its own row rather than on the edge
    // of the collection: this window opens exactly where the middle
    // finding was made, so one row sits before it, one exactly on
    // it and one exactly on the upper bound. A store closing either
    // bound the other way answers a different pair.
    const { store } = await plantFindings();
    const window = await pageOf(store, RADAR, {
      since: SECOND_MADE,
      until: THIRD_MADE,
    });

    expect(madeAt(REJECTED_ID)).toEqual(new Date(SECOND_MADE));
    expect(idsOf(window.rows)).toEqual([REJECTED_ID]);
    expect(window.total).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// One finding and what hangs off it
// ---------------------------------------------------------------------------

describe('one finding and what hangs off it', () => {
  it('answers its sightings, rulings and research', async () => {
    // The three lists carry THREE DIFFERENT LENGTHS and the last
    // assertion says so, which is what lets a case tell them apart:
    // two of them swapped in the assembly is invisible to every
    // reading over lists of equal length.
    //
    // Two of the three are read as ORDERS, the port promising both.
    // The research is checked against the plant reversed rather
    // than against a list restated here. The rulings carry their
    // stamps beside their verdicts, because a fixed and advancing
    // clock is what makes newest-first a claim about `labelled_at`
    // rather than about the `id` tiebreak alone.
    const { store, domainId, findingId } = await plantFindings();
    const detail = await getFinding(store, findingId);
    const moments = detail.labels.map((row) => row.labelledAt.getTime());
    const descending = [...moments].sort((left, right) => right - left);
    const lengths = [
      detail.sightings.length,
      detail.labels.length,
      detail.research.length,
    ];

    expect(detail.finding.id).toBe(findingId);
    expect(detail.finding.domainId).toBe(domainId);
    expect(detail.finding.fields).toEqual({ category: SENTINEL_FIELD });

    expect(orderedIdsOf(detail.sightings))
      .toEqual(orderedIdsOf(PLANTED_SIGHTINGS));
    expect(detail.sightings.map((row) => row.findingId))
      .toEqual([findingId]);

    expect(verdictsOf(detail.labels)).toEqual([CONFIRMED, REJECTED]);
    expect(moments).toEqual(descending);
    expect(new Set(moments).size).toBe(moments.length);

    expect(orderedIdsOf(detail.research)).toEqual(RESEARCH_NEWEST_FIRST);
    expect(detail.research.map((row) => row.entityId))
      .toEqual([ENTITY_ID, ENTITY_ID, ENTITY_ID]);

    expect(new Set(lengths).size).toBe(lengths.length);
  });

  it('answers empty lists for a finding carrying none', async () => {
    // Three empty lists beside a finding that is there, which is an
    // ordinary state rather than a failure to read: nobody has
    // judged it, no feed has cited it, and it names no entity to
    // resolve research through. The case above is this one's
    // control — a read answering nothing at all would satisfy every
    // assertion here.
    const { store } = await plantFindings();
    const detail = await getFinding(store, UNJUDGED_ID);

    expect(detail.finding.id).toBe(UNJUDGED_ID);
    expect(detail.finding.entityId).toBeNull();
    expect(detail.sightings).toEqual([]);
    expect(detail.labels).toEqual([]);
    expect(detail.research).toEqual([]);
  });

  it('answers only the lists that finding has', async () => {
    // The mixed state, and what separates the three reads from one
    // another where two equal-length lists could not: this finding
    // carries rulings and nothing else, so a read answering another
    // finding's sightings, or a list taken over the whole store,
    // fails here. Its two verdicts are the reverse of the ones
    // above, which is the same fixture read from its other side.
    const { store } = await plantFindings();
    const detail = await getFinding(store, REJECTED_ID);

    expect(verdictsOf(detail.labels)).toEqual([REJECTED, CONFIRMED]);
    expect(detail.finding.entityId).toBeNull();
    expect(detail.sightings).toEqual([]);
    expect(detail.research).toEqual([]);
  });
});
