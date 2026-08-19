import { IconTile } from '../../../atoms/IconTile';
import { StrokeIcon, type IconName } from '../../../lib/icons';
import { preventPlaceholderNav } from '../shared';

/** A next-steps row — icon tile, label + sub, trailing arrow. */
export const NextStep = ({ icon, label, sub }: { icon: IconName; label: string; sub: string }) => (
  <a
    href="#next-steps"
    onClick={preventPlaceholderNav}
    className="flex items-center gap-2.5 rounded-sm p-2 text-inherit !no-underline transition-colors hover:bg-surface-1"
  >
    <IconTile size="sm" icon={<StrokeIcon name={icon} size={14} />} />
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="text-[13px] font-semibold text-fg1">{label}</span>
      <span className="text-[11px] text-fg3">{sub}</span>
    </span>
    <StrokeIcon name="arrowRight" size={14} className="text-fg3" />
  </a>
);

NextStep.displayName = 'NextStep';
