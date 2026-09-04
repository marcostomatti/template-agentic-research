/**
 * The API schedule-containment invariant, run against the real
 * `packages/service` tree.
 *
 * The rule: the four wave-2 resource groups serve HTTP and nothing
 * else. No module under `src/topics/`, `src/subscriptions/`,
 * `src/sources/` or `src/connectors/` opens a `runs` row, an
 * `llm_calls` row or a `research_pool` row, and none of them invokes
 * n8n. `ar-dispatch` holds the only schedule trigger in the system,
 * and the two verbs this wave added write one column through one
 * port method each. `docs/architecture/08-http-api.md` and every one
 * of the eight modules' headers say so in prose; this file is what
 * makes it a property of the tree instead.
 *
 * Identifiers are what the roster holds, not values. A textual scan
 * cannot follow a row into a variable named something else, and does
 * not need to: a table reaches a module by its drizzle binding being
 * imported or its SQL name being written into a statement, so the
 * spelling travels with it. Such a change type-checks, it lints, and
 * every suite here stays green.
 *
 * WHAT THE SURFACE IS, and each half of it is a decision. The roots
 * are the four resource directories rather than the whole of `src/`,
 * because the pipeline modules those tables belong to are supposed
 * to name them. Inside a root the scan reads `.ts` modules and skips
 * the colocated `.test.ts` files: what ships is what could open a
 * row in a deployment, and a vitest title is English. Both
 * exclusions are asserted as a set difference below rather than
 * trusted, so a surface that has quietly shrunk is a failing case
 * and not a clean zero.
 *
 * WHAT A MODULE'S COMMENTS SAY IS NOT WHAT IT DOES, and here the two
 * disagree on purpose. `runs` is an ordinary English word and it is
 * also the table name, so these headers use it constantly — to argue
 * that a topic delete needs no cascade because `runs` carries no
 * `topic_id`, that a subscription delete is safe because `briefings`
 * carries no `subscription_id`. Every one of those sentences is the
 * containment being stated, and a scan reporting them would be
 * turned off inside a phase. So each file is split into a code half
 * and a comment half by line, the roster runs over the code half,
 * and the comment half is read in the same run as the live control
 * the roster would otherwise have none of: `runs` has to occur there
 * a non-zero number of times, or the needle has stopped matching and
 * the zero beside it is about nothing.
 *
 * That split is exact on this tree rather than approximately right,
 * and two cases keep it that way. A comment here is always a whole
 * line — no code line carries a trailing `//` or an inline block —
 * and no template literal spans lines, so no continuation can be
 * misread as a comment. Both are asserted over the real modules with
 * quoted spans removed first, so a `https://` inside a string is not
 * mistaken for a comment opener. Break either house rule and the
 * case reddens naming the file and line, which is the point: the
 * classifier is simple because the tree is, and it says so.
 *
 * The scan surface is established before any of that. A containment
 * check reports what it found in the files it was handed and says
 * nothing about the files it was not, so a root that has been
 * renamed, emptied, or left holding nothing but colocated tests
 * simply stops contributing and the run stays green over whatever
 * remains. The walk therefore refuses to produce a result at all
 * rather than return a zero it did not earn.
 *
 * The ports are the second half of the invariant and are checked
 * twice, because an interface has no runtime form and neither
 * reading is honest alone. The NAME half is a roster of every method
 * each of the four ports declares, pinned two-directionally against
 * `keyof` so a method added to a port has to be named here, then
 * classified — with fabricated names of both kinds pushed through
 * the same classifier in the same case, since one matching nothing
 * answers the empty list over any roster. The SIGNATURE half never
 * reads a name at all: it derives from `keyof` the methods whose
 * parameters are exactly `(id: number, nextRunAt: Date)`, and pins
 * that there is exactly one on each schedule port and none on the
 * other two. A planted port carrying a second writer is declared
 * `false` beside them, which is what says the pin discriminates.
 *
 * Unlike the de-origination needles next door, the spellings below
 * are written out. They are not strings this repository is forbidden
 * to contain — three of them are tables it declares on purpose — and
 * `tests/` is not one of the trees the walk opens, so the roster
 * sits outside its own surface however it is spelled.
 *
 * One file rather than the module-and-test pair the auth containment
 * next door is split into: nothing else consumes this roster or this
 * walk, and the split there exists so a second reader can have them.
 *
 * The package root is derived from this file's own location rather
 * than from the working directory, so the same tree is scanned
 * whether the suite is started from the package or from the repo
 * root.
 */
import type { ConnectorStore } from '../../src/connectors/store.js';
import type { SourceStore } from '../../src/sources/store.js';
import type {
  SubscriptionStore,
} from '../../src/subscriptions/store.js';
import type { TopicRecord, TopicStore } from '../../src/topics/store.js';

import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, describe, expect, it } from 'vitest';

// ---------------------------------------------------------------------------
// Scan surface
// ---------------------------------------------------------------------------

/** Root of `@ar/service`, two levels above `tests/invariants/`. */
const PACKAGE_ROOT = fileURLToPath(new URL('../..', import.meta.url));

/**
 * The directories the rule covers, package-relative.
 *
 * One per wave-2 resource group, and the whole of each. Two of the
 * four hold more than their HTTP half — `src/sources/` carries the
 * source adapter contract and its registry beside the port, the
 * service and the two routers — and that is deliberate rather than
 * an accident of the directory name: an adapter has no more business
 * opening a `runs` row than a route handler does, and narrowing the
 * root to the six HTTP modules would be an exclusion nobody
 * afterwards knows the reach of.
 *
 * What is NOT here is the rest of `src/`. The pipeline modules those
 * tables belong to are supposed to name them, `src/db/schema/`
 * declares all three, and a scan reporting either would be narrowed
 * or turned off inside a phase.
 */
const SCAN_ROOTS: readonly string[] = [
  'src/connectors',
  'src/sources',
  'src/subscriptions',
  'src/topics',
];

/** What a scanned module is called. */
const MODULE_SUFFIX = '.ts';

/**
 * What a colocated test is called, and the one thing inside a root
 * the walk skips.
 *
 * The rule is about what ships. A test cannot open a row in a
 * deployment, and its titles are English: `it('runs the same call
 * against an enabled row')` is a sentence, not a table. Three such
 * titles stand in these roots today and every one of them would be a
 * hit.
 *
 * The subtraction is visible rather than implied — the case below
 * holds the scanned set plus the skipped set against an independent
 * walk of the whole tree, so a suffix that stopped matching, or a
 * filter that grew, shows up as files present in one list and
 * missing from the other.
 */
const COLOCATED_TEST_SUFFIX = '.test.ts';

/** Whether the walk reads one package-relative path. */
function isScannedModule(relativePath: string): boolean {
  return relativePath.endsWith(MODULE_SUFFIX)
    && !relativePath.endsWith(COLOCATED_TEST_SUFFIX);
}

