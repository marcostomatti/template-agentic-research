/**
 * @packageDocumentation
 * paged-list — the fetch half a family of listing sources share: one
 * `sources` row names several endpoints, each endpoint answers with a
 * list, and a cursor carries where the last run stopped.
 *
 * NOT an adapter, which is the first thing to know about the file. It
 * declares no member of the `SourceAdapter` contract in
 * `src/sources/index.ts`, fronts no source of its own and appears in
 * no registry. What it is, is the loop an adapter runs INSIDE its own
 * `SourceAdapter.fetch`: the adapter supplies the four things
 * that differ between one listing source and the next — where the URL
 * is, where the array is, how one item reads, and which field is that
 * item's timestamp — and everything else, the bounds, the cursor and
 * the notes, lives here once.
 *
 * It therefore sits beside the adapters for the same reason
 * `html-text.ts` does, and is the second module in this directory
 * that satisfies no contract. It is not the same KIND of helper: that
 * one is a pure text reduction and this one is the step that does the
 * I/O, through a `fetch` its caller hands it.
 *
 * ## The rename, and why the port carries one
 *
 * The original is named for the particular kind of listing it was
 * written against, and that name is subject matter rather than
 * mechanism — this repository researches whatever a domain's rows
 * say it researches, and compiling one subject into a filename in
 * `src/` would be the first place another domain reads as somebody
 * else's platform. What the module actually IS is a cursor-paged
 * list over several endpoints, so `paged-list` is the name, and every
 * declaration in the file follows it.
 *
 * The vocabulary is renamed the whole way down rather than at the
 * filename alone, because a half-renamed module is worse than either
 * end: an ENDPOINT is one of the listing URLs a `parser_config`
 * names, a RECORD is one item such a listing answers with, and a
 * SLUG is the handle that identifies an endpoint inside its own URL
 * and inside the cursor. The two config keys the original spells in
 * its own subject matter are renamed with them — the list of
 * endpoints arrives as `endpoints`, and the envelope
 * {@link unwrapListPayload} reads carries `endpoint` and `record`.
 * The bounds keep their names, `base_url`, `max_rows`, `max_pages`
 * and `cursor` being about the mechanism already.
 *
 * PAGED is worth one sentence of its own, because a reader could
 * take it for something the endpoints do. They do not page: for the
 * shape this was extracted from, one endpoint is one request, which
 * is why `max_pages` is effectively on (`>= 1`) or off (`0`) and is
 * said plainly here rather than dressed up as paging that does not
 * exist. The paging is ACROSS RUNS and it is the cursor: each run
 * takes the oldest records it has not seen, up to the row cap, and
 * the next run resumes from the timestamp this one stored.
 *
 * ## Two rules, both here because the alternative fails silently
 *
 * THE CURSOR IS PER ENDPOINT. One timestamp shared across endpoints
 * would let the endpoint with the newest record set a high-water
 * mark that skips every older endpoint forever, and the run would
 * look successful with a permanent hole in the corpus.
 *
 * AN ETAG IS ONLY STORED WHEN THE ENDPOINT WAS FULLY CONSUMED. If
 * the row cap stopped the run mid-endpoint, the next run's
 * `If-None-Match` would answer 304 for a listing it has not finished
 * reading, and the remainder would never arrive.
 *
 * A third rule falls out of the second and is easier to lose: the
 * cursor never advances INTO a group of records that share one
 * timestamp. The ones left behind would be filtered out on the next
 * run and never collected. Re-reading the group costs a converged
 * row; skipping it loses the record.
 *
 * ## What refuses, and what only reports
 *
 * Nothing here throws for input reasons. A transport failure, a
 * response that is not JSON, an endpoint handle that is not one — all
 * of them stop THAT endpoint with a note and leave the rest of the
 * run alone, and the notes come back in the result. The single throw
 * is {@link listEndpoints} refusing a `deps` with no `fetch`, which
 * is a programming error rather than a datum.
 *
 * ## What this port takes as input, and why
 *
 * ONE divergence beyond the rename, and it is the reason the
 * signature reads the way it does: `fetch` is INJECTED and never
 * reached for. The original takes an optional `deps.fetch` and falls
 * back to whatever global the runtime offers, which was right for a
 * module that only ever ran inside a workflow node. Here the fallback
 * is the failure mode: the default test suite touches no external
 * service by law, and a module that can reach a global `fetch` is one
 * an absent-minded case can put on the network without anybody
 * writing a URL. Requiring the dependency makes the I/O visible in
 * the call, and makes the isolated-suite rule enforceable by reading
 * the signature rather than by trusting the test.
 *
 * A reader who finds the original should read that as this platform
 * having a test law the original did not, not as a mistake.
 *
 * ## What the port keeps
 *
 * Everything else, and `tests/parity/paged-list.parity.test.ts` is
 * what says so rather than this paragraph. Six of the seven exports
 * are compared against their originals there, input for input — the
 * cursor codec both ways, the stamp coercion, the endpoint list, the
 * display-name fallback and the payload unwrap. The two that read a
 * renamed key are still inside that leg, because the leg DISCOVERS
 * the original's key names at run time rather than writing them
 * down.
 *
 * {@link listEndpoints} is the one export outside it, and neither
 * half of the reason can be arranged around: its transport is
 * injected here and global there, so the two do not answer the same
 * call, and every note it produces was re-authored in this
 * repository's vocabulary, so two runs would part on every note over
 * a port behaving exactly as intended. That half is characterized in
 * `src/sources/paged-list.test.ts` instead, which for a function
 * with no parity gate is the only description of it there is.
 *
 * Two preserved behaviours are worth finding here rather than in a
 * debugger, and both come from writing a decoded key into a plain
 * object.
 *
 * {@link parseListCursor} builds its answer as `{}`, so a stored
 * cursor whose JSON carries a `__proto__` key does not produce an own
 * key at all: the assignment goes through the inherited setter and
 * replaces the answer's prototype instead. {@link formatListCursor}
 * does the same on the way out, where the effect is visible — the
 * key is counted as kept and then serializes to nothing, so such a
 * map comes back as `{}` rather than as the empty string. Both are
 * the original's, both are pinned by cases, and neither is repaired
 * here: `Object.create(null)` would turn each into a real own key,
 * which is a change in what the cursor column holds and a decision
 * for the phase that owns the callers.
 *
 * ## What the port drops, none of it behaviour
 *
 * The CommonJS export block at the foot of the original becomes
 * declaration exports, which is what a splice strips and what a Code
 * node can run. `var` becomes `const` and `let`. The two-letter
 * prefix every internal declaration carried is gone, a module having
 * a namespace of its own. `Object.prototype.hasOwnProperty.call`
 * becomes `Object.hasOwn`, and the one place that pairs it with a
 * `for...in` becomes `Object.entries`, which enumerates exactly the
 * own enumerable keys the pair selected. `isFinite` and `isNaN`
 * become their `Number` forms, which differ only for values that are
 * not numbers and are only ever reached here with numbers. And index
 * loops become `for...of` wherever the index was only ever used to
 * reach the element.
 *
 * ## One file, past the generic size guidance
 *
 * Deliberate, and the reason is the cursor rather than the length.
 * The reader and the writer have to agree byte for byte about a
 * format nothing else validates, and the loop is the only caller
 * of either — split across modules, a change to one half would
 * lint, type-check and pass its own cases while writing a cursor
 * the other half decodes to nothing, which is a run that silently
 * re-reads everything forever. The original is one module for the
 * same reason and the port keeps it.
 */

