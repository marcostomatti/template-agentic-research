/**
 * Every Code node `ar-capture` runs, driven offline over the BUILT
 * artifact.
 *
 * Three nodes rather than `ar-ingest`'s eight, and the canvas around
 * them is a request rather than a batch: a webhook fires, a row is
 * stored before anything has judged it, and every node answers
 * exactly one item for the one capture. What runs here is what each
 * of those three nodes makes of what it was handed — which member it
 * reads off which node above, what it refuses, and what it puts on
 * the item it answers.
 *
 * `tests/workflows/code-node.ts` is the harness and its header
 * carries the mechanism: the built body rather than the source,
 * `$input` and `$` supplied by hand, and the two module globals
 * bound rather than rewritten out. What this file adds is the
 * canvas.
 *
 * ## Why the refusals run first, and which two lead
 *
 * This is a boundary, so the ordering law the sibling file states is
 * sharper here. Every node's refusals run before its accepting
 * cases, because an assertion about an accepting path passes over a
 * boundary that never learned to say no.
 *
 * Two of them lead by name. An envelope stating a contract version
 * this service does not accept is refused rather than assumed, and
 * `captureEnvelopeErrors` answers that fault ALONE: the rules the
 * other four members would be judged by are not the rules the client
 * wrote to, so nothing below the version is read at all. A payload
 * that is not an object is the other, and it is the shape every
 * later reading rests on — a boundary that took one for an envelope
 * would hand `Extract Capture Records` a record nothing keyed.
 *
 * ## No refusal names a value it was posted
 *
 * The last claim of each sentence-writing node is that none of its
 * refusals carries anything off the capture. It is checked by
 * re-reading the OUTPUT rather than by reading the templates: each
 * probe plants a value built from a stem assembled at run time, so
 * no module was written against it and it appears nowhere in this
 * file whole, and the collected sentences are scanned for the whole
 * value and for the stem. The first says which member leaked and the
 * second catches a truncated echo the first would miss.
 *
 * Each probe also declares how many faults its payload answers,
 * which is what says the planted value was READ and judged rather
 * than turned away by a bound above the rule under test. The stamp
 * is the member where that bites: it carries a ceiling, and a
 * sentinel longer than it never reaches the shape rule at all, so
 * the planted length is pinned against the exported constant.
 *
 * ## The vacuity guard
 *
 * `DRIVEN` records every node name this file actually ran and the
 * last case holds it against the artifact's own Code-node roster. A
 * fourth Code node landing on this canvas fails here by name, which
 * is what stops "every Code node" from being a claim in a header.
 * `AR_CAPTURE.names` comes off the built artifact, so the roster
 * cannot be satisfied by editing this file.
 *
 * No word in these fixtures is a term, a field or a source any
 * domain would use. The captures are bulletins about rainfall, which
 * is the shared corpus subject and no domain of ours.
 */
import type { CodeNodeContext, CodeNodeItem } from './code-node.js';

import { describe, expect, it } from 'vitest';

import {
  CAPTURE_CONTRACT_VERSION,
  CAPTURE_ENVELOPE_MEMBERS,
  MAX_CAPTURED_AT_LENGTH,
  MAX_PROVENANCE_NAME_LENGTH,
} from '../../src/lib/capture-contract.js';
import {
  MAX_FIELD_NAME_LENGTH,
  RESERVED_FIELD_NAMES,
} from '../../src/lib/parser-config.js';
import {
  CONSECUTIVE_FAILURE_THRESHOLD,
} from '../../src/lib/source-health.js';

import { codeNodes } from './code-node.js';

// ---------------------------------------------------------------------------
// The artifact under test
// ---------------------------------------------------------------------------

/** The built artifact every case below reads a body out of. */
const AR_CAPTURE = codeNodes('ar-capture.json');

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

  return AR_CAPTURE.run(node, context);
}

/**
 * The one item's payload, refusing rather than answering nothing.
 *
 * Every node on this canvas answers exactly one item, so a case
 * reading through an optional chain would report a cardinality fault
 * as an absent member several lines later.
 */
function only(items: readonly CodeNodeItem[]): Record<string, unknown> {
  const item = items[0];

  if (item === undefined || items.length !== 1) {
    throw new Error(
      `[ar-capture] the node answered ${String(items.length)} items `
      + 'where this canvas answers exactly one',
    );
  }

  return item.json;
}

