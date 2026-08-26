/**
 * A node planted in front of a rule `workflow-rosters.ts`
 * declares, which is what parts a live rule from an empty tree.
 *
 * Three of the four rules are matchers over a node type, and they
 * feed sweeps over built output that are mostly absence checks: no
 * send-capable node anywhere in the tree. A sweep of that shape
 * reports the same nothing for a tree carrying no such node as for
 * a matcher that would not have recognised one, and no assertion
 * over what it handed back parts the two. `workflow-rosters.ts`
 * argues that where the rosters are. What a case adds is the half
 * a sweep cannot reach: a node put in front of a rule on purpose,
 * where the answer is the rule's own and not the tree's.
 *
 * The send roster is the subject with several entries, and several
 * is what makes it pairable. One node is planted per
 * {@link SEND_NODE_TYPES} entry and keyed to that entry by its id,
 * and the ids the cases actually ran for are held against the ids
 * the roster declares. An entry nobody planted a node for fails a
 * case by name rather than riding along behind the entries
 * somebody did — which is the failure a roster of data exists to
 * make reportable, and the one no sweep can report, an unfired
 * entry having no matched text to be named by.
 *
 * A node rather than a bare type string, because a node is what a
 * sweep hands over: `nodesMatching` takes a whole node and the
 * matcher takes the one member of it that decides, so the read of
 * `type` happens at the call site and is written that way here.
 * Each plant carries a name for the same reason and no claim reads
 * it. Across the first two subjects the type is the one thing that
 * moves from case to case, and the model control is where that
 * stops: what makes it a near miss is a member that is not its
 * type, which is the whole of what a type-keyed matcher is for.
 * By the fourth subject the type has stopped moving altogether and
 * `parameters` is what does, that subject reading a member rather
 * than matching one.
 *
 * Which is one half of the send subject, and cannot stand alone.
 * Every accepting claim holds for a matcher answering yes to
 * whatever it is handed, so plants cannot part a live matcher from
 * an indiscriminate one. What parts them is a near miss asserted
 * beside them — a type the matcher must NOT reach — and the second
 * half is three of those: the read-only mail-intake trigger, a
 * plain HTTP request node, and a Postgres node.
 *
 * The two halves stand behind each other, and each is the other's
 * control. A matcher recognising nothing satisfies all three
 * refusals while reddening all eight plants; a matcher recognising
 * everything satisfies all eight plants while reddening all three
 * refusals. So the refusals are given no accept control of their
 * own — the plants are one, whole — and the guard tying a control
 * to the roster reads the roster the plants come off, which is
 * what leaves an emptied roster reddening on both sides.
 *
 * The limit that outlives both is what a plant is made of. A
 * planted node carries the type its entry declares, read off that
 * entry rather than written out a second time. So what a plant
 * compares is the roster against itself: it says the matcher reads
 * the roster and reaches every entry in it, and says nothing about
 * whether the string an entry carries is the one an instance
 * loads. That string was read off a published node registry, a
 * measurement no case repeats — a copy here would put two
 * unchecked spellings where there is one. A control is the one
 * place this file spells a node type out whole, and what it spells
 * is a type the subject it stands beside does not name.
 *
 * The schedule matcher is the second subject and takes both
 * halves for different reasons. Its subject is a constant rather
 * than a roster, so there is nothing to pair: one node is
 * planted, no id joins it to anything, and the coverage guard the
 * send plants stand on has no second list to be held against.
 * What is left standing behind that one plant is the refusals it
 * is asserted beside — three legitimate triggers, each a
 * different widening away — and a guard tying those back to the
 * constant, which is where a constant emptied out reddens. The
 * plant does not: it reads that constant and compares it with
 * itself.
 *
 * The model matcher is the third subject, and the first whose
 * subject is a namespace rather than a type. A node planted under
 * it carries the constant AND a suffix the constant does not, so
 * the accepting claim is not the subject compared with itself the
 * way the two before it are: it says the matcher tests a prefix
 * and not an equality, which no plant next door can say about its
 * own.
 *
 * One near miss stands beside it where the two before have three,
 * and it is nearer than any of them — a Code node whose body names
 * a model and whose type does not. The controls before it are
 * types some widening of the matcher reaches; this is a node no
 * widening of a type-keyed rule reaches, and what flags it is a
 * rule keyed to what the artifact spells, which is a rule a cost
 * guard could plausibly have been written as.
 *
 * A prefix pays for the two controls it does without. An emptied
 * constant leaves an equality matching nothing and a prefix
 * matching everything, so where the schedule section needs a guard
 * to report it, here the refusal reddens on it directly. What is
 * left for a guard is the near miss itself: a control whose body
 * names nothing the planted type names is refused forever, for a
 * reason that has nothing to do with the namespace it was standing
 * next to.
 *
 * The reader that pulls a node's SQL off its parsed parameters is
 * the fourth subject, and the first that is not a matcher at all.
 * It answers with a text rather than with yes or no, so the two
 * halves the three before it are built from arrive in another
 * shape: the accepting claim is a statement handed back whole, and
 * standing opposite it are four nodes carrying no query, one per
 * shape of `parameters` that reaches the empty answer.
 *
 * Those four and the plant are still each other's control the way
 * a plant and a near miss are. A read answering nothing whatever
 * it is handed satisfies all four and reddens the accept; a read
 * answering with whatever member it reaches satisfies the accept
 * and reddens all four. What neither of those reaches is a read
 * keyed to whether there is a STATEMENT rather than to whether
 * there is a member, and what parts those is one node more: a
 * `query` that is there and blank, the parameter's own default,
 * which comes back as one empty text rather than as nothing. It is
 * the only case in this file a read of that shape reddens, and it
 * reddens alongside the accept for a read answering nothing —
 * which is why it is a case and not a fifth entry in the roster.
 *
 * A Postgres node stands in two sections of this file for two
 * reasons — among the send controls as the type sitting furthest
 * from anything that sends, and here as the node a statement is
 * read off — and neither claim is about the other. That is what a
 * rule keyed to a parameter rather than to a type buys, and it is
 * the reason this subject's near misses are parameter shapes where
 * every subject before it has types.
 */
import type { BuiltWorkflowNode } from './workflow-dist.js';
import type { NodeTypeRule } from './workflow-rosters.js';

import { describe, expect, it } from 'vitest';

import {
  MODEL_NODE_TYPE_PREFIX,
  SCHEDULE_TRIGGER_TYPE,
  SEND_NODE_TYPES,
  isModelNode,
  isScheduleTrigger,
  isSendCapable,
  queryParametersOf,
} from './workflow-rosters.js';

// ---------------------------------------------------------------------------
// The nodes planted against the send roster
// ---------------------------------------------------------------------------

/** One node planted against a {@link SEND_NODE_TYPES} entry. */
interface SendSample {
  /**
   * Id of the entry this sample stands for, and the whole of the
   * pairing.
   *
   * Declared here rather than read off the roster, which is what
   * makes the coverage guard a comparison instead of a list held
   * against itself. The samples are one roster and the entries are
   * another; an entry added over there with no sample declared
   * beside it leaves an id in one and not the other.
   *
   * An id and not the type string, for the reason
   * {@link NodeTypeRule.id} gives: a claim keyed to the text moves
   * when the text is corrected or widened, and one keyed to the id
   * does not.
   */
  readonly entry: string;

  /**
   * The name the planted node carries, distinct per sample.
   *
   * No claim reads it. It is carried because a node is what a sweep
   * hands over and a node has a name, and because a plant short of
   * one is not the shape `BuiltWorkflowNode` declares.
   *
   * Named for the route its entry stands for rather than for the
   * vendor its type names, so no sample spells any part of the
   * string it is paired with — which keeps the plant a node the
   * matcher has to read `type` off rather than one it could have
   * been recognised by any member of.
   */
  readonly node: string;
}

