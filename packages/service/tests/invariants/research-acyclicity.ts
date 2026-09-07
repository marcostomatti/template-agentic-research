/**
 * @packageDocumentation
 * The tables a research answer must not be written back into, the
 * reading that finds a statement writing one of them, and the
 * reading that tells a lookup into `entity_research` apart from an
 * anti-join over it.
 *
 * The rule these parts serve: no statement that INSERTs into
 * `documents`, `findings` or `research_pool` reads
 * `entity_research`, allowing a read that sits inside a
 * `NOT EXISTS` subquery. What it rules out is a cycle. A capture or
 * an ingest writes documents, findings are derived from those
 * documents, a finding raises an intention into the pool, an
 * approved intention is drained and answered, and the answer lands
 * in `entity_research` — one direction at every step. A statement
 * writing any of the three upstream tables out of the answers
 * already recorded would close that loop, and a pipeline whose
 * output is its own input has no bound on what it produces that
 * anybody wrote down.
 *
 * THE RULE IS INSERT-SHAPED AND NOT MENTION-SHAPED, which is the
 * decision the rest of this file follows from. Reading
 * `entity_research` is ordinary and several modules do it: the
 * entities store pages a subject's passes and counts them, the
 * findings store answers the research recorded against a finding,
 * and the wave-3 MCP surface exposes the list. The entities store
 * also writes `research_pool`, in the approve stamp. So a rule over
 * modules that name the table would be red on arrival against a
 * module doing exactly what it was built to do, and the only ways
 * to green it are an exemption list that grows with every reader or
 * a narrowing that stops covering the writers. What actually
 * carries the acyclicity claim is narrower and stays true as
 * readers arrive: a read is harmless until it feeds a write into
 * one of the three tables the answers were derived from, and a
 * write is one statement.
 *
 * A STATEMENT IS THE UNIT for the same reason. Postgres lets a
 * data-modifying CTE read one relation and write another in one
 * pass, which is how the derivation edge would actually be written
 * — a `WITH` naming `entity_research` and an `INSERT` beneath it —
 * and it is the one arrangement where the read and the write are
 * provably the same operation. Two statements that happen to run in
 * the same node are two decisions, and a reading over a file could
 * not say which.
 *
 * WHY AN ANTI-JOIN IS ALLOWED. A read inside `NOT EXISTS` can only
 * REMOVE rows from what the insert writes. Nothing it selects
 * reaches a column, a value or a row count that would not have been
 * written without it; the subquery decides whether a candidate the
 * statement already had survives. So it carries no derivation edge
 * in the direction the rule is about, and refusing it would refuse
 * the one lookup this schema actively points a writer at:
 * `research_pool.researched_at` in `src/db/schema/entities.ts`
 * argues its own semantics by naming a subject that
 * `entity_research` shows was researched recently enough. A rule
 * that fenced off the freshness guard its own schema recommends is
 * a rule somebody argues with rather than one they obey, and the
 * argument would be won by deleting the rule.
 *
 * THE ALLOWANCE HAS NO LIVE SUBJECT, and that is worth stating
 * where it can be read rather than discovered. Measured over the
 * workflow sources when this landed: six statements INSERT into a
 * rostered table, no statement reads `entity_research` at all, and
 * the one statement naming that table names it as the target of its
 * own INSERT. So every allowance case rests on a planted sample in
 * the suite. The span walk beneath the allowance has a live
 * subject of a kind — four `NOT EXISTS` subqueries across the
 * built tree, three of them over `research_pool` and the fourth
 * over a CTE, none over `entity_research` — and not one of them
 * is visible in an answer:
 * {@link classifyResearchReads} over a raise statement walks that
 * span and reports an empty list, no read sitting inside it. So
 * both halves of the allowance rest on the plants, and
 * {@link derivationEdges} does not reach the classifier over this
 * tree at all, an edge needing a statement that both writes
 * upstream and reads the table.
 *
 * TWO READINGS, AND THEY ARE NOT INTERCHANGEABLE. The two
 * detectors judge a statement reduced by `sqlWords` — prose gone,
 * case folded, punctuation flattened — which is what makes a phrase
 * matchable whole and what keeps the paragraphs this port argues
 * inside its own statements from answering for the statement. The
 * classifier cannot use that reduction at all: the parentheses it
 * drops ARE the anti-join, and a word stream reading
 * `not exists select 1 from entity_research` says nothing about
 * where the subquery ended. So the classifier strips the same
 * comments and folds the same case, and keeps everything else.
 *
 * The word reading is the WIDER of the two, which is why it is the
 * gate. Every occurrence the classifier finds is an occurrence in
 * comment-stripped text that a word split leaves whole, so the
 * detector finds it too; the reverse does not hold, the classifier
 * declining to look inside a quoted literal. A statement the word
 * reading finds nothing in is one the structural walk would find
 * nothing in either, and skipping it costs nothing.
 *
 * WHAT THIS CANNOT SEE, each named so a later widening is a
 * decision rather than a discovery.
 *
 * A drizzle builder call is not an INSERT this reading can find.
 * `getDb().insert(researchPool)` names a TypeScript binding and no
 * SQL word, so the claim over `src/` is a claim about SQL TEXT
 * under that tree and not about every way a module can write a row.
 * It holds today by measurement rather than by construction: over
 * the whole of `src/`, no file carries an `INSERT INTO` naming a
 * rostered table in any casing, in code or in prose. The day one
 * writes that row through the builder instead, this reading passes
 * it. Closing that is a second detector over the builder spelling,
 * which is a widening with its own reasons to state.
 *
 * The insert target has to be the bare table name. A schema
 * qualifier or an `ONLY` between the keyword and the table leaves a
 * word stream this roster does not match, and the failure direction
 * is BLINDNESS rather than a false finding — the shape worth
 * knowing about a needle nobody re-runs.
 *
 * An `INSERT INTO entity_research ... RETURNING` feeding an
 * upstream insert in the same statement is not reported. The target
 * of an INSERT is excluded from what counts as a read, deliberately
 * — the one statement that records a pass would otherwise report
 * itself — and the cost is that a write-and-return on that table is
 * invisible where an `UPDATE` or a `DELETE ... RETURNING` on it is
 * counted. Nothing in this port writes that shape and the exclusion
 * is one line, so it is a gap to widen the day it has a subject.
 *
 * A `--` inside a string literal is read as the start of a comment,
 * by both readings, because the comment strip runs before anything
 * knows what a literal is. Inherited from `sqlWords` next door and
 * true of every entry in `dispatch-sql.ts`; the direction is
 * blindness again, the rest of that line being dropped. Dollar
 * quoting is not tracked at all, no statement in this port using
 * it.
 *
 * Over `src/` the failure direction inverts and is worth stating
 * separately: `sqlWords` knows only SQL comments, so a TypeScript
 * comment and a TypeScript string literal both reduce to words. A
 * module whose prose spells `insert into findings` reads as a
 * statement that does. That is a FALSE FINDING rather than a hole,
 * which is the direction a scan can be argued out of, and the
 * repair is the same either way: the module says what it does and a
 * reader opens it.
 *
 * The register row this answers to belongs in
 * `docs/architecture/01-invariants.md`, beside the send-free entry.
 * Kept apart from the assertions the way `exports-send-free.ts` and
 * `dispatch-sql.ts` are, and for their reason: a `.test.ts` sits
 * outside the program `tsc` reads, so a roster written into one is
 * a roster nothing type-checks, and a case can ask this one
 * questions rather than assume it.
 */

