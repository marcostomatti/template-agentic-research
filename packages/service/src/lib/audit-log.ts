/**
 * @packageDocumentation
 * audit-log — the on-disk half of a run's ledger: one immutable
 * JSON Lines file per write, with a fixed set of columns and
 * nothing in it a caller did not declare.
 *
 * Every event worth a ledger already lands in a table. That answers
 * "what did this run do" only while the database is reachable and
 * only for whoever can query it. A file under a bind mount is
 * readable from the host with `cat` — including from a container
 * nobody can get into any more, which is the situation an audit
 * trail exists for and the one where a table is worth nothing.
 *
 * ONE FILE PER WRITE, not one appended file, and that is a bound
 * rather than a preference. Two things rule the alternative out.
 * Appending through the file node was measured broken on the image
 * the original ran: the open flag it passes carries neither a write
 * intent nor a create one, so appending to a missing file fails and
 * appending to an existing one fails differently. And a
 * read-modify-write of one shared file races — two runs in flight at
 * once, one silently dropping the other's lines, in the one artifact
 * whose whole purpose is to be complete. Immutable per-run files
 * have neither problem, and the stamp sorts, so concatenating the
 * directory in name order reconstructs the whole history.
 *
 * Three shapes make a line readable by something other than a
 * program that knows this file.
 *
 * Key order is fixed and comes from the kind, so every line in a
 * file carries the same columns in the same places and a column
 * cutter reads it. A value that is missing is an explicit `null`
 * rather than an absent key, for the same reason: a line short one
 * key would shift every column after it.
 *
 * Null and zero stay apart. A count that was measured and came back
 * zero is `0`; a count nothing measured is `null`. Anything
 * unparseable becomes `null` rather than `0`, which is the whole
 * distinction — a ledger reporting zero cost for a run it failed to
 * measure is worse than one reporting nothing.
 *
 * Unknown keys are DROPPED rather than passed through. This file is
 * read during an incident, and a line carrying whatever a caller
 * happened to have in scope is how an untrusted body ends up in an
 * artifact nobody sanitizes. A caller adds a column by declaring it
 * on the kind, never by putting one in a record.
 *
 * ## What this port takes as input, and why
 *
 * Two things the original baked in are arguments here. Both are
 * deliberate and neither is a repair: a reader who finds the
 * original should read the difference as this platform having more
 * than one domain, not as a mistake.
 *
 * The KIND ROSTER — which log kinds exist, what columns each one
 * writes, in what order, and which of those columns are numbers —
 * arrives as an {@link AuditKind} the caller supplies. The original
 * declared two kinds and their columns as module constants, which
 * was right for one deployment researching one subject. Here the
 * columns a domain records are the domain's, so a roster in this
 * file would be one domain's vocabulary compiled into every other
 * domain's ledger.
 *
 * The OUTPUT DIRECTORY is an argument for the same reason: where a
 * deployment mounts its files is the deployment's, not this
 * library's.
 *
 * Both moves have the same consequence, and it is the interesting
 * half. The original could refuse an unknown kind and an unusable
 * site slug by saying they were written by us in one workflow
 * template, so a bad one was a programming error a test catches
 * rather than something to guess around at run time. That argument
 * does not survive the parameterization: a kind and a directory now
 * arrive from configuration. So the same reasoning is applied at the
 * boundary instead — {@link assertAuditKind} bounds the CAPABILITY
 * of what it is handed rather than judging its content, which is
 * exactly what the original did to a site slug and for exactly the
 * same reason.
 *
 * Four checks come out of that, each closing something the
 * parameterization opened.
 *
 * A kind's id is bounded by {@link AUDIT_NAME_SHAPE}, the shape the
 * original applied to a site slug, because the id lands in a
 * FILENAME on the same terms the slug does.
 *
 * A field name is bounded by {@link AUDIT_FIELD_SHAPE}, which closes
 * a drop that would otherwise be silent. A line is assembled into a
 * plain object, and a column literally named for the prototype
 * accessor is the one key such an assignment does not make: the
 * write goes through a setter and is a no-op, the read answers
 * something that was never written, and nothing reports either. The
 * shape refuses a leading underscore, so that column is refused
 * where it is declared rather than lost where it is written.
 *
 * A directory is one or more segments of the same bounded shape, so
 * a parent-directory segment or a leading separator is refused. The
 * write node resolves this path against its own root; an unbounded
 * directory would let a configuration value put the file somewhere
 * the operator did not choose.
 *
 * And a kind's numeric columns must be columns it declares, because
 * a numeric column named for a field that does not exist is a column
 * that will be read as text forever with nothing to say so.
 *
 * ## What is kept
 *
 * The whole of the behaviour: the stamp's substitutions and the
 * refusal it throws, the field cap and every coercion around it, the
 * control-character and line-separator strips, the whitespace
 * collapse, the null-vs-zero split between the text and number
 * coercions, the record guard, the defaults fallback, the JSON Lines
 * assembly with its trailing newline, the no-records-no-file rule,
 * and the item shape a write node consumes.
 * `tests/parity/audit-log.parity.test.ts` is what says so rather
 * than this paragraph. Its leg is the KERNEL — the stamp, both
 * coercions and the line assembly — driven against the original over
 * the original's OWN roster, read out of the original at run time so
 * no domain vocabulary reaches a tracked file. The path builder, the
 * file builder and the item collector take the two arguments named
 * above, so nothing can drive both sides of them over one input;
 * they are pinned by characterization cases in
 * `tests/lib/audit-log.test.ts` instead.
 *
 * ## What is dropped
 *
 * Four things, none of them behaviour. The CommonJS export block at
 * the foot of the original becomes declaration exports, which is
 * what the splice strips and what a Code node can run. `var` becomes
 * `const`. A dead guard in the stamp is gone — it asked whether a
 * millisecond count was a number, and the call that produced it
 * cannot answer anything else. And the patterns are hoisted to
 * module scope from the expressions that used them, which moves
 * nothing: a compiled pattern with no `lastIndex` to carry is the
 * same pattern however often it is built.
 *
 * ## What is preserved deliberately
 *
 * Four readings worth finding here rather than in a debugger,
 * because each of them looks like a bug until the argument for it is
 * read, and each is pinned by a case.
 *
 * The field cap applies only when it IS a number, and `NaN` is one.
 * So a cap that arrived as text falls back to
 * {@link AUDIT_FIELD_CHARS}, and a cap that arrived as `NaN` caps
 * nothing at all — every comparison against it is false, so the text
 * comes back whole.
 *
 * A NEGATIVE cap reads as an offset from the END, because the cut is
 * a slice rather than a check. A cap of minus one drops the last
 * character instead of returning nothing.
 *
 * {@link auditNumber} accepts everything a numeric conversion
 * accepts, which is more than a reader expects: `true` is one, an
 * empty list is zero, and a hexadecimal string is its value. The
 * cases pin all three, because the alternative — a parse that reads
 * only decimal text — is a different function that would silently
 * change what a stored count means.
 *
 * And {@link buildAuditFile} answers `null` for no records BEFORE it
 * builds a path, so a call with an unusable site and no records
 * returns nothing rather than refusing. That is the no-file rule
 * winning over the bound, and it is the original's order.
 *
 * One further shape is preserved without being pinnable at all, and
 * it is written up on {@link AUDIT_LINE_BREAKS}: that pass is
 * redundant with the whitespace collapse after it, measured rather
 * than assumed. No case can cover it, so the comment is the whole
 * artifact — which is the honest answer for a port, since removing
 * it would be a change nothing here asked for.
 *
 * ## Dual context
 *
 * Like every module under `src/lib/`, this one is imported by the
 * default suite AND spliced into a workflow Code node body by
 * `scripts/build-workflows.ts`. So it imports nothing, keeps no
 * state between calls, and cannot be split into smaller files — a
 * second module would need the import the splice rule forbids, which
 * is why `many small files` has no expression here.
 * `tests/build/lib-splice.test.ts` registers it and reads what a
 * real build made of it.
 *
 * The two patterns built from code points are the other half of that
 * rule. A source file here stays plain ASCII, and a character class
 * holding control characters or line separators cannot be written as
 * a literal without putting those characters in the source — so both
 * are assembled from their code points, which is the shape the
 * original already used for one of them.
 */

