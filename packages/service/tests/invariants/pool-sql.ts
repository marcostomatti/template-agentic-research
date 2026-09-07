/**
 * @packageDocumentation
 * The statements the research pool is filled and emptied by, kept
 * as data so a property the queue rests on is a line somebody can
 * read rather than a phrase buried inside an assertion.
 *
 * One entry per property, and four of its members say which
 * property of which statement: {@link PoolSqlRule.id} is what a
 * failure and a case name it by, {@link PoolSqlRule.property} is
 * what it stands for in the register's own terms, and
 * {@link PoolSqlRule.workflowId} and
 * {@link PoolSqlRule.nodeName} are the artifact and the node its
 * statement is read off. The fifth,
 * {@link PoolSqlRule.requires}, is what that statement has to
 * carry for the property to hold.
 *
 * Modelled on `dispatch-sql.ts` next door and parting from it in
 * one member. That roster is scoped to one workflow, which is what
 * leaves a bare node name enough to name a statement there, and it
 * says in as many words what a second workflow acquiring
 * properties of this kind wants: the workflow named alongside the
 * node rather than a roster of its own, the coverage guard that
 * gives an enumerable roster its worth being over the roster
 * whole. This is that case. Twenty two entries over six statements
 * in three workflows, and the three are not interchangeable — the
 * pool is filled by two raisers, emptied by one drain, and
 * accounted for by the row each of those passes closes. A property
 * of the queue is a property of that set rather than of any one
 * artifact in it, and splitting it three ways would leave three
 * rosters none of which could be held against the whole.
 *
 * These are MUST-FIND checks, the same inversion that file
 * records. An absence sweep goes vacuous when its matcher would
 * never have fired, and the answer to that is a planted sample.
 * Here every entry names one node in one workflow and requires
 * something of it, so the vacuity is an entry left pointing at a
 * node — or at a workflow — a later edit renamed, which has
 * nothing to look at and so nothing to report.
 * {@link unsatisfiedPoolRequirements} reports that as an
 * unsatisfied entry naming what it went looking for, never as the
 * empty list a satisfied entry hands back.
 *
 * Named apart from its neighbour's `unsatisfiedRequirements` on
 * purpose. The two take different second arguments — one workflow
 * there and the whole built tree here, this roster having to
 * resolve its own artifact before it can find a node — and a
 * module reading both rosters at once would otherwise be importing
 * one of them under an alias it chose itself.
 *
 * {@link sqlWords} is imported rather than repeated, which is the
 * arrangement `research-acyclicity.ts` already takes with it: the
 * reduction is one decision about how a statement is read and a
 * second copy of it is a second thing able to stop agreeing. What
 * it buys is measured rather than assumed here. Comments are 69 to
 * 90 per cent of the characters of these six statements, this port
 * arguing its decisions inside the SQL that carries them, and the
 * prose most likely to spell a phrase an entry requires is the
 * prose explaining why the statement carries it. Of the thirty
 * three fragments the roster holds, three are also carried by the
 * comments of their own node, so three entries are partly
 * satisfied by prose once the strip is gone and none of the twenty
 * two is wholly. Measured over the built tree, entry by entry.
 *
 * What {@link sqlWords} leaves is words, so an entry can require a
 * phrase and never a SHAPE, and three limits follow that are worth
 * stating rather than leaving to be found. An entry cannot say
 * WHERE in a statement a word sat, so a column pulled into a
 * projection and never used in the predicate carries the fragment.
 * It cannot tell two spellings of one keyword apart, and the drain
 * carries two bounds, one over the documents behind a candidate
 * and one over the batch itself. And it cannot read arithmetic: a
 * window guard naming the pool timestamp and the setting satisfies
 * its entry whether the comparison between them is the right way
 * round. The live seams are where that last one is answered —
 * `tests/live/research-interval.live.test.ts` for the window and
 * `tests/live/schedule-ratchet.live.test.ts` for the reschedule —
 * and neither stands in for the other. An entry catches the clause
 * going missing, which is the half that goes missing quietly.
 *
 * Split from the assertions the way `workflow-rosters.ts` and
 * `dispatch-sql.ts` are, and for the reason that survives
 * measurement: the input to a check is a subject in its own right,
 * so a case can ask this roster questions rather than assume it,
 * and a reader after one property opens a list rather than a
 * suite. `docs/architecture/01-invariants.md` carries the register
 * these answer to, `docs/architecture/03-workflows.md` the raise
 * and drain arguments, and `docs/architecture/06-scheduling.md`
 * the reschedule half.
 *
 * The entry shape, the roster, and the reading that holds an entry
 * against a node of a named workflow are what have landed:
 * over both raise statements, over the drain the approvals feed,
 * and over the three rows those passes close. `pool-sql.test.ts`
 * holds every entry against the node it names, over the tree this
 * package builds.
 */

