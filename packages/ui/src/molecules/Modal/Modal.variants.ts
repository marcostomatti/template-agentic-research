import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Modal — Overlay + a centered card: radius-xl frame, width by size,
 * header/body/footer rows. Decoration only; behavior is all Overlay's.

 */
export const modalPanel = cva(
  [
    'flex max-h-[calc(100vh-96px)] flex-col overflow-hidden',
    'bg-surface-1 border border-border-soft rounded-xl shadow-lg',
  ],
  {
    variants: {
      size: {
        sm: 'w-[min(380px,calc(100vw-48px))]',
        md: 'w-[min(480px,calc(100vw-48px))]',
        lg: 'w-[min(620px,calc(100vw-48px))]',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

export type ModalPanelVariants = VariantProps<typeof modalPanel>;
