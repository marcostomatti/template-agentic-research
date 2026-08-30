/**
 * `src/taxonomy/categories-service.ts` — what the four category
 * operations refuse, and what they land when they accept. Driven
 * over `tests/helpers/memory-research-store.ts`, so every claim
 * here is answered with no database anywhere.
 *
 * Seven claims: six about the ways this module says no, and one
 * about what it lands when it accepts.
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
 * THAT AN ACCEPTED CALL LANDS WHAT IT WAS TOLD AND NOTHING ELSE.
 * Four sections at the end, one per operation, each reading its
 * write back through `listCategories` rather than off the value the
 * write answered — so the claim is about what is STORED and not
 * about what one return happened to say. The read section pins the
 * key order, the domain scope, the counted term count and the row
 * key set; the create section is a three-row table landing a root
 * two ways and a child one; the rename section pins that the key
 * survived, and pins it through the READ ORDER, which no field
 * comparison can; and the delete section pins that one row went and
 * that its natural key went with it.
 *
 * EVERY TERM COUNT HERE IS ZERO, and that is the dataset rather
 * than a stub standing in for one. No method on
 * `tests/helpers/memory-research-store.ts` writes a term, so no
 * category it can hold has one and a counted zero is the true
 * answer for all of them; a list mixing counts is unreachable from
 * this file and is the term half's to write. What a zero can still
 * carry is the claim `CategoryWithTermCount` actually makes — that
 * the member is PRESENT on every row rather than absent for the
 * buckets holding nothing, which is the one answer it forbids.
 *
 * Mutation grid, RE-DERIVED over the 88 cases here with
 * `--reporter=json` and read as the failed `fullName` SET rather
 * than as a count. Twenty-four legs in two classes, because a grid
 * made of one class leaves the other half green while looking
 * thorough. Every figure in it moved when the positive cases
 * landed, so the whole grid was re-run rather than appended to, and
 * every figure will move again for the next task that adds a case
 * to this file.
 *
 * Nineteen WIDENING legs, and the refusal half of them is unchanged
 * in SET even where a count moved. Rethrowing the unique refusal
 * reddens 3 — the 409, its containment row, and the row that reads
 * the `cause`. Rethrowing the depth refusal reddens 7: the five
 * depth rows, the sentence they share, and one containment row. Two
 * legs sit inside or across that set rather than beside it, and the
 * relation is the reading: answering the depth refusal a 409
 * reddens 6, a strict subset without the containment row, while
 * reporting its detail against `body` reddens a DIFFERENT 7 — every
 * parent row there is, the five depth rows plus the two
 * absent-parent ones — and is the one leg reaching all of them at
 * once. Giving both parent faults the same code reddens exactly the
 * 2 absent rows, which is the whole of the evidence that the two
 * are told apart.
 *
 * The address legs partition cleanly. Keying the foreign key on the
 * refusal instead of on the write reddens 1, the 409-not-422 case,
 * and nothing else in the file can see that fault. Skipping the
 * domain resolution reddens 3 on a list and 3 on a create —
 * disjoint except for the says-which-address case, which both reach
 * — dropping the 404 a delete answers reddens 2, and dropping
 * `.strict()` from the create schema reddens 2. Each of the two
 * ordering cases is pinned by exactly one leg: resolving the slug
 * before parsing a create body reddens 1, and reading the row
 * before parsing a patch body reddens 1.
 *
 * The leak leg reddens exactly 1, and only once narrowed to the
 * branch it belongs in AND left carrying its `cause`: interpolating
 * the submitted `name` into the 409 reddens the key-already-carried
 * containment row alone. A first attempt that dropped the `cause`
 * along with the message reddened 2, the second of them the row
 * pinning that the driver error stays off the wire — which reads as
 * coverage and is really one leak plus one unrelated regression.
 *
 * Five legs are new, aimed at what an accepted call lands, and
 * three of them reach cases no refusal leg could. Ignoring the
 * parent a create asked for reddens 12 across four sections — but
 * NOT `stores a child of a root`, which compares the listed row
 * against what the create answered and finds the two agreeing on
 * the same wrong parent. That is the read-back shape's blind spot
 * stated rather than left implied: a write that lies CONSISTENTLY
 * is caught by the answered-row case and by nothing else, which is
 * why every create row here has both. Ignoring the patch a caller
 * supplied reddens 10, four of them renames. The three list legs
 * are near-disjoint by construction and share only the term-count
 * row: reading a taxonomy the call did not resolve reddens 4,
 * dropping the term count from every row reddens 7, and handing the
 * list back in reverse reddens 6.
 *
 * ONE LEG MEASURED ZERO, and it is the one worth stating rather
 * than dropping. Copying the `StoreRefusal`'s OWN message into the
 * 409 reddens NOTHING, because the in-memory store constructs its
 * refusal from a reason and a constraint name and there is no
 * submitted content in it to leak. The channel that carries one —
 * the driver's `detail`, which reads `Key (domain_id, key)=(...)
 * already exists.`, and the drizzle wrapper's `Failed query:` line
 * with its bound parameters — exists only behind `./db-store.ts`.
 * So the containment rows here pin what THIS module builds, their
 * zeros rest on the planted control and on the leak leg above, and
 * the driver half is owed by the live seam rather than covered
 * here.
 *
 * Five NARROWING legs, aimed at the controls, which is what the
 * controls are for. Three redden an IDENTICAL 75 of 88 — refusing
 * every slug as missing, requiring `parentId` on a create, and
 * refusing every create as a duplicate — and the identity is the
 * reading rather than three independent measurements: every case
 * that reaches this module's subject at all plants its taxonomy
 * through `createCategory` against a resolved slug, so any leg
 * breaking that path collapses the file to the same 13 survivors.
 * Those 13 are exactly the cases that call nothing: eleven table
 * guards, the planted containment control, and the runtime read of
 * the key-set pin. The two narrow legs are the informative ones —
 * refusing every delete as holding children reddens 8 and answering
 * 404 to every patch reddens 11, both sets made mostly of controls,
 * and the second OVERLAPS the ignore-the-patch leg in 5 of its 11
 * rather than nesting in it.
 *
 * What no module mutation reaches, by construction. Eleven of the
 * twelve table guards read only the table beside them and are aimed
 * at a later edit — an operation added with no row, a depth branch
 * dropped from the fault list, a `create` row appearing under the
 * patch-only branch. The twelfth resolves two planted ids to say
 * the create table lands both a root and a child, so it is the one
 * guard the three broad narrowing legs reach. The planted
 * containment control is invisible for the same reason as the
 * eleven and deliberately so: it proves the SEARCH, where the leak
 * leg proves the SUBJECT. The key-set drift guard is invisible to
 * every leg here as well, and is owed by `check-types` rather than
 * by the runner: a member added to `CategoryRecord` or to
 * `CategoryWithTermCount` and to neither list is a TS2322 at
 * `EVERY_KEY_LISTED`, measured by planting one. And no leg touches
 * `src/http/validation.ts`, so every field path in the body table
 * is evidence about what this module ASKED FOR rather than about
 * how the masking is built.
 */
