/**
 * What `scripts/n8n-workflow.ts` makes of a workflow, asked with no
 * instance anywhere in the run. Every rule that module holds is
 * answered from a value — a type string, a node, an envelope — which
 * is the whole reason these cases sit in the default suite rather
 * than behind the live seam, and it is what lets a workflow written
 * out by hand stand in for one an instance would have handed over.
 *
 * Two subjects so far, and they are the two halves of one matcher. A
 * type {@link MANUAL_STARTER_TYPES} names comes back false, so a
 * workflow carrying one of them and nothing else arms nothing when
 * it is activated. A type {@link ARMED_TRIGGER_TYPES} names comes
 * back true, and so does the type this port schedules on, which
 * neither roster declares and which the name shape underneath them
 * is what answers for. The walk over a whole workflow's nodes that
 * `activatableTriggers` does and the projection `toApiWorkflow`
 * makes of a built artifact are two subjects of their own, and
 * neither is in this file yet.
 *
 * One case per entry, and the sample each one is paired with is that
 * entry's own type. Neither roster carries an id for that reason,
 * and the module argues the reason where they are declared. What a
 * case adds is what the pairing costs: there is no second list
 * behind it. The sibling in `tests/invariants/` declares a sample
 * per entry and holds two rosters against each other, so an entry
 * nobody wrote a sample for is reported by name; here the types are
 * read straight off whichever roster a block is about, and the set a
 * run records is derived from the same declaration it is held
 * against.
 *
 * So the comparison closing a block is not what an emptied roster
 * reddens. Two empty sets compare equal, and every case the loop
 * would have generated is gone with them, which leaves the rest of
 * the block quiet and printing a tick. The case in front of each
 * loop is what names that. What a comparison reaches instead is a
 * loop narrowed away from its roster — a slice, a filter, a
 * hand-written list — which goes on passing over whatever is left of
 * it, and it reaches that only because each type is recorded from
 * inside its own case rather than off the loop that declared them.
 * Measured on both blocks: emptying a roster reddens the case in
 * front of its loop alone and leaves the comparison green, slicing a
 * loop reddens the comparison alone, and a roster naming one type
 * twice reddens the comparison alongside the distinctness case.
 *
 * What keeps a block's claims from being strings a rule answering
 * everything the same way would have agreed about is the shape
 * underneath the rosters — a name ending in `Trigger`, which is what
 * {@link isActivatableTrigger} falls through to. Each block asserts
 * that its own entries sit on the far side of it, and the two read
 * it in opposite directions. Every manual type carries the ending,
 * so the fall-through answers true for each of them and the roster
 * overrides them to false; no armed type carries it, so the
 * fall-through answers false for each of them and the roster is what
 * makes them true. Measured: a matcher that had lost the manual
 * roster reads every manual type as arming, and one that had lost
 * the armed roster reads every armed type as manual. Asserted rather
 * than left as a remark, because an entry corrected onto the near
 * side leaves its own claim green while the reason for it is gone —
 * measured on both blocks, such an entry reddens its own block's
 * guard alone.
 *
 * The schedule type is the one sample in the file no entry declares,
 * and it is here because the fall-through is a reading of its own
 * rather than a default nothing reaches. Neither roster names it, so
 * the name shape is what answers, and its claim is the only one that
 * moves when that shape is what breaks. The guard beside it holds
 * both halves: no roster naming the type, and the ending the shape
 * reads. Measured, and the split is what the guard is for — an entry
 * for it in the armed roster leaves the claim GREEN while the guard
 * reddens, the claim having quietly stopped being about the
 * fall-through, and an entry in the manual roster reddens the two
 * together.
 *
 * What a block of nothing but refusals cannot reach is a matcher
 * answering false to whatever it is handed, and what an accepting
 * block cannot reach is one answering true. Neither reaches its own,
 * and each is the other's control. Measured: a matcher answering
 * false reddens every accepting claim and nothing among the
 * refusals, and a matcher answering true reddens every refusal and
 * nothing among the accepting claims. So the two are read together
 * or not at all, and a later task deleting either takes the evidence
 * for the other away with it.
 *
 * Two guards the sibling carries are absent from both blocks, and
 * both for the same reason. Nothing looks an entry up, so nothing
 * can fail to find one: a sample is an entry here, the schedule type
 * apart, where over there a sample names one and a lookup has to
 * refuse when the name matches nothing. And no plant is built, so
 * there is no node whose type could have been written out a second
 * time beside the string it was read from.
 */
