/**
 * @packageDocumentation
 * What one markdown text names: the path-shaped references its
 * backtick spans carry, the relative targets its markdown links
 * carry, and the `doc-links-skip` markers it declares, each with the
 * line it sits on and each read from the text alone.
 *
 * Nothing here resolves anything. There is no import, no file read,
 * no listing of a tracked set and no git: whether a reference names
 * a file that exists is a question about a tree, and this module is
 * handed only a text. That is what lets a case hand it a text it
 * wrote and assert exactly what comes back, with no repository
 * anywhere in the run.
 *
 * Backtick spans are the main population and links the minor one,
 * because this repository names a file as a backticked plain path
 * rather than as a markdown link. A reader of links alone passes a
 * tree whose every stale path is spelled the house way.
 *
 * Code is blanked before anything is read, in two passes that each
 * keep the shape of the text. Every line of a fenced block becomes
 * an empty line, so the line count holds. Then, for links and
 * markers, every inline code span becomes spaces with its line
 * breaks kept, so offsets hold as well. A doc about markdown is full
 * of markdown, and without the blanking a link written out as an
 * example, or a marker quoted by the page that teaches it, would be
 * read as a live one. Spans are read from the text with only its
 * fences blanked, a span being what the second pass removes.
 *
 * A fence is CommonMark's: three or more backticks or tildes behind
 * at most three spaces, closed by a run of the same character at
 * least as long with nothing after it, and running to the end of the
 * text when nothing closes it. A backtick fence whose info string
 * carries a backtick is no fence at all, which is what keeps a line
 * opening with a triple-backtick inline span from blanking the rest
 * of the document. A span is CommonMark's run pairing: a run of N
 * backticks closed by the next run of exactly N, across a line break
 * but never across a blank line. A run with no partner is text.
 *
 * {@link isPathShaped} is the rule a span passes to be read, and it
 * is the rule the doc-reference census was taken under, so a reading
 * here can be held against that census figure for figure. A link
 * target passes no shape rule: somebody wrote a link, so it names a
 * path, and every relative one is kept. {@link readDocReferences}
 * returns all four populations at once.
 *
 * A marker is exactly `<!-- doc-links-skip: <path> -- <reason> -->`
 * on one line, and what a marker means (file-scoped, matched against
 * a reference by exact path) is the business of whatever resolves
 * the references. What is decided here is its grammar, and a comment
 * opening with the marker name that does not parse under it is a
 * {@link MarkerRefusal} rather than a marker. That covers the one
 * refusal the grammar exists for, a marker with no reason, and the
 * three ways an attempt can fail to name one at all. A refusal is
 * returned beside the references rather than thrown, so one bad
 * marker does not stop the rest of its document being read, and it
 * skips nothing: the reference it was written for is still read.
 */

/**
 * The extensions a backtick span may end in and still be read as a
 * path.
 *
 * The set the census was taken with, compared case-insensitively.
 * Its width is a measured trade rather than a list of every
 * extension the tree holds: a span ending in anything else is prose,
 * a command or a code expression far more often than it is a file,
 * and each extension added here is a new population of reports.
 */
export const PATH_EXTENSIONS: ReadonlySet<string> = new Set([
  'ts',
  'tsx',
  'js',
  'jsx',
  'mjs',
  'cjs',
  'md',
  'mdx',
  'json',
  'sql',
  'sh',
  'css',
  'html',
  'yml',
  'yaml',
  'toml',
  'lock',
  'txt',
  'env',
  'example',
  'gitignore',
  'gitkeep',
  'png',
  'svg',
  'jpg',
  'n8n',
  'bin',
  'log',
]);

/**
 * A leading URL scheme. It also matches a drive letter such as
 * `C:`, which is equally not a path this repository could track.
 */
const URL_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/**
 * A character a path in this repository never carries and a glob, a
 * placeholder, a shell expression or a code expression usually does.
 */
