import { useEffect, useRef, useState, type DragEvent } from 'react';

import { type TableRowDrop } from './Table.variants';

/**
 * Row-reorder wiring for the SortHandle modifier (spec:
 * "TableRow modifiers → SortHandle"). Reuses the
 * Sortable atom's Droppable/Draggable pattern — native HTML5 drag, row
 * midpoint deciding above/below, an insert line at the drop position —
 * re-hosted on `<tr>` elements, which the div-based Sortable container
 * can't wrap.
 *
 * Controlled like Sortable: the parent owns the list; the hook only
 * emits the next order. Drags start ONLY from the handle (pointer-down
 * on the grip arms the row's dragstart), so text selection and cell
 * interactions keep working. Arming is released by a WINDOW-level
 * pointerup/pointercancel listener, not the grip's own pointerup — a
 * press that starts on the grip but releases elsewhere must still
 * disarm, or a later unrelated click-drag in the row (selecting cell
 * text) would perform a real reorder. Native drag initiation fires
 * pointercancel, which also disarms — after dragstart has already
 * passed the armed check, so a legitimate drag proceeds normally.
 *
 * ACCESSIBILITY GAP (documented): reordering is drag-only — there is no
 * keyboard path, mirroring the existing Sortable atom. Planned fallback:
 * a focusable grip with ArrowUp/ArrowDown+modifier emitting onReorder,
 * to land together with the same affordance on the Sortable atom. Until
 * then, implementations needing an accessible path should expose
 * explicit move-up/move-down row actions (e.g. via RowContextAction).
 */

function moveItem<T>(arr: readonly T[], from: number, to: number): T[] {
  const next = arr.slice();
  const [m] = next.splice(from, 1);
  if (m === undefined) return arr.slice();
  next.splice(from < to
    ? to - 1
    : to, 0, m);
  return next;
}

export interface UseRowReorderOptions<Row> {
  data: readonly Row[];
  onReorder?: (next: Row[]) => void;
}

export interface UseRowReorderResult {
  /** Spread on the grip cell's inner wrapper — arms the row drag. */
  handleProps: () => {
    onPointerDown: () => void;
  };
  /** Spread on each `<tr>`. */
  rowProps: (index: number) => {
    draggable: boolean;
    onDragStart: (e: DragEvent<HTMLTableRowElement>) => void;
    onDragEnd: () => void;
    onDragOver: (e: DragEvent<HTMLTableRowElement>) => void;
    onDrop: (e: DragEvent<HTMLTableRowElement>) => void;
  };
  /** Insert-line position for row `index`. */
  dropFor: (index: number) => TableRowDrop;
  isDragging: (index: number) => boolean;
}

export const useRowReorder = <Row>({
  data,
  onReorder,
}: UseRowReorderOptions<Row>): UseRowReorderResult => {
  const [from, setFrom] = useState<number | null>(null);
  // Insert position 0..n (n = drop after the last row).
  const [over, setOver] = useState<number | null>(null);
  const armed = useRef(false);
  const disarmRef = useRef<(() => void) | null>(null);

  // Reap window listeners from an in-flight press if we unmount mid-drag.
  useEffect(() => () => disarmRef.current?.(), []);

  const clear = () => {
    armed.current = false;
    disarmRef.current?.();
    setFrom(null);
    setOver(null);
  };

  const handleProps = () => ({
    onPointerDown: () => {
      disarmRef.current?.();
      armed.current = true;
      const reset = () => {
        armed.current = false;
        window.removeEventListener('pointerup', reset);
        window.removeEventListener('pointercancel', reset);
        disarmRef.current = null;
      };
      disarmRef.current = reset;
      // Window-level on purpose: the release may land anywhere on the
      // page (or native drag start may cancel the pointer stream), so
      // the grip's own pointerup is not guaranteed to fire.
      window.addEventListener('pointerup', reset);
      window.addEventListener('pointercancel', reset);
    },
  });

  const rowProps = (index: number) => ({
    draggable: true,
    onDragStart: (e: DragEvent<HTMLTableRowElement>) => {
      if (!armed.current) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.effectAllowed = 'move';
      // Firefox refuses to start a drag without data.
      e.dataTransfer.setData('text/plain', String(index));
      setFrom(index);
    },
    onDragEnd: clear,
    onDragOver: (e: DragEvent<HTMLTableRowElement>) => {
      if (from == null) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const r = e.currentTarget.getBoundingClientRect();
      const past = e.clientY - r.top > r.height / 2;
      setOver(past
        ? index + 1
        : index);
    },
    onDrop: (e: DragEvent<HTMLTableRowElement>) => {
      if (from == null || over == null) {
        clear();
        return;
      }
      e.preventDefault();
      if (over !== from && over !== from + 1) {
        onReorder?.(moveItem(data, from, over));
      }
      clear();
    },
  });

  const dropFor = (index: number): TableRowDrop => {
    if (from == null || over == null) return 'none';
    if (over === index) return 'above';
    if (over === data.length && index === data.length - 1) return 'below';
    return 'none';
  };

  return {
    handleProps,
    rowProps,
    dropFor,
    isDragging: (index: number) => from === index,
  };
};
