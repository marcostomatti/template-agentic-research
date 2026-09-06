/**
 * The wave-2 tools, read and driven with no server and no database.
 *
 * THREE KINDS OF READING, and only two of them are about
 * behaviour. The first is the SCHEMA IDENTITY: every entry's
 * `inputSchema` is asserted `Object.is`-identical to the binding
 * its own route module exports, which is the check a structural
 * comparison cannot make. A copy of the schema written out beside
 * the tool would satisfy `toEqual` and would drift the day the
 * route grows a member — so the pairing below is one row per tool,
 * and the row set is held EQUAL to the entry set so a tool added
 * without a row fails NAMING itself rather than passing unread.
 *
 * THE PAIRING NEEDS THE DISTINCTNESS CASE BESIDE IT. Seven rows
 * each asserting an identity are all satisfied by a surface where
 * one schema is shared by everything, since the failing rows would
 * name the schema and not the fault; the case asserting seven
 * DISTINCT schema objects is what rules that out, and the case
 * asserting the entries are the ones `MCP_TOOLS` holds is what
 * says this list reached the registry at all.
 *
 * THE SECOND IS THE CONNECTOR READ, WHICH IS THE SECRET LAW ON
 * THIS PROTOCOL. `src/mcp/tools/wave-2.ts` does not import
 * `maskConnectorConfig` — it calls `listConnectors` in
 * `../../connectors/service.ts`, which is the one layer that
 * applies it — so the claim this file makes
 * is not that the tool masks but that what it answers IS what that
 * function answers. The case holds the answered config against
 * `maskConnectorConfig` of the STORED one, which makes that
 * function the authority rather than a literal transcribed here,
 * and reads the stored row back in the same case so the credential
 * is provably in the fixture. Three further readings sit beside
 * it, and none of them is implied by the others: the rostered key
 * answers {@link MASKED_SECRET} exactly, the UNROSTERED member
 * survives unchanged (a masker replacing everything would satisfy
 * the first and fail this), and the stored credential is counted
 * in the rendered block and found nowhere — against an in-band
 * positive taken by the same function over the stored config,
 * which is 1 by construction.
 *
 * THE THIRD IS THE TWO `run-now` WRITES. Each is read as a WHOLE
 * ROW DIFF: the row before the call is spread, `nextRunAt` is
 * replaced with the instant the context's clock reports, and the
 * row afterwards is held EQUAL to that. A member-by-member
 * comparison would pass over a write that also moved `enabled` or
 * an interval; this cannot, and it is the only shape that reads
 * `and no other column` rather than asserting the one column that
 * did move. The sibling rows are read back too, so a write that
 * moved every row of the table is reported by the same case.
 *
 * THE CLOCK IS FIXED AND THE FIXTURE'S STAMPS ARE NULL, which is
 * what lets the diff be an equality: a handler reading
 * `Date.now()` instead of {@link McpToolContext.clock} answers an
 * instant no assertion here could have named.
 *
 * THE STRICTNESS CASE IS ABOUT A DIFFERENCE BETWEEN THE TWO
 * PROTOCOLS. Neither `run-now` route reads a body, so a request
 * carrying one is IGNORED on the wire; the tool declares the
 * address alone under `.strict()`, so the same argument is a 422
 * naming `body`. The case asserts that refusal on both entries,
 * counts the sentinel in three channels and finds it in none
 * against an in-band positive taken from the input, and reads the
 * schedule column BEFORE issuing its accepting control — the two
 * touch one row, and the control's own write would otherwise be
 * what the assertion sees.
 *
 * THE FIXTURE PLANTS A SECOND DOMAIN, so every scoped read has
 * something it must NOT answer. Without it a tool that ignored the
 * slug entirely would agree with every assertion in this file.
 *
 * Mutation grid, measured over the twenty-three cases here with
 * `--reporter=json` and read as the failed case SET rather than as
 * a count. Sixteen legs, the whole grid run TWICE with the two
 * passes' sets diffed member for member and nothing moving.
 *
 * FOUR ARE ABOUT THE PAIRING. Pointing every entry at ONE schema
 * reddens 7 — the six rows that are not that schema, plus the
 * distinctness case, which is the member no single row could have
 * reported. Pointing ONE entry at a sibling's schema reddens 2, its
 * own row and that same case. Renaming an entry out of the pairing
 * reddens 5: its row, the set equality beside it, and the three
 * driven connector cases, which throw in {@link toolNamed} — so a
 * tool added without a row fails NAMING itself. And emptying the
 * registry's spread reddens the carried-whole case alone.
 *
 * THREE ARE ABOUT THE MASK, and the second is why this file reads
 * more than an equality. Making `masked` in
 * `../../connectors/service.ts` a passthrough reddens both mask
 * cases. Making the roster in `../../connectors/secrets.ts` answer
 * true for EVERY key reddens 1, and it is the unrostered-member
 * assertion ALONE: the comparison against `maskConnectorConfig`
 * holds through it, both sides moving together, which is exactly
 * the state that assertion exists to catch. Ignoring the `kind` a
 * caller sent reddens the narrowing case.
 *
 * FOUR ARE ABOUT THE OTHER READS. Ignoring the slug on the topics
 * list reddens 2 — the scoping case and the refusal case, told
 * apart only by the assertion that fails inside each, since one is
 * a page and the other a `404` that stopped happening. Ignoring it
 * on the sources list reddens 1, ignoring the address on the
 * failures queue reddens 1, and dropping the window members from
 * that queue's tool input reddens 2.
 *
 * THOSE LAST TWO WERE DEAD BEFORE THE FIXTURE GREW, which is worth
 * recording rather than leaving to the next reader: with no feed
 * under the second domain and no capture under the addressed one,
 * both read a clean ZERO while every case passed. What closed them
 * is a row on the other side of each scope, not a wider assertion.
 *
 * FIVE ARE ABOUT THE TWO WRITES. Reading the wall clock instead of
 * {@link McpToolContext.clock} reddens 2 on the topics verb (the
 * whole-row diff and the clock case) and 1 on the exports verb.
 * Making the in-memory schedule write ALSO flip `enabled` reddens
 * 1, and it is the whole-row diff — the only case that reads `and
 * no other column` rather than the one column that moved.
 * Answering `ok({ id })` in place of the stored row reddens 1.
 * Losing `.strict()` on the run-now tool input reddens the
 * strictness case.
 *
 * TWO ZEROS ARE STRUCTURAL AND ARE RECORDED RATHER THAN CLOSED. No
 * leg over `exports.list` can leak a config, the row carrying none
 * and no connector being joined in, so the mask has one subject on
 * this surface and not two. And no case here reads the ORDER of
 * the failure queue — every membership assertion sorts — so an
 * ordering leg is dead by construction. That queue's order is
 * pinned by its own routes suite under `../../sources/`.
 */
