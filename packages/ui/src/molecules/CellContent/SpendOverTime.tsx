import { forwardRef, type HTMLAttributes } from 'react';

// Deep imports, not the Formatted barrel — see CellValue.tsx (the built
// storybook's lazy-init chunking can drop barrel member inits).
import { FormattedCurrency } from '../../atoms/Formatted/FormattedCurrency';
import { FormattedDuration } from '../../atoms/Formatted/FormattedDuration';
import { FormattedRelativeTime } from '../../atoms/Formatted/FormattedRelativeTime';
import { cn, type DateInput } from '../../lib';

import { spendOverTime, spendOverTimeMeta } from './CellContent.variants';

export interface SpendOverTimeProps extends HTMLAttributes<HTMLDivElement> {
  /** Spend amount. */
  cost: number;
  /** ISO 4217 code (defaults to USD). */
  currency?: string;
  /** Elapsed run time, in seconds. */
  seconds: number;
  /** When the run happened (drives the relative-time part). */
  date: DateInput;
  /**
   * Reference "now" for the relative ladder. Stories and tests MUST pass
   * a fixed date to stay deterministic.
   */
  now?: DateInput;
  locale?: string;
}

/**
 * SpendOverTime — FormattedCurrency over a smaller greyed
 * `FormattedDuration · FormattedRelativeTime` line (spec:
 * "CellContent → spend-over-time"; rendered
 * reference: the Sessions table spend·time column — `$0.42` over
 * `7m 17s · 12:04`). The spec prose separates the two with `-`; the original
 * design renders a middot, and the middot wins as the DS-wide separator
 * (same treatment as the session-cell meta line).
 */
export const SpendOverTime = forwardRef<HTMLDivElement, SpendOverTimeProps>(
  (
    { className, cost, currency = 'usd', seconds, date, now, locale, ...props },
    ref,
  ) => (
    <div ref={ref} className={cn(spendOverTime(), className)} {...props}>
      <FormattedCurrency
        value={cost}
        currency={currency}
        locale={locale}
        size="sm"
      />
      <span className={spendOverTimeMeta()}>
        <FormattedDuration seconds={seconds} />
        {' · '}
        <FormattedRelativeTime date={date} now={now} locale={locale} />
      </span>
    </div>
  ),
);

SpendOverTime.displayName = 'SpendOverTime';
