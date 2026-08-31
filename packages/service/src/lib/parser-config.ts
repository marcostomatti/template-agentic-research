/**
 * @packageDocumentation
 * parser-config — how to read a source, and what a correct reading
 * looks like, as one deterministic engine over two columns of data.
 *
 * `sources.parser_config` says where the records are in a payload
 * and where each member of one comes from. `sources.contract` says
 * what a record has to carry for the reading to count. Both are
 * JSONB this engine EXECUTES rather than evaluates: every operation
 * performed here is one this file implements, and nothing arriving
 * in either column is ever compiled as code, called, or interpreted
 * as anything but data. That is what keeps an INSERT into `sources`
 * an INSERT — a column whose contents could execute would turn the
 * seed script, a workflow node and an operator at a psql prompt
 * alike into a way to run arbitrary code in the pipeline.
 *
 * It is also what makes an extraction replayable. The same payload
 * under the same config yields the same records every time, so an
 * adapter is driven against a stored payload with no network, and a
 * config producing the wrong records is a row to read rather than a
 * program to debug.
 *
 * ## Why both halves live in one module
 *
 * They are one arrangement described from both ends, and three
 * things read them together rather than in turn.
 *
 * A PROPOSAL covers both and an APPROVAL writes both, which
 * `sources.parser_config` states about itself: an extraction rule
 * approved without the test that says it still holds leaves nothing
 * to notice the day the source drifts.
 *
 * FAIL-FLAG-KEEP needs the reading and the judgement in the same
 * pass. A record is extracted, checked against the contract, and
 * stored whatever the check said — the raw payload kept, the
 * document marked failed, the source's counter bumped. Splitting
 * the two across modules would put a call boundary in the middle of
 * one decision.
 *
 * And the splice rule below leaves no third option. A
 * `contract-check.ts` beside this file could not import the
 * coercion vocabulary it judges against, because a spliceable
 * library imports no value from anywhere — so the choice is one
 * module, or the same vocabulary written twice in two files that
 * drift apart. `many small files` has no expression here for the
 * same reason it has none in `static-gate.ts`.
 *
 * ## The markup step is a parameter, not an import
 *
 * A `selector` field reads fragments out of markup, and the matcher
 * that does it is `src/lib/markup-select.ts` — a sibling library,
 * and therefore exactly the thing this file may not import.
 * `assertSpliceable` in `scripts/workflow-markers.ts` refuses a
 * library carrying a value import before the build writes anything,
 * so the import is not a rule to remember but one the build
 * enforces.
 *
 * So the matcher arrives as {@link ParseDeps.selectMarkup}, an
 * ordinary optional function. The workflow Code node that runs this
 * engine carries BOTH markers and wires the two together in its own
 * body; the suite passes the matcher directly; a caller with no
 * markup to read passes nothing and every `selector` field reports
 * that it had no step rather than reading an empty answer. Injection
 * is what makes all three of those the same code path.
 *
 * The pairing with `src/sources/html-text.ts` works the same way and
 * for the same reason: whichever caller has both decides whether a
 * fragment is handed on as markup or as text, because neither
 * library can reach the other.
 *
 * ## A stored path is a key, and a key is a trap
 *
 * Every path in a config is operator-authored or model-proposed
 * text, walked against a payload nobody here controls. Both ends of
 * that walk have a prototype hazard, and both are closed the same
 * way.
 *
 * READING is by OWN KEY only — `Object.hasOwn` and nothing else —
 * so a path segment spelling `__proto__`, `constructor`,
 * `prototype` or `toString` resolves to NOTHING rather than to
 * whatever `Object.prototype` carries. The reflex reading — `key in
 * payload`, or a bare `payload[key]` — answers true and hands back a
 * function for every one of those over an object holding no data at
 * all, and a config naming one would extract a member the payload
 * never had.
 *
 * WRITING is into an object made with `Object.create(null)`, so a
 * field named `__proto__` becomes a real own key rather than a
 * silent no-op through the prototype setter. This module is new
 * rather than ported, so there is no parity gate to preserve a drop
 * against and no reason to keep one: the trap is closed rather than
 * pinned.
 *
 * Two own members the rule ADMITS, both pinned by cases because the
 * rule admitting them is the rule working rather than leaking. An
 * array carries `length` as an own property, so a path naming it
 * answers the count. And a primitive is a LEAF: nothing descends
 * into a string, so no path indexes a character out of one.
 *
 * ## Null and zero
 *
 * {@link coerceValue} answers `null` for every reading it could not
 * take and the value for every reading it did, and the two are never
 * confused. An absent member is `null`. An empty string asked for as
 * a number is `null`, because nothing was measured. A `0` in the
 * payload is `0`, because something was. No field carries a
 * fallback value of any kind, which is a deliberate omission rather
 * than a missing feature: a default is how an unmeasured quantity
 * becomes a confident zero, and this pipeline reads those numbers as
 * measurements downstream.
 *
 * ## What a refusal is allowed to say
 *
 * Every sentence either validator returns names a SITE and a RULE
 * and never a value. The site is an address inside the config — a
 * field name, a member name, the config key that broke — because a
 * fault nobody can locate is not a report. The value is never
 * quoted, because a payload value is untrusted content and these
 * sentences land in `documents.parse_error`, a column read by
 * people and rendered by exports.
 *
 * That applies to the CONFIG validator too, not only the contract
 * check. A config is operator-authored today and model-proposed
 * tomorrow — `src/sources/config-proposer.ts` is the seam — so a
 * proposed config is untrusted text on the same terms a payload is.
 * The addresses those sentences carry are bounded by
 * {@link FIELD_NAME_PATTERN} and {@link MAX_FIELD_NAME_LENGTH},
 * which the validator applies before any sentence quotes a name.
 *
 * ## Dual context
 *
 * Like every module under `src/lib/`, this one is imported by the
 * default suite AND spliced into a workflow Code node body by
 * `scripts/build-workflows.ts`. So it imports nothing, keeps no
 * state between calls, reaches for no global beyond the language
 * itself, and cannot be split. `tests/build/lib-splice.test.ts`
 * registers it and reads what a real build made of it;
 * `tests/lib/parser-config.test.ts` drives it directly.
 */

// ---------------------------------------------------------------------------
// Bounds and vocabularies
// ---------------------------------------------------------------------------

/**
 * What separates one segment of a stored path from the next.
 *
 * A dot and nothing else — no bracket syntax, no quoting, no
 * escape. A path is a list of keys, an index is spelled as the
 * number it is, and a payload key carrying a dot is unreachable.
 * That last one is a real limit and the honest price of a grammar
 * with no escape in it: a grammar an operator can get wrong in only
 * one way is worth more here than one that reaches every key.
 */
export const PATH_SEPARATOR = '.';

/**
 * How deep a stored path may go.
 *
 * A bound rather than a limit anyone will reach. A payload nested
 * past this is a payload the config is the wrong tool for, and the
 * ceiling is what stops a proposed path from walking an adversarial
 * structure for as long as it has segments.
 */
export const MAX_PATH_SEGMENTS = 12;

/**
 * How many fields one config may declare.
 *
 * The same kind of bound, over the other axis. A record with more
 * members than this is a schema rather than an extraction.
 */
