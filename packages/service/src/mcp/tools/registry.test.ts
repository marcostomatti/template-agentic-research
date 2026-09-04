/**
 * The MCP tool registry, read with no server started.
 *
 * WHAT THIS FILE COVERS THAT NOTHING ELSE CAN is that the list is
 * readable at all. `src/mcp/server.ts` calls `createMCP` at module
 * scope, so a case importing it boots a server and binds a port;
 * `./registry.ts` is the half that imports types, one zod type and
 * the wave lists it composes, and every reading below rests on
 * that. An import added there that reaches a transport takes this
 * file and `tests/invariants/mcp-exposure.test.ts` away together.
 *
 * THREE CLAIMS ABOUT THE LIST, and they now read something:
 * `MCP_TOOLS` carries all three wave modules whole, twenty-seven
 * entries between them. That is worth stating because it was not
 * true when this file was written — an empty list satisfies all
 * three, so a reader meeting three green cases needs to know
 * whether they read anything. The evidence is
 * still in the FABRICATED samples, which is where the same three
 * checks are shown to report and shown not to report everything,
 * and the checks are the same functions in both places rather than
 * a claim restated per sample.
 *
 * THE SAMPLES ARE A PAIR AND BOTH HALVES ARE LOAD-BEARING. The
 * clean one holds two well-formed entries, so a check that had
 * started reporting everything reddens the three cases about the
 * real list rather than passing them all at once. The faulty one
 * adds ONE entry carrying all three faults — a name the first entry
 * already holds, a route in no shape a router registers, and a
 * description of nothing but spaces — so each check is asked a
 * question it can get wrong, and each is asserted to answer with
 * the PLANT rather than merely to answer something.
 *
 * THE BLANK DESCRIPTION IS SPACES RATHER THAN THE EMPTY STRING,
 * which is the sharper plant: a check written as a length
 * comparison passes an entry whose description is whitespace, and
 * the client is shown a name with nothing beside it either way.
 *
 * THE ROUTE SHAPE IS DRIVEN FROM BOTH SIDES. The accepted table is
 * transcribed from labels the routers really register — read off
 * their own `stack` and not invented — and every near miss below
 * carries the well-formed label it was derived from in the same
 * case, so a predicate answering true for everything and one
 * answering false for everything each redden here. Whether a label
 * names a route some router still declares is a different question,
 * and it is taken elsewhere: `tests/invariants/mcp-exposure.test.ts`
 * reads it against the routers themselves, where this file is about
 * the form alone.
 *
 * THE CONTEXT IS SATISFIED BY THE FIXTURE STORE, which is a reading
 * the type alone does not make. `McpToolStore` is an intersection
 * of twelve ports; the case that builds a context from
 * `createMemoryResearchStore()` and calls one method from each end
 * of the wave range is what says that intersection is inhabited by
 * the object every route suite already uses, rather than by nothing
 * at all.
 *
 * Mutation grid, measured over the eighteen cases here with
 * `--reporter=json` and read as the failed case SET rather than as a
 * count. Fourteen legs, the whole grid run TWICE with the two
 * passes' sets diffed member for member and nothing moving.
 *
 * NINE MUTATE `./registry.ts`. The two whole-half legs on the shape
 * check bracket it: a pattern matching anything reddens 10 and one
 * matching nothing reddens 12, overlapping in 9, and the pair is
 * what says the accepted table and the near misses each carry a
 * direction. Underneath them every pinned property reports on its
 * own — making a `:parameter` segment illegal reddens 4, letting a
 * segment be capitalised reddens exactly the case named for it, and
 * dropping the anchors reddens the two near misses that are legal
 * labels with something stuck on the end.
 *
 * TWO OF THOSE NINE ARE ABOUT THE LIST AND THE ROSTER RATHER THAN
 * THE SHAPE, and the first is the only leg that can report on an
 * empty registry at all — measured when it was one, and unchanged
 * as a reading now that it is not. Planting two identical faulty
 * entries in `MCP_TOOLS` reddens exactly the three cases about it,
 * which is what says those three read that binding rather than a
 * list of their own. Adding a verb to `MCP_ROUTE_METHODS` that no
 * router registers reddens 2: the derived per-verb case, and the
 * near miss that refuses it.
 *
 * ONE READS ZERO AND IS RECORDED AS ONE. Writing the alternation out
 * instead of deriving it from the roster is behaviourally identical
 * while the two agree, so it reddens nothing; the leg that reports
 * is the written-out form with a verb DROPPED, at 2. The derivation
 * is a claim about where a verb has to be edited, not about what the
 * pattern answers today.
 *
 * ONE IS A HAZARD RATHER THAN A RULE. Adding a `g` flag to the
 * pattern reddens 4 — every case that asks it twice — because a
 * global pattern advances its own `lastIndex` between `.test()`
 * calls. Nothing else in this file would have reported it.
 *
 * FOUR MUTATE THIS FILE'S OWN CHECKS, which is where the samples
 * that make three of the four claims discriminating live. Each of
 * {@link duplicateNames} and {@link malformedRoutes} returning
 * nothing reddens exactly its own fabricated-sample case, and
 * {@link blankDescriptions} returning nothing and losing its
 * `.trim()` redden the same single case — an identical pair, told
 * apart only by the assertion that fails inside each.
 *
 * ONE LEG IS `check-types`-OWNED and is no vitest run at all.
 * Planting a member on `McpToolEntry` answers THREE diagnostics: the
 * TS2322 at {@link EVERY_KEY_LISTED}, which is the pin, and two
 * TS2741s from the entry literals below, which are the edit
 * reporting itself. Read which line each names — a leg scored on
 * `errors > 0` passes over a file carrying no pin at all.
 */
