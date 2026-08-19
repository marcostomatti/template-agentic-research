import { Badge } from '../../atoms/Badge';
import { cn, formatNumber } from '../../lib';
// Deep member import — the built storybook's lazy-init chunking drops
// cross-tree barrel inits (see the built-storybook lazy-init chunking hazard).
import { Progress } from '../../molecules/Progress/Progress';

import { weekSummaryCard } from './AppShell.variants';

export interface SidebarWeekSummaryProps {
  /** Drives the pill's copy and tone. */
  status: 'healthy' | 'unhealthy';
  /** Tokens used this week. */
  used: number;
  /** The week's token limit. */
  limit: number;
  unit?: string;
  /** Hidden entirely when the rail is collapsed. */
  collapsed?: boolean;
  className?: string;
}

/**
 * The sidebar's week-summary widget (app-shell spec: Side Bar) —
 * deliberately a STUB for the PoC: "this week" + a healthy/unhealthy
 * status pill, tokens-over-limit, and a progress bar underneath. The
 * caller aligns it to the bottom of the nav area (a flex spacer above);
 * bottom-anchoring is composition, not widget state.
 */
export const SidebarWeekSummary = ({
  status,
  used,
  limit,
  unit = 'tokens',
  collapsed = false,
  className,
}: SidebarWeekSummaryProps) => {
  if (collapsed) return null;
  const pct = limit > 0
    ? (used / limit) * 100
    : 0;
  return (
    <div className={cn('px-3 py-2', className)}>
      <div className={weekSummaryCard()}>
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-fg3">
            this week
          </span>
          <Badge
            tone={status === 'healthy'
              ? 'success'
              : 'danger'}
            size="sm"
            dot
          >
            {status}
          </Badge>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-[22px] font-bold tracking-[-0.01em] text-fg1">
            {formatNumber(used)}
          </span>
          <span className="text-xs text-fg3">
            / {formatNumber(limit)} {unit}
          </span>
        </div>
        <Progress
          value={pct}
          tone={status === 'healthy'
            ? 'accent'
            : 'danger'}
          className="h-1"
        />
      </div>
    </div>
  );
};

SidebarWeekSummary.displayName = 'SidebarWeekSummary';
