/**
 * @packageDocumentation
 * The node types the workflow invariants judge built output
 * against, kept as data so the suite can ask whether every entry
 * was reached rather than only whether the entries it reached
 * passed.
 *
 * A check over built output is a sweep: walk the nodes
 * `workflow-dist.ts` hands back, flag the ones a rule names,
 * report every offender. What decides which nodes are flagged is
 * a node type string, and the rosters here are where those
 * strings live — one {@link NodeTypeRule} per type, carrying the
 * string, a stable id, and the reason that type is one the suite
 * names.
 *
 * Data rather than a regex alternation or a predicate written
 * into the sweep, and what the difference buys is a question a
 * case can ask. Entries that can be enumerated can be PAIRED: a
 * case plants one sample per entry, keys each sample to its entry
 * by id, and asserts the two sets are equal. An entry nobody
 * planted a sample for then fails a case of its own, rather than
 * riding along untested behind the entries that were. Spelled as
 * one pattern the sweep compiles, the same suite reads
 * identically green while covering whichever entries the author
 * remembered.
 *
 * Worth asking here because the assertions standing on these
 * rosters are absence checks, and an absence check reports the
 * same nothing for a type no workflow carries as for a matcher
 * that would never have caught it. So the sweep over the real
 * tree cannot tell a live matcher from a dead one, and the
 * roster's own paired samples are the only thing that can. It
 * bites hardest on a roster whose subject is not in the tree at
 * all — the model one, which no built workflow carries a node for
 * yet — where the sweep runs across zero nodes and every claim
 * about it holds by having found nothing.
 *
 * Split from the assertions for the reason `naming-patterns.ts`
 * keeps its scan surface and its needle set apart from the
 * invariant that reads them, and paired with `workflow-dist.ts`:
 * that file is what a check is handed, this one is what the check
 * judges it by. Kept here the rosters stay readable, they sit
 * inside a file `tsc` reads — which a `.test.ts` is not — and a
 * case can assert about a roster directly rather than a suite
 * assuming it. The cases themselves stay a list of properties
 * rather than a list of type strings.
 *
 * The limit is the one every named set carries. A roster holds
 * the types somebody thought to name, so it bounds what the suite
 * catches and never the whole of what an instance can load, which
 * is what the reason on each entry is for: a reader weighing that
 * gap is weighing why the named ones were named.
 * `docs/architecture/01-invariants.md` is where the properties
 * behind them are argued, and the register there is what says
 * which phase owns each.
 *
 * The entry shape and the send roster are what have landed. The
 * schedule-trigger type, the model-node prefix, a matcher over
 * each roster, and the reader that pulls a node's SQL off its
 * parsed parameters arrive next in this stage.
 */

/**
 * One node type the suite names, as a roster stores it.
 *
 * Three members, and the split between them is what makes a
 * roster askable: `type` is the string a node carries, `reason`
 * is why that string is one the suite names, and `id` is what a
 * failure and a case refer to the entry by.
 *
 * Declared here rather than parsed, so every entry is checked
 * where it is written and one short of a member is refused
 * outright. That is the opposite of `BuiltWorkflowNode` in
 * `workflow-dist.ts`, the shape these are matched against, which
 * arrives out of a `JSON.parse` and has to be earned by a walk.
 * Nothing in this module opens a file or reads a workflow — a
 * rule is a fact about a type, and whatever does the reading
 * lives beside it.
 */
export interface NodeTypeRule {
  /**
   * Stable identifier, and what failure output names an entry by
   * rather than the text a sweep matched.
   *
   * The two answer different questions. Matched text says what
   * an artifact spelled; an id says which entry is at issue. And
   * the failure this roster exists to make reportable is the one
   * where there is no matched text at all — an entry nothing was
   * ever planted for, caught by a guard holding the ids a run
   * reached against the ids declared. A report assembled out of
   * what a sweep matched can only ever list entries that fired,
   * which is the half that was never in doubt.
   *
   * Not for the reason `ForbiddenPattern.id` in
   * `naming-patterns.ts` is printable. That one keeps a banned
   * name out of a CI log, whereas a node type is one of the more
   * useful things to print; the offender sweeps leave it out for
   * a reason of their own, `nodesMatching` reporting
   * `<file>:<node name>` because that names the edit rather than
   * the diagnosis.
   *
   * Stable through an edit to `type`, which is the member most
   * likely to be corrected or widened later: a claim keyed to
   * the string moves with it and a claim keyed to the id does
   * not. Distinctness across a roster is convention rather than
   * anything enforced here, and a guard comparing sets of ids
   * reads two entries sharing one as a single entry covered.
   */
  readonly id: string;