import { sqlWords } from './dispatch-sql.js';

/**
 * A SQL line comment, from its dashes to the end of its line.
 *
 * The same needle `sqlWords` applies, declared again rather than
 * shared: it is module-private next door, and exporting it to save
 * a line would widen that file's surface for a caller that needs
 * the comment strip WITHOUT the rest of the reduction. Global and
 * used only with `replace`, which resets `lastIndex`.
 *
 * Never matches a newline, which is what lets the classifier report
 * a line number off the stripped text: a comment collapses to a
 * space and the line it sat on stays where it was.
 */
const SQL_LINE_COMMENT = /--[^\n]*/gu;

/**
 * The one quote that opens a string literal here.
 *
 * Single only. A double-quoted identifier is read as CODE on
 * purpose: `"entity_research"` is a read of the table, and a
 * scanner that skipped it would be blind to the one spelling a
 * writer reaches for when a name needs quoting. What that costs is
 * a parenthesis inside a quoted identifier being counted, which is
 * a name nobody writes.
 */
const STRING_QUOTE = '\'';

/**
 * The table the rule refuses to see read into an upstream write.
 *
 * One table and not a roster, because the direction is what makes
 * the rule: these are the rows a research pass produced, and the
 * three upstream tables are the rows it was produced from.
 */
export const RESEARCH_TABLE = 'entity_research';

