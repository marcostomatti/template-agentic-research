/**
 * `src/domains/service.ts` — the refusals. What the five domain
 * operations do when they are asked for something they will not do,
 * driven over `tests/helpers/memory-research-store.ts` so every
 * claim here is answered with no database anywhere.
 *
 * Five claims, one per way this module can say no.
 *
 * THAT A SLUG NAMING NO ROW IS A 404 ON EVERY OPERATION THAT TAKES
 * ONE, from the same private helper, so the three cannot answer a
 * missing domain three different ways. Each row carries its own
 * positive control in the same body — the SAME operation against
 * the domain that IS stored — because a service refusing everything
 * passes every assertion a refusal case makes on its own.
 *
 * THAT A TAKEN SLUG IS A 409 AND NOT A 500. `StoreRefusal` is
 * deliberately not an `AppError`, so an untranslated one answers
 * 500; the case pins the translation rather than merely that
 * something was thrown, and its control creates under a free slug so
 * a store refusing every insert cannot pass it.
 *
 * THAT THE DELETE GUARD READS ALL THREE COUNTED TABLES. A guard
 * looking only at `topics` is green against a table with only a
 * `topics` row, so the three are swept and the sweep is held
 * set-equal against the members of `DomainDependentCounts` itself.
 * The refusal carries those counts as `details`, which are facts
 * about the database rather than about the request, and it stops
 * BEFORE the delete — measured through a recording wrapper rather
 * than inferred from the rows left behind, with the confirmed call
 * as the control that proves the wrapper sees a delete at all.
 *
 * THAT A BODY IS PARSED HERE, not above. Every row of the body
 * table is submitted to a SERVICE function rather than to a schema,
 * which is the whole difference between this file and
 * `settings-payload.test.ts`: it is what says an MCP tool in wave 3
 * cannot be handed a payload the HTTP route would have refused.
 * Both operations that take a body have rows of their own, since a
 * row driven through only one of them pins nothing about the other.
 *
 * THAT NOTHING SUBMITTED COMES BACK. The containment block counts
 * occurrences of a sentinel in the serialised refusal rather than
 * asserting absence, and takes the same count over a planted
 * envelope — a search that would find nothing anywhere reports a
 * clean refusal and a leaking one alike.
 *
 * Mutation grid, measured over the 41 cases here with
 * `--reporter=json` and read as the failed `fullName` SET rather
 * than as a count. Eleven legs in two classes, because the two
 * halves of this file are reddened by opposite mutations and a grid
 * made of one class leaves the other half green while looking
 * thorough.
 *
 * The seven WIDENING legs each redden the refusal they aim at, and
 * three of them spill into the containment block — which is what
 * says those rows read a real refusal rather than an empty
 * envelope. Rethrowing the store refusal instead of translating it
 * reddens 2: the 409 case and the containment row that reads it.
 * Letting `requireDomain` answer null reddens 5, all three 404 rows
 * plus both containment rows naming a missing slug. Neutralising
 * the delete guard reddens 3, and moving the guard AFTER the delete
 * reddens the SAME three — the in-memory dataset drops a deleted
 * domain's counts with it, which is why the recording wrapper is
 * what separates those two faults and no reading of the rows could.
 * Dropping `openPaths` from the create parse reddens 3, the two
 * masked rows and the open-record containment row; dropping
 * `.strict()` from the create schema reddens 2. And taking the list
 * total from the page rather than from the count reddens both
 * `listDomains` cases.
 *
 * The four NARROWING legs are aimed at the controls, which is what
 * the controls are for. Refusing every slug as missing reddens 8,
 * and only three are the row-level controls: the other five are the
 * whole delete block and the accepted-body control, none of which
 * can reach its own subject through a 404. Holding every domain to
 * hold rows reddens 2, both of them controls. Resolving the slug
 * before parsing a patch reddens exactly 1, the ordering case,
 * which is the whole of the evidence that the case pins the order
 * rather than restating a refusal. And withholding the empty
 * settings object a create supplies reddens 1, the create control,
 * which is what makes that supply load-bearing rather than tidy.
 *
 * What no module mutation reaches, by construction. The six table
 * guards read only the tables beside them and are aimed at a later
 * edit — an operation added with no row, an outcome side deleted
 * whole, an open record left bracketed from one side. The planted
 * control is invisible for the same reason and deliberately so: it
 * proves the SEARCH, where a leg making this module leak would
 * prove the SUBJECT. And no leg touches `src/http/validation.ts`,
 * so every field path below is evidence about what this module
 * ASKED FOR rather than about how the masking is built.
 */
