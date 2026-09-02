import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  describeSchemaIssues,
  formatJsonDraft,
  parseJsonDraft,
} from './jsonDraft';

/**
 * The shortest a planted token may be for the reader below to be
 * worth believing.
 *
 * A one- or two-character needle collides with the schema vocabulary
 * a sentence is legitimately built from, so a sweep using one reports
 * a leak that is really the word `at`.
 */
const MIN_NEEDLE_LENGTH = 6;

/**
 * A schema wrong about the hostile payload in as many ways as the
 * sentence vocabulary has branches.
 *
 * `audited` refuses through a callback that puts the value it was
 * handed into its own message. That is deliberate and is the positive
 * control the no-echo sweep rests on: without it the second reader
 * would return nothing over a payload nothing leaked from AND over a
 * payload everything leaked from, and the two would be one result.
 */
const HOSTILE_SCHEMA = z.object({
  audited: z.string().refine(() => false, {
    error: (issue) => `refused ${String(issue.input)}`,
  }),
  code: z.string().regex(/^ar-/),
  either: z.union([z.string(), z.number()]),
  notes: z.string().nullable(),
  pattern: z.string(),
  polarity: z.enum(['positive', 'negative', 'neutral']),
  step: z.number().multipleOf(5),
  terms: z.array(z.object({ label: z.string() })),
  weight: z.number().min(0),
}).strict();

/**
 * A payload whose every LEAF is a token nothing else here can say.
 *
 * Text rather than an object literal because text is what an editor
 * holds, so one constant drives the parse and the schema legs of the
 * sweep and there is no second copy to drift. The keys are ordinary
 * names; only the values are planted, which is the distinction the
 * module draws — a path names a key on purpose.
 */
const HOSTILE_TEXT = [
  '{',
  '  "pattern": 910011,',
  '  "weight": -920022,',
  '  "polarity": "sntnlpolarity",',
  '  "notes": 930033,',
  '  "terms": [{ "label": 940044 }],',
  '  "code": "sntnlcode",',
  '  "step": 950077,',
  '  "either": { "nested": "sntnleither" },',
  '  "audited": "sntnlaudited",',
  '  "sntnlKey": "sntnlextra"',
  '}',
].join('\n');

/**
 * Text that carries the same values and does not parse.
 *
 * The closing brace removed, so the parse leg of the sweep runs over
 * a source holding every planted token.
 */
const HOSTILE_TRUNCATED = HOSTILE_TEXT.slice(0, -1);

/**
 * Unparseable text whose planted token leads it.
 *
 * The engines quote the source from its START, so a token in first
 * position is the one both of them reach — which is what makes the
 * engine-leak control below run the same way under either runner.
 */
const LEADING_TOKEN = 'sntnllead';

/** That token in text no engine will parse. */
const LEADING_TOKEN_TEXT = `${LEADING_TOKEN} oops`;

/**
 * Whether a value behaves like a plain record for the walk below.
 *
 * @param value - Anything at all.
 * @returns Whether it is a non-null, non-array object.
 */
function isRecord(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object'
    && value !== null
    && !Array.isArray(value);
}

/**
 * Every LEAF value one payload carries, as text.
 *
 * Values ONLY. A key is excluded on purpose: the module states that a
 * sentence names the path, and a path segment IS a key, so collecting
 * keys would make the reader report the module's own contract as a
 * leak. What must never appear is what an operator typed as a value.
 *
 * @param value - The payload, or a part of one.
 * @returns Its leaves, in walk order.
 */
function leafValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item: unknown) => leafValues(item));
  }

  if (isRecord(value)) {
    return Object.values(value).flatMap((item) => leafValues(item));
  }

  return [String(value)];
}

/**
 * The planted tokens one piece of output still carries.
 *
 * The SECOND reader the no-echo rule needs: a plain substring scan
 * that shares no code with the sentence builder, so a builder whose
 * every branch had quietly started echoing could not satisfy it. Case
 * folded, because a producer is free to capitalise what it quotes.
 *
 * @param text - One sentence, or any other output.
 * @param needles - The tokens planted in the payload.
 * @returns Those it found; `[]` when the text is clean.
 */
function leaksFrom(text: string, needles: readonly string[]): string[] {
  const haystack = text.toLowerCase();

  return needles.filter((needle) => haystack.includes(needle.toLowerCase()));
}

