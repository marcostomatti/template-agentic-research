import { cva, type VariantProps } from 'class-variance-authority';

/**
 * WorkspaceSwitcher — the topbar's workspace pill + recent-workspaces menu.
 * From the original TopbarLive screen WorkspaceSwitcher
 * (the original topbar screen "Workspace switcher" card); app-shell spec: Top Bar.
 * The trigger is fixed/max width (truncating), and the component carries
 * no topbar-scope dependency — it may later live in the sidebar.
 */
export const workspaceSwitcherTrigger = cva([
  'flex max-w-[240px] cursor-pointer items-center gap-2.5',
  'rounded-md border border-border-soft bg-surface-sunk px-2.5 py-1.5',
  'font-body text-[13px] text-fg1 transition-colors hover:bg-surface-2',
]);

/** A recent-workspace row (the menu's top section). */
export const workspaceRow = cva(
  [
    'flex w-full cursor-pointer select-none items-center gap-2.5',
    'rounded-md px-2.5 py-2 text-left outline-none',
    'data-[highlighted]:bg-surface-sunk',
  ],
  {
    variants: {
      active: {
        false: '',
        true: 'bg-surface-sunk',
      },
    },
    defaultVariants: { active: false },
  },
);

export type WorkspaceRowVariants = VariantProps<typeof workspaceRow>;