/** Every sentence a `string` or a list of them holds. */
function sentences(...answers: readonly unknown[]): readonly string[] {
  return answers.flatMap((answer) => {
    if (typeof answer === 'string') {
      return [answer];
    }

    return Array.isArray(answer)
      ? answer.filter((one): one is string => typeof one === 'string')
      : [];
  });
}

// ---------------------------------------------------------------------------
// The canvas these cases put around a node
// ---------------------------------------------------------------------------

/** The domain, the source and the row every fixture belongs to. */
const DOMAIN_ID = '3';
const SOURCE_ID = '7';
const DOCUMENT_ID = '50';
const FINDING_ID = '900';

/** A bulletin, long enough to read as a body somebody captured. */
const BULLETIN = 'Rainfall in the northern basin held steady, the gauge '
  + 'at the weir reading four millimetres on five consecutive mornings.';

/** A moment spelled the one way the contract accepts. */
const CAPTURED_AT = '2026-08-30T09:00:00.000Z';

/**
 * The `sources` row `Load Domain Context` projects, snake-keyed.
 *
 * `to_jsonb(s)` over the CTE names the columns, so the members here
 * are the column names and not the camel-cased ones the parse engine
 * reads inside `parser_config`. Both spellings meet in one node and
 * that is inherited rather than chosen.
 */
function sourceRow(
  over: Record<string, unknown> = {},
): Record<string, unknown> {
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
        observed_at: { path: 'seen', type: 'raw' },
      },
    },
    contract: {
      fields: {
        url: { required: true },
        millimetres: { type: 'number' },
      },
    },
    consecutive_failures: 0,
    last_success_at: null,
    last_failure_at: null,
    enabled: true,
    flagged: false,
    ...over,
  };
}

/** What a finding of this invented domain holds. */
const FIELD_CONTRACT = {
  headline: { type: 'string', required: true },
  millimetres: { type: 'number' },
  observed_at: { type: 'datetime' },
};

/** The domain row `Load Domain Context` answers. */
function domainRow(
  settings: unknown = { fieldContract: FIELD_CONTRACT },
): Record<string, unknown> {
  return {
    id: Number(DOMAIN_ID),
    slug: 'rainfall-bulletins',
    name: 'Rainfall bulletins',
    settings,
    feature_version: null,
    embedding_model: null,
  };
}

/** The whole context item, with the members a case overrides. */
function context(
  over: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    source_id: SOURCE_ID,
    domain_id: DOMAIN_ID,
    source: sourceRow(),
    domain: domainRow(),
    personas: [],
    categories: [],
    terms: [],
    criteria: [],
    ...over,
  };
}

/** The body a well-formed capture carries, as the client posts it. */
function capturedBody(
  over: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    link: 'https://bulletins.example.invalid/1',
    text: BULLETIN,
    title: 'steady rain in the northern basin',
    mm: 4,
    seen: CAPTURED_AT,
    ...over,
  };
}

/** The envelope a client posts, with the members a case overrides. */
function envelope(
  over: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    version: CAPTURE_CONTRACT_VERSION,
    sourceId: Number(SOURCE_ID),
    capturedAt: CAPTURED_AT,
    provenance: { agent: 'basin-clipper', page: 1 },
    body: capturedBody(),
    ...over,
  };
}

/** What `Store Raw Capture` answers for a request it could store. */
function stored(
  over: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    domain_id: DOMAIN_ID,
    source_id: SOURCE_ID,
    document_id: DOCUMENT_ID,
    document_stored: true,
    store_error: null,
    ...over,
  };
}

/** What `Record Capture Provenance` answers for an accepted one. */
function recorded(
  over: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    ...stored(),
    contract_version: CAPTURE_CONTRACT_VERSION,
    contract_version_accepted: true,
    envelope_accepted: true,
    parse_error: 'the capture envelope was accepted',
    verdict_recorded: true,
    provenance_recorded: true,
    ...over,
  };
}

/** The accepted envelope as `Judge Capture Envelope` rearranged it. */
function captureRaw(record: unknown): Record<string, unknown> {
  return { capture: { version: CAPTURE_CONTRACT_VERSION }, record };
}

/** `Judge Capture Envelope` over one posted payload. */
function judge(
  posted: unknown,
  over: Record<string, unknown> = {},
): Record<string, unknown> {
  return only(run('Judge Capture Envelope', {
    input: [stored(over)],
    nodes: { 'Capture Webhook': [{ body: posted }] },
  }));
}