export const MAX_FIELDS = 64;

/**
 * How long a stored regular expression may be.
 *
 * Length is not a safety property on its own — a short pattern
 * backtracks catastrophically as easily as a long one — so this is
 * a bound on what an operator can paste into a row rather than a
 * defence. What actually keeps a bad pattern from taking a run down
 * is that {@link compileCapture} answers `null` instead of throwing,
 * and that every capture runs against a value rather than a corpus.
 */
export const MAX_PATTERN_LENGTH = 512;

/** How long a field name may be, in characters. */
export const MAX_FIELD_NAME_LENGTH = 64;

/**
 * What a field name may be spelled with.
 *
 * Bounded on purpose, and the bound is what makes the no-echo rule
 * above true rather than aspirational: a field name is the one piece
 * of config text a refusal sentence quotes, so the class it is drawn
 * from is the class those sentences can carry. Letters, digits,
 * underscore and dash, opening with a letter or an underscore.
 */
export const FIELD_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]*$/u;

/**
 * The names a field may not be called, whatever
 * {@link FIELD_NAME_PATTERN} says about their spelling.
 *
 * All three match that class, so this list is the second half of the
 * check rather than a duplicate of it. A record is built on a null
 * prototype here and would hold any of them safely; what refuses
 * them is every OTHER reader downstream, which builds plain objects
 * and would take `constructor` off the prototype without noticing
 * the record never carried one.
 */
export const RESERVED_FIELD_NAMES = [
  '__proto__',
  'constructor',
  'prototype',
] as const;

/**
 * Every shape a field may be coerced to.
 *
 * `raw` is the escape hatch and is deliberately last: it answers
 * the payload value as it stood, so a field carrying it has a shape
 * decided by the source rather than by the config. Everything else
 * states a shape and answers `null` when the payload does not
 * support it.
 */
export const FIELD_TYPES = [
  'text',
  'number',
  'boolean',
  'list',
  'raw',
] as const;

/**
 * The coercion a field gets when it states none.
 *
 * `text` rather than `raw`, so a config that says nothing about a
 * member still decides that member's shape. A record whose types
 * came from whatever the payload happened to hold is a record no
 * contract can check the same way twice.
 */
export const DEFAULT_FIELD_TYPE = 'text';

/**
 * The capture group a `pattern` field reads when it names none.
 *
 * Group 1 rather than 0, because a pattern written to extract
 * something has parentheses around the something. A pattern with no
 * group at all reads group 0, which {@link captureFrom} falls back
 * to rather than reporting — see its own note.
 */
export const DEFAULT_CAPTURE_GROUP = 1;

// ---------------------------------------------------------------------------
// What a caller declares, and what comes back
// ---------------------------------------------------------------------------

/** One member of {@link FIELD_TYPES}. */
export type FieldType = (typeof FIELD_TYPES)[number];

/**
 * How one member of a record is read out of a payload.
 *
 * Every member is optional and every one has a defined absence, so
 * the smallest usable rule is a `path` on its own. What is NOT here
 * is as load-bearing as what is: no default value, no fallback path,
 * no transform beyond the four steps below. A rule that could not be
 * satisfied answers `null`, and the contract is what decides whether
 * that matters.
 *
 * The four steps run in this order and each one is optional:
 * {@link FieldRule.path} reads a value, {@link FieldRule.selector}
 * turns markup into fragments, {@link FieldRule.pattern} captures out
 * of text, and {@link FieldRule.type} states the shape.
 */
export interface FieldRule {
  /**
   * Where in the record the value is, as dotted segments.
   *
   * Absent means the record ITSELF is the value, which is what a
   * rule reading markup out of a payload that is markup needs.
   */
  readonly path?: string;

  /**
   * A markup selector applied to the value the path reached.
   *
   * Read only when {@link ParseDeps.selectMarkup} was supplied; a
   * rule stating one with no step behind it warns and answers
   * `null`, rather than reading the markup as though it were the
   * value.
   *
   * The step answers fragments, plural. A field asking for a `list`
   * keeps all of them and every other field reads the first, which
   * is the one place {@link FieldRule.type} reaches back into an
   * earlier step.
   */
  readonly selector?: string;

  /**
   * A regular expression applied to the value as text.
   *
   * Compiled per call and never cached — a spliced library keeps no
   * state between calls — and compiled by {@link compileCapture},
   * which answers `null` for a source that will not compile rather
   * than raising into whatever was running.
   */
  readonly pattern?: string;

  /**
   * Which capture group of {@link FieldRule.pattern} to keep.
   *
   * Defaults to {@link DEFAULT_CAPTURE_GROUP}. A group the pattern
   * does not have reads as no capture, which is `null`.
   */
  readonly group?: number;

  /** The shape to coerce to. Defaults to {@link DEFAULT_FIELD_TYPE}. */
  readonly type?: FieldType;
}

/**
 * A `sources.parser_config` row, as the engine reads one.
 *
 * The column carries no `$type` annotation, so this interface is
 * what a config is checked against rather than what it is stored as
 * — which is why {@link parserConfigErrors} takes `unknown` and this
 * shape describes only what a well-formed row looks like.
 */
export interface ParserConfig {
  /**
   * Where the records are in the payload.
   *
   * Absent means the payload itself: a list of records, or one
   * record. Present and resolving to nothing is a payload that did
   * not carry what the config expected, which is a warning and zero
   * records rather than a fault — the source answered, and what it
   * answered is the contract's business.
   */
  readonly recordsPath?: string;

  /**
   * The field map: one rule per member of the record to build,
   * keyed by the member name.
   *
   * Read by own key only, for the reason the header gives. An empty
   * map is refused rather than accepted, because a config declaring
   * no field extracts an empty record from every payload and reports
   * a working extraction of nothing.
   */
  readonly fields?: Readonly<Record<string, FieldRule>>;
}

/**
 * What one member of a record has to look like for the reading to
 * count.
 *
 * Three predicates and no more, each of them data. There is no
 * expression to evaluate here and no room for one: a contract that
 * could state a predicate would be a contract that could state a
 * program.
 */
export interface ContractField {
  /**
   * Whether a reading must have been taken at all.
   *
   * `null` is what fails this, which is the null-vs-zero rule
   * showing up in the check: a member read as `0` or as the empty
   * string satisfies `required`, because both are measurements.
   */
  readonly required?: boolean;

  /** The shape the member has to be, as {@link FIELD_TYPES} names them. */
  readonly type?: FieldType;

  /**
   * A regular expression the member has to match, as text.
   *
   * A pattern that will not compile is reported as a fault of the
   * CONTRACT rather than silently passing every record. That is the
   * one sentence here that is about the operator rather than the
   * source, and it is deliberate — a contract nobody can compile
   * checks nothing, which is exactly the state
   * `sources.contract` warns about when it is left empty.
   */
  readonly pattern?: string;
}

/**
 * A `sources.contract` row, as the engine reads one.
 *
 * An empty contract yields no errors, which is the documented cost
 * of leaving the column at its default: where nothing is declared,
 * nothing is rejected, nothing is counted, and a source whose shape
 * has drifted reads exactly like one that is still working.
 */