import type { BuiltWorkflow } from './workflow-dist.js';

import { sqlWords } from './dispatch-sql.js';
import { queryParametersOf } from './workflow-rosters.js';

/**
 * The extension every built artifact carries, appended to a
 * {@link PoolSqlRule.workflowId} to reach one.
 *
 * `loadBuiltWorkflows` keys a workflow by the file it was read
 * from and the build writes one artifact per source under the
 * source's own name, so the id an entry carries plus this is the
 * whole of the lookup. Declared rather than spelled at the one
 * call site because it is the join between two namings and not a
 * detail of the walk that uses it.
 */
const ARTIFACT_SUFFIX = '.json';

/**
 * One property the research pool rests on, as the roster stores
 * it.
 *
 * Five members: four that say which property of which statement,
 * and one that says how the statement is held to it. Declared here
 * rather than parsed, so an entry short of a member is refused
 * where it is written, which is the opposite of `BuiltWorkflow` in
 * `workflow-dist.ts` — the shape these are matched against, which
 * arrives out of a `JSON.parse` and has to be earned by a walk.
 */
export interface PoolSqlRule {
  /**
   * Stable identifier, and what failure output names the entry
   * by.
   *
   * The reason a roster carries one is the reason
   * `DispatchSqlRule` gives for its own: the failure a roster
   * exists to make reportable is an entry nothing reached, and an
   * entry nothing reached has no matched text to be named by. It
   * leads every label {@link unsatisfiedPoolRequirements} hands
   * back for a second reason that bites harder here than next
   * door: two of the six nodes carry four entries apiece and the
   * two raisers carry five and six, so a failure naming only the
   * node says which statement to open and not which property went
   * missing.
   *
   * Prefixed `pool-` across the roster, which is convention rather
   * than anything enforced: these ids travel into a failure message
   * beside ids from the other workflow rosters, and a bare
   * `oldest-first` there would not say which queue it was about.
   *
   * Stable through an edit to {@link PoolSqlRule.requires}, which
   * is the member most likely to be widened or corrected later.
   * Distinctness across the roster is convention too, and a guard
   * comparing sets of ids reads two entries sharing one as a
   * single entry covered.
   */
  readonly id: string;

  /**
   * What the entry stands for, in the terms the property is argued
   * in rather than as a description of
   * {@link PoolSqlRule.requires}.
   *
   * The two can come apart, and where they do this member is the
   * one that is true: the window entries stand for a subject
   * researched recently not being asked about again, while what
   * they require is that the pool timestamp and the window are
   * both named — a guard comparing them the wrong way round
   * carries both names and satisfies the entry. Reading only the
   * fragments, that gap is invisible; reading this beside them, it
   * is the sentence a reader checks them against.
   *
   * The register in `docs/architecture/01-invariants.md` says which
   * phase owns a property and what enforces it. What belongs on
   * this member is the one sentence saying what the statement has
   * to do.
   */
  readonly property: string;

