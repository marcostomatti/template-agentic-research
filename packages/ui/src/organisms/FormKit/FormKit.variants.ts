import { cva, type VariantProps } from 'class-variance-authority';

/**
 * The form kit — every input is the SAME envelope (label + control +
 * hint/error) wrapped around a single interactive control; each control just
 * reads `value` and calls `onChange`. Mirrors
 * the original form-controls demo (+ the .otx-field-control
 * and .otx-range CSS from the original demo shell).
 *
 * Naming reconciliation: the original form-controls demo calls the envelope `Field`, but
 * the library already ships the original children demo Field atom (label + built-in
 * input), so the envelope is `FormField` here. The original demo's `Toggle` is the
 * shipped Switch atom — FormKit composes it rather than re-implementing.
 */

/** The focus ring every text-like control shares (.otx-field-control). */
const CONTROL_FOCUS = [
  'outline-none focus-visible:border-border-focus',
  'focus-visible:shadow-[0_0_0_2px_var(--bg),0_0_0_4px_color-mix(in_oklab,var(--leaf)_55%,transparent)]',
];

export const textInput = cva(
  [
    'h-[42px] w-full rounded-md bg-surface-1 border px-[13px]',
    'font-body text-[14.5px] text-fg1 placeholder:text-fg3',
    ...CONTROL_FOCUS,
  ],
  {
    variants: {
      invalid: {
        false: 'border-border-strong',
        true: 'border-danger',
      },
    },
    defaultVariants: { invalid: false },
  },
);

export const textarea = cva(
  [
    'w-full rounded-md bg-surface-1 border px-[13px] py-[11px] resize-y',
    'font-body text-[14.5px] leading-normal text-fg1 placeholder:text-fg3',
    ...CONTROL_FOCUS,
  ],
  {
    variants: {
      invalid: {
        false: 'border-border-strong',
        true: 'border-danger',
      },
    },
    defaultVariants: { invalid: false },
  },
);

/** The 19px checkbox square. */
export const checkboxBox = cva(
  [
    'mt-px inline-flex size-[19px] shrink-0 items-center justify-center',
    'rounded-[5px] border-[1.5px] transition-colors',
  ],
  {
    variants: {
      checked: {
        false: 'border-border-strong bg-surface-1',
        true: 'border-primary bg-primary',
      },
    },
    defaultVariants: { checked: false },
  },
);

/** Grid the CheckGroup lays its options into. */
export const checkGroup = cva('grid gap-2.5', {
  variants: {
    columns: {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
    },
  },
  defaultVariants: { columns: 1 },
});

/** A radio option row — a bordered card that tints when selected. */
export const radioOption = cva(
  [
    'flex w-full items-center gap-[11px] rounded-md px-[13px] py-[11px]',
    'text-left cursor-pointer border',
  ],
  {
    variants: {
      checked: {
        false: 'border-border-soft bg-surface-1',
        true: 'border-primary bg-[color-mix(in_oklab,var(--primary)_8%,var(--surface-1))]',
      },
    },
    defaultVariants: { checked: false },
  },
);

/** The 18px radio circle. */
export const radioCircle = cva(
  [
    'inline-flex size-[18px] shrink-0 items-center justify-center',
    'rounded-full border-2',
  ],
  {
    variants: {
      checked: {
        false: 'border-border-strong',
        true: 'border-primary',
      },
    },
    defaultVariants: { checked: false },
  },
);

/** The range input (.otx-range) — track fill driven by --pct. */
export const sliderInput = cva([
  'h-1.5 flex-1 cursor-pointer appearance-none rounded-full outline-none',
  'border border-border-soft',
  'bg-[linear-gradient(to_right,var(--primary)_var(--pct,50%),var(--surface-sunk)_var(--pct,50%))]',
  '[&::-webkit-slider-thumb]:appearance-none',
  '[&::-webkit-slider-thumb]:size-[18px]',
  '[&::-webkit-slider-thumb]:rounded-full',
  '[&::-webkit-slider-thumb]:bg-surface-1',
  '[&::-webkit-slider-thumb]:border-2',
  '[&::-webkit-slider-thumb]:border-solid',
  '[&::-webkit-slider-thumb]:border-primary',
  '[&::-webkit-slider-thumb]:shadow-xs',
  '[&::-webkit-slider-thumb]:cursor-pointer',
  '[&::-moz-range-thumb]:size-[18px]',
  '[&::-moz-range-thumb]:rounded-full',
  '[&::-moz-range-thumb]:bg-surface-1',
  '[&::-moz-range-thumb]:border-2',
  '[&::-moz-range-thumb]:border-solid',
  '[&::-moz-range-thumb]:border-primary',
  '[&::-moz-range-thumb]:shadow-xs',
  '[&::-moz-range-thumb]:cursor-pointer',
  'focus-visible:shadow-[0_0_0_2px_var(--bg),0_0_0_4px_color-mix(in_oklab,var(--leaf)_55%,transparent)]',
]);

/** The landed-file chip FileDrop swaps to once a file is set. */
export const fileChip = cva([
  'flex items-center gap-[11px] rounded-md px-[13px] py-[11px]',
  'bg-surface-1 border border-border-soft',
]);

/* ── WS03d additions ("FormKit additions") ────────── */

/**
 * VerboseOption — generalized from the original design ModelOption
 * (the original AgentEditor screen): a bordered option
 * row with radio/checkbox semantics that tints accent when selected.
 * Original uses the accent scale for selection (vs the primary-toned
 * RadioGroup above) — kept as rendered truth of the source screens.
 */
