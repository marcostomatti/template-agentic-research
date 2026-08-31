/**
 * Every Code node `ar-score` runs, driven offline over the BUILT
 * artifact.
 *
 * Two nodes rather than `ar-ingest`'s eight, and the canvas around
 * them makes no model call at all: what scores a finding here is
 * criteria rows, terms and three deterministic libraries, so a score
 * is reproducible from the rows it was read against. The Postgres
 * nodes on either side are statements verified against a live
 * cluster, and `tests/invariants/workflows.test.ts` reads node
 * members without ever calling a body. What runs here is the
 * arithmetic these two nodes write for themselves.
 *
 * `tests/workflows/code-node.ts` is the harness and its header
 * carries the mechanism: the built body rather than the source,
 * `$input` and `$` supplied by hand, and the two module globals
 * bound rather than rewritten out. What this file adds is the
 * canvas, one case at a time saying what the nodes above answered
 * and asserting what the node under test made of it.
 *
 * ## Three empty readings lead, and no two of them are one empty
 *
 * House order puts a node's refusals and the shapes that answer
 * nothing before its ordinary paths, and here three of those are the
 * readings this canvas exists to keep apart.
 *
 * A TERM SET that is empty lays out a vector with no category column
 * at all, so a bucket nobody could measure is absent rather than
 * counted at zero. A CRITERIA SET that is empty is a domain that has
 * stated no position, which leaves the scheme with no part and the
 * total unscored. And a finding with NO MEASURED SIGNAL, its
 * criteria naming buckets the vector carries no cell for, is the
 * third: it is the one that reads most like a zero and is furthest
 * from being one.
 *
 * All three are facts about a domain's configuration rather than
 * about a finding, all three answer `null`, and none of them answers
 * `0`. Ordered after the scoring cases each would have been written
 * with a fixture that scored, and the distinction the sticky note on
 * this canvas is named for would go unread.
 *
 * ## The version-skip path emits nothing
 *
 * `Compute Feature Vectors` reuses a stored vector wherever the
 * document's stored `feature_version` already equals the version
 * composed for this domain. That the skip emits nothing of its own
 * is asserted from both sides. The stored object travels by IDENTITY
 * and carries a column no term of this domain names, so an answer
 * that merely agreed with it would fail; and the row's
 * `document_body` is an accessor that counts its own reads, so the
 * skipping pass is shown to have read no document where the
 * computing pass beside it reads one.
 *
 * ## The vacuity guard
 *
 * `DRIVEN` records every node name this file actually ran and the
 * last case holds it against the artifact's own Code-node roster. A
 * third Code node landing on this canvas fails there by name, which
 * is what stops "every Code node" from being a claim in a header.
 * `AR_SCORE.names` comes off the built artifact, so the roster
 * cannot be satisfied by editing this file.
 *
 * No word in these fixtures is a term, a criterion or a category any
 * domain would use. The documents are bulletins about rainfall,
 * which is the shared corpus subject and no domain of ours.
 */
import type { CodeNodeContext, CodeNodeItem } from './code-node.js';

import { describe, expect, it } from 'vitest';

import { featureVersionFor } from '../../src/lib/feature-version.js';
import {
  FEATURE_MECHANISM_VERSION,
  asKey,
  featureKeys,
} from '../../src/lib/features.js';

import { codeNodes } from './code-node.js';

// ---------------------------------------------------------------------------
// The artifact under test
// ---------------------------------------------------------------------------

/** The built artifact every case below reads a body out of. */
const AR_SCORE = codeNodes('ar-score.json');

/**
 * Every node name a case actually ran, filled as the file runs.
 *
 * Held against the artifact's roster in the last case. A set rather
 * than a counter: what the guard is about is WHICH nodes were
 * driven, and a count cannot tell one node driven twice from two
 * driven once.
 */
const DRIVEN = new Set<string>();

/** Runs one node, recording that it was driven. */
function run(
  node: string,
  context: CodeNodeContext,
): readonly CodeNodeItem[] {
  DRIVEN.add(node);

  return AR_SCORE.run(node, context);
}