export interface SourceContract {
  /** One check per member, keyed by the member name. */
  readonly fields?: Readonly<Record<string, ContractField>>;
}

/**
 * The markup step, as this engine takes one.
 *
 * Answers `unknown` rather than a string list, because an injected
 * function is a boundary: {@link applyFieldMap} normalizes whatever
 * comes back and keeps the strings, so a step answering something
 * else degrades to no fragments instead of putting a stray value in
 * a record.
 */
export type MarkupSelect = (markup: string, selector: string) => unknown;

/** Everything the engine needs that is not data. */
export interface ParseDeps {
  /**
   * How to read fragments out of markup.
   *
   * Absent means no markup opinion: every `selector` field warns and
   * answers `null`. `src/lib/markup-select.ts` is what a caller
   * normally passes, and it cannot be imported here — see the
   * header.
   */
  readonly selectMarkup?: MarkupSelect;
}

/**
 * One record the engine built.
 *
 * Built on a null prototype, so `Object.hasOwn` and a plain read
 * agree about every member and a field named `__proto__` is a real
 * own key rather than a silent no-op.
 */
export type ParsedRecord = Record<string, unknown>;

/** One record, and everything the engine could not do while building it. */
export interface FieldMapResult {
  /** The record, with one member per field the map declared. */
  readonly record: ParsedRecord;

  /** One sentence per step that could not be taken, in field order. */
  readonly warnings: readonly string[];
}

/** What {@link extractRecords} made of a payload. */
export interface ParseResult {
  /** Every record the config found, in payload order. */
  readonly records: readonly ParsedRecord[];

  /**
   * One sentence per step that could not be taken.
   *
   * A warning is about this payload; a member of
   * {@link ParseResult.configErrors} is about the row. The two are
   * separate because they have different owners — a warning is read
   * by whoever is looking at one document, and a config error is a
   * source that cannot work until somebody edits it.
   */
  readonly warnings: readonly string[];

  /**
   * Why the config was refused, when it was.
   *
   * Empty for every usable config. Non-empty means nothing was read
   * at all: {@link extractRecords} validates before it walks, so a
   * malformed row answers zero records and its faults rather than a
   * partial extraction nobody can tell from a thin payload.
   */
  readonly configErrors: readonly string[];
}

// ---------------------------------------------------------------------------
// Refusals
// ---------------------------------------------------------------------------

/**
 * Every sentence {@link parserConfigErrors} assembles a fault from.
 *
 * Collected here rather than written at the call sites, so what a
 * malformed row can be told about it is auditable in one place
 * instead of by reading a walk. Two shapes: the whole-config
 * sentences stand alone, and the per-field ones are predicates a
 * field name is put in front of.
 *
 * Not exported, and the suite declares the roster itself. A suite
 * reading these off the module would agree with any edit to them,
 * which is the one thing an operator reading `parse_error` at a
 * glance cannot afford.
 */
const CONFIG_FAULTS = {
  /** The row is not something with keys in it. */
  notObject: 'the parser config is not an object',

  /** No field map at all. */
  noFields: 'the parser config declares no field map',

  /** A field map that is not something with keys in it. */
  fieldsNotObject: 'the field map is not an object',

  /** A field map with nothing in it, which extracts nothing. */
  noField: 'the field map declares no field',

  /** More fields than {@link MAX_FIELDS}. */
  tooManyFields: 'the field map declares more fields than the engine reads',

  /** A records path that is not a usable path. */
  recordsPath: 'the records path is not a usable path',

  /**
   * A field name outside {@link FIELD_NAME_PATTERN}.
   *
   * The one fault whose site is a POSITION rather than a name, and
   * {@link fieldSite} is what makes it so: quoting a name is exactly
   * what the name class exists to bound, so a name that failed the
   * class is a name no sentence may repeat.
   */
  fieldName: ' is not a name the engine can use',

  /**
   * A name in {@link RESERVED_FIELD_NAMES}, quoted from that closed
   * set rather than from anything the row carried.
   */
  reservedName: ' is a reserved field name',

  /**
   * A rule that is not something with keys in it.
   *
   * Worded as `states a rule` rather than as the bare `is not an
   * object` it started as, because the shorter form was a SUFFIX of
   * two whole-config sentences above it — so one report accounted
   * for another and a reader could not tell which had been made.
   */
  ruleNotObject: ' states a rule that is not an object',

  /** A rule with no way to reach a value. */
  noSource: ' states neither a path nor a selector',

  /** A path that is not a usable path. */
  path: ' states a path the engine cannot walk',

  /** A selector that is not a non-empty string. */
  selector: ' states a selector that is not a non-empty string',

  /** A pattern that is not a non-empty string. */
  pattern: ' states a pattern that is not a non-empty string',

  /** A pattern past {@link MAX_PATTERN_LENGTH}. */
  patternLength: ' states a pattern longer than the engine compiles',

  /** A pattern the engine cannot compile. */
  patternCompile: ' states a pattern that does not compile',

  /** A capture group that is not a non-negative integer. */
  group: ' states a capture group that is not a non-negative integer',

  /** A capture group with nothing to capture out of. */
  groupNoPattern: ' states a capture group with no pattern',

  /** A type outside {@link FIELD_TYPES}. */
  type: ' states a type the engine does not coerce to',
} as const;

/**
 * Every sentence {@link contractErrors} assembles a fault from.
 *
 * The per-member ones open with {@link MEMBER_PREFIX} and a member
 * name, which is contract text rather than payload text — the whole
 * of the no-echo rule in one line. A record that failed a check is
 * described by what it failed, never by what it held.
 */
const CONTRACT_FAULTS = {
  /** The thing being checked is not something with keys in it. */
  recordNotObject: 'the record is not an object',

  /** The contract is not something with keys in it. */
  notObject: 'the contract is not an object',

  /** A contract field map that is not something with keys in it. */
  fieldsNotObject: 'the contract field map is not an object',

  /** A contract name outside {@link FIELD_NAME_PATTERN}. */
  memberName: ' is not a name the engine can use',

  /** A check that is not something with keys in it. */
  checkNotObject: ' declares a check that is not an object',

  /** A member the contract requires and the reading did not take. */
  required: ' is required and no value was read',

  /** Opens the sentence naming the shape a member was not read as. */
  typePrefix: ' was not read as the declared type: ',

  /** A declared type outside {@link FIELD_TYPES}. */
  typeUnknown: ' declares a type the engine does not coerce to',

  /** A member whose text does not match what the contract declared. */
  pattern: ' does not match the declared pattern',

  /** A declared pattern the engine cannot compile. */
  patternCompile: ' declares a pattern that does not compile',
} as const;

/**
 * Every sentence a per-payload warning is assembled from.
 *
 * Distinct from both fault tables because a warning has a different
 * owner. A fault is a row somebody has to edit; a warning is one
 * payload that did not carry what the row expected, and the contract
 * is what decides whether that is a failure.
 */
