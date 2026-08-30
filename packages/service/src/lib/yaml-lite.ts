/**
 * @packageDocumentation
 * yaml-lite — the small YAML subset this platform reads out of text a
 * person edits by hand, and the refusals that keep such a file honest.
 *
 * A configuration somebody opens and types into earns a parser of its
 * own here for a structural reason rather than an aesthetic one. Every
 * module under `src/lib/` is dual-context: the default suite imports
 * it, and `scripts/build-workflows.ts` splices its transpiled text
 * into a Code node body, where nothing resolves a specifier. So a YAML
 * dependency is not a trade-off in this directory, it is unavailable —
 * and so is splitting this file, since a second module would need the
 * import that rule forbids. What is left is a subset small enough to
 * read in a sitting. This is that subset:
 *
 * ```text
 * # comments, whole-line or trailing (a # at line start or after
 * #   whitespace)
 * key: value                scalars: int, decimal, true/false,
 *                             null/~/empty, 'quoted'
 * key:                      one level of nesting:
 *   sub: value                a map of scalars, or
 *   - scalar                  a list of scalars, or
 *   - {k: v, k2: v2}          a list of inline maps
 * key: []                   an explicitly empty list
 * ---                       a leading document marker, ignored
 * ```
 *
 * Everything else is refused by line: block scalars, flow collections
 * carrying entries, anchors, aliases and tags, nested sequences, maps
 * deeper than one level, tabs for indentation, a key assigned twice.
 *
 * THROWING IS THE POINT, and it is the one place this package's
 * libraries invert the rule that a library answers rather than raises.
 * A parser that shrugs at a construct it does not really understand
 * turns somebody's typo into a silently shortened list, and a reader
 * that quietly stops reading is the failure a hand-edited file is most
 * exposed to. Every caller is expected to let the error reach the
 * person who wrote the file, which is why each one names that file and
 * the line number in the ORIGINAL text — blanks and comment-only lines
 * counted, since those are the lines an editor shows.
 *
 * Null-vs-zero lands here before it lands anywhere downstream. An
 * empty value, `null` and `~` all read as `null`, and `0` reads as the
 * number zero; a reader collapsing those has lost the distinction
 * every numeric signal on this platform is built on.
 *
 * This is a PORT, and what it KEEPS is the whole of the behaviour: the
 * grammar above, every refusal, the exact sentence each one reports,
 * the file-and-line prefix in front of it, and the original line
 * numbering through a walk that has already dropped the blanks.
 * `tests/parity/yaml-lite.parity.test.ts` is what says so rather than
 * this paragraph — it drives all three exports and their originals
 * over one neutral corpus and fails on the first difference.
 *
 * What it DROPS is four things, none of them behaviour. The CommonJS
 * export block at the foot of the original becomes declaration
 * exports, which is what the splice strips and what a Code node can
 * run. `var` becomes `const` and `let`. The original coerces a
 * non-string document twice, at the entry point and again inside the
 * line walk; only the first survives, and deliberately — the spliced
 * copy runs where no type was ever checked, so that guard is all that
 * stands between a node handing this an absent field and a crash
 * inside a `replace`. And the tab check is written once rather than as
 * three alternatives the first already subsumes; the lines refused are
 * the same lines.
 *
 * The fifth thing it leaves behind is subject matter rather than code:
 * the original read one particular family of hand-edited files for one
 * particular matcher, where this platform's vocabulary arrives from
 * `terms` and `criteria` rows at run time. So the port carries the
 * reader and not the thing it was pointed at, and its callers arrive
 * with the later phases.
 *
 * The other two dual-context rules hold by construction: this file
 * imports nothing and keeps no state between calls — every pattern
 * below is non-global, so none carries a `lastIndex` from one call
 * into the next. `tests/build/lib-splice.test.ts` registers it and
 * reads what a real build made of it.
 */

/**
 * Every value this subset produces.
 *
 * Recursive because two productions put a collection where a scalar
 * sits: `[]` and `{}` are read AS scalars, so a list item and an
 * inline map's field may each hold an empty one. The type is
 * therefore looser than the grammar, which admits one level of nesting
 * and refuses a second by line number — depth is a refusal rather than
 * a shape, and no type carries it.
 */
