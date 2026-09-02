/**
 * Cases for `./markdown-body.ts`: the composition both markdown
 * renderers share, driven edge-first.
 *
 * THE EDGES COME BEFORE THE ORDINARY COMPOSITION, and the ordering is
 * the point rather than a filing convention. A composer is easy to
 * write so that it reads well over a full digest and quietly says the
 * wrong thing over an empty one — a heading with nothing under it, a
 * zero where nobody looked, a blank paragraph where no prose was
 * written. So the empty findings list, the undrafted briefing, the
 * finding whose text is markup and the section nobody read for are
 * driven first, and the whole-document case comes after them.
 *
 * WHAT IS PINNED IS BYTES, not a property of them. Every case below
 * compares a composed document against the text it should be, because
 * a renderer's output is read by a person and a case asserting only
 * that a heading is `present somewhere` passes over a document whose
 * blocks ran together. The one exception is
 * {@link MARKUP_FIELDS}, where the expected text is what
 * `sanitizeUntrusted` answered rather than anything this file
 * decides — those cases assert the neutralization reached the body
 * and that the words survived it.
 *
 * THE MARKERS ARE HELD AGAINST WHAT THE CASES REACHED. Four constants
 * are wording this module supplies rather than anything stored, and a
 * marker no case reaches is a layout branch nothing drives.
 * {@link composeOne} records every document it produced and the guard
 * at the foot holds the four against that record, with a fabricated
 * fifth asserted absent so the reading is shown discriminating.
 *
 * The fixture is a rainfall bulletin, which is the neutral subject
 * `./index.test.ts` already uses for the same four rows.
 */
import type {
  ExportBriefingRow,
  ExportDomainRow,
  ExportFindingRow,
  ExportRenderInput,
  ExportSubscriptionRow,
} from './index.js';

import { describe, expect, it } from 'vitest';

import {
  MALFORMED_ERRORS_NOTE,
  PREVIOUS_RUN_BANNER_HEADING,
  UNNAMED_SECTION_HEADING,
  UNREADABLE_MEMBER,
  composeMarkdownBody,
} from './markdown-body.js';

/** The domain the fixture belongs to. */
const RAINFALL_DOMAIN = {
  id: 4,
  slug: 'rainfall-bulletin',
  name: 'Rainfall bulletin',
  settings: { findingsDisplayName: 'Readings' },
} satisfies ExportDomainRow;

/** The standing request these renders answer. */
const STANDING_SUBSCRIPTION = {
  id: 7,
  domainId: RAINFALL_DOMAIN.id,
  format: 'obsidian_md',
  connectorId: 3,
} satisfies ExportSubscriptionRow;

/**
 * The findings the pass selected, one scored zero and one not scored.
 *
 * Handed in every input below and read by nothing: the composer takes
 * its findings out of the stored payload. A case asserts that, which
 * is why the list is here rather than empty.
 */
const SELECTED_FINDINGS = [
  {
    id: 501,
    domainId: RAINFALL_DOMAIN.id,
    documentId: 88,
    entityId: null,
    fields: { gauge: 'north ridge' },
    score: 0,
    scoreVersion: 2,
    createdAt: new Date('2026-08-29T06:00:00.000Z'),
  },
  {
    id: 502,
    domainId: RAINFALL_DOMAIN.id,
    documentId: 89,
    entityId: 17,
    fields: { gauge: 'south flat' },
    score: null,
    scoreVersion: null,
    createdAt: new Date('2026-08-29T07:00:00.000Z'),
  },
] satisfies readonly ExportFindingRow[];

/** The briefing every case varies two members of. */
const STORED_BRIEFING = {
  id: 11,
  domainId: RAINFALL_DOMAIN.id,
  runId: 90,
  body: 'Two gauges reported and one did not.',
  payload: null,
  generatedAt: new Date('2026-08-30T00:00:00.000Z'),
} satisfies ExportBriefingRow;

