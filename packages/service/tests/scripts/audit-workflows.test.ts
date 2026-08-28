/**
 * What `scripts/audit-workflows.ts` makes of a listing, asked with
 * no instance anywhere in the run. `classify` takes two lists and
 * answers with five readings and a verdict over them, opening no
 * socket and reading no file, so the whole of what reaches it in
 * this file is listings written out by hand and the names this
 * repository is standing in for. Nothing is stubbed, because there
 * is nothing to stub.
 *
 * Three blocks, and listings of their own for each. They cannot
 * share: the first asserts that no two of its workflows answer to a
 * single label, and a listing where two of them do is precisely what
 * the second is written over, while the third wants five of them
 * rather than one, each carrying a different combination of the
 * conditions a verdict is read for. Every declaration is filed under
 * the block it belongs to and no block reads another's, the module
 * under test aside. The one thing that crosses is a doc reference:
 * the second block's reader of an id names the first block's reader
 * of a label, to say which of the two a duplicate needs.
 *
 * The first block is over the two readings that module argues an
 * operator acts on first. A workflow no expected name accounts for
 * is a stray, which is the whole of what an audit exists to name — a
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
 * the strays reddens the first alongside the third block's verdict
 * claim, which reads whether the strays came back empty.
 *
 * One leg moves both, and that fixture is built for it to. A run
 * sorting EVERYTHING into the strays reddens the second as well as
 * the first, and the third block's verdict claim with them, because
 * the workflow this repository declares is itself armed and so
 * arrives under both readings at once. It is armed for that reason
 * and no other, which is measurable rather than arguable: with it
 * inert, a run counting every armed workflow rather than every armed
 * stray answers over that listing exactly as the shipped one does.
 *
 * Four workflows in it, one per reading, and the order they are
 * listed in is part of the fixture rather than a detail of it. The
 * one this repository declares sits BETWEEN two it does not, so the
 * strays are neither a prefix of the listing nor a suffix of it.
 * Measured against the same listing with that workflow moved to the
 * front, that is the whole of what the position buys: a run
 * answering with a slice of the listing where a filter over it
 * belongs reddens the first claim, and is fully green once the
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
 * that was never there. It is also the only sample in the file
 * reaching the branch that asks whether a name is a string at all.
 *
 * The second block is over the two readings that are claims about
 * NAMES rather than about workflows. An expected name the instance
 * holds no workflow under is missing, which is the instance sitting
 * behind this repository and one deploy from being level with it. A
 * name it holds more than one workflow under is a duplicate, which
 * is a name that has stopped naming one workflow — and with it a
 * deploy that can no longer say which of them its next upload
 * replaces.
 *
 * Six names there and six workflows under them, and every name is a
 * near miss of one of the two claims. Two are declared and held by
 * nothing, which is the whole of what `missing` should answer; two
 * more are declared and held, so a run handing back the expected set
 * entire reddens rather than agreeing. One declared name and one
 * undeclared are held twice, which is the whole of what `duplicate`
 * should answer; the remaining two are held once, so a run reporting
 * every name it saw reddens as well. Measured, those two legs and
 * the two beneath them — a run answering with no missing name, and
 * one answering with no duplicate — each redden their own claim, and
 * the two of the four that move the duplicates redden the third
 * block's verdict claim alongside it.
 *
 * The declared duplicate is the one that earns its line twice over.
 * The module records a name before it asks whether the expected set
 * carries it, so a name held twice is a duplicate whether or not
 * this repository declares it — and a run reporting duplicates only
 * among the names it sorted into the strays answers over that
 * listing with the undeclared pair alone. Measured, that leg reddens
 * the duplicate claim and, in the third block, the verdict claim
 * that reads whether the duplicates came back empty; the duplicate
 * claim goes green the moment the expected set stops declaring the
 * shared name, which is what says it is keyed to that name being
 * declared rather than to anything else about the pair.
 *
 * Both comparisons there are ordered too, and neither order is one a
 * sort produces. `missing` follows the order the expected names were
 * given in, which the module says outright, so the two names held by
 * nothing are given in the reverse of their sorted order and are not
 * adjacent in the list they are given in. `duplicate` follows the
 * order the instance first listed each name in, so the two shared
 * names are first listed in the reverse of theirs.
 *
 * Each duplicate is read back as its name and the instance ids of
 * the workflows under it, that being the one member of a listed
 * workflow a shared display name cannot part. Where the two sit in
 * the listing is part of the fixture as well: neither pair is listed
 * side by side, so a run grouping runs of neighbours rather than
 * accumulating across the listing reddens — and, measured, is fully
 * green over the same listing with each pair brought together.
 *
 * The third block is over the verdict those readings produce, and
 * over the word ONLY in it. An instance is clean where it holds no
 * stray and no name more than one workflow answers to, and it is
 * clean even where it holds no workflow under a name this repository
 * declares. That last is the module's own reading rather than an
 * oversight: what is missing is the instance sitting behind this
 * repository and one deploy from being level with it, where a stray
 * is the instance carrying something no part of this repository
 * accounts for.
 *
 * Five listings rather than one, each carrying a different
 * combination of those three conditions, and one table rather than a
 * case each — the ONLY is a statement about the five together. Two
 * of them answer true: one holding what this repository declares and
 * nothing besides, and one withholding a declared name. The other
 * three answer false, one per condition that does decide the verdict
 * and one carrying both at once.
 *
 * All five are built out of the same four workflows, so what parts
 * one listing from another is which of the four it holds and nothing
 * else. The duplicate is under a DECLARED name, which leaves the
 * listing holding it carrying no stray at all, both workflows being
 * ones an expected name accounts for. And the listing carrying both
 * conditions carries them on DIFFERENT workflows, which is what
 * parts two rules a pair under a single undeclared name would not.
 *
 * One claim reads the verdict, so every wrong rule moves that one
 * case and which ROW moved is the report. Measured over the five:
 * reading the strays alone moves the listing holding a duplicate;
 * reading the duplicates alone moves the one holding a stray;
 * counting a missing name against the instance moves the one whose
 * only condition is that; answering with the disjunction where the
 * conjunction belongs moves the two carrying one condition each and
 * leaves the one carrying both; and calling an instance clean
 * wherever the two deciding readings are both empty or both not, or
 * wherever they come to the same number of entries, moves the one
 * carrying both alone. Answering true to everything moves the three
 * listings carrying a condition, and false to everything the two
 * without one.
 *
 * Nothing about the order the five are written in reaches the
 * module, each being a call of its own, which is the axis the other
 * two blocks build their fixtures around and this one holds still.
 * And what the claim reads of an answer is whether each of the two
 * deciding readings came back empty and nothing else, so which
 * workflows are under either of them is those blocks' subject and
 * not this one's.
 *
 * Three guards to each block, and in all three cases each is about
 * the fixture rather than about the sorting.
 *
 * The first block's are these. Every workflow answers to a label of
 * its own, which is what makes a label the thing a claim compares —
 * and what keeps that fixture out of the reading two workflows
 * sharing a name would put it in. Each sample carries the reading it
 * stands for, held against the one derived from the workflow beside
 * it. And the readings the four of them cover are held against the
 * four that block is written over.
 *
 * Measured, each of the three reddens alone, and each under a drift
 * no claim reports. A sample whose declared reading is edited off
 * what its workflow carries moves the second. A sample removed
 * together with the name a claim holds its answer against — somebody
 * simplifying a fixture and keeping the literals in step — moves the
 * third. And two samples given one display name, with those same
 * literals kept in step again, moves the first.
 *
 * The second block's three are the same three questions asked of a
 * NAME. Every sample is about a name of its own, which is what makes
 * `held by 2` a statement about one name rather than two samples
 * splitting a count. Each carries the reading it stands for, where a
 * reading is what the two lists between them say about that name,
 * held against the one derived from those lists. And the five
 * readings the six of them cover are held against the five that
 * block is written over, deduped — two of the six are names held by
 * nothing and answer alike, which is what the first of the three
 * stands behind.
 *
 * Measured, those three redden alone as well, under the three drifts
 * above and one more the first block has no room for. A name whose
 * declared reading is edited off what the two lists carry moves the
 * second. A name dropped along with the workflow under it moves the
 * third, both claims staying green where it is a name no claim
 * spells. A name written twice, once per sample, moves the first.
 * And that block's listing is written out rather than derived from
 * its samples, because the order two workflows sharing a name are
 * listed in is what the duplicate claim turns on and a listing
 * grouped by name could not put anything between them — so emptying
 * that roster moves the third alone, where in the first block it
 * takes the claims with it.
 *
 * The third block's three are about its listings rather than about
 * the verdict. Nothing in any of them is armed and nothing in them
 * is missing a display name, which is what keeps five listings out
 * of the two readings the first block is written over. Each row
 * carries the combination it declares, held against the one derived
 * from its own listing and the expected names without the module
 * being called. And the five combinations the rows cover are held
 * against the five that block is written over.
 *
 * Measured, each of those reddens alone as well. A workflow with no
 * display name added to the listing that already holds a stray, and
 * one of the four armed, each move the first and nothing else in the
 * file. A row's declared combination edited off what its listing
 * carries moves the second alone. A row dropped along with its line
 * in the verdicts written out, and the roster of combinations
 * emptied, each move the third alone. A listing edited until it
 * carries some other combination moves the second and the third
 * together, and cannot move one without the other: any combination
 * it moves to is either one another row already carries or one the
 * roster does not name, and the guard over them reports both.
 *
 * No guard in front of any listing saying it is not empty, which the
 * sibling suites in this directory carry. There is nothing for one
 * to isolate in any of the three blocks: every claim in the file
 * holds its answer against names or verdicts written out, so an
 * emptied fixture reddens the claims rather than leaving them
 * comparing one empty list with another. Measured, that is the first
 * block's two claims and no guard, the second block's two claims
 * with two of its guards behind them — that block reads what a name
 * amounts to off the listing itself, where the first reads it off
 * the workflow in hand — and, in the third, the verdict claim with
 * the guard over its combinations.
 *
 * One strictness, and one thing no case in the file asks. The armed
 * reading is strict against `true` where every other value is one an
 * instance would not have armed on, which the module argues at
 * length and which no sample in any of the three blocks hands over —
 * measured, a truthiness test answers over every listing here
 * exactly as the shipped one does. And nothing asks either list what
 * it holds AFTER a call, so a run that had written into what it was
 * handed passes every case below, which is measured in all three
 * blocks.
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
 * a reading the second block is written over and this one is not.
 */
