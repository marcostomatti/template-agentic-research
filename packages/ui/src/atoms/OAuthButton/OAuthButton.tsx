import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cn } from '../../lib';

import { oauthButton } from './OAuthButton.variants';
import { ProviderGlyph, type OAuthProvider } from './ProviderGlyph';

const DEFAULT_LABELS: Record<OAuthProvider, string> = {
  google: 'Continue with Google',
  github: 'Continue with GitHub',
};

export interface OAuthButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'children'> {
  provider: OAuthProvider;
  /** Defaults to "Continue with {Provider}". */
  label?: string;
}

export const OAuthButton = forwardRef<HTMLButtonElement, OAuthButtonProps>(
  ({ className, provider, label, ...props }, ref) => (
    <button ref={ref} type="button" className={cn(oauthButton(), className)} {...props}>
      <ProviderGlyph provider={provider} size={18} />
      <span>{label ?? DEFAULT_LABELS[provider]}</span>
    </button>
  ),
);

OAuthButton.displayName = 'OAuthButton';