import type { DomainDependentCounts } from './store.js';
import type { FieldError } from '../../lib/errors/index.js';
import type {
  MemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';

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

import {
  createDomain,
  deleteDomain,
  getDomain,
  listDomains,
  patchDomain,
} from './service.js';

/** The seeded worked example, and the domain every case stores. */
const RADAR = 'example-tech-radar';

/** A second domain, invented in the same neutral register. */
const TRANSIT = 'example-urban-transit';

/** A slug shaped like one and carried by no row in any case here. */
const MISSING = 'example-not-a-domain';

/**
 * Three counted zeros, typed by the interface the guard sweeps.
 *
 * The annotation is a drift pin as well as a fixture: a fourth
 * member added to `DomainDependentCounts` makes this literal
 * incomplete and reddens `check-types` here, which is what keeps
 * {@link DEPENDENT_TABLES} below from silently covering three of
 * four tables.
 */
const NO_DEPENDENTS: DomainDependentCounts = {
  topics: 0,
  sources: 0,
  findings: 0,
};

/**
 * A store holding one domain per slug, named after it.
 *
 * @param slugs - The natural keys to plant, in order. Ids are handed
 *   out from 1 in that order.
 * @returns The store.
 */
async function storeHolding(
  ...slugs: readonly string[]
): Promise<MemoryResearchStore> {
  const store = createMemoryResearchStore();

  for (const slug of slugs) {
    await store.insertDomain({ slug, name: `Domain ${slug}`, settings: {} });
  }

  return store;
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
 *   `StoreRefusal` reaching a caller is a bug in this module and not
 *   one of its answers.
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
 * The two facts a caller reads off each detail of a validation
 * refusal.
 *
 * `message` is deliberately not among them. It is drawn from the
 * fixed vocabulary in `src/http/validation.ts`, which owns the
 * claim; pinning its wording here would make that module a red
 * suite in two places for one edit.
 *
 * @param details - `err.details`, absent when nothing built any.
 * @returns One `{ field, code }` per detail, in the order zod raised
 *   the issues — so a body with two faults is asserted as two
 *   details rather than as the first one.
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
 *   boolean, so a zero can be read against a known positive taken by
 *   this same function in the same case.
 */
function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

/**
 * Wraps a store so that every method reached through it is recorded.
 *
 * A refusal claim has two halves — what was answered, and where the
 * operation stopped — and only the second one says a guard refused
 * BEFORE the destructive call rather than after it. Nothing else in
 * this file can see the difference: the in-memory dataset would look
 * identical if the row had been deleted and the refusal thrown
 * afterwards.
 *
 * @param store - The store to wrap.
 * @param calls - The array every reached method name is pushed onto,
 *   in call order.
 * @returns A store answering exactly as the wrapped one does.
 */
function recordingStore(
  store: MemoryResearchStore,
  calls: string[],
): MemoryResearchStore {
  return new Proxy(store, {
    get(target, key): unknown {
      const member = Reflect.get(target, key) as unknown;

      if (typeof member !== 'function') {
        return member;
      }

      const method = member as (...args: unknown[]) => unknown;

      return (...args: unknown[]): unknown => {
        calls.push(String(key));

        return Reflect.apply(method, target, args);
      };
    },
  });
}

// ---------------------------------------------------------------------------
// listDomains, which refuses nothing
// ---------------------------------------------------------------------------

describe('listDomains', () => {
  it('answers an empty page for a window past the end', async () => {
    // The collection exists and only the window over it is empty,
    // so there is no 404 here and no refusal of any kind. The case
    // is in a file about refusals precisely because the absence is
    // the claim.
    const store = await storeHolding(RADAR, TRANSIT);
    const page = await listDomains(store, { limit: 50, offset: 50 });

    expect(page.rows).toEqual([]);

    // The control, in this body rather than a sibling: a store
    // answering nothing to every read passes the assertion above.
    expect(page.total).toBe(2);
  });

  it('counts the collection rather than the page', async () => {
    const store = await storeHolding(RADAR, TRANSIT);
    const page = await listDomains(store, { limit: 1, offset: 0 });

    expect(page.rows.map((row) => row.slug)).toEqual([RADAR]);
    expect(page.total).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// A slug no row carries
// ---------------------------------------------------------------------------

/** The operations that address a domain by its natural key. */
const SLUG_ADDRESSED = ['deleteDomain', 'getDomain', 'patchDomain'];

/**
 * One operation asked for a domain that is not there, beside the
 * same operation asked for one that is.
 *
 * The control is a member of the row rather than a case of its own,
 * because the two are one claim: a 404 for a missing slug means
 * nothing unless the identical call against a stored slug answers.
 */
interface MissingCase {
  /** The exported function under test, and the row label. */
  readonly operation: string;
  /** The call that has to be refused. */
  readonly refuse: (store: MemoryResearchStore) => Promise<unknown>;
  /** The same call against {@link RADAR}, which has to answer. */
  readonly control: (store: MemoryResearchStore) => Promise<unknown>;
}

/** Every operation that can be handed a slug naming no row. */
const MISSING_CASES: readonly MissingCase[] = [
  {
    operation: 'getDomain',
    refuse: (store) => getDomain(store, MISSING),
    control: (store) => getDomain(store, RADAR),
  },
  {
    operation: 'patchDomain',
    refuse: (store) => patchDomain(store, MISSING, { name: 'Renamed' }),
    control: (store) => patchDomain(store, RADAR, { name: 'Renamed' }),
  },
  {
    operation: 'deleteDomain',
    refuse: (store) => deleteDomain(store, MISSING, {
      cascadeConfirmed: false,
    }),
    control: (store) => deleteDomain(store, RADAR, {
      cascadeConfirmed: false,
    }),
  },
];

describe('a slug no row carries', () => {
  it('covers every operation that takes one', () => {
    // Pairs by name rather than by position, so an operation added
    // to the module without a row here is this case failing rather
    // than a table that quietly covers two of three.
    expect(MISSING_CASES.map((row) => row.operation).sort())
      .toEqual([...SLUG_ADDRESSED].sort());
  });

  for (const row of MISSING_CASES) {
    it(`answers 404 from ${row.operation}`, async () => {
      const store = await storeHolding(RADAR);
      const refusal = await refusalFrom(() => row.refuse(store));

      expect(refusal).toBeInstanceOf(NotFoundError);
      expect(refusal.code).toBe('NOT_FOUND');
      expect(refusal.statusCode).toBe(404);
      expect(refusal.details).toBeUndefined();
    });

    it(`answers ${row.operation} for a slug that is there`, async () => {
      // The positive control for the row above, varied along the one
      // axis under test: the same operation, the same body, a slug
      // that IS there. A module refusing everything passes the
      // refusal case and fails this one.
      const store = await storeHolding(RADAR);

      await expect(row.control(store)).resolves.not.toThrow();
    });
  }
});

// ---------------------------------------------------------------------------
// A slug that is already taken
// ---------------------------------------------------------------------------

describe('a slug that is already taken', () => {
  it('translates the store refusal into a 409', async () => {
    // `StoreRefusal` is deliberately not an `AppError`, so an
    // untranslated one answers 500 through the framework handler.
    // The assertions pin the translation and not merely that
    // something was thrown.
    const store = await storeHolding(RADAR);
    const refusal = await refusalFrom(
      () => createDomain(store, { slug: RADAR, name: 'A second radar' }),
    );

    expect(refusal).toBeInstanceOf(ConflictError);
    expect(refusal.code).toBe('CONFLICT');
    expect(refusal.statusCode).toBe(409);
  });

  it('creates under a slug nobody holds', async () => {
    // The control for the case above: a module refusing every create
    // passes that one and fails this.
    const store = await storeHolding(RADAR);
    const created = await createDomain(store, {
      slug: TRANSIT,
      name: 'Urban transit',
    });

    expect(created.slug).toBe(TRANSIT);
  });
});

// ---------------------------------------------------------------------------
// The delete guard
// ---------------------------------------------------------------------------

/**
 * The counted tables, derived from {@link NO_DEPENDENTS} rather than
 * written out, so the sweep below covers whatever the interface
 * declares. A fourth member reaches this list the moment it reaches
 * that literal, which `check-types` already forces.
 */
const DEPENDENT_TABLES = Object.keys(NO_DEPENDENTS);

describe('the delete guard', () => {
  it('sweeps every table the counts declare', async () => {
    // A guard reading only `topics` is fully green against a table
    // carrying only a `topics` row. Each table is planted alone, so
    // a member the guard does not read is named in the failure
    // rather than passing on a sibling's behalf.
    const unguarded: string[] = [];

    for (const table of DEPENDENT_TABLES) {
      const store = await storeHolding(RADAR);
      const domain = await getDomain(store, RADAR);

      store.setDomainDependents(domain.id, { [table]: 1 });

      let refused = false;

      try {
        await deleteDomain(store, RADAR, { cascadeConfirmed: false });
      } catch (err) {
        // Matched rather than swallowed: a `StoreRefusal` or a
        // `TypeError` escaping here is a bug in the module, and
        // folding it into a refusal would report one as a guard
        // working.
        if (!(err instanceof ConflictError)) {
          throw err;
        }

        refused = true;
      }

      if (!refused) {
        unguarded.push(table);
      }
    }

    // Written out once, so an empty list cannot make the sweep
    // vacuously green. The list itself is derived from a literal
    // `check-types` holds to `DomainDependentCounts`, so a fourth
    // counted table reddens there before it reaches this line.
    expect(DEPENDENT_TABLES).toEqual(['topics', 'sources', 'findings']);
    expect(unguarded).toEqual([]);
  });

  it('answers 409 carrying the counts it read', async () => {
    const store = await storeHolding(RADAR);
    const domain = await getDomain(store, RADAR);

    store.setDomainDependents(domain.id, { findings: 7, topics: 2 });

    const refusal = await refusalFrom(() => deleteDomain(store, RADAR, {
      cascadeConfirmed: false,
    }));

    expect(refusal).toBeInstanceOf(ConflictError);
    expect(refusal.code).toBe('CONFLICT');
    expect(refusal.statusCode).toBe(409);

    // Every counted table, the zero included: a counted zero and a
    // table nobody counted are different facts to an operator
    // reading how much a cascade would take.
    expect(refusal.details).toEqual({ topics: 2, sources: 0, findings: 7 });
  });

  it('lets a domain nothing points at go without confirmation', async () => {
    // The control for both cases above. A guard refusing every
    // delete passes them and fails this one, and the counts here are
    // three zeros rather than absent — the planting seam is what
    // makes the difference reachable at all.
    const store = await storeHolding(RADAR);
    const domain = await getDomain(store, RADAR);

    store.setDomainDependents(domain.id, {});

    await expect(deleteDomain(store, RADAR, { cascadeConfirmed: false }))
      .resolves.toBeUndefined();
  });

  it('stops before the delete rather than after it', async () => {
    // Where the operation stopped, which no reading of the stored
    // rows can answer: a module that deleted the row and then threw
    // would leave the same dataset as one that refused, since the
    // case would have to look at a domain that is gone either way.
    const backing = await storeHolding(RADAR);
    const domain = await getDomain(backing, RADAR);

    backing.setDomainDependents(domain.id, { sources: 1 });

    const guarded: string[] = [];

    await refusalFrom(() => deleteDomain(
      recordingStore(backing, guarded),
      RADAR,
      { cascadeConfirmed: false },
    ));

    expect(guarded).not.toContain('deleteDomain');

    // The control, and the whole reason the assertion above is not
    // vacuous: a wrapper recording nothing would satisfy it too.
    const confirmed: string[] = [];

    await deleteDomain(
      recordingStore(backing, confirmed),
      RADAR,
      { cascadeConfirmed: true },
    );

    expect(confirmed).toContain('deleteDomain');
  });
});

// ---------------------------------------------------------------------------
// The bodies these operations refuse
// ---------------------------------------------------------------------------

/** The two operations that take a body. */
const BODY_OPERATIONS = ['create', 'patch'];

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
 * The bodies the two operations have to refuse, and the details each
 * refusal answers with.
 *
 * Both operations carry rows of their own rather than sharing them.
 * They run through one `parseBody`, so a mutation degrading that
 * function equally reddens both halves and a table driven through
 * only one of them would pin that the two share an implementation
 * while saying nothing about what either declares — and the two
 * schemas genuinely differ: `slug` is required by one and refused by
 * the other.
 *
 * The four `settings.` rows are the masking claim, bracketed from
 * both sides. A fault INSIDE an open record answers a `*` where the
 * operator's key was, and a fault against the record AS A WHOLE
 * keeps its declared name — either row alone is green against a
 * parser that got exactly one of the two right.
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
      { field: 'slug', code: 'invalid_type' },
      { field: 'name', code: 'invalid_type' },
    ],
  },
  {
    label: 'a slug that is not shaped like one',
    operation: 'create',
    body: { slug: 'Example Radar', name: 'A radar' },
    details: [{ field: 'slug', code: 'invalid_format' }],
  },
  {
    label: 'a domain named the empty string',
    operation: 'create',
    body: { slug: TRANSIT, name: '' },
    details: [{ field: 'name', code: 'too_small' }],
  },
  {
    label: 'an undeclared member of a create body',
    operation: 'create',
    body: { slug: TRANSIT, name: 'Urban transit', descriptino: 'typo' },
    details: [{ field: 'body', code: 'unrecognized_keys' }],
  },
  {
    label: 'an undeclared member of the settings payload',
    operation: 'create',
    body: { slug: TRANSIT, name: 'Urban transit',
      settings: { scoringWeigths: {} } },
    details: [{ field: 'settings', code: 'unrecognized_keys' }],
  },
  {
    label: 'a weight that is not a number',
    operation: 'create',
    body: { slug: TRANSIT, name: 'Urban transit',
      settings: { scoringWeights: { recency: 'high' } } },
    details: [
      { field: 'settings.scoringWeights.*', code: 'invalid_type' },
    ],
  },
  {
    label: 'a weights record that is not a record',
    operation: 'create',
    body: { slug: TRANSIT, name: 'Urban transit',
      settings: { scoringWeights: [] } },
    details: [
      { field: 'settings.scoringWeights', code: 'invalid_type' },
    ],
  },
  {
    label: 'a field contract naming a type this service has not',
    operation: 'create',
    body: { slug: TRANSIT, name: 'Urban transit',
      settings: { fieldContract: { url: { type: 'uuid' } } } },
    details: [
      { field: 'settings.fieldContract.*.*', code: 'invalid_value' },
    ],
  },
  {
    label: 'a patch body that is not an object',
    operation: 'patch',
    body: 7,
    details: [{ field: 'body', code: 'invalid_type' }],
  },
  {
    label: 'a patch proposing a rename',
    operation: 'patch',
    body: { slug: TRANSIT },
    details: [{ field: 'body', code: 'unrecognized_keys' }],
  },
  {
    label: 'a patch naming the domain the empty string',
    operation: 'patch',
    body: { name: '' },
    details: [{ field: 'name', code: 'too_small' }],
  },
  {
    label: 'a patch carrying a weight that is not a number',
    operation: 'patch',
    body: { settings: { scoringWeights: { novelty: 'high' } } },
    details: [
      { field: 'settings.scoringWeights.*', code: 'invalid_type' },
    ],
  },
];

/**
 * Submits one body to the operation its row names.
 *
 * @param store - The store the operation is given.
 * @param row - The row.
 * @returns Whatever the operation answered, which for every row in
 *   {@link BODY_CASES} is a throw.
 */
async function submitBody(
  store: MemoryResearchStore,
  row: BodyCase,
): Promise<unknown> {
  return row.operation === 'create'
    ? createDomain(store, row.body)
    : patchDomain(store, RADAR, row.body);
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
      'invalid_format', 'invalid_type', 'invalid_value',
      'too_small', 'unrecognized_keys',
    ]);
  });

  it('brackets each open record from both sides', () => {
    // A row whose detail carries a `*` proves the operator's key was
    // masked; a row naming the record itself proves the declared
    // name above it survived. Either alone is green against a parser
    // that masked everything or nothing.
    const fields = BODY_CASES.flatMap(
      (row) => row.details.map((detail) => detail.field),
    );
    const bracketed = ['settings.fieldContract', 'settings.scoringWeights']
      .map((record) => ({
        record,
        masked: fields.some((field) => field.startsWith(`${record}.`)
          && field.includes('*')),
        whole: fields.includes(record),
      }));

    expect(bracketed).toEqual([
      { record: 'settings.fieldContract', masked: true, whole: false },
      { record: 'settings.scoringWeights', masked: true, whole: true },
    ]);
  });

  for (const row of BODY_CASES) {
    it(`refuses ${row.label}`, async () => {
      const store = await storeHolding(RADAR);
      const refusal = await refusalFrom(() => submitBody(store, row));

      expect(refusal).toBeInstanceOf(ValidationError);
      expect(refusal.code).toBe('VALIDATION_ERROR');
      expect(refusal.statusCode).toBe(422);
      expect(detailsOf(refusal.details as FieldError[] | undefined))
        .toEqual([...row.details]);
    });
  }

  it('accepts a body of each declared shape', async () => {
    // The positive control for every row above, one per operation:
    // a module refusing every body passes the whole table and fails
    // this. Coverage of what the two operations DO with an accepted
    // body is a separate concern and lands beside it.
    const store = await storeHolding(RADAR);
    const created = await createDomain(store, {
      slug: TRANSIT,
      name: 'Urban transit',
      settings: { scoringWeights: { recency: 0.5 } },
    });
    const patched = await patchDomain(store, RADAR, {
      name: 'Renamed radar',
      settings: { fieldContract: { url: { type: 'string' } } },
    });

    expect(created.slug).toBe(TRANSIT);
    expect(patched.name).toBe('Renamed radar');
  });

  it('refuses a malformed patch against a missing slug', async () => {
    // The body is parsed before the slug is resolved, so the same
    // patch answers the same refusal either way. A module that
    // resolved first would answer this one 404 and the row above it
    // 422, which would make a caller's error depend on rows it never
    // asked about.
    const store = await storeHolding(RADAR);
    const refusal = await refusalFrom(
      () => patchDomain(store, MISSING, { name: '' }),
    );

    expect(refusal).toBeInstanceOf(ValidationError);
    expect(detailsOf(refusal.details as FieldError[] | undefined))
      .toEqual([{ field: 'name', code: 'too_small' }]);
  });
});