// ---------------------------------------------------------------------------
// The shapes a caller sees
// ---------------------------------------------------------------------------

/** One listing endpoint an operator named, and what to call it. */
export interface EndpointRef {
  /**
   * The handle that identifies this endpoint inside its own URL and
   * inside the cursor. Bounded by {@link ENDPOINT_HANDLE_RE}.
   */
  readonly slug: string;

  /**
   * What to show for it: the operator's own text when the config
   * carried one, and {@link slugToEndpointName} of the slug when it
   * did not.
   */
  readonly name: string;
}

/** What an endpoint list parsed into, refusals included. */
export interface EndpointList {
  /** The endpoints to read, in config order, deduplicated. */
  readonly endpoints: readonly EndpointRef[];

  /**
   * Every entry whose slug is not a handle, verbatim. Reported
   * rather than dropped: a typo in operator config is a thing to
   * say out loud, and the run continues without it.
   */
  readonly rejected: readonly string[];
}

/** One endpoint's place in the cursor. */
export interface CursorEntry {
  /**
   * The newest record timestamp this endpoint has been read up to,
   * as a UTC instant, or `''` when it has never been read.
   */
  readonly seen: string;

  /**
   * The entity tag to send next time, or `''` when there is none to
   * send — which is what a run that stopped mid-endpoint leaves,
   * deliberately.
   */
  readonly etag: string;
}

