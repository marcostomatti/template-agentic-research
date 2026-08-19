import type { IconName } from '../../atoms/Icon';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';

import { Icon } from '../../atoms/Icon';
import { cn } from '../../lib';
// Deep member import, not the CommandPalette barrel — the built
// storybook's lazy-init chunking can drop barrel member inits (see the
// matching note in Table/cellTypes.tsx).
import { paletteKbd } from '../CommandPalette/CommandPalette.variants';

import {
  searchSuggestBox,
  searchSuggestKindPill,
  searchSuggestPanel,
  searchSuggestPuck,
  searchSuggestRow,
} from './SearchSuggest.variants';

export type SearchSuggestionKind =
  | 'agent'
  | 'session'
  | 'task'
  | 'tool'
  | 'doc';

export interface SearchSuggestion {
  kind: SearchSuggestionKind;
  label: string;
  /** Mono context line under the label ("running · agent-7d2f"). */
  sub?: string;
  /** Overrides the kind's default glyph. */
  icon?: IconName;
}

export interface SearchSuggestProps {
  suggestions: SearchSuggestion[];
  /** A suggestion was chosen (click or Enter). Navigation is the app's job. */
  onSelect?: (suggestion: SearchSuggestion) => void;
  /**
   * Enter without a matching suggestion — falls through to the full
   * search page (the suggest list is a shortcut, not a wall).
   */
  onSearch?: (query: string) => void;
  /** Global ⌘K / Ctrl-K focuses the input (scope switch). Default on. */
  hotkey?: boolean;
  placeholder?: string;
  /** Render with the panel open (docs/stories). */
  defaultOpen?: boolean;
  className?: string;
}

/** Kind → default Lucide glyph (original SUGGESTIONS seed). */
const KIND_ICON: Record<SearchSuggestionKind, IconName> = {
  agent: 'bot',
  session: 'terminal',
  task: 'list',
  tool: 'cpu',
  doc: 'book',
};

const VISIBLE_LIMIT = 5;

/**
 * SearchSuggest (the original TopbarLive demo; app-shell spec: Top Bar):
 * lens-icon input with a `⌘K` chip, globally focusable via ⌘K, suggesting
 * across five kinds (agent/session/task/tool/doc) each with its own
 * accent. Keyboard-driven: ↑↓ move the active row, Enter opens it, and
 * Enter with no match falls through to `onSearch` — as does the explicit
 * "Search all" row.
 *
 * RELATIONSHIP TO CommandPalette (documented decision): siblings, not
 * shared internals. Both follow the same keyboard model (active-index
 * list, ↑↓/Enter, hand-rolled rows), but SearchSuggest is an inline
 * ARIA combobox — focus stays in the input, the panel anchors to it,
 * substring filtering (original behavior) — while CommandPalette is a modal
 * Overlay running commands with fuzzy matching and focus capture.
 * Merging them would couple an input-anchored popup to a portal overlay
 * for no shared behavior win; what IS shared is reused directly (the
 * `paletteKbd` chip chrome for the ⌘K/↵ hints).
 */
export const SearchSuggest = ({
  suggestions,
  onSelect,
  onSearch,
  hotkey = true,
  placeholder = 'Search sessions, agents, tools…',
  defaultOpen = false,
  className,
}: SearchSuggestProps) => {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(defaultOpen);
  const [idx, setIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const baseId = useId();

  const needle = q.trim().toLowerCase();
  const filtered = needle
    ? suggestions.filter((s) => `${s.label} ${s.sub ?? ''}`.toLowerCase().includes(needle))
    : suggestions;
  const shown = filtered.slice(0, VISIBLE_LIMIT);

  // Global scope switch: ⌘K / Ctrl-K focuses the input wherever you are.
  useEffect(() => {
    if (!hotkey) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hotkey]);

  // Outside click dismisses the panel.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const select = (s: SearchSuggestion) => {
    setQ(s.label);
    setOpen(false);
    onSelect?.(s);
  };

  const searchAll = () => {
    setOpen(false);
    onSearch?.(q);
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIdx((i) => Math.min(shown.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIdx((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      // An Enter that commits an IME composition must not navigate.
      if (e.nativeEvent.isComposing) return;
      const active = shown[idx];
      if (active) select(active);
      else searchAll();
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const listId = `${baseId}-list`;
  const optId = (i: number) => `${baseId}-opt-${i}`;

  return (
    <div ref={wrapRef} className={cn('relative w-[340px]', className)}>
      <div className={searchSuggestBox({ open })}>
        <Icon name="search" size={14} className="shrink-0 text-fg3" />
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && shown[idx]
            ? optId(idx)
            : undefined}
          aria-autocomplete="list"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setIdx(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="min-w-0 flex-1 border-none bg-transparent font-body text-[13px] text-fg1 outline-none placeholder:text-fg3"
        />
        <kbd className={paletteKbd({ size: 'sm' })}>⌘K</kbd>
      </div>

      {open && (
        <div className={searchSuggestPanel()}>
          <div className="flex justify-between px-3 pb-1.5 pt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-fg3">
            <span>
              {needle
                ? `matches · ${filtered.length}`
                : 'suggested'}
            </span>
            <span>↑↓ navigate · ↵ open</span>
          </div>
          <div id={listId} role="listbox" aria-label="Suggestions">
            {shown.length === 0 && (
              <div className="px-3.5 py-4 text-[13px] text-fg3">
                No quick matches. Press{' '}
                <kbd className={paletteKbd({ size: 'sm' })}>↵</kbd> to search
                all surfaces.
              </div>
            )}
            {shown.map((s, i) => (
              <button
                key={`${s.kind}-${s.label}`}
                type="button"
                role="option"
                id={optId(i)}
                aria-selected={i === idx}
                tabIndex={-1}
                onMouseEnter={() => setIdx(i)}
                onClick={() => select(s)}
                className={searchSuggestRow({ active: i === idx })}
              >
                <span className={searchSuggestPuck({ kind: s.kind })}>
                  <Icon name={s.icon ?? KIND_ICON[s.kind]} size={14} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold">
                    {s.label}
                  </span>
                  {s.sub != null && (
                    <span className="block font-mono text-[11px] text-fg3">
                      {s.sub}
                    </span>
                  )}
                </span>
                <span className={searchSuggestKindPill({ kind: s.kind })}>
                  {s.kind}
                </span>
              </button>
            ))}
          </div>
          {needle !== '' && (
            <div className="border-t border-border-soft p-1.5">
              <button
                type="button"
                onClick={searchAll}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-md border-none bg-transparent px-2.5 py-2 text-left text-[13px] font-medium text-accent hover:bg-surface-sunk"
              >
                <Icon name="search" size={15} />
                <span className="min-w-0 flex-1 truncate">
                  Search all for &ldquo;<b>{q}</b>&rdquo;
                </span>
                <kbd className={paletteKbd({ size: 'sm' })}>↵</kbd>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

SearchSuggest.displayName = 'SearchSuggest';
