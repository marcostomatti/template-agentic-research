/**
 * The mascot mark. Sanctioned in-app
 * appearances: EmptyState and the auth screens' BrandLockup
 * (templates/AuthShell) — everywhere else stays mascot-free.
 */
export const TomatoMark = ({ size = 30 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" className="shrink-0" aria-hidden>
    <path
      d="M32 6 C28 8 26 11 26 14 C23 12 20 13 19 15 C20 17 23 18 26 17 C25 20 27 22 30 22 L34 22 C37 22 39 20 38 17 C41 18 44 17 45 15 C44 13 41 12 38 14 C38 11 36 8 32 6 Z"
      className="fill-accent"
    />
    <circle cx="32" cy="38" r="20" className="fill-primary" />
  </svg>
);
