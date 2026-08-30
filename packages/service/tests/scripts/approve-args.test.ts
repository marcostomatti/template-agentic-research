/**
 * What `parseApproveArgs` refuses, what it says when it does, and
 * what it makes of the command lines it reads.
 *
 * Eight command lines, one per way arguments can name nothing this
 * tool can run: no command at all, a word that is none of the three,
 * `list` with something after it, a ruling with no gate after it, a
 * ruling naming a gate this does not have, a ruling naming a
 * prototype member as though it were one, a ruling with no row after
 * its gate, and a ruling followed by something that is not a row id.
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
 * them and over all of them at once. `ApproveArgsError` appends it
 * rather than each message carrying it, so it is one claim about the
 * class and not one per refusal — and holding it inside each case
 * would make rewording it a failure in eight places that are not
 * about it.
 *
 * The four it reads are pinned whole — the word it matched and
 * whatever the command carries beside it — rather than at the word
 * alone. Every refusal above is equally satisfied by a parser that
 * refused whatever it was handed, and those four cases are the only
 * thing here that would report one.
 *
 * The last section is about the one thing a hand-written expectation
 * cannot say on its own. `scripts/approve.ts` declares its subjects
 * once and derives the usage line from that declaration, so the
 * claim worth holding is not that the line reads a particular way —
 * the case above pins that — but that the set it advertises and the
 * set the parser accepts are the same set, in both directions, over
 * whatever the declaration currently holds. Those cases are driven
 * off `APPROVAL_SUBJECT_SELECTORS` rather than off a list here, so a
 * third gate joins them with no edit; the guards in front of them
 * are what stop an emptied or overlapping declaration making the
 * sweep true by saying nothing.
 */
import { describe, expect, it } from 'vitest';

import {
  APPROVAL_SUBJECT_SELECTORS,
  ApproveArgsError,
  parseApproveArgs,
} from '../../scripts/approve.js';

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
 * The gate every ruling below is written against.
 *
 * A real selector rather than one made up here, because the cases
 * about a missing or unreadable row id have to get PAST the subject
 * to reach the guard they are about. Read off
 * `APPROVAL_SUBJECT_SELECTORS` rather than typed, and asserted to be
 * there before anything uses it: a word this file spelled itself
 * would turn every one of those cases into a case about an unknown
 * subject the day a selector was renamed, and each of them would
 * still fail — on the wrong sentence, with the fixture reading as if
 * it were fine.
 */
const [KNOWN_SUBJECT = ''] = APPROVAL_SUBJECT_SELECTORS;

/**
 * The other gate, for the case that holds the two rulings apart.
 *
 * `at(-1)` rather than index 1, so this is the last declared subject
 * whatever the list holds; the guard below asserts the two are
 * different, which is what a two-gate claim needs and is exactly
 * what fails on a list that has shrunk to one.
 */
const OTHER_SUBJECT = APPROVAL_SUBJECT_SELECTORS.at(-1) ?? '';

/**
 * A word no gate is spelled as.
 *
 * Nothing's misspelling, for the reason {@link UNKNOWN_COMMAND}
 * gives, and asserted absent from the declaration below rather than
 * assumed absent — a fixture that quietly became a real selector
 * would leave its case reporting an accepted command line as a
 * refusal that never happened.
 */
const UNKNOWN_SUBJECT = 'frobnigate';

/**
 * A word that names a member of `Object.prototype` rather than a
 * gate.
 *
 * The one fixture here that is about an implementation rather than
 * about a typo. A parser resolving a subject by indexing an object
 * with what was typed answers something for `constructor`, and a
 * ruling would then be dispatched to whatever that is. Refusing it
 * is what says the lookup does not walk a prototype — and, unlike
 * every other refusal in this file, a parser could pass the whole
 * rest of the suite while getting this one wrong.
 */
const PROTOTYPE_SUBJECT = 'constructor';

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

/**
 * The row every ruling in this file names.
 *
 * Written out separately from the argument spelling it rather than
 * derived from it: text on the command line and a number in the
 * command is the difference the reading cases below are about, and
 * deriving either from the other would put the conversion under test
 * on both sides of its own assertion.
 *
 * Declared up here because the refusal fixtures use the argument
 * too. A ruling refused for its subject never reaches its row id, so
 * what follows the bad subject in those command lines is deliberately
 * a good one — which is what makes them cases about the subject.
 */
const RULED_ROW_ID = 42;

/** How {@link RULED_ROW_ID} is spelled on a command line. */
const RULED_ROW_ARGUMENT = '42';

/** A command line with no command on it at all. */
const NO_COMMAND_ARGV: readonly string[] = [];

/** A command line naming a command this tool does not run. */
const UNKNOWN_COMMAND_ARGV: readonly string[] = [UNKNOWN_COMMAND];

/** A listing with something after it that it does not take. */
const LIST_WITH_OPERAND_ARGV: readonly string[] = ['list', KNOWN_SUBJECT];

/** A ruling with nothing after it to say which gate it is about. */
const NO_SUBJECT_ARGV: readonly string[] = ['approve'];

