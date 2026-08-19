import { type ReactNode } from 'react';

import {
  Menu,
  MenuContent,
  MenuItem,
  MenuSep,
  MenuTrigger,
} from '../../atoms/Menu';
import { touchable } from '../../atoms/Touchable/Touchable.variants';
import { cn } from '../../lib';
import { StrokeIcon } from '../../lib/icons';

import { filterTrigger } from './Toolbar.variants';

export interface FilterOption {
  value: string;
  label: ReactNode;
  /** Small leading swatch (a status dot in the original demo). */
  swatch?: ReactNode;
}

export interface FilterDropdownProps {
  label: string;
  icon?: ReactNode;
  options: FilterOption[];
  selected: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
  className?: string;
}

/** Dropdown panel width from the original menu-core demo. */
const PANEL_WIDTH = 224;

/**
 * FilterDropdown — a multi-select checklist on the Menu primitive
 * (the original menu-core demo). The trigger tints accent and grows a count badge while
 * any value is selected; toggling keeps the menu open (multi-select), the
 * Clear item closes it.
 */
export const FilterDropdown = ({
  label,
  icon,
  options,
  selected,
  onToggle,
  onClear,
  className,
}: FilterDropdownProps) => {
  const active = selected.length > 0;
  return (
    <Menu modal={false}>
      <MenuTrigger
        className={cn(
          touchable({ inline: true, rounded: 'md', noBrightness: false }),
          filterTrigger({ active }),
          className,
        )}
      >
        {icon}
        {label}
        {active && (
          <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-[5px] font-mono text-[11px] font-bold text-on-accent">
            {selected.length}
          </span>
        )}
        <StrokeIcon name="chevronDown" size={15} />
      </MenuTrigger>
      <MenuContent style={{ width: PANEL_WIDTH }}>
        {options.map((o) => {
          const on = selected.includes(o.value);
          return (
            <MenuItem
              key={o.value}
              onSelect={(e) => {
                e.preventDefault();
                onToggle(o.value);
              }}
              trailing={
                <span
                  aria-hidden
                  className={cn(
                    'inline-flex size-[17px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] transition-colors',
                    on
                      ? 'border-accent bg-accent text-on-accent'
                      : 'border-border-strong bg-transparent',
                  )}
                >
                  {on && <StrokeIcon name="check" size={12} />}
                </span>
              }
            >
              <span className="inline-flex items-center gap-2">
                {o.swatch}
                {o.label}
              </span>
            </MenuItem>
          );
        })}
        {active && (
          <>
            <MenuSep />
            <MenuItem
              icon={<StrokeIcon name="x" size={16} />}
              onSelect={onClear}
            >
              Clear {label.toLowerCase()}
            </MenuItem>
          </>
        )}
      </MenuContent>
    </Menu>
  );
};

FilterDropdown.displayName = 'FilterDropdown';
