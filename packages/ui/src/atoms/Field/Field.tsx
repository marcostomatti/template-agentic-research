import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';

import { cn } from '../../lib';

import { field, fieldHelper, type FieldVariants } from './Field.variants';

export interface FieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'disabled'>,
  FieldVariants {
  /** Label rendered above the control, linked via htmlFor. */
  label?: string;
  /** Helper line under the control; colored by the state variant. */
  helper?: string;
  /** Optional leading icon inside the control (15px). */
  icon?: ReactNode;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(
  ({ className, state, size, label, helper, icon, id, ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    return (
      <div
        className={cn(
          'flex flex-col gap-1.5',
          state === 'disabled' && 'opacity-60',
          className,
        )}
      >
        {label != null && (
          <label
            htmlFor={inputId}
            className="text-[12.5px] font-semibold text-fg1"
          >
            {label}
          </label>
        )}
        <span className="relative flex items-center">
          {icon != null && (
            <span className="absolute left-[11px] text-fg3 pointer-events-none">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={state === 'disabled'}
            className={cn(field({ state, size }), icon != null && 'pl-8')}
            {...props}
          />
        </span>
        {helper != null && (
          <span className={fieldHelper({ state })}>{helper}</span>
        )}
      </div>
    );
  },
);

Field.displayName = 'Field';