const DECLARED_NAME = 'AR Declared';

/** The display name of the stray the instance is not running. */
const INERT_STRAY_NAME = 'AR Stray';

/** The display name of the stray it is. */
const ARMED_STRAY_NAME = 'AR Armed Stray';

/**
 * Every name this repository is standing in for, in this block.
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
 * listed workflow either reading in this block turns on. The second
 * block reads the other member instead, for the reason
 * {@link instanceIdOf} gives. `RemoteWorkflow` declares the name
 * `unknown`, so one that is not a string answers with the sentinel
 * rather than being coerced. Coercion is the thing to avoid: the
 * workflow carrying none here carries `null`, and `String` makes
 * that the word `null`, which would sit in a claim's answer reading
 * like a display name somebody chose. A bracketed phrase no name
 * grammar produces reads as what it is.
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

/** One workflow in this block's listing, and the reading it is for. */
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
  // which is the second block's subject and not this one's.
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

  // What both claims in this block take on trust about its listing.
  // A sample declares the reading it is here for and the workflow
  // beside it is what answers, so a workflow edited until it answers
  // to some other reading leaves both claims green while the listing
  // has stopped covering what this block is written over.
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
  // reach. A sample dropped along with the name a claim in this
  // block holds its answer against leaves every declared reading
  // agreeing with what its own workflow carries, and the listing
  // short of a reading anyway. Measured, that is the drift this one
  // reports on its own.
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

