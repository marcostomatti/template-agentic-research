/**
 * @packageDocumentation
 * Source adapters — the contract every module in this directory satisfies.
 *
 * Type-only in phase 1: no adapter ships yet (they arrive in phase 4), so
 * this file pins the shape they conform to and nothing else. Keeping
 * {@link SourceAdapter.parse} pure and separate from
 * {@link SourceAdapter.fetch} is the load-bearing part of the contract: it is
 * what lets every adapter be tested against a stored payload with no network
 * in the default suite. An adapter that fetches inside `parse` passes its
 * tests the day it is written and fails them the first time it runs offline.
 */
import type { SOURCE_KINDS } from '../db/schema/values.js';

/**
 * The kinds of source an adapter can front.
 *
 * Derived from the `SOURCE_KINDS` tuple in `src/db/schema/values.ts`,
 * which is the same tuple the schema-v2 `sources.kind` CHECK is generated
 * from. The set an adapter is selected by and the set the column accepts
 * are therefore one declaration read twice, rather than two that have to
 * be kept in step: widening the set is an edit to that tuple plus the
 * migration carrying the widened CHECK, and this line is no longer a
 * third place that has to be remembered alongside them.
 *
 * The union is declared here rather than beside its tuple because this is
 * where it is consumed — {@link SourceAdapter.kind} is the property it
 * types. Every other set in that module pairs its union with the tuple;
 * this one is the deliberate exception, and the tuple's own TSDoc records
 * the exception, so neither file reads as though the other forgot.
 */
export type SourceKind = (typeof SOURCE_KINDS)[number];

/**
 * The shape an adapter produces and the only shape the core consumes: one
 * `documents` row's worth of captured material, and nothing beyond it.
 *
 * Every member maps onto a column of `documents` in
 * `src/db/schema/documents.ts`, and is named for that column's drizzle
 * property rather than for its SQL name — `sourceId` for `source_id`,
 * the other four identical either way. That is what makes a canonical
 * document a SLICE of the table's insert shape rather than something to
 * translate into one: spread it, add the `domainId` the writer supplies,
 * and the result is a complete row, with no field renaming in between
 * for a mismatch to hide in.
 *
 * The five members are the columns a CAPTURE supplies, and the nine they
 * leave out are each somebody else's. `id` is the database's and
 * `captured_at` the insert's — capture IS the insert, so no window exists
 * in which the two disagree. `domain_id` is the writer's, taken from the
 * `sources` row the adapter was constructed for, which records how the
 * adapter was reached rather than anything it read. `parse_status` and
 * `parse_error` belong to the contract check rather than to the capture:
 * the row that most needs them is one whose payload yielded no record at
 * all, so {@link SourceAdapter.toCanonical} never ran to return a shape
 * they could have sat in. And `features`, `feature_version`, `embedding`
 * and `embedding_model` arrive with the feature port in phase 4,
 * computed from the stored row long after the capture that wrote it.
 *
 * Each member below names its column and states only what the CONTRACT
 * adds. Why the database holds a column the way it does is argued once,
 * in that column's own comment; a second copy here would be a second
 * copy to drift.
 */
export interface CanonicalDocument {
  /**
   * The content hash of the document as captured: `documents.hash`, the
   * key the corpus's one row per distinct item stands on. Required here
   * because it is NOT NULL there — what that constraint buys, and what a
   * nullable member would cost in silence, is argued at the column.
   */
  readonly hash: string;
  /**
   * The `sources` row this document came through, or null when it came
   * through none: an ingested file, a body an operator pasted in. Maps
   * onto `documents.source_id`, the one member whose SQL name differs
   * from the property it is written as.
   *
   * Required-but-nullable rather than optional, because the NULL means
   * something at the column — deleting a source that still has rows is
   * refused rather than nulling it, so a NULL there is only ever "never
   * came through one" — and an omitted key would leave the writer to
   * decide which of the two it had been handed.
   */
  readonly sourceId: number | null;
  /**
   * Where the document can be read at its source, or null when there is
   * no such place: `documents.url`, which is nullable for exactly this
   * absence and never an empty string. `''` is a value, and a reader
   * handed one renders a link to nowhere.
   */
  readonly url: string | null;
  /**
   * The document's text as captured, and what every later stage reads:
   * `documents.body`, NOT NULL there and required here. Not the same as
   * non-empty — an empty body is a capture that yielded no text and is
   * kept anyway, the fail-flag-keep rule `documents.parse_status`
   * records — so the member is required while the string may be empty.
   */
  readonly body: string;
  /**
   * The source's own payload, verbatim: what {@link SourceAdapter.fetch}
   * returned, before anything was extracted from it. Maps onto
   * `documents.raw`, which is nullable for the same absence this member
   * carries — null when no payload was stored at all, the state a pasted
   * body or an ingested file is in, rather than `{}` claiming the source
   * answered and answered with nothing.
   *
   * `unknown` rather than a payload interface, matching the column's
   * lack of a `$type` annotation: the shape belongs to the source rather
   * than to this contract, and one type across every {@link SourceKind}
   * would describe none of them accurately.
   */
  readonly raw: unknown;
}

/**
 * One source adapter: get the bytes, produce canonical documents. An adapter
 * does not score, does not decide, and does not store.
 *
 * Nothing in this interface takes configuration per call, which is a
 * decision rather than an omission. A source row's `parser_config`
 * (selectors/JSONPath/regex/field-map — data the engine executes, never
 * code) binds once when the adapter is constructed in phase 4, alongside
 * that row's endpoint. Two later-phase properties depend on it: one adapter
 * type serves every row of its {@link SourceKind} with only its construction
 * differing, and {@link SourceAdapter.parse} stays a function of the payload
 * alone — threading the config through each call would make its output
 * depend on two inputs and cost the stored-payload test seam.
 *
 * @typeParam Raw - The source's own payload, as `fetch` returns it.
 * @typeParam Parsed - One extracted record, before canonicalization.
 */
export interface SourceAdapter<Raw = unknown, Parsed = unknown> {
  /** Stable identifier, unique across the registry. */
  readonly id: string;
  /**
   * Which transport family this adapter fronts. Matches the `kind` of every
   * `sources` row this adapter can be constructed for.
   */
  readonly kind: SourceKind;
  /**
   * Retrieves the source's own payload. The only step that does I/O, and the
   * only step that touches the endpoint bound at construction.
   */
  fetch(): Promise<Raw>;
  /**
   * Extracts records from a payload, under the `parser_config` bound at
   * construction. Pure — no I/O, no clock, no network.
   */
  parse(raw: Raw): Parsed[];
  /**
   * Maps one extracted record onto the canonical shape. Pure, and the only
   * step that has to know what a `documents` row holds — every member of
   * {@link CanonicalDocument} is produced here or nowhere.
   */
  toCanonical(parsed: Parsed): CanonicalDocument;
}
