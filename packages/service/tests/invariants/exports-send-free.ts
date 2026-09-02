/**
 * @packageDocumentation
 * Scan surface, identifier roster and region split for the
 * renderer-side send-free invariant — which files the walk reads,
 * which names it refuses to find in their code, and how a header
 * arguing the rule is told apart from a module breaking it.
 *
 * The rule this file supplies the parts for: no module under
 * `src/exports/` reaches the notification layer under
 * `src/notifications/`, a node transport builtin, the global fetch,
 * or a filesystem builtin. A renderer is handed four stored rows and
 * answers artifacts; delivering one — writing it to a resolved path,
 * pushing it at a surface, sending it — belongs to whatever ran the
 * export subscription. `src/exports/index.ts` argues that at
 * `ExportRenderer` and `docs/architecture/01-invariants.md` carries
 * the register row; this is the reading behind it.
 *
 * THE CONTRACT CANNOT HOLD THIS ON ITS OWN, which is why the rule is
 * a property of the tree. `ExportRenderer` has one member and
 * answers values, so there is nowhere in the shape for a dispatch
 * call to live — for a renderer somebody has read. A module is free
 * to import a transport, reach it inside the one member it declares,
 * and satisfy the interface exactly: the type constrains what comes
 * back and never what was touched on the way. So the check is over
 * every module in the directory, including the ones nobody thought
 * to look at and the ones that arrive later.
 *
 * Identifiers are what the roster holds, and never behaviour. A
 * textual scan cannot follow a socket into a variable named
 * something else, and does not need to: a reach spreads by its name
 * being written down. A builtin is named in a module specifier or it
 * is not imported at all, the notification layer is named by its own
 * directory or by the two symbols that reach a channel, and the
 * global fetch is named by the one word that calls it.
 *
 * CODE AND COMMENT ARE SEPARATED BECAUSE THIS DIRECTORY ARGUES ITS
 * OWN RULE. `email-draft.ts` names the notification layer, the node
 * transports and the global fetch in the paragraph stating that none
 * of them is reachable from here, and `index.ts` names dispatch
 * twice while saying where dispatch lands instead. A scan that could
 * not tell prose from code would be red on arrival for exactly those
 * sentences, and the cheapest way to green it would be deleting
 * them: a check that punishes its own documentation is a check that
 * erases it.
 *
 * The split is also where the roster's liveness comes from, and that
 * is the half worth reading twice. The code result passes by being
 * empty in every file, and empty is what a dead needle, a surface
 * that has stopped being walked and a clean tree all produce. The
 * comment result is the same needles over the same content in the
 * same run, and it is not empty — six hits, over the sentences
 * above. `exports-send-free.test.ts` reads both halves and pins the
 * set of entries the second one reaches, so a needle that has
 * stopped matching anything is reported rather than passing.
 *
 * That control covers three of the nine entries, and saying which is
 * the point of having it. `notification-layer`, `channel-dispatch`
 * and `global-fetch` are exercised against real content on every
 * run; the four transport entries and the filesystem one are named
 * in this tree's prose only as categories, so their zero rests on
 * the planted samples in the suite alone. An entry whose reach turns
 * up in a sentence here joins the pinned set rather than replacing
 * the plant.
 *
 * TWO REACHES ARE DELIBERATELY OUT, and naming them keeps the gap a
 * decision rather than an oversight. `node:child_process` reaches a
 * transport by running another program instead of opening a socket,
 * and a runtime global such as the bun filesystem API reaches a file
 * without naming a builtin at all. Neither is a transport builtin
 * nor a filesystem builtin, which is what this roster is over, and
 * an entry for either is a widening that owes its own reason — not
 * something a reader should take as already covered.
 *
 * Kept apart from the assertions the way `auth-containment.ts` next
 * door is, and for one reason more than its. A roster declared here
 * is one a case can ask questions of rather than assume, and a
 * roster of reaches has to sit OUTSIDE the surface it scans: every
 * entry below is written out whole, and a file spelling
 * `node:fs` inside `src/exports/` is exactly what the rule refuses.
 * `tests/` is not a directory this walk opens, so the roster is safe
 * where it is and would not be one line further in.
 */

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The one tree the scan walks, package-relative.
 *
 * The export directory and the whole of it. A renderer, the contract
 * they satisfy, the registry that selects one, and the two helpers
 * they share all live here, and the rule is about the directory
 * rather than about any one of them.
 *
 * There is no second root and no exemption list beside it, which is
 * the difference from the containment scan next door. That one
 * permits two paths because a password hash has to be named
 * somewhere; nothing here has to reach a transport, so the permitted
 * set is empty and the claim is total. A module that genuinely needs
 * one is a decision somebody makes in the open, by adding an
 * exemption with a reason, rather than by widening a filter.
 */
