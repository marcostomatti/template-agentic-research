/**
 * Cases for `./rss.ts`: the `rss` renderer, and the escape that is
 * the whole of what makes its document safe.
 *
 * WHAT THIS FILE IS FOR IS THE ESCAPE. The two markdown renderers put
 * a shared composition under their own preamble and their cases are
 * about the difference between them; this renderer composes its whole
 * document, and every value in it reaches the bytes through one
 * function. So {@link escapeXmlText} is driven directly before any
 * document is rendered, and then again through a finding whose stored
 * text carries an ampersand, an angle bracket and a stray control
 * character — the three shapes the pass exists for, in the position a
 * stranger's text actually arrives in.
 *
 * THE CONTROL CHARACTER IS NOT ESCAPED AND THAT IS THE POINT. XML 1.0
 * has no representation for one, so the pass removes it, and the case
 * asserts the absence of BOTH the raw byte and a numeric character
 * reference. Beside it sit the three controls XML does admit and the
 * delete character it also admits, so the removal is shown to
 * discriminate rather than to strip everything below a threshold.
 *
 * THE ORDERING OF THE FIVE ENTITIES IS ITS OWN CASE. Ampersand first
 * is the only order that works, and the reading that catches a wrong
 * one is an already-escaped entity going through the pass: `&lt;`
 * comes back as `&amp;lt;` under the correct order and unchanged
 * under any order that escapes the ampersand last.
 *
 * THE TWO LAYERS ARE HELD APART. The escaper alone turns a tag into
 * an escaped tag; the reduction that runs before it removes the tag
 * outright. A case drives one string through both routes so the
 * difference is a reading rather than a paragraph — which matters
 * because a feed reader conventionally renders a description as HTML,
 * and an escaped tag would be markup again on the other side of the
 * parse.
 *
 * THE EDGES COME FIRST. An empty findings list, a briefing with no
 * prose, a stamp nothing can read and a domain slug that reduces away
 * are each a stored state, and each is driven before the
 * whole-document case.
 *
 * TWO PHRASES THIS MODULE SPELLS A SECOND TIME are held against the
 * module that spells them first: the `(score N)` shape
 * `./markdown-body.ts` writes into a bullet, and the marker it shows
 * for a value that cannot be written down. The first is a deliberate
 * second spelling and nothing in either module compares them; the
 * second is imported, and the case is what says the two readings
 * behind it still agree.
 *
 * THE ELEMENT ROSTERS ARE HELD AGAINST WHAT THE CASES REACHED.
 * {@link RENDERED} records every document produced and the guards at
 * the foot hold both rosters against that record, with a fabricated
 * element asserted absent so the reading is shown discriminating.
 * Every element but the title and the link is omitted for some stored
 * state driven above, so the guards are live rather than satisfied by
 * construction.
 *
 * The fixture is a rainfall bulletin, the neutral subject
 * `./index.test.ts`, `./markdown-body.test.ts`,
 * `./obsidian-md.test.ts` and `./notion-md.test.ts` already use for
 * the same four rows. It is written out again rather than imported,
 * because the claims here are about whole documents and a fixture
 * shared across two files is a fixture either may change.
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
import { UNREADABLE_MEMBER, composeMarkdownBody } from './markdown-body.js';
import {
  CHANNEL_URN_PREFIX,
  GUID_PERMALINK_ATTRIBUTE,
  ITEM_URN_PREFIX,
  RSS_CHANNEL_ELEMENTS,
  RSS_EXTENSION,
  RSS_ITEM_ELEMENTS,
  RSS_MEDIA_TYPE,
  RSS_RENDERER,
  RSS_VERSION,
  XML_DECLARATION,
  XML_PREDEFINED_ENTITIES,
  escapeXmlText,
  renderRssFeed,
} from './rss.js';

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
  format: 'rss',
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

/** The bell character, which XML 1.0 cannot carry at all. */
const BELL = String.fromCharCode(0x07);

/** The three controls it does carry, and the delete it also does. */
const TAB = String.fromCharCode(0x09);
const NEWLINE = String.fromCharCode(0x0a);
const RETURN = String.fromCharCode(0x0d);
const DELETE = String.fromCharCode(0x7f);

/** One half of a pair, which no encoding of this document holds. */
const LONE_SURROGATE = String.fromCharCode(0xd800);

/** A whole one, which is the control beside it. */
const ASTRAL_PAIR = String.fromCodePoint(0x1f30a);

