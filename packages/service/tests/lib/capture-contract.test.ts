/**
 * Cases for `src/lib/capture-contract.ts`: every envelope the
 * boundary refuses, then the ones it lets through.
 *
 * That order is the file's argument. This module is the only thing
 * standing between a POST somebody else made and a `documents` row
 * this pipeline will treat as captured material, so the readings
 * that matter are the ones where it says no — an envelope with no
 * version, one written to a contract this service never published,
 * a payload that is not an object at all. A suite opening with a
 * well-formed envelope would pass over every one of them, because
 * that input is what any version of this boundary accepts.
 *
 * ## The version cases come first, and they answer alone
 *
 * A missing version and an unknown one are the two shapes of the
 * same refusal, and each is asserted to produce exactly ONE sentence
 * over an envelope whose every other member is also wrong. That
 * assertion is the whole of `refused rather than assumed`: a
 * boundary that judged the rest under rules the client was not
 * writing to would answer five sentences there, four of them naming
 * members the client did not get wrong.
 *
 * ## One closed roster, and every sentence in it is a constant
 *
 * The fifteen sentences are written out below and held set-equal
 * against what the cases produce, in both directions, the way
 * `parser-config.test.ts` holds its three rosters. This roster is
 * simpler than those in one way that is itself the claim: every
 * entry is a WHOLE sentence, because this module puts no site in
 * front of a predicate and appends nothing to one. So a produced
 * sentence is compared with `===` rather than with a suffix test,
 * and the guard against one entry accounting for another is a
 * substring test rather than the narrower one that file needs.
 *
 * The roster is declared here and never read off the module. A suite
 * reading these off `CAPTURE_FAULTS` would agree with any edit to
 * them, which is the one thing an operator reading
 * `documents.parse_error` at a glance cannot afford.
 *
 * ## Nothing is converted, driven from the shared adversarial corpus
 *
 * `tests/parity/fixtures.ts` already holds the values a reading has
 * to survive, and one of them is an object whose string conversion
 * throws. The section below hands each of them to the boundary as a
 * whole payload and as a body, and asserts the boundary answers
 * rather than raising — the property that keeps a refusal a stored
 * failure, since the row is written before any of this runs and a
 * boundary that threw would take the workflow down with the row
 * standing and nothing judged.
 *
 * The bounds are driven off the exported ceilings rather than off
 * the numbers they currently hold, so re-tuning one moves both the
 * refusing case and the accepting one with it instead of leaving a
 * pair that passes for the wrong reason.
 *
 * No word here is a term, a client or a domain anybody would
 * actually capture from. The mechanism is here; the vocabulary is
 * rows in a table.
 */
import type { CaptureEnvelope } from '../../src/lib/capture-contract.js';

import { describe, expect, it } from 'vitest';

import {
  CAPTURED_AT_PATTERN,
  CAPTURE_CONTRACT_VERSION,
  CAPTURE_ENVELOPE_MEMBERS,
  MAX_CAPTURED_AT_LENGTH,
  MAX_PROVENANCE_MEMBERS,
  MAX_PROVENANCE_NAME_LENGTH,
  MAX_PROVENANCE_TEXT_LENGTH,
  PROVENANCE_NAME_PATTERN,
  captureEnvelopeErrors,
} from '../../src/lib/capture-contract.js';
import { ADVERSARIAL_VALUES, fixtureById } from '../parity/fixtures.js';

// ---------------------------------------------------------------------------
// The closed roster
// ---------------------------------------------------------------------------

/** One sentence the module can answer. */
interface FaultEntry {
  /** How a case points at it. */
  readonly id: string;

  /** The sentence, whole — this module builds none of them. */
  readonly text: string;
}

/**
 * Every sentence {@link captureEnvelopeErrors} can answer.
 *
 * Fifteen, and every one of them reachable — there is no unreachable
 * member here to declare, which the guards at the foot of this file
 * assert rather than assume.
 */
