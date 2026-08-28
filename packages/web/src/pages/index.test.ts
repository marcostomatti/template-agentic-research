import type { ComponentType, ReactElement } from 'react';

import { isValidElement } from 'react';
import { matchRoutes } from 'react-router';
import { describe, expect, it } from 'vitest';

import { SINGLE_DOMAIN_BASE, SURFACES, withBase } from '../routes/paths';
import { ROUTES, SURFACE_PLACEHOLDER } from '../routes/router';
import { repeated } from '../test-support/repeated';

import { AgentsPage } from './agents/AgentsPage';
import { DigestPage } from './digest/DigestPage';
import { LexiconPage } from './lexicon/LexiconPage';
import { SettingsPage } from './settings/SettingsPage';
import { SourcesPage } from './sources/SourcesPage';
import { ToolsPage } from './tools/ToolsPage';

import { findPage } from './index';

// The page stage's close-out: every surface the sidebar offers now has a
// page behind it, and nothing in the tree still falls back to the
// router's stand-in.
//
// Those are two claims rather than one, and neither implies the other.
// `./index.ts` is a registry — it can hold a page for a surface the
// router never asks about — while `../routes/router.tsx` is what turns a
// registration into an element, through a fallback that answers for a
// surface with no page. So this file asks the registry directly, and
// then asks the ROUTE TREE what each surface actually resolves to, under
// both bases. `matchRoutes` does the second half with nothing rendered
// and no browser present, the same seam `../routes/router.test.ts` uses.
//
// The consequence for `SURFACE_PLACEHOLDER` is worth stating: it is
// unreachable as of this commit, and this file is the thing that says
// so. It stays exported and stays wired, because the next surface added
// to `NAV_ITEMS` reaches it again — one test failing here is how that
// arrives, rather than a blank page.

/** The fixture domain slug the domain-scoped tree is driven with. */
const DOMAIN_SLUG = 'example-tech-radar';

/**
 * The two bases every surface is registered under.
 *
 * A page is one component in two trees, so a registration that only
 * reached one of them would be invisible to a single-base check — and
 * the surface routes are built by a `.map` per base, which is exactly
 * the shape that can lose an entry on one side.
 */
const BASES = [
  { label: 'single-domain base', base: SINGLE_DOMAIN_BASE },
  { label: 'domain base', base: `/d/${DOMAIN_SLUG}` },
] as const;

/** An id no surface carries, for the tolerant-lookup control. */
const UNKNOWN_SURFACE_ID = 'nothing-answers-here';

/**
 * The page each surface is expected to render, written out.
 *
 * Imported components rather than names, so this compares by identity:
 * a lexicon route wired to `DigestPage` is a real failure that two
 * equal-looking labels would let through. Written here rather than read
 * back off `findPage`, because a table derived from the thing under test
 * can only ever agree with it — the key-set test below is what keeps
 * this list honest as surfaces are added.
 */
const EXPECTED_PAGES: Readonly<Record<string, ComponentType>> = {
  digest: DigestPage,
  lexicon: LexiconPage,
  sources: SourcesPage,
  agents: AgentsPage,
  tools: ToolsPage,
  settings: SettingsPage,
};

/**
 * The page the table above names for a surface.
 *
 * Tolerant rather than throwing, for the reason `../routes/router.test.ts`
 * gives about its own expectation table: a reader that throws while a
 * case list is being built at module scope takes the whole file down
 * before a single test runs, and the one test that would have named the
 * gap goes with it.
 *
 * @param surfaceId - Nav id of the surface.
 * @returns The expected page, or `undefined` where the table is silent.
 */
function expectedPageOf(surfaceId: string): ComponentType | undefined {
  return EXPECTED_PAGES[surfaceId];
}

/** What a matched route's element can be tagged with. */
type ElementTag = ReactElement['type'];

/**
 * The component the innermost route at a path renders.
 *
 * The surface routes hold `<Page />` rather than the component itself
 * — see `surfaceElement` in `../routes/router.tsx` on why each base gets
 * its own instantiation — so the registration reads back off the
 * element's tag.
 *
 * @param path - An absolute path.
 * @returns The leaf element's tag, or `undefined` where nothing matched
 * or the leaf holds something that is not an element at all.
 */
function tagAt(path: string): ElementTag | undefined {
  const element = matchRoutes(ROUTES, path)?.at(-1)?.route.element;

  return isValidElement(element)
    ? element.type
    : undefined;
}

/**
 * What the innermost route at a path renders, for a failure to print.
 *
 * @param path - An absolute path.
 * @returns The component's name, or a phrase for the two kinds carrying
 * none.
 */
