/**
 * The assembled registry, driven end to end over `InMemoryTransport`.
 *
 * THE ONE READING THAT CROSSES THE PROTOCOL. Each wave module test
 * calls its own handlers directly, with nothing between the case and
 * the function, and `tests/invariants/mcp-exposure.test.ts` reads the
 * list against the routers and calls nothing at all. So a handler
 * that answers correctly and a tool that was never offered are one
 * state everywhere else here. This file asks a CLIENT what the server
 * offers, calls a tool by name, and reads what came back — which is
 * the only place the registration loop, the SDK's own parse of an
 * `inputSchema`, and the text block `src/mcp/tools/text-result.ts`
 * builds are all on the path at once.
 *
 * IT DRIVES A COPY OF THAT LOOP AND NOT THE MODULE, which is a limit
 * rather than a shortcut, and it is the deleted echo test's shape
 * kept. `src/mcp/server.ts` calls `createMCP` at module scope and
 * builds a Postgres dependency above it, so importing it boots a
 * server and binds a port: there is no handle to the server that
 * module built and no way to reach it from a case.
 * {@link startLinked} registers `MCP_TOOLS` the way that loop does,
 * over the same context shape, so what is proven is that the REGISTRY
 * crosses correctly rather than that the entry point wired it. A loop
 * edited only in that module is the one fault nothing here can
 * report, and it is recorded as such rather than left to be found.
 *
 * THE SDK NEVER THROWS OUT OF `callTool`, and a case written around a
 * try/catch reads a clean pass over a surface that answered nothing.
 * Measured against this registry: an unregistered name comes back as
 * an ordinary RESULT carrying `isError: true` and one text block
 * reading `MCP error -32602: Tool <name> not found`, and a handler
 * that RAISED comes back the same way with the raised sentence as its
 * only block. So the refusal below is read off `result.isError` and
 * `result.content` and never off a catch. Two things follow that are
 * worth knowing before another case is written here. The `code` an
 * `AppError` carries does NOT survive the crossing, so a 404 and a
 * 409 are one shape on this protocol and are told apart by their
 * sentence alone. And the SDK parses an `inputSchema` ITSELF before a
 * handler runs, so a malformed argument is refused in the SDK's own
 * wording rather than in this repo's `ValidationError` vocabulary —
 * which is also the cheapest proof that the schema an entry carries
 * really crossed rather than being ignored.
 *
 * WHAT THE OFFERED LIST IS HELD AGAINST, and why the plant beside it
 * is the whole of its liveness. The name set a client is shown is
 * asserted EQUAL to the names `MCP_TOOLS` carries, in both
 * directions: an entry the loop never reached is missing from the
 * offered side, and a tool registered OUTSIDE the loop is the extra
 * member on it. That second direction is the one a reader cannot see
 * from the assertion alone, so the same case starts a SECOND linked
 * pair whose server carries one `registerTool` call after the loop
 * and asserts the comparison names it. Without that plant the
 * equality is a zero over two lists nobody proved could differ.
 *
 * ONE READ AND ONE MUTATION ARE DRIVEN, and both are held against the
 * STORE'S OWN READ rather than against a transcribed body. The id,
 * the domain, the stamp and the ordering are what no argument
 * carried, so an answer rebuilt out of the input would pass a
 * member-by-member comparison and fails this one. The comparison is
 * made through `JSON.parse(JSON.stringify(...))` of the stored rows,
 * which is exactly what the crossing does to them: a `Date` is an ISO
 * string on the wire, and holding a wire answer against a live `Date`
 * would fail over a correct tool.
 *
 * THE READ IS `findings.get` BECAUSE IT EMBEDS COLLECTIONS, so the
 * crossing is read over a nested answer rather than a flat row. Its
 * sightings and its rulings are planted non-empty; its research is
 * empty BY CONSTRUCTION, the planted finding naming no entity, and
 * that half is covered by `src/mcp/tools/wave-3.test.ts` rather than
 * here.
 *
 * THE MUTATION IS `findings.verdict` because its write is readable
 * from the store with no second call: the ruling is APPENDED, so the
 * label list grows by one and the answered row is the head of it. The
 * store and the context read the SAME fixed instant, which is what
 * makes the stamp assertable at all — `finding_labels.labelled_at`
 * defaults to `now()`, and `now()` here is the clock this fixture
 * handed in rather than the wall.
 *
 * THE BANNED NAMES ARE COMPOSED, NOT REGISTERED, and the case says so
 * in as many words. `tests/invariants/mcp-exposure.test.ts` owns the
 * claim that no entry NAMES a banned route; what this one reads is
 * the other end of it, that a client asking for such a tool by the
 * name this surface's own convention would give it is offered
 * nothing and refused. A fabricated name is absent for the trivial
 * reason, so the case carries a REGISTERED name called the same way
 * in the same request sequence, asserted to answer with no error at
 * all — that positive is what says the refusal discriminates.
 *
 * MEASURED, ELEVEN LEGS, read as the failed case SET rather than as
 * a count and run as a whole grid TWICE with the two passes diffed
 * member for member and nothing moving.
 *
 * FOUR ARE ABOUT THE OFFERED LIST. Registering the plant nowhere
 * reddens the equality case (1 of 5), and so does an
 * {@link offeredNames} that answers the registry instead of asking
 * the client — an identical pair told apart only by the assertion
 * that fails inside each, and between them the whole of that case's
 * liveness. Dropping the last entry from the LOOP reddens 2, the
 * equality and the description case beside it, which is the shape an
 * entry the loop never reached takes. Registering the name as the
 * description reddens the description case alone.
 *
 * ONE IS AN HONEST ZERO AND IT IS THE SHARPEST READING HERE.
 * Dropping the wave-3 spread from `MCP_TOOLS` reddens 2 — the read
 * and the mutation, whose tools stop existing — and leaves BOTH
 * offers cases GREEN. A tool deleted from the REGISTRY moves the
 * offered side and the expected side together, so no equality in
 * this file can see it: what those two cases report is a name
 * offered that the registry has not, and never the reverse. The
 * reverse belongs to `tests/invariants/mcp-exposure.test.ts`, where
 * a route left behind by a deleted tool is an uncovered label.
 *
 * THREE ARE ABOUT THE TWO DRIVEN CALLS. `findings.get` answering its
 * own argument reddens the read case, `findings.verdict` answering
 * the parsed body reddens the mutation case, and a store writing a
 * ruling OVER the last one rather than appending reddens that same
 * mutation case — which is what says the case reads the WRITE and
 * not the answer.
 *
 * THREE ARE ABOUT THE CROSSING ITSELF, and two of them redden one
 * set. Registering the banned names reddens the refusal case and
 * both offers cases (3 of 5), which is the refusal shown
 * discriminating rather than answering true for every name.
 * `textResult` answering TWO blocks reddens the read, the mutation
 * and the refusal case's own positive control, and so does a loop
 * handing `registerTool` no `inputSchema` at all — an identical pair
 * by set, and the second is worth its leg: without the schema the
 * SDK offers a tool that takes no arguments and refuses every driven
 * call before its handler runs, which is the measured proof that the
 * schema an entry carries really crosses.
 */
