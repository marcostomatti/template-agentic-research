import { forwardRef, type HTMLAttributes } from 'react';

import { StatusIndicator } from '../../atoms/StatusIndicator';
import { cn } from '../../lib';

import {
  entityCell,
  SESSION_STATUS_TONE,
  sessionInlineName,
  type SessionStatus,
} from './KnownEntities.variants';

export interface SessionInlineProps extends HTMLAttributes<HTMLSpanElement> {
  /** Session name. */
  name: string;
  /** Lifecycle status — drives the dot tone; `running` pulses. */
  status: SessionStatus;
}

/**
 * `session-inline` — inline status indicator + session name (spec:
 * "Known Entities"; rendered reference: the
 * Sessions table session column top line). Status→tone: running→ok
 * (pulsing), waiting→warn, done→info, failed→err, idle→disabled.
 */
export const SessionInline = forwardRef<HTMLSpanElement, SessionInlineProps>(
  ({ className, name, status, ...props }, ref) => (
    <span ref={ref} className={cn(entityCell(), className)} {...props}>
      <StatusIndicator
        tone={SESSION_STATUS_TONE[status]}
        pulse={status === 'running'}
        label={status}
      />
      <span className={sessionInlineName()}>{name}</span>
    </span>
  ),
);

SessionInline.displayName = 'SessionInline';
