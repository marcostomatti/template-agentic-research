import { forwardRef, type HTMLAttributes } from 'react';

import { cn, formatNumber } from '../../lib';
import { UsageBar } from '../UsageChart';

import {
  tokensConsumption,
  tokensConsumptionQuota,
  tokensProgress,
  tokensProgressTone,
} from './CellContent.variants';

export interface TokensConsumptionProps
  extends HTMLAttributes<HTMLSpanElement> {
  /** Tokens used — rendered bold, as the FULL number. */
  used: number;
  /** Tokens quota — rendered greyed, human readable (`50k`). */
  quota: number;
  locale?: string;
}

/**
 * TokensConsumption — `8,240 / 50k`: bold full-number used over a greyed
 * human-readable quota (spec: "CellContent →
 * tokens-consumption"; rendered reference: the Sessions table tokens
 * column in the original Sessions screen).
 */
export const TokensConsumption = forwardRef<
  HTMLSpanElement,
  TokensConsumptionProps
>(({ className, used, quota, locale, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(tokensConsumption(), className)}
    {...props}
  >
    {formatNumber(used, { short: false, locale })}
    <span className={tokensConsumptionQuota()}>
      {' / '}
      {formatNumber(quota, { short: true, locale })}
    </span>
  </span>
));

TokensConsumption.displayName = 'TokensConsumption';

export interface TokensProgressProps extends TokensConsumptionProps {
  /** Accessible description of the bar; defaults to `used of quota tokens`. */
  label?: string;
}

/**
 * TokensProgress — TokensConsumption over a mini progress bar whose tone
 * walks green → yellow → red with usage (spec: the component spec
 * "CellContent → tokens-progress"). Spec-over-original divergence: the original
 * Sessions table colors the bar by session STATUS (running green, failed
 * red, else accent); the spec keys the color to consumption thresholds —
 * the spec wins.
 */
export const TokensProgress = forwardRef<HTMLDivElement, TokensProgressProps>(
  ({ className, used, quota, locale, label, ...props }, ref) => {
    const ratio = quota > 0
      ? used / quota
      : used > 0
        ? Number.POSITIVE_INFINITY
        : 0;
    return (
      <div ref={ref} className={cn(tokensProgress(), className)} {...props}>
        <TokensConsumption used={used} quota={quota} locale={locale} />
        <UsageBar
          ratio={ratio}
          tone={tokensProgressTone(ratio)}
          size="sm"
          track
          label={label ?? `${used} of ${quota} tokens`}
        />
      </div>
    );
  },
);

TokensProgress.displayName = 'TokensProgress';