import type { McpToolContext } from '../../src/mcp/tools/registry.js';
import type {
  MemoryFindingSighting,
  MemoryResearchStore,
} from '../helpers/memory-research-store.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { describe, expect, it } from 'vitest';

import { MCP_TOOLS } from '../../src/mcp/tools/registry.js';
import {
  createMemoryResearchStore,
} from '../helpers/memory-research-store.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** The instant both the store and the context report as the present. */
const FIXED_NOW = new Date(Date.UTC(2026, 2, 10));

/** The domain everything below is planted under. */
const RADAR = 'radar';

/**
 * The verdicts the planted domain declares.
 *
 * Written on the domain row rather than left to
 * `DEFAULT_VERDICT_VOCABULARY`, so this fixture states its own
 * vocabulary and the ruling below is a member of something visible in
 * this file.
 */
const LADDER: readonly string[] = ['watch', 'neutral', 'interested'];

/** The verdict the ruling case sends; a member of {@link LADDER}. */
const VERDICT = 'interested';

/** The verdict the planted ruling already carries. */
const PLANTED_VERDICT = 'neutral';

/** `findings.id` of the one finding, planted rather than inserted. */
const FINDING = 7200001;

/** The document it was read out of. */
const DOCUMENT = 7300001;

/** `finding_sightings.id` of the one sighting hanging off it. */
const SIGHTING = 7800001;