const PARSE_WARNINGS = {
  /**
   * Nothing was there at all.
   *
   * Worded around where the records SHOULD be rather than around a
   * records path, because a config states one only when the payload
   * wraps its records: with no path stated the payload itself is
   * where they should be, and a sentence naming a path nobody wrote
   * would send a reader to the wrong half of the row.
   */
  noRecords: 'the payload holds nothing where records should be',

  /** Something was there, and it is neither a record nor a list. */
  notRecords:
    'the payload holds no record and no list where records should be',

  /** Opens the sentence counting list entries that are not records. */
  skippedPrefix: 'entries the payload offered as records are not records: ',

  /** A selector field with no step behind it. */
  noMarkupStep: ' states a selector and no markup step was supplied',

  /** A selector field over a value that is not text. */
  markupNotText: ' states a selector over a value that is not text',

  /** The injected step raised rather than answering. */
  markupRaised: ' states a selector and the markup step raised',
} as const;

/** What a per-field sentence opens with. */
const FIELD_PREFIX = 'field ';

/** What a per-member contract sentence opens with. */
const MEMBER_PREFIX = 'member ';

/**
 * What stands in for a name a sentence may not repeat.
 *
 * An ordinal is the whole of what is left once the name is refused,
 * and it is enough: the position is an index into the field map an
 * operator is already reading, and a number carries nothing from
 * anywhere.
 */
const AT_POSITION = 'at position ';

// ---------------------------------------------------------------------------
// Reading a value
// ---------------------------------------------------------------------------

/**
 * Whether a value can be walked into at all.
 *
 * Arrays included, functions and primitives excluded. A primitive is
 * a LEAF on purpose: `Object.hasOwn` boxes a string and would answer
 * true for `0`, so admitting one would let a path index a character
 * out of a title. See the header.
 *
 * @param value - Anything at all.
 * @returns Whether a path may descend through it.
 */
function isTraversable(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Whether a value is a keyed object rather than a list.
 *
 * A list is excluded because a record, a config and a contract are
 * all things read by member name, and a roster passed where one of
 * them belonged should read as the wrong shape rather than as an
 * empty one.
 *
 * @param value - Anything at all.
 * @returns Whether it is a plain keyed object.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return isTraversable(value) && !Array.isArray(value);
}

/**
 * One own key of a value, or nothing.
 *
 * The single place this module reads a key it did not write, and so
 * the single place the prototype trap could open. `Object.hasOwn`
 * rather than `in` and rather than a bare read: over an object
 * holding no data at all, `in` answers true for `toString`,
 * `valueOf`, `constructor` and `hasOwnProperty`, and a bare read
 * hands the function back.
 *
 * @param source - Something to read a key off.
 * @param key - The key, as a stored path or field map spelled it.
 * @returns The own value there, or `undefined` for anything else.
 */
function ownValue(source: unknown, key: string): unknown {
  if (!isTraversable(source)) {
    return undefined;
  }

  if (!Object.hasOwn(source, key)) {
    return undefined;
  }

  return source[key];
}

/**
 * Every own key of a keyed object, in insertion order.
 *
 * `Object.keys` rather than a `for...in`, which walks the prototype
 * chain, and rather than `Object.getOwnPropertyNames`, which reaches
 * the non-enumerable members a hostile payload can define.
 *
 * @param source - Something to list the keys of.
 * @returns Its own enumerable keys, or an empty list.
 */
function ownKeys(source: unknown): readonly string[] {
  return isRecord(source)
    ? Object.keys(source)
    : [];
}

/**
 * A stored path as the segments it names, or nothing when it is not
 * a path the engine walks.
 *
 * Refuses the three ways a path can be unusable rather than
 * repairing any of them: something that is not a string, a segment
 * with nothing in it (a leading, doubled or trailing separator), and
 * a path deeper than {@link MAX_PATH_SEGMENTS}. An empty path is
 * refused too — a rule that means the record itself omits `path`
 * rather than spelling it as nothing.
 *
 * @param path - Whatever the config had there.
 * @returns The segments, or `null` for a path the engine refuses.
 */
function pathSegments(path: unknown): readonly string[] | null {
  if (typeof path !== 'string' || path.length === 0) {
    return null;
  }

  const segments = path.split(PATH_SEPARATOR);

  if (segments.length > MAX_PATH_SEGMENTS) {
    return null;
  }

  return segments.some((segment) => segment.length === 0)
    ? null
    : segments;
}

/**
 * Whatever a stored path reaches, or nothing.
 *
 * Own keys the whole way down, so a path spelling `__proto__`,
 * `constructor` or `toString` resolves to nothing however the
 * payload is shaped. What it DOES reach, and what a case pins: an
 * array index spelled as its number, and an array `length`, which is
 * an own property and therefore admitted by construction.
 *
 * Answers `undefined` for every refusal rather than raising, because
 * a path that reached nothing and a path that was never usable come
 * to the same thing for a reader — and {@link parserConfigErrors} is
 * what tells the two apart before any payload is walked.
 *
 * @param payload - Anything at all.
 * @param path - The stored path, as the config spelled it.
 * @returns The value there, or `undefined`.
 */
export function valueAtPath(payload: unknown, path: unknown): unknown {
  const segments = pathSegments(path);

  if (segments === null) {
    return undefined;
  }

  let cursor: unknown = payload;

  for (const segment of segments) {
    cursor = ownValue(cursor, segment);

    if (cursor === undefined) {
      return undefined;
    }
  }

  return cursor;
}

/**
 * Whatever a caller had, as text, or nothing.
 *
 * Only the four primitives that have an unambiguous spelling
 * convert. An object does NOT: serializing one here would invent a
 * reading the payload never offered, and it is also where a hostile
 * value lives — an own `toString` that raises takes both `String(x)`
 * and `Number(x)` down with it, so a conversion guarded by type
 * rather than by a `try` is the one that cannot be made to throw at
 * all.
 *
 * A non-finite number answers nothing for the same reason: `NaN` and
 * the infinities have text spellings, and none of them is a reading.
 *
 * @param value - Anything at all.
 * @returns Its text, or `null` when it has no honest one.
 */
function asText(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value)
      ? String(value)
      : null;
  }

  if (typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }

  return null;
}

/**
 * Whether a value is text already.
 *
 * A named predicate rather than an arrow written inline, because the
 * one place it is used is a `filter` inside a call whose line the
 * style rules will not let be broken after the arrow.
 *
 * @param value - Anything at all.
 * @returns Whether it is a string.
 */
function isText(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Whatever a caller had, as a number, or nothing.
 *
 * Three traps, and the guards against them are the null-vs-zero rule
 * made executable. `Number('')` is 0, so an empty string is refused
 * before the conversion. `Number([])` is 0 and `Number(['5'])` is 5,
 * so nothing but a string is converted at all. And `Number(true)` is
 * 1, so a boolean is not a quantity here either.
 *
 * Each of those would answer a confident number for a payload that
 * measured nothing, which is the one reading this pipeline cannot
 * take: a score renormalized across documents has to tell a measured
 * zero from an absent one.
 *
 * @param value - Anything at all.
 * @returns The number, or `null` when nothing was measured.
 */
function asNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value)
      ? value
      : null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  const parsed = Number(trimmed);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

/** The words a payload spells `true` with, lower case. */
const TRUE_WORDS = ['true', 'yes', 'on', '1'];

/** The words a payload spells `false` with, lower case. */
const FALSE_WORDS = ['false', 'no', 'off', '0'];

