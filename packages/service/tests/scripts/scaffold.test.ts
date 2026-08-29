/**
 * What `scripts/scaffold.ts` refuses, and what each of its
 * generators makes of a name it accepts.
 *
 * Refusals first, and for this command that order is more than a
 * habit — its whole hazard is on that side. Everything a generator
 * writes is a starting point somebody replaces, so the mistakes
 * worth catching are the two that destroy work rather than fail to
 * do it: a run that puts a throwing placeholder where a written
 * library used to be, and a name that lands a file somewhere the
 * command line did not say.
 *
 * Each parser refusal is pinned to the whole first line of its own
 * message rather than to the fact that something was thrown, for
 * the reason `tests/scripts/approve-args.test.ts` sets out at
 * length: one parser refuses six different things, and a case
 * reading only that a refusal arrived passes for any of them. What
 * every refusal closes with is asserted apart from them and over
 * all of them at once, because `ScaffoldArgsError` appends it —
 * that is one claim about the class, not one per refusal. The
 * missing-operand refusal is asserted twice, once per generator,
 * because the word it quotes is read off the registry entry: `lib`
 * takes a name and `source-adapter` takes an id, and a parser that
 * had baked either word into the message would pass one of those
 * two cases and fail the other.
 *
 * The names are a table rather than a case apiece, and it is walked
 * whole, so a name added to it is covered by the walk instead of by
 * somebody remembering to add a case. The traversing entry carries
 * a guard of its own: it is asserted to be a name that WOULD have
 * escaped the target directory had the pattern let it through,
 * which is what makes its refusal worth having. A fixture nothing
 * would have done anything dangerous with is refused just as
 * happily by a pattern narrowed for no reason.
 *
 * Two targets are stamped over rather than one. A rerun collides on
 * both halves of a pair and says so, which is the ordinary case;
 * the second target is occupied on ONE half, and that is the only
 * arrangement able to report the ORDER — every path is checked
 * before any is written, so a half-occupied target comes back
 * exactly as it was found rather than carrying the file the run got
 * to before it noticed. A rerun cannot tell the two orders apart,
 * since there is nothing left for a careless one to write.
 *
 * What a `lib` run emits is read off the filesystem rather than
 * from the generator's return, so the claims are about files
 * somebody would open. Two of them are about the pair being a pair:
 * the case file imports an identifier the library declares, and it
 * imports it by a specifier that RESOLVES to the library beside it
 * rather than by a string that merely looks like its path. The
 * directories are two constants in `scripts/scaffold.ts` and the
 * import is built from both, so the failure those cases exist for
 * is one moved and the other not — which emits a well-formed pair
 * that does not resolve.
 *
 * A `source-adapter` run is read the same way, and its claims are
 * that shape one generator over: the trio is a trio, the module
 * declares every member of the contract, and the three files agree
 * about each other — the case file imports the factory the module
 * exports, names it by a specifier that resolves, names the payload
 * by a path that resolves, and reads the key that payload carries.
 * The one claim with no counterpart under `lib` is that `fetch` is
 * the only member answering a promise, which is what the whole
 * stored-payload seam rests on. It is a claim about the declared
 * signatures rather than a proof of purity, and what it catches is
 * the skeleton growing a second member able to await something.
 *
 * The spliceable claim is the one that leaves this process. The
 * refusal judges a transpiled library beside its transpiler's scan,
 * and a vitest worker has no `Bun.Transpiler` to build either with
 * (measured: `Bun` is an object carrying `serve` and nothing else),
 * so `tests/scripts/spliceable-probe.ts` is spawned under bun and
 * answers about files. It is handed the emitted library AND a
 * control in the same run, and the two verdicts are compared as one
 * list. That pairing is the whole reason the acceptance says
 * anything: `assertSpliceable` returns nothing when it accepts, so
 * an acceptance read on its own is indistinguishable from a probe
 * that never reached the rule. The control is the package's own
 * value-import sample out of `tests/build/marker-fixtures.ts`
 * rather than one invented here, so what stands opposite the
 * emitted library is a source this package already declares
 * unspliceable.
 *
 * A `migration` run is read against two things outside itself,
 * because neither half of what it emits means anything on its own.
 * The entry is held against this package's REAL journal rather
 * than a copy of one — what an emitted entry has to match is what
 * drizzle writes there today, so a release that moved the format
 * reddens here instead of in a migration somebody has just
 * written. And the pair is handed to `drizzle-orm`'s own migration
 * reader, with the one move the entry's header asks for made
 * first: the entry pasted into a journal, and nothing else about
 * the emitted tree touched. That reader resolves the tag into a
 * filename, throws when it names nothing, and splits what it finds
 * on the marker — so two statements out of it is the whole shape
 * decided by the thing that will decide it in production.
 *
 * The text claims beside it are the ones a reader can check by
 * eye, and one of them is there because the split cannot make it.
 * Counting pieces counts pieces: a statement commented out leaves
 * the count at two while the database gets one, which is the
 * failure shape with no signal anywhere — the migrator records the
 * migration applied, postgres does nothing, and every scan over
 * the file still finds every string it looks for. What separates
 * them is anchoring the statement to the start of its line.
 */
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readMigrationFiles } from 'drizzle-orm/migrator';
import { afterAll, describe, expect, it } from 'vitest';

import {
  GENERATORS,
  parseScaffoldArgs,
  ScaffoldArgsError,
  ScaffoldWriteError,
  writeScaffold,
} from '../../scripts/scaffold.js';
import { REFUSED_LIB_SAMPLES } from '../build/marker-fixtures.js';

// ---------------------------------------------------------------------------
// The generator these cases drive, and the name they drive it with
// ---------------------------------------------------------------------------

/** The first generator this file drives, as the registry keys it. */
const GENERATOR = 'lib';

/** The second, which takes an id where the first takes a name. */
const ADAPTER_GENERATOR = 'source-adapter';

/** The third, which stamps into a tree drizzle-kit also writes. */
const MIGRATION_GENERATOR = 'migration';

/**
 * A name the pattern accepts, in two words.
 *
 * Hyphenated deliberately. A single word is spelled the same as an
 * identifier and as a file stem, so a pair emitted for one would
 * agree about its subject however the camel-case step behaved —
 * including if it were not there at all.
 */
const EMITTED_NAME = 'sample-lib';

/** The identifier {@link EMITTED_NAME} is spelled as in code. */
const EMITTED_IDENTIFIER = 'sampleLib';

/** Where a stamped library lands, relative to the target. */
const LIB_PATH = `src/lib/${EMITTED_NAME}.ts`;

/** Where its case file lands, relative to the target. */
const LIB_TEST_PATH = `tests/lib/${EMITTED_NAME}.test.ts`;

/** Both, in the order the generator emits them. */
const EMITTED_PATHS: readonly string[] = [LIB_PATH, LIB_TEST_PATH];

// ---------------------------------------------------------------------------
// The command lines these cases hand it to refuse
// ---------------------------------------------------------------------------

