import { useState, type ReactNode } from 'react';

import { Badge } from '../../../atoms/Badge';
import { Button } from '../../../atoms/Button';
import { IconButton } from '../../../atoms/IconButton';
import { IconTile } from '../../../atoms/IconTile';
import { StrokeIcon } from '../../../lib/icons';
import { CodeInput } from '../../../molecules/CodeInput';
import { OptionCard } from '../../../molecules/OptionCard';
import { AuthHeading, AuthShell } from '../../../templates/AuthShell';
import { preventPlaceholderNav } from '../shared';

const RECOVERY_CODES = [
  '4F8X-K2QM', '9P3R-LZN7', 'BV6T-W1HD', 'X4M9-QY2L',
  'JC7H-RP8K', 'DT5N-BX3F', 'WK6V-2GL9', 'P9Q4-HMTC',
];

const TOTP_SECRET = 'JBSWY3DPEHPK3PXP';

export interface TwoFactorPageProps {
  step?: 'pick' | 'scan' | 'confirm' | 'done';
  /** The QR visual for the scan step — comes from the server in the real flow. */
  qr?: ReactNode;
}

/** Full-page 2FA enrollment — method pick, QR scan, code confirm, recovery codes. */
export const TwoFactorPage = ({ step = 'pick', qr }: TwoFactorPageProps) => {
  const [code, setCode] = useState(step === 'confirm'
    ? '143'
    : '');
  const [method, setMethod] = useState<'totp' | 'passkey'>('totp');

  return (
    <AuthShell eyebrow="security · two-factor" width="xl">
      {step === 'pick' && (
        <>
          <AuthHeading
            title="Add a second factor"
            sub="A second step keeps your account safe even if your password leaks. Pick at least one."
          />
          <div className="flex flex-col gap-2.5">
            <OptionCard
              align="start"
              selected={method === 'totp'}
              onClick={() => setMethod('totp')}
              leading={<IconTile icon={<StrokeIcon name="shield" size={17} />} />}
              title="Authenticator app"
              meta={<Badge tone="accent">recommended</Badge>}
              description="Scan a QR with Authy, 1Password, Google Authenticator — anything that does TOTP."
            />
            <OptionCard
              align="start"
              selected={method === 'passkey'}
              onClick={() => setMethod('passkey')}
              leading={<IconTile tone="primary" icon={<StrokeIcon name="key" size={17} />} />}
              title="Passkey"
              description="Touch ID, Face ID, Windows Hello, or a hardware key. Passwordless and very fast."
            />
          </div>
          <Button variant="primary" block iconLeading={<StrokeIcon name="arrowRight" size={15} />}>
            Continue
          </Button>
        </>
      )}

      {step === 'scan' && (
        <>
          <AuthHeading
            title="Scan with your authenticator"
            sub="Open your authenticator app and add Acme. Use the QR — or paste the secret if your app prefers that."
          />
          <div className="flex flex-col items-center gap-[18px]">
            {qr}
            <div className="flex items-center gap-2 rounded-sm bg-code-bg px-3 py-2 font-mono text-[13px] tracking-[0.04em] text-fg1">
              <StrokeIcon name="key" size={12} className="text-fg3" />
              {TOTP_SECRET}
              <IconButton icon={<StrokeIcon name="copy" size={16} />} label="Copy secret" />
            </div>
          </div>
          <Button variant="primary" block iconLeading={<StrokeIcon name="arrowRight" size={15} />}>
            I've scanned it
          </Button>
        </>
      )}

      {step === 'confirm' && (
        <>
          <AuthHeading
            title="Confirm the code"
            sub="Type the 6-digit code your authenticator is showing right now."
          />
          {/* eslint-disable-next-line jsx-a11y/no-autofocus --
              the code entry is this step's single task; autofocus matches
              the design source and the shipped behavior. */}
          <CodeInput length={6} value={code} onChange={setCode} autoFocus />
          <div className="flex items-center justify-center gap-1.5 font-mono text-xs text-fg3">
            <StrokeIcon name="clock" size={11} /> rotates every 30s
          </div>
          <Button variant="primary" block iconLeading={<StrokeIcon name="check" size={15} />}>
            Verify & turn on
          </Button>
          <a href="#passkey" onClick={preventPlaceholderNav} className="text-center text-[13px] font-semibold text-accent !no-underline">
            Use a passkey instead
          </a>
        </>
      )}

      {step === 'done' && (
        <>
          <div className="flex flex-col items-center gap-3.5">
            <IconTile
              tone="success"
              size="lg"
              shape="circle"
              icon={<StrokeIcon name="shieldCheck" size={32} />}
            />
            <AuthHeading
              title="Two-factor on"
              sub="From now on we'll ask for a code (or a tap) when you sign in from a new device."
            />
          </div>

          <div className="rounded-md border border-border-soft bg-surface-sunk p-3.5">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-fg3">
                recovery codes — save these
              </span>
              <div className="flex gap-1">
                <IconButton icon={<StrokeIcon name="copy" size={16} />} label="Copy all" />
                <IconButton icon={<StrokeIcon name="download" size={16} />} label="Download" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {RECOVERY_CODES.map((c) => (
                <span
                  key={c}
                  className="rounded-sm bg-surface-1 px-2 py-1 font-mono text-xs tracking-[0.04em] text-fg1"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>

          <Button variant="primary" block iconLeading={<StrokeIcon name="arrowRight" size={15} />}>
            Continue to dashboard
          </Button>
        </>
      )}
    </AuthShell>
  );
};

TwoFactorPage.displayName = 'TwoFactorPage';