/**
 * The stored assembly a whole digest is composed from.
 *
 * Two sections, and the pairing is the fixture's discrimination: the
 * first was read and holds two findings, the second was read and
 * holds none, so a `0` that should be there and a `(0)` that should
 * not be a blank are both in one document. The findings repeat the
 * scored-zero and unscored pair for the same reason.
 */
const STORED_ASSEMBLY = {
  displayName: 'Readings',
  sections: [
    {
      key: 'gauges',
      heading: 'Gauges',
      count: 2,
      findings: [
        { id: 501, score: 0, fields: { mm: 0, gauge: 'north ridge' } },
        { id: 502, score: null, fields: { gauge: 'south flat' } },
      ],
    },
    { key: null, heading: 'Readings', count: 0, findings: [] },
  ],
  total: 2,
  banner: { entries: ['ingest refused a feed'], wellFormed: true },
};

/**
 * Field values that are markup rather than prose.
 *
 * Every form `sanitizeUntrusted` neutralizes, plus a line break,
 * which is this module's own fold rather than the sanitizer's. What
 * the cases assert is that each arrives DISPLAYED and not able to
 * act, and that no one of them ends the bullet it sits in.
 */
const MARKUP_FIELDS = {
  heading: '# Not a heading',
  graph: '[[Vault Note]]',
  embed: '![alt](https://example.test/p.png)',
  tag: 'before <b>bold</b> after',
  link: 'see https://example.test/x',
  rule: '---',
  wrapped: 'line one\nline two',
};

/**
 * Every document a case composed, for the marker guard at the foot.
 *
 * Accumulated rather than declared a second time, because the claim
 * is about what the cases DID. vitest runs describe blocks in
 * declaration order, so the guard reads a full record.
 */
const COMPOSED: string[] = [];

/**
 * One composed body, recorded on the way past.
 *
 * @param body - The briefing prose, or `null` for an undrafted one.
 * @param payload - The stored payload, unvalidated by anything.
 * @param headingDepth - The depth a renderer heads sections at.
 * @returns The composed markdown body.
 */
function composeOne(
  body: string | null,
  payload: unknown,
  headingDepth = 2,
): string {
  const briefing = { ...STORED_BRIEFING, body, payload };
  const input = {
    domain: RAINFALL_DOMAIN,
    briefing,
    findings: SELECTED_FINDINGS,
    subscription: STANDING_SUBSCRIPTION,
  } satisfies ExportRenderInput;
  const composed = composeMarkdownBody(input, { headingDepth });

  COMPOSED.push(composed);

  return composed;
}

/**
 * One stored assembly holding a single section.
 *
 * @param count - The section count, `null` for one nobody read.
 * @param findings - The findings under it.
 * @returns A payload of the assembly's own shape.
 */
function oneSection(
  count: number | null,
  findings: readonly unknown[],
): unknown {
  return {
    sections: [{ key: 'gauges', heading: 'Gauges', count, findings }],
  };
}

/**
 * The four constants this module supplies wording for.
 *
 * Held against what the cases reached, at the foot. Imported rather
 * than spelt again here: a second spelling would be a second
 * authority, and a wording change would leave the guard reading for
 * text the module no longer writes.
 */
const MARKERS = [
  MALFORMED_ERRORS_NOTE,
  PREVIOUS_RUN_BANNER_HEADING,
  UNNAMED_SECTION_HEADING,
  UNREADABLE_MEMBER,
];

/**
 * Whether any document a case composed carries this marker.
 *
 * A named function rather than a callback written at the call site,
 * which keeps every use of it one line.
 *
 * @param marker - The text to look for.
 * @returns Whether some composed document carries it.
 */
function reachedByACase(marker: string): boolean {
  return COMPOSED.some((composed) => composed.includes(marker));
}

/**
 * The whole digest, as the fixture above composes at depth two.
 *
 * Written as lines so the blank ones are visible: a block separator
 * is what a case comparing two run-together documents would miss,
 * and it is exactly what a composer gets wrong.
 */
