/**
 * Cases for the four registered renderers TOGETHER, over ONE
 * neutral fixture.
 *
 * Each renderer's own colocated file under `src/exports/` pins its
 * own bytes, and none of them can say anything about the SET. Four
 * claims here are properties of the registry rather than of any one
 * module: every artifact path is destination-relative, every
 * renderer answers the same artifact list on a second call, no
 * renderer writes into the input it was handed, and a finding
 * carrying an injection vector comes out as text in all four
 * documents with none of its active forms. So they are read here
 * and nowhere else.
 *
 * THE ROSTER IS DERIVED AND NEVER WRITTEN OUT. `EXPORT_FORMATS` is
 * the column's own vocabulary and `rendererFor` is the split, so a
 * fifth renderer joins every case below with no edit here, and a
 * format that lost its renderer leaves a case naming it. What a
 * derived list cannot say for itself is that the cases actually
 * drove it, which is what {@link RENDERED_FORMATS} and the guard at
 * the foot are for.
 *
 * THE FIXTURE IS BUILT FRESH PER CASE. {@link buildInput} shares no
 * object with any input it answered before — the domain is cloned,
 * the subscription is copied, and every other row is a literal built
 * on the call. That is what lets the purity case be a reading of
 * THIS render: a before/after equality over fixture constants
 * several cases render cannot see an idempotent write, because the
 * module has already made it by the time the case runs.
 *
 * THE INJECTED VALUE IS READ THROUGH MARKERS rather than by
 * scanning a document. Every renderer's own scaffolding carries
 * active forms of its own — a markdown heading, a front-matter
 * fence, every tag in the feed — so a predicate run over a whole
 * artifact reports the renderer and not the vector. The field
 * arrives wrapped between two alphanumeric markers that survive both
 * the reduction and the escape, and what the cases read is the slice
 * between them: the untrusted text as that format wrote it, with
 * nothing of the renderer's own inside it.
 *
 * Those markers are plain literals rather than assembled from
 * fragments. The assembly convention guards against a needle
 * answering ITSELF out of the file being scanned, and nothing here
 * scans this file: what is scanned is a value a renderer produced
 * from text this file planted.
 *
 * THE VECTOR GOES INTO TWO PLACES, because the formats read two
 * different members. The three markdown renderers compose from
 * `briefings.payload` alone and the feed lays out
 * {@link ExportRenderInput.findings}, so one finding carries the
 * value in the stored section AND in the row beside it — which is
 * the pairing `ar-digest` writes anyway.
 *
 * A fragment arrives ESCAPED in the feed and verbatim in the three
 * markdown documents, so {@link ESCAPING_FORMATS} says which is
 * which and {@link xmlEscaped} is a second spelling of the five
 * predefined entities. A format registered later and left out of
 * that roster is read as carrying its fragments verbatim, and a case
 * reddens if that is wrong.
 *
 * WHAT MAKES THE ZEROES MEAN ANYTHING. {@link activeFormsLeftIn} is
 * a copy of the predicate `tests/lib/injection.test.ts` uses, held
 * against a vocabulary it does not own, and driven over each RAW
 * vector before any render — four of the six carry forms, so an
 * empty answer over a rendered slice comes from a predicate that has
 * just been seen to find something. The two pure-prose vectors have
 * no such control and lean on their surviving fragments instead,
 * which is the same split the fixture module states.
 *
 * The subject is a rainfall bulletin, which is the neutral subject
 * every case file under `src/exports/` already uses.
 */
import type { ArtifactPathResult } from '../../src/exports/artifact-path.js';
import type {
  ExportArtifact,
  ExportBriefingRow,
  ExportDomainRow,
  ExportFindingRow,
  ExportRenderInput,
  ExportRenderer,
  ExportSubscriptionRow,
} from '../../src/exports/index.js';
import type { InjectionVector } from '../lib/injection-fixtures.js';

import { describe, expect, it } from 'vitest';