/** The whole cursor, keyed by endpoint slug. */
export type ListCursor = Record<string, CursorEntry>;

/** What {@link unwrapListPayload} recovered from a stored payload. */
export interface UnwrappedRecord {
  /** The source's own item, verbatim. */
  readonly item: unknown;

  /**
   * The provenance the envelope added, or `{}` when the payload
   * carried none — which is what a bare recorded response leaves.
   */
  readonly endpoint: Readonly<Record<string, unknown>>;
}

/**
 * The part of a response this module reads.
 *
 * Declared here rather than taken from a global, because the service
 * compiles against `es2022` with no DOM library at all: there is no
 * ambient `Response` to name. Every member is optional except the
 * body reader, which mirrors what the code actually does — a
 * response missing `ok`, `status` or `headers` is handled rather
 * than assumed away.
 */
export interface PagedListResponse {
  /** Whether the status was a success, as the fetch standard means it. */
  readonly ok?: boolean;

  /** The status code, read for the 304 case and for the failure note. */
  readonly status?: number;

  /** Response headers, read only for the entity tag. */
  readonly headers?: { get(name: string): string | null };

  /** The parsed body, or a rejection this module turns into a note. */
  json(): Promise<unknown>;
}

/**
 * The one call this module makes, in the shape it makes it.
 *
 * A real `fetch` satisfies it structurally, and so does a function a
 * case wrote: the point of naming the type is that the caller has to
 * supply one either way.
 */
export type FetchLike = (
  url: string,
  init: { readonly headers: Readonly<Record<string, string>> },
) => Promise<PagedListResponse | null | undefined>;

/** Everything {@link listEndpoints} reaches outside itself. */
export interface PagedListDeps {
  /** How to make a request. Required — see the module header. */
  readonly fetch: FetchLike;
}

/**
 * The four things one listing source differs from the next by.
 *
 * An adapter supplies these once, at construction, alongside the
 * `sources` row it was built for. Everything else about a listing run
 * is in this module.
 *
 * @typeParam Ref - What one taken record is handed back as.
 */
export interface PagedListSpec<Ref> {
  /** The base URL to use when the config names none. */
  readonly defaultBaseUrl: string;

  /**
   * Where this source's listing lives, from the base URL and one
   * already percent-encoded slug.
   */
  urlFor(baseUrl: string, slug: string): string;

  /**
   * Where the array is inside a payload. Anything that is not an
   * array is read as an empty listing.
   */
  itemsFrom(payload: unknown): unknown;

  /**
   * Which field of one item is its timestamp. Coerced by
   * {@link listStamp} afterwards, so any of the shapes that function
   * accepts is fine here.
   */
  stampOf(item: unknown): unknown;

  /**
   * One item, as the caller wants it back. A falsy answer drops the
   * record from the result while still counting against the budget,
   * which is the original's behaviour and is what lets a spec refuse
   * an item it could not read.
   */
  refFrom(item: unknown, endpoint: EndpointRef): Ref | null;
}

/** What one listing run did. */
export interface PagedListResult<Ref> {
  /** Every record taken, oldest first within each endpoint. */
  readonly refs: readonly Ref[];

  /** How many listings were read to the end of their payload. */
  readonly pages: number;