/**
 * A name no entry carries, registered after the loop.
 *
 * The plant for the offered-list equality: a tool a call site outside
 * the loop added is offered and is in no registry, which is exactly
 * the extra member that case has to be shown reporting.
 */
const PLANTED_TOOL = 'zz.outside-the-loop';

/** What the linked servers below report as their name. */
const SERVER_NAME = 'zz-transport-test';

/** What they report as their version. Never read. */
const SERVER_VERSION = '0.0.1';

/**
 * The names a tool over each banned route would carry.
 *
 * COMPOSED ON THIS SURFACE'S OWN CONVENTION AND REGISTERED NOWHERE,
 * which is the point rather than a gap: `tests/invariants/mcp-
 * exposure.test.ts` holds the claim that no ENTRY names a banned
 * route, and what a client can ask for is the other end of it. One
 * per banned family, the fourth being the control plane, which that
 * invariant classifies by prefix rather than by row. The `route`
 * member records which surface each name stands for and is read by a
 * reader rather than by a case.
 */
const BANNED_NAMES = [
  { name: 'connectors.create', route: 'POST /connectors' },
  { name: 'connectors.patch', route: 'PATCH /connectors/:id' },
  { name: 'domains.delete', route: 'DELETE /domains/:slug' },
  { name: 'control.stop', route: 'POST /_control/stop' },
] as const;

/** A registered name, called beside the banned ones as their control. */
const ALLOWED_NAME = 'domains.get';

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------

/** What one handler answered, once its text block is parsed. */
interface ToolAnswer {
  /** The envelope discriminator. */
  readonly success: boolean;

  /** The resource or the page. */
  readonly data: unknown;

  /** The window, on a paginated answer. */
  readonly meta?: unknown;
}

/** A connected client, and the pair of closes that ends it. */
interface LinkedPair {
  /** The client end of the transport. */
  readonly client: Client;

  /** Closes both ends. */
  close(): Promise<void>;
}

/**
 * Stands a server carrying the whole registry up, and connects a
 * client to it over an in-memory transport.
 *
 * @param context - The store and the clock every handler is given.
 * @param plant - A name to register AFTER the loop, for the case that
 *   has to see one reported. Absent for every other call.
 * @returns The connected client and its close.
 *
 * @remarks
 * THE LOOP IS THE ONE `src/mcp/server.ts` RUNS, copied rather than
 * imported for the reason the header gives: that module boots a
 * server at import. The three lines that matter are the same — the
 * description and the whole `inputSchema` handed over as the entry
 * declares them, and the readonly content array copied into the
 * mutable one the SDK result type wants.
 */
async function startLinked(
  context: McpToolContext,
  plant?: string,
): Promise<LinkedPair> {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  for (const entry of MCP_TOOLS) {
    server.registerTool(
      entry.name,
      {
        description: entry.description,
        inputSchema: entry.inputSchema,
      },
      async (input: unknown) => {
        const result = await entry.handler(context, input);

        return { content: [...result.content] };
      },
    );
  }

  if (plant !== undefined) {
    server.registerTool(
      plant,
      { description: 'Registered outside the loop, on purpose.' },
      () => ({ content: [{ type: 'text' as const, text: plant }] }),
    );
  }

  const client = new Client({
    name: 'zz-transport-client',
    version: SERVER_VERSION,
  });
  const [clientEnd, serverEnd] = InMemoryTransport.createLinkedPair();

  await Promise.all([
    server.connect(serverEnd),
    client.connect(clientEnd),
  ]);

  return {
    client,
    async close() {
      await client.close();
      await server.close();
    },
  };
}

