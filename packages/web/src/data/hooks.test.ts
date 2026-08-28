import type { DeploymentResource, DomainResource } from './hooks';

import { describe, expect, it, vi } from 'vitest';

import { repeated } from '../test-support/repeated';

import * as api from './api';
import { DEFAULT_DOMAIN_SLUG, DOMAINS, SPARSE_DOMAIN_SLUG } from './domains';
import * as hooks from './hooks';

// `useCache` is replaced by a recorder rather than exercised, and that
// is what lets this file assert what the hooks DO without a renderer.
// Each hook here is one call and one return, so calling it as a plain
// function outside React reaches the same three arguments a render
// would — the key, the fetcher and the options — and the node unit
// environment never has to grow a DOM. The real hook is covered by
// `@ar/ui`'s own suite; what is unproven anywhere else is that THIS
// module hands it the right key and the right accessor.
//
// The factory is hoisted above the imports above, so it may not close
// over anything declared in this file.
vi.mock('@ar/ui/cache', () => ({
  useCache: (
    key: string[],
    fetcher: () => Promise<unknown>,
    options: unknown,
  ): unknown => ({ key, fetcher, options }),
}));

const {
  DEPLOYMENT_SCOPE,
  READ_OPTIONS,
  deploymentQueryKey,
  domainQueryKey,
} = hooks;

/** What the recorder above hands back in place of a cache read. */
interface RecordedRead {
  readonly key: string[];
  readonly fetcher: () => Promise<unknown>;
  readonly options: unknown;
}

/**
 * Read a hook's return value as the recorder's payload.
 *
 * The cast is confined to this one function so the tests below read as
 * claims rather than as casts, and so a hook that stopped going
 * through `useCache` at all would fail on the missing members here
 * rather than silently satisfy a looser assertion.
 */
function recorded(value: unknown): RecordedRead {
  return value as RecordedRead;
}

/**
 * Every domain-scoped resource, as a record over the union.
 *
 * Both directions are compiler errors: a member ADDED to
 * `DomainResource` is a missing key here, and a member REMOVED is an
 * excess property. A plain `readonly DomainResource[]` would catch
 * only the second, and a bare `string[]` neither — the table below
 * would keep passing over a resource nothing files anything under.
 */
const DOMAIN_RESOURCE_GUARD: Readonly<Record<DomainResource, true>> = {
  'category-summaries': true,
  documents: true,
  domain: true,
  'export-subscriptions': true,
  findings: true,
  personas: true,
  'source-status-counts': true,
  sources: true,
  verdicts: true,
};

const DOMAIN_RESOURCES = Object.keys(
  DOMAIN_RESOURCE_GUARD,
) as readonly DomainResource[];

/** The same guard for the deployment-level half of the key space. */
const DEPLOYMENT_RESOURCE_GUARD: Readonly<Record<DeploymentResource, true>> = {
  connectors: true,
  domains: true,
  notifications: true,
  operator: true,
  'search-suggestions': true,
  settings: true,
  'spend-summary': true,
};

const DEPLOYMENT_RESOURCES = Object.keys(
  DEPLOYMENT_RESOURCE_GUARD,
) as readonly DeploymentResource[];

/** Every fixture domain's slug, which is every key prefix in use. */
const SLUGS = DOMAINS.map((domain) => domain.slug);

/**
 * One domain-scoped hook, paired with the key it must file under and
 * the accessor it must read through.
 *
 * `reads` holds the exported accessor ITSELF, so the fetcher check
 * below compares against `./api.ts` rather than against a fixture this
 * file went and read on its own — which would pass for a hook wired to
 * the wrong accessor whenever two accessors happen to agree.
 */
interface DomainHookCase {
  /** Its exported name, for the completeness check and test titles. */
  readonly name: string;
  /** The second key segment it must use. */
  readonly resource: DomainResource;
  /** The hook under test. */
  readonly hook: (domainSlug?: string | null) => unknown;
  /** The accessor its fetcher must call. */
  readonly reads: (slug: string) => Promise<unknown>;
}

