/**
 * Cases for `./email-draft.ts`: the `email_draft` renderer, driven
 * edge-first.
 *
 * TWO CLAIMS ARE WHAT THIS FILE IS FOR, and both are readings rather
 * than restatements of the header.
 *
 * THE ARTIFACT CARRIES NO ADDRESS-SHAPED MEMBER. Read as a key set
 * over every artifact the cases rendered, held against the four
 * members `ExportArtifact` declares and against a roster of the names
 * a recipient could be written under. A zero-hit scan is
 * indistinguishable from a dead one, so the same scan is fired at a
 * planted artifact carrying one of those names in the same case — and
 * the connector id the render was dispatched for is looked for in the
 * artifact by a value distinctive enough that finding it would mean
 * something.
 *
 * THE SUBJECT IS DERIVED FROM STORED VALUES ALONE. Read from both
 * ends: the subject is composed in the case out of
 * `domains.settings.findingsDisplayName` and `briefings.generated_at`
 * as the fixture rows carry them, and it is then shown NOT to move
 * when the subscription it answers moves. A subject read off a clock
 * would fail the second reading of one input rendered twice; one read
 * off the schedule would fail the subscription case; one read off the
 * host's zone would fail the late-stamp case.
 *
 * THE EDGES COME FIRST, for the reason `./obsidian-md.test.ts` gives:
 * a one-way export is easy to write so that it reads well over a full
 * digest and says the wrong thing over a quiet period. The digest
 * that came to nothing, the stamp that cannot be read, the vocabulary
 * the reduction empties and the domain slug that reduces away are all
 * driven before the whole-document case.
 *
 * THE BODY IS NOT PINNED TWICE. `./markdown-body.test.ts` owns what
 * the shared composition answers; what this file asserts is that the
 * text below the subject IS that composition, at this renderer's own
 * depth — compared against a live call rather than against a copy of
 * its output, so a change to the composer cannot leave two files
 * disagreeing about which one is right.
 *
 * The fixture is a rainfall bulletin, which is the neutral subject
 * every file in this directory already uses for the same four rows.
 */
import type {
  ExportArtifact,
  ExportBriefingRow,
  ExportDomainRow,
  ExportFindingRow,
  ExportRenderInput,
  ExportSubscriptionRow,
} from './index.js';

import { describe, expect, it } from 'vitest';

import { EXPORT_FORMATS } from '../db/schema/values.js';
import { NEUTRAL_FINDINGS_DISPLAY_NAME } from '../lib/digest-assemble.js';

import { checkArtifactPath } from './artifact-path.js';
import {
  EMAIL_DRAFT_EXTENSION,
  EMAIL_DRAFT_HEADING_DEPTH,
  EMAIL_DRAFT_MEDIA_TYPE,
  EMAIL_DRAFT_RENDERER,
  SUBJECT_HEADING_PREFIX,
  SUBJECT_SEPARATOR,
  emailDraftSubject,
  renderEmailDraft,
} from './email-draft.js';
import { composeMarkdownBody } from './markdown-body.js';

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
  format: 'email_draft',
  connectorId: 3,
} satisfies ExportSubscriptionRow;

/**
 * The same request under a connector id nothing else could answer.
 *
 * Nine digits chosen so that finding the value anywhere in an
 * artifact means the renderer put it there — the fixture's own id is
 * a single digit that any date or count could supply by accident.
 */
const TRACED_SUBSCRIPTION = {
  ...STANDING_SUBSCRIPTION,
  id: 987654320,
  connectorId: 987654321,
} satisfies ExportSubscriptionRow;

/**
 * The findings the pass selected, one scored zero and one not scored.
 *
 * Carried in every input for the reason `./index.test.ts` gives: a
 * selection whose scores are all numbers, or all null, cannot report
 * a renderer that reads absence as a zero. A case asserts the pairing
 * is still there.
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

/**
 * The stored assembly a whole digest is composed from.
 *
 * Two sections, one read and holding findings and one read and
 * holding none, which is the pairing `./markdown-body.test.ts` uses
 * for the null-vs-zero law. Repeated here rather than imported
 * because the claim in this file is about the whole draft, and a
 * fixture shared across two files is a fixture either may change.
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

/** The stored digest a whole draft is rendered from. */
const STORED_BRIEFING = {
  id: 11,
  domainId: RAINFALL_DOMAIN.id,
  runId: 90,
  body: 'Two gauges reported and one did not.',
  payload: STORED_ASSEMBLY,
  generatedAt: new Date('2026-08-30T00:00:00.000Z'),
} satisfies ExportBriefingRow;

