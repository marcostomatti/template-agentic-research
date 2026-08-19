import type { SVGProps } from 'react';

/**
 * Internal stroke-icon helper — lucide-style paths for the glyphs
 * components render THEMSELVES (sort arrows, drop glyphs, checkmarks, …).
 *
 * NOT part of the public API and never re-exported from the package root:
 * the real Icon component is a tracked follow-up (AGENTS.md), and consumer
 * icon slots stay ReactNode props. Import via '../../lib/icons' directly.
 */
// eslint-disable-next-line react-refresh/only-export-components -- internal data map, not HMR-relevant
export const ICON_PATHS = {
  alertTriangle:
    'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01',
  arrowDown: 'M19 12l-7 7-7-7M12 19V5',
  arrowRight: 'M5 12h14M12 5l7 7-7 7',
  arrowUp: 'M5 12l7-7 7 7M12 5v14',
  bot: 'M12 8V4H8M4 20h16a2 2 0 002-2v-8a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2zM2 14h2M20 14h2M15 13v2M9 13v2',
  check: 'M20 6L9 17l-5-5',
  chevronDown: 'M6 9l6 6 6-6',
  chevronsUpDown: 'M7 15l5 5 5-5M7 9l5-5 5 5',
  clock: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2',
  code: 'M16 18l6-6-6-6M8 6l-6 6 6 6',
  copy: 'M20 9h-9a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-9a2 2 0 00-2-2zM5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1',
  cornerDownRight: 'M15 10l5 5-5 5M4 4v7a4 4 0 004 4h12',
  download: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 100-6 3 3 0 000 6z',
  fileText:
    'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
  filter: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
  gripVertical: 'M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01',
  helpCircle:
    'M12 22a10 10 0 100-20 10 10 0 000 20zM9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01',
  key: 'M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3M15.5 7.5L19 4',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  mail: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6',
  plus: 'M12 5v14M5 12h14',
  search: 'M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z',
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  shieldCheck:
    'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4',
  terminal: 'M4 17l6-6-6-6M12 19h8',
  trash:
    'M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6',
  uploadCloud:
    'M16 16l-4-4-4 4M12 12v9M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3M16 16l-4-4-4 4',
  userPlus:
    'M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M8.5 11a4 4 0 100-8 4 4 0 000 8zM20 8v6M23 11h-6',
  x: 'M18 6L6 18M6 6l12 12',
  zap: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
} as const;

export type IconName = keyof typeof ICON_PATHS;

export interface StrokeIconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export const StrokeIcon = ({ name, size = 16, ...props }: StrokeIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    {...props}
  >
    <path d={ICON_PATHS[name]} />
  </svg>
);