/**
 * One sample per {@link SEND_NODE_TYPES} entry, in roster order.
 *
 * Written out rather than mapped off the roster. A list generated
 * from the entries covers every entry by construction, so the
 * guard reading it back would be the roster compared with itself
 * and an entry added later would arrive already covered — which is
 * the one failure the pairing exists to report.
 *
 * Roster order rather than sorted, so the two lists read side by
 * side. Nothing depends on it: the guard compares sorted ids, and
 * each case stands alone.
 */
const SEND_SAMPLES: readonly SendSample[] = [
  { entry: 'mail-provider', node: 'Mail From The Account' },
  { entry: 'mail-send-generic', node: 'Mail The Recipient' },
  { entry: 'mail-transport', node: 'Mail Through The Transport' },
  { entry: 'mail-delivery-api', node: 'Mail Through The Delivery API' },
  { entry: 'chat-workspace', node: 'Post Into The Room' },
  { entry: 'chat-webhook', node: 'Post To The Webhook' },
  { entry: 'chat-personal', node: 'Message The Device' },
  { entry: 'phone-network', node: 'Text The Number' },
];

/**
 * The {@link SEND_NODE_TYPES} entry a sample is paired with.
 *
 * Refuses rather than answering with nothing when no entry carries
 * the id. A sample naming an entry that is not there would
 * otherwise reach {@link isSendCapable} as an undefined type and
 * redden as a matcher that had stopped recognising something,
 * which points a reader at the wrong file. The coverage guard
 * reports the same drift by name, and it runs last.
 *
 * A plain `Error` rather than a class, the split
 * `workflow-dist.ts` already draws on the guard behind its own
 * cast: a class is what lets a case pin a cause, and no case here
 * drives a sample that pairs with nothing. What this owes a reader
 * is a message naming which of the two rosters to open.
 */
function entryFor(sample: SendSample): NodeTypeRule {
  const rule = SEND_NODE_TYPES.find(
    (candidate) => candidate.id === sample.entry,
  );

  if (rule === undefined) {
    throw new Error(
      `No entry of SEND_NODE_TYPES carries the id '${sample.entry}', ` +
      'so the sample declared for it in this file pairs with ' +
      'nothing. Either the roster dropped that entry, in which case ' +
      'the sample goes with it, or the sample names it wrongly.',
    );
  }

  return rule;
}

/**
 * That sample as a node, carrying its own name and its entry's
 * type.
 *
 * Declared as the shape a read hands a sweep, though nothing
 * checks that here: a `.test.ts` sits outside the program `tsc`
 * reads, so the annotation states what the plant is meant to be
 * and a plant short of a member would surface in a case rather
 * than at a gate.
 *
 * The type comes off {@link entryFor} rather than out of a literal
 * beside the sample. Writing it out again would put a second
 * unchecked spelling of a string that was measured once against a
 * published registry, and a drift between the two copies would
 * redden without standing for any property.
 */
function plantedNode(sample: SendSample): BuiltWorkflowNode {
  return { name: sample.node, type: entryFor(sample).type };
}

/**
 * Ids of the {@link SEND_SAMPLES} whose case ran, added as each one
 * does.
 *
 * Recorded from inside the case rather than off the loop that
 * declares them, which is the difference between the samples a
 * sweep was written over and the ones it reached: a sweep narrowed
 * away from the roster — a slice, a filter, a hand-written list —
 * goes on passing over whatever is left.
 *
 * A set rather than a list, so two samples declared for one entry
 * arrive here once and fail against a roster that carries the id
 * once. Nothing else holds the sample ids apart.
 */
const EXERCISED_SEND_IDS = new Set<string>();

describe('isSendCapable — a node planted for every entry', () => {
  // In front of the loop rather than left to it. Every other case
  // in this block is generated from a roster, and two empty rosters
  // generate no case while satisfying the guard that compares them
  // — the whole section going quiet and printing a tick. This is
  // what names the list it went quiet over, and it is asserted on
  // `SEND_NODE_TYPES` because that is the roster the sweeps over
  // built output stand on: emptied, every one of them passes with
  // nothing left to look for.
  it('declares at least one type to plant a node for', () => {
    expect(SEND_NODE_TYPES.length).toBeGreaterThan(0);
  });

  // What every case that follows takes on trust. Each plant is
  // asserted on its own, so a roster whose entries had collapsed
  // onto one type would print a tick per sample while exercising
  // one comparison over and over — full coverage to read, one type
  // to the matcher.
  //
  // Compared as sorted lists rather than by counting distinct
  // types, so the diff names the type two samples share instead of
  // reporting that a number came up short.
  it('plants a node of a distinct type for each of them', () => {
    const planted = SEND_SAMPLES.map((sample) => plantedNode(sample).type);

    expect([...new Set(planted)].sort()).toEqual([...planted].sort());
  });

  for (const sample of SEND_SAMPLES) {
    // The type is read off the planted node rather than passed
    // straight from the entry, because that read is where a sweep
    // meets the matcher: `nodesMatching` hands a predicate a whole
    // node, and the predicate is what narrows it to the one member
    // that decides.
    //
    // Named by the entry's id and not by the type it carries. The
    // id is what a report names an entry by, so a verbose run reads
    // as the roster does and a case that reddens says which entry
    // rather than which spelling.
    it(`flags a planted ${sample.entry} node`, () => {
      EXERCISED_SEND_IDS.add(sample.entry);

      const node = plantedNode(sample);

      expect(isSendCapable(node.type)).toBe(true);
    });
  }

  // Last in the block on purpose: vitest runs a file's cases in the
  // order they were declared, so the set read here is one every case
  // before it has already written to. A run selecting this case
  // without them — a `-t` filter naming it — reports the whole
  // roster as unplanted, which is what asking at run time costs
  // over reading the loop that declared them.
  //
  // Run time is what makes it worth the cost, and here it buys a
  // second thing the sibling reader's version does not. There the
  // cases and the roster were one list, so what run time added was
  // that each shape reached a case that ran. Here they are two: the
  // ids come from `SEND_SAMPLES` and are held against the ids
  // `SEND_NODE_TYPES` declares, so one equality reports a sweep
  // narrowed away from its samples AND an entry nobody wrote a
  // sample for. Both directions, both by name.
  it('plants a node for every entry the roster declares', () => {
    const planted = [...EXERCISED_SEND_IDS].sort();
    const declared = SEND_NODE_TYPES.map((rule) => rule.id).sort();

    expect(planted).toEqual(declared);
  });
});

// ---------------------------------------------------------------------------
// The nodes planted for the send matcher to leave alone
// ---------------------------------------------------------------------------

/** One legitimate node type {@link isSendCapable} must not flag. */
interface SendControl {
  /**
   * What the type is, in prose, and the name of its case.
   *
   * Prose rather than the id a plant is named by, because a
   * control stands for no entry and so has nothing to refer back
   * to. What a reddening case owes a reader is which legitimate
   * node the matcher reached for.
   */
  readonly label: string;

  /**
   * The name the planted node carries, distinct per control.
   *
   * No claim reads it, and it is here for the reason
   * {@link SendSample.node} gives.
   */
  readonly node: string;

  /**
   * The node type asserted to come back unflagged.
   *
   * Written out here, which is the one thing a plant never does
   * and the whole of what makes a control one: a plant reads its
   * type off the entry it stands for, so the roster is compared
   * with itself, and a near miss has to come from outside it.
   *
   * Each of the three was read off the same published node
   * registry the entries were, and each is a type a stock instance
   * registers. A control naming a type nothing can load would be a
   * near miss of nothing.
   */
  readonly type: string;

