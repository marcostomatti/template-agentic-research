import { forwardRef, type HTMLAttributes } from 'react';

import { touchable } from '../../atoms/Touchable/Touchable.variants';
import { cn } from '../../lib';

import { paginationButton } from './Pagination.variants';

export interface PaginationProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  count: number;
  index: number;
  onChange?: (index: number) => void;
}

const Arrow = ({ left = false }: { left?: boolean }) => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d={left
      ? 'M15 18l-6-6 6-6'
      : 'M9 18l6-6-6-6'} />
  </svg>
);

const pageButton = (active = false) => cn(
  touchable({ inline: true, rounded: 'md', noBrightness: false }),
  paginationButton({ active }),
);

export const Pagination = forwardRef<HTMLDivElement, PaginationProps>(
  ({ className, count, index, onChange, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('inline-flex items-center gap-1', className)}
      {...props}
    >
      <button
        type="button"
        aria-label="Previous"
        disabled={index === 0}
        onClick={() => onChange?.(Math.max(0, index - 1))}
        className={pageButton()}
      >
        <Arrow left />
      </button>
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          aria-current={i === index
            ? 'page'
            : undefined}
          onClick={() => onChange?.(i)}
          className={pageButton(i === index)}
        >
          {i + 1}
        </button>
      ))}
      <button
        type="button"
        aria-label="Next"
        disabled={index === count - 1}
        onClick={() => onChange?.(Math.min(count - 1, index + 1))}
        className={pageButton()}
      >
        <Arrow />
      </button>
    </div>
  ),
);

Pagination.displayName = 'Pagination';