const FAULT_ENTRIES: readonly FaultEntry[] = [
  { id: 'notObject', text: 'the capture envelope is not an object' },
  { id: 'versionAbsent', text: 'the envelope states no contract version' },
  {
    id: 'versionUnknown',
    text: 'the envelope states a contract version this service does not ' +
      'accept',
  },
  { id: 'sourceAbsent', text: 'the envelope names no source' },
  {
    id: 'sourceNotId',
    text: 'the envelope names a source that is not a positive integer',
  },
  {
    id: 'capturedAtAbsent',
    text: 'the envelope carries no captured-at stamp',
  },
  {
    id: 'capturedAtShape',
    text: 'the envelope carries a captured-at stamp that is not a UTC ' +
      'instant',
  },
  { id: 'provenanceAbsent', text: 'the envelope records no provenance' },
  {
    id: 'provenanceNotObject',
    text: 'the envelope records provenance that is not an object',
  },
  {
    id: 'provenanceCount',
    text: 'the envelope records more provenance members than the contract ' +
      'carries',
  },
  {
    id: 'provenanceName',
    text: 'the envelope records a provenance member whose name the ' +
      'contract cannot use',
  },
  {
    id: 'provenanceValue',
    text: 'the envelope records a provenance member that is not a scalar',
  },
  {
    id: 'provenanceLength',
    text: 'the envelope records a provenance member whose text is longer ' +
      'than the contract carries',
  },
  { id: 'bodyAbsent', text: 'the envelope carries no body' },
  {
    id: 'bodyShape',
    text: 'the envelope carries a body that is neither text nor a keyed ' +
      'value',
  },
];

/**
 * The sentence one entry declares.
 *
 * Refuses rather than answering `undefined`, so a case pointing at
 * an id no entry declares fails naming the id instead of asserting
 * against nothing.
 *
 * @param id - The entry a case points at.
 * @returns Its whole sentence.
 */
function sentenceFor(id: string): string {
  const entry = FAULT_ENTRIES.find((member) => member.id === id);

  if (entry === undefined) {
    throw new Error(`no capture fault is registered under ${id}`);
  }

  return entry.text;
}

// ---------------------------------------------------------------------------
// The envelope every section is built from
// ---------------------------------------------------------------------------

/**
 * A stamp the contract accepts, in the spelling with milliseconds.
 *
 * A literal rather than a rendered `Date`, so a case asserting the
 * boundary accepts it is asserting about the contract's own spelling
 * rather than about whatever this runtime's formatter emits.
 */
const CAPTURED_AT = '2026-08-30T09:00:00.000Z';

/**
 * A well-formed envelope, built fresh on every call.
 *
 * Fresh because several sections mutate a copy of it, and a shared
 * object would let one case's edit reach the next. Typed as a plain
 * record rather than as {@link CaptureEnvelope} so a case can drop a
 * member or put the wrong shape in one, which is what most of them
 * are for.
 *
 * @returns An envelope the boundary accepts.
 */
function wellFormed(): Record<string, unknown> {
  return {
    version: CAPTURE_CONTRACT_VERSION,
    sourceId: 7,
    capturedAt: CAPTURED_AT,
    provenance: { client: 'probe', clientBuild: 4, retried: false },
    body: { title: 'a captured thing', text: 'what it said' },
  };
}

/**
 * A well-formed envelope with one member replaced.
 *
 * @param name - The member to replace.
 * @param value - What to put there.
 * @returns The altered envelope.
 */
function withMember(name: string, value: unknown): Record<string, unknown> {
  return { ...wellFormed(), [name]: value };
}

/**
 * A well-formed envelope with one member gone.
 *
 * Built by copying the members that are not it, rather than by
 * deleting: a `delete` would be a mutation, and the shape this
 * produces is the shape a client that never wrote the key sends.
 *
 * @param name - The member to leave out.
 * @returns The envelope without it.
 */
function without(name: string): Record<string, unknown> {
  const remaining: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(wellFormed())) {
    if (key !== name) {
      remaining[key] = value;
    }
  }

  return remaining;
}