// ---------------------------------------------------------------------------
// The names, four this repository declares and two it does not
// ---------------------------------------------------------------------------

/** A declared name the instance holds one workflow under. */
const HELD_ONCE_NAME = 'AR Held Once';

/** A declared name it holds none under, the first of two. */
const UNBUILT_NAME = 'AR Never Built';

/** A declared name it holds two workflows under. */
const TWINNED_NAME = 'AR Held Twice';

/** The other declared name it holds none under. */
const WITHDRAWN_NAME = 'AR Gone';

/** An undeclared name it holds one workflow under. */
const LONE_STRAY_NAME = 'AR Lone Stray';

/** An undeclared name it holds two workflows under. */
const TWINNED_STRAY_NAME = 'AR Twinned Stray';

/**
 * Every name this repository is standing in for, in this block.
 *
 * Four rather than one, because both claims here are about what a
 * name says when the two lists disagree about it and a list of one
 * name cannot disagree in two ways at once. Two of the four are
 * held by nothing, which is what `missing` should answer with; the
 * other two are held, which is what stops an answer of the whole
 * list satisfying that claim.
 *
 * The order is the fixture rather than a detail of it. `missing`
 * follows the order this list is given in, which the module says
 * outright, so the two names held by nothing are given in the
 * reverse of their sorted order and with a held name between them.
 */
const NAMES_DECLARED = [
  HELD_ONCE_NAME,
  UNBUILT_NAME,
  TWINNED_NAME,
  WITHDRAWN_NAME,
];

// ---------------------------------------------------------------------------
// The instance's own ids for the workflows a name is shared by
// ---------------------------------------------------------------------------

/** The first workflow listed under {@link TWINNED_STRAY_NAME}. */
const TWINNED_STRAY_FIRST_ID = 'wf-twinned-stray-a';

/** The second. */
const TWINNED_STRAY_SECOND_ID = 'wf-twinned-stray-b';

/** The first workflow listed under {@link TWINNED_NAME}. */
const TWINNED_FIRST_ID = 'wf-twinned-a';

/** The second. */
const TWINNED_SECOND_ID = 'wf-twinned-b';

