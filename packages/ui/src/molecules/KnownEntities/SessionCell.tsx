import { forwardRef, type HTMLAttributes } from 'react';

import { cn } from '../../lib';

import { BranchInline } from './BranchInline';
import {
  entityCellStack,
  entityMeta,
  type SessionStatus,
} from './KnownEntities.variants';
import { SessionInline } from './SessionInline';

export interface SessionCellProps extends HTMLAttributes<HTMLDivElement> {
  /** Session name (top line, with the status dot). */
  name: string;
  status: SessionStatus;
  /** Agent instance id (`agent-7d2f`) — greyed meta line. */
  agentInstanceId: string;
  /** Branch the session runs on — rendered as a branch-inline. */
  branch?: string;
}

/**
 * `session-cell` — double line: `session-inline` on top, and
 * `{agent instance id} · {branch-inline}` greyed below (spec:
 * "Known Entities"; rendered reference: the
 * Sessions table session column).
 */
export const SessionCell = forwardRef<HTMLDivElement, SessionCellProps>(
  ({ className, name, status, agentInstanceId, branch, ...props }, ref) => (
    <div ref={ref} className={cn(entityCellStack(), className)} {...props}>
      <SessionInline name={name} status={status} />
      <span className={entityMeta()}>
        <span className="shrink-0">{agentInstanceId}</span>
        {branch != null && (
          <>
            <span className="text-border-strong">·</span>
            <BranchInline name={branch} />
          </>
        )}
      </span>
    </div>
  ),
);

SessionCell.displayName = 'SessionCell';
