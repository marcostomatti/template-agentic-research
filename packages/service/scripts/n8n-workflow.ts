/**
 * @packageDocumentation
 * The questions an instance-facing command has to answer about a
 * workflow before it can act on one: which of a workflow's nodes
 * would arm it if it were activated, and which of a built artifact's
 * members may cross the public API. Three commands in this directory
 * deal with an n8n instance — the deploy, activate and audit paths —
 * and the answers live here rather than in any one of them, so that
 * all three answer the same questions the same way.
 *
 * Which of these a given command reaches for is that command's own
 * business. What is not negotiable is that no two of them may answer
 * differently, and three separate readings would drift without
 * anything saying so: nothing in this package holds one script's
 * answer against another's, both readings are plausible on their own,
 * and the disagreement surfaces as an operator running two commands
 * about one instance and being told two things.
 *
 * Everything here is answered from a workflow VALUE. Nothing below
 * opens a socket, reads a file or wants a credential, which is the
 * same line `workflow-markers.ts` draws against `build-workflows.ts`
 * with a different dependency on the far side — there a transpiler
 * and a directory tree, here a running instance and the key to reach
 * it. That half is `n8n-client.ts`, arriving later in this stage.
 *
 * The payoff is the package's isolated and live test split. The
 * default suite touches no external service, so a rule answerable
 * from a value is drivable there directly, with a workflow a case
 * wrote by hand and no instance anywhere in the run — and the live
 * seam is left covering what genuinely needs one. A rule that had to
 * ask an instance could be exercised only against an instance.
 *
 * This package depends on no n8n package of any kind. `n8n-workflow`
 * is a published one, and this module carries the name because it is
 * about the same subject rather than because anything here imports
 * it, so every shape below is one this repo declares and holds
 * against what a real artifact carries. Nothing resolves by that bare
 * specifier either: a caller reaches this module as
 * `./n8n-workflow.js`, the relative form every first-party import in
 * this package takes.
 *
 * {@link MANUAL_STARTER_TYPES} and {@link ARMED_TRIGGER_TYPES} have
 * landed, naming the trigger types that do and do not arm a workflow,
 * {@link isActivatableTrigger} reads both to answer for one type, and
 * {@link activatableTriggers} asks that of a whole workflow and hands
 * back the nodes an activation would start. `toApiWorkflow` follows
 * for the projection, and the three commands that call them arrive
 * with those.
 */

/**
 * One trigger type this module classifies, as a roster stores it.
 *
 * Two members, and neither of them spells the classification:
 * {@link TriggerTypeRule.type} is the string a node carries, and
 * {@link TriggerTypeRule.reason} is what the classification rests on.
 * Which of the two rosters an entry sits in IS the answer, so an
 * entry moved between them changes its meaning without changing a
 * member.
 *
 * No id, which is where this parts from `NodeTypeRule` in
 * `tests/invariants/workflow-rosters.ts`, the shape it otherwise
 * resembles. An id earns its line over there because a case pairs an
 * entry to a planted NODE, so an entry needs a name a sample can
 * carry and a failure needs something to print for an entry nothing
 * was planted for at all. Here the matcher takes a type STRING, so
 * the sample a case pairs to an entry is the entry type itself: the
 * type is the join key, and an id would be a second name for one
 * thing. A type string is also nothing to keep out of a log, which is
 * the other reason that roster keeps ids and this one does not.
 *
 * Declared here rather than parsed, so every entry is checked where
 * it is written and one short of a member is refused outright. Data
 * and not a comparison: how a type is held against a roster belongs
 * to {@link isActivatableTrigger}, the matcher reading it, and
 * keeping that out of the entry is what lets a case ask a roster a
 * question with no workflow in front of the answer.
 */
export interface TriggerTypeRule {
  /**
   * Why this type is classified the way the roster holding it
   * classifies it, in terms of what an activation does or does not
   * start.
   *
   * The roster blocks carry what the entries share: that a type
   * string is the only handle this package has, and what the executor
   * does instead. So an entry is left with what is its own, which is
   * who or what has to ask before a run starts, plus anything
   * peculiar to that type. A reason restating the classification says
   * nothing a reader could not read off the roster name; a reason
   * naming the asker is a claim about a node, and a claim about a
   * node can be checked.
   *
   * Which is the point, because measured and plausible read alike.
   * Every reason here was read out of the node implementation
   * `n8n-nodes-base` 2.15.1 and `@n8n/n8n-nodes-langchain` 2.15.1
   * ship: the trigger method and what it hands back, the declared
   * webhooks, the activation message the node shows an operator.
   * Those are versions rather than a release channel, and n8n
   * publishes ahead of them on `stable`, so a reason here describes a
   * node set this port named and not whatever an instance is running.
   */
  readonly reason: string;