/**
 * A provenance note of a given size, every member of it usable.
 *
 * @param count - How many members to record.
 * @returns The note.
 */
function provenanceOfSize(count: number): Record<string, unknown> {
  const note: Record<string, unknown> = {};

  for (let index = 0; index < count; index += 1) {
    note[`p${String(index)}`] = 'x';
  }

  return note;
}

/**
 * A run of one character, for driving a ceiling from either side.
 *
 * @param length - How long.
 * @returns The run.
 */
function runOfLength(length: number): string {
  return 'a'.repeat(length);
}

// ---------------------------------------------------------------------------
// One refusal, and the one sentence it answers
// ---------------------------------------------------------------------------

/** One envelope, and the single fault it is built to produce. */
interface RefusalCase {
  /** Stable label a failure prints. */
  readonly id: string;

  /** The {@link FAULT_ENTRIES} member it reaches. */
  readonly fault: string;

  /** The envelope, built fresh so no case shares an object. */
  readonly build: () => unknown;
}

/**
 * Which fault each required member's absence produces.
 *
 * Keyed by the wire name, and held set-equal against
 * {@link CAPTURE_ENVELOPE_MEMBERS} by a case below — so a member
 * added to that tuple and to nothing else fails naming itself rather
 * than going undriven.
 */
const ABSENT_FAULTS: Readonly<Record<string, string>> = {
  version: 'versionAbsent',
  sourceId: 'sourceAbsent',
  capturedAt: 'capturedAtAbsent',
  provenance: 'provenanceAbsent',
  body: 'bodyAbsent',
};

/**
 * One case per required member, each dropping only that member.
 *
 * Derived from {@link CAPTURE_ENVELOPE_MEMBERS} rather than written
 * out, which is what makes the tuple a declaration the cases read
 * instead of a list beside them.
 */
const ABSENT_CASES: readonly RefusalCase[] = CAPTURE_ENVELOPE_MEMBERS
  .map((name) => ({
    id: `absent/${name}`,
    fault: ABSENT_FAULTS[name] ?? 'unregistered',
    build: () => without(name),
  }));

/**
 * One case per rule a STATED member can break.
 *
 * Every entry produces exactly one sentence, which the case below
 * asserts. That is what stops a guard absorbing a neighbour's input:
 * an envelope built to fail on its stamp and failing on its source
 * as well would still pass a test that only counted.
 */