import { describe, expect, it } from 'vitest';

import {
  ARMED_TRIGGER_TYPES,
  MANUAL_STARTER_TYPES,
  isActivatableTrigger,
} from '../../scripts/n8n-workflow.js';
import { SCHEDULE_TRIGGER_TYPE } from '../invariants/workflow-rosters.js';

// ---------------------------------------------------------------------------
// The name shape the rosters correct
// ---------------------------------------------------------------------------

/**
 * The ending {@link isActivatableTrigger} falls through to when
 * neither roster names a type.
 *
 * Written out here rather than imported, because the matcher holds
 * it as a literal inside its own last line and there is nothing to
 * import. That is the arrangement the guards reading it want anyway:
 * a guard reading the rule's own copy would agree with a rule that
 * had drifted into some other ending, and two hand-written spellings
 * are the only shape where comparing them says anything.
 *
 * Read by containment at the end of a string, which is how the
 * matcher reads it, and that ending is the one thing each of those
 * guards has in common with the rule it stands behind. The
 * alternative is asking the matcher, and the matcher is what these
 * cases are about.
 *
 * Three of them read it, and two read it in opposite directions: one
 * block asserts every type it hands over carries the ending, the
 * other that none of its own does. That relation is the constant's
 * own to state, neither block being able to say anything about the
 * other's entries.
 */
const TRIGGER_SUFFIX = 'Trigger';

// ---------------------------------------------------------------------------
// The types each case was handed, as it was handed them
// ---------------------------------------------------------------------------

/**
 * Types of the {@link MANUAL_STARTER_TYPES} entries whose case ran,
 * added as each one does.
 *
 * Recorded from inside the case rather than off the loop that
 * declared them, which is the difference between the entries a block
 * was written over and the ones it reached.
 *
 * A set rather than a list, so two entries declared for one type
 * arrive here once. That does not leave the coverage comparison
 * closing that block untouched — measured, a roster naming one type
 * twice reddens it as well, the run having recorded one type fewer
 * than the roster declares. The two report that drift differently,
 * and the distinctness case is the one that names the shared type.
 */
const EXERCISED_MANUAL_TYPES = new Set<string>();

/**
 * Types of the {@link ARMED_TRIGGER_TYPES} entries whose case ran,
 * added as each one does.
 *
 * Why a set, and why it is written from inside a case rather than
 * read off the loop that declared them, is argued on
 * {@link EXERCISED_MANUAL_TYPES} and holds here word for word. What
 * is its own is what the recording leaves OUT. The schedule type
 * reaches the matcher from a case of its own rather than from the
 * loop, so it never arrives here, and the comparison closing that
 * block is about the roster and about nothing else.
 */
const EXERCISED_ARMED_TYPES = new Set<string>();

// ---------------------------------------------------------------------------
// The types a workflow can hold without arming anything
// ---------------------------------------------------------------------------

