import type { Meta, StoryObj } from '@storybook/react-vite';

import { useState, type ComponentProps } from 'react';

import { Button } from '../../atoms/Button';

import { Modal } from './Modal';

/** Demo confirm body: copy + a danger-washed inline note. */
const DemoBody = () => (
  <div className="flex flex-col gap-3">
    <p className="m-0">
      This stops <strong className="text-fg1">refactor-bot</strong> and removes
      its session history. Running tool calls are cancelled at the next
      checkpoint.
    </p>
    <div className="flex items-center gap-2.5 rounded-md border border-danger-tint bg-danger-wash px-3 py-[11px]">
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 text-danger"
        aria-hidden
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />
      </svg>
      <span className="text-[13px] text-fg1">This can&apos;t be undone.</span>
    </div>
  </div>
);

const meta = {
  title: 'Molecules/Modal',
  component: Modal,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    backdrop: { control: 'select', options: ['dim', 'blur', 'none'] },
  },
  args: {
    open: true,
    onClose: () => {},
    eyebrow: 'Confirm',
    title: 'Delete refactor-bot?',
    children: <DemoBody />,
    footer: (
      <>
        <Button variant="ghost">Cancel</Button>
        <Button variant="danger">Delete agent</Button>
      </>
    ),
  },
  decorators: [
    (Story) => (
      <div className="h-dvh bg-bg p-10 font-mono text-xs text-fg3">
        page content behind the modal
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Defaults: md width, dim backdrop, header + footer rows. */
export const Default: Story = {};

export const Small: Story = {
  args: { size: 'sm' },
};

export const Large: Story = {
  args: { size: 'lg' },
};

/** No title/footer — a bare centered card. */
export const BodyOnly: Story = {
  args: { title: undefined, eyebrow: undefined, footer: undefined },
};

/**
 * Spec (ModalFooterStatus): a status string in the footer, aligned left
 * of the actions.
 */
export const FooterStatus: Story = {
  args: { footerStatus: '2 sessions affected' },
};

/** The status slot renders the footer row even without actions. */
export const FooterStatusOnly: Story = {
  args: { footer: undefined, footerStatus: 'validating configuration…' },
};

const TOOL_TYPES = ['MCP server', 'Skill', 'API endpoint'] as const;

const ToolTypeBody = ({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (t: string) => void;
}) => (
  <div className="flex flex-col gap-2">
    <p className="m-0">Pick the tool type to configure:</p>
    <div className="flex gap-2">
      {TOOL_TYPES.map((t) => (
        <Button
          key={t}
          variant={t === selected
            ? 'primary'
            : 'secondary'}
          size="sm"
          onClick={() => onSelect(t)}
        >
          {t}
        </Button>
      ))}
    </div>
  </div>
);

const FooterStatusLiveDemo = (args: ComponentProps<typeof Modal>) => {
  const [selected, setSelected] = useState<string>(TOOL_TYPES[0]);
  return (
    <Modal
      {...args}
      eyebrow="New tool"
      title="Add a tool"
      footerStatus={`type: ${selected}`}
      footer={<Button variant="primary">Continue</Button>}
    >
      <ToolTypeBody selected={selected} onSelect={setSelected} />
    </Modal>
  );
};

/**
 * Spec: the status is driven by a state change in the modal content — here
 * the footer mirrors the selected tool type (the tools-page flow). The
 * initial selection is fixed so the visual baseline is deterministic.
 */
export const FooterStatusLive: Story = {
  render: (args) => <FooterStatusLiveDemo {...args} />,
};
