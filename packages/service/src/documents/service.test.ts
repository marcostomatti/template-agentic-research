/**
 * `src/documents/service.ts` — what the corpus read REFUSES, and
 * what each refusal is careful not to say. Driven over
 * `tests/helpers/memory-research-store.ts`, so every claim here is
 * answered with no database anywhere.
 *
 * SEVEN SECTIONS AND SEVENTEEN CASES, IN TWO HALVES. The first
 * four sections are the three refusals this surface can raise and
 * their controls: a slug no domain carries, a `parseStatus`
 * outside `DOCUMENT_PARSE_STATUSES`, and a `perPage` above the cap
 * `src/http/schemas.ts` declares. The last three are what a page
 * CARRIES — which rows a narrowing keeps, what the masking takes
 * out of a stored body and a stored error, and where the cap cuts.
 *
 * NO CASE HERE READS THE PAGE'S ORDER, and every reading over more
 * than one row sorts by id first. `capturedAt` descending with
 * `id` descending is `DocumentStore.listDocuments`'s promise and
 * `tests/helpers/memory-research-store.test.ts` is where it is
 * held, so a case about what a body answers cannot fail for an
 * ordering reason and an ordering that broke is reported in one
 * place rather than in two files disagreeing about which.
 *
 * NOTHING HERE READS `url`, WHICH IS AN HONEST ZERO RATHER THAN AN
 * OVERSIGHT. `CorpusDocument.url` is answered AS STORED — a
 * narrower promise than the two members beside it, and one
 * `src/documents/service.ts` records deliberately — so a masking
 * pass widened to cover it would redden nothing in this file. The
 * case that would close it is a planted row whose `url` carries a
 * control byte, asserted answered unchanged.
 *
 * ONLY THE FIRST OF THE THREE IS THIS MODULE'S OWN, and saying so
 * is half of what the file is for. `listDocuments` raises exactly
 * one refusal; the other two are `documentListQuerySchema`
 * refusing a query that never reached a function. So those rows
 * are submitted to `parseQuery` — the call a router makes — and
 * what is pinned is that no filter and no window can be BUILT from
 * a query outside the rules, rather than that something downstream
 * would have caught it.
 *
 * EVERY REFUSAL CASE CARRIES ITS OWN CONTROL, VARIED ALONG THAT
 * ROW'S OWN AXIS. A function refusing everything and a schema
 * refusing every query each pass a refusal case written on its own,
 * so the control has to sit in the same case and has to differ from
 * the refused input in exactly the thing under test: the same
 * filter and window under a slug that resolves; the same parse
 * under a status the tuple declares; the same parse with the
 * `perPage` moved one step back onto the cap.
 *
 * THE CAP IS BRACKETED RATHER THAN ASSERTED, and the pair is read
 * through BOTH schemas in one case. `documentListQuerySchema`
 * extends `paginationQuerySchema` rather than restating its rules,
 * so a ceiling of its own would be a second cap agreeing today; a
 * value at the cap accepted and the next one refused, answered
 * identically by the base schema and by the composed one, is what
 * says there is one ceiling and this file did not bring a second.
 * {@link SHARED_CAP} is transcribed rather than imported, on
 * `src/http/schemas.test.ts`'s terms: the constant is private to
 * that module, and a change to it should redden a case rather than
 * agree silently.
 *
 * THE FIXTURE IS BUILT TO DISCRIMINATE RATHER THAN MERELY TO
 * EXIST. Two domains hold documents, so every page read here is a
 * scoping reading as well and a store that had stopped taking the
 * domain answers five rows where three are asserted. Both parse
 * statuses are planted in each, so a status narrowing has
 * something to leave out on either side. The failure planted in
 * each carries a parse error holding two control characters, so
 * the narrowed page's masking is read off the same rows the
 * refusal sections page. And one document in each carries a NULL
 * `sourceId` — an ingested file, which the failures queue beside
 * this collection structurally cannot hold — so the corpus page is
 * being read over rows that are its own rather than over the
 * queue's.
 *
 * THE THREE BODY SECTIONS BRING A FIXTURE OF THEIR OWN, planted
 * through {@link plantCorpus}, which replaces that corpus and
 * leaves the second domain standing. A cap fixture is four
 * thousand characters long and a masked one is unreadable by eye,
 * so carrying either in the base plant would make every count in
 * the refusal sections depend on a row nothing there is about.
 *
 * THAT A SLUG NAMING NO DOMAIN IS A 404 RATHER THAN AN EMPTY PAGE.
 * That distinction is the whole reason `listDocuments` reads the
 * domain at all: `DocumentStore` answers an empty list and a count
 * of `0` for an id no domain carries, both correctly, so a
 * function that skipped the lookup would answer a mistyped slug
 * exactly as it answers a domain whose first poll has not run. Two
 * readings make the claim rather than one. The document reads are
 * never ISSUED, counted off a store that tallies all three
 * methods, with the same tally taken over a slug that resolves in
 * the same case — a lookup moved below the reads passes the status
 * assertion and fails this one. And documents really PLANTED under
 * a domain id no row carries are still refused, which is the
 * reading that says the 404 comes from the lookup rather than from
 * there being nothing to answer.
 *
 * THAT NO REFUSAL QUOTES ANYTHING, READ PER CHANNEL. An `AppError`
 * can carry a submitted value out through three of them — the
 * message, the details and the CAUSE — and a count taken over the
 * three joined together cannot say which one leaked.
 * {@link leaksIn} renders them separately, and the zeros are read
 * against a planted refusal that leaks through all three, counted
 * by the same helper in the same case: a renderer that ignored
 * `cause` fails on the third member alone. The needles are the two
 * things a caller submitted — the slug, and the two boundary
 * values — and one STORED value rides along beside the first,
 * planted in a body under the missing domain id, because a refusal
 * composed from a row it had just read would be the leak this rule
 * exists to close.
 *
 * THAT A DEFAULT PAGE IS BOTH HALVES AND A NARROWED ONE IS THE
 * ROWS IT NAMES, read as MEMBERSHIP where the partition case
 * above reads it as counts. The two are different claims and the
 * grid says so: inverting the store's narrowing still partitions
 * the corpus and leaves that case green, and narrowing the default
 * page to the parsed half leaves the sums it reads intact. What
 * reports either is a page held row by row against the plant.
 *
 * THAT THE MASKING IS RE-READ RATHER THAN ASSERTED ABSENT.
 * {@link unsafeCodePoints} compares CODE POINTS numerically and
 * shares nothing with the class `src/http/control-bytes.ts` masks
 * by, so it cannot agree with a masking regex however wrong that
 * regex is; every zero it answers is taken beside a positive from
 * the same function in the same case, over the STORED string the
 * answer was built from. A valid astral pair planted beside the
 * lone surrogate is what says only a surrogate standing on its own
 * is masked, which is the `u` flag on that class and nothing else.
 *
 * THAT THE CAP IS BRACKETED ON THE ROW AS WELL AS ON THE QUERY. A
 * body at {@link BODY_CODE_POINT_CAP} and a body one code point
 * past it are planted together, and the longer one answers the
 * shorter one's text — the sharpest available spelling of a cut
 * that takes exactly the overshoot. Both bodies are derived from
 * the exported constant rather than transcribed, and both are
 * marked at the ends, since a body of one repeated character
 * equals every slice of itself of the same length.
 *
 * THAT `bodyBytes` IS THE STORED LENGTH, held apart from two
 * numbers it is easy to answer instead. The long body's tail is
 * NOT ASCII, so its stored bytes exceed its stored code points and
 * both exceed the bytes of what the cut answers — three numbers
 * rather than the two an ASCII fixture can tell apart, and a
 * second derivation of the right one written out as arithmetic
 * beside the `Buffer.byteLength` the module itself calls.
 *
 * Mutation grid, run WHOLE over this file TWICE with
 * `--reporter=json` and read as the failed case SET rather than as
 * a count. The two runs agreed member for member on all EIGHTEEN
 * legs, which is what separates a measurement from a bad capture.
 * Fourteen mutate `./service.ts` and four mutate
 * `tests/helpers/memory-research-store.ts`. Every leg was then run
 * a SECOND time against HEAD's copy of this file — the store being
 * a superset, the older cases never reaching the new plants — so
 * each figure carries the set it had before the body sections
 * existed and every move below is attributed by NAME rather than
 * compared as a number. Nothing was lost on any leg.
 *
 * SIX CARRIED-IN LEGS HELD THEIR SETS EXACTLY. Comparing the
 * resolved row against `undefined` so the 404 branch never fires
 * reddens 4: the three cases of the first section that refuse,
 * plus the containment case that goes through it. Issuing the two
 * reads above the lookup reddens 1, the counting case, every
 * status assertion being green either way. Composing the submitted
 * slug into the refusal message reddens 1. Extending the composed
 * schema with a `perPage` ceiling of its OWN reddens 3 — the
 * bracketing case, the boundary case, and the containment case
 * whose refusal stops being raised. Making that schema loose
 * reddens 1, the undeclared-key case alone. Swapping the enum for
 * `z.string()` reddens 2 and not 3, and the case it leaves green
 * is the honest limit rather than a gap: a looser type still
 * accepts both members of the tuple, so the case that parses each
 * of them cannot tell the two schemas apart.
 *
 * THE CEILING LEG NEEDS A CEILING THAT DIFFERS, which is the one
 * place the leg's spelling changes its answer. A second `perPage`
 * declared with the SAME bounds reddens ZERO — it agrees with the
 * shared one in every request — so the 3 above is measured with
 * the composed ceiling raised. That zero is the state the
 * bracketing case exists to catch the day either number moves, and
 * a grid run with the agreeing spelling records the case as dead.
 *
 * THREE CARRIED-IN LEGS MOVED, EACH BY A NEW CASE READING AN OLD
 * ROUTE. Handing the count read an empty filter reddens 2 where it
 * read 1, and dropping the store's own narrowing predicate the
 * same 2, the added member of each being the narrowed page, which
 * reads its own total. Planting nothing reddens 9 where it read 4,
 * the five added members being the five body cases, every one of
 * which plants.
 *
 * THE PLANT-NOTHING SURVIVORS ARE THE COVERAGE STATEMENT RATHER
 * THAN ITS COUNT. Eight of seventeen stay green, and every one is
 * a case that needs no planted row to make its point: the five
 * boundary parses, the two service refusals that refuse before
 * reading anything, and the containment case over those boundary
 * refusals. A survivor that could not be explained that way would
 * be a case asserting something it does not mean.
 *
 * THE STORE'S NARROWING LEG READ 0 BEFORE THE PARTITION
 * ASSERTIONS EXISTED, and that zero was the case's shape rather
 * than the store's. `page.total` and the port's own count both run
 * through the ONE predicate that leg mutates, so the two
 * derivations agree with each other while both are wrong. What
 * reports is that the two halves PARTITION the corpus — they sum
 * to it and neither is the whole of it — which is a reading no
 * single narrowed page can make.
 *
 * SEVEN LEGS READ 0 AT HEAD AND REPORT HERE, which is what the
 * body sections bought and the sharpest thing this file can say
 * about them. Taking `bodyBytes` off the CUT text reddens 2, and
 * pinning `bodyTruncated` to false reddens the same 2, both cap
 * cases. Composing the two passes the other way round reddens 1,
 * and on the FLAG rather than on the body: masking is idempotent,
 * so a body masked before the cut answers the same text and a
 * `kept` that no longer equals the stored row, which is
 * `bodyTruncated` true for a body nothing was taken from.
 * Answering `parseError` unmasked reddens 1 and answering the body
 * unmasked reddens 1, on different cases. Narrowing the DEFAULT
 * page to the `ok` half reddens 5. And inverting the store's
 * narrowing reddens 1, the narrowed page alone — the partition
 * case beside it stays green, an inverted filter still
 * partitioning the corpus, which is exactly the gap membership was
 * written to close.
 *
 * TWO LEGS READ 0 ON BOTH SIDES AND ARE RECORDED RATHER THAN
 * WIDENED AWAY. Cutting by UTF-16 unit instead of by code point
 * reddens nothing, no body planted here straddling an astral pair:
 * that rule is `takeCodePoints`'s own and is held in
 * `src/http/control-bytes.test.ts`, and planting it here would be
 * a second authority for one function. Masking `url` as well
 * reddens nothing, for the reason the header gives above.
 */