const DOMAIN_HOOKS: readonly DomainHookCase[] = [
  {
    name: 'useDomain',
    resource: 'domain',
    hook: hooks.useDomain,
    reads: api.fetchDomain,
  },
  {
    name: 'useVerdicts',
    resource: 'verdicts',
    hook: hooks.useVerdicts,
    reads: api.fetchVerdicts,
  },
  {
    name: 'useDocuments',
    resource: 'documents',
    hook: hooks.useDocuments,
    reads: api.fetchDocuments,
  },
  {
    name: 'useFindings',
    resource: 'findings',
    hook: hooks.useFindings,
    reads: api.fetchFindings,
  },
  {
    name: 'useCategorySummaries',
    resource: 'category-summaries',
    hook: hooks.useCategorySummaries,
    reads: api.fetchCategorySummaries,
  },
  {
    name: 'useSources',
    resource: 'sources',
    hook: hooks.useSources,
    reads: api.fetchSources,
  },
  {
    name: 'useSourceStatusCounts',
    resource: 'source-status-counts',
    hook: hooks.useSourceStatusCounts,
    reads: api.fetchSourceStatusCounts,
  },
  {
    name: 'usePersonas',
    resource: 'personas',
    hook: hooks.usePersonas,
    reads: api.fetchPersonas,
  },
  {
    name: 'useExportSubscriptions',
    resource: 'export-subscriptions',
    hook: hooks.useExportSubscriptions,
    reads: api.fetchExportSubscriptions,
  },
];

/** The same pairing for the hooks that take no domain. */
interface DeploymentHookCase {
  readonly name: string;
  readonly resource: DeploymentResource;
  readonly hook: () => unknown;
  readonly reads: () => Promise<unknown>;
}

const DEPLOYMENT_HOOKS: readonly DeploymentHookCase[] = [
  {
    name: 'useDomains',
    resource: 'domains',
    hook: hooks.useDomains,
    reads: api.fetchDomains,
  },
  {
    name: 'useConnectors',
    resource: 'connectors',
    hook: hooks.useConnectors,
    reads: api.fetchConnectors,
  },
  {
    name: 'useSettings',
    resource: 'settings',
    hook: hooks.useSettings,
    reads: api.fetchSettings,
  },
  {
    name: 'useSpendSummary',
    resource: 'spend-summary',
    hook: hooks.useSpendSummary,
    reads: api.fetchSpendSummary,
  },
  {
    name: 'useSearchSuggestions',
    resource: 'search-suggestions',
    hook: hooks.useSearchSuggestions,
    reads: api.fetchSearchSuggestions,
  },
  {
    name: 'useNotifications',
    resource: 'notifications',
    hook: hooks.useNotifications,
    reads: api.fetchNotifications,
  },
  {
    name: 'useOperator',
    resource: 'operator',
    hook: hooks.useOperator,
    reads: api.fetchOperator,
  },
];

/** Everything this module exports that is not a hook. */
const KEY_LAYER = [
  'DEPLOYMENT_SCOPE',
  'READ_OPTIONS',
  'deploymentQueryKey',
  'domainQueryKey',
];