function tagLabelAt(path: string): string {
  const tag = tagAt(path);

  if (tag === undefined) {
    return '(not a component)';
  }

  return typeof tag === 'string'
    ? tag
    : tag.name;
}

/**
 * Every surface under every base, with the path it is reached at.
 *
 * Paths come from `withBase`, the app's own link builder, so these are
 * the addresses the sidebar actually points at rather than ones this
 * file made up.
 */
const REGISTRATIONS = BASES.flatMap(({ label, base }) => SURFACES.map((surface) => ({
  at: `${label}: ${surface.id}`,
  surfaceId: surface.id,
  path: withBase(base, surface.id),
})));

describe('the page registry', () => {
  it('has at least one surface to register a page for', () => {
    // Every assertion in this file maps over SURFACES, so an empty table
    // would satisfy the lot without a single page being registered.
    // Arrange / Act / Assert
    expect(SURFACES.length).toBeGreaterThan(0);
  });

  it('states an expected page for every surface, and for no others', () => {
    // The expectation table is keyed by surface id, so a surface added
    // without an entry drops out of the identity tests below rather than
    // failing them. This is the one that reports it by name.
    // Arrange / Act
    const stated = [...Object.keys(EXPECTED_PAGES)].sort();

    // Assert
    expect(stated).toEqual(SURFACES.map((surface) => surface.id).sort());
  });

  it('registers a page for every surface in the table', () => {
    // Driven off SURFACES alone rather than off the local table: this is
    // the plan's claim, and it should not be reachable only through an
    // expectation list this file could have narrowed.
    // Arrange / Act
    const unregistered = SURFACES.filter(
      (surface) => findPage(surface.id) === undefined,
    );

    // Assert
    expect(unregistered.map((surface) => surface.id)).toEqual([]);
  });

  it('registers the expected page for each surface', () => {
    // Arrange / Act
    const wrong = SURFACES.filter(
      (surface) => findPage(surface.id) !== expectedPageOf(surface.id),
    );

    // Assert
    expect(wrong.map((surface) => surface.id)).toEqual([]);
  });

  it('registers a distinct component per surface', () => {
    // Six near-identical entries in one record is exactly where a
    // copy-paste lands two surfaces on one page, and every test above
    // stays green when it does — both surfaces have A page, and the
    // expectation table would have been copied the same way.
    // Arrange / Act
    const pages = SURFACES.map((surface) => findPage(surface.id));

    // Assert
    expect(repeated(pages)).toEqual([]);
  });

  it('answers undefined for an id no surface carries', () => {
    // `findPage` is tolerant where its neighbour `getSurface` throws, and
    // this is the near-miss that makes the registration claim above mean
    // something: a lookup answering for everything would report every
    // surface registered whatever the record held.
    // Arrange / Act / Assert
    expect(findPage(UNKNOWN_SURFACE_ID)).toBeUndefined();
  });
});

describe('the surface routes', () => {
  it('has a registration to check under each base', () => {
    // Arrange / Act / Assert
    expect(REGISTRATIONS.length).toBe(BASES.length * SURFACES.length);
  });

  it('holds a placeholder a surface route could still resolve to', () => {
    // The live control for the identity test at the bottom of this file.
    // A named import of a symbol its module no longer exports resolves to
    // `undefined` rather than raising, and `element !== undefined` is
    // true of every element there is — so the placeholder being a real
    // element is what stops that test passing for the wrong reason.
    // Arrange / Act / Assert
    expect(isValidElement(SURFACE_PLACEHOLDER)).toBe(true);
  });

  it('renders each surface\'s registered page, under both bases', () => {
    // The join the plan asks for, from the router's end: a page in the
    // registry that the route tree never instantiates is a page nobody
    // can reach.
    // Arrange / Act
    const wrong = REGISTRATIONS.filter(
      ({ surfaceId, path }) => tagAt(path) !== expectedPageOf(surfaceId),
    );

    // Assert
    expect(wrong.map(({ at, path }) => ({ at, renders: tagLabelAt(path) })))
      .toEqual([]);
  });

  it('leaves no surface resolving to the shared placeholder', () => {
    // Stated separately from the test above, which it does not follow
    // from: that one compares against the expectation table, and a
    // surface the table forgot is absent from it. This one is driven off
    // every registration there is.
    // Arrange / Act
    const stalled = REGISTRATIONS.filter(
      ({ path }) => matchRoutes(ROUTES, path)?.at(-1)?.route.element
        === SURFACE_PLACEHOLDER,
    );

    // Assert
    expect(stalled.map(({ at }) => at)).toEqual([]);
  });
});
