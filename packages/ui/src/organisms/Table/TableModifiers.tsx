import { forwardRef } from 'react';

import { Icon } from '../../atoms/Icon';
import { cn } from '../../lib';
import { checkboxBox } from '../FormKit';

import { tableSortHandle } from './Table.variants';

/**
 * TableRow modifier controls (spec: "TableRow
 * modifiers"). Presentational halves of the checkbox and sort-handle
 * columns — the Table wires them into its leading modifier tracks.
 *
 * CHECKBOX EVENTS (spec question, decided): the TABLE owns the checkbox
 * column — it renders the boxes, computes the header's all/partial state
 * and emits one controlled `onSelectionChange(ids)` — while the PARENT
 * owns the selection state itself (`selectedIds` in, next array out,
 * immutably). The table knows row identity (`getRowId`) and layout, so
 * wiring per-row checkboxes implementation-side would re-build the same
 * plumbing at every call site; what selection MEANS (bulk bar, export,
 * delete) stays with the implementation.
 */

export interface TableRowCheckboxProps {
  checked: boolean;
  /** Header tri-state: some-but-not-all rows selected. */
  indeterminate?: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  /** Accessible name (`Select row auth-refactor`, `Select all rows`). */
  label: string;
  className?: string;
}

export const TableRowCheckbox = forwardRef<
  HTMLButtonElement,
  TableRowCheckboxProps
>(
  (
    { checked, indeterminate = false, disabled = false, onChange, label, className },
    ref,
  ) => (
    <button
      ref={ref}
      type="button"
      role="checkbox"
      aria-checked={indeterminate
        ? 'mixed'
        : checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!(checked || indeterminate))}
      className={cn(
        'flex border-none bg-transparent p-0',
        disabled
          ? 'cursor-not-allowed opacity-40'
          : 'cursor-pointer',
        className,
      )}
    >
      <span className={checkboxBox({ checked: checked || indeterminate })}>
        {(checked || indeterminate) && (
          <span className="text-on-primary">
            <Icon
              name={indeterminate
                ? 'minus'
                : 'check'}
              size={13}
              strokeWidth={2.5}
            />
          </span>
        )}
      </span>
    </button>
  ),
);

TableRowCheckbox.displayName = 'TableRowCheckbox';

export interface TableSortHandleProps {
  disabled?: boolean;
  className?: string;
}

/**
 * The grip half of the SortHandle modifier — drag behavior itself lives
 * on the row (Table's reorder wiring follows the Sortable atom's
 * midpoint + insert-line pattern). `disabled` renders the inert grip for
 * rows the Table's `isRowReorderable` opts out.
 *
 * ACCESSIBILITY GAP (documented): the grip is `aria-hidden` and drag-only
 * — no keyboard path yet, mirroring the existing Sortable atom. See the
 * useRowReorder docblock for the planned keyboard fallback.
 */
export const TableSortHandle = forwardRef<HTMLSpanElement, TableSortHandleProps>(
  ({ disabled = false, className }, ref) => (
    <span
      ref={ref}
      aria-hidden
      className={cn(tableSortHandle({ disabled }), className)}
    >
      <Icon name="grip-vertical" size={15} />
    </span>
  ),
);

TableSortHandle.displayName = 'TableSortHandle';
