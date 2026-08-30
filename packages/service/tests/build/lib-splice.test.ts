/**
 * What a build makes of the libraries this package ships — every
 * one of them, in a single run.
 *
 * A roster names each file under `src/lib/`, a fixture source
 * writes one `__INLINE:<file>__` marker per roster entry, and the
 * command an operator runs is spawned over a tree carrying the
 * package's own `scripts/` and `src/lib/`. Each node body the
 * build wrote is then read for three things: the library's own
 * text arrived, the module boundary it was declared behind did
 * not, and what arrived is something a Code node could construct.
 *
 * The roster is what this file is for, and the set-equality guard
 * beside it is what makes it more than a list somebody keeps. A
 * library landing under `src/lib/` and left unregistered here
 * would be a library nothing ever splices, and it would report
 * green from every direction — no case exists to redden over a
 * marker nobody wrote. So the roster is held against the
 * directory listing, and that case fails ahead of everything that
 * reads a build.
 *
 * The listing is taken whole: no extension filter and no
 * exemption list, since either is a way for a file to sit in that
 * directory unregistered and unread. A file landing there that is
 * not a spliceable library fails that case, and what the failure
 * asks for is a decision about where the file belongs rather than
 * a filter widened to make room for it.
 *
 * One build rather than one per entry. The command reads a source
 * DIRECTORY and resolves every marker it finds, so a run over one
 * source carrying one node per library is the shape an operator's
 * own build already has; a run per entry would ask the same
 * question once per library, build a transpiler each time to ask
 * it, and say nothing the one run does not.
 *
 * A spawned command rather than a `buildAll` call, and the
 * LAUNCHER decides that rather than a preference between two
 * shapes. The splice reaches for `Bun.Transpiler`, which a vitest
 * worker does not have: measured in this package's own workers,
 * `Bun` is an object carrying `serve` and nothing else. A case
 * already inside a worker cannot relaunch itself, so a subprocess
 * is the only shape left to it.
 *
 * The tree copies the package's own `src/lib/` rather than
 * planting libraries of its own. A fixture library written to be
 * spliceable would say only that the build can splice something,
 * where the question worth asking is whether the libraries this
 * package SHIPS are ones a Code node could run. So what the build
 * resolved each marker against is held byte for byte against what
 * the package ships, and a claim about a copy stays a claim about
 * the original.
 *
 * Where this file and `schedule-splice.test.ts` part company is
 * breadth against depth, and neither covers the other. That file
 * takes one library through the build and then DRIVES the spliced
 * copy, holding its answers against the copy this suite imports
 * over a shared case table. Nothing about that generalises over a
 * roster: driving a library means a caller written for it, rows
 * chosen for it and an imported copy to hold it against, all of
 * which belong to the task that ports the library. What
 * generalises is the three claims here, and this file is where a
 * library joins them by being registered.
 *
 * The three are one subject read from three sides, and none of
 * them stands alone. A node body that came back empty carries no
 * export keyword and constructs perfectly well, so the second and
 * third claims rest on the first; a body that arrived with its
 * keywords still on is a body that reached the node, so the first
 * would hold for a build that skipped the strip entirely; and a
 * body carrying its text with the keywords gone can still be
 * something no node could make a function of. What each rules out
 * is another passing for the wrong reason.
 *
 * What CONSTRUCTION reaches is worth being exact about, because it
 * is the weaker half of running. A body that cannot be a function
 * at all fails here — an `import.meta` a library came to rely on,
 * a module form the strip left behind, a splice that produced
 * something unparseable — and it fails whether or not any line
 * would have been reached. A `require` does not: it raises when
 * its line runs, so a library whose top level reaches for one
 * constructs here and fails on an instance. That gap is the third
 * dual-context rule, the one `assertSpliceable` cannot see either,
 * and closing it needs a caller — which is the porting task's
 * business rather than this file's.
 *
 * Every claim reads the PARSED node parameter the site names
 * rather than the artifact as text. A body is a string inside a
 * JSON document, so a check over the file would be reading escaped
 * source through its escaping, and a workflow's own prose — a node
 * name, a sticky note — would answer for the node body it is not.
 */
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, describe, expect, it } from 'vitest';

import { valueAtPath } from './marker-fixtures.js';

// ---------------------------------------------------------------------------
// The roster, and the directory it is held against
// ---------------------------------------------------------------------------

/** One library a marker names, and the text it is read for. */
interface SplicedLibrary {
  /** The file, as a marker names it relative to `src/lib/`. */
  readonly file: string;