/**
 * A word no generator here is spelled as.
 *
 * Nothing's misspelling, for the reason the sibling file gives: a
 * near miss would be refused by a parser that had grown a charitable
 * prefix match too, and for some other reason.
 */
const UNKNOWN_GENERATOR = 'frobnicate';

/**
 * The directory every parse-only case names.
 *
 * Nothing made it and nothing will, which is the point of it being
 * here rather than under the fixture root: the parser reaches no
 * filesystem at all, so a target it could not have opened is a
 * perfectly good argument and its acceptance below says so.
 */
const UNMADE_TARGET_DIR = 'nowhere-on-disk';

/** One name the pattern refuses, and what about it is refused. */
interface UnusableName {
  /** What is wrong with it, for a reader of a failing diff. */
  readonly problem: string;

  /** The name itself, as a command line would carry it. */
  readonly name: string;
}

/**
 * A name that walks out of the target directory.
 *
 * Named apart from the table because one case is about this entry
 * alone: the guard asserting it really would have escaped.
 */
const TRAVERSING_NAME = '../../../escape';

/**
 * Every name below is refused, and each is refused for a different
 * reason a lenient pattern would have missed.
 *
 * Four of the six reach a path — a traversal, a separator, an
 * absolute root and an extension — and those are the ones the
 * narrowness is FOR. The other two are what keeps the emitted
 * identifier a valid one: a leading digit and an upper-case letter
 * both survive `toCamelCase` unchanged, and the first of them comes
 * back as a word no `function` declaration can be named.
 */
const UNUSABLE_NAMES: readonly UnusableName[] = [
  { problem: 'a traversal out of the target', name: TRAVERSING_NAME },
  { problem: 'a path separator', name: 'src/lib/thing' },
  { problem: 'an absolute path', name: '/etc/thing' },
  { problem: 'a file extension', name: 'thing.ts' },
  { problem: 'a leading digit', name: '9lives' },
  { problem: 'an upper-case letter', name: 'Thing' },
];

/** A command line with no generator on it at all. */
const NO_GENERATOR_ARGV: readonly string[] = [];

/** A command line naming a generator this command does not have. */
const UNKNOWN_GENERATOR_ARGV: readonly string[] = [
  UNKNOWN_GENERATOR,
  EMITTED_NAME,
  UNMADE_TARGET_DIR,
];

/** A generator with nothing after it to name. */
const NO_NAME_ARGV: readonly string[] = [GENERATOR];

/**
 * The other generator, with nothing after it to name either.
 *
 * Here rather than beside the emission cases below, because what it
 * is for is the OPERAND rather than the emission: the refusal reads
 * that word off the registry entry, so the two generators are
 * refused in two different words for the same mistake.
 */
const NO_ID_ARGV: readonly string[] = [ADAPTER_GENERATOR];

/** A generator and a name, with nowhere to put the result. */
const NO_TARGET_ARGV: readonly string[] = [GENERATOR, EMITTED_NAME];

/** A complete command line with a word running on past it. */
const EXTRA_ARGUMENT_ARGV: readonly string[] = [
  GENERATOR,
  EMITTED_NAME,
  UNMADE_TARGET_DIR,
  'extra',
];

/** One command line per entry in {@link UNUSABLE_NAMES}. */
const UNUSABLE_NAME_ARGVS: readonly (readonly string[])[] = UNUSABLE_NAMES
  .map((entry) => [GENERATOR, entry.name, UNMADE_TARGET_DIR]);

/**
 * Every command line above, in the order the cases take them.
 *
 * Built from the same constants rather than typed out again, so the
 * usage case sweeps exactly the inputs the other cases used.
 */
const REFUSED_ARGUMENTS: readonly (readonly string[])[] = [
  NO_GENERATOR_ARGV,
  UNKNOWN_GENERATOR_ARGV,
  NO_NAME_ARGV,
  NO_ID_ARGV,
  NO_TARGET_ARGV,
  EXTRA_ARGUMENT_ARGV,
  ...UNUSABLE_NAME_ARGVS,
];

// ---------------------------------------------------------------------------
// What each of them is refused with
// ---------------------------------------------------------------------------

/** What a command line carrying no generator is refused with. */
const NO_GENERATOR_PROBLEM = 'no generator given';

/** What one naming a generator this does not have is refused with. */
const UNKNOWN_GENERATOR_PROBLEM = `unknown generator '${UNKNOWN_GENERATOR}'`;

/** What a generator with no name after it is refused with. */
const NO_NAME_PROBLEM = 'no name followed lib';

/** What the one taking an id is refused with, in its own word. */
const NO_ID_PROBLEM = 'no id followed source-adapter';

/** What a generator and a name with nowhere to go is refused with. */
const NO_TARGET_PROBLEM = 'no target directory given';

/** What a word past the target directory is refused with. */
const EXTRA_ARGUMENT_PROBLEM = '1 argument(s) followed the target directory';

/**
 * Everything a refusal over an unusable name says after quoting it.
 *
 * The quoted name is put back in front by the case that walks the
 * table, so this is the part the six share and the name is the part
 * that tells them apart.
 */
const UNUSABLE_NAME_REASON =
  'is not a usable name: lower-case words, digits after the first '
  + 'character, single hyphens between them, and nothing that could '
  + 'reach a path';

/**
 * How the command is spelled, as every refusal closes by saying.
 *
 * Written out here rather than imported. The command holds it as a
 * module constant built from the registry, and a case comparing
 * that constant against itself would agree with any spelling it
 * drifted into — including a listing naming a generator nobody
 * meant to ship.
 */
const USAGE_LINES: readonly string[] = [
  'usage: scaffold <generator> <name> <target-dir>',
  '',
  'generators:',
  '  lib <name> — a spliceable library under src/lib/ and its case file',
  '  source-adapter <id> — an adapter under src/sources/, cases and payload',
  '  migration <name> — a hand-written migration under drizzle/ and its entry',
];

// ---------------------------------------------------------------------------
// Reading a refusal
// ---------------------------------------------------------------------------

/**
 * Stands in for the message when the arguments parsed through.
 *
 * A sentinel rather than an empty string, so a case expecting a
 * refusal and handed a request says which happened in its own diff.
 */
const NOT_REFUSED = '(nothing refused)';

/**
 * The message `parseScaffoldArgs` refused `argv` with, or
 * {@link NOT_REFUSED} when it returned a request.
 *
 * Only a `ScaffoldArgsError` counts and anything else is rethrown,
 * which is where the class gets pinned too: a parser that had
 * started throwing a `TypeError` over these inputs would fail every
 * case below rather than pass them.
 *
 * @param argv - The words after the script name.
 * @returns The message it refused with, or the sentinel.
 */
function refusedMessage(argv: readonly string[]): string {
  try {
    parseScaffoldArgs(argv);
  } catch (thrown) {
    if (thrown instanceof ScaffoldArgsError) {
      return thrown.message;
    }

    throw thrown;
  }

  return NOT_REFUSED;
}