/**
 * Whatever a caller had, as a boolean, or nothing.
 *
 * Never `Boolean(value)`, which answers `true` for the string
 * `false` and for every other non-empty string a source can send.
 * Two closed word lists and the two numbers, and everything else is
 * a reading nobody took.
 *
 * @param value - Anything at all.
 * @returns The boolean, or `null` when nothing was read.
 */
function asBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    if (value === 1) {
      return true;
    }

    return value === 0
      ? false
      : null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const word = value.trim().toLowerCase();

  if (TRUE_WORDS.includes(word)) {
    return true;
  }

  return FALSE_WORDS.includes(word)
    ? false
    : null;
}

/**
 * Whatever a caller had, as a list, or nothing.
 *
 * A value that is not a list is NOT wrapped in one. Wrapping is how
 * a source answering one record where the config expected many stops
 * being visible: the record would come back looking like a list of
 * one, and the contract would have nothing to report. Refused
 * instead, so the shape difference reaches the check that exists to
 * see it.
 *
 * A copy rather than the payload's own array, so nothing downstream
 * writes back into the payload a caller may still be holding.
 *
 * @param value - Anything at all.
 * @returns A fresh list, or `null`.
 */
function asMembers(value: unknown): readonly unknown[] | null {
  return Array.isArray(value)
    ? [...(value as readonly unknown[])]
    : null;
}

/**
 * A stated type, or the default.
 *
 * An unusable type falls back rather than raising, because
 * {@link parserConfigErrors} has already reported it: by the time a
 * payload is being walked, an unknown type is a fault somebody has
 * been told about and not a decision to make again.
 *
 * @param type - Whatever the rule had there.
 * @returns One of {@link FIELD_TYPES}.
 */
function fieldType(type: unknown): FieldType {
  return isFieldType(type)
    ? type
    : DEFAULT_FIELD_TYPE;
}

/**
 * Whether a value is one of the shapes the engine coerces to.
 *
 * @param type - Anything at all.
 * @returns Whether {@link FIELD_TYPES} holds it.
 */
function isFieldType(type: unknown): type is FieldType {
  return typeof type === 'string'
    && (FIELD_TYPES as readonly string[]).includes(type);
}

// ---------------------------------------------------------------------------
// The four steps a field rule runs
// ---------------------------------------------------------------------------

/**
 * A stored regular expression, compiled, or nothing.
 *
 * Answers `null` for a source that will not compile rather than
 * letting the `SyntaxError` out. What that buys is the difference
 * between one field of one record reading as nothing and a whole
 * batch failing on a row somebody typed a stray bracket into — and
 * a source row is exactly where a stray bracket comes from, whether
 * an operator wrote it or a model proposed it.
 *
 * Compiled with NO flags, which is deliberate rather than an
 * omission: a `g` regex carries `lastIndex` between calls, and a
 * library spliced into a Code node keeps no state between calls by
 * rule. Compiled per call for the same reason — there is no cache
 * here and there cannot be one.
 *
 * @param pattern - Whatever the config had there.
 * @returns The expression, or `null`.
 */
export function compileCapture(pattern: unknown): RegExp | null {
  if (typeof pattern !== 'string' || pattern.length === 0) {
    return null;
  }

  if (pattern.length > MAX_PATTERN_LENGTH) {
    return null;
  }

  try {
    return new RegExp(pattern, 'u');
  } catch {
    return null;
  }
}

/**
 * Which capture group a rule reads.
 *
 * A group the pattern does not have falls back to 0, the whole
 * match. That is the reading a pattern with no parentheses in it
 * wants — {@link DEFAULT_CAPTURE_GROUP} assumes parentheses, and a
 * pattern is free not to have any — and it is not a fault, so
 * nothing reports it.
 *
 * @param group - Whatever the rule had there.
 * @param count - How many groups the match came back with, plus one.
 * @returns An index the match has.
 */
function captureIndex(group: unknown, count: number): number {
  if (typeof group === 'number' && Number.isInteger(group)
    && group >= 0 && group < count) {
    return group;
  }

  return DEFAULT_CAPTURE_GROUP < count
    ? DEFAULT_CAPTURE_GROUP
    : 0;
}

/**
 * What a stored pattern captures out of a value, or nothing.
 *
 * Four ways to answer nothing and none of them raises: a pattern
 * that would not compile, a value with no honest text, a pattern
 * that did not match, and a group that matched nothing. They are
 * deliberately not told apart in the answer — every one of them
 * means this field was not read, and the contract is what decides
 * whether that matters.
 *
 * @param value - Whatever the earlier steps left.
 * @param pattern - The stored expression.
 * @param group - Which group to keep, if the rule named one.
 * @returns The captured text, or `null`.
 */
export function captureFrom(
  value: unknown,
  pattern: unknown,
  group?: unknown,
): string | null {
  const compiled = compileCapture(pattern);

  if (compiled === null) {
    return null;
  }

  const text = asText(value);

  if (text === null) {
    return null;
  }

  const match = compiled.exec(text);

  if (match === null) {
    return null;
  }

  const captured = match[captureIndex(group, match.length)];

  return captured === undefined
    ? null
    : captured;
}

/**
 * A value in the shape a field states, under the null-vs-zero rule.
 *
 * Absence is `null` and every reading that could not be taken is
 * `null`, while every reading that WAS taken is the value — `0`
 * included, and the empty string included. Nothing here invents a
 * value for a member the payload did not carry, which is why no
 * field rule has a default.
 *
 * @param value - Whatever the earlier steps left.
 * @param type - The shape the rule states.
 * @returns The coerced value, or `null`.
 */
export function coerceValue(value: unknown, type: unknown): unknown {
  if (value === null || value === undefined) {
    return null;
  }

  switch (fieldType(type)) {
    case 'raw':
      return value;
    case 'number':
      return asNumber(value);
    case 'boolean':
      return asBoolean(value);
    case 'list':
      return asMembers(value);
    default:
      return asText(value);
  }
}

// ---------------------------------------------------------------------------
// Naming a fault without repeating a value
// ---------------------------------------------------------------------------

/**
 * Whether a name is one a sentence may quote.
 *
 * The class and the ceiling together, in one place, because they are
 * one decision: a name is quotable exactly when it is bounded in
 * both what it may be spelled with and how long it may be.
 *
 * @param name - A key off a field map or a contract.
 * @returns Whether the engine may use it and repeat it.
 */
function usableFieldName(name: string): boolean {
  return name.length > 0
    && name.length <= MAX_FIELD_NAME_LENGTH
    && FIELD_NAME_PATTERN.test(name);
}

/**
 * Where a per-field sentence says the fault is.
 *
 * The name when the name is quotable, and its position when it is
 * not. That fallback is the no-echo rule in its narrowest form and
 * the reason the rule is true at all: without it, the one fault that
 * reports an unusable name would be the one sentence carrying
 * unbounded text.
 *
 * @param name - The field map key.
 * @param index - Where it sits in that map.
 * @returns The site, ready for a predicate to be appended.
 */
function fieldSite(name: string, index: number): string {
  return usableFieldName(name)
    ? `${FIELD_PREFIX}${name}`
    : `${FIELD_PREFIX}${AT_POSITION}${String(index)}`;
}