/**
 * The sentences a schema refusal of one payload produces.
 *
 * @param schema - The schema to run.
 * @param payload - What to run it over.
 * @returns The sentences.
 * @throws If the schema ACCEPTED the payload, which would make every
 * assertion below pass over an empty list.
 */
function refusalSentences(
  schema: z.ZodType,
  payload: unknown,
): string[] {
  const result = schema.safeParse(payload);

  if (result.success) {
    throw new Error('The schema accepted a payload it should refuse.');
  }

  return describeSchemaIssues(result.error);
}

/**
 * The value the hostile text parses to, for the legs that need it.
 *
 * @returns The payload.
 * @throws If the text stopped parsing, which would leave the schema
 * legs running over nothing.
 */
function hostilePayload(): unknown {
  const parsed = parseJsonDraft(HOSTILE_TEXT);

  if (!parsed.ok) {
    throw new Error('The hostile payload should parse.');
  }

  return parsed.value;
}

describe('parseJsonDraft', () => {
  it('refuses an editor holding nothing but whitespace', () => {
    // An empty editor is not a broken payload and must not be
    // reported as one: there is nothing for the operator to correct,
    // only something for them to type.
    // Arrange / Act
    const blank = parseJsonDraft('');
    const spaces = parseJsonDraft('  \n\t ');

    // Assert
    expect(blank).toEqual({
      ok: false,
      sentences: ['The editor is empty.'],
    });
    expect(spaces).toEqual(blank);
  });

  it('refuses text that is not JSON without quoting any of it', () => {
    // Two claims in one case because they are one measurement: the
    // engine's own message DOES carry the source, and the sentence
    // this module answers instead does not.
    //
    // The control is the raw `SyntaxError`. V8 answers `Unexpected
    // token 's', "sntnllead oops" is not valid JSON` and
    // JavaScriptCore answers `JSON Parse error: Unexpected identifier
    // "sntnllead"`; both quote a token in first position, which is
    // why the fixture puts one there. A red here means an engine
    // stopped quoting the source — good news, recorded in the one
    // case that would notice.
    // Arrange
    let engineMessage = '';

    try {
      JSON.parse(LEADING_TOKEN_TEXT);
    } catch (error) {
      engineMessage = error instanceof Error
        ? error.message
        : '';
    }

    // Act
    const refused = parseJsonDraft(LEADING_TOKEN_TEXT);

    // Assert
    expect(engineMessage).toContain(LEADING_TOKEN);
    expect(refused).toEqual({
      ok: false,
      sentences: ['The text is not valid JSON.'],
    });
  });

  it('resolves a __proto__ key to nothing, at every depth', () => {
    // The key `JSON.parse` hands back as an ordinary own property and
    // that `Object.assign` later writes through the prototype setter.
    // Dropping it here is what keeps a payload an operator pasted
    // from replacing a prototype in a module that never saw it.
    //
    // The ordinary keys beside it are the control: a walk that had
    // stopped answering anything would satisfy the absences alone.
    // Arrange
    const text = '{"__proto__":{"x":1},"a":2,"n":{"__proto__":3,"b":4}}';

    // Act
    const parsed = parseJsonDraft(text);

    // Assert
    expect(parsed.ok).toBe(true);

    if (!parsed.ok) {
      return;
    }

    const value = parsed.value as Record<string, unknown>;

    expect(Object.keys(value)).toEqual(['a', 'n']);
    expect(Object.hasOwn(value, '__proto__')).toBe(false);
    expect(Object.getPrototypeOf(value)).toBe(Object.prototype);
    expect(value.a).toBe(2);
    expect(Object.keys(value.n as object)).toEqual(['b']);
    expect(formatJsonDraft(value)).not.toContain('__proto__');
  });

  it('answers the payload for text that parses', () => {
    // The accepting case, over the three shapes a payload's top level
    // can take. `null` and `0` are here because the result is
    // discriminated rather than nullable precisely so that they are
    // payloads rather than refusals.
    // Arrange / Act / Assert
    expect(parseJsonDraft('{"a":[1,{"b":null}]}')).toEqual({
      ok: true,
      value: { a: [1, { b: null }] },
    });
    expect(parseJsonDraft('null')).toEqual({ ok: true, value: null });
    expect(parseJsonDraft('0')).toEqual({ ok: true, value: 0 });
  });
});

