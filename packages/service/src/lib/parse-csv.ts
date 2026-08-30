/**
 * @packageDocumentation
 * parse-csv — the small RFC-4180 reader this platform uses on
 * delimited text somebody exported from a spreadsheet, and the rule
 * that it answers rather than refuses.
 *
 * A reader of its own lands here for the same structural reason every
 * module under `src/lib/` does. These libraries are dual-context: the
 * default suite imports them, and `scripts/build-workflows.ts`
 * splices the transpiled text into a Code node body, where nothing
 * resolves a specifier. So a CSV dependency is not a trade-off in this
 * directory, it is unavailable — and neither is splitting this file,
 * since a second module would need the import that rule forbids. What
 * is left is a subset small enough to read in a sitting:
 *
 * ```text
 * a,b,c            fields split on a comma
 * "a, b",c         a quoted field carrying the delimiter
 * "a""b",c         a doubled quote, which is one quote in the value
 * "a
 * b",c             a quoted field carrying a record separator
 * a,b<CR><LF>      either record separator, and the pair as one
 * <BOM>a,b         a leading byte-order mark, cut off the first cell
 * a,b              a row shorter than the header, padded out to it
 * ```
 *
 * ANSWERING IS THE POINT, and it is where this library sits opposite
 * `yaml-lite.ts` in the same directory. That parser throws on anything
 * outside its subset because a hand-edited configuration is somebody's
 * typo and the person who typed it is standing there to be told. This
 * one reads a file that arrived from outside, hours ago, from nobody
 * in particular — and a reader that threw on the last line of a
 * thousand would discard nine hundred and ninety-nine rows it had
 * already understood. So there is no malformed input here in the sense
 * of an input this refuses. There is only what it makes of one, and
 * every shape below has an answer:
 *
 * - A quote opening mid-field is a quote, and it swallows delimiters
 *   and separators until the next one or the end of the text.
 * - A quoted field that never closes ends at the end of the text,
 *   carrying whatever it reached.
 * - A blank line carries no record; a line of spaces carries one.
 * - A row shorter than the header is padded with empty cells; a row
 *   longer than it keeps only the columns the header named.
 * - Text with fewer than two records is no rows at all, which is what
 *   an empty file and a header with nothing under it have in common.
 *
 * Null-vs-zero survives this reader because it never coerces a cell.
 * Every field is the text that was between the delimiters, so a gauge
 * that measured no rainfall (`0`) and a gauge that was offline (an
 * empty cell) arrive as two different strings and the caller decides
 * what each means. A reader that helpfully turned `''` into `0` would
 * destroy that distinction before anything downstream could see it.
 *
 * This is a PORT, and what it KEEPS is the whole of the behaviour: the
 * grammar above, the state machine that reads it, the exact rule that
 * decides whether a separator closes a record, the padding, the
 * two-record floor, and the coercion in front of both entry points.
 * `tests/parity/parse-csv.parity.test.ts` is what says so rather than
 * this paragraph — it drives both exports and their originals over one
 * neutral corpus and fails on the first difference.
 *
 * What it DROPS is four things, none of them behaviour. The CommonJS
 * export block at the foot of the original becomes declaration
 * exports, which is what the splice strips and what a Code node can
 * run. `var` becomes `const` and `let`. Bracket reads of the text
 * become {@link String.charAt}, because `noUncheckedIndexedAccess`
 * types a bracket read as possibly-undefined while `charAt` answers
 * `''` past the end — which is the comparison the original was already
 * making against `undefined`. And the condition deciding whether a
 * record has content is written once, in {@link recordHasContent},
 * rather than spelled out at both the separator and the flush; the
 * records closed are the same records.
 *
 * The fifth thing it leaves behind is subject matter rather than code:
 * the original read one particular folder of files for one particular
 * downstream normalizer, where this platform's columns arrive from
 * `terms` and `criteria` rows at run time. So the port carries the
 * reader and not the thing it was pointed at, and its callers arrive
 * with the later phases.
 *
 * One behaviour is preserved DELIBERATELY and is worth finding here
 * rather than in a debugger: a header cell reading `__proto__` is the
 * one column this reader drops without saying so. {@link parseCsv}
 * assigns into a plain object, and that assignment goes through the
 * prototype setter instead of creating a key. The fix is real and
 * obvious — build the row on a null-prototype object — and it is not
 * this file's to make: the parity suite is the gate that decides
 * whether the port landed, so a repair here fails it. Changing it is a
 * decision for the phase that owns the callers, and until then
 * {@link parseCsv}'s own cases pin it so nobody meets it by surprise.
 *
 * The other two dual-context rules hold by construction: this file
 * imports nothing and keeps no state between calls.
 * `tests/build/lib-splice.test.ts` registers it and reads what a real
 * build made of it.
 */

