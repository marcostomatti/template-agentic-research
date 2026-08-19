import { useRef, type KeyboardEvent } from 'react';

import { cn } from '../../lib';

import { codeInputCell } from './CodeInput.variants';

export interface CodeInputProps {
  /** Number of digit cells. */
  length?: number;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  /** Accessible name for the cell group. */
  label?: string;
  className?: string;
}

/** Digits fill left-to-right; typing advances, backspace on empty retreats. */
export const CodeInput = ({
  length = 6,
  value,
  onChange,
  autoFocus,
  label = 'Verification code',
  className,
}: CodeInputProps) => {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const chars = Array.from({ length }, (_, i) => value[i] ?? '');

  const handleChange = (i: number, raw: string) => {
    const digit = raw.replace(/\D/g, '').slice(-1);
    const next = chars.map((c, j) => (j === i
      ? digit
      : c));
    onChange(next.join('').slice(0, length));
    if (digit) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !chars[i]) refs.current[i - 1]?.focus();
  };

  return (
    <div role="group" aria-label={label} className={cn('flex justify-center gap-2', className)}>
      {chars.map((c, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={c}
          inputMode="numeric"
          autoComplete={i === 0
            ? 'one-time-code'
            : 'off'}
          maxLength={1}
          aria-label={`digit ${i + 1} of ${length}`}
          // eslint-disable-next-line jsx-a11y/no-autofocus -- opt-in via prop; a 2FA code screen's single purpose is this input
          autoFocus={autoFocus && i === 0}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className={codeInputCell({ filled: c !== '' })}
        />
      ))}
    </div>
  );
};

CodeInput.displayName = 'CodeInput';
