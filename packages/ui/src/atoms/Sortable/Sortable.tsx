import {
  Fragment,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type ReactNode,
} from 'react';

import { cn } from '../../lib';

import { sortableContainer, sortableLine } from './Sortable.variants';

/**
 * Sortable — the INTERNAL half of the drag story Droppable defers.
 * Controlled: the parent owns the list; Sortable only
 * emits the new order (or a received item).
 *
 * Behavior branches on the drag's ORIGIN, read from its TYPE — during a
 * drag the browser exposes dataTransfer.types but NOT the data, so the
 * source group is encoded into the type itself:
 *
 *   application/x-otx-sort-<group>  carrying THIS group   → internal reorder
 *   application/x-otx-sort-<group>  carrying ANOTHER      → cross-list receive
 *   "Files"                                               → external (Droppable)
 */
const TYPE_PREFIX = 'application/x-otx-sort-';

export type SortableDirection = 'vertical' | 'horizontal';
type DragOrigin = 'internal' | 'cross' | 'files' | null;

function moveItem<T>(arr: readonly T[], from: number, to: number): T[] {
  const next = arr.slice();
  const [m] = next.splice(from, 1);
  if (m === undefined) return arr.slice();
  next.splice(from < to
    ? to - 1
    : to, 0, m);
  return next;
}

function classify(dt: DataTransfer, ownType: string): DragOrigin {
  const types = Array.from(dt.types ?? []);
  if (types.includes(ownType)) return 'internal';
  if (types.some((t) => t.startsWith(TYPE_PREFIX))) return 'cross';
  if (types.includes('Files')) return 'files';
  return null;
}

export interface SortableProps<T> {
  /** Drag namespace — encodes the origin into the drag's data type. */
  group: string;
  items: readonly T[];
  getKey: (item: T) => string;
  renderItem: (item: T, state: { dragging: boolean }) => ReactNode;
  /** Internal reorder — receives the full next order. */
  onReorder: (next: T[]) => void;
  /** Cross-list receive; omit to reject drags from other groups. */
  onReceive?: (item: T, at: number) => void;
  direction?: SortableDirection;
  /** Gap between items in px (default 8). Genuinely dynamic. */
  gap?: number;
  emptyHint?: ReactNode;
  className?: string;
}

export const Sortable = <T,>({
  group,
  items,
  getKey,
  renderItem,
  onReorder,
  onReceive,
  direction = 'vertical',
  gap = 8,
  emptyHint,
  className,
}: SortableProps<T>) => {
  const TYPE = TYPE_PREFIX + group;
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [mode, setMode] = useState<'internal' | 'cross' | null>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const depth = useRef(0);
  const horizontal = direction === 'horizontal';

  const onItemDragOver = (e: DragEvent, i: number) => {
    const m = classify(e.dataTransfer, TYPE);
    if (!m || m === 'files' || (m === 'cross' && !onReceive)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = m === 'internal'
      ? 'move'
      : 'copy';
    const r = e.currentTarget.getBoundingClientRect();
    const past = horizontal
      ? e.clientX - r.left > r.width / 2
      : e.clientY - r.top > r.height / 2;
    setOverIndex(past
      ? i + 1
      : i);
    setMode(m);
  };

  const onContainerDragOver = (e: DragEvent) => {
    const m = classify(e.dataTransfer, TYPE);
    if (!m || m === 'files' || (m === 'cross' && !onReceive)) return;
    e.preventDefault();
    if (overIndex == null) {
      setOverIndex(items.length);
      setMode(m);
    }
  };

  const onEnter = (e: DragEvent) => {
    if (classify(e.dataTransfer, TYPE)) depth.current++;
  };
  const onLeave = (e: DragEvent) => {
    if (!classify(e.dataTransfer, TYPE)) return;
    depth.current--;
    if (depth.current <= 0) {
      depth.current = 0;
      setOverIndex(null);
      setMode(null);
    }
  };
  const clear = () => {
    depth.current = 0;
    setOverIndex(null);
    setMode(null);
    setDragKey(null);
  };

  const onDrop = (e: DragEvent) => {
    const m = classify(e.dataTransfer, TYPE);
    if (!m || m === 'files') {
      clear();
      return;
    }
    e.preventDefault();
    const at = overIndex == null
      ? items.length
      : overIndex;
    if (m === 'internal') {
      const { fromIndex } = JSON.parse(
        e.dataTransfer.getData(TYPE) || '{}',
      ) as { fromIndex?: number };
      if (fromIndex != null && at !== fromIndex && at !== fromIndex + 1)
        onReorder(moveItem(items, fromIndex, at));
    } else if (m === 'cross' && onReceive) {
      const ct = Array.from(e.dataTransfer.types).find((t) => t.startsWith(TYPE_PREFIX));
      const payload = JSON.parse(
        (ct && e.dataTransfer.getData(ct)) || '{}',
      ) as { item?: T };
      if (payload.item != null) onReceive(payload.item, at);
    }
    clear();
  };

  const line = <div className={sortableLine({ direction })} />;
  const style: CSSProperties = { gap };

  return (
    <div
      onDragOver={onContainerDragOver}
      onDragEnter={onEnter}
      onDragLeave={onLeave}
      onDrop={onDrop}
      className={cn(
        sortableContainer({ direction, mode: mode ?? 'idle' }),
        className,
      )}
      style={style}
    >
      {items.length === 0 && overIndex == null && (
        <div className="w-full px-3 py-[18px] text-center text-[12.5px] italic text-fg3">
          {emptyHint ?? 'Empty'}
        </div>
      )}
      {items.map((it, i) => {
        const key = getKey(it);
        const dragging = dragKey === key;
        return (
          <Fragment key={key}>
            {overIndex === i && mode && line}
            <div
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'all';
                e.dataTransfer.setData(
                  TYPE,
                  JSON.stringify({ fromIndex: i, item: it }),
                );
                setDragKey(key);
              }}
              onDragEnd={clear}
              onDragOver={(e) => onItemDragOver(e, i)}
              className={cn(
                'cursor-grab transition-opacity',
                dragging
                  ? 'opacity-40'
                  : 'opacity-100',
              )}
            >
              {renderItem(it, { dragging })}
            </div>
          </Fragment>
        );
      })}
      {overIndex === items.length && mode && line}
    </div>
  );
};

Sortable.displayName = 'Sortable';
