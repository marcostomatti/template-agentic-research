/**
 * @packageDocumentation
 * listing-api — a cursor-paged listing API, as a source adapter: one
 * `sources` row names several listing endpoints, each of them answers
 * with a page of records, and that row's `parser_config` says both
 * which endpoints those are and how to read one record out of a page.
 *
 * The first module in this directory to declare the five members of
 * `SourceAdapter`, and it composes rather than implements. The fetch
 * half is the loop in `./paged-list.ts`; the extraction half is the
 * engine in `../lib/parser-config.ts`, handed the markup step in
 * {@link selectText} — which is where the matcher in
 * `../lib/markup-select.ts` and the reduction in `./html-text.ts`
 * are paired, each of those files naming its caller as the place
 * that pairs them. What is written here is the wiring, plus the one
 * step none of them does: mapping a reading onto the five members of
 * a `CanonicalDocument`.
 *
 * ## The rename, and why the port carries one
 *
 * The origin module is named for the particular kind of listing it
 * was written against. That name is subject matter rather than
 * mechanism, and this platform researches whatever a domain's rows
 * say it researches — so compiling one subject into a filename under
 * `src/` would be the first place another domain reads as somebody
 * else's platform. `./paged-list.ts` records the same reasoning for
 * its own rename; the two are one decision applied in the two files
 * it reached, rather than two decisions that happen to agree.
 *
 * What the module IS is what it is now named for: a listing API
 * adapter. The vocabulary follows the filename the whole way down,
 * because a half-renamed module is worse than either end. An
 * ENDPOINT is one of the listing URLs a config names, a RECORD is
 * one item such a listing answers with, and a READING is what the
 * field map made of one record.
 *
 * ## `fetch` is the only member that does I/O
 *
 * The contract says so and this module is where the claim is either
 * kept or lost. {@link ListingApiAdapter.parse} and
 * {@link ListingApiAdapter.toCanonical} touch no network, no clock
 * and no filesystem: each is a function of what it was handed and of
 * what was bound at construction. That is what lets both be driven
 * over a payload stored on disk, which is what the cases beside this
 * file do and why they need nothing standing up.
 *
 * ## The transport is injected, and the default suite is why
 *
 * {@link ListingApiOptions.transport} is required and is never
 * reached for. There is no fallback to a global `fetch`, and the
 * absence is the point rather than an omission: the default suite
 * touches no external service by law, and a module that can find a
 * transport on its own is one an absent-minded case can put on the
 * network without anybody writing a URL. Requiring it makes the I/O
 * visible in the construction call, which makes the isolated-suite
 * rule enforceable by reading a signature instead of by trusting a
 * test. `./paged-list.ts` states the same rule for the loop this
 * module hands its transport to; here it is stated for the adapter
 * that owns the row.
 *
 * ## What a `parser_config` says here
 *
 * The column is one object read by three modules, and every key
 * below is data those modules execute rather than code any of them
 * runs.
 *
 * - `endpoints`, `base_url`, `max_rows`, `max_pages` and `cursor`
 *   are read by `./paged-list.ts`, whose header documents each of
 *   them and what happens when one is absent.
 * - `listing_path` is where one endpoint's listing sits under the
 *   base URL, with {@link SLUG_TOKEN} standing in for the endpoint
 *   handle. Defaults to {@link DEFAULT_LISTING_PATH}.
 * - `recordsPath` is where the array of records sits inside one
 *   listing response. The engine's own key, read HERE rather than
 *   inside `parse`, because the loop is what walks a response: by
 *   the time `parse` is handed anything the records have already
 *   been taken out one at a time, and applying the path a second
 *   time would look for the array inside one of its own members.
 * - `stamp_path` is which member of one record carries the timestamp
 *   the cursor advances over. Absent means every record is fresh,
 *   which is what `./paged-list.ts` does with a stamp it cannot
 *   read.
 * - `fields` is the field map, applied to one record. Two of its
 *   member names are read by {@link ListingApiAdapter.toCanonical}
 *   and every other one is extraction a `findings` row is built
 *   from.
 *
 * The casing is mixed and is inherited rather than chosen. Each key
 * is spelled the way the module that reads it spells its own, and
 * the two this file adds sit with the half they belong to.
 *
 * ## What `toCanonical` maps
 *
 * {@link URL_FIELD} and {@link BODY_FIELD} are the two field-map
 * members a `documents` row takes directly, and they are read by
 * name rather than through a second mapping in the config. One
 * naming convention costs an operator one sentence of documentation;
 * a mapping from field names to column names would be a second
 * config to get wrong, and getting it wrong would produce documents
 * with no body and nothing to say why.
 *
 * The hash is a digest over that pair, whitespace-collapsed and
 * JSON-encoded so the two halves cannot bleed into each other and
 * swap-collide. `documents.hash` is the key one row per distinct
 * item stands on, so what is NOT in the basis matters as much: the
 * source is left out deliberately, because that column's own comment
 * says capturing the same item from a second source has to land on
 * the row already there rather than beside it.
 *
 * The origin computes its digest through a pure-JavaScript fallback
 * when `node:crypto` is denied, because the code that computes it
 * runs inside a workflow Code node. Nothing here does: an adapter is
 * Node-side wiring, so there is one hash rather than two that have
 * to keep agreeing. The origin also lowercases its basis; this port
 * does not, because half of the pair is a URL whose path is
 * case-sensitive, and folding it would merge two places that are not
 * one.
 */
