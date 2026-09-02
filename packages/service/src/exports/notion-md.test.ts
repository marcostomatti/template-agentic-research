/**
 * Cases for `./notion-md.ts`: the `notion_md` renderer, driven
 * against its sibling.
 *
 * WHAT THIS FILE IS FOR IS THE DIFFERENCE. `./obsidian-md.test.ts`
 * already pins what a markdown renderer answers over the shared
 * composition, and repeating that here would be a second authority on
 * one composer. What only this file can say is that the pair differs
 * in exactly two things and in nothing else: the body text matches
 * its sibling's over one input, line for line and modulo the one
 * heading mark this renderer declares, while the preamble does not
 * match it at all.
 *
 * BOTH HALVES OF THAT CARRY THEIR OWN CONTROL. The line-for-line
 * equality is taken over the sibling's body DEEPENED by one mark, so
 * the case asserts a relation rather than a similarity; beside it the
 * raw bodies are asserted UNEQUAL, which is what says the deepening
 * did something and the two renderers are not simply the same file
 * twice. The preamble inequality is paired with the concrete shape:
 * a heading and a list where the sibling writes a fenced block, with
 * the fence asserted absent by the sibling's own constant.
 *
 * THE THREE READINGS THIS MODULE COPIES ARE HELD EQUAL TO THE
 * SIBLING'S, over one input, as the header asks: the period, the
 * stamp and the path. Nothing in either module compares them, so a
 * drift in a copied date reading would otherwise be reported only by
 * two documents about one period disagreeing about which period it
 * was.
 *
 * THE EDGES COME FIRST. A digest that came to nothing, a stamp
 * nothing can read and a domain slug that reduces away are each a
 * stored state, and each is driven before the whole-document case.
 *
 * THE PREAMBLE KEYS ARE HELD AGAINST WHAT THE CASES REACHED.
 * {@link RENDERED} records every page produced and the guard at the
 * foot holds the three keys against that record, with a fabricated
 * fourth asserted absent so the reading is shown discriminating. Two
 * of the three are omitted whenever a stamp cannot be read, so the
 * guard is live rather than satisfied by construction.
 *
 * The fixture is a rainfall bulletin, the neutral subject
 * `./index.test.ts`, `./markdown-body.test.ts` and
 * `./obsidian-md.test.ts` already use for the same four rows. It is
 * written out again rather than imported, because the claims here are
 * about whole documents and a fixture shared across two files is a
 * fixture either may change.
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
  NOTION_EXTENSION,
  NOTION_FIELD_BULLET,
  NOTION_HEADING_DEPTH,
  NOTION_MD_RENDERER,
  NOTION_MEDIA_TYPE,
  NOTION_PREAMBLE_KEYS,
  NOTION_TITLE_PREFIX,
  renderNotionMarkdown,
} from './notion-md.js';
import {
  FRONT_MATTER_FENCE,
  OBSIDIAN_HEADING_DEPTH,
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
  format: 'notion_md',
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
 * for the null-vs-zero law.
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

/** The stored digest a whole page is rendered from. */
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
 * step answered nothing, over a period that held nothing.
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
 * A domain whose slug carries every shape a path rule refuses, a
 * newline among them.
 *
 * The reduction is what makes it harmless, so what the cases read off
 * this is that the reduction RAN: the folder is a slug, the title and
 * the field name the same slug the folder does, and the preamble is
 * still one line per field.
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

/** What separates two lines of one artifact. */
const LINE_SEPARATOR = '\n';

/** What sits between a preamble key and its value. */
const FIELD_SEPARATOR = ': ';

/** The character an ATX heading is written with. */
const HEADING_CHARACTER = '#';

/**
 * Every page a case rendered, for the key guard at the foot.
 *
 * Accumulated rather than declared a second time, because the claim
 * is about what the cases DID. vitest runs describe blocks in
 * declaration order, so the guard reads a full record.
 */
const RENDERED: string[] = [];

/**
 * A preamble key no field answers, assembled from parts so that a key
 * genuinely spelt this way would still appear nowhere in this file.
 */
const ABSENT_KEY = ['con', 'nector'].join('');

/**
 * The four stored rows one render is of.
 *
 * One builder for both renderers, so the pair is driven over the same
 * input rather than over two literals that have to be kept in step.
 *
 * @param briefing - The stored digest to render.
 * @param domain - The domain it belongs to.
 * @returns The render input.
 */
