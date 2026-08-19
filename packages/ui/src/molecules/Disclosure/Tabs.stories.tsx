import type { Meta, StoryObj } from '@storybook/react-vite';

import { Tag } from '../../atoms/Tag';

import { Tabs, TabsContent, TabsList, TabsTrigger } from './Tabs';

const TabIcon = ({ d }: { d: string }) => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="shrink-0"
    aria-hidden
  >
    {d.split('M').filter(Boolean)
      .map((seg, i) => (
        <path key={i} d={`M${seg}`} />
      ))}
  </svg>
);

const home = 'M3 12L12 3l9 9M5 10v10h14V10';
const terminal = 'M4 17l6-6-6-6M12 19h8';
const cpu = 'M4 4h16v16H4zM9 9h6v6H9zM9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M20 9h3M1 15h3M20 15h3';

const meta = {
  title: 'Molecules/Tabs',
  component: Tabs,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="mx-auto w-[560px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Session tabs: strip + one panel, first tab active. */
export const Default: Story = {
  render: () => (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview" icon={<TabIcon d={home} />}>
          Overview
        </TabsTrigger>
        <TabsTrigger value="logs" icon={<TabIcon d={terminal} />}>
          Logs
        </TabsTrigger>
        <TabsTrigger value="tools" icon={<TabIcon d={cpu} />}>
          Tools
        </TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <p className="m-0 text-[13.5px] leading-relaxed text-fg2">
          refactor-bot is splitting the monolith Primitives file into per-role
          wrappers and updating every import across the dashboard kit. Two
          tools active, 34 tests green.
        </p>
      </TabsContent>
      <TabsContent value="logs">
        <pre className="m-0 font-mono text-[12.5px] leading-[1.7] text-fg2">
          <span className="text-fg3">12:04:01</span>  read_file src/Primitives.jsx{'\n'}
          <span className="text-fg3">12:04:03</span>  <span className="text-success">✓</span> split Touchable → Touchable.tsx
        </pre>
      </TabsContent>
      <TabsContent value="tools">
        <div className="flex flex-wrap gap-2">
          {['read_file', 'str_replace', 'grep', 'run_tests'].map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  ),
};

/** Second tab active — mono log panel. */
export const LogsActive: Story = {
  render: () => (
    <Tabs defaultValue="logs">
      <TabsList>
        <TabsTrigger value="overview" icon={<TabIcon d={home} />}>
          Overview
        </TabsTrigger>
        <TabsTrigger value="logs" icon={<TabIcon d={terminal} />}>
          Logs
        </TabsTrigger>
      </TabsList>
      <TabsContent value="overview" />
      <TabsContent value="logs">
        <pre className="m-0 font-mono text-[12.5px] leading-[1.7] text-fg2">
          <span className="text-fg3">12:04:06</span>  str_replace 4 imports{'\n'}
          <span className="text-fg3">12:04:09</span>  run_tests <span className="text-success">34 passing</span>
        </pre>
      </TabsContent>
    </Tabs>
  ),
};
