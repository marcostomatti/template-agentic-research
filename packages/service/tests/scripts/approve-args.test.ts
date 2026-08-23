/**
 * What `parseApproveArgs` refuses, what it says when it does, and
 * what it makes of the three command lines it reads.
 *
 * Four command lines, one per way arguments can name nothing this
 * tool can run: no command at all, a word that is none of the three,
 * a ruling with no row after it, and a ruling followed by something
 * that is not a row id.
 *
 * Each is pinned to the whole first line of its own refusal rather
 * than to the fact that one was thrown. The parser refuses several
 * different things, so a case reading only that something came back
 * passes for any of them — which is what lets one guard quietly
 * absorb a neighbour's input. Nor is the quoted word enough on its
 * own: two of these refusals quote what was typed, and so does the
 * one over an id past the largest this reads exactly, so a case
 * pinned at the value alone cannot tell them apart. The sentence is
 * the discriminator, and it is also the whole of what an operator
 * sees, so rewording one is meant to redden the case that owns it.
 *
 * The usage line every refusal closes with is asserted apart from
 * them and over all four at once. `ApproveArgsError` appends it
 * rather than each message carrying it, so it is one claim about the
 * class and not four about the parser — and holding it inside each
 * case would make rewording it a failure in four places that are not
 * about it.
 *
 * The three it reads are pinned whole — the word it matched and
 * whatever the command carries beside it — rather than at the word
 * alone. Every refusal above is equally satisfied by a parser that
 * refused whatever it was handed, and those three cases are the only
 * thing here that would report one.
 */
import { describe, expect, it } from 'vitest';

import { ApproveArgsError, parseApproveArgs } from '../../scripts/approve.js';

// ---------------------------------------------------------------------------
// The command lines these cases hand it to refuse
// ---------------------------------------------------------------------------

/**
 * A word none of the three commands is spelled as.
 *
 * Nothing's misspelling, deliberately. A near miss like `approv`
 * would be refused as well, but by a parser that had grown a
 * charitable prefix match it would be refused for some other reason
 * or not at all, and the case would read the same either way.
 */
const UNKNOWN_COMMAND = 'frobnicate';

/**
 * What follows `approve` in the case about an id it cannot read.
 *
 * `12abc` rather than a word carrying no digits, because it is the
 * value the pattern in `scripts/approve.ts` was narrowed for:
 * `parseInt` reads it as a row id nobody typed. A fixture of `zzz`
 * is refused by that narrow pattern and by a lenient parser alike,
 * so a case built on one would say nothing about the narrowing it is
 * there to hold.
 */
const NON_NUMERIC_ID = '12abc';

/**
 * The row a lenient reading of {@link NON_NUMERIC_ID} names.
 *
 * Asserted below rather than left as a remark in this comment. It is
 * a fact about the runtime and not about this package, which is
 * exactly why the fixture needs it pinned: a value changed here that
 * no lenient parser would have accepted leaves every refusal case
 * green while none of them is about the hazard any more.
 */
const LENIENTLY_PARSED_ROW = 12;

/** A command line with no command on it at all. */
const NO_COMMAND_ARGV: readonly string[] = [];

/** A command line naming a command this tool does not run. */
const UNKNOWN_COMMAND_ARGV: readonly string[] = [UNKNOWN_COMMAND];

/** A ruling with nothing after it to rule on. */
const NO_ROW_ID_ARGV: readonly string[] = ['approve'];

/** A ruling followed by something that is not a row id. */
const NON_NUMERIC_ID_ARGV: readonly string[] = ['approve', NON_NUMERIC_ID];

/**
 * The four above, in the order the cases below take them.
 *
 * Built from the same constants rather than typed out again, so the
 * usage case sweeps the inputs the other cases used. A second list
 * of them could drift from the first, and the drift would show as
 * the usage claim holding for command lines nothing else refuses.
 */
const REFUSED_ARGUMENTS: readonly (readonly string[])[] = [
  NO_COMMAND_ARGV,
  UNKNOWN_COMMAND_ARGV,
  NO_ROW_ID_ARGV,
  NON_NUMERIC_ID_ARGV,
];

// ---------------------------------------------------------------------------
// What each of them is refused with
// ---------------------------------------------------------------------------

/** What a command line carrying no command is refused with. */
const NO_COMMAND_PROBLEM = 'no command given';

