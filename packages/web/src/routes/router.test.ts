import type { ReactNode } from 'react';
import type { RouteObject } from 'react-router';

import { matchRoutes } from 'react-router';
import { describe, expect, it } from 'vitest';

import { SINGLE_DOMAIN_BASE, SURFACES, withBase } from './paths';
import { NOT_FOUND, ROUTES } from './router';

// `matchRoutes` resolves a path against the route objects with nothing
// rendered and no browser present, which is the whole reason `./router.tsx`
// exports its tree as data rather than as a router. It answers the three
// questions this file asks — does every surface resolve, does a modal
// sub-route keep its list surface matched, and does an unmatched path reach
// the catch-all — and it answers them for both bases off one array.
//
// What it cannot see is the index REDIRECT: `<Navigate>` only acts during a
// render, so the index route's MATCH is assertable here and where it lands
// is not. That half belongs to the Playwright suite.

// The fixture domain the demo ships with; `data/domains.ts` and
// `paths.test.ts` carry the same slug. Nothing here depends on it existing —
// any well-formed slug matches the domain tree identically, which is the
// point of the `/d/Bad/digest` case at the bottom of the file.
const DOMAIN_SLUG = 'example-tech-radar';

/** The parameter every modal sub-route names its row with. */
const ENTITY_PARAM = ':entityId';

/** The row id every modal path below is driven with. */
const ENTITY_ID = '7';

/** A sub-path deliberately naming nothing either tree declares. */
const UNMATCHED = 'nothing-answers-here';

/**
 * The two bases, each with the route pattern it is declared at.
 *
 * `base` is what a link builder produces and `pattern` is what a match
 * reports back, and under `/d/:domainSlug` the two differ. That is what
 * makes an expected chain built from `pattern` a literal rather than a
 * `.map` of the tree it is being compared against.
 */
const BASES = [
  { label: 'single-domain base', base: SINGLE_DOMAIN_BASE, pattern: '/' },
  {
    label: 'domain base',
    base: `/d/${DOMAIN_SLUG}`,
    pattern: '/d/:domainSlug',
  },
] as const;

/**
 * The modal sub-route each surface declares, keyed by surface id, with
 * `null` for a surface that carries none.
 *
 * Written out rather than read back off the route tree: a table derived
 * from the thing under test can only ever agree with it. The set-equality
 * test below is what keeps this honest as surfaces are added.
 */
const MODAL_ROUTE_PATTERNS: Readonly<Record<string, string | null>> = {
  digest: ENTITY_PARAM,
  lexicon: `${ENTITY_PARAM}/edit`,
  sources: `${ENTITY_PARAM}/edit`,
  agents: `${ENTITY_PARAM}/edit`,
  tools: `${ENTITY_PARAM}/edit`,
  settings: null,
};

/**
 * The pattern a surface's modal sub-route is declared at, or `null`.
 *
 * Tolerant of a surface the table above does not mention, deliberately: a
 * throwing reader called while the module or a `describe` body is
 * evaluated takes the whole file down before a single test runs, and the
 * one test that would have reported the gap by name goes with it.
 *
 * @param surfaceId - Nav id of the surface.
 * @returns The relative route pattern, or `null` for no modal.
 */
function modalPatternOf(surfaceId: string): string | null {
  return MODAL_ROUTE_PATTERNS[surfaceId] ?? null;
}

/**
 * Every surface declaring a modal sub-route, paired with its pattern.
 *
 * Derived at module scope through the tolerant reader above, so a surface
 * the expectation table forgot drops out here rather than throwing at
 * collection time. The non-emptiness test below is what keeps that from
 * emptying the case tables silently.
 */
const MODAL_SURFACES = SURFACES.flatMap((surface) => {
  const pattern = modalPatternOf(surface.id);

  if (pattern === null) {
    return [];
  }

  return [{ surface, pattern }];
});

/**
 * Join a sub-path onto a base without doubling the separator.
 *
 * @param base - An absolute base or surface path.
 * @param subPath - What sits below it, with no leading separator.
 * @returns The absolute path.
 */
function pathUnder(base: string, subPath: string): string {
  return `${base.replace(/\/+$/, '')}/${subPath}`;
}

/**
 * How a matched route reads in a chain.
 *
 * @param route - A route object from a match.
 * @returns Its declared path, or a name for the two kinds carrying none.
 */