  /**
   * The text {@link type} shares with a type {@link SEND_NODE_TYPES}
   * declares, asserted carried by both before the type is asserted
   * clean.
   *
   * The one thing a refusing answer cannot check about itself. A
   * control edited into a string the roster has nothing in common
   * with comes back unflagged forever, for a reason that has
   * nothing to do with the entries it was standing next to —
   * green, and an assertion over an arbitrary name.
   *
   * Held against the roster rather than spelled out a second time
   * beside it, so the fragment the two share is provably one
   * fragment. And read by containment rather than by the folded
   * equality {@link isSendCapable} runs, so a guard testing the
   * roster the way the rule does is not what stands behind these.
   *
   * How much it says shrinks as a control sits further out. For
   * the mail trigger it reaches the word the roster declined to
   * sweep on; for the other two it is the package every node on a
   * stock instance carries, which is the widening that reaches
   * everything.
   */
  readonly shared: string;
}

/**
 * The types the send matcher must leave alone, one per widening it
 * would take to reach one.
 *
 * Three, each sitting a different distance out. Nearest is a mail
 * node that reads: {@link SEND_NODE_TYPES} names the pattern over
 * the word `mail` it declined to be, and this is the node that
 * pattern would have reached. Next is the node that can make the
 * call a send node makes without being one — the `mail-provider`
 * entry describes its own route as ordinary HTTPS to a provider,
 * and this is the node that speaks nothing else. Furthest out is
 * an ordinary database node, which is what `ar-dispatch` is mostly
 * built from: a matcher reaching that one fails the send sweep
 * over the workflow this phase delivers.
 *
 * None of the three is a near miss of a named entry's own
 * spelling, which is the stronger shape and is not here. Measured
 * on the published registry, four of the eight entries have a
 * trigger node registered beside them under their own name —
 * read-only intake, none of it sending — so the substring sweep
 * this port declined would have flagged all four, where a folded
 * whole-type match reaches none of them. An entry apiece is what
 * would cover them, and until one lands the widening these three
 * stand against is one this port already turned down rather than
 * one it could still arrive at.
 */
const SEND_CONTROLS: readonly SendControl[] = [
  // Read off the node definition rather than assumed: it declares
  // `group: ['trigger']` and describes itself as firing when mail
  // ARRIVES. No workflow in this port's roster carries one, so
  // what it stands for is a rule keyed to the vocabulary of the
  // capability rather than to the types that have it.
  {
    label: 'the read-only mail-intake trigger',
    node: 'Read The Inbox',
    type: 'n8n-nodes-base.emailReadImap',
    shared: 'n8n-nodes-base.email',
  },
  // Read off the node definitions rather than assumed: this one
  // declares `group: ['output']`, which is the group four of the
  // eight entries declare too — `mail-send-generic`,
  // `chat-workspace`, `chat-webhook` and `chat-personal` — so a
  // rule keyed to what a node is FOR rather than to what it is
  // reaches it directly. Reading over HTTP is the pipeline's own
  // job, which is what makes this false positive expensive rather
  // than merely wrong.
  {
    label: 'a plain HTTP request node',
    node: 'Call The Endpoint',
    type: 'n8n-nodes-base.httpRequest',
    shared: 'n8n-nodes-base.',
  },
  // The furthest out, and the one of the three the pipeline
  // itself runs on: claiming a due row, opening a run row and
  // closing it are statements, and a statement is sent through a
  // node of this type. It declares `group: ['input']`, which no
  // entry in the roster declares, so nothing short of a rule
  // keyed to the package itself reaches it — which is the
  // widening that answers yes to everything.
  {
    label: 'a Postgres node',
    node: 'Read The Rows',
    type: 'n8n-nodes-base.postgres',
    shared: 'n8n-nodes-base.',
  },
];

/**
 * That control as a node, carrying its own name and its own type.
 *
 * Declared as the shape a read hands a sweep for the reason
 * {@link plantedNode} gives, and written beside that one rather
 * than folded into it. Where the type comes from is the whole
 * difference between a plant and a control, not a detail of how
 * each is assembled.
 */
function plantedControl(control: SendControl): BuiltWorkflowNode {
  return { name: control.node, type: control.type };
}

/**
 * Whether `control` still carries the fragment it shares with
 * {@link SEND_NODE_TYPES}, and whether that roster still carries
 * it too.
 *
 * Both halves, because each alone is satisfied by a drift the
 * other is what reports: a control edited away from the roster
 * leaves the first false, and a roster emptied or rewritten leaves
 * the second false. Neither shows in what {@link isSendCapable}
 * hands back for a control, which is a refusal either way.
 */
function sharesFragmentWithRoster(control: SendControl): boolean {
  const fragment = control.shared.toLowerCase();

  return control.type.toLowerCase().includes(fragment)
    && SEND_NODE_TYPES.some(
      (rule) => rule.type.toLowerCase().includes(fragment),
    );
}

describe('isSendCapable — the types it must leave alone', () => {
  // In front of the loop for the reason the plants have one of
  // these: every case after it is generated from this roster, and
  // an empty roster generates none of them while leaving the block
  // green. Asserted on the controls and not on `SEND_NODE_TYPES`,
  // which the plants already stand on — what would go quiet here
  // is this list, and the fragment guard is what ties the other
  // one in.
  it('declares at least one type to leave alone', () => {
    expect(SEND_CONTROLS.length).toBeGreaterThan(0);
  });

  // Three controls spelling one type would print three ticks over
  // one comparison, which is the plants' own hazard read
  // backwards. Sorted lists rather than a count of distinct types,
  // so the diff names the type two controls share.
  it('names a distinct type for each of them', () => {
    const named = SEND_CONTROLS.map(
      (control) => plantedControl(control).type,
    );

    expect([...new Set(named)].sort()).toEqual([...named].sort());
  });

  // The fixture guard, and the only case in this block that reads
  // the roster the plants come off. A refusal cannot say whether
  // the type it refused was ever near that roster, so this is what
  // stands between a control and an arbitrary string — and it is
  // where an emptied `SEND_NODE_TYPES` reddens on this side of the
  // file, the plants being what it reddens on the other.
  //
  // Reported by label rather than counted, so a failure names the
  // control that drifted.
  it('shares a fragment with a type the roster declares', () => {
    const adrift = SEND_CONTROLS
      .filter((control) => !sharesFragmentWithRoster(control))
      .map((control) => control.label);

    expect(adrift).toEqual([]);
  });

  for (const control of SEND_CONTROLS) {
    // The type is read off the planted node rather than passed
    // straight from the control, for the reason the plants give:
    // that read is where a sweep meets the matcher.
    //
    // No run-time coverage guard stands behind these, which the
    // plants have and this block does not need. There the cases
    // and the entries were two rosters, so one equality reported
    // drift in both directions; here the loop and the roster are
    // one list, and a control nobody ran is a control somebody
    // deleted, which is a thing a diff shows and a suite cannot.
    it(`does not flag ${control.label}`, () => {
      const node = plantedControl(control);

      expect(isSendCapable(node.type)).toBe(false);
    });
  }
});

// ---------------------------------------------------------------------------
// The trigger planted for the schedule matcher, and the near misses
// ---------------------------------------------------------------------------

/**
 * The node planted for {@link isScheduleTrigger} to flag.
 *
 * One node, and a constant rather than a builder, because
 * {@link SCHEDULE_TRIGGER_TYPE} is one type and not a roster:
 * there is no entry to key a sample to, no id for a case to be
 * named by, and nothing a second sample could differ from. The
 * pairing the send plants carry, and the coverage guard that
 * stands on it, have no second list here to be held against.
 *
 * The type is read off the constant for the reason
 * {@link plantedNode} reads its own off an entry, and the same
 * limit comes with it: what this compares is the constant against
 * itself. It says the matcher reads that constant, and says
 * nothing about whether the string the constant carries is the
 * one an instance loads. That measurement was taken against a
 * published node registry where the constant is declared, and no
 * case repeats it.
 *
 * Named for what the trigger does rather than for the type it
 * carries, as the send plants are, so `type` is the only member
 * the matcher could have been answering about.
 */
