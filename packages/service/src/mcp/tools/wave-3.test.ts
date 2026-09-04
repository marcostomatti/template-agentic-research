/**
 * The wave-3 tools, driven with no server and no database.
 *
 * THREE KINDS OF READING, and only one of them is about what a
 * handler does. The first is the SCHEMA IDENTITY: every entry
 * `inputSchema` is asserted `Object.is`-identical to the binding
 * its own route module exports, which is the check a structural
 * comparison cannot make. A copy of the schema written out beside
 * the tool would satisfy `toEqual` and would drift the day the
 * route grows a member — so the pairing below is one row per
 * tool, and the row set is held EQUAL to the entry set so a tool
 * added without a row fails NAMING itself rather than passing
 * unread.
 *
 * THE PAIRING NEEDS THE DISTINCTNESS CASE BESIDE IT. Nine rows
 * each asserting an identity are all satisfied by a surface where
 * one schema is shared by everything, since the failing rows would
 * name the schema and not the fault; the case asserting nine
 * DISTINCT schema objects is what rules that out, and the case
 * asserting the entries are the ones `MCP_TOOLS` holds is what
 * says this list reached the registry at all.
 *
 * THE SECOND IS THE COMPOSITION OF THE TWO SCHEMAS THAT READ A
 * WINDOW. `findings.list` and `spend.summary` inherit the
 * object-level check that refuses a `since` at or after its
 * `until`, and zod carries such a check outwards only — so the
 * spread the other seven use would have dropped it silently,
 * every other reading in this file being identical under both
 * spellings. One case drives both tools at an inverted window
 * and reads a refusal, with the same two bounds the right way
 * round accepted beside it as its own control.
 *
 * THE THIRD IS THE NINE READS, EACH DRIVEN TWICE. Every read tool
 * is asked one question it must answer with something and one it
 * must answer with nothing, IN THE SAME CASE — because an empty
 * answer is also what a tool that had stopped reading anything
 * would give, and a case holding only the empty half is satisfied
 * by that. The non-empty half is the in-case positive control for
 * the empty one, and the two are read off the same fixture through
 * the same handler.
 *
 * AN EMPTY ANSWER IS NOT ALWAYS AN EMPTY PAGE, so what the pair is
 * differs by what the route answers and is worth saying rather than
 * leaving a reader to infer. The five collections pair a populated
 * page against an empty one. The two single gets over a resource
 * that EMBEDS collections pair a subject carrying them against one
 * carrying none — a finding nobody has judged, cited or attributed,
 * and a pass that ledgered nothing. `entities.get` has no embedded
 * collection at all, so its pair is a row carrying its two optional
 * members against one carrying neither. And the spend summary pairs
 * a window holding calls against one holding none.
 *
 * AN EMPTY PAGE AND A REFUSAL ARE DIFFERENT ANSWERS, and each
 * address-taking pair says so in its own case: the empty half
 * addresses something the fixture really holds, and a sibling
 * assertion drives the same tool at an address nothing carries and
 * reads a refusal. Without it, `answers nothing` would be
 * indistinguishable from `never resolved`.
 *
 * THE FIXTURE PLANTS A SECOND DOMAIN, so every scoped read has
 * something it must NOT answer and, at the same time, an address
 * that resolves to an empty collection rather than to a `404`.
 * Without it a tool that ignored the slug entirely would agree with
 * every assertion in this file, and no empty page could be told
 * from a missing lookup.
 *
 * THE CLOCK IS FIXED, which is what lets the spend window be
 * asserted at all: a handler reading `Date.now()` instead of
 * {@link McpToolContext.clock} would close its default window on an
 * instant no assertion here could have named. The STORE reads the
 * same instant, which is what lets an approval stamp be asserted:
 * both gates write `coalesce(<column>, now())`.
 *
 * THE FOURTH IS THE THREE WRITES, AND EACH IS READ BACK OFF THE
 * STORE RATHER THAN OUT OF ITS OWN ANSWER. A ruling is asserted as
 * a whole-row diff against what was there before it, so a write
 * that also moved a column nobody asked about is reported where a
 * member-by-member reading would pass; and the answer is held
 * against the row the store kept, so the two members no request
 * carried are what make the response a reading of the write.
 *
 * THE VERDICT LADDER IS THE DOMAIN'S, AND TWO CASES SAY SO FROM
 * OPPOSITE SIDES. {@link RADAR} declares a ladder carrying a member
 * the default vocabulary has not and retiring one it has, so a
 * service holding the constant refuses the accepted case and
 * accepts the refused one. Neither case alone could tell the two
 * apart, which is why the pair is written as a pair.
 *
 * THE REFUSAL NAMES WHAT MAY BE SAID AND NEVER WHAT WAS. The
 * accepted set travels in the DETAIL rather than in the envelope
 * sentence, so the case reads it there, holds every declared member
 * against it, and counts the submitted verdict in all three
 * channels a refusal can be read through — with the same function
 * counting it once in the input, so the three zeros are a reading
 * rather than a search over nothing planted.
 *
 * THE TWO GATES ANSWER ONE PROJECTION AND PART ON ONE THING. Both
 * cases assert the answered member SET whole rather than the four
 * members they expect, which is what reports a `Ruling` that grew a
 * fifth; and a sibling case rules twice at each gate, where
 * ratifying answers the first ruling again and applying is refused.
 *
 * Mutation grid, measured over the thirty-four cases here with
 * `--reporter=json` and read as the failed case SET rather than as
 * a count. Thirty legs, the whole grid run TWICE with the two
 * passes sets diffed member for member and nothing moving.
 *
 * THE EIGHTEEN CARRIED IN FROM THE READ-ONLY REVISION WERE RE-RUN
 * AGAINST HEAD'S COPY OF THIS FILE AND AGAINST THE TIP, and every
 * one of the eighteen sets is IDENTICAL on both sides — 18 of 18,
 * member for member, nothing gained and nothing lost. That is the
 * reading a figure comparison cannot give, and here it says the
 * eleven cases this task added touch no route the reads own.
 *
 * FOUR ARE ABOUT THE PAIRING. Pointing one entry at a SIBLING
 * schema object reddens 2 — its own row and the distinctness case,
 * which is the member no single row could have reported — and it
 * is an identical PAIR told apart only by which row fails
 * (`findings.get` onto the list schema, and `runs.get` onto its
 * own list, both 2). Renaming an entry out of the pairing reddens
 * 3: its row, the set equality beside it, and the driven case that
 * throws in {@link toolNamed}, so a tool added without a row fails
 * NAMING itself. And emptying the registry spread reddens the
 * carried-whole case alone.
 *
 * TWELVE ARE ABOUT THE NINE READS, and each of the eleven aimed at
 * one entry reddens exactly the one case that entry is driven in.
 * Ignoring the slug on the findings list, ignoring it on the
 * documents list, ignoring the address on the research page,
 * ignoring it on the pending queue, ignoring the `domain` on the
 * runs page, dropping the category narrowing, dropping the
 * parse-status narrowing, reading the wall clock in place of
 * {@link McpToolContext.clock}, and answering `ok({ id })` in
 * place of the stored answer on each of the three single gets:
 * eleven legs, 1 of 34 apiece. The twelfth is the page `meta`,
 * answered with a `perPage` of the handler own choosing, which
 * reddens all 5 of the paginated cases — that leg is what says
 * every list echoes the window it was ASKED for.
 *
 * TWO ARE ABOUT THE COMPOSITION OF THE TWO WINDOWED SCHEMAS, and
 * they land on the one case written for it. Spreading
 * `findingListToolInputSchema` into a fresh strict object rather
 * than extending the query, and spreading `spendQuerySchema` in
 * place of aliasing it, each reddens the inverted-window case and
 * nothing else — every other reading in this file is identical
 * under both spellings, which is exactly why that case exists.
 *
 * TWELVE ARE ABOUT THE THREE WRITES. Answering the ruling
 * arguments rebuilt around an id rather than the stored row reddens
 * the append case alone (1); a member-by-member comparison could
 * not have reported it, every member asserted having come from the
 * request, and what does is holding the answer against the store
 * own read. Judging by {@link DEFAULT_VERDICT_VOCABULARY} in place
 * of the domain row reddens 4 — the three verdict cases and the
 * undeclared-key control beside them, whose accepted request sends
 * the member only this domain declares.
 *
 * THE TWO REFUSAL LEGS ARE AN IDENTICAL PAIR LANDING ON ONE CASE,
 * told apart only by the assertion that fails inside each:
 * refusing with an EMPTY accepted set (1) reddens the reading that
 * every declared member is named, and appending the SUBMITTED
 * verdict to that set (1) reddens the containment count beside it.
 * The case covers two claims and no fixture here can separate them,
 * so the two figures are recorded as two legs on one case rather
 * than as coverage of each other.
 *
 * DROPPING `.strict()` FROM ANY OF THE THREE TOOL INPUTS reddens
 * the undeclared-key case (1 apiece, three legs). It is NOT a
 * second guard over the service one: a non-strict zod object STRIPS
 * the key rather than forwarding it, so the service is handed a
 * clean body and the call succeeds — which is the opposite of what
 * a reader would predict from the wave-2 note about a tool re-parse
 * being free.
 *
 * ANSWERING `ok({ id })` FROM EITHER GATE reddens that gate own
 * ruling case (1 apiece), and answering a FIFTH member from
 * `Ruling` reddens BOTH (2) — which is the leg that says the
 * member-SET assertion is doing work a `toMatchObject` over the
 * four could not. Refusing no ruling at all reddens 2: the
 * cross-parent case and the second-ruling one, which are the two
 * whose subject is the shared gate rather than a projection.
 *
 * THE WHOLE-HALF CONTROL FOR THE WRITES HAS NO SURVIVORS. Handing
 * each service the WHOLE parsed input rather than splitting the
 * address off it reddens 8 of 8 write cases — every one of them
 * reaches a service that really parses what it is handed, where a
 * survivor would have been a case asserting something it does not
 * mean.
 *
 * THREE TRAPS MET WHILE MEASURING, recorded so a re-run reproduces
 * the figures rather than a neighbour of them. The findings-slug
 * leg has an anchor that is NOT unique — `query.slug,` followed by
 * `filter,` is byte-identical in the findings handler and in the
 * documents one — so a leg anchored on that pair patches both and
 * reads 2 rather than 1; the figure above is taken with the sort
 * key included in the anchor. The `meta` leg is DEAD when spelled
 * as a `page` of 1, every case here asking for the first page: the
 * mutation has to move a member no request sent the value of. And
 * the spend-schema leg needs a `z` import added in the same patch,
 * `src/runs/spend-routes.ts` importing none — without it vitest
 * collects nothing and the leg reads `0/0`, which a harness scoring
 * `len(failed)` alone records as a clean zero.
 *
 * THE READ-FIRST CLAIM IS NOT THIS FILE'S. Three of the four
 * writers the wave-3 ports declare are reachable from here and the
 * fourth, the entity rewrite, is reachable from nothing this file
 * drives — but what makes that structural is the port types and
 * `tests/invariants/api-read-first.test.ts`, not the absence of a
 * case below.
 */
