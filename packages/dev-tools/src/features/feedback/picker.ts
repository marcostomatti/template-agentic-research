/**
 * @packageDocumentation
 * The element picker's decisions: what a picked element is called,
 * what a typed selector matches, and what sits above an element.
 *
 * Three exported functions. {@link describeElement} answers one
 * element's selector, tag, text excerpt and bounding box;
 * {@link matchesOf} answers what a selector matches right now; and
 * {@link climb} answers the element above one. `ElementPicker.tsx` — the
 * overlay that follows the pointer, the click that selects, the
 * Escape that cancels, the ArrowUp that climbs — draws what these
 * three answer and decides nothing of its own, which is this
 * package's two-runner rule.
 *
 * ## The widget is invisible to the picker
 *
 * Spec item 5: "The widget's own root is never pickable." Read here
 * as a property of the picker rather than as a check the overlay
 * remembers to make, so it holds through every entry point at once:
 *
 * - {@link describeElement} answers `null` for an element inside
 *   `[data-devtools-root]`, so a click that lands on the trigger, the
 *   menu or the drawer selects nothing.
 * - {@link matchesOf} drops widget elements from what it answers, so
 *   a typed `div` counts and outlines the app's divs and none of the
 *   widget's. A selector that matches ONLY widget elements therefore
 *   answers an empty list — "matches nothing", which is the refusal
 *   `./submitRules.ts` is to answer a reason string for.
 * - {@link climb} refuses a parent that is not pickable, so a climb
 *   cannot walk out of the app and into the reporter.
 *
 * {@link isPickable} is the single predicate all three ask, and
 * `DEVTOOLS_ROOT_ATTRIBUTE` is imported from `../../core/mount`
 * rather than respelt: an attribute name written twice is an
 * attribute name that drifts once, and the drift would be silent —
 * the picker would happily describe the widget's own drawer.
 *
 * `<html>` is refused by the same predicate, for a different reason.
 * The finder answers the bare tag `html` for the document element,
 * which describes the page rather than a place in it, and refusing it
 * is also what gives {@link climb} a ceiling: a climb from `<body>`
 * answers `null` instead of stepping onto a selector no reader can
 * act on.
 *
 * ## The preference order is ours, not the finder's penalty table
 *
 * Spec decision 5 asks for `data-testid`, then `id`, then `role`,
 * then `aria-label`. `@medv/finder` cannot be configured into that
 * order: its penalties are fixed in the library (an id scores 0, a
 * class 1, an attribute 2, a tag 5), so under the finder alone an
 * `id` would always beat a `data-testid` and both would always beat
 * `role`. The `Options` object exposes the PREDICATES and not the
 * penalties.
 *
 * So {@link PREFERRED_KEYS} is walked first, in the spec's order, and
 * the first candidate that uniquely identifies the element is the
 * answer. "Uniquely" is measured, not assumed: each candidate is run
 * through {@link matchesOf} and accepted only when it matches exactly
 * the element it was built from. That is what makes an
 * `[data-testid="row"]` shared by twelve rows fall through to the
 * next key rather than become a selector pointing at eleven strangers
 * — and it is also why a value this module quoted badly costs a
 * fall-through rather than a throw.
 *
 * The finder runs only when all four keys fall through, and its
 * answer goes through {@link isUniqueMatchFor} too. That is not
 * belt-and-braces over a library that already checked: `unique()`
 * inside the finder COUNTS the matches of a candidate path and never
 * asks whether the one match is the element it was called for. For
 * an element the root cannot reach, the two questions have different
 * answers.
 *
 * Measured, and the reason the check is here rather than argued
 * about: a detached `<li data-testid="app-row">` described while the
 * document holds another `<li data-testid="app-row">` came back as
 * `[data-testid="app-row"]` — a selector naming the stranger. With
 * the check, the same call answers `null`. `picker.test.ts` keeps
 * that exact shape as a refusal case.
 *
 * ## What a class name has to be to survive
 *
 * {@link isUsableClassName} is two refusals ANDed, and both are
 * deliberate configuration rather than the library's defaults, which
 * this module replaces wholesale:
 *
 * - **`@medv/finder`'s own `className`** — exported by the package as
 *   a standalone predicate, and composed here rather than
 *   reimplemented. It is a word-likeness test: letters and hyphens
 *   only, at least three characters, every hyphen- or capital-
 *   separated segment longer than two, and no run of four consonants.
 *   That is what refuses the HASHED names, and it refuses every shape
 *   a real bundler emits: a CSS-modules `Button_root__1a2b3` (the
 *   underscores and the digits), an emotion `css-1q2w3e` (the
 *   digits), a styled-components `sc-bdVaJa` (the two-character
 *   segments), a Svelte `svelte-1x2y3z`. A digit anywhere is enough
 *   on its own.
 * - **{@link isTailwindUtility}** — the name's first hyphen-separated
 *   segment against {@link TAILWIND_UTILITY_ROOTS}. Tailwind is what
 *   `@ar/web` and `@ar/ui` are built out of, so without this a picked
 *   button would be called `.items-center` and the selector would rot
 *   the next time someone centred something differently.
 *
 * The root set holds only roots that can produce a name the
 * word-likeness test lets through, which is why it names `text` and
 * `overflow` but not `bg`, `px` or `mt`: `bg-white` and `mt-4` are
 * already refused, the first for its two-character segment and the
 * second for its digit. Adding them would be adding lines no input
 * can reach.
 *
 * It is a curated set and not a Tailwind parser, and the two mistakes
 * it can make do not cost the same. A utility it fails to name — a
 * v4 addition, a project's own plugin — survives into a selector one
 * class less stable than it should be. A semantic class it wrongly
 * refuses — `.content-body`, `.table-wrapper` — costs a selector one
 * class LONGER, because the finder falls back to the tag and the
 * position, which still point at the element. So the set errs toward
 * refusing, and a name it does not cover is worth adding rather than
 * worth arguing about.
 *
 * ## Nothing here throws, and nothing here mutates
 *
 * Every refusal is a value: `null` from {@link describeElement} and
 * {@link climb}, `{valid: false}` from {@link matchesOf}. The two
 * places a browser can raise — `querySelectorAll` on a selector it
 * cannot parse, and the finder on an element it cannot reach from
 * `document.body` — are caught at the line that provokes them. A
 * picker that threw would take the drawer down at the moment someone
 * was describing a bug.
 *
 * The answers are frozen and built fresh per call. A description is a
 * reading of a moving document — the box moves on scroll, the text
 * changes on render — so a caller collects at the moment it needs
 * one rather than holding an old one, exactly as `./context.ts` says
 * of the environment.
 *
 * ## It is a `.ts`, and it imports no React
 *
 * Two-runner discipline, as `./context.ts` and `./capture.ts` state
 * it: the decisions live where the vitest jsdom project collects
 * them, and the overlay that draws a rectangle decides nothing. The
 * DOM this module touches — `document.querySelectorAll`, `closest`,
 * `getBoundingClientRect` — is what the jsdom project is for, and
 * `picker.test.ts` builds real elements rather than stubbing any of
 * it.
 *
 * ## Mutation note — what the colocated cases actually catch
 *
 * A green suite is not evidence a case can fail. Each leg below was
 * measured by breaking this file, reds `bun x vitest run
 * src/features/feedback/picker.test.ts` from `packages/dev-tools`
 * against the 36 cases the file holds, and restores this file
 * byte-identical (the harness compared a SHA-256 of the restored
 * text to the original's, every leg):
 *
 * - Dropping the widget-root refusal from {@link isPickable} answers
 *   `Tests  5 failed | 31 passed (36)`, the widest leg here and the
 *   reason the rule is ONE predicate: two match cases, two describe
 *   cases and one climb case all red off the same line.
 * - Dropping the `<html>` refusal from the same function answers `2
 *   failed | 34 passed`: `refuses to describe the document element`
 *   and `refuses to climb above the body`, which is the ceiling that
 *   refusal exists to give.
 * - Dropping the `isPickable` filter from {@link matchesOf} answers
 *   `2 failed | 34 passed`: the two cases that put a widget element
 *   and an app element of the same shape in one document.
 * - Dropping the try/catch in {@link queryAll} answers `2 failed | 34
 *   passed`: the malformed selector and the empty one. Both red as
 *   jsdom's `SyntaxError` escaping {@link matchesOf} rather than as a
 *   wrong value.
 * - Skipping the preferred chain, leaving the finder alone, answers
 *   `4 failed | 32 passed`: the `data-testid` preference, the
 *   `aria-label`-only element, the quoted value, and the
 *   over-long-attribute case, whose control half expects the short
 *   label to be used.
 * - Reordering {@link PREFERRED_KEYS} answers `1 failed | 35 passed`
 *   three times over, one case per swap: `id` ahead of `data-testid`
 *   reds `prefers data-testid over the id, the role and the label`,
 *   `role` ahead of `id` reds `prefers the id when there is no
 *   data-testid`, and `aria-label` ahead of `role` reds `prefers the
 *   role when there is neither a testid nor an id`. The first of the
 *   three is the leg that caught a hole in the cases rather than in
 *   this file: with that case's id written `report-id`, the swap left
 *   all cases green, because `report-id` fails the word-likeness test
 *   on its two-character second segment and was never a candidate at
 *   all. The case carries `report-section` now.
 * - Dropping {@link isUniqueMatchFor} from {@link preferredSelector}
 *   answers `3 failed | 33 passed`; dropping only its identity half
 *   and keeping the count answers `1 failed | 35 passed`; and handing
 *   back what {@link buildFinderSelector} built without validating it
 *   answers `1 failed | 35 passed`. All three name `refuses a
 *   preferred attribute that names a different element`, the case the
 *   finder's counting-only `unique()` is the reason for.
 * - Handing back an attribute value unquoted answers `1 failed | 35
 *   passed`: `quotes an attribute value carrying a quotation mark`.
 * - Dropping {@link isTailwindUtility} from
 *   {@link isUsableClassName} answers `2 failed | 34 passed`, and
 *   dropping the word-likeness half instead answers `1 failed | 35
 *   passed`, `leaves hashed class names out of the selector it
 *   builds`. The two halves red different cases, which is what says
 *   the composition is load-bearing in both directions rather than
 *   one check wearing a belt.
 * - Dropping the word-likeness test on the id in {@link candidateFor}
 *   answers `1 failed | 35 passed`, and so does dropping its length
 *   cap. Widening {@link isUsableAttribute} to every name but `id`
 *   answers `1 failed | 35 passed`: `names no attribute outside the
 *   four it prefers`.
 * - Rethrowing out of {@link buildFinderSelector}'s `catch` answers
 *   `1 failed | 35 passed`: `refuses to describe an element no
 *   selector can reach`.
 * - Dropping the whitespace collapse from {@link excerptOf} answers
 *   `1 failed | 35 passed`, and dropping its cap answers the same.
 *   So does dropping the rounding in {@link rectOf}, so does dropping
 *   the `Object.freeze` around a description, and so does answering
 *   `element.tagName` without lower-casing it.
 * - Answering `element.parentElement` from {@link climb} with neither
 *   guard answers `2 failed | 34 passed`: the climb above the body
 *   and the climb out of the widget.
 *
 * `bun x tsc --noEmit` exits `0` under ALL TWENTY-FOUR, measured one
 * by one: every leg is a behaviour change over types that still line
 * up, so `check-types` would never report one and the suite is the
 * only gate that does.
 */

