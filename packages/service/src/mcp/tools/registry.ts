/**
 * @packageDocumentation
 * The MCP tool registry: what a tool IS on this surface, and the
 * written-out list of the ones this service exposes.
 *
 * BOTH HALVES BELONG HERE, the way `src/exports/index.ts` keeps its
 * own pair and `src/sources/index.ts` keeps its adapters. The
 * contract says what an entry has to carry; {@link MCP_TOOLS} is
 * the list a client will actually be shown. A tool arrives by an
 * edit to that literal and never by a directory listing — the rule
 * `SOURCE_ADAPTERS` states for its own registry, kept here for the
 * same reason and with more at stake: a file dropped into this
 * directory must not become a capability the server offers.
 *
 * IT IMPORTS NOTHING THAT STARTS ANYTHING. `src/mcp/server.ts`
 * calls `createMCP` at module scope, so importing THAT module boots
 * a server and binds a port, which is why no test can read the tool
 * list through it. This module is the half a test can read: type
 * imports, one zod type, and the wave lists {@link MCP_TOOLS} is
 * composed of — no transport, no store construction, no
 * `createMCP`. Those wave modules keep the same rule from their own
 * side, which is what makes the composition safe to import.
 * `./registry.test.ts` and the exposure invariant both rest on
 * that, and a value import added here that reaches a server takes
 * away both readings at once.
 *
 * A ROUTE IS A LABEL, and it is the same label
 * `tests/api/wiring.test.ts` builds off a router's own `stack`: the
 * verb uppercased, one space, then the express path TEMPLATE with
 * its parameters intact — `GET /domains/:slug/findings`, never a
 * substituted address. {@link McpToolEntry.route} is what ties a
 * tool to the HTTP route it shares a schema and a service with, so
 * two protocols cannot drift into answering differently about one
 * act. {@link isMcpRouteLabel} checks the SHAPE and nothing else;
 * whether a label names a route some router really registered is
 * the exposure invariant's reading, taken against those routers.
 *
 * THE STORE ARRIVES AT CALL TIME, in {@link McpToolContext}, and
 * that is what keeps the list static. A handler closing over a
 * store would need one built at module scope, which is exactly the
 * side effect the paragraph above forbids — so the server builds
 * one context and hands it to whichever entry was called. A wave
 * module may declare a handler over a NARROWER store than the whole
 * surface: a narrower parameter is assignable here, and the
 * intersection is the widest thing any entry could ask for.
 *
 * THE LIST IS FILLED A WAVE AT A TIME, and every wave has now
 * landed: three modules holding twenty-seven entries between them,
 * twenty of them reads and seven the mutations the API spec names
 * among its safe ones. `src/mcp/server.ts` registers every one of
 * them in one loop, so this literal is the whole of what a client
 * is offered. A route this service serves that no entry names is
 * now an absence somebody decided rather than one nobody has
 * reached yet: `tests/invariants/mcp-exposure.test.ts` holds the
 * exposed set against the banned one and against what the routers
 * declare, in both directions, so every declared label is exposed,
 * banned, or written out there with the reason it is off the
 * surface.
 */

import type { ConnectorStore } from '../../connectors/store.js';
import type { DocumentStore } from '../../documents/store.js';
import type { DomainStore } from '../../domains/store.js';
import type { EntityStore } from '../../entities/store.js';
import type { FindingStore } from '../../findings/store.js';
import type { PersonaStore } from '../../personas/store.js';
import type { RunStore } from '../../runs/store.js';
import type { SettingsStore } from '../../settings/store.js';
import type { SourceStore } from '../../sources/store.js';
import type { SubscriptionStore } from '../../subscriptions/store.js';
import type { TaxonomyStore } from '../../taxonomy/store.js';
import type { TopicStore } from '../../topics/store.js';
import type { ZodType } from 'zod';

import { WAVE_1_TOOLS } from './wave-1.js';
import { WAVE_2_TOOLS } from './wave-2.js';
import { WAVE_3_TOOLS } from './wave-3.js';

/**
 * The verbs a route label may name, spelled as a router's `stack`
 * spells them once uppercased.
 *
 * Five members, which is every verb the HTTP surface declares. A
 * roster rather than a bare regex alternation, because
 * {@link ROUTE_LABEL_PATTERN} is built FROM it: a verb added here
 * joins the shape check with nothing else edited, where two
 * spellings of one list is the second authority this registry
 * exists to avoid.
 */
