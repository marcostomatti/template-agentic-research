import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Disclosure — Accordion and Tabs are one state machine ("which ids are
 * open?"); only the selection rule and the chrome differ. Radix owns the
 * machine (Accordion single/multiple, Tabs = single that never empties);
 * these variants are the shared chrome.
 */
export const disclosureFrame = cva(
  'overflow-hidden rounded-lg border border-border-soft bg-surface-1',
);

export const accordionTrigger = cva(
  [
    'flex w-full cursor-pointer items-center gap-3 px-[17px] py-[15px] text-left',
    'bg-transparent data-[state=open]:bg-surface-sunk',
  ],
);

export const tabsList = cva(
  'flex gap-0.5 border-b border-border-soft bg-surface-sunk px-2 pt-1.5',
);

export const tabsTrigger = cva(
  [
    'inline-flex items-center gap-[7px] rounded-t-md px-3.5 py-[9px] text-[13.5px]',
    '-mb-px border-b-2 cursor-pointer',
    'text-fg3 font-medium border-transparent [&_svg]:text-fg3',
    'data-[state=active]:bg-surface-1 data-[state=active]:text-fg1',
    'data-[state=active]:font-bold data-[state=active]:border-primary',
    'data-[state=active]:[&_svg]:text-primary',
  ],
);

export type DisclosureFrameVariants = VariantProps<typeof disclosureFrame>;
