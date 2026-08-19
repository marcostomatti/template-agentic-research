import type { ReactNode } from 'react';

import { touchable } from '../../atoms/Touchable/Touchable.variants';
import { cn } from '../../lib';
import { StrokeIcon } from '../../lib/icons';

import {
  checkboxBox,
  checkGroup,
  type CheckGroupVariants,
} from './FormKit.variants';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  hint?: ReactNode;
  className?: string;
}

export const Checkbox = ({
  checked,
  onChange,
  label,
  hint,
  className,
}: CheckboxProps) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={cn(
      touchable({ rounded: 'sm', noBrightness: false }),
      'w-full items-start gap-2.5 border-none bg-transparent p-0.5 text-left',
      className,
    )}
  >
    <span className={checkboxBox({ checked })}>
      {checked && (
        <span className="text-on-primary">
          <StrokeIcon name="check" size={13} />
        </span>
      )}
    </span>
    <span className="min-w-0">
      <span className="block text-[13.5px] font-medium text-fg1">{label}</span>
      {hint != null && (
        <span className="mt-px block text-xs text-fg3">{hint}</span>
      )}
    </span>
  </button>
);

Checkbox.displayName = 'Checkbox';

export interface CheckOption {
  value: string;
  label: ReactNode;
  hint?: ReactNode;
}

export interface CheckGroupProps extends CheckGroupVariants {
  options: CheckOption[];
  value: string[];
  onChange: (value: string[]) => void;
  className?: string;
}

export const CheckGroup = ({
  options,
  value,
  onChange,
  columns,
  className,
}: CheckGroupProps) => {
  const toggle = (v: string) => onChange(
    value.includes(v)
      ? value.filter((x) => x !== v)
      : [...value, v],
  );
  return (
    <div className={cn(checkGroup({ columns }), className)}>
      {options.map((o) => (
        <Checkbox
          key={o.value}
          checked={value.includes(o.value)}
          onChange={() => toggle(o.value)}
          label={o.label}
          hint={o.hint}
        />
      ))}
    </div>
  );
};

CheckGroup.displayName = 'CheckGroup';