export type YamlValue =
  | string
  | number
  | boolean
  | null
  | readonly YamlValue[]
  | { readonly [key: string]: YamlValue };

/** A parsed document: top-level keys, each owning one value. */
export type YamlDocument = { readonly [key: string]: YamlValue };

/** What a caller may tell {@link parseYamlLite} about its input. */
export interface ParseYamlLiteOptions {
  /**
   * The name every error message opens with; absent or empty, a
   * message names the line alone. Nothing here reads the file, so this
   * is a label rather than a path.
   */
  readonly file?: string;
}

/** One line carrying structure, and where it came from. */
interface MeaningfulLine {
  /** Its 1-based number in the ORIGINAL text, blanks counted. */
  readonly lineNumber: number;

  /** How many spaces it opens with. */
  readonly indent: number;

  /** The line, comment cut and both ends trimmed. */
  readonly text: string;
}

/** A `key: value` split, before either half is judged. */
interface YamlPair {
  /** Everything left of the colon, trimmed. */
  readonly key: string;

  /** Everything right of it, trimmed — `''` when there is none. */
  readonly value: string;
}

/** A block one key owns, and where the walk above it resumes. */
interface YamlBlock {
  /** The list or the map that block described. */
  readonly value: YamlValue;

  /** Index of the first line past it. */
  readonly next: number;
}

/**
 * Every refusal that is one fixed sentence, collected.
 *
 * These sentences ARE the contract a port preserves, so they are worth
 * checking against the original in one place rather than in fourteen.
 * The five refusals naming a key, a field, an indent width or a quote
 * kind stay at their call sites, where the value they interpolate is.
 */
const REFUSED = {
  anchor: 'anchors, aliases and tags are outside the supported subset',
  blockScalar: 'block scalars (| and >) are outside the supported subset',
  emptyInlineField: 'empty field in an inline map',
  emptyListItem: 'an empty list item is outside the supported subset',
  flowSequence:
    'flow sequences are outside the supported subset; use "- " list items',
  inlineMapAsValue:
    'an inline {k: v} map is only supported as a "- " list item',
  mixedBlock: 'a block is either a map or a list, never both',
  nestedInlineMap: 'nested inline maps are outside the supported subset',
  nestedListItem:
    'a list item is a scalar or an inline {k: v} map, not a nested map',
  notAPair: 'expected "key: value"',
  orphanIndent: 'indented line has no parent key',
  secondLevel: 'only one level of nesting is supported',
  tabIndent: 'a tab may not be used for indentation (use spaces)',
  unclosedInlineMap:
    'an inline map must open with { and close with } on the same line',
};

/** Keys the subset admits: letters, digits, `_`, `.`, `-` and spaces. */
const YAML_KEY = /^[A-Za-z0-9_][A-Za-z0-9_.\- ]*$/;

/** An integer, in the one form the subset reads as a number. */
const YAML_INTEGER = /^-?\d+$/;

/** A decimal, with digits on one side of the point or on both. */
const YAML_DECIMAL = /^-?(?:\d+\.\d*|\.\d+)$/;

/** One character of whitespace. */
const YAML_SPACE = /\s/;

/** The spaces a line opens with, which are its indentation. */
const YAML_INDENT = /^ */;

/**
 * A tab inside a line's leading whitespace. A tab further along is not
 * indentation and is left alone — a value may hold one, and only the
 * width of the left margin decides structure here.
 */
const YAML_TAB_INDENT = /^\s*\t/;

/** The dash and spacing a list item opens with. */
const YAML_ITEM_MARKER = /^-\s*/;

/** Trailing whitespace, cut before a line is measured. */
const YAML_TRAILING_SPACE = /\s+$/;

/**
 * Refuse a document, naming the file and the line it went wrong on.
 *
 * Returns `never`, which is what lets every caller below read as
 * straight-line code: a guard that fails does not fall through, and
 * the compiler knows it.
 *
 * @param file - The label a caller supplied, or `''` for none.
 * @param lineNumber - The line in the original text.
 * @param message - What is wrong, in one sentence.
 * @returns Never — it always throws.
 */
