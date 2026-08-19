import type { IconName } from '../../atoms/Icon';

import { forwardRef, type HTMLAttributes } from 'react';

import { Icon } from '../../atoms/Icon';
import { chartTone, cn, type ChartTone } from '../../lib';

import {
  entityCell,
  modelCellName,
  modelFooter,
  modelFooterName,
} from './KnownEntities.variants';

export interface ModelCellProps extends HTMLAttributes<HTMLSpanElement> {
  /** Model name (`sonnet-4-5`). */
  name: string;
  /** Accent for the decoration (shared chart palette). */
  tone?: ChartTone;
  /** Swap the accent dot for a tiny icon. */
  icon?: IconName;
}

/**
 * `model-cell` — a small accent-colored decoration (dot by default, tiny
 * icon when given) + the model name (spec: "Known
 * Entities"; used by the Overview "Top 5 sessions by spend" model
 * column).
 */
export const ModelCell = forwardRef<HTMLSpanElement, ModelCellProps>(
  ({ className, name, tone = 'accent', icon, ...props }, ref) => (
    <span ref={ref} className={cn(entityCell(), className)} {...props}>
      <span className={chartTone({ tone })}>
        {icon != null
          ? <Icon name={icon} size={12} />
          : (
            <span
              className="block size-2 rounded-full bg-current"
              aria-hidden
            />
          )}
      </span>
      <span className={modelCellName()}>{name}</span>
    </span>
  ),
);

ModelCell.displayName = 'ModelCell';

export interface ModelFooterProps extends HTMLAttributes<HTMLSpanElement> {
  /** Model name. */
  name: string;
  /** Small leading glyph (defaults to `cpu`). */
  icon?: IconName;
}

/**
 * `model-footer` — small icon + model name that INHERITS the footer's
 * color wholesale — no accent of its own (spec: the component spec
 * "Known Entities"; sits inside SectionCard footers, which set the
 * greyed footer color).
 */
export const ModelFooter = forwardRef<HTMLSpanElement, ModelFooterProps>(
  ({ className, name, icon = 'cpu', ...props }, ref) => (
    <span ref={ref} className={cn(modelFooter(), className)} {...props}>
      <Icon name={icon} size={12} />
      <span className={modelFooterName()}>{name}</span>
    </span>
  ),
);

ModelFooter.displayName = 'ModelFooter';
