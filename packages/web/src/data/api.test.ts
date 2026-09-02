import type { ExportSubscriptionSummary } from './connectors';
import type { DraftScope, DraftableRow } from './drafts';
import type {
  Connector,
  Document,
  Domain,
  Finding,
  Persona,
  Source,
} from './types';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as api from './api';
import {
  CONNECTORS,
  listConnectors,
  listExportSubscriptions,
  summarizeExportSubscriptions,
} from './connectors';
import { listDocuments, listEntities, listFindings } from './digest';
import {
  DEFAULT_DOMAIN_SLUG,
  DOMAINS,
  SPARSE_DOMAIN_SLUG,
  getDomain,
  resolveVerdictVocabulary,
} from './domains';
import {
  deploymentDraftScope,
  domainDraftScope,
  recordDraft,
  resetDrafts,
} from './drafts';
import { summarizeCategories } from './lexicon';
import { listPersonas } from './personas';
import { SETTINGS } from './settings';
import { NOTIFICATIONS, OPERATOR, SEARCH_SUGGESTIONS } from './shell';
import {
  classifySource,
  countSourceStatuses,
  listSources,
  summarizeSources,
} from './sources';
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
    name: 'fetchEntities',
    read: api.fetchEntities,
    expected: (domain) => listEntities(domain.id),
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

/**
 * How the block at the bottom of this file calls an accessor without
 * knowing which one it is holding.
 *
 * Every export of `./api.ts` is assignable to this, including the
 * seven that declare no parameter — a function of fewer parameters is
 * assignable to one of more. That is load-bearing rather than a
 * convenience: those seven are CALLED with a slug below, because arity
 * is a claim TypeScript checks at the call sites it can see and
 * JavaScript enforces nowhere at all.
 */
type BarrelAccessor = (slug: string) => Promise<unknown>;

/**
 * Every export of `./api.ts`, read off the module itself.
 *
 * The final block is written over this rather than over the two tables
 * above, which is the difference between "every accessor the author
 * listed obeys the rule" and "every accessor obeys the rule". An
 * accessor added to the barrel and to neither table is caught by the
 * surface test below; one added to the barrel and to the WRONG table
 * is caught only there.
 */
const EXPORTED: readonly (readonly [string, BarrelAccessor])[] =
  Object.entries(api);

/**
 * The accessors the unknown-slug rule does not reach, written out
 * rather than derived from {@link UNSCOPED}.
 *
 * A literal on purpose. Derived from that table, filing a new
 * domain-scoped accessor under it would exempt the accessor from the
 * rule and every test in this file would still pass. Written out, the
 * same mistake leaves this list one name short of the table, the
 * accessor falls into the scoped set, and its refusal test reports it
 * by name.
 *
 * Six of the seven answer something that has no domain at all: the
 * domain list itself, the installation's connectors, the operator's
 * settings, the deployment's spend, its notifications and the
 * operator. The palette is the one known narrowing — a live search
 * endpoint would be scoped. `./api.ts` carries the reasoning per
 * accessor.
 */
const UNSCOPED_EXEMPT: readonly string[] = [
  'fetchDomains',
  'fetchConnectors',
  'fetchSettings',
  'fetchSpendSummary',
  'fetchSearchSuggestions',
  'fetchNotifications',
  'fetchOperator',
];

/** The exports the rule reaches: everything the list above omits. */
const SCOPED_EXPORTS = EXPORTED.filter(
  ([name]) => !UNSCOPED_EXEMPT.includes(name),
);

/** The exports it does not, resolved from the module rather than named. */
const EXEMPT_EXPORTS = EXPORTED.filter(
  ([name]) => UNSCOPED_EXEMPT.includes(name),
);

/** What refusing {@link UNKNOWN_SLUG} reads as in {@link outcomeOf}. */
const REFUSAL = `rejected: Unknown domain slug: ${UNKNOWN_SLUG}`;

