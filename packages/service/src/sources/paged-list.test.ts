/**
 * Cases for `src/sources/paged-list.ts`: what the cursor codec and
 * the payload unwrap do to input written to break them, and what one
 * listing run does with the bounds, the transport and the cursor it
 * was handed.
 *
 * TWO KINDS OF CASE, and the split is the port's own. The cursor
 * codec, the stamp coercion, the endpoint list and the unwrap are
 * compared against their originals in
 * `tests/parity/paged-list.parity.test.ts`, which is the gate that
 * decides whether the port landed; what those functions get here is
 * the readable pin — the shapes a person meets, named. The listing
 * run has no such gate, because its transport is injected here and
 * global there and every note it produces was re-authored in this
 * repository's vocabulary, so these cases are the ONLY thing
 * describing it and they are written as characterization: what the
 * module DOES, not what would be ideal. A repair made here would
 * fail the parity gate for the half that has one, and would move
 * behaviour nobody measured for the half that does not.
 *
 * The refusals come FIRST, because they are what this module was
 * written for. A stored cursor is a free-text column an operator can
 * hand-edit and another source may have written; a stored payload is
 * whatever a source answered with, replayed. Both are read on every
 * run and neither is promised to be anything, so the interesting
 * behaviour is what happens when they are not — and the rule the
 * module holds is that none of it throws. A cursor that will not
 * parse decodes to NO CURSOR, which costs a re-read the convergence
 * upsert absorbs; a payload carrying no envelope IS the record.
 *
 * The one throw has a case of its own and comes first of all:
 * {@link listEndpoints} refuses a `deps` with no `fetch`. That is a
 * programming error rather than a datum, and it is the divergence
 * the module exists to make visible — the original falls back to
 * whatever global its runtime offers, and this one cannot, so the
 * isolated-suite rule is readable in the signature.
 *
 * ## What the listing cases hold down
 *
 * Three rules, each with a case whose failure names it. The cursor
 * is PER ENDPOINT, so one endpoint's high-water mark never moves
 * another's. An ETAG IS ONLY STORED when the endpoint was read to
 * the end, so a capped run cannot answer 304 next time over a
 * listing it has not finished. And the cursor NEVER ADVANCES INTO a
 * group of records sharing one timestamp, which has two endings
 * worth separating: the group can be backed out of, or it fills the
 * whole budget and the run says so rather than moving past records
 * it did not take.
 *
 * Two more are characterization in the strict sense — nobody would
 * design them, they are reachable, and the cases exist so nobody
 * meets either in a debugger. A record whose `refFrom` answers
 * nothing is DROPPED from the result while still having been counted
 * against the row budget. And the row budget is divided evenly
 * BEFORE the run starts, so an endpoint that answers nothing does
 * not hand its share to the next one.
 */
import type {
  FetchLike,
  PagedListResponse,
  PagedListSpec,
} from './paged-list.js';

import { describe, expect, it } from 'vitest';

import {
  formatListCursor,
  listEndpoints,
  listStamp,
  parseEndpointList,
  parseListCursor,
  slugToEndpointName,
  unwrapListPayload,
} from './paged-list.js';

// ---------------------------------------------------------------------------
// A transport that answers from a table and remembers what it was asked
// ---------------------------------------------------------------------------

/** Where the fake listings live. `.invalid` cannot resolve at all. */
const BASE_URL = 'https://listing.example.invalid';

/** One item as the fake sources state it. */
interface StubItem {
  /** The item's own identifier. */
  readonly id: string;

  /** When it says it was published, in whatever shape. */
  readonly at?: unknown;
}

/** What one taken record comes back as. */
interface TakenRef {
  /** The item's identifier. */
  readonly id: unknown;

  /** Which endpoint it came from. */
  readonly slug: string;
}

/** What the stub transport should do for one URL. */
interface StubAnswer {
  /** Throw instead of answering, with this message. */
  readonly transportThrows?: string;

  /** The status to report. Defaults to 200. */
  readonly status?: number;

  /** Whether the status counts as a success. Defaults to status < 400. */
  readonly ok?: boolean;

  /** The entity tag to answer with, when any. */
  readonly etag?: string;

  /** Reject the body read instead of answering, with this message. */
  readonly bodyThrows?: string;

