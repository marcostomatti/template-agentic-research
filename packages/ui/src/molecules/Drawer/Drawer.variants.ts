import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Drawer — Overlay + an edge-anchored, full-height panel with a flat outer
 * edge (rounded only toward the page). Same behavior as Modal, different
 * decoration.

 */
export const drawerPanel = cva(
  'flex h-dvh flex-col overflow-hidden bg-surface-1 shadow-lg',
  {
    variants: {
      side: {
        right: 'border-l border-border-soft rounded-l-xl',
        left: 'border-r border-border-soft rounded-r-xl',
      },
      size: {
        sm: 'w-[min(300px,calc(100vw-56px))]',
        md: 'w-[min(400px,calc(100vw-56px))]',
        lg: 'w-[min(520px,calc(100vw-56px))]',
      },
    },
    defaultVariants: { side: 'right', size: 'md' },
  },
);

export type DrawerPanelVariants = VariantProps<typeof drawerPanel>;