import {
  className as isFinderWordLikeClass,
  finder,
  idName as isFinderWordLikeId,
} from '@medv/finder';

import { DEVTOOLS_ROOT_ATTRIBUTE } from '../../core/mount';

import { FEEDBACK_CONTEXT_ELLIPSIS } from './context';

/**
 * Where a described element was, in CSS pixels, at the moment it was
 * described.
 *
 * Viewport-relative and rounded, like `./context.ts`'s viewport and
 * for the same reason: a report that said `123.45678` would invite a
 * reader to reproduce a position that does not exist. The overlay
 * that outlines a match draws from its own live
 * `getBoundingClientRect` and never from this, so the rounding costs
 * the drawing nothing.
 */
export interface FeedbackElementRect {
  /** Distance from the viewport's left edge. */
  readonly x: number;

  /** Distance from the viewport's top edge. */
  readonly y: number;

  /** The box's width. */
  readonly width: number;

  /** The box's height. */
  readonly height: number;
}

/** What the picker says about one element. */
export interface FeedbackElementDescription {
  /** A selector that matched exactly this element when it was built. */
  readonly selector: string;

  /** The tag name, lower case. */
  readonly tag: string;

  /** The element's visible text, collapsed and capped; `''` if none. */
  readonly text: string;

  /** Where it was when it was described. */
  readonly rect: FeedbackElementRect;
}

