/**
 * Cases for `src/lib/digest-assemble.ts`: what one period comes to,
 * as structure.
 *
 * Every wrong answer this library can give is a well-formed digest.
 * An unscored finding sorted as a zero sits at the bottom of a
 * section looking judged. A section counted `0` when nothing read it
 * says the domain looked and found nothing. A finding filed under a
 * key the domain does not declare, dropped, leaves a digest that is
 * simply shorter than the period was. None of those throws, and none
 * of them shows anywhere but in a case that pinned the whole answer.
 *
 * So the section cases assert the WHOLE section list rather than the
 * member they are about, and the ordering cases assert the whole id
 * sequence rather than the position of one finding — a claim about
 * one member that leaves the rest unread is satisfied by most of a
 * wrong answer.
 *
 * House order, with the plan's four additions in front of the
 * ordinary paths. The two refusals first, since they are all the
 * module has and everything below is bounded by them. Then the empty
 * selection, the all-null score set, the declared category no
 * finding carries, and the errors value that is not a list — four
 * inputs a period genuinely produces and the four a repair breaks
 * first. The ordinary orderings, sections, counts and vocabulary
 * follow, and the purity guards close the file.
 */
import type {
  DigestCategory,
  DigestFinding,
  DigestSection,
} from '../../src/lib/digest-assemble.js';

import { describe, expect, it } from 'vitest';

import {
  NEUTRAL_FINDINGS_DISPLAY_NAME,
  assembleDigest,
  compareFindings,
  displayNameFor,
  orderFindings,
  previousRunBanner,
} from '../../src/lib/digest-assemble.js';

// ---------------------------------------------------------------------------
// The neutral domain every section below is driven over
// ---------------------------------------------------------------------------

/**
 * A finding carrying one member this module never heard of.
 *
 * Present so the passthrough claim has something to be about: the
 * sections answer with the objects that were handed in, and a case
 * asserting a whole section over this shape fails if anything was
 * copied, narrowed or rebuilt on the way through.
 */
interface BulletinFinding extends DigestFinding {
  /** Free text no part of the library reads. */
  readonly note: string;
}

/**
 * A rainfall bulletin's taxonomy: two categories that label
 * themselves and one that does not.
 *
 * The third is what the heading fallback is read over — a category
 * with no label is headed by its key, which is text an operator
 * typed rather than an identifier this schema generated.
 */
const CATEGORIES: readonly DigestCategory[] = [
  { key: 'rainfall', label: 'Rainfall' },
  { key: 'river-levels', label: 'River levels' },
  { key: 'wind-gusts' },
];

/** Every section key that taxonomy declares, plus the one it does not. */
const ALL_SECTIONS: readonly (string | null)[] = [
  'rainfall',
  'river-levels',
  'wind-gusts',
  null,
];

/**
 * One finding, with only the members this module reads varied.
 *
 * @param id - The surrogate key, as a number or as the string a
 *   driver may hand a `bigserial` back as.
 * @param score - How it scored, or nothing.
 * @param createdAt - When it was created.
 * @param categoryKey - What it is filed under, if anything.
 * @returns The finding.
 */
function finding(
  id: number | string,
  score: number | string | null,
  createdAt: Date | string | number | null,
  categoryKey?: string | null,
): BulletinFinding {
  return { id, score, createdAt, categoryKey, note: `note ${String(id)}` };
}

/** A moment every fixture below is dated against. */
const NOON = '2026-08-30T12:00:00.000Z';

/** An hour before it. */
const ELEVEN = '2026-08-30T11:00:00.000Z';

/** An hour after it. */
const ONE = '2026-08-30T13:00:00.000Z';

/**
 * The ids of a list, in the order it holds them.
 *
 * @param findings - The findings to read.
 * @returns Their ids.
 */
function idsOf(findings: readonly DigestFinding[]): (number | string)[] {
  return findings.map((entry) => entry.id);
}

/**
 * Every section a digest answered, reduced to the three members a
 * count case is about.
 *
 * The findings are left out here and asserted whole elsewhere, so a
 * counting claim reads as a table rather than as four nested
 * objects.
 *
 * @param sections - The sections the assembly answered.
 * @returns One key, heading and count per section.
 */
