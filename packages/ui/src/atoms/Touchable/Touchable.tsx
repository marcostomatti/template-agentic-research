import { Slot } from '@radix-ui/react-slot';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cn } from '../../lib';

import { touchable, type TouchableVariants } from './Touchable.variants';

export interface TouchableProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'>,
  TouchableVariants {
  /**
   * Render via Radix Slot, handing off to the single child element
   * (a `<Card>`, an `<a>`, etc.). The Touchable's classes and behavior
   * are merged onto that child instead of a wrapper `<button>`.
   */
  asChild?: boolean;
}

export const Touchable = forwardRef<HTMLButtonElement, TouchableProps>(
  (
    {
      asChild = false,
      className,
      inline,
      stretch,
      noBrightness,
      rounded,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild
      ? Slot
      : 'button';
    return (
      <Comp
        ref={ref}
        type={asChild
          ? undefined
          : 'button'}
        className={cn(
          touchable({ inline, stretch, noBrightness, rounded }),
          className,
        )}
        {...props}
      />
    );
  },
);

Touchable.displayName = 'Touchable';