function yamlFail(file: string, lineNumber: number, message: string): never {
  const where = file === ''
    ? `line ${lineNumber}`
    : `${file} line ${lineNumber}`;

  throw new Error(`${where}: ${message}`);
}

/**
 * Cut a trailing comment, leaving anything inside quotes alone.
 *
 * A `#` opens a comment only at the start of a line or after
 * whitespace, so a hash inside a word is part of the value: `north#2`
 * is a value and `north #2` is a value with a comment after it. That
 * rule is what lets somebody write a value carrying a hash without
 * knowing anything about how this parser is written.
 *
 * @param line - One raw line, exactly as the document holds it.
 * @returns The line up to its comment, or all of it when it has none.
 */
export function stripYamlComment(line: string): string {
  let quote = '';

  for (let index = 0; index < line.length; index += 1) {
    const char = line.charAt(index);

    if (quote !== '') {
      if (char === quote) {
        quote = '';
      }
      continue;
    }

    if (char === '"' || char === '\'') {
      quote = char;
      continue;
    }

    if (char !== '#') {
      continue;
    }

    if (index === 0 || YAML_SPACE.test(line.charAt(index - 1))) {
      return line.slice(0, index);
    }
  }

  return line;
}

/**
 * How many spaces a line opens with.
 *
 * @param line - The line, comment already cut.
 * @returns Its indentation, in spaces.
 */
function leadingSpaces(line: string): number {
  const match = YAML_INDENT.exec(line);

  return match === null
    ? 0
    : match[0].length;
}

/**
 * Take the quotes off a quoted scalar, applying that quote's escape.
 *
 * Single quotes double to escape themselves, double quotes take a
 * backslash before a quote or a backslash. Nothing else is an escape
 * in either: a backslash-n inside a double-quoted value stays two
 * characters, which is the subset's answer rather than an omission.
 *
 * @param raw - The scalar, trimmed, opening with a quote.
 * @param file - Label for the error message.
 * @param lineNumber - Line for the error message.
 * @returns The value between the quotes.
 */