/** What a command line naming an unrunnable command is refused with. */
const UNKNOWN_COMMAND_PROBLEM = `unknown command '${UNKNOWN_COMMAND}'`;

/** What a ruling with no row after it is refused with. */
const NO_ROW_ID_PROBLEM = 'approve names no row id';

/** What a ruling whose id is not one is refused with. */
const NON_NUMERIC_ID_PROBLEM =
  `approve was given '${NON_NUMERIC_ID}', which is not a row id: ` +
  'an id is digits, from 1 upward, unpadded';

/**
 * How the commands are spelled, as every refusal closes by saying.
 *
 * Written out here rather than imported: the parser holds it as a
 * module constant, and a test comparing that constant against itself
 * would pass for any spelling it drifted into. Two hand-written
 * declarations are the only arrangement where comparing them says
 * anything.
 */
const USAGE_LINE = 'usage: list | approve <id> | reject <id>';

// ---------------------------------------------------------------------------
// The command lines it reads, and what each one comes back as
// ---------------------------------------------------------------------------

/**
 * The row both rulings below are about.
 *
 * Written out separately from the argument spelling it rather than
 * derived from it: text on the command line and a number in the
 * command is the difference those two cases are about, and deriving
 * either from the other would put the conversion under test on both
 * sides of its own assertion.
 */
const RULED_ROW_ID = 42;

/** How {@link RULED_ROW_ID} is spelled on a command line. */
const RULED_ROW_ARGUMENT = '42';

/** A command line asking for whatever is pending. */
const LIST_ARGV: readonly string[] = ['list'];

/** A command line approving one row. */
const APPROVE_ARGV: readonly string[] = ['approve', RULED_ROW_ARGUMENT];

/** A command line rejecting the same row. */
const REJECT_ARGV: readonly string[] = ['reject', RULED_ROW_ARGUMENT];

/**
 * What `list` comes back as: the word, carrying nothing else.
 *
 * That absence is half of what its case is for, and it is why the
 * three below compare with `toStrictEqual`. `toEqual` reads a key
 * present with an `undefined` value as absent, so a `list` handed
 * back as `{ command: 'list', id: undefined }` would satisfy it —
 * and that is a `list` a caller could switch over and find an id on.
 */
const LIST_COMMAND = { command: 'list' };

/** What `approve <id>` comes back as, for the row it named. */
const APPROVE_COMMAND = { command: 'approve', id: RULED_ROW_ID };

/** What `reject <id>` comes back as, for that same row. */
const REJECT_COMMAND = { command: 'reject', id: RULED_ROW_ID };

// ---------------------------------------------------------------------------
// Refusals
// ---------------------------------------------------------------------------

/**
 * Stands in for the message when the arguments parsed through.
 *
 * A sentinel rather than an empty string, so a case expecting a
 * refusal and handed a command says which happened in its own diff
 * instead of holding a sentence up against nothing.
 */
const NOT_REFUSED = '(nothing refused)';

/**
 * The message `parseApproveArgs` refused `argv` with, or
 * {@link NOT_REFUSED} when it returned a command.
 *
 * Only an `ApproveArgsError` counts as a refusal and anything else
 * is rethrown, which is where the class gets pinned as well: a
 * parser that had started throwing a `TypeError` over these inputs
 * would fail every case below with that error rather than pass them.
 *
 * @param argv - The arguments after the script name.
 * @returns The message it refused with, or the sentinel.
 */
function refusedMessage(argv: readonly string[]): string {
  try {
    parseApproveArgs(argv);
  } catch (thrown) {
    if (thrown instanceof ApproveArgsError) {
      return thrown.message;
    }

    throw thrown;
  }

  return NOT_REFUSED;
}

/**
 * The first line of that message: what is wrong with the arguments,
 * without the usage line following it.
 *
 * @param argv - The arguments after the script name.
 * @returns The refusal's opening line, or the sentinel.
 */
function refusedProblem(argv: readonly string[]): string {
  const [problem] = refusedMessage(argv).split('\n');

  // A split yields at least one entry for any string, so this
  // fallback never fires. It is the sentinel rather than an empty
  // string because a case that somehow reached it should read what
  // happened, not nothing.
  return problem ?? NOT_REFUSED;
}

/**
 * Everything that message said after its first line.
 *
 * A list rather than the joined remainder, so a refusal that grew a
 * second line is reported as the extra line instead of as a longer
 * string a reader has to diff by eye.
 *
 * @param argv - The arguments after the script name.
 * @returns The lines past the refusal's opening one.
 */
