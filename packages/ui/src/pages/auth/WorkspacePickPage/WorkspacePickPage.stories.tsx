import type { Meta, StoryObj } from '@storybook/react-vite';

import { WorkspacePickPage } from './WorkspacePickPage';

/** Sign-up step 2 of 2 — invited picker or the seeded self-serve workspace. */
const meta = {
  title: 'Pages/Auth/WorkspacePick',
  component: WorkspacePickPage,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof WorkspacePickPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Open invites — pick one, or start fresh. */
export const Invited: Story = {};

/** No invites — a default workspace was seeded. */
export const SelfServe: Story = { args: { kind: 'fresh' } };