export const SCAN_ROOT = 'src/exports';

/**
 * The extension the walk reads, and the whole of what it reads.
 *
 * Every module in this directory is TypeScript, colocated tests
 * included, and a `.ts` file is the only thing here that can reach
 * anything at all. The suffix is a constant rather than a literal in
 * the walk so a case can pin what the surface covers.
 *
 * Colocated `*.test.ts` files are IN the surface and not a second
 * category. A test is a module in this directory, it imports what it
 * likes, and one driving a renderer against a real socket is the
 * finding this rule exists to make. An extension filter letting them
 * out would shrink the surface by half without saying so — the same
 * silent narrowing {@link EmptyExportSurfaceError} exists to refuse
 * one directory at a time.
 */
export const MODULE_SUFFIX = '.ts';

/**
 * Thrown when the walk reads no module, for any of the ways that
 * happens.
 *
 * The failure this catches is the one a scan of this shape cannot
 * report any other way. Its passing answer is an empty list of hits,
 * and a root that has been renamed, emptied, or pointed at the wrong
 * tree produces an empty list of hits too — from a surface it never
 * read. Nothing in the result tells them apart, so the walk declines
 * to return one.
 *
 * Four shapes reach it and they are one fact: the directory is
 * missing, it is a file rather than a directory, it is empty, or it
 * holds files of which none is a module. The last is this scan's
 * own, and the only one no filesystem error reports — a directory
 * left holding a README is a directory the walk read nothing it was
 * able to fail on.
 *
 * A distinct class rather than a bare `Error`, so a case can pin the
 * refusal to this cause. A missing directory and a permission
 * refusal both reach a caller as `Error` too, and an assertion
 * accepting either would pass for the wrong reason.
 */
export class EmptyExportSurfaceError extends Error {
  /**
   * The root that resolved to no module, as {@link SCAN_ROOT}
   * declares it. Carried rather than derived at the call site, so a
   * failure names the surface without a reader going to look it up.
   */
  readonly root: string;

  /**
   * @param packageRoot - Directory {@link SCAN_ROOT} was resolved
   * against, carried into the message because the same root is
   * populated or empty depending on which tree the walk was handed.
   */
  constructor(packageRoot: string) {
    super(
      `Scan root '${SCAN_ROOT}' under ${packageRoot} holds no ` +
      `'${MODULE_SUFFIX}' module. A send-free scan that read nothing ` +
      'answers exactly what a clean directory answers, so the walk ' +
      'refuses rather than report a zero it did not earn: either the ' +
      'directory moved and SCAN_ROOT needs updating, or the walk was ' +
      'pointed at the wrong tree.',
    );
    this.name = this.constructor.name;
    this.root = SCAN_ROOT;
  }
}

/**
 * Modules beneath one directory, relative to the package root.
 *
 * Recursive, though the directory is flat today. A renderer family
 * given a subdirectory of its own is a change to the layout and not
 * to the rule, and a walk that only read the top level would leave
 * that subdirectory outside the surface with nothing reporting it.
 *
 * A symlink is skipped rather than followed: following one either
 * re-walks a tree already covered or leaves the package altogether,
 * and neither is a file an import can be fixed in.
 *
 * Entries are sorted by name at each level, because `readdirSync`
 * answers directory order — stable on one machine and arbitrary
 * across them. Sorting makes the module list, and any failure report
 * built from it, identical everywhere.
 *
 * Paths are built with a literal `/` rather than `join`, so what
 * comes back is package-relative and slash-separated whatever the
 * platform: the form a failure message prints and a caller joins
 * back onto the package root to read.
 */
function walkModules(
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
        return walkModules(packageRoot, relativePath);
      }

      return entry.isFile() && entry.name.endsWith(MODULE_SUFFIX)
        ? [relativePath]
        : [];
    });
}