/** What {@link instanceIdOf} answers for a workflow carrying none. */
const NO_INSTANCE_ID = '(no instance id)';

/**
 * One workflow as the instance's own id for it.
 *
 * The reader a duplicate needs and {@link displayNameOf} cannot be.
 * A duplicate is two workflows one display name does not part, so a
 * claim reading the workflows a shared name reached has to read the
 * member they do not share — and the id is the member the module's
 * own act path keys on, so it is what an operator choosing between
 * them would be holding.
 *
 * `RemoteWorkflow` declares it `unknown` for the reason it declares
 * the name so, and an id that is not a string answers with a
 * bracketed sentinel rather than being coerced, for the reason
 * {@link displayNameOf} gives. No sample here hands one over: the
 * workflows a name is shared by are exactly the ones this reader is
 * asked about, and each carries an id written out above.
 *
 * @param workflow - The workflow as the instance listed it.
 * @returns Its instance id, or {@link NO_INSTANCE_ID}.
 */
function instanceIdOf(workflow: RemoteWorkflow): string {
  const { id } = workflow;

  return typeof id === 'string'
    ? id
    : NO_INSTANCE_ID;
}

// ---------------------------------------------------------------------------
// The listing those names produce
// ---------------------------------------------------------------------------

/**
 * The six workflows the instance answered with, in its own order.
 *
 * Written out rather than derived from the roster below, which is
 * the one place this block departs from the first and does so for
 * the property its second claim turns on. The two workflows sharing
 * a name are what a duplicate is, and a listing grouped by name
 * could put nothing between them — so a run grouping runs of
 * neighbours rather than accumulating across the whole listing would
 * answer over it exactly as the shipped one does. Here neither pair
 * is listed side by side, and each has a workflow under some other
 * name between its two halves.
 *
 * The order the two shared names are FIRST listed in is the fixture
 * as well: `duplicate` follows it, so the pair sorting second is
 * listed first and no sort produces the answer.
 *
 * Every workflow is inert. The armed reading is the first block's
 * subject and neither claim here reads it.
 */
const LISTED_WORKFLOWS: readonly RemoteWorkflow[] = [
  {
    active: false,
    id: TWINNED_STRAY_FIRST_ID,
    name: TWINNED_STRAY_NAME,
  },
  {
    active: false,
    id: TWINNED_FIRST_ID,
    name: TWINNED_NAME,
  },
  {
    active: false,
    id: 'wf-lone-stray',
    name: LONE_STRAY_NAME,
  },
  {
    active: false,
    id: TWINNED_STRAY_SECOND_ID,
    name: TWINNED_STRAY_NAME,
  },
  {
    active: false,
    id: 'wf-held-once',
    name: HELD_ONCE_NAME,
  },
  {
    active: false,
    id: TWINNED_SECOND_ID,
    name: TWINNED_NAME,
  },
];

// ---------------------------------------------------------------------------
// The five readings the names are written over
// ---------------------------------------------------------------------------

/** A name this repository declares and the instance holds none of. */
const NAME_SHAPE_DECLARED_NONE = 'declared, and held by 0';

/** One it declares and the instance holds one workflow under. */
const NAME_SHAPE_DECLARED_ONCE = 'declared, and held by 1';

/** One it declares and the instance holds two workflows under. */
const NAME_SHAPE_DECLARED_TWICE = 'declared, and held by 2';

/** One it does not declare, held by a single workflow. */
const NAME_SHAPE_STRAY_ONCE = 'undeclared, and held by 1';

/** One it does not declare, held by two. */
const NAME_SHAPE_STRAY_TWICE = 'undeclared, and held by 2';

/**
 * The five readings this block is written over.
 *
 * Held against the readings the names actually cover rather than
 * counted, so the diff names the one that went missing. Deduped on
 * the way, two of the six names being held by nothing and answering
 * alike — which is what makes the guard over distinct names the
 * thing this comparison rests on rather than a formality.
 */
const NAME_SHAPES = [
  NAME_SHAPE_DECLARED_NONE,
  NAME_SHAPE_DECLARED_ONCE,
  NAME_SHAPE_DECLARED_TWICE,
  NAME_SHAPE_STRAY_ONCE,
  NAME_SHAPE_STRAY_TWICE,
];

/**
 * Which of the five readings the two lists leave one name under.
 *
 * Total over any name and any listing: a name is declared or it is
 * not, and the instance holds some number of workflows under it, so
 * a name edited into some other shape answers to a reading rather
 * than to nothing and the guard reading this reports which shape it
 * moved to. A count outside the five reads back as itself, which is
 * why the readings spell the number rather than a word for it.
 *
 * Derived from the two lists rather than read off the sample, which
 * is the whole of what the guard holding the two against each other
 * is for.
 *
 * @param name - One display name, as a sample declares it.
 * @returns The reading the two lists leave it under.
 */
