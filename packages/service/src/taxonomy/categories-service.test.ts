/**
 * `src/taxonomy/categories-service.ts` — what the four category
 * operations refuse. Driven over
 * `tests/helpers/memory-research-store.ts`, so every claim here is
 * answered with no database anywhere.
 *
 * Six claims, all of them about the ways this module says no; what
 * an accepted request LANDS is the next task's file-mate.
 *
 * THAT AN ADDRESS NAMING NOTHING IS A 404 ON ALL FOUR OPERATIONS,
 * and that the two addresses are told apart. A `:slug` naming no
 * domain and a `:id` naming no category are fixed in different
 * places, so a module answering one sentence to both would send an
 * operator to the wrong one — a distinction pinned without pinning
 * either wording, since the sentences are free to be reworded and
 * the difference is not. Each row carries its own positive control
 * in a case of its own: a service refusing everything passes every
 * assertion a refusal case makes on its own.
 *
 * THAT A TAKEN KEY IS A 409 AND NOT A 500. `StoreRefusal` is
 * deliberately not an `AppError`, so an untranslated one answers
 * 500; the case pins the translation rather than merely that
 * something was thrown. It carries TWO controls, and the second is
 * the one the first cannot stand in for: the key is unique within
 * the DOMAIN and not across the table, so the same key under a
 * second domain has to be accepted, and a service or a store holding
 * it globally is green against every other case in this file.
 *
 * THAT EVERY WAY A PARENT CAN BE REFUSED IS A 422 NAMING `parentId`,
 * from every write that can reach it. All three branches of the
 * depth trigger arrive as ONE reason carrying NO constraint name —
 * measured against the live server, recorded in `./store.ts` — so
 * the table would be equally green against a module answering the
 * same detail to every parent fault whatever caused it. The fourth
 * row class is what makes the other three readable: a `parentId`
 * naming no row is refused by the FOREIGN KEY, and its detail
 * carries a different code. The one-level sentence is asserted
 * separately from the codes, because that message is this module's
 * own rather than the parser's.
 *
 * THAT THE DELETE A CATEGORY'S CHILDREN REFUSE IS A 409 AND NOT A
 * 422. Those two refusals are indistinguishable at the error: one
 * constraint name — `categories_parent_id_categories_id_fk` — covers
 * both a parent that is not there and children that are, so the only
 * discriminator is which call was made. That is the whole of the
 * claim, and it is why the module takes the write as an argument
 * rather than reading the refusal harder. Two controls follow it: a
 * childless delete answers, and removing the child then lets the
 * same parent go — which says the rule has a way past it rather than
 * being a row that had stopped being deletable.
 *
 * THAT A BODY IS PARSED HERE, not above. Every row of the body table
 * is submitted to a SERVICE function rather than to a schema, which
 * is what says an MCP tool in wave 3 cannot be handed a payload the
 * HTTP route would have refused. Both operations that take a body
 * have rows of their own, since a row driven through only one of
 * them pins nothing about the other, and both orderings are pinned:
 * a malformed body outranks a slug that names nothing AND an id that
 * names nothing.
 *
 * THAT NOTHING SUBMITTED COMES BACK. The containment block counts
 * occurrences of a sentinel in the serialised refusal rather than
 * asserting absence, and takes the same count over a planted
 * envelope — a search that would find nothing anywhere reports a
 * clean refusal and a leaking one alike. One row of its own covers
 * the channel this module opens that the domains surface does not:
 * a `StoreRefusal` carries the submitted value in its driver
 * `detail` and the whole statement in the drizzle wrapper's
 * `message`, and every translation here passes it as `cause`.
 *
 * Mutation grid, measured over the 64 cases here with
 * `--reporter=json` and read as the failed `fullName` SET rather
 * than as a count. Eighteen legs in two classes, because a grid made
 * of one class leaves the other half green while looking thorough.
 * Every figure moves when the next task adds its positive cases to
 * this file, so re-run the whole grid rather than appending to it.
 *
 * Thirteen WIDENING legs. Rethrowing the unique refusal reddens 3 —
 * the 409, its containment row, and the row that reads the `cause`.
 * Rethrowing the depth refusal reddens 7: the five depth rows, the
 * sentence they share, and one containment row. Two legs sit INSIDE
 * that set rather than beside it, and the nesting is the reading:
 * answering the depth refusal a 409 reddens 6, the same set without
 * the containment row, while reporting its detail against `body`
 * instead of `parentId` reddens 7 — the five depth rows PLUS the two
 * absent-parent rows, which is a different seven and the one leg
 * that reaches every parent row at once. Giving both parent faults
 * the same code reddens exactly the 2 absent rows, which is the
 * whole of the evidence that the two are told apart.
 *
 * The address legs partition cleanly. Keying the foreign key on the
 * refusal instead of on the write reddens 1, the 409-not-422 case,
 * and nothing else in the file can see that fault. Skipping the
 * domain resolution reddens 3 on a list and 3 on a create — disjoint
 * except for the says-which-address case, which both reach —
 * dropping the 404 a delete answers reddens 2, and dropping
 * `.strict()` from the create schema reddens 2. Each of the two
 * ordering cases is pinned by exactly one leg: resolving the slug
 * before parsing a create body reddens 1, and reading the row before
 * parsing a patch body reddens 1.
 *
 * The leak leg reddens exactly 1, and only after being narrowed to
 * the branch it belongs in: interpolating the submitted `name` into
 * the 409 reddens the key-already-carried containment row alone.
 *
 * ONE LEG MEASURED ZERO, and it is the one worth stating rather than
 * dropping. Copying the `StoreRefusal`'s OWN message into the 409
 * reddens NOTHING, because the in-memory store constructs its
 * refusal from a reason and a constraint name and there is no
 * submitted content in it to leak. The channel that carries one —
 * the driver's `detail`, which reads `Key (domain_id, key)=(...)
 * already exists.`, and the drizzle wrapper's `Failed query:` line
 * with its bound parameters — exists only behind `./db-store.ts`. So
 * the containment rows here pin what THIS module builds, their zeros
 * rest on the planted control and on the leak leg above, and the
 * driver half is owed by the live seam rather than covered here.
 *
 * Five NARROWING legs, aimed at the controls, which is what the
 * controls are for. Three redden 53 of 64 apiece — refusing every
 * slug as missing, requiring `parentId` on a create, and refusing
 * every create as a duplicate — and that breadth IS the reading:
 * every case plants its taxonomy through `createCategory`, so a leg
 * breaking creation collapses the file and says those cases reach
 * the subject at all rather than passing over an empty dataset.
 * The two narrow ones are the informative ones: refusing every
 * delete as holding children reddens 5, and answering 404 to every
 * patch reddens 6, both sets made almost entirely of controls.
 *
 * What no module mutation reaches, by construction. The nine table
 * guards read only the tables beside them and are aimed at a later
 * edit — an operation added with no row, a depth branch dropped from
 * the fault list, a `create` row appearing under the patch-only
 * branch. The planted containment control is invisible for the same
 * reason and deliberately so: it proves the SEARCH, where the leak
 * leg proves the SUBJECT. And no leg touches
 * `src/http/validation.ts`, so every field path in the body table is
 * evidence about what this module ASKED FOR rather than about how
 * the masking is built.
 */
