/**
 * `src/topics/service.ts` — what the four topic operations refuse.
 * Driven over `tests/helpers/memory-research-store.ts`, so every
 * claim here is answered with no database anywhere.
 *
 * Five claims, all of them about the ways this module says no. The
 * reads and writes it lets through are asserted in cases of their
 * own beside these; what appears here is the narrow CONTROL each
 * refusal needs, varied along the one axis the refusal turns on,
 * because a module refusing everything passes every assertion a
 * refusal case makes on its own.
 *
 * THAT AN ADDRESS NAMING NOTHING IS A 404 ON ALL FOUR OPERATIONS,
 * and that the two addresses are told apart. A `:slug` naming no
 * domain and an `:id` naming no topic are fixed in different
 * places, so a module answering one sentence to both would send
 * an operator to the wrong one — a distinction pinned without
 * pinning either wording, since the sentences are free to be
 * reworded and the difference is not.
 *
 * THAT A NAME THE DOMAIN ALREADY RESEARCHES IS A 409 FROM BOTH
 * WRITES THAT CAN PROPOSE ONE. `TopicPatch` carries `name`, as
 * `PersonaPatch` carries `role` and unlike the two wave-1 patches
 * that refuse to carry their natural key, so a rename can collide
 * exactly as a create can and the table is driven through both.
 * `StoreRefusal` is deliberately not an `AppError`, so an
 * untranslated one answers 500; the cases pin the translation
 * rather than merely that something was thrown. Three controls
 * follow, and the third is the one the first two cannot stand in
 * for: the key is unique within the DOMAIN and not across the
 * table, so the same name under a second domain has to be
 * accepted, and a service or a store holding it globally is green
 * against every other case in this file.
 *
 * THAT A BODY IS PARSED HERE, not above. Every row of the body
 * table is submitted to a SERVICE function rather than to a
 * schema, which is what says an MCP tool in wave 3 cannot be
 * handed a payload the HTTP route would have refused. Both
 * operations that take a body have rows of their own, since a row
 * driven through only one of them pins nothing about the other,
 * and both orderings are pinned: a malformed body outranks a slug
 * that names nothing AND an id that names nothing.
 *
 * Three of those rows are the ones this file exists for, and each
 * has the control that makes it readable. An `intervalSeconds` of
 * ZERO is refused, and one of ONE SECOND is accepted — a single
 * step from the boundary, so a schema that had stopped checking
 * the interval at all fails the first and a schema refusing every
 * interval fails the second. A `searchTerms` entry that is not a
 * string is refused NAMING ITS INDEX, while an empty list is
 * accepted, which is what separates a per-entry check from a
 * check of the list as a whole. And `nextRunAt`, `flagged` and
 * every other member no schema here declares are refused as
 * unrecognized keys, which is `.strict()` doing its ordinary work
 * rather than a per-column check — the reason the refusal holds
 * for a column nobody has added yet.
 *
 * THAT THE TWO REASONS THE PORT DECLARES ARE TOLD APART,
 * INCLUDING THE ONE ONLY A LOST RACE REACHES. `createTopic`
 * resolves the domain and only then writes, so a foreign-key
 * refusal means the row went between the two — a state the
 * ordinary fixture cannot produce and which is therefore
 * RECONSTRUCTED rather than stubbed: the domain is really
 * deleted, the lookup really answers the row it had, and what the
 * write meets is the store's own refusal. Beside it sit the two
 * rethrow cases, which are what says a reason `TopicStore` does
 * not declare answers 500 rather than a plausible status no rule
 * authorised.
 *
 * THAT NOTHING SUBMITTED COMES BACK. The containment block counts
 * occurrences of a sentinel in the serialised refusal rather than
 * asserting absence, and takes the same count over a planted
 * envelope — a search that would find nothing anywhere reports a
 * clean refusal and a leaking one alike. Its two conflict rows
 * plant their OWN colliding name rather than colliding with the
 * fixture's, because the value a duplicate refusal is likeliest
 * to quote is the one the request collided ON: a row reusing a
 * fixture name would leave exactly that channel unmeasured while
 * looking identical in the output.
 *
 * Mutation legs, run over this file with `--reporter=json` and read
 * as the failed case SET rather than as a count, against 71 cases.
 * Ten legs, each aimed at one rule, because a grid made of one
 * class leaves the other half green while looking thorough. Every
 * figure is a measurement over this case count and moves again if a
 * later task adds to this file.
 *
 * The two `.strict()` legs redden 5 and 4 and their sets are
 * DISJOINT, which is what says the two schemas are separately
 * pinned rather than sharing one `parseBody` nobody would notice
 * degrading. Each is exactly its half's undeclared-member rows plus
 * that half's containment row.
 *
 * Relaxing the shared interval schema from `.positive()` to
 * `.nonnegative()` reddens 6: the zero row and the zero-floor row
 * on each operation, plus BOTH ordering cases, which submit a zero
 * of their own. The negative and fractional rows stay green, which
 * is what says `.int()` and `.positive()` are separately pinned.
 *
 * The two term legs are the pair that reads the list against its
 * entries. Widening `searchTerms` to `z.array(z.unknown())` reddens
 * exactly 2 — the non-string entry row on each operation — and
 * leaves the whole-list row green. Narrowing it to `.min(1)`
 * reddens exactly 1, the empty-list control, which is what says
 * that control is not vacuous.
 *
 * The name legs nest. Rethrowing the unique refusal reddens 7 —
 * both 409 cases, both of their read-back controls, both
 * containment rows and the `cause` case — while answering that same
 * refusal a 404 reddens a strict SUBSET of 2, the two 409 cases
 * alone, because a wrong status still leaves an `AppError` for the
 * refusal helper to hand back and every read-back control still
 * sees a row nobody wrote.
 *
 * Three legs redden exactly the one case each is aimed at, which is
 * the narrowest reading here: collapsing the two 404 sentences into
 * one reddens only the distinctness case, resolving the domain
 * before parsing the create body reddens only that ordering case,
 * and collapsing the patch's nullable bounds with `??` reddens only
 * the cleared-bound control.
 *
 * What no module mutation reaches, by construction: the table
 * guards read only the tables beside them and are aimed at a later
 * edit, such as an operation added with no row or a body half
 * deleted whole. The planted containment control is invisible to
 * every leg for the same reason and deliberately so: it proves the
 * SEARCH, where the rethrow legs prove the SUBJECT.
 */

