/**
 * The null-vs-zero law, swept over every numeric member the Code
 * nodes of the three workflows this phase landed answer.
 *
 * A measured zero is `0` and a quantity nobody measured is `null`,
 * and the difference is the whole of what a stored signal means: a
 * `0` says a reading was taken and came back empty, a `null` says no
 * reading was taken at all. Collapsing the two is silent by
 * construction, because a zero sorts, averages and thresholds like
 * any other number, so a pipeline writing one for an absence reads
 * afterwards as though it had measured every document it never
 * looked at.
 *
 * `ar-ingest.test.ts`, `ar-capture.test.ts` and `ar-score.test.ts`
 * each assert the law where their own canvas states it, one member
 * at a time. What this file adds is the SWEEP: it drives every Code
 * node of all three artifacts twice and refuses any number it cannot
 * account for, so a member added later that defaults to zero fails
 * here naming itself rather than slipping past three suites that
 * were written before it existed.
 *
 * ## Two runs, because neither one alone says it
 *
 * Every node is driven over a PLANTED input leaving its signals
 * unmeasured, and again over a MEASURING one supplying them. The
 * planted run alone is satisfied by a member that is null forever, a
 * node answering nothing having measured nothing; the measuring run
 * alone cannot see a default at all. Together they say a member
 * holds a number when there is one to hold and `null` when there is
 * not, which is the law rather than half of it.
 *
 * ## The four laws a member answers to
 *
 * Every member holding a number, or carrying one anywhere inside it,
 * is registered under one of four laws with the reason it is that
 * one. Nothing else needs an entry: a member holding a string, a
 * boolean or a list of sentences cannot be a zero standing in for an
 * absence, and a member that is `null` in both runs holds no number
 * to account for.
 *
 * `unmeasured` is the law this file is named for. The planted run
 * did not measure it, so the answer is `null` and the case fails on
 * a `0`; the measuring run then has to produce a finite number
 * there, which is what says the member can hold one and that the
 * null was the planting's doing rather than the member's nature.
 *
 * `reading` is a number the node answers whatever happens: a count
 * it took, a length it measured, a version it states. Absence has no
 * spelling there, so a `0` IS the measurement. `compared`,
 * `fence_cuts` and `score_signals_measured` all read zero under
 * their planted runs and all three are correct.
 *
 * `payload` is a value from outside travelling through: a source's
 * record, a client's envelope, a criteria row, an id. A number under
 * one of those is somebody else's, and the case proves it rather
 * than asserting it, by holding every number found under the member
 * against the numbers the planting handed the node. Where the
 * planting also carries a member of the same name the value is held
 * against that too, which is the stronger reading and is taken
 * wherever it is available.
 *
 * `vector` is the one exception the repo's own law names: a numeric
 * vector CANNOT hold `null`, every cell being a finite number by
 * construction, and absence is carried by a companion known flag
 * instead. `src/lib/features.ts` argues that in its header and
 * `tests/lib/features.test.ts` pins it. What is asserted here is
 * that the exception stays bounded: every cell finite, and the key
 * set exactly the layout the library composes for the terms the
 * planting handed in, so the exception cannot quietly widen to cover
 * a column features.ts never planned. No domain on these canvases
 * declares a quantity, so no known flag exists to read today and
 * that half of the exception is the library's suite rather than this
 * one's.
 *
 * ## What makes a later member fail naming itself
 *
 * The per-node guard walks both answers and collects every member
 * holding or carrying a number. A member with no roster entry is
 * reported by name, so `est_cost: 0` landing on a node next year is
 * a red naming `est_cost` rather than a silent pass. The guard runs
 * the other way too: a roster entry naming a member no answer holds
 * is a stale entry excluding nothing, which is the failure mode an
 * exclusion list has and an equality does not report.
 *
 * ## ar-dispatch is outside the sweep, and that is measured
 *
 * The built tree holds four workflows and this sweep covers three.
 * The fourth is phase 3's dispatcher, whose one Code node takes no
 * reading at all: it spreads the claim row it was handed and adds a
 * target workflow id, so it has no numeric member of its own to
 * sweep. That is asserted below rather than asserted in this
 * paragraph, and the vacuity guard at the foot covers all four
 * artifacts, so a Code node landing on any of them fails by name.
 *
 * No word in these fixtures is a term, a criterion or a category any
 * domain would use. The documents are bulletins about rainfall,
 * which is the shared corpus subject and no domain of ours.
 */
import type {
  CodeNodeContext,
  CodeNodeItem,
  CodeNodeSuite,
} from './code-node.js';
import type { FeatureTerm } from '../../src/lib/features.js';

import { describe, expect, it } from 'vitest';

import { CAPTURE_CONTRACT_VERSION } from '../../src/lib/capture-contract.js';
import { featureKeys } from '../../src/lib/features.js';
import { FENCE_OPEN } from '../../src/lib/prompt-frame.js';
import { SHINGLE_SKETCH_SIZE } from '../../src/lib/shingle.js';

import { codeNodes } from './code-node.js';

// ---------------------------------------------------------------------------
// The artifacts under test
// ---------------------------------------------------------------------------

/** `ar-ingest`, the pull path, and eight Code nodes of it. */
const AR_INGEST = codeNodes('ar-ingest.json');

/** `ar-capture`, the push path, and three. */
const AR_CAPTURE = codeNodes('ar-capture.json');

/** `ar-score`, the deterministic scorer, and two. */
const AR_SCORE = codeNodes('ar-score.json');

/** The dispatcher, driven once below to show it sweeps nothing. */
const AR_DISPATCH = codeNodes('ar-dispatch.json');

/** Every artifact the built tree holds, for the vacuity guard. */
const BUILT = [AR_INGEST, AR_CAPTURE, AR_SCORE, AR_DISPATCH];

/**
 * Every node this file actually ran, as `<file>::<node>`.
 *
 * Held against the four artifacts' own Code-node rosters in the last
 * case. A set rather than a counter, because what the guard is about
 * is WHICH nodes were driven and a count cannot tell one node driven
 * twice from two driven once.
 */
const DRIVEN = new Set<string>();

/** How a node is named across four artifacts that share node names. */
function siteOf(file: string, node: string): string {
  return `${file}::${node}`;
}

/** Runs one node of one artifact, recording that it was driven. */
function run(
  suite: CodeNodeSuite,
  node: string,
  context: CodeNodeContext,
): readonly CodeNodeItem[] {
  DRIVEN.add(siteOf(suite.file, node));

  return suite.run(node, context);
}

// ---------------------------------------------------------------------------
// Finding the numbers
// ---------------------------------------------------------------------------

/** One number an answer carried, and where in the payload it sat. */
interface NumberSite {
  /** The top-level member of the payload it sits under. */
  readonly member: string;

  /** Its dotted path from the payload root, for the report. */
  readonly path: string;

  /** The number itself. */
  readonly value: number;
}

/**
 * Every number under one value, at any depth.
 *
 * Deliberately blind to nothing: a number nested three containers
 * down is still a number this pipeline stores, and a walk stopping
 * at the top level would let one hide inside a record. `NaN` and the
 * infinities are numbers to `typeof` and are collected as such, so a
 * cell holding one is reported by the reading that asserts every
 * vector cell finite rather than passing as an ordinary value.
 */
