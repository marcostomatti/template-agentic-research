import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { type CSSProperties, type ReactNode } from 'react';

import { Menu, MenuContent, MenuTrigger } from '../../atoms/Menu';
import { menuItem } from '../../atoms/Menu/Menu.variants';
import { touchable } from '../../atoms/Touchable/Touchable.variants';
import { cn } from '../../lib';
import { StrokeIcon } from '../../lib/icons';

import { selectTrigger, type SelectTriggerVariants } from './Select.variants';

export interface SelectOption {
  value: string;
  label: ReactNode;
  icon?: ReactNode;
}

export interface SelectProps extends SelectTriggerVariants {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  /** Dropdown panel width in px (default 200, min 160). */
  width?: number;
  ariaLabel?: string;
  className?: string;
}

/** Minimum dropdown width. */
const MIN_PANEL_WIDTH = 160;

export const Select = ({
  value,
  options,
  onChange,
  size,
  width = 200,
  ariaLabel,
  className,
}: SelectProps) => {
  const sel = options.find((o) => o.value === value) ?? options[0];
  const panelStyle: CSSProperties = {
    width: Math.max(width, MIN_PANEL_WIDTH),
  };
  return (
    <Menu modal={false}>
      <MenuTrigger
        aria-label={ariaLabel}
        className={cn(
          touchable({ inline: true, rounded: 'md', noBrightness: false }),
          selectTrigger({ size }),
          className,
        )}
      >
        {sel?.icon != null && (
          <span className="shrink-0 text-fg3">{sel.icon}</span>
        )}
        <span className="min-w-0 flex-1 truncate text-left">
          {sel?.label ?? 'Select…'}
        </span>
        <span className="shrink-0 text-fg3">
          <StrokeIcon name="chevronsUpDown" size={15} />
        </span>
      </MenuTrigger>
      <MenuContent style={panelStyle}>
        <DropdownMenu.RadioGroup value={value} onValueChange={onChange}>
          {options.map((o) => (
            <DropdownMenu.RadioItem
              key={o.value}
              value={o.value}
              className={menuItem({ tone: 'default' })}
            >
              {o.icon}
              <span className="min-w-0 flex-1 truncate">{o.label}</span>
              <DropdownMenu.ItemIndicator className="shrink-0 text-primary">
                <StrokeIcon name="check" size={15} />
              </DropdownMenu.ItemIndicator>
            </DropdownMenu.RadioItem>
          ))}
        </DropdownMenu.RadioGroup>
      </MenuContent>
    </Menu>
  );
};

Select.displayName = 'Select';
