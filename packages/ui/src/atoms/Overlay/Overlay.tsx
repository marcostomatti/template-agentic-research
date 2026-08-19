import type { ReactNode } from 'react';

import * as Dialog from '@radix-ui/react-dialog';

import { cn } from '../../lib';

import {
  overlay,
  type OverlayDismiss,
  type OverlayVariants,
} from './Overlay.variants';

export interface OverlayProps extends OverlayVariants {
  open: boolean;
  onClose: () => void;
  /** Which affordances dismiss the overlay (Escape / backdrop click). */
  dismiss?: OverlayDismiss;
  /**
   * Focus containment + page scroll-lock. Radix couples both to its modal
   * mode, so turning EITHER off runs the overlay non-modally (no trap, no
   * lock) — an approximation of fully independent flags.
   */
  trapFocus?: boolean;
  lockScroll?: boolean;
  /** Accessible name for the dialog panel. */
  label?: string;
  className?: string;
  children: ReactNode;
}

export const Overlay = ({
  open,
  onClose,
  position,
  backdrop,
  dismiss = 'both',
  trapFocus = true,
  lockScroll = true,
  label,
  className,
  children,
}: OverlayProps) => {
  const canEscape = dismiss === 'both' || dismiss === 'escape';
  const canBackdrop = dismiss === 'both' || dismiss === 'backdrop';
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      modal={trapFocus && lockScroll}
    >
      <Dialog.Portal>
        {/* One element positions the panel AND paints the backdrop
            (container > panel). A plain div, not
            Dialog.Overlay: Radix renders that part only in modal mode, and
            the container must survive trapFocus/lockScroll being off. */}
        <div className={cn(overlay({ position, backdrop }), className)}>
          <Dialog.Content
            aria-label={label}
            className="relative outline-none"
            onEscapeKeyDown={(e) => {
              if (!canEscape) e.preventDefault();
            }}
            onPointerDownOutside={(e) => {
              if (!canBackdrop) e.preventDefault();
            }}
            onInteractOutside={(e) => {
              if (!canBackdrop) e.preventDefault();
            }}
          >
            {children}
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

Overlay.displayName = 'Overlay';