/**
 * One record, as the text held it: its fields, in order, unpadded.
 *
 * A record is what {@link tokenizeCsv} answers with and is not yet a
 * row — nothing has been keyed, and nothing has been squared against
 * the header. Two records in one document may legitimately hold
 * different numbers of fields.
 */
export type CsvRecord = readonly string[];

/**
 * One row, keyed by the header cells.
 *
 * Every value is the text that was between the delimiters, never a
 * number and never `null`: an empty cell is `''`, and what that means
 * belongs to the caller who knows the column.
 */
export type CsvRow = { readonly [column: string]: string };

/** The field delimiter, which is the only one this reader knows. */
const DELIMITER = ',';

/** The character that opens and closes a quoted field. */
const QUOTE = '"';

/** One of the two record separators. */
const LINE_FEED = '\n';

/** The other, and the first half of the pair. */
const CARRIAGE_RETURN = '\r';

/**
 * The code point of a byte-order mark, written as its number.
 *
 * As a number rather than as the character itself, because a mark
 * pasted into a source file is invisible to every reader and to most
 * review tools — the repo's control-byte gate exists over exactly that
 * class of mistake.
 */
const BYTE_ORDER_MARK = 0xfeff;

/**
 * How many records a document needs before any row can be keyed.
 *
 * Subsumed by the absent-header check it sits beside, and kept for
 * the same reason {@link recordHasContent} keeps its dead
 * alternatives: a document holding exactly one record has a header
 * with nothing under it, so the loop over the records behind that
 * header answers with no rows whether this floor is here or not.
 * Measured over the same 19531 inputs.
 */
const MINIMUM_RECORDS = 2;

/**
 * Whatever a caller passed, as text.
 *
 * Takes `unknown` on purpose. The spliced copy runs in a Code node
 * where no type was ever checked, so this guard is all that stands
 * between a node handing this an absent field and a crash inside a
 * `charCodeAt` — and typing the parameter as `string` would let the
 * compiler delete the reasoning while the runtime still needed it.
 *
 * Absence answers `''`, and everything else answers its own string
 * conversion: a number arrives as its digits, an array as its joined
 * elements. That is the original's reading and it matters, because a
 * node that read a file into a value the platform did not model would
 * otherwise get an empty document and no sign anything went wrong.
 *
 * @param value - Anything at all, including nothing.
 * @returns The text to read.
 */
function asText(value: unknown): string {
  return value === null || value === undefined
    ? ''
    : String(value);
}

/**
 * Cut a leading byte-order mark, so the first header cell is clean.
 *
 * Only a leading one. A mark further along is a character inside a
 * value, and this reader has no business editing values.
 *
 * @param text - The whole document.
 * @returns The document, without the mark it may have opened with.
 */
function stripByteOrderMark(text: string): string {
  return text.charCodeAt(0) === BYTE_ORDER_MARK
    ? text.slice(1)
    : text;
}

/**
 * Whether the record being built has anything in it.
 *
 * This is the rule that separates a blank line from a record, and
 * only the FIRST of its three alternatives can decide anything. That
 * is worth writing down rather than leaving for the next reader to
 * rediscover: `field` only grows on a path that has already set
 * `sawAny`, and `record` only grows on a delimiter, which sets it
 * too, so the three are never out of step. Measured — a copy narrowed
 * to `sawAny` alone agrees with the original over every string up to
 * six characters drawn from the five the state machine branches on,
 * 19531 of them, through both entry points.
 *
 * The other two alternatives are kept anyway, because preservation is
 * the rule in this directory and the parity suite is the gate that
 * decides whether the port landed. They cost one line and they are
 * what the original says.
 *
 * @param sawAny - Whether any character reached the current record.
 * @param field - The field in hand, not yet pushed.
 * @param record - The fields already pushed.
 * @returns Whether a record should be closed here.
 */
function recordHasContent(
  sawAny: boolean,
  field: string,
  record: readonly string[],
): boolean {
  return sawAny || field !== '' || record.length > 0;
}

