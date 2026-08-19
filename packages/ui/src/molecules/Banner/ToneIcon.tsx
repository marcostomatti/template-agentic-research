/**
 * The tone scale's icons: the scale owns hue, icon and
 * meaning together — status surfaces render the icon for their tone rather
 * than accepting arbitrary glyphs. Shared by Banner and Toast.
 */
export type FeedbackTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const PATHS: Record<FeedbackTone, string> = {
  success: 'M20 6L9 17l-5-5',
  warning:
    'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01',
  danger: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 8v4M12 16h.01',
  info: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 16v-4M12 8h.01',
  neutral: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2',
};

export const ToneIcon = ({
  tone,
  size = 18,
}: {
  tone: FeedbackTone;
  size?: number;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="shrink-0"
    aria-hidden
  >
    {PATHS[tone].split('M').filter(Boolean)
      .map((seg, i) => (
        <path key={i} d={`M${seg}`} />
      ))}
  </svg>
);