/**
 * The first line of that message: what is wrong with the arguments,
 * without the usage listing under it.
 *
 * @param argv - The words after the script name.
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
 * line is reported as the extra line instead of as a longer string
 * a reader has to diff by eye.
 *
 * @param argv - The words after the script name.
 * @returns The lines past the refusal's opening one.
 */
function refusedTail(argv: readonly string[]): readonly string[] {
  const [, ...tail] = refusedMessage(argv).split('\n');

  return tail;
}

// ---------------------------------------------------------------------------
// Command lines it cannot stamp
// ---------------------------------------------------------------------------

describe('parseScaffoldArgs — a command line it cannot stamp', () => {
  // `argv` is what followed the script name, so an empty list is a
  // real input here rather than an impossible one: it is the command
  // run with no generator at all.
  it('refuses an empty argument list', () => {
    expect(refusedProblem(NO_GENERATOR_ARGV)).toBe(NO_GENERATOR_PROBLEM);
  });

  // The word is quoted back rather than described, which is what
  // separates this refusal from the ones below: those are all about
  // what followed a generator the command does have.
  it('refuses a generator it does not have, quoting the word', () => {
    expect(refusedProblem(UNKNOWN_GENERATOR_ARGV))
      .toBe(UNKNOWN_GENERATOR_PROBLEM);
  });

  // The refusal names the generator and what it wanted rather than
  // quoting anything, because there is nothing that was typed to
  // quote — and the operand comes off the registry entry, so a
  // generator taking something other than a name says so here. No
  // article in front of that word, which is what lets one message
  // serve an operand beginning with a vowel and one that does not.
  it('refuses a generator with no name after it', () => {
    expect(refusedProblem(NO_NAME_ARGV)).toBe(NO_NAME_PROBLEM);
  });

  // The same mistake against the other generator, and the pair is
  // the claim: the operand is read off the registry entry rather
  // than fixed, so one refusal says name and the other says id. A
  // parser carrying either word as a literal passes one of these
  // two cases and fails the other.
  it('refuses one taking an id in that generator\'s own word', () => {
    expect(refusedProblem(NO_ID_ARGV)).toBe(NO_ID_PROBLEM);
  });

  // The target directory is a required operand and not a default,
  // which is what keeps one command able to stamp a package and a
  // throwaway tree. A parser supplying a working directory here
  // would pass every other case in this file.
  it('refuses a generator and a name with nowhere to put them', () => {
    expect(refusedProblem(NO_TARGET_ARGV)).toBe(NO_TARGET_PROBLEM);
  });

  // A word past the third is refused rather than ignored: it is the
  // shape a mistyped path takes, and reading it charitably would
  // stamp a tree the operator did not name.
  it('refuses a word running on past the target directory', () => {
    expect(refusedProblem(EXTRA_ARGUMENT_ARGV)).toBe(EXTRA_ARGUMENT_PROBLEM);
  });
});

describe('parseScaffoldArgs — a name it will not put in a path', () => {
  // The guard that keeps the table's first entry about the hazard
  // the pattern was narrowed for. It reads as testing `join`, and
  // that is the point: what makes a traversal worth refusing is
  // that accepting it writes outside the directory that was named.
  // A fixture no path arithmetic would have moved is refused just
  // as happily by a pattern narrowed for nothing.
  it('is handed a name that would have escaped the target', () => {
    const escaped = join(UNMADE_TARGET_DIR, `src/lib/${TRAVERSING_NAME}.ts`);

    expect(escaped.startsWith(UNMADE_TARGET_DIR)).toBe(false);
  });

  // Walked whole rather than a case per entry, so a name added to
  // the table is covered by this claim rather than by somebody
  // remembering to add a case beside it. The guard in front is what
  // stops an emptied table making the claim vacuously: two empty
  // lists compare equal, and this is the only case reading it.
  it('refuses every one of them, quoting the name it was given', () => {
    expect(UNUSABLE_NAMES.length).toBeGreaterThan(0);

    const problems = UNUSABLE_NAME_ARGVS.map((argv) => refusedProblem(argv));

    expect(problems).toStrictEqual(UNUSABLE_NAMES
      .map((entry) => `'${entry.name}' ${UNUSABLE_NAME_REASON}`));
  });
});

// ---------------------------------------------------------------------------
// What every refusal tells the operator to type instead
// ---------------------------------------------------------------------------

describe('parseScaffoldArgs — what a refusal says to type instead', () => {
  it('closes each of them with how the command is spelled', () => {
    // Derived from the same list, so this is a claim about every
    // refusal above rather than about one of them. The listing is
    // built from the registry, so it also holds that the one
    // generator shipped today is the one named here.
    expect(REFUSED_ARGUMENTS.length).toBeGreaterThan(0);

    const tails = REFUSED_ARGUMENTS.map((argv) => refusedTail(argv));

    expect(tails).toStrictEqual(REFUSED_ARGUMENTS.map(() => USAGE_LINES));
  });
});

// ---------------------------------------------------------------------------
// A command line it stamps
// ---------------------------------------------------------------------------

describe('parseScaffoldArgs — a command line it reads', () => {
  // Compared whole rather than field by field, which is what holds
  // the request to carrying nothing else — and the generator is
  // compared against the registry entry rather than against the
  // word that found it, because nothing downstream looks it up a
  // second time. The target directory does not exist and never
  // will: reading it through says the parser reached no filesystem,
  // which is what leaves `writeScaffold` the only half that can.
  it('reads the generator, the name and the target it was given', () => {
    expect(parseScaffoldArgs([GENERATOR, EMITTED_NAME, UNMADE_TARGET_DIR]))
      .toStrictEqual({
        generator: GENERATORS[GENERATOR],
        name: EMITTED_NAME,
        targetDir: UNMADE_TARGET_DIR,
      });
  });
});

// ---------------------------------------------------------------------------
// The trees these cases stamp into
// ---------------------------------------------------------------------------

/** The directory every emission below is written under. */
const FIXTURE_ROOT = mkdtempSync(join(tmpdir(), 'ar-scaffold-'));

afterAll(() => {
  rmSync(FIXTURE_ROOT, { recursive: true, force: true });
});

/** One `lib` emission: where it was stamped, and what it wrote. */
interface Emission {
  /** The directory the paths below are under. */
  readonly targetDir: string;

  /** Every path it wrote, absolute, in emission order. */
  readonly written: readonly string[];
}

/**
 * Stamp one generator into a fresh subdirectory of the fixture
 * root, through the parser rather than around it.
 *
 * A request is built the way a command line builds one, so what
 * these cases read is what `bun run scaffold <generator> <name>
 * <dir>` writes rather than what one function would emit if asked
 * directly.
 *
 * @param generator - The generator to run, as the registry keys it.
 * @param name - The name or id to hand it.
 * @param subdir - The subdirectory of the fixture root to stamp.
 * @returns Where it stamped and what it wrote there.
 */
