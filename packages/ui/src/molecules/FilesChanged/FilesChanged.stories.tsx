import type { Meta, StoryObj } from '@storybook/react-vite';

import { FilesChanged, type FileChange } from './FilesChanged';

const SESSION_FILES: FileChange[] = [
  { path: 'src/auth/session.ts', additions: 126, deletions: 12 },
  { path: 'src/auth/refresh.ts', additions: 48, deletions: 31 },
  { path: 'src/auth/__tests__/session.test.ts', additions: 210, deletions: 0 },
  { path: 'docs/auth.md', additions: 18, deletions: 4 },
  { path: 'package.json', additions: 2, deletions: 1 },
];

const meta = {
  title: 'Molecules/FilesChanged',
  component: FilesChanged,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FilesChanged>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Spec (the component spec, no artboard): header with file count +
 * total additions (green) / deletions (red); rows with extension-derived
 * file-type icon, mono path, `+n` / `-n`. Zero deltas render dimmed
 * (interpretation decision — columns stay scannable).
 */
export const Default: Story = {
  args: {
    files: SESSION_FILES,
    locale: 'en-US',
  },
};

/** Extension coverage: code / json / markdown / image / shell / config / lock. */
export const IconInference: Story = {
  args: {
    locale: 'en-US',
    files: [
      { path: 'src/molecules/Chart.tsx', additions: 96, deletions: 8 },
      { path: 'tsconfig.json', additions: 3, deletions: 1 },
      { path: 'README.md', additions: 12, deletions: 2 },
      { path: 'public/hero.png', additions: 0, deletions: 0 },
      { path: 'scripts/deploy.sh', additions: 22, deletions: 5 },
      { path: '.github/workflows/ci.yml', additions: 9, deletions: 9 },
      { path: 'bun.lock', additions: 41, deletions: 17 },
      { path: 'LICENSE', additions: 0, deletions: 0 },
    ],
  },
};

/** Explicit `icon` override beats extension inference. */
export const IconOverride: Story = {
  args: {
    locale: 'en-US',
    files: [
      { path: 'migrations/2026-05-27-users.sql', additions: 64, deletions: 0, icon: 'database' },
      { path: 'src/db/client.ts', additions: 12, deletions: 3 },
    ],
  },
};

/** Long paths truncate; the full path stays reachable via title attr. */
export const LongPaths: Story = {
  args: {
    locale: 'en-US',
    files: [
      {
        path: 'services/workspace-orchestrator/src/internal/scheduling/priority-queue-rebalancer.ts',
        additions: 154,
        deletions: 89,
      },
      { path: 'src/index.ts', additions: 1, deletions: 1 },
    ],
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
};

/** Single file — count reads "1 file". */
export const SingleFile: Story = {
  args: {
    locale: 'en-US',
    files: [{ path: 'src/lib/format.ts', additions: 7, deletions: 2 }],
  },
};