  /**
   * Expressions this library writes and no other roster library
   * does.
   *
   * Expressions rather than whole lines, because a line is the
   * transpiler's to reflow and an expression is not: measured over
   * `schedule.ts`, ternaries the library writes across four lines
   * come back on one with every one of these texts intact inside
   * it. Type annotations are the other half of the same rule —
   * they erase, so nothing here may lean on one.
   *
   * Each entry is guarded from both ends. Every text is asserted
   * against the library the tree copies, so no entry is a text this
   * file invented; and every text is asserted absent from the other
   * roster libraries, so a body holding a neighbour's splice cannot
   * answer for this one.
   */
  readonly ownText: readonly string[];
}

/**
 * Every library under `src/lib/`, and what a spliced copy of each
 * is read for.
 *
 * A library joins this roster in the commit that creates it. Until
 * it does, the set-equality guard below fails naming the file, so
 * the roster is a declaration held against the directory rather
 * than a list maintained by hand.
 */
const SPLICED_LIBRARIES: readonly SplicedLibrary[] = [
  {
    file: 'schedule.ts',
    ownText: [
      'Math.min(floored, bounds.maxIntervalSeconds)',
      'Number.isInteger(cap) || cap <= 0',
      'items.slice(0, cap)',
    ],
  },
  {
    file: 'parse-csv.ts',
    ownText: [
      'stripByteOrderMark(asText(text))',
      'recordHasContent(sawAny, field, record)',
      'records.length < MINIMUM_RECORDS',
    ],
  },
  {
    file: 'yaml-lite.ts',
    ownText: [
      'YAML_INTEGER.test(value)',
      'YAML_TAB_INDENT.test(line)',
      'Object.hasOwn(target, key)',
    ],
  },
  {
    file: 'parse-eml.ts',
    ownText: [
      'toByteString(raw, warnings)',
      'decodeQuotedPrintable(rawBody, false)',
      'depth >= MAX_MULTIPART_DEPTH + 1',
    ],
  },
  {
    file: 'sanitize-md.ts',
    ownText: [
      '.split(PLACEHOLDER_PREFIX)',
      'protectedSpans.push(rendered)',
      'spans[Number(index)]',
    ],
  },
  {
    file: 'shingle.ts',
    ownText: [
      'hash ^= BigInt(str.charCodeAt(i))',
      'i + SHINGLE_WORDS <= words.length',
      'hashes.slice(0, SHINGLE_SKETCH_SIZE)',
    ],
  },
  {
    file: 'audit-log.ts',
    ownText: [
      'Number.isNaN(date.getTime())',
      'Object.hasOwn(values, field)',
      'path.split(AUDIT_PATH_SEPARATOR).at(-1)',
    ],
  },
  {
    file: 'chunk.ts',
    ownText: [
      'truncateOnBoundary(cleaned, MAX_EXCERPT_CHARS)',
      'sentence > limit * SENTENCE_BOUNDARY_SHARE',
      'built.removed.truncated || capped.truncated',
    ],
  },
  {
    file: 'static-gate.ts',
    ownText: [
      'Math.abs(termWeight(term.entry))',
      'hits.slice(0, MAX_REASON_HITS)',
      'Number.parseFloat(asText(raw))',
    ],
  },
  {
    file: 'aggregate-score.ts',
    ownText: [
      'anchored.every((entry) => entry.measured === null)',
      'orZero(penalty.coefficient) * (measured / scale)',
      'Math.round(penalized)',
    ],
  },
  {
    file: 'features.ts',
    ownText: [
      'Array.from(new Set(keyed)).sort()',
      'categoryColumns.set(column.member, column.key)',
      'keys.map((key) => asNumber(values[key]))',
    ],
  },
  {
    file: 'validate-entity-name.ts',
    ownText: [
      'ENTITY_NAME_FORBIDDEN.test(raw)',
      'trimmed.length > MAX_ENTITY_NAME_LENGTH',
      'entry.toLowerCase() === lowered',
    ],
  },
  {
    file: 'parser-config.ts',
    ownText: [
      'segments.length > MAX_PATH_SEGMENTS',
      'FALSE_WORDS.includes(word)',
      'records.push(built.record)',
    ],
  },
  {
    file: 'markup-select.ts',
    ownText: [
      'fragments.length >= MAX_FRAGMENTS',
      'RAW_TEXT_ELEMENTS.includes(tag.name)',
      'stepMatches(step, ancestor)',
    ],
  },
  {
    file: 'source-health.ts',
    ownText: [
      'priorFailures(prior.consecutiveFailures) + 1',
      'prior.flagged === true || failures >= threshold',
      'outcome.succeeded === true',
    ],
  },
  {
    file: 'capture-contract.ts',
    ownText: [
      'version !== CAPTURE_CONTRACT_VERSION',
      'canonicalStamp(at, value.length) === value',
      'names.length > MAX_PROVENANCE_MEMBERS',
    ],
  },
];

