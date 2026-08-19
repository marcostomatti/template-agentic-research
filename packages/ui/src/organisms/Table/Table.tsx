import { useState, type CSSProperties, type ReactNode } from 'react';

import { cn } from '../../lib';

import { SortGlyph } from './SortGlyph';
import {
  tableBand,
  tableCell,
  tableEl,
  tableFoot,
  tableFrame,
  tableHead,
  tableModCell,
  tableModHead,
  tableRowEl,
  tableScroll,
  tableTip,
  type TableDensity,
  type TableLayout,
} from './Table.variants';
import { TableCell, type CellAlign, type CellOverflow, type TableTip } from './TableCell';
import { TableRowCheckbox, TableSortHandle } from './TableModifiers';
import { useRowReorder } from './useRowReorder';

/**
 * Columns are configured ONCE — width, alignment, sort and overflow behavior
 * all live on the column, never on individual cells (the original table demo).
 */
export interface Column<Row> {
  key: string;
  header: ReactNode;
  /** Fixed track width (px number or CSS width); omit to fill remaining. */
  width?: number | string;
  align?: CellAlign;
  sortable?: boolean;
  /** Sort by this value instead of `row[key]`. */
  sortAccessor?: (row: Row) => number | string;
  cell?: (row: Row) => ReactNode;
  /** wrap (default) | truncate (1 line + tooltip) | clamp (N + tooltip). */
  overflow?: CellOverflow;
  clampLines?: number;
  /** Summary cell for the totals footer, computed from all rows. */
  footer?: (data: readonly Row[]) => ReactNode;
}

export interface SortState {
  key: string | null;
  dir: 'asc' | 'desc';
}

export interface TableProps<Row> {
  columns: Column<Row>[];
  data: readonly Row[];
  getRowId: (row: Row) => string;
  /** fit renders at natural height; scroll caps the body at maxHeight. */
  layout?: TableLayout;
  density?: TableDensity;
  /** Body height cap in px — only meaningful with layout="scroll". */
  maxHeight?: number;
  /** Render the totals footer band (cells come from Column.footer). */
  stickyFooter?: boolean;
  /** Frame ownership: false when a wrapper (e.g. Toolbar) paints the edge. */
  frame?: boolean;
  initialSort?: SortState;
  /** Odd/even row striping (spec: "TableRow modifiers"). */
  striped?: boolean;
  /**
   * Checkbox column — always the FIRST column, per the modifier spec.
   * The table renders the boxes and the header's all/partial state; the
   * PARENT owns the selection state: `selectedIds` in, the next id array
   * out through `onSelectionChange` (see TableModifiers.tsx for the
   * documented ownership decision).
   */
  selectable?: boolean;
  selectedIds?: readonly string[];
  onSelectionChange?: (ids: string[]) => void;
  /** Per-row opt-out — renders that row's checkbox disabled. */
  isRowSelectable?: (row: Row) => boolean;
  /**
   * SortHandle column (drag-to-reorder, Sortable-pattern; see
   * useRowReorder.ts). Controlled: `onReorder` emits the full next order
   * of `data`. Row order IS the data order, so while reorderable the
   * column-sort headers are disabled — sorting and hand-ordering can't
   * both own the sequence.
   */
  reorderable?: boolean;
  onReorder?: (next: Row[]) => void;
  /** Per-row opt-out — renders that row's grip disabled (not draggable). */
  isRowReorderable?: (row: Row) => boolean;
  className?: string;
}

const NO_SORT: SortState = { key: null, dir: 'asc' };

/** Leading modifier tracks (sort handle / checkbox), in render order. */
const HANDLE_TRACK = 34;
const CHECKBOX_TRACK = 42;

/** Shared width tracks — one per column — for header/body/footer tables. */
const ColGroup = <Row,>({
  columns,
  leadWidths,
}: {
  columns: Column<Row>[];
  leadWidths: number[];
}) => (
  <colgroup>
    {leadWidths.map((w, i) => (
      <col key={`mod-${i}`} style={{ width: `${w}px` }} />
    ))}
    {columns.map((c) => (
      <col
        key={c.key}
        style={{
          width:
            c.width != null
              ? typeof c.width === 'number'
                ? `${c.width}px`
                : c.width
              : 'auto',
        }}
      />
    ))}
  </colgroup>
);

