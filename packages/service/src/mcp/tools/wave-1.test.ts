/**
 * The wave-1 tools, read and driven with no server and no database.
 *
 * TWO KINDS OF READING, and only one of them is about behaviour.
 * The first is the SCHEMA IDENTITY: every entry's `inputSchema` is
 * asserted `Object.is`-identical to the binding its own route
 * module exports, which is the check a structural comparison
 * cannot make. A copy of the schema written out beside the tool
 * would satisfy `toEqual` and would drift the day the route grows
 * a member — so the pairing below is one row per tool, and the row
 * set is held EQUAL to the entry set so a tool added without a row
 * fails NAMING itself rather than passing unread.
 *
 * THE PAIRING NEEDS THE DISTINCTNESS CASE BESIDE IT. Eight rows
 * each asserting an identity are all satisfied by a surface where
 * one schema is shared by everything, since the failing rows would
 * name the schema and not the fault; the case asserting eight
 * DISTINCT schema objects is what rules that out, and the case
 * asserting the entries are the ones `MCP_TOOLS` holds is what
 * says this list reached the registry at all.
 *
 * THE SECOND KIND IS ONE READ AND ONE EDIT, DRIVEN. `terms.list`
 * and `terms.patch` are run over `createMemoryResearchStore()` —
 * the object every route suite already uses — because a schema
 * identity says nothing about whether a handler reaches the
 * service the route reaches. Both answers are held against the
 * STORE'S OWN READ rather than against a transcribed row: the id
 * and the ordering are the two things no argument carried, so an
 * answer rebuilt out of the input would pass a member-by-member
 * comparison and fails this one.
 *
 * THE FIXTURE IS PLANTED OUT OF ORDER, three terms whose insertion
 * order is neither the answer nor its reverse, so a store handing
 * the seam back unsorted is reported by the page rather than
 * agreeing with it by accident. The paging case reads the two
 * halves of a partition, which is the reading a single narrowed
 * page cannot make: the windows SUM to the total and neither
 * equals it.
 *
 * THE EDIT CARRIES ITS BROKEN SIBLING. An undeclared argument is
 * refused with `field: 'body'` — the root name `parseBody` gives,
 * and the one place a tool refusal reads differently from the
 * route's own `query` — and the sentinel it was sent under is
 * counted in three channels and found in none, against a positive
 * control taken by the same function over the input itself. The
 * state read comes BEFORE the accepting control in that case,
 * since both touch the same row and the control's own write would
 * otherwise be what the assertion sees.
 *
 * Mutation grid, measured over the seventeen cases here with
 * `--reporter=json` and read as the failed case SET rather than as
 * a count. Fourteen legs, the twelve below run as a whole grid
 * TWICE with the two passes' sets diffed member for member and
 * nothing moving.
 *
 * FOUR ARE ABOUT THE PAIRING. Pointing every entry at ONE schema
 * reddens 8 — the seven rows that are not that schema, plus the
 * distinctness case, which is the member no single row could have
 * reported. Swapping two entries' schemas reddens exactly those two
 * rows. Renaming one entry out of the pairing reddens its own row
 * and the set equality beside it, which is what says a tool added
 * without a row fails NAMING itself. And emptying the registry's
 * spread reddens the carried-whole case alone.
 *
 * FIVE ARE ABOUT THE DRIVEN READ AND EDIT. Ignoring the window the
 * arguments carried reddens 1 (the paging case), answering the page
 * reversed reddens 2, and dropping the window members from the
 * tool-input schema reddens the same 2 — told apart only by the
 * assertion that fails inside each, since one is an order and the
 * other a refused parameter. Discarding the patch write reddens 2.
 * Losing `.strict()` on the patch input reddens the refusal case.
 *
 * ONE MUTATES THIS FILE, and it is the containment control:
 * {@link countOccurrences} answering nothing reddens exactly the
 * refusal case, whose in-band positive is the needle counted in the
 * input by that same function. Without it the three zeros beneath
 * are a search nobody proved runs.
 *
 * TWO READ ZERO AND ARE RECORDED WITH THEIR REASONS. Answering
 * `{...patched, ...body, id}` is a NO-OP dressed as a mutation —
 * the stored row already carries what the arguments sent — so the
 * spelling that reports is the answer rebuilt from the arguments
 * ALONE (`ok({ id, ...body })`), which reddens 1, as does answering
 * a row read before the write. And skipping the tool's own
 * `parseBody` on the patch reddens NOTHING, because `patchTerm`
 * parses its half again: the tool's strictness is a second guard
 * over the same fault rather than the only one, which is worth
 * knowing before a later task moves either parse.
 *
 * WHAT NO LEG HERE REACHES: six of the eight entries are covered by
 * the schema identity and by nothing driven. The task that wrote
 * this file was scoped to one read and one edit, and
 * `tests/mcp/transport.test.ts` is where the assembled registry is
 * driven end to end.
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
  domainListToolInputSchema,
  domainReadToolInputSchema,
} from '../../domains/routes.js';
import {
  personaListToolInputSchema,
} from '../../personas/routes.js';
import {
  settingsReadToolInputSchema,
} from '../../settings/routes.js';
import {
  categoryListToolInputSchema,
} from '../../taxonomy/categories-routes.js';
import {
  termCreateToolInputSchema,
  termListToolInputSchema,
  termPatchToolInputSchema,
} from '../../taxonomy/terms-routes.js';

import { MCP_TOOLS } from './registry.js';
import { WAVE_1_TOOLS } from './wave-1.js';

/** The instant a context in this file reports as the present. */
const FIXED_NOW = new Date(Date.UTC(2026, 1, 3, 4, 5, 6));

