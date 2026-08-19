import type { Meta, StoryObj } from '@storybook/react-vite';

import { useState } from 'react';

// The rendered global is a round pill — the Badge chrome, not a Tag.
import { Badge } from '../Badge';

import { Sortable } from './Sortable';
import { SortableRow } from './SortableRow';

/**
 * Scenarios that close the Droppable loop.
 * Same wrapper: an isolated single-group list, then two groups that
 * reorder internally AND receive each other's items (origin decides).
 */

const GLYPHS: Record<string, string> = {
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  alertTriangle:
    'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01',
  zap: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  bot: 'M12 8V4H8M4 20h16a2 2 0 002-2v-8a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2zM2 14h2M20 14h2M15 13v2M9 13v2',
  cpu: 'M4 4h16v16H4zM9 9h6v6H9zM9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M20 9h3M1 15h3M20 15h3',
  terminal: 'M4 17l6-6-6-6M12 19h8',
  gripVertical: 'M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01',
};

const Glyph = ({ name, size = 15 }: { name: string; size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d={GLYPHS[name]} />
  </svg>
);

interface Task {
  id: string;
  title: string;
  tone: 'success' | 'neutral' | 'info';
  st: string;
}

const ROADMAP: Task[] = [
  {
    id: 't1',
    title: 'Split the monolith Primitives file',
    tone: 'success',
    st: 'in progress',
  },
  {
    id: 't2',
    title: 'Add visible focus rings to Touchables',
    tone: 'success',
    st: 'in progress',
  },
  {
    id: 't3',
    title: 'Snapshot light + dark per wrapper',
    tone: 'neutral',
    st: 'queued',
  },
  {
    id: 't4',
    title: 'Audit aria labels across the kit',
    tone: 'neutral',
    st: 'queued',
  },
  {
    id: 't5',
    title: 'Tokenize the last legacy hex values',
    tone: 'info',
    st: 'shipped',
  },
];

interface Widget {
  id: string;
  label: string;
  icon: string;
}

const WidgetRow = ({ w, accent }: { w: Widget; accent: string }) => (
  <div className="flex items-center gap-[9px] rounded-md border border-border-soft bg-surface-1 px-3 py-2.5 shadow-xs">
    <span className="shrink-0 cursor-grab text-fg3">
      <Glyph name="gripVertical" />
    </span>
    <span
      className="inline-flex size-7 shrink-0 items-center justify-center rounded-sm"
      style={{
        background: `color-mix(in oklab, ${accent} 13%, var(--surface-1))`,
        color: accent,
      }}
    >
      <Glyph name={w.icon} />
    </span>
    <span className="text-[13px] font-semibold text-fg1">{w.label}</span>
  </div>
);

const meta = {
  title: 'Atoms/Sortable',
  component: Sortable,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  // Every story is render-based; these only satisfy the required props.
  args: {
    group: 'demo',
    items: [],
    getKey: () => '',
    renderItem: () => null,
    onReorder: () => {},
  },
} satisfies Meta<typeof Sortable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Isolated reorder — one list, only its own group accepted (scenario 1). */
const RoadmapReorderDemo = () => {
  const [tasks, setTasks] = useState(ROADMAP);
  return (
    <div className="max-w-[640px]">
      <Sortable
        group="roadmap"
        items={tasks}
        getKey={(t) => t.id}
        onReorder={setTasks}
        renderItem={(t) => (
          <SortableRow trailing={<Badge tone={t.tone}>{t.st}</Badge>}>
            <div className="flex items-center gap-2.5">
              <span className="w-[22px] shrink-0 font-mono text-xs font-bold text-accent">
                P{tasks.indexOf(t) + 1}
              </span>
              <span className="text-[13.5px] font-medium text-fg1">
                {t.title}
              </span>
            </div>
          </SortableRow>
        )}
      />
    </div>
  );
};

export const RoadmapReorder: Story = { render: () => <RoadmapReorderDemo /> };

/** Reorder + receive — two groups moving items between lists (scenario 2). */
const PaletteBoardDemo = () => {
  const [palette, setPalette] = useState<Widget[]>([
    { id: 'w-roadmap', label: 'Roadmap', icon: 'list' },
    { id: 'w-errors', label: 'Error rate', icon: 'alertTriangle' },
    { id: 'w-cost', label: 'Cost / day', icon: 'zap' },
  ]);
  const [board, setBoard] = useState<Widget[]>([
    { id: 'w-agents', label: 'Active agents', icon: 'bot' },
    { id: 'w-budget', label: 'Token budget', icon: 'cpu' },
    { id: 'w-sessions', label: 'Recent sessions', icon: 'terminal' },
  ]);
  const boardReceive = (item: Widget, at: number) => {
    setBoard((b) => {
      const next = b.filter((x) => x.id !== item.id);
      next.splice(at, 0, item);
      return next;
    });
    setPalette((p) => p.filter((x) => x.id !== item.id));
  };
  const paletteReceive = (item: Widget, at: number) => {
    setPalette((p) => {
      const next = p.filter((x) => x.id !== item.id);
      next.splice(at, 0, item);
      return next;
    });
    setBoard((b) => b.filter((x) => x.id !== item.id));
  };
  return (
    <div className="grid max-w-[760px] grid-cols-[0.8fr_1.2fr] items-start gap-3.5">
      <div>
        <div className="mb-[7px] font-mono text-[11px] uppercase tracking-[0.06em] text-fg3">
          available widgets
        </div>
        <Sortable
          group="palette"
          items={palette}
          getKey={(w) => w.id}
          onReorder={setPalette}
          onReceive={paletteReceive}
          emptyHint="Drag widgets back here"
          renderItem={(w) => <WidgetRow w={w} accent="var(--info)" />}
        />
      </div>
      <div>
        <div className="mb-[7px] font-mono text-[11px] uppercase tracking-[0.06em] text-fg3">
          overview board
        </div>
        <Sortable
          group="board"
          items={board}
          getKey={(w) => w.id}
          onReorder={setBoard}
          onReceive={boardReceive}
          emptyHint="Drop widgets here"
          renderItem={(w) => <WidgetRow w={w} accent="var(--accent)" />}
        />
      </div>
    </div>
  );
};

export const PaletteBoard: Story = { render: () => <PaletteBoardDemo /> };

/** Empty container showing the hint slot. */
export const Empty: Story = {
  render: () => (
    <div className="max-w-[420px]">
      <Sortable
        group="empty-demo"
        items={[] as Widget[]}
        getKey={(w) => w.id}
        onReorder={() => {}}
        emptyHint="Drop widgets here"
        renderItem={(w) => <WidgetRow w={w} accent="var(--accent)" />}
      />
    </div>
  ),
};
