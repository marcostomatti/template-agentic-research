/**
 * Cases for `./obsidian-md.ts`: the `obsidian_md` renderer, driven
 * edge-first.
 *
 * THREE CLAIMS ARE WHAT THIS FILE IS FOR, and each is pinned as bytes
 * rather than as a property of them. The artifact list is
 * deterministic over one neutral fixture — one artifact, one known
 * path, one known document, compared whole. The path is relative,
 * which is read by putting it back through `checkArtifactPath` rather
 * than by looking for a leading separator, so every shape that rule
 * refuses is covered by the reading and not just the one a case
 * thought of. And two renders of one input answer identical bytes,
 * which is the claim a clock, a locale or an object-key order would
 * each break in a way no single-render case could report.
 *
 * THE EDGES COME FIRST. A one-way export is easy to write so that it
 * reads well over a full digest and says the wrong thing over a quiet
 * period: a note that was never written, a blank date, a file at the
 * vault root. So the digest that came to nothing, the stamp that
 * cannot be read and the domain slug that reduces away are driven
 * before the whole-document case.
 *
 * THE BODY IS NOT PINNED TWICE. `./markdown-body.test.ts` owns what
 * the shared composition answers; what this file asserts is that the
 * text below the closing fence IS that composition, at this
 * renderer's own depth — compared against a live call rather than
 * against a copy of its output, so a change to the composer cannot
 * leave two files disagreeing about which one is right.
 *
 * THE FRONT-MATTER KEYS ARE HELD AGAINST WHAT THE CASES REACHED.
 * {@link RENDERED} records every note produced and the guard at the
 * foot holds the three keys against that record, with a fabricated
 * fourth asserted absent so the reading is shown discriminating. Two
 * of the three are omitted whenever a stamp cannot be read, so the
 * guard is live rather than satisfied by construction.
 *
 * The fixture is a rainfall bulletin, which is the neutral subject
 * `./index.test.ts` and `./markdown-body.test.ts` already use for the
 * same four rows.
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

import { checkArtifactPath } from './artifact-path.js';
import { composeMarkdownBody } from './markdown-body.js';
import {
  FRONT_MATTER_FENCE,
  OBSIDIAN_EXTENSION,
  OBSIDIAN_FRONT_MATTER_KEYS,
  OBSIDIAN_HEADING_DEPTH,
  OBSIDIAN_MD_RENDERER,
  OBSIDIAN_MEDIA_TYPE,
  renderObsidianMarkdown,
} from './obsidian-md.js';

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
 * because the claim in this file is about the whole note, and a
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

/** The stored digest a whole note is rendered from. */
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
 * step answered nothing, over a period that held nothing. The note
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
 * run. The cast is what an untyped caller supplies for free.
 */
const UNSTAMPED_BRIEFING = {
  ...STORED_BRIEFING,
  generatedAt: new Date('not a moment'),
} satisfies ExportBriefingRow;

/**
 * A domain whose slug carries every shape a path rule refuses.
 *
 * The reduction is what makes it harmless, so what the cases read off
 * this is that the reduction RAN: the folder is a slug, and the front
 * matter names the same slug the folder does rather than the stored
 * text.
 */
const HOSTILE_DOMAIN = {
  ...RAINFALL_DOMAIN,
  slug: '../../etc: Rainfall\nBulletin',
} satisfies ExportDomainRow;

/** A domain whose slug reduces to nothing at all. */
const UNNAMED_DOMAIN = {
  ...RAINFALL_DOMAIN,
  slug: '???',
} satisfies ExportDomainRow;

/**
 * Every note a case rendered, for the key guard at the foot.
 *
 * Accumulated rather than declared a second time, because the claim
 * is about what the cases DID. vitest runs describe blocks in
 * declaration order, so the guard reads a full record.
 */
const RENDERED: string[] = [];

/**
 * One render, recorded on the way past.
 *
 * @param briefing - The stored digest to render.
 * @param domain - The domain it belongs to.
 * @returns The artifacts the renderer answered.
 */
function renderWith(
  briefing: ExportBriefingRow,
  domain: ExportDomainRow = RAINFALL_DOMAIN,
): readonly ExportArtifact[] {
  const input = {
    domain,
    briefing,
    findings: SELECTED_FINDINGS,
    subscription: STANDING_SUBSCRIPTION,
  } satisfies ExportRenderInput;
  const artifacts = renderObsidianMarkdown(input);

  for (const artifact of artifacts) {
    RENDERED.push(String(artifact.body));
  }

  return artifacts;
}