import type {
  CorpusDocument,
  DocumentListQuery,
  DocumentPage,
  DocumentsServiceStore,
} from './service.js';
import type { DocumentFilter } from './store.js';
import type { FieldError } from '../../lib/errors/index.js';
import type {
  MemoryDomainDocument,
  MemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';
import type { StoreWindow } from '../http/schemas.js';

import { describe, expect, it } from 'vitest';

import {
  AppError,
  NotFoundError,
  ValidationError,
} from '../../lib/errors/index.js';
import {
  createMemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';
import { DOCUMENT_PARSE_STATUSES } from '../db/schema/values.js';
import { BODY_CODE_POINT_CAP } from '../http/control-bytes.js';
import { paginationQuerySchema, toStoreWindow } from '../http/schemas.js';
import { parseQuery } from '../http/validation.js';

import {
  documentListQuerySchema,
  listDocuments,
} from './service.js';

/** The seeded worked example, and the domain every case pages. */
const RADAR = 'example-tech-radar';

/**
 * A second domain, holding documents of its own.
 *
 * IT CARRIES BOTH PARSE STATUSES, exactly as the domain above
 * does, which is what makes every page read here a scoping reading
 * too: a store that had stopped taking the domain answers five
 * rows where each of those cases asserts three.
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

/** A domain id no `domains` row carries, for the plant below. */
const MISSING_DOMAIN_ID = 8888;

/**
 * A parse status shaped like one and outside
 * `DOCUMENT_PARSE_STATUSES`.
 *
 * Sentinel-shaped for {@link MISSING_SLUG}'s reason: the
 * containment block counts it in what the boundary refusal
 * carries.
 */
const MISSING_STATUS = 'zzsentinelstatuszz';

/**
 * A value planted in a stored body and in a stored parse error,
 * under a domain id no row carries.
 *
 * WHAT A REFUSAL COMPOSED FROM A ROW IT HAD READ WOULD LEAK. The
 * two masked members are where it would come from, so it is
 * planted in both rather than in whichever one a reader thinks of
 * first.
 */
const SENTINEL_BODY = 'zzsentinelbodyzz';

/**
 * The `perPage` ceiling `src/http/schemas.ts` declares, written
 * down rather than imported.
 *
 * `MAX_PER_PAGE` is private to that module, and
 * `src/http/schemas.test.ts` transcribes it for the same reason
 * this file does: a change to the constant should be a red case
 * somewhere rather than a silent agreement. What THIS file adds is
 * that the pair is read through both schemas, which is what says
 * the composed query inherited the ceiling instead of declaring a
 * second one.
 */
const SHARED_CAP = 200;

/**
 * The two members of `DOCUMENT_PARSE_STATUSES`, destructured rather
 * than respelt.
 *
 * A tuple member and not a string literal, so a member renamed in
 * `src/db/schema/values.ts` moves the fixture with it and a member
 * REMOVED is a `check-types` error here rather than a case
 * asserting about a status the column no longer accepts.
 */
const [OK_STATUS, FAILED_STATUS] = DOCUMENT_PARSE_STATUSES;

/** Builds one character from its code point. */
const charFrom = String.fromCharCode;

/** An ESC, which lets stored text rewrite a terminal. */
const ESC = charFrom(0x1b);

/** A DEL, which `JSON.stringify` passes through as itself. */
const DEL = charFrom(0x7f);

/**
 * The parse error the planted failure carries.
 *
 * IT HOLDS TWO CONTROL CHARACTERS, which is what makes the failed
 * page's masking readable off the file's own base fixture rather
 * than off a corpus planted for it. A message built out of the
 * bytes that broke a parser is the likeliest stored string on this
 * surface to carry one: the two here are the pair
 * `JSON.stringify` would pass through raw, so a response built
 * from an unmasked error carries them onto the wire intact.
 */
const FAILED_ERROR = `unexpected${ESC}end of${DEL}input`;

/** What {@link FAILED_ERROR} must answer as. */
const MASKED_FAILED_ERROR = 'unexpected\\u001bend of\\u007finput';

/** When the oldest planted document was captured. */
const FIRST_CAPTURE = '2026-03-01T00:00:00.000Z';

/** When the next one was. */
const SECOND_CAPTURE = '2026-03-02T00:00:00.000Z';

/** When the newest one was. */
const THIRD_CAPTURE = '2026-03-03T00:00:00.000Z';

/**
 * A window wider than any page planted here.
 *
 * Wide on purpose, and used by the cases that call the service
 * directly: a `limit` narrow enough to be interesting would make
 * each refusal depend on where its rows happened to fall. The
 * cases that go through {@link pageOf} take their window from the
 * parsed query the way a router does, so the two halves of this
 * file never share a hand-written one.
 */
const WIDE_WINDOW: StoreWindow = { limit: 50, offset: 0 };

/**
 * The filter that narrows nothing.
 *
 * AN ABSENT MEMBER IS BOTH STATUSES, per `DocumentFilter`, so the
 * empty object is the whole corpus rather than a filter waiting to
 * be filled in.
 */
const EVERY_DOCUMENT: DocumentFilter = {};

/**
 * The three documents {@link plantDocuments} gives {@link RADAR}.
 *
 * PLANTED RATHER THAN WRITTEN, because `DocumentStore` declares no
 * insert at all: `src/documents/store.ts` states that the absence
 * IS the read-first rule, so
 * `MemoryResearchStore.setDomainDocuments` is the only way this
 * table gets rows and every read below would otherwise answer an
 * empty page.
 *
 * They differ along every axis a case here narrows on. Two parsed
 * and one did not, so a status narrowing has something to leave
 * out. One came through no feed at all, which is the state the
 * failures queue beside this collection has no key to hold. And
 * their three stamps are distinct, so the page's order is a
 * function of the fixture rather than of the order they were
 * planted in — what that order IS belongs to
 * `tests/helpers/memory-research-store.test.ts`, and every
 * assertion in this file reads a membership or a count.
 */
const PLANTED_DOCUMENTS: readonly MemoryDomainDocument[] = [
  {
    id: 101,
    sourceId: 31,
    url: 'https://example.test/one',
    body: 'a captured page',
    parseStatus: OK_STATUS,
    parseError: null,
    capturedAt: new Date(FIRST_CAPTURE),
  },
  {
    id: 102,
    sourceId: null,
    url: null,
    body: 'a body an operator pasted in',
    parseStatus: OK_STATUS,
    parseError: null,
    capturedAt: new Date(SECOND_CAPTURE),
  },
  {
    id: 103,
    sourceId: 31,
    url: 'https://example.test/three',
    body: 'a payload that would not parse',
    parseStatus: FAILED_STATUS,
    parseError: FAILED_ERROR,
    capturedAt: new Date(THIRD_CAPTURE),
  },
];

/** How many documents {@link plantDocuments} gives its domain. */
const PLANTED_COUNT = PLANTED_DOCUMENTS.length;

/**
 * Their ids, ascending because that is the order they are planted
 * in — which is what {@link idsOf} answers whatever order a page
 * came back in.
 */
const PLANTED_IDS: readonly number[] = PLANTED_DOCUMENTS.map(
  (row) => row.id,
);

/**
 * The ids of the planted documents on each side of
 * `documents_parse_status_check`.
 *
 * DERIVED FROM THE FIXTURE rather than written out, so a row that
 * changed sides moves both rosters and no case is left asserting
 * about a split the plant no longer has. Both are non-empty, and
 * the case that narrows says so rather than assuming it.
 */
const FAILED_IDS: readonly number[] = PLANTED_DOCUMENTS
  .filter((row) => row.parseStatus === FAILED_STATUS)
  .map((row) => row.id);

/** The other side of it, on the same terms. */
const PARSED_IDS: readonly number[] = PLANTED_DOCUMENTS
  .filter((row) => row.parseStatus === OK_STATUS)
  .map((row) => row.id);

/**
 * The two documents {@link plantDocuments} gives {@link SIBLING}.
 *
 * ONE OF EACH STATUS, so no narrowed page in this file is narrow
 * because the other domain happened to hold nothing to exclude.
 */
const SIBLING_DOCUMENTS: readonly MemoryDomainDocument[] = [
  {
    id: 201,
    sourceId: 41,
    url: 'https://example.test/sibling',
    body: 'a captured column',
    parseStatus: OK_STATUS,
    parseError: null,
    capturedAt: new Date(FIRST_CAPTURE),
  },
  {
    id: 202,
    sourceId: null,
    url: null,
    body: 'an ingested file that would not parse',
    parseStatus: FAILED_STATUS,
    parseError: 'unexpected token',
    capturedAt: new Date(SECOND_CAPTURE),
  },
];

/** How many documents {@link plantDocuments} gives {@link SIBLING}. */
const SIBLING_COUNT = SIBLING_DOCUMENTS.length;

/**
 * The document planted under {@link MISSING_DOMAIN_ID}, carrying
 * {@link SENTINEL_BODY} in both members this surface masks.
 *
 * Reachable through the port and reachable through no slug, which
 * is what the two cases that read it are each about: the refusal
 * comes from the lookup rather than from an empty corpus, and
 * nothing the lookup refused is quoted back.
 */
const ORPHAN_DOCUMENTS: readonly MemoryDomainDocument[] = [
  {
    id: 301,
    sourceId: null,
    url: null,
    body: `a capture holding ${SENTINEL_BODY}`,
    parseStatus: FAILED_STATUS,
    parseError: `broke on ${SENTINEL_BODY}`,
    capturedAt: new Date(THIRD_CAPTURE),
  },
];

/** Two domains holding documents of their own, and the store. */
interface PlantedCorpus {
  /** The store, holding both domains and their five documents. */
  readonly store: MemoryResearchStore;

  /** The id {@link RADAR} resolved to, for the direct port reads. */
  readonly domainId: number;

  /** The id {@link SIBLING} resolved to, for the same. */
  readonly siblingId: number;
}

/**
 * Plants that shape.
 *
 * @returns The store and the two paged domain ids.
 *
 * @remarks
 * BOTH DOMAINS ARE PLANTED FOR EVERY CASE, including the ones
 * about a refusal, and that is what turns each page below into a
 * scoping reading as well. The orphan rows are NOT planted here:
 * only two cases want them, and a fixture carrying rows under an
 * id no domain has would make every count in this file depend on a
 * state that is deliberately unreachable.
 */
async function plantDocuments(): Promise<PlantedCorpus> {
  const store = createMemoryResearchStore();
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

  store.setDomainDocuments(domain.id, PLANTED_DOCUMENTS);
  store.setDomainDocuments(sibling.id, SIBLING_DOCUMENTS);

  return { store, domainId: domain.id, siblingId: sibling.id };
}

/** What a case planting a BODY says about the row it plants. */
interface PlantedBody {
  /** `documents.id`, which every reading below sorts by. */
  readonly id: number;

  /** The stored text, unmasked and uncut. */
  readonly body: string;
}

/**
 * One planted document whose only interesting member is its body.
 *
 * @param row - The id and the stored text.
 * @returns A parsed capture that came through no feed and carries
 *   no error and no url — every member the body sections do not
 *   read set to the state that says they do not read it.
 */
function capturedDocument(row: PlantedBody): MemoryDomainDocument {
  return {
    id: row.id,
    sourceId: null,
    url: null,
    body: row.body,
    parseStatus: OK_STATUS,
    parseError: null,
    capturedAt: new Date(FIRST_CAPTURE),
  };
}

/**
 * Replaces {@link RADAR}'s corpus with rows of a case's own,
 * leaving the rest of the fixture standing.
 *
 * REPLACED RATHER THAN PLANTED INTO A BARE STORE, so the sibling
 * domain goes on holding documents of its own and every page read
 * through this is a scoping reading too: a store that had stopped
 * taking the domain answers rows no case here asserts.
 *
 * The base corpus discriminates along the axes the refusal
 * sections narrow on. The body sections narrow on what a stored
 * string HOLDS, which is a different fixture rather than a wider
 * one — a cap fixture carried by every case would make each count
 * in this file depend on a body four thousand characters long.
 *
 * @param documents - What {@link RADAR} holds instead.
 * @returns The store, its other domain untouched.
 */
async function plantCorpus(
  documents: readonly MemoryDomainDocument[],
): Promise<MemoryResearchStore> {
  const { store, domainId } = await plantDocuments();

  store.setDomainDocuments(domainId, documents);

  return store;
}

/** How many times each read this function issues was issued. */
interface ReadCounts {
  /** Lookups of the domain the list path named. */
  findDomainBySlug: number;

  /** Reads of one window of that domain's corpus. */
  listDocuments: number;

  /** Reads of how many the same filter selects. */
  countDocuments: number;
}

/** A tally with every member at zero. */
const NO_READS: ReadCounts = {
  findDomainBySlug: 0,
  listDocuments: 0,
  countDocuments: 0,
};

/**
 * The three-method port with a tally beside it.
 *
 * A COUNTING WRAPPER RATHER THAN A STUB: every call is forwarded to
 * the planted store, so a case reading the tally is reading a call
 * that really happened and really answered. A stub would pin the
 * ordering and lose every other claim in the same case.
 *
 * @param store - Where the calls go.
 * @returns The port to hand the function, and the tally it fills.
 */
function countingStore(store: MemoryResearchStore): {
  counted: DocumentsServiceStore;
  calls: ReadCounts;
} {
  const calls: ReadCounts = { ...NO_READS };
  const counted: DocumentsServiceStore = {
    findDomainBySlug(slug) {
      calls.findDomainBySlug += 1;

      return store.findDomainBySlug(slug);
    },
    listDocuments(domainId, filter, window) {
      calls.listDocuments += 1;

      return store.listDocuments(domainId, filter, window);
    },
    countDocuments(domainId, filter) {
      calls.countDocuments += 1;

      return store.countDocuments(domainId, filter);
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
    parseQuery(documentListQuerySchema, query);
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
 * Spelled here so a case can drive the store with a query that
 * really went through {@link documentListQuerySchema} rather than
 * with a filter written by hand.
 *
 * @param query - The parsed query.
 * @returns What `DocumentStore` narrows on.
 */
function filterFrom(query: DocumentListQuery): DocumentFilter {
  return { parseStatus: query.parseStatus };
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
 * Renders an error's `cause` into text a search can read.
 *
 * @param cause - `err.cause`, which is `unknown` by declaration.
 * @returns The name, the message and the stack for an `Error`; the
 *   serialised value otherwise; and the empty string when there is
 *   no cause. The STACK is in it deliberately: a driver error's own
 *   message is repeated there, so a channel that read only
 *   `cause.message` would miss the copy underneath it.
 */
function renderCause(cause: unknown): string {
  if (cause === undefined) {
    return '';
  }

  if (cause instanceof Error) {
    return [cause.name, cause.message, cause.stack ?? ''].join(' ');
  }

  return JSON.stringify(cause) ?? String(cause);
}

/**
 * The three channels a refusal could carry a submitted value out
 * through, rendered separately.
 *
 * SEPARATELY RATHER THAN JOINED, so a count of zero in each is
 * three readings and a leak names the channel it came through. The
 * order is fixed: the message, the details, the cause.
 *
 * @param err - The refusal.
 * @returns The three renderings.
 */
function channelsOf(err: AppError): string[] {
  return [
    err.message,
    JSON.stringify(err.details ?? null),
    renderCause(err.cause),
  ];
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
 * @param err - The refusal.
 * @param needle - The string that must not be in it.
 * @returns One count per channel, in {@link channelsOf}'s order.
 */
function leaksIn(err: AppError, needle: string): number[] {
  return channelsOf(err).map((text) => countOccurrences(text, needle));
}

/**
 * @param rows - The page a read answered.
 * @returns The ids in it, ASCENDING, for a membership reading that
 *   says nothing about the order a page came back in. What that
 *   order is belongs to the store's own file, and reading it here
 *   would make a case about a refusal or a body able to fail for
 *   an ordering reason.
 */
function idsOf(rows: readonly CorpusDocument[]): number[] {
  return [...rows].map((row) => row.id).sort((left, right) => left - right);
}

/** The two members every status reading below is taken over. */
interface StatusRow {
  /** `documents.id`. */
  readonly id: number;

  /** Which side of the check the row sits on. */
  readonly parseStatus: string;
}

/**
 * @param rows - A page, or the rows a page was planted from.
 * @returns One `{ id, parseStatus }` per row, ASCENDING BY ID for
 *   {@link idsOf}'s reason: what the page's order IS belongs to
 *   `DocumentStore.listDocuments` and is held in the store's own
 *   file, so a case about which rows a page carries must not be
 *   able to fail for an ordering reason.
 *
 * @remarks
 * Structural rather than typed to either shape, so a planted
 * {@link MemoryDomainDocument} and an answered
 * {@link CorpusDocument} go through one reader and the comparison
 * is between two renderings of one fact.
 */
function statusesById(rows: readonly StatusRow[]): StatusRow[] {
  return [...rows]
    .map((row) => ({ id: row.id, parseStatus: row.parseStatus }))
    .sort((left, right) => left.id - right.id);
}

/**
 * Every code point a response must not carry raw: C0, DEL, C1 and
 * both surrogate ranges.
 *
 * @param text - The text to read, decoded rather than scanned as
 *   UTF-16 units: `[...text]` walks CODE POINTS, so a valid astral
 *   pair arrives as one element above U+FFFF and only a surrogate
 *   standing on its own is ever in the range below.
 * @returns The offending code points in the order they occur, so a
 *   zero can be read against a known positive taken by this same
 *   function in the same case.
 *
 * @remarks
 * A SECOND READER RATHER THAN THE MODULE'S OWN CLASS. Numeric
 * comparisons rather than a pattern, so this cannot agree with a
 * masking regex however wrong that regex is — the whole value of
 * re-reading an output is that the reader shares nothing with
 * whatever wrote it. `src/sources/failures-service.test.ts` keeps
 * the same reader over the same two members of the same table,
 * spelled again rather than shared for the reason every refusal
 * message on this surface is: two collections agreeing about a
 * mask because one imported the other's test helper would leave
 * neither able to report the day the other moved.
 */
function unsafeCodePoints(text: string): number[] {
  return [...text]
    .map((character) => character.codePointAt(0) ?? 0)
    .filter((code) => code <= 0x1f
      || (code >= 0x7f && code <= 0x9f)
      || (code >= 0xd800 && code <= 0xdfff));
}

/**
 * Reads one page the way a router does: parse the query, rebuild
 * the filter member by member, derive the window, call the
 * service.
 *
 * THE COMPOSED SCHEMA IS IN THE PATH OF EVERY PAGE READ THROUGH
 * THIS, which is what makes a narrowing here a claim about what can
 * be BUILT from a query rather than about a filter written by hand.
 *
 * @param store - Where the domain and its documents are read.
 * @param slug - The domain to page.
 * @param query - The query string members, as Express hands them.
 * @returns The rows and the size of the narrowed collection.
 */
async function pageOf(
  store: DocumentsServiceStore,
  slug: string,
  query: Record<string, string>,
): Promise<DocumentPage> {
  const parsed = parseQuery(documentListQuerySchema, query);

  return listDocuments(
    store,
    slug,
    filterFrom(parsed),
    toStoreWindow(parsed),
  );
}

// ---------------------------------------------------------------------------
// A slug that names no domain
// ---------------------------------------------------------------------------

describe('a slug that names no domain', () => {
  it('answers 404', async () => {
    const { store } = await plantDocuments();
    const refusal = await refusalFrom(() => listDocuments(
      store,
      MISSING_SLUG,
      EVERY_DOCUMENT,
      WIDE_WINDOW,
    ));

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.code).toBe('NOT_FOUND');
    expect(refusal.statusCode).toBe(404);
    expect(refusal.details).toBeUndefined();
  });

  it('answers a page for a slug that is', async () => {
    // The positive control for the case above, varied along the one
    // axis under test: the same filter, the same window, a slug
    // that resolves. A function refusing everything passes the
    // refusal and fails this. Read as a membership and a count, so
    // it cannot fail for an ordering reason.
    const { store } = await plantDocuments();
    const page = await listDocuments(
      store,
      RADAR,
      EVERY_DOCUMENT,
      WIDE_WINDOW,
    );

    expect(idsOf(page.rows)).toEqual([...PLANTED_IDS]);
    expect(page.total).toBe(PLANTED_COUNT);

    // And the other domain answers its own rows, which is what
    // makes the count above a scoping reading rather than a tally
    // of everything planted: a store that had stopped taking the
    // domain answers five to both of these.
    const sibling = await listDocuments(
      store,
      SIBLING,
      EVERY_DOCUMENT,
      WIDE_WINDOW,
    );

    expect(sibling.total).toBe(SIBLING_COUNT);
    expect(idsOf(sibling.rows)).not.toEqual(idsOf(page.rows));
  });

  it('reads no document before it refuses', async () => {
    // The ordering claim, which no assertion on the status can
    // make: a lookup moved below the two reads answers the same 404
    // having already scanned the corpus for a domain that is not
    // there. Counted rather than asserted absent, and the control
    // is the same tally taken over a slug that resolves — a
    // wrapper that had stopped counting reports zero for both.
    const { store } = await plantDocuments();
    const refused = countingStore(store);

    await refusalFrom(() => listDocuments(
      refused.counted,
      MISSING_SLUG,
      EVERY_DOCUMENT,
      WIDE_WINDOW,
    ));

    expect(refused.calls).toEqual({ ...NO_READS, findDomainBySlug: 1 });

    const answered = countingStore(store);

    await listDocuments(
      answered.counted,
      RADAR,
      EVERY_DOCUMENT,
      WIDE_WINDOW,
    );

    expect(answered.calls).toEqual({
      ...NO_READS,
      findDomainBySlug: 1,
      listDocuments: 1,
      countDocuments: 1,
    });
  });

  it('refuses though documents are planted', async () => {
    // The reading that says the 404 comes from the LOOKUP rather
    // than from there being nothing to answer. The planting seam
    // takes a domain id that names no row on purpose, so this state
    // is reachable: documents really are there, the port answers
    // them to whoever asks it directly, and the refusal is still
    // what a slug naming no domain gets.
    const { store } = await plantDocuments();

    store.setDomainDocuments(MISSING_DOMAIN_ID, ORPHAN_DOCUMENTS);

    await expect(
      store.countDocuments(MISSING_DOMAIN_ID, EVERY_DOCUMENT),
    ).resolves.toBe(ORPHAN_DOCUMENTS.length);

    const refusal = await refusalFrom(() => listDocuments(
      store,
      MISSING_SLUG,
      EVERY_DOCUMENT,
      WIDE_WINDOW,
    ));

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.statusCode).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// A parse status outside the tuple
// ---------------------------------------------------------------------------

describe('a parse status outside the tuple', () => {
  it('refuses the status at the boundary', () => {
    // Refused by the SCHEMA and not by the service: the value never
    // reaches a function, which is why this row is submitted to
    // `parseQuery` rather than driven through `listDocuments`. An
    // enum answers `invalid_value` naming the parameter, where a
    // status passed through would have answered an empty page.
    const refusal = refusalFromQuery({ parseStatus: MISSING_STATUS });

    expect(refusal).toBeInstanceOf(ValidationError);
    expect(refusal.code).toBe('VALIDATION_ERROR');
    expect(refusal.statusCode).toBe(422);
    expect(detailsOf(refusal.details as FieldError[] | undefined)).toEqual([
      { field: 'parseStatus', code: 'invalid_value' },
    ]);

    // The control, inside the case and varied along this row's own
    // axis: the same parse with a status the tuple DOES declare. A
    // schema refusing every status passes the assertions above and
    // fails this one.
    const taken = parseQuery(documentListQuerySchema, {
      parseStatus: FAILED_STATUS,
    });

    expect(taken.parseStatus).toBe(FAILED_STATUS);
  });

  it('takes every member the tuple declares', () => {
    // The whole tuple rather than one member of it, so a status
    // added to `DOCUMENT_PARSE_STATUSES` and refused by the schema
    // is reported here rather than discovered on the wire. The
    // fabricated value is asserted absent in the same case, which
    // is what makes the membership above discriminating.
    const parsed = DOCUMENT_PARSE_STATUSES.map(
      (status) => parseQuery(documentListQuerySchema, {
        parseStatus: status,
      }).parseStatus,
    );

    expect(parsed).toEqual([...DOCUMENT_PARSE_STATUSES]);
    expect([...DOCUMENT_PARSE_STATUSES]).not.toContain(MISSING_STATUS);
  });

  it('drives the store with each declared member', async () => {
    // What ties the tuple to the port: every status the schema
    // takes is a narrowing `DocumentStore` accepts, driven end to
    // end over the planted rows. WHICH rows each answers is
    // `what a page carries` below, so this reads a total against
    // the port asked the same question directly — two derivations
    // of one narrowing rather than a number written out here.
    const { store, domainId } = await plantDocuments();
    const halves = await Promise.all(DOCUMENT_PARSE_STATUSES.map(
      async (status) => ({
        page: await pageOf(store, RADAR, { parseStatus: status }),
        counted: await store.countDocuments(domainId, {
          parseStatus: status,
        }),
      }),
    ));

    expect(halves.map((half) => half.page.total))
      .toEqual(halves.map((half) => half.counted));
    expect(halves.map((half) => half.page.rows.length))
      .toEqual(halves.map((half) => half.counted));

    // And each narrowing really narrowed. Both readings above run
    // through the store's ONE predicate, so a predicate answering
    // true for every row satisfies them together; what it cannot
    // satisfy is a PARTITION. The two halves sum to the corpus and
    // neither is the whole of it — a shape rather than a list of
    // ids, WHICH rows land on each side being read below.
    const whole = await pageOf(store, RADAR, {});
    const totals = halves.map((half) => half.page.total);

    expect(whole.total).toBe(PLANTED_COUNT);
    expect(totals.reduce((left, right) => left + right))
      .toBe(PLANTED_COUNT);
    expect(totals.every((total) => total < PLANTED_COUNT)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// A perPage above the shared cap
// ---------------------------------------------------------------------------

describe('a perPage above the shared cap', () => {
  it('refuses a perPage one past the cap', () => {
    // Refused at the boundary for the status's reason: a window is
    // a rule about the QUERY, and `listDocuments` re-checks no
    // bound. `too_big` naming the parameter is what a caller reads.
    const refusal = refusalFromQuery({ perPage: String(SHARED_CAP + 1) });

    expect(refusal).toBeInstanceOf(ValidationError);
    expect(refusal.statusCode).toBe(422);
    expect(detailsOf(refusal.details as FieldError[] | undefined)).toEqual([
      { field: 'perPage', code: 'too_big' },
    ]);

    // The control, varied along this row's own axis by one step:
    // the same parse with the value moved back onto the cap. A
    // schema refusing every `perPage` passes the assertions above
    // and fails this one.
    const taken = parseQuery(documentListQuerySchema, {
      perPage: String(SHARED_CAP),
    });

    expect(taken.perPage).toBe(SHARED_CAP);
  });

  it('reads the ceiling the shared schema sets', () => {
    // The cap is INHERITED rather than re-declared, and this is the
    // reading that says so: the same bracketing pair answered
    // identically by `paginationQuerySchema` and by the composed
    // one. A second ceiling agreeing today would pass the case
    // above and fail this the day either moved.
    const bracket = [SHARED_CAP, SHARED_CAP + 1].map(String);
    const shared = bracket.map(
      (perPage) => paginationQuerySchema.safeParse({ perPage }).success,
    );
    const composed = bracket.map(
      (perPage) => documentListQuerySchema.safeParse({ perPage }).success,
    );

    expect(shared).toEqual([true, false]);
    expect(composed).toEqual(shared);
  });

  it('refuses an undeclared query parameter', () => {
    // What says `.strict()` survived the `.extend()`. An undeclared
    // parameter is a `422` naming the CONTAINER rather than a
    // narrowing quietly dropped, and the detail names `query`
    // because `src/http/validation.ts` never reads `issue.keys`.
    const refusal = refusalFromQuery({ [MISSING_STATUS]: 'anything' });

    expect(refusal.statusCode).toBe(422);
    expect(detailsOf(refusal.details as FieldError[] | undefined)).toEqual([
      { field: 'query', code: 'unrecognized_keys' },
    ]);

    // The control: the same parse with that key removed and every
    // declared one present. A schema refusing every query passes
    // the assertions above and fails this.
    const taken = parseQuery(documentListQuerySchema, {
      page: '1',
      perPage: String(SHARED_CAP),
      parseStatus: OK_STATUS,
    });

    expect(taken.page).toBe(1);
    expect(taken.parseStatus).toBe(OK_STATUS);
  });
});

// ---------------------------------------------------------------------------
// What a refusal carries
// ---------------------------------------------------------------------------

describe('what a refusal carries', () => {
  it('quotes neither the slug nor a planted body', async () => {
    // Counted per CHANNEL rather than over a joined blob, so a leak
    // names the channel it came through. The stored needle rides
    // along beside the submitted one because a refusal composed
    // from a row it had just read is the other half of this rule.
    const { store } = await plantDocuments();

    store.setDomainDocuments(MISSING_DOMAIN_ID, ORPHAN_DOCUMENTS);

    // The stored needle is really REACHABLE, which is what makes
    // its zero a reading rather than a search for something no row
    // carries. Read off the port directly, the rows sitting under
    // an id no slug resolves to.
    const orphans = await store.listDocuments(
      MISSING_DOMAIN_ID,
      EVERY_DOCUMENT,
      WIDE_WINDOW,
    );

    expect(orphans.map((row) => row.body).join(' '))
      .toContain(SENTINEL_BODY);

    const needles = [MISSING_SLUG, SENTINEL_BODY];
    const refusal = await refusalFrom(() => listDocuments(
      store,
      MISSING_SLUG,
      EVERY_DOCUMENT,
      WIDE_WINDOW,
    ));

    expect(needles.map((needle) => leaksIn(refusal, needle)))
      .toEqual(needles.map(() => [0, 0, 0]));

    // The search would find them: a planted refusal leaking through
    // all three channels is counted by the same helper in the same
    // case, so the zeros above are a reading rather than a search
    // that could only ever answer nothing. A renderer that ignored
    // `cause` fails on the third member alone.
    const planted = new ValidationError(
      `refused ${MISSING_SLUG}, which filed ${SENTINEL_BODY}`,
      [{
        field: 'slug',
        message: `no domain ${MISSING_SLUG} filing ${SENTINEL_BODY}`,
        code: 'custom',
      }],
      { cause: new Error(`${MISSING_SLUG} held ${SENTINEL_BODY}`) },
    );

    expect(needles.map((needle) => leaksIn(planted, needle)
      .map((count) => count > 0)))
      .toEqual(needles.map(() => [true, true, true]));

    // And the refusal was built at all: a helper answering the
    // empty string would satisfy every zero above.
    expect(refusal.message.length).toBeGreaterThan(0);
    expect(refusal.toJSON().code).toBe(refusal.code);
  });

  it('quotes neither the status nor the window', async () => {
    // The two boundary refusals, whose submitted values are a
    // status a caller chose and a number it sent.
    // `src/http/validation.ts` copies the issue's CODE and a fixed
    // sentence and never `issue.message`, in which zod quotes both
    // — so what this reads is that the parse went through that
    // module rather than through a raw `.parse()`.
    const overCap = String(SHARED_CAP + 1);
    const refusals = [
      refusalFromQuery({ parseStatus: MISSING_STATUS }),
      refusalFromQuery({ perPage: overCap }),
    ];
    const needles = [MISSING_STATUS, overCap];

    expect(refusals.flatMap(
      (refusal) => needles.map((needle) => leaksIn(refusal, needle)),
    )).toEqual(refusals.flatMap(() => needles.map(() => [0, 0, 0])));

    const planted = new ValidationError(
      `refused ${MISSING_STATUS} at ${overCap}`,
      [{
        field: 'parseStatus',
        message: `not ${MISSING_STATUS}, and not ${overCap}`,
        code: 'invalid_value',
      }],
      { cause: new Error(`saw ${MISSING_STATUS} and ${overCap}`) },
    );

    expect(needles.map((needle) => leaksIn(planted, needle)
      .map((count) => count > 0)))
      .toEqual(needles.map(() => [true, true, true]));

    // Both envelopes carry their details, so the zeros above are
    // taken over text that really described the two faults.
    expect(refusals.map(
      (refusal) => detailsOf(refusal.details as FieldError[] | undefined),
    ).map((details) => details.length)).toEqual([1, 1]);
  });
});

// ---------------------------------------------------------------------------
// What a page carries
// ---------------------------------------------------------------------------

describe('what a page carries', () => {
  it('carries both parse statuses when nothing narrows', async () => {
    // A failed document is IN the corpus rather than behind a
    // flag, so the default page is the whole of it. Read ROW BY
    // ROW rather than as a total: a page quietly serving the `ok`
    // half alone still answers a total that adds up against a
    // count taken through the same predicate, which is the shape
    // the partition case above exists to work around.
    const { store } = await plantDocuments();
    const page = await pageOf(store, RADAR, {});

    expect(statusesById(page.rows))
      .toEqual(statusesById(PLANTED_DOCUMENTS));
    expect(page.total).toBe(PLANTED_COUNT);

    // Both members of the tuple are really on it, stated against
    // `DOCUMENT_PARSE_STATUSES` rather than against two literals —
    // and the FIXTURE is asserted able to report that in the same
    // case, since a page holding one status is green against a
    // corpus that only ever held one.
    const onPage = new Set(page.rows.map((row) => row.parseStatus));

    expect(onPage).toEqual(new Set(DOCUMENT_PARSE_STATUSES));
    expect(new Set(PLANTED_DOCUMENTS.map((row) => row.parseStatus)))
      .toEqual(onPage);

    // And the sibling answers its own rows, both statuses again,
    // over ids this page does not hold: the reading stays a
    // scoping one, so a store that had stopped taking the domain
    // answers five rows where three are asserted.
    const sibling = await pageOf(store, SIBLING, {});

    expect(statusesById(sibling.rows))
      .toEqual(statusesById(SIBLING_DOCUMENTS));
    expect(idsOf(sibling.rows)).not.toEqual(idsOf(page.rows));
  });

  it('narrows to failures and masks the error each carries', async () => {
    // Two claims over one page and neither is the other's. WHICH
    // rows a narrowing keeps — the partition case above reads the
    // two halves as counts and says nothing about membership — and
    // what the masking does to the member a failed row is the most
    // likely of any to carry a control byte in.
    const { store } = await plantDocuments();
    const page = await pageOf(store, RADAR, {
      parseStatus: FAILED_STATUS,
    });

    expect(idsOf(page.rows)).toEqual([...FAILED_IDS]);
    expect(page.total).toBe(FAILED_IDS.length);
    expect(page.rows.map((row) => row.parseStatus))
      .toEqual(FAILED_IDS.map(() => FAILED_STATUS));
    expect(page.rows.map((row) => row.parseError))
      .toEqual(FAILED_IDS.map(() => MASKED_FAILED_ERROR));

    // Re-read rather than asserted absent, and against a positive
    // taken by the same reader in the same case: the STORED error
    // carries exactly the two code points and the answered one
    // carries neither. A search that could only ever answer
    // nothing reports a masked error and an unmasked one alike.
    const [failed] = page.rows;

    expect(unsafeCodePoints(failed?.parseError ?? '')).toEqual([]);
    expect(unsafeCodePoints(FAILED_ERROR)).toEqual([0x1b, 0x7f]);

    // The complement, which is what makes `only failures` a
    // reading rather than a page that happened to be short: the
    // other half is really there, this page left it out, and every
    // row of it carries no error for the mask to have written.
    const parsed = await pageOf(store, RADAR, {
      parseStatus: OK_STATUS,
    });

    expect(idsOf(parsed.rows)).toEqual([...PARSED_IDS]);
    expect(parsed.rows.map((row) => row.parseError))
      .toEqual(PARSED_IDS.map(() => null));
    expect(PARSED_IDS.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// What the masking takes out
// ---------------------------------------------------------------------------

/** A NUL, which silences a diff and a grep of whatever holds it. */
const NUL = charFrom(0x00);

/**
 * A high surrogate standing on its own.
 *
 * A STORED BODY CAN CARRY ONE: a truncating writer, a bad
 * transcode or a parser that gave up mid-character each leave one
 * behind, and it is the one character class that cannot be
 * serialized as itself.
 */
const LONE_SURROGATE = charFrom(0xd800);

/**
 * One astral character, as its two UTF-16 halves.
 *
 * Built from code units rather than written as itself, so this
 * file carries no character a reviewer's editor renders
 * differently from the next one's.
 */
const ASTRAL_PAIR = charFrom(0xd83d, 0xde00);

/** A stored body carrying a C0 control, a lone half and a pair. */
const CONTROL_BODY =
  `a page${NUL}holding${LONE_SURROGATE}and${ASTRAL_PAIR}`;

/** What {@link CONTROL_BODY} must answer as. */
const MASKED_CONTROL_BODY =
  `a page\\u0000holding\\ud800and${ASTRAL_PAIR}`;

describe('what the masking takes out', () => {
  it('answers a NUL and a lone surrogate as their escapes', async () => {
    const store = await plantCorpus([capturedDocument({
      id: 401,
      body: CONTROL_BODY,
    })]);
    const page = await pageOf(store, RADAR, {});
    const [answered] = page.rows;

    expect(answered?.body).toBe(MASKED_CONTROL_BODY);

    // Re-read through {@link unsafeCodePoints}, which shares
    // nothing with the class the module masks by: the stored body
    // carries exactly the two code points and the answered one
    // carries neither. Both readings taken in the same case, so
    // the zero is held against a known positive.
    expect(unsafeCodePoints(answered?.body ?? '')).toEqual([]);
    expect(unsafeCodePoints(CONTROL_BODY)).toEqual([0x00, 0xd800]);

    // The valid pair beside them is UNTOUCHED, which is what says
    // only a surrogate standing on its own is masked. That rests
    // on the `u` flag on the module's class: dropped, this
    // character answers as two escapes while every assertion above
    // goes on holding, so the pair is asserted present AND its
    // escaped spelling asserted absent.
    expect(answered?.body.includes(ASTRAL_PAIR)).toBe(true);
    expect(answered?.body.includes('\\ud83d')).toBe(false);

    // Nothing was cut, and `bodyBytes` is the STORED length rather
    // than the answered one. Masking is expansive — two characters
    // became twelve — so the two numbers disagree here, which is
    // what makes the member a reading rather than a coincidence of
    // a body with nothing in it to mask.
    expect(answered?.bodyTruncated).toBe(false);
    expect(answered?.bodyBytes)
      .toBe(Buffer.byteLength(CONTROL_BODY, 'utf8'));
    expect(answered?.bodyBytes)
      .not.toBe(Buffer.byteLength(answered?.body ?? '', 'utf8'));
  });
});

// ---------------------------------------------------------------------------
// What the cap keeps and what it cuts
// ---------------------------------------------------------------------------

/** How many code points past the cap the long body runs. */
const OVERSHOOT = 64;

/** What the front of every body in this section carries. */
const HEAD_MARK = 'head-of-the-corpus';

/** What its tail carries, which the cut has to take. */
const TAIL_MARK = 'tail-of-the-corpus';

/**
 * A body of exactly {@link BODY_CODE_POINT_CAP} code points.
 *
 * MARKED AT BOTH ENDS rather than a run of one character, and that
 * is what makes the boundary readable: a uniform body equals every
 * slice of itself of the same length, so a cut written as `>=`
 * rather than `>` would take a character nothing could see going.
 */
const AT_CAP_BODY = HEAD_MARK
  + 'x'.repeat(BODY_CODE_POINT_CAP - HEAD_MARK.length - TAIL_MARK.length)
  + TAIL_MARK;

/**
 * The same body with one more code point on the end.
 *
 * ONE PAST, so the pair below differs in exactly the axis under
 * test — and what the cut answers for it is {@link AT_CAP_BODY}
 * itself, which is the sharpest available spelling of the cut
 * taking exactly the overshoot and nothing else.
 */
const ONE_PAST_CAP_BODY = AT_CAP_BODY + 'x';

/** A character UTF-8 spends two bytes on. */
const TWO_BYTE_CHAR = charFrom(0x00e9);

/** How many of those sit past the cap in the long body. */
const WIDE_RUN = OVERSHOOT - TAIL_MARK.length;

/**
 * A body {@link OVERSHOOT} code points past the cap, whose tail is
 * not ASCII.
 *
 * THREE NUMBERS THAT MUST NOT BE CONFUSED, which is what the wide
 * tail buys and what an ASCII fixture cannot say. Its stored BYTES
 * exceed its stored CODE POINTS, and both exceed the bytes of what
 * the cut answers — so a `bodyBytes` taken off the cut text and a
 * `bodyBytes` counting stored characters are two different wrong
 * answers, and neither of them is the right one.
 *
 * {@link TAIL_MARK} falls wholly past the cap, so what the answer
 * keeps and what it drops are each readable by a mark rather than
 * by a length.
 */
const PAST_CAP_BODY = HEAD_MARK
  + 'x'.repeat(BODY_CODE_POINT_CAP - HEAD_MARK.length)
  + TAIL_MARK
  + TWO_BYTE_CHAR.repeat(WIDE_RUN);

describe('what the cap keeps and what it cuts', () => {
  it('answers a body at the cap whole and cuts the next', async () => {
    // The bracket rather than the boundary alone: a service that
    // never cut anything passes an at-cap row on its own, and a
    // service that cut everything passes a past-cap row on its
    // own. The two rows differ by ONE code point.
    const store = await plantCorpus([
      capturedDocument({ id: 411, body: AT_CAP_BODY }),
      capturedDocument({ id: 412, body: ONE_PAST_CAP_BODY }),
    ]);
    const page = await pageOf(store, RADAR, {});
    const answered = [...page.rows]
      .sort((left, right) => left.id - right.id)
      .map((row) => ({
        id: row.id,
        body: row.body,
        bodyBytes: row.bodyBytes,
        bodyTruncated: row.bodyTruncated,
      }));

    expect(answered).toEqual([
      {
        id: 411,
        body: AT_CAP_BODY,
        bodyBytes: BODY_CODE_POINT_CAP,
        bodyTruncated: false,
      },
      {
        id: 412,
        body: AT_CAP_BODY,
        bodyBytes: BODY_CODE_POINT_CAP + 1,
        bodyTruncated: true,
      },
    ]);

    // The two fixtures really sit where the case says, derived
    // from the exported constant rather than transcribed: a cap
    // that moved takes them with it instead of leaving this green
    // against a number nobody re-read.
    expect([...AT_CAP_BODY]).toHaveLength(BODY_CODE_POINT_CAP);
    expect([...ONE_PAST_CAP_BODY])
      .toHaveLength(BODY_CODE_POINT_CAP + 1);

    // And the mark the boundary is read by is really on the end of
    // the shorter one, so `>=` in place of `>` takes something a
    // reader can name.
    expect(AT_CAP_BODY.endsWith(TAIL_MARK)).toBe(true);
  });

  it('cuts a body past the cap and reports its stored bytes', async () => {
    const store = await plantCorpus([capturedDocument({
      id: 421,
      body: PAST_CAP_BODY,
    })]);
    const page = await pageOf(store, RADAR, {});
    const [answered] = page.rows;

    expect([...answered?.body ?? '']).toHaveLength(BODY_CODE_POINT_CAP);
    expect(answered?.bodyTruncated).toBe(true);

    // The STORED byte length, and a second derivation of it that
    // shares nothing with the call the module makes: the cap's
    // worth of ASCII, the mark past it, and two bytes for each
    // character of the wide tail.
    const storedBytes = BODY_CODE_POINT_CAP
      + TAIL_MARK.length
      + (2 * WIDE_RUN);

    expect(answered?.bodyBytes).toBe(storedBytes);
    expect(answered?.bodyBytes)
      .toBe(Buffer.byteLength(PAST_CAP_BODY, 'utf8'));

    // The three numbers, held apart. Stored bytes exceed stored
    // code points because the tail is not ASCII, and both exceed
    // the bytes of what was answered — so `bodyBytes` taken off
    // the cut text and `bodyBytes` counting stored characters are
    // each a different wrong answer this reads as wrong.
    expect(answered?.bodyBytes)
      .toBeGreaterThan([...PAST_CAP_BODY].length);
    expect([...PAST_CAP_BODY])
      .toHaveLength(BODY_CODE_POINT_CAP + OVERSHOOT);
    expect(answered?.bodyBytes)
      .toBeGreaterThan(Buffer.byteLength(answered?.body ?? '', 'utf8'));

    // What was KEPT is the front of the stored body. The two marks
    // are what make that readable: a cut taking the tail answers
    // the same length and the same flag and would differ from this
    // in nothing else.
    expect(answered?.body)
      .toBe(PAST_CAP_BODY.slice(0, BODY_CODE_POINT_CAP));
    expect(answered?.body.startsWith(HEAD_MARK)).toBe(true);
    expect(answered?.body.includes(TAIL_MARK)).toBe(false);

    // And the stored body really carries the mark the answer does
    // not, so the `false` above is a reading rather than a needle
    // that was never in the haystack.
    expect(PAST_CAP_BODY.includes(TAIL_MARK)).toBe(true);
  });
});
