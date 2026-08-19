import { useId, type ReactNode } from 'react';

import { Button } from '../../atoms/Button';
import { Overlay } from '../../atoms/Overlay';
import { touchable } from '../../atoms/Touchable/Touchable.variants';
import { cn } from '../../lib';
import { Stepper } from '../Stepper';

import { wizardPanel } from './Wizard.variants';

export interface WizardStep<A> {
  key: string;
  /** Body heading. */
  title: string;
  /** Stepper rail label. */
  short: string;
  blurb?: string;
  optional?: boolean;
  /** null = valid; a message gates Continue and reaches render(). */
  validate: (answers: A) => string | null;
  render: (ctx: {
    answers: A;
    set: (key: string, value: unknown) => void;
    error: string | null;
  }) => ReactNode;
}

export interface WizardProps<A> {
  open: boolean;
  steps: readonly WizardStep<A>[];
  step: number;
  answers: A;
  /** Header brand row content (e.g. mark + "New workspace"). */
  heading?: ReactNode;
  onAnswer: (key: string, value: unknown) => void;
  onBack: () => void;
  onNext: () => void;
  onClose: () => void;
  onFinish: () => void;
}

export const Wizard = <A,>({
  open,
  steps,
  step,
  answers,
  heading,
  onAnswer,
  onBack,
  onNext,
  onClose,
  onFinish,
}: WizardProps<A>) => {
  const titleId = useId();
  const current = steps[step];
  if (!current) return null;
  const error = current.validate(answers);
  const isLast = step === steps.length - 1;
  return (
    <Overlay
      open={open}
      onClose={onClose}
      position="center"
      dismiss="escape"
      backdrop="blur"
    >
      <div aria-labelledby={titleId} className={wizardPanel()}>
        {/* header: brand row + the read-only stepper rail */}
        <div className="shrink-0 border-b border-border-soft px-[22px] pb-4 pt-[18px]">
          <div className="mb-4 flex items-center gap-2.5">
            {heading}
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className={cn(
                touchable({ inline: true, rounded: 'md', noBrightness: false }),
                'ml-auto size-[30px] shrink-0 justify-center border border-border-soft bg-surface-1 text-fg2',
              )}
            >
              <svg
                width="16"
                height="16"
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
          </div>
          <Stepper
            items={steps.map((s) => ({ key: s.key, label: s.short }))}
            index={step}
          />
        </div>

        {/* body: the current step */}
        <div className="flex-1 overflow-y-auto px-[22px] pb-5 pt-[22px]">
          <h3
            id={titleId}
            className="m-0 mb-1.5 font-display text-[22px] font-bold tracking-[-0.01em] text-fg1"
          >
            {current.title}
          </h3>
          {current.blurb != null && (
            <p className="m-0 mb-5 text-[13.5px] leading-relaxed text-fg2">
              {current.blurb}
            </p>
          )}
          {current.render({ answers, set: onAnswer, error })}
        </div>

        {/* footer: controlled nav */}
        <div className="flex shrink-0 items-center gap-3 border-t border-border-soft bg-surface-sunk px-[22px] py-3.5">
          <Button variant="secondary" disabled={step === 0} onClick={onBack}>
            Back
          </Button>
          <span className="ml-auto font-mono text-[11.5px] text-fg3">
            {step + 1} / {steps.length}
            {current.optional
              ? ' · optional'
              : ''}
          </span>
          <Button
            variant={isLast
              ? 'primary'
              : 'accent'}
            disabled={error != null}
            onClick={isLast
              ? onFinish
              : onNext}
          >
            {isLast
              ? 'Create workspace'
              : 'Continue'}
          </Button>
        </div>
      </div>
    </Overlay>
  );
};

Wizard.displayName = 'Wizard';