const SCHEDULE_PLANT: BuiltWorkflowNode = {
  name: 'Fire On The Clock',
  type: SCHEDULE_TRIGGER_TYPE,
};

/**
 * One legitimate trigger type {@link isScheduleTrigger} must not
 * flag.
 *
 * {@link SendControl}'s shape written again rather than reused,
 * because {@link TriggerControl.shared} does not mean the same
 * thing twice. There it is held against a roster, where any entry
 * may turn out to be the one carrying the fragment; here there is
 * a single string to hold it against, so the guard reading it is
 * a comparison with the subject itself and says more for being
 * one.
 */
interface TriggerControl {
  /**
   * What the type is, in prose, and the name of its case.
   *
   * Prose for the reason {@link SendControl.label} gives: a
   * control stands for no entry and so has nothing to refer back
   * to, and what a reddening case owes a reader is which
   * legitimate trigger the matcher reached for.
   */
  readonly label: string;

  /**
   * The name the planted node carries, distinct per control.
   *
   * No claim reads it, and it is here for the reason
   * {@link SendSample.node} gives. Each names what starts the run
   * rather than what the node is, so nothing but `type` is a
   * member the matcher could have been recognising.
   */
  readonly node: string;

  /**
   * The node type asserted to come back unflagged.
   *
   * Written out, which is the whole of what makes a control one:
   * the plant reads {@link SCHEDULE_TRIGGER_TYPE}, so a near miss
   * has to come from outside it.
   *
   * All three are registered by a stock instance and all three
   * declare `group: ['trigger']` with no `schedule` beside it,
   * read off the same published registry the constant was. A
   * control naming a type nothing can load would be a near miss
   * of nothing, and one whose group did carry `schedule` would
   * not be a control at all — it would be a type the constant is
   * wrong to have left out.
   */
  readonly type: string;

  /**
   * The text {@link TriggerControl.type} shares with
   * {@link SCHEDULE_TRIGGER_TYPE}, asserted carried by both before
   * the type is asserted clean.
   *
   * The one thing a refusing answer cannot check about itself,
   * for the reason {@link SendControl.shared} gives: a control
   * edited into a string the subject has nothing in common with
   * comes back unflagged forever, green and about nothing.
   *
   * Both halves are asserted, and here the second is what a
   * hollowed-out constant reddens. The plant cannot — it reads
   * that constant and compares it with itself, so a constant
   * emptied to nothing at all is a type the matcher still answers
   * yes to.
   *
   * Read by containment where the matcher reads a folded
   * equality, so the guard is not the rule written a second time,
   * and folded on both sides all the same: a change of case is
   * one the matcher is built to tolerate, and a guard reddening
   * for it would be reporting the fold rather than a drift.
   */
  readonly shared: string;
}

/**
 * The trigger types the schedule matcher must leave alone, one
 * per widening it would take to reach one.
 *
 * Each of the three starts a run and none of them decides WHEN
 * one starts, which {@link SCHEDULE_TRIGGER_TYPE} argues at
 * length. What the three add to that is a widening apiece.
 *
 * Two stand against the shape of a name. Of the 438 types the
 * published registry carries, 102 end in `Trigger` and exactly
 * one of the 102 starts anything on a clock — so a rule keyed to
 * the suffix reads as precise and reaches 101 nodes that start
 * nothing, these two among them.
 *
 * The remaining one shares nothing with the constant but the
 * package every node on a stock instance carries, so what it
 * stands against is the widening that reaches everything.
 *
 * The execute-workflow one is the expensive false positive
 * rather than merely a third widening. `workflows/src/README.md`
 * reserves `ar-dispatch` to invoke the other workflows, so every
 * workflow it reaches carries one of these by design: a matcher
 * reading `has a trigger` as `has a schedule` would flag exactly
 * the workflows the dispatcher exists to call, and a count that
 * has to come out at one would come out at however many there
 * are.
 *
 * What no control here reaches is a matcher too NARROW. Three
 * registered types carry the schedule capability and the
 * constant names one of them; the other two are hidden, which
 * keeps them out of the node panel and not out of a workflow
 * that already carries one. A tree written with either holds a
 * schedule this matcher does not name, and neither a control nor
 * a plant reading the constant can report it. The constant is
 * where that gap is argued and where the entry per type that
 * would close it belongs.
 */
const TRIGGER_CONTROLS: readonly TriggerControl[] = [
  // The trigger an operator fires by hand, and the one a
  // workflow carries while it is still being written. Read off
  // the node definition rather than assumed: it declares
  // `group: ['trigger']` and nothing beside it, and what decides
  // when it runs is somebody clicking.
  {
    label: 'a manual trigger',
    node: 'Start On A Click',
    type: 'n8n-nodes-base.manualTrigger',
    shared: 'Trigger',
  },
  // The one that shares least with the constant, and the one
  // whose run is decided furthest away — an inbound request,
  // from a caller this side never sees. It is also the only one
  // of the three carrying no suffix to be caught by, which is
  // why the fragment it declares is the package.
  {
    label: 'a webhook',
    node: 'Start On A Request',
    type: 'n8n-nodes-base.webhook',
    shared: 'n8n-nodes-base.',
  },
  // The one every workflow the dispatcher reaches is to carry,
  // and so the false positive that would spread rather than sit
  // still. A calling workflow decides when it runs, which is a
  // decision made somewhere a schedule is not.
  {
    label: 'an execute-workflow trigger',
    node: 'Start On A Call',
    type: 'n8n-nodes-base.executeWorkflowTrigger',
    shared: 'Trigger',
  },
];

/**
 * That control as a node, carrying its own name and its own type.
 *
 * Written beside {@link plantedControl} rather than folded into
 * it, for the reason that one was written beside
 * {@link plantedNode}: where the type comes from is the whole
 * difference between a plant and a control, and a builder shared
 * across subjects would leave each section reading its own
 * difference off another section's signature.
 */
function plantedTriggerControl(
  control: TriggerControl,
): BuiltWorkflowNode {
  return { name: control.node, type: control.type };
}

/**
 * Whether `control` still carries the fragment it shares with
 * {@link SCHEDULE_TRIGGER_TYPE}, and whether that constant still
 * carries it too.
 *
 * Both halves, for the reason {@link sharesFragmentWithRoster}
 * gives: each alone is satisfied by a drift the other is what
 * reports, and neither shows in what {@link isScheduleTrigger}
 * hands back for a control, which is a refusal either way.
 */
function sharesFragmentWithScheduleType(control: TriggerControl): boolean {
  const fragment = control.shared.toLowerCase();

  return control.type.toLowerCase().includes(fragment)
    && SCHEDULE_TRIGGER_TYPE.toLowerCase().includes(fragment);
}