export const Table = <Row,>({
  columns,
  data,
  getRowId,
  layout = 'fit',
  density = 'comfortable',
  maxHeight,
  stickyFooter = false,
  frame = true,
  initialSort,
  striped = false,
  selectable = false,
  selectedIds,
  onSelectionChange,
  isRowSelectable,
  reorderable = false,
  onReorder,
  isRowReorderable,
  className,
}: TableProps<Row>) => {
  const [sort, setSort] = useState<SortState>(initialSort ?? NO_SORT);
  const [tip, setTip] = useState<TableTip | null>(null);
  const reorder = useRowReorder({ data, onReorder });

  const onSort = (col: Column<Row>) => {
    if (!col.sortable || reorderable) return;
    setSort((s) => s.key !== col.key
      ? { key: col.key, dir: 'asc' }
      : s.dir === 'asc'
        ? { key: col.key, dir: 'desc' }
        : NO_SORT);
  };

  const sorted = [...data];
  if (sort.key && !reorderable) {
    const col = columns.find((c) => c.key === sort.key);
    const acc =
      col?.sortAccessor ??
      ((r: Row) => (r as Record<string, number | string>)[sort.key as string]);
    sorted.sort((a, b) => {
      const va = acc(a);
      const vb = acc(b);
      const cmp =
        typeof va === 'number' && typeof vb === 'number'
          ? va - vb
          : String(va).localeCompare(String(vb));
      return sort.dir === 'asc'
        ? cmp
        : -cmp;
    });
  }

  const scroll = layout === 'scroll';
  const bodyStyle: CSSProperties | undefined =
    scroll && maxHeight != null
      ? { maxHeight }
      : undefined;
  const tipStyle: CSSProperties | undefined = tip
    ? { left: tip.x, top: tip.y - 10 }
    : undefined;

  /* ── modifier columns (spec order: handle, then checkbox, then data) ── */
  const leadWidths = [
    ...(reorderable
      ? [HANDLE_TRACK]
      : []),
    ...(selectable
      ? [CHECKBOX_TRACK]
      : []),
  ];

  const selected = new Set(selectedIds ?? []);
  const selectableRows = selectable
    ? sorted.filter((row) => isRowSelectable?.(row) ?? true)
    : [];
  const allSelected = selectableRows.length > 0
    && selectableRows.every((row) => selected.has(getRowId(row)));
  const someSelected = !allSelected
    && selectableRows.some((row) => selected.has(getRowId(row)));

  const toggleAll = (checked: boolean) => {
    onSelectionChange?.(checked
      ? selectableRows.map(getRowId)
      : []);
  };

  const toggleRow = (id: string, checked: boolean) => {
    onSelectionChange?.(checked
      ? [...(selectedIds ?? []), id]
      : (selectedIds ?? []).filter((x) => x !== id));
  };

  return (
    <div className={cn(tableFrame({ frame }), className)}>
      {/* HEADER — its own table, gutter-reserved to match the body */}
      <div className={tableBand({ edge: 'header', gutter: scroll })}>
        <table className={tableEl()}>
          <ColGroup columns={columns} leadWidths={leadWidths} />
          <thead>
            <tr>
              {reorderable && <th className={tableModHead({ density })} />}
              {selectable && (
                <th className={tableModHead({ density })}>
                  <TableRowCheckbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={toggleAll}
                    label="Select all rows"
                  />
                </th>
              )}
              {columns.map((col) => {
                const active = sort.key === col.key;
                return (
                  <th
                    key={col.key}
                    onClick={() => onSort(col)}
                    aria-sort={
                      active
                        ? sort.dir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : undefined
                    }
                    className={tableHead({
                      density,
                      active,
                      sortable: col.sortable === true,
                    })}
                  >
                    <span
                      className={cn(
                        'inline-flex w-full items-center gap-[5px]',
                        col.align === 'end'
                          ? 'justify-end'
                          : 'justify-start',
                      )}
                    >
                      {col.align === 'end' && (
                        <SortGlyph
                          sortable={col.sortable}
                          active={active}
                          dir={sort.dir}
                        />
                      )}
                      {col.header}
                      {col.align !== 'end' && (
                        <SortGlyph
                          sortable={col.sortable}
                          active={active}
                          dir={sort.dir}
                        />
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
        </table>
      </div>

      {/* BODY — the only scrolling element */}
      <div className={tableScroll({ layout })} style={bodyStyle}>
        <table className={tableEl()}>
          <ColGroup columns={columns} leadWidths={leadWidths} />
          <tbody>
            {sorted.map((row, index) => {
              const id = getRowId(row);
              const rowSelectable = isRowSelectable?.(row) ?? true;
              return (
                <tr
                  key={id}
                  className={tableRowEl({
                    striped,
                    drop: reorderable
                      ? reorder.dropFor(index)
                      : 'none',
                    dragging: reorderable && reorder.isDragging(index),
                  })}
                  {...(reorderable
                    ? reorder.rowProps(index)
                    : {})}
                >
                  {reorderable && (
                    <td className={tableModCell({ density })}>
                      {(isRowReorderable?.(row) ?? true)
                        ? (
                          <span {...reorder.handleProps()}>
                            <TableSortHandle />
                          </span>
                        )
                        : <TableSortHandle disabled />}
                    </td>
                  )}
                  {selectable && (
                    <td className={tableModCell({ density })}>
                      <TableRowCheckbox
                        checked={selected.has(id)}
                        disabled={!rowSelectable}
                        onChange={(checked) => toggleRow(id, checked)}
                        label={`Select row ${id}`}
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className={tableCell({ density })}>
                      <TableCell
                        mode={col.overflow ?? 'wrap'}
                        lines={col.clampLines}
                        align={col.align}
                        onTip={setTip}
                        offTip={() => setTip(null)}
                      >
                        {col.cell
                          ? col.cell(row)
                          : (row as Record<string, ReactNode>)[col.key]}
                      </TableCell>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* FOOTER — its own table; thead cells so tbody row rules skip it */}
      {stickyFooter && (
        <div className={tableBand({ edge: 'footer', gutter: scroll })}>
          <table className={tableEl()}>
            <ColGroup columns={columns} leadWidths={leadWidths} />
            <thead>
              <tr>
                {reorderable && <td className={tableFoot({ density })} />}
                {selectable && <td className={tableFoot({ density })} />}
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={tableFoot({ density, align: col.align })}
                  >
                    {col.footer
                      ? col.footer(data)
                      : null}
                  </td>
                ))}
              </tr>
            </thead>
          </table>
        </div>
      )}

      {tip != null && (
        <div className={tableTip()} style={tipStyle}>
          {tip.text}
        </div>
      )}
    </div>
  );
};

Table.displayName = 'Table';
