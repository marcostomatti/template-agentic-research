/**
 * @packageDocumentation
 * What the shell chrome itself renders: the search palette behind the
 * topbar's input, the notification list behind its bell, and the
 * operator behind its avatar.
 *
 * All three MIRROR NO TABLE, which makes this the third module here
 * standing on nothing stored — after `./settings.ts` and
 * `./spend.ts`. Schema v2 has no search index (the palette stands in
 * for a query across the tables the other modules mirror), no
 * notifications table (an alert would be derived from the states
 * those tables already hold — a failing source, a subscription that
 * ran), and no users table at all (this deployment is one operator on
 * one machine, with nothing to authenticate against). So each fixture
 * below says what it WOULD be read from, and a later wave needs a
 * decision about where each one comes from before it can point an
 * endpoint at it.
 *
 * Typed against `@ar/ui`'s exported prop types rather than
 * redeclared, which is the opposite of what `./types.ts` does and for
 * a reason worth keeping straight: those types mirror the SCHEMA and
 * must not import from the service, while these three have exactly
 * one consumer each — `SearchSuggest`, `NotificationsBell` and
 * `ProfileMenu`, all in a package this one already depends on. A
 * redeclared `SearchSuggestionKind` here would be a second copy of a
 * union the component owns, free to drift from the component that
 * renders it.
 *
 * None of the three is domain-scoped, so all three accessors below
 * join the set `./api.ts` cannot hold to its "rejects an unknown
 * domain slug" rule — which is now six accessors rather than three:
 * `listConnectors`, `getSettings`, `getSpendSummary`, and the
 * {@link listSearchSuggestions}, {@link listNotifications} and
 * {@link getOperator} here. The shell-visible consequence is that a
 * domain switch leaves the topbar's own contents exactly where they
 * were, which is right for the bell and the avatar and is a KNOWN
 * NARROWING for the palette: a live search endpoint would be scoped
 * (`/d/:slug/search`), and the fixture stands in for the control
 * rather than for the query behind it. A per-domain palette would
 * mean inventing a second set of hits for a domain deliberately
 * seeded with almost nothing, which would demonstrate an absence
 * instead of the control.
 *
 * The labels and bodies below NAME rows the other fixture modules
 * carry — an entity, a term, a source's endpoint, a connector, a
 * persona role. Nothing joins them at compile time, so a row renamed
 * elsewhere leaves a palette entry pointing at something that is no
 * longer there. `./shell.test.ts` holds that join, per the rule
 * `./digest.ts` states for cross-module fixture references: the
 * module that holds BOTH sides is where the check lands, and for
 * these it is this module's test.
 */

import type {
  NotificationItem,
  NotificationLevel,
  ProfileMenuUser,
  SearchSuggestion,
  SearchSuggestionKind,
} from '@ar/ui';

/**
 * One suggestion per kind, keyed by the kind it stands for.
 *
 * A `Record` over the whole union rather than a list, because that is
 * what makes a SIXTH kind added to `SearchSuggestionKind` a compile
 * error here instead of a pill the palette silently never renders.
 * `@ar/ui` is a separate package and its unions move without this one
 * being edited, so the compiler is the only thing that would notice.
 * The other half of the chain — a kind dropped from the fixture
 * without being dropped from the union — is a test, since a list
 * built from a record cannot be short a key.
 *
 * `kind` is omitted from the values and attached from the key below,
 * so an entry cannot come to disagree with the key it is filed under.
 * Written out, `doc: { kind: 'agent', ... }` type-checks and renders
 * an agent pill on the digest's row.
 *
 * The mapping from research vocabulary onto the closed union is the
 * decision this record records, and it is one hit per CONTENT
 * SURFACE rather than five arbitrary picks:
 *
 * | kind      | stands for | surface   |
 * |-----------|------------|-----------|
 * | `doc`     | a finding  | digest    |
 * | `task`    | a term     | lexicon   |
 * | `session` | a source   | sources   |
 * | `agent`   | a persona  | agents    |
 * | `tool`    | a connector| tools     |
 *
 * Five kinds and five content surfaces, which is a coincidence worth
 * spending: `SearchSuggest` shows the first five suggestions before
 * anything is typed, so a palette of exactly one per surface is a
 * palette where every surface is reachable without a query. Settings
 * is the sixth surface and has no kind, which is correct — it holds
 * preferences rather than content anything would search.
 *
 * Each `sub` opens with the surface id, so the mono context line
 * under a label says where the hit lives before it says what it is.
 * `./shell.test.ts` pins those against the surface table.
 */
const SUGGESTION_BY_KIND: Readonly<
  Record<SearchSuggestionKind, Omit<SearchSuggestion, 'kind'>>