import type {
  McpToolContext,
  McpToolEntry,
} from './registry.js';
import type { FieldError } from '../../../lib/errors/index.js';
import type {
  MemoryDomainDocument,
  MemoryDomainEntity,
  MemoryDomainFinding,
  MemoryEntityResearch,
  MemoryLlmCall,
  MemoryResearchPoolRow,
  MemoryResearchStore,
  MemoryRun,
  MemorySourceProposal,
} from '../../../tests/helpers/memory-research-store.js';
import type { ZodType } from 'zod';

import { describe, expect, it } from 'vitest';

import { AppError, ValidationError } from '../../../lib/errors/index.js';
import {
  createMemoryResearchStore,
} from '../../../tests/helpers/memory-research-store.js';
import {
  DEFAULT_VERDICT_VOCABULARY,
} from '../../db/schema/values.js';
import {
  documentListToolInputSchema,
} from '../../documents/routes.js';
import {
  entityApproveResearchToolInputSchema,
  entityReadToolInputSchema,
  entityResearchListToolInputSchema,
} from '../../entities/routes.js';
import {
  findingListToolInputSchema,
  findingReadToolInputSchema,
  findingVerdictToolInputSchema,
} from '../../findings/routes.js';
import {
  runListToolInputSchema,
  runReadToolInputSchema,
} from '../../runs/routes.js';
import {
  spendSummaryToolInputSchema,
} from '../../runs/spend-routes.js';
import {
  pendingConfigListToolInputSchema,
  sourceApproveConfigToolInputSchema,
} from '../../sources/proposals-routes.js';

import { MCP_TOOLS } from './registry.js';
import { WAVE_3_TOOLS } from './wave-3.js';

/** The instant a context in this file reports as the present. */
const FIXED_NOW = new Date(Date.UTC(2026, 2, 10));

/** The domain every scoped read below addresses. */
const RADAR = 'radar';

/**
 * A second domain, holding nothing at all.
 *
 * It earns its place twice. Every scoped read here would agree with
 * a tool that ignored the slug if this were the only registry in
 * the fixture; and it is the address the empty half of each
 * domain-scoped pair uses, so an empty page is read off a domain
 * that really exists rather than off one nothing carries.
 */
const ATLAS = 'atlas';

/** A slug in no shape any domain is stored under. */
const MISSING_SLUG = 'zznosuchdomainzz';

/**
 * An id nothing in the fixture carries, for the refusal control.
 *
 * Seven digits, because the cause channel of a refusal renders a
 * STACK and a stack carries line and column numbers — a short id
 * matches one by accident, and a reading that counts it would
 * report a leak the refusal never made.
 */
const MISSING_ID = 9900001;

/**
 * An argument no tool on this wave declares, so a refusal has a
 * subject a case can count.
 */
const SENTINEL = 'zzsentinelzz';

/**
 * The verdict ladder {@link RADAR} declares, and is judged by.
 *
 * NOT the default vocabulary, and that is the point of it. One
 * member is absent from the default and one member of the default
 * is absent from here, so a service holding the constant instead of
 * reading the domain row answers BOTH of the verdict cases below
 * the wrong way round.
 */
const LADDER: readonly string[] = ['watch', 'neutral', 'interested'];

/** The member of that ladder the default vocabulary has not. */
const DOMAIN_ONLY_VERDICT = 'watch';

/** A member of the default vocabulary this domain has retired. */
const RETIRED_VERDICT = 'avoid';

/**
 * A verdict no ladder anywhere carries.
 *
 * Chosen so that no member of {@link LADDER} contains a piece of it
 * and it contains a piece of none: the refusal renders the ACCEPTED
 * SET, so a needle sharing letters with a declared verdict would
 * come back inside that member and read as an echo.
 */
const OUTSIDE_VERDICT = 'zzunrankedzz';

/** The research intention queued about {@link KUBE_ENTITY}. */
const QUEUED_INTENTION = 7900001;

/** A second one, queued about {@link BARE_ENTITY}. */
const OTHER_INTENTION = 7900002;

/** The subject carrying both of its optional members. */
const ALIAS_ENTITY = 7100003;

/** The subject the alias above points at, and which holds passes. */
const KUBE_ENTITY = 7100001;

/** A subject carrying neither optional member and no research. */
const BARE_ENTITY = 7100002;

/** The finding carrying sightings, rulings and research. */
const JUDGED_FINDING = 7200001;

/** A finding carrying none of the three. */
const BARE_FINDING = 7200002;

/** The category key the judged finding is filed under. */
const PEOPLE = 'people';

/** The two documents planted under {@link RADAR}. */
const OK_DOCUMENT = 7300001;

