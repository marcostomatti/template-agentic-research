/**
 * @packageDocumentation
 * The filter derivations every list surface shares.
 *
 * Four of the six routed surfaces are lists an operator narrows the
 * same two ways: a free-text box over whatever the rows say, and one
 * or more selects pinning a column to a value. The rules are small but
 * not obvious — what an empty box means, which fields a needle is
 * compared against, what a select holds while it is filtering nothing
 * — and a page answering any of them differently from its neighbour
 * would be a difference an operator feels and nobody wrote down. So
 * they live here once, as pure functions over rows, and each page
 * binds them to its own columns.
 *
 * ## The sentinel, and the three jobs it does
 *
 * {@link ALL_FILTER_VALUE} is one string standing for "this control is
 * filtering nothing" in three places at once: the first option a
 * filter select offers, the `fallback` its page hands
 * `useSearchParamState`, and the value {@link matchesSelect} lets every
 * row past. They have to be the SAME string. A select whose unfiltered
 * option did not equal the hook's fallback would write that option
 * into the URL and pin `?verdict=<whatever>` onto every link the page
 * produced — the exact failure the hook's fallback rule exists to
 * prevent — so this is one constant rather than three literals that
 * happen to agree today.
 *
 * ## Fields, not rows
 *
 * The text search takes a vector of {@link QueryField} readers rather
 * than a rendered string per row, and compares the needle against each
 * field SEPARATELY. Joining the fields first would be shorter and
 * subtly wrong: a query of two words would then match a row whose
 * title supplied the first and whose source supplied the second, which
 * is a hit an operator cannot see the reason for.
 *
 * ## What is deliberately not here
 *
 * A filter whose values are not compared for equality does not fit
 * {@link filterBySelect} and belongs beside the page that owns it. The
 * digest's time window is the one in this plan: its values name a
 * cutoff to measure a timestamp against rather than a column to match,
 * exactly one page wants it, and generalising it here before a second
 * caller exists would be a shape guessed rather than observed.
 */

import type { SelectOption } from '@ar/ui';

/**
 * What a filter select holds while it is filtering nothing.
 *
 * Spelled as a word rather than as an empty string because it is read
 * by an operator in the address bar as often as by this module, and
 * because `useSearchParamState` needs a select's fallback to be a
 * value the control can actually show — see the packageDocumentation
 * above for the three call sites that must agree on it.
 */
export const ALL_FILTER_VALUE = 'all';

/**
 * How one searchable field is read off a row.
 *
 * Nullable on purpose: the fixture types mirror a schema where absence
 * is a value (`Finding.verdict`, `Source.cursor`), so a page should be
 * able to name such a column as searchable without wrapping every
 * reader in a `?? ''` of its own. A field saying nothing simply does
 * not match.
 */
export type QueryField<T> = (row: T) => string | null | undefined;

/**
 * Fold text to the form the search compares.
 *
 * Trimmed and lowercased: an operator typing `Rust ` into a box means
 * the same thing as one typing `rust`, and a search that disagreed
 * would report nothing for a trailing space nobody can see.
 *
 * Also the reading of whether a query is active at all — an empty
 * answer means the box is saying nothing, which is what an empty-state
 * message needs to distinguish "no rows here" from "no rows matching
 * what you typed". Pages should ask this rather than re-deriving
 * `query.trim() !== ''` and drifting from the rule the filter uses.
 *
 * @param raw - Text as the control holds it.
 * @returns The comparable form; `''` when the text says nothing.
 */
