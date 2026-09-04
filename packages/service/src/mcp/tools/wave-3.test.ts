/**
 * The wave-3 read tools, driven with no server and no database.
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
 * THE THIRD IS THE NINE READS, EACH DRIVEN TWICE. Every tool is
 * asked one question it must answer with something and one it must
 * answer with nothing, IN THE SAME CASE — because an empty answer
 * is also what a tool that had stopped reading anything would give,
 * and a case holding only the empty half is satisfied by that. The
 * non-empty half is the in-case positive control for the empty one,
 * and the two are read off the same fixture through the same
 * handler.
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
 * instant no assertion here could have named.
 *
 * Mutation grid, measured over the twenty-three cases here with
 * `--reporter=json` and read as the failed case SET rather than as
 * a count. Eighteen legs.
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
 * eleven legs, 1 of 23 apiece. The twelfth is the page `meta`,
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
 * TWO TRAPS MET WHILE MEASURING, recorded so a re-run reproduces
 * the figures rather than a neighbour of them. The findings-slug
 * leg has an anchor that is NOT unique — `query.slug,` followed by
 * `filter,` is byte-identical in the findings handler and in the
 * documents one — so a leg anchored on that pair patches both and
 * reads 2 rather than 1; the figure above is taken with the sort
 * key included in the anchor. And the `meta` leg is DEAD when
 * spelled as a `page` of 1, every case here asking for the first
 * page: the mutation has to move a member no request sent the
 * value of.
 *
 * NOTHING HERE WRITES AND NO CASE READS A ROW BACK, which is a
 * property of the wave rather than of the file: every service
 * function these nine entries call is a read, and the three
 * mutations the spec names arrive in `./wave-3.ts` own next task.
 * The read-first claim itself is the ports and
 * `tests/invariants/api-read-first.test.ts`, not this file.
 */
import type {
  McpToolContext,
  McpToolEntry,
} from './registry.js';
import type {
  MemoryDomainDocument,
  MemoryDomainEntity,
  MemoryDomainFinding,
  MemoryEntityResearch,
  MemoryLlmCall,
  MemoryResearchStore,
  MemoryRun,
  MemorySourceProposal,
} from '../../../tests/helpers/memory-research-store.js';
import type { ZodType } from 'zod';

import { describe, expect, it } from 'vitest';

import { AppError } from '../../../lib/errors/index.js';
import {
  createMemoryResearchStore,
} from '../../../tests/helpers/memory-research-store.js';
import {
  documentListToolInputSchema,
} from '../../documents/routes.js';
import {
  entityReadToolInputSchema,
  entityResearchListToolInputSchema,
} from '../../entities/routes.js';
import {
  findingListToolInputSchema,
  findingReadToolInputSchema,
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
 * one holds the research; two feeds, one with a queue and one whose
 * only proposal is applied; and two passes, one that spent and one
 * belonging to no domain that spent nothing.
 *
 * @returns The store, a context over it, and the three feed ids,
 *   which are addresses a request cannot be composed without.
 */
async function plantSurface(): Promise<PlantedSurface> {
  const store = createMemoryResearchStore();
  const context: McpToolContext = { store, clock: () => FIXED_NOW };
  const radar = await store.insertDomain({
    slug: RADAR,
    name: 'Radar',
    settings: {},
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
