import type { ReactNode } from 'react';
import type { RouteObject } from 'react-router';

import { matchRoutes } from 'react-router';
import { describe, expect, it } from 'vitest';

import { SINGLE_DOMAIN_BASE, SURFACES, withBase } from './paths';
import {
  DIGEST_DETAIL,
  LEXICON_EDITOR,
  MODAL_PLACEHOLDER,
  SOURCE_CONFIG_APPROVAL,
  SOURCE_EDITOR,
  SOURCE_FAILURES,
  NOT_FOUND,
  ROUTES,
} from './router';

// `matchRoutes` resolves a path against the route objects with nothing
// rendered and no browser present, which is the whole reason `./router.tsx`
// exports its tree as data rather than as a router. It answers most of what
// this file asks — does every surface resolve, does each declared modal
// sub-route keep its list surface matched, what does the leaf render, and
// does an unmatched path reach the catch-all — and it answers them for both
// bases off one array.
//
// One question it cannot answer is completeness: a path has to be built
// before it can be matched, so a registration nothing here names is never
// driven. That one reads the tree's own children instead.
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
 * A segment BELOW a row id that no modal sub-route answers at.
 *
 * `UNMATCHED` above names a surface that does not exist; this one sits
 * where a sub-route's own trailing segment would (`7/<this>`), which is
 * the near miss saying a surface's sub-routes are matched whole and that
 * its list route does not swallow whatever follows a row id. The guard
 * below keeps it from colliding with a real one as the table grows.
 */
const FABRICATED_SEGMENT = 'not-a-sub-route';

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
 * The modal sub-routes each surface declares, keyed by surface id, with
 * an empty list for a surface that carries none.
 *
 * A LIST per surface because the route table is one: a surface may
 * declare more than one address over its list, and a reader that could
 * only hold the first would leave the second untested with every
 * assertion below still green.
 *
 * Written out rather than read back off the route tree: a table derived
 * from the thing under test can only ever agree with it. Two tests keep
 * it honest — the set-equality one below as SURFACES are added, and
 * `carries exactly the sub-routes this file states` as REGISTRATIONS
 * are, which is the one that reports a sub-route added to `./router.tsx`
 * and forgotten here.
 */
const MODAL_ROUTE_PATTERNS: Readonly<Record<string, readonly string[]>> = {
  digest: [ENTITY_PARAM],
  lexicon: [`${ENTITY_PARAM}/edit`],
  sources: [
    `${ENTITY_PARAM}/edit`,
    `${ENTITY_PARAM}/config`,
    `${ENTITY_PARAM}/failures`,
  ],
  agents: [`${ENTITY_PARAM}/edit`],
  tools: [`${ENTITY_PARAM}/edit`],
  settings: [],
};

/**
 * The patterns a surface's modal sub-routes are declared at.
 *
 * Tolerant of a surface the table above does not mention, deliberately: a
 * throwing reader called while the module or a `describe` body is
 * evaluated takes the whole file down before a single test runs, and the
 * one test that would have reported the gap by name goes with it.
 *
 * @param surfaceId - Nav id of the surface.
 * @returns Its relative route patterns, empty for a surface with none.
 */
function modalPatternsOf(surfaceId: string): readonly string[] {
  return MODAL_ROUTE_PATTERNS[surfaceId] ?? [];
}

/**
 * Every surface declaring at least one modal sub-route.
 *
 * Derived at module scope through the tolerant reader above, so a surface
 * the expectation table forgot drops out here rather than throwing at
 * collection time. The non-emptiness test below is what keeps that from
 * emptying the case tables silently.
 */
const MODAL_SURFACES = SURFACES.filter(
  (surface) => modalPatternsOf(surface.id).length > 0,
);

/**
 * How one registration is named in the rosters below.
 *
 * An ADDRESS and not a surface, which is what the sources' second
 * sub-route forced: a roster keyed by surface could hold `sources`
 * once, and that surface now opens two different modals. Keying by
 * the pair makes each registration claimable on its own and keeps the
 * partition test's no-duplicate check meaningful.
 *
 * @param surfaceId - Nav id of the surface.
 * @param pattern - The relative pattern the modal is declared at.
 * @returns The address, as the rosters spell it.
 */
function addressOf(surfaceId: string, pattern: string): string {
  return `${surfaceId} at ${pattern}`;
}