/**
 * One item's payload, refusing rather than answering `undefined`.
 *
 * A missing item read through an optional chain reaches an assertion
 * as an absent member several lines later, which reports a
 * cardinality fault as a wrong value.
 */
function jsonAt(
  items: readonly CodeNodeItem[],
  index: number,
): Record<string, unknown> {
  const item = items[index];

  if (item === undefined) {
    throw new Error(
      `[ar-score] the node answered ${String(items.length)} items, so `
      + `there is none at position ${String(index)}`,
    );
  }

  return item.json;
}

/** Every item's payload, in the order the node answered them. */
function payloads(
  items: readonly CodeNodeItem[],
): readonly Record<string, unknown>[] {
  return items.map((item) => item.json);
}

/**
 * A number a node declares, read out of its own built body.
 *
 * A bound written into a case as a literal agrees with any edit that
 * moved it, which is the one direction a suite over a constant
 * cannot fail in. Reading the declaration instead takes this file
 * down as it loads, naming the constant, the moment one is renamed
 * away.
 */
function declaredNumber(node: string, name: string): number {
  const found = new RegExp(`const ${name} = (\\d+);`, 'u')
    .exec(AR_SCORE.body(node));
  const digits = found?.[1];

  if (digits === undefined) {
    throw new Error(
      `[ar-score] ${node} declares no ${name}, so this file cannot read `
      + 'the number it asserts',
    );
  }

  return Number(digits);
}

/**
 * What `findings.score_version` records, as the node declares it.
 *
 * The scoring mechanism's own version and the whole of what that
 * column holds. Nothing outside `Aggregate Finding Scores` declares
 * it, so there is no library constant to import in its place.
 */
const SCORE_MECHANISM_VERSION = declaredNumber(
  'Aggregate Finding Scores',
  'SCORE_MECHANISM_VERSION',
);

// ---------------------------------------------------------------------------
// The canvas these cases put around a node
// ---------------------------------------------------------------------------

/** The domain, the document and the finding every fixture names. */
const DOMAIN_ID = '3';
const DOCUMENT_ID = '50';
const FINDING_ID = '900';

/** A bulletin carrying two of the terms below, in one category. */
const BULLETIN = 'Rainfall in the northern basin held steady, the gauge '
  + 'at the weir reading four millimetres on five consecutive mornings.';

/** A bulletin of the same corpus carrying no term at all. */
const QUIET_BULLETIN = 'The basin road reopened to traffic shortly after '
  + 'first light and the ferry resumed its ordinary timetable.';

/**
 * The domain's term set, as `Load Domain Context` projects it.
 *
 * The category key joined on beside the three `terms` columns, which
 * is the four-member shape the gate, the featurizer and the version
 * digest each read a different part of. One list serves all three
 * markers this canvas splices.
 */
const TERMS = [
  { category: 'rainfall', pattern: 'rainfall', weight: 4,
    polarity: 'positive' },
  { category: 'rainfall', pattern: 'gauge', weight: 3,
    polarity: 'positive' },
  { category: 'wind', pattern: 'gale', weight: 2, polarity: 'positive' },
];

/**
 * The domain's stated position, as `Select Scoring Subjects` cuts
 * it: one row per question, under the category key it hangs off.
 */
const CRITERIA = [
  { id: 1, category: 'rainfall', value: 'how much fell', kind: 'measure' },
  { id: 2, category: 'wind', value: 'how hard it blew', kind: 'measure' },
];

/** What the domain says each bucket is worth. */
const WEIGHTS = { rainfall: 3, wind: 1 };

/** The version this domain's terms compose to under this mechanism. */
const VERSION = featureVersionFor(FEATURE_MECHANISM_VERSION, TERMS);

/** The domain row `Load Domain Context` answers. */
function domainRow(
  over: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: Number(DOMAIN_ID),
    slug: 'rainfall-bulletins',
    name: 'Rainfall bulletins',
    settings: { scoringWeights: WEIGHTS },
    feature_version: null,
    embedding_model: null,
    ...over,
  };
}

