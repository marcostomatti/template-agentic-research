import { forwardRef, type HTMLAttributes } from 'react';

import { Avatar } from '../../atoms/Avatar';
import { cn } from '../../lib';

import { userInline, userInlineHandle } from './KnownEntities.variants';

export interface UserInlineProps extends HTMLAttributes<HTMLSpanElement> {
  /** User id / handle (`sam`). */
  handle: string;
  /** Full name behind the avatar initials; defaults to the handle. */
  name?: string;
}

/**
 * `user-inline` — small avatar + user id/handle (spec:
 * "Known Entities"; rendered reference: the
 * Sessions table "by" column).
 */
export const UserInline = forwardRef<HTMLSpanElement, UserInlineProps>(
  ({ className, handle, name, ...props }, ref) => (
    <span ref={ref} className={cn(userInline(), className)} {...props}>
      <Avatar name={name ?? handle} size="sm" status="none" />
      <span className={userInlineHandle()}>{handle}</span>
    </span>
  ),
);

UserInline.displayName = 'UserInline';