/**
 * Thrown when the walk reads no module, whether for one root or at
 * all.
 *
 * The failure this catches is the one a containment scan cannot
 * report any other way. Its passing answer is an empty list of hits,
 * and a root that has been renamed, emptied, or left holding nothing
 * but colocated tests produces an empty list of hits too — from a
 * surface it never read. Nothing in the result distinguishes them,
 * so the walk declines to return one.
 *
 * Both shapes are the same fact and share a class. A single root
 * going quiet shrinks the surface to whatever remains;
 * {@link SCAN_ROOTS} itself going empty removes the surface
 * altogether. The second cannot happen while the first is guarded
 * and the list is non-empty, which is precisely why it is worth a
 * check of its own: it is what the per-root guard stops covering the
 * moment somebody edits the list.
 *
 * A distinct class rather than a bare `Error` so the cases covering
 * this path can pin the failure to this cause. A missing directory,
 * an unreadable entry and a permission refusal all reach a caller as
 * `Error` too, and an assertion that accepted any of them would pass
 * for the wrong reason.
 */
class EmptyScanError extends Error {
  /**
   * The {@link SCAN_ROOTS} entry that resolved to no module, exactly
   * as that list declares it, or `null` when the list declared no
   * roots at all and there was no entry to name.
   */
  readonly root: string | null;

  /**
   * @param root - The {@link SCAN_ROOTS} entry that resolved to no
   * module, or `null` for an empty root list.
   * @param packageRoot - Directory the entry was resolved against,
   * carried into the message because the same entry is populated or
   * empty depending on which tree the walk was pointed at.
   */
  constructor(root: string | null, packageRoot: string) {
    const subject = root === null
      ? 'The schedule-containment scan declares no roots at all'
      : `Scan root '${root}' resolved to no module`;

    super(
      `${subject} under ${packageRoot}. A containment scan that read `
      + 'nothing answers exactly what a clean tree answers, so the '
      + 'walk refuses rather than report a zero it did not earn: '
      + 'either a resource group moved and SCAN_ROOTS needs updating, '
      + 'or the walk was pointed at the wrong tree.',
    );
    this.name = this.constructor.name;
    this.root = root;
  }
}

/**
 * Modules beneath one directory, relative to the package root.
 *
 * Recursive, though no root has a subdirectory today; a group that
 * grows one is covered without an edit here.
 *
 * A symlink is skipped rather than followed, since following one
 * either re-walks a tree already covered or leaves the package
 * altogether, and neither yields a module a name can be fixed in.
 *
 * Entries are sorted by name at each level, because `readdirSync`
 * returns directory order — stable on one machine, arbitrary across
 * them. Sorting makes the module list, and any failure report built
 * from it, identical everywhere.
 *
 * Paths are built with a literal `/` rather than `join`, so what
 * comes back is package-relative and slash-separated whatever the
 * platform: the form a failure message prints, a caller matches
 * against a root name, and {@link isScannedModule} compares against.
 */
function walkDirectory(
  packageRoot: string,
  relativeDir: string,
): readonly string[] {
  const entries = readdirSync(join(packageRoot, relativeDir), {
    withFileTypes: true,
  });

  return [...entries]
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const relativePath = `${relativeDir}/${entry.name}`;

      if (entry.isDirectory()) {
        return walkDirectory(packageRoot, relativePath);
      }

      return entry.isFile() && isScannedModule(relativePath)
        ? [relativePath]
        : [];
    });
}

/**
 * Every module the containment scan reads, relative to `packageRoot`.
 *
 * Walks {@link SCAN_ROOTS} in declaration order. The result is
 * package-relative, so a caller joins it back onto `packageRoot` to
 * read a module and prints it as-is to name one.
 *
 * Throws {@link EmptyScanError} rather than returning an empty or
 * short list: once if the root list itself is empty, and again as
 * soon as any declared root contributes nothing. A root that is
 * absent, or that is not a directory at all, takes that same path
 * rather than surfacing as a filesystem error from inside the walk —
 * both mean the declared surface and the tree disagree, which is one
 * fact worth reporting once.
 *
 * The refusal is checked per root and not only over the total. Four
 * roots are declared here, so a total-only guard would stay silent
 * for whichever one went quiet while the others kept the count above
 * zero, and three quarters of a surface is what this invariant most
 * needs to be told about.
 *
 * The colocated-test filter runs before the count, so a root left
 * holding nothing but `*.test.ts` refuses exactly as an empty one
 * does. That is the intended reading rather than an edge case: the
 * scan would have read no module it is allowed to fail on, and its
 * clean answer would be about nothing.
 */
function collectScannedModules(
  packageRoot: string,
): readonly string[] {
  if (SCAN_ROOTS.length === 0) {
    throw new EmptyScanError(null, packageRoot);
  }

  return SCAN_ROOTS.flatMap((root) => {
    const stats = statSync(join(packageRoot, root), {
      throwIfNoEntry: false,
    });
    const modules = stats !== undefined && stats.isDirectory()
      ? walkDirectory(packageRoot, root)
      : [];

    if (modules.length === 0) {
      throw new EmptyScanError(root, packageRoot);
    }

    return modules;
  });
}

// ---------------------------------------------------------------------------
// The code half and the comment half
// ---------------------------------------------------------------------------

/** One line of a module, paired with where it sits. */
interface SourceLine {
  /** 1-based, so `<file>:<line>` means what an editor means by it. */
  readonly lineNumber: number;
  /** Verbatim and untrimmed, exactly as the module carries it. */
  readonly text: string;
}

/** One module's lines, split into what it does and what it argues. */
interface SplitSource {
  /** Everything the roster is read over. */
  readonly code: readonly SourceLine[];
  /** Everything the live control below is read over. */
  readonly comment: readonly SourceLine[];
}

/**
 * What a comment line starts with once its indentation is dropped.
 *
 * Three shapes and no more, because that is all this tree has: a
 * block opener, one of its continuation lines (which is also how a
 * block closes, `*` first), and a line comment. A trailing comment
 * after code would need a fourth, and the case below asserts none
 * exists rather than assuming it.
 */
const COMMENT_LINE_PREFIXES: readonly string[] = [
  '*',
  '//',
  '/*',
];

/** Whether one line is comment rather than code. */
function isCommentLine(text: string): boolean {
  const trimmed = text.trimStart();

  return COMMENT_LINE_PREFIXES.some(
    (prefix) => trimmed.startsWith(prefix),
  );
}

/**
 * One module's content, split by line into code and comment.
 *
 * By line and not by lexing, which is a decision the tree earns
 * rather than a shortcut. Two properties make the classification
 * exact here — no code line carries a comment delimiter, and no
 * template literal spans lines — and both are asserted over the real
 * modules below, so the day either stops holding is the day a case
 * says so and names the file. A lexer would be correct on a tree
 * neither property held for, and wrong in ways nothing would report.
 *
 * A blank line falls to the code half and matches nothing, which
 * costs the roster no accuracy and keeps `code` a straight
 * complement of `comment`.
 */