/**
 * A briefing with neither prose nor a readable structure.
 *
 * A stored state rather than a malformed one: a pass whose drafting
 * step answered nothing, over a period that held nothing. The draft
 * for it is what says a one-way export cannot answer an absence.
 */
const QUIET_BRIEFING = {
  ...STORED_BRIEFING,
  body: null,
  payload: null,
} satisfies ExportBriefingRow;

/**
 * The same briefing with a stamp nothing can read.
 *
 * `new Date` over text it cannot parse answers a `Date` that
 * satisfies the column type and throws from `toISOString`, which is
 * the one member of the row that could turn a render into a failed
 * run.
 */
const UNSTAMPED_BRIEFING = {
  ...STORED_BRIEFING,
  generatedAt: new Date('not a moment'),
} satisfies ExportBriefingRow;

/**
 * Half an hour before midnight UTC.
 *
 * A renderer reaching for a local-time formatter answers the next day
 * on any host east of UTC, which is what this literal catches.
 */
const LATE_BRIEFING = {
  ...STORED_BRIEFING,
  generatedAt: new Date('2026-08-30T23:30:00.000Z'),
} satisfies ExportBriefingRow;

/** A domain that declares no display vocabulary at all. */
const UNVOCAL_DOMAIN = {
  ...RAINFALL_DOMAIN,
  settings: {},
} satisfies ExportDomainRow;

/**
 * A domain whose vocabulary is markup and nothing else.
 *
 * The reduction removes an angle-bracket tag whole, so this is a
 * stored value that is not blank and reduces to nothing — the state
 * the second fallback exists for.
 */
const EMPTIED_DOMAIN = {
  ...RAINFALL_DOMAIN,
  settings: { findingsDisplayName: '<b></b>' },
} satisfies ExportDomainRow;

/**
 * A domain whose vocabulary carries a heading run and a line break.
 *
 * Both halves of what a subject has to survive: the escape proves the
 * neutralization ran, and the line count proves the fold did.
 */
const HOSTILE_VOCABULARY_DOMAIN = {
  ...RAINFALL_DOMAIN,
  settings: { findingsDisplayName: '## Alert\nfrom nowhere' },
} satisfies ExportDomainRow;

/** A domain calling its findings something else entirely. */
const RESURVEYED_DOMAIN = {
  ...RAINFALL_DOMAIN,
  settings: { findingsDisplayName: 'Gauge notes' },
} satisfies ExportDomainRow;

/**
 * A domain whose slug carries every shape a path rule refuses.
 *
 * The reduction is what makes it harmless, so what the case reads off
 * this is that the reduction RAN: the folder is a slug rather than
 * the stored text.
 */
const HOSTILE_SLUG_DOMAIN = {
  ...RAINFALL_DOMAIN,
  slug: '../../etc: Rainfall\nBulletin',
} satisfies ExportDomainRow;

/** A domain whose slug reduces to nothing at all. */
const UNNAMED_DOMAIN = {
  ...RAINFALL_DOMAIN,
  slug: '???',
} satisfies ExportDomainRow;

/** What separates two lines of one artifact. */
const LINE_SEPARATOR = '\n';

/** The character an ATX heading is written with. */
const HEADING_CHARACTER = '#';

/** The four members `ExportArtifact` declares, sorted. */
const ARTIFACT_MEMBERS = ['body', 'format', 'mediaType', 'path'];

/**
 * The names a recipient could be written under.
 *
 * Written as literals rather than assembled from fragments, which is
 * the opposite of `./obsidian-md.test.ts`'s absent key and is right
 * for the opposite reason: that scan reads this FILE, where a literal
 * would answer itself, and this one reads keys the MODULE produced.
 * What the roster needs instead is a control, which the case below it
 * supplies by firing the same scan at a planted artifact.
 */
