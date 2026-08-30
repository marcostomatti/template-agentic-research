/**
 * @packageDocumentation
 * Source adapters — the contract every module in this directory
 * satisfies, and the registry that selects one of them.
 *
 * Both halves belong here. The contract says what an adapter IS;
 * the registry is the list of the ones this service will actually
 * run, and a lookup by id is how a `sources` row reaches one.
 * Keeping {@link SourceAdapter.parse} pure and separate from
 * {@link SourceAdapter.fetch} is the load-bearing part of the
 * contract: it is what lets every adapter be tested against a
 * stored payload with no network in the default suite. An adapter
 * that fetches inside `parse` passes its tests the day it is
 * written and fails them the first time it runs offline.
 *
 * {@link SOURCE_ADAPTERS} holds the adapters this service ships. Each
 * of them added its own line to that literal in the commit that
 * landed it, which is the whole of what registration costs. The other
 * two modules beside this file are not adapters and are not in it:
 * `html-text.ts` and `paged-list.ts` are what an adapter reaches for,
 * and each says at the top of its own source that it fronts no source
 * and appears in no registry.
 *
 * Node-only, deliberately, and this is the file that could not be
 * anything else: a registry names its adapters with value imports,
 * which is exactly what the dual-context rule under `src/lib/`
 * forbids. Nothing in this directory is spliced into a workflow
 * either, and that is a rule rather than a preference.
 * `assertMarkerPath` in `scripts/workflow-markers.ts` refuses a
 * marker path holding a `..` segment, so
 * `__INLINE:../sources/listing-api.ts__` is turned away by name:
 * the grammar takes that path and the path rule reports it as
 * `a .. segment`. No module outside `src/lib/` is spliceable under
 * any spelling, which is why `tests/build/lib-splice.test.ts`
 * reads that directory rather than this one.
 *
 * So an adapter's extraction logic reaches a Code node only by
 * living in a dual-context library the adapter also calls. Both
 * adapters here reach `parser-config.ts` and `markup-select.ts`
 * under `src/lib/` to extract; a workflow wanting that same
 * extraction inlines those two libraries by name, never the
 * adapter around them. One implementation read from two sides,
 * with the Node-only half of an adapter — its transport, its
 * digest, its registry line — staying here.
 */
import { SOURCE_KINDS } from '../db/schema/values.js';

import { LISTING_API_DECLARATION } from './listing-api.js';
import { PUSH_CAPTURE_DECLARATION } from './push-capture.js';

/**
 * The kinds of source an adapter can front.
 *
 * Derived from the `SOURCE_KINDS` tuple in `src/db/schema/values.ts`,
 * which is the same tuple the schema-v2 `sources.kind` CHECK is generated
 * from. The set an adapter is selected by and the set the column accepts
 * are therefore one declaration read twice, rather than two that have to
 * be kept in step: widening the set is an edit to that tuple plus the
 * migration carrying the widened CHECK, and this line is no longer a
 * third place that has to be remembered alongside them.
 *
 * The union is declared here rather than beside its tuple because this is
 * where it is consumed — {@link SourceAdapter.kind} is the property it
 * types. Every other set in that module pairs its union with the tuple;
 * this one is the deliberate exception, and the tuple's own TSDoc records
 * the exception, so neither file reads as though the other forgot.
 *
 * The import is a VALUE import rather than a type-only one because
 * {@link sourceAdapterContractErrors} reads the tuple itself: what the
 * check refuses at registration and what the column refuses at insert are
 * then the same list, and a kind added to that tuple needs no edit here to
 * become registrable.
 */
export type SourceKind = (typeof SOURCE_KINDS)[number];

