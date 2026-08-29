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
 * Where a source adapter lives, relative to a package root.
 *
 * One directory holds all three files an adapter is: the module, its
 * cases and the payload they read. `src/lib/` splits its pair across
 * two trees because a spliceable library is read by the build as
 * well as by the suite, and an adapter is read by neither — so the
 * whole shape sits in one place, and whoever opens the module has
 * the other two in front of them.
 */
const SOURCE_DIR = 'src/sources';

/**
 * What a stored payload's filename ends in, after the adapter's id.
 *
 * A constant for the reason {@link LIB_TEST_TO_SOURCE} is one: the
 * emitted case file resolves this path to read the fixture, so the
 * name the generator writes and the name the cases open are one
 * decision rather than two spellings that can drift apart.
 */
const PAYLOAD_SUFFIX = '-payload.json';

/**
 * Where a migration lands, relative to a package root.
 *
 * The directory `drizzle.config.ts` names as its `out`, and where
 * `drizzle-kit` writes the migrations it generates. A hand-written
 * one is not a file beside that tree but a full member of it, which
 * is what the journal entry below is for.
 */
const MIGRATION_DIR = 'drizzle';

/** Where the journal and the snapshots sit, under that directory. */
const MIGRATION_META_DIR = `${MIGRATION_DIR}/meta`;

/**
 * The journal: the list the migrator walks, and the only thing that
 * makes a `.sql` file under `drizzle/` a migration at all.
 *
 * A constant because the emitted entry's own header points a reader
 * at it, so the path this generator writes into a file and the path
 * it lays its files out around are one decision.
 */
const JOURNAL_PATH = `${MIGRATION_META_DIR}/_journal.json`;

/**
 * What an emitted journal entry's filename ends in, after the tag.
 *
 * The entry is emitted as a file of its own rather than spliced
 * into {@link JOURNAL_PATH}, because splicing is editing and
 * {@link writeScaffold} writes nothing it would have to overwrite.
 * So the entry lands as an envelope holding itself and the
 * instructions for moving it, and what reads it is a person.
 */
const JOURNAL_ENTRY_SUFFIX = '.journal-entry.json';

/**
 * The index an emitted migration is numbered with.
 *
 * A placeholder, chosen to be one no tree can already hold: drizzle
 * numbers from `0000` upwards and this package is in the low single
 * digits, so this is unmistakable in a listing and sorts to the end
 * of one. What it stands in for is not decidable here — the next
 * index is a property of the `drizzle/` tree and a generator
 * reaches no filesystem — so both emitted files say to renumber,
 * and the number they carry meanwhile cannot be read as an answer.
 *
 * A string, because it is first of all a filename component. It is
 * interpolated unquoted into the entry below, where `idx` is a
 * number, so the two spellings of one index stay one constant.
 */
const MIGRATION_INDEX = '9999';

/**
 * The journal format this package is on, as every entry in
 * {@link JOURNAL_PATH} carries it.
 *
 * A string rather than a number, which is how drizzle writes it.
 * Pinned here so an emitted entry is the shape the journal already
 * holds, and held against the real journal by
 * `tests/scripts/scaffold.test.ts` — so a drizzle release that
 * moved the format reddens there rather than in a migration
 * somebody has just written.
 */
const JOURNAL_VERSION = '7';

/**
 * The one thing that splits a migration into statements.
 *
 * Measured in `drizzle-orm/migrator.js`: the migrator reads the
 * file whole and splits it on this literal and on nothing else. Two
 * consequences the emitted file is arranged around. A `;` inside a
 * dollar-quoted body needs no escaping, because it is not a
 * splitter; and a second statement with no marker in front of it
 * reaches the driver joined to the first, which the simple query
 * protocol runs without complaint.
 *
 * The journal's `breakpoints` flag does not gate this. The split
 * happens before the flag is looked at, and the postgres dialect
 * iterates the already-split list without ever reading it.
 */
