/**
 * Cases for `src/sources/push-capture.ts`.
 *
 * The seam every adapter's cases rest on is the contract's own —
 * `parse` and `toCanonical` are pure, so both are driven over a
 * payload read off disk — and for this adapter it is not a seam at
 * all but the ordinary path. A push source is the case where the
 * stored payload IS the source, so the fixture beside this file is
 * what a client really posts rather than a recording of a request.
 *
 * That makes the no-I/O claim broader here than it is next door and
 * therefore worth measuring rather than asserting from the absence
 * of a transport parameter. {@link networked} records every call to
 * the global transport while these cases run, one case drives all
 * three members and asserts the record is empty, and the same case
 * reaches the stub itself afterwards — so the empty reading is a
 * measurement rather than a matcher nobody proved.
 *
 * House order: what the adapter refuses first — an envelope the
 * contract will not accept, a config the engine will not read — then
 * the extraction those refusals bound, then the canonical mapping
 * and the digest it rests on, then the member that would have opened
 * a socket.
 */
import type { CanonicalDocument } from './index.js';
import type { PushCaptureRaw, PushCaptureRecord } from './push-capture.js';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  CAPTURE_ENVELOPE_MEMBERS,
  captureEnvelopeErrors,
} from '../lib/capture-contract.js';

import {
  BODY_FIELD as LISTING_BODY_FIELD,
  URL_FIELD as LISTING_URL_FIELD,
  createListingApi,
  refusingTransport,
} from './listing-api.js';
import {
  BODY_FIELD,
  PUSH_CAPTURE_DECLARATION,
  URL_FIELD,
  createPushCapture,
} from './push-capture.js';

/**
 * The stored capture these cases drive `parse` over.
 *
 * Resolved from this file's own location rather than from the
 * working directory: the suite is launched from the package and from
 * the repository root alike, and only one of those makes a relative
 * path name it.
 */
const PAYLOAD_PATH = fileURLToPath(
  new URL('./push-capture-payload.json', import.meta.url),
);

/**
 * What that file records, as `fetch` would have returned it.
 *
 * The fixture is an envelope around an envelope: the file's own
 * `payload` key holds the capture, and a header written into the
 * capture would reach `parse` as though a client had posted it.
 *
 * The capture is checked against the contract rather than member by
 * member, which is the check this fixture can actually earn — the
 * adapter refuses an envelope the contract refuses, so a fixture
 * edited into one would otherwise be reported as the adapter reading
 * nothing rather than as the fixture being wrong.
 *
 * @returns The capture the fixture stores.
 * @throws Error When the file no longer holds one the contract
 * accepts, naming the file.
 */
function storedCapture(): unknown {
  const stored: unknown = JSON.parse(readFileSync(PAYLOAD_PATH, 'utf8'));

  if (typeof stored !== 'object' || stored === null) {
    throw new Error(`${PAYLOAD_PATH} does not hold a JSON object`);
  }

  if (!('payload' in stored)) {
    throw new Error(`${PAYLOAD_PATH} holds no payload key`);
  }

  const faults = captureEnvelopeErrors(stored.payload);

  if (faults.length > 0) {
    throw new Error(`${PAYLOAD_PATH} holds no capture the contract accepts`);
  }

  return stored.payload;
}

/**
 * The `parser_config` the fixture is read under.
 *
 * Built fresh per call rather than held at module scope, so a case
 * that reshapes one cannot reach the next.
 *
 * @returns A config the engine accepts, over the fixture's shape.
 */
function storedConfig(): unknown {
  return {
    recordsPath: 'items',
    fields: {
      [URL_FIELD]: { path: 'url' },
      [BODY_FIELD]: { path: 'markup', selector: 'article' },
      title: { path: 'title' },
    },
  };
}

/**
 * The `sources` row the cases construct the adapter for.
 *
 * Deliberately NOT the id the fixture's envelope claims. The column
 * is taken from the construction and the claim is recorded as
 * evidence, and a case cannot tell those apart while the two agree.
 */
const CONSTRUCTED_SOURCE_ID = 7;

/** What the fixture's envelope claims its source row is. */
const CLAIMED_SOURCE_ID = 41;

/**
 * A capture the contract accepts, built from parts.
 *
 * @param body - What the capture carries.
 * @returns The envelope, ready to be posted.
 */