import type {
  CategoryRecord,
  CategoryWithTermCount,
} from './store.js';
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
    // above and fails this. What it pins is that the two operations
    // take a body at all; what they LAND with one is the four
    // sections below, which read every write back through a second
    // call rather than off the value the write answered.
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

// ---------------------------------------------------------------------------
// What a taxonomy read answers
// ---------------------------------------------------------------------------

/**
 * The members `CategoryRecord` declares.
 *
 * Written out rather than derived, because an interface has no
 * runtime form to read keys off — and pinned in BOTH directions,
 * since a one-directional list is exactly as green as no list at all
 * against the drift that matters. `satisfies` closes the direction
 * where this names a member the record lacks;
 * {@link EVERY_KEY_LISTED} closes the one where the record grows a
 * member nothing here learned about. The second is the direction a
 * key-set assertion exists for: a column added to a projection
 * reaches every caller unasserted otherwise, and no field read in
 * this file would notice.
 */
const CATEGORY_KEYS = [
  'domainId',
  'id',
  'key',
  'name',
  'parentId',
] as const satisfies readonly (keyof CategoryRecord)[];

/** The same members, plus the one a list read adds to them. */
const LISTED_KEYS = [
  ...CATEGORY_KEYS,
  'termCount',
] as const satisfies readonly (keyof CategoryWithTermCount)[];

