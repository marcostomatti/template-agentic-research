import { forwardRef, type InputHTMLAttributes } from 'react';

import { touchable } from '../../atoms/Touchable/Touchable.variants';
import { cn } from '../../lib';
import { StrokeIcon } from '../../lib/icons';

import { searchInput } from './Toolbar.variants';

export interface SearchInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size'> {
  value: string;
  onChange: (value: string) => void;
}

/** The toolbar's search field — icon, controlled text, inline clear. */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    { className, value, onChange, placeholder = 'Search sessions…', ...props },
    ref,
  ) => (
    <div
      className={cn(
        'relative flex min-w-[190px] flex-[1_1_230px] items-center',
        className,
      )}
    >
      <span className="pointer-events-none absolute left-3 text-fg3">
        <StrokeIcon name="search" size={16} />
      </span>
      <input
        ref={ref}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={searchInput({ clearable: value.length > 0 })}
        {...props}
      />
      {value.length > 0 && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange('')}
          className={cn(
            touchable({ inline: true, rounded: 'sm', noBrightness: false }),
            'absolute right-2 size-6 justify-center border-none bg-transparent text-fg3',
          )}
        >
          <StrokeIcon name="x" size={15} />
        </button>
      )}
    </div>
  ),
);

SearchInput.displayName = 'SearchInput';
