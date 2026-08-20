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
 * Narrowed from the phase-1 open record now that schema v2 fixes the table
 * this is written into — ahead of the first real adapter in phase 4, so no
 * adapter is ever written against the open shape. The members are the
 * columns a capture can itself supply, which is why `domain_id` and
 * `captured_at` are not among them: the domain comes from the `sources`
 * row an adapter was constructed for, and capture time is a fact about the
 * insert rather than about the document.
 */
export interface CanonicalDocument {
  /**
   * Content hash of the document as captured — the key one row per
   * distinct item stands on, and required for that reason.
   */
  readonly hash: string;
  /**
   * The `sources` row this document came through, or null when it came
   * through none: an ingested file, a body an operator pasted in.
   */
  readonly sourceId: number | null;
  /**
   * Where the document can be read at its source, or null when there is
   * no such place. Never an empty string, which renders as a link to
   * nowhere.
   */
  readonly url: string | null;
  /**
   * The document's text as captured. An empty body is a capture that
   * yielded no text and is kept anyway — fail-flag-keep — so the member
   * is required while the string it carries may be empty.
   */
  readonly body: string;
  /**
   * The source's own payload, verbatim: what `fetch` returned, before
   * anything was extracted from it. Null when nothing was stored, which
   * is the state a pasted body or an ingested file is in.
   *
   * `unknown` rather than a payload interface, because the shape belongs
   * to the source rather than to this contract — one type across every
   * {@link SourceKind} would describe none of them accurately.
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
