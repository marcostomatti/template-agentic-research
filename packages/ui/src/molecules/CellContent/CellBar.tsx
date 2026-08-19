import { forwardRef } from 'react';

import { UsageBar, type UsageBarProps } from '../UsageChart';

export type CellBarStroke = 'mini' | 'regular';

export interface CellBarProps extends Omit<UsageBarProps, 'size'> {
  /** Stroke weight — `mini` (5px, in-cell) or `regular` (10px). */
  stroke?: CellBarStroke;
}

/**
 * CellBar — the in-cell bar indicator (spec: the component spec
 * "CellContent → Bar indicator"). A thin alias over the UsageChart's
 * UsageBar — exported from there for exactly this reuse — exposing the
 * spec's stroke vocabulary: `mini` maps to the 5px bar, `regular` to the
 * 10px one. Everything else (ratio semantics, >100% overflow treatment,
 * `track` for progress backgrounds, tones) is UsageBar verbatim.
 */
export const CellBar = forwardRef<HTMLDivElement, CellBarProps>(
  ({ stroke = 'regular', ...props }, ref) => (
    <UsageBar
      ref={ref}
      size={stroke === 'mini'
        ? 'sm'
        : 'md'}
      {...props}
    />
  ),
);

CellBar.displayName = 'CellBar';
