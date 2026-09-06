/**
 * The API read-first invariant, run against the real
 * `packages/service` tree.
 *
 * The rule has two halves and they are checked by two different
 * mechanisms, because neither reading is honest alone.
 *
 * TEXTUALLY: no module under `src/findings/`, `src/documents/`,
 * `src/entities/` or `src/runs/` invokes a workflow or reaches the
 * network. This wave serves what a pipeline produced — findings,
 * the documents they were read out of, the subjects they name, and
 * the passes that made them — so a module here that called
 * `ar-research` or opened a socket would be claiming work rather
 * than answering it.
 *
 * STRUCTURALLY: every method the four wave-3 ports declare, plus
 * the four `SourceStore` methods over `source_config_proposals`, is
 * either a named READER or one of exactly four named WRITERS, and
 * no type any of those writers is HANDED carries a `score`,
 * `scoreVersion` or `parseStatus` member. Both are read off `keyof`
 * rather than off a roster somebody keeps in step by hand.
 *
 * `docs/architecture/08-http-api.md` states the law under
 * `Read-first` and every one of the four port headers restates it
 * for its own group. This file is what makes it a property of the
 * tree instead.
 *
 * THE TABLE CONTAINMENT NEXT DOOR IS NOT REPEATABLE HERE, and that
 * is the first thing to say about the roster below.
 * `tests/invariants/api-schedule-containment.test.ts` can forbid
 * `runs`, `llm_calls` and `research_pool` outright, because no
 * wave-2 group serves any of them. This wave serves all three: the
 * runs page reads `runs`, the spend summary aggregates `llm_calls`,
 * the entity gate rules on `research_pool`, and two groups read
 * `entity_research`. Measured over the code half of these nineteen
 * modules, those four names occur 24, 21, 19 and 22 times. So the
 * containment that has a subject here is over reaches this surface
 * has no business making at all, and the tables are left to the
 * port half below — where the claim is not that a table is unnamed
 * but that nothing on the port can write it.
 *
 * THE DATABASE IS NOT THE NETWORK the rule is about. Every module
 * here reaches Postgres, by construction and on purpose: a port
 * that could not would serve nothing. What the roster forbids is a
 * second reach — an HTTP request out of this process, a workflow
 * named and invoked — which is a different act with a different
 * consequence.
 *
 * Identifiers are what the roster holds, not values. A textual scan
 * cannot follow a call into a variable named something else, and
 * does not need to: a workflow arrives by its id being written down
 * and a transport arrives by a specifier being imported, so the
 * spelling travels with the reach. Such a change type-checks, it
 * lints, and every suite here stays green.
 *
 * WHAT THE SURFACE IS, and each half of it is a decision. The roots
 * are the four resource directories rather than the whole of `src/`,
 * because the modules those reaches belong to are supposed to make
 * them — `src/sources/listing-api.ts` fetches, and `scripts/`
 * carries the n8n client. Inside a root the scan reads `.ts`
 * modules and skips the colocated `.test.ts` files: what ships is
 * what could reach out in a deployment, and a vitest title is
 * English. Both exclusions are asserted as a set difference below
 * rather than trusted, so a surface that has quietly shrunk is a
 * failing case and not a clean zero.
 *
 * WHAT A MODULE COMMENTS SAY IS NOT WHAT IT DOES, and here the two
 * disagree on purpose. These headers name the workflows constantly
 * — to argue that `ar-score` writes the two score columns this port
 * only answers, that `ar-research` owns `entity_research`, that
 * `ar-ingest` and `ar-capture` are the only writers that can say a
 * parse went wrong. Every one of those sentences is the containment
 * being stated, and a scan reporting them would be turned off
 * inside a phase. So each file is split into a code half and a
 * comment half by line, the roster runs over the code half, and the
 * comment half is read in the same run as the live control the
 * roster would otherwise have none of: a workflow id has to occur
 * there a non-zero number of times, in more than one file, or the
 * needle has stopped matching and the zero beside it is about
 * nothing.
 *
 * ONE ENTRY CARRIES THAT CONTROL AND THREE DO NOT, and saying which
 * is which is the difference between a control and a claim. The
 * workflow ids answer 27 times across 9 of the 19 modules comment
 * halves. `n8n` and the transport specifiers occur in NEITHER half
 * anywhere under these roots, and the global fetch occurs once, in
 * one file. Those three zeros rest on the planted samples below and
 * on nothing else.
 *
 * That split is exact on this tree rather than approximately right,
 * and two cases keep it that way. A comment here is always a whole
 * line — no code line carries a trailing `//` or an inline block —
 * and no template literal spans lines, so no continuation can be
 * misread as a comment. Both are asserted over the real modules
 * with quoted spans removed first, so a `https://` inside a string
 * is not mistaken for a comment opener. Break either house rule and
 * the case reddens naming the file and line, which is the point:
 * the classifier is simple because the tree is, and it says so.
 *
 * The scan surface is established before any of that. A containment
 * check reports what it found in the files it was handed and says
 * nothing about the files it was not, so a root that has been
 * renamed, emptied, or left holding nothing but colocated tests
 * simply stops contributing and the run stays green over whatever
 * remains. The walk therefore refuses to produce a result at all
 * rather than return a zero it did not earn.
 *
 * THE PORTS ARE THE SECOND HALF and are checked twice. The NAME
 * reading is a roster of every method each port declares, pinned
 * two-directionally against `keyof` so a method added to a port has
 * to be named here, then classified by its leading verb — with
 * fabricated names of THREE kinds pushed through the same
 * classifier in the same case, since one matching nothing answers
 * the empty list over any roster. The TYPE reading derives the same
 * split from `keyof` and a template literal, holds the writer union
 * equal to the four names both ways, holds reader and writer
 * disjoint and covering on every port, and declares a planted port
 * carrying a fifth writer `false` beside them.
 *
 * NO SIGNATURE READING IS AVAILABLE HERE, which is the one place
 * this file is weaker than the schedule containment next door and
 * is worth stating rather than leaving to be noticed. There a
 * writer had a shape no reader could take, `(id: number, nextRunAt:
 * Date)`, so a second one showed up whatever it was called. Two of
 * the four writers here are `(id: number)` answering
 * `Promise<Row | null>` — `approvePoolRow` is that shape and so is
 * `findPoolRowById`, `approveAndApplyProposal` is that shape and so
 * is `findProposalById` — so no derivation over parameters can
 * separate them. The two readings below are therefore ONE RULE
 * expressed in two languages rather than two independent
 * classifications, and what the pair buys is that a roster and a
 * port cannot drift apart, not that a rename past the verb would be
 * caught.
 *
 * THE MEMBER HALF IS WHERE THE REAL CONTROLS ARE. A zero over
 * `Extract<keyof T, ...>` is satisfied by a member roster that has
 * stopped naming anything, so the pins over the input types sit
 * beside two types from this same tree that DO carry those members
 * — `DocumentFilter`, which narrows by `parseStatus`, and
 * `FindingRecord`, which answers `score` and `scoreVersion` — each
 * declared `false`. They are real and deliberately excluded, so
 * their answers say the extraction discriminates among types that
 * exist rather than only against a fabricated one; a planted patch
 * carrying `score` is declared `false` beside them for the shape a
 * later edit would actually take.
 *
 * Unlike the de-origination needles next door, the spellings below
 * are written out. They are not strings this repository is
 * forbidden to contain — six of them are workflows it builds on
 * purpose and seven are node builtins `lib/` imports — and `tests/`
 * is not one of the trees the walk opens, so the roster sits
 * outside its own surface however it is spelled.
 *
 * One file rather than the module-and-test pair the auth
 * containment and the send-free scan are each split into: nothing
 * else consumes this roster or this walk, and the split there
 * exists so a second reader can have them.
 *
 * The package root is derived from this file own location rather
 * than from the working directory, so the same tree is scanned
 * whether the suite is started from the package or from the repo
 * root.
 */
