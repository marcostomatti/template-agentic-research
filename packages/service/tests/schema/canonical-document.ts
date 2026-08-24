/**
 * @packageDocumentation
 * The tie between `CanonicalDocument` and the `documents` insert
 * shape, written as declarations a type checker refuses rather than as
 * assertions a runner executes.
 *
 * Kept out of `canonical-document.test.ts` because a type-level
 * assertion placed there would be dead on arrival. `tsconfig.json`
 * excludes every `*.test.ts` from the program, and vitest transpiles
 * without checking, so a `.test.ts` is the one place in this package
 * where a type error cannot be raised by anything — an assertion
 * written there would pass for every shape the contract could drift
 * into, and the passing run would look exactly like a contract still
 * held. What gates this file is `bun run check-types`; the suite
 * beside it gates a different half and its header says which.
 *
 * The contract is hand-written in `src/sources/index.ts` rather than
 * derived with `Pick<typeof documents.$inferInsert, …>`, and that is
 * what makes the assertions below worth making. A derived contract
 * cannot drift, but neither can a test of one say anything: it would
 * compare the table against itself and hold for whatever the table
 * became. Two independent declarations of one shape is the only
 * arrangement in which a comparison of them is evidence.
 *
 * Four claims are made, and they fail on different drifts:
 *
 * 1. {@link CONTRACT_IS_AN_INSERT_SLICE} — every member names a
 *    column of `documents` and carries a type that column accepts.
 *    Fails when a member is renamed, dropped from the table, or
 *    given a type the column will not take.
 * 2. {@link CONTRACT_KEYS_ARE_THE_NAMED_MEMBERS} — the contract's key
 *    set is exactly the five named here. Fails on a member added to
 *    the contract and to nothing else, which claim 1 cannot see:
 *    `Pick` asks about the members it is given and says nothing
 *    about a sixth. The annotated sample below refuses that member
 *    too, as a literal now missing a required property, and this is
 *    the claim that states it as the disagreement it is — between
 *    what the contract declares and what the rest of this file was
 *    written against.
 * 3. {@link CONTRACT_PLUS_WRITER_IS_A_ROW} — the contract spread
 *    alongside the one column the writer supplies is a complete
 *    insert. This is what the phrase "assignable to the insert
 *    shape" actually wants: the contract alone is not assignable to
 *    `$inferInsert` and never was, since `domain_id` is NOT NULL
 *    with no default and belongs to the writer rather than to the
 *    capture. Fails when `documents` gains a required column, which
 *    is the moment somebody has to decide whose it is.
 * 4. {@link CONTRACT_MEMBER_TYPE_ASSERTIONS} — each member's type is
 *    exactly the one written out here. Fails on a widening the
 *    other three accept: `string | null` where the column is NOT
 *    NULL is assignable to nothing worse than a nullable insert
 *    member, so claim 1 lets it through while every producer gains
 *    a null it may now return.
 *
 * The control that shows these bite is a fifth line, not kept here:
 * `Eq<keyof CanonicalDocument, CanonicalDocumentMember | 'nope'>`
 * assigned `true`, which must be the only diagnostic `tsc` reports
 * for this file. An `Eq` alias that had gone permissive would pass
 * that too, and passing it is the one thing no correct version does.
 */
import type { documents } from '../../src/db/schema.js';
import type { CanonicalDocument } from '../../src/sources/index.js';

/** The `documents` row as an insert sees it: defaults optional. */
type DocumentInsert = typeof documents.$inferInsert;

/**
 * Mutual assignability — `true` only when two types are the same one.
 *
 * Both sides are wrapped in a tuple so a naked union distributes over
 * nothing: `A extends B` on a union asks the question once per member
 * and answers `boolean`, which is neither of the two answers this is
 * for.
 */
type Eq<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/**
 * The members the contract carries, named once for every claim below
 * to be stated against.
 *
 * Written out rather than read off `keyof CanonicalDocument`, which
 * would make claim 2 a comparison of the contract with itself. This
 * union is the second declaration; disagreeing with the first is the
 * whole assertion.
 */
export type CanonicalDocumentMember = 'body' | 'hash' | 'raw' | 'sourceId' | 'url';

/**
 * One canonical document, as an adapter's `toCanonical` returns one.
 *
 * Annotated rather than inferred, so the contract's required members
 * are all present here and nothing else is: a member added to the
 * interface makes this literal incomplete, and a member removed makes
 * it an excess property. That is what lets the suite beside this file
 * read the contract's key set at run time off `Object.keys`, which is
 * otherwise a thing no compiled-away interface leaves behind.
 *
 * The values are placeholders and are never written anywhere. `raw`
 * holds an object because that is the ordinary case; `unknown` admits
 * anything, so no value of it could fail to type-check and none is
 * asserted on.
 */