const STATEMENT_BREAKPOINT = '--> statement-breakpoint';

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
 * The identifier a file stem is spelled as when it names a type.
 *
 * `html-text` becomes `HtmlText`. Built from {@link toCamelCase}
 * with its first letter raised rather than from a second pass over
 * the stem, so the two spellings of one name cannot disagree about
 * where its words are.
 *
 * @param name - The file stem, as the command line gave it.
 * @returns The same words as one Pascal-case identifier.
 */
function toPascalCase(name: string): string {
  const camel = toCamelCase(name);

  return camel.slice(0, 1).toUpperCase() + camel.slice(1);
}

/**
 * The spelling a file stem takes inside a migration tag.
 *
 * `category-depth-guard` becomes `category_depth_guard`. Every tag
 * under `drizzle/` is underscore-separated, drizzle's own generated
 * names included, and a name reaching here already matches
 * {@link NAME_PATTERN} — so hyphens are the only separator there
 * is and nothing else has to be recognised.
 *
 * @param name - The file stem, as the command line gave it.
 * @returns The same words joined by underscores.
 */
function toSnakeCase(name: string): string {
  return name.split('-').join('_');
}

/**
 * What a migration is known by: its index and its name, as one
 * word.
 *
 * The load-bearing string of the whole shape. It names the `.sql`
 * file, the journal entry carries it, and the migrator resolves the
 * second into the first — an entry whose tag names no file makes
 * `bun run db:migrate` throw before it applies anything at all.
 * Built once here, so the file this generator writes and the tag
 * the entry beside it claims cannot disagree.
 *
 * @param name - The file stem, as the command line gave it.
 * @returns The tag, index and all.
 */