const REFUSAL_CASES: readonly RefusalCase[] = [
  { id: 'notObject/null', fault: 'notObject', build: () => null },
  { id: 'notObject/text', fault: 'notObject', build: () => 'an envelope' },
  {
    id: 'notObject/list',
    fault: 'notObject',
    build: () => [wellFormed()],
  },
  {
    id: 'versionUnknown/later',
    fault: 'versionUnknown',
    build: () => withMember('version', CAPTURE_CONTRACT_VERSION + 1),
  },
  {
    id: 'versionUnknown/text',
    fault: 'versionUnknown',
    build: () => withMember('version', String(CAPTURE_CONTRACT_VERSION)),
  },
  {
    id: 'versionUnknown/null',
    fault: 'versionUnknown',
    build: () => withMember('version', null),
  },
  {
    id: 'sourceNotId/zero',
    fault: 'sourceNotId',
    build: () => withMember('sourceId', 0),
  },
  {
    id: 'sourceNotId/negative',
    fault: 'sourceNotId',
    build: () => withMember('sourceId', -3),
  },
  {
    id: 'sourceNotId/fraction',
    fault: 'sourceNotId',
    build: () => withMember('sourceId', 1.5),
  },
  {
    id: 'sourceNotId/text',
    fault: 'sourceNotId',
    build: () => withMember('sourceId', '7'),
  },
  {
    id: 'sourceNotId/null',
    fault: 'sourceNotId',
    build: () => withMember('sourceId', null),
  },
  {
    id: 'capturedAtShape/offset-form',
    fault: 'capturedAtShape',
    build: () => withMember('capturedAt', '2026-08-30T09:00:00+00:00'),
  },
  {
    id: 'capturedAtShape/date-only',
    fault: 'capturedAtShape',
    build: () => withMember('capturedAt', '2026-08-30'),
  },
  {
    id: 'capturedAtShape/no-such-day',
    fault: 'capturedAtShape',
    build: () => withMember('capturedAt', '2026-02-30T09:00:00Z'),
  },
  {
    id: 'capturedAtShape/short-fraction',
    fault: 'capturedAtShape',
    build: () => withMember('capturedAt', '2026-08-30T09:00:00.5Z'),
  },
  {
    id: 'capturedAtShape/past-the-ceiling',
    fault: 'capturedAtShape',
    build: () => withMember(
      'capturedAt',
      `${CAPTURED_AT.slice(0, -1)}${runOfLength(MAX_CAPTURED_AT_LENGTH)}Z`,
    ),
  },
  {
    id: 'capturedAtShape/not-text',
    fault: 'capturedAtShape',
    build: () => withMember('capturedAt', 1772442000000),
  },
  {
    id: 'provenanceNotObject/list',
    fault: 'provenanceNotObject',
    build: () => withMember('provenance', ['client', 'probe']),
  },
  {
    id: 'provenanceNotObject/null',
    fault: 'provenanceNotObject',
    build: () => withMember('provenance', null),
  },
  {
    id: 'provenanceCount/over-the-ceiling',
    fault: 'provenanceCount',
    build: () => withMember(
      'provenance',
      provenanceOfSize(MAX_PROVENANCE_MEMBERS + 1),
    ),
  },
  {
    id: 'provenanceName/spaced',
    fault: 'provenanceName',
    build: () => withMember('provenance', { 'the client': 'probe' }),
  },
  {
    id: 'provenanceName/past-the-ceiling',
    fault: 'provenanceName',
    build: () => withMember('provenance', {
      [runOfLength(MAX_PROVENANCE_NAME_LENGTH + 1)]: 'probe',
    }),
  },
  {
    id: 'provenanceValue/nested',
    fault: 'provenanceValue',
    build: () => withMember('provenance', { client: { name: 'probe' } }),
  },
  {
    id: 'provenanceValue/list',
    fault: 'provenanceValue',
    build: () => withMember('provenance', { client: ['probe'] }),
  },
  {
    id: 'provenanceValue/not-a-number',
    fault: 'provenanceValue',
    build: () => withMember('provenance', { clientBuild: Number.NaN }),
  },
  {
    id: 'provenanceLength/past-the-ceiling',
    fault: 'provenanceLength',
    build: () => withMember('provenance', {
      client: runOfLength(MAX_PROVENANCE_TEXT_LENGTH + 1),
    }),
  },
  {
    id: 'bodyShape/number',
    fault: 'bodyShape',
    build: () => withMember('body', 7),
  },
  {
    id: 'bodyShape/boolean',
    fault: 'bodyShape',
    build: () => withMember('body', true),
  },
  {
    id: 'bodyShape/null',
    fault: 'bodyShape',
    build: () => withMember('body', null),
  },
];

/** Every refusal case in the file, in the order the sections read them. */
const ALL_CASES: readonly RefusalCase[] = [...ABSENT_CASES, ...REFUSAL_CASES];

// ---------------------------------------------------------------------------
// The version, which says which rules the rest is judged by
// ---------------------------------------------------------------------------

/**
 * An envelope whose every member past the version is wrong.
 *
 * Four faults' worth, so the version cases below can assert they
 * answer ONE sentence over an envelope that would otherwise answer
 * four — which is the difference between refusing an unknown version
 * and judging the rest under rules the client was not writing to.
 *
 * @param version - Whatever to state as the version.
 * @returns The envelope.
 */
function wrongThroughout(version: unknown): Record<string, unknown> {
  return {
    version,
    sourceId: 0,
    capturedAt: 'the other day',
    provenance: ['client', 'probe'],
    body: 7,
  };
}