  /** How many requests were made, failures included. */
  readonly requests: number;

  /**
   * The cursor to store, or `''` when there is nothing worth
   * storing. Named for the `source_cursors.cursor` column it lands
   * in rather than in this file's own casing, so a writer spreading
   * the result into a row has no field to rename.
   */
  readonly next_cursor: string;

  /**
   * Everything worth saying about the run, in the order it happened.
   * A note is never a failure of the run — it is the record of an
   * endpoint that was skipped, capped or unchanged.
   */
  readonly notes: readonly string[];
}

// ---------------------------------------------------------------------------
// Small shared pieces
// ---------------------------------------------------------------------------

/**
 * The shape an endpoint handle has to have.
 *
 * The slug is operator-supplied config that lands in a URL PATH, so
 * its shape is bounded the way an entity name is bounded: not
 * because a handle can say something dangerous, but because anything
 * that is not a handle would change the request SHAPE. It is also
 * percent-encoded at the point of use — the check and the encoding
 * are independent, and the check is what makes a typo loud instead
 * of a 404 three steps later.
 */
const ENDPOINT_HANDLE_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

/**
 * Any value as text, with absence as the empty string.
 *
 * `null` and `undefined` become `''` rather than their own spelling,
 * which is what keeps a missing field out of a URL and out of a
 * note. Every other value goes through `String`, so a value whose
 * conversion refuses refuses here — the callers that must not throw
 * wrap this in their own try.
 *
 * @param value - Anything.
 * @returns Its text, or `''` for absence.
 */
function str(value: unknown): string {
  return value == null
    ? ''
    : String(value);
}

/**
 * A property read off a value that may not have one.
 *
 * Written once because five call sites want it and each of them
 * would otherwise carry its own cast. Reads through to the value
 * whatever it is — a string, a number and a function all answer
 * `undefined` for a key they do not have, exactly as the original
 * relied on.
 *
 * @param value - Anything, absence included.
 * @param key - The property wanted.
 * @returns Its value, or `undefined`.
 */
function readKey(value: unknown, key: string): unknown {
  return value == null
    ? undefined
    : (value as Record<string, unknown>)[key];
}

/**
 * What a thrown value should be called in a note.
 *
 * A thrown `Error` is named by its message and anything else by its
 * own text, which is the original's shape. A value whose conversion
 * refuses throws out of here — the same exposure the original has,
 * and the caller's own catch is what a listing run relies on.
 *
 * @param error - Whatever was thrown.
 * @returns One clause for a note.
 */
function errorText(error: unknown): string {
  const message = readKey(error, 'message');

  return message
    ? String(message)
    : String(error);
}

// ---------------------------------------------------------------------------
// The endpoint list
// ---------------------------------------------------------------------------

/**
 * A handle, as something to show a reader.
 *
 * A listing payload does not always state a name for the thing it
 * lists, and something has to supply one. The only thing the SOURCE
 * offers is the handle in its own URL, so this is that fallback —
 * and it is a fallback: the config accepts `slug=Display Name`
 * precisely because a handle is not a name, and the name reaches the
 * research cache, where a wrong one is expensive.
 *
 * @param slug - A handle, or anything that reads as one.
 * @returns The handle with its separators spaced and each word
 *   capitalized, or `''` when there was nothing to capitalize.
 */
export function slugToEndpointName(slug: unknown): string {
  const words = str(slug)
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ');
  const out: string[] = [];

  for (const word of words) {
    if (!word) {
      continue;
    }

    out.push(word.charAt(0).toUpperCase() + word.slice(1));
  }

  return out.join(' ');
}

/**
 * The endpoints a config names, and the entries that were not
 * handles.
 *
 * Accepts the config's `endpoints` as either an array or one comma
 * separated string, because a `parser_config` is JSON an operator
 * edits and both spellings arrive. Each entry is `slug` or
 * `slug=Display Name`. Duplicates are dropped case-insensitively on
 * the slug, first spelling winning, so an endpoint named twice with
 * two display names is read once.
 *
 * Never throws: an entry that is not a handle is reported in
 * {@link EndpointList.rejected} and the rest of the list is read.
 *
 * @param config - A `parser_config`, or anything at all.
 * @returns The endpoints to read and the entries that were refused.
 */
