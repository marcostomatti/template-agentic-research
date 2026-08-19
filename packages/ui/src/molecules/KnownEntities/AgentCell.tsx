import type { IconName } from '../../atoms/Icon';

import { forwardRef, type HTMLAttributes } from 'react';

import { Icon } from '../../atoms/Icon';
import { chartTone, cn, type ChartTone } from '../../lib';

import {
  entityCell,
  entityTile,
  entityTitleName,
  entityTitleSub,
} from './KnownEntities.variants';

export interface AgentCellProps extends HTMLAttributes<HTMLDivElement> {
  /** Agent display name — bold top line. */
  name: string;
  /** The model it runs — greyed mono subtitle. */
  model: string;
  /** Agent accent (shared chart palette) — colors the glyph tile. */
  tone?: ChartTone;
  /** Tile glyph (defaults to the original design's `bot`). */
  icon?: IconName;
}

/**
 * `agent-cell` — the smaller agent-title with the model as subtitle
 * (spec: "Known Entities"; rendered reference: the
 * Sessions table agent·model column — a 24px accent-tinted bot tile next
 * to name over model).
 */
export const AgentCell = forwardRef<HTMLDivElement, AgentCellProps>(
  ({ className, name, model, tone = 'primary', icon = 'bot', ...props }, ref) => (
    <div ref={ref} className={cn(entityCell(), className)} {...props}>
      <span className={cn(entityTile({ size: 'sm' }), chartTone({ tone }))}>
        <Icon name={icon} size={13} />
      </span>
      <div className="flex min-w-0 flex-col gap-[3px]">
        <span className={entityTitleName()}>{name}</span>
        <span className={entityTitleSub()}>{model}</span>
      </div>
    </div>
  ),
);

AgentCell.displayName = 'AgentCell';