/**
 * The names a connected client is offered.
 *
 * @param client - A connected client.
 * @returns One name per offered tool, in the order the server lists
 *   them.
 */
async function offeredNames(client: Client): Promise<readonly string[]> {
  const listed = await client.listTools();

  return listed.tools.map((tool) => tool.name);
}

/**
 * Calls one tool, and hands back the current result shape.
 *
 * @param client - A connected client.
 * @param name - The tool to call.
 * @param args - Its arguments.
 * @returns What the server answered.
 *
 * @remarks
 * ONE CAST, AT ONE BOUNDARY, and the reason is worth recording.
 * `Client.callTool` is declared over a UNION of the current result
 * and the legacy `toolResult` one, and that second member carries
 * nothing but an index signature — so `result.content` resolves to
 * `unknown` ON THE UNION and no member of a result can be read at
 * all without narrowing first. Every tool here is registered through
 * `registerTool`, which answers the current shape, so the narrowing
 * belongs here rather than at each of the reads below.
 */
async function callTool(
  client: Client,
  name: string,
  args: Record<string, unknown>,
): Promise<CallToolResult> {
  const result = await client.callTool({ name, arguments: args });

  return result as CallToolResult;
}

/**
 * The single text block a tool on this surface answers with.
 *
 * @param result - What {@link callTool} came back with.
 * @returns The block's text.
 * @throws When the result is not exactly one text block, which is a
 *   shape this surface never produces: it fails naming that rather
 *   than reading `undefined.text`.
 */
function blockTextOf(result: CallToolResult): string {
  const [block] = result.content;

  if (
    result.content.length !== 1
    || block === undefined
    || block.type !== 'text'
  ) {
    throw new Error(
      'the result is not the single text block this surface answers with',
    );
  }

  return block.text;
}

/**
 * The envelope a tool answered, parsed off its text block.
 *
 * @param result - What {@link callTool} came back with.
 * @returns The parsed envelope.
 */
function envelopeOf(result: CallToolResult): ToolAnswer {
  return JSON.parse(blockTextOf(result)) as ToolAnswer;
}

/**
 * What a row looks like once it has crossed the transport.
 *
 * @param value - A stored row, or a list of them.
 * @returns The same value serialised and read back, which is what
 *   `textResult` and `JSON.parse` do to it between the store and the
 *   case — a `Date` becomes its ISO string, and nothing else moves.
 */