const ADDRESS_SHAPED_MEMBERS = [
  'to',
  'cc',
  'bcc',
  'from',
  'sender',
  'replyTo',
  'recipient',
  'recipients',
  'headers',
  'envelope',
];

/**
 * A header field: a name, a colon and a space, at the start of a
 * line.
 *
 * The opening line of an RFC 5322 header block has this shape, and no
 * line this module composes may. Not global: a global pattern
 * advances its own `lastIndex` under `test`, so a shared one answers
 * differently on the second call for the same input.
 */
const HEADER_FIELD_RE = /^[A-Za-z][A-Za-z0-9-]*: /;

/** A header block, for the control beside every scan that uses it. */
const PLANTED_HEADER_BLOCK = [
  'Subject: a period nobody asked for',
  'To: somebody',
  '',
  'the body',
].join(LINE_SEPARATOR);

/**
 * Every artifact a case rendered, for the guards at the foot.
 *
 * Accumulated rather than declared a second time, because the claim
 * is about what the cases DID. vitest runs describe blocks in
 * declaration order, so the guards read a full record.
 */
const RENDERED: ExportArtifact[] = [];

/**
 * The four stored rows one render is of.
 *
 * One builder for every case, so the renderer is driven over the same
 * input rather than over literals that have to be kept in step.
 *
 * @param briefing - The stored digest to render.
 * @param domain - The domain it belongs to.
 * @param subscription - The standing request it answers.
 * @returns The render input.
 */
function inputFor(
  briefing: ExportBriefingRow,
  domain: ExportDomainRow = RAINFALL_DOMAIN,
  subscription: ExportSubscriptionRow = STANDING_SUBSCRIPTION,
): ExportRenderInput {
  return {
    domain,
    briefing,
    findings: SELECTED_FINDINGS,
    subscription,
  } satisfies ExportRenderInput;
}

/**
 * The render input as it stood before any case ran.
 *
 * Captured at module load and cloned from, which is what makes the
 * purity case below able to see an IDEMPOTENT write. Every case here
 * renders the same fixture objects, so a renderer writing one fixed
 * value into one of them would already have written it by the time
 * that case ran, and a clone taken then would carry the write already
 * made.
 */
const PRISTINE_INPUT = structuredClone(inputFor(STORED_BRIEFING));

/**
 * One render, recorded on the way past.
 *
 * @param briefing - The stored digest to render.
 * @param domain - The domain it belongs to.
 * @param subscription - The standing request it answers.
 * @returns The artifacts the renderer answered.
 */
function renderWith(
  briefing: ExportBriefingRow,
  domain: ExportDomainRow = RAINFALL_DOMAIN,
  subscription: ExportSubscriptionRow = STANDING_SUBSCRIPTION,
): readonly ExportArtifact[] {
  const input = inputFor(briefing, domain, subscription);
  const artifacts = renderEmailDraft(input);

  RENDERED.push(...artifacts);

  return artifacts;
}

/**
 * The one draft a render answered, as text.
 *
 * Answers the empty string for a render that answered no artifact,
 * which every case reading this asserts the length of first.
 *
 * @param briefing - The stored digest to render.
 * @param domain - The domain it belongs to.
 * @param subscription - The standing request it answers.
 * @returns The draft, or `''` when none was answered.
 */
function draftFor(
  briefing: ExportBriefingRow,
  domain: ExportDomainRow = RAINFALL_DOMAIN,
  subscription: ExportSubscriptionRow = STANDING_SUBSCRIPTION,
): string {
  const [artifact] = renderWith(briefing, domain, subscription);

  return artifact === undefined
    ? ''
    : String(artifact.body);
}

/**
 * The one path a render answered.
 *
 * @param briefing - The stored digest to render.
 * @param domain - The domain it belongs to.
 * @returns The path, or `''` when no artifact was answered.
 */
function pathFor(
  briefing: ExportBriefingRow,
  domain: ExportDomainRow = RAINFALL_DOMAIN,
): string {
  const [artifact] = renderWith(briefing, domain);

  return artifact?.path ?? '';
}

