/**
 * @packageDocumentation
 * One URL search parameter, read and written as if it were state.
 *
 * The list surfaces keep their filters in the URL rather than in a
 * component: a filtered digest is then a link an operator can paste to a
 * colleague, a reload keeps the filter, and the back button undoes the
 * last change instead of leaving the page. That is the repo's URL-as-state
 * rule, and this module is the whole of it — a page calls
 * {@link useSearchParamState} once per control and never touches
 * `useSearchParams` itself.
 *
 * ## No state, so no effect to derive it
 *
 * There is no `useState` here and no `useEffect`. The URL IS the state:
 * the value is parsed out of the current search params DURING RENDER, and
 * writing it navigates. A mirror copy in `useState` would need an effect
 * to follow a back button, a deep link or the domain switcher's base swap
 * — none of which route through this hook's setter — which is exactly the
 * derived-state-in-an-effect shape `.claude/skills/react-hooks/SKILL.md`
 * is about, with the added twist that the source of truth here is not even
 * React's.
 *
 * ## The fallback, and why it is required
 *
 * Each caller names the value its control shows when the parameter is
 * absent — `''` for a search box, an `all` sentinel for a select. That
 * value is deliberately NOT written to the URL: {@link serializeSearchParam}
 * deletes the key instead, so the unfiltered state of a page has exactly
 * ONE address rather than one per control left at its default. It has no
 * parameter default because a select that forgot to name its sentinel
 * would read `''` on a fresh page — a control rendering with nothing
 * selected — and would pin `?verdict=all` into every link the page
 * produces. Both failures are quiet; naming the fallback at the call site
 * costs a word.
 *
 * ## What is covered where
 *
 * The two helpers are pure and carry the colocated tests. The hook itself
 * needs a router context, so it is not reachable from the node unit suite
 * (see `tests/README.md` for the two-runner split) and is exercised
 * through the pages that use it.
 */

import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

/**
 * Read one parameter out of a set of search params.
 *
 * An absent key and an empty value answer the same thing, because
 * {@link serializeSearchParam} never writes an empty one — `?q=` only
 * arrives from a hand-edited address bar, and treating it as a real
 * (empty) filter would differ from the same page reached without it.
 *
 * A repeated key answers with the FIRST value, which is what
 * `URLSearchParams.get` does. Nothing here writes a repeated key, so this
 * only decides what a hand-edited `?q=a&q=b` means rather than being a
 * rule the app relies on.
 *
 * @param params - Current search params, as `useSearchParams` hands them
 * over.
 * @param key - Parameter name.
 * @param fallback - Value to report when the parameter says nothing.
 * @returns The parameter's value, or `fallback`.
 */
export function parseSearchParam(
  params: URLSearchParams,
  key: string,
  fallback: string,
): string {
  const raw = params.get(key);

  if (raw === null || raw === '') {
    return fallback;
  }

  return raw;
}

/**
 * The search params a page should navigate to after one parameter changes.
 *
 * Returns a NEW `URLSearchParams` and never writes through the argument:
 * the params `useSearchParams` hands over are memoized off the current
 * location, so mutating them would change what the rest of the render
 * sees while the URL still said otherwise.
 *
 * Every OTHER parameter survives, in place — several controls on one
 * surface each own their own key, and a select must not clear the search
 * box beside it. The key is `set` rather than appended, so a hand-written
 * repeated key collapses to the one value this app can express.
 *
 * A value equal to `fallback`, or empty, DELETES the key. That is what
 * keeps the default state of a page at one canonical address, and it is
 * the one lossy step: writing `''` under a non-empty fallback reads back
 * as the fallback rather than as an empty string.
 *
 * @param params - Current search params.
 * @param key - Parameter name.
 * @param value - Value the control now holds.
 * @param fallback - Value that means "say nothing", from the call site.
 * @returns A fresh set of params carrying the change.
 */
export function serializeSearchParam(
  params: URLSearchParams,
  key: string,
  value: string,
  fallback: string,
): URLSearchParams {
  const next = new URLSearchParams(params);

  if (value === '' || value === fallback) {
    next.delete(key);
  } else {
    next.set(key, value);
  }

  return next;
}

/** What {@link useSearchParamState} hands back. */
export interface UseSearchParamStateResult {
  /** Current value — bind straight to the control's `value` prop. */
  readonly value: string;
  /** Write a new value into the URL. */
  readonly setValue: (next: string) => void;
}

/**
 * Own one search parameter on behalf of one control.
 *
 * The write REPLACES the current history entry rather than pushing one.
 * A filter is not a navigation: a search box writing per keystroke would
 * otherwise bury the surface the operator arrived from under one entry
 * per character, and the back button would walk the query backwards a
 * letter at a time instead of leaving the page.
 *
 * The setter takes the updater form of `setSearchParams`, so the change
 * is applied to the params of the render it fires from rather than to a
 * copy captured earlier — the difference two controls updating in the
 * same tick would otherwise show up as one of them being dropped.
 *
 * Browser-only, like the rest of the shell: it reads the router's
 * location.
 *
 * @param key - Parameter name this control owns.
 * @param fallback - Value shown when the parameter is absent, and the
 * one value never written to the URL.
 * @returns The current value and the setter to change it.
 */
export function useSearchParamState(
  key: string,
  fallback: string,
): UseSearchParamStateResult {
  const [searchParams, setSearchParams] = useSearchParams();

  const value = parseSearchParam(searchParams, key, fallback);

  const setValue = useCallback(
    (next: string) => {
      setSearchParams(
        (current) => serializeSearchParam(current, key, next, fallback),
        { replace: true },
      );
    },
    [fallback, key, setSearchParams],
  );

  return { value, setValue };
}
