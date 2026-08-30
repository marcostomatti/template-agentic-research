/**
 * Cases for `src/sources/listing-api.ts`.
 *
 * The seam this file rests on is the contract's own: `fetch` is the
 * only member that does I/O, so `parse` and `toCanonical` are driven
 * over a payload read off disk and nothing has to be standing up.
 * The transport most of these cases are constructed with is
 * {@link failIfReached}, which throws — so a member that quietly
 * grew a request fails the case that called it rather than reaching
 * a network the default suite is not allowed to touch.
 *
 * That claim needs its own control, because the listing loop turns a
 * transport failure into a NOTE rather than letting it out: a
 * throwing transport would fail `parse` loudly and `fetch` silently.
 * {@link reached} is what closes it — every call is recorded, the
 * stored-payload case asserts the list is empty, and the fetch cases
 * assert it is not, so the empty reading is a measurement rather
 * than a matcher nobody proved.
 *
 * House order: what the adapter refuses first — a config the engine
 * will not read, a payload carrying no records — then the extraction
 * those refusals bound, then the canonical mapping, then the one
 * member that opens a socket.
 */
import type {
  CanonicalDocument,
} from './index.js';
import type {
  ListingApiAdapter,
  ListingApiPayload,
} from './listing-api.js';
import type { FetchLike, PagedListResponse } from './paged-list.js';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { beforeEach, describe, expect, it } from 'vitest';

import {
  BODY_FIELD,
  DEFAULT_LISTING_PATH,
  LISTING_API_DECLARATION,
  SLUG_TOKEN,
  URL_FIELD,
  createListingApi,
  refusingTransport,
} from './listing-api.js';

/**
 * The stored payload these cases drive `parse` over.
 *
 * Resolved from this file's own location rather than from the
 * working directory: the suite is launched from the package and from
 * the repository root alike, and only one of those makes a relative
 * path name it.
 */
const PAYLOAD_PATH = fileURLToPath(
  new URL('./listing-api-payload.json', import.meta.url),
);

/**
 * One member of the stored payload, checked.
 *
 * @param payload - The object under the fixture's envelope.
 * @param name - The member to check.
 * @param holds - What that member has to be.
 * @throws Error When it is not, naming the file and the member.
 */
function requireMember(
  payload: object,
  name: string,
  holds: (value: unknown) => boolean,
): void {
  if (!holds(Reflect.get(payload, name))) {
    throw new Error(`${PAYLOAD_PATH} holds no usable ${name}`);
  }
}

/**
 * What that file records, as `fetch` would have returned it.
 *
 * The fixture is an envelope and this reads the one key under it: a
 * header written into the payload itself would be handed to `parse`
 * as though the source had answered with it.
 *
 * Every member is checked rather than the one `parse` reads, which
 * is what earns the assertion at the end. A fixture edited into a
 * shape nothing reads is otherwise a refusal from the adapter about
 * an input it never got.
 *
 * @returns The payload the fixture stores.
 * @throws Error When the file is no longer a payload, naming it.
 */
function storedPayload(): ListingApiPayload {
  const stored: unknown = JSON.parse(readFileSync(PAYLOAD_PATH, 'utf8'));

  if (typeof stored !== 'object' || stored === null) {
    throw new Error(`${PAYLOAD_PATH} does not hold a JSON object`);
  }

  if (!('payload' in stored)) {
    throw new Error(`${PAYLOAD_PATH} holds no payload key`);
  }

  const payload: unknown = stored.payload;

  if (typeof payload !== 'object' || payload === null) {
    throw new Error(`${PAYLOAD_PATH} holds no payload object`);
  }

  requireMember(payload, 'records', (value) => Array.isArray(value));
  requireMember(payload, 'notes', (value) => Array.isArray(value));
  requireMember(payload, 'cursor', (value) => typeof value === 'string');
  requireMember(payload, 'pages', (value) => typeof value === 'number');
  requireMember(payload, 'requests', (value) => typeof value === 'number');

  return payload as ListingApiPayload;
}

/** How many records the fixture carries, read from the fixture. */
const STORED_RECORDS = storedPayload().records.length;

/**
 * Every URL a transport in this file was asked for, in call order.
 *
 * Reassigned rather than emptied in {@link beforeEach}, so a case
 * holding a reference to a previous run cannot watch it change under
 * itself.
 */
let reached: string[] = [];

beforeEach(() => {
  reached = [];
});