export function parseEndpointList(config: unknown): EndpointList {
  const raw: unknown = readKey(config, 'endpoints') ?? '';
  const parts: readonly unknown[] = Array.isArray(raw)
    ? raw
    : str(raw).split(',');
  const endpoints: EndpointRef[] = [];
  const rejected: string[] = [];
  // A plain object, and the duplicate test below is `Object.hasOwn`,
  // so the one key this drops silently is `__proto__` — which the
  // handle pattern rejects two lines earlier, an underscore being no
  // way to start a handle. Kept as the original wrote it; see the
  // module header for why the two readers that CAN reach that key
  // keep it too.
  const seen: Record<string, boolean> = {};

  for (const part of parts) {
    const entry = str(part).trim();

    if (!entry) {
      continue;
    }

    const equals = entry.indexOf('=');
    const slug = (equals < 0
      ? entry
      : entry.slice(0, equals)).trim();
    const name = equals < 0
      ? ''
      : entry.slice(equals + 1).trim();

    if (!slug) {
      continue;
    }

    if (!ENDPOINT_HANDLE_RE.test(slug)) {
      rejected.push(slug);
      continue;
    }

    const key = slug.toLowerCase();

    if (Object.hasOwn(seen, key)) {
      continue;
    }

    seen[key] = true;
    endpoints.push({ slug, name: name || slugToEndpointName(slug) });
  }

  return { endpoints, rejected };
}

// ---------------------------------------------------------------------------
// The cursor codec
// ---------------------------------------------------------------------------

/**
 * A stored cursor, read.
 *
 * The `source_cursors.cursor` column is free text and each source
 * owns what it puts there. Anything that is not this module's own
 * JSON object — an empty column, another source's bare timestamp, an
 * operator's hand edit — decodes to NO CURSOR rather than to an
 * error: a re-read is harmless, since the convergence upsert absorbs
 * it, and a throw here would take down a run over a value nobody
 * promised.
 *
 * Every entry is normalized on the way in, so a hand-edited cursor
 * carrying a number, a null or a nested object for `seen` comes back
 * as text the comparison can use.
 *
 * @param text - The stored column, or anything at all.
 * @returns One entry per endpoint the cursor named.
 */
export function parseListCursor(text: unknown): ListCursor {
  const out: ListCursor = {};

  try {
    const source = str(text).trim();

    if (!source || source.charAt(0) !== '{') {
      return out;
    }

    const doc: unknown = JSON.parse(source);

    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
      return out;
    }

    for (const [key, value] of Object.entries(doc)) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        continue;
      }

      out[key] = {
        seen: str(readKey(value, 'seen')).trim(),
        etag: str(readKey(value, 'etag')).trim(),
      };
    }
  } catch {
    return {};
  }

  return out;
}

/**
 * A cursor, as the string to store.
 *
 * Keys are sorted so an unchanged cursor is byte-identical between
 * runs, which is what lets the runner write only when the string
 * moved. An entry with neither half is dropped rather than stored as
 * an empty object, and a cursor with no entry left comes back as
 * `''` — the value that means "nothing to store" everywhere this
 * result is read.
 *
 * The entity tag is omitted rather than stored empty, so the shape
 * of a stored entry says by itself whether its endpoint was fully
 * consumed last run.
 *
 * @param map - A cursor, or anything at all.
 * @returns The JSON to store, or `''`.
 */
export function formatListCursor(map: unknown): string {
  const source = (map as Record<string, unknown> | null | undefined) || {};
  const keys = Object.keys(source).sort();
  const out: Record<string, { seen: string; etag?: string }> = {};
  let kept = 0;

  for (const key of keys) {
    const value = source[key];
    const seen = str(readKey(value, 'seen')).trim();
    const etag = str(readKey(value, 'etag')).trim();

    if (!seen && !etag) {
      continue;
    }

    out[key] = etag
      ? { seen, etag }
      : { seen };
    kept += 1;
  }

  return kept
    ? JSON.stringify(out)
    : '';
}