import { EXPORT_FORMATS } from '../../src/db/schema/values.js';
import { checkArtifactPath } from '../../src/exports/artifact-path.js';
import { rendererFor } from '../../src/exports/index.js';
import {
  INJECTION_ACTIVE_FORM_IDS,
  INJECTION_VECTORS,
} from '../lib/injection-fixtures.js';

// ---------------------------------------------------------------------------
// The one neutral fixture
// ---------------------------------------------------------------------------

/** The domain every render below is of. */
const RAINFALL_DOMAIN = {
  id: 4,
  slug: 'rainfall-bulletin',
  name: 'Rainfall bulletin',
  settings: { findingsDisplayName: 'Readings' },
} satisfies ExportDomainRow;

/** The prose half of the stored digest. */
const BRIEFING_PROSE = 'Two gauges reported and one did not.';

/** The one failure the run before this one recorded. */
const BANNER_ENTRY = 'ingest refused a feed';

/** The report field before anything hostile is put in it. */
const NEUTRAL_REPORT = 'rain fell overnight';

/** When the briefing was written. */
const GENERATED_AT = '2026-08-30T00:00:00.000Z';

/**
 * One subscription row per format the column can carry, `pdf`
 * included.
 *
 * Derived from `EXPORT_FORMATS` rather than written out, so the row
 * a render is dispatched for exists for every member of the union —
 * including the one the registry refuses, which no case renders and
 * which the guard at the foot asserts nothing rendered.
 */
const SUBSCRIPTIONS: readonly ExportSubscriptionRow[] = EXPORT_FORMATS
  .map((format, index) => ({
    id: 70 + index,
    domainId: RAINFALL_DOMAIN.id,
    format,
    connectorId: 3,
  }));

/**
 * The subscription row naming this format.
 *
 * Refuses rather than answering `undefined`, on the reading
 * `vectorById` states in the fixture module: a case handed a row
 * that is not there would render against a subscription nobody
 * declared and pass.
 *
 * @param format - The format wanted, as a stored row spells it.
 * @returns That subscription row.
 */
function subscriptionFor(format: string): ExportSubscriptionRow {
  const found = SUBSCRIPTIONS.find((row) => row.format === format);

  if (found === undefined) {
    throw new Error(`[renderers] no subscription row for "${format}".`);
  }

  return found;
}

/**
 * The findings the pass selected: one scored zero, one not scored.
 *
 * The pairing is what a renderer reading absence as a zero fails on,
 * and it is why neither an all-scored nor an all-null selection is
 * used here. The first row is the one that carries the report field,
 * so the same value reaches the feed's items and the markdown
 * sections.
 *
 * @param report - What the first finding reports.
 * @returns The two rows, in the order the assembly fixed.
 */