/** The whole context item, with the members a case overrides. */
function context(
  over: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    domain_id: DOMAIN_ID,
    domain: domainRow(),
    personas: [],
    categories: [],
    terms: TERMS,
    criteria: CRITERIA,
    ...over,
  };
}

/**
 * One row `Select Scoring Subjects` answers: a finding, the document
 * behind it and the criteria it is judged against.
 *
 * The four `document_` members are the projection's own spelling,
 * which is what keeps the stored vector and the stored version
 * distinguishable from the ones the feature group answers.
 */
function subject(
  over: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    finding_id: FINDING_ID,
    domain_id: DOMAIN_ID,
    document_id: DOCUMENT_ID,
    entity_id: null,
    fields: { headline: 'steady rain in the northern basin' },
    score: null,
    score_version: null,
    criteria: CRITERIA,
    document_body: BULLETIN,
    document_parse_status: 'ok',
    document_features: null,
    document_feature_version: null,
    ...over,
  };
}

/** `Compute Feature Vectors` over the rows a selection answered. */
function featurize(
  rows: readonly unknown[],
  over: Record<string, unknown> = {},
): readonly CodeNodeItem[] {
  return run('Compute Feature Vectors', {
    input: rows,
    nodes: { 'Load Domain Context': [context(over)] },
  });
}

/** `Aggregate Finding Scores` over the items a feature pass made. */
function aggregate(
  rows: readonly unknown[],
  over: Record<string, unknown> = {},
): readonly CodeNodeItem[] {
  return run('Aggregate Finding Scores', {
    input: rows,
    nodes: { 'Load Domain Context': [context(over)] },
  });
}

/** Both nodes in the order a run reaches them, over one canvas. */
function scored(
  rows: readonly unknown[],
  over: Record<string, unknown> = {},
): readonly CodeNodeItem[] {
  return aggregate(payloads(featurize(rows, over)), over);
}

/** A subject row that counts how often its body has been read. */
interface WatchedRow {
  /** The row, as the selection above would have answered it. */
  readonly row: Record<string, unknown>;

  /** How many times `document_body` has been read so far. */
  bodyReads(): number;
}

/**
 * One subject row whose body is an accessor rather than a value.
 *
 * The reading that says a skip emitted nothing: a node that reused a
 * stored vector never looked at the document, and a node that
 * computed one had to. Nothing else on this canvas can tell an
 * answer that was reused from one that was recomputed and happened
 * to agree.
 */
function watched(over: Record<string, unknown> = {}): WatchedRow {
  const row = subject(over);
  const body = row['document_body'];
  let reads = 0;

  Object.defineProperty(row, 'document_body', {
    configurable: true,
    enumerable: true,
    get: () => {
      reads += 1;

      return body;
    },
  });

  return { row, bodyReads: () => reads };
}

// ---------------------------------------------------------------------------
// The harness, before anything it reports is believed
// ---------------------------------------------------------------------------

describe('ar-score — the harness discriminates', () => {
  it('refuses a node name the artifact does not carry, by name', () => {
    expect(() => AR_SCORE.run('Compute Feature Vectorz', {}))
      .toThrow(/holds no Code node named Compute Feature Vectorz/u);
  });

  it('refuses a node the case forgot to supply, by name', () => {
    expect(() => AR_SCORE.run('Aggregate Finding Scores', { input: [] }))
      .toThrow(/reads \$\('Load Domain Context'\), which this case did/u);
  });

  it('hands over a body with every marker already resolved', () => {
    const vectors = AR_SCORE.body('Compute Feature Vectors');
    const totals = AR_SCORE.body('Aggregate Finding Scores');

    expect(vectors).not.toContain('__INLINE:');
    expect(vectors).toContain('function scoreText');
    expect(vectors).toContain('function extractFeatures');
    expect(vectors).toContain('function featureVersionFor');
    expect(totals).not.toContain('__INLINE:');
    expect(totals).toContain('function aggregateTotal');
    expect(totals).toContain('function asKey');
  });

  it('reads the scoring version out of the node that declares it', () => {
    expect(SCORE_MECHANISM_VERSION).toBeGreaterThan(0);
    expect(() => declaredNumber('Aggregate Finding Scores', 'NO_SUCH_BOUND'))
      .toThrow(/declares no NO_SUCH_BOUND/u);
  });
});