function emitInto(
  generator: string,
  name: string,
  subdir: string,
): Emission {
  const targetDir = join(FIXTURE_ROOT, subdir);
  const argv = [generator, name, targetDir];

  return { targetDir, written: writeScaffold(parseScaffoldArgs(argv)) };
}

/**
 * The refusal `writeScaffold` raised over a target, or `null` when
 * it stamped one.
 *
 * `null` rather than a rethrow, so a case handed a run that wrote
 * where it should have refused fails on its own assertion instead
 * of on an exception nobody expected.
 *
 * @param targetDir - The directory to stamp into.
 * @returns What it refused with, or `null`.
 */
function writeRefusalOver(targetDir: string): ScaffoldWriteError | null {
  try {
    writeScaffold(parseScaffoldArgs([GENERATOR, EMITTED_NAME, targetDir]));
  } catch (thrown) {
    if (thrown instanceof ScaffoldWriteError) {
      return thrown;
    }

    throw thrown;
  }

  return null;
}

/** The one emission every claim about an emitted pair reads. */
const EMITTED = emitInto(GENERATOR, EMITTED_NAME, 'accepted-name');

/**
 * Both emitted paths, absolute, as a run under that target writes
 * them.
 *
 * Derived from the relative pair rather than written out again, so
 * the two claims reading it are about the same layout the generator
 * declares.
 */
const EMITTED_ABSOLUTE_PATHS: readonly string[] = EMITTED_PATHS
  .map((path) => join(EMITTED.targetDir, path));

/** The library that emission wrote, by absolute path. */
const EMITTED_LIB = join(EMITTED.targetDir, LIB_PATH);

/** The case file it wrote beside it. */
const EMITTED_TEST = join(EMITTED.targetDir, LIB_TEST_PATH);

/** The library, read back off the filesystem. */
const EMITTED_LIB_SOURCE = readFileSync(EMITTED_LIB, 'utf8');

/** The case file, read back the same way. */
const EMITTED_TEST_SOURCE = readFileSync(EMITTED_TEST, 'utf8');

// ---------------------------------------------------------------------------
// A target already holding one of the files
// ---------------------------------------------------------------------------

/** Text no generator would write, planted where one would. */
const OCCUPANT_TEXT = '// a file somebody wrote and would like to keep\n';

/**
 * A target holding the case file and nothing else, stamped over.
 *
 * The half-occupied arrangement is the only one able to report the
 * order: a rerun collides on both paths, so a run that checked and
 * wrote one path at a time would leave nothing behind either and
 * the two orders would read the same.
 */
const HALF_OCCUPIED_DIR = join(FIXTURE_ROOT, 'case-file-in-the-way');

/** The case file planted there before the run. */
const HALF_OCCUPIED_FILE = join(HALF_OCCUPIED_DIR, LIB_TEST_PATH);

mkdirSync(dirname(HALF_OCCUPIED_FILE), { recursive: true });
writeFileSync(HALF_OCCUPIED_FILE, OCCUPANT_TEXT, 'utf8');

/** What a run over that half-occupied target came back with. */
const HALF_OCCUPIED_REFUSAL = writeRefusalOver(HALF_OCCUPIED_DIR);

describe('writeScaffold — a target already holding one of the files', () => {
  // A rerun is the shape this refusal is really for: a second
  // `scaffold lib` over a library somebody has since written would
  // replace it with a throwing placeholder, and every path is named
  // because a rerun collides on both halves and an operator acting
  // on one at a time would come straight back.
  it('refuses a rerun, naming every file already there', () => {
    expect(writeRefusalOver(EMITTED.targetDir)?.paths)
      .toStrictEqual(EMITTED_ABSOLUTE_PATHS);
  });

  it('names only the file in the way when only one is', () => {
    expect(HALF_OCCUPIED_REFUSAL?.paths).toStrictEqual([HALF_OCCUPIED_FILE]);
  });

  // The order claim. The library sorts first in the pair, so a run
  // that checked each path as it reached it would have written this
  // file before noticing the collision on the next one — leaving
  // half a module behind, from a command that reported a failure.
  it('leaves the file it would have written first absent', () => {
    expect(existsSync(join(HALF_OCCUPIED_DIR, LIB_PATH))).toBe(false);
  });

  // And the other half of the same claim: what was already there is
  // what is still there. A refusal that had truncated the occupant
  // on its way to reading it would satisfy the case above.
  it('leaves the file that was in the way exactly as it found it', () => {
    expect(readFileSync(HALF_OCCUPIED_FILE, 'utf8')).toBe(OCCUPANT_TEXT);
  });
});

// ---------------------------------------------------------------------------
// The pair a `lib` run writes
// ---------------------------------------------------------------------------

/** One named import a source writes. */
interface SourceImport {
  /** The names it brings in, as written between the braces. */
  readonly names: string;

  /** The specifier it brings them from. */
  readonly from: string;
}

/**
 * A named import statement, as this package writes one.
 *
 * Global, which `String.prototype.matchAll` requires; it is safe as
 * a shared constant because `matchAll` reads `lastIndex` into a
 * clone rather than advancing this one, so no call is affected by
 * the one before it.
 */
const IMPORT_PATTERN =
  /^import \{ (?<names>[^}]+) \} from '(?<from>[^']+)';$/gmu;

/**
 * Every named import a source writes.
 *
 * @param source - The file's whole text.
 * @returns What it imports, in the order it imports them.
 */
function importsOf(source: string): readonly SourceImport[] {
  return [...source.matchAll(IMPORT_PATTERN)].map((match) => ({
    names: match.groups?.names ?? '',
    from: match.groups?.from ?? '',
  }));
}

/**
 * The relative import the emitted case file writes, which is the
 * one naming its subject.
 *
 * Picked by being relative rather than by position, so a case file
 * that grew another import from the test runner is still read for
 * the one that matters.
 */
const COVERED_IMPORT = importsOf(EMITTED_TEST_SOURCE)
  .find((entry) => entry.from.startsWith('.'));

/**
 * What this package's ESM specifiers end in, and what the file they
 * name ends in.
 *
 * A specifier says `.js` where the file on disk is `.ts`, which is
 * the convention every import in this package follows. Undoing it
 * is what lets a resolved specifier be compared against a path.
 */
const SPECIFIER_SUFFIX = /\.js$/u;