/** A ruling naming a gate this tool does not have. */
const UNKNOWN_SUBJECT_ARGV: readonly string[] = [
  'approve',
  UNKNOWN_SUBJECT,
  RULED_ROW_ARGUMENT,
];

/** A ruling naming a prototype member as though it were a gate. */
const PROTOTYPE_SUBJECT_ARGV: readonly string[] = [
  'approve',
  PROTOTYPE_SUBJECT,
  RULED_ROW_ARGUMENT,
];

/** A ruling naming a gate and then nothing to rule on. */
const NO_ROW_ID_ARGV: readonly string[] = ['approve', KNOWN_SUBJECT];

/** A ruling followed by something that is not a row id. */
const NON_NUMERIC_ID_ARGV: readonly string[] = [
  'approve',
  KNOWN_SUBJECT,
  NON_NUMERIC_ID,
];

/**
 * The eight above, in the order the cases below take them.
 *
 * Built from the same constants rather than typed out again, so the
 * usage case sweeps the inputs the other cases used. A second list
 * of them could drift from the first, and the drift would show as
 * the usage claim holding for command lines nothing else refuses.
 */
const REFUSED_ARGUMENTS: readonly (readonly string[])[] = [
  NO_COMMAND_ARGV,
  UNKNOWN_COMMAND_ARGV,
  LIST_WITH_OPERAND_ARGV,
  NO_SUBJECT_ARGV,
  UNKNOWN_SUBJECT_ARGV,
  PROTOTYPE_SUBJECT_ARGV,
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

/** What a listing handed an argument is refused with. */
const LIST_WITH_OPERAND_PROBLEM =
  'list takes no arguments, and 1 followed it';

/** What a ruling naming no gate is refused with. */
const NO_SUBJECT_PROBLEM = 'approve names no subject';

/**
 * What a ruling naming a gate this tool does not have is refused
 * with.
 *
 * The set is spelled from `APPROVAL_SUBJECT_SELECTORS` rather than
 * written out, because the sentence names it and that half of the
 * sentence is derived in `scripts/approve.ts` too. What stays
 * hand-written is the wording around it, which is the part a case
 * pinned at a sentence exists to hold.
 */
const UNKNOWN_SUBJECT_PROBLEM =
  `approve was given '${UNKNOWN_SUBJECT}', which names none of the ` +
  `gates this rules on (${APPROVAL_SUBJECT_SELECTORS.join(', ')})`;

/** What a ruling naming a prototype member is refused with. */
const PROTOTYPE_SUBJECT_PROBLEM =
  `approve was given '${PROTOTYPE_SUBJECT}', which names none of the ` +
  `gates this rules on (${APPROVAL_SUBJECT_SELECTORS.join(', ')})`;

/** What a ruling with no row after its gate is refused with. */
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
const USAGE_LINE =
  'usage: list | approve <pool|config> <id> '
  + '| reject <pool|config> <id>';

// ---------------------------------------------------------------------------
// The command lines it reads, and what each one comes back as
// ---------------------------------------------------------------------------

/** A command line asking for whatever is pending. */
const LIST_ARGV: readonly string[] = ['list'];

/** A command line approving one row in the first gate. */
const APPROVE_ARGV: readonly string[] = [
  'approve',
  KNOWN_SUBJECT,
  RULED_ROW_ARGUMENT,
];

/** A command line approving the same-numbered row in the other. */
const APPROVE_OTHER_ARGV: readonly string[] = [
  'approve',
  OTHER_SUBJECT,
  RULED_ROW_ARGUMENT,
];

/** A command line rejecting that same row in the other gate. */
const REJECT_ARGV: readonly string[] = [
  'reject',
  OTHER_SUBJECT,
  RULED_ROW_ARGUMENT,
];

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

/** What `approve <gate> <id>` comes back as, for the first gate. */
const APPROVE_COMMAND = {
  command: 'approve',
  subject: KNOWN_SUBJECT,
  id: RULED_ROW_ID,
};

/** What the same ruling comes back as against the other gate. */
const APPROVE_OTHER_COMMAND = {
  command: 'approve',
  subject: OTHER_SUBJECT,
  id: RULED_ROW_ID,
};

/** What `reject <gate> <id>` comes back as, for that same row. */
const REJECT_COMMAND = {
  command: 'reject',
  subject: OTHER_SUBJECT,
  id: RULED_ROW_ID,
};

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

  // `list` is the one command that names no gate, and an operator
  // who has just learned `approve pool` will try `list pool`. The
  // charitable reading of it — list that gate only — is a listing
  // that shows one queue while saying `pending approvals`, so it is
  // refused rather than narrowed.
  it('refuses a listing handed a gate to narrow itself to', () => {
    expect(refusedProblem(LIST_WITH_OPERAND_ARGV))
      .toBe(LIST_WITH_OPERAND_PROBLEM);
  });
});

