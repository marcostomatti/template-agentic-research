/**
 * `src/entities/service.ts` — what the registry surface REFUSES,
 * what each refusal is careful not to say, and what a call that is
 * not refused ANSWERS. Driven over
 * `tests/helpers/memory-research-store.ts`, so every claim here is
 * answered with no database anywhere.
 *
 * TWELVE SECTIONS AND TWENTY-FOUR CASES, IN TWO HALVES. The first
 * seven sections are about refusals; the five below them read what
 * a call answers — a row read whole, a key recomputed from a name
 * the caller spelled, a payload replaced, a pointer set and
 * cleared, and a page of passes. The successful calls inside a
 * refusal case stay CONTROLS rather than coverage of any of that,
 * and each still reads the one member its own refusal is about.
 *
 * THE SECOND HALF IS WHAT MAKES SEVEN LEGS LIVE AT ALL. Run against
 * `git show HEAD:./service.test.ts` with the identical leg list,
 * seven mutations reddened NOTHING over the refusal-only revision
 * and redden one or two cases apiece here: `getEntity` following an
 * alias, `null` read as an absent member, the page re-sorted after
 * the store ordered it, the total taken off the page, the store
 * MERGING a payload, the projection widened by a member, and the
 * research order by the id alone. No refusal can report any of
 * them, every one being a fact about an answer.
 *
 * EVERY REFUSAL CASE CARRIES ITS OWN CONTROL, VARIED ALONG THAT
 * ROW'S OWN AXIS. A service refusing everything passes a refusal
 * case written on its own, so the control has to sit in the same
 * case and has to differ from the refused call in exactly the thing
 * under test: the same patch against an id that resolves; the same
 * request with the name changed to one that reduces; the same alias
 * proposed from a subject that may hold it.
 *
 * THE FIXTURE IS BUILT TO DISCRIMINATE RATHER THAN MERELY TO EXIST,
 * and the shape doing the work is TWO REGISTRIES HOLDING THE SAME
 * KEY. `entities_domain_id_name_norm_unique` is per DOMAIN, and the
 * two alias rules are about which domain a row sits in, so a
 * fixture with one domain in it could not tell a rule that reads
 * the subject's registry from one that reads a constant. Both
 * domains therefore hold a subject reducing to `kubernetes`, and
 * the collision section's key is held in one of them alone.
 *
 * TWO ROWS ARE PLANTED FOR THE SECOND HALF ALONE, and each is a
 * discrimination rather than a subject. {@link ALIASED} is the one
 * row here with nothing at its default, which is what separates a
 * function answering a constant `null` and a constant `{}` from one
 * answering what was stored — and its payload carries a member a
 * replacement has to be seen REMOVING. The third planted pass
 * carries the NEWEST stamp and the LOWEST id, so the stamp key and
 * the id tiebreak beneath it disagree, and newest-first is then
 * none of the four orders a three-row page could reach by accident.
 *
 * THE SIX REFUSALS SPLIT THREE WAYS BY WHO RAISES THEM, and saying
 * so is half of what the file is for. ONE is the SCHEMA's, raised
 * before any function ran: a key the patch does not declare, of
 * which `nameNorm` is the one that matters. THREE are this
 * MODULE's, raised because neither a schema nor a constraint could
 * hold them: a name carrying nothing that identifies a subject, a
 * subject aliased to itself, and one aliased into another registry.
 * And TWO are the DATABASE's, translated rather than repeated: the
 * unique key answering a rename as a 409, and the alias foreign key
 * answering an id no entity carries as a 422. The 404 sits across
 * all three, being a fact about a row rather than about a rule.
 *
 * THE ONE REFUSAL A CALLER CANNOT REACH IS NOT HERE, and it is an
 * honest zero rather than an oversight. `patchEntity` answers a 404
 * from the write's own null as well as from the lookup, which is
 * the row going between the two — no ordinary sequence of calls
 * produces it, the in-memory store has no seam that deletes an
 * entity, and `EntityStore` declares neither an insert nor a
 * delete. The case that would close it is a store whose
 * `updateEntity` answers null for a row `findEntityById` had just
 * returned.
 *
 * THE READ-BEFORE-WRITE ORDERING IS COUNTED AND NOT ASSERTED. No
 * status can say whether the lookup happened before the write, so
 * two sections wrap the planted store in a tally and read WHICH
 * methods a refused call reached. Both take the same tally over the
 * call that succeeds, in the same case: a wrapper that had stopped
 * counting reports zero for the refusal and zero for the control.
 *
 * THAT A NAME REDUCING TO NOTHING IS REFUSED BEFORE THE SUBJECT IS
 * READ AT ALL. It is a fact about the request alone, so the refusal
 * costs no read — which the tally reads directly, where a status
 * assertion would pass over a service that resolved the row first.
 * The name that reduces to nothing is PUNCTUATION AND SPACES, which
 * is what the reduction actually removes: a name of letters could
 * not reach that refusal whatever its spelling.
 *
 * THAT THE TWO ALIAS RULES READ THE SUBJECT'S OWN REGISTRY. A
 * service ignoring the row and comparing against one fixed domain
 * refuses the same alias in this fixture, so the case that reports
 * is the MIRROR: the same pair of subjects proposed in both
 * directions, both refused, with a same-registry alias accepted on
 * each side in the same case.
 *
 * THAT A COLLISION IS THE DOMAIN'S AND NOT THE DEPLOYMENT'S. The
 * control for the 409 is the identical name accepted in the sibling
 * registry, which is the unique key's `domain_id` half read from
 * the surface. A row is separately shown not to collide with
 * ITSELF, since a rename moving only the display half rewrites the
 * key to what it already was.
 *
 * THAT NO REFUSAL QUOTES ANYTHING, READ PER CHANNEL. An `AppError`
 * can carry a submitted value out through three of them — the
 * message, the details and the CAUSE — and a count taken over the
 * three joined together cannot say which one leaked.
 * {@link leaksIn} renders them separately, and the zeros are read
 * against a planted refusal that leaks through all three, counted
 * by the same helper in the same case: a renderer that ignored
 * `cause` fails on the third member alone. The cause channel is the
 * one worth insisting on here, because two of these refusals really
 * do keep one — the library error behind an empty key, and the
 * `StoreRefusal` behind a duplicate — and neither may carry a
 * submitted value out with it.
 *
 * THE NEEDLES ARE CHOSEN SO A ZERO CANNOT BE AN ACCIDENT. A name
 * has to be one no stack frame, no constraint name and no path
 * could contain, so the colliding subject is planted under a
 * sentinel spelling rather than under a readable one, and the ids
 * every alias case submits are seven digits long.
 *
 * THE GRID BELOW WAS MEASURED RATHER THAN PREDICTED, over these
 * twenty-four cases, twice, with the two runs agreeing member for
 * member on every leg — and once more against HEAD's sixteen-case
 * copy of this file with the identical list, so every figure here
 * is a SET diff rather than a comparison against a sentence. One
 * rule patched at a time, the file restored between legs, and
 * `git status --short -uall` left naming no file but these.
 *
 * NINE CARRIED-IN LEGS HELD BYTE-IDENTICAL SETS. Dropping
 * `.strict()` reddens 2, the two undeclared-key cases. Moving the
 * reduction below the lookup reddens 1, the tally case alone, which
 * is what that case is for. The three alias rules separate cleanly:
 * dropping the self rule reddens 2, the self case and the alias
 * containment case; dropping the cross-domain rule reddens 3, both
 * cross-domain cases and that same containment case; dropping the
 * foreign-key translation reddens 2, the unknown-alias case and it
 * again. Comparing every alias against ONE FIXED DOMAIN reddens 2
 * rather than the mirror case alone — it also takes the outward
 * case's control, the same target proposed from its own registry.
 * Dropping the unique-violation translation reddens 2, the 409 case
 * and the name containment case. Paging research without resolving
 * the subject reddens 2, both cases in the first section about that
 * page. Reading the subject a SECOND time reddens 2, both tally
 * cases, which is what says a tally is an exact count rather than a
 * presence check.
 *
 * FOUR MOVED, EACH BY THE NEW CASES THAT TOUCH ITS OWN SUBJECT, AND
 * NO SET LOST A MEMBER. Answering the display half AS the key and
 * answering ONE CONSTANT for every name each go 6 to 7, gaining the
 * name-rewrite case and nothing else — and their red sets are
 * IDENTICAL on both sides, told apart only by the assertion that
 * fails inside each. They are the two whole-half controls over one
 * equality, and no case here can separate them: what does is
 * `tests/lib/entity-name-norm.test.ts`, whose subject is the
 * reduction rather than a service that calls it. Answering the row
 * as it stood BEFORE the write goes 9 to 14, gaining exactly the
 * five new cases that patch; the get and the two research cases do
 * not patch, and that is why they are not in it.
 *
 * AND THE WHOLE-HALF CONTROL GOES 15 TO 23 OF 24, gaining all eight
 * new cases and losing none. Planting no registry at all still
 * leaves exactly one case standing — `refuses though research is
 * planted under the id` — the only case here whose subject is an
 * ABSENCE and which therefore never needed a row. That survivor SET
 * is the coverage statement; the 23 is not.
 *
 * THE SEVEN LEGS THE SECOND HALF BOUGHT, READ BY NAME. `getEntity`
 * following the pointer reddens 2, the get and the clear, both of
 * which address an alias directly. `null` read as an absent member
 * reddens 1, the clear alone, that being the only case submitting a
 * falsy-but-present value. The page re-sorted by the service after
 * the store ordered it reddens 1, and the total taken off the page
 * rather than off the collection reddens 2. A payload MERGED rather
 * than replaced reddens 2, both payload cases, the empty one
 * included — which is what says `{}` is a value here and not an
 * absence. The projection widened by one member reddens 1, the get
 * alone, and it is the key-SET assertion that reports rather than
 * the whole-row comparison above it. Ordering the research by the
 * id alone reddens 2 rather than the order case alone: the
 * page-past-the-end case's own control reads the OLDEST pass one
 * row from the end, and a different order puts a different row
 * there.
 *
 * ONE FIGURE IS A ZERO ON BOTH SIDES AND IT IS A NO-OP RATHER THAN
 * A GAP. Building the patch with explicit `undefined` members
 * instead of leaving an absent one out reddens NOTHING, because the
 * in-memory port reads every member with `=== undefined` and the
 * two spellings are one request to it. What would separate them is
 * an implementation deriving its `SET` clause from `Object.keys`,
 * which is `./db-store.ts`'s to answer and not this file's.
 *
 * AND ONE LEG COULD NOT RUN AT HEAD AT ALL, which is a different
 * claim from a zero. Planting {@link ALIASED} at its DEFAULTS — no
 * pointer, no payload — has no anchor in the refusal-only revision,
 * that row not existing there; here it reddens 4, the get and the
 * three cases that patch it. It is the fixture leg for the second
 * half, and it says the non-default row buys every reading taken
 * against it.
 */
