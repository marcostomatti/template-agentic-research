/**
 * @packageDocumentation
 * The ONE refusal a store port may raise, and the translation from a
 * Postgres SQLSTATE into it.
 *
 * Every store in wave 1 has two implementations — the drizzle one a
 * deployment runs and the in-memory one the isolated suite runs — and
 * the point of this module is that a caller cannot tell them apart
 * from what a refusal looks like. The drizzle half reaches
 * {@link StoreRefusal} through {@link classifyPgError}; the in-memory
 * half constructs one directly from its own bookkeeping. Neither the
 * services above nor their tests read a SQLSTATE, a constraint name
 * they did not choose, or a driver type.
 *
 * A REFUSAL IS NOT AN ANSWER, AND {@link StoreRefusal} IS
 * DELIBERATELY NOT AN `AppError`. A store states what the database
 * refused; deciding whether that is a 409, a 422 or a 404 is the
 * rules layer's job and varies by route — the same
 * `foreign-key-violation` is a 409 when a category still holds
 * children and a 422 when a `parentId` names a row in another domain.
 * Were this an `AppError`, an unmapped refusal escaping a service
 * would reach `errorHandler` and answer a plausible-looking status
 * that no rule ever authorised. As a plain `Error` it answers 500 and
 * is logged at error level, which is what an unhandled case should
 * cost.
 *
 * NOTHING A CALLER SUBMITTED REACHES A `StoreRefusal`. That is
 * structural rather than a convention: the constructor takes no
 * message, so its `message` is derived from {@link
 * StoreRefusalReason} and the constraint name alone and there is no
 * parameter through which request content could arrive. The
 * containment matters because the driver error this module reads is
 * full of it, measured against the live Postgres here: a pg
 * `DatabaseError` carries `detail` as `Key (slug)=(<the submitted
 * slug>) already exists.`, and the `DrizzleQueryError` wrapping it
 * carries a `message` of `Failed query: <the SQL>` plus the bound
 * `params:` line. Both are one property read away throughout this
 * file and neither is ever copied into a refusal. The original stays
 * reachable on `cause`, which `Error` makes NON-enumerable — so a
 * logger serialising a refusal writes its enumerable fields, which
 * are exactly `reason`, `constraint` and `name`.
 */

/**
 * Why a store refused a write. A closed set of three, and closed on
 * purpose: a service switching over it is exhaustive, and a fourth
 * mechanism reaching a caller means editing this type and every
 * `switch` that reads it rather than a string arriving unhandled.
 *
 * The three are the mechanisms schema v2 actually enforces against
 * the wave-1 surface — the natural keys, the FKs that are `NO ACTION`
 * on delete, and the taxonomy depth trigger. What is NOT here is as
 * deliberate: a `not-null-violation` (23502) and a
 * `numeric-value-out-of-range` (22003) are a WRITER's bug rather than
 * a caller's, since the boundary schemas in `src/http/` refuse a
 * missing field long before a store sees it. Classifying them would
 * turn a bug in this package into a tidy 4xx nobody investigates.
 */
export type StoreRefusalReason =
  /** A `NO ACTION`/`RESTRICT` foreign key, or a missing parent row. */
  | 'foreign-key-violation'
  /** A unique index or a primary key: the natural keys, here. */
  | 'unique-violation'
  /** A CHECK constraint, or a trigger raising a check violation. */
  | 'check-violation';

/**
 * The SQLSTATEs this module recognises, and the reason each becomes.
 *
 * Keyed by the five-character SQLSTATE as a STRING, because that is
 * what the pg driver puts on `code` — never a number, which is the
 * shape {@link classifyPgError} refuses rather than coerces.
 *
 * Ordered by SQLSTATE, matching {@link StoreRefusalReason}, so the
 * two lists can be read against each other.
 */
const SQLSTATE_REASONS: Readonly<Record<string, StoreRefusalReason>> = {
  /** `foreign_key_violation`. */
  '23503': 'foreign-key-violation',
  /** `unique_violation`. */
  '23505': 'unique-violation',
  /** `check_violation`, raised by a CHECK or by a trigger. */
  '23514': 'check-violation',
};

/**
 * How far {@link classifyPgError} walks a `cause` chain before giving
 * up.
 *
 * Two links is what the measured shape needs — a `DrizzleQueryError`
 * wrapping a pg `DatabaseError` — and the extra headroom costs a
 * property read per link. The cap is what makes a cyclic `cause`
 * (`err.cause === err`, which nothing forbids) terminate rather than
 * hang the request that produced it.
 */
const MAX_CAUSE_DEPTH = 8;

/**
 * The fields {@link classifyPgError} reads off a link in the chain.
 * Every one is `unknown`, because the value being read has not been
 * shown to be a driver error yet — that is the question being asked.
 */
interface ErrorLikeFields {
  /** A pg SQLSTATE where the link is a `DatabaseError`. */
  readonly code?: unknown;
  /** The constraint a refusal named, where the mechanism names one. */
  readonly constraint?: unknown;
  /** The next link, where something wrapped something else. */
  readonly cause?: unknown;
}

/**
 * Builds the text a {@link StoreRefusal} carries.
 *
 * Written once and private, so the drizzle stores and the in-memory
 * store cannot produce different prose for the same refusal.
 *
 * @param reason - The mechanism.
 * @param constraint - The name the mechanism gave, if any.
 * @returns A sentence naming the reason, and the constraint when
 *   there is one. Both are names this repository chose — the reason
 *   is a member of a closed set declared above, and a constraint name
 *   is spelled in `src/db/schema/`. Neither can carry a submitted
 *   value, which is what makes the derived message safe to log.
 */