/**
 * The registrations that still render the placeholder.
 *
 * A LEDGER, written out rather than derived: it is the list of what
 * this wave has not built yet, and a roster read back off the route
 * tree could only ever agree with whatever the tree currently says.
 * It shrinks as each real modal lands, and the partition test below
 * is what refuses a registration that leaves it without joining a
 * test that makes a claim about its element instead. Both remaining
 * are EDITORS — the digest's read-only detail has landed, so this
 * roster no longer stands for two kinds of modal at once.
 */
const PLACEHOLDER_ADDRESSES: readonly string[] = [
  addressOf('agents', `${ENTITY_PARAM}/edit`),
  addressOf('tools', `${ENTITY_PARAM}/edit`),
];

/**
 * What each named ADDRESS renders, under both bases.
 *
 * Shared by the element tests so they drive the tree identically and
 * differ only in which registrations they ask about — the whole point
 * of splitting the ledger being that the CLAIM differs, not the
 * reading.
 *
 * @param addresses - The registrations to open, as {@link addressOf}
 * spells them.
 * @returns One row per address and base, naming the leaf element the
 * path resolved to.
 */
function openedElements(
  addresses: readonly string[],
): { at: string; element: ReactNode }[] {
  return BASES.flatMap(({ label, base }) => MODAL_SUB_ROUTES
    .filter(({ surface, pattern }) => addresses
      .includes(addressOf(surface.id, pattern)))
    .map(({ surface, pattern }) => ({
      at: `${label}: ${addressOf(surface.id, pattern)}`,
      element: leafElementOf(pathUnder(
        withBase(base, surface.id),
        pattern.replace(ENTITY_PARAM, ENTITY_ID),
      )),
    })));
}

/**
 * Every declared sub-route as its own case: a surface and ONE pattern.
 *
 * The matching tests below drive this rather than `MODAL_SURFACES`, so a
 * surface's second address is exercised as fully as its first instead of
 * riding on its neighbour's pass.
 */
const MODAL_SUB_ROUTES = MODAL_SURFACES.flatMap(
  (surface) => modalPatternsOf(surface.id).map((pattern) => ({
    surface,
    pattern,
  })),
);

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

/**
 * The sub-route patterns the ROUTE TREE declares under one surface.
 *
 * The one reader here that goes to the tree for an answer rather than
 * driving it with a path. Every matching test below is built from the
 * expectation table, so a registration the table forgot is simply never
 * asked about; this is what the completeness test holds it against.
 *
 * @param basePattern - Pattern one of the two bases is declared at.
 * @param segment - Path segment of the surface.
 * @returns One label per declared child, empty where the surface carries
 * no children at all.
 */
