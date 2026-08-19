import type { ReactNode } from 'react';

import { switchThumb, switchTrack } from '../../atoms/Switch/Switch.variants';
import { cn } from '../../lib';

import { decoratedToggle, decoratedToggleHeader } from './FormKit.variants';

/**
 * DecoratedToggle / DecoratedToggleList — generalized from the original design
 * ToolPicker (the original AgentEditor screen; spec:
 * "ToolPicker"): bordered rows of decoration +
 * title/description + switch that tint accent when on, grouped under a
 * mono header carrying an x/y-on indicator. Not tied to the tool use
 * case — the tools-page spec reuses it for auto-start and skill toggles.
 *
 * A11y note: the original row is a label wrapping a separate Switch (two
 * click targets, double-fire risk). Here the ROW ITSELF is the switch
 * control (`role="switch"`); the Switch atom's track/thumb cvas render
 * decoratively inside it, so there is exactly one focusable control per
 * row and the whole box is its hit area.
 */

export interface DecoratedToggleProps {
  /** Leading decoration — icon, avatar… — vertically centered. */
  decoration?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Trailing companion to the title (e.g. a "recommended" Badge). */
  meta?: ReactNode;
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const DecoratedToggle = ({
  decoration,
  title,
  description,
  meta,
  checked,
  onChange,
  disabled = false,
  className,
}: DecoratedToggleProps) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange?.(!checked)}
    className={cn(decoratedToggle({ checked }), className)}
  >
    {decoration != null && (
      <span
        className={cn(
          'shrink-0',
          checked
            ? 'text-accent'
            : 'text-fg2',
        )}
        aria-hidden
      >
        {decoration}
      </span>
    )}
    <span className="min-w-0 flex-1">
      <span className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[13px] font-semibold text-fg1">
          {title}
        </span>
        {meta}
      </span>
      {description != null && (
        <span className="block text-xs font-normal text-fg3">
          {description}
        </span>
      )}
    </span>
    <span
      className={cn(switchTrack({ size: 'sm' }), 'shrink-0')}
      data-on={checked
        ? ''
        : undefined}
      aria-hidden
    >
      <span className={switchThumb({ size: 'sm' })} />
    </span>
  </button>
);

DecoratedToggle.displayName = 'DecoratedToggle';

export interface DecoratedToggleOption {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  decoration?: ReactNode;
  meta?: ReactNode;
  disabled?: boolean;
}

export interface DecoratedToggleListProps {
  /** Group name shown in the mono header. */
  title: ReactNode;
  options: DecoratedToggleOption[];
  /** Ids currently on — parent-owned. */
  value: string[];
  onChange: (next: string[]) => void;
  className?: string;
}

/** Grouped toggles with the spec's x/y-on indicator in the header. */
export const DecoratedToggleList = ({
  title,
  options,
  value,
  onChange,
  className,
}: DecoratedToggleListProps) => {
  const on = options.filter((o) => value.includes(o.id)).length;
  const toggle = (id: string) => {
    onChange(value.includes(id)
      ? value.filter((x) => x !== id)
      : [...value, id]);
  };
  return (
    <div className={className}>
      <div className={decoratedToggleHeader()}>
        <span>{title}</span>
        <span className="text-fg2">·</span>
        <span>{on}/{options.length}</span>
      </div>
      <div className="flex flex-col gap-1.5" role="group">
        {options.map((o) => (
          <DecoratedToggle
            key={o.id}
            decoration={o.decoration}
            title={o.title}
            description={o.description}
            meta={o.meta}
            checked={value.includes(o.id)}
            onChange={() => toggle(o.id)}
            disabled={o.disabled}
          />
        ))}
      </div>
    </div>
  );
};

DecoratedToggleList.displayName = 'DecoratedToggleList';
