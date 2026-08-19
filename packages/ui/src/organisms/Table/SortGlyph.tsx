import { StrokeIcon } from '../../lib/icons';

export interface SortGlyphProps {
  sortable?: boolean;
  active: boolean;
  dir: 'asc' | 'desc';
}

/**
 * The header sort affordance: a faint chevron hint that brightens on header
 * hover (via the th's group/head), swapping to an accent arrow when active.
 */
export const SortGlyph = ({ sortable, active, dir }: SortGlyphProps) => {
  if (!sortable) return null;
  if (!active)
    return (
      <span className="inline-flex opacity-25 transition-opacity group-hover/head:opacity-100">
        <StrokeIcon name="chevronDown" size={13} />
      </span>
    );
  return (
    <span className="inline-flex text-accent">
      <StrokeIcon name={dir === 'asc'
        ? 'arrowUp'
        : 'arrowDown'} size={13} />
    </span>
  );
};

SortGlyph.displayName = 'SortGlyph';
