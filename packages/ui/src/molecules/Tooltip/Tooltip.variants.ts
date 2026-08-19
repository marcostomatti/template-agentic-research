import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Tooltip — an anchored transient on hover/focus; a Popover cousin on the
 * Toast's dark chrome.
 *
 * Anchoring/hover/focus behavior is Radix's; enter/leave motion is
 * deferred to the motion pass.
 */
export const tooltip = cva(
  [
    'z-popover rounded-sm bg-char-800 px-2.5 py-1.5',
    'text-xs font-medium text-cream-50 whitespace-nowrap shadow-md select-none',
  ],
);

export type TooltipVariants = VariantProps<typeof tooltip>;
