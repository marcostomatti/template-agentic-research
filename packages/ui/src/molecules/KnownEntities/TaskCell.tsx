import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../lib';

import {
  entityCellStack,
  entityMeta,
  taskCellTitle,
} from './KnownEntities.variants';

export interface TaskCellProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Task title/name — top line. */
  title: ReactNode;
  /** Inline text tags below (`ui · feat`, parent link, subtask count). */
  tags?: readonly string[];
}

/**
 * `task-cell` — double line: task title on top, inline text tags below
 * (spec: "Known Entities"; rendered reference: the
 * Tasks/Roadmap table task column — greyed mono tags separated by
 * middots).
 */
export const TaskCell = forwardRef<HTMLDivElement, TaskCellProps>(
  ({ className, title, tags, ...props }, ref) => (
    <div ref={ref} className={cn(entityCellStack(), className)} {...props}>
      <span className={taskCellTitle()}>{title}</span>
      {tags != null && tags.length > 0 && (
        <span className={entityMeta()}>
          {tags.map((tag, i) => (
            <span key={tag} className="flex min-w-0 items-center gap-1.5">
              {i > 0 && <span className="text-border-strong">·</span>}
              <span className="truncate">{tag}</span>
            </span>
          ))}
        </span>
      )}
    </div>
  ),
);

TaskCell.displayName = 'TaskCell';