function countsOf(
  sections: readonly DigestSection<BulletinFinding>[],
): { key: string | null; heading: string; count: number | null }[] {
  return sections.map((section) => ({
    key: section.key,
    heading: section.heading,
    count: section.count,
  }));
}

// ---------------------------------------------------------------------------
// The two refusals
// ---------------------------------------------------------------------------

describe('assembleDigest refuses a taxonomy it cannot section by', () => {
  // A key that is not a non-empty string names a section nothing can
  // head and nothing can be filed under. Driven over both shapes,
  // because the type forbids one of them and the JSON boundary a
  // Code node sits behind does not.
  it('refuses a category naming no usable key', () => {
    const noKey = { key: '' };
    const wrongType = { key: 7 } as unknown as DigestCategory;

    expect(() => assembleDigest({ findings: [], categories: [noKey] }))
      .toThrow('every category has to name its section');
    expect(() => assembleDigest({ findings: [], categories: [wrongType] }))
      .toThrow('every category has to name its section');
  });

  // Two categories naming one section is the fault worth a throw:
  // one section would show the whole bucket, the other an empty one
  // counted zero, and nothing anywhere would say which. Pinned to
  // the sentence AND to the key it names, so this refusal cannot
  // quietly absorb the one above.
  it('refuses two categories naming one section', () => {
    const twice: readonly DigestCategory[] = [
      { key: 'rainfall', label: 'Rainfall' },
      { key: 'rainfall', label: 'Rain' },
    ];

    expect(() => assembleDigest({ findings: [], categories: twice }))
      .toThrow('two categories name the section rainfall');
  });
});

// ---------------------------------------------------------------------------
// The four inputs a period genuinely produces
// ---------------------------------------------------------------------------

describe('a pass that selected no findings at all', () => {
  // The empty selection, read twice, because the two readings are
  // the whole null-vs-zero rule and they differ only in the coverage
  // list. A domain whose sections were all read and were all empty
  // reports zeros; a pass that read nothing reports nulls. An
  // implementation collapsing the two passes one of these cases and
  // fails the other, which is why neither is written alone.
  it('counts every read section zero and totals zero', () => {
    const assembled = assembleDigest<BulletinFinding>({
      findings: [],
      categories: CATEGORIES,
      sectionsRead: ALL_SECTIONS,
    });

    expect(countsOf(assembled.sections)).toStrictEqual([
      { key: 'rainfall', heading: 'Rainfall', count: 0 },
      { key: 'river-levels', heading: 'River levels', count: 0 },
      { key: 'wind-gusts', heading: 'wind-gusts', count: 0 },
      { key: null, heading: NEUTRAL_FINDINGS_DISPLAY_NAME, count: 0 },
    ]);
    expect(assembled.total).toBe(0);
  });

  it('counts every unread section null and totals null', () => {
    const assembled = assembleDigest<BulletinFinding>({
      findings: [],
      categories: CATEGORIES,
    });

    expect(countsOf(assembled.sections)).toStrictEqual([
      { key: 'rainfall', heading: 'Rainfall', count: null },
      { key: 'river-levels', heading: 'River levels', count: null },
      { key: 'wind-gusts', heading: 'wind-gusts', count: null },
      { key: null, heading: NEUTRAL_FINDINGS_DISPLAY_NAME, count: null },
    ]);
    expect(assembled.total).toBeNull();
  });

  // The section under no category exists whether or not a domain
  // declared anything, so a digest always has somewhere to put a
  // finding. Asserted over a domain with no taxonomy at all, which
  // is the only input where that section is the whole list.
  it('still answers the section no domain declares', () => {
    const assembled = assembleDigest({ findings: [], categories: [] });

    expect(assembled.sections.map((section) => section.key))
      .toStrictEqual([null]);
  });
});

