/**
 * @packageDocumentation
 * A filter drawn as a row of pressable badges: every value the
 * control offers, how many rows each of them would leave, and which
 * one the URL currently has pressed — all of it on the toolbar, with
 * nothing to open.
 *
 * That visibility is the whole reason this is not a `Select`. A
 * select states the CHOICE and hides the alternatives, so a count
 * folded into an option label is only legible while the panel is
 * open and is gone again the moment something is picked. A badge row
 * states the choice and the alternatives at once, which is what
 * makes a per-option count worth measuring at all: an operator can
 * read that pressing `Failing` would leave three rows without
 * pressing it, and can read that it would leave none without
 * discovering that by emptying the table.
 *
 * ## `@ar/ui` ships no `FilterBadge`
 *
 * Measured rather than assumed: zero occurrences of the name
 * anywhere under `packages/ui/src`. Neither of the two components
 * that come close is one.
 *
 * - `FilterDropdown` is a multi-select checklist behind a trigger.
 *   It hides its options exactly the way a `Select` does, which is
 *   the property this control exists to not have.
 * - `OptionCard` is the library's own `aria-pressed` precedent and
 *   is the right shape for a choice that fills a panel — a title, a
 *   description, a meta line. Four of them do not go in a toolbar.
 *
 * So this composes two atoms that DO exist, one inside the other.
 * `Touchable` is the library's interaction-only primitive: a
 * `button type="button"` carrying the focus ring and the press
 * transform and no chrome at all, spreading `ButtonHTMLAttributes`
 * so `aria-pressed` passes straight through. `Chip` is the chrome,
 * and its own variants file already calls it "a removable token: an
 * active filter". Interaction outside, decoration inside.
 *
 * ## Promoting one is out of scope for this wave
 *
 * The UI spec names ONE `@ar/ui` deliverable for q15 and it is
 * `EntityCard`. A second promotion is a second story matrix, a
 * second visual baseline to seed against a suite that fails a run it
 * has to create one for, and a second component contract guessed
 * from a single call site — this one. `../../AGENTS.md` records the
 * same restraint about `PageHead`, which is a stand-in that stays a
 * stand-in for exactly that reason.
 *
 * What a promotion would have to take over, on the day it happens:
 *
 * - **The pressed treatment, as a variant instead of an override.**
 *   `Chip` is unconditionally accent-tinted, so the UNPRESSED badge
 *   here is three of the atom's own base utilities replaced through
 *   `cn` at a call site (see {@link UNPRESSED_CHIP}). It works
 *   because `cn` is tailwind-merge, and it is a call site reaching
 *   into an atom's internals — which is precisely what a `pressed`
 *   CVA variant on the promoted component would exist to stop.
 * - **The button and its decoration as ONE element.** Two composed
 *   atoms means `aria-pressed` sits on the outer one and the fill on
 *   the inner one, and nothing outside this file keeps the two
 *   agreeing about which badge is pressed.
 * - **The count's treatment** ({@link COUNT_BASE}) — a figure INSIDE
 *   a control rather than beside one, which the library has no
 *   vocabulary for today.
 * - **The library's component contract**: `forwardRef`, an
 *   `HTMLAttributes` spread, a `cn(className)` merge. Every `@ar/ui`
 *   export carries all three and nothing in this app needs any of
 *   them, so they are deliberately not pre-built here — the same
 *   call `PageHead` makes, and for the same reason: an API with no
 *   caller is kept alive by the next reader assuming one exists.
 *
 * What a promotion would NOT take is the model. Which badge is
 * pressed, what a press writes back, and what the counts are
 * measured over are app knowledge and stay in the page's own `.ts`
 * — `../pages/sources/badges.ts`, for the one caller there is. This
 * file decides nothing: it renders {@link FilterBadge} values and
 * reports a press.
 *
 * ## The row holds no state, so it cannot disagree with the URL
 *
 * Every badge arrives already knowing whether it is pressed and what
 * pressing it writes, and {@link FilterBadgeRowProps.onPress} hands
 * that value to whatever owns the parameter — `useSearchParamState`,
 * for every list surface here. There is no local `useState` to fall
 * out of step with the address bar, and a press that clears the
 * filter is the same call as a press that applies one: the caller's
 * model decides which, and the sentinel it answers is the one the
 * hook deletes the key for.
 *
 * ## The visible text IS the accessible name
 *
 * A badge carries no `aria-label`, so its name is computed from its
 * contents. That keeps the name and the visible label identical by
 * construction, which is what WCAG 2.5.3 asks for, and it is how a
 * spec addresses one: `getByRole('button', { name: 'Failing 3' })`.
 *
 * The space in that name is NOT in the markup and a spec has to know
 * which of the two readings it is taking. Measured in chromium
 * against this row: `textContent` answers `Failing3` while the
 * accessible name is `Failing 3` and `innerText` is `Failing\n3` —
 * the chip is `inline-flex`, so its children are blockified flex
 * items and name computation joins their contributions with a
 * separator. It is the same trap the lexicon buckets record, and it
 * is why the count is a separate element rather than folded into the
 * label string.
 *
 * The group's own name is invisible and names the COLUMN being
 * filtered rather than its values, which is the only context a bare
 * figure in a name needs.
 *
 * ## Nothing marks the pressed badge except its fill
 *
 * No check glyph and no leading icon, because either would change a
 * badge's width on every press and walk the row's later badges
 * sideways under the pointer. The state is carried by the fill, by
 * the border, by the count's colour, and — for anything not looking
 * at it — by `aria-pressed`, which is the reading that does not
 * depend on colour at all.
 *
 * Nothing in this file is reachable from the unit suite, which is
 * node-only and collects `.ts` alone. Its bindings are proven by a
 * `check-types` mutation grid; what it renders falls to the
 * Playwright specs.
 */