/**
 * Every module the send-free rule covers, relative to `packageRoot`.
 *
 * Throws {@link EmptyExportSurfaceError} rather than returning an
 * empty list. A root that is absent, or that is not a directory at
 * all, takes that same path rather than surfacing as a filesystem
 * error from inside the walk — both mean the declared surface and
 * the tree disagree, which is one fact worth reporting once.
 *
 * The extension filter is applied before the count, so a directory
 * holding files of which none is a module refuses exactly as an
 * empty one does. That is the intended reading rather than an edge
 * case: the walk would have read no file it is able to fail on, and
 * its clean answer would be about nothing.
 */
export function collectExportModules(
  packageRoot: string,
): readonly string[] {
  const stats = statSync(join(packageRoot, SCAN_ROOT), {
    throwIfNoEntry: false,
  });
  const modules = stats !== undefined && stats.isDirectory()
    ? walkModules(packageRoot, SCAN_ROOT)
    : [];

  if (modules.length === 0) {
    throw new EmptyExportSurfaceError(packageRoot);
  }

  return modules;
}

/** Which half of a module's text one hit sits in. */
export type SourceRegion = 'code' | 'comment';

/** What the scanner is inside of, one character at a time. */
type ScanState = 'code' | 'line-comment' | 'block-comment' | 'quoted';

/**
 * The one quote that survives a line ending, so the scanner knows
 * which unterminated string to abandon at a newline and which to
 * carry on through.
 */
const TEMPLATE_QUOTE = '`';

/**
 * Whether each character of `content` belongs to a comment, one
 * array per line.
 *
 * Per line rather than per file, so a caller matching line by line
 * asks about an offset inside a line and never computes one across
 * the file. The answer has exactly as many arrays as
 * `content.split('\n')` has entries, each as long as its own line.
 *
 * A comment region includes its delimiters: the two slashes, and
 * both characters of a block comment at each end. What that buys is
 * a hit written into a delimiter — an entry whose name began at the
 * slash — landing on the side it was written on.
 *
 * Strings are tracked for one reason, and it is not that a string is
 * interesting: a quoted value carrying two slashes is what a naive
 * split reads as the start of a comment, and this directory has six
 * lines of them — five fixture URLs in `markdown-body.test.ts` and a
 * doubled separator in `artifact-path.test.ts`, each of which would
 * blind the rest of its own line. So the scanner opens a string on a
 * quote and closes it on the matching one, and everything between is
 * code — which is also the right answer, a module specifier being a
 * quoted string and nothing else.
 *
 * Two simplifications, both stated rather than discovered later.
 * A regular-expression literal is not tracked, so a pattern carrying
 * two unescaped slashes inside it would be read as opening a
 * comment and blind the rest of that line; the four literals in this
 * directory carry none, and the failure direction is worth knowing
 * because it is blindness rather than a false finding. And a
 * template literal is closed by the next backtick, so a nested
 * template inside a substitution would close the outer one early —
 * again code being read as code, since both sides of that mistake
 * are the code half.
 *
 * A single- or double-quoted string is abandoned at a line ending,
 * because one cannot span a line without a continuation and an
 * unterminated quote would otherwise swallow the file. A template
 * is not, because spanning lines is what it is for.
 */
function commentFlagLines(
  content: string,
): readonly (readonly boolean[])[] {
  const lines: boolean[][] = [];
  let current: boolean[] = [];
  let state: ScanState = 'code';
  let closer = '';
  let index = 0;

  while (index < content.length) {
    const char = content.charAt(index);
    const next = content.charAt(index + 1);

    if (char === '\n') {
      lines.push(current);
      current = [];
      index += 1;

      if (state === 'line-comment') {
        state = 'code';
      }

      if (state === 'quoted' && closer !== TEMPLATE_QUOTE) {
        state = 'code';
      }

      continue;
    }

    if (state === 'line-comment' || state === 'block-comment') {
      current.push(true);
      index += 1;

      if (state === 'block-comment' && char === '*' && next === '/') {
        current.push(true);
        index += 1;
        state = 'code';
      }

      continue;
    }

    if (state === 'quoted') {
      current.push(false);
      index += 1;

      if (char === '\\' && next !== '' && next !== '\n') {
        current.push(false);
        index += 1;
        continue;
      }

      if (char === closer) {
        state = 'code';
      }

      continue;
    }

    if (char === '/' && next === '/') {
      current.push(true, true);
      index += 2;
      state = 'line-comment';
      continue;
    }

    if (char === '/' && next === '*') {
      current.push(true, true);
      index += 2;
      state = 'block-comment';
      continue;
    }

    current.push(false);
    index += 1;

    if (char === '\'' || char === '"' || char === TEMPLATE_QUOTE) {
      state = 'quoted';
      closer = char;
    }
  }

  lines.push(current);

  return lines;
}