function nameShapeOf(name: string): string {
  const held = LISTED_WORKFLOWS.filter(
    (workflow) => workflow.name === name,
  ).length;

  return NAMES_DECLARED.includes(name)
    ? `declared, and held by ${held}`
    : `undeclared, and held by ${held}`;
}

/** One name, and the reading it is here for. */
interface NameSample {
  /** Its own handle, which is what a failing guard names. */
  readonly id: string;

  /** The display name itself, as both lists spell it. */
  readonly name: string;

  /**
   * The reading it stands for, as {@link nameShapeOf} derives it.
   *
   * Declared rather than derived, so the two can be held against
   * each other. A name edited until the two lists leave it under
   * some other reading is a fixture that has stopped being about
   * what it says, and nothing either claim reads reports that.
   */
  readonly shape: string;
}

/** The six names, one per row, in the order they are declared in. */
const NAME_SAMPLES: readonly NameSample[] = [
  {
    id: 'held-once',
    name: HELD_ONCE_NAME,
    shape: NAME_SHAPE_DECLARED_ONCE,
  },
  {
    id: 'unbuilt',
    name: UNBUILT_NAME,
    shape: NAME_SHAPE_DECLARED_NONE,
  },
  {
    id: 'twinned',
    name: TWINNED_NAME,
    shape: NAME_SHAPE_DECLARED_TWICE,
  },
  {
    id: 'withdrawn',
    name: WITHDRAWN_NAME,
    shape: NAME_SHAPE_DECLARED_NONE,
  },
  {
    id: 'lone-stray',
    name: LONE_STRAY_NAME,
    shape: NAME_SHAPE_STRAY_ONCE,
  },
  {
    id: 'twinned-stray',
    name: TWINNED_STRAY_NAME,
    shape: NAME_SHAPE_STRAY_TWICE,
  },
];

// ---------------------------------------------------------------------------
// A name held by nothing, and a name held twice
// ---------------------------------------------------------------------------

describe('classify — a name held by nothing, and one held twice', () => {
  // What makes `held by 2` a statement about one name. Two samples
  // spelling one name between them would be a roster where a
  // declared count is split across rows, and the guard below would
  // read each of them against the total and agree with neither.
  //
  // It is also what the reading comparison rests on, that one being
  // deduped: two names answering alike are a reading covered once,
  // and two SAMPLES answering alike are a reading covered by one
  // name while the roster says two.
  //
  // Compared as sorted lists rather than by counting, so the diff
  // names the one two samples share.
  it('gives each of the six samples a name of its own', () => {
    const names = NAME_SAMPLES.map((sample) => sample.name);

    expect([...new Set(names)].sort()).toEqual([...names].sort());
  });

  // What both claims take on trust about the two lists. A sample
  // declares the reading it is here for and the two lists between
  // them are what answer, so a name whose listing entries or whose
  // membership of the expected set is edited leaves both claims
  // green while the fixture has stopped covering what this block is
  // written over.
  //
  // Paired by id rather than compared as two lists, so the diff
  // names the sample that drifted and the reading it drifted to.
  it('leaves each of them under the reading the lists answer with', () => {
    const derived = NAME_SAMPLES.map((sample) => ({
      id: sample.id,
      shape: nameShapeOf(sample.name),
    }));
    const declared = NAME_SAMPLES.map((sample) => ({
      id: sample.id,
      shape: sample.shape,
    }));

    expect(derived).toEqual(declared);
  });

  // The other half of that, and the one the guard above cannot
  // reach. A name dropped along with the workflow the instance holds
  // under it leaves every remaining sample agreeing with the two
  // lists, and the fixture short of a reading anyway. Neither claim
  // reports it where the name dropped is one neither of them spells,
  // which the two held once are.
  //
  // A set against the roster rather than a count, so the diff names
  // the reading nothing is left covering.
  it('covers each of the five readings it is written over', () => {
    const covered = NAME_SAMPLES.map((sample) => nameShapeOf(sample.name));

    expect([...new Set(covered)].sort()).toEqual([...NAME_SHAPES].sort());
  });

  // The first of the two claims. Two of the four declared names and
  // not all four, which is what stops an answer of the expected set
  // entire from satisfying it — the other two are held, and a run
  // that never asked would report them missing while the instance is
  // running them.
  //
  // Ordered, and the order is the one the expected names were given
  // in rather than the instance's or a sort's: the two come back in
  // the reverse of their sorted order, so a run answering sorted
  // reddens here, and they are not adjacent in the list they were
  // given in, so one answering a slice of it reddens too.
  it('reports an expected name the instance holds no workflow under', () => {
    const answer = classify(LISTED_WORKFLOWS, NAMES_DECLARED);

    expect(answer.missing).toEqual([UNBUILT_NAME, WITHDRAWN_NAME]);
  });

  // The second. Two of the six names and not all six, which is what
  // stops a run reporting every name it saw from satisfying it — two
  // more are held once each, and a name one workflow answers to is
  // the thing a duplicate is not.
  //
  // One of the two is declared and the other is not, which is the
  // half of this claim the strays cannot carry. The module records a
  // name before it asks whether the expected set carries it, so a
  // run recording only what it sorted into the strays answers with
  // the undeclared pair alone and reddens here.
  //
  // Each is read back as its name and the ids under it, that being
  // what a shared display name does not part. Ordered on both axes:
  // the pair sorting second is the pair first listed, and the two
  // ids under each are in the order the instance listed them.
  it('reports a name it holds more than one workflow under', () => {
    const answer = classify(LISTED_WORKFLOWS, NAMES_DECLARED);
    const reported = answer.duplicate.map((entry) => ({
      name: entry.name,
      workflows: entry.workflows.map(instanceIdOf),
    }));

    expect(reported).toEqual([
      {
        name: TWINNED_STRAY_NAME,
        workflows: [TWINNED_STRAY_FIRST_ID, TWINNED_STRAY_SECOND_ID],
      },
      {
        name: TWINNED_NAME,
        workflows: [TWINNED_FIRST_ID, TWINNED_SECOND_ID],
      },
    ]);
  });
});