  /**
   * The node type string, spelled the way the `type` member of a node
   * spells it: fully qualified, and a whole type rather than a prefix
   * or a pattern.
   *
   * Whole, so an entry is pairable. A case hands this exact string to
   * the matcher and there is no question which entry the answer is
   * about. It is also what a roster of exceptions needs: the rule
   * these correct reads the SHAPE of a name, and a second shape rule
   * underneath it would be one more thing to be wrong about. An
   * exception earns its line by being exact.
   *
   * Fully qualified because the rosters span both node packages a
   * stock instance loads, and because it is what a built artifact
   * carries. A node in `workflows/dist/` spells its type with the
   * package in front of it, so an entry short of the prefix would
   * match nothing a check ever reads.
   */
  readonly type: string;
}

/**
 * The trigger types that start a run only when something outside
 * asks, so a workflow holding one of these and nothing else arms
 * nothing when it is activated.
 *
 * What decides this on an instance is the node class. The executor
 * loads it and asks whether it implements a trigger, a poll or a
 * webhook, and nothing in this package can: a built workflow carries
 * a type string and a parameter bag, no instance stands in front of
 * this module, and pulling in an n8n package to answer would put the
 * whole node set behind a script whose job is to upload JSON. So the
 * rule available here is over the name, and the shape a name offers
 * is the `Trigger` suffix, which 106 of the 549 types those two
 * packages register carry. This roster is that shape corrected in one
 * direction, and {@link ARMED_TRIGGER_TYPES} is the other.
 *
 * Four of the five would pass the executor's own test, which is the
 * measurement worth having before anybody calls this a poor
 * substitute. They declare a trigger method, so a workflow holding
 * one has a trigger node by every reading a node description
 * supports. What parts them from a trigger that arms is what that
 * method HANDS BACK, and no description carries it: an empty response
 * for the two n8n itself calls, a bare manual-trigger function for
 * the two a person starts. A rule that could load descriptions would
 * not have drawn this line either. It would have had to run the
 * trigger.
 *
 * The remaining entry is not a trigger by that test at all, declaring
 * only an execute method, and it fails differently: an activation is
 * refused rather than succeeding and starting nothing. Both are worth
 * naming, because only one of them leaves an operator looking at a
 * workflow that reads as active.
 *
 * One of these is what this port runs on. `ar-dispatch` holds the
 * only schedule in the system and reaches the other workflows through
 * an Execute Workflow node, so every workflow phases 5 and 6 add
 * starts at an execute-workflow trigger. A rule reading the suffix
 * alone would report each of them as ready to arm and the activate
 * path would try, which makes this roster load-bearing rather than
 * defensive.
 *
 * Entries run from the furthest-out asker inward: a person at the
 * canvas, a person in the chat panel, another workflow, the executor
 * itself, one of its own subsystems.
 *
 * The bound is the one every named set carries, and it is not the
 * bound its counterpart carries. A type ending in `Trigger` and
 * missing from here is read as arming, and what that costs is an
 * activation the instance itself refuses, which is loud and leaves
 * nothing running that nobody asked for. So this roster can be short
 * without being unsafe, and the completeness the other one claims is
 * deliberately not claimed here.
 */
export const MANUAL_STARTER_TYPES: readonly TriggerTypeRule[] = [
  {
    reason:
      'A person clicking Execute workflow on the canvas. The ' +
      'trigger method hands back a manual-trigger function and ' +
      'nothing else, so an activation has nothing to register: no ' +
      'timer is set, no connection is opened and no URL answers. ' +
      'The node caps itself at one per workflow, and the notice it ' +
      'shows calls the canvas button the thing that starts a run.',
    type: 'n8n-nodes-base.manualTrigger',
  },
  {
    reason:
      'A person typing in the editor chat panel, which is the same ' +
      'asking through another surface. It is an entry of its own ' +
      'on two counts: it is the only starter here from the ' +
      'langchain package, so a roster reading the base package ' +
      'alone would miss it, and the start-node walk inside the ' +
      'executor skips it by NAME, a special case it makes for no ' +
      'other type. Hidden, like the clocks in the roster opposite.',
    type: '@n8n/n8n-nodes-langchain.manualChatTrigger',
  },
  {
    reason:
      'Another workflow calling in through an Execute Workflow ' +
      'node, which is the arrangement this port is built on rather ' +
      'than one it merely tolerates. The trigger method returns an ' +
      'empty response, and the comment shipped beside it says the ' +
      'triggering is handled externally: the caller decides when, ' +
      'so activation buys the callee nothing.',
    type: 'n8n-nodes-base.executeWorkflowTrigger',
  },
  {
    reason:
      'The executor calling in when some other workflow fails. ' +
      'Same empty trigger response as the execute-workflow entry ' +
       'and the same ' +
      'comment beside it, and what it reaches past that is an ' +
      'asker nobody wired: an error workflow is named in a setting ' +
      'rather than invoked from a canvas, so it is reached whether ' +
      'or not anyone ever activated it.',
    type: 'n8n-nodes-base.errorTrigger',
  },
  {
    reason:
      'An evaluation run feeding a dataset row in, and the odd one ' +
      'out here. It declares no trigger, poll or webhook method at ' +
      'all, only an execute, so the executor does not count it as ' +
      'a trigger node and an activation is refused outright rather ' +
      'than succeeding and starting nothing. Nothing this port ' +
      'ships carries one, so the entry is here to keep the rule ' +
      'exact rather than to describe a workflow anybody has.',
    type: 'n8n-nodes-base.evaluationTrigger',
  },
];