describe('the pair a lib run writes', () => {
  // The layout, as two paths under the target rather than as
  // wherever the command happened to put them.
  it('writes the library and its case file, and nothing else', () => {
    expect(EMITTED.written).toStrictEqual(EMITTED_ABSOLUTE_PATHS);
  });

  // The camel-case step, read off the file it lands in. A library
  // whose export were named for something other than its file would
  // still be spliceable and still parse — the pair would simply not
  // be a pair, which is what the case below reads from the other
  // end.
  it('declares an export named for the module', () => {
    expect(EMITTED_LIB_SOURCE)
      .toContain(`export function ${EMITTED_IDENTIFIER}(`);
  });

  it('imports that same export in the case file beside it', () => {
    expect(COVERED_IMPORT?.names).toBe(EMITTED_IDENTIFIER);
  });

  // The claim the two directory constants in `scripts/scaffold.ts`
  // rest on. Resolved rather than compared as text, so what is
  // asserted is where the specifier LANDS: a case file naming a
  // path that reads plausibly and resolves nowhere is exactly what
  // moving one constant and not the other emits.
  it('names the library beside it by a specifier that resolves', () => {
    const specifier = COVERED_IMPORT?.from ?? '';
    const named = resolve(
      dirname(EMITTED_TEST),
      specifier.replace(SPECIFIER_SUFFIX, '.ts'),
    );

    expect(named).toBe(EMITTED_LIB);
  });

  // And the suite it declares is named for the module too, which is
  // what a reader sees in a run rather than in the file.
  it('names the module in the suite the case file declares', () => {
    expect(EMITTED_TEST_SOURCE).toContain(`describe('${EMITTED_NAME}'`);
  });
});

// ---------------------------------------------------------------------------
// Whether a Code node could run what it wrote
// ---------------------------------------------------------------------------

/** What the probe reports for a file a Code node could run. */
const SPLICEABLE = 'spliceable';

/** What it reports for one carrying a dependency, naming the form. */
const REFUSED_AS_IMPORT = 'refused import';

/** The form the control is declared refused under. */
const CONTROL_FORM = 'import';

/**
 * The source the control is written from: this package's own
 * value-import sample.
 *
 * Taken from `tests/build/marker-fixtures.ts` rather than written
 * here, so what stands opposite the emitted library is a source the
 * package already declares unspliceable. A roster that stopped
 * carrying one leaves this empty, an empty file is spliceable, and
 * the verdict list below reports two acceptances where it expects
 * one — so the control cannot go missing quietly.
 */
const CONTROL_SOURCE = REFUSED_LIB_SAMPLES
  .find((sample) => sample.refusedForm === CONTROL_FORM)?.source ?? '';

/** Where that control is written before the probe is spawned. */
const CONTROL_FILE = join(FIXTURE_ROOT, 'control', 'depends-on-a-value.ts');

mkdirSync(dirname(CONTROL_FILE), { recursive: true });
writeFileSync(CONTROL_FILE, CONTROL_SOURCE, 'utf8');

/**
 * The probe, resolved from this file's location rather than from
 * the working directory — the suite is launched from the package
 * and from the repo root alike, and only one of those makes a
 * relative path name it.
 */
const PROBE_ENTRY = fileURLToPath(
  new URL('./spliceable-probe.ts', import.meta.url),
);

/** What {@link probeRun} reports for a run that completed. */
const PROBE_RAN = 'exit 0';

/** One spawned probe run, and how it went. */
interface ProbeRun {
  /**
   * {@link PROBE_RAN} for a run that completed, and otherwise the
   * status beside everything it had to say.
   *
   * Carried as one string rather than as a status and a stream, so
   * a case failing over a probe that never ran says why in its own
   * failure instead of leaving it in a subprocess nobody kept.
   */
  readonly launch: string;

  /** The verdict for each path, in the order they were given. */
  readonly verdicts: readonly string[];
}

/**
 * Ask the probe about files, in one run.
 *
 * One run rather than one per file, because the answers are only
 * worth reading together: an acceptance is silence, and what tells
 * silence from a probe that never reached the rule is a refusal
 * beside it out of the same process.
 *
 * @param paths - The files to ask about.
 * @returns How the run went, and what it said about each.
 */
function probeRun(paths: readonly string[]): ProbeRun {
  const run = spawnSync('bun', [PROBE_ENTRY, ...paths], { encoding: 'utf8' });

  if (run.status !== 0) {
    return {
      launch: `exit ${String(run.status)}: ${run.error?.message ?? ''}`
        + `${run.stderr ?? ''}`,
      verdicts: [],
    };
  }

  return { launch: PROBE_RAN, verdicts: JSON.parse(run.stdout) as string[] };
}

/** The one run both claims below read. */
const SPLICE_PROBE = probeRun([EMITTED_LIB, CONTROL_FILE]);

describe('the library a lib run writes — spliceable', () => {
  // Asserted apart from the verdicts, so a probe that could not be
  // launched at all reports that rather than an empty verdict list
  // failing a comparison about splicing.
  it('is judged by a probe that ran', () => {
    expect(SPLICE_PROBE.launch).toBe(PROBE_RAN);
  });

  // Both verdicts in one comparison, which is the only shape that
  // says anything: the acceptance is what this file is for, and the
  // refusal beside it is what says the acceptance was decided by
  // the rule rather than by a probe that never reached it.
  it('is accepted where the control beside it is refused', () => {
    expect(SPLICE_PROBE.verdicts)
      .toStrictEqual([SPLICEABLE, REFUSED_AS_IMPORT]);
  });
});

// ---------------------------------------------------------------------------
// The trio a source-adapter run writes
// ---------------------------------------------------------------------------

/**
 * An id the pattern accepts, in two words.
 *
 * Hyphenated for the reason {@link EMITTED_NAME} is: a single word
 * is spelled the same as a file stem and as an identifier, so a
 * trio emitted for one would agree about its subject however the
 * casing step behaved — including if it were not there at all.
 */
const ADAPTER_ID = 'sample-source';

/** The Pascal-case identifier {@link ADAPTER_ID} is spelled as. */
const ADAPTER_PASCAL = 'SampleSource';

/** Where the stamped module lands, relative to the target. */
const ADAPTER_PATH = `src/sources/${ADAPTER_ID}.ts`;

/** Where the cases beside it land. */
const ADAPTER_TEST_PATH = `src/sources/${ADAPTER_ID}.test.ts`;

/** Where the payload those cases read lands. */
const ADAPTER_PAYLOAD_PATH = `src/sources/${ADAPTER_ID}-payload.json`;

/** All three, in the order the generator emits them. */
const ADAPTER_PATHS: readonly string[] = [
  ADAPTER_PATH,
  ADAPTER_TEST_PATH,
  ADAPTER_PAYLOAD_PATH,
];

/** The one source-adapter emission every claim below reads. */
const ADAPTER_EMITTED = emitInto(ADAPTER_GENERATOR, ADAPTER_ID, 'accepted-id');

/** All three, absolute, as a run under that target writes them. */
const ADAPTER_ABSOLUTE_PATHS: readonly string[] = ADAPTER_PATHS
  .map((path) => join(ADAPTER_EMITTED.targetDir, path));

/** The module that emission wrote, by absolute path. */
const ADAPTER_MODULE = join(ADAPTER_EMITTED.targetDir, ADAPTER_PATH);

/** The case file it wrote beside it. */
const ADAPTER_TEST = join(ADAPTER_EMITTED.targetDir, ADAPTER_TEST_PATH);

/** The payload fixture it wrote beside both. */
const ADAPTER_PAYLOAD = join(
  ADAPTER_EMITTED.targetDir,
  ADAPTER_PAYLOAD_PATH,
);