import type {
  McpToolContext,
  McpToolEntry,
} from './registry.js';
import type { FieldError } from '../../../lib/errors/index.js';
import type {
  MemoryResearchStore,
} from '../../../tests/helpers/memory-research-store.js';
import type { ZodType } from 'zod';

import { describe, expect, it } from 'vitest';

import { AppError, ValidationError } from '../../../lib/errors/index.js';
import {
  createMemoryResearchStore,
} from '../../../tests/helpers/memory-research-store.js';
import {
  connectorListToolInputSchema,
} from '../../connectors/routes.js';
import {
  MASKED_SECRET,
  maskConnectorConfig,
} from '../../connectors/secrets.js';
import {
  sourceFailureListToolInputSchema,
} from '../../sources/failures-routes.js';
import {
  sourceListToolInputSchema,
} from '../../sources/routes.js';
import {
  subscriptionListToolInputSchema,
  subscriptionRunNowToolInputSchema,
} from '../../subscriptions/routes.js';
import {
  topicListToolInputSchema,
  topicRunNowToolInputSchema,
} from '../../topics/routes.js';

import { MCP_TOOLS } from './registry.js';
import { WAVE_2_TOOLS } from './wave-2.js';

/** The instant a context in this file reports as the present. */
const FIXED_NOW = new Date(Date.UTC(2026, 1, 3, 4, 5, 6));

