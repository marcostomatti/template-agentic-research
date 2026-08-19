import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../lib';
import { StrokeIcon } from '../../lib/icons';

import {
  optionCard,
  optionCardIndicator,
  optionCardTitle,
  type OptionCardVariants,
} from './OptionCard.variants';

export interface OptionCardProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'title'>,
  OptionCardVariants {
  selected: boolean;
  /** Identity slot — WorkspaceMark, IconTile, …. */
  leading?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Title-row companion (Badge slot). */
  meta?: ReactNode;
}

export const OptionCard = forwardRef<HTMLButtonElement, OptionCardProps>(
  ({ className, selected, align, leading, title, description, meta, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-pressed={selected}
      className={cn(optionCard({ selected, align }), className)}
      {...props}
    >
      {leading}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-2">
          <span className={optionCardTitle({ align })}>{title}</span>
          {meta}
        </span>
        {description != null && (
          <span
            className={cn(
              'text-xs leading-normal text-fg3',
              align === 'start'
                ? 'mt-1'
                : 'mt-0.5',
            )}
          >
            {description}
          </span>
        )}
      </span>
      <span className={optionCardIndicator({ selected, align })}>
        {selected && <StrokeIcon name="check" size={align === 'start'
          ? 11
          : 12} />}
      </span>
    </button>
  ),
);

OptionCard.displayName = 'OptionCard';