  /** The parsed body. */
  readonly body?: unknown;
}

/** One request the stub was asked to make. */
interface StubCall {
  /** The URL it was given. */
  readonly url: string;

  /** The headers it was given. */
  readonly headers: Readonly<Record<string, string>>;
}

/** A stub transport and the record of what it was asked. */
interface StubTransport {
  /** The function to hand {@link listEndpoints}. */
  readonly fetch: FetchLike;

  /** Every request, in order. */
  readonly calls: readonly StubCall[];
}

/** The URL the shared spec builds for one endpoint handle. */
function listingUrl(slug: string): string {
  return `${BASE_URL}/${encodeURIComponent(slug)}/items`;
}

/**
 * A transport answering from a table keyed by URL.
 *
 * A URL the table does not name answers 404, which is what makes a
 * mis-encoded slug visible as a failure note rather than as a silent
 * pass.
 *
 * @param table - What to answer per URL.
 * @returns The transport and its record.
 */
function stubTransport(
  table: Readonly<Record<string, StubAnswer>>,
): StubTransport {
  const calls: StubCall[] = [];
  const fetch: FetchLike = (url, init) => {
    calls.push({ url, headers: { ...init.headers } });

    const answer = table[url] ?? { status: 404, ok: false };

    if (answer.transportThrows !== undefined) {
      return Promise.reject(new Error(answer.transportThrows));
    }

    const status = answer.status ?? 200;
    const response: PagedListResponse = {
      ok: answer.ok ?? status < 400,
      status,
      headers: {
        get: (name) => (name.toLowerCase() === 'etag'
          ? answer.etag ?? null
          : null),
      },
      json: () => (answer.bodyThrows === undefined
        ? Promise.resolve(answer.body)
        : Promise.reject(new Error(answer.bodyThrows))),
    };

    return Promise.resolve(response);
  };

  return { fetch, calls };
}

/**
 * The spec every listing case uses unless it needs another.
 *
 * Deliberately dull: the four members are where a real source states
 * its own shape, and a case about the loop should not have to read
 * them. `refFrom` answers a record for every item, so the one case
 * about an item it cannot read supplies its own spec.
 */
const SPEC: PagedListSpec<TakenRef> = {
  defaultBaseUrl: BASE_URL,
  urlFor: (baseUrl, slug) => `${baseUrl}/${slug}/items`,
  itemsFrom: (payload) => (payload as { items?: unknown }).items,
  stampOf: (item) => (item as StubItem).at,
  refFrom: (item, endpoint) => ({
    id: (item as StubItem).id,
    slug: endpoint.slug,
  }),
};

/** A cursor naming one endpoint, quoted by more than one case. */
const STORED_ALPHA = '{"alpha":{"seen":"2026-01-01T00:00:00.000Z"}}';

/** A listing body carrying the items a case declares. */
function listingBody(items: readonly StubItem[]): unknown {
  return { items };
}

// ---------------------------------------------------------------------------
// The one refusal
// ---------------------------------------------------------------------------

