/**
 * What `scripts/scaffold.ts` refuses, and what a `lib` run makes of
 * a name it accepts.
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
 * that is one claim about the class, not one per refusal.
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

/** The generator this file is about, as the registry keys it. */
const GENERATOR = 'lib';

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
const NO_NAME_PROBLEM = 'lib takes a name, and none followed it';

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
  // generator taking something other than a name says so here.
  it('refuses a generator with no name after it', () => {
    expect(refusedProblem(NO_NAME_ARGV)).toBe(NO_NAME_PROBLEM);
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
 * Stamp the `lib` pair into a fresh subdirectory of the fixture
 * root, through the parser rather than around it.
 *
 * A request is built the way a command line builds one, so what
 * these cases read is what `bun run scaffold lib <name> <dir>`
 * writes rather than what one function would emit if asked
 * directly.
 *
 * @param subdir - The subdirectory of the fixture root to stamp.
 * @returns Where it stamped and what it wrote there.
 */
function emitInto(subdir: string): Emission {
  const targetDir = join(FIXTURE_ROOT, subdir);
  const argv = [GENERATOR, EMITTED_NAME, targetDir];

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
const EMITTED = emitInto('accepted-name');

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