// ---------------------------------------------------------------------------
// The names a verdict is read against
// ---------------------------------------------------------------------------

/** A declared name every listing in this block holds a workflow under. */
const ACCOUNTED_NAME = 'AR Accounted';

/** The other declared name, held by every listing here but one. */
const ALSO_ACCOUNTED_NAME = 'AR Also Accounted';

/** The undeclared name a stray answers to. */
const UNACCOUNTED_NAME = 'AR Unaccounted';

/**
 * Every name this repository is standing in for, in this block.
 *
 * Two rather than one, because a listing here has to be able to
 * withhold a declared name while still holding another. A name the
 * instance holds no workflow under is one of the three conditions
 * the verdict could be read over, and it is the one this block is
 * written to show does NOT decide it — so it needs a listing of its
 * own, and with a single declared name that listing could only be
 * the empty one. An instance holding nothing at all is a weaker
 * thing to call clean than one holding what this repository
 * declares.
 */
const VERDICT_EXPECTED_NAMES = [ACCOUNTED_NAME, ALSO_ACCOUNTED_NAME];

// ---------------------------------------------------------------------------
// The four workflows every listing here is built out of
// ---------------------------------------------------------------------------

/**
 * The workflow every listing in this block holds.
 *
 * All four of them are shared between the listings rather than
 * written out per row, which is what leaves a row differing from
 * its neighbour only in what was added to it or taken from it.
 * Nothing writes into either list it is handed, so a workflow in
 * five listings is read five times and is the same workflow each
 * time.
 *
 * Every one of them is inert and carries a display name. The armed
 * reading and the unnamed one are the first block's subjects and no
 * claim here reads either, which the first guard below holds this
 * fixture to rather than leaving to how it happens to be written.
 */
const ACCOUNTED_WORKFLOW: RemoteWorkflow = {
  active: false,
  id: 'wf-accounted',
  name: ACCOUNTED_NAME,
};

/** The workflow under the other declared name. */
const ALSO_ACCOUNTED_WORKFLOW: RemoteWorkflow = {
  active: false,
  id: 'wf-also-accounted',
  name: ALSO_ACCOUNTED_NAME,
};

/**
 * A second workflow under that same name, which is a duplicate.
 *
 * Under a DECLARED name, so a listing holding both of them carries
 * a duplicate and no stray at all — each is a workflow an expected
 * name accounts for. That is what makes the row holding it the one
 * a run reading the verdict off the strays alone answers wrongly.
 */
const ALSO_ACCOUNTED_TWIN: RemoteWorkflow = {
  active: false,
  id: 'wf-also-accounted-twin',
  name: ALSO_ACCOUNTED_NAME,
};

/**
 * A workflow no expected name accounts for.
 *
 * One of it rather than a pair, so a listing holding it carries a
 * stray and no duplicate. A pair under one undeclared name would
 * carry both conditions at once, which is a listing this block does
 * not want: the two arriving on DIFFERENT workflows parts one rule
 * that pair does not, a run calling an instance clean wherever the
 * strays and the duplicates come to the same number.
 */
const UNACCOUNTED_WORKFLOW: RemoteWorkflow = {
  active: false,
  id: 'wf-unaccounted',
  name: UNACCOUNTED_NAME,
};

