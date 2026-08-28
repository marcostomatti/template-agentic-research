import type { Domain } from './types';

import { describe, expect, it, vi } from 'vitest';

import * as api from './api';
import { CONNECTORS, listConnectors, summarizeExportSubscriptions } from './connectors';
import { listDocuments, listFindings } from './digest';
import {
  DEFAULT_DOMAIN_SLUG,
  DOMAINS,
  SPARSE_DOMAIN_SLUG,
  getDomain,
  resolveVerdictVocabulary,
} from './domains';
import { summarizeCategories } from './lexicon';
import { listPersonas } from './personas';
import { SETTINGS } from './settings';
import { NOTIFICATIONS, OPERATOR, SEARCH_SUGGESTIONS } from './shell';
import { listSources, summarizeSources } from './sources';
import { WEEK_SPEND } from './spend';

// The module is imported as a NAMESPACE rather than by name, which is
// not the convention anywhere else in this package and is deliberate
// here: the export surface itself is one of the things under test, and
// `Object.keys(api)` is what lets the case tables below be checked for
// completeness rather than trusted. A named-import list would name
// exactly the accessors the author remembered.

/** A slug no fixture domain carries, and none ever should. */
const UNKNOWN_SLUG = 'no-such-domain';

/**
 * One domain-scoped accessor, paired with the fixture read it stands
 * in front of.
 *
 * `read` holds the exported function ITSELF rather than a wrapper, so
 * `Function.length` still reports the accessor's own arity — which is
 * what the argument-shape tests below key on.
 */
interface DomainScopedCase {
  /** Its exported name, for the completeness check and test titles. */
  readonly name: string;
  /** The accessor under test. */
  readonly read: (slug: string) => Promise<unknown>;
  /** What the fixture layer answers for that domain, called directly. */
  readonly expected: (domain: Domain) => unknown;
  /** Whether it answers a list, which the emptiness tests need. */
  readonly listed: boolean;
}

const DOMAIN_SCOPED: readonly DomainScopedCase[] = [
  {
    name: 'fetchDomain',
    read: api.fetchDomain,
    expected: (domain) => domain,
    listed: false,
  },
  {
    name: 'fetchVerdicts',
    read: api.fetchVerdicts,
    expected: (domain) => resolveVerdictVocabulary(domain),
    listed: false,
  },
  {
    name: 'fetchDocuments',
    read: api.fetchDocuments,
    expected: (domain) => listDocuments(domain.id),
    listed: true,
  },
  {
    name: 'fetchFindings',
    read: api.fetchFindings,
    expected: (domain) => listFindings(domain.id),
    listed: true,
  },
  {
    name: 'fetchCategorySummaries',
    read: api.fetchCategorySummaries,
    expected: (domain) => summarizeCategories(domain.id),
    listed: true,
  },
  {
    name: 'fetchSources',
    read: api.fetchSources,
    expected: (domain) => listSources(domain.id),
    listed: true,
  },
  {
    name: 'fetchSourceStatusCounts',
    read: api.fetchSourceStatusCounts,
    expected: (domain) => summarizeSources(domain.id),
    listed: false,
  },
  {
    name: 'fetchPersonas',
    read: api.fetchPersonas,
    expected: (domain) => listPersonas(domain.id),
    listed: true,
  },
  {
    name: 'fetchExportSubscriptions',
    read: api.fetchExportSubscriptions,
    expected: (domain) => summarizeExportSubscriptions(domain.id),
    listed: true,
  },
];

/**
 * The accessors that take no domain, with the fixture value each one
 * is expected to hand over unchanged.
 *
 * `same` is an IDENTITY expectation where the fixture accessor hands
 * back a shared frozen value, and null where it answers a fresh array
 * every call (`listConnectors` copies, having nothing to filter on) —
 * those are compared by value instead.
 */
interface UnscopedCase {
  readonly name: string;
  readonly read: () => Promise<unknown>;
  readonly same: unknown;
}

const UNSCOPED: readonly UnscopedCase[] = [
  { name: 'fetchDomains', read: api.fetchDomains, same: null },
  { name: 'fetchConnectors', read: api.fetchConnectors, same: null },
  { name: 'fetchSettings', read: api.fetchSettings, same: SETTINGS },
  { name: 'fetchSpendSummary', read: api.fetchSpendSummary, same: WEEK_SPEND },
  {
    name: 'fetchSearchSuggestions',
    read: api.fetchSearchSuggestions,
    same: SEARCH_SUGGESTIONS,
  },
  {
    name: 'fetchNotifications',
    read: api.fetchNotifications,
    same: NOTIFICATIONS,
  },
  { name: 'fetchOperator', read: api.fetchOperator, same: OPERATOR },
];

