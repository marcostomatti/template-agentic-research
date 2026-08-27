/**
 * What `scripts/n8n-workflow.ts` makes of a workflow, asked with no
 * instance anywhere in the run. Every rule that module holds is
 * answered from a value — a type string, a node, an envelope — which
 * is the whole reason these cases sit in the default suite rather
 * than behind the live seam, and it is what lets a workflow written
 * out by hand stand in for one an instance would have handed over.
 *
 * The first subject is the roster of manual starters and the answer
 * they share. A type {@link MANUAL_STARTER_TYPES} names comes back
 * false, so a workflow carrying one of them and nothing else arms
 * nothing when it is activated. The accepting half of the same
 * matcher, the walk over a whole workflow's nodes that
 * `activatableTriggers` does, and the projection `toApiWorkflow`
 * makes of a built artifact are three subjects of their own, and
 * none of them is in this file yet.
 *
 * One case per entry, and the sample each one is paired with is that
 * entry's own type. The roster carries no id for that reason and
 * argues the reason where it is declared. What a case adds is what
 * the pairing costs: there is no second list behind it. The sibling
 * in `tests/invariants/` declares a sample per entry and holds two
 * rosters against each other, so an entry nobody wrote a sample for
 * is reported by name; here the types are read straight off the one
 * roster, and the set a run records is derived from the same
 * declaration it is held against.
 *
 * So the comparison at the end of the section is not what an emptied
 * roster reddens. Two empty sets compare equal, and every case the
 * loop would have generated is gone with them, which leaves the
 * whole section quiet and printing a tick. The case in front of the
 * loop is what names that. What the comparison reaches instead is a
 * loop narrowed away from the roster — a slice, a filter, a
 * hand-written list — which goes on passing over whatever is left of
 * it, and it reaches that only because each type is recorded from
 * inside its own case rather than off the loop that declared them.
 * Measured: emptying the roster reddens the case in front of the
 * loop alone and leaves the comparison green, and slicing the loop
 * reddens the comparison alone.
 *
 * What keeps five refusals from being five strings any rule refusing
 * whatever it is handed would have agreed about is the shape
 * underneath the rosters. Every type here ends in `Trigger`, which
 * is the name shape {@link isActivatableTrigger} falls through to,
 * so each of these is a type that fall-through answers true for and
 * the roster is what overrides it. A matcher that had lost the
 * roster reads all five as arming. That is asserted rather than left
 * as a remark, because an entry corrected into a type of some other
 * shape leaves its own refusal green while the reason for it is
 * gone.
 *
 * What none of it reaches is a matcher answering false to whatever
 * it is handed, which satisfies every claim below. A section of
 * nothing but refusals cannot part that from a live rule; only an
 * accepting claim can, and an accepting claim stands opposite such a
 * section rather than inside it. This file makes none yet, so what
 * is here is worth exactly that much and no more.
 *
 * Two guards the sibling carries are absent, and both for the same
 * reason. Nothing looks an entry up, so nothing can fail to find
 * one: a sample IS an entry here, where over there a sample names
 * one and a lookup has to refuse when the name matches nothing. And
 * no plant is built, so there is no node whose type could have been
 * written out a second time beside the string it was read from.
 */
import { describe, expect, it } from 'vitest';

import {
  MANUAL_STARTER_TYPES,
  isActivatableTrigger,
} from '../../scripts/n8n-workflow.js';

// ---------------------------------------------------------------------------
// The name shape the rosters correct
// ---------------------------------------------------------------------------

/**
 * The ending {@link isActivatableTrigger} falls through to when
 * neither roster names a type.
 *
 * Written out here rather than imported, because the matcher holds
 * it as a literal inside its own last line and there is nothing to
 * import. That is the arrangement this guard wants anyway: a guard
 * reading the rule's own copy would agree with a rule that had
 * drifted into some other ending, and two hand-written spellings are
 * the only shape where comparing them says anything.
 *
 * Read by containment at the end of a string, which is how the
 * matcher reads it, and that ending is the one thing this guard has
 * in common with the rule it stands behind. The alternative is
 * asking the matcher, and the matcher is what these cases are about.
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
 * declared them, which is the difference between the entries the
 * section was written over and the ones it reached.
 *
 * A set rather than a list, so two entries declared for one type
 * arrive here once. That does not leave the comparison below about
 * coverage untouched — measured, a roster naming one type twice
 * reddens it as well, the run having recorded one type fewer than
 * the roster declares. The two report that drift differently, and
 * the case above the loop is the one that names the shared type.
 */
const EXERCISED_MANUAL_TYPES = new Set<string>();

// ---------------------------------------------------------------------------
// The types a workflow can hold without arming anything
// ---------------------------------------------------------------------------

describe('isActivatableTrigger — every type the manual roster names', () => {
  // In front of the loop rather than left to it. Every claim below
  // is generated from the roster, and an emptied roster generates
  // none of them while satisfying the comparison that closes the
  // section — one empty set equalling another. This is what names
  // the list it went quiet over.
  it('declares at least one type to hand the matcher', () => {
    expect(MANUAL_STARTER_TYPES.length).toBeGreaterThan(0);
  });

  // What every claim below takes on trust. Each entry is asserted on
  // its own, so a roster whose entries had collapsed onto one type
  // would print a tick apiece while putting one string through the
  // matcher over and over.
  //
  // Compared as sorted lists rather than by counting, so the diff
  // names the type two entries share instead of reporting that a
  // number came up short.
  it('names a distinct type in each of them', () => {
    const declared = MANUAL_STARTER_TYPES.map((rule) => rule.type);

    expect([...new Set(declared)].sort()).toEqual([...declared].sort());
  });

  // The guard that keeps every refusal below about the roster rather
  // than about the matcher agreeing with itself. Each of these types
  // ends the way the matcher's own fall-through reads, so the rule
  // underneath the rosters answers true for all five and the false
  // each case asserts is the roster overriding it.
  //
  // Held as the whole list against the whole list rather than as a
  // count, so an entry corrected into some other shape is named in
  // the diff — and its own refusal stays green while it is, which is
  // the drift nothing else here reports.
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
  // a loop that stopped walking all of one — or, alongside the case
  // above it, on a roster that names one type twice.
  it('hands the matcher every type the roster declares', () => {
    const reached = [...EXERCISED_MANUAL_TYPES].sort();
    const declared = MANUAL_STARTER_TYPES.map((rule) => rule.type).sort();

    expect(reached).toEqual(declared);
  });
});