/** `Extract Capture Records` over one verdict and one context. */
function extract(
  raw: unknown,
  over: Record<string, unknown> = {},
  verdict: Record<string, unknown> = {},
): Record<string, unknown> {
  return only(run('Extract Capture Records', {
    input: [recorded(verdict)],
    nodes: {
      'Load Domain Context': [context(over)],
      'Judge Capture Envelope': [{ capture_raw: raw }],
    },
  }));
}

/** `Judge Capture Health` over one reading and one source row. */
function health(
  read: Record<string, unknown>,
  over: Record<string, unknown> = {},
): Record<string, unknown> {
  return only(run('Judge Capture Health', {
    input: [{
      domain_id: DOMAIN_ID,
      source_id: SOURCE_ID,
      document_id: DOCUMENT_ID,
      finding_id: FINDING_ID,
    }],
    nodes: {
      'Load Domain Context': [context(over)],
      'Extract Capture Records': [read],
    },
  }));
}

// ---------------------------------------------------------------------------
// The harness, before anything it reports is believed
// ---------------------------------------------------------------------------

describe('ar-capture — the harness discriminates', () => {
  it('refuses a node name the artifact does not carry, by name', () => {
    expect(() => AR_CAPTURE.run('Judge Capture Envelopz', {})).toThrow(
      /holds no Code node named Judge Capture Envelopz/u,
    );
  });

  it('refuses a node the case forgot to supply, by name', () => {
    expect(() => AR_CAPTURE.run('Judge Capture Envelope', {
      input: [stored()],
    })).toThrow(
      /reads \$\('Capture Webhook'\), which this case did not/u,
    );
  });

  it('hands over a body with every marker already resolved', () => {
    const spliced = AR_CAPTURE.body('Extract Capture Records');

    expect(spliced).not.toContain('__INLINE:');
    expect(spliced).toContain('function applyFieldMap');
    expect(spliced).toContain('function markupSelect');
    expect(AR_CAPTURE.body('Judge Capture Envelope'))
      .toContain('function captureEnvelopeErrors');
    expect(AR_CAPTURE.body('Judge Capture Health'))
      .toContain('function sourceHealth');
  });
});

// ---------------------------------------------------------------------------
// Judge Capture Envelope
// ---------------------------------------------------------------------------

describe('ar-capture — Judge Capture Envelope is one request', () => {
  it('refuses a pass that reached it with no item, naming the count', () => {
    expect(() => run('Judge Capture Envelope', {
      input: [],
      nodes: { 'Capture Webhook': [{ body: envelope() }] },
    })).toThrow(/expects one item per request: 0 items reached it/u);
  });

  it('refuses a pass carrying two, naming the count', () => {
    expect(() => run('Judge Capture Envelope', {
      input: [stored(), stored()],
      nodes: { 'Capture Webhook': [{ body: envelope() }] },
    })).toThrow(/expects one item per request: 2 items reached it/u);
  });
});

describe('ar-capture — Judge Capture Envelope refuses a version', () => {
  const unknown = judge(envelope({ version: CAPTURE_CONTRACT_VERSION + 1 }));

  it('refuses a contract version this service does not accept', () => {
    expect(unknown['envelope_accepted']).toBe(false);
    expect(unknown['parse_error'])
      .toBe('the envelope states a contract version this service does '
        + 'not accept');
  });

  it('answers that fault alone, the four members below going unread', () => {
    expect(unknown['capture_faults']).toHaveLength(1);
  });

  it('says so on a member, the short fault list being no clean bill', () => {
    expect(unknown['contract_version_accepted']).toBe(false);
  });

  it('reports the version this service accepts, never the one posted', () => {
    expect(unknown['contract_version']).toBe(CAPTURE_CONTRACT_VERSION);
    expect(String(unknown['parse_error']))
      .not.toContain(String(CAPTURE_CONTRACT_VERSION + 1));
  });

  it('refuses an envelope that states no version at all', () => {
    const silent = judge(envelope({ version: undefined }));

    expect(silent['contract_version_accepted']).toBe(false);
    expect(silent['parse_error'])
      .toBe('the envelope states no contract version');
  });

  it('refuses a version inherited rather than stated by own key', () => {
    const inherited = Object.create({ version: CAPTURE_CONTRACT_VERSION });

    expect(judge(inherited)['contract_version_accepted']).toBe(false);
  });
});

