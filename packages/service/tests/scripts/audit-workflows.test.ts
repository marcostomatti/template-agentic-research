/**
 * What `scripts/audit-workflows.ts` makes of a listing, asked with
 * no instance anywhere in the run. `classify` takes two lists and
 * answers with five readings and a verdict over them, opening no
 * socket and reading no file, so the whole of what reaches it here
 * is a listing written out by hand and one name this repository is
 * standing in for. Nothing is stubbed, because there is nothing to
 * stub.
 *
 * One block, over the two readings that module argues an operator
 * acts on first. A workflow no expected name accounts for is a
 * stray, which is the whole of what an audit exists to name — a
 * deploy matches on a display name and touches what it matched, so
 * everything it did not match is invisible to it. And a stray the
 * instance has ARMED is counted apart from the rest of them, because
 * that is the one that is spending.
 *
 * The two are read together. On its own the second pins the armed
 * reading to one named workflow; what it cannot say is that the one
 * is a subset of the strays rather than the whole of them, and the
 * claim in front of it is what pins the same listing at three.
 * Measured, the two fail apart. Three ways of getting the armed
 * reading wrong — counting every armed workflow rather than every
 * armed stray, handing it the strays entire, and never filling it at
 * all — each redden the second alone, and a run sorting nothing into
 * the strays reddens the first alone.
 *
 * One leg moves both, and the fixture is built for it to. A run
 * sorting EVERYTHING into the strays reddens the second as well as
 * the first, because the workflow this repository declares is itself
 * armed and so arrives under both readings at once. It is armed for
 * that reason and no other, which is measurable rather than
 * arguable: with it inert, a run counting every armed workflow
 * rather than every armed stray answers over this listing exactly as
 * the shipped one does.
 *
 * Four workflows in one listing, one per reading, and the order they
 * are listed in is part of the fixture rather than a detail of it.
 * The one this repository declares sits BETWEEN two it does not, so
 * the strays are neither a prefix of the listing nor a suffix of it.
 * Measured against the same listing with that workflow moved to the
 * front, that is the whole of what the position buys: a run
 * answering with a slice of the listing where a filter over it
 * belongs reddens the first claim here, and is fully green once the
 * declared workflow leads.
 *
 * The three strays also come back in an order no sort produces, the
 * sentinel standing for the unnamed one beginning with a bracket
 * where the instance listed it last. Both comparisons are ordered,
 * which is the order the module says the instance listed in and not
 * this repository's, and a run answering its strays sorted reddens
 * the first claim.
 *
 * The fourth workflow carries no display name, which is the sharpest
 * form of the first claim rather than a fifth reading: it can equal
 * no expected name, so it is not a match that was dropped but one
 * that was never there. It is also the only sample reaching the
 * branch that asks whether a name is a string at all.
 *
 * Three guards, and each is about the listing rather than about the
 * sorting. Every workflow answers to a label of its own, which is
 * what makes a label the thing a claim compares — and what keeps
 * this fixture out of the reading two workflows sharing a name would
 * put it in. Each sample carries the reading it stands for, held
 * against the one derived from the workflow beside it. And the
 * readings the four of them cover are held against the four this
 * block is written over.
 *
 * Measured, each of the three reddens alone, and each under a drift
 * no claim reports. A sample whose declared reading is edited off
 * what its workflow carries moves the second. A sample removed
 * together with the name a claim holds its answer against — somebody
 * simplifying a fixture and keeping the literals in step — moves the
 * third. And two samples given one display name, with those same
 * literals kept in step again, moves the first.
 *
 * No guard in front of the listing saying it is not empty, which the
 * sibling suites in this directory carry. There is nothing here for
 * one to isolate: both claims hold their answer against names
 * written out, so an emptied listing reddens them rather than
 * leaving them comparing one empty list with another — measured,
 * both of them and no guard — and emptying the roster those samples
 * are declared in reddens the third guard alongside them.
 *
 * Three readings this block does not reach, and one strictness.
 * `missing`, `duplicate` and the verdict over them are read by no
 * case here; the fixture holds one declared name the instance
 * carries and four labels no two of which are alike, so the first
 * two are empty and nothing here says they are. The armed reading is
 * strict against `true` where every other value is one an instance
 * would not have armed on, which the module argues at length and
 * which no sample here hands over — measured, a truthiness test
 * answers over this listing exactly as the shipped one does. And
 * nothing asks either list what it holds AFTER the call, so a run
 * that had written into what it was handed passes every case below,
 * which is measured too.
 */
import type { RemoteWorkflow } from '../../scripts/n8n-client.js';

import { describe, expect, it } from 'vitest';

import { classify } from '../../scripts/audit-workflows.js';

// ---------------------------------------------------------------------------
// The names, one this repository declares and two it does not
// ---------------------------------------------------------------------------

/**
 * The display name the expected set carries, and the whole of it.
 *
 * One name rather than several, because a second declared name the
 * instance held would say nothing this one does not and a second
 * the instance did not would put a workflow in `missing`, which is
 * a reading no case here is about.
 */
const DECLARED_NAME = 'AR Declared';

