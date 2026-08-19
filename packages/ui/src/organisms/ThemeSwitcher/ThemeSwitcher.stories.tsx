import type { Meta, StoryObj } from '@storybook/react-vite';

import { useState } from 'react';

import { ThemeSwitcher, type ThemeName } from './ThemeSwitcher';

/**
 * Ghost theme toggle (the original topbar screen header; app-shell spec: Top
 * Bar): moon in light mode (switch to dark), sun in dark mode. Hidden
 * entirely when the user preference is "system" — the OS drives the
 * theme then.
 */
const meta = {
  title: 'Organisms/ThemeSwitcher',
  component: ThemeSwitcher,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof ThemeSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Light theme shows the moon — the switch-to-dark affordance. */
export const Light: Story = {
  args: { theme: 'light' },
};

/** Dark theme shows the sun. */
export const Dark: Story = {
  args: { theme: 'dark' },
};

const ToggleDemo = () => {
  const [theme, setTheme] = useState<ThemeName>('light');
  return (
    <div className="flex items-center gap-3">
      <ThemeSwitcher theme={theme} onToggle={setTheme} />
      <span className="font-mono text-[11px] text-fg3">theme · {theme}</span>
    </div>
  );
};

/** Controlled toggle round-trip. */
export const Toggles: Story = {
  args: { theme: 'light' },
  render: () => <ToggleDemo />,
};

/** Spec: preference "system" hides the control — it renders nothing. */
export const SystemPreferenceHidden: Story = {
  args: { theme: 'light', preference: 'system' },
  render: (args) => (
    <div className="flex h-10 w-64 items-center justify-center rounded-md border border-dashed border-border-soft text-xs text-fg3">
      <ThemeSwitcher {...args} />
      renders null with preference=system
    </div>
  ),
};
