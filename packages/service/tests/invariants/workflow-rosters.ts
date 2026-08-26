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
 * a node type string, and this file is where those strings live —
 * mostly one {@link NodeTypeRule} per type, carrying the string,
 * a stable id, and the reason that type is one the suite names,
 * and a bare constant where a rule has no siblings to be told
 * apart from.
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
 * The entry shape, the send roster and its matcher, and the
 * schedule-trigger type and its matcher are what have landed. The
 * model-node prefix, a matcher over it, and the reader that pulls
 * a node's SQL off its parsed parameters arrive next in this
 * stage.
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
   * stands for. A rule whose subject is a namespace rather than a
   * type is not an entry of this shape, which is why the
   * model-node one arriving next in this stage is a constant of
   * its own. Nor is a rule with no siblings:
   * {@link SCHEDULE_TRIGGER_TYPE} is a whole type and would fit
   * here, and stands outside because a set of one has nothing to
   * tell apart.
   *
   * Data and not a comparison. How a node's type is held against
   * this belongs to the matcher over the roster, which for the
   * send one is {@link isSendCapable}, and keeping it out of the
   * entry is what lets a case ask the roster a question without
   * running a sweep at all.
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
 * nothing. {@link isSendCapable} is what holds a node type
 * against these entries, and it carries the case fold of that
 * sweep forward without its substrings.
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

/**
 * Whether `type` is one of the node types
 * {@link SEND_NODE_TYPES} names, compared without regard to case.
 *
 * A type string and not a node, which is the whole of what keeps
 * the roster askable on its own: a case plants the string an
 * entry declares and asks directly, with no tree, no artifact
 * and no reader standing in front of the answer. A sweep over
 * built output composes it at the call site instead, reading a
 * node's own `type` member there — `nodesMatching` in
 * `workflow-dist.ts` is shaped for exactly that, its predicate
 * taking a whole node, and this answering for the one member of
 * it that decides.
 *
 * So it reads a type and nothing else. A node left disabled
 * carries the type an enabled one carries and answers the same
 * here, which is the intended reading rather than a gap: what
 * the roster stands for is that the capability is ABSENT from a
 * workflow, not that it is switched off, and a toggle is one
 * edit from being switched back.
 *
 * Case-insensitive because the origin swept case-insensitively,
 * and the fold is the half of that sweep worth carrying —
 * {@link SEND_NODE_TYPES} declines the other half, its
 * substrings, and that half is not free to keep: measured, four
 * of the eight entries have a trigger node registered beside
 * them under their own name on a stock instance, each of which
 * READS and none of which sends, so a substring sweep over
 * these names flags every one of them.
 *
 * Whole strings are what make an entry pairable
 * ({@link NodeTypeRule.type}), and exact and brittle arrive
 * together: a sweep passing over a send node because one
 * letter's case differed prints the same nothing a clean tree
 * prints, and an absence check has no way to tell those two
 * apart. The fold buys that back for nothing, measured rather
 * than assumed — the 438 types the published node registry
 * carries are all distinct under a case fold, so folding widens
 * no entry onto a node another entry would have to name. What
 * it widens onto is the misspellings of an entry's own type,
 * which is the direction a denylist errs in safely.
 *
 * `toLowerCase` and not the locale-aware sibling, which is a
 * live question here rather than a pedantic one: the reader next
 * door sorts with `localeCompare` deliberately, so the habit is
 * in the directory already. A fold is the one place it does not
 * belong — measured, a Turkish fold of `gmaIl` lands on a
 * dotless `ı` and misses the entry the plain fold reaches, which
 * would leave this answer moving with the machine it ran on.
 */
export function isSendCapable(type: string): boolean {
  const folded = type.toLowerCase();

  return SEND_NODE_TYPES.some((rule) => rule.type.toLowerCase() === folded);
}