describe('ar-capture — Judge Capture Envelope refuses a shape', () => {
  it('refuses a body that is not an object, before any member', () => {
    const posted = judge('a bulletin posted as bare text');

    expect(posted['envelope_accepted']).toBe(false);
    expect(posted['contract_version_accepted']).toBe(false);
    expect(posted['parse_error'])
      .toBe('the capture envelope is not an object');
    expect(posted['capture_faults']).toHaveLength(1);
  });

  it('refuses a list, which has members and states none of them', () => {
    expect(judge([envelope()])['parse_error'])
      .toBe('the capture envelope is not an object');
  });

  it('refuses a request that carried no payload at all', () => {
    expect(judge(undefined)['parse_error'])
      .toBe('the capture envelope is not an object');
  });

  it('leaves a refused envelope no rearranged note to be read as', () => {
    expect(judge(7)['capture_raw']).toBeNull();
  });
});

describe('ar-capture — Judge Capture Envelope names no posted value', () => {
  /**
   * A stem no module was written against, assembled at run time so
   * that it appears nowhere in this file whole.
   *
   * The version probe is separate because the library short-circuits
   * there: a stated version it does not accept is answered alone,
   * and the three members below would never be read.
   */
  const STEM = ['qp', 'vt', 'jd'].join('');
  const PLANTED = {
    sourceId: `${STEM}-source`,
    capturedAt: `${STEM}-at`,
    provenanceName: `${STEM} note`,
    version: `${STEM}-version`,
  };
  const judged = judge(envelope({
    sourceId: PLANTED.sourceId,
    capturedAt: PLANTED.capturedAt,
    provenance: { [PLANTED.provenanceName]: 'a name it cannot use' },
    body: 7,
  }));
  const versioned = judge(envelope({ version: PLANTED.version }));
  const collected = sentences(
    judged['capture_faults'],
    judged['parse_error'],
    versioned['capture_faults'],
    versioned['parse_error'],
  );

  it('plants a stamp the shape rule reads rather than the bound', () => {
    expect(PLANTED.capturedAt.length).toBeLessThanOrEqual(
      MAX_CAPTURED_AT_LENGTH,
    );
    expect(PLANTED.provenanceName.length).toBeLessThanOrEqual(
      MAX_PROVENANCE_NAME_LENGTH,
    );
  });

  it('answers a fault for every member the planted envelope breaks', () => {
    expect(judged['capture_faults']).toHaveLength(4);
    expect(versioned['capture_faults']).toHaveLength(1);
  });

  it('finds a planted value, and a truncated one, when present', () => {
    const leaked = [`the envelope names ${PLANTED.sourceId}`];

    expect(sentences(leaked)).toContain(leaked[0]);
    expect(sentences(leaked).join(' ')).toContain(PLANTED.sourceId);
    expect(sentences(leaked).join(' ')).toContain(STEM);
  });

  it('quotes no planted value and no part of one', () => {
    const joined = collected.join(' ');

    for (const value of Object.values(PLANTED)) {
      expect(joined).not.toContain(value);
    }

    expect(joined).not.toContain(STEM);
  });

  it('names the member family and the rule it broke instead', () => {
    expect(collected).toContain(
      'the envelope names a source that is not a positive integer',
    );
    expect(collected).toContain(
      'the envelope carries a captured-at stamp that is not a UTC instant',
    );
    expect(collected).toContain(
      'the envelope records a provenance member whose name the contract '
      + 'cannot use',
    );
  });

  it('has sentences to have read, so the scan is not over nothing', () => {
    expect(collected.length).toBeGreaterThan(0);
  });
});

describe('ar-capture — Judge Capture Envelope accepts an envelope', () => {
  const posted = envelope();
  const accepted = judge(posted);

  it('accepts one the contract describes, with no fault at all', () => {
    expect(accepted['envelope_accepted']).toBe(true);
    expect(accepted['contract_version_accepted']).toBe(true);
    expect(accepted['capture_faults']).toEqual([]);
  });

  it('replaces the stored note rather than adding to it', () => {
    expect(accepted['parse_error'])
      .toBe('the capture envelope was accepted and nothing has extracted '
        + 'from it since');
  });

  it('rearranges the envelope into a note and the body it framed', () => {
    expect(accepted['capture_raw']).toEqual({
      capture: {
        version: CAPTURE_CONTRACT_VERSION,
        sourceId: Number(SOURCE_ID),
        capturedAt: CAPTURED_AT,
        provenance: { agent: 'basin-clipper', page: 1 },
      },
      record: posted['body'],
    });
  });

  it('builds the note off the declared members, less the body', () => {
    const raw = accepted['capture_raw'] as { capture: object };

    expect(Object.keys(raw.capture).sort())
      .toEqual([...CAPTURE_ENVELOPE_MEMBERS]
        .filter((member) => member !== 'body')
        .sort());
  });

  it('carries the store verdict through whatever it decided', () => {
    const missing = judge(envelope(), {
      document_id: null,
      document_stored: false,
      store_error: 'the request named no source row this deployment holds',
    });

    expect(missing['envelope_accepted']).toBe(true);
    expect(missing['document_id']).toBeNull();
    expect(missing['store_error'])
      .toBe('the request named no source row this deployment holds');
  });

  it(
    'answers the store verdict, the boundary and the note, and no more',
    () => {
      expect(Object.keys(accepted).sort()).toEqual([
        'capture_faults', 'capture_raw', 'contract_version',
        'contract_version_accepted', 'document_id', 'document_stored',
        'domain_id', 'envelope_accepted', 'parse_error', 'source_id',
        'store_error',
      ]);
    },
  );
});