describe('the key builders', () => {
  it('covers a non-empty table on both sides', () => {
    // The guard every whole-table claim below rests on. All three
    // tables are derived — the resources off their own unions, the
    // slugs off `DOMAINS` — so emptying any one of them would satisfy
    // the distinctness, prefix and shape assertions at once and this
    // is the only case that reddens.
    // Arrange / Act / Assert
    expect(SLUGS).not.toHaveLength(0);
    expect(DOMAIN_RESOURCES).not.toHaveLength(0);
    expect(DEPLOYMENT_RESOURCES).not.toHaveLength(0);
  });

  it('files a domain-scoped read under the slug and the resource', () => {
    // The whole shape in one claim, compared against a LITERAL pair
    // rather than against anything the module built, so a swapped
    // order or a third segment fails here.
    // Arrange
    const built = SLUGS.flatMap((slug) => DOMAIN_RESOURCES.map((resource) => ({
      actual: domainQueryKey(slug, resource),
      expected: [slug, resource],
    })));

    // Act
    const wrong = built.filter(
      (pair) => JSON.stringify(pair.actual) !== JSON.stringify(pair.expected),
    );

    // Assert
    expect(wrong).toEqual([]);
  });

  it('prefixes a domain-scoped key with the active domain slug', () => {
    // Stated on its own, because it is the property the rest of the
    // app leans on: the slug FIRST is what makes a domain switch a
    // different cache entry rather than the same one answering with
    // the previous domain's rows. `slice` rather than `[0]` because
    // `noUncheckedIndexedAccess` types the index as possibly absent.
    // Arrange
    const keys = SLUGS.flatMap((slug) => DOMAIN_RESOURCES.map((resource) => ({
      slug,
      prefix: domainQueryKey(slug, resource).slice(0, 1),
    })));

    // Act
    const misfiled = keys.filter(
      (entry) => JSON.stringify(entry.prefix) !== JSON.stringify([entry.slug]),
    );

    // Assert
    expect(misfiled).toEqual([]);
  });

  it('answers one key for every spelling of the default domain', () => {
    // The reason the builder resolves rather than taking a resolved
    // slug: `/` supplies no `:domainSlug` at all and
    // `/d/example-tech-radar` supplies it explicitly, and both mean
    // the same domain. Without this the two bases would keep two
    // cache entries holding identical rows, and a switch between them
    // would show a loading state for data already in memory.
    // Arrange
    const explicit = DOMAIN_RESOURCES.map(
      (resource) => domainQueryKey(DEFAULT_DOMAIN_SLUG, resource),
    );

    // Act
    const absent = DOMAIN_RESOURCES.map((resource) => [
      domainQueryKey(undefined, resource),
      domainQueryKey(null, resource),
      domainQueryKey('', resource),
    ]);

    // Assert
    absent.forEach((spellings, index) => {
      spellings.forEach((key) => {
        expect(key).toEqual(explicit[index]);
      });
    });
  });

  it('answers a different key per domain', () => {
    // The near-miss the spellings test cannot catch on its own: a
    // builder that resolved EVERY slug to the default one would agree
    // there and collapse the two domains onto one cache entry here.
    // Arrange / Act
    const collisions = DOMAIN_RESOURCES.filter((resource) => (
      JSON.stringify(domainQueryKey(DEFAULT_DOMAIN_SLUG, resource))
      === JSON.stringify(domainQueryKey(SPARSE_DOMAIN_SLUG, resource))
    ));

    // Assert
    expect(collisions).toEqual([]);
  });

  it('files a deployment read under the deployment scope', () => {
    // Arrange
    const built = DEPLOYMENT_RESOURCES.map((resource) => ({
      actual: deploymentQueryKey(resource),
      expected: [DEPLOYMENT_SCOPE, resource],
    }));

    // Act
    const wrong = built.filter(
      (pair) => JSON.stringify(pair.actual) !== JSON.stringify(pair.expected),
    );

    // Assert
    expect(wrong).toEqual([]);
  });

  it('takes no domain for a deployment read', () => {
    // Structural, and the whole claim behind the deployment scope: a
    // builder with no slug parameter has no argument a domain switch
    // could change, so the entry survives the switch. A second
    // parameter appearing here is the shape of a deployment-level read
    // being quietly re-scoped.
    // Arrange / Act / Assert
    expect(deploymentQueryKey).toHaveLength(1);
    expect(domainQueryKey).toHaveLength(2);
  });

  it('keeps the deployment scope out of the slug space', () => {
    // What makes the two key spaces disjoint by construction rather
    // than by both happening to be two segments long. Domain slugs are
    // lowercase-kebab natural keys, so the `@` is a character no slug
    // can carry — asserted in both directions, since either half alone
    // would pass over a scope segment that had lost its marker.
    // Arrange / Act / Assert
    expect(DEPLOYMENT_SCOPE).toContain('@');
    expect(SLUGS.filter((slug) => slug.includes('@'))).toEqual([]);
    expect(SLUGS).not.toContain(DEPLOYMENT_SCOPE);
  });

  it('names every key once across both scopes and both domains', () => {
    // Distinctness over the entire key space the app can produce. Two
    // reads sharing a key is the one cache failure that shows up as
    // wrong CONTENT rather than as a missing render: the second hook
    // would be answered with the first one's rows. Serialised rather
    // than joined on a separator, because a separator that appears in
    // a slug would report a collision that is not there — and hide one
    // that is.
    // Arrange
    const scoped = SLUGS.flatMap(
      (slug) => DOMAIN_RESOURCES.map(
        (resource) => domainQueryKey(slug, resource),
      ),
    );
    const unscoped = DEPLOYMENT_RESOURCES.map(
      (resource) => deploymentQueryKey(resource),
    );

    // Act
    const serialised = [...scoped, ...unscoped].map(
      (key) => JSON.stringify(key),
    );

    // Assert
    expect(repeated(serialised)).toEqual([]);
    expect(serialised).toHaveLength(
      SLUGS.length * DOMAIN_RESOURCES.length + DEPLOYMENT_RESOURCES.length,
    );
  });

  it('hands back a fresh key on every call', () => {
    // `useCache` passes the array straight to react-query, which holds
    // it. A shared array would let one consumer's mutation re-file
    // every later read under a key nothing else looks up.
    // Arrange / Act
    const scoped = domainQueryKey(DEFAULT_DOMAIN_SLUG, 'findings');
    const unscoped = deploymentQueryKey('operator');

    // Assert
    expect(domainQueryKey(DEFAULT_DOMAIN_SLUG, 'findings')).not.toBe(scoped);
    expect(deploymentQueryKey('operator')).not.toBe(unscoped);
  });
});

