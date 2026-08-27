/**
 * @packageDocumentation
 * The statements `ar-dispatch` must carry, kept as data so a
 * property the dispatcher rests on is a line somebody can read
 * rather than a phrase buried inside an assertion.
 *
 * One entry per property, and three of its members say which
 * property of which statement: {@link DispatchSqlRule.id} is what
 * a failure and a case name it by,
 * {@link DispatchSqlRule.property} is what it stands for in the
 * register's own terms, and {@link DispatchSqlRule.nodeName} is
 * the node its statement is read off. The fourth,
 * {@link DispatchSqlRule.requires}, is what that statement has to
 * carry for the property to hold.
 *
 * These are MUST-FIND checks, which is the whole of what parts
 * this file from `workflow-rosters.ts` next door. A send or model
 * roster feeds an absence sweep, where the vacuity is a matcher
 * that would never have fired and the answer to it is a planted
 * sample. Here the sweep is inverted: every entry names one node
 * in one workflow and requires something of it, so the vacuity is
 * an entry left pointing at a node a later edit renamed, which
 * has nothing to look at and so nothing to report.
 * {@link unsatisfiedRequirements} reports that as an unsatisfied
 * entry naming the node it went looking for, never as the empty
 * list a satisfied entry hands back.
 *
 * Held against a node by NAME rather than swept across the tree,
 * because each of these properties belongs to one statement. A
 * sweep asking whether some node claims rows without re-claiming
 * them is answered by whichever node happens to spell the phrase,
 * and stays answered once the statement it was about has dropped
 * it. A name is also what a reader opens, being the key
 * `connections` wires a graph by.
 *
 * {@link queryParametersOf} is the reading — a parsed parameter
 * and never the artifact's text, argued where it is declared —
 * and this file is what decides what to require of what it hands
 * back. {@link sqlWords} sits between the two, and this port
 * needs it rather more than a general caution about comments
 * would suggest: a workflow source has no comment syntax of its
 * own, so a node's `query` is one of the few tracked homes a
 * decision made at a node has, and every statement here carries
 * paragraphs of prose inside it. The prose most likely to spell a
 * phrase an entry requires is the prose explaining why the
 * statement carries it, or why the statement beside it does. Read
 * whole, the statement that opens a run and the one that closes
 * it as succeeded each answer for a `LIMIT` that neither of them
 * runs: the word for a bound is the word for the keyword, and
 * both spend a paragraph on the limits they carry. Measured, and
 * the whole of why the reduction drops comments before it reads
 * anything.
 *
 * What {@link sqlWords} leaves is words, so an entry can require
 * a phrase and never a SHAPE. Worth stating rather than leaving
 * to be discovered: that a reschedule still reads its bound
 * columns is checkable here, and whether the clamp over them is
 * written null-safe is not. `clampIntervalSeconds` in
 * `src/lib/schedule.ts` is where that second question is argued,
 * and the live seam driving the shipped statement against it is
 * what answers it. The two are not the same check and neither
 * stands in for the other — an entry over a reschedule catches
 * the bounds going missing, which is the half that goes missing
 * quietly.
 *
 * Split from the assertions the way `workflow-dist.ts` and
 * `workflow-rosters.ts` are, and for their reason: a `.test.ts`
 * sits outside the program `tsc` reads, so a roster written into
 * one is a roster nothing type-checks, and a case can assert
 * about a roster declared here directly rather than a suite
 * assuming it. `docs/architecture/01-invariants.md` carries the
 * register these properties answer to; the scheduling half of the
 * argument lands in `docs/architecture/06-scheduling.md`, which
 * arrives later in this phase.
 *
 * The entry shape, the roster, the reduction a statement is
 * judged through, the reading that holds an entry against a node,
 * and every entry the roster carries are what have landed: over
 * both claim statements, over the reschedule folded into each of
 * them, and over the row the dispatcher opens for a claimed unit.
 * `dispatch-sql.test.ts` holds every one of them against the node
 * it names, over the tree this package builds, and reads the same
 * workflow for properties no statement carries — the first of
 * those has landed with them, both claims fed off the trigger
 * rather than one behind the other. What is left is where a
 * failure goes: the branch a failed invocation takes, and the
 * setting that decides there is one to take.
 */