/**
 * The one note a render answered, as text.
 *
 * Answers the empty string for a render that answered no artifact,
 * which every case reading this asserts the length of first.
 *
 * @param briefing - The stored digest to render.
 * @param domain - The domain it belongs to.
 * @returns The note, or `''` when none was answered.
 */
function noteFor(
  briefing: ExportBriefingRow,
  domain: ExportDomainRow = RAINFALL_DOMAIN,
): string {
  const [artifact] = renderWith(briefing, domain);

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
 * The front-matter lines of a note, fences excluded.
 *
 * Read by splitting on the fence rather than by counting lines, so a
 * preamble that grew a line is visible to the cases rather than
 * silently re-pointing every index.
 *
 * @param note - The note text.
 * @returns The field lines, in document order.
 */
function frontMatterOf(note: string): readonly string[] {
  const lines = note.split('\n');
  const closing = lines.indexOf(FRONT_MATTER_FENCE, 1);

  return closing === -1
    ? []
    : lines.slice(1, closing);
}

/**
 * Everything below the closing fence, which is the shared body.
 *
 * @param note - The note text.
 * @returns The body, or `''` when the note is front matter alone.
 */
function bodyOf(note: string): string {
  const lines = note.split('\n');
  const closing = lines.indexOf(FRONT_MATTER_FENCE, 1);

  return closing === -1
    ? ''
    : lines.slice(closing + 2).join('\n');
}

/** The whole note the fixture renders, written as lines. */
const WHOLE_NOTE = [
  '---',
  'domain: rainfall-bulletin',
  'period: 2026-08-30',
  'generated: 2026-08-30T00:00:00.000Z',
  '---',
  '',
  'Two gauges reported and one did not.',
  '',
  '# Gauges (2)',
  '',
  '- 501 (score 0)',
  '  - gauge: north ridge',
  '  - mm: 0',
  '- 502',
  '  - gauge: south flat',
  '',
  '# Readings (0)',
  '',
  '# Errors from the previous run (1)',
  '',
  '- ingest refused a feed',
  '',
].join('\n');

/** The path that note takes: the domain folder, the day, the row. */
const WHOLE_NOTE_PATH = 'rainfall-bulletin/2026-08-30-11.md';

/**
 * A front-matter key no field answers, assembled from parts so that a
 * key genuinely spelt this way would still appear nowhere in this
 * file.
 */
const ABSENT_KEY = ['con', 'nector'].join('');

// ---------------------------------------------------------------------------
// The edges, which are what a one-way export gets wrong
// ---------------------------------------------------------------------------

describe('a digest that came to nothing', () => {
  it('is still written, as its front matter alone', () => {
    // Nothing reads the vault back, so an absent note is
    // indistinguishable from an export that never ran.
    const note = noteFor(QUIET_BRIEFING);

    expect(renderWith(QUIET_BRIEFING)).toHaveLength(1);
    expect(note).toBe(
      '---\ndomain: rainfall-bulletin\nperiod: 2026-08-30\n'
      + 'generated: 2026-08-30T00:00:00.000Z\n---\n',
    );
  });

  it('takes the same path a full digest would', () => {
    expect(pathFor(QUIET_BRIEFING)).toBe(WHOLE_NOTE_PATH);
  });
});

describe('a stamp nothing can read', () => {
  it('leaves both fields out rather than writing a blank', () => {
    // The law `./markdown-body.ts` applies to a count and a score: a
    // key with nothing after it reads as a measured absence.
    expect(frontMatterOf(noteFor(UNSTAMPED_BRIEFING))).toStrictEqual([
      'domain: rainfall-bulletin',
    ]);
  });

  it('names the note by the row when the day is gone', () => {
    expect(pathFor(UNSTAMPED_BRIEFING)).toBe('rainfall-bulletin/11.md');
  });

  it('renders the body under it exactly as ever', () => {
    const stamped = bodyOf(noteFor(STORED_BRIEFING));

    expect(bodyOf(noteFor(UNSTAMPED_BRIEFING))).toBe(stamped);
  });
});

describe('a domain slug the reduction answers nothing for', () => {
  it('answers no artifact rather than a note at the root', () => {
    // For a one-way export that would be a file nobody can trace and
    // nothing can withdraw.
    expect(renderWith(STORED_BRIEFING, UNNAMED_DOMAIN)).toStrictEqual([]);
  });
});

describe('a domain slug carrying what a path rule refuses', () => {
  it('reduces it to a slug rather than refusing the note', () => {
    expect(pathFor(STORED_BRIEFING, HOSTILE_DOMAIN)).toBe(
      'etc-rainfall-bulletin/2026-08-30-11.md',
    );
  });

  it('names the same slug the folder does', () => {
    const fields = frontMatterOf(noteFor(STORED_BRIEFING, HOSTILE_DOMAIN));

    // The front matter carries the reduction and not the stored
    // text, so the note cannot claim one domain and sit in another.
    expect(fields[0]).toBe('domain: etc-rainfall-bulletin');
  });

  it('writes one line per field and no more', () => {
    // The line count is what says no value ended its own field
    // early: the header argues from the two producers of a value
    // that none can carry a newline, and this is that argument as a
    // reading rather than a paragraph.
    const fields = frontMatterOf(noteFor(STORED_BRIEFING, HOSTILE_DOMAIN));

    expect(fields).toHaveLength(OBSIDIAN_FRONT_MATTER_KEYS.length);
  });
});

// ---------------------------------------------------------------------------
// The three claims this file is for
// ---------------------------------------------------------------------------

describe('the artifact list over one neutral fixture', () => {
  it('is one artifact and every member of it', () => {
    const [artifact] = renderWith(STORED_BRIEFING);

    expect(renderWith(STORED_BRIEFING)).toHaveLength(1);
    expect(artifact?.format).toBe('obsidian_md');
    expect(artifact?.path).toBe(WHOLE_NOTE_PATH);
    expect(artifact?.mediaType).toBe(OBSIDIAN_MEDIA_TYPE);
    expect(artifact?.body).toBe(WHOLE_NOTE);
  });

  it('carries the four members a contract artifact has', () => {
    const [artifact] = renderWith(STORED_BRIEFING);
    const keys = Object.keys(artifact ?? {}).sort();

    expect(keys).toStrictEqual(['body', 'format', 'mediaType', 'path']);
  });

  it('holds a measured zero apart from an absence', () => {
    // Anti-vacuity for every case above: a fixture whose scores are
    // all numbers, or all null, cannot report a renderer that reads
    // an unscored finding as a zero.
    const scores = SELECTED_FINDINGS.map((finding) => finding.score);

    expect(scores).toContain(0);
    expect(scores).toContain(null);
  });
});

describe('the path an artifact names', () => {
  it('is one the rule itself accepts', () => {
    // Read through the rule rather than by looking for a leading
    // separator, so every shape it refuses is covered here and not
    // only the one a case thought of.
    const paths = [
      pathFor(STORED_BRIEFING),
      pathFor(QUIET_BRIEFING),
      pathFor(UNSTAMPED_BRIEFING),
      pathFor(STORED_BRIEFING, HOSTILE_DOMAIN),
    ];

    for (const path of paths) {
      expect(checkArtifactPath(path).ok).toBe(true);
    }

    expect(paths).toHaveLength(4);
  });

  it('opens at the destination and climbs out of none', () => {
    const path = pathFor(STORED_BRIEFING, HOSTILE_DOMAIN);

    expect(path.startsWith('/')).toBe(false);
    expect(path.split('/')).not.toContain('..');
    expect(path).not.toContain('\\');
  });

  it('ends in the extension this renderer declares', () => {
    expect(pathFor(STORED_BRIEFING)).toContain('.' + OBSIDIAN_EXTENSION);
  });
});

describe('rendering one input twice', () => {
  it('answers identical bytes', () => {
    const first = renderWith(STORED_BRIEFING);
    const second = renderWith(STORED_BRIEFING);

    expect(second).toStrictEqual(first);
  });

  it('answers identical bytes for a quiet period too', () => {
    // The branch with no body under the fence, which is where a
    // preamble built from a clock would show up first.
    expect(noteFor(QUIET_BRIEFING)).toBe(noteFor(QUIET_BRIEFING));
  });

  it('writes nothing into the input it was handed', () => {
    const input = {
      domain: RAINFALL_DOMAIN,
      briefing: STORED_BRIEFING,
      findings: SELECTED_FINDINGS,
      subscription: STANDING_SUBSCRIPTION,
    } satisfies ExportRenderInput;
    const before = JSON.stringify(input);

    renderObsidianMarkdown(input);

    expect(JSON.stringify(input)).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// The preamble and the body beneath it
// ---------------------------------------------------------------------------

describe('the front matter', () => {
  it('is fenced above and below', () => {
    const lines = noteFor(STORED_BRIEFING).split('\n');

    expect(lines[0]).toBe(FRONT_MATTER_FENCE);
    expect(lines[4]).toBe(FRONT_MATTER_FENCE);
  });

  it('carries the three keys in the declared order', () => {
    const fields = frontMatterOf(noteFor(STORED_BRIEFING));
    const keys = fields.map((line) => line.split(': ')[0]);

    expect(keys).toStrictEqual([...OBSIDIAN_FRONT_MATTER_KEYS]);
  });

  it('keeps the period and the stamp in step', () => {
    // Machine-independent: the period is the first ten characters of
    // the note's own stamp, whatever the host's zone.
    const fields = frontMatterOf(noteFor(STORED_BRIEFING));
    const period = fields[1]?.slice('period: '.length) ?? '';
    const stamp = fields[2]?.slice('generated: '.length) ?? '';

    expect(period).toBe(stamp.slice(0, 10));
  });

  it('takes the day the stamp names and not the host', () => {
    // Half an hour before midnight UTC. A renderer reaching for a
    // local-time formatter answers the next day on any host east of
    // UTC, which is what this literal catches.
    const late = {
      ...STORED_BRIEFING,
      generatedAt: new Date('2026-08-30T23:30:00.000Z'),
    } satisfies ExportBriefingRow;

    expect(frontMatterOf(noteFor(late))[1]).toBe('period: 2026-08-30');
  });
});

describe('the body below the closing fence', () => {
  it('is the shared composition and nothing else', () => {
    // Compared against a live call rather than a copy of its output,
    // so a change to the composer cannot leave two files disagreeing
    // about which one is right.
    const input = {
      domain: RAINFALL_DOMAIN,
      briefing: STORED_BRIEFING,
      findings: SELECTED_FINDINGS,
      subscription: STANDING_SUBSCRIPTION,
    } satisfies ExportRenderInput;
    const composed = composeMarkdownBody(input, {
      headingDepth: OBSIDIAN_HEADING_DEPTH,
    });

    expect(bodyOf(noteFor(STORED_BRIEFING))).toBe(composed);
  });

  it('heads its sections at the depth declared here', () => {
    // The axis `./notion-md.ts` differs on: the file name is the
    // note title in a vault, so nothing competes with a top-level
    // heading.
    const body = bodyOf(noteFor(STORED_BRIEFING));

    expect(OBSIDIAN_HEADING_DEPTH).toBe(1);
    expect(body).toContain('\n# Gauges (2)\n');
    expect(body).not.toContain('## Gauges');
  });
});

// ---------------------------------------------------------------------------
// The guards: what a later edit has to keep true
// ---------------------------------------------------------------------------

describe('the renderer the registry will name', () => {
  it('serves the format a stored row can carry', () => {
    const formats: readonly string[] = EXPORT_FORMATS;

    expect(OBSIDIAN_MD_RENDERER.format).toBe('obsidian_md');
    expect(formats).toContain(OBSIDIAN_MD_RENDERER.format);
  });

  it('has the two members a renderer is allowed', () => {
    expect(Object.keys(OBSIDIAN_MD_RENDERER).sort()).toStrictEqual([
      'format',
      'render',
    ]);
  });

  it('renders through the function this module exports', () => {
    const through = OBSIDIAN_MD_RENDERER.render({
      domain: RAINFALL_DOMAIN,
      briefing: STORED_BRIEFING,
      findings: SELECTED_FINDINGS,
      subscription: STANDING_SUBSCRIPTION,
    });

    expect(through).toHaveLength(1);
    expect(String(through[0]?.body)).toBe(WHOLE_NOTE);
  });

  it('answers markdown for every note it renders', () => {
    expect(OBSIDIAN_MEDIA_TYPE).toBe('text/markdown');
  });
});

describe('the front-matter keys this module declares', () => {
  it('are each reached by the cases above', () => {
    const reached = OBSIDIAN_FRONT_MATTER_KEYS.filter(
      (key) => RENDERED.some((note) => note.includes(key + ': ')),
    );

    // Both directions in one comparison: a key no case reaches is a
    // preamble field nothing drives, and two of the three are left
    // out whenever a stamp cannot be read.
    expect(reached).toStrictEqual([...OBSIDIAN_FRONT_MATTER_KEYS]);
  });

  it('do not name one no field answers', () => {
    const declared: readonly string[] = OBSIDIAN_FRONT_MATTER_KEYS;
    const seen = RENDERED.some((note) => note.includes(ABSENT_KEY + ': '));

    // The control beside the equality above: a record that had
    // stopped discriminating satisfies it exactly as a live one does.
    expect(declared).not.toContain(ABSENT_KEY);
    expect(seen).toBe(false);
    expect(RENDERED.length).toBeGreaterThan(0);
  });
});