/** The domain every case plants under. */
const RADAR = 'radar';

/** The category the terms hang off. */
const LANGUAGES = 'languages';

/**
 * A needle no stack frame, constraint name or module path carries.
 *
 * Sent as an undeclared argument, so the refusal it raises has
 * something to leak that this file can look for.
 */
const SENTINEL = 'zzsentinelzz';

/** The three patterns, in the order they are PLANTED. */
const PLANTED_PATTERNS: readonly string[] = ['beta', 'gamma', 'alpha'];

/**
 * The same three in the order the port promises to answer them.
 *
 * Neither the planted order nor its reverse, which is what makes a
 * page assertion a reading about the store rather than about the
 * fixture.
 */
const ANSWERED_PATTERNS: readonly string[] = ['alpha', 'beta', 'gamma'];

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
  { name: 'domains.list', schema: domainListToolInputSchema },
  { name: 'domains.get', schema: domainReadToolInputSchema },
  { name: 'categories.list', schema: categoryListToolInputSchema },
  { name: 'terms.list', schema: termListToolInputSchema },
  { name: 'personas.list', schema: personaListToolInputSchema },
  { name: 'settings.get', schema: settingsReadToolInputSchema },
  { name: 'terms.create', schema: termCreateToolInputSchema },
  { name: 'terms.patch', schema: termPatchToolInputSchema },
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
  const found = WAVE_1_TOOLS.find((entry) => entry.name === name);

  if (found === undefined) {
    throw new Error(`no wave-1 tool is registered as ${name}`);
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

/**
 * Runs one tool and reads the envelope out of its single block.
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
 *   joined blob would hide which one leaked.
 */
function channelsOf(err: AppError): readonly string[] {
  const cause = err.cause;
  const rendered = cause instanceof Error
    ? `${cause.name} ${cause.message} ${cause.stack ?? ''}`
    : String(cause ?? '');

  return [err.message, JSON.stringify(err.details ?? []), rendered];
}

/** What {@link plantSurface} answers. */
interface PlantedSurface {
  /** The fixture store, reachable for a read-back. */
  readonly store: MemoryResearchStore;

  /** What a handler is handed. */
  readonly context: McpToolContext;

  /** The category the terms hang off. */
  readonly categoryId: number;

  /** The term `alpha`, which the edit cases rewrite. */
  readonly alphaId: number;
}

/**
 * Plants one domain, one category and three terms.
 *
 * The terms go in through the STORE rather than through a tool:
 * nothing in this file is a claim about `terms.create` as a
 * fixture, and planting past the subject would leave the read
 * cases green against a create that refused everything.
 *
 * @returns The store, a context over it, and the two ids the cases
 *   address.
 */
async function plantSurface(): Promise<PlantedSurface> {
  const store = createMemoryResearchStore();
  const context: McpToolContext = { store, clock: () => FIXED_NOW };
  const domain = await store.insertDomain({
    slug: RADAR,
    name: 'Radar',
    settings: {},
  });
  const category = await store.insertCategory({
    domainId: domain.id,
    key: LANGUAGES,
    name: 'Languages',
    parentId: null,
  });

  let alphaId = 0;

  for (const pattern of PLANTED_PATTERNS) {
    const term = await store.insertTerm({
      categoryId: category.id,
      pattern,
      weight: 3,
      polarity: 'positive',
      notes: null,
    });

    if (pattern === 'alpha') {
      alphaId = term.id;
    }
  }

  return { store, context, categoryId: category.id, alphaId };
}

/** The patterns an answered page carries, in order. */
function patternsOf(data: unknown): readonly string[] {
  const rows = data as readonly { readonly pattern: string }[];

  return rows.map((row) => row.pattern);
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
    const registered = WAVE_1_TOOLS.map((entry) => entry.name).sort();

    expect(registered.length).toBeGreaterThan(0);
    expect(paired).toEqual(registered);
  });

  // What the eight identities cannot say on their own: no two
  // entries lean on one schema object.
  it('gives no two entries one schema object', () => {
    const schemas = new Set(WAVE_1_TOOLS.map((e) => e.inputSchema));
    const routes = new Set(WAVE_1_TOOLS.map((e) => e.route));

    expect(schemas.size).toBe(WAVE_1_TOOLS.length);
    expect(routes.size).toBe(WAVE_1_TOOLS.length);
  });

  // And that the list reached the registry, which is the one thing
  // a reader of this file would otherwise assume.
  it('is carried whole by the registry', () => {
    const missing = WAVE_1_TOOLS.filter((e) => !MCP_TOOLS.includes(e));

    expect(WAVE_1_TOOLS.length).toBeGreaterThan(0);
    expect(missing).toEqual([]);
  });
});

