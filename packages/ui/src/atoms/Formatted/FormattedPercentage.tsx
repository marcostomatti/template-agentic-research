import { forwardRef, type HTMLAttributes } from 'react';

import { cn, formatPercentage } from '../../lib';

export interface FormattedPercentageProps
  extends HTMLAttributes<HTMLSpanElement> {
  value: number;
  /**
   * Required by spec: `ratio` reads 0.1 as 10%, `raw` reads 10 as 10%.
   */
  mode: 'ratio' | 'raw';
  /** Max fraction digits (default 0). */
  precision?: number;
  /** Prepend an explicit +/- sign on non-zero values. */
  signed?: boolean;
  locale?: string;
}

/**
 * FormattedPercentage — ensures the % symbol placement is locale-correct
 * (spec-defined). Inherits the surrounding text style; wrap
 * in HumanReadableValue-style chrome at the call site when emphasis is
 * needed.
 */
export const FormattedPercentage = forwardRef<
  HTMLSpanElement,
  FormattedPercentageProps
>(({ className, value, mode, precision, signed, locale, ...props }, ref) => (
  <span ref={ref} className={cn(className)} {...props}>
    {formatPercentage(value, { mode, precision, signed, locale })}
  </span>
));

FormattedPercentage.displayName = 'FormattedPercentage';
