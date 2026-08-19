import { cva, type VariantProps } from 'class-variance-authority';

/**
 * AuthShell — the pre-authentication shell: centred card on a softly
 * tinted backdrop, brand lockup on top, footer line below.
 * Card widths: 440 default, 500 workspace pick, 520 the 2FA flow.
 */
export const authShell = cva([
  'relative flex min-h-[660px] w-full flex-col items-center bg-bg px-6 py-10',
  'bg-[radial-gradient(circle_at_16%_8%,color-mix(in_oklab,var(--accent)_8%,transparent),transparent_30%),radial-gradient(circle_at_84%_92%,color-mix(in_oklab,var(--primary)_6%,transparent),transparent_32%)]',
]);

export const authCard = cva(
  [
    'flex w-full flex-col gap-[18px]',
    'rounded-xl border border-border-soft bg-surface-2 p-8 shadow-md',
  ],
  {
    variants: {
      width: {
        md: 'max-w-[440px]',
        lg: 'max-w-[500px]',
        xl: 'max-w-[520px]',
      },
    },
    defaultVariants: { width: 'md' },
  },
);

export const authEyebrow = cva(
  'font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-accent',
);

export const authFooter = cva(
  'mt-[18px] flex items-center gap-1.5 text-[13px] text-fg3',
);

export type AuthCardVariants = VariantProps<typeof authCard>;