/**
 * The subject a draft opens with, read off the document.
 *
 * Off the first line rather than through the exported reading, so the
 * cases below are about what a reader of the artifact sees. One case
 * holds the two against each other.
 *
 * @param draft - The draft text.
 * @returns The subject, without its heading prefix.
 */
function subjectOf(draft: string): string {
  const [first] = draft.split(LINE_SEPARATOR);

  return first === undefined
    ? ''
    : first.slice(SUBJECT_HEADING_PREFIX.length);
}

/**
 * Everything below the subject line and the blank under it.
 *
 * @param draft - The draft text.
 * @returns The body, or `''` when the draft is a subject alone.
 */
function bodyOf(draft: string): string {
  const lines = draft.split(LINE_SEPARATOR);

  return lines.slice(2).join(LINE_SEPARATOR);
}

/**
 * Every line of a text that is shaped like a header field.
 *
 * @param text - The text to read.
 * @returns The offending lines, in document order.
 */
function headerFieldLines(text: string): readonly string[] {
  return text.split(LINE_SEPARATOR)
    .filter((line) => HEADER_FIELD_RE.test(line));
}

/**
 * Every address-shaped name a value carries as an own key.
 *
 * @param value - The artifact, or a planted stand-in for one.
 * @returns The names found, in roster order.
 */
function addressShapedKeys(value: object): readonly string[] {
  const keys = Object.keys(value);

  return ADDRESS_SHAPED_MEMBERS.filter((member) => keys.includes(member));
}

/** The whole draft the fixture renders, written as lines. */
const WHOLE_DRAFT = [
  '# Readings 2026-08-30',
  '',
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
].join(LINE_SEPARATOR);

/** The path that draft takes: the domain folder, the day, the row. */
const WHOLE_DRAFT_PATH = 'rainfall-bulletin/2026-08-30-11.md';

/** The stored stamp, as the fixture row carries it. */
const STORED_STAMP = STORED_BRIEFING.generatedAt.toISOString();

/** The period that stamp names. */
const STORED_PERIOD = STORED_STAMP.slice(0, 10);

/** The vocabulary the fixture domain stored. */
const STORED_VOCABULARY = RAINFALL_DOMAIN.settings.findingsDisplayName;

/** The subject those two stored values compose to. */
const EXPECTED_SUBJECT = STORED_VOCABULARY + SUBJECT_SEPARATOR
  + STORED_PERIOD;

// ---------------------------------------------------------------------------
// The edges, which are what a one-way export gets wrong
// ---------------------------------------------------------------------------

describe('a digest that came to nothing', () => {
  it('is still written, as its subject line alone', () => {
    // Nothing reads the destination back, so an absent draft is
    // indistinguishable from an export that never ran.
    const draft = draftFor(QUIET_BRIEFING);

    expect(renderWith(QUIET_BRIEFING)).toHaveLength(1);
    expect(draft).toBe('# Readings 2026-08-30\n');
  });

  it('takes the same path a full digest would', () => {
    expect(pathFor(QUIET_BRIEFING)).toBe(WHOLE_DRAFT_PATH);
  });
});

describe('a stamp nothing can read', () => {
  it('leaves the period out rather than writing a blank', () => {
    expect(subjectOf(draftFor(UNSTAMPED_BRIEFING))).toBe('Readings');
  });

  it('names the draft by the row when the day is gone', () => {
    expect(pathFor(UNSTAMPED_BRIEFING)).toBe('rainfall-bulletin/11.md');
  });

  it('renders the body under it exactly as ever', () => {
    const body = bodyOf(draftFor(UNSTAMPED_BRIEFING));

    expect(body).toContain('## Gauges (2)');
    expect(body).toContain('- 501 (score 0)');
  });
});

describe('a domain slug the reduction answers nothing for', () => {
  it('answers no artifact rather than a draft at the root', () => {
    // The one refusal: `./artifact-path.ts` owns the judgement and
    // this renderer reads its answer.
    expect(renderWith(STORED_BRIEFING, UNNAMED_DOMAIN)).toHaveLength(0);
  });
});

describe('a domain slug carrying what a path rule refuses', () => {
  it('reduces it to a slug rather than refusing the draft', () => {
    const path = pathFor(STORED_BRIEFING, HOSTILE_SLUG_DOMAIN);

    expect(path).toBe('etc-rainfall-bulletin/2026-08-30-11.md');
  });
});

