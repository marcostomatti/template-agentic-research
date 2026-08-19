import type { ReactNode } from 'react';

import { cn } from '../../lib';
import { StrokeIcon } from '../../lib/icons';

export interface FormFieldProps {
  label?: ReactNode;
  /** Right-aligned companion on the label row (auth's "Forgot?" link). */
  labelEnd?: ReactNode;
  /** Shown under the control when there's no error. */
  hint?: ReactNode;
  /**
   * 'above' renders the hint between label and control — the auth screens'
   * layout (the original Shared screen Field). Default
   * 'below' keeps the original form-kit chapter's placement.
   */
  hintPlacement?: 'below' | 'above';
  /** Replaces the below-hint and turns the message danger-toned. */
  error?: ReactNode;
  htmlFor?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * The shared envelope — Field is to inputs what Touchable is to buttons:
 * it owns labelling, the hint/error slot and the controlled-value posture,
 * so no control re-implements them. Swap the control in the middle and
 * everything else comes along unchanged (the original form-controls demo).
 */
export const FormField = ({
  label,
  labelEnd,
  hint,
  hintPlacement = 'below',
  error,
  htmlFor,
  required,
  className,
  children,
}: FormFieldProps) => (
  <div className={cn('flex flex-col gap-[7px]', className)}>
    {(label != null || labelEnd != null) && (
      <span className="flex items-center justify-between gap-2">
        <label
          htmlFor={htmlFor}
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-fg1"
        >
          {label}
          {required && <span className="text-danger">*</span>}
        </label>
        {labelEnd}
      </span>
    )}
    {hintPlacement === 'above' && hint != null && (
      <span className="-mt-0.5 text-xs leading-normal text-fg3">{hint}</span>
    )}
    {children}
    {error != null
      ? (
        <span className="inline-flex items-center gap-[5px] text-xs text-danger">
          <StrokeIcon name="alertTriangle" size={13} />
          {error}
        </span>
      )
      : (
        hintPlacement === 'below' &&
      hint != null && <span className="text-xs text-fg3">{hint}</span>
      )}
  </div>
);

FormField.displayName = 'FormField';