// ---------------------------------------------------------------------------
// Bounds and shapes
// ---------------------------------------------------------------------------

/**
 * How much of one text column a line carries, when a caller names no
 * cap.
 *
 * Long enough for a name, a query or a location; short enough that a
 * hostile title cannot turn one line into a page. Reconstructing a
 * run needs the numbers, not the prose.
 */
export const AUDIT_FIELD_CHARS = 500;

/**
 * The column a run's own timestamp fills in, when a kind declares it
 * and a caller supplies no value for it.
 *
 * Baked rather than taken from the kind, and the split is worth
 * being exact about: WHICH columns a kind writes is domain input,
 * while the NAME of the column carrying the moment a line was
 * written is this library's own vocabulary. A kind that declares no
 * such column simply never sees the default; a kind that calls its
 * timestamp something else supplies that column itself, like any
 * other.
 */
export const AUDIT_STAMP_FIELD = 'ts';

/**
 * What a kind's id, a site slug and each directory segment have to
 * look like.
 *
 * All three land in a FILENAME or a path, which is why they share
 * one shape: the bound is on what the value can DO, not on what it
 * says. Lower-case, digits and dashes, opening on an alphanumeric,
 * forty characters at most. A parent-directory segment, a leading
 * separator, a drive letter and an empty segment all fail it, and
 * they fail it for the same reason rather than by a rule each.
 */