import type {
  CanonicalDocument,
  SourceAdapter,
  SourceKind,
} from './index.js';
import type {
  EndpointRef,
  FetchLike,
  PagedListSpec,
} from './paged-list.js';
import type { ParseDeps, ParsedRecord } from '../lib/parser-config.js';

import { createHash } from 'node:crypto';

import { markupSelect } from '../lib/markup-select.js';
import {
  applyFieldMap,
  parserConfigErrors,
  valueAtPath,
} from '../lib/parser-config.js';

import { htmlToText } from './html-text.js';
import { listEndpoints, unwrapListPayload } from './paged-list.js';

/**
 * This adapter's id: stable, and unique across the registry in
 * `./index.ts`. Spelled as the file stem, so the module a reader
 * opens and the id a `sources` row selects are one word.
 */
const ADAPTER_ID = 'listing-api';

/**
 * Which transport family this adapter fronts, and the `kind` every
 * `sources` row it can be constructed for carries.
 *
 * `api` rather than `feed`: a listing endpoint here answers JSON
 * that a config says how to read, not a syndication format with a
 * shape of its own. The annotation holds this to a member of
 * `SOURCE_KINDS` in `src/db/schema/values.ts` — the same tuple the
 * `sources.kind` CHECK is generated from — so a kind that is not one
 * is a type error rather than a row this adapter is never selected
 * for.
 */
const ADAPTER_KIND: SourceKind = 'api';

/**
 * The field-map member `documents.url` is taken from.
 *
 * Exported because a config author and a case both need to spell it,
 * and a name written out twice is a name that eventually differs.
 */
export const URL_FIELD = 'url';

/**
 * The field-map member `documents.body` is taken from.
 *
 * A field map declaring neither this nor {@link URL_FIELD} is not an
 * error: it produces documents with an empty body, which is a
 * capture that yielded no text and is kept anyway. What decides
 * whether that matters is the source contract, not this module.
 */
export const BODY_FIELD = 'body';

/**
 * What a `listing_path` spells an endpoint handle as.
 *
 * Braces rather than a percent or a dollar, because the value
 * substituted in has already been percent-encoded by the listing
 * loop and a percent template over percent-encoded text is the one
 * spelling a reader cannot skim.
 */
export const SLUG_TOKEN = '{slug}';

/**
 * The listing path used when the config states none.
 *
 * The smallest path that still varies per endpoint: the handle,
 * directly under the row endpoint. A source whose listings sit
 * anywhere else says so in its own row.
 */
export const DEFAULT_LISTING_PATH = `/${SLUG_TOKEN}`;

/**
 * The digest `documents.hash` is written with.
 *
 * Not exported, and no case reads it. A suite asserting the
 * algorithm off this module would agree with any edit to it, where
 * what a case can actually check — that the digest is stable, that
 * whitespace does not move it, and that swapping the two halves of
 * its basis does — holds whichever digest is named here.
 */
const HASH_ALGORITHM = 'sha256';

/**
 * What a run says when its listing path names no endpoint.
 *
 * Reported rather than refused, which is the posture of the loop
 * this note travels back through: nothing there throws for input
 * reasons, and a run that stopped would take down every other
 * endpoint over one operator typo. Loud rather than silent, because
 * the failure it describes is a cursor kept per endpoint over a
 * listing that is the same listing every time — a corpus with a hole
 * in it that no later stage can see.
 */
const NO_SLUG_NOTE = 'the listing path names no endpoint, so every'
  + ' configured endpoint reads one URL';