/**
 * Call one accessor and report how it answered, as a string a failing
 * assertion can print beside the accessor's own name.
 *
 * The call and the await sit in SEPARATE `try` blocks so that a
 * synchronous throw stays distinguishable from a rejection. Collapsed
 * into one, both would report as `rejected:` and the property the
 * seam's `async` exists for would go unasserted — a cache hook renders
 * a rejected promise as an error state, while a throw out of a query
 * function reaches the render and takes the shell down with the page.
 *
 * @param read - The accessor, called with `slug` whether or not it
 * declares a parameter.
 * @param slug - What to hand it.
 * @returns `resolved`, `threw synchronously`, or `rejected: <message>`.
 */
async function outcomeOf(read: BarrelAccessor, slug: string): Promise<string> {
  let pending: Promise<unknown>;

  try {
    pending = read(slug);
  } catch {
    return 'threw synchronously';
  }

  try {
    await pending;
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : String(error);

    return `rejected: ${message}`;
  }

  return 'resolved';
}

beforeEach(() => {
  // `./drafts.ts` is module-scoped state and `./api.ts` now reads it on
  // every accessor, so without this every pass-through claim in this
  // file would be made against whatever the case before it recorded.
  // It also makes the ORDER of the blocks below stop mattering, which
  // is what lets the overlay cases sit at the end of an existing file
  // rather than in one of their own.
  resetDrafts();
});

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

  it('scopes ten accessors by domain and leaves seven unscoped', () => {
    // Counted against literals so that moving an accessor from one
    // table to the other is a failure here rather than a silent
    // re-reading of the rule. WHICH seven cannot be scoped — the
    // count the module docblock states — is the arity test further
    // down.
    // Arrange / Act / Assert
    expect(DOMAIN_SCOPED).toHaveLength(10);
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

describe('the unknown-slug rule, over the module export surface', () => {
  it('reaches every export the exemption list does not name', () => {
    // The guard the rest of this block rests on. Every claim below
    // compares a collected offender list against `[]`, which is a
    // sentence about nothing if the set it walked was empty — and both
    // sets are DERIVED from the module, so an emptied barrel would
    // satisfy the lot at once. The counts are literals rather than a
    // comparison against the tables above, so moving an accessor from
    // one side of the rule to the other fails here instead of being
    // tracked silently; 9 and 7 are also what `./api.ts`'s own
    // docblock says, which is the sentence this pins.
    // Arrange
    const exported = EXPORTED.map(([name]) => name);

    // Act
    const stale = UNSCOPED_EXEMPT.filter((name) => !exported.includes(name));

    // Assert
    expect(stale).toEqual([]);
    expect(SCOPED_EXPORTS).toHaveLength(10);
    expect(EXEMPT_EXPORTS).toHaveLength(7);
  });

  it('rejects an unknown domain slug', async () => {
    // The rule itself, made over the module rather than over a table
    // of remembered names: an accessor is in this set from the moment
    // `./api.ts` exports it, and leaves only when somebody adds its
    // name to the exemption list and says why. The comparison is
    // against the whole outcome string, so an accessor that refused
    // with some other message — or resolved a domain nothing carries
    // into an empty page — is reported rather than counted as a pass.
    // Arrange / Act
    const outcomes = await Promise.all(
      SCOPED_EXPORTS.map(async ([name, read]) => ({
        name,
        outcome: await outcomeOf(read, UNKNOWN_SLUG),
      })),
    );

    // Assert
    expect(outcomes).toHaveLength(SCOPED_EXPORTS.length);
    expect(outcomes.filter((entry) => entry.outcome !== REFUSAL)).toEqual([]);
  });

  it('resolves for every fixture domain slug', async () => {
    // The other half, and the one written over EVERY export rather
    // than over the scoped subset: the exempt seven have to answer a
    // slug too, since a page reaches them through the same hooks on
    // the same render. Driven off `DOMAINS` rather than off the two
    // slug constants the tables above use, so a third fixture domain
    // is exercised by this the day it is seeded.
    // Arrange
    const slugs = DOMAINS.map((domain) => domain.slug);

    // Act
    const outcomes = await Promise.all(
      EXPORTED.flatMap(([name, read]) => slugs.map(async (slug) => ({
        name,
        slug,
        outcome: await outcomeOf(read, slug),
      }))),
    );

    // Assert
    expect(slugs.length).toBeGreaterThan(1);
    expect(outcomes).toHaveLength(EXPORTED.length * slugs.length);
    expect(outcomes.filter((entry) => entry.outcome !== 'resolved')).toEqual([]);
  });

  it('ignores a slug handed to an exempt accessor', async () => {
    // What turns the exemption from a comment into evidence. Arity is
    // checked at the call sites TypeScript can see and enforced
    // nowhere at runtime, so each of the seven is called here with the
    // slug no domain carries: one that had quietly grown a lookup
    // refuses it, and the surface it feeds goes blank on a domain the
    // switcher has never heard of.
    // Arrange / Act
    const outcomes = await Promise.all(
      EXEMPT_EXPORTS.map(async ([name, read]) => ({
        name,
        outcome: await outcomeOf(read, UNKNOWN_SLUG),
      })),
    );

    // Assert
    expect(outcomes).toHaveLength(EXEMPT_EXPORTS.length);
    expect(outcomes.filter((entry) => entry.outcome !== 'resolved')).toEqual([]);
  });

  it('answers an exempt accessor the same whichever domain is active', async () => {
    // The shell-visible reading of the exemption, and the one a page
    // would notice going wrong: a domain switch leaves the topbar's
    // palette, its bell and its avatar, the sidebar's spend figure,
    // the tools surface's connector cards and the whole settings
    // surface exactly where they were. Compared by value rather than
    // by identity because two of the seven copy — the identity claim
    // for the five frozen ones is made further up, against the fixture
    // constants themselves. The name travels into the compared object
    // so a failure says WHICH accessor moved.
    // Arrange / Act
    const answers = await Promise.all(
      EXEMPT_EXPORTS.map(async ([name, read]) => ({
        name,
        seeded: await read(DEFAULT_DOMAIN_SLUG),
        sparse: await read(SPARSE_DOMAIN_SLUG),
      })),
    );

    // Assert
    expect(answers).toHaveLength(EXEMPT_EXPORTS.length);
    answers.forEach((entry) => {
      expect({ name: entry.name, answered: entry.sparse }).toEqual({
        name: entry.name,
        answered: entry.seeded,
      });
    });
  });
});

/**
 * One accessor whose answer carries rows the draft store may replace,
 * with everything a case needs to drive the overlay end to end.
 *
 * `field` and `mark` are what keep these cases off a tautology. An
 * edit is only evidence if it names a field the surface's editor
 * really writes and a value the fixture does not already hold, and
 * both of those are claims the first test below MAKES rather than
 * assumes — a typo in either would otherwise still round-trip through
 * the store and every assertion here would still pass.
 */
interface OverlaidCase {
  /** Its exported name, for the partition check and the titles. */
  readonly name: string;
  /** The draft resource its rows are filed under. */
  readonly resource: string;
  /** Where a draft of those rows is filed, for a given slug. */
  readonly scopeFor: (slug: string) => DraftScope;
  /** What the fixture layer stores for that slug, read directly. */
  readonly storedRows: (slug: string) => readonly DraftableRow[];
  /** The drafted rows inside an answer, in the answer's own order. */
  readonly rowsIn: (answered: unknown) => readonly DraftableRow[];
  /** The accessor under test. */
  readonly read: (slug: string) => Promise<unknown>;
  /** A field the surface's editor really writes. */
  readonly field: string;
  /** What to write into it. Never a value the fixture already holds. */
  readonly mark: unknown;
}

/**
 * Every accessor whose ANSWER carries drafted rows.
 *
 * {@link api.fetchSourceStatusCounts} is overlaid too and is
 * deliberately absent: it answers a count rather than the rows, so
 * none of the row-shaped claims below can be made about it and it has
 * a block of its own further down. The partition test names all three
 * populations so that absence is a decision on the record rather than
 * an accessor nobody wired up.
 */
const ROW_OVERLAID: readonly OverlaidCase[] = [
  {
    name: 'fetchDocuments',
    resource: 'documents',
    scopeFor: (slug) => domainDraftScope(slug, 'documents'),
    storedRows: (slug) => listDocuments(getDomain(slug).id),
    rowsIn: (answered) => answered as readonly Document[],
    read: api.fetchDocuments,
    // What the sources surface's failures list rules on.
    field: 'parseError',
    mark: 'drafted parse error',
  },
  {
    name: 'fetchFindings',
    resource: 'findings',
    scopeFor: (slug) => domainDraftScope(slug, 'findings'),
    storedRows: (slug) => listFindings(getDomain(slug).id),
    rowsIn: (answered) => answered as readonly Finding[],
    read: api.fetchFindings,
    // The digest row action's own edit, and the reason the ordering
    // narrowing in `fetchFindings`' docblock costs nothing today.
    field: 'verdict',
    mark: 'drafted-verdict',
  },
  {
    name: 'fetchSources',
    resource: 'sources',
    scopeFor: (slug) => domainDraftScope(slug, 'sources'),
    storedRows: (slug) => listSources(getDomain(slug).id),
    rowsIn: (answered) => answered as readonly Source[],
    read: api.fetchSources,
    field: 'endpoint',
    mark: 'https://drafted.example.test/feed',
  },
  {
    name: 'fetchPersonas',
    resource: 'personas',
    scopeFor: (slug) => domainDraftScope(slug, 'personas'),
    storedRows: (slug) => listPersonas(getDomain(slug).id),
    rowsIn: (answered) => answered as readonly Persona[],
    read: api.fetchPersonas,
    field: 'systemText',
    mark: 'Drafted system text.',
  },
  {
    name: 'fetchExportSubscriptions',
    resource: 'export-subscriptions',
    scopeFor: (slug) => domainDraftScope(slug, 'export-subscriptions'),
    storedRows: (slug) => listExportSubscriptions(getDomain(slug).id),
    // The one case whose drafted row is a MEMBER of the answer rather
    // than the answer: the accessor hands back the join, and only the
    // subscription inside it is keyed by a draft.
    rowsIn: (answered) => (answered as readonly ExportSubscriptionSummary[])
      .map((summary) => summary.subscription),
    read: api.fetchExportSubscriptions,
    field: 'intervalSeconds',
    mark: 987_654,
  },
  {
    name: 'fetchConnectors',
    resource: 'connectors',
    // The one deployment-scoped case, so its scope ignores the slug —
    // which is the property the cross-domain block below cannot ask of
    // it, and says so rather than exempting it silently.
    scopeFor: () => deploymentDraftScope('connectors'),
    storedRows: () => listConnectors(),
    rowsIn: (answered) => answered as readonly Connector[],
    read: api.fetchConnectors,
    field: 'name',
    mark: 'drafted-connector',
  },
];

/**
 * The overlaid cases a second domain can leak into.
 *
 * {@link api.fetchConnectors} is filed under the deployment scope and
 * there is no other slug for its drafts to arrive from, so the
 * cross-domain claim is not one this table can make about it. Derived
 * by name rather than by a `kind` flag on the case, because there is
 * exactly one and a flag would read as though more were expected.
 */
const DOMAIN_OVERLAID = ROW_OVERLAID.filter(
  (overlaid) => overlaid.name !== 'fetchConnectors',
);

/**
 * The accessor that composes the overlay into a DERIVATION rather than
 * answering the drafted rows.
 *
 * One member, and a list rather than a bare name so the partition
 * below is a set claim over three populations that add up to the
 * barrel.
 */
const DERIVED_OVERLAID: readonly string[] = ['fetchSourceStatusCounts'];

/**
 * The reads the overlay deliberately does not reach.
 *
 * Written out rather than derived, for the reason {@link
 * UNSCOPED_EXEMPT} gives: derived, an accessor that lost its overlay
 * would move into this list on its own and the partition would still
 * balance. `./api.ts` carries a stated reason for every name here —
 * three resources nothing edits, the settings singleton that has no id
 * to key on, the four shell and spend reads that mirror no table, and
 * the one real narrowing on the lexicon summaries.
 */
const NOT_OVERLAID: readonly string[] = [
  'fetchDomains',
  'fetchDomain',
  'fetchVerdicts',
  'fetchEntities',
  'fetchCategorySummaries',
  'fetchSettings',
  'fetchSpendSummary',
  'fetchSearchSuggestions',
  'fetchNotifications',
  'fetchOperator',
];

/**
 * The row at `index`, or a failure naming how short the list came up.
 *
 * Also the non-emptiness guard every overlay case rests on: a fixture
 * that lost its rows would otherwise let the assertions below pass
 * over nothing at all.
 *
 * @typeParam T - The row shape.
 * @param rows - The list to read.
 * @param index - Which row is wanted.
 * @returns That row.
 * @throws If the list is shorter than the index.
 */
function rowAt<T>(rows: readonly T[], index: number): T {
  const row = rows[index];

  if (row === undefined) {
    throw new Error(`No row at index ${index} of ${rows.length}.`);
  }

  return row;
}

/**
 * One named field of a row, read without knowing the row's type.
 *
 * Over `Object.entries` rather than through a cast to an index
 * signature, which is what lets one case table cover six unrelated row
 * shapes with no assertion TypeScript had to be talked out of. An
 * absent field reads as `undefined`, and the vacuity guard beside each
 * case is what rules that out rather than this.
 *
 * @param row - The row to read.
 * @param field - Which of its fields.
 * @returns Whatever it holds, or `undefined` if it carries no such key.
 */
function fieldOf(row: DraftableRow, field: string): unknown {
  return Object.entries(row).find(([key]) => key === field)?.[1];
}

/**
 * The edit a case records: the stored row with one field rewritten.
 *
 * Spreads the row at RUNTIME, so the draft carries every field the
 * fixture row carried even though the static type here is only
 * {@link DraftableRow}. That matters for the identity assertions —
 * what comes back has to be a whole row, not the id and one field.
 *
 * @param row - The stored row being edited.
 * @param field - Which field the editor writes.
 * @param mark - What it writes.
 * @returns The edited copy, ready for `recordDraft`.
 */
function draftOf(
  row: DraftableRow,
  field: string,
  mark: unknown,
): DraftableRow {
  return { ...row, [field]: mark };
}

describe('the draft overlay', () => {
  it('partitions the barrel into overlaid, derived and untouched', () => {
    // The guard the rest of this file's overlay claims rest on. Every
    // case below is made over `ROW_OVERLAID`, so an accessor that was
    // given an overlay and no case — or lost one and kept its case —
    // would be covered by nothing and reported by nothing. The three
    // populations are literals, so moving an accessor between them is
    // a failure here rather than a silent re-reading of the rule.
    // Arrange
    const claimed = [
      ...ROW_OVERLAID.map((overlaid) => overlaid.name),
      ...DERIVED_OVERLAID,
      ...NOT_OVERLAID,
    ].sort();

    // Act
    const exported = Object.keys(api).sort();

    // Assert
    expect(claimed).toEqual(exported);
    expect(ROW_OVERLAID).toHaveLength(6);
    expect(DERIVED_OVERLAID).toHaveLength(1);
    expect(NOT_OVERLAID).toHaveLength(10);
  });

  it('names each overlaid resource once', () => {
    // The near-miss the set comparison cannot catch: two cases filed
    // under one resource would cover that resource twice and leave
    // another accessor overlaid by a scope no case ever builds.
    // Arrange
    const named = ROW_OVERLAID.map((overlaid) => overlaid.resource);

    // Act
    const duplicated = named.filter(
      (resource, index) => named.indexOf(resource) !== index,
    );

    // Assert
    expect(duplicated).toEqual([]);
  });

  ROW_OVERLAID.forEach((overlaid) => {
    it(`edits a real field to a value the fixture does not hold: ${overlaid.name}`, () => {
      // The vacuity guard for every case that follows. A `field` the
      // row does not carry, or a `mark` equal to what it already
      // holds, both round-trip through the store perfectly and make
      // the overlay assertions below pass while proving nothing about
      // the surface that is supposed to write them.
      // Arrange
      const stored = overlaid.storedRows(DEFAULT_DOMAIN_SLUG);

      // Act
      const target = rowAt(stored, 0);

      // Assert
      expect(stored.length).toBeGreaterThan(1);
      expect(Object.keys(target)).toContain(overlaid.field);
      expect(fieldOf(target, overlaid.field)).not.toBe(overlaid.mark);
    });

    it(`answers the edited row: ${overlaid.name}`, async () => {
      // The whole point of the seam's write half. A save an editor
      // believes it made and no read shows is worse than no save at
      // all, so the read that would display this row has to show the
      // edit on the very next call.
      // Arrange
      const stored = overlaid.storedRows(DEFAULT_DOMAIN_SLUG);
      const target = rowAt(stored, 0);
      const draft = draftOf(target, overlaid.field, overlaid.mark);

      recordDraft(overlaid.scopeFor(DEFAULT_DOMAIN_SLUG), draft);

      // Act
      const answered = overlaid.rowsIn(
        await overlaid.read(DEFAULT_DOMAIN_SLUG),
      );
      const shown = answered.filter((row) => row.id === target.id);

      // Assert
      expect(shown).toEqual([draft]);
      expect(fieldOf(rowAt(shown, 0), overlaid.field)).toBe(overlaid.mark);
      expect(rowAt(shown, 0)).not.toBe(target);
    });

    it(`leaves every unedited row identical to the fixture: ${overlaid.name}`, async () => {
      // `applyDrafts` hands undrafted rows back as the very objects it
      // was given, so this is IDENTITY rather than deep equality —
      // strictly more than byte-identical, and the difference matters:
      // an overlay that rebuilt every row would satisfy `toEqual` and
      // would be a second policy layered at the seam.
      // Arrange
      const stored = overlaid.storedRows(DEFAULT_DOMAIN_SLUG);
      const target = rowAt(stored, 0);

      recordDraft(
        overlaid.scopeFor(DEFAULT_DOMAIN_SLUG),
        draftOf(target, overlaid.field, overlaid.mark),
      );

      // Act
      const answered = overlaid.rowsIn(
        await overlaid.read(DEFAULT_DOMAIN_SLUG),
      );
      const compared = answered.map((row, index) => ({
        id: row.id,
        identical: row === stored[index],
      }));

      // Assert — membership and order are the fixture's, and exactly
      // one row is not the fixture's own object.
      expect(answered.map((row) => row.id)).toEqual(
        stored.map((row) => row.id),
      );
      expect(compared.filter((entry) => !entry.identical)).toEqual([
        { id: target.id, identical: false },
      ]);
    });
  });

  DOMAIN_OVERLAID.forEach((overlaid) => {
    it(`shows a draft only under the slug it was recorded for: ${overlaid.name}`, async () => {
      // The cross-domain guard, read through the accessor rather than
      // through the store: the scope is built from the slug the CALL
      // was handed, so an accessor that closed over one fixed slug
      // shows one domain's edits to every other. Same resource, same
      // row id, other domain, and the seeded read must not see it.
      //
      // Its LIMIT, measured rather than assumed: a scope hardcoded to
      // any slug reddens this file — except one hardcoded to the
      // SEEDED slug, which stays green everywhere. Only one fixture
      // domain carries rows, so a read of the other overlays an empty
      // list whatever scope it built. Closing that leg needs a second
      // populated domain, not another assertion.
      // Arrange
      const stored = overlaid.storedRows(DEFAULT_DOMAIN_SLUG);
      const target = rowAt(stored, 0);

      recordDraft(
        overlaid.scopeFor(SPARSE_DOMAIN_SLUG),
        draftOf(target, overlaid.field, overlaid.mark),
      );

      // Act
      const answered = overlaid.rowsIn(
        await overlaid.read(DEFAULT_DOMAIN_SLUG),
      );

      // Assert
      expect(answered).toEqual(stored);
      expect(answered.filter((row, index) => row !== stored[index])).toEqual([]);
    });
  });

  it('still rejects an unknown slug with drafts recorded under it', async () => {
    // The property `deliverDomainRows` builds its scope outside
    // `deliverForDomain` for, made explicit. The overlay runs on rows
    // the domain lookup already produced, so a draft filed under a
    // slug nothing carries is recorded, never reached, and cannot turn
    // a rejection into a resolved empty page — which a cache hook
    // would render as a domain that exists and has nothing in it.
    // Written over `SCOPED_EXPORTS`, so an accessor is in this claim
    // from the moment `./api.ts` exports it.
    // Arrange
    DOMAIN_OVERLAID.forEach((overlaid) => {
      const stored = overlaid.storedRows(DEFAULT_DOMAIN_SLUG);

      recordDraft(
        overlaid.scopeFor(UNKNOWN_SLUG),
        draftOf(rowAt(stored, 0), overlaid.field, overlaid.mark),
      );
    });

    // Act
    const outcomes = await Promise.all(
      SCOPED_EXPORTS.map(async ([name, read]) => ({
        name,
        outcome: await outcomeOf(read, UNKNOWN_SLUG),
      })),
    );

    // Assert
    expect(outcomes).toHaveLength(SCOPED_EXPORTS.length);
    expect(outcomes.filter((entry) => entry.outcome !== REFUSAL)).toEqual([]);
  });

  it('answers the fixtures unchanged when nothing has been recorded', async () => {
    // The commonest state by far, and the one the rest of this file
    // silently depends on: every pass-through claim above is made
    // against a store the hook emptied. Asserted here as well so that
    // an overlay which somehow applied on an empty store would be
    // reported by a case that says so, rather than by twenty that do
    // not mention drafts at all.
    // Arrange
    const domain = getDomain(DEFAULT_DOMAIN_SLUG);

    // Act
    const answers = await Promise.all(
      ROW_OVERLAID.map(async (overlaid) => ({
        name: overlaid.name,
        rows: overlaid.rowsIn(await overlaid.read(DEFAULT_DOMAIN_SLUG)),
      })),
    );

    // Assert
    expect(answers).toHaveLength(ROW_OVERLAID.length);
    answers.forEach((entry) => {
      const stored = rowAt(
        ROW_OVERLAID.filter((overlaid) => overlaid.name === entry.name),
        0,
      ).storedRows(domain.slug);

      expect({ name: entry.name, rows: entry.rows }).toEqual({
        name: entry.name,
        rows: stored,
      });
    });
  });
});

describe('the overlay behind the derived source counts', () => {
  it('counts the sources this tab sees rather than the stored ones', async () => {
    // What `fetchSourceStatusCounts` composing `countSourceStatuses`
    // over the overlaid list buys: a source an operator has just
    // disabled is disabled in the stat cards on the same render it is
    // disabled in the table. The target is CHOSEN as one the
    // classifier does not already call `disabled`, so the draft is a
    // real move rather than a no-op the counts could not report.
    // Arrange
    const domain = getDomain(DEFAULT_DOMAIN_SLUG);
    const stored = listSources(domain.id);
    const target = rowAt(
      stored.filter((source) => classifySource(source) !== 'disabled'),
      0,
    );
    const was = classifySource(target);
    const before = summarizeSources(domain.id);

    recordDraft(
      domainDraftScope(DEFAULT_DOMAIN_SLUG, 'sources'),
      { ...target, enabled: false },
    );

    // Act
    const counts = await api.fetchSourceStatusCounts(DEFAULT_DOMAIN_SLUG);

    // Assert
    expect(was).not.toBe('disabled');
    expect(counts.disabled).toBe(before.disabled + 1);
    expect(counts[was]).toBe(before[was] - 1);
    expect(Object.values(counts).reduce((sum, count) => sum + count, 0)).toBe(
      Object.values(before).reduce((sum, count) => sum + count, 0),
    );
  });

  it('agrees with the table it sits above', async () => {
    // The invariant `summarizeSources` exists for, asserted across the
    // two accessors that have to honour it together. An overlay added
    // to one and not the other passes every test in this file except
    // this one: the cards would count the stored rows while the table
    // rendered the edited ones.
    // Arrange
    const domain = getDomain(DEFAULT_DOMAIN_SLUG);
    const target = rowAt(
      listSources(domain.id).filter(
        (source) => classifySource(source) !== 'disabled',
      ),
      0,
    );

    recordDraft(
      domainDraftScope(DEFAULT_DOMAIN_SLUG, 'sources'),
      { ...target, enabled: false },
    );

    // Act
    const sources = await api.fetchSources(DEFAULT_DOMAIN_SLUG);
    const counts = await api.fetchSourceStatusCounts(DEFAULT_DOMAIN_SLUG);

    // Assert — and the draft moved something, without which the
    // agreement above would hold over the stored rows too.
    expect(counts).toEqual(countSourceStatuses(sources));
    expect(counts).not.toEqual(summarizeSources(domain.id));
  });
});

describe('the overlay behind the export join', () => {
  it('re-resolves the destination of a drafted subscription', async () => {
    // The third overlay shape's deliberate half. The drafted row is a
    // MEMBER of the answer, so replacing it alone would leave the old
    // connector rendered beside an edited delivery — a wrong answer
    // that looks like a saved one. `overlaySubscription` asks the
    // fixture layer's own `getConnector` instead.
    // Arrange
    const domain = getDomain(DEFAULT_DOMAIN_SLUG);
    const target = rowAt(listExportSubscriptions(domain.id), 0);
    const targets = listConnectors().filter(
      (connector) => connector.kind === 'export_target',
    );
    const elsewhere = rowAt(
      targets.filter((connector) => connector.id !== target.connectorId),
      0,
    );

    recordDraft(
      domainDraftScope(DEFAULT_DOMAIN_SLUG, 'export-subscriptions'),
      { ...target, connectorId: elsewhere.id },
    );

    // Act
    const answered = await api.fetchExportSubscriptions(DEFAULT_DOMAIN_SLUG);
    const shown = answered.filter(
      (summary) => summary.subscription.id === target.id,
    );

    // Assert
    expect(elsewhere.id).not.toBe(target.connectorId);
    expect(shown.map((summary) => summary.connector)).toEqual([elsewhere]);
    expect(shown.map((summary) => summary.subscription.connectorId)).toEqual([
      elsewhere.id,
    ]);
  });

  it('rejects a drafted delivery to a destination nothing carries', async () => {
    // The other half of that decision: a drafted subscription is held
    // to the same rule as a stored one. A delivery to nowhere is not
    // the same thing as a cancelled subscription, so the read refuses
    // rather than dropping the row — and refuses by REJECTING, which
    // is what keeps a cache hook rendering an error state instead of
    // the exception reaching the render.
    // Arrange
    const domain = getDomain(DEFAULT_DOMAIN_SLUG);
    const target = rowAt(listExportSubscriptions(domain.id), 0);
    const absent = Math.max(
      ...listConnectors().map((connector) => connector.id),
    ) + 1;

    recordDraft(
      domainDraftScope(DEFAULT_DOMAIN_SLUG, 'export-subscriptions'),
      { ...target, connectorId: absent },
    );

    // Act
    const outcome = await outcomeOf(
      api.fetchExportSubscriptions,
      DEFAULT_DOMAIN_SLUG,
    );

    // Assert
    expect(outcome).toBe(`rejected: Unknown connector id: ${absent}`);
  });
});
