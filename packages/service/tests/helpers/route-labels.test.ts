/**
 * `tests/helpers/route-labels.ts` in the three claims its consumers
 * lean on: that {@link labelsOf} reads a router's own declaration in
 * one vocabulary, that {@link buildAuthRouterEntry} labels the auth
 * router at the mount `src/index.ts` actually serves it from, and
 * that {@link buildResearchRouters} answers a whole research surface
 * in which no router has quietly stopped declaring anything.
 *
 * THE WALK IS DRIVEN OVER HAND-BUILT ROUTERS rather than over the
 * seventeen the module builds, and that is the point of those cases
 * rather than a shortcut. The real routers are a moving surface —
 * a route added to any of them changes what a walk over them
 * answers — so a case asserting a figure taken off them measures
 * the routers and not the walk. A router built inside the case
 * declares exactly what the case says it declares, so the expected
 * labels are written out in full and an implementation that started
 * dropping or duplicating layers is named rather than absorbed.
 *
 * FOUR SHAPES, AND THE SECOND IS A BLIND SPOT BEING PINNED. Two
 * verbs on one path, a nested sub-router, a router registering
 * nothing, and a non-empty prefix. The nested case asserts that the
 * sub-router's own paths are ABSENT — `router.use(path, subRouter)`
 * produces a layer carrying no `route`, so the walk skips it — which
 * is a limitation rather than a feature and is written down here so
 * that a router which later mounts one fails a reading somebody has
 * seen instead of going quietly under-reported. Its positive half is
 * in the same case: the parent's OWN route still comes back, so the
 * assertion cannot be satisfied by a walk that had stopped answering
 * anything at all.
 *
 * THE EMPTY-ROUTER CASE IS THE ONE THAT NEEDS THE COMPANY. An empty
 * result is what a broken walk returns too, so it sits beside a
 * router carrying middleware and one route: both answer a single
 * label's worth of difference, and only the pair says the zero came
 * from there being nothing to report.
 *
 * THE DUPLICATES CASE IS LOAD-BEARING FOR THE AUTH ENTRY. Two
 * handlers on one verb answer the label twice, which is why
 * {@link buildAuthRouterEntry} carries four labels over three routes;
 * a walk that deduplicated would make that entry look correct while
 * silently changing what every consumer counting handlers reads.
 *
 * THE ROSTER CASES DO READ THE REAL ROUTERS, which is the opposite
 * choice from the walk cases above and a different question. Whether
 * the walk is correct cannot be asked of a moving surface; whether
 * that surface is still whole can be asked of nothing else. So the
 * per-router label counts are pinned as a NAME-KEYED RECORD rather
 * than as a total: fifty-two stays fifty-two when one router loses a
 * route and another gains one, and a router that stopped registering
 * altogether disappears into any single number, where the record
 * names it. Those counts are expected to move as routes are added,
 * and that is the reading rather than the cost — a red says WHICH
 * router moved.
 */

import type { DeclaredRouter } from './route-labels.js';
import type { Request, Response, NextFunction } from 'express';

import { Router } from 'express';
import { describe, expect, it } from 'vitest';

import {
  buildAuthRouterEntry,
  buildResearchRouters,
  labelFor,
  labelsOf,
} from './route-labels.js';

/**
 * A handler that ends the response, for a route registered only to
 * be walked.
 *
 * Never called: every router below is constructed and read, and no
 * request is ever made against one.
 *
 * @param _request - Unread.
 * @param response - Ended, so the handler is a legal terminal one.
 */
function noopHandler(_request: Request, response: Response): void {
  response.end();
}

/**
 * A middleware that passes straight through.
 *
 * Registered to put a layer carrying no `route` into a stack, which
 * is the layer shape the walk has to skip.
 *
 * @param _request - Unread.
 * @param _response - Unread.
 * @param next - Called immediately.
 */
function passThrough(
  _request: Request,
  _response: Response,
  next: NextFunction,
): void {
  next();
}

/**
 * A name the research roster answers.
 *
 * Present so that the membership readings below are paired: a
 * refusal on its own is satisfied by an empty roster, where a
 * refusal beside a name that IS answered is not.
 */
const DECLARED_ROUTER = 'domains';

/** A label {@link DECLARED_ROUTER} answers, for the collision plant. */
const DECLARED_LABEL = 'GET /domains';

/** A name no router answers. The roster's refusal reading. */
const FABRICATED_ROUTER = 'zz-not-a-router';

/** The name every planted control entry below is added under. */
const PLANTED_ROUTER = 'zz-planted-router';

