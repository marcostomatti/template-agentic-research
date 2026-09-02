/**
 * @packageDocumentation
 * The sources status filter as a row of pressable badges: what the
 * row offers, which badge the URL has pressed, and what a press
 * writes back.
 *
 * A badge row and a `Select` are not two drawings of one control.
 * A select HOLDS a value, and offering it a total option list is
 * mandatory — `@ar/ui`'s `Select` resolves a value none of its
 * options carry to the FIRST one, silently, which is the failure
 * `../digest/actions.ts` guards its verdict ladder against. A badge
 * row holds nothing: each badge is a button reporting its own
 * `aria-pressed`, so the whole state is one comparison against the
 * search parameter and there is no value for a control to resolve on
 * an operator's behalf.
 *
 * Pure, and beside the page for the reason `./rows.ts` gives: the
 * unit suite is node-only and collects `.ts` alone, so a decision
 * written into a `.tsx` is reachable by no test in this package.
 *
 * ## Who reads this
 *
 * `./SourcesPage.tsx` maps {@link statusBadges} straight into
 * `../../components/FilterBadgeRow.tsx`, which is the app-local row
 * that draws them — `@ar/ui` ships no `FilterBadge`, and that file
 * carries why one is not being promoted this wave. The split is the
 * `.tsx` sentence above: the component renders badges and reports a
 * press, and every decision about what a badge SAYS is here.
 *
 * ## The counts are measured before this control narrows anything
 *
 * A badge's figure answers "how many rows if I press this", and that
 * is only true of a count taken over the rows the OTHER controls have
 * already left. There are two ways to get it wrong and neither looks
 * wrong on screen:
 *
 * - Counting the DOMAIN promises rows the search box has already
 *   removed, so a badge reading 3 leaves 1 and an operator is told
 *   the table lost two rows it never had.
 * - Counting the rows THIS control has left is worse, because it
 *   reads as correct: with a badge pressed, its own figure becomes
 *   the visible total and every other badge reads 0, so the row stops
 *   being a way to choose and becomes a report of the choice already
 *   made.
 *
 * So the count is the caller's to measure and arrives here as an
 * argument — `countSourceStatuses` from `../../data/sources`, over
 * the rows the search box and the kind filter left. That is the same
 * reading the count-carrying `Select` this row replaced already
 * took, so the page still measures it exactly once. Counting through
 * that module rather than here is deliberate: the stat band above
 * the table counts through it too, and a second reading of the four
 * stored health columns is exactly what it exists to prevent.
 *
 * ## Four badges, always
 *
 * {@link statusBadges} is TOTAL over `SourceStatus`: a status nothing
 * carries keeps its badge and reads 0. Dropping it would be tidier on
 * a narrow toolbar and would strand the filter — the counts move with
 * every keystroke in the search box, so the badge the URL has PRESSED
 * is free to fall to zero, and a row that dropped it would leave
 * `?status=failing` in the address with no control left to clear it.
 * A zero is a real reading besides: it says this domain has nothing
 * failing right now, which is a thing an operator came to the toolbar
 * to find out.
 *
 * ## No badge for the unfiltered state
 *
 * There is no leading `All statuses` badge, because pressing the
 * pressed one IS the clear — {@link statusPressValue} answers
 * `ALL_FILTER_VALUE` for that press. The sentinel is `../filters.ts`'s
 * rather than a literal here: it is the value `matchesSelect` lets
 * every row past on and the fallback the page hands
 * `useSearchParamState`, and being the fallback is what makes a clear
 * DELETE the key instead of pinning `?status=all` onto every link the
 * page produces.
 *
 * ## A value no badge carries presses nothing
 *
 * `?status=banana` reaches this module as readily as a real status —
 * it is a URL. Every badge then reads unpressed while the table
 * narrows to nothing, which is what the parameter actually says:
 * `matchesSelect` compares exactly, so an unrecognised value matches
 * no row. Nothing here repairs it. Inventing an option for the value
 * is what a `Select` needs, for the reason at the top, and it would
 * put a word this surface does not know into a control; the state is
 * escapable without that, because an unpressed badge presses to its
 * own status and so every badge is already offering to replace it.
 * The empty body underneath says the filters left nothing.
 *
 * ## No tone on a badge
 *
 * `SOURCE_STATUS_FACETS` carries a `CellStatusTone` per status and
 * this model does not repeat it. A tone is a reading of a ROW — the
 * dot in the status cell, the decoration on a stat card — where a
 * badge is a control, and four coloured chips in a toolbar would
 * spend the surface's one colour vocabulary on saying which button is
 * which. A component wanting one has `statusFacet` for it.
 *
 * ## Which array stance this module is in
 *
 * {@link statusBadges} answers a MUTABLE array, built fresh per call
 * and owned by nobody — the stance `../filters.ts` and
 * `../lexicon/terms.ts` take, and the opposite of the frozen tables in
 * `../../data/`. It feeds a component's props, so a `readonly` return
 * would protect nothing and cost the call site a copy of a copy.
 */