function selectedFindings(report: string): ExportFindingRow[] {
  return [
    {
      id: 501,
      domainId: RAINFALL_DOMAIN.id,
      documentId: 88,
      entityId: null,
      fields: { gauge: 'north ridge', report },
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
  ];
}

/**
 * The structured half of the digest, as `ar-digest` stored it.
 *
 * Two sections: one read and holding findings, one read and holding
 * none — the null-versus-zero pairing at the section level, beside
 * the score pairing on the rows. The banner is present, so every
 * markdown document below carries one.
 *
 * `unknown` rather than an assembly type, which is what the column
 * itself carries: nothing validates a stored payload on the way back
 * out, and the renderers narrow what they read.
 *
 * @param report - What the first finding reports.
 * @returns The payload, as a stored row holds it.
 */
function storedAssembly(report: string): unknown {
  return {
    displayName: 'Readings',
    sections: [
      {
        key: 'gauges',
        heading: 'Gauges',
        count: 2,
        findings: [
          { id: 501, score: 0, fields: { gauge: 'north ridge', report } },
          { id: 502, score: null, fields: { gauge: 'south flat' } },
        ],
      },
      { key: null, heading: 'Readings', count: 0, findings: [] },
    ],
    total: 2,
    banner: { entries: [BANNER_ENTRY], wellFormed: true },
  };
}

/**
 * The stored digest one render is of.
 *
 * @param report - What the first finding reports.
 * @returns The briefing row.
 */
function storedBriefing(report: string): ExportBriefingRow {
  return {
    id: 11,
    domainId: RAINFALL_DOMAIN.id,
    runId: 90,
    body: BRIEFING_PROSE,
    payload: storedAssembly(report),
    generatedAt: new Date(GENERATED_AT),
  };
}

/**
 * The four stored rows one render is given, sharing nothing.
 *
 * Every member is built on the call — the domain through a clone,
 * the subscription through a copy whose own members are all scalars,
 * and the rest as literals. So no two inputs this function answers
 * are connected, which is what the purity case rests on.
 *
 * @param format - The format being rendered, naming the subscription.
 * @param report - What the first finding reports.
 * @returns The input, ready to hand to a renderer.
 */
function buildInput(
  format: string,
  report = NEUTRAL_REPORT,
): ExportRenderInput {
  return {
    domain: structuredClone(RAINFALL_DOMAIN),
    briefing: storedBriefing(report),
    findings: selectedFindings(report),
    subscription: { ...subscriptionFor(format) },
  };
}

// ---------------------------------------------------------------------------
// The renderers these cases drive
// ---------------------------------------------------------------------------

/** One registered renderer, under the format that selected it. */
interface DrivenRenderer {
  /** The format a stored row names, and the registry's own key. */
  readonly format: string;

  /** What the registry answered for it. */
  readonly renderer: ExportRenderer;
}

/**
 * Every format the registry answers a renderer for.
 *
 * Read off `EXPORT_FORMATS` through the selector rather than
 * written out, so this file states no arity at all: `./index.test.ts`
 * owns which entry each key holds, and what is wanted here is
 * whatever renders.
 *
 * @returns One entry per registered renderer, in column order.
 */
function drivenRenderers(): DrivenRenderer[] {
  const driven: DrivenRenderer[] = [];

  for (const format of EXPORT_FORMATS) {
    const renderer = rendererFor(format);

    if (renderer !== null) {
      driven.push({ format, renderer });
    }
  }

  return driven;
}

/** The renderers every case below is driven over. */
const DRIVEN: readonly DrivenRenderer[] = drivenRenderers();

/**
 * Every format a case actually rendered, for the guard at the foot.
 *
 * Accumulated rather than declared a second time, because the claim
 * is about what the cases DID. vitest runs describe blocks in
 * declaration order, so the guard reads a full record.
 */
const RENDERED_FORMATS = new Set<string>();

/**
 * One render, recorded on the way past.
 *
 * @param entry - The renderer and the format that selected it.
 * @param input - The four stored rows to render.
 * @returns The artifacts it answered.
 */
function renderWith(
  entry: DrivenRenderer,
  input: ExportRenderInput,
): readonly ExportArtifact[] {
  RENDERED_FORMATS.add(entry.format);

  return entry.renderer.render(input);
}

/**
 * A per-format record with an empty list under every driven format.
 *
 * What the injection cases compare against. Built from the roster
 * rather than written out, so a fifth renderer is expected to be
 * clean without an edit here and a missing format shows as a key the
 * answer does not carry.
 *
 * @returns The record, keyed by format.
 */
function cleanPerFormat(): Record<string, readonly string[]> {
  const clean: Record<string, readonly string[]> = {};

  for (const entry of DRIVEN) {
    clean[entry.format] = [];
  }

  return clean;
}

// ---------------------------------------------------------------------------
// Reading a path, and reading a text for what it can still do
// ---------------------------------------------------------------------------

/** What a path result reads as when nothing refused it. */
const ACCEPTED = 'accepted';

/** What the checker answers for a path that starts at the root. */
const LEADING_SEPARATOR = 'leading_separator';

/** The one character a destination-relative path may not lead with. */
const PATH_SEPARATOR = '/';

/**
 * A path result as one word: its refusal reason, or `accepted`.
 *
 * The reason and not the boolean, on the reading
 * `./artifact-path.test.ts` states: an ordered first-refusal gate
 * answers `false` for more than one reason, so a case reading the
 * boolean stays green over a rule that is gone.
 *
 * @param result - What the checker answered.
 * @returns The refusal reason, or {@link ACCEPTED}.
 */
function refusalOf(result: ArtifactPathResult): string {
  return result.ok
    ? ACCEPTED
    : result.reason;
}

/** Sorted copy, so an equality is over members rather than order. */
function sorted(ids: readonly string[]): string[] {
  return [...ids].sort();
}

/** A tag, as the sanitizer's own pattern reads one. */
const TAG_RE = /<\/?[a-zA-Z][^>]*>/;

/** A line that is nothing but an underline run. */
const UNDERLINE_RE = /^[-=]+[ \t]*$/;

/** A link, wherever one sits in a body of text. */
const LINK_RE = /https?:\/\/[^\s<>`)\]]+/g;

/** The characters a link may legitimately sit behind in an answer. */
const WRAPPED_LINK_LEAD: readonly string[] = ['`', '('];

/**
 * Every id {@link activeFormsLeftIn} is able to emit.
 *
 * Written out rather than derived, so it can be held against the
 * fixture module's own vocabulary. Two lists in two files is what
 * makes a rename report; one derived from the other would agree with
 * whatever it became.
 */
const PREDICATE_FORM_IDS: readonly string[] = [
  'bare-link',
  'heading-run',
  'image-embed',
  'raw-tag',
  'setext-underline',
  'wiki-link-opener',
];

/**
 * Every active form still present in `text`, by roster id.
 *
 * A copy of the predicate `tests/lib/injection.test.ts` uses, and a
 * copy on purpose: one test file cannot import another's
 * declarations, and a shared module would sit outside both and be
 * maintained against neither. What keeps this one honest is that it
 * is held against a vocabulary it does not own, and that it is run
 * over the RAW vectors before it is trusted over a rendered one.
 *
 * @param text - The text to read, answer or input.
 * @returns One id per form found, sorted, with repeats collapsed.
 */
function activeFormsLeftIn(text: string): string[] {
  const found = new Set<string>();

  if (text.includes('![')) {
    found.add('image-embed');
  }

  if (TAG_RE.test(text)) {
    found.add('raw-tag');
  }

  if (text.includes('[[')) {
    found.add('wiki-link-opener');
  }

  for (const line of text.split('\n')) {
    if (line.startsWith('#')) {
      found.add('heading-run');
    }

    if (UNDERLINE_RE.test(line)) {
      found.add('setext-underline');
    }
  }

  for (const match of text.matchAll(LINK_RE)) {
    const lead = match.index === 0
      ? ''
      : text.charAt(match.index - 1);

    if (!WRAPPED_LINK_LEAD.includes(lead)) {
      found.add('bare-link');
    }
  }

  return sorted([...found]);
}

// ---------------------------------------------------------------------------
// Putting a vector through a renderer and reading it back out
// ---------------------------------------------------------------------------

/** What marks the start of the injected value in a document. */
const INJECTED_OPEN = 'qv7open';

/** What marks its end. */
const INJECTED_CLOSE = 'qv7close';

/**
 * The formats whose document is XML, where a fragment is escaped.
 *
 * A format registered later and not named here is read as writing
 * its fragments verbatim. That is the safe default for a reader —
 * an escaping format left out fails the surviving-fragment case
 * naming itself, where the reverse would quietly pass.
 */
const ESCAPING_FORMATS: readonly string[] = ['rss'];

/**
 * The five predefined entities, in the order an escaper applies
 * them.
 *
 * A SECOND SPELLING of the list `src/exports/rss.ts` declares, not an
 * import of it: what these cases are asking is whether a fragment
 * came through the feed as text, and a document compared against the
 * escaper that wrote it would agree with whatever that escaper
 * became. The ampersand leads for the reason it leads there — every
 * replacement below introduces one.
 */
const XML_ESCAPES: readonly (readonly [string, string])[] = [
  ['&', '&amp;'],
  ['<', '&lt;'],
  ['>', '&gt;'],
  ['"', '&quot;'],
  ['\'', '&apos;'],
];

/**
 * A fragment as an XML document carries it.
 *
 * @param text - The fragment, as the fixture declares it.
 * @returns The same characters with the five entities escaped.
 */
function xmlEscaped(text: string): string {
  let escaped = text;

  for (const [character, entity] of XML_ESCAPES) {
    escaped = escaped.split(character).join(entity);
  }

  return escaped;
}

/**
 * A fragment as one format's document carries it.
 *
 * @param format - The format whose document is being read.
 * @param fragment - The fragment, as the fixture declares it.
 * @returns The text to look for in that document.
 */
function asRendered(format: string, fragment: string): string {
  return ESCAPING_FORMATS.includes(format)
    ? xmlEscaped(fragment)
    : fragment;
}

/**
 * One vector, as the stored field value a finding carries.
 *
 * The markers sit on their own lines so neither of them joins a
 * line of the document and changes what the sanitizer sees. The
 * markdown renderers fold the whole value onto one line and the feed
 * keeps its line structure, so both readings find the pair either
 * way.
 *
 * @param text - The vector document.
 * @returns The field value to store.
 */
function injectedValue(text: string): string {
  return INJECTED_OPEN + '\n' + text + '\n' + INJECTED_CLOSE;
}

/**
 * The injected value as one format rendered it, markers excluded.
 *
 * Answers `''` when the markers are not both there, which is a state
 * the surviving-fragment case reports rather than one this helper
 * hides: an empty slice loses every fragment the vector declares.
 *
 * @param entry - The renderer and the format that selected it.
 * @param vector - The vector to plant in the first finding.
 * @returns The untrusted text as that format wrote it.
 */
function injectedTextFor(
  entry: DrivenRenderer,
  vector: InjectionVector,
): string {
  const value = injectedValue(vector.text);
  const [artifact] = renderWith(entry, buildInput(entry.format, value));
  const document = artifact === undefined
    ? ''
    : String(artifact.body);
  const start = document.indexOf(INJECTED_OPEN);
  const end = document.indexOf(INJECTED_CLOSE);

  return start === -1 || end < start
    ? ''
    : document.slice(start + INJECTED_OPEN.length, end);
}

/**
 * That reading, taken once per registered renderer.
 *
 * @param vector - The vector to plant.
 * @returns The rendered untrusted text, keyed by format.
 */
function injectedTextByFormat(
  vector: InjectionVector,
): Record<string, string> {
  const answered: Record<string, string> = {};

  for (const entry of DRIVEN) {
    answered[entry.format] = injectedTextFor(entry, vector);
  }

  return answered;
}

/**
 * Every distinct answer the checker gave for a list of paths.
 *
 * A SET so the assertion is about what the checker said and not
 * about how many artifacts a format happened to answer, and sorted
 * so a format answering more than one path cannot pass on ordering.
 *
 * @param paths - The paths to read.
 * @returns One entry per distinct answer, sorted.
 */
function pathAnswers(paths: readonly string[]): string[] {
  const answers = paths.map(
    (path) => refusalOf(checkArtifactPath(path)),
  );

  return sorted([...new Set(answers)]);
}

// ---------------------------------------------------------------------------
// The roster, and the predicate the injection cases rest on
// ---------------------------------------------------------------------------

describe('the roster these cases drive', () => {
  it('covers every format the column can carry', () => {
    const driven = DRIVEN.map((entry) => entry.format);
    const refused = EXPORT_FORMATS.filter(
      (format) => rendererFor(format) === null,
    );

    expect(sorted([...driven, ...refused]))
      .toEqual(sorted(EXPORT_FORMATS));
    expect(driven.length).toBeGreaterThan(0);
  });

  it('reads for exactly the forms the fixtures name', () => {
    expect(sorted(PREDICATE_FORM_IDS))
      .toEqual(sorted(INJECTION_ACTIVE_FORM_IDS));
  });

  it('finds every one of those forms in the corpus', () => {
    // The control the rendered readings below have no way to carry:
    // an empty answer over a slice means something only because this
    // same predicate has just found all six in the raw documents.
    const found = new Set<string>();

    for (const vector of INJECTION_VECTORS) {
      for (const form of activeFormsLeftIn(vector.text)) {
        found.add(form);
      }
    }

    expect(sorted([...found]))
      .toEqual(sorted(INJECTION_ACTIVE_FORM_IDS));
  });
});

// ---------------------------------------------------------------------------
// Every artifact path is destination-relative
// ---------------------------------------------------------------------------

describe('every path a registered renderer answers', () => {
  for (const entry of DRIVEN) {
    it(`${entry.format} answers relative paths only`, () => {
      // The same paths with a leading separator are the control: a
      // checker that had stopped discriminating answers ACCEPTED for
      // those too, and the reason token is read rather than the
      // boolean, since an ordered gate refuses for more than one.
      const artifacts = renderWith(entry, buildInput(entry.format));
      const paths = artifacts.map((artifact) => artifact.path);
      const rooted = paths.map((path) => PATH_SEPARATOR + path);

      expect(artifacts.length).toBeGreaterThan(0);
      expect(pathAnswers(paths)).toEqual([ACCEPTED]);
      expect(pathAnswers(rooted)).toEqual([LEADING_SEPARATOR]);
    });
  }
});

// ---------------------------------------------------------------------------
// A second call answers the same artifacts
// ---------------------------------------------------------------------------

describe('a second call over one input', () => {
  for (const entry of DRIVEN) {
    it(`${entry.format} answers the same artifact list`, () => {
      const input = buildInput(entry.format);
      const first = renderWith(entry, input);
      const second = renderWith(entry, input);

      expect(first.length).toBeGreaterThan(0);
      expect(second).toStrictEqual(first);
    });
  }
});

// ---------------------------------------------------------------------------
// Nothing is written into the input
// ---------------------------------------------------------------------------

describe('the input a renderer was handed', () => {
  for (const entry of DRIVEN) {
    it(`${entry.format} leaves it exactly as it found it`, () => {
      // Built on this call and shared with nothing, so the snapshot
      // is of the input THIS render was given rather than of what an
      // earlier case may already have left in a shared fixture.
      const input = buildInput(entry.format);
      const before = JSON.stringify(input);

      renderWith(entry, input);

      expect(JSON.stringify(input)).toBe(before);
    });
  }
});

// ---------------------------------------------------------------------------
// A hostile finding, through all four formats at once
// ---------------------------------------------------------------------------

describe('a finding carrying an injection vector', () => {
  for (const vector of INJECTION_VECTORS) {
    it(`${vector.id} carries the forms its roster declares`, () => {
      expect(activeFormsLeftIn(vector.text))
        .toEqual(sorted(vector.activeForms));
    });

    it(`${vector.id} survives as text in every format`, () => {
      const rendered = injectedTextByFormat(vector);
      const lost: Record<string, readonly string[]> = {};

      for (const [format, text] of Object.entries(rendered)) {
        lost[format] = vector.survives.filter(
          (fragment) => !text.includes(asRendered(format, fragment)),
        );
      }

      expect(lost).toEqual(cleanPerFormat());
    });

    it(`${vector.id} arrives with none of its active forms`, () => {
      const rendered = injectedTextByFormat(vector);
      const left: Record<string, readonly string[]> = {};

      for (const [format, text] of Object.entries(rendered)) {
        left[format] = activeFormsLeftIn(text);
      }

      expect(left).toEqual(cleanPerFormat());
    });
  }
});

// ---------------------------------------------------------------------------
// The guard: what these cases actually rendered
// ---------------------------------------------------------------------------

describe('what these cases rendered', () => {
  it('covers every renderer the registry answers', () => {
    const driven = DRIVEN.map((entry) => entry.format);

    expect(sorted([...RENDERED_FORMATS])).toEqual(sorted(driven));
  });

  it('renders nothing for a format the registry refuses', () => {
    // The length reading is this case's own liveness: a registry
    // refusing nothing makes the filter above it vacuous, and the
    // case should then be removed rather than left passing.
    const refused = EXPORT_FORMATS.filter(
      (format) => rendererFor(format) === null,
    );
    const rendered = refused.filter(
      (format) => RENDERED_FORMATS.has(format),
    );

    expect(refused.length).toBeGreaterThan(0);
    expect(rendered).toEqual([]);
  });
});