const NON_PATH_CHARACTER = /[*?[\]{}<>$|;&()'"`=,!^%\\]/;

/**
 * The extension a path-shaped span has to end in, when it does not
 * end in a slash.
 */
const TRAILING_EXTENSION = /\.([A-Za-z0-9]+)$/;

/**
 * Whether the content of one backtick span is read as a path.
 *
 * Refused, in order: an empty span or one carrying whitespace, one
 * opening with a URL scheme, one carrying a character from
 * {@link NON_PATH_CHARACTER}, one opening with `/` or `~`, and one
 * with no `/` anywhere in it. What is left is read when it ends in a
 * slash, which is a directory, or in an extension
 * {@link PATH_EXTENSIONS} names.
 *
 * The slash requirement is the costly line, and it is drawn on
 * purpose. A bare filename is never read, a stale one included,
 * because without the slash the extension set alone reads code such
 * as `console.log`, `process.env` and `res.json` as files. Nothing
 * else about a span is judged: `./x.js` and `@scope/` are both read,
 * and whether either names a file is left to whatever resolves it.
 *
 * @param content - A span's content, between its backtick runs and
 * exactly as written.
 * @returns `true` when the span is a path reference.
 */
export function isPathShaped(content: string): boolean {
  if (content === '' || /\s/.test(content)) {
    return false;
  }
  if (URL_SCHEME.test(content) || NON_PATH_CHARACTER.test(content)) {
    return false;
  }
  if (content.startsWith('/') || content.startsWith('~')) {
    return false;
  }
  if (!content.includes('/')) {
    return false;
  }
  if (content.endsWith('/')) {
    return true;
  }
  const extension = TRAILING_EXTENSION.exec(content)?.[1];
  return extension !== undefined
    && PATH_EXTENSIONS.has(extension.toLowerCase());
}

/**
 * A fence run at the start of a line: three or more of one fence
 * character behind at most three spaces.
 */
const FENCE_RUN = /^ {0,3}(`{3,}|~{3,})/;

/**
 * The fence run a line starts with and what follows it on the line,
 * or `undefined` when the line starts with none.
 */
function fenceRun(
  line: string,
): { readonly run: string; readonly rest: string } | undefined {
  const match = FENCE_RUN.exec(line);
  const run = match?.[1];
  return match === null || run === undefined
    ? undefined
    : { run, rest: line.slice(match[0].length) };
}

/**
 * The fence run a line opens a fenced block with, or `undefined`
 * when it opens none.
 */
function openingFence(line: string): string | undefined {
  const fence = fenceRun(line);
  if (fence === undefined) {
    return undefined;
  }
  if (fence.run.startsWith('`') && fence.rest.includes('`')) {
    return undefined;
  }
  return fence.run;
}

/**
 * Whether a line closes the fenced block `opening` opened: a run of
 * the same character at least as long, and nothing after it.
 */
function closesFence(line: string, opening: string): boolean {
  const fence = fenceRun(line);
  return fence !== undefined
    && fence.run[0] === opening[0]
    && fence.run.length >= opening.length
    && fence.rest.trim() === '';
}

/**
 * The text with every line of every fenced block emptied: the
 * opening fence, the body and the closing fence.
 *
 * Each such line becomes an empty line rather than being removed, so
 * the text keeps its line count and a line number read afterwards is
 * the line number in the source. Lines outside a fence are returned
 * exactly as they were.
 *
 * @param markdown - One markdown text.
 * @returns The same text with its fenced blocks emptied line by line.
 */
export function blankFencedBlocks(markdown: string): string {
  const kept: string[] = [];
  let opening: string | undefined;
  for (const line of markdown.split('\n')) {
    if (opening === undefined) {
      opening = openingFence(line);
      kept.push(opening === undefined
        ? line
        : '');
    } else {
      if (closesFence(line, opening)) {
        opening = undefined;
      }
      kept.push('');
    }
  }
  return kept.join('\n');
}

/**
 * One inline code span, located by its delimiters.
 */
type CodeSpan = {

  /** Offset of the first backtick of the opening run. */
  readonly start: number;

  /** Offset just past the last backtick of the closing run. */
  readonly end: number;

  /** What sits between the two runs, exactly as written. */
  readonly content: string;
};

/**
 * How many backticks run from `at`.
 */
function backtickRun(text: string, at: number): number {
  let end = at;
  while (text[end] === '`') {
    end += 1;
  }
  return end - at;
}

/**
 * Whether the line break at `newline` is followed by a blank line or
 * by the end of the text, either of which ends a paragraph and so
 * ends the search for a closing run.
 */
function endsParagraph(text: string, newline: number): boolean {
  let at = newline + 1;
  while (text[at] === ' ' || text[at] === '\t' || text[at] === '\r') {
    at += 1;
  }
  return at >= text.length || text[at] === '\n';
}

/**
 * The offset of the run of exactly `length` backticks closing a span
 * whose content starts at `from`, or `-1` when the paragraph ends
 * first.
 */
