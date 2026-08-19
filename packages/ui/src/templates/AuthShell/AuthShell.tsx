import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../lib';

import {
  authCard,
  authEyebrow,
  authFooter,
  authShell,
  type AuthCardVariants,
} from './AuthShell.variants';
import { BrandLockup } from './BrandLockup';

export interface AuthShellProps
  extends HTMLAttributes<HTMLDivElement>,
  AuthCardVariants {
  /** Mono kicker as the card's first line ("welcome back", "step 1 of 2"). */
  eyebrow?: string;
  /** Line below the card (sign-up/sign-in cross-links). */
  footer?: ReactNode;
  /** Brand lockup link target. */
  brandHref?: string;
}

export const AuthShell = forwardRef<HTMLDivElement, AuthShellProps>(
  ({ className, eyebrow, footer, width, brandHref, children, ...props }, ref) => (
    <div ref={ref} className={cn(authShell(), className)} {...props}>
      <BrandLockup href={brandHref} />
      <section className={authCard({ width })}>
        {eyebrow != null && <div className={authEyebrow()}>{eyebrow}</div>}
        {children}
      </section>
      {footer != null && <div className={authFooter()}>{footer}</div>}
    </div>
  ),
);

AuthShell.displayName = 'AuthShell';
