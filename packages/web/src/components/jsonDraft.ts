/**
 * @packageDocumentation
 * The pure half of the JSON editor: text to a value, a value back to
 * text, and a schema refusal turned into sentences.
 *
 * `./JsonEditor.tsx` is the fallback presentation an editor offers
 * for a payload its fixed template cannot express, and it is
 * deliberately thin — the dynamic form provider replaces it later.
 * Every decision it makes therefore lives here, for the reason the
 * two-runner split makes structural: the unit runner collects `.ts`
 * files under `src` in a node environment, so a decision living in a
 * `.tsx` is reachable by no test in this package at all.
 *
 * ## No sentence ever quotes the payload
 *
 * What an operator pastes into this editor is routinely something
 * they would not want repeated back at them — a connector's token
 * under the write-only rule `../pages/tools/` carries, a capture
 * nobody has reviewed yet. A message quoting the offending value puts
 * it in the DOM, in a screenshot, and in whatever gets copied out of
 * a support thread, which is the one place nobody can go and remove
 * it afterwards.
 *
 * So every sentence here is assembled from two things and no others.
 * The PATH, which names where the fault is. And the SCHEMA's own
 * vocabulary — the type it expected, the bound it declared, the
 * options it allows. Nothing is read out of the payload.
 *
 * That rules out both of the messages a caller would reach for first,
 * and both were measured rather than assumed:
 *
 * - `SyntaxError.message` from `JSON.parse` quotes the source. V8
 *   answers `Unexpected token 'S', "SNTNL9 oops" is not valid JSON`
 *   and JavaScriptCore answers `JSON Parse error: Unexpected
 *   identifier "SNTNL9"` — two shapes, both carrying the input. It is
 *   also why {@link parseJsonDraft} reports no position: the engines
 *   put the position and the source in one string and expose no
 *   structured field to take the one without the other.
 * - `ZodIssue.message` is safe for zod's own built-in rules and is
 *   not safe in general. `unrecognized_keys` spells the input's key
 *   names, and a schema author's `error` callback receives the value
 *   and is free to put it in the text. The issue OBJECT is clean —
 *   zod 4 strips `input` before the error is thrown, measured — so
 *   the members {@link describeSchemaIssues} reads carry nothing from
 *   the payload except `keys`, which it counts rather than names.
 *
 * The one thing a sentence carries that did not come from the schema
 * is the path, and that is deliberate: an operator cannot fix a fault
 * they cannot find. For an object or an array a path segment is a
 * schema-declared name or an index. For a `z.record()` the key IS the
 * location, so a schema of that shape over operator-supplied key
 * names does put those names in a sentence — the colocated tests pin
 * that as the documented exception rather than leaving it implied.
 *
 * {@link formatJsonDraft} sits outside all of this by construction:
 * its whole job is to render the payload, so it quotes every byte.
 *
 * ## `__proto__` resolves to nothing
 *
 * `JSON.parse` does not pollute a prototype — it defines the key as
 * an ordinary own property — but the value it answers is then spread,
 * assigned and stored by code that does. `Object.assign` writes
 * through the prototype setter, so a `__proto__` key surviving this
 * far becomes a prototype replacement several modules downstream, at
 * a call site whose author never saw the payload.
 *
 * {@link parseJsonDraft} therefore drops the key at every depth, and
 * dropping rather than refusing because JSON gives the key no meaning
 * to carry: the rest of the payload is fine and the operator has
 * nothing to correct. It is not silent either. A save re-renders the
 * textarea through {@link formatJsonDraft} from the value that was
 * parsed, so the line is visibly gone.
 *
 * {@link formatJsonDraft} takes the same care from the other side.
 * Sorting an object's keys means rebuilding it, and a rebuild written
 * as `sorted[name] = held` would send a `__proto__` key through the
 * setter and silently drop it — so the rebuild goes through
 * `Object.fromEntries`, which defines own properties instead. Nothing
 * this module parses can reach that branch; a value from anywhere
 * else can.
 *
 * ## Which array stance this module is in
 *
 * Every sentence list returned here is a MUTABLE array, built fresh
 * per call and owned by nobody — the same stance `./editorDraft.ts`
 * takes, for the same reason: these feed `@ar/ui` props declared
 * mutable, so a `readonly` return would protect nothing and cost
 * every call site a copy.
 */

