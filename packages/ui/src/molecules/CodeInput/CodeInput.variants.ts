import { cva, type VariantProps } from 'class-variance-authority';

/**
 * CodeInput — one cell per digit, auto-advance, backspace-to-previous
 * (auth + settings 2FA). Filled cells carry the accent border.
 */
export const codeInputCell = cva(
  [
    'h-14 w-11 rounded-md border bg-surface-1 text-center',
    'font-mono text-[22px] font-semibold text-fg1',
    'outline-none transition-colors',
  ],
  {
    variants: {
      filled: {
        false: 'border-border-soft',
        true: 'border-accent',
      },
    },
    defaultVariants: { filled: false },
  },
);

export type CodeInputCellVariants = VariantProps<typeof codeInputCell>;
