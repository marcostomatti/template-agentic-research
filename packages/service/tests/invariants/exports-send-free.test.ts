/**
 * The renderer-side send-free invariant, run against the real
 * `packages/service/src/exports/` tree.
 *
 * The rule: no module in that directory reaches the notification
 * layer under `src/notifications/`, a node transport builtin, the
 * global fetch, or a filesystem builtin. `exports-send-free.ts` next
 * door holds the walk, the roster of reaches and the split that
 * tells code from comment; this file is where all three meet the
 * directory as it stands on disk.
 *
 * The rule passes by finding nothing, which is also what a check
 * produces once it has stopped working. Four unrelated failures
 * arrive as the same clean zero — a surface that stopped being
 * walked, a roster whose needles match nothing any more, a guard
 * narrowed until it excludes the reach itself, and a region split
 * that has quietly read a whole file as prose. The cases here are
 * ordered so each of those is ruled out before the zero is asserted.
 *
 * The surface comes first, as a set rather than a count. What the
 * walk returns has to be every module the directory holds: a count
 * agrees at the wrong membership, and only the difference of two
 * sets names the file that stopped being read. The root and the
 * suffix are pinned beside it, since every case below is downstream
 * of them.
 *
 * The roster is next, three ways over. A fabricated reach for every
 * entry, one per line in one body, proves each needle still matches
 * the shape it was written for — and the same case reads back the
 * kinds it covered, so a plant for one kind cannot stand in for a
 * kind nothing reached. The near misses each guard was narrowed
 * against prove the needles still refuse them, which is the half a
 * planted sample cannot report. And the region cases pin the split
 * itself: a reach in a line comment and one in a header block are
 * prose, a reach inside a specifier string is code, one line
 * carrying both is both, and a quoted URL does not blind what
 * follows it.
 *
 * Then the comment half of the real tree, which is the liveness this
 * rule has no other source for. The code half is empty in every file
 * and would look the same if the matcher had died; the comment half
 * is the same needles over the same content in the same run, and it
 * is not empty. Three of the nine entries are exercised there, and
 * the set is pinned rather than counted, so the day one of them
 * stops occurring is reported by name instead of passing quietly.
 * The other six rest on the plants alone, which is what the pin is
 * there to keep true.
 *
 * Only then is the code half asserted empty. Its failure lists every
 * hit as `<file>:<line> — <entry>`, the form an editor, a stack
 * trace and `grep -n` all take.
 *
 * The last section leaves the real tree for the walk's refusal. A
 * directory that has been renamed, emptied, replaced by a file, or
 * left holding nothing this walk reads stops contributing modules
 * without saying so, and that last shape is this scan's own: a
 * directory holding one README is one the walk read nothing it was
 * able to fail on.
 *
 * The package root is derived from this file's own location rather
 * than from the working directory, so the same tree is scanned
 * whether the suite is started from the package or the repo root.
 */
import type { SendReachKind, SendReachMatch } from './exports-send-free.js';

import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, describe, expect, it } from 'vitest';

import {
  EmptyExportSurfaceError,
  MODULE_SUFFIX,
  SCAN_ROOT,
  SEND_REACH_KINDS,
  SEND_REACH_RULES,
  collectExportModules,
  findSendReach,
} from './exports-send-free.js';

// ---------------------------------------------------------------------------
// Scan surface
// ---------------------------------------------------------------------------

/** Root of `@ar/service`, two levels above `tests/invariants/`. */
const PACKAGE_ROOT = fileURLToPath(new URL('../..', import.meta.url));

/**
 * Every module the invariant covers, resolved once for the whole
 * file.
 *
 * Deliberately at module scope: a walk that cannot build the surface
 * throws, and that failure belongs to the file rather than to one
 * case. There is nothing left to assert about contents once the list
 * of modules to read is wrong.
 */
const SCANNED_MODULES = collectExportModules(PACKAGE_ROOT);