import type { BuiltWorkflow } from './workflow-dist.js';

import { queryParametersOf } from './workflow-rosters.js';

/**
 * A SQL line comment, from its dashes to the end of its line.
 *
 * Module-private and compiled, having one caller in this file:
 * the source-string treatment `naming-patterns.ts` gives its
 * needles buys nothing where no second module compiles it and no
 * `lastIndex` crosses a call. Global, and used only with
 * `replace`, which resets it.
 */
const SQL_LINE_COMMENT = /--[^\n]*/gu;

/**
 * Every run of characters a SQL word cannot carry.
 *
 * Lowercase only, so it is applied AFTER the case fold in
 * {@link sqlWords} rather than before it — reversed, every
 * capital in a statement would be read as punctuation and the
 * words either side of it would run together.
 */
const NOT_WORD_CHARACTERS = /[^a-z0-9_]+/gu;

/**
 * One property `ar-dispatch` has to hold, as the roster stores
 * it.
 *
 * Four members: three that say which property of which statement,
 * and one that says how the statement is held to it. Declared
 * here rather than parsed, so an entry short of a member is
 * refused where it is written, which is the opposite of
 * `BuiltWorkflow` in `workflow-dist.ts` — the shape these are
 * matched against, which arrives out of a `JSON.parse` and has to
 * be earned by a walk.
 */
export interface DispatchSqlRule {
  /**
   * Stable identifier, and what failure output names the entry
   * by.
   *
   * The reason a roster carries one at all is the one
   * `NodeTypeRule.id` gives: the failure a roster exists to make
   * reportable is an entry nothing reached, and an entry nothing
   * reached has no matched text to be named by. It leads every
   * label {@link unsatisfiedRequirements} hands back for a second
   * reason of its own, which is that one node here carries
   * several entries — a statement that claims rows is held to
   * more than one property at once — so a failure naming only the
   * node says which statement to open and not which property went
   * missing.
   *
   * Stable through an edit to {@link DispatchSqlRule.requires},
   * which is the member most likely to be widened or corrected
   * later. Distinctness across the roster is convention rather
   * than anything enforced here, and a guard comparing sets of
   * ids reads two entries sharing one as a single entry covered.
   */
  readonly id: string;

  /**
   * What the entry stands for, in the terms the property is
   * argued in rather than as a description of
   * {@link DispatchSqlRule.requires}.
   *
   * The two can come apart, and where they do this member is the
   * one that is true: a reschedule entry stands for the bounds
   * being applied, while what it requires is that the bound
   * columns are named — a statement clamping them wrongly
   * carries both names and satisfies the entry. Reading only the
   * fragments, that gap is invisible; reading this beside them,
   * it is the sentence a reader checks them against.
   *
   * The register in `docs/architecture/01-invariants.md` is what
   * says which phase owns a property and what enforces it, and
   * the scheduling doc arriving later in this phase is where the
   * ones here are argued at length. What belongs on this member
   * is the one sentence saying what the statement has to do.
   */
  readonly property: string;

  /**
   * Name of the node whose statement is read for this property,
   * as the canvas spells it.
   *
   * The display name, Title Case, and not the node `id`, its
   * type, or the workflow it sits in — the roster is scoped to
   * one workflow, which is what leaves a bare node name enough to
   * name a statement. A name is also what a reader opens. It is
   * the one member with no check behind it anywhere: nothing
   * reports a node renamed out from under an entry except the
   * entry going unsatisfied, which is why
   * {@link unsatisfiedRequirements} reports an absent node rather
   * than passing over it.
   *
   * A node left disabled is read exactly as an enabled one is,
   * which {@link queryParametersOf} states as its own limit and
   * which lands hardest here: a property required of the
   * dispatcher is satisfied by the SQL of a node that never runs.
   */
  readonly nodeName: string;