describe('the hook surface', () => {
  it('exports one hook per accessor in ./api.ts', () => {
    // Derived from the barrel's OWN export list rather than from a
    // list written here, so an accessor added to `./api.ts` and left
    // unwrapped is a failure rather than a page that goes and imports
    // it directly. The naming rule is the pin: `fetchX` becomes
    // `useX`, and nothing else in this module starts with `use`.
    // Arrange
    const expected = Object.keys(api)
      .map((name) => name.replace(/^fetch/u, 'use'))
      .sort();

    // Act
    const exported = Object.keys(hooks)
      .filter((name) => name.startsWith('use'))
      .sort();

    // Assert
    expect(exported).toEqual(expected);
    expect(exported).not.toHaveLength(0);
  });

  it('exports nothing beyond the hooks and the key layer', () => {
    // The guard the case tables rest on, in the shape `api.test.ts`
    // uses: anything exported here and named in neither table is
    // covered by nothing and reported by nothing.
    // Arrange
    const covered = [
      ...DOMAIN_HOOKS.map((scoped) => scoped.name),
      ...DEPLOYMENT_HOOKS.map((unscoped) => unscoped.name),
      ...KEY_LAYER,
    ].sort();

    // Act
    const exported = Object.keys(hooks).sort();

    // Assert
    expect(exported).toEqual(covered);
  });

  it('names each hook once', () => {
    // The near-miss the set comparison cannot catch: two rows sharing
    // a name still produce the right set while covering one hook twice
    // and another not at all.
    // Arrange / Act
    const named = [
      ...DOMAIN_HOOKS.map((scoped) => scoped.name),
      ...DEPLOYMENT_HOOKS.map((unscoped) => unscoped.name),
    ];

    // Assert
    expect(repeated(named)).toEqual([]);
  });

  it('claims each resource exactly once', () => {
    // Two hooks filing under one resource would share a cache entry
    // and answer each other's data. Compared as sets against the union
    // guards, so a resource no hook uses fails here too — that is a
    // key space with a hole in it rather than a collision.
    // Arrange / Act
    const scoped = DOMAIN_HOOKS.map((entry) => entry.resource).sort();
    const unscoped = DEPLOYMENT_HOOKS.map((entry) => entry.resource).sort();

    // Assert
    expect(scoped).toEqual([...DOMAIN_RESOURCES].sort());
    expect(unscoped).toEqual([...DEPLOYMENT_RESOURCES].sort());
  });

  it('scopes nine hooks by domain and leaves seven unscoped', () => {
    // The split `./api.ts` documents, asserted against literals so
    // that moving a read from one scope to the other is a failure here
    // rather than a silent re-reading of the rule.
    // Arrange / Act / Assert
    expect(DOMAIN_HOOKS).toHaveLength(9);
    expect(DEPLOYMENT_HOOKS).toHaveLength(7);
  });
});

