/**
 * `src/personas/service.ts` — what the four persona operations
 * refuse. Driven over `tests/helpers/memory-research-store.ts`, so
 * every claim here is answered with no database anywhere.
 *
 * Five claims, every one of them about a way this module says no.
 * What an accepted call LANDS is the next task's half and arrives
 * in this same file, which is why every figure in the grid at the
 * end of this block is marked as one that will move when it does.
 *
 * THAT AN ADDRESS NAMING NOTHING IS A 404 ON ALL FOUR OPERATIONS,
 * and that the two addresses are told apart. A `:slug` naming no
 * domain and an `:id` naming no persona are fixed in different
 * places, so a module answering one sentence to both would send an
 * operator to the wrong one — a distinction pinned without pinning
 * either wording, since the sentences are free to be reworded and
 * the difference is not. Each row carries its own positive control
 * in a case of its own: a service refusing everything passes every
 * assertion a refusal case makes on its own.
 *
 * THAT A TAKEN ROLE IS A 409 FROM BOTH WRITES THAT CAN PROPOSE
 * ONE, which is the substantive difference from the two sibling
 * services and the reason the table is driven through the create
 * AND the rename. `PersonaPatch` carries `role`, where
 * `CategoryPatch` refuses to carry `key` and `DomainPatch` its
 * `slug`, so this is the only wave-1 patch that can reach a unique
 * key at all — and a rename onto a taken role is the likelier of
 * the two in a deployment, since a role is typed once and retuned
 * for months. `StoreRefusal` is deliberately not an `AppError`, so
 * an untranslated one answers 500; the cases pin the translation
 * rather than merely that something was thrown. Three controls
 * follow, and the third is the one the first two cannot stand in
 * for: the key is unique within the DOMAIN and not across the
 * table, so the same role under a second domain has to be
 * accepted, and a service or a store holding it globally is green
 * against every other case in this file.
 *
 * THAT THE TWO REASONS THE PORT DECLARES ARE TOLD APART, INCLUDING
 * THE ONE ONLY A LOST RACE REACHES. `createPersona` resolves the
 * domain and only then writes, so a foreign-key refusal means the
 * row went between the two — a state the ordinary fixture cannot
 * produce and which is therefore RECONSTRUCTED rather than
 * stubbed: the domain is really deleted, the lookup really answers
 * the row it had, and what the write meets is the store's own
 * refusal. Beside it sit the two rethrow cases, which are what
 * says a reason `PersonaStore` does not declare answers 500 rather
 * than a plausible status no rule authorised.
 *
 * THAT A BODY IS PARSED HERE, not above. Every row of the body
 * table is submitted to a SERVICE function rather than to a
 * schema, which is what says an MCP tool in wave 3 cannot be
 * handed a payload the HTTP route would have refused. Both
 * operations that take a body have rows of their own, since a row
 * driven through only one of them pins nothing about the other,
 * and both orderings are pinned: a malformed body outranks a slug
 * that names nothing AND an id that names nothing. The EMPTY ROLE
 * is the row the table exists for and it appears against both
 * operations; the row that makes it readable is its neighbour,
 * where an empty `systemText` is ACCEPTED by both. A schema
 * holding the two columns to one rule is green against one of
 * those and red against the other whichever way it went.
 *
 * THAT NOTHING SUBMITTED COMES BACK. The containment block counts
 * occurrences of a sentinel in the serialised refusal rather than
 * asserting absence, and takes the same count over a planted
 * envelope — a search that would find nothing anywhere reports a
 * clean refusal and a leaking one alike. Its two conflict rows
 * plant their OWN colliding role rather than colliding with the
 * fixture's, because the value a duplicate refusal is likeliest to
 * quote is the one the request collided ON: a row reusing a
 * fixture role would leave exactly that channel unmeasured while
 * looking identical in the output.
 *
 * Mutation grid, measured over the 56 cases here with
 * `--reporter=json` and read as the failed `fullName` SET rather
 * than as a count. Eighteen legs in two classes, because a grid
 * made of one class leaves the other half green while looking
 * thorough.
 *
 * ONE broad narrowing leg carries the whole file. Refusing every
 * slug reddened 47 of 56, and the 9 survivors are exactly the
 * cases that CALL NOTHING — eight table guards reading only the
 * table beside them, plus the planted containment control, which
 * is invisible by construction because it proves the SEARCH where
 * the leak leg proves the SUBJECT. That roster is the reading, not
 * the count: it says which cases are guards and which exercise the
 * module. Every other leg below reddens a subset of that 47.
 *
 * The role legs are NESTED rather than independent. Rethrowing the
 * unique refusal reddens 7 — both 409 cases, both of their
 * read-back controls, both containment rows and the `cause` case —
 * while answering that same refusal a 404 reddens a strict SUBSET
 * of 2, the two 409 cases alone, because a wrong status still
 * leaves an `AppError` for the refusal helper to hand back and
 * every read-back control still sees a row nobody wrote.
 * Interpolating the submitted role into that 409, with the
 * `{ cause: err }` bag preserved so the leg carries one claim
 * rather than two, reddens exactly 1: the create containment row,
 * and only because that row plants its own colliding role.
 *
 * The two foreign-key legs redden an IDENTICAL set of 2 and are
 * still two independent halves. The discriminator is which
 * assertion inside each case failed, measured rather than
 * reasoned: rethrowing fails at the refusal helper, with a
 * `StoreRefusal` reaching the caller, while answering 409 fails at
 * the `instanceof NotFoundError` line.
 *
 * The address legs partition and then overlap by exactly one.
 * Never reporting a missing persona from the patch reddens 3 and
 * never reporting one from the delete reddens 3; they SHARE one
 * case, the distinctness case, which is also the whole of what
 * collapsing the two 404 sentences into one reddens.
 *
 * The four schema legs are disjoint by operation and by member —
 * an empty role admitted by the create reddens 2 and by the patch
 * 2, defaulting the system text reddens 2, dropping `.strict()`
 * reddens 3 on the create and 2 on the patch — each being the body
 * rows plus, where the operation has one, its containment row.
 * Both ORDERING legs reddened exactly 1 and each sits INSIDE its
 * own schema leg's set, which is what says an ordering case is a
 * narrowing of the schema claim rather than a second copy of it.
 * Dropping `role` from the patch handed to the store reddens 4,
 * the whole rename half in one leg.
 *
 * ONE MEASURED ZERO, structural rather than a hole: taking the
 * list's total from the rows in hand reddens nothing, because the
 * only case reading `total` here reads it through a window wider
 * than the collection. It is a claim the positive half owns, and
 * it is named here so the successor task re-derives the grid
 * rather than inheriting the zero.
 */