/** The module, read back off the filesystem. */
const ADAPTER_MODULE_SOURCE = readFileSync(ADAPTER_MODULE, 'utf8');

/** The case file, read back the same way. */
const ADAPTER_TEST_SOURCE = readFileSync(ADAPTER_TEST, 'utf8');

/**
 * The payload fixture, read back and parsed.
 *
 * Typed as the envelope the generator writes rather than left
 * `unknown`, so the claims reading it need no cast apiece. What
 * actually holds it to that shape is the key-set case below.
 */
const ADAPTER_PAYLOAD_VALUE = JSON.parse(
  readFileSync(ADAPTER_PAYLOAD, 'utf8'),
) as Record<string, unknown>;

/**
 * Every member `SourceAdapter` declares, in the order the skeleton
 * declares them.
 *
 * Written out rather than derived: the contract is a type and
 * erases, so there is nothing at run time to read it off. That
 * makes this the one list a member added to the contract has to be
 * added to as well, and the case below is what reports a skeleton
 * that never grew it.
 */
const ADAPTER_MEMBERS: readonly string[] = [
  'id',
  'kind',
  'fetch',
  'parse',
  'toCanonical',
];

/**
 * A member of the adapter object the skeleton returns.
 *
 * Anchored to that object's own indent, which is what leaves the
 * options interface's properties two levels out and the
 * concatenated refusal message inside the module's helper outside
 * what this reads. Global, which `matchAll` requires.
 */
const MEMBER_PATTERN = /^ {4}(?:async )?(?<member>\w+)[(:]/gmu;

/**
 * Every member that object declares, in declaration order.
 *
 * @param source - The module's whole text.
 * @returns The member names it writes.
 */
function membersOf(source: string): readonly string[] {
  return [...source.matchAll(MEMBER_PATTERN)]
    .map((match) => match.groups?.member ?? '');
}

/**
 * A method of that object, with everything it declares about what
 * it answers: the `async` modifier if it carries one, then the
 * return type.
 *
 * The modifier is captured rather than skipped over, and that is
 * the whole point of the pattern. A member marked `async` while
 * declaring a plain return type is a type error, which nothing in
 * this suite runs — so a pattern reading past the keyword reports
 * `parse` unchanged after somebody made it await something.
 *
 * The methods are what this reads and the two value members are
 * not, which is what the argument list separates. No parameter list
 * here nests parentheses, so the lazy run to the closing one is
 * exact rather than approximate.
 */
const ANSWER_PATTERN =
  /^ {4}(?<modifier>async )?(?<member>\w+)\([^)]*\): (?<answer>[^{]+) \{$/gmu;

/**
 * What each of those methods declares it answers with.
 *
 * @param source - The module's whole text.
 * @returns One entry per method, keyed by member name.
 */
function answersOf(source: string): Record<string, string> {
  const declared: [string, string][] = [];

  for (const match of source.matchAll(ANSWER_PATTERN)) {
    declared.push([
      match.groups?.member ?? '',
      (match.groups?.modifier ?? '') + (match.groups?.answer ?? ''),
    ]);
  }

  return Object.fromEntries(declared);
}

/**
 * The relative import the emitted case file writes, which is the
 * one naming its subject.
 *
 * Picked by being relative rather than by position, for the reason
 * the `lib` section gives: the other three are the test runner and
 * two node builtins.
 */
const ADAPTER_COVERED_IMPORT = importsOf(ADAPTER_TEST_SOURCE)
  .find((entry) => entry.from.startsWith('.'));

/** How the emitted case file spells the fixture it opens. */
const FIXTURE_URL_PATTERN = /new URL\('(?<path>[^']+)'/u;

/** That path, or the empty string when the case file stopped
 * naming one — which fails the claim reading it rather than
 * resolving to somewhere plausible. */
const PAYLOAD_PATH_NAMED =
  FIXTURE_URL_PATTERN.exec(ADAPTER_TEST_SOURCE)?.groups?.path ?? '';

/** How that file guards the envelope key it goes on to read. */
const READ_KEY_PATTERN = /!\('(?<key>[^']+)' in stored\)/u;

/** The key it reads, or the empty string when the guard is gone. */
const PAYLOAD_KEY_READ =
  READ_KEY_PATTERN.exec(ADAPTER_TEST_SOURCE)?.groups?.key ?? '';

describe('the trio a source-adapter run writes', () => {
  // The layout, as three paths under the target. The payload is
  // emitted with the pair rather than left to whoever writes the
  // adapter, because the cases read it on their very first run: a
  // generator stopping at two files emits a suite that fails for a
  // reason having nothing to do with the adapter.
  it('writes the module, its cases and its payload, and nothing else', () => {
    expect(ADAPTER_EMITTED.written).toStrictEqual(ADAPTER_ABSOLUTE_PATHS);
  });

  // Every member of the contract, in order, off the object the
  // skeleton returns. A skeleton short of one is not caught by
  // anything else the generator does — it is the adapter written
  // from it that fails to satisfy the interface, long afterwards.
  it('declares every member of the adapter contract', () => {
    expect(membersOf(ADAPTER_MODULE_SOURCE)).toStrictEqual(ADAPTER_MEMBERS);
  });

  // The arrangement the stored-payload seam rests on, read off the
  // declared signatures: `fetch` is async and answers a promise,
  // and the other two answer values, so neither of them can await
  // anything. A claim about the shape rather than a proof of purity
  // — what it catches is a second awaiting member beside `fetch`.
  it('declares fetch as the only member answering a promise', () => {
    expect(answersOf(ADAPTER_MODULE_SOURCE)).toStrictEqual({
      fetch: `async Promise<${ADAPTER_PASCAL}Payload>`,
      parse: `${ADAPTER_PASCAL}Record[]`,
      toCanonical: 'CanonicalDocument',
    });
  });

  // The id is what the registry keys on and what a `sources` row
  // selects, so the operand an operator types has to reach the
  // module as a value and not only as a filename.
  it('carries the id it was given as a value in the module', () => {
    expect(ADAPTER_MODULE_SOURCE)
      .toContain(`const ADAPTER_ID = '${ADAPTER_ID}';`);
  });

  // The casing step, read from the end that lands in a signature.
  it('exports a factory named for that id', () => {
    expect(ADAPTER_MODULE_SOURCE)
      .toContain(`export function create${ADAPTER_PASCAL}(`);
  });

  it('imports that same factory in the case file beside it', () => {
    expect(ADAPTER_COVERED_IMPORT?.names).toBe(`create${ADAPTER_PASCAL}`);
  });

  // Resolved rather than compared as text, for the reason the `lib`
  // section gives: what is asserted is where the specifier LANDS.
  it('names the module beside it by a specifier that resolves', () => {
    const specifier = ADAPTER_COVERED_IMPORT?.from ?? '';
    const named = resolve(
      dirname(ADAPTER_TEST),
      specifier.replace(SPECIFIER_SUFFIX, '.ts'),
    );

    expect(named).toBe(ADAPTER_MODULE);
  });

  // And the third file, by the path the case file actually opens.
  // The fixture's suffix is one constant in `scripts/scaffold.ts`
  // that two of the three emissions read, so what this exists for
  // is one of them changing and the other not.
  it('names the payload fixture by a path that resolves', () => {
    expect(resolve(dirname(ADAPTER_TEST), PAYLOAD_PATH_NAMED))
      .toBe(ADAPTER_PAYLOAD);
  });
});