export const MCP_ROUTE_METHODS = [
  'DELETE',
  'GET',
  'PATCH',
  'POST',
  'PUT',
] as const;

/** One member of {@link MCP_ROUTE_METHODS}. */
export type McpRouteMethod = (typeof MCP_ROUTE_METHODS)[number];

/**
 * The shape {@link isMcpRouteLabel} reads a label against.
 *
 * A path is one or more segments, each a lowercase word or a
 * `:parameter`, with hyphens legal inside one — `run-now`,
 * `approve-config` and `pending-configs` are all registered
 * segments. Digits are not legal, because no route on this surface
 * carries one; a route that grows one widens this pattern rather
 * than slipping past it unnoticed.
 *
 * No `g` flag. A shared global pattern advances its own `lastIndex`
 * between `.test()` calls, so the same value answers differently on
 * the second ask.
 */
const ROUTE_LABEL_PATTERN = new RegExp(
  `^(?:${MCP_ROUTE_METHODS.join('|')}) (?:/:?[a-z][a-z-]*)+$`,
);

/**
 * Whether a string is a route label in the shape the routers
 * register.
 *
 * @param value - The candidate label.
 * @returns True when it names one of {@link MCP_ROUTE_METHODS},
 *   then one space, then a path of lowercase or `:parameter`
 *   segments.
 *
 * @remarks
 * SHAPE ONLY. A label can satisfy this and still name a route no
 * router declares, which is the reading
 * `tests/invariants/mcp-exposure.test.ts` takes by walking the
 * routers themselves. What this covers is the fault that reading
 * cannot report cheaply: a label written in the wrong form at all,
 * which would compare unequal against every registered one and say
 * nothing about why.
 */
export function isMcpRouteLabel(value: string): boolean {
  return ROUTE_LABEL_PATTERN.test(value);
}

/**
 * Every port a tool on this surface can reach, as one object.
 *
 * THE SAME COMPOSITION `src/index.ts` BUILDS BY HAND for its
 * routers, and the same one `MemoryResearchStore` in
 * `tests/helpers/memory-research-store.ts` satisfies from the other
 * side — so a tool is driven in a case over the object every route
 * suite already uses, with nothing constructed for the protocol.
 *
 * AN INTERSECTION RATHER THAN A `Pick`, which is the opposite of
 * what every service module here declares, and deliberately. A
 * service names the handful of methods IT reaches, so its type is a
 * claim about that module. This type is the parameter of a
 * heterogeneous list: whatever the widest entry needs, every entry
 * is handed. A handler is still free to declare a `Pick` of its own
 * and stays assignable, a narrower parameter being the safe
 * direction — so the read-first claims the wave-3 ports make are
 * not given up by passing through here.
 */
export type McpToolStore =
  ConnectorStore
  & DocumentStore
  & DomainStore
  & EntityStore
  & FindingStore
  & PersonaStore
  & RunStore
  & SettingsStore
  & SourceStore
  & SubscriptionStore
  & TaxonomyStore
  & TopicStore;

/**
 * What a handler is given besides its input.
 *
 * Two members, and both are dependencies the HTTP routers already
 * take: `src/index.ts` hands `store` to every router it mounts,
 * and one `clock` const to the two schedule routers that need a
 * present — `buildTopicsRouter` and `buildSubscriptionsRouter`,
 * with `buildSpendRouter` a third once the wiring task mounts it.
 * A tool over `run-now` or over the spend window needs the same
 * thing for the same reason, so the context carries it rather
 * than letting a handler reach `Date.now()` and make a window
 * nothing in a case can pin.
 *
 * BOTH ARE READ NOW. `./wave-1.ts` and the five reads of
 * `./wave-2.ts` take `store`, and the two `run-now` entries beside
 * them take `clock` — which is what the second member was declared
 * ahead of, since a context widened later would be a contract edit
 * every wave module has to be re-read against.
 */
export interface McpToolContext {
  /** Every port, as one object; see {@link McpToolStore}. */
  readonly store: McpToolStore;