// ---------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------

/**
 * A timestamp, as a comparable instant.
 *
 * Sources state their timestamps in their own way — an ISO string
 * carrying a local offset from one, epoch milliseconds from the next
 * — and a cursor compared as TEXT has to be normalized or an
 * afternoon in one offset sorts before a morning in another, which
 * is the wrong way round. Everything becomes a UTC instant, so
 * lexical order is chronological and the comparison in the listing
 * loop is a string comparison.
 *
 * Absence and unreadable input both come back as `''`, which the
 * loop reads as "no timestamp" rather than as an epoch.
 *
 * @param value - A number of milliseconds, a `Date`, a parseable
 *   string, or anything else.
 * @returns The instant in ISO form, or `''`.
 * @throws RangeError - For a finite number outside the range a
 *   `Date` can hold. The original throws there too, and the listing
 *   loop does not guard it: a spec whose `stampOf` answers such a
 *   number is a programming error, where every other unreadable
 *   value is a datum.
 */
export function listStamp(value: unknown): string {
  if (value == null || value === '') {
    return '';
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? ''
      : value.toISOString();
  }

  const text = str(value).trim();

  if (!text) {
    return '';
  }

  const parsed = Date.parse(text);

  return Number.isNaN(parsed)
    ? ''
    : new Date(parsed).toISOString();
}

// ---------------------------------------------------------------------------
// The listing run
// ---------------------------------------------------------------------------

/** One item of a listing, with the instant it states. */
interface StampedItem {
  /** The source's own item, untouched. */
  readonly item: unknown;

  /** Its timestamp as {@link listStamp} read it, `''` when unreadable. */
  readonly stamp: string;
}

/**
 * Oldest first, with the undated ahead of everything.
 *
 * Ascending matters for the same reason the cursor does: a capped
 * run takes the OLDEST unseen records and the next run resumes
 * exactly where it stopped, where descending would take the newest
 * and skip everything behind them, permanently.
 *
 * @param a - One item.
 * @param b - Another.
 * @returns The usual comparator answer.
 */
function compareByStamp(a: StampedItem, b: StampedItem): number {
  if (a.stamp === b.stamp) {
    return 0;
  }

  if (!a.stamp) {
    return -1;
  }

  if (!b.stamp) {
    return 1;
  }

  return a.stamp < b.stamp
    ? -1
    : 1;
}

/**
 * One response header, or `''`.
 *
 * Guarded rather than trusted, because the response is whatever the
 * injected fetch answered: a case may hand back an object with no
 * headers at all, and a header accessor is entitled to throw.
 *
 * @param res - The response, absence included.
 * @param name - The header wanted.
 * @returns Its value trimmed, or `''`.
 */
function headerValue(
  res: PagedListResponse | null | undefined,
  name: string,
): string {
  try {
    const headers = res?.headers;

    if (headers && typeof headers.get === 'function') {
      return str(headers.get(name)).trim();
    }
  } catch {
    return '';
  }

  return '';
}

/**
 * The injected fetch, or a refusal naming what is missing.
 *
 * The one throw in this module, and it is a programming error rather
 * than a datum: every input fault becomes a note.
 *
 * @param deps - What the caller supplied.
 * @returns The function to call.
 * @throws TypeError - When no `fetch` was supplied.
 */
function requireFetch(deps: PagedListDeps | null | undefined): FetchLike {
  const supplied = readKey(deps, 'fetch');

  if (typeof supplied !== 'function') {
    throw new TypeError(
      '[paged-list] listEndpoints needs deps.fetch: this module never '
      + 'reaches for a global fetch, so the caller names the transport.',
    );
  }

  return supplied as FetchLike;
}