// ---------------------------------------------------------------------------
// Extract Capture Records
// ---------------------------------------------------------------------------

describe('ar-capture — Extract Capture Records is one request', () => {
  it('refuses a pass that reached it with no item, naming the count', () => {
    expect(() => run('Extract Capture Records', {
      input: [],
      nodes: {
        'Load Domain Context': [context()],
        'Judge Capture Envelope': [{ capture_raw: null }],
      },
    })).toThrow(/expects one item per request: 0 items reached it/u);
  });

  it('refuses a pass carrying two, naming the count', () => {
    expect(() => run('Extract Capture Records', {
      input: [recorded(), recorded()],
      nodes: {
        'Load Domain Context': [context()],
        'Judge Capture Envelope': [{ capture_raw: null }],
      },
    })).toThrow(/expects one item per request: 2 items reached it/u);
  });
});

describe('ar-capture — Extract Capture Records reads what it may', () => {
  it('reads nothing for an envelope the boundary turned away', () => {
    const refused = extract(null, {}, {
      envelope_accepted: false,
      parse_error: 'the capture envelope is not an object',
    });

    expect(refused['parse_status']).toBeNull();
    expect(refused['parse_error']).toBeNull();
    expect(refused['record']).toBeNull();
  });

  it('re-reports none of the refusals a group above recorded', () => {
    const refused = extract(null, {}, { envelope_accepted: false });

    expect(refused['config_errors']).toEqual([]);
    expect(refused['finding_refusal']).toBeNull();
    expect(refused['envelope_accepted']).toBe(false);
  });

  it('reads nothing for a request there was no row to write', () => {
    const nowhere = extract(captureRaw(capturedBody()), {}, {
      document_id: null,
      document_stored: false,
      store_error: 'the request carried no body to store',
    });

    expect(nowhere['parse_status']).toBeNull();
    expect(nowhere['record']).toBeNull();
  });

  it('reads nothing for a source id this deployment does not hold', () => {
    const unknown = extract(captureRaw(capturedBody()), { source: null });

    expect(unknown['parse_status']).toBeNull();
    expect(unknown['record']).toBeNull();
  });

  it('reads nothing for an accepted envelope carrying no record', () => {
    expect(extract(null)['parse_status']).toBeNull();
  });
});

describe('ar-capture — Extract Capture Records refuses a config', () => {
  const unreadable = extract(captureRaw(capturedBody()), {
    source: sourceRow({ parser_config: { fields: {} } }),
  });

  it('fails the row with a constant, the faults travelling beside it', () => {
    expect(unreadable['parse_status']).toBe('failed');
    expect(unreadable['parse_error'])
      .toBe('the parser config of this source could not be read, so '
        + 'nothing was extracted from the capture');
  });

  it('carries the faults an operator has to go and fix', () => {
    expect(unreadable['config_errors']).not.toEqual([]);
  });

  it('reads no field at all rather than the well-formed subset', () => {
    const partial = extract(captureRaw(capturedBody()), {
      source: sourceRow({
        parser_config: {
          fields: {
            url: { path: 'link' },
            millimetres: { path: 'mm', type: 'a type nobody declared' },
          },
        },
      }),
    });

    expect(partial['record']).toBeNull();
    expect(partial['config_errors']).not.toEqual([]);
  });

  it('warns where a records path reaches nothing in the body', () => {
    const missed = extract(captureRaw({ elsewhere: capturedBody() }), {
      source: sourceRow({
        parser_config: {
          recordsPath: 'nowhere',
          fields: { url: { path: 'link' } },
        },
      }),
    });

    expect(missed['warnings'])
      .toContain('the records path reached nothing in the captured body');
    expect(missed['parse_status']).toBe('failed');
  });
});

