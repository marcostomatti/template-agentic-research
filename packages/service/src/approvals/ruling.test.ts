/**
 * `describeRuling` and `refuseRuling` — the vocabulary both
 * approval gates answer in, driven with no store, no service and no
 * database, because the module reaches none of the three.
 *
 * Four claims, and the file is arranged around them.
 *
 * THAT ONE PROJECTION COVERS TWO SUBJECTS. A `research_pool` row
 * and a `source_config_proposals` row name their closing stamp
 * differently — `researchedAt` against `appliedAt` — and both are
 * answered as `closedAt`. The two are read into the SAME four
 * members, which is asserted by comparing the two answers against
 * each other rather than only against a written-out expectation: a
 * translation that had grown a subject-specific member would
 * satisfy two separate expectations and not that equality.
 *
 * THAT THE STAMP IS READ BY OWN KEY. A row inheriting
 * `researchedAt` from a prototype has not stated it, and is refused
 * as a row stating no closing stamp — with the identical shape
 * carrying the member OWN as the control in the same case. That
 * pair is the only reading that separates `Object.hasOwn` from
 * `in`, and both refusals are pinned by their MESSAGE rather than
 * by their constructor, since both are plain `Error`s.
 *
 * THAT EVERY REFUSAL IS NAMED. Every case in the gate section
 * asserts the reason TOKEN rather than that something was refused,
 * because the checks are ordered and dropping one of them usually
 * leaves the input refused by a later one — a case reading a
 * boolean stays green over a rule that is gone. Each refusal
 * carries its control INSIDE the case, varied along that case's own
 * axis, so a gate that had started refusing everything reddens
 * here rather than passing every refusal case at once.
 *
 * THAT THE ORDER OF THE CHECKS IS THE CONTAINMENT RULE. A closed
 * row under another parent satisfies both checks, so only the order
 * decides which reason is answered; the case asserts
 * `not-on-this-parent` and reads the same row on the addressed
 * parent as `already-ruled` beside it.
 *
 * The two rosters are held from the other side at the foot. Every
 * reason a case reached is collected into a module-level `Set`
 * through the one helper the gate is asked through, and held
 * set-equal against `RULING_REFUSAL_REASONS`: a reason nothing
 * reaches fails NAMING itself rather than leaving a count to be
 * read, and a reason answered that the roster does not name fails
 * the other way. The acts are collected the same way, so an act
 * added to `RULING_ACTS` and driven by nothing is reported too. A
 * fabricated reason is asserted absent from both, which is what
 * says the membership reads are discriminating rather than
 * answering true for anything.
 *
 *
 * Mutation grid, measured over the nineteen cases here with
 * `--reporter=json` and read as the failed case SET rather than as
 * a count. Thirteen legs mutate `./ruling.ts` and every one of them
 * reddens something, so no case in this file is decoration.
 *
 * The gate's three checks report separately and none of them hides
 * behind another. Making the null check never fire reddens 2, the
 * no-such-ruling case and the roster's coverage case; dropping the
 * parent check reddens 4 and dropping the closed check reddens 4,
 * each time including that same coverage case, which is what says
 * the accumulator reports a reason nothing reaches. MOVING the
 * closed check above the parent check reddens exactly 1 — the
 * ordering case, and nothing else — so the containment rule has
 * one reader and it is the one named for it.
 *
 * The act registry is read entry by entry rather than as a keyed
 * record. Flipping `ratify` to refuse a closed row reddens exactly
 * 1, the case that ratifies one; flipping `apply` to allow one
 * reddens 4. Two different entries, two different failures, which
 * a case asserting only that the record is exhaustive could not
 * distinguish.
 *
 * The projection's legs split the same way. Swapping the two
 * stamps in the translation reddens 10, the widest leg here and
 * unsurprising — every subject-specific reading in the file passes
 * through it. Reading them with `in` instead of `Object.hasOwn`
 * reddens exactly 1, the inherited-stamp case, which is the only
 * reading in this file that could ever report it. Accepting a row
 * stating both stamps reddens 1 and accepting one stating neither
 * reddens 2. Dropping the `?? null` reddens exactly the
 * undefined-stamp case, answering a copied `Date` reddens exactly
 * the pass-through case, and adding a member to the answer reddens
 * 2 — the key-set case and the whole-record comparison.
 *
 * The key pin's type half is not a vitest leg at all: planting an
 * OPTIONAL member on `Ruling` and running `check-types` answers
 * exactly one diagnostic, a TS2322 at the {@link EVERY_KEY_LISTED}
 * line, with nothing else in the package moving.
 *
 * The instants are built with `Date.UTC` and never by parsing a
 * stamp: an expected value derived through the code under test
 * agrees with it however wrong it is. `Date.UTC` takes a 0-based
 * month, so the two below are February.
 */
