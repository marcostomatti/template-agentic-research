import { cva, type VariantProps } from 'class-variance-authority';

/**
 * IconTile — the tinted icon square/circle the auth screens use everywhere:
 * 2FA method cards (md), next-step rows (sm), and the status circles on the
 * confirmation screens (lg 64 / xl 72 / 2xl 80). Tints ship at 14% for
 * every tone.
 */
export const iconTile = cva(
  'relative inline-flex shrink-0 items-center justify-center',
  {
    variants: {
      tone: {
        accent: 'bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-accent',
        primary: 'bg-[color-mix(in_oklab,var(--primary)_14%,transparent)] text-primary',
        success: 'bg-[color-mix(in_oklab,var(--success)_14%,transparent)] text-success',
      },
      size: {
        sm: 'size-7',
        md: 'size-9',
        lg: 'size-16',
        xl: 'size-[72px]',
        '2xl': 'size-20',
      },
      shape: {
        rounded: '',
        circle: 'rounded-full',
      },
    },
    compoundVariants: [
      { shape: 'rounded', size: 'sm', class: 'rounded-sm' },
      { shape: 'rounded', size: 'md', class: 'rounded-md' },
      { shape: 'rounded', size: 'lg', class: 'rounded-lg' },
      { shape: 'rounded', size: 'xl', class: 'rounded-lg' },
      { shape: 'rounded', size: '2xl', class: 'rounded-lg' },
    ],
    defaultVariants: { tone: 'accent', size: 'md', shape: 'rounded' },
  },
);

export type IconTileVariants = VariantProps<typeof iconTile>;