/** The domain every scoped read below addresses. */
const RADAR = 'radar';

/**
 * A second domain, holding one topic of its own.
 *
 * Every scoped read here would agree with a tool that ignored the
 * slug if this were the only registry in the fixture.
 */
const ATLAS = 'atlas';

/**
 * The stored credential, spelled so that nothing else could BE it.
 *
 * A stack frame carries line and column numbers, so a short or
 * numeric needle matches one by accident and the containment zero
 * that case exists for reads as a leak.
 */
const SECRET = 'zzstoredcredentialzz';

/** An argument no tool declares, so a refusal has a subject. */
const SENTINEL = 'zzsentinelzz';

/**
 * The `config` member `../../connectors/secrets.ts` rosters.
 */
const ROSTERED_KEY = 'apiKey';

/** A `config` member it does not, which must survive. */
const OPEN_KEY = 'endpoint';

/** What {@link OPEN_KEY} holds, and the answer must carry. */
const OPEN_VALUE = 'https://model.example/v1';

/** The kind the credential-bearing connector is under. */
const MODEL_KIND = 'llm';

/** The kind the other one is, so a filter has two sides. */
const INBOX_KIND = 'export_target';

/**
 * The two captures planted under the addressed feed.
 *
 * Two rather than one, so the queue can be read as a PARTITION:
 * the two halves of a one-row window sum to the collection and
 * neither of them is it, which no single page says.
 */
const FAILED_IDS: readonly number[] = [9100001, 9100002];

/** A kind `CONNECTOR_KINDS` does not declare. */
const UNKNOWN_KIND = 'zzunregisteredzz';

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
 * entry's own member and compare it against itself.
 */