/**
 * The markup step the extraction engine is given: the matcher in
 * `../lib/markup-select.ts`, paired with the reduction in
 * `./html-text.ts`.
 *
 * Two modules rather than one because each refuses the other's job.
 * The matcher answers the FRAGMENTS a selector names and decodes
 * nothing; the reduction turns one fragment into the plain text a
 * `documents.body` holds. Neither imports the other — the matcher is
 * spliceable and a spliced library may not import anything — and its
 * own header names the caller as where the two are paired. This is
 * that caller.
 *
 * The pairing sits in the STEP rather than in
 * {@link ListingApiAdapter.toCanonical}, and the reason is what
 * judges the result: a source contract is checked against the
 * reading, so a body reduced after the check would be checked as
 * markup and stored as text. Reducing here means the value the
 * contract judged and the value the column takes are one value. It
 * also means the reduction applies exactly where markup was
 * declared: a field reading a plain member states no selector, never
 * reaches this step, and is left alone.
 *
 * @param markup - The value the field rule reached.
 * @param selector - The selector the field rule stated.
 * @returns One plain-text fragment per match.
 */
function selectText(markup: string, selector: string): string[] {
  return markupSelect(markup, selector)
    .map((fragment) => htmlToText(fragment));
}

/**
 * Everything the extraction engine needs that is not data.
 *
 * The step is supplied rather than reached for, exactly as the
 * transport is, and for a reason of the engine's own: it is written
 * dual-context and a spliced library may not import another, so the
 * markup step is a parameter there. Held at module scope because it
 * never varies — the engine treats it as read-only, and a fresh
 * object per call would be an allocation a reader would have to
 * explain.
 */
const PARSE_DEPS: ParseDeps = { selectMarkup: selectText };

/**
 * One record a listing run took, with the endpoint it came from.
 *
 * The envelope `./paged-list.ts` documents and the shape
 * `unwrapListPayload` reads back: not every listing states the thing
 * it lists the way a document needs it, and a handle out of a URL is
 * not a name, so the provenance travels beside the record rather
 * than being folded into it. The record INSIDE is verbatim, which is
 * what keeps `documents.raw` a re-parse rather than a re-fetch.
 */
export interface ListingEntry {
  /** Which configured endpoint answered with this record. */
  readonly endpoint: EndpointRef;

  /** The listing's own item, exactly as it arrived. */
  readonly record: unknown;
}

/**
 * What one listing run answered, and the only thing `parse` reads.
 *
 * What a WELL-FORMED payload looks like, rather than what a stored
 * one is guaranteed to be. A payload reaches `parse` from a column,
 * from a file on disk or from a hand edit as readily as from
 * {@link ListingApiAdapter.fetch}, so every member is read
 * defensively there and a payload that is not this shape yields no
 * readings rather than an ending nobody described.
 *
 * Two members are renamed from what the listing loop calls them, and
 * the rename is this module's vocabulary rather than a reshaping:
 * `refs` is `records` here because what the loop hands back is one
 * record per entry, and `next_cursor` is `cursor` because that is
 * the `sources` column it is written to.
 */
export interface ListingApiPayload {
  /** Every record the run took, each one a {@link ListingEntry}. */
  readonly records: readonly unknown[];

  /**
   * The cursor to store on the row, or `''` when the run left
   * nothing worth storing.
   */
  readonly cursor: string;

  /**
   * Everything the run has to say, in the order it happened. A note
   * is never a failure of the run — it is the record of an endpoint
   * that was skipped, capped or unchanged.
   */
  readonly notes: readonly string[];

  /** How many listings were read to the end of their payload. */
  readonly pages: number;

  /** How many requests were made, failures included. */
  readonly requests: number;
}

/**
 * One reading: what the field map made of one record, beside the
 * record it was made from.
 *
 * `parse` answers exactly one of these per entry the payload
 * carried, whatever the extraction managed — which is the keep half
 * of fail-flag-keep expressed in the adapter rather than in a
 * workflow. A record the config could read nothing out of still
 * arrives with its {@link ListingApiRecord.raw}, so the document
 * written for it carries the evidence a shape change is discovered
 * from. Dropping it is how a source shape change stops being
 * discoverable.
 */
export interface ListingApiRecord {
  /**
   * The reading: one member per field the map declared, including
   * the ones that read as nothing.
   *
   * Built on a null prototype by the engine, so a member named
   * `__proto__` is a real own key rather than a silent no-op.
   */
  readonly fields: ParsedRecord;

