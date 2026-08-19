import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../lib';

import {
  sectionCard,
  sectionCardBody,
  sectionCardFooter,
  sectionCardHeader,
  sectionCardSubtitle,
  sectionCardTitle,
  type SectionCardBodyVariants,
} from './SectionCard.variants';

export interface SectionCardProps
  extends HTMLAttributes<HTMLElement>,
  SectionCardBodyVariants {
  /** Header title (display font). Header row renders when title or action is present. */
  title?: string;
  /** Small greyed subtitle under the title. */
  subtitle?: ReactNode;
  /** Right side of the header row (filters, legends, buttons). */
  action?: ReactNode;
  /** Small footer text line (UsageChart contract). */
  footer?: ReactNode;
  /** Divider above the footer line. */
  footerDivider?: boolean;
}

/**
 * SectionCard — the dashboard section/chart card shell (original design `Section`,
 * the original Shared screen). Chart molecules
 * (UsageChart, CalendarHeatmap, LineChart, FilesChanged) compose on it so
 * the header/body/footer chrome stays in one place.
 */
export const SectionCard = forwardRef<HTMLElement, SectionCardProps>(
  (
    {
      className,
      title,
      subtitle,
      action,
      footer,
      footerDivider = false,
      padded,
      children,
      ...props
    },
    ref,
  ) => (
    <section ref={ref} className={cn(sectionCard(), className)} {...props}>
      {(title != null || action != null) && (
        <header className={sectionCardHeader()}>
          <div>
            {title != null && <div className={sectionCardTitle()}>{title}</div>}
            {subtitle != null && (
              <div className={sectionCardSubtitle()}>{subtitle}</div>
            )}
          </div>
          {action != null && <div className="flex gap-2">{action}</div>}
        </header>
      )}
      <div className={sectionCardBody({ padded })}>{children}</div>
      {footer != null && (
        <div className={sectionCardFooter({ divider: footerDivider })}>
          {footer}
        </div>
      )}
    </section>
  ),
);

SectionCard.displayName = 'SectionCard';