/**
 * The shape an adapter produces and the only shape the core consumes: one
 * `documents` row's worth of captured material, and nothing beyond it.
 *
 * Every member maps onto a column of `documents` in
 * `src/db/schema/documents.ts`, and is named for that column's drizzle
 * property rather than for its SQL name — `sourceId` for `source_id`,
 * the other four identical either way. That is what makes a canonical
 * document a SLICE of the table's insert shape rather than something to
 * translate into one: spread it, add the `domainId` the writer supplies,
 * and the result is a complete row, with no field renaming in between
 * for a mismatch to hide in.
 *
 * The five members are the columns a CAPTURE supplies, and the nine they
 * leave out are each somebody else's. `id` is the database's and
 * `captured_at` the insert's — capture IS the insert, so no window exists
 * in which the two disagree. `domain_id` is the writer's, taken from the
 * `sources` row the adapter was constructed for, which records how the
 * adapter was reached rather than anything it read. `parse_status` and
 * `parse_error` belong to the contract check rather than to the capture:
 * the row that most needs them is one whose payload yielded no record at
 * all, so {@link SourceAdapter.toCanonical} never ran to return a shape
 * they could have sat in. And `features`, `feature_version`, `embedding`
 * and `embedding_model` are computed from the stored row long after
 * the capture that wrote it, and nothing writes any of them yet:
 * phase 4 landed the feature port but no writer.
 *
 * Each member below names its column and states only what the CONTRACT
 * adds. Why the database holds a column the way it does is argued once,
 * in that column's own comment; a second copy here would be a second
 * copy to drift.
 */
export interface CanonicalDocument {
  /**
   * The content hash of the document as captured: `documents.hash`, the
   * key the corpus's one row per distinct item stands on. Required here
   * because it is NOT NULL there — what that constraint buys, and what a
   * nullable member would cost in silence, is argued at the column.
   */
  readonly hash: string;
  /**
   * The `sources` row this document came through, or null when it came
   * through none: an ingested file, a body an operator pasted in. Maps
   * onto `documents.source_id`, the one member whose SQL name differs
   * from the property it is written as.
   *
   * Required-but-nullable rather than optional, because the NULL means
   * something at the column — deleting a source that still has rows is
   * refused rather than nulling it, so a NULL there is only ever "never
   * came through one" — and an omitted key would leave the writer to
   * decide which of the two it had been handed.
   */
  readonly sourceId: number | null;
  /**
   * Where the document can be read at its source, or null when there is
   * no such place: `documents.url`, which is nullable for exactly this
   * absence and never an empty string. `''` is a value, and a reader
   * handed one renders a link to nowhere.
   */
  readonly url: string | null;
  /**
   * The document's text as captured, and what every later stage reads:
   * `documents.body`, NOT NULL there and required here. Not the same as
   * non-empty — an empty body is a capture that yielded no text and is
   * kept anyway, the fail-flag-keep rule `documents.parse_status`
   * records — so the member is required while the string may be empty.
   */
  readonly body: string;
  /**
   * The source's own payload, verbatim: what {@link SourceAdapter.fetch}
   * returned, before anything was extracted from it. Maps onto
   * `documents.raw`, which is nullable for the same absence this member
   * carries — null when no payload was stored at all, the state a pasted
   * body or an ingested file is in, rather than `{}` claiming the source
   * answered and answered with nothing.
   *
   * `unknown` rather than a payload interface, matching the column's
   * lack of a `$type` annotation: the shape belongs to the source rather
   * than to this contract, and one type across every {@link SourceKind}
   * would describe none of them accurately.
   */
  readonly raw: unknown;
}

/**
 * One source adapter: get the bytes, produce canonical documents. An adapter
 * does not score, does not decide, and does not store.
 *
 * Nothing in this interface takes configuration per call, which is a
 * decision rather than an omission. A source row's `parser_config`
 * (selectors/JSONPath/regex/field-map — data the engine executes, never
 * code) binds once when the adapter is constructed, alongside that row's
 * endpoint. Two later-phase properties depend on it: one adapter
 * type serves every row of its {@link SourceKind} with only its construction
 * differing, and {@link SourceAdapter.parse} stays a function of the payload
 * alone — threading the config through each call would make its output
 * depend on two inputs and cost the stored-payload test seam.
 *
 * @typeParam Raw - The source's own payload, as `fetch` returns it.
 * @typeParam Parsed - One extracted record, before canonicalization.
 */