/**
 * Read every endpoint a config names, oldest records first, within
 * the bounds the config sets.
 *
 * The bounds, and what each one answers:
 *
 * - `endpoints` — WHICH endpoints. Operator-curated, never
 *   discovered: nothing here crawls.
 * - `max_rows` — how many records the whole run may take, DIVIDED
 *   between the endpoints so one large listing cannot starve the
 *   rest, and checked between endpoints so a long list cannot turn
 *   into a long list of requests.
 * - `max_pages` — how many requests one endpoint may cost. One
 *   endpoint is one request for this shape, so it is effectively on
 *   (`>= 1`) or off (`0`).
 * - `base_url` — where to send them, defaulting to the spec's.
 * - `cursor` — the stored column, read by {@link parseListCursor}.
 *
 * Never throws for input reasons. A transport failure stops that one
 * endpoint with a note, not the run.
 *
 * @typeParam Ref - What one taken record is handed back as.
 * @param config - The `sources` row's `parser_config`, or anything.
 * @param deps - The injected transport.
 * @param spec - What this listing source differs by.
 * @returns What the run took, cost, and has to say.
 * @throws TypeError - When `deps` carries no `fetch`.
 */
export async function listEndpoints<Ref>(
  config: unknown,
  deps: PagedListDeps,
  spec: PagedListSpec<Ref>,
): Promise<PagedListResult<Ref>> {
  const cfg: unknown = config !== null && typeof config === 'object'
    ? config
    : {};
  const doFetch = requireFetch(deps);
  const baseUrl = str(readKey(cfg, 'base_url')).trim() || spec.defaultBaseUrl;
  const maxRows = Math.max(0, Number(readKey(cfg, 'max_rows')) || 0);
  const maxPages = Math.max(0, Number(readKey(cfg, 'max_pages')) || 0);

  const parsed = parseEndpointList(cfg);
  const refs: Ref[] = [];
  const notes: string[] = [];
  let pages = 0;
  let requests = 0;

  const cursorMap = parseListCursor(readKey(cfg, 'cursor'));
  const nextMap: ListCursor = {};

  for (const [key, entry] of Object.entries(cursorMap)) {
    nextMap[key] = { seen: entry.seen, etag: entry.etag };
  }

  for (const slug of parsed.rejected) {
    notes.push(`"${slug}" is not an endpoint handle and was skipped`);
  }

  if (!parsed.endpoints.length) {
    return {
      refs,
      pages: 0,
      requests: 0,
      next_cursor: formatListCursor(nextMap),
      notes: notes.concat(['no endpoints configured']),
    };
  }

  if (maxPages < 1) {
    return {
      refs,
      pages: 0,
      requests: 0,
      next_cursor: formatListCursor(nextMap),
      notes: notes.concat(['max_pages is 0, so no request was made']),
    };
  }

  const perEndpoint = Math.ceil(maxRows / parsed.endpoints.length);

  for (const endpoint of parsed.endpoints) {
    if (refs.length >= maxRows) {
      break;
    }

    const budget = Math.min(maxRows - refs.length, perEndpoint);

    if (budget <= 0) {
      break;
    }

    const prev = cursorMap[endpoint.slug] ?? { seen: '', etag: '' };
    const headers: Record<string, string> = { accept: 'application/json' };

    // Only ever sent for an endpoint that was finished last time, so
    // a 304 can never hide the tail of a listing the row cap cut
    // short.
    if (prev.etag) {
      headers['if-none-match'] = prev.etag;
    }

    let res: PagedListResponse | null | undefined;

    requests += 1;

    try {
      // Endpoints are read in sequence on purpose: the row budget
      // spent on one decides what the next one may take.
      res = await doFetch(
        spec.urlFor(baseUrl, encodeURIComponent(endpoint.slug)),
        { headers },
      );
    } catch (error) {
      notes.push(`"${endpoint.slug}": request failed (${errorText(error)})`);
      continue;
    }

    if (res && res.status === 304) {
      notes.push(`"${endpoint.slug}": unchanged since the last run`);
      continue;
    }

    if (!res || !res.ok) {
      const status = res && res.status != null
        ? String(res.status)
        : 'no response';

      notes.push(
        `"${endpoint.slug}": endpoint request failed with ${status}`,
      );
      continue;
    }

    let payload: unknown;

    try {
      payload = await res.json();
    } catch (error) {
      notes.push(
        `"${endpoint.slug}": response was not JSON (${errorText(error)})`,
      );
      continue;
    }

    pages += 1;

    const produced: unknown = spec.itemsFrom(payload);
    const items: readonly unknown[] = Array.isArray(produced)
      ? produced
      : [];

    // Only what is newer than this endpoint's high water mark. An
    // item with no readable timestamp is always fresh: dropping it
    // would lose a record over a field the source did not state.
    const fresh: StampedItem[] = [];

    for (const item of items) {
      const stamp = listStamp(spec.stampOf(item));

      if (prev.seen && stamp && stamp <= prev.seen) {
        continue;
      }

      fresh.push({ item, stamp });
    }

    fresh.sort(compareByStamp);

    const take = fresh.slice(0, budget);

    for (const entry of take) {
      const ref = spec.refFrom(entry.item, endpoint);

      if (ref) {
        refs.push(ref);
      }
    }

    const complete = take.length === fresh.length;
    const last = take.length
      ? take[take.length - 1]?.stamp ?? ''
      : '';
    let seen = prev.seen;

    if (take.length) {
      // Never advance INTO a group of records that share one
      // timestamp: the ones left behind would be filtered out on the
      // next run and never collected.
      const nextUp = complete
        ? undefined
        : fresh[take.length];

      if (nextUp === undefined || nextUp.stamp !== last) {
        if (last) {
          seen = last;
        }
      } else {
        let index = take.length - 1;

        while (index >= 0 && take[index]?.stamp === last) {
          index -= 1;
        }

        const stopped = index >= 0
          ? take[index]?.stamp ?? ''
          : '';

        if (stopped) {
          seen = stopped;
        } else {
          notes.push(
            `"${endpoint.slug}": ${take.length} records share one timestamp`
            + ' and fill the row budget; raise max_rows to advance past them',
          );
        }
      }
    }

    nextMap[endpoint.slug] = {
      seen,
      etag: complete
        ? headerValue(res, 'etag')
        : '',
    };

    if (!complete) {
      notes.push(
        `"${endpoint.slug}": ${take.length} of ${fresh.length} new records`
        + ' taken (row cap)',
      );
    }
  }

  return {
    refs,
    pages,
    requests,
    next_cursor: formatListCursor(nextMap),
    notes,
  };
}