function refusedTail(argv: readonly string[]): readonly string[] {
  const [, ...tail] = refusedMessage(argv).split('\n');

  return tail;
}

// ---------------------------------------------------------------------------
// Command lines it cannot read
// ---------------------------------------------------------------------------

describe('parseApproveArgs — a command line naming nothing it runs', () => {
  // `argv` is what followed the script name, so an empty list is a
  // real input here rather than an impossible one: it is the command
  // run with no command at all. Nothing reads it charitably as
  // `list`, and this is the case where that shows.
  it('refuses an empty argument list', () => {
    expect(refusedProblem(NO_COMMAND_ARGV)).toBe(NO_COMMAND_PROBLEM);
  });

  // The word is quoted back rather than described, and that is what
  // separates this refusal from the two below: both of those are
  // about what followed a command the tool does run.
  it('refuses a command it does not run, quoting the word', () => {
    expect(refusedProblem(UNKNOWN_COMMAND_ARGV)).toBe(UNKNOWN_COMMAND_PROBLEM);
  });
});

describe('parseApproveArgs — a ruling that names no row it can act on', () => {
  // A ruling with nothing after it is the one refusal here that
  // quotes nothing, because there is nothing that was typed to quote
  // — which is also why it names the ruling instead.
  it('refuses a ruling with no row id after it', () => {
    expect(refusedProblem(NO_ROW_ID_ARGV)).toBe(NO_ROW_ID_PROBLEM);
  });

  // The guard that keeps the case below about the hazard the pattern
  // was narrowed for. It reads as testing the runtime, and that is
  // the point: what makes this fixture worth refusing is that one of
  // the two obvious parsers accepts it and hands back a row nobody
  // named. Change the fixture to something no parser would take and
  // the refusal still passes while the argument for it is gone.
  it('is handed an id a lenient parser would have read as a row', () => {
    expect(Number.parseInt(NON_NUMERIC_ID, 10)).toBe(LENIENTLY_PARSED_ROW);
  });

  it('refuses a ruling whose row id is not one', () => {
    expect(refusedProblem(NON_NUMERIC_ID_ARGV)).toBe(NON_NUMERIC_ID_PROBLEM);
  });
});

// ---------------------------------------------------------------------------
// What every refusal tells the operator to type instead
// ---------------------------------------------------------------------------

describe('parseApproveArgs — what a refusal says to type instead', () => {
  it('closes each of them with how the commands are spelled', () => {
    // The expectation is derived from the same list, so this is a
    // claim about every refusal above and not about four of them.
    // The guard in front of it is what stops an emptied list making
    // that claim vacuously: two empty lists compare equal, and this
    // is the only case reading the list at all.
    expect(REFUSED_ARGUMENTS.length).toBeGreaterThan(0);

    const tails = REFUSED_ARGUMENTS.map((argv) => refusedTail(argv));

    expect(tails).toStrictEqual(REFUSED_ARGUMENTS.map(() => [USAGE_LINE]));
  });
});

// ---------------------------------------------------------------------------
// Command lines it reads
// ---------------------------------------------------------------------------

describe('parseApproveArgs — a command line it reads', () => {
  // Each of the three is compared whole rather than by the word it
  // came back with, which is what tells them apart: a parser
  // answering every command line with one constant command satisfies
  // any single one of these cases, and no two of them together.
  it('reads `list` as the command that names no row', () => {
    expect(parseApproveArgs(LIST_ARGV)).toStrictEqual(LIST_COMMAND);
  });

  // The id comes back as a number where the command line carried
  // text, which is the whole of what a ruling adds over `list` here.
  // Comparing the command against a hand-written one rather than
  // reading `.id` off it is what also holds it to carrying nothing
  // else.
  it('reads a row id off `approve` as the number it names', () => {
    expect(parseApproveArgs(APPROVE_ARGV)).toStrictEqual(APPROVE_COMMAND);
  });

  // Both rulings leave `parseApproveArgs` through one return, which
  // carries the word it matched rather than a literal. So this case
  // and the one above are a pair holding that word to what was
  // typed; either on its own passes for a branch that always says
  // `approve`.
  it('reads the same id off `reject`, as the other ruling', () => {
    expect(parseApproveArgs(REJECT_ARGV)).toStrictEqual(REJECT_COMMAND);
  });
});