function splitSource(content: string): SplitSource {
  const lines: readonly SourceLine[] = content
    .split('\n')
    .map((text, index) => ({ lineNumber: index + 1, text }));

  return {
    code: lines.filter((line) => !isCommentLine(line.text)),
    comment: lines.filter((line) => isCommentLine(line.text)),
  };
}

/**
 * Every quoted span of one line, for the two guards over the split.
 *
 * Single-quoted, double-quoted and template, each allowing a
 * backslash escape inside it. Used only to REMOVE those spans before
 * looking for a comment opener or an unclosed backtick, so a
 * `'https://example.test/feed'` is not read as a line comment and a
 * `sql` template that opens and closes on one line is not read as
 * opening a multi-line one.
 *
 * Not a lexer and not trying to be. Anything it gets wrong leaves a
 * residue that still carries the delimiter, so the guard reddens
 * rather than passes — the conservative direction, which is what a
 * guard over an assumption has to take.
 */
const QUOTED_SPAN = /'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/gu;

/** One line with every quoted span removed. */
function withoutQuotedSpans(text: string): string {
  return text.replace(QUOTED_SPAN, '');
}

// ---------------------------------------------------------------------------
// The roster
// ---------------------------------------------------------------------------

/** One name the code half of a scanned module may not carry. */
interface PipelineIdentifier {
  /**
   * The id a failure report, a planted sample and the coverage case
   * pair on. Kebab, and never one of the spellings itself, so the
   * report can name what was found without printing it twice.
   */
  readonly id: string;
  /**
   * Every spelling that names the same thing, alternated into one
   * needle. A drizzle table arrives under two: the binding the schema
   * module exports and the SQL name the same table takes in a
   * statement.
   */
  readonly spellings: readonly string[];
  /**
   * Whether the match requires an identifier boundary on both sides.
   *
   * True for the three table names, and it is load-bearing on one of
   * them: `runSubscriptionNow` is a real export on this very surface
   * and contains `runs` case-insensitively, so an unbounded needle
   * would report the schedule verb the invariant exists to protect.
   * The cost is that a compound spelling — a local named `topicRuns`
   * holding rows read out of the table — is out of reach; the
   * binding arrives under its own name, so that is the narrow half
   * of a needle whose broad half would match its own subject.
   *
   * False for the n8n needle, which has to reach `AR_N8N_URL`,
   * `X-N8N-API-KEY` and `n8n-nodes-base.executeWorkflow` — every one
   * of them a compound, and the whole roster if a boundary were
   * required.
   */
  readonly wordBounded: boolean;
  /** What the spellings name, and where its subject is declared. */
  readonly description: string;
}

/**
 * The names no scanned module's code may contain.
 *
 * Three tables and one integration. The tables are the pipeline's
 * own ledger — `runs`, the row `ar-dispatch` opens per dispatch;
 * `llm_calls`, its per-call accounting; `research_pool`, the
 * candidate set a run draws from — and none of them is a table this
 * surface serves. A resource route that opened one would be claiming
 * work rather than configuring it, which is the whole distinction
 * between this surface and the dispatcher.
 *
 * The fourth is the dispatcher itself, reached from here at all only
 * by an HTTP call to n8n. It has no single spelling: the public REST
 * client, the two config members naming a base URL and a key, the
 * `X-N8N-API-KEY` header and a node type all carry the same three
 * characters, which is exactly why the needle is those three
 * characters and nothing narrower.
 *
 * Matching is case-insensitive. The same table is `research_pool` in
 * SQL and `researchPool` in TypeScript, and becomes `ResearchPool`
 * the moment somebody names a type after it.
 *
 * The four are mutually exclusive as text, so the number of hits a
 * module produces is the number of times it names one.
 */
const PIPELINE_IDENTIFIERS: readonly PipelineIdentifier[] = [
  {
    id: 'runs-table',
    spellings: ['runs'],
    wordBounded: true,
    description:
      'The dispatch ledger `src/db/schema/runs.ts` declares. Its '
      + 'drizzle binding and its SQL name are the same word.',
  },
  {
    id: 'llm-calls-table',
    spellings: ['llmCalls', 'llm_calls'],
    wordBounded: true,
    description:
      'Per-call model accounting, declared beside `runs` in '
      + '`src/db/schema/runs.ts` and written only by a pipeline.',
  },
  {
    id: 'research-pool-table',
    spellings: ['researchPool', 'research_pool'],
    wordBounded: true,
    description:
      'The candidate set a run draws from, declared in '
      + '`src/db/schema/entities.ts`.',
  },
  {
    id: 'n8n-invocation',
    spellings: ['n8n'],
    wordBounded: false,
    description:
      'Any spelling of an n8n invocation — the REST client under '
      + '`scripts/`, the `AR_N8N_URL` and `AR_N8N_API_KEY` config '
      + 'members, the `X-N8N-API-KEY` header, a node type.',
  },
];

/** One occurrence of a rostered name, as the scan reports it. */
interface PipelineMatch {
  /**
   * `id` of the {@link PIPELINE_IDENTIFIERS} entry that matched.
   * Reported rather than the matched text, so a hit in any casing or
   * either spelling leads to the one entry that describes it.
   */
  readonly id: string;
  /**
   * Where the content came from, exactly as the caller named it. The
   * matcher never opens a file, so this is carried rather than
   * derived — its only job is to let a caller scanning many modules
   * say which one a hit belongs to.
   */
  readonly filePath: string;
  /** 1-based, matching what an editor and `grep -n` both show. */
  readonly lineNumber: number;
  /**
   * The offending line, verbatim and untrimmed, for a caller that
   * wants to show the hit locally. A failure report is built from the
   * three fields above instead: the fix is always in the named
   * module, and a line quoted into CI output is source nobody reads
   * there.
   */
  readonly line: string;
}

/**
 * The needle one roster entry compiles to.
 *
 * Built fresh on every call and never cached. It matches globally,
 * and a global `RegExp` carries `lastIndex` from one use to the next,
 * so a shared instance would start each module wherever the previous
 * one left off — a scan that passes and fails alternately over
 * unchanged input.
 */
function needleFor(entry: PipelineIdentifier): RegExp {
  const alternatives = entry.spellings.join('|');
  const source = entry.wordBounded
    ? `(?<![A-Za-z0-9_$])(?:${alternatives})(?![A-Za-z0-9_$])`
    : `(?:${alternatives})`;

  return new RegExp(source, 'giu');
}

