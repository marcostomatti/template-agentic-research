import type { ExportSubscriptionSummary } from './connectors';
import type { DraftScope, DraftableRow } from './drafts';
import type {
  Category,
  Connector,
  Document,
  Domain,
  ExportSubscription,
  Finding,
  Persona,
  Settings,
  Source,
  Term,
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
  applyDrafts,
  applySingletonDraft,
  deploymentDraftScope,
  domainDraftScope,
  recordDraft,
  resetDrafts,
} from './drafts';
import {
  TERMS,
  listCategories,
  listTerms,
  summarizeCategories,
} from './lexicon';
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
 * Every export of `./api.ts`, name and value, with the value widened
 * to `unknown`.
 *
 * An ASSIGNMENT rather than a cast, which is what keeps it evidence:
 * the barrel is heterogeneous now that it writes as well as reads —
 * one-argument reads beside two-argument writes — so no single
 * function type describes every member, and any type that claimed to
 * would have been asserted rather than checked.
 */
const EXPORTED_ENTRIES: readonly (readonly [string, unknown])[] =
  Object.entries(api);

/**
 * The names of the nine WRITE accessors.
 *
 * A literal, for the reason {@link UNSCOPED_EXEMPT} is one: derived
 * from the write table below, an accessor filed there by mistake would
 * exempt itself from every read rule in this file and nothing would
 * report it. Written out, the same mistake leaves one of the two
 * partitions short and the surface tests name it.
 */
const WRITE_NAMES: readonly string[] = [
  'saveCategoryTerms',
  'saveFinding',
  'saveSource',
  'approveSourceConfig',
  'resolveSourceFailure',
  'savePersona',
  'saveConnector',
  'saveExportSubscriptions',
  'saveSettings',
];

/**
 * The names of the five SINGLE-ROW reads.
 *
 * A literal for the reason {@link WRITE_NAMES} is one, and it buys the
 * same thing: these are reads, but they take an id as well as a slug,
 * so the whole-surface blocks below — which call an accessor with a
 * slug and nothing else — would hand one of them `undefined` for its
 * row and read the resulting refusal as the wrong one entirely. A
 * THIRD population rather than an exemption filter, so a read of this
 * shape cannot hide among the ones that take a slug alone.
 */
const SINGLE_ROW_NAMES: readonly string[] = [
  'fetchFinding',
  'fetchSource',
  'fetchPersona',
  'fetchConnector',
  'fetchCategory',
];

/**
 * The names of the reads that answer a LIST hanging off one ROW.
 *
 * A literal for the reason {@link WRITE_NAMES} and
 * {@link SINGLE_ROW_NAMES} are, and it buys the same thing against a
 * shape neither of them describes: {@link api.fetchTerms} takes a
 * slug and a CATEGORY id and answers that category's terms, so it
 * refuses like a single-row read and answers like a list one. Handed
 * a slug and nothing else — which is how the whole-surface blocks
 * below call an accessor — it would reject over a category id of
 * `undefined`, and the blocks would read that refusal as the
 * unknown-slug one they were asking about.
 */
const CHILD_LIST_NAMES: readonly string[] = ['fetchTerms'];

/**
 * Every READ export of `./api.ts`, resolved from the module itself.
 *
 * The read blocks are written over this rather than over the two
 * tables above, which is the difference between "every accessor the
 * author listed obeys the rule" and "every accessor obeys the rule".
 * An accessor added to the barrel and to no table is caught by the
 * surface test below; one added to the barrel and to the WRONG table
 * is caught only there.
 *
 * The cast is from `unknown` and reaches exactly the members
 * {@link WRITE_NAMES}, {@link SINGLE_ROW_NAMES} and
 * {@link CHILD_LIST_NAMES} did not claim, so it asserts one thing:
 * that every remaining export is callable with a slug and nothing
 * else. That claim is not free-floating — the arity
 * tests below are what make it, and they run over these same values.
 */