  /**
   * The workflow whose artifact the statement is read out of,
   * named the way its source is.
   *
   * The stem and not the file: `ARTIFACT_SUFFIX` is appended where
   * the lookup happens, so an entry names the thing a reader opens
   * under `workflows/src/` rather than the built copy it is
   * checked against. The member `dispatch-sql.ts` has no need of,
   * and the whole of what lets one roster span three artifacts.
   *
   * Unresolvable is reported rather than passed over, the same way
   * an absent node is: a workflow renamed out from under an entry
   * leaves that entry with nothing to look at, which is the one
   * failure a must-find roster cannot afford to answer quietly.
   */
  readonly workflowId: string;

  /**
   * Name of the node whose statement is read for this property, as
   * the canvas spells it.
   *
   * The display name, Title Case, and not the node `id`, its type,
   * or the file it sits in. Two workflows here carry a node under
   * the SAME name — both raisers spell theirs
   * `Raise Research Intentions` — which is exactly why the
   * workflow travels beside it and why a roster spanning three
   * artifacts could not key on a name alone.
   *
   * A node left disabled is read exactly as an enabled one is,
   * which {@link queryParametersOf} states as its own limit: a
   * property required of a raiser is satisfied by the SQL of a node
   * that never runs.
   */
  readonly nodeName: string;

  /**
   * The phrases the statement has to carry, all of them.
   *
   * Written in the statement's own casing and spacing — both sides
   * go through {@link sqlWords} before they are compared, so
   * `ORDER BY p.created_at, p.id` and its shouted twin are one
   * fragment and neither has to be spelled the way the reduction
   * leaves it. Each is matched whole across words, so `LIMIT` is
   * not carried by `unlimited` and `p.researched_at` is carried by
   * the qualified column — the reduction turns everything a word
   * cannot hold into the space that separates two of them.
   *
   * A SQL string literal is written without its quotes, the way
   * `DispatchSqlRule` writes the one it requires: the reduction
   * drops them, so `'done'` and `done` are one fragment and the
   * second spares a reader an escape.
   *
   * Several rather than one because a property is sometimes three
   * phrases and rarely a regular expression. What that costs is
   * stated in the header: a fragment reaches words and never
   * punctuation, so no entry can require the SHAPE an expression is
   * written in.
   *
   * All of them and not any, so a fragment added to an entry
   * narrows it. Satisfied by ANY statement the node runs, which is
   * one statement for every node in this port and is the reading
   * that keeps a node carrying two from being held to both at once.
   *
   * An empty list, and a fragment the reduction leaves empty, are
   * both refused rather than read: each would be satisfied by every
   * statement ever written, and an entry that cannot fail still
   * counts toward whatever coverage guard holds the roster against
   * the entries a run reached.
   */
  readonly requires: readonly string[];
}

/**
 * Every property the research pool rests on, one entry each.
 *
 * The roster the suite over built output judges these six
 * statements by, and the reason it is a list rather than a run of
 * assertions is the one `workflow-rosters.ts` argues for its own:
 * entries that can be enumerated can be paired, so an entry nobody
 * reached fails a case of its own rather than riding along behind
 * the entries that were.
 *
 * Twenty two entries and thirty three fragments, every one of them
 * carried by the statement its entry names, measured over the tree
 * this package builds. None of the five members of any entry is a
 * hit for a needle in `naming-patterns.ts`, checked the way
 * `SEND_NODE_TYPES` records checking its own, with the matcher
 * first proven live against its own needles. Nothing re-runs that
 * pass — `tests/` sits outside that file's scan roots — so this
 * sentence is the whole of what records it, and it covers the
 * twenty two that landed and nothing past them.
 */