/** The display name of the stray the instance is not running. */
const INERT_STRAY_NAME = 'AR Stray';

/** The display name of the stray it is. */
const ARMED_STRAY_NAME = 'AR Armed Stray';

/**
 * Every name this repository is standing in for.
 *
 * What a real audit holds an instance against is read off
 * `workflows/src/` by `expectedNames`, and what makes a list
 * written out here stand in for one is that `classify` knows
 * nothing about where either of its lists came from. The choice of
 * list is the caller's whole responsibility, which the module
 * argues where it answers — so a case supplies one and asks only
 * what the sorting made of it.
 */
const EXPECTED_NAMES = [DECLARED_NAME];

// ---------------------------------------------------------------------------
// Reading a classified workflow back
// ---------------------------------------------------------------------------

/** What {@link displayNameOf} answers for a workflow carrying none. */
const NO_DISPLAY_NAME = '(no display name)';

/**
 * One workflow as a label to read.
 *
 * The display name and nothing else, which is the one member of a
 * listed workflow either reading here turns on. `RemoteWorkflow`
 * declares it `unknown`, so a name that is not a string answers with
 * the sentinel rather than being coerced. Coercion is the thing to
 * avoid: the workflow carrying none here carries `null`, and
 * `String` makes that the word `null`, which would sit in a claim's
 * answer reading like a display name somebody chose. A bracketed
 * phrase no name grammar produces reads as what it is.
 *
 * A label to READ and never one to split. Nothing stops a display
 * name carrying a bracket either.
 *
 * @param workflow - The workflow as the instance listed it.
 * @returns Its display name, or {@link NO_DISPLAY_NAME}.
 */
function displayNameOf(workflow: RemoteWorkflow): string {
  const { name } = workflow;

  return typeof name === 'string'
    ? name
    : NO_DISPLAY_NAME;
}

// ---------------------------------------------------------------------------
// The four readings the listing is written over
// ---------------------------------------------------------------------------

/** A workflow an expected name accounts for. */
const SHAPE_DECLARED = 'a name the sources declare';

/** One no expected name accounts for, sitting inert. */
const SHAPE_INERT = 'a name they do not, sitting inert';

/** One no expected name accounts for, which the instance has armed. */
const SHAPE_ARMED = 'a name they do not, armed';

/** One carrying no display name to account for at all. */
const SHAPE_UNNAMED = 'no display name at all';

/**
 * The four readings this block is written over.
 *
 * Held against the readings the listing actually covers rather than
 * counted, so the diff names the one that went missing. A count
 * passes for four samples sitting on three readings, which is one
 * comparison exercised twice and a reading nothing exercises.
 */
const SAMPLE_SHAPES = [
  SHAPE_DECLARED,
  SHAPE_INERT,
  SHAPE_ARMED,
  SHAPE_UNNAMED,
];

/**
 * Which of the four readings one workflow answers to.
 *
 * Total over any workflow: a name the expected set does not carry
 * is one of the two undeclared readings whatever else is true of
 * it, and a name that is not a string is the fourth. So a sample
 * edited into some other shape answers to a reading rather than to
 * nothing, and the guard reading this reports which shape it moved
 * to instead of reporting that a sample vanished.
 *
 * Derived here rather than read off the sample, which is the whole
 * of what the guard holding the two against each other is for.
 *
 * @param workflow - The workflow as the instance listed it.
 * @returns The reading it answers to.
 */
function shapeOf(workflow: RemoteWorkflow): string {
  const name = displayNameOf(workflow);

  if (name === NO_DISPLAY_NAME) {
    return SHAPE_UNNAMED;
  }

  if (EXPECTED_NAMES.includes(name)) {
    return SHAPE_DECLARED;
  }

  return workflow.active === true
    ? SHAPE_ARMED
    : SHAPE_INERT;
}

// ---------------------------------------------------------------------------
// The listing an instance answered with
// ---------------------------------------------------------------------------

/** One workflow in the listing, and the reading it is here for. */
interface AuditSample {
  /** Its own handle, which is what a failing guard names. */
  readonly id: string;

  /**
   * The reading it stands for, as {@link shapeOf} derives it.
   *
   * Declared rather than derived, so the two can be held against
   * each other. A sample edited until it answers to some other
   * reading is a fixture that has stopped being about what it says,
   * and nothing a claim reads reports that on its own.
   */
  readonly shape: string;

  /** The workflow itself, as an instance would have listed it. */
  readonly workflow: RemoteWorkflow;
}

/**
 * The four workflows the instance answered with, in its own order.
 *
 * Instance ids on all four, including the one carrying no display
 * name. A stray with no id is refused by the module rather than
 * sorted differently, and the refusal is on the path that ACTS on a
 * stray rather than on the one that names it — so a workflow short
 * of both would be about a path no case here drives.
 *
 * The declared one is listed SECOND on purpose, which leaves the
 * strays neither a prefix of the listing nor a suffix of it.
 * Measured against the same listing with that workflow moved to the
 * front: a run answering with a slice of the listing where a filter
 * over it belongs reddens the first claim below, and is fully green
 * once the declared workflow leads.
 */