/**
 * The region one hit sits in, from the flags of its own line.
 *
 * A missing line, or an offset past the end of one, answers `code`.
 * Neither is reachable while the flags are built from the same
 * content the lines are split from, and the fallback is deliberately
 * the one that fails loudly: an unclassifiable hit is reported as a
 * finding rather than excused as prose.
 */
function regionAt(
  flags: readonly boolean[] | undefined,
  offset: number,
): SourceRegion {
  return flags?.[offset] === true
    ? 'comment'
    : 'code';
}

/** Which of the four ways out of this process a reach takes. */
export type SendReachKind =
  | 'notification-channel'
  | 'transport'
  | 'fetch'
  | 'filesystem';

/**
 * The four kinds, so a case can hold the roster against them.
 *
 * Declared rather than derived from the entries, which is what lets
 * a kind with no entry behind it be reported: a list read off the
 * roster agrees with whatever the roster happens to hold, including
 * a roster that lost its last transport.
 */
export const SEND_REACH_KINDS: readonly SendReachKind[] = [
  'notification-channel',
  'transport',
  'fetch',
  'filesystem',
];

/**
 * The head of a module specifier: the quote a builtin is written
 * behind, and the optional prefix.
 *
 * A builtin is reachable only by being named in a specifier — a
 * static import, a dynamic one, or a require — and all three put the
 * name between quotes. Requiring the quote is what keeps the entry
 * off every ordinary use of a short word.
 */
const SPECIFIER_HEAD = '[\'"](?:node:)?';

/**
 * The tail of a module specifier: the closing quote, or the slash a
 * subpath hangs off.
 *
 * Load-bearing, and measured against this directory rather than
 * argued. Without it, the HTTP entry matches two lines of
 * `rss.test.ts`, whose scheme fixture is a list of quoted literals
 * beginning with the protocol names — a false finding in the code
 * half, out of real content, on a case whose subject is that no
 * scheme reaches a rendered document. The slash is what keeps the
 * promises subpath of the filesystem builtin inside the entry.
 */
const SPECIFIER_TAIL = '[\'"/]';

/** One reach the roster refuses to find in a module's code. */
export interface SendReachRule {
  /**
   * Stable identifier, reported in a failure and used by the suite
   * to pair each entry with its planted sample. Names the reach
   * rather than spelling it, so it stays readable in CI output.
   */
  readonly id: string;
  /**
   * Which of the four ways out this entry is one of. Kinds group the
   * roster for the reading that asks whether every one of them is
   * still covered; nothing about matching turns on it.
   */
  readonly kind: SendReachKind;
  /**
   * What this entry reaches that the entries beside it do not.
   *
   * Written as a difference rather than as a description, which is
   * what stands between a roster and a list that grew by
   * resemblance: an entry that cannot say what it adds is one whose
   * reach another entry already covers.
   */
  readonly reason: string;
  /**
   * Regex source, not a `RegExp`. The matcher compiles a fresh
   * instance per call: matching is global, and a shared global
   * instance carries `lastIndex` from one file into the next, which
   * surfaces as a scan that passes and fails alternately over
   * unchanged input.
   */
  readonly source: string;
}

/**
 * The names no module under {@link SCAN_ROOT} may carry in its code.
 *
 * Nine entries over four kinds, and several per kind because
 * reaching out of a process is something unrelated names do by
 * unrelated routes. The notification layer is three: the directory
 * itself, the call that runs every enabled channel, and the registry
 * a module can hold one channel through. The transports are four
 * module specifiers. The global fetch is one word. The filesystem is
 * one specifier in three spellings.
 *
 * Deliberately out, and each for a stated reason. The three channel
 * registration functions and the delivery hook they install arrive
 * through one of the first three entries, so an entry for them adds
 * a name and no reach. A second HTTP-shaped builtin, or a further
 * socket module, would be the same: the roster names routes, and
 * one that admits every module resembling a route is one somebody
 * eventually deletes. The two reaches outside the roster's subject
 * altogether — running another program, and a runtime global that
 * writes a file without naming a builtin — are named in this file's
 * header, where the gap belongs.
 *
 * Every entry is written out whole rather than assembled from
 * fragments. These are not strings this repository is forbidden to
 * contain — three of them name node builtins that `lib/` imports on
 * purpose — and `tests/` is not a directory this walk opens, so the
 * roster sits outside its own surface however it is spelled.
 * Assembling it would hide the one thing a reader of this file needs
 * to see.
 */