/**
 * The package's own `src/lib/`, resolved from this file's location
 * rather than from the working directory.
 *
 * The suite is launched from the package and from the repo root
 * alike, and only one of those makes a relative path name this
 * directory.
 */
const PACKAGE_LIB_DIR = fileURLToPath(new URL('../../src/lib', import.meta.url));

/** The package's own `scripts/`, resolved the same way. */
const PACKAGE_SCRIPTS_DIR = fileURLToPath(
  new URL('../../scripts', import.meta.url),
);

/**
 * One library as this package ships it.
 *
 * Read per call rather than once beside the roster, for the reason
 * `loadLib` gives for caching nothing: a handful of small files per
 * run is nothing, and a read hoisted to module scope would take the
 * whole file down with an empty case list when a roster entry named
 * no file, where a read inside a case fails on the case that made
 * it.
 *
 * @param file - The library, as the roster names it.
 * @returns Its source, as the package ships it.
 */
function shippedSource(file: string): string {
  return readFileSync(join(PACKAGE_LIB_DIR, file), 'utf8');
}

/**
 * Every entry `src/lib/` holds, sorted.
 *
 * Names rather than files, and no filter of any kind — a directory
 * or a file that is not a library is as much a thing this roster
 * has to account for as a library is.
 *
 * @returns What the directory holds, by name.
 */
function shippedEntries(): string[] {
  return sorted(readdirSync(PACKAGE_LIB_DIR));
}

/**
 * Sorted copy, so an equality is over members rather than order.
 *
 * @param names - The names to sort.
 * @returns A new array holding them in sorted order.
 */
function sorted(names: readonly string[]): string[] {
  return [...names].sort();
}

/**
 * Every roster text its own library does not carry, labelled by the
 * file that declared it.
 *
 * Answers with a list rather than throwing at the first miss, so a
 * failure names every text that has drifted instead of the one that
 * happened to be looked at first.
 *
 * @returns One label per text the library it belongs to lacks.
 */
function textsMissingFromOwnLibrary(): string[] {
  return SPLICED_LIBRARIES.flatMap((lib) => {
    const source = shippedSource(lib.file);

    return lib.ownText
      .filter((text) => !source.includes(text))
      .map((text) => `${lib.file}: ${text}`);
  });
}

/**
 * Every roster text some OTHER roster library also carries,
 * labelled the same way.
 *
 * What this rules out is one node body answering for another: the
 * build writes one node per roster entry, and a text two libraries
 * share would be satisfied by whichever body was read.
 *
 * It has nothing to compare against while the roster holds one
 * entry, and says so rather than being written up as a live guard —
 * a walk over no other library finds no sharing. It starts
 * reporting on the day a second library is registered, which is the
 * first day it could be wrong.
 *
 * @returns One label per text that is not unique to its library.
 */
function textsSharedWithAnotherLibrary(): string[] {
  return SPLICED_LIBRARIES.flatMap((lib) => {
    const elsewhere = SPLICED_LIBRARIES
      .filter((other) => other.file !== lib.file)
      .map((other) => shippedSource(other.file));

    return lib.ownText
      .filter((text) => elsewhere.some((source) => source.includes(text)))
      .map((text) => `${lib.file}: ${text}`);
  });
}

/**
 * `export` where it is a keyword rather than part of a name.
 *
 * A non-global instance, so no `lastIndex` is carried from one call
 * into the next — the reason `tests/invariants/naming-patterns.ts`
 * gives for keeping its own patterns as sources rather than as
 * shared compiled ones, and the reason this is declared here rather
 * than shared with `schedule-splice.test.ts`. The character classes
 * are what rule out the one false positive a bare substring test
 * would give: a hit inside a longer identifier.
 *
 * What it cannot tell apart is the keyword from the same word
 * inside a string literal or a comment. The transpiler strips
 * comments before the build ever sees its output, and a library
 * writing such a string would fail the claim over a perfectly good
 * artifact — loudly, and in the one place where a reader can see
 * both texts.
 */