  /**
   * The phrases the statement has to carry, all of them.
   *
   * Written in the statement's own casing and spacing — both
   * sides go through {@link sqlWords} before they are compared,
   * so `FOR UPDATE SKIP LOCKED` and `for update skip locked` are
   * one fragment and neither has to be spelled the way the
   * reduction leaves it. Each is matched whole across words, so
   * `limit` is not carried by `unlimited` and
   * `min_interval_seconds` is carried by `t.min_interval_seconds`
   * — the reduction turns everything a word cannot hold into the
   * space that separates two of them.
   *
   * Several rather than one because a property is sometimes two
   * phrases and rarely a regular expression. What that costs is
   * stated in the header: a fragment reaches words and never
   * punctuation, so no entry can require the SHAPE an expression
   * is written in.
   *
   * All of them and not any, so a fragment added to an entry
   * narrows it. Satisfied by ANY statement the node runs, which
   * is one statement for every node in this port and is the
   * reading that keeps a node carrying two from being held to
   * both at once.
   *
   * An empty list, and a fragment the reduction leaves empty, are
   * both refused rather than read: each would be satisfied by
   * every statement ever written, and an entry that cannot fail
   * still counts toward whatever coverage guard holds the roster
   * against the entries a run reached.
   */
  readonly requires: readonly string[];
}

/**
 * Every property `ar-dispatch` has to hold, one entry each.
 *
 * The roster the suite over built output judges the dispatcher's
 * statements by, and the reason it is a list rather than a run of
 * assertions is the one `workflow-rosters.ts` argues for its own:
 * entries that can be enumerated can be paired, so an entry
 * nobody reached fails a case of its own rather than riding along
 * behind the entries that were.
 *
 * Scoped to one workflow, which is what makes a bare node name
 * enough to name a statement. A second workflow acquiring
 * properties of this kind wants the workflow named alongside the
 * node rather than a roster of its own, since the coverage guard
 * that gives an enumerable roster its worth is over the roster
 * whole.
 *
 * None of the nine is a hit for any needle in
 * `naming-patterns.ts`, checked the way `SEND_NODE_TYPES` next
 * door records checking its own: every member of every entry, run
 * with the matcher first proven live against its own needles.
 * Checking is what the case calls for, `tests/` sitting outside
 * that file's scan roots — nothing re-runs the pass, so this
 * sentence is the whole of what records it. It covers the nine
 * that landed and nothing past them.
 *
 * All nine have landed: six over the two claim statements, two
 * over the reschedule each of those statements folds in, and one
 * over the row the dispatcher opens for a claimed unit.
 */
