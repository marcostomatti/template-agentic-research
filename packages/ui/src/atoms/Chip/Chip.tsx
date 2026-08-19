import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../lib';
import { Touchable } from '../Touchable';

import { chip } from './Chip.variants';

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  /** Optional leading icon (13px, accent-colored). */
  icon?: ReactNode;
  /** When set, renders the remove affordance and drives the tighter padding. */
  onRemove?: () => void;
}

export const Chip = forwardRef<HTMLSpanElement, ChipProps>(
  ({ className, icon, onRemove, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(chip({ removable: onRemove != null }), className)}
      {...props}
    >
      {icon != null && <span className="text-accent shrink-0">{icon}</span>}
      {children}
      {onRemove != null && (
        <Touchable
          inline
          rounded="full"
          aria-label="Remove"
          onClick={onRemove}
          className="size-[17px] justify-center border-none bg-[color-mix(in_oklab,var(--accent)_22%,transparent)] text-accent"
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </Touchable>
      )}
    </span>
  ),
);

Chip.displayName = 'Chip';
