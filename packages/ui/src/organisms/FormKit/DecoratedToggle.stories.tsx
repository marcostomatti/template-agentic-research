import type { Meta, StoryObj } from '@storybook/react-vite';

import { useState } from 'react';

import { Badge } from '../../atoms/Badge';
import { Icon } from '../../atoms/Icon';

import {
  DecoratedToggle,
  DecoratedToggleList,
  type DecoratedToggleOption,
} from './DecoratedToggle';

/**
 * Bordered toggle rows generalized from the original design ToolPicker
 * (the original AgentEditor demo; spec: the component spec): decoration +
 * title/description + switch, tone change when on; the list groups rows
 * under a mono header with the x/y-on indicator. the tools-page spec reuses the
 * single row for auto-start and the list for skill toggles.
 */
const meta = {
  title: 'Organisms/DecoratedToggle',
  component: DecoratedToggleList,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof DecoratedToggleList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Original design TOOL_GROUPS.code seed (the original Agents demo). */
const CODE_TOOLS: DecoratedToggleOption[] = [
  { id: 'fs', decoration: <Icon name="folder" size={16} />, title: 'fs', description: 'Read & write project files' },
  { id: 'shell', decoration: <Icon name="terminal" size={16} />, title: 'shell', description: 'Execute shell commands' },
  { id: 'git', decoration: <Icon name="git-branch" size={16} />, title: 'git', description: 'Branch, commit, push' },
  { id: 'tests', decoration: <Icon name="shield-check" size={16} />, title: 'tests', description: 'Run the test suite' },
];

const WEB_TOOLS: DecoratedToggleOption[] = [
  { id: 'web.fetch', decoration: <Icon name="globe" size={16} />, title: 'web.fetch', description: 'Fetch URLs' },
  { id: 'web.search', decoration: <Icon name="search" size={16} />, title: 'web.search', description: 'Run search queries' },
];

const GroupedDemo = () => {
  const [on, setOn] = useState(['fs', 'shell', 'git']);
  return (
    <div className="flex w-[420px] flex-col gap-3.5">
      <DecoratedToggleList
        title="code"
        options={CODE_TOOLS}
        value={on}
        onChange={setOn}
      />
      <DecoratedToggleList
        title="web"
        options={WEB_TOOLS}
        value={on}
        onChange={setOn}
      />
    </div>
  );
};

/**
 * Spec: grouped toggles — group title with the x/y-on indicator, rows
 * tinting accent when on. The whole row is ONE switch control (see the
 * component's a11y note).
 */
export const Grouped: Story = {
  args: { title: 'code', options: CODE_TOOLS, value: ['fs'], onChange: () => {} },
  render: () => <GroupedDemo />,
};

const SingleDemo = () => {
  const [auto, setAuto] = useState(true);
  return (
    <div className="w-[420px]">
      <DecoratedToggle
        decoration={<Icon name="server" size={16} />}
        title="Auto-start"
        meta={<Badge tone="accent" size="sm">recommended</Badge>}
        description="Connect to the MCP server when this workspace boots up."
        checked={auto}
        onChange={setAuto}
      />
    </div>
  );
};

/**
 * A standalone row (the tools-page spec "Auto-start"): title meta slot carrying
 * the recommended badge, on by default.
 */
export const SingleRow: Story = {
  args: { title: 'mcp', options: [], value: [], onChange: () => {} },
  render: () => <SingleDemo />,
};

/** Disabled rows are half-opacity and ignore interaction. */
export const WithDisabled: Story = {
  args: {
    title: 'code',
    options: CODE_TOOLS.map((o, i) => (i === 3
      ? { ...o, disabled: true }
      : o)),
    value: ['fs', 'tests'],
    onChange: () => {},
  },
  render: (args) => (
    <div className="w-[420px]">
      <DecoratedToggleList {...args} />
    </div>
  ),
};