import type {
  Ruling,
  RulingCandidate,
  RulingRefusalReason,
  RulingRequest,
  StoredPoolRuling,
  StoredProposalRuling,
  StoredRuling,
} from './ruling.js';

import { describe, expect, it } from 'vitest';

import {
  RULING_ACTS,
  RULING_REFUSAL_REASONS,
  describeRuling,
  refuseRuling,
} from './ruling.js';

/** The entity or source a case addresses in the path. */
const PARENT_ID = 7;

/** A second parent, carrying the row the cross-parent cases submit. */
const OTHER_PARENT_ID = 8;

/** The stored row every case here rules on. */
const ROW_ID = 41;

/** When a person agreed, on every row a case builds. */
const APPROVED_AT = new Date(Date.UTC(2026, 1, 3, 4, 5, 6));

/** When the act was carried out, on the rows that were closed. */
const CLOSED_AT = new Date(Date.UTC(2026, 1, 4, 7, 8, 9));

/** The status both tables store; not read by anything under test. */
const STORED_STATUS = 'approved';

/**
 * A reason token no roster declares.
 *
 * Shaped like the three real ones so the membership reads below are
 * asked a question they could get wrong, rather than being handed
 * something no comparison would ever match.
 */
const FABRICATED_REASON = 'not-a-real-reason';

/** {@link RULING_REFUSAL_REASONS} as plain strings. */
const REASON_ROSTER: readonly string[] = RULING_REFUSAL_REASONS;

/**
 * The message a row stating both closing stamps is refused with,
 * and the one a row stating neither is refused with.
 *
 * Written out rather than imported, because neither constant is
 * exported: this file pins the spelling instead of agreeing with
 * whatever the module happens to say.
 */
const TWO_STAMPS = 'A ruled row states both researchedAt and appliedAt';

/** The other one; see {@link TWO_STAMPS}. */
const NO_STAMP = 'A ruled row states neither researchedAt nor appliedAt';

/**
 * A `research_pool` row, closed at the instant given or still open.
 *
 * @param researchedAt - The closing stamp, or `null` for an open
 *   row.
 * @returns The row as its store would read it.
 */
function poolRow(researchedAt: Date | null): StoredPoolRuling {
  return {
    id: ROW_ID,
    status: STORED_STATUS,
    approvedAt: APPROVED_AT,
    researchedAt,
  };
}

/**
 * A `source_config_proposals` row, on the same terms.
 *
 * @param appliedAt - The closing stamp, or `null` for an open row.
 * @returns The row as its store would read it.
 */
function proposalRow(appliedAt: Date | null): StoredProposalRuling {
  return {
    id: ROW_ID,
    status: STORED_STATUS,
    approvedAt: APPROVED_AT,
    appliedAt,
  };
}

/**
 * A candidate: a stored row and the parent its own column names.
 *
 * @param parentId - What the row names, or `null` where it names
 *   nothing.
 * @param row - The row itself.
 * @returns The pair the gate takes.
 */
function candidate(
  parentId: number | null,
  row: StoredRuling,
): RulingCandidate {
  return { parentId, row };
}

/**
 * Every reason a case in this file reached, and every act it drove.
 *
 * Filled by {@link refuse} rather than by the cases, so a case
 * cannot join the roster guards at the foot by remembering to
 * register itself. Widened to `string` on purpose: the fabricated
 * token below has to be a value these can be ASKED about, and a set
 * typed to the union would refuse the question at compile time.
 */
const REACHED_REASONS = new Set<string>();

/** The acts {@link refuse} was asked about; see above. */
const DRIVEN_ACTS = new Set<string>();

/**
 * Asks the gate, recording what it answered.
 *
 * Every gate case below goes through this rather than calling
 * `refuseRuling` directly, which is what makes the roster guards at
 * the foot a reading of the whole file instead of a list somebody
 * maintains.
 *
 * @param request - The request under test.
 * @returns Whatever the gate answered, unchanged.
 */
function refuse(request: RulingRequest): RulingRefusalReason | null {
  const reason = refuseRuling(request);

  DRIVEN_ACTS.add(request.act);

  if (reason !== null) {
    REACHED_REASONS.add(reason);
  }

  return reason;
}