/**
 * How many labels each research router declares, keyed by the name
 * {@link buildResearchRouters} answers it under.
 *
 * Measured off the routers rather than transcribed, and expected to
 * move: a route added anywhere on the research surface reddens
 * exactly one entry here. That is the reading rather than the cost.
 * A total absorbs one router losing a route while another gains one,
 * and absorbs a router that stopped registering altogether once its
 * neighbours have grown by as much; keyed by name, the diff says
 * WHICH router moved.
 */
const RESEARCH_LABEL_COUNTS: Readonly<Record<string, number>> = {
  domains: 5,
  categories: 4,
  terms: 4,
  personas: 4,
  settings: 2,
  topics: 6,
  sources: 4,
  'source-failures': 1,
  connectors: 4,
  exports: 5,
  findings: 3,
  documents: 1,
  entities: 4,
  runs: 2,
  spend: 1,
  proposals: 2,
};

/**
 * One roster entry as the record member it is compared under.
 *
 * @param entry - A roster entry.
 * @returns Its name and how many labels it declared.
 */
function labelCountOf(entry: DeclaredRouter): [string, number] {
  return [entry.name, entry.labels.length];
}

/**
 * The names of every roster entry declaring no label at all.
 *
 * @param entries - A roster, in the shape
 *   {@link buildResearchRouters} answers.
 * @returns One name per silent entry, so a failure names the router
 *   rather than reporting a count that names nobody.
 */
function silentRouters(entries: readonly DeclaredRouter[]): string[] {
  return entries
    .filter((entry) => entry.labels.length === 0)
    .map((entry) => entry.name);
}

/**
 * Every label a roster answers more than once, with its owners.
 *
 * @param entries - A roster, in the shape
 *   {@link buildResearchRouters} answers.
 * @returns One `GET /x <- a, b` line per repeated label, sorted, and
 *   the empty array when the union is distinct. Two routers claiming
 *   one label and one router repeating its own read the same way,
 *   which is what the owners are there to tell apart.
 */
function duplicatedLabels(entries: readonly DeclaredRouter[]): string[] {
  const owners = new Map<string, readonly string[]>();

  for (const entry of entries) {
    for (const label of entry.labels) {
      owners.set(label, [...(owners.get(label) ?? []), entry.name]);
    }
  }

  return [...owners.entries()]
    .filter(([, names]) => names.length > 1)
    .map(([label, names]) => `${label} <- ${names.join(', ')}`)
    .sort();
}

describe('labelFor', () => {
  it('uppercases the verb and joins it to the path with one space', () => {
    expect(labelFor('get', '/domains/:slug')).toBe('GET /domains/:slug');
  });

  it('leaves an already-uppercased verb alone', () => {
    expect(labelFor('DELETE', '/domains/:slug'))
      .toBe('DELETE /domains/:slug');
  });

  it('leaves the path untouched, parameters and casing included', () => {
    expect(labelFor('patch', '/Source-Failures/:id'))
      .toBe('PATCH /Source-Failures/:id');
  });
});

describe('labelsOf', () => {
  it('answers one label per verb for two verbs on one path', () => {
    const router = Router();
    router.get('/things/:id', noopHandler);
    router.patch('/things/:id', noopHandler);

    expect(labelsOf(router, '')).toStrictEqual([
      'GET /things/:id',
      'PATCH /things/:id',
    ]);
  });

  it('answers both verbs when one path is registered by .route()', () => {
    const router = Router();
    router
      .route('/things')
      .get(noopHandler)
      .post(noopHandler);

    expect(labelsOf(router, '')).toStrictEqual([
      'GET /things',
      'POST /things',
    ]);
  });

  it('repeats a label once per handler on the same verb', () => {
    const router = Router();
    router.get('/things', passThrough, noopHandler);

    // The duplicates contract, and the reason the auth entry carries
    // four labels over three routes. A walk that deduplicated here
    // would leave that entry looking right and every handler count
    // wrong.
    expect(labelsOf(router, '')).toStrictEqual([
      'GET /things',
      'GET /things',
    ]);
  });

  it('skips a nested sub-router and keeps the parent own route', () => {
    const nested = Router();
    nested.get('/leaf', noopHandler);

    const parent = Router();
    parent.use('/nest', nested);
    parent.get('/own', noopHandler);

    const labels = labelsOf(parent, '');

    // The blind spot, pinned rather than fixed: a `use` layer carries
    // no `route`, so nothing the sub-router declares is reachable
    // from the parent's stack. The parent's own route coming back is
    // what stops this reading as a walk that answers nothing.
    expect(labels).toStrictEqual(['GET /own']);
    expect(labels).not.toContain('GET /nest/leaf');
    expect(labels).not.toContain('GET /leaf');

    // ... and the sub-router walked directly does declare it, so the
    // absence above is the composition and not an empty router.
    expect(labelsOf(nested, '/nest')).toStrictEqual(['GET /nest/leaf']);
  });

  it('answers nothing for a router that registered nothing', () => {
    expect(labelsOf(Router(), '')).toStrictEqual([]);
  });

  it('answers nothing for a router carrying middleware alone', () => {
    const router = Router();
    router.use(passThrough);

    // The empty case's control: this router has a non-empty stack and
    // still contributes no label, so the zero above is about there
    // being no ROUTE rather than about there being no layer.
    expect(router.stack.length).toBeGreaterThan(0);
    expect(labelsOf(router, '')).toStrictEqual([]);

    router.get('/after', noopHandler);
    expect(labelsOf(router, '')).toStrictEqual(['GET /after']);
  });

  it('prepends a non-empty prefix to every path it answers', () => {
    const router = Router();
    router.get('/things/:id', noopHandler);
    router.delete('/things/:id', noopHandler);
    router.get('/', noopHandler);

    expect(labelsOf(router, '/api')).toStrictEqual([
      'GET /api/things/:id',
      'DELETE /api/things/:id',
      'GET /api/',
    ]);
  });

  it('composes the prefix by concatenation and nothing else', () => {
    const router = Router();
    router.get('/things', noopHandler);

    // No slash is inserted, collapsed or trimmed. A caller handing in
    // a prefix with a trailing slash gets the doubled one it asked
    // for, which is what makes the mount string the caller's to get
    // right rather than something this walk quietly repairs.
    expect(labelsOf(router, '/api/')).toStrictEqual(['GET /api//things']);
    expect(labelsOf(router, 'api')).toStrictEqual(['GET api/things']);
  });
});