const WHOLE_DIGEST = [
  'Two gauges reported and one did not.',
  '',
  '## Gauges (2)',
  '',
  '- 501 (score 0)',
  '  - gauge: north ridge',
  '  - mm: 0',
  '- 502',
  '  - gauge: south flat',
  '',
  '## Readings (0)',
  '',
  '## Errors from the previous run (1)',
  '',
  '- ingest refused a feed',
  '',
].join('\n');

/** {@link MARKUP_FIELDS} under one heading, as it composes. */
const MARKUP_DIGEST = [
  '## Gauges (1)',
  '',
  '- 7',
  '  - embed: `[image link removed: alt](https://example.test/p.png)`',
  '  - graph: [\\[Vault Note]]',
  '  - heading: \\# Not a heading',
  '  - link: see `https://example.test/x`',
  '  - rule: \\---',
  '  - tag: before bold after',
  '  - wrapped: line one line two',
  '',
].join('\n');

/**
 * A marker no branch answers, assembled from parts so that a marker
 * genuinely spelt this way would still appear nowhere in this file.
 */
const ABSENT_MARKER = ['(un', 'counted', ')'].join('');

// ---------------------------------------------------------------------------
// The edges, which are what a composer gets wrong
// ---------------------------------------------------------------------------

describe('a section holding no findings', () => {
  it('is its heading and nothing else', () => {
    expect(composeOne(null, oneSection(0, []))).toBe('## Gauges (0)\n');
  });

  it('stays empty over an input carrying findings', () => {
    // The composer reads the stored sections, never the rows beside
    // them: both fixture findings are in the input and neither is in
    // the document.
    const composed = composeOne(null, oneSection(0, []));

    expect(SELECTED_FINDINGS).toHaveLength(2);
    expect(composed).not.toContain('501');
    expect(composed).not.toContain('502');
  });
});

describe('a briefing nobody drafted prose for', () => {
  it('opens at the first heading and not a blank block', () => {
    const composed = composeOne(null, STORED_ASSEMBLY);

    expect(composed.startsWith('## Gauges (2)')).toBe(true);
  });

  it('is the drafted body with the prose block removed', () => {
    // The one pin that says a NULL body writes no heading, no blank
    // paragraph and no placeholder: the drafted document is this one
    // with prose and a separator in front, exactly.
    const drafted = composeOne(STORED_BRIEFING.body, STORED_ASSEMBLY);
    const undrafted = composeOne(null, STORED_ASSEMBLY);

    expect(drafted).toBe(STORED_BRIEFING.body + '\n\n' + undrafted);
  });

  it('composes nothing at all with no structure either', () => {
    expect(composeOne(null, null)).toBe('');
  });
});

describe('a section count that is null', () => {
  it('renders as an absence rather than as a zero', () => {
    const unread = composeOne(null, oneSection(null, []));
    const empty = composeOne(null, oneSection(0, []));

    expect(unread).toBe('## Gauges\n');
    expect(empty).toBe('## Gauges (0)\n');
    expect(unread).not.toBe(empty);
  });

  it('takes a count that is not a number as an absence', () => {
    // The safe direction: a count nobody can read is a reading
    // nobody took, never a bucket read and found empty.
    const payload = {
      sections: [{ key: 'g', heading: 'Gauges', count: 'two', findings: [] }],
    };

    expect(composeOne(null, payload)).toBe('## Gauges\n');
  });

  it('leaves out a field whose stored value is an absence', () => {
    // The same law one layer down: a key with nothing after it reads
    // as a field somebody measured and found empty.
    const fields = { gauge: null, mm: 3 };
    const payload = oneSection(1, [{ id: 9, fields }]);
    const composed = composeOne(null, payload);

    expect(composed).not.toContain('gauge:');
    expect(composed).toContain('  - mm: 3');
  });

  it('keeps an unscored finding off the parentheses too', () => {
    const scored = oneSection(1, [{ id: 9, score: 0 }]);
    const unscored = oneSection(1, [{ id: 9, score: null }]);

    expect(composeOne(null, scored)).toContain('- 9 (score 0)');
    expect(composeOne(null, unscored)).toContain('- 9\n');
  });
});

