import type { Meta, StoryObj } from '@storybook/react-vite';

import { GridTiles } from '../../stories/fixtures';
import { Grid } from '../Grid';

import { GridItem } from './GridItem';

/** Highlighted span tile. */
const SpanTile = ({ label }: { label: string }) => (
  <span className="h-[56px] rounded-md bg-[color-mix(in_oklab,var(--primary)_14%,var(--surface-1))] border border-[color-mix(in_oklab,var(--primary)_45%,transparent)] flex items-center justify-center text-primary font-mono text-xs font-semibold">
    {label}
  </span>
);

const meta = {
  title: 'Atoms/GridItem',
  component: GridItem,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  argTypes: {
    span: { control: 'select', options: ['1', '2', '3', 'full'] },
    align: { control: 'select', options: ['auto', 'start', 'center', 'stretch'] },
  },
  // A 3-column grid, the GridItem first, then filler.
  decorators: [
    (Story) => (
      <Grid cols="3" gap="sm">
        <Story />
        <GridTiles count={4} />
      </Grid>
    ),
  ],
} satisfies Meta<typeof GridItem>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Defaults: span 1, self-auto — indistinguishable from a plain child. */
export const Default: Story = {
  args: { children: <SpanTile label="span 1" /> },
};

export const Span2: Story = {
  args: { span: '2', children: <SpanTile label="span 2" /> },
};

export const Span3: Story = {
  args: { span: '3', children: <SpanTile label="span 3" /> },
};

export const SpanFull: Story = {
  args: { span: 'full', children: <SpanTile label="span full" /> },
};

export const AlignCenter: Story = {
  args: { align: 'center', children: <SpanTile label="centered" /> },
};
