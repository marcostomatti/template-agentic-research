import type { HTMLAttributes } from 'react';

import { cn } from '../../lib';

import { passwordStrengthSegment } from './PasswordStrength.variants';

/** Meter colors by score: 1 danger, 2–3 gold, 4–5 success. */
const FILL_BY_SCORE = ['danger', 'gold', 'gold', 'success', 'success'] as const;

export interface PasswordStrengthProps extends HTMLAttributes<HTMLDivElement> {
  /** 0 (empty) … 5 — from passwordStrength() in src/lib. */
  score: number;
  label: string;
}

export const PasswordStrength = ({
  className,
  score,
  label,
  ...props
}: PasswordStrengthProps) => (
  <div className={cn('flex items-center gap-1.5', className)} {...props}>
    {[1, 2, 3, 4, 5].map((i) => (
      <span
        key={i}
        className={passwordStrengthSegment({
          fill: i <= score
            ? FILL_BY_SCORE[score - 1]
            : 'empty',
        })}
      />
    ))}
    <span className="min-w-10 font-mono text-[11px] text-fg3">{label}</span>
  </div>
);

PasswordStrength.displayName = 'PasswordStrength';