export const verboseOption = cva(
  [
    'flex w-full items-start gap-2.5 rounded-md border px-3 py-2.5',
    'text-left cursor-pointer transition-colors',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ],
  {
    variants: {
      selected: {
        false: 'border-border-soft bg-surface-1',
        true: 'border-accent bg-[color-mix(in_oklab,var(--accent)_8%,var(--surface-1))]',
      },
    },
    defaultVariants: { selected: false },
  },
);

/** VerboseOption's leading control glyph (16px, accent when selected). */
export const verboseControl = cva(
  [
    'relative mt-0.5 inline-flex size-4 shrink-0 items-center',
    'justify-center border-2',
  ],
  {
    variants: {
      mode: {
        radio: 'rounded-full',
        checkbox: 'rounded-[4px]',
      },
      selected: {
        false: 'border-border-strong bg-transparent',
        true: 'border-accent bg-accent text-on-accent',
      },
    },
    defaultVariants: { mode: 'radio', selected: false },
  },
);

/** The mono capability pill on a VerboseOption ("web", "code", …). */
export const verboseCap = cva([
  'rounded-full border border-border-soft bg-surface-sunk',
  'px-[7px] py-px font-mono text-[10px] text-fg3',
]);

/**
 * DecoratedToggle — generalized from the original design ToolPicker rows
 * (the original AgentEditor demo): a bordered row (decoration + title/description +
 * switch) that tints accent when on. The ROW is the switch control; the
 * Switch atom's track/thumb cvas render decoratively inside it.
 */
export const decoratedToggle = cva(
  [
    'flex w-full items-center gap-3 rounded-md border px-3 py-2',
    'text-left cursor-pointer transition-colors',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ],
  {
    variants: {
      checked: {
        false: 'border-border-soft bg-surface-1',
        true: 'border-accent bg-[color-mix(in_oklab,var(--accent)_8%,var(--surface-1))]',
      },
    },
    defaultVariants: { checked: false },
  },
);

/** DecoratedToggleList's group header (mono label + x/y-on indicator). */
export const decoratedToggleHeader = cva([
  'mb-1.5 flex items-center gap-2 font-mono text-[10px]',
  'uppercase tracking-[0.1em] text-fg3',
]);

/**
 * ChipList — the chip-input container (the component spec ChipList):
 * selected chips render IN the container; in multi mode the input stays
 * below them, in single mode the chip takes over until removed.
 */
export const chipListBox = cva([
  'flex w-full flex-col gap-2 rounded-md border border-border-strong',
  'bg-surface-1 px-[13px] py-[9px]',
  'focus-within:border-border-focus',
  'focus-within:shadow-[0_0_0_2px_var(--bg),0_0_0_4px_color-mix(in_oklab,var(--leaf)_55%,transparent)]',
]);

/** A ChipList suggestion row. */
export const chipListOption = cva(
  [
    'flex w-full cursor-pointer items-center gap-2.5 rounded-sm',
    'border-none px-2.5 py-2 text-left text-[13px] text-fg1',
  ],
  {
    variants: {
      active: {
        false: 'bg-transparent',
        true: 'bg-surface-sunk',
      },
    },
    defaultVariants: { active: false },
  },
);

/** The anchored ChipList suggestion panel. */
export const chipListPanel = cva([
  'absolute inset-x-0 top-[calc(100%+6px)] z-popover overflow-hidden',
  'rounded-md border border-border-soft bg-surface-1 p-1 shadow-lg',
]);

/**
 * AvatarSelector — big avatar preview + initials input + color-swatch
 * grid (original design AvatarPicker, the original AgentEditor demo). Tones cover the original
 * AVATAR_COLORS palette.
 */
export const avatarPreview = cva(
  [
    'flex size-[60px] items-center justify-center rounded-md',
    'font-display text-[28px] font-extrabold text-cream-50',
  ],
  {
    variants: {
      tone: {
        primary: 'bg-primary',
        accent: 'bg-accent',
        gold: 'bg-gold-500',
        info: 'bg-info',
        green: 'bg-green-500',
        slate: 'bg-char-200',
      },
    },
    defaultVariants: { tone: 'primary' },
  },
);

/** One color swatch in the AvatarSelector grid. */
export const avatarSwatch = cva(
  'size-[18px] cursor-pointer rounded-full p-0 transition-shadow',
  {
    variants: {
      tone: {
        primary: 'bg-primary',
        accent: 'bg-accent',
        gold: 'bg-gold-500',
        info: 'bg-info',
        green: 'bg-green-500',
        slate: 'bg-char-200',
      },
      selected: {
        false: 'border border-border-soft',
        true: 'border-2 border-fg1 shadow-[0_0_0_2px_var(--surface-2),0_0_0_4px_var(--fg1)]',
      },
    },
    defaultVariants: { tone: 'primary', selected: false },
  },
);

export type VerboseOptionVariants = VariantProps<typeof verboseOption>;
export type VerboseControlVariants = VariantProps<typeof verboseControl>;
export type DecoratedToggleVariants = VariantProps<typeof decoratedToggle>;
export type ChipListOptionVariants = VariantProps<typeof chipListOption>;
export type AvatarSelectorTone = NonNullable<
  VariantProps<typeof avatarPreview>['tone']
>;

export type TextInputVariants = VariantProps<typeof textInput>;
export type TextareaVariants = VariantProps<typeof textarea>;
export type CheckGroupVariants = VariantProps<typeof checkGroup>;
