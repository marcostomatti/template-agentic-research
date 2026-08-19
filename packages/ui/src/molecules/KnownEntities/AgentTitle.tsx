import { forwardRef, type HTMLAttributes } from 'react';

import { Avatar } from '../../atoms/Avatar';
import { cn } from '../../lib';

import {
  entityTitle,
  entityTitleName,
  entityTitleSub,
} from './KnownEntities.variants';

export interface AgentTitleProps extends HTMLAttributes<HTMLDivElement> {
  /** Agent display name — bold top line, drives the avatar initials. */
  name: string;
  /** Greyed second line (role, model, instance id, …). */
  subtitle?: string;
}

/**
 * `agent-title` — avatar on the left; name (bold) over a greyed subtitle
 * on the right (spec: "Known Entities"; used by the
 * session-detail runner metadata card).
 */
export const AgentTitle = forwardRef<HTMLDivElement, AgentTitleProps>(
  ({ className, name, subtitle, ...props }, ref) => (
    <div ref={ref} className={cn(entityTitle(), className)} {...props}>
      <Avatar name={name} size="md" shape="rounded" status="none" />
      <div className="flex min-w-0 flex-col gap-[3px]">
        <span className={entityTitleName()}>{name}</span>
        {subtitle != null && (
          <span className={entityTitleSub()}>{subtitle}</span>
        )}
      </div>
    </div>
  ),
);

AgentTitle.displayName = 'AgentTitle';
