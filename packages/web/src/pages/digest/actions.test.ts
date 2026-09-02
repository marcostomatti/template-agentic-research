import type { ResearchSendOutcome } from './actions';
import type { Finding } from '../../data/types';

import { describe, expect, it } from 'vitest';

import { listFindings } from '../../data/digest';
import {
  DEFAULT_DOMAIN_SLUG,
  SPARSE_DOMAIN_SLUG,
  getDomain,
  resolveFieldContract,
  resolveVerdictVocabulary,
} from '../../data/domains';

import {
  ALREADY_QUEUED_REASON,
  NO_VERDICT_VALUE,
  RESEARCH_REQUEST_FIELD,
  readVerdictChoice,
  researchRequestedAt,
  sendToResearch,
  verdictChoices,
  verdictSelectValue,
  withVerdict,
} from './actions';
import { UNRATED_VERDICT_LABEL } from './rows';

/**
 * A ladder standing in for a domain that configured one.
 *
 * Written out rather than read from a fixture where a case is about
 * the SHAPE of the answer: the seeded domain and the sparse one
 * currently resolve to the same four verdicts, so a case driven off
 * either cannot say which rung it is looking at. The cases that are
 * about this app rather than about the function drive the real
 * resolver instead, and say so.
 */
const LADDER: readonly string[] = ['avoid', 'caution', 'interested'];

/** A verdict no ladder in this file carries. */
const DROPPED_VERDICT = 'shortlisted';

/** The instant a queued intention is stamped with, in these cases. */
const REQUESTED_AT = '2026-06-11T14:30:00.000Z';

/** A second instant, so a stamp cannot pass by being any string. */
const LATER = '2026-06-12T09:00:00.000Z';

/** A finding carrying only what a case names. */
function findingWith(overrides: Partial<Finding>): Finding {
  return {
    id: 1,
    domainId: 1,
    documentId: 1,
    entityId: null,
    fields: { summary: 'A reading.' },
    score: null,
    scoreVersion: null,
    verdict: null,
    createdAt: '2026-06-11T06:00:00.000Z',
    ...overrides,
  };
}

/**
 * The finding a send produced.
 *
 * Throws rather than returning a nullable, so a case reading the
 * accepted branch cannot quietly assert its way through a refusal —
 * every `expect` below this call is about a row that exists.
 *
 * @param outcome - What {@link sendToResearch} answered.
 * @returns The queued row.
 */
function sentFinding(outcome: ResearchSendOutcome): Finding {
  if (!outcome.sent) {
    throw new Error('Expected the finding to be queued, and it was not.');
  }

  return outcome.finding;
}

/**
 * The sentence a refusal carried.
 *
 * The mirror of {@link sentFinding}, and the empty string is never a
 * legitimate answer — every case reading it asserts the sentence is
 * non-empty, which is also what keeps the leak sweep below from
 * passing over nothing at all.
 *
 * @param outcome - What {@link sendToResearch} answered.
 * @returns The reason it refused.
 */
function refusalReason(outcome: ResearchSendOutcome): string {
  if (outcome.sent) {
    throw new Error('Expected the send to be refused, and it was not.');
  }

  return outcome.reason;
}