/** The four faults {@link wrongThroughout} carries, in member order. */
const WRONG_THROUGHOUT_FAULTS: readonly string[] = [
  'sourceNotId',
  'capturedAtShape',
  'provenanceNotObject',
  'bodyShape',
];

describe('the version says which rules the rest is judged by', () => {
  // Absent first. Nothing states which contract the client wrote to,
  // so there is nothing to judge the other four members under and
  // none of them is looked at.
  it('refuses an envelope with no version, and says nothing else', () => {
    // The second form is a key present with an undefined value, which
    // is what a client serializing an absent field sends. It is not a
    // stated version either.
    expect(captureEnvelopeErrors(without('version')))
      .toEqual([sentenceFor('versionAbsent')]);
    expect(captureEnvelopeErrors(wrongThroughout(undefined)))
      .toEqual([sentenceFor('versionAbsent')]);
  });

  // Unknown next, and this is the one the header argues at length: a
  // v2 client is not a v1 client with an odd number in it, so a list
  // of faults derived from v1 rules would name members it did not
  // get wrong.
  it('refuses an unaccepted version, judging nothing under it', () => {
    for (const version of [CAPTURE_CONTRACT_VERSION + 1, 0, -1, '1', null]) {
      expect(captureEnvelopeErrors(wrongThroughout(version)))
        .toEqual([sentenceFor('versionUnknown')]);
    }
  });

  // The control that makes both cases above mean something. The same
  // envelope under the version this service DOES accept answers all
  // four faults — so the single sentence is a boundary that stopped
  // at the version, rather than one that had stopped reporting.
  it('answers all four faults once the version is one it accepts', () => {
    expect(captureEnvelopeErrors(wrongThroughout(CAPTURE_CONTRACT_VERSION)))
      .toEqual(WRONG_THROUGHOUT_FAULTS.map(sentenceFor));
  });

  // Own key. An envelope that inherits a usable version has stated
  // nothing, which is what the workflow needs: a client cannot reach
  // acceptance through a prototype it did not write either.
  it('reads the version by own key, so an inherited one is absent', () => {
    const inherited: Record<string, unknown> = Object.create(wellFormed());

    inherited.sourceId = 7;

    expect(Object.hasOwn(inherited, 'version')).toBe(false);
    expect(inherited.version).toBe(CAPTURE_CONTRACT_VERSION);
    expect(captureEnvelopeErrors(inherited))
      .toEqual([sentenceFor('versionAbsent')]);
  });
});

// ---------------------------------------------------------------------------
// A payload with no members to read
// ---------------------------------------------------------------------------

describe('a payload the boundary has no members to read', () => {
  // A list is refused with the rest, deliberately: an envelope is
  // read by member name, so a roster arriving where one belonged
  // should read as the wrong shape rather than as an empty one.
  it('refuses everything that is not a keyed object, once each', () => {
    for (const payload of [null, undefined, 'an envelope', 7, true, []]) {
      expect(captureEnvelopeErrors(payload))
        .toEqual([sentenceFor('notObject')]);
    }
  });
});

// ---------------------------------------------------------------------------
// Nothing a member holds is converted
// ---------------------------------------------------------------------------

/** The shared fixture whose string conversion raises. */
const HOSTILE = fixtureById(ADVERSARIAL_VALUES, 'hostile-string-conversion');

