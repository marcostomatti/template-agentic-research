import type { DraftableRow } from './drafts';
import type { DeploymentResource, DomainResource } from './hooks';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { repeated } from '../test-support/repeated';

import * as api from './api';
import { listConnectors } from './connectors';
import { listFindings } from './digest';
import {
  DEFAULT_DOMAIN_SLUG,
  DOMAINS,
  SPARSE_DOMAIN_SLUG,
  getDomain,
} from './domains';
import {
  applyDrafts,
  applySingletonDraft,
  deploymentDraftScope,
  domainDraftScope,
  resetDrafts,
} from './drafts';
import * as hooks from './hooks';
import { listCategories } from './lexicon';
import { listPersonas } from './personas';
import { listSources } from './sources';

// All three of `@ar/ui/cache`'s hooks are replaced by recorders rather
// than exercised, and that is what lets this file assert what the
// hooks DO without a renderer. Each hook here is one call and one
// return, so calling it as a plain function outside React reaches the
// same arguments a render would — a read's key, fetcher and options, a
// write's mutation options — and the node unit environment never has
// to grow a DOM. The real hooks are react-query's, covered by its own
// suite and by `@ar/ui`'s; what is unproven anywhere else is that THIS
// module hands them the right key, the right accessor and the right
// set of keys to invalidate.
//
// The one piece of state the recorders need is declared through
// `vi.hoisted` rather than as an ordinary const, because the factory
// below is hoisted above every import in this file and may close over
// nothing that is not hoisted with it. The alternative — exporting the
// array as an extra member of the mocked module — would need a cast
// through `unknown` at every read, since the real module has no such
// export to compare against.
const recorder = vi.hoisted(() => {
  const invalidated: { readonly queryKey: readonly string[] }[] = [];

  return {
    invalidated,
    client: {
      invalidateQueries: (
        filters: { readonly queryKey: readonly string[] },
      ): Promise<void> => {
        invalidated.push(filters);

        return Promise.resolve();
      },
    },
  };
});

vi.mock('@ar/ui/cache', () => ({
  useCache: (
    key: string[],
    fetcher: () => Promise<unknown>,
    options: unknown,
  ): unknown => ({ key, fetcher, options }),
  useMutation: (options: unknown): unknown => ({ options }),
  useQueryClient: (): unknown => recorder.client,
}));

// `./drafts.ts` is module-scoped state and every write hook below
// records into it, so a case without this reads whatever the case
// before it left behind and passes or fails on an order nobody chose.
// The recorder is emptied in the same hook and for the same reason.
beforeEach(() => {
  resetDrafts();
  recorder.invalidated.splice(0);
});

