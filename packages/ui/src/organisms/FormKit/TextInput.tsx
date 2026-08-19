import {
  forwardRef,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';

import { cn } from '../../lib';

import { textInput, type TextInputVariants } from './FormKit.variants';

export interface TextInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size' | 'prefix'>,
  TextInputVariants {
  value: string;
  onChange: (value: string) => void;
  /**
   * Leading slot. A string keeps the original demo's mono-prefix treatment ("@");
   * a ReactNode renders as a 14px leading icon slot — extension sourced from
   * the auth screens (the original Auth screen), not the
   * original form-kit chapter.
   */
  prefix?: ReactNode;
  /** Trailing slot — interactive (the auth eye-toggle is a real button). */
  suffix?: ReactNode;
}

/** Left padding per prefix character (the original demo's 12 + len * 7.5). */
const PREFIX_PAD_BASE = 12;
const PREFIX_PAD_PER_CHAR = 7.5;

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ className, value, onChange, invalid, prefix, suffix, type = 'text', ...props }, ref) => {
    const stringPrefix = typeof prefix === 'string'
      ? prefix
      : null;
    const style: CSSProperties | undefined =
      stringPrefix != null
        ? {
          paddingLeft: PREFIX_PAD_BASE + stringPrefix.length * PREFIX_PAD_PER_CHAR,
        }
        : undefined;
    return (
      <span className="relative flex items-center">
        {stringPrefix != null && (
          <span className="pointer-events-none absolute left-3 font-mono text-[13px] text-fg3">
            {stringPrefix}
          </span>
        )}
        {prefix != null && stringPrefix == null && (
          <span className="pointer-events-none absolute left-3 inline-flex items-center text-fg3">
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            textInput({ invalid }),
            // icon slot: 12px inset + 14px glyph + 8px gap
            prefix != null && stringPrefix == null && 'pl-[34px]',
            suffix != null && 'pr-[34px]',
            className,
          )}
          style={style}
          {...props}
        />
        {suffix != null && (
          <span className="absolute right-3 inline-flex items-center text-fg3">
            {suffix}
          </span>
        )}
      </span>
    );
  },
);

TextInput.displayName = 'TextInput';