function walkNumbers(
  value: unknown,
  member: string,
  path: string,
  found: NumberSite[],
): void {
  if (typeof value === 'number') {
    found.push({ member, path, value });

    return;
  }

  if (Array.isArray(value)) {
    const entries = value as readonly unknown[];

    for (const [index, entry] of entries.entries()) {
      walkNumbers(entry, member, `${path}[${String(index)}]`, found);
    }

    return;
  }

  if (typeof value === 'object' && value !== null) {
    for (const [key, entry] of Object.entries(value)) {
      walkNumbers(entry, member, `${path}.${key}`, found);
    }
  }
}

/** Every number one payload carries, member by member. */
function numbersIn(
  payload: Record<string, unknown>,
): readonly NumberSite[] {
  const found: NumberSite[] = [];

  for (const [member, value] of Object.entries(payload)) {
    walkNumbers(value, member, member, found);
  }

  return found;
}

/** Every number a list of payloads carries. */
function numbersAcross(
  payloads: readonly Record<string, unknown>[],
): readonly NumberSite[] {
  return payloads.flatMap((payload) => numbersIn(payload));
}

/** Every JSON document a value carries as a string, parsed. */
function walkStrings(value: unknown, into: unknown[]): void {
  if (typeof value === 'string') {
    try {
      into.push(JSON.parse(value));
    } catch {
      // Not a document. Most strings reaching this are prose, so
      // this is the ordinary path rather than a fault to report.
    }

    return;
  }

  if (Array.isArray(value)) {
    for (const entry of value as readonly unknown[]) {
      walkStrings(entry, into);
    }

    return;
  }

  if (typeof value === 'object' && value !== null) {
    for (const entry of Object.values(value)) {
      walkStrings(entry, into);
    }
  }
}

/**
 * Every number a case handed a node, whatever route it arrived by.
 *
 * The input items, every node the case supplied, and — this is the
 * half that is easy to miss — the contents of any string that parses
 * as JSON. `Validate Finding Fields` reads its answer out of a JSON
 * document a model returned as text, so a number it emits arrived as
 * characters rather than as a value, and a collector blind to that
 * reports somebody else's number as one the node invented.
 */
function handedNumbers(context: CodeNodeContext): ReadonlySet<number> {
  const found: NumberSite[] = [];
  const parsed: unknown[] = [];

  walkStrings(context, parsed);
  walkNumbers(context.input ?? [], 'input', 'input', found);
  walkNumbers(context.nodes ?? {}, 'nodes', 'nodes', found);
  walkNumbers(parsed, 'parsed', 'parsed', found);

  return new Set(found.map((site) => site.value));
}

/**
 * The value a case handed the node under a member of the same name,
 * or `undefined` where it handed none.
 *
 * The stronger half of the `payload` law, and it is not always
 * available: `record` and `capture_raw` are built by the node out of
 * something under another name, where the only reading left is that
 * every number in them was handed in somewhere. Where a same-named
 * member IS handed, holding the answer against it says the node
 * carried the value rather than merely answering a number that
 * happened to have been in the room.
 */
