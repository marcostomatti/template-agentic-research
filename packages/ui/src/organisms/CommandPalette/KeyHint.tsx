import type { ReactNode } from 'react';

import { paletteKbd } from './CommandPalette.variants';

export interface KeyHintProps {
  k: ReactNode;
  label: ReactNode;
}

/** A footer key legend entry: a kbd chip + what it does. */
export const KeyHint = ({ k, label }: KeyHintProps) => (
  <span className="inline-flex items-center gap-1.5">
    <kbd className={paletteKbd({ size: 'sm', surface: 'raised' })}>{k}</kbd>
    {label}
  </span>
);

KeyHint.displayName = 'KeyHint';