/**
 * The node type that puts a workflow on a clock, and the one type
 * this port permits a single instance of.
 *
 * Scheduling here is a database row rather than a trigger. A
 * thing becomes schedulable by carrying a due time, and what
 * fires it is `ar-dispatch` claiming that row when it comes due —
 * so one trigger serves the whole system, and making a second
 * thing schedulable is an INSERT. `workflows/src/README.md`
 * states that as a constraint over the workflow set, and
 * `docs/architecture/01-invariants.md` argues what its absence
 * costs and names the phase that enforces it.
 *
 * A bare constant and not a {@link NodeTypeRule}, for a different
 * reason from the model-node prefix: that one's subject is a
 * namespace, while this is a whole type and would sit in a roster
 * without complaint. What it has no use for is the roster. A set
 * of one has no entries to tell apart, a sample paired to it says
 * only what the constant already spells, and
 * {@link NodeTypeRule.reason} exists to say what an entry reaches
 * that its neighbours do not — which is not a question a lone
 * entry can answer.
 *
 * That it is a set of one was measured rather than assumed. The
 * published node registry marks the capability itself: a node
 * description's `group` carries `schedule` beside `trigger`, and
 * of the 438 types `n8n-nodes-base` 2.15.1 registers, exactly one
 * visible type carries it.
 *
 * Which is what a workflow's other triggers are not, and that
 * distinction is the whole content of a check standing on this
 * constant. A manual trigger (`n8n-nodes-base.manualTrigger`), a
 * webhook (`n8n-nodes-base.webhook`) and an execute-workflow
 * trigger (`n8n-nodes-base.executeWorkflowTrigger`) are every one
 * of them legitimate, and none of the three is a schedule. Each
 * starts a run and none of them decides WHEN one starts: an
 * operator clicking decides, an inbound request decides, a
 * calling workflow decides. All three carry `group: ['trigger']`
 * with no `schedule` beside it.
 *
 * The third is the one that would go wrong quietly. The roster in
 * `workflows/src/README.md` reserves `ar-dispatch` to invoke the
 * other workflows through an Execute Workflow node, so every
 * workflow it reaches carries an execute-workflow trigger by
 * design. A check reading `this workflow has a trigger` as `this
 * workflow has a schedule` would flag exactly the workflows the
 * dispatcher exists to call, and would begin doing so in a phase
 * that added no schedule at all.
 *
 * That is also why the subject is this type rather than the shape
 * of a name. 102 of the 438 registered types end in `Trigger`,
 * the manual and execute-workflow ones among them, and exactly
 * one of the 102 carries `schedule` in its group — so a suffix is
 * a needle that reads as precise and matches 101 nodes that start
 * nothing on a clock.
 *
 * The limit is the hidden pair. `cron` and `interval` carry
 * `schedule` in their group too — they are the predecessors this
 * type replaced — and `hidden: true` keeps them out of the node
 * panel, so nobody reaches for one on purpose while an imported
 * workflow carrying one still loads and still fires. A workflow
 * written with either holds a schedule this constant does not
 * name, and a count over it comes back one short. What answers
 * that is an entry per type, which is to say this becoming a
 * roster after all: worth doing when a workflow arrives from
 * somewhere other than `workflows/src/`, and not before.
 */
export const SCHEDULE_TRIGGER_TYPE = 'n8n-nodes-base.scheduleTrigger';

/**
 * Whether `type` is {@link SCHEDULE_TRIGGER_TYPE}, compared
 * without regard to case.
 *
 * A type string rather than a node, and folded rather than exact,
 * for the reasons {@link isSendCapable} gives: the constant stays
 * askable with no tree in front of the answer, and the fold
 * widens onto misspellings of the one type rather than onto a
 * type something else would have to name.
 *
 * Where the two part is what a miss costs. {@link isSendCapable}
 * feeds an absence check, so a send node it failed to recognise
 * prints the same nothing a clean tree prints and no assertion
 * over the sweep can tell those apart. This one feeds a count
 * that has to come out at exactly one, and both directions of a
 * mistake are loud there: recognise too little and the count is
 * zero, too much and it is two. So the fold buys less here than
 * it does next door, and the constant is asked for more — a check
 * that must FIND something says so when it is pointed at the
 * wrong string.
 *
 * A node left disabled answers the same as an enabled one, as it
 * does next door, and the reading is not the same one. For
 * {@link SEND_NODE_TYPES} that is the intended answer: the
 * property is that the capability is ABSENT from a workflow, and
 * a toggle is one edit from being switched back. Here it is a
 * limit worth naming — a workflow whose only schedule trigger is
 * disabled satisfies a count of one while firing on nothing, and
 * neither this answer nor a count over it parts that tree from a
 * running one. What would answer it reads the node's own
 * `disabled` member, which is a fact about a tree rather than
 * about a type and belongs wherever that check lives.
 */
export function isScheduleTrigger(type: string): boolean {
  return type.toLowerCase() === SCHEDULE_TRIGGER_TYPE.toLowerCase();
}