describe('what each hook files and reads', () => {
  DOMAIN_HOOKS.forEach((scoped) => {
    it(`files under its own domain key: ${scoped.name}`, () => {
      // Both domains, because a hook that ignored its argument and
      // hardcoded the default slug agrees on one of them.
      // Arrange
      const expected = SLUGS.map(
        (slug) => domainQueryKey(slug, scoped.resource),
      );

      // Act
      const filed = SLUGS.map((slug) => recorded(scoped.hook(slug)).key);

      // Assert
      expect(filed).toEqual(expected);
    });

    it(`resolves an absent route param: ${scoped.name}`, async () => {
      // What the pages get to rely on: they hand over
      // `useParams().domainSlug` raw, and the single-domain base's
      // `undefined` still reaches the default domain. Asserted on BOTH
      // halves, because a hook that resolved for the key and not for
      // the fetcher would be filed under the right entry and fill it
      // by asking `./api.ts` about a domain nothing carries — and the
      // key assertion alone reads as green.
      // Arrange / Act
      const absent = recorded(scoped.hook());

      // Assert
      expect(absent.key).toEqual(
        domainQueryKey(DEFAULT_DOMAIN_SLUG, scoped.resource),
      );
      await expect(absent.fetcher()).resolves.toEqual(
        await scoped.reads(DEFAULT_DOMAIN_SLUG),
      );
    });

    it(`reads through ./api.ts: ${scoped.name}`, async () => {
      // The other half of the wiring. A hook filed under the right key
      // but calling the wrong accessor renders someone else's rows,
      // and the key assertions above cannot see it.
      // Arrange
      const fetcher = recorded(scoped.hook(SPARSE_DOMAIN_SLUG)).fetcher;

      // Act
      const answered = await fetcher();

      // Assert
      expect(answered).toEqual(await scoped.reads(SPARSE_DOMAIN_SLUG));
    });

    it(`defers an unknown domain to its fetcher: ${scoped.name}`, async () => {
      // Two claims a page depends on, and the `typeof` is the one that
      // can fail. The hook must hand `useCache` a FUNCTION rather than
      // an already-started read: react-query decides whether a cached
      // entry needs a fetch at all, and a hook that called the
      // accessor in its own body would fill this slot with a promise —
      // one already rejecting, for a bookmarked domain that has gone.
      // What survives that is a rejection the page renders as an error
      // state, which is `./api.ts`'s whole reason for being async.
      // Arrange
      const read = recorded(scoped.hook('no-such-domain'));

      // Act / Assert
      expect(typeof read.fetcher).toBe('function');
      await expect(read.fetcher()).rejects.toThrow(
        'Unknown domain slug: no-such-domain',
      );
    });
  });

  DEPLOYMENT_HOOKS.forEach((unscoped) => {
    it(`files under the deployment scope: ${unscoped.name}`, () => {
      // Arrange / Act
      const filed = recorded(unscoped.hook()).key;

      // Assert
      expect(filed).toEqual(deploymentQueryKey(unscoped.resource));
    });

    it(`reads through ./api.ts: ${unscoped.name}`, async () => {
      // Arrange
      const fetcher = recorded(unscoped.hook()).fetcher;

      // Act
      const answered = await fetcher();

      // Assert
      expect(answered).toEqual(await unscoped.reads());
    });
  });

  it('passes the shared read options to every hook', () => {
    // Identity, not equality: the point of one frozen object is that
    // there is a single place to read what this app's reads do. A hook
    // passing its own literal would satisfy an equality check today
    // and drift silently the first time the shared one changes.
    // Arrange
    const reads = [
      ...DOMAIN_HOOKS.map((scoped) => ({
        name: scoped.name,
        options: recorded(scoped.hook(DEFAULT_DOMAIN_SLUG)).options,
      })),
      ...DEPLOYMENT_HOOKS.map((unscoped) => ({
        name: unscoped.name,
        options: recorded(unscoped.hook()).options,
      })),
    ];

    // Act
    const borrowed = reads.filter((read) => read.options !== READ_OPTIONS);

    // Assert
    expect(borrowed).toEqual([]);
    expect(reads).toHaveLength(16);
  });
});

describe('the read options', () => {
  it('leaves refetch on window focus off', () => {
    // `useCache` already defaults this to `false`. It is passed anyway
    // so the app states its own behaviour rather than inheriting one
    // from `@ar/ui` that could move without this package noticing —
    // and this is the assertion that would notice.
    // Arrange / Act / Assert
    expect(READ_OPTIONS.refetchOnWindowFocus).toBe(false);
  });

  it('leaves polling off', () => {
    // There is no interval option in `UseCacheOptions` to set, so the
    // claim this can actually make is that nothing here tries: an
    // options object that grew a `refetchInterval` — forwarded by a
    // later `@ar/ui`, ignored until then — fails here rather than
    // quietly putting a timer under every read in the app.
    // Arrange / Act / Assert
    expect(Object.keys(READ_OPTIONS)).toEqual(['refetchOnWindowFocus']);
  });

  it('refuses a write', () => {
    // One object is handed to all sixteen reads, so a caller writing
    // through it would change every read after it and lose the change
    // on reload — the version that looks like it worked. Read back
    // against a snapshot taken before the attempt rather than against
    // the literal, so this stays a freeze test if the value changes.
    // Arrange
    const before = READ_OPTIONS.refetchOnWindowFocus;

    // Act
    const write = (): void => {
      (READ_OPTIONS as { refetchOnWindowFocus: boolean })
        .refetchOnWindowFocus = true;
    };

    // Assert
    expect(write).toThrow(TypeError);
    expect(READ_OPTIONS.refetchOnWindowFocus).toBe(before);
  });
});
