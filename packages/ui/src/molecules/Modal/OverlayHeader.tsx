import type { ReactNode } from 'react';

import { touchable } from '../../atoms/Touchable/Touchable.variants';
import { cn } from '../../lib';

/**
 * The header row Modal and Drawer share:
 * optional eyebrow, display title, and the close affordance.
 */
export interface OverlayHeaderProps {
  title: ReactNode;
  eyebrow?: ReactNode;
  onClose: () => void;
  /** id for the title element, for aria-labelledby wiring. */
  id?: string;
}

export const OverlayHeader = ({ title, eyebrow, onClose, id }: OverlayHeaderProps) => (
  <div className="flex shrink-0 items-start gap-4 border-b border-border-soft px-5 py-[18px]">
    <div className="min-w-0 flex-1">
      {eyebrow != null && (
        <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.08em] text-fg3">
          {eyebrow}
        </div>
      )}
      <h3
        id={id}
        className="m-0 font-display text-[19px] font-bold tracking-[-0.01em] text-fg1"
      >
        {title}
      </h3>
    </div>
    <button
      type="button"
      aria-label="Close"
      onClick={onClose}
      className={cn(
        touchable({ inline: true, rounded: 'md', noBrightness: false }),
        'size-8 shrink-0 justify-center bg-surface-1 border border-border-soft text-fg2',
      )}
    >
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </button>
  </div>
);

OverlayHeader.displayName = 'OverlayHeader';
