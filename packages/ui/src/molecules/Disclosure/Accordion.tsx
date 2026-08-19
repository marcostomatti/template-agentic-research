import * as RadixAccordion from '@radix-ui/react-accordion';
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react';

import { touchable } from '../../atoms/Touchable/Touchable.variants';
import { cn } from '../../lib';

import { accordionTrigger, disclosureFrame } from './Disclosure.variants';

/**
 * Accordion — disclosure as a vertical stack. `mode` picks the selection
 * rule: 'single' (one-of, opening one closes the rest) or 'multiple'
 * (many-of).
 */
export type AccordionProps = {
  mode?: 'single' | 'multiple';
  /** Initially-open item value(s). */
  defaultValue?: string | string[];
  className?: string;
  children: ReactNode;
};

export const Accordion = ({
  mode = 'single',
  defaultValue,
  className,
  children,
}: AccordionProps) => {
  const frame = cn(disclosureFrame(), className);
  return mode === 'single'
    ? (
      <RadixAccordion.Root
        type="single"
        collapsible
        defaultValue={typeof defaultValue === 'string'
          ? defaultValue
          : undefined}
        className={frame}
      >
        {children}
      </RadixAccordion.Root>
    )
    : (
      <RadixAccordion.Root
        type="multiple"
        defaultValue={Array.isArray(defaultValue)
          ? defaultValue
          : undefined}
        className={frame}
      >
        {children}
      </RadixAccordion.Root>
    );
};

Accordion.displayName = 'Accordion';

export interface AccordionItemProps
  extends Omit<ComponentPropsWithoutRef<typeof RadixAccordion.Item>, 'title'> {
  title: ReactNode;
}

export const AccordionItem = forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ className, title, children, ...props }, ref) => (
    <RadixAccordion.Item
      ref={ref}
      className={cn('border-b border-border-soft last:border-b-0', className)}
      {...props}
    >
      <RadixAccordion.Header asChild>
        <h3 className="m-0">
          <RadixAccordion.Trigger
            className={cn(
              touchable({ noBrightness: false, rounded: 'none' }),
              accordionTrigger(),
              'group',
            )}
          >
            <span className="min-w-0 flex-1 text-[14.5px] font-semibold text-fg1">
              {title}
            </span>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 text-fg3 group-data-[state=open]:rotate-180 group-data-[state=open]:text-primary"
              aria-hidden
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </RadixAccordion.Trigger>
        </h3>
      </RadixAccordion.Header>
      <RadixAccordion.Content className="overflow-hidden">
        <p className="m-0 px-[17px] pb-4 text-[13.5px] leading-relaxed text-fg2">
          {children}
        </p>
      </RadixAccordion.Content>
    </RadixAccordion.Item>
  ),
);

AccordionItem.displayName = 'AccordionItem';