const AUDIT_NAME_SHAPE = /^[a-z0-9][a-z0-9-]{0,39}$/;

/**
 * What a column name has to look like.
 *
 * Lower-case, digits and underscores, opening on a letter — the
 * shape a column already has everywhere else here. The leading
 * letter is the load-bearing half: it refuses the one name a plain
 * object cannot hold as a column, for the reason the module header
 * gives.
 */
const AUDIT_FIELD_SHAPE = /^[a-z][a-z0-9_]*$/;

/**
 * Every character that would put a byte in a line no reader expects
 * there.
 *
 * Serialization escapes a newline and a return inside a string, so
 * what is left is the rest of the control range plus delete — none
 * of which mean anything in a ledger column, and all of which
 * survive a JSON round trip to reappear in whatever reads the file.
 *
 * Built from code points rather than written as a literal class, for
 * the reason the module header gives about plain-ASCII sources —
 * and because a control character inside a pattern literal is a lint
 * error here on top of that.
 */
const AUDIT_CONTROL_CHARS = new RegExp(
  '['
  + String.fromCharCode(0x00)
  + '-'
  + String.fromCharCode(0x1f)
  + String.fromCharCode(0x7f)
  + ']',
  'g',
);

/**
 * The two separators that would split one JSON Lines record across
 * two lines.
 *
 * Serialization escapes a newline and a return; it does NOT escape
 * these two, and some readers treat both as line terminators, so a
 * value carrying one would end a record early in exactly the reader
 * a plain-text ledger exists to be read by. That is why the original
 * names them, and it is true.
 *
 * The pass that applies this pattern is nonetheless REDUNDANT, and
 * saying so is the honest artifact rather than a reason to delete
 * it. Both characters are whitespace to the language's own class, so
 * the collapse that follows in {@link auditText} already turns each
 * of them into a space. Measured over every string up to four
 * characters drawn from the alphabet the passes branch on — 7381
 * inputs — removing this one moves no output at all, while a variant
 * DELETING the two rather than spacing them diverged on 168. So
 * nothing could pin it, and a port removes nothing behavioural: it
 * is kept because it states the intent where the intent lives, and
 * this paragraph is what stops the next reader from re-deriving that
 * it is load-bearing.
 */
const AUDIT_LINE_BREAKS = new RegExp(
  '[' + String.fromCharCode(0x2028) + String.fromCharCode(0x2029) + ']',
  'g',
);

/** Every run of whitespace, collapsed to one space. */
const AUDIT_SPACE_RUN = /\s+/g;

/** The colons a stamp replaces, for the reason the stamp gives. */
const AUDIT_STAMP_COLON = /:/g;

/** The dot a stamp replaces, by the same argument. */
const AUDIT_STAMP_DOT = /\./g;

/** What a stamp and a filename put between their parts. */
const AUDIT_NAME_SEPARATOR = '-';

/** What a path puts between its segments. */
const AUDIT_PATH_SEPARATOR = '/';