/** What a selector matched, and whether it could be read at all. */
export interface FeedbackSelectorMatches {
  /** `false` only when the browser refused to parse the selector. */
  readonly valid: boolean;

  /** The pickable elements it matched, in document order. */
  readonly elements: readonly Element[];
}

/**
 * How much of an element's text survives into its description.
 *
 * A picked section can hold a page of prose, and the excerpt exists
 * to let a reader recognise the element rather than to reproduce it.
 * Capped text ends with `FEEDBACK_CONTEXT_ELLIPSIS` — the spelling
 * `./context.ts` already truncates with, imported rather than
 * respelt so one report never shows two different truncation marks.
 */
export const FEEDBACK_ELEMENT_TEXT_LIMIT = 120;

/**
 * The attributes a selector may be built from, in the order spec
 * decision 5 asks for them.
 *
 * `id` sits second and is not an attribute selector: it becomes
 * `#name`, which is what a reader expects and what every other tool
 * writes. It is in this list all the same, because the list is where
 * the ORDER is stated and stating it twice is how an order drifts.
 */
const PREFERRED_KEYS: readonly string[] = [
  'data-testid',
  'id',
  'role',
  'aria-label',
];

/**
 * How long an attribute value may be and still name an element.
 *
 * The finder's own default applies the same bound to the values it
 * accepts. A longer one is almost always prose — an `aria-label`
 * carrying a whole sentence — and a selector nobody can read is a
 * selector nobody can check.
 *
 * Exported so `picker.test.ts` can sit a case exactly on the bound
 * rather than on a number that stops being the bound.
 */