export const CANONICAL_DOCUMENT_SAMPLE: CanonicalDocument = {
  hash: 'e3b0c44298fc1c149afbf4c8996fb924',
  sourceId: 1,
  url: 'https://example.invalid/item/1',
  body: 'A captured body.',
  raw: { item: 1 },
};

/**
 * Claim 1 — the contract is the slice of the insert shape its members
 * name.
 *
 * `Pick` errors on a key `DocumentInsert` has not got, so a member
 * renamed on either side fails here before assignability is even
 * asked about; and the assignment then requires each member's type to
 * be one the column accepts.
 */
export const CONTRACT_IS_AN_INSERT_SLICE: Pick<DocumentInsert, CanonicalDocumentMember> =
  CANONICAL_DOCUMENT_SAMPLE;

/** Claim 2 — the contract's keys are exactly the members named above. */
export const CONTRACT_KEYS_ARE_THE_NAMED_MEMBERS: Eq<keyof CanonicalDocument, CanonicalDocumentMember> = true;

/**
 * Claim 3 — a capture plus what the writer supplies is a whole row.
 *
 * `domainId` is the writer's: it is taken from the `sources` row the
 * adapter was constructed for and records how the adapter was
 * reached, not anything it read, which is why the contract does not
 * carry it. Every other column of `documents` is either the
 * database's, defaulted, or nullable — so this one addition is what
 * completes the insert, and a new required column breaking this line
 * is the drift the file exists to catch.
 */
export const CONTRACT_PLUS_WRITER_IS_A_ROW: DocumentInsert = {
  ...CANONICAL_DOCUMENT_SAMPLE,
  domainId: 1,
};

/**
 * Claim 4 — each member's type, written out rather than compared to
 * the column's.
 *
 * Keyed by member so a failure names the one that drifted, and read
 * at run time by the suite beside this file, which requires a key
 * here for every member the contract declares. Without that, a member
 * added to the contract and to the union above but not to this object
 * would be covered by claims 1 to 3 and by no exactness check at all.
 *
 * Nullability is the drift these catch: the three claims above accept
 * `string | null` on a NOT NULL column, because a nullable value is
 * still assignable to an insert member that may be omitted. What it
 * costs is paid by every consumer, each of which gains a null the
 * column would have refused.
 */
export const CONTRACT_MEMBER_TYPE_ASSERTIONS: {
  readonly hash: Eq<CanonicalDocument['hash'], string>;
  readonly sourceId: Eq<CanonicalDocument['sourceId'], number | null>;
  readonly url: Eq<CanonicalDocument['url'], string | null>;
  readonly body: Eq<CanonicalDocument['body'], string>;
  readonly raw: Eq<CanonicalDocument['raw'], unknown>;
} = {
  hash: true,
  sourceId: true,
  url: true,
  body: true,
  raw: true,
};

/** One contract member, tied to the `documents` column it maps onto. */
export interface CanonicalDocumentColumnTie {
  /** The member, as `CanonicalDocument` declares it. */
  readonly member: CanonicalDocumentMember;
  /**
   * The column's SQL name, which is what the drizzle property the
   * member is named for resolves to. Four of the five are identical
   * either way and `sourceId` is not, so this is the only place the
   * contract's naming rule — named for the drizzle property, so that
   * a spread is a row with no renaming step in between — is stated
   * as something checkable rather than as prose.
   */
  readonly column: string;
  /**
   * Whether the column is NOT NULL, mirroring the member type asserted
   * above: the type says what a producer may hand over, this says what
   * the database will take, and a contract is only tied to a column
   * when both agree.
   */
  readonly notNull: boolean;
}

/**
 * Every member, tied to its column by SQL name.
 *
 * Hand-written, and deliberately not derived from the table: derived,
 * it would report whatever `documents` currently has and agree with
 * it. The suite beside this file holds this list to the contract's own
 * key set in one direction and to the live table in the other, so a
 * member that stops naming a real column fails there rather than in
 * the first adapter written against it.
 */
export const CANONICAL_DOCUMENT_COLUMN_TIES: readonly CanonicalDocumentColumnTie[] = [
  { member: 'hash', column: 'hash', notNull: true },
  { member: 'sourceId', column: 'source_id', notNull: false },
  { member: 'url', column: 'url', notNull: false },
  { member: 'body', column: 'body', notNull: true },
  { member: 'raw', column: 'raw', notNull: false },
];