> = {
  // Entity 2 in `./digest.ts`, the subject of the one finding an
  // operator has ruled `caution` on. Named by its entity rather than
  // by its summary because a subject is what somebody searches for.
  doc: {
    label: 'Example Graph Store',
    sub: 'digest · caution',
  },
  // Term 3 in `./lexicon.ts`: the negative pattern under the
  // technologies category, and the row whose notes explain why this
  // example domain weighs it down.
  task: {
    label: 'proprietary runtime',
    sub: 'lexicon · technologies · negative',
  },
  // Source 1 in `./sources.ts`, scheme stripped — the palette shows
  // what an operator would type, and nobody types the scheme.
  session: {
    label: 'api.example.com/v1/releases',
    sub: 'sources · api',
  },
  // Persona 1 in `./personas.ts`: the first role of the pass, and the
  // one whose name reads as a thing to open rather than as a stage.
  agent: {
    label: 'researcher',
    sub: 'agents · Example Tech Radar',
  },
  // Connector 3 in `./connectors.ts`, the search client. Its name is
  // the short one in that table, which is what a palette wants.
  tool: {
    label: 'web',
    sub: 'tools · search',
  },
};

/**
 * The order the palette renders in, before anything is typed.
 *
 * Nav order — digest, lexicon, sources, agents, tools — so the panel
 * and the sidebar list the platform the same way round. A palette
 * ordered differently from the nav is a second thing to learn for no
 * gain, and this list is short enough that the order is the whole of
 * its usability.
 *
 * Module-private: no page reorders these, because the array order IS
 * the render order. `./shell.test.ts` pins it against a literal.
 */
const SUGGESTION_ORDER: readonly SearchSuggestionKind[] = [
  'doc',
  'task',
  'session',
  'agent',
  'tool',
];

/**
 * The palette the topbar's search input suggests from.
 *
 * Frozen through, for the reason `./settings.ts` gives: one shared
 * array handed to every caller, no accessor copying it, and
 * `readonly` is a compile-time claim a cast drops.
 */
export const SEARCH_SUGGESTIONS: readonly SearchSuggestion[] = Object.freeze(
  SUGGESTION_ORDER.map((kind) => Object.freeze({
    kind,
    ...SUGGESTION_BY_KIND[kind],
  })),
);

/**
 * One notification per level, keyed by the level it carries.
 *
 * Same record-over-the-union shape as {@link SUGGESTION_BY_KIND} and
 * for the same reason: a fifth `NotificationLevel` in `@ar/ui` is a
 * compile error here rather than a group the bell never renders.
 * `level` is attached from the key below so a row cannot contradict
 * the group it is filed under.
 *
 * Every level is present on purpose. `NotificationsBell` renders a
 * group per level and skips the empty ones, so a fixture missing a
 * level leaves that group's chrome — its heading, its puck tone —
 * unrehearsed by every demo and every screenshot.
 *
 * Each entry stands for a state the other fixture modules already
 * hold, rather than for an event this deployment invented: two source
 * states, an export that ran, a finding nobody has ruled on. That is
 * what a derived notification would be, and it keeps the bell
 * honest about the pages under it.
 *
 * `id` is a slug rather than a number, unlike every other fixture id
 * in this directory. Those mirror `bigserial` columns; there is no
 * table here, so a serial-looking number would be a claim about
 * storage that nothing backs. The slug says what the row is about and
 * is stable enough to key a list on.
 *
 * `time` is written prose, and it is the one relative time in the
 * shell not rendered against `FIXTURE_NOW`. `NotificationItem.time`
 * is a `string` the bell prints verbatim, and `@ar/ui`'s barrel
 * exports its relative-time ladder only as the `FormattedRelativeTime`
 * COMPONENT — which cannot be passed into a string prop — so there is
 * nothing to derive a chip with here. Each chip is anchored to the
 * stamp it stands for in the comment beside it; when a later wave
 * gives notifications a real source, the instant comes back on the
 * wire and the chip becomes a render like every other relative time.
 *
 * `icon` is left off everywhere: the four level defaults are already
 * four distinct glyphs, and an override that only restates the level
 * is noise.
 */
const NOTIFICATION_BY_LEVEL: Readonly<
  Record<NotificationLevel, Omit<NotificationItem, 'level'>>
> = {
  ok: {
    id: 'digest-exported',
    title: 'Weekly digest written to the notes directory',
    // Export subscription 1 in `./connectors.ts`: daily markdown into
    // the `notes-directory` target.
    body: 'obsidian_md · notes-directory',
    // That subscription is next due at 06:00 tomorrow on a daily
    // cadence, so it last ran at 06:00 today — eight and a half hours
    // before `FIXTURE_NOW`.
    time: '8h ago',
    // Unread, and benign. Unread deliberately does NOT track severity
    // here: the bell dots on unread alone, so a fixture where the
    // unread rows are also the alarming ones lets a bell that dotted
    // on level pass for one that reads the flag.
    unread: true,
  },
  warn: {
    id: 'source-flagged',
    title: 'A source is flagged for review',
    // Source 7 in `./sources.ts`: flagged, with no failure streak
    // behind it, because a success cleared the counter and nothing
    // clears the flag but an operator.
    body: 'example.org/feeds/public-sector.xml is flagged, and nothing '
      + 'clears a flag automatically.',
    // Its last failure is nine days before `FIXTURE_NOW`, which is
    // the failure the flag was raised on.
    time: 'last week',
    // Read, and still a warning. The other half of the pair above.
    unread: false,
  },
  err: {
    id: 'source-failing',
    title: 'A source has stopped returning anything usable',
    // Source 6 in `./sources.ts`: a streak of two, and no success
    // ever — reached, and nothing usable has come back.
    body: 'api.example.net/v2/index has failed twice in a row.',
    // Its last failure is 22:15 the previous day, sixteen and a
    // quarter hours before `FIXTURE_NOW`.
    time: '16h ago',
    unread: true,
  },
  info: {
    id: 'finding-unruled',
    title: 'A finding is waiting for a verdict',
    // Finding 1 in `./digest.ts`: the row that is neither scored nor
    // ruled on, which is the state every finding starts in and the
    // one an operator works the digest to clear.
    body: 'One finding from 8 June is still unscored and unruled.',
    // That finding was created on 8 June, three calendar days before
    // `FIXTURE_NOW`.
    time: '3 days ago',
    unread: false,
  },
};