function envelopeAround(body: unknown): Record<string, unknown> {
  return {
    version: 1,
    sourceId: CLAIMED_SOURCE_ID,
    capturedAt: '2026-01-02T03:04:05Z',
    provenance: { client: 'case' },
    body,
  };
}

/**
 * Every argument the global transport was called with, in call
 * order.
 *
 * Reassigned rather than emptied in {@link beforeEach}, so a case
 * holding a reference to a previous run cannot watch it change under
 * itself.
 */
let networked: unknown[][] = [];

/** What the stubbed global transport throws with. */
const NETWORK_REFUSAL = 'the case network stub was reached';

/** The real global transport, put back after every case. */
const realFetch = globalThis.fetch;

beforeEach(() => {
  networked = [];
  globalThis.fetch = ((...args: unknown[]): never => {
    networked.push(args);

    throw new Error(NETWORK_REFUSAL);
  }) as unknown as typeof globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('push-capture — what it says it is', () => {
  // The two members the registry reads, and the two field-map names
  // the canonical mapping reads. Written out rather than derived: a
  // case computing either from the module it is checking would agree
  // with any edit to it.
  it('carries the id and the kind it is registered under', () => {
    const adapter = createPushCapture({
      envelope: storedCapture(),
      parserConfig: storedConfig(),
      sourceId: CONSTRUCTED_SOURCE_ID,
    });

    expect({ id: adapter.id, kind: adapter.kind })
      .toStrictEqual({ id: 'push-capture', kind: 'push' });
  });

  // The convention belongs to whoever writes a `parser_config`, not
  // to either adapter, and both declare it rather than importing it
  // from the other. This is what stops the two copies drifting.
  it(
    'spells the two documents members the way the other adapter does',
    () => {
      expect([URL_FIELD, BODY_FIELD])
        .toEqual([LISTING_URL_FIELD, LISTING_BODY_FIELD]);
    },
  );

  // Both construction-time answers over a capture and a row that are
  // both usable. The control for every refusal case below: without
  // it, a module answering a fault for everything would satisfy all
  // of them.
  it('reports nothing wrong with the stored capture or its config', () => {
    const adapter = createPushCapture({
      envelope: storedCapture(),
      parserConfig: storedConfig(),
      sourceId: CONSTRUCTED_SOURCE_ID,
    });

    expect(adapter.envelopeErrors).toEqual([]);
    expect(adapter.configErrors).toEqual([]);
  });
});

describe('push-capture — an envelope the contract refuses', () => {
  it('reports a capture that is not an object', () => {
    const adapter = createPushCapture({
      envelope: 'posted as text',
      parserConfig: storedConfig(),
      sourceId: CONSTRUCTED_SOURCE_ID,
    });

    expect(adapter.envelopeErrors).toEqual([
      'the capture envelope is not an object',
    ]);
  });

  // An unknown version answers alone, and that is the contract's own
  // rule rather than this adapter's: the other members would be
  // judged by rules the client did not write to. Asserted as the
  // whole list, so a version fault reported beside four others fails.
  it('reports an unknown contract version, and nothing else', () => {
    const envelope = { ...envelopeAround('text'), version: 99 };
    const adapter = createPushCapture({
      envelope,
      parserConfig: storedConfig(),
      sourceId: CONSTRUCTED_SOURCE_ID,
    });

    expect(adapter.envelopeErrors).toEqual([
      'the envelope states a contract version this service does not accept',
    ]);
  });

  // A refused envelope reads nothing at all, whatever its body
  // carried. The body here is exactly the shape the config reads, so
  // the empty answer is the refusal rather than a body nothing could
  // be taken out of.
  it('reads nothing from a refused capture, whatever its body held', () => {
    const envelope = { ...envelopeAround({ items: [{ title: 'one' }] }) };
    const adapter = createPushCapture({
      envelope,
      parserConfig: storedConfig(),
      sourceId: CONSTRUCTED_SOURCE_ID,
    });

    expect(adapter.parse(envelope)).toHaveLength(1);
    expect(adapter.parse({ ...envelope, version: 99 })).toEqual([]);
  });

  // `parse` judges what it was HANDED and not what was bound, which
  // is what keeps it a function of its argument and keeps the
  // stored-payload seam honest. Both directions in one case: a good
  // construction cannot rescue a refused argument, and a refused
  // construction cannot spoil a good one.
  it('judges the capture it was handed rather than the one bound', () => {
    const good = envelopeAround({ items: [{ title: 'one' }] });
    const fromGood = createPushCapture({
      envelope: good,
      parserConfig: storedConfig(),
      sourceId: CONSTRUCTED_SOURCE_ID,
    });
    const fromBad = createPushCapture({
      envelope: 'posted as text',
      parserConfig: storedConfig(),
      sourceId: CONSTRUCTED_SOURCE_ID,
    });

    expect(fromGood.parse('posted as text')).toEqual([]);
    expect(fromBad.parse(good)).toHaveLength(1);
    expect(fromBad.envelopeErrors).toHaveLength(1);
  });

  // The no-echo rule, read off the OUTPUT rather than off the
  // template that produced it — this is the member `ar-capture`
  // writes into `documents.parse_error`, so it is the place a leaked
  // value would land. The stem is assembled at run time, so no module
  // was written against it and it appears nowhere in this file whole.
  it('names the member and the rule, never the value that broke it', () => {
    const stem = ['zq', 'wv', 'xk'].join('');
    const envelope = {
      version: 1,
      sourceId: `${stem}-source`,
      capturedAt: `${stem}-stamp`,
      provenance: { [`${stem}_name`]: { nested: `${stem}-value` } },
      body: 42,
    };
    const adapter = createPushCapture({
      envelope,
      parserConfig: storedConfig(),
      sourceId: CONSTRUCTED_SOURCE_ID,
    });
    const sentences = adapter.envelopeErrors;

    // What the payload answers, declared — so the scan below is over
    // sentences the boundary produced by READING those values rather
    // than over an empty list.
    expect(sentences).toEqual([
      'the envelope names a source that is not a positive integer',
      'the envelope carries a captured-at stamp that is not a UTC instant',
      'the envelope records a provenance member that is not a scalar',
      'the envelope carries a body that is neither text nor a keyed value',
    ]);
    expect(sentences.filter((line) => line.includes(stem))).toEqual([]);
  });
});

describe('push-capture — a config the engine refuses', () => {
  it('reports a config that is not an object', () => {
    const adapter = createPushCapture({
      envelope: storedCapture(),
      parserConfig: 'a config as text',
      sourceId: CONSTRUCTED_SOURCE_ID,
    });

    expect(adapter.configErrors).toEqual([
      'the parser config is not an object',
    ]);
  });

  // The keep half of fail-flag-keep, in the adapter. A refused config
  // reads no field at all, and every record still arrives with its
  // evidence — so the documents written while somebody fixes the row
  // are what that person reads while fixing it.
  it('keeps every record a refused config read nothing out of', () => {
    const items = [{ title: 'one' }, { title: 'two' }];
    const envelope = envelopeAround(items);
    const adapter = createPushCapture({
      envelope,
      parserConfig: { fields: {} },
      sourceId: CONSTRUCTED_SOURCE_ID,
    });
    const records = adapter.parse(envelope);

    expect(adapter.configErrors).toEqual([
      'the field map declares no field',
    ]);
    expect(records.map((record) => ({ ...record.fields })))
      .toEqual([{}, {}]);
    expect(records.map((record) => record.raw)).toEqual(items);
  });
});

describe('push-capture — the stored capture, extracted', () => {
  it('reads one record per entry the body carries', () => {
    const capture = storedCapture();
    const adapter = createPushCapture({
      envelope: capture,
      parserConfig: storedConfig(),
      sourceId: CONSTRUCTED_SOURCE_ID,
    });

    expect(adapter.parse(capture)).toHaveLength(2);
  });

  // The markup step, both halves of it. The matcher found the
  // fragment the selector named and the reduction turned it into the
  // plain text a `documents.body` holds — the collapsed run of
  // spaces in the fixture is what says the second half ran.
  it('reads a member through the markup step, matched and reduced', () => {
    const capture = storedCapture();
    const adapter = createPushCapture({
      envelope: capture,
      parserConfig: storedConfig(),
      sourceId: CONSTRUCTED_SOURCE_ID,
    });
    const [first] = adapter.parse(capture);

    expect(first?.fields[BODY_FIELD]).toBe('The margin marks run in pairs.');
  });

  // Per record rather than per capture, which is the grain a reader
  // needs. The fixture's second record carries no markup member, so
  // the selector step has nothing to select over and says so on that
  // document alone.
  it('warns per record about a step it could not take', () => {
    const capture = storedCapture();
    const adapter = createPushCapture({
      envelope: capture,
      parserConfig: storedConfig(),
      sourceId: CONSTRUCTED_SOURCE_ID,
    });
    const records = adapter.parse(capture);

    expect(records.map((record) => record.warnings.length)).toEqual([0, 1]);
    expect(records[1]?.warnings[0]).toContain(BODY_FIELD);
  });

  // The note travels on the record, so one envelope becoming several
  // documents leaves every one of them able to say how it was taken.
  // Its members are the envelope's minus the body, derived from the
  // contract's own tuple rather than written out here.
  it('carries the capture note beside every record', () => {
    const capture = storedCapture();
    const adapter = createPushCapture({
      envelope: capture,
      parserConfig: storedConfig(),
      sourceId: CONSTRUCTED_SOURCE_ID,
    });
    const records = adapter.parse(capture);
    const expected = CAPTURE_ENVELOPE_MEMBERS
      .filter((member) => member !== 'body');

    expect(records.map((record) => Object.keys(record.capture).sort()))
      .toEqual(records.map(() => [...expected].sort()));
    expect(records.map((record) => record.capture['sourceId']))
      .toEqual([CLAIMED_SOURCE_ID, CLAIMED_SOURCE_ID]);
  });

  // A records path the body does not carry reads no record, rather
  // than one record made of nothing. The capture is accepted and the
  // config is usable, so the empty answer is the path alone.
  it('answers no reading for a records path the body does not carry', () => {
    const envelope = envelopeAround({ items: [{ title: 'one' }] });
    const adapter = createPushCapture({
      envelope,
      parserConfig: {
        recordsPath: 'entries',
        fields: { title: { path: 'title' } },
      },
      sourceId: CONSTRUCTED_SOURCE_ID,
    });

    expect(adapter.envelopeErrors).toEqual([]);
    expect(adapter.configErrors).toEqual([]);
    expect(adapter.parse(envelope)).toEqual([]);
  });

  // The contract admits text, a keyed value, or a list of them, and
  // all three have to arrive here as records. A text body is one
  // record read by rules that state no path, which is how a captured
  // page of markup is extracted.
  it('reads a text body as one record, under rules with no path', () => {
    const envelope = envelopeAround('<article>a captured page</article>');
    const adapter = createPushCapture({
      envelope,
      parserConfig: { fields: { [BODY_FIELD]: { selector: 'article' } } },
      sourceId: CONSTRUCTED_SOURCE_ID,
    });
    const records = adapter.parse(envelope);

    expect(records.map((record) => ({ ...record.fields })))
      .toEqual([{ [BODY_FIELD]: 'a captured page' }]);
  });

  // A keyed body with no records path is one record too, so the
  // three body shapes the contract admits differ in how many
  // documents they become and in nothing else.
  it('reads a keyed body with no records path as one record', () => {
    const envelope = envelopeAround({ title: 'one' });
    const adapter = createPushCapture({
      envelope,
      parserConfig: { fields: { title: { path: 'title' } } },
      sourceId: CONSTRUCTED_SOURCE_ID,
    });

    expect(adapter.parse(envelope).map((record) => ({ ...record.fields })))
      .toEqual([{ title: 'one' }]);
  });
});

describe('push-capture — the canonical document', () => {
  /**
   * The documents the stored capture becomes.
   *
   * @returns One canonical document per record the fixture carries.
   */
  function storedDocuments(): CanonicalDocument[] {
    const capture = storedCapture();
    const adapter = createPushCapture({
      envelope: capture,
      parserConfig: storedConfig(),
      sourceId: CONSTRUCTED_SOURCE_ID,
    });

    return adapter.parse(capture)
      .map((record) => adapter.toCanonical(record));
  }

  // Every member of the shape, and no other: a document carrying a
  // sixth member would be a column somebody eventually writes.
  it('produces the five members a documents row takes', () => {
    const [first] = storedDocuments();

    expect(Object.keys(first ?? {}).sort())
      .toEqual(['body', 'hash', 'raw', 'sourceId', 'url']);
    expect(first?.url).toBe('https://library.example.invalid/notes/7');
    expect(first?.body).toBe('The margin marks run in pairs.');
  });

  // What a stored row answers both of a reader's questions with: the
  // entry this document was read from, and how the client says the
  // capture was taken. The record is the entry verbatim rather than
  // the reading, which is what makes a shape change discoverable.
  it('writes the record and its capture note into raw', () => {
    const [first] = storedDocuments();
    const raw = first?.raw as PushCaptureRaw;

    expect(Object.keys(raw).sort()).toEqual(['capture', 'record']);
    expect(raw.record).toEqual({
      url: 'https://library.example.invalid/notes/7',
      title: 'Tidal notation in ledger margins',
      markup: '<article><p>The margin   marks run in pairs.</p></article>',
    });
    expect(raw.capture['provenance'])
      .toEqual({
        client: 'capture-extension',
        client_version: '0.4.2',
        captured_from: 'https://library.example.invalid/notes',
        selection_only: false,
      });
  });

  // The column is the row this adapter was constructed for and the
  // envelope's own id is a claim recorded beside it. The fixture
  // claims a different row on purpose: while the two agree, no case
  // can tell which one the column was taken from.
  it('carries the row it was constructed for, not the one claimed', () => {
    const [first] = storedDocuments();
    const raw = first?.raw as PushCaptureRaw;

    expect(first?.sourceId).toBe(CONSTRUCTED_SOURCE_ID);
    expect(raw.capture['sourceId']).toBe(CLAIMED_SOURCE_ID);
    expect(CONSTRUCTED_SOURCE_ID).not.toBe(CLAIMED_SOURCE_ID);
  });

  // The keep half at the canonical step. A record the config read
  // nothing usable out of is still a document, with a null url
  // because there is no such place and an empty body because the
  // capture yielded no text.
  it(
    'answers a null url and an empty body for a record with neither',
    () => {
      const envelope = envelopeAround({ title: 'one' });
      const adapter = createPushCapture({
        envelope,
        parserConfig: {
          fields: {
            [URL_FIELD]: { path: 'href' },
            title: { path: 'title' },
          },
        },
        sourceId: CONSTRUCTED_SOURCE_ID,
      });
      const [record] = adapter.parse(envelope);
      const document = adapter.toCanonical(record as PushCaptureRecord);

      expect({ url: document.url, body: document.body })
        .toEqual({ url: null, body: '' });
    },
  );
});

describe('push-capture — the hash a documents row dedupes on', () => {
  /**
   * The document one url-and-body pair becomes.
   *
   * @param url - What the url field reads.
   * @param body - What the body field reads.
   * @returns The canonical document, hash included.
   */
  function documentFor(url: string, body: string): CanonicalDocument {
    const envelope = envelopeAround({ href: url, text: body });
    const adapter = createPushCapture({
      envelope,
      parserConfig: {
        fields: {
          [URL_FIELD]: { path: 'href' },
          [BODY_FIELD]: { path: 'text' },
        },
      },
      sourceId: CONSTRUCTED_SOURCE_ID,
    });
    const [record] = adapter.parse(envelope);

    return adapter.toCanonical(record as PushCaptureRecord);
  }

  it('answers the same digest for the same document, twice', () => {
    expect(documentFor('https://a.example.invalid/x', 'one').hash)
      .toBe(documentFor('https://a.example.invalid/x', 'one').hash);
  });

  it('answers a different digest when either half changes', () => {
    const base = documentFor('https://a.example.invalid/x', 'one').hash;

    expect(documentFor('https://a.example.invalid/y', 'one').hash)
      .not.toBe(base);
    expect(documentFor('https://a.example.invalid/x', 'two').hash)
      .not.toBe(base);
  });

  it('reads a whitespace difference as the same document', () => {
    expect(documentFor('https://a.example.invalid/x', 'one  two').hash)
      .toBe(documentFor('https://a.example.invalid/x', ' one two ').hash);
  });

  // What is NOT in the basis, and the property specific to push: a
  // client capturing the same page again is capturing one item, so a
  // digest that moved with the moment of capture or with the note
  // around it would make every re-capture a new row.
  it('does not move with the capture that carried the document', () => {
    const config = {
      fields: {
        [URL_FIELD]: { path: 'href' },
        [BODY_FIELD]: { path: 'text' },
      },
    };
    const item = { href: 'https://a.example.invalid/x', text: 'one' };
    const first = {
      ...envelopeAround(item),
      capturedAt: '2026-01-02T03:04:05Z',
    };
    const second = {
      ...envelopeAround(item),
      capturedAt: '2026-05-06T07:08:09Z',
      provenance: { client: 'another', client_version: '9.9.9' },
    };

    /**
     * The one document a capture becomes.
     *
     * @param envelope - The capture to read.
     * @returns Its canonical document.
     */
    function only(envelope: unknown): CanonicalDocument {
      const adapter = createPushCapture({
        envelope,
        parserConfig: config,
        sourceId: CONSTRUCTED_SOURCE_ID,
      });
      const [record] = adapter.parse(envelope);

      return adapter.toCanonical(record as PushCaptureRecord);
    }

    expect(only(first).hash).toBe(only(second).hash);
    expect(only(first).raw).not.toEqual(only(second).raw);
  });

  // The digest lives in two adapter modules, and this is what keeps
  // the copies in step rather than a comment asking the next reader
  // not to change one. `documents.hash` is the key one row per
  // distinct item stands on, so two adapters answering differently
  // for one document would break the property the column exists for.
  it('answers the digest the listing adapter answers', () => {
    const pushed = documentFor('https://a.example.invalid/x', 'one');
    const listing = createListingApi({
      endpoint: '',
      parserConfig: {
        fields: {
          [LISTING_URL_FIELD]: { path: 'href' },
          [LISTING_BODY_FIELD]: { path: 'text' },
        },
      },
      sourceId: CONSTRUCTED_SOURCE_ID,
      transport: refusingTransport,
    });
    const listed = listing.toCanonical({
      fields: {
        [LISTING_URL_FIELD]: pushed.url,
        [LISTING_BODY_FIELD]: pushed.body,
      },
      raw: null,
      warnings: [],
    });

    expect(pushed.hash).toBe(listed.hash);
  });
});

describe('push-capture — fetch, the member that does no I/O', () => {
  // Identity rather than equality. A `fetch` that had gone and got
  // something could not answer the very object it was constructed
  // with, whatever that object looked like afterwards.
  it('answers the capture it was constructed with, unchanged', async () => {
    const capture = storedCapture();
    const adapter = createPushCapture({
      envelope: capture,
      parserConfig: storedConfig(),
      sourceId: CONSTRUCTED_SOURCE_ID,
    });

    await expect(adapter.fetch()).resolves.toBe(capture);
  });

  // The whole no-I/O claim, over all three members at once, with its
  // control in the same case. Without the second half an empty
  // record is equally satisfied by a stub that was never installed.
  it('reads a whole capture without reaching the network', async () => {
    const capture = storedCapture();
    const adapter = createPushCapture({
      envelope: capture,
      parserConfig: storedConfig(),
      sourceId: CONSTRUCTED_SOURCE_ID,
    });
    const documents = adapter.parse(await adapter.fetch())
      .map((record) => adapter.toCanonical(record));

    expect(documents).toHaveLength(2);
    expect(networked).toEqual([]);

    expect(() => globalThis.fetch('https://a.example.invalid/probe'))
      .toThrow(NETWORK_REFUSAL);
    expect(networked).toHaveLength(1);
  });

  // The ordinary call, where the bound capture and the handed one are
  // the same capture — so the construction-time answer and what
  // `parse` judged are one answer.
  it(
    'agrees with its own construction-time reading of the capture',
    async () => {
      const capture = storedCapture();
      const adapter = createPushCapture({
        envelope: capture,
        parserConfig: storedConfig(),
        sourceId: CONSTRUCTED_SOURCE_ID,
      });

      expect(adapter.envelopeErrors)
        .toEqual(captureEnvelopeErrors(await adapter.fetch()));
    },
  );
});

describe('push-capture — the declaration the registry holds', () => {
  // The two members a `sources` row is matched against, which is the
  // whole of what registration answers.
  it('carries the id and the kind a row is matched against', () => {
    expect({
      id: PUSH_CAPTURE_DECLARATION.id,
      kind: PUSH_CAPTURE_DECLARATION.kind,
    }).toStrictEqual({ id: 'push-capture', kind: 'push' });
  });

  // Inert by being constructed rather than by being defused: it is
  // bound to no capture and no row, so its `fetch` answers nothing a
  // contract accepts and its `parse` reads nothing at all. No member
  // of this module could reach anything even if one of them tried.
  it('holds no capture and reads no field', async () => {
    const answered = await PUSH_CAPTURE_DECLARATION.fetch();

    expect(answered).toBeUndefined();
    expect(PUSH_CAPTURE_DECLARATION.envelopeErrors).toEqual([
      'the capture envelope is not an object',
    ]);
    expect(PUSH_CAPTURE_DECLARATION.configErrors).toEqual([
      'the parser config declares no field map',
    ]);
    expect(PUSH_CAPTURE_DECLARATION.parse(answered)).toEqual([]);
    expect(networked).toEqual([]);
  });
});