export const SEND_REACH_RULES: readonly SendReachRule[] = [
  {
    id: 'notification-layer',
    kind: 'notification-channel',
    reason:
      'The directory every route into the notification layer passes ' +
      'through, whichever member is imported. What it reaches that ' +
      'the two entries beside it do not is the layer whole: one of ' +
      'its channels already delivers over the network, so a module ' +
      'naming this directory is one import from a send it did not ' +
      'have to write.',
    source: 'notifications/',
  },
  // Both guards are load-bearing and both were measured over this
  // directory rather than reasoned about. Without the trailing one,
  // `dispatched` matches — a word four sentences here use and one
  // `describe` title spells in code. Without the hyphen in the
  // leading one, `ar-dispatch` matches, which is the workflow id the
  // header of `email-draft.ts` names. Unguarded, the needle answers
  // eleven where this entry answers four, and one of the seven it
  // adds is code — the `describe` title.
  {
    id: 'channel-dispatch',
    kind: 'notification-channel',
    reason:
      'The one call that turns a payload into whatever the enabled ' +
      'channels do with it, naming no channel at all. What it ' +
      'reaches that the entries beside it do not is a send with no ' +
      'decision about where in it: a stored preference map picks the ' +
      'channels, so a caller need not know one exists.',
    source: '(?<![A-Za-z0-9_$-])dispatch(?![A-Za-z0-9_$])',
  },
  {
    id: 'channel-registry',
    kind: 'notification-channel',
    reason:
      'The singleton every channel registers itself into. What it ' +
      'reaches that dispatch does not is one channel directly: a ' +
      'module holding it looks a definition up and calls the ' +
      'delivery hook on it, with no preference consulted and nothing ' +
      'logged about the attempt.',
    source: 'channelRegistry',
  },
  {
    id: 'transport-http',
    kind: 'transport',
    reason:
      'The HTTP builtins, three spellings of one reach: a request ' +
      'out of this process to a host that answers. One entry rather ' +
      'than three because plain, TLS-wrapped and multiplexed HTTP ' +
      'differ in what carries a request and not in what making one ' +
      'does.',
    source: `${SPECIFIER_HEAD}http[s2]?${SPECIFIER_TAIL}`,
  },
  {
    id: 'transport-socket',
    kind: 'transport',
    reason:
      'A TCP socket with no protocol above it. What it reaches that ' +
      'the HTTP builtins do not is a host and a port with nothing ' +
      'in the way that could be mistaken for reading something: ' +
      'bytes go out, and whatever is listening decides what they ' +
      'meant.',
    source: `${SPECIFIER_HEAD}net${SPECIFIER_TAIL}`,
  },
  {
    id: 'transport-tls',
    kind: 'transport',
    reason:
      'The same socket wrapped in a certificate exchange. What it ' +
      'reaches that the plaintext one does not is a host that ' +
      'refuses anything else, which is most of them — a roster ' +
      'naming only the raw socket is one a working reach steps ' +
      'around without trying.',
    source: `${SPECIFIER_HEAD}tls${SPECIFIER_TAIL}`,
  },
  {
    id: 'transport-datagram',
    kind: 'transport',
    reason:
      'Datagrams, and the one route with no handshake and no reply. ' +
      'What it reaches that the stream sockets do not is a send that ' +
      'cannot fail in this process: nothing connects, nothing is ' +
      'acknowledged, and a renderer doing it answers its artifacts ' +
      'looking exactly as pure as one that did not.',
    source: `${SPECIFIER_HEAD}dgram${SPECIFIER_TAIL}`,
  },
  // The trailing guard keeps `fetching` out, which `rss.ts` uses in
  // the sentence saying nothing here fetches anything: unguarded,
  // the needle answers two where this entry answers one. A preceding
  // dot is deliberately left in, so a reach spelled through the
  // global object is a hit rather than a hole.
  {
    id: 'global-fetch',
    kind: 'fetch',
    reason:
      'The global, and the only entry here that needs no import at ' +
      'all. What it reaches that the transport builtins do not is a ' +
      'request no import list can report — which is the whole of why ' +
      'the header of `email-draft.ts` says the absence of a ' +
      'transport import is not left to a reviewer.',
    source: '(?<![A-Za-z0-9_$])fetch(?![A-Za-z0-9_$])',
  },
  {
    id: 'filesystem-builtin',
    kind: 'filesystem',
    reason:
      'The filesystem builtin, in the spellings one import takes: ' +
      'the bare name, the prefixed one, and the promises subpath. ' +
      'What it reaches is the destination half of an export — an ' +
      'artifact is a value here, and a module able to write one has ' +
      'taken the delivery step its caller owns.',
    source: `${SPECIFIER_HEAD}fs${SPECIFIER_TAIL}`,
  },
];