describe('parseApproveArgs — a ruling that names no gate it has', () => {
  // The fixtures the three cases below rest on. A word that had
  // quietly become a real selector, or a real one that had been
  // renamed, leaves each of them testing something other than what
  // it says — so both directions are asserted here, once, before
  // any of them runs.
  it('is handed one word that is a gate and two that are not', () => {
    expect(APPROVAL_SUBJECT_SELECTORS).toContain(KNOWN_SUBJECT);
    expect(APPROVAL_SUBJECT_SELECTORS).not.toContain(UNKNOWN_SUBJECT);
    expect(APPROVAL_SUBJECT_SELECTORS).not.toContain(PROTOTYPE_SUBJECT);
  });

  // A ruling is read gate-first, so this is refused for naming no
  // subject rather than for the row id that is not there either.
  // Which of the two sentences comes back is the whole of what tells
  // an operator what to add.
  it('refuses a ruling with no gate after it', () => {
    expect(refusedProblem(NO_SUBJECT_ARGV)).toBe(NO_SUBJECT_PROBLEM);
  });

  // The word is quoted and the set is named after it, which is what
  // separates a typo from a gate this build does not have.
  it('refuses a gate it does not have, quoting the word', () => {
    expect(refusedProblem(UNKNOWN_SUBJECT_ARGV)).toBe(UNKNOWN_SUBJECT_PROBLEM);
  });

  // The case that is about the lookup rather than about a typo. A
  // parser resolving the subject by indexing an object would answer
  // `Object.prototype.constructor` here and dispatch a ruling to it;
  // every other case in this file passes either way.
  it('refuses a prototype member named as though it were a gate', () => {
    expect(refusedProblem(PROTOTYPE_SUBJECT_ARGV))
      .toBe(PROTOTYPE_SUBJECT_PROBLEM);
  });
});

describe('parseApproveArgs — a ruling that names no row it can act on', () => {
  // A ruling with nothing after it is the one refusal here that
  // quotes nothing, because there is nothing that was typed to quote
  // — which is also why it names the ruling instead.
  it('refuses a ruling with no row id after its gate', () => {
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
  // text, which is one of the two things a ruling adds over `list`
  // here. Comparing the command against a hand-written one rather
  // than reading `.id` off it is what also holds it to carrying
  // nothing else.
  it('reads a row id off `approve` as the number it names', () => {
    expect(parseApproveArgs(APPROVE_ARGV)).toStrictEqual(APPROVE_COMMAND);
  });

  // The other thing it adds. Both tables key on `bigserial`, so the
  // same id names a row in each, and this case and the one above are
  // the same command line but for the gate — which is what holds the
  // subject to the word that was typed rather than to a default. The
  // guard in front of them is that the two words differ at all.
  it('reads the gate off `approve` as the word it names', () => {
    expect(KNOWN_SUBJECT).not.toBe(OTHER_SUBJECT);
    expect(parseApproveArgs(APPROVE_OTHER_ARGV))
      .toStrictEqual(APPROVE_OTHER_COMMAND);
  });

  // Both rulings leave `parseApproveArgs` through one return, which
  // carries the word it matched rather than a literal. So this case
  // and the two above are a set holding that word to what was typed;
  // any one on its own passes for a branch that always says
  // `approve`.
  it('reads the same id and gate off `reject`', () => {
    expect(parseApproveArgs(REJECT_ARGV)).toStrictEqual(REJECT_COMMAND);
  });
});

// ---------------------------------------------------------------------------
// The gates the usage line advertises, against the gates it accepts
// ---------------------------------------------------------------------------

describe('parseApproveArgs — the gates it names against the gates it takes', () => {
  // Two guards over the declaration itself, and the sweeps below are
  // worth nothing without them. An emptied list makes every `every`
  // below vacuously true, and a list whose words overlap makes the
  // usage sweep pass for a line naming only the longer one.
  it('declares gates that are distinct and none a part of another', () => {
    expect(APPROVAL_SUBJECT_SELECTORS.length).toBeGreaterThan(0);

    const overlapping = APPROVAL_SUBJECT_SELECTORS.filter(
      (selector) => APPROVAL_SUBJECT_SELECTORS.some(
        (other) => other !== selector && other.includes(selector),
      ),
    );

    expect(overlapping).toStrictEqual([]);
  });

  // The advertise direction. `scripts/approve.ts` builds the usage
  // line out of this same declaration, so a gate added there shows up
  // in every refusal with no edit — and this is what says so over
  // whatever the declaration currently holds, where the hand-written
  // line above says it only for today's two.
  it('names every gate it has in the line every refusal closes with', () => {
    const tail = refusedTail(NO_COMMAND_ARGV).join('\n');
    const unnamed = APPROVAL_SUBJECT_SELECTORS.filter(
      (selector) => !tail.includes(selector),
    );

    expect(unnamed).toStrictEqual([]);
  });

  // The accept direction, and the one that matters most: a usage
  // line may not advertise a word the parser turns away. Driven off
  // the same declaration, so the pair closes over whatever it holds.
  it('reads every gate it names as a subject', () => {
    const refused = APPROVAL_SUBJECT_SELECTORS.filter(
      (selector) => refusedMessage(['approve', selector, RULED_ROW_ARGUMENT])
        !== NOT_REFUSED,
    );

    expect(refused).toStrictEqual([]);
  });
});