describe('isScheduleTrigger — the one type it names', () => {
  // The accept claim. The type is read off the planted node
  // rather than passed straight from the constant, because that
  // read is where a sweep meets the matcher: `nodesMatching`
  // hands a predicate a whole node, and the predicate is what
  // narrows it to the one member that decides.
  //
  // Nothing generates this case, so it cannot go quiet the way a
  // roster-driven one can and needs no non-empty guard in front
  // of it. What it does need is the refusals it is asserted
  // beside: on its own it holds for a matcher answering yes to
  // whatever it is handed.
  it('flags a planted schedule trigger', () => {
    expect(isScheduleTrigger(SCHEDULE_PLANT.type)).toBe(true);
  });

  // In front of the loop rather than left to it, for the reason
  // the send controls have one of these: every case after it is
  // generated from this roster, and an empty roster generates
  // none of them while leaving the block green. What would be
  // left is the plant, and the plant alone is satisfied by a
  // matcher that flags whatever it is handed.
  it('declares at least one trigger type to leave alone', () => {
    expect(TRIGGER_CONTROLS.length).toBeGreaterThan(0);
  });

  // Three controls spelling one type would print three ticks
  // over one comparison, which is the send plants' own hazard
  // read backwards. Sorted lists rather than a count of distinct
  // types, so the diff names the type two of them share.
  it('names a distinct type for each of them', () => {
    const named = TRIGGER_CONTROLS.map(
      (control) => plantedTriggerControl(control).type,
    );

    expect([...new Set(named)].sort()).toEqual([...named].sort());
  });

  // The fixture guard, and the only case in this block that
  // holds a written-out type against the constant. A refusal
  // cannot say whether the type it refused was ever near that
  // constant, so this is what stands between a control and an
  // arbitrary string — and it is where a constant emptied out or
  // pointed at another type reddens, the plant being green for
  // either.
  //
  // Reported by label rather than counted, so a failure names
  // the control that drifted.
  it('shares a fragment with the type the constant names', () => {
    const adrift = TRIGGER_CONTROLS
      .filter((control) => !sharesFragmentWithScheduleType(control))
      .map((control) => control.label);

    expect(adrift).toEqual([]);
  });

  for (const control of TRIGGER_CONTROLS) {
    // The type is read off the planted node for the reason the
    // plant's own claim reads it that way.
    //
    // No run-time coverage guard stands behind these, and none
    // stands behind the plant either. Here the loop and the
    // roster are one list and the plant is one case, so a
    // control nobody ran is a control somebody deleted, which is
    // a thing a diff shows and a suite cannot.
    it(`does not flag ${control.label}`, () => {
      const node = plantedTriggerControl(control);

      expect(isScheduleTrigger(node.type)).toBe(false);
    });
  }
});

// ---------------------------------------------------------------------------
// The node planted for the model matcher, and the near miss
// ---------------------------------------------------------------------------

/**
 * The vendor name {@link MODEL_PLANT}'s type carries and
 * {@link CODE_BODY_CONTROL}'s body names, asserted carried by both
 * before either node is asserted about.
 *
 * {@link SendControl.shared} and {@link TriggerControl.shared} a
 * third time, pointed somewhere neither of those is. There the
 * fragment is text two TYPES share, and a control carrying it is a
 * type some widening of the matcher would reach. Here it is text a
 * type shares with another node's BODY, and what it stands against
 * is not a widening of this matcher at all — it is the rule this
 * suite could have been written as instead, one keyed to what an
 * artifact spells rather than to what a node is.
 *
 * Written out rather than read off either side, which is the whole
 * of what makes the guard a comparison. Built from the planted
 * type the body half would move with it, and built from the body
 * the type half would. Three spellings, and the guard is what ties
 * them.
 *
 * A vendor rather than a model identifier, because the half that
 * has to hold is that the planted TYPE carries this text too, and
 * a language-model type names its vendor. The identifier a call
 * names sits in a parameter on that node and nowhere in what the
 * node is.
 */
const MODEL_VENDOR_FRAGMENT = 'Anthropic';

/**
 * The node planted for {@link isModelNode} to flag.
 *
 * One node, and a constant rather than a builder, for the reason
 * {@link SCHEDULE_PLANT} is one: the subject is not a roster, so
 * there is no entry to key a sample to, no id for a case to be
 * named by, and nothing a second plant could differ from.
 *
 * Where it parts from that one is that this subject is a PREFIX. A
 * type under it is {@link MODEL_NODE_TYPE_PREFIX} and a suffix the
 * constant does not carry, so the suffix is spelled here and the
 * plant is not the subject compared with itself the way the two
 * before it are. What the accepting claim says for it is that the
 * matcher tests a prefix rather than an equality — which neither
 * sibling plant can say about its own matcher, both subjects there
 * being whole types.
 *
 * The whole type is one a stock instance registers, read off the
 * published registry the constant was measured against: of the 111
 * types `@n8n/n8n-nodes-langchain` 2.15.1 carries, twenty sit
 * under this prefix and this is one of them. The prefix by itself
 * is not among the 111, so a plant spelling only the constant
 * would carry a type nothing can load — the thing
 * {@link SendControl.type} refuses on the other side of the file,
 * met here from the accepting side.
 *
 * Named for what the node does rather than for the type it
 * carries, as every node planted here is.
 */
const MODEL_PLANT: BuiltWorkflowNode = {
  name: 'Answer From The Model',
  type: `${MODEL_NODE_TYPE_PREFIX}ChatAnthropic`,
};

/**
 * The node {@link isModelNode} must leave alone: a Code node whose
 * body names a model and whose type does not.
 *
 * One control where the two subjects before this have three, and
 * not for want of a second. The controls there are types some
 * widening of the matcher reaches, and there are several because
 * there are several widenings to stand against. This is a node no
 * widening of a type-keyed rule reaches, so there is no second
 * distance for another control to sit at.
 *
 * What it stands against instead is a rule this suite could
 * plausibly have been written as. An artifact is one JSON
 * document, so a phrase searched for across it is answered alike
 * by a sticky note, a node's name, a comment inside a Code body
 * and the type of some other node — {@link queryParametersOf}
 * argues that where it is made. A cost guard written that way
 * flags this node and asks it for a ceiling it has no call to
 * spend under, while the workflow that does spend goes on being
 * judged by whichever of its nodes happened to spell the word.
 *
 * Read off the published registry rather than assumed, and this is
 * where the key the other controls lean on runs out: the Code node
 * declares `group: ['transform']`, and so does the language-model
 * node planted beside it. A rule keyed to what a node is FOR tells
 * two of the send controls from the send entries and walks into
 * the third; here it tells these two apart not at all. What does
 * part them is the connection one makes and the other does not —
 * the model node declares an `ai_languageModel` output and carries
 * the provider credential, and the Code node carries a script.
 *
 * The body is the one member any claim in this file reads beyond
 * `name` and `type`, and carrying it is the whole of why this node
 * is planted rather than its type asked about directly. `jsCode`
 * is the parameter that holds it, the way `query` holds a
 * statement, and {@link codeBodyOf} is what reads it back.
 *
 * Named for what the node does rather than for the type it
 * carries, so the name is not a member either rule could have been
 * reading, and what parts the two rules is `type` against that
 * body.
 */
const CODE_BODY_CONTROL: BuiltWorkflowNode = {
  name: 'Shape The Prompt',
  type: 'n8n-nodes-base.code',
  parameters: {
    jsCode:
      '// Assembles the prompt text and the ceiling an Anthropic ' +
      'chat model is to answer under. Nothing here calls one.\n' +
      'return $input.all();',
  },
};

/**
 * The JavaScript a planted Code node carries, read off the
 * parameter that holds it.
 *
 * Refuses rather than coercing, which is what keeps the guard
 * standing on it a guard. `String(undefined)` is `'undefined'`, a
 * string carrying no vendor name, so a coerced read would fail
 * that guard exactly the way a body edited away from the plant
 * does — sending a reader to compare two spellings of a word where
 * one of the two has nowhere left to put it. The refusal names the
 * node instead.
 *
 * Read off the parsed parameter rather than the node's text for
 * the reason {@link queryParametersOf} reads a statement off one:
 * a claim about a body is a claim about the node that runs it.
 * `jsCode` is the parameter, measured on the published registry
 * the types were — the Code node opens it in a code editor the way
 * the Postgres node opens `query` in a SQL one.
 *
 * A plain `Error` rather than a class, the split {@link entryFor}
 * already draws: a class is what lets a case pin a cause, and no
 * case here drives a Code node carrying no body.
 */
