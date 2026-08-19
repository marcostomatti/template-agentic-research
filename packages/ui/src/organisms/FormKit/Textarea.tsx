import { forwardRef, type TextareaHTMLAttributes } from 'react';

import { cn } from '../../lib';

import { textarea, type TextareaVariants } from './FormKit.variants';

export interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'>,
  TextareaVariants {
  value: string;
  onChange: (value: string) => void;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, value, onChange, invalid, rows = 3, ...props }, ref) => (
    <textarea
      ref={ref}
      value={value}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
      className={cn(textarea({ invalid }), className)}
      {...props}
    />
  ),
);

Textarea.displayName = 'Textarea';