describe('paged-list — the transport is injected, never reached for', () => {
  it('refuses a deps carrying no fetch', async () => {
    const deps = {} as { fetch: FetchLike };

    await expect(listEndpoints({ endpoints: 'alpha' }, deps, SPEC))
      .rejects.toThrow(TypeError);
  });

  it('names the dependency and the reason in the refusal', async () => {
    const deps = { fetch: 'not a function' } as unknown as {
      fetch: FetchLike;
    };

    await expect(listEndpoints({}, deps, SPEC))
      .rejects.toThrow(/deps\.fetch/);
  });

  it('refuses before making any request at all', async () => {
    const transport = stubTransport({});
    const deps = { fetch: undefined } as unknown as { fetch: FetchLike };

    await expect(listEndpoints({ endpoints: 'alpha' }, deps, SPEC))
      .rejects.toThrow(TypeError);
    expect(transport.calls).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// A stored cursor that is not one
// ---------------------------------------------------------------------------

describe('paged-list — a cursor that will not parse', () => {
  it('reads an empty column as no cursor', () => {
    expect(parseListCursor('')).toEqual({});
    expect(parseListCursor('   ')).toEqual({});
    expect(parseListCursor(null)).toEqual({});
    expect(parseListCursor(undefined)).toEqual({});
  });

  it('reads text that is not JSON as no cursor', () => {
    expect(parseListCursor('not a cursor')).toEqual({});
    expect(parseListCursor('{ unquoted: 1 }')).toEqual({});
    expect(parseListCursor('{')).toEqual({});
  });

  // Another source's cursor in the same column. A bare timestamp is
  // the shape a single-endpoint source stores, and it decodes to no
  // cursor rather than to an error, which costs one re-read.
  it('reads another source\'s cursor as no cursor', () => {
    expect(parseListCursor('2026-01-02T03:04:05.000Z')).toEqual({});
    expect(parseListCursor('12345')).toEqual({});
  });

  it('reads JSON that is not an object as no cursor', () => {
    expect(parseListCursor('[]')).toEqual({});
    expect(parseListCursor('[{"seen":"x"}]')).toEqual({});
    expect(parseListCursor('null')).toEqual({});
    expect(parseListCursor('"alpha"')).toEqual({});
  });

  it('drops an entry that is not an object and keeps the rest', () => {
    expect(parseListCursor(
      '{"alpha":"x","bravo":[1],"charlie":null,"delta":{"seen":"d"}}',
    )).toEqual({ delta: { seen: 'd', etag: '' } });
  });

  it('coerces a hand-edited entry rather than refusing it', () => {
    expect(parseListCursor('{"alpha":{"seen":12,"etag":null}}'))
      .toEqual({ alpha: { seen: '12', etag: '' } });
    expect(parseListCursor('{"alpha":{"seen":"  x  "}}'))
      .toEqual({ alpha: { seen: 'x', etag: '' } });
  });

  // Preserved, not repaired: writing an inherited key into a plain
  // object replaces the prototype instead of adding an own key, so
  // the entry is silently absent. The module header says why the
  // repair is a decision for the phase that owns the callers.
  it('drops an inherited key without saying so', () => {
    const cursor = parseListCursor('{"__proto__":{"seen":"x","etag":"y"}}');

    expect(Object.keys(cursor)).toEqual([]);
    expect(Object.getPrototypeOf(cursor)).not.toBe(Object.prototype);
    expect(Object.getPrototypeOf(parseListCursor('{"alpha":{"seen":"x"}}')))
      .toBe(Object.prototype);
  });

  it('reads a value whose text conversion throws as no cursor', () => {
    const hostile = {};

    Object.defineProperty(hostile, 'toString', {
      value: () => {
        throw new Error('no text for you');
      },
    });

    expect(parseListCursor(hostile)).toEqual({});
  });
});

describe('paged-list — a cursor on the way out', () => {
  it('stores nothing when no entry carries either half', () => {
    expect(formatListCursor({})).toBe('');
    expect(formatListCursor({ alpha: { seen: '', etag: '' } })).toBe('');
    expect(formatListCursor({ alpha: {} })).toBe('');
    expect(formatListCursor(null)).toBe('');
    expect(formatListCursor(undefined)).toBe('');
  });

  it('sorts its keys so an unchanged cursor is byte-identical', () => {
    const written = formatListCursor({
      zulu: { seen: 'z' },
      alpha: { seen: 'a' },
      mike: { seen: 'm' },
    });

    expect(written)
      .toBe('{"alpha":{"seen":"a"},"mike":{"seen":"m"},"zulu":{"seen":"z"}}');
  });

  it('omits the entity tag rather than storing it empty', () => {
    expect(formatListCursor({ alpha: { seen: 'a', etag: '' } }))
      .toBe('{"alpha":{"seen":"a"}}');
    expect(formatListCursor({ alpha: { seen: 'a', etag: 'W/1' } }))
      .toBe('{"alpha":{"seen":"a","etag":"W/1"}}');
  });

  it('keeps an entry carrying only an entity tag', () => {
    expect(formatListCursor({ alpha: { etag: 'W/1' } }))
      .toBe('{"alpha":{"seen":"","etag":"W/1"}}');
  });
});

// ---------------------------------------------------------------------------
// A stored payload carrying no envelope
// ---------------------------------------------------------------------------

describe('paged-list — a payload that cannot be unwrapped', () => {
  it('reads a bare payload as the record itself', () => {
    expect(unwrapListPayload({ id: 'one' }))
      .toEqual({ item: { id: 'one' }, endpoint: {} });
  });

  it('reads a payload that is not an object as the record itself', () => {
    expect(unwrapListPayload(null)).toEqual({ item: null, endpoint: {} });
    expect(unwrapListPayload('alpha'))
      .toEqual({ item: 'alpha', endpoint: {} });
    expect(unwrapListPayload(12)).toEqual({ item: 12, endpoint: {} });
    expect(unwrapListPayload([{ id: 'one' }]))
      .toEqual({ item: [{ id: 'one' }], endpoint: {} });
  });

  it('reads an envelope whose record is not an object as bare', () => {
    for (const record of [null, 'alpha', 12, [], true]) {
      expect(unwrapListPayload({ record, endpoint: { slug: 'alpha' } }))
        .toEqual({
          item: { record, endpoint: { slug: 'alpha' } },
          endpoint: {},
        });
    }
  });

  it('separates a record from the provenance an envelope added', () => {
    expect(unwrapListPayload({
      record: { id: 'one' },
      endpoint: { slug: 'alpha', name: 'Alpha Name' },
    })).toEqual({
      item: { id: 'one' },
      endpoint: { slug: 'alpha', name: 'Alpha Name' },
    });
  });

  it('answers no provenance when the envelope carried none usable', () => {
    for (const endpoint of [null, undefined, 'alpha', 0, true]) {
      expect(unwrapListPayload({ record: { id: 'one' }, endpoint }))
        .toEqual({ item: { id: 'one' }, endpoint: {} });
    }
  });

  // The asymmetry the module header names: the record half must be a
  // non-array object, the provenance half is taken as-is whenever it
  // is truthy and an object.
  it('takes an array provenance as-is', () => {
    expect(unwrapListPayload({ record: { id: 'one' }, endpoint: [1] }))
      .toEqual({ item: { id: 'one' }, endpoint: [1] });
  });
});

// ---------------------------------------------------------------------------
// The endpoint list and the pieces around it
// ---------------------------------------------------------------------------

describe('paged-list — the endpoint list', () => {
  it('reports an entry that is not a handle and reads the rest', () => {
    expect(parseEndpointList({ endpoints: 'not a handle,alpha' }))
      .toEqual({
        endpoints: [{ slug: 'alpha', name: 'Alpha' }],
        rejected: ['not a handle'],
      });
  });

  it('refuses a handle that does not open with a letter or digit', () => {
    expect(parseEndpointList({ endpoints: '-alpha,_bravo' }).rejected)
      .toEqual(['-alpha', '_bravo']);
  });

  it('refuses a handle longer than the cap', () => {
    const long = 'a'.repeat(65);

    expect(parseEndpointList({ endpoints: long }).rejected).toEqual([long]);
    expect(parseEndpointList({ endpoints: 'a'.repeat(64) }).rejected)
      .toEqual([]);
  });

  it('reads either spelling a parser config arrives in', () => {
    const fromText = parseEndpointList({ endpoints: 'alpha,bravo' });
    const fromList = parseEndpointList({ endpoints: ['alpha', 'bravo'] });

    expect(fromText).toEqual(fromList);
    expect(fromText.endpoints.map((entry) => entry.slug))
      .toEqual(['alpha', 'bravo']);
  });

  it('drops a repeated handle, first spelling winning', () => {
    expect(parseEndpointList({ endpoints: 'alpha=One,ALPHA=Two' }).endpoints)
      .toEqual([{ slug: 'alpha', name: 'One' }]);
  });

  it('falls back to the handle when the config states no name', () => {
    expect(parseEndpointList({ endpoints: 'alpha-bravo.charlie_delta' })
      .endpoints)
      .toEqual([{
        slug: 'alpha-bravo.charlie_delta',
        name: 'Alpha Bravo Charlie Delta',
      }]);
  });

  it('reads a config that is not an object as naming nothing', () => {
    expect(parseEndpointList(null)).toEqual({ endpoints: [], rejected: [] });
    expect(parseEndpointList('alpha'))
      .toEqual({ endpoints: [], rejected: [] });
  });

  it('capitalizes only the first character of each word', () => {
    expect(slugToEndpointName('aLPHA-bRAVO')).toBe('ALPHA BRAVO');
    expect(slugToEndpointName('')).toBe('');
    expect(slugToEndpointName('---')).toBe('');
  });
});

describe('paged-list — the stamp coercion', () => {
  it('answers nothing for absence and for text that is not a date', () => {
    expect(listStamp(null)).toBe('');
    expect(listStamp('')).toBe('');
    expect(listStamp('not a date')).toBe('');
    expect(listStamp(new Date(Number.NaN))).toBe('');
    expect(listStamp(Number.NaN)).toBe('');
  });

  it('puts two offsets in the order the instants happened', () => {
    const earlier = listStamp('2026-08-06T20:05:30-04:00');
    const later = listStamp('2026-08-06T21:00:00+02:00');

    expect(later < earlier).toBe(true);
    expect(later).toBe('2026-08-06T19:00:00.000Z');
  });

  it('reads epoch milliseconds and a date alike', () => {
    expect(listStamp(0)).toBe('1970-01-01T00:00:00.000Z');
    expect(listStamp(new Date(0))).toBe('1970-01-01T00:00:00.000Z');
  });

  // The one input this module throws for, and it is a spec's
  // programming error rather than a datum: every unreadable value
  // answers `''` instead.
  it('throws for a finite number no date can hold', () => {
    expect(() => listStamp(8.64e15 + 1)).toThrow(RangeError);
    expect(listStamp(8.64e15)).toBe('+275760-09-13T00:00:00.000Z');
  });
});

// ---------------------------------------------------------------------------
// One listing run
// ---------------------------------------------------------------------------

describe('paged-list — a run that makes no request', () => {
  it('says so when the config names no endpoint', async () => {
    const transport = stubTransport({});
    const result = await listEndpoints({}, transport, SPEC);

    expect(result.notes).toEqual(['no endpoints configured']);
    expect(result.requests).toBe(0);
    expect(result.pages).toBe(0);
    expect(transport.calls).toEqual([]);
  });

  it('reports every refused handle before saying so', async () => {
    const transport = stubTransport({});
    const result = await listEndpoints(
      { endpoints: '-alpha,_bravo' },
      transport,
      SPEC,
    );

    expect(result.notes).toEqual([
      '"-alpha" is not an endpoint handle and was skipped',
      '"_bravo" is not an endpoint handle and was skipped',
      'no endpoints configured',
    ]);
  });

  it('says so when the request bound is off', async () => {
    const transport = stubTransport({});
    const result = await listEndpoints(
      { endpoints: 'alpha', max_rows: 10, max_pages: 0 },
      transport,
      SPEC,
    );

    expect(result.notes).toEqual(['max_pages is 0, so no request was made']);
    expect(transport.calls).toEqual([]);
  });

  it('carries a stored cursor through a run that read nothing', async () => {
    const transport = stubTransport({});
    const result = await listEndpoints(
      { endpoints: '', cursor: STORED_ALPHA },
      transport,
      SPEC,
    );

    expect(result.next_cursor)
      .toBe('{"alpha":{"seen":"2026-01-01T00:00:00.000Z"}}');
  });
});

describe('paged-list — the request one endpoint costs', () => {
  it('percent-encodes the handle it puts in the path', async () => {
    const transport = stubTransport({});

    await listEndpoints(
      { endpoints: 'alpha.bravo', max_rows: 1, max_pages: 1 },
      transport,
      SPEC,
    );

    expect(transport.calls.map((call) => call.url))
      .toEqual([listingUrl('alpha.bravo')]);
  });

  it('asks for JSON and sends no tag without a stored one', async () => {
    const transport = stubTransport({});

    await listEndpoints(
      { endpoints: 'alpha', max_rows: 1, max_pages: 1 },
      transport,
      SPEC,
    );

    expect(transport.calls.map((call) => call.headers))
      .toEqual([{ accept: 'application/json' }]);
  });

  it('sends the stored tag when the last run stored one', async () => {
    const transport = stubTransport({});

    await listEndpoints(
      {
        endpoints: 'alpha',
        max_rows: 1,
        max_pages: 1,
        cursor: '{"alpha":{"seen":"x","etag":"W/1"}}',
      },
      transport,
      SPEC,
    );

    expect(transport.calls.map((call) => call.headers)).toEqual([
      { accept: 'application/json', 'if-none-match': 'W/1' },
    ]);
  });
});

describe('paged-list — an endpoint that answers with a fault', () => {
  it('notes a transport failure and leaves the run going', async () => {
    const transport = stubTransport({
      [listingUrl('alpha')]: { transportThrows: 'connection reset' },
      [listingUrl('bravo')]: {
        body: listingBody([{ id: 'b1', at: '2026-01-02T00:00:00Z' }]),
      },
    });
    const result = await listEndpoints(
      { endpoints: 'alpha,bravo', max_rows: 4, max_pages: 1 },
      transport,
      SPEC,
    );

    expect(result.notes)
      .toEqual(['"alpha": request failed (connection reset)']);
    expect(result.refs).toEqual([{ id: 'b1', slug: 'bravo' }]);
    expect(result.requests).toBe(2);
    expect(result.pages).toBe(1);
  });

  it('notes a status the source refused with', async () => {
    const transport = stubTransport({
      [listingUrl('alpha')]: { status: 503, ok: false },
    });
    const result = await listEndpoints(
      { endpoints: 'alpha', max_rows: 4, max_pages: 1 },
      transport,
      SPEC,
    );

    expect(result.notes)
      .toEqual(['"alpha": endpoint request failed with 503']);
    expect(result.pages).toBe(0);
  });

  it('notes a transport that answered nothing at all', async () => {
    const calls: string[] = [];
    const deps = {
      fetch: (url: string) => {
        calls.push(url);

        return Promise.resolve(undefined);
      },
    };
    const result = await listEndpoints(
      { endpoints: 'alpha', max_rows: 4, max_pages: 1 },
      deps,
      SPEC,
    );

    expect(result.notes)
      .toEqual(['"alpha": endpoint request failed with no response']);
    expect(calls).toHaveLength(1);
  });

  it('notes a body that would not parse', async () => {
    const transport = stubTransport({
      [listingUrl('alpha')]: { bodyThrows: 'Unexpected token <' },
    });
    const result = await listEndpoints(
      { endpoints: 'alpha', max_rows: 4, max_pages: 1 },
      transport,
      SPEC,
    );

    expect(result.notes)
      .toEqual(['"alpha": response was not JSON (Unexpected token <)']);
    expect(result.pages).toBe(0);
  });

  it('reads a payload holding no array as an empty listing', async () => {
    const transport = stubTransport({
      [listingUrl('alpha')]: { body: { items: 'not a list' }, etag: 'W/1' },
    });
    const result = await listEndpoints(
      { endpoints: 'alpha', max_rows: 4, max_pages: 1 },
      transport,
      SPEC,
    );

    expect(result.refs).toEqual([]);
    expect(result.pages).toBe(1);
    expect(result.next_cursor)
      .toBe('{"alpha":{"seen":"","etag":"W/1"}}');
  });
});

describe('paged-list — a listing that is unchanged', () => {
  it('notes a 304 and leaves that endpoint\'s cursor alone', async () => {
    const transport = stubTransport({
      [listingUrl('alpha')]: { status: 304, ok: false, etag: 'W/2' },
    });
    const stored = '{"alpha":{"seen":"2026-01-01T00:00:00.000Z",'
      + '"etag":"W/1"}}';
    const result = await listEndpoints(
      { endpoints: 'alpha', max_rows: 4, max_pages: 1, cursor: stored },
      transport,
      SPEC,
    );

    expect(result.notes).toEqual(['"alpha": unchanged since the last run']);
    expect(result.next_cursor).toBe(stored);
    expect(result.pages).toBe(0);
    expect(result.requests).toBe(1);
  });
});

describe('paged-list — what a run takes and in what order', () => {
  it('takes the oldest records first', async () => {
    const transport = stubTransport({
      [listingUrl('alpha')]: {
        body: listingBody([
          { id: 'c', at: '2026-01-03T00:00:00Z' },
          { id: 'a', at: '2026-01-01T00:00:00Z' },
          { id: 'b', at: '2026-01-02T00:00:00Z' },
        ]),
      },
    });
    const result = await listEndpoints(
      { endpoints: 'alpha', max_rows: 2, max_pages: 1 },
      transport,
      SPEC,
    );

    expect(result.refs.map((ref) => ref.id)).toEqual(['a', 'b']);
    expect(result.notes)
      .toEqual(['"alpha": 2 of 3 new records taken (row cap)']);
  });

  it('takes nothing already behind the high water mark', async () => {
    const transport = stubTransport({
      [listingUrl('alpha')]: {
        body: listingBody([
          { id: 'a', at: '2026-01-01T00:00:00Z' },
          { id: 'b', at: '2026-01-02T00:00:00Z' },
          { id: 'c', at: '2026-01-03T00:00:00Z' },
        ]),
      },
    });
    const result = await listEndpoints(
      {
        endpoints: 'alpha',
        max_rows: 9,
        max_pages: 1,
        cursor: '{"alpha":{"seen":"2026-01-02T00:00:00.000Z"}}',
      },
      transport,
      SPEC,
    );

    expect(result.refs.map((ref) => ref.id)).toEqual(['c']);
  });

  // An item whose timestamp the source did not state is always
  // fresh, and sorts ahead of everything dated: dropping it would
  // lose a record over a field the source never promised.
  it('always takes a record stating no timestamp, oldest first', async () => {
    const transport = stubTransport({
      [listingUrl('alpha')]: {
        body: listingBody([
          { id: 'dated', at: '2026-01-01T00:00:00Z' },
          { id: 'undated' },
        ]),
      },
    });
    const result = await listEndpoints(
      {
        endpoints: 'alpha',
        max_rows: 9,
        max_pages: 1,
        cursor: '{"alpha":{"seen":"2026-06-01T00:00:00.000Z"}}',
      },
      transport,
      SPEC,
    );

    expect(result.refs.map((ref) => ref.id)).toEqual(['undated']);
  });

  // Characterization: the spec refusing an item drops it from the
  // result, and it was still counted against the row budget.
  it('drops a record its spec cannot read, having counted it', async () => {
    const spec: PagedListSpec<TakenRef> = {
      ...SPEC,
      refFrom: (item, endpoint) => ((item as StubItem).id === 'skip'
        ? null
        : { id: (item as StubItem).id, slug: endpoint.slug }),
    };
    const transport = stubTransport({
      [listingUrl('alpha')]: {
        body: listingBody([
          { id: 'skip', at: '2026-01-01T00:00:00Z' },
          { id: 'keep', at: '2026-01-02T00:00:00Z' },
          { id: 'later', at: '2026-01-03T00:00:00Z' },
        ]),
      },
    });
    const result = await listEndpoints(
      { endpoints: 'alpha', max_rows: 2, max_pages: 1 },
      transport,
      spec,
    );

    expect(result.refs.map((ref) => ref.id)).toEqual(['keep']);
    expect(result.next_cursor)
      .toBe('{"alpha":{"seen":"2026-01-02T00:00:00.000Z"}}');
  });
});

describe('paged-list — the row budget between endpoints', () => {
  it('divides the budget evenly before the run starts', async () => {
    const three = [
      { id: '1', at: '2026-01-01T00:00:00Z' },
      { id: '2', at: '2026-01-02T00:00:00Z' },
      { id: '3', at: '2026-01-03T00:00:00Z' },
    ];
    const transport = stubTransport({
      [listingUrl('alpha')]: { body: listingBody(three) },
      [listingUrl('bravo')]: { body: listingBody(three) },
    });
    const result = await listEndpoints(
      { endpoints: 'alpha,bravo', max_rows: 4, max_pages: 1 },
      transport,
      SPEC,
    );

    expect(result.refs.map((ref) => `${ref.slug}/${String(ref.id)}`))
      .toEqual(['alpha/1', 'alpha/2', 'bravo/1', 'bravo/2']);
  });

  // Characterization: an endpoint that answered nothing does NOT
  // hand its share to the next one, because the share was computed
  // from the endpoint COUNT before any request was made.
  it('does not hand an empty endpoint\'s share to the next', async () => {
    const transport = stubTransport({
      [listingUrl('alpha')]: { body: listingBody([]) },
      [listingUrl('bravo')]: {
        body: listingBody([
          { id: '1', at: '2026-01-01T00:00:00Z' },
          { id: '2', at: '2026-01-02T00:00:00Z' },
          { id: '3', at: '2026-01-03T00:00:00Z' },
        ]),
      },
    });
    const result = await listEndpoints(
      { endpoints: 'alpha,bravo', max_rows: 4, max_pages: 1 },
      transport,
      SPEC,
    );

    expect(result.refs).toHaveLength(2);
  });

  it('keeps one endpoint\'s cursor out of another\'s', async () => {
    const transport = stubTransport({
      [listingUrl('alpha')]: {
        body: listingBody([{ id: 'a', at: '2026-06-01T00:00:00Z' }]),
      },
      [listingUrl('bravo')]: {
        body: listingBody([{ id: 'b', at: '2026-01-01T00:00:00Z' }]),
      },
    });
    const result = await listEndpoints(
      { endpoints: 'alpha,bravo', max_rows: 9, max_pages: 1 },
      transport,
      SPEC,
    );

    expect(result.next_cursor).toBe(
      '{"alpha":{"seen":"2026-06-01T00:00:00.000Z"},'
      + '"bravo":{"seen":"2026-01-01T00:00:00.000Z"}}',
    );
  });
});

describe('paged-list — what the cursor is allowed to record', () => {
  it('stores the tag only when the listing was read to the end', async () => {
    const transport = stubTransport({
      [listingUrl('alpha')]: {
        etag: 'W/complete',
        body: listingBody([{ id: 'a', at: '2026-01-01T00:00:00Z' }]),
      },
    });
    const result = await listEndpoints(
      { endpoints: 'alpha', max_rows: 9, max_pages: 1 },
      transport,
      SPEC,
    );

    expect(result.next_cursor).toBe(
      '{"alpha":{"seen":"2026-01-01T00:00:00.000Z","etag":"W/complete"}}',
    );
  });

  it('stores no tag when the row cap cut the listing short', async () => {
    const transport = stubTransport({
      [listingUrl('alpha')]: {
        etag: 'W/partial',
        body: listingBody([
          { id: 'a', at: '2026-01-01T00:00:00Z' },
          { id: 'b', at: '2026-01-02T00:00:00Z' },
        ]),
      },
    });
    const result = await listEndpoints(
      { endpoints: 'alpha', max_rows: 1, max_pages: 1 },
      transport,
      SPEC,
    );

    expect(result.next_cursor).toBe(STORED_ALPHA);
    expect(result.notes)
      .toEqual(['"alpha": 1 of 2 new records taken (row cap)']);
  });

  it('backs out of a group sharing one timestamp', async () => {
    const transport = stubTransport({
      [listingUrl('alpha')]: {
        body: listingBody([
          { id: 'a', at: '2026-01-01T00:00:00Z' },
          { id: 'b', at: '2026-01-02T00:00:00Z' },
          { id: 'c', at: '2026-01-02T00:00:00Z' },
        ]),
      },
    });
    const result = await listEndpoints(
      { endpoints: 'alpha', max_rows: 2, max_pages: 1 },
      transport,
      SPEC,
    );

    expect(result.refs.map((ref) => ref.id)).toEqual(['a', 'b']);
    expect(result.next_cursor)
      .toBe('{"alpha":{"seen":"2026-01-01T00:00:00.000Z"}}');
  });

  it('says so when one timestamp fills the whole budget', async () => {
    const transport = stubTransport({
      [listingUrl('alpha')]: {
        body: listingBody([
          { id: 'a', at: '2026-01-02T00:00:00Z' },
          { id: 'b', at: '2026-01-02T00:00:00Z' },
          { id: 'c', at: '2026-01-02T00:00:00Z' },
        ]),
      },
    });
    const result = await listEndpoints(
      { endpoints: 'alpha', max_rows: 2, max_pages: 1 },
      transport,
      SPEC,
    );

    expect(result.next_cursor).toBe('');
    expect(result.notes).toEqual([
      '"alpha": 2 records share one timestamp and fill the row budget;'
      + ' raise max_rows to advance past them',
      '"alpha": 2 of 3 new records taken (row cap)',
    ]);
  });
});