/** One occurrence of a rostered reach, as the scan reports it. */
export interface SendReachMatch {
  /**
   * `id` of the {@link SEND_REACH_RULES} entry that matched. Safe in
   * a failure message: every entry names a thing this repository
   * imports somewhere on purpose, and printing one seeds nothing.
   */
  readonly ruleId: string;
  /** `kind` of that entry, carried so a caller groups without it. */
  readonly kind: SendReachKind;
  /**
   * Which half of the file the hit sits in — the whole point of the
   * split. A module arguing the rule names these things in prose,
   * and a reading that could not tell prose from code would report
   * the argument as the breach.
   */
  readonly region: SourceRegion;
  /**
   * Where the content came from, exactly as the caller named it. The
   * matcher never opens a file, so this is carried rather than
   * derived — its only job is to let a caller scanning many files
   * say which one a hit belongs to.
   */
  readonly filePath: string;
  /**
   * 1-based, so the pair `<file>:<line>` means the same thing here
   * as in an editor, a stack trace, or `grep -n` output.
   */
  readonly lineNumber: number;
  /**
   * The offending line, verbatim and untrimmed, for a caller that
   * wants to show a hit locally. A failure report is built from the
   * fields above instead: the fix is always in the named file, and a
   * line quoted into CI output is source nobody reads there.
   */
  readonly line: string;
}

/**
 * Every rostered reach in one file's content, one record per hit.
 *
 * Takes content rather than a path, which is the seam that makes the
 * roster testable: a planted sample is assembled in memory and
 * passed straight in, with no fixture file that would itself land
 * inside the scan root and break the invariant it was written for.
 *
 * Every hit comes back, in code and in comment alike, each carrying
 * the region it was found in. Nothing is filtered here on the way
 * out: the code half is what the rule is about, and the comment half
 * is the liveness reading the rule has no other source for, so a
 * caller wanting one asks for it rather than being handed it.
 *
 * One record per hit, not per line or per file. A line naming two
 * reaches is two findings, and a report that collapsed them would
 * quietly let the second survive the fix for the first.
 *
 * Matching is case-insensitive. A specifier is written in one case
 * and the two identifier entries are not: the registry singleton is
 * also a class name, and a fold is what keeps the roster from
 * needing a second spelling for every capital somebody types.
 *
 * The needles are compiled fresh on every call and never cached.
 * They match globally, and a global `RegExp` carries `lastIndex`
 * from one use to the next, so a shared instance would start each
 * file wherever the previous file left off — a scan that passes and
 * fails alternately over unchanged input. `matchAll` keeps that
 * property inside the call too: it iterates an internal clone, so
 * the loops below cannot advance the instance they were handed.
 *
 * Results come back in file order — ascending line number, and
 * within a line in the order {@link SEND_REACH_RULES} declares.
 */
export function findSendReach(
  content: string,
  filePath: string,
): readonly SendReachMatch[] {
  const flagLines = commentFlagLines(content);
  const needles = SEND_REACH_RULES.map((rule) => ({
    rule,
    needle: new RegExp(rule.source, 'gi'),
  }));

  return content.split('\n').flatMap((line, index) => needles.flatMap(
    ({ rule, needle }) => [...line.matchAll(needle)].map((match) => ({
      ruleId: rule.id,
      kind: rule.kind,
      region: regionAt(flagLines[index], match.index),
      filePath,
      lineNumber: index + 1,
      line,
    })),
  ));
}