function inputFor(
  briefing: ExportBriefingRow,
  domain: ExportDomainRow = RAINFALL_DOMAIN,
): ExportRenderInput {
  return {
    domain,
    briefing,
    findings: SELECTED_FINDINGS,
    subscription: STANDING_SUBSCRIPTION,
  } satisfies ExportRenderInput;
}

/**
 * The render input as it stood before any case ran.
 *
 * Captured at module load and cloned from, which is what makes the
 * purity case below able to see an IDEMPOTENT write. Every case here
 * renders the same two fixture objects, so a renderer writing one
 * fixed value into one of them would already have written it by the
 * time that case ran, and a clone taken then would carry the write
 * already made.
 */
const PRISTINE_INPUT = structuredClone(inputFor(STORED_BRIEFING));

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
  const artifacts = renderNotionMarkdown(inputFor(briefing, domain));

  for (const artifact of artifacts) {
    RENDERED.push(String(artifact.body));
  }

  return artifacts;
}

/**
 * The one page a render answered, as text.
 *
 * Answers the empty string for a render that answered no artifact,
 * which every case reading this asserts the length of first.
 *
 * @param briefing - The stored digest to render.
 * @param domain - The domain it belongs to.
 * @returns The page, or `''` when none was answered.
 */
function pageFor(
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
 * The preamble of a page: every line above the first blank one.
 *
 * Read that way because the preamble is one block and carries no
 * blank line of its own, which is the property the module's header
 * states and which a case below reads as a line index rather than
 * taking on trust.
 *
 * @param page - The page text.
 * @returns The preamble lines, in document order.
 */
function preambleOf(page: string): readonly string[] {
  const lines = page.split(LINE_SEPARATOR);
  const blank = lines.indexOf('');

  return blank === -1
    ? lines
    : lines.slice(0, blank);
}

/**
 * Everything below the preamble, which is the shared body.
 *
 * @param page - The page text.
 * @returns The body, or `''` when the page is preamble alone.
 */
function bodyOf(page: string): string {
  const lines = page.split(LINE_SEPARATOR);
  const blank = lines.indexOf('');

  return blank === -1
    ? ''
    : lines.slice(blank + 1).join(LINE_SEPARATOR);
}

/**
 * One preamble field's value, read by its key.
 *
 * @param page - The page text.
 * @param key - The field to read.
 * @returns The value, or `''` when no field carries that key.
 */
function preambleValue(page: string, key: string): string {
  const prefix = NOTION_FIELD_BULLET + key + FIELD_SEPARATOR;
  const line = preambleOf(page).find((entry) => entry.startsWith(prefix));

  return line === undefined
    ? ''
    : line.slice(prefix.length);
}

/**
 * The same input through the sibling renderer.
 *
 * @param briefing - The stored digest to render.
 * @param domain - The domain it belongs to.
 * @returns The note, or `''` when none was answered.
 */
function siblingNote(
  briefing: ExportBriefingRow,
  domain: ExportDomainRow = RAINFALL_DOMAIN,
): string {
  const [artifact] = renderObsidianMarkdown(inputFor(briefing, domain));

  return artifact === undefined
    ? ''
    : String(artifact.body);
}

/**
 * The sibling's body, read by its own fence rather than by a blank
 * line — the two preambles are different shapes, which is the point.
 *
 * @param note - The note text.
 * @returns The body, or `''` when the note is front matter alone.
 */
function siblingBodyOf(note: string): string {
  const lines = note.split(LINE_SEPARATOR);
  const closing = lines.indexOf(FRONT_MATTER_FENCE, 1);

  return closing === -1
    ? ''
    : lines.slice(closing + 2).join(LINE_SEPARATOR);
}

/**
 * One front-matter value of the sibling's note, read by its key.
 *
 * @param note - The note text.
 * @param key - The field to read.
 * @returns The value, or `''` when no field carries that key.
 */
function siblingValue(note: string, key: string): string {
  const prefix = key + FIELD_SEPARATOR;
  const lines = note.split(LINE_SEPARATOR).slice(1);
  const line = lines.find((entry) => entry.startsWith(prefix));

  return line === undefined
    ? ''
    : line.slice(prefix.length);
}

/**
 * One line of the sibling's body, at this renderer's depth.
 *
 * A heading gains exactly one mark and every other line is left
 * alone, which is the whole of what the two bodies differ by.
 *
 * @param line - The line as the sibling wrote it.
 * @returns The line as this renderer would.
 */
function deepened(line: string): string {
  return line.startsWith(HEADING_CHARACTER)
    ? HEADING_CHARACTER + line
    : line;
}

/** The preamble the fixture renders, written as lines. */
const WHOLE_PREAMBLE = [
  '# rainfall-bulletin 2026-08-30',
  '- domain: rainfall-bulletin',
  '- period: 2026-08-30',
  '- generated: 2026-08-30T00:00:00.000Z',
].join(LINE_SEPARATOR);

/** The path that page takes: the domain folder, the day, the row. */
const WHOLE_PAGE_PATH = 'rainfall-bulletin/2026-08-30-11.md';

// ---------------------------------------------------------------------------
// The edges, which are what a one-way export gets wrong
// ---------------------------------------------------------------------------

describe('a digest that came to nothing', () => {
  it('is still written, as its preamble alone', () => {
    // Nothing reads the destination back, so an absent page is
    // indistinguishable from an export that never ran.
    const page = pageFor(QUIET_BRIEFING);

    expect(renderWith(QUIET_BRIEFING)).toHaveLength(1);
    expect(page).toBe(WHOLE_PREAMBLE + LINE_SEPARATOR);
  });

  it('takes the same path a full digest would', () => {
    expect(pathFor(QUIET_BRIEFING)).toBe(WHOLE_PAGE_PATH);
  });
});

describe('a stamp nothing can read', () => {
  it('leaves both fields out rather than writing a blank', () => {
    // The law `./markdown-body.ts` applies to a count and a score: a
    // key with nothing after it reads as a measured absence.
    const fields = preambleOf(pageFor(UNSTAMPED_BRIEFING)).slice(1);

    expect(fields).toStrictEqual(['- domain: rainfall-bulletin']);
  });

  it('titles the page by the domain alone', () => {
    const lines = preambleOf(pageFor(UNSTAMPED_BRIEFING));

    expect(lines[0]).toBe('# rainfall-bulletin');
  });

  it('names the page by the row when the day is gone', () => {
    expect(pathFor(UNSTAMPED_BRIEFING)).toBe('rainfall-bulletin/11.md');
  });

  it('renders the body under it exactly as ever', () => {
    const stamped = bodyOf(pageFor(STORED_BRIEFING));

    expect(bodyOf(pageFor(UNSTAMPED_BRIEFING))).toBe(stamped);
  });
});

describe('a domain slug the reduction answers nothing for', () => {
  it('answers no artifact rather than a page at the root', () => {
    // For a one-way export that would be a file nobody can trace and
    // nothing can withdraw.
    expect(renderWith(STORED_BRIEFING, UNNAMED_DOMAIN)).toStrictEqual([]);
  });
});

describe('a domain slug carrying what a path rule refuses', () => {
  it('reduces it to a slug rather than refusing the page', () => {
    expect(pathFor(STORED_BRIEFING, HOSTILE_DOMAIN)).toBe(
      'etc-rainfall-bulletin/2026-08-30-11.md',
    );
  });

  it('titles and names the same slug the folder does', () => {
    const page = pageFor(STORED_BRIEFING, HOSTILE_DOMAIN);
    const lines = preambleOf(page);

    // The preamble carries the reduction and not the stored text, so
    // the page cannot claim one domain and sit in another.
    expect(lines[0]).toBe('# etc-rainfall-bulletin 2026-08-30');
    expect(preambleValue(page, 'domain')).toBe('etc-rainfall-bulletin');
  });

  it('writes one line per field and no more', () => {
    // The line count is what says no value ended its own line early:
    // the header argues from the two producers of a value that
    // neither can carry a newline, and this is that argument as a
    // reading rather than a paragraph.
    const lines = preambleOf(pageFor(STORED_BRIEFING, HOSTILE_DOMAIN));

    expect(lines).toHaveLength(NOTION_PREAMBLE_KEYS.length + 1);
  });
});

// ---------------------------------------------------------------------------
// The difference, which is what this file is for
// ---------------------------------------------------------------------------

describe('the body this renderer answers', () => {
  it('matches its sibling line for line, one mark deeper', () => {
    const mine = bodyOf(pageFor(STORED_BRIEFING));
    const theirs = siblingBodyOf(siblingNote(STORED_BRIEFING));

    expect(mine.split(LINE_SEPARATOR)).toStrictEqual(
      theirs.split(LINE_SEPARATOR).map(deepened),
    );
  });

  it('is not what the sibling wrote before that mark', () => {
    // The control beside the equality above: a sibling body carrying
    // no heading would make the deepening an identity, and the two
    // cases would then be one case asserted twice.
    const mine = bodyOf(pageFor(STORED_BRIEFING));
    const theirs = siblingBodyOf(siblingNote(STORED_BRIEFING));
    const lines = theirs.split(LINE_SEPARATOR);
    const headings = lines.filter(
      (line) => line.startsWith(HEADING_CHARACTER),
    );

    expect(mine).not.toBe(theirs);
    expect(headings).toHaveLength(3);
  });

  it('is the shared composition at the declared depth', () => {
    // Compared against a live call rather than against a copy of its
    // output: `./markdown-body.test.ts` owns what the composition
    // answers, and a second pin here would leave two files
    // disagreeing about which one is right.
    const composed = composeMarkdownBody(inputFor(STORED_BRIEFING), {
      headingDepth: NOTION_HEADING_DEPTH,
    });

    expect(bodyOf(pageFor(STORED_BRIEFING))).toBe(composed);
  });

  it('heads its sections one level below its title', () => {
    const body = bodyOf(pageFor(STORED_BRIEFING));

    expect(NOTION_HEADING_DEPTH).toBe(OBSIDIAN_HEADING_DEPTH + 1);
    expect(body).toContain('\n## Gauges (2)\n');
    expect(body).not.toContain('\n# Gauges');
  });
});

describe('the preamble this renderer answers', () => {
  it('is not the fenced block its sibling writes', () => {
    // A front-matter block is a convention read before rendering, so
    // a surface that does not read it gets a rule and three lines of
    // stray text. The same facts go in as blocks instead.
    const page = pageFor(STORED_BRIEFING);
    const note = siblingNote(STORED_BRIEFING);

    expect(note.startsWith(FRONT_MATTER_FENCE)).toBe(true);
    expect(page.startsWith(FRONT_MATTER_FENCE)).toBe(false);
    expect(page.startsWith(NOTION_TITLE_PREFIX)).toBe(true);
  });

  it('carries no fence line at all', () => {
    const lines = preambleOf(pageFor(STORED_BRIEFING));

    expect(lines).not.toContain(FRONT_MATTER_FENCE);
  });

  it('is exactly the lines this module declares', () => {
    const lines = preambleOf(pageFor(STORED_BRIEFING));

    expect(lines.join(LINE_SEPARATOR)).toBe(WHOLE_PREAMBLE);
  });

  it('writes every field but the title as one list item', () => {
    const fields = preambleOf(pageFor(STORED_BRIEFING)).slice(1);
    const bulleted = fields.filter(
      (line) => line.startsWith(NOTION_FIELD_BULLET),
    );

    expect(fields).toHaveLength(NOTION_PREAMBLE_KEYS.length);
    expect(bulleted).toStrictEqual(fields);
  });

  it('is one block, the body below the first blank line', () => {
    // The property `preambleOf` above reads a page by, asserted here
    // rather than taken on trust.
    const lines = pageFor(STORED_BRIEFING).split(LINE_SEPARATOR);

    expect(lines.indexOf('')).toBe(NOTION_PREAMBLE_KEYS.length + 1);
  });
});

describe('the three readings copied from the sibling', () => {
  it('answer the same period and the same stamp', () => {
    const page = pageFor(STORED_BRIEFING);
    const note = siblingNote(STORED_BRIEFING);
    const period = preambleValue(page, 'period');
    const generated = preambleValue(page, 'generated');

    // The two literals are the control: two readers that had both
    // stopped answering would satisfy the equality with two blanks.
    expect(period).toBe(siblingValue(note, 'period'));
    expect(generated).toBe(siblingValue(note, 'generated'));
    expect(period).toBe('2026-08-30');
    expect(generated).toBe('2026-08-30T00:00:00.000Z');
  });

  it('answer the same path, from the same parts', () => {
    const [mine] = renderWith(STORED_BRIEFING);
    const [theirs] = renderObsidianMarkdown(inputFor(STORED_BRIEFING));

    expect(mine?.path).toBe(theirs?.path);
    expect(mine?.path).toBe(WHOLE_PAGE_PATH);
  });

  it('drop the same two fields for an unreadable stamp', () => {
    const page = pageFor(UNSTAMPED_BRIEFING);
    const note = siblingNote(UNSTAMPED_BRIEFING);
    const domain = preambleValue(page, 'domain');

    expect(preambleValue(page, 'period')).toBe('');
    expect(siblingValue(note, 'period')).toBe('');
    expect(domain).toBe(siblingValue(note, 'domain'));
    expect(domain).toBe('rainfall-bulletin');
  });
});

// ---------------------------------------------------------------------------
// The artifact, its path and its determinism
// ---------------------------------------------------------------------------

describe('the artifact list over one neutral fixture', () => {
  it('is one artifact and every member of it', () => {
    const composed = composeMarkdownBody(inputFor(STORED_BRIEFING), {
      headingDepth: NOTION_HEADING_DEPTH,
    });
    const [artifact] = renderWith(STORED_BRIEFING);

    expect(renderWith(STORED_BRIEFING)).toHaveLength(1);
    expect(artifact?.format).toBe('notion_md');
    expect(artifact?.path).toBe(WHOLE_PAGE_PATH);
    expect(artifact?.mediaType).toBe(NOTION_MEDIA_TYPE);
    expect(artifact?.body).toBe(
      WHOLE_PREAMBLE + LINE_SEPARATOR + LINE_SEPARATOR + composed,
    );
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
    expect(pathFor(STORED_BRIEFING)).toContain('.' + NOTION_EXTENSION);
  });
});

describe('rendering one input twice', () => {
  it('answers identical bytes', () => {
    const first = renderWith(STORED_BRIEFING);
    const second = renderWith(STORED_BRIEFING);

    expect(second).toStrictEqual(first);
  });

  it('answers identical bytes for a quiet period too', () => {
    // The branch with no body under the preamble, which is where a
    // block built from a clock would show up first.
    expect(pageFor(QUIET_BRIEFING)).toBe(pageFor(QUIET_BRIEFING));
  });

  it('writes nothing into the input it was handed', () => {
    // Over a clone of the input as it stood before any case ran —
    // see {@link PRISTINE_INPUT} for why a clone of the fixtures
    // themselves would no longer report an idempotent write.
    const input = structuredClone(PRISTINE_INPUT);
    const before = JSON.stringify(input);

    renderNotionMarkdown(input);

    expect(JSON.stringify(input)).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// The guards: what a later edit has to keep true
// ---------------------------------------------------------------------------

describe('the renderer the registry will name', () => {
  it('serves the format a stored row can carry', () => {
    const formats: readonly string[] = EXPORT_FORMATS;

    expect(NOTION_MD_RENDERER.format).toBe('notion_md');
    expect(formats).toContain(NOTION_MD_RENDERER.format);
  });

  it('has the two members a renderer is allowed', () => {
    expect(Object.keys(NOTION_MD_RENDERER).sort()).toStrictEqual([
      'format',
      'render',
    ]);
  });

  it('renders through the function this module exports', () => {
    const through = NOTION_MD_RENDERER.render(inputFor(STORED_BRIEFING));
    const direct = renderNotionMarkdown(inputFor(STORED_BRIEFING));

    expect(through).toHaveLength(1);
    expect(through).toStrictEqual(direct);
  });

  it('answers markdown for every page it renders', () => {
    expect(NOTION_MEDIA_TYPE).toBe('text/markdown');
  });
});

describe('the preamble keys this module declares', () => {
  it('are each reached by the cases above', () => {
    const reached = NOTION_PREAMBLE_KEYS.filter(
      (key) => RENDERED.some((page) => page.includes(
        NOTION_FIELD_BULLET + key + FIELD_SEPARATOR,
      )),
    );

    // Both directions in one comparison: a key no case reaches is a
    // preamble field nothing drives, and two of the three are left
    // out whenever a stamp cannot be read.
    expect(reached).toStrictEqual([...NOTION_PREAMBLE_KEYS]);
  });

  it('do not name one no field answers', () => {
    const declared: readonly string[] = NOTION_PREAMBLE_KEYS;
    const needle = NOTION_FIELD_BULLET + ABSENT_KEY + FIELD_SEPARATOR;
    const seen = RENDERED.some((page) => page.includes(needle));

    // The control beside the equality above: a record that had
    // stopped discriminating satisfies it exactly as a live one does.
    expect(declared).not.toContain(ABSENT_KEY);
    expect(seen).toBe(false);
    expect(RENDERED.length).toBeGreaterThan(0);
  });
});
