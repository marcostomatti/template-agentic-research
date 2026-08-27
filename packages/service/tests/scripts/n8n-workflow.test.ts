/**
 * What `scripts/n8n-workflow.ts` makes of a workflow, asked with no
 * instance anywhere in the run. Every rule that module holds is
 * answered from a value — a type string, a node, an envelope — which
 * is the whole reason these cases sit in the default suite rather
 * than behind the live seam, and it is what lets a workflow written
 * out by hand stand in for one an instance would have handed over.
 *
 * Four subjects, and the first two are the two halves of one
 * matcher. A type {@link MANUAL_STARTER_TYPES} names comes back
 * false, so a workflow carrying one of them and nothing else arms
 * nothing when it is activated. A type {@link ARMED_TRIGGER_TYPES}
 * names comes back true, and so does the type this port schedules
 * on, which neither roster declares and which the name shape
 * underneath them is what answers for. The third is the walk
 * {@link activatableTriggers} makes over a whole workflow, which
 * asks that of every node it holds and drops what the executor drops
 * before asking anything. The fourth asks nothing of a node at all:
 * {@link toApiWorkflow} cuts an envelope down to the four members
 * n8n's public API takes, and what it is handed is an artifact
 * carrying every member that API refuses.
 *
 * One case per entry in each of the two matcher blocks, and the
 * sample each one is paired with is that entry's own type. Neither
 * roster carries an id for that reason, and the module argues the
 * reason where they are declared. What a case adds is what the
 * pairing costs: there is no second list behind it. The sibling in
 * `tests/invariants/` declares a sample per entry and holds two
 * rosters against each other, so an entry nobody wrote a sample for
 * is reported by name; here the types are read straight off
 * whichever roster a block is about, and the set a run records is
 * derived from the same declaration it is held against.
 *
 * So the comparison closing a roster block is not what an emptied
 * roster reddens. Two empty sets compare equal, and every case the
 * loop would have generated is gone with them, which leaves the rest
 * of the block quiet and printing a tick. The case in front of each
 * loop is what names that. What a comparison reaches instead is a
 * loop narrowed away from its roster — a slice, a filter, a
 * hand-written list — which goes on passing over whatever is left of
 * it, and it reaches that only because each type is recorded from
 * inside its own case rather than off the loop that declared them.
 * Measured on both: emptying a roster reddens the case in front of
 * its loop alone and leaves the comparison green, slicing a loop
 * reddens the comparison alone, and a roster naming one type twice
 * reddens the comparison alongside the distinctness case.
 *
 * What keeps a roster block's claims from being strings a rule
 * answering everything the same way would have agreed about is the
 * shape underneath the rosters — a name ending in `Trigger`, which
 * is what {@link isActivatableTrigger} falls through to. Each of the
 * two asserts that its own entries sit on the far side of it, and
 * they read it in opposite directions. Every manual type carries the
 * ending, so the fall-through answers true for each of them and the
 * roster overrides them to false; no armed type carries it, so the
 * fall-through answers false for each of them and the roster is what
 * makes them true. Measured: a matcher that had lost the manual
 * roster reads every manual type as arming, and one that had lost
 * the armed roster reads every armed type as manual. Asserted rather
 * than left as a remark, because an entry corrected onto the near
 * side leaves its own claim green while the reason for it is gone —
 * measured on both, such an entry reddens its own block's guard
 * alone.
 *
 * The schedule type is the one type either of those blocks hands the
 * matcher that no entry declares, and it is there because the
 * fall-through is a reading of its own rather than a default nothing
 * reaches. Neither roster names it, so the name shape is what
 * answers, and its claim is what moves when that shape stops
 * answering true — measured, alongside the third block's own pair,
 * whose clocks carry that same type. The guard beside it holds both
 * halves: no roster naming the type, and the ending the shape reads.
 * Measured, and the split is what the guard is for — an entry for it
 * in the armed roster leaves the claim GREEN while the guard
 * reddens, the claim having quietly stopped being about the
 * fall-through, and an entry in the manual roster reddens the two
 * together and that pair with them.
 *
 * Of those two, the block of nothing but refusals cannot reach a
 * matcher answering false to whatever it is handed, and the
 * accepting one cannot reach one answering true. Neither reaches its
 * own, and each is the other's control. Measured: a matcher
 * answering false reddens every accepting claim and nothing among
 * the refusals, and a matcher answering true reddens every refusal
 * and nothing among the accepting claims. So the two are read
 * together or not at all, and a later task deleting either takes the
 * evidence for the other away with it. Neither mutation is confined
 * to them now that a third block asks the matcher too — each reddens
 * 7 of 25 rather than 5, the extra pair being that block's guard and
 * the answer it holds, which move with the matcher without saying
 * which way it went wrong.
 *
 * Two guards the sibling carries are absent from both of them, and
 * both for the same reason. Nothing looks an entry up, so nothing
 * can fail to find one: a sample is an entry there, the schedule
 * type apart, where over there a sample names one and a lookup has
 * to refuse when the name matches nothing. And neither builds a
 * node, so neither holds one whose type could have been written out
 * a second time beside the string it was read from.
 *
 * The third block builds three, and its own guard is about that
 * fixture rather than about a lookup. Two of them are clocks of one
 * type with one of them switched off, so what parts those two is the
 * `disabled` member and nothing else; the third starts nothing, so
 * what parts the answer from every node an operator left switched on
 * is the matcher. A disabled node whose type armed nothing would be
 * dropped for a reason the claim is not about, and the guard is what
 * says this one is not that.
 *
 * Two readings that block does not reach. The skip is strict against
 * `true`, and every other value is one the executor still runs —
 * which the module argues at length and which no case here hands
 * over, a truthy test answering exactly as the shipped one does over
 * this fixture. And one node comes back, so nothing here says the
 * answer is a count rather than a set, or that it holds the
 * workflow's own order.
 *
 * The fourth reads back both halves of what a projection is, in two
 * cases rather than one. The answer's member set is exactly the
 * four, which is what says the six are dropped and, at the other
 * end, that the four came back at all — an answer of nothing
 * satisfies every absence a rejected member could be asked about.
 * And the value behind each of the four is the artifact's own, which
 * is the claim a projection inventing four values would fail and a
 * member set would not. Measured, each of the two reddens alone: a
 * projection forwarding the whole envelope moves the first, and one
 * that had swapped two of the four moves the second.
 *
 * That block's guard is about its artifact rather than about a
 * roster, and each of its two halves stands behind one of the
 * claims. The member list is what says there was anything to drop
 * and anything to forward: an artifact short of a rejected member is
 * one the drop claim was never asked to drop, and short of a
 * projected one both sides of the identity comparison answer
 * `undefined` and agree. The four values being four is what keeps
 * the second claim about which member went where, since a fixture
 * whose four had collapsed onto one leaves a projection reading the
 * wrong member into every one of them answering as the shipped one
 * does. Measured, all three of those leave both claims green and
 * redden the guard alone.
 *
 * Two readings the fourth does not reach either. Nothing asks the
 * artifact what it holds after the call, its guard running before
 * both claims, so a projection that had deleted the six from what it
 * was handed passes every case in the block. And the four are read
 * through a roster this file spells out, so a roster emptied leaves
 * the value claim comparing one empty list with another — measured,
 * the guard and the drop claim are what redden there.
 */