import type { ZodError, ZodIssue } from 'zod';

/** The key that changes an object's prototype when it is assigned. */
const PROTO_KEY = '__proto__';

/** The indent every formatted payload is written at. */
const FORMAT_INDENT = 2;

/**
 * The noun a size bound counts, by what the schema said it bounds.
 *
 * Absent for the origins whose bound IS a value rather than a size (a
 * number, a date's instant), where the sentence ends at the bound
 * itself. A leading space so the lookup composes either way.
 */
const BOUND_UNIT: Readonly<Record<string, string>> = {
  array: ' items',
  file: ' bytes',
  set: ' items',
  string: ' characters',
};

/**
 * What reading the editor's text produced.
 *
 * Discriminated rather than a value that may be `undefined`, because
 * `null`, `0` and `''` are all payloads a schema can accept and none
 * of them can be told from a refusal by a falsiness check.
 */
export type JsonDraftParse =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly sentences: string[] };

/** One size bound, as the sentence builder needs to read it. */
interface BoundReading {
  /** What the schema said it was bounding: `string`, `array`, ... */
  readonly origin: string;
  /** The bound itself, exactly as the schema declared it. */
  readonly bound: number | bigint;
  /** Whether a value equal to the bound is allowed. */
  readonly inclusive: boolean;
  /** Whether this is the upper bound rather than the lower one. */
  readonly atMost: boolean;
}

/**
 * Whether a value behaves like a plain record for the walks below.
 *
 * Arrays are objects to `typeof` and so is `null`; neither is what
 * "an object whose keys can be sorted" means here.
 *
 * @param value - Anything at all.
 * @returns Whether it is a non-null, non-array object.
 */
function isPlainObject(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object'
    && value !== null
    && !Array.isArray(value);
}

/**
 * The reviver that makes a `__proto__` key resolve to nothing.
 *
 * `JSON.parse` deletes a member whose reviver answers `undefined`,
 * and it walks every depth, so one function covers a nested payload
 * as well as the top level. JSON cannot express `undefined` at all,
 * so no legitimate value is lost to the same branch.
 *
 * @param key - The member being revived.
 * @param value - What it parsed to.
 * @returns The value, or `undefined` to drop the member.
 */
function dropProtoKey(key: string, value: unknown): unknown {
  return key === PROTO_KEY
    ? undefined
    : value;
}

/**
 * One object rebuilt with its own keys in sorted order.
 *
 * The replacer `JSON.stringify` applies at every depth, which is what
 * makes a nested payload sort as well as the top level. Anything that
 * is not a plain object passes through untouched — an array's order
 * is its data, not a key order to normalise.
 *
 * `Object.fromEntries` rather than an assignment loop: it DEFINES own
 * properties, so a `__proto__` key is written rather than sent
 * through the prototype setter and silently dropped.
 *
 * @param _key - The member's name, which the sort does not need.
 * @param value - The member's value.
 * @returns The value, with plain objects rebuilt in key order.
 */