// ---------------------------------------------------------------------------
// The artifact, and the members it does not have
// ---------------------------------------------------------------------------

describe('the artifact list over one neutral fixture', () => {
  it('is one artifact and every member of it', () => {
    const artifacts = renderWith(STORED_BRIEFING);

    expect(artifacts).toStrictEqual([{
      format: 'email_draft',
      path: WHOLE_DRAFT_PATH,
      mediaType: EMAIL_DRAFT_MEDIA_TYPE,
      body: WHOLE_DRAFT,
    }]);
  });

  it('carries the four members a contract artifact has', () => {
    const [artifact] = renderWith(STORED_BRIEFING);
    const keys = Object.keys(artifact ?? {}).sort();

    expect(keys).toStrictEqual(ARTIFACT_MEMBERS);
  });

  it('holds a measured zero apart from an absence', () => {
    // The fixture pairing every case here rests on: a selection
    // whose scores are all numbers cannot report a renderer that
    // reads absence as a zero.
    const scores = SELECTED_FINDINGS.map((finding) => finding.score);

    expect(scores).toContain(0);
    expect(scores).toContain(null);
  });
});

describe('the members an address could be written under', () => {
  it('are named by no artifact this renderer answers', () => {
    const [artifact] = renderWith(STORED_BRIEFING);

    expect(addressShapedKeys(artifact ?? {})).toStrictEqual([]);
  });

  it('would be found by the same scan if one were there', () => {
    // The control beside the zero above: a scan that had stopped
    // discriminating answers an empty list exactly as a live one
    // does. Planted through the same helper, in the same case.
    const planted = { ...renderWith(STORED_BRIEFING)[0], to: 'somebody' };

    expect(addressShapedKeys(planted)).toStrictEqual(['to']);
    expect(ADDRESS_SHAPED_MEMBERS.length).toBeGreaterThan(0);
  });

  it('are not what the roster shares with a real one', () => {
    // The roster and the contract are disjoint, so the scan above
    // cannot be satisfied by a member an artifact legitimately has.
    const shared = ARTIFACT_MEMBERS.filter(
      (member) => ADDRESS_SHAPED_MEMBERS.includes(member),
    );

    expect(shared).toStrictEqual([]);
  });
});

describe('the connector a render was dispatched for', () => {
  it('appears in no member of the artifact', () => {
    const [artifact] = renderWith(
      STORED_BRIEFING,
      RAINFALL_DOMAIN,
      TRACED_SUBSCRIPTION,
    );
    const written = String(artifact?.path) + String(artifact?.body);

    expect(written).not.toContain(String(TRACED_SUBSCRIPTION.connectorId));
    expect(written).not.toContain(String(TRACED_SUBSCRIPTION.id));
  });

  it('would be found by the same reading if it were', () => {
    const traced = String(TRACED_SUBSCRIPTION.connectorId);

    expect('a' + traced + 'b').toContain(traced);
  });
});