/**
 * Every file beneath one directory, whatever its extension.
 *
 * A second walk, written out here rather than borrowed from the
 * module under test, and applying no filter at all — which is the
 * whole of its value. The difference between what it returns and
 * what the scan returns is exactly what the scan chose not to read,
 * so a walk that had grown a prune nobody declared (a skipped
 * subdirectory, an early return, a second extension quietly let out)
 * shows up as files present in one list and missing from the other.
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
const FULL_TREE_FILES = walkAll(SCAN_ROOT);

/** The modules named in the register row and in this rule's prose. */
const NAMED_MODULES: readonly string[] = [
  'src/exports/email-draft.ts',
  'src/exports/index.ts',
  'src/exports/notion-md.ts',
  'src/exports/obsidian-md.ts',
  'src/exports/rss.ts',
];

describe('exports send-free — scan surface', () => {
  // Set difference rather than arithmetic over two counts: the counts
  // agree at the wrong membership, and what a failure has to say is
  // which module left the surface.
  //
  // The subtraction is an IDENTITY today and saying so is part of the
  // reading: every file in this directory is a `.ts` module, so the
  // filtered and unfiltered walks answer the same list and the case
  // would hold under a filter that let everything through. The
  // control that filter has is not here — it is the fixture below
  // holding a file this walk does not read, which refuses.
  it('reads every module the export directory holds', () => {
    const expected = FULL_TREE_FILES.filter(
      (file) => file.endsWith(MODULE_SUFFIX),
    );

    expect(expected.length).toBeGreaterThan(0);
    expect([...SCANNED_MODULES].sort()).toEqual([...expected].sort());
  });

  // The two constants everything else here is downstream of. Point
  // the root at another directory, or widen the suffix, and every
  // case below moves with it while staying green over a surface that
  // is no longer the one the rule names.
  it('declares the root and the suffix the rule names', () => {
    expect(SCAN_ROOT).toBe('src/exports');
    expect(MODULE_SUFFIX).toBe('.ts');
  });

  // A populated surface is not the same as the right one, and this
  // is the cheap difference: the contract and all four registered
  // renderers, by name. A walk pointed at any populated directory
  // satisfies the set equality above and fails this.
  it('covers the contract and every renderer beside it', () => {
    const missing = NAMED_MODULES.filter(
      (module) => !SCANNED_MODULES.includes(module),
    );

    expect(missing).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Roster shape
// ---------------------------------------------------------------------------

describe('exports send-free — roster', () => {
  // Swept across the declared kinds rather than derived from the
  // entries, which is the whole reason the kinds are a list of their
  // own: a set read off the roster agrees with whatever the roster
  // happens to hold, including a roster that lost its last transport.
  it('declares an entry for every kind of reach', () => {
    const uncovered = SEND_REACH_KINDS.filter(
      (kind) => !SEND_REACH_RULES.some((rule) => rule.kind === kind),
    );

    expect(uncovered).toEqual([]);
  });

  // Ids are how a plant below pairs with the entry it stands for, so
  // two entries sharing one leave a needle tested twice and another
  // not at all, with every case still green.
  it('gives every entry an id of its own', () => {
    const ids = SEND_REACH_RULES.map((rule) => rule.id);

    expect([...new Set(ids)].sort()).toEqual([...ids].sort());
  });

  // The roster's own discipline, asserted rather than trusted: an
  // entry that cannot say what it adds is one whose reach a
  // neighbour already covers, and a roster of those is a list that
  // grew by resemblance.
  it('says what each entry reaches that the others do not', () => {
    const unexplained = SEND_REACH_RULES.filter(
      (rule) => rule.reason.trim() === '',
    );

    expect(unexplained.map((rule) => rule.id)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Planted reaches
// ---------------------------------------------------------------------------

/** One fabricated reach, paired with the entry that has to find it. */
interface PlantedReach {
  /**
   * `id` of the {@link SEND_REACH_RULES} entry under test. Pairing by
   * id rather than by position means a reordered roster still tests
   * what it says it tests, and an entry left without a plant is
   * caught by the coverage case rather than going quietly untested.
   */
  readonly ruleId: string;
  /**
   * `kind` of that entry, written out a second time so the two
   * spellings can be held against each other. A plant filed under
   * the wrong kind would otherwise satisfy the coverage reading for
   * a kind nothing actually reached.
   */
  readonly kind: SendReachKind;
  /**
   * The fabricated line, in the shape the reach really takes: an
   * import of the builtin, a call of the global, a lookup through
   * the registry. Invented rather than copied — no module in the
   * scanned directory carries any of these — so no case here can be
   * read as a claim about a file that exists.
   *
   * Exactly one rostered reach per line, which is what lets the case
   * below assert the whole result rather than search it. A line
   * matching two entries is two hits and fails the case that planted
   * it, which is how a needle widened past its own subject shows up.
   */
  readonly line: string;
}

const PLANTED_REACHES: readonly PlantedReach[] = [
  {
    ruleId: 'notification-layer',
    kind: 'notification-channel',
    line: 'import * as channels from \'../notifications/index.js\';',
  },
  {
    ruleId: 'channel-dispatch',
    kind: 'notification-channel',
    line: '  await dispatch(event, { preferences, logger });',
  },
  {
    ruleId: 'channel-registry',
    kind: 'notification-channel',
    line: '  const channel = channelRegistry.get(kind);',
  },
  {
    ruleId: 'transport-http',
    kind: 'transport',
    line: 'import { request } from \'node:https\';',
  },
  {
    ruleId: 'transport-socket',
    kind: 'transport',
    line: 'import { createConnection } from \'node:net\';',
  },
  {
    ruleId: 'transport-tls',
    kind: 'transport',
    line: 'import { connect } from \'node:tls\';',
  },
  {
    ruleId: 'transport-datagram',
    kind: 'transport',
    line: 'import { createSocket } from \'node:dgram\';',
  },
  {
    ruleId: 'global-fetch',
    kind: 'fetch',
    line: '  const answered = await fetch(endpoint);',
  },
  {
    ruleId: 'filesystem-builtin',
    kind: 'filesystem',
    line: 'import { writeFile } from \'node:fs/promises\';',
  },
];

/**
 * The clean line before every plant, so each sits on a line of its
 * own with ordinary source around it.
 *
 * Asserted clean nowhere, and it does not have to be: a rostered
 * reach in it would turn every plant's line into two hits and fail
 * the case below, which asserts the whole result.
 */
const MARKER_LINE = 'export const ordinary = 1;';

const PLANTED_LINES = PLANTED_REACHES.flatMap(
  (plant) => [MARKER_LINE, plant.line],
);

/** The plants, one per line, interleaved with clean source. */
const PLANTED_BODY = PLANTED_LINES.join('\n');

/** 1-based line of the plant at `index`, given that layout. */
function plantedLine(index: number): number {
  return index * 2 + 2;
}

/**
 * Path the fabricated bodies are attributed to. Named but never
 * opened: the matcher takes content, so this only has to be the
 * string it carries back into a hit.
 */
const PLANTED_FILE_PATH = 'src/exports/planted.ts';

/** One hit reduced to what a case asserts about it. */
function summarise(hit: SendReachMatch): string {
  return `${hit.ruleId}:${hit.region}@${hit.lineNumber}`;
}

/** Every hit in one fabricated body, in the form cases compare. */
function summariseBody(body: string): readonly string[] {
  return findSendReach(body, PLANTED_FILE_PATH).map(summarise);
}

/**
 * A module that reaches nothing, as the clean control.
 *
 * Ordinary renderer source: a header, a signature over the stored
 * rows, a return of artifacts. Nothing here is near a rostered name,
 * which is what makes a zero over it mean something.
 */
const CLEAN_BODY = [
  '/** A renderer that composes text and answers artifacts. */',
  'export function render(input: ExportRenderInput): Artifacts {',
  '  return { artifacts: [composeArtifact(input)] };',
  '}',
].join('\n');

/**
 * The near misses the roster's guards were narrowed against, one per
 * line.
 *
 * Each line is a shape that matches the entry's bare name and must
 * not match the entry: a compound verb around the global, a
 * hyphenated workflow id and a past participle around dispatch, a
 * URL and a scheme list around the HTTP builtins, a local module and
 * a hostname whose names start like a builtin's, a function whose
 * name starts like the layer's directory.
 *
 * Two are shapes the scanned directory really carries — a quoted
 * scheme list and a quoted URL — and the scheme list sits in code
 * there. Measured: dropping the closing guard from the HTTP entry
 * turns it into a finding in the half the rule is about.
 */
const NEAR_MISSES: readonly string[] = [
  '  const asset = prefetch(source);',
  '  const busy = isFetching(state);',
  '  const done = rows.filter((row) => row.dispatched);',
  '  const workflowId = \'ar-dispatch\';',
  '  const schemes = [\'http:\', \'https:\'];',
  '  const image = \'https://example.test/a.png\';',
  '  const helpers = \'./fs-helpers.js\';',
  '  const host = \'net-probe.example.test\';',
  '  const options = \'tls-config.json\';',
  '  const notes = \'dgram-notes.md\';',
  '  const summary = notificationsSummary(rows);',
];

const NEAR_MISS_BODY = NEAR_MISSES.join('\n');

describe('findSendReach — planted reaches', () => {
  // Without this, an entry added to the roster with no plant beside
  // it is one nothing proves can still match, and the suite stays
  // green while coverage shrinks. Both members are compared at once,
  // so a plant filed under a kind the entry does not carry fails
  // here rather than distorting the coverage reading below.
  it('plants a fabricated reach for every entry', () => {
    const planted = PLANTED_REACHES.map(
      (plant) => `${plant.ruleId}:${plant.kind}`,
    );
    const declared = SEND_REACH_RULES.map(
      (rule) => `${rule.id}:${rule.kind}`,
    );

    expect([...planted].sort()).toEqual([...declared].sort());
  });

  // One body, one pass, every entry and therefore every kind. The
  // whole result is compared rather than searched, which pins three
  // things at once: each plant is found exactly once, it is found on
  // its own line, and it is read as CODE — the half the rule is
  // about. A needle that had widened would add a hit and a split
  // that had drifted would move a region, and either fails here.
  //
  // The kinds are read back off the hits rather than off the table,
  // so what the case ends up asserting is that the matcher covered
  // all four ways out and not that the table said it would.
  it('finds a planted reach of every kind, all in code', () => {
    const found = findSendReach(PLANTED_BODY, PLANTED_FILE_PATH);
    const expected = PLANTED_REACHES.map(
      (plant, index) => `${plant.ruleId}:code@${plantedLine(index)}`,
    );
    const kinds = new Set(found.map((hit) => hit.kind));

    expect(found.map(summarise)).toStrictEqual(expected);
    expect([...kinds].sort()).toEqual([...SEND_REACH_KINDS].sort());
  });

  // The clean control the plants need: the same matcher over a body
  // of ordinary source has to answer nothing, or finding something
  // in the plants says only that the matcher finds something.
  it('finds nothing in a module that reaches nothing', () => {
    expect(summariseBody(CLEAN_BODY)).toEqual([]);
  });

  // The half a plant cannot report. Every guard in the roster was
  // narrowed against something, and these are those things: a
  // compound verb, a hyphenated workflow id, a URL and a scheme list
  // in quotes, a local module whose name starts the same way. Two of
  // them are shapes this directory really carries — measured,
  // dropping the guards turns them into findings in the code half.
  //
  // A zero that proves itself, because the case above fired the same
  // needles at the same kind of content and found all nine. The one
  // entry with no near miss here is the registry singleton, which
  // carries no guard to be narrow about.
  it('finds nothing in the near misses the guards are for', () => {
    expect(summariseBody(NEAR_MISS_BODY)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Code and comment
// ---------------------------------------------------------------------------

/** A reach named in prose at the end of an ordinary code line. */
const LINE_COMMENT_BODY = [
  'export const RENDERER_COUNT = 4;',
  '// Where dispatch lands instead is argued in the header.',
].join('\n');

/** A reach named in the header block that argues the rule. */
const HEADER_BLOCK_BODY = [
  '/**',
  ' * Nothing here reaches the global fetch, and the sentence',
  ' * naming it is not the breach this rule is about.',
  ' */',
  'export const RENDERER_COUNT = 4;',
].join('\n');

/** The shape a builtin arrives in: a quoted specifier, in code. */
const SPECIFIER_BODY = 'import { writeFile } from \'node:fs\';';

/** One line with a reach on each side of the comment it carries. */
const MIXED_LINE_BODY = '  const target = \'node:fs\'; // dispatch elsewhere';

/**
 * A quoted URL, and a reach after it on the same line.
 *
 * The one case that reports a split which stopped tracking strings:
 * the two characters a line comment opens with sit inside the URL,
 * so a scanner reading them as a comment start would call everything
 * after them prose — including the reach, which is the half the rule
 * is about.
 */
const SLASHED_STRING_BODY = [
  '// A quoted URL carries the pair a line comment opens with.',
  '  const feed = \'https://example.test/a\'; await fetch(feed);',
].join('\n');

describe('findSendReach — code and comment', () => {
  // The plainest half of the split, and the one this directory needs
  // most: every module here argues the rule in prose, and a reading
  // that could not tell prose from code would report the argument as
  // the breach.
  it('reads a reach in a line comment as comment', () => {
    expect(summariseBody(LINE_COMMENT_BODY))
      .toEqual(['channel-dispatch:comment@2']);
  });

  // The shape the argument actually takes here: a header block, its
  // continuation lines each opening with a star. The delimiters are
  // inside the region, so a reach written against one is prose too.
  it('reads a reach in a header block as comment', () => {
    expect(summariseBody(HEADER_BLOCK_BODY))
      .toEqual(['global-fetch:comment@2']);
  });

  // A quoted string is code, which is not a technicality: a module
  // specifier IS a quoted string, so a split that excused strings
  // would excuse every import the roster exists to find.
  it('reads a reach in a specifier string as code', () => {
    expect(summariseBody(SPECIFIER_BODY))
      .toEqual(['filesystem-builtin:code@1']);
  });

  // The split is per character and not per line, which only a line
  // carrying both can say. This is also the file's one reading of
  // the order the matcher documents: hits come back in the order the
  // roster declares them, so dispatch precedes the filesystem entry
  // here whatever their positions in the line.
  it('splits one line carrying a reach on each side', () => {
    expect(summariseBody(MIXED_LINE_BODY)).toEqual([
      'channel-dispatch:comment@1',
      'filesystem-builtin:code@1',
    ]);
  });

  // The failure direction that matters, because it is blindness
  // rather than a false finding: a split confused by the slashes
  // inside a URL reads the rest of that line as prose and excuses
  // whatever is written there.
  it('is not blinded by two slashes inside a string', () => {
    expect(summariseBody(SLASHED_STRING_BODY))
      .toEqual(['global-fetch:code@2']);
  });
});

// ---------------------------------------------------------------------------
// The prose of the scanned tree
// ---------------------------------------------------------------------------

/**
 * Every hit in every scanned module, both halves together.
 *
 * Read inside a case rather than at module scope, so a path that has
 * gone missing between the walk and the read belongs to the case
 * that needed it, which fails naming it.
 */
function treeHits(): readonly SendReachMatch[] {
  return SCANNED_MODULES.flatMap((relativePath) => {
    const content = readFileSync(join(PACKAGE_ROOT, relativePath), 'utf8');

    return findSendReach(content, relativePath);
  });
}

/**
 * The entries this directory's own prose exercises today.
 *
 * Pinned as a set rather than counted, because this is the whole of
 * the liveness the rule has: the code half passes by being empty,
 * and empty is what a dead needle and a clean directory both answer.
 * These three meet real content on every run — the layer's own
 * directory named in the paragraph saying it is unreachable, the
 * global fetch named in the same sentence, and dispatch named four
 * times where two headers say where dispatch lands instead.
 *
 * The other six rest on the planted samples alone, and keeping that
 * true is what the pin is for. A sentence that stops being written
 * fails this case by name; the repair is to restore the sentence or
 * to move the entry out of this list and say, here, that its zero
 * now has no reading behind it but the plant.
 */
const PROSE_CONTROLLED_IDS: readonly string[] = [
  'channel-dispatch',
  'global-fetch',
  'notification-layer',
];

describe('exports send-free — prose in the scanned tree', () => {
  it('meets three entries in the prose of this directory', () => {
    const prose = treeHits().filter((hit) => hit.region === 'comment');
    const ids = new Set(prose.map((hit) => hit.ruleId));

    expect([...ids].sort()).toEqual([...PROSE_CONTROLLED_IDS].sort());
  });
});

// ---------------------------------------------------------------------------
// Contents
// ---------------------------------------------------------------------------

/**
 * One hit, in the form the failure list prints it.
 *
 * The entry id is the useful half — it says which way out was
 * reached — and printing it is safe: every one of them names
 * something this repository imports somewhere on purpose. The
 * offending line is left out all the same. A failure list reaches CI
 * logs and terminal scrollback, and source quoted there is source
 * nobody can open or fix; the file and line lead to the one place it
 * can be.
 */
function formatHit(hit: SendReachMatch): string {
  return `${hit.filePath}:${hit.lineNumber} — ${hit.ruleId}`;
}

describe('exports send-free — contents', () => {
  // The rule itself. Compared against an empty array rather than a
  // count, so the failure diff is the list of hits: every one of
  // them naming its own file and line, instead of a number to go
  // chasing.
  //
  // Every case above stands between this zero and the three ways it
  // could be vacuous — a surface nothing walked, a roster matching
  // nothing, and a split reading the whole file as prose.
  it('reaches no channel, transport, fetch or file', () => {
    const found = treeHits()
      .filter((hit) => hit.region === 'code')
      .map(formatHit);

    expect(found).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Scan-root fixtures
// ---------------------------------------------------------------------------

// The walk is asserted against real directories rather than a mocked
// `node:fs`. What it has to get right is filesystem behaviour — a
// path that is a file where a directory was declared, a directory
// holding nothing this walk reads — and a mock of that proves only
// that the mock and the assertion were written to agree.

/**
 * Fixture package roots created below, removed once this file
 * finishes.
 *
 * A registry rather than one shared tree: each case builds its own
 * root, so no case can leave another looking at a directory it has
 * already broken.
 */
const FIXTURE_ROOTS: string[] = [];

afterAll(() => {
  for (const fixtureRoot of FIXTURE_ROOTS) {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

/** The module every healthy fixture root is given. */
const FIXTURE_MODULE = 'renderer.ts';

/** A subdirectory and its module, so the recursion is read too. */
const FIXTURE_NESTED_DIR = 'family';
const FIXTURE_NESTED_MODULE = 'nested.ts';

/**
 * A file the walk does not read, in every healthy fixture root.
 *
 * The control the extension filter has no other source for. In the
 * real directory every file is a module, so the filtered and
 * unfiltered walks answer the same list and the surface case above
 * would hold under a filter that let everything through. Here the
 * filter has something to exclude, and the positive control below
 * names exactly two modules beside it.
 */
const FIXTURE_NON_MODULE = 'README.md';

/** Never opened: the walk lists modules, so only presence matters. */
const FIXTURE_CONTENT = 'Fixture content, which the walk never reads.\n';

/** One way the declared root stops contributing modules. */
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
  // Nothing is put back: the renamed or mistyped directory. It is
  // also the case the walk has to intercept before `readdirSync`
  // reaches it, so a declared surface disagreeing with the tree is
  // reported as that rather than as an ENOENT out of the recursion.
  {
    label: 'is missing altogether',
    apply: () => {},
  },
  // Present, readable, and holding nothing. No error surfaces from
  // the filesystem at all here, which makes this the case that would
  // pass in silence were the walk to take its own root on trust.
  {
    label: 'exists but is empty',
    apply: (rootPath) => mkdirSync(rootPath),
  },
  // A file where a directory was declared — the shape the root takes
  // when something is renamed onto it, or when the directory
  // collapses to a single module and the declaration does not follow.
  {
    label: 'is a file rather than a directory',
    apply: (rootPath) => writeFileSync(rootPath, FIXTURE_CONTENT),
  },
  // This scan's own shape, and the one no filesystem error reports:
  // a directory that is present, readable and populated, holding
  // nothing the walk reads. The filter runs before the count, so it
  // refuses exactly as an empty directory does — the walk would have
  // read no file it was able to fail on.
  {
    label: 'holds no module the walk reads',
    apply: (rootPath) => {
      mkdirSync(rootPath);
      writeFileSync(join(rootPath, FIXTURE_NON_MODULE), FIXTURE_CONTENT);
    },
  },
];

/** A miniature package root with two modules and one other file. */
function makeFixture(): string {
  const packageRoot = mkdtempSync(join(tmpdir(), 'ar-send-free-'));
  FIXTURE_ROOTS.push(packageRoot);

  const rootPath = join(packageRoot, SCAN_ROOT);
  mkdirSync(join(rootPath, FIXTURE_NESTED_DIR), { recursive: true });
  writeFileSync(join(rootPath, FIXTURE_MODULE), FIXTURE_CONTENT);
  writeFileSync(join(rootPath, FIXTURE_NON_MODULE), FIXTURE_CONTENT);
  writeFileSync(
    join(rootPath, FIXTURE_NESTED_DIR, FIXTURE_NESTED_MODULE),
    FIXTURE_CONTENT,
  );

  return packageRoot;
}

/** The same fixture with the root emptied and then sabotaged. */
function makeSabotagedFixture(sabotage: RootSabotage): string {
  const packageRoot = makeFixture();
  const rootPath = join(packageRoot, SCAN_ROOT);

  rmSync(rootPath, { recursive: true });
  sabotage.apply(rootPath);

  return packageRoot;
}

/** Returned when the walk ran to the end instead of refusing. */
const NOT_REFUSED = '(no root refused)';

/**
 * The root {@link collectExportModules} refused, or
 * {@link NOT_REFUSED} when it walked the fixture through.
 *
 * Only {@link EmptyExportSurfaceError} counts as a refusal; anything
 * else is rethrown. A missing directory arriving as a bare
 * filesystem error is a different event from the walk naming a root
 * it will not accept, and folding the two together would let a walk
 * that had stopped working pass an assertion about coverage.
 */
function refusedRoot(packageRoot: string): string {
  try {
    collectExportModules(packageRoot);
  } catch (thrown) {
    if (thrown instanceof EmptyExportSurfaceError) {
      return thrown.root;
    }

    throw thrown;
  }

  return NOT_REFUSED;
}

describe('collectExportModules — the declared root', () => {
  // The control the refusals rest on, and the extension filter's own
  // positive reading. Every case below starts from this fixture and
  // breaks the root, so a refusal says something only while the
  // untouched tree is one the walk accepts and reports in full.
  //
  // Two modules and not three: the fixture also holds a file the
  // walk does not read. The order pins the sort the walk documents —
  // by name at each level, so the subdirectory precedes the module
  // beside it — which is what makes a failure list identical on
  // every machine.
  it('returns every module when the root is populated', () => {
    const nested = `${FIXTURE_NESTED_DIR}/${FIXTURE_NESTED_MODULE}`;

    expect(collectExportModules(makeFixture())).toEqual([
      `${SCAN_ROOT}/${nested}`,
      `${SCAN_ROOT}/${FIXTURE_MODULE}`,
    ]);
  });

  for (const sabotage of ROOT_SABOTAGES) {
    // Each refusal names the root rather than reporting a boolean,
    // so a case cannot be satisfied by a walk that threw for another
    // reason entirely.
    it(`refuses a root that ${sabotage.label}`, () => {
      const packageRoot = makeSabotagedFixture(sabotage);

      expect(refusedRoot(packageRoot)).toBe(SCAN_ROOT);
    });
  }
});
