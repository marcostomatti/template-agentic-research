/**
 * @packageDocumentation
 * The domain fixtures — the workspace level every other fixture in this
 * directory hangs off, and the base the URL carries.
 *
 * Content is transcribed from `packages/service/data/domains.json`, the
 * seed that ships with the service. Transcribed rather than imported,
 * for the reason `./types.ts` redeclares the schema rather than
 * importing it: `@ar/web` has no dependency on `@ar/service` and should
 * not take one to borrow a JSON file. What that buys is a shell
 * rehearsed against the settings payload an operator will actually meet
 * — the same weights, the same verdict ladder, the same field contract
 * — rather than against a shape invented to make a page look full. What
 * it costs is that nothing holds the two copies in step, so
 * `domains.test.ts` pins all three payloads exactly and names the seed
 * path beside them: a drift is then a diff against a file, not a
 * discovery.
 *
 * There are TWO domains, and both halves of that are deliberate.
 *
 * Two at all, because `@ar/ui`'s `WorkspaceSwitcher` renders `null`
 * below two workspaces. A one-domain fixture set would show no
 * switcher, which would leave the `/d/:domainSlug` base unreachable
 * from the UI and the domain-switch e2e spec with no control to drive.
 *
 * The second one SPARSE — `settings: {}`, which `./types.ts` records as
 * a complete value — because that is the other thing worth having
 * reachable in a demo. Every `DomainSettings` member is optional, so a
 * page that reads `settings.verdictVocabulary` and renders what it finds
 * works on the seeded domain and breaks on the first domain an operator
 * adds without configuring one. {@link resolveVerdictVocabulary} and
 * {@link resolveFieldContract} exist so that no page has to decide what
 * an absent member means, and the sparse domain is what makes a page
 * that skipped them fail here rather than in someone's deployment.
 *
 * That sparseness runs past this module: the fixture modules beside it
 * hold few or no rows for {@link SPARSE_DOMAIN_SLUG}, so switching to
 * it is how the shell's empty states are reached without emptying
 * anything.
 *
 * Both domains are illustrative and stay neutral about subject matter,
 * which is the stance the seed file takes and the reason they are safe
 * to ship in a tracked demo: real subject matter belongs to whoever
 * operates an instance.
 */

import type { Domain, DomainFieldSpec } from './types';

/**
 * Slug of the domain the single-domain base (`/`) resolves to.
 *
 * `routes/paths.ts` builds that base and deliberately does not know
 * which domain sits behind it; this is that answer, and
 * {@link resolveDomainSlug} is where the two meet. Downstream fixture
 * modules scope their rows by this constant rather than by the literal,
 * and take the numeric `domains.id` their rows reference off
 * {@link getDomain} rather than hardcoding it.
 */
export const DEFAULT_DOMAIN_SLUG = 'example-tech-radar';

/**
 * Slug of the deliberately unconfigured second domain.
 *
 * Exported for the same reason as {@link DEFAULT_DOMAIN_SLUG}: the
 * e2e domain-switch spec, the fixture modules beside this one and their
 * tests all need to name it, and six spellings of one literal is one
 * typo away from a fixture nobody can reach.
 */
export const SPARSE_DOMAIN_SLUG = 'example-reading-list';

/**
 * The verdict ladder a domain that names none is judged against.
 *
 * Redeclares `DEFAULT_VERDICT_VOCABULARY` in
 * `packages/service/src/db/schema/values.ts`. Ordered from most
 * negative to most positive, and the order is load-bearing: the digest
 * filter renders it as a ladder rather than as a set.
 *
 * Note the seeded domain's own `verdictVocabulary` currently IS this
 * same list, so both fixture domains resolve to the same four verdicts.
 * Nothing can tell the two apart by verdict, and a test asserting the
 * seeded domain's vocabulary would pass whether the explicit value or
 * the fallback produced it — `domains.test.ts` carries a domain of its
 * own to close that.
 */
export const DEFAULT_VERDICT_VOCABULARY: readonly string[] = [
  'avoid',
  'caution',
  'neutral',
  'interested',
];

/**
 * What {@link resolveFieldContract} answers for a domain that declares
 * no contract: nothing is constrained, and nothing is required.
 *
 * Frozen because the one object is handed to every such caller. The
 * type already forbids assignment, so this only closes the runtime
 * half.
 */
const EMPTY_FIELD_CONTRACT: Readonly<Record<string, DomainFieldSpec>> =
  Object.freeze({});

/**
 * The domain table, in switcher order — seeded domain first.
 *
 * Read directly where a component needs the whole list (the switcher
 * does); the functions below cover lookup and the absent-settings
 * rules. No accessor copies it: every member of {@link Domain} is
 * `readonly`, so handing the array out is not handing out a way to
 * change it.
 */