/**
 * A row the type refuses, handed to the module as one anyway.
 *
 * The two throws below are about callers the compiler cannot reach
 * — a row parsed from JSON, a store double built loosely — so
 * reaching them at all costs an assertion. It is written once here
 * rather than at each of the cases that need it, and it takes
 * `object` so nothing but an object can be asserted through it.
 *
 * @param row - The malformed row.
 * @returns The same value, typed as a legal one.
 */
function asStoredRuling(row: object): StoredRuling {
  return row as StoredRuling;
}

/**
 * Every member the projection carries, as a list a case can read.
 *
 * `satisfies` holds each entry to a real key; {@link CoversEveryKey}
 * below holds the list to the whole type.
 */
const RULING_KEYS = [
  'id',
  'status',
  'approvedAt',
  'closedAt',
] as const satisfies readonly (keyof Ruling)[];

/**
 * `true` only while `L` names every key of `T`.
 *
 * The tuple wrapper is load-bearing rather than decoration: without
 * it the union distributes over the conditional and the answer is
 * `boolean`, which accepts `true` as an initializer and pins
 * nothing at all.
 *
 * @typeParam T - The type whose keys must all be named.
 * @typeParam L - The list naming them, as `typeof <the const>`.
 */
type CoversEveryKey<T, L extends readonly PropertyKey[]> =
  [Exclude<keyof T, L[number]>] extends [never] ? true : false;

/**
 * The half of the drift guard `check-types` owns.
 *
 * A member added to `Ruling` and not to {@link RULING_KEYS}
 * collapses this type to `false`, and the initializer below is then
 * a TS2322 at that line — before any case can compare an answer
 * against a list that has quietly stopped describing it.
 */
type EveryKeyListed = CoversEveryKey<Ruling, typeof RULING_KEYS>;

/** Read in a case below, so it is a symbol this file uses. */
const EVERY_KEY_LISTED: EveryKeyListed = true;

/** {@link RULING_KEYS}, sorted at use rather than by hand. */
const RULING_KEY_SET: readonly string[] = [...RULING_KEYS].sort();

describe('the projection a ruled row reads as', () => {
  // The key set, both halves. The runtime one catches a member the
  // module answers that nothing declares; the type one catches a
  // member declared that this list does not name. Neither sees the
  // other's fault. The two column names are asserted absent by name
  // as well, because that is the translation this module exists to
  // make and a projection passing one of them through would still
  // have four keys if it had dropped `closedAt` for it.
  it('answers the members it declares and no other', () => {
    const ruling = describeRuling(poolRow(CLOSED_AT));

    expect(Object.keys(ruling).sort()).toEqual(RULING_KEY_SET);
    expect(Object.hasOwn(ruling, 'researchedAt')).toBe(false);
    expect(Object.hasOwn(ruling, 'appliedAt')).toBe(false);
    expect(EVERY_KEY_LISTED).toBe(true);
  });

  // The claim the module is named for: two subjects, one answer.
  // Compared against each other AND against a written-out record,
  // because the equality alone is satisfied by a function answering
  // the same wrong thing twice, and the record alone is satisfied
  // by two subject-specific translations that happen to agree on
  // this row.
  it('reads both subjects into one four-member answer', () => {
    const fromPool = describeRuling(poolRow(CLOSED_AT));
    const fromProposal = describeRuling(proposalRow(CLOSED_AT));

    expect(fromPool).toEqual({
      id: ROW_ID,
      status: STORED_STATUS,
      approvedAt: APPROVED_AT,
      closedAt: CLOSED_AT,
    });
    expect(fromProposal).toEqual(fromPool);
  });

  // The pool half of the stamp translation, read from both sides in
  // one case: the closed row answers the instant it stored and the
  // open one answers null. Without the second read a translation
  // answering the stamp unconditionally would pass.
  it('answers a pool row researched stamp as closedAt', () => {
    expect(describeRuling(poolRow(CLOSED_AT)).closedAt).toBe(CLOSED_AT);
    expect(describeRuling(poolRow(null)).closedAt).toBeNull();
  });

  // The proposal half, same shape. Two cases rather than one table,
  // because a translation reading the WRONG member for one subject
  // is the fault worth reporting separately.
  it('answers a proposal row applied stamp as closedAt', () => {
    const closed = proposalRow(CLOSED_AT);

    expect(describeRuling(closed).closedAt).toBe(CLOSED_AT);
    expect(describeRuling(proposalRow(null)).closedAt).toBeNull();
  });

  // The instants are passed through rather than rebuilt, which is
  // what the identity comparison reads: an equal-but-distinct Date
  // would satisfy `toEqual` and say nothing about whether the value
  // came off the row.
  it('passes the approval instant through as stored', () => {
    expect(describeRuling(poolRow(null)).approvedAt).toBe(APPROVED_AT);
  });

  // An own key holding `undefined` is an open row, which is the
  // same answer a stored NULL gets. The control beside it is the
  // stamp present with a value, so a function answering null for
  // everything cannot pass.
  it('reads an undefined stamp as an open row', () => {
    const stated = asStoredRuling({
      ...poolRow(null),
      researchedAt: undefined,
    });

    expect(describeRuling(stated).closedAt).toBeNull();
    expect(describeRuling(poolRow(CLOSED_AT)).closedAt).toBe(CLOSED_AT);
  });
});