// ---------------------------------------------------------------------------
// Compute Feature Vectors
// ---------------------------------------------------------------------------

describe('ar-score — Compute Feature Vectors refuses to pin nothing', () => {
  it('refuses a hand-over whose claim resolved to no domain', () => {
    expect(() => featurize([], { domain: null }))
      .toThrow(/has no domain row/u);
  });

  it('refuses a term set it cannot read, before any document', () => {
    expect(() => featurize([], {
      terms: [
        { category: 'rainfall', pattern: 7, weight: 1,
          polarity: 'positive' },
      ],
    })).toThrow(/term 0 of the set carries a pattern that is not a string/u);
  });

  it('refuses a finding the join above says cannot exist', () => {
    expect(() => featurize([subject({ document_id: null })]))
      .toThrow(/was handed a finding with no document id/u);
  });

  it('answers nothing at all for a pass that named no finding', () => {
    expect(featurize([])).toEqual([]);
  });
});

describe('ar-score — Compute Feature Vectors over no term at all', () => {
  const unlit = jsonAt(featurize([subject()], { terms: [] }), 0);
  const features = unlit['features'] as Record<string, number>;

  it('composes a version for a domain that names no term', () => {
    expect(unlit['feature_version'])
      .toBe(featureVersionFor(FEATURE_MECHANISM_VERSION, []));
  });

  it('composes a different one than the same domain with terms', () => {
    expect(unlit['feature_version']).not.toBe(VERSION);
  });

  it('lays out no category column, so no bucket reads as a zero', () => {
    expect(Object.keys(features)).toEqual([...featureKeys({
      terms: [],
      quantities: [],
      oneHots: [],
    })]);
  });

  it('carries no cell for a bucket this domain names elsewhere', () => {
    expect(features['category_rainfall']).toBeUndefined();
    expect(features['category_wind']).toBeUndefined();
  });

  it('takes the gate reading it can take, which measures none', () => {
    expect(features['gate_score']).toBe(0);
  });

  it('measures the document it was handed all the same', () => {
    expect(features['text_length']).toBe(BULLETIN.length);
  });

  it('answers one item per finding whatever the layout holds', () => {
    expect(unlit['feature_vector_source']).toBe('computed');
    expect(unlit['finding_id']).toBe(FINDING_ID);
  });
});