export interface SourceAdapter<Raw = unknown, Parsed = unknown> {
  /** Stable identifier, unique across the registry. */
  readonly id: string;
  /**
   * Which transport family this adapter fronts. Matches the `kind` of every
   * `sources` row this adapter can be constructed for.
   */
  readonly kind: SourceKind;
  /**
   * Retrieves the source's own payload. The only step that does I/O, and the
   * only step that touches the endpoint bound at construction.
   */
  fetch(): Promise<Raw>;
  /**
   * Extracts records from a payload, under the `parser_config` bound at
   * construction. Pure — no I/O, no clock, no network.
   */
  parse(raw: Raw): Parsed[];
  /**
   * Maps one extracted record onto the canonical shape. Pure, and the only
   * step that has to know what a `documents` row holds — every member of
   * {@link CanonicalDocument} is produced here or nowhere.
   */
  toCanonical(parsed: Parsed): CanonicalDocument;
}

/**
 * The registry's shape: adapters by the id they are selected by.
 *
 * {@link SourceAdapter} with its type parameters left at their
 * defaults, which types the registry at the CONTRACT rather than at
 * any one adapter's payload. That is the honest type for something
 * reached by id — the id came out of a `sources` row, so nothing at
 * the call site knows which adapter answered or what its `fetch`
 * returns. An adapter declaring concrete parameters still satisfies
 * it: the members are methods, and method parameters are bivariant.
 */
export type SourceAdapterRegistry = Readonly<Record<string, SourceAdapter>>;

/**
 * Every adapter this service can run, keyed by the id it is selected
 * by. A `sources` row names one of these keys and nothing else does.
 *
 * REGISTERED STATICALLY, never by reading the directory, and that is
 * the fetch policy rather than a matter of taste. A registry built
 * from a directory listing turns "a file was added" into "the runner
 * will now run it": the file lands, the list grows, and something
 * reaches the network under a decision nobody made. Everything this
 * platform is allowed to fetch rests on nothing running unless it
 * was named, so the naming is an edit to this literal — made in the
 * commit that adds the adapter, and read by whoever reviews it.
 *
 * The cost is a list that can drift from what the directory holds,
 * and it is paid in a test rather than in code. The set-equality
 * guard in `src/sources/index.test.ts` holds these keys against the
 * modules sitting beside this file, so an adapter nobody registered
 * fails naming itself. A guard is the right place for it precisely
 * because the alternative — this module reading the directory to
 * check — is the thing being refused.
 *
 * What stands registered is `listing-api` and `push-capture`, and
 * they front different kinds: `api` for the cursor-paged listing
 * loop run against the endpoint a row names, `push` for an envelope
 * a client sent, which opens no socket at all. No registered adapter
 * declares the `url` or `rss` kind, so a row carrying one names an
 * id nothing here answers — which is a fact about this literal
 * rather than an error, and {@link getSourceAdapter} answering null
 * is how a caller finds out.
 *
 * Registering one is a line here plus a case, and the case is the
 * half worth knowing about. The shipped ids are written out in
 * `src/sources/index.test.ts` rather than read off this literal —
 * a case deriving them from what it checks would agree with any
 * edit to it — so that expectation is what notices a registration
 * at all, and the set-equality guard beside it notices the opposite
 * mistake, a module written and never named. Nothing further has to
 * be remembered: the directory guard accounts for the module and
 * the stored payload the id names, and the contract check walks
 * whatever the registry holds, so both take a new entry without an
 * edit.
 *
 * What every entry holds is a DECLARATION rather than a working
 * adapter. That is the one place this contract and this registry
 * pull against each other, and it is worth naming here:
 * configuration binds at construction, so an adapter is per ROW,
 * while a registry is keyed by id and holds one entry per KIND of
 * source. A registered entry therefore carries the id and the kind
 * a `sources` row is matched against and can reach nothing, and a
 * run builds its own through that module's factory. Each value
 * argues it at length in the module it comes from.
 */