export const FEEDBACK_ATTRIBUTE_VALUE_LIMIT = 100;

/**
 * The first hyphen-separated segment of every Tailwind utility this
 * module refuses.
 *
 * Only roots that can survive the word-likeness test are listed; see
 * this module's documentation for why `bg` and `px` are absent and
 * why the set errs toward refusing. Alphabetical so a name can be
 * looked up by eye before it is added twice.
 */
const TAILWIND_UTILITY_ROOTS: ReadonlySet<string> = new Set([
  'absolute', 'accent', 'align', 'animate', 'antialiased', 'appearance',
  'aspect', 'backdrop', 'basis', 'block', 'blur', 'border', 'box', 'break',
  'capitalize', 'caption', 'caret', 'clear', 'col', 'collapse', 'columns',
  'container', 'content', 'contents', 'cursor', 'decoration', 'divide',
  'drop', 'ease', 'fill', 'filter', 'fixed', 'flex', 'float', 'flow', 'font',
  'from', 'grayscale', 'grid', 'group', 'grow', 'hidden', 'inline', 'inset',
  'invert', 'invisible', 'isolate', 'isolation', 'italic', 'items',
  'justify', 'leading', 'line', 'list', 'lowercase', 'mix', 'normal', 'not',
  'object', 'order', 'origin', 'outline', 'overflow', 'overline', 'peer',
  'place', 'placeholder', 'pointer', 'relative', 'resize', 'ring', 'rounded',
  'row', 'scroll', 'select', 'self', 'sepia', 'shadow', 'shrink', 'snap',
  'static', 'sticky', 'stroke', 'subpixel', 'table', 'text', 'touch',
  'tracking', 'transform', 'transition', 'truncate', 'underline',
  'uppercase', 'via', 'visible', 'whitespace', 'will',
]);

/** What {@link matchesOf} answers when nothing matched. */
const NO_ELEMENTS: readonly Element[] = Object.freeze([]);

/**
 * What {@link matchesOf} answers for a selector the browser refused.
 *
 * Shared rather than rebuilt: it is frozen, it carries nothing that
 * varies, and a caller comparing identities is not a case this
 * module supports.
 */
const REFUSED_MATCHES: FeedbackSelectorMatches = Object.freeze({
  valid: false,
  elements: NO_ELEMENTS,
});

/**
 * Whether the picker may describe, count or climb to an element.
 *
 * Exported because the overlay needs the same answer BEFORE a click:
 * a pointer crossing the widget must not draw a highlight over it,
 * and a `ElementPicker.tsx` that re-derived the rule would be a second
 * place for it to be wrong. See this module's documentation for why
 * `<html>` is refused alongside the widget's own root.
 *
 * @param element - Any element in the document.
 * @returns `true` when it is the app's to point at.
 */
export function isPickable(element: Element): boolean {
  if (element === element.ownerDocument.documentElement) {
    return false;
  }

  return element.closest(`[${DEVTOOLS_ROOT_ATTRIBUTE}]`) === null;
}

/**
 * Run a selector, or answer that it could not be run.
 *
 * @param selector - Whatever was typed, picked or climbed to.
 * @returns The matched elements, or `null` when the browser refused
 * to parse the selector at all.
 */
