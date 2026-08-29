/**
 * @packageDocumentation
 * The scaffold generator: the command that stamps out the file
 * shapes this package makes repeatedly, so a new module starts from
 * the conventions rather than from a blank file and somebody's
 * memory of them.
 *
 * Three parts, in the order a run reaches them.
 * {@link parseScaffoldArgs} reads a command line into a request and
 * refuses everything it cannot make one of — an unknown generator, a
 * missing operand, a name that is not a safe file stem. A generator
 * turns that request into files as VALUES: a path relative to the
 * target directory and the text to put there, with nothing written
 * and no directory touched. {@link writeScaffold} is the only half
 * that reaches the filesystem, and it goes there once every path it
 * was handed is known not to exist.
 *
 * That split is the one `scripts/seed.ts` draws between reading a
 * bundle and applying it, for the same reason. What a generator
 * emits is decidable with no filesystem at all, so a case drives it
 * by calling one function; and a refusal cannot half-write, because
 * a run that would overwrite anything writes nothing rather than
 * stopping partway with half a pair on disk.
 *
 * {@link GENERATORS} is the registry, keyed by the word an operator
 * types. A generator added there is reachable from the command line
 * and named by the usage line in the same edit — there is no second
 * list to update — and `scripts/README.md` carries the prose roster
 * saying what each one is for.
 *
 * What this deliberately does not know is the tree it writes into.
 * The target directory is an argument rather than a path resolved
 * off `import.meta.url`, so the same command stamps a package and a
 * throwaway fixture tree, and a case exercises the real generator
 * with no mock filesystem beneath it. It is also the safer default:
 * a command that resolved its own package root would write into the
 * repository whatever directory it was run from.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

/**
 * One file a generator emits.
 *
 * The path is relative to the target directory and always spelled
 * with forward slashes, because a generator declares a layout rather
 * than a location — `join` turns it into whatever the platform
 * writes. Keeping it relative is what lets the same emission be
 * asserted against a fixture tree and written into a package.
 */
export interface ScaffoldFile {
  /** Where the file goes, relative to the target directory. */
  readonly path: string;

  /** The whole text to write, newline-terminated. */
  readonly contents: string;
}

/**
 * One shape this command knows how to stamp.
 *
 * `generate` is a pure function of the name: no filesystem, no
 * clock, no target directory. Everything a generator decides is
 * therefore decidable in a test by calling it, and the only thing
 * that can differ between a fixture run and a real one is where the
 * files land.
 */
export interface ScaffoldGenerator {
  /** The word an operator types to reach this generator. */
  readonly name: string;

  /** What the name operand names, shown in the usage line. */
  readonly operand: string;

  /** One line for the usage listing, lower case, no full stop. */
  readonly summary: string;

  /** The files this generator emits for a given name. */
  readonly generate: (name: string) => readonly ScaffoldFile[];
}

/**
 * Where a spliceable library lives, relative to a package root.
 *
 * A constant rather than a literal inside the template because the
 * emitted test's import path is derived from it: the two are one
 * decision, and a directory moved in one place and not the other
 * emits a pair that does not resolve.
 */
const LIB_SOURCE_DIR = 'src/lib';

/**
 * Where a library's cases live, relative to a package root.
 *
 * Under `tests/` rather than beside the module, which is this
 * package's convention for `src/lib/` — `tests/lib/schedule.test.ts`
 * covers `src/lib/schedule.ts`, and this generator stamps the same
 * arrangement rather than choosing a new one for each library.
 */
const LIB_TEST_DIR = 'tests/lib';

/**
 * How far a library's test file sits from the library itself.
 *
 * Two levels up out of `tests/lib/`, then down into the source
 * directory. Written once, from the two constants above, so the
 * emitted import cannot disagree with the emitted layout.
 */
const LIB_TEST_TO_SOURCE = `../../${LIB_SOURCE_DIR}`;

/**
 * The identifier a file stem is spelled as in code.
 *
 * `yaml-lite` becomes `yamlLite`. The stem is already known to match
 * {@link NAME_PATTERN} by the time this is called — lower case,
 * digits and single hyphens — so there is no separator to guess at
 * and no casing to preserve.
 *
 * @param name - The file stem, as the command line gave it.
 * @returns The same words as one camel-case identifier.
 */