const {
  DEPLOYMENT_SCOPE,
  READ_OPTIONS,
  deploymentQueryKey,
  deploymentRowQueryKey,
  domainQueryKey,
  domainRowQueryKey,
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
  categories: true,
  'category-summaries': true,
  documents: true,
  domain: true,
  entities: true,
  'export-subscriptions': true,
  findings: true,
  personas: true,
  'source-status-counts': true,
  sources: true,
  terms: true,
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
    name: 'useEntities',
    resource: 'entities',
    hook: hooks.useEntities,
    reads: api.fetchEntities,
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

/** What the recorder above hands back in place of a mutation. */
interface RecordedMutation {
  /** The write itself, as `mutate` would call it. */
  readonly mutationFn: (variables: unknown) => Promise<void>;
  /** What runs once that write RESOLVES — see the options test. */
  readonly onSuccess: () => Promise<unknown>;
}

/**
 * Read a write hook's return value as the recorder's payload.
 *
 * The same bargain {@link recorded} makes for the read half, one level
 * deeper: the recorder hands back the whole options object, so this
 * unwraps it and the tests below read as claims about `mutationFn` and
 * `onSuccess` rather than as casts.
 */
function mutated(value: unknown): RecordedMutation {
  return (value as { options: RecordedMutation }).options;
}

/**
 * The row every write case saves.
 *
 * SYNTHETIC rather than read off a fixture, and deliberately so: what
 * these cases prove is WIRING — which accessor a hook records through,
 * under which scope, and which keys it then invalidates — and the
 * draft store files whatever row it is handed without asking which ids
 * exist. `api.test.ts` owns the other question, whether an edit to a
 * REAL row is visible to the read that shows it, and it answers that
 * against the fixtures.
 *
 * The id is far above any fixture's so a reader cannot mistake a case
 * here for one of those.
 */
const PROBE: DraftableRow = Object.freeze({ id: 987_654_321 });

/**
 * The hook name `./api.ts`'s accessor of this name must have.
 *
 * TWO rules rather than one, because the halves are named apart on
 * purpose: a read drops its `fetch` and a write keeps its verb whole.
 * Derived here rather than listed, so an accessor added to the barrel
 * and left unwrapped fails the parity test rather than being quietly
 * missing from a hand-written expectation.
 *
 * @param accessor - An exported name from `./api.ts`.
 * @returns What this module must export for it.
 */
function hookNameFor(accessor: string): string {
  return accessor.startsWith('fetch')
    ? accessor.replace(/^fetch/u, 'use')
    : `use${accessor.charAt(0).toUpperCase()}${accessor.slice(1)}`;
}

/**
 * One write hook, with everything a case needs to drive it without
 * knowing which one it is holding.
 *
 * `invalidates` is the claim this file exists to make about the write
 * half: the key set is written out per hook rather than derived from
 * the module, because deriving it from the thing under test would let
 * any set at all pass. It takes the slug so a hook that ignored its
 * own argument and filed under the default domain fails on the second
 * domain rather than agreeing on the first.
 */
interface WriteHookCase {
  /** Its exported name, for the completeness check and test titles. */
  readonly name: string;
  /** The accessor in `./api.ts` it must record through. */
  readonly writes: string;
  /** The hook under test. The unscoped two ignore the argument. */
  readonly hook: (domainSlug?: string | null) => unknown;
  /** Whether it takes a domain slug at all. */
  readonly scoped: boolean;
  /** Every key it must invalidate, for the domain it was opened with. */
  readonly invalidates: (slug: string) => readonly (readonly string[])[];
  /** What `mutate` is called with, built from {@link PROBE}. */
  readonly variables: (probe: DraftableRow) => unknown;
  /**
   * What the draft store answers for that probe once the write has
   * run.
   *
   * Hands the probe back UNCHANGED where nothing was recorded under
   * the expected scope, which is what makes the identity assertion in
   * the case below discriminating: `recordDraft` and
   * `recordSingletonDraft` both store a shallow copy, so a write that
   * landed answers an equal object that is not the same one, and a
   * write that landed somewhere else answers the very probe it was
   * given.
   */
  readonly readBack: (slug: string, probe: DraftableRow) => unknown;
}

const WRITE_HOOKS: readonly WriteHookCase[] = [
  {
    name: 'useSaveCategoryTerms',
    writes: 'saveCategoryTerms',
    hook: hooks.useSaveCategoryTerms,
    scoped: true,
    // The category CARDS and the term LISTS. The second key is the
    // two-segment PREFIX rather than one category's three: this write
    // takes no category argument, so there is no single list it could
    // name, and prefix matching re-reads every category's.
    invalidates: (slug) => [
      [slug, 'category-summaries'],
      [slug, 'terms'],
    ],
    variables: (probe) => [probe],
    readBack: (slug, probe) => applyDrafts(
      domainDraftScope(slug, 'terms'),
      [probe],
    )[0],
  },
  {
    name: 'useSaveFinding',
    writes: 'saveFinding',
    hook: hooks.useSaveFinding,
    scoped: true,
    invalidates: (slug) => [[slug, 'findings']],
    variables: (probe) => probe,
    readBack: (slug, probe) => applyDrafts(
      domainDraftScope(slug, 'findings'),
      [probe],
    )[0],
  },
  {
    name: 'useSaveSource',
    writes: 'saveSource',
    hook: hooks.useSaveSource,
    scoped: true,
    // The one write with two keys — the stat cards count these rows.
    invalidates: (slug) => [
      [slug, 'sources'],
      [slug, 'source-status-counts'],
    ],
    variables: (probe) => probe,
    readBack: (slug, probe) => applyDrafts(
      domainDraftScope(slug, 'sources'),
      [probe],
    )[0],
  },
  {
    name: 'useApproveSourceConfig',
    writes: 'approveSourceConfig',
    hook: hooks.useApproveSourceConfig,
    scoped: true,
    // Empty on purpose: the proposals read is not written yet.
    invalidates: () => [],
    variables: (probe) => probe,
    readBack: (slug, probe) => applyDrafts(
      domainDraftScope(slug, 'source-proposals'),
      [probe],
    )[0],
  },
  {
    name: 'useResolveSourceFailure',
    writes: 'resolveSourceFailure',
    hook: hooks.useResolveSourceFailure,
    scoped: true,
    invalidates: (slug) => [[slug, 'documents']],
    variables: (probe) => probe,
    readBack: (slug, probe) => applyDrafts(
      domainDraftScope(slug, 'documents'),
      [probe],
    )[0],
  },
  {
    name: 'useSavePersona',
    writes: 'savePersona',
    hook: hooks.useSavePersona,
    scoped: true,
    invalidates: (slug) => [[slug, 'personas']],
    variables: (probe) => probe,
    readBack: (slug, probe) => applyDrafts(
      domainDraftScope(slug, 'personas'),
      [probe],
    )[0],
  },
  {
    name: 'useSaveExportSubscriptions',
    writes: 'saveExportSubscriptions',
    hook: hooks.useSaveExportSubscriptions,
    scoped: true,
    invalidates: (slug) => [[slug, 'export-subscriptions']],
    variables: (probe) => [probe],
    readBack: (slug, probe) => applyDrafts(
      domainDraftScope(slug, 'export-subscriptions'),
      [probe],
    )[0],
  },
  {
    name: 'useSaveConnector',
    writes: 'saveConnector',
    hook: hooks.useSaveConnector,
    scoped: false,
    invalidates: () => [[DEPLOYMENT_SCOPE, 'connectors']],
    variables: (probe) => probe,
    readBack: (_slug, probe) => applyDrafts(
      deploymentDraftScope('connectors'),
      [probe],
    )[0],
  },
  {
    name: 'useSaveSettings',
    writes: 'saveSettings',
    hook: hooks.useSaveSettings,
    scoped: false,
    invalidates: () => [[DEPLOYMENT_SCOPE, 'settings']],
    variables: (probe) => probe,
    // The one singleton: no row, no id, a second map of its own.
    readBack: (_slug, probe) => applySingletonDraft('settings', probe),
  },
];

/**
 * The slugs one write case is asked about.
 *
 * Both domains for a scoped hook — the near-miss worth catching is a
 * hook that resolved its own slug for the key and then ignored it, or
 * the reverse — and one for the two that take no slug, where a second
 * pass would assert the same thing twice.
 *
 * @param write - The case.
 * @returns Which slugs to drive it with.
 */
function slugsFor(write: WriteHookCase): readonly string[] {
  return write.scoped
    ? SLUGS
    : [DEFAULT_DOMAIN_SLUG];
}

/**
 * Every key the recorder has been handed since the last reset.
 *
 * @returns The keys, in the order they were invalidated.
 */
function invalidatedKeys(): readonly (readonly string[])[] {
  return recorder.invalidated.map((filters) => filters.queryKey);
}

/** The write hooks a second domain's key can be asked about. */
const SCOPED_WRITE_HOOKS = WRITE_HOOKS.filter((write) => write.scoped);

/**
 * Drive one write hook's invalidation once per slug it answers to.
 *
 * Sequential rather than concurrent, and the recorder is emptied
 * between passes, so each entry of the answer belongs to exactly one
 * slug. Run through `Promise.all`, every hook's keys would land in one
 * shared list and the per-domain claim would collapse into a set
 * comparison that a hook ignoring its slug could satisfy.
 *
 * @param write - The case.
 * @returns One key list per slug, in {@link slugsFor}'s order.
 */
async function invalidationsFor(
  write: WriteHookCase,
): Promise<readonly (readonly (readonly string[])[])[]> {
  const filed: (readonly (readonly string[])[])[] = [];

  for (const slug of slugsFor(write)) {
    recorder.invalidated.splice(0);
    await mutated(write.hook(slug)).onSuccess();
    filed.push(invalidatedKeys());
  }

  return filed;
}

/**
 * Every key every write hook invalidates, over every slug each of them
 * answers to.
 *
 * The population the two whole-module claims below are made over — one
 * that no write names a key no read files under, one that no write
 * names an empty key. Both are properties of the SET, so the per-slug
 * grouping {@link invalidationsFor} keeps is flattened away here.
 *
 * @returns The keys, deduplicated by nothing: a key named twice is
 * still a key named.
 */
async function everyInvalidatedKey(): Promise<readonly (readonly string[])[]> {
  const filed: (readonly string[])[] = [];

  for (const write of WRITE_HOOKS) {
    const perSlug = await invalidationsFor(write);

    filed.push(...perSlug.flat());
  }

  return filed;
}

/**
 * The seeded domain's id, which is the only domain any fixture row
 * belongs to.
 */
const SEEDED_DOMAIN_ID = getDomain(DEFAULT_DOMAIN_SLUG).id;

/**
 * The first row id of a fixture list, or a failure naming the list
 * that came up empty.
 *
 * Read off the fixture rather than written down, for the reason
 * `api.test.ts` gives: a reseeded table silently turns a hardcoded id
 * into somebody else's row, and the case goes on passing.
 *
 * @param rows - The list to read.
 * @param what - What it is, for the failure.
 * @returns Its first row's id.
 * @throws If the list is empty, which is the non-emptiness guard every
 * fetcher case below rests on.
 */
function firstIdOf(
  rows: readonly { readonly id: number }[],
  what: string,
): number {
  const [row] = rows;

  if (row === undefined) {
    throw new Error(`No ${what} rows to read an id off.`);
  }

  return row.id;
}

/**
 * An id no fixture row of a list carries, derived rather than written.
 *
 * @param rows - The rows the id must avoid.
 * @param what - What they are, for the failure.
 * @returns One greater than the largest.
 */
function absentIdOf(
  rows: readonly { readonly id: number }[],
  what: string,
): number {
  return firstIdOf(rows, what) === 0
    ? 1
    : Math.max(...rows.map((row) => row.id)) + 1;
}

/**
 * One SINGLE-ROW hook, with everything a case needs to drive it.
 *
 * `hook` and `reads` are normalising WRAPPERS rather than the exports,
 * because the five do not share a signature: {@link hooks.useConnector}
 * takes an id alone, and handing it a slug would file the connector
 * under a key built from the wrong argument. `key` is per case for the
 * same reason — four rows sit under a domain and one under the
 * deployment.
 *
 * `row` and `absent` are read off the fixtures rather than written, so
 * the fetcher cases resolve against a real row and refuse against an
 * id nothing can grow into.
 */
interface SingleRowHookCase {
  /** Its exported name, for the completeness check and the titles. */
  readonly name: string;
  /** The key segment it shares with the list read beside it. */
  readonly resource: string;
  /** Whether it takes a domain slug at all. */
  readonly scoped: boolean;
  /** The hook under test, called uniformly. */
  readonly hook: (domainSlug: string | null | undefined, id: number) => unknown;
  /** The accessor its fetcher must call, called uniformly. */
  readonly reads: (slug: string, id: number) => Promise<unknown>;
  /** The key it must file under. */
  readonly key: (slug: string, id: number) => string[];
  /** A real fixture row's id. */
  readonly row: number;
  /** An id no fixture row carries. */
  readonly absent: number;
  /** The singular noun a missing-row refusal names. */
  readonly label: string;
}

const SINGLE_ROW_HOOKS: readonly SingleRowHookCase[] = [
  {
    name: 'useFinding',
    resource: 'findings',
    scoped: true,
    hook: (domainSlug, id) => hooks.useFinding(domainSlug, id),
    reads: (slug, id) => api.fetchFinding(slug, id),
    key: (slug, id) => domainRowQueryKey(slug, 'findings', id),
    row: firstIdOf(listFindings(SEEDED_DOMAIN_ID), 'finding'),
    absent: absentIdOf(listFindings(SEEDED_DOMAIN_ID), 'finding'),
    label: 'finding',
  },
  {
    name: 'useSource',
    resource: 'sources',
    scoped: true,
    hook: (domainSlug, id) => hooks.useSource(domainSlug, id),
    reads: (slug, id) => api.fetchSource(slug, id),
    key: (slug, id) => domainRowQueryKey(slug, 'sources', id),
    row: firstIdOf(listSources(SEEDED_DOMAIN_ID), 'source'),
    absent: absentIdOf(listSources(SEEDED_DOMAIN_ID), 'source'),
    label: 'source',
  },
  {
    name: 'usePersona',
    resource: 'personas',
    scoped: true,
    hook: (domainSlug, id) => hooks.usePersona(domainSlug, id),
    reads: (slug, id) => api.fetchPersona(slug, id),
    key: (slug, id) => domainRowQueryKey(slug, 'personas', id),
    row: firstIdOf(listPersonas(SEEDED_DOMAIN_ID), 'persona'),
    absent: absentIdOf(listPersonas(SEEDED_DOMAIN_ID), 'persona'),
    label: 'persona',
  },
  {
    name: 'useCategory',
    resource: 'categories',
    scoped: true,
    hook: (domainSlug, id) => hooks.useCategory(domainSlug, id),
    reads: (slug, id) => api.fetchCategory(slug, id),
    key: (slug, id) => domainRowQueryKey(slug, 'categories', id),
    row: firstIdOf(listCategories(SEEDED_DOMAIN_ID), 'category'),
    absent: absentIdOf(listCategories(SEEDED_DOMAIN_ID), 'category'),
    label: 'category',
  },
  {
    // The one that takes no slug, so both wrappers drop it. The `_`
    // prefix is what `noUnusedParameters` wants; eslint's own rule
    // never asked for it, a parameter before a used one being invisible
    // to `args: after-used`.
    name: 'useConnector',
    resource: 'connectors',
    scoped: false,
    hook: (_domainSlug, id) => hooks.useConnector(id),
    reads: (_slug, id) => api.fetchConnector(id),
    key: (_slug, id) => deploymentRowQueryKey('connectors', id),
    row: firstIdOf(listConnectors(), 'connector'),
    absent: absentIdOf(listConnectors(), 'connector'),
    label: 'connector',
  },
];

/** The single-row hooks a domain slug can be refused by. */
const SCOPED_SINGLE_ROW_HOOKS = SINGLE_ROW_HOOKS.filter(
  (single) => single.scoped,
);

/**
 * One CHILD-LIST hook: a slug and a parent id in, a list out.
 *
 * A table of its own rather than a row of either neighbour, because
 * neither describes it — {@link DomainHookCase} calls its hook with a
 * slug alone, and {@link SingleRowHookCase}'s `resource` is asserted
 * to be one a row is loaded out of, which is not what
 * {@link hooks.useTerms} does with `terms`. One member today, and a
 * table anyway so the surface partition below is a set claim over
 * populations that add up to the module.
 */
interface ChildListHookCase {
  /** Its exported name, for the completeness check and the titles. */
  readonly name: string;
  /** The second key segment, which its parent id sits under. */
  readonly resource: DomainResource;
  /** The hook under test. */
  readonly hook: (domainSlug: string | null | undefined, id: number) => unknown;
  /** The accessor its fetcher must call. */
  readonly reads: (slug: string, id: number) => Promise<unknown>;
  /** The key it must file under. */
  readonly key: (slug: string, id: number) => string[];
  /** A real parent row's id. */
  readonly parent: number;
  /** An id no parent row carries. */
  readonly absent: number;
  /** The singular noun a missing-parent refusal names. */
  readonly label: string;
}

const CHILD_LIST_HOOKS: readonly ChildListHookCase[] = [
  {
    name: 'useTerms',
    resource: 'terms',
    hook: (domainSlug, id) => hooks.useTerms(domainSlug, id),
    reads: (slug, id) => api.fetchTerms(slug, id),
    key: (slug, id) => domainRowQueryKey(slug, 'terms', id),
    parent: firstIdOf(listCategories(SEEDED_DOMAIN_ID), 'category'),
    absent: absentIdOf(listCategories(SEEDED_DOMAIN_ID), 'category'),
    // The CATEGORY's noun, not a term's: `./api.ts` refuses the parent
    // and never reaches the list, so a refusal naming terms would be
    // this file describing a message the module does not produce.
    label: 'category',
  },
];

/**
 * An id for the KEY cases, which do not need a row to exist.
 *
 * Deliberately not a fixture id: a key is a string list and nothing
 * about building one reads the store, so pinning these cases to a real
 * row would suggest a dependency that is not there.
 */
const KEY_PROBE_ID = 4242;

/** Everything this module exports that is not a hook. */
const KEY_LAYER = [
  'DEPLOYMENT_SCOPE',
  'READ_OPTIONS',
  'deploymentQueryKey',
  'deploymentRowQueryKey',
  'domainQueryKey',
  'domainRowQueryKey',
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
    const row = domainRowQueryKey(DEFAULT_DOMAIN_SLUG, 'findings', 1);
    const deploymentRow = deploymentRowQueryKey('connectors', 1);

    // Assert
    expect(domainQueryKey(DEFAULT_DOMAIN_SLUG, 'findings')).not.toBe(scoped);
    expect(deploymentQueryKey('operator')).not.toBe(unscoped);
    expect(domainRowQueryKey(DEFAULT_DOMAIN_SLUG, 'findings', 1))
      .not.toBe(row);
    expect(deploymentRowQueryKey('connectors', 1)).not.toBe(deploymentRow);
  });

  it('files a row under its own list key with the id appended', () => {
    // The prefix relationship this module's header rests on, asserted
    // over BOTH halves of the key space and over every resource rather
    // than at one example: `invalidateQueries` matches by prefix, so a
    // row key that stopped extending its list's key would stop being
    // re-read by the write that changed the list, and nothing else
    // here would report it.
    // Arrange
    const scoped = SLUGS.flatMap(
      (slug) => DOMAIN_RESOURCES.map((resource) => ({
        row: domainRowQueryKey(slug, resource, KEY_PROBE_ID),
        list: domainQueryKey(slug, resource),
      })),
    );
    const unscoped = DEPLOYMENT_RESOURCES.map((resource) => ({
      row: deploymentRowQueryKey(resource, KEY_PROBE_ID),
      list: deploymentQueryKey(resource),
    }));

    // Act
    const wrong = [...scoped, ...unscoped].filter(
      (pair) => JSON.stringify(pair.row)
        !== JSON.stringify([...pair.list, String(KEY_PROBE_ID)]),
    );

    // Assert
    expect(wrong).toEqual([]);
    expect(scoped).not.toHaveLength(0);
    expect(unscoped).not.toHaveLength(0);
  });

  it('stringifies the row id', () => {
    // A key of mixed types would hash the same under react-query and
    // read as a second key shape nobody declared — and this module
    // types both builders as `string[]`, which TypeScript would have
    // no way to check if the id were spread in raw.
    // Arrange / Act
    const scoped = domainRowQueryKey(DEFAULT_DOMAIN_SLUG, 'sources', 12);
    const unscoped = deploymentRowQueryKey('connectors', 12);

    // Assert
    expect(scoped).toEqual([DEFAULT_DOMAIN_SLUG, 'sources', '12']);
    expect(unscoped).toEqual([DEPLOYMENT_SCOPE, 'connectors', '12']);
    expect(scoped.filter((segment) => typeof segment !== 'string'))
      .toEqual([]);
  });

  it('answers a different key per row', () => {
    // The near-miss the shape checks above cannot catch: a builder
    // that dropped the id entirely still produces a plausible key,
    // and every row of a resource would then share one cache entry
    // and answer with whichever row was read first.
    // Arrange / Act
    const first = domainRowQueryKey(DEFAULT_DOMAIN_SLUG, 'sources', 1);
    const second = domainRowQueryKey(DEFAULT_DOMAIN_SLUG, 'sources', 2);
    const list = domainQueryKey(DEFAULT_DOMAIN_SLUG, 'sources');

    // Assert
    expect(first).not.toEqual(second);
    expect(first).not.toEqual(list);
    expect(deploymentRowQueryKey('connectors', 1))
      .not.toEqual(deploymentRowQueryKey('connectors', 2));
  });
});