function migrationTag(name: string): string {
  return `${MIGRATION_INDEX}_${toSnakeCase(name)}`;
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
 * The adapter skeleton, as text.
 *
 * Arranged around the two rules `src/sources/index.ts` argues for,
 * because a skeleton is where they are obeyed or lost. `fetch` is
 * the only member that does I/O, so `parse` and `toCanonical` can
 * be driven over a payload stored on disk and the cases beside the
 * module need nothing standing up; and the configuration binds at
 * construction rather than per call, so `parse` stays a function of
 * the payload alone.
 *
 * Every member throws, for the reason {@link libSource} gives: a
 * placeholder that answered something plausible would be
 * indistinguishable from an adapter that works, and the calls
 * written against it would pass.
 *
 * @param name - The adapter's id, which is also its file stem.
 * @returns The whole of `src/sources/<id>.ts`.
 */
function sourceAdapterSource(name: string): string {
  const pascal = toPascalCase(name);

  return `/**
 * @packageDocumentation
 * ${name} — one sentence saying which source this fronts.
 *
 * Scaffolded by \`bun run scaffold source-adapter ${name} <dir>\`,
 * and a scaffold until somebody replaces it: every member below
 * throws, the cases beside it assert that they throw, and both go
 * when the adapter is written.
 *
 * The contract is \`SourceAdapter\` in \`${SOURCE_DIR}/index.ts\`, and
 * two of its rules are what this skeleton is arranged around.
 *
 * \`fetch\` is the only member that does I/O. \`parse\` and
 * \`toCanonical\` are pure — no network, no clock, no filesystem —
 * which is what lets both be driven over a payload stored on disk,
 * and why the cases beside this file need nothing standing up. An
 * adapter that reached the endpoint from \`parse\` would pass its
 * cases the day it was written and fail them the first time it ran
 * offline.
 *
 * Configuration binds at construction rather than per call. The
 * endpoint and the \`parser_config\` of the \`sources\` row this
 * adapter was reached through are handed to the factory once, so one
 * adapter type serves every row of its kind with only its
 * construction differing, and \`parse\` stays a function of the
 * payload alone.
 *
 * Nothing here scores, decides or stores. An adapter answers with
 * captured material; what is made of it belongs to its caller.
 */
import type {
  CanonicalDocument,
  SourceAdapter,
  SourceKind,
} from './index.js';

/**
 * This adapter's id: stable, and unique across the registry in
 * \`${SOURCE_DIR}/index.ts\`. Spelled as the file stem, so the module
 * a reader opens and the id a \`sources\` row selects are one word.
 */
const ADAPTER_ID = '${name}';

/**
 * Which transport family this adapter fronts, and the \`kind\` every
 * \`sources\` row it can be constructed for carries.
 *
 * A placeholder. The set is \`SOURCE_KINDS\` in
 * \`src/db/schema/values.ts\` — the same tuple the \`sources.kind\`
 * CHECK is generated from — and the annotation holds this to a
 * member of it, so a kind that is not one is a type error rather
 * than a row this adapter is never selected for.
 */
const ADAPTER_KIND: SourceKind = 'url';

/**
 * The payload this source answers with: exactly what \`fetch\`
 * returns, and exactly what \`documents.raw\` stores.
 *
 * \`unknown\` until somebody names it, and the first edit this module
 * wants. Every member below is typed through it, so the shape lands
 * in one place rather than in three signatures.
 */
export type ${pascal}Payload = unknown;

/**
 * One record \`parse\` pulls out of a payload, before anything has
 * been mapped onto a \`documents\` row.
 *
 * Separate from the canonical shape on purpose: extraction and
 * canonicalization are two steps, and a payload carrying fields no
 * column takes is the ordinary case rather than the odd one.
 */
export type ${pascal}Record = unknown;

/**
 * What one adapter of this kind is constructed with: the \`sources\`
 * row it fronts, in the two parts an adapter reads.
 *
 * Bound once rather than threaded through each call, which is the
 * contract's own decision — a \`parse\` depending on two inputs
 * would cost the stored-payload seam its cases rest on.
 */
export interface ${pascal}Options {
  /**
   * Where this source is read: the row's endpoint, and the only
   * address \`fetch\` may open.
   */
  readonly endpoint: string;

  /**
   * The row's \`parser_config\` — selectors, paths, a field map:
   * data this module executes, never code it runs.
   */
  readonly parserConfig: unknown;
}

/**
 * The refusal every member below raises.
 *
 * It names the member and what that member was reached with, so a
 * run that lands on a scaffold reports which step it stopped at
 * rather than that something somewhere threw.
 *
 * @param member - The member that was called.
 * @param saw - What it was called with, in a few words.
 * @returns The error to throw.
 */
function unwritten(member: string, saw: string): Error {
  return new Error(
    ADAPTER_ID + ' is a scaffold: ' + member + ' was reached with ' +
    saw + ', and there is nothing here to answer with. Replace ' +
    'this module and the cases beside it.',
  );
}

/**
 * Construct the adapter for one \`sources\` row.
 *
 * @param options - That row's endpoint and parser configuration.
 * @returns The adapter, ready to be fetched from.
 */
export function create${pascal}(
  options: ${pascal}Options,
): SourceAdapter<${pascal}Payload, ${pascal}Record> {
  return {
    id: ADAPTER_ID,
    kind: ADAPTER_KIND,

    /**
     * Retrieve the source's own payload. The only member that does
     * I/O, and the only one that touches the endpoint above.
     */
    async fetch(): Promise<${pascal}Payload> {
      throw unwritten('fetch', 'endpoint ' + options.endpoint);
    },

    /**
     * Extract records from a payload, under the configuration bound
     * above. Pure: no I/O, no clock, no network.
     */
    parse(raw: ${pascal}Payload): ${pascal}Record[] {
      throw unwritten('parse', 'a payload of type ' + typeof raw);
    },

    /**
     * Map one extracted record onto the canonical shape. Pure, and
     * the only member that has to know what a \`documents\` row
     * holds — every member of \`CanonicalDocument\` is produced here
     * or nowhere.
     */
    toCanonical(parsed: ${pascal}Record): CanonicalDocument {
      throw unwritten('toCanonical', 'a record of type ' + typeof parsed);
    },
  };
}
`;
}

/**
 * The case file that lands beside a scaffolded adapter.
 *
 * Colocated rather than under `tests/`, which is this package's
 * convention wherever a module's cases are about that module alone
 * — `src/cron/cron.test.ts` and `src/notifications/dispatch.test.ts`
 * are the precedent — and it also puts the module, its cases and the
 * payload they read in one directory listing.
 *
 * Its cases assert the scaffold refusals, so they redden the moment
 * the adapter is written; what outlives them is the arrangement.
 * `parse` is driven over a payload read off disk, which is the seam
 * that keeps an adapter's cases in the fully isolated default suite.
 *
 * @param name - The adapter's id, which is also its file stem.
 * @returns The whole of `src/sources/<id>.test.ts`.
 */
function sourceAdapterTest(name: string): string {
  const pascal = toPascalCase(name);

  return `/**
 * Cases for \`${SOURCE_DIR}/${name}.ts\`.
 *
 * Scaffolded by \`bun run scaffold source-adapter ${name} <dir>\`
 * and, like the module it covers, a placeholder. Each case below
 * asserts that the adapter is still a scaffold, so they redden the
 * moment somebody writes one — which is the reminder to write real
 * cases here.
 *
 * What the arrangement is FOR outlives the placeholders. \`parse\`
 * is driven over a payload read off disk rather than over one
 * fetched, and that is the seam keeping this file in the fully
 * isolated default suite: no network, no credentials, nothing to
 * stand up. \`fetch\` is the one member that would need any of
 * those, and it is asked only to refuse.
 *
 * House order when the real cases arrive: what the adapter refuses
 * first — a payload it cannot read, a record carrying nothing a
 * \`documents\` row takes — then the extraction those refusals
 * bound.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { create${pascal} } from './${name}.js';

/**
 * The stored payload these cases drive \`parse\` over.
 *
 * Resolved from this file's own location rather than from the
 * working directory: the suite is launched from the package and
 * from the repository root alike, and only one of those makes a
 * relative path name it.
 */
const PAYLOAD_PATH = fileURLToPath(
  new URL('./${name}${PAYLOAD_SUFFIX}', import.meta.url),
);

/**
 * What that file records, as \`fetch\` would have returned it.
 *
 * The fixture is an envelope and this reads the one key under it: a
 * header written into the payload itself would be handed to
 * \`parse\` as though the source had answered with it.
 *
 * @returns The payload the fixture stores.
 * @throws Error When the file is no longer an envelope holding one,
 * naming the file — a fixture edited into a shape nothing reads is
 * otherwise a refusal from the adapter about an input it never got.
 */
function storedPayload(): unknown {
  const stored: unknown = JSON.parse(readFileSync(PAYLOAD_PATH, 'utf8'));

  if (typeof stored !== 'object' || stored === null) {
    throw new Error(PAYLOAD_PATH + ' does not hold a JSON object');
  }

  if (!('payload' in stored)) {
    throw new Error(PAYLOAD_PATH + ' holds no payload key');
  }

  return stored.payload;
}

/** The adapter these cases drive, constructed as a row would. */
const ADAPTER = create${pascal}({
  endpoint: 'https://example.invalid/${name}',
  parserConfig: {},
});

/** What every member refuses with while this is a scaffold. */
const SCAFFOLD_REFUSAL = '${name} is a scaffold';

describe('${name} — what it says it is', () => {
  // The two members the registry reads. Both are placeholders, and
  // this is the case that notices either one being set.
  it('carries the id and the kind it is registered under', () => {
    expect({ id: ADAPTER.id, kind: ADAPTER.kind })
      .toStrictEqual({ id: '${name}', kind: 'url' });
  });
});

describe('${name} — a scaffold until it is written', () => {
  // The one member that would open a socket, and the reason the two
  // below it run with nothing standing up. Awaited as a rejection
  // rather than caught as a throw: it is the async member, and a
  // case reading it synchronously passes whatever it does.
  it('refuses to fetch', async () => {
    await expect(ADAPTER.fetch()).rejects.toThrow(SCAFFOLD_REFUSAL);
  });

  // The stored-payload seam, driven the way every later case here
  // will be: a payload read off disk, handed to a pure function,
  // with no network anywhere in the call.
  it('refuses to parse the stored payload', () => {
    expect(() => ADAPTER.parse(storedPayload())).toThrow(SCAFFOLD_REFUSAL);
  });

  it('refuses to canonicalize a record', () => {
    expect(() => ADAPTER.toCanonical(null)).toThrow(SCAFFOLD_REFUSAL);
  });
});
`;
}

/**
 * The stored payload that lands beside a scaffolded adapter.
 *
 * An envelope rather than the payload alone. A fixture met on its
 * own says nothing about which path owns it, which is why every
 * JSON file this package commits carries a `_readme`; but a header
 * written into the payload would be handed to `parse` as though the
 * source had answered with it, so the header sits beside the payload
 * instead of inside it.
 *
 * The payload is `null`, which is not a reply any source gives. A
 * plausible one would be a fixture somebody could forget to
 * replace.
 *
 * @param name - The adapter's id, which is also its file stem.
 * @returns The whole of `src/sources/<id>-payload.json`.
 */
function sourceAdapterPayload(name: string): string {
  return `{
  "_readme": [
    "PAYLOAD FIXTURE for \`${SOURCE_DIR}/${name}.ts\`.",
    "",
    "One reply from the source that adapter fronts, stored as its",
    "\`fetch\` returned it, so \`parse\` and \`toCanonical\` can be",
    "driven over it with no network — which is what keeps the cases",
    "beside that module in the fully isolated default suite.",
    "",
    "An envelope, not the payload itself: everything the adapter is",
    "handed sits under \`payload\`, and this key does not. A header",
    "written into the payload would reach \`parse\` as though the",
    "source had answered with it.",
    "",
    "Scaffolded, and a placeholder — \`payload\` is null, which is no",
    "reply at all. Replace it with one the source really gave,",
    "trimmed to what a case needs and carrying nothing personal: a",
    "fixture is committed, and a payload pasted in whole is the",
    "easiest way to commit somebody else's data by accident."
  ],
  "payload": null
}
`;
}

/**
 * The generator behind `scaffold source-adapter <id> <dir>`.
 *
 * Three files rather than two. The module and its cases are the pair
 * every generator here emits; the payload is what makes that pair
 * runnable in a suite with no network, and a generator emitting the
 * cases without it would emit a file that fails on its first run
 * for a reason having nothing to do with the adapter.
 *
 * The operand is an id rather than a name, and that word reaches the
 * refusals: `SourceAdapter.id` is what the registry keys on and what
 * a `sources` row selects, so what an operator is asked for is the
 * thing the module will be known by.
 */
const SOURCE_ADAPTER_GENERATOR: ScaffoldGenerator = {
  name: 'source-adapter',
  operand: 'id',
  summary: 'an adapter under src/sources/, cases and payload',
  generate: (name) => [
    { path: `${SOURCE_DIR}/${name}.ts`, contents: sourceAdapterSource(name) },
    {
      path: `${SOURCE_DIR}/${name}.test.ts`,
      contents: sourceAdapterTest(name),
    },
    {
      path: `${SOURCE_DIR}/${name}${PAYLOAD_SUFFIX}`,
      contents: sourceAdapterPayload(name),
    },
  ],
};

/**
 * The migration skeleton, as text.
 *
 * Two statements with one {@link STATEMENT_BREAKPOINT} between
 * them, which is the arrangement the whole shape exists for: a
 * hand-written migration is almost always an object and the thing
 * that attaches it, and the marker between the two is what nobody
 * remembers. Emitting one statement would emit the case that needs
 * no marker and leave the case that does to memory.
 *
 * Both statements raise, for the reason {@link libSource} gives
 * about its throwing export. A placeholder that applied cleanly
 * would be indistinguishable from a migration that had done
 * something, and the migrator would record it as applied.
 *
 * The header quotes no marker. A comment carrying that literal
 * splits the file exactly as the marker does, because the migrator
 * splits on the string and knows nothing about comments — so a
 * header explaining the marker by quoting it would silently make
 * this a three-statement file.
 *
 * Newline-terminated, unlike drizzle-kit's own `--custom` template,
 * which ends mid-line-comment. An append onto that template lands
 * inside the comment, where it is applied by nothing, reported by
 * nothing and still found by every scan that greps the file for it.
 *
 * @param name - The migration's file stem.
 * @returns The whole of `drizzle/<tag>.sql`.
 */
function migrationSource(name: string): string {
  const tag = migrationTag(name);

  return `-- ${tag} -- one sentence saying what this does.
--
-- Hand-written on purpose, which is the only reason this shape
-- exists: DDL that src/db/schema.ts cannot express -- a trigger, a
-- function, a COMMENT ON -- and that bun run db:generate will
-- therefore never write, never diff, and never propose dropping.
--
-- Scaffolded by \`bun run scaffold migration ${name} <dir>\`,
-- and a scaffold until somebody replaces it. Both statements
-- below raise, so a tree still carrying this file fails its own
-- migration and names it; one that succeeded quietly would be
-- indistinguishable from a migration that had done something.
--
-- THREE THINGS THIS FILE IS NOT YET, none of them decidable by a
-- generator that reaches no filesystem and reads no clock.
--
-- The index. ${MIGRATION_INDEX} is a placeholder, not the next number.
-- Renumber the filename and the tag in the entry beside it
-- together: the migrator resolves the tag into the filename, and
-- throws when it finds nothing there.
--
-- The timestamp. The entry's \`when\` is 0, which is no time any
-- migration was written.
--
-- The snapshot. drizzle-kit generate --custom writes three
-- artifacts where this generator writes two: ${MIGRATION_META_DIR}/ also
-- wants a <nnnn>_snapshot.json, which is the previous snapshot with
-- a fresh id chained onto it. Left absent rather than guessed --
-- absent is loud, where a wrong one is a generated diff proposing
-- to drop everything the snapshot does not model.
--
-- Two rules about the text below, both read off the migrator
-- rather than assumed. It splits this file on the marker between
-- the statements and on nothing else: a semicolon inside a
-- dollar-quoted body needs no escaping, a statement added with no
-- marker in front of it reaches the driver joined to its
-- neighbour, and a comment quoting that marker splits the file
-- exactly as the marker does. And the entry's breakpoints flag
-- gates none of it -- the split happens first, and the postgres
-- dialect never reads the flag at all.

-- The object. A function, a view, a constraint the schema DSL has
-- no word for. One statement, however many semicolons its body
-- carries.
DO $$
BEGIN
\tRAISE EXCEPTION 'migration ${tag} is a scaffold'
\t\tUSING HINT = 'Replace both statements with the DDL this '
\t\t\t|| 'migration is for, or delete it and its journal entry.';
END;
$$;
${STATEMENT_BREAKPOINT}
-- What attaches it. A trigger on a table, a grant, a comment: the
-- half that gives the object above teeth, and the reason a
-- hand-written migration usually has two statements rather than
-- one. Match its idempotency to the statement above -- a CREATE OR
-- REPLACE followed by a bare CREATE re-applies halfway, and then
-- dies.
DO $$
BEGIN
\tRAISE EXCEPTION 'migration ${tag} is a scaffold'
\t\tUSING HINT = 'The second statement is here so the marker '
\t\t\t|| 'above it is, which is all that splits this file.';
END;
$$;
`;
}

/**
 * The journal entry that lands beside a scaffolded migration.
 *
 * An envelope, for the reason {@link sourceAdapterPayload} is one:
 * a file met on its own says nothing about which path owns it, and
 * a header written into the entry would be a key the journal does
 * not have. So the header sits beside the entry rather than inside
 * it, and what goes into `_journal.json` is the `entry` value
 * exactly as it stands here.
 *
 * A file rather than an edit to the journal, because an edit is an
 * overwrite and {@link writeScaffold} refuses those — which is not
 * a limitation worked around here but the rule that makes a rerun
 * safe. Moving the entry is a person's, and the header says so.
 *
 * @param name - The migration's file stem.
 * @returns The whole of `drizzle/meta/<tag>.journal-entry.json`.
 */
function migrationJournalEntry(name: string): string {
  const tag = migrationTag(name);

  return `{
  "_readme": [
    "JOURNAL ENTRY for \`${MIGRATION_DIR}/${tag}.sql\`.",
    "",
    "Read by nothing. \`${JOURNAL_PATH}\` is the list the",
    "migrator walks, and a .sql file no entry there names is one it",
    "never opens -- so this envelope holds the entry that migration",
    "needs, and moving it is a person's.",
    "",
    "Paste \`entry\` into that journal's \`entries\` array, last, and",
    "delete this file. Then fix what a generator could not decide:",
    "\`idx\` becomes the next index after the entry above it, \`when\`",
    "becomes a millisecond timestamp, and \`tag\` is renumbered to",
    "match -- along with the .sql file itself, because the migrator",
    "resolves the tag into that filename and throws when it finds",
    "nothing there.",
    "",
    "\`breakpoints\` is true, as every entry in that journal is. On",
    "postgres it is inert: the migrator splits a migration on the",
    "statement marker before this flag is looked at, and the",
    "postgres dialect never reads it. It is written true anyway, so",
    "the entry is the shape the journal already holds."
  ],
  "entry": {
    "idx": ${MIGRATION_INDEX},
    "version": "${JOURNAL_VERSION}",
    "when": 0,
    "tag": "${tag}",
    "breakpoints": true
  }
}
`;
}

/**
 * The generator behind `scaffold migration <name> <dir>`.
 *
 * The pair rather than the `.sql` alone, because a migration file
 * with no journal entry is not a migration: the migrator walks the
 * journal, so a file no entry names is one it never opens, and a
 * generator stopping at the SQL would emit something that looks
 * applied and has never run.
 *
 * Neither half is complete, and both say which parts are missing.
 * The index, the timestamp and the snapshot are all properties of
 * the `drizzle/` tree this will land in, and a generator that is a
 * pure function of a name knows none of them.
 */
const MIGRATION_GENERATOR: ScaffoldGenerator = {
  name: 'migration',
  operand: 'name',
  summary: 'a hand-written migration under drizzle/ and its entry',
  generate: (name) => [
    {
      path: `${MIGRATION_DIR}/${migrationTag(name)}.sql`,
      contents: migrationSource(name),
    },
    {
      path: `${MIGRATION_META_DIR}/${migrationTag(name)}`
        + JOURNAL_ENTRY_SUFFIX,
      contents: migrationJournalEntry(name),
    },
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
  [SOURCE_ADAPTER_GENERATOR.name]: SOURCE_ADAPTER_GENERATOR,
  [MIGRATION_GENERATOR.name]: MIGRATION_GENERATOR,
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
    // Article-free, and deliberately: the operand is read off the
    // registry entry, so a message writing one in front of it says
    // `a id` the moment a generator takes an operand starting with
    // a vowel. This shape also matches its two neighbours here,
    // which say what is missing rather than what was expected.
    throw new ScaffoldArgsError(
      `no ${generator.operand} followed ${generatorName}`,
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