const EXPORT_KEYWORD = /(^|[^A-Za-z0-9_$])export([^A-Za-z0-9_$]|$)/u;

// ---------------------------------------------------------------------------
// The tree one build is spawned over
// ---------------------------------------------------------------------------

/** The name the source is written as, and the artifact after it. */
const SOURCE_FILE = 'ar-lib-splice-fixture.json';

/** The file inside the copied `scripts/` a build is launched at. */
const ENTRY_FILE = 'build-workflows.ts';

/** What {@link spliceBuild} reports for a run that completed. */
const LAUNCH_OK = 'exit 0';

/**
 * The line the fixture's node bodies write under their marker: a
 * Code node's own work, over the library the marker put above it.
 *
 * The same line under every marker, because what a node DOES with a
 * library is that library's own subject and no part of the three
 * claims here. What it is for is shape — a library is spliced in
 * above the lines that call it, so a body of nothing but a splice
 * would be a body no Code node has.
 */
const NODE_WORK = 'return $input.all();';

/**
 * The names a Code node's body is handed, and the parameter list a
 * spliced body is constructed under.
 *
 * The two `schedule-splice.test.ts` measured and stages, which is
 * short of the set an instance supplies. That shortness is the
 * conservative direction for a claim about CONSTRUCTION and worth
 * saying out loud: the parameter list is what a top-level
 * redeclaration collides with, so a longer list refuses more
 * libraries than this one does and never fewer. Nothing is passed
 * for `require` or `module`, for the reason a Code node supplies
 * neither.
 */
const CODE_NODE_PARAMETERS = ['$input', '$'] as const;

/**
 * The marker naming a library, in the form a workflow source writes.
 *
 * @param file - The library, as the roster names it.
 * @returns The marker a node body opens with.
 */
function markerFor(file: string): string {
  return `__INLINE:${file}__`;
}

/**
 * Where the source buries one roster entry's marker, and where the
 * artifact carries what replaced it.
 *
 * A node parameter rather than a top-level value, so the marker pass
 * has to descend to reach it and what comes back is a node body
 * rather than a document field.
 *
 * @param index - The roster entry's position, which is also its
 *   node's.
 * @returns The path to that node's body.
 */
function bodySiteOf(index: number): readonly (string | number)[] {
  return ['nodes', index, 'parameters', 'jsCode'];
}

/**
 * A source-shaped object carrying one node per roster entry, each
 * opening with that entry's marker.
 *
 * Shaped like a workflow source without being one: the build reads
 * no node type and no connection, so what matters is that a string
 * sits where a node body sits. One node per library rather than one
 * node holding every marker, so each body is read, judged and
 * constructed on its own and a failure names the library it belongs
 * to.
 *
 * Node order is roster order, which is what {@link bodySiteOf}
 * relies on.
 *
 * @returns A fresh object carrying one marker per roster entry.
 */
function sourceInliningRoster(): Record<string, unknown> {
  return {
    name: 'AR Lib Splice Fixture',
    nodes: SPLICED_LIBRARIES.map((lib) => ({
      name: `Inline ${lib.file}`,
      parameters: { jsCode: `${markerFor(lib.file)}\n\n${NODE_WORK}\n` },
    })),
  };
}

/**
 * The directory the fixture tree is written under, removed once this
 * file finishes.
 */
const FIXTURE_ROOT = mkdtempSync(join(tmpdir(), 'ar-lib-splice-'));

afterAll(() => {
  rmSync(FIXTURE_ROOT, { recursive: true, force: true });
});

/** One tree a build was spawned over, and how that run went. */
interface SplicedBuild {
  /** The directory holding the tree's one workflow source. */
  readonly sourceDir: string;

  /** The directory the build wrote its artifact into. */
  readonly outDir: string;

  /** The directory the build resolved library markers against. */
  readonly libDir: string;

  /**
   * `exit 0` for a run that completed, and otherwise the status
   * beside everything the run had to say.
   *
   * Carried as one string rather than as a status and a stream, so a
   * case failing over a build that never ran says why in its own
   * failure instead of leaving it in a subprocess nobody kept.
   */
  readonly launch: string;
}