const EXPORTED: readonly (readonly [string, BarrelAccessor])[] =
  EXPORTED_ENTRIES
    .filter(([name]) => !WRITE_NAMES.includes(name))
    .filter(([name]) => !SINGLE_ROW_NAMES.includes(name))
    .filter(([name]) => !CHILD_LIST_NAMES.includes(name))
    .map(([name, accessor]) => [name, accessor as BarrelAccessor] as const);

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
  it('exports nothing beyond the five case tables below', () => {
    // The guard the whole file rests on: every claim here is made
    // over one of the five populations, so an accessor added to
    // `./api.ts` and to none of them would be covered by nothing and
    // reported by nothing. Sorted on both sides because it is a set
    // claim.
    // Arrange
    const covered = [
      ...DOMAIN_SCOPED.map((scoped) => scoped.name),
      ...UNSCOPED.map((unscoped) => unscoped.name),
      ...SINGLE_ROW_NAMES,
      ...CHILD_LIST_NAMES,
      ...WRITE_NAMES,
    ].sort();

    // Act
    const exported = Object.keys(api).sort();

    // Assert
    expect(exported).toEqual(covered);
  });

  it('names each accessor once', () => {
    // The near-miss the set comparison above cannot catch on its own:
    // two table rows sharing a name would still produce the right set
    // while covering one accessor twice and another not at all. Over
    // all five populations, so a write sharing a read's name — which
    // would put one function under two sets of rules — is reported
    // here too.
    // Arrange
    const named = [
      ...DOMAIN_SCOPED.map((scoped) => scoped.name),
      ...UNSCOPED.map((unscoped) => unscoped.name),
      ...SINGLE_ROW_NAMES,
      ...CHILD_LIST_NAMES,
      ...WRITE_NAMES,
    ];

    // Act
    const duplicated = named.filter(
      (name, index) => named.indexOf(name) !== index,
    );

    // Assert
    expect(duplicated).toEqual([]);
  });

  it('reads through twenty-three accessors and writes through nine', () => {
    // Counted against literals so that moving an accessor from one
    // table to another is a failure here rather than a silent
    // re-reading of the rule. WHICH reads cannot be scoped is the
    // arity test further down; WHICH writes are is the write table's
    // own. Twenty-three is ten list reads plus seven that take no
    // domain plus the five that take a row id plus the one that takes
    // a PARENT id, and `./api.ts`'s own docblock spells one figure
    // inside it from the other direction — EIGHT of the
    // twenty-three take no slug, the eighth being `fetchConnector`,
    // which lives in the single-row table.
    // Arrange / Act
    const reads = Object.keys(api).filter((name) => name.startsWith('fetch'));

    // Assert
    expect(DOMAIN_SCOPED).toHaveLength(10);
    expect(UNSCOPED).toHaveLength(7);
    expect(SINGLE_ROW_NAMES).toHaveLength(5);
    expect(CHILD_LIST_NAMES).toHaveLength(1);
    expect(WRITE_NAMES).toHaveLength(9);
    expect(reads).toHaveLength(23);
  });

  it('splits the module four ways with nothing left over', () => {
    // What licenses every `EXPORTED`-driven block below to say
    // "every export": those blocks walk the SLUG-ONLY read half, so a
    // write, a single-row read or a child-list read that failed to be
    // recognised as one would fall into that set and be called with a
    // slug and nothing else. Every side is resolved from the module —
    // the three name lists are the only literals — so a name in any
    // of them matching no export is reported rather than quietly
    // narrowing the read set by nothing.
    // Arrange
    const exported = Object.keys(api);
    const claimed = [
      ...WRITE_NAMES,
      ...SINGLE_ROW_NAMES,
      ...CHILD_LIST_NAMES,
    ];

    // Act
    const missing = claimed.filter((name) => !exported.includes(name));

    // Assert
    expect(missing).toEqual([]);
    expect(EXPORTED).toHaveLength(exported.length - claimed.length);
    expect(EXPORTED.map(([name]) => name).filter(
      (name) => claimed.includes(name),
    )).toEqual([]);
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
  it('reaches every read the exemption list does not name', () => {
    // The guard the rest of this block rests on. Every claim below
    // compares a collected offender list against `[]`, which is a
    // sentence about nothing if the set it walked was empty — and both
    // sets are DERIVED from the module, so an emptied barrel would
    // satisfy the lot at once. The counts are literals rather than a
    // comparison against the tables above, so moving an accessor from
    // one side of the rule to the other fails here instead of being
    // tracked silently. The 7 is the SLUG-ONLY share of what
    // `./api.ts`'s docblock counts as eight unscoped reads: its
    // eighth is `fetchConnector`, which takes a row id instead and is
    // exercised in the single-row block. The writes obey the same
    // rule and are exercised separately too, because calling one of
    // them takes a payload as well as a slug.
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
    // The other half, and the one written over every READ rather
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
 * The read that composes a SINGLETON draft rather than a list of
 * drafted rows.
 *
 * One member, and a list for the same reason {@link DERIVED_OVERLAID}
 * is one: the partition below is a set claim over populations that add
 * up to the barrel, and a bare name would read as a special case
 * rather than as a fourth population. Its own block further down is
 * where the shape is actually exercised — none of the row-shaped
 * claims can be made about a value that is not in a list.
 */
const SINGLETON_OVERLAID: readonly string[] = ['fetchSettings'];

/**
 * The reads the overlay deliberately does not reach.
 *
 * Written out rather than derived, for the reason {@link
 * UNSCOPED_EXEMPT} gives: derived, an accessor that lost its overlay
 * would move into this list on its own and the partition would still
 * balance. `./api.ts` carries a stated reason for every name here —
 * two resources nothing edits, the four shell and spend reads that
 * mirror no table, and the one real narrowing on the lexicon
 * summaries.
 */
const NOT_OVERLAID: readonly string[] = [
  'fetchDomains',
  'fetchDomain',
  'fetchVerdicts',
  'fetchEntities',
  'fetchCategorySummaries',
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
  it('partitions the barrel seven ways with nothing left over', () => {
    // The guard the rest of this file's overlay claims rest on. Every
    // case below is made over `ROW_OVERLAID`, so an accessor that was
    // given an overlay and no case — or lost one and kept its case —
    // would be covered by nothing and reported by nothing. The six
    // name populations are literals, so moving an accessor between
    // them is a failure here rather than a silent re-reading of the
    // rule. The writes are one of them rather than excluded from the
    // claim:
    // a write is not overlaid — it is what puts something there to
    // overlay — and leaving them out would make this a partition of
    // part of the module.
    // Arrange
    const claimed = [
      ...ROW_OVERLAID.map((overlaid) => overlaid.name),
      ...DERIVED_OVERLAID,
      ...SINGLETON_OVERLAID,
      ...SINGLE_ROW_NAMES,
      ...CHILD_LIST_NAMES,
      ...NOT_OVERLAID,
      ...WRITE_NAMES,
    ].sort();

    // Act
    const exported = Object.keys(api).sort();

    // Assert
    expect(claimed).toEqual(exported);
    expect(ROW_OVERLAID).toHaveLength(6);
    expect(DERIVED_OVERLAID).toHaveLength(1);
    expect(SINGLETON_OVERLAID).toHaveLength(1);
    expect(SINGLE_ROW_NAMES).toHaveLength(5);
    expect(CHILD_LIST_NAMES).toHaveLength(1);
    expect(NOT_OVERLAID).toHaveLength(9);
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

/**
 * One SINGLE-ROW read, with everything a case needs to drive it
 * without knowing which one it is holding.
 *
 * `read` is a normalising WRAPPER rather than the export, because the
 * five do not share a signature — four take a slug and an id and
 * {@link api.fetchConnector} takes the id alone. `accessor` holds the
 * export ITSELF beside it, so `Function.length` still reports the real
 * arity and the pin below is a claim about `./api.ts` rather than
 * about this file's wrappers.
 *
 * `scopeFor` is `null` for the one read that is deliberately not
 * overlaid, which is what turns that narrowing into a row of the table
 * rather than an accessor quietly missing from it.
 */
interface SingleRowCase {
  /** Its exported name, for the completeness check and the titles. */
  readonly name: string;
  /** The accessor, called uniformly. */
  readonly read: (slug: string, id: number) => Promise<unknown>;
  /** The export itself, for the arity pin. */
  readonly accessor: (...args: never[]) => Promise<unknown>;
  /** Whether it refuses a domain at all. */
  readonly scoped: boolean;
  /** The singular noun its refusal names. */
  readonly label: string;
  /** What the fixture layer stores for that domain, read directly. */
  readonly storedRows: (slug: string) => readonly DraftableRow[];
  /** Where a draft of one of those rows is filed, or null if none is. */
  readonly scopeFor: ((slug: string) => DraftScope) | null;
  /** A field the surface's editor really writes. */
  readonly field: string;
  /** What to write into it. Never a value the fixture already holds. */
  readonly mark: unknown;
}

const SINGLE_ROW: readonly SingleRowCase[] = [
  {
    name: 'fetchFinding',
    read: (slug, id) => api.fetchFinding(slug, id),
    accessor: api.fetchFinding,
    scoped: true,
    label: 'finding',
    storedRows: (slug) => listFindings(getDomain(slug).id),
    scopeFor: (slug) => domainDraftScope(slug, 'findings'),
    field: 'verdict',
    mark: 'drafted-row-verdict',
  },
  {
    name: 'fetchSource',
    read: (slug, id) => api.fetchSource(slug, id),
    accessor: api.fetchSource,
    scoped: true,
    label: 'source',
    storedRows: (slug) => listSources(getDomain(slug).id),
    scopeFor: (slug) => domainDraftScope(slug, 'sources'),
    field: 'endpoint',
    mark: 'https://drafted-row.example.test/feed',
  },
  {
    name: 'fetchPersona',
    read: (slug, id) => api.fetchPersona(slug, id),
    accessor: api.fetchPersona,
    scoped: true,
    label: 'persona',
    storedRows: (slug) => listPersonas(getDomain(slug).id),
    scopeFor: (slug) => domainDraftScope(slug, 'personas'),
    field: 'systemText',
    mark: 'Drafted row system text.',
  },
  {
    // The one that takes no slug, so the wrapper drops it. The `_`
    // prefix is what `noUnusedParameters` wants and eslint never asked
    // for — a parameter before a used one is invisible to the lint
    // rule and reported by tsc whatever its position.
    name: 'fetchConnector',
    read: (_slug, id) => api.fetchConnector(id),
    accessor: api.fetchConnector,
    scoped: false,
    label: 'connector',
    storedRows: () => listConnectors(),
    scopeFor: () => deploymentDraftScope('connectors'),
    field: 'name',
    mark: 'drafted-row-connector',
  },
  {
    // The one that is NOT overlaid, and the narrowing `./api.ts`
    // states: the lexicon editor saves a category's TERMS, so there is
    // no edit to a category row for an overlay to apply.
    name: 'fetchCategory',
    read: (slug, id) => api.fetchCategory(slug, id),
    accessor: api.fetchCategory,
    scoped: true,
    label: 'category',
    storedRows: (slug) => listCategories(getDomain(slug).id),
    scopeFor: null,
    field: 'name',
    mark: 'Drafted category name',
  },
];

/** The single-row reads a domain slug can be refused by. */
const SCOPED_SINGLE_ROW = SINGLE_ROW.filter((single) => single.scoped);

/** The single-row reads whose answer this tab's edits reach. */
const OVERLAID_SINGLE_ROW = SINGLE_ROW.filter(
  (single) => single.scopeFor !== null,
);

/**
 * Where one case's drafts are filed for a slug, past the null the
 * un-overlaid case carries.
 *
 * @param single - The case, which must be an overlaid one.
 * @param slug - Which domain's drafts.
 * @returns Its scope.
 * @throws If handed the un-overlaid case, which is a table wired
 * wrongly rather than a state to render.
 */
function singleScope(single: SingleRowCase, slug: string): DraftScope {
  if (single.scopeFor === null) {
    throw new Error(`${single.name} declares no draft scope.`);
  }

  return single.scopeFor(slug);
}

/**
 * The row a case reads, and the id it is asked for.
 *
 * Always the FIRST stored row rather than a written id, for the reason
 * every other case here reads its rows off the fixture: a reseeded
 * table silently turns a hardcoded id into somebody else's row.
 *
 * @param single - The case.
 * @param slug - Which domain's rows.
 * @returns Its first row.
 * @throws Through {@link rowAt} if that domain has none, which is the
 * non-emptiness guard the positive cases below rest on.
 */
function firstRowFor(single: SingleRowCase, slug: string): DraftableRow {
  return rowAt(single.storedRows(slug), 0);
}

describe('the single-row reads', () => {
  it('drives every single-row read the module exports', () => {
    // The guard every claim below rests on. The cases are written over
    // `SINGLE_ROW`, so a read of this shape added to `./api.ts` and to
    // no case would be covered by nothing and reported by nothing —
    // and the partition test above only knows the NAME list, which
    // this holds the table against.
    // Arrange
    const cased = SINGLE_ROW.map((single) => single.name).sort();
    const exported = Object.keys(api);

    // Act
    const stale = SINGLE_ROW_NAMES.filter((name) => !exported.includes(name));

    // Assert
    expect(cased).toEqual([...SINGLE_ROW_NAMES].sort());
    expect(stale).toEqual([]);
    expect(SINGLE_ROW).toHaveLength(5);
  });

  it('takes the slug first and the id second', () => {
    // The structural pin, made against each accessor's OWN arity
    // rather than against the wrappers this table calls them through.
    // Four take a resolved slug and a row id; `fetchConnector` takes
    // the id alone, exactly as `fetchConnectors` takes nothing — a
    // slug appearing on it would be a deployment-level read quietly
    // re-scoped, which is the same failure the list half pins.
    // Arrange / Act
    const arities = SINGLE_ROW.map((single) => ({
      name: single.name,
      arity: single.accessor.length,
      expected: single.scoped
        ? 2
        : 1,
    }));

    // Assert
    expect(arities.filter((entry) => entry.arity !== entry.expected))
      .toEqual([]);
    expect(SCOPED_SINGLE_ROW).toHaveLength(4);
  });

  it('overlays four of the five and names the fifth as the narrowing', () => {
    // The narrowing on the record rather than as an absence. A case
    // that lost its scope would drop out of every overlay claim below
    // and nothing else would report it; here it moves this count.
    // Arrange / Act
    const unoverlaid = SINGLE_ROW.filter((single) => single.scopeFor === null);

    // Assert
    expect(OVERLAID_SINGLE_ROW).toHaveLength(4);
    expect(unoverlaid.map((single) => single.name)).toEqual(['fetchCategory']);
  });

  it('reads a real row for every case', () => {
    // The non-emptiness guard. Every positive case below reads the
    // seeded domain's first row of a resource, so a fixture that lost
    // its rows would make the lot of them pass over nothing at all.
    // Arrange / Act
    const sizes = SINGLE_ROW.map((single) => ({
      name: single.name,
      size: single.storedRows(DEFAULT_DOMAIN_SLUG).length,
    }));

    // Assert
    expect(sizes.filter((entry) => entry.size === 0)).toEqual([]);
  });

  SINGLE_ROW.forEach((single) => {
    it(`rejects an id no fixture carries: ${single.name}`, async () => {
      // The refusal this shape exists to make, and it comes first
      // because it is the one a stale bookmark actually produces: a
      // modal sub-route matches any digits at all, so the id reaching
      // the seam is a number nobody promised. Rejecting rather than
      // throwing is the same property the list reads have — a cache
      // hook renders a rejection, while a synchronous throw out of a
      // query function reaches the render and takes the shell down.
      // Arrange
      const absent = absentIdFor(single.storedRows(DEFAULT_DOMAIN_SLUG));

      const call = (): void => {
        void single.read(DEFAULT_DOMAIN_SLUG, absent).catch(() => undefined);
      };

      // Act / Assert
      expect(call).not.toThrow();
      await expect(single.read(DEFAULT_DOMAIN_SLUG, absent)).rejects.toThrow(
        `Unknown ${single.label} id: ${absent}`,
      );
    });
  });

  SCOPED_SINGLE_ROW.forEach((single) => {
    it(`rejects an unknown domain slug: ${single.name}`, async () => {
      // The other refusal, with a real id so the two cannot be
      // confused: this must fail on the DOMAIN, and it does because
      // `getDomain` runs inside `deliver`'s callback before the
      // fixture is ever asked for a row.
      // Arrange
      const row = firstRowFor(single, DEFAULT_DOMAIN_SLUG);

      // Act
      const outcome = await outcomeOf(
        (slug) => single.read(slug, row.id),
        UNKNOWN_SLUG,
      );

      // Assert
      expect(outcome).toBe(REFUSAL);
    });

    it(`refuses the domain before the row: ${single.name}`, async () => {
      // The ORDER of the two refusals, which is not visible from
      // either one alone. Both arguments are wrong here, and the
      // domain is what has to answer — a seam that looked the row up
      // first would report a missing row for a domain that does not
      // exist, which is a 404 about the wrong thing.
      // Arrange
      const absent = absentIdFor(single.storedRows(DEFAULT_DOMAIN_SLUG));

      // Act
      const outcome = await outcomeOf(
        (slug) => single.read(slug, absent),
        UNKNOWN_SLUG,
      );

      // Assert
      expect(outcome).toBe(REFUSAL);
    });

    it(`refuses another domain's row: ${single.name}`, async () => {
      // The refusal `./api.ts` adds on top of the fixture accessor,
      // and the reason it has to: the fixture tables are keyed by id
      // alone, so this id answers a row whatever slug stood in the
      // URL — and the draft scope is built from the SLUG, so an
      // unchecked read would lay the sparse domain's edits over the
      // seeded domain's row. Compared against the MISSING-row outcome
      // in the same case, because the two being indistinguishable is
      // itself the claim: a scoped endpoint answers 404 for both, and
      // a message telling them apart reports which ids exist under a
      // domain the caller was just refused.
      // Arrange
      const row = firstRowFor(single, DEFAULT_DOMAIN_SLUG);
      const absent = absentIdFor(single.storedRows(DEFAULT_DOMAIN_SLUG));

      // Act
      const foreign = await outcomeOf(
        (slug) => single.read(slug, row.id),
        SPARSE_DOMAIN_SLUG,
      );
      const missing = await outcomeOf(
        (slug) => single.read(slug, absent),
        SPARSE_DOMAIN_SLUG,
      );

      // Assert
      expect(foreign).toBe(`rejected: Unknown ${single.label} id: ${row.id}`);
      expect(foreign.replace(String(row.id), String(absent))).toBe(missing);
      expect(single.storedRows(SPARSE_DOMAIN_SLUG).map((r) => r.id))
        .not.toContain(row.id);
    });
  });

  SINGLE_ROW.forEach((single) => {
    it(`answers the row the fixture carries: ${single.name}`, async () => {
      // Pass-through fidelity, by IDENTITY rather than by value. An
      // undrafted row comes back as the very object the fixture holds
      // — that is `applyDrafts`' own guarantee, and asserting it here
      // is what rules out a seam that rebuilt a plausible twin.
      // Arrange
      const row = firstRowFor(single, DEFAULT_DOMAIN_SLUG);

      // Act
      const answered = await single.read(DEFAULT_DOMAIN_SLUG, row.id);

      // Assert
      expect(answered).toBe(row);
    });
  });

  OVERLAID_SINGLE_ROW.forEach((single) => {
    it(`edits a real field to a value the fixture does not hold: ${single.name}`, () => {
      // The vacuity guard for the two cases below. A `field` the row
      // does not carry, or a `mark` the row already holds, would
      // round-trip through the store and leave both of them passing
      // while asserting nothing at all.
      // Arrange
      const row = firstRowFor(single, DEFAULT_DOMAIN_SLUG);

      // Act
      const before = fieldOf(row, single.field);

      // Assert
      expect(Object.keys(row)).toContain(single.field);
      expect(before).not.toEqual(single.mark);
    });

    it(`answers the drafted row: ${single.name}`, async () => {
      // What the single-row overlay is FOR: a modal loads through this
      // read and saves through the matching write, so a read that
      // skipped the overlay would reopen showing the value its own
      // save had just replaced.
      // Arrange
      const row = firstRowFor(single, DEFAULT_DOMAIN_SLUG);
      const draft = draftOf(row, single.field, single.mark);

      recordDraft(singleScope(single, DEFAULT_DOMAIN_SLUG), draft);

      // Act
      const answered = await single.read(DEFAULT_DOMAIN_SLUG, row.id);

      // Assert
      expect(answered).toEqual(draft);
      expect(fieldOf(answered as DraftableRow, single.field))
        .toEqual(single.mark);
    });

    it(`leaves a row this tab has not edited alone: ${single.name}`, async () => {
      // The other half, and the one a drafted-everything overlay would
      // fail: an edit to ONE row is invisible to the read of another.
      // Skipped where the resource has a single row, since there is no
      // second row for the claim to be about — reported rather than
      // silently passing, which is what the length check is for.
      // Arrange
      const rows = single.storedRows(DEFAULT_DOMAIN_SLUG);
      const edited = rowAt(rows, 0);
      const untouched = rows[1];

      recordDraft(
        singleScope(single, DEFAULT_DOMAIN_SLUG),
        draftOf(edited, single.field, single.mark),
      );

      // Act
      const answered = untouched === undefined
        ? undefined
        : await single.read(DEFAULT_DOMAIN_SLUG, untouched.id);

      // Assert
      expect(rows.length).toBeGreaterThan(1);
      expect(answered).toBe(untouched);
    });
  });

  OVERLAID_SINGLE_ROW.filter((single) => single.scoped).forEach((single) => {
    it(`ignores a draft filed under another domain: ${single.name}`, async () => {
      // The cross-domain claim, made from the side that can still make
      // it. Reading the seeded row under the sparse slug is refused
      // outright by the ownership check above, so the leak this can
      // still ask about is the other direction: an edit recorded under
      // the SPARSE domain's scope for this very id must not reach the
      // seeded domain's read.
      // Arrange
      const row = firstRowFor(single, DEFAULT_DOMAIN_SLUG);

      recordDraft(
        singleScope(single, SPARSE_DOMAIN_SLUG),
        draftOf(row, single.field, single.mark),
      );

      // Act
      const answered = await single.read(DEFAULT_DOMAIN_SLUG, row.id);

      // Assert
      expect(answered).toBe(row);
      expect(fieldOf(answered as DraftableRow, single.field))
        .not.toEqual(single.mark);
    });
  });

  it('answers the stored category whatever the store holds', async () => {
    // The narrowing, driven rather than left as a gap in a table.
    // `categories` is not a draft resource, so there is no scope an
    // edit to a category row could be filed under — and the way to
    // show that is to try every scope there IS. A draft is recorded
    // under each of the seeded domain's row resources, keyed on the
    // category's own id, and the read still answers the stored row by
    // identity. An overlay wired to the wrong resource would answer
    // one of these instead.
    // Arrange
    const domain = getDomain(DEFAULT_DOMAIN_SLUG);
    const category = rowAt(listCategories(domain.id), 0);
    const resources = ['documents', 'findings', 'personas', 'sources'] as const;

    resources.forEach((resource) => recordDraft(
      domainDraftScope(DEFAULT_DOMAIN_SLUG, resource),
      { ...category, name: 'Drafted through the wrong resource' },
    ));

    // Act
    const answered = await api.fetchCategory(DEFAULT_DOMAIN_SLUG, category.id);

    // Assert
    expect(answered).toBe(category);
    expect(answered.name).not.toBe('Drafted through the wrong resource');
  });

  it('agrees with the list read it sits beneath', async () => {
    // The single-row and list reads of one resource are two accessors
    // over one row, and a modal disagreeing with the table behind it
    // is the failure the shared overlay exists to prevent. Read
    // through `fetchSources` rather than through the fixture, so a
    // difference in how the two accessors compose the overlay shows
    // up rather than cancelling out.
    // Arrange
    const stored = rowAt(listSources(getDomain(DEFAULT_DOMAIN_SLUG).id), 0);
    const draft = { ...stored, endpoint: 'https://agreed.example.test/feed' };

    recordDraft(domainDraftScope(DEFAULT_DOMAIN_SLUG, 'sources'), draft);

    // Act
    const listed = await api.fetchSources(DEFAULT_DOMAIN_SLUG);
    const single = await api.fetchSource(DEFAULT_DOMAIN_SLUG, stored.id);

    // Assert
    expect(single).toEqual(draft);
    expect(rowAt(listed, 0)).toBe(single);
  });
});

/**
 * The seeded domain's taxonomy, read fresh each call.
 *
 * Resolved through `listCategories` rather than written as ids, for
 * the reason every other case here reads its rows off the fixture: a
 * taxonomy reordered or reseeded silently turns a hardcoded id into
 * somebody else's category, and the cases would go on passing against
 * a list nobody meant.
 *
 * @returns Its categories, in seed order.
 */
function seededCategories(): readonly Category[] {
  return listCategories(getDomain(DEFAULT_DOMAIN_SLUG).id);
}

/**
 * A term of the seeded domain's first category, and the field an
 * editor really writes.
 *
 * `weight` rather than `pattern`, because a term editor's commonest
 * edit is a magnitude and because no fixture row carries this value —
 * which is the vacuity guard the overlay cases below rest on, asserted
 * in a case of its own rather than assumed.
 */
const TERM_MARK = 41;

describe('fetchTerms', () => {
  it('takes the slug first and the category id second', () => {
    // The structural pin, and the reason this read has a population of
    // its own: it is neither of the two shapes the surface blocks
    // partition the barrel into. A slug-only accessor would be called
    // with one argument by every whole-surface block above, and a
    // single-row read answers a row rather than a list.
    // Arrange / Act / Assert
    expect(api.fetchTerms.length).toBe(2);
    expect(CHILD_LIST_NAMES).toEqual(['fetchTerms']);
    expect(Object.keys(api)).toContain('fetchTerms');
  });

  it('rejects a category id no fixture carries', async () => {
    // The refusal a stale bookmark actually produces, and it comes
    // first because it is the one the editor has to render. The
    // second assertion is what makes it a claim about the CATEGORY
    // rather than about the terms: `listTerms` answers `[]` for this
    // id quite happily, so an accessor that simply wrapped it would
    // resolve here — with an empty editor over a category that does
    // not exist, which reads as vocabulary somebody deleted.
    // Arrange
    const absent = absentIdFor(seededCategories());

    const call = (): void => {
      void api.fetchTerms(DEFAULT_DOMAIN_SLUG, absent).catch(() => undefined);
    };

    // Act / Assert
    expect(listTerms(absent)).toEqual([]);
    expect(call).not.toThrow();
    await expect(api.fetchTerms(DEFAULT_DOMAIN_SLUG, absent)).rejects.toThrow(
      `Unknown category id: ${absent}`,
    );
  });

  it('rejects a category belonging to another domain', async () => {
    // The refusal `./api.ts` adds on top of the fixture accessor, and
    // the leak it exists to stop: `terms` is keyed by `category_id`
    // alone, so this id answers the seeded domain's vocabulary
    // whatever slug stood in the URL. The middle assertion is the
    // vacuity guard — a category whose term list was empty would make
    // this case pass against an accessor that leaked nothing to leak.
    // Compared against the MISSING-category outcome in the same case,
    // because the two being indistinguishable is itself the claim.
    // Arrange
    const category = rowAt(seededCategories(), 0);
    const absent = absentIdFor(seededCategories());

    // Act
    const foreign = await outcomeOf(
      (slug) => api.fetchTerms(slug, category.id),
      SPARSE_DOMAIN_SLUG,
    );
    const missing = await outcomeOf(
      (slug) => api.fetchTerms(slug, absent),
      SPARSE_DOMAIN_SLUG,
    );

    // Assert
    expect(listTerms(category.id)).not.toHaveLength(0);
    expect(foreign).toBe(`rejected: Unknown category id: ${category.id}`);
    expect(foreign.replace(String(category.id), String(absent))).toBe(missing);
  });

  it('rejects an unknown domain slug', async () => {
    // With a real category id, so this must fail on the DOMAIN and
    // cannot be the refusal above wearing a different message.
    // Arrange
    const category = rowAt(seededCategories(), 0);

    // Act
    const outcome = await outcomeOf(
      (slug) => api.fetchTerms(slug, category.id),
      UNKNOWN_SLUG,
    );

    // Assert
    expect(outcome).toBe(REFUSAL);
  });

  it('refuses the domain before the category', async () => {
    // The ORDER of the two refusals, which neither one alone can
    // show. Both arguments are wrong here and the domain is what has
    // to answer — a seam that looked the category up first would
    // report a missing category for a domain that does not exist,
    // which is a 404 about the wrong thing.
    // Arrange
    const absent = absentIdFor(seededCategories());

    // Act
    const outcome = await outcomeOf(
      (slug) => api.fetchTerms(slug, absent),
      UNKNOWN_SLUG,
    );

    // Assert
    expect(outcome).toBe(REFUSAL);
  });

  it('answers nothing for a category that carries no terms', async () => {
    // The empty state a term editor opens on, and NOT the refusal
    // above: a category that exists and has no vocabulary is an
    // ordinary answer. It is also the one case here whose subject the
    // fixture does not carry — `./lexicon.ts` ships a seed in which
    // every bucket has vocabulary and says why — so the claim is made
    // in the two halves that are reachable. The loop covers every
    // empty category there is, and the last assertion is what keeps
    // its running zero times a documented property of the fixture
    // rather than a case nobody noticed was vacuous: the day a
    // category ships empty, that assertion reddens and this loop
    // covers it with no edit. The composition case below is what
    // carries the claim in the meantime.
    // Arrange
    const categories = seededCategories();
    const empty = categories.filter(
      (category) => listTerms(category.id).length === 0,
    );

    // Act
    const answers = await Promise.all(empty.map(async (category) => ({
      id: category.id,
      answered: await api.fetchTerms(DEFAULT_DOMAIN_SLUG, category.id),
    })));

    // Assert
    expect(categories).not.toHaveLength(0);
    expect(answers.filter((entry) => entry.answered.length > 0)).toEqual([]);
    expect(empty).toEqual([]);
  });

  it('answers exactly what the fixture lists, category by category', async () => {
    // The composition claim, and what makes the empty answer above
    // follow rather than needing a fixture nobody has: this accessor
    // is `listTerms` behind an ownership check and an overlay, so
    // whatever `listTerms` answers for a category is what this
    // answers — including the `[]` it gives a category with no rows,
    // which `./lexicon.test.ts` pins directly.
    //
    // Identity rather than equality on the rows, which is strictly
    // more: `applyDrafts` hands undrafted rows back as the very
    // objects it was given, so an accessor that rebuilt a plausible
    // twin satisfies `toEqual` and fails here.
    // Arrange
    const categories = seededCategories();

    // Act
    const answers = await Promise.all(categories.map(async (category) => ({
      id: category.id,
      answered: await api.fetchTerms(DEFAULT_DOMAIN_SLUG, category.id),
      stored: listTerms(category.id),
    })));

    // Assert
    expect(answers).toHaveLength(categories.length);
    answers.forEach((entry) => {
      expect(entry.answered).toEqual(entry.stored);
      expect(entry.answered.map((term, index) => term === entry.stored[index]))
        .toEqual(entry.stored.map(() => true));
    });
    expect(answers.filter((entry) => entry.stored.length === 0)).toEqual([]);
  });

  it('answers one category\'s terms and no other category\'s', async () => {
    // The near-miss the equality above cannot catch on its own: an
    // accessor that ignored its id and answered the whole domain's
    // vocabulary would disagree with `listTerms` per category — but
    // one that answered the FIRST category every time would agree
    // with `listTerms(first)` and be wrong for the rest. So the claim
    // is made on the rows themselves, which each name the category
    // they hang off.
    // Arrange
    const categories = seededCategories();

    // Act
    const answers = await Promise.all(categories.map(async (category) => ({
      id: category.id,
      strays: (await api.fetchTerms(DEFAULT_DOMAIN_SLUG, category.id))
        .filter((term) => term.categoryId !== category.id),
    })));

    // Assert
    expect(categories.length).toBeGreaterThan(1);
    expect(answers.filter((entry) => entry.strays.length > 0)).toEqual([]);
  });

  it('edits a weight to a value no fixture term holds', () => {
    // The vacuity guard for the three overlay cases below. A mark the
    // stored row already carried would round-trip through the store
    // perfectly and leave all three passing while proving nothing.
    // Arrange / Act
    const holders = TERMS.filter((term) => term.weight === TERM_MARK);

    // Assert
    expect(holders).toEqual([]);
    expect(Object.keys(rowAt(TERMS, 0))).toContain('weight');
  });

  it('answers the drafted term', async () => {
    // What this read landing closes: `saveCategoryTerms` has been
    // recording under `terms` since it landed, with no read to show
    // it. A term editor that reopened on the value its own save had
    // just replaced is the failure the shared scope prevents.
    // Arrange
    const category = rowAt(seededCategories(), 0);
    const stored = listTerms(category.id);
    const target = rowAt(stored, 0);
    const draft = { ...target, weight: TERM_MARK };

    recordDraft(domainDraftScope(DEFAULT_DOMAIN_SLUG, 'terms'), draft);

    // Act
    const answered = await api.fetchTerms(DEFAULT_DOMAIN_SLUG, category.id);

    // Assert
    expect(answered.filter((term) => term.id === target.id)).toEqual([draft]);
    expect(rowAt(answered, 0).weight).toBe(TERM_MARK);
  });

  it('leaves every unedited term identical to the fixture', async () => {
    // Membership and order are the fixture's, and exactly one row is
    // not the fixture's own object — the never-grows, never-reorders
    // half of `applyDrafts`' guarantee, read through the accessor.
    // Arrange
    const category = rowAt(seededCategories(), 0);
    const stored = listTerms(category.id);
    const target = rowAt(stored, 0);

    recordDraft(
      domainDraftScope(DEFAULT_DOMAIN_SLUG, 'terms'),
      { ...target, weight: TERM_MARK },
    );

    // Act
    const answered = await api.fetchTerms(DEFAULT_DOMAIN_SLUG, category.id);
    const compared = answered.map((term, index) => ({
      id: term.id,
      identical: term === stored[index],
    }));

    // Assert
    expect(stored.length).toBeGreaterThan(1);
    expect(answered.map((term) => term.id)).toEqual(stored.map((t) => t.id));
    expect(compared.filter((entry) => !entry.identical)).toEqual([
      { id: target.id, identical: false },
    ]);
  });

  it('ignores a draft filed under another domain', async () => {
    // The cross-domain guard, made from the side that can still make
    // it. Reading a seeded category under the sparse slug is refused
    // outright by the ownership check above, so the leak left to ask
    // about is the other direction: an edit recorded under the SPARSE
    // domain's scope for this very term must not reach the seeded
    // read.
    //
    // Its LIMIT, which the file records elsewhere and which holds
    // here: only one fixture domain carries rows, so a scope
    // hardcoded to the SEEDED slug stays green through this. Closing
    // that leg needs a second populated domain, not another
    // assertion — and the write side, where the store files whatever
    // scope it is handed, is where the claim is fully testable.
    // Arrange
    const category = rowAt(seededCategories(), 0);
    const stored = listTerms(category.id);
    const target = rowAt(stored, 0);

    recordDraft(
      domainDraftScope(SPARSE_DOMAIN_SLUG, 'terms'),
      { ...target, weight: TERM_MARK },
    );

    // Act
    const answered = await api.fetchTerms(DEFAULT_DOMAIN_SLUG, category.id);

    // Assert
    expect(answered).toEqual(stored);
    expect(rowAt(answered, 0)).toBe(target);
  });

  it('shows what the matching write recorded', async () => {
    // The two halves of the seam over one resource, end to end and
    // through the barrel rather than through the store: a save an
    // editor believes it made is visible to the read that would
    // display it, on the very next call. Driven through
    // `saveCategoryTerms` so a write filing under the wrong resource
    // is reported here rather than by a store test that files it
    // itself.
    // Arrange
    const category = rowAt(seededCategories(), 0);
    const stored = listTerms(category.id);
    const edited = stored.map((term) => ({ ...term, weight: TERM_MARK }));

    // Act
    await api.saveCategoryTerms(DEFAULT_DOMAIN_SLUG, edited);
    const answered = await api.fetchTerms(DEFAULT_DOMAIN_SLUG, category.id);

    // Assert
    expect(answered).toEqual(edited);
    expect(answered.map((term) => term.weight))
      .toEqual(stored.map(() => TERM_MARK));
  });
});

/**
 * The seeded domain's first taxonomy category's terms.
 *
 * Resolved through `listCategories` rather than written as a category
 * id, for the reason every other case here reads its rows off the
 * fixture: a taxonomy reordered or reseeded silently turns a hardcoded
 * id into somebody else's category, and the write would go on passing
 * against a list nobody meant.
 *
 * @param slug - Which domain's taxonomy to read.
 * @returns Its first category's terms, or `[]` for a domain with no
 * taxonomy at all.
 */
function firstCategoryTerms(slug: string): readonly Term[] {
  const [first] = listCategories(getDomain(slug).id);

  return first === undefined
    ? []
    : listTerms(first.id);
}

/**
 * A stand-in proposal row, for the one write whose resource no fixture
 * module answers for yet.
 *
 * `./proposals.ts` arrives with the modal that rules on these, so
 * there is nothing to read a real row off. That makes the
 * {@link api.approveSourceConfig} cases weaker than the rest in one
 * specific way, worth stating rather than hiding behind a uniform
 * table: the vacuity guard every other case gets — the field is one
 * the STORED row carries — cannot be made here, because this object is
 * the only row there is. What the cases still prove is the half that
 * does not need a fixture: which scope the write files under, that it
 * refuses an unknown slug before recording, and that a row nothing
 * carries is recorded rather than dropped.
 */
const SYNTHETIC_PROPOSAL = { id: 1, status: 'pending' };

/**
 * The writes that take no domain slug, written out rather than derived
 * from {@link WRITES}.
 *
 * Derived, a write that lost its slug would move into this list on its
 * own and the arity claim would re-read itself as satisfied. Written
 * out, the same mistake leaves the arity split disagreeing with the
 * table and the test names it. Both names are here for the reason
 * `./api.ts` gives their reads: `connectors` carries no `domain_id`,
 * and `Settings` mirrors no table at all.
 */
const UNSCOPED_WRITE_NAMES: readonly string[] = [
  'saveConnector',
  'saveSettings',
];

/**
 * One write accessor, with everything a case needs to drive it without
 * knowing which one it is holding.
 *
 * `field` and `mark` do the same work they do for the overlay cases:
 * an edit is only evidence if it names a field the surface's editor
 * really writes and a value the fixture does not already hold, and
 * both are claims the first case below MAKES rather than assumes.
 */
interface WriteCase {
  /** Its exported name, for the coverage check and the titles. */
  readonly name: string;
  /** Whether it takes a resolved domain slug as its first argument. */
  readonly scoped: boolean;
  /** The draft resource its edit must be filed under. */
  readonly resource: string;
  /** Where that edit must be filed, for a given slug. */
  readonly scopeFor: (slug: string) => DraftScope;
  /**
   * The rows the fixture layer carries for that resource, or null
   * where no fixture module answers for it yet — see
   * {@link SYNTHETIC_PROPOSAL}.
   */
  readonly storedRows: ((slug: string) => readonly DraftableRow[]) | null;
  /** Save these rows through the accessor under test. */
  readonly save: (
    slug: string,
    rows: readonly DraftableRow[],
  ) => Promise<void>;
  /** A field the surface's editor really writes. */
  readonly field: string;
  /** What to write into it. Never a value the fixture already holds. */
  readonly mark: unknown;
}

/**
 * Every write that records ROWS.
 *
 * {@link api.saveSettings} is deliberately absent and has a block of
 * its own: it records a singleton, so it has no row, no id and no
 * scope, and not one of the row-shaped claims below can be made about
 * it. The coverage test names both populations so that absence is a
 * decision on the record rather than a write nobody wired up.
 *
 * The casts on `save` are the same bargain the overlay table makes for
 * `rowsIn`: one table over eight unrelated row shapes, with the type
 * each accessor actually declares reasserted at the boundary. They
 * cost nothing that matters here — a case handing the wrong SHAPE
 * still fails, because the field it then asserts on is not the one the
 * row carries.
 */
const WRITES: readonly WriteCase[] = [
  {
    name: 'saveCategoryTerms',
    scoped: true,
    resource: 'terms',
    scopeFor: (slug) => domainDraftScope(slug, 'terms'),
    storedRows: (slug) => firstCategoryTerms(slug),
    save: (slug, rows) => api.saveCategoryTerms(slug, rows as readonly Term[]),
    field: 'weight',
    mark: 97,
  },
  {
    name: 'saveFinding',
    scoped: true,
    resource: 'findings',
    scopeFor: (slug) => domainDraftScope(slug, 'findings'),
    storedRows: (slug) => listFindings(getDomain(slug).id),
    save: (slug, rows) => api.saveFinding(slug, rowAt(rows, 0) as Finding),
    // The digest row action's own edit.
    field: 'verdict',
    mark: 'drafted-verdict',
  },
  {
    name: 'saveSource',
    scoped: true,
    resource: 'sources',
    scopeFor: (slug) => domainDraftScope(slug, 'sources'),
    storedRows: (slug) => listSources(getDomain(slug).id),
    save: (slug, rows) => api.saveSource(slug, rowAt(rows, 0) as Source),
    field: 'endpoint',
    mark: 'https://saved.example.test/feed',
  },
  {
    name: 'approveSourceConfig',
    scoped: true,
    resource: 'source-proposals',
    scopeFor: (slug) => domainDraftScope(slug, 'source-proposals'),
    // The one case with no fixture behind it — see the constant.
    storedRows: null,
    save: (slug, rows) => api.approveSourceConfig(slug, rowAt(rows, 0)),
    field: 'status',
    mark: 'approved',
  },
  {
    name: 'resolveSourceFailure',
    scoped: true,
    resource: 'documents',
    scopeFor: (slug) => domainDraftScope(slug, 'documents'),
    storedRows: (slug) => listDocuments(getDomain(slug).id),
    save: (slug, rows) => api.resolveSourceFailure(
      slug,
      rowAt(rows, 0) as Document,
    ),
    field: 'parseError',
    mark: 'resolved by the operator',
  },
  {
    name: 'savePersona',
    scoped: true,
    resource: 'personas',
    scopeFor: (slug) => domainDraftScope(slug, 'personas'),
    storedRows: (slug) => listPersonas(getDomain(slug).id),
    save: (slug, rows) => api.savePersona(slug, rowAt(rows, 0) as Persona),
    field: 'systemText',
    mark: 'Saved system text.',
  },
  {
    name: 'saveConnector',
    scoped: false,
    resource: 'connectors',
    // The one deployment-scoped write, so its scope ignores the slug —
    // which is why the cross-domain block below cannot ask anything of
    // it, and says so rather than exempting it silently.
    scopeFor: () => deploymentDraftScope('connectors'),
    storedRows: () => listConnectors(),
    save: (_slug, rows) => api.saveConnector(rowAt(rows, 0) as Connector),
    field: 'name',
    mark: 'saved-connector',
  },
  {
    name: 'saveExportSubscriptions',
    scoped: true,
    resource: 'export-subscriptions',
    scopeFor: (slug) => domainDraftScope(slug, 'export-subscriptions'),
    storedRows: (slug) => listExportSubscriptions(getDomain(slug).id),
    save: (slug, rows) => api.saveExportSubscriptions(
      slug,
      rows as readonly ExportSubscription[],
    ),
    field: 'intervalSeconds',
    mark: 123_456,
  },
];

/** The writes a second domain's scope can be asked about. */
const SCOPED_WRITES = WRITES.filter((write) => write.scoped);

/** The writes whose rows a fixture module really answers for. */
const FIXTURE_BACKED_WRITES = WRITES.filter(
  (write) => write.storedRows !== null,
);

/**
 * The rows one case edits — the fixture's, or the stand-in where no
 * fixture answers for that resource yet.
 *
 * @param write - The case.
 * @param slug - Which domain's rows.
 * @returns Its rows, never empty for the fixture-backed cases (the
 * vacuity guard below is what says so).
 */
function rowsFor(write: WriteCase, slug: string): readonly DraftableRow[] {
  return write.storedRows === null
    ? [SYNTHETIC_PROPOSAL]
    : write.storedRows(slug);
}

/**
 * An id no row in this list carries, derived rather than written.
 *
 * A hardcoded 9999 becomes a real id the day a fixture grows past it,
 * and the case that depends on the row being absent then quietly
 * asserts its opposite.
 *
 * @param rows - The rows the id must avoid.
 * @returns One greater than the largest.
 */
function absentIdFor(rows: readonly DraftableRow[]): number {
  return Math.max(...rows.map((row) => row.id)) + 1;
}

describe('the write half', () => {
  it('drives every write the module exports', () => {
    // The guard every claim below rests on. The cases are written over
    // `WRITES`, so a write added to `./api.ts` and to no table would be
    // covered by nothing and reported by nothing — and `saveSettings`
    // is named here rather than left out, so its absence from the row
    // table reads as the decision it is.
    // Arrange
    const covered = [
      ...WRITES.map((write) => write.name),
      'saveSettings',
    ].sort();

    // Act
    const declared = [...WRITE_NAMES].sort();

    // Assert
    expect(covered).toEqual(declared);
    expect(WRITES).toHaveLength(8);
  });

  it('names each written resource once', () => {
    // The near-miss the set comparison cannot catch: two cases filed
    // under one resource would cover that resource twice and leave
    // another write filing under a scope no case ever builds.
    // Arrange
    const named = WRITES.map((write) => write.resource);

    // Act
    const duplicated = named.filter(
      (resource, index) => named.indexOf(resource) !== index,
    );

    // Assert
    expect(duplicated).toEqual([]);
  });

  it('takes the slug first and the payload second', () => {
    // Structural pin on the call shape `./hooks.ts` wraps. A write
    // that grew a third argument — a category id beside the terms that
    // already name one, say — would be a second place to get the same
    // answer, and the two could disagree. Read off the module rather
    // than off the table's closures, which would only report their own
    // arity.
    // Arrange
    const written = EXPORTED_ENTRIES.filter(
      ([name]) => WRITE_NAMES.includes(name),
    );

    // Act
    const arities = written.map(([name, accessor]) => ({
      name,
      arity: (accessor as (...args: never[]) => unknown).length,
      expected: UNSCOPED_WRITE_NAMES.includes(name)
        ? 1
        : 2,
    }));

    // Assert
    expect(arities).toHaveLength(WRITE_NAMES.length);
    expect(arities.filter((entry) => entry.arity !== entry.expected))
      .toEqual([]);
  });

  it('agrees with the write table about which writes take a slug', () => {
    // The two lists are built differently on purpose — one literal,
    // one flag per case — so this is what stops the arity claim above
    // from being satisfied by a list that simply matches whatever the
    // table says.
    // Arrange / Act
    const unscoped = WRITES
      .filter((write) => !write.scoped)
      .map((write) => write.name);

    // Assert
    expect(unscoped).toEqual(['saveConnector']);
    expect(UNSCOPED_WRITE_NAMES).toEqual(['saveConnector', 'saveSettings']);
  });

  FIXTURE_BACKED_WRITES.forEach((write) => {
    it(`edits a real field to a value the fixture does not hold: ${write.name}`, () => {
      // The vacuity guard for every case that follows. A `field` the
      // row does not carry, or a `mark` equal to what it already
      // holds, both round-trip through the store perfectly and make
      // the assertions below pass while proving nothing about the
      // surface that is supposed to write them. Made only over the
      // fixture-backed cases — the proposal stand-in is its own row,
      // so there is nothing independent to check it against.
      // Arrange
      const stored = rowsFor(write, DEFAULT_DOMAIN_SLUG);

      // Act
      const target = rowAt(stored, 0);

      // Assert
      expect(stored.length).toBeGreaterThan(1);
      expect(Object.keys(target)).toContain(write.field);
      expect(fieldOf(target, write.field)).not.toBe(write.mark);
    });
  });

  WRITES.forEach((write) => {
    it(`records the edit under the scope its read overlays: ${write.name}`, async () => {
      // The whole point of the write half. The claim is deliberately
      // made at the SCOPE rather than through the matching read: two
      // of these resources have no read yet, so a read-side assertion
      // could not cover them uniformly — and the thing that can go
      // wrong is which scope the edit lands in, which is what this
      // asks directly.
      // Arrange
      const stored = rowsFor(write, DEFAULT_DOMAIN_SLUG);
      const target = rowAt(stored, 0);
      const draft = draftOf(target, write.field, write.mark);

      // Act
      await write.save(DEFAULT_DOMAIN_SLUG, [draft]);

      const applied = applyDrafts(
        write.scopeFor(DEFAULT_DOMAIN_SLUG),
        [target],
      );

      // Assert
      expect(applied).toEqual([draft]);
      expect(fieldOf(rowAt(applied, 0), write.field)).toBe(write.mark);
      expect(rowAt(applied, 0)).not.toBe(draft);
    });

    it(`records a row no fixture carries and disturbs nothing: ${write.name}`, async () => {
      // A save against a row that has gone — a modal left open while
      // the fixtures moved, or an id from another deployment. The
      // store does not know which ids exist and deliberately does not
      // check, so the write RESOLVES and the edit is filed where it
      // will simply never be reached. Both halves are asserted: the
      // stored rows come back untouched by identity, and the edit is
      // genuinely in the store rather than silently dropped, which is
      // the difference between a recorded no-op and a write that
      // failed without saying so.
      // Arrange
      const stored = rowsFor(write, DEFAULT_DOMAIN_SLUG);
      const absentId = absentIdFor(stored);
      const draft = {
        ...draftOf(rowAt(stored, 0), write.field, write.mark),
        id: absentId,
      };
      const scope = write.scopeFor(DEFAULT_DOMAIN_SLUG);

      // Act
      await write.save(DEFAULT_DOMAIN_SLUG, [draft]);

      // Assert
      expect(applyDrafts(scope, stored)).toEqual(stored);
      expect(
        applyDrafts(scope, stored).filter((row, index) => row !== stored[index]),
      ).toEqual([]);
      expect(applyDrafts(scope, [{ id: absentId }])).toEqual([draft]);
    });
  });

  SCOPED_WRITES.forEach((write) => {
    it(`refuses an unknown slug by rejecting, not throwing: ${write.name}`, async () => {
      // The seam's `async` doing for a write what it does for a read.
      // A mutation hook can render a rejected promise as an error
      // state beside the editor; an exception thrown before the caller
      // ever held a promise reaches the render and takes the shell
      // down with the modal.
      // Arrange
      const rows = [rowAt(rowsFor(write, DEFAULT_DOMAIN_SLUG), 0)];
      const call = (): void => {
        void write.save(UNKNOWN_SLUG, rows).catch(() => undefined);
      };

      // Act / Assert
      expect(call).not.toThrow();
      await expect(write.save(UNKNOWN_SLUG, rows)).rejects.toThrow(
        `Unknown domain slug: ${UNKNOWN_SLUG}`,
      );
    });

    it(`records nothing when it refuses an unknown slug: ${write.name}`, async () => {
      // Why `recordForDomain` builds its scope outside the callback
      // but records INSIDE it. A save that filed the edit and then
      // refused the domain would leave the store holding an edit for a
      // page nothing can render and no gesture can discard — a leak
      // the reads could never report, since they reject that slug too.
      // Arrange
      const stored = rowsFor(write, DEFAULT_DOMAIN_SLUG);
      const target = rowAt(stored, 0);
      const draft = draftOf(target, write.field, write.mark);

      // Act
      await write.save(UNKNOWN_SLUG, [draft]).catch(() => undefined);

      // Assert
      expect(applyDrafts(write.scopeFor(UNKNOWN_SLUG), [target]))
        .toEqual([target]);
      expect(applyDrafts(write.scopeFor(DEFAULT_DOMAIN_SLUG), [target]))
        .toEqual([target]);
    });

    it(`files the edit under the slug it was handed: ${write.name}`, async () => {
      // The cross-domain guard from the WRITE side, and the one place
      // this package can make it without reservation. Read-side, the
      // same claim is half-vacuous — only one fixture domain carries
      // rows, so a read of the other overlays an empty list whatever
      // scope it built, and an accessor hardcoded to the SEEDED slug
      // stays green. The store has no such blind spot: it holds
      // whatever it is given under whatever scope it is given, so a
      // hardcoded slug here shows up as the edit landing in the wrong
      // one whichever domain was seeded.
      // Arrange
      const stored = rowsFor(write, DEFAULT_DOMAIN_SLUG);
      const target = rowAt(stored, 0);
      const draft = draftOf(target, write.field, write.mark);

      // Act
      await write.save(SPARSE_DOMAIN_SLUG, [draft]);

      // Assert
      expect(applyDrafts(write.scopeFor(SPARSE_DOMAIN_SLUG), [target]))
        .toEqual([draft]);
      expect(applyDrafts(write.scopeFor(DEFAULT_DOMAIN_SLUG), [target]))
        .toEqual([target]);
    });
  });

  it('leaves the fixture rows themselves untouched', async () => {
    // The immutability claim, over the whole write table at once: a
    // save records a COPY, so the frozen fixture arrays every other
    // reader shares are still exactly what they were. An accessor that
    // wrote through to the stored row would pass every case above —
    // the overlay would answer the edit either way — and would change
    // what a reload is supposed to undo.
    // Arrange
    const before = WRITES.map((write) => ({
      name: write.name,
      rows: JSON.stringify(rowsFor(write, DEFAULT_DOMAIN_SLUG)),
    }));

    // Act
    await Promise.all(WRITES.map(async (write) => {
      const stored = rowsFor(write, DEFAULT_DOMAIN_SLUG);

      await write.save(
        DEFAULT_DOMAIN_SLUG,
        [draftOf(rowAt(stored, 0), write.field, write.mark)],
      );
    }));

    // Assert
    expect(WRITES.map((write) => ({
      name: write.name,
      rows: JSON.stringify(rowsFor(write, DEFAULT_DOMAIN_SLUG)),
    }))).toEqual(before);
  });
});

describe('saveSettings', () => {
  /**
   * The preference set with one member changed to a value the fixture
   * does not hold.
   *
   * Built per case rather than shared, because a module-scope constant
   * here would be the very object the store copies and the identity
   * assertions below would be comparing it against itself.
   *
   * @returns The edited settings.
   */
  const edited = (): Settings => ({
    ...SETTINGS,
    defaultDomainSlug: SPARSE_DOMAIN_SLUG,
  });

  it('edits a member the fixture does not already hold', () => {
    // The vacuity guard the cases below need, in the shape the row
    // writes get theirs: a mark equal to the stored value round-trips
    // perfectly and proves nothing.
    // Arrange / Act / Assert
    expect(SETTINGS.defaultDomainSlug).toBe(DEFAULT_DOMAIN_SLUG);
    expect(edited().defaultDomainSlug).not.toBe(SETTINGS.defaultDomainSlug);
  });

  it('records the whole preference set', async () => {
    // The singleton write's own claim, made at the store the way the
    // row writes make theirs: `Settings` carries no id, so there is no
    // scope to build and the resource IS the key.
    // Arrange
    const saved = edited();

    // Act
    await api.saveSettings(saved);

    // Assert
    expect(applySingletonDraft('settings', SETTINGS)).toEqual(saved);
  });

  it('is answered by the read that renders it', async () => {
    // The end-to-end pair, and the one this file has to make itself:
    // the settings overlay landed with this write, and `fetchSettings`
    // is the only read that composes it. A save no read shows is worse
    // than no save at all.
    // Arrange
    const saved = edited();

    // Act
    await api.saveSettings(saved);

    // Assert
    await expect(api.fetchSettings()).resolves.toEqual(saved);
  });

  it('hands the fixture itself back when nothing has been saved', async () => {
    // Identity, not equality, and the property the overlay had to be
    // written not to break: `./settings.ts` hands every reader one
    // frozen object on purpose, and an overlay that copied on the way
    // past would quietly hand out an unfrozen twin a caller could
    // toggle in place.
    // Arrange / Act / Assert
    await expect(api.fetchSettings()).resolves.toBe(SETTINGS);
  });

  it('leaves the fixture standing after a save', async () => {
    // What a reload is supposed to undo. The store holds a copy, so
    // the shared frozen fixture is still the deployment's answer for
    // every reader that has not been shown this tab's edit.
    // Arrange
    const before = { ...SETTINGS };

    // Act
    await api.saveSettings(edited());

    // Assert
    expect(SETTINGS).toEqual(before);
    expect(SETTINGS.defaultDomainSlug).toBe(DEFAULT_DOMAIN_SLUG);
  });

  it('resolves on a microtask like every other accessor', async () => {
    // The same pin the reads carry, made over a write: under fake
    // timers nothing advances the clock, so a save that grew an
    // artificial delay would never settle and this would time out
    // rather than slow down.
    // Arrange
    vi.useFakeTimers();

    try {
      // Act / Assert
      await expect(api.saveSettings(edited())).resolves.toBeUndefined();
      await expect(api.fetchSettings()).resolves.toEqual(edited());
    } finally {
      vi.useRealTimers();
    }
  });
});