/** What separates two records, and what ends the last one. */
const AUDIT_LINE_SEPARATOR = '\n';

/** The extension every log this writes carries. */
const AUDIT_FILE_SUFFIX = '.jsonl';

/** What a write node is told the payload is. */
const AUDIT_ITEM_MIME = 'application/x-ndjson';

// ---------------------------------------------------------------------------
// What a caller declares, and what comes back
// ---------------------------------------------------------------------------

/**
 * One log kind: what the file is called, what columns it writes, and
 * which of those columns are numbers.
 *
 * The roster this belongs to is the caller's, for the reason the
 * module header gives. Everything here is checked by
 * {@link assertAuditKind} before a line is assembled, so a
 * misdeclared kind refuses at the first write rather than producing
 * a file whose columns cannot be read.
 */
export interface AuditKind {
  /**
   * The kind's name, which is also the first part of every filename
   * it produces.
   *
   * Bounded by {@link AUDIT_NAME_SHAPE} because it lands in a
   * filename.
   */
  readonly id: string;

  /**
   * Every column, in the order a line writes them.
   *
   * Order is part of the contract rather than a detail: a file is
   * read by cutting columns, so two lines that disagree about
   * position are two files. Each name is bounded by
   * {@link AUDIT_FIELD_SHAPE}, and no name may appear twice.
   */
  readonly fields: readonly string[];

  /**
   * Which of {@link fields} carry numbers rather than text.
   *
   * Every member must be a member of {@link fields}. A column that
   * is not here is coerced as text, which is the safe default: a
   * count read as text is visibly wrong, where prose read as a
   * number is silently `null`.
   */
  readonly numericFields: readonly string[];
}

/**
 * One assembled line: every column its kind declared, in that order,
 * each holding text, a number or an explicit `null`.
 */
export type AuditLine = Record<string, string | number | null>;

/** One file's worth of lines, ready to be written. */
export interface AuditFile {
  /** Where it goes, relative to whatever root the writer resolves. */
  readonly path: string;

  /** Every line, separated and terminated by a newline. */
  readonly content: string;

  /** How many lines that is, for a caller that reports totals. */
  readonly count: number;
}

/** The per-run values {@link buildAuditFile} needs. */
export interface AuditFileOptions {
  /**
   * The directory the file lands in, relative to the writer's root.
   *
   * One or more segments of {@link AUDIT_NAME_SHAPE}. Required
   * rather than defaulted, which is the point of the divergence: a
   * default here would be one deployment's layout compiled into
   * every other one's.
   */
  readonly dir: string;

  /**
   * The moment this run happened. Absent means now.
   *
   * It fills two roles at once, which is what makes one run's file
   * readable: it stamps the FILENAME, and it fills in
   * {@link AUDIT_STAMP_FIELD} on every line that does not carry one.
   * So a file's name and its contents agree about when it was
   * written without anyone passing the value twice.
   */
  readonly now?: unknown;

  /**
   * The per-run values every line shares, by column name.
   *
   * A record reaching {@link auditLine} without a given column falls
   * back to this. Anything not a column of the kind is ignored, on
   * the same terms a record's unknown keys are.
   */
  readonly defaults?: Readonly<Record<string, unknown>>;
}

/** One item a write node consumes: the path, and the bytes. */
export interface AuditItem {
  /** What a downstream node can read without decoding anything. */
  readonly json: {
    /** Where the file goes. */
    readonly path: string;

    /** How many lines it holds. */
    readonly lines: number;
  };

  /** The payload itself, in the shape a write node expects. */
  readonly binary: {
    /** The one attachment, under the name a write node reads. */
    readonly data: {
      /** The content, base64-encoded. */
      readonly data: string;

      /** What the content is. */
      readonly mimeType: string;

      /** The last segment of the path. */
      readonly fileName: string;
    };
  };
}

/**
 * What {@link auditItems} accepts.
 *
 * One file, none, or a list that may hold either — because the
 * caller is usually collecting the answers of several
 * {@link buildAuditFile} calls, and some of them legitimately came
 * back with nothing to write.
 */
export type AuditFileInput =
  | AuditFile
  | null
  | undefined
  | readonly (AuditFile | null | undefined)[];

