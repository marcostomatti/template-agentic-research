/**
 * @packageDocumentation
 * The return-path arithmetic around `/login`: where to send an operator
 * whose session just went away, and which of the paths that come back out
 * of the URL bar may be honoured afterwards.
 *
 * The pair is deliberately one module. {@link loginPathFor} writes the
 * `next` parameter and {@link safeReturnPath} reads it, and the only
 * property worth having — that a login round trip lands exactly where it
 * started and nowhere else — belongs to the two together rather than to
 * either. It is also where the open-redirect guard lives: `next` is
 * attacker-authored in the one case that matters, a link mailed to an
 * operator, so the READ side refuses rather than the write side.
 *
 * What survives the guard is a same-origin root-relative path. Everything
 * else answers `/`: an absolute URL, a protocol-relative `//host`, any
 * backslash form (browsers fold `\` to `/`, so `/\evil.com` IS
 * `//evil.com`), a `javascript:` URL, a path whose dot segments resolve
 * to `//host`, a C0 control character (tab, newline and carriage return
 * are STRIPPED by URL parsing, so a value carrying them is not the value
 * it looks like), and any path under `/login` itself, which would
 * otherwise make a successful login navigate straight back to the form.
 *
 * Both functions are pure and take the location as arguments, so the whole
 * decision is reachable from the unit suite — the `.tsx` that calls them
 * is not.
 */

/** Query parameter the login route carries its return path in. */
export const RETURN_PARAM = 'next';

/** The login route's own path, below the router basename. */
export const LOGIN_PATH = '/login';

/** Where a refused — or absent — return path sends the operator instead. */
const FALLBACK_PATH = '/';

/**
 * Origin a candidate path is resolved against for inspection.
 *
 * A `.invalid` host can never be a real origin (RFC 2606), so an input
 * that comes back out of `URL` still carrying it cannot have named a host
 * of its own. Asking the resolver rather than a regex over the raw string
 * is the point: `URL` applies the same backslash folding, control
 * stripping and scheme parsing the browser will.
 */
const SENTINEL_ORIGIN = 'https://return-path.invalid';

/** Highest code point treated as a C0 control. */
const LAST_CONTROL_CODE = 0x1f;

/** DEL, the one control character above the C0 block. */
const DELETE_CODE = 0x7f;

/**
 * The path a login round trip should come back to.
 *
 * Runs the candidate through {@link safeReturnPath} rather than trusting
 * its caller: the location handed in is a real one today, but a `/login`
 * location — a second redirect while the form is already showing — would
 * otherwise write a `next` that loops.
 *
 * @param pathname - Current path, below the router basename.
 * @param search - Current query string, with its leading `?`, or empty.
 * @returns `/login` carrying the location as its `next` parameter, or a
 * bare `/login` where there is nothing worth coming back to.
 */
export function loginPathFor(pathname: string, search: string): string {
  const target = safeReturnPath(`${pathname}${search}`);

  if (target === FALLBACK_PATH) {
    return LOGIN_PATH;
  }

  const params = new URLSearchParams({ [RETURN_PARAM]: target });

  return `${LOGIN_PATH}?${params.toString()}`;
}

/**
 * The return path a login may honour, or `/`.
 *
 * Answers an accepted input VERBATIM, never the resolved path:
 * `/..//evil.com` resolves to the pathname `//evil.com`, which is
 * same-origin as a resolution but protocol-relative as a string, and
 * handing that back would launder exactly the input this refuses. Such a
 * value is refused rather than returned in either spelling.
 *
 * @param raw - Candidate path, already percent-decoded — as
 * `URLSearchParams.get` answers it, which is `null` when absent.
 * @returns The same root-relative path, or `/` for anything else.
 */
export function safeReturnPath(raw: string | null | undefined): string {
  if (raw === undefined || raw === null || raw === '') {
    return FALLBACK_PATH;
  }

  // Refuses `javascript:`, `https://host` and every other absolute form,
  // along with a leading space that URL parsing would otherwise trim off.
  if (!raw.startsWith('/')) {
    return FALLBACK_PATH;
  }

  if (raw.includes('\\') || hasControlCharacter(raw)) {
    return FALLBACK_PATH;
  }

  const resolved = resolveOnSentinel(raw);

  if (resolved === undefined) {
    return FALLBACK_PATH;
  }

  if (resolved.pathname.startsWith('//') || isLoginPath(resolved.pathname)) {
    return FALLBACK_PATH;
  }

  return raw;
}

/**
 * Whether a value carries a C0 control character or DEL.
 *
 * Written as a scan rather than a regex so no control character has to be
 * spelled into the source — a literal one in a character class is both
 * invisible in a diff and what `no-control-regex` exists to refuse.
 *
 * @param value - Candidate path.
 * @returns `true` when at least one character is a control.
 */
function hasControlCharacter(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;

    if (code <= LAST_CONTROL_CODE || code === DELETE_CODE) {
      return true;
    }
  }

  return false;
}

/**
 * Resolve a candidate against {@link SENTINEL_ORIGIN}.
 *
 * @param raw - Candidate path.
 * @returns The resolved URL, or `undefined` where the candidate named an
 * origin — or a scheme — of its own rather than borrowing the sentinel's.
 */
function resolveOnSentinel(raw: string): URL | undefined {
  let resolved: URL;

  try {
    resolved = new URL(raw, SENTINEL_ORIGIN);
  } catch {
    return undefined;
  }

  return resolved.origin === SENTINEL_ORIGIN
    ? resolved
    : undefined;
}

/**
 * Whether a resolved path is the login route or sits under it.
 *
 * Compared case-insensitively, which is wider than the routes the router
 * declares: `/LOGIN` matches nothing and would land on the catch-all
 * rather than the form, so refusing it costs the guard nothing and keeps
 * a case-folding proxy from reopening the loop this closes.
 *
 * @param pathname - Resolved pathname.
 * @returns `true` for `/login` and anything below it.
 */
function isLoginPath(pathname: string): boolean {
  const lowered = pathname.toLowerCase();

  return lowered === LOGIN_PATH || lowered.startsWith(`${LOGIN_PATH}/`);
}