export const POOL_SQL_RULES: readonly PoolSqlRule[] = [
  // The first raiser, and five properties of one statement held to
  // one node. Each requires the phrase a statement dropping the
  // property would stop carrying, and each was picked with an eye
  // on what it would still be carried by.
  //
  // The deduplication fragment is the whole clause and not the
  // column, `finding_id` alone being carried by the INSERT above
  // it and by the projection beside it. The window entry names
  // three things because the guard is three things — the state a
  // pool row has to be in, the timestamp read off it, and the
  // window that timestamp is held against — and any one of them
  // going missing is a different guard rather than a narrower one.
  // The settings fragment carries the member name inside it, which
  // is what makes it the entry for where the window comes FROM
  // rather than a second entry for the guard.
  //
  // The stamp entry is three fragments because a word stream can
  // say a column is written and not what reached it. The first is
  // the INSERT's own column list, which a statement dropping the
  // stamp stops carrying; the second is the value selected into
  // that last position, which says the stamp comes from a bound
  // parameter rather than from a literal or a null; and the third
  // is where that same parameter is answered onward as this pass's
  // run id, which is what says WHICH run it is. What none of the
  // three reaches is the binding itself, which is a property of
  // the node's `queryReplacement` rather than of its SQL, and
  // `tests/live/research-interval.live.test.ts` is where the built
  // statement is driven and the stamp read off the row it raised.
  //
  // What none of the five rests on is the comment strip: every
  // fragment here is absent from this node's own prose, measured,
  // which is not the case further down the roster. The strip is
  // still what makes them readable rather than lucky — this
  // statement is 86 per cent comment by character.
  {
    id: 'pool-ingest-one-intention-per-finding',
    property:
      'Raises at most one intention from a finding, so a pass ' +
      'meeting a finding already in the pool adds nothing an ' +
      'operator has to rule on twice.',
    workflowId: 'ar-ingest',
    nodeName: 'Raise Research Intentions',
    requires: ['FROM research_pool p WHERE p.finding_id = s.id'],
  },
  {
    id: 'pool-ingest-refuses-a-researched-subject',
    property:
      'Refuses a subject whose own pool row is closed at done ' +
      'with a researched_at inside its domain\'s window, so a ' +
      'question answered recently is not asked again.',
    workflowId: 'ar-ingest',
    nodeName: 'Raise Research Intentions',
    requires: [
      'p.status = done',
      'p.researched_at',
      's.min_research_interval_seconds',
    ],
  },
  {
    id: 'pool-ingest-window-is-the-domains',
    property:
      'Reads that window off the domain the finding belongs to ' +
      'through a type guard, so a settings member holding ' +
      'anything but a number falls back to the fleet default ' +
      'rather than raising inside the pass that would have ' +
      'closed the run.',
    workflowId: 'ar-ingest',
    nodeName: 'Raise Research Intentions',
    requires: [
      'jsonb_typeof(d.settings -> \'minResearchIntervalSeconds\') ' +
      '= \'number\'',
    ],
  },
  {
    id: 'pool-ingest-needs-a-searchable-term',
    property:
      'Raises nothing for a finding yielding no term, so the ' +
      'queue a person works through holds no row that could not ' +
      'have been turned into a query.',
    workflowId: 'ar-ingest',
    nodeName: 'Raise Research Intentions',
    requires: ['jsonb_array_length(s.search_terms) > 0'],
  },
  {
    id: 'pool-ingest-stamps-the-originating-run',
    property:
      'Stamps the run that dispatched the pass onto every ' +
      'intention it raises, so the spend a scheduled run led to ' +
      'is a join from the pool through runs to llm_calls rather ' +
      'than a guess.',
    workflowId: 'ar-ingest',
    nodeName: 'Raise Research Intentions',
    requires: [
      'INSERT INTO research_pool (domain_id, finding_id, ' +
      'search_terms, root_event_id)',
      's.search_terms, $2::bigint',
      '$2::bigint AS ingest_run_id',
    ],
  },
  // The same four properties against the other raiser, and the
  // sentences repeat because the properties do. Nothing here lets
  // one entry cover both nodes, and the node NAME is identical
  // across the two, so the workflow is the whole of what tells
  // them apart. What that buys is a report a shared entry could
  // not give: a guard dropped from one raiser and not the other
  // names the workflow it went missing from.
  //
  // The fifth is this raiser's alone and is why the pair is not
  // symmetric. `ar-ingest` writes findings with no entity, so its
  // window guard compares a NULL against every pool row there is
  // and holds for every candidate; this one reads the subject off
  // the handover it was given and files the intention under it,
  // which is what leaves the guard above a row to find. The entry
  // requires both halves of that — the read and the write — since
  // a statement reading an entity and inserting without it carries
  // one and not the other. The second fragment is also carried by
  // this node's own prose, so the entry is partly satisfied by
  // comment once the strip is gone and the first fragment is what
  // is holding it up.
  //
  // The sixth is the stamp, and the pair it makes with its
  // `ar-ingest` twin is not symmetric either. That raiser is
  // dispatched by a run and binds it straight into the INSERT;
  // this one is handed a run id or nothing, so the value is read
  // out of a guarded CTE and the column is left null where the
  // handover named none. Its three fragments are the column list,
  // the subselect the value comes out of, and the CASE the guard
  // closes, and the other raiser carries none of them — which is
  // why this entry and its twin are two of the three the swap
  // control at the foot of `pool-sql.test.ts` moves.
  {
    id: 'pool-score-one-intention-per-finding',
    property:
      'Raises at most one intention from a finding, so a pass ' +
      'meeting a finding the ingest raiser already covered adds ' +
      'nothing an operator has to rule on twice.',
    workflowId: 'ar-score',
    nodeName: 'Raise Research Intentions',
    requires: ['FROM research_pool p WHERE p.finding_id = s.id'],
  },
  {
    id: 'pool-score-refuses-a-researched-subject',
    property:
      'Refuses a subject whose own pool row is closed at done ' +
      'with a researched_at inside its domain\'s window, so a ' +
      'question answered recently is not asked again.',
    workflowId: 'ar-score',
    nodeName: 'Raise Research Intentions',
    requires: [
      'p.status = done',
      'p.researched_at',
      's.min_research_interval_seconds',
    ],
  },
  {
    id: 'pool-score-window-is-the-domains',
    property:
      'Reads that window off the domain the finding belongs to ' +
      'through a type guard, so a settings member holding ' +
      'anything but a number falls back to the fleet default ' +
      'rather than raising inside the pass that would have ' +
      'closed the run.',
    workflowId: 'ar-score',
    nodeName: 'Raise Research Intentions',
    requires: [
      'jsonb_typeof(d.settings -> \'minResearchIntervalSeconds\') ' +
      '= \'number\'',
    ],
  },
  {
    id: 'pool-score-needs-a-searchable-term',
    property:
      'Raises nothing for a finding yielding no term, so the ' +
      'queue a person works through holds no row that could not ' +
      'have been turned into a query.',
    workflowId: 'ar-score',
    nodeName: 'Raise Research Intentions',
    requires: ['jsonb_array_length(s.search_terms) > 0'],
  },
  {
    id: 'pool-score-raises-against-a-subject',
    property:
      'Files the intention under the subject its finding was ' +
      'attributed to, which is what leaves the window guard a ' +
      'row to find in this raiser rather than a null to compare ' +
      'against.',
    workflowId: 'ar-score',
    nodeName: 'Raise Research Intentions',
    requires: ['w.value ->> \'entity_id\'', 's.entity_id'],
  },
  {
    id: 'pool-score-stamps-the-originating-run',
    property:
      'Stamps the run the handover named onto every intention it ' +
      'raises and leaves the column null where it named none, so ' +
      'a capture-initiated pass raises rows recording no ' +
      'originating run rather than rows attributed to the wrong ' +
      'one.',
    workflowId: 'ar-score',
    nodeName: 'Raise Research Intentions',
    requires: [
      'INSERT INTO research_pool (domain_id, entity_id, ' +
      'finding_id, search_terms, root_event_id)',
      '(SELECT root_event_id FROM run)',
      'END AS root_event_id',
    ],
  },
  // The drain, and the four properties that make an approved queue
  // a gate rather than a backlog. Two are the predicate, one is
  // the order and one is the bound, and none stands in for
  // another.
  //
  // The status fragment is the ruling and the timestamp fragment
  // is the row still being open, which is the second half of what
  // that column reserves: a row the drain closed without searching
  // is out of this set too. Neither is carried by this node's
  // prose, which argues both at length.
  //
  // The bound is the bare keyword, on the reading `dispatch-sql.ts`
  // takes of its own: the number is written out in this statement
  // rather than resolved from a marker, and requiring it would
  // report a move to `ENV_DEFAULTS` as a property lost. What the
  // fragment cannot say is WHICH bound it found — this statement
  // carries two, one over the documents behind a candidate and one
  // over the batch — so the entry stands for a bound existing and
  // the live seam is where the batch size is read.
  {
    id: 'pool-drain-only-approved',
    property:
      'Drains only a row a person has ruled on, so a pending ' +
      'intention is not selected, not counted and not spent ' +
      'against.',
    workflowId: 'ar-research',
    nodeName: 'Drain Approved Intentions',
    requires: ['p.status = approved'],
  },
  {
    id: 'pool-drain-only-open',
    property:
      'Drains only a row still open, so an intention an earlier ' +
      'pass closed does not come round again whether it was ' +
      'researched or merely settled.',
    workflowId: 'ar-research',
    nodeName: 'Drain Approved Intentions',
    requires: ['p.researched_at IS NULL'],
  },
  {
    id: 'pool-drain-oldest-first',
    property:
      'Takes the intentions raised longest ago with the id ' +
      'breaking the tie, so a queue worked from the head empties ' +
      'rather than churns.',
    workflowId: 'ar-research',
    nodeName: 'Drain Approved Intentions',
    requires: ['ORDER BY p.created_at, p.id'],
  },
  {
    id: 'pool-drain-bounded-batch',
    property:
      'Carries a bounded batch however many rows were approved, ' +
      'so a queue nobody has watched is researched over many ' +
      'passes rather than in one expensive one.',
    workflowId: 'ar-research',
    nodeName: 'Drain Approved Intentions',
    requires: ['LIMIT'],
  },
  // The rows those three passes close, and what each has to say
  // about the pool it moved. A count key is required as the PAIR
  // the counts object is built out of — the literal and the tally
  // column beside it — rather than as the key on its own, which
  // every one of these statements also spells in the tally above
  // and in its own prose. The pair is what says the number reached
  // `runs.counts`, which is the only place a reader looking for a
  // pass that ran away will find it.
  //
  // Five entries over three nodes, and they are not evenly spread
  // because the statements are not: `ar-score` closes with the
  // searchable subjects beside what it raised, which is the
  // denominator the raised count means anything against, and
  // `ar-ingest` has no such key to require yet.
  {
    id: 'pool-ingest-close-counts-intentions',
    property:
      'Writes how many intentions the pass raised into the row ' +
      'it closes, so a raiser running away is a number in the ' +
      'ledger rather than a query against the pool.',
    workflowId: 'ar-ingest',
    nodeName: 'Close Run',
    requires: ['\'intentions_raised\', t.intentions_raised'],
  },
  {
    id: 'pool-score-close-counts-intentions',
    property:
      'Writes how many intentions the pass raised into the row ' +
      'it opens, so a raiser running away is a number in the ' +
      'ledger rather than a query against the pool.',
    workflowId: 'ar-score',
    nodeName: 'Close Score Run',
    requires: ['\'intentions_raised\', t.intentions_raised'],
  },
  {
    id: 'pool-score-close-counts-searchable-subjects',
    property:
      'Writes how many subjects the pass found searchable beside ' +
      'what it raised, which is the denominator the raised count ' +
      'means anything against.',
    workflowId: 'ar-score',
    nodeName: 'Close Score Run',
    requires: ['\'subjects_searchable\', t.subjects_searchable'],
  },
  {
    id: 'pool-research-close-counts-drained',
    property:
      'Writes how many approved intentions the pass took, which ' +
      'is the number the drain\'s own bound holds down.',
    workflowId: 'ar-research',
    nodeName: 'Close Research Run',
    requires: ['\'candidates_drained\', t.candidates_drained'],
  },
  {
    id: 'pool-research-close-counts-recorded',
    property:
      'Writes how many of them it recorded, so a pass paying for ' +
      'candidates it cannot close is visible without reading the ' +
      'pool.',
    workflowId: 'ar-research',
    nodeName: 'Close Research Run',
    requires: ['\'research_recorded\', t.research_recorded'],
  },
  // The reschedule the same statement folds in, and the two
  // entries over it are the pool roster's one reach into
  // scheduling. They are here rather than in `dispatch-sql.ts`
  // because the pass that moves this due time is the pass that
  // drained the queue: what bounds a research workflow is the
  // batch it may take and the cadence it may set for itself, and
  // holding those two in one roster is what lets a reader see both
  // at once.
  //
  // The update entry requires the target and the column it moves
  // and nothing of the expression between them, which is the shape
  // the clamp entries next door take and carries their limit: a
  // statement naming both and computing the gap wrongly satisfies
  // it. `tests/live/schedule-ratchet.live.test.ts` is where that
  // is answered.
  //
  // The attribution entry requires the column list the row is
  // opened with and the literal a rescheduling pass writes into
  // it. Neither says the literal reached that column — a word
  // stream cannot — and the pair is what stands in: a statement
  // dropping the column carries the first fragment no longer, and
  // one keeping the column while ceasing to distinguish an
  // agent-set cadence carries the second no longer. The literal
  // fragment here and the column fragment of the entry above are
  // both carried by this node's prose as well, which argues the
  // schedule modes where the statement applies them; the update
  // target and the insert's own column list are what neither the
  // prose nor a rename would leave standing. Measured, and the
  // reason each of the two entries pairs a prose-carried fragment
  // with one that is not.
  {
    id: 'pool-research-close-moves-the-topic',
    property:
      'Moves the claimed topic\'s due time when the pass ' +
      'proposed a gap, that update being the only way this ' +
      'workflow changes the cadence it will next be run at.',
    workflowId: 'ar-research',
    nodeName: 'Close Research Run',
    requires: ['UPDATE topics', 'next_run_at'],
  },
  {
    id: 'pool-research-close-attributes-the-agent',
    property:
      'Names the schedule that opened the row it writes, so a ' +
      'pass that moved its own due time stays attributable once ' +
      'the due time it fired against has been overwritten.',
    workflowId: 'ar-research',
    nodeName: 'Close Research Run',
    requires: ['INSERT INTO runs (domain_id, scheduled_by', 'agent'],
  },
];

