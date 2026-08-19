import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '../../lib';
import { StrokeIcon } from '../../lib/icons';

import { sortableRow } from './Sortable.variants';

export interface SortableRowProps extends HTMLAttributes<HTMLDivElement> {
  /** Trailing slot (e.g. a status Tag). */
  trailing?: ReactNode;
}

/** A plain drag-handle row — the convenient default renderItem chrome. */
export const SortableRow = ({
  className,
  trailing,
  children,
  ...props
}: SortableRowProps) => (
  <div className={cn(sortableRow(), className)} {...props}>
    <span className="shrink-0 cursor-grab text-fg3">
      <StrokeIcon name="gripVertical" size={16} />
    </span>
    <div className="min-w-0 flex-1">{children}</div>
    {trailing}
  </div>
);

SortableRow.displayName = 'SortableRow';