// ---------------------------------------------------------------------------
// The stored payload
// ---------------------------------------------------------------------------

/**
 * One stored payload, with its provenance separated from the item.
 *
 * A listing run wraps each record as `{ endpoint, record }` because
 * not every listing states the thing it lists the way a canonical
 * document needs it — one shape carries no name for it at all, and a
 * handle out of a URL is not a name. The payload INSIDE is still
 * verbatim, so `documents.raw` remains a re-PARSE rather than a
 * re-fetch; the envelope only adds the provenance the payload is
 * missing.
 *
 * A bare payload is accepted too, so an adapter's `parse` stays
 * testable against a recorded response exactly as it came off the
 * wire. That is the whole of the branch: anything that is not an
 * envelope is the item, with no provenance.
 *
 * Note the asymmetry, which is the original's: the inner half must
 * be a non-array object for the envelope to be recognized at all,
 * while the provenance half is taken as-is whenever it is truthy and
 * an object. An envelope whose provenance is an array comes back
 * with that array, which is a shape no writer produces and which is
 * preserved rather than tidied.
 *
 * @param raw - A stored payload, enveloped or bare.
 * @returns The item and whatever provenance came with it.
 */
export function unwrapListPayload(raw: unknown): UnwrappedRecord {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const record = readKey(raw, 'record');

    if (record && typeof record === 'object' && !Array.isArray(record)) {
      const endpoint = readKey(raw, 'endpoint');

      return {
        item: record,
        endpoint: endpoint && typeof endpoint === 'object'
          ? endpoint as Record<string, unknown>
          : {},
      };
    }
  }

  return { item: raw, endpoint: {} };
}