describe('verdictChoices', () => {
  it('offers a stored verdict the ladder does not carry', () => {
    // The whole reason the stored value is an argument: `Select`
    // resolves a value none of its options carry to the FIRST option,
    // so a row labelled with a verdict the domain has since dropped
    // would be drawn as `avoid` with nothing reporting it.
    // Arrange
    const values = verdictChoices(LADDER, DROPPED_VERDICT)
      .map((option) => option.value);

    // Assert
    expect(values).toContain(DROPPED_VERDICT);
    // At the END, so the ladder keeps the order the domain gave it —
    // a dropped verdict occupies no rung.
    expect(values.at(-1)).toBe(DROPPED_VERDICT);
    expect(values).toEqual([NO_VERDICT_VALUE, ...LADDER, DROPPED_VERDICT]);
  });

  it('offers one option for a stored verdict the ladder carries', () => {
    // The common case, and the one a naive append gets wrong. A
    // duplicate value renders a second, unreachable radio item rather
    // than an error, so nothing but this case reports it.
    // Arrange
    const values = verdictChoices(LADDER, 'caution')
      .map((option) => option.value);

    // Assert
    expect(values).toEqual([NO_VERDICT_VALUE, ...LADDER]);
    expect(values.filter((value) => value === 'caution')).toHaveLength(1);
  });

  it('offers one option for a ladder spelling the unruled value', () => {
    // The documented collision. Two options sharing a value is the
    // defect that never announces itself, so the sentinel wins by
    // leading the list and the ladder member is absorbed.
    // Arrange
    const values = verdictChoices([NO_VERDICT_VALUE, 'caution'], null)
      .map((option) => option.value);

    // Assert
    expect(values).toEqual([NO_VERDICT_VALUE, 'caution']);
  });

  it('leads with the unruled option for a finding nobody ruled on', () => {
    // Arrange
    const options = verdictChoices(LADDER, null);

    // Assert
    expect(options.map((option) => option.value))
      .toEqual([NO_VERDICT_VALUE, ...LADDER]);
    expect(options.at(0)?.label).toBe(UNRATED_VERDICT_LABEL);
    // The vacuity guard: an empty label would satisfy the line above
    // if the badge ever stopped naming the state.
    expect(UNRATED_VERDICT_LABEL).not.toBe('');
  });

  it('labels every verdict in the domain own words', () => {
    // `./DigestPage.tsx` renders the filter the same way, and the two
    // controls offering one vocabulary under two spellings would read
    // as two vocabularies.
    // Arrange
    const options = verdictChoices(LADDER, null)
      .filter((option) => option.value !== NO_VERDICT_VALUE);

    // Assert
    expect(options.map((option) => option.label)).toEqual(LADDER);
    expect(options).toHaveLength(LADDER.length);
  });

  it('offers the ladder every seeded domain resolves to', () => {
    // The one case here driven off the app rather than off a literal:
    // a domain that configures no vocabulary is judged against the
    // default ladder, and that resolution is `../../data/domains.ts`
    // own rule rather than something this module re-answers.
    // Arrange
    const sparse = resolveVerdictVocabulary(getDomain(SPARSE_DOMAIN_SLUG));

    // Act
    const values = verdictChoices(sparse, null).map((option) => option.value);

    // Assert
    expect(values).toEqual([NO_VERDICT_VALUE, ...sparse]);
    // The vacuity guard: an unconfigured domain resolving to nothing
    // would make the line above compare two one-element lists.
    expect(sparse.length).toBeGreaterThan(0);
  });

  it('offers a sentinel no fixture domain can spell', () => {
    // What makes the collision case above a documented residual rather
    // than a live defect in this deployment.
    // Arrange
    const ladders = [DEFAULT_DOMAIN_SLUG, SPARSE_DOMAIN_SLUG]
      .map((slug) => resolveVerdictVocabulary(getDomain(slug)));

    // Assert
    ladders.forEach((ladder) => {
      expect(ladder).not.toContain(NO_VERDICT_VALUE);
      expect(ladder.length).toBeGreaterThan(0);
    });
    expect(ladders).toHaveLength(2);
  });

  it('builds a fresh list per call, owned by nobody', () => {
    // The one-line form of the array-ownership stance the header
    // states: `SelectProps.options` is declared mutable, so the caller
    // is free to do this and the next call must not see it.
    // Arrange
    const first = verdictChoices(LADDER, null);

    // Act
    first.push({ value: 'planted', label: 'planted' });

    // Assert
    expect(verdictChoices(LADDER, null)).toHaveLength(LADDER.length + 1);
  });
});

describe('verdictSelectValue and readVerdictChoice', () => {
  it('reads the unruled option back as no verdict at all', () => {
    // The refusal-shaped half: the sentinel is this shell string and
    // must never reach the column as one.
    expect(readVerdictChoice(NO_VERDICT_VALUE)).toBeNull();
  });

  it('hands the control a value its own option list carries', () => {
    // The claim that stops `Select` resolving to the first option, for
    // both values the ladder cannot supply.
    [null, DROPPED_VERDICT].forEach((stored) => {
      // Arrange
      const values = verdictChoices(LADDER, stored)
        .map((option) => option.value);

      // Assert
      expect(values).toContain(verdictSelectValue(stored));
    });
  });

  it('round-trips every value the control offers', () => {
    // Driven off the option list rather than a literal, so a value the
    // list gains upstream is covered with this file untouched.
    // Arrange
    const offered = verdictChoices(LADDER, DROPPED_VERDICT);

    // Act
    const roundTripped = offered.map(
      (option) => verdictSelectValue(readVerdictChoice(option.value)),
    );

    // Assert
    expect(roundTripped).toEqual(offered.map((option) => option.value));
    expect(roundTripped).toHaveLength(LADDER.length + 2);
  });

  it('passes a verdict through rather than narrowing it', () => {
    // The column is open on purpose — see the header — so a value the
    // ladder never offered is still a verdict and not a refusal.
    expect(readVerdictChoice(DROPPED_VERDICT)).toBe(DROPPED_VERDICT);
    expect(readVerdictChoice('')).toBe('');
    expect(readVerdictChoice('__proto__')).toBe('__proto__');
  });
});

