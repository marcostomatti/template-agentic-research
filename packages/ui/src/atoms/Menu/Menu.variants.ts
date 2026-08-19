import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Menu / Popover — Overlay's anchored, scrim-less cousin: a portal positioned
 * to its trigger, dismissed by outside click or Escape, arrow-key navigation.
 * No backdrop, no scroll-lock.
 *
 * No `fixed` on the content — Radix's popper wrapper owns positioning,
 * and a fixed Content inside it would detach from the anchor. `z-popover`
 * stays on the content (the wrapper carries no z-index of its own).
 */
export const menu = cva(
  [
    'z-popover flex flex-col gap-px p-1.5 rounded-md',
    'bg-surface-1 border border-border-soft shadow-lg overflow-y-auto',
  ],
  {
    variants: {
      align: {
        start: 'origin-top-left',
        end: 'origin-top-right',
      },
      size: {
        sm: 'w-44',
        md: 'w-56',
        lg: 'w-72',
      },
    },
    defaultVariants: {
      align: 'start',
      size: 'md',
    },
  },
);

/** Item chrome (incl. hover/focus treatment). */
export const menuItem = cva(
  [
    'flex w-full items-center gap-[9px] px-2.5 py-2 text-left',
    'rounded-sm text-[13.5px] font-medium cursor-pointer select-none',
    'outline-none data-[highlighted]:bg-surface-sunk',
    'data-[disabled]:opacity-50 data-[disabled]:pointer-events-none',
  ],
  {
    variants: {
      tone: {
        default: 'text-fg1 [&_svg]:text-fg3',
        danger: 'text-danger [&_svg]:text-danger',
        // The "See all… / New workspace" style affirmative rows in the
        // topbar menus.
        accent: 'text-accent [&_svg]:text-accent',
      },
    },
    defaultVariants: { tone: 'default' },
  },
);

export type MenuVariants = VariantProps<typeof menu>;
export type MenuItemVariants = VariantProps<typeof menuItem>;
