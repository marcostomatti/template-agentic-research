import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Wizard — a controlled multi-step questionnaire: Overlay (portal/trap/
 * escape) + a Stepper rail + the caller's step content. `step` and
 * `answers` live in the parent; each step's validate() gates Continue.
 * No new behavior — only composition.

 */
export const wizardPanel = cva(
  [
    'flex max-h-[calc(100vh-80px)] w-[min(560px,calc(100vw-48px))] flex-col',
    'overflow-hidden rounded-xl border border-border-soft bg-surface-1 shadow-lg',
  ],
);

export type WizardPanelVariants = VariantProps<typeof wizardPanel>;