describe('nothing a member holds is converted', () => {
  // The property the whole design rests on. The workflow writes
  // `documents.raw` before this boundary runs, so a boundary that
  // raised would leave the row standing with nothing judged and the
  // run dead — which is the one failure a stored failure was
  // supposed to rule out.
  it('answers rather than raising for every adversarial value posted', () => {
    const raised = ADVERSARIAL_VALUES.filter((entry) => {
      try {
        captureEnvelopeErrors(entry.build());

        return false;
      } catch {
        return true;
      }
    });

    expect(ADVERSARIAL_VALUES.length).toBeGreaterThan(0);
    expect(raised.map((entry) => entry.id)).toEqual([]);
  });

  // The same sweep with each value in the BODY, which is where it
  // actually arrives: a client posts a well-formed envelope around
  // whatever it captured, and the boundary never looks inside.
  it('answers rather than raising for each adversarial body', () => {
    const raised = ADVERSARIAL_VALUES.filter((entry) => {
      try {
        captureEnvelopeErrors(withMember('body', entry.build()));

        return false;
      } catch {
        return true;
      }
    });

    expect(raised.map((entry) => entry.id)).toEqual([]);
  });

  // The plan's own case, spelled out rather than left to the sweep.
  // A body whose own `toString` raises is ACCEPTED, in three
  // positions, because the shape of a body is the only question
  // asked about one.
  it('accepts a body carrying a value whose string conversion throws', () => {
    const hostile = HOSTILE.build();

    expect(() => String(hostile)).toThrow();
    expect(captureEnvelopeErrors(withMember('body', hostile))).toEqual([]);
    expect(captureEnvelopeErrors(withMember('body', [hostile]))).toEqual([]);
    expect(captureEnvelopeErrors(withMember('body', { reading: hostile })))
      .toEqual([]);
  });

  // And the same value where the contract DOES have an opinion. A
  // provenance member is judged by its type and by nothing it could
  // be rendered as, so the refusal is the scalar rule rather than a
  // conversion that got away with it.
  it('refuses that value as provenance without converting it either', () => {
    const hostile = HOSTILE.build();

    expect(captureEnvelopeErrors(withMember('provenance', { at: hostile })))
      .toEqual([sentenceFor('provenanceValue')]);
  });
});

// ---------------------------------------------------------------------------
// Every member the contract requires, and every rule a stated one breaks
// ---------------------------------------------------------------------------

describe('every member the contract requires', () => {
  // The tuple and the fault table held against each other. A member
  // added to CAPTURE_ENVELOPE_MEMBERS and to nothing else fails here
  // rather than going undriven, and a fault table entry for a member
  // the tuple no longer declares fails with it.
  it('registers an absence fault for every member the tuple declares', () => {
    const declared = [...CAPTURE_ENVELOPE_MEMBERS].sort();
    const covered = Object.keys(ABSENT_FAULTS).sort();

    expect(covered).toEqual(declared);
    expect(ABSENT_CASES.map((entry) => entry.fault))
      .not.toContain('unregistered');
  });

  it('answers the one absence sentence each missing member names', () => {
    for (const entry of ABSENT_CASES) {
      expect({ id: entry.id, answered: captureEnvelopeErrors(entry.build()) })
        .toEqual({ id: entry.id, answered: [sentenceFor(entry.fault)] });
    }
  });
});

