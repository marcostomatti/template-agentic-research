/**
 * @packageDocumentation
 * The approval vocabulary: the one projection both gates answer a
 * ruling with, and the closed roster of reasons either may refuse
 * for.
 *
 * TWO SUBJECTS, RULED ON FROM DIFFERENT DIRECTORIES. `research_pool`
 * carries an intention to research a subject and
 * `source_config_proposals` carries a proposed parser config. The
 * first is ruled on through `src/entities/` and the second through
 * `src/sources/`, and `scripts/approve.ts` already rules on both
 * from one CLI. What this module holds is the part of that act the
 * two share, so two routes in two directories cannot drift into
 * answering differently about the same decision.
 *
 * IT IMPORTS NOTHING AT ALL. No store, no schema, no clock, no
 * error class: every function here is total over values a caller
 * already has, which is what lets both services and their cases
 * drive it with no database and no service constructed. It writes
 * nothing and reaches no table — a vocabulary, not a gate that
 * acts.
 *
 * THE CLOSING STAMP IS NAMED TWICE IN THE SCHEMA AND ONCE HERE.
 * `research_pool.researched_at` and
 * `source_config_proposals.applied_at` record the same fact under
 * two names — the row was acted on, so it is no longer open — and
 * {@link Ruling.closedAt} is where a reader looks for either.
 * {@link describeRuling} is where that translation happens, rather
 * than at two call sites each free to answer a different member,
 * and the two column names appear in this file and nowhere above
 * it.
 *
 * AN ACT IS A RATIFICATION OR AN APPLICATION, and the two differ on
 * exactly one question. Ratifying twice is a no-op: both writers
 * stamp `coalesce(approved_at, now())`, so a second ruling keeps
 * the first one's time and a row already closed ratifies without
 * complaint. Applying twice is not: a proposal already written onto
 * its source row cannot be applied again, and a second attempt is
 * refused. {@link RULING_ACTS} is where that difference is
 * declared, rather than as an `if` in the one service that has it.
 *
 * THE CHECKS ARE ORDERED, AND THE ORDER IS A CONTAINMENT RULE. A
 * row whose parent is not the addressed one answers
 * `not-on-this-parent` even when it is also closed, so a caller
 * cannot learn from the sharper refusal that a row it does not own
 * exists and has already been acted on. The parent check therefore
 * runs before the closed one, and a case pins that pair rather than
 * leaving the ordering to be re-derived from the source.
 *
 * NOTHING SUBMITTED REACHES A REASON OR A MESSAGE. The reasons are
 * three constants of this module's own, and the two throws below
 * name members declared here. There is no template with a hole in
 * it, so there is nothing for a stored value or a submitted id to
 * arrive through — the rule `src/db/store-errors.ts` keeps for a
 * refusal a store raises, kept here for one a route raises.
 */

/**
 * Every reason a ruling may be refused for, and the order a reader
 * meets them in {@link refuseRuling}.
 *
 * A CLOSED SET, held from the other side by
 * `src/approvals/ruling.test.ts`: each case names the token it
 * expects rather than asserting that something was refused, and a
 * reason nothing reaches fails naming itself. Exported because both
 * services translate these into statuses — a 404 for the first two
 * and a 409 for the third — and a service writing the string out
 * would be a second roster nothing compares.
 *
 * Named tokens rather than sentences, and that is what makes them
 * safe to log: a reason is one of three literals declared here, so
 * a refusal carrying one carries nothing a caller sent. The
 * sentence a caller is answered with is the service's, composed
 * where the status is decided.
 */
export const RULING_REFUSAL_REASONS = [
  /** No row carries the id the body submitted. */
  'no-such-ruling',
  /** A row that exists, under a parent that is not the addressed one. */
  'not-on-this-parent',
  /** A row already acted on, where acting twice is refused. */
  'already-ruled',
] as const;

/**
 * One member of {@link RULING_REFUSAL_REASONS}.
 *
 * Derived from the roster rather than declared beside it, so the
 * list and the type cannot disagree: a service switching over this
 * union is exhaustive against the same three the cases hold.
 */
export type RulingRefusalReason = (typeof RULING_REFUSAL_REASONS)[number];

/**
 * The two acts this vocabulary covers.
 *
 * `ratify` is `POST /entities/:id/approve-research`: it records
 * that a person agreed to an intention and writes nothing else.
 * `apply` is `POST /sources/:id/approve-config`: it records the
 * same agreement AND writes the proposed config onto the source
 * row, which is the half that cannot be done twice.
 *
 * A closed roster rather than a boolean parameter, because the
 * difference between the two is a property of the act and not a
 * switch a caller should be able to set: a service passing `false`
 * for a repeat it did not want is a bug that reads as a
 * configuration.
 */
export const RULING_ACTS = ['ratify', 'apply'] as const;

/** One member of {@link RULING_ACTS}. */
export type RulingAct = (typeof RULING_ACTS)[number];

