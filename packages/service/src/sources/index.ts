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
 * The shape an adapter produces and the only shape the core consumes.
 *
 * Open record in phase 1 on purpose: the canonical document columns are not
 * settled until schema v2 lands, and pinning a guess here would bake a shape
 * into the contract before the table that has to store it exists. **Phase 2
 * narrows this alias** to the document row shape — ahead of the first real
 * adapter in phase 4, so no adapter is ever written against the open record
 * and none has to be revised when the narrowing arrives.
 */
export type CanonicalDocument = Record<string, unknown>;

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
   * Maps one extracted record onto the canonical shape. Pure, and the seam
   * that absorbs the phase-2 narrowing of {@link CanonicalDocument}.
   */
  toCanonical(parsed: Parsed): CanonicalDocument;
}