const DECLARED_SCHEMAS: readonly SchemaPairing[] = [
  { name: 'topics.list', schema: topicListToolInputSchema },
  { name: 'sources.list', schema: sourceListToolInputSchema },
  {
    name: 'source-failures.list',
    schema: sourceFailureListToolInputSchema,
  },
  { name: 'connectors.list', schema: connectorListToolInputSchema },
  { name: 'exports.list', schema: subscriptionListToolInputSchema },
  { name: 'topics.run-now', schema: topicRunNowToolInputSchema },
  {
    name: 'exports.run-now',
    schema: subscriptionRunNowToolInputSchema,
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
  const found = WAVE_2_TOOLS.find((entry) => entry.name === name);

  if (found === undefined) {
    throw new Error(`no wave-2 tool is registered as ${name}`);
  }

  return found;
}

/** What one handler answered, once its text block is parsed. */
interface ToolAnswer {
  /** The envelope's discriminator. */
  readonly success: boolean;

  /** The resource or the page. */
  readonly data: unknown;

  /** The window, on a paginated answer. */
  readonly meta?: unknown;
}

/** A handler's whole result, kept so a case can read the text. */
interface ToolReading {
  /** The parsed envelope. */
  readonly answer: ToolAnswer;

  /** The block as a client receives it, for a containment count. */
  readonly text: string;
}

/**
 * Runs one tool and reads its single block both ways.
 *
 * @param entry - The tool.
 * @param context - What it is handed besides its input.
 * @param input - The arguments.
 * @returns The parsed envelope and the raw block text.
 * @throws When the tool answered no block at all.
 */
async function readingOf(
  entry: McpToolEntry,
  context: McpToolContext,
  input: unknown,
): Promise<ToolReading> {
  const result = await entry.handler(context, input);
  const [block] = result.content;

  if (block === undefined) {
    throw new Error('the tool answered no content block');
  }

  expect(result.content).toHaveLength(1);
  expect(block.type).toBe('text');

  return { answer: JSON.parse(block.text) as ToolAnswer, text: block.text };
}

/**
 * The envelope alone, for a case that reads no text.
 *
 * @param entry - The tool.
 * @param context - What it is handed besides its input.
 * @param input - The arguments.
 * @returns The parsed envelope.
 */
async function answerOf(
  entry: McpToolEntry,
  context: McpToolContext,
  input: unknown,
): Promise<ToolAnswer> {
  return (await readingOf(entry, context, input)).answer;
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
 *   joined blob would hide which one leaked.
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

/** What {@link plantSurface} answers. */
interface PlantedSurface {
  /** The fixture store, reachable for a read-back. */
  readonly store: MemoryResearchStore;

  /** What a handler is handed. */
  readonly context: McpToolContext;

  /** The enabled topic under {@link RADAR}, which run-now moves. */
  readonly topicId: number;

  /** A second topic under {@link RADAR}, which must not move. */
  readonly otherTopicId: number;

  /** The connector holding {@link SECRET} under the key. */
  readonly modelId: number;

  /** A connector of the other kind, so a filter has two sides. */
  readonly inboxId: number;

  /** The subscription under {@link RADAR}, which run-now moves. */
  readonly exportId: number;

  /** The feed whose failure queue one tool reads. */
  readonly feedId: number;

  /** A feed under the OTHER domain, which RADAR must not hold. */
  readonly otherFeedId: number;
}

/**
 * The smallest fixture every case here can be reached from.
 *
 * Two domains, so a scoped read has something it must not answer;
 * two topics under the addressed one, so a write has a sibling to
 * leave alone; two connectors of different kinds, so the filter
 * has two sides and the masking has an unmasked row beside it; one
 * feed and one export.
 *
 * Every stamp lands null: `insertTopic` and `insertSubscription`
 * write no `nextRunAt`, which is what lets the run-now cases read
 * a whole-row diff rather than a member.
 *
 * @returns The store, a context over it, and the ids the cases
 *   address.
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
  const topic = await store.insertTopic({
    domainId: radar.id,
    name: 'transformer inference',
    searchTerms: ['transformer'],
    intervalSeconds: 3600,
    enabled: true,
    minIntervalSeconds: null,
    maxIntervalSeconds: null,
  });
  const otherTopic = await store.insertTopic({
    domainId: radar.id,
    name: 'retrieval',
    searchTerms: ['retrieval'],
    intervalSeconds: 7200,
    enabled: true,
    minIntervalSeconds: null,
    maxIntervalSeconds: null,
  });

  await store.insertTopic({
    domainId: atlas.id,
    name: 'orbital mechanics',
    searchTerms: ['orbit'],
    intervalSeconds: 3600,
    enabled: true,
    minIntervalSeconds: null,
    maxIntervalSeconds: null,
  });

  const feed = await store.insertSource({
    domainId: radar.id,
    kind: 'rss',
    endpoint: 'https://feed.example/rss',
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

  store.setSourceDocuments(feed.id, FAILED_IDS.map((id, at) => ({
    id,
    url: `https://feed.example/rss#${id}`,
    body: `a capture that would not parse (${id})`,
    parseError: 'the contract named a field the payload has not',
    capturedAt: new Date(Date.UTC(2026, 0, 2 + at, 3, 4, 5)),
    parseStatus: 'failed' as const,
  })));

  const model = await store.insertConnector({
    kind: MODEL_KIND,
    name: 'primary model',
    config: { [OPEN_KEY]: OPEN_VALUE, [ROSTERED_KEY]: SECRET },
  });
  const inbox = await store.insertConnector({
    kind: INBOX_KIND,
    name: 'weekly inbox',
    config: { [OPEN_KEY]: OPEN_VALUE },
  });
  const digest = await store.insertSubscription({
    domainId: radar.id,
    format: 'obsidian_md',
    connectorId: inbox.id,
    intervalSeconds: 86400,
    enabled: true,
    minIntervalSeconds: null,
    maxIntervalSeconds: null,
  });

  return {
    store,
    context,
    topicId: topic.id,
    otherTopicId: otherTopic.id,
    modelId: model.id,
    inboxId: inbox.id,
    exportId: digest.id,
    feedId: feed.id,
    otherFeedId: otherFeed.id,
  };
}

/** The rows an answered page carries. */
function rowsOf(data: unknown): readonly Record<string, unknown>[] {
  return data as readonly Record<string, unknown>[];
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
    const registered = WAVE_2_TOOLS.map((entry) => entry.name).sort();

    expect(registered.length).toBeGreaterThan(0);
    expect(paired).toEqual(registered);
  });

  // What the seven identities cannot say on their own: no two
  // entries lean on one schema object, and no two name one route.
  it('gives no two entries one schema object', () => {
    const schemas = new Set(WAVE_2_TOOLS.map((e) => e.inputSchema));
    const routes = new Set(WAVE_2_TOOLS.map((e) => e.route));

    expect(schemas.size).toBe(WAVE_2_TOOLS.length);
    expect(routes.size).toBe(WAVE_2_TOOLS.length);
  });

  // And that the list reached the registry, which is the one thing
  // a reader of this file would otherwise assume.
  it('is carried whole by the registry', () => {
    const missing = WAVE_2_TOOLS.filter((e) => !MCP_TOOLS.includes(e));

    expect(WAVE_2_TOOLS.length).toBeGreaterThan(0);
    expect(missing).toEqual([]);
  });
});