  /**
   * The payload entry this reading was made from, verbatim, and what
   * `documents.raw` is written with.
   */
  readonly raw: unknown;

  /**
   * One sentence per step the engine could not take on this record.
   *
   * Per record rather than per run, because that is the grain a
   * reader needs: a warning belongs to the document it is stored
   * beside, and a run-level list would say a step failed without
   * saying which capture it failed on.
   */
  readonly warnings: readonly string[];
}

/**
 * What one adapter of this kind is constructed with: the `sources`
 * row it fronts, plus the transport it is allowed to use.
 *
 * Bound once rather than threaded through each call, which is the
 * contract's own decision — a `parse` depending on two inputs would
 * cost the stored-payload seam the cases beside this file rest on.
 */
export interface ListingApiOptions {
  /**
   * The row's `endpoint` column: where this source is read, and the
   * base a `listing_path` is resolved against.
   *
   * Overridden by a `base_url` in the config, which is the listing
   * loop's own rule rather than one this module adds.
   */
  readonly endpoint: string;

  /**
   * The row's `parser_config` column, whatever it holds.
   *
   * `unknown` rather than a config interface, matching the column's
   * lack of a `$type` annotation: what a well-formed row looks like
   * is what `parserConfigErrors` checks, and typing the parameter as
   * that shape would assert the very thing the check exists to
   * doubt.
   */
  readonly parserConfig: unknown;

  /**
   * The row's own id, written to `documents.source_id` on every
   * document this adapter produces.
   *
   * Nullable because the column is, and required-but-nullable rather
   * than optional for the reason the contract gives: the NULL means
   * the document came through no source at all, and an omitted key
   * would leave this module deciding which of the two it had been
   * handed.
   */
  readonly sourceId: number | null;

  /**
   * How to make a request. Required, and never defaulted — see the
   * module header for what the absence of a fallback buys.
   */
  readonly transport: FetchLike;
}

/**
 * This adapter, as {@link createListingApi} answers it.
 *
 * `SourceAdapter` plus one member the contract does not declare.
 * {@link ListingApiAdapter.configErrors} exists because the config
 * binds at CONSTRUCTION, so whether it is usable is known before any
 * request is made — and because `parse` answers a list of readings,
 * which is a shape with nowhere for a fault about the row to go. A
 * caller that dropped it would discover a malformed row as an
 * extraction of nothing, which is what a thin payload looks like
 * too.
 */
export interface ListingApiAdapter
  extends SourceAdapter<ListingApiPayload, ListingApiRecord> {
  /**
   * Everything wrong with the bound `parser_config`, one sentence
   * each, and empty when the row is usable.
   *
   * A non-empty list means `parse` reads NO field at all rather than
   * the subset that happened to be well-formed, which is the
   * engine's own refusal carried up: a partial extraction under a
   * broken config is indistinguishable from a thin payload, and a
   * caller would store a document with two of its members and count
   * it as a reading.
   */
  readonly configErrors: readonly string[];
}

/**
 * A transport that reaches nothing, and says why.
 *
 * The value {@link ListingApiOptions.transport} takes when there is
 * no transport to give it — which is the state
 * {@link LISTING_API_DECLARATION} is in, and the only honest thing
 * to put in a required member that has nothing to hold. Exported so
 * a caller building an inert adapter of its own spells the refusal
 * once rather than writing a second one that says something else.
 *
 * @returns A rejection naming the member and what to do instead.
 */
export function refusingTransport(): Promise<never> {
  return Promise.reject(new Error(
    ADAPTER_ID + ' was constructed with no transport, so it cannot '
    + 'reach a source. Build one through createListingApi with the '
    + 'endpoint of a sources row and a transport of its own.',
  ));
}

/**
 * Where one endpoint's listing sits.
 *
 * The base URL loses its trailing separators and the path gains a
 * leading one, so the two join the same way whichever way an
 * operator wrote them. Every occurrence of {@link SLUG_TOKEN} is
 * replaced, through a split and a join rather than a pattern,
 * because a handle substituted into a regular expression would be
 * operator text reaching a matcher.
 *
 * @param baseUrl - The row endpoint, or the config override.
 * @param path - The listing path, as the config spelled it.
 * @param slug - The endpoint handle, already percent-encoded.
 * @returns The URL to request.
 */
function listingUrl(baseUrl: string, path: string, slug: string): string {
  const root = baseUrl.replace(/\/+$/u, '');
  const suffix = path.startsWith('/')
    ? path
    : `/${path}`;

  return root + suffix.split(SLUG_TOKEN).join(slug);
}