function closingRun(text: string, from: number, length: number): number {
  let at = from;
  while (at < text.length) {
    if (text[at] === '`') {
      const run = backtickRun(text, at);
      if (run === length) {
        return at;
      }
      at += run;
    } else if (text[at] === '\n' && endsParagraph(text, at)) {
      return -1;
    } else {
      at += 1;
    }
  }
  return -1;
}

/**
 * Every inline code span in a text, in document order.
 */
function codeSpans(text: string): readonly CodeSpan[] {
  const spans: CodeSpan[] = [];
  let at = text.indexOf('`');
  while (at !== -1) {
    const length = backtickRun(text, at);
    const closing = closingRun(text, at + length, length);
    if (closing === -1) {
      at = text.indexOf('`', at + length);
    } else {
      spans.push({
        start: at,
        end: closing + length,
        content: text.slice(at + length, closing),
      });
      at = text.indexOf('`', closing + length);
    }
  }
  return spans;
}

/**
 * The text with every span, delimiters included, turned into spaces
 * and its line breaks kept, so every offset still names the same
 * place.
 */
function blankSpans(text: string, spans: readonly CodeSpan[]): string {
  const parts: string[] = [];
  let copied = 0;
  for (const span of spans) {
    parts.push(text.slice(copied, span.start));
    parts.push(text.slice(span.start, span.end).replace(/[^\n]/g, ' '));
    copied = span.end;
  }
  parts.push(text.slice(copied));
  return parts.join('');
}

/**
 * A function answering the 1-based line an offset into `text` sits
 * on.
 */
function lineLocator(text: string): (offset: number) => number {
  const starts = [0];
  let newline = text.indexOf('\n');
  while (newline !== -1) {
    starts.push(newline + 1);
    newline = text.indexOf('\n', newline + 1);
  }
  return (offset) => {
    let low = 0;
    let high = starts.length - 1;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      const start = starts[middle];
      if (start !== undefined && start <= offset) {
        low = middle;
      } else {
        high = middle - 1;
      }
    }
    return low + 1;
  };
}

/**
 * One path a document names, and where.
 */
export type DocReference = {

  /**
   * The path as the document spells it: a span's whole content, or a
   * link's target with any `#fragment` and `?query` cut away.
   */
  readonly target: string;

  /** The 1-based line the span opens on, or the target sits on. */
  readonly line: number;
};

/**
 * One `doc-links-skip` marker a document declares.
 */
export type SkipMarker = {

  /** The path the marker names, exactly as written. */
  readonly path: string;

  /** Why the path is skipped, trimmed and never empty. */
  readonly reason: string;

  /** The 1-based line the marker sits on. */
  readonly line: number;
};

/**
 * Why a comment opening with the marker name is not a marker.
 *
 * - `unterminated`: no `-->` closes it on its own line, which is what
 *   a marker wrapped across two lines looks like.
 * - `malformed`: no `:` after the marker name, or more than one word
 *   where the path goes.
 * - `no-path`: nothing where the path goes.
 * - `no-reason`: a path with no ` -- ` after it, or with nothing but
 *   whitespace after the ` -- `.
 */
export type MarkerFault =
  | 'unterminated'
  | 'malformed'
  | 'no-path'
  | 'no-reason';

/**
 * One marker attempt that does not parse, and where.
 */
export type MarkerRefusal = {

  /** What is wrong with it. */
  readonly fault: MarkerFault;

  /**
   * The attempt as written, from its `<!--` to its `-->`, or to the
   * end of its line when nothing closes it.
   */
  readonly text: string;

  /** The 1-based line the attempt opens on. */
  readonly line: number;
};

/**
 * Everything {@link readDocReferences} reads out of one text, each
 * population in document order.
 */
export type DocReading = {

  /** The path-shaped backtick spans. */
  readonly spans: readonly DocReference[];

  /** The relative markdown link targets. */
  readonly links: readonly DocReference[];

  /** The markers that parse. */
  readonly markers: readonly SkipMarker[];

  /** The marker attempts that do not. */
  readonly refusals: readonly MarkerRefusal[];
};

/**
 * An inline link or image, capturing its target. An optional
 * double-quoted title after the target is matched and dropped.
 */
const INLINE_LINK = /\[[^\]]*\]\([ \t]*([^)\s]+)(?:[ \t]+"[^"]*")?[ \t]*\)/g;

/**
 * The part of a link target a relative path is read from, or
 * `undefined` for a target that is not relative: one opening with a
 * URL scheme, with `#` (an anchor in the same document) or with `/`
 * (a root-relative or protocol-relative address).
 */