describe('ar-capture — Extract Capture Records refuses a finding', () => {
  /** The reading below is one the source contract accepts throughout. */
  function refusal(settings: unknown): string {
    return String(extract(captureRaw(capturedBody()), {
      domain: domainRow(settings),
    })['finding_refusal']);
  }

  it('refuses where the domain declares no field contract at all', () => {
    expect(refusal({}))
      .toBe('the settings of this domain declare no field contract, so '
        + 'nothing states what a finding of it holds');
  });

  it('refuses a field contract that is not keyed by field name', () => {
    expect(refusal({ fieldContract: ['headline'] }))
      .toBe('the field contract of this domain states something other '
        + 'than an object keyed by field name');
  });

  it('refuses a field contract that names no field', () => {
    expect(refusal({ fieldContract: {} }))
      .toBe('the field contract of this domain names no field, so every '
        + 'finding of it would hold nothing');
  });

  it('refuses a type outside the closed set, naming the set', () => {
    const named = refusal({ fieldContract: { headline: { type: 'text' } } });

    expect(named).toContain('field 0 of the field contract of this domain');
    expect(named)
      .toContain('string, boolean, number, datetime, list, object');
  });

  it('refuses a required that is not a boolean', () => {
    expect(refusal({
      fieldContract: { headline: { type: 'string', required: 'yes' } },
    })).toContain('states a required that is not a boolean');
  });

  it('refuses a name past the bound the splice already declares', () => {
    expect(refusal({
      fieldContract: { ['a'.repeat(MAX_FIELD_NAME_LENGTH + 1)]: {
        type: 'string',
      } },
    })).toContain(`longer than ${String(MAX_FIELD_NAME_LENGTH)} characters`);
  });

  it('refuses a reserved name a reader would take off a prototype', () => {
    const literal = { __proto__: { type: 'string' } };
    const parsed: unknown = JSON.parse('{"__proto__":{"type":"string"}}');

    expect(Object.hasOwn(literal, '__proto__')).toBe(false);
    expect(Object.hasOwn(parsed as object, '__proto__')).toBe(true);
    expect(refusal({ fieldContract: parsed }))
      .toContain(RESERVED_FIELD_NAMES.join(', '));
  });

  it('refuses a required field the reading states nothing for', () => {
    expect(String(extract(captureRaw(capturedBody({ title: null })))[
      'finding_refusal'
    ])).toBe('field headline is required and the reading states none');
  });

  it('refuses a stamp the pattern accepts and the calendar does not', () => {
    const rolled = extract(captureRaw(capturedBody({
      seen: '2026-02-30T00:00:00.000Z',
    })));

    expect(rolled['finding_refusal'])
      .toBe('field observed_at is not the declared type: datetime');
  });

  it('leaves the reading standing, the source contract having passed', () => {
    const rolled = extract(captureRaw(capturedBody({
      seen: '2026-02-30T00:00:00.000Z',
    })));

    expect(rolled['parse_status']).toBe('ok');
    expect(rolled['finding_fields']).toBeNull();
  });
});

describe('ar-capture — Extract Capture Records names no posted value', () => {
  /**
   * The same stem the boundary probe plants, read at the other end
   * of the canvas: these values arrive inside the body rather than
   * on the envelope, and they reach the two contracts.
   *
   * The reading is asserted to CARRY them, which is what says each
   * one was read and judged rather than dropped before the rule.
   */
  const STEM = ['qp', 'vt', 'jd'].join('');
  const PLANTED = {
    mm: `${STEM}-mm`,
    seen: `${STEM}-seen`,
  };
  const read = extract(captureRaw(capturedBody(PLANTED)));
  const collected = sentences(
    read['config_errors'],
    read['warnings'],
    read['parse_error'],
    read['finding_refusal'],
  );

  it('answers a fault for every rule the planted body breaks', () => {
    expect(sentences(read['parse_error'])).toHaveLength(1);
    expect(String(read['finding_refusal']).split('; ')).toHaveLength(2);
  });

  it('carries the planted values into the reading it made', () => {
    expect(read['record']).toMatchObject({
      millimetres: PLANTED.mm,
      observed_at: PLANTED.seen,
    });
  });

  it('finds a planted value, and a truncated one, when present', () => {
    const leaked = [`member millimetres holds ${PLANTED.mm}`];

    expect(sentences(leaked).join(' ')).toContain(PLANTED.mm);
    expect(sentences(leaked).join(' ')).toContain(STEM);
  });

  it('quotes no planted value and no part of one', () => {
    const joined = collected.join(' ');

    for (const value of Object.values(PLANTED)) {
      expect(joined).not.toContain(value);
    }

    expect(joined).not.toContain(STEM);
  });

  it('names the member and the rule it broke instead', () => {
    const joined = collected.join(' ');

    expect(joined).toContain(
      'member millimetres was not read as the declared type: number',
    );
    expect(joined).toContain(
      'field millimetres is not the declared type: number',
    );
    expect(joined).toContain(
      'field observed_at is not the declared type: datetime',
    );
  });

  it('has sentences to have read, so the scan is not over nothing', () => {
    expect(collected.length).toBeGreaterThan(0);
  });
});

