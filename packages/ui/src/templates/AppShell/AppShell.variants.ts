import { cva, type VariantProps } from 'class-variance-authority';

/**
 * AppShell — the capstone (the original appshell demo). It invents almost no new behavior:
 * the 3-zone frame is pure layout (a flex row wrapping a flex column), the
 * nav is a column of NavItems, the topbar menus are the Menu primitive, and
 * collapse is ONE piece of controlled parent state threaded down.
 *
 * Widths come from the theme definition's --sidebar-w /
 * --sidebar-w-collapsed (264 ⇄ 64). Reconciliation: the chapter's usage
 * block sketches `Shell direction="row"` / `Shell.Scroll`, an API the Shell
 * atom (the original primitives demo) never had — the rendered demo is plain
 * aside/main/header flex zones, which is what ships here.
 */

/** The frame: sidebar | main, filling whatever box the parent gives it. */
export const appShell = cva('flex h-full w-full overflow-hidden bg-bg');

/** The rail — collapse animates width; content is clipped, never squashed. */
export const appShellSidebar = cva(
  [
    'flex shrink-0 flex-col overflow-hidden',
    'bg-surface-1 border-r border-border-soft',
    'transition-[width] ease-out',
  ],
  {
    variants: {
      collapsed: {
        false: 'w-[var(--sidebar-w)]',
        true: 'w-[var(--sidebar-w-collapsed)]',
      },
    },
    defaultVariants: { collapsed: false },
  },
);

/** The main column next to the rail: topbar | scrolling content. */
export const appShellMain = cva(
  'flex min-w-0 flex-1 flex-col overflow-hidden',
);

/** The 60px sticky band — translucent bg over a backdrop blur. */
export const appShellTopbar = cva([
  'flex h-[60px] shrink-0 items-center gap-3.5 px-[18px]',
  'border-b border-border-soft',
  'bg-[color-mix(in_oklab,var(--bg)_80%,transparent)]',
  'backdrop-blur-[12px]',
]);

/** The content slot — the only scrolling element in the shell. */
export const appShellContent = cva(
  'flex-1 overflow-y-auto bg-bg px-[22px] pb-7 pt-5',
);

/**
 * The optional content footer (app-shell spec: Main Content) —
 * copyright + general links, riding at the bottom of the scroll flow.
 */
export const appShellFooter = cva([
  'mt-7 flex flex-wrap items-center gap-x-4 gap-y-1.5',
  'border-t border-border-soft pt-4',
  'text-xs text-fg3 [&_a]:text-fg3 [&_a:hover]:text-fg1',
]);

/**
 * The sidebar's week-summary card (app-shell spec: Side Bar) — a
 * stub for now: status pill + tokens-over-limit progress underneath.
 */
export const weekSummaryCard = cva([
  'flex flex-col gap-1.5 rounded-md border border-border-soft',
  'bg-surface-sunk px-3 py-2.5',
]);

/** A rail nav entry — active is a tone, collapse is a prop, not its state. */
export const navItem = cva(
  [
    'flex w-full items-center gap-[11px] rounded-md border-none',
    'text-left text-sm cursor-pointer',
    'transition-[background-color]',
  ],
  {
    variants: {
      active: {
        false: 'bg-transparent font-medium text-fg2 [&_svg]:text-fg2',
        true: 'bg-surface-sunk font-semibold text-fg1 [&_svg]:text-primary',
      },
      collapsed: {
        false: 'justify-start px-[11px] py-[9px]',
        true: 'justify-center p-[9px]',
      },
    },
    defaultVariants: { active: false, collapsed: false },
  },
);

export type AppShellSidebarVariants = VariantProps<typeof appShellSidebar>;
export type NavItemVariants = VariantProps<typeof navItem>;