describe('the barrel export surface', () => {
  it('exports nothing beyond the two case tables below', () => {
    // The guard the whole file rests on: every claim here is made
    // over one of the two tables, so an accessor added to `./api.ts`
    // and to neither table would be covered by nothing and reported
    // by nothing. Sorted on both sides because it is a set claim.
    // Arrange
    const covered = [
      ...DOMAIN_SCOPED.map((scoped) => scoped.name),
      ...UNSCOPED.map((unscoped) => unscoped.name),
    ].sort();

    // Act
    const exported = Object.keys(api).sort();

    // Assert
    expect(exported).toEqual(covered);
  });

  it('names each accessor once', () => {
    // The near-miss the set comparison above cannot catch on its own:
    // two table rows sharing a name would still produce the right set
    // while covering one accessor twice and another not at all.
    // Arrange
    const named = [
      ...DOMAIN_SCOPED.map((scoped) => scoped.name),
      ...UNSCOPED.map((unscoped) => unscoped.name),
    ];

    // Act
    const duplicated = named.filter(
      (name, index) => named.indexOf(name) !== index,
    );

    // Assert
    expect(duplicated).toEqual([]);
  });

  it('scopes nine accessors by domain and leaves seven unscoped', () => {
    // The count the module docblock states, asserted against literals
    // so that moving an accessor from one table to the other is a
    // failure here rather than a silent re-reading of the rule. WHICH
    // seven cannot be scoped is the arity test further down.
    // Arrange / Act / Assert
    expect(DOMAIN_SCOPED).toHaveLength(9);
    expect(UNSCOPED).toHaveLength(7);
  });
});

