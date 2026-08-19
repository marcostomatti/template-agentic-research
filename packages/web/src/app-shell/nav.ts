import type { SidebarNavConfigItem } from '@ar/ui';

/**
 * Navigation as data (same pattern as the reference shell): one entry per
 * top-level surface of the research platform. Pages arrive with the UI spec;
 * ids double as the future route segments.
 */
export const NAV_ITEMS: SidebarNavConfigItem[] = [
  { id: 'digest', label: 'Digest', icon: 'newspaper' },
  { id: 'lexicon', label: 'Lexicon', icon: 'tags' },
  { id: 'sources', label: 'Sources', icon: 'rss' },
  { id: 'agents', label: 'Agents', icon: 'bot' },
  { id: 'tools', label: 'Tools', icon: 'wrench' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

export const NAV_TITLES: Record<string, string> = Object.fromEntries(
  NAV_ITEMS.map((item) => [item.id, item.label]),
);