/**
 * Which acts a closed row refuses.
 *
 * Keyed by the union rather than tested with an `if`, so an act
 * added to {@link RULING_ACTS} and not answered here is a
 * `check-types` error at this declaration instead of a third act
 * silently taking the ratify branch.
 *
 * Read with `=== true` below. That comparison is a fail-closed
 * guard rather than a live rule — every legal key is answered by an
 * own property, and the reading it rules out is a key borrowed from
 * the prototype answering truthy for an act nobody declared.
 */
const ACTS_REFUSING_A_CLOSED_ROW: Readonly<Record<RulingAct, boolean>> = {
  apply: true,
  ratify: false,
};

/**
 * How a ruling reads once it has been given, and the shape both
 * approval routes answer with.
 *
 * FOUR MEMBERS, and none of them is the parent the row hangs off:
 * the caller addressed that parent in the path, so answering it
 * back would be echoing the request rather than reporting the act.
 * What a client needs is the row it named, where that row stands
 * now, and the two instants — one for when a person agreed, one for
 * when the agreement was carried out.
 */
export interface Ruling {
  /** The row that was ruled on: `research_pool.id` or the proposal's. */
  readonly id: number;

  /**
   * Where the row stands, as stored.
   *
   * `string` rather than the status union, deliberately. Both
   * columns are `text` under a CHECK over `RESEARCH_POOL_STATUSES`
   * in `src/db/schema/values.ts`, so the database is the authority
   * on the member set and re-declaring it here would make a second
   * one that agrees until somebody edits the tuple. This module is
   * a vocabulary about the RULING, not about the status domain.
   */
  readonly status: string;

  /**
   * When a person agreed, or `null` while nobody has.
   *
   * Stamped `coalesce(approved_at, now())` by both writers, so
   * ruling twice answers the FIRST ruling's time. A client reading
   * an instant older than the request it just made has not found a
   * fault; it has found the idempotence.
   */
  readonly approvedAt: Date | null;

  /**
   * When the act was carried out, or `null` while the row is open.
   *
   * `research_pool.researched_at` for an intention and
   * `source_config_proposals.applied_at` for a proposal — the same
   * fact under two column names, which is the translation this
   * module exists to make once. See the header.
   */
  readonly closedAt: Date | null;
}

/**
 * The three members every ruled row carries under both subjects.
 *
 * Not exported: it is the shared half of the union below rather
 * than a shape anything hands around, and both halves are exported
 * for a service that wants to name one.
 */
interface RuledRowCore {
  /** The row's own id. */
  readonly id: number;

  /** `status`, as stored; see {@link Ruling.status}. */
  readonly status: string;

  /** `approved_at`, as stored. */
  readonly approvedAt: Date | null;
}

/** A `research_pool` row, whose closing stamp is `researched_at`. */
export interface StoredPoolRuling extends RuledRowCore {
  /** When the intention was closed, by a search or without one. */
  readonly researchedAt: Date | null;
}

/** A `source_config_proposals` row, closed by `applied_at`. */
export interface StoredProposalRuling extends RuledRowCore {
  /** When the proposal was written onto its source row. */
  readonly appliedAt: Date | null;
}

/**
 * A stored row from either gate.
 *
 * A union rather than one shape with two optional members, so a row
 * carrying NEITHER stamp does not type-check: the compiler refuses
 * what {@link describeRuling} would otherwise have to read as an
 * open row. The runtime checks below are what covers the caller the
 * compiler cannot reach — a row parsed from JSON, or a double built
 * loosely in a case.
 */
export type StoredRuling = StoredPoolRuling | StoredProposalRuling;

/**
 * The optional pair {@link describeRuling} reads the stamps
 * through.
 *
 * A union member cannot be read before it is discriminated, and the
 * discrimination here is by OWN key rather than by `in`, so this
 * structural view is what the two reads are typed against. Both
 * members are optional because exactly one of them is present on
 * any legal row.
 */
interface ClosingStamps {
  /** `research_pool.researched_at`, where the row is one. */
  readonly researchedAt?: Date | null;

  /** `source_config_proposals.applied_at`, where it is one. */
  readonly appliedAt?: Date | null;
}

/** What a row stating both closing stamps is refused with. */
const TWO_CLOSING_STAMPS =
  'A ruled row states both researchedAt and appliedAt';

/** What a row stating neither is refused with. */
const NO_CLOSING_STAMP =
  'A ruled row states neither researchedAt nor appliedAt';

/**
 * Reads a stored row as the ruling both routes answer with.
 *
 * @param row - The row as its store read it, from either gate.
 * @returns The four-member projection, with the subject's own
 *   closing stamp answered as {@link Ruling.closedAt}.
 * @throws Error - When the row states both closing stamps, or
 *   neither. Both are a caller's bug rather than a request's — a
 *   row is one subject or the other — so this is a plain `Error`
 *   answering 500 rather than an `AppError` that would dress a
 *   miswired service up as a request somebody got wrong. Neither
 *   message carries anything read off the row.
 *
 * @remarks
 * THE STAMPS ARE READ BY OWN KEY. `Object.hasOwn` rather than `in`,
 * so a member reached through a prototype has not been stated:
 * a row rebuilt from a JSON payload can inherit a member it never
 * carried, and the difference between an open row and a row that
 * was never a proposal is exactly what this function is deciding.
 *
 * THE INSTANTS ARE PASSED THROUGH RATHER THAN COPIED. Every store
 * on this surface answers a `Date` that belongs to nobody else —
 * the drizzle ones build one per read and the in-memory one copies
 * on the way out — so a copy here would be a second defence
 * against a hazard the ports already rule out.
 *
 * An own key whose value is `undefined` answers `null`, which is
 * the same answer a stored NULL gets: a store projecting the column
 * and finding nothing there has said the row is open.
 */