function routeLabel(route: RouteObject): string {
  if (route.index === true) {
    return '(index)';
  }

  return route.path ?? '(pathless)';
}

/**
 * The route patterns a path matched, outermost first.
 *
 * @param path - An absolute path.
 * @returns One label per route in the match chain, or an empty list where
 * the path matched nothing at all.
 */
function chainOf(path: string): readonly string[] {
  const matches = matchRoutes(ROUTES, path) ?? [];

  return matches.map((match) => routeLabel(match.route));
}

/**
 * What the innermost matched route renders.
 *
 * @param path - An absolute path.
 * @returns The leaf route's element, or `undefined` where nothing matched.
 */
function leafElementOf(path: string): ReactNode | undefined {
  return matchRoutes(ROUTES, path)?.at(-1)?.route.element;
}

/**
 * The parameters the innermost match resolved.
 *
 * @param path - An absolute path.
 * @returns The leaf match's params, or an empty record where nothing
 * matched.
 */
function paramsOf(
  path: string,
): Readonly<Record<string, string | undefined>> {
  return matchRoutes(ROUTES, path)?.at(-1)?.params ?? {};
}

describe('the two route trees', () => {
  it('mounts one tree per base', () => {
    // Arrange / Act
    const basePatterns = ROUTES.map(routeLabel);

    // Assert
    expect(basePatterns).toEqual(['/', '/d/:domainSlug']);
  });

  it('gives each base its own children array', () => {
    // `RouteObject.children` is mutable, so one array shared by both
    // parents is a single edit away from two trees that disagree. Every
    // matching test below stays green either way, which is why this one
    // exists.
    // Arrange / Act
    const childArrays = ROUTES.map((route) => route.children);

    // Assert
    expect(new Set(childArrays).size).toBe(childArrays.length);
  });
});

describe('the surface routes', () => {
  it('has at least one surface to route', () => {
    // Every expectation below maps over SURFACES, so an empty table would
    // satisfy the lot without matching a single path.
    // Arrange / Act / Assert
    expect(SURFACES.length).toBeGreaterThan(0);
  });

  it('resolves every surface under both bases', () => {
    // The paths come from `withBase`, the app's own link builder, so this
    // asserts the router answers where the chrome actually points rather
    // than at paths this file made up.
    // Arrange / Act
    const matched = BASES.flatMap(({ label, base }) => SURFACES.map((surface) => ({
      at: `${label}: ${surface.id}`,
      chain: chainOf(withBase(base, surface.id)),
    })));

    // Assert
    expect(matched).toEqual(
      BASES.flatMap(({ label, pattern }) => SURFACES.map((surface) => ({
        at: `${label}: ${surface.id}`,
        chain: [pattern, surface.segment],
      }))),
    );
  });

  it('names the domain in the params of every surface match', () => {
    // Arrange
    const domainBase = `/d/${DOMAIN_SLUG}`;

    // Act
    const slugs = SURFACES.map((surface) => ({
      surface: surface.id,
      domainSlug: paramsOf(withBase(domainBase, surface.id)).domainSlug,
    }));

    // Assert
    expect(slugs.filter((row) => row.domainSlug !== DOMAIN_SLUG)).toEqual([]);
  });

  it('matches the index route at both bases', () => {
    // Where the index redirect LANDS is unobservable here, so this pins
    // only that both bases have an index to redirect from.
    // Arrange / Act
    const chains = BASES.map(({ base }) => chainOf(base));

    // Assert
    expect(chains).toEqual(BASES.map(({ pattern }) => [pattern, '(index)']));
  });
});

