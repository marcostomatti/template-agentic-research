import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

import { Overlay } from '../../atoms/Overlay';
import { StrokeIcon } from '../../lib/icons';

import {
  paletteItem,
  paletteItemIcon,
  paletteKbd,
  palettePanel,
} from './CommandPalette.variants';
import { KeyHint } from './KeyHint';

export interface Command {
  id: string;
  /** Group heading the command files under while searching. */
  group: string;
  icon?: ReactNode;
  label: string;
  /** Trailing mono chip (a shortcut like ⌘N, or a status). */
  hint?: ReactNode;
  /** Extra tokens the fuzzy filter also matches against. */
  keys?: string;
}

/** Subsequence fuzzy match — the query chars must appear in order. */
// eslint-disable-next-line react-refresh/only-export-components -- fuzzy is part of the palette's public API, colocated with its only consumer
export function fuzzy(q: string, text: string): boolean {
  if (!q) return true;
  const query = q.toLowerCase();
  const hay = text.toLowerCase();
  let i = 0;
  for (const ch of hay) {
    if (ch === query[i]) i++;
    if (i === query.length) return true;
  }
  return false;
}

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onRun: (command: Command) => void;
  commands: Command[];
  /**
   * Command ids surfaced as a "Recent" group while the query is empty;
   * omit to show the full grouped registry instead.
   */
  recent?: string[];
  placeholder?: string;
}

/** Delay before focusing the input, letting the portal mount (demo source: 60). */
const FOCUS_DELAY_MS = 60;
/** Breathing room kept above/below the active row while scrolling it in. */
const SCROLL_PAD_PX = 6;

const RECENT_GROUP = 'Recent';

/**
 * Inner panel, mounted fresh by the Overlay portal each time the palette
 * opens — so query and active-row state start clean without any
 * effect-driven resets.
 */
const PalettePanel = ({
  onClose,
  onRun,
  commands,
  recent,
  placeholder = 'Search commands, pages, agents…',
}: Omit<CommandPaletteProps, 'open'>) => {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input shortly after the portal mounts (demo source: 60ms).
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), FOCUS_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  // filter → ordered, grouped (group order = first appearance)
  const groups = useMemo(() => {
    const base = q
      ? commands.filter((c) => fuzzy(q, c.label) || fuzzy(q, c.keys ?? ''))
      : recent
        ? recent
          .map((id) => commands.find((c) => c.id === id))
          .filter((c): c is Command => c != null)
          .map((c) => ({ ...c, group: RECENT_GROUP }))
        : commands;
    const order: string[] = [];
    for (const c of base) if (!order.includes(c.group)) order.push(c.group);
    return order
      .map((g) => ({ group: g, items: base.filter((c) => c.group === g) }))
      .filter((g) => g.items.length > 0);
  }, [q, commands, recent]);

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  // keep the active row in view without scrollIntoView
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const el = list.querySelector<HTMLElement>(`[data-cmd-idx="${active}"]`);
    if (!el) return;
    const top = el.offsetTop;
    const bottom = top + el.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top - SCROLL_PAD_PX;
    else if (bottom > list.scrollTop + list.clientHeight)
      list.scrollTop = bottom - list.clientHeight + SCROLL_PAD_PX;
  }, [active]);

  const run = (cmd: Command | undefined) => {
    if (!cmd) return;
    onRun(cmd);
    onClose();
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(flat.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(flat[active]);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActive(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActive(flat.length - 1);
    }
  };

  let idx = -1;
  return (
    <div className={palettePanel()}>
      {/* search row — the form kit's field, lightly dressed */}
      <div className="flex shrink-0 items-center gap-[11px] border-b border-border-soft px-[18px] py-[15px]">
        <span className="shrink-0 text-fg3">
          <StrokeIcon name="search" size={19} />
        </span>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKey}
          placeholder={placeholder}
          className="flex-1 border-none bg-transparent font-body text-base text-fg1 outline-none placeholder:text-fg3"
        />
        <kbd className={paletteKbd()}>esc</kbd>
      </div>

      {/* results — the Menu behavior, keyboard-driven */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-[7px]">
        {flat.length === 0
          ? (
            <div className="flex flex-col items-center gap-2 px-5 py-11 text-center">
              <span className="text-fg3">
                <StrokeIcon name="search" size={26} />
              </span>
              <div className="text-sm font-semibold text-fg1">
                No commands for &ldquo;{q}&rdquo;
              </div>
              <div className="text-[12.5px] text-fg3">
                Try a page name, an action, or an agent.
              </div>
            </div>
          )
          : (
            groups.map((g) => (
              <div key={g.group} className="mb-1">
                <div className="px-2.5 pb-1 pt-[7px] font-mono text-[10.5px] uppercase tracking-[0.08em] text-fg3">
                  {g.group}
                </div>
                {g.items.map((c) => {
                  idx++;
                  const i = idx;
                  const on = i === active;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      data-cmd-idx={i}
                      onMouseMove={() => setActive(i)}
                      onClick={() => run(c)}
                      className={paletteItem({ active: on })}
                    >
                      <span className={paletteItemIcon({ active: on })}>
                        {c.icon}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg1">
                        {c.label}
                      </span>
                      {c.hint != null && (
                        <span className={paletteKbd({ size: 'sm' })}>
                          {c.hint}
                        </span>
                      )}
                      {on && (
                        <span className="shrink-0 text-fg3">
                          <StrokeIcon name="cornerDownRight" size={15} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
      </div>

      {/* footer key hints */}
      <div className="flex shrink-0 items-center gap-4 border-t border-border-soft bg-surface-sunk px-4 py-[9px] text-[11.5px] text-fg3">
        <KeyHint k="↑↓" label="navigate" />
        <KeyHint k="↵" label="run" />
        <KeyHint k="esc" label="close" />
        <span className="ml-auto font-mono">
          {flat.length} result{flat.length === 1
            ? ''
            : 's'}
        </span>
      </div>
    </div>
  );
};

export const CommandPalette = ({
  open,
  onClose,
  onRun,
  commands,
  recent,
  placeholder,
}: CommandPaletteProps) => (
  <Overlay
    open={open}
    onClose={onClose}
    position="center"
    backdrop="blur"
    dismiss="both"
    label="Command palette"
    className="items-start"
  >
    <PalettePanel
      onClose={onClose}
      onRun={onRun}
      commands={commands}
      recent={recent}
      placeholder={placeholder}
    />
  </Overlay>
);

CommandPalette.displayName = 'CommandPalette';