describe('withVerdict', () => {
  it('leaves a finding nothing has scored unscored', () => {
    // NULL is not zero here: the two reach different cells, and a
    // transition that defaulted its way past the distinction would
    // erase it on the first ruling.
    // Arrange
    const unscored = findingWith({ score: null, scoreVersion: null });

    // Act
    const ruled = withVerdict(unscored, 'caution');

    // Assert
    expect(ruled.score).toBeNull();
    expect(ruled.scoreVersion).toBeNull();
    expect(ruled.verdict).toBe('caution');
  });

  it('leaves a finding scored to zero scored to zero', () => {
    // The other side of the same distinction, and the one a falsiness
    // check would collapse into the case above.
    // Arrange
    const scored = findingWith({ score: 0, scoreVersion: 2 });

    // Act
    const ruled = withVerdict(scored, 'neutral');

    // Assert
    expect(ruled.score).toBe(0);
    expect(ruled.scoreVersion).toBe(2);
  });

  it('carries a verdict the ladder does not offer', () => {
    // Arrange
    const finding = findingWith({ verdict: 'caution' });

    // Act
    const ruled = withVerdict(finding, DROPPED_VERDICT);

    // Assert
    expect(ruled.verdict).toBe(DROPPED_VERDICT);
  });

  it('takes a ruling back', () => {
    // Arrange
    const finding = findingWith({ verdict: 'avoid' });

    // Assert
    expect(withVerdict(finding, null).verdict).toBeNull();
  });

  it('changes nothing but the verdict', () => {
    // Every other member compared by name, so a spread that dropped
    // one is reported rather than absorbed by a shallow equality over
    // the members a case happened to think of.
    // Arrange
    const finding = findingWith({
      id: 7,
      entityId: 4,
      fields: { summary: 'A reading.', tags: ['one'] },
      score: 6.5,
      scoreVersion: 2,
      verdict: 'neutral',
    });

    // Act
    const ruled = withVerdict(finding, 'interested');

    // Assert
    expect({ ...ruled, verdict: finding.verdict }).toEqual(finding);
    expect(Object.keys(ruled).sort()).toEqual(Object.keys(finding).sort());
  });

  it('answers a fresh row and leaves the one it was given alone', () => {
    // A row mutated in place is a new value that compares equal to the
    // old one and renders nothing.
    // Arrange
    const finding = findingWith({ verdict: 'avoid' });

    // Act
    const ruled = withVerdict(finding, 'interested');

    // Assert
    expect(ruled).not.toBe(finding);
    expect(finding.verdict).toBe('avoid');
  });
});

describe('researchRequestedAt', () => {
  it('answers nothing for a finding nothing has queued', () => {
    expect(researchRequestedAt(findingWith({}))).toBeNull();
  });

  it('answers nothing for a key holding something that is not a stamp', () => {
    // `fields` is a JSON payload, so this is a state the type cannot
    // forbid and a crash would be the wrong reading of it.
    // Arrange
    const odd = findingWith({ fields: { [RESEARCH_REQUEST_FIELD]: 3 } });

    // Assert
    expect(researchRequestedAt(odd)).toBeNull();
  });

  it('answers the stamp a send recorded', () => {
    // Arrange
    const queued = sentFinding(sendToResearch(findingWith({}), REQUESTED_AT));

    // Assert
    expect(researchRequestedAt(queued)).toBe(REQUESTED_AT);
  });

  it('reads no seeded finding as queued', () => {
    // The send action is available on every row the digest draws
    // today, which is what makes the refusal below a state an operator
    // reaches rather than one the fixtures start in.
    // Arrange
    const seeded = listFindings(getDomain(DEFAULT_DOMAIN_SLUG).id);

    // Act
    const stamps = seeded.map((finding) => researchRequestedAt(finding));

    // Assert
    expect(stamps.filter((stamp) => stamp !== null)).toEqual([]);
    // The vacuity guard: an empty domain would satisfy the line above.
    expect(seeded.length).toBeGreaterThan(0);
  });

  it('reads a key no domain field contract declares', () => {
    // What earns the namespacing claim against the fixtures rather
    // than against the spelling alone.
    // Arrange
    const contract = resolveFieldContract(getDomain(DEFAULT_DOMAIN_SLUG));

    // Assert
    expect(Object.keys(contract)).not.toContain(RESEARCH_REQUEST_FIELD);
    // The vacuity guard: a domain declaring no contract would satisfy
    // the line above without saying anything about the namespace.
    expect(Object.keys(contract).length).toBeGreaterThan(0);
  });
});

