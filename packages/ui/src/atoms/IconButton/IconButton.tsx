import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../lib';

import { iconButton, type IconButtonVariants } from './IconButton.variants';

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'children'>,
  IconButtonVariants {
  icon: ReactNode;
  /** Accessible name — required, the button has no text. */
  label: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, icon, label, active, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      className={cn(iconButton({ active }), className)}
      {...props}
    >
      {icon}
    </button>
  ),
);

IconButton.displayName = 'IconButton';