/**
 * The trigger types whose activation starts something that then runs
 * without anybody asking, and which a name ending in `Trigger` does
 * not reach.
 *
 * Complete against the node set, which {@link MANUAL_STARTER_TYPES}
 * cannot say of itself. Of the 549 types `n8n-nodes-base` 2.15.1 and
 * `@n8n/n8n-nodes-langchain` 2.15.1 register, exactly four implement
 * a trigger, a poll or a production webhook and do not end in
 * `Trigger`, and the four entries in this roster are those four. Over
 * that node set the suffix misses nothing this roster leaves unnamed.
 *
 * The type this port actually schedules on is deliberately absent.
 * Its name ends in `Trigger`, so the shape reaches it already, and an
 * entry would put a second copy of that string into a directory that
 * cannot import the one `tests/invariants/workflow-rosters.ts` holds.
 * Two spellings of one type with nothing holding them together is the
 * drift a single declaration exists to stop, and the port would gain
 * no reach for it. The vendor polling and webhook triggers are absent
 * for the opposite reason: every one of them ends in `Trigger`, so
 * the shape reaches each of them and an entry would restate a suffix
 * rather than correct it.
 *
 * Two of the four are one route under two names. Both are clocks,
 * both are the predecessors the schedule trigger replaced, and both
 * are marked hidden, which keeps them out of the node panel so nobody
 * reaches for one on purpose while an imported workflow carrying one
 * still loads and still fires. They are two entries because a rule
 * over whole type strings has no way to name a route, and an entry
 * naming one of them would arm one hidden clock and leave the other
 * reading as manual.
 *
 * That completeness is against a version and against those two
 * packages, and neither holds forever. An instance carrying community
 * nodes, or a later release, can hold an armed type this roster does
 * not name, which is then read as manual-only, left inactive, and
 * armed by an operator by hand. That is the direction to be wrong in,
 * and it is why the roster is written as the exceptions to a name
 * shape rather than as a list of everything that arms.
 */
export const ARMED_TRIGGER_TYPES: readonly TriggerTypeRule[] = [
  {
    reason:
      'Activation registers a production URL, and from then on any ' +
      'request reaching it starts a run. The node says as much ' +
      'itself: the message it shows on activation tells an ' +
      'operator that calls to the production webhook URL can now ' +
      'be made. The reach no other entry here has is an asker who ' +
      'needs nothing but the address.',
    type: 'n8n-nodes-base.webhook',
  },
  {
    reason:
      'Activation opens a mailbox connection and holds it. The ' +
      'trigger method reads an imap credential, connects, and ' +
      'hands back a close function, so what is started here is a ' +
      'live connection rather than a timer or a route, and it ' +
      'stays open for as long as the workflow is active. It is ' +
      'also the only entry here whose activation can fail on a ' +
      'credential: the trigger method refuses when the imap one ' +
      'does not resolve, where a clock and a URL need nothing from ' +
      'anybody.',
    type: 'n8n-nodes-base.emailReadImap',
  },
  {
    reason:
      'A clock driven by a cron expression, which is the shape the ' +
      'schedule this port runs on is itself written in. Its ' +
      'activation message differs from the schedule trigger one in ' +
      'the trigger name alone, promising executions on the ' +
      'schedule you have defined, which is the plainest statement ' +
      'that a workflow carrying one runs unattended.',
    type: 'n8n-nodes-base.cron',
  },
  {
    reason:
      'A clock driven by a plain number and unit rather than an ' +
      'expression, hidden for the reason cron is and running ' +
      'unattended in the same way. Nothing about the interval is ' +
      'written as a schedule anybody has to read, which makes it ' +
      'the cheapest way to give a workflow a heartbeat and the ' +
      'easiest to overlook on a canvas.',
    type: 'n8n-nodes-base.interval',
  },
];

