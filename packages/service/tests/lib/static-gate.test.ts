/**
 * Cases for `src/lib/static-gate.ts`: every entry a term set can
 * carry that cannot be used, then every input the gate cannot
 * score, and only then a document it can.
 *
 * That order is the file's argument rather than its layout. The
 * module exists to make a free decision before an expensive one,
 * and the readings that matter most are the ones where it decides
 * NOT to spend — a row that will not compile, a chunk that was
 * never built, a document in a language the terms cannot read. A
 * suite opening with a well-formed document and a well-formed term
 * set would pass over all of them, because that pair is the input
 * every version of this library handles.
 *
 * ## Two closed rosters, declared here and never read off the module
 *
 * The three WARNING sentences and the two parked GATE REASONS are
 * written out below and held set-equal against what the cases
 * produce, in both directions: a registered sentence nothing
 * reaches fails naming itself, and a sentence no entry registered
 * fails as unregistered. A suite reading them off the module would
 * agree with any edit to them, which is the one thing an operator
 * grouping a review queue by that column cannot afford.
 *
 * Both rosters carry PREFIXES rather than whole sentences, because
 * every one of them ends in a value the case supplied.
 *
 * ## Characterization, and where it starts
 *
 * The term set is an argument to this port and a parsed lexicon
 * file in the original, and the language detector is an injected
 * parameter where the original reached for a sibling module. So
 * everything about {@link applyStaticGate} here is
 * CHARACTERIZATION: no original exists that takes either, and these
 * cases are the whole record of what it does.
 *
 * {@link scoreText} and {@link explainGate} ARE compared against
 * the original, in `tests/parity/static-gate.parity.test.ts`. What
 * this file adds for them is the half a comparison cannot have —
 * the exports the original never had, each driven on its own, so a
 * pair of errors cancelling between two of them has somewhere to
 * show up.
 *
 * ## The term sets belong to this file
 *
 * They are shaped to cover the spread the parameterization has to
 * survive rather than to describe anything: both scoring
 * polarities, the third polarity that scores nothing, a weight
 * written negative, a weight that arrived as text, a pattern that
 * will not compile, and a pattern whose punctuation is punctuation
 * rather than syntax. A term set where every entry looked alike
 * would pass for an implementation that read none of those members.
 *
 * No word in this file is a term any domain would actually use.
 * That is the point of the port: the mechanism is here and the
 * vocabulary is rows in a table.
 */
import type {
  GateChunk,
  GateOptions,
  GateTerm,
} from '../../src/lib/static-gate.js';

import { describe, expect, it } from 'vitest';

import { TERM_POLARITIES } from '../../src/db/schema/values.js';
import {
  DEFAULT_THRESHOLD,
  GATE_DECISION_IGNORE,
  GATE_DECISION_PENDING,
  GATE_DECISION_REVIEW,
  GATE_POLARITIES,
  MAX_REASON_HITS,
  applyStaticGate,
  asList,
  compileGatePattern,
  coversLanguage,
  detectGateLanguage,
  escapeGateTerm,
  explainGate,
  scoreText,
  termWeight,
} from '../../src/lib/static-gate.js';

// ---------------------------------------------------------------------------
// The term sets every case is driven over
// ---------------------------------------------------------------------------

/**
 * One term, spelled out.
 *
 * A helper rather than a literal per entry so a table below reads
 * as three columns, which is what a `terms` row is.
 *
 * @param pattern - What to look for.
 * @param weight - What a match is worth.
 * @param polarity - Which way it points.
 * @returns The term.
 */
function term(
  pattern: string,
  weight: number,
  polarity: GateTerm['polarity'],
): GateTerm {
  return { pattern, weight, polarity };
}

/** A term set whose every entry is usable, covering both signs. */
const USABLE_TERMS: readonly GateTerm[] = [
  term('alpha', 3, 'positive'),
  term('bravo charlie', 2, 'positive'),
  term('delta', -4, 'positive'),
  term('echo|foxtrot', 5, 'negative'),
  term('golf', 1, 'negative'),
  term('hotel', 9, 'ignore'),
];

/** A term set carrying one entry of every kind that cannot be used. */
const UNUSABLE_TERMS: readonly GateTerm[] = [
  term('alpha', 3, 'positive'),
  term('(', 4, 'negative'),
  { pattern: 'india', weight: 2, polarity: 'sideways' } as unknown as GateTerm,
];

/** A chunk the gate can score, as a caller hands one over. */
const USABLE_CHUNK: GateChunk = {
  usable: true,
  chunk: 'alpha and golf appear here',
  reason: '',
};

/** A record waiting to be gated, as one arrives from a query. */
function pendingRecord(): Record<string, unknown> {
  return { id: 41, title: 'a record', gate_decision: GATE_DECISION_PENDING };
}

// ---------------------------------------------------------------------------
// The warning roster, and the entries that reach it
// ---------------------------------------------------------------------------

/** One thing a term set can carry that cannot be scored. */
interface WarningEntry {
  /** How a case points at it. */
  readonly id: string;

  /** What every sentence of this kind opens with. */
  readonly prefix: string;

  /**
   * Whether any term set can make the scoring pass emit it.
   *
   * One of the three cannot be reached at all, and saying so here
   * is what turns an unreachable sentence from a gap in this suite
   * into a claim it holds: the unreachable member is asserted
   * ABSENT from everything the cases produce, not merely left out.
   */
  readonly reachable: boolean;
}