/**
 * Plant a package tree around the shipped libraries, spawn the build
 * over it, and answer with where it wrote and how it went.
 *
 * The command takes no directories: it names `workflows/src/`,
 * `workflows/dist/` and `src/lib/` beside the entry point it was
 * launched from. So a build is pointed somewhere else by being given
 * a tree to name, and both halves of that tree are taken at run time
 * — a copy of `scripts/` and a copy of `src/lib/` — so what runs is
 * the build this package ships against the libraries it ships,
 * rather than a second copy of either to keep in step.
 *
 * Whole directories rather than the files a marker and an entry
 * point name. `build-workflows.ts` imports a sibling and a library
 * may one day import a type from one of its own, and a copy
 * assembled file by file would go stale the first time either
 * happened, in a way whose only report is a build failing over a
 * tree nobody meant to be short.
 *
 * The run is the default build, which resolves `ENV_DEFAULTS` alone
 * and reads no environment: nothing a developer has exported can
 * move it, and the source carries no settings marker for one to move
 * anyway.
 *
 * @param name - The subdirectory of {@link FIXTURE_ROOT} to plant
 *   the tree under.
 * @returns Where that run read and wrote, and how it went.
 */
function spliceBuild(name: string): SplicedBuild {
  const root = join(FIXTURE_ROOT, name);
  const tree = {
    sourceDir: join(root, 'workflows', 'src'),
    outDir: join(root, 'workflows', 'dist'),
    libDir: join(root, 'src', 'lib'),
  };

  mkdirSync(tree.sourceDir, { recursive: true });
  cpSync(PACKAGE_SCRIPTS_DIR, join(root, 'scripts'), { recursive: true });
  cpSync(PACKAGE_LIB_DIR, tree.libDir, { recursive: true });
  writeFileSync(
    join(tree.sourceDir, SOURCE_FILE),
    `${JSON.stringify(sourceInliningRoster(), null, 2)}\n`,
  );

  const run = spawnSync(
    'bun',
    [join(root, 'scripts', ENTRY_FILE)],
    { cwd: root, encoding: 'utf8' },
  );

  return {
    ...tree,
    launch: run.status === 0
      ? LAUNCH_OK
      : `exit ${String(run.status)}: ${run.error?.message ?? ''}${run.stderr}`,
  };
}

/** The one run every case in this file reads. */
const SPLICE_RUN = spliceBuild('spliced-libraries');

/**
 * One node body a run wrote, read back off the artifact on disk.
 *
 * Parsed and walked to {@link bodySiteOf}, so what a case asserts
 * over is the string a node would be handed rather than the JSON
 * escaping around it. A site holding anything but a string is
 * reported here rather than coerced: `String(undefined)` carries no
 * export keyword either, so a build that wrote no body at all would
 * satisfy the strip claim outright.
 *
 * Called from inside each case rather than resolved once beside the
 * run, so a build that never wrote fails on the case that reads it
 * and leaves the launch guard free to say why.
 *
 * @param run - The run whose artifact to read.
 * @param index - The roster entry whose node body to read.
 * @returns The node body it wrote there.
 */
function splicedBodyOf(run: SplicedBuild, index: number): string {
  const site = bodySiteOf(index);
  const artifact: unknown = JSON.parse(
    readFileSync(join(run.outDir, SOURCE_FILE), 'utf8'),
  );
  const body: unknown = valueAtPath(artifact, site);

  if (typeof body !== 'string') {
    throw new Error(
      `The node body at [${site.join(', ')}] came back as `
      + `${typeof body} rather than a string. The artifact and the `
      + 'site naming it have drifted apart — fix whichever moved.',
    );
  }

  return body;
}

/**
 * Construct a node body the way an executor would, and answer with
 * whatever came back.
 *
 * `new Function` rather than an import, because the subject is a
 * string inside an artifact rather than a module — which is also the
 * context it is judged in. Nothing here CALLS what it built: a body
 * running needs items to run over and a caller written for the
 * library above it, and both belong to that library's own suite.
 *
 * The result is answered as `unknown` and read by its type at the
 * call site, so a body that built into something other than a
 * function fails on the reading rather than on a later use of it.
 *
 * @param body - A node body, as an artifact carries it.
 * @returns Whatever constructing it produced.
 */
function constructNodeBody(body: string): unknown {
  return new Function(...CODE_NODE_PARAMETERS, body);
}