const SAMPLES: readonly AuditSample[] = [
  {
    id: 'stray-inert',
    shape: SHAPE_INERT,
    workflow: {
      active: false,
      id: 'wf-stray-01',
      name: INERT_STRAY_NAME,
    },
  },
  {
    id: 'declared',
    shape: SHAPE_DECLARED,
    workflow: {
      active: true,
      id: 'wf-declared-01',
      name: DECLARED_NAME,
    },
  },
  {
    id: 'stray-armed',
    shape: SHAPE_ARMED,
    workflow: {
      active: true,
      id: 'wf-armed-stray-01',
      name: ARMED_STRAY_NAME,
    },
  },
  {
    id: 'unnamed',
    shape: SHAPE_UNNAMED,
    workflow: {
      active: false,
      id: 'wf-unnamed-01',
      name: null,
    },
  },
];

/** The listing itself, as `classify` is handed it. */
const REMOTE = SAMPLES.map((sample) => sample.workflow);

// ---------------------------------------------------------------------------
// What an instance holds that nothing declares
// ---------------------------------------------------------------------------

describe('classify — what an instance holds that nothing declares', () => {
  // What makes a label the thing both claims compare. Each of them
  // holds a list of display names against one written out, so two
  // workflows answering to one label would be a listing where a
  // claim could not say which of them it had read.
  //
  // It is also what keeps this fixture out of the reading a shared
  // name puts it in: a name two workflows answer to is a duplicate,
  // and no case here is about that.
  //
  // Both claims redden alongside this one where a duplicate is
  // introduced and nothing else moves. What it reaches on its own is
  // the drift where the names those claims are written with were
  // kept in step with it, which leaves them agreeing with a listing
  // that has quietly stopped naming four workflows.
  //
  // Compared as sorted lists rather than by counting, so the diff
  // names the label two of them share.
  it('lists four workflows, each answering to a label of its own', () => {
    const labels = SAMPLES.map((sample) => displayNameOf(sample.workflow));

    expect([...new Set(labels)].sort()).toEqual([...labels].sort());
  });

  // What every claim below takes on trust about the listing. A
  // sample declares the reading it is here for and the workflow
  // beside it is what answers, so a workflow edited until it
  // answers to some other reading leaves both claims green while
  // the listing has stopped covering what this block is written
  // over.
  //
  // Paired by id rather than compared as two lists, so the diff
  // names the sample that drifted and the reading it drifted to.
  it('gives each of them the reading its own workflow answers to', () => {
    const derived = SAMPLES.map((sample) => ({
      id: sample.id,
      shape: shapeOf(sample.workflow),
    }));
    const declared = SAMPLES.map((sample) => ({
      id: sample.id,
      shape: sample.shape,
    }));

    expect(derived).toEqual(declared);
  });

  // The other half of that, and the one the guard above cannot
  // reach. A sample dropped along with the name a claim below holds
  // its answer against leaves every declared reading agreeing with
  // what its own workflow carries, and the listing short of a
  // reading anyway. Measured, that is the drift this one reports on
  // its own.
  //
  // A set against the roster rather than a count, so the diff names
  // the reading nothing is left covering. A count is satisfied by
  // four samples sitting on three readings, which is one of them
  // exercised twice and one exercised by nothing.
  it('covers each of the four readings it is written over', () => {
    const covered = SAMPLES.map((sample) => shapeOf(sample.workflow));

    expect([...new Set(covered)].sort()).toEqual([...SAMPLE_SHAPES].sort());
  });

  // The first of the two claims. Both lists are read back, and the
  // second is what says the workflow an expected name accounts for
  // was accounted for rather than merely left out of the strays: a
  // run that had dropped it from both would satisfy an answer read
  // off the strays alone.
  //
  // Ordered comparisons, which is the order the module says the
  // instance listed in and not this repository's. No sort produces
  // it — the unnamed workflow answers to a label beginning with a
  // bracket and the instance listed it last — so a run answering in
  // some order of its own reddens here.
  it('sorts a workflow no expected name accounts for into the strays', () => {
    const answer = classify(REMOTE, EXPECTED_NAMES);

    expect({
      known: answer.known.map(displayNameOf),
      stray: answer.stray.map(displayNameOf),
    }).toEqual({
      known: [DECLARED_NAME],
      stray: [INERT_STRAY_NAME, ARMED_STRAY_NAME, NO_DISPLAY_NAME],
    });
  });

  // The second. One of the three strays and not all of them, which
  // is what makes this a reading apart from them rather than a copy
  // of one — and one of the two ARMED workflows and not both, which
  // is what makes it a reading of the strays rather than of the
  // listing. The workflow this repository declares is armed for that
  // second reason and no other.
  //
  // What the claim above supplies is the three. This one on its own
  // names the workflow that came back under the armed reading and
  // says nothing about how many strays it was one of, so the two are
  // read together or not at all.
  it('reports the stray the instance has armed apart from the rest', () => {
    const answer = classify(REMOTE, EXPECTED_NAMES);

    expect(answer.activeStray.map(displayNameOf)).toEqual([
      ARMED_STRAY_NAME,
    ]);
  });
});