// ---------------------------------------------------------------------------
// The five combinations of conditions the listings are written over
// ---------------------------------------------------------------------------

/** A listing carrying none of the three conditions. */
const CONDITIONS_NOTHING_AMISS = 'no stray, no duplicate, no missing name';

/** One holding no workflow under a name this repository declares. */
const CONDITIONS_MISSING = 'no stray, no duplicate, a missing name';

/** One holding a workflow no declared name accounts for. */
const CONDITIONS_STRAY = 'a stray, no duplicate, no missing name';

/** One holding two workflows under a single name. */
const CONDITIONS_DUPLICATE = 'no stray, a duplicate, no missing name';

/** One holding both of those, on different workflows. */
const CONDITIONS_BOTH = 'a stray, a duplicate, no missing name';

/**
 * The five combinations this block is written over.
 *
 * Held against the combinations the listings actually carry rather
 * than counted, so the diff names the one that went missing. A
 * count passes for five rows sitting on four combinations, which is
 * one of them read twice and one read by nothing.
 */
const VERDICT_CONDITIONS = [
  CONDITIONS_NOTHING_AMISS,
  CONDITIONS_MISSING,
  CONDITIONS_STRAY,
  CONDITIONS_DUPLICATE,
  CONDITIONS_BOTH,
];

/**
 * Which of the three conditions one listing carries.
 *
 * Total over any listing: each of the three is a yes or a no, so a
 * listing edited into some other combination answers to one rather
 * than to nothing, and the guard reading this reports which
 * combination it moved to. A combination outside the five reads
 * back as itself.
 *
 * Derived from the listing and the expected names rather than read
 * off the row, which is the whole of what the guard holding the two
 * against each other is for — and derived without calling the
 * module, so what the rows declare and what `classify` was handed
 * are held apart by two mechanisms rather than by one.
 *
 * A workflow carrying no display name is a stray and is keyed under
 * no name, which is the reading the module takes. None is handed
 * over here, and this block's first guard is what says so.
 *
 * @param remote - One listing, as `classify` is handed it.
 * @returns The combination of conditions it carries.
 */
function conditionsOf(remote: readonly RemoteWorkflow[]): string {
  const names = remote
    .map((workflow) => workflow.name)
    .filter((name): name is string => typeof name === 'string');
  const accounted = names.filter((name) => (
    VERDICT_EXPECTED_NAMES.includes(name)
  ));

  const stray = accounted.length < remote.length;
  const duplicate = names.some((name, at) => names.indexOf(name) !== at);
  const missing = VERDICT_EXPECTED_NAMES.some((name) => (
    !names.includes(name)
  ));

  const strayWord = stray
    ? 'a stray'
    : 'no stray';
  const duplicateWord = duplicate
    ? 'a duplicate'
    : 'no duplicate';
  const missingWord = missing
    ? 'a missing name'
    : 'no missing name';

  return `${strayWord}, ${duplicateWord}, ${missingWord}`;
}

// ---------------------------------------------------------------------------
// The five listings, one per combination
// ---------------------------------------------------------------------------

/** One listing, and the combination of conditions it is here for. */
interface VerdictRow {
  /**
   * The combination it stands for, as {@link conditionsOf} derives
   * it.
   *
   * Declared rather than derived, so the two can be held against
   * each other. A listing edited until it carries some other
   * combination is a fixture that has stopped being about what it
   * says, and a verdict that came out right anyway reports nothing.
   */
  readonly conditions: string;

  /** Its own handle, which is what the claim and a guard name. */
  readonly id: string;

  /** The listing itself, as an instance would have answered. */
  readonly remote: readonly RemoteWorkflow[];
}

/**
 * The five listings, in no order the module reads.
 *
 * Each is a separate call, so nothing about the order they are
 * written in reaches `classify` — which is the one axis the other
 * two blocks build their fixtures around and this one holds still.
 * What is written down is the order the claim below reports in, and
 * it is the roster's own.
 */
const VERDICT_ROWS: readonly VerdictRow[] = [
  {
    conditions: CONDITIONS_NOTHING_AMISS,
    id: 'nothing-amiss',
    remote: [ACCOUNTED_WORKFLOW, ALSO_ACCOUNTED_WORKFLOW],
  },
  {
    conditions: CONDITIONS_MISSING,
    id: 'a-name-held-by-nothing',
    remote: [ACCOUNTED_WORKFLOW],
  },
  {
    conditions: CONDITIONS_STRAY,
    id: 'a-stray',
    remote: [
      ACCOUNTED_WORKFLOW,
      UNACCOUNTED_WORKFLOW,
      ALSO_ACCOUNTED_WORKFLOW,
    ],
  },
  {
    conditions: CONDITIONS_DUPLICATE,
    id: 'a-name-held-twice',
    remote: [
      ACCOUNTED_WORKFLOW,
      ALSO_ACCOUNTED_WORKFLOW,
      ALSO_ACCOUNTED_TWIN,
    ],
  },
  {
    conditions: CONDITIONS_BOTH,
    id: 'a-stray-and-a-name-held-twice',
    remote: [
      ACCOUNTED_WORKFLOW,
      UNACCOUNTED_WORKFLOW,
      ALSO_ACCOUNTED_WORKFLOW,
      ALSO_ACCOUNTED_TWIN,
    ],
  },
];