describe('the terms read, driven', () => {
  it('answers the page the store answers', async () => {
    const planted = await plantSurface();
    const entry = toolNamed('terms.list');
    const stored = await planted.store.listTerms(planted.categoryId);
    const answered = await answerOf(entry, planted.context, {
      id: planted.categoryId,
    });

    expect(stored).toHaveLength(PLANTED_PATTERNS.length);
    expect(answered.success).toBe(true);
    expect(answered.data).toEqual(JSON.parse(JSON.stringify(stored)));
    expect(patternsOf(answered.data)).toEqual(ANSWERED_PATTERNS);
    expect(answered.meta).toEqual({
      page: 1,
      perPage: 50,
      total: PLANTED_PATTERNS.length,
      totalPages: 1,
    });
  });

  it('reads the window the arguments asked for', async () => {
    const planted = await plantSurface();
    const entry = toolNamed('terms.list');
    const first = await answerOf(entry, planted.context, {
      id: planted.categoryId,
      perPage: 2,
    });
    const second = await answerOf(entry, planted.context, {
      id: planted.categoryId,
      page: 2,
      perPage: 2,
    });
    const halves = [
      ...patternsOf(first.data),
      ...patternsOf(second.data),
    ];

    // A partition: the two windows sum to the collection and
    // neither of them is it, which no single narrowed page says.
    expect(halves).toEqual(ANSWERED_PATTERNS);
    expect(patternsOf(first.data)).toHaveLength(2);
    expect(patternsOf(second.data)).toHaveLength(1);
    expect(first.meta).toEqual({
      page: 1,
      perPage: 2,
      total: PLANTED_PATTERNS.length,
      totalPages: 2,
    });
  });

  it('refuses a category segment that is not an id', async () => {
    const planted = await plantSurface();
    const entry = toolNamed('terms.list');
    const err = await refusalFrom(async () => answerOf(
      entry,
      planted.context,
      { id: 'not-an-id' },
    ));

    expect(err).toBeInstanceOf(ValidationError);

    // The control, varied along this row own axis: the same call
    // with a real id lands, so the refusal is about the id.
    const answered = await answerOf(entry, planted.context, {
      id: planted.categoryId,
    });

    expect(answered.success).toBe(true);
  });
});

