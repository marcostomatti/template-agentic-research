import type { Column } from '../organisms/Table';

import { Badge } from '../atoms/Badge';

/**
 * The agent-sessions demo dataset shared by the Table/Toolbar stories —
 * stories only, never exported from the library barrel.
 */

export interface Session {
  id: string;
  status: 'running' | 'waiting' | 'done' | 'idle' | 'failed';
  name: string;
  goal: string;
  model: string;
  tokens: number;
  updated: number;
}

export const SESSIONS: Session[] = [
  {
    id: 'ses_8x21',
    status: 'running',
    name: 'refactor-bot · split-primitives',
    goal: 'Split the monolith Primitives file into per-role wrappers and update every import across the dashboard kit.',
    model: 'sonnet-4.5',
    tokens: 184200,
    updated: 2,
  },
  {
    id: 'ses_4f09',
    status: 'waiting',
    name: 'docs-writer · variant-tables',
    goal: 'Draft the variant reference tables for each wrapper directly from the CVA configs.',
    model: 'haiku-4',
    tokens: 52100,
    updated: 6,
  },
  {
    id: 'ses_2c77',
    status: 'done',
    name: 'test-runner · snapshot-themes',
    goal: 'Snapshot every primitive across light and dark, then diff against the baseline set.',
    model: 'sonnet-4.5',
    tokens: 311800,
    updated: 18,
  },
  {
    id: 'ses_9b13',
    status: 'idle',
    name: 'schema-migrator · backfill-tokens',
    goal: 'Backfill tokenized class names into the legacy kit so no raw hex survives in a variant.',
    model: 'opus-4',
    tokens: 0,
    updated: 41,
  },
  {
    id: 'ses_1a55',
    status: 'running',
    name: 'a11y-architect · focus-rings',
    goal: 'Audit keyboard focus order and add visible focus rings to every Touchable-derived component.',
    model: 'sonnet-4.5',
    tokens: 96400,
    updated: 1,
  },
  {
    id: 'ses_7d30',
    status: 'failed',
    name: 'perf-bot · bundle-trim',
    goal: 'Trim the shared bundle by code-splitting the playground; the build step is currently erroring on the colgroup helper.',
    model: 'haiku-4',
    tokens: 23700,
    updated: 33,
  },
  {
    id: 'ses_3e88',
    status: 'done',
    name: 'lint-sweeper · no-static-interactions',
    goal: 'Resolve jsx-a11y/no-static-element-interactions by routing clicks through Touchable.',
    model: 'sonnet-4.5',
    tokens: 142500,
    updated: 27,
  },
];

export const STATUS: Record<
  Session['status'],
  {
    tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
    dot: boolean;
    label: string;
    rank: number;
  }
> = {
  running: { tone: 'success', dot: true, label: 'running', rank: 0 },
  waiting: { tone: 'warning', dot: false, label: 'waiting', rank: 1 },
  failed: { tone: 'danger', dot: false, label: 'failed', rank: 2 },
  done: { tone: 'info', dot: false, label: 'done', rank: 3 },
  idle: { tone: 'neutral', dot: false, label: 'idle', rank: 4 },
};

export const fmtTokens = (n: number): string => n === 0
  ? '—'
  : n >= 1000
    ? (n / 1000).toFixed(n >= 100000
      ? 0
      : 1) + 'k'
    : String(n);

/** The demo column config — width/sort/overflow defined once. */
export const makeColumns = (
  goalMode: 'wrap' | 'clamp' | 'truncate',
): Column<Session>[] => [
  {
    key: 'status',
    header: 'Status',
    width: 116,
    sortable: true,
    sortAccessor: (r) => STATUS[r.status].rank,
    cell: (r) => {
      const s = STATUS[r.status];
      // the original table demo writes <Tag dot> but the global it renders is
      // anatomy-data's round dot pill — our Badge chrome; the chapter's
      // usage block says <Badge tone> too.
      return (
        <Badge tone={s.tone} dot={s.dot}>
          {s.label}
        </Badge>
      );
    },
    footer: (rows) => `${rows.length} sessions`,
  },
  {
    key: 'name',
    header: 'Session',
    width: 220,
    sortable: true,
    overflow: 'truncate',
    cell: (r) => (
      <span>
        <span className="font-semibold">{r.name.split(' · ')[0]}</span>
        <span className="font-mono text-xs text-fg3">
          {' '}
          · {r.name.split(' · ')[1]}
        </span>
      </span>
    ),
  },
  {
    key: 'goal',
    header: 'Goal',
    overflow: goalMode,
    clampLines: 2,
    cell: (r) => <span className="text-fg2">{r.goal}</span>,
  },
  {
    key: 'model',
    header: 'Model',
    width: 116,
    sortable: true,
    cell: (r) => (
      <span className="font-mono text-[12.5px] text-fg2">{r.model}</span>
    ),
  },
  {
    key: 'tokens',
    header: 'Tokens',
    width: 100,
    align: 'end',
    sortable: true,
    cell: (r) => (
      <span className={r.tokens === 0
        ? 'font-mono text-fg3'
        : 'font-mono'}>
        {fmtTokens(r.tokens)}
      </span>
    ),
    footer: (rows) => fmtTokens(rows.reduce((s, r) => s + r.tokens, 0)) + ' total',
  },
  {
    key: 'updated',
    header: 'Updated',
    width: 104,
    align: 'end',
    sortable: true,
    cell: (r) => (
      <span className="font-mono text-[12.5px] text-fg3">{r.updated}m ago</span>
    ),
  },
];