describe('the hook surface', () => {
  it('exports one hook per accessor in ./api.ts', () => {
    // Derived from the barrel's OWN export list rather than from a
    // list written here, so an accessor added to `./api.ts` and left
    // unwrapped is a failure rather than a page that goes and imports
    // it directly. Both naming rules run through
    // {@link hookNameFor}: a read drops its `fetch`, a write keeps its
    // verb whole. There is no exemption list any more — the ledger
    // that carried the nine writes while they had no hooks is struck,
    // which is what its own docblock said striking a name off it
    // meant.
    // Arrange
    const expected = Object.keys(api)
      .map(hookNameFor)
      .sort();

    // Act
    const exported = Object.keys(hooks)
      .filter((name) => name.startsWith('use'))
      .sort();

    // Assert
    expect(exported).toEqual(expected);
    expect(exported).not.toHaveLength(0);
  });

  it('names the two halves apart', () => {
    // The near-miss the parity check cannot see on its own: one naming
    // rule applied to everything would still produce a matching SET,
    // as long as this module and {@link hookNameFor} agreed on it. So
    // the two populations are read separately — a read's `fetch` is
    // really DROPPED rather than prefixed, and the halves are the
    // sizes `./api.ts` documents. Which writes are covered is the
    // block below's claim, made against the barrel's own export list;
    // restating it here would assert declaration ORDER rather than
    // membership, and the two files group their writes differently on
    // purpose.
    // Arrange
    const accessors = Object.keys(api);

    // Act
    const reads = accessors.filter((name) => name.startsWith('fetch'));
    const writes = accessors.filter((name) => !name.startsWith('fetch'));
    const kept = reads.filter(
      (name) => hookNameFor(name).startsWith('useFetch'),
    );

    // Assert
    expect(kept).toEqual([]);
    expect(reads).toHaveLength(23);
    expect(writes).toHaveLength(9);
  });

  it('exports nothing beyond the hooks and the key layer', () => {
    // The guard the case tables rest on, in the shape `api.test.ts`
    // uses: anything exported here and named in no table is covered by
    // nothing and reported by nothing. FIVE populations now — the
    // write hooks, the single-row reads and the child-list read are
    // each a differently shaped export and get their own table rather
    // than an exemption, so a hook added to the module and to no table
    // fails here.
    // Arrange
    const covered = [
      ...DOMAIN_HOOKS.map((scoped) => scoped.name),
      ...DEPLOYMENT_HOOKS.map((unscoped) => unscoped.name),
      ...SINGLE_ROW_HOOKS.map((single) => single.name),
      ...CHILD_LIST_HOOKS.map((child) => child.name),
      ...WRITE_HOOKS.map((write) => write.name),
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
    // and another not at all. Across all four hook tables, since a
    // write hook colliding with a read hook's name is the same
    // failure.
    // Arrange / Act
    const named = [
      ...DOMAIN_HOOKS.map((scoped) => scoped.name),
      ...DEPLOYMENT_HOOKS.map((unscoped) => unscoped.name),
      ...SINGLE_ROW_HOOKS.map((single) => single.name),
      ...CHILD_LIST_HOOKS.map((child) => child.name),
      ...WRITE_HOOKS.map((write) => write.name),
    ];

    // Assert
    expect(repeated(named)).toEqual([]);
    expect(repeated(WRITE_HOOKS.map((write) => write.writes))).toEqual([]);
  });

  it('splits the write hooks seven scoped and two unscoped', () => {
    // The split `./api.ts` documents for the writes, asserted against
    // literals so that moving a write from one scope to the other is a
    // failure here rather than a silent re-reading of the rule.
    // Arrange / Act
    const scoped = WRITE_HOOKS.filter((write) => write.scoped);

    // Assert
    expect(WRITE_HOOKS).toHaveLength(9);
    expect(scoped).toHaveLength(7);
    expect(WRITE_HOOKS.filter((write) => !write.scoped).map((w) => w.writes))
      .toEqual(['saveConnector', 'saveSettings']);
  });

  it('claims each resource exactly once per shape', () => {
    // Two LIST hooks filing under one resource would share a cache
    // entry and answer each other's data, and so would two row hooks.
    // A list and a row hook sharing one is the opposite — the
    // designed prefix relationship, which is why the claim is made per
    // shape and the overlap is then pinned as a literal below rather
    // than forbidden here.
    // Arrange / Act
    const scoped = DOMAIN_HOOKS.map((entry) => entry.resource).sort();
    const unscoped = DEPLOYMENT_HOOKS.map((entry) => entry.resource).sort();
    const rows = SINGLE_ROW_HOOKS.map((entry) => entry.resource).sort();
    const children = CHILD_LIST_HOOKS.map((entry) => entry.resource).sort();

    // Assert
    expect(repeated(scoped)).toEqual([]);
    expect(repeated(unscoped)).toEqual([]);
    expect(repeated(rows)).toEqual([]);
    expect(repeated(children)).toEqual([]);
    expect(unscoped).toEqual([...DEPLOYMENT_RESOURCES].sort());
  });

  it('leaves no domain resource unclaimed and no row hook astray', () => {
    // The hole-in-the-key-space claim, which the per-shape check above
    // deliberately no longer makes: `categories` is named by a row
    // hook and by no list hook, so the completeness question is about
    // the UNION of the two tables. The overlap is a literal in the same
    // case, so a row hook filed under `entities` — a resource nothing
    // loads one row of — is reported rather than absorbed.
    // Arrange
    const listed: readonly string[] = DOMAIN_HOOKS.map(
      (entry) => entry.resource,
    );
    const rows = SINGLE_ROW_HOOKS
      .filter((entry) => entry.scoped)
      .map((entry) => entry.resource);
    const children = CHILD_LIST_HOOKS.map((entry) => entry.resource);

    // Act
    const claimed = [...new Set([...listed, ...rows, ...children])].sort();
    const shared = rows.filter((resource) => listed.includes(resource)).sort();

    // Assert
    expect(claimed).toEqual([...DOMAIN_RESOURCES].sort());
    expect(shared).toEqual(['findings', 'personas', 'sources']);
    expect(children.filter((resource) => listed.includes(resource)
      || rows.includes(resource))).toEqual([]);
  });

  it('scopes ten hooks by domain and leaves seven unscoped', () => {
    // The split `./api.ts` documents, asserted against literals so
    // that moving a read from one scope to the other is a failure here
    // rather than a silent re-reading of the rule. The single-row
    // table's own split is the same claim for the shape that takes an
    // id: four under a domain, and the connector under the deployment
    // for the reason `useConnectors` is there too.
    // Arrange / Act / Assert
    expect(DOMAIN_HOOKS).toHaveLength(10);
    expect(DEPLOYMENT_HOOKS).toHaveLength(7);
    expect(SINGLE_ROW_HOOKS).toHaveLength(5);
    expect(CHILD_LIST_HOOKS).toHaveLength(1);
    expect(SCOPED_SINGLE_ROW_HOOKS).toHaveLength(4);
    expect(SINGLE_ROW_HOOKS.filter((single) => !single.scoped)
      .map((single) => single.name)).toEqual(['useConnector']);
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

  SINGLE_ROW_HOOKS.forEach((single) => {
    it(`defers a missing row to its fetcher: ${single.name}`, async () => {
      // First, because it is the refusal a modal sub-route actually
      // produces: the route matches any digits at all, so the id
      // reaching the hook is a number nobody promised. The `typeof` is
      // the half that can fail — a hook that called its accessor in
      // its own body would fill this slot with an already-rejecting
      // promise, and an unhandled rejection is not an error state a
      // page can render.
      // Arrange
      const read = recorded(single.hook(DEFAULT_DOMAIN_SLUG, single.absent));

      // Act / Assert
      expect(typeof read.fetcher).toBe('function');
      await expect(read.fetcher()).rejects.toThrow(
        `Unknown ${single.label} id: ${single.absent}`,
      );
    });
  });

  SCOPED_SINGLE_ROW_HOOKS.forEach((single) => {
    it(`defers an unknown domain to its fetcher: ${single.name}`, async () => {
      // The other refusal, with a REAL row id so the two cannot be
      // confused: this has to fail on the domain, which is what says
      // the hook passed its slug through rather than resolving it to
      // something the accessor was happy with.
      // Arrange
      const read = recorded(single.hook('no-such-domain', single.row));

      // Act / Assert
      expect(typeof read.fetcher).toBe('function');
      await expect(read.fetcher()).rejects.toThrow(
        'Unknown domain slug: no-such-domain',
      );
    });

    it(`refuses another domain's row: ${single.name}`, async () => {
      // The seam's ownership refusal, reached through the hook. Every
      // fixture row belongs to the seeded domain, so opening a modal
      // on the sparse domain with a seeded row's id is the mismatched
      // pair a stale bookmark produces — and it must not resolve,
      // because the draft scope this read overlays comes off the SLUG.
      // Arrange
      const read = recorded(single.hook(SPARSE_DOMAIN_SLUG, single.row));

      // Act / Assert
      await expect(read.fetcher()).rejects.toThrow(
        `Unknown ${single.label} id: ${single.row}`,
      );
    });

    it(`files under its own row key: ${single.name}`, () => {
      // Both domains, because a hook that ignored its slug and
      // hardcoded the default agrees on one of them. The expected side
      // is built by this file's own destructured builder, so a hook
      // that stopped extending its list's key fails here as well as in
      // the prefix case above.
      // Arrange
      const expected = SLUGS.map((slug) => single.key(slug, single.row));

      // Act
      const filed = SLUGS.map(
        (slug) => recorded(single.hook(slug, single.row)).key,
      );

      // Assert
      expect(filed).toEqual(expected);
    });

    it(`resolves an absent route param: ${single.name}`, async () => {
      // What the modals get to rely on: they hand over
      // `useParams().domainSlug` raw, and the single-domain base's
      // `undefined` still reaches the default domain. Asserted on BOTH
      // halves, because a hook that resolved for the key and not for
      // the fetcher would be filed under the right entry and fill it
      // by asking `./api.ts` about a domain nothing carries.
      // Arrange / Act
      const absent = recorded(single.hook(undefined, single.row));

      // Assert
      expect(absent.key).toEqual(single.key(DEFAULT_DOMAIN_SLUG, single.row));
      await expect(absent.fetcher()).resolves.toEqual(
        await single.reads(DEFAULT_DOMAIN_SLUG, single.row),
      );
    });
  });

  SINGLE_ROW_HOOKS.forEach((single) => {
    it(`files a different entry per row: ${single.name}`, () => {
      // The cache failure that shows up as wrong CONTENT rather than
      // as a missing render: a hook that dropped the id from its key
      // would file every row of a resource under one entry, and the
      // second modal opened would render the first one's record.
      // Arrange / Act
      const first = recorded(single.hook(DEFAULT_DOMAIN_SLUG, single.row)).key;
      const other = recorded(
        single.hook(DEFAULT_DOMAIN_SLUG, single.absent),
      ).key;

      // Assert
      expect(first).not.toEqual(other);
      expect(single.row).not.toBe(single.absent);
    });

    it(`reads through ./api.ts: ${single.name}`, async () => {
      // The other half of the wiring. A hook filed under the right key
      // but calling the wrong accessor renders someone else's record,
      // and no key assertion can see it. Compared by IDENTITY, because
      // an undrafted row comes back as the very object the fixture
      // holds — two accessors happening to agree by value would still
      // be two accessors.
      // Arrange
      const fetcher = recorded(
        single.hook(DEFAULT_DOMAIN_SLUG, single.row),
      ).fetcher;

      // Act
      const answered = await fetcher();

      // Assert
      expect(answered).toBe(await single.reads(DEFAULT_DOMAIN_SLUG, single.row));
    });
  });

  CHILD_LIST_HOOKS.forEach((child) => {
    it(`rejects a parent id no fixture carries: ${child.name}`, async () => {
      // Negative first, and it is the refusal a stale bookmark
      // actually produces: the lexicon edit route matches any digits,
      // so the id reaching this hook is a number nobody promised. The
      // read behind it refuses the PARENT — a term list is not empty
      // for a category that does not exist, it is unanswerable.
      // Arrange
      const read = recorded(child.hook(DEFAULT_DOMAIN_SLUG, child.absent));

      // Act / Assert
      await expect(read.fetcher()).rejects.toThrow(
        `Unknown ${child.label} id: ${child.absent}`,
      );
    });

    it(`rejects an unknown domain slug: ${child.name}`, async () => {
      // With a real parent id, so this must fail on the DOMAIN and
      // cannot be the refusal above under another message.
      // Arrange
      const read = recorded(child.hook('no-such-domain', child.parent));

      // Act / Assert
      await expect(read.fetcher()).rejects.toThrow(
        'Unknown domain slug: no-such-domain',
      );
    });

    it(`refuses another domain's parent: ${child.name}`, async () => {
      // Every fixture row belongs to the seeded domain, so opening the
      // editor on the sparse domain with a seeded category's id is the
      // mismatched pair a stale bookmark produces. It must not
      // resolve: the draft scope this read overlays comes off the
      // SLUG, so a resolved answer would be one domain's edits laid
      // over another domain's vocabulary.
      // Arrange
      const read = recorded(child.hook(SPARSE_DOMAIN_SLUG, child.parent));

      // Act / Assert
      await expect(read.fetcher()).rejects.toThrow(
        `Unknown ${child.label} id: ${child.parent}`,
      );
    });

    it(`files under its own parent key: ${child.name}`, () => {
      // Both domains, because a hook that ignored its slug and
      // hardcoded the default agrees on one of them — which is the
      // whole of what stops a term list outliving a domain switch.
      // Arrange
      const expected = SLUGS.map((slug) => child.key(slug, child.parent));

      // Act
      const filed = SLUGS.map(
        (slug) => recorded(child.hook(slug, child.parent)).key,
      );

      // Assert
      expect(filed).toEqual(expected);
      expect(filed[0]).not.toEqual(filed[1]);
    });

    it(`files a different entry per parent: ${child.name}`, () => {
      // The cache failure that shows as wrong CONTENT rather than as a
      // missing render: a hook that dropped the id from its key would
      // file every category's vocabulary under one entry, and the
      // second editor opened would render the first one's terms.
      // Arrange / Act
      const first = recorded(child.hook(DEFAULT_DOMAIN_SLUG, child.parent));
      const other = recorded(child.hook(DEFAULT_DOMAIN_SLUG, child.absent));

      // Assert
      expect(first.key).not.toEqual(other.key);
      expect(child.parent).not.toBe(child.absent);
    });

    it(`sits under the prefix its save invalidates: ${child.name}`, () => {
      // The relationship `useSaveCategoryTerms` rests on. That write
      // names no category, so it invalidates the two-segment key and
      // relies on react-query's PREFIX matching to reach every
      // category's list. Asserted as a real prefix rather than as two
      // literals agreeing, so a key shape that stopped extending the
      // list key is reported here.
      // Arrange
      const listKey = domainQueryKey(DEFAULT_DOMAIN_SLUG, child.resource);

      // Act
      const filed = recorded(child.hook(DEFAULT_DOMAIN_SLUG, child.parent)).key;

      // Assert
      expect(filed.slice(0, listKey.length)).toEqual(listKey);
      expect(filed.length).toBe(listKey.length + 1);
      expect(filed).toEqual([...listKey, String(child.parent)]);
    });

    it(`resolves an absent route param: ${child.name}`, async () => {
      // What the editor gets to rely on: it hands over
      // `useParams().domainSlug` raw, and the single-domain base's
      // `undefined` still reaches the default domain. Both halves,
      // because a hook resolving for the key and not for the fetcher
      // would be filed under the right entry and fill it by asking
      // `./api.ts` about a domain nothing carries.
      // Arrange / Act
      const absent = recorded(child.hook(undefined, child.parent));

      // Assert
      expect(absent.key)
        .toEqual(child.key(DEFAULT_DOMAIN_SLUG, child.parent));
      await expect(absent.fetcher()).resolves.toEqual(
        await child.reads(DEFAULT_DOMAIN_SLUG, child.parent),
      );
    });

    it(`reads through ./api.ts: ${child.name}`, async () => {
      // The other half of the wiring. A hook filed under the right key
      // but calling the wrong accessor renders someone else's list,
      // and no key assertion can see it. By value rather than by
      // identity, since every call of a list read builds a fresh
      // array — the rows inside it are the fixture's own objects, and
      // `api.test.ts` is where that is pinned.
      // Arrange
      const read = recorded(child.hook(DEFAULT_DOMAIN_SLUG, child.parent));

      // Act
      const answered = await read.fetcher();

      // Assert
      expect(answered)
        .toEqual(await child.reads(DEFAULT_DOMAIN_SLUG, child.parent));
      expect(answered as readonly unknown[]).not.toHaveLength(0);
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
      ...SINGLE_ROW_HOOKS.map((single) => ({
        name: single.name,
        options: recorded(single.hook(DEFAULT_DOMAIN_SLUG, single.row)).options,
      })),
      ...CHILD_LIST_HOOKS.map((child) => ({
        name: child.name,
        options: recorded(
          child.hook(DEFAULT_DOMAIN_SLUG, child.parent),
        ).options,
      })),
    ];

    // Act
    const borrowed = reads.filter((read) => read.options !== READ_OPTIONS);

    // Assert
    expect(borrowed).toEqual([]);
    expect(reads).toHaveLength(23);
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
    // One object is handed to every read, so a caller writing
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

describe('what each write hook invalidates and records', () => {
  it('drives every write the barrel exports', () => {
    // The guard every claim below rests on. A write added to
    // `./api.ts` and given a hook here but no table row would be
    // covered by nothing and reported by nothing — and the surface
    // tests above would still pass, because the hook itself exists.
    // Arrange / Act
    const driven = WRITE_HOOKS.map((write) => write.writes).sort();

    // Assert
    expect(driven).toEqual(
      Object.keys(api)
        .filter((name) => !name.startsWith('fetch'))
        .sort(),
    );
    expect(driven).not.toHaveLength(0);
  });

  it('invalidates only keys a read hook files under', async () => {
    // The total claim, and the one a per-hook literal cannot make: a
    // write invalidating a key nothing ever files under would be a
    // typo that costs nothing and does nothing, and no case comparing
    // that key against itself would notice. Read off the MODULE rather
    // than off the table, so it is the hooks that are under test.
    // Arrange
    const readable = new Set([
      ...SLUGS.flatMap((slug) => DOMAIN_RESOURCES.map(
        (resource) => JSON.stringify(domainQueryKey(slug, resource)),
      )),
      ...DEPLOYMENT_RESOURCES.map(
        (resource) => JSON.stringify(deploymentQueryKey(resource)),
      ),
    ]);

    // Act
    const filed = await everyInvalidatedKey();

    // Assert
    expect(
      filed.filter((key) => !readable.has(JSON.stringify(key))),
    ).toEqual([]);
    expect(filed).not.toHaveLength(0);
  });

  it('never invalidates with an empty key', async () => {
    // The hazard this module's header names: react-query matches by
    // PREFIX, so an EMPTY key matches every query in the cache and the
    // narrowest write here would quietly become the widest. It cannot
    // happen while the keys come from the two builders — both answer
    // two segments — so what this guards is a later hand-built one.
    // {@link hooks.useApproveSourceConfig} is what makes it worth
    // asserting rather than assuming: it is the hook with nothing to
    // invalidate, and an empty LIST is the shape that expresses that.
    // Named here so the day it gains a key, this reads as the decision
    // moving rather than as a test nobody looked at.
    // Arrange
    const emptyNames = WRITE_HOOKS
      .filter((write) => write.invalidates(DEFAULT_DOMAIN_SLUG).length === 0)
      .map((write) => write.name);

    // Act
    const filed = await everyInvalidatedKey();

    // Assert
    expect(filed.filter((key) => key.length === 0)).toEqual([]);
    expect(emptyNames).toEqual(['useApproveSourceConfig']);
  });

  WRITE_HOOKS.forEach((write) => {
    it(`invalidates exactly its own keys: ${write.name}`, async () => {
      // The claim this block exists for, per hook and per domain.
      // Both domains for a scoped hook, because a hook that resolved
      // its slug for the accessor and hardcoded one for the key would
      // agree on the default domain and file the sparse domain's save
      // against the seeded domain's cache entry.
      // Arrange
      const expected = slugsFor(write).map((slug) => write.invalidates(slug));

      // Act
      const filed = await invalidationsFor(write);

      // Assert
      expect(filed).toEqual(expected);
    });

    it(`invalidates only after the write resolves: ${write.name}`, () => {
      // Structural, and the one ordering claim a recorder can make:
      // the invalidation hangs off `onSuccess` and off nothing else.
      // `onSettled` and `onError` both run for a REJECTED write — a
      // save refused for an unknown domain records nothing, so
      // invalidating there would re-read every key it named to be told
      // the same rows again — and `onMutate` runs before the write has
      // happened at all. Asserted as the whole option set rather than
      // as the presence of `onSuccess`, so a second callback appearing
      // beside it fails here.
      // Arrange / Act
      const options = mutated(write.hook(DEFAULT_DOMAIN_SLUG));

      // Assert
      expect(Object.keys(options).sort()).toEqual(['mutationFn', 'onSuccess']);
      expect(typeof options.mutationFn).toBe('function');
    });

    it(`records through ./api.ts: ${write.name}`, async () => {
      // The other half of the wiring, and what the key assertions
      // cannot see: a hook filed under the right key but calling the
      // wrong accessor records somebody else's resource. Driven
      // against the SPARSE domain, which is where the cross-domain
      // claim is testable — an accessor hardcoded to the seeded slug
      // files nothing under this scope and the identity assertion
      // reddens. (The read side has no such leg: a read of the sparse
      // domain overlays an empty list whatever scope it built.)
      // Arrange
      const mutation = mutated(write.hook(SPARSE_DOMAIN_SLUG));

      // Act
      await mutation.mutationFn(write.variables(PROBE));
      const answered = write.readBack(SPARSE_DOMAIN_SLUG, PROBE);

      // Assert
      expect(answered).toEqual(PROBE);
      expect(answered).not.toBe(PROBE);
    });
  });

  SCOPED_WRITE_HOOKS.forEach((write) => {
    it(`resolves an absent route param: ${write.name}`, async () => {
      // What the pages get to rely on, in the shape the read hooks
      // already claim it: they hand over `useParams().domainSlug` raw,
      // and the single-domain base's `undefined` still reaches the
      // default domain. Asserted on BOTH halves, because a hook that
      // resolved for the accessor and not for the keys would record
      // the edit correctly and then invalidate a cache entry filed
      // under the empty string, which nothing would ever read.
      // Arrange
      const expected = write.invalidates(DEFAULT_DOMAIN_SLUG);
      const mutation = mutated(write.hook());

      // Act
      await mutation.mutationFn(write.variables(PROBE));
      await mutation.onSuccess();

      // Assert
      expect(write.readBack(DEFAULT_DOMAIN_SLUG, PROBE)).not.toBe(PROBE);
      expect(invalidatedKeys()).toEqual(expected);
    });

    it(`defers an unknown domain: ${write.name}`, async () => {
      // A save must refuse a domain nothing carries exactly as a read
      // does, and refuse it as a REJECTION rather than a throw — the
      // mutation renders that as an error state, where a synchronous
      // throw out of the hook body would take the surface down with
      // the modal. The `typeof` is what says the hook handed over a
      // function rather than an already-started write.
      // Arrange
      const mutation = mutated(write.hook('no-such-domain'));

      // Act / Assert
      expect(typeof mutation.mutationFn).toBe('function');
      await expect(mutation.mutationFn(write.variables(PROBE))).rejects
        .toThrow('Unknown domain slug: no-such-domain');
    });

    it(`records nothing when it refuses: ${write.name}`, async () => {
      // The rule `./api.ts` states about its write half, read from
      // this side: the refusal happens before a draft is filed, so a
      // save to a domain that has gone leaves the store holding no
      // edit for a page that could never render it.
      // Arrange
      const mutation = mutated(write.hook('no-such-domain'));

      // Act
      await expect(mutation.mutationFn(write.variables(PROBE))).rejects
        .toThrow();

      // Assert
      expect(write.readBack('no-such-domain', PROBE)).toBe(PROBE);
      expect(write.readBack(DEFAULT_DOMAIN_SLUG, PROBE)).toBe(PROBE);
      expect(write.readBack(SPARSE_DOMAIN_SLUG, PROBE)).toBe(PROBE);
    });
  });
});