/**
 * {@link RESEARCH_TABLE} as a whole word, as regex source.
 *
 * Source rather than a compiled instance, for the reason
 * `SendReachRule.source` gives next door: the needle matches
 * globally, and a shared global `RegExp` carries `lastIndex` from
 * one call into the next — a scan that passes and fails alternately
 * over unchanged input. Every caller compiles its own.
 *
 * The guards are what keep a column name out. `entity_research_id`
 * is one word to both readings, and a needle without them would
 * report a foreign key as a read of the table it points at.
 * Lowercase only, both readings folding case before they match.
 */
const RESEARCH_TABLE_SOURCE =
  `(?<![a-z0-9_])${RESEARCH_TABLE}(?![a-z0-9_])`;

/**
 * The head of an anti-join: the two keywords and the parenthesis
 * that opens the subquery they govern.
 *
 * Whitespace-tolerant between all three, because the statements
 * here put the parenthesis on the keywords line and the `SELECT` on
 * the next. What it does NOT tolerate is a comment between the
 * keywords, which the strip has already turned into a space by the
 * time this runs.
 *
 * The parenthesis is part of the match rather than looked for
 * afterwards, so the span walk starts from an offset the match
 * itself supplies rather than from a search that could land on a
 * different one.
 */
const ANTI_JOIN_SOURCE = 'not\\s+exists\\s*\\(';

/**
 * What sits immediately before a table name that is being written
 * rather than read.
 *
 * Applied to the text BEFORE an occurrence, which is what makes it
 * an anchor at the end rather than a search. Whitespace-tolerant so
 * one needle serves both readings: the reduced stream separates its
 * words with exactly one space and the stripped text keeps whatever
 * the statement had.
 *
 * Not global, so `test` is safe to call on it repeatedly — a global
 * instance would carry `lastIndex` between occurrences and answer
 * differently for the same text.
 */
const INSERT_TARGET_TAIL = /insert\s+into\s+$/u;

/** One table a research answer must not be written back into. */
export interface UpstreamTable {
  /**
   * The table as SQL spells it, and what the detector matches.
   * Lowercase, `sqlWords` folding case before anything is compared.
   */
  readonly table: string;

  /**
   * What a cycle through this table would be, written as what it
   * costs rather than as a description of the table.
   *
   * Written as a difference for the reason `SendReachRule.reason`
   * is: three tables sit in one roster because they are three
   * distinct loops, and an entry that cannot say which loop it
   * closes is one another entry already covers.
   */
  readonly reason: string;
}

/**
 * The three tables upstream of a research answer.
 *
 * Every step the pipeline takes from a capture to a recorded pass
 * writes one of these, and every one of them is written from
 * something that came before it. `entity_research` is the end of
 * that run and is deliberately NOT a member: a statement writing it
 * from a read of it is a second row about one subject, which is
 * what that table accumulates by design.
 *
 * `entities` is not a member either, and the reason is measurement
 * rather than principle — no statement in this port inserts into
 * it, so an entry over it would be a needle with nothing to fail
 * on and no near neighbour to prove it live. It joins the roster
 * the day a workflow writes it.
 *
 * Written out whole rather than assembled from fragments. These are
 * table names this repository spells everywhere on purpose, and
 * `tests/` is not a tree any de-origination scan roots at, so
 * nothing is served by hiding them from a reader of this file.
 */
export const UPSTREAM_TABLES: readonly UpstreamTable[] = [
  {
    table: 'documents',
    reason:
      'A document written out of a recorded answer is a source the ' +
      'pipeline authored for itself. The next ingest pass reads it ' +
      'as evidence and the pass after that reads what it produced ' +
      'as corroboration, with nothing in the store saying which of ' +
      'them came from outside.',
  },
  {
    table: 'findings',
    reason:
      'A finding derived from a recorded answer raises its own ' +
      'intention, which is approved, drained and answered, which ' +
      'derives the next finding. The shortest of the three loops ' +
      'and the only one that spends a model call on every turn.',
  },
  {
    table: 'research_pool',
    reason:
      'An intention raised out of the answers already recorded is a ' +
      'queue that refills itself. The repeat guard on that table is ' +
      'per finding, so a loop that raises against a new finding ' +
      'each turn is never the row the guard refuses.',
  },
];