/**
 * Every rostered name in one module's lines, one record per hit.
 *
 * Takes lines rather than a path, which is the seam that makes both
 * halves of a split readable through one matcher and lets a planted
 * sample be assembled in memory — with no fixture file that would
 * itself land inside a scan root.
 *
 * One record per hit, not per line or per module. A line naming two
 * of the four is two findings, and a report that collapsed them
 * would quietly let the second survive the fix for the first.
 *
 * Results come back in file order — ascending line number, and
 * within a line in the order {@link PIPELINE_IDENTIFIERS} declares.
 */
function findPipelineIdentifiers(
  lines: readonly SourceLine[],
  filePath: string,
): readonly PipelineMatch[] {
  const needles = PIPELINE_IDENTIFIERS.map((entry) => ({
    id: entry.id,
    needle: needleFor(entry),
  }));

  return lines.flatMap((line) => needles.flatMap(
    ({ id, needle }) => [...line.text.matchAll(needle)].map(() => ({
      id,
      filePath,
      lineNumber: line.lineNumber,
      line: line.text,
    })),
  ));
}

// ---------------------------------------------------------------------------
// The tree as it stands
// ---------------------------------------------------------------------------

/**
 * Every module the invariant covers, resolved once for the file.
 *
 * Deliberately at module scope: a walk that cannot build the surface
 * throws, and that failure belongs to the file rather than to one
 * case. There is nothing left to assert about contents once the list
 * of modules to read is wrong, and the error names the root that
 * went quiet.
 */
const SCANNED_MODULES = collectScannedModules(PACKAGE_ROOT);

/**
 * Every file beneath one directory, filtered by nothing.
 *
 * A second walk, written out here rather than borrowed from the
 * function under test, and applying no suffix rule at all — which is
 * the whole of its value. The difference between what it returns and
 * what the scan returns is exactly what the scan chose not to read,
 * so a walk that had grown a prune nobody declared (a skipped
 * directory, an early return, a suffix that stopped matching) shows
 * up as files present in one list and missing from the other.
 */
function walkAll(relativeDir: string): readonly string[] {
  const entries = readdirSync(join(PACKAGE_ROOT, relativeDir), {
    withFileTypes: true,
  });

  return entries.flatMap((entry) => {
    const relativePath = `${relativeDir}/${entry.name}`;

    if (entry.isDirectory()) {
      return walkAll(relativePath);
    }

    return entry.isFile()
      ? [relativePath]
      : [];
  });
}

/** The unfiltered tree, against which the surface is a subtraction. */
const FULL_TREE_FILES = SCAN_ROOTS.flatMap((root) => walkAll(root));

/** Everything under the roots the scan deliberately does not read. */
const SKIPPED_FILES = FULL_TREE_FILES.filter(
  (file) => !isScannedModule(file),
);

/** One scanned module, read once and split once for every case. */
interface ScannedModule {
  /** Package-relative, as the walk answered it. */
  readonly filePath: string;
  /** Its two halves. */
  readonly split: SplitSource;
}

/**
 * Every scanned module's content, read and split at module scope.
 *
 * Once rather than per case: four cases below read these halves, and
 * re-reading twenty-five files for each of them buys nothing. A path
 * that has gone missing between the walk and the read takes the file
 * down here with the filesystem's own message naming it.
 */
const SPLIT_MODULES: readonly ScannedModule[] = SCANNED_MODULES.map(
  (filePath) => ({
    filePath,
    split: splitSource(readFileSync(join(PACKAGE_ROOT, filePath), 'utf8')),
  }),
);

// ---------------------------------------------------------------------------
// Scan surface
// ---------------------------------------------------------------------------

describe('schedule containment — scan surface', () => {
  // Swept across the whole list rather than checked root by root, so
  // a failure names every root that stopped contributing instead of
  // reporting the first and hiding the rest behind it.
  it('scans a module under every declared root', () => {
    const uncovered = SCAN_ROOTS.filter(
      (root) => !SCANNED_MODULES.some((file) => file.startsWith(`${root}/`)),
    );

    expect(uncovered).toEqual([]);
  });

  // Set difference rather than arithmetic over two counts: the counts
  // agree at the wrong membership, and what a failure has to say is
  // which module left the surface.
  //
  // The skipped set is asserted non-empty first, in band. A
  // subtraction that removes nothing is one a walk reading every file
  // under the roots would satisfy — including the colocated tests,
  // whose English titles would then fail the contents case below for
  // a reason that has nothing to do with containment.
  it('reads every module under the roots but no other file', () => {
    expect(SKIPPED_FILES.length).toBeGreaterThan(0);

    const expected = FULL_TREE_FILES.filter(isScannedModule);

    expect([...SCANNED_MODULES].sort()).toEqual([...expected].sort());
  });

  // The lists everything else here is derived from, pinned to what
  // the rule names. Both cases above read them, and so does the scan:
  // drop a root or widen the suffix rule and the assertions move with
  // it, leaving a green run over a surface that has quietly shrunk.
  //
  // Written out rather than counted, because a count is what a fifth
  // root would satisfy. A change here is a change to what the
  // invariant covers, and it should cost an edit to a case whose name
  // says so.
  it('declares the four roots and the suffix rule', () => {
    expect([...SCAN_ROOTS].sort()).toEqual([
      'src/connectors',
      'src/sources',
      'src/subscriptions',
      'src/topics',
    ]);
    expect(MODULE_SUFFIX).toBe('.ts');
    expect(COLOCATED_TEST_SUFFIX).toBe('.test.ts');
  });
});

// ---------------------------------------------------------------------------
// The split
// ---------------------------------------------------------------------------

/** A block comment, a line comment and code, in one sample module. */
const SPLIT_SAMPLE = [
  '/**',
  ' * A block comment whose second line starts with a star.',
  ' */',
  'import { topics } from \'../db/schema.js\';',
  '',
  '// A line comment, indented nowhere.',
  '  // And one indented, which is the shape a case comment takes.',
  '  const endpoint = \'https://example.test/feed.xml\';',
].join('\n');