function relativeTarget(target: string): string | undefined {
  if (URL_SCHEME.test(target)) {
    return undefined;
  }
  if (target.startsWith('#') || target.startsWith('/')) {
    return undefined;
  }
  const [path] = target.split(/[#?]/);
  return path === ''
    ? undefined
    : path;
}

/**
 * Every relative link target in a text whose code is blanked.
 */
function readLinks(
  blanked: string,
  lineAt: (offset: number) => number,
): readonly DocReference[] {
  const links: DocReference[] = [];
  for (const match of blanked.matchAll(INLINE_LINK)) {
    const written = match[1] ?? '';
    const target = relativeTarget(written);
    if (target !== undefined) {
      const opens = match[0].indexOf('](') + 2;
      const offset = match.index + match[0].indexOf(written, opens);
      links.push({ target, line: lineAt(offset) });
    }
  }
  return links;
}

/**
 * Where a marker attempt starts: a comment whose first word is the
 * marker name.
 */
const MARKER_OPENING = /<!--[ \t]*doc-links-skip\b/g;

/**
 * A comment interior, trimmed, that names the marker with its colon.
 */
const MARKER_BODY = /^doc-links-skip:(.*)$/;

/**
 * A marker body, trimmed: one word of path, then `--`, then the
 * reason when there is one.
 */
const PATH_THEN_REASON = /^(\S+)[ \t]+--(?:[ \t]+(.*))?$/;

/**
 * The marker a comment interior declares, or the fault that keeps it
 * from declaring one.
 */
function parseMarkerInterior(
  interior: string,
): { readonly path: string; readonly reason: string } | MarkerFault {
  const body = MARKER_BODY.exec(interior.trim());
  if (body === null) {
    return 'malformed';
  }
  const rest = (body[1] ?? '').trim();
  if (rest === '' || rest === '--' || rest.startsWith('-- ')) {
    return 'no-path';
  }
  const parts = PATH_THEN_REASON.exec(rest);
  if (parts === null) {
    return /\s/.test(rest)
      ? 'malformed'
      : 'no-reason';
  }
  const [, path, written] = parts;
  const reason = (written ?? '').trim();
  return path === undefined || reason === ''
    ? 'no-reason'
    : { path, reason };
}

/**
 * Every marker attempt in a text, sorted into the markers that parse
 * and the refusals that do not.
 *
 * Attempts are found in `blanked`, so one inside a code span or a
 * fence is not an attempt. What an attempt says is sliced from
 * `source` at the same offsets, so a reason quoting a code span
 * keeps the span it quotes.
 */
function readMarkers(
  blanked: string,
  source: string,
  lineAt: (offset: number) => number,
): Pick<DocReading, 'markers' | 'refusals'> {
  const markers: SkipMarker[] = [];
  const refusals: MarkerRefusal[] = [];
  for (const match of blanked.matchAll(MARKER_OPENING)) {
    const start = match.index;
    const line = lineAt(start);
    const newline = blanked.indexOf('\n', start);
    const lineEnd = newline === -1
      ? blanked.length
      : newline;
    const closing = blanked.indexOf('-->', start + '<!--'.length);
    if (closing === -1 || closing > lineEnd) {
      const text = source.slice(start, lineEnd);
      refusals.push({ fault: 'unterminated', text, line });
      continue;
    }
    const text = source.slice(start, closing + '-->'.length);
    const parsed = parseMarkerInterior(
      source.slice(start + '<!--'.length, closing),
    );
    if (typeof parsed === 'string') {
      refusals.push({ fault: parsed, text, line });
    } else {
      markers.push({ ...parsed, line });
    }
  }
  return { markers, refusals };
}

/**
 * Reads one markdown text into the references it names and the
 * markers it declares.
 *
 * Fenced blocks are emptied first, keeping the line count. Spans are
 * then read from that text and kept when {@link isPathShaped} says
 * so. Links and markers are read from the same text with its spans
 * blanked as well, so neither is read out of an example. Every
 * population comes back in document order and carries the 1-based
 * line of the source text it was read from.
 *
 * @param markdown - One markdown document's whole text.
 * @returns The spans, links, markers and refused marker attempts.
 */
export function readDocReferences(markdown: string): DocReading {
  const source = blankFencedBlocks(markdown);
  const found = codeSpans(source);
  const blanked = blankSpans(source, found);
  const lineAt = lineLocator(source);
  const spans = found
    .filter((span) => isPathShaped(span.content))
    .map((span) => ({ target: span.content, line: lineAt(span.start) }));
  return {
    spans,
    links: readLinks(blanked, lineAt),
    ...readMarkers(blanked, source, lineAt),
  };
}