export const DISPATCH_SQL_RULES: readonly DispatchSqlRule[] = [
  // Three properties of one statement, so three entries held to
  // one node. Each requires the phrase a statement dropping the
  // property would stop carrying, and each was picked with an eye
  // on what it would still be carried by. `FOR UPDATE SKIP
  // LOCKED` is one fragment and not two: a lock taken without the
  // skip WAITS behind whoever holds the row instead of passing
  // over it, and the halves required separately are carried by a
  // statement that spells them apart. The ordering fragment names
  // the column, an ordering over anything else being one that
  // leaves the wrong rows for the tick behind it. The cap is the
  // bare keyword and nothing more, the setting behind it having
  // resolved to a number long before the suite reads the
  // statement, so the number is no steadier a thing to require.
  //
  // Three of the nine rest on the comment strip, and each is a
  // property its own node argues in prose: this statement spells
  // `FOR UPDATE SKIP LOCKED` while saying why the reschedule is
  // folded into it, `Claim Due Export Subscriptions` spells
  // `LIMIT` while saying that the cap is per claim, and
  // `Open Run` spells both the words its own entry requires while
  // saying why a row is opened against every claimed unit. Take
  // any of those clauses out and its entry does report the phrase
  // missing, but only because the reduction drops comments before
  // it reads a word, and the run-opening entry rests on the strip
  // on both halves, so with it gone no edit to that statement
  // would make the entry report. The other six do not, the two
  // over the bound columns among them, no statement here naming a
  // bound anywhere but in the expression that applies it.
  // Measured over the built statements, entry by entry.
  {
    id: 'topic-claim-skips-locked',
    property:
      'Claims a due topic by locking its row and stepping past ' +
      'one another transaction already holds, so two ticks ' +
      'overlapping divide the backlog rather than racing for ' +
      'the same rows.',
    nodeName: 'Claim Due Topics',
    requires: ['FOR UPDATE SKIP LOCKED'],
  },
  {
    id: 'topic-claim-oldest-first',
    property:
      'Takes the topics whose due time passed longest ago, so ' +
      'what a capped claim leaves behind is the rows that have ' +
      'waited least.',
    nodeName: 'Claim Due Topics',
    requires: ['ORDER BY next_run_at'],
  },
  {
    id: 'topic-claim-capped',
    property:
      'Takes a bounded number of topics however many came due, ' +
      'so what a tick sets in motion is settled by the cap and ' +
      'not by the size of the backlog.',
    nodeName: 'Claim Due Topics',
    requires: ['LIMIT'],
  },
  // The same three properties against the other schedulable
  // table, and the sentences repeat because the properties do.
  // Nothing here lets one entry cover both nodes: an entry names
  // a single node, which is what keeps a failure pointing at one
  // statement to open. What that buys is a report a shared entry
  // could not give — a property dropped from one claim and not
  // the other names the branch it went missing from.
  {
    id: 'export-claim-skips-locked',
    property:
      'Claims a due export subscription by locking its row and ' +
      'stepping past one another transaction already holds, so ' +
      'two ticks overlapping divide the backlog rather than ' +
      'racing for the same rows.',
    nodeName: 'Claim Due Export Subscriptions',
    requires: ['FOR UPDATE SKIP LOCKED'],
  },
  {
    id: 'export-claim-oldest-first',
    property:
      'Takes the subscriptions whose due time passed longest ' +
      'ago, so what a capped claim leaves behind is the rows ' +
      'that have waited least.',
    nodeName: 'Claim Due Export Subscriptions',
    requires: ['ORDER BY next_run_at'],
  },
  {
    id: 'export-claim-capped',
    property:
      'Takes a bounded number of subscriptions however many ' +
      'came due, so what a tick sets in motion is settled by ' +
      'the cap and not by the size of the backlog.',
    nodeName: 'Claim Due Export Subscriptions',
    requires: ['LIMIT'],
  },
  // The reschedule folded into each of those two statements, so
  // two more entries and no third node to name. Claim and
  // reschedule are one statement on purpose — the lock the claim
  // takes has to hold until the new due time is written — which
  // leaves each claim node carrying four properties at once, told
  // apart by what they require rather than by where they are
  // read.
  //
  // Each requires the two bound COLUMNS, both of them, and
  // nothing of the expression over them. A reschedule that
  // dropped the bounds names neither and is reported; one that
  // floors and forgets to cap names one and is reported too,
  // `requires` being all of its fragments rather than any. The
  // column words are what the reduction leaves whole, so neither
  // fragment is carried by the `interval_seconds` beside them.
  //
  // What an entry deliberately does not report is a clamp naming
  // both columns and applying them wrongly, argued in the header
  // and answered by `clampIntervalSeconds` in
  // `src/lib/schedule.ts` with the live seam behind it. What it
  // cannot report at all is WHERE in the statement a word sat: a
  // bound column pulled into the claim's own SELECT and never
  // used to move `next_run_at` would carry the fragment, the
  // reduction being over one statement whole and a node running
  // one.
  {
    id: 'topic-reschedule-clamped',
    property:
      'Moves a claimed topic to a due time one interval away, ' +
      'with that interval held inside the bounds the row ' +
      'carries, so a proposal made outside them is not what the ' +
      'next tick waits on.',
    nodeName: 'Claim Due Topics',
    requires: ['min_interval_seconds', 'max_interval_seconds'],
  },
  {
    id: 'export-reschedule-clamped',
    property:
      'Moves a claimed export subscription to a due time one ' +
      'interval away, with that interval held inside the bounds ' +
      'the row carries, so a proposal made outside them is not ' +
      'what the next tick waits on.',
    nodeName: 'Claim Due Export Subscriptions',
    requires: ['min_interval_seconds', 'max_interval_seconds'],
  },
  // The row the dispatcher opens against each claimed unit, and
  // the one entry here over a statement that writes rather than
  // one that reads. Two fragments for one property, the shape the
  // reschedule entries take: `scheduled_by` is what a statement
  // dropping the column stops carrying, and `interval` is the
  // literal written into it, which is what a statement keeping
  // the column and writing a null into it stops carrying. Both
  // are required, so either half going missing is reported and
  // the label says which half it was.
  //
  // That literal is the whole of what stands in for NOT NULL. A
  // word stream cannot say a column was written a value rather
  // than a null, so what the entry requires instead is the value
  // this statement writes — which is stricter than the property,
  // `runs.scheduled_by` admitting three. Deliberate rather than
  // convenient: this workflow reschedules in one mode and writes
  // that one literal for every row it opens, so an entry loosened
  // to the whole value set would widen a check nobody had decided
  // to widen.
  //
  // Neither fragment says WHERE its word sat, which is the limit
  // the reschedule entries state, met here by a pair rather than
  // by one phrase. A column named only in a RETURNING list still
  // carries the first fragment and is reported by the second; a
  // statement writing the literal into some other column carries
  // both and is reported by neither.
  //
  // Most of this the database refuses on its own — the column is
  // NOT NULL and a CHECK holds it to its three values — and the
  // entry stands in for neither. What it adds is when: nothing
  // has run this workflow, the stack that would import it
  // arriving in phase 7, so the refusal the database would give
  // is one no tick has ever reached.
  {
    id: 'run-open-attributed',
    property:
      'Opens the row for a claimed unit naming the schedule that ' +
      'fired it, so a pass running far more often than anyone ' +
      'meant it to stays attributable once the due time it fired ' +
      'against has been overwritten.',
    nodeName: 'Open Run',
    requires: ['scheduled_by', 'interval'],
  },
];