function toCamelCase(name: string): string {
  const [first = '', ...rest] = name.split('-');

  return first + rest
    .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * The library skeleton, as text.
 *
 * It carries the dual-context rules rather than pointing at them.
 * The rules are what makes a module under `src/lib/` different from
 * every other module in this package, and the moment somebody is
 * most likely to break one is while writing the file — which is
 * exactly when this text is in front of them. Two of the three are
 * refused by `assertSpliceable` in `scripts/workflow-markers.ts`;
 * the third is not refused anywhere, which is the reason it is
 * spelled out here at all.
 *
 * The export throws. A scaffold that answered something plausible
 * would be indistinguishable from a library that works, and the
 * calls written against it would pass; one that throws cannot be
 * mistaken for an implementation by anything that reaches it.
 *
 * @param name - The library's file stem.
 * @returns The whole of `src/lib/<name>.ts`.
 */
function libSource(name: string): string {
  const camel = toCamelCase(name);

  return `/**
 * @packageDocumentation
 * ${name} — one sentence saying what this library decides.
 *
 * Scaffolded by \`bun run scaffold lib ${name} <dir>\`, and a
 * scaffold until somebody replaces it: the export below throws, the
 * case beside it asserts that it throws, and both go when the
 * library is written.
 *
 * Dual-context, like every module under \`${LIB_SOURCE_DIR}/\`: the default
 * suite imports this file AND \`scripts/build-workflows.ts\` splices
 * its transpiled text into a Code node body, so one rule runs in two
 * places rather than two copies of it drifting apart. Three
 * constraints follow, and the build refuses the first two rather
 * than writing an artifact that fails on an instance.
 *
 * No value import: a specifier has nothing to resolve it on a node.
 * \`import type\` is not one — it erases before the build reads the
 * source — so a library may depend on as many types as it likes and
 * may not depend on one value.
 *
 * Declaration exports only. \`export function\`, \`const\`, \`class\`,
 * \`let\` and \`var\` have the keyword taken off and reach the node as
 * the declarations they already were, where the three re-export
 * forms name a module boundary that will not be there and that no
 * strip repairs.
 *
 * Nothing may rely on module scope: no \`require\`, no dynamic
 * import, no \`import.meta\`, and no state that outlives a call.
 * That third rule leaves a transpiler scan nothing to read, so it
 * is the one the build cannot refuse. What holds it is a round trip
 * under \`tests/build/\`, which builds a real artifact and runs the
 * spliced body under \`new Function\` with the globals a Code node
 * is given — no \`require\`, no \`module\`, and an \`import.meta\`
 * refused at construction.
 */

/**
 * Placeholder entry point, named for the module so the replacement
 * has somewhere obvious to go.
 *
 * @throws Error Always, until this function is replaced.
 */
export function ${camel}(): never {
  throw new Error(
    '${name} is a scaffold: replace ${camel} with the library ' +
    'this module is for, and replace the case beside it.',
  );
}
`;
}

/**
 * The case file that lands beside a scaffolded library.
 *
 * Its one case asserts that the module is still a scaffold, so it
 * reddens the moment somebody writes the library — which is the
 * point. A generated test that passed whatever the module did would
 * leave a new library covered by nothing while reporting a green
 * suite over it.
 *
 * @param name - The library's file stem.
 * @returns The whole of `tests/lib/<name>.test.ts`.
 */
function libTest(name: string): string {
  const camel = toCamelCase(name);

  return `/**
 * Cases for \`${LIB_SOURCE_DIR}/${name}.ts\`.
 *
 * Scaffolded by \`bun run scaffold lib ${name} <dir>\` and, like the
 * module it covers, a placeholder. The one case below asserts that
 * the library is still a scaffold, so it reddens the moment somebody
 * writes one — which is the reminder to write its cases here.
 *
 * House order when they arrive: what the library refuses first, then
 * the behaviour those refusals bound. Pin a case to the sentence a
 * refusal reports rather than to the fact that something was thrown,
 * so one guard cannot quietly absorb a neighbour's input.
 */
import { describe, expect, it } from 'vitest';

import { ${camel} } from '${LIB_TEST_TO_SOURCE}/${name}.js';

describe('${name}', () => {
  it('refuses until the scaffold is replaced', () => {
    expect(${camel}).toThrow('${name} is a scaffold');
  });
});
`;
}

/**
 * The generator behind `scaffold lib <name> <dir>`.
 *
 * Emits the pair rather than the module alone, because a library
 * under `src/lib/` with no case file is not a shape this package
 * has. What proves a library still behaves is the default suite,
 * and what proves the SPLICED copy of it behaves is a round trip
 * under `tests/build/`; a generator emitting only the source would
 * leave the first of those to memory.
 */
const LIB_GENERATOR: ScaffoldGenerator = {
  name: 'lib',
  operand: 'name',
  summary: 'a spliceable library under src/lib/ and its case file',
  generate: (name) => [
    { path: `${LIB_SOURCE_DIR}/${name}.ts`, contents: libSource(name) },
    { path: `${LIB_TEST_DIR}/${name}.test.ts`, contents: libTest(name) },
  ],
};

/**
 * Every generator this command can run, keyed by the word an
 * operator types.
 *
 * The registry is the single list: the parser looks a generator up
 * here, the usage line below is built from the same keys, and
 * `scripts/README.md` describes them in prose. Adding one is one
 * edit plus its row.
 *
 * Static rather than assembled by reading a directory, for the
 * reason `src/sources/index.ts` gives about its own registry: a list
 * built from what happens to be on disk turns adding a file into
 * arming a command, and here it would also mean the usage line named
 * generators nobody had reviewed.
 */
export const GENERATORS: Readonly<Record<string, ScaffoldGenerator>> = {
  [LIB_GENERATOR.name]: LIB_GENERATOR,
};

/**
 * What a name may look like: lower-case words, digits allowed after
 * the first character, joined by single hyphens.
 *
 * Narrow on purpose, because the name reaches a path. Everything a
 * traversal or an absolute write needs — a separator, a dot, a
 * leading hyphen, a drive letter — is outside it, so the refusal
 * lands on the argument rather than on whatever the filesystem made
 * of it. It also matches every library this package already has and
 * every one the port roster names, so the narrowness costs nothing
 * that has come up.
 *
 * The stem is used as an identifier too, by way of
 * {@link toCamelCase}, which is the other half of the same rule: a
 * name outside this pattern would produce a camel-case word that is
 * not a valid identifier, and the emitted file would fail to parse
 * rather than fail to be written.
 */
const NAME_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u;

/**
 * One generator's line in the usage listing.
 *
 * A declaration rather than an inline arrow because
 * `@stylistic/implicit-arrow-linebreak` forbids a newline between
 * `=>` and its expression, and this line does not fit beside one.
 *
 * @param generator - The registry entry to describe.
 * @returns Its indented line: the word, its operand, its summary.
 */
function usageLine(generator: ScaffoldGenerator): string {
  const spelling = `${generator.name} <${generator.operand}>`;

  return `  ${spelling} — ${generator.summary}`;
}

/**
 * How this command is spelled, shown by every refusal below.
 *
 * Built from {@link GENERATORS} rather than written out, so a
 * generator added to the registry is named here in the same edit and
 * a usage line cannot drift from what the parser accepts.
 * `scripts/approve.ts` carries the same arrangement for the same
 * reason.
 */
const USAGE = [
  'usage: scaffold <generator> <name> <target-dir>',
  '',
  'generators:',
  ...Object.values(GENERATORS).map(usageLine),
].join('\n');

/**
 * Thrown when the arguments name nothing this can stamp.
 *
 * A class of its own rather than a bare `Error`, so the entry point
 * below can tell a mistyped command line — which wants its message
 * and nothing else — from a failure inside a run, where the stack is
 * what a reader needs. `ApproveArgsError` in `scripts/approve.ts` is
 * the same arrangement.
 *
 * `USAGE` is appended here rather than by each refusal, so one added
 * later cannot forget to say what should have been typed.
 */
export class ScaffoldArgsError extends Error {
  /**
   * @param problem - What is wrong with the arguments, quoting the
   * offending word wherever there is one.
   */
  constructor(problem: string) {
    super(`${problem}\n${USAGE}`);
    this.name = this.constructor.name;
  }
}

/**
 * What a command line asked this tool to stamp, once it has been
 * read.
 *
 * The generator is carried as the registry entry rather than as the
 * word that found it, so nothing downstream looks it up a second
 * time and nothing can be handed a request naming a generator that
 * does not exist.
 */
export interface ScaffoldRequest {
  /** The generator the first word named. */
  readonly generator: ScaffoldGenerator;

  /** The file stem, already known to match {@link NAME_PATTERN}. */
  readonly name: string;

  /** The directory the emitted paths are relative to. */
  readonly targetDir: string;
}

/**
 * Read a command line into a request, or refuse it.
 *
 * Every refusal is here and none of them is downstream: by the time
 * a request exists, the generator is a registry entry and the name
 * is a safe stem, so {@link writeScaffold} has one thing left to
 * refuse and it is about the filesystem rather than about the
 * arguments.
 *
 * @param argv - The words after the script name.
 * @returns What to stamp, where.
 * @throws ScaffoldArgsError When the words name no generator, leave
 * a required operand out, carry an unusable name, or run on past the
 * three this reads.
 */
export function parseScaffoldArgs(argv: readonly string[]): ScaffoldRequest {
  const [generatorName, name, targetDir, ...extra] = argv;

  if (generatorName === undefined) {
    throw new ScaffoldArgsError('no generator given');
  }

  const generator = GENERATORS[generatorName];

  if (generator === undefined) {
    throw new ScaffoldArgsError(`unknown generator '${generatorName}'`);
  }

  if (name === undefined) {
    throw new ScaffoldArgsError(
      `${generatorName} takes a ${generator.operand}, and none ` +
      'followed it',
    );
  }

  if (!NAME_PATTERN.test(name)) {
    throw new ScaffoldArgsError(
      `'${name}' is not a usable ${generator.operand}: lower-case ` +
      'words, digits after the first character, single hyphens ' +
      'between them, and nothing that could reach a path',
    );
  }

  if (targetDir === undefined) {
    throw new ScaffoldArgsError('no target directory given');
  }

  if (extra.length > 0) {
    throw new ScaffoldArgsError(
      `${extra.length} argument(s) followed the target directory`,
    );
  }

  return { generator, name, targetDir };
}

/**
 * Thrown when stamping would overwrite something that is there.
 *
 * The whole point of the refusal is that a scaffold is a starting
 * point: a second run over a library somebody has since written
 * would replace it with a throwing placeholder, and the loss would
 * be silent — the emitted pair is well-formed, the suite goes red on
 * the scaffold's own case, and nothing says the file used to be
 * something else.
 *
 * Every colliding path is carried, not the first, because a rerun
 * usually collides on both halves of a pair and an operator acting
 * on one path at a time would come straight back.
 */
export class ScaffoldWriteError extends Error {
  /** Every path that already exists, absolute, in emission order. */
  readonly paths: readonly string[];

  /**
   * @param paths - The paths that already exist.
   */
  constructor(paths: readonly string[]) {
    super(
      `refusing to overwrite ${paths.length} existing file(s):\n` +
      paths.map((path) => `  ${path}`).join('\n'),
    );
    this.name = this.constructor.name;
    this.paths = paths;
  }
}

/**
 * Stamp a request onto the filesystem.
 *
 * Every path is checked before any is written, so a request that
 * collides leaves the directory exactly as it found it. Checking as
 * it went would write the first half of a pair and then refuse the
 * second, which is the state hardest to read afterwards: half a
 * module, from a command that reported a failure.
 *
 * Parent directories are created as needed, which is what lets the
 * same call stamp a package that has `src/lib/` already and a
 * fixture tree that has nothing at all.
 *
 * @param request - What to stamp, as {@link parseScaffoldArgs} read
 * it.
 * @returns Every path written, absolute, in emission order.
 * @throws ScaffoldWriteError When any path already exists, which is
 * before a byte is written.
 */
export function writeScaffold(request: ScaffoldRequest): readonly string[] {
  const files = request.generator.generate(request.name);
  const paths = files.map((file) => join(request.targetDir, file.path));
  const existing = paths.filter((path) => existsSync(path));

  if (existing.length > 0) {
    throw new ScaffoldWriteError(existing);
  }

  return files.map((file, index) => {
    const path = paths[index] ?? join(request.targetDir, file.path);

    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, file.contents, 'utf8');

    return path;
  });
}