function unquote(raw: string, file: string, lineNumber: number): string {
  const quote = raw.charAt(0);

  if (raw.length < 2 || raw.charAt(raw.length - 1) !== quote) {
    const kind = quote === '"'
      ? 'double'
      : 'single';

    yamlFail(file, lineNumber, `unterminated ${kind}-quoted string`);
  }

  const body = raw.slice(1, -1);

  return quote === '\''
    ? body.replace(/''/g, '\'')
    : body.replace(/\\(["\\])/g, '$1');
}

/**
 * One scalar value, from text already trimmed and comment-free.
 *
 * The order the forms are tried in is part of the contract. An empty
 * value, `null` and `~` answer `null` before anything else is looked
 * at, so somebody who left a field blank gets the same answer as
 * somebody who wrote the word. Quoted text answers next and is never
 * read as a number or a boolean, which is how `'0'` stays a string.
 * The constructs outside the subset are refused after that and before
 * any number is attempted, so `[a, b]` reports what is wrong with it
 * rather than falling through to a bare string.
 *
 * Exported because a caller reading one field out of a larger
 * structure needs the same reading of a scalar the document parser
 * applies, and a second copy of these rules is what this file exists
 * to avoid.
 *
 * @param raw - The text right of a colon, or a list item.
 * @param file - Label for any error message.
 * @param lineNumber - Line for any error message.
 * @returns The value that text stands for.
 */
export function parseYamlScalar(
  raw: string,
  file: string,
  lineNumber: number,
): YamlValue {
  const value = raw.trim();

  if (value === '' || value === 'null' || value === '~') {
    return null;
  }

  const first = value.charAt(0);

  if (first === '"' || first === '\'') {
    return unquote(value, file, lineNumber);
  }

  if (first === '|' || first === '>') {
    yamlFail(file, lineNumber, REFUSED.blockScalar);
  }

  if (first === '&' || first === '*' || first === '!') {
    yamlFail(file, lineNumber, REFUSED.anchor);
  }

  if (first === '[') {
    if (value === '[]') {
      return [];
    }

    yamlFail(file, lineNumber, REFUSED.flowSequence);
  }

  if (first === '{') {
    if (value === '{}') {
      return {};
    }

    yamlFail(file, lineNumber, REFUSED.inlineMapAsValue);
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  if (YAML_INTEGER.test(value)) {
    return parseInt(value, 10);
  }

  if (YAML_DECIMAL.test(value)) {
    return parseFloat(value);
  }

  return value;
}

/**
 * Split `key: value` at the first colon that ends the key.
 *
 * The colon has to be followed by whitespace or by the end of the
 * line, which is what lets a value hold colons of its own — a bare
 * value reading `a note: with a colon` splits once, at the first one.
 * Quoted regions are skipped, so a colon inside quotes never ends a
 * key.
 *
 * @param text - One trimmed line, or one field of an inline map.
 * @returns The two halves, or `null` when this is not a key line.
 */
function splitYamlKey(text: string): YamlPair | null {
  let quote = '';

  for (let index = 0; index < text.length; index += 1) {
    const char = text.charAt(index);

    if (quote !== '') {
      if (char === quote) {
        quote = '';
      }
      continue;
    }

    if (char === '"' || char === '\'') {
      quote = char;
      continue;
    }

    if (char !== ':') {
      continue;
    }

    const next = text.charAt(index + 1);

    if (next !== '' && !YAML_SPACE.test(next)) {
      continue;
    }

    return {
      key: text.slice(0, index).trim(),
      value: text.slice(index + 1).trim(),
    };
  }

  return null;
}

/**
 * The key, if it is one this subset admits.
 *
 * @param key - The text left of a colon.
 * @param file - Label for the error message.
 * @param lineNumber - Line for the error message.
 * @returns The same key.
 */
function checkYamlKey(key: string, file: string, lineNumber: number): string {
  if (!YAML_KEY.test(key)) {
    const message = `unsupported key "${key}" `
      + '(letters, digits, _ . - and spaces only)';

    yamlFail(file, lineNumber, message);
  }

  return key;
}

/**
 * Write one key, refusing a second assignment to the same one.
 *
 * A duplicate is refused rather than resolved last-one-wins because
 * both readings lose one of an operator's lines, and only one of them
 * says so.
 *
 * @param target - The map being built.
 * @param key - The key, already checked.
 * @param value - What it holds.
 * @param file - Label for the error message.
 * @param lineNumber - Line for the error message.
 */
function assignYamlKey(
  target: Record<string, YamlValue>,
  key: string,
  value: YamlValue,
  file: string,
  lineNumber: number,
): void {
  if (Object.hasOwn(target, key)) {
    yamlFail(file, lineNumber, `duplicate key "${key}"`);
  }

  target[key] = value;
}

/**
 * Split an inline map's body on its top-level commas. Commas inside
 * quotes are part of a value, which is the whole reason this is a walk
 * rather than a `split`.
 *
 * @param body - What sits between the braces.
 * @returns One entry per field, quotes and spacing untouched.
 */
function splitInlineFields(body: string): string[] {
  const parts: string[] = [];
  let current = '';
  let quote = '';

  for (let index = 0; index < body.length; index += 1) {
    const char = body.charAt(index);

    if (quote !== '') {
      current += char;

      if (char === quote) {
        quote = '';
      }
      continue;
    }

    if (char === '"' || char === '\'') {
      quote = char;
      current += char;
      continue;
    }

    if (char === ',') {
      parts.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  parts.push(current);

  return parts;
}

/**
 * One `{k: v, k2: v2}` list item, as a map of scalars.
 *
 * A brace anywhere in the body is refused before any field is read: a
 * nested inline map is outside the subset, and refusing it early is
 * what stops the field splitter producing halves of one.
 *
 * @param text - The item, trimmed, braces included.
 * @param file - Label for any error message.
 * @param lineNumber - Line for any error message.
 * @returns The map that item describes.
 */
function parseInlineMap(
  text: string,
  file: string,
  lineNumber: number,
): YamlValue {
  const value = text.trim();

  if (value.charAt(0) !== '{' || value.charAt(value.length - 1) !== '}') {
    yamlFail(file, lineNumber, REFUSED.unclosedInlineMap);
  }

  const body = value.slice(1, -1).trim();
  const out: Record<string, YamlValue> = {};

  if (body === '') {
    return out;
  }

  if (body.includes('{')) {
    yamlFail(file, lineNumber, REFUSED.nestedInlineMap);
  }

  for (const rawField of splitInlineFields(body)) {
    const field = rawField.trim();

    if (field === '') {
      yamlFail(file, lineNumber, REFUSED.emptyInlineField);
    }

    const pair = splitYamlKey(field);

    if (pair === null) {
      const message = `inline map field "${field}" is not "key: value"`;

      yamlFail(file, lineNumber, message);
    }

    assignYamlKey(
      out,
      checkYamlKey(pair.key, file, lineNumber),
      parseYamlScalar(pair.value, file, lineNumber),
      file,
      lineNumber,
    );
  }

  return out;
}

/**
 * The lines carrying structure, each keeping its original number.
 *
 * Blank and comment-only lines carry none, so the walk below never
 * sees them — and every entry keeps the number it had in the document
 * somebody is looking at, which is the number an error has to report.
 *
 * @param text - The whole document.
 * @param file - Label for any error message.
 * @returns One entry per meaningful line, in order.
 */
function meaningfulLines(text: string, file: string): MeaningfulLine[] {
  const raw = text.replace(/\r\n/g, '\n').split('\n');
  const lines: MeaningfulLine[] = [];

  for (const [offset, rawLine] of raw.entries()) {
    const lineNumber = offset + 1;
    const line = stripYamlComment(rawLine).replace(YAML_TRAILING_SPACE, '');

    if (line.trim() === '') {
      continue;
    }

    if (YAML_TAB_INDENT.test(line)) {
      yamlFail(file, lineNumber, REFUSED.tabIndent);
    }

    lines.push({
      lineNumber,
      indent: leadingSpaces(line),
      text: line.trim(),
    });
  }

  return lines;
}

/**
 * One item of a block list.
 *
 * @param line - The item's line, dash included.
 * @param file - Label for any error message.
 * @returns The scalar or inline map that item holds.
 */
function parseListItem(line: MeaningfulLine, file: string): YamlValue {
  const item = line.text.replace(YAML_ITEM_MARKER, '').trim();

  if (item === '') {
    yamlFail(file, line.lineNumber, REFUSED.emptyListItem);
  }

  if (item.charAt(0) === '{') {
    return parseInlineMap(item, file, line.lineNumber);
  }

  if (splitYamlKey(item) !== null) {
    yamlFail(file, line.lineNumber, REFUSED.nestedListItem);
  }

  return parseYamlScalar(item, file, line.lineNumber);
}

/**
 * One `sub: value` pair of a block map, written into that map.
 *
 * A pair with no value is refused here rather than descending: a key
 * owning a block inside a block is the second level of nesting the
 * subset does not read, and the message names the key so the line is
 * findable.
 *
 * @param target - The map being built.
 * @param line - The pair's line.
 * @param file - Label for any error message.
 */
function assignPair(
  target: Record<string, YamlValue>,
  line: MeaningfulLine,
  file: string,
): void {
  const pair = splitYamlKey(line.text);

  if (pair === null) {
    yamlFail(file, line.lineNumber, REFUSED.notAPair);
  }

  if (pair.value === '') {
    const message = `${REFUSED.secondLevel} `
      + `(key "${pair.key}" has no value)`;

    yamlFail(file, line.lineNumber, message);
  }

  assignYamlKey(
    target,
    checkYamlKey(pair.key, file, line.lineNumber),
    parseYamlScalar(pair.value, file, line.lineNumber),
    file,
    line.lineNumber,
  );
}

/**
 * The indented block a key owns: a map of scalars, or a list.
 *
 * Which of the two it is comes from its first line and binds the rest,
 * so a block holding both a `- item` and a `sub: value` is refused
 * rather than resolved to whichever came first. Indentation binds the
 * same way: the first line's width is the block's, a wider line is the
 * second level of nesting the subset does not read, and a narrower one
 * is a misalignment.
 *
 * An empty slice answers an empty map. Nothing reaches it — the walk
 * above only descends once it has seen a line to descend into — and
 * answering keeps the function total, which is worth more than a throw
 * no caller can produce.
 *
 * @param lines - Every meaningful line of the document.
 * @param start - Index of the block's first line.
 * @param file - Label for any error message.
 * @returns The block's value, and where the walk resumes.
 */
function parseYamlBlock(
  lines: readonly MeaningfulLine[],
  start: number,
  file: string,
): YamlBlock {
  const block = lines.slice(start);
  const head = block[0];

  if (head === undefined) {
    return { value: {}, next: start };
  }

  const { indent } = head;
  const isList = head.text.charAt(0) === '-';
  const items: YamlValue[] = [];
  const entries: Record<string, YamlValue> = {};
  let next = start;

  for (const line of block) {
    if (line.indent === 0) {
      break;
    }

    if (line.indent !== indent) {
      const message = line.indent > indent
        ? REFUSED.secondLevel
        : `inconsistent indentation (expected ${indent} spaces)`;

      yamlFail(file, line.lineNumber, message);
    }

    if ((line.text.charAt(0) === '-') !== isList) {
      yamlFail(file, line.lineNumber, REFUSED.mixedBlock);
    }

    if (isList) {
      items.push(parseListItem(line, file));
    } else {
      assignPair(entries, line, file);
    }

    next += 1;
  }

  return {
    value: isList
      ? items
      : entries,
    next,
  };
}

/**
 * One top-level line, written into the document being built.
 *
 * Split out of {@link parseYamlLite} so the walk up there stays a
 * walk: everything a single key decides — a value on its own line, a
 * block below it, or nothing at all — is decided here.
 *
 * @param lines - Every meaningful line of the document.
 * @param index - Where this line sits among them.
 * @param line - That line.
 * @param out - The document being built.
 * @param file - Label for any error message.
 * @returns The index the walk continues from.
 */
function readTopLevelLine(
  lines: readonly MeaningfulLine[],
  index: number,
  line: MeaningfulLine,
  out: Record<string, YamlValue>,
  file: string,
): number {
  if (line.indent > 0) {
    yamlFail(file, line.lineNumber, REFUSED.orphanIndent);
  }

  const pair = splitYamlKey(line.text);

  if (pair === null) {
    yamlFail(file, line.lineNumber, REFUSED.notAPair);
  }

  const key = checkYamlKey(pair.key, file, line.lineNumber);

  if (pair.value !== '') {
    const value = parseYamlScalar(pair.value, file, line.lineNumber);

    assignYamlKey(out, key, value, file, line.lineNumber);

    return index + 1;
  }

  // An empty value owns the block below it, and is simply null when
  // nothing is indented under it.
  const following = lines[index + 1];

  if (following === undefined || following.indent === 0) {
    assignYamlKey(out, key, null, file, line.lineNumber);

    return index + 1;
  }

  const block = parseYamlBlock(lines, index + 1, file);

  assignYamlKey(out, key, block.value, file, line.lineNumber);

  return block.next;
}

/**
 * Read a whole document.
 *
 * A leading `---` is tolerated and ignored, so a file written by
 * somebody used to full YAML reads the same as one without it. A key
 * with a value takes that value; a key with none owns the indented
 * block below it, and holds `null` when nothing is indented under it.
 *
 * @param text - The document. A value that is not a string reads as an
 * empty one — the guard exists for the spliced copy, which runs where
 * no type was ever checked.
 * @param options - What to call the file in error messages.
 * @returns The document's top-level keys and what each one holds.
 * @throws Error On anything outside the subset, naming the file and
 * the line.
 */
export function parseYamlLite(
  text: string,
  options?: ParseYamlLiteOptions,
): YamlDocument {
  const file = options?.file
    ? String(options.file)
    : '';
  const source = typeof text === 'string'
    ? text
    : '';
  const lines = meaningfulLines(source, file);
  const out: Record<string, YamlValue> = {};
  const first = lines[0];
  const opensWithMarker = first !== undefined
    && first.indent === 0
    && first.text === '---';
  let index = opensWithMarker
    ? 1
    : 0;

  while (index < lines.length) {
    const line = lines[index];

    // Unreachable under the loop's own bound; it is the read that
    // satisfies `noUncheckedIndexedAccess` and costs nothing.
    if (line === undefined) {
      break;
    }

    index = readTopLevelLine(lines, index, line, out, file);
  }

  return out;
}