/**
 * Every warning the scoring pass can emit.
 *
 * Two of the three are the original's and are compared against it
 * by the parity suite. The third has no counterpart there at all:
 * the original had two lists and therefore no polarity to get
 * wrong, and a row whose polarity is outside the column's domain is
 * a fault only a table can produce.
 */
const WARNING_ENTRIES: readonly WarningEntry[] = [
  {
    id: 'positive',
    prefix: 'positive term did not compile: ',
    reachable: false,
  },
  {
    id: 'negative',
    prefix: 'negative pattern did not compile: ',
    reachable: true,
  },
  {
    id: 'polarity',
    prefix: 'term carries an unusable polarity: ',
    reachable: true,
  },
];

/** One term set that produces a warning, and which one. */
interface WarningCase {
  /** Stable label a failure prints. */
  readonly id: string;

  /** The entry in {@link WARNING_ENTRIES} it reaches. */
  readonly warning: string;

  /** The whole sentence, value and all. */
  readonly sentence: string;

  /** The term set, built fresh so no case shares a list. */
  readonly build: () => readonly GateTerm[];
}

/**
 * One case per reachable warning, each carrying the entry that
 * produces it and nothing else that could.
 */
const WARNING_CASES: readonly WarningCase[] = [
  {
    id: 'negative/dangling-group',
    warning: 'negative',
    sentence: 'negative pattern did not compile: (',
    build: () => [term('(', 4, 'negative')],
  },
  {
    id: 'negative/dangling-quantifier',
    warning: 'negative',
    sentence: 'negative pattern did not compile: *',
    build: () => [term('*', 1, 'negative')],
  },
  {
    id: 'polarity/outside-the-column',
    warning: 'polarity',
    sentence: 'term carries an unusable polarity: sideways',
    build: () => [
      { pattern: 'india', weight: 2, polarity: 'sideways' } as unknown as GateTerm,
    ],
  },
  {
    id: 'polarity/absent',
    warning: 'polarity',
    sentence: 'term carries an unusable polarity: ',
    build: () => [{ pattern: 'india', weight: 2 } as unknown as GateTerm],
  },
];

/** The text every warning case is driven over. */
const WARNING_TEXT = 'india golf alpha';

/**
 * Every sentence the cases and the two shipped term sets produce.
 *
 * @returns One entry per warning, across every term set this file
 *   drives.
 */
function everyWarning(): readonly string[] {
  return [
    ...WARNING_CASES.map((entry) => entry.build()),
    USABLE_TERMS,
    UNUSABLE_TERMS,
    [term('a.b', 1, 'positive'), term('c++', 2, 'positive')],
  ].flatMap((terms) => scoreText(WARNING_TEXT, terms).warnings);
}