// ---------------------------------------------------------------------------
// The payload that run stores beside them
// ---------------------------------------------------------------------------

describe('the payload a source-adapter run writes', () => {
  // A header beside the payload rather than inside it. Every JSON
  // file this package commits carries a `_readme`, because a file
  // met on its own says nothing about which path owns it; but one
  // written into the payload would reach `parse` as though the
  // source had answered with it.
  it('writes a header beside the payload rather than inside it', () => {
    expect(Object.keys(ADAPTER_PAYLOAD_VALUE))
      .toStrictEqual(['_readme', 'payload']);
  });

  // No reply rather than a plausible one, for the reason every
  // other half of this generator's output throws: a fixture that
  // looked like an answer is one somebody can forget to replace.
  it('stores no reply at all under that payload', () => {
    expect(ADAPTER_PAYLOAD_VALUE.payload).toBeNull();
  });

  // The pairing between the fixture and the cases: the guard the
  // case file writes reads one key out of the envelope, and this is
  // the claim that the fixture is carrying the key it reads. A
  // guard naming a key nothing writes refuses on every run, over a
  // file the adapter itself never saw.
  it('carries the key the case file beside it reads', () => {
    expect(Object.keys(ADAPTER_PAYLOAD_VALUE)).toContain(PAYLOAD_KEY_READ);
  });
});

// ---------------------------------------------------------------------------
// The pair a migration run writes
// ---------------------------------------------------------------------------

/**
 * A name the pattern accepts, in two words.
 *
 * Hyphenated for the reason {@link EMITTED_NAME} is, and the casing
 * step it exercises is a third one: a migration tag is
 * underscore-separated where a command line is hyphenated, so a
 * single word would agree with itself however that step behaved.
 */
const MIGRATION_NAME = 'sample-migration';

/**
 * What that migration is known by: the placeholder index the
 * generator numbers with, then the name in a tag's own spelling.
 */
const MIGRATION_TAG = '9999_sample_migration';

/** Where the stamped migration lands, relative to the target. */
const MIGRATION_PATH = `drizzle/${MIGRATION_TAG}.sql`;

/** Where the journal entry beside it lands. */
const MIGRATION_ENTRY_PATH =
  `drizzle/meta/${MIGRATION_TAG}.journal-entry.json`;

/** Both, in the order the generator emits them. */
const MIGRATION_PATHS: readonly string[] = [
  MIGRATION_PATH,
  MIGRATION_ENTRY_PATH,
];

/** The one migration emission every claim below reads. */
const MIGRATION_EMITTED = emitInto(
  MIGRATION_GENERATOR,
  MIGRATION_NAME,
  'accepted-migration',
);

/** Both, absolute, as a run under that target writes them. */
const MIGRATION_ABSOLUTE_PATHS: readonly string[] = MIGRATION_PATHS
  .map((path) => join(MIGRATION_EMITTED.targetDir, path));

/** The migration that emission wrote, read back off the filesystem. */
const MIGRATION_SQL = readFileSync(
  join(MIGRATION_EMITTED.targetDir, MIGRATION_PATH),
  'utf8',
);

/** Its lines, which two claims below read one at a time. */
const MIGRATION_LINES: readonly string[] = MIGRATION_SQL.split('\n');

/** The envelope it wrote beside it, read back and parsed. */
const MIGRATION_ENVELOPE = JSON.parse(readFileSync(
  join(MIGRATION_EMITTED.targetDir, MIGRATION_ENTRY_PATH),
  'utf8',
)) as Record<string, unknown>;

/**
 * The journal entry under that envelope's one key.
 *
 * Typed through a cast rather than left `unknown`, for the reason
 * {@link ADAPTER_PAYLOAD_VALUE} is: the claims reading it would
 * otherwise need one apiece. What holds it to the shape is the
 * case below that compares it against the real journal.
 */
const MIGRATION_ENTRY = MIGRATION_ENVELOPE['entry'] as Record<string, unknown>;

/**
 * This package's own migration journal, read off disk.
 *
 * Resolved from this file's location rather than from the working
 * directory, which is what lets the suite be launched from the
 * package and from the repository root alike.
 */
const REAL_JOURNAL = JSON.parse(readFileSync(
  fileURLToPath(new URL('../../drizzle/meta/_journal.json', import.meta.url)),
  'utf8',
)) as { readonly entries: readonly Record<string, unknown>[] };

/** Every entry it holds, which the shape claims walk whole. */
const REAL_JOURNAL_ENTRIES = REAL_JOURNAL.entries;

/**
 * One entry's shape: every key it writes, with the type of the
 * value under it, sorted.
 *
 * Keys AND types, because either alone accepts something worth
 * failing — a key set alone accepts an entry whose `when` is a
 * string, and a type list alone accepts one whose keys are five
 * other words. Sorted, because JSON key order is not part of what
 * an entry means, and a drizzle release that reordered them would
 * otherwise redden a case over a file that still reads correctly.
 *
 * @param entry - A journal entry, real or emitted.
 * @returns One string per key, in a stable order.
 */
function shapeOf(entry: Record<string, unknown>): readonly string[] {
  return Object.entries(entry)
    .map(([key, value]) => `${key}: ${typeof value}`)
    .sort();
}

/**
 * The literal a migration file is split on.
 *
 * Written out here rather than imported, and for a stronger reason
 * than {@link USAGE_LINES} has: this string is drizzle's, not this
 * package's. Its migrator splits a file on this and on nothing
 * else, so a generator that drifted into another spelling emits
 * one long statement — and a case comparing the command's own
 * constant against itself would agree with the drift.
 */
const BREAKPOINT_MARKER = '--> statement-breakpoint';

/** What splitting the emitted migration on it yields. */
const MIGRATION_CHUNKS: readonly string[] =
  MIGRATION_SQL.split(BREAKPOINT_MARKER);

/**
 * A statement opening at the start of a line.
 *
 * Anchored, which is the whole of what it is for: an unanchored
 * pattern matches a statement that has been commented out exactly
 * as happily as one that will run. Global, which `matchAll`
 * requires.
 */
const STATEMENT_OPENER = /^DO \$\$$/gmu;

/**
 * How many statements a chunk opens at the start of a line.
 *
 * @param chunk - One piece of the split migration.
 * @returns The number of anchored openers it carries.
 */
function openersIn(chunk: string): number {
  return [...chunk.matchAll(STATEMENT_OPENER)].length;
}

/**
 * The journal the migrator reads, written into the emitted tree.
 *
 * The one move the entry's own header asks for, made here: the
 * emitted `entry` pasted into an `entries` array, under the real
 * journal's own header keys. Nothing else about the tree is
 * touched, so what the reader below is pointed at is what the
 * generator wrote plus the step it says to take.
 */