/** The second of them, which did not parse. */
const FAILED_DOCUMENT = 7300002;

/** The two proposals queued against the addressed feed. */
const EARLY_PROPOSAL = 7400001;

/** The later of them, which the queue answers second. */
const LATE_PROPOSAL = 7400002;

/** A proposal already applied, so its feed queue is empty. */
const APPLIED_PROPOSAL = 7400003;

/** The pass that spent, and whose ledger is read back. */
const PASS_RUN = 7500001;

/** A maintenance tick belonging to no domain and spending none. */
const TICK_RUN = 7500002;

/** The two calls the pass ledgered. */
const FIRST_CALL = 7600001;

/** The second of them, a day later so the buckets are two. */
const SECOND_CALL = 7600002;

/** The day {@link FIRST_CALL} was made. */
const FIRST_CALL_AT = Date.UTC(2026, 2, 1, 4, 5, 6);

/** The day {@link SECOND_CALL} was made, one UTC day later. */
const SECOND_CALL_AT = Date.UTC(2026, 2, 2, 7, 8, 9);

/** The lower bound of the ordered window both windowed tools take. */
const EARLIER_BOUND = '2026-02-01T00:00:00.000Z';

/** Its upper bound, which an inverted window sends as the lower. */
const LATER_BOUND = '2026-02-20T00:00:00.000Z';

/** A window before either call, for the empty summary. */
const QUIET_SINCE = '2026-01-05T00:00:00.000Z';

/** Its upper bound, five days on and still before the ledger. */
const QUIET_UNTIL = '2026-01-10T00:00:00.000Z';

/**
 * What a member named for money would read like.
 *
 * No `g` flag: a shared global pattern advances its own
 * `lastIndex` between calls, so the same name answers differently
 * on the second ask.
 */
const MONEY_PATTERN = /cost|price|usd|rate|amount/i;

/** One entry and the schema its route module exports. */
interface SchemaPairing {
  /** The tool, by name. */
  readonly name: string;

  /** The binding its `inputSchema` has to BE. */
  readonly schema: ZodType;
}

/**
 * Every entry, paired with the export it must be identical to.
 *
 * Written out rather than derived: a derivation would read the
 * entry own member and compare it against itself.
 */
const DECLARED_SCHEMAS: readonly SchemaPairing[] = [
  { name: 'findings.list', schema: findingListToolInputSchema },
  { name: 'findings.get', schema: findingReadToolInputSchema },
  { name: 'documents.list', schema: documentListToolInputSchema },
  { name: 'entities.get', schema: entityReadToolInputSchema },
  {
    name: 'entity-research.list',
    schema: entityResearchListToolInputSchema,
  },
  {
    name: 'pending-configs.list',
    schema: pendingConfigListToolInputSchema,
  },
  { name: 'runs.list', schema: runListToolInputSchema },
  { name: 'runs.get', schema: runReadToolInputSchema },
  { name: 'spend.summary', schema: spendSummaryToolInputSchema },
  { name: 'findings.verdict', schema: findingVerdictToolInputSchema },
  {
    name: 'entities.approve-research',
    schema: entityApproveResearchToolInputSchema,
  },
  {
    name: 'sources.approve-config',
    schema: sourceApproveConfigToolInputSchema,
  },
];

/**
 * The entry a case is about.
 *
 * @param name - What it is registered under.
 * @returns The entry.
 * @throws When no entry carries the name, so a renamed tool fails
 *   here naming the name it was looked up by rather than further
 *   along as a member read off `undefined`.
 */
function toolNamed(name: string): McpToolEntry {
  const found = WAVE_3_TOOLS.find((entry) => entry.name === name);

  if (found === undefined) {
    throw new Error(`no wave-3 tool is registered as ${name}`);
  }

  return found;
}

/** What one handler answered, once its text block is parsed. */
interface ToolAnswer {
  /** The envelope discriminator. */
  readonly success: boolean;

  /** The resource or the page. */
  readonly data: unknown;

  /** The window, on a paginated answer. */
  readonly meta?: unknown;
}

/**
 * Runs one tool and reads its single block as an envelope.
 *
 * @param entry - The tool.
 * @param context - What it is handed besides its input.
 * @param input - The arguments.
 * @returns The parsed envelope.
 * @throws When the tool answered no block at all.
 */
async function answerOf(
  entry: McpToolEntry,
  context: McpToolContext,
  input: unknown,
): Promise<ToolAnswer> {
  const result = await entry.handler(context, input);
  const [block] = result.content;

  if (block === undefined) {
    throw new Error('the tool answered no content block');
  }

  expect(result.content).toHaveLength(1);
  expect(block.type).toBe('text');

  return JSON.parse(block.text) as ToolAnswer;
}

/**
 * Runs a call that has to be refused, and hands the refusal back.
 *
 * @param run - The call.
 * @returns The `AppError` it raised.
 * @throws When the call ANSWERED, so a refusal that quietly stopped
 *   happening fails here naming the refusal it wanted; anything
 *   that is not an `AppError` is rethrown unchanged.
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
 * How many times one needle appears in one haystack.
 *
 * @param haystack - The rendered channel.
 * @param needle - What to look for.
 * @returns The count, overlapping occurrences included.
 */
function countOccurrences(haystack: string, needle: string): number {
  let found = 0;
  let at = haystack.indexOf(needle);

  while (at !== -1) {
    found += 1;
    at = haystack.indexOf(needle, at + 1);
  }

  return found;
}

/**
 * A refusal rendered as the three channels a caller can read.
 *
 * @param err - The refusal.
 * @returns The message, the details and the cause, separately — a
 *   joined blob would hide which one leaked, and a stack repeats
 *   the message it was raised with.
 */
function channelsOf(err: AppError): readonly string[] {
  const cause = err.cause;
  const rendered = cause instanceof Error
    ? `${cause.name} ${cause.message} ${cause.stack ?? ''}`
    : String(cause ?? '');

  return [err.message, JSON.stringify(err.details ?? []), rendered];
}

/** One fault a refusal named, as this file reads it. */
interface NamedFault {
  /** The field path the detail carries. */
  readonly field: string;

  /**
   * The token it was refused under.
   *
   * Optional exactly as `FieldError` declares it, so a detail
   * raised without one is comparable rather than a type fault.
   */
  readonly code?: string;
}

/**
 * The `{ field, code }` pairs one refusal named.
 *
 * @param err - The refusal.
 * @returns One pair per detail, in the order they were raised.
 */
function faultsOf(err: AppError): readonly NamedFault[] {
  const details = (err.details ?? []) as readonly FieldError[];

  return details.map((one) => ({ field: one.field, code: one.code }));
}

/** The rows an answered page carries. */
function rowsOf(data: unknown): readonly Record<string, unknown>[] {
  return data as readonly Record<string, unknown>[];
}

/** The members of an answered resource. */
function fieldsOf(data: unknown): Record<string, unknown> {
  return data as Record<string, unknown>;
}

/**
 * The ids a page answered, in the order it answered them.
 *
 * @param data - The page envelope `data` member.
 * @returns One id per row.
 */
function idsOf(data: unknown): readonly unknown[] {
  return rowsOf(data).map((row) => row.id);
}

/** Builds one registry row for {@link plantSurface}. */
function registered(
  id: number,
  name: string,
  nameNorm: string,
  values: Partial<MemoryDomainEntity> = {},
): MemoryDomainEntity {
  return {
    id,
    name,
    nameNorm,
    aliasOf: values.aliasOf ?? null,
    attributes: values.attributes ?? {},
  };
}

/** Builds one proposal row for {@link plantSurface}. */
function proposed(
  id: number,
  sourceId: number,
  values: Partial<MemorySourceProposal> = {},
): MemorySourceProposal {
  return {
    id,
    sourceId,
    parserConfig: { fields: { title: { selector: 'h1' } } },
    contract: { requires: ['title'] },
    proposedBy: 'ar-research',
    status: values.status ?? 'pending',
    proposedAt: values.proposedAt ?? new Date(Date.UTC(2026, 1, 1)),
    approvedAt: values.approvedAt ?? null,
    appliedAt: values.appliedAt ?? null,
  };
}

