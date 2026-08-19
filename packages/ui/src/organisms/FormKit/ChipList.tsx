import {
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';

import { Chip } from '../../atoms/Chip';
import { cn } from '../../lib';

import {
  chipListBox,
  chipListOption,
  chipListPanel,
} from './FormKit.variants';

/**
 * ChipList (spec: "ChipList"): an input suggesting
 * from the typed text; picking a suggestion renders a chip inside the
 * container. Multi mode keeps the input under the chips and excludes
 * already-selected options from further suggestions; single mode lets
 * the chip take over until its X removes it. `allowNew` offers the
 * typed text as the first option when it matches nothing, creating a
 * chip from free text (existing tags + new tags on the fly).
 *
 * Keyboard: typing opens the list with the FIRST result preselected;
 * ↑↓ move the active row; Enter picks the active row (so a bare Enter
 * takes the first result); Escape closes. Backspace-to-remove on an
 * empty input is intentionally not implemented — chips are removed via
 * their X buttons, keeping deletion an explicit action.
 */

export interface ChipOption {
  value: string;
  label: string;
}

export interface ChipListProps {
  options: ChipOption[];
  /** Selected values — parent-owned. Single mode uses at most one. */
  value: string[];
  onChange: (next: string[]) => void;
  mode?: 'single' | 'multi';
  /** Offer the typed text as a creatable option when nothing matches. */
  allowNew?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  id?: string;
  className?: string;
}

interface SuggestionRow {
  value: string;
  label: string;
  isNew?: boolean;
}

export const ChipList = ({
  options,
  value,
  onChange,
  mode = 'multi',
  allowNew = false,
  placeholder = 'Type to search…',
  ariaLabel,
  id,
  className,
}: ChipListProps) => {
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoId = useId();
  const baseId = id ?? autoId;

  const needle = q.trim().toLowerCase();
  const open = needle !== '';

  const available = options.filter((o) => !value.includes(o.value));
  const matches: SuggestionRow[] = available.filter((o) => o.label.toLowerCase().includes(needle));
  // allowNew: the typed text leads the list when no option matches it
  // exactly (and it isn't already selected).
  const trimmed = q.trim();
  const exact = options.some(
    (o) => o.label.toLowerCase() === trimmed.toLowerCase(),
  );
  const rows: SuggestionRow[] =
    allowNew && trimmed !== '' && !exact
      && !value.some((v) => v.toLowerCase() === trimmed.toLowerCase())
      ? [{ value: trimmed, label: trimmed, isNew: true }, ...matches]
      : matches;

  const labelFor = (v: string) => options.find((o) => o.value === v)?.label ?? v;

  const pick = (row: SuggestionRow) => {
    onChange(mode === 'single'
      ? [row.value]
      : [...value, row.value]);
    setQ('');
    setIdx(0);
  };

  const remove = (v: string) => {
    onChange(value.filter((x) => x !== v));
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIdx((i) => Math.min(rows.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIdx((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      // An Enter that commits an IME composition must not pick a row.
      if (e.nativeEvent.isComposing) return;
      e.preventDefault();
      const active = rows[idx];
      if (active) pick(active);
    } else if (e.key === 'Escape') {
      setQ('');
      setIdx(0);
    }
  };

  // Single mode with a chip: the chip takes over, no input until removed.
  const inputHidden = mode === 'single' && value.length > 0;
  const listId = `${baseId}-list`;
  const optId = (i: number) => `${baseId}-opt-${i}`;

  return (
    <div className={cn('relative', className)}>
      <div className={chipListBox()}>
        {value.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {value.map((v) => (
              <Chip key={v} onRemove={() => remove(v)}>
                {labelFor(v)}
              </Chip>
            ))}
          </div>
        )}
        {!inputHidden && (
          <input
            ref={inputRef}
            id={baseId}
            role="combobox"
            aria-label={ariaLabel}
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={open && rows[idx]
              ? optId(idx)
              : undefined}
            aria-autocomplete="list"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setIdx(0);
            }}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            className="w-full border-none bg-transparent font-body text-[14.5px] text-fg1 outline-none placeholder:text-fg3"
          />
        )}
      </div>

      {open && (
        <div className={chipListPanel()}>
          <div id={listId} role="listbox" aria-label="Suggestions">
            {rows.length === 0 && (
              <div className="px-2.5 py-2 text-[13px] text-fg3">
                No matches.
              </div>
            )}
            {rows.map((row, i) => (
              <button
                key={row.isNew
                  ? `new:${row.value}`
                  : row.value}
                type="button"
                role="option"
                id={optId(i)}
                aria-selected={i === idx}
                tabIndex={-1}
                onMouseEnter={() => setIdx(i)}
                // Fires before the input's blur — no focus juggling needed.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(row)}
                className={chipListOption({ active: i === idx })}
              >
                {row.isNew
                  ? (
                    <span className="min-w-0 flex-1 truncate">
                      Create &ldquo;<b>{row.label}</b>&rdquo;
                    </span>
                  )
                  : (
                    <span className="min-w-0 flex-1 truncate">{row.label}</span>
                  )}
                {row.isNew && (
                  <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] text-accent">
                    new
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

ChipList.displayName = 'ChipList';