describe('ar-score — Compute Feature Vectors skips what is current', () => {
  /**
   * A stored vector no recomputation over this domain could answer.
   *
   * Every count is 41, it carries a column no term of this domain
   * names, and it holds no `text_bullet_lines` at all. A node that
   * recomputed and happened to agree cannot produce it, so an answer
   * equal to this one is an answer that was not computed.
   */
  const STORED = {
    gate_score: 41,
    category_other: 0,
    category_rainfall: 41,
    category_snowfall: 41,
    text_length: 1,
  };
  const current = watched({
    document_features: STORED,
    document_feature_version: VERSION,
  });
  const skipped = jsonAt(featurize([current.row]), 0);

  it('emits the stored vector itself rather than one equal to it', () => {
    expect(skipped['features']).toBe(STORED);
  });

  it('emits nothing computed, the stored layout surviving whole', () => {
    expect(skipped['features']).toEqual(STORED);
    expect((skipped['features'] as Record<string, number>)['gate_score'])
      .toBe(41);
  });

  it('says which of the two the vector on the item is', () => {
    expect(skipped['feature_vector_source']).toBe('stored');
  });

  it('reads no document at all on the pass that skips', () => {
    expect(current.bodyReads()).toBe(0);
  });

  it('reads one on the pass that does not, so the count reads', () => {
    const fresh = watched();

    featurize([fresh.row]);

    expect(fresh.bodyReads()).toBeGreaterThan(0);
  });

  it('recomputes where the stored version is behind the composed', () => {
    const behind = jsonAt(featurize([subject({
      document_features: STORED,
      document_feature_version: VERSION - 1,
    })]), 0);

    expect(behind['feature_vector_source']).toBe('computed');
    expect(behind['features']).not.toBe(STORED);
  });

  it('recomputes for a document nothing has featurized', () => {
    expect(jsonAt(featurize([subject()]), 0)['feature_vector_source'])
      .toBe('computed');
  });

  it('recomputes where the version agrees and the vector is not', () => {
    for (const stale of [null, [41, 41], 'a vector', 41]) {
      const item = jsonAt(featurize([subject({
        document_features: stale,
        document_feature_version: VERSION,
      })]), 0);

      expect(item['feature_vector_source']).toBe('computed');
    }
  });

  it('computes once per document, a number and a string being one', () => {
    const pair = featurize([
      subject(),
      subject({ finding_id: '901', document_id: Number(DOCUMENT_ID) }),
    ]);

    expect(jsonAt(pair, 0)['features']).toBe(jsonAt(pair, 1)['features']);
  });
});

describe('ar-score — Compute Feature Vectors reads the document', () => {
  const items = featurize([
    subject(),
    subject({
      finding_id: '901',
      document_id: '51',
      document_body: QUIET_BULLETIN,
    }),
    subject({ finding_id: '902', document_id: '52', document_body: null }),
  ]);
  const first = jsonAt(items, 0);
  const features = first['features'] as Record<string, number>;

  it('answers one item per finding, in the order they arrived', () => {
    expect(payloads(items).map((item) => item['finding_id']))
      .toEqual([FINDING_ID, '901', '902']);
  });

  it('counts the terms the document carried, per category', () => {
    expect(features['category_rainfall']).toBe(2);
    expect(features['category_wind']).toBe(0);
  });

  it('reads a document stored with no body at a measured zero', () => {
    const empty = jsonAt(items, 2)['features'] as Record<string, number>;

    expect(empty['gate_score']).toBe(0);
    expect(empty['text_length']).toBe(0);
  });

  it('measures the stored body and nothing else', () => {
    expect(features['text_length']).toBe(BULLETIN.length);
  });

  it('carries every cell as a finite number, absence and all', () => {
    for (const cell of Object.values(features)) {
      expect(Number.isFinite(cell)).toBe(true);
    }
  });

  it('pins the vector to the mechanism and to the term set', () => {
    expect(first['feature_version']).toBe(VERSION);
  });

  it('reads every document of the pass at the one version', () => {
    for (const item of payloads(items)) {
      expect(item['feature_version']).toBe(VERSION);
    }
  });

  it('reports a domain that has never been featurized as apart', () => {
    expect(first['feature_version_matches_domain']).toBe(false);
  });

  it('reports agreement where the domain pin is the composed one', () => {
    const agreeing = featurize([subject()], {
      domain: domainRow({ feature_version: VERSION }),
    });

    expect(jsonAt(agreeing, 0)['feature_version_matches_domain']).toBe(true);
  });

  it('carries a failed parse forward rather than refusing on it', () => {
    const failed = featurize([subject({ document_parse_status: 'failed' })]);

    expect(jsonAt(failed, 0)['document_parse_status']).toBe('failed');
  });

  it('leaves the body and the stored pair behind, and nothing else', () => {
    expect(Object.keys(first).sort()).toEqual([
      'criteria', 'document_id', 'document_parse_status', 'domain_id',
      'entity_id', 'feature_vector_source', 'feature_version',
      'feature_version_matches_domain', 'features', 'fields', 'finding_id',
      'score', 'score_version',
    ]);
  });
});

// ---------------------------------------------------------------------------
// Aggregate Finding Scores
// ---------------------------------------------------------------------------