describe('the roster of libraries under src/lib/', () => {
  // The guard the whole file rests on. Every other case walks the
  // roster, so a library the roster does not name is a library no
  // case here reads — and nothing else in the package would report
  // it, because the omission is a marker nobody wrote rather than a
  // marker that failed.
  //
  // Set equality against the directory listing rather than a count.
  // A count is satisfied by a roster naming one file twice and by a
  // directory that lost one file and gained another.
  it('names every entry the directory holds and no other', () => {
    expect(sorted(SPLICED_LIBRARIES.map((lib) => lib.file)))
      .toEqual(shippedEntries());
  });

  // The fixture guard the body claim rests on, in its three parts.
  //
  // Every text is one the library really writes, so a text
  // misremembered into something no library says cannot fail the
  // claim over a perfectly good artifact. Every entry declares at
  // least one, so an emptied list cannot satisfy a walk that finds
  // nothing missing. And no text belongs to two libraries, so one
  // node body cannot answer for another.
  //
  // The third has nothing to compare against while the roster holds
  // one entry. It is asserted anyway, because the day it starts
  // saying something is the day a second library lands and nobody is
  // thinking about this file.
  it('is read for text each library writes and no other one does', () => {
    const empty = SPLICED_LIBRARIES
      .filter((lib) => lib.ownText.length === 0)
      .map((lib) => lib.file);

    expect(empty).toEqual([]);
    expect(textsMissingFromOwnLibrary()).toEqual([]);
    expect(textsSharedWithAnotherLibrary()).toEqual([]);
  });
});

describe('bun scripts/build-workflows.ts — a source inlining every library', () => {
  // The launch guard, and the case that has to come first: a command
  // that never ran leaves no output directory, so every read past it
  // would fail naming a path rather than the run that never wrote
  // one. Read as a string carrying what the run printed, since a
  // failure here is a subprocess that will not be there to ask
  // afterwards.
  it('runs to completion over the tree it was pointed at', () => {
    expect(SPLICE_RUN.launch).toBe(LAUNCH_OK);
  });

  for (const [index, lib] of SPLICED_LIBRARIES.entries()) {
    // The guard that says which library the claims below are about.
    // The tree is built from a copy, and a copy is where a claim
    // about a shipped file quietly stops being one — so what the
    // build resolved the marker against is held against what this
    // package ships, byte for byte.
    it(`resolves ${lib.file} against the copy this package ships`, () => {
      expect(readFileSync(join(SPLICE_RUN.libDir, lib.file), 'utf8'))
        .toBe(shippedSource(lib.file));
    });

    // The first claim: the library is in the node. Its own text
    // arrived, which a splice that had inlined signatures and
    // dropped what they do would not satisfy.
    //
    // It is also what the two claims below stand on. An empty body
    // carries no export keyword and constructs, and so does a body a
    // build never wrote.
    it(`writes the text ${lib.file} carries into the node body`, () => {
      const body = splicedBodyOf(SPLICE_RUN, index);
      const missing = lib.ownText.filter((text) => !body.includes(text));

      expect(missing).toEqual([]);
    });

    // The second claim: nothing in that body is an export keyword. A
    // Code node is not a module — nothing resolves a specifier for
    // it and nothing consumes what it declares — so a body reaching
    // one still wearing the keyword its library was authored with
    // fails on first execution, which is the failure the strip moves
    // to build time.
    //
    // The control is in the same case and over the same library, so
    // the `false` is a detector proven live on the very text the
    // strip had to remove rather than one that matches nothing
    // anywhere. Kept together rather than split into a guard case of
    // its own, because a control read over some other library would
    // be a control about the wrong file.
    //
    // A library exporting nothing fails the control here. That is a
    // finding rather than an exemption to build in: a library
    // declaring nothing a node can call has no reason to be spliced
    // into one.
    it(`carries no export keyword into the ${lib.file} node body`, () => {
      expect(EXPORT_KEYWORD.test(shippedSource(lib.file))).toBe(true);
      expect(EXPORT_KEYWORD.test(splicedBodyOf(SPLICE_RUN, index)))
        .toBe(false);
    });

    // The third claim: what arrived is something a node could make a
    // function of, under the parameter list a Code node body is
    // given.
    //
    // What this reaches and what it does not is written up on
    // {@link constructNodeBody} and above: a form no node could
    // parse fails whether or not its line would have run, and a
    // top-level `require` does not fail at all until one does.
    it(`constructs the ${lib.file} node body as a Code node would`, () => {
      const constructed: unknown = constructNodeBody(
        splicedBodyOf(SPLICE_RUN, index),
      );

      expect(typeof constructed).toBe('function');
    });
  }
});