function queryAll(selector: string): Element[] | null {
  try {
    return [...document.querySelectorAll(selector)];
  } catch {
    // An unbalanced bracket, a stray colon, the empty string. Every
    // one of them is a person mid-edit, not a failure.
    return null;
  }
}

/**
 * What a selector matches right now.
 *
 * The drawer reads the count beside the selector field, the overlay
 * outlines each element, and `./submitRules.ts` refuses a selector
 * that matches nothing. All three ask this, so all three agree about
 * what the widget's own elements are worth: nothing.
 *
 * @param selector - Whatever was typed, picked or climbed to.
 * @returns `{valid: false}` for a selector the browser refuses to
 * parse, otherwise the pickable elements it matched — an empty list
 * being a perfectly valid selector that points at nothing.
 */
export function matchesOf(selector: string): FeedbackSelectorMatches {
  const found = queryAll(selector);

  if (found === null) {
    return REFUSED_MATCHES;
  }

  return Object.freeze({
    valid: true,
    elements: Object.freeze(found.filter(isPickable)),
  });
}

/**
 * Whether a candidate selector names exactly one element, and that
 * one.
 *
 * @param candidate - The selector being considered.
 * @param element - The element it was built from.
 * @returns `true` when it is safe to answer.
 */
function isUniqueMatchFor(candidate: string, element: Element): boolean {
  const { elements } = matchesOf(candidate);

  return elements.length === 1 && elements[0] === element;
}

/**
 * Quote an attribute value for a CSS string.
 *
 * Only the two characters that can end the string early are escaped.
 * A value carrying something worse — a newline, which CSS strings
 * cannot hold at all — produces a selector the browser refuses, and
 * {@link isUniqueMatchFor} reads that refusal as "not unique" and
 * moves to the next key. The escape is therefore about readability
 * of the common case; correctness is the validation's job.
 *
 * @param value - What the element carries under the attribute.
 * @returns The value, safe to put between double quotes.
 */
