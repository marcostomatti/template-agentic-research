import { cva, type VariantProps } from 'class-variance-authority';

/**
 * EntityCard — one entity as a card, for the surfaces that list entities
 * as a grid rather than as a table (taxonomy buckets, personas,
 * connectors). Title, badge row, a body of the caller's choosing, and a
 * meta footer, plus the two control slots that have to stay reachable on
 * their own.
 *
 * ## Why the open gesture is a stretched overlay
 *
 * A card carrying a switch and a context menu cannot itself be a button:
 * that nests one interactive control inside another, which no assistive
 * technology can present and no browser makes reliably clickable. So the
 * TITLE is the button, and an `absolute inset-0` child stretches its hit
 * area over the whole card. The control cluster sits in a positioned
 * layer above that overlay, leaving both independently clickable and
 * independently focusable — and the card with exactly ONE focusable open
 * control rather than one per slot.
 *
 * Two consequences belong to the caller. The overlay covers the badge
 * row, the body and the meta footer, so text in them cannot be selected
 * and anything interactive placed there is unreachable: interaction goes
 * in `control` and `action`, which are the layer above. And the overlay
 * only reaches as far as the card, because `entityCard`'s `relative` is
 * the containing block it stretches against — that class is load-bearing
 * and not decoration.
 */
export const entityCard = cva(
  [
    'relative flex flex-col gap-3 rounded-lg border p-4',
    'border-border-soft bg-surface-1 transition-colors',
  ],
  {
    variants: {
      /**
       * Whether the card carries the open gesture. Derived from `onOpen`
       * inside the component rather than exposed as a prop of its own: a
       * hover affordance on a card nothing opens is a lie, and two ways
       * to say the same thing is one way to disagree with yourself.
       */
      openable: {
        false: '',
        true: 'hover:border-border-strong',
      },
    },
    defaultVariants: { openable: false },
  },
);

/** Title left, control cluster right; `items-start` so a wrapped title does not drag the controls down. */
export const entityCardHeader = cva('flex items-start justify-between gap-2');

/**
 * The heading itself. A card in a page's grid is a section of that page,
 * so the element is an `h2` — the two element defaults `tokens.css`
 * gives one are cancelled here, and family, weight and colour are left
 * to it.
 *
 * Deliberately NOT `truncate`: `overflow: hidden` on any ancestor of the
 * overlay would clip it back to the title's own box, which is the whole
 * mechanism gone. The clipping lives one level down, on the text.
 */
export const entityCardTitle = cva('m-0 min-w-0 flex-1 text-base');

/** Where the title's truncation lives — see `entityCardTitle` for why it is not on the heading. */
export const entityCardTitleText = cva('block truncate');

/**
 * The open button. No `overflow` of any kind, for the same reason the
 * heading has none; the focus ring sits on the title rather than on the
 * card because the title IS the control, and a ring around a hit area
 * whose bounds are invisible reads as a card that has gone selected.
 */
export const entityCardOpen = cva([
  'block w-full cursor-pointer rounded-sm text-left',
  'transition-colors hover:text-accent',
  'focus-visible:outline-none focus-visible:ring-2',
  'focus-visible:ring-leaf focus-visible:ring-offset-2',
]);

/**
 * The stretched hit area: a child of the button, so hovering anywhere on
 * the card hovers the button and the title takes its hover colour. The
 * radius matches the card's own so a future focus or hover treatment on
 * it lands square on the corners.
 */
export const entityCardOverlay = cva('absolute inset-0 rounded-lg');

/**
 * The control cluster. `relative` lifts it out of the static flow and
 * above the positioned overlay; `z-10` says so explicitly rather than
 * resting on the two being painted in document order, so moving the
 * overlay later cannot silently swallow the switch.
 */
export const entityCardControls = cva(
  'relative z-10 flex shrink-0 items-center gap-1',
);

/** The badge row under the header — `flex-wrap` because a card is narrow and tones are additive. */
export const entityCardBadges = cva('flex flex-wrap items-center gap-2');

/**
 * The meta footer. `mt-auto` pins it to the bottom edge whatever the
 * body runs to: cards in a grid row stretch to the tallest, and three
 * footers at three different heights read as three different kinds of
 * thing.
 */
export const entityCardMeta = cva([
  'mt-auto flex flex-wrap items-center gap-2 border-t border-border-soft',
  'pt-3 text-[12.5px] text-fg2',
]);

/**
 * EntityCardGrid — the track the entity grids are laid out on.
 *
 * It is a component rather than a class at each call site because a card
 * cannot own the track it is tiled on, and `Grid`'s `auto` columns are
 * `minmax(180px,1fr)` — narrower than any entity card wants. The two
 * minimums are the two the UI spec asks for: 300px for the taxonomy and
 * persona grids, 340px for the connector grid, both `auto-fill` so a
 * short list stays card-width instead of stretching to fill the row.
 */
export const entityCardGrid = cva('grid', {
  variants: {
    min: {
      md: 'grid-cols-[repeat(auto-fill,minmax(300px,1fr))]',
      lg: 'grid-cols-[repeat(auto-fill,minmax(340px,1fr))]',
    },
    gap: {
      sm: 'gap-3',
      md: 'gap-4',
      lg: 'gap-6',
    },
  },
  defaultVariants: { min: 'md', gap: 'md' },
});

export type EntityCardVariants = VariantProps<typeof entityCard>;
export type EntityCardGridVariants = VariantProps<typeof entityCardGrid>;