describe('ar-capture — Extract Capture Records judges a reading', () => {
  const read = extract(captureRaw(capturedBody()));

  it('accepts a reading the source contract describes', () => {
    expect(read['parse_status']).toBe('ok');
    expect(read['parse_error']).toBeNull();
    expect(read['warnings']).toEqual([]);
  });

  it('reads every field the map names, and no other', () => {
    expect(read['record']).toEqual({
      url: 'https://bulletins.example.invalid/1',
      body: BULLETIN,
      headline: 'steady rain in the northern basin',
      millimetres: 4,
      observed_at: CAPTURED_AT,
    });
  });

  it('fails a divergence, naming the member and the rule', () => {
    const diverged = extract(captureRaw(capturedBody({ mm: 'four' })));

    expect(diverged['parse_status']).toBe('failed');
    expect(diverged['parse_error'])
      .toBe('member millimetres was not read as the declared type: number');
  });

  it('keeps the reading a diverging capture produced', () => {
    const diverged = extract(captureRaw(capturedBody({ mm: 'four' })));

    expect(diverged['record']).toMatchObject({ millimetres: 'four' });
  });

  it('takes the record out at the path the config names, once', () => {
    const nested = extract(captureRaw({ inner: capturedBody() }), {
      source: sourceRow({
        parser_config: {
          recordsPath: 'inner',
          fields: { url: { path: 'link' }, body: { path: 'text' } },
        },
      }),
    });

    expect(nested['parse_status']).toBe('ok');
    expect(nested['record'])
      .toMatchObject({ url: 'https://bulletins.example.invalid/1' });
  });

  it('reads a whole captured document through a selector', () => {
    const page = extract(captureRaw('<article>rain fell</article>'), {
      source: sourceRow({
        parser_config: { fields: { body: { selector: 'article' } } },
        contract: { fields: { body: { required: true } } },
      }),
    });

    expect(page['parse_status']).toBe('ok');
    expect(page['record']).toEqual({ body: 'rain fell' });
  });

  it('stores the members the domain named, and no others', () => {
    expect(read['finding_fields']).toEqual({
      headline: 'steady rain in the northern basin',
      millimetres: 4,
      observed_at: CAPTURED_AT,
    });
    expect(read['finding_refusal']).toBeNull();
  });

  it('keeps a measured zero, which is not a field left out', () => {
    const dry = extract(captureRaw(capturedBody({ mm: 0 })));

    expect(dry['finding_fields']).toMatchObject({ millimetres: 0 });
  });

  it('reads an optional field the capture left out as absent', () => {
    const spare = extract(captureRaw(capturedBody({ mm: null })));

    expect(spare['finding_fields']).toEqual({
      headline: 'steady rain in the northern basin',
      observed_at: CAPTURED_AT,
    });
  });

  it(
    'carries the boundary verdict and the two readings, and no more',
    () => {
      expect(Object.keys(read).sort()).toEqual([
        'config_errors', 'contract_version', 'contract_version_accepted',
        'document_id', 'document_stored', 'domain_id', 'envelope_accepted',
        'finding_fields', 'finding_refusal', 'parse_error', 'parse_status',
        'record', 'source_id', 'store_error', 'warnings',
      ]);
    },
  );
});

// ---------------------------------------------------------------------------
// Judge Capture Health
// ---------------------------------------------------------------------------

/** A reading as `Extract Capture Records` answers one. */
function reading(
  over: Record<string, unknown> = {},
): Record<string, unknown> {
  return { parse_status: 'ok', ...over };
}