import { Chip, Touchable } from '@ar/ui';

/**
 * How the row lays its badges out.
 *
 * Wrapping rather than scrolling: it sits in `ToolbarControls`, which
 * is itself `flex-wrap`, and a filter an operator cannot see is the
 * one failure this control was chosen to avoid. The gap is tighter
 * than the toolbar's own, so the badges read as one cluster among the
 * controls rather than as four more of them.
 */
const ROW_CLASSES = 'flex flex-wrap items-center gap-1.5';

/**
 * The hover hook every badge shares.
 *
 * Named rather than bare `group`. `@ar/ui`'s `Table` already mounts
 * `group/row` and `group/head` on the same surfaces this row sits
 * on, so a bare `group` would be captured by either of them the day
 * a badge row is drawn inside one — and the failure would be a hover
 * that fires on the wrong pointer, which no gate here reads.
 */
const BADGE_GROUP = 'group/badge';

/**
 * What a PRESSED badge adds to `Chip`'s own treatment.
 *
 * Nothing but a transition and a hover. The atom is accent-tinted
 * out of the box — an 11% accent fill over a 34% accent border, the
 * library's `-soft`/`-tint` recipe — and that IS the pressed
 * reading, which is why the override below is the unpressed one and
 * not this one.
 *
 * The hover takes the border to full accent, so a pressed badge
 * answers the pointer at all: pressing it again clears the filter,
 * and a control that looked inert under the cursor would not say so.
 */
const PRESSED_CHIP = [
  'transition-colors',
  'group-hover/badge:border-accent',
].join(' ');

/**
 * What an UNPRESSED badge replaces in `Chip`'s own treatment.
 *
 * The neutral tier of the same recipe: a 9% `-wash` fill over a 32%
 * `-tint` border, against the accent tier's 11%/34%. Two rungs of
 * one ladder rather than a chip beside a `Tag`, so the row reads as
 * four states of one control and the geometry is identical — the
 * fill, the border colour and the text colour move on a press and
 * nothing else does.
 *
 * This is the call-site override the header names as the first thing
 * a promoted component would take over: `cn` is tailwind-merge, so
 * these three win over `Chip`'s `bg-accent-soft border-accent-tint
 * text-fg1` by conflicting with them. It is a file outside the
 * library knowing what is in an atom's base class list.
 */
const UNPRESSED_CHIP = [
  'transition-colors',
  'bg-neutral-wash border-neutral-tint text-fg2',
  'group-hover/badge:border-border-strong group-hover/badge:text-fg1',
].join(' ');

/**
 * How the figure inside a badge is set.
 *
 * Mono and a step down, so the count reads as a measurement and the
 * word beside it reads as the thing being chosen — the hierarchy the
 * `Select` this replaced could not draw, having one string for both.
 * `tabular-nums` keeps the digits on a fixed advance, so a count
 * moving from 9 to 10 as somebody types in the search box does not
 * shuffle the badges after it.
 */
const COUNT_BASE = 'font-mono text-[11px] tabular-nums';

/** What the figure is tinted while its badge is pressed. */
const PRESSED_COUNT = `${COUNT_BASE} text-accent`;

/** What the figure is tinted while its badge is not. */
const UNPRESSED_COUNT = `${COUNT_BASE} text-fg3`;

/**
 * One pressable value in a filter row.
 *
 * Structural, and deliberately narrower than any model that
 * satisfies it: `../pages/sources/badges.ts` answers
 * `SourceStatusBadge`, which carries the status itself as well, and
 * is assignable here unchanged. What this component may read is what
 * it can draw and act on, and nothing else — a badge type carrying
 * the union it came from would tie this file to one surface.
 */