describe('the term edit, driven', () => {
  it('writes the member it was sent and no other', async () => {
    const planted = await plantSurface();
    const entry = toolNamed('terms.patch');
    const before = await planted.store.listTerms(planted.categoryId);
    const answered = await answerOf(entry, planted.context, {
      id: planted.alphaId,
      weight: 11,
    });
    const after = await planted.store.listTerms(planted.categoryId);
    const rewritten = after.find((row) => row.id === planted.alphaId);
    const untouched = after.filter((row) => row.id !== planted.alphaId);

    expect(answered.success).toBe(true);
    expect(rewritten?.weight).toBe(11);

    // The answer is the STORED row rather than the argument: the id
    // and the pattern are members no argument carried.
    expect(answered.data).toEqual(JSON.parse(JSON.stringify(rewritten)));
    expect(untouched).toEqual(
      before.filter((row) => row.id !== planted.alphaId),
    );
    expect(untouched).toHaveLength(PLANTED_PATTERNS.length - 1);
  });

  it('moves a term between categories', async () => {
    const planted = await plantSurface();
    const entry = toolNamed('terms.patch');
    const second = await planted.store.insertCategory({
      domainId: 1,
      key: 'tooling',
      name: 'Tooling',
      parentId: null,
    });
    const answered = await answerOf(entry, planted.context, {
      id: planted.alphaId,
      categoryId: second.id,
    });
    const moved = await planted.store.listTerms(second.id);
    const left = await planted.store.listTerms(planted.categoryId);

    expect(answered.success).toBe(true);
    expect(moved.map((row) => row.pattern)).toEqual(['alpha']);
    expect(left).toHaveLength(PLANTED_PATTERNS.length - 1);
  });

  it('refuses an argument it does not declare', async () => {
    const planted = await plantSurface();
    const entry = toolNamed('terms.patch');
    const input = { id: planted.alphaId, weight: 11, [SENTINEL]: 'x' };
    const err = await refusalFrom(async () => answerOf(
      entry,
      planted.context,
      input,
    ));
    const details = (err.details ?? []) as readonly FieldError[];

    expect(err).toBeInstanceOf(ValidationError);
    expect(details.map((one) => ({ field: one.field, code: one.code })))
      .toEqual([{ field: 'body', code: 'unrecognized_keys' }]);

    // The needle is in the input by construction, counted by the
    // same function, so the three zeros beneath it are a reading
    // rather than a search over nothing planted.
    expect(countOccurrences(JSON.stringify(input), SENTINEL)).toBe(1);
    expect(channelsOf(err).map((one) => countOccurrences(one, SENTINEL)))
      .toEqual([0, 0, 0]);

    // Read the state BEFORE the accepting control writes: the two
    // touch one row, and the control answer would otherwise be
    // what this assertion sees.
    const untouched = await planted.store.listTerms(planted.categoryId);
    const held = untouched.find((row) => row.id === planted.alphaId);

    expect(held?.weight).toBe(3);

    const answered = await answerOf(entry, planted.context, {
      id: planted.alphaId,
      weight: 11,
    });

    expect(answered.success).toBe(true);
  });
});
