import type { ReactNode } from 'react';

import { cn } from '../../lib';

/**
 * The left-aligned status slot in a Modal footer (spec:
 * "ModalFooterStatus"). Driven by state changes in the
 * modal content (e.g. the selected tool type in the Tools flow — see
 * the tools-page spec), so it announces politely to assistive tech.
 *
 * Rendered by Modal when `footerStatus` is set; exported for composition in
 * custom footers, following the OverlayHeader internal-component pattern.
 */
export interface ModalFooterStatusProps {
  children: ReactNode;
  className?: string;
}

export const ModalFooterStatus = ({
  children,
  className,
}: ModalFooterStatusProps) => (
  <span
    aria-live="polite"
    className={cn(
      'mr-auto min-w-0 truncate self-center font-mono text-[11px] text-fg3',
      className,
    )}
  >
    {children}
  </span>
);

ModalFooterStatus.displayName = 'ModalFooterStatus';