export interface FilterBadge {
  /**
   * What the badge is called, and half of its accessible name.
   *
   * Also its React key, so a row must not offer the same label
   * twice — two identical badges would be two controls an operator
   * could not tell apart, which is a model fault rather than a
   * rendering one. `@ar/ui`'s `RowContextAction` keys its menu the
   * same way for the same reason.
   */
  readonly label: string;
  /**
   * How many rows pressing it would leave.
   *
   * The promise this control makes, and the caller's to measure —
   * over the rows the OTHER controls have already left, or the
   * figure is true of a list nobody is looking at. The model module
   * that builds these carries the reasoning.
   */
  readonly count: number;
  /** Whether the parameter this row filters has it pressed. */
  readonly pressed: boolean;
  /**
   * What pressing it writes to that parameter.
   *
   * Including the press that CLEARS the filter, which is a press of
   * the pressed badge — `aria-pressed` is a toggle, and this file
   * never has to know which of the two a given press is.
   */
  readonly pressValue: string;
}

/** What a surface hands its filter badge row. */
export interface FilterBadgeRowProps {
  /**
   * What the group of badges is called, for anything not looking at
   * it.
   *
   * Invisible, and it names the COLUMN rather than the values —
   * `Filter by status`, matching the `ariaLabel` the `Select`s
   * beside it take. It is what gives a bare count its subject when
   * a badge's own name is read out.
   */
  readonly ariaLabel: string;
  /**
   * The values this row offers, in the order it draws them.
   *
   * Whole, including the ones no row currently satisfies: a filter
   * row that dropped its empty badges could drop the PRESSED one as
   * the counts move, stranding the parameter in the URL with no
   * control left able to clear it.
   */
  readonly badges: readonly FilterBadge[];
  /**
   * Write a badge's press to whatever owns the parameter.
   *
   * Takes {@link FilterBadge.pressValue} verbatim. Bind it straight
   * to a `useSearchParamState` setter — this row reports a press and
   * derives nothing from it.
   */
  readonly onPress: (value: string) => void;
}

/**
 * A filter drawn as a row of pressable badges.
 *
 * Renders nothing at all for an empty list, on the reasoning
 * `./ListPage` gives about a toolbar with no controls in it: an
 * empty labelled group is a control strip that looks like it failed
 * to load, and a row with no values to offer has nothing to say.
 *
 * @param props - The group's name, its badges, and where a press
 * goes.
 * @returns The badges, or nothing.
 */
export const FilterBadgeRow = ({
  ariaLabel,
  badges,
  onPress,
}: FilterBadgeRowProps) => {
  if (badges.length === 0) {
    return null;
  }

  return (
    <div role="group" aria-label={ariaLabel} className={ROW_CLASSES}>
      {badges.map((badge) => (
        <FilterBadgeButton
          key={badge.label}
          badge={badge}
          onPress={onPress}
        />
      ))}
    </div>
  );
};

/** What one badge is given. */
interface FilterBadgeButtonProps {
  /** The value this badge offers. */
  readonly badge: FilterBadge;
  /** Where its press goes. */
  readonly onPress: (value: string) => void;
}

/**
 * One badge: the button, and the chip that decorates it.
 *
 * Split out of the row rather than written inline, because the two
 * treatments are chosen by a ternary apiece and the house style puts
 * every ternary on three lines — four of them inside the `map` would
 * bury the one thing the row does.
 *
 * `Touchable` supplies the button semantics, the focus ring and the
 * press transform, and takes `aria-pressed` through its
 * `ButtonHTMLAttributes` spread. `rounded="full"` is not decoration:
 * the ring follows the element's own radius, so a `md` default would
 * draw a rounded-rectangle focus ring around a pill.
 *
 * @param props - The badge and where its press goes.
 * @returns The pressable badge.
 */
const FilterBadgeButton = ({
  badge,
  onPress,
}: FilterBadgeButtonProps) => {
  const chipClasses = badge.pressed
    ? PRESSED_CHIP
    : UNPRESSED_CHIP;

  const countClasses = badge.pressed
    ? PRESSED_COUNT
    : UNPRESSED_COUNT;

  return (
    <Touchable
      inline
      rounded="full"
      aria-pressed={badge.pressed}
      className={BADGE_GROUP}
      onClick={() => {
        onPress(badge.pressValue);
      }}
    >
      <Chip className={chipClasses}>
        {badge.label}
        <span className={countClasses}>{badge.count}</span>
      </Chip>
    </Touchable>
  );
};