describe('splitSource — the split the roster reads through', () => {
  // The classification itself, over a sample carrying every shape the
  // tree has. Asserted as the two line-number lists rather than as
  // counts, so a line landing in the wrong half names itself.
  //
  // The last line is the one the sample exists for: a URL inside a
  // string carries `//`, and a classifier keying on the delimiter
  // anywhere in the line rather than at its start would put a
  // declaration into the comment half and stop reading it.
  it('sorts every line shape into the half it belongs to', () => {
    const split = splitSource(SPLIT_SAMPLE);

    expect(split.comment.map((line) => line.lineNumber))
      .toEqual([1, 2, 3, 6, 7]);
    expect(split.code.map((line) => line.lineNumber))
      .toEqual([4, 5, 8]);
  });

  // The first of the two properties that make the line
  // classification exact rather than approximately right. A trailing
  // `// ...` after code, or an inline `/* ... */`, would leave prose
  // in the code half and the roster would report it — so the house
  // rule is asserted here, where breaking it names the file and the
  // line, instead of being discovered as a false hit somewhere else.
  //
  // Quoted spans are removed before looking, or every `https://`
  // would answer.
  it('finds no comment delimiter on a scanned code line', () => {
    const found = SPLIT_MODULES.flatMap(({ filePath, split }) => split.code
      .filter((line) => {
        const residue = withoutQuotedSpans(line.text);

        return residue.includes('//')
          || residue.includes('/*')
          || residue.includes('*/');
      })
      .map((line) => `${filePath}:${line.lineNumber}`));

    expect(found).toEqual([]);
  });

  // The second property. A template literal spanning lines would put
  // its continuation lines through the classifier on their own, and
  // one beginning with a star would be filed as a comment — which is
  // how a raw statement could sit in the half the roster never reads.
  //
  // An unclosed backtick is what an opening line leaves behind once
  // its quoted spans are removed, so the check is that no residue
  // carries one at all.
  it('finds no scanned code line opening a template literal', () => {
    const found = SPLIT_MODULES.flatMap(({ filePath, split }) => split.code
      .filter((line) => withoutQuotedSpans(line.text).includes('`'))
      .map((line) => `${filePath}:${line.lineNumber}`));

    expect(found).toEqual([]);
  });

  // Neither half is allowed to be empty for any module. A file whose
  // code half the split had eaten would contribute a clean zero to
  // the contents case, and a file with no comment half would be one
  // the live control below could never read.
  it('gives every scanned module both halves', () => {
    const lopsided = SPLIT_MODULES
      .filter(({ split }) => split.code.length === 0
        || split.comment.length === 0)
      .map(({ filePath }) => filePath);

    expect(lopsided).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Planted samples
// ---------------------------------------------------------------------------

/** One planted occurrence, paired with the entry that finds it. */
interface PlantedSample {
  /**
   * `id` of the {@link PIPELINE_IDENTIFIERS} entry under test.
   * Pairing by id rather than by position means a reordered roster
   * still tests what it says it tests, and an entry left without a
   * sample is caught by the coverage case below rather than silently
   * going untested.
   */
  readonly id: string;
  /**
   * The line planted into the body, in a shape the name really takes
   * where one of these leaks: a drizzle table read, a drizzle table
   * written, a raw statement, an authenticated call out. A sample
   * reduced to the bare spelling would pass against a needle too
   * narrow to survive real code around it.
   *
   * Exactly one rostered spelling per line, which is what lets each
   * case below assert the whole result rather than search it. The
   * four are mutually exclusive as text, so a line carrying two of
   * them is two hits and would fail the case that planted it.
   */
  readonly line: string;
}

const PLANTED_SAMPLES: readonly PlantedSample[] = [
  {
    id: 'runs-table',
    line: '  const open = await db.select().from(runs).where(due);',
  },
  {
    id: 'llm-calls-table',
    line: '  await db.insert(llmCalls).values({ runId, tokens });',
  },
  {
    id: 'research-pool-table',
    line: '  await db.execute(sql`delete from research_pool`);',
  },
  {
    id: 'n8n-invocation',
    line: '  const headers = { \'X-N8N-API-KEY\': instance.apiKey };',
  },
];

// ---------------------------------------------------------------------------
// Synthetic module body
// ---------------------------------------------------------------------------

// Clean on both sides of the plant, so a case reporting one match
// reports it for the planted line and for nothing else. These lines
// are asserted clean nowhere, and do not have to be: a rostered name
// in any of them turns every case below red by adding a second match
// to a result asserted to hold exactly one.

const CLEAN_LINES_BEFORE: readonly string[] = [
  'const page = await store.listTopics(domainId, window);',
  'const total = await store.countTopics(domainId);',
];

const CLEAN_LINES_AFTER: readonly string[] = [
  'return okPage(page.map(toTopicResource), { page: 1, total });',
];

/** 1-based, matching what the matcher reports and an editor shows. */
const PLANTED_LINE_NUMBER = CLEAN_LINES_BEFORE.length + 1;

/**
 * Path the samples are attributed to. Named but never opened: the
 * matcher takes lines, so this only has to be the string it carries
 * back into the report. Fabricated rather than real, so no case here
 * can be read as a claim about a module that exists.
 */
const SAMPLE_FILE_PATH = 'src/topics/example-store.ts';

/** The sample line surrounded by clean content, as one module. */
function plantInModule(line: string): readonly SourceLine[] {
  return [...CLEAN_LINES_BEFORE, line, ...CLEAN_LINES_AFTER].map(
    (text, index) => ({ lineNumber: index + 1, text }),
  );
}

// ---------------------------------------------------------------------------
// Roster liveness
// ---------------------------------------------------------------------------

describe('findPipelineIdentifiers — planted samples', () => {
  // Without this, an entry added to the roster with no sample beside
  // it is one nothing proves can still match, and the suite stays
  // green while coverage shrinks — the same vacuous pass the walk
  // guards against by refusing a root that contributes nothing.
  it('plants a sample for every id the roster declares', () => {
    const planted = PLANTED_SAMPLES.map((sample) => sample.id);
    const declared = PIPELINE_IDENTIFIERS.map((entry) => entry.id);

    expect([...planted].sort()).toEqual([...declared].sort());
  });

  for (const sample of PLANTED_SAMPLES) {
    // Exact equality on the whole record, not a length or a
    // containment check: it pins the hit to the planted line rather
    // than to any hit anywhere in the body, and it fails if a sample
    // starts matching a second entry as well — which is how a needle
    // widened past its own subject first shows up.
    it(`flags ${sample.id} on the line it occurs`, () => {
      const matches = findPipelineIdentifiers(
        plantInModule(sample.line),
        SAMPLE_FILE_PATH,
      );

      const expected: PipelineMatch = {
        id: sample.id,
        filePath: SAMPLE_FILE_PATH,
        lineNumber: PLANTED_LINE_NUMBER,
        line: sample.line,
      };

      expect(matches).toStrictEqual([expected]);
    });
  }

  // Every sample above is spelled the way the code would spell it, so
  // none of them would notice the needles' case-insensitive flag
  // going. This is the one plant whose casing is not a declared one:
  // a table becomes `ResearchPool` the moment somebody names a type
  // after it, and a case-sensitive scan is one that rename walks
  // straight past.
  it('flags a rostered spelling in another casing', () => {
    const line = '  type ResearchPool = InferSelectModel<typeof pool>;';
    const matches = findPipelineIdentifiers(
      plantInModule(line),
      SAMPLE_FILE_PATH,
    );

    const expected: PipelineMatch = {
      id: 'research-pool-table',
      filePath: SAMPLE_FILE_PATH,
      lineNumber: PLANTED_LINE_NUMBER,
      line,
    };

    expect(matches).toStrictEqual([expected]);
  });

  // The other direction of the same needle, and the reason the three
  // table entries carry a boundary at all. `runSubscriptionNow` is a
  // real export on this surface — the schedule verb the invariant
  // exists to protect — and it contains `runs` case-insensitively, so
  // an unbounded needle would report the code it is written around.
  // Dropping the boundary reddens here and nowhere else.
  it('leaves the run-now verb the roster is written around', () => {
    const line = '  await runSubscriptionNow(store, now, id);';

    expect(findPipelineIdentifiers(plantInModule(line), SAMPLE_FILE_PATH))
      .toStrictEqual([]);
  });

  // The n8n needle in the other direction, and the reason it is the
  // one entry carrying no boundary: every real spelling is a
  // compound, so a boundary would answer nothing anywhere. Two
  // shapes, an environment key and a node type, both of which a
  // bounded needle misses entirely.
  it('flags an n8n spelling that carries no identifier edge', () => {
    const lines: readonly SourceLine[] = [
      { lineNumber: 1, text: '  const base = config.AR_N8N_URL;' },
      { lineNumber: 2, text: '  type: \'n8n-nodes-base.executeWorkflow\',' },
    ];
    const found = findPipelineIdentifiers(lines, SAMPLE_FILE_PATH);

    expect(found.map((match) => match.lineNumber)).toEqual([1, 2]);
    expect(new Set(found.map((match) => match.id)))
      .toStrictEqual(new Set(['n8n-invocation']));
  });
});

describe('findPipelineIdentifiers — the comment half', () => {
  // The live control, and the only one the roster has against the
  // real tree. These headers name `runs` constantly and on purpose —
  // to argue that a topic delete needs no cascade because the table
  // carries no `topic_id`, that a subscription delete is safe because
  // `briefings` carries no `subscription_id` — so the comment half
  // has to answer a non-zero number of hits under that id. It is what
  // says the needle still matches text in this repository, which the
  // planted samples alone cannot: they match strings this file wrote.
  //
  // Only that entry. The other three have no legitimate occurrence
  // anywhere under these roots, in either half, so their zeros rest
  // on the planted samples above and on nothing else. Saying which is
  // which is the difference between a control and a claim.
  it('finds the runs table named in the comment half it skips', () => {
    const found = SPLIT_MODULES.flatMap(
      ({ filePath, split }) => findPipelineIdentifiers(
        split.comment,
        filePath,
      ),
    );
    const runsHits = found.filter((match) => match.id === 'runs-table');

    expect(runsHits.length).toBeGreaterThan(0);
    expect(new Set(runsHits.map((match) => match.filePath)).size)
      .toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------
// Contents
// ---------------------------------------------------------------------------

/**
 * One hit, in the form the failure list prints it.
 *
 * The id is the useful half — it says which table, or that the
 * dispatcher was called — and printing it is safe: these are names
 * the repository declares on purpose, unlike the de-origination
 * reports next door. The offending line is left out all the same. A
 * failure list reaches CI logs and terminal scrollback, and source
 * quoted there is source nobody can open or fix; the module and the
 * line are what lead to the one place it can be.
 */
function formatMatch(match: PipelineMatch): string {
  return `${match.filePath}:${match.lineNumber} — ${match.id}`;
}

describe('schedule containment — contents', () => {
  // Compared against an empty array rather than against a count, so
  // the failure diff is the list of hits itself: every one of them,
  // each naming its own module and line, instead of a number to go
  // chasing.
  it('names no pipeline table and no n8n invocation in code', () => {
    const found = SPLIT_MODULES.flatMap(
      ({ filePath, split }) => findPipelineIdentifiers(split.code, filePath)
        .map(formatMatch),
    );

    expect(found).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The two schedule ports
// ---------------------------------------------------------------------------

/**
 * Every method `TopicStore` declares, in one list.
 *
 * `satisfies` pins one direction — a name here that is not on the
 * port is a compile error — and {@link EveryMethodListed} below pins
 * the other, so a method added to the port has to be named here
 * before anything reads the list. Without the pair, a writer added
 * beside {@link TopicStore.updateTopicSchedule} would simply not
 * appear in the classification below, and the case asserting exactly
 * one would go on passing.
 */
const TOPIC_STORE_METHODS = [
  'countTopics',
  'deleteTopic',
  'findTopicById',
  'insertTopic',
  'listTopics',
  'updateTopic',
  'updateTopicSchedule',
] as const satisfies readonly (keyof TopicStore)[];

/** The same, for `SubscriptionStore`. */
const SUBSCRIPTION_STORE_METHODS = [
  'countSubscriptions',
  'deleteSubscription',
  'findSubscriptionById',
  'insertSubscription',
  'listSubscriptions',
  'updateSubscription',
  'updateSubscriptionSchedule',
] as const satisfies readonly (keyof SubscriptionStore)[];

/**
 * The same, for `SourceStore`, which declares no schedule writer.
 *
 * Here because a classification is only a measurement while
 * something answers the other way. Two of the four wave-2 ports have
 * a schedule column and two do not, so these two rosters are what
 * say the classifier reads the names rather than the count.
 */
const SOURCE_STORE_METHODS = [
  'approveAndApplyProposal',
  'countPendingProposals',
  'countSourceDependents',
  'countSourceFailures',
  'countSources',
  'deleteSource',
  'findProposalById',
  'findSourceById',
  'insertSource',
  'listPendingProposals',
  'listSourceFailures',
  'listSourcesWithParseStats',
  'updateSource',
] as const satisfies readonly (keyof SourceStore)[];

/** The same, for `ConnectorStore`, which declares none either. */
const CONNECTOR_STORE_METHODS = [
  'countConnectorDependents',
  'countConnectors',
  'deleteConnector',
  'findConnectorById',
  'insertConnector',
  'listConnectors',
  'updateConnector',
] as const satisfies readonly (keyof ConnectorStore)[];

/**
 * `true` only while `L` names every key of `T`.
 *
 * The tuple wrapper is load-bearing rather than decoration: without
 * it the union distributes over the conditional and the answer is
 * `boolean`, which accepts `true` as an initializer and pins nothing
 * at all.
 *
 * @typeParam T - The type whose keys must all be named.
 * @typeParam L - The list naming them, as `typeof <the const>`.
 */
type CoversEveryKey<T, L extends readonly PropertyKey[]> =
  [Exclude<keyof T, L[number]>] extends [never] ? true : false;

/** The four lists above, held against the ports they describe. */
type EveryMethodListed =
  CoversEveryKey<TopicStore, typeof TOPIC_STORE_METHODS>
  & CoversEveryKey<SubscriptionStore, typeof SUBSCRIPTION_STORE_METHODS>
  & CoversEveryKey<SourceStore, typeof SOURCE_STORE_METHODS>
  & CoversEveryKey<ConnectorStore, typeof CONNECTOR_STORE_METHODS>;

/**
 * The half of the roster guard `check-types` owns.
 *
 * A method added to any of the four ports and to no list above
 * collapses {@link EveryMethodListed} to `never`, and this
 * initializer is then a TS2322 at this line — before any case can
 * classify a roster that has quietly stopped describing its port. An
 * INTERSECTION rather than four reads, so the message names `never`
 * rather than `false`. Read in a case below, so it is a symbol this
 * file uses rather than one lint reports.
 */
const EVERY_METHOD_LISTED: EveryMethodListed = true;

/**
 * What a schedule-writing method is called on these ports.
 *
 * The NAME reading, and the weaker of the two on purpose: a method
 * that wrote the column under some other name would pass it. The
 * signature reading below never looks at a name at all, and the case
 * holding the two against each other is what makes either worth
 * having.
 */
const SCHEDULE_WRITER_MARKER = 'Schedule';

/** Whether one method name is a schedule writer by that reading. */
function isScheduleWriterName(name: string): boolean {
  return name.includes(SCHEDULE_WRITER_MARKER);
}

/**
 * Names no port declares, run through the classifier beside the real
 * rosters.
 *
 * A classifier matching nothing answers the empty list over any
 * roster, and every case below reads an empty list as good news
 * somewhere. These are what separate the two: the first pair has to
 * classify as writers and the second pair has to not, in the same
 * case, so a classifier that had stopped discriminating fails
 * whichever way it broke.
 */
const FABRICATED_WRITER_NAMES: readonly string[] = [
  'clearTopicSchedule',
  'updateSubscriptionScheduleBatch',
];

/** The other side of the same control. */
const FABRICATED_READER_NAMES: readonly string[] = [
  'listTopicsDue',
  'findSubscriptionByConnectorId',
];

/**
 * `true` only while `T` is a union of exactly one member.
 *
 * `never` answers `false` rather than `true`, which is what lets the
 * same type pin a port declaring one writer and a port declaring
 * none without a second reading.
 */
type IsUnion<T, U = T> = T extends unknown
  ? [U] extends [T] ? false : true
  : never;

type ExactlyOne<T> = [T] extends [never]
  ? false
  : [IsUnion<T>] extends [false] ? true : false;

/**
 * The methods of `Port` whose parameters are exactly
 * `(id: number, nextRunAt: Date)`.
 *
 * The SIGNATURE reading, and it never looks at a name. Assignability
 * is required in BOTH directions over the parameter tuple: one way
 * alone admits `(id: number, patch: unknown)`, whose second
 * parameter every `Date` satisfies, and the other alone admits a
 * method taking nothing at all.
 *
 * That shape is the whole of what a schedule write is on these two
 * ports — an id and an instant, answering the stored row — so a
 * second method able to move `next_run_at` would have to take it,
 * and would show up here whatever it was called.
 */
type ScheduleWriter<Port> = {
  [K in keyof Port]-?: Port[K] extends (...args: never[]) => unknown
    ? Parameters<Port[K]> extends [number, Date]
      ? [number, Date] extends Parameters<Port[K]> ? K : never
      : never
    : never;
}[keyof Port];

type TopicWriterName = ScheduleWriter<TopicStore>;
type SubscriptionWriterName = ScheduleWriter<SubscriptionStore>;
type SourceWriterName = ScheduleWriter<SourceStore>;
type ConnectorWriterName = ScheduleWriter<ConnectorStore>;

/** One writer on each of the two ports that carry a schedule. */
type ScheduleWritersPinned =
  ExactlyOne<TopicWriterName> & ExactlyOne<SubscriptionWriterName>;

/** None on the two that do not. */
type OtherPortsPinned =
  ExactlyOne<SourceWriterName> & ExactlyOne<ConnectorWriterName>;

/**
 * A port carrying a second writer under a name the marker also
 * finds.
 *
 * The negative control for both pins below. Without it `true` is an
 * answer a type collapsing to `boolean` would accept and a `false`
 * one a type answering `never` would, and neither would be visible
 * in a green run.
 */
interface PlantedSecondWriterPort extends TopicStore {
  clearTopicSchedule(
    id: number,
    nextRunAt: Date,
  ): Promise<TopicRecord | null>;
}

/** Two writers, so neither pin above may answer its own shape. */
type PlantedPortPinned =
  ExactlyOne<ScheduleWriter<PlantedSecondWriterPort>>;

/**
 * The half of the writer-count guard `check-types` owns.
 *
 * A schedule writer added to either schedule port collapses
 * {@link ScheduleWritersPinned} to `false`; one added to
 * `SourceStore` or `ConnectorStore` collapses
 * {@link OtherPortsPinned} to `true`; and the planted port is what
 * says both readings discriminate rather than answering their
 * initializer whatever the ports hold. All three are TS2322 at their
 * own line, before any case runs.
 */
const SCHEDULE_WRITERS_PINNED: ScheduleWritersPinned = true;
const OTHER_PORTS_PINNED: OtherPortsPinned = false;
const PLANTED_PORT_PINNED: PlantedPortPinned = false;

/**
 * The two names the signature reading resolves to.
 *
 * A tuple whose members are the derived types rather than `string`,
 * so this is the pin that says WHICH method each port's one writer
 * is — the count pins above are satisfied by any single method of
 * that shape. Read in the case below against the same names the
 * classifier picks out of the rosters, which is where the two
 * readings meet.
 */
const WRITER_NAMES: readonly [
  TopicWriterName,
  SubscriptionWriterName,
] = ['updateTopicSchedule', 'updateSubscriptionSchedule'];

describe('schedule ports — one writer apiece', () => {
  // The pin the four rosters rest on, read here so it is a symbol
  // this file uses. Its failure is a TS2322 rather than a red case:
  // by the time a case could run, the lists already describe their
  // ports.
  it('lists every method each of the four ports declares', () => {
    expect(EVERY_METHOD_LISTED).toBe(true);
    expect(TOPIC_STORE_METHODS).toContain('updateTopicSchedule');
    expect(SUBSCRIPTION_STORE_METHODS)
      .toContain('updateSubscriptionSchedule');
  });

  // Both directions in one case, because either alone is satisfied by
  // a classifier that has stopped reading its argument: one matching
  // everything passes the writers, one matching nothing passes the
  // readers, and only the pair rules out both.
  it('classifies a fabricated writer and a fabricated reader', () => {
    expect(FABRICATED_WRITER_NAMES.filter(isScheduleWriterName))
      .toEqual([...FABRICATED_WRITER_NAMES]);
    expect(FABRICATED_READER_NAMES.filter(isScheduleWriterName))
      .toEqual([]);
  });

  // The claim itself, on the name reading, held against the signature
  // reading in the same assertion. Two independent classifications
  // agreeing is what makes either one evidence: a writer renamed past
  // the marker moves the left side, and one taking a different
  // parameter list moves the right.
  it('names exactly one schedule writer on each schedule port', () => {
    expect(TOPIC_STORE_METHODS.filter(isScheduleWriterName))
      .toEqual([WRITER_NAMES[0]]);
    expect(SUBSCRIPTION_STORE_METHODS.filter(isScheduleWriterName))
      .toEqual([WRITER_NAMES[1]]);
  });

  // The containment complement, and the reading that says the
  // classifier discriminates against real ports rather than against
  // the two fabricated names above. Neither of these tables carries a
  // schedule at all, so a method here matching the marker is either a
  // column that has grown one or a name that has drifted.
  it('names no schedule writer on the other two wave-2 ports', () => {
    expect(SOURCE_STORE_METHODS.filter(isScheduleWriterName)).toEqual([]);
    expect(CONNECTOR_STORE_METHODS.filter(isScheduleWriterName))
      .toEqual([]);
  });

  // The signature reading, read here for the same reason the roster
  // pin is: these are `check-types` claims, and a case that reads
  // them is what keeps them symbols the file uses. The three
  // together are the count on the schedule ports, the zero on the
  // other two, and the planted port that says both discriminate.
  it('pins the writer count and its signature at the type level', () => {
    expect(SCHEDULE_WRITERS_PINNED).toBe(true);
    expect(OTHER_PORTS_PINNED).toBe(false);
    expect(PLANTED_PORT_PINNED).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Scan-root fixtures
// ---------------------------------------------------------------------------

// The walk is asserted against real directories rather than a mocked
// `node:fs`. What it has to get right is filesystem behaviour — a
// path that is a file where a directory was declared, a root holding
// nothing the scan is allowed to read — and a mock of that behaviour
// proves only that the mock and the assertion were written to agree.

/**
 * Fixture package roots created below, removed once this file ends.
 *
 * A registry rather than one shared tree: each case builds its own
 * root per sabotage, so one case can never leave another looking at
 * a directory it already broke.
 */
const FIXTURE_ROOTS: string[] = [];

afterAll(() => {
  for (const fixtureRoot of FIXTURE_ROOTS) {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

/** The one module every healthy fixture root is given. */
const FIXTURE_MODULE = 'service.ts';

/** The one file a root can hold and still be refused. */
const FIXTURE_TEST = 'service.test.ts';

/** Never opened: the walk lists modules, so only presence matters. */
const FIXTURE_CONTENT = 'export const planted = 1;\n';

/** One way a declared root stops contributing modules. */
interface RootSabotage {
  /** Reads as the case name: `refuses a root that <label>`. */
  readonly label: string;
  /**
   * Puts the root path into that state, having first been handed a
   * root whose contents were removed — so a sabotage that does
   * nothing leaves the root absent.
   */
  readonly apply: (rootPath: string) => void;
}

const ROOT_SABOTAGES: readonly RootSabotage[] = [
  // Nothing is put back: the renamed or mistyped root. It is also the
  // case the walk has to intercept before `readdirSync` reaches it,
  // so that a declared surface disagreeing with the tree is reported
  // as that rather than as an ENOENT out of the recursion.
  {
    label: 'is missing altogether',
    apply: () => {},
  },
  // Present, readable and holding nothing. No error surfaces from the
  // filesystem at all here, which makes this the case that would pass
  // in silence were the walk to take its own root list on trust.
  {
    label: 'exists but is empty',
    apply: (rootPath) => mkdirSync(rootPath),
  },
  // A file where a directory was declared — the shape a root takes
  // when something is renamed onto it, or when a group collapses to a
  // single module and its declaration does not follow.
  {
    label: 'is a file rather than a directory',
    apply: (rootPath) => writeFileSync(rootPath, FIXTURE_CONTENT),
  },
  // This invariant's own shape, and the one no filesystem error
  // reports: present, readable, populated, and holding nothing the
  // suffix rule lets the scan read. The filter runs before the count,
  // so the walk refuses this exactly as it refuses an empty root. A
  // group whose modules were all renamed to `*.test.ts` would
  // otherwise contribute a clean zero to the contents case.
  {
    label: 'holds nothing but colocated tests',
    apply: (rootPath) => {
      mkdirSync(rootPath);
      writeFileSync(join(rootPath, FIXTURE_TEST), FIXTURE_CONTENT);
    },
  },
];

/** A miniature package root with one module inside every root. */
function makeFixture(): string {
  const packageRoot = mkdtempSync(join(tmpdir(), 'ar-schedule-scan-'));
  FIXTURE_ROOTS.push(packageRoot);

  for (const root of SCAN_ROOTS) {
    const rootPath = join(packageRoot, root);
    mkdirSync(rootPath, { recursive: true });
    writeFileSync(join(rootPath, FIXTURE_MODULE), FIXTURE_CONTENT);
  }

  return packageRoot;
}

/** The same fixture with one root emptied and then sabotaged. */
function makeSabotagedFixture(
  root: string,
  sabotage: RootSabotage,
): string {
  const packageRoot = makeFixture();
  const rootPath = join(packageRoot, root);

  rmSync(rootPath, { recursive: true });
  sabotage.apply(rootPath);

  return packageRoot;
}

/** Returned when the walk ran through instead of refusing a root. */
const NOT_REFUSED = '(no root refused)';

/**
 * The root {@link collectScannedModules} refused, or
 * {@link NOT_REFUSED} when it walked the fixture through.
 *
 * Only {@link EmptyScanError} counts as a refusal; anything else is
 * rethrown. A missing directory arriving as a bare filesystem error
 * is a different event from the walk naming a root it will not
 * accept, and folding the two together would let a walk that had
 * stopped working pass an assertion about coverage.
 */
function refusedRoot(packageRoot: string): string | null {
  try {
    collectScannedModules(packageRoot);
  } catch (thrown) {
    if (thrown instanceof EmptyScanError) {
      return thrown.root;
    }

    throw thrown;
  }

  return NOT_REFUSED;
}

describe('collectScannedModules — declared scan roots', () => {
  // The control the refusals rest on. Every case below starts from
  // this fixture and breaks exactly one root, so a refusal says
  // something only while the untouched tree is one the walk accepts
  // and reports in full — otherwise a fixture nothing could walk
  // would satisfy all of them.
  it('returns a module from every declared root when populated', () => {
    const expected = SCAN_ROOTS.map((root) => `${root}/${FIXTURE_MODULE}`);

    expect(collectScannedModules(makeFixture())).toEqual(expected);
  });

  for (const sabotage of ROOT_SABOTAGES) {
    // Swept across every declared root rather than applied to one.
    // The guard runs inside the per-root walk, and a version of it
    // that covered only the first root — or only the last — would
    // pass a single-root case while leaving the rest of the surface
    // free to shrink in silence. Reported as the list of roots that
    // went unrefused, so a failure names them instead of counting.
    it(`refuses a root that ${sabotage.label}`, () => {
      const unrefused = SCAN_ROOTS.filter(
        (root) => refusedRoot(makeSabotagedFixture(root, sabotage)) !== root,
      );

      expect(unrefused).toEqual([]);
    });
  }
});