describe('the modal sub-routes', () => {
  it('states a modal sub-route, or none, for every surface', () => {
    // The expectation table is keyed by surface id, so a surface added
    // without an entry would quietly drop out of every test below. This is
    // the one that reports it by name.
    // Arrange / Act
    const stated = [...Object.keys(MODAL_ROUTE_PATTERNS)].sort();

    // Assert
    expect(stated).toEqual(SURFACES.map((surface) => surface.id).sort());
  });

  it('has at least one surface carrying a modal sub-route', () => {
    // Both case tables below are built off MODAL_SURFACES, so an empty one
    // would leave them comparing two empty lists.
    // Arrange / Act / Assert
    expect(MODAL_SURFACES.length).toBeGreaterThan(0);
  });

  it('keeps its list surface matched, under both bases', () => {
    // The claim the trailing-`Outlet` pattern rests on: a modal path does
    // not REPLACE its list surface in the chain, it appends to it. Assert
    // the whole chain rather than just that the deep path matched
    // something — a sibling route would match too, and would render the
    // modal with no list behind it.
    // Arrange
    const cases = BASES.flatMap(({ label, base, pattern }) => MODAL_SURFACES
      .map(({ surface, pattern: modalPattern }) => ({
        at: `${label}: ${surface.id}`,
        path: pathUnder(
          withBase(base, surface.id),
          modalPattern.replace(ENTITY_PARAM, ENTITY_ID),
        ),
        chain: [pattern, surface.segment, modalPattern],
      })));

    // Act
    const matched = cases.map(({ at, path }) => ({ at, chain: chainOf(path) }));

    // Assert
    expect(matched).toEqual(cases.map(({ at, chain }) => ({ at, chain })));
  });

  it('names the row it was opened on in the params', () => {
    // Arrange / Act
    const opened = MODAL_SURFACES.map(({ surface, pattern }) => {
      const path = pathUnder(
        withBase(SINGLE_DOMAIN_BASE, surface.id),
        pattern.replace(ENTITY_PARAM, ENTITY_ID),
      );

      return { surface: surface.id, entityId: paramsOf(path).entityId };
    });

    // Assert
    expect(opened.filter((row) => row.entityId !== ENTITY_ID)).toEqual([]);
  });
});

describe('the catch-all', () => {
  it('claims an unmatched path under both bases', () => {
    // A path is only unmatched relative to the tree that claimed its
    // prefix, so each base declares its own catch-all and both are driven
    // here. The base pattern staying at the head of the chain is what says
    // the not-found renders inside the mounted shell rather than replacing
    // it.
    // Arrange / Act
    const matched = BASES.map(({ label, base }) => ({
      at: label,
      chain: chainOf(pathUnder(base, UNMATCHED)),
    }));

    // Assert
    expect(matched).toEqual(
      BASES.map(({ label, pattern }) => ({ at: label, chain: [pattern, '*'] })),
    );
  });

  it('renders the not-found element under both bases', () => {
    // `toBe`, not a path check: matching `*` says nothing about what sits
    // behind it, and the catch-all is the one route in this tree whose
    // element a test can name.
    // Arrange / Act
    const leaves = BASES.map(({ base }) => leafElementOf(
      pathUnder(base, UNMATCHED),
    ));

    // Assert
    expect(leaves.filter((leaf) => leaf !== NOT_FOUND)).toEqual([]);
  });

  it('claims the bare domain prefix, which names no domain', () => {
    // `/d` does NOT match `/d/:domainSlug` — a required segment cannot
    // match empty — so it falls through the OTHER tree's catch-all.
    // Arrange / Act / Assert
    expect(chainOf('/d')).toEqual(['/', '*']);
  });

  it('claims a sub-path no modal sub-route declares', () => {
    // The digest's modal is a bare `:entityId`, so the `/edit` its four
    // neighbours carry is one segment too many here. The near-miss is what
    // says the modal patterns are matched whole rather than as prefixes.
    // Arrange / Act / Assert
    expect(chainOf(`/digest/${ENTITY_ID}/edit`)).toEqual(['/', '*']);
  });

  it('claims a modal path on a surface that declares none', () => {
    // Arrange
    const withoutModal = SURFACES.filter(
      (surface) => modalPatternOf(surface.id) === null,
    );

    // Act
    const chains = withoutModal.map((surface) => ({
      surface: surface.id,
      chain: chainOf(pathUnder(
        withBase(SINGLE_DOMAIN_BASE, surface.id),
        `${ENTITY_ID}/edit`,
      )),
    }));

    // Assert
    expect(chains).toEqual(
      withoutModal.map((surface) => ({
        surface: surface.id,
        chain: ['/', '*'],
      })),
    );
  });

  it('does not claim a malformed domain slug', () => {
    // `/d/Bad/digest` MATCHES the domain pattern, so the catch-all never
    // sees it and the refusal has to live in the route element instead.
    // This is the test of `./DomainGuard.tsx`'s reason to exist.
    // Arrange / Act / Assert
    expect(chainOf('/d/Bad/digest')).toEqual(['/d/:domainSlug', 'digest']);
  });
});
