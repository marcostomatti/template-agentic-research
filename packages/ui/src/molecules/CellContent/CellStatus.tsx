import type { IconName } from '../../atoms/Icon';

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

import { Icon } from '../../atoms/Icon';
import { StatusIndicator } from '../../atoms/StatusIndicator';
import { cn } from '../../lib';

import {
  cellStatus,
  cellStatusText,
  type CellStatusTone,
  type CellStatusVariants,
} from './CellContent.variants';

export type CellStatusFormat = 'rounded' | 'square' | 'icon';

const STATUS_GLYPH: Record<CellStatusTone, IconName> = {
  ok: 'circle-check',
  warn: 'triangle-alert',
  err: 'circle-x',
  info: 'info',
  disabled: 'ban',
};

export interface CellStatusProps
  extends HTMLAttributes<HTMLSpanElement>,
  CellStatusVariants {
  /** Optional text next to the indicator. */
  text?: ReactNode;
  /** Indicator format — rounded / square dot, or a status glyph. */
  format?: CellStatusFormat;
  /** Live-activity pulse on the dot formats. */
  pulse?: boolean;
  /** Accessible status name; defaults to the tone when no text renders. */
  label?: string;
}

/**
 * CellStatus — status indicator plus optional text (spec:
 * "CellContent → Status": tones ok / warn / err /
 * info / disabled, formats rounded / square / icon). The dot formats
 * reuse the StatusIndicator atom; the icon format maps each tone to its
 * Lucide glyph.
 */
export const CellStatus = forwardRef<HTMLSpanElement, CellStatusProps>(
  (
    {
      className,
      tone = 'ok',
      format = 'rounded',
      text,
      pulse = false,
      label,
      ...props
    },
    ref,
  ) => {
    const fallbackLabel = text == null
      ? label ?? tone ?? undefined
      : label;
    return (
      <span ref={ref} className={cn(cellStatus({ tone }), className)} {...props}>
        {format === 'icon'
          ? (
            <Icon
              name={STATUS_GLYPH[tone ?? 'ok']}
              size={14}
              label={fallbackLabel}
            />
          )
          : (
            <StatusIndicator
              tone={tone}
              shape={format === 'square'
                ? 'square'
                : 'circle'}
              pulse={pulse}
              label={fallbackLabel}
            />
          )}
        {text != null && <span className={cellStatusText()}>{text}</span>}
      </span>
    );
  },
);

CellStatus.displayName = 'CellStatus';
