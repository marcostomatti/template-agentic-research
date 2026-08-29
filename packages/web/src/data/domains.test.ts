import type { Domain } from './types';

import { describe, expect, it } from 'vitest';

import { domainBase } from '../routes/paths';
import { repeated } from '../test-support/repeated';

import {
  DEFAULT_DOMAIN_SLUG,
  DEFAULT_VERDICT_VOCABULARY,
  DOMAINS,
  SPARSE_DOMAIN_SLUG,
  findDomain,
  getDomain,
  resolveDomainSlug,
  resolveFieldContract,
  resolveVerdictVocabulary,
} from './domains';
import { FIXTURE_NOW } from './types';

/**
 * A domain built here rather than taken from the table.
 *
 * The two resolvers below fall back when a setting is absent, and the
 * fixture table cannot always tell the two branches apart: the seeded
 * domain's `verdictVocabulary` is currently the same four values as
 * {@link DEFAULT_VERDICT_VOCABULARY}, so an assertion over it passes
 * whichever branch ran. A domain carrying settings nothing else does is
 * what makes the explicit branch observable.
 */
function domainWith(settings: Domain['settings']): Domain {
  return {
    id: 99,
    slug: 'example-local-probe',
    name: 'Example Local Probe',
    settings,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('DOMAINS', () => {
  it('carries at least the two domains the switcher needs', () => {
    // Every table-driven expectation below maps over DOMAINS and would
    // pass vacuously over an empty table. This is also the real
    // threshold: `WorkspaceSwitcher` renders null below two workspaces,
    // so one domain here silently removes the domain switcher from the
    // topbar and makes the `/d/:domainSlug` base unreachable from the UI.
    // Arrange / Act / Assert
    expect(DOMAINS.length).toBeGreaterThanOrEqual(2);
  });

  it('gives every domain a distinct slug', () => {
    // The slug is the natural key: the accessors index on it and the URL
    // carries it, so two domains sharing one would make a route
    // ambiguous and hide a fixture behind its twin.
    // Arrange / Act
    const slugs = DOMAINS.map((domain) => domain.slug);

    // Assert
    expect(repeated(slugs)).toEqual([]);
  });

  it('gives every domain a distinct id', () => {
    // Rows in the fixture modules beside this one reference a domain by
    // id, so a collision would silently pull another domain's rows in.
    // Arrange / Act
    const ids = DOMAINS.map((domain) => domain.id);

    // Assert
    expect(repeated(ids)).toEqual([]);
  });

  it('holds exactly the two exported slugs, seeded domain first', () => {
    // The table is built FROM these two constants, so this does not pin
    // the literals — it pins the count and the order. Order matters:
    // the switcher lists domains as given, and the demo should open on
    // the configured domain rather than on the empty one.
    // Arrange / Act
    const slugs = DOMAINS.map((domain) => domain.slug);

    // Assert
    expect(slugs).toEqual([DEFAULT_DOMAIN_SLUG, SPARSE_DOMAIN_SLUG]);
  });

  it('gives every domain a slug the route base accepts', () => {
    // `domainBase` refuses anything that is not a single lowercase path
    // segment, because the slug arrives decoded from the URL bar. A
    // fixture slug it refuses is a domain the switcher can list and
    // never navigate to, and nothing else in the suite would catch it.
    // Arrange / Act
    const bases = DOMAINS.map((domain) => domainBase(domain.slug));

    // Assert
    expect(bases).toEqual(DOMAINS.map((domain) => `/d/${domain.slug}`));
  });

  it('dates every domain at or before the reference clock', () => {
    // Fixtures are dated against FIXTURE_NOW so relative-time renders are
    // a property of the data. A stamp past it renders as a future
    // instant, which no captured row can be. Compared as strings: every
    // stamp is ISO-8601 with the same UTC offset and a fixed number of
    // digits, so lexical order is chronological order.
    // Arrange / Act
    const outOfOrder = DOMAINS.filter(
      (domain) => !(domain.createdAt <= domain.updatedAt)
        || !(domain.updatedAt <= FIXTURE_NOW),
    );

    // Assert
    expect(outOfOrder).toEqual([]);
  });
});

describe('the seeded domain', () => {
  // The three payloads pinned below are transcribed from the
  // `example-tech-radar` entry of `packages/service/data/domains.json`.
  // Nothing mechanically joins the two files — `@ar/web` takes no
  // dependency on `@ar/service` — so these assertions are the join, and
  // a failure here means the seed and the fixture have parted company
  // rather than that a page broke.

  it('carries the seed scoring weights', () => {
    // Arrange / Act
    const seeded = getDomain(DEFAULT_DOMAIN_SLUG);

    // Assert
    expect(seeded.settings.scoringWeights).toEqual({
      termMatch: 3,
      sourceReliability: 2,
      recency: 1.5,
      entityInterest: 1,
    });
  });

  it('carries the seed verdict vocabulary, in order', () => {
    // Order is load-bearing: the ladder runs most negative to most
    // positive and the digest filter renders it that way.
    // Arrange / Act
    const seeded = getDomain(DEFAULT_DOMAIN_SLUG);

    // Assert
    expect(seeded.settings.verdictVocabulary)
      .toEqual(['avoid', 'caution', 'neutral', 'interested']);
  });

  it('carries the seed field contract', () => {
    // The contract the digest fixtures' `fields` payloads are built to
    // satisfy, so this is the shape a change there has to be checked
    // against — `summary` is the one required field.
    // Arrange / Act
    const seeded = getDomain(DEFAULT_DOMAIN_SLUG);

    // Assert
    expect(seeded.settings.fieldContract).toEqual({
      summary: { type: 'string', required: true },
      maturity: { type: 'string' },
      firstSeenAt: { type: 'datetime' },
      mentions: { type: 'number' },
      isOpenSource: { type: 'boolean' },
      tags: { type: 'list' },
      links: { type: 'object' },
    });
  });
});

describe('the sparse domain', () => {
  // Both lookups happen inside their test rather than out here: a
  // describe-scope `getDomain` throws at COLLECTION time if the fixture
  // ever loses this domain, which takes the whole file down and hides
  // which assertions were actually covering it.

  it('configures nothing', () => {
    // The whole reason it exists: `settings: {}` is a complete value, so
    // this domain is what makes both resolvers' fallback branches
    // reachable from the running app. Filling any member in would leave
    // the fallbacks covered by unit tests alone.
    // Arrange / Act
    const sparse = getDomain(SPARSE_DOMAIN_SLUG);

    // Assert
    expect(sparse.settings).toEqual({});
  });

  it('is not the domain the single-domain base resolves to', () => {
    // Otherwise `/` would land on the empty domain and every page in the
    // demo would open on an empty state.
    // Arrange / Act
    const sparse = getDomain(SPARSE_DOMAIN_SLUG);

    // Assert
    expect(sparse.slug).not.toBe(DEFAULT_DOMAIN_SLUG);
  });
});

describe('findDomain', () => {
  it('returns each fixture domain by its slug', () => {
    // Arrange / Act
    const found = DOMAINS.map((domain) => findDomain(domain.slug));

    // Assert
    expect(found).toEqual([...DOMAINS]);
  });

  it('returns undefined for a slug no fixture carries', () => {
    // A miss is an ordinary outcome here — a typed URL or a stale
    // bookmark — which is why this half does not throw.
    // Arrange / Act / Assert
    expect(findDomain('not-a-domain')).toBeUndefined();
    expect(findDomain('')).toBeUndefined();
  });
});

describe('getDomain', () => {
  it('returns each fixture domain by its slug', () => {
    // Arrange / Act
    const found = DOMAINS.map((domain) => getDomain(domain.slug));

    // Assert
    expect(found).toEqual([...DOMAINS]);
  });

  it('throws on a slug no fixture carries', () => {
    // This throw is what `./api.ts` builds its unknown-slug rejection
    // on, so the message names the slug it was handed.
    // Arrange / Act / Assert
    expect(() => getDomain('not-a-domain')).toThrow(/unknown domain/i);
    expect(() => getDomain('not-a-domain')).toThrow(/not-a-domain/);
  });

  it('throws on an empty slug', () => {
    // Arrange / Act / Assert
    expect(() => getDomain('')).toThrow(/unknown domain/i);
  });
});

describe('resolveDomainSlug', () => {
  it('resolves an absent slug to the default domain', () => {
    // `useParams` hands back undefined off the domain-scoped routes, so
    // all three spellings of "no domain in the URL" have to agree.
    // Arrange / Act / Assert
    expect(resolveDomainSlug()).toBe(DEFAULT_DOMAIN_SLUG);
    expect(resolveDomainSlug(undefined)).toBe(DEFAULT_DOMAIN_SLUG);
    expect(resolveDomainSlug(null)).toBe(DEFAULT_DOMAIN_SLUG);
    expect(resolveDomainSlug('')).toBe(DEFAULT_DOMAIN_SLUG);
  });

  it('returns a supplied slug unchanged', () => {
    // Arrange / Act
    const resolved = DOMAINS.map((domain) => resolveDomainSlug(domain.slug));

    // Assert
    expect(resolved).toEqual(DOMAINS.map((domain) => domain.slug));
  });

  it('returns an unknown slug unchanged rather than rejecting it', () => {
    // Which domain the caller means and whether it exists are separate
    // questions: resolving to the default here would send a mistyped URL
    // to the digest instead of to a not-found state.
    // Arrange / Act / Assert
    expect(resolveDomainSlug('not-a-domain')).toBe('not-a-domain');
  });
});

describe('resolveVerdictVocabulary', () => {
  it('has a non-empty default ladder to fall back to', () => {
    // The fallback case below would pass against an empty default, and
    // an empty vocabulary renders a verdict filter with no options.
    // Arrange / Act / Assert
    expect(DEFAULT_VERDICT_VOCABULARY.length).toBeGreaterThan(0);
  });

  it('prefers a vocabulary the domain declares', () => {
    // Deliberately NOT asserted against the seeded domain: its declared
    // vocabulary is currently the same list as the default, so that
    // assertion would pass whichever branch ran. This domain declares a
    // ladder nothing else uses, which is what makes the branch visible.
    // Arrange
    const domain = domainWith({ verdictVocabulary: ['keep', 'drop'] });

    // Act
    const vocabulary = resolveVerdictVocabulary(domain);

    // Assert
    expect(vocabulary).toEqual(['keep', 'drop']);
  });

  it('falls back to the default ladder when the domain declares none', () => {
    // Arrange / Act
    const vocabulary = resolveVerdictVocabulary(getDomain(SPARSE_DOMAIN_SLUG));

    // Assert
    expect(vocabulary).toEqual([...DEFAULT_VERDICT_VOCABULARY]);
  });

  it('answers for every fixture domain', () => {
    // Whole-table claim: no domain resolves to an empty ladder, however
    // it was configured, so no page has to render a filter with nothing
    // in it.
    // Arrange / Act
    const empty = DOMAINS.filter(
      (domain) => resolveVerdictVocabulary(domain).length === 0,
    );

    // Assert
    expect(empty).toEqual([]);
  });
});

describe('resolveFieldContract', () => {
  it('returns the contract the domain declares', () => {
    // Arrange / Act
    const contract = resolveFieldContract(getDomain(DEFAULT_DOMAIN_SLUG));

    // Assert
    expect(Object.keys(contract)).toEqual([
      'summary',
      'maturity',
      'firstSeenAt',
      'mentions',
      'isOpenSource',
      'tags',
      'links',
    ]);
  });

  it('returns an empty contract when the domain declares none', () => {
    // Absent means unconstrained, not missing — so callers can read the
    // record without a branch of their own.
    // Arrange / Act
    const contract = resolveFieldContract(getDomain(SPARSE_DOMAIN_SLUG));

    // Assert
    expect(contract).toEqual({});
  });

  it('distinguishes a declared empty contract from an absent one only by intent', () => {
    // Both answer `{}`, which is the point: a domain constraining
    // nothing and a domain declaring nothing constrain the same amount.
    // Pinned so a future change that made the two differ has to say so.
    // Arrange
    const declared = domainWith({ fieldContract: {} });
    const absent = domainWith({});

    // Act / Assert
    expect(resolveFieldContract(declared))
      .toEqual(resolveFieldContract(absent));
  });

  it('names the one required field of the seeded contract', () => {
    // The digest fixtures are built to satisfy this, so the required set
    // is the part a change there has to be checked against.
    // Arrange
    const contract = resolveFieldContract(getDomain(DEFAULT_DOMAIN_SLUG));

    // Act
    const required = Object.keys(contract)
      .filter((name) => contract[name]?.required === true);

    // Assert
    expect(required).toEqual(['summary']);
  });
});