describe('ar-score — Aggregate Finding Scores refuses to score blind', () => {
  it('refuses a hand-over whose claim resolved to no domain', () => {
    expect(() => aggregate([], { domain: null }))
      .toThrow(/has no domain row/u);
  });

  it('answers nothing at all for a pass that named no finding', () => {
    expect(aggregate([])).toEqual([]);
  });
});

describe('ar-score — Aggregate Finding Scores answers null, not zero', () => {
  const vector = jsonAt(featurize([subject()]), 0);

  it('answers null for a domain that has stated no criterion', () => {
    const none = jsonAt(aggregate([{ ...vector, criteria: [] }]), 0);

    expect(none['score']).toBeNull();
    expect(none['score_version']).toBeNull();
    expect(none['score_signals_stated']).toBe(0);
    expect(none['score_signals_measured']).toBe(0);
  });

  it('reads a criteria member that is not a list as none stated', () => {
    const wrong = jsonAt(aggregate([{ ...vector, criteria: 'rainfall' }]), 0);

    expect(wrong['score']).toBeNull();
    expect(wrong['score_signals_stated']).toBe(0);
  });

  it('answers null for a domain whose term set is empty', () => {
    const unlit = jsonAt(scored([subject()], { terms: [] }), 0);

    expect(unlit['score']).toBeNull();
    expect(unlit['score_version']).toBeNull();
    expect(unlit['score_signals_stated']).toBe(CRITERIA.length);
    expect(unlit['score_signals_measured']).toBe(0);
  });

  it('answers null where no stated bucket has a cell to read', () => {
    const elsewhere = jsonAt(aggregate([{
      ...vector,
      criteria: [
        { id: 9, category: 'snowfall', value: 'how deep', kind: 'measure' },
      ],
    }]), 0);

    expect(elsewhere['score']).toBeNull();
    expect(elsewhere['score_signals_stated']).toBe(1);
    expect(elsewhere['score_signals_measured']).toBe(0);
  });

  it('answers null for a domain that stated no share at all', () => {
    const unweighted = jsonAt(scored([subject()], {
      domain: domainRow({ settings: {} }),
    }), 0);

    expect(unweighted['score']).toBeNull();
    expect(unweighted['score_signals_measured']).toBe(CRITERIA.length);
  });

  it('answers a null rather than the zero it reads like', () => {
    const none = jsonAt(aggregate([{ ...vector, criteria: [] }]), 0);

    expect(none['score']).not.toBe(0);
    expect(Object.hasOwn(none, 'score')).toBe(true);
  });

  it('leaves the version null wherever the score is null', () => {
    const unscored = [
      jsonAt(aggregate([{ ...vector, criteria: [] }]), 0),
      jsonAt(scored([subject()], { terms: [] }), 0),
      jsonAt(scored([subject()], { domain: domainRow({ settings: {} }) }), 0),
    ];

    for (const item of unscored) {
      expect(item['score']).toBeNull();
      expect(item['score_version']).toBeNull();
    }
  });
});

