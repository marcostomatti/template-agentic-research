import type { Meta, StoryObj } from '@storybook/react-vite';

import { useMemo, useState } from 'react';

import { Button } from '../../atoms/Button';
import { Chip } from '../../atoms/Chip';
import { EmptyState } from '../../atoms/EmptyState';
import { Select } from '../../molecules/Select/Select';
import {
  makeColumns,
  SESSIONS,
  STATUS,
  type Session,
} from '../../stories/sessions';
import { Table } from '../Table/Table';

import { FilterDropdown } from './FilterDropdown';
import { SearchInput } from './SearchInput';
import { Toolbar, ToolbarControls, ToolbarSep, ToolbarSummary } from './Toolbar';

/** Status swatch dot from the original toolbar demo. */
const STATUS_COLOR: Record<
  (typeof STATUS)[Session['status']]['tone'],
  string
> = {
  success: 'var(--success)',
  warning: 'var(--gold-500)',
  danger: 'var(--danger)',
  info: 'var(--info)',
  neutral: 'var(--fg3)',
};

const Dot = ({ c }: { c: string }) => (
  <span
    className="size-2 shrink-0 rounded-full"
    style={{ background: c }}
    aria-hidden
  />
);

const Glyph = ({ d, size = 15 }: { d: string; size?: number }) => (
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
    <path d={d} />
  </svg>
);

const FILTER_D =
  'M22 3H2l8 9.46V19l4 2v-8.54L22 3z';
const CPU_D =
  'M4 4h16v16H4zM9 9h6v6H9zM9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M20 9h3M1 15h3M20 15h3';
const SEARCH_D = 'M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z';

const STATUS_OPTIONS = (
  Object.entries(STATUS) as [Session['status'], (typeof STATUS)[Session['status']]][]
).map(([value, s]) => ({
  value,
  label: s.label,
  swatch: <Dot c={STATUS_COLOR[s.tone]} />,
}));

const MODEL_OPTIONS = [...new Set(SESSIONS.map((r) => r.model))].map((m) => ({
  value: m,
  label: m,
}));

const DENSITY_OPTIONS = [
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'compact', label: 'Compact' },
];

/**
 * The full controlled composition from the original toolbar demo — the toolbar owns the
 * query, the story derives the rows, the Table stays pure.
 */
const ResultsToolbar = ({ attached }: { attached: boolean }) => {
  const [query, setQuery] = useState('');
  const [statuses, setStatuses] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [density, setDensity] = useState('comfortable');

  const toggle =
    (setter: (fn: (arr: string[]) => string[]) => void) => (v: string) => setter((arr) => arr.includes(v)
      ? arr.filter((x) => x !== v)
      : [...arr, v]);

  const rows = useMemo(
    () => SESSIONS.filter((r) => {
      if (
        query &&
          !(r.name + ' ' + r.goal).toLowerCase().includes(query.toLowerCase())
      )
        return false;
      if (statuses.length && !statuses.includes(r.status)) return false;
      if (models.length && !models.includes(r.model)) return false;
      return true;
    }),
    [query, statuses, models],
  );

  const columns = makeColumns('clamp');
  const anyFilter = Boolean(query) || statuses.length > 0 || models.length > 0;
  const clearAll = () => {
    setQuery('');
    setStatuses([]);
    setModels([]);
  };

  const controlsRow = (
    <ToolbarControls>
      <SearchInput value={query} onChange={setQuery} />
      <FilterDropdown
        label="Status"
        icon={<Glyph d={FILTER_D} />}
        options={STATUS_OPTIONS}
        selected={statuses}
        onToggle={toggle(setStatuses)}
        onClear={() => setStatuses([])}
      />
      <FilterDropdown
        label="Model"
        icon={<Glyph d={CPU_D} />}
        options={MODEL_OPTIONS}
        selected={models}
        onToggle={toggle(setModels)}
        onClear={() => setModels([])}
      />
      <ToolbarSep />
      <div className="inline-flex items-center gap-[7px]">
        <span className="font-mono text-[11.5px] text-fg3">density</span>
        <Select
          value={density}
          options={DENSITY_OPTIONS}
          onChange={setDensity}
          ariaLabel="Row density"
          width={170}
        />
      </div>
    </ToolbarControls>
  );

  const summaryRow = (
    <ToolbarSummary divided={attached}>
      <span className="font-mono text-xs font-semibold text-fg1">
        {rows.length}
      </span>
      <span className="text-[12.5px] text-fg3">
        {anyFilter
          ? `of ${SESSIONS.length} sessions`
          : 'sessions'}
      </span>
      {anyFilter && (
        <>
          <div className="mx-1 h-4 w-px bg-border-soft" aria-hidden />
          {query && (
            <Chip
              icon={<Glyph d={SEARCH_D} size={12} />}
              onRemove={() => setQuery('')}
            >
              &ldquo;{query}&rdquo;
            </Chip>
          )}
          {statuses.map((s) => (
            <Chip
              key={s}
              onRemove={() => setStatuses((a) => a.filter((x) => x !== s))}
            >
              <span className="inline-flex items-center gap-1.5">
                <Dot c={STATUS_COLOR[STATUS[s as Session['status']].tone]} />
                {STATUS[s as Session['status']].label}
              </span>
            </Chip>
          ))}
          {models.map((m) => (
            <Chip
              key={m}
              onRemove={() => setModels((a) => a.filter((x) => x !== m))}
            >
              <span className="font-mono">{m}</span>
            </Chip>
          ))}
          <Button
            variant="secondary"
            size="sm"
            className="ml-auto"
            onClick={clearAll}
          >
            Clear all
          </Button>
        </>
      )}
    </ToolbarSummary>
  );

  const empty = (
    <EmptyState
      title="No sessions match"
      description="Nothing fits that query. Loosen a filter or clear them all to see everything again."
      action={<Button onClick={clearAll}>Clear filters</Button>}
      className="py-12"
    />
  );

  const results =
    rows.length > 0
      ? (
        <Table
          columns={columns}
          data={rows}
          getRowId={(r) => r.id}
          layout="fit"
          density={density === 'compact'
            ? 'compact'
            : 'comfortable'}
          stickyFooter={false}
          frame={!attached}
          initialSort={{ key: 'updated', dir: 'asc' }}
        />
      )
      : (
        empty
      );

  return attached
    ? (
      <Toolbar>
        {controlsRow}
        {summaryRow}
        {results}
      </Toolbar>
    )
    : (
      <div className="flex flex-col gap-3.5">
        <Toolbar>
          {controlsRow}
          {summaryRow}
        </Toolbar>
        {rows.length > 0
          ? results
          : <Toolbar>{empty}</Toolbar>}
      </div>
    );
};

const meta = {
  title: 'Organisms/Toolbar',
  component: Toolbar,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta<typeof Toolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** DS default: two surfaces, each owning its own frame, gap between. */
export const Detached: Story = {
  render: () => <ResultsToolbar attached={false} />,
};

/** One surface owns the frame; the Table renders frame={false} inside. */
export const Attached: Story = {
  render: () => <ResultsToolbar attached />,
};