/**
 * The names in a list that read as money.
 *
 * A declaration rather than an arrow, because
 * `@stylistic/implicit-arrow-linebreak` leaves a nested arrow no
 * wrapped form at this width.
 *
 * @param names - Every member name, at every level of an answer.
 * @returns The ones a reader would take for a currency.
 */
function moneyish(names: readonly string[]): readonly string[] {
  return names.filter((one) => MONEY_PATTERN.test(one));
}

/** What {@link plantSurface} answers. */
interface PlantedSurface {
  /** The fixture store, so a case can read a planted row back. */
  readonly store: MemoryResearchStore;

  /** What a handler is handed. */
  readonly context: McpToolContext;

  /** The feed whose pending queue one tool reads. */
  readonly feedId: number;

  /** A feed whose only proposal is already applied. */
  readonly drainedFeedId: number;

  /** A feed under {@link ATLAS}, which {@link RADAR} must not hold. */
  readonly otherFeedId: number;
}

/**
 * The smallest fixture every case here can be reached from.
 *
 * Two domains, and only one of them holds anything: {@link ATLAS}
 * is the address every domain-scoped empty half uses, so a page
 * answering nothing is read off a registry that resolves rather
 * than off one no row carries. It holds one feed all the same, so
 * the sources half has a scoping reading of its own.
 *
 * Under {@link RADAR}: two findings, one carrying all three of the
 * collections a single get embeds and one carrying none; two
 * documents, one of each parse status; three registry subjects, of
 * which one carries both optional members, one carries neither and
 * one holds the research; two queued research intentions, one about
 * each of two subjects; two feeds, one with a queue and one whose
 * only proposal is applied; and two passes, one that spent and one
 * belonging to no domain that spent nothing.
 *
 * {@link RADAR} DECLARES ITS OWN VERDICT LADDER, which the second
 * registry does not. That is what makes the two verdict cases
 * readings rather than restatements of the default: the ladder here
 * carries a member the default has not and has retired one the
 * default carries, so a ruling judged against the constant is
 * refused where it should land and accepted where it should not.
 *
 * THE STORE READS THE SAME FIXED INSTANT THE CONTEXT DOES, which
 * is what lets an approval stamp be asserted at all: both gates
 * write `coalesce(<column>, now())`, and `now()` here is the clock
 * this fixture handed in rather than the wall.
 *
 * THE SECOND INTENTION IS THE CROSS-PARENT CONTROL. Every ruling
 * below names a row in its body and a parent in its address, so a
 * fixture holding one queued row per gate could not tell a gate
 * that compares the two from one that ratifies whatever it is
 * handed.
 *
 * @returns The store, a context over it, and the three feed ids,
 *   which are addresses a request cannot be composed without.
 */
async function plantSurface(): Promise<PlantedSurface> {
  const store = createMemoryResearchStore({ now: () => FIXED_NOW });
  const context: McpToolContext = { store, clock: () => FIXED_NOW };
  const radar = await store.insertDomain({
    slug: RADAR,
    name: 'Radar',
    settings: { verdictVocabulary: [...LADDER] },
  });
  const atlas = await store.insertDomain({
    slug: ATLAS,
    name: 'Atlas',
    settings: {},
  });
  const findings: readonly MemoryDomainFinding[] = [
    {
      id: JUDGED_FINDING,
      documentId: OK_DOCUMENT,
      entityId: KUBE_ENTITY,
      fields: { category: PEOPLE },
      score: 0.9,
      scoreVersion: 1,
      createdAt: new Date(Date.UTC(2026, 2, 1)),
    },
    {
      id: BARE_FINDING,
      documentId: FAILED_DOCUMENT,
      entityId: null,
      fields: {},
      score: null,
      scoreVersion: null,
      createdAt: new Date(Date.UTC(2026, 2, 2)),
    },
  ];
  const documents: readonly MemoryDomainDocument[] = [
    {
      id: OK_DOCUMENT,
      sourceId: null,
      url: 'https://feed.example/one',
      body: 'a capture that parsed',
      parseStatus: 'ok',
      parseError: null,
      capturedAt: new Date(Date.UTC(2026, 2, 1, 1)),
    },
    {
      id: FAILED_DOCUMENT,
      sourceId: null,
      url: 'https://feed.example/two',
      body: 'a capture that would not parse',
      parseStatus: 'failed',
      parseError: 'the contract named a field the payload has not',
      capturedAt: new Date(Date.UTC(2026, 2, 2, 1)),
    },
  ];
  const research: readonly MemoryEntityResearch[] = [
    {
      id: 7700001,
      runId: PASS_RUN,
      summary: 'what a pass made of it',
      payload: { depth: 1 },
      researchedAt: new Date(Date.UTC(2026, 2, 1, 2)),
    },
    {
      id: 7700002,
      runId: null,
      summary: null,
      payload: { depth: 2 },
      researchedAt: new Date(Date.UTC(2026, 2, 2, 2)),
    },
  ];
  const pool: readonly MemoryResearchPoolRow[] = [
    {
      id: QUEUED_INTENTION,
      entityId: KUBE_ENTITY,
      findingId: JUDGED_FINDING,
      status: 'pending',
      searchTerms: ['kubernetes'],
      createdAt: new Date(Date.UTC(2026, 1, 1)),
      approvedAt: null,
      researchedAt: null,
    },
    {
      id: OTHER_INTENTION,
      entityId: BARE_ENTITY,
      findingId: null,
      status: 'pending',
      searchTerms: ['service mesh'],
      createdAt: new Date(Date.UTC(2026, 1, 2)),
      approvedAt: null,
      researchedAt: null,
    },
  ];
  const runs: readonly MemoryRun[] = [
    {
      id: PASS_RUN,
      domainId: radar.id,
      startedAt: new Date(FIRST_CALL_AT),
      finishedAt: null,
      status: 'ok',
      counts: { findings: 2 },
      errors: [],
      scheduledBy: 'interval',
    },
    {
      id: TICK_RUN,
      domainId: null,
      startedAt: new Date(SECOND_CALL_AT),
      finishedAt: null,
      status: 'ok',
      counts: {},
      errors: [],
      scheduledBy: 'operator',
    },
  ];
  const calls: readonly MemoryLlmCall[] = [
    {
      id: FIRST_CALL,
      runId: PASS_RUN,
      node: 'capture',
      model: 'a-model',
      promptChars: 100,
      estTokens: 25,
      calledAt: new Date(FIRST_CALL_AT),
    },
    {
      id: SECOND_CALL,
      runId: PASS_RUN,
      node: 'score',
      model: null,
      promptChars: 200,
      estTokens: 50,
      calledAt: new Date(SECOND_CALL_AT),
    },
  ];
  const feed = await store.insertSource({
    domainId: radar.id,
    kind: 'rss',
    endpoint: 'https://feed.example/rss',
    parserConfig: {},
    contract: {},
    enabled: true,
  });
  const drained = await store.insertSource({
    domainId: radar.id,
    kind: 'api',
    endpoint: 'https://feed.example/items',
    parserConfig: {},
    contract: {},
    enabled: true,
  });
  const otherFeed = await store.insertSource({
    domainId: atlas.id,
    kind: 'rss',
    endpoint: 'https://atlas.example/rss',
    parserConfig: {},
    contract: {},
    enabled: true,
  });

  store.setDomainFindings(radar.id, findings);
  store.setDomainDocuments(radar.id, documents);
  store.setDomainEntities(radar.id, [
    registered(KUBE_ENTITY, 'Kubernetes', 'kubernetes'),
    registered(BARE_ENTITY, 'Service Mesh', 'service mesh'),
    registered(ALIAS_ENTITY, 'K8s', 'k8s', {
      aliasOf: KUBE_ENTITY,
      attributes: { kind: 'abbreviation' },
    }),
  ]);
  store.setEntityResearch(KUBE_ENTITY, research);
  store.setDomainPool(radar.id, pool);
  store.setFindingSightings(JUDGED_FINDING, [{
    id: 7800001,
    sourceId: feed.id,
    externalId: 'radar-11',
    seenAt: new Date(Date.UTC(2026, 2, 1, 3)),
  }]);
  store.setDomainProposals(radar.id, [
    proposed(LATE_PROPOSAL, feed.id, {
      proposedAt: new Date(Date.UTC(2026, 1, 2)),
    }),
    proposed(EARLY_PROPOSAL, feed.id),
    proposed(APPLIED_PROPOSAL, drained.id, {
      status: 'done',
      approvedAt: new Date(Date.UTC(2026, 1, 3)),
      appliedAt: new Date(Date.UTC(2026, 1, 4)),
    }),
  ]);
  store.setRuns(runs);
  store.setLlmCalls(calls);

  await store.insertFindingLabel({
    findingId: JUDGED_FINDING,
    verdict: 'neutral',
    note: null,
  });
  await store.insertFindingLabel({
    findingId: JUDGED_FINDING,
    verdict: 'interested',
    note: 'read again',
  });

  return {
    store,
    context,
    feedId: feed.id,
    drainedFeedId: drained.id,
    otherFeedId: otherFeed.id,
  };
}

