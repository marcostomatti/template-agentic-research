import type { SelectionItem } from '../Breadcrumb';

import { forwardRef, type HTMLAttributes } from 'react';

import { touchable } from '../../atoms/Touchable/Touchable.variants';
import { cn } from '../../lib';

import { segmented, segmentedItem } from './Segmented.variants';

export interface SegmentedProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  items: readonly SelectionItem[];
  index: number;
  onChange?: (index: number) => void;
  size?: 'sm' | 'md';
}

export const Segmented = forwardRef<HTMLDivElement, SegmentedProps>(
  ({ className, items, index, onChange, size = 'md', ...props }, ref) => (
    <div
      ref={ref}
      role="tablist"
      className={cn(segmented(), className)}
      {...props}
    >
      {items.map((item, i) => (
        <button
          key={item.key}
          type="button"
          role="tab"
          aria-selected={i === index}
          onClick={() => onChange?.(i)}
          className={cn(
            touchable({ inline: true, rounded: 'sm', noBrightness: false }),
            segmentedItem({ active: i === index, size }),
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
);

Segmented.displayName = 'Segmented';
