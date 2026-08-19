import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';

import { AgentCell } from './AgentCell';
import { AgentTitle } from './AgentTitle';
import { BranchInline } from './BranchInline';
import { ModelCell, ModelFooter } from './ModelCell';
import { SessionCell } from './SessionCell';
import { SessionInline } from './SessionInline';
import { TaskCell } from './TaskCell';
import { ToolTitle } from './ToolTitle';
import { UserInline } from './UserInline';

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex items-center gap-3 text-sm text-fg2">
    <span className="w-36 shrink-0 font-mono text-[11px] text-fg3">
      {label}
    </span>
    <div className="w-64">{children}</div>
  </div>
);

const meta = {
  title: 'Molecules/KnownEntities',
  component: AgentCell,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof AgentCell>;

export default meta;
type Story = StoryObj<typeof meta>;

const BASE_ARGS = { name: 'the-refactorer', model: 'sonnet-4-5' } as const;

/**
 * Spec: `agent-cell` — smaller agent-title, model as subtitle; the tile
 * accent comes from the shared chart palette.
 */
export const Agent: Story = {
  args: BASE_ARGS,
  render: () => (
    <div className="flex flex-col gap-3">
      <Row label="agent-cell">
        <AgentCell name="the-refactorer" model="sonnet-4-5" tone="primary" />
      </Row>
      <Row label="agent-cell, gold">
        <AgentCell name="the-profiler" model="opus-4-5" tone="gold" />
      </Row>
      <Row label="agent-title">
        <AgentTitle name="the-refactorer" subtitle="runner · agent-7d2f" />
      </Row>
      <Row label="agent-title, bare">
        <AgentTitle name="the-gardener" />
      </Row>
    </div>
  ),
};

/**
 * Spec: `session-inline` (status dot + name; running pulses) and
 * `session-cell` (inline on top, `{agent instance id} · {branch-inline}`
 * greyed below).
 */
export const Session: Story = {
  args: BASE_ARGS,
  render: () => (
    <div className="flex flex-col gap-3">
      <Row label="session-inline">
        <SessionInline name="auth-refactor" status="running" />
      </Row>
      <Row label="failed">
        <SessionInline name="rate-limit-bug" status="failed" />
      </Row>
      <Row label="session-cell">
        <SessionCell
          name="auth-refactor"
          status="done"
          agentInstanceId="agent-7d2f"
          branch="feat/jwt-sessions"
        />
      </Row>
      <Row label="no branch">
        <SessionCell
          name="perf-investigate"
          status="waiting"
          agentInstanceId="agent-93af"
        />
      </Row>
    </div>
  ),
};

/**
 * Spec: `model-cell` — accent dot (or tiny icon) + model name;
 * `model-footer` — small icon + name inheriting the footer color, no
 * accent of its own (shown here inside a greyed footer-colored line).
 */
export const Model: Story = {
  args: BASE_ARGS,
  render: () => (
    <div className="flex flex-col gap-3">
      <Row label="model-cell, dot">
        <ModelCell name="sonnet-4-5" tone="accent" />
      </Row>
      <Row label="model-cell, icon">
        <ModelCell name="opus-4-5" tone="primary" icon="cpu" />
      </Row>
      <Row label="model-footer">
        <span className="font-mono text-[11px] text-fg3">
          <ModelFooter name="haiku-4-5" />
        </span>
      </Row>
    </div>
  ),
};

/**
 * Spec: `branch-inline` (git-branch glyph + name) and `user-inline`
 * (small avatar + handle).
 */
export const Inline: Story = {
  args: BASE_ARGS,
  render: () => (
    <div className="flex flex-col gap-3">
      <Row label="branch-inline">
        <BranchInline name="feat/jwt-sessions" />
      </Row>
      <Row label="user-inline">
        <UserInline handle="sam" name="Sam Lin" />
      </Row>
    </div>
  ),
};

/** Spec: `task-cell` — title over inline text tags. */
export const Task: Story = {
  args: BASE_ARGS,
  render: () => (
    <div className="flex flex-col gap-3">
      <Row label="task-cell">
        <TaskCell
          title="Migrate dashboard to new sidebar layout"
          tags={['ui · feat', 'OT-21', '2 sub']}
        />
      </Row>
      <Row label="no tags">
        <TaskCell title="Cache agent run logs locally for replay" />
      </Row>
    </div>
  ),
};

/**
 * Spec: `tool-title` — icon tile; bold name over a type badge + slug id.
 */
export const Tool: Story = {
  args: BASE_ARGS,
  render: () => (
    <div className="flex flex-col gap-3">
      <Row label="tool-title">
        <ToolTitle
          name="GitHub Search"
          type="MCP"
          slug="gh-search"
          icon="plug"
          tone="primary"
        />
      </Row>
      <Row label="skill tool">
        <ToolTitle
          name="Component from design"
          type="skill"
          slug="component-from-design"
          icon="wand-sparkles"
          badgeTone="info"
        />
      </Row>
    </div>
  ),
};