describe('the connector read, driven', () => {
  it('answers the mask where the store holds a secret', async () => {
    const planted = await plantSurface();
    const entry = toolNamed('connectors.list');
    const stored = await planted.store.findConnectorById(planted.modelId);
    const reading = await readingOf(entry, planted.context, {});
    const rows = rowsOf(reading.answer.data);
    const answered = rows.find((row) => row.id === planted.modelId);
    const config = answered?.config as Record<string, unknown>;
    const storedConfig = stored?.config as Record<string, unknown>;

    // The credential is provably IN the fixture, so the zeros
    // below are about what the tool answered rather than about a
    // string nothing ever stored.
    expect(storedConfig[ROSTERED_KEY]).toBe(SECRET);
    expect(reading.answer.success).toBe(true);

    // maskConnectorConfig is the authority, called here rather
    // than restated: what the tool answers has to BE what that
    // function answers over the row the store holds.
    expect(config).toEqual(maskConnectorConfig(storedConfig));
    expect(config[ROSTERED_KEY]).toBe(MASKED_SECRET);

    // A masker replacing every member would satisfy both lines
    // above; the unrostered one surviving is what refuses that.
    expect(config[OPEN_KEY]).toBe(OPEN_VALUE);

    // The in-band positive: the same function over the stored
    // config counts 1, so the block counting 0 is a reading.
    expect(countOccurrences(JSON.stringify(storedConfig), SECRET))
      .toBe(1);
    expect(countOccurrences(reading.text, SECRET)).toBe(0);
  });

  it('masks the rows a kind narrowed to, and counts them', async () => {
    const planted = await plantSurface();
    const entry = toolNamed('connectors.list');
    const whole = await answerOf(entry, planted.context, {});
    const models = await readingOf(entry, planted.context, {
      kind: MODEL_KIND,
    });
    const inboxes = await answerOf(entry, planted.context, {
      kind: INBOX_KIND,
    });
    const narrowed = rowsOf(models.answer.data);
    const others = rowsOf(inboxes.data);

    // A partition: the two narrowings sum to the collection and
    // neither of them is it, which no single filtered page says.
    expect(rowsOf(whole.data)).toHaveLength(2);
    expect(narrowed.map((row) => row.id)).toEqual([planted.modelId]);
    expect(others.map((row) => row.id)).toEqual([planted.inboxId]);

    // The masking is unconditional rather than a property of the
    // unfiltered page, which the filtered read is what says.
    const config = narrowed[0]?.config as Record<string, unknown>;

    expect(config[ROSTERED_KEY]).toBe(MASKED_SECRET);
    expect(countOccurrences(models.text, SECRET)).toBe(0);
  });

  it('refuses a kind the deployment does not declare', async () => {
    const planted = await plantSurface();
    const entry = toolNamed('connectors.list');
    const err = await refusalFrom(async () => answerOf(
      entry,
      planted.context,
      { kind: UNKNOWN_KIND },
    ));

    expect(err).toBeInstanceOf(ValidationError);
    expect(faultsOf(err))
      .toEqual([{ field: 'kind', code: 'invalid_value' }]);

    // The control, varied along this row own axis: the same call
    // with a declared kind lands, so the refusal is about the
    // value and not about the parameter being read at all.
    const answered = await answerOf(entry, planted.context, {
      kind: MODEL_KIND,
    });

    expect(answered.success).toBe(true);
  });
});