export const SOURCE_ADAPTERS: SourceAdapterRegistry = {
  'listing-api': LISTING_API_DECLARATION,
  'push-capture': PUSH_CAPTURE_DECLARATION,
};

/**
 * The registered ids, sorted.
 *
 * Sorted because the order a literal happens to be written in is not
 * information. This is what a command-line tool prints and what a
 * test compares, and both want an answer that does not move when
 * somebody rewraps the registry.
 *
 * @param registry - Which registry to read. Production passes
 *   nothing and gets {@link SOURCE_ADAPTERS}; the parameter is a
 *   test seam, because a registry holding fewer than two ids cannot
 *   demonstrate that anything was sorted, and a sort nothing
 *   exercises is a sort nobody checked.
 * @returns The ids in sorted order, as a new array.
 */
export function listSourceIds(
  registry: SourceAdapterRegistry = SOURCE_ADAPTERS,
): string[] {
  return Object.keys(registry).sort();
}

/**
 * The adapter registered under an id, or null when none is.
 *
 * Null rather than a throw, so a caller handed an id out of a
 * `sources` row can print what IS registered instead of a stack
 * trace. An unknown id is a datum about a row; it is not a
 * programming error.
 *
 * The lookup goes through `Object.hasOwn` rather than reading the
 * key, and on a plain object that is load-bearing rather than
 * defensive: `toString`, `valueOf` and `constructor` all answer
 * something off the prototype chain, so a stored id spelling one of
 * them would hand a function from `Object.prototype` back as though
 * it were an adapter. The case is live rather than hypothetical:
 * the `in` operator answers true for every one of those names over
 * the registry as it stands, whatever ids it happens to hold.
 *
 * @param id - The id to look up, as a `sources` row spells it.
 * @param registry - Which registry to read; {@link SOURCE_ADAPTERS}
 *   by default, the argument being the same test seam
 *   {@link listSourceIds} takes.
 * @returns The adapter, or null when the id names none.
 */
export function getSourceAdapter(
  id: string,
  registry: SourceAdapterRegistry = SOURCE_ADAPTERS,
): SourceAdapter | null {
  if (!Object.hasOwn(registry, id)) {
    return null;
  }

  return registry[id] ?? null;
}

/** What the check reports for something that is no module at all. */
const NOT_A_MODULE = 'not a module object';

/** What the check reports for an absent or unusable `id`. */
const ID_MUST_BE_A_NON_EMPTY_STRING = 'id must be a non-empty string';

/**
 * The members every adapter has to declare as functions.
 *
 * A tuple rather than three checks written out, so "every member" in
 * {@link sourceAdapterContractErrors} is literally every member: a
 * further function member added to {@link SourceAdapter} joins the
 * check by joining this list, and its sentence reads the same as its
 * neighbours' without anybody writing one.
 */
const FUNCTION_MEMBERS = ['fetch', 'parse', 'toCanonical'] as const;

/**
 * Whether a value is one of the kinds a `sources` row may carry.
 *
 * @param value - The `kind` a module declared, whatever it declared.
 * @returns True when the tuple holds it.
 */
function isSourceKind(value: unknown): value is SourceKind {
  const kinds: readonly string[] = SOURCE_KINDS;

  return typeof value === 'string' && kinds.includes(value);
}