  /**
   * Why this type is one the suite names, in the roster's own
   * terms rather than as a description of the string.
   *
   * The header states why the set carries reasons at all: it
   * bounds what the suite catches, and a reader weighing that
   * bound is weighing why the named ones were named. What it
   * asks of an individual entry is narrower than that. A roster
   * of capabilities collects several routes to one capability,
   * so a reason that repeats the capability says nothing about
   * why there are several — what earns an entry is the reach it
   * adds that the entries beside it do not have.
   *
   * Which is also the question an entry added later has to
   * answer, and what stands between a roster and a list that
   * grew by resemblance.
   */
  readonly reason: string;

  /**
   * The node type string, spelled the way a node's own `type`
   * member spells it — fully qualified, and a whole type rather
   * than a prefix or a pattern.
   *
   * Whole is what makes an entry pairable: a case plants a node
   * of exactly this type and there is no question which entry it
   * stands for. A rule whose subject is a namespace rather than
   * a type is not an entry of this shape, which is why the
   * model-node one arriving next in this stage is a constant of
   * its own.
   *
   * Data and not a comparison. How a node's type is held against
   * this belongs to the matcher over the roster, and keeping it
   * out of the entry is what lets a case ask the roster a
   * question without running a sweep at all.
   */
  readonly type: string;
}

/**
 * The node types that can put a message on the wire, and which
 * no built workflow may hold.
 *
 * The property is this port at its least negotiable: the
 * pipeline reads, scores, stores and renders, and the one thing
 * it must never do is send. `docs/architecture/01-invariants.md`
 * is where that is argued and where the register says which
 * phase owns it; the roster here is the set the check reads.
 *
 * Three entries, carried from the origin, and three rather than
 * one because sending is a capability several unrelated node
 * types reach — a hosted provider API, a provider-agnostic send
 * node, a transport addressed directly. Named as one thing it
 * would have to be a pattern over the word `mail`, which flags
 * the read-only intake nodes beside it and is the kind of needle
 * somebody eventually deletes. So each route is an entry, and
 * each {@link NodeTypeRule.reason} says what its route reaches
 * that the entries beside it do not.
 *
 * Whole type strings rather than the substring alternation the
 * origin swept with, for the reason {@link NodeTypeRule.type}
 * gives: a whole type is pairable and a pattern is not. The cost
 * is this set at its own limit — a node spelling one of these
 * capabilities some other way is a MISS here where a substring
 * sweep would have caught it. Widening the roster is the answer
 * it has for that, and the other send-capable types an operator
 * can reach for on a stock instance arrive next in this stage,
 * alongside the matcher that holds a node type against them.
 */
export const SEND_NODE_TYPES: readonly NodeTypeRule[] = [
  {
    id: 'mail-provider',
    reason:
      'Sends through a hosted provider API on an account ' +
      'credential. What it reaches that the others do not is a ' +
      'route speaking no mail protocol at all: the call is ' +
      'ordinary HTTPS to the provider, and the address it goes ' +
      'out from belongs to whoever owns the account.',
    type: 'n8n-nodes-base.gmail',
  },
  {
    id: 'mail-send-generic',
    reason:
      'The provider-agnostic send node, and the shortest route ' +
      'from a workflow to an outbound message: one node, one ' +
      'credential, a recipient. What it reaches that the others ' +
      'do not is a send nobody had to integrate first, which is ' +
      'why it is the entry a workflow acquires by accident.',
    type: 'n8n-nodes-base.emailSend',
  },
  // Carried on the origin's reasoning rather than on a node this
  // repository can point at: none of the node types
  // `n8n-nodes-base` registers is spelled for the transport,
  // which is reached instead through the `smtp` CREDENTIAL on the
  // `mail-send-generic` entry. Read off the package registry
  // rather than assumed. So the entry matches nothing a stock
  // instance can load today, and it is kept for two reasons: the
  // string is what a node spelling the transport itself would
  // carry, and a denylist pruned of whatever currently matches
  // nothing is one that shrinks toward the nodes somebody
  // happened to install.
  {
    id: 'mail-transport',
    reason:
      'A mail transport addressed as a node type of its own ' +
      'rather than through a credential on a send node. What it ' +
      'reaches that the others do not is a host and a port: no ' +
      'provider account stands behind it, so there is nothing ' +
      'to disable from outside the workflow once it is wired.',
    type: 'n8n-nodes-base.smtp',
  },
];