/**
 * `true` only while `L` names every key of `T`.
 *
 * The tuple wrapper is load-bearing rather than decoration: without
 * it the union distributes over the conditional and the answer is
 * `boolean`, which accepts `true` as an initializer and pins nothing
 * at all.
 *
 * @typeParam T - The type whose keys must all be named.
 * @typeParam L - The list naming them, as `typeof <the const>`.
 */
type CoversEveryKey<T, L extends readonly PropertyKey[]> =
  [Exclude<keyof T, L[number]>] extends [never] ? true : false;

/** Both lists above, held against the types they describe. */
type EveryKeyListed =
  CoversEveryKey<CategoryRecord, typeof CATEGORY_KEYS>
  & CoversEveryKey<CategoryWithTermCount, typeof LISTED_KEYS>;

/**
 * The half of the drift guard `check-types` owns.
 *
 * A member added to `CategoryRecord` or to `CategoryWithTermCount`
 * and to neither list above turns {@link EveryKeyListed} into
 * `never`, and this initializer is then a TS2322 at this line —
 * before any case can compare a record against a set that has
 * quietly stopped describing it. Read in a case below, so it is a
 * symbol this file uses rather than one lint reports.
 */
const EVERY_KEY_LISTED: EveryKeyListed = true;

/** {@link CATEGORY_KEYS}, sorted at use rather than by hand. */
const CATEGORY_KEY_SET: readonly string[] = [...CATEGORY_KEYS].sort();

/** {@link LISTED_KEYS}, sorted. */
const LISTED_KEY_SET: readonly string[] = [...LISTED_KEYS].sort();

/**
 * {@link RADAR}'s three keys, in the order a read has to answer
 * them.
 *
 * Not the order {@link plantTaxonomy} writes them in, which is what
 * makes the order assertable at all: the fixture stores
 * `technologies`, `phrases`, `languages`, so a read handing rows
 * back in the order they arrived answers this list reversed, and
 * only a read that ordered by `key` answers it at all.
 */
const RADAR_KEYS = ['languages', 'phrases', 'technologies'];

/** A domain whose taxonomy nobody has written yet. */
const EMPTY_DOMAIN = 'example-ocean-health';

/**
 * Finds one answered row by its natural key.
 *
 * @param rows - What a read answered.
 * @param key - The key to look for.
 * @returns The row carrying it.
 * @throws When no row does. A `find` answering `undefined` compares
 *   equal to another `undefined`, so a case reading a stored row
 *   back against a write that never landed would otherwise pass for
 *   nobody's reason.
 */
function rowKeyed(
  rows: readonly CategoryWithTermCount[],
  key: string,
): CategoryWithTermCount {
  const found = rows.find((row) => row.key === key);

  if (found === undefined) {
    throw new Error('the answered list carries no row under that key');
  }

  return found;
}

