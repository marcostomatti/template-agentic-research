import type { Meta, StoryObj } from '@storybook/react-vite';

import { Accordion, AccordionItem } from './Accordion';

const FAQ = [
  {
    id: 'wrapper',
    q: 'What makes something a "wrapper primitive"?',
    a: 'A wrapper owns exactly one role — layout, decoration, or interaction — and nothing else. Touchable owns the press; Card owns the frame; Content owns the stack.',
  },
  {
    id: 'split',
    q: 'When do I split a role out into its own primitive?',
    a: 'The moment a component is juggling two roles and you feel the urge to add a boolean prop to switch between them. That prop is the seam — split there.',
  },
  {
    id: 'controlled',
    q: 'Why is everything "controlled"?',
    a: 'Because state that lives inside a component can\'t be opened from a menu, snapshotted in a test, or driven by a URL. It all lives in the parent, so the component stays a pure function of its props.',
  },
];

const Items = () => (
  <>
    {FAQ.map((f) => (
      <AccordionItem key={f.id} value={f.id} title={f.q}>
        {f.a}
      </AccordionItem>
    ))}
  </>
);

const meta = {
  title: 'Molecules/Accordion',
  component: Accordion,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  argTypes: {
    mode: { control: 'select', options: ['single', 'multiple'] },
  },
  args: { children: <Items /> },
  decorators: [
    (Story) => (
      <div className="mx-auto w-[520px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One-of: opening one closes the rest; first item open. */
export const Default: Story = {
  args: { defaultValue: 'wrapper' },
};

/** Many-of: open as many as you like. */
export const Multiple: Story = {
  args: { mode: 'multiple', defaultValue: ['wrapper', 'controlled'] },
};

/** All collapsed. */
export const Collapsed: Story = {};