import type { EntitiesServiceStore } from './service.js';
import type { FieldError } from '../../lib/errors/index.js';
import type {
  MemoryDomainEntity,
  MemoryEntityResearch,
  MemoryResearchStore,
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
import { normalizeEntityName } from '../lib/entity-name-norm.js';

import {
  getEntity,
  listEntityResearch,
  patchEntity,
} from './service.js';

/** The seeded worked example, and the registry most cases patch. */
const RADAR = 'example-tech-radar';

/**
 * A second domain, holding a subject that reduces to the same key.
 *
 * That overlap is the fixture's whole point: the unique key is per
 * domain and both alias rules are about which domain a row sits in,
 * so a fixture with one registry could not tell either rule from a
 * constant.
 */
const SIBLING = 'example-newsroom';

/**
 * The subject every alias and collision case starts from.
 *
 * SEVEN DIGITS, like every id below, so that a containment count
 * over the rendered `cause` — which carries a stack, and a stack
 * carries line and column numbers — cannot match one by accident.
 */
const KUBE = 4101733;

/** A second subject of {@link RADAR}, and the usual alias target. */
const MESH = 4102744;

/**
 * A third subject of {@link RADAR}, holding the key the collision
 * section renames onto.
 *
 * Planted under a SENTINEL spelling rather than a readable one, so
 * the containment counts over that refusal are taken on a string no
 * constraint name, module path or stack frame could contain.
 */
const TAKEN = 4103755;

/**
 * A fourth subject of {@link RADAR}, and the one row here planted
 * with nothing at its default.
 *
 * EVERY OTHER SUBJECT ALIASES NOTHING AND HOLDS NO ATTRIBUTES, so
 * a function answering a constant `null` and a constant `{}` reads
 * exactly like one answering what was stored. This row is what the
 * read, the replacement and the clear are all taken against: its
 * pointer is set so that clearing it has somewhere to come from,
 * and its payload carries a member a replacement has to be seen
 * REMOVING.
 */
const ALIASED = 4104788;

/** A subject of {@link SIBLING} reducing to {@link KUBE}'s key. */
const ELSEWHERE = 4201766;

/** A second subject of {@link SIBLING}, its own alias target. */
const DESK = 4202777;

/** An id no entity carries, in either registry. */
const MISSING_ENTITY = 8888999;

/** An id no entity carries, submitted as an alias target. */
const MISSING_ALIAS = 7777888;

/** A key no request below declares, submitted as one. */
const SENTINEL_KEY = 'zzsentinelkeyzz';

/** The display half {@link TAKEN} is planted under. */
const TAKEN_NAME = 'ZZ Sentinel Subject';

/**
 * The key half it is planted under, computed rather than written
 * out.
 *
 * Through the module under the rename rather than beside it: a
 * transcribed key would let a fixture and a service disagree about
 * the reduction while every case in the collision section went on
 * passing, which is exactly the drift `normalizeEntityName` exists
 * to make impossible.
 */
const TAKEN_KEY = normalizeEntityName(TAKEN_NAME);

/** The display half {@link ALIASED} is planted under. */
const ALIASED_NAME = 'Pod Autoscaler';

/**
 * The key half it is planted under.
 *
 * Written out rather than reduced, unlike {@link TAKEN_KEY}: no
 * case renames onto this key, so the seam stands in for a writer
 * here exactly as it does for every other planted subject.
 */
const ALIASED_KEY = 'pod autoscaler';

/**
 * The payload {@link ALIASED} is planted holding.
 *
 * TWO MEMBERS, because a replacement is only visible as one where
 * the new payload drops something: a merge answers both members
 * and a replacement answers one, and over a row that started empty
 * the two are the same bytes.
 */
const ALIASED_ATTRIBUTES = { tier: 'platform', owner: 'sre' };

/** What the replacement stores in its place, one member short. */
const REPLACEMENT_ATTRIBUTES = { tier: 'edge' };

/**
 * A name whose key is free in both registries.
 *
 * The rename every control that has to SUCCEED uses, so a control
 * can never pass or fail for the collision rule's reasons.
 */
const FREE_NAME = 'Kubernetes Fleet';

/**
 * {@link KUBE}'s own name shouted, which reduces to its own key.
 *
 * What the not-in-conflict-with-itself case renames onto: the
 * display half moves and the key half is rewritten to what it
 * already was.
 */
const SHOUTED_NAME = 'KUBERNETES';

/**
 * A name carrying nothing that identifies a subject.
 *
 * PUNCTUATION AND SPACES, which is what the reduction removes. A
 * name of letters cannot reach that refusal whatever its spelling,
 * so this is the only shape the case has.
 */
const EMPTY_NAME = '*** --- ***';

/** The same name with one thing in it that identifies a subject. */
const REDUCIBLE_NAME = '*** a --- ***';

/**
 * The pass recorded first, and the OLDEST of the three.
 *
 * The three ids are named rather than left as literals because the
 * order this file reads is written OUT: deriving it in the case
 * would put a second comparator here for an order the store has
 * already settled.
 */
const FIRST_ID = 7001811;

/** The pass recorded second, and the one holding the HIGHEST id. */
const SECOND_ID = 7002833;

/**
 * The newest pass, and the one holding the LOWEST id.
 *
 * THE ARRANGEMENT IS THE POINT. Newest first answers
 * `[THIRD_ID, SECOND_ID, FIRST_ID]`, which is none of the orders a
 * page could reach by accident: not the planted order, not its
 * reverse, and neither direction of the id. Those four are
 * asserted UNEQUAL in the same case that reads the order, so a
 * three-row page cannot agree with the expectation for a reason
 * the fixture handed it.
 */
const THIRD_ID = 7000800;

/** The window every research read below is taken through. */
const WIDE_WINDOW: StoreWindow = { limit: 50, offset: 0 };

/** When the first planted pass was recorded. */
const FIRST_PASS = '2026-03-01T00:00:00.000Z';

/** When the second was. */
const SECOND_PASS = '2026-03-02T00:00:00.000Z';

/**
 * When the third was, which is the NEWEST of the three.
 *
 * Its row carries the LOWEST id, so the stamp key and the id
 * tiebreak beneath it disagree — which is what stops a page
 * ordered by the id alone from reproducing the right answer.
 */
const THIRD_PASS = '2026-03-03T00:00:00.000Z';

/**
 * Builds one row for `setDomainEntities`.
 *
 * @param id - The subject's id, which every entity read is
 *   addressed by.
 * @param name - The display half.
 * @param nameNorm - The key half, planted rather than computed:
 *   nothing under the port reduces a name, and the seam standing in
 *   for a writer is what keeps `normalizeEntityName` the single
 *   definition.
 * @returns The row to plant, aliasing nothing and carrying no
 *   attributes — the two states every case here starts from.
 */
function registered(
  id: number,
  name: string,
  nameNorm: string,
): MemoryDomainEntity {
  return { id, name, nameNorm, aliasOf: null, attributes: {} };
}

/**
 * {@link ALIASED} as planted: pointing at {@link KUBE} and holding
 * {@link ALIASED_ATTRIBUTES}.
 *
 * Written out rather than built through {@link registered}, which
 * exists to plant the two states every refusal case starts from —
 * no pointer and no payload — and would have to grow two
 * parameters used once to reach this one.
 */
const ALIASED_ROW: MemoryDomainEntity = {
  id: ALIASED,
  name: ALIASED_NAME,
  nameNorm: ALIASED_KEY,
  aliasOf: KUBE,
  attributes: ALIASED_ATTRIBUTES,
};

/** The subjects {@link RADAR}'s registry holds. */
const RADAR_ENTITIES: readonly MemoryDomainEntity[] = [
  registered(KUBE, 'Kubernetes', 'kubernetes'),
  registered(MESH, 'Service Mesh', 'service mesh'),
  registered(TAKEN, TAKEN_NAME, TAKEN_KEY),
  ALIASED_ROW,
];

/** The subjects {@link SIBLING}'s registry holds. */
const SIBLING_ENTITIES: readonly MemoryDomainEntity[] = [
  registered(ELSEWHERE, 'Kubernetes', 'kubernetes'),
  registered(DESK, 'Newsdesk', 'newsdesk'),
];

/** What has been found out about {@link KUBE}. */
const KUBE_RESEARCH: readonly MemoryEntityResearch[] = [
  {
    id: FIRST_ID,
    runId: 5100822,
    summary: 'A first pass',
    payload: { depth: 1 },
    researchedAt: new Date(FIRST_PASS),
  },
  {
    id: THIRD_ID,
    runId: 5100822,
    summary: 'A third pass',
    payload: { depth: 3 },
    researchedAt: new Date(THIRD_PASS),
  },
  {
    id: SECOND_ID,
    runId: null,
    summary: null,
    payload: { depth: 2 },
    researchedAt: new Date(SECOND_PASS),
  },
];

/** Research planted under an id no entity carries. */
const ORPHAN_RESEARCH: readonly MemoryEntityResearch[] = [
  {
    id: 7003844,
    runId: null,
    summary: 'Recorded against nothing',
    payload: {},
    researchedAt: new Date(FIRST_PASS),
  },
];

/**
 * The two registries and the research hanging off one of them.
 *
 * BOTH DOMAINS ARE PLANTED FOR EVERY CASE, refusals included, so
 * every reading below is a scoping reading as well: a rule that had
 * stopped reading the subject's own domain answers differently on
 * the mirror pair and nowhere else.
 *
 * @returns The planted store.
 */
async function plantRegistries(): Promise<MemoryResearchStore> {
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

  store.setDomainEntities(domain.id, RADAR_ENTITIES);
  store.setDomainEntities(sibling.id, SIBLING_ENTITIES);
  store.setEntityResearch(KUBE, KUBE_RESEARCH);

  return store;
}

/** How many times each port method a case drives was called. */
interface CallCounts {
  /** Lookups of a subject by its own id. */
  findEntityById: number;

  /** Rewrites of a subject. */
  updateEntity: number;

  /** Reads of one window of a subject's research. */
  listEntityResearch: number;

  /** Reads of how many passes it holds. */
  countEntityResearch: number;
}

/** A tally with every member at zero. */
const NO_CALLS: CallCounts = {
  findEntityById: 0,
  updateEntity: 0,
  listEntityResearch: 0,
  countEntityResearch: 0,
};

/**
 * The four-method port with a tally beside it.
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
  counted: EntitiesServiceStore;
  calls: CallCounts;
} {
  const calls: CallCounts = { ...NO_CALLS };
  const counted: EntitiesServiceStore = {
    findEntityById(id) {
      calls.findEntityById += 1;

      return store.findEntityById(id);
    },
    updateEntity(id, patch) {
      calls.updateEntity += 1;

      return store.updateEntity(id, patch);
    },
    listEntityResearch(entityId, window) {
      calls.listEntityResearch += 1;

      return store.listEntityResearch(entityId, window);
    },
    countEntityResearch(entityId) {
      calls.countEntityResearch += 1;

      return store.countEntityResearch(entityId);
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
 * The two facts a caller reads off each detail of a 422.
 *
 * `message` is left out of the comparison here and asserted
 * separately where a case is about the wording, so a row reading
 * the field and the code cannot fail for a sentence's sake.
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
 * A refusal built to leak every needle through all three channels.
 *
 * THE CONTROL FOR EVERY ZERO IN THE CONTAINMENT SECTION, and it has
 * to carry EVERY needle in EVERY channel or it reddens where the
 * subject is fine. So each one is interpolated into the message,
 * into the one detail's message AND into the cause.
 *
 * @param needles - The values a real refusal must not carry.
 * @returns The planted refusal, to be counted by {@link leaksIn}.
 */
function leakingRefusal(needles: readonly string[]): ValidationError {
  const quoted = needles.join(' ');

  return new ValidationError(`Refused ${quoted}`, [{
    field: 'planted',
    message: `Refused ${quoted}`,
    code: 'planted_leak',
  }], { cause: new Error(`Refused ${quoted}`) });
}

/**
 * @param rows - What a research page answered.
 * @returns The ids in it, ASCENDING, for a membership reading that
 *   says nothing about the order a page came back in. What that
 *   order is belongs to the store's own file, and reading it here
 *   would make a case about a refusal able to fail for an ordering
 *   reason.
 */
function researchIdsOf(rows: readonly { id: number }[]): number[] {
  return [...rows].map((row) => row.id).sort((left, right) => left - right);
}

// ---------------------------------------------------------------------------
// An id no subject carries
// ---------------------------------------------------------------------------

describe('an id no subject carries', () => {
  it('answers 404 from the single get', async () => {
    const store = await plantRegistries();
    const refusal = await refusalFrom(
      () => getEntity(store, MISSING_ENTITY),
    );

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.code).toBe('NOT_FOUND');
    expect(refusal.statusCode).toBe(404);
    expect(refusal.details).toBeUndefined();

    // The control, inside the case and varied along the one axis
    // under test: the same call against an id that resolves. A
    // function refusing everything passes the assertions above and
    // fails this one.
    const answered = await getEntity(store, KUBE);

    expect(answered.id).toBe(KUBE);
    expect(answered.nameNorm).toBe('kubernetes');
  });

  it('answers 404 from the research page', async () => {
    // The reading that says this page resolves the subject at all.
    // `EntityStore` answers an empty list and a count of `0` for an
    // id no entity carries, both correctly, so a function that
    // skipped the lookup would answer a mistyped id exactly as it
    // answers a subject nothing has researched.
    const store = await plantRegistries();
    const refusal = await refusalFrom(
      () => listEntityResearch(store, MISSING_ENTITY, WIDE_WINDOW),
    );

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.statusCode).toBe(404);

    // The control: the same window against a subject that resolves.
    const page = await listEntityResearch(store, KUBE, WIDE_WINDOW);

    expect(researchIdsOf(page.rows))
      .toEqual(researchIdsOf(KUBE_RESEARCH));
    expect(page.total).toBe(KUBE_RESEARCH.length);
  });

  it('answers 404 from the patch, having written nothing', async () => {
    // The ordering claim, which no assertion on the status can
    // make: a service that issued the write first would answer the
    // same 404 off the write's own null, having tried to rewrite a
    // row it had not read. Counted rather than asserted absent, and
    // the control is the same tally taken over an id that resolves
    // — a wrapper that had stopped counting reports zero for both.
    const store = await plantRegistries();
    const refused = countingStore(store);

    await refusalFrom(() => patchEntity(refused.counted, MISSING_ENTITY, {
      name: 'Anything At All',
    }));

    expect(refused.calls).toEqual({ ...NO_CALLS, findEntityById: 1 });

    const answered = countingStore(store);

    await patchEntity(answered.counted, MESH, { name: 'Anything At All' });

    expect(answered.calls).toEqual({
      ...NO_CALLS,
      findEntityById: 1,
      updateEntity: 1,
    });
  });

  it('refuses though research is planted under the id', async () => {
    // The reading that says the 404 comes from the LOOKUP rather
    // than from there being nothing to answer. The planting seam
    // takes an entity id that names no row on purpose, so this
    // state is reachable: passes really are recorded against it,
    // the port answers them to whoever asks it directly, and the
    // refusal is still what an id no entity carries gets.
    const store = await plantRegistries();

    store.setEntityResearch(MISSING_ENTITY, ORPHAN_RESEARCH);

    const planted = await store.countEntityResearch(MISSING_ENTITY);

    expect(planted).toBe(ORPHAN_RESEARCH.length);

    const refusal = await refusalFrom(
      () => listEntityResearch(store, MISSING_ENTITY, WIDE_WINDOW),
    );

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.statusCode).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// A name that reduces to nothing
// ---------------------------------------------------------------------------

describe('a name that reduces to nothing', () => {
  it('refuses a name that identifies no subject', async () => {
    // The library throws a plain `Error` for this, so what is
    // pinned here is the translation: a 422 naming `name`, with a
    // code of this module's own because no schema could raise it.
    const store = await plantRegistries();
    const refusal = await refusalFrom(() => patchEntity(store, KUBE, {
      name: EMPTY_NAME,
    }));

    expect(refusal).toBeInstanceOf(ValidationError);
    expect(refusal.code).toBe('VALIDATION_ERROR');
    expect(refusal.statusCode).toBe(422);
    expect(detailsOf(refusal.details as FieldError[] | undefined)).toEqual([
      { field: 'name', code: 'empty_entity_key' },
    ]);

    // The control, varied along this row's own axis by one
    // character: the same punctuation with one thing in it that
    // identifies a subject. A service refusing every name passes
    // the assertions above and fails this one.
    const answered = await patchEntity(store, KUBE, {
      name: REDUCIBLE_NAME,
    });

    expect(answered.name).toBe(REDUCIBLE_NAME);
    expect(answered.nameNorm).toBe(normalizeEntityName(REDUCIBLE_NAME));
  });

  it('refuses before the subject is read at all', async () => {
    // Whether a name carries anything that identifies a subject is
    // a fact about the request alone, so the refusal costs no read
    // — which is what this tally says and what no status assertion
    // could. The control is the same tally over the same patch with
    // a name that reduces, which reaches both methods.
    const store = await plantRegistries();
    const refused = countingStore(store);

    await refusalFrom(() => patchEntity(refused.counted, KUBE, {
      name: EMPTY_NAME,
    }));

    expect(refused.calls).toEqual(NO_CALLS);

    const answered = countingStore(store);

    await patchEntity(answered.counted, KUBE, { name: REDUCIBLE_NAME });

    expect(answered.calls).toEqual({
      ...NO_CALLS,
      findEntityById: 1,
      updateEntity: 1,
    });
  });
});

// ---------------------------------------------------------------------------
// An alias naming the subject itself
// ---------------------------------------------------------------------------

describe('an alias naming the subject itself', () => {
  it('refuses a subject aimed at itself', async () => {
    // Storable as far as Postgres is concerned — `entities.alias_of`
    // says so — and a merge nobody meant, so the rule is held here
    // and answers a 422 naming the member the caller supplied.
    const store = await plantRegistries();
    const refusal = await refusalFrom(() => patchEntity(store, KUBE, {
      aliasOf: KUBE,
    }));

    expect(refusal).toBeInstanceOf(ValidationError);
    expect(refusal.statusCode).toBe(422);
    expect(detailsOf(refusal.details as FieldError[] | undefined)).toEqual([
      { field: 'aliasOf', code: 'self_alias' },
    ]);

    // And the refused patch left the row as it found it, which the
    // status cannot say: a service refusing after the write would
    // answer the same 422 over a row already aimed at itself.
    const untouched = await getEntity(store, KUBE);

    expect(untouched.aliasOf).toBeNull();

    // The control, varied along this row's own axis: the same
    // subject aliased to a DIFFERENT one in the same registry. A
    // service refusing every alias passes the assertions above and
    // fails this one.
    const answered = await patchEntity(store, KUBE, { aliasOf: MESH });

    expect(answered.aliasOf).toBe(MESH);
  });
});

// ---------------------------------------------------------------------------
// An alias naming a subject in another registry
// ---------------------------------------------------------------------------

describe('an alias naming a subject in another registry', () => {
  it('refuses an alias pointing into another domain', async () => {
    // The second rule the database cannot hold: both rows exist,
    // the foreign key is satisfied, and the write would join two
    // registries whose criteria, findings and research were
    // accumulated apart.
    const store = await plantRegistries();
    const refusal = await refusalFrom(() => patchEntity(store, KUBE, {
      aliasOf: ELSEWHERE,
    }));

    expect(refusal).toBeInstanceOf(ValidationError);
    expect(refusal.statusCode).toBe(422);
    expect(detailsOf(refusal.details as FieldError[] | undefined)).toEqual([
      { field: 'aliasOf', code: 'cross_domain_alias' },
    ]);

    // The control, varied along this row's own axis and along
    // nothing else: the SAME target proposed by a subject that
    // shares its registry. A service refusing that target however
    // it is asked passes the assertions above and fails this one.
    const answered = await patchEntity(store, DESK, {
      aliasOf: ELSEWHERE,
    });

    expect(answered.aliasOf).toBe(ELSEWHERE);
  });

  it('refuses the same pair proposed the other way round', async () => {
    // What says the rule reads the SUBJECT's own registry rather
    // than one fixed domain. A service comparing every alias
    // against, say, the target's domain refuses one direction and
    // accepts the other; both directions refused, with a
    // same-registry alias accepted on each side in this same case,
    // is what a constant cannot reproduce.
    const store = await plantRegistries();
    const outward = await refusalFrom(() => patchEntity(store, KUBE, {
      aliasOf: ELSEWHERE,
    }));
    const inward = await refusalFrom(() => patchEntity(store, ELSEWHERE, {
      aliasOf: KUBE,
    }));

    expect(detailsOf(outward.details as FieldError[] | undefined))
      .toEqual(detailsOf(inward.details as FieldError[] | undefined));
    expect(inward.statusCode).toBe(422);

    const inRadar = await patchEntity(store, KUBE, { aliasOf: MESH });
    const inSibling = await patchEntity(store, ELSEWHERE, {
      aliasOf: DESK,
    });

    expect(inRadar.aliasOf).toBe(MESH);
    expect(inSibling.aliasOf).toBe(DESK);
  });

  it('refuses an alias naming no subject at all', async () => {
    // The one alias rule this module does NOT hold: there is no
    // domain to compare against, so the id falls through to the
    // write and `entities.alias_of`'s foreign key raises it. What
    // is pinned here is the translation — the same 422 naming the
    // same member, so a caller reads one answer for one kind of
    // fault against one submitted id.
    const store = await plantRegistries();
    const refusal = await refusalFrom(() => patchEntity(store, KUBE, {
      aliasOf: MISSING_ALIAS,
    }));

    expect(refusal).toBeInstanceOf(ValidationError);
    expect(refusal.statusCode).toBe(422);
    expect(detailsOf(refusal.details as FieldError[] | undefined)).toEqual([
      { field: 'aliasOf', code: 'unknown_alias' },
    ]);

    // The control, one existing id away: the same patch naming a
    // subject that is there.
    const answered = await patchEntity(store, KUBE, { aliasOf: MESH });

    expect(answered.aliasOf).toBe(MESH);
  });
});

// ---------------------------------------------------------------------------
// A key the patch does not declare
// ---------------------------------------------------------------------------

describe('a key the patch does not declare', () => {
  it('refuses nameNorm as an unrecognized key', async () => {
    // The key half of the name is COMPUTED from the display half,
    // so a submitted one is a second reduction competing with the
    // single definition — and a member silently dropped would be
    // indistinguishable, on the wire, from one that was honoured.
    // The detail names the CONTAINER rather than the key, because
    // `src/http/validation.ts` never reads `issue.keys`.
    const store = await plantRegistries();
    const refusal = await refusalFrom(() => patchEntity(store, KUBE, {
      name: FREE_NAME,
      nameNorm: SENTINEL_KEY,
    }));

    expect(refusal).toBeInstanceOf(ValidationError);
    expect(refusal.statusCode).toBe(422);
    expect(detailsOf(refusal.details as FieldError[] | undefined)).toEqual([
      { field: 'body', code: 'unrecognized_keys' },
    ]);

    // The control, varied along this row's own axis: the same body
    // with that one key removed. It answers a key the request never
    // carried, which is the whole reason the key is refused rather
    // than dropped.
    const answered = await patchEntity(store, KUBE, { name: FREE_NAME });

    expect(answered.nameNorm).toBe(normalizeEntityName(FREE_NAME));
    expect(answered.nameNorm).not.toBe(SENTINEL_KEY);
  });

  it('refuses any key the patch does not declare', async () => {
    // `.strict()` as a rule rather than as one member's guard, so a
    // schema that had grown a catchall is reported here rather than
    // on whichever key somebody happened to misspell.
    const store = await plantRegistries();
    const refusal = await refusalFrom(() => patchEntity(store, KUBE, {
      [SENTINEL_KEY]: 'anything',
    }));

    expect(refusal.statusCode).toBe(422);
    expect(detailsOf(refusal.details as FieldError[] | undefined)).toEqual([
      { field: 'body', code: 'unrecognized_keys' },
    ]);

    // The control: every member the patch DOES declare, submitted
    // together. A schema refusing every body passes the assertions
    // above and fails this one.
    const answered = await patchEntity(store, KUBE, {
      name: FREE_NAME,
      attributes: { tier: 'core' },
      aliasOf: null,
    });

    expect(answered.name).toBe(FREE_NAME);
    expect(answered.attributes).toEqual({ tier: 'core' });
    expect(answered.aliasOf).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// A rename onto a key the domain already holds
// ---------------------------------------------------------------------------

describe('a rename onto a key the domain already holds', () => {
  it('answers 409 for a key another subject holds', async () => {
    // `entities_domain_id_name_norm_unique` raised by the write and
    // translated here. Not checked first: a read-then-write pair
    // would answer about a row that had gone in between and would
    // miss one that arrived.
    const store = await plantRegistries();
    const refusal = await refusalFrom(() => patchEntity(store, MESH, {
      name: TAKEN_NAME,
    }));

    expect(refusal).toBeInstanceOf(ConflictError);
    expect(refusal.code).toBe('CONFLICT');
    expect(refusal.statusCode).toBe(409);
    expect(refusal.details).toBeUndefined();

    // The control, varied along the one axis the unique key has
    // besides the name: the identical name in the OTHER registry,
    // which holds no such key. A store refusing every rename passes
    // the assertions above and fails this one, and a unique key
    // read without its `domain_id` half fails it too.
    const answered = await patchEntity(store, ELSEWHERE, {
      name: TAKEN_NAME,
    });

    expect(answered.nameNorm).toBe(TAKEN_KEY);
  });

  it('takes a rename onto the key the subject already holds', async () => {
    // A row is not in conflict with itself, so a rename moving only
    // the DISPLAY half is stored rather than refused — which is the
    // state a caller correcting a capitalisation is in, and the one
    // an exclusion the write forgot would turn into a 409.
    const store = await plantRegistries();
    const answered = await patchEntity(store, KUBE, {
      name: SHOUTED_NAME,
    });

    expect(answered.name).toBe(SHOUTED_NAME);
    expect(answered.nameNorm).toBe('kubernetes');
  });
});

// ---------------------------------------------------------------------------
// What a refusal carries
// ---------------------------------------------------------------------------

describe('what a refusal carries', () => {
  it('quotes neither a submitted name nor its reduction', async () => {
    // Counted per CHANNEL rather than over a joined blob, so a leak
    // names the one it came through. Both refusals here really do
    // keep a `cause` — a library error behind the empty key, a
    // `StoreRefusal` behind the duplicate — which is what makes the
    // third channel the one worth insisting on.
    const store = await plantRegistries();
    const empty = await refusalFrom(() => patchEntity(store, KUBE, {
      name: EMPTY_NAME,
    }));
    const collided = await refusalFrom(() => patchEntity(store, MESH, {
      name: TAKEN_NAME,
    }));

    expect(leaksIn(empty, EMPTY_NAME)).toEqual([0, 0, 0]);
    expect(leaksIn(collided, TAKEN_NAME)).toEqual([0, 0, 0]);
    expect(leaksIn(collided, TAKEN_KEY)).toEqual([0, 0, 0]);

    // Both really did keep one, which the zeros above cannot say:
    // a refusal that had stopped carrying a cause would answer the
    // same three zeros on a channel there was nothing to search.
    expect(empty.cause).toBeInstanceOf(Error);
    expect(collided.cause).toBeInstanceOf(Error);

    // The control for all nine zeros, counted by the same helper in
    // the same case: a refusal planted to carry every needle
    // through every channel. Read as BOOLEANS rather than as
    // counts, because an `Error`'s stack repeats its own message
    // and the repetition is the runtime's rather than this file's.
    const needles = [EMPTY_NAME, TAKEN_NAME, TAKEN_KEY];
    const planted = leakingRefusal(needles);
    const found = needles.map(
      (needle) => leaksIn(planted, needle).map((count) => count > 0),
    );

    expect(found).toEqual(needles.map(() => [true, true, true]));
  });

  it('quotes neither the alias id nor the subject\'s own', async () => {
    // The three alias refusals together, each searched for both ids
    // a caller could recognise: the one it submitted in the body
    // and the one it addressed in the path.
    const store = await plantRegistries();
    const itself = await refusalFrom(() => patchEntity(store, KUBE, {
      aliasOf: KUBE,
    }));
    const across = await refusalFrom(() => patchEntity(store, KUBE, {
      aliasOf: ELSEWHERE,
    }));
    const unknown = await refusalFrom(() => patchEntity(store, KUBE, {
      aliasOf: MISSING_ALIAS,
    }));
    const subject = String(KUBE);

    expect(leaksIn(itself, subject)).toEqual([0, 0, 0]);
    expect(leaksIn(across, subject)).toEqual([0, 0, 0]);
    expect(leaksIn(across, String(ELSEWHERE))).toEqual([0, 0, 0]);
    expect(leaksIn(unknown, String(MISSING_ALIAS))).toEqual([0, 0, 0]);

    // The last of the three is the one with a `cause` to search,
    // the other two being rules this module holds itself and having
    // nothing to translate.
    expect(unknown.cause).toBeInstanceOf(Error);

    // The control, as above and for the same reason.
    const needles = [subject, String(ELSEWHERE), String(MISSING_ALIAS)];
    const planted = leakingRefusal(needles);
    const found = needles.map(
      (needle) => leaksIn(planted, needle).map((count) => count > 0),
    );

    expect(found).toEqual(needles.map(() => [true, true, true]));
  });
});

// ---------------------------------------------------------------------------
// One subject read whole
// ---------------------------------------------------------------------------

describe('one subject read whole', () => {
  it('answers every column of the stored row', async () => {
    // Taken against the row planted with nothing at its default,
    // which is what makes the answer readable at all: a function
    // answering a constant `null` and a constant `{}` satisfies a
    // get taken against any other subject here.
    const store = await plantRegistries();
    const answered = await getEntity(store, ALIASED);
    const sibling = await getEntity(store, KUBE);

    expect(answered).toEqual({
      id: ALIASED,
      domainId: sibling.domainId,
      name: ALIASED_NAME,
      nameNorm: ALIASED_KEY,
      aliasOf: KUBE,
      attributes: ALIASED_ATTRIBUTES,
    });

    // The projection, asserted as a key SET rather than left to
    // the comparison above. A record answering one member MORE
    // than `EntityRecord` declares reddens here and nowhere else,
    // which is the reading no assertion over expected members can
    // make.
    expect(Object.keys(answered).sort()).toEqual([
      'aliasOf',
      'attributes',
      'domainId',
      'id',
      'name',
      'nameNorm',
    ]);

    // The pointer is answered AS IT STANDS rather than followed. A
    // service resolving an alias would answer the target's row
    // under the addressed id, and a caller that asked about an
    // alias is entitled to learn that it is one.
    expect(answered.id).not.toBe(sibling.id);
    expect(answered.nameNorm).not.toBe(sibling.nameNorm);

    // The control, varied along the one axis under test: a subject
    // that is its own and holds nothing. A function answering one
    // row whatever it is asked passes everything above and fails
    // these two.
    expect(sibling.aliasOf).toBeNull();
    expect(sibling.attributes).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// A name rewritten
// ---------------------------------------------------------------------------

describe('a name rewritten', () => {
  it('answers a key the request never carried', async () => {
    const store = await plantRegistries();
    const body = { name: FREE_NAME };
    const answered = await patchEntity(store, KUBE, body);

    // The request is held to ONE key in the same case that reads
    // the second one back, so the claim is that the key half was
    // computed rather than that it agreed with something sent.
    expect(Object.keys(body)).toEqual(['name']);
    expect(answered.name).toBe(FREE_NAME);
    expect(answered.nameNorm).toBe(normalizeEntityName(FREE_NAME));

    // The reduction MOVED the name rather than passing it through,
    // which is what separates a service computing the key from one
    // storing the display half in both columns.
    expect(answered.nameNorm).not.toBe(FREE_NAME);

    // Read back through the port rather than compared member by
    // member: a service answering an object rebuilt out of the
    // body satisfies every assertion above, the key being the one
    // member no request carried and this being where it comes
    // from.
    expect(await store.findEntityById(KUBE)).toEqual(answered);

    // The pair moved and the rest of the row did not.
    expect(answered.aliasOf).toBeNull();
    expect(answered.attributes).toEqual({});

    // The control against a reduction answering ONE CONSTANT: a
    // second name, in this same case, whose key differs from the
    // first. A function answering the same key for every argument
    // passes everything above and fails here.
    const again = await patchEntity(store, KUBE, {
      name: SHOUTED_NAME,
    });

    expect(again.nameNorm).toBe('kubernetes');
    expect(again.nameNorm).not.toBe(answered.nameNorm);
  });
});

// ---------------------------------------------------------------------------
// A payload replaced
// ---------------------------------------------------------------------------

describe('a payload replaced', () => {
  it('replaces the payload whole rather than merging', async () => {
    // Taken against the one row planted holding attributes, and
    // the replacement drops a member the stored payload carries: a
    // merge answers both and a replacement answers one, which is
    // the whole difference and is invisible over a row that
    // started empty.
    const store = await plantRegistries();
    const answered = await patchEntity(store, ALIASED, {
      attributes: REPLACEMENT_ATTRIBUTES,
    });

    expect(answered.attributes).toEqual(REPLACEMENT_ATTRIBUTES);
    expect(await store.findEntityById(ALIASED)).toEqual(answered);

    // Named rather than implied: the member the stored payload
    // carried and the replacement did not is GONE.
    expect(Object.keys(answered.attributes as object)).toEqual([
      'tier',
    ]);

    // And nothing else on the row moved, which is what says a
    // payload was replaced rather than a subject.
    expect(answered.name).toBe(ALIASED_NAME);
    expect(answered.nameNorm).toBe(ALIASED_KEY);
    expect(answered.aliasOf).toBe(KUBE);
  });

  it('clears every attribute when handed an empty one', async () => {
    // `{}` is a VALUE rather than an absence, so it clears the
    // payload whole, and the row it is taken against is the one
    // that starts with something to clear.
    const store = await plantRegistries();
    const cleared = await patchEntity(store, ALIASED, {
      attributes: {},
    });

    expect(cleared.attributes).toEqual({});
    expect(await store.findEntityById(ALIASED)).toEqual(cleared);

    // The control, varied along the one axis under test: the same
    // patch with the member left OUT, against a registry planted
    // fresh. A service reading `{}` as an absent member leaves the
    // planted payload standing, so it answers this one and the one
    // above identically — and only the pair separates them.
    const fresh = await plantRegistries();
    const absent = await patchEntity(fresh, ALIASED, {
      name: ALIASED_NAME,
    });

    expect(absent.attributes).toEqual(ALIASED_ATTRIBUTES);
  });
});

// ---------------------------------------------------------------------------
// A pointer set and cleared
// ---------------------------------------------------------------------------

describe('a pointer set and cleared', () => {
  it('points a subject at a sibling of its registry', async () => {
    const store = await plantRegistries();
    const answered = await patchEntity(store, KUBE, {
      aliasOf: MESH,
    });

    expect(answered.aliasOf).toBe(MESH);
    expect(await store.findEntityById(KUBE)).toEqual(answered);

    // The TARGET was not written to, which no assertion on the
    // answer could say: a store aiming the two rows at each other
    // answers the same row above.
    const target = await getEntity(store, MESH);

    expect(target.aliasOf).toBeNull();

    // And the pointer moved alone.
    expect(answered.name).toBe('Kubernetes');
    expect(answered.nameNorm).toBe('kubernetes');
    expect(answered.attributes).toEqual({});
  });

  it('clears the pointer back to null', async () => {
    // Taken against the one row planted already pointing
    // somewhere, since a clear applied to a null pointer answers
    // null whatever it does.
    const store = await plantRegistries();
    const before = await getEntity(store, ALIASED);

    expect(before.aliasOf).toBe(KUBE);

    const cleared = await patchEntity(store, ALIASED, {
      aliasOf: null,
    });

    expect(cleared.aliasOf).toBeNull();
    expect(await store.findEntityById(ALIASED)).toEqual(cleared);

    // The control, varied along the one axis under test: the same
    // patch with the member left OUT, against a registry planted
    // fresh. `null` and an absent member are two requests — one
    // clears the pointer and one leaves it — so a service reading
    // them as one passes the assertions above.
    const fresh = await plantRegistries();
    const absent = await patchEntity(fresh, ALIASED, {
      name: ALIASED_NAME,
    });

    expect(absent.aliasOf).toBe(KUBE);
  });
});

// ---------------------------------------------------------------------------
// What has been found out about a subject
// ---------------------------------------------------------------------------

describe('what has been found out about a subject', () => {
  it('answers the passes newest first', async () => {
    // The order is the STORE's and this module deliberately does
    // not re-sort, so what is read here is that the page comes
    // back as it was handed over.
    const store = await plantRegistries();
    const page = await listEntityResearch(store, KUBE, WIDE_WINDOW);
    const answered = page.rows.map((row) => row.id);

    expect(answered).toEqual([THIRD_ID, SECOND_ID, FIRST_ID]);
    expect(page.total).toBe(KUBE_RESEARCH.length);

    // The four orders the answer is NOT, asserted in the same
    // case. Without them a three-row page agrees with its
    // expectation for a reason the fixture handed it rather than
    // because anything ordered anything.
    const planted = KUBE_RESEARCH.map((row) => row.id);

    expect(answered).not.toEqual(planted);
    expect(answered).not.toEqual([...planted].reverse());
    expect(answered).not.toEqual(
      [...answered].sort((left, right) => left - right),
    );
    expect(answered).not.toEqual(
      [...answered].sort((left, right) => right - left),
    );

    // A window narrower than the collection, which is what says
    // the page is a WINDOW at all: the first two rows of that same
    // order, then the third, with a total that goes on describing
    // the whole collection rather than the part answered.
    const head = await listEntityResearch(store, KUBE, {
      limit: 2,
      offset: 0,
    });
    const tail = await listEntityResearch(store, KUBE, {
      limit: 2,
      offset: 2,
    });

    expect(head.rows.map((row) => row.id))
      .toEqual([THIRD_ID, SECOND_ID]);
    expect(tail.rows.map((row) => row.id)).toEqual([FIRST_ID]);
    expect(head.total).toBe(KUBE_RESEARCH.length);
    expect(tail.total).toBe(KUBE_RESEARCH.length);
  });

  it('answers an empty page past the end', async () => {
    // Neither a refusal nor a 404: the subject is there and the
    // window simply selected nothing.
    const store = await plantRegistries();
    const page = await listEntityResearch(store, KUBE, {
      limit: 50,
      offset: KUBE_RESEARCH.length,
    });

    expect(page.rows).toEqual([]);
    expect(page.total).toBe(KUBE_RESEARCH.length);

    // The control, varied along the one axis under test: the same
    // window one row earlier, which answers the oldest pass. A
    // page answering nothing for every offset passes the
    // assertions above and fails this one.
    const last = await listEntityResearch(store, KUBE, {
      limit: 50,
      offset: KUBE_RESEARCH.length - 1,
    });

    expect(last.rows.map((row) => row.id)).toEqual([FIRST_ID]);
    expect(last.total).toBe(KUBE_RESEARCH.length);

    // And the state this one must not be confused with: a subject
    // nothing has researched answers the same empty list, and its
    // total is what tells the two apart.
    const none = await listEntityResearch(store, MESH, WIDE_WINDOW);

    expect(none.rows).toEqual([]);
    expect(none.total).toBe(0);
  });
});
