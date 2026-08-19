import type { ReactNode } from 'react';

import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import { cn } from '../../lib';

import {
  passkeyPrompt,
  passkeyPromptIndicator,
} from './PasskeyPrompt.variants';

export interface PasskeyPromptProps {
  title?: ReactNode;
  description?: ReactNode;
  /**
   * Renders the cancel affordance — the browser prompt can be abandoned
   * and the flow must offer a way back while WebAuthn is pending.
   */
  onCancel?: () => void;
  cancelLabel?: string;
  className?: string;
}

/**
 * PasskeyPrompt (the original Profile screen; decision D5): the
 * waiting state shown after "add passkey" while the BROWSER runs its
 * WebAuthn interaction — a pulsing key indicator, instruction copy, and
 * an optional cancel affordance. Fits the auth flow as a TwoFactorPage
 * step candidate between the method pick and the done splash (app
 * wiring is WS08 scope — this ships only the component).
 */
export const PasskeyPrompt = ({
  title = 'We\'ll ask your browser to register a passkey',
  description = 'Your device picks the method — Touch ID, Face ID, Windows Hello, or your hardware key. Acme never sees the secret.',
  onCancel,
  cancelLabel = 'Cancel',
  className,
}: PasskeyPromptProps) => (
  <div role="status" className={cn(passkeyPrompt(), className)}>
    <span className={passkeyPromptIndicator()} aria-hidden>
      <Icon name="key-round" size={30} />
    </span>
    <div className="max-w-[380px]">
      <div className="mb-1.5 font-display text-lg font-bold text-fg1">
        {title}
      </div>
      <div className="text-[13px] leading-[1.55] text-fg2">{description}</div>
    </div>
    {onCancel != null && (
      <Button variant="ghost" size="sm" onClick={onCancel}>
        {cancelLabel}
      </Button>
    )}
  </div>
);

PasskeyPrompt.displayName = 'PasskeyPrompt';