/**
 * Thrown when the readings were handed nothing to read.
 *
 * The failure this catches is the one a scan of this shape cannot
 * report any other way. Its passing answer is an empty list of
 * edges, and a caller whose workflow directory was renamed, whose
 * node filter matched nothing, or whose walk was pointed at the
 * wrong tree hands over an empty list and is told the same thing:
 * no derivation edge. Nothing in the result parts them, so the
 * reading declines to give one.
 *
 * Two shapes reach it and they are one fact — nothing was handed
 * over, or everything handed over reduced to no word at all. The
 * second is this reading's own and no caller reports it: a node
 * whose statement is entirely comments, or a `query` that is an
 * empty string, is a statement the detectors would have found
 * nothing in whatever it said.
 *
 * A distinct class rather than a bare `Error`, so a case can pin
 * the refusal to this cause. `EmptyExportSurfaceError` next door is
 * the precedent and the reason is its: a caller can fail for
 * several reasons and an assertion accepting any `Error` passes for
 * the wrong one.
 */
export class EmptyStatementSurfaceError extends Error {
  /**
   * How many statements were handed over, carried so a failure
   * parts the two shapes without a reader going to look. Zero says
   * the caller collected nothing; anything else says what it
   * collected carried no SQL.
   */
  readonly handed: number;

  /**
   * @param handed - Length of the list the reading was given,
   *   before any of it was reduced.
   */
  constructor(handed: number) {
    super(
      `Acyclicity reading was handed ${handed} statement(s), of ` +
      'which none carries a SQL word. A reading that read nothing ' +
      'answers exactly what a clean tree answers, so it refuses ' +
      'rather than report a zero it did not earn: either the ' +
      'collection is pointed at the wrong tree, or the nodes it ' +
      'selected run no SQL.',
    );
    this.name = this.constructor.name;
    this.handed = handed;
  }
}

/** One statement to read, and where the caller found it. */
export interface ResearchStatement {
  /**
   * Where the statement came from, exactly as the caller names it.
   *
   * Carried rather than derived, the readings never opening a file
   * or a workflow: its only job is to let a failure say which
   * statement to go and open. A workflow caller writes the artifact
   * and the node it was read off; a caller walking `src/` writes
   * the path.
   */
  readonly origin: string;

  /**
   * The statement itself, verbatim — comments, casing, whitespace
   * and all.
   *
   * Verbatim and not pre-reduced, because the two readings need
   * different amounts of it: the detectors want the word stream and
   * the classifier wants the parentheses. Handing a reduced
   * statement in is harmless for the detectors, `sqlWords` being
   * idempotent, and would silently blind the classifier — which is
   * the whole of why nothing here takes a reduced statement as its
   * argument.
   */
  readonly statement: string;
}

/** One read of {@link RESEARCH_TABLE}, as the classifier sees it. */
export interface ResearchRead {
  /**
   * 1-based line within the statement, so the pair
   * `<node>:<line>` means what it does in an editor.
   *
   * Counted over the comment-stripped text rather than the
   * original, which is the same number: the strip replaces a
   * comment with a space and never crosses a line ending.
   */
  readonly lineNumber: number;

  /**
   * Whether this read sits inside a `NOT EXISTS` subquery, and so
   * whether the allowance covers it.
   *
   * The whole of the classification, and the reason the classifier
   * answers a record per read rather than a boolean per statement:
   * a statement carrying one guarded read and one bare read is a
   * finding, and an answer collapsed to `every` could not say which
   * line to open.
   */
  readonly antiJoined: boolean;
}

/** One statement that writes upstream out of a research read. */
export interface DerivationEdge {
  /** `origin` of the statement, exactly as the caller named it. */
  readonly origin: string;

  /**
   * Which rostered tables the statement INSERTs into, in roster
   * order. More than one is possible and is not an error: a
   * statement writing two of them out of one read closes two loops.
   */
  readonly tables: readonly string[];

  /**
   * The reads the allowance does not cover, one record each.
   *
   * Only the bare ones. A statement is reported for the reads that
   * make it a finding, so a failure lists the lines to change and
   * not the anti-join beside them that was always fine.
   */
  readonly reads: readonly ResearchRead[];
}

/**
 * Which rostered tables `statement` INSERTs into, in roster order.
 *
 * Judged over the `sqlWords` reduction, which the function applies
 * itself rather than trusting a caller to have applied — the
 * reduction is idempotent, so a caller that already reduced loses
 * nothing, and a caller that did not is spared a reading that would
 * otherwise have matched the prose. That matters here more than the
 * convenience: every statement in this port carries paragraphs
 * explaining what it writes and what the statement beside it
 * writes, so a needle over unreduced text would answer for the
 * argument rather than for the SQL.
 *
 * Padded on both sides and matched whole, so the table name is
 * carried by `INSERT INTO research_pool (domain_id, ...)` and not
 * by a longer word beginning with it.
 *
 * The bare table name only. A schema qualifier or an `ONLY` between
 * the keyword and the name is a statement this reading does not
 * match, argued in the header where the gap belongs.
 *
 * @param statement - One statement, verbatim.
 * @returns The rostered tables it writes, in roster order, empty
 *   when it writes none of them.
 */
