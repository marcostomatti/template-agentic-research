import { useId, type ReactNode } from 'react';

import { Overlay, type OverlayDismiss, type OverlayVariants } from '../../atoms/Overlay';
import { cn } from '../../lib';

import { modalPanel, type ModalPanelVariants } from './Modal.variants';
import { ModalFooterStatus } from './ModalFooterStatus';
import { OverlayHeader } from './OverlayHeader';

export interface ModalProps extends ModalPanelVariants {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  eyebrow?: ReactNode;
  footer?: ReactNode;
  /**
   * Status string slot, footer-left (spec: "ModalFooterStatus") — driven
   * by state changes in the modal content. Renders the footer row even
   * without `footer` actions.
   */
  footerStatus?: ReactNode;
  dismiss?: OverlayDismiss;
  backdrop?: OverlayVariants['backdrop'];
  className?: string;
  children: ReactNode;
}

export const Modal = ({
  open,
  onClose,
  title,
  eyebrow,
  footer,
  footerStatus,
  size,
  dismiss,
  backdrop,
  className,
  children,
}: ModalProps) => {
  const titleId = useId();
  return (
    <Overlay
      open={open}
      onClose={onClose}
      position="center"
      dismiss={dismiss}
      backdrop={backdrop}
    >
      <div
        aria-labelledby={title != null
          ? titleId
          : undefined}
        className={cn(modalPanel({ size }), className)}
      >
        {title != null && (
          <OverlayHeader
            id={titleId}
            title={title}
            eyebrow={eyebrow}
            onClose={onClose}
          />
        )}
        <div className="overflow-y-auto p-5 text-sm leading-relaxed text-fg2">
          {children}
        </div>
        {(footer != null || footerStatus != null) && (
          <div className="flex shrink-0 justify-end gap-2.5 border-t border-border-soft bg-surface-sunk px-5 py-3.5">
            {footerStatus != null && (
              <ModalFooterStatus>{footerStatus}</ModalFooterStatus>
            )}
            {footer}
          </div>
        )}
      </div>
    </Overlay>
  );
};

Modal.displayName = 'Modal';