// ---------------------------------------------------------------------------
// Refusals
// ---------------------------------------------------------------------------

/**
 * Refuse, naming the library so a message in a log says where it
 * came from.
 *
 * Returns `never`, which is what lets every guard below read as
 * straight-line code: a check that fails does not fall through, and
 * the compiler knows it.
 *
 * @param message - What is wrong, in one sentence.
 * @returns Never — it always throws.
 */
function auditFail(message: string): never {
  throw new Error(`audit-log: ${message}`);
}

/**
 * A value as a refusal message renders it.
 *
 * Serialization rather than a string conversion, so a refusal about
 * an empty string says so instead of saying nothing, and a refusal
 * about text carrying a space is readable as one value.
 *
 * It can itself throw — on a value serialization does not model, or
 * on one holding itself — which is the original's exposure and is
 * kept: a refusal path that swallowed a second fault would report
 * the wrong one.
 *
 * @param value - Whatever the guard refused.
 * @returns That value, rendered.
 */
function rendered(value: unknown): string {
  return JSON.stringify(value);
}

// ---------------------------------------------------------------------------
// The stamp
// ---------------------------------------------------------------------------

/**
 * A moment as a filename part: an ISO timestamp with its colons and
 * its dot replaced by dashes.
 *
 * Both substitutions are about where the value goes. A colon is not
 * a filename character on every filesystem a directory of these is
 * ever synced to, and the dot would read as an extension. What
 * survives is the part that matters: the string still sorts
 * lexicographically, so listing a directory by name lists its runs
 * in order.
 *
 * Refuses anything that is not a moment. A stamp that guessed would
 * put two runs in one file or one run in a file named for a moment
 * that never happened, and there is no useful answer to hand back
 * for a caller that did not supply a time.
 *
 * What counts as a moment is whatever the language's own date
 * conversion accepts, which is the original's reading and is wider
 * than it looks — a boolean is a millisecond count, and a value
 * whose text conversion parses as a date is that date. Two kinds of
 * value refuse in a way this function never sees: one that cannot
 * become a number at all raises from the conversion itself.
 *
 * @param when - A date, a millisecond count, or anything a date
 *   conversion accepts.
 * @returns The moment, as a filename part.
 */
export function auditStamp(when: unknown): string {
  const source: unknown = when ?? Number.NaN;
  const date = when instanceof Date
    ? when
    : new Date(source as string | number);

  if (Number.isNaN(date.getTime())) {
    auditFail(`${rendered(when)} is not a timestamp`);
  }

  return date.toISOString()
    .replace(AUDIT_STAMP_COLON, AUDIT_NAME_SEPARATOR)
    .replace(AUDIT_STAMP_DOT, AUDIT_NAME_SEPARATOR);
}

// ---------------------------------------------------------------------------
// The two coercions
// ---------------------------------------------------------------------------

/**
 * Whatever a caller had, as one bounded line of text — or `null`
 * when there was nothing.
 *
 * Four passes, in this order and for four different reasons. Control
 * characters go first, because they are the ones serialization keeps
 * and a reader cannot see. The two line separators go next, for a
 * reason {@link AUDIT_LINE_BREAKS} states and measures: it names
 * them where naming them means something, and the pass itself is
 * subsumed by the one after it. The whitespace collapse then makes
 * the result one line whatever it arrived as, and the trim removes
 * what the earlier passes left at the ends.
 *
 * Absence and emptiness both answer `null`, and they answer the same
 * thing on purpose: a column holding an empty string and a column
 * holding nothing are the same fact, and a ledger that told them
 * apart would be reporting on its caller rather than on the run.
 *
 * The cap is the boundary worth reading twice. It applies only when
 * it is a number — so text falls back to
 * {@link AUDIT_FIELD_CHARS} — and `NaN` IS a number, which caps
 * nothing at all because every comparison against it is false. A
 * negative cap cuts from the END, because the cut is a slice.
 * All three are the original's and all three are pinned.
 *
 * What the comparison itself decides is only that `NaN` case.
 * Measured by mutation against both suites, swapping it for the
 * inclusive form changes no output at all: at the one length where
 * the two differ, slicing text at its own length is the text. So
 * nothing pins the direction, and the guard is worth keeping for the
 * value that makes every comparison false rather than for the
 * boundary.
 *
 * @param value - Anything at all, including nothing.
 * @param limit - How much to keep. Anything but a number falls back
 *   to {@link AUDIT_FIELD_CHARS}.
 * @returns The bounded single-line text, or `null`.
 */
