import { describe, expect, it } from 'vitest';

import { NAV_ITEMS } from '../app-shell/nav';
import { repeated } from '../test-support/repeated';

import {
  SINGLE_DOMAIN_BASE,
  SURFACES,
  domainBase,
  getSurface,
  swapBase,
  withBase,
} from './paths';

// The fixture domain the demo ships with: `data/domains.ts` carries the
// same slug and the e2e domain-switch spec drives this exact base, so
// spelling it once here keeps the three in one shape.
const DOMAIN_SLUG = 'example-tech-radar';
const DOMAIN_BASE = `/d/${DOMAIN_SLUG}`;

describe('SURFACES', () => {
  it('derives at least one surface', () => {
    // Every table-driven expectation below compares against NAV_ITEMS, so
    // an empty nav table would let them all pass without asserting.
    // Arrange / Act / Assert
    expect(SURFACES.length).toBeGreaterThan(0);
  });

  it('derives one entry per nav item, in nav order', () => {
    // Arrange / Act
    const surfaceIds = SURFACES.map((surface) => surface.id);

    // Assert
    expect(surfaceIds).toEqual(NAV_ITEMS.map((item) => item.id));
  });

  it('uses the surface id as its path segment', () => {
    // Arrange / Act
    const remapped = SURFACES.filter(
      (surface) => surface.segment !== surface.id,
    );

    // Assert
    expect(remapped).toEqual([]);
  });

  it('carries the nav label as the page title', () => {
    // Arrange / Act
    const titles = SURFACES.map((surface) => surface.title);

    // Assert
    expect(titles).toEqual(NAV_ITEMS.map((item) => item.label));
  });
});

describe('getSurface', () => {
  it('returns the table entry for each known surface id', () => {
    // Arrange / Act
    const found = SURFACES.map((surface) => getSurface(surface.id));

    // Assert
    expect(found).toEqual([...SURFACES]);
  });

  it('throws on an unknown surface id', () => {
    // A surface absent from the table is a wiring mistake, not a 404: the
    // router declares its routes FROM this table, so the only way to ask
    // for a missing id is to have hardcoded one somewhere.
    // Arrange / Act / Assert
    expect(() => getSurface('not-a-surface')).toThrow(/unknown surface/i);
  });
});

describe('domainBase', () => {
  it('returns the single-domain base when no domain is active', () => {
    // Arrange / Act / Assert
    expect(domainBase()).toBe(SINGLE_DOMAIN_BASE);
  });

  it('returns the single-domain base for an absent or empty slug', () => {
    // `useParams` hands back undefined off the single-domain routes, so
    // both spellings of "no domain" have to land on the same base.
    // Arrange / Act / Assert
    expect(domainBase(undefined)).toBe(SINGLE_DOMAIN_BASE);
    expect(domainBase(null)).toBe(SINGLE_DOMAIN_BASE);
    expect(domainBase('')).toBe(SINGLE_DOMAIN_BASE);
  });

  it('mounts a named domain under the domain prefix', () => {
    // Arrange / Act / Assert
    expect(domainBase(DOMAIN_SLUG)).toBe(DOMAIN_BASE);
  });

  it('refuses a slug that is not a single lowercase path segment', () => {
    // The slug arrives decoded from the URL bar, so a `%2F` reaches here
    // as a real separator and would silently build a different base.
    // Arrange / Act / Assert
    expect(() => domainBase('example/tech-radar')).toThrow(/domain slug/i);
    expect(() => domainBase('../settings')).toThrow(/domain slug/i);
    expect(() => domainBase('Example-Tech-Radar')).toThrow(/domain slug/i);
  });
});

describe('withBase', () => {
  it('builds a surface path under the single-domain base', () => {
    // Arrange / Act
    const path = withBase(SINGLE_DOMAIN_BASE, 'digest');

    // Assert
    expect(path).toBe('/digest');
  });

  it('builds a surface path under a domain base', () => {
    // Arrange / Act
    const path = withBase(domainBase(DOMAIN_SLUG), 'digest');

    // Assert
    expect(path).toBe(`${DOMAIN_BASE}/digest`);
  });

  it('throws on an unknown surface id', () => {
    // Arrange / Act / Assert
    expect(() => withBase(SINGLE_DOMAIN_BASE, 'not-a-surface'))
      .toThrow(/unknown surface/i);
  });
});