describe('the four other reads, driven', () => {
  it('scopes the topics page to the slug it was sent', async () => {
    const planted = await plantSurface();
    const entry = toolNamed('topics.list');
    const stored = await planted.store.listTopics(1, {
      limit: 50,
      offset: 0,
    });
    const mine = await answerOf(entry, planted.context, { slug: RADAR });
    const theirs = await answerOf(entry, planted.context, { slug: ATLAS });
    const names = rowsOf(mine.data).map((row) => row.name);

    expect(stored).toHaveLength(2);
    expect(rowsOf(mine.data)).toHaveLength(2);
    expect(rowsOf(theirs.data)).toHaveLength(1);
    expect(names).not.toContain('orbital mechanics');
    expect(mine.meta).toEqual({
      page: 1,
      perPage: 50,
      total: 2,
      totalPages: 1,
    });
  });

  it('answers the sources and the exports of one domain', async () => {
    const planted = await plantSurface();
    const sources = await answerOf(
      toolNamed('sources.list'),
      planted.context,
      { slug: RADAR },
    );
    const exports = await answerOf(
      toolNamed('exports.list'),
      planted.context,
      { slug: RADAR },
    );
    const exported = rowsOf(exports.data);

    const theirs = await answerOf(
      toolNamed('sources.list'),
      planted.context,
      { slug: ATLAS },
    );

    // Scoped: each domain answers its own feed and not the other,
    // so a tool that ignored the slug is reported here.
    expect(rowsOf(sources.data).map((row) => row.id))
      .toEqual([planted.feedId]);
    expect(rowsOf(theirs.data).map((row) => row.id))
      .toEqual([planted.otherFeedId]);
    expect(exported.map((row) => row.id)).toEqual([planted.exportId]);

    // The export row names the connector it delivers to and joins
    // nothing in, so no config can reach a caller through it.
    expect(exported[0]).not.toHaveProperty('config');
    expect(exported[0]?.connectorId).toBe(planted.inboxId);
  });

  it('answers the failed captures of the feed it named', async () => {
    const planted = await plantSurface();
    const entry = toolNamed('source-failures.list');
    const mine = await answerOf(entry, planted.context, {
      id: planted.feedId,
    });
    const theirs = await answerOf(entry, planted.context, {
      id: planted.otherFeedId,
    });
    const rows = rowsOf(mine.data);

    expect(mine.success).toBe(true);
    expect(rows.map((row) => row.id).sort()).toEqual([...FAILED_IDS]);

    // `bodyBytes` is the SERVICE's member rather than the port's,
    // so its presence is what says the tool reached the same
    // layer the route reaches and not the store beneath it.
    expect(rows[0]).toHaveProperty('bodyBytes');
    expect(rows[0]).toHaveProperty('bodyTruncated');

    // The other feed resolves and answers nothing, which is the
    // state a tool that ignored the address would answer here.
    expect(rowsOf(theirs.data)).toEqual([]);

    // The control: an id no source carries is a refusal, so the
    // empty page above is a queue and not a missing lookup.
    const err = await refusalFrom(async () => answerOf(
      entry,
      planted.context,
      { id: planted.feedId + 9100000 },
    ));

    expect(err).toBeInstanceOf(AppError);
    expect(err).not.toBeInstanceOf(ValidationError);
  });

  it('pages the failure queue on the window it was sent', async () => {
    const planted = await plantSurface();
    const entry = toolNamed('source-failures.list');
    const first = await answerOf(entry, planted.context, {
      id: planted.feedId,
      perPage: 1,
    });
    const second = await answerOf(entry, planted.context, {
      id: planted.feedId,
      page: 2,
      perPage: 1,
    });
    const halves = [
      ...rowsOf(first.data).map((row) => row.id),
      ...rowsOf(second.data).map((row) => row.id),
    ];

    // A partition: the two windows sum to the collection and
    // neither of them is it, which no single narrowed page says.
    expect([...halves].sort()).toEqual([...FAILED_IDS]);
    expect(rowsOf(first.data)).toHaveLength(1);
    expect(rowsOf(second.data)).toHaveLength(1);
    expect(first.meta).toEqual({
      page: 1,
      perPage: 1,
      total: FAILED_IDS.length,
      totalPages: 2,
    });
  });

  it('refuses a slug in no shape a domain is stored under', async () => {
    const planted = await plantSurface();
    const entry = toolNamed('topics.list');
    const err = await refusalFrom(async () => answerOf(
      entry,
      planted.context,
      { slug: SENTINEL.toUpperCase() },
    ));

    expect(err).toBeInstanceOf(ValidationError);
    expect(faultsOf(err))
      .toEqual([{ field: 'slug', code: 'invalid_format' }]);

    // The control, varied along this row own axis: a well-shaped
    // slug no domain carries is refused too, and differently.
    const missing = await refusalFrom(async () => answerOf(
      entry,
      planted.context,
      { slug: SENTINEL },
    ));

    expect(missing).not.toBeInstanceOf(ValidationError);
  });
});

