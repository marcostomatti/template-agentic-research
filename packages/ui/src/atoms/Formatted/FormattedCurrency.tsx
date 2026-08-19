import { forwardRef, type HTMLAttributes } from 'react';

import { cn, formatCurrency } from '../../lib';

import {
  formattedValue,
  type FormattedSizeVariants,
} from './Formatted.variants';

export interface FormattedCurrencyProps
  extends HTMLAttributes<HTMLSpanElement>,
  FormattedSizeVariants {
  value: number;
  /** ISO 4217 code, case-insensitive (`usd`, `eur`, `ars`). */
  currency: string;
  /** Fraction digits. Spec default: 2. Ignored when `short`. */
  precision?: number;
  /** Compact human-readable notation (`$1.2K`). */
  short?: boolean;
  locale?: string;
}

/**
 * FormattedCurrency — money, bold with the currency symbol on the left per
 * the DS value-display rules (spec-defined).
 */
export const FormattedCurrency = forwardRef<
  HTMLSpanElement,
  FormattedCurrencyProps
>(
  (
    { className, value, currency, precision, short, locale, size, ...props },
    ref,
  ) => (
    <span
      ref={ref}
      className={cn(formattedValue({ size }), className)}
      {...props}
    >
      {formatCurrency(value, currency, { precision, short, locale })}
    </span>
  ),
);

FormattedCurrency.displayName = 'FormattedCurrency';