export function auditText(value: unknown, limit?: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const cap = typeof limit === 'number'
    ? limit
    : AUDIT_FIELD_CHARS;
  const text = String(value)
    .replace(AUDIT_CONTROL_CHARS, ' ')
    .replace(AUDIT_LINE_BREAKS, ' ')
    .replace(AUDIT_SPACE_RUN, ' ')
    .trim();

  if (text === '') {
    return null;
  }

  return text.length > cap
    ? text.slice(0, cap)
    : text;
}

/**
 * Whatever a caller had, as a finite number — or `null` when it is
 * not one.
 *
 * This is where the null-vs-zero rule is actually implemented, and
 * the `null` is the whole point: a value that cannot be read as a
 * number is unmeasured, never zero. A ledger reporting zero cost for
 * a run whose cost it failed to parse is worse than one reporting
 * nothing, because only one of the two is visibly missing.
 *
 * The empty string joins absence rather than becoming zero, which
 * matters because a text column arriving empty is the commonest way
 * a count goes missing.
 *
 * What it ACCEPTS is wider than a reader expects and is the
 * original's: everything the language's numeric conversion accepts.
 * A boolean is one or zero, an empty list is zero, and a
 * hexadecimal string is its value. That is preserved rather than
 * narrowed to decimal text, because narrowing it would silently
 * change what an already-stored count means.
 *
 * @param value - Anything at all, including nothing.
 * @returns The finite number, or `null`.
 */
export function auditNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

// ---------------------------------------------------------------------------
// The kind, checked at the boundary
// ---------------------------------------------------------------------------

/**
 * Refuse a log kind that could not produce a readable file.
 *
 * This is the guard the parameterization owes, and the module header
 * argues why it exists at all: the original could call a bad kind a
 * programming error because it declared every kind itself, and a
 * kind arriving from a domain's configuration cannot be called that.
 * What it bounds is CAPABILITY rather than content — what an id, a
 * directory segment or a column name can DO once it lands in a
 * filename or an object key — which is exactly the rule the original
 * applied to a site slug.
 *
 * Every check refuses by naming the value it refused, because all
 * five faults look identical from a file with the wrong columns in
 * it.
 *
 * Exported so a caller registering a domain's roster can check it
 * once at registration rather than discovering it at the first
 * write. The writing functions call it anyway: a kind is an
 * argument, so nothing here can assume some earlier call vetted it.
 *
 * @param kind - The kind to check.
 * @returns Nothing. It refuses instead.
 */
export function assertAuditKind(kind: AuditKind): void {
  if (typeof kind !== 'object' || kind === null || Array.isArray(kind)) {
    auditFail(`log kind ${rendered(kind)} is not a record`);
  }

  if (typeof kind.id !== 'string' || !AUDIT_NAME_SHAPE.test(kind.id)) {
    auditFail(`unusable log kind id ${rendered(kind.id)}`);
  }

  if (!Array.isArray(kind.fields) || kind.fields.length === 0) {
    auditFail(`log kind ${rendered(kind.id)} declares no fields`);
  }

  const declared = new Set<string>();

  for (const field of kind.fields) {
    if (typeof field !== 'string' || !AUDIT_FIELD_SHAPE.test(field)) {
      auditFail(
        `unusable field name ${rendered(field)} `
        + `in log kind ${rendered(kind.id)}`,
      );
    }

    if (declared.has(field)) {
      auditFail(
        `duplicate field ${rendered(field)} `
        + `in log kind ${rendered(kind.id)}`,
      );
    }

    declared.add(field);
  }

  if (!Array.isArray(kind.numericFields)) {
    auditFail(`log kind ${rendered(kind.id)} declares no numeric fields`);
  }

  for (const field of kind.numericFields) {
    if (!declared.has(field)) {
      auditFail(
        `numeric field ${rendered(field)} is not a field `
        + `of log kind ${rendered(kind.id)}`,
      );
    }
  }
}