describe('the two run-now writes, driven', () => {
  it('moves one topic due time and no other column', async () => {
    const planted = await plantSurface();
    const entry = toolNamed('topics.run-now');
    const before = await planted.store.findTopicById(planted.topicId);
    const sibling = await planted.store.findTopicById(planted.otherTopicId);
    const answered = await answerOf(entry, planted.context, {
      id: planted.topicId,
    });
    const after = await planted.store.findTopicById(planted.topicId);
    const siblingAfter = await planted.store
      .findTopicById(planted.otherTopicId);

    // The stamp was null before, so the diff below is an equality
    // rather than a comparison against whatever was there.
    expect(before?.nextRunAt).toBeNull();
    expect(answered.success).toBe(true);

    // The whole row, spread: a member-by-member reading would
    // pass over a write that also moved `enabled` or an interval.
    expect(after).toEqual({ ...before, nextRunAt: FIXED_NOW });
    expect(siblingAfter).toEqual(sibling);

    // The answer is the STORED row rather than the argument: the
    // name and the terms are members no argument carried.
    expect(answered.data).toEqual(JSON.parse(JSON.stringify(after)));
  });

  it('moves one export due time and no other column', async () => {
    const planted = await plantSurface();
    const entry = toolNamed('exports.run-now');
    const store = planted.store;
    const before = await store.findSubscriptionById(planted.exportId);
    const topicBefore = await store.findTopicById(planted.topicId);
    const answered = await answerOf(entry, planted.context, {
      id: planted.exportId,
    });
    const after = await store.findSubscriptionById(planted.exportId);

    expect(before?.nextRunAt).toBeNull();
    expect(answered.success).toBe(true);
    expect(after).toEqual({ ...before, nextRunAt: FIXED_NOW });
    expect(answered.data).toEqual(JSON.parse(JSON.stringify(after)));

    // The other table is read back too: the two verbs share a
    // clock and a shape, and nothing else says they are separate.
    expect(await store.findTopicById(planted.topicId))
      .toEqual(topicBefore);
  });

  it('reads the clock the context carries, not the wall', async () => {
    const planted = await plantSurface();
    const later = new Date(Date.UTC(2027, 5, 6, 7, 8, 9));
    const moved: McpToolContext = {
      store: planted.store,
      clock: () => later,
    };
    const answered = await answerOf(toolNamed('topics.run-now'), moved, {
      id: planted.topicId,
    });
    const after = await planted.store.findTopicById(planted.topicId);

    expect(answered.success).toBe(true);
    expect(after?.nextRunAt).toEqual(later);

    // The control: the fixture instant is not the one written, so
    // a handler reading a constant would fail here rather than
    // agreeing with both cases.
    expect(later).not.toEqual(FIXED_NOW);
  });

  it('refuses an argument neither run-now declares', async () => {
    const planted = await plantSurface();
    const entry = toolNamed('topics.run-now');
    const input = { id: planted.topicId, [SENTINEL]: 'x' };
    const err = await refusalFrom(async () => answerOf(
      entry,
      planted.context,
      input,
    ));
    const sibling = await refusalFrom(async () => answerOf(
      toolNamed('exports.run-now'),
      planted.context,
      { id: planted.exportId, [SENTINEL]: 'x' },
    ));

    expect(err).toBeInstanceOf(ValidationError);
    expect(sibling).toBeInstanceOf(ValidationError);

    // `body` and not `query`: a tool is handed one object, which
    // is the root name `parseBody` gives it, and it is the one
    // place a tool refusal reads differently from its route.
    expect(faultsOf(err))
      .toEqual([{ field: 'body', code: 'unrecognized_keys' }]);
    expect(faultsOf(sibling)).toEqual(faultsOf(err));

    // The needle is in the input by construction, counted by the
    // same function, so the three zeros beneath it are a reading
    // rather than a search over nothing planted.
    expect(countOccurrences(JSON.stringify(input), SENTINEL)).toBe(1);
    expect(channelsOf(err).map((one) => countOccurrences(one, SENTINEL)))
      .toEqual([0, 0, 0]);

    // Read the state BEFORE the accepting control writes: the two
    // touch one row, and the control answer would otherwise be
    // what this assertion sees.
    const held = await planted.store.findTopicById(planted.topicId);

    expect(held?.nextRunAt).toBeNull();

    const answered = await answerOf(entry, planted.context, {
      id: planted.topicId,
    });

    expect(answered.success).toBe(true);
  });

  it('refuses a topic that would never be claimed', async () => {
    const planted = await plantSurface();
    const entry = toolNamed('topics.run-now');
    const paused = await planted.store.insertTopic({
      domainId: 1,
      name: 'paused',
      searchTerms: ['paused'],
      intervalSeconds: 3600,
      enabled: false,
      minIntervalSeconds: null,
      maxIntervalSeconds: null,
    });
    const err = await refusalFrom(async () => answerOf(
      entry,
      planted.context,
      { id: paused.id },
    ));
    const held = await planted.store.findTopicById(paused.id);

    expect(err).toBeInstanceOf(AppError);
    expect(err).not.toBeInstanceOf(ValidationError);
    expect(held?.nextRunAt).toBeNull();

    // The control, varied along this row own axis: the enabled
    // topic in the same fixture is moved by the same call.
    const answered = await answerOf(entry, planted.context, {
      id: planted.topicId,
    });

    expect(answered.success).toBe(true);
  });
});