import type { SourceStatus, SourceStatusCounts } from '../../data/sources';

import { ALL_FILTER_VALUE } from '../filters';

import { SOURCE_STATUS_FACETS } from './rows';

/** One pressable badge in the status filter. */
export interface SourceStatusBadge {
  /** The status pressing it selects. */
  readonly status: SourceStatus;
  /**
   * What the badge is called.
   *
   * `SOURCE_STATUS_FACETS`' own label, unchanged, and WITHOUT the
   * count folded into it — unlike the `Select` this row replaced,
   * which had nowhere else to put the figure because a `SelectOption`
   * carries one string. A badge is markup, so the two stay separate
   * members and the row draws the figure as its own element, at its
   * own size.
   */
  readonly label: string;
  /**
   * How many rows pressing it would leave.
   *
   * See the header on what that is measured over, which is the whole
   * of what makes the promise true.
   */
  readonly count: number;
  /** Whether the status parameter has this badge pressed. */
  readonly pressed: boolean;
  /** What pressing it writes to the status parameter. */
  readonly pressValue: string;
}

/**
 * Whether the status parameter has this badge pressed.
 *
 * The two sides are deliberately different types. A badge is built
 * from `SourceStatus`, so its side is the union; the parameter is
 * whatever stood in the URL, so its side is any string at all — the
 * header says what an unrecognised one does.
 *
 * One comparison rather than a rule of its own, which is what keeps
 * it from disagreeing with `../filters.ts`'s `matchesSelect` about
 * the same value. `ALL_FILTER_VALUE` needs no case: no status is
 * spelled like it, so the sentinel presses nothing and lets every row
 * past, and the two readings agree that the control is narrowing
 * nothing.
 *
 * @param status - The status a badge offers.
 * @param selected - The status parameter, as the URL holds it.
 * @returns Whether that badge is the pressed one.
 */
export function isStatusPressed(
  status: SourceStatus,
  selected: string,
): boolean {
  return selected === status;
}

/**
 * What pressing one badge writes to the status parameter.
 *
 * A press of the PRESSED badge clears the filter. `aria-pressed` is a
 * toggle, and taking a filter back has to be the same gesture that
 * applied it — a row that only ever narrowed would need a second
 * control whose whole job was undoing the first. That press answers
 * `ALL_FILTER_VALUE`, which the page's `useSearchParamState` deletes
 * the key for rather than writing.
 *
 * Every other press writes the badge's own status, which is also how
 * a value no badge carries is escaped: nothing is pressed, so every
 * badge is offering to replace it.
 *
 * @param status - The status a badge offers.
 * @param selected - The status parameter, as the URL holds it.
 * @returns The value to write to the parameter.
 */
export function statusPressValue(
  status: SourceStatus,
  selected: string,
): string {
  return isStatusPressed(status, selected)
    ? ALL_FILTER_VALUE
    : status;
}

/**
 * The badges the status filter offers, in surface order.
 *
 * One per `SourceStatus`, mapped over `./rows.ts`'s
 * `SOURCE_STATUS_FACETS` rather than over a list of its own: the
 * order the badges run in and the words on them are then the same
 * ones the status cell and the stat cards use, and a status added to
 * the union arrives here with no edit at all.
 *
 * Each badge takes its `pressed` and `pressValue` from
 * {@link isStatusPressed} and {@link statusPressValue}, so the row
 * and the two readings taken on their own cannot answer differently
 * about the same parameter.
 *
 * Built fresh per call and owned by nobody — see the header on which
 * array stance this module is in.
 *
 * @param counts - A count per status, as `countSourceStatuses`
 * reports it over the rows the other controls have already left.
 * @param selected - The status parameter, as the URL holds it.
 * @returns One badge per status, in surface order.
 */
export function statusBadges(
  counts: SourceStatusCounts,
  selected: string,
): SourceStatusBadge[] {
  return SOURCE_STATUS_FACETS.map((facet) => ({
    status: facet.status,
    label: facet.label,
    count: counts[facet.status],
    pressed: isStatusPressed(facet.status, selected),
    pressValue: statusPressValue(facet.status, selected),
  }));
}