/**
 * Where the records are inside one listing response.
 *
 * A config stating no path means the response IS the list, which is
 * the shape a listing endpoint answers with when it wraps nothing
 * around it. Anything the path does not reach comes back undefined,
 * which the listing loop reads as an empty listing.
 *
 * @param payload - One listing response.
 * @param recordsPath - The config `recordsPath`, or undefined.
 * @returns Whatever is there, for the loop to check.
 */
function listingItems(payload: unknown, recordsPath: unknown): unknown {
  return recordsPath === undefined
    ? payload
    : valueAtPath(payload, recordsPath);
}

/**
 * One taken record, wrapped with the endpoint it came from.
 *
 * Answers null for an entry that is not a keyed object, which drops
 * it from the run while still counting it against the row budget —
 * the listing loop's own rule for a record a spec cannot read. The
 * check is not fussiness: `unwrapListPayload` recognizes an envelope
 * only when its record half is a non-array object, so a wrapped
 * primitive would come back later as the ENVELOPE itself and the
 * field map would read `endpoint` and `record` as though a source
 * had answered with them.
 *
 * @param record - One item the listing offered.
 * @param endpoint - Which configured endpoint answered.
 * @returns The envelope, or null to drop the record.
 */
function listingEntry(
  record: unknown,
  endpoint: EndpointRef,
): ListingEntry | null {
  if (typeof record !== 'object' || record === null) {
    return null;
  }

  if (Array.isArray(record)) {
    return null;
  }

  return { endpoint, record };
}

/**
 * The four things this listing source differs from the next by, as
 * the loop in `./paged-list.ts` takes them.
 *
 * Every one of them is read out of the bound config, which is what
 * makes ONE adapter type serve every `api` row: two rows differing
 * in where their records sit and what their timestamps are called
 * are two constructions of this function, not two modules.
 *
 * @param options - What the adapter was constructed with.
 * @param listingPath - The resolved listing path.
 * @returns The spec for one listing run.
 */
function listingSpec(
  options: ListingApiOptions,
  listingPath: string,
): PagedListSpec<ListingEntry> {
  const config = options.parserConfig;
  const recordsPath = valueAtPath(config, 'recordsPath');
  const stampPath = valueAtPath(config, 'stamp_path');

  return {
    defaultBaseUrl: options.endpoint,
    urlFor: (baseUrl, slug) => listingUrl(baseUrl, listingPath, slug),
    itemsFrom: (payload) => listingItems(payload, recordsPath),
    stampOf: (record) => valueAtPath(record, stampPath),
    refFrom: listingEntry,
  };
}

/**
 * One reading, made from one payload entry.
 *
 * The entry is unwrapped first, so a stored payload recorded as it
 * came off the wire reads exactly as an enveloped one does — that
 * branch is `unwrapListPayload`'s, not this module's. The record it
 * recovered is what the field map is applied to; the entry as it
 * arrived is what is kept.
 *
 * @param entry - One member of the payload's record list.
 * @param fields - The bound field map, or undefined to read none.
 * @returns The reading, its evidence and its warnings.
 */
function readEntry(entry: unknown, fields: unknown): ListingApiRecord {
  const unwrapped = unwrapListPayload(entry);
  const built = applyFieldMap(unwrapped.item, fields, PARSE_DEPS);

  return { fields: built.record, raw: entry, warnings: built.warnings };
}

/**
 * One member of a reading, as text, or nothing.
 *
 * The empty string answers nothing rather than itself, because both
 * columns this feeds treat it that way: `documents.url` is NULL
 * where there is no such place and never `''`, and a body read as
 * `''` is a capture that yielded no text either way.
 *
 * @param fields - The reading.
 * @param name - Which member to take.
 * @returns The text, or null when the member is not usable text.
 */
function textMember(fields: ParsedRecord, name: string): string | null {
  const value = valueAtPath(fields, name);

  return typeof value === 'string' && value !== ''
    ? value
    : null;
}

/**
 * The content hash of one document, as `documents.hash` takes it.
 *
 * The pair is whitespace-collapsed so a listing that re-serializes
 * its own text does not answer as a new item, and JSON-encoded so
 * the two halves cannot bleed into each other: without the encoding
 * a URL ending in the first words of a body would collide with a
 * shorter URL and a longer one.
 *
 * Two documents with the same URL and the same text hash the same,
 * on purpose — that is what one row per distinct item means, and it
 * is why the source is not in the basis.
 *
 * @param url - Where the document is, or null when nowhere.
 * @param body - The document text, possibly empty.
 * @returns The digest, hex-encoded.
 */