import type { TopicServiceStore } from './service.js';
import type { TopicRecord } from './store.js';
import type { FieldError } from '../../lib/errors/index.js';
import type {
  MemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';
import type { StoreWindow } from '../http/schemas.js';

import { describe, expect, it } from 'vitest';

import {
  AppError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../lib/errors/index.js';
import {
  createMemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';
import { StoreRefusal } from '../db/store-errors.js';

import {
  createTopic,
  deleteTopic,
  listTopics,
  patchTopic,
} from './service.js';

/** The seeded worked example, and the domain every case stores. */
const RADAR = 'example-tech-radar';

/** A second domain, invented in the same neutral register. */
const TRANSIT = 'example-urban-transit';

/** A slug shaped like one and carried by no row in any case here. */
const MISSING_SLUG = 'example-not-a-domain';

/** An id shaped like one and carried by no row in any case here. */
const MISSING_ID = 9999;

/**
 * An hour, as the cadence every planted topic runs at.
 *
 * Named rather than repeated, so the interval rows below are the
 * only place a number is being ARGUED about: a fixture spelling
 * `3600` eleven times invites a reader to wonder which of them
 * the boundary cases are varying.
 */
const HOURLY = 3600;

/**
 * A window wider than any collection planted here.
 *
 * Wide on purpose, because a REFUSAL is the subject of every case
 * in this file: a window narrow enough to be interesting would
 * make every list refusal depend on where its rows happened to
 * fall. What the window ARRIVES as rather than what it selects is
 * `src/http/schemas.ts`'s claim, and what it SELECTS belongs to
 * the cases about what this module lets through.
 */
const WIDE_WINDOW: StoreWindow = { limit: 50, offset: 0 };

/**
 * Two domains, three topics, and the store holding them.
 *
 * The shape is chosen so that the one refusal that has to be
 * WIDENED against is planted rather than asserted: {@link foreign}
 * carries the same name {@link transformers} does, under the other
 * domain. `topics_domain_id_name_unique` is per-domain, so a store
 * or a service holding it globally cannot even build this fixture
 * — every case in the file fails at its first line rather than one
 * case failing for the right reason. The explicit widening control
 * below is what turns that blunt signal into a named one.
 */
interface PlantedTopics {
  /** The store, holding {@link RADAR} and {@link TRANSIT}. */
  readonly store: MemoryResearchStore;

  /** A topic of {@link RADAR}, and the name a duplicate takes. */
  readonly transformers: TopicRecord;

  /** A second topic of {@link RADAR}, the one every patch moves. */
  readonly inference: TopicRecord;

  /** A topic of {@link TRANSIT}, carrying {@link transformers}'s name. */
  readonly foreign: TopicRecord;
}

/**
 * Plants that shape through the service under test.
 *
 * Through {@link createTopic} rather than through the store, so
 * every case starts from writes this module accepted. A planting
 * helper reaching past the subject would leave the whole file
 * green against a `createTopic` that refused everything.
 *
 * @returns The store and the three rows.
 */
async function plantTopics(): Promise<PlantedTopics> {
  const store = createMemoryResearchStore();

  await store.insertDomain({ slug: RADAR, name: 'Radar', settings: {} });
  await store.insertDomain({ slug: TRANSIT, name: 'Transit', settings: {} });

  const transformers = await createTopic(store, RADAR, {
    name: 'transformers',
    searchTerms: ['attention', 'transformer architecture'],
    intervalSeconds: HOURLY,
  });
  const inference = await createTopic(store, RADAR, {
    name: 'edge inference',
    searchTerms: ['on-device inference'],
    intervalSeconds: HOURLY,
    minIntervalSeconds: 600,
    maxIntervalSeconds: 86400,
  });
  const foreign = await createTopic(store, TRANSIT, {
    name: 'transformers',
    searchTerms: ['traction transformer'],
    intervalSeconds: HOURLY,
  });

  return { store, transformers, inference, foreign };
}

/**
 * Runs a call that has to be refused, and hands the refusal back.
 *
 * @param run - The call.
 * @returns The `AppError` it raised.
 * @throws When the call ANSWERED, so an operation whose refusal
 *   quietly stopped happening fails here — naming the refusal it
 *   wanted — rather than asserting over an error nobody built.
 *   Anything that is not an `AppError` is rethrown unchanged: a
 *   `StoreRefusal` reaching a caller is a bug in this module
 *   rather than one of its answers, and folding it in would report
 *   a 500 as a rule working.
 */
async function refusalFrom(run: () => Promise<unknown>): Promise<AppError> {
  try {
    await run();
  } catch (err) {
    if (err instanceof AppError) {
      return err;
    }

    throw err;
  }

  throw new Error('expected a refusal, and the call answered');
}

/**
 * The two facts a caller reads off each detail of a 422.
 *
 * `message` is not among them: every detail this module answers
 * with was built by `src/http/validation.ts`, whose wording is
 * asserted in that module's own file. What a field path and a code
 * say here is what THIS module asked for.
 *
 * @param details - `err.details`, absent when nothing built any.
 * @returns One `{ field, code }` per detail, in the order the
 *   details were raised.
 */
function detailsOf(
  details: readonly FieldError[] | undefined,
): { field: string; code: string }[] {
  return [...details ?? []].map((detail) => ({
    field: detail.field,
    code: detail.code ?? '',
  }));
}

/**
 * @param haystack - The text to search.
 * @param needle - The string to count.
 * @returns How many times the needle occurs. A count rather than a
 *   boolean, so a zero can be read against a known positive taken
 *   by this same function in the same case.
 */
function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

// ---------------------------------------------------------------------------
// An address that names nothing
// ---------------------------------------------------------------------------

/** Every function this module exports. */
const OPERATIONS = [
  'createTopic',
  'deleteTopic',
  'listTopics',
  'patchTopic',
];

/**
 * One operation asked for something that is not there, beside the
 * same operation asked for something that is.
 *
 * The control is a member of the row rather than a table of its
 * own, because the two are one claim: a 404 for an address naming
 * nothing means nothing unless the identical call against a real
 * address answers.
 */
interface MissingCase {
  /** The exported function under test, and the row label. */
  readonly operation: string;

  /**
   * Which address was wrong. Two subjects reach these four
   * operations — a `:slug` that names no domain, and a `:id` that
   * names no topic — and a caller has to be able to tell which,
   * since the two are fixed in different places.
   */
  readonly subject: 'domain' | 'topic';

  /** The call that has to be refused. */
  readonly refuse: (planted: PlantedTopics) => Promise<unknown>;

  /** The same call against an address that is there. */
  readonly control: (planted: PlantedTopics) => Promise<unknown>;
}

/** Every operation that can be handed an address naming no row. */
const MISSING_CASES: readonly MissingCase[] = [
  {
    operation: 'listTopics',
    subject: 'domain',
    refuse: ({ store }) => listTopics(store, MISSING_SLUG, WIDE_WINDOW),
    control: ({ store }) => listTopics(store, RADAR, WIDE_WINDOW),
  },
  {
    operation: 'createTopic',
    subject: 'domain',
    refuse: ({ store }) => createTopic(store, MISSING_SLUG, {
      name: 'retrieval augmentation',
      intervalSeconds: HOURLY,
    }),
    control: ({ store }) => createTopic(store, RADAR, {
      name: 'retrieval augmentation',
      intervalSeconds: HOURLY,
    }),
  },
  {
    operation: 'patchTopic',
    subject: 'topic',
    refuse: ({ store }) => patchTopic(store, MISSING_ID, {
      intervalSeconds: 900,
    }),
    control: ({ store, inference }) => patchTopic(store, inference.id, {
      intervalSeconds: 900,
    }),
  },
  {
    operation: 'deleteTopic',
    subject: 'topic',
    refuse: ({ store }) => deleteTopic(store, MISSING_ID),
    control: ({ store, inference }) => deleteTopic(store, inference.id),
  },
];

describe('an address that names nothing', () => {
  it('covers every operation this module exports', () => {
    // Paired by name rather than by count, so a fifth operation
    // added to the module without a row here is this case failing
    // rather than a table that quietly covers four of five. The
    // two schedule verbs land beside these and owe their own
    // rows, which is what this guard says when they do.
    expect(MISSING_CASES.map((row) => row.operation).sort())
      .toEqual([...OPERATIONS].sort());
  });

  it('carries rows for both addresses a path can name', () => {
    expect([...new Set(MISSING_CASES.map((row) => row.subject))].sort())
      .toEqual(['domain', 'topic']);
  });

  for (const row of MISSING_CASES) {
    it(`answers 404 from ${row.operation}`, async () => {
      const planted = await plantTopics();
      const refusal = await refusalFrom(() => row.refuse(planted));

      expect(refusal).toBeInstanceOf(NotFoundError);
      expect(refusal.code).toBe('NOT_FOUND');
      expect(refusal.statusCode).toBe(404);
      expect(refusal.details).toBeUndefined();
    });

    it(`answers ${row.operation} for an address that is`, async () => {
      // The positive control for the row above, varied along the
      // one axis under test: the same operation, the same body, an
      // address that resolves. A module refusing everything passes
      // the refusal case and fails this one.
      const planted = await plantTopics();

      await expect(row.control(planted)).resolves.not.toThrow();
    });
  }

  it('says which of the two addresses was wrong', async () => {
    // Not a pin on the wording, which is free to change: a pin on
    // the DISTINCTION. A module answering one sentence to both
    // would send an operator to fix a slug when the id was the
    // fault, and is green against every case above.
    const planted = await plantTopics();
    const said = new Map<string, Set<string>>();

    for (const row of MISSING_CASES) {
      const refusal = await refusalFrom(() => row.refuse(planted));
      const seen = said.get(row.subject) ?? new Set<string>();

      seen.add(refusal.message);
      said.set(row.subject, seen);
    }

    const messages = [...said].map(([subject, seen]) => ({
      subject,
      distinct: seen.size,
    }));

    // One sentence per subject, and two subjects: so the map holds
    // exactly two messages and neither is shared.
    expect(messages.sort((left, right) => left.subject < right.subject
      ? -1
      : 1)).toEqual([
      { subject: 'domain', distinct: 1 },
      { subject: 'topic', distinct: 1 },
    ]);

    const everySentence = [...said.values()].flatMap((seen) => [...seen]);

    expect(new Set(everySentence).size).toBe(2);
  });

  it('leaves the collection alone when it refuses', async () => {
    // A delete refused for naming nothing must not have taken
    // something else on the way past. Read back through the list,
    // not off the refusal.
    const planted = await plantTopics();

    await refusalFrom(() => deleteTopic(planted.store, MISSING_ID));

    const page = await listTopics(planted.store, RADAR, WIDE_WINDOW);

    expect(page.rows.map((row) => row.name))
      .toEqual(['edge inference', 'transformers']);
    expect(page.total).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// A name the domain already researches
// ---------------------------------------------------------------------------

/**
 * The two writes that can propose a name, and so the two that can
 * be refused for one.
 *
 * BOTH ARE HERE BECAUSE BOTH CAN REACH THE KEY. `TopicPatch`
 * carries `name`, as `PersonaPatch` carries `role`, so a table
 * driven through the create alone would leave the rename's
 * translation pinned by nothing — and a rename onto a taken name
 * is the likelier of the two in a deployment, since a subject is
 * typed once and re-scoped for months.
 */
interface DuplicateCase {
  /** What makes this row different from every other. */
  readonly label: string;

  /** The write proposing a name the domain already researches. */
  readonly refuse: (planted: PlantedTopics) => Promise<unknown>;
}

/** Both ways a caller can propose a name that is taken. */
const DUPLICATE_CASES: readonly DuplicateCase[] = [
  {
    label: 'a create under a name the domain researches',
    refuse: ({ store, transformers }) => createTopic(store, RADAR, {
      name: transformers.name,
      intervalSeconds: HOURLY,
    }),
  },
  {
    label: 'a rename onto a name the domain researches',
    refuse: ({ store, inference, transformers }) => patchTopic(
      store,
      inference.id,
      { name: transformers.name },
    ),
  },
];

describe('a name the domain already researches', () => {
  it('labels every row distinctly', () => {
    const labels = DUPLICATE_CASES.map((row) => row.label);

    expect(labels.length).toBe(new Set(labels).size);
  });

  for (const row of DUPLICATE_CASES) {
    it(`answers 409 to ${row.label}`, async () => {
      // `StoreRefusal` is deliberately not an `AppError`, so an
      // untranslated one answers 500 through the framework
      // handler. The assertions pin the translation and not merely
      // that something was thrown.
      const planted = await plantTopics();
      const refusal = await refusalFrom(() => row.refuse(planted));

      expect(refusal).toBeInstanceOf(ConflictError);
      expect(refusal.code).toBe('CONFLICT');
      expect(refusal.statusCode).toBe(409);

      // No `details`: the refusal is one fact, and the per-table
      // counts a domain delete carries have no analogue here.
      expect(refusal.details).toBeUndefined();
    });
  }

  it('creates under a name the domain does not research', async () => {
    // The narrow control: a module refusing every create passes
    // the create row above and fails this one.
    const { store } = await plantTopics();
    const created = await createTopic(store, RADAR, {
      name: 'retrieval augmentation',
      intervalSeconds: HOURLY,
    });

    expect(created.name).toBe('retrieval augmentation');
  });

  it('renames onto a name the domain does not research', async () => {
    // The same control for the other write. The two are separate
    // cases because the two translations are separate call sites,
    // and a module that had stopped translating one of them passes
    // the other's.
    const { store, inference } = await plantTopics();
    const patched = await patchTopic(store, inference.id, {
      name: 'retrieval augmentation',
    });

    expect(patched.name).toBe('retrieval augmentation');
    expect(patched.id).toBe(inference.id);
  });

  it('creates the same name under a second domain', async () => {
    // The WIDENING control, and the one the two narrow controls
    // cannot stand in for: the name is unique within the DOMAIN
    // and not across the table, so a service (or a store) holding
    // it globally passes every case above and fails only this.
    const planted = await plantTopics();
    const created = await createTopic(planted.store, TRANSIT, {
      name: planted.inference.name,
      intervalSeconds: HOURLY,
    });

    expect(created.name).toBe(planted.inference.name);
    expect(created.domainId).not.toBe(planted.inference.domainId);
  });

  it('leaves a topic holding the name it already had', async () => {
    // A row is not in conflict with itself: a patch naming the
    // name the addressed row already carries is a no-op and not a
    // 409. A store checking the resulting pair without excluding
    // the row being written refuses this, and nothing else in the
    // file reports it.
    const { store, inference } = await plantTopics();
    const patched = await patchTopic(store, inference.id, {
      name: inference.name,
    });

    expect(patched).toStrictEqual(inference);
  });

  it('leaves both rows standing when it refuses a rename', async () => {
    // Read back through the list rather than off the refusal: a
    // translation that answered 409 after writing would satisfy
    // every assertion above.
    const planted = await plantTopics();

    await refusalFrom(() => patchTopic(planted.store, planted.inference.id, {
      name: planted.transformers.name,
    }));

    const page = await listTopics(planted.store, RADAR, WIDE_WINDOW);

    expect(page.rows.map((row) => row.name))
      .toEqual(['edge inference', 'transformers']);
  });

  it('keeps the refusal off the second domain', async () => {
    // The create below was refused; the other domain's topic
    // carrying that same name is untouched, which is the widening
    // control restated over a refusal rather than an acceptance.
    const planted = await plantTopics();

    await refusalFrom(() => createTopic(planted.store, RADAR, {
      name: planted.transformers.name,
      intervalSeconds: HOURLY,
    }));

    const page = await listTopics(planted.store, TRANSIT, WIDE_WINDOW);

    expect(page.rows.map((row) => row.name)).toEqual([planted.foreign.name]);
  });
});

// ---------------------------------------------------------------------------
// The bodies these operations refuse
// ---------------------------------------------------------------------------

/** The two operations that take a body. */
const BODY_OPERATIONS = ['create', 'patch'];

/**
 * The columns this table's pipeline writes and this surface never
 * accepts, plus one a sibling table carries.
 *
 * `nextRunAt` is `topics`'s own: `ar-dispatch` writes it inside
 * the claim it reschedules with, and the only door onto it from
 * here is the schedule verb that lands beside these four.
 * `flagged` is not a column of `topics` at all — it is a source's
 * — and it is here for exactly that reason: the refusal is
 * `.strict()` doing its ordinary work rather than a per-column
 * check, so a member no table carries is refused by the same
 * clause that refuses one another table does.
 */
const PIPELINE_OWNED = ['flagged', 'nextRunAt'];

/** One detail, as a caller reads it off a validation refusal. */
interface ExpectedDetail {
  /** The dotted field path, or the root name the parser supplies. */
  readonly field: string;

  /** The zod issue code the detail carries through unchanged. */
  readonly code: string;
}

/** One body, and what the operation it was submitted to answers. */
interface BodyCase {
  /** What makes this row different from every other. */
  readonly label: string;

  /** Which operation is handed the body. */
  readonly operation: string;

  /** The body, unvalidated, exactly as a request would carry it. */
  readonly body: unknown;

  /** Every detail the refusal has to carry, in order. */
  readonly details: readonly ExpectedDetail[];
}

/**
 * The bodies the two operations have to refuse.
 *
 * Both carry rows of their own rather than sharing them. They run
 * through one `parseBody`, so a mutation degrading that function
 * reddens both halves equally and a table driven through one of
 * them would pin only that the two share an implementation —
 * while the two schemas genuinely differ, `name` and
 * `intervalSeconds` being required by one and optional on the
 * other.
 *
 * Every row here is submitted to a SERVICE function rather than
 * to a schema, which is the point: it is what says an MCP tool in
 * wave 3 cannot be handed a body the HTTP route would have
 * refused.
 *
 * THE CADENCE ROWS DISTINGUISH TWO FAULTS THAT READ ALIKE. Zero
 * and a negative are `too_small`, which is `.positive()`
 * answering; a fraction is `invalid_type`, which is `.int()`
 * answering before it. Both are wanted and neither substitutes
 * for the other: a schema that had kept `.int()` and dropped
 * `.positive()` accepts the zero row while still refusing the
 * fraction.
 *
 * THE TERM ROWS DISTINGUISH A LIST FROM ITS ENTRIES the same way.
 * A non-string ENTRY names its own index, so a caller is told
 * which term to fix; a `searchTerms` that is not a list at all
 * names the member. A schema declaring `z.array(z.unknown())`
 * passes the first row and fails nothing else here, which is why
 * the entry rows carry an index in their expected path rather
 * than only a code.
 *
 * There is no open record on this surface, so no row carries a
 * `*` and no call below passes `openPaths`. A topic body is six
 * declared members and nothing else — which is what makes the
 * undeclared-member rows below say what they say.
 */
const BODY_CASES: readonly BodyCase[] = [
  {
    label: 'a create body that is not an object',
    operation: 'create',
    body: null,
    details: [{ field: 'body', code: 'invalid_type' }],
  },
  {
    label: 'a create body carrying neither required member',
    operation: 'create',
    body: {},
    details: [
      { field: 'name', code: 'invalid_type' },
      { field: 'intervalSeconds', code: 'invalid_type' },
    ],
  },
  {
    label: 'a create body named the empty string',
    operation: 'create',
    body: { name: '', intervalSeconds: HOURLY },
    details: [{ field: 'name', code: 'too_small' }],
  },
  {
    label: 'a create body leaving the cadence off',
    operation: 'create',
    body: { name: 'retrieval augmentation' },
    details: [{ field: 'intervalSeconds', code: 'invalid_type' }],
  },
  {
    label: 'a create body running every zero seconds',
    operation: 'create',
    body: { name: 'retrieval augmentation', intervalSeconds: 0 },
    details: [{ field: 'intervalSeconds', code: 'too_small' }],
  },
  {
    label: 'a create body running every minus hour',
    operation: 'create',
    body: { name: 'retrieval augmentation', intervalSeconds: -HOURLY },
    details: [{ field: 'intervalSeconds', code: 'too_small' }],
  },
  {
    label: 'a create body running every second and a half',
    operation: 'create',
    body: { name: 'retrieval augmentation', intervalSeconds: 1.5 },
    details: [{ field: 'intervalSeconds', code: 'invalid_type' }],
  },
  {
    label: 'a create body flooring at zero seconds',
    operation: 'create',
    body: {
      name: 'retrieval augmentation',
      intervalSeconds: HOURLY,
      minIntervalSeconds: 0,
    },
    details: [{ field: 'minIntervalSeconds', code: 'too_small' }],
  },
  {
    label: 'a create body submitting a term that is not a string',
    operation: 'create',
    body: {
      name: 'retrieval augmentation',
      intervalSeconds: HOURLY,
      searchTerms: ['retrieval', 7],
    },
    details: [{ field: 'searchTerms.1', code: 'invalid_type' }],
  },
  {
    label: 'a create body submitting the terms as one string',
    operation: 'create',
    body: {
      name: 'retrieval augmentation',
      intervalSeconds: HOURLY,
      searchTerms: 'retrieval',
    },
    details: [{ field: 'searchTerms', code: 'invalid_type' }],
  },
  {
    label: 'a create body scheduling its own first run',
    operation: 'create',
    body: {
      name: 'retrieval augmentation',
      intervalSeconds: HOURLY,
      nextRunAt: '2026-08-31T09:00:00.000Z',
    },
    details: [{ field: 'body', code: 'unrecognized_keys' }],
  },
  {
    label: 'a create body flagging itself',
    operation: 'create',
    body: {
      name: 'retrieval augmentation',
      intervalSeconds: HOURLY,
      flagged: true,
    },
    details: [{ field: 'body', code: 'unrecognized_keys' }],
  },
  {
    label: 'a create body naming its own domain',
    operation: 'create',
    body: {
      name: 'retrieval augmentation',
      intervalSeconds: HOURLY,
      domainId: 1,
    },
    details: [{ field: 'body', code: 'unrecognized_keys' }],
  },
  {
    label: 'a create body carrying a health counter',
    operation: 'create',
    body: {
      name: 'retrieval augmentation',
      intervalSeconds: HOURLY,
      consecutiveFailures: 0,
    },
    details: [{ field: 'body', code: 'unrecognized_keys' }],
  },
  {
    label: 'a patch body that is not an object',
    operation: 'patch',
    body: 7,
    details: [{ field: 'body', code: 'invalid_type' }],
  },
  {
    label: 'a patch renaming the topic to the empty string',
    operation: 'patch',
    body: { name: '' },
    details: [{ field: 'name', code: 'too_small' }],
  },
  {
    label: 'a patch running every zero seconds',
    operation: 'patch',
    body: { intervalSeconds: 0 },
    details: [{ field: 'intervalSeconds', code: 'too_small' }],
  },
  {
    label: 'a patch clearing the cadence with null',
    operation: 'patch',
    body: { intervalSeconds: null },
    details: [{ field: 'intervalSeconds', code: 'invalid_type' }],
  },
  {
    label: 'a patch flooring at zero seconds',
    operation: 'patch',
    body: { minIntervalSeconds: 0 },
    details: [{ field: 'minIntervalSeconds', code: 'too_small' }],
  },
  {
    label: 'a patch submitting a term that is not a string',
    operation: 'patch',
    body: { searchTerms: [7] },
    details: [{ field: 'searchTerms.0', code: 'invalid_type' }],
  },
  {
    label: 'a patch moving its own next run',
    operation: 'patch',
    body: { nextRunAt: '2026-08-31T09:00:00.000Z' },
    details: [{ field: 'body', code: 'unrecognized_keys' }],
  },
  {
    label: 'a patch clearing the flag',
    operation: 'patch',
    body: { flagged: false },
    details: [{ field: 'body', code: 'unrecognized_keys' }],
  },
  {
    label: 'a patch proposing a move between domains',
    operation: 'patch',
    body: { domainId: 2 },
    details: [{ field: 'body', code: 'unrecognized_keys' }],
  },
];

/**
 * Submits one body to the operation its row names.
 *
 * @param planted - The store and its rows.
 * @param row - The row.
 * @returns Whatever the operation answered, which for every row in
 *   {@link BODY_CASES} is a throw.
 */
async function submitBody(
  planted: PlantedTopics,
  row: BodyCase,
): Promise<unknown> {
  return row.operation === 'create'
    ? createTopic(planted.store, RADAR, row.body)
    : patchTopic(planted.store, planted.inference.id, row.body);
}

/**
 * @param body - A row's body, of any shape at all.
 * @param key - The member to look for.
 * @returns Whether the body is an object carrying that key. Read
 *   off the row rather than off its label, so a guard below cannot
 *   be satisfied by prose.
 */
function bodyCarries(body: unknown, key: string): boolean {
  return typeof body === 'object'
    && body !== null
    && Object.hasOwn(body, key);
}

describe('the bodies these operations refuse', () => {
  it('carries rows for both operations that take one', () => {
    expect([...new Set(BODY_CASES.map((row) => row.operation))].sort())
      .toEqual([...BODY_OPERATIONS].sort());
  });

  it('labels every row distinctly', () => {
    const labels = BODY_CASES.map((row) => row.label);

    expect(labels.length).toBe(new Set(labels).size);
  });

  it('names a distinct reason for each class of refusal', () => {
    const codes = BODY_CASES.flatMap(
      (row) => row.details.map((detail) => detail.code),
    );

    expect([...new Set(codes)].sort()).toEqual([
      'invalid_type', 'too_small', 'unrecognized_keys',
    ]);
  });

  it('refuses a cadence of zero from both operations', () => {
    // The scoped claim, held against the table rather than
    // against a memory of what was written into it: a row deleted
    // from either half stops this file covering the refusal it is
    // named for, and nothing else here would report it. Read off
    // the BODY rather than the label, so renaming a row cannot
    // satisfy this.
    const zeroed = BODY_CASES.filter(
      (row) => bodyCarries(row.body, 'intervalSeconds')
        && (row.body as { intervalSeconds: unknown }).intervalSeconds === 0,
    );

    expect(zeroed.map((row) => row.operation).sort())
      .toEqual([...BODY_OPERATIONS].sort());
    expect(zeroed.every((row) => row.details.length === 1)).toBe(true);
    expect([...new Set(zeroed.flatMap(
      (row) => row.details.map((detail) => detail.code),
    ))]).toEqual(['too_small']);
  });

  it('refuses a term that is not a string, naming its index', () => {
    // The entry rows, and the claim that separates them from the
    // whole-list row beside them: each names the INDEX of the term
    // at fault, so a caller is told which one to fix. A schema
    // widened to `z.array(z.unknown())` fails the cases these rows
    // drive; a table that had lost the index would leave that
    // widening invisible.
    const indexed = BODY_CASES.filter(
      (row) => row.details.some((detail) => detail.field.startsWith(
        'searchTerms.',
      )),
    );

    expect(indexed.map((row) => row.operation).sort())
      .toEqual([...BODY_OPERATIONS].sort());
    expect(indexed.flatMap(
      (row) => row.details.map((detail) => detail.field),
    ).sort()).toEqual(['searchTerms.0', 'searchTerms.1']);
  });

  it('refuses every pipeline-owned member from both operations', () => {
    // One reading per member rather than one over the set, so a
    // member submitted through the create alone is this case
    // naming which one rather than a count that still adds up.
    const reach = PIPELINE_OWNED.map((key) => ({
      key,
      operations: [...new Set(BODY_CASES
        .filter((row) => bodyCarries(row.body, key))
        .map((row) => row.operation))].sort(),
    }));

    expect(reach).toEqual(PIPELINE_OWNED.map((key) => ({
      key,
      operations: [...BODY_OPERATIONS].sort(),
    })));
  });

  for (const row of BODY_CASES) {
    it(`refuses ${row.label}`, async () => {
      const planted = await plantTopics();
      const refusal = await refusalFrom(() => submitBody(planted, row));

      expect(refusal).toBeInstanceOf(ValidationError);
      expect(refusal.code).toBe('VALIDATION_ERROR');
      expect(refusal.statusCode).toBe(422);
      expect(detailsOf(refusal.details as FieldError[] | undefined))
        .toEqual([...row.details]);
    });
  }

  it('accepts a body of each declared shape', async () => {
    // The positive control for the whole table, one call per
    // operation, naming every member each schema declares: a
    // module refusing every body passes all twenty-three rows
    // above and fails this.
    const { store, inference } = await plantTopics();
    const created = await createTopic(store, RADAR, {
      name: 'retrieval augmentation',
      searchTerms: ['retrieval'],
      intervalSeconds: HOURLY,
      enabled: false,
      minIntervalSeconds: 600,
      maxIntervalSeconds: 86400,
    });
    const patched = await patchTopic(store, inference.id, {
      name: 'edge inference on device',
      searchTerms: ['npu'],
      intervalSeconds: 1800,
      enabled: false,
      minIntervalSeconds: 300,
      maxIntervalSeconds: 43200,
    });

    expect(created.name).toBe('retrieval augmentation');
    expect(patched.name).toBe('edge inference on device');
  });

  it('accepts a cadence of one second from both operations', async () => {
    // The boundary control for the zero rows, a single step from
    // the value they refuse. A schema that had stopped checking
    // the interval at all passes those rows' neighbours and fails
    // them; a schema refusing every interval passes them and fails
    // this. Neither reading is available from one of the two.
    const { store, inference } = await plantTopics();
    const created = await createTopic(store, RADAR, {
      name: 'retrieval augmentation',
      intervalSeconds: 1,
    });
    const patched = await patchTopic(store, inference.id, {
      intervalSeconds: 1,
    });

    expect(created.intervalSeconds).toBe(1);
    expect(patched.intervalSeconds).toBe(1);
  });

  it('accepts an empty term list from both operations', async () => {
    // The control that makes the non-string entry rows readable: a
    // list is checked per ENTRY, so a list with no entries has
    // nothing to refuse. An empty list is also a complete value
    // rather than an absence — a topic that issues nothing comes
    // due on time — so a schema holding `searchTerms` to `.min(1)`
    // fails this and passes every row above.
    const { store, inference } = await plantTopics();
    const created = await createTopic(store, RADAR, {
      name: 'retrieval augmentation',
      searchTerms: [],
      intervalSeconds: HOURLY,
    });
    const patched = await patchTopic(store, inference.id, {
      searchTerms: [],
    });

    expect(created.searchTerms).toEqual([]);
    expect(patched.searchTerms).toEqual([]);
  });

  it('accepts a bound cleared with null from the patch', async () => {
    // The control for the two nullable members, and the one the
    // cadence rows cannot stand in for: `intervalSeconds` refuses
    // a null and a bound accepts one, because clearing a floor is
    // expressible in no other way. A patch schema that dropped
    // `.nullable()` from the bounds passes every row above and
    // fails only this.
    const { store, inference } = await plantTopics();
    const patched = await patchTopic(store, inference.id, {
      minIntervalSeconds: null,
      maxIntervalSeconds: null,
    });

    expect(patched.minIntervalSeconds).toBeNull();
    expect(patched.maxIntervalSeconds).toBeNull();
  });

  it('accepts a patch that carries no member at all', async () => {
    // The port's rule rather than this module's: `topics` has no
    // `updated_at`, so an empty patch has nothing to set and
    // answers the stored row. A schema making any member required
    // refuses this and passes every row above.
    const { store, inference } = await plantTopics();
    const patched = await patchTopic(store, inference.id, {});

    expect(patched).toStrictEqual(inference);
  });

  it('refuses a malformed patch against an id that is not there', async () => {
    // The body is parsed before the id is resolved, so the same
    // patch answers the same refusal either way. A module
    // resolving first would answer this 404 and the matching row
    // above 422, which would make a caller's error depend on rows
    // it never asked about.
    const { store } = await plantTopics();
    const refusal = await refusalFrom(
      () => patchTopic(store, MISSING_ID, { intervalSeconds: 0 }),
    );

    expect(refusal).toBeInstanceOf(ValidationError);
    expect(detailsOf(refusal.details as FieldError[] | undefined))
      .toEqual([{ field: 'intervalSeconds', code: 'too_small' }]);
  });

  it('refuses a malformed create against a slug that is not', async () => {
    // The same ordering claim on the other operation.
    // `createTopic` parses, then resolves the domain, so a body
    // fault outranks a slug that names nothing.
    const { store } = await plantTopics();
    const refusal = await refusalFrom(
      () => createTopic(store, MISSING_SLUG, {
        name: '',
        intervalSeconds: 0,
      }),
    );

    expect(refusal).toBeInstanceOf(ValidationError);
    expect(detailsOf(refusal.details as FieldError[] | undefined))
      .toEqual([
        { field: 'name', code: 'too_small' },
        { field: 'intervalSeconds', code: 'too_small' },
      ]);
  });
});

// ---------------------------------------------------------------------------
// What only a lost race can produce
// ---------------------------------------------------------------------------

describe('what only a lost race can produce', () => {
  it('answers 404 when the domain went between the two', async () => {
    // The one branch the ordinary fixture cannot reach:
    // `createTopic` resolves the domain and only then writes, so a
    // foreign-key refusal means the row was deleted in between.
    // Reconstructed rather than stubbed — the domain is really
    // removed, and the lookup really answers the row it had — so
    // what the write meets is the store's own refusal. The answer
    // is the same 404 the lookup itself raises, because it is the
    // same fact: no domain carries that slug.
    const { store } = await plantTopics();
    const found = await store.findDomainBySlug(RADAR);

    if (found === null) {
      throw new Error('the fixture planted no domain to capture');
    }

    await store.deleteDomain(found.id);

    const vanished: TopicServiceStore = {
      ...store,
      findDomainBySlug: async () => found,
    };
    const refusal = await refusalFrom(() => createTopic(vanished, RADAR, {
      name: 'retrieval augmentation',
      intervalSeconds: HOURLY,
    }));

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.statusCode).toBe(404);
    expect(refusal.cause).toBeInstanceOf(StoreRefusal);
  });

  it('answers 404 rather than the 409 a taken name gets', async () => {
    // The narrow claim inside the case above: the two reasons
    // `TopicStore` declares are told apart. A translator keying on
    // `instanceof StoreRefusal` alone would answer one status to
    // both, and would pass every duplicate case in this file.
    //
    // The domain is deleted, which takes its topics with it
    // through the cascade, so the name this create proposes is
    // free by the time the write runs — and it is still the name
    // the fixture collided on, which is what makes the two
    // refusals genuinely competing for this one call.
    const { store, transformers } = await plantTopics();
    const found = await store.findDomainBySlug(RADAR);

    if (found === null) {
      throw new Error('the fixture planted no domain to capture');
    }

    await store.deleteDomain(found.id);

    const vanished: TopicServiceStore = {
      ...store,
      findDomainBySlug: async () => found,
    };
    const refusal = await refusalFrom(() => createTopic(vanished, RADAR, {
      name: transformers.name,
      intervalSeconds: HOURLY,
    }));

    expect(refusal.code).toBe('NOT_FOUND');
    expect(refusal.code).not.toBe('CONFLICT');
  });

  it('rethrows a reason this port does not declare', async () => {
    // `topics` carries no CHECK and no trigger — the interval
    // bounds are clamped by a writer and constrain nothing at the
    // database — so a `check-violation` out of a topic write is a
    // store doing something its port does not describe. It is
    // rethrown as itself, which answers 500, rather than a
    // plausible status no rule authorised. A translator with a
    // catch-all branch passes every other case here and fails
    // this.
    const { store } = await plantTopics();
    const misbehaving: TopicServiceStore = {
      ...store,
      insertTopic: async () => {
        throw new StoreRefusal({
          reason: 'check-violation',
          constraint: 'a constraint this table does not carry',
        });
      },
    };

    await expect(createTopic(misbehaving, RADAR, {
      name: 'retrieval augmentation',
      intervalSeconds: HOURLY,
    })).rejects.toBeInstanceOf(StoreRefusal);
  });

  it('rethrows an error that is not a store refusal', async () => {
    // The other half of the same rule, on the other write. A
    // driver fault is not a decision about rows, so nothing here
    // dresses it as one.
    const { store, inference } = await plantTopics();
    const misbehaving: TopicServiceStore = {
      ...store,
      updateTopic: async () => {
        throw new TypeError('the driver failed on its own account');
      },
    };

    await expect(patchTopic(misbehaving, inference.id, {
      intervalSeconds: 900,
    })).rejects.toBeInstanceOf(TypeError);
  });
});

// ---------------------------------------------------------------------------
// What a refusal is allowed to say
// ---------------------------------------------------------------------------

/** A slug shaped like one, so it reaches the store rather than the parser. */
const SENTINEL_SLUG = 'sentinel-slug-value';

/**
 * A name, submitted as one.
 *
 * Free text with spaces in it, which this surface accepts: `name`
 * is held to non-empty and nothing more, matching the seed. A
 * sentinel a schema would have refused for its SHAPE would be
 * testing the parser rather than the containment.
 */
const SENTINEL_NAME = 'sentinel name value';

/** A submitted value, carried as one of the search terms. */
const SENTINEL_TERM = 'sentinel term value';

/** A key no schema here declares, submitted as one. */
const SENTINEL_MEMBER = 'sentinelMemberValue';

/**
 * The four strings the rows below submit. None is a substring of
 * another, so a count against one cannot be satisfied by another.
 */
const SENTINELS = [
  SENTINEL_SLUG,
  SENTINEL_NAME,
  SENTINEL_TERM,
  SENTINEL_MEMBER,
];

/** One refused request, and what it submitted that must not return. */
interface ContainmentCase {
  /** What makes this row different from every other. */
  readonly label: string;

  /** The call, submitting the needles below. */
  readonly run: (planted: PlantedTopics) => Promise<unknown>;

  /** The submitted strings the answer must not carry. */
  readonly needles: readonly string[];
}

/**
 * Every channel a submitted string could come back through.
 *
 * THE TWO CONFLICT ROWS PLANT THEIR OWN COLLIDING ROW rather than
 * colliding with the fixture's. The value a duplicate refusal is
 * likeliest to quote is the one the request collided ON, so a row
 * reusing a fixture name would leave exactly that channel
 * unmeasured while looking identical in the output — the needle
 * would be a search term, which no duplicate refusal has any
 * reason to name.
 */
const CONTAINMENT_CASES: readonly ContainmentCase[] = [
  {
    label: 'a slug that names no domain',
    run: ({ store }) => listTopics(store, SENTINEL_SLUG, WIDE_WINDOW),
    needles: [SENTINEL_SLUG],
  },
  {
    label: 'a create against a slug that names no domain',
    run: ({ store }) => createTopic(store, SENTINEL_SLUG, {
      name: SENTINEL_NAME,
      searchTerms: [SENTINEL_TERM],
      intervalSeconds: HOURLY,
    }),
    needles: [SENTINEL_SLUG, SENTINEL_NAME, SENTINEL_TERM],
  },
  {
    label: 'a create under a name the domain researches',
    run: async ({ store }) => {
      await createTopic(store, RADAR, {
        name: SENTINEL_NAME,
        intervalSeconds: HOURLY,
      });

      return createTopic(store, RADAR, {
        name: SENTINEL_NAME,
        searchTerms: [SENTINEL_TERM],
        intervalSeconds: HOURLY,
      });
    },
    needles: [SENTINEL_NAME, SENTINEL_TERM],
  },
  {
    label: 'a rename onto a name the domain researches',
    run: async ({ store, inference }) => {
      await createTopic(store, RADAR, {
        name: SENTINEL_NAME,
        intervalSeconds: HOURLY,
      });

      return patchTopic(store, inference.id, { name: SENTINEL_NAME });
    },
    needles: [SENTINEL_NAME],
  },
  {
    label: 'an undeclared member of a create body',
    run: ({ store }) => createTopic(store, RADAR, {
      name: SENTINEL_NAME,
      searchTerms: [SENTINEL_TERM],
      intervalSeconds: HOURLY,
      [SENTINEL_MEMBER]: 1,
    }),
    needles: [SENTINEL_NAME, SENTINEL_TERM, SENTINEL_MEMBER],
  },
  {
    label: 'an undeclared member of a patch body',
    run: ({ store, inference }) => patchTopic(store, inference.id, {
      searchTerms: [SENTINEL_TERM],
      [SENTINEL_MEMBER]: 1,
    }),
    needles: [SENTINEL_TERM, SENTINEL_MEMBER],
  },
  {
    label: 'a patch against an id that is not there',
    run: ({ store }) => patchTopic(store, MISSING_ID, {
      name: SENTINEL_NAME,
      searchTerms: [SENTINEL_TERM],
    }),
    needles: [SENTINEL_NAME, SENTINEL_TERM],
  },
];

describe('what a refusal is allowed to say', () => {
  it('submits every sentinel through at least one channel', () => {
    const submitted = CONTAINMENT_CASES.flatMap((row) => [...row.needles]);

    expect([...new Set(submitted)].sort()).toEqual([...SENTINELS].sort());
  });

  it('would find a sentinel a refusal did carry', () => {
    // The planted control. Every row below counts to zero, and a
    // zero is what a search over the wrong text answers too — so
    // the same helper is run against an envelope built here, out
    // of details this module did not produce, and has to find each
    // one.
    const planted = JSON.stringify({
      code: 'CONFLICT',
      message: `No domain carries ${SENTINEL_SLUG}`,
      details: [
        {
          field: SENTINEL_MEMBER,
          message: `${SENTINEL_NAME} is taken, and issues ${SENTINEL_TERM}`,
          code: 'custom',
        },
      ],
    });
    const found = SENTINELS.map((needle) => ({
      needle,
      occurrences: countOccurrences(planted, needle),
    }));

    expect(found).toEqual(SENTINELS.map((needle) => ({
      needle,
      occurrences: 1,
    })));
  });

  for (const row of CONTAINMENT_CASES) {
    it(`answers ${row.label} without quoting it`, async () => {
      const planted = await plantTopics();
      const refusal = await refusalFrom(() => row.run(planted));
      const answered = JSON.stringify(refusal.toJSON());
      const found = row.needles.map((needle) => ({
        needle,
        occurrences: countOccurrences(answered, needle),
      }));

      // Counted rather than asserted absent, so the reading is a
      // number the planted control above has shown can be
      // something other than zero.
      expect(found).toEqual(row.needles.map((needle) => ({
        needle,
        occurrences: 0,
      })));

      // The envelope was built at all: a helper answering an empty
      // string would satisfy every count above.
      expect(answered.length).toBeGreaterThan(0);
      expect(refusal.toJSON().code).toBe(refusal.code);
    });
  }

  it('keeps the driver error off the wire and on the cause', async () => {
    // Both translations below pass the `StoreRefusal` as `cause`,
    // which is where a debugger and the error-level log line find
    // it. `cause` is non-enumerable per spec, so it reaches no
    // serialised body — a property of the platform rather than of
    // this module, which is why it is measured here rather than
    // assumed.
    const { store, transformers } = await plantTopics();
    const refusal = await refusalFrom(() => createTopic(store, RADAR, {
      name: transformers.name,
      searchTerms: [SENTINEL_TERM],
      intervalSeconds: HOURLY,
    }));

    expect(refusal.cause).toBeInstanceOf(StoreRefusal);
    expect(Object.keys(refusal.toJSON()).sort())
      .toEqual(['code', 'message']);
  });
});