describe('isActivatableTrigger — every type the manual roster names', () => {
  // In front of the loop rather than left to it. Every per-entry
  // claim in this block is generated from the roster, and an emptied
  // roster generates none of them while satisfying the comparison
  // that closes the block — one empty set equalling another. This is
  // what names the list it went quiet over.
  it('declares at least one type to hand the matcher', () => {
    expect(MANUAL_STARTER_TYPES.length).toBeGreaterThan(0);
  });

  // What every per-entry claim in this block takes on trust. Each
  // entry is asserted on its own, so a roster whose entries had
  // collapsed onto one type would print a tick apiece while putting
  // one string through the matcher over and over.
  //
  // Compared as sorted lists rather than by counting, so the diff
  // names the type two entries share instead of reporting that a
  // number came up short.
  it('names a distinct type in each of them', () => {
    const declared = MANUAL_STARTER_TYPES.map((rule) => rule.type);

    expect([...new Set(declared)].sort()).toEqual([...declared].sort());
  });

  // The guard that keeps every refusal in this block about the
  // roster rather than about the matcher agreeing with itself. Each
  // of these types ends the way the matcher's own fall-through
  // reads, so the rule underneath the rosters answers true for all
  // five and the false each case asserts is the roster overriding
  // it.
  //
  // Held as the whole list against the whole list rather than as a
  // count, so an entry corrected into some other shape is named in
  // the diff — and its own refusal stays green while it is, which is
  // the drift nothing else in this file reports. The accepting block
  // carries the mirror of this guard, reading the same ending the
  // other way about.
  it('is handed types the name shape alone would read as arming', () => {
    const declared = MANUAL_STARTER_TYPES.map((rule) => rule.type);
    const shaped = declared.filter((type) => type.endsWith(TRIGGER_SUFFIX));

    expect(shaped).toEqual(declared);
  });

  // One case per entry, named by the type it is about. The type is
  // the join key here, so the name of a case that reddens is the
  // whole of what a reader needs to find the entry it stands for.
  //
  // The type is handed over as the entry spells it rather than
  // written out again. Every one of these strings was read off a
  // published node registry once, and a copy beside the case would
  // put a second unchecked spelling where there is one — so what a
  // claim here says is that the matcher reads the roster and reaches
  // every entry in it, and not that the string an entry carries is
  // one an instance loads.
  for (const rule of MANUAL_STARTER_TYPES) {
    it(`answers false for ${rule.type}`, () => {
      EXERCISED_MANUAL_TYPES.add(rule.type);

      expect(isActivatableTrigger(rule.type)).toBe(false);
    });
  }

  // Last in the block on purpose: a file's cases run in the order
  // they were declared, so the set read here is one every case
  // before it has already written to. A run selecting this case on
  // its own — a `-t` filter naming it — reports the whole roster as
  // unreached, which is what asking at run time costs over reading
  // the loop that declared them.
  //
  // What it buys for that is the drift the loop cannot report about
  // itself. Both sides come off `MANUAL_STARTER_TYPES`, so this says
  // nothing whatever about an emptied roster and reddens instead on
  // a loop that stopped walking all of one — or, alongside the
  // distinctness case, on a roster that names one type twice.
  it('hands the matcher every type the roster declares', () => {
    const reached = [...EXERCISED_MANUAL_TYPES].sort();
    const declared = MANUAL_STARTER_TYPES.map((rule) => rule.type).sort();

    expect(reached).toEqual(declared);
  });
});

// ---------------------------------------------------------------------------
// The types a workflow cannot hold and stay quiet
// ---------------------------------------------------------------------------

