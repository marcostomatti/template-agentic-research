/**
 * @packageDocumentation
 * The one piece of the widget that survives a reload: `{size,
 * handles}`, read from and written to a single `localStorage` key.
 *
 * This module is pure and React-free. It touches exactly ONE storage
 * key — {@link DEVTOOLS_SETTINGS_KEY}, the string `devtools.settings`
 * — and nothing else in any storage area. Nothing of the app's
 * `sessionStorage`, none of its other `localStorage` keys and none of
 * its API client is read here, by decision 5 of the spec. The key is
 * `devtools`-prefixed like every other string this package
 * introduces, so it cannot collide with an app key and the port to
 * open-tomato renames nothing.
 *
 * ## The corner is deliberately NOT persisted
 *
 * `Corner` is absent from {@link DevToolsSettings} on purpose, and the
 * asymmetry with {@link Size} is the requirement rather than an
 * oversight: the corner resets to the configured default on every
 * load.
 *
 * The reason is that the two settings answer different questions. A
 * size is a preference — an operator who shrank the trigger wants it
 * small tomorrow too, on every page, forever. A corner is a DODGE: it
 * is moved because the trigger is sitting on top of the thing being
 * looked at right now, and the thing being looked at is gone by the
 * next load. Persisting it would mean a widget that is permanently in
 * the wrong place for every screen but the one where it was last
 * moved, and an operator with no memory of having moved it. Resetting
 * it makes the configured default — `DevToolsConfig.corner` — the
 * answer an app can actually rely on when it positions the widget
 * clear of its own chrome.
 *
 * So this module has no `corner` member to write, and a stored value
 * carrying one is ignored along with every other unknown member. If a
 * later plan reverses the requirement, the reversal is a change to
 * {@link DevToolsSettings} and to this note in the same commit — not
 * a `corner` quietly slipped into the stored record.
 *
 * ## `handles` is a SET of item ids, spelled as an array
 *
 * A drawer item declaring `handle: true` leaves a collapsed tab on the
 * page's edge once it has been opened at least once. "At least once"
 * is what persists: the ids in {@link DevToolsSettings.handles} are
 * the drawer items whose handle the shell draws at mount, before the
 * operator has opened anything this load.
 *
 * It is an array rather than a `Set` because it round-trips through
 * `JSON.stringify` — a `Set` serialises to `{}` and would come back as
 * a wrong-shaped value on the very next read. Order carries no
 * meaning, and duplicates are collapsed on both read and write so a
 * caller cannot grow the record without bound by re-adding an id.
 *
 * ## Every access sits in a try/catch, the bare reference included
 *
 * `localStorage` is not merely a store that can be full. Reaching the
 * IDENTIFIER throws in a browser with site data blocked, and throws a
 * `ReferenceError` under SSR and a prerender where the global is
 * absent outright, so the bare reference is itself inside the `try`
 * here rather than read into a variable above it — a `typeof` guard
 * alone would not survive the first of those. Add a `getItem` that
 * throws, a `setItem` that throws on quota, and text that is not JSON,
 * and the honest count of failure modes is five — all of which answer
 * the same way: {@link readSettings} hands back
 * {@link DEVTOOLS_DEFAULT_SETTINGS}, and {@link writeSettings} answers
 * `false`.
 *
 * Nothing is reported to the console and nothing is rethrown. A
 * development widget that could not remember how big it was drawn is
 * not an event worth an error line in the operator's console, and a
 * throw escaping either function would take out the mount that called
 * it.
 *
 * ## A stored value is repaired member by member, not refused whole
 *
 * A record whose `size` is meaningless answers with the default size
 * and keeps a valid `handles`, and the other way round. Refusing the
 * whole record on one bad member would mean that the day a member is
 * ADDED to {@link DevToolsSettings}, every operator's stored size is
 * thrown away by the first read of the new build. A value that is
 * wrong in both members, or is not an object at all, answers
 * {@link DEVTOOLS_DEFAULT_SETTINGS} in full — which is the same answer
 * either reading would give.
 *
 * ## Mutation note — what the colocated cases actually catch
 *
 * A green suite is not evidence a case can fail. Each leg below was
 * measured by breaking this file, reds `bun x vitest run
 * src/core/settings.test.ts` from `packages/dev-tools` against the 14
 * cases the file holds, and restores this file byte-identical:
 *
 * - Hoisting the `localStorage` reference out of the `try` in
 *   {@link readSettings} answers `Tests  1 failed | 13 passed (14)`,
 *   the one being `answers the defaults when reaching localStorage
 *   itself throws`.
 * - Dropping the `try`/`catch` around `JSON.parse` answers `1 failed |
 *   13 passed`, the one being `answers the defaults when the stored
 *   text is not JSON`.
 * - Dropping the `Array.isArray` leg of `readHandles` answers `2
 *   failed | 12 passed` — `answers the defaults when the stored JSON
 *   is of the wrong shape` and `keeps a valid member when the other
 *   member is wrong`.
 * - Dropping the string check inside `readHandles`, keeping only
 *   `Array.isArray`, answers `1 failed | 13 passed`, the one being
 *   `answers the default handles when the stored array holds a
 *   non-string`.
 * - Dropping the `SIZES.includes` check answers `2 failed | 12 passed`
 *   — the same two cases the `Array.isArray` leg reds, because each of
 *   those two carries one wrong member of each kind.
 * - Dropping the dedupe from {@link writeSettings} answers `1 failed |
 *   13 passed`, the one being `collapses duplicate handle ids on
 *   write`.
 * - Making {@link writeSettings} answer `true` from its `catch` as
 *   well answers `3 failed | 11 passed` — `answers false and does not
 *   throw when setItem throws` plus the two storage-unreachable cases,
 *   which assert the write's answer alongside the read's. Named at
 *   three rather than trimmed to the obvious one, because a mutation
 *   note claiming a tighter blast radius than the run reports is the
 *   false confidence it exists to prevent.
 * - Returning the frozen {@link DEVTOOLS_DEFAULT_SETTINGS} object
 *   itself from the absent-key path rather than a fresh record answers
 *   `14 passed (14)` — measured, and named here rather than left out:
 *   the freeze is belt-and-braces, and what the suite pins is the
 *   VALUE handed back, not its identity.
 */