import type { CategoryRecord } from './store.js';
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
  createCategory,
  deleteCategory,
  listCategories,
  patchCategory,
} from './categories-service.js';

/** The seeded worked example, and the domain every case stores. */
const RADAR = 'example-tech-radar';

/** A second domain, invented in the same neutral register. */
const TRANSIT = 'example-urban-transit';

/** A slug shaped like one and carried by no row in any case here. */
const MISSING_SLUG = 'example-not-a-domain';

/** An id shaped like one and carried by no row in any case here. */
const MISSING_ID = 9999;

/**
 * A taxonomy with one of each shape the depth rule can be broken
 * against, plus the store holding it.
 *
 * Four rows rather than two, because the three branches of the depth
 * trigger need three different targets and one of them needs a
 * SECOND domain to be in. Every case here plants the same shape, so
 * a row is read by what it is rather than by how it was built.
 */
interface PlantedTaxonomy {
  /** The store, holding {@link RADAR} and {@link TRANSIT}. */
  readonly store: MemoryResearchStore;

  /** A root of {@link RADAR}, and the parent of {@link child}. */
  readonly rootA: CategoryRecord;

  /** A root of {@link RADAR} holding nothing. */
  readonly rootB: CategoryRecord;

  /** A child of {@link rootA}, and so an illegal parent. */
  readonly child: CategoryRecord;

  /** A root of {@link TRANSIT}, and so an out-of-domain parent. */
  readonly foreign: CategoryRecord;
}

/**
 * Plants that shape through the service under test.
 *
 * Through {@link createCategory} rather than through the store, so
 * every case starts from writes this module accepted. A planting
 * helper reaching past the subject would leave the whole file green
 * against a `createCategory` that refused everything.
 *
 * @returns The store and the four rows.
 */
