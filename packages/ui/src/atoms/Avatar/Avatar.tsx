import { forwardRef, type HTMLAttributes } from 'react';

import { cn, initials } from '../../lib';

import { avatar, avatarStatus, type AvatarVariants } from './Avatar.variants';

export interface AvatarProps
  extends HTMLAttributes<HTMLSpanElement>,
  AvatarVariants {
  /** Identity the mark stands for; initials are derived from it. */
  name: string;
}

export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(
  ({ className, name, size, shape, status, ...props }, ref) => (
    <span
      ref={ref}
      role="img"
      aria-label={name}
      className={cn('relative inline-flex shrink-0', className)}
      {...props}
    >
      <span className={avatar({ size, shape })}>{initials(name)}</span>
      <span className={avatarStatus({ status, size })} aria-hidden />
    </span>
  ),
);

Avatar.displayName = 'Avatar';