/**
 * Whether `words` carries `fragment` whole.
 *
 * Both sides are already reduced, so both are runs of words with
 * one space between them and nothing else. Padding each with a
 * space makes the first and last word ordinary: a fragment is
 * carried when it sits between two separators, which at the ends
 * of the statement is the padding itself. That is the whole of the
 * word-boundary rule, done without a pattern built out of the
 * fragment — a fragment compiled into one is a fragment whose own
 * punctuation would have been read as syntax.
 *
 * The same three lines `dispatch-sql.ts` carries, declared again
 * rather than shared: they are module-private next door, and
 * widening that file's surface to save three lines would export a
 * helper for a caller that already has the reduction it belongs
 * to.
 */
function carries(words: string, fragment: string): boolean {
  return ` ${words} `.includes(` ${fragment} `);
}

/**
 * The reduced fragments `rule` requires, refusing an entry that
 * cannot fail.
 *
 * Both refusals are about the same hole from either end. An entry
 * requiring nothing, and a fragment that reduces to nothing, are
 * each carried by every statement ever written, so the entry passes
 * while asserting less than its own `property` line claims. Nothing
 * downstream reports it: a coverage guard holding the entries a run
 * reached against the roster counts such an entry as covered, being
 * an entry the run did reach.
 *
 * A plain `Error` rather than a class of its own, the split
 * `schema-sql.ts` draws next door: a class is what lets a case pin
 * a cause, and this is a malformed entry in a file every entry is
 * written in by hand rather than a state a caller drives the roster
 * into.
 *
 * @param rule - The entry to read.
 * @returns Its fragments, reduced the way a statement is.
 * @throws Error When it requires nothing, or requires a fragment
 * holding no word.
 */