/**
 * Split a document into records, and each record into fields.
 *
 * Walks the text once as a small state machine, which is what lets a
 * quoted field carry a delimiter or a record separator without any
 * of it being special-cased afterwards. Two states and one flag:
 * inside a quoted field or outside one, and whether the record being
 * built has content yet.
 *
 * Never throws, for any input. The shapes a stricter reader would
 * turn away all have answers here, and they are the ones worth
 * knowing before reading a result:
 *
 * - A quote is an opening quote wherever it is found outside one, so
 *   `x"y,2` is a single field reading `xy,2` and everything after it
 *   until the next quote or the end.
 * - A quote inside a quoted field closes it unless the next character
 *   is another quote, in which case one quote joins the value.
 * - Text after a closing quote joins the same field: `"x"y` is `xy`.
 * - A carriage return followed by a line feed ends exactly one record;
 *   either one alone ends one too.
 * - A separator closes a record only when the record has content, so
 *   blank lines are skipped wherever they fall.
 * - A final record with no separator behind it is flushed at the end.
 *
 * @param text - The document. Anything that is not a string is read
 * through {@link asText} first — the guard exists for the spliced
 * copy, which runs where no type was ever checked.
 * @returns Every record the text held, each as its own fields.
 */
export function tokenizeCsv(text: string): readonly CsvRecord[] {
  const source = stripByteOrderMark(asText(text));
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let inQuotes = false;
  let sawAny = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source.charAt(index);

    if (inQuotes) {
      if (char !== QUOTE) {
        field += char;
        continue;
      }

      if (source.charAt(index + 1) === QUOTE) {
        // A doubled quote is one quote in the value; step over the
        // second so it cannot be read as a closing one.
        field += QUOTE;
        index += 1;
        continue;
      }

      inQuotes = false;
      continue;
    }

    if (char === QUOTE) {
      inQuotes = true;
      sawAny = true;
      continue;
    }

    if (char === DELIMITER) {
      record.push(field);
      field = '';
      sawAny = true;
      continue;
    }

    if (char !== LINE_FEED && char !== CARRIAGE_RETURN) {
      field += char;
      sawAny = true;
      continue;
    }

    // Swallow the line feed of a pair. The blank-record skip below
    // would drop the second event anyway — measured, removing this
    // changes nothing over the same 19531 inputs — so this is the
    // original's belt and braces, kept rather than reasoned away.
    if (char === CARRIAGE_RETURN && source.charAt(index + 1) === LINE_FEED) {
      index += 1;
    }

    if (recordHasContent(sawAny, field, record)) {
      record.push(field);
      records.push(record);
    }

    field = '';
    record = [];
    sawAny = false;
  }

  // A final record with nothing behind it still counts.
  if (recordHasContent(sawAny, field, record)) {
    record.push(field);
    records.push(record);
  }

  return records;
}

/**
 * Read a document into rows keyed by its header.
 *
 * The first record is the header and every later one is a row. Cells
 * are squared against the header rather than against each other, so
 * every row exposes every column the header named: a short row is
 * padded with `''`, and a long one keeps only what the header has a
 * name for. That is what a spreadsheet export looks like from the
 * other side, and it is why a caller can read a column without
 * checking whether this particular row had it.
 *
 * Fewer than two records is no rows. An empty document and a header
 * with nothing under it are the same answer, and deliberately: both
 * mean nobody wrote a row, and a caller that wanted to know which
 * has {@link tokenizeCsv}.
 *
 * The assignment below is load-bearing rather than incidental. Rows
 * are built by writing into a plain object one column at a time,
 * which is what makes a duplicated header name resolve to its LAST
 * cell and a `__proto__` header vanish silently. Both readings are
 * the original's, both are pinned by cases, and neither is this
 * file's to change — see the module header.
 *
 * @param text - The document. Anything that is not a string is read
 * through {@link asText} first.
 * @returns One row per record under the header, keyed by its cells.
 */
export function parseCsv(text: string): readonly CsvRow[] {
  const records = tokenizeCsv(text);
  const header = records[0];

  if (header === undefined || records.length < MINIMUM_RECORDS) {
    return [];
  }

  const rows: CsvRow[] = [];

  for (const cells of records.slice(1)) {
    const row: Record<string, string> = {};

    header.forEach((column, position) => {
      const cell = cells[position];

      row[column] = cell === undefined
        ? ''
        : cell;
    });

    rows.push(row);
  }

  return rows;
}