function declaredSubRoutesOf(
  basePattern: string,
  segment: string,
): readonly string[] {
  const base = ROUTES.find((route) => route.path === basePattern);
  const surface = base?.children?.find((route) => route.path === segment);

  return (surface?.children ?? []).map(routeLabel);
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
  it('states a sub-route list, possibly empty, for every surface', () => {
    // The expectation table is keyed by surface id, so a surface added
    // without an entry would quietly drop out of every test below — the
    // tolerant reader answers `[]` for it, which is indistinguishable
    // from a surface that genuinely declares none. This is the one that
    // reports it by name.
    // Arrange / Act
    const stated = [...Object.keys(MODAL_ROUTE_PATTERNS)].sort();

    // Assert
    expect(stated).toEqual(SURFACES.map((surface) => surface.id).sort());
  });

  it('has at least one surface carrying a modal sub-route', () => {
    // Every case table below is built off one of these two, so an empty
    // list would leave them comparing two empty lists. Both are asserted
    // because they can empty independently: a table of surfaces that all
    // declare `[]` leaves the first non-empty and the second not.
    // Arrange / Act / Assert
    expect(MODAL_SURFACES.length).toBeGreaterThan(0);
    expect(MODAL_SUB_ROUTES.length).toBeGreaterThan(0);
  });

  it('carries exactly the sub-routes this file states, per base', () => {
    // The completeness leg. Every other test here drives a path built
    // from the expectation table, so a sub-route registered in
    // `./router.tsx` and left out of the table is never asked about and
    // every one of them stays green. This is the one that reads the tree
    // and holds it to the table — and it reads BOTH bases, because a
    // registration reaching only one of them is exactly what building
    // both from one factory is supposed to make impossible.
    // Arrange / Act
    const declared = BASES.flatMap(({ label, pattern }) => SURFACES.map((surface) => ({
      at: `${label}: ${surface.id}`,
      patterns: declaredSubRoutesOf(pattern, surface.segment),
    })));

    // Assert
    expect(declared).toEqual(
      BASES.flatMap(({ label }) => SURFACES.map((surface) => ({
        at: `${label}: ${surface.id}`,
        patterns: [...modalPatternsOf(surface.id)],
      }))),
    );
  });

  it('keeps its list surface matched, under both bases', () => {
    // The claim the trailing-`Outlet` pattern rests on: a modal path does
    // not REPLACE its list surface in the chain, it appends to it. Assert
    // the whole chain rather than just that the deep path matched
    // something — a sibling route would match too, and would render the
    // modal with no list behind it.
    //
    // Driven per PAIR rather than per surface, so a surface's second
    // declared address is matched on its own rather than inheriting its
    // neighbour's pass.
    // Arrange
    const cases = BASES.flatMap(({ label, base, pattern }) => MODAL_SUB_ROUTES
      .map(({ surface, pattern: modalPattern }) => ({
        at: `${label}: ${surface.id} at ${modalPattern}`,
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

  it('opens the shared placeholder at every address still owed one', () => {
    // `toBe`, not a render: matching says nothing about what sits behind
    // the address, and the placeholder is one shared element across every
    // registration and both bases — which is what makes identity askable
    // here at all.
    //
    // This is a LEDGER of what has no real modal yet, so it shrinks as
    // the editors land; a registration pointing somewhere else is
    // reported here by the path it was driven with. The partition test
    // below is what stops a surface leaving this list without joining
    // one that makes a claim about it.
    // Arrange / Act
    const opened = openedElements(PLACEHOLDER_ADDRESSES);

    // Assert
    expect(opened.filter((row) => row.element !== MODAL_PLACEHOLDER))
      .toEqual([]);
    expect(opened).toHaveLength(PLACEHOLDER_ADDRESSES.length * BASES.length);
  });

  it('opens the lexicon term editor at its own sub-route', () => {
    // The other side of the ledger, and the reason the route table
    // carries an ELEMENT per entry rather than one shared placeholder
    // for all of them: a surface's modal is its own.
    // Arrange / Act
    const opened = openedElements([
      addressOf('lexicon', `${ENTITY_PARAM}/edit`),
    ]);

    // Assert
    expect(opened.filter((row) => row.element !== LEXICON_EDITOR))
      .toEqual([]);
    expect(opened).toHaveLength(BASES.length);
  });

  it('opens the sources feed editor at its own sub-route', () => {
    // The third real element, and the one that leaves the ledger
    // above describable in two words. Driven exactly as its
    // neighbours are: the CLAIM differs, the reading does not.
    //
    // Named by ADDRESS rather than by surface, which is what the
    // config approval below made necessary: `sources` now opens two
    // different modals, so a roster naming the surface would put both
    // of them in this claim and pass on neither.
    // Arrange / Act
    const opened = openedElements([
      addressOf('sources', `${ENTITY_PARAM}/edit`),
    ]);

    // Assert
    expect(opened.filter((row) => row.element !== SOURCE_EDITOR))
      .toEqual([]);
    expect(opened).toHaveLength(BASES.length);
  });

  it('opens the sources config approval at its second sub-route', () => {
    // The registration the route table's LIST shape was widened for,
    // and the first one to use it. Every test above it passed
    // identically while every surface held one entry, so this is the
    // leg that says the widening reaches both bases — a second
    // address is a table row and nothing about building a base had to
    // learn it.
    // Arrange / Act
    const opened = openedElements([
      addressOf('sources', `${ENTITY_PARAM}/config`),
    ]);

    // Assert
    expect(opened.filter((row) => row.element !== SOURCE_CONFIG_APPROVAL))
      .toEqual([]);
    expect(opened).toHaveLength(BASES.length);
  });

  it('opens the sources failures list at its third sub-route', () => {
    // The registration that says the table's LIST shape holds more
    // than a pair. Driven exactly as its two neighbours are: what
    // differs is the CLAIM, and what it claims is that a third
    // address under one surface reaches its own element under both
    // bases rather than falling back to either sibling.
    // Arrange / Act
    const opened = openedElements([
      addressOf('sources', `${ENTITY_PARAM}/failures`),
    ]);

    // Assert
    expect(opened.filter((row) => row.element !== SOURCE_FAILURES))
      .toEqual([]);
    expect(opened).toHaveLength(BASES.length);
  });

  it('opens the digest detail at its own sub-route', () => {
    // The element that says the ledger is a PARTITION rather than a
    // shrinking list: this modal is not an editor, so its
    // registration could never have been satisfied by whatever the
    // two remaining surfaces eventually open.
    // Arrange / Act
    const opened = openedElements([addressOf('digest', ENTITY_PARAM)]);

    // Assert
    expect(opened.filter((row) => row.element !== DIGEST_DETAIL))
      .toEqual([]);
    expect(opened).toHaveLength(BASES.length);
  });

  it('leaves no declared sub-route out of the claims above', () => {
    // Without this the tests above are each satisfiable by a list that
    // quietly stopped covering a registration: an address in NO roster
    // is asserted about by nothing, and one in TWO would make one of
    // them wrong about the other's element.
    //
    // Over ADDRESSES rather than surfaces, which is what makes the
    // duplicate check bite now that one surface declares two: a
    // partition over surface ids could not tell the sources editor
    // from the sources approval at all.
    // Arrange
    const claimed = [
      ...PLACEHOLDER_ADDRESSES,
      addressOf('lexicon', `${ENTITY_PARAM}/edit`),
      addressOf('sources', `${ENTITY_PARAM}/edit`),
      addressOf('sources', `${ENTITY_PARAM}/config`),
      addressOf('sources', `${ENTITY_PARAM}/failures`),
      addressOf('digest', ENTITY_PARAM),
    ];
    const declared = MODAL_SUB_ROUTES.map(
      ({ surface, pattern }) => addressOf(surface.id, pattern),
    );

    // Assert
    expect([...claimed].sort()).toEqual([...declared].sort());
    expect(new Set(claimed).size).toBe(claimed.length);
  });

  it('names the row it was opened on in the params', () => {
    // Arrange / Act
    const opened = MODAL_SUB_ROUTES.map(({ surface, pattern }) => {
      const path = pathUnder(
        withBase(SINGLE_DOMAIN_BASE, surface.id),
        pattern.replace(ENTITY_PARAM, ENTITY_ID),
      );

      return {
        at: `${surface.id} at ${pattern}`,
        entityId: paramsOf(path).entityId,
      };
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

  it('fabricates a segment no declared sub-route answers at', () => {
    // The vacuity guard on the case below. FABRICATED_SEGMENT has to name
    // nothing the table declares, and the table grows — so read the
    // trailing segment of every declared pattern and assert the
    // fabricated one is not among them. `edit` asserted PRESENT in the
    // same case is the control: it says the tails were actually read,
    // where a reader answering nothing would satisfy the `not` alone.
    // Arrange / Act
    const tails = MODAL_SUB_ROUTES.map(
      ({ pattern }) => pattern.split('/').at(-1),
    );

    // Assert
    expect(tails).toContain('edit');
    expect(tails).not.toContain(FABRICATED_SEGMENT);
  });

  it('claims a fabricated segment below a row, under both bases', () => {
    // One segment past every declared sub-route: `7/<fabricated>` is two
    // deep under the digest's bare `:entityId` and a near miss on every
    // trailing segment the others declare — `edit` on four surfaces,
    // and `config` and `failures` on the sources. Both readings are
    // the same claim —
    // a sub-route pattern is matched WHOLE, and a list route does not
    // swallow whatever trails a row id — and the catch-all is where the
    // path lands when it holds.
    // Arrange
    const cases = BASES.flatMap(({ label, base, pattern }) => MODAL_SURFACES
      .map((surface) => ({
        at: `${label}: ${surface.id}`,
        path: pathUnder(
          withBase(base, surface.id),
          `${ENTITY_ID}/${FABRICATED_SEGMENT}`,
        ),
        chain: [pattern, '*'],
      })));

    // Act
    const matched = cases.map(({ at, path }) => ({ at, chain: chainOf(path) }));

    // Assert
    expect(matched).toEqual(cases.map(({ at, chain }) => ({ at, chain })));
  });

  it('claims a modal path on a surface that declares none', () => {
    // Arrange
    const withoutModal = SURFACES.filter(
      (surface) => modalPatternsOf(surface.id).length === 0,
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