function quoteAttributeValue(value: string): string {
  return value.replace(/["\\]/g, '\\$&');
}

/**
 * Build the candidate for one preferred key.
 *
 * @param element - The element being described.
 * @param key - One member of {@link PREFERRED_KEYS}.
 * @returns The selector to try, or `null` when the element carries
 * nothing usable under that key.
 */
function candidateFor(element: Element, key: string): string | null {
  const value = element.getAttribute(key);

  // The blank test is taken on the trimmed value and the selector is
  // built from the raw one: an attribute selector matches exactly, so
  // a candidate built from a trimmed value would not match the
  // element it was built from.
  if (
    value === null
    || value.trim() === ''
    || value.length > FEEDBACK_ATTRIBUTE_VALUE_LIMIT
  ) {
    return null;
  }

  if (key === 'id') {
    // A framework-generated id — React's `:r1:`, a build hash — is
    // unique today and different on the next render, so the same
    // word-likeness test the classes go through decides this too.
    return isFinderWordLikeId(value)
      ? `#${CSS.escape(value)}`
      : null;
  }

  return `[${key}="${quoteAttributeValue(value)}"]`;
}

/**
 * The first preferred key that names the element on its own.
 *
 * @param element - The element being described.
 * @returns That selector, or `null` when none of the four is both
 * present and unique.
 */
function preferredSelector(element: Element): string | null {
  for (const key of PREFERRED_KEYS) {
    const candidate = candidateFor(element, key);

    if (candidate !== null && isUniqueMatchFor(candidate, element)) {
      return candidate;
    }
  }

  return null;
}

/**
 * Whether a class name is stable enough to appear in a selector.
 *
 * @param name - One member of the element's class list.
 * @returns `true` for a name that is neither hashed nor a Tailwind
 * utility. See this module's documentation for which half refuses
 * what.
 */
function isUsableClassName(name: string): boolean {
  return isFinderWordLikeClass(name) && !isTailwindUtility(name);
}

/**
 * Whether a class name reads as a Tailwind utility.
 *
 * @param name - One member of the element's class list.
 * @returns `true` when its first hyphen-separated segment is a known
 * utility root.
 */
function isTailwindUtility(name: string): boolean {
  const [root = name] = name.split('-');

  return TAILWIND_UTILITY_ROOTS.has(root);
}

/**
 * Whether an attribute may appear in a finder-built selector.
 *
 * Narrower than the library's default, which also accepts `name`,
 * `rel`, `href` and every word-like `data-*`. A selector built on an
 * `href` breaks when a route moves and one built on a `name` breaks
 * when a form is renamed, so the vocabulary here is spec decision 5's
 * and nothing else. `id` is excluded because the finder reaches it
 * through its own `idName` predicate and writes `#name`; letting it
 * through here would only add a redundant `[id="name"]` candidate.
 *
 * @param name - The attribute's name.
 * @param value - The attribute's value.
 * @returns `true` when the pair may name an element.
 */
function isUsableAttribute(name: string, value: string): boolean {
  if (name === 'id' || !PREFERRED_KEYS.includes(name)) {
    return false;
  }

  return value.trim() !== ''
    && value.length <= FEEDBACK_ATTRIBUTE_VALUE_LIMIT;
}

/**
 * Ask `@medv/finder` for a selector, and take its word for nothing.
 *
 * The three predicates passed are this module's; the tag predicate
 * and everything else — the timeout, the seed length, the
 * optimisation bound — is the library's default, because nothing
 * measured here has asked for another value.
 *
 * @param element - The element being described.
 * @returns What the library built, or `null` where it threw.
 */
function buildFinderSelector(element: Element): string | null {
  try {
    return finder(element, {
      root: document.body,
      idName: isFinderWordLikeId,
      className: isUsableClassName,
      attr: isUsableAttribute,
    });
  } catch {
    // The library throws for an element it cannot reach from the
    // root, and for a search that timed out with no fallback path.
    return null;
  }
}

/**
 * The selector for an element no preferred attribute could name.
 *
 * The answer is validated before it is handed back, for the reason
 * this module's documentation records: the library's own uniqueness
 * test counts matches and does not compare identities.
 *
 * @param element - The element being described.
 * @returns The selector, or `null` when the finder could not build
 * one — a detached element, an element in another document, a search
 * that ran out of time without a fallback — or built one that names
 * something else.
 */
function finderSelector(element: Element): string | null {
  const built = buildFinderSelector(element);

  if (built === null || !isUniqueMatchFor(built, element)) {
    return null;
  }

  return built;
}

/**
 * The element's visible text, collapsed onto one line and capped.
 *
 * @param element - The element being described.
 * @returns The excerpt, or `''` for an element with no text.
 */
function excerptOf(element: Element): string {
  const text = (element.textContent ?? '').replace(/\s+/g, ' ').trim();

  if (text.length <= FEEDBACK_ELEMENT_TEXT_LIMIT) {
    return text;
  }

  const kept = text.slice(0, FEEDBACK_ELEMENT_TEXT_LIMIT);

  return `${kept}${FEEDBACK_CONTEXT_ELLIPSIS}`;
}

/**
 * Where the element is, rounded to whole pixels.
 *
 * @param element - The element being described.
 * @returns Its viewport-relative box.
 */
function rectOf(element: Element): FeedbackElementRect {
  const box = element.getBoundingClientRect();

  return Object.freeze({
    x: Math.round(box.x),
    y: Math.round(box.y),
    width: Math.round(box.width),
    height: Math.round(box.height),
  });
}

/**
 * Describe one element well enough to find it again.
 *
 * Answers `null` rather than throwing for everything it cannot
 * describe: an element inside the widget's own root, the document
 * element, and an element no selector can reach from `document.body`
 * — a detached node, or one built in another document.
 *
 * Reads the document and changes nothing in it.
 *
 * @param element - What the pointer was over, or what a climb
 * arrived at.
 * @returns The description, frozen, or `null`.
 */
export function describeElement(
  element: Element,
): FeedbackElementDescription | null {
  if (!isPickable(element)) {
    return null;
  }

  const selector = preferredSelector(element) ?? finderSelector(element);

  if (selector === null) {
    return null;
  }

  return Object.freeze({
    selector,
    tag: element.tagName.toLowerCase(),
    text: excerptOf(element),
    rect: rectOf(element),
  });
}

/**
 * Step one element outwards.
 *
 * What ArrowUp in the selector field does: the caller describes what
 * this answers and rewrites the field with the new selector.
 *
 * @param element - Where the climb is now.
 * @returns The parent, or `null` at the top of the app — an element
 * with no parent at all, `<body>`, whose parent is the document
 * element, and anything whose parent belongs to the widget.
 */
export function climb(element: Element): Element | null {
  const parent = element.parentElement;

  if (parent === null || !isPickable(parent)) {
    return null;
  }

  return parent;
}
