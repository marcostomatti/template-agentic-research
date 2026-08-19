import { forwardRef, type HTMLAttributes } from 'react';

import { cn, formatDuration, type DateInput } from '../../lib';

interface SecondsSource {
  /** Total seconds. */
  seconds: number;
  from?: never;
  to?: never;
}

interface RangeSource {
  seconds?: never;
  from: DateInput;
  to: DateInput;
}

export type FormattedDurationProps = HTMLAttributes<HTMLSpanElement> &
  (SecondsSource | RangeSource);

/**
 * FormattedDuration — `1h 3m 10s` from a total of seconds or a date range
 * (spec-defined). Zero units are omitted; a zero duration
 * reads `0s`.
 */
export const FormattedDuration = forwardRef<
  HTMLSpanElement,
  FormattedDurationProps
>(({ className, seconds, from, to, ...props }, ref) => (
  <span ref={ref} className={cn(className)} {...props}>
    {formatDuration(seconds != null
      ? seconds
      : { from: from as DateInput, to: to as DateInput })}
  </span>
));

FormattedDuration.displayName = 'FormattedDuration';