describe('formatJsonDraft', () => {
  it('formats two key orders of one payload to the same text', () => {
    // The determinism a round trip rests on. An editor re-rendering
    // after a save must not report a difference nobody made, and key
    // order is the difference a fixture row and a re-parsed payload
    // most easily disagree about.
    //
    // The control is in the same case: a payload differing in a VALUE
    // must NOT format the same, or a formatter that answered one
    // constant would pass the equality above it.
    // Arrange
    const first = '{"b":1,"a":{"z":true,"y":"held"}}';
    const second = '{"a":{"y":"held","z":true},"b":1}';
    const moved = '{"a":{"y":"other","z":true},"b":1}';

    // Act
    const one = formatJsonDraft(JSON.parse(first));
    const two = formatJsonDraft(JSON.parse(second));

    // Assert
    expect(first).not.toBe(second);
    expect(one).toBe(two);
    expect(formatJsonDraft(JSON.parse(moved))).not.toBe(one);
  });

  it('sorts every depth and leaves array order alone', () => {
    // An object's key order carries nothing; an array's order IS its
    // data. Sorting the second would rewrite a term list the operator
    // arranged, so the two are asserted together.
    // Arrange
    const payload = { b: 1, a: { d: [3, 1, 2], c: 2 } };

    // Act
    const text = formatJsonDraft(payload);

    // Assert
    expect(text.indexOf('"a"')).toBeLessThan(text.indexOf('"b"'));
    expect(text.indexOf('"c"')).toBeLessThan(text.indexOf('"d"'));
    expect(JSON.parse(text)).toEqual(payload);
    expect(text).toContain('[\n      3,\n      1,\n      2\n    ]');
  });

  it('round trips a parsed payload back to the same text', () => {
    // Format, parse, format: the second text must equal the first, or
    // an editor that re-reads what it just wrote drifts a keystroke
    // at a time.
    // Arrange
    const once = formatJsonDraft(hostilePayload());

    // Act
    const reread = parseJsonDraft(once);

    // Assert
    expect(reread.ok).toBe(true);

    if (!reread.ok) {
      return;
    }

    expect(formatJsonDraft(reread.value)).toBe(once);
  });

  it('answers the empty string for a value JSON cannot hold', () => {
    // `JSON.stringify` answers `undefined` at the top level for the
    // values JSON has no spelling for. The empty string is what
    // `parseJsonDraft` then refuses as an empty editor, which is the
    // honest round trip; answering `null` would put a payload in
    // front of an operator that nothing produced.
    // Arrange / Act / Assert
    expect(formatJsonDraft(undefined)).toBe('');
    expect(parseJsonDraft(formatJsonDraft(undefined)).ok).toBe(false);
  });
});