/**
 * Refuse a directory that could put a file somewhere the operator
 * did not choose.
 *
 * One or more segments of {@link AUDIT_NAME_SHAPE} joined by the
 * path separator, which refuses an absolute path, a parent-directory
 * segment, an empty segment and a doubled separator — all of them
 * for the one reason, rather than by a rule each. The value is
 * configuration here rather than a constant, which is the whole
 * reason this function exists.
 *
 * @param dir - The directory a caller supplied.
 * @returns Nothing. It refuses instead.
 */
function assertAuditDir(dir: string): void {
  const segments = typeof dir === 'string'
    ? dir.split(AUDIT_PATH_SEPARATOR)
    : [];
  const usable = segments.length > 0
    && segments.every((segment) => AUDIT_NAME_SHAPE.test(segment));

  if (!usable) {
    auditFail(`unusable log directory ${rendered(dir)}`);
  }
}

// ---------------------------------------------------------------------------
// One line, one file, and the items that carry it
// ---------------------------------------------------------------------------

/**
 * One record as a line: every column the kind declares, in that
 * order — or `null` when the record is not one.
 *
 * A record's own value wins where it HAS the column, and the
 * per-run defaults fill in where it does not. Presence is what
 * decides, not truthiness: a record that explicitly carries an
 * absent value keeps it rather than inheriting the default, which is
 * the difference between "this run measured nothing" and "nobody
 * asked".
 *
 * Unknown keys are dropped, for the reason the module header gives.
 * A caller adds a column by declaring it on the kind.
 *
 * A record that is not an object — absent, a list, a primitive —
 * answers `null` rather than refusing, and that asymmetry against
 * the kind is deliberate: a malformed kind is a configuration fault
 * that will repeat on every line, while a malformed record is one
 * item in a batch and costs that item alone.
 *
 * @param kind - Which columns to write, in what order.
 * @param record - The values, by column name.
 * @param defaults - What to use for a column the record lacks.
 * @returns The line, or `null` when there is no record.
 */
export function auditLine(
  kind: AuditKind,
  record: unknown,
  defaults?: Readonly<Record<string, unknown>>,
): AuditLine | null {
  assertAuditKind(kind);

  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return null;
  }

  // The one cast in this file. The guard above establishes an
  // object, and reading a column off it is exactly what the guard
  // was for; the compiler has no narrowing that says so.
  const values = record as Record<string, unknown>;
  // Absent defaults and an unusable value for them are the same
  // thing here, since the result is only ever indexed and indexing
  // any primitive by a column name answers nothing.
  const fallback: Record<string, unknown> = defaults ?? {};
  const numeric = new Set(kind.numericFields);
  const line: AuditLine = {};

  for (const field of kind.fields) {
    const value: unknown = Object.hasOwn(values, field)
      ? values[field]
      : fallback[field];

    line[field] = numeric.has(field)
      ? auditNumber(value)
      : auditText(value);
  }

  return line;
}

/**
 * Where one run's file for one kind goes.
 *
 * Three parts and a directory, in the order that makes a listing
 * useful: the kind groups the files, the stamp sorts them inside
 * that group, and the site says which deployment wrote them. So
 * concatenating a directory by name replays one kind's history in
 * order, and two deployments sharing a mount never collide.
 *
 * Refuses an unusable kind, site or directory rather than guessing.
 * The kind and the directory are checked by the functions above; the
 * site carries the original's own bound, unchanged, and for the
 * original's own reason — it is ours, but it lands in a filename, so
 * it is bounded rather than trusted.
 *
 * @param kind - Which kind's file this is.
 * @param site - Which deployment wrote it.
 * @param when - The moment the run happened.
 * @param dir - The directory it lands in.
 * @returns The path, relative to the writer's root.
 */
export function auditLogPath(
  kind: AuditKind,
  site: string,
  when: unknown,
  dir: string,
): string {
  assertAuditKind(kind);

  if (typeof site !== 'string' || !AUDIT_NAME_SHAPE.test(site)) {
    auditFail(`unusable site slug ${rendered(site)}`);
  }

  assertAuditDir(dir);

  const stamp = auditStamp(when);
  const name = `${kind.id}${AUDIT_NAME_SEPARATOR}${stamp}`;

  return `${dir}${AUDIT_PATH_SEPARATOR}${name}`
    + `${AUDIT_NAME_SEPARATOR}${site}${AUDIT_FILE_SUFFIX}`;
}