describe('a row that is neither subject, or both', () => {
  // Both stamps present is a row that cannot be either subject, and
  // it is refused rather than resolved by preferring one. The
  // control is the same object with one member deleted, which
  // answers rather than throwing — so a function that had started
  // throwing on every row cannot pass this case.
  it('refuses a row stating both closing stamps', () => {
    const both = { ...poolRow(CLOSED_AT), appliedAt: CLOSED_AT };

    expect(() => describeRuling(asStoredRuling(both))).toThrow(TWO_STAMPS);
    expect(describeRuling(poolRow(CLOSED_AT)).closedAt).toBe(CLOSED_AT);
  });

  // Neither stamp present is a row from no gate at all, and the
  // same control applies. This is the state the union type refuses
  // at compile time, which is why reaching it needs the assertion.
  it('refuses a row stating neither closing stamp', () => {
    const core = {
      id: ROW_ID,
      status: STORED_STATUS,
      approvedAt: APPROVED_AT,
    };

    const stated = asStoredRuling({ ...core, appliedAt: null });

    expect(() => describeRuling(asStoredRuling(core))).toThrow(NO_STAMP);
    expect(describeRuling(stated).closedAt).toBeNull();
  });

  // The one case that separates `Object.hasOwn` from `in`. The
  // prototype carries a closing stamp and the row itself does not,
  // so a read through the chain finds a closed pool row where the
  // row has stated nothing at all. The control is the identical
  // shape with the member OWN, which resolves — so the case reports
  // the discrimination rather than merely that something threw.
  it('reads an inherited stamp as no stamp at all', () => {
    const core = {
      id: ROW_ID,
      status: STORED_STATUS,
      approvedAt: APPROVED_AT,
    };
    const inherited: object = Object.assign(
      Object.create({ researchedAt: CLOSED_AT }) as object,
      core,
    );

    const own = asStoredRuling({ ...core, researchedAt: CLOSED_AT });

    expect(() => describeRuling(asStoredRuling(inherited))).toThrow(NO_STAMP);
    expect(describeRuling(own).closedAt).toBe(CLOSED_AT);
  });
});