/** What {@link failIfReached} throws with. */
const TRANSPORT_REFUSAL = 'the case transport was reached';

/**
 * A transport that fails the case that reaches it.
 *
 * Every case below except the ones under `fetch` is constructed with
 * this, which is the isolated-suite rule made local: a member that
 * grew a request would take its case down naming the URL it wanted.
 *
 * @param url - The URL something asked for.
 * @returns Never; it throws.
 * @throws Error Always, naming the URL.
 */
const failIfReached: FetchLike = (url) => {
  reached.push(url);

  throw new Error(`${TRANSPORT_REFUSAL}: ${url}`);
};

/**
 * A transport answering the listings a case laid out, and 404 for
 * everything else.
 *
 * @param pages - One listing payload per URL.
 * @returns The transport, recording into {@link reached}.
 */
function respondWith(pages: ReadonlyMap<string, unknown>): FetchLike {
  return (url) => {
    reached.push(url);

    const response: PagedListResponse = {
      ok: pages.has(url),
      status: pages.has(url)
        ? 200
        : 404,
      json: () => Promise.resolve(pages.get(url)),
    };

    return Promise.resolve(response);
  };
}

/**
 * The field map every extraction case here reads with.
 *
 * The two names {@link URL_FIELD} and {@link BODY_FIELD} are what
 * `toCanonical` takes; `headline` and `stamp` are ordinary
 * extraction, and they are here so the record `parse` builds is
 * wider than the document made from it — which is the shape a
 * `findings` row is built out of.
 *
 * Every path is relative to the RECORD rather than to the envelope
 * around it, because the entry is unwrapped before the map is
 * applied.
 */
const FIELD_MAP = {
  [URL_FIELD]: { path: 'permalink' },
  [BODY_FIELD]: { path: 'content', selector: 'article.summary' },
  headline: { path: 'headline' },
  stamp: { path: 'updated' },
};

/** Where the invented catalogue in the fixture is read from. */
const CATALOGUE_BASE = 'https://catalogue.example.invalid';

/**
 * One `parser_config`, with whatever a case wants to change in it.
 *
 * Spread LAST, so an override replaces rather than joins — a case
 * naming `fields` gets its own map and not this one merged with it.
 *
 * @param over - What this case states differently.
 * @returns The config to construct with.
 */
function catalogueConfig(
  over: Readonly<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    endpoints: 'atlas,beacon',
    base_url: CATALOGUE_BASE,
    listing_path: `/v1/${SLUG_TOKEN}/items`,
    recordsPath: 'items',
    stamp_path: 'updated',
    max_rows: 10,
    max_pages: 1,
    fields: FIELD_MAP,
    ...over,
  };
}

/**
 * An adapter over that config, with the transport that refuses.
 *
 * @param over - What this case states differently in the config.
 * @returns The adapter, bound to source row 7.
 */
function catalogueAdapter(
  over: Readonly<Record<string, unknown>> = {},
): ListingApiAdapter {
  return createListingApi({
    endpoint: CATALOGUE_BASE,
    parserConfig: catalogueConfig(over),
    sourceId: 7,
    transport: failIfReached,
  });
}

describe('listing-api — what it says it is', () => {
  // The two members the registry reads, and the two a `sources` row
  // is matched against. Asserted together so a case cannot pass by
  // getting one of them right.
  it('carries the id and the kind it is registered under', () => {
    const adapter = catalogueAdapter();

    expect({ id: adapter.id, kind: adapter.kind })
      .toStrictEqual({ id: 'listing-api', kind: 'api' });
  });

  // The config binds at construction, so whether it is usable is
  // known before anything is fetched. A well-formed row says so with
  // an empty list, which is the control for every refusal below.
  it('reports nothing wrong with a config the engine can use', () => {
    expect(catalogueAdapter().configErrors).toEqual([]);
  });
});