import type { PersonaServiceStore } from './service.js';
import type { PersonaRecord } from './store.js';
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
  createPersona,
  deletePersona,
  listPersonas,
  patchPersona,
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
 * A window wider than any collection planted here.
 *
 * Wide on purpose: nothing in this file is about paging, and a
 * window narrow enough to be interesting would make every list
 * refusal depend on where its rows happened to fall. What the
 * window ARRIVES as rather than what it selects is
 * `src/http/schemas.ts`'s claim, and what it selects is the
 * positive half this file's successor writes.
 */
const WIDE_WINDOW: StoreWindow = { limit: 50, offset: 0 };

/**
 * Two domains, three personas, and the store holding them.
 *
 * The shape is chosen so that the one refusal that has to be
 * WIDENED against is planted rather than asserted: {@link foreign}
 * carries the same role {@link scorer} does, under the other
 * domain. `personas_domain_id_role_unique` is per-domain, so a
 * store or a service holding it globally cannot even build this
 * fixture — every case in the file fails at its first line rather
 * than one case failing for the right reason. The explicit
 * widening control below is what turns that blunt signal into a
 * named one.
 */
interface PlantedPersonas {
  /** The store, holding {@link RADAR} and {@link TRANSIT}. */
  readonly store: MemoryResearchStore;

  /** A persona of {@link RADAR}, and the role a duplicate takes. */
  readonly scorer: PersonaRecord;

  /** A second persona of {@link RADAR}, the one every patch moves. */
  readonly drafter: PersonaRecord;