export const DOMAINS: readonly Domain[] = [
  {
    id: 1,
    slug: DEFAULT_DOMAIN_SLUG,
    name: 'Example Tech Radar',
    settings: {
      // The three payloads below are the transcription the module
      // docblock describes, from the `example-tech-radar` entry of
      // `packages/service/data/domains.json`. Keep them character-equal
      // to the seed: `domains.test.ts` pins each one, and the digest
      // fixtures are built to satisfy the contract as written here.
      scoringWeights: {
        termMatch: 3,
        sourceReliability: 2,
        recency: 1.5,
        entityInterest: 1,
      },
      verdictVocabulary: ['avoid', 'caution', 'neutral', 'interested'],
      fieldContract: {
        summary: { type: 'string', required: true },
        maturity: { type: 'string' },
        firstSeenAt: { type: 'datetime' },
        mentions: { type: 'number' },
        isOpenSource: { type: 'boolean' },
        tags: { type: 'list' },
        links: { type: 'object' },
      },
    },
    createdAt: '2026-04-02T09:15:00.000Z',
    updatedAt: '2026-06-09T11:40:00.000Z',
  },
  {
    id: 2,
    slug: SPARSE_DOMAIN_SLUG,
    name: 'Example Reading List',
    // Configures nothing at all, on purpose — see the module docblock.
    // A domain is a row plus a name; everything else has a default, and
    // this is what a domain looks like before anyone has exercised one.
    settings: {},
    // Never edited, so the two stamps are equal. A domain created and
    // left alone is exactly the state the empty settings describe, and
    // an `updatedAt` moved past `createdAt` would quietly say otherwise.
    createdAt: '2026-06-05T16:20:00.000Z',
    updatedAt: '2026-06-05T16:20:00.000Z',
  },
];

const DOMAINS_BY_SLUG = new Map<string, Domain>(
  DOMAINS.map((domain) => [domain.slug, domain]),
);

/**
 * Look a domain up by slug, tolerating a miss.
 *
 * Use this where an unknown slug is an ordinary outcome — a URL an
 * operator typed or a bookmark to a domain that has since gone. Where
 * it is not, {@link getDomain} says so louder.
 *
 * @param slug - Domain slug, as it appears in the URL.
 * @returns The domain, or `undefined` if no fixture carries that slug.
 */
export function findDomain(slug: string): Domain | undefined {
  return DOMAINS_BY_SLUG.get(slug);
}

/**
 * Look a domain up by slug, or throw.
 *
 * Throwing is what makes this the accessor `./api.ts` builds its
 * rejection on: an unknown slug has to fail somewhere, and failing at
 * the lookup means no page can render half a domain. Callers holding a
 * slug from the URL should decide with {@link findDomain} first.
 *
 * @param slug - Domain slug, as it appears in the URL.
 * @returns The domain carrying that slug.
 * @throws If no fixture domain carries it.
 */
export function getDomain(slug: string): Domain {
  const domain = findDomain(slug);

  if (domain === undefined) {
    throw new Error(`Unknown domain slug: ${slug}`);
  }

  return domain;
}

/**
 * Which domain a route is about, given what the URL supplied.
 *
 * The counterpart of `domainBase` in `routes/paths.ts`, and shaped to
 * take the same argument: `useParams` hands back `undefined` off the
 * domain-scoped routes, and that absence means the single-domain base,
 * which means {@link DEFAULT_DOMAIN_SLUG}.
 *
 * Deliberately does NOT check that the result names a fixture. Which
 * domain the caller means and whether that domain exists are two
 * questions, and answering the second here would make an unknown slug
 * throw before a page had a chance to render a not-found state.
 *
 * @param slug - Slug from the `:domainSlug` route param; `undefined`,
 * `null` or empty off the domain-scoped routes.
 * @returns The slug to load, which may not name a fixture domain.
 */
export function resolveDomainSlug(slug?: string | null): string {
  if (slug === undefined || slug === null || slug === '') {
    return DEFAULT_DOMAIN_SLUG;
  }

  return slug;
}

/**
 * The verdicts this domain's findings may be labelled with.
 *
 * Total where `settings.verdictVocabulary` is optional: a domain naming
 * no ladder is judged against {@link DEFAULT_VERDICT_VOCABULARY},
 * which is the rule the service applies and not a UI convenience. Every
 * surface that renders or filters on a verdict goes through here, so no
 * page carries its own answer for the absent case.
 *
 * @param domain - The domain whose findings are being labelled.
 * @returns Its own vocabulary, in order, or the default ladder.
 */
export function resolveVerdictVocabulary(domain: Domain): readonly string[] {
  return domain.settings.verdictVocabulary ?? DEFAULT_VERDICT_VOCABULARY;
}

/**
 * What this domain requires of a finding's `fields` payload.
 *
 * Total in the same way as {@link resolveVerdictVocabulary}, and for
 * the same reason: a domain declaring no contract constrains nothing,
 * which is an empty contract rather than a missing one. Callers can
 * then read the record without a branch of their own.
 *
 * There is no matching resolver for `settings.scoringWeights`. Nothing
 * in this shell renders the weights a score was combined from — the
 * digest shows the score — so a resolver for them would have no call
 * site to be right for.
 *
 * @param domain - The domain whose findings are being validated.
 * @returns Its field contract, or an empty one.
 */
export function resolveFieldContract(
  domain: Domain,
): Readonly<Record<string, DomainFieldSpec>> {
  return domain.settings.fieldContract ?? EMPTY_FIELD_CONTRACT;
}