import type {
  McpToolContext,
  McpToolEntry,
  McpToolResult,
} from './registry.js';

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  createMemoryResearchStore,
} from '../../../tests/helpers/memory-research-store.js';

import {
  MCP_ROUTE_METHODS,
  MCP_TOOLS,
  isMcpRouteLabel,
} from './registry.js';

/**
 * The members {@link McpToolEntry} declares, written out.
 *
 * `satisfies` holds each entry to a real key; {@link CoversEveryKey}
 * below holds the list to the whole type.
 */
const ENTRY_KEYS = [
  'name',
  'description',
  'inputSchema',
  'route',
  'handler',
] as const satisfies readonly (keyof McpToolEntry)[];

/**
 * `true` only while `L` names every key of `T`.
 *
 * The tuple wrapper is load-bearing rather than decoration: without
 * it the union distributes over the conditional and the answer is
 * `boolean`, which accepts `true` as an initializer and pins nothing
 * at all.
 *
 * @typeParam T - The type whose keys must all be named.
 * @typeParam L - The list naming them, as `typeof <the const>`.
 */
type CoversEveryKey<T, L extends readonly PropertyKey[]> =
  [Exclude<keyof T, L[number]>] extends [never] ? true : false;

/**
 * The half of the drift guard `check-types` owns.
 *
 * A member added to {@link McpToolEntry} and not to
 * {@link ENTRY_KEYS} collapses this to `false`, and the initializer
 * below is then a TS2322 at that line.
 */
type EveryKeyListed = CoversEveryKey<McpToolEntry, typeof ENTRY_KEYS>;

/** Read in a case below, so it is a symbol this file uses. */
const EVERY_KEY_LISTED: EveryKeyListed = true;

/** {@link ENTRY_KEYS}, sorted at use rather than by hand. */
const ENTRY_KEY_SET: readonly string[] = [...ENTRY_KEYS].sort();

/** The instant a context in this file reports as the present. */
const FIXED_NOW = new Date(Date.UTC(2026, 1, 3, 4, 5, 6));

/** The schema every fabricated entry declares. */
const SAMPLE_SCHEMA = z.object({ id: z.number() }).strict();

/** What every fabricated handler answers. */
const SAMPLE_TEXT = 'a fabricated tool answered';

/**
 * A handler that reads neither of its arguments.
 *
 * Declared with no parameters on purpose: a narrower signature is
 * assignable, which is the same direction that lets a wave module
 * declare a handler over a `Pick` of the store.
 *
 * @returns The one block {@link SAMPLE_TEXT} names.
 */
async function sampleHandler(): Promise<McpToolResult> {
  return { content: [{ type: 'text', text: SAMPLE_TEXT }] };
}

/**
 * A fabricated entry, declared by this file and registered nowhere.
 *
 * @param name - What it would be called by.
 * @param route - Its route label.
 * @param description - Its description.
 * @returns The entry.
 */
function sampleEntry(
  name: string,
  route: string,
  description: string,
): McpToolEntry {
  return {
    name,
    description,
    inputSchema: SAMPLE_SCHEMA,
    route,
    handler: sampleHandler,
  };
}

/** The first well-formed sample; the plant borrows its name. */
const FIRST_SAMPLE = sampleEntry(
  'runs.list',
  'GET /runs',
  'Lists the passes this deployment has recorded.',
);

/** The second, so the clean sample holds more than one entry. */
const SECOND_SAMPLE = sampleEntry(
  'runs.get',
  'GET /runs/:id',
  'Reads one pass and the head of its ledger.',
);

/**
 * Two well-formed entries, which every check must answer nothing
 * about.
 *
 * The control on the three cases about {@link MCP_TOOLS}: their
 * zeros are satisfied by a check reporting everything — which is
 * how they read when that list was empty and is still how they
 * would read if a check stopped discriminating — and this sample is
 * what refuses that reading.
 */
