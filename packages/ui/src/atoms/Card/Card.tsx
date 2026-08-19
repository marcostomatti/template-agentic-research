import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../lib';

import { card, cardHeader, type CardVariants } from './Card.variants';

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
  CardVariants {
  /** Optional header content, rendered in a divided row above the body. */
  header?: ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      noShadow,
      padding,
      density,
      bordered,
      rounded,
      header,
      children,
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      className={cn(
        card({ noShadow, padding, density, bordered, rounded }),
        className,
      )}
      {...props}
    >
      {header != null && (
        <div className={cardHeader({ density })}>{header}</div>
      )}
      {children}
    </div>
  ),
);

Card.displayName = 'Card';