export function normalizeQuery(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Whether one row satisfies an already-folded needle.
 *
 * Private because the folding is the caller's to do once per pass
 * rather than once per row, and a needle that reached here unfolded
 * would silently never match anything an operator typed in capitals.
 */
function matchesNeedle<T>(
  row: T,
  needle: string,
  fields: readonly QueryField<T>[],
): boolean {
  if (needle === '') {
    return true;
  }

  return fields.some(
    (read) => normalizeQuery(read(row) ?? '').includes(needle),
  );
}

/**
 * The rows whose searchable fields contain what was typed.
 *
 * An empty or whitespace-only query matches EVERY row, which is what
 * makes a search box a narrowing of the list rather than a gate in
 * front of it: the page renders its rows before the operator touches
 * anything, and clearing the box restores them.
 *
 * Matching is substring, folded through {@link normalizeQuery}, and
 * per field rather than over a joined string (see the
 * packageDocumentation). Only the fields named are searched — a value
 * an operator can see in a column nobody listed will not be found, so
 * a page adding a column should add its reader here too.
 *
 * The answer is always a fresh array, never the argument, so a caller
 * sorting or slicing what it gets back cannot reorder a fixture table
 * for every later reader in the tab.
 *
 * @param rows - The rows to narrow, in the order they should stay in.
 * @param query - Text as the search box holds it.
 * @param fields - Readers for the fields this surface searches.
 * @returns The matching rows, in the given order.
 */
export function filterByQuery<T>(
  rows: readonly T[],
  query: string,
  fields: readonly QueryField<T>[],
): readonly T[] {
  const needle = normalizeQuery(query);

  return rows.filter((row) => matchesNeedle(row, needle, fields));
}

/**
 * Whether one value passes a filter select's current choice.
 *
 * {@link ALL_FILTER_VALUE} passes everything, including a null value.
 * Anything else is compared exactly: `All` is a verdict a domain could
 * have configured, not the sentinel, and a comparison that folded case
 * or trimmed would swallow it.
 *
 * A null value never passes a chosen filter. That is the reading the
 * schema asks for — an unscored, unverdicted or never-read row is not
 * a member of any of the classes a select offers — and it is why
 * choosing a value can drop rows a text search left in place.
 *
 * Exported beside {@link filterBySelect} for the counts a page shows
 * next to its controls, which are the same question asked over a set
 * the operator has not chosen yet.
 *
 * @param value - The row's value for the filtered column.
 * @param selected - What the select currently holds.
 * @returns Whether the row passes.
 */
export function matchesSelect(
  value: string | null | undefined,
  selected: string,
): boolean {
  if (selected === ALL_FILTER_VALUE) {
    return true;
  }

  return value === selected;
}

/**
 * The rows whose filtered column matches a select's current choice.
 *
 * Composes with {@link filterByQuery} and with itself by chaining —
 * a surface with three controls narrows three times, in whatever order
 * reads best, because each pass answers a fresh array.
 *
 * @param rows - The rows to narrow, in the order they should stay in.
 * @param selected - What the select currently holds.
 * @param read - Reader for the column this select filters.
 * @returns The matching rows, in the given order.
 */
export function filterBySelect<T>(
  rows: readonly T[],
  selected: string,
  read: (row: T) => string | null | undefined,
): readonly T[] {
  return rows.filter((row) => matchesSelect(read(row), selected));
}

/**
 * A filter select's options, led by the one that filters nothing.
 *
 * The label is the caller's because it names the column — `All
 * verdicts` beside `All kinds` reads as two controls where a shared
 * `All` reads as one repeated twice — while the VALUE is not, which
 * is the whole point of routing every filter select through here.
 *
 * The caller's own options follow in the order given, so a vocabulary
 * with a meaningful ladder (a domain's verdicts run from strongest to
 * weakest) is not re-sorted into alphabetical order on its way to the
 * control. They must not themselves carry {@link ALL_FILTER_VALUE}:
 * a duplicate value in a `Select` renders a second, unreachable radio
 * item rather than an error.
 *
 * Returns a MUTABLE array, unlike the accessors in `../data/`, because
 * `SelectProps.options` is declared mutable and this array is built
 * fresh per call and owned by nobody — a `readonly` return would buy
 * nothing and cost every call site a spread that copies a copy.
 *
 * @param allLabel - Label for the leading option, naming the column.
 * @param options - This control's own options, in display order.
 * @returns Options ready for `@ar/ui`'s `Select`.
 */
export function withAllOption(
  allLabel: string,
  options: readonly SelectOption[],
): SelectOption[] {
  return [{ value: ALL_FILTER_VALUE, label: allLabel }, ...options];
}