describe('every entry takes its route module own schema', () => {
  // The identity, one row per tool. Object.is and not toEqual: a
  // restated copy of the schema satisfies the second and is the
  // exact state this rule exists to catch.
  it.each(DECLARED_SCHEMAS)('$name imports its schema', (row) => {
    expect(toolNamed(row.name).inputSchema).toBe(row.schema);
  });

  // The rows and the entries are one set, so a tool registered
  // without a pairing fails here naming itself rather than going
  // unread, and a pairing left behind by a deleted tool throws in
  // toolNamed.
  it('pairs every registered entry and no other', () => {
    const paired = DECLARED_SCHEMAS.map((row) => row.name).sort();
    const registeredNames = WAVE_3_TOOLS.map((entry) => entry.name).sort();

    expect(registeredNames.length).toBeGreaterThan(0);
    expect(paired).toEqual(registeredNames);
  });

  // What the nine identities cannot say on their own: no two
  // entries lean on one schema object, and no two name one route.
  it('gives no two entries one schema object', () => {
    const schemas = new Set(WAVE_3_TOOLS.map((e) => e.inputSchema));
    const routes = new Set(WAVE_3_TOOLS.map((e) => e.route));

    expect(schemas.size).toBe(WAVE_3_TOOLS.length);
    expect(routes.size).toBe(WAVE_3_TOOLS.length);
  });

  // And that the list reached the registry, which is the one thing
  // a reader of this file would otherwise assume.
  it('is carried whole by the registry', () => {
    const missing = WAVE_3_TOOLS.filter((e) => !MCP_TOOLS.includes(e));

    expect(WAVE_3_TOOLS.length).toBeGreaterThan(0);
    expect(missing).toEqual([]);
  });
});

describe('the two schemas that read a window', () => {
  // The one reading that says those two are composed by EXTENDING
  // the query rather than by spreading it into a fresh object.
  // Both forms refuse every undeclared key and both accept every
  // ordered window, so nothing else in this file can tell them
  // apart; a spread would have dropped the object-level check and
  // answered a page over a window its own route refuses.
  it('refuses a since at or after its until', async () => {
    const planted = await plantSurface();
    const inverted = { since: LATER_BOUND, until: EARLIER_BOUND };
    const listed = await refusalFrom(async () => answerOf(
      toolNamed('findings.list'),
      planted.context,
      { slug: RADAR, ...inverted },
    ));
    const summed = await refusalFrom(async () => answerOf(
      toolNamed('spend.summary'),
      planted.context,
      inverted,
    ));

    expect(listed).toBeInstanceOf(AppError);
    expect(summed).toBeInstanceOf(AppError);

    // The control, varied along each row own axis: the same two
    // bounds the right way round are accepted by both, so the
    // refusals are about the ORDER and not about the members
    // being read at all.
    const ordered = { since: EARLIER_BOUND, until: LATER_BOUND };
    const listing = toolNamed('findings.list');
    const page = await answerOf(listing, planted.context, {
      slug: RADAR,
      ...ordered,
    });
    const summary = await answerOf(
      toolNamed('spend.summary'),
      planted.context,
      ordered,
    );

    expect(page.success).toBe(true);
    expect(summary.success).toBe(true);
  });
});

describe('the findings reads, driven', () => {
  it('answers one domain findings and another domain none', async () => {
    const planted = await plantSurface();
    const entry = toolNamed('findings.list');
    const mine = await answerOf(entry, planted.context, { slug: RADAR });
    const theirs = await answerOf(entry, planted.context, { slug: ATLAS });

    // The non-empty half, which is the in-case control for the
    // empty one: the same tool over the same fixture answers rows.
    expect(mine.success).toBe(true);
    expect(idsOf(mine.data)).toEqual([JUDGED_FINDING, BARE_FINDING]);
    expect(mine.meta).toEqual({
      page: 1,
      perPage: 50,
      total: 2,
      totalPages: 1,
    });

    // The empty half, read off a domain that RESOLVES, so nothing
    // here can be a lookup that failed.
    expect(theirs.success).toBe(true);
    expect(rowsOf(theirs.data)).toEqual([]);
    expect(theirs.meta).toEqual({
      page: 1,
      perPage: 50,
      total: 0,
      totalPages: 0,
    });

    // The control that separates the two answers above from a
    // third: a slug no domain carries is REFUSED rather than
    // answered emptily.
    const err = await refusalFrom(async () => answerOf(
      entry,
      planted.context,
      { slug: MISSING_SLUG },
    ));

    expect(err).toBeInstanceOf(AppError);
  });

  it('narrows the page to the category it was sent', async () => {
    const planted = await plantSurface();
    const entry = toolNamed('findings.list');
    const filed = await answerOf(entry, planted.context, {
      slug: RADAR,
      category: PEOPLE,
    });
    const undeclared = await answerOf(entry, planted.context, {
      slug: RADAR,
      category: 'zzunfiledzz',
    });

    // A key the fixture files a finding under answers that finding
    // alone, and one the domain never declared answers nothing —
    // which is a page rather than a refusal, the category being a
    // member of a payload and not a resource.
    expect(idsOf(filed.data)).toEqual([JUDGED_FINDING]);
    expect(rowsOf(undeclared.data)).toEqual([]);
  });

  it('answers one finding with three lists and one with none', async () => {
    const planted = await plantSurface();
    const entry = toolNamed('findings.get');
    const judged = await answerOf(entry, planted.context, {
      id: JUDGED_FINDING,
    });
    const bare = await answerOf(entry, planted.context, {
      id: BARE_FINDING,
    });
    const full = fieldsOf(judged.data);
    const empty = fieldsOf(bare.data);

    // The non-empty half. Two rulings, newest first, so the
    // embedded list is an order as well as a count.
    expect(fieldsOf(full.finding).id).toBe(JUDGED_FINDING);
    expect(rowsOf(full.sightings)).toHaveLength(1);
    expect(rowsOf(full.labels).map((row) => row.verdict))
      .toEqual(['interested', 'neutral']);
    expect(rowsOf(full.research)).toHaveLength(2);

    // The empty half: all three at once, which is a state rather
    // than a gap — nobody judged it, no feed cited it again and
    // it is attributed to no subject.
    expect(fieldsOf(empty.finding).id).toBe(BARE_FINDING);
    expect(empty.sightings).toEqual([]);
    expect(empty.labels).toEqual([]);
    expect(empty.research).toEqual([]);

    // The control: an id no finding carries is refused, so the
    // three empty lists above are a finding and not a miss.
    const err = await refusalFrom(async () => answerOf(
      entry,
      planted.context,
      { id: MISSING_ID },
    ));

    expect(err).toBeInstanceOf(AppError);
  });
});