/**
 * Whether a node of type `type` would arm a workflow that was
 * activated with that node in place.
 *
 * The rule is over a name because what it stands for cannot be
 * reached from here: an instance settles it from the node CLASS,
 * which the executor loads and asks what it implements, and
 * {@link MANUAL_STARTER_TYPES} sets out that trade and what it costs.
 * A workflow carries the name and not the class, so the name is what
 * this reads, and an answer is about the string rather than about the
 * implementation an instance would load behind it. The two part
 * company wherever a name and an implementation disagree: a type
 * renamed between releases, a community node, a release later than
 * the ones these rosters were read from.
 *
 * Three readings in one, and the order is what makes them a single
 * rule. A type {@link MANUAL_STARTER_TYPES} names answers false, a
 * type {@link ARMED_TRIGGER_TYPES} names answers true, and everything
 * else is answered by the shape those two rosters correct: a name
 * ending in `Trigger`. The rosters are the exceptions to it, so they
 * are read first and the suffix last.
 *
 * The rosters name no type in common, so the order between THEM
 * decides only a type that ended up in both. Manual wins there, which
 * leaves such a workflow inactive for an operator to arm by hand
 * rather than pointing the activate path at a workflow one of this
 * module's own rosters calls manual.
 *
 * Compared exactly, where `isSendCapable` in
 * `tests/invariants/workflow-rosters.ts` folds case. That is a
 * divergence and not an oversight: a fold is safe under a denylist,
 * where it widens each entry onto the misspellings of its own type,
 * and here it would widen in both directions at once. The suffix
 * reading settles it either way, being a claim about how a name is
 * SPELLED, which a fold erases.
 *
 * Which way a miss errs is decided by which roster missed it, and the
 * two sit on opposite sides of the suffix. Every entry in
 * {@link MANUAL_STARTER_TYPES} ends in `Trigger`, so a manual starter
 * that roster does not name reaches the suffix and is read as arming.
 * No entry in {@link ARMED_TRIGGER_TYPES} ends in `Trigger`, so an
 * armed type of that shape left unnamed reaches the suffix and is
 * read as manual. Reading an armed type as manual is the safe way to
 * be wrong, and it costs a manual activation and nothing besides: the
 * workflow stays inactive, the instance stands as it was, and one
 * activation by hand is the whole of the correction. What each
 * roster's own miss costs is argued where that roster is declared.
 *
 * A type string and not a node, which is what keeps the rosters
 * askable with no workflow in front of the answer. Which of a given
 * workflow's nodes this reaches, and what a node left disabled counts
 * for, belong to {@link activatableTriggers}, which walks a workflow
 * and drops what the executor drops before asking this anything.
 */
export function isActivatableTrigger(type: string): boolean {
  if (MANUAL_STARTER_TYPES.some((rule) => rule.type === type)) {
    return false;
  }

  if (ARMED_TRIGGER_TYPES.some((rule) => rule.type === type)) {
    return true;
  }

  return type.endsWith('Trigger');
}

/**
 * One node of a workflow, cut down to the two members the arming
 * question reads off it.
 *
 * {@link ActivationNode.type} is what the classification is made from
 * and is declared a string, because that is what
 * {@link isActivatableTrigger} compares.
 * {@link ActivationNode.disabled} decides whether the classification
 * is asked at all and is declared `unknown`, because the test
 * {@link activatableTriggers} makes against it is a strict identity
 * against `true` — total over any value, so nothing here narrows it
 * and no caller has to promise a boolean it did not check.
 *
 * Everything else a node carries stays reachable as `unknown` through
 * the index signature. That is the split `BuiltWorkflowNode` draws in
 * `tests/invariants/workflow-dist.ts` and it is drawn for the same
 * reason: which members a node has depends on the kind of node it is,
 * and a shape closing the list here would give a format this repo
 * does not own a second home in it. A node name is one of those — a
 * caller printing which node arms a workflow reads it back as
 * `unknown`, since nothing in this file has any use for it.
 *
 * Hand-declared, and nothing in this module tests any of it. A caller
 * hands a node in already parsed, so there is no walk here to earn a
 * cast the way `loadBuiltWorkflows` earns one next door — and what a
 * caller's own declaration is worth depends on how the value got
 * there. Measured both ways: `JSON.parse` answers `any`, which an
 * annotation lets straight in with nothing tested, while a value
 * routed through `unknown` first is refused without a cast, which is
 * the route that file takes on purpose. Neither is a check, so a node
 * arriving here is whatever the caller said it was.
 */
