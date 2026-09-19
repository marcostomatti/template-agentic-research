/**
 * @packageDocumentation
 * The floating tomato button: the widget's one always-visible affordance.
 *
 * It is a plain `<button>` — not a `role="button"` div and not a
 * headless-library primitive — so Enter and Space open the menu, the
 * focus ring is the platform's, and `./Menu.tsx` needs no key handler
 * of its own for the opening gesture. It renders `./tomato.svg.tsx`
 * and nothing else; the mark is `aria-hidden`, so the accessible name
 * is this button's own {@link DevToolsTriggerProps.label}.
 *
 * ## The props
 *
 * - `corner` — which of the four corners the button is fixed to. Read
 *   ONLY as `data-corner`; `../styles.css` owns the four `top`/`right`/
 *   `bottom`/`left` pairs, so no inset is computed here.
 * - `size` — `sm | md | lg`, read only as `data-size`. The stylesheet
 *   resolves it to `--devtools-size-sm|md|lg`, so the three lengths
 *   live in the token layer and this module holds no pixel value.
 * - `open` — whether the menu is open. Written to `aria-expanded`, and
 *   the same attribute is what `../styles.css` selects on to keep the
 *   ring up while the menu is open.
 * - `label` — the accessible name, defaulted, and also the mark's
 *   `<title>` so the two can never disagree.
 * - `onToggle` — the click handler. Named for the intent rather than
 *   `onClick`, because the shell toggles a slot with it.
 * - `ref` — forwarded to the `<button>`, because `@floating-ui/dom`
 *   positions the menu and the About popover against this element and
 *   needs the node, not a selector.
 *
 * ## Why `corner` is a prop and not state
 *
 * The shell owns it. `./Shell.tsx` holds the corner slot, seeds it from
 * `DevToolsConfig.corner` on every load (it is deliberately NOT
 * persisted — see `Corner` in `./types.ts`) and moves it when the menu's
 * Position submenu is used. That submenu is drawn by `./Menu.tsx`, a
 * sibling of this component: state held here would be invisible to it,
 * and the two would need a callback upward plus a copy downward to stay
 * in step — two sources for one value. So this component is a pure
 * function of its props: it holds no `useState`, runs no effect, reads
 * no storage and imports nothing but a React type and the mark.
 *
 * `size` is a prop for the same reason, with one extra: it IS persisted,
 * through `./settings.ts`, and the writer of that key is the shell too.
 *
 * ## The round ring
 *
 * Spec item 2 asks for a round focus ring on `:focus-visible` and while
 * the menu is open. Both rings are `../styles.css`'s: `border-radius:
 * 100%` sits on `.devtools-trigger` itself so the scope-wide
 * `:focus-visible` outline follows the border box, and
 * `.devtools-trigger[aria-expanded='true']` restates the same outline
 * for the open state. Nothing about the ring is decided in JS — this
 * module only has to keep the class and the `aria-expanded` attribute
 * on the element, which is why neither is conditional below.
 *
 * ## Measured
 *
 * A `react-dom/server` probe kept in `/tmp` (this package's vitest
 * jsdom project collects `.ts` only, by the two-runner rule the
 * `vitest.config.ts` comment states) rendered this component open and
 * shut. Nine readings off that markup: `aria-haspopup="menu"` present,
 * `aria-expanded` `"true"` open and `"false"` shut, `data-corner` and
 * `data-size` echoing their props, `class="devtools-trigger"` present,
 * the default name `Dev tools` and a passed `label` both landing on
 * `aria-label`, and the `<svg>` carrying `aria-hidden="true"` so the
 * button's name is the only name. A tenth probe asserting a
 * `data-corner` that was NOT passed read false, so the nine are
 * readings the probe could have failed. Task 8 of the plan repeats this
 * shape for the shell and files the capture in the close-out notes.
 */

import type { Corner, Size } from './types';
import type { ReactElement, Ref } from 'react';

import { DevToolsTomato } from './tomato.svg';

/** The default accessible name, used when no `label` is passed. */
const DEFAULT_LABEL = 'Dev tools';

/** What {@link DevToolsTrigger} takes. */
export interface DevToolsTriggerProps {
  /**
   * Which corner the button is fixed to.
   *
   * A prop rather than state: the shell owns it. See the module
   * comment.
   */
  readonly corner: Corner;

  /**
   * How large the button is drawn.
   *
   * Resolved to a length by `../styles.css`, never here.
   */
  readonly size: Size;

  /**
   * Whether the menu is open.
   *
   * Rendered as `aria-expanded` and selected on by the open-state ring.
   */
  readonly open: boolean;

  /**
   * The accessible name, and the mark's `<title>`.
   *
   * @defaultValue `'Dev tools'`
   */
  readonly label?: string;

  /** Called on click, and so on Enter and Space through the platform. */
  readonly onToggle: () => void;

  /**
   * Forwarded to the `<button>`.
   *
   * The shell passes one so `@floating-ui/dom` can position against
   * this element.
   */
  readonly ref?: Ref<HTMLButtonElement>;
}

/**
 * The floating tomato button.
 *
 * Pure: props in, one element out. See the module comment for why
 * `corner` and `size` arrive as props.
 *
 * @param props - {@link DevToolsTriggerProps}.
 * @returns One fixed, top-layer `<button>` drawing the tomato.
 */
export function DevToolsTrigger({
  corner,
  size,
  open,
  label = DEFAULT_LABEL,
  onToggle,
  ref,
}: DevToolsTriggerProps): ReactElement {
  return (
    <button
      ref={ref}
      type="button"
      className="devtools-trigger"
      data-corner={corner}
      data-size={size}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label={label}
      onClick={onToggle}
    >
      <DevToolsTomato title={label} />
    </button>
  );
}
