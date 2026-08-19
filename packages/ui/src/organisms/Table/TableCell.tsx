import { useRef, type CSSProperties, type ReactNode } from 'react';

import { cn } from '../../lib';

export type CellOverflow = 'wrap' | 'truncate' | 'clamp';
export type CellAlign = 'start' | 'center' | 'end';

export interface TableTip {
  text: string;
  x: number;
  y: number;
}

export interface TableCellProps {
  mode?: CellOverflow;
  lines?: number;
  align?: CellAlign;
  children?: ReactNode;
  onTip?: (tip: TableTip) => void;
  offTip?: () => void;
}

const ALIGN_TEXT: Record<CellAlign, string> = {
  start: 'text-left',
  center: 'text-center',
  end: 'text-right',
};
const ALIGN_JUSTIFY: Record<CellAlign, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
};

/**
 * The overflow-aware cell — the td-ellipsis fix from the original table demo. text-overflow
 * doesn't clip on a <td>: the table must be table-fixed, the <td> capped
 * with max-w-0, and the clip must live on a block CHILD. So content is
 * wrapped in a div, and a tooltip is surfaced only when the text is
 * genuinely clipped (scrollWidth / scrollHeight probe on hover).
 */
export const TableCell = ({
  mode = 'wrap',
  lines = 2,
  align = 'start',
  children,
  onTip,
  offTip,
}: TableCellProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const enter = () => {
    if (mode === 'wrap' || !onTip) return;
    const el = ref.current;
    if (!el) return;
    const clipped =
      mode === 'truncate'
        ? el.scrollWidth > el.clientWidth + 1
        : el.scrollHeight > el.clientHeight + 1;
    if (clipped) {
      const r = el.getBoundingClientRect();
      onTip({
        text: el.textContent ?? '',
        x: r.left + r.width / 2,
        y: r.top,
      });
    }
  };

  if (mode === 'truncate')
    return (
      <div
        ref={ref}
        onMouseEnter={enter}
        onMouseLeave={offTip}
        className={cn('truncate', ALIGN_TEXT[align])}
      >
        {children}
      </div>
    );

  if (mode === 'clamp') {
    // -webkit-line-clamp takes the per-column line count — genuinely dynamic.
    const style: CSSProperties = { WebkitLineClamp: lines };
    return (
      <div
        ref={ref}
        onMouseEnter={enter}
        onMouseLeave={offTip}
        className={cn(
          'overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical]',
          ALIGN_TEXT[align],
        )}
        style={style}
      >
        {children}
      </div>
    );
  }

  return (
    <div className={cn('flex', ALIGN_JUSTIFY[align], ALIGN_TEXT[align])}>
      {children}
    </div>
  );
};

TableCell.displayName = 'TableCell';