export interface ActivationNode {
  /**
   * Whether an operator has switched this node off. Read as `unknown`
   * and compared against `true`, the way the executor compares it.
   */
  readonly disabled?: unknown;

  /**
   * The node type an instance loads, fully qualified, and the only
   * member the classification is made from.
   */
  readonly type: string;

  /** Everything else the node carries, read by nobody here. */
  readonly [key: string]: unknown;
}

/**
 * One workflow, cut down to the nodes the arming question walks.
 *
 * A built artifact and a workflow read back off an instance both
 * satisfy this, which is what lets the deploy, activate and audit
 * paths ask one question one way rather than three. It is also why
 * the shape is not named for either of them: an artifact under
 * `workflows/dist/` and an API answer differ in members this does not
 * read.
 *
 * Open, for {@link ActivationNode}'s reason and not for symmetry. The
 * envelope carries `name`, `connections`, `settings` and whatever
 * else the format puts there, none of which decides anything here,
 * and the projection that does read those members is
 * `toApiWorkflow`'s own business.
 */
export interface ActivationWorkflow {
  /**
   * Every node the workflow carries. May be empty, and an empty list
   * answers manual-only — which is the right answer for a workflow
   * with no trigger and also the answer a caller gets for one it
   * failed to read, so whether the list should have held something is
   * a question for wherever the workflow was loaded.
   */
  readonly nodes: readonly ActivationNode[];

  /** Everything else the envelope carries, read by nobody here. */
  readonly [key: string]: unknown;
}

/**
 * The enabled nodes of `workflow` that would arm it, so an empty
 * answer means the workflow is manual-only and an activation would
 * leave nothing running.
 *
 * Nodes rather than a count or a flag, because the activate path
 * needs both readings and they are the same value: empty is the
 * verdict, and a non-empty answer is the report — which node an
 * activation would arm the workflow for, and therefore what an
 * operator is being asked to allow. They come back in the workflow's
 * own order, one entry per arming node, so a workflow carrying two
 * clocks comes back with two: a count and not a set.
 *
 * Manual-only is a claim about what an ACTIVATION starts and never
 * about what can run. An error trigger is reached whether or not
 * anybody activated the workflow holding it, and every workflow
 * phases 5 and 6 add starts at an execute-workflow trigger
 * `ar-dispatch` calls — both of them manual starters by
 * {@link MANUAL_STARTER_TYPES}, both of them reached without an
 * activation, and neither of them a reason to arm anything. An empty
 * answer says the instance would register no timer, open no
 * connection and answer at no URL.
 *
 * The disabled skip is the one reading in this module that is about a
 * node rather than about a name, and it is the executor's own rather
 * than a choice made here. `Workflow.queryNodes` in `n8n-workflow`
 * 2.15.0, which both `getTriggerNodes` and `getPollNodes` go through,
 * drops a node whose `disabled` is `true` before it loads a node type
 * at all — so a disabled trigger is not a trigger the executor ever
 * asks about, and a reader mirroring it has to drop the node while
 * the matcher underneath keeps answering for the type alone.
 *
 * Strict against `true`, which is the executor's comparison rather
 * than a tidier way of writing a falsiness test. `INode.disabled` is
 * declared optional and boolean and the executor compares with `===`,
 * so a node carrying anything else — a string an operator typed, a
 * number some tool wrote — is one the instance still runs, and a
 * truthy test here would answer manual-only for a workflow that arms.
 * Erring that way costs no more than the manual activation
 * {@link isActivatableTrigger}'s own close prices; what it costs
 * instead is the whole of what this function claims, which is what an
 * instance WOULD do, and an answer reached by a comparison the
 * executor does not make is about something else.
 *
 * Two limits on the skip, and the second bounds where the first can
 * bite. It is measured on the trigger and poll walk; a production
 * webhook is registered by a layer above `n8n-core` that nothing in
 * this port has read, so for a webhook-armed workflow the skip is
 * this module's reading of what disabled ought to mean rather than a
 * mirror of what an instance does. And no node in this port's own
 * workflow sources carries the member at all, nor any of the origin's
 * 176 — so it reaches this function from a workflow read back off an
 * instance, where an operator turned a node off on the canvas, and
 * never from anything the build wrote.
 */
export function activatableTriggers(
  workflow: ActivationWorkflow,
): readonly ActivationNode[] {
  return workflow.nodes.filter(
    (node) => node.disabled !== true && isActivatableTrigger(node.type),
  );
}