describe('swapBase', () => {
  it('moves a single-domain path onto a domain base', () => {
    // Arrange / Act
    const swapped = swapBase('/digest', DOMAIN_BASE);

    // Assert
    expect(swapped).toBe(`${DOMAIN_BASE}/digest`);
  });

  it('moves a domain path back onto the single-domain base', () => {
    // Arrange / Act
    const swapped = swapBase(`${DOMAIN_BASE}/digest`, SINGLE_DOMAIN_BASE);

    // Assert
    expect(swapped).toBe('/digest');
  });

  it('keeps the sub-path a modal route adds', () => {
    // Arrange / Act
    const swapped = swapBase(`${DOMAIN_BASE}/lexicon/c-1/edit`, '/d/other');

    // Assert
    expect(swapped).toBe('/d/other/lexicon/c-1/edit');
  });

  it('maps each base index path onto the other base', () => {
    // Arrange / Act / Assert
    expect(swapBase(SINGLE_DOMAIN_BASE, DOMAIN_BASE)).toBe(DOMAIN_BASE);
    expect(swapBase(DOMAIN_BASE, SINGLE_DOMAIN_BASE))
      .toBe(SINGLE_DOMAIN_BASE);
  });

  it('ignores a trailing slash on the path it is handed', () => {
    // Arrange / Act
    const swapped = swapBase(`${DOMAIN_BASE}/digest/`, SINGLE_DOMAIN_BASE);

    // Assert
    expect(swapped).toBe('/digest');
  });
});

describe('every surface under both bases', () => {
  // Whole-table claims, as opposed to the single-surface cases above: the
  // router declares one route per SURFACES entry under each base, so two
  // entries sharing a path would shadow each other and the operator would
  // reach one page from two nav items. An empty table would satisfy every
  // case here vacuously — `SURFACES derives at least one surface` is the
  // guard that closes that, and it fails first if NAV_ITEMS empties out.

  it('gives every surface a distinct path under the single-domain base', () => {
    // Arrange / Act
    const paths = SURFACES.map(
      (surface) => withBase(SINGLE_DOMAIN_BASE, surface.id),
    );

    // Assert
    expect(repeated(paths)).toEqual([]);
  });

  it('gives every surface a distinct path under a domain base', () => {
    // Arrange / Act
    const paths = SURFACES.map(
      (surface) => withBase(domainBase(DOMAIN_SLUG), surface.id),
    );

    // Assert
    expect(repeated(paths)).toEqual([]);
  });

  it('never reuses a single-domain path under the domain base', () => {
    // Distinctness within each base is not enough on its own: swapBase
    // treats the two sets as counterparts, so a path that belongs to both
    // would make the mapping below ambiguous rather than reversible.
    // Arrange
    const singlePaths = SURFACES.map(
      (surface) => withBase(SINGLE_DOMAIN_BASE, surface.id),
    );
    const domainPaths = SURFACES.map(
      (surface) => withBase(DOMAIN_BASE, surface.id),
    );

    // Act
    const shared = singlePaths.filter((path) => domainPaths.includes(path));

    // Assert
    expect(shared).toEqual([]);
  });

  it('maps every surface path onto its counterpart under the other base', () => {
    // Both directions in one table so a failure names the surface that
    // stopped round-tripping rather than just the direction.
    // Arrange
    const pairs = SURFACES.map((surface) => ({
      id: surface.id,
      single: withBase(SINGLE_DOMAIN_BASE, surface.id),
      domain: withBase(DOMAIN_BASE, surface.id),
    }));

    // Act
    const swapped = pairs.map((pair) => ({
      id: pair.id,
      single: swapBase(pair.domain, SINGLE_DOMAIN_BASE),
      domain: swapBase(pair.single, DOMAIN_BASE),
    }));

    // Assert
    expect(swapped).toEqual(pairs);
  });
});
