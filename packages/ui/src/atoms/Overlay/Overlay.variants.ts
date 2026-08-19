import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Overlay — the behavioral wrapper behind every dismissable surface: portal,
 * backdrop, focus trap, Escape/backdrop dismissal, scroll lock. Zero panel
 * chrome — Modal and Drawer are this primitive plus decoration, the way
 * Button is Touchable plus a fill.
 *
 * The center positioner adds 24px padding (`p-6`) so the panel never
 * touches the viewport edge; dismiss/trapFocus/lockScroll are behavior
 * props, not classes. Enter/exit transitions are deferred with the rest
 * of the motion pass.
 */
export const overlay = cva('fixed inset-0 z-overlay flex', {
  variants: {
    position: {
      center: 'items-center justify-center p-6',
      right: 'items-stretch justify-end',
      left: 'items-stretch justify-start',
      bottom: 'items-end justify-center',
    },
    backdrop: {
      dim: 'bg-char-900/55',
      blur: 'bg-char-900/40 backdrop-blur-md',
      none: 'bg-transparent',
    },
  },
  defaultVariants: {
    position: 'center',
    backdrop: 'dim',
  },
});

export type OverlayVariants = VariantProps<typeof overlay>;
export type OverlayDismiss = 'both' | 'escape' | 'backdrop' | 'manual';