function requiredWords(rule: PoolSqlRule): readonly string[] {
  if (rule.requires.length === 0) {
    throw new Error(
      `Pool SQL entry ${rule.id} requires nothing of the SQL on ` +
      `${rule.nodeName} in ${rule.workflowId}, so it is satisfied ` +
      'by every statement and by no statement at all. Either give ' +
      'it the phrases that stand for its property or drop the ' +
      'entry: an entry that cannot fail still counts as one a run ' +
      'reached.',
    );
  }

  return rule.requires.map((required) => {
    const words = sqlWords(required);

    if (words === '') {
      throw new Error(
        `Pool SQL entry ${rule.id} requires a fragment holding no ` +
        `word, so every statement on ${rule.nodeName} in ` +
        `${rule.workflowId} carries it. A fragment is reduced the ` +
        'way a statement is, and comments, punctuation and ' +
        'whitespace are what the reduction drops — write the ' +
        'words the statement runs.',
      );
    }

    return words;
  });
}

/**
 * What `rule` finds wanting in `workflows`, as labels to read.
 *
 * The empty list is the passing answer, and everything else is a
 * `<id>: <what>` label naming one thing that did not hold. A list
 * rather than a boolean and labels rather than a record for the
 * reason `nodesMatching` gives: nothing in a mismatch here is a
 * thing to keep out of a log, so the label IS the report, an
 * assertion that the list is empty prints every offender on its way
 * past, and no case has to build a message of its own.
 *
 * Four shapes of label, and they are four different edits. No
 * artifact under the entry's workflow id says the entry names a
 * workflow that is gone, or a tree built from a source set that no
 * longer holds it. A workflow carrying no node of that name says
 * the entry names a node that is gone. A named node running no SQL
 * says the entry names the wrong node — a sticky note, a merge —
 * since the reading answers empty for a node carrying no `query`
 * and cannot tell that from a node carrying one that is not a
 * string. A fragment not carried says the statement itself dropped
 * the property, which is the failure the entry exists for and the
 * only one of the four about the pipeline rather than about the
 * roster.
 *
 * An absent workflow and an absent node each report one label and
 * not one per fragment, because there is one edit to make and
 * repeating it per phrase would read as several properties lost at
 * once.
 *
 * Every fragment is checked rather than stopping at the first that
 * fails, so a statement that dropped two says so in one run.
 *
 * The whole built tree rather than one workflow, which is where
 * this parts from `unsatisfiedRequirements` next door: an entry
 * here names its own artifact, so resolving it is this reading's
 * job and an unresolvable id is a report rather than a caller's
 * problem.
 *
 * @param rule - The entry to hold the tree to.
 * @param workflows - Every built workflow, as
 *   `loadBuiltWorkflows` hands them back.
 * @returns One label per thing that did not hold, empty when the
 *   property holds.
 * @throws Error When the entry cannot fail, out of
 * {@link requiredWords}.
 */
export function unsatisfiedPoolRequirements(
  rule: PoolSqlRule,
  workflows: readonly BuiltWorkflow[],
): readonly string[] {
  const required = requiredWords(rule);
  const file = `${rule.workflowId}${ARTIFACT_SUFFIX}`;
  const workflow = workflows.find((built) => built.file === file);

  if (workflow === undefined) {
    return [`${rule.id}: no built workflow named ${file}`];
  }

  const named = workflow.nodes.filter(
    (node) => node.name === rule.nodeName,
  );

  if (named.length === 0) {
    return [
      `${rule.id}: ${file} has no node named ${rule.nodeName}`,
    ];
  }

  const statements = named
    .flatMap((node) => queryParametersOf(node))
    .map((query) => sqlWords(query));

  if (statements.length === 0) {
    return [`${rule.id}: ${rule.nodeName} in ${file} runs no SQL`];
  }

  const missing = required.filter(
    (fragment) => !statements.some((sql) => carries(sql, fragment)),
  );

  return missing.map(
    (fragment) => `${rule.id}: ${rule.nodeName} in ${file} runs ` +
      `no SQL carrying ${fragment}`,
  );
}