describe('a selection whose findings are none of them scored', () => {
  /** Three unscored findings, offered newest last. */
  const UNSCORED: readonly BulletinFinding[] = [
    finding(11, null, ELEVEN, 'rainfall'),
    finding(12, null, ONE, 'rainfall'),
    finding(13, null, NOON, 'rainfall'),
  ];

  // Every score absent means the primary key separates nothing, so
  // the whole order comes from the stamp. What this rules out is an
  // implementation reading absence as zero: zeros tie exactly as
  // nulls do here, so the ORDER is the same and only a case pinning
  // the count and the section beside it would tell them apart —
  // which is the next case.
  it('falls through to the stamp, newest first', () => {
    expect(idsOf(orderFindings(UNSCORED))).toStrictEqual([12, 13, 11]);
  });

  // The reading that does tell absence from zero: an unscored
  // finding sorts BEHIND a finding scored zero, because zero is a
  // measurement and absence is not. Dated so the stamp would put the
  // unscored one first if the scores had tied, which is what makes
  // the case about the score rather than about the order it was
  // offered in.
  it('sorts an unscored finding behind a measured zero', () => {
    const offered: readonly BulletinFinding[] = [
      finding(21, null, ONE, 'rainfall'),
      finding(22, 0, ELEVEN, 'rainfall'),
    ];

    expect(idsOf(orderFindings(offered))).toStrictEqual([22, 21]);
  });

  // A whole digest over the unscored set, so the claim covers the
  // count and the total as well as the order. Both are numbers: the
  // pass read this section and found three findings in it, and
  // nothing about their scores changes that.
  it('counts and totals them like any other findings', () => {
    const assembled = assembleDigest<BulletinFinding>({
      findings: UNSCORED,
      categories: CATEGORIES,
      sectionsRead: ALL_SECTIONS,
    });
    const rainfall = assembled.sections
      .find((section) => section.key === 'rainfall');

    expect(rainfall?.count).toBe(3);
    expect(idsOf(rainfall?.findings ?? [])).toStrictEqual([12, 13, 11]);
    expect(assembled.total).toBe(3);
  });
});

describe('a category key no finding in the period carries', () => {
  /** Everything the pass selected, all of it under one category. */
  const ONE_CATEGORY: readonly BulletinFinding[] = [
    finding(31, 4, NOON, 'rainfall'),
  ];

  // The pair the whole rule is about, over one input: the two
  // categories nothing was filed under answer differently because
  // one of them was read and the other was not.
  it('is zero when read and null when it was not', () => {
    const assembled = assembleDigest<BulletinFinding>({
      findings: ONE_CATEGORY,
      categories: CATEGORIES,
      sectionsRead: ['rainfall', 'river-levels', null],
    });

    expect(countsOf(assembled.sections)).toStrictEqual([
      { key: 'rainfall', heading: 'Rainfall', count: 1 },
      { key: 'river-levels', heading: 'River levels', count: 0 },
      { key: 'wind-gusts', heading: 'wind-gusts', count: null },
      { key: null, heading: NEUTRAL_FINDINGS_DISPLAY_NAME, count: 0 },
    ]);
    expect(assembled.total).toBe(1);
  });

  // An empty section is a section, not an absence: a renderer laying
  // the digest out reaches the domain's categories in the order they
  // were declared whether or not each holds anything.
  it('keeps its place in the declared section order', () => {
    const assembled = assembleDigest<BulletinFinding>({
      findings: ONE_CATEGORY,
      categories: CATEGORIES,
      sectionsRead: ALL_SECTIONS,
    });

    expect(assembled.sections.map((section) => section.key))
      .toStrictEqual(['rainfall', 'river-levels', 'wind-gusts', null]);
  });

  // The claim a coverage list cannot override. A caller that named
  // no section read still gets a number for the section its own rows
  // landed in — the findings are evidence and the list is an
  // assertion.
  it('is counted anyway when findings landed in it', () => {
    const assembled = assembleDigest<BulletinFinding>({
      findings: ONE_CATEGORY,
      categories: CATEGORIES,
    });

    expect(countsOf(assembled.sections)).toStrictEqual([
      { key: 'rainfall', heading: 'Rainfall', count: 1 },
      { key: 'river-levels', heading: 'River levels', count: null },
      { key: 'wind-gusts', heading: 'wind-gusts', count: null },
      { key: null, heading: NEUTRAL_FINDINGS_DISPLAY_NAME, count: null },
    ]);
    expect(assembled.total).toBe(1);
  });
});

