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

/** The kinds of source an adapter can front. */
export type SourceKind = 'url' | 'api' | 'rss' | 'push';

/** The shape an adapter produces and the only shape the core consumes. */
export type CanonicalDocument = Record<string, unknown>;

/**
 * One source adapter: get the bytes, produce canonical documents. An adapter
 * does not score, does not decide, and does not store.
 *
 * @typeParam Raw - The source's own payload, as `fetch` returns it.
 * @typeParam Parsed - One extracted record, before canonicalization.
 */
export interface SourceAdapter<Raw = unknown, Parsed = unknown> {
  /** Stable identifier, unique across the registry. */
  readonly id: string;
  /** Which transport family this adapter fronts. */
  readonly kind: SourceKind;
  /** Retrieves the source's own payload. The only step that does I/O. */
  fetch(): Promise<Raw>;
  /** Extracts records from a payload. Pure — no I/O, no clock, no network. */
  parse(raw: Raw): Parsed[];
  /** Maps one extracted record onto the canonical shape. Pure. */
  toCanonical(parsed: Parsed): CanonicalDocument;
}