describe('the documents read, driven', () => {
  it('answers one domain corpus and another domain none', async () => {
    const planted = await plantSurface();
    const entry = toolNamed('documents.list');
    const mine = await answerOf(entry, planted.context, { slug: RADAR });
    const theirs = await answerOf(entry, planted.context, { slug: ATLAS });
    const failed = await answerOf(entry, planted.context, {
      slug: RADAR,
      parseStatus: 'failed',
    });

    // The non-empty half carries BOTH parse statuses, which is
    // what says a failed capture is in the default page rather
    // than behind a flag.
    expect(idsOf(mine.data)).toEqual([FAILED_DOCUMENT, OK_DOCUMENT]);
    expect(idsOf(failed.data)).toEqual([FAILED_DOCUMENT]);

    // `bodyBytes` is the SERVICE member rather than the port one,
    // so its presence says the tool reached the same layer the
    // route reaches and not the store beneath it.
    expect(rowsOf(mine.data)[0]).toHaveProperty('bodyBytes');
    expect(rowsOf(mine.data)[0]).toHaveProperty('bodyTruncated');

    // The empty half, off a domain that resolves.
    expect(theirs.success).toBe(true);
    expect(rowsOf(theirs.data)).toEqual([]);
    expect(theirs.meta).toEqual({
      page: 1,
      perPage: 50,
      total: 0,
      totalPages: 0,
    });

    // The control: a slug nothing carries is refused.
    const err = await refusalFrom(async () => answerOf(
      entry,
      planted.context,
      { slug: MISSING_SLUG },
    ));

    expect(err).toBeInstanceOf(AppError);
  });
});

describe('the entity reads, driven', () => {
  it('answers a subject with both options and one without', async () => {
    const planted = await plantSurface();
    const entry = toolNamed('entities.get');
    const full = fieldsOf((await answerOf(entry, planted.context, {
      id: ALIAS_ENTITY,
    })).data);
    const bare = fieldsOf((await answerOf(entry, planted.context, {
      id: BARE_ENTITY,
    })).data);

    // The non-empty half: a subject pointing at a sibling and
    // carrying a payload, so both members that can be absent are
    // present here.
    expect(full.id).toBe(ALIAS_ENTITY);
    expect(full.aliasOf).toBe(KUBE_ENTITY);
    expect(full.attributes).toEqual({ kind: 'abbreviation' });

    // The `nameNorm` no caller can submit is answerable, which is
    // the one member of a registry row a reader would expect to be
    // projected away.
    expect(full.nameNorm).toBe('k8s');

    // The empty half, in the sense a single resource has one.
    expect(bare.id).toBe(BARE_ENTITY);
    expect(bare.aliasOf).toBeNull();
    expect(bare.attributes).toEqual({});

    // The control: an id no subject carries is refused, so the
    // nulls above are a row and not a miss.
    const err = await refusalFrom(async () => answerOf(
      entry,
      planted.context,
      { id: MISSING_ID },
    ));

    expect(err).toBeInstanceOf(AppError);
  });

  it('answers one subject passes and another subject none', async () => {
    const planted = await plantSurface();
    const entry = toolNamed('entity-research.list');
    const held = await answerOf(entry, planted.context, {
      id: KUBE_ENTITY,
    });
    const none = await answerOf(entry, planted.context, {
      id: BARE_ENTITY,
    });

    // The non-empty half, newest first, so the page is an order as
    // well as a count.
    expect(idsOf(held.data)).toEqual([7700002, 7700001]);
    expect(held.meta).toEqual({
      page: 1,
      perPage: 50,
      total: 2,
      totalPages: 1,
    });

    // The empty half, off a subject the registry really holds.
    expect(none.success).toBe(true);
    expect(rowsOf(none.data)).toEqual([]);

    // The control: an id no subject carries is refused, so the
    // empty page above is a subject with nothing found out about
    // it rather than a lookup that failed.
    const err = await refusalFrom(async () => answerOf(
      entry,
      planted.context,
      { id: MISSING_ID },
    ));

    expect(err).toBeInstanceOf(AppError);
  });
});

describe('the pending-config read, driven', () => {
  it('answers one feed backlog and a drained feed none', async () => {
    const planted = await plantSurface();
    const entry = toolNamed('pending-configs.list');
    const queued = await answerOf(entry, planted.context, {
      id: planted.feedId,
    });
    const drained = await answerOf(entry, planted.context, {
      id: planted.drainedFeedId,
    });
    const theirs = await answerOf(entry, planted.context, {
      id: planted.otherFeedId,
    });

    // The non-empty half, OLDEST first, which is the order the CLI
    // drains the same queue in — the two clients are told the same
    // proposal is next.
    expect(idsOf(queued.data)).toEqual([EARLY_PROPOSAL, LATE_PROPOSAL]);
    expect(queued.meta).toEqual({
      page: 1,
      perPage: 50,
      total: 2,
      totalPages: 1,
    });

    // The empty half is about the PREDICATE and not about the
    // address: the drained feed holds a proposal, and it is not
    // pending.
    expect(rowsOf(drained.data)).toEqual([]);
    expect(await planted.store.findProposalById(APPLIED_PROPOSAL))
      .not.toBeNull();

    // And the scoping half: a feed under the other domain answers
    // nothing of this one backlog.
    expect(rowsOf(theirs.data)).toEqual([]);

    // The control: an id no feed carries is refused.
    const err = await refusalFrom(async () => answerOf(
      entry,
      planted.context,
      { id: MISSING_ID },
    ));

    expect(err).toBeInstanceOf(AppError);
  });
});

describe('the runs reads, driven', () => {
  it('answers every pass and a quiet domain none', async () => {
    const planted = await plantSurface();
    const entry = toolNamed('runs.list');
    const every = await answerOf(entry, planted.context, {});
    const mine = await answerOf(entry, planted.context, { domain: RADAR });
    const theirs = await answerOf(entry, planted.context, {
      domain: ATLAS,
    });

    // The non-empty half. An absent `domain` widens, so the page
    // carries the domain-less tick as well — there being no
    // spelling on either protocol that asks for that one alone.
    expect(idsOf(every.data)).toEqual([TICK_RUN, PASS_RUN]);
    expect(idsOf(mine.data)).toEqual([PASS_RUN]);

    // The empty half, off a domain that resolves and has not run.
    expect(theirs.success).toBe(true);
    expect(rowsOf(theirs.data)).toEqual([]);
    expect(theirs.meta).toEqual({
      page: 1,
      perPage: 50,
      total: 0,
      totalPages: 0,
    });

    // The control: a slug no domain carries is refused, so the
    // empty page above is a quiet domain and not a missing one.
    const err = await refusalFrom(async () => answerOf(
      entry,
      planted.context,
      { domain: MISSING_SLUG },
    ));

    expect(err).toBeInstanceOf(AppError);
  });

  it('answers one pass ledger and a tick that spent nothing', async () => {
    const planted = await plantSurface();
    const entry = toolNamed('runs.get');
    const spent = fieldsOf((await answerOf(entry, planted.context, {
      id: PASS_RUN,
    })).data);
    const quiet = fieldsOf((await answerOf(entry, planted.context, {
      id: TICK_RUN,
    })).data);

    // The non-empty half, newest first, with the full count
    // beside it and the flag saying the cap took nothing.
    expect(fieldsOf(spent.run).id).toBe(PASS_RUN);
    expect(idsOf(spent.ledger)).toEqual([SECOND_CALL, FIRST_CALL]);
    expect(spent.llmCallCount).toBe(2);
    expect(spent.ledgerTruncated).toBe(false);

    // The empty half: a tick that found no work ledgers nothing,
    // which is a state rather than a gap.
    expect(fieldsOf(quiet.run).id).toBe(TICK_RUN);
    expect(fieldsOf(quiet.run).domainId).toBeNull();
    expect(quiet.ledger).toEqual([]);
    expect(quiet.llmCallCount).toBe(0);
    expect(quiet.ledgerTruncated).toBe(false);

    // The control: an id no pass carries is refused, so the
    // empty ledger above is a pass and not a miss.
    const err = await refusalFrom(async () => answerOf(
      entry,
      planted.context,
      { id: MISSING_ID },
    ));

    expect(err).toBeInstanceOf(AppError);
  });
});