/**
 * The order the fixture is BUILT in, which is not the order the bell
 * renders.
 *
 * `NotificationsBell` groups by level and walks its own ok / warn /
 * err / info order, so this list decides nothing an operator sees
 * while each level holds one row. It exists so the array below is
 * derived deterministically rather than off `Object.keys`, and it is
 * module-private because no page has any use for it.
 */
const NOTIFICATION_ORDER: readonly NotificationLevel[] = [
  'err',
  'warn',
  'ok',
  'info',
];

/**
 * What the topbar's bell reports.
 *
 * Frozen through, and the per-item freeze is the half that earns its
 * keep: `NotificationsBell` is parent-owned — it renders what it is
 * given and reports `onMarkAllRead` back — so the shell answers that
 * callback with a NEW list. An item frozen here is what makes the
 * shortcut, flipping `unread` on the fixture in place, throw where it
 * is written instead of quietly changing what every later reader in
 * the tab sees and losing it on reload.
 */
export const NOTIFICATIONS: readonly NotificationItem[] = Object.freeze(
  NOTIFICATION_ORDER.map((level) => Object.freeze({
    level,
    ...NOTIFICATION_BY_LEVEL[level],
  })),
);

/**
 * Who the shell is running as.
 *
 * There is no `users` table in schema v2 and no authentication in
 * front of this app: it is one operator on one machine, which is why
 * this is a single frozen object rather than a lookup. The three
 * members exist because `ProfileMenu` renders an identity block —
 * avatar initials from the name, the email under it, the role as a
 * badge — and a menu that opened onto blanks would be worse than one
 * that says plainly what it knows.
 *
 * The address is `localhost` rather than the `example.com` the rest
 * of the fixtures use, and that is the point: every other address in
 * this layer stands in for something a pipeline would reach over the
 * network, while this one names a person who is sitting at the
 * machine. An example.com operator would read as an account on a
 * service that does not exist.
 *
 * `role` is what the badge says, and `owner` is the only honest
 * reading of a single-operator deployment — there is exactly one, and
 * everything belongs to them. When accounts arrive it becomes the
 * membership role, which is the same word doing a smaller job.
 *
 * Frozen for `./settings.ts`'s reason: one shared object, no accessor
 * copying it. The freeze is shallow AND complete — every member is a
 * string, so there is no nested payload for a second freeze to reach.
 */
export const OPERATOR: ProfileMenuUser = Object.freeze({
  name: 'Local Operator',
  email: 'operator@localhost',
  role: 'owner',
});

/**
 * The search palette, in the order the panel renders it.
 *
 * Takes no domain argument — see the module docblock for what that
 * means for `./api.ts` and for the domain switcher, and for why the
 * palette is the one member of that set where it is a narrowing
 * rather than the shape of the thing.
 *
 * Hands back the shared frozen array rather than a copy, exactly as
 * `getSettings` does: a copy would be a fresh UNFROZEN one, which is
 * the array a caller can sort or splice in place and believe the
 * change took.
 *
 * @returns The suggestion fixtures. Always the same array.
 */
export function listSearchSuggestions(): readonly SearchSuggestion[] {
  return SEARCH_SUGGESTIONS;
}

/**
 * What the bell reports, one row per level.
 *
 * Takes no domain argument, per the module docblock. Hands back the
 * shared frozen array for the reason {@link listSearchSuggestions}
 * gives; a shell holding notification state seeds `useState` from
 * this and answers `onMarkAllRead` with a new list.
 *
 * @returns The notification fixtures. Always the same array.
 */
export function listNotifications(): readonly NotificationItem[] {
  return NOTIFICATIONS;
}

/**
 * The operator this shell is running as.
 *
 * Takes no domain argument, per the module docblock. Hands back the
 * shared frozen object rather than a copy, exactly as `getSettings`
 * does.
 *
 * @returns The operator stub. Always the same object.
 */
export function getOperator(): ProfileMenuUser {
  return OPERATOR;
}