describe('listing-api — a config the engine refuses', () => {
  // Not an object at all, which is what an unset column reads as
  // through a driver that answers null.
  it('reports a config that is not an object', () => {
    const adapter = createListingApi({
      endpoint: CATALOGUE_BASE,
      parserConfig: null,
      sourceId: 7,
      transport: failIfReached,
    });

    expect(adapter.configErrors).toHaveLength(1);
    expect(adapter.configErrors[0]).toContain('not an object');
  });

  // The column default. An empty object is a row somebody created
  // and has not configured, and it extracts nothing from every
  // payload it is ever handed.
  it('reports a config declaring no field map', () => {
    const adapter = createListingApi({
      endpoint: CATALOGUE_BASE,
      parserConfig: {},
      sourceId: 7,
      transport: failIfReached,
    });

    expect(adapter.configErrors).toHaveLength(1);
    expect(adapter.configErrors[0]).toContain('field map');
  });

  // The refusal that matters, and the one a partial reader would
  // pass: ONE unusable rule beside a usable one reads NEITHER. A
  // config that extracted the half it understood would produce
  // documents with two of their members, which is what a thin
  // payload looks like as well.
  it('reads no field at all when one rule in the map is unusable', () => {
    const adapter = catalogueAdapter({
      fields: {
        [URL_FIELD]: { path: 'permalink' },
        broken: { path: 5 },
      },
    });
    const readings = adapter.parse(storedPayload());

    expect(adapter.configErrors).toHaveLength(1);
    expect(adapter.configErrors[0]).toContain('broken');
    expect(readings.map((reading) => Object.keys(reading.fields)))
      .toEqual(readings.map(() => []));
  });

  // The keep half of fail-flag-keep, in the adapter. A config that
  // read nothing still answers one reading per entry, and each of
  // them still carries the entry it was made from — which is the
  // evidence a source shape change is discovered from, and the thing
  // dropping the record would destroy.
  it('keeps every record a refused config read nothing out of', () => {
    const payload = storedPayload();
    const readings = catalogueAdapter({ fields: {} }).parse(payload);

    expect(readings).toHaveLength(STORED_RECORDS);
    expect(readings.map((reading) => reading.raw))
      .toEqual(payload.records);
  });
});

describe('listing-api — a payload it cannot read', () => {
  // Every shape a stored payload arrives in that is not a run: a
  // column that was never written, a hand edit, a recorded response
  // from something else. None of them raises and none of them
  // invents a reading.
  it('answers no reading for a payload carrying no record list', () => {
    const adapter = catalogueAdapter();
    const shapes: readonly unknown[] = [
      null, undefined, 42, 'a listing', {}, { records: 'one' }, [],
    ];

    expect(shapes.map((shape) => adapter.parse(shape as ListingApiPayload)))
      .toEqual(shapes.map(() => []));
  });

  // One reading per entry, whatever the entry turned out to be. The
  // count is the invariant `toCanonical` rests on: a document is
  // written for every record the run took, so a reading dropped here
  // would be a capture that left no trace at all.
  //
  // The fourth entry is a BARE record rather than an envelope, which
  // is the branch `unwrapListPayload` keeps so a response recorded
  // as it came off the wire parses exactly as a wrapped one does.
  it('answers one reading per entry, whatever the entry was', () => {
    const entries: readonly unknown[] = [
      7,
      'a record',
      null,
      { permalink: 'https://catalogue.example.invalid/bare' },
      {
        endpoint: { slug: 'atlas', name: 'Atlas Catalogue' },
        record: { permalink: 'https://catalogue.example.invalid/wrapped' },
      },
    ];
    const readings = catalogueAdapter().parse({
      records: entries,
      cursor: '',
      notes: [],
      pages: 0,
      requests: 0,
    });

    expect(readings).toHaveLength(entries.length);
    expect(readings.map((reading) => reading.raw)).toEqual(entries);
    expect(readings.map((reading) => reading.fields[URL_FIELD]))
      .toEqual([
        null,
        null,
        null,
        'https://catalogue.example.invalid/bare',
        'https://catalogue.example.invalid/wrapped',
      ]);
  });
});

