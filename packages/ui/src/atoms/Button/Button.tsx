import { Slot } from '@radix-ui/react-slot';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../lib';
import { touchable } from '../Touchable/Touchable.variants';

import { button, type ButtonVariants } from './Button.variants';

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'>,
  ButtonVariants {
  /** Render via Radix Slot, handing classes off to the single child element. */
  asChild?: boolean;
  /** Optional leading content (typically an `<Icon>`). */
  iconLeading?: ReactNode;
  /** Optional trailing content. */
  iconTrailing?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      asChild = false,
      className,
      variant,
      size,
      block,
      iconLeading,
      iconTrailing,
      children,
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
          touchable({ rounded: 'md', stretch: block, noBrightness: false }),
          button({ variant, size, block }),
          className,
        )}
        {...props}
      >
        {iconLeading}
        {children}
        {iconTrailing}
      </Comp>
    );
  },
);

Button.displayName = 'Button';