/** The apostrophe, built rather than escaped into a literal. */
const APOSTROPHE = String.fromCharCode(0x27);

/**
 * The text the hostile finding carries, and what the pass owes it.
 *
 * The three shapes the scoped claim names, in one value: an
 * ampersand, an angle bracket either way round, and a control
 * character. None of them is a complete tag, so the reduction leaves
 * every one of them standing and the escape is what has to answer —
 * which is what makes this a reading about the escape rather than
 * about the sanitizer that ran before it.
 */
const HOSTILE_TEXT = '3 < 5 & 7 > 2' + BELL + ' north';

/** What the pass answers for it. */
const HOSTILE_ESCAPED = '3 &lt; 5 &amp; 7 &gt; 2 north';

/**
 * A finding whose stored text is hostile in three ways at once.
 *
 * A measured zero and an absence sit beside them in the same record,
 * so the field cases read the null-vs-zero law off the same item the
 * escaping cases read.
 */
const HOSTILE_FINDING = {
  id: 503,
  domainId: RAINFALL_DOMAIN.id,
  documentId: 90,
  entityId: null,
  fields: {
    gauge: HOSTILE_TEXT,
    note: 'alert <script>x</script> here',
    depth: 0,
    missing: null,
  },
  score: 4,
  scoreVersion: 2,
  createdAt: new Date('2026-08-29T08:00:00.000Z'),
} satisfies ExportFindingRow;

/** The stored digest a whole feed is rendered from. */
const STORED_BRIEFING = {
  id: 11,
  domainId: RAINFALL_DOMAIN.id,
  runId: 90,
  body: 'Two gauges reported and one did not.',
  payload: null,
  generatedAt: new Date('2026-08-30T00:00:00.000Z'),
} satisfies ExportBriefingRow;

/**
 * A briefing whose drafting step answered nothing.
 *
 * NULL and `''` are different states and this is the first: the
 * channel carries no description element at all.
 */
const QUIET_BRIEFING = {
  ...STORED_BRIEFING,
  body: null,
} satisfies ExportBriefingRow;

/** The second: a stored empty string, which writes an empty one. */
const BLANK_BRIEFING = {
  ...STORED_BRIEFING,
  body: '',
} satisfies ExportBriefingRow;

/**
 * The same briefing with a stamp nothing can read.
 *
 * The member that would otherwise reach a `pubDate` element as the
 * literal text `Invalid Date`, which is what `toUTCString` answers
 * where `toISOString` throws.
 */
const UNSTAMPED_BRIEFING = {
  ...STORED_BRIEFING,
  generatedAt: new Date('not a moment'),
} satisfies ExportBriefingRow;

/** A domain whose slug reduces to nothing at all. */
const UNNAMED_DOMAIN = {
  ...RAINFALL_DOMAIN,
  slug: '???',
} satisfies ExportDomainRow;

/** A domain naming no alias, which falls back to the neutral word. */
const UNALIASED_DOMAIN = {
  ...RAINFALL_DOMAIN,
  settings: {},
} satisfies ExportDomainRow;

/** What separates two lines of one document. */
const LINE_SEPARATOR = '\n';

/** An element name no document here writes. */
const ABSENT_ELEMENT = ['en', 'closure'].join('');

/**
 * Every document a case rendered, for the guards at the foot.
 *
 * Accumulated rather than declared a second time, because the claim
 * is about what the cases DID. vitest runs describe blocks in
 * declaration order, so the guards read a full record.
 */
const RENDERED: string[] = [];

/**
 * The four stored rows one render is of.
 *
 * @param briefing - The stored digest to render.
 * @param findings - The rows the pass selected.
 * @param domain - The domain it belongs to.
 * @returns The render input.
 */