describe('listing-api — the stored payload, extracted', () => {
  // The whole fixture, read. Paired against the fixture rather than
  // against a number written here, so a record added to the file
  // joins the run instead of reddening a count.
  it('reads one record per entry the fixture carries', () => {
    const payload = storedPayload();
    const readings = catalogueAdapter().parse(payload);

    expect(readings).toHaveLength(payload.records.length);
    expect(readings.map((reading) => Object.keys(reading.fields).sort()))
      .toEqual(readings.map(() => ['body', 'headline', 'stamp', 'url']));
  });

  // The markup step, both halves of it. The selector matched, so
  // there is text at all; the reduction ran, so there is no tag left
  // in what a `documents.body` will hold.
  it('reads a member through the markup step, matched and reduced', () => {
    const readings = catalogueAdapter().parse(storedPayload());
    const body = readings[0]?.fields[BODY_FIELD];

    expect(body).toContain('drift correction');
    expect(body).not.toContain('<');
  });

  // The control the case above needs. Without a selector the same
  // member comes back as the markup it was, so the reduction is
  // shown to be the STEP rather than something this adapter does to
  // every member it reads.
  it('leaves a member with no selector as the markup it was', () => {
    const readings = catalogueAdapter({
      fields: { [BODY_FIELD]: { path: 'content' } },
    }).parse(storedPayload());

    expect(readings[0]?.fields[BODY_FIELD]).toContain('<article');
  });

  // A selector that names nothing reads nothing, rather than reading
  // the markup as though it were the value.
  it('answers nothing for a selector that matches no fragment', () => {
    const readings = catalogueAdapter({
      fields: {
        [BODY_FIELD]: { path: 'content', selector: 'article.absent' },
      },
    }).parse(storedPayload());

    expect(readings[0]?.fields[BODY_FIELD]).toBeNull();
  });

  // A record the config could not read a member out of says so, per
  // record, and the run carries on. The fixture's third entry has no
  // markup member at all, which is the capture that yields an empty
  // body and is kept anyway.
  it('warns per record about a step it could not take', () => {
    const readings = catalogueAdapter().parse(storedPayload());

    expect(readings.map((reading) => reading.warnings.length))
      .toEqual([0, 0, 1]);
    expect(readings[2]?.warnings[0]).toContain(BODY_FIELD);
  });

  // The isolated-suite claim, measured rather than assumed. Every
  // pure member is driven over the whole fixture and the transport
  // records nothing — and the fetch cases below are what prove the
  // recorder would have noticed.
  it('reads the stored payload without reaching the transport', () => {
    const adapter = catalogueAdapter();
    const readings = adapter.parse(storedPayload());
    const documents = readings.map((r) => adapter.toCanonical(r));

    expect(documents).toHaveLength(STORED_RECORDS);
    expect(reached).toEqual([]);
  });
});

describe('listing-api — the canonical document', () => {
  /**
   * Every document the fixture yields, in fixture order.
   *
   * @param over - What this case states differently in the config.
   * @returns One canonical document per stored record.
   */
  function storedDocuments(
    over: Readonly<Record<string, unknown>> = {},
  ): CanonicalDocument[] {
    const adapter = catalogueAdapter(over);

    return adapter.parse(storedPayload())
      .map((reading) => adapter.toCanonical(reading));
  }

  // The five members, held as a SET against the whole expected list
  // rather than one at a time: a mapping that answered three of them
  // satisfies every per-member assertion anyone would write.
  it('produces the five members a documents row takes', () => {
    const documents = storedDocuments();

    expect(documents.map((document) => Object.keys(document).sort()))
      .toEqual(documents.map(() => [
        'body', 'hash', 'raw', 'sourceId', 'url',
      ]));
  });

  // NULL and never `''`, which is the column's own rule: a reader
  // handed an empty string renders a link to nowhere. The first
  // document is the control — a record that DOES state a place still
  // gets one.
  it('answers a null url for a record stating an empty one', () => {
    const documents = storedDocuments();

    expect(documents[0]?.url)
      .toBe('https://catalogue.example.invalid/atlas/0007');
    expect(documents[1]?.url).toBeNull();
  });

  // The other way round for the body: required, and empty rather
  // than null, because a capture that yielded no text is still a
  // capture. Its evidence is kept beside it.
  it('answers an empty body for a record with no text, and keeps it', () => {
    const payload = storedPayload();
    const adapter = catalogueAdapter();
    const documents = adapter.parse(payload)
      .map((reading) => adapter.toCanonical(reading));

    expect(documents[2]?.body).toBe('');
    expect(documents[2]?.raw).toBe(payload.records[2]);
  });

  // The row the adapter was constructed for, written onto every
  // document it produces. The null is the second reading rather than
  // an absent member: the column means "came through no source", and
  // an adapter constructed without one says so.
  it('carries the source row it was constructed for', () => {
    const withNoRow = createListingApi({
      endpoint: CATALOGUE_BASE,
      parserConfig: catalogueConfig(),
      sourceId: null,
      transport: failIfReached,
    });
    const documents = storedDocuments();
    const reading = withNoRow.parse(storedPayload())[0];

    expect(documents.map((document) => document.sourceId))
      .toEqual(documents.map(() => 7));
    expect(reading && withNoRow.toCanonical(reading).sourceId).toBeNull();
  });
});