// ---------------------------------------------------------------------------
// The verdict, and what does not decide it
// ---------------------------------------------------------------------------

describe('classify — the verdict, and what does not decide it', () => {
  // What keeps five listings out of the two readings the first block
  // is written over. Nothing here is armed and nothing here is
  // unnamed, so no listing in this block is also a fixture for a
  // claim somewhere else in the file — and, measured, this is the
  // only case anywhere in it that moves when either creeps in.
  //
  // Pinned to the value written rather than to the reading the
  // module takes, which arms on `true` and nothing looser. Holding
  // it to `false` says the fixture is as written rather than merely
  // not armed, and there is no third value in this block for the
  // difference to be about.
  //
  // The offenders are the answer rather than a count of them: a
  // failing comparison against an empty list prints the workflows
  // themselves, which is the whole report a reader needs.
  it('lists nothing armed and nothing without a display name', () => {
    const offenders = VERDICT_ROWS
      .flatMap((row) => row.remote)
      .filter((workflow) => (
        workflow.active !== false || typeof workflow.name !== 'string'
      ));

    expect(offenders).toEqual([]);
  });

  // What the claim takes on trust about its listings. A row declares
  // the combination it is here for and its own listing is what
  // carries it, so a listing edited until it carries some other
  // combination leaves the claim green wherever the verdict comes
  // out the same anyway — which it does for every edit between two
  // combinations the verdict answers alike, the three that make an
  // instance not clean and the two that leave it clean. Measured,
  // the guard beneath this one moves with this one there, any other
  // combination being either one another row already carries or one
  // the roster does not name.
  //
  // Paired by id rather than compared as two lists, so the diff
  // names the row that drifted and the combination it drifted to.
  it('gives each row the combination its own listing carries', () => {
    const derived = VERDICT_ROWS.map((row) => ({
      conditions: conditionsOf(row.remote),
      id: row.id,
    }));
    const declared = VERDICT_ROWS.map((row) => ({
      conditions: row.conditions,
      id: row.id,
    }));

    expect(derived).toEqual(declared);
  });

  // The other half of that, and the one the guard above cannot
  // reach. A row removed along with its line in the verdicts
  // written out below leaves every remaining row agreeing with its
  // own listing, and the block short of a combination anyway.
  //
  // A set against the roster rather than a count, so the diff names
  // the combination nothing is left carrying.
  it('covers each of the five combinations it is written over', () => {
    const covered = VERDICT_ROWS.map((row) => conditionsOf(row.remote));

    expect([...new Set(covered)].sort())
      .toEqual([...VERDICT_CONDITIONS].sort());
  });

  // The claim, and a table rather than a case each because the ONLY
  // in it is a statement about the five together: a rule reading
  // any further condition into the verdict answers one of these
  // rows wrongly and the rest of them right.
  //
  // Two rows answer true. One is an instance holding what this
  // repository declares and nothing else; the other holds no
  // workflow under one of the declared names, which is the whole of
  // the ONLY half — what is missing is the instance sitting behind
  // this repository and one deploy from being level with it, where
  // a stray is the instance carrying something no part of this
  // repository accounts for.
  //
  // Three answer false, one per condition that does decide it and
  // one carrying both at once. The duplicate is under a declared
  // name, so the row it is in holds no stray and a run reading the
  // verdict off the strays alone answers it wrongly.
  //
  // Held against verdicts written out rather than against a member
  // of the roster, so a row taken out of it reddens here as well as
  // in the guard above — an answer derived from the roster on both
  // sides would be comparing one empty list with another.
  it('calls an instance clean only where it holds no stray and no duplicate', () => {
    const verdicts = VERDICT_ROWS.map((row) => ({
      clean: classify(row.remote, VERDICT_EXPECTED_NAMES).clean,
      id: row.id,
    }));

    expect(verdicts).toEqual([
      { clean: true, id: 'nothing-amiss' },
      { clean: true, id: 'a-name-held-by-nothing' },
      { clean: false, id: 'a-stray' },
      { clean: false, id: 'a-name-held-twice' },
      { clean: false, id: 'a-stray-and-a-name-held-twice' },
    ]);
  });
});