describe('every rule a stated member can break', () => {
  // Pinned to the sentence rather than to the count, and to exactly
  // one of them: an envelope built to fail on its stamp and failing
  // on its source as well would still pass a test that only counted.
  it('answers the one sentence each case names, and only that one', () => {
    for (const entry of REFUSAL_CASES) {
      expect({ id: entry.id, answered: captureEnvelopeErrors(entry.build()) })
        .toEqual({ id: entry.id, answered: [sentenceFor(entry.fault)] });
    }
  });

  // The list, not the first fault. A client author fixing an
  // integration should see the whole of what is wrong with it, in the
  // order the members are declared in.
  it('answers every fault an envelope carries rather than the first', () => {
    expect(captureEnvelopeErrors({
      version: CAPTURE_CONTRACT_VERSION,
      sourceId: '7',
      capturedAt: '2026-08-30',
      provenance: { 'the client': { name: 'probe' } },
      body: false,
    })).toEqual([
      'sourceNotId',
      'capturedAtShape',
      'provenanceName',
      'provenanceValue',
      'bodyShape',
    ].map(sentenceFor));
  });

  // At most once each. Three unusable names are three instances of
  // one rule, and the second and third sentences would be the
  // identical constant — see the module header for what a reader
  // loses by that and why the trade is the right one here.
  it('reports one provenance rule once, not once per member', () => {
    expect(captureEnvelopeErrors(withMember('provenance', {
      'the client': 'probe',
      'the build': 4,
      'the retry': false,
    }))).toEqual([sentenceFor('provenanceName')]);
  });

  // The two refusals that could have come from the wrong half of a
  // check. A name past the ceiling still SATISFIES the class, and a
  // rolled-over day still MATCHES the stamp pattern AND parses to a
  // real instant, so each of these says the last half of its rule is
  // the half that fired.
  it('refuses past a ceiling the class and the pattern both accept', () => {
    const longName = runOfLength(MAX_PROVENANCE_NAME_LENGTH + 1);
    const noSuchDay = '2026-02-30T09:00:00Z';
    const note = { [longName]: 'x' };

    expect(PROVENANCE_NAME_PATTERN.test(longName)).toBe(true);
    expect(CAPTURED_AT_PATTERN.test(noSuchDay)).toBe(true);
    expect(Number.isFinite(Date.parse(noSuchDay))).toBe(true);
    expect(new Date(noSuchDay).toISOString()).not.toBe(noSuchDay);
    expect(captureEnvelopeErrors(withMember('provenance', note)))
      .toEqual([sentenceFor('provenanceName')]);
    expect(captureEnvelopeErrors(withMember('capturedAt', noSuchDay)))
      .toEqual([sentenceFor('capturedAtShape')]);
  });
});

// ---------------------------------------------------------------------------
// The envelopes the boundary accepts
// ---------------------------------------------------------------------------