function overTheWire(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

// ---------------------------------------------------------------------------
// The fixture
// ---------------------------------------------------------------------------

/** The planted store and the context every handler is given over it. */
interface PlantedSurface {
  /** The store, for the reads a case holds an answer against. */
  readonly store: MemoryResearchStore;

  /** What a handler is given besides its input. */
  readonly context: McpToolContext;
}

/**
 * Plants one domain, one finding, one sighting and one ruling.
 *
 * SMALL ON PURPOSE. The subject here is the crossing rather than any
 * group's rules, so the fixture carries exactly what the two driven
 * tools read: a finding whose embedded lists are non-empty, and a
 * domain whose declared vocabulary the ruling is a member of. The
 * finding names no entity, so its research is empty by construction
 * — `src/mcp/tools/wave-3.test.ts` is where that half is read.
 *
 * THE STORE READS THE SAME INSTANT THE CONTEXT DOES, which is what
 * makes the appended ruling's stamp assertable: the column defaults
 * to `now()`, and `now()` here is this clock.
 *
 * @returns The store and the context over it.
 */
async function plantSurface(): Promise<PlantedSurface> {
  const store = createMemoryResearchStore({ now: () => FIXED_NOW });
  const context: McpToolContext = { store, clock: () => FIXED_NOW };
  const radar = await store.insertDomain({
    slug: RADAR,
    name: 'Radar',
    settings: { verdictVocabulary: [...LADDER] },
  });
  const feed = await store.insertSource({
    domainId: radar.id,
    kind: 'rss',
    endpoint: 'https://feed.example/rss',
    parserConfig: {},
    contract: {},
    enabled: true,
  });
  const sightings: readonly MemoryFindingSighting[] = [{
    id: SIGHTING,
    sourceId: feed.id,
    externalId: 'radar-11',
    seenAt: new Date(Date.UTC(2026, 2, 1, 3)),
  }];

  store.setDomainFindings(radar.id, [{
    id: FINDING,
    documentId: DOCUMENT,
    entityId: null,
    fields: { category: 'people' },
    score: 0.9,
    scoreVersion: 1,
    createdAt: new Date(Date.UTC(2026, 2, 1)),
  }]);
  store.setFindingSightings(FINDING, sightings);

  await store.insertFindingLabel({
    findingId: FINDING,
    verdict: PLANTED_VERDICT,
    note: null,
  });

  return { store, context };
}

// ---------------------------------------------------------------------------
// What the server offers
// ---------------------------------------------------------------------------

describe('MCP transport - what the server offers', () => {
  // Both directions in one case, and the plant is what makes the
  // second one a reading. An entry the loop never reached is missing
  // from the offered side; a tool registered OUTSIDE the loop is the
  // extra member on it, which no assertion over the real server could
  // show. The second linked pair below carries exactly that fault and
  // the same comparison names it.
  it('offers every registered tool and no other name', async () => {
    const planted = await plantSurface();
    const linked = await startLinked(planted.context);
    const seeded = await startLinked(planted.context, PLANTED_TOOL);

    try {
      const registered = MCP_TOOLS.map((entry) => entry.name);
      const offered = await offeredNames(linked.client);
      const withPlant = await offeredNames(seeded.client);

      expect([...offered].sort()).toEqual([...registered].sort());

      // A name carried twice would collapse into the set above, so
      // the length is held against the registry's own separately.
      expect(offered).toHaveLength(MCP_TOOLS.length);

      // The plant, through the same comparison. Reported as the one
      // extra member rather than as an inequality, so the failure
      // would name the tool instead of printing two long lists.
      const extra = withPlant.filter((name) => !registered.includes(name));

      expect(extra).toEqual([PLANTED_TOOL]);
      expect([...withPlant].sort()).not.toEqual([...registered].sort());
    } finally {
      await linked.close();
      await seeded.close();
    }
  });

  // What a name alone cannot say. A client picks a tool by reading
  // this sentence, so an entry offered with a blank or a wrong one is
  // listed and unusable; `src/mcp/tools/registry.test.ts` holds that
  // no description is empty, and this holds that the one a client is
  // shown is the one the entry declares.
  it('carries the description every entry declares', async () => {
    const planted = await plantSurface();
    const linked = await startLinked(planted.context);

    try {
      const listed = await linked.client.listTools();
      const shown = listed.tools.map(
        (tool) => [tool.name, tool.description] as const,
      );
      const declared = MCP_TOOLS.map(
        (entry) => [entry.name, entry.description] as const,
      );

      expect(Object.fromEntries(shown))
        .toEqual(Object.fromEntries(declared));
    } finally {
      await linked.close();
    }
  });
});

// ---------------------------------------------------------------------------
// A read across the crossing
// ---------------------------------------------------------------------------

describe('MCP transport - a read across the crossing', () => {
  // Held against the STORE'S OWN READ and not against a transcribed
  // body: the id, the domain and the stamps are what no argument
  // carried, so an answer rebuilt out of the input would pass a
  // member-by-member comparison and fails this one. Compared after a
  // serialise-and-read-back of the stored rows, which is what the
  // crossing does to them — a live `Date` would never equal the ISO
  // string on the wire, over a perfectly correct tool.
  it('findings.get answers the envelope its route sends', async () => {
    const planted = await plantSurface();
    const linked = await startLinked(planted.context);

    try {
      const result = await callTool(linked.client, 'findings.get', {
        id: FINDING,
      });

      expect(result.isError).toBeUndefined();

      const answer = envelopeOf(result);
      const data = answer.data as Record<string, unknown>;
      const stored = await planted.store.findFindingById(FINDING);

      expect(answer.success).toBe(true);
      expect(data.finding).toEqual(overTheWire(stored));

      // The embedded halves, each read off the port beside it. Both
      // are non-empty, which is the control the assertion needs: an
      // empty list is also what a tool that had stopped reading
      // would answer, and two `toEqual([])` would pass over it.
      const sightings = await planted.store.listFindingSightings(FINDING);
      const labels = await planted.store.listFindingLabels(FINDING);

      expect(sightings).toHaveLength(1);
      expect(labels).toHaveLength(1);
      expect(data.sightings).toEqual(overTheWire(sightings));
      expect(data.labels).toEqual(overTheWire(labels));

      // Empty BY CONSTRUCTION, the planted finding naming no entity.
      // Asserted so the shape of the answer is read whole rather
      // than in the three members this case happens to plant.
      expect(data.research).toEqual([]);
    } finally {
      await linked.close();
    }
  });
});

// ---------------------------------------------------------------------------
// A mutation across the crossing
// ---------------------------------------------------------------------------

describe('MCP transport - a mutation across the crossing', () => {
  // The write is read back off the store rather than inferred from
  // what came back, which is the only thing that separates a tool
  // that ruled from one that answered a row it composed. The ruling
  // is APPENDED, so the planted label is still beneath it: a store
  // that had written over the first would answer one row here.
  it('findings.verdict appends a ruling and answers it', async () => {
    const planted = await plantSurface();
    const linked = await startLinked(planted.context);

    try {
      const before = await planted.store.listFindingLabels(FINDING);
      const result = await callTool(linked.client, 'findings.verdict', {
        id: FINDING,
        note: 'read again',
        verdict: VERDICT,
      });

      expect(result.isError).toBeUndefined();

      const answer = envelopeOf(result);
      const after = await planted.store.listFindingLabels(FINDING);

      expect(before).toHaveLength(1);
      expect(after).toHaveLength(2);
      expect(answer.success).toBe(true);

      // Newest first, so the appended row is the head and the
      // planted one is still readable under it.
      expect(answer.data).toEqual(overTheWire(after[0]));
      expect(after[1]).toEqual(before[0]);

      // The stamp is the fixture's own clock rather than the wall,
      // which is what makes it assertable at all.
      const head = after[0];

      expect(head?.verdict).toBe(VERDICT);
      expect(head?.labelledAt).toEqual(FIXED_NOW);
    } finally {
      await linked.close();
    }
  });
});

// ---------------------------------------------------------------------------
// A name this surface does not carry
// ---------------------------------------------------------------------------

describe('MCP transport - a name this surface does not carry', () => {
  // READ OFF THE RESULT AND NEVER OFF A CATCH. The SDK does not throw
  // out of `callTool`: an unregistered name comes back as an ordinary
  // result carrying `isError` and one text block, so a case written
  // around a try/catch would pass over a server that answered
  // nothing at all. The registered name called in the same sequence
  // is the positive control — a fabricated name is absent for the
  // trivial reason, and without a call that succeeds the four
  // refusals below are satisfied by a server refusing everything.
  it('refuses a banned name as a result, never a raise', async () => {
    const planted = await plantSurface();
    const linked = await startLinked(planted.context);

    try {
      const offered = await offeredNames(linked.client);
      const allowed = await callTool(linked.client, ALLOWED_NAME, {
        slug: RADAR,
      });

      expect(offered).toContain(ALLOWED_NAME);
      expect(allowed.isError).toBeUndefined();
      expect(envelopeOf(allowed).success).toBe(true);

      for (const banned of BANNED_NAMES) {
        const refused = await callTool(linked.client, banned.name, {});

        expect(offered).not.toContain(banned.name);
        expect(refused.isError).toBe(true);
        expect(blockTextOf(refused))
          .toBe(`MCP error -32602: Tool ${banned.name} not found`);
      }
    } finally {
      await linked.close();
    }
  });
});