describe('a previous run whose errors are not a list', () => {
  // The column is unannotated jsonb whose NOT NULL is a default
  // rather than a check on what goes in it, so a non-list is
  // storable. It is carried as the single entry of a banner marked
  // not well formed: whatever wrote it is itself a fault, and
  // dropping it would make that run look clean.
  it('carries the whole value as one entry', () => {
    expect(previousRunBanner('the source refused')).toStrictEqual({
      entries: ['the source refused'],
      wellFormed: false,
    });
    expect(previousRunBanner({ node: 'Fetch Source' })).toStrictEqual({
      entries: [{ node: 'Fetch Source' }],
      wellFormed: false,
    });
    expect(previousRunBanner(0)).toStrictEqual({
      entries: [0],
      wellFormed: false,
    });
  });

  // The three shapes that are genuinely nothing to report, kept
  // apart from the case above: a column that was never written, one
  // holding the empty list it defaults to, and an input that named
  // no previous run at all.
  it('answers nothing for an absent or empty errors value', () => {
    expect(previousRunBanner(null)).toBeNull();
    expect(previousRunBanner(undefined)).toBeNull();
    expect(previousRunBanner([])).toBeNull();
  });

  // A list with entries, copied rather than aliased, so a caller
  // pushing onto its own array afterwards cannot reach inside a
  // banner this function already answered.
  it('copies a list of entries rather than aliasing it', () => {
    const recorded: unknown[] = [{ node: 'Fetch Source' }];
    const banner = previousRunBanner(recorded);

    recorded.push({ node: 'Score Findings' });

    expect(banner).toStrictEqual({
      entries: [{ node: 'Fetch Source' }],
      wellFormed: true,
    });
  });

  // The same four readings reached through the assembly, since that
  // is where a digest actually gets its banner and a wiring mistake
  // there would leave every case above passing over a function
  // nothing calls.
  it('reaches a digest through the assembly unchanged', () => {
    const malformed = assembleDigest({
      findings: [],
      categories: [],
      previousErrors: 'the source refused',
    });
    const quiet = assembleDigest({ findings: [], categories: [] });

    expect(malformed.banner).toStrictEqual({
      entries: ['the source refused'],
      wellFormed: false,
    });
    expect(quiet.banner).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The ordering, key by key
// ---------------------------------------------------------------------------

describe('orderFindings takes the three keys in turn', () => {
  // The primary key. Offered worst first so a function that answered
  // its input unchanged would fail, and mixing a numeric string in
  // with the numbers because a `numeric` column reaching a Code node
  // through a Postgres node arrives as one rather than lose digits.
  it('takes the best score first, string or number', () => {
    const offered: readonly BulletinFinding[] = [
      finding(41, 1, NOON),
      finding(42, '9.5', NOON),
      finding(43, 4, NOON),
    ];

    expect(idsOf(orderFindings(offered))).toStrictEqual([42, 43, 41]);
  });

  // The second key, over one score so the first separates nothing.
  // Both stamp shapes in one list: a `Date` for a caller reading
  // through drizzle and a string for one reading through a node.
  it('breaks a tied score on the stamp, newest first', () => {
    const offered: readonly BulletinFinding[] = [
      finding(51, 3, new Date(ELEVEN)),
      finding(52, 3, ONE),
      finding(53, 3, new Date(NOON)),
    ];

    expect(idsOf(orderFindings(offered))).toStrictEqual([52, 53, 51]);
  });

  // The third key, over one score and one stamp. Descending, which
  // is the tiebreak agreeing with the stamp rather than a second
  // unrelated rule: `findings.id` is a bigserial, so among rows
  // sharing a moment the larger id is the later insert.
  it('breaks a tied stamp on the id, later row first', () => {
    const offered: readonly BulletinFinding[] = [
      finding(61, 3, NOON),
      finding(63, 3, NOON),
      finding(62, 3, NOON),
    ];

    expect(idsOf(orderFindings(offered))).toStrictEqual([63, 62, 61]);
  });

  // Ids crossing a JSON boundary arrive as strings, and a string
  // comparison puts 9 after 10. The pair is chosen so the two
  // readings disagree: numerically 9 is below 10, as text it is
  // above it.
  it('compares ids as numbers when both read as ones', () => {
    const offered: readonly BulletinFinding[] = [
      finding('9', 3, NOON),
      finding('10', 3, NOON),
    ];

    expect(idsOf(orderFindings(offered))).toStrictEqual(['10', '9']);
  });

  // A stamp that is not a moment is absence rather than the epoch. A
  // stamp read as zero would sort its finding as the oldest thing in
  // the section on the strength of a value nobody wrote, which is
  // the same fault as an unscored finding read as a zero one key up.
  it('sorts an unreadable stamp behind readable ones', () => {
    const offered: readonly BulletinFinding[] = [
      finding(71, 3, 'not a moment'),
      finding(72, 3, ELEVEN),
      finding(73, 3, null),
    ];

    expect(idsOf(orderFindings(offered))).toStrictEqual([72, 73, 71]);
  });

  // The comparator is exported because more than one thing has to
  // agree with it — the selection statement orders in SQL over the
  // same three columns before this module sees a row. Driven here on
  // its own so a wiring mistake in `orderFindings` cannot answer for
  // it.
  it('is the same comparator orderFindings sorts by', () => {
    const better = finding(81, 5, NOON);
    const worse = finding(82, 1, NOON);

    expect(compareFindings(better, worse)).toBeLessThan(0);
    expect(compareFindings(worse, better)).toBeGreaterThan(0);
    expect(compareFindings(better, better)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Sectioning, and the vocabulary a heading is taken from
// ---------------------------------------------------------------------------

describe('assembleDigest files each finding under a section', () => {
  /** One finding per way of naming, or not naming, a category. */
  const MIXED: readonly BulletinFinding[] = [
    finding(91, 8, NOON, 'rainfall'),
    finding(92, 7, NOON, null),
    finding(93, 6, NOON, 'landslides'),
    finding(94, 5, NOON),
  ];

  // The three ways a finding fails to name a declared section share
  // one section rather than being dropped or split, because the
  // alternative is a digest that quietly loses a scored finding. The
  // whole section is asserted, objects included, so the passthrough
  // claim rides along: these are the rows the caller handed in.
  it('puts an absent, null or unknown key under none', () => {
    const assembled = assembleDigest<BulletinFinding>({
      findings: MIXED,
      categories: CATEGORIES,
      sectionsRead: ALL_SECTIONS,
    });

    expect(assembled.sections.at(-1)).toStrictEqual({
      key: null,
      heading: NEUTRAL_FINDINGS_DISPLAY_NAME,
      count: 3,
      findings: [MIXED[1], MIXED[2], MIXED[3]],
    });
  });

  // Section order is the caller's, category by category, with the
  // one section no domain declared last: a renderer reading the list
  // in order reaches the domain's own taxonomy before the remainder.
  it('answers the declared order with none last', () => {
    const assembled = assembleDigest<BulletinFinding>({
      findings: MIXED,
      categories: CATEGORIES,
      sectionsRead: ALL_SECTIONS,
    });

    expect(countsOf(assembled.sections)).toStrictEqual([
      { key: 'rainfall', heading: 'Rainfall', count: 1 },
      { key: 'river-levels', heading: 'River levels', count: 0 },
      { key: 'wind-gusts', heading: 'wind-gusts', count: 0 },
      { key: null, heading: NEUTRAL_FINDINGS_DISPLAY_NAME, count: 3 },
    ]);
    expect(assembled.total).toBe(4);
  });
});

describe('the heading vocabulary a domain supplies', () => {
  // The alias reaches the digest and the one section nothing else
  // names, and it is carried through as the operator wrote it —
  // spacing, casing and all. Repairing a label is what leaves
  // somebody looking at text they did not write.
  it('heads the digest and the section under none', () => {
    const assembled = assembleDigest<BulletinFinding>({
      findings: [],
      categories: [],
      settings: { findingsDisplayName: 'Signals' },
    });

    expect(assembled.displayName).toBe('Signals');
    expect(assembled.sections.map((section) => section.heading))
      .toStrictEqual(['Signals']);
  });

  // Three ways of declaring no alias, all falling back to the one
  // word this module supplies. The blank string is the one worth
  // pinning: a heading made of spaces is a heading nobody can see.
  it('falls back for an absent, blank or wrong value', () => {
    const wrongType = { findingsDisplayName: 7 } as unknown as {
      findingsDisplayName?: string;
    };

    expect(displayNameFor()).toBe(NEUTRAL_FINDINGS_DISPLAY_NAME);
    expect(displayNameFor(null)).toBe(NEUTRAL_FINDINGS_DISPLAY_NAME);
    expect(displayNameFor({})).toBe(NEUTRAL_FINDINGS_DISPLAY_NAME);
    expect(displayNameFor({ findingsDisplayName: '   ' }))
      .toBe(NEUTRAL_FINDINGS_DISPLAY_NAME);
    expect(displayNameFor(wrongType)).toBe(NEUTRAL_FINDINGS_DISPLAY_NAME);
  });

  // Carried verbatim rather than trimmed, which is the same refusal
  // to repair, read from the other side.
  it('carries a declared alias through unchanged', () => {
    expect(displayNameFor({ findingsDisplayName: ' rain signal ' }))
      .toBe(' rain signal ');
  });

  // A category heads its section with its label when it wrote one
  // and with its key otherwise. Both are already read by the section
  // cases above; this pins the fallback against a label that is
  // present and blank, which no other case reaches.
  it('heads a section by its key when the label is blank', () => {
    const blank: readonly DigestCategory[] = [
      { key: 'rainfall', label: '  ' },
      { key: 'river-levels', label: null },
    ];
    const assembled = assembleDigest({ findings: [], categories: blank });

    expect(assembled.sections.map((section) => section.heading))
      .toStrictEqual([
        'rainfall',
        'river-levels',
        NEUTRAL_FINDINGS_DISPLAY_NAME,
      ]);
  });
});

// ---------------------------------------------------------------------------
// The guards that keep an answer from reaching back into its input
// ---------------------------------------------------------------------------

describe('nothing an assembly answers is the input it was given', () => {
  // A caller handing one list to two calls would otherwise find the
  // second reading an order the first imposed. Asserted on the input
  // rather than on the answer, which is the only place the mutation
  // would show.
  it('leaves the list it was handed in its own order', () => {
    const offered: BulletinFinding[] = [
      finding(101, 1, NOON),
      finding(102, 9, NOON),
    ];

    orderFindings(offered);

    expect(idsOf(offered)).toStrictEqual([101, 102]);
  });

  // The other half: the findings inside a section are the objects
  // that came in, so a renderer reading a member this module never
  // heard of finds it where it was.
  it('answers with the finding objects it was handed', () => {
    const offered: readonly BulletinFinding[] = [
      finding(111, 3, NOON, 'rainfall'),
    ];
    const assembled = assembleDigest<BulletinFinding>({
      findings: offered,
      categories: CATEGORIES,
      sectionsRead: ALL_SECTIONS,
    });
    const rainfall = assembled.sections
      .find((section) => section.key === 'rainfall');

    expect(rainfall?.findings.at(0)).toBe(offered.at(0));
    expect(rainfall?.findings.at(0)?.note).toBe('note 111');
  });

  // A list this module was never handed at all. Every declared type
  // says these are arrays and none of them is trusted, because the
  // whole input crosses a JSON boundary on its way into a Code node
  // — where a type is a claim about the query rather than about what
  // arrived.
  it('reads an absent list as an empty one', () => {
    const nothing = {} as unknown as {
      findings: readonly BulletinFinding[];
      categories: readonly DigestCategory[];
    };
    const assembled = assembleDigest(nothing);

    expect(countsOf(assembled.sections)).toStrictEqual([
      { key: null, heading: NEUTRAL_FINDINGS_DISPLAY_NAME, count: null },
    ]);
    expect(assembled.total).toBeNull();
    expect(assembled.banner).toBeNull();
  });
});