/**
 * Every record as one file's worth of lines — or `null` when there
 * is nothing to write.
 *
 * Answering `null` rather than an empty file is the rule that makes
 * the directory mean something: a writer runs once per item, so no
 * item means no file, and the directory stays a record of runs that
 * actually did something rather than a run count.
 *
 * That rule wins over the bounds, which is the one ordering worth
 * knowing: the answer is decided BEFORE the path is built, so a call
 * with an unusable site and no records comes back `null` instead of
 * refusing. It is the original's order and it is pinned by a case.
 *
 * One run, one moment. The moment stamps the filename and fills in
 * {@link AUDIT_STAMP_FIELD} on every line that carries no value for
 * it, so a file's name and its contents cannot disagree about when
 * it was written.
 *
 * @param kind - Which columns to write, in what order.
 * @param site - Which deployment is writing.
 * @param records - The records, as a list. Anything else is none.
 * @param opts - The directory, the moment, and the shared defaults.
 * @returns The file, or `null` when no record became a line.
 */
export function buildAuditFile(
  kind: AuditKind,
  site: string,
  records: unknown,
  opts: AuditFileOptions,
): AuditFile | null {
  const now: unknown = opts.now ?? new Date();
  const stamp = now instanceof Date
    ? now
    : new Date(now as string | number);
  const supplied: Readonly<Record<string, unknown>> = opts.defaults ?? {};
  const stampValue = supplied[AUDIT_STAMP_FIELD];
  const stampAbsent = stampValue === null || stampValue === undefined;
  const stampDefault: unknown = stampAbsent
    ? stamp.toISOString()
    : stampValue;
  const defaults: Record<string, unknown> = {
    ...supplied,
    [AUDIT_STAMP_FIELD]: stampDefault,
  };
  const rows: readonly unknown[] = Array.isArray(records)
    ? records
    : [];
  const lines: string[] = [];

  for (const row of rows) {
    const line = auditLine(kind, row, defaults);

    if (line !== null) {
      lines.push(JSON.stringify(line));
    }
  }

  if (lines.length === 0) {
    return null;
  }

  const body = lines.join(AUDIT_LINE_SEPARATOR);

  return {
    path: auditLogPath(kind, site, stamp, opts.dir),
    content: `${body}${AUDIT_LINE_SEPARATOR}`,
    count: lines.length,
  };
}

/**
 * The last segment of a path.
 *
 * The fallback is unreachable: splitting a non-empty string always
 * yields at least one segment, and every caller has already refused
 * an empty path. It is written because the compiler cannot know
 * that, and it answers the whole path rather than an empty string so
 * an impossible case would still name the file it came from.
 *
 * @param path - A path built by {@link auditLogPath}.
 * @returns Its filename.
 */
function fileNameOf(path: string): string {
  return path.split(AUDIT_PATH_SEPARATOR).at(-1) ?? path;
}

/**
 * Every file as one item a write node consumes, and nothing for the
 * ones that came back empty.
 *
 * Here rather than in each caller because the payload shape is the
 * kind of thing that gets spelled slightly differently in each of
 * several places and then diverges — an encoding, a media type and
 * an attachment name, none of which any node reports getting wrong.
 *
 * A file with no path or no content is skipped rather than refused.
 * Every such value is one this library itself answered `null` for,
 * so a caller collecting several builds hands the collection
 * straight here without filtering it first.
 *
 * @param files - One file, none, or a list that may hold either.
 * @returns One item per file with something to write.
 */
export function auditItems(files: AuditFileInput): AuditItem[] {
  const list: readonly (AuditFile | null | undefined)[] = Array.isArray(files)
    ? files
    : [files];
  const items: AuditItem[] = [];

  for (const file of list) {
    if (!file || !file.path || !file.content) {
      continue;
    }

    items.push({
      json: { path: file.path, lines: file.count },
      binary: {
        data: {
          data: Buffer.from(file.content, 'utf8').toString('base64'),
          mimeType: AUDIT_ITEM_MIME,
          fileName: fileNameOf(file.path),
        },
      },
    });
  }

  return items;
}