// ---------------------------------------------------------------------------
// What a refusal is allowed to say
// ---------------------------------------------------------------------------

/** A slug shaped like one, so it reaches the store rather than the parser. */
const SENTINEL_SLUG = 'sentinel-slug-value';

/** A key no schema here declares, submitted as one. */
const SENTINEL_KEY = 'sentinelKeyValue';

/** A submitted value, carried as the operator-facing label. */
const SENTINEL_NAME = 'sentinel name value';

/**
 * The three strings the rows below submit. None is a substring of
 * another, so a count against one cannot be satisfied by another.
 */
const SENTINELS = [SENTINEL_SLUG, SENTINEL_KEY, SENTINEL_NAME];

/** One refused request, and what it submitted that must not return. */
interface ContainmentCase {
  /** What makes this row different from every other. */
  readonly label: string;
  /** The call, submitting the needles below. */
  readonly run: (store: MemoryResearchStore) => Promise<unknown>;
  /** The submitted strings the answer must not carry. */
  readonly needles: readonly string[];
}

/** Every channel a submitted string could come back through. */
const CONTAINMENT_CASES: readonly ContainmentCase[] = [
  {
    label: 'a slug that names no row',
    run: (store) => getDomain(store, SENTINEL_SLUG),
    needles: [SENTINEL_SLUG],
  },
  {
    label: 'a patch against a slug that names no row',
    run: (store) => patchDomain(store, SENTINEL_SLUG, {
      name: SENTINEL_NAME,
    }),
    needles: [SENTINEL_SLUG, SENTINEL_NAME],
  },
  {
    label: 'a slug another domain already holds',
    run: (store) => createDomain(store, {
      slug: RADAR,
      name: SENTINEL_NAME,
    }),
    needles: [SENTINEL_NAME],
  },
  {
    label: 'an undeclared key a create body carried',
    run: (store) => createDomain(store, {
      slug: SENTINEL_SLUG,
      name: SENTINEL_NAME,
      [SENTINEL_KEY]: 1,
    }),
    needles: SENTINELS,
  },
  {
    label: 'a key inside an open record',
    run: (store) => createDomain(store, {
      slug: SENTINEL_SLUG,
      name: SENTINEL_NAME,
      settings: { scoringWeights: { [SENTINEL_KEY]: SENTINEL_NAME } },
    }),
    needles: SENTINELS,
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
    // the same helper is run against an envelope built here, out of
    // details this module did not produce, and has to find each one.
    const planted = JSON.stringify({
      code: 'CONFLICT',
      message: `No domain carries ${SENTINEL_SLUG}`,
      details: [
        { field: SENTINEL_KEY, message: SENTINEL_NAME, code: 'custom' },
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
    it(`answers ${row.label} without quoting it back`, async () => {
      const store = await storeHolding(RADAR);
      const refusal = await refusalFrom(() => row.run(store));
      const answered = JSON.stringify(refusal.toJSON());
      const found = row.needles.map((needle) => ({
        needle,
        occurrences: countOccurrences(answered, needle),
      }));

      // Counted rather than asserted absent, so the reading is a
      // number that the planted control above has shown can be
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
});