describe('a finding whose text is markup rather than prose', () => {
  it('neutralizes every form and keeps every word', () => {
    const payload = oneSection(1, [{ id: 7, fields: MARKUP_FIELDS }]);

    expect(composeOne(null, payload)).toBe(MARKUP_DIGEST);
  });

  it('leaves no value able to end the bullet it sits in', () => {
    const payload = oneSection(1, [{ id: 7, fields: MARKUP_FIELDS }]);
    const lines = composeOne(null, payload).split('\n')
      .filter((line) => line !== '');
    const fieldLines = lines.filter((line) => line.startsWith('  - '));

    // One heading, one bullet, one line per field: a value carrying a
    // line break would show up here as an extra line.
    expect(lines).toHaveLength(2 + Object.keys(MARKUP_FIELDS).length);
    expect(fieldLines).toHaveLength(Object.keys(MARKUP_FIELDS).length);
  });

  it('neutralizes the prose exactly as it does a field', () => {
    // The prose is reduced too, and it is the one place a line break
    // survives — so the escape is all that changes here.
    expect(composeOne('# Not a heading', null)).toBe('\\# Not a heading\n');
  });

  it('carries no active embed and no bare link', () => {
    const payload = oneSection(1, [{ id: 7, fields: MARKUP_FIELDS }]);
    const composed = composeOne(null, payload);

    expect(composed).not.toContain('![');
    expect(composed).toContain('image link removed');
    expect(composed).toContain('`https://example.test/x`');
  });
});

// ---------------------------------------------------------------------------
// The banner, which is present only when the run recorded something
// ---------------------------------------------------------------------------

describe('the previous run banner', () => {
  it('is absent when the run recorded nothing', () => {
    expect(composeOne(null, { sections: [] })).toBe('');
  });

  it('is absent when the entries list is empty', () => {
    const payload = { banner: { entries: [], wellFormed: true } };

    expect(composeOne(null, payload)).toBe('');
  });

  it('is absent when the banner is not the shape stored', () => {
    // A heading with nothing under it is the state a nullable banner
    // exists to avoid, so every unreadable shape answers no section.
    expect(composeOne(null, { banner: 'boom' })).toBe('');
    expect(composeOne(null, { banner: { entries: 'boom' } })).toBe('');
  });

  it('carries one bullet per entry, counted', () => {
    const payload = { banner: { entries: ['first', 'second'] } };
    const heading = '## ' + PREVIOUS_RUN_BANNER_HEADING + ' (2)';

    expect(composeOne(null, payload)).toBe(
      heading + '\n\n- first\n- second\n',
    );
  });

  it('says so when the shape was not the one expected', () => {
    const entries = [{ code: 'ENOENT' }];
    const sound = composeOne(null, { banner: { entries } });
    const shaky = { banner: { entries, wellFormed: false } };
    const marked = composeOne(null, shaky);
    const extra = marked.split('\n')
      .filter((line) => !sound.includes(line));

    // The malformed document is the sound one plus exactly the note,
    // which is what says the entry itself is carried either way.
    expect(extra).toStrictEqual([MALFORMED_ERRORS_NOTE]);
  });

  it('does not accuse a payload that says nothing of it', () => {
    const payload = { banner: { entries: ['first'] } };

    expect(composeOne(null, payload)).not.toContain(MALFORMED_ERRORS_NOTE);
  });
});

// ---------------------------------------------------------------------------
// The ordinary composition
// ---------------------------------------------------------------------------

describe('a whole stored digest', () => {
  it('lays out the prose, the sections and the banner', () => {
    const composed = composeOne(STORED_BRIEFING.body, STORED_ASSEMBLY);

    expect(composed).toBe(WHOLE_DIGEST);
  });

  it('sorts the fields rather than reproducing their order', () => {
    // The fixture writes `mm` before `gauge`; the document does not.
    const composed = composeOne(null, STORED_ASSEMBLY);

    expect(composed.indexOf('gauge:')).toBeLessThan(composed.indexOf('mm:'));
  });
});

// ---------------------------------------------------------------------------
// The guards: what a later edit has to keep true
// ---------------------------------------------------------------------------

