/** The sign-up flow's two-step rail, shared by all step screens. */
export const SIGNUP_STEPS = [
  { key: 'account', label: 'Account' },
  { key: 'workspace', label: 'Workspace' },
] as const;

/** Lowercase handle: strip whitespace, keep [a-z0-9_-]. */
export const toHandle = (v: string) => v.toLowerCase().replace(/\s+/g, '')
  .replace(/[^a-z0-9_-]/g, '');

/** Placeholder links: routes are wired by the consuming app; until then the
    anchors stay inert (no fragment navigation, no history entries). */
export const preventPlaceholderNav = (event: { preventDefault(): void }) => event.preventDefault();