/**
 * One property off a module, without asserting the module has it.
 *
 * `Reflect.get` rather than a cast, because a cast would assert the
 * shape this check exists to doubt: what arrives may be anything at
 * all, and reading it as a declared record would make every member
 * look present to the type checker while the check runs.
 *
 * A read that THROWS — an accessor that refuses, a proxy that traps
 * every get — reports the member as absent rather than propagating.
 * That is what keeps {@link sourceAdapterContractErrors} free of an
 * ending it cannot describe: a check that could be taken down by the
 * module it is checking says nothing about any of the five members,
 * where an unreadable module failing all five says exactly what a
 * reviewer needs to know.
 *
 * @param mod - The module under check.
 * @param name - The member to read.
 * @returns Whatever is there, as `unknown`; undefined when the read
 *   itself refused.
 */
function memberOf(mod: object, name: string): unknown {
  try {
    return Reflect.get(mod, name);
  } catch {
    return undefined;
  }
}

/**
 * A value rendered into a message, for any value at all.
 *
 * `JSON.stringify` is the right renderer for what a `kind` mistake
 * actually carries — a misspelt string, a number, a shape somebody
 * meant to write as a string — and is unusable on its own for the
 * rest of them. It answers the VALUE `undefined` rather than a
 * string for `undefined`, for a symbol and for a function, and it
 * THROWS on a cycle. Both endings are reachable from a hand-written
 * module, so both are handled here rather than at the call site.
 *
 * @param value - Anything, including values that refuse to render.
 * @returns Its JSON rendering, or a bracketed type when it has none.
 */
function describeValue(value: unknown): string {
  try {
    const rendered = JSON.stringify(value);

    return typeof rendered === 'string'
      ? rendered
      : `[${typeof value}]`;
  } catch {
    return `[unrenderable ${typeof value}]`;
  }
}

/**
 * Every member a module fails to satisfy, one sentence each. Empty
 * when it satisfies the contract.
 *
 * A LIST rather than a boolean, and every member rather than the
 * first one that failed: what a registry check is for is saying
 * WHICH adapter is wrong and HOW, and a check that stopped at the
 * first fault turns one review into five.
 *
 * It never throws, which is worth stating because the obvious
 * implementation does — twice. The module most likely to fail this
 * check is also the one most likely to hold a value that refuses to
 * render and a member that refuses to be read, and a check that
 * threw while describing one fault would report nothing at all
 * about the members it had not reached yet. {@link describeValue}
 * closes the first path and {@link memberOf} the second.
 *
 * Five members, all of them required, and that is the one divergence
 * from the design this contract is ported from. There an adapter
 * could omit its listing step, and the check carried a rule about
 * which kinds were allowed to omit it. Listing is not a member here:
 * an adapter fronting several endpoints runs the loop in
 * `src/sources/paged-list.ts` inside its own
 * {@link SourceAdapter.fetch}, so no optional member is left for a
 * conditional rule to be about.
 *
 * @param mod - The module to check, however it arrived.
 * @param expectedId - The registry key it was found under, when it
 *   was found under one. Omitted for a module checked on its own,
 *   where there is no key for its `id` to disagree with.
 * @returns One sentence per member not satisfied, in member order.
 */
export function sourceAdapterContractErrors(
  mod: unknown,
  expectedId?: string,
): string[] {
  if (typeof mod !== 'object' || mod === null) {
    return [NOT_A_MODULE];
  }

  const errors: string[] = [];
  const id = memberOf(mod, 'id');

  if (typeof id !== 'string' || id === '') {
    errors.push(ID_MUST_BE_A_NON_EMPTY_STRING);
  } else if (expectedId !== undefined && id !== expectedId) {
    errors.push(
      `id "${id}" does not match its registry key "${expectedId}"`,
    );
  }

  const kind = memberOf(mod, 'kind');

  if (!isSourceKind(kind)) {
    const allowed = SOURCE_KINDS.join(' | ');

    errors.push(
      `kind must be one of ${allowed}, got ${describeValue(kind)}`,
    );
  }

  for (const member of FUNCTION_MEMBERS) {
    if (typeof memberOf(mod, member) !== 'function') {
      errors.push(`${member} must be a function`);
    }
  }

  return errors;
}