describe('sendToResearch', () => {
  it('refuses a finding already queued', () => {
    // Nothing beneath this screen refuses a second intention — the
    // header carries why — so a second send would be researched twice
    // rather than sooner.
    // Arrange
    const queued = findingWith({
      fields: { summary: 'A reading.', [RESEARCH_REQUEST_FIELD]: REQUESTED_AT },
    });

    // Act
    const outcome = sendToResearch(queued, LATER);

    // Assert
    expect(outcome.sent).toBe(false);
    expect(refusalReason(outcome)).toBe(ALREADY_QUEUED_REASON);
    expect(ALREADY_QUEUED_REASON).not.toBe('');
    // The stamp it already carried is the one it keeps: a refusal
    // records nothing, so nothing can have moved.
    expect(researchRequestedAt(queued)).toBe(REQUESTED_AT);
  });

  it('refuses the second send of a row it produced itself', () => {
    // The guard read back through this module own writer, so the
    // reserved key is the contract rather than an internal detail the
    // case above hand-writes.
    // Arrange
    const first = sentFinding(sendToResearch(findingWith({}), REQUESTED_AT));

    // Act
    const second = sendToResearch(first, LATER);

    // Assert
    expect(second.sent).toBe(false);
    expect(refusalReason(second)).toBe(ALREADY_QUEUED_REASON);
  });

  it('quotes nothing the finding carries in its refusal', () => {
    // The no-echo rule, read by a second reader over the sentence the
    // module produced rather than by the module reporting on itself.
    // Arrange
    const verdictNeedle = 'SNTNLVERDICT';
    const summaryNeedle = 'SNTNLSUMMARY';
    const stampNeedle = 'SNTNLSTAMP';
    const needles = [verdictNeedle, summaryNeedle, stampNeedle];
    const queued = findingWith({
      verdict: verdictNeedle,
      fields: {
        summary: summaryNeedle,
        [RESEARCH_REQUEST_FIELD]: stampNeedle,
      },
    });
    const leaked = (text: string) => needles.filter(
      (needle) => text.includes(needle),
    );

    // Act
    const reason = refusalReason(sendToResearch(queued, LATER));

    // Assert
    expect(leaked(reason)).toEqual([]);
    expect(reason).not.toBe('');
    // The reader positive control: a sentence that DOES echo the
    // payload has to come back named, or the sweep above is a
    // substring check that could never fail.
    expect(leaked(`Already queued: ${summaryNeedle}.`))
      .toEqual([summaryNeedle]);
  });

  it('queues a finding nothing has scored', () => {
    // Noticing that a subject is worth looking into is what the gate
    // is for, and a score is the reading of a pass that may not have
    // run — so a null score is not a refusal, and it is carried
    // through rather than defaulted.
    // Arrange
    const unscored = findingWith({ score: null, scoreVersion: null });

    // Act
    const queued = sentFinding(sendToResearch(unscored, REQUESTED_AT));

    // Assert
    expect(queued.score).toBeNull();
    expect(queued.scoreVersion).toBeNull();
    expect(researchRequestedAt(queued)).toBe(REQUESTED_AT);
  });

  it('records the instant it was handed', () => {
    // The stamp is an argument rather than a clock read, so two sends
    // of two rows at two instants are distinguishable.
    // Act
    const early = sentFinding(sendToResearch(findingWith({}), REQUESTED_AT));
    const late = sentFinding(sendToResearch(findingWith({}), LATER));

    // Assert
    expect(researchRequestedAt(early)).toBe(REQUESTED_AT);
    expect(researchRequestedAt(late)).toBe(LATER);
    expect(REQUESTED_AT).not.toBe(LATER);
  });

  it('leaves the domain own fields where they were', () => {
    // The key is added to the payload, never in place of it: a send
    // that replaced `fields` would empty the digest title cell of
    // every row it touched.
    // Arrange
    const finding = findingWith({
      fields: { summary: 'A reading.', tags: ['one', 'two'], mentions: 3 },
    });

    // Act
    const queued = sentFinding(sendToResearch(finding, REQUESTED_AT));

    // Assert
    expect(queued.fields.summary).toBe('A reading.');
    expect(queued.fields.tags).toEqual(['one', 'two']);
    expect(queued.fields.mentions).toBe(3);
    expect(Object.keys(queued.fields).sort())
      .toEqual([...Object.keys(finding.fields), RESEARCH_REQUEST_FIELD].sort());
  });

  it('changes nothing but the payload', () => {
    // Arrange
    const finding = findingWith({
      id: 7,
      entityId: 4,
      score: 6.5,
      scoreVersion: 2,
      verdict: 'neutral',
    });

    // Act
    const queued = sentFinding(sendToResearch(finding, REQUESTED_AT));

    // Assert
    expect({ ...queued, fields: finding.fields }).toEqual(finding);
  });

  it('answers a fresh row and leaves the one it was given alone', () => {
    // Arrange
    const finding = findingWith({});

    // Act
    const queued = sentFinding(sendToResearch(finding, REQUESTED_AT));

    // Assert
    expect(queued).not.toBe(finding);
    expect(queued.fields).not.toBe(finding.fields);
    expect(researchRequestedAt(finding)).toBeNull();
    expect(Object.keys(finding.fields)).not.toContain(RESEARCH_REQUEST_FIELD);
  });
});
