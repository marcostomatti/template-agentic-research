/**
 * @packageDocumentation
 * Which component renders which surface.
 *
 * The route tree is built from `../routes/paths`'s surface table and
 * knows nothing about pages; this is the one place the two are joined,
 * so a page arrives by adding a line here rather than by editing the
 * router. A surface with no entry keeps rendering the router's shared
 * placeholder, which is what makes "how much of the shell is built"
 * answerable by reading one table.
 *
 * ## Components, not elements
 *
 * A `.ts` module cannot hold JSX, and that turns out to be the right
 * constraint: the router registers each surface under BOTH bases, so a
 * shared element would be one object in two trees while a component is
 * instantiated per registration. It also keeps this file out of
 * `react-refresh/only-export-components`, which would refuse a module
 * exporting a component beside a table.
 *
 * ## Keys are proven, not trusted
 *
 * The record below is keyed by surface id, and a `Record` lookup is
 * fail-open: a key that drifted out of `SURFACES` would answer
 * `undefined` and the page would silently stop existing under both
 * bases. Mapping the record through `getSurface` on the way into the
 * lookup map turns that into a throw while this module loads.
 */

import type { ComponentType } from 'react';

import { getSurface } from '../routes/paths';

import { DigestPage } from './digest/DigestPage';

/**
 * The pages built so far, keyed by the surface each one answers at.
 *
 * Every remaining surface renders the router's placeholder until its
 * own entry lands here.
 */
const PAGE_COMPONENTS: Readonly<Record<string, ComponentType>> = {
  digest: DigestPage,
};

/** The same table, with every key proven to name a surface. */
const PAGES = new Map<string, ComponentType>(
  Object.entries(PAGE_COMPONENTS).map(([surfaceId, page]) => [
    getSurface(surfaceId).id,
    page,
  ]),
);

/**
 * The component a surface renders, where one has been built.
 *
 * Tolerant rather than throwing, unlike its neighbour `getSurface`: a
 * surface with no page yet is the ordinary state of this app, not a
 * wiring bug.
 *
 * @param surfaceId - An id from the surface table.
 * @returns Its page component, or `undefined` while it has none.
 */
export function findPage(surfaceId: string): ComponentType | undefined {
  return PAGES.get(surfaceId);
}