describe('ar-capture — Judge Capture Health is one request', () => {
  it('refuses a pass that reached it with no item, naming the count', () => {
    expect(() => run('Judge Capture Health', {
      input: [],
      nodes: {
        'Load Domain Context': [context()],
        'Extract Capture Records': [reading()],
      },
    })).toThrow(/expects one item per request: 0 items reached it/u);
  });

  it('refuses a pass carrying two, naming the count', () => {
    expect(() => run('Judge Capture Health', {
      input: [{ document_id: DOCUMENT_ID }, { document_id: DOCUMENT_ID }],
      nodes: {
        'Load Domain Context': [context()],
        'Extract Capture Records': [reading()],
      },
    })).toThrow(/expects one item per request: 2 items reached it/u);
  });
});

describe('ar-capture — Judge Capture Health judges what it can', () => {
  it('judges nothing where the request named no source row', () => {
    const unjudged = health(reading(), { source: null });

    expect(unjudged['source_judged']).toBe(false);
    expect(unjudged['consecutive_failures']).toBeNull();
    expect(unjudged['last_success_at']).toBeNull();
    expect(unjudged['last_failure_at']).toBeNull();
    expect(unjudged['flagged']).toBeNull();
  });

  it('still answers one item, the ids travelling on it', () => {
    const unjudged = health(reading(), { source: null });

    expect(unjudged['document_id']).toBe(DOCUMENT_ID);
    expect(unjudged['finding_id']).toBe(FINDING_ID);
  });

  it('counts a capture the source contract refused as a failure', () => {
    const failed = health(reading({ parse_status: 'failed' }));

    expect(failed['consecutive_failures']).toBe(1);
    expect(failed['last_failure_at']).not.toBeNull();
    expect(failed['last_success_at']).toBeNull();
  });

  it('counts a capture nothing could be read for as a failure', () => {
    expect(health(reading({ parse_status: null }))['consecutive_failures'])
      .toBe(1);
  });

  it('raises the flag on the pass that crosses the threshold', () => {
    const crossed = health(reading({ parse_status: 'failed' }), {
      source: sourceRow({
        consecutive_failures: CONSECUTIVE_FAILURE_THRESHOLD - 1,
      }),
    });

    expect(crossed['consecutive_failures'])
      .toBe(CONSECUTIVE_FAILURE_THRESHOLD);
    expect(crossed['flagged']).toBe(true);
  });

  it('leaves the flag down the pass before it', () => {
    const under = health(reading({ parse_status: 'failed' }), {
      source: sourceRow({
        consecutive_failures: CONSECUTIVE_FAILURE_THRESHOLD - 2,
      }),
    });

    expect(under['flagged']).toBe(false);
  });

  it('resets the counter to a measured zero on a capture it read', () => {
    const succeeded = health(reading(), {
      source: sourceRow({ consecutive_failures: 3 }),
    });

    expect(succeeded['consecutive_failures']).toBe(0);
    expect(succeeded['last_success_at']).not.toBeNull();
    expect(succeeded['last_failure_at']).toBeNull();
  });

  it('normalises a moment the driver handed back as a Date', () => {
    const carried = health(reading({ parse_status: 'failed' }), {
      source: sourceRow({
        last_success_at: new Date('2026-01-02T03:04:05.000Z'),
      }),
    });

    expect(carried['last_success_at']).toBe('2026-01-02T03:04:05.000Z');
  });

  it('writes the moment of this pass into the stamp that moved', () => {
    const succeeded = health(reading());

    expect(String(succeeded['last_success_at']))
      .toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u);
  });

  it('answers four columns and four ids, and no sentence at all', () => {
    expect(Object.keys(health(reading())).sort()).toEqual([
      'consecutive_failures', 'document_id', 'domain_id', 'finding_id',
      'flagged', 'last_failure_at', 'last_success_at', 'source_id',
      'source_judged',
    ]);
  });

  it('holds no member a posted value could be rendered into', () => {
    const judged = health(reading({ parse_status: 'failed' }));

    for (const value of Object.values(judged)) {
      expect(typeof value === 'string' && value.length > 32).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// The vacuity guard
// ---------------------------------------------------------------------------

describe('ar-capture — every Code node on the canvas was driven', () => {
  it('runs each Code node the built artifact holds, and no other', () => {
    expect([...DRIVEN].sort()).toEqual([...AR_CAPTURE.names].sort());
  });

  it('has a canvas to be a guard over', () => {
    expect(AR_CAPTURE.names.length).toBeGreaterThan(0);
    expect(AR_CAPTURE.names).not.toContain('Judge Capture Envelopz');
  });
});