describe('scoreText — the entries a term set carries that cannot be used', () => {
  it('warns with the sentence each case names, and scores nothing', () => {
    const answered = WARNING_CASES.map((entry) => {
      const result = scoreText(WARNING_TEXT, entry.build());

      return { id: entry.id, warnings: result.warnings, hits: result.hits };
    });

    expect(answered).toEqual(WARNING_CASES.map((entry) => ({
      id: entry.id,
      warnings: [entry.sentence],
      hits: [],
    })));
  });

  // The first direction. A sentence a case produced that no entry
  // registers means the module has grown a warning nothing here
  // knows about.
  it('produces no sentence the roster does not register', () => {
    const unregistered = everyWarning().filter(
      (sentence) => !WARNING_ENTRIES.some(
        (warning) => sentence.startsWith(warning.prefix),
      ),
    );

    expect(unregistered).toEqual([]);
  });

  // The other direction, and the one that catches a sentence going
  // quietly unreachable.
  it('reaches every sentence the roster registers as reachable', () => {
    const produced = everyWarning();
    const unreached = WARNING_ENTRIES
      .filter((warning) => warning.reachable)
      .filter((warning) => !produced.some(
        (sentence) => sentence.startsWith(warning.prefix),
      ))
      .map((warning) => warning.id);

    expect(unreached).toEqual([]);
  });

  // And the claim the third entry makes. Its absence is asserted
  // rather than assumed, so the day escaping stops preceding
  // compilation this fails instead of the roster quietly gaining a
  // reachable member nothing points at.
  it('reaches no sentence the roster registers as unreachable', () => {
    const produced = everyWarning();
    const reached = WARNING_ENTRIES
      .filter((warning) => !warning.reachable)
      .filter((warning) => produced.some(
        (sentence) => sentence.startsWith(warning.prefix),
      ))
      .map((warning) => warning.id);

    expect(reached).toEqual([]);
  });

  // The registration itself, held both ways: a case pointing at an
  // id no entry declares, and a reachable entry no case points at.
  // Without this the guards above pass for a table whose ids
  // drifted.
  it('registers every case against an entry, and every entry once', () => {
    const declared = WARNING_ENTRIES.map((warning) => warning.id);
    const reachable = WARNING_ENTRIES
      .filter((warning) => warning.reachable)
      .map((warning) => warning.id);
    const pointed = WARNING_CASES.map((entry) => entry.warning);

    expect(pointed.filter((id) => !declared.includes(id))).toEqual([]);
    expect(reachable.filter((id) => !pointed.includes(id))).toEqual([]);
  });

  // A term set that cannot be used entirely is still a term set:
  // every other entry scores, which is what makes one bad row an
  // operator's problem rather than an outage.
  it('goes on scoring past an entry it could not use', () => {
    const result = scoreText('alpha and india', UNUSABLE_TERMS);

    expect(result.hits.map((hit) => hit.pattern)).toEqual(['alpha']);
    expect(result.warnings.length).toBe(2);
    expect(result.score).toBe(3);
  });

  // The one warning the pass cannot produce, and why. A positive
  // term is escaped before it is compiled, so the compile cannot
  // fail: over 1482 one- and two-character terms drawn from every
  // metacharacter and a spread of ordinary ones, no escaped term
  // was refused and 295 of the same terms were refused unescaped.
  // The sentence survives the port because the compile helper is
  // exported and a caller composing it directly can hand it
  // anything at all.
  it('cannot refuse a positive term, because escaping precedes it', () => {
    const metacharacters = [...'.*+?^${}()|[]\\'];
    const escaped = metacharacters
      .map((char) => compileGatePattern(escapeGateTerm(char)));
    const raw = metacharacters.map((char) => compileGatePattern(char));

    expect(escaped.filter((compiled) => compiled === null)).toEqual([]);
    expect(raw.filter((compiled) => compiled === null).length).toBeGreaterThan(0);
  });

  // The third polarity, which is a statement rather than a fault:
  // it produces no hit, no warning and no contribution, and it is
  // the one member of the column's domain the original had no list
  // for.
  it('skips an ignore term in silence', () => {
    const result = scoreText('hotel', [term('hotel', 9, 'ignore')]);

    expect(result).toEqual({
      score: 0,
      threshold: DEFAULT_THRESHOLD,
      hits: [],
      decision: 'ignore',
      warnings: [],
    });
  });

  // An entry with nothing to look for is skipped in silence too,
  // and for a different reason: there is nothing to report about a
  // row that says nothing, and an empty pattern anchored would
  // match every document.
  it('skips an entry with an empty pattern in silence', () => {
    const result = scoreText('alpha', [
      term('', 5, 'positive'),
      { pattern: '', weight: 5, polarity: 'nonsense' } as unknown as GateTerm,
    ]);

    expect(result.warnings).toEqual([]);
    expect(result.hits).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The parked reasons, and the inputs that reach them
// ---------------------------------------------------------------------------

/** One reason the gate parks a record without scoring it. */
interface ParkedEntry {
  /** How a case points at it. */
  readonly id: string;

  /** What every reason of this kind opens with. */
  readonly prefix: string;
}

/**
 * Every reason the gate answers with a NULL score.
 *
 * Two, and they are the two halves of the same rule: a score is a
 * measurement, so a document nobody could read gets no number
 * rather than a confident 0. The first covers a chunk that was
 * never built or was refused; the second a chunk that was built and
 * cannot be scored against these terms.
 */
const PARKED_ENTRIES: readonly ParkedEntry[] = [
  { id: 'no-chunk', prefix: 'no chunk to gate (' },
  { id: 'unreadable', prefix: 'chunk detected as ' },
];

/** One input the gate parks, and the reason it names. */
interface ParkedCase {
  /** Stable label a failure prints. */
  readonly id: string;

  /** The entry in {@link PARKED_ENTRIES} it reaches. */
  readonly parked: string;

  /** The whole reason, value and all. */
  readonly reason: string;

  /** The chunk, if any, as the caller would hand it over. */
  readonly chunk: GateChunk | null | undefined;

  /** What the caller states beside the term set. */
  readonly options: GateOptions;
}

/** A detector that answers one tag whatever it is given. */
function detectorFor(lang: string): (text: string) => { lang: string } {
  return function detect(text: string): { lang: string } {
    return { lang: text === ''
      ? ''
      : lang };
  };
}

/**
 * One case per shape that produces a parked record.
 *
 * Four of the five reach the same entry, deliberately: an absent
 * chunk, a chunk that is not there at all, a refused chunk carrying
 * its own reason and a refused chunk carrying none are four
 * different ways for the same thing to have happened, and the
 * quoted tail is what separates them in a queue.
 */
const PARKED_CASES: readonly ParkedCase[] = [
  {
    id: 'chunk/null',
    parked: 'no-chunk',
    reason: 'no chunk to gate (no chunk was built)',
    chunk: null,
    options: {},
  },
  {
    id: 'chunk/absent',
    parked: 'no-chunk',
    reason: 'no chunk to gate (no chunk was built)',
    chunk: undefined,
    options: {},
  },
  {
    id: 'chunk/refused-with-a-reason',
    parked: 'no-chunk',
    reason: 'no chunk to gate (prose too short to be meaningful)',
    chunk: { usable: false, reason: 'prose too short to be meaningful' },
    options: {},
  },
  {
    id: 'chunk/refused-without-one',
    parked: 'no-chunk',
    reason: 'no chunk to gate (no chunk was built)',
    chunk: { usable: false },
    options: {},
  },
  {
    id: 'language/not-covered',
    parked: 'unreadable',
    reason: 'chunk detected as quebec, which the term set does not '
      + 'cover -- not scorable',
    chunk: USABLE_CHUNK,
    options: { languages: ['romeo'], detectLanguage: detectorFor('quebec') },
  },
];

describe('applyStaticGate — every input it cannot score', () => {
  // The whole rule in one assertion: a parked record carries a NULL
  // score, never a 0. A measured zero and an unmeasured quantity are
  // different answers, and a scoring layer that renormalizes across
  // documents is where the difference is spent.
  it('parks with a null score and the reason its case names', () => {
    const answered = PARKED_CASES.map((entry) => {
      const row = applyStaticGate(
        pendingRecord(),
        entry.chunk,
        USABLE_TERMS,
        entry.options,
      );

      return {
        id: entry.id,
        score: row['gate_score'],
        decision: row['gate_decision'],
        reason: row['gate_reason'],
      };
    });

    expect(answered).toEqual(PARKED_CASES.map((entry) => ({
      id: entry.id,
      score: null,
      decision: GATE_DECISION_REVIEW,
      reason: entry.reason,
    })));
  });

  it('produces no reason the roster does not register', () => {
    const unregistered = PARKED_CASES
      .map((entry) => applyStaticGate(
        pendingRecord(),
        entry.chunk,
        USABLE_TERMS,
        entry.options,
      ))
      .map((row) => String(row['gate_reason']))
      .filter((reason) => !PARKED_ENTRIES.some(
        (parked) => reason.startsWith(parked.prefix),
      ));

    expect(unregistered).toEqual([]);
  });

  it('reaches every reason the roster registers', () => {
    const produced = PARKED_CASES.map((entry) => String(applyStaticGate(
      pendingRecord(),
      entry.chunk,
      USABLE_TERMS,
      entry.options,
    )['gate_reason']));
    const unreached = PARKED_ENTRIES
      .filter((parked) => !produced.some(
        (reason) => reason.startsWith(parked.prefix),
      ))
      .map((parked) => parked.id);

    expect(unreached).toEqual([]);
  });

  it('registers every case against an entry, and every entry once', () => {
    const declared = PARKED_ENTRIES.map((parked) => parked.id);
    const pointed = PARKED_CASES.map((entry) => entry.parked);

    expect(pointed.filter((id) => !declared.includes(id))).toEqual([]);
    expect(declared.filter((id) => !pointed.includes(id))).toEqual([]);
  });

  // The order between the two, which no single case can see. This
  // input is parked twice over — there is no chunk AND the detector
  // would answer a language nothing covers — and the missing chunk
  // is what it has to report, because there is nothing to detect a
  // language in.
  it('reports the missing chunk before it asks about a language', () => {
    const row = applyStaticGate(pendingRecord(), null, USABLE_TERMS, {
      languages: ['romeo'],
      detectLanguage: detectorFor('quebec'),
    });

    expect(row['gate_reason']).toBe('no chunk to gate (no chunk was built)');
  });

  // Self-clearing, which is the property that makes the language
  // branch a stopgap rather than a wall: the same document, the
  // same detector and one more covered tag is scored normally.
  it('scores the same document once its language is covered', () => {
    const options = {
      languages: ['romeo', 'quebec'],
      detectLanguage: detectorFor('quebec'),
    };
    const row = applyStaticGate(
      pendingRecord(),
      USABLE_CHUNK,
      USABLE_TERMS,
      options,
    );

    expect(row['gate_score']).toBe(2);
    expect(String(row['gate_reason'])).toContain('static gate: score 2');
  });

  // A broken detector is not an unreadable document. It has said
  // nothing, which is the absent-detector reading, and the
  // alternative would park every document rather than the ones a
  // term set cannot read.
  it('scores normally when a detector answers nothing usable', () => {
    const detectors = [
      () => {
        throw new Error('detector failed');
      },
      () => null,
      () => 5,
      () => ({ lang: 5 }),
      () => ({ lang: '' }),
      () => ({}),
    ];
    const scored = detectors.map((detectLanguage) => applyStaticGate(
      pendingRecord(),
      USABLE_CHUNK,
      USABLE_TERMS,
      { languages: [], detectLanguage: detectLanguage as (t: string) => unknown },
    )['gate_score']);

    expect(scored).toEqual(detectors.map(() => 2));
  });
});

// ---------------------------------------------------------------------------
// The document it can score
// ---------------------------------------------------------------------------

describe('applyStaticGate — the document it scores', () => {
  // The score is recorded whichever way the decision went, which is
  // the only thing that makes the threshold tunable against real
  // numbers rather than taste.
  it('records the score on both sides of the threshold', () => {
    const decisions = [1, 2, 3].map((threshold) => applyStaticGate(
      pendingRecord(),
      USABLE_CHUNK,
      USABLE_TERMS,
      { threshold },
    ));

    expect(decisions.map((row) => row['gate_score'])).toEqual([2, 2, 2]);
    expect(decisions.map((row) => row['gate_decision'])).toEqual([
      GATE_DECISION_REVIEW,
      GATE_DECISION_REVIEW,
      GATE_DECISION_IGNORE,
    ]);
  });

  // A passing document is parked, not sent. What a passing document
  // is worth spending on belongs to the phase that wires this gate
  // into a workflow, and dropping it in the meantime would lose
  // exactly what the gate exists to find.
  it('parks a passing document rather than routing it onward', () => {
    const row = applyStaticGate(pendingRecord(), USABLE_CHUNK, USABLE_TERMS, {
      threshold: 0,
    });

    expect(row['gate_decision']).toBe(GATE_DECISION_REVIEW);
  });

  // The explanation quotes the operator's own patterns and the
  // arithmetic. Nothing from the document reaches it, which is why
  // a column written for every row is not a place untrusted text
  // lands.
  it('explains the decision without quoting the document', () => {
    const chunk: GateChunk = {
      usable: true,
      chunk: 'alpha appears beside a sentence nobody wrote a term for',
    };
    const reason = String(applyStaticGate(
      pendingRecord(),
      chunk,
      USABLE_TERMS,
      { threshold: 1 },
    )['gate_reason']);

    expect(reason).toBe('static gate: score 3 vs threshold 1 (alpha +3)');
    expect(reason).not.toContain('sentence');
  });

  // The chunk is what is scored, and the detector sees the same
  // text. A recording detector is the only way to say so: every
  // other reading is satisfied by a gate that detected over
  // something else and scored the right thing anyway.
  it('scores the chunk, and detects over the same text', () => {
    const seen: string[] = [];
    const row = applyStaticGate(pendingRecord(), USABLE_CHUNK, USABLE_TERMS, {
      languages: ['romeo'],
      detectLanguage: (text: string) => {
        seen.push(text);

        return { lang: 'romeo' };
      },
    });

    expect(seen).toEqual(['alpha and golf appear here']);
    expect(row['gate_score']).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// What the gate does to the record it was given
// ---------------------------------------------------------------------------

describe('applyStaticGate — the record, and what it is not allowed to do', () => {
  // The whole of what makes this safe to run over a batch something
  // else has already decided. Identity rather than equality: a copy
  // would be indistinguishable from the original by value and would
  // mean a second pass had rewritten rows it was told to leave.
  it('answers a record it was not asked to gate untouched', () => {
    const decided = { id: 7, gate_decision: GATE_DECISION_IGNORE };

    expect(applyStaticGate(decided, USABLE_CHUNK, USABLE_TERMS)).toBe(decided);
  });

  it('answers an empty record for a value that is not one', () => {
    const answered = [null, undefined, 5, 'text', ['a']].map(
      (value) => applyStaticGate(value, USABLE_CHUNK, USABLE_TERMS),
    );

    expect(answered).toEqual([{}, {}, {}, {}, {}]);
  });

  it('leaves the record it gated exactly as it found it', () => {
    const row = pendingRecord();
    const before = { ...row };

    applyStaticGate(row, USABLE_CHUNK, USABLE_TERMS);

    expect(row).toEqual(before);
  });

  it('carries every other field of the record onto the answer', () => {
    const row = applyStaticGate(pendingRecord(), USABLE_CHUNK, USABLE_TERMS);

    expect(row['id']).toBe(41);
    expect(row['title']).toBe('a record');
  });

  // The divergence the module header argues, pinned. The original
  // copied a row key by key with an assignment, which for this one
  // key reaches the setter on `Object.prototype` — so the value is
  // dropped and the copy's prototype may be replaced instead. A
  // spread defines a real own key. An ordinary key beside it is the
  // control that says the reading discriminates.
  it('carries an own prototype-named key as a key, not a prototype', () => {
    // Every branch that answers a new record copies it, so the
    // reading is taken on all three: the parked pair and the
    // scored one. A case driving only one would pass for a repair
    // applied in one place.
    const chunks: (GateChunk | null)[] = [USABLE_CHUNK, null, USABLE_CHUNK];
    const options: GateOptions[] = [
      {},
      {},
      { languages: ['romeo'], detectLanguage: detectorFor('quebec') },
    ];
    const answered = chunks.map((chunk, index) => {
      const row: Record<string, unknown> = {
        ordinary: 'kept',
        gate_decision: GATE_DECISION_PENDING,
      };

      Object.defineProperty(row, '__proto__', {
        value: 'a stored value',
        enumerable: true,
        writable: true,
        configurable: true,
      });

      return applyStaticGate(row, chunk, USABLE_TERMS, options[index]);
    });

    expect(answered.map((row) => Object.hasOwn(row, '__proto__')))
      .toEqual(chunks.map(() => true));
    expect(answered.map((row) => {
      const carried = Object.getOwnPropertyDescriptor(row, '__proto__');

      return carried === undefined
        ? undefined
        : carried.value;
    })).toEqual(chunks.map(() => 'a stored value'));
    expect(answered.map((row) => Object.getPrototypeOf(row)))
      .toEqual(chunks.map(() => Object.prototype));
    expect(answered.map((row) => row['ordinary']))
      .toEqual(chunks.map(() => 'kept'));

    // The control saying the three answers are the three branches
    // rather than one branch three times.
    expect(answered.map((row) => row['gate_score'])).toEqual([2, null, null]);
  });
});

// ---------------------------------------------------------------------------
// The arithmetic
// ---------------------------------------------------------------------------

describe('scoreText — the sum, and what it is compared against', () => {
  // The whole arithmetic in one reading. A term counts once however
  // often it occurs, which is why a document repeating one word
  // cannot out-score a document that says several different things.
  it('counts a term once however often it occurs', () => {
    const once = scoreText('alpha', [term('alpha', 3, 'positive')]);
    const often = scoreText(
      'alpha alpha alpha alpha',
      [term('alpha', 3, 'positive')],
    );

    expect(once.score).toBe(3);
    expect(often.score).toBe(3);
    expect(often.hits.length).toBe(1);
  });

  // The anchoring, which is the whole safety property: a short
  // pattern matched bare fires inside longer and unrelated words,
  // and that is a false positive invisible in a score.
  it('matches on a word boundary and not inside a longer word', () => {
    const terms = [term('alpha', 3, 'positive')];
    const texts = [
      'alpha', 'ALPHA', 'an alpha here', 'alpha-bravo', 'alpha.', '(alpha)',
      'alphabet', 'xalpha', 'alpha1', '1alpha',
    ];

    expect(texts.map((text) => scoreText(text, terms).score))
      .toEqual([3, 3, 3, 3, 3, 3, 0, 0, 0, 0]);
  });

  // The direction is the polarity's and the sign is not consulted,
  // so a row written negative counts exactly as its positive would.
  // No operator's sign convention can invert this gate.
  it('takes a magnitude, whichever sign the row was written with', () => {
    const written = [4, -4].map((weight) => scoreText(
      'alpha',
      [term('alpha', weight, 'positive')],
    ).score);
    const subtracted = [4, -4].map((weight) => scoreText(
      'golf',
      [term('golf', weight, 'negative')],
    ).score);

    expect(written).toEqual([4, 4]);
    expect(subtracted).toEqual([-4, -4]);
  });

  // Hit ORDER is positives then negatives, whatever order the rows
  // arrived in. It is observable through the explanation, which
  // quotes the first few hits and counts the rest, so a pass in row
  // order would rewrite every explanation the gate has produced.
  it('reports positives before negatives, whatever the row order', () => {
    const interleaved = [
      term('golf', 1, 'negative'),
      term('alpha', 3, 'positive'),
      term('echo|foxtrot', 5, 'negative'),
      term('bravo charlie', 2, 'positive'),
    ];
    const result = scoreText('alpha bravo charlie golf echo', interleaved);

    expect(result.hits.map((hit) => hit.pattern))
      .toEqual(['alpha', 'bravo charlie', 'golf', 'echo|foxtrot']);
    expect(result.hits.map((hit) => hit.polarity))
      .toEqual(['positive', 'positive', 'negative', 'negative']);
  });

  // A zero-weight negative term records a NEGATIVE zero, because
  // the record is built by negating the magnitude. It survives a
  // strict comparison and not a JSON round trip, which is why it is
  // pinned here rather than tidied away.
  it('records a signed zero for a negative term worth nothing', () => {
    const result = scoreText('golf', [term('golf', 0, 'negative')]);
    const weights = result.hits.map((hit) => Object.is(hit.weight, -0));

    expect(weights).toEqual([true]);
    expect(Object.is(result.score, 0)).toBe(true);
  });

  // A weight that arrived as text from a configuration file is
  // read; one that arrived as prose is worth nothing rather than
  // making the whole score unreadable.
  it('reads a weight that arrived as text, and refuses one that did not', () => {
    const weights = ['2.5', '  6  ', '3px', 'prose', ''];
    const scored = weights.map((weight) => scoreText(
      'alpha',
      [{ pattern: 'alpha', weight, polarity: 'positive' } as unknown as GateTerm],
    ).score);

    expect(scored).toEqual([2.5, 6, 3, 0, 0]);
  });

  // The default is never 0, and the reason is the whole point of
  // the module: a zero threshold passes every document, which is
  // the unbounded shape the gate exists to replace.
  it('falls back to a threshold that refuses something', () => {
    const stated: unknown[] = [
      undefined, null, '5', Number.NaN, Number.POSITIVE_INFINITY, {},
    ];
    const thresholds = stated.map((threshold) => scoreText(
      'alpha',
      USABLE_TERMS,
      { threshold } as GateOptions,
    ).threshold);

    expect(DEFAULT_THRESHOLD).toBeGreaterThan(0);
    expect(thresholds).toEqual(stated.map(() => DEFAULT_THRESHOLD));
  });

  // A finite threshold is taken as it is, including the two an
  // operator is most likely to reach for and a fallback would
  // silently replace.
  it('takes any finite threshold the caller states', () => {
    const stated = [0, -3, 2.5, 100];
    const thresholds = stated.map((threshold) => scoreText(
      'alpha',
      USABLE_TERMS,
      { threshold },
    ).threshold);

    expect(thresholds).toEqual(stated);
  });

  // At or above, not above: the boundary is the operator's number
  // and a document landing exactly on it is worth attention.
  it('decides at the threshold, not past it', () => {
    const decisions = [2, 3, 4].map((threshold) => scoreText(
      'alpha',
      [term('alpha', 3, 'positive')],
      { threshold },
    ).decision);

    expect(decisions).toEqual(['parse', 'parse', 'ignore']);
  });

  // Anything that is not a string scores as the empty text. The
  // gate is handed a chunk across a workflow connection, and a
  // reader that raised there would lose the record it was deciding.
  it('scores a value that is not text as the empty text', () => {
    const values: unknown[] = [null, undefined, 5, true, ['alpha'], { a: 1 }];
    const scored = values.map((value) => scoreText(value, USABLE_TERMS));

    expect(scored.map((result) => result.score)).toEqual(values.map(() => 0));
    expect(scored.map((result) => result.hits)).toEqual(values.map(() => []));
  });

  // A term set that is not a list at all, which is what a query
  // returning nothing looks like after a JSON round trip.
  it('scores nothing against a term set that is not a list', () => {
    const sets: unknown[] = [null, undefined, 'terms', 5, {}];
    const scored = sets.map((terms) => scoreText(
      'alpha',
      terms as readonly GateTerm[],
    ));

    expect(scored.map((result) => result.score)).toEqual(sets.map(() => 0));
    expect(scored.map((result) => result.warnings)).toEqual(sets.map(() => []));
  });

  // Punctuation in a positive term is punctuation, which is what
  // the escape buys: a term full of metacharacters matches itself
  // rather than taking the scanner down or matching something else.
  it('matches a positive term literally, punctuation and all', () => {
    const terms = [term('c++', 4, 'positive'), term('a.b', 1, 'positive')];
    const texts = ['c++ here', 'c here', 'a.b', 'axb'];

    expect(texts.map((text) => scoreText(text, terms).score))
      .toEqual([4, 0, 1, 0]);
  });

  // And a negative pattern is an expression, which is why the two
  // halves of the split are worth having: an alternation is the
  // normal shape of a phrase an operator wants to exclude. Both
  // branches present is still ONE term and still counts once, which
  // is the once-per-term rule read from its least obvious side.
  it('matches a negative pattern as an expression', () => {
    const terms = [term('echo|foxtrot', 5, 'negative')];
    const texts = ['echo', 'foxtrot', 'echo and foxtrot', 'golf'];

    expect(texts.map((text) => scoreText(text, terms).score))
      .toEqual([-5, -5, -5, 0]);
  });
});

// ---------------------------------------------------------------------------
// The explanation
// ---------------------------------------------------------------------------

describe('explainGate — the account stored beside the decision', () => {
  it('quotes the arithmetic and every hit it has room for', () => {
    const result = scoreText('alpha golf', USABLE_TERMS, { threshold: 4 });

    expect(explainGate(result))
      .toBe('static gate: score 2 vs threshold 4 (alpha +3, golf -1)');
  });

  it('says so when nothing matched', () => {
    const result = scoreText('nothing here', USABLE_TERMS, { threshold: 4 });

    expect(explainGate(result))
      .toBe('static gate: score 0 vs threshold 4 (no terms matched)');
  });

  // The ceiling, and the count that replaces the tail. Past a
  // handful of terms the explanation stops being a sentence and
  // starts being the term set printed back.
  it('quotes the first few hits and counts the rest', () => {
    const many = [...Array(MAX_REASON_HITS + 3).keys()]
      .map((index) => term(`t${index}`, 1, 'positive'));
    const text = many.map((entry) => entry.pattern).join(' ');
    const explained = explainGate(scoreText(text, many));

    expect(explained).toContain('+3 more');
    expect(explained).toContain('t0 +1');
    expect(explained).not.toContain(`t${MAX_REASON_HITS} `);
  });

  it('counts exactly the hits, and no tail, at the ceiling', () => {
    const exact = [...Array(MAX_REASON_HITS).keys()]
      .map((index) => term(`t${index}`, 1, 'positive'));
    const text = exact.map((entry) => entry.pattern).join(' ');

    expect(explainGate(scoreText(text, exact))).not.toContain('more');
  });

  // The unusable-entry tail, which is how the operator who can fix
  // a row finds out there is one. Singular and plural, because the
  // sentence is read by a person.
  it('counts the unusable entries, singular and plural', () => {
    const one = scoreText('alpha', [
      term('alpha', 3, 'positive'),
      term('(', 1, 'negative'),
    ]);
    const two = scoreText('alpha', [
      term('alpha', 3, 'positive'),
      term('(', 1, 'negative'),
      term('*', 1, 'negative'),
    ]);

    expect(explainGate(one)).toContain('[1 unusable list entry]');
    expect(explainGate(two)).toContain('[2 unusable list entries]');
    expect(explainGate(scoreText('alpha', USABLE_TERMS))).not.toContain('[');
  });

  // Defensive about the RESULT, because one may have crossed a
  // workflow connection as JSON and come back as anything.
  it('explains a result that is not one', () => {
    const values: unknown[] = [null, undefined, 5, 'text', [], {}];
    const explained = values.map((value) => explainGate(value));

    expect(explained).toEqual(values.map(
      () => 'static gate: score  vs threshold  (no terms matched)',
    ));
  });

  // And NOT defensive about the entries inside its hit list, which
  // is the original's asymmetry preserved: a hit that is a number
  // reads as a hit with no pattern and no weight, and a hit that is
  // null raises. Neither is reachable from a list the scoring pass
  // built. The number is the control that says the raise is about
  // the null and not about any non-record entry.
  it('reads a hit with no members, and raises for one with none at all', () => {
    expect(explainGate({ hits: [5] }))
      .toBe('static gate: score  vs threshold  ( +0)');
    expect(() => explainGate({ hits: [null] })).toThrow(TypeError);
    expect(() => explainGate({ hits: [undefined] })).toThrow(TypeError);
  });
});

// ---------------------------------------------------------------------------
// The pieces underneath
// ---------------------------------------------------------------------------

describe('escapeGateTerm — a literal, safe to compile', () => {
  it('escapes every character that means something to an expression', () => {
    expect(escapeGateTerm('a.b*c+d?e^f$g{h}i(j)k|l[m]n\\o'))
      .toBe('a\\.b\\*c\\+d\\?e\\^f\\$g\\{h\\}i\\(j\\)k\\|l\\[m\\]n\\\\o');
  });

  it('leaves a term with nothing to escape as it was', () => {
    expect(escapeGateTerm('alpha bravo-charlie')).toBe('alpha bravo-charlie');
  });

  it('reads absence as the empty term', () => {
    expect([null, undefined].map((value) => escapeGateTerm(value)))
      .toEqual(['', '']);
  });
});

describe('compileGatePattern — anchored, or nothing', () => {
  it('anchors on both sides and ignores case', () => {
    const compiled = compileGatePattern('alpha');
    const texts = ['alpha', 'ALPHA', 'an alpha', 'alphabet', 'xalpha'];

    expect(compiled === null
      ? []
      : texts.map((text) => compiled.test(text)))
      .toEqual([true, true, true, false, false]);
  });

  it('answers null rather than raising for a pattern that will not compile', () => {
    const refused = ['(', ')', '*', '+', '?'];

    expect(refused.map((pattern) => compileGatePattern(pattern)))
      .toEqual(refused.map(() => null));
  });

  // The anchoring is part of the source, so which patterns compile
  // is a property of the WRAPPED expression rather than of what the
  // operator wrote. An unclosed class is worth pinning: the
  // lookahead the wrapper appends supplies the bracket that closes
  // it, so the pattern compiles into something the operator did not
  // write rather than being refused.
  it('compiles a pattern the wrapper happens to complete', () => {
    expect(compileGatePattern('[unclosed')).not.toBeNull();
  });

  // And the empty pattern, which the scoring pass never reaches
  // because an entry with nothing to look for is skipped. Compiled
  // on its own it matches a boundary rather than everywhere, which
  // is what the two lookarounds make of an empty match.
  it('compiles the empty pattern into a boundary', () => {
    const compiled = compileGatePattern('');
    const texts = ['', 'anything', '-'];

    expect(compiled === null
      ? []
      : texts.map((text) => compiled.test(text)))
      .toEqual([true, false, true]);
  });
});

describe('termWeight — the magnitude, before its direction', () => {
  it('reads every shape a stored weight arrives in', () => {
    const entries: unknown[] = [
      { weight: 4 }, { weight: -4 }, { weight: 0 }, { weight: '2.5' },
      { weight: '3px' }, { weight: 'prose' }, { weight: null },
      { weight: undefined }, { weight: {} }, { weight: [] }, { weight: [7] },
      { weight: true }, {}, null, undefined, 5, 'text', [],
    ];

    expect(entries.map((entry) => termWeight(entry)))
      .toEqual([4, -4, 0, 2.5, 3, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('refuses a weight that is not finite', () => {
    const entries = [
      { weight: Number.NaN },
      { weight: Number.POSITIVE_INFINITY },
      { weight: Number.NEGATIVE_INFINITY },
    ];

    expect(entries.map((entry) => termWeight(entry))).toEqual([0, 0, 0]);
  });
});

describe('asList — a list, or an empty one', () => {
  it('answers the list it was given', () => {
    const given = [1, 2, 3];

    expect(asList(given)).toBe(given);
  });

  it('answers an empty list for everything else', () => {
    const values: unknown[] = [null, undefined, 'text', 5, {}, true];

    expect(values.map((value) => asList(value))).toEqual(values.map(() => []));
  });
});

describe('coversLanguage — whether scoring would mean anything', () => {
  // No detected language is no reason to doubt the term set, which
  // is what makes a deployment with no detector behave exactly as
  // it did before there was one.
  it('covers a document whose language nothing identified', () => {
    const unknowns: unknown[] = [null, undefined, '', 5, {}];

    expect(unknowns.map((lang) => coversLanguage(['romeo'], lang)))
      .toEqual(unknowns.map(() => true));
  });

  it('answers membership, and nothing else', () => {
    const rosters: unknown[] = [
      ['romeo'], ['sierra', 'romeo'], ['sierra'], [], undefined, 'romeo',
    ];

    expect(rosters.map((languages) => coversLanguage(languages, 'romeo')))
      .toEqual([true, true, false, false, false, false]);
  });

  // There is no default language here. Which languages a term set
  // covers is a fact about that term set, and a module naming one
  // would be naming a deployment's.
  it('privileges no language of its own', () => {
    const tags = ['en', 'romeo', 'sierra'];

    expect(tags.map((lang) => coversLanguage([], lang)))
      .toEqual(tags.map(() => false));
  });
});

describe('detectGateLanguage — an opinion, or none', () => {
  it('answers nothing when the caller supplied no detector', () => {
    const absent: unknown[] = [undefined, null, 'detector', 5, {}];

    expect(absent.map((detect) => detectGateLanguage('text', detect)))
      .toEqual(absent.map(() => null));
  });

  it('answers the tag a detector supplied', () => {
    expect(detectGateLanguage('text', () => ({ lang: 'romeo' }))).toBe('romeo');
  });

  it('answers nothing for every other thing a detector can do', () => {
    const detectors: unknown[] = [
      () => {
        throw new Error('detector failed');
      },
      () => null,
      () => undefined,
      () => 5,
      () => 'romeo',
      () => ({}),
      () => ({ lang: '' }),
      () => ({ lang: 5 }),
      () => ({ lang: null }),
    ];

    expect(detectors.map((detect) => detectGateLanguage('text', detect)))
      .toEqual(detectors.map(() => null));
  });

  it('hands the detector text, whatever it was given', () => {
    const seen: unknown[] = [];
    const detect = (text: unknown): unknown => {
      seen.push(text);

      return { lang: 'romeo' };
    };

    [null, undefined, 5, 'text'].forEach((value) => {
      detectGateLanguage(value, detect);
    });

    expect(seen).toEqual(['', '', '5', 'text']);
  });
});

// ---------------------------------------------------------------------------
// The vocabulary this module and the column share
// ---------------------------------------------------------------------------

describe('GATE_POLARITIES — the same set the column stores', () => {
  // The module cannot import the schema's tuple: a spliced library
  // imports nothing, so the set a matcher programs against and the
  // set the column stores are two declarations. Holding them
  // set-equal is the only thing standing between them, and a drift
  // in either direction is what it catches — a polarity the matcher
  // would refuse that a row can hold, or one the matcher scores
  // that no row can carry.
  it('holds set-equal against the schema tuple, both ways', () => {
    const gate = [...GATE_POLARITIES];
    const column = [...TERM_POLARITIES];

    expect(gate.filter((value) => !column.includes(value))).toEqual([]);
    expect(column.filter((value) => !gate.includes(value))).toEqual([]);
  });

  it('names the two the scoring pass acts on, and the one it does not', () => {
    const scored = GATE_POLARITIES.filter((polarity) => scoreText(
      'alpha',
      [term('alpha', 3, polarity)],
    ).hits.length > 0);

    expect(scored).toEqual(['positive', 'negative']);
  });
});
