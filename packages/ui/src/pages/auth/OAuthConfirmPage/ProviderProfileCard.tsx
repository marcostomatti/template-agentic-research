import { ProviderGlyph, type OAuthProvider } from '../../../atoms/OAuthButton';
import { cn } from '../../../lib';
import { StrokeIcon } from '../../../lib/icons';

// eslint-disable-next-line react-refresh/only-export-components -- demo profile fixtures colocated with the card that renders them
export const PROFILES = {
  github: { name: 'Sam Lin', email: 'sam@example.dev', handle: 'samlin' },
  google: { name: 'Sam Lin', email: 'sam.lin@gmail.com', handle: null },
} as const;

/** Avatar fills: GitHub char-200, Google gold-500 (the original Auth demo profile.color). */
const AVATAR_BG: Record<OAuthProvider, string> = {
  github: 'bg-char-200',
  google: 'bg-gold-500',
};

/** The prefilled what-we-got-from-the-provider card. */
export const ProviderProfileCard = ({ provider }: { provider: OAuthProvider }) => {
  const profile = PROFILES[provider];
  return (
    <div className="flex items-center gap-3 rounded-md border border-border-soft bg-surface-sunk p-3.5">
      <span
        className={cn(
          'relative flex size-11 shrink-0 items-center justify-center rounded-full',
          'font-display text-[19px] font-bold text-cream-50',
          AVATAR_BG[provider],
        )}
      >
        S
        <span className="absolute -right-[3px] -bottom-[3px] flex size-5 items-center justify-center rounded-full border border-border-strong bg-surface-2 text-fg1">
          <ProviderGlyph provider={provider} size={12} />
        </span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-bold text-fg1">{profile.name}</span>
        <span className="font-mono text-[11px] text-fg3">{profile.email}</span>
      </span>
      <StrokeIcon name="check" size={14} className="text-success" />
    </div>
  );
};

ProviderProfileCard.displayName = 'ProviderProfileCard';