import type {
  DocumentFilter,
  DocumentStore,
} from '../../src/documents/store.js';
import type {
  EntityNamePatch,
  EntityPatch,
  EntityStore,
} from '../../src/entities/store.js';
import type {
  FindingRecord,
  FindingStore,
  InsertFindingLabelInput,
} from '../../src/findings/store.js';
import type { LlmCallRecord, RunStore } from '../../src/runs/store.js';
import type {
  SourceConfigUpdate,
} from '../../src/sources/config-proposer.js';
import type { SourceStore } from '../../src/sources/store.js';

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
 * One per wave-3 resource group, and the whole of each. Two of them
 * hold more than the four modules a group takes at minimum —
 * `src/findings/` carries the verdict service beside the port, the
 * service, the db-store and the router, and `src/runs/` carries the
 * spend service and its own router — and that is deliberate rather
 * than an accident of the directory name: a spend summary has no
 * more business opening a socket than a route handler does, and
 * narrowing the roots to the modules a plan happened to name would
 * be an exclusion nobody afterwards knows the reach of.
 *
 * What is NOT here is the rest of `src/`. `src/sources/` fetches on
 * purpose through its adapters, `src/notifications/` delivers, and
 * `scripts/` holds the n8n client — a scan reporting any of them
 * would be narrowed or turned off inside a phase.
 */
const SCAN_ROOTS: readonly string[] = [
  'src/documents',
  'src/entities',
  'src/findings',
  'src/runs',
];

/** What a scanned module is called. */
const MODULE_SUFFIX = '.ts';

/**
 * What a colocated test is called, and the one thing inside a root
 * the walk skips.
 *
 * The rule is about what ships. A test cannot reach a host in a
 * deployment, and its titles are English. The subtraction is
 * visible rather than implied — the case below holds the scanned
 * set plus the skipped set against an independent walk of the whole
 * tree, so a suffix that stopped matching, or a filter that grew,
 * shows up as files present in one list and missing from the other.
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
      ? 'The read-first scan declares no roots at all'
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

/** One module lines, split into what it does and what it argues. */
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
 * One module content, split by line into code and comment.
 *
 * By line and not by lexing, which is a decision the tree earns
 * rather than a shortcut. Two properties make the classification
 * exact here — no code line carries a comment delimiter, and no
 * template literal spans lines — and both are asserted over the real
 * modules below, so the day either stops holding is the day a case
 * says so and names the file. A lexer would be correct on a tree
 * neither property held for, and wrong in ways nothing would report.
 *
 * The second property is worth more here than next door, because
 * four of these nineteen modules are db-stores and every one of them
 * writes `sql` templates. All of them close on the line they open,
 * which is what the case asserts rather than what it assumes.
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

/**
 * How much of an identifier edge a needle requires.
 *
 * Three modes rather than the boolean the schedule containment next
 * door takes, because a module specifier is a third shape neither of
 * that pair can express. The mode is per entry and every one of the
 * three is exercised by a case below.
 */
type NeedleBoundary = 'identifier' | 'none' | 'specifier';

/** One name the code half of a scanned module may not carry. */
interface ExternalReachIdentifier {
  /**
   * The id a failure report, a planted sample and the coverage case
   * pair on. Kebab, and never one of the spellings itself, so the
   * report can name what was found without printing it twice.
   */
  readonly id: string;
  /**
   * Every spelling that names the same reach, alternated into one
   * needle. A transport arrives under one name and several module
   * specifiers; a workflow arrives under its own id.
   */
  readonly spellings: readonly string[];
  /** How the alternation is fenced. See {@link NeedleBoundary}. */
  readonly boundary: NeedleBoundary;
  /** What the spellings name, and why that reach is forbidden. */
  readonly description: string;
}