export function describeRuling(row: StoredRuling): Ruling {
  const statesResearched = Object.hasOwn(row, 'researchedAt');
  const statesApplied = Object.hasOwn(row, 'appliedAt');

  if (statesResearched && statesApplied) {
    throw new Error(TWO_CLOSING_STAMPS);
  }

  if (!statesResearched && !statesApplied) {
    throw new Error(NO_CLOSING_STAMP);
  }

  const stamps = row as ClosingStamps;
  const closedAt = statesResearched
    ? stamps.researchedAt
    : stamps.appliedAt;

  return {
    id: row.id,
    status: row.status,
    approvedAt: row.approvedAt,
    closedAt: closedAt ?? null,
  };
}

/**
 * A stored row and the parent it names, as {@link refuseRuling}
 * takes them.
 *
 * The parent arrives BESIDE the row rather than on it, because the
 * two subjects name their parent under different columns —
 * `research_pool.entity_id` and `source_config_proposals.source_id`
 * — and reading a column name off a row is the drift this module
 * exists to prevent. The service that read the row knows which
 * column it read, and says so here.
 */
export interface RulingCandidate {
  /**
   * The parent the stored row names, or `null` where it names none.
   *
   * `research_pool.entity_id` is nullable — an intention can be
   * raised about a subject nothing has attributed yet — so `null`
   * is an ordinary stored state rather than a missing read, and a
   * row naming no parent is not on the addressed one.
   */
  readonly parentId: number | null;

  /** The row itself, as the store read it. */
  readonly row: StoredRuling;
}

/**
 * One approval request, as the shared gate reads it.
 *
 * Everything here is already resolved: the route parsed the path
 * and the body, the service asked its store for the row, and what
 * is left is the decision the two gates must make identically.
 */
export interface RulingRequest {
  /** Which act is being asked for; see {@link RULING_ACTS}. */
  readonly act: RulingAct;

  /** The parent the route addressed, from the path segment. */
  readonly parentId: number;

  /**
   * What the store answered for the submitted id, or `null` when it
   * answered nothing.
   *
   * `null` is the store's answer rather than an omission, which is
   * why it is a member here and not an absent one: a caller that
   * has not looked yet has not made this request.
   */
  readonly candidate: RulingCandidate | null;
}

/**
 * Decides whether a ruling may be given, and answers WHY not.
 *
 * @param request - The act, the addressed parent, and what the
 *   store answered for the submitted id.
 * @returns The reason the ruling is refused, or `null` when
 *   nothing refuses it. A reason is a token from
 *   {@link RULING_REFUSAL_REASONS}; turning one into a status and a
 *   sentence is the calling service's job, and the two services
 *   answer 404 for the first two and 409 for the third.
 *
 * @remarks
 * FIRST REFUSAL WINS, AND THE ORDER IS THE CONTAINMENT RULE the
 * header sets out: a row belonging to another parent is answered as
 * `not-on-this-parent` whatever else is true of it, so the sharper
 * `already-ruled` cannot tell a caller that a row it does not own
 * exists and has been acted on. A case pins that pairing, since
 * both checks fire on such a row and only the order decides which
 * one is answered.
 *
 * A CLOSED ROW IS REFUSED FOR SOME ACTS AND NOT OTHERS, read off
 * {@link ACTS_REFUSING_A_CLOSED_ROW} rather than tested here, and
 * `closedAt` comes from {@link describeRuling} rather than from a
 * second read of the row — so "closed" means one thing in the gate
 * and in the answer.
 *
 * NOTHING HERE IS ABOUT WHAT THE ROW SAYS OF ITSELF. `status` is
 * not consulted at any point, exactly as `proposalToSourceUpdate`
 * in `src/sources/config-proposer.ts` does not consult it: both
 * CHECK constraints hold the timestamps against each other and
 * never the status column, so the timestamps are the account this
 * gate is entitled to read.
 */
export function refuseRuling(
  request: RulingRequest,
): RulingRefusalReason | null {
  const { act, candidate, parentId } = request;

  if (candidate === null) {
    return 'no-such-ruling';
  }

  if (candidate.parentId !== parentId) {
    return 'not-on-this-parent';
  }

  const refusesClosed = ACTS_REFUSING_A_CLOSED_ROW[act] === true;

  if (refusesClosed && describeRuling(candidate.row).closedAt !== null) {
    return 'already-ruled';
  }

  return null;
}