/**
 * The same, for a contract member.
 *
 * @param name - The contract field map key.
 * @param index - Where it sits in that map.
 * @returns The site, ready for a predicate to be appended.
 */
function memberSite(name: string, index: number): string {
  return usableFieldName(name)
    ? `${MEMBER_PREFIX}${name}`
    : `${MEMBER_PREFIX}${AT_POSITION}${String(index)}`;
}

// ---------------------------------------------------------------------------
// Validating a parser config
// ---------------------------------------------------------------------------

/**
 * Everything a stored pattern and its capture group can be wrong
 * about, as sentences.
 *
 * Split out so the three pattern faults are ordered rather than
 * reported together: a pattern that is not a string is not also a
 * pattern that will not compile, and a config carrying one fault
 * should read as carrying one.
 *
 * @param site - What {@link fieldSite} answered.
 * @param pattern - Whatever the rule had there.
 * @param group - Whatever the rule had there.
 * @returns One sentence per fault.
 */
function patternErrors(
  site: string,
  pattern: unknown,
  group: unknown,
): readonly string[] {
  const errors: string[] = [];

  if (pattern !== undefined) {
    if (typeof pattern !== 'string' || pattern.length === 0) {
      errors.push(`${site}${CONFIG_FAULTS.pattern}`);
    } else if (pattern.length > MAX_PATTERN_LENGTH) {
      errors.push(`${site}${CONFIG_FAULTS.patternLength}`);
    } else if (compileCapture(pattern) === null) {
      errors.push(`${site}${CONFIG_FAULTS.patternCompile}`);
    }
  }

  if (group === undefined) {
    return errors;
  }

  if (typeof group !== 'number' || !Number.isInteger(group) || group < 0) {
    errors.push(`${site}${CONFIG_FAULTS.group}`);
  } else if (pattern === undefined) {
    errors.push(`${site}${CONFIG_FAULTS.groupNoPattern}`);
  }

  return errors;
}

/**
 * Everything one entry of a field map can be wrong about.
 *
 * The two name faults answer alone rather than joining a list,
 * because a name the engine will not use is not a rule the engine
 * has read: reporting what its `pattern` also failed at would be
 * reporting on a field that is not going to exist.
 *
 * @param name - The field map key.
 * @param index - Where it sits in that map.
 * @param rule - Whatever the map had under that key.
 * @returns One sentence per fault.
 */
function fieldRuleErrors(
  name: string,
  index: number,
  rule: unknown,
): readonly string[] {
  const site = fieldSite(name, index);

  if (!usableFieldName(name)) {
    return [`${site}${CONFIG_FAULTS.fieldName}`];
  }

  if ((RESERVED_FIELD_NAMES as readonly string[]).includes(name)) {
    return [`${site}${CONFIG_FAULTS.reservedName}`];
  }

  if (!isRecord(rule)) {
    return [`${site}${CONFIG_FAULTS.ruleNotObject}`];
  }

  const errors: string[] = [];
  const path = ownValue(rule, 'path');
  const selector = ownValue(rule, 'selector');
  const type = ownValue(rule, 'type');

  if (path === undefined && selector === undefined) {
    errors.push(`${site}${CONFIG_FAULTS.noSource}`);
  }

  if (path !== undefined && pathSegments(path) === null) {
    errors.push(`${site}${CONFIG_FAULTS.path}`);
  }

  if (selector !== undefined
    && (typeof selector !== 'string' || selector.length === 0)) {
    errors.push(`${site}${CONFIG_FAULTS.selector}`);
  }

  errors.push(...patternErrors(
    site,
    ownValue(rule, 'pattern'),
    ownValue(rule, 'group'),
  ));

  if (type !== undefined && !isFieldType(type)) {
    errors.push(`${site}${CONFIG_FAULTS.type}`);
  }

  return errors;
}

/**
 * Everything wrong with a `sources.parser_config` row, one sentence
 * at a time.
 *
 * Answers a LIST rather than throwing at the first fault, so an
 * operator fixing a row sees the whole of what is wrong with it and
 * not whichever member happened to be looked at first. An empty list
 * is the only thing that means usable.
 *
 * The three whole-config faults answer alone, because none of them
 * leaves a field map to walk. Past them every fault is per field,
 * and the field map is read by own key so a config carrying an own
 * `__proto__` entry is refused by name rather than silently walked
 * past.
 *
 * @param config - Whatever the column held.
 * @returns One sentence per fault, empty when the row is usable.
 */