/**
 * The words `statement` runs: its prose gone, its punctuation and
 * its case flattened, one space between what is left.
 *
 * Three steps whose order matters, and a trim behind them. The
 * `--` comments go first, for the reason the header gives — this
 * port argues at length inside its statements, so the prose
 * explaining a property spells the property. The case fold comes
 * next, so a fragment need not be written in the statement's own
 * shouting. Everything a SQL word cannot carry goes last and
 * becomes a single space, which is what leaves a phrase matchable
 * whole: `t.min_interval_seconds` reduces to two words, so a
 * fragment naming the column is carried by a statement that
 * qualifies it, while `limit` stays uncarried by a statement
 * whose only run of those letters sits inside `unlimited`.
 *
 * Folded with `toLowerCase` and not its locale-aware twin, which
 * is a live question in this directory because
 * `loadBuiltWorkflows` next door sorts with `localeCompare`
 * deliberately. A fold is the one place that habit does not
 * belong: under a Turkish locale a capital I folds to a dotless
 * one and a fragment spelling a keyword stops being carried,
 * which would leave a suite answering differently on the machine
 * that ran it.
 *
 * The reduction is total and refuses nothing. A statement of
 * nothing but comments reduces to the empty string, which carries
 * no fragment and so leaves every entry over it unsatisfied — the
 * report a node whose statement was commented out ought to give.
 *
 * @param statement - One `query` a node carries, as
 *   {@link queryParametersOf} hands it back, or a fragment an
 *   entry requires. Both go through this, which is what lets an
 *   entry be written in the statement's own hand.
 * @returns Its words, space-separated, or the empty string.
 */
export function sqlWords(statement: string): string {
  return statement
    .replace(SQL_LINE_COMMENT, ' ')
    .toLowerCase()
    .replace(NOT_WORD_CHARACTERS, ' ')
    .trim();
}