describe('the spend read, driven', () => {
  it('answers the buckets of one window and none of another', async () => {
    const planted = await plantSurface();
    const entry = toolNamed('spend.summary');
    const whole = await answerOf(entry, planted.context, {});
    const held = fieldsOf(whole.data);
    const quiet = fieldsOf((await answerOf(entry, planted.context, {
      since: QUIET_SINCE,
      until: QUIET_UNTIL,
    })).data);
    const buckets = rowsOf(held.buckets);

    // The non-empty half. Two calls a UTC day apart, so the
    // grouping answers two buckets rather than one.
    expect(buckets).toHaveLength(2);
    expect(buckets.map((row) => row.calls)).toEqual([1, 1]);
    const chars = buckets.map((row) => row.promptChars).sort();

    expect(chars).toEqual([100, 200]);

    // The window travels back RESOLVED, closed on both sides
    // against the clock the CONTEXT carries — a handler reading
    // the wall clock could not answer this instant.
    expect(fieldsOf(held.window).untilExclusive)
      .toBe(FIXED_NOW.toISOString());

    // No member of any level of the answer is named for money,
    // `llm_calls` carrying no such column. The roster is held
    // against a planted pair in the same case, so the zero is a
    // reading rather than a matcher that stopped matching.
    const named = [
      ...Object.keys(held),
      ...Object.keys(fieldsOf(held.window)),
      ...buckets.flatMap((row) => Object.keys(row)),
    ];
    expect(named.length).toBeGreaterThan(0);
    expect(moneyish(named)).toEqual([]);
    expect(moneyish(['estimatedCostUsd', 'ratePerCall'])).toHaveLength(2);

    // The empty half: a window before the ledger answers no
    // bucket at all, beside its own resolved bounds.
    expect(quiet.buckets).toEqual([]);
    expect(fieldsOf(quiet.window).sinceInclusive).toBe(QUIET_SINCE);
    expect(fieldsOf(quiet.window).untilExclusive).toBe(QUIET_UNTIL);
  });
});

describe('the verdict write, driven', () => {
  it('appends one ruling and answers the row it stored', async () => {
    const planted = await plantSurface();
    const entry = toolNamed('findings.verdict');
    const before = await planted.store.listFindingLabels(JUDGED_FINDING);
    const answered = await answerOf(entry, planted.context, {
      id: JUDGED_FINDING,
      note: 'read it again',
      verdict: DOMAIN_ONLY_VERDICT,
    });
    const after = await planted.store.listFindingLabels(JUDGED_FINDING);
    const stored = JSON.parse(JSON.stringify(after)) as readonly unknown[];

    // The ladder came off the DOMAIN row rather than out of the
    // shared constant: this verdict is a member of one and not of
    // the other, so a service holding the default refuses here.
    expect(DEFAULT_VERDICT_VOCABULARY).not.toContain(DOMAIN_ONLY_VERDICT);
    expect(answered.success).toBe(true);

    // APPENDED and not written over. The two planted rulings are
    // still readable beneath the new one, newest first, which is
    // the sequence an operator changing their mind leaves.
    expect(before).toHaveLength(2);
    expect(after.map((row) => row.verdict))
      .toEqual([DOMAIN_ONLY_VERDICT, 'interested', 'neutral']);

    // The answer is the STORED row and not the arguments rebuilt
    // around an id: `id` and `labelledAt` are the two members no
    // request carried, and the second is the fixture instant.
    expect(answered.data).toEqual(stored[0]);
    expect(fieldsOf(answered.data).labelledAt)
      .toBe(FIXED_NOW.toISOString());
    expect(fieldsOf(answered.data).note).toBe('read it again');
  });

  it('refuses a verdict outside the ladder, naming it', async () => {
    const planted = await plantSurface();
    const entry = toolNamed('findings.verdict');
    const input = { id: JUDGED_FINDING, verdict: OUTSIDE_VERDICT };
    const err = await refusalFrom(async () => answerOf(
      entry,
      planted.context,
      input,
    ));
    const detailed = JSON.stringify(err.details ?? []);
    const unnamed = LADDER.filter((one) => !detailed.includes(one));

    expect(err).toBeInstanceOf(ValidationError);
    expect(faultsOf(err)).toEqual([
      { field: 'verdict', code: 'verdict_outside_vocabulary' },
    ]);

    // The ACCEPTED SET is what a caller is told, whole — and it
    // travels in the DETAIL rather than in the envelope sentence,
    // which is the framework own `Validation failed` on every 422
    // this surface answers. So the refusal says what may be said
    // rather than what was, and it says it where a client reads a
    // field fault.
    expect(err.message).toBe('Validation failed');
    expect(LADDER.length).toBeGreaterThan(0);
    expect(unnamed).toEqual([]);

    // And nothing the caller sent is, in any of the three channels
    // a refusal can be read through. The needle is in the input by
    // construction and counted by the same function, so the zeros
    // are a reading rather than a search over nothing planted.
    const sent = JSON.stringify(input);

    expect(countOccurrences(sent, OUTSIDE_VERDICT)).toBe(1);
    expect(channelsOf(err).map((one) => (
      countOccurrences(one, OUTSIDE_VERDICT)
    ))).toEqual([0, 0, 0]);

    // Read the state BEFORE the accepting control writes: the two
    // touch one finding, and the control own append would
    // otherwise be what this assertion sees.
    const held = await planted.store.listFindingLabels(JUDGED_FINDING);

    expect(held).toHaveLength(2);

    // The control, varied along this row own axis: a verdict the
    // ladder does carry is appended by the same call.
    const answered = await answerOf(entry, planted.context, {
      id: JUDGED_FINDING,
      verdict: DOMAIN_ONLY_VERDICT,
    });

    expect(answered.success).toBe(true);
  });

  it('judges by the domain ladder and not the default', async () => {
    const planted = await plantSurface();
    const entry = toolNamed('findings.verdict');
    const err = await refusalFrom(async () => answerOf(
      entry,
      planted.context,
      { id: JUDGED_FINDING, verdict: RETIRED_VERDICT },
    ));

    // The cross reading, and the only one that separates a per-row
    // ladder from the shared constant: a verdict the DEFAULT
    // carries and this domain has retired is refused here.
    expect(err).toBeInstanceOf(ValidationError);
    expect(DEFAULT_VERDICT_VOCABULARY).toContain(RETIRED_VERDICT);
    expect(LADDER).not.toContain(RETIRED_VERDICT);

    // The other half of it, in the same case: the member only this
    // domain declares is accepted by the same call.
    const answered = await answerOf(entry, planted.context, {
      id: JUDGED_FINDING,
      verdict: DOMAIN_ONLY_VERDICT,
    });

    expect(answered.success).toBe(true);
  });
});

