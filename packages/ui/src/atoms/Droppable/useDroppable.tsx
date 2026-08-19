import {
  useCallback,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from 'react';

/**
 * Droppable behavior core: drag enter/leave
 * detection with the depth-counter trick (so child elements don't flicker),
 * origin classification (external OS files only — internal drags are the
 * Sortable primitive's job), validation against an `accept` contract, and
 * the drop/reject events. Behavior only; the Droppable component's
 * `feedback` variant decides presentation.
 */

/** The accept contract a drop is validated against. */
export interface AcceptContract {
  /** Allowed file extensions, e.g. ['.md', '.txt']. */
  ext?: string[];
  /** Allowed MIME types; 'image/*' wildcards supported. */
  mime?: string[];
  /** Per-file size ceiling in bytes. */
  maxSize?: number;
  /** Maximum number of files per drop. */
  maxCount?: number;
  /** Set false to force single-file drops. */
  multiple?: boolean;
}

export type DropValidation =
  | { ok: true; files: File[] }
  | { ok: false; reason: string };

export type DroppableState = 'idle' | 'over' | 'reject';

/** How long the reject presentation lingers before resetting to idle. */
const REJECT_RESET_MS = 2200;

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

function matchesMime(type: string, pattern: string): boolean {
  if (!pattern) return true;
  if (pattern.endsWith('/*')) return type.startsWith(pattern.slice(0, -1));
  return type === pattern;
}

export function validateDrop(
  fileList: FileList | File[],
  accept: AcceptContract = {},
): DropValidation {
  const files = [...fileList];
  const { ext, mime, maxSize, maxCount = Infinity, multiple = true } = accept;
  if (!files.length) return { ok: false, reason: 'Nothing to drop.' };
  if (!multiple && files.length > 1)
    return { ok: false, reason: 'Drop a single file.' };
  if (files.length > maxCount)
    return {
      ok: false,
      reason: `Up to ${maxCount} file${maxCount > 1
        ? 's'
        : ''} at a time.`,
    };
  for (const f of files) {
    const okExt =
      !ext || ext.some((e) => f.name.toLowerCase().endsWith(e.toLowerCase()));
    const okMime = !mime || mime.some((m) => matchesMime(f.type, m));
    if (!okExt && !okMime) {
      const want = (ext || mime || []).join(', ');
      return { ok: false, reason: `${f.name} isn't accepted — needs ${want}.` };
    }
    if (maxSize && f.size > maxSize)
      return {
        ok: false,
        reason: `${f.name} is ${fmtBytes(f.size)} — max is ${fmtBytes(maxSize)}.`,
      };
  }
  return { ok: true, files };
}

export interface UseDroppableOptions {
  accept?: AcceptContract;
  onDrop?: (files: File[]) => void;
  onReject?: (reason: string) => void;
  disabled?: boolean;
}

export interface DroppableHandlers {
  onDragEnter: (e: DragEvent) => void;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
}

/**
 * The actual primitive — every feedback presentation just renders this.
 * External drags announce themselves via dataTransfer.types including
 * "Files"; anything else is an internal drag and ignored here (Sortable
 * wires the internal-reorder case).
 */
export function useDroppable({
  accept,
  onDrop,
  onReject,
  disabled,
}: UseDroppableOptions): {
  state: DroppableState;
  reason: string | null;
  handlers: DroppableHandlers;
} {
  const depth = useRef(0);
  const [state, setState] = useState<DroppableState>('idle');
  const [reason, setReason] = useState<string | null>(null);
  const isExternal = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');

  const onDragEnter = useCallback(
    (e: DragEvent) => {
      if (disabled || !isExternal(e)) return;
      e.preventDefault();
      e.stopPropagation();
      depth.current += 1;
      setState((s) => (s === 'reject'
        ? s
        : 'over'));
    },
    [disabled],
  );

  const onDragOver = useCallback(
    (e: DragEvent) => {
      if (disabled || !isExternal(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    },
    [disabled],
  );

  const onDragLeave = useCallback(
    (e: DragEvent) => {
      if (disabled || !isExternal(e)) return;
      e.preventDefault();
      e.stopPropagation();
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) {
        setState('idle');
        setReason(null);
      }
    },
    [disabled],
  );

  const onDropEvt = useCallback(
    (e: DragEvent) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      depth.current = 0;
      const res = validateDrop(e.dataTransfer.files, accept);
      if (res.ok) {
        setState('idle');
        setReason(null);
        onDrop?.(res.files);
      } else {
        setState('reject');
        setReason(res.reason);
        onReject?.(res.reason);
        setTimeout(() => {
          setState('idle');
          setReason(null);
        }, REJECT_RESET_MS);
      }
    },
    [accept, onDrop, onReject, disabled],
  );

  return {
    state,
    reason,
    handlers: { onDragEnter, onDragOver, onDragLeave, onDrop: onDropEvt },
  };
}

/** A hidden file input — the universal click-to-browse affordance. */
export function useFilePick({
  accept,
  onDrop,
  onReject,
}: Pick<UseDroppableOptions, 'accept' | 'onDrop' | 'onReject'>): {
  open: () => void;
  input: ReactNode;
} {
  const ref = useRef<HTMLInputElement>(null);
  const open = () => ref.current?.click();
  const input = (
    <input
      ref={ref}
      type="file"
      multiple={accept?.multiple !== false}
      accept={
        [...(accept?.ext ?? []), ...(accept?.mime ?? [])].join(',') || undefined
      }
      className="hidden"
      onChange={(e) => {
        if (!e.target.files) return;
        const res = validateDrop(e.target.files, accept);
        if (res.ok) onDrop?.(res.files);
        else onReject?.(res.reason);
        e.target.value = '';
      }}
    />
  );
  return { open, input };
}
