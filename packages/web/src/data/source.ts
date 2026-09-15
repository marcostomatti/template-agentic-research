/**
 * The data-source decision, as a pure function over the one build-time
 * input that makes it.
 *
 * `VITE_AR_API_URL` being UNDEFINED selects the fixture layer; any string
 * at all, the empty one included, selects the HTTP layer. The empty string
 * is the same-origin production value — requests go to `/me`, not to a
 * host — so it must not collapse into the fixture branch the way a falsy
 * test would make it.
 *
 * @packageDocumentation
 */

/** The fixture layer: no network, every accessor answered in the tab. */
export interface FixtureSource {
  readonly kind: 'fixture';
}

/** The HTTP layer, rooted at `baseUrl` (`''` means same-origin). */
export interface ApiSource {
  readonly kind: 'api';
  readonly baseUrl: string;
}

/** Which data layer the accessors are taken from. */
export type DataSource = FixtureSource | ApiSource;

/**
 * Resolves the data source from the raw `VITE_AR_API_URL` value.
 *
 * Surrounding whitespace is trimmed, so a blank value is same-origin rather
 * than a base URL of spaces, and trailing slashes are trimmed, so the base
 * joins a root-absolute request path without doubling the slash.
 *
 * @param apiUrl - The raw env value; `undefined` when the variable is unset.
 * @returns `{ kind: 'fixture' }` for `undefined`, otherwise
 *   `{ kind: 'api', baseUrl }`.
 */
export function resolveDataSource(apiUrl: string | undefined): DataSource {
  if (apiUrl === undefined) {
    return { kind: 'fixture' };
  }

  return { kind: 'api', baseUrl: apiUrl.trim().replace(/\/+$/, '') };
}