function codeBodyOf(node: BuiltWorkflowNode): string {
  const parameters = node.parameters;
  const body =
    typeof parameters === 'object' && parameters !== null
      ? (parameters as Record<string, unknown>).jsCode
      : undefined;

  if (typeof body !== 'string') {
    throw new Error(
      `The node planted as '${node.name}' carries no string ` +
      '`jsCode` parameter, so there is no body to read a model ' +
      'name out of and nothing for the guard over it to compare. ' +
      'The control that declares one is in this file.',
    );
  }

  return body;
}

/**
 * Which halves of the near miss no longer hold, by name.
 *
 * Three of them, and each alone is satisfied by a drift another is
 * what reports — {@link sharesFragmentWithRoster}'s reasoning with
 * a third half, which is the one the body brings. The control's
 * body has to name the vendor, or a rule keyed to an artifact's
 * text would never have reached this node and the refusal is about
 * nothing. The planted type has to carry it too, or the word in
 * that body is one this section's own subject does not use. And
 * the control's type must NOT carry it, or the vendor sits in both
 * members at once and the case stops being about which of the two
 * the matcher reads.
 *
 * Reported by name rather than as one answer, so a failure says
 * which of the three moved. Folded on both sides of each
 * comparison, and read by containment where the matcher reads a
 * folded prefix, so a guard testing the fixture the way the rule
 * tests a type is not what stands behind these.
 *
 * What no half of it reaches is {@link MODEL_NODE_TYPE_PREFIX}
 * emptied out, and that is the prefix paying for the controls it
 * does without. An equality over an emptied constant matches
 * nothing and needs a guard to report it, which is what the
 * schedule section's guard is for; a prefix over one matches
 * everything, and the refusal asserted here reddens on it
 * directly.
 */
function modelFixtureDrift(): readonly string[] {
  const fragment = MODEL_VENDOR_FRAGMENT.toLowerCase();
  const body = codeBodyOf(CODE_BODY_CONTROL).toLowerCase();
  const halves = [
    {
      holds: body.includes(fragment),
      name: 'the control body names it',
    },
    {
      holds: MODEL_PLANT.type.toLowerCase().includes(fragment),
      name: 'the planted type carries it',
    },
    {
      holds: !CODE_BODY_CONTROL.type.toLowerCase().includes(fragment),
      name: 'the control type does not carry it',
    },
  ];

  return halves.filter((half) => !half.holds).map((half) => half.name);
}