function sortKeys(_key: string, value: unknown): unknown {
  if (!isPlainObject(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((name): [string, unknown] => [name, value[name]]),
  );
}

/**
 * One path segment, as it reads inside a location.
 *
 * An index takes brackets, a name takes a dot unless it opens the
 * path. `String` rather than a template for the name, because a path
 * segment is a `PropertyKey` and interpolating a symbol throws.
 *
 * @param segment - The segment to render.
 * @param index - Where it sits in the path.
 * @returns Its text, with its own separator.
 */
function renderSegment(segment: PropertyKey, index: number): string {
  if (typeof segment === 'number') {
    return `[${segment}]`;
  }

  return index === 0
    ? String(segment)
    : `.${String(segment)}`;
}

/**
 * The phrase a sentence opens with, naming where the fault is.
 *
 * The empty path is the payload itself, which is where a whole-object
 * refusal such as an unrecognised key lands.
 *
 * @param path - The issue's path, as the schema walked it.
 * @returns The opening phrase, capitalised to start a sentence.
 */
function describeLocation(path: readonly PropertyKey[]): string {
  const rendered = path.map(renderSegment).join('');

  return rendered === ''
    ? 'The payload'
    : `The value at ${rendered}`;
}

/**
 * One of the values a schema declares as allowed, as text.
 *
 * Every one of these came from the SCHEMA rather than the payload —
 * see the header on why that distinction is the whole design.
 *
 * Strings are quoted the way JSON quotes them, since JSON is what the
 * operator is looking at while they read the sentence.
 *
 * @param value - The declared value.
 * @returns Its text, quoted where it is a string.
 */
function renderAllowed(value: unknown): string {
  return typeof value === 'string'
    ? JSON.stringify(value)
    : String(value);
}

/**
 * The values a schema allows, as one phrase.
 *
 * @param values - The declared values, in the schema's own order.
 * @returns Them, comma-separated.
 */
function listAllowed(values: readonly unknown[]): string {
  return values.map(renderAllowed).join(', ');
}

/**
 * The rule phrase for keys the schema does not declare.
 *
 * The COUNT and never the names. A key an operator typed is as much
 * their payload as a value is, so the header's rule covers both, and
 * `unrecognized_keys` is the one issue member that would break it.
 *
 * @param count - How many keys the schema did not recognise.
 * @returns The phrase, with no location and no full stop.
 */
function describeUnrecognised(count: number): string {
  const noun = count === 1
    ? 'key'
    : 'keys';

  return `carries ${count} ${noun} the schema does not declare`;
}

/**
 * The comparison a bound reads as.
 *
 * @param atMost - Whether this is the upper bound.
 * @param inclusive - Whether the bound itself is allowed.
 * @returns The two or three words that go before the bound.
 */
function comparisonWord(atMost: boolean, inclusive: boolean): string {
  if (atMost) {
    return inclusive
      ? 'at most'
      : 'less than';
  }

  return inclusive
    ? 'at least'
    : 'more than';
}

/**
 * The rule phrase for a size or range bound.
 *
 * @param reading - The bound as the issue declared it.
 * @returns The phrase, with no leading location and no full stop.
 */
function describeBound(reading: BoundReading): string {
  const unit = BOUND_UNIT[reading.origin] ?? '';
  const comparison = comparisonWord(reading.atMost, reading.inclusive);

  return `must be ${comparison} ${reading.bound}${unit}`;
}

/**
 * What one issue says the schema wanted, in the schema's vocabulary.
 *
 * Every branch reads schema-declared members only. `keys` is the one
 * input-derived member touched anywhere here and it is COUNTED rather
 * than named; `message` is read by no branch, including the fallback,
 * which is what keeps a schema author's own callback out of the
 * output. The header states why.
 *
 * @param issue - The issue to describe.
 * @returns The rule phrase, with no location and no full stop.
 */
function describeRule(issue: ZodIssue): string {
  // Read before the switch narrows `issue` away, so the fallback can
  // still name a code this vocabulary has not caught up with.
  const { code } = issue;

  switch (issue.code) {
    case 'invalid_type':
      return `must be a ${issue.expected}`;
    case 'invalid_value':
      return `must be one of ${listAllowed(issue.values)}`;
    case 'not_multiple_of':
      return `must be a multiple of ${issue.divisor}`;
    case 'too_small':
      return describeBound({
        origin: issue.origin,
        bound: issue.minimum,
        inclusive: issue.inclusive === true,
        atMost: false,
      });
    case 'too_big':
      return describeBound({
        origin: issue.origin,
        bound: issue.maximum,
        inclusive: issue.inclusive === true,
        atMost: true,
      });
    case 'invalid_format':
      return issue.format === 'regex'
        ? 'must match the pattern the schema declares'
        : `must be a valid ${issue.format}`;
    case 'unrecognized_keys':
      return describeUnrecognised(issue.keys.length);
    case 'invalid_union': {
      const shapes = issue.errors.length;

      return `matches none of the ${shapes} shapes the schema allows`;
    }
    case 'invalid_key':
      return 'carries a key the schema refuses';
    case 'invalid_element':
      return 'carries an element the schema refuses';
    case 'custom':
      return 'does not satisfy a rule the schema adds';
    default:
      return `does not satisfy the schema (${code})`;
  }
}

/**
 * One issue as the sentence an operator reads.
 *
 * @param issue - The issue to describe.
 * @returns Where the fault is and what the schema wanted.
 */
function describeIssue(issue: ZodIssue): string {
  return `${describeLocation(issue.path)} ${describeRule(issue)}.`;
}

/**
 * Read the editor's text as a value.
 *
 * Answers a result rather than throwing, because unparseable text is
 * the state a JSON editor spends most of its time in — an operator
 * typing an object is between two valid payloads on nearly every
 * keystroke, and a throw would make the caller wrap every render.
 *
 * The refusal names no position and quotes no source. The header
 * measures why: both engines put the two in one string, so there is
 * nothing to surface that does not carry the payload with it.
 *
 * A `__proto__` key resolves to nothing, at every depth. See the
 * header for what it would otherwise reach.
 *
 * @param text - The editor's contents, exactly as typed.
 * @returns The value, or the sentences explaining the refusal.
 */
export function parseJsonDraft(text: string): JsonDraftParse {
  if (text.trim() === '') {
    return { ok: false, sentences: ['The editor is empty.'] };
  }

  try {
    const value: unknown = JSON.parse(text, dropProtoKey);

    return { ok: true, value };
  } catch {
    // The engine's own message is deliberately unread rather than
    // swallowed: it is the leak the header measures, and the refusal
    // it would decorate is already reported.
    return { ok: false, sentences: ['The text is not valid JSON.'] };
  }
}

/**
 * Write a value back as the text the editor shows.
 *
 * Keys are sorted at every depth, so two payloads that differ only in
 * the order their keys arrived in format to the same string. That is
 * what makes a round trip deterministic: an editor re-rendering after
 * a save must not report a diff nobody made, and the fixture rows
 * this app edits carry no key order worth preserving.
 *
 * Array order is left exactly as it stands — an array's order is its
 * data rather than a key order to normalise.
 *
 * The empty string is the answer for a value JSON cannot represent at
 * the top level, which {@link parseJsonDraft} then refuses as an
 * empty editor. That is the honest round trip for it; inventing
 * `null` would put a payload in front of an operator that nothing
 * produced.
 *
 * @param value - A JSON-shaped value: what a parse answered, or a row
 * from `../data/`, whose types redeclare columns rather than objects
 * and so carry no cycle to fall into.
 * @returns The indented text, with every object's keys in order.
 */
export function formatJsonDraft(value: unknown): string {
  return JSON.stringify(value, sortKeys, FORMAT_INDENT) ?? '';
}

/**
 * Turn a schema refusal into one sentence per issue.
 *
 * The order is the order zod reported them in, which is the schema's
 * own walk, so two refusals of the same payload read the same way
 * twice.
 *
 * Every sentence names the path and the rule and quotes nothing from
 * the payload. The header states the design and measures the two
 * messages it rules out; `./jsonDraft.test.ts` re-reads the output
 * with a second reader to prove it holds.
 *
 * @param error - What a schema's `safeParse` refused with.
 * @returns One sentence per issue; `[]` for an error carrying none.
 */
export function describeSchemaIssues(error: ZodError): string[] {
  return error.issues.map(describeIssue);
}