export function insertedUpstreamTables(
  statement: string,
): readonly string[] {
  const words = ` ${sqlWords(statement)} `;

  return UPSTREAM_TABLES
    .filter((entry) => words.includes(` insert into ${entry.table} `))
    .map((entry) => entry.table);
}

/**
 * Whether `statement` reads {@link RESEARCH_TABLE} at all.
 *
 * The cheap half of the pair and the gate the structural walk sits
 * behind. Judged over the same reduction as the detector above, so
 * it reads no prose, and it is the WIDER of the two readings — an
 * occurrence the classifier would find is one a word split leaves
 * whole, while an occurrence inside a quoted literal is one only
 * this reading sees. A statement this answers `false` for is one
 * the classifier would find nothing in.
 *
 * The target of an INSERT is not a read. The statement that records
 * a pass names the table as what it writes, and counting that would
 * make the one writer report itself while saying nothing about any
 * derivation. An `UPDATE` or a `DELETE ... RETURNING` over the
 * table IS counted, those being reads whose rows can feed whatever
 * is written beneath them in the same statement.
 *
 * @param statement - One statement, verbatim.
 * @returns Whether any occurrence is something other than the
 *   target of an INSERT.
 */
export function readsResearchTable(statement: string): boolean {
  const words = sqlWords(statement);
  const needle = new RegExp(RESEARCH_TABLE_SOURCE, 'gu');

  return [...words.matchAll(needle)].some(
    (match) => !INSERT_TARGET_TAIL.test(words.slice(0, match.index)),
  );
}

/**
 * Whether each character of `text` sits inside a string literal.
 *
 * One flag per character, so a caller asks about an offset it
 * already has rather than re-deriving one. The quotes themselves
 * are flagged with what they delimit, the way `commentFlagLines` in
 * `exports-send-free.ts` treats a comment marker.
 *
 * The doubled quote SQL escapes a quote with needs no case of its
 * own: `'don''t'` closes at the second quote and reopens at the
 * third, so the characters between the pair — there are none — are
 * the only thing read as code, and everything a caller asks about
 * lands where it should.
 *
 * Provably advancing on every branch, which a hand-rolled scanner
 * here owes: the index is the loop counter and no branch touches
 * it.
 */
function stringFlags(text: string): readonly boolean[] {
  const flags: boolean[] = [];
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const isQuote = text.charAt(index) === STRING_QUOTE;

    flags.push(quoted || isQuote);

    if (isQuote) {
      quoted = !quoted;
    }
  }

  return flags;
}

/** Half-open character range of one subquery within a statement. */
interface Span {
  /** Offset of the opening parenthesis. */
  readonly start: number;
  /** Offset of the parenthesis that closes it. */
  readonly end: number;
}

/**
 * Where the subquery opened at `open` ends.
 *
 * A depth walk rather than a search for the next parenthesis,
 * because an anti-join over this schema nests. Measured over the
 * built tree: the interval guard in `ar-ingest`'s raise carries
 * `extract(epoch FROM now() - p.researched_at)` inside its own
 * predicate, so the first `)` closes that call and not the
 * subquery. The other three anti-joins there nest nothing, so
 * that guard is the walk's one live subject and every other span
 * would come out the same under a search for the next
 * parenthesis.
 *
 * An unbalanced statement answers a span running to the end of the
 * text. Deliberate, and the direction is the safe one: a statement
 * missing a parenthesis does not parse, so nothing can run it, and
 * a span that swallows the rest reports its reads as guarded rather
 * than reporting a finding nobody can act on.
 *
 * Characters inside a string literal are stepped over, so a
 * parenthesis in a literal does not move the depth.
 */
function spanFrom(
  text: string,
  flags: readonly boolean[],
  open: number,
): Span {
  let depth = 0;

  for (let index = open; index < text.length; index += 1) {
    if (flags[index] === true) {
      continue;
    }

    const char = text.charAt(index);

    if (char === '(') {
      depth += 1;
      continue;
    }

    if (char === ')') {
      depth -= 1;

      if (depth === 0) {
        return { start: open, end: index };
      }
    }
  }

  return { start: open, end: text.length };
}