describe('isActivatableTrigger — the types that arm a workflow', () => {
  // In front of the loop, for the reason the same case carries in
  // the block above: every per-entry claim here is generated from
  // `ARMED_TRIGGER_TYPES`, and an emptied roster generates none of
  // them while the comparison closing this block goes on comparing
  // one empty set with another.
  it('declares at least one type to hand the matcher', () => {
    expect(ARMED_TRIGGER_TYPES.length).toBeGreaterThan(0);
  });

  // What every per-entry claim here takes on trust, again mirroring
  // the block above: entries collapsed onto one type would put a
  // single string through the matcher once per entry and print a
  // tick for each.
  it('names a distinct type in each of them', () => {
    const declared = ARMED_TRIGGER_TYPES.map((rule) => rule.type);

    expect([...new Set(declared)].sort()).toEqual([...declared].sort());
  });

  // The guard that keeps every per-entry claim here about the
  // roster, and the mirror of the same guard in the block above:
  // between them they are where `TRIGGER_SUFFIX` is read in opposite
  // directions. Up there the entries all carry the ending, so the
  // fall-through would answer true and the roster overrides it to
  // false; here no entry carries it, so the fall-through would
  // answer false and the roster is what makes the answer true. An
  // armed entry ending in `Trigger` would be answered by the name
  // shape whether or not the roster named it, and its own claim
  // would go on passing with the roster doing nothing — measured,
  // such an entry reddens this case alone.
  //
  // It is also where the qualifier this block stands for is settled.
  // Every armed type is one the name shape reads as manual, which is
  // read off the roster here rather than written into the loop as a
  // filter: a filter would drop an entry that stopped being one from
  // the run instead of reporting it.
  it('is handed types the name shape alone would read as manual', () => {
    const declared = ARMED_TRIGGER_TYPES.map((rule) => rule.type);
    const shaped = declared.filter((type) => !type.endsWith(TRIGGER_SUFFIX));

    expect(shaped).toEqual(declared);
  });

  // What the schedule claim below rests on, and the only guard in
  // this file standing behind a type no roster declares. Neither
  // roster names the schedule type, so what answers for it is the
  // name shape rather than a roster hit, and it carries the ending
  // that shape reads, so the shape is able to answer at all.
  //
  // Both halves in one record, so the diff names which of the two
  // moved: a rostered schedule type and one whose name lost the
  // ending are different edits in different files. Measured, and
  // only the first of them is silent elsewhere — an entry for the
  // type in the ARMED roster reddens this case while the claim below
  // stays green, the claim having quietly stopped being about the
  // fall-through, and an entry in the manual roster reddens the two
  // together because the answer really does change.
  it('is handed a schedule type neither roster names', () => {
    const rostered = [...MANUAL_STARTER_TYPES, ...ARMED_TRIGGER_TYPES]
      .map((rule) => rule.type)
      .filter((type) => type === SCHEDULE_TRIGGER_TYPE);

    expect({
      endsInTheSuffix: SCHEDULE_TRIGGER_TYPE.endsWith(TRIGGER_SUFFIX),
      rostersNamingIt: rostered,
    }).toEqual({ endsInTheSuffix: true, rostersNamingIt: [] });
  });

  // The third of the matcher's three readings, and the only claim in
  // this file that reaches it. The type this port schedules on is in
  // neither roster, so what answers for it is the name shape those
  // rosters correct — measured, a fall-through returning false
  // reddens this case alone.
  //
  // The limit is the other direction, and nothing here closes it: a
  // fall-through widened to answer true for anything leaves every
  // case in this file green, each rostered type being answered
  // before it and this one answering true either way. What would
  // reach that is a type carrying neither the ending nor a roster
  // entry, and no case here hands one over.
  //
  // Read off `tests/invariants/workflow-rosters.ts` rather than
  // spelled again, which is the whole of why a case here imports
  // across a directory. The module under test argues at its own
  // armed roster that a second copy of this string with nothing
  // holding the two together is the drift one declaration exists to
  // stop, and declines to hold one anyway — a shipped script
  // reaching for it would be dragging a test module onto an operator
  // command's import graph. A case is under no such weight: what it
  // reaches for is a constant one directory across.
  it(`answers true for ${SCHEDULE_TRIGGER_TYPE}`, () => {
    expect(isActivatableTrigger(SCHEDULE_TRIGGER_TYPE)).toBe(true);
  });

  // One case per entry, named by the type it is about, and the type
  // handed over as the entry spells it — both for the reasons the
  // loop in the block above carries. What a claim here says is that
  // the matcher reads this roster and reaches every entry in it,
  // never that the string an entry carries is one an instance loads.
  for (const rule of ARMED_TRIGGER_TYPES) {
    it(`answers true for ${rule.type}`, () => {
      EXERCISED_ARMED_TYPES.add(rule.type);

      expect(isActivatableTrigger(rule.type)).toBe(true);
    });
  }

  // Last in the block, reading a set every case in it has already
  // written to, and saying what the loop cannot say about itself: a
  // walk narrowed away from the roster goes on passing over whatever
  // is left of it. Both sides come off `ARMED_TRIGGER_TYPES`, so
  // this is silent about an emptied roster — that is the first case
  // in the block — and reddens instead on a sliced loop, or
  // alongside the distinctness case on a roster naming one type
  // twice.
  it('hands the matcher every type the roster declares', () => {
    const reached = [...EXERCISED_ARMED_TYPES].sort();
    const declared = ARMED_TRIGGER_TYPES.map((rule) => rule.type).sort();

    expect(reached).toEqual(declared);
  });
});
