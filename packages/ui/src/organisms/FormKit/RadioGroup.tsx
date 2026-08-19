import type { ReactNode } from 'react';

import { touchable } from '../../atoms/Touchable/Touchable.variants';
import { cn } from '../../lib';

import { radioCircle, radioOption } from './FormKit.variants';

export interface RadioOption {
  value: string;
  label: ReactNode;
  hint?: ReactNode;
}

export interface RadioGroupProps {
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
}

export const RadioGroup = ({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: RadioGroupProps) => (
  <div
    role="radiogroup"
    aria-label={ariaLabel}
    className={cn('flex flex-col gap-[9px]', className)}
  >
    {options.map((o) => {
      const on = value === o.value;
      return (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={on}
          onClick={() => onChange(o.value)}
          className={cn(
            touchable({ rounded: 'md', noBrightness: false }),
            radioOption({ checked: on }),
          )}
        >
          <span className={radioCircle({ checked: on })}>
            {on && <span className="size-[9px] rounded-full bg-primary" />}
          </span>
          <span className="min-w-0">
            <span className="block text-[13.5px] font-semibold text-fg1">
              {o.label}
            </span>
            {o.hint != null && (
              <span className="mt-px block text-xs text-fg3">{o.hint}</span>
            )}
          </span>
        </button>
      );
    })}
  </div>
);

RadioGroup.displayName = 'RadioGroup';