writeFileSync(
  join(MIGRATION_EMITTED.targetDir, 'drizzle/meta/_journal.json'),
  JSON.stringify({ ...REAL_JOURNAL, entries: [MIGRATION_ENTRY] }, null, 2),
  'utf8',
);

/** What drizzle's own migration reader makes of that tree. */
const READ_BACK = readMigrationFiles({
  migrationsFolder: join(MIGRATION_EMITTED.targetDir, 'drizzle'),
});

describe('the pair a migration run writes', () => {
  // The layout, as two paths under the target. The entry is
  // emitted with the migration rather than left to whoever writes
  // one, because a `.sql` file no journal entry names is a file
  // the migrator never opens — one that looks applied and has
  // never run.
  it('writes the migration and its journal entry, and nothing else', () => {
    expect(MIGRATION_EMITTED.written).toStrictEqual(MIGRATION_ABSOLUTE_PATHS);
  });

  // The tag is the load-bearing string of the whole shape: it
  // names the file AND is what the entry carries, and the migrator
  // resolves the second into the first. A generator spelling one
  // with hyphens and the other with underscores emits a pair that
  // makes the migrator throw before it applies anything.
  it('names the file for the tag the entry beside it carries', () => {
    expect(`drizzle/${String(MIGRATION_ENTRY['tag'])}.sql`)
      .toBe(MIGRATION_PATH);
  });

  // Two statements, one marker. Neither half implies the other: a
  // second marker would make this a three-statement file with an
  // empty statement in the middle, and none at all would join the
  // pair into one string the simple query protocol runs without
  // ever complaining.
  it('separates its two statements with exactly one marker', () => {
    expect(MIGRATION_CHUNKS.map((chunk) => chunk.trim() !== ''))
      .toStrictEqual([true, true]);
  });

  // On a line of its own, because the migrator splits on the
  // string wherever it sits. A marker trailing a line of SQL
  // splits mid-statement, and one quoted inside a comment splits
  // the header off as a statement — which is why the emitted
  // header explains the marker without ever writing it.
  it('writes that marker on a line of its own, once', () => {
    expect(MIGRATION_LINES.filter((line) => line === BREAKPOINT_MARKER))
      .toStrictEqual([BREAKPOINT_MARKER]);
  });

  // The claim splitting cannot make. Counting pieces counts
  // pieces, so a statement commented out leaves the count at two
  // while the database gets one — and that is the failure shape
  // with no signal anywhere: the migrator records the migration
  // applied, postgres does nothing, and every scan over the file
  // still finds every string it looks for.
  it('leaves a statement uncommented in each of them', () => {
    expect(MIGRATION_CHUNKS.map((chunk) => openersIn(chunk)))
      .toStrictEqual([1, 1]);
  });

  // Where that hazard comes from, closed at the source:
  // drizzle-kit's own custom template ends mid-line-comment, so an
  // append onto one lands inside the comment. A file ending past
  // its last statement, with a newline, has nothing an append can
  // land inside.
  it('ends with a newline, past its last statement', () => {
    const written = MIGRATION_LINES.filter((line) => line.trim() !== '');
    const terminated = MIGRATION_SQL.endsWith('\n');

    expect({ terminated, last: written.at(-1) })
      .toStrictEqual({ terminated: true, last: '$$;' });
  });
});

describe('that pair, read back by the migrator itself', () => {
  // The resolving claim, and what this section is really for.
  // Every claim above reads the file as text; this hands the tree
  // to `drizzle-orm`'s own reader, which resolves the entry's tag
  // into a filename, throws when it names nothing, and splits what
  // it finds there on the marker. Two statements out of it is the
  // pair being a pair, decided by the thing that will decide it in
  // production rather than by a pattern agreeing with one.
  it('resolves the entry to the file and splits it in two', () => {
    expect(READ_BACK.map((migration) => migration.sql.length))
      .toStrictEqual([2]);
  });
});

// ---------------------------------------------------------------------------
// The journal entry that run writes beside it
// ---------------------------------------------------------------------------

describe('the journal entry a migration run writes', () => {
  // A header beside the entry rather than inside it, for the
  // reason the payload fixture carries one that way: what goes
  // into the journal is the `entry` value exactly as it stands
  // here, and a `_readme` written into it would be a key the
  // journal does not have.
  it('writes a header beside the entry rather than inside it', () => {
    expect(Object.keys(MIGRATION_ENVELOPE)).toStrictEqual(['_readme', 'entry']);
  });

  // The shape claim, against this package's real journal rather
  // than against a copy of one. Walked over every entry that
  // journal holds, with the guard in front that stops an emptied
  // `entries` array making it vacuously true — two empty lists
  // compare equal, and this is the only case reading them.
  it('writes an entry shaped like every one the journal holds', () => {
    expect(REAL_JOURNAL_ENTRIES.length).toBeGreaterThan(0);

    const shapes = REAL_JOURNAL_ENTRIES.map((entry) => shapeOf(entry));

    expect(shapes)
      .toStrictEqual(REAL_JOURNAL_ENTRIES.map(() => shapeOf(MIGRATION_ENTRY)));
  });

  // The two members of that shape whose VALUE is a claim rather
  // than a placeholder. `version` is the journal format, and an
  // entry written on a format the journal has left is one drizzle
  // reads differently; `breakpoints` is what it writes beside
  // every migration it generates. Both read off the real journal
  // and compared against the emitted entry, so a release moving
  // either reddens here rather than in a migration.
  it('carries the format and the flag those entries carry', () => {
    const pinned = REAL_JOURNAL_ENTRIES
      .map((entry) => [entry['version'], entry['breakpoints']]);

    expect(pinned).toStrictEqual(REAL_JOURNAL_ENTRIES
      .map(() => [MIGRATION_ENTRY['version'], MIGRATION_ENTRY['breakpoints']]));
  });

  // And the two whose value is a placeholder, asserted as the
  // placeholders they are. Neither is decidable by a generator
  // that reaches no filesystem and reads no clock — the next index
  // is a property of the tree this will land in, the timestamp of
  // the moment it lands — so what they must not be is plausible.
  // The timestamp is the epoch, which is no time any migration was
  // written, and the index is one no tree can already hold.
  it('leaves the index and the timestamp visibly unfilled', () => {
    expect({ idx: MIGRATION_ENTRY['idx'], when: MIGRATION_ENTRY['when'] })
      .toStrictEqual({ idx: 9999, when: 0 });
  });

  // That index is spelled twice — once under `idx` and once inside
  // the tag — and renumbering has to move both. The generator
  // writing them from one constant is what leaves an operator one
  // number to change rather than two to keep in step.
  it('spells that index inside the tag as well', () => {
    expect(MIGRATION_ENTRY['tag'])
      .toBe(`${String(MIGRATION_ENTRY['idx'])}_sample_migration`);
  });
});