function handedAt(context: CodeNodeContext, member: string): unknown {
  const items: unknown[] = [
    ...context.input ?? [],
    ...Object.values(context.nodes ?? {}).flatMap((list) => [...list]),
  ];

  for (const item of items) {
    if (item !== null && typeof item === 'object'
      && Object.hasOwn(item, member)) {
      return (item as Record<string, unknown>)[member];
    }
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// The canvas these plantings put around a node
// ---------------------------------------------------------------------------

/** The run, domain, source, document and finding every fixture names. */
const RUN_ID = '41';
const DOMAIN_ID = '3';
const SOURCE_ID = '7';
const DOCUMENT_ID = '50';
const FINDING_ID = '900';
const LLM_CALL_ID = '300';

/**
 * The numbers the plantings put into somebody else's data.
 *
 * Distinctive on purpose. The `payload` law proves a number was
 * handed in rather than measured here by finding it among the
 * numbers the planting supplied, and a `1` or a `0` would satisfy
 * that by coincidence on almost any canvas. None of these appears
 * anywhere else in this file or in any node.
 */
const POSTED_MILLIMETRES = 4271;
const POSTED_PAGE = 8613;
const CRITERION_ID = 6142;
const SCORED_BEFORE = 5308;
const HANDED_SIMILARITY = 0.75;

/** Two corpus rows, both ordered under the document being judged. */
const CORPUS_ID = 12;
const CORPUS_OTHER_ID = 13;

/** A bulletin carrying two of the terms below, in one category. */
const BULLETIN = 'Rainfall in the northern basin held steady, the gauge '
  + 'at the weir reading four millimetres on five consecutive mornings.';

/** A moment spelled the one way the capture contract accepts. */
const CAPTURED_AT = '2026-08-30T09:00:00.000Z';

/**
 * A body of distinct words, long enough for a full sketch.
 *
 * `sketchComparable` refuses a pair unless both sketches are full,
 * so a shorter body is left out of a comparison entirely rather than
 * compared and scored zero. The length is derived from the library's
 * own constant for that reason.
 */
function wordyBody(seed: string): string {
  return Array.from(
    { length: SHINGLE_SKETCH_SIZE + 16 },
    (_, index) => `${seed}${String(index)}`,
  ).join(' ');
}

/** The document whose sketch the duplicate plantings compare. */
const WORDY = wordyBody('w');

/** A body of the same shape sharing no word with it. */
const WORDY_OTHER = wordyBody('q');

/**
 * The domain's term set, as `Load Domain Context` projects it: the
 * category key joined on beside the three `terms` columns.
 */
const TERMS = [
  { category: 'rainfall', pattern: 'rainfall', weight: 4,
    polarity: 'positive' },
  { category: 'rainfall', pattern: 'gauge', weight: 3,
    polarity: 'positive' },
];

/** The role `Prepare Model Prompt` reads its system text from. */
const RESEARCHER = {
  id: 1,
  role: 'researcher',
  system_text: 'You read bulletins and answer about them.',
};

/** What a finding of this invented domain holds. */
const FIELD_CONTRACT = {
  headline: { type: 'string', required: true },
  millimetres: { type: 'number' },
};

/** The domain's stated position, one row per question. */
function criteriaFor(category: string): readonly unknown[] {
  return [{
    id: CRITERION_ID,
    category,
    value: 'how much fell',
    kind: 'measure',
  }];
}

/** The domain row both context nodes answer. */
function domainRow(over: Record<string, unknown> = {}): unknown {
  return {
    id: Number(DOMAIN_ID),
    slug: 'rainfall-bulletins',
    name: 'Rainfall bulletins',
    settings: { fieldContract: FIELD_CONTRACT, scoringWeights: {} },
    feature_version: null,
    embedding_model: null,
    ...over,
  };
}

/** `ar-ingest`'s context item, with the members a planting sets. */
function ingestContext(over: Record<string, unknown> = {}): unknown {
  return {
    run_id: RUN_ID,
    domain_id: DOMAIN_ID,
    domain: domainRow(),
    personas: [RESEARCHER],
    categories: [],
    terms: TERMS,
    criteria: [],
    ...over,
  };
}

/** A `sources` row as `Select Active Sources` projects one. */
function sourceRow(over: Record<string, unknown> = {}): unknown {
  return {
    run_id: RUN_ID,
    source_id: SOURCE_ID,
    domain_id: DOMAIN_ID,
    kind: 'api',
    endpoint: 'https://bulletins.example.invalid/list',
    parser_config: {
      recordsPath: 'items',
      fields: {
        url: { path: 'link' },
        body: { path: 'text' },
        millimetres: { path: 'mm', type: 'raw' },
      },
    },
    contract: {
      fields: {
        url: { required: true },
        millimetres: { type: 'number' },
      },
    },
    cursor: null,
    consecutive_failures: 0,
    last_success_at: null,
    last_failure_at: null,
    flagged: false,
    ...over,
  };
}

/** One item as `Mark Near Duplicates` answers one. */
function marked(over: Record<string, unknown> = {}): unknown {
  return {
    run_id: RUN_ID,
    domain_id: DOMAIN_ID,
    source_id: SOURCE_ID,
    document_id: DOCUMENT_ID,
    body: BULLETIN,
    sketch_size: SHINGLE_SKETCH_SIZE,
    compared: 2,
    nearest_similarity: HANDED_SIMILARITY,
    duplicate_of: null,
    ...over,
  };
}

/** One item as `Gate Documents` answers a document staged to spend. */
function decided(documentId: string, score: number): unknown {
  return {
    ...marked({ document_id: documentId }) as Record<string, unknown>,
    gate_score: score,
    gate_decision: 'manual_review',
    gate_reason: '',
  };
}

/** One item as `Apply Call Ceiling` answers one. */
function ledgerRow(over: Record<string, unknown> = {}): unknown {
  return {
    run_id: RUN_ID,
    domain_id: DOMAIN_ID,
    source_id: SOURCE_ID,
    document_id: DOCUMENT_ID,
    llm_call_id: LLM_CALL_ID,
    ...over,
  };
}

/** The `sources` row `ar-capture`'s context node projects. */
function captureSource(over: Record<string, unknown> = {}): unknown {
  return {
    id: Number(SOURCE_ID),
    domain_id: Number(DOMAIN_ID),
    kind: 'push',
    endpoint: 'https://bulletins.example.invalid/capture',
    parser_config: {
      fields: {
        url: { path: 'link' },
        body: { path: 'text' },
        headline: { path: 'title' },
        millimetres: { path: 'mm', type: 'raw' },
      },
    },
    contract: { fields: { url: { required: true } } },
    consecutive_failures: 2,
    last_success_at: null,
    last_failure_at: null,
    enabled: true,
    flagged: false,
    ...over,
  };
}

/** `ar-capture`'s context item, with the members a planting sets. */
function captureContext(over: Record<string, unknown> = {}): unknown {
  return {
    source_id: SOURCE_ID,
    domain_id: DOMAIN_ID,
    source: captureSource(),
    domain: domainRow(),
    personas: [],
    categories: [],
    terms: [],
    criteria: [],
    ...over,
  };
}

/** The envelope a client posts, carrying two planted numbers. */
const POSTED_ENVELOPE = {
  version: CAPTURE_CONTRACT_VERSION,
  sourceId: Number(SOURCE_ID),
  capturedAt: CAPTURED_AT,
  provenance: { agent: 'basin-clipper', page: POSTED_PAGE },
  body: {
    link: 'https://bulletins.example.invalid/1',
    text: BULLETIN,
    title: 'steady rain in the northern basin',
    mm: POSTED_MILLIMETRES,
  },
};

/** What `Store Raw Capture` answers for a request it could store. */
function storedRow(): unknown {
  return {
    domain_id: DOMAIN_ID,
    source_id: SOURCE_ID,
    document_id: DOCUMENT_ID,
    document_stored: true,
    store_error: null,
  };
}

/** What `Record Capture Provenance` answers for one verdict. */
function recordedRow(accepted: boolean): unknown {
  return {
    ...storedRow() as Record<string, unknown>,
    contract_version: CAPTURE_CONTRACT_VERSION,
    contract_version_accepted: accepted,
    envelope_accepted: accepted,
    parse_error: 'the capture envelope was judged',
    verdict_recorded: true,
    provenance_recorded: true,
  };
}

/** The accepted envelope as `Judge Capture Envelope` rearranged it. */
const CAPTURE_RAW = {
  capture: {
    version: CAPTURE_CONTRACT_VERSION,
    sourceId: POSTED_ENVELOPE.sourceId,
    capturedAt: CAPTURED_AT,
    provenance: POSTED_ENVELOPE.provenance,
  },
  record: POSTED_ENVELOPE.body,
};

/** `ar-score`'s context item, over the terms a planting states. */
function scoreContext(
  terms: readonly unknown[],
  category: string,
): unknown {
  return {
    domain_id: DOMAIN_ID,
    domain: domainRow({ settings: { scoringWeights: { [category]: 3 } } }),
    personas: [],
    categories: [],
    terms,
    criteria: criteriaFor(category),
  };
}

/** One row `Select Scoring Subjects` answers. */
function subjectRow(
  category: string,
  over: Record<string, unknown> = {},
): unknown {
  return {
    finding_id: FINDING_ID,
    domain_id: DOMAIN_ID,
    document_id: DOCUMENT_ID,
    entity_id: null,
    fields: { headline: 'steady rain in the northern basin' },
    score: null,
    score_version: null,
    criteria: criteriaFor(category),
    document_body: BULLETIN,
    document_parse_status: 'ok',
    document_features: null,
    document_feature_version: null,
    ...over,
  };
}

/** Every item's payload, in the order the node answered them. */
function payloadsOf(
  items: readonly CodeNodeItem[],
): readonly Record<string, unknown>[] {
  return items.map((item) => item.json);
}

/**
 * `ar-score`'s two feature canvases, and the vectors they produce.
 *
 * `Aggregate Finding Scores` is driven over what the node above it
 * actually answered rather than over an item hand-written to look
 * like one, which is the composition the canvas runs and the only
 * arrangement where the version and the vector reaching the scorer
 * are the ones the featurizer composed.
 */
const SCORE_UNLIT = {
  input: [subjectRow('wind')],
  nodes: { 'Load Domain Context': [scoreContext([], 'wind')] },
};

/** The same canvas with a term set that lights the stated bucket. */
const SCORE_LIT = {
  input: [subjectRow('rainfall', {
    score: SCORED_BEFORE,
    score_version: 1,
  })],
  nodes: { 'Load Domain Context': [scoreContext(TERMS, 'rainfall')] },
};

/** The vectors the unlit canvas produces, computed once. */
const SCORE_VECTORS_UNLIT = payloadsOf(
  run(AR_SCORE, 'Compute Feature Vectors', SCORE_UNLIT),
);

/** The same, over the canvas whose terms name the stated bucket. */
const SCORE_VECTORS_LIT = payloadsOf(
  run(AR_SCORE, 'Compute Feature Vectors', SCORE_LIT),
);

// ---------------------------------------------------------------------------
// One planting per Code node, and its measuring counterpart
// ---------------------------------------------------------------------------

/** A node, the input that measures nothing, and the one that does. */
interface Planting {
  /** The artifact the node belongs to. */
  readonly suite: CodeNodeSuite;

  /** Its name on that canvas. */
  readonly node: string;

  /** What the planted run leaves unmeasured, in one phrase. */
  readonly leaves: string;

  /** The canvas where the signals were never taken. */
  readonly unmeasured: CodeNodeContext;

  /** The same canvas with every one of them supplied. */
  readonly measuring: CodeNodeContext;
}

/** One `Write Documents` item, as that statement projects one. */
const WRITTEN = {
  run_id: RUN_ID,
  domain_id: DOMAIN_ID,
  source_id: SOURCE_ID,
  document_id: DOCUMENT_ID,
  document_inserted: true,
};

/** Every Code node of the three workflows this phase landed. */
const PLANTINGS: readonly Planting[] = [
  {
    suite: AR_INGEST,
    node: 'Extract Records',
    leaves: 'a request that never completed, so no status was read',
    unmeasured: {
      input: [{ error: { message: 'the request did not complete' } }],
      nodes: { 'Select Active Sources': [sourceRow()] },
    },
    measuring: {
      input: [{
        body: {
          items: [{
            link: 'https://bulletins.example.invalid/1',
            text: BULLETIN,
            mm: POSTED_MILLIMETRES,
          }],
        },
        headers: {},
        statusCode: 200,
      }],
      nodes: { 'Select Active Sources': [sourceRow()] },
    },
  },
  {
    suite: AR_INGEST,
    node: 'Judge Source Health',
    leaves: 'a pass whose one reading could not be judged at all',
    unmeasured: {
      input: [{ document_id: null }],
      nodes: {
        'Select Active Sources': [sourceRow()],
        'Extract Records': [{ source_id: SOURCE_ID, parse_status: null }],
      },
    },
    measuring: {
      input: [{ document_id: DOCUMENT_ID }],
      nodes: {
        'Select Active Sources': [sourceRow({ consecutive_failures: 4 })],
        'Extract Records': [{ source_id: SOURCE_ID, parse_status: 'ok' }],
      },
    },
  },
  {
    suite: AR_INGEST,
    node: 'Mark Near Duplicates',
    leaves: 'a corpus holding nothing this document is comparable to',
    unmeasured: {
      input: [{ corpus: [] }],
      nodes: {
        'Extract Records': [{ record: { body: WORDY } }],
        'Write Documents': [WRITTEN],
      },
    },
    measuring: {
      input: [{
        corpus: [
          { id: CORPUS_ID, body: WORDY },
          { id: CORPUS_OTHER_ID, body: WORDY_OTHER },
        ],
      }],
      nodes: {
        'Extract Records': [{ record: { body: WORDY } }],
        'Write Documents': [WRITTEN],
      },
    },
  },
  {
    suite: AR_INGEST,
    node: 'Gate Documents',
    leaves: 'a stored body holding nothing the gate could read',
    unmeasured: {
      input: [marked({
        body: '',
        sketch_size: 0,
        compared: 0,
        nearest_similarity: null,
      })],
      nodes: { 'Load Domain Context': [ingestContext()] },
    },
    measuring: {
      input: [marked()],
      nodes: { 'Load Domain Context': [ingestContext()] },
    },
  },
  {
    suite: AR_INGEST,
    node: 'Apply Call Ceiling',
    leaves: 'nothing: this node takes no reading and answers no number',
    unmeasured: {
      input: [{ endpoint: 'https://models.example.invalid/v1' }],
      nodes: { 'Gate Documents': [decided(DOCUMENT_ID, 7)] },
    },
    measuring: {
      input: [{ endpoint: 'https://models.example.invalid/v1' }],
      nodes: {
        'Gate Documents': [decided(DOCUMENT_ID, 7), decided('51', 4)],
      },
    },
  },
  {
    suite: AR_INGEST,
    node: 'Prepare Model Prompt',
    leaves: 'a chunk carrying no fence and no active form to defang',
    unmeasured: {
      input: [{
        run_id: RUN_ID,
        domain_id: DOMAIN_ID,
        source_id: SOURCE_ID,
        document_id: DOCUMENT_ID,
        body: BULLETIN,
      }],
      nodes: { 'Load Domain Context': [ingestContext()] },
    },
    measuring: {
      input: [{
        run_id: RUN_ID,
        domain_id: DOMAIN_ID,
        source_id: SOURCE_ID,
        document_id: DOCUMENT_ID,
        body: `${BULLETIN}\n${FENCE_OPEN}\n# A heading run\n`,
      }],
      nodes: { 'Load Domain Context': [ingestContext()] },
    },
  },
  {
    suite: AR_INGEST,
    node: 'Validate Finding Fields',
    leaves: 'a model call that came back with no answer to read',
    unmeasured: {
      input: [ledgerRow()],
      nodes: {
        'Load Domain Context': [ingestContext()],
        'Extract Finding Fields': [{
          error: { message: 'the call did not complete' },
        }],
      },
    },
    measuring: {
      input: [ledgerRow()],
      nodes: {
        'Load Domain Context': [ingestContext()],
        'Extract Finding Fields': [{
          text: JSON.stringify({
            headline: 'steady rain in the northern basin',
            millimetres: POSTED_MILLIMETRES,
          }),
        }],
      },
    },
  },
  {
    suite: AR_INGEST,
    node: 'Compute Feature Vectors',
    leaves: 'a domain naming no term, over a document holding no text',
    unmeasured: {
      input: [{}],
      nodes: {
        'Load Domain Context': [ingestContext({ terms: [] })],
        'Gate Documents': [marked({ body: '' })],
      },
    },
    measuring: {
      input: [{}],
      nodes: {
        'Load Domain Context': [ingestContext()],
        'Gate Documents': [marked()],
      },
    },
  },
  {
    suite: AR_CAPTURE,
    node: 'Judge Capture Envelope',
    leaves: 'a posted payload that is not an envelope at all',
    unmeasured: {
      input: [storedRow()],
      nodes: { 'Capture Webhook': [{ body: 'not an envelope' }] },
    },
    measuring: {
      input: [storedRow()],
      nodes: { 'Capture Webhook': [{ body: POSTED_ENVELOPE }] },
    },
  },
  {
    suite: AR_CAPTURE,
    node: 'Extract Capture Records',
    leaves: 'a refused envelope, against a claim resolving to no source',
    unmeasured: {
      input: [recordedRow(false)],
      nodes: {
        'Load Domain Context': [captureContext({
          source: null,
          domain: null,
        })],
        'Judge Capture Envelope': [{ capture_raw: null }],
      },
    },
    measuring: {
      input: [recordedRow(true)],
      nodes: {
        'Load Domain Context': [captureContext()],
        'Judge Capture Envelope': [{ capture_raw: CAPTURE_RAW }],
      },
    },
  },
  {
    suite: AR_CAPTURE,
    node: 'Judge Capture Health',
    leaves: 'a capture whose claim resolved to no source to judge',
    unmeasured: {
      input: [{
        domain_id: DOMAIN_ID,
        source_id: SOURCE_ID,
        document_id: DOCUMENT_ID,
        finding_id: null,
      }],
      nodes: {
        'Load Domain Context': [captureContext({ source: null })],
        'Extract Capture Records': [{ parse_status: null }],
      },
    },
    measuring: {
      input: [{
        domain_id: DOMAIN_ID,
        source_id: SOURCE_ID,
        document_id: DOCUMENT_ID,
        finding_id: FINDING_ID,
      }],
      nodes: {
        'Load Domain Context': [captureContext()],
        'Extract Capture Records': [{ parse_status: 'ok' }],
      },
    },
  },
  {
    suite: AR_SCORE,
    node: 'Compute Feature Vectors',
    leaves: 'a domain naming no term, so the vector lays out no bucket',
    unmeasured: SCORE_UNLIT,
    measuring: SCORE_LIT,
  },
  {
    suite: AR_SCORE,
    node: 'Aggregate Finding Scores',
    leaves: 'criteria naming a bucket the vector carries no cell for',
    unmeasured: {
      input: SCORE_VECTORS_UNLIT,
      nodes: { 'Load Domain Context': [scoreContext([], 'wind')] },
    },
    measuring: {
      input: SCORE_VECTORS_LIT,
      nodes: { 'Load Domain Context': [scoreContext(TERMS, 'rainfall')] },
    },
  },
];

// ---------------------------------------------------------------------------
// The roster: every member holding or carrying a number, by law
// ---------------------------------------------------------------------------

/** The four things a number a Code node answers can be. */
type NumericLaw = 'unmeasured' | 'reading' | 'payload' | 'vector';

/** One member of one node, under one of the four laws. */
interface NumericMember {
  /** The artifact's file name, as the build wrote it. */
  readonly workflow: string;

  /** The Code node's name on that canvas. */
  readonly node: string;

  /** The member of the payload it answers. */
  readonly member: string;

  /** Which law decides what a number there means. */
  readonly law: NumericLaw;

  /**
   * Why it is that law and not another.
   *
   * Not decoration: widening this roster is what would let a zero
   * standing in for an absence through, so an entry costs a sentence
   * a reviewer can disagree with rather than a name in a list.
   */
  readonly because: string;
}

/** Every numeric member the three swept artifacts answer. */
const NUMERIC_MEMBERS: readonly NumericMember[] = [
  {
    workflow: 'ar-ingest.json',
    node: 'Extract Records',
    member: 'http_status',
    law: 'unmeasured',
    because: 'a request that never completed was answered no status, '
      + 'where a 0 would be a status code somebody read off a response',
  },
  {
    workflow: 'ar-ingest.json',
    node: 'Extract Records',
    member: 'record',
    law: 'payload',
    because: 'the reading the field map built out of what the source '
      + 'sent, so a number in it is the source\'s own value',
  },
  {
    workflow: 'ar-ingest.json',
    node: 'Extract Records',
    member: 'raw',
    law: 'payload',
    because: 'the entry exactly as it arrived, kept whatever the '
      + 'extraction made of it',
  },
  {
    workflow: 'ar-ingest.json',
    node: 'Judge Source Health',
    member: 'consecutive_failures',
    law: 'reading',
    because: 'the counter is taken on every pass and a success resets '
      + 'it to a real 0, which src/lib/source-health.ts argues for in '
      + 'its own header rather than answering null there',
  },
  {
    workflow: 'ar-ingest.json',
    node: 'Mark Near Duplicates',
    member: 'sketch_size',
    law: 'reading',
    because: 'how many hashes the document\'s sketch held, which a '
      + 'body with no full shingle measures as 0',
  },
  {
    workflow: 'ar-ingest.json',
    node: 'Mark Near Duplicates',
    member: 'compared',
    law: 'reading',
    because: 'how many corpus members it was comparable to, which is a '
      + 'count it takes over the whole corpus every time',
  },
  {
    workflow: 'ar-ingest.json',
    node: 'Mark Near Duplicates',
    member: 'nearest_similarity',
    law: 'unmeasured',
    because: 'no member was comparable, so no overlap was computed at '
      + 'all, where a 0 says it compared and found none in common',
  },
  {
    workflow: 'ar-ingest.json',
    node: 'Mark Near Duplicates',
    member: 'duplicate_of',
    law: 'payload',
    because: 'the id of the corpus row it converged with, taken off '
      + 'the aggregate the node above answered',
  },
  {
    workflow: 'ar-ingest.json',
    node: 'Gate Documents',
    member: 'gate_score',
    law: 'unmeasured',
    because: 'a document the gate could not read is parked without a '
      + 'score, where a 0 says it read the text and found no term',
  },
  {
    workflow: 'ar-ingest.json',
    node: 'Gate Documents',
    member: 'sketch_size',
    law: 'payload',
    because: 'carried unchanged off the duplicate pass, which is where '
      + 'the reading was taken',
  },
  {
    workflow: 'ar-ingest.json',
    node: 'Gate Documents',
    member: 'compared',
    law: 'payload',
    because: 'carried unchanged off the duplicate pass, this node '
      + 'comparing nothing of its own',
  },
  {
    workflow: 'ar-ingest.json',
    node: 'Gate Documents',
    member: 'nearest_similarity',
    law: 'payload',
    because: 'carried unchanged, so the null-or-number decision on it '
      + 'is the duplicate pass\'s and is asserted there',
  },
  {
    workflow: 'ar-ingest.json',
    node: 'Prepare Model Prompt',
    member: 'prompt_chars',
    law: 'reading',
    because: 'the length of what would be sent, measured off the two '
      + 'halves the frame composed',
  },
  {
    workflow: 'ar-ingest.json',
    node: 'Prepare Model Prompt',
    member: 'est_tokens',
    law: 'reading',
    because: 'derived from that length by a pure function, so it is '
      + 'answered whenever the length is',
  },
  {
    workflow: 'ar-ingest.json',
    node: 'Prepare Model Prompt',
    member: 'fence_cuts',
    law: 'reading',
    because: 'how many fence markers were cut out of the untrusted '
      + 'half, which a clean chunk measures as 0',
  },
  {
    workflow: 'ar-ingest.json',
    node: 'Prepare Model Prompt',
    member: 'forms_defanged',
    law: 'reading',
    because: 'how many active forms were defanged, counted over every '
      + 'chunk whether or not it carried one',
  },
  {
    workflow: 'ar-ingest.json',
    node: 'Validate Finding Fields',
    member: 'finding_fields',
    law: 'payload',
    because: 'the model\'s own answer, read out of the JSON document '
      + 'it returned rather than measured here',
  },
  {
    workflow: 'ar-ingest.json',
    node: 'Compute Feature Vectors',
    member: 'features',
    law: 'vector',
    because: 'the numeric vector, whose cells are finite by '
      + 'construction and whose absences are carried by a known flag',
  },
  {
    workflow: 'ar-ingest.json',
    node: 'Compute Feature Vectors',
    member: 'feature_version',
    law: 'reading',
    because: 'composed from the mechanism version and the term set on '
      + 'every pass, so there is no pass that composes none',
  },
  {
    workflow: 'ar-capture.json',
    node: 'Judge Capture Envelope',
    member: 'contract_version',
    law: 'reading',
    because: 'the version this service accepts, stated on every answer '
      + 'off the spliced library\'s own constant',
  },
  {
    workflow: 'ar-capture.json',
    node: 'Judge Capture Envelope',
    member: 'capture_raw',
    law: 'payload',
    because: 'the accepted envelope rearranged, so every number under '
      + 'it is one the client posted',
  },
  {
    workflow: 'ar-capture.json',
    node: 'Extract Capture Records',
    member: 'contract_version',
    law: 'payload',
    because: 'carried off the boundary node, which is where the '
      + 'version is stated',
  },
  {
    workflow: 'ar-capture.json',
    node: 'Extract Capture Records',
    member: 'record',
    law: 'payload',
    because: 'the reading the field map built out of the captured '
      + 'body, so a number in it is the client\'s own value',
  },
  {
    workflow: 'ar-capture.json',
    node: 'Extract Capture Records',
    member: 'finding_fields',
    law: 'payload',
    because: 'the members of that reading the domain\'s field contract '
      + 'names, none of which this node computes',
  },
  {
    workflow: 'ar-capture.json',
    node: 'Judge Capture Health',
    member: 'consecutive_failures',
    law: 'unmeasured',
    because: 'a capture whose claim resolved to no source moved no '
      + 'counter, where a 0 says a pass succeeded and reset one',
  },
  {
    workflow: 'ar-score.json',
    node: 'Compute Feature Vectors',
    member: 'score',
    law: 'payload',
    because: 'whatever an earlier scoring pass wrote on the finding, '
      + 'carried so the scorer below can see it was already scored',
  },
  {
    workflow: 'ar-score.json',
    node: 'Compute Feature Vectors',
    member: 'score_version',
    law: 'payload',
    because: 'the scheme version beside that score, carried the same '
      + 'way and read by nothing on this node',
  },
  {
    workflow: 'ar-score.json',
    node: 'Compute Feature Vectors',
    member: 'criteria',
    law: 'payload',
    because: 'the domain\'s own rows, carried to the scorer below with '
      + 'their ids, which are the numbers in them',
  },
  {
    workflow: 'ar-score.json',
    node: 'Compute Feature Vectors',
    member: 'features',
    law: 'vector',
    because: 'the numeric vector again, computed here or reused from '
      + 'the document under the same layout law',
  },
  {
    workflow: 'ar-score.json',
    node: 'Compute Feature Vectors',
    member: 'feature_version',
    law: 'reading',
    because: 'composed on every pass, which is what the skip below it '
      + 'is keyed on and so can never be absent',
  },
  {
    workflow: 'ar-score.json',
    node: 'Aggregate Finding Scores',
    member: 'score',
    law: 'unmeasured',
    because: 'a finding whose criteria name buckets the vector holds '
      + 'no cell for was scored on nothing, where a 0 is a total',
  },
  {
    workflow: 'ar-score.json',
    node: 'Aggregate Finding Scores',
    member: 'score_version',
    law: 'unmeasured',
    because: 'a finding with no score was read against no scheme, so '
      + 'stamping one would date a reading nobody took',
  },
  {
    workflow: 'ar-score.json',
    node: 'Aggregate Finding Scores',
    member: 'score_signals_stated',
    law: 'reading',
    because: 'how many buckets the domain\'s criteria named, counted '
      + 'off the rows whether any of them was measurable',
  },
  {
    workflow: 'ar-score.json',
    node: 'Aggregate Finding Scores',
    member: 'score_signals_measured',
    law: 'reading',
    because: 'how many of those the vector answered, and the 0 beside '
      + 'a null score is what says the score is null for that reason',
  },
  {
    workflow: 'ar-score.json',
    node: 'Aggregate Finding Scores',
    member: 'feature_version',
    law: 'payload',
    because: 'carried off the featurizer so a closing statement can '
      + 'say which generation this pass scored against',
  },
];

// ---------------------------------------------------------------------------
// Reading a planting
// ---------------------------------------------------------------------------

/** What one node answered over its two runs. */
interface NodeAnswers {
  /** The run whose signals were never taken. */
  readonly unmeasured: readonly Record<string, unknown>[];

  /** The run that supplied every one of them. */
  readonly measuring: readonly Record<string, unknown>[];
}

/** Both runs of every node, driven once and held. */
const ANSWERS = new Map<string, NodeAnswers>();

/** Drives one planting's two runs, or answers the held pair. */
function answersFor(planting: Planting): NodeAnswers {
  const site = siteOf(planting.suite.file, planting.node);
  const held = ANSWERS.get(site);

  if (held !== undefined) {
    return held;
  }

  const driven: NodeAnswers = {
    unmeasured: payloadsOf(
      run(planting.suite, planting.node, planting.unmeasured),
    ),
    measuring: payloadsOf(
      run(planting.suite, planting.node, planting.measuring),
    ),
  };

  ANSWERS.set(site, driven);

  return driven;
}

/** The roster entries one node answers to. */
function entriesFor(planting: Planting): readonly NumericMember[] {
  return NUMERIC_MEMBERS.filter(
    (entry) => entry.workflow === planting.suite.file
      && entry.node === planting.node,
  );
}

/** The entries of one node under one law. */
function entriesUnder(
  entries: readonly NumericMember[],
  law: NumericLaw,
): readonly NumericMember[] {
  return entries.filter((entry) => entry.law === law);
}

/** Every member of a run's payloads holding or carrying a number. */
function membersCarrying(
  payloads: readonly Record<string, unknown>[],
): readonly string[] {
  const members = numbersAcross(payloads).map((site) => site.member);

  return [...new Set(members)].sort();
}

/**
 * The term set a planting handed the featurizer.
 *
 * Read off the context node rather than written out again, so the
 * layout a vector is held against is the layout the node composed
 * from the same rows. A planting reaching this without one is a
 * roster entry pointed at the wrong node, and refuses by name.
 */
function vectorTermsOf(
  planting: Planting,
  context: CodeNodeContext,
): readonly FeatureTerm[] {
  const supplied = context.nodes?.['Load Domain Context'] ?? [];
  const first = supplied[0];
  const terms = first !== null && typeof first === 'object'
    ? (first as Record<string, unknown>)['terms']
    : undefined;

  if (!Array.isArray(terms)) {
    throw new Error(
      `[null-vs-zero] ${planting.node} was planted with no term set, so `
      + 'there is no layout to hold its vector against',
    );
  }

  return terms as readonly FeatureTerm[];
}

/** The key list the library composes for one planting's terms. */
function layoutFor(
  planting: Planting,
  context: CodeNodeContext,
): readonly string[] {
  return [...featureKeys({
    terms: vectorTermsOf(planting, context),
    quantities: [],
    oneHots: [],
  })].sort();
}

/** How a cell is reported when it is not the finite number wanted. */
function finiteOr(cell: unknown): string {
  return typeof cell === 'number' && Number.isFinite(cell)
    ? 'a finite number'
    : `${typeof cell}: ${JSON.stringify(cell) ?? 'undefined'}`;
}

// ---------------------------------------------------------------------------
// The roster, before anything it reports is believed
// ---------------------------------------------------------------------------

describe('null-vs-zero — the roster is one', () => {
  it('gives every entry a reason nobody left blank', () => {
    const blank = NUMERIC_MEMBERS
      .filter((entry) => entry.because.trim().length < 20)
      .map((entry) => `${entry.node}.${entry.member}`);

    expect(blank).toEqual([]);
    expect(NUMERIC_MEMBERS.length).toBeGreaterThan(0);
  });

  it('names each member of each node exactly once', () => {
    const sites = NUMERIC_MEMBERS.map(
      (entry) => `${entry.workflow}::${entry.node}::${entry.member}`,
    );

    expect(sites.length).toBe(new Set(sites).size);
  });

  it('names only Code nodes the three swept artifacts hold', () => {
    const held = new Set(PLANTINGS.map(
      (planting) => siteOf(planting.suite.file, planting.node),
    ));
    const stray = NUMERIC_MEMBERS
      .filter((entry) => !held.has(siteOf(entry.workflow, entry.node)))
      .map((entry) => `${entry.workflow}::${entry.node}`);

    expect(stray).toEqual([]);
    expect(held.has(siteOf('ar-ingest.json', 'Extract Recordz'))).toBe(false);
  });

  it('reaches all four laws, so none of them is a dead branch', () => {
    const laws = NUMERIC_MEMBERS.map((entry) => entry.law);

    expect([...new Set(laws)].sort())
      .toEqual(['payload', 'reading', 'unmeasured', 'vector']);
  });

  it('covers the three this phase landed and no fourth', () => {
    const swept = NUMERIC_MEMBERS.map((entry) => entry.workflow);

    expect([...new Set(swept)].sort())
      .toEqual(['ar-capture.json', 'ar-ingest.json', 'ar-score.json']);
  });
});

describe('null-vs-zero — the number walk discriminates', () => {
  it('reports a zero nested inside a carrier', () => {
    expect(numbersIn({ outer: { inner: [{ deep: 0 }] } })).toEqual([
      { member: 'outer', path: 'outer.inner[0].deep', value: 0 },
    ]);
  });

  it('reports nothing over a payload carrying no number at all', () => {
    expect(numbersIn({ a: null, b: 'text', c: true, d: [], e: {} }))
      .toEqual([]);
  });

  it('reads a number out of a document handed in as text', () => {
    const handed = handedNumbers({
      nodes: { 'Extract Finding Fields': [{ text: '{"mm":4271}' }] },
    });

    expect(handed.has(POSTED_MILLIMETRES)).toBe(true);
    expect(handed.has(POSTED_PAGE)).toBe(false);
  });

  it('answers nothing for a member no item it was handed carries', () => {
    expect(handedAt({ input: [{ taken: 1 }] }, 'untaken')).toBeUndefined();
    expect(handedAt({ input: [{ taken: 1 }] }, 'taken')).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// The sweep, one describe per Code node
// ---------------------------------------------------------------------------

for (const planting of PLANTINGS) {
  const entries = entriesFor(planting);
  const label = `${planting.suite.file} :: ${planting.node}`;

  describe(`null-vs-zero — ${label}`, () => {
    it('answers both runs, so neither reading is over nothing', () => {
      const answers = answersFor(planting);

      expect(answers.unmeasured.length).toBeGreaterThan(0);
      expect(answers.measuring.length).toBeGreaterThan(0);
      expect(planting.leaves.length).toBeGreaterThan(20);
    });

    it('answers no number this roster does not name', () => {
      const answers = answersFor(planting);
      const named = new Set(entries.map((entry) => entry.member));
      const carrying = [
        ...membersCarrying(answers.unmeasured),
        ...membersCarrying(answers.measuring),
      ];

      expect(carrying.filter((member) => !named.has(member))).toEqual([]);
    });

    it('names no member the node leaves without a number', () => {
      const answers = answersFor(planting);
      const carrying = new Set([
        ...membersCarrying(answers.unmeasured),
        ...membersCarrying(answers.measuring),
      ]);
      const stale = entries
        .filter((entry) => !carrying.has(entry.member))
        .map((entry) => `${entry.member} (${entry.law})`);

      expect(stale).toEqual([]);
    });

    it('answers every member it names, in both of its runs', () => {
      const answers = answersFor(planting);
      const both = [...answers.unmeasured, ...answers.measuring];
      const missing: string[] = [];

      for (const entry of entries) {
        for (const payload of both) {
          if (!Object.hasOwn(payload, entry.member)) {
            missing.push(entry.member);
          }
        }
      }

      expect(missing).toEqual([]);
    });

    if (entriesUnder(entries, 'unmeasured').length > 0) {
      it('answers null, never 0, for a signal it never measured', () => {
        const answers = answersFor(planting);
        const answered: Record<string, unknown> = {};
        const wanted: Record<string, unknown> = {};

        for (const entry of entriesUnder(entries, 'unmeasured')) {
          for (const [index, payload] of answers.unmeasured.entries()) {
            const at = `${entry.member}[${String(index)}]`;

            answered[at] = payload[entry.member];
            wanted[at] = null;
          }
        }

        expect(answered).toEqual(wanted);
      });

      it('answers a finite number for each once one is measured', () => {
        const answers = answersFor(planting);
        const answered: Record<string, string> = {};
        const wanted: Record<string, string> = {};

        for (const entry of entriesUnder(entries, 'unmeasured')) {
          for (const [index, payload] of answers.measuring.entries()) {
            const at = `${entry.member}[${String(index)}]`;

            answered[at] = finiteOr(payload[entry.member]);
            wanted[at] = 'a finite number';
          }
        }

        expect(answered).toEqual(wanted);
      });
    }

    if (entriesUnder(entries, 'reading').length > 0) {
      it('answers a finite number for every reading it takes', () => {
        const answers = answersFor(planting);
        const answered: Record<string, string> = {};
        const wanted: Record<string, string> = {};
        const runs = [
          { name: 'unmeasured', payloads: answers.unmeasured },
          { name: 'measuring', payloads: answers.measuring },
        ];

        for (const taken of runs) {
          for (const entry of entriesUnder(entries, 'reading')) {
            for (const [index, payload] of taken.payloads.entries()) {
              const at = `${taken.name}.${entry.member}[${String(index)}]`;

              answered[at] = finiteOr(payload[entry.member]);
              wanted[at] = 'a finite number';
            }
          }
        }

        expect(answered).toEqual(wanted);
      });
    }

    if (entriesUnder(entries, 'payload').length > 0) {
      it('invents no number under a member it was handed', () => {
        const answers = answersFor(planting);
        const invented: string[] = [];
        const runs = [
          { context: planting.unmeasured, payloads: answers.unmeasured },
          { context: planting.measuring, payloads: answers.measuring },
        ];

        for (const taken of runs) {
          const handed = handedNumbers(taken.context);

          for (const entry of entriesUnder(entries, 'payload')) {
            for (const payload of taken.payloads) {
              const sites = numbersIn(payload)
                .filter((site) => site.member === entry.member)
                .filter((site) => !handed.has(site.value));

              invented.push(...sites.map(
                (site) => `${site.path} = ${String(site.value)}`,
              ));
            }
          }
        }

        expect(invented).toEqual([]);
      });

      it('carries a same-named member through unchanged', () => {
        const answers = answersFor(planting);
        const answered: Record<string, unknown> = {};
        const wanted: Record<string, unknown> = {};
        const runs = [
          { name: 'unmeasured', context: planting.unmeasured,
            payloads: answers.unmeasured },
          { name: 'measuring', context: planting.measuring,
            payloads: answers.measuring },
        ];

        for (const taken of runs) {
          for (const entry of entriesUnder(entries, 'payload')) {
            const held = handedAt(taken.context, entry.member);

            if (held === undefined) {
              continue;
            }

            for (const [index, payload] of taken.payloads.entries()) {
              const at = `${taken.name}.${entry.member}[${String(index)}]`;

              answered[at] = payload[entry.member];
              wanted[at] = held;
            }
          }
        }

        expect(answered).toEqual(wanted);
      });
    }

    if (entriesUnder(entries, 'vector').length > 0) {
      it('lays the vector out as the library does, holding no null', () => {
        const answers = answersFor(planting);
        const runs = [
          { context: planting.unmeasured, payloads: answers.unmeasured },
          { context: planting.measuring, payloads: answers.measuring },
        ];
        const unfinite: string[] = [];
        const layouts: string[][] = [];
        const wanted: string[][] = [];

        for (const taken of runs) {
          for (const entry of entriesUnder(entries, 'vector')) {
            for (const payload of taken.payloads) {
              const cells = payload[entry.member] as Record<string, unknown>;

              layouts.push(Object.keys(cells).sort());
              wanted.push([...layoutFor(planting, taken.context)]);
              unfinite.push(...Object.entries(cells)
                .filter(([, cell]) => finiteOr(cell) !== 'a finite number')
                .map(([key]) => `${entry.member}.${key}`));
            }
          }
        }

        expect(unfinite).toEqual([]);
        expect(layouts).toEqual(wanted);
      });
    }
  });
}

// ---------------------------------------------------------------------------
// The three readings this file is named for
// ---------------------------------------------------------------------------

/** One planting by name, refusing rather than answering nothing. */
function plantingFor(file: string, node: string): Planting {
  const found = PLANTINGS.find(
    (planting) => planting.suite.file === file && planting.node === node,
  );

  if (found === undefined) {
    throw new Error(
      `[null-vs-zero] there is no planting for ${siteOf(file, node)}, so `
      + 'the case reading it is about a node this file does not drive',
    );
  }

  return found;
}

describe('null-vs-zero — one member, both readings, one node', () => {
  /**
   * The same document against a corpus holding one member it CAN
   * compare against and shares no word with.
   *
   * The sharpest pair available anywhere in this pipeline: the
   * planted run leaves `nearest_similarity` null because nothing was
   * comparable, and this one answers `0` from the same member of the
   * same node, because one comparison ran and found nothing in
   * common. A suite asserting only the null would be satisfied by a
   * member that is null forever.
   */
  const compared = payloadsOf(run(AR_INGEST, 'Mark Near Duplicates', {
    input: [{ corpus: [{ id: CORPUS_ID, body: WORDY_OTHER }] }],
    nodes: {
      'Extract Records': [{ record: { body: WORDY } }],
      'Write Documents': [WRITTEN],
    },
  }));

  it('reads no overlap as 0 and no comparison at all as null', () => {
    const nothing = answersFor(
      plantingFor('ar-ingest.json', 'Mark Near Duplicates'),
    );

    expect(compared[0]?.['compared']).toBe(1);
    expect(compared[0]?.['nearest_similarity']).toBe(0);
    expect(nothing.unmeasured[0]?.['compared']).toBe(0);
    expect(nothing.unmeasured[0]?.['nearest_similarity']).toBeNull();
  });

  it('reads a reset counter as 0 and no source to judge as null', () => {
    const answers = answersFor(
      plantingFor('ar-capture.json', 'Judge Capture Health'),
    );

    expect(answers.unmeasured[0]?.['source_judged']).toBe(false);
    expect(answers.unmeasured[0]?.['consecutive_failures']).toBeNull();
    expect(answers.measuring[0]?.['source_judged']).toBe(true);
    expect(answers.measuring[0]?.['consecutive_failures']).toBe(0);
  });

  it('reads no measurable signal as a null score beside a 0 count', () => {
    const answers = answersFor(
      plantingFor('ar-score.json', 'Aggregate Finding Scores'),
    );
    const unscored = answers.unmeasured[0] ?? {};
    const scored = answers.measuring[0] ?? {};

    expect(unscored['score']).toBeNull();
    expect(unscored['score_version']).toBeNull();
    expect(unscored['score_signals_stated']).toBe(1);
    expect(unscored['score_signals_measured']).toBe(0);
    expect(typeof scored['score']).toBe('number');
    expect(scored['score_signals_measured']).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// ar-dispatch, outside the sweep because it answers no number
// ---------------------------------------------------------------------------

describe('null-vs-zero — the dispatcher takes no reading', () => {
  /** One claimed unit, as the claim statement projects one. */
  const claim = {
    unit_kind: 'topic',
    unit_id: '5',
    domain_slug: 'rainfall-bulletins',
    next_run_at: CAPTURED_AT,
  };

  it('answers no number of its own over a claim holding none', () => {
    const answered = payloadsOf(run(AR_DISPATCH, 'Plan Dispatch', {
      input: [claim],
    }));

    expect(answered.length).toBe(1);
    expect(numbersAcross(answered)).toEqual([]);
  });

  it('answers one only where the claim it spread carried one', () => {
    const answered = payloadsOf(run(AR_DISPATCH, 'Plan Dispatch', {
      input: [{ ...claim, unit_id: POSTED_PAGE }],
    }));

    expect(numbersAcross(answered).map((site) => site.path))
      .toEqual(['unit_id']);
  });
});

// ---------------------------------------------------------------------------
// The vacuity guard
// ---------------------------------------------------------------------------

describe('null-vs-zero — every Code node in the tree was reached', () => {
  /** Every Code node of every built artifact, by site. */
  const held = BUILT.flatMap(
    (suite) => suite.names.map((node) => siteOf(suite.file, node)),
  );

  it('drives each Code node the built tree holds, and no other', () => {
    for (const planting of PLANTINGS) {
      answersFor(planting);
    }

    expect([...DRIVEN].sort()).toEqual([...held].sort());
  });

  it('has a built tree to be a guard over', () => {
    expect(BUILT.length).toBe(4);
    expect(held.length).toBeGreaterThan(PLANTINGS.length);
    expect(held).not.toContain(siteOf('ar-ingest.json', 'Extract Recordz'));
  });
});
