import type { Meta, StoryObj } from '@storybook/react-vite';

import { Skeleton } from './Skeleton';

const meta = {
  title: 'Molecules/Skeleton',
  component: Skeleton,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A bare shimmer line. */
export const Default: Story = {
  args: { className: 'w-[55%]' },
};

/** Loading list rows: avatar + two lines + a pill. */
export const ListRows: Story = {
  render: () => (
    <div className="flex w-[420px] flex-col gap-3.5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-[38px] shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-[7px]">
            <Skeleton className="w-[55%]" />
            <Skeleton className="w-[78%]" />
          </div>
          <Skeleton className="h-[22px] w-[54px]" />
        </div>
      ))}
    </div>
  ),
};