describe('the async seam', () => {
  it('answers a promise rather than a value', () => {
    // The property the pages are written against from the first
    // commit: a synchronous barrel would read the same at every call
    // site today and rewrite all of them on the day of the swap.
    // Arrange / Act
    const scoped = api.fetchFindings(DEFAULT_DOMAIN_SLUG);
    const unscoped = api.fetchOperator();

    // Assert
    expect(scoped).toBeInstanceOf(Promise);
    expect(unscoped).toBeInstanceOf(Promise);
  });

  it('resolves on a microtask rather than after a timer', async () => {
    // Under fake timers nothing advances the clock, so an accessor
    // that grew an artificial delay would never settle and this test
    // would time out rather than slow down. That is the point: the
    // e2e suite asserts on rendered fixture content, and a simulated
    // latency here would make every one of those assertions race a
    // timer for no fidelity gained.
    // Arrange
    vi.useFakeTimers();

    try {
      // Act / Assert
      await expect(api.fetchOperator()).resolves.toBe(OPERATOR);
      await expect(api.fetchFindings(DEFAULT_DOMAIN_SLUG)).resolves.toEqual(
        listFindings(getDomain(DEFAULT_DOMAIN_SLUG).id),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  DOMAIN_SCOPED.forEach((scoped) => {
    it(`refuses an unknown slug by rejecting, not throwing: ${scoped.name}`, async () => {
      // The seam's whole reason for being `async`. A cache hook can
      // render a rejected promise as an error state; an exception
      // thrown before the caller ever held a promise reaches the
      // render instead and takes the shell down with the page. The
      // `.catch` is what keeps this test from leaving an unhandled
      // rejection behind, not part of the claim.
      // Arrange
      const call = (): void => {
        void scoped.read(UNKNOWN_SLUG).catch(() => undefined);
      };

      // Act / Assert
      expect(call).not.toThrow();
      await expect(scoped.read(UNKNOWN_SLUG)).rejects.toThrow(
        `Unknown domain slug: ${UNKNOWN_SLUG}`,
      );
    });
  });
});

describe('domain scoping', () => {
  DOMAIN_SCOPED.forEach((scoped) => {
    it(`answers the seeded domain what the fixtures answer: ${scoped.name}`, async () => {
      // Pass-through fidelity. The expected side resolves the slug
      // itself, so a barrel that scoped every read to one fixed
      // domain agrees here and disagrees on the sparse domain below —
      // the two tests are one claim.
      // Arrange
      const domain = getDomain(DEFAULT_DOMAIN_SLUG);

      // Act
      const answered = await scoped.read(DEFAULT_DOMAIN_SLUG);

      // Assert
      expect(answered).toEqual(scoped.expected(domain));
    });

    it(`answers the sparse domain what the fixtures answer: ${scoped.name}`, async () => {
      // The other half. The sparse domain carries no rows at all, so
      // for the list accessors this side would pass vacuously on its
      // own — which is what the emptiness pair below is for.
      // Arrange
      const domain = getDomain(SPARSE_DOMAIN_SLUG);

      // Act
      const answered = await scoped.read(SPARSE_DOMAIN_SLUG);

      // Assert
      expect(answered).toEqual(scoped.expected(domain));
    });
  });

  it('answers rows for the seeded domain', async () => {
    // Non-emptiness, and the guard that keeps the agreement tests
    // above from comparing two empty lists. Named per accessor so a
    // failure says which one went quiet.
    // Arrange
    const listed = DOMAIN_SCOPED.filter((scoped) => scoped.listed);

    // Act
    const sizes = await Promise.all(
      listed.map(async (scoped) => {
        const answered = (await scoped.read(
          DEFAULT_DOMAIN_SLUG,
        )) as readonly unknown[];

        return { name: scoped.name, size: answered.length };
      }),
    );

    // Assert
    expect(sizes.filter((entry) => entry.size === 0)).toEqual([]);
  });

  it('answers nothing for the sparse domain', async () => {
    // The near-miss that turns the scoping claim into evidence: the
    // sparse domain is seeded with no documents, findings, terms,
    // sources, personas or subscriptions, so a barrel reading the
    // seeded domain regardless of the slug it was handed reports rows
    // here.
    // Arrange
    const listed = DOMAIN_SCOPED.filter((scoped) => scoped.listed);

    // Act
    const sizes = await Promise.all(
      listed.map(async (scoped) => {
        const answered = (await scoped.read(
          SPARSE_DOMAIN_SLUG,
        )) as readonly unknown[];

        return { name: scoped.name, size: answered.length };
      }),
    );

    // Assert
    expect(sizes.filter((entry) => entry.size > 0)).toEqual([]);
  });

  it('takes the slug as its only argument', async () => {
    // Structural pin on which accessors are scoped. An accessor that
    // grew a second parameter — a page passing a filter down into the
    // data layer, say — would be a read the cache key builders in
    // `./hooks.ts` do not know about.
    // Arrange / Act
    const arities = DOMAIN_SCOPED.map((scoped) => ({
      name: scoped.name,
      arity: scoped.read.length,
    }));

    // Assert
    expect(arities.filter((entry) => entry.arity !== 1)).toEqual([]);
  });

  it('resolves the sparse domain settings to the default ladder', async () => {
    // What the sparse domain is FOR, read through the barrel: it
    // names no `verdictVocabulary`, and the digest filter still has a
    // ladder to render. Note this cannot distinguish the resolver
    // from a hardcoded list — the seeded domain configures the same
    // four verdicts — so it claims pass-through only, and
    // `domains.test.ts` builds a domain of its own to prove the
    // branch.
    // Arrange
    const sparse = getDomain(SPARSE_DOMAIN_SLUG);

    // Act
    const verdicts = await api.fetchVerdicts(SPARSE_DOMAIN_SLUG);

    // Assert
    expect(sparse.settings.verdictVocabulary).toBeUndefined();
    expect(verdicts).toEqual(resolveVerdictVocabulary(sparse));
    expect(verdicts).not.toHaveLength(0);
  });
});

describe('the accessors that take no domain', () => {
  it('takes no argument at all', () => {
    // The other half of the arity pin, and the assertion that says
    // WHICH accessors the rule above does not reach. A slug parameter
    // appearing on one of these is the shape of a deployment-level
    // read being quietly re-scoped.
    // Arrange / Act
    const arities = UNSCOPED.map((unscoped) => ({
      name: unscoped.name,
      arity: unscoped.read.length,
    }));

    // Assert
    expect(arities.filter((entry) => entry.arity !== 0)).toEqual([]);
  });

  UNSCOPED.filter((unscoped) => unscoped.same !== null).forEach((unscoped) => {
    it(`hands the fixture value over unchanged: ${unscoped.name}`, async () => {
      // Identity, not equality. Each of these fixtures is a single
      // frozen value shared by every reader, and its own module
      // explains why a copy would be worse — an unfrozen array a
      // caller can sort in place and believe the change took. A
      // defensive copy added here would silently overturn that.
      // Arrange / Act
      const answered = await unscoped.read();

      // Assert
      expect(answered).toBe(unscoped.same);
    });
  });

  it('passes the connector copy through without making a second one', async () => {
    // The exception to the identity rule: `listConnectors` copies,
    // because `connectors` carries no `domain_id` and so there is
    // nothing to filter on. The claim is that the barrel adds no
    // second policy — same values, and never the stored table.
    // Arrange / Act
    const answered = await api.fetchConnectors();

    // Assert
    expect(answered).toEqual(listConnectors());
    expect(answered).not.toBe(CONNECTORS);
  });
});

describe('fetchDomains', () => {
  it('lists both fixture domains in switcher order', async () => {
    // Compared against literals rather than against a map of
    // `DOMAINS`, so this is a claim about the count and the order
    // rather than a restatement of the table under test.
    // Arrange / Act
    const answered = await api.fetchDomains();

    // Assert
    expect(answered.map((domain) => domain.slug)).toEqual([
      DEFAULT_DOMAIN_SLUG,
      SPARSE_DOMAIN_SLUG,
    ]);
  });

  it('never hands back the stored table', async () => {
    // The one place this module adds anything of its own, so it is
    // the one place that needs this pair. The sort is cast rather
    // than spread on purpose: spreading first would sort a copy of a
    // copy and could never fail. The middle assertion proves the sort
    // was a real reorder, without which the last one passes whatever
    // the accessor returned.
    // Arrange
    const before = DOMAINS.map((domain) => domain.slug);

    // Act
    const answered = await api.fetchDomains();
    (answered as Domain[]).sort((left, right) => left.slug.localeCompare(right.slug));

    // Assert
    expect(answered).not.toBe(DOMAINS);
    expect(answered.map((domain) => domain.slug)).not.toEqual(before);
    expect(DOMAINS.map((domain) => domain.slug)).toEqual(before);
  });
});