  /**
   * The present, read by a handler that needs one.
   *
   * A thunk rather than a `Date`, on `runTopicNow`'s terms in
   * `src/topics/service.ts`: a fixed instant handed in at
   * construction would be the moment the process started rather
   * than the moment a tool was called.
   */
  readonly clock: () => Date;
}

/** One block of text in what a tool answers. */
export interface McpTextBlock {
  /** The only content kind this surface produces. */
  readonly type: 'text';

  /** The block itself. */
  readonly text: string;
}

/**
 * What a handler answers.
 *
 * Structurally the shape the MCP SDK's own tool callback returns,
 * declared here rather than imported so this module keeps its rule
 * about what it may import. The server adapts it when it registers
 * an entry, which is a place it is already wrapping the call to
 * supply the context.
 */
export interface McpToolResult {
  /** The blocks a client renders, in order. */
  readonly content: readonly McpTextBlock[];
}

/**
 * One tool, and the whole of what registering it costs.
 *
 * Five members. Three describe the tool to a client, one ties it to
 * the HTTP route it shares its rules with, and one does the work.
 */
export interface McpToolEntry {
  /**
   * What a client calls it by, unique across {@link MCP_TOOLS}.
   *
   * The uniqueness is not a property of the type — two entries may
   * carry one name and compile — so `./registry.test.ts` holds it,
   * and it is the first of the three claims that file makes.
   */
  readonly name: string;

  /**
   * What the tool does, in a sentence a model reads.
   *
   * Non-empty, held by `./registry.test.ts`. An entry whose
   * description is blank is listed and unusable: the client sees a
   * name and nothing that says when to reach for it.
   */
  readonly description: string;

  /**
   * The arguments, as the schema its HTTP route already declares.
   *
   * IMPORTED FROM THE ROUTE MODULE, NEVER RESTATED. A copy that
   * agrees today is a second authority nothing compares, so the
   * exposure invariant asserts this member is `Object.is`-identical
   * to the exported schema {@link McpToolEntry.route} names. A
   * structural comparison would pass over a restated copy, which is
   * exactly the state that rule exists to catch.
   *
   * `ZodType` rather than a raw shape: the SDK's `registerTool`
   * takes either, and a whole schema is what a route module
   * exports.
   */
  readonly inputSchema: ZodType;

  /**
   * The HTTP route this tool is the other protocol's face of.
   *
   * A label in {@link isMcpRouteLabel}'s shape; see the header.
   */
  readonly route: string;

  /**
   * Runs the tool.
   *
   * @param context - The store and the clock; see
   *   {@link McpToolContext}.
   * @param input - The arguments, as the caller sent them.
   *   `unknown` because this list is heterogeneous and no one type
   *   describes every entry's arguments — a handler narrows them
   *   through the schema it declares, which is also the parse a
   *   route already makes of the same request.
   * @returns What the client is shown.
   */
  handler(
    context: McpToolContext,
    input: unknown,
  ): Promise<McpToolResult>;
}

/**
 * Every tool this service exposes.
 *
 * COMPOSED FROM THE WAVE MODULES, one spread each, so a tool is
 * declared beside the routes it mirrors and this literal stays a
 * list of lists. All three are landed, and every entry in them is
 * a read or one of the seven safe mutations: the two term edits,
 * the two `run-now` verbs, the operator ruling on a finding and
 * the two approval gates. Each wave module says beside its own
 * list what it deliberately leaves off.
 *
 * REGISTERED STATICALLY, never by reading the directory, on the
 * rule `EXPORT_RENDERERS` and `SOURCE_ADAPTERS` both state for
 * their own literals. The hazard is sharper here than in either:
 * a renderer is pure and an adapter is asked for by a stored row,
 * where an entry in this list is a capability a client can call
 * without anything in the database naming it first.
 *
 * WHAT REGISTERING ONE COSTS is a line in this literal, an import
 * above it, and the cases in the wave module that declares it.
 * Nothing else has to be remembered: `./registry.test.ts` reads
 * this binding, and so does
 * `tests/invariants/mcp-exposure.test.ts`, which holds it against
 * the routers' own declarations in both directions.
 */
export const MCP_TOOLS: readonly McpToolEntry[] = [
  ...WAVE_1_TOOLS,
  ...WAVE_2_TOOLS,
  ...WAVE_3_TOOLS,
];