function describeRefusal(
  reason: StoreRefusalReason,
  constraint: string | undefined,
): string {
  return constraint === undefined
    ? `Store refused a write: ${reason}`
    : `Store refused a write: ${reason} (${constraint})`;
}

/**
 * A store declining a write because the data layer refused it.
 *
 * Thrown by every implementation of every wave-1 store port and
 * caught by the service above it, which decides the status. A
 * refusal that reaches a route handler uncaught is a bug in that
 * service rather than a case it chose not to handle, and answers 500.
 *
 * @example
 * ```ts
 * try {
 *   await store.insertDomain(values);
 * } catch (err) {
 *   if (err instanceof StoreRefusal && err.reason === 'unique-violation') {
 *     throw new ConflictError('A domain with that slug already exists');
 *   }
 *   throw err;
 * }
 * ```
 */
export class StoreRefusal extends Error {
  /** The mechanism that refused. */
  readonly reason: StoreRefusalReason;

  /**
   * The constraint the refusal named, where it named one.
   *
   * A unique key and a CHECK both name themselves, so a service can
   * tell one natural key from another on the same table. A trigger
   * raising a check violation names NOTHING — measured on the pg
   * driver, `constraint` is `undefined` for a `RAISE ... USING
   * ERRCODE` — which is exactly why this member is optional and why
   * the taxonomy depth rule is recognised by its `reason` rather than
   * by a name it could never read.
   */
  readonly constraint?: string;

  /**
   * @param opts.reason - The mechanism that refused.
   * @param opts.constraint - The name it gave, where it gave one.
   * @param opts.cause - The driver error, kept for a debugger and a
   *   stack. `Error` holds `cause` NON-enumerably, so a logger
   *   walking this object does not follow it into the driver's
   *   `message` and `detail`.
   *
   * There is deliberately no `message` parameter. See this module's
   * header: the absence is what makes it impossible for a caller to
   * put a submitted value into a refusal.
   */
  constructor(opts: {
    reason: StoreRefusalReason;
    constraint?: string;
    cause?: unknown;
  }) {
    const { reason, constraint, cause } = opts;

    super(describeRefusal(reason, constraint), { cause });
    this.name = this.constructor.name;
    this.reason = reason;
    this.constraint = constraint;
  }
}

/**
 * Reads a thrown value as a Postgres refusal this surface recognises.
 *
 * @param err - Whatever a store's `catch` was handed. Genuinely
 *   `unknown`: a driver error, a wrapper around one, a bug in this
 *   package, or a thrown non-error.
 * @returns A {@link StoreRefusal} carrying the mechanism and the
 *   constraint name, or `null` when the value is not one of the three
 *   SQLSTATEs. A `null` means the caller must rethrow what it caught —
 *   never that nothing went wrong.
 *
 * @remarks
 * IT WALKS `cause`, AND THAT IS THE WHOLE REASON IT EXISTS. Drizzle
 * does not rethrow the driver error: it throws a `DrizzleQueryError`
 * whose own `code` and `constraint` are `undefined`, with the pg
 * `DatabaseError` carrying the SQLSTATE one link down on `cause`
 * (measured here against the live Postgres, for all four of 23502,
 * 23503, 23505 and 23514). A classifier reading only the value it was
 * handed therefore answers `null` for every refusal a drizzle store
 * can produce, and every duplicate slug in the deployment becomes a
 * 500. The same walk costs nothing on a raw `pg` client, which hands
 * the `DatabaseError` back directly at depth 0 — so a probe written
 * against the driver and a store written against drizzle both work.
 *
 * Every read is defensive because none of the chain is typed, and
 * each rule below is a decision rather than a formality. A link that
 * is not an object ends the walk, since nothing hangs below a string
 * or a `null`. A `code` that is not a string is not a SQLSTATE
 * whatever it reads as, so it is refused rather than coerced — an
 * index lookup would turn a numeric `23505` into a match by way of
 * JavaScript stringifying the key. An unrelated `code` does NOT end
 * the walk: a Node system error spells `ECONNREFUSED` there, the
 * wrapper at depth 0 carries no `code` at all, and Bun gives every
 * `Error` a numeric `column` and `line` besides (both measured), so a
 * link carrying fields that are not the driver's is the ordinary case
 * and not a terminator. And a `constraint` that is not a string is
 * dropped while the refusal keeps its reason, because the mechanism
 * is the fact a service needs and the name is only the refinement.
 */
export function classifyPgError(err: unknown): StoreRefusal | null {
  let link: unknown = err;

  for (let depth = 0; depth < MAX_CAUSE_DEPTH; depth += 1) {
    if (typeof link !== 'object' || link === null) {
      return null;
    }

    const fields = link as ErrorLikeFields;
    const reason = typeof fields.code === 'string'
      ? SQLSTATE_REASONS[fields.code]
      : undefined;

    if (reason !== undefined) {
      return new StoreRefusal({
        reason,
        constraint: typeof fields.constraint === 'string'
          ? fields.constraint
          : undefined,
        cause: link,
      });
    }

    link = fields.cause;
  }

  return null;
}