describe('listing-api — the hash a documents row dedupes on', () => {
  /**
   * One document, from a record stating exactly these two members.
   *
   * Built through `parse` rather than by handing `toCanonical` a
   * record written here, so the reading under test is one the engine
   * actually produced.
   *
   * @param url - What the record states as its place.
   * @param body - What the record states as its text.
   * @returns The canonical document made of it.
   * @throws Error When the engine read no record, which would make
   * every assertion below vacuous.
   */
  function documentFor(url: string, body: string): CanonicalDocument {
    const adapter = catalogueAdapter({
      fields: {
        [URL_FIELD]: { path: 'permalink' },
        [BODY_FIELD]: { path: 'content' },
      },
    });
    const reading = adapter.parse({
      records: [{ permalink: url, content: body }],
      cursor: '',
      notes: [],
      pages: 0,
      requests: 0,
    })[0];

    if (reading === undefined) {
      throw new Error('the engine read no record from a one-record run');
    }

    return adapter.toCanonical(reading);
  }

  // The shape, and the property one row per distinct item rests on:
  // the same capture twice is the same key, so the second insert
  // conflicts instead of adding a rival.
  it('answers the same digest for the same document, twice', () => {
    const first = documentFor('https://a.invalid/1', 'the same text');
    const second = documentFor('https://a.invalid/1', 'the same text');

    expect(first.hash).toMatch(/^[0-9a-f]{64}$/u);
    expect(second.hash).toBe(first.hash);
  });

  // Either half moving moves the digest. Without this the case above
  // is equally satisfied by a constant.
  it('answers a different digest when either half changes', () => {
    const base = documentFor('https://a.invalid/1', 'the text');

    expect(documentFor('https://a.invalid/2', 'the text').hash)
      .not.toBe(base.hash);
    expect(documentFor('https://a.invalid/1', 'other text').hash)
      .not.toBe(base.hash);
  });

  // Whitespace is not content: a listing that re-serializes its own
  // text answers the same item rather than a new one.
  it('reads a whitespace difference as the same document', () => {
    expect(documentFor('https://a.invalid/1', 'one  two\n\nthree').hash)
      .toBe(documentFor('https://a.invalid/1', 'one two three').hash);
  });

  // The pair is encoded rather than joined, so the two halves cannot
  // bleed into each other. The input that discriminates is one where
  // the BOUNDARY moves and the joined text does not: these two pairs
  // concatenate to the same string, and a swapped pair does not, so
  // a case written around swapping would pass over a joined basis
  // and say nothing.
  it('does not collide when the boundary between the halves moves', () => {
    expect(documentFor('https://a.invalid/ab', 'c').hash)
      .not.toBe(documentFor('https://a.invalid/a', 'bc').hash);
  });
});

