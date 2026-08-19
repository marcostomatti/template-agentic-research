import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../../atoms';

import { SectionCard } from './SectionCard';

const meta = {
  title: 'Molecules/SectionCard',
  component: SectionCard,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SectionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The original-design `Section` shell (the original Shared demo): header with display-font title
 * + subtitle, divider, 18px-padded body. Fidelity source: any section
 * card in the original usage screen.
 */
export const Default: Story = {
  args: {
    title: 'Tool calls',
    subtitle: '4,734 calls',
    children: <div className="text-sm text-fg2">Chart content goes here.</div>,
  },
};

/** Header `action` slot — filters, legends, buttons on the right. */
export const WithAction: Story = {
  args: {
    title: 'Spend by agent',
    subtitle: '8 active',
    action: (
      <Button variant="secondary" size="sm">
        Export
      </Button>
    ),
    children: <div className="text-sm text-fg2">Chart content goes here.</div>,
  },
};

/**
 * `padded={false}` — full-bleed body for row lists (original Section's
 * `padded` prop, used by the "Top sessions by spend" card).
 */
export const FullBleed: Story = {
  args: {
    title: 'Top sessions by spend',
    subtitle: 'Click through for the full transcript',
    padded: false,
    children: (
      <div className="divide-y divide-border-soft">
        {['auth-refactor', 'schema-migration', 'image-pipeline'].map((s) => (
          <div key={s} className="px-[18px] py-3 text-sm text-fg1">
            {s}
          </div>
        ))}
      </div>
    ),
  },
};

/**
 * Footer line with optional divider (UsageChart header/footer contract —
 * spec: the component spec).
 */
export const WithFooter: Story = {
  args: {
    title: 'Tool calls',
    footer: 'Counts include retries.',
    footerDivider: true,
    children: <div className="text-sm text-fg2">Chart content goes here.</div>,
  },
};

/** Headerless — bare card shell. */
export const Headerless: Story = {
  args: {
    children: <div className="text-sm text-fg2">Body only.</div>,
  },
};