const CLEAN_SAMPLE: readonly McpToolEntry[] = [FIRST_SAMPLE, SECOND_SAMPLE];

/**
 * One entry carrying all three faults at once.
 *
 * It repeats {@link FIRST_SAMPLE}'s name, names a route in no shape
 * a router registers, and describes itself with spaces.
 */
const FABRICATED_DUPLICATE = sampleEntry(
  FIRST_SAMPLE.name,
  'get runs',
  '   ',
);

/** {@link CLEAN_SAMPLE} with {@link FABRICATED_DUPLICATE} added. */
const FAULTY_SAMPLE: readonly McpToolEntry[] = [
  FIRST_SAMPLE,
  SECOND_SAMPLE,
  FABRICATED_DUPLICATE,
];

/**
 * The names an entry list repeats.
 *
 * @param entries - The list to read.
 * @returns Every name carried by more than one entry, sorted and
 *   named once each.
 */
function duplicateNames(entries: readonly McpToolEntry[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();

  for (const entry of entries) {
    if (seen.has(entry.name)) {
      repeated.add(entry.name);
    }

    seen.add(entry.name);
  }

  return [...repeated].sort();
}

/**
 * The route labels an entry list carries that are in the wrong
 * shape.
 *
 * Asked through `isMcpRouteLabel` rather than through a pattern of
 * this file's own, so the module and its cases read one authority.
 *
 * @param entries - The list to read.
 * @returns The offending labels, sorted.
 */
function malformedRoutes(entries: readonly McpToolEntry[]): string[] {
  return entries
    .filter((entry) => !isMcpRouteLabel(entry.route))
    .map((entry) => entry.route)
    .sort();
}

/**
 * The entries whose description says nothing.
 *
 * Trimmed first: whitespace is as unusable to a client as the empty
 * string, and a check comparing lengths alone would pass it.
 *
 * @param entries - The list to read.
 * @returns The NAMES of the offending entries, sorted — the label a
 *   reader can look the entry up by, where the description itself
 *   is by definition nothing to read.
 */
function blankDescriptions(entries: readonly McpToolEntry[]): string[] {
  return entries
    .filter((entry) => entry.description.trim().length === 0)
    .map((entry) => entry.name)
    .sort();
}

describe('the contract every entry satisfies', () => {
  // The key set, both halves. The runtime one catches a member an
  // entry carries that the type does not declare; the type one, at
  // EVERY_KEY_LISTED, catches a member declared that this list does
  // not name. Neither sees the other's fault.
  it('names exactly the members the type declares', () => {
    expect(EVERY_KEY_LISTED).toBe(true);
    expect(Object.keys(FIRST_SAMPLE).sort()).toEqual(ENTRY_KEY_SET);
    expect(ENTRY_KEY_SET).toHaveLength(5);
  });

  // What the type alone does not say is that anything satisfies the
  // context. The store here is the object every route suite already
  // builds, and the two reads are one method from a wave-1 port and
  // one from a wave-3 port, so a McpToolStore that had lost either
  // end of the range stops compiling at this case.
  it('takes the composed store every router already takes', async () => {
    const store = createMemoryResearchStore();
    const context: McpToolContext = { store, clock: () => FIXED_NOW };
    const seenContexts: McpToolContext[] = [];
    const seenInputs: unknown[] = [];

    const entry: McpToolEntry = {
      name: 'sample.context',
      description: 'Answers what it was handed.',
      inputSchema: SAMPLE_SCHEMA,
      route: 'GET /runs',
      async handler(given, input) {
        seenContexts.push(given);
        seenInputs.push(input);

        return { content: [{ type: 'text', text: SAMPLE_TEXT }] };
      },
    };

    const answered = await entry.handler(context, { id: 7 });

    expect(seenContexts).toHaveLength(1);
    expect(seenContexts[0]).toBe(context);
    expect(seenInputs).toEqual([{ id: 7 }]);
    expect(answered.content).toEqual([
      { type: 'text', text: SAMPLE_TEXT },
    ]);
    expect(context.clock()).toEqual(FIXED_NOW);
    expect(await context.store.countDomains()).toBe(0);
    expect(await context.store.countRuns({})).toBe(0);
  });
});

describe('the registry as it stands', () => {
  // The first assertion reads wave 1's entries; the second is what
  // says the check still discriminates, since a check reporting
  // everything answers two names over the clean sample.
  it('holds no two entries under one name', () => {
    expect(duplicateNames(MCP_TOOLS)).toEqual([]);
    expect(duplicateNames(CLEAN_SAMPLE)).toEqual([]);
  });

  it('holds no route outside the shape the routers register', () => {
    expect(malformedRoutes(MCP_TOOLS)).toEqual([]);
    expect(malformedRoutes(CLEAN_SAMPLE)).toEqual([]);
  });

  it('holds no entry whose description says nothing', () => {
    expect(blankDescriptions(MCP_TOOLS)).toEqual([]);
    expect(blankDescriptions(CLEAN_SAMPLE)).toEqual([]);
  });
});

describe('a fabricated faulty entry, through the same checks', () => {
  // One plant, three faults, three checks. Each is asserted to name
  // the plant rather than to answer something, and the well-formed
  // entries beside it are asserted absent by the same call.
  it('is reported by the duplicate-name check', () => {
    expect(duplicateNames(FAULTY_SAMPLE)).toEqual([FIRST_SAMPLE.name]);
  });

  it('is reported by the route-shape check', () => {
    expect(malformedRoutes(FAULTY_SAMPLE))
      .toEqual([FABRICATED_DUPLICATE.route]);
  });

  it('is reported by the description check', () => {
    expect(blankDescriptions(FAULTY_SAMPLE)).toEqual([FIRST_SAMPLE.name]);
  });
});

/**
 * Labels the routers really register, read off their own `stack`
 * and transcribed here.
 *
 * Nine of the fifty-two labels the sixteen routers in this
 * package declare, chosen for the forms rather than for the
 * routes: every verb appears, and between them they carry a
 * one-segment path, a `:parameter`, a hyphenated segment and a
 * three-segment path. All fifty-two were accepted by
 * `isMcpRouteLabel` when this table was written, which is the
 * reading against the whole real surface that these nine cannot
 * make. Membership is not the claim — a label dropped from a
 * router leaves this table describing a form that is still
 * legal — so nothing here goes stale in a way that matters.
 */
const REGISTERED_LABELS: readonly string[] = [
  'GET /domains',
  'DELETE /domains/:slug',
  'GET /domains/:slug/findings',
  'PATCH /findings/:id/verdict',
  'POST /topics/:id/run-now',
  'GET /sources/:id/pending-configs',
  'POST /entities/:id/approve-research',
  'PUT /settings',
  'GET /spend/summary',
];

/**
 * One near miss and the well-formed label it was derived from.
 *
 * The pairing is what makes each row a reading: a predicate
 * answering false for everything passes the refusals alone, and one
 * answering true for everything passes the acceptances alone.
 */
interface RouteNearMiss {
  /** What is wrong with the left-hand label. */
  readonly fault: string;

  /** The label that must be refused. */
  readonly wrong: string;

  /** The label it came from, which must be accepted. */
  readonly right: string;
}

/** Every way a label can be in the wrong shape. */
const ROUTE_NEAR_MISSES: readonly RouteNearMiss[] = [
  {
    fault: 'the verb is lowercase',
    wrong: 'get /domains',
    right: 'GET /domains',
  },
  {
    fault: 'the verb is not on the roster',
    wrong: 'OPTIONS /domains',
    right: 'GET /domains',
  },
  {
    fault: 'nothing separates the two halves',
    wrong: 'GET/domains',
    right: 'GET /domains',
  },
  {
    fault: 'the path has no leading slash',
    wrong: 'GET domains',
    right: 'GET /domains',
  },
  {
    fault: 'the path ends in a slash',
    wrong: 'GET /domains/',
    right: 'GET /domains',
  },
  {
    fault: 'a segment is capitalised',
    wrong: 'GET /Domains',
    right: 'GET /domains',
  },
  {
    fault: 'a space stands where a separator should',
    wrong: 'GET /domains/:slug findings',
    right: 'GET /domains/:slug/findings',
  },
  {
    fault: 'there is nothing there at all',
    wrong: '',
    right: 'GET /domains',
  },
];

describe('the route label shape', () => {
  it('accepts every shape the routers register', () => {
    const accepted = REGISTERED_LABELS.filter(isMcpRouteLabel);

    expect(REGISTERED_LABELS.length).toBeGreaterThan(0);
    expect(accepted).toEqual(REGISTERED_LABELS);
  });

  // One case per fault, each carrying the label it was derived from
  // so a predicate that had stopped accepting anything reddens here
  // rather than passing every refusal at once.
  it.each(ROUTE_NEAR_MISSES)('refuses a label where $fault', (row) => {
    expect(isMcpRouteLabel(row.wrong)).toBe(false);
    expect(isMcpRouteLabel(row.right)).toBe(true);
  });

  // Derived from the roster rather than written out, so a verb added
  // to MCP_ROUTE_METHODS is driven with nothing else edited. The
  // length guard is what stops an emptied roster from collapsing
  // this into a case that reads nothing.
  it('accepts one label per verb the roster declares', () => {
    const labels = MCP_ROUTE_METHODS.map((method) => `${method} /runs`);
    const accepted = labels.filter(isMcpRouteLabel);

    expect(MCP_ROUTE_METHODS.length).toBeGreaterThan(0);
    expect(accepted).toEqual(labels);
    expect(isMcpRouteLabel('OPTIONS /runs')).toBe(false);
  });
});