describe('listing-api — fetch, the one member that does I/O', () => {
  // A row naming no endpoint reaches nothing at all. The note is the
  // listing loop's, and it is what a run reports instead of an
  // error: a source configured with nothing is a datum.
  it('makes no request for a config naming no endpoint', async () => {
    const adapter = createListingApi({
      endpoint: CATALOGUE_BASE,
      parserConfig: {},
      sourceId: 7,
      transport: failIfReached,
    });
    const payload = await adapter.fetch();

    expect(reached).toEqual([]);
    expect(payload.requests).toBe(0);
    expect(payload.notes).toContain('no endpoints configured');
  });

  // The positive control the stored-payload case rests on: the
  // recorder DOES fill when something is fetched, and a transport
  // that throws stops its own endpoint with a note rather than the
  // run. Both halves matter — the first makes every empty reading of
  // `reached` a measurement, the second says why a throwing
  // transport cannot be the whole of the isolated-suite claim.
  it(
    'reaches the transport once per endpoint, and notes a failure',
    async () => {
      const payload = await catalogueAdapter().fetch();

      expect(reached).toEqual([
        `${CATALOGUE_BASE}/v1/atlas/items`,
        `${CATALOGUE_BASE}/v1/beacon/items`,
      ]);
      expect(payload.records).toEqual([]);
      expect(payload.notes
        .filter((note) => note.includes(TRANSPORT_REFUSAL)))
        .toHaveLength(2);
    },
  );

  // The base URL keeps no trailing separator and the path gains a
  // leading one, so the two join the same way whichever way an
  // operator wrote them. Both spellings are wrong in this case and
  // the answer is still right.
  it(
    'joins a base URL and a listing path written either way',
    async () => {
      await catalogueAdapter({
        base_url: `${CATALOGUE_BASE}/`,
        listing_path: `v1/${SLUG_TOKEN}/items`,
      }).fetch();

      expect(reached).toEqual([
        `${CATALOGUE_BASE}/v1/atlas/items`,
        `${CATALOGUE_BASE}/v1/beacon/items`,
      ]);
    },
  );

  // The default, which is the handle directly under the row
  // endpoint. Asserted against the exported constant as well, so the
  // two cannot part while both look right.
  it(
    'reads the handle under the endpoint when no path is stated',
    async () => {
      await catalogueAdapter({ listing_path: undefined }).fetch();

      expect(DEFAULT_LISTING_PATH).toBe(`/${SLUG_TOKEN}`);
      expect(reached).toEqual([
        `${CATALOGUE_BASE}/atlas`,
        `${CATALOGUE_BASE}/beacon`,
      ]);
    },
  );

  // A path with no placeholder in it sends every endpoint to one
  // URL, which is a cursor kept per endpoint over a listing that is
  // the same listing every time. Reported rather than refused, and
  // reported FIRST, because it is about the run and not about one
  // endpoint.
  it('reports a listing path that names no endpoint', async () => {
    const payload = await catalogueAdapter({
      listing_path: '/v1/items',
    }).fetch();

    expect(payload.notes[0]).toBe(
      'the listing path names no endpoint, so every configured'
      + ' endpoint reads one URL',
    );
    expect(reached).toHaveLength(2);
    expect(new Set(reached).size).toBe(1);
  });

  // The whole loop, through a transport that answers: what the run
  // took, what it cost, and what it left for the next run. The parse
  // at the end is what says the envelope `fetch` builds is the one
  // `parse` reads — the two halves meeting is a claim neither the
  // stored payload nor the fetch cases make on their own.
  it('answers the records, the cursor and the run it made', async () => {
    const url = `${CATALOGUE_BASE}/v1/atlas/items`;
    const adapter = createListingApi({
      endpoint: CATALOGUE_BASE,
      parserConfig: catalogueConfig({ endpoints: 'atlas' }),
      sourceId: 7,
      transport: respondWith(new Map([[url, {
        items: [{
          permalink: `${CATALOGUE_BASE}/atlas/0009`,
          headline: 'Harbour survey, second pass',
          content: '<article class="summary">Two berths moved.</article>',
          updated: '2026-07-16T08:00:00Z',
        }],
      }]])),
    });
    const payload = await adapter.fetch();

    expect({ requests: payload.requests, pages: payload.pages })
      .toStrictEqual({ requests: 1, pages: 1 });
    expect(payload.records).toHaveLength(1);
    expect(payload.cursor).toContain('atlas');
    expect(adapter.parse(payload)[0]?.fields[BODY_FIELD])
      .toBe('Two berths moved.');
  });
});

describe('listing-api — the declaration the registry holds', () => {
  // What registration answers: the id a `sources` row selects and
  // the kind it is matched against. Everything else about the entry
  // is inert, which the next case measures rather than asserts.
  it('carries the id and the kind a row is matched against', () => {
    expect({
      id: LISTING_API_DECLARATION.id,
      kind: LISTING_API_DECLARATION.kind,
    }).toStrictEqual({ id: 'listing-api', kind: 'api' });
  });

  // Bound to no row, so it reaches nothing and reads nothing. Both
  // halves are asserted because either one alone would be satisfied
  // by an entry that could still fetch.
  it('reaches no source and reads no field', async () => {
    const payload = await LISTING_API_DECLARATION.fetch();

    expect(payload.requests).toBe(0);
    expect(LISTING_API_DECLARATION.configErrors).toHaveLength(1);
    expect(LISTING_API_DECLARATION.parse(storedPayload())
      .map((reading) => Object.keys(reading.fields)))
      .toEqual(Array.from({ length: STORED_RECORDS }, () => []));
  });

  // The transport that stands in for one there is none of. Nothing
  // in the declaration can reach it — its config names no endpoint —
  // so the refusal is driven here directly, and it names the factory
  // a caller is supposed to use instead.
  it('refuses through its transport, naming the factory', async () => {
    await expect(refusingTransport()).rejects
      .toThrow('createListingApi');
  });
});
