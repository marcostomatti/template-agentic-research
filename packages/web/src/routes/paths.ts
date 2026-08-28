/**
 * @packageDocumentation
 * The route surface table and the two-base path arithmetic every piece of
 * navigation in the app is expressed against.
 *
 * The app mounts the same route tree twice: once at `/` (the single-domain
 * base, which is what an operator running one research domain ever sees)
 * and once at `/d/:domainSlug`. Nothing downstream branches on which of
 * the two is live — a component asks {@link domainBase} for the base that
 * matches the URL it is rendering under and builds every link through
 * {@link withBase}, so the second base costs a call site nothing. Switching
 * domains is then {@link swapBase}, which keeps the operator on the surface
 * they were already looking at instead of dropping them back at an index.
 *
 * Surfaces are DERIVED from `NAV_ITEMS` rather than listed again here: a
 * sidebar entry with no route (or a route with no sidebar entry) is not
 * something this file can express. The nav id doubles as the path segment,
 * which keeps the `SidebarNav` selection key and the URL the same string.
 */

import { NAV_ITEMS } from '../app-shell/nav';

/**
 * One routable top-level surface.
 */
export interface Surface {
  /** Nav id, `SidebarNav` selection key and route segment — one string. */
  readonly id: string;
  /** The path segment this surface occupies under the active base. */
  readonly segment: string;
  /** Title the topbar shows while this surface is active. */
  readonly title: string;
}

/**
 * The surface table, in sidebar order.
 *
 * `nav.test.ts` pins the two properties this derivation leans on: ids are
 * distinct, and every id is already route-segment shaped. Both failures
 * would otherwise land here as two surfaces sharing a path.
 */
export const SURFACES: readonly Surface[] = NAV_ITEMS.map((item) => ({
  id: item.id,
  segment: item.id,
  title: item.label,
}));

const SURFACES_BY_ID = new Map<string, Surface>(
  SURFACES.map((surface) => [surface.id, surface]),
);

/** The base the route tree sits at when no domain is in the URL. */
export const SINGLE_DOMAIN_BASE = '/';

/** The prefix the domain-scoped copy of the route tree is mounted behind. */
const DOMAIN_BASE_PREFIX = '/d';

/**
 * Slug shape: lowercase alphanumerics and dashes, which is what the domain
 * fixtures (and the seeds behind them) use. The check is not cosmetic — the
 * slug reaches here decoded from the URL bar, so a `%2F` arrives as a real
 * separator and would quietly build a base pointing somewhere else.
 */
const DOMAIN_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

/** Matches the `/d/<slug>` prefix of an already-built path, if it has one. */
const DOMAIN_BASE_PATTERN = new RegExp(`^${DOMAIN_BASE_PREFIX}/[^/]+`);

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

/**
 * Look a surface up by id.
 *
 * Throws rather than returning `undefined`: the router declares its routes
 * from {@link SURFACES}, so the only way to reach this with an id that is
 * not in the table is to have hardcoded one — a wiring mistake, not a
 * missing page. An unknown PATH is a different thing and belongs to the
 * router catch-all.
 *
 * @param surfaceId - Nav id of the surface.
 * @returns The surface table entry.
 * @throws If no surface carries that id.
 */
export function getSurface(surfaceId: string): Surface {
  const surface = SURFACES_BY_ID.get(surfaceId);

  if (surface === undefined) {
    throw new Error(`Unknown surface id: ${surfaceId}`);
  }

  return surface;
}

/**
 * The route base for a domain, or the single-domain base without one.
 *
 * @param domainSlug - Slug from the `:domainSlug` route param; `undefined`
 * or `null` off the domain-scoped routes, where `useParams` supplies
 * nothing.
 * @returns `/` with no domain, `/d/<slug>` with one.
 * @throws If the slug is present but not a single lowercase path segment.
 */
export function domainBase(domainSlug?: string | null): string {
  if (domainSlug === undefined || domainSlug === null || domainSlug === '') {
    return SINGLE_DOMAIN_BASE;
  }

  if (!DOMAIN_SLUG_PATTERN.test(domainSlug)) {
    throw new Error(`Malformed domain slug: ${domainSlug}`);
  }

  return `${DOMAIN_BASE_PREFIX}/${domainSlug}`;
}

/**
 * The path of a surface under a base.
 *
 * @param base - Base from {@link domainBase}.
 * @param surfaceId - Nav id of the surface to link to.
 * @returns The absolute path, with no trailing slash.
 * @throws If no surface carries that id.
 */
export function withBase(base: string, surfaceId: string): string {
  const { segment } = getSurface(surfaceId);

  return `${trimTrailingSlash(base)}/${segment}`;
}

/**
 * Re-point a path at another base, keeping everything below the base.
 *
 * This is what the domain switcher navigates to: the surface the operator
 * is on survives the switch, and so does any modal sub-route below it, so
 * swapping domains from a lexicon editor lands on the same editor rather
 * than back at the digest.
 *
 * @param path - Current absolute path, under either base.
 * @param nextBase - Base from {@link domainBase} to move it under.
 * @returns The equivalent path under `nextBase`.
 */
export function swapBase(path: string, nextBase: string): string {
  const belowBase = trimTrailingSlash(path).replace(DOMAIN_BASE_PATTERN, '');
  const swapped = `${trimTrailingSlash(nextBase)}${belowBase}`;

  return swapped === ''
    ? SINGLE_DOMAIN_BASE
    : swapped;
}
