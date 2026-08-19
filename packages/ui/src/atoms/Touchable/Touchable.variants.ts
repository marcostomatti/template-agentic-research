import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Touchable — interaction-only primitive (no fill, no chrome).
 *
 * Decoration is supplied by whatever composes inside it (Card, Shell, …).
 */
export const touchable = cva(
  [
    'relative cursor-pointer select-none items-center',
    'transition-[transform,filter] active:scale-[0.97]',
    'focus-visible:outline-none focus-visible:ring-2',
    'focus-visible:ring-leaf focus-visible:ring-offset-2',
    'disabled:opacity-50 disabled:pointer-events-none',
  ],
  {
    variants: {
      inline: { false: 'flex', true: 'inline-flex' },
      stretch: { false: 'justify-start', true: 'justify-stretch w-full' },
      noBrightness: { false: 'hover:brightness-105', true: 'hover:brightness-100' },
      rounded: {
        none: 'rounded-none',
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        full: 'rounded-full',
      },
    },
    defaultVariants: {
      inline: false,
      stretch: false,
      noBrightness: true,
      rounded: 'md',
    },
  },
);

export type TouchableVariants = VariantProps<typeof touchable>;
