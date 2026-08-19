import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

import { touchable } from '../../atoms/Touchable/Touchable.variants';
import { cn } from '../../lib';

import {
  banner,
  bannerAction,
  bannerIcon,
  type BannerVariants,
} from './Banner.variants';
import { ToneIcon } from './ToneIcon';

export interface BannerProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'title'>,
  BannerVariants {
  title?: ReactNode;
  /** Optional tone-colored action (label + onClick). */
  action?: { label: string; onClick: () => void };
  /** When set, renders the dismiss affordance. */
  onClose?: () => void;
}

export const Banner = forwardRef<HTMLDivElement, BannerProps>(
  ({ className, tone = 'info', title, action, onClose, children, ...props }, ref) => (
    <div ref={ref} className={cn(banner({ tone }), className)} {...props}>
      <span className={bannerIcon({ tone })}>
        <ToneIcon tone={tone ?? 'info'} />
      </span>
      <div className="min-w-0 flex-1">
        {title != null && (
          <div className="mb-0.5 text-[13.5px] font-bold text-fg1">{title}</div>
        )}
        <div className="text-[13px] leading-normal text-fg2">{children}</div>
      </div>
      {action != null && (
        <button
          type="button"
          onClick={action.onClick}
          className={cn(
            touchable({ inline: true, rounded: 'md', noBrightness: false }),
            bannerAction({ tone }),
          )}
        >
          {action.label}
        </button>
      )}
      {onClose != null && (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onClose}
          className={cn(
            touchable({ inline: true, rounded: 'sm', noBrightness: false }),
            'size-[26px] shrink-0 justify-center self-start border-none bg-transparent text-fg3',
          )}
        >
          <svg
            width="15"
            height="15"
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
      )}
    </div>
  ),
);

Banner.displayName = 'Banner';
