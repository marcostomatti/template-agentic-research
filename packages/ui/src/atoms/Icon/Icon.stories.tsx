import type { Meta, StoryObj } from '@storybook/react-vite';

import { Icon } from './Icon';

const meta = {
  title: 'Atoms/Icon',
  component: Icon,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    accent: {
      control: 'select',
      options: [
        'inherit',
        'accent',
        'success',
        'warning',
        'danger',
        'info',
        'muted',
      ],
    },
    bg: {
      control: 'select',
      options: ['none', 'soft', 'accent', 'success', 'warning', 'danger', 'info'],
    },
  },
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Spec: an icon defined via a string — `<Icon name="terminal" />`. */
export const Default: Story = {
  args: { name: 'terminal' },
};

/** Spec: `size` prop — glyph px size. */
export const Sizes: Story = {
  args: { name: 'terminal' },
  render: (args) => (
    <div className="flex items-center gap-3 text-fg1">
      <Icon {...args} size={12} />
      <Icon {...args} size={16} />
      <Icon {...args} size={20} />
      <Icon {...args} size={28} />
    </div>
  ),
};

/** Spec: `accent` — semantic foreground tones. */
export const Accents: Story = {
  args: { name: 'zap' },
  render: (args) => (
    <div className="flex items-center gap-3 text-fg1">
      <Icon {...args} accent="inherit" />
      <Icon {...args} accent="accent" />
      <Icon {...args} accent="success" />
      <Icon {...args} accent="warning" />
      <Icon {...args} accent="danger" />
      <Icon {...args} accent="info" />
      <Icon {...args} accent="muted" />
    </div>
  ),
};

/** Spec: `bg-color` — a soft tile behind the glyph. */
export const Backgrounds: Story = {
  args: { name: 'git-branch' },
  render: (args) => (
    <div className="flex items-center gap-3 text-fg1">
      <Icon {...args} bg="soft" accent="muted" />
      <Icon {...args} bg="accent" accent="accent" />
      <Icon {...args} bg="success" accent="success" />
      <Icon {...args} bg="warning" accent="warning" />
      <Icon {...args} bg="danger" accent="danger" />
      <Icon {...args} bg="info" accent="info" />
    </div>
  ),
};

/**
 * Kebab-case names resolve to the full lucide set — including alias names
 * like `help-circle` (→ circle-question-mark), which resolve through the
 * exact `dynamicIconImports` key rather than a naive Pascal conversion.
 */
export const NameGallery: Story = {
  args: { name: 'terminal' },
  render: () => (
    <div className="flex items-center gap-3 text-fg2">
      <Icon name="terminal" />
      <Icon name="git-branch" />
      <Icon name="ellipsis-vertical" />
      <Icon name="chevrons-up-down" />
      <Icon name="circle-check" />
      <Icon name="triangle-alert" />
      <Icon name="help-circle" />
    </div>
  ),
};