describe('buildResearchRouters', () => {
  it('answers sixteen entries, keyed by router name', () => {
    const entries = buildResearchRouters();

    expect(entries).toHaveLength(16);

    // The length is not redundant beside the record: two entries
    // sharing a name collapse into one key, which leaves fifteen
    // members here and sixteen entries there.
    const counts = Object.fromEntries(entries.map(labelCountOf));

    expect(counts).toStrictEqual(RESEARCH_LABEL_COUNTS);
  });

  it('answers at least one label for every entry', () => {
    const entries = buildResearchRouters();

    expect(silentRouters(entries)).toStrictEqual([]);

    // The zero above is a reading only because the same filter names
    // a planted entry that declares nothing: a filter that matched
    // nothing, and a roster that was empty, answer the same [].
    const planted = [...entries, { name: PLANTED_ROUTER, labels: [] }];

    expect(silentRouters(planted)).toStrictEqual([PLANTED_ROUTER]);
  });

  it('answers a union carrying no label twice', () => {
    const entries = buildResearchRouters();
    const union = entries.flatMap((entry) => [...entry.labels]);

    expect(duplicatedLabels(entries)).toStrictEqual([]);

    // Planted with a label the roster really answers, asserted
    // present in the same reading, so the zero above cannot be a
    // detector that only ever matches a fabricated string. Both
    // owners come back, which is what names the two sides of a
    // collision rather than merely counting one.
    const collided = [
      ...entries,
      { name: PLANTED_ROUTER, labels: [DECLARED_LABEL] },
    ];

    expect(union).toContain(DECLARED_LABEL);
    expect(duplicatedLabels(collided)).toStrictEqual([
      `${DECLARED_LABEL} <- ${DECLARED_ROUTER}, ${PLANTED_ROUTER}`,
    ]);
  });

  it('answers no router under a fabricated name', () => {
    const names = buildResearchRouters().map((entry) => entry.name);

    // Paired, or the refusal is satisfied by a roster that answered
    // nothing at all: a name the surface really carries is asserted
    // present in the same reading.
    expect(names).toContain(DECLARED_ROUTER);
    expect(names).not.toContain(FABRICATED_ROUTER);
  });
});

describe('buildAuthRouterEntry', () => {
  it('names the auth router and labels it at the mount served', () => {
    const entry = buildAuthRouterEntry();

    expect(entry.name).toBe('auth');

    // Three routes, four labels: `POST /login` carries its attempt
    // limiter as a second handler on the same verb. Both readings are
    // asserted so that a walk which started deduplicating, and one
    // which lost a route, fail differently.
    expect([...entry.labels]).toStrictEqual([
      'POST /auth/login',
      'POST /auth/login',
      'POST /auth/logout',
      'POST /auth/introspect',
    ]);
    expect(new Set(entry.labels).size).toBe(3);
  });

  it('reads the mount rather than answering router-relative paths', () => {
    const entry = buildAuthRouterEntry();

    // The mount read is the half with a failure mode of its own: it
    // throws when `src/index.ts` stops mounting at a literal. A
    // router-relative label would mean the read had silently answered
    // the empty string instead.
    for (const label of entry.labels) {
      expect(label.startsWith('POST /auth/')).toBe(true);
    }

    expect(entry.labels).not.toContain('POST /login');
  });
});