export function parserConfigErrors(config: unknown): readonly string[] {
  if (!isRecord(config)) {
    return [CONFIG_FAULTS.notObject];
  }

  const errors: string[] = [];
  const recordsPath = ownValue(config, 'recordsPath');

  if (recordsPath !== undefined && pathSegments(recordsPath) === null) {
    errors.push(CONFIG_FAULTS.recordsPath);
  }

  const fields = ownValue(config, 'fields');

  if (fields === undefined) {
    errors.push(CONFIG_FAULTS.noFields);

    return errors;
  }

  if (!isRecord(fields)) {
    errors.push(CONFIG_FAULTS.fieldsNotObject);

    return errors;
  }

  const names = Object.keys(fields);

  if (names.length === 0) {
    errors.push(CONFIG_FAULTS.noField);

    return errors;
  }

  if (names.length > MAX_FIELDS) {
    errors.push(CONFIG_FAULTS.tooManyFields);
  }

  for (const [index, name] of names.entries()) {
    errors.push(...fieldRuleErrors(name, index, ownValue(fields, name)));
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Reading one record
// ---------------------------------------------------------------------------

/** One field, read, and what could not be done while reading it. */
interface FieldReading {
  /** What the four steps left, before coercion states its shape. */
  readonly value: unknown;

  /** Predicates a field site is put in front of. */
  readonly warnings: readonly string[];
}

/**
 * What a `selector` step made of a value.
 *
 * Four ways to answer nothing, three of them with a warning: no step
 * was supplied, the value has no honest text to select over, and the
 * step raised. The fourth is a step that answered no fragments,
 * which is a selector matching nothing and not a fault at all.
 *
 * The step is called inside a `try` even though the matcher this
 * package ships answers an empty list rather than raising. What is
 * being guarded is the INJECTION seam rather than that matcher: a
 * caller supplies this function, and one record of a batch raising
 * out of a Code node would take the batch with it.
 *
 * A `list` field keeps every fragment and every other field reads
 * the first. That is the one place a coercion reaches back into an
 * earlier step, and it is why the type is passed in.
 *
 * @param value - What the path step left.
 * @param selector - The stored selector.
 * @param type - The shape the rule states.
 * @param deps - Everything the engine needs that is not data.
 * @returns The fragments, or nothing, and why.
 */
function selectFragments(
  value: unknown,
  selector: string,
  type: FieldType,
  deps?: ParseDeps,
): FieldReading {
  const step = deps?.selectMarkup;

  if (typeof step !== 'function') {
    return { value: null, warnings: [PARSE_WARNINGS.noMarkupStep] };
  }

  const markup = asText(value);

  if (markup === null) {
    return { value: null, warnings: [PARSE_WARNINGS.markupNotText] };
  }

  let answered: unknown;

  try {
    answered = step(markup, selector);
  } catch {
    return { value: null, warnings: [PARSE_WARNINGS.markupRaised] };
  }

  const fragments = (asMembers(answered) ?? []).filter(isText);

  if (type === 'list') {
    return { value: fragments, warnings: [] };
  }

  return {
    value: fragments.length === 0
      ? null
      : fragments[0],
    warnings: [],
  };
}

/**
 * What a rule stating no usable selector leaves.
 *
 * A rule with no `selector` at all passes the value through. A rule
 * whose selector is not a usable string reads as nothing, because
 * the alternative is worse: passing the value through would hand
 * raw markup to the coercion as though it were the member, and a
 * record would carry a page where a title belonged. The fault itself
 * is {@link parserConfigErrors}'s to report, and this is only what
 * the engine does meanwhile.
 *
 * @param value - What the path step left.
 * @param selector - Whatever the rule had there.
 * @returns The value, or nothing.
 */
function noSelection(value: unknown, selector: unknown): FieldReading {
  return selector === undefined
    ? { value, warnings: [] }
    : { value: null, warnings: [] };
}

/**
 * What a stored pattern captures, over one value or over each member
 * of a list.
 *
 * A list keeps its cardinality: a member the pattern did not match
 * becomes `null` in place rather than being dropped. Dropping would
 * make a partial reading indistinguishable from a shorter list, and
 * a contract counting members would have nothing to notice.
 *
 * @param value - What the selector step left.
 * @param pattern - The stored expression.
 * @param group - Which group to keep, if the rule named one.
 * @returns The capture, or a list of them.
 */
function captureThrough(
  value: unknown,
  pattern: unknown,
  group: unknown,
): unknown {
  if (!Array.isArray(value)) {
    return captureFrom(value, pattern, group);
  }

  const members: (string | null)[] = [];

  for (const member of value as readonly unknown[]) {
    members.push(captureFrom(member, pattern, group));
  }

  return members;
}

/**
 * One field of one record, through all four steps.
 *
 * Path, then selector, then capture, then coercion — in that order
 * and each one optional. A rule that is not an object reads as
 * nothing rather than raising, for the reason
 * {@link noSelection} gives about its own half: the fault belongs to
 * the validator, and the engine meanwhile answers the absence it
 * would answer for a member the payload did not carry.
 *
 * @param source - The record the payload offered.
 * @param rule - Whatever the field map had under this name.
 * @param deps - Everything the engine needs that is not data.
 * @returns The member, and why any step could not be taken.
 */
function readField(
  source: unknown,
  rule: unknown,
  deps?: ParseDeps,
): FieldReading {
  if (!isRecord(rule)) {
    return { value: null, warnings: [] };
  }

  const type = ownValue(rule, 'type');
  const path = ownValue(rule, 'path');
  const read = path === undefined
    ? source
    : valueAtPath(source, path);

  const selector = ownValue(rule, 'selector');
  const selected = typeof selector === 'string' && selector.length > 0
    ? selectFragments(read, selector, fieldType(type), deps)
    : noSelection(read, selector);

  const pattern = ownValue(rule, 'pattern');
  const captured = pattern === undefined
    ? selected.value
    : captureThrough(selected.value, pattern, ownValue(rule, 'group'));

  return {
    value: coerceValue(captured, type),
    warnings: selected.warnings,
  };
}

/**
 * A field map applied to one record.
 *
 * The record it builds carries a NULL PROTOTYPE, which is the whole
 * of the write-side prototype guard: a field named `__proto__` lands
 * as a real own key rather than going through the setter on
 * `Object.prototype` and vanishing, and `Object.hasOwn` and a plain
 * read agree about every member afterwards. `Object.create(null)`
 * rather than a plain object is a choice this module gets to make
 * freely — it is new here rather than ported, so there is no earlier
 * behaviour and no parity leg for the change to diverge from.
 *
 * Every declared field gets a member, including the ones that read
 * as nothing. A record whose absent members were simply missing
 * would make an absence and a member nobody declared the same thing,
 * and {@link contractErrors} has to tell those apart.
 *
 * @param source - The record the payload offered.
 * @param fields - The field map, as the config states it.
 * @param deps - Everything the engine needs that is not data.
 * @returns The record, and one sentence per step not taken.
 */
export function applyFieldMap(
  source: unknown,
  fields: unknown,
  deps?: ParseDeps,
): FieldMapResult {
  const record = Object.create(null) as ParsedRecord;
  const warnings: string[] = [];

  for (const [index, name] of ownKeys(fields).entries()) {
    const read = readField(source, ownValue(fields, name), deps);
    const site = fieldSite(name, index);

    record[name] = read.value;
    warnings.push(...read.warnings.map((warning) => `${site}${warning}`));
  }

  return { record, warnings };
}

// ---------------------------------------------------------------------------
// Reading a payload
// ---------------------------------------------------------------------------

/** Where the records were, and what the payload did not offer. */
interface RecordsFound {
  /** Every entry the records path reached that is a record. */
  readonly records: readonly unknown[];

  /** Whole sentences, since none of them is about a field. */
  readonly warnings: readonly string[];
}

/**
 * Every record a payload offers under a config.
 *
 * Three shapes are accepted and each is a real thing a source
 * answers: a list of records, one record on its own, and a payload
 * whose records sit under a path. What is refused is anything else,
 * and refusal here is a WARNING rather than a fault — the source
 * answered, and whether what it answered is acceptable is the
 * contract's question rather than the config's.
 *
 * A list carrying entries that are not records loses them and says
 * how many. A count rather than the entries, because an entry is
 * payload content and this sentence is stored.
 *
 * @param payload - Whatever the source answered.
 * @param recordsPath - Whatever the config had there.
 * @returns The records, and what the payload did not offer.
 */
function recordsFrom(payload: unknown, recordsPath: unknown): RecordsFound {
  const found = recordsPath === undefined
    ? payload
    : valueAtPath(payload, recordsPath);

  if (found === undefined || found === null) {
    return { records: [], warnings: [PARSE_WARNINGS.noRecords] };
  }

  if (Array.isArray(found)) {
    const records = (found as readonly unknown[]).filter(isRecord);
    const skipped = found.length - records.length;

    return {
      records,
      warnings: skipped === 0
        ? []
        : [`${PARSE_WARNINGS.skippedPrefix}${String(skipped)}`],
    };
  }

  return isRecord(found)
    ? { records: [found], warnings: [] }
    : { records: [], warnings: [PARSE_WARNINGS.notRecords] };
}

/**
 * Every record a payload yields under a `sources.parser_config` row.
 *
 * The config is VALIDATED first and a row carrying any fault reads
 * nothing at all. That is the one place this engine refuses rather
 * than degrading, and the reason is that a partial extraction under
 * a broken config is indistinguishable from a thin payload: the
 * caller would store a document with two of its five members and
 * count it as a reading. Refusing puts the faults in
 * {@link ParseResult.configErrors}, where they name a row somebody
 * has to edit.
 *
 * Everything past that degrades instead. A records path reaching
 * nothing, an entry that is not a record, a field whose path found
 * no value, a selector with no step behind it — each is a warning
 * and none of them stops the walk, because a run over a batch has to
 * finish the batch.
 *
 * Nothing here decides whether a reading is GOOD. That is
 * {@link contractErrors}, called by whoever holds the source row,
 * and the fail-flag-keep path is built out of the two answers
 * together: the records are stored whatever the check said, the
 * check is what marks the document failed, and the source counter is
 * what turns a run of failures into a flag.
 *
 * @param payload - Whatever the source answered.
 * @param config - Whatever the column held.
 * @param deps - Everything the engine needs that is not data.
 * @returns The records, the warnings, and the config faults.
 */
export function extractRecords(
  payload: unknown,
  config: unknown,
  deps?: ParseDeps,
): ParseResult {
  const configErrors = parserConfigErrors(config);

  // The second half of that test is unreachable — a config that is
  // not a record has already produced a fault — and it is what
  // narrows the type for the walk below. Written as one condition
  // rather than two returns so there is one refusal shape.
  if (configErrors.length > 0 || !isRecord(config)) {
    return { records: [], warnings: [], configErrors };
  }

  const found = recordsFrom(payload, ownValue(config, 'recordsPath'));
  const fields = ownValue(config, 'fields');
  const records: ParsedRecord[] = [];
  const warnings: string[] = [...found.warnings];

  for (const entry of found.records) {
    const built = applyFieldMap(entry, fields, deps);

    records.push(built.record);
    warnings.push(...built.warnings);
  }

  return { records, warnings, configErrors };
}

// ---------------------------------------------------------------------------
// Judging one record
// ---------------------------------------------------------------------------

/**
 * Whether a value already IS the shape a contract declares.
 *
 * A check rather than a coercion, and the difference is the point: a
 * contract asks what the reading came back as, so a string that
 * would coerce to a number is still not a number here. `raw` accepts
 * anything present, which is what a member declared only to be
 * required needs.
 *
 * @param value - The member, as the reading left it.
 * @param type - The declared shape.
 * @returns Whether the member is that shape.
 */
function isShape(value: unknown, type: FieldType): boolean {
  switch (type) {
    case 'text':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'list':
      return Array.isArray(value);
    default:
      return true;
  }
}

/**
 * Whether a member matches the expression its check declares.
 *
 * A pattern that will not compile is a fault of the CONTRACT and is
 * reported as one, rather than passing every record silently. It is
 * the one sentence in this table about the operator instead of the
 * source, and it is deliberate: a contract nobody can compile checks
 * nothing, which is the state the column warns about when it is left
 * at its default.
 *
 * A member with no honest text fails the pattern rather than
 * skipping it. A contract declaring a pattern has declared the
 * member to be text, and a list that never gets matched against
 * would pass a check it was never subjected to.
 *
 * @param site - What {@link memberSite} answered.
 * @param value - The member, as the reading left it.
 * @param pattern - Whatever the check had there.
 * @returns One sentence per fault.
 */
function memberPatternErrors(
  site: string,
  value: unknown,
  pattern: unknown,
): readonly string[] {
  if (pattern === undefined) {
    return [];
  }

  const compiled = compileCapture(pattern);

  if (compiled === null) {
    return [`${site}${CONTRACT_FAULTS.patternCompile}`];
  }

  const text = asText(value);

  return text !== null && compiled.test(text)
    ? []
    : [`${site}${CONTRACT_FAULTS.pattern}`];
}

/**
 * Everything one member can fail its check on.
 *
 * A member that was not read stops after `required`, which is what
 * keeps a single absence from being reported three times: a `null`
 * is not the declared type and does not match the declared pattern
 * either, and saying so would bury the one sentence that matters.
 *
 * The absence test is `null` or `undefined` and nothing else, which
 * is the null-vs-zero rule showing up in the check. A member read as
 * `0`, as `false` or as the empty string satisfies `required`,
 * because every one of those is a measurement.
 *
 * @param site - What {@link memberSite} answered.
 * @param value - The member, as the reading left it.
 * @param check - Whatever the contract had under that name.
 * @returns One sentence per fault.
 */
function memberErrors(
  site: string,
  value: unknown,
  check: unknown,
): readonly string[] {
  if (!isRecord(check)) {
    return [`${site}${CONTRACT_FAULTS.checkNotObject}`];
  }

  const missing = value === null || value === undefined;

  if (missing) {
    return ownValue(check, 'required') === true
      ? [`${site}${CONTRACT_FAULTS.required}`]
      : [];
  }

  const errors: string[] = [];
  const declared = ownValue(check, 'type');

  if (declared !== undefined) {
    if (!isFieldType(declared)) {
      errors.push(`${site}${CONTRACT_FAULTS.typeUnknown}`);
    } else if (!isShape(value, declared)) {
      errors.push(`${site}${CONTRACT_FAULTS.typePrefix}${declared}`);
    }
  }

  errors.push(...memberPatternErrors(
    site,
    value,
    ownValue(check, 'pattern'),
  ));

  return errors;
}

/**
 * Everything wrong with a record under a `sources.contract` row.
 *
 * This is the answer fail-flag-keep is built on. An empty list means
 * the reading is what the source promised. A non-empty one is a
 * DIVERGENCE, and what a caller does with it is fixed: keep the raw
 * payload, mark the document failed with these sentences as its
 * `parse_error`, bump the source counter, and flag the source once
 * the counter crosses its threshold. The document is never dropped —
 * a divergence is how a source shape change is discovered, and
 * discarding the evidence is how it stops being.
 *
 * An EMPTY contract yields no errors, and that is the documented
 * cost of leaving the column at its default rather than an oversight
 * to repair here: where nothing is declared, nothing is rejected and
 * nothing is counted, so a source whose shape has drifted reads
 * exactly like one that is still working. The repair is a contract,
 * not a stricter default.
 *
 * Every sentence names a member and a rule. None of them names a
 * value, and the two mechanisms that make that true are
 * {@link memberSite}, which refuses to repeat a name it cannot
 * bound, and {@link CONTRACT_FAULTS}, whose only interpolation is a
 * type drawn from {@link FIELD_TYPES}. That matters because these
 * sentences are stored in `documents.parse_error` and rendered by
 * exports, so a value quoted here is untrusted content in a column
 * nobody sanitizes on the way out.
 *
 * @param record - The reading, as {@link applyFieldMap} left it.
 * @param contract - Whatever the column held.
 * @returns One sentence per divergence, empty when the record holds.
 */
export function contractErrors(
  record: unknown,
  contract: unknown,
): readonly string[] {
  if (!isRecord(contract)) {
    return [CONTRACT_FAULTS.notObject];
  }

  const fields = ownValue(contract, 'fields');

  if (fields === undefined) {
    return [];
  }

  if (!isRecord(fields)) {
    return [CONTRACT_FAULTS.fieldsNotObject];
  }

  const names = Object.keys(fields);

  if (names.length === 0) {
    return [];
  }

  if (!isRecord(record)) {
    return [CONTRACT_FAULTS.recordNotObject];
  }

  const errors: string[] = [];

  for (const [index, name] of names.entries()) {
    const site = memberSite(name, index);

    if (usableFieldName(name)) {
      errors.push(...memberErrors(
        site,
        ownValue(record, name),
        ownValue(fields, name),
      ));
    } else {
      errors.push(`${site}${CONTRACT_FAULTS.memberName}`);
    }
  }

  return errors;
}