describe('the two approval gates, driven', () => {
  it('ratifies one intention and answers the ruling', async () => {
    const planted = await plantSurface();
    const store = planted.store;
    const entry = toolNamed('entities.approve-research');
    const before = await store.findPoolRowById(QUEUED_INTENTION);
    const sibling = await store.findPoolRowById(OTHER_INTENTION);
    const answered = await answerOf(entry, planted.context, {
      id: KUBE_ENTITY,
      poolId: QUEUED_INTENTION,
    });
    const ruling = fieldsOf(answered.data);
    const after = await store.findPoolRowById(QUEUED_INTENTION);

    expect(before?.approvedAt).toBeNull();
    expect(answered.success).toBe(true);

    // The projection whole, as a KEY SET. A member added to
    // `Ruling` would pass every assertion beneath this one, which
    // is what a `toMatchObject` over the four cannot report.
    expect(Object.keys(ruling).sort())
      .toEqual(['approvedAt', 'closedAt', 'id', 'status']);
    expect(ruling.id).toBe(QUEUED_INTENTION);
    expect(ruling.status).toBe('approved');
    expect(ruling.approvedAt).toBe(FIXED_NOW.toISOString());

    // `closedAt` reads `research_pool.researched_at`, and
    // ratifying writes no research at all — which is the whole of
    // what this gate does and the half the other one adds to.
    expect(ruling.closedAt).toBeNull();

    // The whole row, spread: a member-by-member reading would pass
    // over a write that also moved the terms or the finding.
    expect(after).toEqual({
      ...before,
      approvedAt: FIXED_NOW,
      status: 'approved',
    });
    expect(await store.findPoolRowById(OTHER_INTENTION)).toEqual(sibling);
  });

  it('applies one proposal and answers the ruling', async () => {
    const planted = await plantSurface();
    const store = planted.store;
    const entry = toolNamed('sources.approve-config');
    const feed = await store.findSourceById(planted.feedId);
    const proposal = await store.findProposalById(EARLY_PROPOSAL);
    const answered = await answerOf(entry, planted.context, {
      id: planted.feedId,
      proposalId: EARLY_PROPOSAL,
    });
    const ruling = fieldsOf(answered.data);
    const after = await store.findSourceById(planted.feedId);

    expect(feed?.parserConfig).toEqual({});
    expect(answered.success).toBe(true);

    // The SAME projection the other gate answers, member for
    // member, which is what one vocabulary over two subjects buys
    // and what nothing but this pair of cases can report.
    expect(Object.keys(ruling).sort())
      .toEqual(['approvedAt', 'closedAt', 'id', 'status']);
    expect(ruling.id).toBe(EARLY_PROPOSAL);
    expect(ruling.status).toBe('approved');
    expect(ruling.approvedAt).toBe(FIXED_NOW.toISOString());

    // And where it differs: `closedAt` is `applied_at` here, and
    // it is NOT null, applying being the half ratifying omits.
    expect(ruling.closedAt).toBe(FIXED_NOW.toISOString());

    // The two documents landed on the feed verbatim, which is a
    // side effect no envelope this tool answers could show.
    expect(after).toEqual({
      ...feed,
      contract: proposal?.contract,
      parserConfig: proposal?.parserConfig,
    });
  });

  it('refuses a ruling given about another parent', async () => {
    const planted = await plantSurface();
    const store = planted.store;
    const ratify = toolNamed('entities.approve-research');
    const apply = toolNamed('sources.approve-config');
    const strayIntention = await refusalFrom(async () => answerOf(
      ratify,
      planted.context,
      { id: BARE_ENTITY, poolId: QUEUED_INTENTION },
    ));
    const strayProposal = await refusalFrom(async () => answerOf(
      apply,
      planted.context,
      { id: planted.drainedFeedId, proposalId: EARLY_PROPOSAL },
    ));

    // A `404` and not a `422`: the fault is a relation between two
    // stored rows rather than anything about the arguments, which
    // is why no schema either tool declares could hold it.
    expect(strayIntention).toBeInstanceOf(AppError);
    expect(strayIntention).not.toBeInstanceOf(ValidationError);
    expect(strayProposal).toBeInstanceOf(AppError);
    expect(strayProposal).not.toBeInstanceOf(ValidationError);

    // Both state reads come BEFORE the accepting controls, which
    // rule on the very rows these two refusals were about.
    const intention = await store.findPoolRowById(QUEUED_INTENTION);
    const feed = await store.findSourceById(planted.feedId);

    expect(intention?.approvedAt).toBeNull();
    expect(feed?.parserConfig).toEqual({});

    // The controls, varied along each row own axis: the same two
    // rows, addressed from the parent they were raised under.
    const ratified = await answerOf(ratify, planted.context, {
      id: KUBE_ENTITY,
      poolId: QUEUED_INTENTION,
    });
    const applied = await answerOf(apply, planted.context, {
      id: planted.feedId,
      proposalId: EARLY_PROPOSAL,
    });

    expect(ratified.success).toBe(true);
    expect(applied.success).toBe(true);
  });

  it('answers a second ruling differently at each gate', async () => {
    const planted = await plantSurface();
    const ratify = toolNamed('entities.approve-research');
    const apply = toolNamed('sources.approve-config');
    const intention = { id: KUBE_ENTITY, poolId: QUEUED_INTENTION };
    const proposal = {
      id: planted.feedId,
      proposalId: EARLY_PROPOSAL,
    };
    const first = await answerOf(ratify, planted.context, intention);
    const again = await answerOf(ratify, planted.context, intention);

    // Ratifying twice answers the FIRST ruling rather than
    // refusing, the write being `coalesce(approved_at, now())` and
    // nothing else having happened.
    expect(first.success).toBe(true);
    expect(again.data).toEqual(first.data);

    // Applying twice is refused, because a second application
    // would write the two documents onto the feed again. That is
    // `RULING_ACTS` rather than a rule either handler keeps, and
    // it is the one place the two gates part.
    const applied = await answerOf(apply, planted.context, proposal);
    const err = await refusalFrom(async () => answerOf(
      apply,
      planted.context,
      proposal,
    ));

    expect(applied.success).toBe(true);
    expect(err).toBeInstanceOf(AppError);
    expect(err).not.toBeInstanceOf(ValidationError);
  });
});

describe('what the three writes refuse', () => {
  it('refuses an argument no write declares', async () => {
    const planted = await plantSurface();
    const inputs: readonly Record<string, unknown>[] = [
      {
        id: JUDGED_FINDING,
        verdict: DOMAIN_ONLY_VERDICT,
        [SENTINEL]: 'x',
      },
      { id: KUBE_ENTITY, poolId: QUEUED_INTENTION, [SENTINEL]: 'x' },
      {
        id: planted.feedId,
        proposalId: EARLY_PROPOSAL,
        [SENTINEL]: 'x',
      },
    ];
    const names = [
      'findings.verdict',
      'entities.approve-research',
      'sources.approve-config',
    ];
    const refused = await Promise.all(names.map(async (name, at) => (
      refusalFrom(async () => answerOf(
        toolNamed(name),
        planted.context,
        inputs[at],
      ))
    )));

    // `body` and not `query`: a tool is handed one object, which
    // is the root name `parseBody` gives it, and it is the one
    // place a tool refusal reads differently from its route.
    expect(refused.map(faultsOf)).toEqual([
      [{ field: 'body', code: 'unrecognized_keys' }],
      [{ field: 'body', code: 'unrecognized_keys' }],
      [{ field: 'body', code: 'unrecognized_keys' }],
    ]);

    // The needles are in the inputs by construction, counted by
    // the same function, so the zeros beneath them are a reading.
    expect(inputs.map((one) => (
      countOccurrences(JSON.stringify(one), SENTINEL)
    ))).toEqual([1, 1, 1]);
    expect(refused.flatMap(channelsOf).map((one) => (
      countOccurrences(one, SENTINEL)
    ))).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]);

    // Read the state BEFORE the accepting control: this case and
    // the control below touch the same three rows.
    const labels = await planted.store.listFindingLabels(JUDGED_FINDING);
    const queued = await planted.store.findPoolRowById(QUEUED_INTENTION);

    expect(labels).toHaveLength(2);
    expect(queued?.approvedAt).toBeNull();

    // The control, varied along each row own axis: the same three
    // requests without the undeclared key are accepted.
    const answered = await Promise.all(names.map(async (name, at) => {
      const clean = { ...inputs[at] };

      delete clean[SENTINEL];

      return answerOf(toolNamed(name), planted.context, clean);
    }));

    expect(answered.map((one) => one.success)).toEqual([true, true, true]);
  });
});
