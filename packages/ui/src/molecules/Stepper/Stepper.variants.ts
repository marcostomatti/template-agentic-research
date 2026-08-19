import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Stepper — "current step in a sequence": a controlled index rendered as
 * numbered dots with connectors. Also the rail inside the Wizard.
 *
 * tone/size cover the auth flows' stepper: tone=accent size=sm — 22px
 * dots, 11px mono numerals, border-soft connectors that never fill.
 */
export const stepperDot = cva(
  [
    'inline-flex shrink-0 items-center justify-center rounded-full',
    'font-mono font-bold border',
  ],
  {
    variants: {
      state: {
        done: '',
        active: '',
        upcoming: 'bg-surface-sunk text-fg3',
      },
      tone: { primary: '', accent: '' },
      size: {
        md: 'size-[26px] text-xs',
        sm: 'size-[22px] text-[11px]',
      },
    },
    compoundVariants: [
      { state: 'done', tone: 'primary', class: 'bg-primary text-on-primary border-primary' },
      {
        state: 'active',
        tone: 'primary',
        class:
          'bg-[color-mix(in_oklab,var(--primary)_14%,var(--surface-1))] text-primary border-primary',
      },
      { state: 'upcoming', tone: 'primary', class: 'border-border-strong' },
      { state: 'done', tone: 'accent', class: 'bg-accent text-on-accent border-accent' },
      {
        state: 'active',
        tone: 'accent',
        class:
          'bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-accent border-accent',
      },
      { state: 'upcoming', tone: 'accent', class: 'border-border-soft' },
    ],
    defaultVariants: { state: 'upcoming', tone: 'primary', size: 'md' },
  },
);

export const stepperLabel = cva('whitespace-nowrap', {
  variants: {
    state: {
      done: 'font-medium',
      active: 'font-bold text-fg1',
      upcoming: 'font-medium text-fg3',
    },
    tone: { primary: '', accent: '' },
    size: {
      md: 'text-[12.5px]',
      sm: 'text-xs',
    },
  },
  compoundVariants: [
    { state: 'done', tone: 'primary', class: 'text-fg2' },
    { state: 'done', tone: 'accent', class: 'text-fg1' },
  ],
  defaultVariants: { state: 'upcoming', tone: 'primary', size: 'md' },
});

export const stepperConnector = cva('h-px flex-1', {
  variants: {
    done: { false: '', true: '' },
    tone: { primary: '', accent: '' },
    size: {
      md: 'mx-2.5 min-w-3',
      sm: '',
    },
  },
  compoundVariants: [
    { done: false, tone: 'primary', class: 'bg-border-strong' },
    { done: true, tone: 'primary', class: 'bg-primary' },
    // auth connectors never fill — border-soft in both states
    { tone: 'accent', class: 'bg-border-soft' },
  ],
  defaultVariants: { done: false, tone: 'primary', size: 'md' },
});

export type StepperDotVariants = VariantProps<typeof stepperDot>;