describe('what a later edit has to keep true', () => {
  it('answers the same bytes twice over one input', () => {
    const first = composeOne(STORED_BRIEFING.body, STORED_ASSEMBLY);
    const second = composeOne(STORED_BRIEFING.body, STORED_ASSEMBLY);

    expect(second).toBe(first);
  });

  it('writes nothing into the input it was handed', () => {
    const briefing = { ...STORED_BRIEFING, payload: STORED_ASSEMBLY };
    const input = {
      domain: RAINFALL_DOMAIN,
      briefing,
      findings: SELECTED_FINDINGS,
      subscription: STANDING_SUBSCRIPTION,
    } satisfies ExportRenderInput;
    const before = JSON.stringify(input);

    composeMarkdownBody(input, { headingDepth: 2 });

    expect(JSON.stringify(input)).toBe(before);
  });

  it('heads sections at the depth the renderer asked for', () => {
    const shallow = composeOne(null, oneSection(0, []), 2);
    const deep = composeOne(null, oneSection(0, []), 3);

    expect(shallow).toBe('## Gauges (0)\n');
    expect(deep).toBe('### Gauges (0)\n');
  });

  it('clamps a depth markdown cannot carry', () => {
    // A renderer literal being wrong answers a document one level
    // off rather than a render that failed.
    expect(composeOne(null, oneSection(0, []), 0)).toBe('# Gauges (0)\n');
    expect(composeOne(null, oneSection(0, []), 9)).toBe(
      '###### Gauges (0)\n',
    );
    expect(composeOne(null, oneSection(0, []), Number.NaN)).toBe(
      '# Gauges (0)\n',
    );
  });

  it('composes the prose alone when there is no assembly', () => {
    // A briefing written by hand has prose and no structure, and
    // assembling one here would be writing a second digest.
    expect(composeOne('Just prose.', 'not an assembly')).toBe(
      'Just prose.\n',
    );
    expect(composeOne('Just prose.', [1, 2])).toBe('Just prose.\n');
    expect(composeOne('Just prose.', 7)).toBe('Just prose.\n');
  });

  it('heads a section the payload gave no name', () => {
    const payload = { sections: [{ count: 3, findings: [] }] };
    const heading = '## ' + UNNAMED_SECTION_HEADING + ' (3)\n';

    expect(composeOne(null, payload)).toBe(heading);
  });

  it('falls back to the key when there is no heading', () => {
    const payload = { sections: [{ key: 'gauges', findings: [] }] };

    expect(composeOne(null, payload)).toBe('## gauges\n');
  });

  it('shows a value it could not read rather than dropping it', () => {
    const composed = composeOne(null, oneSection(2, [null, { score: 1 }]));
    const bullets = composed.split('\n')
      .filter((line) => line.startsWith('- '));

    expect(bullets).toHaveLength(2);
    expect(bullets[0]).toBe('- ' + UNREADABLE_MEMBER);
    expect(bullets[1]).toBe('- ' + UNREADABLE_MEMBER + ' (score 1)');
  });

  it('drops a sections entry that is not an object', () => {
    // The one thing left out, because a section is a heading and a
    // count and an entry that is neither names nothing.
    const payload = { sections: ['boom', { heading: 'Gauges', count: 0 }] };

    expect(composeOne(null, payload)).toBe('## Gauges (0)\n');
  });
});

describe('the markers this module supplies', () => {
  it('are each reached by the cases above', () => {
    const reached = MARKERS.filter(reachedByACase);

    // Both directions in one comparison: a marker no case reaches is
    // a layout branch nothing drives.
    expect(reached).toStrictEqual(MARKERS);
  });

  it('do not name one no branch answers', () => {
    // The control beside the equality above: a record that had
    // stopped discriminating satisfies it exactly as a live one does.
    expect(MARKERS).not.toContain(ABSENT_MARKER);
    expect(reachedByACase(ABSENT_MARKER)).toBe(false);
    expect(COMPOSED.length).toBeGreaterThan(0);
  });
});