describe('ar-score — Aggregate Finding Scores scores what was read', () => {
  const first = jsonAt(scored([subject()]), 0);

  it('scores a finding against the shares the domain stated', () => {
    // Two rainfall hits at a share of three and no wind hit at a
    // share of one, which is six quarters rounded to a whole.
    expect(first['score']).toBe(2);
    expect(first['score_signals_stated']).toBe(CRITERIA.length);
    expect(first['score_signals_measured']).toBe(CRITERIA.length);
  });

  it('writes the score and the version as the one decision', () => {
    expect(first['score_version']).toBe(SCORE_MECHANISM_VERSION);
  });

  it('reads a measured zero as a score rather than an absence', () => {
    const vector = jsonAt(featurize([subject()]), 0);
    const quiet = jsonAt(aggregate([{
      ...vector,
      criteria: [
        { id: 2, category: 'wind', value: 'how hard it blew', kind: 'x' },
      ],
    }]), 0);

    expect(quiet['score']).toBe(0);
    expect(quiet['score_version']).toBe(SCORE_MECHANISM_VERSION);
    expect(quiet['score_signals_measured']).toBe(1);
  });

  it('reads a share under the spelling the operator wrote', () => {
    const written = 'Rain Fall';
    const keyed = jsonAt(scored([subject({
      criteria: [
        { id: 3, category: ` ${written} `, value: 'how much', kind: 'x' },
      ],
    })], {
      terms: [
        { category: written, pattern: 'rainfall', weight: 4,
          polarity: 'positive' },
      ],
      domain: domainRow({ settings: { scoringWeights: { [written]: 2 } } }),
    }), 0);

    expect(asKey(written)).toBe('rain_fall');
    expect(keyed['score']).toBe(1);
    expect(keyed['score_signals_measured']).toBe(1);
  });

  it('counts one part per bucket, however many criteria name it', () => {
    const vector = jsonAt(featurize([subject()]), 0);
    const twice = jsonAt(aggregate([{
      ...vector,
      criteria: [
        { id: 1, category: 'rainfall', value: 'how much', kind: 'x' },
        { id: 2, category: 'rainfall', value: 'how long', kind: 'y' },
      ],
    }]), 0);

    expect(twice['score_signals_stated']).toBe(1);
    expect(twice['score']).toBe(2);
  });

  it('drops a criterion that names no bucket at all', () => {
    const vector = jsonAt(featurize([subject()]), 0);
    const blank = jsonAt(aggregate([{
      ...vector,
      criteria: [{ id: 1, category: '   ', value: 'how much', kind: 'x' }],
    }]), 0);

    expect(blank['score_signals_stated']).toBe(0);
    expect(blank['score']).toBeNull();
  });

  it('reads a bucket named for a prototype member as its own', () => {
    const inherited = '__proto__';
    const shares = JSON.parse('{"__proto__": 4}') as Record<string, number>;
    const stated = [
      { id: 4, category: inherited, value: 'how much', kind: 'x' },
    ];
    const owned = jsonAt(scored([subject({ criteria: stated })], {
      terms: [
        { category: inherited, pattern: 'basin', weight: 4,
          polarity: 'positive' },
      ],
      domain: domainRow({ settings: { scoringWeights: shares } }),
    }), 0);

    expect(Object.hasOwn(shares, inherited)).toBe(true);
    expect(owned['score_signals_measured']).toBe(1);
    expect(owned['score']).toBe(1);
  });

  it('answers one item per finding, in the order they arrived', () => {
    const pass = payloads(scored([
      subject(),
      subject({
        finding_id: '901',
        document_id: '51',
        document_body: QUIET_BULLETIN,
      }),
    ]));

    expect(pass.map((item) => item['finding_id']))
      .toEqual([FINDING_ID, '901']);
    expect(pass.map((item) => item['score'])).toEqual([2, 0]);
  });

  it('carries the version pin forward for the closing group', () => {
    expect(first['feature_version']).toBe(VERSION);
    expect(first['feature_version_matches_domain']).toBe(false);
  });

  it('answers the ids, the pair and the two accounts, and no more', () => {
    expect(Object.keys(first).sort()).toEqual([
      'document_id', 'domain_id', 'entity_id', 'feature_version',
      'feature_version_matches_domain', 'finding_id', 'score',
      'score_signals_measured', 'score_signals_stated', 'score_version',
    ]);
  });
});

// ---------------------------------------------------------------------------
// The vacuity guard
// ---------------------------------------------------------------------------

describe('ar-score — every Code node on the canvas was driven', () => {
  it('runs each Code node the built artifact holds, and no other', () => {
    expect([...DRIVEN].sort()).toEqual([...AR_SCORE.names].sort());
  });

  it('has a canvas to be a guard over', () => {
    expect(AR_SCORE.names.length).toBeGreaterThan(0);
    expect(AR_SCORE.names).not.toContain('Compute Feature Vectorz');
  });
});