/**
 * Whether `words` carries `fragment` whole.
 *
 * Both sides are already reduced, so both are runs of words with
 * one space between them and nothing else. Padding each with a
 * space makes the first and last word ordinary: a fragment is
 * carried when it sits between two separators, which at the ends
 * of the statement is the padding itself. That is the whole of
 * the word-boundary rule, done without a pattern built out of
 * the fragment — a fragment compiled into one is a fragment whose
 * own punctuation would have been read as syntax.
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
 * each carried by every statement ever written, so the entry
 * passes while asserting less than its own `property` line
 * claims. Nothing downstream reports it: a coverage guard holding
 * the entries a run reached against the roster counts such an
 * entry as covered, being an entry the run did reach.
 *
 * A plain `Error` rather than a class of its own, the split
 * `schema-sql.ts` draws next door: a class is what lets a case
 * pin a cause, and this is a malformed entry in a file every
 * entry is written in by hand rather than a state a caller drives
 * the roster into.
 *
 * @param rule - The entry to read.
 * @returns Its fragments, reduced the way a statement is.
 * @throws Error When it requires nothing, or requires a fragment
 * holding no word.
 */
function requiredWords(rule: DispatchSqlRule): readonly string[] {
  if (rule.requires.length === 0) {
    throw new Error(
      `Dispatch SQL entry ${rule.id} requires nothing of the SQL ` +
      `on ${rule.nodeName}, so it is satisfied by every statement ` +
      'and by no statement at all. Either give it the phrases ' +
      'that stand for its property or drop the entry: an entry ' +
      'that cannot fail still counts as one a run reached.',
    );
  }

  return rule.requires.map((required) => {
    const words = sqlWords(required);

    if (words === '') {
      throw new Error(
        `Dispatch SQL entry ${rule.id} requires a fragment holding ` +
        `no word, so every statement on ${rule.nodeName} carries ` +
        'it. A fragment is reduced the way a statement is, and ' +
        'comments, punctuation and whitespace are what the ' +
        'reduction drops — write the words the statement runs.',
      );
    }

    return words;
  });
}

/**
 * What `rule` finds wanting in `workflow`, as labels to read.
 *
 * The empty list is the passing answer, and everything else is a
 * `<id>: <what>` label naming one thing that did not hold. A list
 * rather than a boolean and labels rather than a record for the
 * reason `nodesMatching` gives: nothing in a mismatch here is a
 * thing to keep out of a log, so the label IS the report, an
 * assertion that the list is empty prints every offender on its
 * way past, and no case has to build a message of its own.
 *
 * Three shapes of label, and they are three different edits. A
 * node nothing on the canvas is named after says the entry names
 * a node that is gone. A named node running no SQL says the entry
 * names the wrong node — a sticky note, a merge — since the
 * reading answers empty for a node carrying no `query` and cannot
 * tell that from a node carrying one that is not a string. A
 * fragment not carried says the statement itself dropped the
 * property, which is the failure the entry exists for and the
 * only one of the three about the dispatcher rather than about
 * the roster.
 *
 * An absent node reports one label and not one per fragment,
 * because there is one edit to make and repeating it per phrase
 * would read as several properties lost at once.
 *
 * Every fragment is checked rather than stopping at the first
 * that fails, so a statement that dropped two says so in one
 * run.
 *
 * @param rule - The entry to hold `workflow` to.
 * @param workflow - The built workflow it names a node of,
 *   as `loadBuiltWorkflows` hands it back.
 * @returns One label per thing that did not hold, empty when the
 *   property holds.
 * @throws Error When the entry cannot fail, out of
 * {@link requiredWords}.
 */
export function unsatisfiedRequirements(
  rule: DispatchSqlRule,
  workflow: BuiltWorkflow,
): readonly string[] {
  const required = requiredWords(rule);
  const named = workflow.nodes.filter(
    (node) => node.name === rule.nodeName,
  );

  if (named.length === 0) {
    return [`${rule.id}: no node named ${rule.nodeName}`];
  }

  const statements = named
    .flatMap((node) => queryParametersOf(node))
    .map((query) => sqlWords(query));

  if (statements.length === 0) {
    return [`${rule.id}: ${rule.nodeName} runs no SQL`];
  }

  const missing = required.filter(
    (fragment) => !statements.some((sql) => carries(sql, fragment)),
  );

  return missing.map(
    (fragment) => `${rule.id}: ${rule.nodeName} runs no SQL ` +
      `carrying ${fragment}`,
  );
}