async function plantTaxonomy(): Promise<PlantedTaxonomy> {
  const store = createMemoryResearchStore();

  await store.insertDomain({ slug: RADAR, name: 'Radar', settings: {} });
  await store.insertDomain({ slug: TRANSIT, name: 'Transit', settings: {} });

  const rootA = await createCategory(store, RADAR, {
    key: 'technologies',
    name: 'Technologies',
  });
  const rootB = await createCategory(store, RADAR, {
    key: 'phrases',
    name: 'Phrases',
  });
  const child = await createCategory(store, RADAR, {
    key: 'languages',
    name: 'Languages',
    parentId: rootA.id,
  });
  const foreign = await createCategory(store, TRANSIT, {
    key: 'modes',
    name: 'Modes',
  });

  return { store, rootA, rootB, child, foreign };
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
 *   `StoreRefusal` reaching a caller is a bug in this module rather
 *   than one of its answers, and folding it in would report a 500
 *   as a rule working.
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
 * `message` is among them only where THIS module built it; the
 * parser's wording belongs to `src/http/validation.ts` and is
 * asserted there. {@link detailsOf} therefore reports field and code
 * alone, and the parent sections assert the message separately
 * because the sentence is this module's own claim.
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
 *   boolean, so a zero can be read against a known positive taken by
 *   this same function in the same case.
 */
function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

// ---------------------------------------------------------------------------
// An address that names nothing
// ---------------------------------------------------------------------------

/** Every function this module exports. */
const OPERATIONS = [
  'createCategory',
  'deleteCategory',
  'listCategories',
  'patchCategory',
];

/**
 * One operation asked for something that is not there, beside the
 * same operation asked for something that is.
 *
 * The control is a member of the row rather than a table of its own,
 * because the two are one claim: a 404 for an address naming nothing
 * means nothing unless the identical call against a real address
 * answers.
 */
interface MissingCase {
  /** The exported function under test, and the row label. */
  readonly operation: string;

  /**
   * Which address was wrong. Two subjects reach these four
   * operations — a `:slug` that names no domain, and a `:id` that
   * names no category — and a caller has to be able to tell which,
   * since the two are fixed in different places.
   */
  readonly subject: 'category' | 'domain';

  /** The call that has to be refused. */
  readonly refuse: (planted: PlantedTaxonomy) => Promise<unknown>;

  /** The same call against an address that is there. */
  readonly control: (planted: PlantedTaxonomy) => Promise<unknown>;
}

/** Every operation that can be handed an address naming no row. */
const MISSING_CASES: readonly MissingCase[] = [
  {
    operation: 'listCategories',
    subject: 'domain',
    refuse: ({ store }) => listCategories(store, MISSING_SLUG),
    control: ({ store }) => listCategories(store, RADAR),
  },
  {
    operation: 'createCategory',
    subject: 'domain',
    refuse: ({ store }) => createCategory(store, MISSING_SLUG, {
      key: 'industries',
      name: 'Industries',
    }),
    control: ({ store }) => createCategory(store, RADAR, {
      key: 'industries',
      name: 'Industries',
    }),
  },
  {
    operation: 'patchCategory',
    subject: 'category',
    refuse: ({ store }) => patchCategory(store, MISSING_ID, {
      name: 'Renamed',
    }),
    control: ({ store, rootB }) => patchCategory(store, rootB.id, {
      name: 'Renamed',
    }),
  },
  {
    operation: 'deleteCategory',
    subject: 'category',
    refuse: ({ store }) => deleteCategory(store, MISSING_ID),
    control: ({ store, rootB }) => deleteCategory(store, rootB.id),
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
      .toEqual(['category', 'domain']);
  });

  for (const row of MISSING_CASES) {
    it(`answers 404 from ${row.operation}`, async () => {
      const planted = await plantTaxonomy();
      const refusal = await refusalFrom(() => row.refuse(planted));

      expect(refusal).toBeInstanceOf(NotFoundError);
      expect(refusal.code).toBe('NOT_FOUND');
      expect(refusal.statusCode).toBe(404);
      expect(refusal.details).toBeUndefined();
    });

    it(`answers ${row.operation} for an address that is`, async () => {
      // The positive control for the row above, varied along the one
      // axis under test: the same operation, the same body, an
      // address that resolves. A module refusing everything passes
      // the refusal case and fails this one.
      const planted = await plantTaxonomy();

      await expect(row.control(planted)).resolves.not.toThrow();
    });
  }

  it('says which of the two addresses was wrong', async () => {
    // Not a pin on the wording, which is free to change: a pin on
    // the DISTINCTION. A module answering one sentence to both would
    // send an operator to fix a slug when the id was the fault, and
    // is green against every case above.
    const planted = await plantTaxonomy();
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
      { subject: 'category', distinct: 1 },
      { subject: 'domain', distinct: 1 },
    ]);

    const everySentence = [...said.values()].flatMap((seen) => [...seen]);

    expect(new Set(everySentence).size).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// A key the domain already carries
// ---------------------------------------------------------------------------

describe('a key the domain already carries', () => {
  it('translates the store refusal into a 409', async () => {
    // `StoreRefusal` is deliberately not an `AppError`, so an
    // untranslated one answers 500 through the framework handler.
    // The assertions pin the translation and not merely that
    // something was thrown.
    const { store } = await plantTaxonomy();
    const refusal = await refusalFrom(() => createCategory(store, RADAR, {
      key: 'technologies',
      name: 'A rival bucket',
    }));

    expect(refusal).toBeInstanceOf(ConflictError);
    expect(refusal.code).toBe('CONFLICT');
    expect(refusal.statusCode).toBe(409);

    // No `details`: the refusal is one fact, and the per-table counts
    // a domain delete carries have no analogue here.
    expect(refusal.details).toBeUndefined();
  });

  it('creates under a key the domain does not carry', async () => {
    // The narrow control: a module refusing every create passes the
    // case above and fails this one.
    const { store } = await plantTaxonomy();
    const created = await createCategory(store, RADAR, {
      key: 'industries',
      name: 'Industries',
    });

    expect(created.key).toBe('industries');
  });

  it('creates the same key under a second domain', async () => {
    // The WIDENING control, and the one the narrow control cannot
    // stand in for: the key is unique within the DOMAIN and not
    // across the table, so a service (or a store) enforcing it
    // globally passes every case above and fails only this.
    const planted = await plantTaxonomy();
    const created = await createCategory(planted.store, TRANSIT, {
      key: 'technologies',
      name: 'Technologies',
    });

    expect(created.key).toBe(planted.rootA.key);
    expect(created.domainId).not.toBe(planted.rootA.domainId);
  });
});

// ---------------------------------------------------------------------------
// A parent the write may not have
// ---------------------------------------------------------------------------

/**
 * The three branches of `categories_enforce_depth()`, named as
 * `drizzle/0002_category_depth_guard.sql` and `./store.ts` name
 * them, plus the foreign key that catches what the trigger
 * deliberately leaves alone.
 *
 * Four rather than three, and the fourth is the one that makes the
 * others readable: all three depth branches arrive as ONE reason
 * carrying no constraint name, so a service could answer every
 * parent fault with the same detail and pass a table that held only
 * them. The `absent` row is what says the two are told apart.
 */
const PARENT_FAULTS = ['absent', 'children', 'foreign-domain', 'grandchild'];

/**
 * The detail code a depth refusal carries, as
 * `./categories-service.ts` declares it.
 *
 * Spelled here rather than imported, so a rename of the constant is
 * a red case rather than a silent change of what a caller reads off
 * the wire. Its VALUE is this service's own and not zod's, because
 * no schema can raise it.
 */
const DEPTH_CODE = 'depth_violation';

/** The detail code a parent naming no row carries. */
const UNKNOWN_PARENT_CODE = 'unknown_parent';

/** One parent a write may not have, beside one it may. */
interface ParentCase {
  /** What makes this row different from every other. */
  readonly label: string;

  /** Which mechanism refuses it; see {@link PARENT_FAULTS}. */
  readonly fault: string;

  /** Which write reaches it. */
  readonly write: 'create' | 'patch';

  /** The detail code the refusal has to carry. */
  readonly code: string;

  /** The call that has to be refused. */
  readonly refuse: (planted: PlantedTaxonomy) => Promise<unknown>;

  /**
   * The same write with a parent that IS allowed, varied along the
   * one axis under test — the same call, the same row, a legal
   * parent — so a module refusing every parent fails here.
   */
  readonly control: (planted: PlantedTaxonomy) => Promise<unknown>;
}

/**
 * Every way a parent can be refused, from every write that can reach
 * it.
 *
 * The `children` branch has a `patch` row and no `create` one, which
 * is the port's own statement rather than a gap: an insert produces
 * an id nothing can point at yet, so a fresh row cannot already have
 * children. The other two branches carry a row per write, because a
 * translation written into one of the two call sites and not the
 * other is exactly the fault a shared table would hide.
 */
const PARENT_CASES: readonly ParentCase[] = [
  {
    label: 'a create naming a parent that is itself a child',
    fault: 'grandchild',
    write: 'create',
    code: DEPTH_CODE,
    refuse: ({ store, child }) => createCategory(store, RADAR, {
      key: 'dialects',
      name: 'Dialects',
      parentId: child.id,
    }),
    control: ({ store, rootB }) => createCategory(store, RADAR, {
      key: 'dialects',
      name: 'Dialects',
      parentId: rootB.id,
    }),
  },
  {
    label: 'a create naming a parent in another domain',
    fault: 'foreign-domain',
    write: 'create',
    code: DEPTH_CODE,
    refuse: ({ store, foreign }) => createCategory(store, RADAR, {
      key: 'dialects',
      name: 'Dialects',
      parentId: foreign.id,
    }),
    control: ({ store, rootB }) => createCategory(store, RADAR, {
      key: 'dialects',
      name: 'Dialects',
      parentId: rootB.id,
    }),
  },
  {
    label: 'a create naming a parent that is not there',
    fault: 'absent',
    write: 'create',
    code: UNKNOWN_PARENT_CODE,
    refuse: ({ store }) => createCategory(store, RADAR, {
      key: 'dialects',
      name: 'Dialects',
      parentId: MISSING_ID,
    }),
    control: ({ store, rootB }) => createCategory(store, RADAR, {
      key: 'dialects',
      name: 'Dialects',
      parentId: rootB.id,
    }),
  },
  {
    label: 'a patch naming a parent that is itself a child',
    fault: 'grandchild',
    write: 'patch',
    code: DEPTH_CODE,
    refuse: ({ store, rootB, child }) => patchCategory(store, rootB.id, {
      parentId: child.id,
    }),
    control: ({ store, rootB, rootA }) => patchCategory(store, rootB.id, {
      parentId: rootA.id,
    }),
  },
  {
    label: 'a patch naming a parent in another domain',
    fault: 'foreign-domain',
    write: 'patch',
    code: DEPTH_CODE,
    refuse: ({ store, rootB, foreign }) => patchCategory(store, rootB.id, {
      parentId: foreign.id,
    }),
    control: ({ store, rootB, rootA }) => patchCategory(store, rootB.id, {
      parentId: rootA.id,
    }),
  },
  {
    label: 'a patch giving a parent to a row that has children',
    fault: 'children',
    write: 'patch',
    code: DEPTH_CODE,
    refuse: ({ store, rootA, rootB }) => patchCategory(store, rootA.id, {
      parentId: rootB.id,
    }),

    // The SAME parent, given to a childless row. The axis under test
    // is what the patched row holds, so the control varies that and
    // nothing else — a control naming a different parent would be
    // green against a module that had simply stopped accepting
    // `rootB` as one.
    control: ({ store, child, rootB }) => patchCategory(store, child.id, {
      parentId: rootB.id,
    }),
  },
  {
    label: 'a patch naming a parent that is not there',
    fault: 'absent',
    write: 'patch',
    code: UNKNOWN_PARENT_CODE,
    refuse: ({ store, rootB }) => patchCategory(store, rootB.id, {
      parentId: MISSING_ID,
    }),
    control: ({ store, rootB, rootA }) => patchCategory(store, rootB.id, {
      parentId: rootA.id,
    }),
  },
];

describe('a parent the write may not have', () => {
  it('covers every mechanism that refuses one', () => {
    expect([...new Set(PARENT_CASES.map((row) => row.fault))].sort())
      .toEqual([...PARENT_FAULTS].sort());
  });

  it('labels every row distinctly', () => {
    const labels = PARENT_CASES.map((row) => row.label);

    expect(labels.length).toBe(new Set(labels).size);
  });

  it('reaches each fault from every write that can', () => {
    // The `children` branch is patch-only BY CONSTRUCTION, and the
    // pin is written out rather than derived so that a create row
    // quietly appearing under it — or a patch row quietly
    // disappearing from one of the others — is a red case.
    const reached = PARENT_FAULTS.map((fault) => ({
      fault,
      writes: [...new Set(PARENT_CASES.filter((row) => row.fault === fault)
        .map((row) => row.write))].sort(),
    }));

    expect(reached).toEqual([
      { fault: 'absent', writes: ['create', 'patch'] },
      { fault: 'children', writes: ['patch'] },
      { fault: 'foreign-domain', writes: ['create', 'patch'] },
      { fault: 'grandchild', writes: ['create', 'patch'] },
    ]);
  });

  it('tells the depth rule from a parent that is absent', () => {
    // Both are 422s naming `parentId`, so the codes are the only
    // thing separating them. A table carrying one code would be
    // green against a module that answered it for every parent
    // fault.
    expect([...new Set(PARENT_CASES.map((row) => row.code))].sort())
      .toEqual([DEPTH_CODE, UNKNOWN_PARENT_CODE].sort());
  });

  for (const row of PARENT_CASES) {
    it(`refuses ${row.label}`, async () => {
      const planted = await plantTaxonomy();
      const refusal = await refusalFrom(() => row.refuse(planted));

      expect(refusal).toBeInstanceOf(ValidationError);
      expect(refusal.code).toBe('VALIDATION_ERROR');
      expect(refusal.statusCode).toBe(422);
      expect(detailsOf(refusal.details as FieldError[] | undefined))
        .toEqual([{ field: 'parentId', code: row.code }]);
    });

    it(`accepts the legal parent behind ${row.label}`, async () => {
      const planted = await plantTaxonomy();

      await expect(row.control(planted)).resolves.not.toThrow();
    });
  }

  it('states the one-level rule on every depth refusal', async () => {
    // The message is this module's own — the parser built none of
    // it — so it is asserted here rather than left to
    // `src/http/validation.ts`. One sentence for all three branches
    // is deliberate: the trigger names no constraint, so a message
    // naming one branch would be right a third of the time.
    const said = new Set<string>();

    for (const row of PARENT_CASES.filter((one) => one.code === DEPTH_CODE)) {
      const planted = await plantTaxonomy();
      const refusal = await refusalFrom(() => row.refuse(planted));
      const [detail] = (refusal.details ?? []) as FieldError[];

      said.add(detail?.message ?? '');
    }

    expect([...said]).toEqual([
      'A category is a root or the child of a root, and nothing deeper',
    ]);
  });
});

// ---------------------------------------------------------------------------
// A delete the children refuse
// ---------------------------------------------------------------------------

describe('a delete the children refuse', () => {
  it('answers 409 rather than the 422 a parent fault gets', async () => {
    // The whole of this case is the STATUS. The refusal arriving
    // here carries the same reason and the same constraint name as
    // the one a `parentId` naming no row raises — measured against
    // the live server and recorded in `./store.ts` — so nothing on
    // the error tells them apart and only which call was made does.
    // A module reading the refusal harder instead of keying on the
    // call would answer this 422.
    const { store, rootA } = await plantTaxonomy();
    const refusal = await refusalFrom(() => deleteCategory(store, rootA.id));

    expect(refusal).toBeInstanceOf(ConflictError);
    expect(refusal.code).toBe('CONFLICT');
    expect(refusal.statusCode).toBe(409);
    expect(refusal.details).toBeUndefined();
  });

  it('deletes a category holding no children', async () => {
    // The control, varied along the one axis under test: the same
    // call against a root that holds nothing. A module refusing
    // every delete passes the case above and fails this.
    const { store, rootB } = await plantTaxonomy();

    await expect(deleteCategory(store, rootB.id)).resolves.toBeUndefined();
  });

  it('deletes the child, and then the parent', async () => {
    // The refusal is a rule with a way past it rather than a wall,
    // and this is what says so: remove the children and the same
    // delete goes through. It also rules out a module that had
    // simply stopped accepting `rootA` as a delete target.
    const { store, rootA, child } = await plantTaxonomy();

    await deleteCategory(store, child.id);

    await expect(deleteCategory(store, rootA.id)).resolves.toBeUndefined();
  });

  it('leaves the parent and the child where they were', async () => {
    // What a refusal is worth: nothing went. Read back through
    // `listCategories` rather than off the refusal, so the claim is
    // about what is stored and not about what one throw happened to
    // say.
    const { store, rootA } = await plantTaxonomy();

    await refusalFrom(() => deleteCategory(store, rootA.id));

    const remaining = await listCategories(store, RADAR);

    expect(remaining.map((row) => row.key).sort())
      .toEqual(['languages', 'phrases', 'technologies']);
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
 * reddens both halves equally and a table driven through one of them
 * would pin only that the two share an implementation — while the
 * two schemas genuinely differ, `key` being required by one and
 * refused outright by the other.
 *
 * Every row here is submitted to a SERVICE function rather than to a
 * schema, which is the point: it is what says an MCP tool in wave 3
 * cannot be handed a body the HTTP route would have refused.
 *
 * There is no open record on this surface, so no row carries a `*`
 * and no call below passes `openPaths`. A category body is declared
 * members all the way down.
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
      { field: 'key', code: 'invalid_type' },
      { field: 'name', code: 'invalid_type' },
    ],
  },
  {
    label: 'a create body keyed the empty string',
    operation: 'create',
    body: { key: '', name: 'Industries' },
    details: [{ field: 'key', code: 'too_small' }],
  },
  {
    label: 'a category named the empty string',
    operation: 'create',
    body: { key: 'industries', name: '' },
    details: [{ field: 'name', code: 'too_small' }],
  },
  {
    label: 'a create body naming the parent by key',
    operation: 'create',
    body: { key: 'industries', name: 'Industries', parentKey: null },
    details: [{ field: 'body', code: 'unrecognized_keys' }],
  },
  {
    label: 'a parent id submitted as a string',
    operation: 'create',
    body: { key: 'industries', name: 'Industries', parentId: '1' },
    details: [{ field: 'parentId', code: 'invalid_type' }],
  },
  {
    label: 'a parent id of zero',
    operation: 'create',
    body: { key: 'industries', name: 'Industries', parentId: 0 },
    details: [{ field: 'parentId', code: 'too_small' }],
  },
  {
    label: 'a patch body that is not an object',
    operation: 'patch',
    body: 7,
    details: [{ field: 'body', code: 'invalid_type' }],
  },
  {
    label: 'a patch proposing a re-key',
    operation: 'patch',
    body: { key: 'industries' },
    details: [{ field: 'body', code: 'unrecognized_keys' }],
  },
  {
    label: 'a patch naming the category the empty string',
    operation: 'patch',
    body: { name: '' },
    details: [{ field: 'name', code: 'too_small' }],
  },
  {
    label: 'a patch naming the parent by key',
    operation: 'patch',
    body: { parentKey: 'technologies' },
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
  planted: PlantedTaxonomy,
  row: BodyCase,
): Promise<unknown> {
  return row.operation === 'create'
    ? createCategory(planted.store, RADAR, row.body)
    : patchCategory(planted.store, planted.rootB.id, row.body);
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

  for (const row of BODY_CASES) {
    it(`refuses ${row.label}`, async () => {
      const planted = await plantTaxonomy();
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
    // operation: a module refusing every body passes all eleven rows
    // above and fails this. What the two operations DO with an
    // accepted body is the next task's coverage; what this pins is
    // that they take one at all.
    const { store, rootB } = await plantTaxonomy();
    const created = await createCategory(store, RADAR, {
      key: 'industries',
      name: 'Industries',
      parentId: rootB.id,
    });
    const patched = await patchCategory(store, rootB.id, {
      name: 'Renamed phrases',
    });

    expect(created.key).toBe('industries');
    expect(patched.name).toBe('Renamed phrases');
  });

  it('refuses a malformed patch against an id that is not there', async () => {
    // The body is parsed before the id is resolved, so the same
    // patch answers the same refusal either way. A module resolving
    // first would answer this 404 and the matching row above 422,
    // which would make a caller's error depend on rows it never
    // asked about.
    const { store } = await plantTaxonomy();
    const refusal = await refusalFrom(
      () => patchCategory(store, MISSING_ID, { name: '' }),
    );

    expect(refusal).toBeInstanceOf(ValidationError);
    expect(detailsOf(refusal.details as FieldError[] | undefined))
      .toEqual([{ field: 'name', code: 'too_small' }]);
  });

  it('refuses a malformed create against a slug that is not', async () => {
    // The same ordering claim on the other operation. `createCategory`
    // parses, then resolves the domain, so a body fault outranks a
    // slug that names nothing.
    const { store } = await plantTaxonomy();
    const refusal = await refusalFrom(
      () => createCategory(store, MISSING_SLUG, { key: '', name: '' }),
    );

    expect(refusal).toBeInstanceOf(ValidationError);
    expect(detailsOf(refusal.details as FieldError[] | undefined))
      .toEqual([
        { field: 'key', code: 'too_small' },
        { field: 'name', code: 'too_small' },
      ]);
  });
});

// ---------------------------------------------------------------------------
// What a refusal is allowed to say
// ---------------------------------------------------------------------------

/** A slug shaped like one, so it reaches the store rather than the parser. */
const SENTINEL_SLUG = 'sentinel-slug-value';

/**
 * A category key, submitted as one.
 *
 * Free text with spaces in it, which this surface accepts: `key` is
 * held to non-empty and nothing more, matching the seed. A sentinel
 * a schema would have refused for its SHAPE would be testing the
 * parser rather than the containment.
 */
const SENTINEL_KEY = 'sentinel key value';

/** A submitted value, carried as the operator-facing label. */
const SENTINEL_NAME = 'sentinel name value';

/** A key no schema here declares, submitted as one. */
const SENTINEL_MEMBER = 'sentinelMemberValue';

/**
 * The four strings the rows below submit. None is a substring of
 * another, so a count against one cannot be satisfied by another.
 */
const SENTINELS = [
  SENTINEL_SLUG,
  SENTINEL_KEY,
  SENTINEL_NAME,
  SENTINEL_MEMBER,
];

/** One refused request, and what it submitted that must not return. */
interface ContainmentCase {
  /** What makes this row different from every other. */
  readonly label: string;

  /** The call, submitting the needles below. */
  readonly run: (planted: PlantedTaxonomy) => Promise<unknown>;

  /** The submitted strings the answer must not carry. */
  readonly needles: readonly string[];
}

/** Every channel a submitted string could come back through. */
const CONTAINMENT_CASES: readonly ContainmentCase[] = [
  {
    label: 'a slug that names no domain',
    run: ({ store }) => listCategories(store, SENTINEL_SLUG),
    needles: [SENTINEL_SLUG],
  },
  {
    label: 'a create against a slug that names no domain',
    run: ({ store }) => createCategory(store, SENTINEL_SLUG, {
      key: SENTINEL_KEY,
      name: SENTINEL_NAME,
    }),
    needles: [SENTINEL_SLUG, SENTINEL_KEY, SENTINEL_NAME],
  },
  {
    label: 'a key the domain already carries',
    run: ({ store, rootA }) => createCategory(store, RADAR, {
      key: rootA.key,
      name: SENTINEL_NAME,
    }),
    needles: [SENTINEL_NAME],
  },
  {
    label: 'an undeclared member of a create body',
    run: ({ store }) => createCategory(store, RADAR, {
      key: SENTINEL_KEY,
      name: SENTINEL_NAME,
      [SENTINEL_MEMBER]: 1,
    }),
    needles: [SENTINEL_KEY, SENTINEL_NAME, SENTINEL_MEMBER],
  },
  {
    label: 'a parent the depth rule refuses',
    run: ({ store, child }) => createCategory(store, RADAR, {
      key: SENTINEL_KEY,
      name: SENTINEL_NAME,
      parentId: child.id,
    }),
    needles: [SENTINEL_KEY, SENTINEL_NAME],
  },
  {
    label: 'a parent that is not there',
    run: ({ store }) => createCategory(store, RADAR, {
      key: SENTINEL_KEY,
      name: SENTINEL_NAME,
      parentId: MISSING_ID,
    }),
    needles: [SENTINEL_KEY, SENTINEL_NAME],
  },
  {
    label: 'a patch against an id that is not there',
    run: ({ store }) => patchCategory(store, MISSING_ID, {
      name: SENTINEL_NAME,
    }),
    needles: [SENTINEL_NAME],
  },
];

describe('what a refusal is allowed to say', () => {
  it('submits every sentinel through at least one channel', () => {
    const submitted = CONTAINMENT_CASES.flatMap((row) => [...row.needles]);

    expect([...new Set(submitted)].sort()).toEqual([...SENTINELS].sort());
  });

  it('would find a sentinel a refusal did carry', () => {
    // The planted control. Every row below counts to zero, and a
    // zero is what a search over the wrong text answers too — so the
    // same helper is run against an envelope built here, out of
    // details this module did not produce, and has to find each one.
    const planted = JSON.stringify({
      code: 'CONFLICT',
      message: `No domain carries ${SENTINEL_SLUG}`,
      details: [
        {
          field: SENTINEL_MEMBER,
          message: `${SENTINEL_KEY} is taken by ${SENTINEL_NAME}`,
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
    it(`answers ${row.label} without quoting it back`, async () => {
      const planted = await plantTaxonomy();
      const refusal = await refusalFrom(() => row.run(planted));
      const answered = JSON.stringify(refusal.toJSON());
      const found = row.needles.map((needle) => ({
        needle,
        occurrences: countOccurrences(answered, needle),
      }));

      // Counted rather than asserted absent, so the reading is a
      // number the planted control above has shown can be something
      // other than zero.
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
    // Every translation below passes the `StoreRefusal` as `cause`,
    // which is where a debugger and the error-level log line find
    // it. `cause` is non-enumerable per spec, so it reaches no
    // serialised body — and that is a property of the platform
    // rather than of this module, which is why it is measured here
    // rather than assumed.
    const { store, rootA } = await plantTaxonomy();
    const refusal = await refusalFrom(() => createCategory(store, RADAR, {
      key: rootA.key,
      name: SENTINEL_NAME,
    }));

    expect(refusal.cause).toBeInstanceOf(Error);
    expect(Object.keys(refusal.toJSON()).sort())
      .toEqual(['code', 'message']);
  });
});
