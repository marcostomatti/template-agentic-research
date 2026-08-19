import type { IconName } from '../../atoms/Icon';

import { forwardRef, type HTMLAttributes } from 'react';

import { Badge, type BadgeProps } from '../../atoms/Badge';
import { Icon } from '../../atoms/Icon';
import { chartTone, cn, type ChartTone } from '../../lib';

import {
  entityMeta,
  entityTile,
  entityTitle,
  entityTitleName,
} from './KnownEntities.variants';

export interface ToolTitleProps extends HTMLAttributes<HTMLDivElement> {
  /** Tool display name — bold top line. */
  name: string;
  /** Tool type (`MCP`, `skill`, `API`) — rendered as a small badge. */
  type: string;
  /** Tool slug id (`gh-search`), greyed mono next to the badge. */
  slug: string;
  /** Tile glyph (defaults to `wrench`). */
  icon?: IconName;
  /** Tile accent (shared chart palette). */
  tone?: ChartTone;
  /** Badge tone for the type (defaults to neutral). */
  badgeTone?: BadgeProps['tone'];
}

/**
 * `tool-title` — icon/avatar tile on the left; double line on the right:
 * bold name on top, a tool-type badge + the slug id below (spec:
 * "Known Entities").
 */
export const ToolTitle = forwardRef<HTMLDivElement, ToolTitleProps>(
  (
    {
      className,
      name,
      type,
      slug,
      icon = 'wrench',
      tone = 'accent',
      badgeTone = 'neutral',
      ...props
    },
    ref,
  ) => (
    <div ref={ref} className={cn(entityTitle(), className)} {...props}>
      <span className={cn(entityTile({ size: 'md' }), chartTone({ tone }))}>
        <Icon name={icon} size={16} />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <span className={entityTitleName()}>{name}</span>
        <span className={entityMeta()}>
          <Badge tone={badgeTone} size="sm">{type}</Badge>
          <span className="truncate">{slug}</span>
        </span>
      </div>
    </div>
  ),
);

ToolTitle.displayName = 'ToolTitle';