import type {
  ActivationNode,
  ActivationWorkflow,
  BuiltArtifact,
} from '../../scripts/n8n-workflow.js';

import { describe, expect, it } from 'vitest';

import {
  ARMED_TRIGGER_TYPES,
  MANUAL_STARTER_TYPES,
  activatableTriggers,
  isActivatableTrigger,
  toApiWorkflow,
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
  // these two blocks standing behind a type no roster declares.
  // Neither roster names the schedule type, so what answers for it
  // is the name shape rather than a roster hit, and it carries the
  // ending that shape reads, so the shape is able to answer at all.
  //
  // Both halves in one record, so the diff names which of the two
  // moved: a rostered schedule type and one whose name lost the
  // ending are different edits in different files. Measured, and
  // only the first of them is silent elsewhere — an entry for the
  // type in the ARMED roster reddens this case while the claim below
  // stays green, the claim having quietly stopped being about the
  // fall-through, while an entry in the manual roster reddens the
  // two together and the third block's own two with them, because
  // the answer really does change.
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
  // these two blocks that reaches it. The type this port schedules
  // on is in neither roster, so what answers for it is the name
  // shape those rosters correct — measured, a fall-through returning
  // false reddens this case, and the third block's guard and answer
  // with it, since the type its clocks carry is this one.
  //
  // The other direction is not this claim's to reach, and it is not
  // left open either. A fall-through widened to answer true for
  // anything leaves every case in these two blocks green, each
  // rostered type being answered before it and this one answering
  // true either way; what reads it is a type carrying neither the
  // ending nor a roster entry, and the workflow the third block is
  // asked about holds one — measured, that widening reddens its
  // guard and the answer it holds, and nothing here.
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

// ---------------------------------------------------------------------------
// The workflow the walk is asked about
// ---------------------------------------------------------------------------

/**
 * The clock an operator switched off on the canvas.
 *
 * `disabled` is exactly `true`, which is the value the executor
 * compares against and the only one {@link activatableTriggers}
 * drops a node for. The fixture guard reads it back. A member
 * spelled anything else leaves a node nobody switched off, which
 * both claims move under as well — measured, three cases at once —
 * and what the guard adds is that the failure is named at the member
 * rather than read off an answer holding one node too many.
 *
 * It carries the type this port schedules on, so the matcher answers
 * true for it and what leaves it out is the skip rather than a
 * classification. That is the other half the guard reads, and it is
 * the half nothing else here reaches: a disabled node of a type that
 * armed nothing would be left out either way.
 */
const DISABLED_CLOCK: ActivationNode = {
  disabled: true,
  name: 'Fire On The Clock',
  type: SCHEDULE_TRIGGER_TYPE,
};

/**
 * The clock left running, and the whole of what the walk should hand
 * back.
 *
 * The same type as {@link DISABLED_CLOCK}, so the two differ in the
 * `disabled` member and in a name, and no reading of the type could
 * have kept one and dropped the other.
 *
 * It is also this block's accept control. A walk answering with
 * nothing at all satisfies every claim about what it leaves out, so
 * what says the drop is a drop rather than an empty answer is that
 * this node comes back — which is why the two are cases of their own
 * rather than expectations in one.
 */
const ENABLED_CLOCK: ActivationNode = {
  name: 'Fire On The Clock As Well',
  type: SCHEDULE_TRIGGER_TYPE,
};

/**
 * A node that starts nothing, enabled, and sitting between the two
 * clocks.
 *
 * Its type is in neither roster and does not end the way the name
 * shape reads, so the matcher answers false for it. That is what
 * makes the keep claim about a walk that asks the matcher rather
 * than one handing back whatever an operator left switched on:
 * without it a walk that had stopped asking would answer the same.
 *
 * A type spelled here rather than read off a roster, which is safe
 * only because nothing declares it: there is no entry whose spelling
 * a second copy could drift from. What the guard does with it is ask
 * the matcher rather than take the classification on trust.
 */
const PLAIN_NODE: ActivationNode = {
  name: 'Read The Due Rows',
  type: 'n8n-nodes-base.postgres',
};

/**
 * The workflow all three claims are asked of.
 *
 * The node that should come back sits last and the disabled one
 * first, so a walk that took the front of the list, or stopped at
 * the first node it could keep, answers differently from one that
 * filtered.
 */
const TWO_CLOCKS_ONE_OFF: ActivationWorkflow = {
  nodes: [DISABLED_CLOCK, PLAIN_NODE, ENABLED_CLOCK],
};

describe('activatableTriggers — a trigger node left disabled', () => {
  // What both claims after it rest on, and the only case in this
  // block that asks nothing of the walk. Four halves, and each names
  // a way the block could have been about something else. A disabled
  // node whose type armed nothing would be left out by the matcher
  // rather than by the skip. An enabled node of some other type
  // would leave a reading of the type able to part the two. A member
  // spelled anything but `disabled` would leave a node nobody
  // switched off. And a third node the matcher answered true for
  // would leave the keep claim satisfied by a walk that had stopped
  // asking it at all.
  //
  // Held in one record so the diff names which half moved. The two
  // type halves are the ones nothing else reaches: measured, either
  // of them edited reddens this case alone, while the other two
  // redden a claim alongside it and are loud without the guard.
  it('is handed a disabled node whose type would otherwise arm', () => {
    expect({
      theDisabledMemberIsExactlyTrue: DISABLED_CLOCK.disabled === true,
      theDisabledNodesTypeArms: isActivatableTrigger(DISABLED_CLOCK.type),
      theEnabledNodeCarriesThatType:
        ENABLED_CLOCK.type === DISABLED_CLOCK.type,
      theRemainingNodesTypeArms: isActivatableTrigger(PLAIN_NODE.type),
    }).toEqual({
      theDisabledMemberIsExactlyTrue: true,
      theDisabledNodesTypeArms: true,
      theEnabledNodeCarriesThatType: true,
      theRemainingNodesTypeArms: false,
    });
  });

  // The claim. A node an operator switched off is not among the ones
  // an activation would start, and the guard is what says it is the
  // skip that left it out rather than anything about its type.
  //
  // By reference rather than by name, so what it is about is the
  // node the fixture declares and not a string two nodes could
  // share. On its own it holds for a walk handing back nothing at
  // all, which is what the case after it is for: measured, a walk
  // answering with nothing reddens that one and leaves this green.
  it('leaves the disabled node out of what it hands back', () => {
    expect(activatableTriggers(TWO_CLOCKS_ONE_OFF)).not.toContain(
      DISABLED_CLOCK,
    );
  });

  // What the claim before it rests on, and the whole answer rather
  // than a containment. The clock left running comes back, so the
  // drop is a drop and not an empty answer; the node that starts
  // nothing does not, so the walk asks the matcher rather than
  // handing back every node an operator left switched on.
  //
  // One node comes back rather than two, so nothing here says the
  // answer is a count rather than a set, or that it holds the
  // workflow's own order. What it does reach is a walk that stopped
  // early or took the front of the list, the node it wants being
  // last of the three.
  it('hands back the clock left running, and nothing besides', () => {
    expect(activatableTriggers(TWO_CLOCKS_ONE_OFF)).toEqual([ENABLED_CLOCK]);
  });
});

// ---------------------------------------------------------------------------
// The artifact the projection is asked about
// ---------------------------------------------------------------------------

/**
 * The four members of a workflow n8n's public API takes, written out
 * here rather than read off the module under test.
 *
 * `toApiWorkflow` writes them as a literal inside its own return
 * statement and holds no roster of its own, and its block argues
 * why: a roster there would be a second spelling of a list
 * `ApiWorkflow` already declares once. Which is exactly the
 * arrangement the cases below want, and for the reason
 * {@link TRIGGER_SUFFIX} carries — a list read off the rule would
 * agree with a rule that had quietly dropped a member, and two
 * hand-written spellings are the only shape where comparing them
 * says anything.
 *
 * Both claims below read it, so what the answer's member set is held
 * against and what its values are held against are one list. A
 * member added here that the projection does not write moves the two
 * together, rather than leaving one of them about some other four.
 */
const PROJECTED_MEMBERS = ['connections', 'name', 'nodes', 'settings'];

/**
 * The six members a built artifact can carry that the public API
 * refuses, and the whole of what {@link BUILT_ARTIFACT} is stocked
 * with beyond the four.
 *
 * One list rather than two, though the schema knows them two ways:
 * `id`, `active` and `tags` it names and marks read-only, and
 * `versionId`, `meta` and `pinData` it does not name at all. Nothing
 * here reads that difference because nothing downstream of the
 * projection does either — the schema is
 * `additionalProperties: false` over the four, so a body carrying
 * any of the six is refused whole and which of the two ways it was
 * refused changes nothing.
 *
 * Three of them are what this port's own build writes. `id`,
 * `active` and `versionId` are declared in `ar-dispatch.json` and
 * copied through unchanged, so no artifact under `workflows/dist/`
 * is POSTable as it stands. The other three arrive on a workflow
 * exported off a canvas, which is what an audit path reads back off
 * an instance rather than anything the build wrote. Both classes are
 * here because the projection is what stands between the two.
 *
 * Names alone, with no reason beside them, which is where this parts
 * from the trigger rosters above. There the classification is what a
 * roster is for and a reason is what makes an entry checkable
 * against a node. Here every member is refused the same way for the
 * same reason, and the schema is what says so rather than anything
 * about the member itself.
 */
const REJECTED_MEMBERS = [
  'active',
  'id',
  'meta',
  'pinData',
  'tags',
  'versionId',
];

/**
 * The artifact both claims are asked of: every one of the four
 * members the API takes, and every one of the six it refuses.
 *
 * That it carries all six is what the drop claim is worth. An
 * artifact short of one is one the projection was never asked to
 * drop, and the claim goes on passing having said nothing whatever
 * about it — which is the whole of what the guard reads back, and
 * the reason the guard is a case rather than a remark.
 *
 * The values behind the six are thin on purpose. What a rejected
 * member costs is carrying the KEY at all, the schema refusing a
 * body for a name it did not expect and never for what sits behind
 * it, so the fixture's job there is the member and not a plausible
 * payload.
 *
 * The four are not thin, and no two of them are one value, because
 * the second claim compares them by identity. Four values that
 * happened to be equal would leave a projection that had mixed the
 * members up answering exactly as the shipped one does, and that is
 * the guard's other half.
 *
 * Hand-written rather than read out of `workflows/dist/`, which is
 * the whole reason these cases sit in the default suite: the
 * projection is answered from a value, so a case owes it a value and
 * not a tree. What that costs is that nothing here says a shipped
 * artifact carries what this one carries. The invariants suite is
 * what reads the built tree, and this file reads none of it.
 */
const BUILT_ARTIFACT: BuiltArtifact = {
  active: false,
  connections: { 'Fire On The Clock': { main: [[]] } },
  id: 'ar-dispatch',
  meta: {},
  name: 'AR Dispatch',
  nodes: [{ name: 'Fire On The Clock', type: SCHEDULE_TRIGGER_TYPE }],
  pinData: {},
  settings: { executionOrder: 'v1' },
  tags: [],
  versionId: '00000000-0000-4000-8000-000000000000',
};

describe('toApiWorkflow — an artifact carrying what the API refuses', () => {
  // What both claims after it rest on, and the only case in this
  // block that asks nothing of the projection. Two halves, and each
  // names a way the block could have been about something else.
  //
  // The first is the fixture's own member list, held against both
  // rosters at once rather than each roster against the fixture.
  // Written the other way about, it would be blind where it matters
  // most: an emptied `REJECTED_MEMBERS` filters to nothing and
  // compares equal to nothing, leaving a drop claim asked about an
  // artifact with nothing to drop. This way a roster emptied on
  // either side, a member either roster lost, and a member named by
  // both — which puts one name in twice — are all named in the diff.
  //
  // The second is that the four carry four values. Each is compared
  // by identity below, so a fixture whose four had collapsed onto
  // one would answer the same for a projection that read the wrong
  // member into every one of them.
  it('is handed an artifact carrying every member the rosters name', () => {
    const declared = [...PROJECTED_MEMBERS, ...REJECTED_MEMBERS].sort();
    const values = new Set(
      PROJECTED_MEMBERS.map((member) => BUILT_ARTIFACT[member]),
    );

    expect({
      itsOwnMembers: Object.keys(BUILT_ARTIFACT).sort(),
      valuesBehindTheProjectedOnes: values.size,
    }).toEqual({
      itsOwnMembers: declared,
      valuesBehindTheProjectedOnes: PROJECTED_MEMBERS.length,
    });
  });

  // The claim. What comes back carries the four members n8n's public
  // API takes and not one of the six it refuses, over an artifact
  // carrying all ten.
  //
  // Written as the answer's whole member set against the roster
  // rather than as a list of names asserted absent, because the
  // member that leaks is the one nobody thought to write down. It
  // costs nothing to say it this way and it closes the other end at
  // the same time: an answer of nothing at all satisfies every
  // absence a rejected member could be asked about, and reddens
  // here.
  //
  // Sorted on both sides, so the order the projection writes its
  // four in is not something this claims. Nothing downstream reads
  // it — a request body is JSON and a member order is not a member.
  it('hands back those four members and none of the six', () => {
    const answered = Object.keys(toApiWorkflow(BUILT_ARTIFACT));

    expect(answered.sort()).toEqual([...PROJECTED_MEMBERS].sort());
  });

  // What the claim before it leaves open: the four came back, and
  // these are the artifact's own four rather than four values the
  // projection made up. Measured by identity rather than by
  // equality, which is what the shipped projection gives — it
  // forwards, and copies nothing.
  //
  // Read through the roster the claim above is held against, so both
  // are about one set of four. A member looked up and not found
  // reads here as a value that was not forwarded, which is the
  // honest answer for a projection that dropped it.
  //
  // Held as the filtered list against the whole list rather than as
  // a count, so the diff names the member whose value went
  // elsewhere. A projection that had swapped two of the four is
  // reported at both of them.
  it('forwards the value the artifact carries behind each of them', () => {
    const answered = new Map(Object.entries(toApiWorkflow(BUILT_ARTIFACT)));
    const forwarded = PROJECTED_MEMBERS.filter(
      (member) => Object.is(answered.get(member), BUILT_ARTIFACT[member]),
    );

    expect(forwarded).toEqual(PROJECTED_MEMBERS);
  });
});
