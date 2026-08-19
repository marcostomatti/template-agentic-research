import { useId } from 'react';

import { cn } from '../../lib';

import {
  avatarPreview,
  avatarSwatch,
  type AvatarSelectorTone,
} from './FormKit.variants';

/**
 * AvatarSelector (original design AvatarPicker, the original AgentEditor demo; spec:
 * "AvatarSelector"): a big avatar preview, a
 * matching-width 1–2 character initials input, and a 3-column swatch
 * grid picking the background color. Controlled throughout — the parent
 * owns `initials` and `tone` (an agent form, a workspace form, …).
 */

export interface AvatarSelectorProps {
  /** 1–2 characters shown in the avatar; uppercased on input. */
  initials: string;
  onInitialsChange?: (initials: string) => void;
  tone: AvatarSelectorTone;
  onToneChange?: (tone: AvatarSelectorTone) => void;
  /** Spec allows 1 or 2 characters; the original agent picker used 1. */
  maxLength?: 1 | 2;
  /** Swatches offered — defaults to the full original palette (6). */
  tones?: AvatarSelectorTone[];
  id?: string;
  className?: string;
}

const DEFAULT_TONES: AvatarSelectorTone[] = [
  'primary',
  'accent',
  'gold',
  'info',
  'green',
  'slate',
];

export const AvatarSelector = ({
  initials,
  onInitialsChange,
  tone,
  onToneChange,
  maxLength = 2,
  tones = DEFAULT_TONES,
  id,
  className,
}: AvatarSelectorProps) => {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={cn('flex w-[60px] flex-col items-center gap-1.5', className)}>
      <span className={avatarPreview({ tone })} aria-hidden>
        {initials || '?'}
      </span>
      <input
        id={inputId}
        value={initials}
        maxLength={maxLength}
        aria-label="Avatar initials"
        onChange={(e) => onInitialsChange?.(
          e.target.value.toUpperCase().slice(0, maxLength),
        )}
        className="w-full rounded-sm border border-border-soft bg-surface-1 px-1.5 py-1 text-center font-mono text-xs text-fg2 outline-none focus-visible:border-border-focus"
      />
      <div
        role="radiogroup"
        aria-label="Avatar color"
        className="grid grid-cols-3 gap-1"
      >
        {tones.map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={t === tone}
            aria-label={`${t} background`}
            onClick={() => onToneChange?.(t)}
            className={avatarSwatch({ tone: t, selected: t === tone })}
          />
        ))}
      </div>
    </div>
  );
};

AvatarSelector.displayName = 'AvatarSelector';
