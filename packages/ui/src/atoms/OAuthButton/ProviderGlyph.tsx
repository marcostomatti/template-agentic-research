export type OAuthProvider = 'google' | 'github';

export interface ProviderGlyphProps {
  provider: OAuthProvider;
  size?: number;
}

/** The provider marks — Google's four-color G, GitHub's mono mark. */
export const ProviderGlyph = ({ provider, size = 18 }: ProviderGlyphProps) => {
  if (provider === 'google') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0" aria-hidden>
        <path fill="#EA4335" d="M12 5.5c1.7 0 3.3.6 4.5 1.7l3.3-3.3C17.7 1.9 15 1 12 1 7.3 1 3.3 3.7 1.4 7.6l3.9 3C6.2 7.5 8.9 5.5 12 5.5z" />
        <path fill="#4285F4" d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.2c-.3 1.5-1.1 2.7-2.3 3.5v2.9h3.7c2.2-2 3.4-4.9 3.4-8.6z" />
        <path fill="#FBBC05" d="M5.3 14.4c-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9V7.6H1.4C.5 9 0 10.4 0 12s.5 3 1.4 4.4l3.9-2.9z" />
        <path fill="#34A853" d="M12 22.5c3 0 5.5-1 7.4-2.6l-3.7-2.9c-1 .7-2.3 1.1-3.7 1.1-3.1 0-5.8-2-6.7-4.7l-3.9 3C3.3 20.3 7.3 22.5 12 22.5z" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0" aria-hidden>
      <path
        fill="currentColor"
        d="M12 .5a12 12 0 00-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.2-.8.1-.8.1-.8 1.2.1 1.9 1.3 1.9 1.3 1.1 1.9 2.9 1.4 3.6 1 .1-.8.4-1.4.8-1.7-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.6 11.6 0 016 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.3v3.4c0 .3.2.7.8.6A12 12 0 0012 .5z"
      />
    </svg>
  );
};
