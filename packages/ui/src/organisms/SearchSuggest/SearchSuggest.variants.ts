import { cva, type VariantProps } from 'class-variance-authority';

/**
 * SearchSuggest — the topbar's ⌘K search box with an anchored suggestion
 * list. From the original TopbarLive screen SearchSuggest
 * (the original topbar screen "Search · suggest" card); app-shell spec: Top Bar.
 *
 * Five suggestion kinds, each with its own accent (original kindColor map):
 * agent→primary, session→accent, task→gold, tool→info, doc→green.
 */
export const searchSuggestBox = cva(
  [
    'flex items-center gap-2 rounded-md border px-3 py-1.5',
    'transition-colors',
  ],
  {
    variants: {
      open: {
        false: 'border-border-soft bg-surface-sunk',
        true: [
          'border-border-focus bg-surface-2',
          'shadow-[0_0_0_3px_color-mix(in_oklab,var(--border-focus)_22%,transparent)]',
        ],
      },
    },
    defaultVariants: { open: false },
  },
);

/** The anchored suggestion panel. */
export const searchSuggestPanel = cva([
  'absolute inset-x-0 top-[calc(100%+6px)] z-popover overflow-hidden',
  'rounded-lg border border-border-soft bg-surface-2 shadow-lg',
]);

/** A suggestion row; active mirrors the original hover/keyboard sink. */
export const searchSuggestRow = cva(
  [
    'flex w-full cursor-pointer items-center gap-3 px-3 py-[9px]',
    'border-none text-left text-fg1',
  ],
  {
    variants: {
      active: {
        false: 'bg-transparent',
        true: 'bg-surface-sunk',
      },
    },
    defaultVariants: { active: false },
  },
);

/** The 28px leading puck, tinted by the suggestion's kind. */
export const searchSuggestPuck = cva(
  'flex size-7 shrink-0 items-center justify-center rounded-sm',
  {
    variants: {
      kind: {
        agent: 'bg-[color-mix(in_oklab,var(--primary)_14%,transparent)] text-primary',
        session: 'bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-accent',
        task: 'bg-[color-mix(in_oklab,var(--gold-500)_14%,transparent)] text-gold-500',
        tool: 'bg-[color-mix(in_oklab,var(--info)_14%,transparent)] text-info',
        doc: 'bg-[color-mix(in_oklab,var(--green-500)_14%,transparent)] text-green-500',
      },
    },
    defaultVariants: { kind: 'agent' },
  },
);

/** The trailing kind pill — same accent as the puck, mono uppercase. */
export const searchSuggestKindPill = cva(
  [
    'rounded-full px-[7px] py-0.5 font-mono text-[10px] font-semibold',
    'uppercase tracking-[0.08em]',
  ],
  {
    variants: {
      kind: {
        agent: 'bg-[color-mix(in_oklab,var(--primary)_14%,transparent)] text-primary',
        session: 'bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-accent',
        task: 'bg-[color-mix(in_oklab,var(--gold-500)_14%,transparent)] text-gold-500',
        tool: 'bg-[color-mix(in_oklab,var(--info)_14%,transparent)] text-info',
        doc: 'bg-[color-mix(in_oklab,var(--green-500)_14%,transparent)] text-green-500',
      },
    },
    defaultVariants: { kind: 'agent' },
  },
);

export type SearchSuggestKindVariants = VariantProps<typeof searchSuggestPuck>;