/**
 * Read a command line and stamp what it asked for.
 *
 * The two halves in one call, and the only place they meet. What it
 * prints is the paths it wrote, one per line, because that is what
 * an operator does next — open them.
 *
 * @param argv - The words after the script name. Defaults to what
 * this process was given.
 * @returns Every path written, absolute.
 * @throws ScaffoldArgsError When the arguments name nothing this can
 * stamp, which is before the filesystem is touched at all.
 * @throws ScaffoldWriteError When stamping would overwrite a file.
 */
export function runScaffoldCli(
  argv: readonly string[] = process.argv.slice(2),
): readonly string[] {
  const written = writeScaffold(parseScaffoldArgs(argv));

  for (const path of written) {
    console.log(path);
  }

  return written;
}

/**
 * Whether this file is what the process was started with, rather
 * than something another module imported.
 *
 * `import.meta.url` is a `file:` URL where `process.argv[1]` is a
 * path, so comparing the two as they come is false however the
 * process was started, and the block below would silently never run.
 * `fileURLToPath` is what makes the comparison able to hold at all.
 * `scripts/seed.ts` and `scripts/approve.ts` carry the same guard.
 *
 * Worth asking because this module is both a command and a library:
 * `bun run scaffold lib parse-csv .` stamps a pair, while a test
 * importing {@link parseScaffoldArgs} or {@link writeScaffold} gets
 * the exports and stamps nothing.
 */
const INVOKED_AS_CLI = process.argv[1] !== undefined
  && fileURLToPath(import.meta.url) === process.argv[1];

if (INVOKED_AS_CLI) {
  try {
    runScaffoldCli();
  } catch (cause) {
    // Both of these are reports rather than faults in this tool — a
    // command line nobody can read, and a request that would destroy
    // something — so the message is the whole of what a reader
    // needs and a stack above it buries the thing worth reading.
    // Anything else is unexpected, and there the stack is what a
    // reader needs.
    process.exitCode = 1;
    console.error(
      cause instanceof ScaffoldArgsError || cause instanceof ScaffoldWriteError
        ? cause.message
        : cause,
    );
  }
}