describe('what a taxonomy read answers', () => {
  it('holds both key sets against the types they describe', () => {
    // The runtime half of the pin above. What it asserts is not the
    // `true` — that is a constant — but that the symbol exists to be
    // read: its VALUE is the statement `check-types` makes at the
    // declaration, which is a TS2322 the moment either record grows
    // a member neither list names.
    expect(EVERY_KEY_LISTED).toBe(true);
  });

  it('answers every category in the domain, key ascending', async () => {
    const { store } = await plantTaxonomy();
    const listed = await listCategories(store, RADAR);

    expect(listed.map((row) => row.key)).toEqual(RADAR_KEYS);
  });

  it('scopes the read to the domain it resolved', async () => {
    // The two domains hold disjoint taxonomies, so a read issued
    // against the table rather than against the id it just resolved
    // answers four rows here — and would still be in key order,
    // which is why the case above cannot stand in for this one.
    const { store } = await plantTaxonomy();
    const listed = await listCategories(store, TRANSIT);

    expect(listed.map((row) => row.key)).toEqual(['modes']);
  });

  it('carries a counted term count on every row', async () => {
    // EVERY COUNT IS ZERO HERE, AND THAT IS THE DATASET RATHER THAN
    // A STUB. No method on `tests/helpers/memory-research-store.ts`
    // writes a term, so no category it can hold has one and a zero
    // is the true answer for all of them; a mixed list is the term
    // half's to write, and this file cannot reach one. What a zero
    // CAN carry is the claim `CategoryWithTermCount` actually makes
    // — that the member is present on every row rather than absent
    // for the buckets holding nothing, which is the one answer it
    // forbids, since `0` and "not counted" would otherwise be the
    // same value on the member whose whole job is telling an empty
    // bucket from a full one.
    const { store } = await plantTaxonomy();
    const listed = await listCategories(store, RADAR);
    const counted = listed.map((row) => ({
      key: row.key,
      present: Object.hasOwn(row, 'termCount'),
      termCount: row.termCount,
    }));

    expect(counted).toEqual(RADAR_KEYS.map((key) => ({
      key,
      present: true,
      termCount: 0,
    })));
  });

  it('answers each row whole and nothing besides', async () => {
    // The sorted key SET on every listed row, beside the fields the
    // cases read. A member arriving by spread — a column nobody
    // projected, a count taken twice under two names — is invisible
    // to every field read in this file and is exactly what this
    // line catches.
    const { store } = await plantTaxonomy();
    const listed = await listCategories(store, RADAR);

    expect(listed.map((row) => Object.keys(row).sort()))
      .toEqual(RADAR_KEYS.map(() => [...LISTED_KEY_SET]));
  });

  it('answers an empty taxonomy rather than refusing', async () => {
    // The whole difference between a domain that is not there and
    // one whose taxonomy has not been written yet. The first is the
    // 404 the address section pins; this is the other, and it is the
    // reason the read resolves the slug rather than issuing itself
    // against whatever id a caller supplied.
    const { store } = await plantTaxonomy();

    await store.insertDomain({
      slug: EMPTY_DOMAIN,
      name: 'Ocean health',
      settings: {},
    });

    await expect(listCategories(store, EMPTY_DOMAIN)).resolves.toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// What a create lands
// ---------------------------------------------------------------------------

/** The key every accepted create below writes, since none collide. */
const NEW_KEY = 'industries';

/** The label it carries. */
const NEW_NAME = 'Industries';

/** One accepted create, and the row it has to land. */
interface CreateCase {
  /** What makes this row different from every other. */
  readonly label: string;

  /** The body, unvalidated, exactly as a request would carry it. */
  readonly body: (planted: PlantedTaxonomy) => unknown;

  /** The parent the stored row has to end up under. */
  readonly parentId: (planted: PlantedTaxonomy) => number | null;
}

/**
 * The three shapes an accepted create arrives in.
 *
 * Two of them land the SAME row, and that is the claim rather than a
 * duplicate: an absent `parentId` and an explicit `null` are ONE
 * request to `createCategory`, which supplies the null itself where
 * a case can reach the choice. A table carrying only the omission
 * would be green against a schema that had stopped accepting the
 * explicit null, and the two are different requests one operation
 * along — a patch reads absent as "leave it" and null as "promote
 * it", which is the third way a row can move.
 */
const CREATE_CASES: readonly CreateCase[] = [
  {
    label: 'a root, by omitting the parent',
    body: () => ({ key: NEW_KEY, name: NEW_NAME }),
    parentId: () => null,
  },
  {
    label: 'a root, by naming null',
    body: () => ({ key: NEW_KEY, name: NEW_NAME, parentId: null }),
    parentId: () => null,
  },
  {
    label: 'a child of a root',
    body: ({ rootB }) => ({
      key: NEW_KEY,
      name: NEW_NAME,
      parentId: rootB.id,
    }),
    parentId: ({ rootB }) => rootB.id,
  },
];

describe('what a create lands', () => {
  it('labels every row distinctly', () => {
    const labels = CREATE_CASES.map((row) => row.label);

    expect(labels.length).toBe(new Set(labels).size);
  });

  it('lands both a root and a child across the table', async () => {
    // The anti-vacuity guard this table exists for: three rows that
    // all landed roots would look thorough while never writing a
    // parent at all, and having two shapes is the whole of what the
    // one-level rule leaves this surface.
    const planted = await plantTaxonomy();
    const parents = CREATE_CASES.map((row) => row.parentId(planted));

    expect({
      roots: parents.some((id) => id === null),
      children: parents.some((id) => id !== null),
    }).toEqual({ roots: true, children: true });
  });

  for (const row of CREATE_CASES) {
    it(`answers ${row.label}`, async () => {
      const planted = await plantTaxonomy();
      const created = await createCategory(
        planted.store,
        RADAR,
        row.body(planted),
      );

      expect(created).toStrictEqual({
        id: created.id,
        domainId: planted.rootA.domainId,
        key: NEW_KEY,
        name: NEW_NAME,
        parentId: row.parentId(planted),
      });

      // The id is the store's own — the body carried none — and the
      // sorted key set beside it, since the record is the one field
      // a whole-row compare cannot pin against itself.
      expect(created.id).toBeGreaterThan(0);
      expect(Object.keys(created).sort()).toEqual([...CATEGORY_KEY_SET]);
    });

    it(`stores ${row.label}`, async () => {
      // Read back through the OTHER operation, so the claim is about
      // what is stored rather than about what one call happened to
      // answer: a create returning a row it never wrote passes the
      // case above and fails this.
      const planted = await plantTaxonomy();
      const created = await createCategory(
        planted.store,
        RADAR,
        row.body(planted),
      );
      const listed = await listCategories(planted.store, RADAR);

      expect(rowKeyed(listed, NEW_KEY))
        .toStrictEqual({ ...created, termCount: 0 });
    });
  }

  it('leaves the root it was given as a parent alone', async () => {
    // A write lands one row. The parent the third row above names is
    // still a root afterwards and still carries what it carried,
    // which no assertion over the created row could say.
    const planted = await plantTaxonomy();

    await createCategory(planted.store, RADAR, {
      key: NEW_KEY,
      name: NEW_NAME,
      parentId: planted.rootB.id,
    });

    const listed = await listCategories(planted.store, RADAR);

    expect(rowKeyed(listed, planted.rootB.key))
      .toStrictEqual({ ...planted.rootB, termCount: 0 });
  });

  it('adds the row to the domain it was addressed at', async () => {
    // The `:slug` reached the write rather than only the lookup: a
    // create stamping the wrong domain id answers a plausible row
    // and puts it in a taxonomy nobody asked for.
    const planted = await plantTaxonomy();

    await createCategory(planted.store, RADAR, {
      key: NEW_KEY,
      name: NEW_NAME,
    });

    const radar = await listCategories(planted.store, RADAR);
    const transit = await listCategories(planted.store, TRANSIT);

    expect(radar.map((one) => one.key)).toEqual(
      [...RADAR_KEYS, NEW_KEY].sort(),
    );
    expect(transit.map((one) => one.key)).toEqual(['modes']);
  });
});

// ---------------------------------------------------------------------------
// What a rename moves and what it leaves alone
// ---------------------------------------------------------------------------

/**
 * A label chosen for where it SORTS rather than for what it says.
 *
 * A list read is ordered by `key`, so a row renamed to a label
 * that would sort first stays exactly where it was — and a
 * re-key, or a store ordering by the label instead, moves it.
 * That is the claim no field read can make from either side:
 * `patched.key` says what one call answered about one row, and
 * the order says where the whole collection put it.
 */
const RENAMED = 'Aardvark technologies';

describe('what a rename moves and what it leaves alone', () => {
  it('rewrites the label and leaves the key standing', async () => {
    const { store, rootA } = await plantTaxonomy();
    const patched = await patchCategory(store, rootA.id, { name: RENAMED });

    expect(patched.name).toBe(RENAMED);
    expect(patched.key).toBe(rootA.key);
    expect(patched).toStrictEqual({ ...rootA, name: RENAMED });
    expect(Object.keys(patched).sort()).toEqual([...CATEGORY_KEY_SET]);
  });

  it('stores the rename and nothing beside it', async () => {
    // Read back through the list, so the claim is about what is
    // stored rather than about what the patch answered.
    const { store, rootA } = await plantTaxonomy();

    await patchCategory(store, rootA.id, { name: RENAMED });

    const listed = await listCategories(store, RADAR);

    expect(rowKeyed(listed, rootA.key))
      .toStrictEqual({ ...rootA, name: RENAMED, termCount: 0 });
  });

  it('leaves the read order where the key put it', async () => {
    // The half a field read cannot make. The new label sorts before
    // every key the fixture carries, so a row ordered by its NAME
    // comes back first and a row ordered by its key does not move.
    const { store, rootA } = await plantTaxonomy();

    await patchCategory(store, rootA.id, { name: RENAMED });

    const listed = await listCategories(store, RADAR);

    expect(listed.map((one) => one.key)).toEqual(RADAR_KEYS);
  });

  it('leaves a renamed child under the parent it had', async () => {
    // A rename is not a move, and the row that can show it is the
    // one with somewhere to fall to: a child whose `parentId` went
    // null would quietly become a root, which every assertion over a
    // label is green against.
    const { store, child, rootA } = await plantTaxonomy();
    const patched = await patchCategory(store, child.id, { name: RENAMED });

    expect(patched.parentId).toBe(rootA.id);
    expect(patched).toStrictEqual({ ...child, name: RENAMED });
  });

  it('renames the row it named and no other', async () => {
    // The whole taxonomy read back: three rows, one label moved. A
    // patch reaching more rows than the id it was given answers the
    // same row and is invisible to every case above.
    const { store, rootA } = await plantTaxonomy();

    await patchCategory(store, rootA.id, { name: RENAMED });

    const listed = await listCategories(store, RADAR);

    expect(listed.map((one) => ({ key: one.key, name: one.name })))
      .toEqual([
        { key: 'languages', name: 'Languages' },
        { key: 'phrases', name: 'Phrases' },
        { key: 'technologies', name: RENAMED },
      ]);
  });
});

// ---------------------------------------------------------------------------
// What a delete takes
// ---------------------------------------------------------------------------

describe('what a delete takes', () => {
  it('takes the row it named and leaves its siblings', async () => {
    // What the refusal section's control does not say: that delete
    // ANSWERING is one claim and what it landed is another. Read
    // back through the list, where a delete taking the whole domain
    // and a delete taking the right row answer differently.
    const { store, rootB } = await plantTaxonomy();

    await deleteCategory(store, rootB.id);

    const listed = await listCategories(store, RADAR);

    expect(listed.map((one) => one.key))
      .toEqual(RADAR_KEYS.filter((key) => key !== rootB.key));
  });

  it('leaves the other domain where it was', async () => {
    const { store, rootB } = await plantTaxonomy();

    await deleteCategory(store, rootB.id);

    const listed = await listCategories(store, TRANSIT);

    expect(listed.map((one) => one.key)).toEqual(['modes']);
  });

  it('frees the key the row it took was carrying', async () => {
    // The natural key went with the row rather than outliving it,
    // which the remaining rows cannot say on their own: an index
    // keeping the entry answers the same list and refuses this
    // create as a duplicate.
    const { store, rootB } = await plantTaxonomy();

    await deleteCategory(store, rootB.id);

    const created = await createCategory(store, RADAR, {
      key: rootB.key,
      name: 'Phrases, again',
    });

    expect(created.key).toBe(rootB.key);

    // A new row rather than the old one back: the id is the store's
    // next, and a sequence does not roll back over a removed row.
    expect(created.id).not.toBe(rootB.id);
  });
});