import type { Size } from './types';

/**
 * The only storage key this package ever touches.
 *
 * Exported so a caller can prove the constraint rather than trust it:
 * the core suite's cross-module case asserts the recorded key set of a
 * spying `localStorage` is exactly this one string, and that the
 * recorded `sessionStorage` set is empty.
 */
export const DEVTOOLS_SETTINGS_KEY = 'devtools.settings';

/**
 * What persists across a reload.
 *
 * Deliberately NOT carrying {@link Corner} — see this module's
 * documentation for why the corner resets every load.
 */
export interface DevToolsSettings {
  /**
   * How large the trigger is drawn.
   *
   * Wins over {@link DevToolsConfig.size}, which is only the answer
   * for an operator who has never picked one.
   */
  readonly size: Size;

  /**
   * The ids of the drawer items whose collapsed handle is drawn at
   * mount — the ones opened at least once, in some earlier load.
   *
   * A set in meaning; an array in spelling, because it round-trips
   * through JSON. Duplicates are collapsed on read and on write.
   */
  readonly handles: readonly string[];
}

/**
 * What every refusal answers: the medium trigger and no handles.
 *
 * Frozen, and `handles` frozen with it, so a caller that mutated what
 * it was handed could not corrupt the value the next refusal answers.
 * {@link readSettings} still builds a fresh record per call rather
 * than handing this one out — the freeze is the second line of
 * defence, not the first.
 */
export const DEVTOOLS_DEFAULT_SETTINGS: DevToolsSettings = Object.freeze({
  size: 'md' as Size,
  handles: Object.freeze([] as readonly string[]),
});

/** Every legal {@link Size}, so a stored one can be checked against it. */
const SIZES: readonly Size[] = ['sm', 'md', 'lg'];

/**
 * Narrow a stored member to a {@link Size}.
 *
 * @param value - Whatever came back out of the stored JSON.
 * @returns The size, or the default size when it is not one.
 */
function readSize(value: unknown): Size {
  return SIZES.includes(value as Size)
    ? value as Size
    : DEVTOOLS_DEFAULT_SETTINGS.size;
}

/**
 * Narrow a stored member to a list of handle ids.
 *
 * An array holding anything that is not a string is refused whole
 * rather than filtered: a partly-kept list is a silent edit of what
 * the operator's browser said, and the cost of refusing it is one
 * forgotten tab.
 *
 * @param value - Whatever came back out of the stored JSON.
 * @returns The deduplicated ids, or the default empty list.
 */
function readHandles(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return DEVTOOLS_DEFAULT_SETTINGS.handles;
  }

  if (!value.every((id) => typeof id === 'string')) {
    return DEVTOOLS_DEFAULT_SETTINGS.handles;
  }

  return [...new Set(value as string[])];
}

/**
 * Read the persisted settings.
 *
 * Total: it answers a usable {@link DevToolsSettings} for every input,
 * never throws and never reports. An absent key, an unreachable or
 * absent `localStorage`, text that is not JSON, JSON of the wrong
 * shape and a record with one bad member are all answered from
 * {@link DEVTOOLS_DEFAULT_SETTINGS} — the last of those member by
 * member, keeping whatever was valid.
 *
 * @returns A fresh record, safe for the caller to hold.
 */
export function readSettings(): DevToolsSettings {
  let stored: string | null;

  try {
    // The reference is INSIDE the try on purpose: reaching
    // `localStorage` throws outright in a browser with site data
    // blocked, and is a `ReferenceError` where the global is absent,
    // so a `typeof` guard around a hoisted reference would not
    // survive either.
    stored = localStorage.getItem(DEVTOOLS_SETTINGS_KEY);
  } catch {
    // Storage unreachable. Not reported: a widget that cannot
    // remember its own size is not worth a line in the operator's
    // console.
    return { ...DEVTOOLS_DEFAULT_SETTINGS };
  }

  if (stored === null) {
    return { ...DEVTOOLS_DEFAULT_SETTINGS };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(stored);
  } catch {
    return { ...DEVTOOLS_DEFAULT_SETTINGS };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ...DEVTOOLS_DEFAULT_SETTINGS };
  }

  const record = parsed as Record<string, unknown>;

  return {
    size: readSize(record.size),
    handles: readHandles(record.handles),
  };
}

/**
 * Persist the settings, replacing whatever was stored.
 *
 * Writes the two known members and nothing else, so an unknown member
 * left by another build does not survive a write. Handle ids are
 * deduplicated, so repeated adds cannot grow the record without
 * bound.
 *
 * @param value - The settings to store.
 * @returns `true` when the write landed, `false` when storage was
 * unreachable, absent or full. Never throws, so a caller that does not
 * care may ignore the answer.
 */
export function writeSettings(value: DevToolsSettings): boolean {
  const record: DevToolsSettings = {
    size: value.size,
    handles: [...new Set(value.handles)],
  };

  try {
    localStorage.setItem(
      DEVTOOLS_SETTINGS_KEY,
      JSON.stringify(record),
    );

    return true;
  } catch {
    // Unreachable storage, no storage at all, or a full quota. All
    // three are the same answer to the caller: it did not land.
    return false;
  }
}