  /** A persona of {@link TRANSIT}, carrying {@link scorer}'s role. */
  readonly foreign: PersonaRecord;
}

/**
 * Plants that shape through the service under test.
 *
 * Through {@link createPersona} rather than through the store, so
 * every case starts from writes this module accepted. A planting
 * helper reaching past the subject would leave the whole file
 * green against a `createPersona` that refused everything.
 *
 * @returns The store and the three rows.
 */
async function plantPersonas(): Promise<PlantedPersonas> {
  const store = createMemoryResearchStore();

  await store.insertDomain({ slug: RADAR, name: 'Radar', settings: {} });
  await store.insertDomain({ slug: TRANSIT, name: 'Transit', settings: {} });

  const scorer = await createPersona(store, RADAR, {
    role: 'scorer',
    systemText: 'Score what the researcher found.',
  });
  const drafter = await createPersona(store, RADAR, {
    role: 'drafter',
    systemText: 'Draft the digest.',
  });
  const foreign = await createPersona(store, TRANSIT, {
    role: 'scorer',
    systemText: 'Score transit findings.',
  });

  return { store, scorer, drafter, foreign };
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
  'createPersona',
  'deletePersona',
  'listPersonas',
  'patchPersona',
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
   * names no persona — and a caller has to be able to tell which,
   * since the two are fixed in different places.
   */
  readonly subject: 'domain' | 'persona';

  /** The call that has to be refused. */
  readonly refuse: (planted: PlantedPersonas) => Promise<unknown>;

  /** The same call against an address that is there. */
  readonly control: (planted: PlantedPersonas) => Promise<unknown>;
}

/** Every operation that can be handed an address naming no row. */
const MISSING_CASES: readonly MissingCase[] = [
  {
    operation: 'listPersonas',
    subject: 'domain',
    refuse: ({ store }) => listPersonas(store, MISSING_SLUG, WIDE_WINDOW),
    control: ({ store }) => listPersonas(store, RADAR, WIDE_WINDOW),
  },
  {
    operation: 'createPersona',
    subject: 'domain',
    refuse: ({ store }) => createPersona(store, MISSING_SLUG, {
      role: 'researcher',
      systemText: 'Find things.',
    }),
    control: ({ store }) => createPersona(store, RADAR, {
      role: 'researcher',
      systemText: 'Find things.',
    }),
  },
  {
    operation: 'patchPersona',
    subject: 'persona',
    refuse: ({ store }) => patchPersona(store, MISSING_ID, {
      systemText: 'Retuned.',
    }),
    control: ({ store, drafter }) => patchPersona(store, drafter.id, {
      systemText: 'Retuned.',
    }),
  },
  {
    operation: 'deletePersona',
    subject: 'persona',
    refuse: ({ store }) => deletePersona(store, MISSING_ID),
    control: ({ store, drafter }) => deletePersona(store, drafter.id),
  },
];