/**
 * The names no scanned module code may contain.
 *
 * Two workflow reaches and two network ones. The workflows are the
 * passes this surface answers for — `ar-ingest` and `ar-capture`
 * wrote the documents, `ar-score` wrote the two score columns,
 * `ar-research` wrote the research, `ar-digest` reads the lot, and
 * `ar-dispatch` is what starts any of them — so a module here
 * naming one would be a second way to cause work. `run-now` on the
 * topics and sources groups remains the only spelling on the whole
 * API that does, and it does it by setting a schedule column.
 *
 * The network pair is the reach itself, in the two shapes it takes.
 * `fetch` needs no import at all, which is the whole reason it is a
 * separate entry from the builtins: an import list cannot report it.
 * The builtins are named as SPECIFIERS rather than as words, and
 * that is measured rather than fastidious — every one of these
 * nineteen modules imports from `src/http/`, so a needle keyed on
 * the bare word `http` answers 34 times in the code half and none
 * of them is a reach.
 *
 * WHAT IS NOT REACHED, said here rather than left to be discovered.
 * A URL written into a string literal is not a hit: the tail of the
 * specifier needle is a quote or a slash and a scheme is followed
 * by a colon. That is the right side to be wrong on — an address is
 * not a request, and the request that would use it names `fetch` or
 * a builtin on some other line.
 *
 * Matching is case-insensitive. `n8n` becomes `N8N` in an
 * environment key and `X-N8N-API-KEY` in a header, and a builtin
 * becomes a different word the moment somebody names a type after
 * it.
 */
const EXTERNAL_REACH_IDENTIFIERS: readonly ExternalReachIdentifier[] = [
  {
    id: 'workflow-invocation',
    spellings: [
      'ar-capture',
      'ar-digest',
      'ar-dispatch',
      'ar-ingest',
      'ar-research',
      'ar-score',
    ],
    boundary: 'none',
    description:
      'A workflow this deployment builds, by the id '
      + '`workflows/src/` gives it and `workflows/dist/` ships it '
      + 'under. The id is the only handle a caller has, so naming '
      + 'one is the first half of invoking it.',
  },
  {
    id: 'n8n-invocation',
    spellings: ['n8n'],
    boundary: 'none',
    description:
      'Any spelling of an n8n invocation — the REST client under '
      + '`scripts/`, the `AR_N8N_URL` and `AR_N8N_API_KEY` config '
      + 'members, the `X-N8N-API-KEY` header, a node type. Every '
      + 'one of them is a compound, which is why this entry is '
      + 'fenced by nothing.',
  },
  {
    id: 'global-fetch',
    spellings: ['fetch'],
    boundary: 'identifier',
    description:
      'The global, and the one reach here that needs no import at '
      + 'all — so it is the reach an import list cannot report, and '
      + 'the reason a roster of module specifiers alone would be a '
      + 'roster with a hole in it.',
  },
  {
    id: 'transport-builtin',
    spellings: [
      'dgram',
      'dns',
      'http',
      'http2',
      'https',
      'net',
      'tls',
    ],
    boundary: 'specifier',
    description:
      'The transport builtins, as a module specifier: plain HTTP, '
      + 'its TLS and multiplexed forms, a raw socket, the TLS '
      + 'wrapper, datagrams and the resolver. Both the `node:` '
      + 'prefixed spelling and the bare one, since `lib/` imports '
      + 'one builtin each way.',
  },
];