describe('isModelNode — the namespace it names', () => {
  // The accept claim, and the one plant in this file whose type is
  // not its subject spelled back. `MODEL_NODE_TYPE_PREFIX` names a
  // namespace, so a node under it carries the constant and a
  // suffix, and what an answer of yes says here is that the
  // matcher tests a prefix rather than an equality over the whole
  // string.
  //
  // The type is read off the planted node rather than passed
  // straight from the constant, because that read is where a sweep
  // meets the matcher: `nodesMatching` hands a predicate a whole
  // node, and the predicate is what narrows it to the one member
  // that decides.
  //
  // Nothing generates this case, so it cannot go quiet the way a
  // roster-driven one can and needs no non-empty guard in front of
  // it. What it does need is the refusal it is asserted beside: on
  // its own it holds for a matcher answering yes to whatever it is
  // handed, which for a prefix is what an emptied constant leaves.
  it('flags a planted node under the namespace', () => {
    expect(isModelNode(MODEL_PLANT.type)).toBe(true);
  });

  // The fixture guard, and the only case in this block that holds
  // the two planted nodes against each other. A refusal cannot say
  // whether the body it passed over named anything this namespace
  // names, so this is what stands between a control and a Code
  // node carrying an arbitrary comment.
  //
  // Reported by name rather than counted, so a failure says which
  // half of the near miss moved.
  it('names a vendor in the control body that only the planted type carries', () => {
    expect(modelFixtureDrift()).toEqual([]);
  });

  // The refusal, and with the plant asserted beside it the whole
  // of what parts a live matcher from one answering yes to
  // everything: a matcher recognising nothing reddens the plant,
  // and one recognising everything reddens this. Neither is given
  // an accept control of its own — each is the other's.
  //
  // A node rather than a type string, as everywhere else here, and
  // it earns more: this is the one node in the file carrying a
  // member beyond `name` and `type`, and that member is what a
  // rule keyed to an artifact's text would have flagged it on. The
  // matcher is handed the type all the same, which is the reading
  // the claim is about.
  it('does not flag a Code node whose body names a model', () => {
    expect(isModelNode(CODE_BODY_CONTROL.type)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The node planted for the query reader, and the nodes carrying none
// ---------------------------------------------------------------------------

/**
 * The statement the planted Postgres node carries, and what the
 * accepting claim holds an answer against.
 *
 * Declared here and read into the plant rather than spelled in
 * both places, which is what makes the claim a reading rather
 * than two copies of one string agreeing. {@link plantedNode}
 * takes its type off an entry for the same reason.
 *
 * Fixture SQL and not a statement `ar-dispatch` carries. What is
 * asserted here is the reading; the properties a real statement
 * has to satisfy are held against the workflow that runs it, by
 * a roster `workflow-rosters.ts` names and this file does not.
 */
const POSTGRES_STATEMENT =
  'SELECT id, next_run_at FROM topics ORDER BY next_run_at';

/**
 * The values that statement is parameterized with, carried
 * because the node's own editor labels them Query Parameters.
 *
 * The collision {@link queryParametersOf} names. A check asking
 * where a statement's VALUES come from reads this member, and
 * the reader under test answers nothing about it. Planted on the
 * accepting node rather than beside it, so an answer of one text
 * is a read that passed over a member sitting next to the one it
 * took, rather than one with nothing to pass over.
 */
const POSTGRES_REPLACEMENT = '900';

/**
 * The node planted for {@link queryParametersOf} to read a
 * statement off.
 *
 * One node, and a constant rather than a builder, for the reason
 * {@link SCHEDULE_PLANT} is one: the subject is not a roster, so
 * there is no entry to key a sample to and nothing a second
 * plant could differ from.
 *
 * Where it parts from every plant before it is which member is
 * under test. Those three are read for their `type` and carry
 * nothing else; this one is read for a parameter, and its type
 * is the member no claim in this section touches. That type
 * stands furthest out among the send controls, and the two
 * readings are worth taking together: a Postgres node is the one
 * this suite must never flag as sending and the one it has to
 * read a statement off.
 *
 * `operation` and `options` are carried alongside the statement
 * so an answer of one text is not the only text there was to
 * hand back. What the guard over the plant asserts is that
 * neither of them carries the statement, which is what a reader
 * keyed to some other member would have to pass.
 *
 * Named for what the node does rather than for the type it
 * carries, as every node planted in this file is.
 */
const POSTGRES_PLANT: BuiltWorkflowNode = {
  name: 'Claim The Due Rows',
  type: 'n8n-nodes-base.postgres',
  parameters: {
    operation: 'executeQuery',
    query: POSTGRES_STATEMENT,
    options: { queryReplacement: POSTGRES_REPLACEMENT },
  },
};

/**
 * Every shape a node's `parameters` can leave, named apart.
 *
 * Five, where {@link queryParametersOf} resolves two: it hands
 * back a statement or nothing, and four of these five are the
 * nothing. Naming them apart is what lets a planted node say
 * which of the four it stands for, and lets a guard report one
 * nobody planted a node for — the failure a roster of data
 * exists to make reportable, and the one an answer of `[]`
 * cannot, an unreached shape having nothing to be named by.
 */
const PARAMETER_SHAPES = [
  'no parameters member',
  'a parameters member that is not an object',
  'a parameters object carrying no query',
  'a query that is not a string',
  'a query that is a string',
] as const;

/**
 * Which of {@link PARAMETER_SHAPES} `node` leaves.
 *
 * Not an independent mechanism, and worth saying so rather than
 * leaving to be discovered: it reads the same two members
 * {@link queryParametersOf} reads, in the same order. Where it
 * differs is resolution — five answers where the reader has two
 * — and what it stands behind is the fixture rather than the
 * rule. A sample edited into carrying a statement names itself
 * here, where the claim over it reddens saying only that
 * something came back.
 *
 * Total over every node, so a fixture belonging in another entry
 * reports the shape it actually leaves instead of being placed
 * by whichever test happened to reach it first.
 */
function parameterShapeOf(node: BuiltWorkflowNode): string {
  const parameters = node.parameters;

  if (parameters === undefined) {
    return 'no parameters member';
  }

  if (typeof parameters !== 'object' || parameters === null) {
    return 'a parameters member that is not an object';
  }

  const query = (parameters as Record<string, unknown>).query;

  if (query === undefined) {
    return 'a parameters object carrying no query';
  }

  return typeof query === 'string'
    ? 'a query that is a string'
    : 'a query that is not a string';
}

/** One node {@link queryParametersOf} must answer nothing for. */
interface NoQuerySample {
  /**
   * What the node carries, in prose, and the name of its case.
   *
   * Prose for the reason {@link SendControl.label} gives: a node
   * standing for no roster entry has nothing to refer back to,
   * and what a reddening case owes a reader is which node the
   * read reached into.
   */
  readonly label: string;

  /**
   * Which of {@link PARAMETER_SHAPES} this entry stands for,
   * declared here and read back by {@link parameterShapeOf}.
   *
   * Declared rather than derived, which is what makes the guard
   * over it a comparison instead of a value held against itself.
   * Two entries swapped into each other's shape leave the set of
   * labels whole, so the coverage guard reads clean while both
   * stand for something other than what they say; the pairs are
   * what report that.
   */
  readonly holds: string;

  /**
   * The node itself, carrying its own name, type and parameters.
   *
   * A whole node rather than a name and a type handed to a
   * builder, which is what every roster before this one carries.
   * There the type is the one thing that moves and the rest is
   * assembled around it; here what moves is `parameters`, in
   * four shapes sharing no structure, so a builder would take
   * the whole of what differs as an argument and hand it
   * straight back.
   */
  readonly node: BuiltWorkflowNode;
}

/**
 * One node per shape of `parameters` that reaches the empty
 * answer, in the order the reader tests for them.
 *
 * Four rather than the one a node carrying no query suggests,
 * because four shapes of `parameters` reach that answer and an
 * answer of `[]` is the same nothing whichever one did. A single
 * sample covers one and leaves the other three standing on a
 * test no case reaches — the shape of the vacuity this whole
 * file exists against, met inside one function instead of
 * across a tree.
 *
 * Reader order rather than sorted, so the roster reads down the
 * function. Nothing depends on it: the coverage guard compares
 * sorted labels and each case stands alone.
 */
const NO_QUERY_SAMPLES: readonly NoQuerySample[] = [
  // The member left out rather than written empty, which is what
  // a hand-authored source does for a node running on defaults:
  // `workflows/src/*.json` is written by hand, so a node that
  // changed nothing carries no `parameters` at all. The reader
  // answers before it indexes anything, and without the test
  // that gets it there this read raises rather than answering.
  {
    label: 'a node whose source left the member out',
    holds: 'no parameters member',
    node: { name: 'Merge The Branches', type: 'n8n-nodes-base.merge' },
  },
  // The malformed direction, and the one value the `typeof` half
  // of that same test does not reach: `typeof null` reports
  // `object`, so what catches this is the null test written
  // beside it, and without that test this read raises too. Two
  // samples for one line of the reader, because the line is two
  // tests and each is the only thing standing under its own.
  {
    label: 'a node whose parameters member is null',
    holds: 'a parameters member that is not an object',
    node: {
      name: 'Explain The Claim',
      type: 'n8n-nodes-base.stickyNote',
      parameters: null,
    },
  },
  // The near miss the reader's own argument turns on: the type
  // the plant carries, in an operation that runs no statement at
  // all. A read keyed to a database node type answers this one
  // with something; keyed to the parameter it answers nothing,
  // which is the split `queryParametersOf` says it is for.
  {
    label: 'a Postgres node in an operation that runs no query',
    holds: 'a parameters object carrying no query',
    node: {
      name: 'Read The Enabled Rows',
      type: 'n8n-nodes-base.postgres',
      parameters: {
        operation: 'select',
        schema: 'public',
        table: 'topics',
        options: {},
      },
    },
  },
  // The malformed artifact the reader names, planted with a
  // statement one level in rather than as a bare number: a read
  // that coerced would hand back the object's own text, and one
  // that dug for a statement would find this one. So the answer
  // of nothing is a refusal rather than a coincidence of there
  // being no text to reach.
  {
    label: 'a node whose query is not a string',
    holds: 'a query that is not a string',
    node: {
      name: 'Open The Run Row',
      type: 'n8n-nodes-base.postgres',
      parameters: {
        operation: 'executeQuery',
        query: { statement: 'SELECT 1' },
      },
    },
  },
];

/**
 * The node that parts a `query` nobody has written a statement
 * into from a node carrying no `query` at all.
 *
 * This section's near miss, and it sits on the other side of the
 * answer from every control before it. Those are nodes a matcher
 * must not flag; this is a node the reader must answer WITH
 * something — one empty text, the empty string being what the
 * parameter holds before anybody types into it, and a string
 * being a string. {@link queryParametersOf} settles that where
 * it is made.
 *
 * What it stands against is a read keyed to whether there is a
 * STATEMENT rather than to whether there is a member. Such a
 * read answers nothing here and satisfies all four claims above
 * it, so this is the only case anywhere in this file that parts
 * it from the one under test.
 */
const BLANK_QUERY_CONTROL: BuiltWorkflowNode = {
  name: 'Run The Empty Query',
  type: 'n8n-nodes-base.postgres',
  parameters: { operation: 'executeQuery', query: '', options: {} },
};

/**
 * Every node this section declares a parameter shape for, the
 * two that are not samples included.
 *
 * The plant and the blank-query control are what the four
 * samples stand next to, and a section resting on them owes a
 * line saying each still carries what it was planted to carry.
 * Both declare a string `query`, which is the shape no sample
 * has.
 *
 * Neither is caught by its own claim going quiet: a plant
 * emptied out reddens the accept, and a control emptied out
 * reddens the case beside it. What no claim catches is a fixture
 * emptied AND the claim over it rewritten in the same diff to
 * expect what it now answers — two edits that agree with each
 * other, where a section quietly stops having an accepting node
 * in it at all.
 */
const SHAPE_DECLARATIONS: readonly NoQuerySample[] = [
  ...NO_QUERY_SAMPLES,
  {
    label: 'the plant a statement is read off',
    holds: 'a query that is a string',
    node: POSTGRES_PLANT,
  },
  {
    label: 'the control whose query is there and blank',
    holds: 'a query that is a string',
    node: BLANK_QUERY_CONTROL,
  },
];

/**
 * The planted node's parameters, refused rather than coerced.
 *
 * The refusal names the node rather than leaving the guard
 * below to report symptoms, which is the reason
 * {@link codeBodyOf} refuses a body. Coerced to an empty record,
 * a plant that had lost its `parameters` fails two of that
 * guard's four halves and names neither the member nor the node
 * — sending a reader to look for a second parameter and a set of
 * values when what is missing is the object both sat in.
 *
 * A plain `Error` rather than a class, the split
 * {@link entryFor} already draws: a class is what lets a case
 * pin a cause, and no case here drives a plant short of its
 * parameters.
 */
function plantParameters(): Record<string, unknown> {
  const parameters = POSTGRES_PLANT.parameters;

  if (typeof parameters !== 'object' || parameters === null) {
    throw new Error(
      `The node planted as '${POSTGRES_PLANT.name}' carries no ` +
      '`parameters` object, so there is no statement to read and ' +
      'nothing for the guard over it to compare. The plant that ' +
      'declares one is in this file.',
    );
  }

  return parameters as Record<string, unknown>;
}

/**
 * Which halves of the plant no longer hold, by name.
 *
 * Four, and each alone is satisfied by a drift another is what
 * reports — {@link modelFixtureDrift}'s reasoning aimed at one
 * node rather than at two. The statement has to be more than a
 * blank, or the accepting claim is satisfied by a read that
 * found the parameter's own default and by one that found the
 * member, which are different readings. A second parameter has
 * to carry text of its own, or an answer of one text is the only
 * text there was. Nothing but `query` may carry the statement,
 * or a read keyed to another member passes. And the values the
 * statement is parameterized with have to be there, or the
 * member whose own label collides with the reader's name is one
 * the answer was never asked to pass over.
 *
 * Reported by name rather than as one answer, so a failure says
 * which of the four moved. None of them reads
 * {@link queryParametersOf}: what an answer cannot say is
 * whether the fixture it was taken off ever stood for anything.
 */
function statementDrift(): readonly string[] {
  const parameters = plantParameters();
  const others = Object.entries(parameters).filter(
    ([member]) => member !== 'query',
  );
  const elsewhere = [
    POSTGRES_PLANT.name,
    POSTGRES_PLANT.type,
    ...others.map(([, value]) => JSON.stringify(value)),
  ];
  const options = parameters.options;
  const replacement =
    typeof options === 'object' && options !== null
      ? (options as Record<string, unknown>).queryReplacement
      : undefined;
  const halves = [
    {
      holds: POSTGRES_STATEMENT.trim() !== '',
      name: 'the plant carries a statement rather than a blank',
    },
    {
      holds: others.some(
        ([, value]) => typeof value === 'string' && value !== '',
      ),
      name: 'a second parameter carries text of its own',
    },
    {
      holds: !elsewhere.some((text) => text.includes(POSTGRES_STATEMENT)),
      name: 'nothing but the query parameter carries the statement',
    },
    {
      holds: replacement === POSTGRES_REPLACEMENT,
      name: 'the values it is parameterized with are there too',
    },
  ];

  return halves.filter((half) => !half.holds).map((half) => half.name);
}

describe('queryParametersOf — the statement a node runs', () => {
  // The accept claim. The statement comes back off the node the
  // reader was handed, held against the constant that node was
  // built from rather than against a second spelling of it.
  //
  // The whole node goes over, and here that is the reader's own
  // signature rather than a call-site read the way it is for the
  // three matchers beside it: they take the member that decides and
  // leave the read to `nodesMatching`, and this takes the node
  // because which member carries a statement is the thing it
  // knows and a sweep does not.
  //
  // Nothing generates this case, so it cannot go quiet the way a
  // roster-driven one can and needs no non-empty guard in front
  // of it. What it does need is the nodes carrying none asserted
  // beside it: on its own it holds for a read answering with
  // whatever member it reached.
  it('returns the statement a Postgres node carries', () => {
    expect(queryParametersOf(POSTGRES_PLANT)).toEqual([POSTGRES_STATEMENT]);
  });

  // The fixture guard behind that claim, and the one case here
  // that holds the plant's own members against each other rather
  // than asking the reader anything. An answer cannot say whether
  // the text it handed back was the only place that text sat, nor
  // whether it was a statement at all rather than the blank the
  // parameter defaults to.
  //
  // Reported by name rather than counted, so a failure says
  // which half of the plant moved.
  it('carries a statement nothing else in the plant carries', () => {
    expect(statementDrift()).toEqual([]);
  });

  // In front of the loop rather than left to it, for the reason
  // every roster-driven block here has one of these: the cases
  // after it are generated from this roster, and an empty roster
  // generates none of them.
  //
  // What it covers is narrower than that, and worth stating rather
  // than leaving a reader to take the sibling's reach on trust.
  // This roster is held against a second one in this same file, so
  // emptying it alone reddens the coverage guard over the shapes as
  // well. The one drift only this reaches is both of them emptied
  // together: no case generated, and one empty list equal to the
  // other, which no comparison between two rosters can ever report.
  it('declares at least one node carrying no query', () => {
    expect(NO_QUERY_SAMPLES.length).toBeGreaterThan(0);
  });

  // The coverage guard, and this block's answer to the
  // distinctness one its siblings carry. Four samples leaving
  // one parameter shape would print four ticks over one test,
  // and a shape nobody planted a node for would go unasserted
  // with nothing to say so — the two failures are one comparison
  // apart, and this reports both.
  //
  // Sorted lists rather than sets, so a label short and a label
  // twice each name themselves in the diff. Held against the
  // full roster minus the one shape a statement leaves, so a
  // fifth shape named in `PARAMETER_SHAPES` is unreached rather
  // than unnoticed.
  it('plants a node for every shape that carries no query', () => {
    const planted = NO_QUERY_SAMPLES
      .map((sample) => parameterShapeOf(sample.node))
      .sort();
    const carryingNone = PARAMETER_SHAPES
      .filter((shape) => shape !== 'a query that is a string')
      .sort();

    expect(planted).toEqual(carryingNone);
  });

  // The fixture guard for the roster, and the drift the coverage
  // guard cannot report: a sample rewritten into another shape
  // still lands on some label, so the set stays whole while the
  // entry stands for something other than what it says.
  //
  // Asserted as `<label>: <shape>` pairs rather than as two
  // lists, so the diff names the entry that drifted instead of
  // reporting that two lists differ. Over every node this
  // section declares a shape for, the plant and the blank-query
  // control included, which is where an emptied plant reddens.
  it('leaves the parameter shape each of them declares', () => {
    const declared = SHAPE_DECLARATIONS.map(
      (entry) => `${entry.label}: ${entry.holds}`,
    );
    const left = SHAPE_DECLARATIONS.map(
      (entry) => `${entry.label}: ${parameterShapeOf(entry.node)}`,
    );

    expect(left).toEqual(declared);
  });

  for (const sample of NO_QUERY_SAMPLES) {
    // The node goes over whole, as it does for the accept claim,
    // and an empty list is the answer rather than nothing at
    // all: `queryParametersOf` hands back a list either way so a
    // sweep flattens without asking which it got, which is a
    // property a case asserting `undefined` would quietly drop.
    //
    // No run-time coverage guard stands behind these, which the
    // send plants have and this block does not need. There the
    // cases and the entries were two rosters, so one equality
    // reported drift in both directions; here the loop and the
    // roster are one list, and a sample nobody ran is a sample
    // somebody deleted, which is a thing a diff shows and a
    // suite cannot.
    it(`returns nothing for ${sample.label}`, () => {
      expect(queryParametersOf(sample.node)).toEqual([]);
    });
  }

  // The near miss, and the one node in this block the reader
  // must answer WITH something. A `query` that is there and
  // blank is a string, so it comes back as one empty text, and
  // what that parts is a read keyed to whether there is a member
  // from one keyed to whether there is a statement. The second
  // answers nothing here and satisfies every absence claim in
  // this block.
  //
  // An empty text inside a list rather than an empty list, which
  // is the whole of the distinction and reads as a typo without
  // it: one is a node running a statement nobody has written,
  // the other a node with no statement to write.
  it('returns one empty text for a query that is there and blank', () => {
    expect(queryParametersOf(BLANK_QUERY_CONTROL)).toEqual(['']);
  });
});