describe('the gate both approval routes ask', () => {
  // The store answered nothing, under both acts. The control is the
  // same request with a row present, which is refused for no
  // reason — a gate refusing everything reddens here.
  it('names no-such-ruling for a row nothing carries', () => {
    const present = candidate(PARENT_ID, poolRow(null));

    for (const act of RULING_ACTS) {
      expect(refuse({ act, parentId: PARENT_ID, candidate: null }))
        .toBe('no-such-ruling');
      expect(refuse({ act, parentId: PARENT_ID, candidate: present }))
        .toBeNull();
    }
  });

  // A row that exists, under somebody else's parent. The control
  // varies THIS case's own axis: the identical row named on the
  // addressed parent is not refused.
  it('names not-on-this-parent for another parent row', () => {
    const row = poolRow(null);
    const elsewhere = candidate(OTHER_PARENT_ID, row);

    for (const act of RULING_ACTS) {
      expect(refuse({ act, parentId: PARENT_ID, candidate: elsewhere }))
        .toBe('not-on-this-parent');
      expect(refuse({
        act,
        parentId: PARENT_ID,
        candidate: candidate(PARENT_ID, row),
      })).toBeNull();
    }
  });

  // `research_pool.entity_id` is nullable, so a row naming no
  // parent is an ordinary stored state rather than a bad read — and
  // it is not on the addressed parent either. The control is the
  // same row naming the parent it was addressed under.
  it('names not-on-this-parent for a parentless row', () => {
    const row = poolRow(null);

    expect(refuse({
      act: 'ratify',
      parentId: PARENT_ID,
      candidate: candidate(null, row),
    })).toBe('not-on-this-parent');
    expect(refuse({
      act: 'ratify',
      parentId: PARENT_ID,
      candidate: candidate(PARENT_ID, row),
    })).toBeNull();
  });

  // Applying is the act that cannot be repeated, and a proposal
  // already on its source row is refused. The control is the same
  // proposal still open, so a gate refusing every apply is caught.
  it('names already-ruled for a proposal applied', () => {
    const applied = candidate(PARENT_ID, proposalRow(CLOSED_AT));
    const open = candidate(PARENT_ID, proposalRow(null));

    expect(refuse({ act: 'apply', parentId: PARENT_ID, candidate: applied }))
      .toBe('already-ruled');
    expect(refuse({ act: 'apply', parentId: PARENT_ID, candidate: open }))
      .toBeNull();
  });

  // The one difference between the two acts, read as a difference:
  // ONE closed row under both, refused under `apply` and ratified
  // under `ratify`. A registry keyed by the act union is exhaustive
  // at `check-types` whatever its entries say, so this is the case
  // that reads WHICH answer each key holds.
  it('ratifies a closed row that apply refuses', () => {
    const closed = candidate(PARENT_ID, poolRow(CLOSED_AT));

    expect(refuse({ act: 'ratify', parentId: PARENT_ID, candidate: closed }))
      .toBeNull();
    expect(refuse({ act: 'apply', parentId: PARENT_ID, candidate: closed }))
      .toBe('already-ruled');
  });

  // Both checks fire on this row, so only their ORDER decides which
  // reason is answered, and the containment rule wants the one that
  // says nothing about a row the caller does not own. The same row
  // on the addressed parent answers the sharper reason, which is
  // what says the second check is present at all.
  it('answers the parent before it answers a closed row', () => {
    const row = proposalRow(CLOSED_AT);

    expect(refuse({
      act: 'apply',
      parentId: PARENT_ID,
      candidate: candidate(OTHER_PARENT_ID, row),
    })).toBe('not-on-this-parent');
    expect(refuse({
      act: 'apply',
      parentId: PARENT_ID,
      candidate: candidate(PARENT_ID, row),
    })).toBe('already-ruled');
  });
});

// ---------------------------------------------------------------------------
// The closed rosters these answers are held against
// ---------------------------------------------------------------------------

describe('the closed rosters these answers are held against', () => {
  // The direction that catches a reason nothing reaches. It fails
  // NAMING the token rather than reporting a count, which is what
  // makes a check deleted from the gate — or one never covered —
  // readable from the failure alone.
  it('reaches every reason the roster names', () => {
    expect(RULING_REFUSAL_REASONS
      .filter((reason) => !REACHED_REASONS.has(reason))).toEqual([]);
  });

  // The other direction. A reason answered that the roster does not
  // name means the gate has grown a token nothing here knows about,
  // which is the shape a widened gate takes when nobody updates the
  // roster beside it.
  it('answers no reason the roster does not name', () => {
    expect([...REACHED_REASONS]
      .filter((reason) => !REASON_ROSTER.includes(reason))).toEqual([]);
  });

  // The same pair for the acts, so an act added to `RULING_ACTS`
  // and driven by nothing is reported. The gate branches on this
  // roster, so an act no case drives is a branch no case reads.
  it('drives every act the roster names', () => {
    const acts: readonly string[] = RULING_ACTS;

    expect(RULING_ACTS.filter((act) => !DRIVEN_ACTS.has(act))).toEqual([]);
    expect([...DRIVEN_ACTS].filter((act) => !acts.includes(act))).toEqual([]);
  });

  // Without this the two guards above pass for a roster that had
  // stopped discriminating: a membership read answering true for
  // anything satisfies both directions at once. The fabricated
  // token is absent from the roster AND from what the cases
  // reached, and no reason is named twice.
  it('names neither a fabricated reason nor one twice', () => {
    expect(REASON_ROSTER).not.toContain(FABRICATED_REASON);
    expect(REACHED_REASONS.has(FABRICATED_REASON)).toBe(false);
    expect(RULING_REFUSAL_REASONS).toHaveLength(new Set(
      REASON_ROSTER,
    ).size);
  });
});