function contentHash(url: string | null, body: string): string {
  const basis = JSON.stringify([hashBasis(url ?? ''), hashBasis(body)]);

  return createHash(HASH_ALGORITHM)
    .update(basis, 'utf8')
    .digest('hex');
}

/**
 * One half of a hash basis, with its whitespace collapsed.
 *
 * @param value - Either half, as text.
 * @returns The half with runs of whitespace reduced and trimmed.
 */
function hashBasis(value: string): string {
  return value.replace(/\s+/gu, ' ').trim();
}

/**
 * Construct the adapter for one `sources` row.
 *
 * The config is validated ONCE, here, rather than on every call: it
 * cannot change between calls, so a per-call check would answer the
 * same list every time and give `parse` a fault it has no shape to
 * report. What that check decided is
 * {@link ListingApiAdapter.configErrors}, and a row it refused reads
 * no field at all.
 *
 * @param options - The row endpoint, its config, its id, and the
 *   transport this adapter is allowed to use.
 * @returns The adapter, ready to be fetched from.
 */
export function createListingApi(
  options: ListingApiOptions,
): ListingApiAdapter {
  const configErrors = parserConfigErrors(options.parserConfig);
  const fields = configErrors.length > 0
    ? undefined
    : valueAtPath(options.parserConfig, 'fields');
  const stated = valueAtPath(options.parserConfig, 'listing_path');
  const listingPath = typeof stated === 'string' && stated !== ''
    ? stated
    : DEFAULT_LISTING_PATH;
  const spec = listingSpec(options, listingPath);
  const pathNotes: readonly string[] = listingPath.includes(SLUG_TOKEN)
    ? []
    : [NO_SLUG_NOTE];

  return {
    id: ADAPTER_ID,
    kind: ADAPTER_KIND,
    configErrors,

    /**
     * Read every configured endpoint, within the bounds the config
     * sets. The only member that does I/O, and the only one that
     * touches the transport bound above.
     */
    async fetch(): Promise<ListingApiPayload> {
      const run = await listEndpoints<ListingEntry>(
        options.parserConfig,
        { fetch: options.transport },
        spec,
      );

      return {
        records: run.refs,
        cursor: run.next_cursor,
        notes: [...pathNotes, ...run.notes],
        pages: run.pages,
        requests: run.requests,
      };
    },

    /**
     * One reading per record the payload carried, under the field
     * map bound above. Pure: no I/O, no clock, no network.
     */
    parse(raw: ListingApiPayload): ListingApiRecord[] {
      const found = valueAtPath(raw, 'records');
      const entries: readonly unknown[] = Array.isArray(found)
        ? found
        : [];

      return entries.map((entry) => readEntry(entry, fields));
    },

    /**
     * Map one reading onto the canonical shape. Pure, and the only
     * member that has to know what a `documents` row holds — every
     * member of `CanonicalDocument` is produced here or nowhere.
     */
    toCanonical(parsed: ListingApiRecord): CanonicalDocument {
      const url = textMember(parsed.fields, URL_FIELD);
      const body = textMember(parsed.fields, BODY_FIELD) ?? '';

      return {
        hash: contentHash(url, body),
        sourceId: options.sourceId,
        url,
        body,
        raw: parsed.raw,
      };
    },
  };
}

/**
 * What the registry in `./index.ts` holds under `listing-api`.
 *
 * An adapter bound to NO row, and inert by construction: no
 * endpoint, an empty config that names no endpoint to read, and a
 * transport that refuses. What it carries is the id and the kind —
 * the two members a `sources` row is matched against, and the whole
 * of what registration answers.
 *
 * That there is something to explain here is the one place the
 * contract and the registry pull against each other. Configuration
 * binds at construction, so an adapter is per ROW; a registry is
 * keyed by id and holds one entry per KIND of source. The entry is
 * therefore a declaration rather than a working adapter, and a run
 * builds its own through {@link createListingApi} with the row it is
 * for. Registering the declaration keeps static registration doing
 * exactly what its own argument says — nothing runs unless it was
 * named — without putting something in the registry that could
 * reach a source if it were called.
 */
export const LISTING_API_DECLARATION: ListingApiAdapter = createListingApi({
  endpoint: '',
  parserConfig: {},
  sourceId: null,
  transport: refusingTransport,
});