/** One occurrence of a rostered name, as the scan reports it. */
interface ExternalReachMatch {
  /**
   * `id` of the {@link EXTERNAL_REACH_IDENTIFIERS} entry that
   * matched. Reported rather than the matched text, so a hit in any
   * casing or any spelling leads to the one entry that describes it.
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
 * Built fresh on every call and never cached, which is a rule this
 * file keeps rather than a hazard it is exposed to. A global
 * `RegExp` carries `lastIndex` from one use to the next, so a
 * shared instance is a scan that passes and fails alternately over
 * unchanged input wherever it is driven through `.test` or
 * `.exec`. `matchAll` is not one of those: it copies `lastIndex`
 * onto a clone and leaves the source alone, so hoisting these
 * needles to module scope reddens NOTHING here — measured, and
 * said out loud because the next reader will otherwise take the
 * freshness for a rule some case covers. It stays because the
 * matcher is one `.test` away from a different answer.
 *
 * The `specifier` fence is the one that needs reading twice. It
 * takes an opening quote and an optional `node:` before the name,
 * and a closing quote or a slash after it, so it reaches
 * `'node:https'`, the bare `'http'` two `lib/express/` modules
 * import, and the promises subpath shape a builtin takes — while
 * leaving the `'../http/envelope.js'` every module here imports
 * alone, the character before that name being a slash.
 */
function needleFor(entry: ExternalReachIdentifier): RegExp {
  const alternatives = entry.spellings.join('|');
  const sources: Readonly<Record<NeedleBoundary, string>> = {
    identifier: `(?<![A-Za-z0-9_$])(?:${alternatives})(?![A-Za-z0-9_$])`,
    none: `(?:${alternatives})`,
    specifier: `['"](?:node:)?(?:${alternatives})['"/]`,
  };

  return new RegExp(sources[entry.boundary], 'giu');
}

/**
 * Every rostered name in one module lines, one record per hit.
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
 * within a line in the order {@link EXTERNAL_REACH_IDENTIFIERS}
 * declares.
 */
function findExternalReach(
  lines: readonly SourceLine[],
  filePath: string,
): readonly ExternalReachMatch[] {
  const needles = EXTERNAL_REACH_IDENTIFIERS.map((entry) => ({
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
 * Every scanned module content, read and split at module scope.
 *
 * Once rather than per case: four cases below read these halves, and
 * re-reading nineteen files for each of them buys nothing. A path
 * that has gone missing between the walk and the read takes the file
 * down here with the filesystem own message naming it.
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

describe('read-first — scan surface', () => {
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
      'src/documents',
      'src/entities',
      'src/findings',
      'src/runs',
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
  'import { findings } from \'../db/schema.js\';',
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

  // The second property, and the one four db-stores here could
  // plausibly break: a `sql` template spanning lines would put its
  // continuation lines through the classifier on their own, and one
  // beginning with a star would be filed as a comment — which is how
  // a raw statement could sit in the half the roster never reads.
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
   * `id` of the {@link EXTERNAL_REACH_IDENTIFIERS} entry under test.
   * Pairing by id rather than by position means a reordered roster
   * still tests what it says it tests, and an entry left without a
   * sample is caught by the coverage case below rather than silently
   * going untested.
   */
  readonly id: string;
  /**
   * The line planted into the body, in a shape the reach really
   * takes where one of these leaks: a workflow started by id, an
   * authenticated call out, a request through the global, a
   * transport imported. A sample reduced to the bare spelling would
   * pass against a needle too narrow to survive real code around it.
   *
   * Exactly one rostered spelling per line, which is what lets each
   * case below assert the whole result rather than search it.
   */
  readonly line: string;
}

const PLANTED_SAMPLES: readonly PlantedSample[] = [
  {
    id: 'workflow-invocation',
    line: '  await client.startWorkflow(\'ar-research\', { entityId });',
  },
  {
    id: 'n8n-invocation',
    line: '  const started = await n8nClient.runOnce(workflowId);',
  },
  {
    id: 'global-fetch',
    line: '  const answer = await fetch(endpoint, { method: \'GET\' });',
  },
  {
    id: 'transport-builtin',
    line: '  import { request } from \'node:https\';',
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
  'const page = await store.listFindings(domainId, filter, sort, window);',
  'const total = await store.countFindings(domainId, filter);',
];

const CLEAN_LINES_AFTER: readonly string[] = [
  'return okPage(page.map(toFindingResource), { page: 1, total });',
];

/** 1-based, matching what the matcher reports and an editor shows. */
const PLANTED_LINE_NUMBER = CLEAN_LINES_BEFORE.length + 1;

/**
 * Path the samples are attributed to. Named but never opened: the
 * matcher takes lines, so this only has to be the string it carries
 * back into the report. Fabricated rather than real, so no case here
 * can be read as a claim about a module that exists.
 */
const SAMPLE_FILE_PATH = 'src/findings/example-store.ts';

/** The sample line surrounded by clean content, as one module. */
function plantInModule(line: string): readonly SourceLine[] {
  return [...CLEAN_LINES_BEFORE, line, ...CLEAN_LINES_AFTER].map(
    (text, index) => ({ lineNumber: index + 1, text }),
  );
}

// ---------------------------------------------------------------------------
// Roster liveness
// ---------------------------------------------------------------------------

describe('findExternalReach — planted samples', () => {
  // Without this, an entry added to the roster with no sample beside
  // it is one nothing proves can still match, and the suite stays
  // green while coverage shrinks — the same vacuous pass the walk
  // guards against by refusing a root that contributes nothing.
  it('plants a sample for every id the roster declares', () => {
    const planted = PLANTED_SAMPLES.map((sample) => sample.id);
    const declared = EXTERNAL_REACH_IDENTIFIERS.map((entry) => entry.id);

    expect([...planted].sort()).toEqual([...declared].sort());
  });

  for (const sample of PLANTED_SAMPLES) {
    // Exact equality on the whole record, not a length or a
    // containment check: it pins the hit to the planted line rather
    // than to any hit anywhere in the body, and it fails if a sample
    // starts matching a second entry as well — which is how a needle
    // widened past its own subject first shows up.
    it(`flags ${sample.id} on the line it occurs`, () => {
      const matches = findExternalReach(
        plantInModule(sample.line),
        SAMPLE_FILE_PATH,
      );

      const expected: ExternalReachMatch = {
        id: sample.id,
        filePath: SAMPLE_FILE_PATH,
        lineNumber: PLANTED_LINE_NUMBER,
        line: sample.line,
      };

      expect(matches).toStrictEqual([expected]);
    });
  }

  // Every sample above is spelled the way the code would spell it, so
  // none of them would notice the needles case-insensitive flag
  // going. This is the one plant whose casing is not a declared one,
  // and it is the casing the reach actually arrives in: the two
  // config members and the header are all upper case, so a
  // case-sensitive scan walks straight past every real spelling of
  // an authenticated call to the dispatcher.
  it('flags a rostered spelling in another casing', () => {
    const line = '  const base = process.env.AR_N8N_URL ?? fallback;';
    const matches = findExternalReach(
      plantInModule(line),
      SAMPLE_FILE_PATH,
    );

    const expected: ExternalReachMatch = {
      id: 'n8n-invocation',
      filePath: SAMPLE_FILE_PATH,
      lineNumber: PLANTED_LINE_NUMBER,
      line,
    };

    expect(matches).toStrictEqual([expected]);
  });

  // The `identifier` fence, and the reason the fetch entry carries
  // one where the two beside it do not. The word occurs four times
  // in these headers — a read fetching a window, research nothing
  // re-fetched, a ledger otherwise fetched whole — so an unfenced
  // needle answers four where this one answers one. None of those
  // four is code today, which is exactly the point: the fence is
  // what keeps a local named for the same idea out of the code half.
  it('leaves a compound the fetch needle is written around', () => {
    const line = '  const cached = prefetchedRows.get(finding.id);';

    expect(findExternalReach(plantInModule(line), SAMPLE_FILE_PATH))
      .toStrictEqual([]);
  });

  // The `none` fence in the other direction, and the reason the n8n
  // entry carries nothing: every real spelling is a compound, so an
  // identifier fence would answer nothing anywhere. Two shapes, a
  // header and a node type, both of which a fenced needle misses.
  it('flags an n8n spelling that carries no identifier edge', () => {
    const lines: readonly SourceLine[] = [
      {
        lineNumber: 1,
        text: '  const headers = { \'X-N8N-API-KEY\': key };',
      },
      { lineNumber: 2, text: '  type: \'n8n-nodes-base.executeWorkflow\',' },
    ];
    const found = findExternalReach(lines, SAMPLE_FILE_PATH);

    expect(found.map((match) => match.lineNumber)).toEqual([1, 2]);
    expect(new Set(found.map((match) => match.id)))
      .toStrictEqual(new Set(['n8n-invocation']));
  });

  // The `specifier` fence, both directions in one case, and the
  // reading that says why the transport entry is not a word roster.
  // The first line is the import every one of these nineteen modules
  // carries, and a needle keyed on the bare word answers it 34 times
  // across the code half; the second and third are the two spellings
  // a real transport import takes, one of which `lib/express/` uses
  // today.
  it('reads a transport specifier and not an http import path', () => {
    const lines: readonly SourceLine[] = [
      {
        lineNumber: 1,
        text: '  import { ok } from \'../http/envelope.js\';',
      },
      { lineNumber: 2, text: '  import { createServer } from \'http\';' },
      { lineNumber: 3, text: '  import { connect } from \'node:net\';' },
    ];
    const found = findExternalReach(lines, SAMPLE_FILE_PATH);

    expect(found.map((match) => match.lineNumber)).toEqual([2, 3]);
    expect(new Set(found.map((match) => match.id)))
      .toStrictEqual(new Set(['transport-builtin']));
  });
});

describe('findExternalReach — the comment half', () => {
  // The live control, and the only one the roster has against the
  // real tree. These headers name the workflows constantly and on
  // purpose — to argue that `ar-score` writes the two score columns
  // this surface only answers, that `ar-research` owns
  // `entity_research`, that only `ar-ingest` and `ar-capture` can
  // say a parse went wrong — so the comment half has to answer a
  // non-zero number of hits under that id, in more than one file. It
  // is what says the needle still matches text in this repository,
  // which the planted samples alone cannot: they match strings this
  // file wrote.
  //
  // Only that entry. The other three have no legitimate occurrence
  // anywhere under these roots — `n8n` and the transport specifiers
  // in NEITHER half, the global fetch once, in one file — so their
  // zeros rest on the planted samples above and on nothing else.
  // Saying which is which is the difference between a control and a
  // claim.
  it('finds a workflow id named in the comment half it skips', () => {
    const found = SPLIT_MODULES.flatMap(
      ({ filePath, split }) => findExternalReach(
        split.comment,
        filePath,
      ),
    );
    const workflowHits = found.filter(
      (match) => match.id === 'workflow-invocation',
    );

    expect(workflowHits.length).toBeGreaterThan(0);
    expect(new Set(workflowHits.map((match) => match.filePath)).size)
      .toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------
// Contents
// ---------------------------------------------------------------------------

/**
 * One hit, in the form the failure list prints it.
 *
 * The id is the useful half — it says which workflow, or that a
 * transport was imported — and printing it is safe: these are names
 * the repository declares on purpose, unlike the de-origination
 * reports next door. The offending line is left out all the same. A
 * failure list reaches CI logs and terminal scrollback, and source
 * quoted there is source nobody can open or fix; the module and the
 * line are what lead to the one place it can be.
 */
function formatMatch(match: ExternalReachMatch): string {
  return `${match.filePath}:${match.lineNumber} — ${match.id}`;
}

describe('read-first — contents', () => {
  // Compared against an empty array rather than against a count, so
  // the failure diff is the list of hits itself: every one of them,
  // each naming its own module and line, instead of a number to go
  // chasing.
  it('invokes no workflow and opens no transport in code', () => {
    const found = SPLIT_MODULES.flatMap(
      ({ filePath, split }) => findExternalReach(split.code, filePath)
        .map(formatMatch),
    );

    expect(found).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The wave-3 ports and the proposal four
// ---------------------------------------------------------------------------

/**
 * Every method `FindingStore` declares, in one list.
 *
 * `satisfies` pins one direction — a name here that is not on the
 * port is a compile error — and {@link EveryMethodListed} below pins
 * the other, so a method added to the port has to be named here
 * before anything reads the list. Without the pair, a writer added
 * beside {@link FindingStore.insertFindingLabel} would simply not
 * appear in the classification below, and the case asserting
 * exactly four writers across the wave would go on passing.
 */
const FINDING_STORE_METHODS = [
  'countFindings',
  'findFindingById',
  'insertFindingLabel',
  'listFindingLabels',
  'listFindingResearch',
  'listFindingSightings',
  'listFindings',
] as const satisfies readonly (keyof FindingStore)[];

/** The same, for `DocumentStore`, which declares no writer at all. */
const DOCUMENT_STORE_METHODS = [
  'countDocuments',
  'listDocuments',
] as const satisfies readonly (keyof DocumentStore)[];

/** The same, for `EntityStore`, which declares two of the four. */
const ENTITY_STORE_METHODS = [
  'approvePoolRow',
  'countEntityPool',
  'countEntityResearch',
  'findEntityById',
  'findPoolRowById',
  'listEntityPool',
  'listEntityResearch',
  'updateEntity',
] as const satisfies readonly (keyof EntityStore)[];

/**
 * The same, for `RunStore`, which declares none either.
 *
 * Here for the reason the two zero-writer ports are: a
 * classification is only a measurement while something answers the
 * other way. Two of these four ports have a writer and two do not,
 * so these two rosters are what say the classifier reads the names
 * rather than the count.
 */
const RUN_STORE_METHODS = [
  'countRunLedger',
  'countRuns',
  'findRunById',
  'listRunLedger',
  'listRuns',
  'summariseSpend',
] as const satisfies readonly (keyof RunStore)[];

/**
 * The four `SourceStore` methods over `source_config_proposals`.
 *
 * A SUBSET of a wave-2 port rather than a port of its own, which is
 * why this roster is shaped differently from the four above. The
 * pending-config pair and the approve-and-apply gate landed with
 * this wave onto the port that already addressed a source, so the
 * read-first law reaches four of that port thirteen methods and not
 * the other nine — `insertSource`, `updateSource` and `deleteSource`
 * are wave-2 writers this file has nothing to say about.
 *
 * The other direction is pinned by {@link ProposalRosterPinned}
 * rather than by `CoversEveryKey`, which cannot express a subset:
 * the union is DERIVED out of `keyof SourceStore` by the one thing
 * these four names share and the other nine lack, and held equal to
 * this list both ways. So a fifth method over that table has to be
 * named here, and a method added to `SourceStore` that is NOT over
 * it changes nothing — which is the reading a whole-port roster
 * copied from `tests/invariants/api-schedule-containment.test.ts`
 * would have got wrong in both directions.
 */
const SOURCE_PROPOSAL_METHODS = [
  'approveAndApplyProposal',
  'countPendingProposals',
  'findProposalById',
  'listPendingProposals',
] as const satisfies readonly (keyof SourceStore)[];

/** Every method the read-first law reaches, as one flat list. */
const WAVE_METHODS: readonly string[] = [
  ...FINDING_STORE_METHODS,
  ...DOCUMENT_STORE_METHODS,
  ...ENTITY_STORE_METHODS,
  ...RUN_STORE_METHODS,
  ...SOURCE_PROPOSAL_METHODS,
];

/**
 * The four writers this wave is entitled to, written out.
 *
 * The verdict append on `finding_labels`, the patch on `entities`,
 * the approval on `research_pool`, and the approve-and-apply on
 * `source_config_proposals` and the `sources` row it updates — the
 * four `docs/architecture/08-http-api.md` names under `Read-first`,
 * held here against what `keyof` says rather than restated.
 */
const WAVE_WRITERS = [
  'approveAndApplyProposal',
  'approvePoolRow',
  'insertFindingLabel',
  'updateEntity',
] as const;

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

/**
 * `true` only while `A` and `B` are the same union.
 *
 * Both directions, and each wrapped in a tuple for the reason
 * {@link CoversEveryKey} gives. One direction alone is what makes a
 * roster look pinned while a name it does not carry is free to
 * arrive.
 *
 * @typeParam A - One side.
 * @typeParam B - The other.
 */
type Equals<A, B> = [A] extends [B]
  ? [B] extends [A] ? true : false
  : false;

/** The four rosters above, held against the ports they describe. */
type EveryMethodListed =
  CoversEveryKey<FindingStore, typeof FINDING_STORE_METHODS>
  & CoversEveryKey<DocumentStore, typeof DOCUMENT_STORE_METHODS>
  & CoversEveryKey<EntityStore, typeof ENTITY_STORE_METHODS>
  & CoversEveryKey<RunStore, typeof RUN_STORE_METHODS>;

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
 * The `SourceStore` methods over the proposal table, derived.
 *
 * Every one of the four names that table in its own name and none
 * of the other nine does, which is what makes the subset expressible
 * as a `keyof` derivation rather than as a list somebody keeps in
 * step. A fifth method over that table widens this union and fails
 * the pin below; a method added elsewhere on the port does not
 * reach it at all.
 */
type ProposalMethodName =
  Extract<keyof SourceStore, `${string}Proposal${string}`>;

/** That derivation, held equal to the written-out four both ways. */
type ProposalRosterPinned =
  Equals<ProposalMethodName, (typeof SOURCE_PROPOSAL_METHODS)[number]>;

/** The half of the proposal-subset guard `check-types` owns. */
const PROPOSAL_ROSTER_PINNED: ProposalRosterPinned = true;

// ---------------------------------------------------------------------------
// Reader and writer, by name and by type
// ---------------------------------------------------------------------------

/**
 * What a reading method is called on these ports.
 *
 * Four verbs and no more: a window, its count, a lookup, and the one
 * aggregate. Every port in this package spells a read with one of
 * them, which is what makes the leading verb a classification rather
 * than a convention nobody checks.
 */
const READ_VERB_PREFIXES: readonly string[] = [
  'count',
  'find',
  'list',
  'summarise',
];

/**
 * What a writing method is called.
 *
 * Three verbs across the four writers — one appends, one rewrites,
 * and two ratify. `delete` is deliberately not here: nothing on this
 * wave removes a row, and a `deleteFinding` arriving later would
 * fall into NEITHER list, which is the case below that reports it.
 */
const WRITE_VERB_PREFIXES: readonly string[] = [
  'approve',
  'insert',
  'update',
];

/** Whether one method name reads, by that reading. */
function isReaderName(name: string): boolean {
  return READ_VERB_PREFIXES.some((prefix) => name.startsWith(prefix));
}

/** Whether one method name writes, by that reading. */
function isWriterName(name: string): boolean {
  return WRITE_VERB_PREFIXES.some((prefix) => name.startsWith(prefix));
}

/**
 * Names no port declares, run through the classifier beside the real
 * rosters.
 *
 * A classifier matching nothing answers the empty list over any
 * roster, and every case below reads an empty list as good news
 * somewhere. These are what separate the two, in THREE kinds rather
 * than the two a boolean classifier needs: a name that must classify
 * as a writer, one that must classify as a reader, and one that must
 * classify as NEITHER — which is the shape the partition exists to
 * report and the one a pair of complementary predicates could never
 * produce.
 *
 * Both members of the third group are the edit this invariant is
 * written against: re-scoring a finding, and re-parsing a document.
 */
const FABRICATED_WRITER_NAMES: readonly string[] = [
  'insertRun',
  'updateFindingScore',
];

/** The reading side of the same control. */
const FABRICATED_READER_NAMES: readonly string[] = [
  'countSpendByDomain',
  'listFindingsDue',
];

/** The side neither predicate may claim. */
const FABRICATED_UNCLASSIFIED_NAMES: readonly string[] = [
  'reparseDocument',
  'rescoreFinding',
];

/** The leading-verb rule, as a type rather than as a predicate. */
type ReadVerbPrefixed =
  | `count${string}`
  | `find${string}`
  | `list${string}`
  | `summarise${string}`;

/** The other half of the same rule. */
type WriteVerbPrefixed =
  | `approve${string}`
  | `insert${string}`
  | `update${string}`;

/** The methods of `Port` a read verb names. */
type ReaderMethods<Port> = Extract<keyof Port, ReadVerbPrefixed>;

/** The methods of `Port` a write verb names. */
type WriterMethods<Port> = Extract<keyof Port, WriteVerbPrefixed>;

/**
 * Every writer the read-first law reaches, derived from `keyof`.
 *
 * The four wave-3 ports whole, plus the write half of the proposal
 * subset — which is why the last member goes through
 * {@link ProposalMethodName} rather than through `SourceStore`
 * itself: that port declares three wave-2 writers this law says
 * nothing about, and a union taken over the whole port would report
 * them.
 */
type WaveWriterName =
  | WriterMethods<FindingStore>
  | WriterMethods<DocumentStore>
  | WriterMethods<EntityStore>
  | WriterMethods<RunStore>
  | Extract<ProposalMethodName, WriteVerbPrefixed>;

/** That derivation, held equal to the written-out four both ways. */
type WaveWritersPinned =
  Equals<WaveWriterName, (typeof WAVE_WRITERS)[number]>;

/** Whether every method of `Port` falls into one bucket or another. */
type PartitionedPort<Port> =
  Equals<ReaderMethods<Port> | WriterMethods<Port>, keyof Port>;

/** Whether no method of `Port` falls into both. */
type DisjointPort<Port> =
  Equals<Extract<ReaderMethods<Port>, WriterMethods<Port>>, never>;

/**
 * The covering, over the four ports and the proposal subset.
 *
 * This is the reading that reports a verb nobody declared. A
 * `rescoreFinding` added to `FindingStore` is neither prefixed, so
 * the union of the two buckets stops equalling `keyof` and this
 * collapses — where {@link WaveWritersPinned} would not move, the
 * writer set being unchanged.
 */
type PortsPartitioned =
  PartitionedPort<FindingStore>
  & PartitionedPort<DocumentStore>
  & PartitionedPort<EntityStore>
  & PartitionedPort<RunStore>
  & Equals<
    Extract<ProposalMethodName, ReadVerbPrefixed>
    | Extract<ProposalMethodName, WriteVerbPrefixed>,
    ProposalMethodName
  >;

/** The disjointness the covering alone does not give. */
type PortsDisjoint =
  DisjointPort<FindingStore>
  & DisjointPort<DocumentStore>
  & DisjointPort<EntityStore>
  & DisjointPort<RunStore>;

/** The two ports with no writer at all, said as an emptiness. */
type ReadOnlyPortsPinned =
  Equals<WriterMethods<DocumentStore>, never>
  & Equals<WriterMethods<RunStore>, never>;

/**
 * A port carrying a fifth writer, under a verb the roster finds.
 *
 * The negative control for the writer pin. Without it `true` is an
 * answer a type collapsing to `boolean` would accept, and nothing in
 * a green run would say so. `RunStore` is the base because it is one
 * of the two ports the law says declares NO writer, so the plant is
 * the exact edit the invariant is written against: an API that
 * answers what each model call cost, growing a way to record one.
 */
interface PlantedFifthWriterPort extends RunStore {
  insertLlmCall(input: LlmCallRecord): Promise<LlmCallRecord>;
}

/** Five writers, so the four-writer pin may not answer its own shape. */
type PlantedPortPinned = Equals<
  WaveWriterName | WriterMethods<PlantedFifthWriterPort>,
  (typeof WAVE_WRITERS)[number]
>;

/**
 * The half of the writer guard `check-types` owns.
 *
 * A writer added to any of the four ports, or to the proposal
 * subset, collapses {@link WaveWritersPinned} to `false`; a method
 * arriving under a verb neither list names collapses
 * {@link PortsPartitioned}; a writer on either read-only port
 * collapses {@link ReadOnlyPortsPinned}; and the planted port is
 * what says the first reading discriminates rather than answering
 * its initializer whatever the ports hold. All five are TS2322 at
 * their own line, before any case runs.
 */
const WAVE_WRITERS_PINNED: WaveWritersPinned = true;
const PORTS_PARTITIONED: PortsPartitioned = true;
const PORTS_DISJOINT: PortsDisjoint = true;
const READ_ONLY_PORTS_PINNED: ReadOnlyPortsPinned = true;
const PLANTED_PORT_PINNED: PlantedPortPinned = false;

// ---------------------------------------------------------------------------
// What a writer is handed
// ---------------------------------------------------------------------------

/**
 * The columns a pipeline owns, in both spellings each takes.
 *
 * `findings.score` and `findings.score_version` are written by
 * `ar-score`; `documents.parse_status` is written by whichever of
 * `ar-ingest` and `ar-capture` ran the parse that failed. All three
 * are ANSWERED by this surface — a reader shown a ranking is owed
 * the number it was ranked by, and a reader shown a mixed page is
 * owed the flag saying which row is which — and none of the three is
 * ACCEPTED anywhere.
 *
 * Both the TypeScript spelling and the SQL one, because a member is
 * as easy to add under a column name as under a camel one and the
 * law is about the column rather than about the casing.
 */
type PipelineOwnedMember =
  | 'parseStatus'
  | 'parse_status'
  | 'score'
  | 'scoreVersion'
  | 'score_version';

/** Whether `T` names none of them. */
type NamesNoPipelineColumn<T> =
  Equals<Extract<keyof T, PipelineOwnedMember>, never>;

/**
 * Every type one of the four writers is HANDED, held to name none.
 *
 * Four types across three groups, and the count is the claim rather
 * than an accident: `DocumentStore` and `RunStore` are handed
 * nothing at all, having no writer, and the two approvals take an id
 * and no payload. So the only shapes a column could arrive through
 * are the ruling appended to `finding_labels`, the pair of name
 * columns and the patch beside them on `entities`, and the two
 * config columns `proposalToSourceUpdate` derives for the `sources`
 * row.
 */
type WriterInputsPinned =
  NamesNoPipelineColumn<InsertFindingLabelInput>
  & NamesNoPipelineColumn<EntityPatch>
  & NamesNoPipelineColumn<EntityNamePatch>
  & NamesNoPipelineColumn<SourceConfigUpdate>;

/**
 * A patch carrying the column a later edit would add first.
 *
 * The fabricated half of the control. A findings list showing a
 * score is one line from offering to recompute one, and the shape
 * that edit takes is a member on a patch type — so the plant is that
 * member rather than a type nothing resembles.
 */
interface PlantedScoringPatch extends EntityPatch {
  readonly score?: number | null;
}

/**
 * The half of the member guard `check-types` owns.
 *
 * The two `false` initializers beside the plant are the reading that
 * matters, and they are REAL types from this same tree rather than
 * fabricated ones. `DocumentFilter` narrows by `parseStatus` and
 * `FindingRecord` answers `score` and `scoreVersion`, both
 * deliberately — answered and never accepted is the whole shape of
 * the law — so their answers say the extraction discriminates among
 * types that EXIST. A fabricated type is absent for the trivial
 * reason and reports on nothing; drop a member from
 * {@link PipelineOwnedMember} and one of these two reddens naming
 * itself.
 */
type DocumentFilterPinned = NamesNoPipelineColumn<DocumentFilter>;
type FindingRecordPinned = NamesNoPipelineColumn<FindingRecord>;
type PlantedPatchPinned = NamesNoPipelineColumn<PlantedScoringPatch>;

const WRITER_INPUTS_PINNED: WriterInputsPinned = true;
const DOCUMENT_FILTER_NAMES_ITS_COLUMN: DocumentFilterPinned = false;
const FINDING_RECORD_NAMES_ITS_COLUMNS: FindingRecordPinned = false;
const PLANTED_PATCH_PINNED: PlantedPatchPinned = false;

describe('read-first ports — four writers and no other', () => {
  // The pin the five rosters rest on, read here so it is a symbol
  // this file uses. Its failure is a TS2322 rather than a red case:
  // by the time a case could run, the lists already describe their
  // ports.
  //
  // The four writers are asserted PRESENT in the rosters that carry
  // them as well, because a roster equality says nothing about which
  // list a name sits in — and the classification below reads the
  // flat concatenation, where a writer moved between two ports would
  // be invisible.
  it('lists every method the five rosters describe', () => {
    expect(EVERY_METHOD_LISTED).toBe(true);
    expect(PROPOSAL_ROSTER_PINNED).toBe(true);
    expect(FINDING_STORE_METHODS).toContain('insertFindingLabel');
    expect(ENTITY_STORE_METHODS).toContain('updateEntity');
    expect(ENTITY_STORE_METHODS).toContain('approvePoolRow');
    expect(SOURCE_PROPOSAL_METHODS).toContain('approveAndApplyProposal');
  });

  // Three groups in one case, because any two of them are satisfied
  // by a classifier that has stopped reading its argument: one
  // matching everything passes the writers and the readers, one
  // matching nothing passes the readers and the unclassified, and
  // only the trio rules out both while also saying the two
  // predicates are not complements of each other.
  it('classifies a fabricated writer, reader and neither', () => {
    expect(FABRICATED_WRITER_NAMES.filter(isWriterName))
      .toEqual([...FABRICATED_WRITER_NAMES]);
    expect(FABRICATED_WRITER_NAMES.filter(isReaderName)).toEqual([]);
    expect(FABRICATED_READER_NAMES.filter(isReaderName))
      .toEqual([...FABRICATED_READER_NAMES]);
    expect(FABRICATED_READER_NAMES.filter(isWriterName)).toEqual([]);
    expect(FABRICATED_UNCLASSIFIED_NAMES.filter(isReaderName)).toEqual([]);
    expect(FABRICATED_UNCLASSIFIED_NAMES.filter(isWriterName)).toEqual([]);
  });

  // The claim itself, on the name reading. Held against the
  // written-out four rather than against a count, so the failure
  // names the method instead of reporting a number that moved.
  it('names exactly the four writers the wave may have', () => {
    expect(WAVE_METHODS.filter(isWriterName).sort())
      .toEqual([...WAVE_WRITERS].sort());
  });

  // The complement, and the two readings it carries. The covering
  // says every declared method fell into one of the two buckets — a
  // method under a verb neither list names appears in neither, and
  // the concatenation then falls short of the roster. The
  // disjointness says none fell into both, which the covering alone
  // cannot report: a name in two buckets appears twice, and only a
  // sorted comparison of the same length would hide it.
  it('leaves every other declared method a reader', () => {
    const readers = WAVE_METHODS.filter(isReaderName);
    const writers = WAVE_METHODS.filter(isWriterName);

    expect([...readers, ...writers].sort())
      .toEqual([...WAVE_METHODS].sort());
    expect(readers.filter(isWriterName)).toEqual([]);
  });

  // The two ports the law says declare nothing to call, on the name
  // reading. `DocumentStore` and `RunStore` are where the read-first
  // claim is a shape rather than a restraint, and a writer arriving
  // on either is the edit both module headers are written against.
  it('names no writer on the two read-only ports', () => {
    expect(DOCUMENT_STORE_METHODS.filter(isWriterName)).toEqual([]);
    expect(RUN_STORE_METHODS.filter(isWriterName)).toEqual([]);
  });

  // The type reading, read here for the same reason the roster pin
  // is: these are `check-types` claims, and a case that reads them is
  // what keeps them symbols the file uses. Five together — the
  // writer set, the covering, the disjointness, the two empty ports,
  // and the planted port that says the first of them discriminates.
  it('pins the writer set and the split at the type level', () => {
    expect(WAVE_WRITERS_PINNED).toBe(true);
    expect(PORTS_PARTITIONED).toBe(true);
    expect(PORTS_DISJOINT).toBe(true);
    expect(READ_ONLY_PORTS_PINNED).toBe(true);
    expect(PLANTED_PORT_PINNED).toBe(false);
  });

  // The member half, and the one place the controls come from the
  // real tree rather than from a plant. The two `false` readings are
  // types this wave declares on purpose: a filter that narrows by
  // `parse_status` and a record that answers both score columns.
  // Answered and never accepted is the law, so the types that ANSWER
  // them are what say the extraction reads a real member set.
  it('names no pipeline column on a type a writer takes', () => {
    expect(WRITER_INPUTS_PINNED).toBe(true);
    expect(DOCUMENT_FILTER_NAMES_ITS_COLUMN).toBe(false);
    expect(FINDING_RECORD_NAMES_ITS_COLUMNS).toBe(false);
    expect(PLANTED_PATCH_PINNED).toBe(false);
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
  // This invariant own shape, and the one no filesystem error
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
  const packageRoot = mkdtempSync(join(tmpdir(), 'ar-read-first-scan-'));
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
