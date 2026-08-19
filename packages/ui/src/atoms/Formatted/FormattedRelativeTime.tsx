import { forwardRef, type TimeHTMLAttributes } from 'react';

import {
  cn,
  formatDate,
  formatRelativeTime,
  toDate,
  type DateInput,
} from '../../lib';

export interface FormattedRelativeTimeProps
  extends TimeHTMLAttributes<HTMLTimeElement> {
  date: DateInput;
  /**
   * Reference "now". Defaults to the wall clock; stories and tests MUST
   * pass a fixed date to stay deterministic.
   */
  now?: DateInput;
  locale?: string;
}

/**
 * FormattedRelativeTime — the spec's relative ladder: same calendar day →
 * `hh:mm`, then `6 hours ago` → `yesterday` → `x days ago` → `last week` →
 * `x weeks ago` → `last month` → `x months ago` → `last year` →
 * `x years ago` (spec-defined). The absolute date rides
 * along as a `title` tooltip and the machine-readable `dateTime`.
 */
export const FormattedRelativeTime = forwardRef<
  HTMLTimeElement,
  FormattedRelativeTimeProps
>(({ className, date, now, locale, ...props }, ref) => (
  <time
    ref={ref}
    dateTime={toDate(date).toISOString()}
    title={formatDate(date, { locale, dateStyle: 'full' })}
    className={cn(className)}
    {...props}
  >
    {formatRelativeTime(date, { now, locale })}
  </time>
));

FormattedRelativeTime.displayName = 'FormattedRelativeTime';