describe('the lines a draft is made of', () => {
  it('open with the subject and a blank line under it', () => {
    const lines = draftFor(STORED_BRIEFING).split(LINE_SEPARATOR);

    expect(lines[0]).toBe(SUBJECT_HEADING_PREFIX + EXPECTED_SUBJECT);
    expect(lines[1]).toBe('');
  });

  it('carry no line shaped like a header field', () => {
    // Over the composition rather than over arbitrary prose: a
    // briefing whose stored body is itself a header block is text
    // this renderer shows and does not obey.
    expect(headerFieldLines(draftFor(STORED_BRIEFING))).toStrictEqual([]);
    expect(headerFieldLines(draftFor(QUIET_BRIEFING))).toStrictEqual([]);
  });

  it('would carry one if a header block were written', () => {
    const found = headerFieldLines(PLANTED_HEADER_BLOCK);

    expect(found).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// The subject, and the two stored values it comes out of
// ---------------------------------------------------------------------------

describe('the subject a draft carries', () => {
  it('is the stored vocabulary and the stored period', () => {
    // Composed in the case out of the two fixture ROWS rather than
    // out of a second literal, so a member read off anything else
    // fails here.
    expect(subjectOf(draftFor(STORED_BRIEFING))).toBe(EXPECTED_SUBJECT);
    expect(EXPECTED_SUBJECT).toBe('Readings 2026-08-30');
  });

  it('is what the exported reading answers', () => {
    const through = emailDraftSubject(inputFor(STORED_BRIEFING));

    expect(through).toBe(subjectOf(draftFor(STORED_BRIEFING)));
  });

  it('moves with the vocabulary the domain stored', () => {
    const draft = draftFor(STORED_BRIEFING, RESURVEYED_DOMAIN);

    expect(subjectOf(draft)).toBe('Gauge notes ' + STORED_PERIOD);
  });

  it('takes the neutral word when the domain names none', () => {
    const draft = draftFor(STORED_BRIEFING, UNVOCAL_DOMAIN);
    const neutral = NEUTRAL_FINDINGS_DISPLAY_NAME;
    const expected = neutral + SUBJECT_SEPARATOR + STORED_PERIOD;

    expect(subjectOf(draft)).toBe(expected);
  });

  it('takes it again when the reduction empties one', () => {
    // A stored value that is not blank and reduces to nothing, which
    // is what the second fallback exists for.
    const draft = draftFor(STORED_BRIEFING, EMPTIED_DOMAIN);
    const neutral = NEUTRAL_FINDINGS_DISPLAY_NAME;
    const expected = neutral + SUBJECT_SEPARATOR + STORED_PERIOD;

    expect(subjectOf(draft)).toBe(expected);
  });

  it('neutralizes a vocabulary written as markup', () => {
    const domain = HOSTILE_VOCABULARY_DOMAIN;
    const subject = subjectOf(draftFor(STORED_BRIEFING, domain));

    expect(subject.startsWith(HEADING_CHARACTER)).toBe(false);
    expect(subject).toContain('Alert');
  });

  it('folds a vocabulary carrying a line break', () => {
    // A LINE COUNT rather than a whole-document comparison: a
    // missing fold ends the heading early and leaves the rest of the
    // vocabulary standing as a block of its own, which is one extra
    // line and nothing else.
    const draft = draftFor(STORED_BRIEFING, HOSTILE_VOCABULARY_DOMAIN);
    const whole = draftFor(STORED_BRIEFING).split(LINE_SEPARATOR);

    expect(draft.split(LINE_SEPARATOR)).toHaveLength(whole.length);
  });

  it('takes the day the stamp names and not the host', () => {
    // A renderer reaching for a local-time formatter answers the
    // next day on any host east of UTC.
    expect(subjectOf(draftFor(LATE_BRIEFING))).toBe('Readings 2026-08-30');
  });

  it('is the vocabulary alone when the stamp is gone', () => {
    expect(subjectOf(draftFor(UNSTAMPED_BRIEFING))).toBe(STORED_VOCABULARY);
  });

  it('does not move when the subscription does', () => {
    // A subject that moved with the row it was dispatched for would
    // be describing the schedule rather than the digest.
    const standing = draftFor(STORED_BRIEFING);
    const traced = draftFor(
      STORED_BRIEFING,
      RAINFALL_DOMAIN,
      TRACED_SUBSCRIPTION,
    );

    expect(subjectOf(traced)).toBe(subjectOf(standing));
  });
});

// ---------------------------------------------------------------------------
// The path, the bytes and the body
// ---------------------------------------------------------------------------

describe('the path an artifact names', () => {
  it('is one the rule itself accepts', () => {
    // Read through the rule rather than by looking for a leading
    // separator, so every shape it refuses is covered here and not
    // only the one a case thought of.
    const paths = [
      pathFor(STORED_BRIEFING),
      pathFor(QUIET_BRIEFING),
      pathFor(UNSTAMPED_BRIEFING),
      pathFor(STORED_BRIEFING, HOSTILE_SLUG_DOMAIN),
    ];

    for (const path of paths) {
      expect(checkArtifactPath(path).ok).toBe(true);
    }

    expect(paths).toHaveLength(4);
  });

  it('opens at the destination and climbs out of none', () => {
    const path = pathFor(STORED_BRIEFING, HOSTILE_SLUG_DOMAIN);

    expect(path.startsWith('/')).toBe(false);
    expect(path.split('/')).not.toContain('..');
    expect(path).not.toContain('\\');
  });

  it('ends in the extension this renderer declares', () => {
    expect(pathFor(STORED_BRIEFING)).toContain('.' + EMAIL_DRAFT_EXTENSION);
  });
});

describe('rendering one input twice', () => {
  it('answers identical bytes', () => {
    const first = renderWith(STORED_BRIEFING);
    const second = renderWith(STORED_BRIEFING);

    expect(second).toStrictEqual(first);
  });

  it('answers identical bytes for a quiet period too', () => {
    // The branch with no body under the subject, which is where a
    // subject built from a clock would show up first.
    expect(draftFor(QUIET_BRIEFING)).toBe(draftFor(QUIET_BRIEFING));
  });

  it('writes nothing into the input it was handed', () => {
    // Over a clone of the input as it stood before any case ran —
    // see {@link PRISTINE_INPUT} for why a clone of the fixtures
    // themselves would no longer report an idempotent write.
    const input = structuredClone(PRISTINE_INPUT);
    const before = JSON.stringify(input);

    renderEmailDraft(input);

    expect(JSON.stringify(input)).toBe(before);
  });
});

describe('the body below the subject line', () => {
  it('is the shared composition and nothing else', () => {
    // Compared against a live call rather than a copy of its output,
    // so a change to the composer cannot leave two files disagreeing
    // about which one is right.
    const input = inputFor(STORED_BRIEFING);
    const composed = composeMarkdownBody(input, {
      headingDepth: EMAIL_DRAFT_HEADING_DEPTH,
    });

    expect(bodyOf(draftFor(STORED_BRIEFING))).toBe(composed);
  });

  it('heads its sections below the subject line', () => {
    // The subject occupies the top level, so a section at `#` would
    // stand level with what the draft says it is about.
    const body = bodyOf(draftFor(STORED_BRIEFING));

    expect(EMAIL_DRAFT_HEADING_DEPTH).toBe(2);
    expect(body).toContain('\n## Gauges (2)\n');
    expect(body).not.toContain('\n# Gauges');
  });
});

// ---------------------------------------------------------------------------
// The guards: what a later edit has to keep true
// ---------------------------------------------------------------------------

describe('the renderer the registry names', () => {
  it('serves the format a stored row can carry', () => {
    const formats: readonly string[] = EXPORT_FORMATS;

    expect(EMAIL_DRAFT_RENDERER.format).toBe('email_draft');
    expect(formats).toContain(EMAIL_DRAFT_RENDERER.format);
  });

  it('has the two members a renderer is allowed', () => {
    // The interface leaves nowhere for a send to live, and this is
    // the format where that matters most.
    expect(Object.keys(EMAIL_DRAFT_RENDERER).sort()).toStrictEqual([
      'format',
      'render',
    ]);
  });

  it('renders through the function this module exports', () => {
    const through = EMAIL_DRAFT_RENDERER.render(inputFor(STORED_BRIEFING));

    expect(through).toHaveLength(1);
    expect(String(through[0]?.body)).toBe(WHOLE_DRAFT);
  });

  it('answers markdown for every draft it renders', () => {
    expect(EMAIL_DRAFT_MEDIA_TYPE).toBe('text/markdown');
  });
});

describe('every artifact the cases above rendered', () => {
  it('names the four members and no fifth', () => {
    const keys = RENDERED.flatMap((artifact) => Object.keys(artifact));
    const distinct = [...new Set(keys)].sort();

    expect(distinct).toStrictEqual(ARTIFACT_MEMBERS);
    expect(RENDERED.length).toBeGreaterThan(0);
  });

  it('names none an address could be written under', () => {
    const found = RENDERED.flatMap(addressShapedKeys);

    expect(found).toStrictEqual([]);
  });

  it('answers the one media type this renderer declares', () => {
    const types = RENDERED.map((artifact) => artifact.mediaType);

    expect([...new Set(types)]).toStrictEqual([EMAIL_DRAFT_MEDIA_TYPE]);
  });
});