function inputFor(
  briefing: ExportBriefingRow,
  findings: readonly ExportFindingRow[] = SELECTED_FINDINGS,
  domain: ExportDomainRow = RAINFALL_DOMAIN,
): ExportRenderInput {
  return {
    domain,
    briefing,
    findings,
    subscription: STANDING_SUBSCRIPTION,
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
 * @param findings - The rows the pass selected.
 * @param domain - The domain it belongs to.
 * @returns The artifacts the renderer answered.
 */
function renderWith(
  briefing: ExportBriefingRow,
  findings: readonly ExportFindingRow[] = SELECTED_FINDINGS,
  domain: ExportDomainRow = RAINFALL_DOMAIN,
): readonly ExportArtifact[] {
  const artifacts = renderRssFeed(inputFor(briefing, findings, domain));

  for (const artifact of artifacts) {
    RENDERED.push(String(artifact.body));
  }

  return artifacts;
}

/**
 * The one document a render answered, as text.
 *
 * Answers the empty string for a render that answered no artifact,
 * which every case reading this asserts the length of first.
 *
 * @param briefing - The stored digest to render.
 * @param findings - The rows the pass selected.
 * @param domain - The domain it belongs to.
 * @returns The feed, or `''` when none was answered.
 */
function feedFor(
  briefing: ExportBriefingRow,
  findings: readonly ExportFindingRow[] = SELECTED_FINDINGS,
  domain: ExportDomainRow = RAINFALL_DOMAIN,
): string {
  const [artifact] = renderWith(briefing, findings, domain);

  return artifact === undefined
    ? ''
    : String(artifact.body);
}

/**
 * The one path a render answered.
 *
 * @param briefing - The stored digest to render.
 * @param findings - The rows the pass selected.
 * @param domain - The domain it belongs to.
 * @returns The path, or `''` when no artifact was answered.
 */
function pathFor(
  briefing: ExportBriefingRow,
  findings: readonly ExportFindingRow[] = SELECTED_FINDINGS,
  domain: ExportDomainRow = RAINFALL_DOMAIN,
): string {
  const [artifact] = renderWith(briefing, findings, domain);

  return artifact?.path ?? '';
}

/**
 * Every value written under one element name, in document order.
 *
 * Read with a pattern rather than by line, because a description
 * whose finding holds several fields legitimately spans lines — the
 * module writes content flush against its tags so that layout
 * indentation never becomes part of what a reader shows.
 *
 * @param document - The feed text.
 * @param name - The element to read.
 * @returns Every value found under it.
 */
function elementValues(
  document: string,
  name: string,
): readonly string[] {
  const pattern = new RegExp(
    '<' + name + '(?: [^>]*)?>([\\s\\S]*?)</' + name + '>',
    'g',
  );
  const found = [...document.matchAll(pattern)];

  return found.map((match) => match[1] ?? '');
}

/**
 * Everything above the first item, which is the channel's own head.
 *
 * @param document - The feed text.
 * @returns The head, or the whole document when it holds no item.
 */
function channelHead(document: string): string {
  const start = document.indexOf('<item>');

  return start === -1
    ? document
    : document.slice(0, start);
}

/**
 * The element names left open by a document, or the first one closed
 * out of order.
 *
 * A well-formedness reading that needs no parser: every opening tag
 * is pushed and every closing tag has to match the top of the stack.
 * An empty answer is the whole verdict, and the cases pair it with a
 * planted broken document so the reading is shown discriminating.
 *
 * @param document - The feed text.
 * @returns The unbalanced names, empty when every tag is matched.
 */
function unbalanced(document: string): readonly string[] {
  const open: string[] = [];

  for (const match of document.matchAll(/<(\/?)([a-zA-Z][^\s/>]*)[^>]*>/g)) {
    const closing = match[1];
    const name = String(match[2]);

    if (closing !== '/') {
      open.push(name);
    } else if (open.pop() !== name) {
      return [name];
    }
  }

  return open;
}

/**
 * Every ampersand in a document that opens none of the five entities.
 *
 * The other half of the well-formedness reading, and the one an
 * escaper applied in the wrong order fails: an ampersand escaped last
 * leaves `&lt;` standing as a bare reference this returns.
 *
 * @param document - The feed text.
 * @returns The text after each dangling ampersand.
 */
function danglingAmpersands(document: string): readonly string[] {
  const tails = document.split('&').slice(1);
  const bodies = XML_PREDEFINED_ENTITIES.map(
    (predefined) => predefined.entity.slice(1),
  );

  return tails.filter(
    (tail) => !bodies.some((body) => tail.startsWith(body)),
  );
}

/**
 * One channel element's value, read above the first item.
 *
 * @param document - The feed text.
 * @param name - The element to read.
 * @returns The value, or `''` when the channel carries none.
 */
function channelValue(document: string, name: string): string {
  return elementValues(channelHead(document), name).join('');
}

/** Every channel value a feed carries, in roster order. */
function channelValues(document: string): readonly string[] {
  return RSS_CHANNEL_ELEMENTS.map((name) => channelValue(document, name));
}

/**
 * One item's element value, read out of the item that holds it.
 *
 * @param document - The feed text.
 * @param index - Which item, in document order.
 * @param name - The element to read.
 * @returns The value, or `''` when that item carries none.
 */
function itemValue(
  document: string,
  index: number,
  name: string,
): string {
  const item = elementValues(document, 'item')[index];

  return item === undefined
    ? ''
    : elementValues(item, name).join('');
}

/**
 * A value `JSON.stringify` refuses, which is the shape that reaches
 * {@link UNREADABLE_MEMBER} in both modules that read a stored field.
 *
 * @returns An object holding itself.
 */
function circularValue(): Record<string, unknown> {
  const value: Record<string, unknown> = {};

  value['self'] = value;

  return value;
}

/** A field value nothing can write down, for the marker cases. */
const CIRCULAR_VALUE = circularValue();

/** A finding carrying one, driven through this module. */
const CIRCULAR_FINDING = {
  id: 504,
  domainId: RAINFALL_DOMAIN.id,
  documentId: 91,
  entityId: null,
  fields: { reading: CIRCULAR_VALUE },
  score: null,
  scoreVersion: null,
  createdAt: new Date('2026-08-29T09:00:00.000Z'),
} satisfies ExportFindingRow;

/**
 * A stored assembly holding the same field, for the other module.
 *
 * `./markdown-body.ts` reads its findings out of the payload where
 * this renderer reads them off the rows, so the one shape that
 * reaches the marker has to be planted in both places to be driven
 * through both readings.
 */
const CIRCULAR_BRIEFING = {
  ...STORED_BRIEFING,
  payload: {
    sections: [
      {
        key: 'gauges',
        heading: 'Gauges',
        count: 1,
        findings: [{ id: 504, fields: { reading: CIRCULAR_VALUE } }],
      },
    ],
  },
} satisfies ExportBriefingRow;

/** The same, holding the measured zero the score phrase is read off. */
const SECTIONED_BRIEFING = {
  ...STORED_BRIEFING,
  payload: {
    sections: [
      {
        key: 'gauges',
        heading: 'Gauges',
        count: 1,
        findings: [{ id: 501, score: 0, fields: { gauge: 'north ridge' } }],
      },
    ],
  },
} satisfies ExportBriefingRow;

/** A string carrying a scheme, for the network sweep's control. */
const PLANTED_SCHEME = 'see http: for the rest';

/** The path that feed takes: the domain folder, the day, the row. */
const WHOLE_FEED_PATH = 'rainfall-bulletin/2026-08-30-11.xml';

/** The document the fixture renders, written as lines. */
const WHOLE_FEED = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<rss version="2.0">',
  '  <channel>',
  '    <title>Rainfall bulletin</title>',
  '    <link>urn:ar:domain:rainfall-bulletin</link>',
  '    <description>Two gauges reported and one did not.</description>',
  '    <pubDate>Sun, 30 Aug 2026 00:00:00 GMT</pubDate>',
  '    <item>',
  '      <title>Readings 501 (score 0)</title>',
  '      <guid isPermaLink="false">urn:ar:finding:501</guid>',
  '      <description>gauge: north ridge</description>',
  '      <pubDate>Sat, 29 Aug 2026 06:00:00 GMT</pubDate>',
  '    </item>',
  '    <item>',
  '      <title>Readings 502</title>',
  '      <guid isPermaLink="false">urn:ar:finding:502</guid>',
  '      <description>gauge: south flat</description>',
  '      <pubDate>Sat, 29 Aug 2026 07:00:00 GMT</pubDate>',
  '    </item>',
  '  </channel>',
  '</rss>',
  '',
].join(LINE_SEPARATOR);

/**
 * One element of the item a hostile render answers.
 *
 * @param name - The element to read.
 * @returns Its value, or `''` when the item carries none.
 */
function hostileValue(name: string): string {
  return itemValue(feedFor(STORED_BRIEFING, [HOSTILE_FINDING]), 0, name);
}

// ---------------------------------------------------------------------------
// The escape, which is what makes this document safe
// ---------------------------------------------------------------------------

describe('the five predefined entities', () => {
  it('are every one of them escaped', () => {
    const raw = '& < > "' + APOSTROPHE;

    expect(escapeXmlText(raw)).toBe('&amp; &lt; &gt; &quot;&apos;');
  });

  it('are declared in the order they are applied', () => {
    const characters = XML_PREDEFINED_ENTITIES.map(
      (predefined) => predefined.character,
    );

    expect(characters).toStrictEqual(['&', '<', '>', '"', APOSTROPHE]);
  });

  it('put the ampersand first, which is the correctness', () => {
    // An already-escaped entity is what reads the order: under any
    // order escaping the ampersand last this comes back unchanged.
    expect(escapeXmlText('&lt;')).toBe('&amp;lt;');
  });
});

describe('a character XML 1.0 cannot carry', () => {
  it('is removed rather than escaped', () => {
    // The format offers no representation at all, so a numeric
    // character reference would be as illegal as the byte.
    const answered = escapeXmlText('a' + BELL + 'b');

    expect(answered).toBe('ab');
    expect(answered).not.toContain('&#7');
  });

  it('leaves the three controls XML does admit', () => {
    const raw = 'a' + TAB + NEWLINE + RETURN + 'b';

    expect(escapeXmlText(raw)).toBe(raw);
  });

  it('leaves delete, which XML 1.0 also admits', () => {
    // Only XML 1.1 restricts it and this document declares 1.0, so
    // its survival is a reading rather than an oversight.
    const raw = 'a' + DELETE + 'b';

    expect(escapeXmlText(raw)).toBe(raw);
  });

  it('drops a lone surrogate the encoding cannot hold', () => {
    expect(escapeXmlText('a' + LONE_SURROGATE + 'b')).toBe('ab');
  });

  it('keeps a whole pair, which is the control beside it', () => {
    // The class matches by code point under the unicode flag, so a
    // valid pair is offered above the range and never matches.
    const raw = 'a' + ASTRAL_PAIR + 'b';

    expect(escapeXmlText(raw)).toBe(raw);
    expect(ASTRAL_PAIR).toHaveLength(2);
  });
});

describe('the reduction that runs before the escape', () => {
  it('removes a tag the escape would only have escaped', () => {
    // Two layers answering two questions: a feed reader renders a
    // description as HTML, so an escaped tag is markup again on the
    // other side of the parse.
    const raw = 'alert <script>x</script> here';
    const described = hostileValue('description');

    expect(escapeXmlText(raw)).toContain('&lt;script&gt;');
    expect(described).toContain('note: alert x here');
    expect(described).not.toContain('script');
  });
});

// ---------------------------------------------------------------------------
// The hostile finding, in the position a stranger's text arrives in
// ---------------------------------------------------------------------------

describe('a finding whose text is hostile three ways', () => {
  it('escapes the ampersand and both angle brackets', () => {
    const described = hostileValue('description');

    expect(described).toContain('gauge: ' + HOSTILE_ESCAPED);
  });

  it('drops the control character rather than encoding it', () => {
    const feed = feedFor(STORED_BRIEFING, [HOSTILE_FINDING]);

    // The stored value carried one, which is the live control: a
    // fixture that had lost it satisfies both assertions below.
    expect(HOSTILE_TEXT).toContain(BELL);
    expect(feed).not.toContain(BELL);
    expect(feed).not.toContain('&#7');
  });

  it('leaves no ampersand that opens no entity', () => {
    const feed = feedFor(STORED_BRIEFING, [HOSTILE_FINDING]);

    expect(danglingAmpersands(feed)).toStrictEqual([]);
    expect(feed).toContain('&amp;');
  });

  it('closes every element it opened', () => {
    const feed = feedFor(STORED_BRIEFING, [HOSTILE_FINDING]);

    expect(unbalanced(feed)).toStrictEqual([]);
  });

  it('reads both verdicts off readings that discriminate', () => {
    // The planted controls: an empty answer from a reader that had
    // stopped reading looks exactly like a clean document.
    expect(unbalanced('<rss><channel></rss>')).toStrictEqual(['rss']);
    expect(danglingAmpersands('a & b')).toStrictEqual([' b']);
  });

  it('shows a measured zero and leaves an absence out', () => {
    const described = hostileValue('description');

    expect(described).toContain('depth: 0');
    expect(described).not.toContain('missing');
  });

  it('lays its fields out in sorted key order', () => {
    const lines = hostileValue('description').split(LINE_SEPARATOR);

    expect(lines).toStrictEqual([
      'depth: 0',
      'gauge: ' + HOSTILE_ESCAPED,
      'note: alert x here',
    ]);
  });
});

// ---------------------------------------------------------------------------
// The edges, which are what a static export gets wrong
// ---------------------------------------------------------------------------

describe('an empty findings list', () => {
  it('is still written, as a channel with no items', () => {
    // Nothing reads the destination back, so an absent file is
    // indistinguishable from an export that never ran.
    const feed = feedFor(STORED_BRIEFING, []);

    expect(renderWith(STORED_BRIEFING, [])).toHaveLength(1);
    expect(elementValues(feed, 'item')).toStrictEqual([]);
  });

  it('carries the channel a populated feed carries', () => {
    const quiet = channelValues(feedFor(STORED_BRIEFING, []));
    const full = channelValues(feedFor(STORED_BRIEFING));

    expect(quiet).toStrictEqual(full);
    expect(quiet).toHaveLength(RSS_CHANNEL_ELEMENTS.length);
  });

  it('takes the path a populated feed would take', () => {
    expect(pathFor(STORED_BRIEFING, [])).toBe(WHOLE_FEED_PATH);
  });
});

describe('a value the stored row does not carry', () => {
  it('writes no description for a briefing with no prose', () => {
    const feed = feedFor(QUIET_BRIEFING, []);

    expect(channelValue(feed, 'description')).toBe('');
    expect(feed).not.toContain('<description>');
  });

  it('writes an empty one for a stored empty string', () => {
    // NULL and the empty string are different states, which is the
    // whole reason the column is nullable.
    const feed = feedFor(BLANK_BRIEFING, []);

    expect(feed).toContain('<description></description>');
  });

  it('writes no pubDate for a stamp nothing can read', () => {
    // `toUTCString` answers the literal text `Invalid Date` where
    // `toISOString` throws, so the hazard is silent bad data.
    const feed = feedFor(UNSTAMPED_BRIEFING, []);

    expect(feed).not.toContain('<pubDate>');
    expect(feed).not.toContain('Invalid Date');
  });

  it('writes no description for a finding with no fields', () => {
    const bare = { ...HOSTILE_FINDING, fields: {} };
    const feed = feedFor(STORED_BRIEFING, [bare]);

    expect(itemValue(feed, 0, 'description')).toBe('');
  });
});

describe('a score that was measured and one that was not', () => {
  it('titles a measured zero with the number', () => {
    const feed = feedFor(STORED_BRIEFING);

    expect(itemValue(feed, 0, 'title')).toBe('Readings 501 (score 0)');
  });

  it('titles an unscored finding with no score at all', () => {
    const feed = feedFor(STORED_BRIEFING);

    expect(itemValue(feed, 1, 'title')).toBe('Readings 502');
  });

  it('holds a measured zero apart from an absence', () => {
    // Anti-vacuity for both cases above: a selection whose scores
    // are all numbers, or all null, reports neither.
    const scores = SELECTED_FINDINGS.map((finding) => finding.score);

    expect(scores).toContain(0);
    expect(scores).toContain(null);
  });

  it('falls back to the neutral word for a domain with none', () => {
    const rows = SELECTED_FINDINGS;
    const feed = feedFor(STORED_BRIEFING, rows, UNALIASED_DOMAIN);

    expect(itemValue(feed, 0, 'title')).toBe('Findings 501 (score 0)');
  });
});

// ---------------------------------------------------------------------------
// The dates, and the names that are not addresses
// ---------------------------------------------------------------------------

describe('the dates this document carries', () => {
  it('dates the channel from the stored stamp', () => {
    const feed = feedFor(STORED_BRIEFING, []);
    const dated = channelValue(feed, 'pubDate');

    // The literal is the control beside the derivation: two readings
    // that had both stopped answering would agree on two blanks.
    expect(dated).toBe(STORED_BRIEFING.generatedAt.toUTCString());
    expect(dated).toBe('Sun, 30 Aug 2026 00:00:00 GMT');
  });

  it('dates each item from its own creation stamp', () => {
    const feed = feedFor(STORED_BRIEFING);
    const first = itemValue(feed, 0, 'pubDate');
    const second = itemValue(feed, 1, 'pubDate');

    expect(first).toBe('Sat, 29 Aug 2026 06:00:00 GMT');
    expect(second).toBe('Sat, 29 Aug 2026 07:00:00 GMT');
  });

  it('reads no clock, so every stamp is a stored one', () => {
    const feed = feedFor(STORED_BRIEFING);
    const stamps = elementValues(feed, 'pubDate');
    const stored = [
      STORED_BRIEFING.generatedAt,
      ...SELECTED_FINDINGS.map((finding) => finding.createdAt),
    ];

    expect(stamps).toStrictEqual(stored.map((at) => at.toUTCString()));
  });
});

describe('the names this document writes', () => {
  it('links the channel to a urn and not to an address', () => {
    const feed = feedFor(STORED_BRIEFING, []);
    const named = CHANNEL_URN_PREFIX + RAINFALL_DOMAIN.slug;

    expect(channelValue(feed, 'link')).toBe(named);
    expect(named.startsWith('urn:')).toBe(true);
  });

  it('names an item by its row and says it is no link', () => {
    const feed = feedFor(STORED_BRIEFING);
    const attribute = GUID_PERMALINK_ATTRIBUTE + '="false"';

    expect(itemValue(feed, 0, 'guid')).toBe(ITEM_URN_PREFIX + '501');
    expect(feed).toContain('<guid ' + attribute + '>');
  });

  it('reaches no network scheme anywhere in a document', () => {
    const feed = feedFor(STORED_BRIEFING, [HOSTILE_FINDING]);
    const schemes = ['http:', 'https:', 'ftp:', 'mailto:'];
    const found = schemes.filter((scheme) => feed.includes(scheme));
    const planted = schemes.filter(
      (scheme) => PLANTED_SCHEME.includes(scheme),
    );

    // The planted control: the same matcher over text that did carry
    // one has to find it, or the sweep proves nothing at all.
    expect(found).toStrictEqual([]);
    expect(planted).toStrictEqual(['http:']);
  });
});

// ---------------------------------------------------------------------------
// The whole document, and that two calls answer the same bytes
// ---------------------------------------------------------------------------

describe('the document over one neutral fixture', () => {
  it('is exactly the lines this module writes', () => {
    expect(feedFor(STORED_BRIEFING)).toBe(WHOLE_FEED);
  });

  it('opens on the declaration and the versioned root', () => {
    const lines = feedFor(STORED_BRIEFING).split(LINE_SEPARATOR);

    expect(lines[0]).toBe(XML_DECLARATION);
    expect(lines[1]).toBe('<rss version="' + RSS_VERSION + '">');
  });

  it('holds one item per finding, in the order handed in', () => {
    const feed = feedFor(STORED_BRIEFING);
    const guids = elementValues(feed, 'guid');
    const named = SELECTED_FINDINGS.map(
      (finding) => ITEM_URN_PREFIX + String(finding.id),
    );

    expect(guids).toStrictEqual(named);
  });

  it('ends in a newline and closes both its wrappers', () => {
    const feed = feedFor(STORED_BRIEFING);

    expect(feed.endsWith('</rss>' + LINE_SEPARATOR)).toBe(true);
    expect(unbalanced(feed)).toStrictEqual([]);
  });
});

describe('rendering one input twice', () => {
  it('answers identical bytes', () => {
    const first = renderWith(STORED_BRIEFING);
    const second = renderWith(STORED_BRIEFING);

    expect(second).toStrictEqual(first);
  });

  it('answers identical bytes for a quiet period too', () => {
    // The branch with no items and no description, which is where a
    // value read off a clock would show up first.
    expect(feedFor(QUIET_BRIEFING, [])).toBe(feedFor(QUIET_BRIEFING, []));
  });

  it('answers identical bytes over the hostile finding', () => {
    expect(hostileValue('description')).toBe(hostileValue('description'));
  });

  it('writes nothing into the input it was handed', () => {
    // Over a clone of the input as it stood before any case ran —
    // see {@link PRISTINE_INPUT} for why a clone of the fixtures
    // themselves would no longer report an idempotent write.
    const input = structuredClone(PRISTINE_INPUT);
    const before = JSON.stringify(input);

    renderRssFeed(input);

    expect(JSON.stringify(input)).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// The artifact, its path, and the two phrases spelt twice
// ---------------------------------------------------------------------------

describe('the artifact and the path it names', () => {
  it('carries the four members a contract artifact has', () => {
    const [artifact] = renderWith(STORED_BRIEFING);
    const keys = Object.keys(artifact ?? {}).sort();

    expect(keys).toStrictEqual(['body', 'format', 'mediaType', 'path']);
  });

  it('answers the feed media type and this format', () => {
    const [artifact] = renderWith(STORED_BRIEFING);

    expect(artifact?.format).toBe('rss');
    expect(artifact?.mediaType).toBe(RSS_MEDIA_TYPE);
    expect(RSS_MEDIA_TYPE).toBe('application/rss+xml');
  });

  it('is one the path rule itself accepts', () => {
    // Read through the rule rather than by looking for a leading
    // separator, so every shape it refuses is covered here and not
    // only the one a case thought of.
    const paths = [
      pathFor(STORED_BRIEFING),
      pathFor(STORED_BRIEFING, []),
      pathFor(UNSTAMPED_BRIEFING, []),
    ];

    for (const path of paths) {
      expect(checkArtifactPath(path).ok).toBe(true);
    }

    expect(paths).toHaveLength(3);
  });

  it('opens at the destination and climbs out of none', () => {
    const path = pathFor(STORED_BRIEFING);

    expect(path.startsWith('/')).toBe(false);
    expect(path.split('/')).not.toContain('..');
    expect(path).toBe(WHOLE_FEED_PATH);
  });

  it('ends in the extension this renderer declares', () => {
    expect(pathFor(STORED_BRIEFING)).toContain('.' + RSS_EXTENSION);
  });

  it('names the file by the row when the day is gone', () => {
    const named = pathFor(UNSTAMPED_BRIEFING, []);

    expect(named).toBe('rainfall-bulletin/11.xml');
  });

  it('answers no artifact for a slug that reduces away', () => {
    // For a static export that would be a file nobody can trace and
    // nothing can withdraw.
    const answered = renderWith(STORED_BRIEFING, [], UNNAMED_DOMAIN);

    expect(answered).toStrictEqual([]);
  });
});

describe('the two phrases this module spells a second time', () => {
  it('scores an item exactly as a bullet is scored', () => {
    const body = composeMarkdownBody(inputFor(SECTIONED_BRIEFING), {
      headingDepth: 1,
    });
    const titled = itemValue(feedFor(STORED_BRIEFING), 0, 'title');

    expect(titled).toContain('(score 0)');
    expect(body).toContain('(score 0)');
  });

  it('marks a value nothing can write with one marker', () => {
    const body = composeMarkdownBody(inputFor(CIRCULAR_BRIEFING), {
      headingDepth: 1,
    });
    const feed = feedFor(STORED_BRIEFING, [CIRCULAR_FINDING]);
    const described = itemValue(feed, 0, 'description');

    expect(described).toContain('reading: ' + UNREADABLE_MEMBER);
    expect(body).toContain('reading: ' + UNREADABLE_MEMBER);
  });
});

// ---------------------------------------------------------------------------
// The guards: what a later edit has to keep true
// ---------------------------------------------------------------------------

describe('the renderer the registry will name', () => {
  it('serves the format a stored row can carry', () => {
    const formats: readonly string[] = EXPORT_FORMATS;

    expect(RSS_RENDERER.format).toBe('rss');
    expect(formats).toContain(RSS_RENDERER.format);
  });

  it('has the two members a renderer is allowed', () => {
    expect(Object.keys(RSS_RENDERER).sort()).toStrictEqual([
      'format',
      'render',
    ]);
  });

  it('renders through the function this module exports', () => {
    const through = RSS_RENDERER.render(inputFor(STORED_BRIEFING));
    const direct = renderRssFeed(inputFor(STORED_BRIEFING));

    expect(through).toHaveLength(1);
    expect(through).toStrictEqual(direct);
  });
});

describe('the element rosters this module declares', () => {
  it('are each reached on a channel by the cases above', () => {
    const heads = RENDERED.map((feed) => channelHead(feed));
    const reached = RSS_CHANNEL_ELEMENTS.filter(
      (name) => heads.some((head) => head.includes('</' + name + '>')),
    );

    // Both directions in one comparison: two of the four are left
    // out for some stored state driven above, so the reading is
    // live rather than satisfied by construction.
    expect(reached).toStrictEqual([...RSS_CHANNEL_ELEMENTS]);
  });

  it('are each reached on an item by the cases above', () => {
    const items = RENDERED.flatMap((feed) => elementValues(feed, 'item'));
    const reached = RSS_ITEM_ELEMENTS.filter(
      (name) => items.some((item) => item.includes('</' + name + '>')),
    );

    expect(reached).toStrictEqual([...RSS_ITEM_ELEMENTS]);
    expect(items.length).toBeGreaterThan(0);
  });

  it('do not name one no document ever writes', () => {
    const declared: readonly string[] = RSS_ITEM_ELEMENTS;
    const opened = '<' + ABSENT_ELEMENT + '>';
    const seen = RENDERED.some((feed) => feed.includes(opened));

    // The control beside both equalities above: a record that had
    // stopped discriminating satisfies them exactly as a live one.
    expect(declared).not.toContain(ABSENT_ELEMENT);
    expect(seen).toBe(false);
    expect(RENDERED.length).toBeGreaterThan(0);
  });
});