/**
 * Every anti-join subquery in `text`, as spans.
 *
 * A head found inside a string literal is dropped: a statement
 * carrying the keywords in a quoted value opens no subquery, and a
 * span taken from one would cover whatever followed.
 *
 * The offset handed to {@link spanFrom} is the parenthesis the head
 * match ends on, which is why the head pattern includes it.
 */
function antiJoinSpans(
  text: string,
  flags: readonly boolean[],
): readonly Span[] {
  const heads = new RegExp(ANTI_JOIN_SOURCE, 'gu');

  return [...text.matchAll(heads)]
    .filter((head) => flags[head.index] !== true)
    .map((head) => spanFrom(
      text,
      flags,
      head.index + head[0].length - 1,
    ));
}

/**
 * Every read of {@link RESEARCH_TABLE} in `statement`, each said to
 * be inside a `NOT EXISTS` subquery or not.
 *
 * The structural half of the pair, and the one reading `sqlWords`
 * cannot give: the reduction drops parentheses, and the
 * parentheses are the anti-join. So the comments are stripped and
 * the case is folded — the two steps the readings share — and
 * everything else is kept.
 *
 * A read is inside a span when its offset sits strictly between the
 * two parentheses. Strictly, so a table name cannot be the
 * delimiter of the span it is judged against.
 *
 * Takes content and never a path, which is the seam that makes the
 * classification testable: a planted statement is a string, with no
 * fixture file to write and no workflow to build. That matters more
 * here than next door, the allowance having no live subject in this
 * tree for a case to read.
 *
 * Results come back in statement order, ascending by offset.
 *
 * @param statement - One statement, verbatim.
 * @returns One record per read, empty when the statement reads the
 *   table only as the target of an INSERT or not at all.
 */
export function classifyResearchReads(
  statement: string,
): readonly ResearchRead[] {
  const text = statement.replace(SQL_LINE_COMMENT, ' ').toLowerCase();
  const flags = stringFlags(text);
  const spans = antiJoinSpans(text, flags);
  const needle = new RegExp(RESEARCH_TABLE_SOURCE, 'gu');

  return [...text.matchAll(needle)]
    .filter((match) => flags[match.index] !== true)
    .filter((match) => !INSERT_TARGET_TAIL.test(
      text.slice(0, match.index),
    ))
    .map((match) => ({
      lineNumber: text.slice(0, match.index).split('\n').length,
      antiJoined: spans.some(
        (span) => span.start < match.index && match.index < span.end,
      ),
    }));
}

/**
 * Every derivation edge in `statements`, one record per statement.
 *
 * An edge is a statement that INSERTs into a rostered table AND
 * reads {@link RESEARCH_TABLE} somewhere the allowance does not
 * cover. Both halves are required, which is the rule stated in one
 * line: a read on its own is what most of this service does, and a
 * write on its own is the pipeline running forwards.
 *
 * The empty list is the passing answer and every other answer is a
 * finding, so nothing here builds a message. A failing case asserts
 * the list is empty and prints the records on its way past, each
 * naming a statement to open, the tables it writes and the lines
 * that read.
 *
 * The three readings run in the order that costs least: the word
 * detector for the write, the word detector for the read, then the
 * structural walk only where both answered. The middle one is
 * redundant against the walk and skipping it would change no
 * answer — it is there because it is the cheap reading and because
 * it is the wider one, so a statement it clears is one the walk
 * would clear too.
 *
 * @param statements - What the caller collected, in whatever order
 *   it collected them.
 * @returns One record per statement carrying an edge, in the order
 *   the statements were handed over, empty when none does.
 * @throws EmptyStatementSurfaceError When nothing was handed over,
 * or when nothing handed over carries a SQL word.
 */
export function derivationEdges(
  statements: readonly ResearchStatement[],
): readonly DerivationEdge[] {
  const carrying = statements.filter(
    (subject) => sqlWords(subject.statement) !== '',
  );

  if (carrying.length === 0) {
    throw new EmptyStatementSurfaceError(statements.length);
  }

  return carrying.flatMap((subject) => {
    const tables = insertedUpstreamTables(subject.statement);

    if (tables.length === 0 || !readsResearchTable(subject.statement)) {
      return [];
    }

    const bare = classifyResearchReads(subject.statement)
      .filter((read) => !read.antiJoined);

    return bare.length === 0
      ? []
      : [{ origin: subject.origin, tables, reads: bare }];
  });
}
