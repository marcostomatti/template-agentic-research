/**
 * A node planted in front of a node-type matcher, which is what
 * parts a live matcher from an empty tree.
 *
 * These matchers feed sweeps over built output, and those sweeps
 * are mostly absence checks: no send-capable node anywhere in the
 * tree. A sweep of that shape reports the same nothing for a tree
 * carrying no such node as for a matcher that would not have
 * recognised one, and no assertion over what it handed back parts
 * the two. `workflow-rosters.ts` argues that where the rosters
 * are. What a case adds is the half a sweep cannot reach: a type
 * put in front of a matcher on purpose, where an answer of yes is
 * the matcher's own and not the tree's.
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
 * it. The type is the one thing that moves from case to case.
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
 * place this file writes a node type out, and what it writes is a
 * type the roster does not carry.
 *
 * The other two matchers and the reader that pulls a node's SQL
 * off its parsed parameters are what this file gains next, each
 * with a section of its own.
 */
import type { BuiltWorkflowNode } from './workflow-dist.js';
import type { NodeTypeRule } from './workflow-rosters.js';

import { describe, expect, it } from 'vitest';

import { SEND_NODE_TYPES, isSendCapable } from './workflow-rosters.js';

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