describe('the envelopes the boundary accepts', () => {
  it('accepts a well-formed envelope, and says nothing about it', () => {
    expect(captureEnvelopeErrors(wellFormed())).toEqual([]);
  });

  // Up to and including every ceiling, driven off the exported bound
  // rather than off the number it currently holds — so re-tuning one
  // moves this case and its refusing twin together.
  it('accepts an envelope sitting on every provenance ceiling', () => {
    expect(captureEnvelopeErrors(withMember(
      'provenance',
      provenanceOfSize(MAX_PROVENANCE_MEMBERS),
    ))).toEqual([]);
    expect(captureEnvelopeErrors(withMember('provenance', {
      [runOfLength(MAX_PROVENANCE_NAME_LENGTH)]:
        runOfLength(MAX_PROVENANCE_TEXT_LENGTH),
    }))).toEqual([]);
  });

  // A note with nothing in it is an empty note, not an absent one:
  // the member was stated, and a client with nothing to record about
  // a capture has not got the envelope wrong.
  it('accepts a provenance note holding no member at all', () => {
    expect(captureEnvelopeErrors(withMember('provenance', {}))).toEqual([]);
  });

  // Every scalar the contract admits, `null` included — a client
  // with no reading for a member says so rather than leaving it out.
  it('accepts every scalar a provenance member may be recorded as', () => {
    expect(captureEnvelopeErrors(withMember('provenance', {
      client: 'probe',
      clientBuild: 4,
      retried: false,
      readAt: null,
      offset: -1.5,
    }))).toEqual([]);
  });

  // Both spellings of the stamp, and the ceiling held against the
  // longer of them: MAX_CAPTURED_AT_LENGTH is exactly what the
  // longest accepted spelling takes, which is what stops the bound
  // and the pattern drifting apart.
  it('accepts a stamp with and without milliseconds, up to the bound', () => {
    expect(CAPTURED_AT).toHaveLength(MAX_CAPTURED_AT_LENGTH);
    expect(captureEnvelopeErrors(withMember('capturedAt', CAPTURED_AT)))
      .toEqual([]);
    expect(captureEnvelopeErrors(
      withMember('capturedAt', '2026-08-30T09:00:00Z'),
    )).toEqual([]);
  });

  // Text, a list and a keyed object are all bodies. So is an empty
  // string: a capture that yielded no text is kept, which is what
  // `documents.body` being NOT NULL and legitimately empty records.
  it('accepts every body shape an extraction could be run over', () => {
    for (const body of ['what it said', '', [], [{ a: 1 }], { a: 1 }]) {
      expect(captureEnvelopeErrors(withMember('body', body))).toEqual([]);
    }
  });

  it('accepts the smallest id a sources row can carry', () => {
    expect(captureEnvelopeErrors(withMember('sourceId', 1))).toEqual([]);
  });

  // The accepted shape, named as the type it is known to be
  // afterwards. Nothing narrows on its own, so this is the one place
  // the interface and the validator are held together.
  it('describes what an accepted envelope is', () => {
    const envelope: CaptureEnvelope = {
      version: CAPTURE_CONTRACT_VERSION,
      sourceId: 7,
      capturedAt: CAPTURED_AT,
      provenance: { client: 'probe' },
      body: { text: 'what it said' },
    };

    expect(captureEnvelopeErrors(envelope)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The closed roster these sentences are held against
// ---------------------------------------------------------------------------

/**
 * Every sentence the cases in this file produce.
 *
 * Collected from the tables rather than written out, so a case added
 * to either one joins the guards below without a second edit.
 *
 * @returns One entry per sentence, in no particular order.
 */
function everyFault(): readonly string[] {
  return ALL_CASES.flatMap((entry) => captureEnvelopeErrors(entry.build()));
}

describe('the closed roster these sentences are held against', () => {
  // The first direction. A sentence a case produced that no entry
  // registers means the module has grown a report nothing here knows
  // about — the shape a widened boundary takes when nobody updates
  // this file. Compared with `===`, because every sentence this
  // module can answer is a whole constant.
  it('produces no sentence the roster does not register', () => {
    const registered = FAULT_ENTRIES.map((entry) => entry.text);

    expect(everyFault().filter((sentence) => !registered.includes(sentence)))
      .toEqual([]);
  });

  // The other direction, and the one that catches a sentence going
  // quietly unreachable. Every entry is reachable — there is no
  // unreachable member to declare — so this is asserted whole rather
  // than filtered.
  it('reaches every sentence the roster registers', () => {
    const produced = everyFault();

    expect(FAULT_ENTRIES
      .filter((entry) => !produced.includes(entry.text))
      .map((entry) => entry.id)).toEqual([]);
  });

  // The registration itself, held both ways: a case pointing at an id
  // no entry declares, and an entry no case points at. Without this
  // the guards above pass for a table whose ids have drifted.
  it('registers every case against an entry, and back', () => {
    const declared = FAULT_ENTRIES.map((entry) => entry.id);
    const pointed = ALL_CASES.map((entry) => entry.fault);

    expect(pointed.filter((id) => !declared.includes(id))).toEqual([]);
    expect(declared.filter((id) => !pointed.includes(id))).toEqual([]);
  });

  // No entry may sit inside another. A substring test rather than the
  // narrower suffix one `parser-config.test.ts` needs, because
  // nothing here is a predicate a site is put in front of — so the
  // strongest available reading is that no sentence contains another
  // at all, in any position.
  it('registers no sentence that accounts for another', () => {
    const overlapping = FAULT_ENTRIES.filter((entry) => FAULT_ENTRIES.some(
      (other) => other.id !== entry.id && entry.text.includes(other.text),
    ));

    expect(overlapping.map((entry) => entry.id)).toEqual([]);
  });

  // The totality claim, read off the answers rather than off the
  // module: every sentence produced anywhere in this file is one of
  // the fifteen constants, identically, so nothing was built from
  // anything a case handed in. What this cannot see is a template
  // added later that no case reaches, which is what the second guard
  // above is for.
  it('answers nothing but the constants, and never one twice', () => {
    const repeated = ALL_CASES.filter((entry) => {
      const answered = captureEnvelopeErrors(entry.build());

      return new Set(answered).size !== answered.length;
    });

    expect(repeated.map((entry) => entry.id)).toEqual([]);
    expect(FAULT_ENTRIES).toHaveLength(new Set(
      FAULT_ENTRIES.map((entry) => entry.text),
    ).size);
  });
});