describe('an address that names nothing', () => {
  it('covers every operation this module exports', () => {
    // Paired by name rather than by count, so a fifth operation
    // added to the module without a row here is this case failing
    // rather than a table that quietly covers four of five.
    expect(MISSING_CASES.map((row) => row.operation).sort())
      .toEqual([...OPERATIONS].sort());
  });

  it('carries rows for both addresses a path can name', () => {
    expect([...new Set(MISSING_CASES.map((row) => row.subject))].sort())
      .toEqual(['domain', 'persona']);
  });

  for (const row of MISSING_CASES) {
    it(`answers 404 from ${row.operation}`, async () => {
      const planted = await plantPersonas();
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
      const planted = await plantPersonas();

      await expect(row.control(planted)).resolves.not.toThrow();
    });
  }

  it('says which of the two addresses was wrong', async () => {
    // Not a pin on the wording, which is free to change: a pin on
    // the DISTINCTION. A module answering one sentence to both
    // would send an operator to fix a slug when the id was the
    // fault, and is green against every case above.
    const planted = await plantPersonas();
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
      { subject: 'persona', distinct: 1 },
    ]);

    const everySentence = [...said.values()].flatMap((seen) => [...seen]);

    expect(new Set(everySentence).size).toBe(2);
  });

  it('leaves the collection alone when it refuses', async () => {
    // A delete refused for naming nothing must not have taken
    // something else on the way past. Read back through the list,
    // not off the refusal.
    const planted = await plantPersonas();

    await refusalFrom(() => deletePersona(planted.store, MISSING_ID));

    const page = await listPersonas(planted.store, RADAR, WIDE_WINDOW);

    expect(page.rows.map((row) => row.role)).toEqual(['drafter', 'scorer']);
    expect(page.total).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// A role the domain already carries
// ---------------------------------------------------------------------------

/**
 * The two writes that can propose a role, and so the two that can
 * be refused for one.
 *
 * BOTH ARE HERE BECAUSE BOTH CAN REACH THE KEY, which is what
 * separates this surface from its siblings: `PersonaPatch` carries
 * `role`, where `CategoryPatch` refuses to carry `key` and
 * `DomainPatch` its `slug`. A table driven through the create
 * alone would leave the rename's translation pinned by nothing,
 * and a rename onto a taken role is the likelier of the two in a
 * deployment — a role is typed once and retuned for months.
 */
interface DuplicateCase {
  /** What makes this row different from every other. */
  readonly label: string;

  /** The write proposing a role the domain already carries. */
  readonly refuse: (planted: PlantedPersonas) => Promise<unknown>;
}

/** Both ways a caller can propose a role that is taken. */
const DUPLICATE_CASES: readonly DuplicateCase[] = [
  {
    label: 'a create under a role the domain carries',
    refuse: ({ store, scorer }) => createPersona(store, RADAR, {
      role: scorer.role,
      systemText: 'A rival scorer.',
    }),
  },
  {
    label: 'a rename onto a role the domain carries',
    refuse: ({ store, drafter, scorer }) => patchPersona(store, drafter.id, {
      role: scorer.role,
    }),
  },
];

describe('a role the domain already carries', () => {
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
      const planted = await plantPersonas();
      const refusal = await refusalFrom(() => row.refuse(planted));

      expect(refusal).toBeInstanceOf(ConflictError);
      expect(refusal.code).toBe('CONFLICT');
      expect(refusal.statusCode).toBe(409);

      // No `details`: the refusal is one fact, and the per-table
      // counts a domain delete carries have no analogue here.
      expect(refusal.details).toBeUndefined();
    });
  }

  it('creates under a role the domain does not carry', async () => {
    // The narrow control: a module refusing every create passes
    // the create row above and fails this one.
    const { store } = await plantPersonas();
    const created = await createPersona(store, RADAR, {
      role: 'researcher',
      systemText: 'Find things.',
    });

    expect(created.role).toBe('researcher');
  });

  it('renames onto a role the domain does not carry', async () => {
    // The same control for the other write. The two are separate
    // cases because the two translations are separate call sites,
    // and a module that had stopped translating one of them passes
    // the other's.
    const { store, drafter } = await plantPersonas();
    const patched = await patchPersona(store, drafter.id, {
      role: 'researcher',
    });

    expect(patched.role).toBe('researcher');
    expect(patched.id).toBe(drafter.id);
  });

  it('creates the same role under a second domain', async () => {
    // The WIDENING control, and the one the two narrow controls
    // cannot stand in for: the role is unique within the DOMAIN
    // and not across the table, so a service (or a store) holding
    // it globally passes every case above and fails only this.
    const planted = await plantPersonas();
    const created = await createPersona(planted.store, TRANSIT, {
      role: planted.drafter.role,
      systemText: 'Draft the transit digest.',
    });

    expect(created.role).toBe(planted.drafter.role);
    expect(created.domainId).not.toBe(planted.drafter.domainId);
  });

  it('leaves a persona holding the role it already had', async () => {
    // A row is not in conflict with itself: a patch naming the
    // role the addressed row already carries is a no-op and not a
    // 409. A store checking the resulting pair without excluding
    // the row being written refuses this, and nothing else in the
    // file reports it.
    const { store, drafter } = await plantPersonas();
    const patched = await patchPersona(store, drafter.id, {
      role: drafter.role,
    });

    expect(patched).toStrictEqual(drafter);
  });

  it('leaves both rows standing when it refuses a rename', async () => {
    // Read back through the list rather than off the refusal: a
    // translation that answered 409 after writing would satisfy
    // every assertion above.
    const planted = await plantPersonas();

    await refusalFrom(() => patchPersona(planted.store, planted.drafter.id, {
      role: planted.scorer.role,
    }));

    const page = await listPersonas(planted.store, RADAR, WIDE_WINDOW);

    expect(page.rows.map((row) => row.role)).toEqual(['drafter', 'scorer']);
  });

  it('keeps the refusal off the second domain', async () => {
    // The rename above was refused; the other domain's persona
    // carrying that same role is untouched, which is the widening
    // control restated over a refusal rather than an acceptance.
    const planted = await plantPersonas();

    await refusalFrom(() => createPersona(planted.store, RADAR, {
      role: planted.scorer.role,
      systemText: 'A rival scorer.',
    }));

    const page = await listPersonas(planted.store, TRANSIT, WIDE_WINDOW);

    expect(page.rows.map((row) => row.role)).toEqual([planted.foreign.role]);
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
 * The bodies the two operations have to refuse.
 *
 * Both carry rows of their own rather than sharing them. They run
 * through one `parseBody`, so a mutation degrading that function
 * reddens both halves equally and a table driven through one of
 * them would pin only that the two share an implementation — while
 * the two schemas genuinely differ, `systemText` being required by
 * one and optional on the other.
 *
 * Every row here is submitted to a SERVICE function rather than to
 * a schema, which is the point: it is what says an MCP tool in
 * wave 3 cannot be handed a body the HTTP route would have
 * refused.
 *
 * THE EMPTY ROLE IS THE ROW THIS TABLE EXISTS FOR, and it appears
 * against both operations. A role is half the row's natural key
 * and a persona keyed the empty string is one no list can label,
 * so `.min(1)` is the one restriction `createPersonaSchema` puts
 * on a column carrying no CHECK. Its neighbour is the row that
 * makes it readable: an EMPTY `systemText` is accepted, on both
 * operations, because a role with nothing to say yet is a state an
 * operator can act on. A schema holding the two columns to the
 * same rule is green against one of these rows and red against the
 * other whichever way it went.
 *
 * There is no open record on this surface, so no row carries a `*`
 * and no call below passes `openPaths`. A persona body is two
 * declared members and nothing else.
 */
const BODY_CASES: readonly BodyCase[] = [
  {
    label: 'a create body that is not an object',
    operation: 'create',
    body: null,
    details: [{ field: 'body', code: 'invalid_type' }],
  },
  {
    label: 'a create body carrying neither member',
    operation: 'create',
    body: {},
    details: [
      { field: 'role', code: 'invalid_type' },
      { field: 'systemText', code: 'invalid_type' },
    ],
  },
  {
    label: 'a create body keyed the empty role',
    operation: 'create',
    body: { role: '', systemText: 'Score it.' },
    details: [{ field: 'role', code: 'too_small' }],
  },
  {
    label: 'a create body leaving the system text off',
    operation: 'create',
    body: { role: 'researcher' },
    details: [{ field: 'systemText', code: 'invalid_type' }],
  },
  {
    label: 'a create body submitting the system text as null',
    operation: 'create',
    body: { role: 'researcher', systemText: null },
    details: [{ field: 'systemText', code: 'invalid_type' }],
  },
  {
    label: 'a create body submitting the role as a number',
    operation: 'create',
    body: { role: 3, systemText: 'Score it.' },
    details: [{ field: 'role', code: 'invalid_type' }],
  },
  {
    label: 'a create body naming its own domain',
    operation: 'create',
    body: { role: 'researcher', systemText: 'Find things.', domainId: 1 },
    details: [{ field: 'body', code: 'unrecognized_keys' }],
  },
  {
    label: 'a create body naming the domain by slug',
    operation: 'create',
    body: {
      role: 'researcher',
      systemText: 'Find things.',
      domainSlug: RADAR,
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
    label: 'a patch renaming the role to the empty string',
    operation: 'patch',
    body: { role: '' },
    details: [{ field: 'role', code: 'too_small' }],
  },
  {
    label: 'a patch clearing the system text with null',
    operation: 'patch',
    body: { role: 'researcher', systemText: null },
    details: [{ field: 'systemText', code: 'invalid_type' }],
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
  planted: PlantedPersonas,
  row: BodyCase,
): Promise<unknown> {
  return row.operation === 'create'
    ? createPersona(planted.store, RADAR, row.body)
    : patchPersona(planted.store, planted.drafter.id, row.body);
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

  it('refuses the empty role from both operations', () => {
    // The scoped claim, held against the table rather than against
    // a memory of what was written into it: a row deleted from
    // either half stops this file covering the refusal it is named
    // for, and nothing else here would report it.
    const empty = BODY_CASES.filter(
      (row) => row.details.some((detail) => detail.code === 'too_small'),
    );

    expect(empty.map((row) => row.operation).sort())
      .toEqual([...BODY_OPERATIONS].sort());
    expect(empty.every((row) => row.details.length === 1)).toBe(true);
    expect([...new Set(empty.flatMap(
      (row) => row.details.map((detail) => detail.field),
    ))]).toEqual(['role']);
  });

  for (const row of BODY_CASES) {
    it(`refuses ${row.label}`, async () => {
      const planted = await plantPersonas();
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
    // operation: a module refusing every body passes all twelve
    // rows above and fails this.
    const { store, drafter } = await plantPersonas();
    const created = await createPersona(store, RADAR, {
      role: 'researcher',
      systemText: 'Find things.',
    });
    const patched = await patchPersona(store, drafter.id, {
      systemText: 'Draft it differently.',
    });

    expect(created.role).toBe('researcher');
    expect(patched.systemText).toBe('Draft it differently.');
  });

  it('accepts the empty system text from both operations', async () => {
    // The row that makes the empty-role rows readable. A role with
    // nothing to say yet is a state an operator can act on, so the
    // empty string is a value here and not an absence — and a
    // schema holding both columns to `.min(1)` fails this while
    // passing every refusal above.
    const { store, drafter } = await plantPersonas();
    const created = await createPersona(store, RADAR, {
      role: 'researcher',
      systemText: '',
    });
    const patched = await patchPersona(store, drafter.id, {
      systemText: '',
    });

    expect(created.systemText).toBe('');
    expect(patched.systemText).toBe('');
  });

  it('accepts a patch that carries no member at all', async () => {
    // The port's rule rather than this module's: `personas` has no
    // `updated_at`, so an empty patch has nothing to set and
    // answers the stored row. A schema making either member
    // required refuses this and passes every row above.
    const { store, drafter } = await plantPersonas();
    const patched = await patchPersona(store, drafter.id, {});

    expect(patched).toStrictEqual(drafter);
  });

  it('refuses a malformed patch against an id that is not there', async () => {
    // The body is parsed before the id is resolved, so the same
    // patch answers the same refusal either way. A module
    // resolving first would answer this 404 and the matching row
    // above 422, which would make a caller's error depend on rows
    // it never asked about.
    const { store } = await plantPersonas();
    const refusal = await refusalFrom(
      () => patchPersona(store, MISSING_ID, { role: '' }),
    );

    expect(refusal).toBeInstanceOf(ValidationError);
    expect(detailsOf(refusal.details as FieldError[] | undefined))
      .toEqual([{ field: 'role', code: 'too_small' }]);
  });

  it('refuses a malformed create against a slug that is not', async () => {
    // The same ordering claim on the other operation.
    // `createPersona` parses, then resolves the domain, so a body
    // fault outranks a slug that names nothing.
    const { store } = await plantPersonas();
    const refusal = await refusalFrom(
      () => createPersona(store, MISSING_SLUG, { role: '', systemText: 1 }),
    );

    expect(refusal).toBeInstanceOf(ValidationError);
    expect(detailsOf(refusal.details as FieldError[] | undefined))
      .toEqual([
        { field: 'role', code: 'too_small' },
        { field: 'systemText', code: 'invalid_type' },
      ]);
  });
});

// ---------------------------------------------------------------------------
// What only a lost race can produce
// ---------------------------------------------------------------------------

describe('what only a lost race can produce', () => {
  it('answers 404 when the domain went between the two', async () => {
    // The one branch the ordinary fixture cannot reach:
    // `createPersona` resolves the domain and only then writes, so
    // a foreign-key refusal means the row was deleted in between.
    // Reconstructed rather than stubbed — the domain is really
    // removed, and the lookup really answers the row it had — so
    // what the write meets is the store's own refusal. The answer
    // is the same 404 the lookup itself raises, because it is the
    // same fact: no domain carries that slug.
    const { store } = await plantPersonas();
    const found = await store.findDomainBySlug(RADAR);

    if (found === null) {
      throw new Error('the fixture planted no domain to capture');
    }

    await store.deleteDomain(found.id);

    const vanished: PersonaServiceStore = {
      ...store,
      findDomainBySlug: async () => found,
    };
    const refusal = await refusalFrom(() => createPersona(vanished, RADAR, {
      role: 'researcher',
      systemText: 'Find things.',
    }));

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.statusCode).toBe(404);
    expect(refusal.cause).toBeInstanceOf(StoreRefusal);
  });

  it('answers 404 rather than the 409 a taken role gets', async () => {
    // The narrow claim inside the case above: the two reasons
    // `PersonaStore` declares are told apart. A translator keying
    // on `instanceof StoreRefusal` alone would answer one status
    // to both, and would pass every duplicate case in this file.
    const { store, scorer } = await plantPersonas();
    const found = await store.findDomainBySlug(RADAR);

    if (found === null) {
      throw new Error('the fixture planted no domain to capture');
    }

    await store.deleteDomain(found.id);

    const vanished: PersonaServiceStore = {
      ...store,
      findDomainBySlug: async () => found,
    };
    const refusal = await refusalFrom(() => createPersona(vanished, RADAR, {
      role: scorer.role,
      systemText: 'A rival scorer.',
    }));

    expect(refusal.code).toBe('NOT_FOUND');
    expect(refusal.code).not.toBe('CONFLICT');
  });

  it('rethrows a reason this port does not declare', async () => {
    // `personas` carries no CHECK and no trigger, so a
    // `check-violation` out of a persona write is a store doing
    // something its port does not describe. It is rethrown as
    // itself, which answers 500 — rather than a plausible status
    // no rule authorised. A translator with a catch-all branch
    // passes every other case here and fails this.
    const { store } = await plantPersonas();
    const misbehaving: PersonaServiceStore = {
      ...store,
      insertPersona: async () => {
        throw new StoreRefusal({
          reason: 'check-violation',
          constraint: 'a constraint this table does not carry',
        });
      },
    };

    await expect(createPersona(misbehaving, RADAR, {
      role: 'researcher',
      systemText: 'Find things.',
    })).rejects.toBeInstanceOf(StoreRefusal);
  });

  it('rethrows an error that is not a store refusal', async () => {
    // The other half of the same rule, on the other write. A
    // driver fault is not a decision about rows, so nothing here
    // dresses it as one.
    const { store, drafter } = await plantPersonas();
    const misbehaving: PersonaServiceStore = {
      ...store,
      updatePersona: async () => {
        throw new TypeError('the driver failed on its own account');
      },
    };

    await expect(patchPersona(misbehaving, drafter.id, {
      systemText: 'Retuned.',
    })).rejects.toBeInstanceOf(TypeError);
  });
});

// ---------------------------------------------------------------------------
// What a refusal is allowed to say
// ---------------------------------------------------------------------------

/** A slug shaped like one, so it reaches the store rather than the parser. */
const SENTINEL_SLUG = 'sentinel-slug-value';

/**
 * A role, submitted as one.
 *
 * Free text with spaces in it, which this surface accepts: `role`
 * is held to non-empty and nothing more, matching the seed. A
 * sentinel a schema would have refused for its SHAPE would be
 * testing the parser rather than the containment.
 */
const SENTINEL_ROLE = 'sentinel role value';

/** A submitted value, carried as the system text. */
const SENTINEL_TEXT = 'sentinel text value';

/** A key no schema here declares, submitted as one. */
const SENTINEL_MEMBER = 'sentinelMemberValue';

/**
 * The four strings the rows below submit. None is a substring of
 * another, so a count against one cannot be satisfied by another.
 */
const SENTINELS = [
  SENTINEL_SLUG,
  SENTINEL_ROLE,
  SENTINEL_TEXT,
  SENTINEL_MEMBER,
];

/** One refused request, and what it submitted that must not return. */
interface ContainmentCase {
  /** What makes this row different from every other. */
  readonly label: string;

  /** The call, submitting the needles below. */
  readonly run: (planted: PlantedPersonas) => Promise<unknown>;

  /** The submitted strings the answer must not carry. */
  readonly needles: readonly string[];
}

/**
 * Every channel a submitted string could come back through.
 *
 * THE TWO CONFLICT ROWS PLANT THEIR OWN COLLIDING ROW rather than
 * colliding with the fixture's. The value a duplicate refusal is
 * likeliest to quote is the one the request collided ON, so a row
 * reusing a fixture role would leave exactly that channel
 * unmeasured while looking identical in the output — the needle
 * would be the system text, which no duplicate refusal has any
 * reason to name.
 */
const CONTAINMENT_CASES: readonly ContainmentCase[] = [
  {
    label: 'a slug that names no domain',
    run: ({ store }) => listPersonas(store, SENTINEL_SLUG, WIDE_WINDOW),
    needles: [SENTINEL_SLUG],
  },
  {
    label: 'a create against a slug that names no domain',
    run: ({ store }) => createPersona(store, SENTINEL_SLUG, {
      role: SENTINEL_ROLE,
      systemText: SENTINEL_TEXT,
    }),
    needles: [SENTINEL_SLUG, SENTINEL_ROLE, SENTINEL_TEXT],
  },
  {
    label: 'a create under a role the domain carries',
    run: async ({ store }) => {
      await createPersona(store, RADAR, {
        role: SENTINEL_ROLE,
        systemText: 'The row the next call collides with.',
      });

      return createPersona(store, RADAR, {
        role: SENTINEL_ROLE,
        systemText: SENTINEL_TEXT,
      });
    },
    needles: [SENTINEL_ROLE, SENTINEL_TEXT],
  },
  {
    label: 'a rename onto a role the domain carries',
    run: async ({ store, drafter }) => {
      await createPersona(store, RADAR, {
        role: SENTINEL_ROLE,
        systemText: 'The row the next call collides with.',
      });

      return patchPersona(store, drafter.id, { role: SENTINEL_ROLE });
    },
    needles: [SENTINEL_ROLE],
  },
  {
    label: 'an undeclared member of a create body',
    run: ({ store }) => createPersona(store, RADAR, {
      role: SENTINEL_ROLE,
      systemText: SENTINEL_TEXT,
      [SENTINEL_MEMBER]: 1,
    }),
    needles: [SENTINEL_ROLE, SENTINEL_TEXT, SENTINEL_MEMBER],
  },
  {
    label: 'an undeclared member of a patch body',
    run: ({ store, drafter }) => patchPersona(store, drafter.id, {
      systemText: SENTINEL_TEXT,
      [SENTINEL_MEMBER]: 1,
    }),
    needles: [SENTINEL_TEXT, SENTINEL_MEMBER],
  },
  {
    label: 'a patch against an id that is not there',
    run: ({ store }) => patchPersona(store, MISSING_ID, {
      role: SENTINEL_ROLE,
      systemText: SENTINEL_TEXT,
    }),
    needles: [SENTINEL_ROLE, SENTINEL_TEXT],
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
          message: `${SENTINEL_ROLE} is taken, and says ${SENTINEL_TEXT}`,
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
      const planted = await plantPersonas();
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
    const { store, scorer } = await plantPersonas();
    const refusal = await refusalFrom(() => createPersona(store, RADAR, {
      role: scorer.role,
      systemText: SENTINEL_TEXT,
    }));

    expect(refusal.cause).toBeInstanceOf(StoreRefusal);
    expect(Object.keys(refusal.toJSON()).sort())
      .toEqual(['code', 'message']);
  });
});
