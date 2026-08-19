/** "refactor-bot" → RB, "Jane Lin" → JL — first letters of the first two words. */
export const initials = (name: string): string => name
  .split(/[\s\-_]+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0]?.toUpperCase() ?? '')
  .join('');
