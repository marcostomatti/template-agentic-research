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
 * Eight entries, and several rather than one because sending is a
 * capability unrelated node types reach by unrelated routes.
 * Three came from the origin and are all mail — a hosted provider
 * API, a provider-agnostic send node, a transport addressed
 * directly. Named as one thing they would have to be a pattern
 * over the word `mail`, which flags the read-only intake nodes
 * beside them and is the kind of needle somebody eventually
 * deletes. So each route is an entry, and its own
 * {@link NodeTypeRule.reason} says what that route reaches that
 * the entries beside it do not.
 *
 * The five beside them are the other send routes a stock instance
 * already carries, nothing installed: a delivery API with no
 * mailbox behind it, chat into a workspace room, chat through a
 * webhook URL that is its own credential, a bot to a personal
 * device, and the telephone network. Their type strings were read
 * off the published node registry rather than carried across,
 * because the origin swept with substrings and a substring is not
 * a type — the third of its three names a transport that the
 * registry lists as a credential and not as a node at all.
 *
 * Deliberately out: the further vendors of a route already named.
 * A second hosted mail provider, a fourth chat platform and a
 * second text-message gateway each add a name and no reach, and a
 * roster admitting them is one that grew by resemblance, which is
 * exactly what {@link NodeTypeRule.reason} is there to refuse.
 * That bound is worth stating rather than implying — a workflow
 * reaching for one of those vendors is a MISS here, and the
 * answer to a miss is an entry carrying the reach it adds.
 *
 * Whole type strings rather than the substring alternation the
 * origin swept with, for the reason {@link NodeTypeRule.type}
 * gives: a whole type is pairable and a pattern is not. The
 * unnamed vendors are what that choice costs, since a substring
 * sweep would have caught them and could have been paired with
 * nothing. The matcher that holds a node type against these
 * entries arrives next in this stage.
 *
 * None of the eight is a hit for any needle in
 * `naming-patterns.ts`, which was checked rather than assumed.
 * Checking is what the case calls for: `tests/` sits outside that
 * file's scan roots, so nothing in the suite ever reads this one
 * for a forbidden name, and a green run says nothing either way.
 * The check was a one-off pass over every member of every entry,
 * run with the matcher first proven live against its own needles
 * — the header's argument about paired samples, one sweep along,
 * since a zero out of a matcher that could never have matched
 * reads exactly like a clean one.
 *
 * So each type string is written out whole, with none of the
 * split-across-a-join treatment `naming-patterns.ts` gives its
 * needles and the suite beside it gives its samples. What a join
 * would cost is the one check these strings have: they were read
 * off a published registry, and a reader repeats that only by
 * holding the entry against it. No case can — pairing a sample to
 * an entry plants exactly what the roster declares, so the suite
 * compares these strings against themselves. The controls in
 * `naming-patterns.test.ts` are literals for a neighbouring
 * reason, but theirs is a property of strings picked to sit near
 * a needle, and this is a measurement over strings picked for
 * what they send. It covers the eight that landed and nothing
 * past them, so an entry added later owes the same pass.
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
  // Read off the node definition rather than assumed: the
  // recipient field is documented as a comma-separated list, the
  // sender is free text on the node, and the delivery-time option
  // hands the message to the provider to release later. Each of
  // the three is a clause the reason turns on.
  {
    id: 'mail-delivery-api',
    reason:
      'Sends mail through a delivery API with no mailbox behind ' +
      'it: the sender address is a field on the node rather ' +
      'than an account somebody signs into, and the recipient ' +
      'field takes a list. What it reaches that the others do ' +
      'not is a send that leaves no sent copy anywhere, ' +
      'addresses many at once, and can be deferred at the ' +
      'provider so the message goes out after the run that ' +
      'wrote it has finished.',
    type: 'n8n-nodes-base.sendGrid',
  },
  {
    id: 'chat-workspace',
    reason:
      'Posts into a workspace room rather than to an addressee. ' +
      'What it reaches that the others do not is an audience ' +
      'nothing in the workflow enumerated: the destination is a ' +
      'channel, who reads it is administered elsewhere, and one ' +
      'token reaches every channel the app was added to.',
    type: 'n8n-nodes-base.slack',
  },
  // Read off the node implementation rather than assumed: in the
  // webhook mode the stored credential carries the whole
  // destination URL, and that URL REPLACES the API base the other
  // modes call. So the credential is the address rather than
  // proof of an identity at one, which is what the reason turns
  // on.
  {
    id: 'chat-webhook',
    reason:
      'Posts through a webhook URL that is itself the ' +
      'credential. What it reaches that the others do not is a ' +
      'destination anybody holding one string can post to: no ' +
      'account stands behind the send, nothing records who made ' +
      'it, and closing it means rotating a URL rather than ' +
      'disabling a user.',
    type: 'n8n-nodes-base.discord',
  },
  {
    id: 'chat-personal',
    reason:
      'Sends as a bot to a chat id, which is the whole of the ' +
      'addressing. What it reaches that the others do not is a ' +
      'personal device with no directory in front of it: no ' +
      'workspace to belong to, no mailbox to hold the message, ' +
      'and nobody administering who can be written to.',
    type: 'n8n-nodes-base.telegram',
  },
  {
    id: 'phone-network',
    reason:
      'Puts the message on the telephone network, as a text or ' +
      'a placed call to a number. What it reaches that the ' +
      'others do not is a route off the internet altogether: it ' +
      'is metered per message, so a batch spends as it goes, ' +
      'and no mail or chat administrator can see it, let alone ' +
      'stop it.',
    type: 'n8n-nodes-base.twilio',
  },
];