describe('describeSchemaIssues', () => {
  it('answers one sentence per issue, naming the path and the rule', () => {
    // Valid JSON the schema refuses: the state the editor is in
    // whenever a payload is well-formed and wrong. Every sentence
    // names WHERE and WHAT, which is the difference between a banner
    // an operator can act on and one that only says no.
    // Arrange
    const payload = hostilePayload();

    // Act
    const sentences = refusalSentences(HOSTILE_SCHEMA, payload);
    const issues = HOSTILE_SCHEMA.safeParse(payload);

    // Assert
    expect(issues.success).toBe(false);

    if (issues.success) {
      return;
    }

    expect(sentences).toHaveLength(issues.error.issues.length);
    expect(sentences).toContain('The value at pattern must be a string.');
    expect(sentences).toContain('The value at weight must be at least 0.');
    expect(sentences).toContain(
      'The value at polarity must be one of '
      + '"positive", "negative", "neutral".',
    );
    expect(sentences).toContain(
      'The value at terms[0].label must be a string.',
    );
    expect(sentences).toContain('The value at step must be a multiple of 5.');
    expect(sentences).toContain(
      'The value at code must match the pattern the schema declares.',
    );
    expect(sentences).toContain(
      'The value at either matches none of the 2 shapes the schema allows.',
    );
    expect(sentences).toContain(
      'The value at audited does not satisfy a rule the schema adds.',
    );
    expect(sentences).toContain(
      'The payload carries 1 key the schema does not declare.',
    );
  });

  it('counts unrecognised keys rather than naming them', () => {
    // A key an operator typed is as much their payload as a value is,
    // so the one input-derived member any branch touches is counted.
    // zod's own message for the same issue is the control: it spells
    // both names, and this one spells neither.
    // Arrange
    const schema = z.object({ kept: z.string() }).strict();
    const payload = { kept: 'ok', sntnlone: 1, sntnltwo: 2 };

    // Act
    const sentences = refusalSentences(schema, payload);

    // Assert
    expect(sentences).toEqual([
      'The payload carries 2 keys the schema does not declare.',
    ]);
    expect(leaksFrom(sentences.join(' '), ['sntnlone', 'sntnltwo']))
      .toEqual([]);
  });

  it('names a record key in the path, which is the one exception', () => {
    // The documented exception, pinned rather than left implied. For
    // an object or an array a path segment is schema-declared; for a
    // record the key IS the location, so a schema of that shape over
    // operator-supplied names does put one in a sentence. The VALUE
    // beside it still does not, which is the half that must hold.
    // Arrange
    const schema = z.record(z.string(), z.number());
    const payload = { sntnlrecordkey: 'sntnlrecordvalue' };

    // Act
    const sentences = refusalSentences(schema, payload);

    // Assert
    expect(sentences).toEqual([
      'The value at sntnlrecordkey must be a number.',
    ]);
    expect(sentences[0]).not.toContain('sntnlrecordvalue');
  });

  it('answers an array the caller owns outright', () => {
    // The array stance this module is in, asserted rather than only
    // documented: built fresh per call, owned by nobody, so a caller
    // sorting or pushing into one cannot reach the next reader.
    // Arrange
    const schema = z.object({ kept: z.string() });
    const sentences = refusalSentences(schema, {});

    // Act
    sentences.push('planted');

    // Assert
    expect(sentences).toHaveLength(2);
    expect(refusalSentences(schema, {})).toHaveLength(1);
  });
});

describe('the no-echo rule', () => {
  it('leaves no payload value in any sentence any producer emits', () => {
    // The whole rule, re-read from the OUTPUT by a reader that shares
    // no code with the builder. A builder reporting its own success
    // cannot see its own branch fail, so `leaksFrom` scans the text
    // that actually came out, for tokens taken from the payload
    // rather than retyped here.
    //
    // `formatJsonDraft` is deliberately outside the sweep: rendering
    // the payload is its entire job.
    //
    // Arrange
    const needles = leafValues(hostilePayload());
    const truncated = parseJsonDraft(HOSTILE_TRUNCATED);
    const leading = parseJsonDraft(LEADING_TOKEN_TEXT);

    // Every sentence every producer emits over the hostile payload.
    const emitted = [
      ...refusalSentences(HOSTILE_SCHEMA, hostilePayload()),
      ...truncated.ok
        ? []
        : truncated.sentences,
      ...leading.ok
        ? []
        : leading.sentences,
    ];

    // The reader is only worth believing over needles that cannot
    // collide with the schema vocabulary a sentence is built from,
    // and over a sweep that had something to read.
    // Assert
    expect(needles).toHaveLength(10);
    expect(new Set(needles).size).toBe(needles.length);
    needles.forEach((needle) => {
      expect(needle.length).toBeGreaterThanOrEqual(MIN_NEEDLE_LENGTH);
    });
    expect(emitted.length).toBeGreaterThanOrEqual(11);

    // Act
    const leaked = emitted.flatMap((sentence) => (
      leaksFrom(sentence, [...needles, LEADING_TOKEN])
    ));

    // Assert
    expect(leaked).toEqual([]);
  });

  it('finds the leak that the same reader is pointed at', () => {
    // The positive control, and the case that makes the sweep above a
    // measurement. `leaksFrom` returning `[]` over clean sentences is
    // the same answer it would return with a broken needle set or a
    // scan that read nothing — so the identical reader, over the same
    // needles, is pointed at messages that DO carry the payload.
    //
    // zod's own text is the subject: the schema's `audited` callback
    // puts the value it refused into its message, which is exactly
    // the channel the module refuses to read.
    // Arrange
    const needles = leafValues(hostilePayload());
    const refused = HOSTILE_SCHEMA.safeParse(hostilePayload());

    // Assert
    expect(refused.success).toBe(false);

    if (refused.success) {
      return;
    }

    // Act
    const zodText = refused.error.issues.map((issue) => issue.message);
    const found = zodText.flatMap((text) => leaksFrom(text, needles));

    // Assert
    expect(found).toContain('sntnlaudited');
  });
});
